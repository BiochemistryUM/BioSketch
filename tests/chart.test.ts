// Charts drawn from pasted numbers: reading the table, the statistics, the axis, where things are
// drawn, and the chart as an object in a figure.

import { describe, expect, it } from 'vitest'
import { SAMPLE_CHART } from '../src/actions'
import { docToScene } from '../src/ai/revise'
import { renderSvg } from '../src/io/export'
import { validateDoc } from '../src/io/files'
import { CHART_COLOURS, chartLayout, groupColour, niceScale, parseTable, stats, tableText } from '../src/model/chart'
import { nodeLabel } from '../src/model/describe'
import { emptyDoc } from '../src/model/doc'
import { canAttach, getRect, resizeNode, scaleNode, translateNode } from '../src/model/nodes'
import type { ChartNode, FigDoc, FigNode } from '../src/model/types'

const chart = (extra: Partial<ChartNode> = {}): ChartNode => ({
  id: 'ch', type: 'chart', x: 100, y: 50, w: 360, h: 260, rotation: 0, kind: 'bar',
  groups: [{ name: 'Control', values: [2, 4, 6] }, { name: 'Treated', values: [8, 10, 12] }],
  ...extra,
})
const docOf = (...nodes: FigNode[]): FigDoc => ({ ...emptyDoc(), nodes })
const options = { area: 'page' as const, transparent: false, includeSketch: true }
const saved = (node: object): ChartNode => validateDoc(JSON.parse(JSON.stringify(docOf(node as FigNode)))).nodes[0] as ChartNode

describe('reading a pasted table', () => {
  it('takes one column per group, as copied from a spreadsheet', () => {
    expect(parseTable('Control\tTreated\n4.1\t6.9\n3.8\t7.4\n4.6\t6.1')).toEqual([
      { name: 'Control', values: [4.1, 3.8, 4.6] },
      { name: 'Treated', values: [6.9, 7.4, 6.1] },
    ])
  })

  it('accepts commas, semicolons and spaces, and names the groups itself when there is no first row of names', () => {
    expect(parseTable('WT,KO\n1,2\n3,4')).toEqual([{ name: 'WT', values: [1, 3] }, { name: 'KO', values: [2, 4] }])
    expect(parseTable('1 2\n3 4')).toEqual([{ name: 'Group 1', values: [1, 3] }, { name: 'Group 2', values: [2, 4] }])
    // With semicolons or tabs between the cells, a comma is a decimal comma.
    expect(parseTable('WT;KO\n1,5;2,5')).toEqual([{ name: 'WT', values: [1.5] }, { name: 'KO', values: [2.5] }])
    expect(parseTable('WT\tKO\n1,5\t2,5')[0].values).toEqual([1.5])
  })

  it('copes with groups of different sizes, gaps, words among the numbers and negative values', () => {
    expect(parseTable('A\tB\tC\n1\t5\t\n2\t\t-3\nn.d.\t6\t-4.5')).toEqual([
      { name: 'A', values: [1, 2] },
      // A column with a gap remembers the row of each value: paired tests compare row with row.
      { name: 'B', values: [5, 6], rows: [0, 2] },
      { name: 'C', values: [-3, -4.5], rows: [1, 2] },
    ])
    expect(parseTable('1e3\t2.5E-1')).toEqual([{ name: 'Group 1', values: [1000] }, { name: 'Group 2', values: [0.25] }])
    expect(parseTable('')).toEqual([])
    expect(parseTable('  \n\n')).toEqual([])
    // A named column that has no numbers yet is kept, so the table can be typed column by column.
    expect(parseTable('A\tB\n1\t')).toEqual([{ name: 'A', values: [1] }, { name: 'B', values: [] }])
  })

  it('writes the groups back as the table that was read', () => {
    const groups = parseTable('A\tB\tC\n1\t5\t\n2\t\t-3')
    expect(tableText(groups)).toBe('A\tB\tC\n1\t5\t\n2\t\t-3')
    expect(parseTable(tableText(SAMPLE_CHART))).toEqual(SAMPLE_CHART)
    expect(parseTable('x'.repeat(30) + '\n1').length).toBe(1)
    expect(parseTable(Array.from({ length: 40 }, (_, i) => i).join('\t'))).toHaveLength(24)
  })
})

describe('statistics', () => {
  it('gives the mean, the sample standard deviation and the standard error', () => {
    const s = stats([2, 4, 4, 4, 5, 5, 7, 9])
    expect(s.n).toBe(8)
    expect(s.mean).toBe(5)
    expect(s.sd).toBeCloseTo(2.138, 3)
    expect(s.sem).toBeCloseTo(0.756, 3)
    expect(stats([3])).toEqual({ n: 1, mean: 3, sd: 0, sem: 0 })
    expect(stats([])).toEqual({ n: 0, mean: 0, sd: 0, sem: 0 })
  })
})

