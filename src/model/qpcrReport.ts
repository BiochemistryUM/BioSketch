// What a qPCR analysis says in words: the fold change of every condition with its error, the test
// against the control, a table of results and a text for the methods. Worked out from the chart
// each time, so it cannot go stale.

import { STARS_KEY, pText } from './chartTests'
import type { QpcrCondition, QpcrResult } from './qpcr'
import { sig4 } from './standardReport'
import type { ChartNode } from './types'

/** "2.31-fold (1.92 to 2.78), n = 3, p = 0.004": one condition of one gene. */
export function foldText(c: QpcrCondition, log2 = false): string {
  const value = log2 ? `log₂ fold change ${sig4(-c.ddct)}` : `${sig4(c.fold)}-fold`
  const range = c.err === null ? '' : log2 ? ` (± ${sig4(c.err)})` : ` (${sig4(c.low!)} to ${sig4(c.high!)})`
  const p = c.t ? `, ${pText(c.t.adjusted)}` : ''
  const pairs = c.pairs !== undefined && c.pairs !== c.n ? ` (${c.pairs} paired)` : ''
  return `${value}${range}, n = ${c.n}${pairs}${p}`
}

/** The results as cells, for a spreadsheet or a table on the page: one row per gene and condition. */
export function qpcrCells(result: QpcrResult, error: 'sd' | 'sem' | undefined): string[][] {
  const e = error === 'sem' ? 'SEM' : 'SD'
  const head = ['Target', 'Condition', 'n', 'Mean ΔCt', 'ΔΔCt', `${e} of ΔΔCt`, 'Fold change', 'Low', 'High', result.paired ? 'p (paired t, Holm)' : 'p (Welch, Holm)']
  const rows = result.genes.flatMap((g) =>
    g.conditions.map((c) => [g.target, c.condition, String(c.n), sig4(c.dct), sig4(c.ddct), c.err === null ? '' : sig4(c.err), sig4(c.fold), c.low === null ? '' : sig4(c.low), c.high === null ? '' : sig4(c.high), c.t ? sig4(c.t.adjusted) : '']),
  )
  return [head, ...rows]
}

/** A few sentences for the methods: how ΔΔCt was worked out, the error, the test, and the functions of R that give the same numbers. */
export function qpcrMethods(node: Pick<ChartNode, 'qpcr' | 'error'>, result: QpcrResult): string | null {
  if (!result.genes.length || !result.control) return null
  const eff = node.qpcr?.efficiency && Object.values(node.qpcr.efficiency).some((v) => v !== 100)
  const refs = result.reference.join(' and ')
  const several = result.reference.length > 1
  const parts = [
    eff
      ? `Relative expression was calculated with the efficiency of each primer pair (Pfaffl 2001): every Cq was multiplied by log₂ of its amplification factor (${Object.entries(node.qpcr!.efficiency!)
          .map(([t, v]) => `${t} ${sig4(v)} %`)
          .join(', ')}; other targets 100 %), so that ΔCt is counted in doublings.`
      : 'Relative expression was calculated by the 2^−ΔΔCt method (Livak and Schmittgen 2001).',
    `Technical replicates were averaged. ΔCt is the Cq of the target less that of ${several ? `the mean of the reference genes ${refs}` : `the reference gene ${refs}`}; ΔΔCt is a sample's ΔCt less the mean ΔCt of ${result.control}, and the fold change is 2^−ΔΔCt.`,
  ]
  if (node.error) {
    const e = node.error === 'sem' ? 'standard error of the mean' : 'standard deviation'
    parts.push(
      result.biological
        ? `Error bars show the ${e} of ΔCt over the biological replicates, carried to the fold-change scale as 2^−(ΔΔCt ± ${node.error === 'sem' ? 'SEM' : 'SD'}).`
        : `Error bars show the ${e} of ΔCt, over the biological replicates where a condition has several and otherwise from the technical replicates as √(s_target² + s_reference²) (Applied Biosystems User Bulletin #2), carried to the fold-change scale as 2^−(ΔΔCt ± s).`,
    )
  }
  if (result.compared > 0) {
    const test = result.paired
      ? `by the paired t test on ΔCt, each sample against the sample of ${result.control} with the same number (R: t.test with paired = TRUE)`
      : "by Welch's t test on ΔCt (R: t.test)"
    parts.push(`Each condition was compared with ${result.control} ${test}${result.compared > 1 ? `, and the p values of each gene were corrected for ${result.compared} comparisons by Holm's method (R: p.adjust)` : ''}.`)
    if (node.qpcr?.marks === 'stars') parts.push(`On the chart, ${STARS_KEY} (corrected p values).`)
  }
  return parts.join(' ')
}
