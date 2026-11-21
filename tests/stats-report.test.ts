// The statistics report of a whole figure (src/model/statsReport.ts).

import { describe, expect, it } from 'vitest'
import { emptyDoc } from '../src/model/doc'
import { addSlide } from '../src/model/slides'
import { figureStatistics, reportCsv, reportText } from '../src/model/statsReport'
import type { ChartNode, FigDoc } from '../src/model/types'

const A = [4.1, 5.3, 6.0, 5.8, 4.9, 6.4]
const B = [6.9, 7.4, 5.9, 8.1, 7.7, 6.6]
const C = [5.2, 9.3, 8.8, 10.1, 7.9, 9.6]
const chart = (id: string, extra: Partial<ChartNode>): ChartNode => ({ id, type: 'chart', x: 0, y: 0, w: 300, h: 200, rotation: 0, kind: 'bar', groups: [], ...extra })
const two = chart('c1', { title: 'Weight, g', groups: [{ name: 'Control', values: A }, { name: 'Treated', values: B }], test: { by: 'means' } })
const three = chart('c2', { groups: [{ name: 'A', values: A }, { name: '=B', values: B }, { name: 'C', values: C }], test: { by: 'means' } })
const plain = chart('c3', { groups: [{ name: 'A', values: A }] })
const survival = chart('c4', { kind: 'scatter', survival: true, groups: [{ name: 'Control', xs: [5, 8, 12, 15, 20], values: [1, 1, 1, 0, 1] }, { name: 'Drug', xs: [10, 18, 25, 30, 40], values: [1, 0, 1, 0, 0] }] })

describe('the statistics of a figure', () => {
  it('takes every chart with a test or an analysis, on every slide, and leaves out charts without', () => {
    let doc: FigDoc = { ...emptyDoc(), nodes: [two, plain, three] }
    doc = addSlide(doc)
    doc = { ...doc, nodes: [survival] }
    const charts = figureStatistics(doc)
    expect(charts.map((c) => [c.slide, c.name])).toEqual([[1, 'Weight, g'], [1, 'Chart 1'], [2, 'Chart 2']])
    const [first, second, third] = charts
    expect(first.rows).toHaveLength(1)
    expect(first.rows[0]).toMatchObject({ test: 'Welch’s t test', comparison: 'all groups', n: '6, 6', effect: { name: 'Hedges’ g' } })
    expect(first.rows[0].difference!.estimate).toBeCloseTo(1.6833, 4)
    expect(first.methods).toContain('Hedges’ g')
    // One-way ANOVA with Tukey's pairs, each with its interval.
    expect(second.rows.map((r) => r.comparison)).toEqual(['all groups', '=B vs A', 'C vs A', 'C vs =B'])
    expect(second.rows.slice(1).every((r) => r.difference && r.test.startsWith('Tukey'))).toBe(true)
    expect(third.rows[0]).toMatchObject({ test: 'Log-rank test', comparison: 'all groups' })
    expect(third.rows.some((r) => r.test.startsWith('Cox'))).toBe(true)
    expect(third.methods).toContain('Kaplan')
  })

  it('writes a CSV table a spreadsheet reads as it is, and a text with the methods', () => {
    const charts = figureStatistics({ ...emptyDoc(), nodes: [two, three] })
    const csv = reportCsv(charts)
    const lines = csv.trim().split('\r\n')
    expect(lines[0]).toBe('Slide,Chart,Test,Comparison,n,Statistic,p,Effect size,Effect size value,Difference of means,Lower 95 %,Upper 95 %')
    expect(lines).toHaveLength(1 + 1 + 4)
    // A name with a comma is quoted; one that a spreadsheet would read as a formula is not left as one.
    expect(lines[1].startsWith('1,"Weight, g",Welch’s t test,all groups,"6, 6","t = -3.58, df = 9.98",0.00506171')).toBe(true)
    expect(lines[3]).toContain(`'=B vs A`)
    const text = reportText(charts, 'Figure 1')
    expect(text.startsWith('Statistics of Figure 1\n\nWeight, g\n\n')).toBe(true)
    expect(text).toContain('all groups (Welch’s t test; n = 6, 6): t = -3.58, df = 9.98, p = 0.00506, Hedges’ g = 1.91, difference 1.68 (95 % interval 0.634 to 2.73)')
  })
})
