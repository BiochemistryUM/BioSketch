// Nonlinear least squares for the curves of saturation binding and melting: Levenberg–Marquardt
// from several starting points, as `search` in kinetics.ts, `settle` in chartStats.ts and the fits
// of standard curves. A parameter that must be above zero (Kd, Bmax) is searched on its logarithm,
// which keeps it there; the others as they are. The standard errors are those of R's
// summary(nls): s² (JᵀJ)⁻¹ in the parameters themselves, which does not depend on the scale the
// search used.

import { solve } from './chartStats'
import { tCritical } from './distributions'

/** A fitted parameter with its standard error and 95 % interval (estimate ± t SE). */
export interface Estimate {
  value: number
  se: number
  lo: number
  hi: number
}

/** The value of the curve at one point and its derivatives with respect to every parameter. */
export type Curve<P> = (th: number[], p: P) => { y: number; d: number[] }

export interface NlsFit {
  /** The parameters, in the order given. */
  th: number[]
  est: Estimate[]
  /** Covariance of the parameters (R: vcov(nls)). */
  cov: number[][]
  n: number
  df: number
  sse: number
  /** Residual standard error, sqrt(sse / df). */
  sy: number
  /** 1 − sse / sst, sst around the mean of every y. */
  r2: number
  tcrit: number
}

interface Found {
  q: number[]
  sse: number
  settled: boolean
}

/** The outcome of a fit: the best search that came to rest, and where the lowest search of all ended. */
export interface NlsOutcome {
  fit: NlsFit | null
  /** The parameters where the lowest sum of squares was found, settled or not: says which way a search ran off. */
  lowest: number[] | null
  /** True when a search went lower than any that came to rest: the least-squares solution lies at a limit. */
  ranOff: boolean
}

const mean = (v: number[]): number => v.reduce((a, x) => a + x, 0) / v.length

/**
 * Fits `curve` to the points by least squares from every starting point (in the parameters
 * themselves); `positive[j]` keeps parameter j above zero.
 */
export function nls<P extends { y: number }>(pts: P[], curve: Curve<P>, starts: number[][], positive: boolean[]): NlsOutcome {
  const k = positive.length
  const toTh = (q: number[]): number[] => q.map((v, j) => (positive[j] ? Math.exp(v) : v))
  const ys = pts.map((p) => p.y)
  const my = mean(ys)
  const sst = ys.reduce((a, y) => a + (y - my) ** 2, 0)
  const cost = (q: number[]): number => {
    const th = toTh(q)
    let sum = 0
    for (const p of pts) sum += (p.y - curve(th, p).y) ** 2
    return sum
  }
  const normal = (q: number[]) => {
    const th = toTh(q)
    const jtj = Array.from({ length: k }, () => new Array<number>(k).fill(0))
    const jtr = new Array<number>(k).fill(0)
    for (const p of pts) {
      const { y, d } = curve(th, p)
      const r = p.y - y
      const dq = d.map((x, j) => (positive[j] ? x * th[j] : x))
      for (let a = 0; a < k; a++) {
        jtr[a] += dq[a] * r
        for (let b = 0; b < k; b++) jtj[a][b] += dq[a] * dq[b]
      }
    }
    return { jtj, jtr }
  }
  const search = (start: number[]): Found | null => {
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
        const left = next && next.every((x, a) => Number.isFinite(x) && (!positive[a] || Math.abs(x) < 700)) ? cost(next) : NaN
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
    const { jtj, jtr } = normal(q)
    const settled = sse <= 1e-20 * Math.max(sst, 1e-300) || jtr.every((v, a) => Math.abs(v) <= 1e-6 * Math.sqrt(jtj[a][a] * sse) + 1e-300)
    return { q, sse, settled }
  }

  let best: Found | null = null
  let lowest: Found | null = null
  for (const start of starts) {
    if (start.length !== k || !start.every((x, j) => Number.isFinite(x) && (!positive[j] || x > 0))) continue
    const found = search(start.map((v, j) => (positive[j] ? Math.log(v) : v)))
    if (!found) continue
    if (!lowest || found.sse < lowest.sse) lowest = found
    if (found.settled && (!best || found.sse < best.sse)) best = found
  }
  if (!lowest) return { fit: null, lowest: null, ranOff: false }
  const ranOff = !best || lowest.sse < best.sse * (1 - 1e-9)
  if (!best) return { fit: null, lowest: toTh(lowest.q), ranOff }
  const th = toTh(best.q)
  const n = pts.length
  const df = n - k
  // JᵀJ in the parameters themselves, for the covariance.
  const jtj = Array.from({ length: k }, () => new Array<number>(k).fill(0))
  for (const p of pts) {
    const { d } = curve(th, p)
    for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) jtj[a][b] += d[a] * d[b]
  }
  const inv = df > 0 ? inverse(jtj) : null
  if (!inv) return { fit: null, lowest: toTh(lowest.q), ranOff }
  const s2 = best.sse / df
  const cov = inv.map((row) => row.map((v) => v * s2))
  const tcrit = tCritical(0.05, df)
  const est = th.map((value, a) => {
    const se = Math.sqrt(cov[a][a])
    return { value, se, lo: value - tcrit * se, hi: value + tcrit * se }
  })
  return {
    fit: { th, est, cov, n, df, sse: best.sse, sy: Math.sqrt(s2), r2: sst > 0 ? 1 - best.sse / sst : 1, tcrit },
    lowest: toTh(lowest.q),
    ranOff,
  }
}

/** (JᵀJ)⁻¹, worked out on the matrix scaled to unit diagonal; null when the points do not pin down every parameter. */
export function inverse(jtj: number[][]): number[][] | null {
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
