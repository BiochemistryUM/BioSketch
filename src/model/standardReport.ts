// What a standard curve says in words and as a table: the fitted curve, every sample read off it,
// the standards read back, and a sentence for the methods. Worked out from the chart every time,
// so it cannot go stale.

import type { StandardFit, StandardResult } from './standardCurve'
import type { ChartNode, StandardModel } from './types'

/** A number in four significant figures, without trailing zeros, with a minus sign. */
export const sig4 = (v: number): string => String(Number(v.toPrecision(4))).replace('-', '−')

const MODEL_NAMES: Record<StandardModel, string> = {
  linear: 'a straight line',
  quadratic: 'a quadratic (second-order polynomial)',
  '4pl': 'a four-parameter logistic curve',
  '5pl': 'a five-parameter logistic curve',
}

/** The fitted curve as an equation with its numbers, and how well it fits. */
export function fitText(fit: StandardFit): string {
  const p = fit.params.map(sig4)
  const plus = (v: number): string => (v < 0 ? ` − ${sig4(-v)}` : ` + ${sig4(v)}`)
  const how = `R² = ${Number(fit.r2.toFixed(4))}, residual SD ${sig4(fit.sy)}, n = ${fit.n}`
  switch (fit.model) {
    case 'linear':
      return `signal = ${p[0]}${plus(fit.params[1]).replace(/^ \+ /, ' + ')} × c; ${how}`
    case 'quadratic':
      return `signal = ${p[0]}${plus(fit.params[1])} × c${plus(fit.params[2])} × c²; ${how}`
    case '4pl':
      return `bottom ${p[0]}, top ${p[1]}, EC50 ${p[2]}, slope ${p[3]}; ${how}`
    case '5pl':
      return `bottom ${p[0]}, top ${p[1]}, EC50 ${p[2]}, slope ${p[3]}, asymmetry ${p[4]}; ${how}`
  }
}

const FLAG_WORDS: Record<StandardResult['samples'][number]['flag'], string> = {
  ok: '',
  below: 'below the lowest standard',
  above: 'above the highest standard',
  none: 'cannot be read off the curve',
}

/** One sample in words: its concentration (with the dilution taken into account), how its replicates agree, and whether it lies within the standards. */
export function sampleText(s: StandardResult['samples'][number], dilution?: number): string {
  const conc = s.conc === null ? 'no value' : sig4(s.conc)
  const cv = s.cv !== null ? `, CV ${Number(s.cv.toFixed(1))} %` : ''
  const dil = dilution && dilution !== 1 ? ` (diluted ${sig4(dilution)}×)` : ''
  return `${conc}${dil}${cv}${s.flag !== 'ok' ? `: ${FLAG_WORDS[s.flag]}` : ''}`
}

/** The results as cells, for the clipboard (a spreadsheet) or a table on the page. */
export function resultCells(result: StandardResult, dilutions: Record<string, number> = {}): string[][] {
  const head = ['Sample', result.blank !== null ? 'Mean signal, blank subtracted' : 'Mean signal', 'CV (%)', 'Dilution', 'Concentration', 'Note']
  const rows = result.samples.map((s) => [
    s.name,
    sig4(s.mean),
    s.cv === null ? '' : String(Number(s.cv.toFixed(1))),
    dilutions[s.name] ? sig4(dilutions[s.name]) : '1',
    s.conc === null ? '' : sig4(s.conc),
    FLAG_WORDS[s.flag],
  ])
  return [head, ...rows]
}

/** The standards read back off the curve: how close each comes to its own concentration. */
export function recoveryCells(result: StandardResult): string[][] {
  return [['Standard', 'Concentration', 'Mean signal', 'Read back', 'Recovery (%)'], ...result.standards.map((s) => [s.name, sig4(s.conc), sig4(s.mean), s.back === null ? '' : sig4(s.back), s.recovery === null ? '' : String(Number(s.recovery.toFixed(1)))])]
}

/** Cells as text for a spreadsheet: tabs between cells, a line per row. */
export const cellsText = (cells: string[][]): string => cells.map((r) => r.map((c) => c.replace(/−/g, '-')).join('\t')).join('\n')

const R_CALLS: Record<StandardModel, string> = {
  linear: 'lm(signal ~ conc)',
  quadratic: 'lm(signal ~ conc + I(conc^2))',
  '4pl': 'drc::drm(signal ~ conc, fct = LL.4())',
  '5pl': 'drc::drm(signal ~ conc, fct = LL.5())',
}

/** A sentence or two for the methods: what was fitted, to what, and how samples were read. */
export function standardMethods(node: Pick<ChartNode, 'standard'>, result: StandardResult): string | null {
  const fit = result.fit
  if (!fit) return null
  const model = node.standard?.model ?? 'linear'
  const levels = result.standards.filter((s) => s.conc > 0).length
  const blank = result.blank !== null ? ' The mean signal of the blank (standards at concentration 0) was subtracted from every signal.' : ''
  const diluted = result.samples.length && Object.keys(node.standard?.dilution ?? {}).length ? ', multiplied by the dilution of the sample' : ''
  return (
    `Concentrations were read off a standard curve of ${levels} concentrations (${sig4(result.range.lo)} to ${sig4(result.range.hi)}), fitted as ${MODEL_NAMES[model]} by unweighted least squares to every replicate (n = ${fit.n}; R² = ${Number(fit.r2.toFixed(4))}).` +
    blank +
    ` The mean signal of each sample was read off the curve${diluted}; samples outside the range of the standards are marked as such.` +
    ` The fit is the same as R's ${R_CALLS[model]}.`
  )
}
