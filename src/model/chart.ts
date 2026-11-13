// Charts made from numbers the scientist pastes in: reading the table, the statistics shown, and
// where every bar, box, point, error bar, tick and word is drawn. The renderer only draws what
// `chartLayout` returns, so the page and every export show the same chart.
//
// Three table shapes, all as biologists know them from statistics programs:
//  - one column per group (its name in the first row), one row per replicate;
//  - grouped: two rows of names, the category (for example the genotype) above the series (for
//    example the treatment);
//  - scatter: the first column holds x, every further column the y values of one series.

import { bandwidth, boxStats, density, fitLine, type BoxStats, type Fit } from './chartStats'
import { measureText, wrapText } from './nodes'
import type { ChartGroup, ChartKind, ChartNode, TextNode } from './types'

export const MAX_GROUPS = 24
/** Values kept per group. Large enough for per-cell measurements; a table beyond it is cut and the scientist is told. */
export const MAX_VALUES = 5000
export const MAX_BRACKETS = 30
export const CHART_FONT = 13
/** Colours given to groups that have none of their own, in turn. */
export const CHART_COLOURS = ['#6fa8dc', '#e58a87', '#7cc48f', '#f3c95e', '#8fd3cc', '#b7a3e6', '#f0a04b', '#aab4c3']
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
 * For a scatter chart the first column is x.
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
  const guessed = scatter ? (named ? 1 : 0) : named ? (allWords(cells[1]) ? 2 : 1) : 0
  const head = Math.min(header ?? guessed, scatter ? 1 : 2, cells.length) as 0 | 1 | 2
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

  if (scatter) {
    const xs = rows.map((row) => read(row[0]))
    for (let col = 1; col < width; col++) {
      const points: [number, number][] = []
      rows.forEach((row, r) => {
        const y = read(row[col])
        // A point needs both of its numbers.
        if (Number.isFinite(xs[r]) && Number.isFinite(y)) points.push([xs[r], y])
      })
      const name = nameOf(col)
      if (!points.length && !name) continue
      if (report.groups.length >= MAX_GROUPS) {
        report.droppedGroups++
        continue
      }
      report.droppedValues += Math.max(0, points.length - MAX_VALUES)
      const kept = points.slice(0, MAX_VALUES)
      report.groups.push({ name: name || `Series ${report.groups.length + 1}`, values: kept.map((p) => p[1]), xs: kept.map((p) => p[0]) })
    }
    return report
  }

  let category = ''
  for (let col = 0; col < width; col++) {
    if (head === 2 && cells[0][col]) category = cells[0][col].slice(0, 60)
    const values = rows.map((row) => read(row[col])).filter((v) => Number.isFinite(v))
    const name = nameOf(col)
    // A column with neither a name nor a number is an empty one between two others.
    if (!values.length && !name) continue
    if (report.groups.length >= MAX_GROUPS) {
      report.droppedGroups++
      continue
    }
    report.droppedValues += Math.max(0, values.length - MAX_VALUES)
    report.groups.push({ name: name || `Group ${report.groups.length + 1}`, values: values.slice(0, MAX_VALUES), ...(head === 2 && category ? { category } : {}) })
  }
  return report
}

/** The groups of a pasted table: `readTable` without its report. */
export const parseTable = (text: string, kind: ChartKind = 'bar', header?: 0 | 1 | 2): ChartGroup[] => readTable(text, kind, header).groups

/** How many rows of names `tableText` writes for these groups: two for a grouped chart, otherwise one. */
export const headRows = (groups: ChartGroup[], kind: ChartKind): 1 | 2 => (kind !== 'scatter' && groups.some((g) => g.category) ? 2 : 1)

