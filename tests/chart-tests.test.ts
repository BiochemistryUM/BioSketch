// The statistical tests, pinned to R 4.4 (tests/stats-reference.json, written by
// scripts/stats-reference.R: t.test, wilcox.test, aov, TukeyHSD, pairwise.t.test,
// kruskal.test, pairwise.wilcox.test, friedman.test, shapiro.test, p.adjust).

import { describe, expect, it } from 'vitest'
import { analyse, friedman, holm, kruskalWallis, mannWhitney, oneWayAnova, pairedT, pText, ranks, repeatedAnova, residuals, shapiroWilk, signedRank, stars, suggest, testFor, tukeyPair, welchT } from '../src/model/chartTests'
import ref from './stats-reference.json'

const A = [4.1, 5.3, 6.0, 5.8, 4.9, 6.4]
const B = [6.9, 7.4, 5.9, 8.1, 7.7, 6.6]
const C = [5.2, 9.3, 8.8, 10.1, 7.9, 9.6]
const D = [3.3, 4.7, 5.1, 2.9]
const T1 = [1, 2, 2, 3, 4, 4, 5]
const T2 = [2, 3, 4, 4, 5, 6, 6, 7]
const S = [0.8, 1.1, 1.3, 1.9, 2.4, 3.8, 7.5, 21.0]
const P1 = [10, 12, 9, 14, 11, 13, 8, 15]
const P2 = [12, 15, 9, 13, 14, 17, 10, 19]

const near = (got: number | null | undefined, want: number, rel = 1e-9) => {
  expect(got).not.toBeNull()
  expect(Math.abs((got as number) - want), `${got} against ${want}`).toBeLessThanOrEqual(rel * Math.abs(want) + 1e-14)
}
const nearAll = (got: (number | null)[], want: number[], rel = 1e-9) => {
  expect(got.length).toBe(want.length)
  got.forEach((g, i) => near(g, want[i], rel))
}
const pairPs = (samples: number[][], by: 'means' | 'ranks', paired = false, versusFirst = false): (number | null)[] => {
  const out = analyse(samples, { by, paired, versusFirst })
  if (!out.ok) throw new Error(out.problem)
  return out.result.pairs.map((p) => p.p)
}

describe('two groups', () => {
  it('Welch’s t test (t.test)', () => {
    for (const [x, y, want] of [[A, B, ref.two.welchAB], [A, D, ref.two.welchAD]] as const) {
      const r = welchT(x, y)!
      near(r.t, want.statistic)
      near(r.df, want.df!)
      near(r.p, want.p)
    }
    expect(welchT([1], [2, 3])).toBeNull()
    expect(welchT([2, 2, 2], [5, 5, 5])).toBeNull()
  })

  it('paired t test (t.test, paired)', () => {
    for (const [x, y, want] of [[A, B, ref.two.pairedAB], [P1, P2, ref.two.pairedP]] as const) {
      const r = pairedT(x, y)!
      near(r.t, want.statistic)
      expect(r.df).toBe(want.df)
      near(r.p, want.p)
    }
    expect(pairedT([1, 2, 3], [2, 3, 4])).toBeNull()
    expect(pairedT([1], [2])).toBeNull()
  })

  it('Mann–Whitney test (wilcox.test): exact without ties, normal approximation with', () => {
    for (const [x, y, want, exact] of [[A, B, ref.two.mwAB, true], [A, D, ref.two.mwAD, true], [T1, T2, ref.two.mwTies, false], [A, S, ref.two.mwAS, true]] as const) {
      const r = mannWhitney(x, y)!
      expect(r.statistic).toBe(want.statistic)
      near(r.p, want.p)
      expect(r.exact).toBe(exact)
    }
    // The order of the groups does not matter to the p value.
    near(mannWhitney(B, A)!.p, ref.two.mwAB.p)
    expect(mannWhitney([], [1, 2])).toBeNull()
    expect(mannWhitney([3, 3], [3, 3])).toBeNull()
  })

  it('Wilcoxon signed-rank test (wilcox.test, paired): rows without change are left out', () => {
    // A − B holds two changes of 2.8: a tie on paper, though not in binary arithmetic. R is told to see it (digits.rank = 12).
    for (const [x, y, want, exact] of [[A, B, ref.two.srAB, false], [P1, P2, ref.two.srP, false], [A, C, ref.two.srAC, true]] as const) {
      const r = signedRank(x, y)!
      expect(r.statistic).toBe(want.statistic)
      near(r.p, want.p)
      expect(r.exact).toBe(exact)
    }
    expect(signedRank(P1, P2)!.n).toBe(7)
    // Left to its default, R takes the two changes of 2.8 for different and gives the exact p value.
    expect(ref.two.srABnoisy.p).toBe(0.0625)
    expect(signedRank(A, B)!.p).not.toBeCloseTo(0.0625, 3)
    expect(signedRank([1, 2], [1, 2])).toBeNull()
    // Changes that are equal but for the last digit of a decimal fraction are ties: 0.3 − 0.1 and 0.5 − 0.3.
    expect(signedRank([0.3, 0.5, 0.9], [0.1, 0.3, 0.2])!.exact).toBe(false)
  })
})

