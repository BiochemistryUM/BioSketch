// How a chart looks beyond its numbers: the shape, size and transparency of points, where the
// legend stands, dashed reference lines, and the names of points in a scatter chart.

import { describe, expect, it } from 'vitest'
import { renderSvg } from '../src/io/export'
import { validateDoc } from '../src/io/files'
import { CHART_COLOURS, MAX_POINT_LABELS, MAX_REF_LINES, chartLayout, chartSeries, crossTable, hasPoints, parseTable, pointPath, pointStyle, readTable, tableText, usableRefLines } from '../src/model/chart'
import { emptyDoc } from '../src/model/doc'
import { PALETTES, paletteColours, paletteId } from '../src/model/palettes'
import type { ChartNode, FigDoc, FigNode } from '../src/model/types'

const chart = (extra: Partial<ChartNode> = {}): ChartNode => ({
  id: 'ch', type: 'chart', x: 0, y: 0, w: 420, h: 300, rotation: 0, kind: 'dot',
  groups: [{ name: 'Control', values: [2, 4, 6] }, { name: 'Treated', values: [8, 10, 12] }],
  ...extra,
})
const scatter = (extra: Partial<ChartNode> = {}): ChartNode =>
  chart({ kind: 'scatter', groups: [{ name: 'A', values: [1, 2, 3], xs: [1, 2, 3] }, { name: 'B', values: [3, 1, 2], xs: [1, 2, 3] }], ...extra })
const grouped = (extra: Partial<ChartNode> = {}): ChartNode =>
  chart({ kind: 'bar', groups: parseTable('WT\tWT\tKO\tKO\nctrl\tdrug\tctrl\tdrug\n1\t2\t3\t4\n2\t3\t4\t6'), ...extra })
const saved = (node: object): ChartNode => validateDoc(JSON.parse(JSON.stringify({ ...emptyDoc(), nodes: [node as FigNode] } as FigDoc))).nodes[0] as ChartNode
const svgOf = (node: ChartNode): string => renderSvg({ ...emptyDoc(), nodes: [node] }, { area: 'page', transparent: false, includeSketch: true }).svg

/** The area inside a closed path made of straight lines (shoelace formula). */
function area(d: string): number {
  const pts = d.replace(/[MLZ]/g, ' ').trim().split(/\s+/).map(Number)
  let sum = 0
  for (let i = 0; i < pts.length; i += 2) {
    const [x1, y1, x2, y2] = [pts[i], pts[i + 1], pts[(i + 2) % pts.length], pts[(i + 3) % pts.length]]
    sum += x1 * y2 - x2 * y1
  }
  return Math.abs(sum) / 2
}

