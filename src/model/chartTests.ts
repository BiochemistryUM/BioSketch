// Statistical tests for the groups of a chart, and the advice on which one fits a table.
//
// Eight tests, one for each common design with a single factor:
//
//                          separate samples               the same samples in every group
//   two groups, means      Welch's t test                 paired t test
//   two groups, ranks      Mann-Whitney test              Wilcoxon signed-rank test
//   several, means         one-way analysis of variance   repeated-measures analysis of variance
//   several, ranks         Kruskal-Wallis test            Friedman test
//
// With several groups the overall test is followed by comparisons of pairs: Tukey's test after a
// one-way analysis of variance when every pair is compared, otherwise the two-group test of the
// same family (after a one-way analysis of variance: t tests with the spread pooled over all
// groups) with Holm's correction for the number of comparisons.
//
// Every definition is the default of R's function of the same name (t.test, wilcox.test, aov,
// TukeyHSD, kruskal.test, friedman.test, pairwise.t.test, pairwise.wilcox.test, p.adjust,
// shapiro.test), all p values are two-sided, and tests/chart-tests.test.ts pins each to R's result.

import { chiSquaredUpper, dunnettCritical, dunnettUpper, fUpper, logGamma, normalBelow, normalQuantile, rankSumTwoSided, signedRankTwoSided, studentizedRangeCritical, studentizedRangeUpper, tCritical, tTwoSided } from './distributions'

const TINY = 1e-300
const sum = (values: number[]): number => values.reduce((a, b) => a + b, 0)
const mean = (values: number[]): number => sum(values) / values.length
/** Sum of squared distances from the mean. */
const squares = (values: number[]): number => {
  const m = mean(values)
  return values.reduce((a, b) => a + (b - m) ** 2, 0)
}
const variance = (values: number[]): number => squares(values) / (values.length - 1)
/** A difference without the last-digit noise of decimal fractions (0.3 − 0.1 is 0.2, not 0.19999999999999998), so equal changes count as ties. */
const tidy = (v: number): number => Number(v.toPrecision(12))

/** Ranks of the values (1 = smallest; equal values share the mean of their ranks) and the tie term Σ(t³ − t). */
export function ranks(values: number[]): { rank: number[]; ties: number } {
  const order = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v)
  const rank = new Array<number>(values.length)
  let ties = 0
  for (let i = 0; i < order.length; ) {
    let j = i
    while (j + 1 < order.length && order[j + 1].v === order[i].v) j++
    const t = j - i + 1
    for (let k = i; k <= j; k++) rank[order[k].i] = (i + j) / 2 + 1
    ties += t ** 3 - t
    i = j + 1
  }
  return { rank, ties }
}

/** Holm's correction: p values adjusted for the number of comparisons, in the order given (R's `p.adjust(p, "holm")`). */
export function holm(ps: number[]): number[] {
  const order = ps.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p)
  const out = new Array<number>(ps.length)
  let highest = 0
  order.forEach(({ p, i }, place) => {
    highest = Math.max(highest, Math.min(1, (ps.length - place) * p))
    out[i] = highest
  })
  return out
}

// ---------- two groups ----------

export interface TResult {
  t: number
  df: number
  p: number
}

/** Welch's t test: two separate groups, each with its own spread. Null when it cannot be worked out. */
export function welchT(x: number[], y: number[]): TResult | null {
  if (x.length < 2 || y.length < 2) return null
  const [vx, vy] = [variance(x) / x.length, variance(y) / y.length]
  const se = Math.sqrt(vx + vy)
  // As R: values that are all but constant give no test.
  if (!(se > 1e-15 * Math.max(Math.abs(mean(x)), Math.abs(mean(y)), TINY))) return null
  const t = (mean(x) - mean(y)) / se
  const df = (vx + vy) ** 2 / (vx ** 2 / (x.length - 1) + vy ** 2 / (y.length - 1))
  return { t, df, p: tTwoSided(t, df) }
}

/** Paired t test on the differences between `x` and `y`, row by row. */
export function pairedT(x: number[], y: number[]): TResult | null {
  const d = x.map((v, i) => v - y[i])
  if (d.length < 2) return null
  const se = Math.sqrt(variance(d) / d.length)
  if (!(se > 1e-15 * Math.max(Math.abs(mean(d)), TINY))) return null
  const t = mean(d) / se
  return { t, df: d.length - 1, p: tTwoSided(t, d.length - 1) }
}

export interface RankResult {
  /** The statistic: W of the Mann-Whitney test, V of the signed-rank test. */
  statistic: number
  p: number
  /** True when the p value is exact; false when it is the normal approximation with continuity correction. */
  exact: boolean
}

/** The p value of a statistic that is about normal with this middle and spread, corrected for continuity. */
function normalTwoSided(statistic: number, middle: number, sigma: number): number {
  const off = statistic - middle
  const z = (off - Math.sign(off) * 0.5) / sigma
  return 2 * Math.min(normalBelow(z), normalBelow(-z))
}

/**
 * Mann-Whitney test (Wilcoxon rank-sum test) of two separate groups. The p value is exact when
 * both groups have fewer than 50 values and no two values are equal, as in R; otherwise the
 * normal approximation with corrections for ties and continuity.
 */
