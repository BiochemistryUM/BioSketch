// A table as an object of the figure: cells from pasted text, laid out in its box.

import { beforeEach, describe, expect, it } from 'vitest'
import { SAMPLE_TABLE, addTable } from '../src/actions'
import { parseDoc, serializeDoc, validateDoc } from '../src/io/files'
import { addNodes, emptyDoc, scaleAsPicture } from '../src/model/doc'
import { getRect, resizeNode, getBox } from '../src/model/nodes'
import { describeTable } from './helpers-table'
import { CELL_MAX, TABLE_COLS_MAX, TABLE_ROWS_MAX, cellsText, fitTable, isNumber, newTable, readCells, tableLayout } from '../src/model/table'
import { LINE_HEIGHT, type TableNode } from '../src/model/types'
import { nodeKind } from '../src/model/describe'
import { useEditor } from '../src/store'

const table = (cells: string[][], extra: Partial<TableNode> = {}): TableNode => ({ id: 'tb', type: 'table', x: 100, y: 50, w: 400, h: 120, rotation: 0, cells, ...extra })
const CELLS = [
  ['Gene', 'Fold change', 'p'],
  ['Il6', '4.2', '0.003'],
  ['Tnf', '2.1', '0.04'],
]

describe('cells from pasted or typed text', () => {
  it('are separated by tabs, as a spreadsheet copies them', () => {
    expect(readCells('Gene\tFold change\tp\nIl6\t4.2\t0.003\r\nTnf\t2.1\t0.04\n')).toEqual(CELLS)
    // An empty cell between two tabs stays a cell, and short rows are filled up.
    expect(readCells('a\t\tc\nd')).toEqual([['a', '', 'c'], ['d', '', '']])
  })

  it('are separated by a | when typed by hand, with or without one at each end', () => {
    expect(readCells('Gene | Fold change | p\nIl6 | 4.2 | 0.003')).toEqual(CELLS.slice(0, 2))
    expect(readCells('| a | b |\n| c | d |')).toEqual([['a', 'b'], ['c', 'd']])
  })

  it('are one column when the text has neither, and nothing when it is empty', () => {
    expect(readCells('one, two\nthree')).toEqual([['one, two'], ['three']])
    expect(readCells('  \n\n')).toEqual([])
  })

  it('stay within what a table holds', () => {
    const wide = Array.from({ length: 40 }, (_, i) => `c${i}`).join('\t')
    expect(readCells(wide)[0]).toHaveLength(TABLE_COLS_MAX)
    expect(readCells(Array.from({ length: 200 }, (_, i) => `r${i}`).join('\n'))).toHaveLength(TABLE_ROWS_MAX)
    expect(readCells('x'.repeat(900))[0][0]).toHaveLength(CELL_MAX)
  })

  it('go back to the text they came from', () => {
    expect(readCells(cellsText(CELLS))).toEqual(CELLS)
    expect(cellsText([['a', 'b'], ['c', '']])).toBe('a\tb\nc\t')
  })

  it('know a number when they hold one', () => {
    for (const cell of ['4.2', '-3', '−0.5', '1,5', '12 %', '1e-5', '< 0.001', '±2', '1 200']) expect(isNumber(cell), cell).toBe(true)
    for (const cell of ['Il6', '4.2 mM', 'n.d.', '', 'p53']) expect(isNumber(cell), cell).toBe(false)
  })
})

describe('the layout of a table', () => {
  it('fills its box: columns across its width, rows down its height', () => {
    const t = fitTable(table(CELLS))
    const d = tableLayout(t)
    expect(d.xs).toHaveLength(4)
    expect(d.ys).toHaveLength(4)
    expect(d.xs[0]).toBe(0)
    expect(d.xs[3]).toBeCloseTo(400, 6)
    expect(d.ys[3]).toBeCloseTo(t.h, 6)
    // The column with the longest words is the widest.
    const widths = d.xs.slice(1).map((x, i) => x - d.xs[i])
    expect(widths[1]).toBeGreaterThan(widths[0])
    expect(widths[1]).toBeGreaterThan(widths[2])
    // Three rows of one line each: the lettering (14) and the room around it.
    expect(t.h).toBe(Math.ceil(3 * (14 * LINE_HEIGHT + 14)))
    expect(d.natural).toBe(t.h)
  })

  it('writes every cell once, numbers at the right of their column and words at the left', () => {
    const d = tableLayout(fitTable(table(CELLS)))
    expect(d.texts.map((t) => t.text)).toEqual(CELLS.flat())
    const at = (r: number, c: number) => d.texts[r * 3 + c]
    expect(at(1, 0)).toMatchObject({ align: 'left', x: 7 })
    expect(at(1, 1).align).toBe('right')
    expect(at(1, 1).x).toBeCloseTo(d.xs[2] - 7, 1)
    // The name over a column of numbers stands at the right with them, in bold.
    expect(at(0, 1)).toMatchObject({ align: 'right', bold: true })
    expect(at(1, 1).bold).toBeUndefined()
    // Every cell belongs to the table: a press on its words is a press on the table.
    expect(d.texts.every((t) => t.id === 'tb')).toBe(true)
  })

  it('tints the row of names, and every second row when asked', () => {
    const plain = tableLayout(fitTable(table(CELLS)))
    expect(plain.fills).toHaveLength(1)
    expect(plain.fills[0]).toMatchObject({ x: 0, y: 0, w: 400, fill: '#e8ecf1' })
    expect(tableLayout(fitTable(table(CELLS, { header: false }))).fills).toHaveLength(0)
    const four = [...CELLS, ['Myc', '1.1', '0.6'], ['Jun', '0.9', '0.7']]
    const striped = tableLayout(fitTable(table(four, { striped: true, headFill: '#ffeecc' })))
    expect(striped.fills.map((f) => f.fill)).toEqual(['#ffeecc', '#f4f6f8', '#f4f6f8'])
    // Without a row of names the second, fourth … row is tinted.
    expect(tableLayout(fitTable(table(four, { striped: true, header: false }))).fills).toHaveLength(2)
  })

  it('draws a grid, lines between the rows, the three lines of a journal, or none', () => {
    const t = fitTable(table(CELLS))
    expect(tableLayout(t).lines).toHaveLength(4 + 4)
    expect(tableLayout({ ...t, lines: 'rows' }).lines).toHaveLength(4)
    const rules = tableLayout({ ...t, lines: 'rules' }).lines
    expect(rules.map((l) => l.y1)).toEqual([0, tableLayout(t).ys[1], t.h].map((v) => Math.round(v * 10) / 10))
    expect(tableLayout({ ...t, lines: 'none' }).lines).toHaveLength(0)
  })

  it('breaks the words of a cell where its column is too narrow, and the row grows with them', () => {
    const long = [['Name', 'What it does'], ['GPX4', 'Reduces lipid hydroperoxides to lipid alcohols and so protects the cell from ferroptosis']]
    const narrow = fitTable(table(long, { w: 260 }))
    const d = tableLayout(narrow)
    const cell = d.texts[3]
    expect(cell.text.split('\n').length).toBeGreaterThan(2)
    expect(d.ys[2] - d.ys[1]).toBeGreaterThan(d.ys[1] - d.ys[0])
    expect(narrow.h).toBeGreaterThan(fitTable(table(long, { w: 1400 })).h)
  })

  it('keeps the height it was given by hand: the rows share it', () => {
    const t = { ...fitTable(table(CELLS)), h: 300 }
    const d = tableLayout(t)
    expect(d.ys[3]).toBeCloseTo(300, 6)
    expect(d.ys[1]).toBeCloseTo(100, 6)
    expect(fitTable(t).h).toBe(d.natural)
    // Fitted once, it is as it should be: fitting again changes nothing.
    const once = fitTable(t)
    expect(fitTable(once)).toBe(once)
  })

  it('draws nothing for a table without cells', () => {
    expect(tableLayout(table([]))).toMatchObject({ fills: [], lines: [], texts: [], natural: 0 })
    expect(fitTable(table([]))).toEqual(table([]))
  })
})

