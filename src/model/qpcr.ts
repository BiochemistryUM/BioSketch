// qPCR: relative expression by the ΔΔCt method (Livak and Schmittgen 2001), or with the efficiency of
// each primer pair (Pfaffl 2001). Technical replicates (wells of one sample and one target) are
// averaged; ΔCt is the target's Cq less the reference's (the mean of the reference genes); ΔΔCt is
// a sample's ΔCt less the mean ΔCt of the control condition; the fold change is 2^−ΔΔCt.
//
// The error is carried through as Applied Biosystems' User Bulletin #2 describes it. With several
// samples (biological replicates) in a condition it is the SD (or SEM) of their ΔCt values; with one,
// it comes from the technical replicates, s = √(s_target² + s_reference²). Subtracting the control's
// mean ΔCt shifts every value by one constant and adds no error. On the fold-change scale the bar
// reaches from 2^−(ΔΔCt + s) to 2^−(ΔΔCt − s), so it is not symmetric.
//
// Conditions are compared with the control by Welch's t test on ΔCt (R: t.test), the scale on which
// the values are close to normal; with several conditions for one gene the p values are corrected
// by Holm's method. Pure: no React, no browser APIs.

import { holm, pairedT, welchT } from './chartTests'
import type { PlateEntry } from './plate'
import type { ChartGroup, QpcrSettings } from './types'

export interface QpcrWell {
  sample: string
  target: string
  cq: number
  /** The well of the plate ("B3"), when the table names it. */
  well?: string
}

/** Names of the usual reference (housekeeping) genes, in any case. */
const HOUSEKEEPING = /^(gapdh|actb|β-?actin|beta-?actin|b-?actin|b2m|18s|18s rrna|rn18s|hprt1?|tbp|rplp0|36b4|ppia|cyclophilin( a)?|ywhaz|ubc|ubb|hmbs|sdha|gusb|pgk1|tubb|tuba1a|eef1a1|ef1a|rpl13a|rps18|rpl19|rpl32|ef-?1α)$/i
/** Names of the usual control conditions. */
const CONTROL = /^(control|controls|ctrl|ctl|con|vehicle|veh|untreated|mock|wt|wild[ -]?type|dmso|pbs|saline|naive|sham|scrambled|scr|si-?ctrl|sicontrol|nt|non-?targeting|empty vector|ev|baseline|unstimulated|unstim)$/i