export function mannWhitney(x: number[], y: number[]): RankResult | null {
  const [m, n] = [x.length, y.length]
  if (!m || !n) return null
  const r = ranks([...x, ...y])
  const w = sum(r.rank.slice(0, m)) - (m * (m + 1)) / 2
  if (m < 50 && n < 50 && r.ties === 0) return { statistic: w, p: rankSumTwoSided(w, m, n), exact: true }
  const sigma = Math.sqrt(((m * n) / 12) * (m + n + 1 - r.ties / ((m + n) * (m + n - 1))))
  if (!(sigma > 0)) return null
  return { statistic: w, p: normalTwoSided(w, (m * n) / 2, sigma), exact: false }
}

/**
 * Wilcoxon signed-rank test on the differences between `x` and `y`, row by row. Rows without a
 * difference are left out. Exact with fewer than 50 differences, none equal in size and none
 * zero, as in R; otherwise the normal approximation.
 */
export function signedRank(x: number[], y: number[]): (RankResult & { n: number }) | null {
  const all = x.map((v, i) => tidy(v - y[i]))
  const d = all.filter((v) => v !== 0)
  const n = d.length
  if (!n) return null
  const r = ranks(d.map(Math.abs))
  const v = sum(r.rank.filter((_, i) => d[i] > 0))
  if (n < 50 && r.ties === 0 && n === all.length) return { statistic: v, p: signedRankTwoSided(v, n), exact: true, n }
  const sigma = Math.sqrt((n * (n + 1) * (2 * n + 1)) / 24 - r.ties / 48)
  if (!(sigma > 0)) return null
  return { statistic: v, p: normalTwoSided(v, (n * (n + 1)) / 4, sigma), exact: false, n }
}

// ---------- several groups ----------

export interface FResult {
  f: number
  df1: number
  df2: number
  p: number
  /** Mean square within groups (the error variance). */
  error: number
}

/** One-way analysis of variance of separate groups. */
export function oneWayAnova(groups: number[][]): FResult | null {
  const k = groups.length
  const n = sum(groups.map((g) => g.length))
  if (k < 2 || n - k < 1 || groups.some((g) => !g.length)) return null
  const grand = sum(groups.map(sum)) / n
  const between = sum(groups.map((g) => g.length * (mean(g) - grand) ** 2)) / (k - 1)
  const error = sum(groups.map(squares)) / (n - k)
  if (!(error > 0)) return null
  const f = between / error
  return { f, df1: k - 1, df2: n - k, p: fUpper(f, k - 1, n - k), error }
}

/** Tukey's test of two of the groups after `oneWayAnova` over `k` groups (Tukey-Kramer when the groups differ in size). */
export function tukeyPair(x: number[], y: number[], anova: FResult, k: number): number | null {
  const q = Math.abs(mean(x) - mean(y)) / Math.sqrt((anova.error / 2) * (1 / x.length + 1 / y.length))
  const p = studentizedRangeUpper(q, k, anova.df2)
  return Number.isFinite(p) ? p : null
}

/**
 * Dunnett's test after `oneWayAnova`: every group compared with the first (the control), with p
 * values that allow for the number of comparisons and for all of them sharing the control.
 */
export function dunnettPairs(groups: number[][], anova: FResult): (number | null)[] {
  const control = groups[0]
  const others = groups.slice(1)
  const lambdas = others.map((g) => Math.sqrt(g.length / (g.length + control.length)))
  return others.map((g) => {
    const t = (mean(g) - mean(control)) / Math.sqrt(anova.error * (1 / g.length + 1 / control.length))
    const p = dunnettUpper(t, lambdas, anova.df2)
    return Number.isFinite(p) ? p : null
  })
}

/** t test of two of the groups with the spread pooled over all groups of `oneWayAnova`, uncorrected. */
export function pooledPair(x: number[], y: number[], anova: FResult): number {
  const t = (mean(x) - mean(y)) / Math.sqrt(anova.error * (1 / x.length + 1 / y.length))
  return tTwoSided(t, anova.df2)
}

export interface ChiResult {
  statistic: number
  df: number
  p: number
}

/** Kruskal-Wallis test of separate groups, corrected for ties. */
export function kruskalWallis(groups: number[][]): ChiResult | null {
  const k = groups.length
  const n = sum(groups.map((g) => g.length))
  if (k < 2 || groups.some((g) => !g.length)) return null
  const r = ranks(groups.flat())
  let at = 0
  let h = 0
  for (const g of groups) {
    h += sum(r.rank.slice(at, at + g.length)) ** 2 / g.length
    at += g.length
  }
  const statistic = ((12 * h) / (n * (n + 1)) - 3 * (n + 1)) / (1 - r.ties / (n ** 3 - n))
  if (!Number.isFinite(statistic)) return null
  return { statistic, df: k - 1, p: chiSquaredUpper(statistic, k - 1) }
}

