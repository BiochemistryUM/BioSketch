// The arithmetic of a standard curve (Bradford, BCA, ELISA): standards of known concentration
// give a curve, and unknown samples are read off it. Pure functions, no React, no browser APIs.
//
// Definitions, each pinned to R 4.4 through tests/stats-reference.json (scripts/stats-reference.R):
//  - Every replicate signal is a point of the fit, not the mean of a standard; unweighted
//    ordinary least squares.
//  - Straight line y = a + b x and quadratic y = a + b x + c x²: closed form, as R's
//    `lm(y ~ x)` and `lm(y ~ x + I(x^2))`.
//  - Four- and five-parameter logistic, written here as
//        y = bottom + (top - bottom) / (1 + (ec50 / x)^hill)^asym        (4PL: asym = 1)
//    which is drc's `LL.4()` / `LL.5()`, f(x) = c + (d - c) / (1 + exp(b (log x - log e)))^f,
//    with bottom = c, top = d, ec50 = e, hill = -b, asym = f. Fitted by nonlinear least squares
//    (Levenberg-Marquardt from several starting points), equal to `drc::drm(y ~ x, fct = LL.4())`
//    and `LL.5()`. A 4PL is always given with hill > 0 (a curve found with hill < 0 is the same
//    curve with bottom and top swapped; drc then has b > 0 and bottom = d, top = c), so bottom is
//    the signal at concentration 0 and top the plateau at high concentrations, below bottom for a
//    falling curve (competitive ELISA). A 5PL is not symmetric in that way and keeps the sign it
//    was fitted with; with hill < 0 its bottom is the plateau at high concentrations.
//    Concentration 0 takes part in the fit: there the curve is bottom when hill > 0 (top when
//    hill < 0). The search ends only at a least-squares solution; otherwise there is no curve.
//  - Reading a signal: linear and 4PL/5PL in closed form; a quadratic takes the root on the part
//    of the parabola that runs the way the standards do, between 0 and 1.5 times the highest
//    standard. A concentration below 0 is never given.

import { solve } from './chartStats'

export type StandardModel = 'linear' | 'quadratic' | '4pl' | '5pl'

export interface StandardFit {
  model: StandardModel
  /**
   * linear [a, b]: y = a + b x; quadratic [a, b, c]: y = a + b x + c x²;
   * 4pl [bottom, top, ec50, hill]; 5pl [bottom, top, ec50, hill, asym]:
   * y = bottom + (top - bottom) / (1 + (ec50 / x)^hill)^asym (see the top of this file for drc's names).
   */
  params: number[]
  /** The signal at a concentration (for 4PL and 5PL a concentration below 0 counts as 0). */
  predict: (x: number) => number
  /** The concentration whose signal is y, on the part of the curve the standards cover; null where the curve never reaches y. */
  inverse: (y: number) => number | null
  n: number
  df: number
  /** Residual sum of squares. */
  sse: number
  /** Residual standard error, sqrt(sse / df). */
  sy: number
  /** 1 - sse / sst. */
  r2: number
  /** True when the signal rises with the concentration over the standards. */
  rising: boolean
  /** For a quadratic: where the parabola turns, when that lies within the standards (signals beyond it cannot be read). */
  turn?: number
}

export interface StandardRow { name: string; conc: number; values: number[] }
export interface SampleRow { name: string; values: number[]; dilution?: number }
export interface StandardInput {
  standards: StandardRow[]
  samples: SampleRow[]
  model: StandardModel
  /** Subtract the mean signal of the standards at concentration 0 from every signal. */
  blank?: boolean
}

