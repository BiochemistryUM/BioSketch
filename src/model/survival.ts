// Survival analysis: how long until something happens (death, relapse, hatching), when some
// subjects leave the study before it does ("censored": they are known to have lasted at least
// that long). The Kaplan-Meier estimate gives the share still without the event at each time; the
// log-rank test asks whether groups differ over the whole course.
//
// Both follow R's `survival` package (`survfit` and `survdiff`) and are pinned to it through
// tests/stats-reference.json.

import { solve } from './chartStats'
import { chiSquaredUpper } from './distributions'

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
  for (const time of times) {
    const here = all.filter((s) => s.time === time)
    const events = here.filter((s) => s.event).length
    if (events) survival *= 1 - events / atRisk
    steps.push({ time, atRisk, events, censored: here.length - events, survival })
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
