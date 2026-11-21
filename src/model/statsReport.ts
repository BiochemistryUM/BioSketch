// The statistics of a whole figure in one file: every chart of every slide with its tests (the
// overall test and each pair, with the number of values, the statistic, the p value, the effect size
// and the difference with its interval) as a table for a spreadsheet, and the text for the methods
// of every chart. Everything is worked out from the charts as they are, the same way the panel and
// the page do, so the report cannot say anything the figure does not. Pure.

import { chartAnalysis, chartSamples, curveMethodsText, isBinding, isKinetics, isMelt, isSurvival, methodsText, survivalOf, bindingOf, kineticsOf, meltOf, qpcrOf, standardOf } from './chart'
import { TEST_NAMES } from './chartTests'
import { bindingMethods, meltMethods } from './bindingReport'
import { kineticsMethods } from './kineticsReport'
import { qpcrMethods } from './qpcrReport'
import { slideNodes } from './slides'
import { standardMethods } from './standardReport'
import type { ChartNode, FigDoc } from './types'

export interface ReportRow {
  slide: number
  chart: string
  test: string
  /** "all groups", or the two groups of a pair: "Treated vs Control". */
  comparison: string
  n: string
  statistic: string
  p: number | null
  effect?: { name: string; value: number }
  difference?: { estimate: number; lower: number; upper: number }
}

export interface ReportChart {
  slide: number
  name: string
  methods: string | null
  rows: ReportRow[]
}

/** The text for the methods of a chart, whatever kind of analysis it shows; null when it shows none. */
export function chartMethods(node: ChartNode): string | null {
  if (node.kind === 'qpcr') return qpcrMethods(node, qpcrOf(node))
  if (node.kind === 'standard') return standardMethods(node, standardOf(node))
  if (isKinetics(node)) return kineticsMethods(node, kineticsOf(node))
  if (isBinding(node)) return bindingMethods(node, bindingOf(node))
  if (isMelt(node)) return meltMethods(node, meltOf(node))
  if (node.kind === 'scatter') return curveMethodsText(node)
  return methodsText(node)
}

/** The rows of a chart's tests: the overall test, then every pair. */
function testRows(node: ChartNode, slide: number, chart: string): ReportRow[] {
  if (isSurvival(node)) {
    const { groups, test, pairs, hazards } = survivalOf(node)
    const n = (name: string) => String(groups.find((g) => g.name === name)?.subjects.length ?? '')
    if (!test) return []
    const base = { slide, chart, test: 'Log-rank test' }
    return [
      { ...base, comparison: 'all groups', n: groups.filter((g) => g.subjects.length).map((g) => g.subjects.length).join(', '), statistic: `χ² = ${sig(test.chi2)}, df = ${test.df}`, p: test.p },
      ...pairs.map((x) => ({ ...base, test: 'Log-rank test, Holm’s correction', comparison: `${x.b} vs ${x.a}`, n: `${n(x.b)}, ${n(x.a)}`, statistic: '', p: x.p })),
      ...hazards.flatMap((h) => (h.ratio ? [{ ...base, test: 'Cox model (Efron), hazard ratio', comparison: `${h.name} vs ${h.against}`, n: `${n(h.name)}, ${n(h.against)}`, statistic: `HR = ${sig(h.ratio.ratio)} (95 % interval ${sig(h.ratio.lower)} to ${sig(h.ratio.upper)})`, p: h.ratio.p }] : [])),
    ]
  }
  if (node.kind === 'scatter') return []
  const outcome = chartAnalysis(node)
  if (!outcome?.ok) return []
  const r = outcome.result
  const { names, samples } = chartSamples(node)
  const name = TEST_NAMES[r.test]
  const rows: ReportRow[] = []
  if (r.effects) for (const e of r.effects) rows.push({ slide, chart, test: name, comparison: e.name, n: samples.map((s) => s.length).join(', '), statistic: e.statistic, p: e.p })
  else rows.push({ slide, chart, test: name, comparison: 'all groups', n: samples.map((s) => s.length).join(', '), statistic: r.statistic, p: r.p, ...(r.effect ? { effect: r.effect } : {}), ...(samples.length === 2 && r.pairs[0]?.diff ? { difference: r.pairs[0].diff } : {}) })
  if (samples.length > 2 || r.effects)
    for (const pair of r.pairs) rows.push({ slide, chart, test: r.pairMethod || name, comparison: `${names[pair.b]} vs ${names[pair.a]}`, n: `${samples[pair.b]?.length ?? ''}, ${samples[pair.a]?.length ?? ''}`, statistic: '', p: pair.p, ...(pair.diff ? { difference: pair.diff } : {}) })
  return rows
}

