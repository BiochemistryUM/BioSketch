// The probability distributions behind the statistical tests: Student's t, F, chi-squared, the
// normal distribution and its inverse, the studentized range (for Tukey's test), and the exact
// distributions of the two Wilcoxon statistics. Every function is pinned in
// tests/distributions.test.ts to the value R gives (pt, pf, pchisq, pnorm, qnorm, ptukey,
// pwilcox, psignrank).
//
// Method, for whoever checks it: the incomplete beta and gamma functions by their series and
// continued fractions (Lentz's method), the logarithm of the gamma function by Lanczos's
// approximation, and the studentized range by Gauss-Legendre integration of its definition.

const TINY = 1e-300
const EPS = 1e-15

const LANCZOS = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]

/** The natural logarithm of the gamma function, for x above zero. */
export function logGamma(x: number): number {
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x)
  const z = x - 1
  let sum = LANCZOS[0]
  for (let i = 1; i < LANCZOS.length; i++) sum += LANCZOS[i] / (z + i)
  const t = z + 7.5
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(sum)
}

/** Continued fraction of the incomplete beta function. */
function betaFraction(a: number, b: number, x: number): number {
  const fix = (v: number): number => (Math.abs(v) < TINY ? TINY : v)
  let c = 1
  let d = 1 / fix(1 - ((a + b) * x) / (a + 1))
  let h = d
  for (let m = 1; m <= 20000; m++) {
    const m2 = 2 * m
    let step = (m * (b - m) * x) / ((a - 1 + m2) * (a + m2))
    d = 1 / fix(1 + step * d)
    c = fix(1 + step / c)
    h *= d * c
    step = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + 1 + m2))
    d = 1 / fix(1 + step * d)
    c = fix(1 + step / c)
    const change = d * c
    h *= change
    if (Math.abs(change - 1) < EPS) break
  }
  return h
}

/** The regularised incomplete beta function I_x(a, b): 0 at x = 0, 1 at x = 1. */
export function incompleteBeta(x: number, a: number, b: number): number {
  if (!(x > 0)) return 0
  if (x >= 1) return 1
  const front = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log1p(-x))
  return x < (a + 1) / (a + b + 2) ? (front * betaFraction(a, b, x)) / a : 1 - (front * betaFraction(b, a, 1 - x)) / b
}

/** The upper regularised incomplete gamma function Q(a, x): 1 at x = 0, falling to 0. */
export function upperGamma(a: number, x: number): number {
  if (!(x > 0)) return 1
  const front = Math.exp(-x + a * Math.log(x) - logGamma(a))
  if (x < a + 1) {
    // Series for the lower function.
    let term = 1 / a
    let sum = term
    for (let n = 1; n <= 20000; n++) {
      term *= x / (a + n)
      sum += term
      if (Math.abs(term) < Math.abs(sum) * EPS) break
    }
    return 1 - sum * front
  }
  let b = x + 1 - a
  let c = 1 / TINY
  let d = 1 / b
  let h = d
  for (let i = 1; i <= 20000; i++) {
    const an = -i * (i - a)
    b += 2
    d = an * d + b
    if (Math.abs(d) < TINY) d = TINY
    c = b + an / c
    if (Math.abs(c) < TINY) c = TINY
    d = 1 / d
    const change = d * c
    h *= change
    if (Math.abs(change - 1) < EPS) break
  }
  return front * h
}

/** Two-sided p value of Student's t: the chance of a value at least as far from zero as `t`. */
export function tTwoSided(t: number, df: number): number {
  if (!Number.isFinite(t)) return Number.isNaN(t) ? NaN : 0
  return incompleteBeta(df / (df + t * t), df / 2, 0.5)
}

/**
 * How far from zero a t statistic must lie for a two-sided p value of `alpha`: the factor a
 * confidence interval multiplies a standard error by (0.05 gives the 95 % interval; R: qt(0.975, df)).
 */
