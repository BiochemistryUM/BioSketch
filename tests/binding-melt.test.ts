// Saturation binding (src/model/binding.ts) and melting curves (src/model/melt.ts), pinned to R 4.4
// through tests/stats-reference.json, written by scripts/stats-reference.R (sections "saturation
// binding" and "melting curves"): nls on the same formulas, anova() for the Hill slope, lm() slopes
// for the derivative, t.test() for the comparison of Tm.

import { describe, expect, it } from 'vitest'
import ref from './stats-reference.json'
import { validateDoc } from '../src/io/files'
import { bindingOf, chartLayout, isBinding, isMelt, meltOf } from '../src/model/chart'
import { chartSample } from '../src/model/chartSamples'
import { bindingPair, fitBinding, fitTotalBinding, isBindingFit, type BindingFit, type BindingParam } from '../src/model/binding'
import { bindingCells, bindingMethods, meltCells, meltMethods } from '../src/model/bindingReport'
import { fitMelt, isMeltFit, melt, meltCondition, type MeltFit } from '../src/model/melt'
import type { ChartNode } from '../src/model/types'

interface NlsRef {
  names: string[]
  coef: number[]
  se: number[]
  lo: number[]
  hi: number[]
  n: number
  df: number
  sse: number
  sigma: number
  r2: number
}

const close = (a: number, b: number, rel = 1e-6) => expect(Math.abs(a - b)).toBeLessThanOrEqual(rel * Math.max(1, Math.abs(b)))

function sameAs(fit: BindingFit, r: NlsRef, names: BindingParam[]) {
  names.forEach((n, a) => {
    const e = fit.params[n]!
    close(e.value, r.coef[a])
    close(e.se, r.se[a], 1e-5)
    close(e.lo, r.lo[a], 1e-5)
    close(e.hi, r.hi[a], 1e-5)
  })
  expect(fit.n).toBe(r.n)
  expect(fit.df).toBe(r.df)
  close(fit.sse, r.sse, 1e-8)
  close(fit.sy, r.sigma, 1e-8)
  close(fit.r2, r.r2, 1e-8)
}

const chart = (start: Partial<ChartNode>): ChartNode => ({ id: 'c1', type: 'chart', x: 0, y: 0, w: 360, h: 260, rotation: 0, kind: 'scatter', groups: [], ...start })
const reopened = (n: ChartNode): ChartNode => validateDoc({ app: 'biosketch', version: 1, name: 't', width: 600, height: 400, background: '#ffffff', nodes: [n], customIcons: {} }).nodes[0] as ChartNode

const B = ref.binding
const M = ref.melt

describe('saturation binding, against R', () => {
  it('fits one site as nls(y ~ Bmax * x / (Kd + x))', () => {
    const f = fitBinding(B.oneX, B.oneY)
    expect(isBindingFit(f)).toBe(true)
    sameAs(f as BindingFit, B.one, ['bmax', 'kd'])
  })

  it('fits a Hill slope, and tests it against 1 as anova() does', () => {
    const f = fitBinding(B.hillX, B.hillY, 'hill') as BindingFit
    expect(isBindingFit(f)).toBe(true)
    sameAs(f, B.hill, ['bmax', 'kd', 'h'])
    close(f.hillTest!.f, B.hillF.f, 1e-6)
    expect(f.hillTest!.df2).toBe(B.hillF.df2)
    close(f.hillTest!.p, B.hillF.p, 1e-5)
  })

  it('fits total and nonspecific binding together, sharing NS and the background', () => {
    const f = fitTotalBinding({ name: 'Total', x: B.totX, y: B.totY }, { name: 'Nonspecific', x: B.totX, y: B.nsY }) as BindingFit
    expect(isBindingFit(f)).toBe(true)
    sameAs(f, B.total, ['bmax', 'kd', 'ns', 'bkg'])
    // The nonspecific line and the total curve.
    close(f.predict(4, false), f.params.ns!.value * 4 + f.params.bkg!.value)
    expect(f.predict(4, true)).toBeGreaterThan(f.predict(4, false))
  })

  it('says why there is no curve', () => {
    const x = [1, 2, 4, 8, 16]
    expect(fitBinding(x, x.map((v) => 3 * v))).toEqual({ reason: expect.stringMatching(/does not level off/) })
    expect(fitBinding([1, 2], [5, 6])).toEqual({ reason: expect.stringMatching(/3 or more concentrations/) })
    expect(fitBinding(x, [9, 7, 5, 3, 1])).toEqual({ reason: expect.stringMatching(/do not rise/) })
  })

  it('finds the nonspecific series by its name', () => {
    expect(bindingPair(['Total', 'NSB'])).toEqual({ total: 0, nonspecific: 1 })
    expect(bindingPair(['Non-specific', 'Receptor', 'Total binding'])).toEqual({ total: 2, nonspecific: 0 })
    expect(bindingPair(['WT', 'Mutant'])).toBeNull()
  })
})