describe('shape of points', () => {
  it('every shape covers the area of the circle it stands for, around the same centre', () => {
    for (const shape of ['square', 'triangle', 'diamond'] as const) {
      expect(area(pointPath(shape, 100, 50, 10))).toBeCloseTo(Math.PI * 100, -1)
      // Small points are rounded to a tenth of a unit, which costs a few per cent.
      expect(area(pointPath(shape, 20, 20, 3)) / (Math.PI * 9)).toBeCloseTo(1, 1)
    }
    expect(pointPath('square', 0, 0, 2)).toBe('M-1.8 -1.8L1.8 -1.8L1.8 1.8L-1.8 1.8Z')
    // The triangle points up and balances on its centre: a third of its height below, two thirds above.
    const t = pointPath('triangle', 0, 0, 10).replace(/[MLZ]/g, ' ').trim().split(/\s+/).map(Number)
    expect(t[1]).toBeLessThan(0)
    expect(t[3]).toBeCloseTo(-t[1] / 2, 0)
    expect(t[2]).toBeCloseTo(-t[4], 5)
  })

  it('belongs to a group, is drawn for its points, and leaves circles as they were', () => {
    const plain = chartLayout(chart())
    expect(plain.circles.every((c) => c.shape === undefined && c.opacity === undefined)).toBe(true)
    const node = chart({ groups: [{ name: 'Control', values: [2, 4, 6], shape: 'square' }, { name: 'Treated', values: [8, 10, 12], shape: 'circle' }] })
    const d = chartLayout(node)
    expect(d.circles.map((c) => c.shape)).toEqual(['square', 'square', 'square', undefined, undefined, undefined])
    expect(d.circles.map((c) => [c.cx, c.cy, c.r])).toEqual(plain.circles.map((c) => [c.cx, c.cy, c.r]))
    expect(chartSeries(node).map((s) => s.shape)).toEqual(['square', undefined])
    const svg = svgOf(node)
    expect(svg.match(/<circle/g)).toHaveLength(3)
    expect(svg).toContain(`<path d="${pointPath('square', d.circles[0].cx, d.circles[0].cy, d.circles[0].r)}"`)
  })

  it('is shared by a series across the categories of a grouped chart, and marks the means of a line chart', () => {
    const groups = grouped().groups.map((g) => (g.name === 'drug' && g.category === 'WT' ? { ...g, shape: 'diamond' as const } : g))
    const node = grouped({ kind: 'dot', groups })
    expect(chartSeries(node).map((s) => s.shape)).toEqual([undefined, 'diamond'])
    // Both drug columns (WT and KO) draw diamonds: two values each.
    expect(chartLayout(node).circles.filter((c) => c.shape === 'diamond')).toHaveLength(4)
    const line = chartLayout(grouped({ kind: 'line', groups }))
    expect(line.circles.filter((c) => c.shape === 'diamond')).toHaveLength(2)
  })

  it('shows in the legend of charts made of points, not of bars', () => {
    const groups = grouped().groups.map((g) => (g.name === 'drug' ? { ...g, shape: 'triangle' as const } : g))
    expect(chartLayout(grouped({ groups })).swatches.map((s) => s.shape)).toEqual([undefined, undefined])
    expect(chartLayout(grouped({ kind: 'dot', groups })).swatches.map((s) => s.shape)).toEqual(['circle', 'triangle'])
    const s = scatter({ groups: [scatter().groups[0], { ...scatter().groups[1], shape: 'square' }] })
    expect(chartLayout(s).swatches.map((x) => x.shape)).toEqual(['circle', 'square'])
    expect(svgOf(s)).not.toMatch(/<rect[^>]*stroke-width="0.8"/)
    expect(svgOf(grouped())).toMatch(/<rect[^>]*stroke-width="0.8"/)
  })

  it('says which charts draw points at all', () => {
    expect(['bar', 'box', 'violin'].map((kind) => hasPoints(chart({ kind: kind as ChartNode['kind'] })))).toEqual([false, false, false])
    expect(['dot', 'line', 'scatter'].map((kind) => hasPoints(chart({ kind: kind as ChartNode['kind'] })))).toEqual([true, true, true])
    expect(hasPoints(chart({ kind: 'bar', points: true }))).toBe(true)
  })
})

describe('size and transparency of points', () => {
  it('scale every point and make single values see-through', () => {
    const plain = chartLayout(chart())
    const big = chartLayout(chart({ pointSize: 2, pointOpacity: 0.4 }))
    big.circles.forEach((c, i) => expect(c.r).toBeCloseTo(plain.circles[i].r * 2, 0))
    expect(big.circles.every((c) => c.opacity === 0.4)).toBe(true)
    expect(svgOf(chart({ pointOpacity: 0.4 }))).toContain('fill-opacity="0.4"')
    expect(svgOf(chart())).not.toContain('fill-opacity')
    const s = chartLayout(scatter({ pointSize: 0.5, pointOpacity: 0.25 }))
    expect(s.circles[0].r).toBeCloseTo(chartLayout(scatter()).circles[0].r / 2, 0)
    expect(s.circles.every((c) => c.opacity === 0.25)).toBe(true)
  })

  it('leave the rings of a box plot and the means of a line chart solid', () => {
    const box = chartLayout(chart({ kind: 'box', pointOpacity: 0.3, groups: [{ name: 'A', values: [2.1, 3.4, 3.9, 4.4, 5, 5.6, 6.1, 7.3, 9.8, 14.2] }] }))
    expect(box.circles).toEqual([expect.objectContaining({ ring: true })])
    expect(box.circles[0].opacity).toBeUndefined()
    const line = chartLayout(chart({ kind: 'line', pointOpacity: 0.3 }))
    expect(line.circles.every((c) => c.opacity === undefined)).toBe(true)
    const withDots = chartLayout(chart({ kind: 'line', points: true, pointOpacity: 0.3 }))
    expect(withDots.circles.filter((c) => c.opacity === 0.3)).toHaveLength(6)
  })

  it('stay within their limits and are stored only when they are not the usual ones', () => {
    expect(pointStyle(1, 1)).toEqual({})
    expect(pointStyle(undefined, undefined)).toEqual({})
    expect(pointStyle(100, -3)).toEqual({ pointSize: 4, pointOpacity: 0.1 })
    expect(pointStyle(0, 2)).toEqual({ pointSize: 0.25 })
    expect(pointStyle('big', NaN)).toEqual({})
    expect(chartLayout(chart({ pointSize: 1e9 })).circles[0].r).toBeCloseTo(chartLayout(chart({ pointSize: 4 })).circles[0].r, 5)
  })
})

