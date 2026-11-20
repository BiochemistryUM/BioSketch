// Standard curves (src/model/standardCurve.ts), pinned to R 4.4 through tests/stats-reference.json,
// written by scripts/stats-reference.R: lm for the straight line and the quadratic, drc's drm with
// LL.4 and LL.5 (polished by nls) for the logistic curves, uniroot on R's fitted curve for the
// concentrations read off it. The data there are made up, shaped like real plates.

import { describe, expect, it } from 'vitest'
import ref from './stats-reference.json'
import { fitStandard, standardCurve, type StandardFit, type StandardInput, type StandardModel } from '../src/model/standardCurve'

const near = (got: number | null | undefined, want: number, tolerance = 1e-9) => {
  expect(got).not.toBeNull()
  expect(got).not.toBeUndefined()
  expect(Math.abs((got as number) - want), `${got} against ${want}`).toBeLessThanOrEqual(tolerance * Math.max(1, Math.abs(want)))
}
const rel = (got: number | null | undefined, want: number, tolerance: number) => {
  expect(got).not.toBeNull()
  expect(Math.abs((got as number) / want - 1), `${got} against ${want}`).toBeLessThanOrEqual(tolerance)
}

interface PolyRef { x: number[]; y: number[]; coef: number[]; sse: number; sy: number; df: number; r2: number; fitted: number[]; signals: number[]; conc: (number | null)[] }
interface LogRef extends Omit<PolyRef, 'coef'> { b: number; c: number; d: number; e: number; f: number; drm: number[]; drmSse: number }
const S = (ref as unknown as { standard: Record<string, PolyRef & LogRef> }).standard
const pointsOf = (r: { x: number[]; y: number[] }) => r.x.map((x, i) => [x, r.y[i]] as [number, number])

/** The rows of a plate from the reference data: one standard per concentration, its replicates in order. */
function plate(r: { x: number[]; y: number[] }, signals: number[], model: StandardModel, blank = false): StandardInput {
  const concs = [...new Set(r.x)]
  return {
    model,
    blank,
    standards: concs.map((c, i) => ({ name: `S${i + 1}`, conc: c, values: r.y.filter((_, j) => r.x[j] === c) })),
    samples: signals.map((v, i) => ({ name: `U${i + 1}`, values: [v] })),
  }
}

function checkInverse(fit: StandardFit, r: { signals: number[]; conc: (number | null)[] }, tolerance: number) {
  r.signals.forEach((s, i) => {
    const want = r.conc[i]
    if (want === null) expect(fit.inverse(s), `signal ${s}`).toBeNull()
    else rel(fit.inverse(s), want, tolerance)
  })
}

describe('straight line and quadratic (R: lm)', () => {
  it('fits the BCA standards with a straight line through every replicate', () => {
    const r = S.bcaLinear
    const fit = fitStandard(pointsOf(r), 'linear')!
    expect(fit.model).toBe('linear')
    near(fit.params[0], r.coef[0])
    rel(fit.params[1], r.coef[1], 1e-10)
    rel(fit.sse, r.sse, 1e-9)
    rel(fit.sy, r.sy, 1e-9)
    near(fit.r2, r.r2)
    expect(fit.df).toBe(r.df)
    expect(fit.n).toBe(16)
    r.x.forEach((x, i) => near(fit.predict(x), r.fitted[i]))
    checkInverse(fit, r, 1e-10)
    expect(fit.rising).toBe(true)
  })

  it('fits the BCA standards with a quadratic and reads signals on its rising part', () => {
    const r = S.bcaQuadratic
    const fit = fitStandard(pointsOf(r), 'quadratic')!
    near(fit.params[0], r.coef[0])
    rel(fit.params[1], r.coef[1], 1e-9)
    rel(fit.params[2], r.coef[2], 1e-8)
    rel(fit.sse, r.sse, 1e-8)
    rel(fit.sy, r.sy, 1e-8)
    near(fit.r2, r.r2)
    expect(fit.df).toBe(13)
    r.x.forEach((x, i) => near(fit.predict(x), r.fitted[i]))
    checkInverse(fit, r, 1e-9)
    // The parabola turns at about 3943, beyond the standards: no notice of a turn.
    expect(fit.turn).toBeUndefined()
  })

  it('subtracts the blank before fitting and reading (R: lm on the signals minus the mean of the zero standards)', () => {
    const r = S.bcaBlankLinear
    const raw = S.bcaLinear
    const out = standardCurve(plate(raw, raw.signals, 'linear', true))
    near(out.blank, 0.098)
    near(out.fit!.params[0], r.coef[0])
    rel(out.fit!.params[1], r.coef[1], 1e-10)
    rel(out.fit!.sse, r.sse, 1e-9)
    near(out.standards[0].mean, 0)
    near(out.standards[1].mean, 0.1235 - 0.098)
    out.samples.forEach((s, i) => {
      const want = r.conc[i]
      if (want === null) expect(s.conc).toBeNull()
      else rel(s.conc, want, 1e-10)
    })
    // The sample whose signal is below the blank has no concentration.
    expect(out.samples[0].flag).toBe('none')
    expect(out.samples[0].side).toBe('below')
    // The last one is above the highest standard: extrapolated, and flagged.
    expect(out.samples[4].flag).toBe('above')
    expect(out.notices.some((n) => n.includes('extrapolated'))).toBe(true)
  })
})