/** Repeated-measures one-way analysis of variance: `groups[j][i]` is sample i in group j. Sphericity is assumed. */
export function repeatedAnova(groups: number[][]): FResult | null {
  const k = groups.length
  const n = groups[0]?.length ?? 0
  if (k < 2 || n < 2 || groups.some((g) => g.length !== n)) return null
  const grand = mean(groups.flat())
  const between = n * sum(groups.map((g) => (mean(g) - grand) ** 2))
  const rows = Array.from({ length: n }, (_, i) => mean(groups.map((g) => g[i])))
  const samples = k * sum(rows.map((m) => (m - grand) ** 2))
  const total = sum(groups.flat().map((v) => (v - grand) ** 2))
  const [df1, df2] = [k - 1, (k - 1) * (n - 1)]
  const error = (total - between - samples) / df2
  // Rounding can leave a hair of error where there is none.
  if (!(error > 1e-14 * Math.max(total / (k * n), TINY))) return null
  const f = between / df1 / error
  return { f, df1, df2, p: fUpper(f, df1, df2), error }
}

/** Friedman test: `groups[j][i]` is sample i in group j. Values are ranked within each sample; corrected for ties. */
export function friedman(groups: number[][]): ChiResult | null {
  const k = groups.length
  const n = groups[0]?.length ?? 0
  if (k < 2 || n < 2 || groups.some((g) => g.length !== n)) return null
  const totals = new Array<number>(k).fill(0)
  let ties = 0
  for (let i = 0; i < n; i++) {
    const r = ranks(groups.map((g) => g[i]))
    r.rank.forEach((v, j) => (totals[j] += v))
    ties += r.ties
  }
  const statistic = (12 * sum(totals.map((t) => (t - (n * (k + 1)) / 2) ** 2))) / (n * k * (k + 1) - ties / (k - 1))
  if (!Number.isFinite(statistic)) return null
  return { statistic, df: k - 1, p: chiSquaredUpper(statistic, k - 1) }
}

// ---------- does the scatter look normal? ----------

const poly = (c: number[], x: number): number => c.reduceRight((acc, v) => acc * x + v, 0)

/**
 * Shapiro-Wilk test of whether values could come from a normal distribution (Royston's 1995
 * algorithm, as R's `shapiro.test`), for 3 to 5000 values. A small p speaks against a normal
 * distribution. Null when there are too few values or they are all the same.
 */
export function shapiroWilk(values: number[]): { w: number; p: number } | null {
  const x = [...values].sort((a, b) => a - b)
  const n = x.length
  if (n < 3 || n > 5000 || !(x[n - 1] - x[0] > 0)) return null
  const half = Math.floor(n / 2)
  // Weights of the lower half of the ordered values; the upper half takes the same with the other sign.
  const a = new Array<number>(half)
  if (n === 3) a[0] = Math.SQRT1_2
  else {
    const m = Array.from({ length: half }, (_, i) => normalQuantile((i + 1 - 0.375) / (n + 0.25)))
    const summ2 = 2 * sum(m.map((v) => v * v))
    const root = Math.sqrt(summ2)
    const u = 1 / Math.sqrt(n)
    const a1 = poly([0, 0.221157, -0.147981, -2.07119, 4.434685, -2.706056], u) - m[0] / root
    let from = 1
    let fac: number
    if (n > 5) {
      const a2 = poly([0, 0.042981, -0.293762, -1.752461, 5.682633, -3.582633], u) - m[1] / root
      fac = Math.sqrt((summ2 - 2 * m[0] ** 2 - 2 * m[1] ** 2) / (1 - 2 * a1 ** 2 - 2 * a2 ** 2))
      a[1] = a2
      from = 2
    } else fac = Math.sqrt((summ2 - 2 * m[0] ** 2) / (1 - 2 * a1 ** 2))
    a[0] = a1
    for (let i = from; i < half; i++) a[i] = -m[i] / fac
  }
  // W is the squared correlation between the ordered values and their weights.
  const weight = x.map((_, i) => (i < half ? -a[i] : i >= n - half ? a[n - 1 - i] : 0))
  const mx = mean(x)
  const [saa, sxx, sax] = [sum(weight.map((v) => v * v)), squares(x), sum(weight.map((v, i) => v * (x[i] - mx)))]
  const rest = Math.max(0, 1 - (sax * sax) / (saa * sxx))
  const w = 1 - rest
  if (n === 3) {
    const p = (6 / Math.PI) * (Math.asin(Math.sqrt(w)) - Math.asin(Math.sqrt(0.75)))
    return { w, p: Math.min(1, Math.max(0, p)) }
  }
  let y = Math.log(rest)
  let middle: number
  let spread: number
  if (n <= 11) {
    const gamma = poly([-2.273, 0.459], n)
    if (y >= gamma) return { w, p: 0 }
    y = -Math.log(gamma - y)
    middle = poly([0.544, -0.39978, 0.025054, -6.714e-4], n)
    spread = Math.exp(poly([1.3822, -0.77857, 0.062767, -0.0020322], n))
  } else {
    const ln = Math.log(n)
    middle = poly([-1.5861, -0.31082, -0.083751, 0.0038915], ln)
    spread = Math.exp(poly([-0.4803, -0.082676, 0.0030302], ln))
  }
  return { w, p: normalBelow(-(y - middle) / spread) }
}

// ---------- choosing and running the test for a table ----------

