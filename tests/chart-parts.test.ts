// The part of a chart under a press, and the setting of the panel it leads to.

import { describe, expect, it } from 'vitest'
import { chartLayout, partOf, readTable, type ChartDrawing, type ChartPart } from '../src/model/chart'
import { partAt, partBox, pathPoints } from '../src/model/chartParts'
import { chartTabs, settingFor } from '../src/ui/chartTabs'
import type { ChartKind, ChartNode } from '../src/model/types'

const chart = (more: Partial<ChartNode>): ChartNode => ({ id: 'c', type: 'chart', x: 0, y: 0, w: 420, h: 300, rotation: 0, kind: 'bar', groups: [], ...more })

const bars = chart({
  groups: [
    { name: 'Control', values: [4, 5, 6] },
    { name: 'Drug', values: [8, 9, 11] },
    { name: 'Both', values: [12, 14, 13] },
  ],
  error: 'sd',
  title: 'Viability',
  yLabel: 'Cells (%)',
  xLabel: 'Treatment',
  brackets: [{ from: 0, to: 2, label: '**' }],
  refLines: [{ axis: 'y', value: 10, label: 'limit' }],
  valueLabels: { show: 'mean' },
})

const what = (hit: { part: ChartPart } | null): string => (hit ? `${hit.part.what}${hit.part.at === undefined ? '' : ` ${hit.part.at}`}` : 'nothing')
const marked = <T extends object>(list: T[], part: string): T[] => list.filter((m) => what({ part: partOf(m) ?? { what: 'title' } }) === part && partOf(m))
const textAt = (d: ChartDrawing, text: string) => {
  const t = d.texts.find((x) => x.text === text)!
  return [t.align === 'right' ? t.x - 3 : t.align === 'left' ? t.x + 3 : t.x, t.y + (t.fontSize * 1.25) / 2] as const
}

describe('the outline of a path of a chart', () => {
  it('follows straight pieces', () => {
    expect(pathPoints('M0 0L10 0L10 5Z')).toEqual([{ points: [[0, 0], [10, 0], [10, 5]], closed: true }])
    expect(pathPoints('M1 2H5V9M20 20L21 21')).toEqual([
      { points: [[1, 2], [5, 2], [5, 9]], closed: false },
      { points: [[20, 20], [21, 21]], closed: false },
    ])
  })

  it('cuts the round edge of a pie slice into short pieces on its circle', () => {
    // A quarter of a pie of radius 10 about (50, 50), from the top round to the right.
    const [slice] = pathPoints('M50 50L50 40A10 10 0 0 1 60 50Z')
    expect(slice.closed).toBe(true)
    expect(slice.points[0]).toEqual([50, 50])
    for (const [x, y] of slice.points.slice(1)) {
      expect(Math.hypot(x - 50, y - 50)).toBeCloseTo(10, 6)
      expect(x).toBeGreaterThanOrEqual(50 - 1e-9)
      expect(y).toBeLessThanOrEqual(50 + 1e-9)
    }
    // The large part of the circle, the other three quarters, goes the long way round.
    const [rest] = pathPoints('M50 50L60 50A10 10 0 1 1 50 40Z')
    expect(rest.points.some(([x, y]) => x < 45 && y > 55)).toBe(true)
  })
})

