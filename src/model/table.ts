// A table as an object of the figure: rows and columns of words and numbers, pasted from a
// spreadsheet or typed. Here the pasted text is read into cells, and the table is laid out as
// tinted grounds, lines and lettering in its own box; the renderer only draws that list, so the
// page and every export agree. The words of a cell go through the label renderer: the usual marks
// (raised, lowered, italic, bold) work in a table too.

import { measureText, wrapText } from './nodes'
import { LINE_HEIGHT, type TableNode, type TextNode } from './types'

export const TABLE_ROWS_MAX = 60
export const TABLE_COLS_MAX = 16
/** The longest text one cell holds. */
export const CELL_MAX = 300
export const TABLE_FONT = 14
const INK = '#1f2933'
export const TABLE_HEAD_FILL = '#e8ecf1'
export const TABLE_LINE = '#8892a0'
const STRIPE = '#f4f6f8'

export type TableLines = NonNullable<TableNode['lines']> | 'grid'

/**
 * The cells a pasted or typed text holds, row by row. A spreadsheet puts a tab between the cells of
 * a row; typed by hand, a "|" does the same. Text with neither is one column. Every row is given
 * as many cells as the longest one, and what is beyond the limits of a table is left out.
 */
export function readCells(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '')
  if (!lines.length) return []
  const split = lines.some((l) => l.includes('\t')) ? /\t/ : lines.some((l) => l.includes('|')) ? /\s*\|\s*/ : null
  const rows = lines.slice(0, TABLE_ROWS_MAX).map((line) => {
    const cells = split ? line.split(split) : [line]
    // A row written "| a | b |" has an empty piece at each end.
    if (split && !lines.some((l) => l.includes('\t'))) {
      if (cells[0].trim() === '') cells.shift()
      if (cells.length && cells[cells.length - 1].trim() === '') cells.pop()
    }
    return cells.slice(0, TABLE_COLS_MAX).map((cell) => cell.trim().slice(0, CELL_MAX))
  })
  const width = Math.max(1, ...rows.map((r) => r.length))
  return rows.map((r) => [...r, ...Array.from({ length: width - r.length }, () => '')])
}

/** The cells as text to edit: a tab between the cells of a row, a line for each row. */
export const cellsText = (cells: string[][]): string => cells.map((row) => row.join('\t')).join('\n')

/** True for a cell that holds a number (with a sign, decimals, a per cent sign or a unit prefix such as < or ±). */
export const isNumber = (cell: string): boolean => /^[<>≤≥±~]?\s*[-+−]?\d[\d\s.,]*(e[-+]?\d+)?\s*%?$/i.test(cell.trim())

export interface TableDrawing {
  /** Tinted grounds, behind everything: the row of names, every second row. */
  fills: { x: number; y: number; w: number; h: number; fill: string }[]
  lines: { x1: number; y1: number; x2: number; y2: number; width: number }[]
  texts: TextNode[]
  /** Where the columns and rows begin, with the far edge last. */
  xs: number[]
  ys: number[]
  /** The height at which every row is exactly as high as its words need. */
  natural: number
}

const r1 = (v: number): number => Math.round(v * 10) / 10

