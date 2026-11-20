// Melting curves: a signal (fluorescence of a dye in a thermal shift assay, absorbance of DNA,
// circular dichroism) read at rising temperatures, and the temperature where the change is
// halfway (Tm). Two definitions, both common:
// - the Boltzmann sigmoid (GraphPad Prism's "Boltzmann sigmoidal"), fitted by least squares to the
//   readings of the transition: y = bottom + (top − bottom) / (1 + exp((Tm − T) / slope)), slope
//   above 0, every replicate a point (R: nls with the same formula);
// - the derivative: the temperature where the signal changes fastest. The rate of change at each
//   temperature is the slope of the straight line through the mean signal at that temperature
//   and the three on either side (R: coef(lm) in a window of seven readings); Tm is the top of
//   the parabola through the steepest reading and its two neighbours.
// The transition is found the same way for both: from the steepest change, back to the lowest
// reading before it and on to the highest after it (or the other way round for a falling signal),
// so that the fall of a thermal shift curve after its peak, where the protein clumps, is left out.
// A range set by the scientist (`from`, `to`) replaces it.

import { welchT } from './chartTests'
import { nls, type Estimate } from './nls'
import type { ChartNode, MeltSettings } from './types'

export interface MeltSeries {
  name: string
  /** Temperatures, one per reading. */
  t: number[]
  y: number[]
}

export interface MeltFit {
  method: 'boltzmann' | 'derivative'
  /** The melting temperature; with its standard error and interval for the Boltzmann fit only. */
  tm: Estimate | { value: number }
  /** The readings used: the transition. */
  window: [number, number]
  /** +1 when the signal rises through the transition, −1 when it falls. */
  direction: 1 | -1
  /** Boltzmann: the fitted plateaus and slope; the curve. */
  bottom?: number
  top?: number
  slope?: number
  predict?: (t: number) => number
  n: number
  r2?: number
}

export interface NoFit {
  reason: string
}

export const isMeltFit = (f: MeltFit | NoFit | null | undefined): f is MeltFit => !!f && 'method' in f

/** The rate of change of the mean signal at each temperature where seven readings surround it. */
export interface Derivative {
  t: number[]
  d: number[]
}

/** The Tm of one condition: its curves (series whose names differ only by a replicate number) taken together. */
export interface MeltCondition {
  name: string
  series: number[]
  tms: number[]
  mean: number
  sd: number | null
  /** Tm less that of the first condition. */
  delta: number
  /** Welch's t test of the Tm values against those of the first condition, when both have two or more curves. */
  test: { t: number; df: number; p: number } | null
}

export interface MeltResult {
  fits: (MeltFit | NoFit | null)[]
  derivatives: (Derivative | null)[]
  conditions: MeltCondition[]
  notices: string[]
}

const mean = (v: number[]): number => v.reduce((a, x) => a + x, 0) / v.length
const HALF = 3

/** Mean signal at each temperature, in order of temperature. */
export function profile(t: number[], y: number[]): { t: number; y: number }[] {
  const m = new Map<number, number[]>()
  t.forEach((tt, k) => {
    const v = y[k]
    if (Number.isFinite(tt) && typeof v === 'number' && Number.isFinite(v)) m.set(tt, [...(m.get(tt) ?? []), v])
  })
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([tt, vs]) => ({ t: tt, y: mean(vs) }))
}

/** The slope of the least-squares line through the readings i − 3 … i + 3, at every i that has them. */
export function derivative(p: { t: number; y: number }[]): Derivative {
  const out: Derivative = { t: [], d: [] }
  for (let i = HALF; i < p.length - HALF; i++) {
    const w = p.slice(i - HALF, i + HALF + 1)
    const mt = mean(w.map((q) => q.t))
    const my = mean(w.map((q) => q.y))
    const sxx = w.reduce((a, q) => a + (q.t - mt) ** 2, 0)
    out.t.push(p[i].t)
    out.d.push(w.reduce((a, q) => a + (q.t - mt) * (q.y - my), 0) / sxx)
  }
  return out
}