describe('place of the legend', () => {
  const plot = (node: ChartNode) => chartLayout(node).clip
  const names = (node: ChartNode) => chartLayout(node).texts.filter((t) => t.text === 'ctrl' || t.text === 'drug')

  it('is at the right of the plot unless it is moved', () => {
    const d = chartLayout(grouped())
    expect(Math.min(...d.swatches.map((s) => s.x))).toBeGreaterThan(d.clip.x + d.clip.w)
  })

  it('above or below gives the plot the full width and takes a row of height', () => {
    const [right, top, bottom] = [plot(grouped()), plot(grouped({ legend: 'top' })), plot(grouped({ legend: 'bottom' }))]
    expect(top.w).toBeGreaterThan(right.w)
    expect(top.y).toBeGreaterThan(right.y)
    expect(top.h).toBeLessThan(right.h)
    expect(bottom.y).toBe(right.y)
    expect(bottom.h).toBeLessThan(right.h)
    const above = chartLayout(grouped({ legend: 'top', title: 'Title' }))
    for (const s of above.swatches) {
      expect(s.y + s.size).toBeLessThanOrEqual(above.clip.y)
      expect(s.x).toBeGreaterThanOrEqual(above.clip.x)
    }
    const below = chartLayout(grouped({ legend: 'bottom', xLabel: 'Genotype' }))
    for (const s of below.swatches) {
      expect(s.y).toBeGreaterThan(below.clip.y + below.clip.h)
      expect(s.y + s.size).toBeLessThanOrEqual(300)
    }
    // The entries stand side by side.
    expect(new Set(names(grouped({ legend: 'top' })).map((t) => t.y)).size).toBe(1)
  })

  it('wraps onto further rows when the entries do not fit side by side', () => {
    const long = grouped({ w: 200, legend: 'top', groups: grouped().groups.map((g) => ({ ...g, name: g.name === 'ctrl' ? 'vehicle control (DMSO)' : 'treated with compound' })) })
    const d = chartLayout(long)
    expect(new Set(d.swatches.map((s) => s.y)).size).toBe(2)
    expect(d.clip.y).toBeGreaterThan(chartLayout({ ...long, w: 900 }).clip.y)
  })

  it('inside stands in an upper corner of the plot and takes no room', () => {
    const d = chartLayout(grouped({ legend: 'inside' }))
    const hidden = plot(grouped({ legend: 'none' }))
    expect(d.clip).toEqual(hidden)
    for (const s of d.swatches) expect(s.x > d.clip.x + d.clip.w / 2 && s.x + s.size < d.clip.x + d.clip.w && s.y >= d.clip.y).toBe(true)
    for (const t of names(grouped({ legend: 'inside' }))) expect(t.x).toBeLessThan(d.clip.x + d.clip.w)
    const left = chartLayout(grouped({ legend: 'insideLeft' }))
    for (const s of left.swatches) expect(s.x > left.clip.x && s.x < left.clip.x + left.clip.w / 2).toBe(true)
  })

  it('hidden draws no legend', () => {
    const d = chartLayout(grouped({ legend: 'none' }))
    expect(d.swatches).toEqual([])
    expect(names(grouped({ legend: 'none' }))).toEqual([])
    expect(chartLayout(scatter({ legend: 'none' })).swatches).toEqual([])
  })
})

