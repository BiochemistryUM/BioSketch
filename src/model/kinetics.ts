// The arithmetic of enzyme kinetics: initial rates against substrate concentration, fitted with the
// Michaelis–Menten equation, and with four models of inhibition over several series at once. Pure
// functions, no React, no browser APIs.
//
// Definitions, each pinned to R 4.4 through tests/stats-reference.json (scripts/stats-reference.R,
// section "enzyme kinetics"):
//  - Every replicate rate is a point of the fit, not the mean of a concentration; unweighted
//    least squares. Points with a substrate concentration below 0, or a concentration or rate that is
//    not a number, are left out with a notice. Substrate 0 takes part (the curve gives a rate of 0).
//  - The equations are GraphPad Prism's, under the same names (S substrate, I inhibitor):
//        Michaelis–Menten  v = Vmax S / (Km + S)                             R: nls(v ~ Vmax * S / (Km + S))
//        competitive       v = Vmax S / (Km (1 + I/Ki) + S)
//        uncompetitive     v = Vmax S / (Km + S (1 + I/Ki))
//        noncompetitive    v = Vmax S / ((Km + S) (1 + I/Ki))                (pure: α = 1)
//        mixed             v = Vmax S / (Km (1 + I/Ki) + S (1 + I/(α Ki)))
//    An inhibition model is fitted over every series at once, each series one inhibitor
//    concentration, with Vmax, Km, Ki (and α) shared: R's nls on a long table (S, I, v).
//  - Fitted by Levenberg–Marquardt from several starting points (as `settle` in chartStats.ts),
//    on the logarithms of the parameters so that none can fall to 0 or below. A least-squares
//    solution with Km, Vmax, Ki or α at 0 or below, or running off without end, has no curve: the
//    search then does not come to rest inside the allowed range, and the reason is given in words.
//    There is no curve unless the search has come to rest at a least-squares solution.
//  - Standard errors are those of summary(nls): s² (JᵀJ)⁻¹ at the solution, J the derivatives in
//    the plain parameters (`cov`). The 95 % intervals are estimate ± qt(0.975, df) SE: the
//    asymptotic (Wald) interval of R's confint.default, with Student's t in place of the normal
//    distribution. It is symmetric and too narrow with few points; it is not the profile interval
//    of R's confint(nls).
//  - `aic` is R's AIC() for the fit, from the full Gaussian likelihood:
//    n (ln 2π + 1 + ln(sse/n)) + 2 (p + 1). `aicc` is GraphPad's corrected criterion
//    n ln(sse/n) + 2K + 2K(K + 1)/(n − K − 1), K = p + 1. Only differences between models fitted
//    to the same points mean anything; both rank models alike up to the correction term, and the
//    comparison of models uses `aicc`, as GraphPad does.
//  - The comparison of inhibition models: competitive (α → ∞), uncompetitive (α → 0 with α Ki
//    held) and noncompetitive (α = 1) are nested in mixed, one parameter fewer, so each is tested
//    against it by the extra sum-of-squares F test with one degree of freedom, R's
//    anova(fitSmaller, fitMixed).

import { solve } from './chartStats'
import { fUpper, tCritical } from './distributions'

export type KineticsModel = 'mm' | 'competitive' | 'uncompetitive' | 'noncompetitive' | 'mixed'
export type InhibitionModel = Exclude<KineticsModel, 'mm'>
export type KineticsParam = 'vmax' | 'km' | 'ki' | 'alpha'

export const INHIBITION_MODELS: InhibitionModel[] = ['competitive', 'uncompetitive', 'noncompetitive', 'mixed']

/** The parameters of each model, in the order of `cov`. */
export const MODEL_PARAMS: Record<KineticsModel, KineticsParam[]> = {
  mm: ['vmax', 'km'],
  competitive: ['vmax', 'km', 'ki'],
  uncompetitive: ['vmax', 'km', 'ki'],
  noncompetitive: ['vmax', 'km', 'ki'],
  mixed: ['vmax', 'km', 'ki', 'alpha'],
}

export interface KineticsSeries {
  name: string
  /** The inhibitor concentration of the series; needed by the inhibition models only. */
  inhibitor?: number | null
  /** Substrate concentrations, one per rate. */
  s: number[]
  /** Initial rates. */
  v: number[]
}

