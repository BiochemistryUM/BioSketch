// Enzyme kinetics (src/model/kinetics.ts), pinned to R 4.4 through tests/stats-reference.json,
// written by scripts/stats-reference.R (section "enzyme kinetics"): nls on the Michaelis–Menten
// equation and on the four inhibition models over a long table (S, I, v), each polished by a second
// nls with a tight tolerance, anova() for the F tests, AIC() and GraphPad's AICc, and the delta
// method on vcov(nls) for kcat / Km. The rates there are made up, shaped like real assays.

import { describe, expect, it } from 'vitest'
import ref from './stats-reference.json'
import {
  apparent,
  compareInhibition,
  fitInhibition,
  fitMichaelis,
  INHIBITION_MODELS,
  isFit,
  kcatOf,
  kinetics,
  type InhibitionModel,
  type KineticsFit,
  type KineticsModel,
  type KineticsSeries,
  type NoFit,
} from '../src/model/kinetics'

interface FitRef {
  names: string[]
  coef: number[]
  se: number[]
  lo: number[]
  hi: number[]
  vcov: number[][]
  n: number
  df: number
  sse: number
  firstSse: number
  sigma: number
  r2: number
  aic: number
  aicc: number
  atS: number[]
  atI: number[]
  fitted: number[]
  enzyme?: number
  kcat?: number
  kcatSe?: number
  kcatKm?: number
  kcatKmSe?: number
}
interface TestRef { f: number; df1: number; df2: number; p: number }
interface KinRef {
  mmA: FitRef
  mmB: FitRef
  mmAS: number[]
  mmAV: number[]
  mmBS: number[]
  mmBV: number[]
  inhS: number[]
  inhI: number[]
  inhV: number[]
  competitive: FitRef
  uncompetitive: FitRef
  noncompetitive: FitRef
  mixed: FitRef
  fCompetitive: TestRef
  fUncompetitive: TestRef
  fNoncompetitive: TestRef
  best: string
}
const K = (ref as unknown as { kinetics: KinRef }).kinetics

const rel = (got: number | null | undefined, want: number, tolerance: number) => {
  expect(got).not.toBeNull()
  expect(got).not.toBeUndefined()
  expect(Math.abs((got as number) / want - 1), `${got} against ${want}`).toBeLessThanOrEqual(tolerance)
}
const near = (got: number | null | undefined, want: number, tolerance = 1e-9) => {
  expect(got).not.toBeNull()
  expect(Math.abs((got as number) - want), `${got} against ${want}`).toBeLessThanOrEqual(tolerance * Math.max(1, Math.abs(want)))
}

function fitted(f: KineticsFit | NoFit): KineticsFit {
  if (!isFit(f)) throw new Error(`no fit: ${f.reason}`)
  return f
}
const reasonOf = (f: KineticsFit | NoFit): string => {
  if (isFit(f)) throw new Error('expected no fit')
  return f.reason
}

/** R's names for the parameters. */
const R_NAMES = { vmax: 'Vmax', km: 'Km', ki: 'Ki', alpha: 'alpha' } as const

/** Everything R reports about a fit, against BioSketch's. */
function pinned(fit: KineticsFit, r: FitRef) {
  expect(fit.names.map((n) => R_NAMES[n])).toEqual(r.names)
  expect(fit.n).toBe(r.n)
  expect(fit.df).toBe(r.df)
  fit.names.forEach((name, a) => {
    const e = fit.params[name]!
    rel(e.value, r.coef[a], 2e-7)
    rel(e.se, r.se[a], 1e-6)
    rel(e.lo, r.lo[a], 1e-6)
    rel(e.hi, r.hi[a], 1e-6)
    // Covariances relative to the standard errors (one of them is near 0).
    fit.names.forEach((_, b) => expect(Math.abs(fit.cov[a][b] - r.vcov[a][b])).toBeLessThanOrEqual(2e-6 * Math.sqrt(r.vcov[a][a] * r.vcov[b][b])))
  })
  // At least as good a fit as R's polished one (to rounding), and better than its first answer.
  expect(fit.sse).toBeLessThanOrEqual(r.sse * (1 + 1e-12))
  expect(fit.sse).toBeLessThanOrEqual(r.firstSse)
  rel(fit.sse, r.sse, 1e-9)
  rel(fit.sy, r.sigma, 1e-9)
  near(fit.r2, r.r2)
  near(fit.aic, r.aic)
  near(fit.aicc, r.aicc)
  r.atS.forEach((s, j) => {
    if (r.fitted[j] === 0) expect(fit.predict(s, r.atI[j])).toBe(0)
    else rel(fit.predict(s, r.atI[j]), r.fitted[j], 1e-7)
  })
}