function sameMelt(f: MeltFit, r: (typeof M.fits)['apo1']) {
  expect(f.window).toEqual(r.window)
  expect(f.direction).toBe(r.direction)
  const tm = f.tm as { value: number; se: number; lo: number; hi: number }
  close(tm.value, r.fit.coef[2])
  close(tm.se, r.fit.se[2], 1e-5)
  close(tm.lo, r.fit.lo[2], 1e-5)
  close(f.bottom!, r.fit.coef[0], 1e-6)
  close(f.top!, r.fit.coef[1], 1e-6)
  close(f.slope!, r.fit.coef[3], 1e-6)
  expect(f.n).toBe(r.fit.n)
  close(f.r2!, r.fit.r2, 1e-8)
}

describe('melting curves, against R', () => {
  const names = ['apo1', 'apo2', 'drug1', 'drug2'] as const
  it.each(names)('finds the transition, the Boltzmann Tm and the derivative Tm of %s', (name) => {
    const r = M.fits[name]
    const y = M[name]
    sameMelt(fitMelt(M.t, y) as MeltFit, r)
    const d = fitMelt(M.t, y, { method: 'derivative' }) as MeltFit
    close(d.tm.value, r.tmDerivative, 1e-9)
    expect(d.window).toEqual(r.window)
  })

  it('reads a falling signal the other way round', () => {
    const f = fitMelt(M.cdT, M.cd) as MeltFit
    expect(f.direction).toBe(-1)
    sameMelt(f, M.cdFit)
  })

  it('compares the conditions of replicate curves by Welch’s t test', () => {
    const r = melt(names.map((n, i) => ({ name: ['Apo 1', 'Apo 2', 'Drug 1', 'Drug 2'][i], t: M.t, y: M[n] })))
    expect(r.conditions.map((c) => c.name)).toEqual(['Apo', 'Drug'])
    close(r.conditions[1].delta, M.delta, 1e-6)
    close(r.conditions[1].test!.t, M.welch.statistic, 1e-5)
    close(r.conditions[1].test!.p, M.welch.p, 1e-4)
    expect(r.notices).toEqual([])
  })

  it('takes a range set by the scientist and says when there is no transition', () => {
    const f = fitMelt(M.t, M.apo1, { from: 40, to: 60 }) as MeltFit
    expect(f.window).toEqual([40, 60])
    expect(Math.abs(f.tm.value - 52)).toBeLessThan(0.5)
    const flat = M.t.map(() => 100)
    expect(isMeltFit(fitMelt(M.t, flat))).toBe(false)
    expect(fitMelt([1, 2, 3], [1, 2, 3])).toEqual({ reason: expect.stringMatching(/9 or more temperatures/) })
  })

  it('names conditions without the replicate number', () => {
    expect(meltCondition('Apo 2')).toBe('Apo')
    expect(meltCondition('Drug (3)')).toBe('Drug')
    expect(meltCondition('WT_rep1')).toBe('WT')
    expect(meltCondition('A1')).toBe('A1')
  })
})

describe('binding and melting charts', () => {
  it('draw the examples without notices and survive a file', () => {
    for (const kind of ['binding', 'melt'] as const) {
      const node = chart(chartSample(kind) as Partial<ChartNode>)
      expect(chartLayout(node).notes).toEqual([])
      expect(reopened(node)).toEqual(node)
    }
    const b = chart(chartSample('binding') as Partial<ChartNode>)
    expect(isBinding(b)).toBe(true)
    expect(isMelt(chart(chartSample('melt') as Partial<ChartNode>))).toBe(true)
    expect(reopened(chart({ groups: b.groups, binding: { model: 'cubic' as never } })).binding).toEqual({})
    expect(reopened(chart({ groups: b.groups, melt: { from: 70, to: 40 } })).melt).toEqual({})
  })

  it('draws melting curves as lines with the Tm marked, scaled, and as derivatives', () => {
    const node = chart(chartSample('melt') as Partial<ChartNode>)
    const plain = chartLayout(node)
    const rings = plain.circles.filter((c) => c.ring)
    expect(rings).toHaveLength(node.groups.length)
    expect(plain.circles.length).toBe(rings.length)
    const scaled = chartLayout({ ...node, melt: { ...node.melt, normalise: true } })
    expect(JSON.stringify(scaled)).toContain('Normalised signal')
    const peaks = chartLayout({ ...node, melt: { ...node.melt, view: 'derivative' } })
    expect(JSON.stringify(peaks)).toMatch(/dF\/dT/)
    expect(peaks.notes).toEqual([])
  })

  it('draws a Scatchard plot of the one-site model', () => {
    const node = chart({ ...(chartSample('binding') as Partial<ChartNode>), binding: { scatchard: true } })
    const text = JSON.stringify(chartLayout(node))
    expect(text).toContain('Bound (fmol/mg) / free')
  })

  it('writes the results and the methods', () => {
    const b = chart(chartSample('binding') as Partial<ChartNode>)
    const cells = bindingCells(b, bindingOf(b))
    expect(cells[0]).toEqual(['Series', 'Parameter', 'Estimate', 'SE', '95 % CI low', '95 % CI high'])
    expect(cells.some((r) => r[1] === 'Kd')).toBe(true)
    expect(bindingMethods(b, bindingOf(b))).toMatch(/one-site.*nls\(B ~ Bmax \* x \/ \(Kd \+ x\)\)/)
    const m = chart(chartSample('melt') as Partial<ChartNode>)
    expect(meltCells(m, meltOf(m))[0][0]).toBe('Curve')
    expect(meltMethods(m, meltOf(m))).toMatch(/Boltzmann/)
  })
})
