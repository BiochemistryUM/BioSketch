// A number written at every group of a chart (its mean, median or count): what is written, where
// it stands, its colour, that it survives saving, and the phrases of the instruction box for it.

import { describe, expect, it } from 'vitest'
import { renderSvg } from '../src/io/export'
import { validateDoc } from '../src/io/files'
import { chartLayout, readableOn, usableValueLabels, valueLabelText, valueText, stats } from '../src/model/chart'
import { applyInstruction } from '../src/model/chartCommands'
import { boxStats } from '../src/model/chartStats'
import { emptyDoc } from '../src/model/doc'
import type { ChartNode, ChartValueLabels, FigDoc, FigNode, TextNode } from '../src/model/types'

const chart = (extra: Partial<ChartNode> = {}): ChartNode => ({
  id: 'ch', type: 'chart', x: 0, y: 0, w: 420, h: 300, rotation: 0, kind: 'bar',
  groups: [{ name: 'Control', values: [2, 4, 9] }, { name: 'Treated', values: [8, 10, 18] }],
  ...extra,
})
const saved = (node: object): ChartNode => validateDoc(JSON.parse(JSON.stringify({ ...emptyDoc(), nodes: [node as FigNode] } as FigDoc))).nodes[0] as ChartNode
/** The numbers written at the groups, left to right. */
const written = (node: ChartNode, texts: string[]): TextNode[] => texts.map((t) => chartLayout(node).texts.find((x) => x.text === t)!).filter(Boolean)
const did = (node: ChartNode, text: string): ChartValueLabels | undefined => {
  const r = applyInstruction(node, text)
  expect(r.unclear, `“${text}”`).toEqual([])
  expect(r.done.length, `“${text}”`).toBeGreaterThan(0)
  return r.node.valueLabels
}

describe('what is written', () => {
  it('writes three significant figures, and never fewer than the whole part', () => {
    expect(valueText(5)).toBe('5')
    expect(valueText(12.3456)).toBe('12.3')
    expect(valueText(0.012345)).toBe('0.0123')
    expect(valueText(999.4)).toBe('999')
    expect(valueText(1234.5)).toBe('1235')
    expect(valueText(-3.14159)).toBe('-3.14')
  })

  it('writes the decimals asked for, without a minus before zero', () => {
    expect(valueText(12.3456, 2)).toBe('12.35')
    expect(valueText(5, 1)).toBe('5.0')
    expect(valueText(12.6, 0)).toBe('13')
    expect(valueText(-0.001, 2)).toBe('0.00')
    expect(valueText(-0.0004)).toBe('-0.0004')
  })

  it('writes very large and very small numbers with a power of ten', () => {
    expect(valueText(1.2345e-9)).toBe('1.23×10^{-9}')
    expect(valueText(4e30)).toBe('4×10^{30}')
  })

  it('takes the mean, the median or the count of the group', () => {
    const values = [2, 4, 9]
    const [s, b] = [stats(values), boxStats(values)]
    expect(valueLabelText({ show: 'mean' }, s, b)).toBe('5')
    expect(valueLabelText({ show: 'median' }, s, b)).toBe('4')
    expect(valueLabelText({ show: 'n' }, s, b)).toBe('*n* = 3')
    expect(valueLabelText({ show: 'mean' }, stats([]), null)).toBeNull()
  })

  it('chooses white lettering on a dark colour and dark on a light one', () => {
    expect(readableOn('#1c3d5a')).toBe('#ffffff')
    expect(readableOn('#f3c95e')).toBe('#2b2f36')
    expect(readableOn('not a colour')).toBe('#2b2f36')
  })
})