describe('reference lines', () => {
  it('run across the plot at a value, dashed, with their label', () => {
    const d = chartLayout(chart({ refLines: [{ axis: 'y', value: 5, label: 'limit' }] }))
    expect(d.dashes).toHaveLength(1)
    const line = d.dashes[0]
    expect([line.x1, line.x2]).toEqual([d.clip.x, d.clip.x + d.clip.w])
    expect(line.y1).toBe(line.y2)
    // Between the points at 4 and at 6.
    const ys = d.circles.map((c) => c.cy).sort((a, b) => a - b)
    expect(line.y1).toBeGreaterThan(Math.min(...ys))
    expect(line.y1).toBeLessThan(Math.max(...ys))
    expect(d.texts.find((t) => t.text === 'limit')).toMatchObject({ align: 'right' })
    expect(svgOf(chart({ refLines: [{ axis: 'y', value: 5 }] }))).toContain('stroke-dasharray="5 4"')
    expect(chartLayout(chart()).dashes).toEqual([])
  })

  it('stretch the axis so that they can be seen', () => {
    const top = (node: ChartNode) => Math.max(...chartLayout(node).texts.filter((t) => t.align === 'right' && /^-?\d/.test(t.text)).map((t) => Number(t.text)))
    expect(top(chart())).toBeLessThan(20)
    expect(top(chart({ refLines: [{ axis: 'y', value: 30 }] }))).toBe(30)
  })

  it('go both ways in a scatter chart', () => {
    const d = chartLayout(scatter({ refLines: [{ axis: 'x', value: 2, label: 'cut' }, { axis: 'y', value: 1.5 }] }))
    expect(d.dashes).toHaveLength(2)
    expect(d.dashes[0].x1).toBe(d.dashes[0].x2)
    expect(d.dashes[0].y1).toBe(d.clip.y)
    expect(d.dashes[0].y2).toBeCloseTo(d.clip.y + d.clip.h, 5)
    expect(d.dashes[1].y1).toBe(d.dashes[1].y2)
    expect(d.texts.find((t) => t.text === 'cut')).toMatchObject({ align: 'left' })
    // A line beyond the points widens the x axis too.
    const wide = chartLayout(scatter({ refLines: [{ axis: 'x', value: 10 }] }))
    expect(wide.dashes[0].x1).toBeGreaterThan(Math.max(...wide.circles.map((c) => c.cx)))
    expect(wide.dashes[0].x1).toBeLessThanOrEqual(wide.clip.x + wide.clip.w)
  })

  it('are kept by one rule when drawn and when saved', () => {
    expect(usableRefLines([{ axis: 'x', value: 1 }, { axis: 'y', value: 2, label: '  ' }, { axis: 'y', value: 'three' }, { axis: 'z', value: 4 }, null, 5], 'bar', false, false)).toEqual([{ axis: 'y', value: 2 }])
    expect(usableRefLines([{ axis: 'x', value: 0 }, { axis: 'x', value: 3 }, { axis: 'y', value: -1 }], 'scatter', true, true)).toEqual([{ axis: 'x', value: 3 }])
    expect(usableRefLines(Array.from({ length: 40 }, () => ({ axis: 'y', value: 1 })), 'bar', false, false)).toHaveLength(MAX_REF_LINES)
    expect(usableRefLines('lines', 'bar', false, false)).toEqual([])
    // A line that cannot be shown on a logarithmic axis is not drawn, and does not break the chart.
    expect(chartLayout(chart({ yLog: true, refLines: [{ axis: 'y', value: 0 }] })).dashes).toEqual([])
    // A label is not written for a line that lies outside the range that was set.
    const cut = chartLayout(chart({ yMax: 8, refLines: [{ axis: 'y', value: 50, label: 'far' }] }))
    expect(cut.texts.some((t) => t.text === 'far')).toBe(false)
  })
})

