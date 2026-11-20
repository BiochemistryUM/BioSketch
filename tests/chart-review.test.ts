// One test for each defect an independent review found in the charts: tables read wrongly,
// extreme numbers, misleading drawings, and things that moved or changed without a word.

import { describe, expect, it } from 'vitest'
import { validateDoc } from '../src/io/files'
import {
  MAX_GROUPS, MAX_VALUES, axisFor, carryOver, chartLayout, chartSeries, crossTable, followGroups, headRows, niceScale, parseTable, pow10, readTable, scatterFits, shownValues,
  stats, tableText, usableEnds,
} from '../src/model/chart'
import { boxStats } from '../src/model/chartStats'
import { emptyDoc } from '../src/model/doc'
import { measureText } from '../src/model/nodes'
import type { ChartGroup, ChartNode, FigDoc, FigNode } from '../src/model/types'

const chart = (extra: Partial<ChartNode> = {}): ChartNode => ({
  id: 'ch', type: 'chart', x: 0, y: 0, w: 360, h: 260, rotation: 0, kind: 'bar',
  groups: [{ name: 'Control', values: [2, 4, 6] }, { name: 'Treated', values: [8, 10, 12] }],
  ...extra,
})
const saved = (node: object): ChartNode => validateDoc(JSON.parse(JSON.stringify({ ...emptyDoc(), nodes: [node as FigNode] } as FigDoc))).nodes[0] as ChartNode
const values = (text: string, kind: ChartNode['kind'] = 'bar'): number[][] => parseTable(text, kind).map((g) => g.values)
const tickLabels = (d: ReturnType<typeof chartLayout>): string[] => d.texts.filter((t) => t.align === 'right').map((t) => t.text)
/** Every number in a drawing. */
const numbers = (d: ReturnType<typeof chartLayout>): number[] => [
  ...d.rects.flatMap((r) => [r.x, r.y, r.w, r.h]),
  ...[...d.lines, ...d.rules].flatMap((l) => [l.x1, l.y1, l.x2, l.y2]),
  ...d.circles.flatMap((c) => [c.cx, c.cy, c.r]),
  ...d.texts.flatMap((t) => [t.x, t.y]),
  ...d.paths.flatMap((p) => p.d.split(/[MLZ ]/).filter(Boolean).map(Number)),
]

describe('numbers in a pasted table', () => {
  it('reads thousands separators as what they are', () => {
    expect(values('Ctrl\tDrug\n1,234.5\t980.2\n1,100.0\t975.1')).toEqual([[1234.5, 1100], [980.2, 975.1]])
    expect(values('Ctrl\tDrug\n1.234,5\t980,2\n1.100,0\t975,1')).toEqual([[1234.5, 1100], [980.2, 975.1]])
    expect(values('Ctrl\tDrug\n1,234,567\t980\n1,100,000\t975')).toEqual([[1234567, 1100000], [980, 975]])
    expect(values('A\tB\n1 234\t12 345,5')).toEqual([[1234], [12345.5]])
    // A point elsewhere in the table shows that its commas separate thousands.
    expect(values('Cells\tArea\n1,234\t12.5\n2,345\t13.5')).toEqual([[1234, 2345], [12.5, 13.5]])
  })

  it('takes a lone comma as a decimal comma, and says so when it could also be thousands', () => {
    const unclear = readTable('Ctrl\tDrug\n1,234\t2,345\n1,100\t980')
    expect(unclear.groups.map((g) => g.values)).toEqual([[1.234, 1.1], [2.345, 980]])
    expect(unclear.commasUnclear).toBe(true)
    const clear = readTable('Ctrl\tDrug\n1,5\t2,25')
    expect(clear.groups.map((g) => g.values)).toEqual([[1.5], [2.25]])
    expect(clear.commasUnclear).toBe(false)
  })

  it('understands a typographic minus sign', () => {
    expect(values('A\tB\n−5\t1\n−3\t2\n4\t3')).toEqual([[-5, -3, 4], [1, 2, 3]])
    expect(values('A\n–1.5\n-2.5')).toEqual([[-1.5, -2.5]])
  })

  it('never glues digits together, and counts what it could not read', () => {
    const r = readTable('A\tB\n1 2\t3\n4\t60%\n0x10\t1e\nInfinity\t5')
    expect(r.groups.map((g) => g.values)).toEqual([[4], [3, 5]])
    expect(r.unread).toBe(5)
    expect(r.example).toBe('1 2')
    expect(readTable('A\tB\n1\t2').unread).toBe(0)
    // Words in the body are counted too, but not empty cells.
    expect(readTable('A\tB\nn.d.\t5\n\t6').unread).toBe(1)
  })

  it('leaves out numbers too large or too close to zero to draw, instead of failing on them', () => {
    const r = readTable('p\n1e-120\n1e300\n0.5\n0')
    expect(r.groups[0].values).toEqual([0.5, 0])
    expect(r.unread).toBe(2)
  })
})