describe('where it stands', () => {
  it('stands inside each bar, under its top, in a colour that reads on the bar', () => {
    const node = chart({ valueLabels: { show: 'mean' }, groups: [{ name: 'Control', values: [2, 4, 9], color: '#1c3d5a' }, { name: 'Treated', values: [8, 10, 18], color: '#f3c95e' }] })
    const layout = chartLayout(node)
    const [a, b] = written(node, ['5', '12'])
    layout.rects.forEach((bar, i) => {
      const label = [a, b][i]
      expect(label.x).toBeCloseTo(bar.x + bar.w / 2, 0)
      expect(label.y).toBeGreaterThan(bar.y)
      expect(label.y + label.fontSize * 1.25).toBeLessThan(bar.y + bar.h)
    })
    expect([a.fill, b.fill]).toEqual(['#ffffff', '#2b2f36'])
  })

  it('stands at the foot of the bar when an error bar or dots run through it', () => {
    const node = chart({ valueLabels: { show: 'median' }, error: 'sd', groups: [{ name: 'Control', values: [9, 10, 11] }, { name: 'Treated', values: [18, 20, 22] }] })
    const layout = chartLayout(node)
    const [a] = written(node, ['10'])
    const bar = layout.rects[0]
    const foot = bar.y + bar.h
    expect(a.y + a.fontSize * 1.25).toBeGreaterThan(foot - 6)
    expect(a.y + a.fontSize * 1.25).toBeLessThan(foot)
    // Below the lower end of the error bar.
    const lowEnd = Math.max(...layout.lines.filter((l) => l.x1 === l.x2 && Math.abs(l.x1 - a.x) < 1).map((l) => Math.max(l.y1, l.y2)))
    expect(a.y).toBeGreaterThan(lowEnd)
  })

  it('goes above a bar it does not fit in, above the error bar, and keeps the colour that was chosen', () => {
    const node = chart({ valueLabels: { show: 'mean', color: '#ffffff' }, error: 'sd', groups: [{ name: 'Low', values: [0.1, 0.2, 0.3] }, { name: 'High', values: [18, 20, 22] }] })
    const layout = chartLayout(node)
    const [low] = written(node, ['0.2'])
    const top = Math.min(...layout.lines.filter((l) => Math.abs(l.x1 - low.x) < 12).map((l) => Math.min(l.y1, l.y2)))
    expect(low.y + low.fontSize * 1.25).toBeLessThan(top)
    expect(low.fill).toBe('#ffffff')
    expect(layout.notes.join(' ')).toMatch(/One number does not fit inside its bar/)
    // The same holds for numbers asked for above the groups; a dark colour needs no word.
    expect(chartLayout({ ...node, valueLabels: { show: 'mean', above: true, color: '#ffffff' } }).notes.join(' ')).toMatch(/numbers above the groups are written in the light colour you chose/)
    expect(chartLayout({ ...node, valueLabels: { show: 'mean', above: true, color: '#7a1020' } }).notes).toEqual([])
    expect(applyInstruction({ ...node, valueLabels: { show: 'mean', color: '#ffffff' } }, 'show n above the bars').done).toEqual(['The number of values (n) of each group is written above its bar, in white.'])
    // Without a chosen colour the number above the bar is dark, and nothing needs saying.
    const plain = chartLayout({ ...node, valueLabels: { show: 'mean' } })
    expect(plain.texts.find((t) => t.text === '0.2')!.fill).toBe('#2b2f36')
    expect(plain.notes.join(' ')).not.toMatch(/does not fit inside/)
  })

  it('stands above the bar when asked to, and above the data in every other kind of chart', () => {
    for (const node of [chart({ valueLabels: { show: 'n', above: true } }), chart({ kind: 'box', valueLabels: { show: 'n' } }), chart({ kind: 'violin', valueLabels: { show: 'n' }, groups: [{ name: 'A', values: [1, 2, 3, 4, 6] }, { name: 'B', values: [2, 3, 5, 7, 9] }] }), chart({ kind: 'dot', valueLabels: { show: 'n' } }), chart({ kind: 'line', valueLabels: { show: 'n' } })]) {
      const layout = chartLayout(node)
      const labels = layout.texts.filter((t) => /^\*n\* = /.test(t.text))
      expect(labels.length, node.kind).toBe(2)
      const marks = [...layout.rects.map((r) => r.y), ...layout.circles.map((c) => c.cy - c.r), ...layout.lines.map((l) => Math.min(l.y1, l.y2))]
      // Every number ends above the highest mark of the whole chart or of its own column; the tallest column decides.
      const highest = Math.min(...marks)
      expect(Math.min(...labels.map((l) => l.y + l.fontSize * 1.25)), node.kind).toBeLessThanOrEqual(highest)
      // Room is made for it: no number starts above the chart.
      expect(Math.min(...labels.map((l) => l.y)), node.kind).toBeGreaterThanOrEqual(0)
      expect(labels.every((l) => l.fill === '#2b2f36')).toBe(true)
    }
  })

  it('writes inside a bar that hangs below zero, and brackets stand above a number over a column', () => {
    const down = chart({ valueLabels: { show: 'mean' }, groups: [{ name: 'A', values: [-8, -10, -12] }, { name: 'B', values: [4, 5, 6] }] })
    const layout = chartLayout(down)
    const bar = layout.rects[0]
    const label = layout.texts.find((t) => t.text === '-10')!
    expect(label.y).toBeGreaterThan(bar.y)
    expect(label.y + label.fontSize * 1.25).toBeLessThan(bar.y + bar.h)

    const node = chart({ valueLabels: { show: 'mean', above: true }, brackets: [{ from: 0, to: 1, label: 'ns' }] })
    const drawn = chartLayout(node)
    const numbers = written(node, ['5', '12'])
    const bracket = drawn.texts.find((t) => t.text === 'ns')!
    expect(bracket.y + bracket.fontSize * 1.25).toBeLessThan(Math.min(...numbers.map((n) => n.y)))
    expect(drawn.notes).toEqual([])
  })

  it('writes nothing in a scatter chart, and nothing for a chart without the setting', () => {
    const scatter = chart({ kind: 'scatter', valueLabels: { show: 'n' }, groups: [{ name: 'A', values: [1, 2, 3], xs: [1, 2, 3] }] })
    expect(chartLayout(scatter).texts.some((t) => /\*n\*/.test(t.text))).toBe(false)
    expect(chartLayout(chart({ valueLabels: { show: 'mean' } })).texts.length - chartLayout(chart()).texts.length).toBe(2)
  })

  it('says when the numbers are wider than their columns', () => {
    const node = chart({ w: 150, valueLabels: { show: 'mean', decimals: 6 }, groups: Array.from({ length: 6 }, (_, i) => ({ name: `G${i}`, values: [1000 + i, 2000 + i] })) })
    expect(chartLayout(node).notes.join(' ')).toMatch(/wider than their columns/)
  })

  it('is part of the exported picture, with its colour', () => {
    const svg = renderSvg({ ...emptyDoc(), nodes: [chart({ valueLabels: { show: 'mean', color: '#ffffff' } })] }, { area: 'page', transparent: false, includeSketch: true }).svg
    expect(svg).toMatch(/fill="#ffffff"[^>]*>(?:<tspan[^>]*>)?12</)
  })
})

