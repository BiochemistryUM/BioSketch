// Which charts fit a pasted table: a few plain rules on what the table holds (its headings, which
// columns are words and which numbers, how many values each group has, the spread of the first
// column), each giving a chart already filled with the table and a line on why it fits. No AI and
// no request: the same table gives the same answer. Each chart is read from the text exactly as
// the panel of that kind reads a pasted table, so what is offered is what the panel would show.

import { bindingPair } from './binding'
import { readTable, type TableReport } from './chart'
import { readQpcrText, qpcrGroups, withConditions } from './qpcrTable'
import { readStandardText, standardGroups, withDilution } from './standardTable'
import { cellNumber, readCells, type Cells } from './tableRoles'
import type { ChartStart } from './chartSamples'
import type { ChartGroup } from './types'

export type SuggestionId =
  'qpcr' | 'standard' | 'survival' | 'melt' | 'binding' | 'kinetics' | 'dose' | 'volcano' | 'scatter' | 'venn' | 'heatmap' | 'dot' | 'bar' | 'box' | 'violin' | 'grouped' | 'stacked' | 'pie'

export interface ChartSuggestion {
  id: SuggestionId
  /** What the chart is called in the gallery. */
  name: string
  /** One sentence on why it fits this table. */
  why: string
  chart: ChartStart
  score: number
}

export interface TableSummary {
  rows: number
  /** Columns of numbers and columns of words. */
  numbers: number
  words: number
  /** "12 rows; a column of names and 3 columns of numbers". */
  text: string
}

