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
  // When every y is the same the line fits exactly, although R² is formally undefined.
  return { slope, intercept: my - slope * mx, r2: syy > 0 ? (sxy * sxy) / (sxx * syy) : 1, n }
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

/**
 * Fit a dose-response curve to points given as [log10 of the dose, response]. Null when no curve
 * is defined by them: fewer than five points or four different doses, a response that does not
 * vary, or data that do not settle on one curve (a jump between two doses, no bend at all), where
 * R's `nls` stops with an error as well. Never a guess: a curve is returned only when the search
 * has come to rest at a least-squares solution.
 */
export function fitDose(points: [number, number][]): DoseFit | null {
  const pts = points.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
  const n = pts.length
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  if (n < 5 || new Set(xs).size < 4) return null
  const [yLo, yHi, xLo, xHi] = [Math.min(...ys), Math.max(...ys), Math.min(...xs), Math.max(...xs)]
  if (!(yHi > yLo) || !(xHi > xLo)) return null
  const mean = ys.reduce((a, v) => a + v, 0) / n
  const total = ys.reduce((a, v) => a + (v - mean) ** 2, 0)

  // Parameters: [plateau at low doses, plateau at high doses, log EC50, hill]. `g` is the share
  // of the way from the first plateau to the second.
  type P = [number, number, number, number]
  const share = (p: P, lx: number): number => 1 / (1 + Math.exp(Math.LN10 * p[3] * (p[2] - lx)))
  const cost = (p: P): number => pts.reduce((a, [lx, y]) => a + (y - (p[0] + (p[1] - p[0]) * share(p, lx))) ** 2, 0)
  /** JᵀJ and Jᵀr at `p`: the normal equations of the least-squares step. */
  const normal = (p: P): { jtj: number[][]; jtr: number[] } => {
    const jtj = [0, 1, 2, 3].map(() => [0, 0, 0, 0])
    const jtr = [0, 0, 0, 0]
    for (const [lx, y] of pts) {
      const g = share(p, lx)
      const bend = (p[1] - p[0]) * g * (1 - g) * Math.LN10
      const d = [1 - g, g, -bend * p[3], -bend * (p[2] - lx)]
      const r = y - (p[0] + (p[1] - p[0]) * g)
      for (let i = 0; i < 4; i++) {
        jtr[i] += d[i] * r
        for (let j = 0; j < 4; j++) jtj[i][j] += d[i] * d[j]
      }
    }
    return { jtj, jtr }
  }

  /** Levenberg-Marquardt from one starting point; null when the search does not come to rest. */
  const search = (start: P): { p: P; sse: number } | null => {
    let p = start
    let sse = cost(p)
    let damp = 1e-3
    for (let iter = 0; iter < 400; iter++) {
      const { jtj, jtr } = normal(p)
      let moved = false
      for (let tries = 0; tries < 30; tries++) {
        const step = solve(jtj.map((row, i) => row.map((v, j) => (i === j ? v * (1 + damp) + 1e-300 : v))), jtr)
        const q = step && (p.map((v, i) => v + step[i]) as P)
        const next = q ? cost(q) : NaN
        if (q && Number.isFinite(next) && next <= sse) {
          const gain = sse - next
          p = q
          sse = next
          damp = Math.max(damp / 10, 1e-12)
          moved = gain > 1e-15 * Math.max(sse, 1e-300)
          break
        }
        damp *= 10
        if (damp > 1e12) break
      }
      if (!moved) break
    }
    if (!p.every(Number.isFinite) || !Number.isFinite(sse)) return null
    // At rest: no parameter can still lower the misfit (the residuals are at right angles to
    // every direction the curve can move in), or the curve passes through every point.
    const { jtj, jtr } = normal(p)
    const settled = sse <= 1e-20 * Math.max(total, 1e-300) || jtr.every((v, i) => Math.abs(v) <= 1e-6 * Math.sqrt(jtj[i][i] * sse) + 1e-300)
    return settled ? { p, sse } : null
  }

  // Starting points: the plateaus at the extremes of the response, the middle where the response
  // crosses halfway (or at a few places along the doses), a few slopes in the direction of the trend.
  const order = pts.map((_, i) => i).sort((i, j) => xs[i] - xs[j])
  const mx = xs.reduce((a, v) => a + v, 0) / n
  const rising = pts.reduce((a, [lx, y]) => a + (lx - mx) * (y - mean), 0) >= 0
  const half = (yLo + yHi) / 2
  const crossing = order.find((i) => (rising ? ys[i] >= half : ys[i] <= half))
  const middles = [...new Set([crossing === undefined ? mx : xs[crossing], mx, xLo + (xHi - xLo) * 0.25, xLo + (xHi - xLo) * 0.5, xLo + (xHi - xLo) * 0.75])]
  let best: { p: P; sse: number } | null = null
  for (const middle of middles) {
    for (const slope of [1, 0.5, 2, 4]) {
      const found = search(rising ? [yLo, yHi, middle, slope] : [yHi, yLo, middle, slope])
      if (found && (!best || found.sse < best.sse)) best = found
    }
  }
  if (!best) return null
  const [a, b, logEc50, slope] = best.p
  // A middle far outside the doses that were tested, or a step instead of a slope, is no result.
  if (logEc50 < xLo - 3 || logEc50 > xHi + 3 || !(Math.abs(slope) > 1e-6) || Math.abs(slope) > 100) return null

  // The points must say where the middle is and how steep the curve is there: when every point
  // sits on a plateau (a jump between two doses), moving the middle or the slope changes nothing
  // at any point, and any steep curve fits equally well.
  const { jtj } = normal(best.p)
  const reach = (b - a) * Math.LN10
  if (!(jtj[2][2] > 1e-10 * (reach * slope) ** 2) || !(jtj[3][3] > 1e-10 * (reach * (xHi - xLo)) ** 2)) return null

  // The standard error of the middle: from the scatter left over and how sharply the misfit
  // rises when the middle is moved (the usual asymptotic value).
  let seLogEc50: number | null = null
  const column = solve(jtj, [0, 0, 1, 0])
  const variance = column ? (best.sse / (n - 4)) * column[2] : NaN
  if (variance >= 0 && Number.isFinite(variance)) seLogEc50 = Math.sqrt(variance)
  // The same curve is written with the higher plateau as "top": the slope then says which way it runs.
  const [bottom, top, hill] = b >= a ? [a, b, slope] : [b, a, -slope]
  return { bottom, top, logEc50, hill, r2: total > 0 ? Math.max(0, 1 - best.sse / total) : 1, n, seLogEc50 }
}