/** Everything that is drawn for a table, in the table's own box (its top left corner is 0, 0). */
export function tableLayout(node: TableNode): TableDrawing {
  const cells = node.cells
  const rows = cells.length
  const cols = Math.max(0, ...cells.map((r) => r.length))
  const out: TableDrawing = { fills: [], lines: [], texts: [], xs: [0], ys: [0], natural: 0 }
  if (!rows || !cols) return out
  const fs = node.fontSize ?? TABLE_FONT
  const pad = Math.round(fs * 0.5)
  const lh = fs * LINE_HEIGHT
  const head = node.header !== false
  const font = (r: number): Partial<TextNode> => (head && r === 0 ? { bold: true } : {})
  const width = (text: string, r: number): number => measureText({ id: '', type: 'text', x: 0, y: 0, text, fontSize: fs, fill: INK, align: 'left', rotation: 0, ...font(r) }).w

  // Columns share the width of the box in the proportions their longest words ask for.
  const wish = Array.from({ length: cols }, (_, c) => Math.max(fs * 2, ...cells.map((row, r) => width(row[c] ?? '', r))) + 2 * pad)
  const total = wish.reduce((a, v) => a + v, 0)
  const colW = wish.map((v) => (v / total) * node.w)
  for (const w of colW) out.xs.push(out.xs[out.xs.length - 1] + w)

  // The words of a cell are broken where its column is too narrow for them; a row is as high as its tallest cell.
  const shown = cells.map((row, r) => row.map((cell, c) => (cell ? wrapText(cell, { fontSize: fs, ...font(r) }, Math.max(fs, colW[c] - 2 * pad)) : '')))
  const need = shown.map((row) => Math.max(1, ...row.map((cell) => cell.split('\n').length)) * lh + 2 * pad)
  const needed = need.reduce((a, v) => a + v, 0)
  out.natural = Math.ceil(needed)
  // The rows share the height of the box in the proportions their words ask for.
  const stretch = node.h / (needed || 1)
  for (const h of need) out.ys.push(out.ys[out.ys.length - 1] + h * stretch)

  // A column of numbers stands at the right, as in every printed table; words at the left.
  const numeric = Array.from({ length: cols }, (_, c) => {
    const body = cells.slice(head ? 1 : 0).map((row) => row[c] ?? '').filter((cell) => cell !== '')
    return body.length > 0 && body.every(isNumber)
  })

  if (head) out.fills.push({ x: 0, y: 0, w: r1(node.w), h: r1(out.ys[1]), fill: node.headFill ?? TABLE_HEAD_FILL })
  if (node.striped) {
    for (let r = head ? 2 : 1; r < rows; r += 2) out.fills.push({ x: 0, y: r1(out.ys[r]), w: r1(node.w), h: r1(out.ys[r + 1] - out.ys[r]), fill: STRIPE })
  }

  const lines: TableLines = node.lines ?? 'grid'
  const rule = (y: number, width: number) => out.lines.push({ x1: 0, y1: r1(y), x2: r1(node.w), y2: r1(y), width })
  if (lines === 'grid') {
    for (let r = 0; r <= rows; r++) rule(out.ys[r], r === 0 || r === rows || (head && r === 1) ? 1.2 : 0.7)
    for (let c = 0; c <= cols; c++) out.lines.push({ x1: r1(out.xs[c]), y1: 0, x2: r1(out.xs[c]), y2: r1(node.h), width: c === 0 || c === cols ? 1.2 : 0.7 })
  } else if (lines === 'rows') {
    for (let r = 0; r <= rows; r++) rule(out.ys[r], r === 0 || r === rows || (head && r === 1) ? 1.2 : 0.6)
  } else if (lines === 'rules') {
    // The way journals set tables: a line above, one under the names of the columns, one below.
    rule(0, 1.4)
    if (head && rows > 1) rule(out.ys[1], 0.9)
    rule(node.h, 1.4)
  }

  shown.forEach((row, r) => {
    row.forEach((text, c) => {
      if (!text) return
      const high = text.split('\n').length * lh
      const right = numeric[c]
      out.texts.push({
        id: node.id,
        type: 'text',
        x: r1(right ? out.xs[c + 1] - pad : out.xs[c] + pad),
        y: r1(out.ys[r] + (out.ys[r + 1] - out.ys[r] - high) / 2),
        text,
        fontSize: fs,
        fill: node.color ?? INK,
        align: right ? 'right' : 'left',
        rotation: 0,
        ...font(r),
      })
    })
  })
  return out
}

/** The table as high as its rows need at its width: after its words or the size of its lettering changed. */
export function fitTable(node: TableNode): TableNode {
  const natural = tableLayout(node).natural
  return natural > 0 && natural !== node.h ? { ...node, h: natural } : node
}

/** A new table from cells, as wide as its words ask for (within `maxWidth`) and as high as its rows need. */
export function newTable(id: string, cells: string[][], x: number, y: number, maxWidth = 900): TableNode {
  const fs = TABLE_FONT
  const pad = Math.round(fs * 0.5)
  const cols = Math.max(1, ...cells.map((r) => r.length))
  const wish = Array.from({ length: cols }, (_, c) =>
    Math.max(fs * 2, ...cells.map((row, r) => measureText({ id: '', type: 'text', x: 0, y: 0, text: row[c] ?? '', fontSize: fs, fill: INK, align: 'left', rotation: 0, ...(r === 0 ? { bold: true } : {}) }).w)) + 2 * pad,
  )
  const w = Math.round(Math.min(maxWidth, Math.max(120, wish.reduce((a, v) => a + v, 0))))
  return fitTable({ id, type: 'table', x: Math.round(x), y: Math.round(y), w, h: 100, rotation: 0, cells })
}