/** The groups written back as a tab-separated table, for the box the scientist edits. Read it again with `headRows`. */
export function tableText(groups: ChartGroup[], kind: ChartKind = 'bar'): string {
  if (kind === 'scatter') {
    // One row per x value; series that share an x share the row.
    const rows: { x: number; ys: (number | undefined)[] }[] = []
    const rowOf = new Map<string, number>()
    groups.forEach((g, col) => {
      const seen = new Map<number, number>()
      ;(g.xs ?? []).forEach((x, k) => {
        const nth = seen.get(x) ?? 0
        seen.set(x, nth + 1)
        const key = `${x}#${nth}`
        if (!rowOf.has(key)) {
          rowOf.set(key, rows.length)
          rows.push({ x, ys: [] })
        }
        rows[rowOf.get(key)!].ys[col] = g.values[k]
      })
    })
    return [['x', ...groups.map((g) => g.name)].join('\t'), ...rows.map((r) => [r.x, ...groups.map((_, col) => r.ys[col] ?? '')].join('\t'))].join('\n')
  }
  const count = Math.max(0, ...groups.map((g) => g.values.length))
  const lines = headRows(groups, kind) === 2 ? [groups.map((g) => g.category ?? '').join('\t')] : []
  lines.push(groups.map((g) => g.name).join('\t'))
  for (let r = 0; r < count; r++) lines.push(groups.map((g) => (r < g.values.length ? String(g.values[r]) : '')).join('\t'))
  return lines.join('\n')
}

/**
 * The same table read as the other family of chart: a scatter chart takes its first column as x,
 * every other kind takes every column as a group. Going there and back does not return the
 * same groups, so whoever calls this should keep the original to go back to.
 */
export const crossTable = (groups: ChartGroup[], from: ChartKind, to: ChartKind): ChartGroup[] => parseTable(tableText(groups, from), to, 1)

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
export function niceScale(lo: number, hi: number, target = 5): Scale {
  if (!Number.isFinite(lo)) lo = 0
  // No spread: open the axis by one unit, or by a visible share of a very large number.
  if (!Number.isFinite(hi) || !(hi > lo)) hi = lo + Math.max(1, Math.abs(lo) * 1e-6)
  const raw = (hi - lo) / target
  const power = 10 ** Math.floor(Math.log10(raw))
  const norm = raw / power
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
  const lead = Number((value / 10 ** power).toFixed(digits))
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
      const d = 10 ** round(Math.log10(v) + nudge)
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
    const gap = ticks.length > 1 ? Math.abs(ticks[1].value - ticks[0].value) / 10 ** power : 1
    const digits = Math.min(6, Math.max(0, -Math.floor(Math.log10(gap) + 1e-9)))
    ticks = ticks.map((t) => ({ value: t.value, label: powerLabel(t.value, power, digits) }))
  }
  return { min, max, log: false, ticks, at: (v) => (v - min) / (max - min), ignored: (opts.min !== undefined && set.min === undefined) || (opts.max !== undefined && end === undefined) }
}

// ---------- where everything is drawn ----------

export interface ChartDrawing {
  /** Marks that show data. They are cut off at the edge of the plot when an axis range leaves some outside. */
  rects: { x: number; y: number; w: number; h: number; fill: string }[]
  lines: { x1: number; y1: number; x2: number; y2: number; width: number }[]
  /** Outlines and joining lines: a violin (filled), the line of a line chart, a fitted line. */
  paths: { d: string; stroke: string; width: number; fill?: string }[]
  /** Points. A `ring` is drawn hollow (an outlier of a box plot). */
  circles: { cx: number; cy: number; r: number; fill: string; ring?: boolean }[]
  /** Axes, tick marks and brackets: never cut off. */
  rules: { x1: number; y1: number; x2: number; y2: number; width: number }[]
  /** Colour squares of the legend. */
  swatches: { x: number; y: number; size: number; fill: string }[]
  /** Words, as labels the label renderer draws (so superscripts and other marks work in them). */
  texts: TextNode[]
  /** The plot area, in the chart's own box. */
  clip: { x: number; y: number; w: number; h: number }
  /** The scientist set the end of an axis, so data marks may lie outside the plot and must be cut off at its edge. */
  clipped: boolean
  /** Things the scientist should know about how the numbers are shown, in plain words. */
  notes: string[]
}

const r1 = (v: number): number => Math.round(v * 10) / 10
const unique = <T>(items: T[]): T[] => [...new Set(items)]

