// Effect sizes and confidence intervals beside every test (src/model/chartTests.ts), pinned to R 4.4
// through tests/stats-reference.json (the section "effects" of scripts/stats-reference.R).

import { describe, expect, it } from 'vitest'
import { analyse, differenceText, effectText, type Analysis } from '../src/model/chartTests'
import { dunnettCritical, dunnettUpper, studentizedRangeCritical } from '../src/model/distributions'
import ref from './stats-reference.json'

const A = [4.1, 5.3, 6.0, 5.8, 4.9, 6.4]
const B = [6.9, 7.4, 5.9, 8.1, 7.7, 6.6]
const C = [5.2, 9.3, 8.8, 10.1, 7.9, 9.6]
const D = [3.3, 4.7, 5.1, 2.9]
const T1 = [1, 2, 2, 3, 4, 4, 5]
const T2 = [2, 3, 4, 4, 5, 6, 6, 7]
const P1 = [10, 12, 9, 14, 11, 13, 8, 15]
const P2 = [12, 15, 9, 13, 14, 17, 10, 19]
const e = ref.effects as unknown as Record<string, number & number[]>

const run = (samples: number[][], by: 'means' | 'ranks', paired = false, versusFirst = false): Analysis => {
  const out = analyse(samples, { by, paired, versusFirst })
  if (!out.ok) throw new Error(out.problem)
  return out.result
}
const close = (a: number | undefined, b: number, tol = 1e-9) => expect(Math.abs((a ?? NaN) - b), `${a} against ${b}`).toBeLessThan(tol * Math.max(1, Math.abs(b)))
const triple = (r: Analysis, i = 0) => [r.pairs[i].diff!.estimate, r.pairs[i].diff!.lower, r.pairs[i].diff!.upper]
const closeAll = (got: number[], want: number[], tol = 1e-9) => {
  expect(got.length).toBe(want.length)
  got.forEach((v, i) => close(v, want[i], tol))
}

describe('two groups', () => {
  it('Welch’s t test: the second mean less the first with t.test’s interval, and Hedges’ g', () => {
    closeAll(triple(run([A, B], 'means')), e.welchAB)
    closeAll(triple(run([A, D], 'means')), e.welchAD)
    close(run([A, B], 'means').effect!.value, e.hedgesAB)
    close(run([A, D], 'means').effect!.value, e.hedgesAD)
    expect(effectText(run([A, B], 'means').effect!)).toBe('Hedges’ g = 1.91')
    expect(differenceText(run([A, B], 'means').pairs[0].diff!)).toBe('1.68 (95 % interval 0.634 to 2.73)')
  })

  it('the paired t test: the mean change with its interval, and Cohen’s d_z', () => {
    closeAll(triple(run([A, B], 'means', true)), e.pairedAB)
    closeAll(triple(run([P1, P2], 'means', true)), e.pairedP)
    close(run([A, B], 'means', true).effect!.value, e.dzAB)
    close(run([P1, P2], 'means', true).effect!.value, e.dzP)
  })

  it('tests on ranks: the rank-biserial correlation, separate and paired, with ties; no interval', () => {
    close(run([A, B], 'ranks').effect!.value, e.rbAB)
    close(run([A, B], 'ranks').effect!.value, e.rbABpairs)
    close(run([T1, T2], 'ranks').effect!.value, e.rbTies)
    close(run([A, B], 'ranks', true).effect!.value, e.rbPairedAB)
    close(run([P1, P2], 'ranks', true).effect!.value, e.rbPairedP)
    expect(run([A, B], 'ranks').pairs[0].diff).toBeUndefined()
  })
})

describe('several groups', () => {
  it('one-way ANOVA: η², and Tukey’s simultaneous intervals for every pair as TukeyHSD gives them', () => {
    const r = run([A, B, C, D], 'means')
    close(r.effect!.value, e.eta2)
    closeAll(r.pairs.flatMap((_, i) => triple(r, i)), e.tukey, 1e-7)
    expect(r.intervals).toContain('Tukey')
  })

  it('each group with the first: Dunnett’s simultaneous intervals, from the critical value of the same integral', () => {
    const r = run([A, B, C, D], 'means', false, true)
    closeAll(r.pairs.flatMap((_, i) => triple(r, i)), e.dunnett, 1e-6)
    // multcomp's simulation agrees to its own error.
    closeAll(r.pairs.flatMap((_, i) => triple(r, i)), e.dunnettSimulated, 2e-3)
    const lambdas = [6, 6, 4].map((n) => Math.sqrt(n / (n + 6)))
    close(dunnettCritical(0.05, lambdas, 18), e.dunnettCrit, 1e-7)
    close(dunnettUpper(e.dunnettCrit, lambdas, 18), 0.05, 1e-6)
  })

  it('the studentized range is inverted to the point qtukey gives', () => {
    // qtukey(0.95, 4, 18) = 3.9969776706 (R 4.4).
    close(studentizedRangeCritical(0.05, 4, 18), 3.9969776706, 1e-7)
  })

  it('repeated measures: partial η² and the paired intervals of the pairs; ranks: η²(H) and Kendall’s W', () => {
    const r = run([A, B, C], 'means', true)
    close(r.effect!.value, e.partialEta2)
    closeAll(r.pairs.flatMap((p) => [p.diff!.lower, p.diff!.upper]), e.pairedPairs)
    expect(r.intervals).toContain('not corrected')
    close(run([A, B, C, D], 'ranks').effect!.value, e.etaH)
    close(run([A, B, C], 'ranks', true).effect!.value, e.kendallW)
    expect(run([A, B, C, D], 'ranks').pairs.every((p) => !p.diff)).toBe(true)
  })
})