/** A fitted parameter with its standard error and 95 % interval (estimate ± t SE). */
export interface Estimate {
  value: number
  se: number
  lo: number
  hi: number
}

export interface KineticsFit {
  model: KineticsModel
  /** The parameters of the model; the others are undefined. */
  params: Record<KineticsParam, Estimate | undefined>
  /** The parameters in the order of `cov`. */
  names: KineticsParam[]
  /** Covariance of the parameters (R: vcov(nls)), in the order of `names`. */
  cov: number[][]
  /** The rate the curve gives at a substrate concentration and an inhibitor concentration (below 0 counts as 0). */
  predict: (s: number, i?: number) => number
  n: number
  df: number
  /** Residual sum of squares. */
  sse: number
  /** Residual standard error, sqrt(sse / df). */
  sy: number
  /** 1 − sse / sst, sst around the mean of every rate. */
  r2: number
  /** R's AIC() of the fit (full Gaussian likelihood). */
  aic: number
  /** GraphPad's corrected AIC, n ln(sse/n) + 2K + 2K(K+1)/(n−K−1), K = parameters + 1. */
  aicc: number
  /** The factor the standard errors are multiplied by for the 95 % interval, qt(0.975, df). */
  tcrit: number
}

/** Why there is no fit, in plain words. */
export interface NoFit {
  reason: string
}

export const isFit = (f: KineticsFit | NoFit | null | undefined): f is KineticsFit => !!f && 'model' in f

/** The extra sum-of-squares F test of a simpler model against mixed inhibition. */
export interface NestedTest {
  f: number
  df1: number
  df2: number
  p: number
}

export interface InhibitionComparison {
  fits: Record<InhibitionModel, KineticsFit | NoFit>
  /** Each simpler model against mixed (R: anova(smaller, mixed)); null when either could not be fitted. */
  tests: Record<Exclude<InhibitionModel, 'mixed'>, NestedTest | null>
  /** The model with the lowest corrected AIC, or null when none could be fitted. */
  best: InhibitionModel | null
}

export interface KineticsResult {
  /** Michaelis–Menten: one per series, in the order given. An inhibition model: one global fit. */
  fits: (KineticsFit | NoFit)[]
  notices: string[]
  /** For an inhibition model: all four fitted to the same series, and compared. */
  comparison?: InhibitionComparison
}

interface Point {
  s: number
  i: number
  v: number
}

const NAMES: Record<KineticsModel, string> = {
  mm: 'Michaelis–Menten curve',
  competitive: 'competitive inhibition',
  uncompetitive: 'uncompetitive inhibition',
  noncompetitive: 'noncompetitive inhibition',
  mixed: 'mixed inhibition',
}

// ---- the equations ----

/**
 * The rate and its derivatives with respect to the plain parameters θ (in the order of
 * MODEL_PARAMS), at substrate s and inhibitor i.
 */
function rate(model: KineticsModel, th: number[], s: number, i: number): { v: number; d: number[] } {
  const [vmax, km, ki, alpha] = th
  let den: number
  // dDen/dKm, dDen/dKi, dDen/dα
  let dKm: number
  let dKi = 0
  let dAl = 0
  if (model === 'mm') {
    den = km + s
    dKm = 1
  } else {
    const a = 1 + i / ki
    const da = -i / (ki * ki)
    if (model === 'competitive') {
      den = km * a + s
      dKm = a
      dKi = km * da
    } else if (model === 'uncompetitive') {
      den = km + s * a
      dKm = 1
      dKi = s * da
    } else if (model === 'noncompetitive') {
      den = (km + s) * a
      dKm = a
      dKi = (km + s) * da
    } else {
      const b = 1 + i / (alpha * ki)
      den = km * a + s * b
      dKm = a
      dKi = km * da + s * (-i / (alpha * ki * ki))
      dAl = s * (-i / (alpha * alpha * ki))
    }
  }
  if (!(s > 0)) return { v: 0, d: new Array<number>(th.length).fill(0) }
  const v = (vmax * s) / den
  const g = -v / den
  const d = [s / den, g * dKm]
  if (model !== 'mm') d.push(g * dKi)
  if (model === 'mixed') d.push(g * dAl)
  return { v, d }
}

// ---- the search ----