describe('the value axis', () => {
  it('runs between round numbers in steps of 1, 2 or 5', () => {
    expect(niceScale(0, 12.4).ticks.map((t) => t.label)).toEqual(['0', '5', '10', '15'])
    expect(niceScale(0, 7.8).ticks.map((t) => t.label)).toEqual(['0', '2', '4', '6', '8'])
    expect(niceScale(0, 0.37).ticks.map((t) => t.label)).toEqual(['0.0', '0.1', '0.2', '0.3', '0.4'])
    expect(niceScale(-3, 6).ticks.map((t) => t.label)).toEqual(['-4', '-2', '0', '2', '4', '6'])
    expect(niceScale(0, 48000).ticks.map((t) => t.value)).toEqual([0, 10000, 20000, 30000, 40000, 50000])
    // Nothing to show still gives an axis.
    expect(niceScale(0, 0).ticks.length).toBeGreaterThan(1)
    const s = niceScale(0, 0.37)
    expect(s.ticks[3].value).toBe(0.3)
    expect([s.min, s.max]).toEqual([0, 0.4])
  })
})

describe('where a chart is drawn', () => {
  it('draws a bar per group from zero to its mean, in the group\'s colour', () => {
    const d = chartLayout(chart())
    expect(d.rects).toHaveLength(2)
    expect(d.rects.map((r) => r.fill)).toEqual([CHART_COLOURS[0], CHART_COLOURS[1]])
    // Means 4 and 10: the second bar is 2.5 times as tall, and both stand on the same line.
    expect(d.rects[1].h / d.rects[0].h).toBeCloseTo(2.5, 1)
    expect(d.rects[0].y + d.rects[0].h).toBeCloseTo(d.rects[1].y + d.rects[1].h, 1)
    expect(groupColour({ name: 'x', values: [], color: '#123456' }, 0)).toBe('#123456')
    // No error bars and no dots unless asked for: only the two axes and the tick marks.
    expect(d.circles).toEqual([])
    expect(d.lines).toEqual([])
    const ticks = d.texts.filter((t) => t.align === 'right')
    expect(d.rules).toHaveLength(2 + ticks.length)
    // Nothing is cut off, and there is nothing to tell the scientist about.
    expect(d.clipped).toBe(false)
    expect(d.notes).toEqual([])
    expect(d.swatches).toEqual([])
    expect(d.texts.map((t) => t.text)).toEqual(expect.arrayContaining(['Control', 'Treated', '0', '10']))
  })

  it('adds error bars and single values when asked', () => {
    const sd = chartLayout(chart({ error: 'sd' }))
    // Each error bar is a stem and two caps.
    expect(sd.lines).toHaveLength(6)
    const withDots = chartLayout(chart({ points: true }))
    expect(withDots.circles).toHaveLength(6)
    expect(withDots.circles.every((c) => c.fill === '#2b2f36')).toBe(true)
    // The same numbers always give the same picture.
    expect(chartLayout(chart({ points: true })).circles).toEqual(withDots.circles)
    // The standard error is smaller than the standard deviation, so its bars are shorter.
    const stem = (d: ReturnType<typeof chartLayout>): number => Math.max(...d.lines.filter((l) => l.x1 === l.x2 && l.y1 !== l.y2).map((l) => Math.abs(l.y2 - l.y1)).filter((len) => len < 200 && len > 0).slice(-2))
    expect(stem(chartLayout(chart({ error: 'sem' })))).toBeLessThan(stem(sd))
  })

  it('draws dots with a mean line, or the means joined by a line', () => {
    const dots = chartLayout(chart({ kind: 'dot' }))
    expect(dots.rects).toEqual([])
    expect(dots.circles).toHaveLength(6)
    expect(dots.circles[0].fill).toBe(CHART_COLOURS[0])
    expect(dots.lines.filter((l) => l.width === 2)).toHaveLength(2)
    const line = chartLayout(chart({ kind: 'line' }))
    expect(line.rects).toEqual([])
    expect(line.paths).toHaveLength(1)
    expect(line.paths[0].d).toMatch(/^M[\d.]+ [\d.]+L[\d.]+ [\d.]+$/)
    expect(line.circles).toHaveLength(2)
  })

  it('keeps everything inside its box, with room for titles', () => {
    for (const kind of ['bar', 'dot', 'line'] as const) {
      const d = chartLayout(chart({ kind, error: 'sd', points: true, title: 'Viability', yLabel: 'Cells (%)' }))
      for (const r of d.rects) expect(r.x >= 0 && r.y >= 0 && r.x + r.w <= 360 && r.y + r.h <= 260, kind).toBe(true)
      for (const c of d.circles) expect(c.cx >= 0 && c.cx <= 360 && c.cy >= 0 && c.cy <= 260, kind).toBe(true)
      for (const l of [...d.lines, ...d.rules]) expect(Math.min(l.x1, l.x2, l.y1, l.y2) >= 0 && Math.max(l.x1, l.x2) <= 360 && Math.max(l.y1, l.y2) <= 260, kind).toBe(true)
      expect(d.texts.find((t) => t.text === 'Viability')).toMatchObject({ bold: true, align: 'center' })
      expect(d.texts.find((t) => t.text === 'Cells (%)')).toMatchObject({ rotation: -90 })
    }
    // A title for the value axis moves the plot to the right.
    const axisX = (d: ReturnType<typeof chartLayout>): number => d.rules.find((l) => l.x1 === l.x2 && Math.abs(l.y2 - l.y1) > 100)!.x1
    expect(axisX(chartLayout(chart({ yLabel: 'Cells (%)' })))).toBeGreaterThan(axisX(chartLayout(chart())))
  })

  it('handles negative values, a single group and no numbers at all', () => {
    const d = chartLayout(chart({ groups: [{ name: 'Down', values: [-2, -4] }, { name: 'Up', values: [3, 5] }] }))
    // The bar of the negative group hangs below the zero line, the other stands on it.
    expect(d.rects[0].y).toBeCloseTo(d.rects[1].y + d.rects[1].h, 1)
    expect(d.texts.map((t) => t.text)).toContain('-4')
    expect(chartLayout(chart({ groups: [{ name: 'Only', values: [1] }], error: 'sd' })).rects).toHaveLength(1)
    const empty = chartLayout(chart({ groups: [] }))
    expect(empty.rects).toEqual([])
    expect(empty.texts.some((t) => /Paste your numbers/.test(t.text))).toBe(true)
    // A group without numbers is left out; the others keep their colours by place in the table.
    const gap = chartLayout(chart({ groups: [{ name: 'A', values: [] }, { name: 'B', values: [2] }] }))
    expect(gap.rects).toHaveLength(1)
  })
})

