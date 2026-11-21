// Charts made from numbers the scientist pastes in: reading the table, the statistics shown, and
// where every bar, box, point, error bar, tick and word is drawn. The renderer only draws what
// `chartLayout` returns, so the page and every export show the same chart.
//
// Three table shapes, all as biologists know them from statistics programs:
//  - one column per group (its name in the first row), one row per replicate;
//  - grouped: two rows of names, the category (for example the genotype) above the series (for
//    example the treatment);
//  - scatter: the first column holds x, every further column the y values of one series.

import { bandwidth, boxStats, compareEc50, correlation, density, doseResponseAt, fitDose, fitLine, type BoxStats, type Correlation, type DoseFit, type Fit, lineBand } from './chartStats'
import { tCritical } from './distributions'
import { cellColour, heatColour, heatMatrix, treeLines } from './heatmap'
import { renameVennSet, vennOf, vennParts } from './venn'
import { atRiskAt, kaplanMeier, logRank, type KaplanMeier, type Subject, hazardRatios, type HazardRatio } from './survival'
import { analyseTwoWay, suggestTwoWay, type Factors } from './twoWay'
import { EFFECT_METHODS, STARS_KEY, analyse, differenceText, effectText, holm, pText, stars, suggest, type Advice, type Outcome, type TestId } from './chartTests'
import { measureText, wrapText } from './nodes'
import { standardCurve, type StandardResult } from './standardCurve'
import { standardTableOf } from './standardTable'
import { analyseQpcr, qpcrWells, type QpcrResult } from './qpcr'
import { apparent, isFit, kinetics, type KineticsFit, type KineticsResult } from './kinetics'
import { kineticsColumns } from './kineticsTable'
import { binding, bindingColumns, bindingModel, isBindingFit, type BindingFit, type BindingResult } from './binding'
import { isMeltFit, melt, meltColumns, profile, type MeltFit, type MeltResult } from './melt'
import { PALETTES, paletteColours } from './palettes'
import type { ChartBracket, ChartGroup, ChartKind, ChartNode, ChartPointNames, ChartRefLine, ChartTest, ChartValueLabels, LegendPlace, PointShape, Rect, TextNode } from './types'

export const MAX_GROUPS = 24
/** Values kept per group. Large enough for per-cell measurements; a table beyond it is cut and the scientist is told. */
export const MAX_VALUES = 5000
/**
 * Points kept per series of a scatter chart. A volcano plot has one point per gene (about 20,000);
 * a larger series is thinned evenly over the table (`thinEvenly`), so the shape of the cloud stays.
 */
export const MAX_POINTS = 25000
/** The most values a group of this kind of chart keeps. */
export const maxValues = (kind: ChartKind): number => (kind === 'scatter' || kind === 'venn' ? MAX_POINTS : MAX_VALUES)
/** The furthest row of a table whose place is remembered (see `rows` of a group). */
export const MAX_ROWS = 20000
export const MAX_BRACKETS = 30
export const MAX_REF_LINES = 12
/** The most points of a scatter chart that are named on the chart; more would cover it in words. */
export const MAX_POINT_LABELS = 100
export const LEGEND_PLACES: LegendPlace[] = ['top', 'bottom', 'inside', 'insideLeft', 'none']
export const CHART_FONT = 13
/** Colours given to groups that have none of their own, in turn. */
export const CHART_COLOURS = PALETTES[0].colours
/** A violin drawn from fewer values than this suggests a shape the data cannot support: such a group is shown as dots. */
export const VIOLIN_MIN = 4
const INK = '#2b2f36'

// ---------- reading a pasted table ----------

/** The largest and smallest sizes of number a chart takes. Beyond them an axis cannot be drawn sensibly. */
export const MAX_MAGNITUDE = 1e100
export const MIN_MAGNITUDE = 1e-100
/** True for a number a chart can hold: finite, and neither absurdly large nor absurdly close to zero. */
export const usable = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && (v === 0 || (Math.abs(v) <= MAX_MAGNITUDE && Math.abs(v) >= MIN_MAGNITUDE))

export interface TableReport {
  groups: ChartGroup[]
  /** How many rows of names at the top were used: none, one, or two (category above series). */
  head: 0 | 1 | 2
  /** Cells below the names that hold something that could not be read as a number, with one of them as an example. */
  unread: number
  example?: string
  /** Values and groups left out because the table is larger than a chart takes. */
  droppedValues: number
  /** The values left out were spread evenly over the table (scatter charts), not cut off at its end. */
  thinned?: boolean
  droppedGroups: number
  /** Commas were read as decimal commas although every one of them could also separate thousands (1,234). */
  commasUnclear: boolean
  /** The names in the first row are all numbers: they may be values that belong to the data. */
  numericNames: boolean
}

const GAP = /[   ]/g
const THOUSANDS_BY_COMMA = /^[-+]?\d{1,3}(,\d{3})+$/
const PLAIN_NUMBER = /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i

/** Split one line that has no tab or semicolon in it: on ", " or on spaces; "5,6,7" is three numbers. */
function splitLoose(line: string): string[] {
  const text = line.trim()
  if (/,\s/.test(text)) return text.split(/\s*,\s*/)
  const parts = text.split(/\s+/)
  if (parts.length === 1 && (text.match(/,/g) ?? []).length > 1 && !THOUSANDS_BY_COMMA.test(text)) return text.split(',')
  return parts
}

/**
 * Read a table of numbers as copied from a spreadsheet (tabs), exported as CSV (commas or
 * semicolons) or typed by hand (spaces), and say what could not be read.
 *
 * Numbers: a minus sign may be the typographic one; "1 234" and "1,234,567" are thousands;
 * "1,234.5" and "1.234,5" are read by their last mark; a lone comma is a decimal comma unless
 * the table writes decimals with a point elsewhere. Anything else in a cell leaves it unread
 * (counted in `unread`): digits are never glued together across a space.
 *
 * Names: `header` says how many rows of names the table starts with. Left out, it is guessed:
 * a first row with a word in it holds names, and a second row made only of words makes the chart
 * a grouped one (category above, series below; an empty category repeats the one to its left).
 * For a scatter chart the first column is x. If the first column holds words and no numbers, it
 * holds the names of the points (genes, samples) and x is the column after it; a point whose row
 * has a name is labelled with it.
 */
export function readTable(text: string, kind: ChartKind = 'bar', header?: 0 | 1 | 2): TableReport {
  const report: TableReport = { groups: [], head: 0, unread: 0, droppedValues: 0, droppedGroups: 0, commasUnclear: false, numericNames: false }
  const lines = text
    .replace(/−/g, '-')
    .replace(/[–—](?=\s*\d)/g, '-')
    .split(/\r?\n/)
    .filter((line) => line.trim())
  if (!lines.length) return report

  const tabbed = lines.some((l) => l.includes('\t'))
  const oneNumber = (line: string): boolean => /^[-+]?\d+([.,]\d+)?(e[-+]?\d+)?$/i.test(line.trim())
  let cells: string[][]
  let commaSplits = false
  if (!tabbed && lines.length > 1 && lines.slice(1).every(oneNumber) && !(lines[0].includes(',') && lines.slice(1).some((l) => l.includes(',')))) {
    // One number on every line under the first: a single column, whatever its name contains.
    cells = lines.map((line) => [line.trim()])
  } else if (tabbed || lines.some((l) => l.includes(';'))) {
    const mark = tabbed ? '\t' : ';'
    // A row typed by hand into a pasted table has spaces where the others have tabs.
    cells = lines.map((line) => (line.includes(mark) ? line.split(mark).map((c) => c.trim()) : splitLoose(line)))
  } else {
    // Spaces or commas. "1,5 2,5" is two numbers with decimal commas; "1,5" alone on a line of a
    // table with commas elsewhere, or "A, B", is two cells.
    const tokens = lines.flatMap((l) => l.trim().split(/\s+/))
    const spaced = lines.some((l) => l.trim().split(/\s+/).length > 1)
    const decimalCommas = spaced && tokens.every((t) => !t.includes(',') || /^[-+]?\d+,\d+$/.test(t))
    commaSplits = !decimalCommas && lines.some((l) => l.includes(','))
    cells = lines.map((line) => (commaSplits ? line.split(',').map((c) => c.trim()) : line.trim().split(/\s+/)))
  }

  // Is a lone comma a decimal comma? Yes, unless the table writes decimals with a point and all its
  // commas sit where thousands separators would.
  const flat = cells.flat()
  const withComma = flat.filter((c) => c.includes(',') && !c.includes('.') && /\d/.test(c))
  const commaIsDecimal = withComma.some((c) => !THOUSANDS_BY_COMMA.test(c)) || !flat.some((c) => /\d\.\d/.test(c) && !c.includes(','))
  /** The number written in a cell, whatever its size; NaN when the cell does not hold a number. */
  const written = (cell: string): number => {
    let t = cell.trim()
    if (t === '') return NaN
    if (/^[-+]?\d{1,3}([ \u00a0\u202f]\d{3})+([.,]\d+)?$/.test(t)) t = t.replace(GAP, '')
    if (t.includes(',') && t.includes('.')) {
      // Both marks: the last one is the decimal mark, the other separates thousands.
      const decimal = t.lastIndexOf(',') > t.lastIndexOf('.') ? ',' : '.'
      t = t.split(decimal === ',' ? '.' : ',').join('').replace(',', '.')
    } else if (t.includes(',')) {
      if (/^[-+]?\d{1,3}(,\d{3}){2,}$/.test(t) || (!commaIsDecimal && THOUSANDS_BY_COMMA.test(t))) t = t.replace(/,/g, '')
      else t = t.replace(',', '.')
    }
    return PLAIN_NUMBER.test(t) ? Number(t) : NaN
  }
  report.commasUnclear = commaIsDecimal && withComma.length > 0 && withComma.every((c) => THOUSANDS_BY_COMMA.test(c) && !/^[-+]?\d{1,3}(,\d{3}){2,}$/.test(c))

  // A word is anything that is not written as a number: a number too large to draw is still not a name.
  const isWord = (c: string): boolean => c !== '' && Number.isNaN(written(c))
  const allWords = (row: string[] | undefined): boolean => !!row && row.some((c) => c !== '') && row.every((c) => c === '' || isWord(c))
  const named = cells[0].some(isWord)
  const width = Math.max(...cells.map((row) => row.length))
  const scatter = kind === 'scatter'
  // A scatter table and the lists of a Venn diagram have one row of names at most.
  const oneHead = scatter || kind === 'venn'
  const guessed = oneHead ? (named ? 1 : 0) : named ? (allWords(cells[1]) ? 2 : 1) : 0
  const head = Math.min(header ?? guessed, oneHead ? 1 : 2, cells.length) as 0 | 1 | 2
  report.head = head
  const rows = cells.slice(head)
  const nameOf = (col: number): string => (head ? (cells[head - 1][col] ?? '') : '').slice(0, 60)
  report.numericNames = head > 0 && cells[head - 1].some((c) => c !== '') && cells[head - 1].every((c) => c === '' || !isWord(c))
  const read = (cell: string | undefined): number => {
    const v = usable(written(cell ?? '')) ? written(cell ?? '') : NaN
    if (!Number.isFinite(v) && (cell ?? '').trim() !== '') {
      report.unread++
      report.example ??= (cell ?? '').trim().slice(0, 20)
    }
    return v
  }

  if (kind === 'venn') {
    // One row of numbers under the names holds sizes: of each set, and of what sets share. Anything
    // else is lists: every column holds the names of the members of one set, numbers included.
    const sizes = rows.length === 1 && rows[0].some((c) => c !== '') && rows[0].every((c) => c === '' || !isWord(c))
    for (let col = 0; col < width; col++) {
      const name = nameOf(col)
      const members = sizes ? [] : rows.map((row) => (row[col] ?? '').trim()).filter(Boolean)
      const size = sizes ? read(rows[0][col]) : NaN
      if (!members.length && !Number.isFinite(size) && !name) continue
      if (report.groups.length >= MAX_GROUPS) {
        report.droppedGroups++
        continue
      }
      report.droppedValues += Math.max(0, members.length - MAX_POINTS)
      const kept = members.slice(0, MAX_POINTS).map((m) => m.slice(0, 40))
      report.groups.push({ name: name || `Set ${report.groups.length + 1}`, values: sizes ? (Number.isFinite(size) ? [size] : []) : kept.map(() => 1), ...(kept.length ? { labels: kept } : {}) })
    }
    return report
  }

  if (scatter) {
    // A first column of words, without a single number, names the points; x is then the next column.
    const first = rows.map((row) => (row[0] ?? '').trim())
    const named = width > 2 && first.some(isWord) && first.every((c) => c === '' || isWord(c))
    const xCol = named ? 1 : 0
    const xs = rows.map((row) => read(row[xCol]))
    for (let col = xCol + 1; col < width; col++) {
      const points: [number, number, string][] = []
      rows.forEach((row, r) => {
        const y = read(row[col])
        // A point needs both of its numbers.
        if (Number.isFinite(xs[r]) && Number.isFinite(y)) points.push([xs[r], y, named ? first[r].slice(0, 40) : ''])
      })
      const name = nameOf(col)
      if (!points.length && !name) continue
      if (report.groups.length >= MAX_GROUPS) {
        report.droppedGroups++
        continue
      }
      // Tables of genes are often sorted by p value: cutting them off at the end would take away
      // the bottom of a volcano plot. Every named point is kept, the others evenly over the table.
      const kept = thinEvenly(points, MAX_POINTS, (p) => !!p[2])
      if (kept.length < points.length) {
        report.droppedValues += points.length - kept.length
        report.thinned = true
      }
      report.groups.push({ name: name || `Series ${report.groups.length + 1}`, values: kept.map((p) => p[1]), xs: kept.map((p) => p[0]), ...(kept.some((p) => p[2]) ? { labels: kept.map((p) => p[2]) } : {}) })
    }
    return report
  }

  // A heat map: a first column of words, without a single number, names the rows.
  const firstCells = rows.map((row) => (row[0] ?? '').trim())
  const rowNames = kind === 'heatmap' && width > 1 && firstCells.some(isWord) && firstCells.every((c) => c === '' || isWord(c))
  let category = ''
  for (let col = rowNames ? 1 : 0; col < width; col++) {
    if (head === 2 && cells[0][col]) category = cells[0][col].slice(0, 60)
    const read1 = rows.map((row, r) => ({ r, v: read(row[col]) })).filter((c) => Number.isFinite(c.v))
    const name = nameOf(col)
    // A column with neither a name nor a number is an empty one between two others.
    if (!read1.length && !name) continue
    if (report.groups.length >= MAX_GROUPS) {
      report.droppedGroups++
      continue
    }
    report.droppedValues += Math.max(0, read1.length - MAX_VALUES)
    const kept = read1.slice(0, MAX_VALUES)
    // A column with gaps remembers the row of each value, so that paired tests still compare row with row.
    const gaps = kept.some((c, i) => c.r !== i) && kept[kept.length - 1].r < MAX_ROWS
    report.groups.push({
      name: name || `Group ${report.groups.length + 1}`,
      values: kept.map((c) => c.v),
      ...(head === 2 && category ? { category } : {}),
      ...(gaps ? { rows: kept.map((c) => c.r) } : {}),
      ...(rowNames && kept.some((c) => firstCells[c.r]) ? { labels: kept.map((c) => firstCells[c.r].slice(0, 40)) } : {}),
    })
  }
  return report
}

/**
 * At most `limit` of the items, in their order: all those that `keep` marks (as many as fit), and
 * the rest picked at even steps through the list, so that no part of the table is lost as a whole.
 * The same list always gives the same result.
 */
export function thinEvenly<T>(items: T[], limit: number, keep: (item: T) => boolean = () => false): T[] {
  if (items.length <= limit) return items
  const marked = items.map((item, i) => (keep(item) ? i : -1)).filter((i) => i >= 0).slice(0, limit)
  const chosen = new Set(marked)
  const others = items.map((_, i) => i).filter((i) => !chosen.has(i))
  const room = limit - chosen.size
  for (let j = 0; j < room; j++) chosen.add(others[Math.floor(((j + 0.5) * others.length) / room)])
  return items.filter((_, i) => chosen.has(i))
}

/**
 * The three ways a table is read: with x in the first column (scatter), as lists of names or
 * sizes of sets (Venn), or as one column of numbers per group (every other kind). Going from one
 * to another reads the table again, see `crossTable`.
 */
export const chartFamily = (kind: ChartKind): 'scatter' | 'venn' | 'columns' => (kind === 'scatter' ? 'scatter' : kind === 'venn' ? 'venn' : 'columns')

/** The groups of a pasted table: `readTable` without its report. */
export const parseTable = (text: string, kind: ChartKind = 'bar', header?: 0 | 1 | 2): ChartGroup[] => readTable(text, kind, header).groups

/** How many rows of names `tableText` writes for these groups: two for a grouped chart, otherwise one. */
export const headRows = (groups: ChartGroup[], kind: ChartKind): 1 | 2 => (kind !== 'scatter' && kind !== 'venn' && groups.some((g) => g.category) ? 2 : 1)

/** The groups written back as a tab-separated table, for the box the scientist edits. Read it again with `headRows`. */
export function tableText(groups: ChartGroup[], kind: ChartKind = 'bar'): string {
  if (kind === 'scatter') {
    // One row per x value (and name, when points have names); series that share both share the row.
    const rows: { x: number; name: string; ys: (number | undefined)[] }[] = []
    const rowAt = new Map<string, number>()
    const named = groups.some((g) => g.labels?.some(Boolean))
    groups.forEach((g, col) => {
      const seen = new Map<string, number>()
      ;(g.xs ?? []).forEach((x, k) => {
        const name = g.labels?.[k] ?? ''
        const nth = seen.get(`${x}#${name}`) ?? 0
        seen.set(`${x}#${name}`, nth + 1)
        const key = `${x}#${name}#${nth}`
        if (!rowAt.has(key)) {
          rowAt.set(key, rows.length)
          rows.push({ x, name, ys: [] })
        }
        rows[rowAt.get(key)!].ys[col] = g.values[k]
      })
    })
    return [[...(named ? ['Name'] : []), 'x', ...groups.map((g) => g.name)].join('\t'), ...rows.map((r) => [...(named ? [r.name] : []), r.x, ...groups.map((_, col) => r.ys[col] ?? '')].join('\t'))].join('\n')
  }
  if (kind === 'venn') {
    // Lists of members side by side, or the one row of sizes.
    const names = groups.map((g) => g.name).join('\t')
    if (!groups.some((g) => g.labels?.some(Boolean))) return [names, groups.map((g) => (g.values.length ? String(g.values[0]) : '')).join('\t')].join('\n')
    const longest = Math.max(0, ...groups.map((g) => g.labels?.length ?? 0))
    return [names, ...Array.from({ length: longest }, (_, r) => groups.map((g) => g.labels?.[r] ?? '').join('\t'))].join('\n')
  }
  const count = Math.max(0, ...groups.map((g) => (g.values.length ? rowOf(g, g.values.length - 1) + 1 : 0)))
  // A heat map whose rows have names writes them in a first column.
  const rowNames: string[] = []
  if (kind === 'heatmap') for (const g of groups) g.labels?.forEach((name, k) => name && (rowNames[rowOf(g, k)] ??= name))
  const lead = (cell: string): string[] => (rowNames.length ? [cell] : [])
  const lines = headRows(groups, kind) === 2 ? [[...lead(''), ...groups.map((g) => g.category ?? '')].join('\t')] : []
  lines.push([...lead('Name'), ...groups.map((g) => g.name)].join('\t'))
  // Every value goes back to the row it was read from; `next` is the value of each group still to be written.
  const next = groups.map(() => 0)
  for (let r = 0; r < count; r++) {
    lines.push([...lead(rowNames[r] ?? ''), ...groups.map((g, col) => (next[col] < g.values.length && rowOf(g, next[col]) === r ? String(g.values[next[col]++]) : ''))].join('\t'))
  }
  return lines.join('\n')
}

/** The row of the table that value `k` of a group stands in. */
export const rowOf = (group: ChartGroup, k: number): number => group.rows?.[k] ?? k

/**
 * The same table read as the other family of chart: a scatter chart takes its first column as x,
 * every other kind takes every column as a group. Going there and back does not return the
 * same groups, so whoever calls this should keep the original to go back to.
 */
export const crossTable = (groups: ChartGroup[], from: ChartKind, to: ChartKind): ChartGroup[] =>
  // The names of points belong to a scatter chart only: any other kind would read them as an empty group.
  parseTable(tableText(from === 'scatter' ? groups.map(({ labels: _names, ...g }) => g) : groups, from), to, 1)

// ---------- keeping what belongs to a group when the table changes ----------

/**
 * Where each group of the old table is in the new one. A group is recognised by its name (and
 * category) when that is unique in both tables; failing that, by its place when the table kept its
 * number of columns (a rename); otherwise it is gone.
 */
export function followGroups(before: ChartGroup[], after: ChartGroup[]): (number | undefined)[] {
  const key = (g: ChartGroup): string => `${g.category ?? ''}\u0000${g.name}`
  const once = (groups: ChartGroup[]): Map<string, number> => {
    const seen = new Map<string, number[]>()
    groups.forEach((g, i) => seen.set(key(g), [...(seen.get(key(g)) ?? []), i]))
    return new Map([...seen].filter(([, places]) => places.length === 1).map(([k, places]) => [k, places[0]]))
  }
  const [was, now] = [once(before), once(after)]
  const taken = new Set<number>()
  const byName = before.map((g) => {
    const place = was.has(key(g)) ? now.get(key(g)) : undefined
    if (place !== undefined) taken.add(place)
    return place
  })
  return byName.map((place, i) => place ?? (before.length === after.length && !taken.has(i) ? i : undefined))
}

/**
 * The new table with the colours of the old one, and the brackets that still have both of their
 * groups, now pointing at where those groups are. `lost` counts brackets that had to go.
 */
export function carryOver(before: ChartGroup[], after: ChartGroup[], brackets: ChartNode['brackets']): { groups: ChartGroup[]; brackets: ChartNode['brackets']; lost: number } {
  const to = followGroups(before, after)
  const groups = after.map((g, i) => {
    const from = to.indexOf(i)
    return from >= 0 && before[from].color ? { ...g, color: before[from].color } : g
  })
  const kept = (brackets ?? []).flatMap((b) => {
    const [from, end] = [to[b.from], to[b.to]]
    return from === undefined || end === undefined || from === end ? [] : [{ ...b, from, to: end }]
  })
  return { groups, brackets: kept.length ? kept : undefined, lost: (brackets ?? []).length - kept.length }
}

// ---------- statistics ----------

export interface Stats {
  n: number
  mean: number
  /** Standard deviation of the sample (n − 1); 0 with fewer than two values. */
  sd: number
  /** Standard error of the mean. */
  sem: number
}

export function stats(values: number[]): Stats {
  const n = values.length
  if (!n) return { n: 0, mean: 0, sd: 0, sem: 0 }
  const mean = values.reduce((a, b) => a + b, 0) / n
  const sd = n > 1 ? Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : 0
  return { n, mean, sd, sem: sd / Math.sqrt(n) }
}

// ---------- comparing the groups with a test ----------

/** The groups of a chart as a test takes them. */
export interface Compared {
  /** Places of the compared groups in the chart's table, in order, with their names. */
  indexes: number[]
  names: string[]
  /** The values of each group. For a paired design: the rows that have a value in every group, in the same order everywhere. */
  samples: number[][]
  /** Paired design: rows left out because a value is missing in at least one group. */
  leftOut: number
  /** A chart with categories and series: its two factors, and where each combination stands among the samples. */
  factors?: Factors
  /** Why this chart has nothing a test could compare. */
  problem?: string
}

/** What a chart with two factors says when a test on ranks or a paired test is asked of it. */
export const TWO_FACTOR_ONLY = 'For a chart with categories and series (two factors) only the two-way analysis of variance is built: there is no test on ranks and no paired analysis for it.'

interface Comparison {
  compared: Compared
  advice: Advice
  outcome: Outcome | null
}

/** Comparisons already worked out, by the chart's table: a chart is laid out again on every change of size, its numbers rarely change. */
const comparisons = new WeakMap<ChartGroup[], Map<string, Comparison>>()

