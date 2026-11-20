// The table of a qPCR analysis: what the scientist pastes (any layout, see `tableRoles.ts`), the
// wells read from it, and the table the panel shows again. Two layouts are read:
// - one row per well, as every qPCR machine exports it: a sample, a target and a Cq (Bio-Rad CFX,
//   QuantStudio, LightCycler and the like), with a column of the well's task when there is one;
// - one row per sample, with a column of Cq values for every target, named by the target ("GAPDH",
//   "IL6 2"): replicates of one target side by side.
// Controls without template (NTC, water, no RT) are left out and reported, and so are wells
// without a Cq ("Undetermined"). A control without template that has a Cq is reported loudly.

import { conditionOf } from './qpcr'
import { cellNumber, guessRoles, IGNORE, readCells, wellName, type Cells, type RoleSpec } from './tableRoles'
import type { ChartGroup, ChartNode, QpcrSettings } from './types'
import type { QpcrWell } from './qpcr'

/** What a column of a qPCR table can be. */
export const QPCR_ROLES: RoleSpec[] = [
  { id: 'sample', label: 'Sample', kind: 'words', required: true, byPlace: true, heading: [/^sample$/i, /sample/i, /\bname\b/i, /^id$/i] },
  { id: 'target', label: 'Target (gene)', kind: 'words', heading: [/target/i, /^gene/i, /\bgene\b/i, /primer|assay|detector/i] },
  { id: 'cq', label: 'Cq', kind: 'number', required: true, heading: [/^c[qtp]$/i, /\bc[qtp]\b(?!.*(mean|sd|std|dev|err))/i, /threshold cycle|crossing point/i] },
  { id: 'condition', label: 'Condition', kind: 'words', heading: [/condition|treatment|biological set|group|genotype/i] },
  { id: 'task', label: 'Task (sample or control)', kind: 'words', heading: [/^task$|^content$|^type$|sample type|role/i] },
  { id: 'well', label: 'Well', kind: 'well', heading: [/^well\b/i, /\bwell position\b/i, /^pos(ition)?$/i] },
]

/** Wells that are not samples: controls without template, no reverse transcriptase, standards of a dilution series. */
const NOT_A_SAMPLE = /^(ntc|nac|nrt|-?rt-?|no ?rt|no template( control)?|neg(ative)?( control)?|water|h2o|h₂o|blank|std|standard|empty|pos(itive)?( control)?)\b/i
const A_SAMPLE = /^(unkn|unknown|sample|smp|target|test)/i

export interface QpcrTable {
  wells: QpcrWell[]
  /** The condition of each sample, from a column of conditions; empty without one. */
  conditions: Record<string, string>
  /** Wells of samples that hold no Cq, as "target in sample". */
  noCq: string[]
  /** Controls without template and other wells that are not samples, left out. */
  controls: string[]
  /** Controls without template that amplified anyway, as "target in name (Cq)". */
  amplified: string[]
}

