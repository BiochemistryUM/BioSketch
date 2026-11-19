// Statistics for box plots, violins and fitted lines, pinned to reference values from R 4
// (quantile type 7, boxplot fences on those quartiles, bw.nrd0, dnorm kernel, lm).

import { describe, expect, it } from 'vitest'
import { doseResponseAt, fitDose, bandwidth, boxStats, density, fitLine, quantile } from '../src/model/chartStats'
import { tCritical } from '../src/model/distributions'
import doseRef from './stats-reference.json'

const X = [2.1, 3.4, 3.9, 4.4, 5.0, 5.6, 6.1, 7.3, 9.8, 14.2]
const Y = [1.2, 2.9, 3.1, 4.8, 4.9, 6.4, 6.2, 8.1, 9.9, 15.1]

describe('quartiles', () => {
  it('interpolate between neighbouring values, as R, NumPy and spreadsheets do by default', () => {
    expect(quantile(X, 0.25)).toBeCloseTo(4.025, 10)
    expect(quantile(X, 0.5)).toBeCloseTo(5.3, 10)
    expect(quantile(X, 0.75)).toBeCloseTo(7.0, 10)
    expect([0.25, 0.5, 0.75].map((p) => quantile([1, 2, 3, 4], p))).toEqual([1.75, 2.5, 3.25])
    expect(quantile([7], 0.25)).toBe(7)
    expect(quantile(X, 0)).toBe(2.1)
    expect(quantile(X, 1)).toBe(14.2)
    expect(quantile([], 0.5)).toBeNaN()
  })
})

describe('box plot', () => {
  it('ends each whisker at the furthest value within 1.5 box lengths, and lists what lies beyond', () => {
    const b = boxStats([...X].reverse())!
    expect(b).toMatchObject({ n: 10, whiskerLow: 2.1, whiskerHigh: 9.8, outliers: [14.2] })
    expect(b.q1).toBeCloseTo(4.025, 10)
    expect(b.median).toBeCloseTo(5.3, 10)
    expect(b.q3).toBeCloseTo(7, 10)
  })

  it('copes with ties, tiny groups and no values', () => {
    // R: quantile(c(1,1,1,2,9)) gives 1, 1, 2; the 9 is beyond 2 + 1.5.
    expect(boxStats([1, 1, 1, 2, 9])).toEqual({ n: 5, q1: 1, median: 1, q3: 2, whiskerLow: 1, whiskerHigh: 2, outliers: [9] })
    expect(boxStats([4])).toEqual({ n: 1, q1: 4, median: 4, q3: 4, whiskerLow: 4, whiskerHigh: 4, outliers: [] })
    expect(boxStats([3, 5])).toEqual({ n: 2, q1: 3.5, median: 4, q3: 4.5, whiskerLow: 3, whiskerHigh: 5, outliers: [] })
    expect(boxStats([6, 6, 6])).toMatchObject({ q1: 6, median: 6, q3: 6, whiskerLow: 6, whiskerHigh: 6, outliers: [] })
    expect(boxStats([])).toBeNull()
    expect(boxStats([NaN, 2])).toMatchObject({ n: 1, median: 2 })
  })
})

describe('violin', () => {
  it('uses the rule-of-thumb bandwidth of R\'s density()', () => {
    expect(bandwidth(X)).toBeCloseTo(1.26073752974, 10)
    expect(bandwidth([1, 1, 1, 2, 9])).toBeCloseTo(0.486792311425, 10)
    // No spread at all: R falls back to the size of the value, so there is still a curve to draw.
    expect(bandwidth([5, 5, 5, 5])).toBeCloseTo(3.410362, 5)
    expect(bandwidth([0, 0])).toBeCloseTo(0.9 * 2 ** -0.2, 10)
    expect(bandwidth([])).toBe(1)
  })

  it('estimates the density with a normal curve around every value', () => {
    const d = density(X, [5, 2.1, 14.2])
    expect(d[0]).toBeCloseTo(0.1538102525102, 10)
    expect(d[1]).toBeCloseTo(0.0707797204148, 10)
    expect(d[2]).toBeCloseTo(0.0317152502766, 10)
    // The whole curve encloses an area of one.
    const grid = Array.from({ length: 4001 }, (_, i) => -10 + i * 0.01)
    const area = density(X, grid).reduce((a, b) => a + b, 0) * 0.01
    expect(area).toBeCloseTo(1, 3)
    expect(density([], [1, 2])).toEqual([0, 0])
  })
})

describe('fitted line', () => {
  it('is the least-squares line of y on x, with R squared', () => {
    const fit = fitLine(X.map((x, i) => [x, Y[i]]))!
    expect(fit.slope).toBeCloseTo(1.126338859627, 10)
    expect(fit.intercept).toBeCloseTo(-0.700774152497, 10)
    expect(fit.r2).toBeCloseTo(0.985515572394, 10)
    expect(fit.n).toBe(10)
  })

  it('is exact for points on a line and undefined when it cannot be drawn', () => {
    expect(fitLine([[0, 1], [1, 3], [2, 5]])).toEqual({ slope: 2, intercept: 1, r2: 1, n: 3 })
    expect(fitLine([[1, 4], [3, 4]])).toMatchObject({ slope: 0, intercept: 4, r2: 1 })
    expect(fitLine([[1, 2]])).toBeNull()
    expect(fitLine([[2, 1], [2, 5]])).toBeNull()
    expect(fitLine([])).toBeNull()
    expect(fitLine([[1, 2], [NaN, 3], [2, 4]])).toMatchObject({ slope: 2, n: 2 })
  })
})

