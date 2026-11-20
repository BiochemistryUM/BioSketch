// Survival analysis: how long until something happens (death, relapse, hatching), when some
// subjects leave the study before it does ("censored": they are known to have lasted at least
// that long). The Kaplan-Meier estimate gives the share still without the event at each time; the
// log-rank test asks whether groups differ over the whole course.
//
// Both follow R's `survival` package (`survfit` and `survdiff`) and are pinned to it through
// tests/stats-reference.json.

import { solve } from './chartStats'
import { chiSquaredUpper, normalBelow } from './distributions'

/** One subject: how long it was followed, and whether the event happened then (otherwise it left without it). */
export interface Subject {
  time: number
  event: boolean
}

export interface KmStep {
  time: number
  /** Subjects still followed just before this time. */
  atRisk: number
  events: number
  censored: number
  /** The estimated share without the event just after this time, 0 to 1. */
  survival: number
  /**
   * The 95 % confidence limits of that share, as R's `survfit` gives them by default (on the
   * logarithm of the share, with Greenwood's variance; the upper limit is never above 1). Null
   * once the share is zero, where there is no interval.
   */
  lower: number | null
  upper: number | null
}

export interface KaplanMeier {
  /** One entry per time at which something happened, in order. */
  steps: KmStep[]
  n: number
  events: number
  /** The time by which half have had the event; null when the curve never comes down to one half. */
  median: number | null
}

const usable = (s: Subject): boolean => Number.isFinite(s.time) && s.time >= 0

/** How many standard errors a 95 % interval reaches to either side (R: qnorm(0.975)). */
const Z95 = 1.959963984540054

/**
 * The Kaplan-Meier estimate. At every time with events the share still without the event is
 * multiplied by (1 − events / subjects still followed); subjects that leave at a time count as
 * followed at that time. The median is the first time the estimate is at or below one half; when
 * it is exactly one half over a stretch, the middle of that stretch (as R's survfit reports it).
 */
export function kaplanMeier(subjects: Subject[]): KaplanMeier {
  const all = subjects.filter(usable)
  const times = [...new Set(all.map((s) => s.time))].sort((a, b) => a - b)
  const steps: KmStep[] = []
  let atRisk = all.length
  let survival = 1
  // Greenwood's sum: events / (followed × (followed − events)) over every time with events so far.
  let greenwood = 0
  for (const time of times) {
    const here = all.filter((s) => s.time === time)
    const events = here.filter((s) => s.event).length
    if (events) {
      survival *= 1 - events / atRisk
      greenwood += events / (atRisk * (atRisk - events))
    }
    const reach = Z95 * Math.sqrt(greenwood)
    const limits = survival > 0 && Number.isFinite(reach) ? { lower: survival * Math.exp(-reach), upper: Math.min(1, survival * Math.exp(reach)) } : { lower: null, upper: null }
    steps.push({ time, atRisk, events, censored: here.length - events, survival, ...limits })
    atRisk -= here.length
  }
  let median: number | null = null
  const down = steps.filter((s) => s.events > 0)
  const at = down.findIndex((s) => s.survival <= 0.5 + 1e-9)
  if (at >= 0) {
    median = down[at].time
    // Exactly one half until the next event: any time in between has an equal claim, so the middle is taken.
    if (Math.abs(down[at].survival - 0.5) <= 1e-9 && down[at + 1]) median = (down[at].time + down[at + 1].time) / 2
  }
  return { steps, n: all.length, events: all.filter((s) => s.event).length, median }
}

/** The estimated share without the event at a time: the estimate of the last step at or before it. */
export function survivalAt(km: KaplanMeier, time: number): number {
  let share = 1
  for (const step of km.steps) {
    if (step.time > time) break
    share = step.survival
  }
  return share
}

/**
 * The log-rank test for two or more groups (Mantel-Haenszel, R's `survdiff` with rho = 0): at every
 * time with events, the events of each group are compared with what its share of the subjects
 * still followed would lead one to expect; chi-squared with one degree of freedom fewer than
 * there are groups. Null with fewer than two groups that have subjects, or when no event happened
 * while more than one group was still followed.
 */
export function logRank(groups: Subject[][]): { chi2: number; df: number; p: number; observed: number[]; expected: number[] } | null {
  const sets = groups.map((g) => g.filter(usable)).filter((g) => g.length)
  const k = sets.length
  if (k < 2) return null
  const times = [...new Set(sets.flatMap((g) => g.filter((s) => s.event).map((s) => s.time)))].sort((a, b) => a - b)
  const observed = new Array<number>(k).fill(0)
  const expected = new Array<number>(k).fill(0)
  const variance = Array.from({ length: k }, () => new Array<number>(k).fill(0))
  for (const time of times) {
    const atRisk = sets.map((g) => g.filter((s) => s.time >= time).length)
    const died = sets.map((g) => g.filter((s) => s.event && s.time === time).length)
    const n = atRisk.reduce((a, v) => a + v, 0)
    const d = died.reduce((a, v) => a + v, 0)
    for (let i = 0; i < k; i++) {
      observed[i] += died[i]
      expected[i] += (d * atRisk[i]) / n
      if (n > 1) {
        const spread = (d * (n - d)) / (n - 1)
        for (let j = 0; j < k; j++) variance[i][j] += spread * (atRisk[i] / n) * ((i === j ? 1 : 0) - atRisk[j] / n)
      }
    }
  }
  // One group follows from the others, so it is left out of the sum.
  const u = observed.slice(0, k - 1).map((o, i) => o - expected[i])
  const v = variance.slice(0, k - 1).map((row) => row.slice(0, k - 1))
  const w = solve(v, u)
  if (!w) return null
  const chi2 = u.reduce((a, x, i) => a + x * w[i], 0)
  if (!Number.isFinite(chi2) || chi2 < 0) return null
  return { chi2, df: k - 1, p: chiSquaredUpper(chi2, k - 1), observed, expected }
}