const inhibitionSeries = (): KineticsSeries[] =>
  [0, 5, 10, 20].map((i) => ({
    name: i === 0 ? 'No inhibitor' : `${i} µM`,
    inhibitor: i,
    s: K.inhS.filter((_, j) => K.inhI[j] === i),
    v: K.inhV.filter((_, j) => K.inhI[j] === i),
  }))

/** Milliseconds per call, the best of a few runs. */
function timed(run: () => unknown, times = 5): number {
  let best = Infinity
  for (let k = 0; k < times; k++) {
    const t = performance.now()
    run()
    best = Math.min(best, performance.now() - t)
  }
  return best
}

describe('Michaelis–Menten (R: nls(v ~ Vmax * S / (Km + S)))', () => {
  it('fits eight concentrations in triplicate, substrate 0 included', () => {
    const fit = fitted(fitMichaelis(K.mmAS, K.mmAV))
    expect(fit.model).toBe('mm')
    pinned(fit, K.mmA)
    expect(fit.params.ki).toBeUndefined()
    expect(fit.params.alpha).toBeUndefined()
    expect(fit.predict(0)).toBe(0)
    expect(fit.predict(-5)).toBe(0)
  })

  it('fits rates measured only up to half of Km: Km is wide, but there is a curve', () => {
    const fit = fitted(fitMichaelis(K.mmBS, K.mmBV))
    pinned(fit, K.mmB)
    expect(fit.params.km!.value).toBeGreaterThan(2 * Math.max(...K.mmBS))
    expect(fit.params.km!.se / fit.params.km!.value).toBeGreaterThan(0.05)
  })

  it('works out kcat and kcat / Km, the latter by the delta method on vcov(nls)', () => {
    for (const r of [K.mmA, K.mmB]) {
      const fit = fitted(fitMichaelis(r === K.mmA ? K.mmAS : K.mmBS, r === K.mmA ? K.mmAV : K.mmBV))
      const k = kcatOf(fit, r.enzyme!)!
      rel(k.kcat.value, r.kcat!, 2e-7)
      rel(k.kcat.se, r.kcatSe!, 1e-6)
      rel(k.kcatKm.value, r.kcatKm!, 2e-7)
      rel(k.kcatKm.se, r.kcatKmSe!, 1e-6)
      near(k.kcat.hi - k.kcat.value, fit.tcrit * k.kcat.se)
      near(k.kcatKm.value - k.kcatKm.lo, fit.tcrit * k.kcatKm.se)
    }
    const fit = fitted(fitMichaelis(K.mmAS, K.mmAV))
    expect(kcatOf(fit, 0)).toBeNull()
    expect(kcatOf(fit, Number.NaN)).toBeNull()
    expect(kcatOf(fit, -1)).toBeNull()
  })

  it('fits one curve per series through the entry point, in the order given', () => {
    const out = kinetics(
      [
        { name: 'Wild type', s: K.mmAS, v: K.mmAV },
        { name: 'Mutant', s: K.mmBS, v: K.mmBV },
        { name: 'Empty', s: [], v: [] },
      ],
      'mm',
    )
    expect(out.fits).toHaveLength(3)
    pinned(fitted(out.fits[0]), K.mmA)
    pinned(fitted(out.fits[1]), K.mmB)
    expect(reasonOf(out.fits[2])).toMatch(/Empty has no usable points/)
    expect(out.comparison).toBeUndefined()
  })
})

