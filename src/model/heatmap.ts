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

// ---------- putting rows and columns that are alike next to each other ----------

/**
 * The tree of a hierarchical clustering, as R's `hclust` gives it. `merge` has one entry per
 * joining, in the order they were made: a number below zero is a single row (-1 the first), one
 * above zero an earlier joining (1 the first). `height` is the distance at which each was made,
 * `order` the rows from one end of the tree to the other (1 the first row of the table).
 */
export interface Dendrogram {
  merge: [number, number][]
  height: number[]
  order: number[]
}

/**
 * Hierarchical clustering of the rows of a matrix by the defaults of R: Euclidean distance
 * (`dist`; a column in which one of two rows has no value is left out for that pair, and the
 * distance scaled up for it) and complete linkage (`hclust`: two clusters are as far apart as
 * their two most distant rows). Null when there is nothing to join, or two rows have no column
 * in which both hold a value.
 */
export function cluster(rows: (number | null)[][]): Dendrogram | null {
  const n = rows.length
  const p = Math.max(0, ...rows.map((r) => r.length))
  if (n < 2 || !p) return null
  const d: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0))
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let sum = 0
      let both = 0
      for (let c = 0; c < p; c++) {
        const [a, b] = [rows[i][c], rows[j][c]]
        if (a === null || b === null || a === undefined || b === undefined) continue
        sum += (a - b) ** 2
        both++
      }
      if (!both) return null
      d[i][j] = d[j][i] = Math.sqrt((sum * p) / both)
    }
  }
  // Join the two nearest clusters until one is left. A cluster goes by the first of its rows.
  const active = new Array<boolean>(n).fill(true)
  const first: number[] = []
  const second: number[] = []
  const height: number[] = []
  for (let step = 0; step < n - 1; step++) {
    let best = Infinity
    let [bi, bj] = [-1, -1]
    for (let i = 0; i < n; i++) {
      if (!active[i]) continue
      for (let j = i + 1; j < n; j++) if (active[j] && d[i][j] < best) [best, bi, bj] = [d[i][j], i, j]
    }
    first.push(bi + 1)
    second.push(bj + 1)
    height.push(best)
    for (let k = 0; k < n; k++) if (active[k] && k !== bi && k !== bj) d[bi][k] = d[k][bi] = Math.max(d[bi][k], d[bj][k])
    active[bj] = false
  }
  // The joinings in R's own writing (single rows below zero and first, the earlier of two clusters first).
  const a = first.slice()
  const b = second.slice()
  for (let i = 0; i < n - 2; i++) {
    const k = Math.min(first[i], second[i])
    for (let j = i + 1; j < n - 1; j++) {
      if (first[j] === k) a[j] = -(i + 1)
      if (second[j] === k) b[j] = -(i + 1)
    }
  }
  const merge: [number, number][] = a.map((v, i) => {
    const [x, y] = [-v, -b[i]]
    if (x > 0 && y < 0) return [y, x]
    if (x > 0 && y > 0) return [Math.min(x, y), Math.max(x, y)]
    return [x, y]
  })
  // The order of the leaves: the last joining, with every cluster opened into its two parts in place.
  let order: number[] = [...merge[n - 2]]
  for (let i = n - 2; i >= 1; i--) {
    const at = order.indexOf(i)
    if (at >= 0) order = [...order.slice(0, at), ...merge[i - 1], ...order.slice(at + 1)]
  }
  return { merge, height, order: order.map((v) => -v) }
}

/**
 * The lines of a tree, for drawing it beside the cells: each from one place to another, a place
 * being how far along the leaves it is (the first leaf at 0.5, the next at 1.5) and how high (0 at
 * the leaves, 1 at the last joining).
 */
export function treeLines(tree: Dendrogram): { from: [number, number]; to: [number, number] }[] {
  const top = Math.max(...tree.height, 0) || 1
  const leafAt = new Map(tree.order.map((leaf, i) => [leaf, i + 0.5]))
  // Where each joining sits: halfway between the two things it joins, at its height.
  const joined: { along: number; high: number }[] = []
  const place = (v: number): { along: number; high: number } => (v < 0 ? { along: leafAt.get(-v) ?? 0, high: 0 } : joined[v - 1])
  const lines: { from: [number, number]; to: [number, number] }[] = []
  tree.merge.forEach(([x, y], i) => {
    const [l, r] = [place(x), place(y)]
    const high = tree.height[i] / top
    lines.push({ from: [l.along, l.high], to: [l.along, high] }, { from: [r.along, r.high], to: [r.along, high] }, { from: [l.along, high], to: [r.along, high] })
    joined.push({ along: (l.along + r.along) / 2, high })
  })
  return lines
}

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
  /**
   * The trees of the rows and of the columns when they are clustered, and where each row and
   * column that is drawn stands in the table (the same order as the table when they are not).
   */
  rowTree?: Dendrogram
  colTree?: Dendrogram
  rowOrder: number[]
  colOrder: number[]
}

