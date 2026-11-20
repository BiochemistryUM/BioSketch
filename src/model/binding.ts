// Saturation binding: how much ligand is bound against the free concentration, with the
// equations GraphPad Prism names:
// - one site, specific binding: B = Bmax·X / (Kd + X), every series on its own;
// - one site with a Hill slope: B = Bmax·Xʰ / (Kdʰ + Xʰ), every series on its own, with the extra
//   sum-of-squares F test of h against 1 (R: anova of the two nls fits);
// - total and nonspecific binding, fitted together: total = Bmax·X / (Kd + X) + NS·X + Bkg and
//   nonspecific = NS·X + Bkg, with NS and Bkg shared by the two series (Prism's "One site —
//   Total and nonspecific binding").
// Every replicate is a point of an unweighted least-squares fit (`nls`), the numbers those of R's
// nls with the same formula (pinned through tests/stats-reference.json).

import { fUpper } from './distributions'
import { nls, type Estimate, type NlsFit } from './nls'
import type { BindingSettings, ChartNode } from './types'

export type BindingModel = 'specific' | 'hill' | 'total'
export type BindingParam = 'bmax' | 'kd' | 'h' | 'ns' | 'bkg'

export const BINDING_PARAMS: Record<BindingModel, BindingParam[]> = {
  specific: ['bmax', 'kd'],
  hill: ['bmax', 'kd', 'h'],
  total: ['bmax', 'kd', 'ns', 'bkg'],
}

export interface BindingSeries {
  name: string
  /** Free ligand concentrations, one per value. */
  x: number[]
  /** Bound ligand. */
  y: number[]
}

export interface BindingFit {
  model: BindingModel
  params: Partial<Record<BindingParam, Estimate>>
  /** Bound at a free concentration; `total` false gives the nonspecific line of the total model. */
  predict: (x: number, total?: boolean) => number
  n: number
  df: number
  sse: number
  sy: number
  r2: number
  /** The Hill model: the F test of a Hill slope of 1 against the slope fitted. */
  hillTest?: { f: number; df1: number; df2: number; p: number } | null
}

export interface NoFit {
  reason: string
}

export const isBindingFit = (f: BindingFit | NoFit | null | undefined): f is BindingFit => !!f && 'model' in f

export interface BindingResult {
  /** Specific and Hill: one per series, in the order of the table. Total: one shared fit. */
  fits: (BindingFit | NoFit | null)[]
  /** The total model: which series is the total binding and which the nonspecific. */
  pair?: { total: number; nonspecific: number }
  notices: string[]
}

interface Point {
  x: number
  y: number
  /** 1 for a point of total binding, 0 for nonspecific (total model only). */
  t: number
}

const mean = (v: number[]): number => v.reduce((a, x) => a + x, 0) / v.length
const NAMES: Record<BindingModel, string> = { specific: 'one-site binding curve', hill: 'binding curve with a Hill slope', total: 'fit of total and nonspecific binding' }

/** The name of a series of nonspecific binding: "Nonspecific", "Non-specific", "NSB", "NS", "+ cold", "Excess unlabelled". */
const NONSPECIFIC = /non[\s-]?specific|\bnsb?\b|nonspec|\bcold\b|unlabell?ed|excess/i

function curveOf(model: BindingModel) {
  return (th: number[], p: Point): { y: number; d: number[] } => {
    const x = p.x
    if (model === 'specific') {
      const [bmax, kd] = th
      const den = kd + x
      return { y: (bmax * x) / den, d: [x / den, (-bmax * x) / (den * den)] }
    }
    if (model === 'hill') {
      const [bmax, kd, h] = th
      if (!(x > 0)) return { y: 0, d: [0, 0, 0] }
      const u = (x / kd) ** h
      const f = u / (1 + u)
      const g = bmax / (1 + u) ** 2
      return { y: bmax * f, d: [f, (g * -h * u) / kd, g * u * Math.log(x / kd)] }
    }
    const [bmax, kd, ns, bkg] = th
    const den = kd + x
    return { y: p.t * ((bmax * x) / den) + ns * x + bkg, d: [(p.t * x) / den, (p.t * -bmax * x) / (den * den), x, 1] }
  }
}

/** Mean bound at each concentration, in order of concentration. */
function byConcentration(pts: Point[]): { x: number; y: number }[] {
  const m = new Map<number, number[]>()
  for (const p of pts) m.set(p.x, [...(m.get(p.x) ?? []), p.y])
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([x, ys]) => ({ x, y: mean(ys) }))
}

