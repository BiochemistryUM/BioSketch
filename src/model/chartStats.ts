// The statistics behind box plots, violin plots and fitted lines. Scientists publish these
// plots, so every definition is stated and matches a widely used default; the tests pin each one
// to values worked out in R.
//
//  - Quartiles: linear interpolation between order statistics (R's `quantile` type 7, also the
//    default of NumPy and of QUARTILE.INC in spreadsheets).
//  - Whiskers: Tukey's rule. Each whisker ends at the furthest value within 1.5 times the
//    interquartile range of the box; values beyond are outliers, drawn as separate points.
//  - Violin: a Gaussian kernel density estimate with Silverman's rule-of-thumb bandwidth
//    (R's `bw.nrd0`, the default of `density`).
//  - Fitted line: ordinary least squares of y on x, with the coefficient of determination R².

import { fUpper, tTwoSided, tCritical } from './distributions'

/** The `p` quantile (0 to 1) of values that are already sorted in ascending order. */
export function quantile(sorted: number[], p: number): number {
  const n = sorted.length
  if (!n) return NaN
  const h = (n - 1) * Math.min(1, Math.max(0, p))
  const lo = Math.floor(h)
  const hi = Math.min(n - 1, lo + 1)
  return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo])
}

export interface BoxStats {
  n: number
  q1: number
  median: number
  q3: number
  /** Where the whiskers end: the furthest values within 1.5 × IQR of the box. */
  whiskerLow: number
  whiskerHigh: number
  /** Values beyond the whiskers, in ascending order. */
  outliers: number[]
}

/** The five numbers of a box plot and its outliers; null when there are no values. */
export function boxStats(values: number[]): BoxStats | null {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b)
  const n = sorted.length
  if (!n) return null
  const q1 = quantile(sorted, 0.25)
  const q3 = quantile(sorted, 0.75)
  const reach = 1.5 * (q3 - q1)
  // A value exactly on a fence belongs to the whisker. The fences are sums of decimal fractions,
  // so "exactly" needs a hair of tolerance (2.6 against 3.65 - 1.05 = 2.5999999999999996).
  const hair = 1e-9 * Math.max(Math.abs(q1), Math.abs(q3), q3 - q1)
  const low = q1 - reach - hair
  const high = q3 + reach + hair
  const inside = sorted.filter((v) => v >= low && v <= high)
  return {
    n,
    q1,
    median: quantile(sorted, 0.5),
    q3,
    // With every value inside the fences the whiskers are simply the smallest and largest value.
    whiskerLow: inside.length ? inside[0] : q1,
    whiskerHigh: inside.length ? inside[inside.length - 1] : q3,
    outliers: sorted.filter((v) => v < low || v > high),
  }
}

/** Standard deviation of the sample (n − 1); 0 with fewer than two values. */
function sampleSd(values: number[]): number {
  const n = values.length
  if (n < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / n
  return Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1))
}

/**
 * Silverman's rule-of-thumb bandwidth: 0.9 × min(SD, IQR / 1.34) × n^(−1/5). When the spread
 * is zero it falls back the way R does (to the SD, then to the size of the first value, then to 1),
 * so a density can always be drawn.
 */
export function bandwidth(values: number[]): number {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b)
  const n = sorted.length
  if (!n) return 1
  const sd = sampleSd(sorted)
  const iqr = quantile(sorted, 0.75) - quantile(sorted, 0.25)
  const spread = Math.min(sd, iqr / 1.34) || sd || Math.abs(values[0]) || 1
  return 0.9 * spread * n ** -0.2
}

/** The estimated density of `values` at each position in `at` (Gaussian kernel). Areas under the curve add up to 1. */
export function density(values: number[], at: number[], bw: number = bandwidth(values)): number[] {
  const n = values.length
  if (!n || !(bw > 0)) return at.map(() => 0)
  const norm = 1 / (n * bw * Math.sqrt(2 * Math.PI))
  return at.map((x) => norm * values.reduce((sum, v) => sum + Math.exp(-0.5 * ((x - v) / bw) ** 2), 0))
}