const rowOf = (g: ChartGroup, k: number): number => g.rows?.[k] ?? k
const columnName = (g: ChartGroup): string => (g.category ? `${g.category} · ${g.name}` : g.name)

const worked = new WeakMap<ChartGroup[], Map<string, HeatMatrix>>()

/** What a heat map of this chart shows. Worked out once for a table and the settings that matter to it. */
export function heatMatrix(node: ChartNode): HeatMatrix {
  const key = [node.corr ?? '', !!node.yLog, !!node.heatByRow, node.heatCluster ?? '', node.heatScale ?? '', node.yMin ?? '', node.yMax ?? ''].join('|')
  let known = worked.get(node.groups)
  if (!known) worked.set(node.groups, (known = new Map()))
  let matrix = known.get(key)
  if (!matrix) known.set(key, (matrix = work(node)))
  return matrix
}

function work(node: ChartNode): HeatMatrix {
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
  // Clustering: rows (or columns) that are alike are put next to each other, by what the cells show.
  let rowOrder = cells.map((_, i) => i)
  let colOrder = columns.map((_, i) => i)
  let rowTree: Dendrogram | undefined
  let colTree: Dendrogram | undefined
  const want = node.heatCluster
  // A table of correlations is the same read across and down: it is ordered both ways or not at all.
  const byRows = want === 'rows' || want === 'both' || (unit === 'r' && !!want)
  const byCols = want === 'columns' || want === 'both' || (unit === 'r' && !!want)
  if (byRows) {
    rowTree = cluster(cells) ?? undefined
    if (rowTree) rowOrder = rowTree.order.map((v) => v - 1)
    else if (cells.length > 1) notes.push('The rows cannot be put in order by likeness: two of them have no column in which both hold a number. They stand in the order of the table.')
  }
  if (byCols) {
    colTree = (unit === 'r' ? rowTree : cluster(columns.map((_, c) => cells.map((row) => row[c])))) ?? undefined
    if (colTree) colOrder = colTree.order.map((v) => v - 1)
    else if (columns.length > 1 && unit !== 'r') notes.push('The columns cannot be put in order by likeness: two of them have no row in which both hold a number. They stand in the order of the table.')
  }
  if (rowTree || colTree) {
    const pick = (grid: (number | null)[][]): (number | null)[][] => rowOrder.map((r) => colOrder.map((c) => grid[r][c]))
    ;[cells, shown] = [pick(cells), shown === cells ? [] : pick(shown)]
    if (!shown.length) shown = cells
    rows = rowOrder.map((r) => rows[r])
    columns = colOrder.map((c) => columns[c])
  }
  return { columns, rows, cells, shown, unit, lo, hi, scale, notes, rowOrder, colOrder, ...(rowTree ? { rowTree } : {}), ...(colTree ? { colTree } : {}) }
}

/** A heat map in a line of words: how large it is and what its colours run between. */
export function heatSummary(m: HeatMatrix): string {
  const end = (v: number): string => String(Number((m.unit === 'log' ? 10 ** v : v).toPrecision(3)))
  const what = m.unit === 'r' ? 'correlations' : m.unit === 'z' ? 'z-scores within each row' : m.unit === 'log' ? 'values, on a logarithmic scale' : 'values'
  const size = m.unit === 'r' ? `${m.columns.length} columns, each with every other` : `${m.cells.length} ${m.cells.length === 1 ? 'row' : 'rows'} and ${m.columns.length} ${m.columns.length === 1 ? 'column' : 'columns'}`
  const ordered = m.rowTree && m.colTree ? 'Rows and columns' : m.rowTree ? 'Rows' : m.colTree ? 'Columns' : ''
  const tree = ordered ? ` ${ordered} that are alike stand next to each other (hierarchical clustering: Euclidean distance, complete linkage).` : ''
  return `${size}. The colours show ${what} from ${end(m.lo)} to ${end(m.hi)}.${tree}`
}

/** The colour of a cell that holds `v`. */
export const cellColour = (m: HeatMatrix, v: number): string => heatColour(m.scale, (v - m.lo) / (m.hi - m.lo))