describe('inhibition, fitted over every series at once (R: nls on the long table)', () => {
  it('fits each model with Vmax, Km, Ki (and α) shared', () => {
    const series = inhibitionSeries()
    for (const model of INHIBITION_MODELS) {
      const fit = fitted(fitInhibition(series, model))
      expect(fit.model).toBe(model)
      pinned(fit, K[model])
      expect(fit.params.alpha === undefined).toBe(model !== 'mixed')
    }
  })

  it('tests each simpler model against mixed by the extra sum-of-squares F test (R: anova)', () => {
    const c = compareInhibition(inhibitionSeries())
    const pairs: [Exclude<InhibitionModel, 'mixed'>, TestRef][] = [
      ['competitive', K.fCompetitive],
      ['uncompetitive', K.fUncompetitive],
      ['noncompetitive', K.fNoncompetitive],
    ]
    for (const [m, r] of pairs) {
      const t = c.tests[m]!
      rel(t.f, r.f, 1e-7)
      expect(t.df1).toBe(r.df1)
      expect(t.df2).toBe(r.df2)
      rel(t.p, r.p, 1e-6)
    }
    for (const m of INHIBITION_MODELS) pinned(fitted(c.fits[m]), K[m])
    expect(c.best).toBe(K.best)
    // Clearly different answers: competitive and uncompetitive are rejected outright, pure noncompetitive less so.
    expect(c.tests.uncompetitive!.p).toBeLessThan(1e-11)
    expect(c.tests.noncompetitive!.p).toBeGreaterThan(1e-3)
  })

  it('gives the chosen model and the comparison through the entry point', () => {
    const out = kinetics(inhibitionSeries(), 'noncompetitive')
    expect(out.fits).toHaveLength(1)
    pinned(fitted(out.fits[0]), K.noncompetitive)
    expect(out.comparison!.best).toBe('mixed')
    expect(out.notices).toEqual([])
  })

  it('is quick: a global mixed fit of 56 points well under 20 ms', () => {
    const series = inhibitionSeries()
    fitInhibition(series, 'mixed')
    const ms = timed(() => fitInhibition(series, 'mixed'))
    const all = timed(() => compareInhibition(series), 3)
    const mm = timed(() => fitMichaelis(K.mmAS, K.mmAV))
    console.log(`kinetics: Michaelis–Menten ${mm.toFixed(2)} ms, mixed ${ms.toFixed(2)} ms, all four compared ${all.toFixed(2)} ms`)
    expect(ms).toBeLessThan(20)
  })
})

describe('exact curves', () => {
  const S = [0, 1, 2, 5, 10, 20, 50, 100, 200]
  const I = [0, 2, 5, 10]
  const truth = { vmax: 80, km: 15, ki: 3, alpha: 4 }
  const exact = (model: KineticsModel, s: number, i: number) => {
    const { vmax, km, ki, alpha } = truth
    const a = 1 + i / ki
    if (model === 'mm') return (vmax * s) / (km + s)
    if (model === 'competitive') return (vmax * s) / (km * a + s)
    if (model === 'uncompetitive') return (vmax * s) / (km + s * a)
    if (model === 'noncompetitive') return (vmax * s) / ((km + s) * a)
    return (vmax * s) / (km * a + s * (1 + i / (alpha * ki)))
  }
  const seriesOf = (model: KineticsModel): KineticsSeries[] => I.map((i) => ({ name: `${i}`, inhibitor: i, s: S, v: S.map((s) => exact(model, s, i)) }))

  it('recovers Vmax and Km of a Michaelis–Menten curve', () => {
    const fit = fitted(fitMichaelis(S, S.map((s) => exact('mm', s, 0))))
    rel(fit.params.vmax!.value, 80, 1e-8)
    rel(fit.params.km!.value, 15, 1e-8)
    expect(fit.sse).toBeLessThan(1e-16)
    near(fit.r2, 1)
  })

  it('recovers every inhibition model, and its apparent Vmax and Km at each inhibitor concentration', () => {
    for (const model of INHIBITION_MODELS) {
      const fit = fitted(fitInhibition(seriesOf(model), model))
      for (const name of fit.names) rel(fit.params[name]!.value, truth[name], 1e-7)
      for (const i of [0, 2, 7.5, 40])
        for (const s of [0.5, 15, 300]) {
          rel(fit.predict(s, i), exact(model, s, i), 1e-7)
          const app = apparent(fit, i)
          rel((app.vmax * s) / (app.km + s), fit.predict(s, i), 1e-12)
        }
    }
  })

  it('says which model the noise-free data came from', () => {
    for (const model of ['competitive', 'uncompetitive', 'noncompetitive'] as const) {
      const c = compareInhibition(seriesOf(model))
      expect(isFit(c.fits[model])).toBe(true)
      expect(c.fits[model] && (c.fits[model] as KineticsFit).sse).toBeLessThan(1e-12)
    }
    const c = compareInhibition(seriesOf('mixed'))
    expect(c.best).toBe('mixed')
    for (const m of ['competitive', 'uncompetitive', 'noncompetitive'] as const) expect(c.tests[m]!.p).toBeLessThan(1e-10)
  })

  it('gives the closed forms of the apparent constants', () => {
    const fit = fitted(fitInhibition(seriesOf('mixed'), 'mixed'))
    const app = apparent(fit, 6)
    const a = 1 + 6 / 3
    const b = 1 + 6 / (4 * 3)
    rel(app.vmax, 80 / b, 1e-7)
    rel(app.km, (15 * a) / b, 1e-7)
    const mm = fitted(fitMichaelis(S, S.map((s) => exact('mm', s, 0))))
    expect(apparent(mm, 10)).toEqual({ vmax: mm.params.vmax!.value, km: mm.params.km!.value })
  })
})

