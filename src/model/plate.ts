// A picture of a 96- or 384-well plate: rows A to H (or P) down the side, columns 1 to 12 (or 24)
// across the top, every well a circle coloured by what it holds (a condition, a sample, a target),
// with a number written inside where there is room, a red ring round a well that needs a look, and a
// legend under the plate. It is laid out once (`platePicture`) and then either shown in the panel or
// put on the page as ordinary objects (`plateNodes`): circles, words and a rounded box in one group,
// so the panel shows exactly what lands on the page. What a well holds comes from the analysis that
// uses the plate (`qpcrPlate` in qpcr.ts); this file knows nothing of qPCR. Pure.

import { readableOn } from './chart'
import { measureText } from './nodes'
import { paletteColours } from './palettes'
import { wellName } from './tableRoles'
import { LINE_HEIGHT, type FigNode, type ShapeNode, type TextNode } from './types'

export type PlateSize = 96 | 384

export const PLATE_DIMS: Record<PlateSize, { rows: number; cols: number }> = { 96: { rows: 8, cols: 12 }, 384: { rows: 16, cols: 24 } }

/** Row and column of a well, counted from 0: "B3" is row 1, column 2. Null when it is no well. */
export function wellPlace(well: string): { row: number; col: number } | null {
  const name = wellName(well)
  if (!name) return null
  return { row: name.charCodeAt(0) - 65, col: Number(name.slice(1)) - 1 }
}

/** The smallest plate that has every well named: 384 as soon as a well lies beyond row H or column 12. */
export function plateSizeOf(wells: string[]): PlateSize {
  return wells.some((w) => {
    const p = wellPlace(w)
    return !!p && (p.row >= 8 || p.col >= 12)
  })
    ? 384
    : 96
}

/** What one well holds, as the analysis tells it. A well can hold several (a multiplex reaction). */
export interface PlateEntry {
  well: string
  /** What decides its colour: a condition, a sample or a target. */
  key: string
  /** Written inside the well when there is room (a Cq). */
  text?: string
  /** One line shown when the well is pressed: "LPS 2, IL6, Cq 24.31". */
  detail: string
  /** Wells with the same set are replicates of each other; pressing one shows the others. */
  set?: string
  /** Why the well is ringed in red, in words. */
  flag?: string
}

export interface PlateWellMark {
  well: string
  row: number
  col: number
  cx: number
  cy: number
  r: number
  /** Null for an empty well. */
  fill: string | null
  entries: PlateEntry[]
  flagged: boolean
}

export interface PlatePicture {
  size: PlateSize
  w: number
  h: number
  /** The plate's own box; the legend lies under it. */
  plate: { w: number; h: number }
  wells: PlateWellMark[]
  rowLabels: { text: string; x: number; y: number }[]
  colLabels: { text: string; x: number; y: number }[]
  legend: { key: string; fill: string; x: number; y: number }[]
  /** Sizes of the letters: row and column names, the numbers in the wells, the legend. */
  labelSize: number
  valueSize: number
  legendSize: number
  /** Whether numbers are written in the wells. */
  values: boolean
  /** The colour of each key, in the order the keys first appear on the plate (row by row). */
  colours: Map<string, string>
}

export const EMPTY_WELL = '#ffffff'
export const FLAG = '#d1343a'
const INK = '#1f2933'
const RIM = '#8a94a3'
const PLATE_FILL = '#f4f5f8'
const EMPTY_RIM = '#c3cad5'

const textWidth = (text: string, fontSize: number): number => measureText({ id: '', type: 'text', x: 0, y: 0, text, fontSize, fill: INK, align: 'left', rotation: 0 }).w

/**
 * The plate laid out from (0, 0). Keys are coloured from the palette in the order they first appear
 * on the plate, row by row; with more keys than colours the colours repeat (the legend still names
 * each). Numbers are written in the wells of a 96-well plate only, unless `values` is false.
 */
