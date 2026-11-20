// Charts drawn as small panels (facets; `facetsOf`, `facetLayout` in src/model/chart.ts): which
// charts can be split, what each panel holds, one range for every panel or one each, brackets with
// the labels of the whole chart, presses on a panel, and the setting saved and read back.

import { describe, expect, it } from 'vitest'
import { renderSvg } from '../src/io/export'
import { validateDoc } from '../src/io/files'
import { emptyDoc } from '../src/model/doc'
import { bracketLabel, canFacet, chartLayout, chartSeries, facetsOf, type ChartDrawing } from '../src/model/chart'
import { partAt } from '../src/model/chartParts'
import type { ChartGroup, ChartNode } from '../src/model/types'

const chart = (start: Partial<ChartNode>): ChartNode => ({ id: 'c1', type: 'chart', x: 0, y: 0, w: 480, h: 300, rotation: 0, kind: 'bar', groups: [], ...start })
const reopened = (n: ChartNode): ChartNode => validateDoc({ app: 'biosketch', version: 1, name: 't', width: 600, height: 400, background: '#ffffff', nodes: [n], customIcons: {} }).nodes[0] as ChartNode

// Two genes on very different scales, each with vehicle and drug.
const genes: ChartGroup[] = [
  { name: 'Vehicle', category: 'Il6', values: [1, 1.2, 0.9] },
  { name: 'Drug', category: 'Il6', values: [2, 2.3, 1.8] },
  { name: 'Vehicle', category: 'Actb', values: [98, 101, 99] },
  { name: 'Drug', category: 'Actb', values: [97, 100, 103] },
]

/** The numbers of a panel's value axis, top to bottom as written. */
const ticks = (d: ChartDrawing): string[] => d.texts.filter((t) => t.align === 'right').map((t) => t.text)

describe('which charts can be drawn as small panels', () => {
  it('splits a grouped chart by category or by series, and a scatter chart by series', () => {
    const grouped = chart({ groups: genes, facet: {} })
    expect(facetsOf(grouped)).toEqual([
      { name: 'Il6', groups: [0, 1] },
      { name: 'Actb', groups: [2, 3] },
    ])
    expect(facetsOf({ ...grouped, facet: { by: 'series' } })).toEqual([
      { name: 'Vehicle', groups: [0, 2] },
      { name: 'Drug', groups: [1, 3] },
    ])
    const scatter = chart({ kind: 'scatter', groups: [0, 1, 2].map((k) => ({ name: `S${k}`, values: [1, 2, 3], xs: [1, 2, 3] })), facet: {} })
    expect(facetsOf(scatter)?.map((f) => f.groups)).toEqual([[0], [1], [2]])
  })

  it('does not split a chart of one factor, or analyses whose fit takes every series together', () => {
    expect(canFacet(chart({ groups: [{ name: 'A', values: [1, 2] }, { name: 'B', values: [3, 4] }] }))).toBe(false)
    expect(canFacet(chart({ groups: genes }))).toBe(true)
    const xy = [0, 1].map((k) => ({ name: `S${k}`, values: [1, 0, 1], xs: [1, 2, 3] }))
    for (const extra of [{ survival: true }, { kinetics: {} }, { binding: {} }, { melt: {} }]) expect(canFacet(chart({ kind: 'scatter', groups: xy, ...extra }))).toBe(false)
    expect(canFacet(chart({ kind: 'pie', groups: genes }))).toBe(false)
  })
})