export interface Fit {
  slope: number
  intercept: number
  /** Share of the variation in y that the line accounts for, 0 to 1. */
  r2: number
  n: number
  /** The mean of x and the sum of the squared distances of every x from it. */
  meanX: number
  sxx: number
  /** The scatter of the points about the line (the residual standard error, on n − 2 degrees of freedom); null with fewer than three points. */
  scatter: number | null
}

/**
 * The least-squares straight line through the points; null when a line is not defined (fewer
 * than two points, or every x the same).
 */
export function fitLine(points: [number, number][]): Fit | null {
  const pts = points.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
  const n = pts.length
  if (n < 2) return null
  const mx = pts.reduce((a, p) => a + p[0], 0) / n
  const my = pts.reduce((a, p) => a + p[1], 0) / n
  let sxx = 0
  let sxy = 0
  let syy = 0
  for (const [x, y] of pts) {
    sxx += (x - mx) ** 2
    sxy += (x - mx) * (y - my)
    syy += (y - my) ** 2
  }
  if (!(sxx > 0)) return null
  const slope = sxy / sxx
  const left = Math.max(0, syy - slope * sxy)
  // When every y is the same the line fits exactly, although R² is formally undefined.
  return { slope, intercept: my - slope * mx, r2: syy > 0 ? (sxy * sxy) / (sxx * syy) : 1, n, meanX: mx, sxx, scatter: n > 2 ? Math.sqrt(left / (n - 2)) : null }
}

/**
 * How far above and below a fitted line its 95 % confidence band reaches at `x`: the interval in
 * which the line itself lies, not single new points (R: `predict(lm, interval = "confidence")`).
 * It is narrowest at the mean of x and widens away from it. Null with fewer than three points.
 */
export function lineBand(fit: Fit, x: number, level = 0.95): number | null {
  if (fit.scatter === null || fit.n < 3) return null
  return tCritical(1 - level, fit.n - 2) * fit.scatter * Math.sqrt(1 / fit.n + (x - fit.meanX) ** 2 / fit.sxx)
}

// ---------- correlation ----------

export interface Correlation {
  /** Pearson's r, or Spearman's rank correlation. */
  r: number
  /** Two-sided p value for "no correlation". */
  p: number
  n: number
  /** Spearman only: the p value comes from the exact distribution (up to nine points, no ties); otherwise from the t approximation. */
  exact?: boolean
}

/** Ranks from 1, equal values sharing the mean of their ranks; and whether any values are equal. */
function rankOf(values: number[]): { rank: number[]; ties: boolean } {
  const order = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v)
  const rank = new Array<number>(values.length)
  let ties = false
  for (let i = 0; i < order.length; ) {
    let j = i
    while (j + 1 < order.length && order[j + 1].v === order[i].v) j++
    if (j > i) ties = true
    for (let k = i; k <= j; k++) rank[order[k].i] = (i + j) / 2 + 1
    i = j + 1
  }
  return { rank, ties }
}

/** How often each sum of squared rank differences occurs among all orders of n ranks (n up to 9), counted once per n. */
const rankSums = new Map<number, Map<number, number>>()
function squaredDifferences(n: number): Map<number, number> {
  const known = rankSums.get(n)
  if (known) return known
  const counts = new Map<number, number>()
  const used = new Array<boolean>(n).fill(false)
  const walk = (place: number, sum: number): void => {
    if (place === n) {
      counts.set(sum, (counts.get(sum) ?? 0) + 1)
      return
    }
    for (let r = 0; r < n; r++) {
      if (used[r]) continue
      used[r] = true
      walk(place + 1, sum + (r - place) ** 2)
      used[r] = false
    }
  }
  walk(0, 0)
  rankSums.set(n, counts)
  return counts
}

/**
 * How closely two measurements go together across the points [x, y], with the two-sided test of
 * "no correlation", as R's `cor.test` gives it.
 *  - Pearson's r: a straight-line relation; p from the t distribution with n − 2 degrees of freedom.
 *  - Spearman's rank correlation: any relation that only rises or only falls. With up to nine
 *    points and no equal values the p value is exact; otherwise it comes from the t approximation
 *    (R: `exact = FALSE`; R's default for more points without ties is a series approximation that
 *    differs from it in the third digit).
 * Null with fewer than three points, or when x or y does not vary.
 */
