// Customisable plots: grouped and scatter tables, axis range and logarithmic axes, box and violin
// plots, legends, fitted lines and significance brackets.

import { describe, expect, it } from 'vitest'
import { renderSvg } from '../src/io/export'
import { validateDoc } from '../src/io/files'
import { CHART_COLOURS, axisFor, chartLayout, chartSeries, curveMethodsText, doseText, ec50Of, isGrouped, isStacked, parseTable, scatterFits, tableText } from '../src/model/chart'
import doseRef from './stats-reference.json'
import { applyInstruction } from '../src/model/chartCommands'
import { nodeLabel } from '../src/model/describe'
import { emptyDoc } from '../src/model/doc'
import type { ChartNode, FigDoc, FigNode } from '../src/model/types'

const chart = (extra: Partial<ChartNode> = {}): ChartNode => ({
  id: 'ch', type: 'chart', x: 100, y: 50, w: 360, h: 260, rotation: 0, kind: 'bar',
  groups: [{ name: 'Control', values: [2, 4, 6] }, { name: 'Treated', values: [8, 10, 12] }],
  ...extra,
})
const docOf = (...nodes: FigNode[]): FigDoc => ({ ...emptyDoc(), nodes })
const options = { area: 'page' as const, transparent: false, includeSketch: true }
const saved = (node: object): ChartNode => validateDoc(JSON.parse(JSON.stringify(docOf(node as FigNode)))).nodes[0] as ChartNode
const GROUPED = 'WT\tWT\tKO\tKO\nVehicle\tDrug\tVehicle\tDrug\n1\t2\t3\t4\n1.5\t2.5\t3.5\t4.5'
const grouped = (extra: Partial<ChartNode> = {}): ChartNode => chart({ groups: parseTable(GROUPED), ...extra })
const X = [2.1, 3.4, 3.9, 4.4, 5.0, 5.6, 6.1, 7.3, 9.8, 14.2]
const Y = [1.2, 2.9, 3.1, 4.8, 4.9, 6.4, 6.2, 8.1, 9.9, 15.1]
const scatter = (extra: Partial<ChartNode> = {}): ChartNode => chart({ kind: 'scatter', groups: [{ name: 'Run 1', values: Y, xs: X }], ...extra })
const tickLabels = (d: ReturnType<typeof chartLayout>): string[] => d.texts.filter((t) => t.align === 'right').map((t) => t.text)

describe('a chart from before these options', () => {
  it('is drawn exactly where it was', () => {
    // Worked out by hand from the rules a plain bar chart has always followed: axis 0 to 10 in
    // steps of 2, bars 60% of their slot, standing on zero.
    const d = chartLayout(chart())
    expect(d.rects[0]).toEqual({ x: 58.9, y: 145.3, w: 97.7, h: 90, fill: CHART_COLOURS[0] })
    expect(tickLabels(d)).toEqual(['0', '2', '4', '6', '8', '10'])
    expect(d.clip).toEqual({ x: 26.3, y: 10.4, w: 325.7, h: 224.9 })
    expect(isGrouped(chart())).toBe(false)
  })
})

describe('grouped tables', () => {
  it('read a row of categories above the row of series names', () => {
    expect(parseTable(GROUPED)).toEqual([
      { name: 'Vehicle', values: [1, 1.5], category: 'WT' },
      { name: 'Drug', values: [2, 2.5], category: 'WT' },
      { name: 'Vehicle', values: [3, 3.5], category: 'KO' },
      { name: 'Drug', values: [4, 4.5], category: 'KO' },
    ])
    // Merged cells of a spreadsheet arrive as empty cells: the category runs on to the right.
    expect(parseTable('WT\t\tKO\t\nVehicle\tDrug\tVehicle\tDrug\n1\t2\t3\t4').map((g) => g.category)).toEqual(['WT', 'WT', 'KO', 'KO'])
    expect(tableText(parseTable(GROUPED))).toBe(GROUPED)
  })

  it('do not mistake a row of data with a word in it for a second row of names', () => {
    const groups = parseTable('A\tB\nn.d.\t5\n2\t6')
    expect(groups).toEqual([{ name: 'A', values: [2], rows: [1] }, { name: 'B', values: [5, 6] }])
    expect(parseTable('A\tB\n1\t2').every((g) => g.category === undefined)).toBe(true)
  })

  it('draw the series of each category side by side, one colour per series, with a legend', () => {
    const node = grouped()
    expect(isGrouped(node)).toBe(true)
    expect(chartSeries(node)).toEqual([
      { name: 'Vehicle', colour: CHART_COLOURS[0], groups: [0, 2] },
      { name: 'Drug', colour: CHART_COLOURS[1], groups: [1, 3] },
    ])
    const d = chartLayout(node)
    expect(d.rects.map((r) => r.fill)).toEqual([CHART_COLOURS[0], CHART_COLOURS[1], CHART_COLOURS[0], CHART_COLOURS[1]])
    // Within a category the two bars nearly touch; between categories there is a clear gap.
    const gapInside = d.rects[1].x - (d.rects[0].x + d.rects[0].w)
    const gapBetween = d.rects[2].x - (d.rects[1].x + d.rects[1].w)
    expect(gapInside).toBeGreaterThanOrEqual(0)
    expect(gapBetween).toBeGreaterThan(gapInside * 2)
    expect(d.swatches.map((s) => s.fill)).toEqual([CHART_COLOURS[0], CHART_COLOURS[1]])
    const names = d.texts.map((t) => t.text)
    expect(names).toEqual(expect.arrayContaining(['WT', 'KO', 'Vehicle', 'Drug']))
    expect(names.filter((n) => n === 'Vehicle')).toHaveLength(1)
    // The legend stands to the right of the plot, never over it.
    expect(Math.min(...d.swatches.map((s) => s.x))).toBeGreaterThan(d.clip.x + d.clip.w)
    for (const s of d.swatches) expect(s.x + s.size).toBeLessThanOrEqual(360)
  })

  it('give a line chart one line per series, and a series the colour chosen for it', () => {
    const d = chartLayout(grouped({ kind: 'line' }))
    expect(d.paths.map((p) => p.stroke)).toEqual([CHART_COLOURS[0], CHART_COLOURS[1]])
    const custom = grouped()
    custom.groups[2] = { ...custom.groups[2], color: '#112233' }
    expect(chartSeries(custom)[0].colour).toBe('#112233')
    expect(chartLayout(custom).rects.map((r) => r.fill)).toEqual(['#112233', CHART_COLOURS[1], '#112233', CHART_COLOURS[1]])
  })
})