describe('names of points', () => {
  const volcano = 'Gene\tlog2FC\tNS\tUp\tDown\nGPX4\t-2.1\t\t\t4.9\n\t0.2\t0.5\t\t\nACSL4\t2.2\t\t5.3\t\n\t0.4\t0.9\t\t\nTFRC\t1.7\t\t3.6\t'

  it('come from a first column of words, before the x values', () => {
    const groups = parseTable(volcano, 'scatter')
    expect(groups).toEqual([
      { name: 'NS', values: [0.5, 0.9], xs: [0.2, 0.4] },
      { name: 'Up', values: [5.3, 3.6], xs: [2.2, 1.7], labels: ['ACSL4', 'TFRC'] },
      { name: 'Down', values: [4.9], xs: [-2.1], labels: ['GPX4'] },
    ])
    expect(readTable(volcano, 'scatter').unread).toBe(0)
  })

  it('are not mistaken for x values, nor x values for names', () => {
    // No names: the first column is x, as before.
    expect(parseTable('x\tA\tB\n1\t5\t6\n2\t7\t8', 'scatter')[0]).toEqual({ name: 'A', values: [5, 7], xs: [1, 2] })
    // A word among the x values is an unread cell, not a name.
    const mixed = readTable('x\tA\n1\t5\nn.d.\t6\n3\t7', 'scatter')
    expect(mixed.groups[0]).toEqual({ name: 'A', values: [5, 7], xs: [1, 3] })
    expect(mixed.unread).toBe(1)
    // Names and x with no y column is not a chart with names.
    expect(parseTable('Gene\tx\nGPX4\t1\nTFRC\t2', 'scatter')).toEqual([{ name: 'x', values: [], xs: [] }])
  })

  it('are written back with the table, and dropped when the chart becomes another kind', () => {
    const groups = parseTable(volcano, 'scatter')
    const text = tableText(groups, 'scatter')
    expect(text.split('\n')[0]).toBe('Name\tx\tNS\tUp\tDown')
    expect(parseTable(text, 'scatter')).toEqual(groups)
    expect(crossTable(groups, 'scatter', 'bar').map((g) => g.name)).toEqual(['x', 'NS', 'Up', 'Down'])
  })

  it('are written beside their points, inside the plot, not on top of each other', () => {
    const node = scatter({ w: 500, h: 360, groups: parseTable(volcano, 'scatter') })
    const d = chartLayout(node)
    const labels = ['GPX4', 'ACSL4', 'TFRC'].map((name) => d.texts.find((t) => t.text === name)!)
    expect(labels.every(Boolean)).toBe(true)
    const fs = labels[0].fontSize
    expect(fs).toBeLessThan(13)
    for (const t of labels) expect(t.x >= d.clip.x && t.y >= d.clip.y && t.y + fs * 1.25 <= d.clip.y + d.clip.h).toBe(true)
    // GPX4 is the leftmost point: its name stands to its right.
    const gpx4 = d.circles.find((c) => c.cx === Math.min(...d.circles.map((p) => p.cx)))!
    expect(labels[0].x).toBeGreaterThan(gpx4.cx)
    expect(Math.abs(labels[0].y + (fs * 1.25) / 2 - gpx4.cy)).toBeLessThan(1)
    expect(svgOf(node)).toContain('ACSL4')
    // Two points at the same place: the second name goes somewhere else.
    const twins = chartLayout(scatter({ groups: [{ name: 'A', values: [2, 2, 1, 3], xs: [2, 2, 1, 3], labels: ['one', 'two', '', ''] }] }))
    const [one, two] = ['one', 'two'].map((name) => twins.texts.find((t) => t.text === name)!)
    expect(one.x === two.x && one.y === two.y).toBe(false)
  })

  it('stop at a hundred, and the scientist is told', () => {
    const n = MAX_POINT_LABELS + 20
    const many = scatter({ groups: [{ name: 'A', values: Array.from({ length: n }, (_, i) => i), xs: Array.from({ length: n }, (_, i) => i), labels: Array.from({ length: n }, (_, i) => `g${i}`) }] })
    const d = chartLayout(many)
    expect(d.texts.filter((t) => /^g\d+$/.test(t.text))).toHaveLength(MAX_POINT_LABELS)
    expect(d.notes.join(' ')).toMatch(/120 points have a name; only the first 100/)
  })
})