describe('no curve, in words', () => {
  it('needs 3 or more substrate concentrations above 0', () => {
    expect(reasonOf(fitMichaelis([0, 0, 5, 5, 10, 10], [0, 0.1, 3, 3.2, 5, 5.1]))).toBe(
      'A Michaelis–Menten curve needs rates at 3 or more substrate concentrations above 0; there are 2.',
    )
    expect(reasonOf(fitMichaelis([5], [3]))).toMatch(/there is 1\./)
    expect(isFit(fitMichaelis([1, 5, 10], [2, 6, 8]))).toBe(true)
  })

  it('gives no curve for rates that keep rising in step with the substrate', () => {
    const s = [1, 2, 5, 10, 20, 50, 100]
    expect(reasonOf(fitMichaelis(s, s.map((x) => 0.3 * x)))).toMatch(/do not level off/)
    // With a little noise that bends the line upwards, the least-squares Km runs off too.
    const v = s.map((x, j) => 0.3 * x * (1 + 0.002 * (j % 2 ? 1 : -1)) + 0.0005 * x * x)
    expect(reasonOf(fitMichaelis(s, v))).toMatch(/do not level off/)
  })

  it('gives no curve for rates that do not rise, are all the same, or none above 0', () => {
    expect(reasonOf(fitMichaelis([1, 2, 5, 10], [9, 7, 5, 3]))).toMatch(/do not rise with the substrate/)
    expect(reasonOf(fitMichaelis([1, 2, 5, 10], [4, 4, 4, 4]))).toMatch(/all the same/)
    expect(reasonOf(fitMichaelis([1, 2, 5, 10], [-1, -2, -1, -3]))).toMatch(/None of the rates is above 0/)
  })

  it('gives no curve when the rates are already at their top at the lowest substrate', () => {
    const s = [10, 20, 50, 100, 200]
    expect(reasonOf(fitMichaelis(s, [50.2, 49.8, 50.1, 49.9, 50.3]))).toMatch(/already at their highest at the lowest substrate concentration/)
  })

  it('needs several series at different inhibitor concentrations for an inhibition model', () => {
    const one = inhibitionSeries().slice(0, 1)
    for (const model of INHIBITION_MODELS) expect(reasonOf(fitInhibition(one, model))).toMatch(/Add a series at another inhibitor concentration/)
    const same = inhibitionSeries().map((x) => ({ ...x, inhibitor: 5 }))
    expect(reasonOf(fitInhibition(same, 'competitive'))).toMatch(/2 or more different inhibitor concentrations/)
    const out = kinetics(one, 'mixed')
    expect(out.fits).toHaveLength(1)
    expect(isFit(out.fits[0])).toBe(false)
    expect(out.comparison).toBeUndefined()
  })

  it('names the series without an inhibitor concentration', () => {
    const series = inhibitionSeries()
    series[2] = { ...series[2], inhibitor: undefined }
    series[3] = { ...series[3], inhibitor: null }
    expect(reasonOf(fitInhibition(series, 'mixed'))).toBe(
      'An inhibition model needs the inhibitor concentration of every series (0 for the one without inhibitor). It is missing for: 10 µM, 20 µM.',
    )
    series[2] = { ...series[2], inhibitor: -1 }
    series[3] = { ...series[3], inhibitor: Number.NaN }
    expect(reasonOf(fitInhibition(series, 'competitive'))).toMatch(/missing for: 10 µM, 20 µM/)
    const c = compareInhibition(series)
    expect(c.best).toBeNull()
    for (const m of INHIBITION_MODELS) expect(isFit(c.fits[m])).toBe(false)
    expect(c.tests.competitive).toBeNull()
  })

  it('returns a model that cannot be fitted with its reason, and keeps the others', () => {
    // Purely competitive rates with a little noise: in the mixed model α runs off without end.
    const S = [1, 2, 5, 10, 20, 50, 100]
    const noise = [0.004, -0.003, 0.002, -0.004, 0.003, -0.002, 0.001]
    const series: KineticsSeries[] = [0, 4, 12].map((i) => ({
      name: `${i}`,
      inhibitor: i,
      s: S,
      v: S.map((s, j) => ((60 * s) / (8 * (1 + i / 2) + s)) * (1 + noise[(j + i) % 7])),
    }))
    const c = compareInhibition(series)
    expect(isFit(c.fits.competitive)).toBe(true)
    expect(reasonOf(c.fits.mixed)).toBe('In the mixed model α runs off without end: the inhibition behaves as competitive. Choose the competitive model.')
    // Without a mixed fit there is nothing to test the simpler models against; AICc still ranks them.
    expect(c.tests).toEqual({ competitive: null, uncompetitive: null, noncompetitive: null })
    expect(c.best).toBe('competitive')
  })
})