/** The top of the parabola through three points; the middle one when they lie on a line. */
function vertex(t: [number, number, number], y: [number, number, number]): number {
  const [a, b, c] = t
  const [ya, yb, yc] = y
  const den = (a - b) * (a - c) * (b - c)
  const A = (c * (yb - ya) + b * (ya - yc) + a * (yc - yb)) / den
  const B = (c * c * (ya - yb) + b * b * (yc - ya) + a * a * (yb - yc)) / den
  return A < 0 && Number.isFinite(A) && Number.isFinite(B) ? -B / (2 * A) : b
}

/** The derivative Tm of a profile, or why there is none. */
function steepest(p: { t: number; y: number }[]): { tm: number; i: number; direction: 1 | -1 } | NoFit {
  if (p.length < 2 * HALF + 3) return { reason: `A melting temperature needs readings at ${2 * HALF + 3} or more temperatures; there are ${p.length}.` }
  const der = derivative(p)
  let k = 0
  for (let j = 1; j < der.d.length; j++) if (Math.abs(der.d[j]) > Math.abs(der.d[k])) k = j
  if (!(Math.abs(der.d[k]) > 0)) return { reason: 'The signal does not change with the temperature, so there is no transition.' }
  const direction: 1 | -1 = der.d[k] > 0 ? 1 : -1
  if (k === 0 || k === der.d.length - 1)
    return { reason: 'The signal changes fastest at the edge of the temperatures measured, so the transition may lie outside them. Measure over a wider range, or set the range of the transition.' }
  const tm = vertex([der.t[k - 1], der.t[k], der.t[k + 1]], [direction * der.d[k - 1], direction * der.d[k], direction * der.d[k + 1]])
  return { tm, i: k + HALF, direction }
}

/** The readings of the transition: from the steepest change back to the lowest reading before it and on to the highest after it (mirrored for a falling signal). */
function transition(p: { t: number; y: number }[], i: number, direction: 1 | -1): [number, number] {
  let lo = i
  for (let j = i; j >= 0; j--) if (direction * p[j].y < direction * p[lo].y) lo = j
  let hi = i
  for (let j = i; j < p.length; j++) if (direction * p[j].y > direction * p[hi].y) hi = j
  return [p[lo].t, p[hi].t]
}

/** The Tm of one curve. */
export function fitMelt(t: number[], y: number[], given: MeltSettings = {}): MeltFit | NoFit {
  // A range whose start is not below its end is not used (it is not saved either).
  const settings = given.from !== undefined && given.to !== undefined && !(given.from < given.to) ? { ...given, from: undefined, to: undefined } : given
  const all = profile(t, y)
  const set = (v: number | undefined): v is number => typeof v === 'number' && Number.isFinite(v)
  const inRange = (tt: number) => (!set(settings.from) || tt >= settings.from) && (!set(settings.to) || tt <= settings.to)
  const p = all.filter((q) => inRange(q.t))
  const steep = steepest(p)
  if ('reason' in steep) return steep
  const window: [number, number] = set(settings.from) && set(settings.to) ? [settings.from, settings.to] : transition(p, steep.i, steep.direction)
  if (set(settings.from)) window[0] = settings.from
  if (set(settings.to)) window[1] = settings.to
  const pts = t.map((tt, k) => ({ x: tt, y: y[k] })).filter((q) => Number.isFinite(q.x) && typeof q.y === 'number' && Number.isFinite(q.y) && q.x >= window[0] && q.x <= window[1])
  if (settings.method === 'derivative') return { method: 'derivative', tm: { value: steep.tm }, window, direction: steep.direction, n: pts.length }
  const within = p.filter((q) => q.t >= window[0] && q.t <= window[1])
  if (within.length < 6) return { reason: `The transition holds readings at ${within.length} temperatures; a Boltzmann curve needs 6 or more. Set a wider range, or use the derivative.` }
  const first = within[0].y
  const last = within[within.length - 1].y
  const span = window[1] - window[0]
  const starts = [span / 20, span / 8, span / 4].flatMap((s) => [
    [first, last, steep.tm, s],
    [first, last, (window[0] + window[1]) / 2, s],
  ])
  const curve = (th: number[], q: { x: number }) => {
    const [b, tp, tm, s] = th
    const e = Math.exp((tm - q.x) / s)
    const f = 1 / (1 + e)
    const g = (tp - b) * f * f * e
    return { y: b + (tp - b) * f, d: [1 - f, f, -g / s, (g * (tm - q.x)) / (s * s)] }
  }
  const out = nls(pts, curve, starts, [false, false, false, true])
  const fit = out.fit
  if (!fit || out.ranOff) return { reason: 'The readings do not settle on one Boltzmann curve. Set the range of the transition, or use the derivative.' }
  const [bottom, top, tm, slope] = fit.th
  if (!(tm >= window[0] && tm <= window[1])) return { reason: 'The middle of the fitted curve lies outside the transition: the readings do not show its middle. Set the range, or use the derivative.' }
  if (!(slope < span)) return { reason: 'The readings show no clear transition: the fitted curve is nearly a straight line.' }
  return {
    method: 'boltzmann',
    tm: fit.est[2],
    window,
    direction: top >= bottom ? 1 : -1,
    bottom,
    top,
    slope,
    predict: (x: number) => curve(fit.th, { x }).y,
    n: fit.n,
    r2: fit.r2,
  }
}