/** The colour of group `i`: its own, or the next of the standard ones. */
export const groupColour = (group: ChartGroup, i: number): string => group.color ?? CHART_COLOURS[i % CHART_COLOURS.length]

/** How far the error bar reaches above and below the mean. */
function errorOf(node: ChartNode, s: Stats): number {
  return node.error === 'sd' ? s.sd : node.error === 'sem' ? s.sem : 0
}

/** The groups that have numbers, each with its place in the chart's table. */
const drawnGroups = (node: ChartNode): { group: ChartGroup; index: number }[] => node.groups.map((group, index) => ({ group, index })).filter((c) => c.group.values.length)

/** True when the chart has categories: several series side by side in each. */
export const isGrouped = (node: ChartNode): boolean => node.kind !== 'scatter' && drawnGroups(node).some((c) => c.group.category)

/**
 * What the colours of a chart stand for, in order: the series of a grouped or scatter chart (one
 * colour each, shared across categories), otherwise every group. `groups` lists the places in the
 * chart's table that take the colour.
 */
export function chartSeries(node: ChartNode): { name: string; colour: string; groups: number[] }[] {
  const drawn = drawnGroups(node)
  if (!isGrouped(node)) return drawn.map((c, i) => ({ name: c.group.name, colour: groupColour(c.group, i), groups: [c.index] }))
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
    return { name, colour: members.find((c) => c.group.color)?.group.color ?? CHART_COLOURS[i % CHART_COLOURS.length], groups: members.map((c) => c.index) }
  })
}

/** The values of a group that the chart can show and that its statistics are worked out from: on a logarithmic axis, those above zero. */
export const shownValues = (node: ChartNode, group: ChartGroup): number[] => (node.yLog && node.kind !== 'scatter' ? group.values.filter((v) => v > 0) : group.values)

/** Notes every kind of chart can need: the table was larger than a chart takes, or an axis end could not be used. */
function sharedNotes(node: ChartNode, axes: { axis: Axis; name: string }[]): string[] {
  const notes: string[] = []
  if (node.groups.some((g) => g.values.length >= MAX_VALUES)) notes.push(`A chart takes at most ${MAX_VALUES} values per group: a larger group is cut off there, and what is drawn describes only those values.`)
  if (node.groups.length >= MAX_GROUPS) notes.push(`A chart takes at most ${MAX_GROUPS} groups: any further columns were left out.`)
  for (const { axis, name } of axes) {
    if (axis.ignored) notes.push(`An end set for the ${name} cannot be used, so it is ignored: the end must be above the start${axis.log ? ', and both above zero on a logarithmic axis' : ''}.`)
  }
  return notes
}

const empty = (): ChartDrawing => ({ rects: [], lines: [], paths: [], circles: [], rules: [], swatches: [], texts: [], clip: { x: 0, y: 0, w: 0, h: 0 }, clipped: false, notes: [] })

/**
 * Shared by every kind of chart: lettering, margins, the value axis on the left and the legend on
 * the right. `right` is the room kept free at the right edge; `rows` says how many lines the names
 * along the bottom take, given the width of the plot.
 */