export type Compare = 'means' | 'ranks'
export type TestId = 'welch' | 'pairedT' | 'mannWhitney' | 'signedRank' | 'anova' | 'kruskal' | 'repeatedAnova' | 'friedman' | 'twoWay'

export interface Design {
  by: Compare
  /** Row by row, the values of all groups come from the same sample. */
  paired: boolean
  /** With several groups: compare each group with the first only, not every pair. */
  versusFirst: boolean
}

/** The test for `k` groups compared this way. */
export function testFor(k: number, by: Compare, paired: boolean): TestId {
  if (k <= 2) return by === 'means' ? (paired ? 'pairedT' : 'welch') : paired ? 'signedRank' : 'mannWhitney'
  return by === 'means' ? (paired ? 'repeatedAnova' : 'anova') : paired ? 'friedman' : 'kruskal'
}

export const TEST_NAMES: Record<TestId, string> = {
  welch: 'Welch’s t test',
  pairedT: 'Paired t test',
  mannWhitney: 'Mann–Whitney test',
  signedRank: 'Wilcoxon signed-rank test',
  anova: 'One-way analysis of variance (ANOVA)',
  kruskal: 'Kruskal–Wallis test',
  repeatedAnova: 'Repeated-measures analysis of variance (ANOVA)',
  friedman: 'Friedman test',
  twoWay: 'Two-way analysis of variance (ANOVA)',
}

/** Short names, for buttons. */
export const TEST_SHORT: Record<TestId, string> = {
  welch: 'Welch t test',
  pairedT: 'Paired t test',
  mannWhitney: 'Mann–Whitney',
  signedRank: 'Wilcoxon signed-rank',
  anova: 'One-way ANOVA',
  kruskal: 'Kruskal–Wallis',
  repeatedAnova: 'Repeated-measures ANOVA',
  friedman: 'Friedman',
  twoWay: 'Two-way ANOVA',
}

/** What each test does, in words for a biologist. */
export const TEST_DOES: Record<TestId, string> = {
  welch: 'It asks whether the two groups have the same mean. The difference between the two means is compared with the scatter of the values within each group; the groups may scatter differently.',
  pairedT: 'It asks whether the mean change within a sample is zero. For every row it takes the difference between the two values, and compares the mean of these differences with their scatter. Differences between samples that affect both values alike drop out.',
  mannWhitney: 'It asks whether values in one group tend to be larger than in the other. All values are put in order and the ranks of the two groups are compared, so the result does not depend on the shape of the distribution, and one extreme value counts no more than any other.',
  signedRank: 'It asks whether the changes within samples are balanced around zero. The differences of all rows are ranked by size, and the ranks of the increases are compared with those of the decreases. Rows without a change are left out.',
  anova: 'It asks whether all groups have the same mean, by comparing the scatter between the group means with the scatter of the values within the groups. It assumes that all groups scatter about equally. A small p says that at least one group differs; the comparisons of pairs say which.',
  kruskal: 'It asks whether values in some groups tend to be larger than in others. All values are ranked together and the mean ranks of the groups are compared, so the shape of the distribution and single extreme values matter little. A small p says that at least one group differs; the comparisons of pairs say which.',
  repeatedAnova: 'It asks whether all groups have the same mean when every sample was measured in every group. Differences between samples are taken out first, so only the changes within samples are tested. It assumes that these changes scatter about equally for every pair of groups (sphericity).',
  friedman: 'It asks whether some groups tend to give larger values when every sample was measured in every group. Within each row the values are ranked, and the mean ranks of the groups are compared, so neither differences between samples nor the shape of the distribution matter.',
  twoWay: 'It asks three questions at once: whether the categories differ on the whole, whether the series differ on the whole, and whether the difference between the series depends on the category (the interaction). It compares each of these with the scatter of the values within the combinations, and assumes that this scatter is roughly normal and about equally wide everywhere. Look at the interaction first: when it is there, the two overall answers say little, and the pairs tell the story.',
}

/** How pairs of groups are compared after the overall test. */
export function pairMethod(test: TestId, versusFirst: boolean): string {
  const which = versusFirst ? 'each group with the first' : 'every pair'
  if (test === 'anova') return versusFirst ? 'Dunnett’s test, each group with the first' : 'Tukey’s test, every pair'
  if (test === 'kruskal') return `Mann–Whitney tests, ${which}, Holm’s correction`
  if (test === 'repeatedAnova') return `paired t tests, ${which}, Holm’s correction`
  if (test === 'friedman') return `Wilcoxon signed-rank tests, ${which}, Holm’s correction`
  return ''
}

export interface PairResult {
  /** Places of the two groups among the samples given to `analyse`. */
  a: number
  b: number
  /** The p value, corrected for the number of comparisons; null when it cannot be worked out. */
  p: number | null
  /** Tests on means: the mean of the second group less that of the first, with its 95 % confidence interval. */
  diff?: Difference
}

export interface Difference {
  estimate: number
  lower: number
  upper: number
}

/** A measure of how large the effect is, beside the p value that says how sure it is. */
export interface EffectSize {
  /** "Hedges’ g", "η²", … */
  name: string
  value: number
}