describe('what a figure keeps', () => {
  it('keeps the setting unchanged when a figure is saved and reopened', () => {
    for (const valueLabels of [{ show: 'mean' }, { show: 'median', above: true, decimals: 2, color: '#ffffff' }, { show: 'n', decimals: 0 }] as ChartValueLabels[]) {
      expect(saved(chart({ valueLabels })).valueLabels).toEqual(valueLabels)
    }
  })

  it('rebuilds every field of what a file holds', () => {
    expect(usableValueLabels({ show: 'sum' })).toBeUndefined()
    expect(usableValueLabels('mean')).toBeUndefined()
    expect(usableValueLabels({ show: 'mean', above: 'yes', decimals: 2.5, color: 'url(#x)', extra: '<script>' })).toEqual({ show: 'mean' })
    expect(usableValueLabels({ show: 'n', decimals: 99, color: '#ABCDEF' })).toEqual({ show: 'n', color: '#abcdef' })
    expect(saved(chart({ valueLabels: { show: 'nothing' } as unknown as ChartValueLabels })).valueLabels).toBeUndefined()
  })
})

describe('asking for it in words', () => {
  const bar = chart()

  it('reads the sentence that started it: the median in each bar, then white text', () => {
    const r = applyInstruction(bar, 'add a label with the median values in each bar. text white')
    expect(r.unclear).toEqual([])
    expect(r.node.valueLabels).toEqual({ show: 'median', color: '#ffffff' })
    // The bars keep their colours.
    expect(r.node.groups).toEqual(bar.groups)
    expect(r.done).toEqual(['The median of each group is written inside its bar (above it where it does not fit). The bar itself shows the mean.', 'The numbers at the groups are white.'])
    expect(applyInstruction(bar, 'write the mean in each bar, in white').done).toEqual(['The mean of each group is written inside its bar (above it where it does not fit).', 'The numbers at the groups are white.'])
    expect(applyInstruction({ ...bar, valueLabels: { show: 'mean', color: '#ffffff' } }, 'labels with 2 decimals and the usual colour').done).toEqual(['The numbers at the groups have 2 decimals.', 'The numbers at the groups take their usual colour.'])
  })

  it('reads what to write and where', () => {
    expect(did(bar, 'write the mean in each bar')).toEqual({ show: 'mean' })
    expect(did(bar, 'label the bars with the median')).toEqual({ show: 'median' })
    expect(did(bar, 'show n above the bars')).toEqual({ show: 'n', above: true })
    expect(did(bar, 'show the number of values on top of each bar')).toEqual({ show: 'n', above: true })
    expect(did(bar, 'average above each bar')).toEqual({ show: 'mean', above: true })
    expect(did(bar, 'value labels')).toEqual({ show: 'mean' })
    expect(did({ ...bar, kind: 'box' }, 'add labels')).toEqual({ show: 'median' })
    expect(did({ ...bar, kind: 'box' }, 'mean above each box')).toEqual({ show: 'mean', above: true })
    expect(did({ ...bar, valueLabels: { show: 'n', above: true } }, 'labels inside the bars')).toEqual({ show: 'n' })
  })

  it('reads the colour and the decimals, and keeps what was set before', () => {
    expect(did(bar, 'write the mean in each bar, in white')).toEqual({ show: 'mean', color: '#ffffff' })
    expect(did(bar, 'label the bars with the mean, white')).toEqual({ show: 'mean', color: '#ffffff' })
    expect(did(bar, 'median labels with 2 decimals')).toEqual({ show: 'median', decimals: 2 })
    expect(did(bar, 'mean labels, no decimals')).toEqual({ show: 'mean', decimals: 0 })
    const set: ChartNode = { ...bar, valueLabels: { show: 'median', above: true } }
    expect(did(set, 'white text')).toEqual({ show: 'median', above: true, color: '#ffffff' })
    expect(did(set, 'labels #112233')).toEqual({ show: 'median', above: true, color: '#112233' })
    expect(did(set, 'value label white')).toEqual({ show: 'median', above: true, color: '#ffffff' })
    expect(did({ ...set, valueLabels: { show: 'mean', color: '#ffffff' } }, 'labels in the usual colour')).toEqual({ show: 'mean' })
  })

  it('does not take every clause with the word “label” for a wish', () => {
    for (const text of ['rotate the labels 45 degrees', 'label Treated', 'make the labels sparkle']) {
      const r = applyInstruction(bar, text)
      expect(r.node, text).toEqual(bar)
      expect(r.done, text).toEqual([])
      expect(r.unclear.length, text).toBeGreaterThan(0)
    }
    expect(applyInstruction(bar, '2 decimals').unclear.join(' ')).toMatch(/Decimals can be set for the numbers written at the groups/)
  })

  it('does not recolour the bars when asked for white text', () => {
    const r = applyInstruction(bar, 'text white')
    expect(r.node).toEqual(bar)
    expect(r.done).toEqual([])
    expect(r.unclear.join(' ')).toMatch(/Only the numbers written at the groups can be given a colour/)
  })

  it('still colours a group that is named, and leaves the numbers alone', () => {
    const r = applyInstruction(bar, 'label the bars with the mean and make Treated red')
    expect(r.unclear).toEqual([])
    expect(r.node.valueLabels).toEqual({ show: 'mean' })
    expect(r.node.groups[1].color).toBe('#d9534f')
    expect(r.node.groups[0].color).toBeUndefined()
    expect(applyInstruction(bar, 'make Treated white').node.groups[1].color).toBe('#ffffff')
  })

  it('removes them', () => {
    const set: ChartNode = { ...bar, valueLabels: { show: 'mean' } }
    for (const text of ['remove the labels', 'no value labels', 'hide the numbers in the bars', 'remove the label']) expect(applyInstruction(set, text).node.valueLabels, text).toBeUndefined()
    // With a title on the chart, "remove the label" still means the title.
    const titled = applyInstruction({ ...set, title: 'Viability' }, 'remove the label').node
    expect([titled.title, titled.valueLabels]).toEqual([undefined, { show: 'mean' }])
  })

  it('leaves titles and the kind of chart to their own readers', () => {
    expect(applyInstruction(bar, 'value label: Mean intensity').node.yLabel).toBe('Mean intensity')
    expect(applyInstruction(bar, 'title: Median survival in each group').node).toEqual({ ...bar, title: 'Median survival in each group' })
    const box = applyInstruction(bar, 'box plot with labels')
    expect([box.node.kind, box.node.valueLabels, box.unclear]).toEqual(['box', { show: 'median' }, []])
    expect(applyInstruction(bar, 'error bars SEM').node.valueLabels).toBeUndefined()
    expect(applyInstruction(bar, 'compare Control and Treated').node.valueLabels).toBeUndefined()
  })

  it('says why a scatter chart has none', () => {
    const scatter = chart({ kind: 'scatter', groups: [{ name: 'A', values: [1, 2, 3], xs: [1, 2, 3] }] })
    const r = applyInstruction(scatter, 'label the points with the mean')
    expect(r.node.valueLabels).toBeUndefined()
    expect(r.unclear.join(' ')).toMatch(/need a chart with groups/)
  })

  it('gives a chart that survives saving and can be drawn', () => {
    for (const text of ['write the median in each bar, in white', 'show n above the bars with 9 decimals', 'labels #ABCDEF', 'mean labels, 3 decimals']) {
      const node = applyInstruction(bar, text).node
      expect(JSON.parse(JSON.stringify(saved(node))), text).toEqual(JSON.parse(JSON.stringify(node)))
      expect(() => chartLayout(node)).not.toThrow()
    }
  })
})