describe('columns of a pasted table', () => {
  it('reads one column as one group, whatever its name or decimal mark', () => {
    expect(parseTable('Wild type\n1,5\n2,3\n1,8')).toEqual([{ name: 'Wild type', values: [1.5, 2.3, 1.8] }])
    expect(parseTable('Wild type\n1.5\n2.3')).toEqual([{ name: 'Wild type', values: [1.5, 2.3] }])
    for (const name of ['Wild type', 'Ctrl, 10 uM', 'a;b', '2024']) {
      const one: ChartGroup[] = [{ name, values: [1.5, 2.5] }]
      expect(parseTable(tableText(one), 'bar', headRows(one, 'bar')), name).toEqual(one)
    }
  })

  it('tells decimal commas from commas between columns', () => {
    expect(values('1,5 2,5\n3,5 4,5')).toEqual([[1.5, 3.5], [2.5, 4.5]])
    expect(parseTable('A,B\n1,5\n2,6')).toEqual([{ name: 'A', values: [1, 2] }, { name: 'B', values: [5, 6] }])
    expect(values('A, B\n1.5, 2.5')).toEqual([[1.5], [2.5]])
  })

  it('reads a row typed by hand into a pasted table', () => {
    const table = 'Control\tTreated\tRescue\n4.1\t6.9\t5'
    expect(values(`${table}\n5 6 7`)).toEqual([[4.1, 5], [6.9, 6], [5, 7]])
    expect(values(`${table}\n4.4 7.1 5.3`)).toEqual([[4.1, 4.4], [6.9, 7.1], [5, 5.3]])
    expect(values(`${table}\n5, 6, 7`)).toEqual([[4.1, 5], [6.9, 6], [5, 7]])
    expect(values(`${table}\n4,4 7,1 5,3`)).toEqual([[4.1, 4.4], [6.9, 7.1], [5, 5.3]])
    expect(values(`${table}\n5,6,7`)).toEqual([[4.1, 5], [6.9, 6], [5, 7]])
  })

  it('takes a first row of numbers as names when told so, and flags it', () => {
    // Doses as column names: read as data unless the scientist (or the panel) says they are names.
    const doses = '0\t10\t100\n1.1\t2.2\t3.3\n1.2\t2.1\t3.5'
    const named = readTable(doses, 'bar', 1)
    expect(named.groups).toEqual([{ name: '0', values: [1.1, 1.2] }, { name: '10', values: [2.2, 2.1] }, { name: '100', values: [3.3, 3.5] }])
    expect(named.numericNames).toBe(true)
    expect(readTable(doses).head).toBe(0)
    // Numeric categories and numeric series names of a grouped chart.
    expect(parseTable('0\t0\t24\t24\nCtrl\tDrug\tCtrl\tDrug\n1\t2\t3\t4', 'bar', 2).map((g) => `${g.category}/${g.name}`)).toEqual(['0/Ctrl', '0/Drug', '24/Ctrl', '24/Drug'])
    expect(parseTable('WT\tWT\tKO\tKO\n0\t10\t0\t10\n1\t2\t3\t4', 'bar', 2).map((g) => `${g.category}/${g.name}:${g.values}`)).toEqual(['WT/0:1', 'WT/10:2', 'KO/0:3', 'KO/10:4'])
    // What the box writes is read back the same with the number of name rows it wrote.
    for (const groups of [
      [{ name: '2024', values: [1, 2] }, { name: '2025', values: [3, 4] }],
      [{ name: '0', values: [1], category: 'WT' }, { name: '10', values: [2], category: 'WT' }, { name: '0', values: [3], category: 'KO' }, { name: '10', values: [4], category: 'KO' }],
    ] as ChartGroup[][]) {
      expect(parseTable(tableText(groups), 'bar', headRows(groups, 'bar'))).toEqual(groups)
    }
    // Told there are no names, a row of words is counted as unread, and the groups are named for you.
    const none = readTable('A\tB\n1\t2', 'bar', 0)
    expect(none.groups.map((g) => g.name)).toEqual(['Group 1', 'Group 2'])
    expect(none.unread).toBe(2)
  })

  it('says when a table is larger than a chart takes', () => {
    const tall = readTable(`Cells\n${Array.from({ length: MAX_VALUES + 300 }, (_, i) => i + 1).join('\n')}`, 'violin')
    expect(tall.groups[0].values).toHaveLength(MAX_VALUES)
    expect(tall.droppedValues).toBe(300)
    const wide = readTable(Array.from({ length: MAX_GROUPS + 6 }, (_, i) => `g${i}`).join('\t') + '\n' + Array.from({ length: MAX_GROUPS + 6 }, () => 1).join('\t'))
    expect(wide.groups).toHaveLength(MAX_GROUPS)
    expect(wide.droppedGroups).toBe(6)
    // The chart itself keeps saying so after the box is closed.
    expect(chartLayout(chart({ kind: 'box', groups: tall.groups })).notes.join(' ')).toMatch(/at most 5000 values per group/)
    expect(chartLayout(chart({ groups: wide.groups })).notes.join(' ')).toMatch(/at most 24 groups/)
    expect(chartLayout(chart()).notes).toEqual([])
  })
})

