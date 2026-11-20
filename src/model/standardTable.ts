// The table of a standard curve: what the scientist pastes (any layout, see `tableRoles.ts`), the
// standards and samples read from it, and the table the panel shows again. A row is a standard
// when it has a concentration (or its type column says so), a blank when its type or name says
// so, and a sample otherwise. Rows of one standard or one sample may be one row with replicates
// side by side, or several rows (one per well): both give the same standards and samples.

import { cellNumber, guessRoles, IGNORE, readCells, type Cells, type RoleSpec } from './tableRoles'
import type { ChartGroup, ChartNode, StandardModel, StandardSettings } from './types'

export interface StandardRow {
  name: string
  conc: number
  values: number[]
}
export interface SampleRow {
  name: string
  values: number[]
  dilution?: number
}
export interface StandardTable {
  standards: StandardRow[]
  samples: SampleRow[]
  /** Rows that hold something but no signal that could be read, by their first cell or row number. */
  unread: string[]
}

/** What a column of a standard curve's table can be. */
export const STANDARD_ROLES: RoleSpec[] = [
  { id: 'name', label: 'Name', kind: 'words', heading: [/sample|name|^id$|label|description|^std$|standard name/i] },
  { id: 'type', label: 'Type', kind: 'words', heading: [/^type$|content|task|role|kind/i] },
  { id: 'conc', label: 'Concentration', kind: 'number', heading: [/conc|amount|known|dose|expected|nominal/i, /µg|ug\b|ug\/|ng\b|ng\/|pg\b|pg\/|mg\/|µm\b|nm\b|mm\b|mol\b|iu\b|u\/ml|units/i, /^x$/i] },
  { id: 'signal', label: 'Signal', kind: 'number', many: true, required: true, heading: [/^od|\bod\d*\b|abs|a\s?\d{3}\b|signal|rfu|rlu|fluor|lum|value|reading|read|^y$|replicate|rep\b|mean/i] },
  { id: 'dilution', label: 'Dilution', kind: 'number', heading: [/dil|fold|factor/i] },
  { id: 'well', label: 'Well', kind: 'well', heading: [/^well|^pos/i] },
]

export const STANDARD_MODELS: { value: StandardModel; label: string; title: string }[] = [
  { value: 'linear', label: 'Straight line', title: 'Least squares: signal = a + b × concentration. Bradford and BCA over their straight range.' },
  { value: 'quadratic', label: 'Quadratic', title: 'signal = a + b × c + d × c²: a curve that bends, often used for BCA and Bradford over a wide range.' },
  { value: '4pl', label: '4-parameter logistic', title: 'An S-shaped curve with a plateau at each end: the usual fit for ELISA.' },
  { value: '5pl', label: '5-parameter logistic', title: 'The four-parameter curve with an asymmetry: for ELISA curves that are not symmetric.' },
]

const BLANK = /^(blank|blk|buffer|zero|ntc|nsb|b0?$)/i
const STANDARD = /^(std|standard|cal|s\d+$|calibrator)/i
const SAMPLE = /^(unkn|unknown|sample|smp|u\d+$|test)/i

/** The standards and samples a table holds, read with the roles chosen for its columns. */
export function standardRows(cells: Cells, roles: string[], comma = cells.decimalComma): StandardTable {
  const at = (id: string): number => roles.indexOf(id)
  const signals = roles.map((r, i) => (r === 'signal' ? i : -1)).filter((i) => i >= 0)
  const standards = new Map<string, StandardRow>()
  const samples = new Map<string, SampleRow>()
  const unread: string[] = []
  const number = (cell: string | undefined): number | null => (cell === undefined ? null : cellNumber(cell, comma))
  cells.rows.forEach((row, r) => {
    if (row.every((c) => !c.trim())) return
    const values = signals.map((i) => number(row[i])).filter((v): v is number => v !== null)
    const text = (id: string): string => (at(id) >= 0 ? (row[at(id)] ?? '').replace(/\s+/g, ' ').trim().slice(0, 40) : '')
    const name = text('name') || text('well') || `Row ${r + 1}`
    if (!values.length) {
      unread.push(name)
      return
    }
    const type = text('type')
    let conc = at('conc') >= 0 ? number(row[at('conc')]) : null
    const blank = BLANK.test(type) || (!type && conc === null && BLANK.test(text('name')))
    if (blank) conc = 0
    const standard = conc !== null && conc >= 0 && (blank || STANDARD.test(type) || !SAMPLE.test(type))
    if (standard) {
      // One standard is one concentration: rows of it in several wells are its replicates.
      const key = String(conc)
      const known = standards.get(key)
      if (known) known.values.push(...values)
      else standards.set(key, { name, conc: conc!, values })
      return
    }
    const dilution = at('dilution') >= 0 ? number(row[at('dilution')]) : null
    const known = samples.get(name)
    if (known) {
      known.values.push(...values)
      if (dilution && dilution > 0 && !known.dilution) known.dilution = dilution
    } else samples.set(name, { name, values, ...(dilution && dilution > 0 && dilution !== 1 ? { dilution } : {}) })
  })
  return { standards: [...standards.values()], samples: [...samples.values()], unread }
}