describe('scatter tables', () => {
  it('read the first column as x and every other column as a series of y values', () => {
    const groups = parseTable('Dose\tA\tB\n1\t2\t3\n2\t4\t\n3\t\t9', 'scatter')
    expect(groups).toEqual([
      { name: 'A', values: [2, 4], xs: [1, 2] },
      { name: 'B', values: [3, 9], xs: [1, 3] },
    ])
    expect(parseTable(tableText(groups, 'scatter'), 'scatter')).toEqual(groups)
    expect(tableText(groups, 'scatter')).toBe('x\tA\tB\n1\t2\t3\n2\t4\t\n3\t\t9')
    expect(parseTable('1 2\n3 4', 'scatter')).toEqual([{ name: 'Series 1', values: [2, 4], xs: [1, 3] }])
    // Two points with the same x keep both of their rows.
    const twice = [{ name: 'A', values: [5, 6], xs: [1, 1] }]
    expect(parseTable(tableText(twice, 'scatter'), 'scatter')).toEqual(twice)
  })

  it('are the same table read another way when the kind of chart changes', () => {
    const asColumns = parseTable(tableText(parseTable('x\tA\n1\t10\n2\t20', 'scatter'), 'scatter'))
    expect(asColumns).toEqual([{ name: 'x', values: [1, 2] }, { name: 'A', values: [10, 20] }])
    expect(parseTable(tableText(asColumns), 'scatter')).toEqual([{ name: 'A', values: [10, 20], xs: [1, 2] }])
  })
})

describe('axes', () => {
  it('use the ends the scientist set exactly, with round numbers in between', () => {
    const a = axisFor(0, 12.4, { min: 3, max: 11 })
    expect([a.min, a.max]).toEqual([3, 11])
    expect(a.ticks.map((t) => t.value)).toEqual([4, 6, 8, 10])
    expect(a.at(3)).toBe(0)
    expect(a.at(11)).toBe(1)
    expect(a.at(7)).toBe(0.5)
    // One end alone is enough; the other is chosen to fit.
    expect(axisFor(0, 12.4, { min: 5 })).toMatchObject({ min: 5, max: 14 })
    expect(axisFor(0, 12.4, { max: 20 })).toMatchObject({ min: 0, max: 20 })
    // An end below the start is ignored.
    expect(axisFor(0, 12.4, { min: 5, max: 2 }).max).toBeGreaterThan(5)
    expect(axisFor(0, 12.4)).toMatchObject({ min: 0, max: 15, log: false })
  })

  it('run a logarithmic axis between powers of ten', () => {
    const a = axisFor(3, 4200, { log: true })
    expect([a.min, a.max, a.log]).toEqual([1, 10000, true])
    expect(a.ticks.map((t) => t.label)).toEqual(['1', '10', '100', '1000', '10000'])
    expect(a.at(1)).toBe(0)
    expect(a.at(100)).toBeCloseTo(0.5, 10)
    expect(a.at(10000)).toBeCloseTo(1, 10)
    // Two decades or fewer: the 2s and 5s are marked too.
    expect(axisFor(12, 80, { log: true }).ticks.map((t) => t.label)).toEqual(['10', '20', '50', '100'])
    expect(axisFor(0.02, 0.5, { log: true }).ticks.map((t) => t.label)).toEqual(['0.01', '0.02', '0.05', '0.1', '0.2', '0.5', '1'])
    // Very large and very small numbers are written as powers of ten.
    expect(axisFor(1e6, 1e9, { log: true }).ticks.map((t) => t.label)).toEqual(['10^{6}', '10^{7}', '10^{8}', '10^{9}'])
    expect(axisFor(1e-5, 1e-3, { log: true }).ticks.map((t) => t.label)).toContain('10^{-5}')
    // Ends that were set are kept; an end of zero or below cannot be used.
    expect(axisFor(3, 4200, { log: true, min: 2, max: 5000 })).toMatchObject({ min: 2, max: 5000 })
    expect(axisFor(3, 4200, { log: true, min: 0 }).min).toBe(1)
    expect(axisFor(-1, -1, { log: true })).toMatchObject({ min: 1, max: 10 })
  })

  it('cut the data off at the edge of the plot only when an end was set', () => {
    expect(chartLayout(chart()).clipped).toBe(false)
    const d = chartLayout(chart({ yMin: 3, yMax: 9 }))
    expect(d.clipped).toBe(true)
    expect(tickLabels(d)).toEqual(['4', '6', '8'])
    // The bar of the larger group (mean 10) reaches above the plot, where it is cut off.
    expect(d.rects[1].y).toBeLessThan(d.clip.y)
    expect(renderSvg(docOf(chart({ yMin: 3, yMax: 9 })), options).svg).toMatch(/<clipPath id="chart-clip-ch">/)
    expect(renderSvg(docOf(chart()), options).svg).not.toContain('clipPath')
  })

  it('on a logarithmic axis leave out what is not above zero, say so, and stand bars on the bottom of the axis', () => {
    const d = chartLayout(chart({ yLog: true, points: true, groups: [{ name: 'A', values: [0, 10, 100] }, { name: 'B', values: [1000, -5] }] }))
    expect(d.notes).toEqual(['2 values are zero or negative: on a logarithmic axis they cannot be shown, and the means, medians and error bars are worked out without them.'])
    expect(d.circles).toHaveLength(3)
    // Two decades: the 2s and 5s are marked as well.
    expect(tickLabels(d)).toEqual(['10', '20', '50', '100', '200', '500', '1000'])
    const bottom = d.clip.y + d.clip.h
    for (const r of d.rects) expect(r.y + r.h).toBeCloseTo(bottom, 0)
    // An error bar that would reach zero or below stops at the bottom of the axis, without a cap there.
    const sd = chartLayout(chart({ yLog: true, error: 'sd', groups: [{ name: 'A', values: [1, 100] }] }))
    expect(sd.lines).toHaveLength(2)
    expect(Math.max(...sd.lines.map((l) => Math.max(l.y1, l.y2)))).toBeCloseTo(bottom, 0)
  })
})