describe('a table among the objects of a figure', () => {
  it('is made as wide as its words ask for and as high as its rows need', () => {
    const t = newTable('n', CELLS, 10, 20)
    expect(t).toMatchObject({ type: 'table', x: 10, y: 20, cells: CELLS })
    expect(t.w).toBeGreaterThan(150)
    expect(t.w).toBeLessThan(400)
    expect(t.h).toBe(tableLayout(t).natural)
    expect(newTable('n', [['x'.repeat(250), 'y'.repeat(250)]], 0, 0, 500).w).toBe(500)
  })

  it('has a box, moves, turns and is resized like a chart', () => {
    const t = fitTable(table(CELLS))
    const doc = addNodes(emptyDoc(), [t])
    expect(getRect(t, doc)).toMatchObject({ x: 100, y: 50, w: 400, h: t.h })
    expect(nodeKind(t)).toBe('Table')
    const wider = resizeNode(t, getBox(t, doc), { ...getBox(t, doc), w: 600 }) as TableNode
    expect(wider.w).toBe(600)
    // Resized as a picture, its lettering follows.
    const half = scaleAsPicture(doc, ['tb'], 0.5, { x: 0, y: 0 }).nodes[0] as TableNode
    expect(half).toMatchObject({ x: 50, y: 25, w: 200, fontSize: 7 })
  })

  it('survives a figure file, with cells that are short texts in rows of one length', () => {
    const doc = addNodes(emptyDoc(), [fitTable(table(CELLS, { striped: true, lines: 'rules', fontSize: 16, headFill: '#ffeecc', color: '#223344', header: false }))])
    expect(parseDoc(serializeDoc(doc))).toEqual(doc)
    const read = validateDoc({ ...emptyDoc(), nodes: [{ ...table([]), cells: [['a', 5, null, { x: 1 }], ['line\nbreak\ttab'], 'not a row'], lines: 'zigzag', striped: 'yes', fontSize: 9999, headFill: 'red; }' }, { ...table([]), id: 'empty' }, { ...table(CELLS), id: 'none', cells: 'text' }] })
    expect(read.nodes).toHaveLength(1)
    const t = read.nodes[0] as TableNode
    expect(t.cells).toEqual([['a', '5', '', ''], ['line break tab', '', '', '']])
    expect(t.lines).toBeUndefined()
    expect(t.striped).toBeUndefined()
    expect(t.fontSize).toBe(200)
    expect(t.headFill).toBe('#e8ecf1')
    expect(describeTable(t)).toBe('2 rows, 4 columns')
  })
})

describe('adding a table in the editor', () => {
  beforeEach(() => {
    useEditor.getState().loadDoc(emptyDoc())
    useEditor.getState().set({ canvasSize: { w: 800, h: 600 }, view: { x: 0, y: 0, zoom: 1 } })
  })

  it('puts an example table in the middle of the view, selected', () => {
    addTable()
    const s = useEditor.getState()
    const t = s.doc.nodes[0] as TableNode
    expect(t.cells).toEqual(SAMPLE_TABLE)
    expect(s.selection).toEqual([t.id])
    expect(Math.abs(t.x + t.w / 2 - 400)).toBeLessThanOrEqual(1)
    expect(Math.abs(t.y + t.h / 2 - 300)).toBeLessThanOrEqual(1)
    s.undo()
    expect(useEditor.getState().doc.nodes).toEqual([])
  })
})