describe('brackets and colours stay with their groups', () => {
  const before: ChartGroup[] = [{ name: 'Control', values: [1], color: '#888888' }, { name: 'Treated', values: [2], color: '#ff0000' }, { name: 'Rescue', values: [3] }]
  const names = (groups: ChartGroup[]): string[] => groups.map((g) => g.name)

  it('follow a group to its new place when a column is added, removed or moved', () => {
    const inserted = parseTable('Vehicle\tControl\tTreated\tRescue\n1\t2\t8\t3')
    expect(followGroups(before, inserted)).toEqual([1, 2, 3])
    const c = carryOver(before, inserted, [{ from: 0, to: 1, label: 'p = 0.01' }])
    expect(c.brackets).toEqual([{ from: 1, to: 2, label: 'p = 0.01' }])
    expect(c.groups.map((g) => g.color)).toEqual([undefined, '#888888', '#ff0000', undefined])
    expect(c.lost).toBe(0)
    const moved = carryOver(before, parseTable('Rescue\tTreated\tControl\n3\t2\t1'), [{ from: 0, to: 2, label: 'ns' }])
    expect(moved.brackets).toEqual([{ from: 2, to: 0, label: 'ns' }])
    expect(names(moved.groups.filter((g) => g.color === '#ff0000'))).toEqual(['Treated'])
  })

  it('drop a bracket whose group is gone, and count it', () => {
    const c = carryOver(before, parseTable('Control\tRescue\n1\t3'), [{ from: 0, to: 1, label: 'a' }, { from: 0, to: 2, label: 'b' }])
    expect(c.brackets).toEqual([{ from: 0, to: 1, label: 'b' }])
    expect(c.lost).toBe(1)
    expect(c.groups.map((g) => g.color)).toEqual(['#888888', undefined])
    expect(carryOver(before, parseTable('X\n1'), [{ from: 0, to: 1, label: 'a' }])).toMatchObject({ brackets: undefined, lost: 1 })
  })

  it('stay in place when a group is only renamed', () => {
    const c = carryOver(before, parseTable('Control\tDrug A\tRescue\n1\t2\t3'), [{ from: 0, to: 1, label: '**' }])
    expect(c.brackets).toEqual([{ from: 0, to: 1, label: '**' }])
    expect(c.groups[1]).toMatchObject({ name: 'Drug A', color: '#ff0000' })
    // Editing only the numbers changes nothing else.
    expect(carryOver(before, before.map((g) => ({ name: g.name, values: [9, 9] })), [{ from: 1, to: 2, label: '*' }]).brackets).toEqual([{ from: 1, to: 2, label: '*' }])
  })

  it('tell apart the same name in different categories of a grouped chart', () => {
    const g = (category: string, name: string, color?: string): ChartGroup => ({ name, category, values: [1], ...(color ? { color } : {}) })
    const old = [g('WT', 'Vehicle'), g('WT', 'Drug', '#ff0000'), g('KO', 'Vehicle'), g('KO', 'Drug', '#ff0000')]
    const next = [g('Het', 'Vehicle'), g('Het', 'Drug'), ...old.map((x) => ({ name: x.name, category: x.category, values: [2] }))]
    const c = carryOver(old, next, [{ from: 0, to: 3, label: 'p' }])
    expect(c.brackets).toEqual([{ from: 2, to: 5, label: 'p' }])
    expect(c.groups.map((x) => x.color)).toEqual([undefined, undefined, undefined, '#ff0000', undefined, '#ff0000'])
  })
})