describe('several separate groups', () => {
  const groups = [A, B, C, D]

  it('one-way analysis of variance (aov) and Tukey’s test (TukeyHSD)', () => {
    const r = oneWayAnova(groups)!
    near(r.f, ref.several.anova.statistic)
    expect([r.df1, r.df2]).toEqual(ref.several.anova.df)
    near(r.p, ref.several.anova.p)
    nearAll(pairPs(groups, 'means'), ref.several.tukey, 1e-7)
    near(tukeyPair(A, B, r, 4), ref.several.tukey[0], 1e-7)
    expect(oneWayAnova([[1, 1], [1, 1]])).toBeNull()
    expect(oneWayAnova([[1], [2]])).toBeNull()
  })

  it('each group with the first: Dunnett’s test (the integral of the reference script; multcomp glht with mcp Dunnett)', () => {
    nearAll(pairPs(groups, 'means', false, true), ref.several.dunnettFirst, 1e-7)
    // Dunnett's p values allow for the comparisons sharing the control: none is larger than Holm's t tests give.
    const holm = ref.several.pooledFirstHolm
    pairPs(groups, 'means', false, true).forEach((p, i) => expect(p!).toBeLessThanOrEqual(Math.max(holm[i], ref.several.dunnettFirst[i]) + 1e-9))
  })

  it('Kruskal–Wallis test (kruskal.test) and Mann–Whitney tests with Holm’s correction (pairwise.wilcox.test)', () => {
    const r = kruskalWallis(groups)!
    near(r.statistic, ref.several.kruskal.statistic)
    expect(r.df).toBe(3)
    near(r.p, ref.several.kruskal.p)
    nearAll(pairPs(groups, 'ranks'), ref.several.wilcoxHolm)
    nearAll(pairPs(groups, 'ranks', false, true), ref.several.wilcoxFirstHolm)
    const tied = kruskalWallis([T1, T2, [1, 1, 3, 5, 8]])!
    near(tied.statistic, ref.several.kruskalTies.statistic)
    near(tied.p, ref.several.kruskalTies.p)
    expect(kruskalWallis([[2, 2], [2, 2], [2]])).toBeNull()
  })
})

describe('several groups, the same samples in every group', () => {
  const groups = [A, B, C]

  it('repeated-measures analysis of variance (lm with sample and group) and paired t tests with Holm’s correction', () => {
    const r = repeatedAnova(groups)!
    near(r.f, ref.repeated.anova.statistic)
    expect([r.df1, r.df2]).toEqual(ref.repeated.anova.df)
    near(r.p, ref.repeated.anova.p)
    nearAll(pairPs(groups, 'means', true), ref.repeated.pairedHolm)
    expect(repeatedAnova([[1, 2, 3], [2, 3, 4], [4, 5, 6]])).toBeNull()
    expect(repeatedAnova([[1, 2, 3], [2, 3]])).toBeNull()
  })

  it('Friedman test (friedman.test) and signed-rank tests with Holm’s correction', () => {
    const r = friedman(groups)!
    near(r.statistic, ref.repeated.friedman.statistic)
    near(r.p, ref.repeated.friedman.p)
    nearAll(pairPs(groups, 'ranks', true), ref.repeated.signedHolm)
    const tied = friedman([[1, 2, 2, 3, 4], [2, 2, 4, 4, 5], [3, 2, 4, 6, 5]])!
    near(tied.statistic, ref.repeated.friedmanTies.statistic)
    near(tied.p, ref.repeated.friedmanTies.p)
    expect(friedman([[1, 1], [1, 1], [1, 1]])).toBeNull()
  })
})

describe('helpers', () => {
  it('ranks share the mean rank among equal values', () => {
    expect(ranks([10, 20, 20, 5])).toEqual({ rank: [2, 3.5, 3.5, 1], ties: 6 })
    expect(ranks([1, 1, 1]).ties).toBe(24)
    expect(ranks([]).rank).toEqual([])
  })

  it('Holm’s correction (p.adjust)', () => {
    nearAll(holm([0.01, 0.04, 0.03, 0.5, 0.012]), ref.holm)
    expect(holm([])).toEqual([])
    expect(holm([0.9, 0.8])).toEqual([1, 1])
  })

  it('writes p values and stars', () => {
    expect(pText(0.0123456)).toBe('p = 0.0123')
    expect(pText(0.04962)).toBe('p = 0.0496')
    expect(pText(0.3421)).toBe('p = 0.342')
    expect(pText(0.5)).toBe('p = 0.5')
    expect(pText(0.00012345)).toBe('p = 0.0001')
    expect(pText(0.00005)).toBe('p < 0.0001')
    expect(pText(1)).toBe('p > 0.9999')
    expect(pText(NaN)).toBe('p = ?')
    expect([0.2, 0.05, 0.049, 0.01, 0.0099, 0.0005, 0.00001].map(stars)).toEqual(['ns', 'ns', '*', '*', '**', '***', '****'])
  })
})