// Reference: R 4.4, nls(y ~ SSfpl(log10(x), A, B, xmid, scal)), written by scripts/stats-reference.R.
describe('a dose-response curve (four-parameter logistic)', () => {
  type DoseRef = { x: number[]; y: number[]; A: number; B: number; xmid: number; scal: number; seXmid: number; sse: number; r2: number; tcrit: number }
  const sets = doseRef.dose as unknown as Record<'rise' | 'fall' | 'shallow', DoseRef>
  const points = (r: DoseRef): [number, number][] => r.x.map((x, i) => [Math.log10(x), r.y[i]])
  const near = (got: number, want: number, rel: number, what: string) => expect(Math.abs(got - want), `${what}: ${got} against ${want}`).toBeLessThanOrEqual(rel * Math.max(1, Math.abs(want)))

  it('is the curve R fits: plateaus, middle, slope, how well it fits, and the standard error of the middle', () => {
    for (const name of ['rise', 'fall', 'shallow'] as const) {
      const r = sets[name]
      const fit = fitDose(points(r))!
      expect(fit, name).not.toBeNull()
      near(fit.bottom, Math.min(r.A, r.B), 1e-5, `${name} bottom`)
      near(fit.top, Math.max(r.A, r.B), 1e-5, `${name} top`)
      near(fit.logEc50, r.xmid, 1e-5, `${name} log EC50`)
      // R's `scal` is the width of the curve in natural-log steps; the Hill slope is its inverse per decade.
      near(fit.hill, (r.B >= r.A ? 1 : -1) / (r.scal * Math.LN10), 1e-5, `${name} hill`)
      near(fit.r2, r.r2, 1e-7, `${name} R²`)
      near(fit.seLogEc50!, r.seXmid, 1e-4, `${name} standard error`)
      expect(fit.n).toBe(r.x.length)
    }
    // Rising curves have a slope above zero, a falling one below; the top is always the higher plateau.
    expect(fitDose(points(sets.rise))!.hill).toBeGreaterThan(0)
    expect(fitDose(points(sets.fall))!.hill).toBeLessThan(0)
    expect(fitDose(points(sets.fall))!.top).toBeGreaterThan(fitDose(points(sets.fall))!.bottom)
  })

  it('gives the same curve whatever order the points come in, and halfway between the plateaus at the EC50', () => {
    const r = sets.fall
    const fit = fitDose(points(r))!
    const shuffled = fitDose([...points(r)].reverse())!
    near(shuffled.logEc50, fit.logEc50, 1e-7, 'log EC50')
    near(shuffled.hill, fit.hill, 1e-7, 'hill')
    expect(doseResponseAt(fit, fit.logEc50)).toBeCloseTo((fit.top + fit.bottom) / 2, 9)
    expect(doseResponseAt(fit, -50)).toBeCloseTo(fit.top, 6)
    expect(doseResponseAt(fit, 50)).toBeCloseTo(fit.bottom, 6)
  })

  it('recovers a curve that passes through every point', () => {
    const truth = { bottom: 5, top: 80, logEc50: 0.4, hill: 1.3 }
    const exact = fitDose([-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2].map((lx) => [lx, doseResponseAt(truth, lx)]))!
    near(exact.bottom, 5, 1e-6, 'bottom')
    near(exact.top, 80, 1e-6, 'top')
    near(exact.logEc50, 0.4, 1e-6, 'log EC50')
    near(exact.hill, 1.3, 1e-6, 'hill')
    expect(exact.r2).toBeCloseTo(1, 9)
  })

  it('gives no curve where the data define none, as R stops with an error there', () => {
    // Too few points, too few doses, a response that never changes.
    expect(fitDose([[0, 1], [1, 2], [2, 3], [3, 4]])).toBeNull()
    expect(fitDose([[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]])).toBeNull()
    expect(fitDose([[0, 5], [1, 5], [2, 5], [3, 5], [4, 5]])).toBeNull()
    // A jump between two doses: any steepness fits equally, so there is no single slope.
    expect(fitDose([[-2, 0], [-1, 0], [0, 0], [1, 10], [2, 10], [3, 10]])).toBeNull()
    // Points that are not numbers are ignored.
    expect(fitDose([...points(sets.rise), [NaN, 3], [1, Infinity]])!.n).toBe(sets.rise.x.length)
  })
})

describe('the factor of a confidence interval', () => {
  it('is R’s qt', () => {
    const want = (doseRef.dose as unknown as { qt: number[] }).qt
    const got = [tCritical(0.05, 1), tCritical(0.05, 5), tCritical(0.05, 20), tCritical(0.01, 3), tCritical(0.1, 200)]
    got.forEach((g, i) => expect(Math.abs(g - want[i])).toBeLessThan(1e-8 * want[i]))
    expect(tCritical(0, 5)).toBeNaN()
    expect(tCritical(0.05, 0)).toBeNaN()
  })
})