describe('four- and five-parameter logistic (R: drc::drm with LL.4 and LL.5)', () => {
  it('fits a rising sandwich ELISA with four parameters, hill = −b of drc', () => {
    const r = S.elisa4
    const fit = fitStandard(pointsOf(r), '4pl')!
    expect(fit.model).toBe('4pl')
    const [bottom, top, ec50, hill] = fit.params
    near(bottom, r.c, 1e-6)
    rel(top, r.d, 2e-6)
    rel(ec50, r.e, 2e-6)
    rel(hill, -r.b, 2e-6)
    // At least as good a fit as R's, and the same misfit to many digits.
    expect(fit.sse).toBeLessThanOrEqual(r.sse * (1 + 1e-12))
    rel(fit.sse, r.sse, 1e-9)
    rel(fit.sy, r.sy, 1e-9)
    near(fit.r2, r.r2)
    expect(fit.df).toBe(20)
    r.x.forEach((x, i) => near(fit.predict(x), r.fitted[i], 1e-6))
    checkInverse(fit, r, 2e-6)
    // drm's own answer, before polishing, is a little short of the least-squares solution.
    rel(ec50, r.drm[3], 1e-4)
    expect(fit.sse).toBeLessThanOrEqual(r.drmSse)
  })

  it('fits the same plate with five parameters, asym = f of drc', () => {
    const r = S.elisa5
    const fit = fitStandard(pointsOf(r), '5pl')!
    expect(fit.model).toBe('5pl')
    const [bottom, top, ec50, hill, asym] = fit.params
    near(bottom, r.c, 1e-6)
    rel(top, r.d, 2e-6)
    rel(ec50, r.e, 2e-6)
    rel(hill, -r.b, 2e-6)
    rel(asym, r.f, 2e-6)
    expect(fit.sse).toBeLessThanOrEqual(r.sse * (1 + 1e-12))
    rel(fit.sse, r.sse, 1e-9)
    rel(fit.sy, r.sy, 1e-9)
    expect(fit.df).toBe(19)
    r.x.forEach((x, i) => near(fit.predict(x), r.fitted[i], 1e-6))
    checkInverse(fit, r, 2e-6)
    // The five-parameter curve fits these standards better than the four-parameter one.
    expect(fit.sse).toBeLessThan(S.elisa4.sse)
  })

  it('fits a falling competitive ELISA: bottom is the signal at 0, drc has b > 0 and its c and d swapped', () => {
    const r = S.competitive4
    const fit = fitStandard(pointsOf(r), '4pl')!
    const [bottom, top, ec50, hill] = fit.params
    rel(bottom, r.d, 2e-6)
    rel(top, r.c, 2e-6)
    rel(ec50, r.e, 2e-6)
    rel(hill, r.b, 2e-6)
    expect(hill).toBeGreaterThan(0)
    expect(fit.rising).toBe(false)
    rel(fit.sse, r.sse, 1e-9)
    r.x.forEach((x, i) => near(fit.predict(x), r.fitted[i], 1e-6))
    checkInverse(fit, r, 2e-6)
  })

  it('flags samples of a falling curve by the side of the standards they lie on', () => {
    const r = S.competitive4
    const out = standardCurve(plate(r, r.signals, '4pl'))
    const flags = out.samples.map((s) => s.flag)
    const sides = out.samples.map((s) => s.side)
    // 1.95: more signal than the curve has at 0. 1.70: more than the lowest standard, so a
    // concentration below it. 1.00 and 0.40: inside. 0.20: less than the highest standard.
    // 0.10: beyond the plateau at high concentrations.
    expect(flags).toEqual(['none', 'below', 'ok', 'ok', 'above', 'none'])
    expect(sides).toEqual(['below', 'below', null, null, 'above', 'above'])
    rel(out.samples[1].conc, r.conc[1]!, 2e-6)
    rel(out.samples[4].conc, r.conc[4]!, 2e-6)
    expect(out.range).toEqual({ lo: 1.56, hi: 100 })
  })

  it('gives no concentration beyond a plateau of a rising curve', () => {
    const r = S.elisa5
    const out = standardCurve(plate(r, r.signals, '5pl'))
    expect(out.samples.map((s) => s.flag)).toEqual(['none', 'below', 'ok', 'ok', 'none'])
    expect(out.samples[4].side).toBe('above')
    expect(out.notices.some((n) => n.includes('never reaches'))).toBe(true)
  })
})