describe('running the test that fits a design', () => {
  it('picks the test by number of groups, means or ranks, paired or not', () => {
    expect([testFor(2, 'means', false), testFor(2, 'means', true), testFor(2, 'ranks', false), testFor(2, 'ranks', true)]).toEqual(['welch', 'pairedT', 'mannWhitney', 'signedRank'])
    expect([testFor(3, 'means', false), testFor(3, 'means', true), testFor(5, 'ranks', false), testFor(4, 'ranks', true)]).toEqual(['anova', 'repeatedAnova', 'kruskal', 'friedman'])
  })

  it('with two groups the one pair carries the p value of the test', () => {
    const out = analyse([A, B], { by: 'means', paired: false, versusFirst: false })
    expect(out.ok && out.result.test).toBe('welch')
    expect(out.ok && out.result.statistic).toBe('t = -3.58, df = 9.98')
    expect(out.ok && out.result.pairs).toMatchObject([{ a: 0, b: 1, p: ref.two.welchAB.p }].map((p) => ({ ...p, p: expect.closeTo(p.p, 12) })))
    expect(out.ok && out.result.pairMethod).toBe('')
  })

  it('with several groups it lists the pairs and names how they were compared', () => {
    const all = analyse([A, B, C, D], { by: 'means', paired: false, versusFirst: false })
    expect(all.ok && all.result.pairs.map((p) => [p.a, p.b])).toEqual([[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]])
    expect(all.ok && all.result.pairMethod).toBe('Tukey’s test, every pair')
    expect(all.ok && all.result.statistic).toBe('F(3, 18) = 13.4')
    const first = analyse([A, B, C, D], { by: 'ranks', paired: false, versusFirst: true })
    expect(first.ok && first.result.pairs.map((p) => [p.a, p.b])).toEqual([[0, 1], [0, 2], [0, 3]])
    expect(first.ok && first.result.pairMethod).toBe('Mann–Whitney tests, each group with the first, Holm’s correction')
  })

  it('says in words when a test cannot be worked out, and when a p value is approximate', () => {
    const problem = (samples: number[][], by: 'means' | 'ranks', paired = false) => {
      const out = analyse(samples, { by, paired, versusFirst: false })
      return out.ok ? '' : out.problem
    }
    expect(problem([A], 'means')).toMatch(/at least two groups/)
    expect(problem([A, [1]], 'means')).toMatch(/at least two values in each group/)
    expect(problem([A, D], 'means', true)).toMatch(/a value in every group for each row/)
    expect(problem([[3, 3, 3], [5, 5, 5]], 'means')).toMatch(/do not scatter/)
    expect(problem([[1, 2], [1, 2]], 'ranks', true)).toMatch(/no row shows a change/)
    expect(problem([[1], [2], [3]], 'means')).toMatch(/more values than groups/)
    const tied = analyse([T1, T2], { by: 'ranks', paired: false, versusFirst: false })
    expect(tied.ok && tied.result.notes.join(' ')).toMatch(/normal approximation/)
    const zero = analyse([P1, P2], { by: 'ranks', paired: true, versusFirst: false })
    expect(zero.ok && zero.result.notes.join(' ')).toMatch(/1 row shows no change/)
    // Tukey's test is not defined with fewer than two degrees of freedom: the pairs say so, the overall test stands.
    const thin = analyse([[1, 2], [3], [5]], { by: 'means', paired: false, versusFirst: false })
    expect(thin.ok && thin.result.pairs.every((p) => p.p === null)).toBe(true)
    expect(thin.ok && thin.result.notes.join(' ')).toMatch(/Tukey/)
  })
})