export function correlation(points: [number, number][], method: 'pearson' | 'spearman'): Correlation | null {
  const pts = points.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
  const n = pts.length
  if (n < 3) return null
  let xs = pts.map((p) => p[0])
  let ys = pts.map((p) => p[1])
  let ties = false
  if (method === 'spearman') {
    const [rx, ry] = [rankOf(xs), rankOf(ys)]
    ties = rx.ties || ry.ties
    xs = rx.rank
    ys = ry.rank
  }
  const mx = xs.reduce((a, v) => a + v, 0) / n
  const my = ys.reduce((a, v) => a + v, 0) / n
  let sxx = 0
  let sxy = 0
  let syy = 0
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - mx) ** 2
    sxy += (xs[i] - mx) * (ys[i] - my)
    syy += (ys[i] - my) ** 2
  }
  if (!(sxx > 0) || !(syy > 0)) return null
  const r = Math.max(-1, Math.min(1, sxy / Math.sqrt(sxx * syy)))
  const approximate = (): number => (Math.abs(r) >= 1 ? 0 : tTwoSided(r * Math.sqrt((n - 2) / (1 - r * r)), n - 2))
  if (method === 'pearson') return { r, p: approximate(), n }
  if (ties || n > 9) return { r, p: approximate(), n, exact: false }
  // Exact: the share of all orders of the ranks whose sum of squared differences is at least as
  // far to the same side as the one observed, doubled.
  const d = Math.round(xs.reduce((a, v, i) => a + (v - ys[i]) ** 2, 0))
  const counts = squaredDifferences(n)
  let total = 0
  let below = 0
  let above = 0
  for (const [sum, count] of counts) {
    total += count
    if (sum <= d) below += count
    if (sum >= d) above += count
  }
  const middle = (n ** 3 - n) / 6
  return { r, p: Math.min(1, (2 * (d > middle ? above : below)) / total), n, exact: true }
}

// ---------- dose-response curve ----------

/**
 * A dose-response curve with four parameters (the "four-parameter logistic", in GraphPad Prism
 * "log(agonist) vs. response, variable slope"): the response moves from one plateau to the other
 * along the logarithm of the dose,
 *
 *     y = bottom + (top − bottom) / (1 + 10^((logEc50 − log10 x) × hill))
 *
 * fitted by least squares. It is the curve R fits with nls(y ~ SSfpl(log10(x), A, B, xmid, scal)),
 * where hill = 1 / (scal × ln 10); tests pin the fit and its standard error to R.
 */
export interface DoseFit {
  /** The lower and the upper plateau, in the units of y. */
  bottom: number
  top: number
  /** log10 of the dose that gives the response halfway between the plateaus: the EC50, or the IC50 of a falling curve. */
  logEc50: number
  /** Steepness at the middle: above zero for a curve that rises with the dose, below zero for one that falls. */
  hill: number
  /** Share of the variation in y that the curve accounts for. */
  r2: number
  n: number
  /** Standard error of `logEc50` from the fit (asymptotic, as R's `summary(nls)` gives it); null when it cannot be worked out. */
  seLogEc50: number | null
  /** Points minus fitted parameters: the degrees of freedom of what is left over. */
  df: number
}

/** The response the curve gives at a dose, from the logarithm (base 10) of the dose. */
export const doseResponseAt = (f: Pick<DoseFit, 'bottom' | 'top' | 'logEc50' | 'hill'>, logDose: number): number =>
  f.bottom + (f.top - f.bottom) / (1 + 10 ** ((f.logEc50 - logDose) * f.hill))

/** Solve the linear system `a x = b` (Gaussian elimination with pivoting); null when it has no single answer. */
export function solve(a: number[][], b: number[]): number[] | null {
  const n = b.length
  const m = a.map((row, i) => [...row, b[i]])
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let row = col + 1; row < n; row++) if (Math.abs(m[row][col]) > Math.abs(m[pivot][col])) pivot = row
    if (!(Math.abs(m[pivot][col]) > 1e-300)) return null
    ;[m[col], m[pivot]] = [m[pivot], m[col]]
    for (let row = col + 1; row < n; row++) {
      const k = m[row][col] / m[col][col]
      for (let j = col; j <= n; j++) m[row][j] -= k * m[col][j]
    }
  }
  const x = new Array<number>(n).fill(0)
  for (let row = n - 1; row >= 0; row--) {
    let v = m[row][n]
    for (let j = row + 1; j < n; j++) v -= m[row][j] * x[j]
    x[row] = v / m[row][row]
  }
  return x.every(Number.isFinite) ? x : null
}

