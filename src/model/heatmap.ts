// A heat map: the table of a chart drawn as a grid of coloured cells, one row of the table per
// row of cells and one group per column. Here is the arithmetic: which number each cell holds
// (the value, the z-score within its row, or the correlation of two columns), where the colour
// scale begins and ends, and the colours themselves. The cells are placed in chart.ts.

import { correlation } from './chartStats'
import type { ChartGroup, ChartNode, HeatScale } from './types'

export interface HeatScaleDef {
  id: HeatScale
  name: string
  /** Two colours that part from a light middle: for numbers on either side of a middle value (zero, no change). */
  diverging: boolean
  /** The colours from the lowest value to the highest; those between are mixed evenly from their neighbours. */
  stops: string[]
  about: string
}

/**
 * The colour scales. The stops are copied from their sources so that a scale can be named in a
 * legend: `viridisLite::viridis(5)` of R, and ColorBrewer's Blues, Greys, RdBu and PuOr (the last
 * two turned round, so that the low end is the cool colour).
 */
export const HEAT_SCALES: HeatScaleDef[] = [
  { id: 'viridis', name: 'Viridis', diverging: false, stops: ['#440154', '#3B528B', '#21908C', '#5DC863', '#FDE725'], about: 'From dark purple to yellow. Colour-blind friendly, and still readable when printed in grey.' },
  { id: 'blues', name: 'Blues', diverging: false, stops: ['#EFF3FF', '#BDD7E7', '#6BAED6', '#3182BD', '#08519C'], about: 'From almost white to dark blue (ColorBrewer): the more, the darker.' },
  { id: 'greys', name: 'Greys', diverging: false, stops: ['#F7F7F7', '#CCCCCC', '#969696', '#636363', '#252525'], about: 'From almost white to almost black (ColorBrewer), for figures printed without colour.' },
  { id: 'bluered', name: 'Blue, white, red', diverging: true, stops: ['#2166AC', '#67A9CF', '#D1E5F0', '#F7F7F7', '#FDDBC7', '#EF8A62', '#B2182B'], about: 'Blue below the middle, red above it, white at the middle (ColorBrewer RdBu): for values on both sides of zero, such as z-scores, log fold changes and correlations.' },
  { id: 'purpleorange', name: 'Purple, white, orange', diverging: true, stops: ['#542788', '#998EC3', '#D8DAEB', '#F7F7F7', '#FEE0B6', '#F1A340', '#B35806'], about: 'Purple below the middle, orange above it (ColorBrewer PuOr): like blue and red, and colour-blind friendly.' },
]

export const heatScaleDef = (id: unknown): HeatScaleDef | undefined => HEAT_SCALES.find((s) => s.id === id)

const channels = (hex: string): [number, number, number] => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16)) as [number, number, number]

