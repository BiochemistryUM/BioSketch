// The statistical test as part of a chart: the rows of the table that paired tests need, the
// groups a test compares, brackets that follow the test, the advice for a table, and what a
// saved figure keeps.

import { describe, expect, it } from 'vitest'
import { renderSvg } from '../src/io/export'
import { validateDoc } from '../src/io/files'
import { TWO_FACTOR_ONLY, bracketLabel, carryOver, chartAdvice, chartAnalysis, chartLayout, chartSamples, crossTable, methodsText, pairP, parseTable, readTable, tableText } from '../src/model/chart'
import { pairedT, signedRank, welchT } from '../src/model/chartTests'
import { emptyDoc } from '../src/model/doc'
import { parseRich } from '../src/model/richtext'
import type { ChartNode, FigDoc, FigNode } from '../src/model/types'
import ref from './stats-reference.json'

const A = [4.1, 5.3, 6.0, 5.8, 4.9, 6.4]
const B = [6.9, 7.4, 5.9, 8.1, 7.7, 6.6]
const C = [5.2, 9.3, 8.8, 10.1, 7.9, 9.6]
const D = [3.3, 4.7, 5.1, 2.9]

const chart = (extra: Partial<ChartNode> = {}): ChartNode => ({
  id: 'ch', type: 'chart', x: 0, y: 0, w: 420, h: 300, rotation: 0, kind: 'bar',
  groups: [{ name: 'Control', values: A }, { name: 'Treated', values: B }],
  ...extra,
})
const four = (): ChartNode['groups'] => [{ name: 'A', values: A }, { name: 'B', values: B }, { name: 'C', values: C }, { name: 'D', values: D }]
const saved = (node: object): ChartNode => validateDoc(JSON.parse(JSON.stringify({ ...emptyDoc(), nodes: [node as FigNode] } as FigDoc))).nodes[0] as ChartNode
const words = (node: ChartNode): string[] => chartLayout(node).texts.map((t) => t.text)

describe('the rows of a table', () => {
  it('are remembered for a column with a gap, and only then', () => {
    expect(parseTable('A\tB\n1\t5\n2\t6\n3\t7')).toEqual([{ name: 'A', values: [1, 2, 3] }, { name: 'B', values: [5, 6, 7] }])
    // B has no value in the second row; A ends early, which is no gap.
    expect(parseTable('A\tB\n1\t5\n2\t\n\t7\n\t8')).toEqual([{ name: 'A', values: [1, 2] }, { name: 'B', values: [5, 7, 8], rows: [0, 2, 3] }])
    // A cell that is not a number leaves a gap too.
    expect(readTable('A\tB\n1\t5\nn/a\t6\n3\t7').groups[0]).toEqual({ name: 'A', values: [1, 3], rows: [0, 2] })
  })

  it('put every value back where it was when the table is written out', () => {
    const text = 'A\tB\n1\t5\n2\t\n\t7\n\t8'
    expect(tableText(parseTable(text))).toBe(text)
    expect(parseTable(tableText(parseTable(text)))).toEqual(parseTable(text))
    const grouped = 'WT\tWT\nctrl\tdrug\n1\t\n2\t4\n\t5'
    expect(tableText(parseTable(grouped))).toBe(grouped)
    // Editing the table keeps the rows, and so does reading it as another kind of chart.
    const groups = parseTable('x\tA\tB\n1\t5\t\n2\t\t7\n3\t6\t8')
    expect(groups[2]).toEqual({ name: 'B', values: [7, 8], rows: [1, 2] })
    expect(crossTable(groups, 'bar', 'scatter')[1]).toEqual({ name: 'B', values: [7, 8], xs: [2, 3] })
    expect(carryOver([{ name: 'B', values: [1], color: '#112233' }], groups, undefined).groups[2]).toEqual({ ...groups[2], color: '#112233' })
  })

  it('survive saving, and a figure with rows that make no sense loses only the rows', () => {
    const groups = parseTable('A\tB\n1\t5\n2\t\n\t7\n\t8')
    expect(saved(chart({ groups })).groups).toEqual(groups)
    const bad = (rows: unknown) => saved({ ...chart(), groups: [{ name: 'A', values: [1, 2, 3], rows }] }).groups[0]
    expect(bad([0, 2, 1])).toEqual({ name: 'A', values: [1, 2, 3] })
    expect(bad([0, 1])).toEqual({ name: 'A', values: [1, 2, 3] })
    expect(bad([0, 1.5, 3])).toEqual({ name: 'A', values: [1, 2, 3] })
    expect(bad([-1, 0, 1])).toEqual({ name: 'A', values: [1, 2, 3] })
    expect(bad([0, 1, 5e7])).toEqual({ name: 'A', values: [1, 2, 3] })
    expect(bad('rows')).toEqual({ name: 'A', values: [1, 2, 3] })
    // Rows that only repeat the usual order are not kept.
    expect(bad([0, 1, 2])).toEqual({ name: 'A', values: [1, 2, 3] })
    // A value that cannot be kept takes its row with it.
    expect(saved({ ...chart(), groups: [{ name: 'A', values: [1, 'x', 3, 4], rows: [0, 1, 2, 5] }] }).groups[0]).toEqual({ name: 'A', values: [1, 3, 4], rows: [0, 2, 5] })
  })
})