describe('does the scatter look normal? (shapiro.test)', () => {
  it('agrees with R from three values to sixty', () => {
    const cases: [number[], { statistic: number; p: number }][] = [
      [A, ref.normal.A],
      [S, ref.normal.S],
      [[1.2, 3.4, 3.9], ref.normal.three],
      [T2, ref.normal.T2],
      [[...A, ...B], ref.normal.twelve],
      // 60 values spread like an exponential distribution: qexp(ppoints(60)).
      [Array.from({ length: 60 }, (_, i) => -Math.log(1 - (i + 0.5) / 60)), ref.normal.large],
    ]
    for (const [values, want] of cases) {
      const r = shapiroWilk(values)!
      near(r.w, want.statistic, 1e-9)
      near(r.p, want.p, 1e-7)
    }
  })

  it('tests the residuals of an analysis of variance, and gives nothing without scatter', () => {
    const rest = residuals([A, B, C, D], false)
    expect(rest).toHaveLength(22)
    const r = shapiroWilk(rest)!
    near(r.w, ref.normal.residuals.statistic, 1e-9)
    near(r.p, ref.normal.residuals.p, 1e-7)
    expect(shapiroWilk([1, 2])).toBeNull()
    expect(shapiroWilk([4, 4, 4, 4])).toBeNull()
  })

  it('takes the differences of a paired design, and the sample out of several paired groups', () => {
    expect(residuals([[5, 7, 9], [4, 4, 5]], true)).toEqual([1, 3, 4])
    // Every group is the first plus a constant: nothing is left once sample and group are taken out.
    const rest = residuals([[1, 2, 6], [2, 3, 7], [5, 6, 10]], true)
    rest.forEach((v) => expect(v).toBeCloseTo(0, 12))
    // A group with a single value has no scatter of its own.
    expect(residuals([[1, 3], [7]], false)).toEqual([-1, 1])
  })
})

describe('advice on which test fits a table', () => {
  const advise = (samples: number[][], paired = false, versusFirst = false) => suggest(samples.map((_, i) => `G${i + 1}`), samples, { paired, versusFirst })

  it('suggests a test on means when the values scatter like a normal distribution', () => {
    expect(advise([A, B]).test).toBe('welch')
    expect(advise([A, B], true).test).toBe('pairedT')
    expect(advise([A, B, C, D]).test).toBe('anova')
    expect(advise([A, B, C], true).test).toBe('repeatedAnova')
    const a = advise([A, B])
    expect(a.by).toBe('means')
    expect(a.does).toMatch(/same mean/)
    expect(a.why.join(' ')).toMatch(/two groups \(G1, n = 6; G2, n = 6\)/)
    expect(a.why.join(' ')).toMatch(/separate samples/)
    expect(a.why.join(' ')).toMatch(/Shapiro–Wilk test, p = 0\.\d+/)
  })

  it('suggests a test on ranks when they do not', () => {
    const skewed = [S, S.map((v) => v * 3 + 0.2)]
    expect(advise(skewed).test).toBe('mannWhitney')
    expect(advise(skewed).why.join(' ')).toMatch(/do not scatter like a normal distribution/)
    expect(advise([S, [1, 1.2, 0.9, 1.4, 1.1, 30, 1.3, 1.0]], true).test).toBe('signedRank')
    expect(advise([S, S.map((v) => v * 2), S.map((v) => v * 5)]).test).toBe('kruskal')
    expect(advise([[1, 2, 3, 4, 5, 6], [2, 3, 4, 5, 6, 70], [3, 4, 5, 6, 7, 8]], true).test).toBe('friedman')
  })

  it('explains the design it was told about', () => {
    expect(advise([A, B], true).why.join(' ')).toMatch(/each row is one sample measured in every group/)
    expect(advise([A, B, C, D]).why.join(' ')).toMatch(/Tukey’s test, every pair/)
    expect(advise([A, B, C, D], false, true).why.join(' ')).toMatch(/Dunnett’s test, each group with the first/)
    expect(advise([A, B, C, D, A]).why[0]).toBe('The table has 5 groups with 4 to 6 values each.')
  })

  it('says what cannot be tested', () => {
    expect(advise([A]).test).toBeNull()
    expect(advise([A]).why[0]).toMatch(/fewer than two groups/)
    expect(advise([A, [3]]).why[0]).toMatch(/“G2” has 1/)
    expect(advise([[1], [2]], true).why[0]).toMatch(/at least two rows/)
  })

  it('warns about what these data cannot support', () => {
    // Small groups: the check for a normal distribution is weak.
    expect(advise([[1, 2, 4], [3, 5, 9]]).cautions.join(' ')).toMatch(/gross departure/)
    // Three against three by ranks can never reach 0.05.
    const few = advise([[1, 2, 400], [3, 5, 9000]])
    if (few.test === 'mannWhitney') expect(few.cautions.join(' ')).toMatch(/cannot give a p value below 0\.1/)
    // Very different scatter in an analysis of variance.
    const uneven = advise([[10, 11, 12, 11, 10], [20, 60, 35, 5, 48], [15, 16, 14, 15, 17]])
    if (uneven.test === 'anova') expect(uneven.cautions.join(' ')).toMatch(/scatter very differently/)
    // Identical values everywhere: nothing to check, the usual test is named with a caution.
    const flat = advise([[2, 2, 2], [2, 2, 2]])
    expect(flat.test).toBe('welch')
    expect(flat.cautions.join(' ')).toMatch(/what is known about this kind of measurement/)
  })
})