export interface StandardResult {
  fit: StandardFit | null
  /** Why there is no fit, in plain words. */
  reason?: string
  /** The signal subtracted, or null. */
  blank: number | null
  standards: { name: string; conc: number; mean: number; sd: number | null; back: number | null; recovery: number | null }[]
  samples: {
    name: string
    mean: number
    sd: number | null
    /** In per cent; null with one value or a mean of 0. */
    cv: number | null
    /** Read off the curve, times the dilution. */
    conc: number | null
    flag: 'ok' | 'below' | 'above' | 'none'
    /** Where the signal lies against the standards, whatever the flag: below the lowest, above the highest, or within. */
    side: 'below' | 'above' | null
    dilution: number
  }[]
  /** Lowest and highest standard concentration above 0 (0 and 0 when there is none). */
  range: { lo: number; hi: number }
  notices: string[]
}

/** What each kind of curve needs: different concentrations, and the number of its parameters. */
const NEEDS: Record<StandardModel, { distinct: number; params: number; name: string }> = {
  linear: { distinct: 2, params: 2, name: 'A straight line' },
  quadratic: { distinct: 3, params: 3, name: 'A quadratic curve' },
  '4pl': { distinct: 5, params: 4, name: 'A four-parameter curve' },
  '5pl': { distinct: 6, params: 5, name: 'A five-parameter curve' },
}

const mean = (v: number[]): number => v.reduce((a, x) => a + x, 0) / v.length
const sampleSd = (v: number[]): number | null => {
  if (v.length < 2) return null
  const m = mean(v)
  return Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / (v.length - 1))
}

/** The fitted curve, or the reason there is none. */
function fitOrReason(points: [number, number][], model: StandardModel): { fit: StandardFit } | { reason: string } {
  const pts = points.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y) && x >= 0)
  const need = NEEDS[model]
  const distinct = new Set(pts.map((p) => p[0])).size
  if (distinct < need.distinct)
    return { reason: `${need.name} needs at least ${need.distinct} standards of different concentration; there ${distinct === 1 ? 'is' : 'are'} ${distinct}.` }
  if (pts.length <= need.params)
    return { reason: `${need.name} has ${need.params} numbers to fit and needs more signals than that: measure the standards in duplicate, or add another standard.` }
  const ys = pts.map((p) => p[1])
  const my = mean(ys)
  const sst = ys.reduce((a, y) => a + (y - my) ** 2, 0)
  if (!(sst > 0)) return { reason: 'The signals of the standards are all the same, so they give no curve.' }
  const fit = model === 'linear' || model === 'quadratic' ? polynomial(pts, model, sst) : logistic(pts, model === '5pl', sst)
  if (!fit)
    return {
      reason:
        model === 'linear' || model === 'quadratic'
          ? `${need.name} cannot be drawn through these standards.`
          : model === '4pl'
            ? 'The standards do not settle on one four-parameter curve. Check the standards for a mistake, or choose another kind of curve.'
            : 'The standards do not settle on one five-parameter curve: they do not say how lopsided it is. Try the four-parameter curve, or check the standards for a mistake.',
    }
  return { fit }
}

/** The least-squares curve of the given kind through the points [concentration, signal]; null when there is none. */
export function fitStandard(points: [number, number][], model: StandardModel): StandardFit | null {
  const got = fitOrReason(points, model)
  return 'fit' in got ? got.fit : null
}

/** Lowest concentration above 0 and the highest, and whether the signal rises between them on the curve. */
function span(pts: [number, number][]): { lo: number; hi: number } {
  const pos = pts.map((p) => p[0]).filter((x) => x > 0)
  return { lo: pos.length ? Math.min(...pos) : 0, hi: Math.max(...pts.map((p) => p[0])) }
}

// ---- straight line and quadratic ----