function frame(node: ChartNode, out: ChartDrawing, yAxis: Axis, legend: { name: string; colour: string }[], right: number, rows: (pw: number, fs: number) => number) {
  const fs = node.fontSize ?? CHART_FONT
  const words = (text: string, x: number, top: number, extra: Partial<TextNode> = {}): TextNode => ({
    id: node.id, type: 'text', x: r1(x), y: r1(top), text, fontSize: fs, fill: INK, align: 'center', rotation: 0, ...extra,
  })
  const rule = (x1: number, y1: number, x2: number, y2: number, width = 1.2) => out.rules.push({ x1: r1(x1), y1: r1(y1), x2: r1(x2), y2: r1(y2), width })
  const widthOf = (text: string): number => measureText(words(text, 0, 0)).w

  // Room around the plot: title on top, numbers and axis title on the left, names below, legend on the right.
  const tickWidth = Math.max(...yAxis.ticks.map((t) => widthOf(t.label)))
  const left = (node.yLabel ? fs * 1.7 : 2) + tickWidth + 10
  const top = node.title ? fs * 2 : fs * 0.8
  const legendWidth = legend.length ? Math.max(...legend.map((l) => widthOf(l.name))) + fs + 16 : 0
  const px = left
  const py = top
  const pw = Math.max(10, node.w - left - right - legendWidth)
  // One line of names takes what it always did; every further line one line more.
  const below = fs * (0.65 + 1.25 * Math.max(1, rows(pw, fs)))
  const ph = Math.max(10, node.h - top - below - (node.xLabel ? fs * 1.5 : 0))
  out.clip = { x: r1(px), y: r1(py), w: r1(pw), h: r1(ph) }
  const xEnds = usableEnds(node.xMin, node.xMax, !!node.xLog)
  const yEnds = usableEnds(node.yMin, node.yMax, !!node.yLog)
  out.clipped = [yEnds.min, yEnds.max, ...(node.kind === 'scatter' ? [xEnds.min, xEnds.max] : [])].some((v) => v !== undefined)

  legend.forEach((entry, i) => {
    const y = py + i * fs * 1.5
    out.swatches.push({ x: r1(px + pw + right + 4), y: r1(y + fs * 0.2), size: r1(fs * 0.8), fill: entry.colour })
    out.texts.push(words(entry.name, px + pw + right + 4 + fs * 0.8 + 5, y, { align: 'left' }))
  })
  if (node.title) out.texts.push(words(node.title, px + pw / 2, 2, { bold: true }))
  if (node.yLabel) {
    const label = words(node.yLabel, fs * 0.9, 0, { rotation: -90 })
    out.texts.push({ ...label, y: r1(py + ph / 2 - measureText(label).h / 2) })
  }
  if (node.xLabel) out.texts.push(words(node.xLabel, px + pw / 2, py + ph + below))
  return { fs, words, rule, widthOf, px, py, pw, ph }
}

/** How wide a piece of chart lettering is. */
const textWidth = (text: string, fs: number): number => measureText({ id: '', type: 'text', x: 0, y: 0, text, fontSize: fs, fill: INK, align: 'center', rotation: 0 }).w

/**
 * The value axis itself: its line, tick marks and numbers. `y` turns a value into a height on the
 * page. On a chart too short for all of them, numbers that would run into the one below are left out.
 */
function drawValueAxis(f: ReturnType<typeof frame>, axis: Axis, y: (v: number) => number, out: ChartDrawing, topY: number) {
  f.rule(f.px, topY, f.px, f.py + f.ph)
  let last = Infinity
  for (const tick of axis.ticks) {
    const at = y(tick.value)
    if (!Number.isFinite(at) || last - at < f.fs * 1.1) continue
    last = at
    f.rule(f.px - 4, at, f.px, at)
    out.texts.push(f.words(tick.label, f.px - 7, at - (f.fs * 1.25) / 2, { align: 'right' }))
  }
}

interface Column {
  group: ChartGroup
  /** Place of the group in the chart's table. */
  index: number
  colour: string
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
}