describe('box plots', () => {
  const node = chart({ kind: 'box', groups: [{ name: 'A', values: X }] })

  it('draw the box from the first to the third quartile, the median, whiskers, and outliers as rings', () => {
    const d = chartLayout(node)
    expect(d.rects).toHaveLength(1)
    // Axis 0 to 15: quartiles 4.025 and 7, median 5.3, whiskers 2.1 and 9.8, one outlier at 14.2.
    const y = (v: number): number => d.clip.y + d.clip.h * (1 - v / 15)
    expect(d.rects[0].y).toBeCloseTo(y(7), 0)
    expect(d.rects[0].y + d.rects[0].h).toBeCloseTo(y(4.025), 0)
    const median = d.lines.find((l) => l.width === 2)!
    expect(median.y1).toBeCloseTo(y(5.3), 0)
    const ys = d.lines.flatMap((l) => [l.y1, l.y2])
    expect(Math.min(...ys)).toBeCloseTo(y(9.8), 0)
    expect(Math.max(...ys)).toBeCloseTo(y(2.1), 0)
    expect(d.circles).toEqual([expect.objectContaining({ ring: true })])
    expect(d.circles[0].cy).toBeCloseTo(y(14.2), 0)
    expect(nodeLabel(node)).toBe('Box plot')
  })

  it('show every value instead of the rings when asked, and ignore the error bar setting', () => {
    const d = chartLayout({ ...node, points: true, error: 'sd' })
    expect(d.circles).toHaveLength(10)
    expect(d.circles.some((c) => c.ring)).toBe(false)
    // Stem, cap and stem, cap of the whiskers, and the median: no error bar.
    expect(d.lines).toHaveLength(5)
    expect(renderSvg(docOf(node), options).svg).toMatch(/<circle [^>]*fill="none" stroke="#2b2f36"/)
  })
})

