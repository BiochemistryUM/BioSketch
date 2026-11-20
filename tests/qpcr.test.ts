import { describe, expect, it } from 'vitest'
import { validateDoc } from '../src/io/files'
import { chartLayout, qpcrOf } from '../src/model/chart'
import { chartSample } from '../src/model/chartSamples'
import { analyseQpcr, conditionOf, guessControl, guessReference, type QpcrWell } from '../src/model/qpcr'
import { foldText, qpcrCells, qpcrMethods } from '../src/model/qpcrReport'
import { qpcrGroups, qpcrTableText, readQpcrText, withConditions } from '../src/model/qpcrTable'
import type { ChartNode, QpcrSettings } from '../src/model/types'
import reference from './stats-reference.json'
import cfx from './fixtures/tables/qpcr-biorad-cfx.csv?raw'
import quantStudio from './fixtures/tables/qpcr-quantstudio.txt?raw'
import lightCycler from './fixtures/tables/qpcr-lightcycler480.txt?raw'

interface Case {
  sample: string[]
  target: string[]
  cq: number[]
  conditions: string[]
  genes: Record<string, Record<'dct' | 'ddct' | 'err' | 'fold' | 'low' | 'high' | 'p' | 'adjusted', (number | null)[]>>
}
const R = reference.qpcr as unknown as Record<'bio' | 'tech' | 'refsEff', Case>
const wellsOf = (c: Case): QpcrWell[] => c.cq.map((cq, i) => ({ sample: c.sample[i], target: c.target[i], cq }))

const close = (a: number | null | undefined, b: number | null) => {
  if (b === null) expect(a ?? null).toBeNull()
  else expect(a!).toBeCloseTo(b, 10)
}

/** BioSketch's answer for one case of R's, gene by gene and condition by condition. */
function matches(c: Case, settings: QpcrSettings, error: 'sd' | 'sem') {
  const r = analyseQpcr(wellsOf(c), settings, error)
  expect(r.conditions).toEqual(c.conditions)
  expect(r.genes.map((g) => g.target)).toEqual(Object.keys(c.genes))
  for (const g of r.genes) {
    const want = c.genes[g.target]
    g.conditions.forEach((k, i) => {
      close(k.dct, want.dct[i])
      close(k.ddct, want.ddct[i])
      close(k.err, want.err[i])
      close(k.fold, want.fold[i])
      close(k.low, want.low[i])
      close(k.high, want.high[i])
      close(k.t?.p, want.p[i])
      close(k.t?.adjusted, want.adjusted[i])
    })
  }
  return r
}

describe('ΔΔCt, pinned to R', () => {
  it('with biological replicates: the SD of ΔCt, Welch on ΔCt, Holm over the conditions of a gene', () => {
    const r = matches(R.bio, {}, 'sd')
    expect(r.reference).toEqual(['GAPDH'])
    expect(r.control).toBe('Control')
    expect(r.biological).toBe(true)
    expect(r.compared).toBe(2)
    expect(r.notices).toEqual([])
  })
  it('with one sample per condition: the error from the technical replicates, and no test', () => {
    const r = matches(R.tech, {}, 'sd')
    expect(r.biological).toBe(false)
    expect(r.notices.join(' ')).toMatch(/one sample only/)
  })
  it('with two reference genes, an efficiency below 100 % and the SEM', () => {
    matches(R.refsEff, { reference: ['GAPDH', 'TNF'], efficiency: { IL6: 92 } }, 'sem')
  })
  it('gives no error bar when none is asked for', () => {
    const r = analyseQpcr(wellsOf(R.bio), {}, undefined)
    expect(r.genes[0].conditions.every((c) => c.err === null && c.low === null)).toBe(true)
  })
})