function compare(node: ChartNode): Comparison {
  const test: ChartTest = node.test ?? {}
  const key = [node.kind === 'scatter', !!node.yLog, test.by ?? '', !!test.paired, !!test.versusFirst, !!test.across].join('|')
  let known = comparisons.get(node.groups)
  if (!known) comparisons.set(node.groups, (known = new Map()))
  const done = known.get(key)
  if (done) return done

  const design = { paired: !!test.paired, versusFirst: !!test.versusFirst }
  const compared: Compared = { indexes: [], names: [], samples: [], leftOut: 0 }
  if (node.kind === 'scatter') compared.problem = 'Tests compare groups; a scatter chart has series of points instead.'
  else if (node.kind === 'standard') compared.problem = 'A standard curve reads samples off a curve; it compares no groups.'
  else if (node.kind === 'pie') compared.problem = 'A pie chart shows shares of a whole. To test the groups, choose another kind of chart.'
  else if (isGrouped(node)) {
    // Two factors: every column of the table is one combination of a category and a series.
    const drawn = drawnGroups(node).filter((c) => shownValues(node, c.group).length)
    compared.indexes = drawn.map((c) => c.index)
    compared.names = drawn.map((c) => `${c.group.category ?? ''} · ${c.group.name}`)
    compared.samples = drawn.map((c) => shownValues(node, c.group))
    const categories = unique(drawnGroups(node).map((c) => c.group.category ?? ''))
    const series = unique(drawnGroups(node).map((c) => c.group.name))
    compared.factors = { categories, series, place: categories.map((cat) => series.map((name) => drawn.findIndex((c) => (c.group.category ?? '') === cat && c.group.name === name))) }
  } else {
    const drawn = drawnGroups(node).filter((c) => shownValues(node, c.group).length)
    compared.indexes = drawn.map((c) => c.index)
    compared.names = drawn.map((c) => c.group.name)
    if (design.paired) {
      // Row by row: only rows with a value (one the chart shows) in every group count.
      const byRow = drawn.map((c) => new Map(c.group.values.map((v, k) => [rowOf(c.group, k), v] as const).filter(([, v]) => !node.yLog || v > 0)))
      const all = [...new Set(byRow.flatMap((m) => [...m.keys()]))].sort((a, b) => a - b)
      const complete = all.filter((r) => byRow.every((m) => m.has(r)))
      compared.samples = byRow.map((m) => complete.map((r) => m.get(r)!))
      compared.leftOut = all.length - complete.length
    } else compared.samples = drawn.map((c) => shownValues(node, c.group))
  }

  let advice: Advice
  let outcome: Outcome | null = null
  if (compared.problem) advice = { test: null, by: null, does: '', why: [compared.problem], cautions: [] }
  else if (compared.factors) {
    advice = suggestTwoWay(compared.samples, compared.factors)
    if (node.yLog) advice.cautions.push('The value axis is logarithmic, but the analysis is worked out on the values as typed, not on their logarithms.')
    if (test.by) outcome = test.by === 'ranks' || test.paired ? { ok: false, problem: TWO_FACTOR_ONLY } : analyseTwoWay(compared.samples, compared.factors, !!test.across)
  } else {
    advice = suggest(compared.names, compared.samples, design)
    if (compared.leftOut) advice.cautions.unshift(`${compared.leftOut} ${compared.leftOut === 1 ? 'row is' : 'rows are'} left out of a paired test: a value is missing in at least one group.`)
    if (node.yLog) advice.cautions.push('The value axis is logarithmic, but tests are worked out on the values as typed, not on their logarithms (for a test on ranks that makes no difference).')
    if (test.by) outcome = analyse(compared.samples, { by: test.by, ...design })
  }
  const result = { compared, advice, outcome }
  known.set(key, result)
  return result
}

/** The groups of the chart as a test compares them (see `Compared`). */
export const chartSamples = (node: ChartNode): Compared => compare(node).compared

/** Which test fits the chart's table, with what the test does and why it applies. */
export const chartAdvice = (node: ChartNode): Advice => compare(node).advice

/** The result of the test chosen for the chart; null when none is chosen. Places in `pairs` refer to `chartSamples(node).indexes`. */
export const chartAnalysis = (node: ChartNode): Outcome | null => compare(node).outcome

/** The p value the chart's test gives for two groups (places in the chart's table): undefined when that pair is not compared, null when it cannot be worked out. */
export function pairP(node: ChartNode, from: number, to: number): number | null | undefined {
  const { compared, outcome } = compare(node)
  if (!outcome?.ok) return undefined
  const [a, b] = [compared.indexes.indexOf(from), compared.indexes.indexOf(to)]
  if (a < 0 || b < 0) return undefined
  return outcome.result.pairs.find((p) => (p.a === a && p.b === b) || (p.a === b && p.b === a))?.p
}

/** What a bracket says: the words the scientist typed or, for a bracket that follows the test, its result for the two groups. */
export function bracketLabel(node: ChartNode, bracket: ChartBracket): string {
  if (!bracket.auto) return bracket.label
  const p = pairP(node, bracket.from, bracket.to)
  if (p === undefined) return ''
  if (p === null) return 'n/a'
  return node.test?.stars ? stars(p) : pText(p)
}