function polynomial(pts: [number, number][], model: 'linear' | 'quadratic', sst: number): StandardFit | null {
  const n = pts.length
  const quad = model === 'quadratic'
  // Least squares on a centred and scaled concentration (well conditioned), then written back in x.
  const mx = mean(pts.map((p) => p[0]))
  const sx = Math.sqrt(pts.reduce((a, [x]) => a + (x - mx) ** 2, 0) / n)
  if (!(sx > 0)) return null
  const k = quad ? 3 : 2
  const jtj = Array.from({ length: k }, () => new Array<number>(k).fill(0))
  const jty = new Array<number>(k).fill(0)
  for (const [x, y] of pts) {
    const t = (x - mx) / sx
    const row = quad ? [1, t, t * t] : [1, t]
    for (let i = 0; i < k; i++) {
      jty[i] += row[i] * y
      for (let j = 0; j < k; j++) jtj[i][j] += row[i] * row[j]
    }
  }
  const g = solve(jtj, jty)
  if (!g) return null
  const [al, be, ga] = [g[0], g[1], quad ? g[2] : 0]
  const c = ga / (sx * sx)
  const b = be / sx - (2 * ga * mx) / (sx * sx)
  const a = al - (be * mx) / sx + (ga * mx * mx) / (sx * sx)
  const predict = (x: number): number => a + b * x + c * x * x
  const sse = pts.reduce((s, [x, y]) => s + (y - predict(x)) ** 2, 0)
  const { lo, hi } = span(pts)
  const rising = predict(hi) > predict(lo)
  const dir = rising ? 1 : -1
  let inverse: (y: number) => number | null
  let turn: number | undefined
  if (!quad || c === 0) {
    inverse = (y) => {
      if (b === 0 || !Number.isFinite(y)) return null
      const x = (y - a) / b
      return Number.isFinite(x) && x >= 0 ? x : null
    }
  } else {
    // The part of the parabola that runs the way the standards do: x below the vertex when the
    // slope there has the sign of `dir` on the left (c * dir < 0), above it otherwise.
    const v = -b / (2 * c)
    let from = 0
    let to = 1.5 * hi
    if (c * dir < 0) to = Math.min(to, v)
    else from = Math.max(from, v)
    if (v > 0 && v < hi) turn = v
    inverse = (y) => {
      if (!Number.isFinite(y) || !(to > from)) return null
      const disc = b * b - 4 * c * (a - y)
      if (disc < 0) return null
      const q = -0.5 * (b + (b >= 0 ? 1 : -1) * Math.sqrt(disc))
      const roots = [q / c, q !== 0 ? (a - y) / q : NaN]
      const slack = 1e-9 * Math.max(hi, 1)
      const hit = roots.find((x) => Number.isFinite(x) && x >= from - slack && x <= to + slack)
      return hit === undefined ? null : Math.min(Math.max(hit, from, 0), to)
    }
  }
  const df = n - k
  return { model, params: quad ? [a, b, c] : [a, b], predict, inverse, n, df, sse, sy: Math.sqrt(sse / df), r2: 1 - sse / sst, rising, ...(turn !== undefined ? { turn } : {}) }
}

// ---- four- and five-parameter logistic ----

/**
 * The curve and its derivatives at one concentration, in the parameters of the search:
 * q = [bottom, top, ln ec50, hill, (ln asym)]. With z = hill (ln ec50 - ln x) the curve is
 * bottom + (top - bottom) g, g = (1 + e^z)^-asym, worked out through softplus(z) = ln(1 + e^z)
 * so that no power overflows.
 */
function at(q: number[], x: number, five: boolean): { y: number; d: number[] } {
  const [lo, top, le, h] = q
  const a = five ? Math.exp(q[4]) : 1
  const k = five ? 5 : 4
  if (!(x > 0)) {
    // (ec50 / 0)^hill is infinite for hill > 0 and 0 for hill < 0.
    const g = h > 0 ? 0 : h < 0 ? 1 : 2 ** -a
    const d = new Array<number>(k).fill(0)
    d[0] = 1 - g
    d[1] = g
    return { y: lo + (top - lo) * g, d }
  }
  const lx = Math.log(x)
  const z = h * (le - lx)
  const sp = z > 0 ? z + Math.log1p(Math.exp(-z)) : Math.log1p(Math.exp(z))
  const sig = z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z))
  const g = Math.exp(-a * sp)
  const dz = -a * g * sig
  const reach = top - lo
  const d = [1 - g, g, reach * dz * h, reach * dz * (le - lx)]
  if (five) d.push(reach * g * -sp * a)
  return { y: lo + reach * g, d }
}