describe('the groups a test compares', () => {
  it('are the groups with values, each with all its values', () => {
    const c = chartSamples(chart({ groups: [...four(), { name: 'Empty', values: [] }] }))
    expect(c).toMatchObject({ indexes: [0, 1, 2, 3], names: ['A', 'B', 'C', 'D'], leftOut: 0 })
    expect(c.samples).toEqual([A, B, C, D])
  })

  it('for a paired design are the rows with a value in every group', () => {
    const groups = parseTable('Before\tAfter\n10\t12\n12\t\n9\t11\n\t13\n14\t18')
    const c = chartSamples(chart({ groups, test: { paired: true } }))
    expect(c.samples).toEqual([[10, 9, 14], [12, 11, 18]])
    expect(c.leftOut).toBe(2)
    // Without the rows the second column would slide up and 12 would be paired with 11.
    const out = chartAnalysis(chart({ groups, test: { paired: true, by: 'means' } }))
    expect(out?.ok && out.result.pairs[0].p).toBeCloseTo(pairedT([10, 9, 14], [12, 11, 18])!.p, 14)
    expect(chartAdvice(chart({ groups, test: { paired: true } })).cautions[0]).toMatch(/2 rows are left out of a paired test/)
  })

  it('on a logarithmic axis are the values the chart shows', () => {
    const groups = [{ name: 'A', values: [0, 1, 2, 3] }, { name: 'B', values: [4, 5, -1, 7] }]
    expect(chartSamples(chart({ groups, yLog: true })).samples).toEqual([[1, 2, 3], [4, 5, 7]])
    expect(chartSamples(chart({ groups, yLog: true, test: { paired: true } })).samples).toEqual([[1, 3], [5, 7]])
    expect(chartAdvice(chart({ groups, yLog: true })).cautions.join(' ')).toMatch(/not on their logarithms/)
  })

  it('are not offered for a scatter chart; a chart with two factors gets the two-way analysis', () => {
    const groups = parseTable('WT\tWT\tKO\tKO\nctrl\tdrug\tctrl\tdrug\n1\t2\t3\t4\n2\t3\t4\t6')
    const node = chart({ groups, test: { by: 'means' }, brackets: [{ from: 0, to: 1, label: '', auto: true }] })
    expect(chartSamples(node).problem).toBeUndefined()
    expect(chartSamples(node).factors).toEqual({ categories: ['WT', 'KO'], series: ['ctrl', 'drug'], place: [[0, 1], [2, 3]] })
    expect(chartAdvice(node).test).toBe('twoWay')
    expect(chartAnalysis(node)!.ok).toBe(true)
    expect(bracketLabel(node, node.brackets![0])).toMatch(/^p [=<] /)
    // A test on ranks or a paired test has no counterpart for two factors.
    expect(chartAnalysis(chart({ groups, test: { by: 'ranks' } }))).toEqual({ ok: false, problem: TWO_FACTOR_ONLY })
    expect(chartAnalysis(chart({ groups, test: { by: 'means', paired: true } }))).toEqual({ ok: false, problem: TWO_FACTOR_ONLY })
    expect(chartSamples(chart({ kind: 'scatter', groups: [{ name: 'y', values: [1, 2], xs: [1, 2] }] })).problem).toMatch(/scatter/)
  })
})