/** Plateaus held at a value the scientist states (a response known to start at 0, or to end at 100 %) instead of being fitted. */
export interface DoseHeld {
  bottom?: number
  top?: number
}

/** One curve of a fit: its points, and where its four parameters stand in the list of fitted ones (-1 = held at `value`). */
interface CurvePlan {
  pts: [number, number][]
  at: [bottom: number, top: number, middle: number, slope: number]
  value: [number, number, number, number]
}

/**
 * Least squares for one or several dose-response curves at once (Levenberg-Marquardt). `plans`
 * say which parameters are fitted and which are shared between curves; `start` is where the search
 * begins. Returns where it came to rest, the misfit left, and JᵀJ there; null when it does not
 * come to rest at a least-squares solution.
 */
function settle(plans: CurvePlan[], start: number[], total: number): { q: number[]; sse: number; jtj: number[][] } | null {
  const k = start.length
  const full = (plan: CurvePlan, q: number[]): number[] => plan.at.map((i, j) => (i < 0 ? plan.value[j] : q[i]))
  const share = (p: number[], lx: number): number => 1 / (1 + Math.exp(Math.LN10 * p[3] * (p[2] - lx)))
  const cost = (q: number[]): number =>
    plans.reduce((sum, plan) => {
      const p = full(plan, q)
      return sum + plan.pts.reduce((a, [lx, y]) => a + (y - (p[0] + (p[1] - p[0]) * share(p, lx))) ** 2, 0)
    }, 0)
  const normal = (q: number[]): { jtj: number[][]; jtr: number[] } => {
    const jtj = Array.from({ length: k }, () => new Array<number>(k).fill(0))
    const jtr = new Array<number>(k).fill(0)
    for (const plan of plans) {
      const p = full(plan, q)
      for (const [lx, y] of plan.pts) {
        const g = share(p, lx)
        const bend = (p[1] - p[0]) * g * (1 - g) * Math.LN10
        const d = [1 - g, g, -bend * p[3], -bend * (p[2] - lx)]
        const r = y - (p[0] + (p[1] - p[0]) * g)
        for (let i = 0; i < 4; i++) {
          const row = plan.at[i]
          if (row < 0) continue
          jtr[row] += d[i] * r
          for (let j = 0; j < 4; j++) if (plan.at[j] >= 0) jtj[row][plan.at[j]] += d[i] * d[j]
        }
      }
    }
    return { jtj, jtr }
  }
  let q = start
  let sse = cost(q)
  let damp = 1e-3
  for (let iter = 0; iter < 400; iter++) {
    const { jtj, jtr } = normal(q)
    let moved = false
    for (let tries = 0; tries < 30; tries++) {
      const step = solve(jtj.map((row, i) => row.map((v, j) => (i === j ? v * (1 + damp) + 1e-300 : v))), jtr)
      const next = step && q.map((v, i) => v + step[i])
      const left = next ? cost(next) : NaN
      if (next && Number.isFinite(left) && left <= sse) {
        const gain = sse - left
        q = next
        sse = left
        damp = Math.max(damp / 10, 1e-12)
        moved = gain > 1e-15 * Math.max(sse, 1e-300)
        break
      }
      damp *= 10
      if (damp > 1e12) break
    }
    if (!moved) break
  }
  if (!q.every(Number.isFinite) || !Number.isFinite(sse)) return null
  // At rest: no parameter can still lower the misfit (the residuals are at right angles to every
  // direction the curves can move in), or the curves pass through every point.
  const { jtj, jtr } = normal(q)
  const settled = sse <= 1e-20 * Math.max(total, 1e-300) || jtr.every((v, i) => Math.abs(v) <= 1e-6 * Math.sqrt(jtj[i][i] * sse) + 1e-300)
  return settled ? { q, sse, jtj } : null
}