interface Found {
  q: number[]
  sse: number
  /** JᵀJ in the logarithms of the parameters. */
  jtj: number[][]
  settled: boolean
}

/**
 * Levenberg–Marquardt from `start` (logarithms of the parameters), as `settle` in chartStats.ts
 * and `search` in standardCurve.ts. Returns where it ended, JᵀJ there, and whether it came to rest
 * at a least-squares solution; null when it ran into numbers that are not finite.
 */
function search(model: KineticsModel, pts: Point[], start: number[], sst: number): Found | null {
  const k = start.length
  const cost = (q: number[]): number => {
    const th = q.map(Math.exp)
    let sum = 0
    for (const p of pts) sum += (p.v - rate(model, th, p.s, p.i).v) ** 2
    return sum
  }
  const normal = (q: number[]) => {
    const th = q.map(Math.exp)
    const jtj = Array.from({ length: k }, () => new Array<number>(k).fill(0))
    const jtr = new Array<number>(k).fill(0)
    for (const p of pts) {
      const { v, d } = rate(model, th, p.s, p.i)
      const r = p.v - v
      // Derivatives in the logarithms: θ ∂v/∂θ.
      const dl = d.map((x, j) => x * th[j])
      for (let a = 0; a < k; a++) {
        jtr[a] += dl[a] * r
        for (let b = 0; b < k; b++) jtj[a][b] += dl[a] * dl[b]
      }
    }
    return { jtj, jtr }
  }
  let q = start
  let sse = cost(q)
  if (!Number.isFinite(sse)) return null
  let damp = 1e-3
  for (let iter = 0; iter < 1000; iter++) {
    const { jtj, jtr } = normal(q)
    let moved = false
    for (let tries = 0; tries < 30; tries++) {
      const step = solve(jtj.map((row, a) => row.map((v, b) => (a === b ? v * (1 + damp) + 1e-300 : v))), jtr)
      const next = step && q.map((v, a) => v + step[a])
      const left = next && next.every((x) => Math.abs(x) < 700) ? cost(next) : NaN
      if (next && Number.isFinite(left) && left <= sse) {
        const gain = sse - left
        q = next
        sse = left
        damp = Math.max(damp / 10, 1e-12)
        moved = gain > 1e-15 * Math.max(sse, 1e-300)
        break
      }
      damp *= 10
      if (damp > 1e12) break
    }
    if (!moved) break
  }
  if (!q.every(Number.isFinite) || !Number.isFinite(sse)) return null
  // At rest: the residuals are at right angles to every direction the curve can move in, or the
  // curve passes through every point.
  const { jtj, jtr } = normal(q)
  const settled = sse <= 1e-20 * Math.max(sst, 1e-300) || jtr.every((v, a) => Math.abs(v) <= 1e-6 * Math.sqrt(jtj[a][a] * sse) + 1e-300)
  return { q, sse, jtj, settled }
}

/** (JᵀJ)⁻¹, worked out on the matrix scaled to unit diagonal; null when the points do not pin down every parameter. */
function inverse(jtj: number[][]): number[][] | null {
  const k = jtj.length
  if (!jtj.every((row, a) => row[a] > 0)) return null
  const sc = jtj.map((row, a) => Math.sqrt(row[a]))
  const scaled = jtj.map((row, a) => row.map((v, b) => v / (sc[a] * sc[b])))
  const out = Array.from({ length: k }, () => new Array<number>(k).fill(0))
  for (let a = 0; a < k; a++) {
    const unit = new Array<number>(k).fill(0)
    unit[a] = 1
    const col = solve(scaled, unit)
    if (!col || !(col[a] > 0) || col[a] > 1e12) return null
    for (let b = 0; b < k; b++) out[b][a] = col[b] / (sc[a] * sc[b])
  }
  return out
}

// ---- checks and starting points ----

const mean = (v: number[]): number => v.reduce((a, x) => a + x, 0) / v.length

/** Mean rate at each substrate concentration, in order of concentration. */
function byConcentration(pts: Point[]): { s: number; v: number }[] {
  const m = new Map<number, number[]>()
  for (const p of pts) m.set(p.s, [...(m.get(p.s) ?? []), p.v])
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([s, vs]) => ({ s, v: mean(vs) }))
}

