// The amplification efficiency of a primer pair from a dilution series: the Cq of known relative
// amounts of template is a straight line against the logarithm of the amount, fitted by least
// squares (R: lm(Cq ~ log10(quantity))), and the efficiency is E = 10^(−1/slope) − 1 (100 % when the
// product doubles every cycle: a slope of −3.32 per tenfold dilution). The 95 % interval of E comes
// from that of the slope, through the same formula. MIQE (Bustin 2009) asks for the slope, the
// intercept, R² and the efficiency to be reported, and expects 90 to 110 %.
//
// The table is read in two layouts: wide, a first column of quantities (1, 0.1 or 1:10, 1/100) and
// a column of Cq values for every target, replicates on rows of their own; or long, as machines
// export standards: a column for the quantity, one for the target and one for the Cq. Pure.

import { tCritical } from './distributions'
import { cellNumber, readCells } from './tableRoles'

export interface EfficiencyFit {
  target: string
  /** Wells used, and the number of different amounts among them. */
  n: number
  levels: number
  /** Cq = intercept + slope · log10(quantity). */
  slope: number
  intercept: number
  r2: number
  /** In per cent, with its 95 % interval (null where the slope's interval reaches zero). */
  efficiency: number
  lo: number | null
  hi: number | null
}

export interface NoEfficiency {
  target: string
  reason: string
}

export const isEfficiencyFit = (f: EfficiencyFit | NoEfficiency): f is EfficiencyFit => 'slope' in f

export interface DilutionReading {
  fits: (EfficiencyFit | NoEfficiency)[]
  notices: string[]
}

/** A relative amount as written in a dilution series: 1, 0.01, 1e-3, 1:10, 1/100. Null when it is none. */
export function quantityOf(cell: string, comma = false): number | null {
  const t = cell.trim().replace(/\s+/g, '')
  const ratio = /^(\d+(?:[.,]\d+)?)[:/](\d+(?:[.,]\d+)?)$/.exec(t)
  if (ratio) {
    const [a, b] = [Number(ratio[1].replace(',', '.')), Number(ratio[2].replace(',', '.'))]
    return a > 0 && b > 0 ? a / b : null
  }
  const v = cellNumber(t, comma)
  return v !== null && v > 0 ? v : null
}

/** The straight line of Cq against log10 of the amount, and the efficiency it gives. */
export function efficiencyFit(target: string, quantity: number[], cq: number[]): EfficiencyFit | NoEfficiency {
  const pts = quantity.map((q, k) => ({ x: Math.log10(q), y: cq[k] })).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
  const levels = new Set(pts.map((p) => p.x)).size
  if (levels < 3) return { target, reason: `A dilution series needs three or more different amounts; ${target} has ${levels}.` }
  const n = pts.length
  const mx = pts.reduce((a, p) => a + p.x, 0) / n
  const my = pts.reduce((a, p) => a + p.y, 0) / n
  const sxx = pts.reduce((a, p) => a + (p.x - mx) ** 2, 0)
  const sxy = pts.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0)
  const syy = pts.reduce((a, p) => a + (p.y - my) ** 2, 0)
  const slope = sxy / sxx
  const intercept = my - slope * mx
  if (!(slope < 0)) return { target, reason: `The Cq of ${target} does not fall as the amount of template rises, so no efficiency can be worked out. Check the amounts and their order.` }
  const sse = pts.reduce((a, p) => a + (p.y - intercept - slope * p.x) ** 2, 0)
  const r2 = syy > 0 ? 1 - sse / syy : 1
  const e = (s: number) => (10 ** (-1 / s) - 1) * 100
  let lo: number | null = null
  let hi: number | null = null
  if (n > 2) {
    const half = tCritical(0.05, n - 2) * Math.sqrt(sse / (n - 2) / sxx)
    // E rises with the slope (towards zero), so the ends of the slope's interval give those of E.
    if (slope + half < 0) {
      lo = e(slope - half)
      hi = e(slope + half)
    }
  }
  return { target, n, levels, slope, intercept, r2, efficiency: e(slope), lo, hi }
}

const QUANTITY = /quantit|^sq\b|starting|dilution|copies|copy|conc|amount|input|template|\bng\b|^x$/i
const TARGET = /target|gene|detector|primer|assay/i
const CQ = /^(cq|ct|cp|c\(t\)|c\(q\))$|\bcq\b|\bct\b|crossing|threshold cycle/i
const MISSING = /^(undetermined|undet\.?|n\/?a|no ?ct|-|—|nan)?$/i

/** Every target of a pasted dilution series, with its efficiency or the reason there is none. */
export function readDilution(text: string): DilutionReading {
  const cells = readCells(text)
  const notices: string[] = []
  const head = cells.header ?? []
  const comma = cells.decimalComma
  const series = new Map<string, { q: number[]; cq: number[] }>()
  const add = (target: string, q: number | null, cq: number | null) => {
    if (q === null || cq === null) return
    if (!series.has(target)) series.set(target, { q: [], cq: [] })
    series.get(target)!.q.push(q)
    series.get(target)!.cq.push(cq)
  }
  const cqOf = (cell: string | undefined): number | null => (cell === undefined || MISSING.test(cell.trim()) ? null : cellNumber(cell, comma))
  const qCol = head.findIndex((h) => QUANTITY.test(h))
  const tCol = head.findIndex((h) => TARGET.test(h))
  const cCol = head.findIndex((h, i) => i !== qCol && i !== tCol && CQ.test(h.trim()))
  let skipped = 0
  if (qCol >= 0 && tCol >= 0 && cCol >= 0) {
    // Long: one row per well.
    for (const r of cells.rows) {
      const q = quantityOf(r[qCol] ?? '', comma)
      if (q === null) {
        skipped++
        continue
      }
      add((r[tCol] ?? '').trim() || 'Target', q, cqOf(r[cCol]))
    }
  } else {
    // Wide: the amount first, then a column of Cq values for every target.
    const width = Math.max(0, ...cells.rows.map((r) => r.length))
    for (const r of cells.rows) {
      const q = quantityOf(r[0] ?? '', comma)
      if (q === null) {
        skipped++
        continue
      }
      for (let c = 1; c < width; c++) add(head[c]?.trim() || (width > 2 ? `Target ${c}` : 'Target'), q, cqOf(r[c]))
    }
  }
  if (skipped) notices.push(`${skipped} ${skipped === 1 ? 'row has' : 'rows have'} no amount that could be read and ${skipped === 1 ? 'is' : 'are'} left out (write it as 1, 0.1, 1e-2 or 1:10).`)
  const fits = [...series].map(([target, s]) => efficiencyFit(target, s.q, s.cq))
  const odd = fits.filter(isEfficiencyFit).filter((f) => f.efficiency < 90 || f.efficiency > 110)
  if (odd.length) notices.push(`${odd.map((f) => f.target).join(', ')}: an efficiency outside 90 to 110 %, the range usually accepted. Check the dilutions and the primers before using ${odd.length === 1 ? 'it' : 'them'}.`)
  const loose = fits.filter(isEfficiencyFit).filter((f) => f.r2 < 0.98)
  if (loose.length) notices.push(`${loose.map((f) => f.target).join(', ')}: R² below 0.98, the points do not lie well on a straight line.`)
  return { fits, notices }
}
