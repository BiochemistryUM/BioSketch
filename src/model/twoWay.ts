// Two factors at once: a chart with categories along the bottom and series in the legend, where
// every combination holds separate samples. The two-way analysis of variance asks whether the
// categories differ, whether the series differ, and whether the difference between series depends
// on the category (the interaction).
//
// Sums of squares are of "Type II": each factor is tested after allowing for the other, the
// interaction after allowing for both. With the same number of values in every combination this
// is what R's aov(y ~ A * B) gives; with unequal numbers it does not depend on the order of the
// factors, as aov's would. Reference values come from R (scripts/stats-reference.R).

import { solve } from './chartStats'
import { TEST_DOES, holm, pText, shapiroWilk, type Advice, type Outcome, type PairResult } from './chartTests'
import { fUpper, tTwoSided } from './distributions'

export interface Effect {
  /** Sum of squares, degrees of freedom, F and its p value. */
  ss: number
  df: number
  f: number
  p: number
}

export interface TwoWay {
  /** The factor along the bottom of the chart (categories), the one in the legend (series), and their interaction. */
  category: Effect
  series: Effect
  interaction: Effect
  /** What is left over within the combinations: its degrees of freedom and mean square. */
  dfError: number
  msError: number
}

const sum = (v: number[]): number => v.reduce((a, x) => a + x, 0)

/**
 * `cells[i][j]` holds the values of category i and series j. Null when the analysis is not
 * defined: fewer than two categories or series, an empty combination, no more values than
 * combinations, or values that do not scatter within the combinations.
 */
export function twoWayAnova(cells: number[][][]): TwoWay | null {
  const a = cells.length
  const b = cells[0]?.length ?? 0
  if (a < 2 || b < 2 || cells.some((row) => row.length !== b || row.some((cell) => !cell.length))) return null
  const n = cells.map((row) => row.map((cell) => cell.length))
  const mean = cells.map((row) => row.map((cell) => sum(cell) / cell.length))
  const total = sum(n.flat())
  const dfError = total - a * b
  if (dfError < 1) return null
  const within = sum(cells.flatMap((row, i) => row.map((cell, j) => sum(cell.map((v) => (v - mean[i][j]) ** 2)))))
  if (!(within > 0)) return null

  /** What a model that predicts `fitted[i][j]` for every value of a combination leaves unexplained. */
  const left = (fitted: (i: number, j: number) => number): number => within + sum(n.flatMap((row, i) => row.map((count, j) => count * (mean[i][j] - fitted(i, j)) ** 2)))
  const rowMean = cells.map((row, i) => sum(row.map((_, j) => n[i][j] * mean[i][j])) / sum(n[i]))
  const colMean = cells[0].map((_, j) => sum(cells.map((_, i) => n[i][j] * mean[i][j])) / sum(cells.map((_, i) => n[i][j])))
  // Both factors side by side, no interaction: least squares on one column for the base, one for
  // every category but the first and one for every series but the first.
  const size = a + b - 1
  // Columns: the base, then one for every category but the first, then one for every series but the first.
  const column = (i: number, j: number): number[] => Array.from({ length: size }, (_, k) => (k === 0 || (k < a && k === i) || (k >= a && k - a + 1 === j) ? 1 : 0))
  const xtx = Array.from({ length: size }, () => new Array<number>(size).fill(0))
  const xty = new Array<number>(size).fill(0)
  for (let i = 0; i < a; i++) {
    for (let j = 0; j < b; j++) {
      const x = column(i, j)
      for (let p = 0; p < size; p++) {
        xty[p] += n[i][j] * x[p] * mean[i][j]
        for (let q = 0; q < size; q++) xtx[p][q] += n[i][j] * x[p] * x[q]
      }
    }
  }
  const beta = solve(xtx, xty)
  if (!beta) return null
  const both = left((i, j) => sum(column(i, j).map((x, k) => x * beta[k])))
  const msError = within / dfError
  const effect = (ss: number, df: number): Effect => {
    const f = Math.max(0, ss) / df / msError
    return { ss: Math.max(0, ss), df, f, p: fUpper(f, df, dfError) }
  }
  return {
    category: effect(left((_, j) => colMean[j]) - both, a - 1),
    series: effect(left((i) => rowMean[i]) - both, b - 1),
    interaction: effect(both - within, (a - 1) * (b - 1)),
    dfError,
    msError,
  }
}

/** Two combinations compared by a t test that uses the scatter left over in the whole table (two-sided); null when one of them is empty. */
export function pooledCellPair(x: number[], y: number[], fit: Pick<TwoWay, 'dfError' | 'msError'>): number | null {
  if (!x.length || !y.length) return null
  const t = (sum(x) / x.length - sum(y) / y.length) / Math.sqrt(fit.msError * (1 / x.length + 1 / y.length))
  return tTwoSided(t, fit.dfError)
}

// ---------- on the table of a chart ----------

/** The two factors of a chart's table: the names along the bottom and in the legend, and where each combination stands among the samples. */
export interface Factors {
  categories: string[]
  series: string[]
  /** `place[i][j]` is the place of category i, series j among the samples; -1 when the table has no values for it. */
  place: number[][]
}