export function platePicture(entries: PlateEntry[], options: { palette?: string; values?: boolean; size?: PlateSize } = {}): PlatePicture {
  const usable = entries.filter((e) => wellPlace(e.well))
  const size = options.size ?? plateSizeOf(usable.map((e) => e.well))
  const { rows, cols } = PLATE_DIMS[size]
  const big = size === 96
  const cell = big ? 30 : 16
  const r = big ? 12.5 : 6.5
  const labelSize = big ? 10 : 7
  const valueSize = 7.5
  const legendSize = big ? 10 : 9
  const left = big ? 22 : 16
  const top = big ? 20 : 14
  const pad = 6
  const plateW = left + cols * cell + pad
  const plateH = top + rows * cell + pad
  const byWell = new Map<string, PlateEntry[]>()
  for (const e of usable) {
    const name = wellName(e.well)!
    if (!byWell.has(name)) byWell.set(name, [])
    byWell.get(name)!.push(e)
  }
  // Keys in plate order, so the legend reads like the plate.
  const order = [...byWell.keys()].sort((a, b) => {
    const pa = wellPlace(a)!
    const pb = wellPlace(b)!
    return pa.row - pb.row || pa.col - pb.col
  })
  const palette = paletteColours(options.palette)
  const colours = new Map<string, string>()
  for (const w of order) for (const e of byWell.get(w)!) if (!colours.has(e.key)) colours.set(e.key, palette[colours.size % palette.length])
  const wells: PlateWellMark[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const well = `${String.fromCharCode(65 + row)}${col + 1}`
      const held = byWell.get(well) ?? []
      wells.push({ well, row, col, cx: left + col * cell + cell / 2, cy: top + row * cell + cell / 2, r, fill: held.length ? colours.get(held[0].key)! : null, entries: held, flagged: held.some((e) => !!e.flag) })
    }
  }
  const rowLabels = Array.from({ length: rows }, (_, row) => ({ text: String.fromCharCode(65 + row), x: left / 2 + 1, y: top + row * cell + cell / 2 }))
  const colLabels = Array.from({ length: cols }, (_, col) => ({ text: String(col + 1), x: left + col * cell + cell / 2, y: top / 2 + 1 }))
  // The legend: a swatch and the key, side by side, on as many lines as the plate's width needs.
  const legend: PlatePicture['legend'] = []
  const lineH = legendSize * 1.7
  let x = 0
  let y = plateH + 10 + lineH / 2
  for (const [key, fill] of colours) {
    const w = 14 + textWidth(key, legendSize) + 14
    if (x > 0 && x + w > plateW) {
      x = 0
      y += lineH
    }
    legend.push({ key, fill, x, y })
    x += w
  }
  const h = legend.length ? y + lineH / 2 : plateH
  return { size, w: plateW, h, plate: { w: plateW, h: plateH }, wells, rowLabels, colLabels, legend, labelSize, valueSize, legendSize, values: big && options.values !== false, colours }
}

/** The well under a point of the picture, within its cell. */
export function wellAt(p: PlatePicture, x: number, y: number): PlateWellMark | null {
  const cell = p.size === 96 ? 30 : 16
  let best: PlateWellMark | null = null
  let near = Infinity
  for (const w of p.wells) {
    const d = Math.hypot(w.cx - x, w.cy - y)
    if (d < near) {
      near = d
      best = w
    }
  }
  return best && near <= cell * 0.6 ? best : null
}

/**
 * The picture as objects of a figure, from (0, 0), in one group, with counted ids (`plate-1`…) for
 * the caller to replace: the plate a rounded box, every well a circle, the names of rows and columns,
 * the numbers in the wells and the legend as words.
 */
export function plateNodes(p: PlatePicture): FigNode[] {
  let n = 0
  const id = () => `plate-${++n}`
  const groupId = 'plate-group'
  const nodes: FigNode[] = []
  const text = (x: number, cy: number, words: string, fontSize: number, extra: Partial<TextNode> = {}): TextNode => ({
    id: id(),
    type: 'text',
    x,
    y: cy - (fontSize * LINE_HEIGHT) / 2,
    text: words,
    fontSize,
    fill: INK,
    align: 'center',
    rotation: 0,
    groupId,
    ...extra,
  })
  nodes.push({ id: id(), type: 'shape', shape: 'roundrect', x: 0, y: 0, w: p.plate.w, h: p.plate.h, rotation: 0, fill: PLATE_FILL, stroke: RIM, strokeWidth: 1, groupId } satisfies ShapeNode)
  for (const l of p.rowLabels) nodes.push(text(l.x, l.y, l.text, p.labelSize, { fill: '#56606e', bold: true }))
  for (const l of p.colLabels) nodes.push(text(l.x, l.y, l.text, p.labelSize, { fill: '#56606e', bold: true }))
  for (const w of p.wells) {
    nodes.push({
      id: id(),
      type: 'shape',
      shape: 'ellipse',
      x: w.cx - w.r,
      y: w.cy - w.r,
      w: w.r * 2,
      h: w.r * 2,
      rotation: 0,
      fill: w.fill ?? EMPTY_WELL,
      stroke: w.flagged ? FLAG : w.fill ? '#5b6573' : EMPTY_RIM,
      strokeWidth: w.flagged ? 2 : 0.75,
      groupId,
    } satisfies ShapeNode)
    const value = w.entries[0]?.text
    if (p.values && value) nodes.push(text(w.cx, w.cy, value, p.valueSize, { fill: readableOn(w.fill ?? EMPTY_WELL) }))
  }
  for (const l of p.legend) {
    nodes.push({ id: id(), type: 'shape', shape: 'ellipse', x: l.x, y: l.y - 5, w: 10, h: 10, rotation: 0, fill: l.fill, stroke: '#5b6573', strokeWidth: 0.75, groupId } satisfies ShapeNode)
    nodes.push(text(l.x + 14, l.y, l.key, p.legendSize, { align: 'left' }))
  }
  return nodes
}