/** Starting Vmax and Km for one curve: the Hanes–Woolf line (S/v against S), then a small grid. */
function mmStarts(pts: Point[]): [number, number][] {
  const out: [number, number][] = []
  const pos = pts.filter((p) => p.s > 0 && p.v > 0)
  if (pos.length >= 2) {
    const xs = pos.map((p) => p.s)
    const ys = pos.map((p) => p.s / p.v)
    const mx = mean(xs)
    const my = mean(ys)
    const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0)
    if (sxx > 0) {
      const slope = xs.reduce((a, x, j) => a + (x - mx) * (ys[j] - my), 0) / sxx
      const icept = my - slope * mx
      if (slope > 0 && icept > 0) out.push([1 / slope, icept / slope])
    }
  }
  const means = byConcentration(pts).filter((c) => c.s > 0)
  const top = Math.max(...means.map((c) => c.v), 1e-300)
  const half = means.find((c) => c.v >= top / 2)?.s ?? means[Math.floor(means.length / 2)].s
  const kms = [...new Set([half, means[Math.floor(means.length / 2)].s, means[0].s, means[means.length - 1].s])]
  for (const vm of [top, 2 * top]) for (const km of kms) out.push([vm, km])
  return out
}

/** Bounds a parameter must stay within to be reported; beyond them the points do not define it. */
interface Span {
  sLo: number
  sHi: number
  iLo: number
  iHi: number
}

/** The reason there is no curve, from where the search ended, or null when it ended within bounds. */
function runaway(model: KineticsModel, th: number[], span: Span): string | null {
  const [vmax, km, ki, alpha] = th
  if (!(km <= span.sHi * 1e3) || !(vmax < Infinity))
    return 'The rates keep rising in step with the substrate and do not level off, so Vmax and Km cannot be told apart. Measure at higher substrate concentrations.'
  if (!(km >= span.sLo * 1e-3) && model !== 'mm')
    return `In ${NAMES[model]} Km runs down to 0: these rates do not say what Km is without inhibitor. Add a series without inhibitor, or choose another model.`
  if (!(km >= span.sLo * 1e-3))
    return 'The rates are already at their highest at the lowest substrate concentration, so Km lies below the concentrations measured. Measure at lower substrate concentrations.'
  if (model === 'mm') return null
  if (!(ki <= span.iHi * 1e3)) return 'The inhibitor hardly changes the rates at these concentrations, so Ki cannot be determined.'
  if (!(ki >= span.iLo * 1e-3)) return 'The rates are as low at the lowest inhibitor concentration as at the highest, so Ki lies below the concentrations measured.'
  if (model === 'mixed') {
    if (!(alpha <= 1e3)) return 'In the mixed model α runs off without end: the inhibition behaves as competitive. Choose the competitive model.'
    if (!(alpha >= 1e-3)) return 'In the mixed model α runs down to 0: the inhibition behaves as uncompetitive. Choose the uncompetitive model.'
  }
  return null
}

/** The fit from the best of the searches, or the reason there is none. */
function settle(model: KineticsModel, pts: Point[], starts: number[][], span: Span): KineticsFit | NoFit {
  const vs = pts.map((p) => p.v)
  const my = mean(vs)
  const sst = vs.reduce((a, y) => a + (y - my) ** 2, 0)
  let best: Found | null = null
  let lowest: Found | null = null
  for (const start of starts) {
    if (!start.every((x) => x > 0 && Number.isFinite(x))) continue
    const found = search(model, pts, start.map(Math.log), sst)
    if (!found) continue
    if (!lowest || found.sse < lowest.sse) lowest = found
    if (found.settled && (!best || found.sse < best.sse)) best = found
  }
  const undecided = `The rates do not settle on one ${NAMES[model]}. Check the data for a mistake, or choose another model.`
  if (!lowest) return { reason: undecided }
  // A search that went further down than any that came to rest went towards a limit (Km or Ki
  // without end, α at 0): the least-squares solution is not a curve of this model.
  if (!best || lowest.sse < best.sse * (1 - 1e-9)) return { reason: runaway(model, lowest.q.map(Math.exp), span) ?? undecided }
  const th = best.q.map(Math.exp)
  const off = runaway(model, th, span)
  if (off) return { reason: off }
  const inv = inverse(best.jtj)
  if (!inv || !th.every(Number.isFinite)) return { reason: undecided }
  const n = pts.length
  const k = th.length
  const df = n - k
  const sse = best.sse
  const s2 = sse / df
  // Back from the logarithms: cov(θ) = diag(θ) cov(ln θ) diag(θ).
  const cov = inv.map((row, a) => row.map((v, b) => s2 * v * th[a] * th[b]))
  const tcrit = tCritical(0.05, df)
  const names = MODEL_PARAMS[model]
  const params: Record<KineticsParam, Estimate | undefined> = { vmax: undefined, km: undefined, ki: undefined, alpha: undefined }
  names.forEach((name, a) => {
    const se = Math.sqrt(cov[a][a])
    params[name] = { value: th[a], se, lo: th[a] - tcrit * se, hi: th[a] + tcrit * se }
  })
  const K = k + 1
  const predict = (s: number, i = 0): number => rate(model, th, Math.max(0, s), Math.max(0, i)).v
  return {
    model,
    params,
    names,
    cov,
    predict,
    n,
    df,
    sse,
    sy: Math.sqrt(s2),
    r2: 1 - sse / sst,
    aic: n * (Math.log(2 * Math.PI) + 1 + Math.log(sse / n)) + 2 * K,
    aicc: n * Math.log(sse / n) + 2 * K + (2 * K * (K + 1)) / (n - K - 1),
    tcrit,
  }
}