const VIOLIN_NOTE = `A violin needs at least ${VIOLIN_MIN} values that are not all the same: other groups are shown as dots.`
const BRACKET_NOTE = 'Not all brackets fit above the data: make the chart taller, or remove some.'
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
function columnLayout(node: ChartNode): ChartDrawing {
  const drawn = drawnGroups(node)
  const grouped = isGrouped(node)
  const cats = grouped ? unique(drawn.map((c) => c.group.category ?? '')) : []
  const series = chartSeries(node)
  const showPoints = node.kind === 'dot' || !!node.points
  const log = !!node.yLog

  let hidden = 0
  const cols: Column[] = drawn.map(({ group, index }, i) => {
    const values = shownValues(node, group)
    hidden += group.values.length - values.length
    const s = stats(values)
    const err = errorOf(node, s)
    // What the column reaches: a bar or line point with its error bar (and its dots, when shown);
    // a dot chart every value and its error bar; a box or violin simply every value.
    const reach = node.kind === 'bar' || node.kind === 'line' ? [s.mean, s.mean - err, s.mean + err, ...(showPoints ? values : [])] : node.kind === 'dot' ? [...values, s.mean - err, s.mean + err] : values
    const shown = values.length ? (log ? reach.filter((v) => v > 0) : reach) : []
    const colour = grouped ? series.find((x) => x.groups.includes(index))!.colour : groupColour(group, i)
    // A logarithmic axis has no zero to stand a bar on: it starts below the smallest value of the
    // group, so that a bar or a mean always has a visible height above the bottom of the axis.
    return { group, index, colour, values, s, box: boxStats(values), err, lo: Math.min(...shown, ...(log ? values : [])), hi: Math.max(...shown), cx: 0, width: 0 }
  })
  const live = cols.filter((c) => c.values.length)

  // A linear axis includes zero, so the height of a bar means what it seems to; a logarithmic one cannot.
  const lo = Math.min(...(log ? [] : [0]), ...live.map((c) => c.lo))
  const hi = Math.max(...(log ? [] : [0]), ...live.map((c) => c.hi))
  const axis = axisFor(Number.isFinite(lo) ? lo : 1, Number.isFinite(hi) ? hi : 10, { min: node.yMin, max: node.yMax, log })

  const notes = sharedNotes(node, [{ axis, name: 'value axis' }])
  if (hidden) notes.push(`${hidden} ${hidden === 1 ? 'value is' : 'values are'} zero or negative: on a logarithmic axis ${hidden === 1 ? 'it' : 'they'} cannot be shown, and the means, medians and error bars are worked out without ${hidden === 1 ? 'it' : 'them'}.`)
  if (node.kind === 'violin' && live.some((c) => !violinOf(c.group.values, log))) notes.push(VIOLIN_NOTE)

  const names = grouped ? cats : cols.map((c) => c.group.name)
  const fitNames = (pw: number, fs: number): string[] => names.map((name) => fitName(name, (pw / Math.max(1, names.length)) * 0.94, fs))

  /** Draw the chart with `headroom` units kept free above the data for brackets; returns how much more is needed. */
  const draw = (headroom: number): { out: ChartDrawing; short: number; room: number } => {
    const out = empty()
    out.notes = [...notes]
    const f = frame(node, out, axis, grouped ? series : [], 8, (pw, fs) => Math.max(...fitNames(pw, fs).map((t) => t.split('\n').length), 1))
    const { fs, words, rule, px, py, pw, ph } = f
    const line = (x1: number, y1: number, x2: number, y2: number, width = 1.2) => out.lines.push({ x1: r1(x1), y1: r1(y1), x2: r1(x2), y2: r1(y2), width })
    const top = py + headroom
    const y = (v: number): number => top + (1 - axis.at(v)) * (py + ph - top)
    const base = y(log ? axis.min : Math.max(axis.min, Math.min(axis.max, 0)))
    const dot = Math.max(1.8, fs * 0.2)

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
      c.cx = node.kind === 'line' ? px + slot * (cat + 0.5) : px + slot * cat + (slot - inner) / 2 + sub * (place + 0.5)
      c.width = node.kind === 'line' ? slot * 0.5 : sub
    })

    const points = (c: Column, radius: number, fill: string) => {
      // Values are spread sideways in a fixed pattern, so the same data always gives the same picture.
      const spread = c.width * 0.16
      c.values.forEach((v, j) => out.circles.push({ cx: r1(c.cx + (((j * 3) % 7) - 3) / 3 * spread), cy: r1(y(v)), r: r1(radius), fill }))
    }

    for (const c of live) {
      const { cx, s } = c
      const cap = Math.min(10, c.width * 0.12)
      let dots = showPoints
      // A violin that cannot be drawn (too few values, or all the same) is shown as dots in its colour.
      const violin = node.kind === 'violin' ? violinOf(c.group.values, log) : null
      const asDots = node.kind === 'violin' && !violin
      if (node.kind === 'bar' && (!log || s.mean > 0)) {
        const width = c.width * (grouped ? 0.86 : 0.6)
        const yMean = y(s.mean)
        out.rects.push({ x: r1(cx - width / 2), y: r1(Math.min(yMean, base)), w: r1(width), h: r1(Math.abs(base - yMean)), fill: c.colour })
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
        if (!showPoints) for (const v of b.outliers) out.circles.push({ cx: r1(cx), cy: r1(y(v)), r: r1(dot * 1.2), fill: INK, ring: true })
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
        const low = log && s.mean - c.err <= 0 ? null : s.mean - c.err
        line(cx, low === null ? py + ph : y(low), cx, y(s.mean + c.err))
        line(cx - cap, y(s.mean + c.err), cx + cap, y(s.mean + c.err))
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
        out.paths.push({ d: ok.map((c, i) => `${i ? 'L' : 'M'}${r1(c.cx)} ${r1(y(c.s.mean))}`).join(''), stroke: colour, width: 2 })
        for (const c of ok) out.circles.push({ cx: r1(c.cx), cy: r1(y(c.s.mean)), r: r1(dot * 1.5), fill: colour })
      }
    }

    // Names along the bottom: the categories of a grouped chart, otherwise every group. A name
    // wider than its place is broken into lines.
    const labels = fitNames(pw, fs)
    if (grouped) cats.forEach((_, i) => out.texts.push(words(labels[i], px + slot * (i + 0.5), py + ph + 5)))
    else cols.forEach((c, i) => out.texts.push(words(labels[i], c.cx, py + ph + 5)))

    // Brackets stand a little above what is drawn for the columns they span (a bar reaches zero
    // even when its mean is negative; nothing is drawn beyond the ends of the axis). A wider
    // bracket goes over a narrower one.
    const reachOf = (c: Column): number => Math.max(axis.min, Math.min(axis.max, node.kind === 'bar' && !log ? Math.max(c.hi, 0) : c.hi))
    const step = fs * 1.25 + fs * 0.35 + 5
    const placed: { x1: number; x2: number; y: number }[] = []
    let highest = py
    const wanted = (node.brackets ?? [])
      .map((b) => ({ a: live.find((c) => c.index === b.from), b: live.find((c) => c.index === b.to), label: b.label }))
      .filter((b): b is { a: Column; b: Column; label: string } => !!b.a && !!b.b && b.a !== b.b)
      .map((b) => ({ x1: Math.min(b.a.cx, b.b.cx), x2: Math.max(b.a.cx, b.b.cx), label: b.label }))
      .sort((p, q) => p.x2 - p.x1 - (q.x2 - q.x1) || p.x1 - q.x1)
    for (const b of wanted) {
      const under = live.filter((c) => c.cx >= b.x1 - 0.5 && c.cx <= b.x2 + 0.5)
      let at = Math.min(...under.map((c) => y(reachOf(c)))) - fs * 0.6
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
      rule(b.x1, at, b.x2, at)
      rule(b.x1, at, b.x1, at + tick)
      rule(b.x2, at, b.x2, at + tick)
      if (b.label) out.texts.push(words(b.label, (b.x1 + b.x2) / 2, at - fs * 1.25 - 1))
      highest = Math.min(highest, at - fs * 1.25 - 1)
    }

    // Axes last: the value axis on the left (as tall as the data), the base line under the columns.
    drawValueAxis(f, axis, y, out, top)
    rule(px, base, px + pw, base)
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
  if (result.short > 0.5) result.out.notes.push(BRACKET_NOTE)
  return result.out
}