describe('the result of the test', () => {
  it('is nothing until a test is chosen', () => {
    expect(chartAnalysis(chart())).toBeNull()
    expect(chartAnalysis(chart({ test: { paired: true } }))).toBeNull()
  })

  it('follows the choices: means or ranks, paired or not', () => {
    const p = (test: ChartNode['test']) => {
      const out = chartAnalysis(chart({ test }))
      return out?.ok ? out.result.p : NaN
    }
    expect(p({ by: 'means' })).toBeCloseTo(ref.two.welchAB.p, 12)
    expect(p({ by: 'means', paired: true })).toBeCloseTo(ref.two.pairedAB.p, 12)
    expect(p({ by: 'ranks' })).toBeCloseTo(ref.two.mwAB.p, 12)
    expect(p({ by: 'ranks', paired: true })).toBeCloseTo(ref.two.srAB.p, 12)
  })

  it('gives the p value of any two groups by their place in the table', () => {
    const node = chart({ groups: [{ name: 'Empty', values: [] }, ...four()], test: { by: 'means' } })
    // Places 1 to 4 hold A to D; R's TukeyHSD lists B-A, C-A, D-A, C-B, D-B, D-C.
    expect(pairP(node, 1, 2)).toBeCloseTo(ref.several.tukey[0], 7)
    expect(pairP(node, 4, 3)).toBeCloseTo(ref.several.tukey[5], 7)
    expect(pairP(node, 0, 1)).toBeUndefined()
    const first = { ...node, test: { by: 'means' as const, versusFirst: true } }
    // Each group with the first: Dunnett's test.
    expect(pairP(first, 1, 3)).toBeCloseTo(ref.several.dunnettFirst[1], 9)
    expect(pairP(first, 2, 3)).toBeUndefined()
  })

  it('is worked out once for a table, and again when the table or a choice changes', () => {
    const node = chart({ test: { by: 'means' } })
    expect(chartAnalysis(node)).toBe(chartAnalysis({ ...node, w: 900 }))
    expect(chartAnalysis({ ...node, test: { by: 'ranks' } })).not.toBe(chartAnalysis(node))
    const changed = chartAnalysis({ ...node, groups: [node.groups[0], { name: 'Treated', values: [...B, 9] }] })
    expect(changed?.ok && changed.result.p).toBeCloseTo(welchT(A, [...B, 9])!.p, 14)
  })
})