/** The points of a curve that count, and what the fit needs to know about them; null when they define no curve at all. */
function surveyed(points: [number, number][]) {
  const pts = points.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
  const n = pts.length
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  if (n < 5 || new Set(xs).size < 4) return null
  const [yLo, yHi, xLo, xHi] = [Math.min(...ys), Math.max(...ys), Math.min(...xs), Math.max(...xs)]
  if (!(yHi > yLo) || !(xHi > xLo)) return null
  const mean = ys.reduce((a, v) => a + v, 0) / n
  const total = ys.reduce((a, v) => a + (v - mean) ** 2, 0)
  const mx = xs.reduce((a, v) => a + v, 0) / n
  const rising = pts.reduce((a, [lx, y]) => a + (lx - mx) * (y - mean), 0) >= 0
  const order = pts.map((_, i) => i).sort((i, j) => xs[i] - xs[j])
  const half = (yLo + yHi) / 2
  const crossing = order.find((i) => (rising ? ys[i] >= half : ys[i] <= half))
  const middles = [...new Set([crossing === undefined ? mx : xs[crossing], mx, xLo + (xHi - xLo) * 0.25, xLo + (xHi - xLo) * 0.5, xLo + (xHi - xLo) * 0.75])]
  return { pts, n, yLo, yHi, xLo, xHi, total, rising, middles }
}

/** The best fit of one curve: [bottom, top, middle, slope] with the slope above zero for a rising curve, below for a falling one. */
function oneCurve(points: [number, number][], held: DoseHeld): { p: number[]; sse: number; jtj: number[][]; at: CurvePlan['at']; free: number; s: NonNullable<ReturnType<typeof surveyed>> } | null {
  const s = surveyed(points)
  if (!s) return null
  const fixed = [held.bottom, held.top].map((v) => (typeof v === 'number' && Number.isFinite(v) ? v : null))
  let free = 0
  const at = [fixed[0] === null ? free++ : -1, fixed[1] === null ? free++ : -1, free++, free++] as CurvePlan['at']
  if (s.n <= free) return null
  const plan: CurvePlan = { pts: s.pts, at, value: [fixed[0] ?? 0, fixed[1] ?? 0, 0, 0] }
  let best: { q: number[]; sse: number; jtj: number[][] } | null = null
  // Starting points: the plateaus at the extremes of the response, the middle where the response
  // crosses halfway (or at a few places along the doses), a few slopes in the direction of the trend.
  for (const middle of s.middles) {
    for (const slope of [1, 0.5, 2, 4]) {
      const begin = [s.yLo, s.yHi, middle, s.rising ? slope : -slope].filter((_, j) => at[j] >= 0)
      const found = settle([plan], begin, s.total)
      if (found && (!best || found.sse < best.sse)) best = found
    }
  }
  if (!best) return null
  const q = best.q
  return { p: at.map((i, j) => (i < 0 ? plan.value[j] : q[i])), sse: best.sse, jtj: best.jtj, at, free, s }
}

/** True when the points say where the middle of the curve is and how steep it is there (see `fitDose`). */
function determined(p: number[], jtj: number[][], at: CurvePlan['at'], xLo: number, xHi: number): boolean {
  const reach = (p[1] - p[0]) * Math.LN10
  if (p[2] < xLo - 3 || p[2] > xHi + 3 || !(Math.abs(p[3]) > 1e-6) || Math.abs(p[3]) > 100) return false
  return jtj[at[2]][at[2]] > 1e-10 * (reach * p[3]) ** 2 && jtj[at[3]][at[3]] > 1e-10 * (reach * (xHi - xLo)) ** 2
}

/**
 * Fit a dose-response curve to points given as [log10 of the dose, response]. A plateau named in
 * `held` is kept at that value and not fitted. Null when no curve is defined by the points: fewer
 * than five points or four different doses, a response that does not vary, or data that do not
 * settle on one curve (a jump between two doses, no bend at all), where R's `nls` stops with an
 * error as well; also when a held plateau would have to lie on the wrong side of the fitted one.
 * Never a guess: a curve is returned only when the search has come to rest at a least-squares
 * solution.
 */