export interface Analysis {
  test: TestId
  /** The statistic and its degrees of freedom, written out: "t = 2.31, df = 7.4". */
  statistic: string
  /** The p value of the overall test. */
  p: number
  /** The comparisons of pairs. With two groups: the one pair, with the p value of the test itself. */
  pairs: PairResult[]
  /** How the pairs were compared; empty with two groups. */
  pairMethod: string
  /** Two factors: the three questions of the analysis, each with its statistic and p value (`statistic` and `p` are those of the interaction). */
  effects?: { name: string; statistic: string; p: number }[]
  /** Things the scientist should know about how the result was reached. */
  notes: string[]
  /** The size of the effect over all groups (see `EFFECT_DOES`); absent when it cannot be worked out. */
  effect?: EffectSize
  /** With several groups and a test on means: how the intervals of the pairs allow for the number of pairs. */
  intervals?: string
}

export type Outcome = { ok: true; result: Analysis } | { ok: false; problem: string }

const three = (v: number): string => String(Number(v.toPrecision(3)))
const APPROXIMATE = 'Some values are equal (ties), so the p value comes from the normal approximation with continuity correction instead of the exact distribution.'

/**
 * Run the test that fits `samples` (one list of values per group) and `design`. For a paired
 * design all lists must have the same length, row for row.
 */
export function analyse(samples: number[][], design: Design): Outcome {
  const k = samples.length
  const fail = (problem: string): Outcome => ({ ok: false, problem })
  if (k < 2) return fail('A test needs at least two groups with values.')
  if (design.paired && samples.some((s) => s.length !== samples[0].length)) return fail('A paired test needs a value in every group for each row.')
  const test = testFor(k, design.by, design.paired)
  const notes: string[] = []
  const constant = 'The test cannot be worked out: the values do not scatter (they are all the same, or change by exactly the same amount).'

  if (k === 2) {
    const [x, y] = samples
    let statistic: string
    let p: number
    if (test === 'welch' || test === 'pairedT') {
      if (test === 'welch' ? x.length < 2 || y.length < 2 : x.length < 2) return fail(test === 'welch' ? 'A t test needs at least two values in each group.' : 'A paired t test needs at least two complete rows.')
      const r = test === 'welch' ? welchT(x, y) : pairedT(x, y)
      if (!r) return fail(constant)
      statistic = `t = ${three(r.t)}, df = ${three(r.df)}`
      p = r.p
      const diff = test === 'welch' ? welchInterval(x, y) : pairedInterval(x, y)
      const effect = test === 'welch' ? hedgesG(x, y) : dz(x, y)
      return { ok: true, result: { test, statistic, p, pairs: [{ a: 0, b: 1, p, ...(diff ? { diff } : {}) }], pairMethod: '', notes, ...(effect ? { effect } : {}) } }
    } else {
      const signed = test === 'signedRank' ? signedRank(x, y) : null
      const r = test === 'mannWhitney' ? mannWhitney(x, y) : signed
      if (!r) return fail(test === 'signedRank' ? 'The test cannot be worked out: no row shows a change.' : constant)
      statistic = `${test === 'mannWhitney' ? 'W' : 'V'} = ${three(r.statistic)}`
      p = r.p
      const still = signed ? x.length - signed.n : 0
      if (!r.exact) notes.push(still ? `${still} ${still === 1 ? 'row shows' : 'rows show'} no change and ${still === 1 ? 'is' : 'are'} left out; the p value comes from the normal approximation with continuity correction.` : APPROXIMATE)
      const effect = signed ? { name: 'rank-biserial r', value: pairedRankBiserial(signed.statistic, signed.n) } : { name: 'rank-biserial r', value: 1 - (2 * r.statistic) / (x.length * y.length) }
      return { ok: true, result: { test, statistic, p, pairs: [{ a: 0, b: 1, p }], pairMethod: '', notes, ...(Number.isFinite(effect.value) ? { effect } : {}) } }
    }
  }

  // Several groups: the overall test, then pairs.
  const wanted: [number, number][] = []
  for (let a = 0; a < k; a++) for (let b = a + 1; b < k; b++) if (!design.versusFirst || a === 0) wanted.push([a, b])
  let statistic: string
  let p: number
  let raw: (number | null)[]
  let corrected = false
  let effect: EffectSize | undefined
  let diffs: (Difference | null)[] = []
  let intervals: string | undefined
  if (test === 'anova') {
    if (samples.some((s) => s.length < 1) || sum(samples.map((s) => s.length)) - k < 1) return fail('An analysis of variance needs more values than groups.')
    const r = oneWayAnova(samples)
    if (!r) return fail(constant)
    statistic = `F(${r.df1}, ${r.df2}) = ${three(r.f)}`
    p = r.p
    effect = { name: 'η²', value: etaSquared(r) }
    if (design.versusFirst) {
      // Each group with the first: Dunnett's test, which is made for exactly this.
      raw = dunnettPairs(samples, r)
      corrected = true
      diffs = dunnettIntervals(samples, r)
      intervals = 'Dunnett’s simultaneous 95 % intervals'
    } else {
      raw = wanted.map(([a, b]) => tukeyPair(samples[a], samples[b], r, k))
      corrected = true
      if (raw.some((v) => v === null)) notes.push('Tukey’s test needs at least two more values than there are groups.')
      const q = studentizedRangeCritical(0.05, k, r.df2)
      diffs = wanted.map(([a, b]) => around(mean(samples[b]) - mean(samples[a]), (q / Math.SQRT2) * Math.sqrt(r.error * (1 / samples[a].length + 1 / samples[b].length))))
      intervals = 'Tukey’s simultaneous 95 % intervals'
    }
  } else if (test === 'repeatedAnova') {
    if (samples[0].length < 2) return fail('A repeated-measures analysis needs at least two complete rows.')
    const r = repeatedAnova(samples)
    if (!r) return fail(constant)
    statistic = `F(${r.df1}, ${r.df2}) = ${three(r.f)}`
    p = r.p
    effect = { name: 'partial η²', value: etaSquared(r) }
    raw = wanted.map(([a, b]) => pairedT(samples[a], samples[b])?.p ?? null)
    diffs = wanted.map(([a, b]) => pairedInterval(samples[a], samples[b]))
    intervals = '95 % intervals of the paired differences, each on its own (not corrected for the number of pairs)'
  } else {
    const r = test === 'kruskal' ? kruskalWallis(samples) : friedman(samples)
    if (!r) return fail(test === 'friedman' && samples[0].length < 2 ? 'A Friedman test needs at least two complete rows.' : constant)
    statistic = `${test === 'kruskal' ? 'H' : 'χ²'} = ${three(r.statistic)}, df = ${r.df}`
    p = r.p
    const n = sum(samples.map((s2) => s2.length))
    effect = test === 'kruskal' ? { name: 'η²(H)', value: (r.statistic - k + 1) / (n - k) } : { name: 'Kendall’s W', value: r.statistic / (samples[0].length * (k - 1)) }
    const pairs = wanted.map(([a, b]) => (test === 'kruskal' ? mannWhitney(samples[a], samples[b]) : signedRank(samples[a], samples[b])))
    raw = pairs.map((r2) => r2?.p ?? null)
    if (pairs.some((r2) => r2 && !r2.exact)) notes.push(APPROXIMATE)
  }
  if (!corrected) {
    // Holm's correction over the comparisons that could be worked out.
    const known = raw.flatMap((v, i) => (v === null ? [] : [{ v, i }]))
    const adjusted = holm(known.map((x) => x.v))
    known.forEach((x, j) => (raw[x.i] = adjusted[j]))
  }
  const pairs = wanted.map(([a, b], i) => ({ a, b, p: raw[i], ...(diffs[i] ? { diff: diffs[i]! } : {}) }))
  return { ok: true, result: { test, statistic, p, pairs, pairMethod: pairMethod(test, design.versusFirst), notes, ...(effect && Number.isFinite(effect.value) ? { effect } : {}), ...(intervals ? { intervals } : {}) } }
}

