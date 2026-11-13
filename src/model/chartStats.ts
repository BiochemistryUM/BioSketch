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