describe('what a saved figure keeps', () => {
  it('keeps shapes, size, transparency, legend, lines and names as they are', () => {
    const node = chart({
      groups: [{ name: 'Control', values: [2, 4, 6], shape: 'triangle' }, { name: 'Treated', values: [8, 10, 12] }],
      pointSize: 1.5, pointOpacity: 0.45, legend: 'bottom', refLines: [{ axis: 'y', value: 5, label: 'limit' }, { axis: 'y', value: 7 }],
    })
    expect(saved(node)).toEqual(node)
    const s = scatter({ groups: parseTable('Gene\tx\tA\nGPX4\t1\t2\n\t2\t3', 'scatter'), refLines: [{ axis: 'x', value: 1.5 }], legend: 'inside' })
    expect(saved(s)).toEqual(s)
    expect(chartLayout(saved(node))).toEqual(chartLayout(node))
  })

  it('rebuilds every field of an untrusted figure', () => {
    const raw = saved({
      ...chart(),
      groups: [{ name: 'A', values: [1, 2], shape: 'star' }, { name: 'B', values: [3], shape: 'circle' }],
      pointSize: 1e6, pointOpacity: 'faint', legend: 'everywhere', refLines: [{ axis: 'x', value: 1 }, { axis: 'y', value: Infinity }, { axis: 'y', value: 3, label: 'x'.repeat(100) }],
    })
    expect(raw.groups).toEqual([{ name: 'A', values: [1, 2] }, { name: 'B', values: [3] }])
    expect(raw.pointSize).toBe(4)
    expect(raw.pointOpacity).toBeUndefined()
    expect(raw.legend).toBeUndefined()
    expect(raw.refLines).toEqual([{ axis: 'y', value: 3, label: 'x'.repeat(40) }])
    // The name of a point stays with its numbers when a point is dropped, and names that are not words are emptied.
    const names = saved({ ...scatter(), groups: [{ name: 'A', values: [1, 'bad', 3, 4], xs: [1, 2, 3, 4], labels: ['a', 'b', 7, 'd'.repeat(90)] }] })
    expect(names.groups[0]).toEqual({ name: 'A', values: [1, 3, 4], xs: [1, 3, 4], labels: ['a', '', 'd'.repeat(40)] })
    expect(saved({ ...chart(), groups: [{ name: 'A', values: [1], labels: ['a'] }] }).groups[0]).toEqual({ name: 'A', values: [1] })
  })
})

describe('a group with points of its own', () => {
  it('overrules the size and transparency of the chart for its points only', () => {
    const node = chart({ pointSize: 2, pointOpacity: 0.5, groups: [{ name: 'Control', values: [2, 4, 6], pointSize: 1, pointOpacity: 1 }, { name: 'Treated', values: [8, 10, 12] }] })
    const d = chartLayout(node)
    const plain = chartLayout(chart())
    expect(d.circles.slice(0, 3).map((c) => [c.r, c.opacity])).toEqual(plain.circles.slice(0, 3).map((c) => [c.r, undefined]))
    expect(d.circles.slice(3).every((c, i) => Math.abs(c.r - plain.circles[3 + i].r * 2) < 0.11 && c.opacity === 0.5)).toBe(true)
    expect(chartSeries(node).map((s) => [s.pointSize, s.pointOpacity])).toEqual([[1, 1], [undefined, undefined]])
  })

  it('works for a series of a scatter chart and of a grouped chart', () => {
    const s = chartLayout(scatter({ groups: [{ ...scatter().groups[0], pointSize: 0.5, pointOpacity: 0.2 }, scatter().groups[1]] }))
    expect(s.circles.slice(0, 3).every((c) => c.opacity === 0.2)).toBe(true)
    expect(s.circles.slice(3).every((c) => c.opacity === undefined)).toBe(true)
    expect(s.circles[0].r).toBeLessThan(s.circles[3].r)
    const groups = grouped().groups.map((g) => (g.name === 'drug' && g.category === 'WT' ? { ...g, pointOpacity: 0.3 } : g))
    expect(chartLayout(grouped({ kind: 'dot', groups })).circles.filter((c) => c.opacity === 0.3)).toHaveLength(4)
  })

  it('is saved within its limits', () => {
    const node = chart({ groups: [{ name: 'Control', values: [2, 4, 6], pointSize: 1, pointOpacity: 0.35 }, { name: 'Treated', values: [8, 10, 12] }] })
    expect(saved(node)).toEqual(node)
    expect(saved({ ...chart(), groups: [{ name: 'A', values: [1], pointSize: 99, pointOpacity: 'x' }] }).groups[0]).toEqual({ name: 'A', values: [1], pointSize: 4 })
  })
})