describe('switching to a scatter chart and back', () => {
  it('reads the same table another way, which is why the panel keeps the original to return to', () => {
    const bars: ChartGroup[] = [{ name: 'Control', values: [1, 2] }, { name: 'Drug', values: [8, 9, 10] }]
    const asScatter = crossTable(bars, 'bar', 'scatter')
    expect(asScatter).toEqual([{ name: 'Drug', values: [8, 9], xs: [1, 2] }])
    // Coming back by reading again does not give the bars back: the third value of Drug is gone.
    expect(crossTable(asScatter, 'scatter', 'bar')).not.toEqual(bars)
    // Numeric names survive the crossing as names.
    expect(crossTable([{ name: '0', values: [1, 2] }, { name: '10', values: [3, 4] }], 'bar', 'scatter')).toEqual([{ name: '10', values: [3, 4], xs: [1, 2] }])
  })
})

describe('axes that cannot fail', () => {
  it('always give at least two finite ticks', () => {
    for (const [lo, hi] of [[0, 0], [1e16, 1e16], [-1e100, 1e100], [1e-100, 3e-100], [5, 5], [NaN, 1], [0, Infinity], [3, 2], [-7, -7], [1e99, 1e100]]) {
      const s = niceScale(lo, hi)
      expect(s.ticks.length, `${lo}..${hi}`).toBeGreaterThanOrEqual(2)
      expect(s.ticks.every((t) => Number.isFinite(t.value) && typeof t.label === 'string'), `${lo}..${hi}`).toBe(true)
      expect(s.max, `${lo}..${hi}`).toBeGreaterThan(s.min)
    }
    for (const opts of [{ log: true }, { log: true, min: 3, max: 8 }, { min: 1e16 }, { max: 1e-99, min: 0 }, { log: true, min: 1e-100, max: 1e100 }]) {
      for (const [lo, hi] of [[1e-100, 1], [1, 1], [1e16, 1e16], [-5, -1], [0, 0], [4, 7]]) {
        const a = axisFor(lo, hi, opts)
        expect(a.ticks.length, JSON.stringify([lo, hi, opts])).toBeGreaterThanOrEqual(2)
        expect(a.max).toBeGreaterThan(a.min)
        expect(a.ticks.every((t) => Number.isFinite(a.at(t.value)))).toBe(true)
      }
    }
  })

  it('draw a chart for any numbers a figure can hold', () => {
    const odd: Partial<ChartNode>[] = [
      { groups: [{ name: 'p', values: [1e-100, 3e-100] }] },
      { groups: [{ name: 'p', values: [1e100, -1e100] }], kind: 'box' },
      { groups: [{ name: 'p', values: [1.7e99, 1.7e99] }], error: 'sd' },
      { groups: [{ name: 'p', values: [1e16] }], yMin: 1e16 },
      { kind: 'scatter', groups: [{ name: 's', values: [1e16], xs: [1] }] },
      { kind: 'scatter', groups: [{ name: 's', values: [1, 2], xs: [2e16, 2e16] }], fit: true },
      { kind: 'scatter', groups: [{ name: 's', values: [1e-100, 1], xs: [1e-100, 1e100] }], xLog: true, yLog: true, fit: true },
      { kind: 'violin', groups: [{ name: 'v', values: [5, 5, 5, 5, 5] }] },
      { yLog: true, groups: [{ name: 'z', values: [0, 0] }] },
      { groups: [] },
      { w: 40, h: 40, title: 'T', xLabel: 'x', yLabel: 'y', fontSize: 60 },
    ]
    for (const extra of odd) {
      const d = chartLayout(saved(chart(extra)))
      for (const v of numbers(d)) expect(Number.isFinite(v), JSON.stringify(extra)).toBe(true)
    }
  })

  it('write very large and very small numbers as powers of ten', () => {
    expect(axisFor(0, 2.4e8).ticks.map((t) => t.label)).toEqual(['0', '0.5×10^{8}', '10^{8}', '1.5×10^{8}', '2×10^{8}', '2.5×10^{8}'])
    expect(axisFor(0, 0.00025).ticks.map((t) => t.label)).toEqual(['0', '0.5×10^{-4}', '10^{-4}', '1.5×10^{-4}', '2×10^{-4}', '2.5×10^{-4}'])
    // Ordinary numbers are written out as before.
    expect(axisFor(0, 48000).ticks.map((t) => t.label)).toEqual(['0', '10000', '20000', '30000', '40000', '50000'])
    expect(axisFor(0, 0.37).ticks.map((t) => t.label)).toEqual(['0.0', '0.1', '0.2', '0.3', '0.4'])
  })

  it('choose the same axis steps on every computer', () => {
    // On GitHub's machines (Node 22) `10 ** -5` was a hair below 0.00001, so the axis of 0 to
    // 0.00025 went up in steps of 10^{-4} there and in steps of 0.5×10^{-4} on a Mac.
    for (let n = -300; n <= 300; n++) expect(pow10(n)).toBe(Number(`1e${n}`))
    // A share that lands on 1, 2 or 5 give or take rounding keeps that step.
    expect(niceScale(0, 25 * (1 + 1e-12)).ticks.map((t) => t.value)).toEqual([0, 5, 10, 15, 20, 25])
    expect(niceScale(0, 0.0001 * (1 + 1e-12)).ticks.map((t) => t.value)).toEqual([0, 0.00002, 0.00004, 0.00006, 0.00008, 0.0001])
  })

  it('keep a logarithmic axis readable: at least two numbers, never dozens', () => {
    expect(axisFor(4, 7, { log: true, min: 3, max: 8 }).ticks.map((t) => t.label)).toEqual(['3', '5', '8'])
    expect(axisFor(4, 7, { log: true, min: 2.5, max: 4.5 }).ticks.length).toBeGreaterThanOrEqual(2)
    const wide = axisFor(1e-50, 1, { log: true })
    expect(wide.ticks.length).toBeLessThanOrEqual(10)
    expect(wide.ticks.length).toBeGreaterThanOrEqual(5)
    expect([wide.min, wide.max]).toEqual([1e-50, 1])
  })

  it('ignore an end that makes no axis, say so, and draw the same after the figure is reopened', () => {
    expect(usableEnds(50, 20, false)).toEqual({ min: 50 })
    expect(usableEnds(5, 5, false)).toEqual({ min: 5 })
    expect(usableEnds(0, 100, true)).toEqual({ max: 100 })
    expect(usableEnds(undefined, -5, true)).toEqual({})
    expect(usableEnds('low', Infinity, false)).toEqual({})
    expect(usableEnds(1, 9, false)).toEqual({ min: 1, max: 9 })
    // The data decide where the axis ends when the end that was typed cannot.
    expect(axisFor(0, 100, { min: 50, max: 20 })).toMatchObject({ min: 50, max: 100, ignored: true })
    expect(axisFor(0, 100, { max: 0 })).toMatchObject({ min: 0, max: 100, ignored: true })
    expect(axisFor(60, 100, { max: 10 }).max).toBe(100)
    expect(axisFor(0, 100, { min: 10, max: 90 }).ignored).toBe(false)
    for (const extra of [{ yMin: 10, yMax: 5 }, { yMin: 5, yMax: 5 }, { yMin: 0, yLog: true }, { yMax: -3 }, { yMin: 3, yMax: 9 }]) {
      const node = chart(extra)
      const [d, again] = [chartLayout(node), chartLayout(saved(node))]
      expect(tickLabels(again), JSON.stringify(extra)).toEqual(tickLabels(d))
      expect(again.clipped).toBe(d.clipped)
      expect(again.rects).toEqual(d.rects)
    }
    expect(chartLayout(chart({ yMin: 10, yMax: 5 })).notes[0]).toMatch(/An end set for the value axis cannot be used/)
    expect(chartLayout(chart({ yMin: 3, yMax: 9 })).notes).toEqual([])
  })
})