describe('what BioSketch guesses, and says it guessed', () => {
  it.each([
    ['Control 1', 'Control'],
    ['WT_rep2', 'WT'],
    ['KO-3', 'KO'],
    ['LPS + drug 2', 'LPS + drug'],
    ['Treated (3)', 'Treated'],
    ['Control', 'Control'],
    ['M1', 'M1'],
    ['12', '12'],
  ])('%s belongs to %s', (name, condition) => expect(conditionOf(name)).toBe(condition))

  it('takes a housekeeping gene as the reference, and a condition named as a control as the control', () => {
    expect(guessReference(['IL6', 'Gapdh', 'TNF'])).toEqual(['Gapdh'])
    expect(guessReference(['IL6', 'TNF'])).toEqual(['IL6'])
    expect(guessControl(['LPS', 'Vehicle', 'Drug'])).toBe('Vehicle')
    expect(guessControl(['LPS', 'Drug'])).toBe('LPS')
  })

  it('reports technical replicates far apart, late Cq, a sample without its reference and a gene without the control', () => {
    const wells: QpcrWell[] = [
      { sample: 'Ctl 1', target: 'GAPDH', cq: 18 },
      { sample: 'Ctl 1', target: 'IL6', cq: 36 },
      { sample: 'Ctl 1', target: 'IL6', cq: 37 },
      { sample: 'KO 1', target: 'IL6', cq: 30 },
      { sample: 'KO 2', target: 'GAPDH', cq: 18 },
      { sample: 'KO 2', target: 'MYC', cq: 25 },
    ]
    const notes = analyseQpcr(wells, { control: 'Ctl' }).notices.join(' ')
    expect(notes).toMatch(/differ by more than 0.5 cycles: IL6 in Ctl 1 \(1\)/)
    expect(notes).toMatch(/35 or more.*IL6 in Ctl 1/)
    expect(notes).toMatch(/No Cq of GAPDH for KO 1/)
    expect(notes).toMatch(/MYC has no sample of the control condition \(Ctl\)/)
  })

  it('needs two targets', () => {
    expect(analyseQpcr([{ sample: 'A', target: 'IL6', cq: 20 }]).notices[0]).toMatch(/one target only/)
  })
})

describe('reading the tables of qPCR machines', () => {
  it('Bio-Rad CFX: wells by sample and target, the NTC left out', () => {
    const r = readQpcrText(cfx)
    expect(r.missing).toEqual([])
    expect(r.table.wells).toHaveLength(24)
    expect(r.table.controls).toEqual(['NTC'])
    expect(r.table.amplified).toEqual([])
    const groups = qpcrGroups(r.table)
    expect(groups.map((g) => g.name)).toEqual(['GAPDH', 'IL6'])
    const result = analyseQpcr(r.table.wells)
    expect(result.genes[0].conditions.map((c) => c.condition)).toEqual(['Control', 'Treated'])
    expect(result.genes[0].conditions[1].fold).toBeCloseTo(2 ** 2.1, 6)
  })

  it('QuantStudio: the preamble and an Undetermined control left out', () => {
    const r = readQpcrText(quantStudio)
    expect(r.table.wells).toHaveLength(24)
    expect(r.table.controls).toEqual(['NTC'])
    expect(r.table.noCq).toEqual([])
    expect(r.cells.skipped.length).toBeGreaterThan(5)
  })

  it('LightCycler without a column of targets: one target only, said so', () => {
    const r = readQpcrText(lightCycler)
    expect(r.table.controls).toEqual(expect.arrayContaining(['Standard 1', 'Water']))
    expect(analyseQpcr(r.table.wells).notices[0]).toMatch(/one target only/)
  })

  it('a table with one row per sample and a column for every target', () => {
    const r = readQpcrText('Sample\tGAPDH\tGAPDH\tIL6\tIL6\nCtrl 1\t18.1\t18.2\t27.0\t27.2\nCtrl 2\t18.3\t18.2\t27.4\t27.1\nLPS 1\t18.2\t18.1\t23.1\t23.3\nLPS 2\t18.0\t18.2\t23.0\t23.4\nNTC\t\t\t35.2\t\n')
    expect(r.roles).toEqual(['sample', 'cq', 'cq', 'cq', 'cq'])
    expect(qpcrGroups(r.table).map((g) => [g.name, g.values.length])).toEqual([
      ['GAPDH', 8],
      ['IL6', 8],
    ])
    expect(r.table.amplified).toEqual(['IL6 in NTC (Cq 35.2)'])
  })

  it('a column of conditions is kept only when it says more than the names', () => {
    const r = readQpcrText('Sample\tGroup\tTarget\tCq\nm1\tWT\tGAPDH\t18\nm1\tWT\tIL6\t25\nm2\tKO\tGAPDH\t18\nm2\tKO\tIL6\t23\nm3\tKO\tGAPDH\t18.1\nm3\tKO\tIL6\t23.2')
    expect(r.table.conditions).toEqual({ m1: 'WT', m2: 'KO', m3: 'KO' })
    expect(withConditions({}, r.table.conditions).conditions).toEqual({ m1: 'WT', m2: 'KO', m3: 'KO' })
    expect(withConditions({}, { 'WT 1': 'WT' }).conditions).toBeUndefined()
  })
})