/** Starting Bmax and Kd: the line of X/B against X (Hanes), then a small grid. */
function starts(pts: { x: number; y: number }[]): [number, number][] {
  const out: [number, number][] = []
  const pos = pts.filter((p) => p.x > 0 && p.y > 0)
  if (pos.length >= 2) {
    const xs = pos.map((p) => p.x)
    const ys = pos.map((p) => p.x / p.y)
    const mx = mean(xs)
    const my = mean(ys)
    const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0)
    if (sxx > 0) {
      const slope = xs.reduce((a, x, j) => a + (x - mx) * (ys[j] - my), 0) / sxx
      const icept = my - slope * mx
      if (slope > 0 && icept > 0) out.push([1 / slope, icept / slope])
    }
  }
  const means = byConcentration(pts.map((p) => ({ ...p, t: 1 }))).filter((c) => c.x > 0)
  if (!means.length) return out
  const top = Math.max(...means.map((c) => c.y), 1e-300)
  const half = means.find((c) => c.y >= top / 2)?.x ?? means[Math.floor(means.length / 2)].x
  const kds = [...new Set([half, means[Math.floor(means.length / 2)].x, means[0].x, means[means.length - 1].x])]
  for (const b of [top, 2 * top]) for (const kd of kds) out.push([b, kd])
  return out
}

/** Why the points give no curve before a search is tried; null when they will do. */
function shortOf(model: BindingModel, pts: Point[]): string | null {
  const k = BINDING_PARAMS[model].length
  const distinct = new Set(pts.filter((p) => p.x > 0 && p.t === 1).map((p) => p.x)).size
  if (distinct < 3) return `A ${NAMES[model]} needs bound values at 3 or more concentrations above 0; there ${distinct === 1 ? 'is' : 'are'} ${distinct}.`
  if (pts.length <= k) return `A ${NAMES[model]} has ${k} numbers to fit and needs more values than that.`
  const totals = byConcentration(pts.filter((p) => p.t === 1))
  if (!(totals[totals.length - 1].y > totals[0].y)) return 'The bound values do not rise with the concentration, so they give no binding curve.'
  return null
}

/** The reason there is no curve, from where the search ended; null when the parameters lie within reach of the data. */
function runaway(model: BindingModel, th: number[], lo: number, hi: number): string | null {
  const [, kd, h] = th
  if (!(kd <= hi * 1e3))
    return 'The binding keeps rising with the concentration and does not level off, so Bmax and Kd cannot be told apart. Measure at higher concentrations (up to about ten times Kd).'
  if (!(kd >= lo * 1e-3)) return 'The binding is already at its highest at the lowest concentration, so Kd lies below the concentrations measured. Measure at lower concentrations.'
  if (model === 'hill' && !(h >= 0.05 && h <= 20)) return 'The Hill slope runs off without end: these values do not define it. Choose the one-site curve.'
  return null
}

function settle(model: BindingModel, pts: Point[]): BindingFit | NoFit {
  const short = shortOf(model, pts)
  if (short) return { reason: short }
  const xs = pts.filter((p) => p.x > 0).map((p) => p.x)
  const [lo, hi] = [Math.min(...xs), Math.max(...xs)]
  const totals = pts.filter((p) => p.t === 1)
  let starting: number[][]
  if (model === 'total') {
    // NS and Bkg from the straight line through the nonspecific values; Bmax and Kd from the totals less that line.
    const nsb = pts.filter((p) => p.t === 0)
    const mx = mean(nsb.map((p) => p.x))
    const my = mean(nsb.map((p) => p.y))
    const sxx = nsb.reduce((a, p) => a + (p.x - mx) ** 2, 0)
    const ns = sxx > 0 ? nsb.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0) / sxx : 0
    const bkg = my - ns * mx
    starting = starts(totals.map((p) => ({ x: p.x, y: p.y - ns * p.x - bkg }))).map(([b, kd]) => [b, kd, ns, bkg])
  } else starting = starts(totals).map(([b, kd]) => (model === 'hill' ? [b, kd, 1] : [b, kd]))
  if (model === 'hill') starting = [...starting, ...starting.flatMap(([b, kd]) => [[b, kd, 0.5], [b, kd, 2]])]
  const positive = model === 'total' ? [true, true, false, false] : model === 'hill' ? [true, true, true] : [true, true]
  const out = nls(pts, curveOf(model), starting, positive)
  const undecided = `The values do not settle on one ${NAMES[model]}. Check the table for a mistake.`
  if (!out.fit || out.ranOff) return { reason: (out.lowest && runaway(model, out.lowest, lo, hi)) ?? undecided }
  const th = out.fit.th
  const off = runaway(model, th, lo, hi)
  if (off) return { reason: off }
  return fitFrom(model, out.fit)
}