describe('exact curves', () => {
  const concs = [0, 1, 2, 5, 10, 20, 50, 100, 200, 500]
  const four = (x: number) => 0.1 + (2.5 - 0.1) / (1 + (40 / x) ** 1.3)
  const five = (x: number) => 0.05 + (3 - 0.05) / (1 + (60 / x) ** 1.8) ** 0.4

  it('recovers the parameters of a four-parameter curve, zero concentration included', () => {
    const fit = fitStandard(concs.map((x) => [x, x === 0 ? 0.1 : four(x)]), '4pl')!
    ;[0.1, 2.5, 40, 1.3].forEach((v, i) => rel(fit.params[i], v, 1e-6))
    expect(fit.sse).toBeLessThan(1e-12)
    near(fit.predict(0), 0.1)
    rel(fit.inverse(four(33))!, 33, 1e-6)
    expect(fit.inverse(fit.params[0])).toBe(0)
    expect(fit.inverse(2.5)).toBeNull()
    expect(fit.inverse(0.05)).toBeNull()
  })

  it('recovers the parameters of a five-parameter curve', () => {
    const fit = fitStandard(concs.map((x) => [x, x === 0 ? 0.05 : five(x)]), '5pl')!
    ;[0.05, 3, 60, 1.8, 0.4].forEach((v, i) => rel(fit.params[i], v, 1e-5))
    rel(fit.inverse(five(77))!, 77, 1e-6)
  })

  it('recovers a falling four-parameter curve given the other way round', () => {
    const fall = (x: number) => 2 + (0.2 - 2) / (1 + (8 / x) ** 1.1)
    const fit = fitStandard(concs.map((x) => [x, x === 0 ? 2 : fall(x)]), '4pl')!
    ;[2, 0.2, 8, 1.1].forEach((v, i) => rel(fit.params[i], v, 1e-6))
    expect(fit.rising).toBe(false)
    rel(fit.inverse(fall(3))!, 3, 1e-6)
  })

  it('recovers a straight line and a quadratic', () => {
    const line = fitStandard([0, 0, 1, 2, 4].map((x) => [x, 0.05 + 0.3 * x]), 'linear')!
    rel(line.params[1], 0.3, 1e-12)
    near(line.params[0], 0.05, 1e-12)
    const quad = fitStandard([0, 250, 500, 1000, 1500, 2000].map((x) => [x, 0.1 + 1e-3 * x - 1.5e-7 * x * x]), 'quadratic')!
    ;[0.1, 1e-3, -1.5e-7].forEach((v, i) => rel(quad.params[i], v, 1e-8))
    rel(quad.inverse(0.1 + 1e-3 * 700 - 1.5e-7 * 700 * 700)!, 700, 1e-9)
  })

  it('reads a quadratic only on the part that runs the way the standards do', () => {
    // y = 2 x - x² rises up to x = 1 and falls after: standards up to 1.5 go past the turn.
    const pts = [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5].map((x) => [x, 2 * x - x * x] as [number, number])
    const fit = fitStandard(pts, 'quadratic')!
    near(fit.turn, 1, 1e-9)
    rel(fit.inverse(0.75)!, 0.5, 1e-9) // not 1.5, the root beyond the turn
    expect(fit.inverse(1.01)).toBeNull() // above the top of the parabola
    const out = standardCurve({ model: 'quadratic', standards: pts.map(([x, y], i) => ({ name: `S${i}`, conc: x, values: [y] })), samples: [] })
    expect(out.notices.some((n) => n.includes('turns back'))).toBe(true)
  })
})