describe('what the chart draws is what the numbers say', () => {
  it('puts a value that lies exactly on a fence on the whisker, not among the outliers', () => {
    // First quartile 3.65, box length 0.7: the lower fence is exactly 2.6.
    expect(boxStats([2.6, 3.5, 3.8, 4.2, 4.3, 4.4, 4.8])).toMatchObject({ whiskerLow: 2.6, outliers: [] })
    expect(boxStats([1.3, 3.7, 4.6, 5.3, 5.8])).toMatchObject({ whiskerLow: 1.3, outliers: [] })
    expect(boxStats([0.7, 2.2, 2.3, 4.2])).toMatchObject({ whiskerHigh: 4.2, outliers: [] })
    expect(boxStats([2.59, 3.5, 3.8, 4.2, 4.3, 4.4, 4.8])!.outliers).toEqual([2.59])
  })

  it('works out the statistics of a logarithmic chart from the values it can show, and reports those', () => {
    const node = chart({ yLog: true, error: 'sd', groups: [{ name: 'A', values: [0, 0, 10, 100, 1000] }] })
    expect(shownValues(node, node.groups[0])).toEqual([10, 100, 1000])
    expect(shownValues({ ...node, yLog: undefined }, node.groups[0])).toEqual([0, 0, 10, 100, 1000])
    // The bar stands at the mean of the three values above zero (370), the number the panel prints too.
    const d = chartLayout(node)
    // (The axis runs from 10, the smallest value above zero, to 1000.)
    expect(tickLabels(d)).toEqual(['10', '20', '50', '100', '200', '500', '1000'])
    const at = (v: number): number => d.clip.y + d.clip.h * (1 - (Math.log10(v) - 1) / 2)
    expect(d.rects[0].y).toBeCloseTo(at(stats([10, 100, 1000]).mean), 0)
    // A mean below its own error bar's top is still on the axis: the bar is never left out.
    const low = chartLayout(chart({ yLog: true, error: 'sd', groups: [{ name: 'B', values: [1, 2, 3, 400] }] }))
    expect(low.rects[0].h).toBeGreaterThan(5)
    expect(d.notes[0]).toMatch(/worked out without them/)
    const pts = chart({ kind: 'scatter', yLog: true, fit: true, groups: [{ name: 's', values: [0, 10, 100], xs: [1, 2, 3] }] })
    expect(scatterFits(pts)[0]).toMatchObject({ points: 2 })
  })

  it('draws a violin widest where the values crowd, however far away one value lies', () => {
    const cluster = [0, 52.3, 52.4, 52.5, 52.6, 52.7, 52.8, 52.9, 53.0, 200]
    const d = chartLayout(chart({ kind: 'violin', groups: [{ name: 'A', values: cluster }] }))
    const pts = d.paths[0].d.slice(1, -1).split('L').map((p) => p.split(' ').map(Number))
    const cx = d.clip.x + d.clip.w / 2
    const up = pts.slice(0, pts.length / 2)
    const widest = up.reduce((best, p) => (p[0] > best[0] ? p : best))
    const y = (v: number): number => d.clip.y + d.clip.h * (1 - v / 200)
    // The widest point is at the cluster (about 52.65), and the lone values at 0 and 200 are thin.
    expect(widest[1]).toBeCloseTo(y(52.65), 0)
    expect(up[0][0] - cx).toBeLessThan((widest[0] - cx) * 0.3)
    expect(up[up.length - 1][0] - cx).toBeLessThan((widest[0] - cx) * 0.3)
    // Another case from the review: the mode is at 13, not at the smallest value.
    const d2 = chartLayout(chart({ kind: 'violin', groups: [{ name: 'B', values: [10, 11, 12, 13, 14, 15, 16, 300] }] }))
    const up2 = d2.paths[0].d.slice(1, -1).split('L').map((p) => p.split(' ').map(Number))
    const widest2 = up2.slice(0, up2.length / 2).reduce((best, p) => (p[0] > best[0] ? p : best))
    expect(widest2[1]).toBeCloseTo(d2.clip.y + d2.clip.h * (1 - 13 / 300), 0)
    // Values that are all the same have no outline: they are shown as dots, with a note.
    const flat = chartLayout(chart({ kind: 'violin', groups: [{ name: 'C', values: [5, 5, 5, 5, 5] }] }))
    expect(flat.paths).toEqual([])
    expect(flat.circles).toHaveLength(5)
    expect(flat.notes[0]).toMatch(/not all the same/)
  })

  it('keeps the fitted line of a scatter chart on the value axis', () => {
    for (const [xs, ys] of [[[0, 1, 2, 4, 8, 16], [0, 40, 70, 90, 98, 100]], [[0, 1, 2, 3], [0, 10, 10, 10]], [[1, 2, 4, 8, 16], [5, 60, 80, 90, 95]]]) {
      const d = chartLayout(chart({ kind: 'scatter', fit: true, groups: [{ name: 's', values: ys, xs }] }))
      const ends = d.paths[0].d.slice(1).split('L').map((p) => p.split(' ').map(Number))
      for (const [x, y] of ends) {
        expect(x >= d.clip.x - 0.1 && x <= d.clip.x + d.clip.w + 0.1, `${xs}`).toBe(true)
        expect(y >= d.clip.y - 0.1 && y <= d.clip.y + d.clip.h + 0.1, `${xs}`).toBe(true)
      }
    }
  })

  it('gives two columns of one category with the same name a place each', () => {
    const node = chart({ groups: parseTable('WT\t\t\tKO\t\nCtrl\tCtrl\tDrug\tCtrl\tDrug\n1\t7\t4\t2\t5\n2\t8\t5\t3\t6') })
    expect(chartSeries(node).map((s) => s.name)).toEqual(['Ctrl', 'Ctrl (2)', 'Drug'])
    const d = chartLayout(node)
    expect(new Set(d.rects.map((r) => r.x)).size).toBe(5)
    expect(d.swatches).toHaveLength(3)
  })
})