/** One series of a scatter chart: its points as they can be shown, and the line fitted to them. */
interface Series {
  name: string
  colour: string
  points: [number, number][]
  fit: Fit | null
}

/** The points of every series that can be shown on the chart's axes, and the fitted lines. */
function scatterSeries(node: ChartNode): { series: Series[]; hidden: number } {
  let hidden = 0
  const series = drawnGroups(node).map((c, i) => {
    const pairs = c.group.values.map((v, k) => [c.group.xs?.[k] ?? NaN, v] as [number, number]).filter(([x, v]) => Number.isFinite(x) && Number.isFinite(v))
    const points = pairs.filter(([x, v]) => (!node.xLog || x > 0) && (!node.yLog || v > 0))
    hidden += pairs.length - points.length
    // The line is fitted to the values as they are plotted: to their logarithms on a logarithmic axis.
    const plotted = points.map(([x, v]) => [node.xLog ? Math.log10(x) : x, node.yLog ? Math.log10(v) : v] as [number, number])
    return { name: c.group.name, colour: groupColour(c.group, i), points, fit: fitLine(plotted) }
  })
  return { series, hidden }
}

/** For the panel: every series of a scatter chart with the number of points shown and its fitted line (null where none can be fitted). */
export const scatterFits = (node: ChartNode): { name: string; points: number; fit: Fit | null }[] => scatterSeries(node).series.map((s) => ({ name: s.name, points: s.points.length, fit: s.fit }))

