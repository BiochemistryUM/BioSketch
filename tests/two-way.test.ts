// Two factors: the two-way analysis of variance and the comparison of pairs after it, pinned to
// R 4.4 through tests/stats-reference.json (written by scripts/stats-reference.R).

import { describe, expect, it } from 'vitest'
import { holm } from '../src/model/chartTests'
import { pooledCellPair, twoWayAnova } from '../src/model/twoWay'
import ref from './stats-reference.json'

type Ref = { ss: number[]; df: number[]; f: number[]; p: number[]; dfe: number; mse: number; aovF?: number[]; aovP?: number[]; within: number[]; across?: number[] }
const sets = ref.twoway as unknown as Record<'balanced' | 'unequal', Ref>
const near = (got: number, want: number, what: string, rel = 1e-9) => expect(Math.abs(got - want), `${what}: ${got} against ${want}`).toBeLessThanOrEqual(rel * Math.max(1e-300, Math.abs(want)))

// Three categories by two series, four values each.
const BALANCED = [
  [[4.1, 3.8, 4.6, 4.3], [6.9, 7.4, 6.1, 7.8]],
  [[5.0, 4.7, 5.6, 5.2], [9.4, 8.8, 10.1, 9.0]],
  [[4.4, 4.9, 3.9, 4.6], [5.1, 5.9, 4.8, 5.5]],
]
// Two by two with 6, 6, 4 and 6 values.
const UNEQUAL = [
  [[4.1, 5.3, 6.0, 5.8, 4.9, 6.4], [6.9, 7.4, 5.9, 8.1, 7.7, 6.6]],
  [[3.3, 4.7, 5.1, 2.9], [5.2, 9.3, 8.8, 10.1, 7.9, 9.6]],
]

describe('two-way analysis of variance', () => {
  const check = (cells: number[][][], r: Ref, name: string) => {
    const fit = twoWayAnova(cells)!
    expect(fit, name).not.toBeNull()
    const effects = [fit.category, fit.series, fit.interaction]
    effects.forEach((e, i) => {
      near(e.ss, r.ss[i], `${name} sum of squares ${i}`, 1e-9)
      expect(e.df).toBe(r.df[i])
      near(e.f, r.f[i], `${name} F ${i}`, 1e-9)
      near(e.p, r.p[i], `${name} p ${i}`, 1e-7)
    })
    expect(fit.dfError).toBe(r.dfe)
    near(fit.msError, r.mse, `${name} mean square of what is left`)
    return fit
  }

  it('gives what R gives with equal numbers in every combination, which is also R’s aov', () => {
    const fit = check(BALANCED, sets.balanced, 'balanced')
    ;[fit.category, fit.series, fit.interaction].forEach((e, i) => {
      near(e.f, sets.balanced.aovF![i], `aov F ${i}`)
      near(e.p, sets.balanced.aovP![i], `aov p ${i}`, 1e-7)
    })
  })

  it('tests each factor after the other when the numbers are unequal (Type II)', () => {
    check(UNEQUAL, sets.unequal, 'unequal')
    // The order of the factors does not matter: turned on its side, the table gives the same answers.
    const turned = UNEQUAL[0].map((_, j) => UNEQUAL.map((row) => row[j]))
    const [a, b] = [twoWayAnova(UNEQUAL)!, twoWayAnova(turned)!]
    near(b.series.f, a.category.f, 'category, turned')
    near(b.category.f, a.series.f, 'series, turned')
    near(b.interaction.f, a.interaction.f, 'interaction, turned')
  })

  it('compares pairs with the scatter left over in the whole table, corrected by Holm', () => {
    const fit = twoWayAnova(BALANCED)!
    const within = holm(BALANCED.map((row) => pooledCellPair(row[0], row[1], fit)!))
    within.forEach((p, i) => near(p, sets.balanced.within[i], `series within category ${i}`, 1e-7))
    const pairs: [number, number][] = [[0, 1], [0, 2], [1, 2]]
    const across = holm([0, 1].flatMap((j) => pairs.map(([x, y]) => pooledCellPair(BALANCED[x][j], BALANCED[y][j], fit)!)))
    across.forEach((p, i) => near(p, sets.balanced.across![i], `categories within series ${i}`, 1e-7))
    const un = twoWayAnova(UNEQUAL)!
    holm(UNEQUAL.map((row) => pooledCellPair(row[0], row[1], un)!)).forEach((p, i) => near(p, sets.unequal.within[i], `unequal ${i}`, 1e-7))
    expect(pooledCellPair([], [1, 2], fit)).toBeNull()
  })

  it('is not defined without two levels of each factor, with an empty combination, or without scatter', () => {
    expect(twoWayAnova([[[1, 2], [3, 4]]])).toBeNull()
    expect(twoWayAnova([[[1, 2]], [[3, 4]]])).toBeNull()
    expect(twoWayAnova([[[1, 2], []], [[3, 4], [5, 6]]])).toBeNull()
    // One value in every combination: nothing is left over to compare the effects with.
    expect(twoWayAnova([[[1], [2]], [[3], [5]]])).toBeNull()
    expect(twoWayAnova([[[1, 1], [2, 2]], [[3, 3], [5, 5]]])).toBeNull()
    expect(twoWayAnova([])).toBeNull()
  })
})

