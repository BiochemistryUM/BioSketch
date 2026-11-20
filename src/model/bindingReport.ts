// What a binding chart and a melting chart say in words: every fitted parameter with its standard
// error and 95 % interval, the melting temperatures and their differences, a table of results and a
// text for the methods. Worked out from the chart each time, so it cannot go stale.

import { isBindingFit, type BindingFit, type BindingModel, type BindingParam, type BindingResult, BINDING_PARAMS, bindingModel } from './binding'
import { pText } from './chartTests'
import { estimateText } from './kineticsReport'
import { isMeltFit, type MeltCondition, type MeltFit, type MeltResult } from './melt'
import { sig4 } from './standardReport'
import type { ChartNode } from './types'

export const BINDING_MODELS: { value: BindingModel; label: string; title: string }[] = [
  { value: 'specific', label: 'One site, specific binding', title: 'B = Bmax·X / (Kd + X), fitted to each series on its own' },
  { value: 'hill', label: 'One site with a Hill slope', title: 'B = Bmax·Xʰ / (Kdʰ + Xʰ): binding sites that help or hinder each other' },
  { value: 'total', label: 'Total and nonspecific', title: 'The total binding and the nonspecific binding fitted together, the nonspecific a straight line' },
]

const PARAM_NAMES: Record<BindingParam, string> = { bmax: 'Bmax', kd: 'Kd', h: 'Hill slope', ns: 'NS (slope of nonspecific)', bkg: 'Background' }

/** Every parameter of a binding fit, one per line, with the test of the Hill slope. */
export function bindingLines(fit: BindingFit): string[] {
  const lines = BINDING_PARAMS[fit.model].map((p) => `${PARAM_NAMES[p]} ${estimateText(fit.params[p]!)}`)
  if (fit.hillTest) lines.push(`Hill slope against 1: F(1, ${fit.hillTest.df2}) = ${sig4(fit.hillTest.f)}, ${pText(fit.hillTest.p)}`)
  lines.push(`R² = ${Number(fit.r2.toFixed(4))}, n = ${fit.n}`)
  return lines
}

/** The results as cells, for a spreadsheet or a table on the page: one row per series and parameter. */
export function bindingCells(node: Pick<ChartNode, 'groups'>, result: BindingResult): string[][] {
  const head = ['Series', 'Parameter', 'Estimate', 'SE', '95 % CI low', '95 % CI high']
  const rows: string[][] = []
  const add = (series: string, fit: BindingFit) => {
    for (const p of BINDING_PARAMS[fit.model]) {
      const e = fit.params[p]!
      rows.push([series, PARAM_NAMES[p], sig4(e.value), sig4(e.se), sig4(e.lo), sig4(e.hi)])
    }
  }
  if (result.pair) {
    const f = result.fits[0]
    if (isBindingFit(f)) add(node.groups[result.pair.total]?.name || 'Total', f)
  } else result.fits.forEach((f, i) => isBindingFit(f) && add(node.groups[i]?.name || `Series ${i + 1}`, f))
  return [head, ...rows]
}

/** A few sentences for the methods: the equation, how it was fitted, and the functions of R that give the same numbers. */
export function bindingMethods(node: Pick<ChartNode, 'groups' | 'binding'>, result: BindingResult): string | null {
  const fits = result.fits.filter(isBindingFit)
  if (!fits.length) return null
  const n = fits.reduce((a, f) => a + f.n, 0)
  const how = `by unweighted nonlinear least squares to every replicate (${fits.length === 1 ? `n = ${n}` : `each series on its own, ${n} values in all`})`
  const ci = 'Standard errors are asymptotic; 95 % confidence intervals are the estimate ± t(0.975, df) × SE.'
  const model = bindingModel(node.binding)
  if (model === 'specific') return `Specific binding was fitted with a one-site model, B = Bmax·x/(Kd + x), x the free ligand concentration, ${how}. ${ci} The fit is the same as R's nls(B ~ Bmax * x / (Kd + x)).`
  if (model === 'hill')
    return `Specific binding was fitted with a one-site model with a Hill slope, B = Bmax·xʰ/(Kdʰ + xʰ), ${how}. ${ci} Whether the Hill slope differs from 1 was tested by the extra sum-of-squares F test against the one-site model (R: anova of the two nls fits). The fit is the same as R's nls(B ~ Bmax * x^h / (Kd^h + x^h)).`
  return `Total and nonspecific binding were fitted together (GraphPad Prism's "one site, total and nonspecific binding"): total = Bmax·x/(Kd + x) + NS·x + background, nonspecific = NS·x + background, with NS and the background shared, by unweighted nonlinear least squares to every replicate (n = ${n}). ${ci} The fit is the same as R's nls(B ~ t * Bmax * x / (Kd + x) + NS * x + Bkg), t being 1 for total and 0 for nonspecific binding.`
}