// ---------- effect sizes and intervals ----------
//
// Beside every p value, a measure of how large the effect is, each under a definition that can be
// named: two separate groups Hedges' g (the difference of means in pooled standard deviations,
// with Hedges' exact correction for small samples), the same samples Cohen's d_z (the mean change
// in standard deviations of the change), ranks the rank-biserial correlation (from −1 to 1: the
// share of pairs of values in which the second group is higher, less the share in which it is
// lower), several groups η² (the share of the scatter that lies between the groups; partial η²
// for the same samples), η²(H) after Kruskal–Wallis and Kendall's W after Friedman (as R's rstatix
// gives them). Differences of means come with their 95 % confidence interval: the t test's own for
// two groups, Tukey's or Dunnett's simultaneous intervals after a one-way ANOVA, and the paired t
// test's after a repeated-measures ANOVA. tests/effect-sizes.test.ts pins every one to R.

/** What each measure of effect size is, in one sentence, for the panel. */
export const EFFECT_DOES: Record<string, string> = {
  'Hedges’ g': 'the difference of the two means in pooled standard deviations, corrected for small samples (0.2 is often called small, 0.5 medium, 0.8 large)',
  'Cohen’s d_z': 'the mean change from the first group to the second in standard deviations of the change',
  'rank-biserial r': 'from −1 to 1: how often a value of the second group is higher than one of the first, less how often it is lower (0: as often)',
  'η²': 'the share of all the scatter that lies between the groups (0 to 1)',
  'partial η²': 'the share of the scatter left within samples that lies between the groups (0 to 1)',
  'η²(H)': 'the share of the scatter in ranks that lies between the groups, from the Kruskal–Wallis statistic',
  'Kendall’s W': 'from 0 to 1: how far the samples agree in the order they put the groups in',
}

/** How each measure is defined, in the words of a methods section. */
export const EFFECT_METHODS: Record<string, string> = {
  'Hedges’ g': 'difference of means over the pooled standard deviation, with Hedges’ exact small-sample correction',
  'Cohen’s d_z': 'mean change over the standard deviation of the changes',
  'rank-biserial r': 'share of pairs of values in which the second group is higher less the share in which it is lower',
  'η²': 'sum of squares between groups over the total sum of squares',
  'partial η²': 'sum of squares between groups over itself and the residual sum of squares',
  'η²(H)': '(H − k + 1)/(n − k), as kruskal_effsize of the R package rstatix',
  'Kendall’s W': 'χ²/(n(k − 1)), as friedman_effsize of the R package rstatix',
}