describe('a qPCR chart', () => {
  const node: ChartNode = { id: 'q1', type: 'chart', x: 0, y: 0, w: 420, h: 300, rotation: 0, ...(chartSample('qpcr') as Partial<ChartNode>) } as ChartNode
  const reopened = (n: ChartNode): ChartNode =>
    validateDoc({ app: 'biosketch', version: 1, name: 't', width: 600, height: 400, background: '#ffffff', nodes: [n], customIcons: {} }).nodes[0] as ChartNode

  it('the example is the R reference, survives a file, and is drawn without notices', () => {
    expect(reopened(node)).toEqual(node)
    const full = { ...node, qpcr: { reference: ['GAPDH'], control: 'Control', conditions: { 'Control 1': 'A' }, efficiency: { IL6: 95, TNF: 100 }, log2: true, ownSamples: true } }
    expect(reopened(full).qpcr).toEqual({ reference: ['GAPDH'], control: 'Control', conditions: { 'Control 1': 'A' }, efficiency: { IL6: 95 }, log2: true, ownSamples: true })
    const r = qpcrOf(node)
    expect(r.genes[0].conditions[1].fold).toBeCloseTo(R.bio.genes.IL6.fold[1]!, 10)
    const drawing = chartLayout(node)
    expect(drawing.notes).toEqual([])
    const words = JSON.stringify(drawing)
    expect(words).toContain('Fold change')
    expect(words).toContain('LPS + drug')
    expect(words).toContain('IL6')
    // Six bars, one per gene and condition, and a dot for every culture.
    expect(drawing.rects.length).toBeGreaterThanOrEqual(6)
  })

  it('the bars stand at the fold change and their error bars reach 2^−(ΔΔCt ± SD), not a symmetric SD', () => {
    const log = chartLayout({ ...node, qpcr: { log2: true } })
    expect(JSON.stringify(log)).toContain('log_{2} fold change')
    expect(log.notes).toEqual([])
  })

  it('writes the results and the methods', () => {
    const r = qpcrOf(node)
    expect(foldText(r.genes[0].conditions[1])).toMatch(/^32-fold \(30\.3\d* to 33\.7\d*\), n = 3, p = 0\.0009/)
    expect(foldText(r.genes[0].conditions[1], true)).toMatch(/^log₂ fold change 5 \(± 0\.07\d*\)/)
    const cells = qpcrCells(r, 'sd')
    expect(cells[0][0]).toBe('Target')
    expect(cells).toHaveLength(1 + 2 * 3)
    const methods = qpcrMethods(node, r)!
    expect(methods).toMatch(/2\^−ΔΔCt method \(Livak and Schmittgen 2001\)/)
    expect(methods).toMatch(/reference gene GAPDH/)
    expect(methods).toMatch(/Welch's t test on ΔCt.*Holm's method/)
    expect(qpcrMethods({ ...node, qpcr: { efficiency: { IL6: 92 } } }, r)).toMatch(/Pfaffl 2001.*IL6 92 %/)
  })

  it('shows its table again as one row per well', () => {
    const text = qpcrTableText(node)
    expect(text.split('\n')[0]).toBe('Well\tSample\tTarget\tCq')
    expect(text.split('\n')).toHaveLength(82)
    const again = readQpcrText(text)
    expect(qpcrGroups(again.table)).toEqual(node.groups.map((g) => ({ name: g.name, values: g.values, labels: g.labels, wells: g.wells })))
  })
})