/**
 * Levenberg-Marquardt from `start`, as `settle` in chartStats.ts. Returns where it came to rest
 * and JᵀJ there; null when it does not come to rest at a least-squares solution.
 */
function search(pts: [number, number][], five: boolean, start: number[], sst: number): { q: number[]; sse: number; jtj: number[][] } | null {
  const k = start.length
  const cost = (q: number[]): number => pts.reduce((s, [x, y]) => s + (y - at(q, x, five).y) ** 2, 0)
  const normal = (q: number[]) => {
    const jtj = Array.from({ length: k }, () => new Array<number>(k).fill(0))
    const jtr = new Array<number>(k).fill(0)
    for (const [x, y] of pts) {
      const { y: f, d } = at(q, x, five)
      const r = y - f
      for (let i = 0; i < k; i++) {
        jtr[i] += d[i] * r
        for (let j = 0; j < k; j++) jtj[i][j] += d[i] * d[j]
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
      const step = solve(jtj.map((row, i) => row.map((v, j) => (i === j ? v * (1 + damp) + 1e-300 : v))), jtr)
      const next = step && q.map((v, i) => v + step[i])
      const left = next ? cost(next) : NaN
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
  const settled = sse <= 1e-20 * Math.max(sst, 1e-300) || jtr.every((v, i) => Math.abs(v) <= 1e-6 * Math.sqrt(jtj[i][i] * sse) + 1e-300)
  return settled ? { q, sse, jtj } : null
}

/** True when the points pin down every parameter: JᵀJ, scaled to unit diagonal, can be inverted. */
function determined(jtj: number[][]): boolean {
  const k = jtj.length
  if (!jtj.every((row, i) => row[i] > 0)) return false
  const s = jtj.map((row, i) => Math.sqrt(row[i]))
  const scaled = jtj.map((row, i) => row.map((v, j) => v / (s[i] * s[j])))
  for (let i = 0; i < k; i++) {
    const unit = new Array<number>(k).fill(0)
    unit[i] = 1
    const col = solve(scaled, unit)
    if (!col || !(col[i] > 0) || col[i] > 1e12) return false
  }
  return true
}

function logistic(pts: [number, number][], five: boolean, sst: number): StandardFit | null {
  const { lo, hi } = span(pts)
  if (!(lo > 0)) return null
  const ys = pts.map((p) => p[1])
  const yLo = Math.min(...ys)
  const yHi = Math.max(...ys)
  const sig = (x: number) => mean(pts.filter((p) => p[0] === x).map((p) => p[1]))
  const lowest = Math.min(...pts.map((p) => p[0]))
  const rising = sig(hi) >= sig(lowest)
  const reach = yHi - yLo
  // Starting points: the plateaus at the extremes of the signal (and the far one further out,
  // for standards that do not reach it), the middle where the signal crosses halfway and at a few
  // places along the concentrations (on a log scale), a few slopes.
  const concs = [...new Set(pts.map((p) => p[0]).filter((x) => x > 0))].sort((a, b) => a - b)
  const half = (yLo + yHi) / 2
  const cross = concs.find((x) => (rising ? sig(x) >= half : sig(x) <= half))
  const [llo, lhi] = [Math.log(lo), Math.log(hi)]
  const middles = [...new Set([cross === undefined ? (llo + lhi) / 2 : Math.log(cross), llo + (lhi - llo) * 0.25, (llo + lhi) / 2, llo + (lhi - llo) * 0.75, lhi])]
  const bottom0 = rising ? yLo : yHi
  const tops = rising ? [yHi, yHi + reach * 0.5] : [yLo, yLo - reach * 0.5]
  const starts: number[][] = []
  for (const top of tops) for (const m of middles) for (const h of [1, 0.5, 2, 4]) starts.push([bottom0, top, m, h])
  let best: { q: number[]; sse: number; jtj: number[][] } | null = null
  const consider = (start: number[]) => {
    const found = search(pts, five, start, sst)
    if (found && (!best || found.sse < best.sse)) best = found
  }
  if (five) {
    // From the best four-parameter curve with a few asymmetries, and from the grid.
    const four = logistic(pts, false, sst)
    if (four) for (const la of [0, Math.log(0.3), Math.log(3)]) consider([four.params[0], four.params[1], Math.log(four.params[2]), four.params[3], la])
    for (const s of starts) consider([...s, 0])
  } else for (const s of starts) consider(s)
  // The best place the search came to rest, and only if the points pin it down. A five-parameter
  // search often runs off towards a curve with no finite parameters (asym without end and the
  // middle towards 0, a limit no 5PL reaches): then the least-squares curve does not exist, and
  // there is none rather than a worse one found elsewhere.
  if (!best) return null
  const { q, sse, jtj } = best as { q: number[]; sse: number; jtj: number[][] }
  if (!determined(jtj)) return null
  let [bottom, top, ec50, hill] = [q[0], q[1], Math.exp(q[2]), q[3]]
  const asym = five ? Math.exp(q[4]) : 1
  // A step instead of a slope, a middle far beyond the standards, or an asymmetry that runs off:
  // the points do not define such a curve.
  if (!(Math.abs(hill) > 1e-6 && Math.abs(hill) <= 30) || !(ec50 >= lo * 1e-3 && ec50 <= hi * 1e3) || !(asym >= 1e-3 && asym <= 1e3)) return null
  if (!five && hill < 0) [bottom, top, hill] = [top, bottom, -hill]
  const params = five ? [bottom, top, ec50, hill, asym] : [bottom, top, ec50, hill]
  if (!params.every(Number.isFinite)) return null
  const inner = [bottom, top, Math.log(ec50), hill, ...(five ? [Math.log(asym)] : [])]
  const predict = (x: number): number => at(inner, Math.max(0, x), five).y
  const inverse = (y: number): number | null => {
    if (!Number.isFinite(y)) return null
    const g = (y - bottom) / (top - bottom)
    if (g === 0 && hill > 0) return 0
    if (g === 1 && hill < 0) return 0
    if (!(g > 0 && g < 1)) return null
    const u = g ** (-1 / asym) - 1
    if (!(u > 0)) return null
    const x = ec50 * u ** (-1 / hill)
    return Number.isFinite(x) && x >= 0 ? x : null
  }
  const n = pts.length
  const df = n - params.length
  return { model: five ? '5pl' : '4pl', params, predict, inverse, n, df, sse, sy: Math.sqrt(sse / df), r2: 1 - sse / sst, rising: predict(hi) > predict(lo) }
}

// ---- the whole plate ----

const plural = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`

/** Fit the standards and read every sample off the curve. */
export function standardCurve(input: StandardInput): StandardResult {
  const notices: string[] = []
  let dropped = 0
  const usable = (values: number[]) => {
    const ok = values.filter((v) => typeof v === 'number' && Number.isFinite(v))
    dropped += values.length - ok.length
    return ok
  }
  const standards: { name: string; conc: number; values: number[] }[] = []
  const badConc: string[] = []
  const emptyStd: string[] = []
  for (const s of input.standards) {
    const values = usable(s.values)
    if (!(typeof s.conc === 'number' && Number.isFinite(s.conc) && s.conc >= 0)) badConc.push(s.name)
    else if (!values.length) emptyStd.push(s.name)
    else standards.push({ name: s.name, conc: s.conc, values })
  }
  const samples: { name: string; values: number[]; dilution: number }[] = []
  const emptySample: string[] = []
  const badDilution: string[] = []
  for (const s of input.samples) {
    const values = usable(s.values)
    let dilution = 1
    if (s.dilution !== undefined) {
      if (typeof s.dilution === 'number' && Number.isFinite(s.dilution) && s.dilution > 0) dilution = s.dilution
      else badDilution.push(s.name)
    }
    if (!values.length) emptySample.push(s.name)
    else samples.push({ name: s.name, values, dilution })
  }
  if (dropped) notices.push(`${plural(dropped, 'value that is not a number was', 'values that are not numbers were')} left out.`)
  if (badConc.length) notices.push(`Left out because the concentration is not a number of 0 or more: ${badConc.join(', ')}.`)
  if (emptyStd.length) notices.push(`Standards without a signal were left out: ${emptyStd.join(', ')}.`)
  if (emptySample.length) notices.push(`Samples without a signal were left out: ${emptySample.join(', ')}.`)
  if (badDilution.length) notices.push(`The dilution is not a number above 0, so 1 was used: ${badDilution.join(', ')}.`)

  let blank: number | null = null
  if (input.blank) {
    const zero = standards.filter((s) => s.conc === 0).flatMap((s) => s.values)
    if (zero.length) blank = mean(zero)
    else notices.push('There is no standard at concentration 0, so no blank was subtracted.')
  }
  const less = (v: number[]) => (blank === null ? v : v.map((x) => x - (blank as number)))
  for (const s of standards) s.values = less(s.values)
  for (const s of samples) s.values = less(s.values)

  const points = standards.flatMap((s) => s.values.map((v) => [s.conc, v] as [number, number]))
  const pos = standards.map((s) => s.conc).filter((c) => c > 0)
  const range = { lo: pos.length ? Math.min(...pos) : 0, hi: pos.length ? Math.max(...pos) : 0 }
  const got = fitOrReason(points, input.model)
  const fit = 'fit' in got ? got.fit : null
  if (fit?.turn !== undefined)
    notices.push(`The quadratic curve turns back within the standards (at about ${fit.turn.toPrecision(3)}): signals beyond the turn cannot be read.`)

  const stdOut = standards.map((s) => {
    const m = mean(s.values)
    const back = fit ? fit.inverse(m) : null
    return { name: s.name, conc: s.conc, mean: m, sd: sampleSd(s.values), back, recovery: back !== null && s.conc > 0 ? (back / s.conc) * 100 : null }
  })

  const [sLo, sHi] = fit ? [fit.predict(range.lo), fit.predict(range.hi)] : [NaN, NaN]
  const sampleOut = samples.map((s) => {
    const m = mean(s.values)
    const sd = sampleSd(s.values)
    let side: 'below' | 'above' | null = null
    if (fit) {
      if (fit.rising ? m < sLo : m > sLo) side = 'below'
      else if (fit.rising ? m > sHi : m < sHi) side = 'above'
    }
    const read = fit ? fit.inverse(m) : null
    const conc = read === null ? null : read * s.dilution
    const flag: 'ok' | 'below' | 'above' | 'none' = conc === null ? 'none' : side ?? 'ok'
    return { name: s.name, mean: m, sd, cv: sd !== null && m !== 0 ? (sd / Math.abs(m)) * 100 : null, conc, flag, side, dilution: s.dilution }
  })
  if (fit) {
    const outside = sampleOut.filter((s) => s.flag === 'below' || s.flag === 'above').length
    const none = sampleOut.filter((s) => s.flag === 'none').length
    if (outside) notices.push(`${plural(outside, 'sample lies', 'samples lie')} outside the standards: ${outside === 1 ? 'its concentration is' : 'their concentrations are'} extrapolated from the curve.`)
    if (none) notices.push(`${plural(none, 'sample has a signal', 'samples have signals')} the curve never reaches, so no concentration can be given.`)
  }
  return { fit, ...('reason' in got ? { reason: got.reason } : {}), blank, standards: stdOut, samples: sampleOut, range, notices }
}