describe('colour palettes', () => {
  it('colour the groups that have no colour of their own', () => {
    const d = chartLayout(chart({ kind: 'bar', palette: 'okabe-ito', groups: [{ name: 'A', values: [1] }, { name: 'B', values: [2], color: '#123456' }, { name: 'C', values: [3] }] }))
    expect(d.rects.map((r) => r.fill)).toEqual(['#E69F00', '#123456', '#009E73'])
    expect(chartLayout(grouped({ palette: 'viridis' })).swatches.map((s) => s.fill)).toEqual(['#440154', '#46337E'])
    expect(chartLayout(scatter({ palette: 'tol-bright' })).circles[0].fill).toBe('#4477AA')
    // More groups than colours: the palette starts again.
    const many = chart({ kind: 'bar', palette: 'greys', groups: Array.from({ length: 7 }, (_, i) => ({ name: `G${i}`, values: [i + 1] })) })
    expect(chartLayout(many).rects[5].fill).toBe(chartLayout(many).rects[0].fill)
  })

  it('are well formed, and the ones called colour-blind friendly are the published ones', () => {
    expect(PALETTES[0].colours).toEqual(CHART_COLOURS)
    expect(new Set(PALETTES.map((p) => p.id)).size).toBe(PALETTES.length)
    for (const p of PALETTES) {
      expect(p.colours.length).toBeGreaterThanOrEqual(5)
      for (const c of p.colours) expect(c).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(new Set(p.colours).size).toBe(p.colours.length)
    }
    expect(PALETTES.filter((p) => p.safe).map((p) => p.id)).toEqual(['okabe-ito', 'tol-bright', 'viridis', 'greys'])
    // Okabe and Ito's eight colours (R: palette.colors(palette = "Okabe-Ito"), black moved to the end).
    expect(paletteColours('okabe-ito')).toEqual(['#E69F00', '#56B4E9', '#009E73', '#F0E442', '#0072B2', '#D55E00', '#CC79A7', '#000000'])
    // viridisLite::viridis(8).
    expect(paletteColours('viridis')).toEqual(['#440154', '#46337E', '#365C8D', '#277F8E', '#1FA187', '#4AC16D', '#9FDA3A', '#FDE725'])
  })

  it('fall back to the usual colours for a name that is not known, and only known names are saved', () => {
    expect(paletteColours('rainbow')).toEqual(CHART_COLOURS)
    expect(paletteColours(undefined)).toEqual(CHART_COLOURS)
    expect(paletteId('biosketch')).toBeUndefined()
    expect(saved(chart({ palette: 'dark2' })).palette).toBe('dark2')
    expect(saved({ ...chart(), palette: 'rainbow' }).palette).toBeUndefined()
    expect(saved({ ...chart(), palette: 'biosketch' }).palette).toBeUndefined()
  })
})

describe('style of a reference line', () => {
  it('is dashed unless it is dotted or solid', () => {
    const d = chartLayout(chart({ refLines: [{ axis: 'y', value: 3 }, { axis: 'y', value: 5, dash: 'dotted' }, { axis: 'y', value: 7, dash: 'solid' }] }))
    expect(d.dashes.map((l) => l.style)).toEqual([undefined, 'dotted', 'solid'])
    const svg = svgOf(chart({ refLines: [{ axis: 'y', value: 5, dash: 'dotted' }] }))
    expect(svg).toContain('stroke-dasharray="0.1 4"')
    expect(svg).toContain('stroke-linecap="round"')
    expect(svgOf(chart({ refLines: [{ axis: 'y', value: 5, dash: 'solid' }] }))).not.toContain('stroke-dasharray')
    expect(saved(chart({ refLines: [{ axis: 'y', value: 5, dash: 'dotted' }] })).refLines).toEqual([{ axis: 'y', value: 5, dash: 'dotted' }])
    expect(saved({ ...chart(), refLines: [{ axis: 'y', value: 5, dash: 'wavy' }] }).refLines).toEqual([{ axis: 'y', value: 5 }])
  })
})