describe('brackets that follow the test', () => {
  const typed = { from: 0, to: 1, label: 'my label' }
  const auto = { from: 0, to: 1, label: '', auto: true }

  it('show the p value or stars; typed brackets keep their words', () => {
    const node = chart({ test: { by: 'means' }, brackets: [auto] })
    expect(bracketLabel(node, auto)).toBe('p = 0.0051')
    expect(bracketLabel({ ...node, test: { by: 'means', stars: true } }, auto)).toBe('**')
    expect(bracketLabel(node, typed)).toBe('my label')
    expect(words(node)).toContain('p = 0.0051')
    expect(words({ ...node, test: { by: 'ranks', stars: true } })).toContain('**')
  })

  it('change with the numbers', () => {
    const node = chart({ test: { by: 'means' }, brackets: [auto] })
    const closer = { ...node, groups: [node.groups[0], { name: 'Treated', values: [5.0, 6.1, 5.9, 6.6, 5.2, 6.3] }] }
    expect(bracketLabel(closer, auto)).toBe(`p = ${Number(welchT(A, closer.groups[1].values)!.p.toPrecision(3))}`)
    expect(bracketLabel(closer, auto)).not.toBe(bracketLabel(node, auto))
  })

  it('show nothing without a test or for a pair the test does not compare, and n/a where it cannot be worked out', () => {
    expect(bracketLabel(chart({ brackets: [auto] }), auto)).toBe('')
    expect(words(chart({ brackets: [auto] }))).not.toContain('p = 0.0051')
    const node = chart({ groups: four(), test: { by: 'means', versusFirst: true } })
    expect(bracketLabel(node, { from: 1, to: 2, label: '', auto: true })).toBe('')
    expect(bracketLabel(node, { from: 0, to: 2, label: '', auto: true })).toMatch(/^p = /)
    // Tukey's test needs two more values than groups.
    const thin = chart({ groups: [{ name: 'A', values: [1, 2] }, { name: 'B', values: [3] }, { name: 'C', values: [5] }], test: { by: 'means' } })
    expect(bracketLabel(thin, auto)).toBe('n/a')
  })

  it('draw four stars as four stars, not as bold text', () => {
    const far = chart({ groups: [{ name: 'A', values: [1, 1.1, 0.9, 1.05, 0.95, 1.02] }, { name: 'B', values: [9, 9.1, 8.9, 9.05, 8.95, 9.02] }], test: { by: 'means', stars: true }, brackets: [auto] })
    expect(bracketLabel(far, auto)).toBe('****')
    expect(parseRich('****').map((r) => r.text).join('')).toBe('****')
    const svg = renderSvg({ ...emptyDoc(), nodes: [far] }, { area: 'page', transparent: false, includeSketch: true }).svg
    expect(svg).toContain('****')
  })

  it('are exported as they are drawn', () => {
    const node = chart({ test: { by: 'ranks', paired: true }, brackets: [auto] })
    const svg = renderSvg({ ...emptyDoc(), nodes: [node] }, { area: 'page', transparent: false, includeSketch: true }).svg
    expect(svg).toContain(`p = ${Number(signedRank(A, B)!.p.toPrecision(3))}`)
  })
})

describe('advice for a table', () => {
  it('names a test, what it does and why it fits', () => {
    const a = chartAdvice(chart())
    expect(a.test).toBe('welch')
    expect(a.does).toMatch(/same mean/)
    expect(a.why.join(' ')).toMatch(/Control, n = 6; Treated, n = 6/)
    expect(chartAdvice(chart({ test: { paired: true } })).test).toBe('pairedT')
    expect(chartAdvice(chart({ groups: four() })).test).toBe('anova')
    const skewed = [0.8, 1.1, 1.3, 1.9, 2.4, 3.8, 7.5, 21.0]
    expect(chartAdvice(chart({ groups: [{ name: 'A', values: skewed }, { name: 'B', values: skewed.map((v) => v * 3) }] })).test).toBe('mannWhitney')
  })

  it('does not depend on which test is chosen', () => {
    expect(chartAdvice(chart({ test: { by: 'ranks' } })).test).toBe('welch')
  })
})

describe('what a saved figure keeps', () => {
  it('keeps the choices and which brackets follow the test, and no results', () => {
    const node = chart({ test: { by: 'ranks', paired: true, versusFirst: true, stars: true }, brackets: [{ from: 0, to: 1, label: '', auto: true }, { from: 1, to: 0, label: 'ns' }] })
    expect(saved(node)).toEqual(node)
    expect(saved(chart({ test: { paired: true } })).test).toEqual({ paired: true })
    expect(JSON.stringify(saved(node))).not.toMatch(/0\.0\d/)
  })

  it('rebuilds every field of an untrusted figure', () => {
    const t = (test: unknown) => saved({ ...chart(), test }).test
    expect(t({ by: 'magic', paired: 'yes', stars: 1, extra: '<script>' })).toBeUndefined()
    expect(t({ by: 'means', paired: true, p: 0.001 })).toEqual({ by: 'means', paired: true })
    expect(t('means')).toBeUndefined()
    expect(t({})).toBeUndefined()
    expect(saved({ ...chart(), brackets: [{ from: 0, to: 1, label: 'x', auto: 'yes' }] }).brackets).toEqual([{ from: 0, to: 1, label: 'x' }])
    // A scatter chart has no groups to test.
    expect(saved({ ...chart({ kind: 'scatter', groups: [{ name: 'y', values: [1, 2], xs: [1, 2] }] }), test: { by: 'means' } }).test).toBeUndefined()
  })
})