describe('violin plots', () => {
  it('draw a closed outline as wide as the values are dense, the same on both sides, with the median', () => {
    const d = chartLayout(chart({ kind: 'violin', groups: [{ name: 'A', values: X }] }))
    expect(d.paths).toHaveLength(1)
    expect(d.paths[0].fill).toBe(CHART_COLOURS[0])
    const pts = d.paths[0].d.slice(1, -1).split('L').map((p) => p.split(' ').map(Number))
    const n = pts.length / 2
    expect(n).toBeGreaterThanOrEqual(30)
    const cx = d.clip.x + d.clip.w / 2
    // Point k on the way up and its partner on the way down are mirror images.
    for (let k = 0; k < n; k++) {
      expect(pts[k][0] - cx).toBeCloseTo(cx - pts[2 * n - 1 - k][0], 0)
      expect(pts[k][1]).toBeCloseTo(pts[2 * n - 1 - k][1], 5)
    }
    // It runs from the smallest to the largest value and no further.
    const y = (v: number): number => d.clip.y + d.clip.h * (1 - v / 15)
    expect(Math.max(...pts.map((p) => p[1]))).toBeCloseTo(y(2.1), 0)
    expect(Math.min(...pts.map((p) => p[1]))).toBeCloseTo(y(14.2), 0)
    // It is widest where the values crowd (around 5), not at the lone value at 14.2.
    const widthAt = (k: number): number => pts[k][0] - cx
    const widest = Math.max(...Array.from({ length: n }, (_, k) => widthAt(k)))
    expect(widthAt(n - 1)).toBeLessThan(widest * 0.5)
    expect(d.lines.filter((l) => l.width === 2)).toHaveLength(1)
    expect(d.notes).toEqual([])
  })

  it('show a group that is too small as dots, and say why', () => {
    const d = chartLayout(chart({ kind: 'violin', groups: [{ name: 'Many', values: X }, { name: 'Few', values: [1, 2, 3] }] }))
    expect(d.paths).toHaveLength(1)
    expect(d.circles).toHaveLength(3)
    expect(d.circles[0].fill).toBe(CHART_COLOURS[1])
    expect(d.notes).toEqual(['A violin needs at least 4 values that are not all the same: other groups are shown as dots.'])
  })
})

describe('scatter charts', () => {
  it('place every point on two numeric axes, with numbers along the bottom', () => {
    const d = chartLayout(scatter({ xLabel: 'Dose (µM)' }))
    expect(d.circles).toHaveLength(10)
    expect(d.rects).toEqual([])
    const bottomLabels = d.texts.filter((t) => t.align === 'center' && /^\d+$/.test(t.text)).map((t) => t.text)
    expect(bottomLabels).toEqual(['0', '5', '10', '15'])
    expect(d.texts.map((t) => t.text)).toContain('Dose (µM)')
    // One series: no legend, and no group names.
    expect(d.swatches).toEqual([])
    expect(d.texts.map((t) => t.text)).not.toContain('Run 1')
    for (const c of d.circles) expect(c.cx >= d.clip.x && c.cx <= d.clip.x + d.clip.w && c.cy >= d.clip.y && c.cy <= d.clip.y + d.clip.h).toBe(true)
    // The point with the largest x is the one furthest right.
    expect(Math.max(...d.circles.map((c) => c.cx))).toBe(d.circles[9].cx)
  })

  it('draw the least-squares line across the x values of its series', () => {
    const node = scatter({ fit: true })
    expect(scatterFits(node)[0].fit).toMatchObject({ n: 10 })
    expect(scatterFits(node)[0].fit!.slope).toBeCloseTo(1.126338859627, 9)
    const d = chartLayout(node)
    expect(d.paths).toHaveLength(1)
    const [[x1, y1], [x2, y2]] = d.paths[0].d.slice(1).split('L').map((p) => p.split(' ').map(Number))
    // The ends are at the smallest and largest x (2.1 and 14.2 on an axis from 0 to 15)...
    expect(x1).toBeCloseTo(d.clip.x + (d.clip.w * 2.1) / 15, 0)
    expect(x2).toBeCloseTo(d.clip.x + (d.clip.w * 14.2) / 15, 0)
    // ...at the heights the fitted line gives there (axis from 0 to 20).
    const y = (v: number): number => d.clip.y + d.clip.h * (1 - v / 20)
    expect(y1).toBeCloseTo(y(-0.700774152497 + 1.126338859627 * 2.1), 0)
    expect(y2).toBeCloseTo(y(-0.700774152497 + 1.126338859627 * 14.2), 0)
    expect(chartLayout(scatter()).paths).toEqual([])
  })

  it('give several series a legend, and fit logarithms on a logarithmic axis', () => {
    const two = scatter({ groups: [{ name: 'Run 1', values: Y, xs: X }, { name: 'Run 2', values: [1, 2], xs: [1, 2] }] })
    const d = chartLayout(two)
    expect(d.swatches).toHaveLength(2)
    expect(d.texts.map((t) => t.text)).toEqual(expect.arrayContaining(['Run 1', 'Run 2']))
    // y = 3 x squared is a straight line of slope 2 between the logarithms.
    const power = scatter({ fit: true, xLog: true, yLog: true, groups: [{ name: 'P', values: [3, 12, 300, 0], xs: [1, 2, 10, 5] }] })
    const fit = scatterFits(power)[0].fit!
    expect(fit.slope).toBeCloseTo(2, 10)
    expect(10 ** fit.intercept).toBeCloseTo(3, 10)
    expect(fit.r2).toBeCloseTo(1, 10)
    expect(chartLayout(power).notes).toEqual(['1 point is zero or negative on a logarithmic axis: it cannot be shown, and the fitted line is worked out without it.'])
    expect(chartLayout(power).circles).toHaveLength(3)
  })
})