export function fitDose(points: [number, number][], held: DoseHeld = {}): DoseFit | null {
  const fit = oneCurve(points, held)
  if (!fit) return null
  const { p, sse, jtj, at, free, s } = fit
  // A middle far outside the doses that were tested, or a step instead of a slope, is no result.
  // The points must also say where the middle is and how steep the curve is there: when every
  // point sits on a plateau (a jump between two doses), moving the middle or the slope changes
  // nothing at any point, and any steep curve fits equally well.
  if (!determined(p, jtj, at, s.xLo, s.xHi)) return null
  // The standard error of the middle: from the scatter left over and how sharply the misfit
  // rises when the middle is moved (the usual asymptotic value).
  let seLogEc50: number | null = null
  const unit = new Array<number>(free).fill(0)
  unit[at[2]] = 1
  const column = solve(jtj, unit)
  const variance = column ? (sse / (s.n - free)) * column[at[2]] : NaN
  if (variance >= 0 && Number.isFinite(variance)) seLogEc50 = Math.sqrt(variance)
  // The same curve is written with the higher plateau as "top": the slope then says which way it
  // runs. A plateau that is held stays what the scientist called it.
  let [bottom, top, hill] = [p[0], p[1], p[3]]
  if (top < bottom) {
    if (at[0] < 0 || at[1] < 0) return null
    ;[bottom, top, hill] = [top, bottom, -hill]
  }
  return { bottom, top, logEc50: p[2], hill, r2: s.total > 0 ? Math.max(0, 1 - sse / s.total) : 1, n: s.n, seLogEc50, df: s.n - free }
}

/**
 * Do two dose-response curves have the same EC50? The two curves are fitted once each on its own
 * and once with one middle for both; the extra misfit of the shared middle is compared with the
 * scatter left by the separate fits (the extra sum-of-squares F test, with 1 and n1 + n2 minus the
 * number of fitted parameters degrees of freedom). Null when either curve cannot be fitted.
 */
export function compareEc50(a: [number, number][], b: [number, number][], held: DoseHeld = {}): { f: number; df: number; p: number } | null {
  const [one, two] = [oneCurve(a, held), oneCurve(b, held)]
  if (!one || !two) return null
  if (!determined(one.p, one.jtj, one.at, one.s.xLo, one.s.xHi) || !determined(two.p, two.jtj, two.at, two.s.xLo, two.s.xHi)) return null
  const separate = one.sse + two.sse
  const df = one.s.n + two.s.n - one.free - two.free
  if (df < 1 || !(separate > 0)) return null
  // Both curves in one fit: each keeps its own plateaus and slope, the middle is one number for both.
  const own = one.free - 1
  const first: CurvePlan['at'] = [one.at[0], one.at[1], 2 * own, one.at[3] > one.at[2] ? one.at[3] - 1 : one.at[3]]
  const second: CurvePlan['at'] = [two.at[0] < 0 ? -1 : two.at[0] + own, two.at[1] < 0 ? -1 : two.at[1] + own, 2 * own, (two.at[3] > two.at[2] ? two.at[3] - 1 : two.at[3]) + own]
  const fixed = [held.bottom, held.top].map((v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0))
  const plans: CurvePlan[] = [
    { pts: one.s.pts, at: first, value: [fixed[0], fixed[1], 0, 0] },
    { pts: two.s.pts, at: second, value: [fixed[0], fixed[1], 0, 0] },
  ]
  const begin = new Array<number>(2 * own + 1).fill(0)
  plans.forEach((plan, c) => plan.at.forEach((i, j) => {
    if (i >= 0 && j !== 2) begin[i] = (c ? two : one).p[j]
  }))
  let shared: { sse: number } | null = null
  for (const middle of [(one.p[2] + two.p[2]) / 2, one.p[2], two.p[2]]) {
    begin[2 * own] = middle
    const found = settle(plans, [...begin], one.s.total + two.s.total)
    if (found && (!shared || found.sse < shared.sse)) shared = found
  }
  if (!shared) return null
  const f = Math.max(0, shared.sse - separate) / (separate / df)
  return { f, df, p: fUpper(f, 1, df) }
}