function fitFrom(model: BindingModel, f: NlsFit): BindingFit {
  const names = BINDING_PARAMS[model]
  const params: Partial<Record<BindingParam, Estimate>> = {}
  names.forEach((n, a) => (params[n] = f.est[a]))
  const curve = curveOf(model)
  return {
    model,
    params,
    predict: (x: number, total = true) => curve(f.th, { x: Math.max(0, x), y: 0, t: total ? 1 : 0 }).y,
    n: f.n,
    df: f.df,
    sse: f.sse,
    sy: f.sy,
    r2: f.r2,
  }
}

/** The usable points of a series: a concentration of zero or above and a number. */
function pointsOf(s: BindingSeries, t: number): { pts: Point[]; dropped: number } {
  const pts: Point[] = []
  let dropped = 0
  const len = Math.max(s.x.length, s.y.length)
  for (let j = 0; j < len; j++) {
    const x = s.x[j]
    const y = s.y[j]
    if (typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y) && x >= 0) pts.push({ x, y, t })
    else dropped++
  }
  return { pts, dropped }
}

/** One-site binding through one series. */
export function fitBinding(x: number[], y: number[], model: 'specific' | 'hill' = 'specific'): BindingFit | NoFit {
  const fit = settle(model, pointsOf({ name: '', x, y }, 1).pts)
  if (model !== 'hill' || !isBindingFit(fit)) return fit
  // Is the Hill slope different from 1? The one-site curve is the Hill curve with h = 1.
  const one = settle('specific', pointsOf({ name: '', x, y }, 1).pts)
  if (isBindingFit(one) && fit.df > 0) {
    const f = (one.sse - fit.sse) / 1 / (fit.sse / fit.df)
    fit.hillTest = f >= 0 && Number.isFinite(f) ? { f, df1: 1, df2: fit.df, p: fUpper(f, 1, fit.df) } : null
  } else fit.hillTest = null
  return fit
}

/** Total and nonspecific binding fitted together. */
export function fitTotalBinding(total: BindingSeries, nonspecific: BindingSeries): BindingFit | NoFit {
  const pts = [...pointsOf(total, 1).pts, ...pointsOf(nonspecific, 0).pts]
  if (new Set(pointsOf(nonspecific, 0).pts.map((p) => p.x)).size < 2) return { reason: 'The nonspecific binding needs values at 2 or more concentrations.' }
  return settle('total', pts)
}

/** The model a chart's settings ask for. */
export const bindingModel = (s: BindingSettings | undefined): BindingModel => s?.model ?? 'specific'

/** Which series is the nonspecific binding, and which the total, for the total model; null when the table has no such pair. */
export function bindingPair(names: string[]): { total: number; nonspecific: number } | null {
  const nonspecific = names.findIndex((n) => NONSPECIFIC.test(n))
  if (nonspecific < 0) return null
  const named = names.findIndex((n, i) => i !== nonspecific && /total/i.test(n))
  const total = named >= 0 ? named : names.findIndex((_, i) => i !== nonspecific)
  return total >= 0 ? { total, nonspecific } : null
}

/** The series of a binding chart, as columns of concentrations and bound values, in the order of the table. */
export function bindingColumns(node: Pick<ChartNode, 'groups'>): BindingSeries[] {
  return node.groups.map((g) => {
    const x: number[] = []
    const y: number[] = []
    g.values.forEach((v, k) => {
      const at = g.xs?.[k]
      if (at === undefined) return
      x.push(at)
      y.push(v)
    })
    return { name: g.name, x, y }
  })
}

/** Every fit of a binding chart, with the notices that go with them. */
export function binding(series: BindingSeries[], settings: BindingSettings | undefined): BindingResult {
  const model = bindingModel(settings)
  const notices: string[] = []
  series.forEach((s) => {
    const { dropped } = pointsOf(s, 1)
    if (dropped) notices.push(`${s.name || 'A series'}: ${dropped === 1 ? '1 value was' : `${dropped} values were`} left out (a concentration below 0, or a value that is not a number).`)
  })
  if (model !== 'total') return { fits: series.map((s) => (s.y.length ? fitBinding(s.x, s.y, model) : null)), notices }
  const pair = bindingPair(series.map((s) => s.name))
  if (!pair) return { fits: [{ reason: 'Total and nonspecific binding need a series named “Nonspecific” (or “NSB”) beside the total binding.' }], notices }
  const others = series.filter((s, i) => i !== pair.total && i !== pair.nonspecific && s.y.length).map((s) => s.name)
  if (others.length) notices.push(`Only one total binding is fitted with the nonspecific: ${others.join(', ')} ${others.length === 1 ? 'is' : 'are'} drawn without a curve.`)
  return { fits: [fitTotalBinding(series[pair.total], series[pair.nonspecific])], pair, notices }
}