describe('brackets', () => {
  const pairs = (n: number): ChartNode['brackets'] => Array.from({ length: n }, (_, a) => Array.from({ length: n - a - 1 }, (_, k) => ({ from: a, to: a + k + 1, label: 'p = 0.01' }))).flat()
  const four: ChartGroup[] = [[10, 11, 12], [11, 12, 13], [12, 13, 14], [13, 14, 15]].map((v, i) => ({ name: `G${i}`, values: v }))
  const spans = (d: ReturnType<typeof chartLayout>) => d.rules.filter((l) => l.y1 === l.y2 && l.x2 - l.x1 > 20 && l.y1 < d.clip.y + d.clip.h - 1)

  it('never squash the data flat or turn the axis upside down, and say when they do not all fit', () => {
    for (const size of [{ w: 360, h: 260, fontSize: 20 }, { w: 240, h: 160 }, { w: 200, h: 130 }]) {
      const d = chartLayout(chart({ ...size, groups: four, brackets: pairs(4), title: 'T', xLabel: 'x' }))
      const ticks = d.texts.filter((t) => t.align === 'right')
      // Larger values stay above smaller ones.
      for (let i = 1; i < ticks.length; i++) expect(ticks[i].y, JSON.stringify(size)).toBeLessThan(ticks[i - 1].y)
      // The bars keep a real height: at least a third of the plot for the tallest.
      expect(Math.max(...d.rects.map((r) => r.h))).toBeGreaterThan(d.clip.h * 0.3)
      for (const r of d.rects) expect(r.y + r.h).toBeCloseTo(d.clip.y + d.clip.h, 0)
      expect(d.notes).toContain('Not all brackets fit above the data: make the chart taller, or remove some.')
    }
    // With room for them, no note.
    expect(chartLayout(chart({ w: 400, h: 400, groups: four, brackets: pairs(3) })).notes).toEqual([])
  })

  it('stand above bars that hang below zero, and inside the chart when the columns are cut off', () => {
    const negative = chartLayout(chart({ error: 'sd', groups: [{ name: 'A', values: [-4, -5, -6] }, { name: 'B', values: [-7, -8, -9] }], brackets: [{ from: 0, to: 1, label: '**' }] }))
    const [line] = spans(negative)
    // Both bars hang from the zero line at the top of the plot: the bracket is above it, not through them.
    expect(line.y1).toBeLessThan(Math.min(...negative.rects.map((r) => r.y)))
    const cut = chartLayout(chart({ kind: 'dot', yMin: 50, groups: [{ name: 'A', values: [20, 22, 25] }, { name: 'B', values: [28, 30, 31] }, { name: 'C', values: [80, 85, 90] }], brackets: [{ from: 0, to: 1, label: 'ns' }] }))
    const [inside] = spans(cut)
    expect(inside.y1).toBeGreaterThan(0)
    expect(inside.y1).toBeLessThan(cut.clip.y + cut.clip.h)
  })
})