describe('significance brackets', () => {
  const three = (extra: Partial<ChartNode> = {}): ChartNode =>
    chart({ groups: [{ name: 'A', values: [2, 4, 6] }, { name: 'B', values: [8, 10, 12] }, { name: 'C', values: [3, 5, 7] }], ...extra })
  /** The horizontal part of every bracket, lowest first. */
  const spans = (d: ReturnType<typeof chartLayout>) => d.rules.filter((l) => l.y1 === l.y2 && l.x2 - l.x1 > 20 && l.y1 < d.clip.y + d.clip.h - 1).sort((a, b) => b.y1 - a.y1)

  it('draw a line over two groups with the label that was typed, clear of the data', () => {
    const plain = chartLayout(three())
    const d = chartLayout(three({ brackets: [{ from: 0, to: 1, label: 'p = 0.03' }] }))
    expect(d.rules.length - plain.rules.length).toBe(3)
    const [span] = spans(d)
    // It runs from the middle of the first group to the middle of the second...
    expect(span.x1).toBeCloseTo(d.rects[0].x + d.rects[0].w / 2, 0)
    expect(span.x2).toBeCloseTo(d.rects[1].x + d.rects[1].w / 2, 0)
    // ...above the taller of the two bars.
    expect(span.y1).toBeLessThan(Math.min(d.rects[0].y, d.rects[1].y))
    const label = d.texts.find((t) => t.text === 'p = 0.03')!
    expect(label.x).toBeCloseTo((span.x1 + span.x2) / 2, 0)
    expect(label.y + label.fontSize * 1.25).toBeLessThanOrEqual(span.y1)
    // The data moved down to make room: nothing leaves the chart's box.
    expect(label.y).toBeGreaterThanOrEqual(0)
    expect(d.rects[1].y).toBeGreaterThan(plain.rects[1].y)
  })

  it('stack brackets that would collide, the wider over the narrower', () => {
    const d = chartLayout(three({ error: 'sd', points: true, brackets: [{ from: 0, to: 2, label: 'ns' }, { from: 0, to: 1, label: '**' }, { from: 1, to: 2, label: '*' }] }))
    const [low1, low2, high] = spans(d)
    expect(high.x2 - high.x1).toBeGreaterThan(low1.x2 - low1.x1)
    expect(high.y1).toBeLessThan(Math.min(low1.y1, low2.y1) - 13)
    // Every label is inside the chart, above its own line, and stars stay stars.
    for (const text of ['ns', '**', '*']) {
      const label = d.texts.find((t) => t.text === text)!
      expect(label.y, text).toBeGreaterThanOrEqual(0)
    }
    // The brackets clear the dots and error bars under them.
    const dataTop = Math.min(...d.circles.map((c) => c.cy), ...d.lines.map((l) => Math.min(l.y1, l.y2)))
    expect(Math.max(low1.y1, low2.y1)).toBeLessThan(dataTop + 13)
    expect(high.y1).toBeLessThan(dataTop)
  })

  it('leave out a bracket that points at a group without numbers, or at one group twice', () => {
    const plain = chartLayout(three())
    expect(chartLayout(three({ brackets: [{ from: 0, to: 7, label: 'x' }, { from: 1, to: 1, label: 'y' }] })).rules).toHaveLength(plain.rules.length)
    const withGap = three({ groups: [{ name: 'A', values: [1] }, { name: 'Empty', values: [] }, { name: 'C', values: [2] }], brackets: [{ from: 0, to: 2, label: 'ok' }, { from: 0, to: 1, label: 'no' }] })
    const names = chartLayout(withGap).texts.map((t) => t.text)
    expect(names).toContain('ok')
    expect(names).not.toContain('no')
  })

  it('work on a grouped chart, between any two bars', () => {
    const d = chartLayout(grouped({ brackets: [{ from: 0, to: 3, label: 'p < 0.001' }] }))
    const [span] = spans(d)
    expect(span.x1).toBeCloseTo(d.rects[0].x + d.rects[0].w / 2, 0)
    expect(span.x2).toBeCloseTo(d.rects[3].x + d.rects[3].w / 2, 0)
  })
})

