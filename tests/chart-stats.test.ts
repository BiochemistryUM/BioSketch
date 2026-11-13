// Statistics for box plots, violins and fitted lines, pinned to reference values from R 4
// (quantile type 7, boxplot fences on those quartiles, bw.nrd0, dnorm kernel, lm).

import { describe, expect, it } from 'vitest'
import { bandwidth, boxStats, density, fitLine, quantile } from '../src/model/chartStats'

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