/** The Tm of a curve as words: "52.00 ± 0.04 °C (95 % CI 51.9 to 52.1)" or "52.06 °C". */
export function tmText(fit: MeltFit): string {
  const tm = fit.tm as Partial<{ value: number; se: number; lo: number; hi: number }>
  return tm.se !== undefined ? `${sig4(tm.value!)} ± ${sig4(tm.se)} °C (95 % CI ${sig4(tm.lo!)} to ${sig4(tm.hi!)})` : `${sig4(tm.value!)} °C`
}

/** A condition of replicate curves in words: its mean Tm, and its shift from the first. */
export function conditionText(c: MeltCondition, first: boolean): string {
  const tm = `Tm ${sig4(c.mean)} °C${c.sd !== null ? ` ± ${sig4(c.sd)} (SD)` : ''}, n = ${c.tms.length}`
  if (first) return tm
  const shift = `ΔTm ${c.delta >= 0 ? '+' : '−'}${sig4(Math.abs(c.delta))} °C`
  return `${tm}; ${shift}${c.test ? `, ${pText(c.test.p)}` : ''}`
}

/** The results as cells: one row per curve, then one per condition when curves share a condition. */
export function meltCells(node: Pick<ChartNode, 'groups'>, result: MeltResult): string[][] {
  const head = ['Curve', 'Tm (°C)', 'SE', '95 % CI low', '95 % CI high', 'From (°C)', 'To (°C)', 'Method']
  const rows: string[][] = []
  result.fits.forEach((f, i) => {
    if (!isMeltFit(f)) return
    const tm = f.tm as Partial<{ value: number; se: number; lo: number; hi: number }>
    const opt = (v: number | undefined) => (v === undefined ? '' : sig4(v))
    rows.push([node.groups[i]?.name || `Curve ${i + 1}`, sig4(tm.value!), opt(tm.se), opt(tm.lo), opt(tm.hi), sig4(f.window[0]), sig4(f.window[1]), f.method === 'boltzmann' ? 'Boltzmann' : 'Derivative'])
  })
  const out = [head, ...rows]
  if (result.conditions.some((c) => c.tms.length > 1)) {
    out.push([], ['Condition', 'Mean Tm (°C)', 'SD', 'n', 'ΔTm (°C)', 'p (Welch)', '', ''])
    result.conditions.forEach((c, k) => out.push([c.name, sig4(c.mean), c.sd === null ? '' : sig4(c.sd), String(c.tms.length), k ? sig4(c.delta) : '', c.test ? sig4(c.test.p) : '', '', '']))
  }
  return out
}

/** A few sentences for the methods of a melting chart. */
export function meltMethods(node: Pick<ChartNode, 'melt'>, result: MeltResult): string | null {
  const fits = result.fits.filter(isMeltFit)
  if (!fits.length) return null
  const range = node.melt?.from !== undefined || node.melt?.to !== undefined
  const window = range
    ? `between ${node.melt?.from !== undefined ? `${sig4(node.melt.from)} °C` : 'the first reading'} and ${node.melt?.to !== undefined ? `${sig4(node.melt.to)} °C` : 'the last'}`
    : 'over the transition, from the lowest reading before the steepest change to the highest after it (so that a fall of the signal after its peak was left out)'
  const how =
    node.melt?.method === 'derivative'
      ? `The melting temperature (Tm) is where the signal changes fastest: the rate of change at each temperature is the slope of the straight line through the mean signal at that temperature and the three on either side (R: lm), and Tm is the top of the parabola through the steepest point and its two neighbours, ${window}.`
      : `The melting temperature (Tm) was found by fitting a Boltzmann sigmoid, y = bottom + (top − bottom)/(1 + exp((Tm − T)/slope)), by unweighted nonlinear least squares to every reading ${window} (R: nls with the same formula); its standard error is asymptotic and the 95 % confidence interval the estimate ± t(0.975, df) × SE.`
  const compared = result.conditions.length > 1 && result.conditions.some((c) => c.test) ? ` Curves whose names differ only by a replicate number were taken as replicates of one condition; the Tm of each condition was compared with that of ${result.conditions[0].name} by Welch's t test (R: t.test), not corrected for several comparisons.` : ''
  return `${how}${compared}`
}