describe('a plate', () => {
  const standards = [
    { name: 'Blank', conc: 0, values: [0.1, 0.12] },
    { name: 'S1', conc: 100, values: [0.3, 0.32] },
    { name: 'S2', conc: 200, values: [0.5, 0.52] },
    { name: 'S3', conc: 400, values: [0.9, 0.92] },
  ]

  it('reports the mean, scatter and recovery of every standard', () => {
    const out = standardCurve({ model: 'linear', standards, samples: [] })
    expect(out.fit).not.toBeNull()
    near(out.standards[1].mean, 0.31)
    near(out.standards[1].sd, Math.sqrt(0.0002))
    rel(out.standards[1].back, 100, 1e-9) // the line passes through every mean
    rel(out.standards[1].recovery, 100, 1e-9)
    expect(out.standards[0].recovery).toBeNull()
    expect(out.range).toEqual({ lo: 100, hi: 400 })
    expect(out.blank).toBeNull()
  })

  it('multiplies by the dilution and works out the scatter of the replicates', () => {
    const out = standardCurve({ model: 'linear', standards, samples: [{ name: 'Lysate', values: [0.4, 0.42], dilution: 10 }, { name: 'Serum', values: [0.61] }] })
    const [lysate, serum] = out.samples
    rel(lysate.conc, 1500, 1e-9)
    expect(lysate.dilution).toBe(10)
    near(lysate.mean, 0.41)
    near(lysate.cv, (Math.sqrt(0.0002) / 0.41) * 100)
    expect(lysate.flag).toBe('ok')
    rel(serum.conc, 250, 1e-9)
    expect(serum.sd).toBeNull()
    expect(serum.cv).toBeNull()
  })

  it('flags a sample below the lowest standard but still gives what the line says', () => {
    const out = standardCurve({ model: 'linear', standards, samples: [{ name: 'Weak', values: [0.2] }] })
    expect(out.samples[0].flag).toBe('below')
    rel(out.samples[0].conc, 45, 1e-9)
  })

  it('subtracts the blank from every signal', () => {
    const out = standardCurve({ model: 'linear', blank: true, standards, samples: [{ name: 'U', values: [0.41] }] })
    near(out.blank, 0.11)
    near(out.standards[0].mean, 0)
    near(out.samples[0].mean, 0.3)
    near(out.fit!.params[0], 0)
    rel(out.samples[0].conc, 150, 1e-9)
  })

  it('says so when a blank is asked for and there is no standard at 0', () => {
    const out = standardCurve({ model: 'linear', blank: true, standards: standards.slice(1), samples: [] })
    expect(out.blank).toBeNull()
    expect(out.notices.some((n) => n.includes('no standard at concentration 0'))).toBe(true)
    rel(out.fit!.params[1], 0.002, 1e-9)
  })

  it('leaves out values and standards that are not numbers, and says so', () => {
    const out = standardCurve({
      model: 'linear',
      standards: [...standards, { name: 'Bad', conc: Number.NaN, values: [5] }, { name: 'S4', conc: 800, values: [Number.NaN, 1.71, Infinity] }],
      samples: [{ name: 'U', values: [0.5, Number.NaN], dilution: Number.NaN }, { name: 'Empty', values: [Number.NaN] }],
    })
    expect(out.fit).not.toBeNull()
    expect(out.standards.map((s) => s.name)).toEqual(['Blank', 'S1', 'S2', 'S3', 'S4'])
    expect(out.standards[4].mean).toBe(1.71)
    expect(out.samples.map((s) => s.name)).toEqual(['U'])
    expect(out.samples[0].dilution).toBe(1)
    expect(out.notices.join(' ')).toMatch(/4 values that are not numbers were left out/)
    expect(out.notices.join(' ')).toMatch(/Bad/)
    expect(out.notices.join(' ')).toMatch(/Empty/)
    expect(out.notices.join(' ')).toMatch(/dilution/)
    const all = [out.fit!.sse, out.fit!.sy, out.fit!.r2, ...out.fit!.params, ...out.standards.flatMap((s) => [s.mean, s.sd ?? 0]), out.samples[0].conc ?? 0]
    expect(all.every(Number.isFinite)).toBe(true)
    expect(fitStandard([[Number.NaN, 1], [0, 0.1], [1, 0.2], [2, 0.3]], 'linear')!.n).toBe(3)
  })
})