describe('the part of a chart under a press', () => {
  const d = chartLayout(bars)

  it('is not written on the marks themselves', () => {
    for (const list of [d.rects, d.lines, d.rules, d.texts, d.dashes]) for (const m of list) expect(m).not.toHaveProperty('part')
    expect(d.rects.every((r) => partOf(r)?.what === 'group')).toBe(true)
  })

  it('is the bar pressed, by its place in the table', () => {
    d.rects.forEach((r, i) => expect(what(partAt(d, r.x + r.w * 0.2, r.y + r.h - 3, 3))).toBe(`group ${i}`))
    // The name under a bar belongs to its group too.
    expect(what(partAt(d, ...textAt(d, 'Drug'), 3))).toBe('group 1')
  })

  it('is an error bar within reach of it, also inside the bar it stands in', () => {
    const stem = marked(d.lines, 'error 1').find((l) => l.x1 === l.x2)!
    const [top, foot] = [Math.min(stem.y1, stem.y2), Math.max(stem.y1, stem.y2)]
    expect(what(partAt(d, stem.x1 + 2, top + 2, 3))).toBe('error 1')
    expect(what(partAt(d, stem.x1 + 2, foot - 2, 3))).toBe('error 1')
    // A finger reaches further than a mouse (beside the stem, between its caps).
    const middle = (top + foot) / 2
    expect(what(partAt(d, stem.x1 + 9, middle, 3))).not.toBe('error 1')
    expect(what(partAt(d, stem.x1 + 9, middle, 12))).toBe('error 1')
  })

  it('is lettering before anything under it', () => {
    expect(what(partAt(d, ...textAt(d, 'Viability'), 3))).toBe('title')
    expect(what(partAt(d, ...textAt(d, 'Treatment'), 3))).toBe('xTitle')
    expect(what(partAt(d, ...textAt(d, '**'), 3))).toBe('bracket 0')
    expect(what(partAt(d, ...textAt(d, 'limit'), 3))).toBe('refLine 0')
    // The number written in a bar, not the bar.
    const number = marked(d.texts, 'number')[0]
    expect(what(partAt(d, number.x, number.y + 8, 3))).toBe('number')
    // The title up the side is turned a quarter: its box is upright.
    const side = d.texts.find((t) => t.text === 'Cells (%)')!
    const box = partBox(d, { what: 'yTitle' })!
    expect(box.h).toBeGreaterThan(box.w)
    expect(what(partAt(d, box.x + box.w / 2, box.y + box.h / 2, 3))).toBe('yTitle')
    expect(side.rotation).toBe(-90)
  })

  it('is the axis beside the bars, and the bar when the press is inside one', () => {
    const tick = d.texts.find((t) => partOf(t)?.what === 'yAxis')!
    expect(what(partAt(d, tick.x - 3, tick.y + 8, 3))).toBe('yAxis')
    const base = marked(d.rules, 'xAxis')[0]
    const bar = d.rects[0]
    // (At its left edge: the number of the bar is written at the middle of its foot.)
    expect(what(partAt(d, bar.x + 3, base.y1 - 2, 4))).toBe('group 0')
    expect(what(partAt(d, bar.x - 6, base.y1 + 2, 4))).toBe('xAxis')
  })

  it('is a dashed line at a value, and a bracket', () => {
    const dash = d.dashes[0]
    const between = (d.rects[0].x + d.rects[0].w + d.rects[1].x) / 2
    expect(what(partAt(d, between, dash.y1 + 1, 3))).toBe('refLine 0')
    const span = marked(d.rules, 'bracket 0').find((l) => l.y1 === l.y2)!
    expect(what(partAt(d, (span.x1 + span.x2) / 2, span.y1 + 1, 3))).toBe('bracket 0')
  })

  it('is nothing where nothing is', () => {
    expect(partAt(d, bars.w - 2, bars.h - 2, 3)).toBeNull()
    expect(partAt(chartLayout(chart({})), 100, 100, 5)).toBeNull()
  })

  it('comes with a box round all that is drawn for it', () => {
    const hit = partAt(d, d.rects[1].x + 4, d.rects[1].y + d.rects[1].h - 3, 3)!
    const bar = d.rects[1]
    expect(hit.box.x).toBeLessThanOrEqual(bar.x)
    expect(hit.box.x + hit.box.w).toBeGreaterThanOrEqual(bar.x + bar.w)
    // The name under the bar is part of the group, so the box reaches below the bar.
    expect(hit.box.y + hit.box.h).toBeGreaterThan(bar.y + bar.h)
    expect(partBox(d, { what: 'legend', at: 0 })).toBeNull()
  })
})