// ---------- on a chart ----------

import { validateDoc } from '../src/io/files'
import { TWO_FACTOR_ONLY, bracketLabel, chartAdvice, chartAnalysis, chartSamples, methodsText, parseTable, withTestBrackets } from '../src/model/chart'
import { applyInstruction } from '../src/model/chartCommands'
import { pText } from '../src/model/chartTests'
import { emptyDoc } from '../src/model/doc'
import type { ChartNode, FigNode } from '../src/model/types'

// The balanced table above as the scientist pastes it: categories in the first row, series in the second.
const TABLE = ['c1\tc1\tc2\tc2\tc3\tc3', 'ctrl\tdrug\tctrl\tdrug\tctrl\tdrug', ...[0, 1, 2, 3].map((r) => BALANCED.flatMap((row) => row.map((cell) => cell[r])).join('\t'))].join('\n')
const grouped = (extra: Partial<ChartNode> = {}): ChartNode => ({ id: 'ch', type: 'chart', x: 0, y: 0, w: 460, h: 320, rotation: 0, kind: 'bar', groups: parseTable(TABLE), ...extra })
const result = (node: ChartNode) => {
  const out = chartAnalysis(node)
  if (!out?.ok) throw new Error(out ? out.problem : 'no test')
  return out.result
}

describe('a chart with categories and series', () => {
  it('is suggested the two-way analysis, with the reasons', () => {
    const advice = chartAdvice(grouped())
    expect(advice.test).toBe('twoWay')
    expect(advice.by).toBe('means')
    expect(advice.why[0]).toBe('The table has 3 categories (c1, c2 and c3) and 2 series (ctrl and drug): two factors, with 4 values in every combination.')
    expect(advice.cautions.some((c) => c.startsWith('Samples measured repeatedly'))).toBe(true)
    expect(chartSamples(grouped()).names).toEqual(['c1 · ctrl', 'c1 · drug', 'c2 · ctrl', 'c2 · drug', 'c3 · ctrl', 'c3 · drug'])
  })

  it('gets the three answers R gives, the interaction first', () => {
    const r = result(grouped({ test: { by: 'means' } }))
    expect(r.test).toBe('twoWay')
    const [interaction, categories, series] = r.effects!
    expect(interaction.name).toBe('Interaction (does the difference between ctrl and drug depend on the category?)')
    expect(categories.name).toBe('Between the categories (c1, c2 and c3)')
    expect(series.name).toBe('Between the series (ctrl and drug)')
    near(categories.p, sets.balanced.p[0], 'categories', 1e-7)
    near(series.p, sets.balanced.p[1], 'series', 1e-7)
    near(interaction.p, sets.balanced.p[2], 'interaction', 1e-7)
    expect(interaction.statistic).toBe('F(2, 18) = 22')
    expect(r.statistic).toBe(interaction.statistic)
    expect(r.notes).toEqual([])
  })

  it('compares the series within each category, or the categories within each series, as R does', () => {
    const within = result(grouped({ test: { by: 'means' } }))
    expect(within.pairs.map((p) => [p.a, p.b])).toEqual([[0, 1], [2, 3], [4, 5]])
    within.pairs.forEach((p, i) => near(p.p!, sets.balanced.within[i], `within ${i}`, 1e-7))
    expect(within.pairMethod).toBe('t tests with the scatter pooled over all combinations, the series within each category, Holm’s correction')
    const across = result(grouped({ test: { by: 'means', across: true } }))
    expect(across.pairs.map((p) => [p.a, p.b])).toEqual([[0, 2], [0, 4], [2, 4], [1, 3], [1, 5], [3, 5]])
    across.pairs.forEach((p, i) => near(p.p!, sets.balanced.across![i], `across ${i}`, 1e-7))
  })

  it('writes the result on brackets that follow the test, and adds them where p is below 0.05', () => {
    const node = grouped({ test: { by: 'means' }, brackets: [{ from: 4, to: 5, label: '', auto: true }, { from: 0, to: 2, label: '', auto: true }] })
    expect(bracketLabel(node, node.brackets![0])).toBe(pText(sets.balanced.within[2]))
    // c1 · ctrl and c2 · ctrl are not a pair of this comparison (they differ in category).
    expect(bracketLabel(node, node.brackets![1])).toBe('')
    const added = withTestBrackets(grouped({ test: { by: 'means' } }))
    expect(added.brackets.map((b) => [b.from, b.to])).toEqual([[0, 1], [2, 3], [4, 5]])
    expect(withTestBrackets(grouped({ test: { by: 'means', stars: true } })).different).toBe(true)
  })

  it('says why it cannot be analysed: a missing combination, one value each, one category, ranks or pairing', () => {
    const missing = parseTable('c1\tc1\tc2\nctrl\tdrug\tctrl\n1\t2\t3\n2\t3\t5')
    expect(chartAdvice(grouped({ groups: missing })).why[0]).toBe('A two-way analysis needs values in every combination of category and series: “c2 · drug” has none.')
    expect(chartAnalysis(grouped({ groups: missing, test: { by: 'means' } }))).toMatchObject({ ok: false })
    const single = parseTable('c1\tc1\tc2\tc2\nctrl\tdrug\tctrl\tdrug\n1\t2\t3\t5')
    expect(chartAdvice(grouped({ groups: single })).why[0]).toContain('needs more values than there are combinations')
    const oneCategory = parseTable('c1\tc1\nctrl\tdrug\n1\t2\n2\t4')
    expect(chartAdvice(grouped({ groups: oneCategory })).why[0]).toContain('Two factors need at least two categories and two series')
    expect(chartAnalysis(grouped({ test: { by: 'ranks' } }))).toEqual({ ok: false, problem: TWO_FACTOR_ONLY })
    // Unequal numbers are analysed, with a word about how.
    const unequal = parseTable('c1\tc1\tc2\tc2\nctrl\tdrug\tctrl\tdrug\n4.1\t6.9\t3.3\t5.2\n5.3\t7.4\t4.7\t9.3\n6\t5.9\t5.1\t8.8\n5.8\t8.1\t2.9\t10.1\n4.9\t7.7\t\t7.9\n6.4\t6.6\t\t9.6')
    const r = result(grouped({ groups: unequal, test: { by: 'means' } }))
    near(r.effects![0].p, sets.unequal.p[2], 'interaction, unequal', 1e-7)
    near(r.effects![1].p, sets.unequal.p[0], 'categories, unequal', 1e-7)
    r.pairs.forEach((p, i) => near(p.p!, sets.unequal.within[i], `pairs, unequal ${i}`, 1e-7))
    expect(r.notes[0]).toContain('Type II sums of squares')
  })

  it('has a text for the methods', () => {
    const text = methodsText(grouped({ error: 'sd', test: { by: 'means' } }))!
    expect(text).toContain('Bars show the mean ± standard deviation (SD). N = 4 per combination of category and series.')
    expect(text).toContain('The effects of the category (c1, c2 and c3) and of the series (ctrl and drug) and their interaction were tested by two-way analysis of variance (ANOVA) with Type II sums of squares, followed by two-sided t tests of the series within each category, with the variance pooled over all combinations, with Holm’s correction for multiple comparisons.')
    expect(text).toContain('Result: interaction, F(2, 18) = 22, p < 0.0001; between the categories, F(2, 18) = 44.9, p < 0.0001; between the series, F(1, 18) = 164, p < 0.0001.')
    expect(text).toContain('R 4.4 (lm and anova, with Type II sums of squares, p.adjust with method "holm")')
    expect(methodsText(grouped({ stacked: true, test: { by: 'means' } }))).toContain('Stacked bars show the mean of each series.')
  })

  it('keeps the choice of pairs in a saved figure', () => {
    const saved = validateDoc(JSON.parse(JSON.stringify({ ...emptyDoc(), nodes: [grouped({ test: { by: 'means', across: true } }) as FigNode] }))).nodes[0] as ChartNode
    expect(saved.test).toEqual({ by: 'means', across: true })
  })

  it('can be asked for in the instruction box', () => {
    for (const words of ['two-way anova', 'run a test', 'statistics', 'anova']) {
      const r = applyInstruction(grouped(), words)
      expect(r.node.test, words).toEqual({ by: 'means' })
      expect(r.done, words).toEqual(['The categories and the series are compared with a two-way analysis of variance (ANOVA), as the table has categories and series.'])
      expect(r.unclear, words).toEqual([])
    }
    const pairs = applyInstruction(grouped({ test: { by: 'means' } }), 'compare the categories within each series')
    expect(pairs.node.test).toEqual({ by: 'means', across: true })
    expect(applyInstruction(grouped({ test: { by: 'means', across: true } }), 'series within each category').node.test).toEqual({ by: 'means' })
    for (const words of ['mann-whitney', 'paired t test']) {
      const refused = applyInstruction(grouped(), words)
      expect(refused.node.test, words).toBeUndefined()
      expect(refused.unclear, words).toEqual([TWO_FACTOR_ONLY])
    }
    expect(applyInstruction(grouped({ test: { by: 'means' } }), 'no test').node.test).toBeUndefined()
  })
})