describe('saving the new options', () => {
  it('keeps them, each rebuilt from what was stored', () => {
    const full = grouped({ kind: 'box', yMin: 1, yMax: 9, yLog: true, xLabel: 'Genotype', points: true, brackets: [{ from: 0, to: 3, label: '**' }] })
    expect(saved(full)).toEqual(full)
    const points = scatter({ fit: true, xMin: 0, xMax: 20, xLog: false, xLabel: 'Dose' })
    const { xLog: _drop, ...expected } = points
    expect(saved(points)).toEqual(expected)
  })

  it('never lets the x and y of a scatter point drift apart', () => {
    const odd = saved({ ...scatter(), groups: [{ name: 'A', values: [1, 'two', 3, 4, 5], xs: [10, 20, null, 40] }] })
    expect(odd.groups).toEqual([{ name: 'A', values: [1, 4], xs: [10, 40] }])
    expect(saved({ ...scatter(), groups: [{ name: 'A', values: [1, 2] }] }).groups).toEqual([{ name: 'A', values: [], xs: [] }])
    // In every other kind of chart there are no x values to keep.
    expect('xs' in saved({ ...chart(), groups: [{ name: 'A', values: [1], xs: [5] }] }).groups[0]).toBe(false)
  })

  it('drops axis ends that make no axis, brackets that point nowhere, and options of another kind of chart', () => {
    // An end at or below the start is no end: the start is kept, as it is when the chart is drawn.
    expect(saved({ ...chart(), yMin: 9, yMax: 3 })).toMatchObject({ yMin: 9 })
    expect(saved({ ...chart(), yMin: 9, yMax: 3 })).not.toHaveProperty('yMax')
    expect(saved({ ...chart(), yLog: true, yMin: 0, yMax: 100 })).toMatchObject({ yLog: true, yMax: 100 })
    expect(saved({ ...chart(), yLog: true, yMin: 0 })).not.toHaveProperty('yMin')
    expect(saved({ ...chart(), yMin: 'low', yMax: Infinity })).not.toHaveProperty('yMax')
    const b = saved({ ...chart(), brackets: [{ from: 0, to: 1, label: 'x'.repeat(100) }, { from: 0, to: 5, label: 'a' }, { from: 1, to: 1, label: 'b' }, { from: 0.5, to: 1, label: 'c' }, 'junk', { from: 1, to: 0 }] }).brackets
    expect(b).toEqual([{ from: 0, to: 1, label: 'x'.repeat(40) }, { from: 1, to: 0, label: '' }])
    const mixed = saved({ ...chart(), fit: true, xMin: 1, xMax: 5, xLog: true, groups: [{ name: 'A', values: [1], category: '  ' }] })
    expect(mixed).not.toHaveProperty('fit')
    expect(mixed).not.toHaveProperty('xMin')
    expect(mixed).not.toHaveProperty('xLog')
    expect(mixed.groups[0]).not.toHaveProperty('category')
    expect(saved({ ...scatter(), brackets: [{ from: 0, to: 1, label: 'a' }] })).not.toHaveProperty('brackets')
    expect(saved({ ...chart(), kind: 'violin' }).kind).toBe('violin')
  })

  it('exports every kind without a stray value', () => {
    for (const node of [grouped({ kind: 'box' }), grouped({ kind: 'violin', points: true }), scatter({ fit: true, yLog: true }), grouped({ kind: 'line', error: 'sem', brackets: [{ from: 0, to: 1, label: 'ns' }] })]) {
      const svg = renderSvg(docOf(node), options).svg
      expect(svg, node.kind).not.toMatch(/NaN|undefined|Infinity/)
      expect(svg, node.kind).toContain('<text')
    }
  })
})