const tidy = (s: string | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim().slice(0, 40)
/** The target named by the heading of a column of Cq values in a table with one row per sample: "IL6 2" and "IL6 Cq" are IL6. */
const targetOfHeading = (h: string): string => tidy(h.replace(/[\s_.-]*\b(c[qtp]|cq values?)\b/gi, '').replace(/[\s_.#-]+\(?\d{1,2}\)?$|\(\d{1,2}\)$/, '')) || tidy(h)

/** The wells a table holds, read with the roles chosen for its columns. */
export function qpcrRows(cells: Cells, roles: string[], comma = cells.decimalComma): QpcrTable {
  const at = (id: string): number => roles.indexOf(id)
  const cqCols = roles.map((r, i) => (r === 'cq' ? i : -1)).filter((i) => i >= 0)
  // Without a column of targets, every column of Cq values is named by its heading.
  const wide = at('target') < 0
  const out: QpcrTable = { wells: [], conditions: {}, noCq: [], controls: [], amplified: [] }
  cells.rows.forEach((row) => {
    if (row.every((c) => !c.trim())) return
    const text = (id: string): string => (at(id) >= 0 ? tidy(row[at(id)]) : '')
    const sample = text('sample') || text('well')
    if (!sample) return
    const task = text('task')
    const control = task ? NOT_A_SAMPLE.test(task) && !A_SAMPLE.test(task) : NOT_A_SAMPLE.test(sample)
    for (const j of cqCols) {
      const target = wide ? targetOfHeading(cells.header?.[j] ?? '') || 'Target' : text('target')
      if (!target) continue
      const cq = cellNumber(row[j] ?? '', comma)
      const what = `${target} in ${sample}`
      if (control) {
        if (cq !== null && cq > 0) out.amplified.push(`${what} (Cq ${cq})`)
        else if (!out.controls.includes(sample)) out.controls.push(sample)
        continue
      }
      if (cq === null || !(cq > 0 && cq < 60)) {
        out.noCq.push(what)
        continue
      }
      const well = at('well') >= 0 ? wellName(row[at('well')] ?? '') : null
      out.wells.push({ sample, target, cq, ...(well ? { well } : {}) })
      const condition = text('condition')
      if (condition) out.conditions[sample] = condition
    }
  })
  for (const a of out.amplified) {
    const name = a.slice(a.indexOf(' in ') + 4, a.lastIndexOf(' (Cq'))
    if (!out.controls.includes(name)) out.controls.push(name)
  }
  return out
}

/** Columns of numbers in a table, by place. */
function numberColumns(cells: Cells): number[] {
  const width = Math.max(cells.header?.length ?? 0, ...cells.rows.map((r) => r.length), 0)
  const out: number[] = []
  for (let j = 0; j < width; j++) {
    const filled = cells.rows.map((r) => (r[j] ?? '').trim()).filter(Boolean)
    const numbers = filled.filter((c) => cellNumber(c, cells.decimalComma) !== null)
    if (filled.length && numbers.length >= filled.length * 0.5) out.push(j)
  }
  return out
}

export function readQpcrText(text: string, chosen?: string[]): { cells: Cells; roles: string[]; why: string[]; missing: string[]; table: QpcrTable } {
  const cells = readCells(text)
  const guess = guessRoles(cells, QPCR_ROLES)
  const width = Math.max(cells.header?.length ?? 0, ...cells.rows.map((r) => r.length), 0)
  let roles = guess.roles
  const why = [...guess.why]
  // One row per sample with a column for every target ("GAPDH", "IL6 Cq"): without a column of targets,
  // every column of numbers whose heading says Cq is one, or, when no heading says Cq, every column of
  // numbers under a heading that no other role took.
  if (!chosen && !roles.includes('target') && cells.header) {
    const h = (j: number): string => (cells.header![j] ?? '').trim()
    const numbers = numberColumns(cells).filter((j) => h(j) && (roles[j] === IGNORE || roles[j] === 'cq'))
    const saysCq = numbers.filter((j) => /\bc[qtp]\b/i.test(h(j)) && !/mean|\bsd\b|std|dev|err/i.test(h(j)))
    const cols = saysCq.length ? saysCq : numbers
    if (cols.length > 1 || (cols.length === 1 && !roles.includes('cq'))) {
      roles = roles.map((r, j) => (cols.includes(j) ? 'cq' : r))
      for (const j of cols) why[j] = `numbers under “${h(j)}”: taken as the Cq of ${targetOfHeading(h(j))}`
    }
  }
  if (chosen && chosen.length === width) roles = chosen
  const missing = QPCR_ROLES.filter((s) => s.required && !roles.includes(s.id)).map((s) => s.id)
  return { cells, roles, why, missing, table: qpcrRows(cells, roles) }
}

/** The chart's groups for a table: one group per target, in table order, with the sample (and the well, when the table names it) of every well. */
export function qpcrGroups(table: QpcrTable): ChartGroup[] {
  const groups = new Map<string, ChartGroup>()
  const placed = table.wells.some((w) => w.well)
  for (const w of table.wells) {
    let g = groups.get(w.target)
    if (!g) groups.set(w.target, (g = { name: w.target, values: [], labels: [], ...(placed ? { wells: [] } : {}) }))
    g.values.push(w.cq)
    g.labels!.push(w.sample)
    if (placed) g.wells!.push(w.well ?? '')
  }
  return [...groups.values()].map((g) => (g.wells && !g.wells.some(Boolean) ? (({ wells: _none, ...rest }) => rest)(g) : g))
}

/** The settings of a chart with the conditions of a newly read table: a column of conditions is part of the table. */
export function withConditions(settings: QpcrSettings | undefined, conditions: Record<string, string>): QpcrSettings {
  const { conditions: _old, ...rest } = settings ?? {}
  // Conditions that only repeat what the names say are not kept.
  const own = Object.entries(conditions).some(([sample, c]) => conditionOf(sample) !== c)
  return { ...rest, ...(own && Object.keys(conditions).length ? { conditions } : {}) }
}

/** The table of a chart, as the panel shows it: one row per well. */
export function qpcrTableText(node: Pick<ChartNode, 'groups' | 'qpcr'>): string {
  const conditions = node.qpcr?.conditions
  const placed = node.groups.some((g) => g.wells?.some(Boolean))
  const head = [...(placed ? ['Well'] : []), 'Sample', ...(conditions ? ['Condition'] : []), 'Target', 'Cq']
  const lines = [head]
  for (const g of node.groups) {
    g.values.forEach((v, k) => {
      const sample = g.labels?.[k] ?? ''
      lines.push([...(placed ? [g.wells?.[k] ?? ''] : []), sample, ...(conditions ? [conditions[sample] ?? ''] : []), g.name, String(v)])
    })
  }
  return lines.map((l) => l.join('\t')).join('\n')
}

export { IGNORE }