/** The condition a sample belongs to, read from its name: the name without a replicate number at its end ("Control 2", "WT_rep3", "KO-1"). */
export function conditionOf(sample: string): string {
  const s = sample.trim()
  const m = /^(.*?)[\s_.#-]*(?:\(\s*\d{1,3}\s*\)|(?:rep|replicate|bio|br|r|n|mouse|animal|donor|patient)?[\s_.#-]*\d{1,3})$/i.exec(s)
  const base = m ? m[1].replace(/[\s_.#-]+$/, '') : ''
  // A name that is nothing but a number ("1", "M1") is a condition of its own.
  return base && /[A-Za-zΑ-ω]/.test(base) && base.length >= 2 ? base : s
}

/**
 * What pairs a sample with a sample of another condition: the number at the end of its name
 * ("LPS 2" and "Control 2" are pair 2), or null when it has none.
 */
export function pairOf(sample: string): string | null {
  const m = /(?:^|[\s_.#-]|rep|replicate|bio|br|r|n|mouse|animal|donor|patient)\(?\s*(\d{1,3})\s*\)?$/i.exec(sample.trim())
  return m ? String(Number(m[1])) : null
}

/** The reference genes when none was chosen: the housekeeping genes among the targets, or else the first target. */
export function guessReference(targets: string[]): string[] {
  const known = targets.filter((t) => HOUSEKEEPING.test(t.trim()))
  return known.length ? known : targets.slice(0, 1)
}

/** The control condition when none was chosen: one named as a control, or else the first. */
export function guessControl(conditions: string[]): string | null {
  return conditions.find((c) => CONTROL.test(c.trim())) ?? conditions[0] ?? null
}

export interface QpcrSample {
  sample: string
  condition: string
  /** ΔCt: the target less the reference, in cycles (with an efficiency other than 100 %: in doublings). */
  dct: number
  ddct: number
  /** −ΔΔCt: the fold change on a log₂ scale. */
  log2fc: number
  /** The error of this sample's ΔCt from its technical replicates, as SD (or SEM); null with a single well for the target or the reference. */
  tech: number | null
}

export interface QpcrCondition {
  condition: string
  samples: string[]
  /** Biological replicates: the samples of this condition that have a ΔCt. */
  n: number
  dct: number
  ddct: number
  /** The error carried to ΔΔCt (SD or SEM, see `source`); null when there is none to give. */
  err: number | null
  /** Where the error comes from: the samples of the condition, or (one sample) its technical replicates. */
  source: 'biological' | 'technical' | null
  fold: number
  /** The ends of the error bar on the fold-change scale. */
  low: number | null
  high: number | null
  /** The t test on ΔCt against the control (Welch's, or paired), and the p value after Holm's correction over the conditions of this gene. */
  t?: { t: number; df: number; p: number; adjusted: number }
  /** Paired: the samples tested, those with a control of the same number. */
  pairs?: number
}

export interface QpcrGene {
  target: string
  samples: QpcrSample[]
  conditions: QpcrCondition[]
}

export interface QpcrResult {
  targets: string[]
  reference: string[]
  /** The conditions in order, the control first. */
  conditions: string[]
  control: string | null
  /** The samples of every condition, in table order. */
  members: Record<string, string[]>
  genes: QpcrGene[]
  notices: string[]
  /** Corrected p values come from Holm's method over this many comparisons per gene (0 when nothing was tested). */
  compared: number
  /** True when every condition has biological replicates. */
  biological: boolean
  /** The test was the paired t test (samples matched to the control by their number). */
  paired: boolean
}

const mean = (v: number[]): number => v.reduce((a, b) => a + b, 0) / v.length
const sd = (v: number[]): number => (v.length < 2 ? NaN : Math.sqrt(v.reduce((a, b) => a + (b - mean(v)) ** 2, 0) / (v.length - 1)))
const list = (items: string[], most = 6): string => (items.length > most ? `${items.slice(0, most).join(', ')} and ${items.length - most} more` : items.join(', '))

/** The wells of a chart: every group is one target, its values the Cq of its wells and its labels their samples. */
export function qpcrWells(groups: ChartGroup[]): QpcrWell[] {
  return groups.flatMap((g) => g.values.map((cq, k): QpcrWell => ({ sample: g.labels?.[k] ?? '', target: g.name, cq, ...(g.wells?.[k] ? { well: g.wells[k] } : {}) })).filter((w) => w.sample !== '' && Number.isFinite(w.cq)))
}

/** The amplification factor per cycle of a target: 2 at 100 % efficiency. */
const factorOf = (settings: QpcrSettings, target: string): number => 1 + (settings.efficiency?.[target] ?? 100) / 100

/** The fold changes of every gene and condition; `error` is the error bar asked for (none when absent). */
export function analyseQpcr(wells: QpcrWell[], settings: QpcrSettings = {}, error?: 'sd' | 'sem'): QpcrResult {
  const notices: string[] = []
  const targets = [...new Set(wells.map((w) => w.target))]
  const samples = [...new Set(wells.map((w) => w.sample))]
  const chosen = (settings.reference ?? []).filter((r) => targets.includes(r))
  const reference = chosen.length ? chosen : guessReference(targets)
  const conditionFor = (sample: string): string => (settings.ownSamples ? sample : settings.conditions?.[sample] ?? conditionOf(sample))
  const members: Record<string, string[]> = {}
  for (const s of samples) (members[conditionFor(s)] ??= []).push(s)
  const found = Object.keys(members)
  const control = settings.control && found.includes(settings.control) ? settings.control : guessControl(found)
  const conditions = control ? [control, ...found.filter((c) => c !== control)] : found
  const empty: QpcrResult = { targets, reference, conditions, control, members, genes: [], notices, compared: 0, biological: false, paired: false }
  if (!wells.length) return empty
  if (targets.length < 2) {
    notices.push('A fold change by ΔΔCt needs a reference gene and at least one other target: the table has one target only.')
    return empty
  }

  // Technical replicates: the wells of one sample and one target, on the scale of doublings.
  const cell = new Map<string, number[]>()
  const raw = new Map<string, number[]>()
  for (const w of wells) {
    const key = `${w.sample}\u0000${w.target}`
    if (!cell.has(key)) {
      cell.set(key, [])
      raw.set(key, [])
    }
    cell.get(key)!.push(w.cq * Math.log2(factorOf(settings, w.target)))
    raw.get(key)!.push(w.cq)
  }
  const at = (sample: string, target: string) => cell.get(`${sample}\u0000${target}`)
  // Without an error bar asked for, technical errors are still worked out as SD (they decide nothing then).
  const techErr = (v: number[]): number | null => (v.length < 2 ? null : error === 'sem' ? sd(v) / Math.sqrt(v.length) : sd(v))

  const wide: string[] = []
  const late: string[] = []
  for (const [key, cqs] of raw) {
    const [sample, target] = key.split('\u0000')
    const range = Math.max(...cqs) - Math.min(...cqs)
    if (range > 0.5) wide.push(`${target} in ${sample} (${Number(range.toFixed(2))})`)
    if (mean(cqs) >= 35) late.push(`${target} in ${sample}`)
  }
  if (wide.length) notices.push(`Technical replicates differ by more than 0.5 cycles: ${list(wide)}. Check those wells.`)
  if (late.length) notices.push(`A mean Cq of 35 or more lies near the limit of detection: ${list(late)}.`)

  // The reference of each sample: the mean of its reference genes (the geometric mean of their quantities).
  const refOf = new Map<string, { value: number; err: number | null }>()
  const lacking: string[] = []
  for (const s of samples) {
    const parts = reference.map((r) => at(s, r))
    if (parts.some((p) => !p)) {
      lacking.push(s)
      continue
    }
    const means = parts.map((p) => mean(p!))
    const errs = parts.map((p) => techErr(p!))
    const err = errs.some((e) => e === null) ? null : Math.sqrt(errs.reduce((a: number, e) => a + (e ?? 0) ** 2, 0)) / reference.length
    refOf.set(s, { value: mean(means), err })
  }
  if (lacking.length) notices.push(`No Cq of ${reference.join(' and ')} for ${list(lacking)}: ${lacking.length === 1 ? 'it is' : 'they are'} left out.`)

  const genes: QpcrGene[] = []
  const paired = !!settings.paired && !settings.ownSamples
  const unpaired: string[] = []
  let compared = 0
  let biological = true
  const oneSample: string[] = []
  const noControl: string[] = []
  for (const target of targets.filter((t) => !reference.includes(t))) {
    const rows: Omit<QpcrSample, 'ddct' | 'log2fc'>[] = []
    for (const s of samples) {
      const own = at(s, target)
      const ref = refOf.get(s)
      if (!own || !ref) continue
      const e = techErr(own)
      rows.push({ sample: s, condition: conditionFor(s), dct: mean(own) - ref.value, tech: e === null || ref.err === null ? null : Math.sqrt(e ** 2 + ref.err ** 2) })
    }
    const ctrl = rows.filter((r) => r.condition === control).map((r) => r.dct)
    if (!ctrl.length) {
      noControl.push(target)
      continue
    }
    const base = mean(ctrl)
    const sampleRows: QpcrSample[] = rows.map((r) => ({ ...r, ddct: r.dct - base, log2fc: -(r.dct - base) }))
    const conds: QpcrCondition[] = []
    for (const c of conditions) {
      const mine = sampleRows.filter((r) => r.condition === c)
      if (!mine.length) continue
      const d = mine.map((r) => r.dct)
      const dct = mean(d)
      const ddct = dct - base
      let err: number | null = null
      let source: QpcrCondition['source'] = null
      if (mine.length >= 2) {
        err = error === 'sem' ? sd(d) / Math.sqrt(d.length) : sd(d)
        source = 'biological'
      } else {
        biological = false
        if (!oneSample.includes(c)) oneSample.push(c)
        err = mine[0].tech
        source = err === null ? null : 'technical'
      }
      const shown = error ? err : null
      conds.push({
        condition: c,
        samples: mine.map((r) => r.sample),
        n: mine.length,
        dct,
        ddct,
        err: shown,
        source: error ? source : null,
        fold: 2 ** -ddct,
        low: shown === null ? null : 2 ** -(ddct + shown),
        high: shown === null ? null : 2 ** -(ddct - shown),
      })
    }
    // Each condition against the control, on ΔCt: Welch's t test, or the paired t test over the
    // samples that have a control of the same number.
    const ctrlByPair = new Map<string, number>()
    for (const r of rows) if (r.condition === control && pairOf(r.sample) !== null) ctrlByPair.set(pairOf(r.sample)!, r.dct)
    const tests = conds.slice(1).map((c) => {
      if (c.condition === control) return null
      const mine = sampleRows.filter((r) => r.condition === c.condition)
      if (!paired) return welchT(mine.map((r) => r.dct), ctrl)
      const matched = mine.filter((r) => pairOf(r.sample) !== null && ctrlByPair.has(pairOf(r.sample)!))
      for (const r of mine) if (!matched.includes(r) && !unpaired.includes(r.sample)) unpaired.push(r.sample)
      c.pairs = matched.length
      return pairedT(
        matched.map((r) => r.dct),
        matched.map((r) => ctrlByPair.get(pairOf(r.sample)!)!),
      )
    })
    const ok = tests.filter((t): t is NonNullable<typeof t> => !!t)
    const adjusted = holm(ok.map((t) => t.p))
    let k = 0
    tests.forEach((t, i) => {
      if (t) conds[i + 1].t = { ...t, adjusted: adjusted[k++] }
    })
    compared = Math.max(compared, ok.length)
    genes.push({ target, samples: sampleRows, conditions: conds })
  }
  if (noControl.length) notices.push(`${list(noControl)} ${noControl.length === 1 ? 'has' : 'have'} no sample of the control condition (${control}): no fold change can be given.`)
  if (oneSample.length && error)
    notices.push(`${list(oneSample)} ${oneSample.length === 1 ? 'has' : 'have'} one sample only: ${oneSample.length === 1 ? 'its error bar comes' : 'their error bars come'} from the technical replicates, not from biological replicates, and no test can be made.`)
  if (unpaired.length) notices.push(`${list(unpaired)} ${unpaired.length === 1 ? 'has' : 'have'} no sample of ${control} with the same number, so ${unpaired.length === 1 ? 'it is' : 'they are'} left out of the paired test.`)
  return { targets, reference, conditions, control, members, genes, notices, compared, biological: biological && genes.length > 0, paired }
}

/** What colours the wells of the plate. */
export type PlateColour = 'condition' | 'sample' | 'target'

/**
 * The wells of a chart for the picture of its plate: each coloured by its condition, sample or
 * target, its Cq written inside, and ringed where the analysis has a remark on it (technical
 * replicates more than 0.5 cycles apart, a mean Cq of 35 or more), by the rules `analyseQpcr` uses.
 */
export function qpcrPlate(groups: ChartGroup[], settings: QpcrSettings = {}, by: PlateColour = 'condition'): PlateEntry[] {
  const all = qpcrWells(groups)
  const wells = all.filter((w) => w.well)
  const conditionFor = (sample: string): string => (settings.ownSamples ? sample : settings.conditions?.[sample] ?? conditionOf(sample))
  const sets = new Map<string, number[]>()
  for (const w of all) {
    const key = `${w.sample}\u0000${w.target}`
    if (!sets.has(key)) sets.set(key, [])
    sets.get(key)!.push(w.cq)
  }
  return wells.map((w): PlateEntry => {
    const set = `${w.sample}\u0000${w.target}`
    const cqs = sets.get(set)!
    const range = Math.max(...cqs) - Math.min(...cqs)
    const flags = [...(range > 0.5 ? [`technical replicates ${Number(range.toFixed(2))} cycles apart`] : []), ...(mean(cqs) >= 35 ? ['a mean Cq of 35 or more'] : [])]
    const key = by === 'sample' ? w.sample : by === 'target' ? w.target : conditionFor(w.sample)
    return { well: w.well!, key, text: w.cq.toFixed(1), detail: `${w.sample}, ${w.target}, Cq ${Number(w.cq.toFixed(2))}`, set, ...(flags.length ? { flag: flags.join('; ') } : {}) }
  })
}