describe('the panels', () => {
  it('draws one panel per category with one range for all, or one range each', () => {
    const node = chart({ groups: genes, facet: {}, yLabel: 'Expression', title: 'Two genes' })
    const d = chartLayout(node)
    expect(d.panels).toHaveLength(2)
    const [a, b] = d.panels!
    expect(a.y).toBe(b.y)
    expect(b.x).toBeGreaterThan(a.x + a.w - 1)
    // Shared: the same numbers on both value axes.
    expect(ticks(a.drawing)).toEqual(ticks(b.drawing))
    // Each panel is named; the title and the axis title are written once, by the whole chart.
    expect(a.drawing.texts.some((t) => t.text === 'Il6' && t.bold)).toBe(true)
    expect(d.texts.filter((t) => t.text === 'Expression')).toHaveLength(1)
    expect(d.texts.filter((t) => t.text === 'Two genes')).toHaveLength(1)
    expect(d.panels!.some((p) => p.drawing.texts.some((t) => t.text === 'Expression'))).toBe(false)
    // The shared range holds every value, so nothing is cut off; a range set by hand still cuts.
    expect(d.panels!.some((p) => p.drawing.clipped)).toBe(false)
    expect(chartLayout({ ...node, yMax: 50 }).panels!.every((p) => p.drawing.clipped)).toBe(true)
    const free = chartLayout({ ...node, facet: { free: true } })
    expect(ticks(free.panels![0].drawing)).not.toEqual(ticks(free.panels![1].drawing))
  })

  it('keeps the colour of each series in every panel, and names the series once in the legend', () => {
    const node = chart({ groups: genes, facet: {} })
    const d = chartLayout(node)
    const colours = chartSeries(node).map((s) => s.colour)
    for (const p of d.panels!) expect(p.drawing.rects.map((r) => r.fill)).toEqual(colours)
    expect(d.swatches.map((s) => s.fill)).toEqual(colours)
    expect(d.panels!.every((p) => p.drawing.swatches.length === 0)).toBe(true)
  })

  it('lays the panels out in a grid of the columns asked for', () => {
    const many = ['A', 'B', 'C', 'D', 'E'].flatMap((cat) => [
      { name: 'x', category: cat, values: [1, 2] },
      { name: 'y', category: cat, values: [2, 3] },
    ])
    const d = chartLayout(chart({ groups: many, facet: { cols: 2 }, w: 400, h: 600 }))
    expect(new Set(d.panels!.map((p) => p.x)).size).toBe(2)
    expect(new Set(d.panels!.map((p) => p.y)).size).toBe(3)
    const auto = chartLayout(chart({ groups: many, facet: {} }))
    expect(new Set(auto.panels!.map((p) => p.x)).size).toBe(3)
  })

  it('writes the label the whole chart gives a bracket, and says when a bracket joins two panels', () => {
    const node = chart({
      groups: genes,
      facet: {},
      test: { by: 'means' },
      brackets: [
        { from: 0, to: 1, label: '', auto: true },
        { from: 0, to: 2, label: 'cross' },
      ],
    })
    const d = chartLayout(node)
    const label = bracketLabel(node, node.brackets![0])
    expect(label).not.toBe('')
    expect(d.panels![0].drawing.texts.some((t) => t.text === label)).toBe(true)
    expect(d.panels!.some((p) => p.drawing.texts.some((t) => t.text === 'cross'))).toBe(false)
    expect(d.notes.join(' ')).toMatch(/1 bracket joins groups in different panels/)
  })

  it('shares the x axis of a scatter chart and draws each series in its own panel', () => {
    const node = chart({
      kind: 'scatter',
      fit: true,
      groups: [
        { name: 'Near', values: [1, 2, 3], xs: [1, 2, 3] },
        { name: 'Far', values: [1, 2, 3], xs: [10, 20, 30] },
      ],
      facet: { free: true },
    })
    const d = chartLayout(node)
    const xTicks = (p: ChartDrawing) => p.texts.filter((t) => t.align === 'center' && !t.bold && /^\d/.test(t.text)).map((t) => t.text)
    expect(xTicks(d.panels![0].drawing)).toEqual(xTicks(d.panels![1].drawing))
    expect(d.panels![0].drawing.circles).toHaveLength(3)
  })
})

describe('pressing a part of a chart of panels', () => {
  it('finds a group by its place in the whole table, and the name of a panel', () => {
    const d = chartLayout(chart({ groups: genes, facet: {} }))
    const p = d.panels![1]
    const bar = p.drawing.rects[1]
    const hit = partAt(d, p.x + bar.x + bar.w / 2, p.y + bar.y + bar.h - 2, 5)
    expect(hit?.part).toEqual({ what: 'group', at: 3 })
    expect(hit!.box.x).toBeGreaterThanOrEqual(p.x)
    const title = p.drawing.texts.find((t) => t.text === 'Actb')!
    expect(partAt(d, p.x + title.x, p.y + title.y + 4, 5)?.part).toEqual({ what: 'facet', at: 1 })
  })
})

describe('saving', () => {
  it('keeps the panels of a chart that can be split, and drops them from one that cannot', () => {
    const node = chart({ groups: genes, facet: { by: 'series', cols: 2, free: true } })
    expect(reopened(node)).toEqual(node)
    expect(reopened(chart({ groups: genes, facet: {} })).facet).toEqual({})
    expect(reopened(chart({ groups: genes, facet: { cols: 9, by: 'rows' as never } })).facet).toEqual({})
    expect(reopened(chart({ groups: [{ name: 'A', values: [1, 2] }, { name: 'B', values: [3] }], facet: {} })).facet).toBeUndefined()
  })
})

describe('exporting', () => {
  it('writes every panel, cut off at its own plot when a range is set, with the cuts inside <defs>', () => {
    const node = chart({ groups: genes, facet: {}, yMax: 50 })
    const { svg } = renderSvg({ ...emptyDoc(), nodes: [node] }, { area: 'page', scale: 1, includeSketch: false, background: true } as never)
    expect(svg).toContain('>Il6<')
    expect(svg).toContain('>Actb<')
    expect((svg.match(/<clipPath id="chart-clip-c1-\d"/g) ?? []).length).toBe(2)
    expect(svg).not.toMatch(/<clipPath(?![^]*?<\/defs>)/)
  })
})