/** The condition of a curve: its name without a replicate number ("Apo 2" is Apo, "Drug (3)" is Drug). */
export function meltCondition(name: string): string {
  const s = name.trim()
  const m = /^(.*?)[\s_.#-]*(?:\(\s*\d{1,3}\s*\)|(?:rep|replicate|well|r|n)?[\s_.#-]*\d{1,3})$/i.exec(s)
  const base = m ? m[1].replace(/[\s_.#-]+$/, '') : ''
  return base && /[A-Za-zΑ-ω]/.test(base) && base.length >= 2 ? base : s
}

/** The series of a melting chart, as columns of temperatures and readings. */
export function meltColumns(node: Pick<ChartNode, 'groups'>): MeltSeries[] {
  return node.groups.map((g) => {
    const t: number[] = []
    const y: number[] = []
    g.values.forEach((v, k) => {
      const x = g.xs?.[k]
      if (x === undefined) return
      t.push(x)
      y.push(v)
    })
    return { name: g.name, t, y }
  })
}

/** Every Tm of a melting chart, the derivative of every curve, and the conditions compared with the first. */
export function melt(series: MeltSeries[], settings: MeltSettings = {}): MeltResult {
  const fits = series.map((s) => (s.y.length ? fitMelt(s.t, s.y, settings) : null))
  const derivatives = series.map((s) => {
    const p = profile(s.t, s.y)
    return p.length >= 2 * HALF + 1 ? derivative(p) : null
  })
  const notices: string[] = []
  const by = new Map<string, number[]>()
  series.forEach((s, i) => {
    if (s.y.length) by.set(meltCondition(s.name), [...(by.get(meltCondition(s.name)) ?? []), i])
  })
  const conditions: MeltCondition[] = []
  for (const [name, members] of by) {
    const tms = members.map((i) => fits[i]).filter(isMeltFit).map((f) => f.tm.value)
    if (!tms.length) continue
    const m = mean(tms)
    const sd = tms.length > 1 ? Math.sqrt(tms.reduce((a, v) => a + (v - m) ** 2, 0) / (tms.length - 1)) : null
    conditions.push({ name, series: members, tms, mean: m, sd, delta: 0, test: null })
  }
  const ref = conditions[0]
  for (const c of conditions) {
    if (!ref || c === ref) continue
    c.delta = c.mean - ref.mean
    c.test = c.tms.length > 1 && ref.tms.length > 1 ? welchT(c.tms, ref.tms) : null
  }
  const failed = series.map((s, i) => ({ s, f: fits[i] })).filter(({ f }) => f && !isMeltFit(f))
  for (const { s, f } of failed) notices.push(`No Tm for ${s.name || 'a curve'}: ${(f as NoFit).reason}`)
  return { fits, derivatives, conditions, notices }
}