const listed = (items: string[]): string => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`)

/** What the chart draws for each group, as a figure legend says it. */
function shownAs(node: ChartNode): string {
  const spread = node.error === 'sd' ? ' ± standard deviation (SD)' : node.error === 'sem' ? ' ± standard error of the mean (SEM)' : ''
  const single = node.points ? '; points are single values' : ''
  switch (node.kind) {
    case 'bar':
      return isStacked(node) ? 'Stacked bars show the mean of each series.' : `Bars show the mean${spread}${single}.`
    case 'dot':
      return `Points are single values; the line marks the mean${spread}.`
    case 'line':
      return `Points show the mean${spread}.`
    case 'box':
      return `Boxes show the median and the quartiles; whiskers reach to the furthest value within 1.5 × the interquartile range, and values beyond them are drawn as rings${single}.`
    case 'violin':
      return `Violins show the distribution of the values (Gaussian kernel density, Silverman’s bandwidth) and the line marks the median${single}.`
    default:
      return ''
  }
}

/** The functions of R that give the same results, to name in the methods. */
const R_FUNCTIONS: Record<TestId, string> = {
  welch: 't.test',
  pairedT: 't.test (paired)',
  mannWhitney: 'wilcox.test',
  signedRank: 'wilcox.test (paired)',
  anova: 'aov',
  kruskal: 'kruskal.test',
  repeatedAnova: 'aov with an error term for the sample',
  friedman: 'friedman.test',
  twoWay: 'lm and anova, with Type II sums of squares',
}

/**
 * What a methods section or a figure legend can say about the chart and its test: what is drawn,
 * how many values each group has, which test compared the groups and how pairs were compared,
 * and the result of the overall test. Null when no test is chosen or it could not be worked out.
 * It states only what was done; whether a difference matters is for the scientist to write.
 */
export function methodsText(node: ChartNode): string | null {
  const { compared, outcome } = compare(node)
  if (!outcome?.ok) return null
  const r = outcome.result
  const design = { paired: !!node.test?.paired, versusFirst: !!node.test?.versusFirst }
  const k = compared.samples.length
  const sizes = compared.samples.map((s) => s.length)
  const n = sizes.every((v) => v === sizes[0])
    ? `n = ${sizes[0]} ${design.paired ? `${sizes[0] === 1 ? 'sample' : 'samples'}, each measured in every group` : compared.factors ? 'per combination of category and series' : 'per group'}`
    : k <= 6
      ? `n = ${listed(sizes.map(String))} (${listed(compared.names)})`
      : `n = ${Math.min(...sizes)} to ${Math.max(...sizes)} per group`
  // A rank test that could not use the exact distribution says so in its notes.
  const exactness = r.notes.length ? 'normal approximation with continuity correction' : 'exact p value'
  const which = design.versusFirst ? `each group against ${compared.names[0]}` : 'every pair of groups'
  const holm = 'with Holm’s correction for multiple comparisons'
  const both = `${compared.names[0]} and ${compared.names[1]} were compared with`
  const all = `The ${k} groups were compared`
  const sentence: Record<TestId, string> = {
    welch: `${both} Welch’s t test (two-sided, not assuming equal variances).`,
    pairedT: `${both} a paired t test (two-sided).`,
    mannWhitney: `${both} the Mann–Whitney test (two-sided, ${exactness}).`,
    signedRank: `${both} the Wilcoxon signed-rank test (two-sided, ${exactness}).`,
    anova: `${all} by one-way analysis of variance (ANOVA), followed by ${design.versusFirst ? `Dunnett’s test of ${which} (two-sided)` : 'Tukey’s test for every pair of groups'}.`,
    kruskal: `${all} with the Kruskal–Wallis test, followed by two-sided Mann–Whitney tests of ${which} ${holm}.`,
    repeatedAnova: `${all} by repeated-measures analysis of variance (ANOVA, sphericity assumed), followed by two-sided paired t tests of ${which} ${holm}.`,
    friedman: `${all} with the Friedman test, followed by two-sided Wilcoxon signed-rank tests of ${which} ${holm}.`,
    twoWay: compared.factors
      ? `The effects of the category (${listed(compared.factors.categories)}) and of the series (${listed(compared.factors.series)}) and their interaction were tested by two-way analysis of variance (ANOVA) with Type II sums of squares, followed by two-sided t tests of ${node.test?.across ? 'the categories within each series' : 'the series within each category'}, with the variance pooled over all combinations, ${holm}.`
      : '',
  }
  const parts = [`${shownAs(node)} ${n[0].toUpperCase()}${n.slice(1)}.`.trim(), sentence[r.test]]
  if (design.paired) parts.push(`Values in the same row of the table were treated as one sample${compared.leftOut ? `; ${compared.leftOut} ${compared.leftOut === 1 ? 'row' : 'rows'} with a missing value ${compared.leftOut === 1 ? 'was' : 'were'} left out` : ''}.`)
  if (node.yLog) parts.push('The tests were worked out on the values as measured, not on their logarithms.')
  parts.push(r.effects ? `Result: ${r.effects.map((e) => `${e.name.replace(/ \(.*$/, '').toLowerCase()}, ${e.statistic}, ${pText(e.p)}`).join('; ')}.` : `Result: ${r.statistic}, ${pText(r.p)}.`)
  if (r.effect) parts.push(`Effect size: ${effectText(r.effect)} (${EFFECT_METHODS[r.effect.name]}).`)
  const only = r.pairs[0]?.diff
  if (k === 2 && only) parts.push(`${design.paired ? `The mean change from ${compared.names[0]} to ${compared.names[1]}` : `The mean of ${compared.names[1]} less that of ${compared.names[0]}`} was ${differenceText(only).replace('95 % interval', '95 % confidence interval')}.`)
  if (k > 2 && r.intervals) parts.push(`Differences of means between groups are given with ${r.intervals}.`)
  if (node.test?.stars) parts.push(`${STARS_KEY}.`)
  parts.push(`Statistics were worked out in BioSketch, which gives the results of R 4.4 (${R_FUNCTIONS[r.test]}${k > 2 ? (r.test === 'anova' ? (design.versusFirst ? ', glht with mcp "Dunnett" of the package multcomp' : ', TukeyHSD') : ', p.adjust with method "holm"') : ''}).`)
  return parts.join(' ')
}

/**
 * The chart's brackets with one more for every pair the test finds different (p below 0.05; with
 * two groups, for the one pair whatever the test finds), each following the test. `added` counts
 * the new ones, `over` those that did not fit, and `different` says whether any pair is different.
 */
export function withTestBrackets(node: ChartNode): { brackets: ChartBracket[]; added: number; over: number; different: boolean } {
  const { compared, outcome } = compare(node)
  const brackets = node.brackets ?? []
  if (!outcome?.ok) return { brackets, added: 0, over: 0, different: false }
  const two = compared.samples.length === 2
  const pairs = outcome.result.pairs.map((p) => ({ from: compared.indexes[p.a], to: compared.indexes[p.b], p: p.p })).filter((p) => two || (p.p !== null && p.p < 0.05))
  const wanted = pairs.filter((p) => !brackets.some((b) => (b.from === p.from && b.to === p.to) || (b.from === p.to && b.to === p.from)))
  const room = Math.max(0, MAX_BRACKETS - brackets.length)
  return { brackets: [...brackets, ...wanted.slice(0, room).map((p) => ({ from: p.from, to: p.to, label: '', auto: true }))], added: Math.min(room, wanted.length), over: Math.max(0, wanted.length - room), different: pairs.length > 0 }
}

// ---------- the value axis ----------

export interface Scale {
  min: number
  max: number
  ticks: { value: number; label: string }[]
}

/**
 * An axis from about `lo` to about `hi` with round numbers on it (steps of 1, 2 or 5 times a power
 * of ten). It always returns at least two ticks, whatever it is given: an axis that cannot be
 * worked out must never stop a figure from opening.
 */
/**
 * 10 to a whole power, the same on every computer. `10 ** -5` is a hair below 0.00001 in some
 * versions of Node and browsers, which once made an axis choose a coarser step on GitHub than on
 * the Mac it was written on. Reading the number from text is rounded correctly everywhere.
 */
export function pow10(n: number): number {
  return Number.isInteger(n) ? Number(`1e${n}`) : 10 ** n
}

export function niceScale(lo: number, hi: number, target = 5): Scale {
  if (!Number.isFinite(lo)) lo = 0
  // No spread: open the axis by one unit, or by a visible share of a very large number.
  if (!Number.isFinite(hi) || !(hi > lo)) hi = lo + Math.max(1, Math.abs(lo) * 1e-6)
  const raw = (hi - lo) / target
  const power = pow10(Math.floor(Math.log10(raw)))
  // A step of 1, 2 or 5 is kept when the share lands on it give or take rounding.
  const norm = raw / power - 1e-9
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * power
  const ticks: Scale['ticks'] = []
  if (Number.isFinite(step) && step > 0) {
    const decimals = Math.min(98, Math.max(0, -Math.floor(Math.log10(step) + 1e-9)))
    const min = Math.floor(lo / step + 1e-9) * step
    const max = Math.ceil(hi / step - 1e-9) * step
    for (let i = 0; min + i * step <= max + step * 1e-6 && i < 60; i++) {
      const value = Number((min + i * step).toFixed(decimals + 2))
      ticks.push({ value, label: value.toFixed(decimals) })
    }
  }
  if (ticks.length < 2 || !ticks.every((t) => Number.isFinite(t.value))) return { min: lo, max: hi, ticks: [lo, hi].map((value) => ({ value, label: String(value) })) }
  return { min: ticks[0].value, max: ticks[ticks.length - 1].value, ticks }
}

export interface Axis {
  min: number
  max: number
  log: boolean
  ticks: { value: number; label: string }[]
  /** Where a value sits along the axis: 0 at its start, 1 at its end (outside that range beyond the axis). */
  at: (v: number) => number
  /** An end the scientist set could not be used (not above the start, or not above zero on a logarithmic axis). */
  ignored: boolean
}

/**
 * The ends of an axis the scientist set that can be used: finite numbers, above zero on a
 * logarithmic axis, and an end only when it lies above the start. The same rule decides what is
 * drawn and what is kept when a figure is saved, so a chart never changes on reopening.
 */
export function usableEnds(min: unknown, max: unknown, log: boolean): { min?: number; max?: number } {
  const good = (v: unknown): v is number => usable(v) && (!log || v > 0)
  const start = good(min) ? min : undefined
  const end = good(max) && (start === undefined || max > start) ? max : undefined
  return { ...(start !== undefined ? { min: start } : {}), ...(end !== undefined ? { max: end } : {}) }
}

/** A number as a short multiple of a power of ten: 2.5×10^{8}. */
function powerLabel(value: number, power: number, digits: number): string {
  if (value === 0) return '0'
  const lead = Number((value / pow10(power)).toFixed(digits))
  return lead === 1 ? `10^{${power}}` : lead === -1 ? `−10^{${power}}` : `${lead}×10^{${power}}`
}

/** A number on a logarithmic axis: written out between 0.001 and a million, as a power of ten beyond. */
function logLabel(value: number): string {
  if (value >= 0.001 && value < 1e6) return String(Number(value.toPrecision(12)))
  const power = Math.floor(Math.log10(value) + 1e-9)
  return powerLabel(value, power, 2)
}

/** The most decades a logarithmic axis writes a number for; with more, only every second, third, ... is marked. */
const MAX_DECADES = 8

/**
 * The axis for values from `lo` to `hi`. `min` and `max` are ends the scientist set: they are used
 * exactly as typed (when they make an axis, see `usableEnds`), and the round numbers in between
 * become the ticks. Very large and very small numbers are written as powers of ten. A logarithmic
 * axis runs between powers of ten (or the ends that were set) and can only show values above
 * zero; with two decades or fewer to show it also marks the 2s and 5s.
 */
export function axisFor(lo: number, hi: number, opts: { min?: number; max?: number; log?: boolean } = {}): Axis {
  const set = usableEnds(opts.min, opts.max, !!opts.log)
  if (opts.log) {
    const decade = (v: number, round: (x: number) => number, nudge: number): number => {
      const d = pow10(round(Math.log10(v) + nudge))
      return Number.isFinite(d) && d > 0 ? d : v
    }
    const from = lo > 0 && Number.isFinite(lo) ? lo : 1
    const min = set.min ?? decade(from, Math.floor, 1e-9)
    let max = set.max !== undefined && set.max > min ? set.max : hi > min && Number.isFinite(hi) ? decade(hi, Math.ceil, -1e-9) : min * 10
    if (!(max > min)) max = min * 10
    const [a, b] = [Math.log10(min), Math.log10(max)]
    const decades = Math.ceil(b - 1e-9) - Math.floor(a + 1e-9)
    const stride = Math.max(1, Math.ceil(decades / MAX_DECADES))
    const ticks: Axis['ticks'] = []
    for (let k = Math.floor(a + 1e-9); k <= Math.ceil(b - 1e-9); k++) {
      if (stride > 1 && ((k % stride) + stride) % stride !== 0) continue
      for (const lead of decades <= 2 ? [1, 2, 5] : [1]) {
        const value = Number((lead * 10 ** k).toPrecision(12))
        if (value >= min * (1 - 1e-9) && value <= max * (1 + 1e-9)) ticks.push({ value, label: logLabel(value) })
      }
    }
    // An axis needs two numbers to be read: with fewer round ones in range, its ends are marked too.
    if (ticks.length < 2) {
      for (const end of [min, max]) if (!ticks.some((t) => Math.abs(Math.log10(t.value) - Math.log10(end)) < (b - a) * 0.08)) ticks.push({ value: end, label: logLabel(Number(end.toPrecision(3))) })
      ticks.sort((p, q) => p.value - q.value)
    }
    const ignored = (opts.min !== undefined && set.min === undefined) || (opts.max !== undefined && !(set.max !== undefined && set.max > min))
    return { min, max, log: true, ticks, at: (v) => (Math.log10(v) - a) / (b - a), ignored }
  }
  // A start that was set replaces the smallest value; an end at or below the start is not an end.
  const start = set.min ?? lo
  const end = set.max !== undefined && set.max > start ? set.max : undefined
  const round = niceScale(start, end ?? hi)
  const min = set.min ?? round.min
  const max = end ?? round.max
  const slack = (max - min) * 1e-9
  let ticks = round.ticks.filter((t) => t.value >= min - slack && t.value <= max + slack)
  if (ticks.length < 2) ticks = [min, max].map((value) => ({ value, label: String(Number(value.toPrecision(6))) }))
  // Numbers too long to read along an axis are written as multiples of one power of ten.
  const size = Math.max(Math.abs(min), Math.abs(max))
  if (size >= 1e6 || (size > 0 && size < 1e-3)) {
    const power = Math.floor(Math.log10(size) + 1e-9)
    const gap = ticks.length > 1 ? Math.abs(ticks[1].value - ticks[0].value) / pow10(power) : 1
    const digits = Math.min(6, Math.max(0, -Math.floor(Math.log10(gap) + 1e-9)))
    ticks = ticks.map((t) => ({ value: t.value, label: powerLabel(t.value, power, digits) }))
  }
  return { min, max, log: false, ticks, at: (v) => (v - min) / (max - min), ignored: (opts.min !== undefined && set.min === undefined) || (opts.max !== undefined && end === undefined) }
}

// ---------- where everything is drawn ----------

/**
 * What a mark of a chart belongs to, so that a press on it can lead to the settings of that part.
 * `at` says which one: the place of the group in the table, of the series in the legend, or of
 * the bracket or line in its list.
 */
export interface ChartPart {
  what: 'group' | 'category' | 'cells' | 'error' | 'fit' | 'bracket' | 'refLine' | 'yAxis' | 'xAxis' | 'title' | 'yTitle' | 'xTitle' | 'legend' | 'number' | 'pointName' | 'result' | 'scale' | 'facet' | 'atRisk'
  at?: number
}

/** A mark can be given its part where it is added to a drawing; the part is then kept beside the drawing, see `partOf`. */
interface Tagged {
  part?: ChartPart
}

export interface ChartDrawing {
  /** Marks that show data. They are cut off at the edge of the plot when an axis range leaves some outside. `edge` is the colour of the outline when it is not the usual dark one (the cells of a heat map). */
  rects: ({ x: number; y: number; w: number; h: number; fill: string; edge?: string } & Tagged)[]
  lines: ({ x1: number; y1: number; x2: number; y2: number; width: number } & Tagged)[]
  /** Outlines and joining lines: a violin (filled), the line of a line chart, a fitted line. */
  /** `opacity` makes the fill see-through (a confidence band). */
  paths: ({ d: string; stroke: string; width: number; fill?: string; opacity?: number } & Tagged)[]
  /**
   * Points. A `ring` is drawn hollow (an outlier of a box plot). `shape` is the mark (absent = a
   * circle; `r` is then the radius of the circle with the same area, see `pointPath`), `opacity`
   * how solid it is (absent = fully).
   */
  circles: ({ cx: number; cy: number; r: number; fill: string; ring?: boolean; shape?: PointShape; opacity?: number } & Tagged)[]
  /** Dashed lines at chosen values (thresholds), cut off at the edge of the plot like the data. */
  dashes: ({ x1: number; y1: number; x2: number; y2: number; style?: 'dotted' | 'solid' } & Tagged)[]
  /** Axes, tick marks and brackets: never cut off. */
  rules: ({ x1: number; y1: number; x2: number; y2: number; width: number } & Tagged)[]
  /** Colour squares of the legend. With a `shape` the entry stands for points and shows their mark instead. */
  swatches: ({ x: number; y: number; size: number; fill: string; shape?: PointShape } & Tagged)[]
  /** Words, as labels the label renderer draws (so superscripts and other marks work in them). */
  texts: (TextNode & Tagged)[]
  /** The plot area, in the chart's own box. */
  clip: { x: number; y: number; w: number; h: number }
  /** The scientist set the end of an axis, so data marks may lie outside the plot and must be cut off at its edge. */
  clipped: boolean
  /** Things the scientist should know about how the numbers are shown, in plain words. */
  notes: string[]
  /** A chart drawn as small panels: each is a drawing of its own, placed at x, y in the chart's box. */
  panels?: ChartPanel[]
}

export interface ChartPanel {
  x: number
  y: number
  w: number
  h: number
  drawing: ChartDrawing
}

const r1 = (v: number): number => Math.round(v * 10) / 10
const unique = <T>(items: T[]): T[] => [...new Set(items)]

/** The colour of group `i`: its own, or the next of the standard ones. */
export const groupColour = (group: ChartGroup, i: number, palette?: string): string => group.color ?? paletteColours(palette)[i % paletteColours(palette).length]

export const POINT_SHAPES: PointShape[] = ['circle', 'square', 'triangle', 'diamond']
export const POINT_SIZE_MIN = 0.25
export const POINT_SIZE_MAX = 4
export const POINT_OPACITY_MIN = 0.1

/**
 * The size and solidity of a chart's points as they are drawn and saved: within their limits, and
 * absent when they are the usual ones.
 */
export function pointStyle(size: unknown, opacity: unknown): { pointSize?: number; pointOpacity?: number } {
  const s = typeof size === 'number' && Number.isFinite(size) ? Math.min(POINT_SIZE_MAX, Math.max(POINT_SIZE_MIN, size)) : 1
  const o = typeof opacity === 'number' && Number.isFinite(opacity) ? Math.min(1, Math.max(POINT_OPACITY_MIN, opacity)) : 1
  return { ...(s !== 1 ? { pointSize: s } : {}), ...(o !== 1 ? { pointOpacity: o } : {}) }
}

/** A group's own size and solidity of points as they are saved: within their limits, kept even when they are the usual ones (they then overrule the chart's). */
export function ownPointStyle(size: unknown, opacity: unknown): { pointSize?: number; pointOpacity?: number } {
  return {
    ...(typeof size === 'number' && Number.isFinite(size) ? { pointSize: Math.min(POINT_SIZE_MAX, Math.max(POINT_SIZE_MIN, size)) } : {}),
    ...(typeof opacity === 'number' && Number.isFinite(opacity) ? { pointOpacity: Math.min(1, Math.max(POINT_OPACITY_MIN, opacity)) } : {}),
  }
}

/** How the points of one group are drawn: its own size and solidity where it has them, otherwise the chart's. */
function pointsOf(node: ChartNode, own: { pointSize?: number; pointOpacity?: number }): { scale: number; solid: { opacity?: number } } {
  const s = pointStyle(own.pointSize ?? node.pointSize, own.pointOpacity ?? node.pointOpacity)
  return { scale: s.pointSize ?? 1, solid: s.pointOpacity !== undefined ? { opacity: s.pointOpacity } : {} }
}

/**
 * The outline of a point that is not a circle, centred on (cx, cy). Every shape covers the same
 * area as a circle of radius `r`, so no group looks heavier than another. The triangle points up.
 */
export function pointPath(shape: PointShape, cx: number, cy: number, r: number): string {
  const at = (dx: number, dy: number): string => `${r1(cx + dx)} ${r1(cy + dy)}`
  if (shape === 'square') {
    const half = (r * Math.sqrt(Math.PI)) / 2
    return `M${at(-half, -half)}L${at(half, -half)}L${at(half, half)}L${at(-half, half)}Z`
  }
  if (shape === 'diamond') {
    const half = r * Math.sqrt(Math.PI / 2)
    return `M${at(0, -half)}L${at(half, 0)}L${at(0, half)}L${at(-half, 0)}Z`
  }
  if (shape === 'triangle') {
    const side = r * Math.sqrt((4 * Math.PI) / Math.sqrt(3))
    const height = (side * Math.sqrt(3)) / 2
    return `M${at(0, (-2 * height) / 3)}L${at(side / 2, height / 3)}L${at(-side / 2, height / 3)}Z`
  }
  // A circle, should anything ask for its outline.
  return `M${at(-r, 0)}A${r1(r)} ${r1(r)} 0 1 0 ${at(r, 0)}A${r1(r)} ${r1(r)} 0 1 0 ${at(-r, 0)}Z`
}

// ---------- a number written at every group ----------

export const VALUE_LABEL_KINDS: ChartValueLabels['show'][] = ['mean', 'median', 'n']
export const VALUE_DECIMALS_MAX = 6

/** The number a chart of this kind writes when the scientist does not say which: the one it draws. */
export const usualValueLabel = (kind: ChartKind): ChartValueLabels['show'] => (kind === 'box' || kind === 'violin' ? 'median' : 'mean')

/**
 * The numbers written at the groups as they are drawn and saved: one of the three kinds, a whole
 * number of decimals within its limits, a colour written as #rrggbb. Anything else is left out.
 */
export function usableValueLabels(raw: unknown): ChartValueLabels | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  const show = VALUE_LABEL_KINDS.find((s) => s === o.show)
  if (!show) return undefined
  const decimals = typeof o.decimals === 'number' && Number.isInteger(o.decimals) && o.decimals >= 0 && o.decimals <= VALUE_DECIMALS_MAX ? o.decimals : undefined
  const colour = typeof o.color === 'string' && /^#[0-9a-f]{6}$/i.test(o.color) ? o.color.toLowerCase() : undefined
  return { show, ...(o.above === true ? { above: true } : {}), ...(decimals !== undefined ? { decimals } : {}), ...(colour ? { color: colour } : {}) }
}

// ---------- names of points (scatter charts) ----------

/** How many points "top" names when no number is given. */
export const POINT_NAMES_TOP = 10
const RANKINGS: NonNullable<ChartPointNames['by']>[] = ['distance', 'y', 'x']
const SIDES: NonNullable<ChartPointNames['side']>[] = ['up', 'down', 'each']
const shortList = (raw: unknown, most: number, length: number): string[] | undefined =>
  Array.isArray(raw)
    ? [...new Set(raw.filter((v): v is string => typeof v === 'string').map((v) => v.trim().slice(0, length)).filter(Boolean))].slice(0, most)
    : undefined

/**
 * The setting for names of points as it can be kept: anything else in it is dropped. The usual
 * setting (every named point, from every series, nothing more) is no setting at all, so figures
 * made before it existed stay as they are.
 */
export function usablePointNames(raw: unknown): ChartPointNames | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  const show = (['table', 'top', 'none'] as const).find((s) => s === o.show)
  if (!show) return undefined
  const top = typeof o.top === 'number' && Number.isInteger(o.top) && o.top >= 1 && o.top <= MAX_POINT_LABELS ? o.top : undefined
  const by = RANKINGS.find((b) => b === o.by && b !== 'distance')
  const side = SIDES.find((s) => s === o.side)
  const series = shortList(o.series, MAX_GROUPS, 60)
  const always = shortList(o.always, MAX_POINT_LABELS, 40)
  const kept: ChartPointNames = {
    show,
    ...(top !== undefined && top !== POINT_NAMES_TOP ? { top } : {}),
    ...(by ? { by } : {}),
    ...(side ? { side } : {}),
    ...(series ? { series } : {}),
    ...(always?.length ? { always } : {}),
  }
  return Object.keys(kept).length === 1 && show === 'table' ? undefined : kept
}

/** Every name of a point in the chart's table, once each, in the order of the table. */
export const pointNamesIn = (groups: ChartGroup[]): string[] => [...new Set(groups.flatMap((g) => g.labels ?? []).filter(Boolean))]

/**
 * A list of names as the scientist typed or pasted it: separated by commas, semicolons, tabs or
 * new lines (a column copied from a spreadsheet). A piece with spaces is split at them too, unless
 * it is itself the name of a point ("Sample 1").
 */
export function splitNameList(text: string, known: string[]): string[] {
  const names = new Set(known.map((n) => n.toLowerCase()))
  return [...new Set(text.split(/[,;\t\n\r]+/).flatMap((piece) => {
    const t = piece.trim()
    return !t ? [] : names.has(t.toLowerCase()) || !/\s/.test(t) ? [t] : t.split(/\s+/)
  }))]
}

/** A point of a scatter chart that has a name, where it is drawn, and the series it belongs to. */
export interface NamedPoint {
  name: string
  series: string
  cx: number
  cy: number
}

/**
 * The named points whose names are written, in the order they are placed (the first gets the best
 * place). `zeroX` is where x = 0 is drawn (x = 1 on a logarithmic axis), `bottom` the bottom of the
 * plot, `plot` its size, for ranking:
 *
 * - 'distance': how far a point is from x = 0 on the bottom line, with the width and the height of
 *   the plot counting alike. In a volcano plot that is a large change and a small p together.
 * - 'y': the highest points first (the smallest p in a volcano plot).
 * - 'x': the points furthest from x = 0 first, on either side (the largest change).
 *
 * Equal points keep the order of the table. Names listed in `always` come first whatever their
 * rank or series; then 'table' takes the named points in the order of the table, 'top' the best
 * ranked. At most `MAX_POINT_LABELS` names in all.
 */
export function pickNames(points: NamedPoint[], setting: ChartPointNames | undefined, zeroX: number, bottom: number, plot: { w: number; h: number }): NamedPoint[] {
  const s = setting ?? { show: 'table' as const }
  if (s.show === 'none') return []
  const wanted = new Set((s.always ?? []).map((n) => n.toLowerCase()))
  const always = points.filter((p) => wanted.has(p.name.toLowerCase()))
  const allowed = new Set(s.series ?? [])
  const pool = points.filter((p) => !wanted.has(p.name.toLowerCase()) && (!s.series || allowed.has(p.series)) && (s.side === 'up' ? p.cx > zeroX : s.side === 'down' ? p.cx < zeroX : true))
  let chosen: NamedPoint[]
  if (s.show === 'table') chosen = pool
  else {
    const score = (p: NamedPoint): number => {
      const dx = (p.cx - zeroX) / Math.max(plot.w, 1)
      const dy = (bottom - p.cy) / Math.max(plot.h, 1)
      return s.by === 'y' ? dy : s.by === 'x' ? Math.abs(dx) : Math.hypot(dx, dy)
    }
    const ranked = pool.map((p, i) => ({ p, i, v: score(p) })).sort((a, b) => b.v - a.v || a.i - b.i)
    const n = s.top ?? POINT_NAMES_TOP
    chosen =
      s.side === 'each'
        ? [...ranked.filter((r) => r.p.cx > zeroX).slice(0, n), ...ranked.filter((r) => r.p.cx < zeroX).slice(0, n)].sort((a, b) => b.v - a.v || a.i - b.i).map((r) => r.p)
        : ranked.slice(0, n).map((r) => r.p)
  }
  return [...always, ...chosen].slice(0, MAX_POINT_LABELS)
}

/**
 * A number as it is written at a group. Without a number of decimals it has three significant
 * figures, and no fewer than its whole part (1234.5 is 1235, never 1230). Very large and very
 * small numbers are written with a power of ten.
 */
export function valueText(v: number, decimals?: number): string {
  let text = decimals !== undefined ? v.toFixed(decimals) : Math.abs(v) >= 1000 ? String(Math.round(v)) : String(Number(v.toPrecision(3)))
  // Rounding must not leave "-0" or "-0.00".
  if (Number(text) === 0) text = text.replace('-', '')
  const power = /^(-?[\d.]+)e([-+]\d+)$/.exec(text)
  return power ? `${power[1]}×10^{${Number(power[2])}}` : text
}

/** What is written at a group, as a label (the *n* is in italics, as in print). */
export function valueLabelText(labels: ChartValueLabels, s: Stats, box: BoxStats | null): string | null {
  if (!s.n) return null
  if (labels.show === 'n') return `*n* = ${s.n}`
  const v = labels.show === 'median' ? box?.median : s.mean
  return v === undefined || !Number.isFinite(v) ? null : valueText(v, labels.decimals)
}

/** White or dark lettering, whichever reads better on this colour. */
export function readableOn(colour: string): string {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(colour)
  if (!m) return INK
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16))
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.55 ? '#ffffff' : INK
}

/** How far the error bar reaches above and below the mean. */
function errorOf(node: ChartNode, s: Stats): number {
  return node.error === 'sd' ? s.sd : node.error === 'sem' ? s.sem : 0
}

/** The groups that have numbers, each with its place in the chart's table. */
const drawnGroups = (node: ChartNode): { group: ChartGroup; index: number }[] => node.groups.map((group, index) => ({ group, index })).filter((c) => c.group.values.length)

/** True when the chart has categories: several series side by side in each. */
export const isGrouped = (node: ChartNode): boolean => node.kind !== 'scatter' && node.kind !== 'venn' && drawnGroups(node).some((c) => c.group.category)

/**
 * What the colours of a chart stand for, in order: the series of a grouped or scatter chart (one
 * colour each, shared across categories), otherwise every group. `groups` lists the places in the
 * chart's table that take the colour.
 */
export function chartSeries(node: ChartNode): { name: string; colour: string; shape?: PointShape; pointSize?: number; pointOpacity?: number; groups: number[] }[] {
  const drawn = drawnGroups(node)
  if (!isGrouped(node)) return drawn.map((c, i) => ({ name: c.group.name, colour: groupColour(c.group, i, node.palette), ...markOf(c.group.shape), ...ownPointStyle(c.group.pointSize, c.group.pointOpacity), groups: [c.index] }))
  // A series is a name. The same name twice within one category is two series, or the second
  // would be drawn on top of the first.
  const seriesOf = new Map<number, string>()
  const used = new Map<string, number>()
  for (const c of drawn) {
    const slot = `${c.group.category ?? ''}\u0000${c.group.name}`
    const nth = used.get(slot) ?? 0
    used.set(slot, nth + 1)
    seriesOf.set(c.index, nth ? `${c.group.name} (${nth + 1})` : c.group.name)
  }
  return unique(drawn.map((c) => seriesOf.get(c.index)!)).map((name, i) => {
    const members = drawn.filter((c) => seriesOf.get(c.index) === name)
    const colours = paletteColours(node.palette)
    return {
      name,
      colour: members.find((c) => c.group.color)?.group.color ?? colours[i % colours.length],
      ...markOf(members.find((c) => c.group.shape)?.group.shape),
      ...ownPointStyle(members.find((c) => c.group.pointSize !== undefined)?.group.pointSize, members.find((c) => c.group.pointOpacity !== undefined)?.group.pointOpacity),
      groups: members.map((c) => c.index),
    }
  })
}

// ---------- names typed over in the panel ----------

/** The longest name of a group, a series or a category: what a cell of the table is cut to when it is read. */
export const NAME_MAX = 60

/**
 * A name as it can stand in a cell of the table: one line without tabs, at most `NAME_MAX`
 * characters, with the minus signs and dashes written the way `readTable` reads them. So the name
 * is the one the table gives back, and it does not change by itself when a number is edited later.
 */
export const tidyName = (typed: string): string =>
  typed
    .replace(/−/g, '-')
    .replace(/[–—](?=\s*\d)/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX)

/** The categories of a grouped chart in the order they are drawn; a group without one is under ''. */
export const chartCategories = (node: ChartNode): string[] => (isGrouped(node) ? unique(drawnGroups(node).map((c) => c.group.category ?? '')) : [])

/** What a typed name leads to: a change to the chart, words about why it cannot be taken, or neither when there is nothing to do. */
export interface Renamed {
  change?: Partial<ChartNode>
  problem?: string
}

/**
 * One series of the chart under another name: `series` is its place in `chartSeries` (in a chart
 * without categories, that is one group). The name changes in the table, and with it in the legend,
 * along the axis and in the list of series whose points are named. Nothing happens for an empty
 * name or the name it has. In a grouped chart a name another series has is refused: a series is
 * its name there, so the two would become one.
 */
export function renameSeries(node: ChartNode, series: number, typed: string): Renamed {
  const all = chartSeries(node)
  const entry = all[series]
  const name = tidyName(typed)
  if (!entry || !name || name === entry.name) return {}
  if (isGrouped(node) && all.some((other, i) => i !== series && other.name === name)) return { problem: `Another series is called “${name}”. Two series with one name would be drawn as one.` }
  const before = unique(entry.groups.map((k) => node.groups[k].name))
  const groups = node.groups.map((g, k) => (entry.groups.includes(k) ? { ...g, name } : g))
  // Points are named for the series listed by name: the list follows the series.
  const listed = node.pointNames?.series
  const stillThere = new Set(groups.map((g) => g.name))
  const follows = listed?.some((n) => before.includes(n)) ? unique(listed.flatMap((n) => (before.includes(n) ? (stillThere.has(n) ? [n, name] : [name]) : [n]))) : undefined
  return { change: { groups, ...(follows && node.pointNames ? { pointNames: { ...node.pointNames, series: follows } } : {}) } }
}

/**
 * One set of a Venn diagram under another name: `set` is its place among the sets drawn. Two sets
 * cannot share a name (the table of sizes tells them apart by it), and in a table of sizes a name
 * cannot hold "&", which joins the names of sets that share members.
 */
export function renameVenn(node: ChartNode, set: number, typed: string): Renamed {
  const data = vennOf(node.groups)
  const name = tidyName(typed)
  const old = data.sets[set]
  if (!old || !name || name === old.name) return {}
  if (data.sets.some((other, i) => i !== set && other.name.toLowerCase() === name.toLowerCase())) return { problem: `Another set is called “${name}”.` }
  if (!data.lists && vennParts(name).length !== 1) return { problem: 'In a table of sizes “&” joins the names of sets that share members, so a name cannot hold it.' }
  return { change: { groups: renameVennSet(node.groups, set, name) } }
}

/**
 * One category of a grouped chart under another name: `category` is its place in `chartCategories`.
 * Nothing happens for an empty name or the name it has, and a name another category has is
 * refused, because the two would become one category.
 */
export function renameCategory(node: ChartNode, category: number, typed: string): Renamed {
  const all = chartCategories(node)
  const name = tidyName(typed)
  if (category < 0 || category >= all.length || !name || name === all[category]) return {}
  if (all.includes(name)) return { problem: `Another category is called “${name}”. The two would become one.` }
  return { change: { groups: node.groups.map((g) => ((g.category ?? '') === all[category] ? { ...g, category: name } : g)) } }
}

/** A shape as it is kept on a mark: nothing for a circle, the usual one. */
const markOf = (shape: PointShape | undefined): { shape?: PointShape } => (shape && shape !== 'circle' ? { shape } : {})

/** True when the chart draws a point for single values or means, so that the shape and size of points matter. */
export const hasPoints = (node: ChartNode): boolean => node.kind !== 'pie' && node.kind !== 'heatmap' && node.kind !== 'venn' && (node.kind === 'scatter' || node.kind === 'dot' || node.kind === 'line' || !!node.points)

/** The values of a group that the chart can show and that its statistics are worked out from: on a logarithmic axis, those above zero. */
export const shownValues = (node: ChartNode, group: ChartGroup): number[] => (node.yLog && node.kind !== 'scatter' ? group.values.filter((v) => v > 0) : group.values)

/** Notes every kind of chart can need: the table was larger than a chart takes, or an axis end could not be used. */
function sharedNotes(node: ChartNode, axes: { axis: Axis; name: string }[]): string[] {
  const notes: string[] = []
  if (node.kind === 'scatter') {
    if (node.groups.some((g) => g.values.length >= MAX_POINTS)) notes.push(`A scatter chart takes at most ${MAX_POINTS} points per series: a larger series was thinned evenly over the table, keeping every named point, and its fitted line describes only the points kept.`)
  } else if (node.groups.some((g) => g.values.length >= MAX_VALUES)) notes.push(`A chart takes at most ${MAX_VALUES} values per group: a larger group is cut off there, and what is drawn describes only those values.`)
  if (node.groups.length >= MAX_GROUPS) notes.push(`A chart takes at most ${MAX_GROUPS} groups: any further columns were left out.`)
  for (const { axis, name } of axes) {
    if (axis.ignored) notes.push(`An end set for the ${name} cannot be used, so it is ignored: the end must be above the start${axis.log ? ', and both above zero on a logarithmic axis' : ''}.`)
  }
  return notes
}

// The part of every mark, kept beside the marks so that what is drawn (and compared in tests,
// and written to files) is the marks alone.
const PARTS = new WeakMap<object, ChartPart>()
/** The ranges of the axes a drawing was laid out with, so that small panels can be given one range. */
const AXES = new WeakMap<ChartDrawing, { x?: [number, number]; y?: [number, number] }>()
const CURRENT = new WeakMap<ChartDrawing, { part: ChartPart | null }>()
const MARK_LISTS = ['rects', 'lines', 'paths', 'circles', 'dashes', 'rules', 'swatches', 'texts'] as const

/** The part of a chart a mark of its drawing belongs to, if any. */
export const partOf = (mark: object): ChartPart | undefined => PARTS.get(mark)

/**
 * An empty drawing. Every mark added to one of its lists is noted with the part it belongs to:
 * the one it carries (`part`, taken off the mark), or the one said last with `nowPart`.
 */
const empty = (): ChartDrawing => {
  const out: ChartDrawing = { rects: [], lines: [], paths: [], circles: [], dashes: [], rules: [], swatches: [], texts: [], clip: { x: 0, y: 0, w: 0, h: 0 }, clipped: false, notes: [] }
  const current = { part: null as ChartPart | null }
  CURRENT.set(out, current)
  for (const key of MARK_LISTS) {
    const list = out[key] as Tagged[]
    Object.defineProperty(list, 'push', {
      value: (...items: Tagged[]): number => {
        for (const item of items) {
          const part = item.part ?? current.part
          if (item.part) delete item.part
          if (part) PARTS.set(item, part)
        }
        return Array.prototype.push.apply(list, items)
      },
    })
  }
  return out
}

/** Say which part the marks added to a drawing from now on belong to; null for none. */
const nowPart = (out: ChartDrawing, part: ChartPart | null): void => {
  const current = CURRENT.get(out)
  if (current) current.part = part
}

/** The reference lines of a chart that can be drawn: finite values, above zero on a logarithmic axis, along x only in a scatter chart. The same rule decides what is saved. */
export function usableRefLines(lines: unknown, kind: ChartKind, xLog: boolean, yLog: boolean): ChartRefLine[] {
  const out: ChartRefLine[] = []
  for (const raw of Array.isArray(lines) ? lines.slice(0, MAX_REF_LINES) : []) {
    if (!raw || typeof raw !== 'object') continue
    const l = raw as Record<string, unknown>
    const axis = l.axis === 'x' && kind === 'scatter' ? 'x' : l.axis === 'y' ? 'y' : null
    if (!axis || !usable(l.value) || ((axis === 'x' ? xLog : yLog) && l.value <= 0)) continue
    out.push({ axis, value: l.value, ...(typeof l.label === 'string' && l.label.trim() ? { label: l.label.slice(0, 40) } : {}), ...(l.dash === 'dotted' || l.dash === 'solid' ? { dash: l.dash } : {}) })
  }
  return out
}

/**
 * Shared by every kind of chart: lettering, margins, the value axis on the left and the legend
 * (at the right unless the scientist put it elsewhere). `right` is the room kept free at the right
 * edge; `rows` says how many lines the names along the bottom take, given the width of the plot.
 */
function frame(node: ChartNode, out: ChartDrawing, yAxis: Axis, legend: { name: string; colour: string; shape?: PointShape }[], right: number, rows: (pw: number, fs: number) => number, minLeft = 0) {
  const fs = node.fontSize ?? CHART_FONT
  const words = (text: string, x: number, top: number, extra: Partial<TextNode> = {}): TextNode => ({
    id: node.id, type: 'text', x: r1(x), y: r1(top), text, fontSize: fs, fill: INK, align: 'center', rotation: 0, ...extra,
  })
  const rule = (x1: number, y1: number, x2: number, y2: number, width = 1.2) => out.rules.push({ x1: r1(x1), y1: r1(y1), x2: r1(x2), y2: r1(y2), width })
  const widthOf = (text: string): number => measureText(words(text, 0, 0)).w

  // Room around the plot: title on top, numbers and axis title on the left, names below, legend on the right.
  const tickWidth = Math.max(...yAxis.ticks.map((t) => widthOf(t.label)))
  const left = Math.max(minLeft, (node.yLabel ? fs * 1.7 : 2) + tickWidth + 10)
  const place: LegendPlace | 'right' = legend.length ? (node.legend ?? 'right') : 'none'
  const widest = legend.length ? Math.max(...legend.map((l) => widthOf(l.name))) : 0
  const legendWidth = place === 'right' ? widest + fs + 16 : 0
  const px = left
  const pw = Math.max(10, node.w - left - right - legendWidth)
  // Above or below the plot the entries stand side by side, on as many rows as they need.
  const mark = fs * 0.8 + 5
  const across: { x: number; row: number }[] = []
  const rowWidths: number[] = []
  if (place === 'top' || place === 'bottom') {
    let x = 0
    let row = 0
    for (const entry of legend) {
      const w = mark + widthOf(entry.name)
      if (x > 0 && x + w > pw) {
        row++
        x = 0
      }
      across.push({ x, row })
      rowWidths[row] = x + w
      x += w + fs * 1.2
    }
  }
  const legendHeight = rowWidths.length * fs * 1.5 + (rowWidths.length ? fs * 0.3 : 0)
  const head = node.title ? fs * 2 : fs * 0.8
  const top = head + (place === 'top' ? legendHeight : 0)
  const py = top
  // One line of names takes what it always did; every further line one line more.
  const below = fs * (0.65 + 1.25 * Math.max(1, rows(pw, fs)))
  const ph = Math.max(10, node.h - top - below - (node.xLabel ? fs * 1.5 : 0) - (place === 'bottom' ? legendHeight : 0))
  out.clip = { x: r1(px), y: r1(py), w: r1(pw), h: r1(ph) }
  AXES.set(out, { ...AXES.get(out), y: [yAxis.min, yAxis.max] })
  const xEnds = usableEnds(node.xMin, node.xMax, !!node.xLog)
  const yEnds = usableEnds(node.yMin, node.yMax, !!node.yLog)
  out.clipped = [yEnds.min, yEnds.max, ...(node.kind === 'scatter' ? [xEnds.min, xEnds.max] : [])].some((v) => v !== undefined)

  legend.forEach((entry, i) => {
    if (place === 'none') return
    nowPart(out, { what: 'legend', at: i })
    let x: number
    let y: number
    if (place === 'top' || place === 'bottom') {
      // Each row is centred on the plot.
      x = px + Math.max(0, (pw - rowWidths[across[i].row]) / 2) + across[i].x
      y = (place === 'top' ? (node.title ? fs * 2 : fs * 0.4) : py + ph + below + (node.xLabel ? fs * 1.5 : 0) + fs * 0.3) + across[i].row * fs * 1.5
    } else {
      // In a column: at the right of the plot, or inside it in one of its upper corners.
      x = place === 'inside' ? px + pw - widest - mark - 8 : place === 'insideLeft' ? px + 10 : px + pw + right + 4
      y = py + (place === 'right' ? 0 : 6) + i * fs * 1.5
    }
    out.swatches.push({ x: r1(x), y: r1(y + fs * 0.2), size: r1(fs * 0.8), fill: entry.colour, ...(entry.shape ? { shape: entry.shape } : {}) })
    out.texts.push(words(entry.name, x + mark, y, { align: 'left' }))
  })
  nowPart(out, null)
  if (node.title) out.texts.push({ ...words(node.title, px + pw / 2, 2, { bold: true }), part: { what: 'title' } })
  if (node.yLabel) {
    const label = words(node.yLabel, fs * 0.9, 0, { rotation: -90 })
    out.texts.push({ ...label, y: r1(py + ph / 2 - measureText(label).h / 2), part: { what: 'yTitle' } })
  }
  if (node.xLabel) out.texts.push({ ...words(node.xLabel, px + pw / 2, py + ph + below), part: { what: 'xTitle' } })
  return { fs, words, rule, widthOf, px, py, pw, ph }
}

/** How wide a piece of chart lettering is. */
const textWidth = (text: string, fs: number): number => measureText({ id: '', type: 'text', x: 0, y: 0, text, fontSize: fs, fill: INK, align: 'center', rotation: 0 }).w

/**
 * The value axis itself: its line, tick marks and numbers. `y` turns a value into a height on the
 * page. On a chart too short for all of them, numbers that would run into the one below are left out.
 */
function drawValueAxis(f: ReturnType<typeof frame>, axis: Axis, y: (v: number) => number, out: ChartDrawing, topY: number) {
  nowPart(out, { what: 'yAxis' })
  f.rule(f.px, topY, f.px, f.py + f.ph)
  let last = Infinity
  for (const tick of axis.ticks) {
    const at = y(tick.value)
    if (!Number.isFinite(at) || last - at < f.fs * 1.1) continue
    last = at
    f.rule(f.px - 4, at, f.px, at)
    out.texts.push(f.words(tick.label, f.px - 7, at - (f.fs * 1.25) / 2, { align: 'right' }))
  }
  nowPart(out, null)
}

interface Column {
  group: ChartGroup
  /** Place of the group in the chart's table. */
  index: number
  colour: string
  /** The mark of its points, when it is not a circle. */
  shape?: PointShape
  /** How large its points are (1 = usual) and how solid. */
  scale: number
  solid: { opacity?: number }
  /** The values that can be shown (on a logarithmic axis: those above zero). */
  values: number[]
  s: Stats
  box: BoxStats | null
  err: number
  /** Smallest and largest value the column reaches with everything that is drawn for it. */
  lo: number
  hi: number
  cx: number
  width: number
  /** Stacked bars: where its part of the stack begins and ends, and how high the whole stack of its category reaches. */
  from?: number
  to?: number
  top?: number
  /** Bars scaled to 100 %: its share of the category's total, in per cent. */
  share?: number
  /** The ends of its error bar (equal to the mean when there is none). */
  eLo: number
  eHi: number
}

/** What a column shows when it is not the mean of its values with a symmetric error bar (the fold change of a qPCR analysis). */
type ColumnSummary = (index: number) => { mean: number; low: number | null; high: number | null } | null

/**
 * True when the chart's bars stand on top of each other: asked for, a bar chart with categories
 * and series, and a linear value axis (a logarithmic one has no zero to stack from).
 */
export const isStacked = (node: ChartNode): boolean => node.kind === 'bar' && !!node.stacked && !node.yLog && isGrouped(node)

/** True when stacked bars are scaled to 100 % each. */
export const isPercent = (node: ChartNode): boolean => isStacked(node) && !!node.percent

const STACK_NEGATIVE_NOTE = 'A share of a whole cannot be below zero: with a mean below zero the bars are stacked as they are, not scaled to 100 %.'
const STACK_LOG_NOTE = 'Bars cannot be stacked on a logarithmic axis, which has no zero to stack from: they stand side by side.'
const STACK_MEANS_NOTE = 'Stacked bars show the mean of each series only: error bars and single values are left out.'

const VIOLIN_NOTE = `A violin needs at least ${VIOLIN_MIN} values that are not all the same: other groups are shown as dots.`
const BRACKET_NOTE = 'Not all brackets fit above the data: make the chart taller, or remove some.'
const VALUES_HIGH_NOTE = 'The numbers above the groups do not all fit above the data: make the chart taller.'
const VALUES_WIDE_NOTE = 'The numbers at the groups are wider than their columns: make the chart wider or its text smaller, or write fewer decimals.'
/** A name along the bottom takes at most this many lines. */
const NAME_LINES = 3

/** Break a name to fit `room`, on at most `NAME_LINES` lines. */
function fitName(name: string, room: number, fs: number): string {
  const lines = wrapText(name, { fontSize: fs }, room).split('\n')
  return lines.length <= NAME_LINES ? lines.join('\n') : [...lines.slice(0, NAME_LINES - 1), `${lines[NAME_LINES - 1]}…`].join('\n')
}

interface Violin {
  /** Positions along the value axis (logarithms on a logarithmic axis), from the smallest to the largest value. */
  at: number[]
  /** The estimated density at each. */
  dens: number[]
  peak: number
}

/** Outlines already worked out, by the group's list of values: a chart is laid out again on every resize, its numbers rarely change. */
const violins = new WeakMap<number[], Map<boolean, Violin | null>>()

/**
 * The outline of a violin for these values, or null when there is none to draw (too few values,
 * or all the same). The density is worked out wherever it can change: every half bandwidth around
 * every value, plus an even spread between the smallest and the largest. An even spread alone
 * would step right over a tight cluster when one value lies far away, and draw a shape that
 * contradicts the data.
 */
function violinOf(values: number[], log: boolean): Violin | null {
  let known = violins.get(values)
  if (!known) violins.set(values, (known = new Map()))
  if (known.has(log)) return known.get(log) ?? null
  const data = log ? values.filter((v) => v > 0).map((v) => Math.log10(v)) : values
  const from = Math.min(...data)
  const span = Math.max(...data) - from
  let shape: Violin | null = null
  if (data.length >= VIOLIN_MIN && span > 0) {
    const bw = bandwidth(data)
    // Positions closer together than a quarter bandwidth add nothing; with very many they are thinned further.
    let fine = bw / 4
    let places = new Map<number, number>()
    do {
      places = new Map()
      const add = (v: number) => {
        if (v > from && v < from + span) places.set(Math.round((v - from) / fine), v)
      }
      for (let k = 1; k < 64; k++) add(from + (span * k) / 64)
      for (const v of data) for (let j = -6; j <= 6; j++) add(v + (j * bw) / 2)
      fine *= 2
    } while (places.size > 1200)
    const at = [from, ...[...places.values()].sort((p, q) => p - q), from + span]
    const dens = density(data, at, bw)
    shape = { at, dens, peak: Math.max(...dens) || 1 }
  }
  known.set(log, shape)
  return shape
}

/** Bars, dots, boxes, violins and lines: one column per group, side by side or grouped by category. */
function columnLayout(node: ChartNode, summary?: ColumnSummary): ChartDrawing {
  const drawn = drawnGroups(node)
  const grouped = isGrouped(node)
  const cats = grouped ? unique(drawn.map((c) => c.group.category ?? '')) : []
  const series = chartSeries(node)
  const stacked = isStacked(node)
  const showPoints = !stacked && (node.kind === 'dot' || !!node.points)
  const log = !!node.yLog

  let hidden = 0
  const cols: Column[] = drawn.map(({ group, index }) => {
    const values = shownValues(node, group)
    hidden += group.values.length - values.length
    const own0 = summary?.(index) ?? null
    const s = own0 ? { ...stats(values), mean: own0.mean } : stats(values)
    const err = stacked ? 0 : own0 ? Math.max(own0.high === null ? 0 : own0.high - own0.mean, own0.low === null ? 0 : own0.mean - own0.low) : errorOf(node, s)
    const eLo = own0 ? (own0.low ?? s.mean) : s.mean - err
    const eHi = own0 ? (own0.high ?? s.mean) : s.mean + err
    // What the column reaches: a bar or line point with its error bar (and its dots, when shown);
    // a dot chart every value and its error bar; a box or violin simply every value.
    const reach = node.kind === 'bar' || node.kind === 'line' ? [s.mean, eLo, eHi, ...(showPoints ? values : [])] : node.kind === 'dot' ? [...values, eLo, eHi] : values
    const shown = values.length ? (log ? reach.filter((v) => v > 0) : reach) : []
    const own = series.find((x) => x.groups.includes(index))!
    const { colour, shape } = own
    // A logarithmic axis has no zero to stand a bar on: it starts below the smallest value of the
    // group, so that a bar or a mean always has a visible height above the bottom of the axis.
    return { group, index, colour, ...(shape ? { shape } : {}), ...pointsOf(node, own), values, s, box: boxStats(values), err, eLo, eHi, lo: Math.min(...shown, ...(log ? values : [])), hi: Math.max(...shown), cx: 0, width: 0 }
  })
  const live = cols.filter((c) => c.values.length)

  // Stacked bars: within a category every series stands on the one before it, in the order of
  // the legend; means below zero hang under the base line, one below the other.
  // Scaled to 100 %: each part is its share of the total of its category. A mean below zero has no share.
  const percent = stacked && !!node.percent && live.every((c) => c.s.mean >= 0)
  if (stacked) {
    for (const cat of cats) {
      const stack = series.flatMap((x) => live.filter((c) => (c.group.category ?? '') === cat && x.groups.includes(c.index)))
      const whole = stack.reduce((a, c) => a + c.s.mean, 0)
      let up = 0
      let down = 0
      for (const c of stack) {
        const part = percent ? (whole > 0 ? (c.s.mean / whole) * 100 : 0) : c.s.mean
        c.share = percent ? part : undefined
        c.from = part >= 0 ? up : down
        c.to = c.from + part
        if (part >= 0) up = c.to
        else down = c.to
        c.lo = Math.min(c.from, c.to)
        c.hi = Math.max(c.from, c.to)
      }
      // The last part of a bar scaled to 100 % ends at 100 exactly, whatever the rounding on the way.
      if (percent && stack.length && whole > 0) stack[stack.length - 1].to = stack[stack.length - 1].hi = up = 100
      for (const c of stack) c.top = up
    }
  }

  // A linear axis includes zero, so the height of a bar means what it seems to; a logarithmic one cannot.
  // Reference lines are part of what the chart shows, so the axis reaches them.
  const refs = usableRefLines(node.refLines, node.kind, false, log)
  const lo = Math.min(...(log ? [] : [0]), ...live.map((c) => c.lo), ...(live.length ? refs.map((l) => l.value) : []))
  const hi = Math.max(...(log ? [] : [0]), ...live.map((c) => c.hi), ...(live.length ? refs.map((l) => l.value) : []))
  const axis = axisFor(Number.isFinite(lo) ? lo : 1, Number.isFinite(hi) ? hi : 10, { min: node.yMin, max: node.yMax, log })

  const notes = sharedNotes(node, [{ axis, name: 'value axis' }])
  if (hidden) notes.push(`${hidden} ${hidden === 1 ? 'value is' : 'values are'} zero or negative: on a logarithmic axis ${hidden === 1 ? 'it' : 'they'} cannot be shown, and the means, medians and error bars are worked out without ${hidden === 1 ? 'it' : 'them'}.`)
  if (node.kind === 'violin' && live.some((c) => !violinOf(c.group.values, log))) notes.push(VIOLIN_NOTE)
  if (node.kind === 'bar' && node.stacked && grouped && log) notes.push(STACK_LOG_NOTE)
  if (stacked && (node.error || node.points)) notes.push(STACK_MEANS_NOTE)
  if (stacked && node.percent && !percent) notes.push(STACK_NEGATIVE_NOTE)

  const valueLabels = usableValueLabels(node.valueLabels)
  const names = grouped ? cats : cols.map((c) => c.group.name)
  const fitNames = (pw: number, fs: number): string[] => names.map((name) => fitName(name, (pw / Math.max(1, names.length)) * 0.94, fs))

  /** Draw the chart with `headroom` units kept free above the data for brackets; returns how much more is needed. */
  const draw = (headroom: number): { out: ChartDrawing; short: number; room: number } => {
    const out = empty()
    out.notes = [...notes]
    // The legend of a chart made of points shows their marks; of bars, boxes and violins, colour squares.
    const marks = node.kind === 'dot' || node.kind === 'line'
    const legend = series.map((x) => ({ name: x.name, colour: x.colour, ...(marks ? { shape: x.shape ?? ('circle' as const) } : {}) }))
    const f = frame(node, out, axis, grouped ? legend : [], 8, (pw, fs) => Math.max(...fitNames(pw, fs).map((t) => t.split('\n').length), 1))
    const { fs, words, rule, px, py, pw, ph } = f
    const line = (x1: number, y1: number, x2: number, y2: number, width = 1.2) => out.lines.push({ x1: r1(x1), y1: r1(y1), x2: r1(x2), y2: r1(y2), width })
    const top = py + headroom
    const y = (v: number): number => top + (1 - axis.at(v)) * (py + ph - top)
    const base = y(log ? axis.min : Math.max(axis.min, Math.min(axis.max, 0)))
    const dot = Math.max(1.8, fs * 0.2)
    // The rings of a box plot's outliers follow the size set for the whole chart.
    const ring = dot * (pointStyle(node.pointSize, 1).pointSize ?? 1)

    // Where each column stands. In a grouped chart the series of one category stand side by side;
    // the points of a line chart stand in the middle of their category, one line per series.
    const slot = grouped ? pw / cats.length : drawn.length ? pw / drawn.length : pw
    const inner = slot * 0.84
    cols.forEach((c, i) => {
      if (!grouped) {
        c.cx = px + slot * (i + 0.5)
        c.width = slot
        return
      }
      const cat = cats.indexOf(c.group.category ?? '')
      const place = series.findIndex((x) => x.groups.includes(c.index))
      const sub = inner / series.length
      // The points of a line chart and the parts of a stacked bar stand in the middle of their category.
      c.cx = node.kind === 'line' || stacked ? px + slot * (cat + 0.5) : px + slot * cat + (slot - inner) / 2 + sub * (place + 0.5)
      c.width = node.kind === 'line' ? slot * 0.5 : stacked ? slot * 0.62 : sub
    })

    const points = (c: Column, radius: number, fill: string) => {
      // Values are spread sideways in a fixed pattern, so the same data always gives the same picture.
      const spread = c.width * 0.16
      c.values.forEach((v, j) => out.circles.push({ cx: r1(c.cx + (((j * 3) % 7) - 3) / 3 * spread), cy: r1(y(v)), r: r1(radius * c.scale), fill, ...(c.shape ? { shape: c.shape } : {}), ...c.solid }))
    }

    for (const c of live) {
      nowPart(out, { what: 'group', at: c.index })
      const { cx, s } = c
      const cap = Math.min(10, c.width * 0.12)
      let dots = showPoints
      // A violin that cannot be drawn (too few values, or all the same) is shown as dots in its colour.
      const violin = node.kind === 'violin' ? violinOf(c.group.values, log) : null
      const asDots = node.kind === 'violin' && !violin
      if (node.kind === 'bar' && (!log || s.mean > 0)) {
        const width = c.width * (grouped ? 0.86 : 0.6)
        // A bar stands on the base line; a part of a stacked bar on the part before it.
        const [foot, head] = stacked ? [y(c.from ?? 0), y(c.to ?? s.mean)] : [base, y(s.mean)]
        out.rects.push({ x: r1(cx - width / 2), y: r1(Math.min(head, foot)), w: r1(width), h: r1(Math.abs(foot - head)), fill: c.colour })
      }
      if (node.kind === 'box' && c.box) {
        const half = c.width * (grouped ? 0.36 : 0.28)
        const b = c.box
        line(cx, y(b.q3), cx, y(b.whiskerHigh))
        line(cx, y(b.q1), cx, y(b.whiskerLow))
        line(cx - half * 0.5, y(b.whiskerHigh), cx + half * 0.5, y(b.whiskerHigh))
        line(cx - half * 0.5, y(b.whiskerLow), cx + half * 0.5, y(b.whiskerLow))
        out.rects.push({ x: r1(cx - half), y: r1(y(b.q3)), w: r1(half * 2), h: r1(Math.abs(y(b.q1) - y(b.q3))), fill: c.colour })
        line(cx - half, y(b.median), cx + half, y(b.median), 2)
        // Outliers are drawn as rings, unless every value is shown as a dot anyway.
        if (!showPoints) for (const v of b.outliers) out.circles.push({ cx: r1(cx), cy: r1(y(v)), r: r1(ring * 1.2), fill: INK, ring: true })
      }
      if (violin) {
        // The outline follows the estimated density, from the smallest to the largest value. On a
        // logarithmic axis the density is that of the logarithms, so the shape is right as drawn.
        const half = c.width * (grouped ? 0.44 : 0.38)
        const n = violin.at.length
        const side = (sign: number, k: number): string => `${r1(cx + (sign * half * violin.dens[k]) / violin.peak)} ${r1(y(log ? 10 ** violin.at[k] : violin.at[k]))}`
        const up = violin.at.map((_, k) => side(1, k))
        const down = violin.at.map((_, k) => side(-1, n - 1 - k))
        out.paths.push({ d: `M${[...up, ...down].join('L')}Z`, stroke: INK, width: 1, fill: c.colour })
        if (c.box) line(cx - half * 0.45, y(c.box.median), cx + half * 0.45, y(c.box.median), 2)
      }
      if (asDots) dots = true
      if (dots) points(c, node.kind === 'dot' || node.kind === 'violin' ? dot * 1.4 : dot, node.kind === 'dot' || asDots ? c.colour : INK)
      if (node.kind === 'dot' && (!log || s.mean > 0)) line(cx - c.width * 0.25, y(s.mean), cx + c.width * 0.25, y(s.mean), 2)
      if (c.err > 0 && (node.kind === 'bar' || node.kind === 'dot' || node.kind === 'line') && (!log || s.mean > 0)) {
        // On a logarithmic axis an error bar that would reach zero or below stops at the bottom of the axis.
        const low = log && c.eLo <= 0 ? null : c.eLo
        nowPart(out, { what: 'error', at: c.index })
        line(cx, low === null ? py + ph : y(low), cx, y(c.eHi))
        line(cx - cap, y(c.eHi), cx + cap, y(c.eHi))
        if (low !== null) line(cx - cap, y(low), cx + cap, y(low))
      }
    }

    if (node.kind === 'line') {
      // One line per series (a chart without categories is a single series), joining the means in table order.
      const runs = grouped ? series.map((x) => live.filter((c) => x.groups.includes(c.index))) : [live]
      for (const run of runs) {
        const ok = run.filter((c) => !log || c.s.mean > 0)
        if (!ok.length) continue
        const colour = ok[0].colour
        nowPart(out, { what: 'group', at: ok[0].index })
        out.paths.push({ d: ok.map((c, i) => `${i ? 'L' : 'M'}${r1(c.cx)} ${r1(y(c.s.mean))}`).join(''), stroke: colour, width: 2 })
        // The marks of the means take the shape and size of the points, and stay solid.
        for (const c of ok) out.circles.push({ cx: r1(c.cx), cy: r1(y(c.s.mean)), r: r1(dot * 1.5 * c.scale), fill: colour, ...(c.shape ? { shape: c.shape } : {}), part: { what: 'group', at: c.index } })
      }
    }

    // What is drawn for a column reaches this far up (a bar reaches zero even when its mean is
    // negative; nothing is drawn beyond the ends of the axis).
    const reachOf = (c: Column): number => Math.max(axis.min, Math.min(axis.max, stacked ? Math.max(c.top ?? 0, 0) : node.kind === 'bar' && !log ? Math.max(c.hi, 0) : c.hi))
    let highest = py

    // A number at every group. In a bar chart it stands inside the bar: under its top, or at its
    // foot when an error bar or dots run through the bar. Where it does not fit, and in every
    // other kind of chart, it stands above everything drawn for the group.
    const labelTops = new Map<number, number>()
    nowPart(out, { what: 'number' })
    if (valueLabels) {
      const lh = fs * 1.25
      let outside = 0
      let over = 0
      let wide = false
      let leftOut = 0
      for (const c of live) {
        const text = c.share !== undefined && valueLabels.show !== 'n' ? `${valueText(c.share, valueLabels.decimals ?? 0)} %` : valueLabelText(valueLabels, c.s, c.box)
        if (text === null) continue
        const w = f.widthOf(text)
        if (stacked) {
          // In a stacked bar the number stands in the middle of its part, or nowhere: above the
          // stack it could not be told which part it belongs to.
          const [a, b] = [y(c.from ?? 0), y(c.to ?? 0)].map((v) => Math.max(top, Math.min(py + ph, v))).sort((p, q) => p - q)
          if (b - a >= lh + 2 && w <= c.width * 0.86 - 4) out.texts.push(words(text, c.cx, (a + b) / 2 - lh / 2, { fill: valueLabels.color ?? readableOn(c.colour) }))
          else leftOut++
          continue
        }
        if (w > c.width) wide = true
        let at: number | null = null
        const bar = node.kind === 'bar' && (!log || c.s.mean > 0)
        if (bar && !valueLabels.above) {
          const end = Math.max(top, Math.min(py + ph, y(c.s.mean)))
          const through = c.err > 0 || showPoints
          const inside = through ? [c.eLo, c.eHi, ...(showPoints ? c.values : [])] : []
          if (end <= base) {
            // A bar that stands on the base line.
            const lowest = Math.min(...inside)
            at = through ? base - 3 - lh : end + 3
            if (through && (!(!log || lowest > 0) || at < y(lowest) + 2)) at = null
            if (at !== null && (at < end + 2 || at + lh > base - 1)) at = null
          } else {
            // A bar that hangs from it (a negative mean).
            at = through ? base + 3 : end - 3 - lh
            if (through && at + lh > y(Math.max(...inside)) - 2) at = null
            if (at !== null && (at < base + 1 || at + lh > end - 2)) at = null
          }
          if (at !== null && w > c.width * (grouped ? 0.86 : 0.6) - 4) at = null
          if (at === null) outside++
        }
        const within = at !== null
        if (at === null) {
          const marks = showPoints || node.kind === 'dot' || node.kind === 'line' ? dot * 1.5 * c.scale : 0
          at = y(reachOf(c)) - 3 - marks - lh
          labelTops.set(c.index, at)
          highest = Math.min(highest, at)
          over++
        }
        out.texts.push(words(text, c.cx, at, { fill: valueLabels.color ?? (within ? readableOn(c.colour) : INK) }))
      }
      if (leftOut) out.notes.push(`${leftOut === 1 ? 'One number does' : `${leftOut} numbers do`} not fit in ${leftOut === 1 ? 'its part of the stacked bar and is' : 'their parts of the stacked bars and are'} left out: make the chart larger or its lettering smaller.`)
      if (wide) out.notes.push(VALUES_WIDE_NOTE)
      // A light colour chosen for numbers inside bars may not be readable beside them.
      if (over && valueLabels.color && readableOn(valueLabels.color) === INK) {
        out.notes.push(
          outside
            ? `${outside === 1 ? 'One number does' : `${outside} numbers do`} not fit inside ${outside === 1 ? 'its bar and is' : 'their bars and are'} written above ${outside === 1 ? 'it' : 'them'}, in the light colour you chose: check that it can be read on the page.`
            : 'The numbers above the groups are written in the light colour you chose: check that they can be read on the page.',
        )
      }
    }

    refs.forEach((l, i) => {
      nowPart(out, { what: 'refLine', at: i })
      const at = y(l.value)
      out.dashes.push({ x1: r1(px), y1: r1(at), x2: r1(px + pw), y2: r1(at), ...(l.dash ? { style: l.dash } : {}) })
      // The label sits on the line at its right end, unless the line lies outside the range that was set.
      if (l.label && axis.at(l.value) >= 0 && axis.at(l.value) <= 1) out.texts.push(words(l.label, px + pw - 3, at - fs * 1.25 - 1, { align: 'right' }))
    })
    nowPart(out, null)

    // Names along the bottom: the categories of a grouped chart, otherwise every group. A name
    // wider than its place is broken into lines.
    const labels = fitNames(pw, fs)
    if (grouped) cats.forEach((_, i) => out.texts.push({ ...words(labels[i], px + slot * (i + 0.5), py + ph + 5), part: { what: 'category', at: i } }))
    else cols.forEach((c, i) => out.texts.push({ ...words(labels[i], c.cx, py + ph + 5), part: { what: 'group', at: c.index } }))

    // Brackets stand a little above what is drawn for the columns they span, and above a number
    // written over a column. A wider bracket goes over a narrower one.
    const step = fs * 1.25 + fs * 0.35 + 5
    const placed: { x1: number; x2: number; y: number }[] = []
    const wanted = (node.brackets ?? [])
      .map((b, place) => ({ a: live.find((c) => c.index === b.from), b: live.find((c) => c.index === b.to), label: bracketLabel(node, b), place }))
      .filter((b): b is { a: Column; b: Column; label: string; place: number } => !!b.a && !!b.b && b.a !== b.b)
      .map((b) => ({ x1: Math.min(b.a.cx, b.b.cx), x2: Math.max(b.a.cx, b.b.cx), label: b.label, place: b.place }))
      // Two parts of one stacked bar stand in the same place: there is nothing to span.
      .filter((b) => b.x2 - b.x1 > 1)
      .sort((p, q) => p.x2 - p.x1 - (q.x2 - q.x1) || p.x1 - q.x1)
    for (const b of wanted) {
      const under = live.filter((c) => c.cx >= b.x1 - 0.5 && c.cx <= b.x2 + 0.5)
      let at = Math.min(...under.map((c) => Math.min(y(reachOf(c)), labelTops.get(c.index) ?? Infinity))) - fs * 0.6
      for (let again = true; again; ) {
        again = false
        for (const p of placed) {
          if (p.x1 <= b.x2 && b.x1 <= p.x2 && Math.abs(at - p.y) < step - 0.5) {
            at = p.y - step
            again = true
          }
        }
      }
      placed.push({ x1: b.x1, x2: b.x2, y: at })
      const tick = fs * 0.35
      nowPart(out, { what: 'bracket', at: b.place })
      rule(b.x1, at, b.x2, at)
      rule(b.x1, at, b.x1, at + tick)
      rule(b.x2, at, b.x2, at + tick)
      if (b.label) out.texts.push(words(b.label, (b.x1 + b.x2) / 2, at - fs * 1.25 - 1))
      highest = Math.min(highest, at - fs * 1.25 - 1)
    }

    // Axes last: the value axis on the left (as tall as the data), the base line under the columns.
    drawValueAxis(f, axis, y, out, top)
    nowPart(out, { what: 'xAxis' })
    rule(px, base, px + pw, base)
    nowPart(out, null)
    if (!live.length) out.texts.push(words('Paste your numbers in the panel', px + pw / 2, py + ph / 2 - fs, { fill: '#8a93a3', italic: true }))
    return { out, short: py - highest, room: ph }
  }

  // Brackets need room above the data. Making room lowers the data, which changes how much is
  // needed, so the chart is drawn a few times until the brackets fit. The data always keeps at
  // least two fifths of the plot: more brackets than that leaves room for are reported, not hidden.
  let headroom = 0
  let result = draw(0)
  for (let pass = 0; pass < 8 && result.short > 0.5; pass++) {
    const next = Math.min(headroom + result.short, result.room * 0.6)
    if (next <= headroom + 0.01) break
    headroom = next
    result = draw(headroom)
  }
  if (result.short > 0.5) result.out.notes.push(node.brackets?.length ? BRACKET_NOTE : VALUES_HIGH_NOTE)
  return result.out
}

/** One series of a scatter chart: its points as they can be shown, and the line fitted to them. */
interface Series {
  name: string
  colour: string
  shape?: PointShape
  scale: number
  solid: { opacity?: number }
  points: [number, number][]
  /** The name of each point; '' where it has none. */
  names: string[]
  fit: Fit | null
  /** The dose-response curve, when the chart asks for one and the points define one. */
  dose: DoseFit | null
  /** Points the curve leaves out: a dose of zero or below has no logarithm. */
  noDose: number
  /** The correlation of its points, when the chart asks for one and it is defined. */
  corr: Correlation | null
}

/** True when the chart draws a dose-response curve through each series of points. */
export const fitsDose = (node: ChartNode): boolean => node.kind === 'scatter' && !!node.fit && node.curve === 'dose'

/** The plateaus the chart holds at a stated value. */
const heldOf = (node: ChartNode): { bottom?: number; top?: number } => ({ ...(usable(node.doseBottom) ? { bottom: node.doseBottom } : {}), ...(usable(node.doseTop) ? { top: node.doseTop } : {}) })

/** Dose-response curves already worked out, by the list of values they were fitted to: the search takes a moment, a chart is laid out often. */
const doseFits = new WeakMap<number[], Map<string, DoseFit | null>>()

/** The points of every series that can be shown on the chart's axes, and the fitted lines. */
function scatterSeries(node: ChartNode): { series: Series[]; hidden: number } {
  let hidden = 0
  const series = drawnGroups(node).map((c, i) => {
    const all = c.group.values.map((v, k) => ({ p: [c.group.xs?.[k] ?? NaN, v] as [number, number], name: c.group.labels?.[k] ?? '' })).filter(({ p }) => Number.isFinite(p[0]) && Number.isFinite(p[1]))
    const shown = all.filter(({ p: [x, v] }) => (!node.xLog || x > 0) && (!node.yLog || v > 0))
    const points = shown.map((s) => s.p)
    hidden += all.length - points.length
    // The line is fitted to the values as they are plotted: to their logarithms on a logarithmic axis.
    const plotted = points.map(([x, v]) => [node.xLog ? Math.log10(x) : x, node.yLog ? Math.log10(v) : v] as [number, number])
    // A dose-response curve is fitted to the response as measured, against the logarithm of the dose.
    let dose: DoseFit | null = null
    const dosed = points.filter(([x]) => x > 0)
    if (fitsDose(node)) {
      let known = doseFits.get(c.group.values)
      if (!known) doseFits.set(c.group.values, (known = new Map()))
      const key = `${!!node.xLog}|${!!node.yLog}|${node.doseBottom ?? ''}|${node.doseTop ?? ''}|${(c.group.xs ?? []).join(',')}`
      if (!known.has(key)) known.set(key, fitDose(dosed.map(([x, v]) => [Math.log10(x), v]), heldOf(node)))
      dose = known.get(key) ?? null
    }
    return { name: c.group.name, colour: groupColour(c.group, i, node.palette), ...markOf(c.group.shape), ...pointsOf(node, c.group), points, names: shown.map((s) => s.name), fit: fitLine(plotted), dose, noDose: points.length - dosed.length, corr: node.corr ? correlation(plotted, node.corr) : null }
  })
  return { series, hidden }
}

/** For the panel: every series of a scatter chart with the number of points shown, its fitted line and its dose-response curve (null where none can be fitted, or none is asked for). */
export const scatterFits = (node: ChartNode): { name: string; points: number; fit: Fit | null; dose: DoseFit | null; corr: Correlation | null }[] =>
  scatterSeries(node).series.map((s) => ({ name: s.name, points: s.points.length, fit: s.fit, dose: s.dose, corr: s.corr }))

/** A correlation in words, with the label marks: "*r* = 0.98, *p* < 0.0001" (Spearman's is written *r*_{s}). */
export const corrText = (c: Correlation, method: 'pearson' | 'spearman'): string => `*r*${method === 'spearman' ? '_{s}' : ''} = ${Number(c.r.toFixed(2))}, ${pText(c.p).replace(/^p/, '*p*')}`

const sig3 = (v: number): string => String(Number(v.toPrecision(3)))

/** The EC50 of a curve with its 95 % confidence interval (from the standard error of its logarithm); the interval is null when it cannot be worked out. */
export function ec50Of(fit: DoseFit): { ec50: number; low: number | null; high: number | null } {
  const ec50 = 10 ** fit.logEc50
  const reach = fit.seLogEc50 !== null && fit.df > 0 ? tCritical(0.05, fit.df) * fit.seLogEc50 : NaN
  return Number.isFinite(reach) ? { ec50, low: 10 ** (fit.logEc50 - reach), high: 10 ** (fit.logEc50 + reach) } : { ec50, low: null, high: null }
}

export interface Ec50Comparison {
  a: string
  b: string
  /** The extra sum-of-squares F test for "the same EC50": F with 1 and `df` degrees of freedom. */
  f: number
  df: number
  p: number
}

/** Comparisons already worked out, by the chart's table (each takes several fits). */
const ec50Comparisons = new WeakMap<ChartGroup[], Map<string, Ec50Comparison[]>>()

/**
 * Do the dose-response curves of the chart have the same EC50? Every pair of fitted series, up to
 * four series (six pairs); the p values are not corrected for the number of pairs.
 */
export function compareCurves(node: ChartNode): Ec50Comparison[] {
  if (!fitsDose(node)) return []
  const key = `${!!node.xLog}|${!!node.yLog}|${node.doseBottom ?? ''}|${node.doseTop ?? ''}|${node.groups.map((g) => g.name).join('\u0001')}`
  let known = ec50Comparisons.get(node.groups)
  if (!known) ec50Comparisons.set(node.groups, (known = new Map()))
  const done = known.get(key)
  if (done) return done
  const fitted = scatterSeries(node).series.filter((s) => s.dose).slice(0, 4)
  const logged = (s: Series): [number, number][] => s.points.filter(([x]) => x > 0).map(([x, v]) => [Math.log10(x), v])
  const out: Ec50Comparison[] = []
  for (let i = 0; i < fitted.length; i++) {
    for (let j = i + 1; j < fitted.length; j++) {
      const test = compareEc50(logged(fitted[i]), logged(fitted[j]), heldOf(node))
      if (test) out.push({ a: fitted[i].name, b: fitted[j].name, ...test })
    }
  }
  known.set(key, out)
  return out
}

/** A comparison in words: "Agonist and Inhibitor: F(1, 40) = 93, p < 0.0001". */
export const comparisonText = (c: Ec50Comparison): string => `${c.a} and ${c.b}: F(1, ${c.df}) = ${sig3(c.f)}, ${pText(c.p)}`

/** A dose-response curve in words: "EC50 = 1.93 (95 % CI 1.83 to 2.04), Hill slope 1.19, bottom 2.07, top 96.9, R² = 0.9999". A falling curve has an IC50. */
export function doseText(fit: DoseFit, held: { bottom?: number; top?: number } = {}): string {
  const { ec50, low, high } = ec50Of(fit)
  return `${fit.hill < 0 ? 'IC50' : 'EC50'} = ${sig3(ec50)}${low !== null && high !== null ? ` (95 % CI ${sig3(low)} to ${sig3(high)})` : ''}, Hill slope ${sig3(fit.hill)}, bottom ${sig3(fit.bottom)}${held.bottom !== undefined ? ' (held)' : ''}, top ${sig3(fit.top)}${held.top !== undefined ? ' (held)' : ''}, R² = ${Number(fit.r2.toFixed(4))}`
}

/** The plateaus a chart's dose-response curves are held at, for the words that describe them. */
export const heldPlateaus = (node: ChartNode): { bottom?: number; top?: number } => heldOf(node)

/** What a methods section can say about a scatter chart's dose-response curves and correlations; null when it has neither. */
export function curveMethodsText(node: ChartNode): string | null {
  if (node.kind !== 'scatter') return null
  if (isSurvival(node)) return survivalMethodsText(node)
  const all = scatterSeries(node).series
  const parts: string[] = []
  const fitted = fitsDose(node) ? all.filter((s) => s.dose) : []
  if (fitted.length) {
    const held = heldOf(node)
    const each = fitted.map((s) => `${fitted.length > 1 || s.name.trim() ? `${s.name}: ` : ''}${doseText(s.dose!, held)}, n = ${s.dose!.n}`).join('; ')
    const kept = [held.bottom !== undefined ? `the bottom was held at ${sig3(held.bottom)}` : '', held.top !== undefined ? `the top was held at ${sig3(held.top)}` : ''].filter(Boolean)
    const pairs = compareCurves(node)
    parts.push(
      'Dose-response curves were fitted by least squares to the response against the logarithm of the dose, with the four-parameter logistic equation ' +
        `y = bottom + (top − bottom) / (1 + 10^((log EC50 − log x) × Hill slope))${kept.length ? `; ${kept.join(' and ')}` : ''}. Confidence intervals of the EC50 are asymptotic 95 % intervals from the standard error of log EC50. ` +
        `${each}. ` +
        (pairs.length ? `EC50 values were compared by the extra sum-of-squares F test (curves fitted with one shared log EC50 against curves fitted separately${pairs.length > 1 ? '; p values not corrected for the number of comparisons' : ''}): ${pairs.map(comparisonText).join('; ')}. ` : '') +
        'Curves were fitted in BioSketch, which gives the results of R 4.4 (nls).',
    )
  }
  const related = node.corr ? all.filter((s) => s.corr) : []
  if (node.corr && related.length) {
    const plain = (s: Series): string => corrText(s.corr!, node.corr!).replace(/\*/g, '').replace('_{s}', 's')
    const each = related.map((s) => `${related.length > 1 || s.name.trim() ? `${s.name}: ` : ''}${plain(s)}, n = ${s.corr!.n}`).join('; ')
    const logged = node.corr === 'pearson' && (node.xLog || node.yLog) ? ` It was worked out on the values as plotted (logarithms on ${node.xLog && node.yLog ? 'both axes' : node.xLog ? 'the x axis' : 'the y axis'}).` : ''
    parts.push(
      node.corr === 'pearson'
        ? `Correlation is Pearson’s r, with a two-sided test of no correlation (t distribution, n − 2 degrees of freedom).${logged} ${each}. Worked out in BioSketch, which gives the results of R 4.4 (cor.test).`
        : `Correlation is Spearman’s rank correlation (rs), with a two-sided test of no correlation: ${related.every((s) => s.corr!.exact) ? 'exact p values' : related.some((s) => s.corr!.exact) ? 'exact p values for up to nine points without ties, the t approximation otherwise' : 'p values from the t approximation'}. ${each}. Worked out in BioSketch, which gives the results of R 4.4 (cor.test, method "spearman"${related.every((s) => s.corr!.exact) ? '' : ', exact = FALSE'}).`,
    )
  }
  return parts.length ? parts.join(' ') : null
}

/** An axis for scattered values: it starts at zero when the smallest value is near zero, otherwise near the data. */
function scatterAxis(values: number[], opts: { min?: number; max?: number; log?: boolean; fromData?: boolean }): Axis {
  const lo = values.length ? Math.min(...values) : 0
  const hi = values.length ? Math.max(...values) : 1
  return axisFor(opts.log || opts.fromData || lo < 0 || lo > hi * 0.5 ? lo : 0, hi, opts)
}

interface NameToPlace {
  name: string
  /** The point, and how far from its middle a name must stay to leave the mark clear. */
  cx: number
  cy: number
  gap: number
  /** Size of the written name. */
  w: number
  h: number
}

export interface PlacedName {
  name: string
  /** Top-left corner of the name. */
  x: number
  y: number
  /** A thin line from the point to the name, when the name stands away from its point: x1, y1, x2, y2. */
  leader?: [number, number, number, number]
}

/**
 * Where the names of points go. Each name, in the order of the table, takes the free place that
 * covers the fewest points: right, left, above or below its point first, then the same and the
 * four corners at two further steps out, joined to the point by a thin line. A place is free when
 * it lies inside the plot and no name placed before covers it. Covering points costs more than
 * standing further away, so in a dense cloud a name moves out to where it can be read. When no
 * place is free the name goes right of its point, as it always did.
 */
export function placeNames(names: NameToPlace[], marks: { cx: number; cy: number; r: number }[], plot: Rect): PlacedName[] {
  // The marks in a grid of cells, so that counting the marks under a place stays quick for
  // thousands of points.
  const cell = 16
  const grid = new Map<string, { cx: number; cy: number; r: number }[]>()
  for (const m of marks) {
    const key = `${Math.floor(m.cx / cell)},${Math.floor(m.cy / cell)}`
    const list = grid.get(key)
    if (list) list.push(m)
    else grid.set(key, [m])
  }
  const covered = (b: Rect, own: { cx: number; cy: number }): number => {
    let n = 0
    for (let i = Math.floor((b.x - 8) / cell); i <= Math.floor((b.x + b.w + 8) / cell); i++) {
      for (let j = Math.floor((b.y - 8) / cell); j <= Math.floor((b.y + b.h + 8) / cell); j++) {
        for (const m of grid.get(`${i},${j}`) ?? []) {
          if (m.cx === own.cx && m.cy === own.cy) continue
          if (m.cx + m.r > b.x && m.cx - m.r < b.x + b.w && m.cy + m.r > b.y && m.cy - m.r < b.y + b.h) n++
        }
      }
    }
    return n
  }
  const taken: Rect[] = []
  const clash = (b: Rect): boolean => taken.some((t) => b.x < t.x + t.w && t.x < b.x + b.w && b.y < t.y + t.h && t.y < b.y + b.h)
  const inside = (b: Rect): boolean => b.x >= plot.x && b.x + b.w <= plot.x + plot.w && b.y >= plot.y && b.y + b.h <= plot.y + plot.h
  return names.map((p) => {
    const { w, h, gap } = p
    const places: (Rect & { far: number })[] = []
    for (let step = 0; step < 3; step++) {
      const d = gap + step * (h * 1.6)
      places.push(
        { x: p.cx + d, y: p.cy - h / 2, w, h, far: step },
        { x: p.cx - d - w, y: p.cy - h / 2, w, h, far: step },
        { x: p.cx - w / 2, y: p.cy - d - h, w, h, far: step },
        { x: p.cx - w / 2, y: p.cy + d, w, h, far: step },
      )
      if (step) {
        const c = d * 0.75
        places.push(
          { x: p.cx + c, y: p.cy - c - h, w, h, far: step },
          { x: p.cx - c - w, y: p.cy - c - h, w, h, far: step },
          { x: p.cx + c, y: p.cy + c, w, h, far: step },
          { x: p.cx - c - w, y: p.cy + c, w, h, far: step },
        )
      }
    }
    let best: (Rect & { far: number }) | null = null
    let bestCost = Infinity
    for (const b of places) {
      if (!inside(b) || clash(b)) continue
      // One covered point weighs as much as one step out.
      const cost = covered(b, p) + b.far * 1.01
      if (cost < bestCost) [best, bestCost] = [b, cost]
      if (cost === 0) break
    }
    const box = best ?? places.find(inside) ?? places[0]
    taken.push(box)
    const placedName: PlacedName = { name: p.name, x: box.x, y: box.y }
    if (best && best.far) {
      // From the edge of the mark to the nearest point of the name's box.
      const nx = Math.max(box.x, Math.min(p.cx, box.x + w))
      const ny = Math.max(box.y, Math.min(p.cy, box.y + h))
      const len = Math.hypot(nx - p.cx, ny - p.cy)
      const r = gap - 2
      if (len > r + 1) placedName.leader = [p.cx + ((nx - p.cx) / len) * r, p.cy + ((ny - p.cy) / len) * r, nx, ny]
    }
    return placedName
  })
}

/** A scatter chart: points on two numeric axes, with an optional straight line fitted to each series. */
/**
 * What another kind of chart drawn as a scatter chart adds (a standard curve): a curve through one
 * series, given as a function of x, and notes of its own. `hidden` words the note about points a
 * logarithmic axis cannot show.
 */
interface ScatterCurve {
  series: number
  at: (x: number) => number
  /** Where the curve starts and ends along x. Absent = the smallest and largest x of its series. */
  from?: number
  to?: number
}
interface ScatterExtra {
  /** A curve given by the kind of chart, through one series or through several. */
  curve?: ScatterCurve
  curves?: ScatterCurve[]
  /** Values the x axis must reach besides the points (where a curve starts). */
  xReach?: number[]
  notes?: string[]
  hidden?: (n: number) => string
  /** Draw the curves only, not a point for every value (melting curves: a reading every half degree). */
  noPoints?: boolean
  /** The x axis runs over the data without reaching back to zero (temperatures). */
  xFromData?: boolean
  /** Points marked on the curves (a melting temperature), drawn larger and ringed. */
  marks?: { series: number; x: number; y: number }[]
}

function scatterLayout(node: ChartNode, extra: ScatterExtra = {}): ChartDrawing {
  const out = empty()
  const { series, hidden } = scatterSeries(node)
  const all = series.flatMap((s) => s.points)
  // Reference lines are part of what the chart shows, so the axes reach them.
  const refs = all.length ? usableRefLines(node.refLines, 'scatter', !!node.xLog, !!node.yLog) : []
  const refAt = (axis: 'x' | 'y'): number[] => refs.filter((l) => l.axis === axis).map((l) => l.value)
  const xAxis = scatterAxis([...all.map((p) => p[0]), ...refAt('x'), ...(extra.xReach ?? []).filter((v) => usable(v) && (!node.xLog || v > 0))], { min: node.xMin, max: node.xMax, log: node.xLog, fromData: extra.xFromData })
  const given = [...(extra.curve ? [extra.curve] : []), ...(extra.curves ?? [])]

  // The two ends of every fitted line, as values: the line runs across the x values of its own
  // series only (it says nothing beyond them), and the value axis is made to hold it.
  const fitEnds = (s: Series): [number, number][] => {
    if (!node.fit || !s.fit || !s.points.length) return []
    const xs = s.points.map((p) => p[0])
    return [Math.min(...xs), Math.max(...xs)].map((vx) => {
      const fitted = s.fit!.intercept + s.fit!.slope * (node.xLog ? Math.log10(vx) : vx)
      return [vx, node.yLog ? 10 ** fitted : fitted] as [number, number]
    })
  }
  const dosed = fitsDose(node)
  const lineEnds = dosed ? series.map(() => []) : series.map(fitEnds).map((ends) => (ends.every(([, v]) => usable(v) && (!node.yLog || v > 0)) ? ends : []))
  // A dose-response curve as a run of points across the doses of its own series, evenly spaced on the logarithm of the dose.
  const curves: [number, number][][] = series.map((s, i) => {
    const mine = given.find((c) => c.series === i)
    if (mine && s.points.length) {
      // A curve given by the kind of chart: across the x values of its series (or where it says), evenly spaced as the axis is.
      const xs = s.points.map((p) => p[0]).filter((v) => !node.xLog || v > 0)
      if (!xs.length) return []
      const lo = mine.from !== undefined && usable(mine.from) && (!node.xLog || mine.from > 0) ? mine.from : Math.min(...xs)
      const hi = mine.to !== undefined && usable(mine.to) && mine.to > lo ? mine.to : Math.max(...xs)
      const steps = 120
      return Array.from({ length: steps + 1 }, (_, k) => (node.xLog ? 10 ** (Math.log10(lo) + ((Math.log10(hi) - Math.log10(lo)) * k) / steps) : lo + ((hi - lo) * k) / steps))
        .map((vx) => [vx, mine.at(vx)] as [number, number])
        .filter(([, v]) => usable(v) && (!node.yLog || v > 0))
    }
    if (!dosed || !s.dose) return []
    const doses = s.points.map((p) => p[0]).filter((v) => v > 0)
    const [from, to] = [Math.log10(Math.min(...doses)), Math.log10(Math.max(...doses))]
    const steps = 80
    return Array.from({ length: steps + 1 }, (_, k) => from + ((to - from) * k) / steps)
      .map((lx) => [10 ** lx, doseResponseAt(s.dose!, lx)] as [number, number])
      .filter(([, v]) => usable(v) && (!node.yLog || v > 0))
  })
  const yAxis = scatterAxis([...all.map((p) => p[1]), ...lineEnds.flat().map((p) => p[1]), ...curves.flat().map((p) => p[1]), ...refAt('y')], { min: node.yMin, max: node.yMax, log: node.yLog })

  out.notes = sharedNotes(node, [{ axis: yAxis, name: 'y axis' }, { axis: xAxis, name: 'x axis' }])
  if (dosed) {
    const none = series.filter((s) => s.points.length && !s.dose).map((s) => s.name || 'the points')
    if (none.length) out.notes.push(`No dose-response curve could be fitted to ${listed(none)}: a curve needs at least five points at four doses above zero, and a response that settles on a plateau at both ends.`)
    const noDose = series.reduce((a, s) => a + s.noDose, 0)
    if (noDose) out.notes.push(`${noDose} ${noDose === 1 ? 'point has' : 'points have'} a dose of zero or below and ${noDose === 1 ? 'is' : 'are'} left out of the curve, which runs along the logarithm of the dose.`)
    const beyond = series.filter((s) => {
      if (!s.dose) return false
      const doses = s.points.map((p) => p[0]).filter((v) => v > 0)
      return s.dose.logEc50 < Math.log10(Math.min(...doses)) || s.dose.logEc50 > Math.log10(Math.max(...doses))
    })
    if (beyond.length) out.notes.push(`The ${beyond.some((s) => s.dose!.hill < 0) ? 'IC50' : 'EC50'} of ${listed(beyond.map((s) => s.name || 'the curve'))} lies outside the doses that were tested: it is an estimate beyond the data.`)
    if (!node.xLog && series.some((s) => s.dose)) out.notes.push('A dose-response curve is usually shown on a logarithmic x axis: write “log x axis” in the box above, or tick it under the x axis.')
  }
  out.notes.push(...(extra.notes ?? []))
  if (hidden) out.notes.push(extra.hidden ? extra.hidden(hidden) : `${hidden} ${hidden === 1 ? 'point is' : 'points are'} zero or negative on a logarithmic axis: ${hidden === 1 ? 'it' : 'they'} cannot be shown, and the fitted line is worked out without ${hidden === 1 ? 'it' : 'them'}.`)

  // The last number along the bottom is centred under the end of the axis: keep room for half of it.
  const fs = node.fontSize ?? CHART_FONT
  const widest = Math.max(...xAxis.ticks.map((t) => textWidth(t.label, fs)))
  const f = frame(node, out, yAxis, series.length > 1 ? series.map((s) => ({ name: s.name, colour: s.colour, shape: s.shape ?? ('circle' as const) })) : [], Math.max(fs, widest / 2 + 2), () => 1)
  AXES.set(out, { ...AXES.get(out), x: [xAxis.min, xAxis.max] })
  const { words, rule, px, py, pw, ph } = f
  const x = (v: number): number => px + xAxis.at(v) * pw
  const y = (v: number): number => py + (1 - yAxis.at(v)) * ph
  const dot = Math.max(2.2, fs * 0.26)

  refs.forEach((l, i) => {
    nowPart(out, { what: 'refLine', at: i })
    const axis = l.axis === 'x' ? xAxis : yAxis
    const inside = axis.at(l.value) >= 0 && axis.at(l.value) <= 1
    if (l.axis === 'x') {
      out.dashes.push({ x1: r1(x(l.value)), y1: r1(py), x2: r1(x(l.value)), y2: r1(py + ph), ...(l.dash ? { style: l.dash } : {}) })
      if (l.label && inside) out.texts.push(words(l.label, x(l.value) + 4, py + 1, { align: 'left' }))
    } else {
      out.dashes.push({ x1: r1(px), y1: r1(y(l.value)), x2: r1(px + pw), y2: r1(y(l.value)), ...(l.dash ? { style: l.dash } : {}) })
      if (l.label && inside) out.texts.push(words(l.label, px + pw - 3, y(l.value) - fs * 1.25 - 1, { align: 'right' }))
    }
  })

  // The place of each series in the chart's table.
  const places = drawnGroups(node).map((c) => c.index)
  series.forEach((s, i) => {
    nowPart(out, { what: 'fit', at: i })
    // The 95 % confidence band of the fitted line, under the line and the points.
    if (node.band && s.fit && lineEnds[i].length === 2) {
      const [from, to] = [lineEnds[i][0][0], lineEnds[i][1][0]].map((vx) => (node.xLog ? Math.log10(vx) : vx))
      const steps = 40
      const edge: { px: number; hi: number; lo: number }[] = []
      for (let k = 0; k <= steps; k++) {
        const at = from + ((to - from) * k) / steps
        const reach = lineBand(s.fit, at)
        if (reach === null) break
        const mid = s.fit.intercept + s.fit.slope * at
        const [hi, lo] = [mid + reach, mid - reach].map((v) => y(node.yLog ? 10 ** v : v))
        edge.push({ px: x(node.xLog ? 10 ** at : at), hi, lo })
      }
      if (edge.length === steps + 1 && edge.every((e) => [e.px, e.hi, e.lo].every((v) => Number.isFinite(v)))) {
        const upper = edge.map((e) => `${r1(e.px)} ${r1(e.hi)}`)
        const lower = edge.map((e) => `${r1(e.px)} ${r1(e.lo)}`).reverse()
        out.paths.push({ d: `M${[...upper, ...lower].join('L')}Z`, stroke: 'none', width: 0, fill: s.colour, opacity: 0.18 })
      }
    }
    const ends = lineEnds[i].map(([vx, vy]) => [x(vx), y(vy)])
    if (ends.length === 2 && ends.flat().every((v) => Number.isFinite(v))) out.paths.push({ d: `M${ends.map((e) => `${r1(e[0])} ${r1(e[1])}`).join('L')}`, stroke: s.colour, width: 2 })
    const curve = curves[i].map(([vx, vy]) => [x(vx), y(vy)]).filter((p) => p.every((v) => Number.isFinite(v)))
    if (curve.length > 1) out.paths.push({ d: `M${curve.map((p) => `${r1(p[0])} ${r1(p[1])}`).join('L')}`, stroke: s.colour, width: 2 })
    nowPart(out, { what: 'group', at: places[i] ?? i })
    for (const m of extra.marks ?? []) {
      if (m.series !== i) continue
      const [cx, cy] = [x(m.x), y(m.y)]
      if (Number.isFinite(cx) && Number.isFinite(cy)) out.circles.push({ cx: r1(cx), cy: r1(cy), r: r1(dot * 1.6), fill: s.colour, ring: true })
    }
    if (!extra.noPoints) for (const [vx, vy] of s.points) out.circles.push({ cx: r1(x(vx)), cy: r1(y(vy)), r: r1(dot * s.scale), fill: s.colour, ...(s.shape ? { shape: s.shape } : {}), ...s.solid })
  })

  // The correlation of each series, written in an upper corner of the plot: the left one, unless the legend stands there.
  nowPart(out, { what: 'result' })
  if (node.corr) {
    const told = series.filter((s) => s.corr)
    const atRight = node.legend === 'insideLeft'
    told.forEach((s, i) => {
      const text = `${told.length > 1 || series.length > 1 ? `${s.name}: ` : ''}${corrText(s.corr!, node.corr!)}`
      out.texts.push(words(text, atRight ? px + pw - 6 : px + 8, py + 4 + i * fs * 1.3, { align: atRight ? 'right' : 'left', ...(told.length > 1 ? { fill: s.colour } : {}) }))
    })
    const none = series.filter((s) => s.points.length && !s.corr).map((s) => s.name || 'the points')
    if (none.length) out.notes.push(`No correlation can be worked out for ${listed(none)}: it needs at least three points, and both x and y must vary.`)
  }

  // Names of points, a little smaller than the rest of the lettering. Points outside the range
  // that was set get none.
  const candidates = series.flatMap((s) => s.points.map(([vx, vy], k) => ({ name: s.names[k], series: s.name, cx: x(vx), cy: y(vy), gap: dot * s.scale + 2 }))).filter((p) => p.name && p.cx >= px - 0.5 && p.cx <= px + pw + 0.5 && p.cy >= py - 0.5 && p.cy <= py + ph + 0.5)
  const setting = usablePointNames(node.pointNames)
  const show = setting?.show ?? 'table'
  if (show === 'table' && candidates.length > MAX_POINT_LABELS) out.notes.push(`${candidates.length} points have a name; only the first ${MAX_POINT_LABELS} are written on the chart. Choose “Top” under “Names of points” to write the names of the most striking ones instead.`)
  if (show !== 'none' && !candidates.length && (show === 'top' || setting?.always?.length)) out.notes.push('No point has a name: put a column of names (genes, samples) before the x values in the table.')
  // Where x = 0 is drawn: the middle of a volcano plot. Off the axis, its nearer edge.
  const zero = xAxis.at(node.xLog ? 1 : 0)
  const zeroX = px + Math.min(1, Math.max(0, Number.isFinite(zero) ? zero : 0)) * pw
  const named = pickNames(candidates, setting, zeroX, py + ph, { w: pw, h: ph }) as typeof candidates
  if (setting?.always?.length) {
    const found = new Set(candidates.map((p) => p.name.toLowerCase()))
    const missing = setting.always.filter((n) => !found.has(n.toLowerCase()))
    if (missing.length && candidates.length) out.notes.push(`Not found among the named points: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ` and ${missing.length - 8} more` : ''}.`)
  }
  const small = Math.max(6, fs * 0.85)
  const placed = placeNames(
    named.map((p) => ({ ...p, w: measureText(words(p.name, 0, 0, { fontSize: small })).w, h: small * 1.25 })),
    out.circles,
    { x: px, y: py, w: pw, h: ph },
  )
  nowPart(out, { what: 'pointName' })
  for (const p of placed) {
    if (p.leader) out.paths.push({ d: `M${r1(p.leader[0])} ${r1(p.leader[1])}L${r1(p.leader[2])} ${r1(p.leader[3])}`, stroke: '#6b7280', width: 0.75 })
    out.texts.push(words(p.name, p.x, p.y, { align: 'left', fontSize: small }))
  }

  drawValueAxis(f, yAxis, y, out, py)
  nowPart(out, { what: 'xAxis' })
  rule(px, py + ph, px + pw, py + ph)
  // Numbers along the bottom that would run into the one before are left out.
  let edge = -Infinity
  for (const tick of xAxis.ticks) {
    const at = x(tick.value)
    const half = textWidth(tick.label, fs) / 2
    if (!Number.isFinite(at) || at - half < edge + 4) continue
    edge = at + half
    rule(at, py + ph, at, py + ph + 4)
    out.texts.push(words(tick.label, at, py + ph + 6))
  }
  nowPart(out, null)
  if (!all.length) out.texts.push(words('Paste your numbers in the panel', px + pw / 2, py + ph / 2 - fs, { fill: '#8a93a3', italic: true }))
  return out
}

/**
 * Everything a chart is made of, in the chart's own box (its top-left corner is 0, 0).
 * The value axis of bars, dots, boxes, violins and lines includes zero unless it is logarithmic
 * or the scientist set its ends.
 */
/**
 * A pie: the share of each group in the whole. The size of a slice is the mean of its group's
 * values (one value per group is the usual table); slices run clockwise from the top in the order
 * of the table. A table with categories and series gives one pie per category, with the series as
 * slices. A mean of zero or below has no share and gets no slice.
 */
function pieLayout(node: ChartNode): ChartDrawing {
  const out = empty()
  const drawn = drawnGroups(node)
  const grouped = isGrouped(node)
  const cats = grouped ? unique(drawn.map((c) => c.group.category ?? '')) : ['']
  const series = chartSeries(node)
  const cells = drawn
    .filter((c) => c.group.values.length)
    .map(({ group, index }) => ({ category: group.category ?? '', index, value: stats(group.values).mean, place: series.findIndex((x) => x.groups.includes(index)) }))
  const live = cells.filter((c) => c.value > 0 && usable(c.value))
  const shown = series.filter((_, i) => live.some((c) => c.place === i))
  // No axes: the frame only places the title and the legend. A legend inside the plot would lie on the pie.
  const blank: Axis = { min: 0, max: 1, log: false, ticks: [{ value: 0, label: '' }], at: (v) => v, ignored: false }
  const plain: ChartNode = { ...node, yLabel: undefined, xLabel: undefined, yMin: undefined, yMax: undefined, yLog: undefined, xMin: undefined, xMax: undefined, xLog: undefined, legend: node.legend === 'inside' || node.legend === 'insideLeft' ? undefined : node.legend }
  const f = frame(plain, out, blank, shown.map((x) => ({ name: x.name, colour: x.colour })), 8, () => 0)
  const { fs, words, px, py, pw, ph } = f
  out.clipped = false
  if (cells.length - live.length) {
    const none = cells.length - live.length
    out.notes.push(`${none === 1 ? 'One group has' : `${none} groups have`} a mean of zero or below and no slice: a pie shows shares of a whole.`)
  }
  if (!live.length) {
    out.texts.push(words('Paste your numbers in the panel', px + pw / 2, py + ph / 2 - fs, { fill: '#8a93a3', italic: true }))
    return out
  }

  // As many pies side by side and above each other as gives the largest ones.
  const pies = cats.filter((cat) => live.some((c) => c.category === cat))
  const nameLine = grouped ? fs * 1.6 : 0
  let cols = 1
  let radius = 0
  for (let k = 1; k <= pies.length; k++) {
    const r = Math.min(pw / k, ph / Math.ceil(pies.length / k) - nameLine) / 2 - 3
    if (r > radius) [cols, radius] = [k, r]
  }
  radius = Math.max(4, radius)
  const cellW = pw / cols
  const cellH = ph / Math.ceil(pies.length / cols)
  const lh = fs * 1.25
  pies.forEach((cat, i) => {
    const cx = px + cellW * ((i % cols) + 0.5)
    const cy = py + cellH * Math.floor(i / cols) + (cellH - nameLine) / 2
    const slices = live.filter((c) => c.category === cat).sort((a, b) => a.place - b.place)
    const whole = slices.reduce((a, c) => a + c.value, 0)
    let from = -Math.PI / 2
    for (const slice of slices) {
      nowPart(out, { what: 'group', at: slice.index })
      const share = slice.value / whole
      const to = from + share * 2 * Math.PI
      const colour = series[slice.place].colour
      const at = (angle: number, r: number): [number, number] => [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
      if (share > 0.99999) out.circles.push({ cx: r1(cx), cy: r1(cy), r: r1(radius), fill: colour })
      else {
        const [a, b] = [at(from, radius), at(to, radius)]
        out.paths.push({ d: `M${r1(cx)} ${r1(cy)}L${r1(a[0])} ${r1(a[1])}A${r1(radius)} ${r1(radius)} 0 ${share > 0.5 ? 1 : 0} 1 ${r1(b[0])} ${r1(b[1])}Z`, stroke: '#ffffff', width: 1.2, fill: colour })
      }
      // The number of a slice stands inside it, where the slice is wide enough for it.
      if (node.pieLabels !== 'none') {
        const text = node.pieLabels === 'value' ? valueText(slice.value) : `${valueText(share * 100, 0)} %`
        const out2 = share > 0.99999 ? 0 : radius * 0.64
        const room = share > 0.99999 ? radius * 2 : 2 * out2 * Math.sin(Math.min(Math.PI, to - from) / 2)
        if (f.widthOf(text) + 4 <= room && lh <= radius * 0.6) {
          const [x, y] = at((from + to) / 2, out2)
          out.texts.push({ ...words(text, x, y - lh / 2, { fill: readableOn(colour) }), part: { what: 'number' } })
        }
      }
      from = to
    }
    nowPart(out, null)
    if (grouped) out.texts.push({ ...words(fitName(cat, cellW * 0.94, fs), cx, cy + radius + 4), part: { what: 'category', at: cats.indexOf(cat) } })
  })
  return out
}

// ---------- survival curves ----------

/** True when the chart draws survival curves from a table of times and events. */
export const isSurvival = (node: ChartNode): boolean => node.kind === 'scatter' && !!node.survival

export interface SurvivalGroup {
  name: string
  colour: string
  subjects: Subject[]
  km: KaplanMeier
  /** Rows left out: a time below zero, or something other than 1 (the event) or 0 (left without it). */
  leftOut: number
}

export interface SurvivalSummary {
  groups: SurvivalGroup[]
  /** The log-rank test over all groups; null with fewer than two groups or no events. */
  test: { chi2: number; df: number; p: number } | null
  /** Every pair of groups by a log-rank test of its own, corrected by Holm; empty with two groups. */
  pairs: { a: string; b: string; p: number | null }[]
  /** The hazard of every group after the first against the first (Cox's model); empty with fewer than two groups. */
  hazards: { name: string; against: string; ratio: HazardRatio | null }[]
}

const survivals = new WeakMap<ChartGroup[], Map<string, SurvivalSummary>>()

/** The survival curves of a chart with their test; worked out once per table. */
export function survivalOf(node: ChartNode): SurvivalSummary {
  const key = `${node.palette ?? ''}|${node.groups.map((g) => `${g.name}\u0001${g.color ?? ''}`).join('\u0002')}`
  let known = survivals.get(node.groups)
  if (!known) survivals.set(node.groups, (known = new Map()))
  const done = known.get(key)
  if (done) return done
  const groups: SurvivalGroup[] = drawnGroups(node).map((c, i) => {
    const rows = c.group.values.map((v, k) => ({ time: c.group.xs?.[k] ?? NaN, v }))
    const subjects = rows.filter((r) => Number.isFinite(r.time) && r.time >= 0 && (r.v === 0 || r.v === 1)).map((r) => ({ time: r.time, event: r.v === 1 }))
    return { name: c.group.name, colour: groupColour(c.group, i, node.palette), subjects, km: kaplanMeier(subjects), leftOut: rows.length - subjects.length }
  })
  const live = groups.filter((g) => g.subjects.length)
  const test = logRank(live.map((g) => g.subjects))
  const pairs: SurvivalSummary['pairs'] = []
  if (live.length > 2) {
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) pairs.push({ a: live[i].name, b: live[j].name, p: logRank([live[i].subjects, live[j].subjects])?.p ?? null })
    const known2 = pairs.flatMap((x, i) => (x.p === null ? [] : [{ v: x.p, i }]))
    holm(known2.map((x) => x.v)).forEach((v, k) => (pairs[known2[k].i].p = v))
  }
  const ratios = live.length > 1 ? hazardRatios(live.map((g) => g.subjects)) : null
  const hazards = ratios ? live.slice(1).map((g, i) => ({ name: g.name, against: live[0].name, ratio: ratios[i] })) : []
  const out = { groups, test: test ? { chi2: test.chi2, df: test.df, p: test.p } : null, pairs, hazards }
  known.set(key, out)
  return out
}

/** A hazard ratio in words: "0.208 (95 % interval 0.0516 to 0.84), p = 0.0275". */
export const hazardText = (h: HazardRatio): string => `${sig3(h.ratio)} (95 % interval ${sig3(h.lower)} to ${sig3(h.upper)}), ${pText(h.p)}`

/** The log-rank test in words: "log-rank test, χ² = 4.44, df = 1, p = 0.0351". */
export const logRankText = (t: { chi2: number; df: number; p: number }): string => `χ² = ${sig3(t.chi2)}, df = ${t.df}, ${pText(t.p)}`

/** One group's survival in words: "n = 10, 7 events, median 25". */
export const survivalText = (g: SurvivalGroup): string => `n = ${g.km.n}, ${g.km.events} ${g.km.events === 1 ? 'event' : 'events'}, median ${g.km.median === null ? 'not reached' : sig3(g.km.median)}`

/** What a methods section can say about a chart's survival curves; null when it draws none. */
export function survivalMethodsText(node: ChartNode): string | null {
  if (!isSurvival(node)) return null
  const { groups, test, pairs, hazards } = survivalOf(node)
  const live = groups.filter((g) => g.subjects.length)
  if (!live.length) return null
  const told = hazards.filter((h) => h.ratio)
  return [
    `Survival was estimated by the Kaplan–Meier method; ticks on the curves mark subjects that left the study without the event (censored)${node.band ? ', and the shaded bands are 95 % confidence intervals (log transformation, Greenwood’s variance)' : ''}.`,
    `${live.map((g) => `${g.name ? `${g.name}: ` : ''}${survivalText(g)}`).join('; ')}.`,
    node.atRisk ? 'The number of subjects at risk (still followed, without the event) is given under the time axis.' : '',
    test ? `Groups were compared with the log-rank test: ${logRankText(test)}.` : '',
    pairs.length ? `Pairs of groups were compared by log-rank tests with Holm’s correction for multiple comparisons: ${pairs.map((x) => `${x.a} and ${x.b}, ${x.p === null ? 'not defined' : pText(x.p)}`).join('; ')}.` : '',
    told.length ? `Hazard ratios against ${told[0].against} came from a Cox proportional hazards model (Efron’s method for tied times, Wald intervals and tests): ${told.map((h) => `${h.name}, ${hazardText(h.ratio!)}`).join('; ')}.` : '',
    `Worked out in BioSketch, which gives the results of the survival package of R (survfit, survdiff${told.length ? ', coxph' : ''}).`,
  ]
    .filter(Boolean)
    .join(' ')
}

/**
 * Survival curves: time along the bottom, the share still without the event (in per cent) up the
 * side. Each curve starts at 100 %, steps down at every time with an event, and ends at the last
 * time its group was followed; a tick marks every subject that left without the event.
 */
function survivalLayout(node: ChartNode): ChartDrawing {
  const out = empty()
  const { groups, test } = survivalOf(node)
  const live = groups.filter((g) => g.subjects.length)
  const last = Math.max(0, ...live.flatMap((g) => g.subjects.map((s) => s.time)))
  const xAxis = axisFor(0, last > 0 ? last : 10, { min: node.xMin, max: node.xMax })
  const yAxis = axisFor(0, 100, {})
  out.notes = sharedNotes({ ...node, yMin: undefined, yMax: undefined, yLog: undefined }, [{ axis: xAxis, name: 'time axis' }])
  const leftOut = groups.reduce((a, g) => a + g.leftOut, 0)
  if (leftOut) out.notes.push(`${leftOut} ${leftOut === 1 ? 'row is' : 'rows are'} left out: a survival table has the time in the first column and, in the column of its group, 1 for the event or 0 for a subject that left the study without it.`)
  const fs = node.fontSize ?? CHART_FONT
  const widest = Math.max(...xAxis.ticks.map((t) => textWidth(t.label, fs)))
  // The table of the number at risk stands under everything else: a heading and a row per group.
  const table = node.atRisk && live.length ? fs * (0.8 + 1.35 * (live.length + 1)) : 0
  const plain: ChartNode = { ...node, h: node.h - table, yLabel: node.yLabel ?? 'Survival (%)', yMin: undefined, yMax: undefined, yLog: undefined, xLog: undefined }
  // The names of the groups stand left of the table, so the plot moves right to make room for them (up to two fifths of the chart).
  // The numbers stand centred on the ticks, so the first one reaches half its width to the left of the plot.
  const halfCount = textWidth(String(Math.max(0, ...live.map((g) => g.subjects.length))), fs) / 2
  const names = table ? Math.min(node.w * 0.4, Math.max(...live.map((g) => measureText({ id: '', type: 'text', x: 0, y: 0, text: g.name, fontSize: fs, fill: INK, align: 'right', rotation: 0, bold: true }).w)) + 12 + halfCount) : 0
  const f = frame(plain, out, yAxis, live.length > 1 ? live.map((g) => ({ name: g.name, colour: g.colour })) : [], Math.max(fs, widest / 2 + 2), () => 1, names)
  const { words, rule, px, py, pw, ph } = f
  // Only a range set for the time axis cuts anything off.
  out.clipped = node.xMin !== undefined || node.xMax !== undefined
  const x = (v: number): number => px + xAxis.at(v) * pw
  const y = (v: number): number => py + (1 - yAxis.at(v)) * ph
  const tick = Math.max(3, fs * 0.3)
  for (const g of live) {
    nowPart(out, { what: 'group', at: node.groups.findIndex((own) => own.name === g.name && own.values.length > 0) })
    // The 95 % confidence band of the curve: steps like the curve itself, as far as there is an interval.
    if (node.band) {
      const upper: string[] = [`${r1(x(0))} ${r1(y(100))}`]
      const lower: string[] = [`${r1(x(0))} ${r1(y(100))}`]
      let [hi, lo] = [100, 100]
      for (const step of g.km.steps) {
        if (step.lower === null || step.upper === null) break
        upper.push(`${r1(x(step.time))} ${r1(y(hi))}`)
        lower.push(`${r1(x(step.time))} ${r1(y(lo))}`)
        if (step.events) {
          ;[hi, lo] = [step.upper * 100, step.lower * 100]
          upper.push(`${r1(x(step.time))} ${r1(y(hi))}`)
          lower.push(`${r1(x(step.time))} ${r1(y(lo))}`)
        }
      }
      if (upper.length > 2) out.paths.push({ d: `M${[...upper, ...lower.reverse()].join('L')}Z`, stroke: 'none', width: 0, fill: g.colour, opacity: 0.16 })
    }
    let d = `M${r1(x(0))} ${r1(y(100))}`
    let share = 100
    const marks: string[] = []
    for (const step of g.km.steps) {
      d += `H${r1(x(step.time))}`
      if (step.events) {
        share = step.survival * 100
        d += `V${r1(y(share))}`
      }
      if (step.censored) marks.push(`M${r1(x(step.time))} ${r1(y(share) - tick)}V${r1(y(share) + tick)}`)
    }
    out.paths.push({ d, stroke: g.colour, width: 2 })
    if (marks.length) out.paths.push({ d: marks.join(''), stroke: g.colour, width: 1.4 })
  }
  nowPart(out, { what: 'result' })
  if (node.logRank && test) out.texts.push(words(`Log-rank ${pText(test.p).replace(/^p/, '*p*')}`, px + 8, py + ph - fs * 1.25 - 6, { align: 'left' }))
  if (node.logRank && !test && live.length) out.notes.push('The log-rank test needs at least two groups, and an event while more than one group was still followed.')

  drawValueAxis(f, yAxis, y, out, py)
  nowPart(out, { what: 'xAxis' })
  rule(px, py + ph, px + pw, py + ph)
  let edge = -Infinity
  const shown: number[] = []
  for (const step of xAxis.ticks) {
    const at = x(step.value)
    const half = textWidth(step.label, fs) / 2
    if (!Number.isFinite(at) || at - half < edge + 4) continue
    edge = at + half
    shown.push(step.value)
    rule(at, py + ph, at, py + ph + 4)
    out.texts.push(words(step.label, at, py + ph + 6))
  }
  if (table) {
    // Under the time axis, at its numbers: how many of each group are still followed then.
    nowPart(out, { what: 'atRisk' })
    let top = node.h - table + fs * 0.8
    out.texts.push(words('Number at risk', 2, top, { align: 'left', bold: true }))
    for (const g of live) {
      top += fs * 1.35
      out.texts.push(words(cutToFit(g.name, Math.max(fs, px - 9 - halfCount), fs), px - 7 - halfCount, top, { align: 'right', fill: g.colour, bold: true }))
      for (const t of shown) out.texts.push(words(String(atRiskAt(g.subjects, t)), x(t), top))
    }
  }
  nowPart(out, null)
  if (!live.length) out.texts.push(words('Paste times and events in the panel', px + pw / 2, py + ph / 2 - fs, { fill: '#8a93a3', italic: true }))
  return out
}

// ---------- heat maps ----------

/** The colour of a cell the table has no number for. */
const NO_VALUE = '#eef0f3'

/** `text` cut to fit `room`, with an ellipsis in place of what was cut. */
function cutToFit(text: string, room: number, fs: number): string {
  if (textWidth(text, fs) <= room) return text
  let keep = text.length
  while (keep > 1 && textWidth(`${text.slice(0, keep)}…`, fs) > room) keep--
  return `${text.slice(0, keep)}…`
}

/**
 * A heat map: one cell for every number of the table, coloured by its value (see heatmap.ts for
 * what the colours stand for). Row names at the left, column names below, the colour scale with
 * its ends at the right.
 */
function heatmapLayout(node: ChartNode): ChartDrawing {
  const out = empty()
  const m = heatMatrix(node)
  out.notes = [...m.notes]
  const fs = node.fontSize ?? CHART_FONT
  const small = Math.max(6, r1(fs * 0.85))
  const words = (text: string, x: number, top: number, extra: Partial<TextNode> & Tagged = {}): TextNode & Tagged => ({ id: node.id, type: 'text', x: r1(x), y: r1(top), text, fontSize: fs, fill: INK, align: 'center', rotation: 0, ...extra })
  const [nRows, nCols] = [m.cells.length, m.columns.length]
  if (node.title) out.texts.push(words(node.title, node.w / 2, 2, { bold: true, part: { what: 'title' } }))
  if (!nRows || !nCols) {
    out.texts.push(words('Paste a table of numbers in the panel', node.w / 2, node.h / 2 - fs, { fill: '#8a93a3', italic: true }))
    return out
  }

  // What the ends and the middle of the scale are called: on a logarithmic scale, the values themselves.
  const scaleText = (v: number): string => (m.unit === 'log' ? valueText(10 ** v) : valueText(Number(v.toPrecision(3))))
  const ends = [scaleText(m.hi), scaleText((m.lo + m.hi) / 2), scaleText(m.lo)]
  const showScale = node.legend !== 'none'
  const bar = 12
  const scaleWidth = showScale ? 10 + bar + 5 + Math.max(...ends.map((t) => textWidth(t, small))) + 4 : 4

  // Room around the cells: title on top, row names at the left, column names below, the scale at the right.
  // A tree of the rows stands at the left of the cells, and the names of the rows then at their right;
  // a tree of the columns stands over the cells.
  const treeW = m.rowTree ? Math.max(20, Math.min(64, node.w * 0.12)) : 0
  const treeH = m.colTree ? Math.max(18, Math.min(54, node.h * 0.12)) : 0
  const top = (node.title ? fs * 2 : fs * 0.6) + treeH
  const named = m.rows.some(Boolean)
  const nameRoom = named ? Math.min(node.w * 0.35, Math.max(...m.rows.map((n) => textWidth(n, small)))) : 0
  const namesRight = !!m.rowTree
  const px = (node.yLabel ? fs * 1.7 : 2) + (namesRight ? treeW + 3 : nameRoom + (named ? 7 : 2))
  const rightNames = namesRight && named ? nameRoom + 7 : 0
  const pw = Math.max(10, node.w - px - scaleWidth - rightNames)
  const cw = pw / nCols
  // A column's name stands under it on one line where it fits, otherwise it is turned upright.
  const widestColumn = Math.max(...m.columns.map((n) => textWidth(n, small)))
  const upright = widestColumn > cw - 4
  const columnRoom = upright ? Math.min(node.h * 0.3, widestColumn) + 6 : small * 1.25 + 5
  const py = top
  const ph = Math.max(10, node.h - top - columnRoom - (node.xLabel ? fs * 1.5 : 0) - 3)
  const ch = ph / nRows
  out.clip = { x: r1(px), y: r1(py), w: r1(pw), h: r1(ph) }

  // Cells large enough are parted by a white line; small ones touch, with an edge of their own colour so that no gap shows.
  const parted = cw >= 8 && ch >= 8
  const cellsPart: ChartPart = { what: 'cells' }
  // The place of each column in the chart's table (clustering can have put the columns in another order).
  const tablePlaces = drawnGroups(node).map((c) => c.index)
  const columnPlaces = m.colOrder.map((c) => tablePlaces[c] ?? c)

  // The trees: every joining a bracket between the two things it joins, as far from the cells as the distance at which it was made.
  const treePart: ChartPart = { what: 'cells' }
  if (m.rowTree) {
    for (const l of treeLines(m.rowTree)) out.rules.push({ x1: r1(px - 2 - l.from[1] * (treeW - 4)), y1: r1(py + l.from[0] * ch), x2: r1(px - 2 - l.to[1] * (treeW - 4)), y2: r1(py + l.to[0] * ch), width: 0.8, part: treePart })
  }
  if (m.colTree) {
    for (const l of treeLines(m.colTree)) out.rules.push({ x1: r1(px + l.from[0] * cw), y1: r1(py - 2 - l.from[1] * (treeH - 4)), x2: r1(px + l.to[0] * cw), y2: r1(py - 2 - l.to[1] * (treeH - 4)), width: 0.8, part: treePart })
  }
  const numberWidth = node.heatNumbers ? Math.max(0, ...m.shown.flat().map((v) => (v === null ? 0 : textWidth(cellText(m.unit, v), small)))) : 0
  const numbersFit = node.heatNumbers && numberWidth + 4 <= cw && small * 1.2 <= ch
  if (node.heatNumbers && !numbersFit) out.notes.push('The numbers do not fit in the cells: make the chart larger or its text smaller.')
  for (let r = 0; r < nRows; r++) {
    for (let c = 0; c < nCols; c++) {
      const v = m.cells[r][c]
      const fill = v === null ? NO_VALUE : cellColour(m, v)
      const [x, y] = [px + c * cw, py + r * ch]
      out.rects.push({ x: r1(x), y: r1(y), w: r1(cw), h: r1(ch), fill, edge: parted ? '#ffffff' : fill, part: cellsPart })
      const written = m.shown[r][c]
      if (numbersFit && written !== null) out.texts.push(words(cellText(m.unit, written), x + cw / 2, y + ch / 2 - (small * 1.25) / 2, { fontSize: small, fill: v === null ? INK : readableOn(fill), part: { what: 'number' } }))
    }
  }

  if (named) {
    const size = Math.min(small, r1(ch * 0.9))
    if (size >= 5)
      m.rows.forEach((name, r) => name && out.texts.push(words(cutToFit(name, nameRoom, size), namesRight ? px + pw + 5 : px - 5, py + r * ch + ch / 2 - (size * 1.25) / 2, { align: namesRight ? 'left' : 'right', fontSize: size, part: { what: 'yAxis' } })))
    else out.notes.push('The rows are too thin for their names: make the chart taller, or show fewer rows.')
  }
  const columnSize = upright ? Math.min(small, r1(cw * 0.9)) : small
  if (columnSize >= 5) {
    m.columns.forEach((name, c) => {
      const cx = px + (c + 0.5) * cw
      const column: ChartPart = node.corr ? cellsPart : { what: 'group', at: columnPlaces[c] ?? c }
      if (!upright) return out.texts.push(words(name, cx, py + ph + 4, { fontSize: small, part: column }))
      // Turned a quarter: the box of the words is as long as the room below the cells, and ends at the cells.
      const label = words(cutToFit(name, columnRoom - 6, columnSize), cx, 0, { fontSize: columnSize, rotation: -90, part: column })
      const box = measureText(label)
      out.texts.push({ ...label, y: r1(py + ph + 4 + box.w / 2 - box.h / 2) })
    })
  } else out.notes.push('The columns are too narrow for their names: make the chart wider.')
  if (node.yLabel) {
    const label = words(node.yLabel, fs * 0.9, 0, { rotation: -90, part: { what: 'yTitle' } })
    out.texts.push({ ...label, y: r1(py + ph / 2 - measureText(label).h / 2) })
  }
  if (node.xLabel) out.texts.push(words(node.xLabel, px + pw / 2, py + ph + columnRoom, { part: { what: 'xTitle' } }))

  if (showScale) {
    // The scale: a bar of even steps from the lowest colour at the bottom to the highest at the top, with its ends and its middle written beside it.
    const caption = m.unit === 'z' ? 'z-score' : m.unit === 'r' ? (node.corr === 'spearman' ? '*r*_{s}' : '*r*') : ''
    const bx = px + pw + 10 + rightNames
    const by = py + (caption ? small * 1.5 : 0)
    const bh = Math.max(20, Math.min(ph - (caption ? small * 1.5 : 0), fs * 9))
    const steps = 32
    const scale: ChartPart = { what: 'scale' }
    for (let i = 0; i < steps; i++) {
      const fill = heatColour(m.scale, (i + 0.5) / steps)
      out.rects.push({ x: r1(bx), y: r1(by + bh * (1 - (i + 1) / steps)), w: bar, h: r1(bh / steps), fill, edge: fill, part: scale })
    }
    const outline: [number, number, number, number][] = [[bx, by, bx + bar, by], [bx + bar, by, bx + bar, by + bh], [bx + bar, by + bh, bx, by + bh], [bx, by + bh, bx, by]]
    for (const [x1, y1, x2, y2] of outline) out.rules.push({ x1: r1(x1), y1: r1(y1), x2: r1(x2), y2: r1(y2), width: 0.8, part: scale })
    if (caption) out.texts.push(words(caption, bx, py - 1, { align: 'left', fontSize: small, part: scale }))
    const line = small * 1.25
    const at = [by - 1, by + bh / 2 - line / 2, by + bh - line + 1]
    ends.forEach((text, i) => (i !== 1 || bh >= line * 3.4) && out.texts.push(words(text, bx + bar + 5, at[i], { align: 'left', fontSize: small, part: scale })))
  }
  return out
}

/** The number of a cell as it is written: correlations and z-scores to two decimals, values as elsewhere in a chart. */
const cellText = (unit: 'value' | 'log' | 'z' | 'r', v: number): string => (unit === 'r' || unit === 'z' ? valueText(v, 2) : valueText(v))

// ---------- Venn diagrams ----------

/** Half the distance between the centres of two circles, as a share of their radius. */
const VENN_APART = 0.55

/**
 * A Venn diagram of two or three sets (see venn.ts for the counting): circles of one size, each in
 * the colour of its set and see-through, with the count of every region in it and the name of
 * every set, with its size, beside its circle. The circles are not sized by the counts.
 */
function vennLayout(node: ChartNode): ChartDrawing {
  const out = empty()
  const v = vennOf(node.groups)
  out.notes = [...v.notes]
  if (v.problem) out.notes.push(v.problem)
  const fs = node.fontSize ?? CHART_FONT
  const words = (text: string, x: number, top: number, extra: Partial<TextNode> & Tagged = {}): TextNode & Tagged => ({ id: node.id, type: 'text', x: r1(x), y: r1(top), text, fontSize: fs, fill: INK, align: 'center', rotation: 0, ...extra })
  if (node.title) out.texts.push(words(node.title, node.w / 2, 2, { bold: true, part: { what: 'title' } }))
  if (!v.sets.length || v.problem) {
    out.texts.push(words(v.problem ? 'These sizes do not fit together' : 'Paste one column of names for each set in the panel', node.w / 2, node.h / 2 - fs, { fill: '#8a93a3', italic: true }))
    return out
  }
  const n = v.sets.length
  const line = fs * 1.25
  const top = (node.title ? fs * 2 : fs * 0.6) + line + 4
  const roomW = node.w - 12
  const roomH = node.h - top - (n === 3 ? line + 6 : 4)
  // How wide and how high the circles are together, in radii.
  const wide = n === 1 ? 2 : 2 + 2 * VENN_APART
  const high = n === 3 ? 2 + VENN_APART * Math.sqrt(3) : 2
  const R = Math.max(6, Math.min(roomW / wide, roomH / high))
  const cx = node.w / 2
  const y0 = top + Math.max(0, (roomH - high * R) / 2)
  const apart = VENN_APART * R
  const centres: [number, number][] = n === 1 ? [[cx, y0 + R]] : n === 2 ? [[cx - apart, y0 + R], [cx + apart, y0 + R]] : [[cx - apart, y0 + R], [cx + apart, y0 + R], [cx, y0 + R + apart * Math.sqrt(3)]]
  out.clip = { x: r1(cx - (wide * R) / 2), y: r1(y0), w: r1(wide * R), h: r1(high * R) }
  // The colour a set has in the panel's list: by its place among the columns that hold something.
  const places = drawnGroups(node).map((c) => c.index)
  const colours = v.sets.map((s) => groupColour(node.groups[s.group], places.indexOf(s.group), node.palette))
  centres.forEach(([x, y], i) => out.circles.push({ cx: r1(x), cy: r1(y), r: r1(R), fill: colours[i], opacity: 0.4, part: { what: 'group', at: v.sets[i].group } }))
  centres.forEach(([x, y], i) => out.circles.push({ cx: r1(x), cy: r1(y), r: r1(R), fill: colours[i], ring: true, part: { what: 'group', at: v.sets[i].group } }))

  // The name of a set with its size: over its circle, towards the outside; the third one under its circle.
  v.sets.forEach((set, i) => {
    const room = n === 1 ? roomW : n === 2 || i < 2 ? roomW / 2 - 4 : roomW
    const text = cutToFit(`${set.name} (${valueText(set.total)})`, room, fs)
    const x = n === 1 || i === 2 ? cx : centres[i][0] + (i === 0 ? -1 : 1) * R * 0.2
    out.texts.push(words(text, x, i === 2 ? centres[2][1] + R + 4 : y0 - line - 2, { bold: true, part: { what: 'group', at: set.group } }))
  })

  if (node.vennLabels !== 'none') {
    if (line > R * 0.42) out.notes.push('The circles are small for their numbers: make the chart larger or its text smaller.')
    const middle: [number, number] = [centres.reduce((a, c) => a + c[0], 0) / n, centres.reduce((a, c) => a + c[1], 0) / n]
    const away = (from: [number, number], by: number): [number, number] => {
      const [dx, dy] = [from[0] - middle[0], from[1] - middle[1]]
      const far = Math.hypot(dx, dy) || 1
      return [from[0] + (dx / far) * by, from[1] + (dy / far) * by]
    }
    for (const region of v.regions) {
      // Where the number of a region stands: in a part of one circle away from the others, between two circles away from the third, or in the middle of all.
      const own = region.sets.map((i) => centres[i])
      const mid: [number, number] = [own.reduce((a, c) => a + c[0], 0) / own.length, own.reduce((a, c) => a + c[1], 0) / own.length]
      const at = n === 1 || own.length === n ? mid : own.length === 1 ? away(mid, R * 0.48) : away(mid, R * 0.28)
      const share = v.union ? (region.count / v.union) * 100 : 0
      const text = node.vennLabels === 'percent' ? `${valueText(share, share >= 10 || share === 0 ? 0 : 1)} %` : valueText(region.count)
      out.texts.push(words(text, at[0], at[1] - line / 2, { part: { what: 'number' } }))
    }
  }
  return out
}

export function chartLayout(node: ChartNode): ChartDrawing {
  if (node.facet) {
    const panels = facetLayout(node)
    if (panels) return panels
  }
  if (node.kind === 'standard') return standardLayout(node)
  if (node.kind === 'qpcr') return qpcrLayout(node)
  if (isKinetics(node)) return kineticsLayout(node)
  if (isBinding(node)) return bindingLayout(node)
  if (isMelt(node)) return meltLayout(node)
  if (isSurvival(node)) return survivalLayout(node)
  if (node.kind === 'heatmap') return heatmapLayout(node)
  if (node.kind === 'venn') return vennLayout(node)
  return node.kind === 'scatter' ? scatterLayout(node) : node.kind === 'pie' ? pieLayout(node) : columnLayout(node)
}

/** At most this many small panels are drawn. */
export const MAX_FACETS = 24
const FACET_KINDS: ChartKind[] = ['bar', 'dot', 'box', 'violin', 'line', 'scatter']

/**
 * The panels a chart split into small panels holds, each with its name and the places of its
 * groups in the table: one per category of a grouped chart (or per series), one per series of a
 * scatter chart. Null when the chart cannot be split: a chart of one factor, an analysis whose
 * fit takes every series together (kinetics, binding, melting curves, survival), or another kind.
 */
export function facetsOf(node: ChartNode): { name: string; groups: number[] }[] | null {
  if (!FACET_KINDS.includes(node.kind)) return null
  const drawn = drawnGroups(node)
  if (node.kind === 'scatter') {
    if (node.survival || node.kinetics || node.binding || node.melt) return null
    return drawn.length >= 2 ? drawn.map((c) => ({ name: c.group.name, groups: [c.index] })) : null
  }
  if (!isGrouped(node)) return null
  if (node.facet?.by === 'series') return chartSeries(node).map((s) => ({ name: s.name, groups: s.groups }))
  return unique(drawn.map((c) => c.group.category ?? '')).map((cat) => ({ name: cat, groups: drawn.filter((c) => (c.group.category ?? '') === cat).map((c) => c.index) }))
}

/** Whether a chart can be drawn as small panels. */
export const canFacet = (node: ChartNode): boolean => (facetsOf({ ...node, facet: node.facet ?? {} })?.length ?? 0) >= 2

/** One small panel: the chart with only the groups of the panel, its name as the title, no legend and no axis titles (the whole chart writes those once). */
function facetNode(node: ChartNode, groups: number[], name: string, w: number, h: number, range: { x?: [number, number]; y?: [number, number] }): { sub: ChartNode; brackets: number[] } {
  const series = chartSeries(node)
  const bySeries = node.kind !== 'scatter' && node.facet?.by === 'series'
  const place = new Map(groups.map((g, i) => [g, i]))
  const own = groups.map((i) => {
    const { category, color: _c, shape: _s, pointSize: _ps, pointOpacity: _po, ...g } = node.groups[i]
    // Colours, marks and sizes are those of the series in the whole chart, so they agree across panels.
    const s = series.find((x) => x.groups.includes(i))
    return { ...g, ...(bySeries ? { name: category ?? '' } : {}), color: s?.colour ?? groupColour(node.groups[i], i, node.palette), ...(s?.shape ? { shape: s.shape } : {}), ...(s?.pointSize !== undefined ? { pointSize: s.pointSize } : {}), ...(s?.pointOpacity !== undefined ? { pointOpacity: s.pointOpacity } : {}) }
  })
  // A bracket stays when both its groups are in the panel, with the label the whole chart gives it.
  const kept: number[] = []
  const brackets: ChartBracket[] = []
  ;(node.brackets ?? []).forEach((b, k) => {
    const from = place.get(b.from)
    const to = place.get(b.to)
    if (from === undefined || to === undefined) return
    kept.push(k)
    brackets.push({ from, to, label: bracketLabel(node, b) })
  })
  const { facet: _f, test: _t, brackets: _b, xLabel: _x, yLabel: _y, title: _ti, legend: _l, ...rest } = node
  const sub: ChartNode = {
    ...rest,
    groups: own,
    ...(brackets.length ? { brackets } : {}),
    title: name || '(no name)',
    legend: 'none',
    w,
    h,
    ...(range.y ? { yMin: range.y[0], yMax: range.y[1] } : {}),
    ...(range.x ? { xMin: range.x[0], xMax: range.x[1] } : {}),
  }
  return { sub, brackets: kept }
}

/** Give the marks of a panel the parts of the whole chart: its groups and brackets by their places in the whole, its title as the panel. */
function facetParts(drawing: ChartDrawing, groups: number[], brackets: number[], panel: number): void {
  for (const key of MARK_LISTS) {
    for (const mark of drawing[key] as object[]) {
      const part = PARTS.get(mark)
      if (!part) continue
      const at = part.at
      const mapped: ChartPart | null =
        part.what === 'group' || part.what === 'error' || part.what === 'fit'
          ? at === undefined || groups[at] === undefined ? null : { what: part.what, at: groups[at] }
          : part.what === 'bracket'
            ? at === undefined || brackets[at] === undefined ? null : { what: 'bracket', at: brackets[at] }
            : part.what === 'title'
              ? { what: 'facet', at: panel }
              : part.what === 'legend' || part.what === 'category'
                ? null
                : part
      if (mapped) PARTS.set(mark, mapped)
      else PARTS.delete(mark)
    }
  }
}

/** A chart drawn as small panels in a grid, with one title, one legend and the axis titles once. */
function facetLayout(node: ChartNode): ChartDrawing | null {
  const all = facetsOf(node)
  if (!all || all.length < 2) return null
  const facets = all.slice(0, MAX_FACETS)
  const fs = node.fontSize ?? CHART_FONT
  const out = empty()
  const words = (text: string, x: number, top: number, extra: Partial<TextNode> = {}): TextNode => ({ id: node.id, type: 'text', x: r1(x), y: r1(top), text, fontSize: fs, fill: INK, align: 'center', rotation: 0, ...extra })
  const widthOf = (text: string): number => measureText(words(text, 0, 0)).w

  // The legend names the series when panels hold several; a panel of one series is named by its title.
  const series = chartSeries(node)
  const legend = node.kind !== 'scatter' && node.facet?.by !== 'series' && series.length > 1 ? series : []
  const place = legend.length ? (node.legend === 'top' || node.legend === 'bottom' || node.legend === 'none' ? node.legend : 'right') : 'none'
  const mark = fs * 0.8 + 5
  const widest = legend.length ? Math.max(...legend.map((l) => widthOf(l.name))) : 0
  const legendW = place === 'right' ? widest + mark + 12 : 0
  const legendH = place === 'top' || place === 'bottom' ? fs * 1.6 : 0
  const left = node.yLabel ? fs * 1.7 : 0
  const top = (node.title ? fs * 2 : 0) + (place === 'top' ? legendH : 0)
  const bottom = (node.xLabel ? fs * 1.6 : 0) + (place === 'bottom' ? legendH : 0)
  const gridW = Math.max(20, node.w - left - legendW)
  const gridH = Math.max(20, node.h - top - bottom)
  const n = facets.length
  const cols = Math.min(n, Math.max(1, Math.round(node.facet?.cols ?? (n <= 3 ? n : Math.ceil(Math.sqrt(n))))))
  const rows = Math.ceil(n / cols)
  const gap = fs * 0.6
  const pw = Math.max(10, (gridW - gap * (cols - 1)) / cols)
  const ph = Math.max(10, (gridH - gap * (rows - 1)) / rows)

  // One range for every panel unless each is to have its own: the panels are laid out once on
  // their own and then again over the widest range any of them needed. A scatter chart's x axis is
  // always shared.
  const span = (key: 'x' | 'y', drawings: ChartDrawing[]): [number, number] | undefined => {
    const r = drawings.map((d) => AXES.get(d)?.[key]).filter((v): v is [number, number] => !!v)
    return r.length ? [Math.min(...r.map((v) => v[0])), Math.max(...r.map((v) => v[1]))] : undefined
  }
  const free = !!node.facet?.free
  const yEnds = usableEnds(node.yMin, node.yMax, !!node.yLog)
  const xEnds = usableEnds(node.xMin, node.xMax, !!node.xLog)
  const ownRange = [yEnds.min, yEnds.max, ...(node.kind === 'scatter' ? [xEnds.min, xEnds.max] : [])].some((v) => v !== undefined)
  // With an axis of its own for every panel there is nothing to share, except a scatter chart's x axis.
  const first = free && node.kind !== 'scatter' ? [] : facets.map((f) => chartLayout(facetNode(node, f.groups, f.name, pw, ph, {}).sub))
  const range = { ...(free ? {} : { y: span('y', first) }), ...(node.kind === 'scatter' ? { x: span('x', first) } : {}) }

  out.panels = facets.map((f, k) => {
    const { sub, brackets } = facetNode(node, f.groups, f.name, pw, ph, range)
    const drawing = chartLayout(sub)
    // A range shared by the panels holds the data of every one: only a range the scientist set cuts marks off.
    if (!ownRange) drawing.clipped = false
    facetParts(drawing, f.groups, brackets, k)
    return { x: r1(left + (k % cols) * (pw + gap)), y: r1(top + Math.floor(k / cols) * (ph + gap)), w: r1(pw), h: r1(ph), drawing }
  })
  out.clip = { x: 0, y: 0, w: node.w, h: node.h }

  // Notes once, not once per panel.
  out.notes = unique(out.panels.flatMap((p) => p.drawing.notes))
  if (all.length > MAX_FACETS) out.notes.push(`At most ${MAX_FACETS} panels are drawn: the other ${all.length - MAX_FACETS} are left out.`)
  const across = (node.brackets ?? []).filter((b) => !facets.some((f) => f.groups.includes(b.from) && f.groups.includes(b.to))).length
  if (across) out.notes.push(`${across} ${across === 1 ? 'bracket joins groups' : 'brackets join groups'} in different panels and ${across === 1 ? 'is' : 'are'} not drawn.`)

  if (node.title) out.texts.push({ ...words(node.title, left + gridW / 2, 2, { bold: true }), part: { what: 'title' } })
  if (node.yLabel) {
    const label = words(node.yLabel, fs * 0.9, 0, { rotation: -90 })
    out.texts.push({ ...label, y: r1(top + gridH / 2 - measureText(label).h / 2), part: { what: 'yTitle' } })
  }
  if (node.xLabel) out.texts.push({ ...words(node.xLabel, left + gridW / 2, top + gridH + fs * 0.3), part: { what: 'xTitle' } })
  // The legend: a column at the right, or one row centred above or below the panels.
  const rowWidth = legend.reduce((a, l, i) => a + mark + widthOf(l.name) + (i ? fs * 1.2 : 0), 0)
  let x = place === 'right' ? left + gridW + 8 : left + Math.max(0, (gridW - rowWidth) / 2)
  legend.forEach((entry, i) => {
    const y = place === 'right' ? top + i * fs * 1.5 : place === 'top' ? (node.title ? fs * 2 : fs * 0.2) : top + gridH + (node.xLabel ? fs * 1.6 : 0) + fs * 0.3
    nowPart(out, { what: 'legend', at: i })
    const point = node.kind === 'dot' || node.kind === 'line'
    out.swatches.push({ x: r1(x), y: r1(y + fs * 0.2), size: r1(fs * 0.8), fill: entry.colour, ...(point ? { shape: entry.shape ?? 'circle' } : {}) })
    out.texts.push(words(entry.name, x + mark, y, { align: 'left' }))
    if (place !== 'right') x += mark + widthOf(entry.name) + fs * 1.2
  })
  nowPart(out, null)
  return out
}

/**
 * An axis that starts at zero when the values dip only a hair below it (a blank subtracted, a rate
 * of −0.01 with no substrate): reaching down to the next step below zero for that hides the foot of
 * the curve. Not when the scientist set a range, or a value lies clearly below zero (2 % of the top).
 */
function zeroFloor(node: ChartNode, groups: ChartGroup[]): { yMin?: number } {
  const ys = groups.flatMap((g) => g.values).filter((v) => usable(v))
  const top = Math.max(0, ...ys)
  return !node.yLog && node.yMin === undefined && ys.length && Math.min(...ys) < 0 && Math.min(...ys) >= -0.02 * top ? { yMin: 0 } : {}
}

/** Enzyme kinetics: a scatter chart whose series are rates against substrate concentrations. */
export const isKinetics = (node: ChartNode): boolean => node.kind === 'scatter' && !!node.kinetics && !node.survival

const kineticsResults = new WeakMap<ChartGroup[], Map<string, KineticsResult>>()

/** The fits of a kinetics chart: Michaelis–Menten for each series, or one inhibition model over all of them. */
export function kineticsOf(node: ChartNode): KineticsResult {
  const model = node.kinetics?.model ?? 'mm'
  const key = `${model}|${node.groups.map((g) => g.name).join('\u0001')}`
  let known = kineticsResults.get(node.groups)
  if (!known) kineticsResults.set(node.groups, (known = new Map()))
  const done = known.get(key)
  if (done) return done
  const result = kinetics(kineticsColumns(node), model)
  known.set(key, result)
  return result
}

/** The fit that draws series i: its own for Michaelis–Menten, the one shared fit for an inhibition model. */
export function kineticsFitFor(node: ChartNode, result: KineticsResult, i: number): KineticsFit | null {
  const f = node.kinetics?.model ? result.fits[0] : result.fits[i]
  return isFit(f) ? f : null
}

/**
 * Enzyme kinetics, drawn as a scatter chart: the rates as points and the fitted curve through each
 * series, from no substrate to the most. As a Lineweaver–Burk plot, 1/v against 1/[S] with the
 * fitted curves as straight lines reaching back to where they cross the x axis (−1/Km), for the
 * eye only: the fit is never made on the reciprocals.
 */
function kineticsLayout(node: ChartNode): ChartDrawing {
  const r = kineticsOf(node)
  const columns = kineticsColumns(node)
  const inhibition = !!node.kinetics?.model
  const at = (i: number): number => (inhibition ? (columns[i]?.inhibitor ?? 0) : 0)
  const notes = [...r.notices]
  const failed = node.kinetics?.model ? (isFit(r.fits[0]) ? [] : [r.fits[0]?.reason ?? '']) : r.fits.flatMap((f, i) => (f && !isFit(f) && node.groups[i]?.values.length ? [`No curve for ${node.groups[i].name || 'the rates'}: ${f.reason}`] : []))
  notes.push(...failed.filter(Boolean))
  const plain = { ...node, fit: undefined, curve: undefined, corr: undefined, band: undefined, doseBottom: undefined, doseTop: undefined }
  if (!node.kinetics?.lineweaver) {
    const curves = node.groups.map((_, i) => {
      const fit = kineticsFitFor(node, r, i)
      return fit ? { series: i, at: (x: number) => fit.predict(x, at(i)), from: node.xLog ? undefined : 0 } : null
    })
    return scatterLayout(
      { ...plain, ...zeroFloor(node, node.groups), ...(node.xLabel ? {} : { xLabel: '[Substrate]' }), ...(node.yLabel ? {} : { yLabel: 'Rate' }) },
      { curves: curves.filter((c): c is NonNullable<typeof c> => !!c), notes },
    )
  }
  // Lineweaver–Burk: every point as reciprocals; a substrate or rate of zero or below has none.
  let dropped = 0
  const groups = node.groups.map((g) => {
    const xs: number[] = []
    const values: number[] = []
    g.values.forEach((v, k) => {
      const sx = g.xs?.[k]
      // No substrate has no reciprocal and no place on this plot; that is expected, not worth a notice.
      if (sx === undefined || sx === 0) return
      if (!(sx > 0 && v > 0)) {
        dropped++
        return
      }
      xs.push(1 / sx)
      values.push(1 / v)
    })
    return { ...g, xs, values, labels: undefined, rows: undefined }
  })
  if (dropped) notes.push(`${dropped} ${dropped === 1 ? 'point has' : 'points have'} a rate of zero or below, which has no reciprocal: ${dropped === 1 ? 'it is' : 'they are'} left out of this plot but not of the fit.`)
  const reach: number[] = []
  const curves = groups.map((g, i) => {
    const fit = kineticsFitFor(node, r, i)
    if (!fit || !g.xs.length) return null
    const { vmax, km } = apparent(fit, at(i))
    if (!(vmax > 0 && km > 0)) return null
    const from = -1 / km
    reach.push(from)
    return { series: i, at: (x: number) => (1 + km * x) / vmax, from, to: Math.max(...g.xs) }
  })
  return scatterLayout(
    {
      ...plain,
      groups,
      xLog: undefined,
      yLog: undefined,
      xLabel: node.xLabel ? `1 / ${node.xLabel}` : '1 / [Substrate]',
      yLabel: node.yLabel ? `1 / ${node.yLabel}` : '1 / Rate',
      // The lines at values belong to the plain plot; here the axes through zero are drawn instead.
      refLines: [{ axis: 'x', value: 0, dash: 'solid' }, { axis: 'y', value: 0, dash: 'solid' }],
      pointNames: undefined,
    },
    { curves: curves.filter((c): c is NonNullable<typeof c> => !!c), xReach: reach, notes },
  )
}

/** Standard curves already worked out, by the chart's table: the curve is fitted once per change of numbers or settings, not at every move. */
const standardResults = new WeakMap<ChartGroup[], Map<string, StandardResult>>()

/** The curve of a standard curve chart, its standards read back and its samples read off it. */
export function standardOf(node: ChartNode): StandardResult {
  const key = JSON.stringify(node.standard ?? {})
  let known = standardResults.get(node.groups)
  if (!known) standardResults.set(node.groups, (known = new Map()))
  const done = known.get(key)
  if (done) return done
  const table = standardTableOf(node)
  const result = standardCurve({ standards: table.standards, samples: table.samples, model: node.standard?.model ?? 'linear', blank: !!node.standard?.blank })
  known.set(key, result)
  return result
}

/**
 * A standard curve, drawn as a scatter chart: the standards as points with the fitted curve
 * through them, and every sample that could be read as a point on the curve, at the
 * concentration in the well (before its dilution is taken into account), named as in the table.
 */
function standardLayout(node: ChartNode): ChartDrawing {
  const r = standardOf(node)
  const minus = r.blank ?? 0
  const std = node.groups[0] ?? { name: 'Standards', values: [], xs: [] }
  const table = standardTableOf(node)
  const read = r.fit
    ? r.samples
        .map((s, k) => ({ s, dilution: table.samples[k]?.dilution ?? 1 }))
        .filter(({ s }) => s.conc !== null && s.flag !== 'none')
        .map(({ s, dilution }) => ({ name: s.name, x: s.conc! / dilution, y: r.fit!.predict(s.conc! / dilution) }))
        .filter((p) => usable(p.x) && usable(p.y))
    : []
  const second = node.groups[1]
  const groups: ChartGroup[] = [
    { name: std.name || 'Standards', ...(std.color ? { color: std.color } : {}), ...(std.shape ? { shape: std.shape } : {}), values: std.values.map((v) => v - minus), xs: std.xs ?? [] },
    ...(read.length ? [{ name: second?.name || 'Samples', color: second?.color ?? paletteColours(node.palette)[1], shape: second?.shape ?? ('diamond' as const), values: read.map((p) => p.y), xs: read.map((p) => p.x), labels: read.map((p) => p.name) }] : []),
  ]
  // The curve's own notices count the samples outside the standards; the chart names them instead.
  const notes = r.notices.filter((n) => !/outside the standards:|the curve never reaches/.test(n))
  if (r.reason) notes.push(r.reason)
  const away = r.samples.filter((s) => s.flag === 'below' || s.flag === 'above').map((s) => s.name)
  if (away.length) notes.push(`${listed(away.slice(0, 6))}${away.length > 6 ? ` and ${away.length - 6} more` : ''} ${away.length === 1 ? 'lies' : 'lie'} outside the range of the standards: ${away.length === 1 ? 'its' : 'their'} concentration is an extrapolation. Dilute and measure again for a reliable value.`)
  const none = r.samples.filter((s) => s.flag === 'none').map((s) => s.name)
  if (none.length && r.fit) notes.push(`${listed(none.slice(0, 6))}${none.length > 6 ? ` and ${none.length - 6} more` : ''} cannot be read off the curve: the signal lies beyond what the curve can reach.`)
  // A blank subtracted from replicates leaves the lowest standards a hair below zero.
  const floor = zeroFloor(node, groups)
  return scatterLayout(
    { ...node, ...floor, kind: 'scatter', groups, fit: undefined, curve: undefined, corr: undefined, band: undefined, survival: undefined, ...(node.yLabel ? {} : { yLabel: minus ? 'Signal, blank subtracted' : 'Signal' }), ...(node.xLabel ? {} : { xLabel: 'Concentration' }) },
    {
      curve: r.fit ? { series: 0, at: (x) => r.fit!.predict(x) } : undefined,
      notes,
      hidden: (n) => `${n} ${n === 1 ? 'standard is' : 'standards are'} at zero, which a logarithmic axis cannot show; ${n === 1 ? 'it is' : 'they are'} still part of the fit.`,
    },
  )
}

/** qPCR analyses already worked out, by the chart's table. */
const qpcrResults = new WeakMap<ChartGroup[], Map<string, QpcrResult>>()

/** The fold changes of a qPCR chart, worked out from its wells and settings. */
export function qpcrOf(node: ChartNode): QpcrResult {
  const key = JSON.stringify([node.qpcr ?? {}, node.error ?? ''])
  let known = qpcrResults.get(node.groups)
  if (!known) qpcrResults.set(node.groups, (known = new Map()))
  const done = known.get(key)
  if (done) return done
  const result = analyseQpcr(qpcrWells(node.groups), node.qpcr ?? {}, node.error)
  known.set(key, result)
  return result
}

/**
 * A qPCR analysis, drawn as grouped bars: one category per gene, one bar per condition, the bar
 * the fold change of the condition's mean ΔΔCt (2^−ΔΔCt, the geometric mean of the samples' fold
 * changes), its error bar from 2^−(ΔΔCt + s) to 2^−(ΔΔCt − s), and a dot for every sample. On the
 * log₂ scale the same, as −ΔΔCt ± s. The bar layout draws it; only the heights and the ends of the
 * error bars are given here.
 */
function qpcrLayout(node: ChartNode): ChartDrawing {
  const r = qpcrOf(node)
  const log2 = !!node.qpcr?.log2
  const groups: ChartGroup[] = []
  const shown: { mean: number; low: number | null; high: number | null }[] = []
  // The test of each condition against the control, over its bar and the control's, when asked for.
  const marks = node.qpcr?.marks
  const brackets: ChartBracket[] = []
  for (const gene of r.genes) {
    const first = groups.length
    for (const c of gene.conditions) {
      const own = gene.samples.filter((s) => s.condition === c.condition)
      if (marks && c.t && gene.conditions[0].condition === r.control) brackets.push({ from: first, to: groups.length, label: marks === 'stars' ? stars(c.t.adjusted) : pText(c.t.adjusted) })
      groups.push({ name: c.condition, category: gene.target, values: own.map((s) => (log2 ? s.log2fc : 2 ** s.log2fc)) })
      shown.push(
        log2
          ? { mean: -c.ddct, low: c.err === null ? null : -c.ddct - c.err, high: c.err === null ? null : -c.ddct + c.err }
          : { mean: c.fold, low: c.low, high: c.high },
      )
    }
  }
  const drawn: ChartNode = {
    ...node,
    kind: 'bar',
    groups,
    brackets: brackets.length ? brackets : undefined,
    test: undefined,
    stacked: undefined,
    yLabel: node.yLabel ?? (log2 ? 'log_{2} fold change' : 'Fold change'),
  }
  const out = columnLayout(drawn, (i) => shown[i] ?? null)
  out.notes = [...r.notices, ...out.notes]
  if (marks && r.genes.length && !brackets.length) out.notes.push('No condition could be tested against the control, so no result is written on the chart.')
  return out
}

/** Saturation binding: a scatter chart whose series are bound ligand against free concentrations. */
export const isBinding = (node: ChartNode): boolean => node.kind === 'scatter' && !!node.binding && !node.survival && !node.kinetics

const bindingResults = new WeakMap<ChartGroup[], Map<string, BindingResult>>()

/** The fits of a binding chart: one per series, or the one fit of total and nonspecific binding. */
export function bindingOf(node: ChartNode): BindingResult {
  const key = `${bindingModel(node.binding)}|${node.groups.map((g) => g.name).join('\u0001')}`
  let known = bindingResults.get(node.groups)
  if (!known) bindingResults.set(node.groups, (known = new Map()))
  const done = known.get(key)
  if (done) return done
  const result = binding(bindingColumns(node), node.binding)
  known.set(key, result)
  return result
}

/** The fit that draws series i, and whether it draws it as total binding; null when it has none. */
export function bindingFitFor(r: BindingResult, i: number): { fit: BindingFit; total: boolean } | null {
  if (r.pair) {
    const f = r.fits[0]
    if (!isBindingFit(f) || (i !== r.pair.total && i !== r.pair.nonspecific)) return null
    return { fit: f, total: i === r.pair.total }
  }
  const f = r.fits[i]
  return isBindingFit(f) ? { fit: f, total: true } : null
}

/**
 * Saturation binding, drawn as a scatter chart: the bound values as points with the fitted curve
 * through each series from no ligand on (the nonspecific binding of the total model as its straight
 * line). As a Scatchard plot, bound/free against bound with the fitted curve carried over as its
 * straight line, for the eye only.
 */
function bindingLayout(node: ChartNode): ChartDrawing {
  const r = bindingOf(node)
  const notes = [...r.notices]
  if (r.pair) {
    if (!isBindingFit(r.fits[0])) notes.push(`No curve: ${r.fits[0]?.reason ?? ''}`)
  } else r.fits.forEach((f, i) => f && !isBindingFit(f) && notes.push(`No curve for ${node.groups[i]?.name || 'the values'}: ${f.reason}`))
  const plain = { ...node, fit: undefined, curve: undefined, corr: undefined, band: undefined, doseBottom: undefined, doseTop: undefined }
  const scatchard = !!node.binding?.scatchard && bindingModel(node.binding) === 'specific'
  if (!scatchard) {
    const curves = node.groups.map((_, i) => {
      const got = bindingFitFor(r, i)
      return got ? { series: i, at: (x: number) => got.fit.predict(x, got.total), from: node.xLog ? undefined : 0 } : null
    })
    return scatterLayout(
      { ...plain, ...zeroFloor(node, node.groups), ...(node.xLabel ? {} : { xLabel: '[Ligand]' }), ...(node.yLabel ? {} : { yLabel: 'Bound' }) },
      { curves: curves.filter((c): c is NonNullable<typeof c> => !!c), notes },
    )
  }
  // Scatchard: bound/free against bound; a concentration of zero has no ratio.
  const groups = node.groups.map((g) => {
    const xs: number[] = []
    const values: number[] = []
    g.values.forEach((v, k) => {
      const free = g.xs?.[k]
      if (free === undefined || !(free > 0)) return
      xs.push(v)
      values.push(v / free)
    })
    return { ...g, xs, values, labels: undefined, rows: undefined }
  })
  const curves = groups.map((g, i) => {
    const got = bindingFitFor(r, i)
    const bmax = got?.fit.params.bmax?.value
    const kd = got?.fit.params.kd?.value
    if (!got || !g.xs.length || !(bmax! > 0 && kd! > 0)) return null
    return { series: i, at: (b: number) => (bmax! - b) / kd!, from: 0, to: bmax! }
  })
  return scatterLayout(
    {
      ...plain,
      groups,
      xLog: undefined,
      yLog: undefined,
      xLabel: node.yLabel || 'Bound',
      yLabel: node.yLabel ? `${node.yLabel} / free` : 'Bound / free',
      refLines: undefined,
      pointNames: undefined,
      xMin: undefined,
      xMax: undefined,
      yMin: undefined,
      yMax: undefined,
    },
    { curves: curves.filter((c): c is NonNullable<typeof c> => !!c), xReach: [0], notes },
  )
}

/** Melting curves: a scatter chart whose series are signals against temperature. */
export const isMelt = (node: ChartNode): boolean => node.kind === 'scatter' && !!node.melt && !node.survival && !node.kinetics && !node.binding

const meltResults = new WeakMap<ChartGroup[], Map<string, MeltResult>>()

/** The melting temperatures of a melting chart, worked out once per change of numbers or settings. */
export function meltOf(node: ChartNode): MeltResult {
  const { view: _v, normalise: _n, ...fitting } = node.melt ?? {}
  const key = `${JSON.stringify(fitting)}|${node.groups.map((g) => g.name).join('\u0001')}`
  let known = meltResults.get(node.groups)
  if (!known) meltResults.set(node.groups, (known = new Map()))
  const done = known.get(key)
  if (done) return done
  const result = melt(meltColumns(node), fitting)
  known.set(key, result)
  return result
}

/** The value of a run of points between them, by straight lines; NaN outside it. */
function along(p: { t: number; y: number }[], t: number): number {
  if (!p.length || t < p[0].t || t > p[p.length - 1].t) return NaN
  let k = 1
  while (k < p.length - 1 && p[k].t < t) k++
  const [a, b] = [p[k - 1], p[k]]
  return b.t === a.t ? a.y : a.y + ((b.y - a.y) * (t - a.t)) / (b.t - a.t)
}

/** The two levels a curve is scaled between to run from 0 to 1: its fitted plateaus, or its signal at the ends of the transition. */
function meltLevels(fit: MeltFit | null, p: { t: number; y: number }[]): [number, number] | null {
  if (fit?.bottom !== undefined && fit.top !== undefined) return fit.top !== fit.bottom ? [fit.bottom, fit.top] : null
  if (!fit || !p.length) {
    if (p.length < 2) return null
    const ys = p.map((q) => q.y)
    return Math.max(...ys) > Math.min(...ys) ? [Math.min(...ys), Math.max(...ys)] : null
  }
  const [a, b] = [along(p, fit.window[0]), along(p, fit.window[1])]
  return Number.isFinite(a) && Number.isFinite(b) && a !== b ? [a, b] : null
}

/**
 * Melting curves, drawn as lines through the mean signal at every temperature, with the melting
 * temperature of each curve marked on it. Scaled, every curve runs from 0 to 1 between its
 * plateaus. As derivatives, the rate of change of every curve (turned so that its peak points up),
 * with the Tm marked on its peak: the melt peaks of a qPCR machine.
 */
function meltLayout(node: ChartNode): ChartDrawing {
  const r = meltOf(node)
  const notes = [...r.notices]
  const plain = { ...node, fit: undefined, curve: undefined, corr: undefined, band: undefined, doseBottom: undefined, doseTop: undefined, pointNames: undefined }
  const fits = r.fits.map((f) => (isMeltFit(f) ? f : null))
  const marks: { series: number; x: number; y: number }[] = []
  const curves: ScatterCurve[] = []
  if (node.melt?.view === 'derivative') {
    const sign = fits.find((f) => f)?.direction ?? 1
    const groups = node.groups.map((g, i) => {
      const d = r.derivatives[i]
      const fit = fits[i]
      const dir = fit?.direction ?? sign
      const p = d ? d.t.map((t, k) => ({ t, y: dir * d.d[k] })) : []
      if (p.length > 1) curves.push({ series: i, at: (t) => along(p, t) })
      if (fit && p.length) marks.push({ series: i, x: fit.tm.value, y: along(p, fit.tm.value) })
      return { ...g, xs: p.map((q) => q.t), values: p.map((q) => q.y), labels: undefined, rows: undefined }
    })
    return scatterLayout(
      { ...plain, groups, yLog: undefined, refLines: undefined, yMin: undefined, yMax: undefined, ...(node.xLabel ? {} : { xLabel: 'Temperature (°C)' }), yLabel: sign < 0 ? '−dF/dT' : 'dF/dT' },
      { curves, marks: marks.filter((m) => Number.isFinite(m.y)), noPoints: true, xFromData: true, notes },
    )
  }
  const scale = !!node.melt?.normalise
  const groups = node.groups.map((g, i) => {
    const col = meltColumns({ groups: [g] })[0]
    const p = profile(col.t, col.y)
    const levels = scale ? meltLevels(fits[i], p) : null
    const f = (v: number): number => (levels ? (v - levels[0]) / (levels[1] - levels[0]) : v)
    const q = p.map((pt) => ({ t: pt.t, y: f(pt.y) }))
    if (q.length > 1) curves.push({ series: i, at: (t) => along(q, t) })
    const fit = fits[i]
    if (fit && q.length) marks.push({ series: i, x: fit.tm.value, y: along(q, fit.tm.value) })
    return scale ? { ...g, xs: col.t, values: col.y.map(f), labels: undefined, rows: undefined } : g
  })
  if (scale && groups.some((g, i) => g.values.length && !meltLevels(fits[i], profile(meltColumns({ groups: [node.groups[i]] })[0].t, meltColumns({ groups: [node.groups[i]] })[0].y))))
    notes.push('A curve with no change in its signal cannot be scaled from 0 to 1, and is drawn as it was read.')
  return scatterLayout(
    { ...plain, groups, ...(scale ? { yLog: undefined } : {}), ...(node.xLabel ? {} : { xLabel: 'Temperature (°C)' }), ...(node.yLabel && !scale ? {} : { yLabel: scale ? 'Normalised signal' : 'Signal' }) },
    { curves, marks: marks.filter((m) => Number.isFinite(m.y)), noPoints: true, xFromData: true, notes },
  )
}