/** An axis for scattered values: it starts at zero when the smallest value is near zero, otherwise near the data. */
function scatterAxis(values: number[], opts: { min?: number; max?: number; log?: boolean }): Axis {
  const lo = values.length ? Math.min(...values) : 0
  const hi = values.length ? Math.max(...values) : 1
  return axisFor(opts.log || lo < 0 || lo > hi * 0.5 ? lo : 0, hi, opts)
}

/** A scatter chart: points on two numeric axes, with an optional straight line fitted to each series. */
function scatterLayout(node: ChartNode): ChartDrawing {
  const out = empty()
  const { series, hidden } = scatterSeries(node)
  const all = series.flatMap((s) => s.points)
  const xAxis = scatterAxis(all.map((p) => p[0]), { min: node.xMin, max: node.xMax, log: node.xLog })

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
  const lineEnds = series.map(fitEnds).map((ends) => (ends.every(([, v]) => usable(v) && (!node.yLog || v > 0)) ? ends : []))
  const yAxis = scatterAxis([...all.map((p) => p[1]), ...lineEnds.flat().map((p) => p[1])], { min: node.yMin, max: node.yMax, log: node.yLog })

  out.notes = sharedNotes(node, [{ axis: yAxis, name: 'y axis' }, { axis: xAxis, name: 'x axis' }])
  if (hidden) out.notes.push(`${hidden} ${hidden === 1 ? 'point is' : 'points are'} zero or negative on a logarithmic axis: ${hidden === 1 ? 'it' : 'they'} cannot be shown, and the fitted line is worked out without ${hidden === 1 ? 'it' : 'them'}.`)

  // The last number along the bottom is centred under the end of the axis: keep room for half of it.
  const fs = node.fontSize ?? CHART_FONT
  const widest = Math.max(...xAxis.ticks.map((t) => textWidth(t.label, fs)))
  const f = frame(node, out, yAxis, series.length > 1 ? series.map((s) => ({ name: s.name, colour: s.colour })) : [], Math.max(fs, widest / 2 + 2), () => 1)
  const { words, rule, px, py, pw, ph } = f
  const x = (v: number): number => px + xAxis.at(v) * pw
  const y = (v: number): number => py + (1 - yAxis.at(v)) * ph
  const dot = Math.max(2.2, fs * 0.26)

  series.forEach((s, i) => {
    const ends = lineEnds[i].map(([vx, vy]) => [x(vx), y(vy)])
    if (ends.length === 2 && ends.flat().every((v) => Number.isFinite(v))) out.paths.push({ d: `M${ends.map((e) => `${r1(e[0])} ${r1(e[1])}`).join('L')}`, stroke: s.colour, width: 2 })
    for (const [vx, vy] of s.points) out.circles.push({ cx: r1(x(vx)), cy: r1(y(vy)), r: r1(dot), fill: s.colour })
  })

  drawValueAxis(f, yAxis, y, out, py)
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
  if (!all.length) out.texts.push(words('Paste your numbers in the panel', px + pw / 2, py + ph / 2 - fs, { fill: '#8a93a3', italic: true }))
  return out
}

/**
 * Everything a chart is made of, in the chart's own box (its top-left corner is 0, 0).
 * The value axis of bars, dots, boxes, violins and lines includes zero unless it is logarithmic
 * or the scientist set its ends.
 */
export function chartLayout(node: ChartNode): ChartDrawing {
  return node.kind === 'scatter' ? scatterLayout(node) : columnLayout(node)
}