const around = (estimate: number, half: number): Difference | null => (Number.isFinite(half) ? { estimate, lower: estimate - half, upper: estimate + half } : null)

/** The mean of `y` less that of `x` with the 95 % interval of Welch's t test (R: t.test(y, x)$conf.int). */
function welchInterval(x: number[], y: number[]): Difference | null {
  const [vx, vy] = [variance(x) / x.length, variance(y) / y.length]
  const df = (vx + vy) ** 2 / (vx ** 2 / (x.length - 1) + vy ** 2 / (y.length - 1))
  return around(mean(y) - mean(x), tCritical(0.05, df) * Math.sqrt(vx + vy))
}

/** The mean change from `x` to `y`, row by row, with the 95 % interval of the paired t test. */
function pairedInterval(x: number[], y: number[]): Difference | null {
  const d = y.map((v, i) => v - x[i])
  if (d.length < 2) return null
  return around(mean(d), tCritical(0.05, d.length - 1) * Math.sqrt(variance(d) / d.length))
}

/** Hedges' g of `y` against `x`, with the exact correction J = Γ(df/2) / (√(df/2) Γ((df − 1)/2)). */
function hedgesG(x: number[], y: number[]): EffectSize | null {
  const df = x.length + y.length - 2
  const sd = Math.sqrt((squares(x) + squares(y)) / df)
  if (!(sd > 0) || df < 2) return null
  const j = Math.exp(logGamma(df / 2) - 0.5 * Math.log(df / 2) - logGamma((df - 1) / 2))
  return { name: 'Hedges’ g', value: ((mean(y) - mean(x)) / sd) * j }
}

/** Cohen's d_z: the mean change from `x` to `y` over the standard deviation of the changes. */
function dz(x: number[], y: number[]): EffectSize | null {
  const d = y.map((v, i) => v - x[i])
  const sd = Math.sqrt(variance(d))
  return sd > 0 ? { name: 'Cohen’s d_z', value: mean(d) / sd } : null
}

/** The matched-pairs rank-biserial correlation of the change from the first group to the second, from V of `signedRank` (on first − second) over `n` rows with a change. */
const pairedRankBiserial = (v: number, n: number): number => {
  const all = (n * (n + 1)) / 2
  return (all - 2 * v) / all
}

/** η² (partial η² for the same samples) from an F test: F·df1 / (F·df1 + df2). */
const etaSquared = (r: FResult): number => (r.f * r.df1) / (r.f * r.df1 + r.df2)

/** Every group less the first, with Dunnett's simultaneous 95 % intervals (R: confint of multcomp's glht with mcp "Dunnett"). */
function dunnettIntervals(groups: number[][], anova: FResult): (Difference | null)[] {
  const control = groups[0]
  const others = groups.slice(1)
  const d = dunnettCritical(0.05, others.map((g) => Math.sqrt(g.length / (g.length + control.length))), anova.df2)
  return others.map((g) => around(mean(g) - mean(control), d * Math.sqrt(anova.error * (1 / g.length + 1 / control.length))))
}

/** An effect size in words: "Hedges’ g = 1.23". */
export const effectText = (e: EffectSize): string => `${e.name} = ${three(e.value)}`

/** A difference with its interval in words: "1.6 (95 % interval 0.52 to 2.7)". */
export const differenceText = (d: Difference): string => `${three(d.estimate)} (95 % interval ${three(d.lower)} to ${three(d.upper)})`

// ---------- writing a p value ----------

/** A p value as it is written in a figure: "p = 0.012", "p < 0.0001". */
export function pText(p: number): string {
  if (!Number.isFinite(p)) return 'p = ?'
  if (p < 0.0001) return 'p < 0.0001'
  if (p > 0.9999) return 'p > 0.9999'
  // Three significant digits, four decimals at most: 0.0496 stays below 0.05.
  return `p = ${Number(Number(p.toPrecision(3)).toFixed(4))}`
}

/** Stars for a p value, by the common convention: ns from 0.05, * below 0.05, ** below 0.01, *** below 0.001, **** below 0.0001. */
export function stars(p: number): string {
  if (!Number.isFinite(p)) return '?'
  return p < 0.0001 ? '****' : p < 0.001 ? '***' : p < 0.01 ? '**' : p < 0.05 ? '*' : 'ns'
}

export const STARS_KEY = 'ns: p ≥ 0.05; *: p < 0.05; **: p < 0.01; ***: p < 0.001; ****: p < 0.0001'

// ---------- advice: which test fits this table ----------

export interface Advice {
  /** The test suggested; null when nothing can be tested. */
  test: TestId | null
  by: Compare | null
  /** What the test does. */
  does: string
  /** Why it fits this table: one sentence per reason. */
  why: string[]
  /** What to keep in mind with these data. */
  cautions: string[]
}