export function tCritical(alpha: number, df: number): number {
  if (!(alpha > 0 && alpha < 1) || !(df > 0)) return NaN
  let lo = 0
  let hi = 1
  while (tTwoSided(hi, df) > alpha && hi < 1e12) hi *= 2
  for (let i = 0; i < 200 && hi - lo > 1e-13 * Math.max(1, hi); i++) {
    const mid = (lo + hi) / 2
    if (tTwoSided(mid, df) > alpha) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/** Upper tail of the F distribution: the chance of a ratio of at least `f`. */
export function fUpper(f: number, df1: number, df2: number): number {
  if (!(f > 0)) return 1
  if (!Number.isFinite(f)) return 0
  return incompleteBeta(df2 / (df2 + df1 * f), df2 / 2, df1 / 2)
}

/** Upper tail of the chi-squared distribution. */
export const chiSquaredUpper = (x: number, df: number): number => upperGamma(df / 2, x / 2)

/** The normal distribution: the chance of a value below `z` (in standard deviations from the mean). */
export function normalBelow(z: number): number {
  const tail = 0.5 * upperGamma(0.5, (z * z) / 2)
  return z < 0 ? tail : 1 - tail
}

const density = (z: number): number => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI)

/** The inverse of `normalBelow`: the value below which a share `p` of a normal distribution lies. */
export function normalQuantile(p: number): number {
  if (!(p > 0)) return -Infinity
  if (p >= 1) return Infinity
  if (p === 0.5) return 0
  // The lower half is solved (tails keep their precision there) and mirrored.
  const q = Math.min(p, 1 - p)
  const t = Math.sqrt(-2 * Math.log(q))
  // A first guess good to about 0.0005 (Abramowitz and Stegun 26.2.23), then Newton steps with Halley's correction.
  let x = -(t - (2.515517 + 0.802853 * t + 0.010328 * t * t) / (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t))
  for (let i = 0; i < 60; i++) {
    const error = normalBelow(x) - q
    const step = error / density(x)
    const next = x - step / (1 + (x * step) / 2)
    if (Math.abs(next - x) < 1e-15 * Math.max(1, Math.abs(x))) {
      x = next
      break
    }
    x = next
  }
  return p < 0.5 ? x : -x
}

// ---------- the studentized range ----------

/** Positions and weights of Gauss-Legendre integration with `n` points on -1..1. */
function gaussLegendre(n: number): { at: number[]; weight: number[] } {
  const at: number[] = []
  const weight: number[] = []
  for (let i = 0; i < n; i++) {
    let x = Math.cos((Math.PI * (i + 0.75)) / (n + 0.5))
    let slope = 1
    for (let pass = 0; pass < 100; pass++) {
      let p0 = 1
      let p1 = x
      for (let k = 2; k <= n; k++) [p0, p1] = [p1, ((2 * k - 1) * x * p1 - (k - 1) * p0) / k]
      slope = (n * (x * p1 - p0)) / (x * x - 1)
      const dx = p1 / slope
      x -= dx
      if (Math.abs(dx) < 1e-16) break
    }
    at.push(x)
    weight.push(2 / ((1 - x * x) * slope * slope))
  }
  return { at, weight }
}

const GL = gaussLegendre(8)

/** The integral of `f` from `a` to `b`, cut into `panels` equal parts with eight points each. */
function integrate(f: (x: number) => number, a: number, b: number, panels: number): number {
  const width = (b - a) / panels
  let total = 0
  for (let p = 0; p < panels; p++) {
    const mid = a + (p + 0.5) * width
    for (let i = 0; i < GL.at.length; i++) total += GL.weight[i] * f(mid + (GL.at[i] * width) / 2)
  }
  return (total * width) / 2
}

/** Beyond this many standard deviations a normal distribution holds less than 1e-16 of its values. */
const REACH = 8.5
/** Where the range of normal values is worked out: one part per standard deviation. */
const Z_GRID: { z: number; weight: number; below: number }[] = []
for (let p = 0; p < 2 * REACH; p++) {
  for (let i = 0; i < GL.at.length; i++) {
    const z = -REACH + p + 0.5 + GL.at[i] / 2
    Z_GRID.push({ z, weight: (GL.weight[i] / 2) * density(z), below: normalBelow(z) })
  }
}

/** The chance that the largest and smallest of `k` standard normal values lie less than `w` apart. */
export function normalRangeBelow(w: number, k: number): number {
  if (!(w > 0)) return 0
  let total = 0
  for (const g of Z_GRID) total += g.weight * (g.below - normalBelow(g.z - w)) ** (k - 1)
  return Math.min(1, k * total)
}

/**
 * Upper tail of the studentized range: the chance that the range of `k` group means, in units of
 * their standard error estimated with `df` degrees of freedom, is at least `q`. As R's
 * `ptukey(q, k, df, lower.tail = FALSE)`; like R, it gives nothing (NaN) below two degrees of freedom.
 *
 * The standard error is s times its true value, where df × s² follows a chi-squared distribution;
 * the chance is the integral over s of (1 − chance that the range of normal values is below q × s).
 */
export function studentizedRangeUpper(q: number, k: number, df: number): number {
  if (!(df >= 2) || !(k >= 2) || Number.isNaN(q)) return NaN
  if (!(q > 0)) return 1
  if (!Number.isFinite(q)) return 0
  // s lies between these with a chance of all but 1e-16 (Laurent and Massart's bounds).
  const far = 37
  const low = Math.sqrt(Math.max(0, 1 - 2 * Math.sqrt(far / df)))
  const high = Math.sqrt(1 + 2 * Math.sqrt(far / df) + (2 * far) / df)
  // Beyond a range of 2 × REACH standard deviations the normal range is certain to be smaller.
  const end = Math.min(high, (2 * REACH) / q)
  if (end <= low) return 0
  const logFront = (df / 2) * Math.log(df) - logGamma(df / 2) - (df / 2 - 1) * Math.LN2
  const f = (s: number): number => (s > 0 ? Math.exp(logFront + (df - 1) * Math.log(s) - (df * s * s) / 2) * (1 - normalRangeBelow(q * s, k)) : 0)
  // Parts narrow enough for both the spread of s and the rise of the normal range.
  const width = Math.min(1 / q, 0.7 / Math.sqrt(df))
  const panels = Math.min(400, Math.max(4, Math.ceil((end - low) / width)))
  return Math.min(1, Math.max(0, integrate(f, low, end, panels)))
}

// ---------- exact distributions of the Wilcoxon statistics ----------

const rankSums = new Map<string, number[]>()

/**
 * For two groups of `m` and `n` values without ties: how many of the ways to share out the ranks
 * give each value of the Mann-Whitney statistic (0 to m × n). Additions only, so the counts stay
 * as exact as R's.
 */
function rankSumCounts(m: number, n: number): number[] {
  const key = `${m},${n}`
  const known = rankSums.get(key)
  if (known) return known
  // ways[c][s]: choices of c ranks out of those seen so far that add up to s.
  const top = (m * (2 * (m + n) - m + 1)) / 2
  const ways = Array.from({ length: m + 1 }, () => new Float64Array(top + 1))
  ways[0][0] = 1
  for (let rank = 1; rank <= m + n; rank++) {
    for (let c = Math.min(m, rank); c >= 1; c--) {
      const from = ways[c - 1]
      const to = ways[c]
      for (let s = top; s >= rank; s--) to[s] += from[s - rank]
    }
  }
  const least = (m * (m + 1)) / 2
  const counts = Array.from({ length: m * n + 1 }, (_, u) => ways[m][least + u])
  rankSums.set(key, counts)
  return counts
}

/** Two-sided exact p value of the Mann-Whitney statistic `w` for groups of `m` and `n` values without ties, as R's `wilcox.test`. */
export function rankSumTwoSided(w: number, m: number, n: number): number {
  const counts = rankSumCounts(m, n)
  const total = counts.reduce((a, b) => a + b, 0)
  let tail = 0
  if (w > (m * n) / 2) for (let u = Math.ceil(w - 1e-9); u <= m * n; u++) tail += counts[u]
  else for (let u = 0; u <= Math.floor(w + 1e-9); u++) tail += counts[u]
  return Math.min(1, (2 * tail) / total)
}

/** The chance of a Mann-Whitney statistic of at most `w`: R's `pwilcox(w, m, n)`. */
export function rankSumBelow(w: number, m: number, n: number): number {
  const counts = rankSumCounts(m, n)
  let tail = 0
  for (let u = 0; u <= Math.min(m * n, Math.floor(w + 1e-9)); u++) tail += counts[u]
  return tail / counts.reduce((a, b) => a + b, 0)
}

const signedRanks = new Map<number, Float64Array>()

/** For `n` differences without ties: how many of the 2^n patterns of signs give each sum of positive ranks. */
function signedRankCounts(n: number): Float64Array {
  const known = signedRanks.get(n)
  if (known) return known
  const top = (n * (n + 1)) / 2
  const counts = new Float64Array(top + 1)
  counts[0] = 1
  for (let rank = 1; rank <= n; rank++) for (let s = top; s >= rank; s--) counts[s] += counts[s - rank]
  signedRanks.set(n, counts)
  return counts
}

/** The chance of a signed-rank statistic of at most `v`: R's `psignrank(v, n)`. */
export function signedRankBelow(v: number, n: number): number {
  const counts = signedRankCounts(n)
  let tail = 0
  for (let s = 0; s <= Math.min(counts.length - 1, Math.floor(v + 1e-9)); s++) tail += counts[s]
  return tail / 2 ** n
}

/** Two-sided exact p value of the signed-rank statistic `v` for `n` differences without ties or zeros, as R's `wilcox.test`. */
export function signedRankTwoSided(v: number, n: number): number {
  const counts = signedRankCounts(n)
  let tail = 0
  if (v > (n * (n + 1)) / 4) for (let s = Math.ceil(v - 1e-9); s < counts.length; s++) tail += counts[s]
  else for (let s = 0; s <= Math.floor(v + 1e-9); s++) tail += counts[s]
  return Math.min(1, (2 * tail) / 2 ** n)
}

// ---------- Dunnett's distribution ----------

/**
 * Dunnett's test: the two-sided p value of a comparison of one group with the control when `k`
 * groups are each compared with it. `t` is the t statistic of the comparison (spread pooled over
 * all groups, `df` degrees of freedom) and `lambdas` has one entry per comparison,
 * sqrt(n_i / (n_i + n_0)) for a group of n_i values and a control of n_0. The p value is the chance
 * that the largest of the k statistics is at least `t` when no group differs from the control.
 *
 * The statistics share the control and the pooled spread, and no more: given the mean of the
 * control and the spread they are independent, so the chance is an integral over those two
 * (the form Dunnett gave; R: multcomp's glht with mcp("Dunnett"), which integrates by simulation).
 */
export function dunnettUpper(t: number, lambdas: number[], df: number): number {
  if (!Number.isFinite(t) || !(df > 0) || !lambdas.length) return NaN
  const a = Math.abs(t)
  const roots = lambdas.map((l) => Math.sqrt(Math.max(1e-12, 1 - l * l)))
  /** All statistics within ±a, given the spread (as a share u of its true value). */
  const within = (u: number): number =>
    integrate(
      (z) => {
        let all = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI)
        for (let i = 0; i < lambdas.length && all > 0; i++) all *= normalBelow((lambdas[i] * z + a * u) / roots[i]) - normalBelow((lambdas[i] * z - a * u) / roots[i])
        return all
      },
      -9,
      9,
      18,
    )
  // The spread: u² · df follows a chi-squared distribution with df degrees of freedom.
  const logNorm = Math.log(2) + (df / 2) * Math.log(df / 2) - logGamma(df / 2)
  const density = (u: number): number => (u > 0 ? Math.exp(logNorm + (df - 1) * Math.log(u) - (df * u * u) / 2) : 0)
  // With many degrees of freedom the spread is known as good as exactly.
  if (df > 2e5) return Math.min(1, Math.max(0, 1 - within(1)))
  const sd = 1 / Math.sqrt(2 * df)
  const lo = Math.max(0, 1 - 12 * sd)
  const hi = df < 3 ? 1 + 40 * sd : 1 + 14 * sd
  const inside = integrate((u) => within(u) * density(u), lo, hi, 36)
  return Math.min(1, Math.max(0, 1 - inside))
}

/** The value at which a falling upper tail `upper` reaches `alpha`, by halving (`upper` must fall from 1 at 0 towards 0). */
function criticalOf(upper: (q: number) => number, alpha: number): number {
  let lo = 0
  let hi = 2
  while (upper(hi) > alpha && hi < 1e6) hi *= 2
  for (let i = 0; i < 80 && hi - lo > 1e-10 * hi; i++) {
    const mid = (lo + hi) / 2
    if (upper(mid) > alpha) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/** The studentized range that `k` means exceed with a chance of `alpha` (R: `qtukey(1 - alpha, k, df)`): Tukey's intervals use it. */
export const studentizedRangeCritical = (alpha: number, k: number, df: number): number => (df >= 2 && k >= 2 ? criticalOf((q) => studentizedRangeUpper(q, k, df), alpha) : NaN)

/** The largest of Dunnett's statistics that is exceeded with a chance of `alpha`: Dunnett's simultaneous intervals use it. */
export const dunnettCritical = (alpha: number, lambdas: number[], df: number): number => (df > 0 && lambdas.length ? criticalOf((t) => dunnettUpper(t, lambdas, df), alpha) : NaN)
