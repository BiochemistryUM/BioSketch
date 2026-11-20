// qPCR, further parts: the paired design (each sample against the control of the same number), the
// results of the test written on the chart, and the efficiency of a primer pair from a dilution
// series. Pinned to R 4.4 through tests/stats-reference.json (scripts/stats-reference.R, section
// "qPCR": cases "paired" and "dilution").

import { describe, expect, it } from 'vitest'
import { validateDoc } from '../src/io/files'
import { chartLayout } from '../src/model/chart'
import { pText, stars } from '../src/model/chartTests'
import { analyseQpcr, pairOf, type QpcrWell } from '../src/model/qpcr'
import { efficiencyFit, isEfficiencyFit, quantityOf, readDilution, type EfficiencyFit } from '../src/model/qpcrEfficiency'
import { foldText, qpcrCells, qpcrMethods } from '../src/model/qpcrReport'
import { qpcrGroups, readQpcrText } from '../src/model/qpcrTable'
import type { ChartNode } from '../src/model/types'
import reference from './stats-reference.json'

interface Case {
  sample: string[]
  target: string[]
  cq: number[]
  genes: Record<string, { p: (number | null)[]; adjusted: (number | null)[] }>
}
const R = reference.qpcr as unknown as { paired: Case; bio: Case; dilution: { q: number[]; GAPDH: number[]; IL6: number[]; fits: Record<string, Record<string, number>> } }
const wellsOf = (c: Case): QpcrWell[] => c.cq.map((cq, i) => ({ sample: c.sample[i], target: c.target[i], cq }))
const close = (a: number | null | undefined, b: number | null, digits = 10) => (b === null ? expect(a ?? null).toBeNull() : expect(a!).toBeCloseTo(b, digits))

const table = (c: Case) => ['Sample\tTarget\tCq', ...c.cq.map((cq, i) => `${c.sample[i]}\t${c.target[i]}\t${cq}`)].join('\n')
const chart = (extra: Partial<ChartNode['qpcr']> = {}): ChartNode => ({
  id: 'q1',
  type: 'chart',
  x: 0,
  y: 0,
  w: 420,
  h: 280,
  rotation: 0,
  kind: 'qpcr',
  error: 'sd',
  groups: qpcrGroups(readQpcrText(table(R.bio)).table),
  ...(Object.keys(extra).length ? { qpcr: extra } : {}),
})

describe('the paired design', () => {
  it('pairs samples by the number at the end of their names', () => {
    expect(pairOf('LPS 2')).toBe('2')
    expect(pairOf('Control 02')).toBe('2')
    expect(pairOf('WT_rep3')).toBe('3')
    expect(pairOf('Drug (4)')).toBe('4')
    expect(pairOf('LPS')).toBeNull()
    expect(pairOf('A1')).toBeNull()
  })

  it('tests each condition by the paired t test on ΔCt, with Holm’s correction, as R does', () => {
    const r = analyseQpcr(wellsOf(R.paired), { paired: true }, 'sd')
    expect(r.paired).toBe(true)
    for (const g of r.genes) {
      g.conditions.forEach((c, i) => {
        close(c.t?.p, R.paired.genes[g.target].p[i])
        close(c.t?.adjusted, R.paired.genes[g.target].adjusted[i])
      })
    }
    // The fold changes and error bars are those of the unpaired analysis.
    const plain = analyseQpcr(wellsOf(R.paired), {}, 'sd')
    expect(r.genes.map((g) => g.conditions.map((c) => c.fold))).toEqual(plain.genes.map((g) => g.conditions.map((c) => c.fold)))
    expect(qpcrMethods({ qpcr: { paired: true }, error: 'sd' }, r)).toMatch(/paired t test on ΔCt.*paired = TRUE/)
    expect(qpcrCells(r, 'sd')[0]).toContain('p (paired t, Holm)')
  })

  it('leaves out a sample without a control of the same number, and says so', () => {
    const wells = wellsOf(R.paired).filter((w) => w.sample !== 'Control 3')
    const r = analyseQpcr(wells, { paired: true }, 'sd')
    expect(r.notices.join(' ')).toMatch(/LPS 3, LPS \+ drug 3 have no sample of Control with the same number/)
    const lps = r.genes[0].conditions[1]
    expect(lps.pairs).toBe(2)
    expect(lps.t?.df).toBe(1)
    expect(foldText(lps)).toMatch(/n = 3 \(2 paired\)/)
  })
})