describe('reading the series', () => {
  it('leaves out points that are not numbers or below 0, and says so', () => {
    const s = [...K.mmAS, -5, Number.NaN, 10, Infinity]
    const v = [...K.mmAV, 3, 4, Number.NaN, 5]
    const out = kinetics([{ name: 'Wild type', s, v }], 'mm')
    pinned(fitted(out.fits[0]), K.mmA)
    expect(out.notices).toEqual(['Wild type: 4 points were left out (a substrate concentration below 0, or a value that is not a number).'])
    // A rate without a concentration (lists of different length) counts as left out too.
    const short = kinetics([{ name: 'A', s: [...K.mmAS, 7], v: K.mmAV }], 'mm')
    expect(short.notices).toEqual(['A: 1 point was left out (a substrate concentration below 0, or a value that is not a number).'])
    pinned(fitted(fitMichaelis(s, v)), K.mmA)
  })

  it('says when no series is without inhibitor, and leaves out an empty series', () => {
    const series = inhibitionSeries().slice(1)
    const out = kinetics([...series, { name: 'Spare', inhibitor: 40, s: [Number.NaN], v: [1] }], 'mixed')
    expect(isFit(out.fits[0]), JSON.stringify(out.fits[0])).toBe(true)
    // Without a series at 0, competitive inhibition can lower Km to 0 and still bend each series right.
    expect(reasonOf(out.comparison!.fits.competitive)).toMatch(/Km runs down to 0.*Add a series without inhibitor/)
    expect(out.notices.join(' ')).toMatch(/Spare: 1 point was left out/)
    expect(out.notices.join(' ')).toMatch(/Spare has no usable points and was left out/)
    expect(out.notices.join(' ')).toMatch(/None of the series is without inhibitor/)
  })

  it('never gives a number that is not finite', () => {
    const fit = fitted(fitInhibition(inhibitionSeries(), 'mixed'))
    const all = [fit.sse, fit.sy, fit.r2, fit.aic, fit.aicc, ...fit.cov.flat(), ...fit.names.flatMap((n) => Object.values(fit.params[n]!))]
    expect(all.every(Number.isFinite)).toBe(true)
  })
})
