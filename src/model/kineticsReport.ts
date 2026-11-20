// What a kinetics chart says in words: each fitted parameter with its standard error and 95 %
// interval, kcat when the enzyme concentration is given, the comparison of inhibition models, and a
// text for the methods. Worked out from the chart each time, so it cannot go stale.

import { isFit, kcatOf, type Estimate, type InhibitionComparison, type InhibitionModel, type KineticsFit, type KineticsResult } from './kinetics'
import { sig4 } from './standardReport'
import type { ChartNode, KineticsModel } from './types'

export const KINETICS_MODELS: { value: KineticsModel; label: string; title: string }[] = [
  { value: 'mm', label: 'Michaelis–Menten', title: 'v = Vmax·[S] / (Km + [S]), fitted to each series on its own' },
  { value: 'competitive', label: 'Competitive inhibition', title: 'The inhibitor raises the apparent Km; Vmax stays. One fit over all series' },
  { value: 'noncompetitive', label: 'Noncompetitive inhibition', title: 'The inhibitor lowers Vmax; Km stays. One fit over all series' },
  { value: 'uncompetitive', label: 'Uncompetitive inhibition', title: 'The inhibitor lowers Vmax and Km by the same factor. One fit over all series' },
  { value: 'mixed', label: 'Mixed inhibition', title: 'Both change; α says which the inhibitor prefers (above 1: the free enzyme). One fit over all series' },
]

export const MODEL_NAMES: Record<KineticsModel, string> = {
  mm: 'the Michaelis–Menten equation',
  competitive: 'competitive inhibition',
  noncompetitive: 'noncompetitive inhibition',
  uncompetitive: 'uncompetitive inhibition',
  mixed: 'mixed inhibition',
}

const PARAM_NAMES = { vmax: 'Vmax', km: 'Km', ki: 'Ki', alpha: 'α' } as const

/** An estimate as "11.98 ± 0.21 (95 % CI 11.5 to 12.5)". */
export const estimateText = (e: Estimate): string => `${sig4(e.value)} ± ${sig4(e.se)} (95 % CI ${sig4(e.lo)} to ${sig4(e.hi)})`

/** Every parameter of a fit, one per line, then kcat and kcat/Km when the enzyme concentration is known. */
export function fitLines(fit: KineticsFit, enzyme?: number): string[] {
  const lines = fit.names.map((p) => `${PARAM_NAMES[p]} ${estimateText(fit.params[p]!)}`)
  const k = enzyme ? kcatOf(fit, enzyme) : null
  if (k) lines.push(`kcat ${estimateText(k.kcat)}`, `kcat/Km ${estimateText(k.kcatKm)}`)
  lines.push(`R² = ${Number(fit.r2.toFixed(4))}, n = ${fit.n}`)
  return lines
}

/** The four inhibition models side by side: how well each fits and the F test against mixed inhibition. */
export function comparisonRows(c: InhibitionComparison): { model: InhibitionModel; text: string; best: boolean }[] {
  const order: InhibitionModel[] = ['competitive', 'noncompetitive', 'uncompetitive', 'mixed']
  return order.map((model) => {
    const f = c.fits[model]
    if (!isFit(f)) return { model, text: `no curve: ${f.reason}`, best: false }
    const test = model === 'mixed' ? null : c.tests[model]
    const p = test ? (test.p < 0.0001 ? 'p < 0.0001' : `p = ${sig4(test.p)}`) : ''
    return { model, text: `AICc ${sig4(f.aicc)}${test ? `; against mixed: F(${test.df1}, ${test.df2}) = ${sig4(test.f)}, ${p}` : ''}`, best: c.best === model }
  })
}

/** The results as cells, for a spreadsheet or a table on the page: one row per series and parameter. */
export function kineticsCells(node: Pick<ChartNode, 'groups' | 'kinetics'>, result: KineticsResult): string[][] {
  const head = ['Series', 'Parameter', 'Estimate', 'SE', '95 % CI low', '95 % CI high']
  const rows: string[][] = []
  const add = (series: string, fit: KineticsFit) => {
    for (const p of fit.names) {
      const e = fit.params[p]!
      rows.push([series, PARAM_NAMES[p], sig4(e.value), sig4(e.se), sig4(e.lo), sig4(e.hi)])
    }
    const k = node.kinetics?.enzyme ? kcatOf(fit, node.kinetics.enzyme) : null
    if (k) {
      rows.push([series, 'kcat', sig4(k.kcat.value), sig4(k.kcat.se), sig4(k.kcat.lo), sig4(k.kcat.hi)])
      rows.push([series, 'kcat/Km', sig4(k.kcatKm.value), sig4(k.kcatKm.se), sig4(k.kcatKm.lo), sig4(k.kcatKm.hi)])
    }
  }
  if (node.kinetics?.model) {
    const f = result.fits[0]
    if (isFit(f)) add('All series', f)
  } else {
    result.fits.forEach((f, i) => {
      if (isFit(f)) add(node.groups[i]?.name ?? `Series ${i + 1}`, f)
    })
  }
  return [head, ...rows]
}

/** A sentence or two for the methods: the equation, how it was fitted, and the functions of R that give the same numbers. */
export function kineticsMethods(node: Pick<ChartNode, 'groups' | 'kinetics'>, result: KineticsResult): string | null {
  const model = node.kinetics?.model ?? 'mm'
  const fits = result.fits.filter(isFit)
  if (!fits.length) return null
  const n = fits.reduce((a, f) => a + f.n, 0)
  const how = 'by unweighted nonlinear least squares to every replicate rate'
  const ci = 'Standard errors are asymptotic; 95 % confidence intervals are the estimate ± t(0.975, df) × SE.'
  const kcat = node.kinetics?.enzyme ? ` kcat is Vmax divided by the enzyme concentration (${sig4(node.kinetics.enzyme)}), taken as exact; the standard error of kcat/Km follows from the covariance of Vmax and Km (delta method).` : ''
  if (model === 'mm') {
    return `Initial rates were fitted with the Michaelis–Menten equation, v = Vmax·[S]/(Km + [S]), ${how} (${fits.length === 1 ? `n = ${n}` : `each series on its own, ${n} rates in all`}). ${ci}${kcat} The fit is the same as R's nls(v ~ Vmax * S / (Km + S)).`
  }
  const series = node.groups.filter((g) => g.values.length).length
  const compared = result.comparison ? ' The four models of inhibition (competitive, noncompetitive, uncompetitive, mixed) were compared by AICc and, against mixed inhibition, by the extra sum-of-squares F test (R: anova).' : ''
  return `Initial rates at ${series} inhibitor concentrations were fitted together with a model of ${MODEL_NAMES[model]} (the equations of GraphPad Prism), Vmax, Km and Ki shared by all series, ${how} (n = ${n}). ${ci}${kcat}${compared} The fit is the same as R's nls on the table of substrate, inhibitor and rate.`
}