// ---------- hazard ratios ----------

export interface HazardRatio {
  /** The hazard of this group relative to the first: below 1, the event comes more slowly than in the first group. */
  ratio: number
  /** Its 95 % confidence limits (Wald, on the logarithm of the ratio). */
  lower: number
  upper: number
  /** The two-sided p value of the ratio being 1 (Wald test). */
  p: number
}

/**
 * The hazard ratio of every group after the first against the first group, from Cox's proportional
 * hazards model with the group as its only factor, ties handled by Efron's method: the defaults of
 * `coxph` in R's survival package. Null where the model cannot be fitted: fewer than two groups, a
 * group without subjects, no event, or a ratio that runs off to zero or infinity (every event of
 * one group before or after all of another's).
 */
export function hazardRatios(groups: Subject[][]): (HazardRatio | null)[] | null {
  const sets = groups.map((g) => g.filter(usable))
  const p = sets.length - 1
  if (p < 1 || sets.some((g) => !g.length)) return null
  const all = sets.flatMap((g, k) => g.map((s) => ({ ...s, k })))
  const times = [...new Set(all.filter((s) => s.event).map((s) => s.time))].sort((a, b) => a - b)
  if (!times.length) return null
  // For every time with events: how many of each group are still followed, and how many have the event.
  const rows = times.map((time) => ({
    risk: sets.map((g) => g.filter((s) => s.time >= time).length),
    dead: sets.map((g) => g.filter((s) => s.event && s.time === time).length),
  }))

  /** The slope and the curvature of the log partial likelihood at `beta` (one coefficient per group after the first). */
  const score = (beta: number[]): { u: number[]; info: number[][] } => {
    const w = [1, ...beta.map((b) => Math.exp(b))]
    const u = new Array<number>(p).fill(0)
    const info = Array.from({ length: p }, () => new Array<number>(p).fill(0))
    for (const { risk, dead } of rows) {
      const d = dead.reduce((a, v) => a + v, 0)
      for (let j = 0; j < p; j++) u[j] += dead[j + 1]
      // Efron: the subjects that have the event at this time leave the risk set a share at a time.
      for (let l = 0; l < d; l++) {
        const f = l / d
        const s = w.map((wk, k) => wk * (risk[k] - f * dead[k]))
        const total = s.reduce((a, v) => a + v, 0)
        for (let j = 0; j < p; j++) {
          const share = s[j + 1] / total
          u[j] -= share
          for (let m = 0; m < p; m++) info[j][m] += (j === m ? share : 0) - share * (s[m + 1] / total)
        }
      }
    }
    return { u, info }
  }

  /** The inverse of a small symmetric matrix; null when it has none. */
  const inverse = (a: number[][]): number[][] | null => {
    const n = a.length
    const m = a.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))])
    for (let c = 0; c < n; c++) {
      let pivot = c
      for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[pivot][c])) pivot = r
      if (!(Math.abs(m[pivot][c]) > 1e-12)) return null
      ;[m[c], m[pivot]] = [m[pivot], m[c]]
      const lead = m[c][c]
      for (let k = 0; k < 2 * n; k++) m[c][k] /= lead
      for (let r = 0; r < n; r++) {
        if (r === c) continue
        const f = m[r][c]
        if (f) for (let k = 0; k < 2 * n; k++) m[r][k] -= f * m[c][k]
      }
    }
    return m.map((row) => row.slice(n))
  }

  // Newton's method from no difference between the groups.
  let beta = new Array<number>(p).fill(0)
  let variance: number[][] | null = null
  for (let step = 0; step < 50; step++) {
    const { u, info } = score(beta)
    variance = inverse(info)
    if (!variance) return sets.slice(1).map(() => null)
    const move = variance.map((row) => row.reduce((a, v, j) => a + v * u[j], 0))
    beta = beta.map((b, j) => b + move[j])
    if (beta.some((b) => !Number.isFinite(b) || Math.abs(b) > 20)) return sets.slice(1).map(() => null)
    if (move.every((m) => Math.abs(m) < 1e-10)) break
  }
  variance = inverse(score(beta).info)
  if (!variance) return sets.slice(1).map(() => null)
  return beta.map((b, j) => {
    const se = Math.sqrt(variance![j][j])
    if (!(se > 0) || !Number.isFinite(se)) return null
    return { ratio: Math.exp(b), lower: Math.exp(b - Z95 * se), upper: Math.exp(b + Z95 * se), p: 2 * normalBelow(-Math.abs(b / se)) }
  })
}