describe('no curve', () => {
  it('needs enough standards of different concentration for each kind of curve', () => {
    const at = (concs: number[], reps = 2) => concs.flatMap((c) => Array.from({ length: reps }, (_, k) => [c, 0.1 + c / 100 + k * 0.01] as [number, number]))
    expect(fitStandard(at([0]), 'linear')).toBeNull()
    expect(fitStandard(at([0, 10], 1), 'linear')).toBeNull() // two points: nothing to judge the line by
    expect(fitStandard(at([0, 10]), 'linear')).not.toBeNull()
    expect(fitStandard(at([0, 10, 20], 1), 'quadratic')).toBeNull()
    expect(fitStandard(at([0, 10, 20]), 'quadratic')).not.toBeNull()
    const four = standardCurve({ model: '4pl', standards: [0, 1, 2, 4].map((c) => ({ name: `S${c}`, conc: c, values: [c, c + 0.1] })), samples: [{ name: 'U', values: [1] }] })
    expect(four.fit).toBeNull()
    expect(four.reason).toBe('A four-parameter curve needs at least 5 standards of different concentration; there are 4.')
    expect(four.samples[0].flag).toBe('none')
    expect(four.samples[0].conc).toBeNull()
    const fiveStd = standardCurve({ model: '5pl', standards: [0, 1, 2, 4, 8].map((c) => ({ name: `S${c}`, conc: c, values: [c] })), samples: [] })
    expect(fiveStd.reason).toMatch(/five-parameter curve needs at least 6/)
  })

  it('gives no curve when the signals do not change', () => {
    const out = standardCurve({ model: 'linear', standards: [0, 1, 2].map((c) => ({ name: `S${c}`, conc: c, values: [0.5, 0.5] })), samples: [] })
    expect(out.fit).toBeNull()
    expect(out.reason).toMatch(/all the same/)
  })

  it('gives no curve when the signal jumps between two standards (the search does not settle)', () => {
    const steps: [number, number][] = [1, 2, 4, 8, 16, 32].flatMap((c) => [[c, c < 6 ? 0.1 : 1.2], [c, c < 6 ? 0.1 : 1.2]] as [number, number][])
    expect(fitStandard(steps, '4pl')).toBeNull()
    expect(fitStandard(steps, '5pl')).toBeNull()
    const out = standardCurve({ model: '4pl', standards: [1, 2, 4, 8, 16, 32].map((c) => ({ name: `S${c}`, conc: c, values: [c < 6 ? 0.1 : 1.2, c < 6 ? 0.1 : 1.2] })), samples: [] })
    expect(out.reason).toMatch(/do not settle on one four-parameter curve/)
  })

  it('gives no logistic curve through standards on a straight line (no bend to fit)', () => {
    const line: [number, number][] = [0, 100, 200, 300, 400, 500].flatMap((c) => [[c, 0.1 + c / 1000], [c, 0.1 + c / 1000]] as [number, number][])
    expect(fitStandard(line, '4pl')).toBeNull()
  })
})
