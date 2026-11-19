// The distributions behind the statistical tests, pinned to R 4.4 (tests/stats-reference.json,
// written by scripts/stats-reference.R).

import { describe, expect, it } from 'vitest'
import { chiSquaredUpper, fUpper, incompleteBeta, logGamma, normalBelow, normalQuantile, normalRangeBelow, rankSumBelow, rankSumTwoSided, signedRankBelow, signedRankTwoSided, studentizedRangeUpper, tTwoSided, upperGamma } from '../src/model/distributions'
import ref from './stats-reference.json'

/** Every value agrees with R's to within `rel` of its size (and 1e-15 for values that are all but zero). */
function agree(got: number[], want: number[], rel = 1e-10) {
  expect(got.length).toBe(want.length)
  got.forEach((g, i) => expect(Math.abs(g - want[i]), `value ${i}: ${g} against ${want[i]}`).toBeLessThanOrEqual(rel * Math.abs(want[i]) + 1e-15))
}

describe('distributions agree with R', () => {
  it('Student t, two-sided (pt)', () => {
    agree([tTwoSided(2.3, 7.4), tTwoSided(0.01, 3), tTwoSided(12, 2.5), tTwoSided(1.96, 120000), tTwoSided(5, 1)], ref.dist.pt2, 1e-9)
    expect(tTwoSided(-2.3, 7.4)).toBe(tTwoSided(2.3, 7.4))
    expect(tTwoSided(0, 5)).toBe(1)
    expect(tTwoSided(Infinity, 5)).toBe(0)
  })

  it('F, upper tail (pf)', () => {
    agree([fUpper(5.1, 2, 12), fUpper(0.3, 4, 7.5), fUpper(40, 1, 3), fUpper(1.2, 23, 60000)], ref.dist.pf, 1e-9)
    expect(fUpper(0, 2, 12)).toBe(1)
    expect(fUpper(Infinity, 2, 12)).toBe(0)
  })

  it('chi-squared, upper tail (pchisq)', () => {
    agree([chiSquaredUpper(7.2, 2), chiSquaredUpper(0.4, 5), chiSquaredUpper(60, 3), chiSquaredUpper(25, 23)], ref.dist.pchisq)
    expect(chiSquaredUpper(0, 3)).toBe(1)
  })

  it('normal distribution and its inverse (pnorm, qnorm)', () => {
    agree([-1.96, 0.3, -8, 4.5, 0].map(normalBelow), ref.dist.pnorm)
    agree([0.025, 0.5, 0.9, 1e-9, 0.31].map(normalQuantile), ref.dist.qnorm)
    expect(normalQuantile(0)).toBe(-Infinity)
    expect(normalQuantile(1)).toBe(Infinity)
    for (const p of [1e-12, 0.001, 0.2, 0.77, 0.999999]) expect(normalBelow(normalQuantile(p))).toBeCloseTo(p, 13)
  })

  it('studentized range, upper tail (ptukey)', () => {
    const at = [[3.5, 3, 12], [1.2, 4, 20], [6, 5, 8], [2.8, 2, 10], [4.2, 10, 60], [3, 3, 2], [5, 24, 500], [3.3, 6, 2000], [9, 4, 5], [0.4, 3, 15]]
    const got = at.map(([q, k, df]) => studentizedRangeUpper(q, k, df))
    // R's ptukey is itself worked out by numerical integration, good to about nine digits.
    got.forEach((g, i) => expect(Math.abs(g - ref.dist.ptukey[i]), `ptukey(${at[i]})`).toBeLessThan(1e-9))
  })

  it('studentized range where R is only approximate: checked against SciPy 1.18 (studentized_range.sf)', () => {
    expect(studentizedRangeUpper(50, 3, 2)).toBeCloseTo(0.00145944698475, 10)
    expect(studentizedRangeUpper(20, 5, 3)).toBeCloseTo(0.00304892874378, 10)
    expect(studentizedRangeUpper(3.3, 6, 30000)).toBeCloseTo(0.180635788697, 9)
  })

  it('studentized range: with two groups it is the t test, and it has sensible ends', () => {
    // The range of two means is their difference: q = t × √2.
    for (const [t, df] of [[2.1, 9], [0.4, 30], [4.5, 4]]) expect(studentizedRangeUpper(t * Math.SQRT2, 2, df)).toBeCloseTo(tTwoSided(t, df), 10)
    expect(studentizedRangeUpper(0, 3, 10)).toBe(1)
    expect(studentizedRangeUpper(Infinity, 3, 10)).toBe(0)
    expect(studentizedRangeUpper(1000, 3, 10)).toBeLessThan(1e-12)
    // Like R: not defined below two degrees of freedom.
    expect(studentizedRangeUpper(3.9, 3, 1)).toBeNaN()
    expect(normalRangeBelow(0, 3)).toBe(0)
    expect(normalRangeBelow(40, 3)).toBeCloseTo(1, 12)
    // Two values: their difference is normal with variance 2.
    expect(normalRangeBelow(1.5, 2)).toBeCloseTo(2 * normalBelow(1.5 / Math.SQRT2) - 1, 12)
  })

  it('exact Wilcoxon distributions (pwilcox, psignrank)', () => {
    agree([rankSumBelow(4, 6, 6), rankSumBelow(10, 4, 8), rankSumBelow(0, 3, 3), rankSumBelow(600, 40, 45), rankSumBelow(1200, 49, 49)], ref.dist.pwilcox, 1e-12)
    agree([signedRankBelow(3, 8), signedRankBelow(0, 5), signedRankBelow(40, 15), signedRankBelow(500, 49)], ref.dist.psignrank, 1e-12)
    // Three against three: the most extreme split is one of 20, so p = 2/20.
    expect(rankSumTwoSided(0, 3, 3)).toBeCloseTo(0.1, 14)
    expect(rankSumTwoSided(9, 3, 3)).toBeCloseTo(0.1, 14)
    expect(rankSumTwoSided(4.5, 3, 3)).toBe(1)
    expect(signedRankTwoSided(0, 5)).toBeCloseTo(2 / 32, 14)
    expect(signedRankTwoSided(15, 5)).toBeCloseTo(2 / 32, 14)
  })

  it('the functions underneath', () => {
    expect(logGamma(1)).toBeCloseTo(0, 13)
    expect(logGamma(5)).toBeCloseTo(Math.log(24), 13)
    expect(logGamma(0.5)).toBeCloseTo(Math.log(Math.sqrt(Math.PI)), 13)
    expect(logGamma(0.25)).toBeCloseTo(1.2880225246980774, 12)
    expect(incompleteBeta(0, 2, 3)).toBe(0)
    expect(incompleteBeta(1, 2, 3)).toBe(1)
    expect(incompleteBeta(0.5, 2, 2)).toBeCloseTo(0.5, 14)
    expect(upperGamma(1, 2)).toBeCloseTo(Math.exp(-2), 14)
    expect(upperGamma(3, 0)).toBe(1)
  })
})