describe('words along the bottom', () => {
  it('break long group names into lines instead of running into each other', () => {
    const names = ['Control', 'LPS 100 ng/ml', 'LPS + inhibitor', 'Inhibitor alone']
    const d = chartLayout(chart({ groups: names.map((name) => ({ name, values: [1, 2] })) }))
    const labels = d.texts.filter((t) => names.some((n) => t.text.replace(/\n/g, ' ') === n))
    expect(labels).toHaveLength(4)
    expect(labels.some((t) => t.text.includes('\n'))).toBe(true)
    const boxes = labels.map((t) => ({ left: t.x - measureText(t).w / 2, right: t.x + measureText(t).w / 2 })).sort((a, b) => a.left - b.left)
    for (let i = 1; i < boxes.length; i++) expect(boxes[i].left).toBeGreaterThanOrEqual(boxes[i - 1].right - 0.5)
    expect(boxes[boxes.length - 1].right).toBeLessThanOrEqual(360)
    // Two lines of names take room from the plot; names that fit on one line change nothing.
    expect(d.clip.h).toBeLessThan(chartLayout(chart()).clip.h)
    expect(chartLayout(chart()).texts.find((t) => t.text === 'Control')!.text).toBe('Control')
  })

  it('leave out numbers of a scatter chart that would run together, and keep the last inside the chart', () => {
    for (const [w, xs] of [[360, [1e6, 1e8, 2.48e8]], [360, [1, 2.5e9]], [200, [10, 10000, 25000]], [360, [0, 1000]], [360, [0, 0.00025]]] as [number, number[]][]) {
      const d = chartLayout(chart({ kind: 'scatter', w, groups: [{ name: 's', values: xs.map(() => 1), xs }] }))
      const bottom = d.texts.filter((t) => t.align === 'center' && t.y > d.clip.y + d.clip.h)
      expect(bottom.length, `${xs}`).toBeGreaterThanOrEqual(2)
      const boxes = bottom.map((t) => ({ left: t.x - measureText(t).w / 2, right: t.x + measureText(t).w / 2 })).sort((a, b) => a.left - b.left)
      for (let i = 1; i < boxes.length; i++) expect(boxes[i].left, `${xs}`).toBeGreaterThanOrEqual(boxes[i - 1].right)
      expect(boxes[boxes.length - 1].right, `${xs}`).toBeLessThanOrEqual(w + 0.5)
    }
  })
})