// The table above: WT has Vehicle 1.25 and Drug 2.25 (means), KO has Vehicle 3.25 and Drug 4.25.
describe('stacked bars', () => {
  const bars = (node: ChartNode) => chartLayout(node).rects
  const foot = (r: { y: number; h: number }): number => r.y + r.h

  it('stand on top of each other within a category, in the order of the legend', () => {
    const side = bars(grouped())
    const stack = bars(grouped({ stacked: true }))
    expect(isStacked(grouped({ stacked: true }))).toBe(true)
    expect(stack).toHaveLength(4)
    // Side by side: four places across. Stacked: two, each holding two parts.
    expect(new Set(side.map((r) => r.x)).size).toBe(4)
    expect(new Set(stack.map((r) => r.x)).size).toBe(2)
    const [wtVehicle, wtDrug, koVehicle, koDrug] = stack
    expect(foot(wtDrug)).toBeCloseTo(wtVehicle.y, 0)
    expect(foot(koDrug)).toBeCloseTo(koVehicle.y, 0)
    expect(foot(wtVehicle)).toBeCloseTo(foot(koVehicle), 0)
    // Each part is as tall as its mean: 1.25, 2.25, 3.25 and 4.25 on one scale.
    const unit = wtVehicle.h / 1.25
    expect(wtDrug.h / unit).toBeCloseTo(2.25, 1)
    expect(koVehicle.h / unit).toBeCloseTo(3.25, 1)
    expect(koDrug.h / unit).toBeCloseTo(4.25, 1)
    // The axis reaches the tallest stack (7.5), not only the tallest mean.
    expect(Math.max(...tickLabels(chartLayout(grouped({ stacked: true }))).map(Number))).toBeGreaterThanOrEqual(7.5)
    expect([wtVehicle.fill, wtDrug.fill]).toEqual([koVehicle.fill, koDrug.fill])
  })

  it('hang means below zero under the base line', () => {
    const groups = parseTable('A\tA\nUp\tDown\n2\t-1\n4\t-3')
    const [up, down] = bars(chart({ groups, stacked: true }))
    expect(foot(up)).toBeCloseTo(down.y, 0)
    expect(down.h / up.h).toBeCloseTo(2 / 3, 1)
  })

  it('show means only, and say so when error bars or single values were asked for', () => {
    const plain = chartLayout(grouped({ stacked: true }))
    expect(plain.circles).toHaveLength(0)
    expect(plain.notes).toEqual([])
    const asked = chartLayout(grouped({ stacked: true, error: 'sd', points: true }))
    expect(asked.circles).toHaveLength(0)
    expect(asked.lines).toHaveLength(plain.lines.length)
    expect(asked.notes).toContain('Stacked bars show the mean of each series only: error bars and single values are left out.')
  })

  it('need categories and a linear axis: otherwise the bars stand side by side', () => {
    expect(isStacked(chart({ stacked: true }))).toBe(false)
    expect(bars(chart({ stacked: true }))).toEqual(bars(chart()))
    const log = chartLayout(grouped({ stacked: true, yLog: true }))
    expect(new Set(log.rects.map((r) => r.x)).size).toBe(4)
    expect(log.notes.some((n) => n.startsWith('Bars cannot be stacked on a logarithmic axis'))).toBe(true)
    expect(isStacked(grouped({ stacked: true, kind: 'box' }))).toBe(false)
  })

  it('write a number inside each part where it fits, and say which were left out', () => {
    const roomy = chartLayout(grouped({ stacked: true, w: 500, h: 420, valueLabels: { show: 'mean' } }))
    expect(['1.25', '2.25', '3.25', '4.25'].every((v) => roomy.texts.some((t) => t.text === v))).toBe(true)
    const part = roomy.rects[0]
    const label = roomy.texts.find((t) => t.text === '1.25')!
    expect(label.y).toBeGreaterThanOrEqual(part.y)
    expect(label.y).toBeLessThanOrEqual(part.y + part.h)
    const tight = chartLayout(grouped({ stacked: true, w: 200, h: 130, valueLabels: { show: 'mean' } }))
    expect(tight.notes.some((n) => /not fit in (its part|their parts) of the stacked bar/.test(n))).toBe(true)
  })

  it('take brackets between categories, above the whole stack, but not between two parts of one bar', () => {
    const between = chartLayout(grouped({ stacked: true, brackets: [{ from: 0, to: 2, label: 'across' }, { from: 0, to: 1, label: 'within' }] }))
    expect(between.texts.some((t) => t.text === 'across')).toBe(true)
    expect(between.texts.some((t) => t.text === 'within')).toBe(false)
    const top = Math.min(...between.rects.map((r) => r.y))
    expect(between.texts.find((t) => t.text === 'across')!.y).toBeLessThan(top)
  })

  it('are kept in a saved figure, for a bar chart only', () => {
    expect(saved(grouped({ stacked: true })).stacked).toBe(true)
    expect(saved({ ...grouped({ stacked: true }), kind: 'box' }).stacked).toBeUndefined()
    expect(saved({ ...grouped(), stacked: 'yes' }).stacked).toBeUndefined()
    expect(renderSvg(docOf(grouped({ stacked: true })), options).svg).toContain('<rect')
  })

  it('can be asked for in the instruction box', () => {
    const on = applyInstruction(grouped(), 'stack the bars')
    expect(on.node.stacked).toBe(true)
    expect(on.done).toEqual(['The bars of each category are stacked.'])
    expect(on.unclear).toEqual([])
    expect(applyInstruction(grouped(), 'stacked bar chart').node.stacked).toBe(true)
    const fromBoxes = applyInstruction(grouped({ kind: 'box' }), 'stacked bars')
    expect([fromBoxes.node.kind, fromBoxes.node.stacked]).toEqual(['bar', true])
    expect(fromBoxes.done).toEqual(['The chart is now a bar chart; the bars of each category are stacked.'])
    for (const words of ['bars side by side', 'unstack the bars', 'do not stack the bars', 'no stacking']) {
      const off = applyInstruction(grouped({ stacked: true }), words)
      expect(off.node.stacked, words).toBeUndefined()
      expect(off.done, words).toEqual(['The bars of a category stand side by side.'])
      expect(off.unclear, words).toEqual([])
    }
    const plain = applyInstruction(chart(), 'stack the bars')
    expect(plain.node.stacked).toBeUndefined()
    expect(plain.unclear[0]).toContain('Stacking needs a table with categories and series')
    expect(applyInstruction(scatter(), 'stacked').unclear[0]).toContain('not in a scatter chart')
  })
})