describe('a chart in a figure', () => {
  it('is drawn on the page and in exports, with its words as real text', () => {
    const svg = renderSvg(docOf(chart({ error: 'sd', title: 'Ca^{2+} signal' })), options).svg
    expect(svg).toContain('translate(100 50)')
    expect((svg.match(/<rect [^>]*fill="#6fa8dc"/g) ?? []).length).toBe(1)
    expect(svg).toContain('>Control<')
    expect(svg).toContain('>2+<')
    expect(svg).not.toMatch(/NaN|undefined/)
  })

  it('moves, resizes and scales like any box, keeping its numbers', () => {
    const node = chart()
    const doc = docOf(node)
    expect(getRect(node, doc)).toMatchObject({ x: 100, y: 50, w: 360, h: 260 })
    expect(translateNode(node, 10, -5)).toMatchObject({ x: 110, y: 45, groups: node.groups })
    const box = { x: 0, y: 0, w: 500, h: 300, rotation: 0 }
    expect(resizeNode(node, { x: 100, y: 50, w: 360, h: 260, rotation: 0 }, box)).toMatchObject({ w: 500, h: 300, groups: node.groups })
    // Resized together with other things, its lettering grows too.
    expect(scaleNode(node, 2, { x: 100, y: 50 }, doc)).toMatchObject({ w: 720, h: 520, fontSize: 26 })
    expect(canAttach(node)).toBe(true)
    expect(nodeLabel(node)).toBe('Bar chart')
    expect(nodeLabel(chart({ kind: 'dot', title: 'Viability' }))).toBe('Dot chart “Viability”')
  })

  it('is saved with its numbers, rebuilt value by value', () => {
    const full = chart({ kind: 'line', error: 'sem', points: true, title: 'T', yLabel: 'Y', fontSize: 15, groups: [{ name: 'A', values: [1, 2.5], color: '#ABCDEF' }] })
    expect(saved(full)).toEqual({ ...full, groups: [{ name: 'A', values: [1, 2.5], color: '#abcdef' }] })
    const odd = saved({
      ...chart(),
      kind: 'radar',
      error: 'range',
      points: 'yes',
      fontSize: 900,
      title: '   ',
      groups: [{ name: 7, values: [1, 'two', null, Infinity, 3], color: 'javascript:x' }, 'junk', { name: 'x'.repeat(100), values: 'none' }],
    })
    expect(odd.kind).toBe('bar')
    expect('error' in odd || 'points' in odd || 'title' in odd).toBe(false)
    expect(odd.fontSize).toBe(60)
    expect(odd.groups).toEqual([{ name: 'Group 1', values: [1, 3] }, { name: 'x'.repeat(60), values: [] }])
    expect(saved({ ...chart(), groups: undefined }).groups).toEqual([])
  })

  it('is left alone by the AI when a figure is changed', () => {
    expect(docToScene({ ...emptyDoc(), nodes: [chart()] }).scene.elements).toEqual([])
  })
})