/** The binomial coefficient, for small numbers. */
function choose(n: number, k: number): number {
  let c = 1
  for (let i = 1; i <= k; i++) c = (c * (n - k + i)) / i
  return c
}

/**
 * What is left of every value after its group (and, in a paired design, its sample) is taken
 * out: the scatter a test on means assumes to be normal.
 */
export function residuals(samples: number[][], paired: boolean): number[] {
  if (!paired) return samples.filter((s) => s.length > 1).flatMap((s) => s.map((v) => v - mean(s)))
  if (samples.length === 2) return samples[0].map((v, i) => tidy(v - samples[1][i]))
  const n = samples[0]?.length ?? 0
  const grand = mean(samples.flat())
  const rows = Array.from({ length: n }, (_, i) => mean(samples.map((s) => s[i])))
  return samples.flatMap((s) => s.map((v, i) => v - mean(s) - rows[i] + grand))
}

/**
 * Look at a table and say which test fits, and why. `samples` are the groups as they would be
 * tested (for a paired design: complete rows only), `names` their names.
 *
 * The rule: the design (two or several groups, paired or not) decides the family of test; means
 * are compared unless the scatter of the values speaks against a normal distribution
 * (Shapiro-Wilk test on the residuals, p below 0.05), in which case ranks are compared.
 */
export function suggest(names: string[], samples: number[][], design: { paired: boolean; versusFirst: boolean }): Advice {
  const k = samples.length
  const nothing = (reason: string): Advice => ({ test: null, by: null, does: '', why: [reason], cautions: [] })
  if (k < 2) return nothing('A test compares groups: this table has fewer than two groups with values.')
  const sizes = samples.map((s) => s.length)
  const least = Math.min(...sizes)
  if (design.paired && least < 2) return nothing('A paired test needs at least two rows with a value in every group.')
  if (!design.paired && least < 2) return nothing(`A test needs at least two values in every group; “${names[sizes.indexOf(least)]}” has ${least}.`)

  const why: string[] = []
  const cautions: string[] = []
  const most = Math.max(...sizes)
  const listed = k <= 4 ? ` (${names.map((name, i) => `${name}, n = ${sizes[i]}`).join('; ')})` : ` with ${least === most ? least : `${least} to ${most}`} values each`
  why.push(design.paired ? `The table has ${k === 2 ? 'two' : k} groups with ${least} complete ${least === 1 ? 'row' : 'rows'}.` : `The table has ${k === 2 ? 'two' : k} groups${listed}.`)
  why.push(
    design.paired
      ? 'You said that each row is one sample measured in every group, so the test looks at the changes within rows, not at the differences between samples.'
      : 'The groups hold separate samples: values that happen to stand in the same row have nothing to do with each other.',
  )

  const rest = residuals(samples, design.paired)
  const normal = shapiroWilk(rest)
  const what = design.paired && k === 2 ? 'differences between the two values of each row' : design.paired ? 'values, once the differences between samples and between groups are taken out,' : 'values around the mean of their group'
  let by: Compare = 'means'
  if (normal && normal.p < 0.05) {
    by = 'ranks'
    why.push(`The ${what} do not scatter like a normal distribution (Shapiro–Wilk test, ${pText(normal.p)}): they are skewed or hold extreme values. A test on ranks does not depend on the shape of the distribution.`)
  } else if (normal) {
    why.push(`The ${what} scatter the way a normal distribution would (Shapiro–Wilk test, ${pText(normal.p)}), so means describe the groups well and a test on means has the most power.`)
    if (least < 8) cautions.push(`With ${least} ${design.paired ? 'rows' : least === most ? 'values in each group' : 'values in the smallest group'} that check can only catch a gross departure from a normal distribution. Also go by what is known about this kind of measurement.`)
  } else {
    why.push('There are too few different values to check how they are distributed, so the usual test on means is suggested.')
    cautions.push('Go by what is known about this kind of measurement: if it is usually skewed, compare ranks.')
  }

  const test = testFor(k, by, design.paired)
  if (k > 2) {
    why.push(`With more than two groups one overall test comes first. Pairs of groups are then compared with p values corrected for the number of comparisons (${pairMethod(test, design.versusFirst)}).`)
  }

  // A rank test on very few values cannot give a small p whatever the values are.
  if (test === 'mannWhitney' || test === 'signedRank') {
    const floor = test === 'mannWhitney' ? 2 / choose(sizes[0] + sizes[1], sizes[0]) : 2 / 2 ** least
    if (floor > 0.05) cautions.push(`With so few values this test cannot give a p value below ${three(floor)}, whatever the values are. More samples are needed to show a difference with it.`)
  }
  // An analysis of variance assumes that the groups scatter about equally.
  if (test === 'anova') {
    const sds = samples.map((s) => Math.sqrt(variance(s)))
    const [low, high] = [Math.min(...sds), Math.max(...sds)]
    if (high > 3 * low) cautions.push(`The groups scatter very differently (standard deviations from ${three(low)} to ${three(high)}), which an analysis of variance does not allow for. If the scatter grows with the mean, logarithms of the values are often compared instead; otherwise compare ranks.`)
  }
  return { test, by, does: TEST_DOES[test], why, cautions }
}