// The data of scripts/stats-reference.R: a rising curve, and a falling one with three values per dose.
describe('a dose-response curve on a scatter chart', () => {
  type DoseRef = { x: number[]; y: number[]; A: number; B: number; xmid: number; seXmid: number; tcrit: number }
  const sets = doseRef.dose as unknown as Record<'rise' | 'fall', DoseRef>
  const dose = (extra: Partial<ChartNode> = {}): ChartNode =>
    chart({ kind: 'scatter', fit: true, curve: 'dose', xLog: true, groups: [{ name: 'Agonist', values: sets.rise.y, xs: sets.rise.x }, { name: 'Inhibitor', values: sets.fall.y, xs: sets.fall.x }], ...extra })

  it('is fitted to each series and reported with its EC50 and the 95 % interval R gives', () => {
    const [rise, fall] = scatterFits(dose())
    expect(rise.dose!.logEc50).toBeCloseTo(sets.rise.xmid, 5)
    expect(fall.dose!.hill).toBeLessThan(0)
    const { ec50, low, high } = ec50Of(rise.dose!)
    expect(ec50).toBeCloseTo(10 ** sets.rise.xmid, 4)
    expect(low!).toBeCloseTo(10 ** (sets.rise.xmid - sets.rise.tcrit * sets.rise.seXmid), 3)
    expect(high!).toBeCloseTo(10 ** (sets.rise.xmid + sets.rise.tcrit * sets.rise.seXmid), 3)
    expect(doseText(rise.dose!)).toMatch(/^EC50 = 1\.93 \(95 % CI 1\.83 to 2\.04\), Hill slope 1\.19, bottom 2\.07, top 96\.9, R² = 0\.9999$/)
    expect(doseText(fall.dose!)).toMatch(/^IC50 = 5\.41 \(95 % CI [\d.]+ to [\d.]+\), Hill slope -1\.11, bottom 3\.96, top 100, R² = 0\.9955$/)
    // No curve is worked out unless one is asked for.
    expect(scatterFits(dose({ curve: undefined }))[0].dose).toBeNull()
    expect(scatterFits(dose({ fit: undefined }))[0].dose).toBeNull()
  })

  it('is drawn as a curve through the doses of its series, in place of the straight line', () => {
    const curved = chartLayout(dose())
    const straight = chartLayout(dose({ curve: undefined }))
    const long = (d: ReturnType<typeof chartLayout>) => d.paths.filter((p) => p.d.split('L').length > 40)
    expect(long(curved)).toHaveLength(2)
    expect(long(straight)).toHaveLength(0)
    expect(curved.paths.filter((p) => p.d.split('L').length === 2)).toHaveLength(0)
    expect(curved.notes).toEqual([])
    // It rises from left to right for the agonist: the last point is higher on the page (a smaller y).
    const [first, last] = [long(curved)[0].d.split('L')[0].slice(1), long(curved)[0].d.split('L').pop()!].map((p) => p.split(' ').map(Number))
    expect(last[0]).toBeGreaterThan(first[0])
    expect(last[1]).toBeLessThan(first[1])
    expect(renderSvg(docOf(dose()), options).svg).toContain('<path')
  })

  it('says what it could not do: no curve, doses of zero, an EC50 beyond the doses, a plain x axis', () => {
    const flat = chartLayout(dose({ groups: [{ name: 'Flat', values: [1, 2, 3, 4, 5, 6], xs: [1, 2, 4, 8, 16, 32] }] }))
    expect(flat.notes.some((n) => n.startsWith('No dose-response curve could be fitted to Flat'))).toBe(true)
    const zero = chartLayout(dose({ groups: [{ name: 'Agonist', values: [2, ...sets.rise.y], xs: [0, ...sets.rise.x] }], xLog: false }))
    expect(zero.notes.some((n) => n.startsWith('1 point has a dose of zero or below and is left out of the curve'))).toBe(true)
    expect(zero.notes.some((n) => n.startsWith('A dose-response curve is usually shown on a logarithmic x axis'))).toBe(true)
    // Only the lower half of the curve was measured: the middle is estimated beyond the highest dose.
    const half = sets.rise.x.map((x, i) => [x, sets.rise.y[i]] as const).filter(([x]) => x <= 1)
    const partial = dose({ groups: [{ name: 'Agonist', values: [...half.map((p) => p[1]), 31, 32], xs: [...half.map((p) => p[0]), 1.2, 1.4] }] })
    const fit = scatterFits(partial)[0].dose
    if (fit && fit.logEc50 > Math.log10(1.4)) expect(chartLayout(partial).notes.some((n) => n.includes('lies outside the doses that were tested'))).toBe(true)
  })

  it('is kept in a saved figure together with the fit, and only for a scatter chart', () => {
    expect(saved(dose()).curve).toBe('dose')
    expect(saved({ ...dose(), fit: undefined }).curve).toBeUndefined()
    expect(saved({ ...dose(), curve: 'spline' }).curve).toBeUndefined()
    expect(saved({ ...chart(), fit: true, curve: 'dose' }).curve).toBeUndefined()
  })

  it('has a text for the methods that names the equation, every curve and R', () => {
    const text = curveMethodsText(dose())!
    expect(text).toContain('y = bottom + (top − bottom) / (1 + 10^((log EC50 − log x) × Hill slope))')
    expect(text).toContain('Agonist: EC50 = 1.93 (95 % CI 1.83 to 2.04), Hill slope 1.19, bottom 2.07, top 96.9, R² = 0.9999, n = 9')
    expect(text).toContain('Inhibitor: IC50 = 5.41')
    expect(text).toContain('R 4.4 (nls with the model SSfpl)')
    expect(curveMethodsText(dose({ curve: undefined }))).toBeNull()
    expect(curveMethodsText(chart())).toBeNull()
  })

  it('can be asked for in the instruction box, and swapped for a straight line', () => {
    for (const words of ['fit a dose-response curve', 'dose response', '4PL fit', 'four-parameter logistic curve', 'sigmoidal curve', 'show the EC50', 'IC50 curve']) {
      const r = applyInstruction(dose({ fit: undefined, curve: undefined }), words)
      expect([r.node.fit, r.node.curve], words).toEqual([true, 'dose'])
      expect(r.unclear, words).toEqual([])
      expect(r.done, words).toEqual(['A dose-response curve (four-parameter logistic) is fitted to each series; its EC50 is listed under the table.'])
    }
    const line = applyInstruction(dose(), 'fit a regression line')
    expect([line.node.fit, line.node.curve]).toEqual([true, undefined])
    const off = applyInstruction(dose(), 'remove the dose-response curve')
    expect([off.node.fit, off.node.curve]).toEqual([undefined, undefined])
    expect(applyInstruction(dose(), 'no fitted line').node.curve).toBeUndefined()
    expect(applyInstruction(chart(), 'dose-response curve').unclear[0]).toContain('needs a scatter chart')
  })
})