/** What every model needs of the points before a search is worth starting; null when they will do. */
function shortOf(model: KineticsModel, pts: Point[]): string | null {
  const k = MODEL_PARAMS[model].length
  const distinct = new Set(pts.filter((p) => p.s > 0).map((p) => p.s)).size
  if (distinct < 3)
    return `A ${NAMES[model]} needs rates at 3 or more substrate concentrations above 0; there ${distinct === 1 ? 'is' : 'are'} ${distinct}.`
  if (pts.length <= k) return `A ${NAMES[model]} has ${k} numbers to fit and needs more rates than that.`
  const vs = pts.map((p) => p.v)
  const my = mean(vs)
  if (!(vs.reduce((a, y) => a + (y - my) ** 2, 0) > 0)) return 'The rates are all the same, so they give no curve.'
  if (!vs.some((v) => v > 0)) return 'None of the rates is above 0, so they give no curve.'
  const means = byConcentration(pts)
  if (!(means[means.length - 1].v > means[0].v))
    return 'The rates do not rise with the substrate concentration, so they give no Michaelis–Menten curve.'
  return null
}

const spanOf = (pts: Point[]): Span => {
  const s = pts.map((p) => p.s).filter((x) => x > 0)
  const i = pts.map((p) => p.i).filter((x) => x > 0)
  return { sLo: Math.min(...s), sHi: Math.max(...s), iLo: i.length ? Math.min(...i) : 0, iHi: i.length ? Math.max(...i) : 0 }
}

// ---- reading the series ----

/** The usable points of a series, and how many were left out. */
function pointsOf(series: KineticsSeries, inhibitor: number): { pts: Point[]; dropped: number } {
  const pts: Point[] = []
  let dropped = 0
  const len = Math.max(series.s.length, series.v.length)
  for (let j = 0; j < len; j++) {
    const s = series.s[j]
    const v = series.v[j]
    if (typeof s === 'number' && typeof v === 'number' && Number.isFinite(s) && Number.isFinite(v) && s >= 0) pts.push({ s, i: inhibitor, v })
    else dropped++
  }
  return { pts, dropped }
}

const droppedNotice = (name: string, k: number) =>
  `${name}: ${k === 1 ? '1 point was' : `${k} points were`} left out (a substrate concentration below 0, or a value that is not a number).`

const usableInhibitor = (i: number | null | undefined): i is number => typeof i === 'number' && Number.isFinite(i) && i >= 0

// ---- what the outside calls ----

/** The Michaelis–Menten curve through the points (substrate s[j], rate v[j]); the reason when there is none. */
export function fitMichaelis(s: number[], v: number[]): KineticsFit | NoFit {
  const { pts } = pointsOf({ name: '', s, v }, 0)
  return fitPoints('mm', pts)
}