const sig = (v: number): string => String(Number(v.toPrecision(3)))

/** Every chart of the figure that shows a test or another analysis, slide by slide, in the order of the objects. */
export function figureStatistics(doc: FigDoc): ReportChart[] {
  const out: ReportChart[] = []
  let unnamed = 0
  slideNodes(doc).forEach((nodes, i) => {
    for (const node of nodes) {
      if (node.type !== 'chart') continue
      let methods: string | null = null
      let rows: ReportRow[] = []
      try {
        methods = chartMethods(node)
        rows = testRows(node, i + 1, node.title?.trim() || `Chart ${unnamed + 1}`)
      } catch {
        // A chart whose numbers cannot be worked out is left out of the report, as the page shows nothing for it.
      }
      // Charts without a title are counted among those in the report, which is how the reader finds them.
      if (methods || rows.length) out.push({ slide: i + 1, name: node.title?.trim() || `Chart ${++unnamed}`, methods, rows })
    }
  })
  return out
}

/** A cell of a CSV file: quoted when it holds a comma, a quote or a line break, and never read as a formula by a spreadsheet. */
function cell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return ''
  let s = typeof v === 'number' ? (Number.isFinite(v) ? String(Number(v.toPrecision(6))) : '') : v
  if (/^[=+\-@\t\r]/.test(s) && typeof v === 'string') s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const HEAD = ['Slide', 'Chart', 'Test', 'Comparison', 'n', 'Statistic', 'p', 'Effect size', 'Effect size value', 'Difference of means', 'Lower 95 %', 'Upper 95 %']

/** The tests of the figure as a CSV table, one row per overall test and per pair. */
export function reportCsv(charts: ReportChart[]): string {
  const lines = [HEAD.map(cell).join(',')]
  for (const c of charts)
    for (const r of c.rows) lines.push([r.slide, r.chart, r.test, r.comparison, r.n, r.statistic, r.p, r.effect?.name, r.effect?.value, r.difference?.estimate, r.difference?.lower, r.difference?.upper].map(cell).join(','))
  return `${lines.join('\r\n')}\r\n`
}

/** The statistics of the figure as plain text: every chart with its methods and its results. */
export function reportText(charts: ReportChart[], title: string): string {
  const several = new Set(charts.map((c) => c.slide)).size > 1
  const blocks = charts.map((c) => {
    const lines = [`${several ? `Slide ${c.slide}, ` : ''}${c.name}`]
    if (c.methods) lines.push('', c.methods)
    if (c.rows.length) {
      lines.push('')
      for (const r of c.rows) {
        const parts = [r.statistic, r.p === null ? 'p cannot be worked out' : r.p < 0.0001 ? 'p < 0.0001' : `p = ${sig(r.p)}`]
        if (r.effect) parts.push(`${r.effect.name} = ${sig(r.effect.value)}`)
        if (r.difference) parts.push(`difference ${sig(r.difference.estimate)} (95 % interval ${sig(r.difference.lower)} to ${sig(r.difference.upper)})`)
        lines.push(`  ${r.comparison} (${r.test}; n = ${r.n}): ${parts.filter(Boolean).join(', ')}`)
      }
    }
    return lines.join('\n')
  })
  return `Statistics of ${title}\n\n${blocks.join('\n\n')}\n`
}