/** Read pasted text with the roles guessed for its columns, or with the roles the scientist chose. */
export function readStandardText(text: string, chosen?: string[]): { cells: Cells; roles: string[]; why: string[]; missing: string[]; table: StandardTable } {
  const cells = readCells(text)
  const guess = guessRoles(cells, STANDARD_ROLES)
  const width = Math.max(cells.header?.length ?? 0, ...cells.rows.map((r) => r.length), 0)
  const roles = chosen && chosen.length === width ? chosen : guess.roles
  const missing = STANDARD_ROLES.filter((s) => s.required && !roles.includes(s.id)).map((s) => s.id)
  return { cells, roles, why: guess.why, missing, table: standardRows(cells, roles) }
}

/** The chart's groups for a table: the standards first, then the samples. */
export function standardGroups(table: StandardTable): { groups: ChartGroup[]; dilution?: Record<string, number> } {
  const standards: ChartGroup = { name: 'Standards', values: [], xs: [], labels: [] }
  for (const s of table.standards) {
    for (const v of s.values) {
      standards.values.push(v)
      standards.xs!.push(s.conc)
      standards.labels!.push(s.name)
    }
  }
  const groups: ChartGroup[] = [standards]
  if (table.samples.length) {
    const samples: ChartGroup = { name: 'Samples', values: [], labels: [] }
    for (const s of table.samples) {
      for (const v of s.values) {
        samples.values.push(v)
        samples.labels!.push(s.name)
      }
    }
    groups.push(samples)
  }
  const dilution = Object.fromEntries(table.samples.filter((s) => s.dilution && s.dilution !== 1).map((s) => [s.name, s.dilution!]))
  return { groups, ...(Object.keys(dilution).length ? { dilution } : {}) }
}

/** The standards and samples a chart holds, in the order of its table. */
export function standardTableOf(node: Pick<ChartNode, 'groups' | 'standard'>): StandardTable {
  const [std, smp] = node.groups
  const standards = new Map<string, StandardRow>()
  std?.values.forEach((v, k) => {
    const conc = std.xs?.[k]
    if (conc === undefined) return
    const key = String(conc)
    const known = standards.get(key)
    if (known) known.values.push(v)
    else standards.set(key, { name: std.labels?.[k] || String(conc), conc, values: [v] })
  })
  const samples = new Map<string, SampleRow>()
  smp?.values.forEach((v, k) => {
    const name = smp.labels?.[k] || `Sample ${k + 1}`
    const known = samples.get(name)
    if (known) known.values.push(v)
    else {
      const dilution = node.standard?.dilution?.[name]
      samples.set(name, { name, values: [v], ...(dilution ? { dilution } : {}) })
    }
  })
  return { standards: [...standards.values()], samples: [...samples.values()], unread: [] }
}

/** The settings of a chart with the dilutions of a newly read table: dilutions are part of the table. */
export function withDilution(settings: StandardSettings | undefined, dilution: Record<string, number> | undefined): StandardSettings | undefined {
  const { dilution: _old, ...rest } = settings ?? {}
  const next = { ...rest, ...(dilution && Object.keys(dilution).length ? { dilution } : {}) }
  return Object.keys(next).length ? next : undefined
}

const cell = (v: number): string => String(v)

/** The table of a chart, as the panel shows it: one row per standard and per sample, replicates side by side. */
export function standardTableText(node: Pick<ChartNode, 'groups' | 'standard'>): string {
  const t = standardTableOf(node)
  const reps = Math.max(1, ...t.standards.map((s) => s.values.length), ...t.samples.map((s) => s.values.length))
  const diluted = t.samples.some((s) => s.dilution)
  const head = ['Sample', 'Concentration', ...Array.from({ length: reps }, (_, i) => `Signal ${i + 1}`), ...(diluted ? ['Dilution'] : [])]
  const pad = (values: number[]): string[] => [...values.map(cell), ...Array.from({ length: reps - values.length }, () => '')]
  const lines = [
    head,
    ...t.standards.map((s) => [s.name, cell(s.conc), ...pad(s.values), ...(diluted ? [''] : [])]),
    ...t.samples.map((s) => [s.name, '', ...pad(s.values), ...(diluted ? [s.dilution ? cell(s.dilution) : ''] : [])]),
  ]
  return lines.map((l) => l.join('\t')).join('\n')
}

export { IGNORE }