function fitPoints(model: KineticsModel, pts: Point[], extra: number[][] = []): KineticsFit | NoFit {
  const short = shortOf(model, pts)
  if (short) return { reason: short }
  const span = spanOf(pts)
  if (model === 'mm') return settle('mm', pts, mmStarts(pts), span)
  // Vmax and Km from the series with the least inhibitor, Ki around the inhibitor concentrations, α either side of 1.
  const least = Math.min(...pts.map((p) => p.i))
  const base = pts.filter((p) => p.i === least)
  const first = shortOf('mm', base) ? null : settle('mm', base, mmStarts(base), spanOf(base))
  const pairs: [number, number][] = isFit(first) ? [[first.params.vmax!.value, first.params.km!.value]] : mmStarts(pts).slice(0, 3)
  const is = [...new Set(pts.map((p) => p.i).filter((x) => x > 0))].sort((a, b) => a - b)
  const mid = is[Math.floor(is.length / 2)]
  const kis = [...new Set([mid * 0.3, mid, mid * 3, is[0], is[is.length - 1]])]
  const starts: number[][] = [...extra]
  for (const [vm, km] of pairs)
    for (const ki of kis) {
      if (model === 'mixed') for (const al of [0.3, 1, 3, 10]) starts.push([vm, km, ki, al])
      else starts.push([vm, km, ki])
    }
  return settle(model, pts, starts, span)
}

/** Read the series for an inhibition model: every point with its inhibitor concentration, or the reason they will not do. */
function inhibitionPoints(series: KineticsSeries[], notices: string[]): { pts: Point[] } | NoFit {
  const missing = series.filter((x) => !usableInhibitor(x.inhibitor)).map((x) => x.name)
  if (missing.length)
    return { reason: `An inhibition model needs the inhibitor concentration of every series (0 for the one without inhibitor). It is missing for: ${missing.join(', ')}.` }
  const pts: Point[] = []
  for (const x of series) {
    const got = pointsOf(x, x.inhibitor as number)
    if (got.dropped) notices.push(droppedNotice(x.name, got.dropped))
    if (!got.pts.length) notices.push(`${x.name} has no usable points and was left out.`)
    pts.push(...got.pts)
  }
  const levels = new Set(pts.map((p) => p.i))
  if (levels.size < 2)
    return {
      reason:
        series.length < 2
          ? 'An inhibition model is fitted to several series at once, each at its own inhibitor concentration. Add a series at another inhibitor concentration (one of them usually 0).'
          : 'An inhibition model needs series at 2 or more different inhibitor concentrations (one of them usually 0); these all have the same.',
    }
  return { pts }
}

/** One inhibition model fitted to all series at once, with Vmax, Km, Ki (and α) shared. */
export function fitInhibition(series: KineticsSeries[], model: InhibitionModel): KineticsFit | NoFit {
  const got = inhibitionPoints(series, [])
  return 'reason' in got ? got : fitPoints(model, got.pts)
}

/** The four inhibition models fitted to the same series, each simpler one tested against mixed, and the one with the lowest AICc. */
export function compareInhibition(series: KineticsSeries[]): InhibitionComparison {
  return compareOn(inhibitionPoints(series, []))
}

function compareOn(got: { pts: Point[] } | NoFit): InhibitionComparison {
  if ('reason' in got) {
    const fits = { competitive: got, uncompetitive: got, noncompetitive: got, mixed: got }
    return { fits, tests: { competitive: null, uncompetitive: null, noncompetitive: null }, best: null }
  }
  const { pts } = got
  const competitive = fitPoints('competitive', pts)
  const uncompetitive = fitPoints('uncompetitive', pts)
  const noncompetitive = fitPoints('noncompetitive', pts)
  // Mixed is also started from the three simpler answers: noncompetitive is mixed with α = 1;
  // competitive the limit of a large α; uncompetitive of a small α with α Ki held.
  const extra: number[][] = []
  const p = (f: KineticsFit, k: KineticsParam) => f.params[k]!.value
  if (isFit(noncompetitive)) extra.push([p(noncompetitive, 'vmax'), p(noncompetitive, 'km'), p(noncompetitive, 'ki'), 1])
  if (isFit(competitive)) extra.push([p(competitive, 'vmax'), p(competitive, 'km'), p(competitive, 'ki'), 30])
  if (isFit(uncompetitive)) extra.push([p(uncompetitive, 'vmax'), p(uncompetitive, 'km'), p(uncompetitive, 'ki') * 30, 1 / 30])
  const mixed = fitPoints('mixed', pts, extra)
  const fits = { competitive, uncompetitive, noncompetitive, mixed }
  const test = (small: KineticsFit | NoFit): NestedTest | null => {
    if (!isFit(small) || !isFit(mixed)) return null
    const df1 = small.df - mixed.df
    const f = Math.max(0, (small.sse - mixed.sse) / df1 / (mixed.sse / mixed.df))
    return { f, df1, df2: mixed.df, p: fUpper(f, df1, mixed.df) }
  }
  let best: InhibitionModel | null = null
  for (const m of INHIBITION_MODELS) {
    const f = fits[m]
    if (isFit(f) && (best === null || f.aicc < (fits[best] as KineticsFit).aicc)) best = m
  }
  return { fits, tests: { competitive: test(competitive), uncompetitive: test(uncompetitive), noncompetitive: test(noncompetitive) }, best }
}