describe('the text for the methods', () => {
  it('is there only when a test was worked out', () => {
    expect(methodsText(chart())).toBeNull()
    expect(methodsText(chart({ test: { by: 'means' }, groups: [{ name: 'Control', values: [1] }, { name: 'Treated', values: [2] }] }))).toBeNull()
    expect(methodsText(chart({ kind: 'scatter', test: { by: 'means' } }))).toBeNull()
  })

  it('says what is drawn, how many values there are, which test was used and what it found', () => {
    const text = methodsText(chart({ error: 'sd', points: true, test: { by: 'means' } }))!
    expect(text).toBe(
      'Bars show the mean ± standard deviation (SD); points are single values. N = 6 per group. ' +
        'Control and Treated were compared with Welch’s t test (two-sided, not assuming equal variances). ' +
        'Result: t = -3.58, df = 9.98, p = 0.0051. ' +
        'Effect size: Hedges’ g = 1.91 (difference of means over the pooled standard deviation, with Hedges’ exact small-sample correction). ' +
        'The mean of Treated less that of Control was 1.68 (95 % confidence interval 0.634 to 2.73). ' +
        'Statistics were worked out in BioSketch, which gives the results of R 4.4 (t.test).',
    )
  })

  it('names the comparison of pairs after an overall test, and the group every other is compared with', () => {
    const tukey = methodsText(chart({ kind: 'box', groups: four(), test: { by: 'means' } }))!
    expect(tukey).toContain('Boxes show the median and the quartiles; whiskers reach to the furthest value within 1.5 × the interquartile range')
    expect(tukey).toContain('N = 6, 6, 6 and 4 (A, B, C and D).')
    expect(tukey).toContain('The 4 groups were compared by one-way analysis of variance (ANOVA), followed by Tukey’s test for every pair of groups.')
    expect(tukey).toContain('(aov, TukeyHSD)')
    const first = methodsText(chart({ groups: four(), test: { by: 'means', versusFirst: true } }))!
    expect(first).toContain('followed by Dunnett’s test of each group against A (two-sided).')
    expect(first).toContain('(aov, glht with mcp "Dunnett" of the package multcomp)')
    const ranks = methodsText(chart({ groups: four(), test: { by: 'ranks' } }))!
    expect(ranks).toContain('with the Kruskal–Wallis test, followed by two-sided Mann–Whitney tests of every pair of groups with Holm’s correction for multiple comparisons.')
  })

  it('says how rows were paired, which were left out, and what the stars stand for', () => {
    const gap = [{ name: 'Before', values: [4.1, 5.3, 6.0, 5.8] }, { name: 'After', values: [6.9, 7.4, 8.1], rows: [0, 1, 3] }]
    const text = methodsText(chart({ kind: 'dot', error: 'sem', groups: gap, test: { by: 'means', paired: true, stars: true } }))!
    expect(text).toContain('Points are single values; the line marks the mean ± standard error of the mean (SEM). N = 3 samples, each measured in every group.')
    expect(text).toContain('Before and After were compared with a paired t test (two-sided).')
    expect(text).toContain('Values in the same row of the table were treated as one sample; 1 row with a missing value was left out.')
    expect(text).toContain('ns: p ≥ 0.05; *: p < 0.05')
    expect(text).toContain('(t.test (paired))')
    // A rank test says whether its p value is exact, and a logarithmic axis that the logarithms were not used.
    expect(methodsText(chart({ test: { by: 'ranks' } }))).toContain('the Mann–Whitney test (two-sided, exact p value).')
    expect(methodsText(chart({ groups: [{ name: 'a', values: [1, 2, 2, 3] }, { name: 'b', values: [2, 4, 5, 6] }], test: { by: 'ranks' } }))).toContain('(two-sided, normal approximation with continuity correction)')
    expect(methodsText(chart({ yLog: true, test: { by: 'means' } }))).toContain('The tests were worked out on the values as measured, not on their logarithms.')
  })
})