const three = (v: number): string => String(Number(v.toPrecision(3)))
const listed = (items: string[]): string => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`)
const CONSTANT = 'The test cannot be worked out: the values do not scatter within the combinations.'

/** Why the table cannot be analysed for two factors; null when it can. */
function unfit(samples: number[][], f: Factors): string | null {
  if (f.categories.length < 2 || f.series.length < 2) return 'Two factors need at least two categories and two series. With one category, leave the upper row of names out and the groups are compared as one factor.'
  for (let i = 0; i < f.categories.length; i++) {
    for (let j = 0; j < f.series.length; j++) {
      if (f.place[i][j] < 0 || !samples[f.place[i][j]]?.length) return `A two-way analysis needs values in every combination of category and series: “${f.categories[i]} · ${f.series[j]}” has none.`
    }
  }
  if (samples.reduce((a, s) => a + s.length, 0) <= f.categories.length * f.series.length) return 'A two-way analysis needs more values than there are combinations of category and series: at least two values in some of them.'
  return null
}

const cellsOf = (samples: number[][], f: Factors): number[][][] => f.place.map((row) => row.map((at) => samples[at]))

/**
 * The two-way analysis of a chart's table, with its pairs: the series within each category, or
 * (`across`) the categories within each series, by t tests that use the scatter left over in the
 * whole table, corrected by Holm over all the pairs compared.
 */
export function analyseTwoWay(samples: number[][], f: Factors, across: boolean): Outcome {
  const problem = unfit(samples, f)
  if (problem) return { ok: false, problem }
  const cells = cellsOf(samples, f)
  const fit = twoWayAnova(cells)
  if (!fit) return { ok: false, problem: CONSTANT }
  const said = (e: Effect): string => `F(${e.df}, ${fit.dfError}) = ${three(e.f)}`
  const wanted: [number, number][] = []
  if (across) for (let j = 0; j < f.series.length; j++) for (let a = 0; a < f.categories.length; a++) for (let b = a + 1; b < f.categories.length; b++) wanted.push([f.place[a][j], f.place[b][j]])
  else for (let i = 0; i < f.categories.length; i++) for (let a = 0; a < f.series.length; a++) for (let b = a + 1; b < f.series.length; b++) wanted.push([f.place[i][a], f.place[i][b]])
  const raw = wanted.map(([a, b]) => pooledCellPair(samples[a], samples[b], fit))
  const known = raw.flatMap((v, i) => (v === null ? [] : [{ v, i }]))
  const adjusted = holm(known.map((x) => x.v))
  known.forEach((x, k) => (raw[x.i] = adjusted[k]))
  const pairs: PairResult[] = wanted.map(([a, b], i) => ({ a, b, p: raw[i] }))
  const sizes = samples.map((s) => s.length)
  const notes = sizes.every((n) => n === sizes[0]) ? [] : ['The combinations hold different numbers of values, so each factor is tested after allowing for the other (Type II sums of squares).']
  return {
    ok: true,
    result: {
      test: 'twoWay',
      statistic: said(fit.interaction),
      p: fit.interaction.p,
      effects: [
        { name: `Interaction (does the difference between ${listed(f.series)} depend on the category?)`, statistic: said(fit.interaction), p: fit.interaction.p },
        { name: `Between the categories (${listed(f.categories)})`, statistic: said(fit.category), p: fit.category.p },
        { name: `Between the series (${listed(f.series)})`, statistic: said(fit.series), p: fit.series.p },
      ],
      pairs,
      pairMethod: `t tests with the scatter pooled over all combinations, ${across ? 'the categories within each series' : 'the series within each category'}, Holm’s correction`,
      notes,
    },
  }
}

/** What to tell the scientist about a table with two factors: the analysis that fits, why, and what to keep in mind. */
export function suggestTwoWay(samples: number[][], f: Factors): Advice {
  const problem = unfit(samples, f)
  if (problem) return { test: null, by: null, does: '', why: [problem], cautions: [] }
  const sizes = samples.map((s) => s.length)
  const [least, most] = [Math.min(...sizes), Math.max(...sizes)]
  const why = [
    `The table has ${f.categories.length} categories (${listed(f.categories)}) and ${f.series.length} series (${listed(f.series)}): two factors, with ${least === most ? least : `${least} to ${most}`} values in every combination.`,
    'The combinations hold separate samples: values that happen to stand in the same row have nothing to do with each other.',
    'One analysis for both factors can tell whether the effect of one depends on the other (the interaction), which separate tests for each category cannot.',
  ]
  const cautions: string[] = []
  const rest = samples.filter((s) => s.length > 1).flatMap((s) => s.map((v) => v - s.reduce((a, x) => a + x, 0) / s.length))
  const normal = shapiroWilk(rest)
  if (normal && normal.p < 0.05) cautions.push(`The values around the mean of their combination do not scatter like a normal distribution (Shapiro–Wilk test, ${pText(normal.p)}). There is no test on ranks for two factors here: if the scatter grows with the mean, analyse the logarithms of the values instead.`)
  else if (normal) {
    why.push(`The values around the mean of their combination scatter the way a normal distribution would (Shapiro–Wilk test, ${pText(normal.p)}).`)
    if (least < 8) cautions.push(`With ${least === most ? `${least} values in each combination` : `${least} values in the smallest combination`} that check can only catch a gross departure from a normal distribution. Also go by what is known about this kind of measurement.`)
  } else cautions.push('There are too few different values to check how they are distributed. Go by what is known about this kind of measurement.')
  if (least < 3) cautions.push('With fewer than three values in a combination the scatter is poorly known, and so is every p value that rests on it.')
  const sds = samples.filter((s) => s.length > 1).map((s) => Math.sqrt(s.reduce((a, v) => a + (v - s.reduce((x, y) => x + y, 0) / s.length) ** 2, 0) / (s.length - 1)))
  if (sds.length > 1 && Math.max(...sds) > 3 * Math.min(...sds)) cautions.push(`The combinations scatter very differently (standard deviations from ${three(Math.min(...sds))} to ${three(Math.max(...sds))}), which an analysis of variance does not allow for. Logarithms of the values are often analysed instead.`)
  cautions.push('Samples measured repeatedly (the same animal in every category or series) need a different analysis, which is not built here.')
  return { test: 'twoWay', by: 'means', does: TEST_DOES.twoWay, why, cautions }
}