describe('parts of the other kinds of chart', () => {
  it('a scatter chart: points, the fitted line, the legend, the x axis', () => {
    const node = chart({ kind: 'scatter', fit: true, groups: [{ name: 'A', values: [1, 2, 3, 4], xs: [1, 2, 3, 4] }, { name: 'B', values: [4, 3, 3, 1], xs: [1, 2, 3, 4] }] })
    const d = chartLayout(node)
    const point = d.circles.filter((c) => partOf(c)?.at === 1)[0]
    expect(what(partAt(d, point.cx + 1, point.cy, 3))).toBe('group 1')
    const [line] = pathPoints(d.paths.find((p) => partOf(p)?.what === 'fit' && partOf(p)?.at === 0)!.d)
    const mid = [(line.points[0][0] * 3 + line.points[1][0]) / 4, (line.points[0][1] * 3 + line.points[1][1]) / 4]
    expect(what(partAt(d, mid[0] + 12, mid[1] + 12, 2))).toBe('nothing')
    expect(['fit 0', 'group 0']).toContain(what(partAt(d, mid[0], mid[1] + 1, 2)))
    expect(what(partAt(d, d.swatches[1].x + 2, d.swatches[1].y + 2, 2))).toBe('legend 1')
    const tick = d.texts.find((t) => partOf(t)?.what === 'xAxis')!
    expect(what(partAt(d, tick.x, tick.y + 6, 2))).toBe('xAxis')
  })

  it('a pie: the slice pressed', () => {
    const d = chartLayout(chart({ kind: 'pie', pieLabels: 'none', groups: [{ name: 'A', values: [3] }, { name: 'B', values: [1] }] }))
    const [big] = pathPoints(d.paths[0].d)
    const [cx, cy] = big.points[0]
    // The first slice starts at the top and runs clockwise: three quarters, so the right side is A's and the upper left B's.
    const r = Math.hypot(big.points[1][0] - cx, big.points[1][1] - cy)
    expect(what(partAt(d, cx + r * 0.5, cy, 2))).toBe('group 0')
    expect(what(partAt(d, cx - r * 0.4, cy - r * 0.4, 2))).toBe('group 1')
    expect(what(partAt(d, cx - r * 0.4, cy + r * 0.4, 2))).toBe('group 0')
  })

  it('a heat map: the cells, the name of a column, the scale', () => {
    const d = chartLayout(chart({ kind: 'heatmap', groups: readTable('Name\tA\tB\ng1\t1\t2\ng2\t3\t4', 'heatmap').groups }))
    const cell = d.rects.find((r) => partOf(r)?.what === 'cells')!
    expect(what(partAt(d, cell.x + cell.w / 2, cell.y + cell.h / 2, 3))).toBe('cells')
    expect(what(partAt(d, ...textAt(d, 'B'), 3))).toBe('group 1')
    expect(what(partAt(d, ...textAt(d, 'g2'), 3))).toBe('yAxis')
    const step = d.rects.find((r) => partOf(r)?.what === 'scale')!
    expect(what(partAt(d, step.x + 5, step.y + 1, 3))).toBe('scale')
  })

  it('a Venn diagram: the circle of a set, and the numbers', () => {
    const d = chartLayout(chart({ kind: 'venn', w: 320, h: 300, groups: readTable('A\tB\tA & B\n120\t85\t30', 'venn').groups }))
    const [a, b] = d.circles.filter((c) => !c.ring)
    expect(what(partAt(d, a.cx - a.r * 0.8, a.cy - a.r * 0.4, 3))).toBe('group 0')
    expect(what(partAt(d, b.cx + b.r * 0.8, b.cy + a.r * 0.4, 3))).toBe('group 1')
    expect(what(partAt(d, ...textAt(d, '30'), 3))).toBe('number')
    expect(what(partAt(d, ...textAt(d, 'B (85)'), 3))).toBe('group 1')
  })

  it('survival curves: the curve of a group', () => {
    const d = chartLayout(chart({ kind: 'scatter', survival: true, groups: [{ name: 'Control', xs: [5, 8, 12, 15], values: [1, 1, 1, 0] }, { name: 'Treated', xs: [10, 18, 25, 30], values: [1, 0, 1, 0] }] }))
    const [curve] = pathPoints(d.paths.find((p) => partOf(p)?.at === 1)!.d)
    const [x, y] = [(curve.points[0][0] + curve.points[1][0]) / 2, curve.points[0][1]]
    expect(['group 0', 'group 1']).toContain(what(partAt(d, x, y, 2)))
    const last = curve.points[curve.points.length - 1]
    expect(what(partAt(d, last[0] - 1, last[1], 2))).toBe('group 1')
  })
})

describe('the setting a part leads to', () => {
  const to = (part: ChartPart, kind: ChartKind = 'bar', survival = false): string => {
    const s = settingFor(part, kind, survival)
    return `${s.tab}/${s.setting}`
  }

  it('is under the heading that holds it', () => {
    expect(to({ what: 'group', at: 2 })).toBe('look/group-2')
    expect(to({ what: 'category', at: 1 })).toBe('look/category-1')
    expect(to({ what: 'legend', at: 0 })).toBe('look/legend')
    expect(to({ what: 'number' })).toBe('look/numbers')
    expect(to({ what: 'error', at: 0 })).toBe('stats/error')
    expect(to({ what: 'bracket', at: 3 })).toBe('stats/bracket-3')
    expect(to({ what: 'fit', at: 0 }, 'scatter')).toBe('stats/fit')
    expect(to({ what: 'result' }, 'scatter')).toBe('stats/corr')
    expect(to({ what: 'result' }, 'scatter', true)).toBe('stats/log-rank')
    expect(to({ what: 'refLine', at: 1 })).toBe('axes/line-1')
    expect(to({ what: 'pointName' }, 'scatter')).toBe('axes/point-names')
    expect(to({ what: 'yAxis' })).toBe('axes/y-range')
    expect(to({ what: 'yAxis' }, 'scatter', true)).toBe('axes/y-title')
    expect(to({ what: 'xAxis' })).toBe('axes/x-title')
    expect(to({ what: 'xAxis' }, 'scatter')).toBe('axes/x-range')
    expect(to({ what: 'yTitle' })).toBe('axes/y-title')
    expect(to({ what: 'xTitle' })).toBe('axes/x-title')
    expect(to({ what: 'title' })).toBe('axes/title')
  })

  it('is somewhere the chart has: a pie and a Venn diagram keep their title under Look, a heat map its row names in the table', () => {
    expect(to({ what: 'title' }, 'pie')).toBe('look/title')
    expect(to({ what: 'title' }, 'venn')).toBe('look/title')
    expect(to({ what: 'number' }, 'venn')).toBe('look/numbers')
    expect(to({ what: 'number' }, 'heatmap')).toBe('look/heat-numbers')
    expect(to({ what: 'cells' }, 'heatmap')).toBe('look/heat-scale')
    expect(to({ what: 'scale' }, 'heatmap')).toBe('look/heat-scale')
    expect(to({ what: 'yAxis' }, 'heatmap')).toBe('data/table')
    expect(chartTabs('venn')).toEqual(['data', 'look'])
    expect(chartTabs('heatmap')).toEqual(['data', 'stats', 'look', 'axes'])
  })
})