/**
 * Fit the series. Michaelis–Menten: one curve per series, in the order given (the inhibitor
 * concentration is not used). An inhibition model: one fit over all series, and the comparison of
 * all four models on the same points.
 */
export function kinetics(series: KineticsSeries[], model: KineticsModel): KineticsResult {
  const notices: string[] = []
  if (model === 'mm') {
    const fits = series.map((x) => {
      const got = pointsOf(x, 0)
      if (got.dropped) notices.push(droppedNotice(x.name, got.dropped))
      if (!got.pts.length) return { reason: `${x.name} has no usable points.` }
      return fitPoints('mm', got.pts)
    })
    return { fits, notices }
  }
  const got = inhibitionPoints(series, notices)
  if ('reason' in got) return { fits: [got], notices }
  if (!got.pts.some((p) => p.i === 0))
    notices.push('None of the series is without inhibitor: Vmax and Km are then what the model says they would be at no inhibitor, not what was measured.')
  const comparison = compareOn(got)
  return { fits: [comparison.fits[model]], notices, comparison }
}

/** The Vmax and Km the curve shows at an inhibitor concentration (for Lineweaver–Burk lines and for words). */
export function apparent(fit: KineticsFit, i: number): { vmax: number; km: number } {
  const vmax = fit.params.vmax!.value
  const km = fit.params.km!.value
  const ki = fit.params.ki?.value ?? Infinity
  const c = Math.max(0, i)
  const a = 1 + c / ki
  switch (fit.model) {
    case 'mm':
      return { vmax, km }
    case 'competitive':
      return { vmax, km: km * a }
    case 'uncompetitive':
      return { vmax: vmax / a, km: km / a }
    case 'noncompetitive':
      return { vmax: vmax / a, km }
    case 'mixed': {
      const b = 1 + c / (fit.params.alpha!.value * ki)
      return { vmax: vmax / b, km: (km * a) / b }
    }
  }
}

/**
 * The turnover number kcat = Vmax / [E] and the specificity constant kcat / Km, with standard
 * errors and 95 % intervals as for the parameters. [E] is the enzyme concentration in the same
 * unit as the rates' concentration (kcat is then per unit of time of the rates); it is taken as
 * known exactly. The standard error of kcat / Km is the delta method on the covariance of Vmax and
 * Km (the gradient (1/([E] Km), −Vmax/([E] Km²))). Null without a usable enzyme concentration.
 */
export function kcatOf(fit: KineticsFit, enzyme: number): { kcat: Estimate; kcatKm: Estimate } | null {
  if (!(typeof enzyme === 'number' && Number.isFinite(enzyme) && enzyme > 0)) return null
  const vmax = fit.params.vmax!.value
  const km = fit.params.km!.value
  const [vv, vk, kk] = [fit.cov[0][0], fit.cov[0][1], fit.cov[1][1]]
  const est = (value: number, se: number): Estimate => ({ value, se, lo: value - fit.tcrit * se, hi: value + fit.tcrit * se })
  const g0 = 1 / (enzyme * km)
  const g1 = -vmax / (enzyme * km * km)
  return {
    kcat: est(vmax / enzyme, Math.sqrt(vv) / enzyme),
    kcatKm: est(vmax / (enzyme * km), Math.sqrt(Math.max(0, g0 * g0 * vv + 2 * g0 * g1 * vk + g1 * g1 * kk))),
  }
}