/** The colour a share `t` of the way along a scale (0 = its low end, 1 = its high end). */
export function heatColour(scale: HeatScaleDef, t: number): string {
  const along = (Number.isFinite(t) ? Math.min(1, Math.max(0, t)) : 0.5) * (scale.stops.length - 1)
  const from = Math.min(scale.stops.length - 2, Math.floor(along))
  const [a, b] = [channels(scale.stops[from]), channels(scale.stops[from + 1])]
  const mix = a.map((v, k) => Math.round(v + (b[k] - v) * (along - from)))
  return `#${mix.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/** The most rows a heat map draws. */
export const HEAT_ROWS = 400

export interface HeatMatrix {
  /** The name over each column, and beside each row ('' where the table gives none). */
  columns: string[]
  rows: string[]
  /** The number each cell is coloured by, row by row: null where the table has none or it cannot be shown. */
  cells: (number | null)[][]
  /** The number written in a cell when numbers are asked for: the value as typed, the z-score, or r. */
  shown: (number | null)[][]
  /** What the colours stand for: values, their logarithms (base 10), z-scores within a row, or correlations. */
  unit: 'value' | 'log' | 'z' | 'r'
  /** The ends of the colour scale, in the unit of `cells`. */
  lo: number
  hi: number
  scale: HeatScaleDef
  notes: string[]
}

const rowOf = (g: ChartGroup, k: number): number => g.rows?.[k] ?? k
const columnName = (g: ChartGroup): string => (g.category ? `${g.category} · ${g.name}` : g.name)

/** What a heat map of this chart shows. */
export function heatMatrix(node: ChartNode): HeatMatrix {
  const cols = node.groups.filter((g) => g.values.length)
  const notes: string[] = []
  const all = Math.max(0, ...cols.map((g) => rowOf(g, g.values.length - 1) + 1))
  let unit: HeatMatrix['unit'] = 'value'
  let columns = cols.map(columnName)
  let rows: string[] = []
  let cells: (number | null)[][] = []
  let shown: (number | null)[][] = []

  if (node.corr) {
    // Every column with every other, over the rows in which both have a value.
    unit = 'r'
    const at = cols.map((g) => new Map(g.values.map((v, k) => [rowOf(g, k), v])))
    cells = cols.map((_, i) =>
      cols.map((__, j) => {
        const pairs: [number, number][] = []
        for (const [row, v] of at[i]) if (at[j].has(row)) pairs.push([v, at[j].get(row)!])
        return correlation(pairs, node.corr!)?.r ?? null
      }),
    )
    shown = cells
    rows = columns
    if (cells.some((row) => row.some((v) => v === null))) notes.push('A correlation needs at least three rows with a value in both columns, and values that are not all the same: where it cannot be worked out, the cell is left empty.')
  } else {
    const count = Math.min(all, HEAT_ROWS)
    if (all > count) notes.push(`A heat map draws at most ${HEAT_ROWS} rows: the first ${HEAT_ROWS} of the ${all} in the table are shown.`)
    const raw: (number | null)[][] = Array.from({ length: count }, () => cols.map(() => null))
    rows = Array.from({ length: count }, () => '')
    cols.forEach((g, c) => {
      g.values.forEach((v, k) => {
        const r = rowOf(g, k)
        if (r >= count) return
        raw[r][c] = v
        if (!rows[r] && g.labels?.[k]) rows[r] = g.labels[k]
      })
    })
    shown = raw
    cells = raw
    if (node.yLog) {
      unit = 'log'
      let none = 0
      cells = raw.map((row) =>
        row.map((v) => {
          if (v === null) return null
          if (v > 0) return Math.log10(v)
          none++
          return null
        }),
      )
      if (none) notes.push(`${none} ${none === 1 ? 'value is' : 'values are'} zero or below and cannot be shown on a logarithmic colour scale: ${none === 1 ? 'its cell is' : 'their cells are'} left empty.`)
    }
    if (node.heatByRow) {
      unit = 'z'
      let flat = 0
      cells = cells.map((row) => {
        const have = row.filter((v): v is number => v !== null)
        const mean = have.reduce((a, v) => a + v, 0) / (have.length || 1)
        const sd = have.length > 1 ? Math.sqrt(have.reduce((a, v) => a + (v - mean) ** 2, 0) / (have.length - 1)) : 0
        if (!(sd > 0)) {
          if (have.length) flat++
          return row.map(() => null)
        }
        return row.map((v) => (v === null ? null : (v - mean) / sd))
      })
      shown = cells
      if (flat) notes.push(`${flat} ${flat === 1 ? 'row has' : 'rows have'} one value only, or values that are all the same: such a row has no spread to scale by and is left empty.`)
    }
  }

  const scale = heatScaleDef(node.heatScale) ?? HEAT_SCALES.find((s) => s.id === (unit === 'r' || unit === 'z' ? 'bluered' : 'viridis'))!
  const flatCells = cells.flat().filter((v): v is number => v !== null && Number.isFinite(v))
  let lo = flatCells.length ? flatCells.reduce((a, v) => Math.min(a, v), Infinity) : 0
  let hi = flatCells.length ? flatCells.reduce((a, v) => Math.max(a, v), -Infinity) : 1
  if (unit === 'r') [lo, hi] = [-1, 1]
  else {
    // An end the scientist set is given as the values are typed: on a logarithmic scale it is turned into its logarithm.
    const end = (v: number | undefined): number | undefined => (v === undefined || !Number.isFinite(v) ? undefined : unit === 'log' ? (v > 0 ? Math.log10(v) : undefined) : v)
    const [setLo, setHi] = [end(node.yMin), end(node.yMax)]
    // Two colours that part from a middle keep that middle at zero (on a logarithmic scale: at 1) unless an end is set.
    if (scale.diverging && setLo === undefined && setHi === undefined) {
      const reach = Math.max(Math.abs(lo), Math.abs(hi))
      ;[lo, hi] = [-reach, reach]
    }
    if (setLo !== undefined) lo = setLo
    if (setHi !== undefined) hi = setHi
    if (!(hi > lo)) {
      // One value only, or ends that contradict each other: a scale of some width around what there is.
      const mid = Number.isFinite(lo) ? lo : 0
      ;[lo, hi] = [mid - 0.5, mid + 0.5]
    }
  }
  return { columns, rows, cells, shown, unit, lo, hi, scale, notes }
}

/** A heat map in a line of words: how large it is and what its colours run between. */
export function heatSummary(m: HeatMatrix): string {
  const end = (v: number): string => String(Number((m.unit === 'log' ? 10 ** v : v).toPrecision(3)))
  const what = m.unit === 'r' ? 'correlations' : m.unit === 'z' ? 'z-scores within each row' : m.unit === 'log' ? 'values, on a logarithmic scale' : 'values'
  const size = m.unit === 'r' ? `${m.columns.length} columns, each with every other` : `${m.cells.length} ${m.cells.length === 1 ? 'row' : 'rows'} and ${m.columns.length} ${m.columns.length === 1 ? 'column' : 'columns'}`
  return `${size}. The colours show ${what} from ${end(m.lo)} to ${end(m.hi)}.`
}

/** The colour of a cell that holds `v`. */
export const cellColour = (m: HeatMatrix, v: number): string => heatColour(m.scale, (v - m.lo) / (m.hi - m.lo))