const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`
const values = (groups: ChartGroup[]): number[] => groups.flatMap((g) => g.values)
const named = (groups: ChartGroup[]): string =>
  groups
    .map((g) => g.name)
    .filter(Boolean)
    .slice(0, 3)
    .join(', ') + (groups.length > 3 ? '…' : '')

/** Which columns hold numbers and which words, by the share of their filled cells that are numbers. */
function columnsOf(cells: Cells): { numbers: number[]; words: number[] } {
  const width = Math.max(cells.header?.length ?? 0, ...cells.rows.map((r) => r.length), 0)
  const numbers: number[] = []
  const words: number[] = []
  for (let j = 0; j < width; j++) {
    const filled = cells.rows.map((r) => (r[j] ?? '').trim()).filter(Boolean)
    if (!filled.length) continue
    const share = filled.filter((c) => cellNumber(c, cells.decimalComma) !== null).length / filled.length
    if (share >= 0.7) numbers.push(j)
    else if (share <= 0.2) words.push(j)
  }
  return { numbers, words }
}

/** What a table holds, in a few words, for the dialog. */
export function summarise(text: string): TableSummary {
  const cells = readCells(text)
  const { numbers, words } = columnsOf(cells)
  const parts = [words.length ? plural(words.length, 'column') + ' of words' : '', numbers.length ? plural(numbers.length, 'column') + ' of numbers' : ''].filter(Boolean)
  return {
    rows: cells.rows.length,
    numbers: numbers.length,
    words: words.length,
    text: `${plural(cells.rows.length, 'row')}${cells.header ? ' under a row of names' : ''}; ${parts.join(' and ') || 'nothing that could be read'}`,
  }
}

/** Is the report usable: some groups, and few cells left unread? */
const readable = (r: TableReport): boolean => r.groups.length > 0 && values(r.groups).length > 0

/** The charts that fit a table, the best first; at most `limit`. */
export function suggestCharts(text: string, limit = 4): ChartSuggestion[] {
  if (!text.trim()) return []
  const cells = readCells(text)
  const heads = (cells.header ?? []).map((h) => h.toLowerCase())
  const all = heads.join(' | ')
  const first = heads[0] ?? ''
  const { numbers, words } = columnsOf(cells)
  const out: ChartSuggestion[] = []
  const add = (s: ChartSuggestion) => out.push(s)

  // ---- tables an analysis reads by its own roles ----
  if (/\bc[qtp]\b|threshold cycle|crossing point/.test(all)) {
    const q = readQpcrText(text)
    const groups = qpcrGroups(q.table)
    if (!q.missing.length && groups.length >= 2 && q.table.wells.length >= 6) {
      const conditions = withConditions(undefined, q.table.conditions)
      add({
        id: 'qpcr',
        name: 'qPCR fold change',
        why: `A Cq for every well of ${plural(groups.length, 'target')}: the fold change of each by ΔΔCt against a reference gene.`,
        chart: { kind: 'qpcr', groups, error: 'sd', points: true, legend: 'top', ...(Object.keys(conditions).length ? { qpcr: conditions } : {}) },
        score: 100,
      })
    }
  }
  if (
    /standard|\bstd\b|blank|unknown|sample/.test(
      all +
        ' ' +
        cells.rows
          .map((r) => r[0] ?? '')
          .join(' ')
          .toLowerCase(),
    )
  ) {
    const s = readStandardText(text)
    if (!s.missing.length && s.table.standards.length >= 3 && s.table.samples.length >= 1) {
      const { groups, dilution } = standardGroups(s.table)
      const standard = withDilution(undefined, dilution)
      add({
        id: 'standard',
        name: 'Standard curve',
        why: `${plural(s.table.standards.length, 'standard')} of known concentration and ${plural(s.table.samples.length, 'sample')}: the samples read off the curve of the standards.`,
        chart: { kind: 'standard', groups, legend: 'top', ...(standard ? { standard } : {}) },
        score: 95,
      })
    }
  }

  // ---- a first column of numbers with values beside it (x and y) ----
  const scatter = readTable(text, 'scatter')
  const xs = [...new Set(scatter.groups.flatMap((g) => g.xs ?? []))].sort((a, b) => a - b)
  const ys = values(scatter.groups)
  const xLabel = cells.header?.[words.includes(0) ? 1 : 0] || undefined
  const legend = scatter.groups.length > 1 ? ('top' as const) : ('none' as const)
  const xy = (extra: Partial<ChartStart>): ChartStart => ({ kind: 'scatter', groups: scatter.groups, legend, ...(xLabel ? { xLabel } : {}), ...extra })
  // The first column is x when it runs in order down the table, its heading says so, or the rows have names (a volcano plot).
  const inOrder = scatter.groups.every((g) => (g.xs ?? []).every((v, k, a) => k === 0 || v >= a[k - 1]))
  const xHeading = /time|day|week|month|hour|\(h\)|\bmin\b|temp|°c|dose|conc|\[|µm|\bum\b|\bnm\b|\bmm\b|mol|log|µg|ng\/ml|free|substrate|\bx\b|distance|length|age|position/.test(first)
  const volcanoWords = /log2|fold|\bfc\b|p.?val|padj|p.?adj|fdr|q.?val/.test(all)
  const hasNames = volcanoWords && scatter.groups.some((g) => g.labels?.length)
  if (readable(scatter) && xs.length >= 3 && (inOrder || xHeading || hasNames)) {
    const series = scatter.groups.length
    const oneZero = ys.length > 0 && ys.every((v) => v === 0 || v === 1)
    const positive = xs.filter((v) => v > 0)
    const span = positive.length >= 2 ? positive[positive.length - 1] / positive[0] : 1
    const steps = xs.slice(1).map((v, k) => v - xs[k])
    const even = steps.length > 0 && Math.max(...steps) - Math.min(...steps) <= 0.05 * Math.max(...steps)
    if (oneZero && (/time|day|week|month|year|follow|surviv/.test(first) || series >= 1)) {
      add({
        id: 'survival',
        name: 'Survival curves',
        why: `Times in the first column and only 1 and 0 beside them: events and subjects that left the study, as Kaplan–Meier curves${series > 1 ? ' with the log-rank test' : ''}.`,
        chart: xy({ survival: true, ...(series > 1 ? { logRank: true } : {}), legend: series > 1 ? 'top' : 'none' }),
        score: /time|day|week|month|year|follow|surviv/.test(first) ? 95 : 60,
      })
    }
    const hot = /temp|°c|celsius|^t$|^t \(/.test(first)
    if (!oneZero && (hot || (xs.length >= 20 && even && xs[0] >= 10 && xs[xs.length - 1] <= 110))) {
      add({
        id: 'melt',
        name: 'Melting curves',
        why: `A temperature from ${xs[0]} to ${xs[xs.length - 1]} in the first column and ${plural(series, 'curve')} beside it: the Tm of each.`,
        chart: xy({ melt: {}, ...(xLabel ? {} : { xLabel: 'Temperature (°C)' }) }),
        score: hot ? 92 : 70,
      })
    }
    if (!oneZero && /free|bound|\bkd\b|bmax|\bnsb\b|non-?specific|radioligand|\bfmol|\bcpm\b|\bdpm\b|ligand/.test(all)) {
      const pair = bindingPair(scatter.groups.map((g) => g.name))
      add({
        id: 'binding',
        name: 'Saturation binding',
        why: pair ? 'Total and nonspecific binding against the ligand concentration: Kd and Bmax, fitted together.' : 'Bound against free ligand: Kd and Bmax of every series.',
        chart: xy({ binding: pair ? { model: 'total' } : {} }),
        score: 88,
      })
    }
    if (!oneZero && /substrate|\[s\]|\brate\b|velocity|\bv0?\b|\/min\b|\/s\b/.test(all)) {
      add({
        id: 'kinetics',
        name: 'Enzyme kinetics',
        why: `Rates against substrate concentration: Km and Vmax of ${series > 1 ? 'every series' : 'the enzyme'} by Michaelis–Menten.`,
        chart: xy({ kinetics: {} }),
        score: 88,
      })
    }
    const doseWords = /dose|conc|\[|µm|\bum\b|\bnm\b|\bmm\b|\bm\b|mol|log|µg|ng\/ml|drug|agonist|inhibitor/.test(first)
    const fitted = out.some((o) => o.id === 'binding' || o.id === 'kinetics' || o.id === 'melt')
    if (!oneZero && !fitted && xs.length >= 5 && (span >= 100 || (doseWords && span >= 20))) {
      add({
        id: 'dose',
        name: 'Dose-response',
        why: `Doses spanning ${span >= 1e4 ? 'several' : span >= 1000 ? 'three' : 'two'} orders of magnitude in the first column: a dose-response curve with the EC50 on a logarithmic axis.`,
        chart: xy({ xLog: true, fit: true, curve: 'dose' }),
        score: doseWords ? 85 : 72,
      })
    }
    if (hasNames) {
      add({
        id: 'volcano',
        name: 'Volcano plot',
        why: 'Fold changes and p values with a name for every row: a scatter chart with the names of the most striking points written beside them.',
        chart: xy({ pointNames: { show: 'top' } }),
        score: 80,
      })
    }
    // Only 1 and 0 are events and departures, not values to plot against the time.
    if (!oneZero)
      add({
        id: 'scatter',
        name: 'Scatter',
        why: `${plural(xs.length, 'x value')} in the first column and ${plural(series, 'series', 'series')} beside it${series === 1 ? ', with a fitted line' : ''}.`,
        chart: xy(series === 1 ? { fit: true } : {}),
        score: 50,
      })
  }

  // ---- columns of names: sets ----
  if (words.length >= 2 && numbers.length === 0) {
    const venn = readTable(text, 'venn')
    if (readable(venn)) {
      const sets = venn.groups.length
      add({
        id: 'venn',
        name: 'Venn diagram',
        why:
          sets <= 3
            ? `${plural(sets, 'column')} of names: what the ${sets === 2 ? 'two' : 'three'} lists share.`
            : `Columns of names: what the lists share (a Venn diagram takes three; the first three are drawn).`,
        chart: { kind: 'venn', groups: venn.groups },
        score: sets <= 3 ? 90 : 40,
      })
    }
  }

  // ---- a matrix: names of rows and many columns of numbers ----
  const rowNames = words.includes(0)
  if (numbers.length >= 3 && cells.rows.length >= 4 && (rowNames || (numbers.length >= 8 && cells.rows.length >= 8))) {
    const heat = readTable(text, 'heatmap')
    if (readable(heat)) {
      add({
        id: 'heatmap',
        name: 'Heat map',
        why: `${rowNames ? 'A name for every row and ' : ''}${plural(heat.groups.length, 'column')} of numbers: one coloured cell for each, rows and columns can be clustered.`,
        chart: { kind: 'heatmap', groups: heat.groups },
        score: rowNames ? 78 : 55,
      })
    }
  }

  // ---- groups of replicates, one column each ----
  const bars = readTable(text, 'bar')
  // A first column that is x (or names of rows) makes this reading a poor one.
  const xFirst = out.some((s) => s.score >= 65 && s.id !== 'scatter') || rowNames
  if (readable(bars) && !(words.length && !numbers.length)) {
    const groups = bars.groups
    const n = Math.max(...groups.map((g) => g.values.length))
    const down = xFirst ? 30 : 0
    if (bars.head === 2) {
      const series = new Set(groups.map((g) => g.name)).size
      const cats = new Set(groups.map((g) => g.category)).size
      const totals = [...new Set(groups.map((g) => g.category))].map((c) =>
        groups.filter((g) => g.category === c).reduce((a, g) => a + (g.values.length ? g.values.reduce((x, y) => x + y, 0) / g.values.length : 0), 0),
      )
      const shares = n === 1 && totals.every((t) => Math.abs(t - 100) <= 2)
      add({
        id: 'grouped',
        name: 'Grouped bars',
        why: `${plural(cats, 'category', 'categories')} with ${plural(series, 'series', 'series')} each: bars side by side, tested by two-way analysis of variance.`,
        chart: { kind: 'bar', groups, error: 'sd', points: n > 1, legend: 'top' },
        score: 72 - down,
      })
      if (n === 1)
        add({
          id: 'stacked',
          name: 'Stacked bars',
          why: shares ? 'One number per series in each category, adding up to 100: parts of a whole, stacked.' : 'One number per series in each category: parts of a whole, stacked.',
          chart: { kind: 'bar', groups, stacked: true, ...(shares ? {} : { percent: true }), legend: 'top' },
          score: (shares ? 80 : 60) - down,
        })
      else add({ id: 'dot', name: 'Dots', why: 'Every value as a dot in its category and series, with a line at the mean.', chart: { kind: 'dot', groups, legend: 'top' }, score: 62 - down })
    } else if (n === 1) {
      const positive = groups.every((g) => g.values[0] > 0)
      add({ id: 'bar', name: 'Bars', why: `One number for each of ${plural(groups.length, 'group')} (${named(groups)}).`, chart: { kind: 'bar', groups }, score: 65 - down })
      if (positive && groups.length >= 2 && groups.length <= 8)
        add({ id: 'pie', name: 'Pie', why: 'One positive number per group: their shares of the whole, if they are parts of one.', chart: { kind: 'pie', groups }, score: 52 - down })
    } else {
      const few = n < 10
      add({
        id: 'dot',
        name: 'Dots',
        why: `${plural(groups.length, 'group')} of up to ${n} values: every value as a dot with the mean, so the reader sees each one${few ? ' (with few values, better than a bar)' : ''}.`,
        chart: { kind: 'dot', groups },
        score: (few ? 74 : 66) - down,
      })
      add({
        id: 'bar',
        name: 'Bars',
        why: `${plural(groups.length, 'group')} (${named(groups)}): the mean with the SD and every value as a point.`,
        chart: { kind: 'bar', groups, error: 'sd', points: true },
        score: (few ? 68 : 58) - down,
      })
      if (!few) add({ id: 'box', name: 'Box plot', why: `Up to ${n} values per group: the median, quartiles and whiskers show their spread.`, chart: { kind: 'box', groups }, score: 70 - down })
      if (n >= 20) add({ id: 'violin', name: 'Violin', why: `Up to ${n} values per group: the shape of their spread.`, chart: { kind: 'violin', groups }, score: 60 - down })
    }
  }

  const seen = new Set<SuggestionId>()
  // Weak matches are left out, unless nothing better was found.
  return out
    .sort((a, b) => b.score - a.score)
    .filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)))
    .filter((s, k) => k === 0 || s.score >= 45)
    .slice(0, limit)
}