describe('the test written on the chart', () => {
  const texts = (n: ChartNode) => chartLayout(n).texts.map((t) => t.text)
  it('writes stars or the p value over each condition and its control, and nothing when not asked', () => {
    const r = analyseQpcr(wellsOf(R.bio), {}, 'sd')
    const adjusted = r.genes.flatMap((g) => g.conditions.slice(1).map((c) => c.t!.adjusted))
    const withStars = texts(chart({ marks: 'stars' }))
    for (const p of adjusted) expect(withStars).toContain(stars(p))
    const withP = texts(chart({ marks: 'p' }))
    for (const p of adjusted) expect(withP).toContain(pText(p))
    expect(texts(chart()).some((t) => t.startsWith('p ') || /^\*+$|^ns$/.test(t))).toBe(false)
    expect(chartLayout(chart({ marks: 'stars' })).rules.length).toBeGreaterThan(chartLayout(chart()).rules.length)
  })

  it('keeps the choices when the figure is saved', () => {
    const n = chart({ marks: 'p', paired: true })
    const back = validateDoc({ app: 'biosketch', version: 1, name: 't', width: 600, height: 400, background: '#ffffff', nodes: [n], customIcons: {} }).nodes[0] as ChartNode
    expect(back.qpcr).toEqual({ marks: 'p', paired: true })
    const odd = validateDoc({ app: 'biosketch', version: 1, name: 't', width: 600, height: 400, background: '#ffffff', nodes: [{ ...n, qpcr: { marks: 'bold', paired: 'yes' } }], customIcons: {} }).nodes[0] as ChartNode
    expect(odd.qpcr).toBeUndefined()
  })
})

describe('efficiency from a dilution series, against R', () => {
  const D = R.dilution
  it.each(['GAPDH', 'IL6'])('fits Cq against log10 of the amount for %s as lm() does', (target) => {
    const f = efficiencyFit(target, D.q, D[target as 'GAPDH' | 'IL6']) as EfficiencyFit
    const want = D.fits[target]
    close(f.slope, want.slope)
    close(f.intercept, want.intercept)
    close(f.r2, want.r2)
    close(f.efficiency, want.efficiency, 8)
    close(f.lo, want.lo, 6)
    close(f.hi, want.hi, 6)
    expect([f.n, f.levels]).toEqual([15, 5])
  })

  it('reads a wide table with amounts written as ratios, and a long table as machines export standards', () => {
    const ratio = (q: number) => (q === 1 ? '1' : `1:${Math.round(1 / q)}`)
    const wide = ['Dilution\tGAPDH\tIL6', ...D.q.map((q, k) => `${ratio(q)}\t${D.GAPDH[k]}\t${D.IL6[k]}`)].join('\n')
    const a = readDilution(wide)
    expect(a.fits.map((f) => f.target)).toEqual(['GAPDH', 'IL6'])
    expect((a.fits[0] as EfficiencyFit).efficiency).toBeCloseTo(D.fits.GAPDH.efficiency, 8)
    const long = ['Well,Target,Starting Quantity (SQ),Cq', ...D.q.flatMap((q, k) => [`A${k},GAPDH,${q},${D.GAPDH[k]}`, `B${k},IL6,${q},${D.IL6[k]}`]), 'C1,IL6,,Undetermined'].join('\n')
    const b = readDilution(long)
    expect(b.fits.map((f) => [f.target, isEfficiencyFit(f) ? Number(f.efficiency.toFixed(6)) : null])).toEqual([
      ['GAPDH', Number(D.fits.GAPDH.efficiency.toFixed(6))],
      ['IL6', Number(D.fits.IL6.efficiency.toFixed(6))],
    ])
    expect(b.notices.join(' ')).toMatch(/1 row has no amount/)
    // A heading that only ends in “ct” is not the Cq.
    const product = ['Well,Target,Product,Quantity,Cq', ...D.q.map((q, k) => `A${k},GAPDH,amplicon,${q},${D.GAPDH[k]}`)].join('\n')
    expect((readDilution(product).fits[0] as EfficiencyFit).efficiency).toBeCloseTo(D.fits.GAPDH.efficiency, 8)
  })

  it('says why there is no efficiency, and when one is outside 90 to 110 %', () => {
    expect(efficiencyFit('X', [1, 1, 0.1, 0.1], [20, 20.1, 23.4, 23.5])).toEqual({ target: 'X', reason: expect.stringMatching(/three or more different amounts/) })
    expect(efficiencyFit('X', [1, 0.1, 0.01], [20, 18, 16])).toEqual({ target: 'X', reason: expect.stringMatching(/does not fall/) })
    const steep = readDilution(['Amount\tACTB', '1\t15', '0.1\t19', '0.01\t23', '0.001\t27'].join('\n'))
    expect(steep.notices.join(' ')).toMatch(/ACTB: an efficiency outside 90 to 110 %/)
    expect(quantityOf('1/100')).toBe(0.01)
    expect(quantityOf('1e-3')).toBe(0.001)
    expect(quantityOf('0')).toBeNull()
  })
})
