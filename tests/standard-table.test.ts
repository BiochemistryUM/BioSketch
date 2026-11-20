import { describe, expect, it } from 'vitest'
import { validateDoc } from '../src/io/files'
import { chartLayout, standardOf } from '../src/model/chart'
import { chartSample } from '../src/model/chartSamples'
import { standardCurve } from '../src/model/standardCurve'
import { cellsText, fitText, recoveryCells, resultCells, sampleText, sig4, standardMethods } from '../src/model/standardReport'
import { readStandardText, standardGroups, standardTableOf, standardTableText, withDilution } from '../src/model/standardTable'
import type { ChartNode } from '../src/model/types'

import bradfordRaw from './fixtures/tables/bradford-wide.tsv?raw'
import bradfordCommaRaw from './fixtures/tables/bradford-wide-decimal-comma.csv?raw'
import elisaRaw from './fixtures/tables/elisa-long.csv?raw'

const FIXTURES: Record<string, string> = { 'bradford-wide.tsv': bradfordRaw, 'bradford-wide-decimal-comma.csv': bradfordCommaRaw, 'elisa-long.csv': elisaRaw }
const fixture = (name: string): string => FIXTURES[name]
const node = (start: Partial<ChartNode>): ChartNode => ({ id: 'c1', type: 'chart', x: 0, y: 0, w: 360, h: 260, rotation: 0, kind: 'standard', groups: [], ...start })
const reopened = (n: ChartNode): ChartNode => validateDoc({ app: 'biosketch', version: 1, name: 't', width: 600, height: 400, background: '#ffffff', nodes: [n], customIcons: {} }).nodes[0] as ChartNode

describe('reading the table of a standard curve', () => {
  it('reads a wide table: replicates side by side, a column of dilutions', () => {
    const read = readStandardText(fixture('bradford-wide.tsv'))
    expect(read.roles).toEqual(['name', 'conc', 'signal', 'signal', 'signal', 'dilution'])
    expect(read.missing).toEqual([])
    expect(read.table.standards).toHaveLength(9)
    expect(read.table.standards[0]).toEqual({ name: 'Std 1', conc: 0, values: [0.412, 0.418, 0.408] })
    expect(read.table.samples.map((s) => [s.name, s.dilution])).toEqual([['Lysate WT', 5], ['Lysate KO', 5], ['Lysate KO + drug', 5]])
  })

  it('reads a long table, one row per well, and joins the wells of one standard', () => {
    const read = readStandardText(fixture('elisa-long.csv'))
    expect(read.roles).toEqual(['well', 'name', 'conc', 'signal'])
    expect(read.table.standards.every((s) => s.values.length === 2)).toBe(true)
    expect(read.table.samples.length).toBeGreaterThan(0)
    expect(read.table.samples.every((s) => s.values.length >= 1)).toBe(true)
  })

  it('reads decimal commas', () => {
    const read = readStandardText(fixture('bradford-wide-decimal-comma.csv'))
    expect(read.table.standards.length).toBeGreaterThan(3)
    expect(read.table.standards.every((s) => s.values.every((v) => v > 0 && v < 5))).toBe(true)
  })

  it('takes the roles the scientist chose over the guess', () => {
    const text = 'Sample\tA\tB\nS1\t0\t0.1\nS2\t10\t0.5\nX\t\t0.3'
    const guess = readStandardText(text)
    const chosen = readStandardText(text, ['name', 'conc', 'signal'])
    expect(chosen.roles).toEqual(['name', 'conc', 'signal'])
    expect(chosen.table.standards.map((s) => s.conc)).toEqual([0, 10])
    expect(chosen.table.samples.map((s) => s.name)).toEqual(['X'])
    // A choice of the wrong length (the table changed) falls back to the guess.
    expect(readStandardText(text, ['name']).roles).toEqual(guess.roles)
  })

  it('says when no column holds a signal, and lists rows without one', () => {
    const read = readStandardText('Sample\tConc\tSignal\nS1\t0\t0.1\nS2\t5\t\nU1\t\t0.4', ['name', 'conc', 'ignore'])
    expect(read.missing).toEqual(['signal'])
    const ok = readStandardText('Sample\tConc\tSignal\nS1\t0\t0.1\nS2\t5\t\nU1\t\t0.4')
    expect(ok.table.unread).toEqual(['S2'])
  })

  it('takes a row named blank as a standard at 0, and a type column over the name', () => {
    const read = readStandardText('Type\tName\tConc\tOD\nBlank\tbuffer\t\t0.05\nStandard\tS1\t10\t0.3\nUnknown\tU1\t10\t0.2')
    expect(read.roles.slice(0, 4)).toEqual(['type', 'name', 'conc', 'signal'])
    expect(read.table.standards.map((s) => s.conc)).toEqual([0, 10])
    expect(read.table.samples.map((s) => s.name)).toEqual(['U1'])
  })
})

describe('a standard curve chart', () => {
  it('keeps its standards, samples and dilutions through a file', () => {
    const read = readStandardText(fixture('bradford-wide.tsv'))
    const { groups, dilution } = standardGroups(read.table)
    const chart = node({ groups, standard: withDilution({ model: 'quadratic', blank: true }, dilution) })
    const back = reopened(chart)
    expect(back.groups).toEqual(chart.groups)
    expect(back.standard).toEqual(chart.standard)
    expect(standardTableOf(back)).toEqual({ ...read.table, unread: [] })
  })

  it('writes its table so that it reads back the same', () => {
    const chart = node(chartSample('standard') as Partial<ChartNode>)
    const text = standardTableText(chart)
    const read = readStandardText(text)
    const { groups, dilution } = standardGroups(read.table)
    expect(groups).toEqual(chart.groups)
    expect(dilution).toEqual(chart.standard?.dilution)
  })

  it('leaves settings out of the file when they are the defaults, and refuses odd ones', () => {
    const plain = reopened(node({ groups: [{ name: 'Standards', values: [0.1, 0.5], xs: [0, 10] }], standard: { model: 'linear', blank: false, dilution: {} } }))
    expect(plain.standard).toBeUndefined()
    const odd = reopened(node({ groups: [{ name: 'Standards', values: [0.1, 0.5], xs: [0, 10] }], standard: { model: 'cubic' as never, dilution: { A: -2, B: 1, C: 4 } } }))
    expect(odd.standard).toEqual({ dilution: { C: 4 } })
  })

  it('draws the example, with its samples on the curve and the one above the standards named', () => {
    const chart = node(chartSample('standard') as Partial<ChartNode>)
    const r = standardOf(chart)
    expect(r.fit?.model).toBe('quadratic')
    const lysateA = r.samples.find((s) => s.name === 'Lysate A')!
    expect(lysateA.flag).toBe('ok')
    // Read off the curve in the well, then multiplied by the dilution of 10.
    const inWell = r.fit!.inverse((0.624 + 0.641) / 2 - r.blank!)!
    expect(lysateA.conc).toBeCloseTo(inWell * 10, 6)
    expect(r.samples.find((s) => s.name === 'Lysate C')!.flag).toBe('above')
    const drawing = chartLayout(chart)
    const words = JSON.stringify(drawing)
    expect(words).toContain('Lysate C lies outside the range of the standards')
    expect(words).not.toMatch(/1 sample lies outside the standards/)
  })

  it('starts the axis at zero when blank-subtracted values dip just below it', () => {
    const chart = node({ groups: [{ name: 'Standards', values: [0.1, 0.098, 0.3, 0.5, 0.7], xs: [0, 0, 10, 20, 30] }], standard: { blank: true } })
    const words = JSON.stringify(chartLayout(chart))
    expect(words).not.toContain('−0.5')
    expect(words).not.toContain('-0.5')
  })
})

describe('the report of a standard curve', () => {
  const chart = node(chartSample('standard') as Partial<ChartNode>)
  const r = standardOf(chart)

  it('writes numbers in four significant figures with a true minus', () => {
    expect(sig4(1234.567)).toBe('1235')
    expect(sig4(-0.00123456)).toBe('−0.001235')
    expect(sig4(2)).toBe('2')
  })

  it('names the fit, the samples and the standards read back', () => {
    expect(fitText(r.fit!)).toMatch(/^signal = .+ × c .+ × c²; R² = 0\.99\d*, residual SD .+, n = 18$/)
    const c = r.samples.find((s) => s.name === 'Lysate C')!
    expect(sampleText(c, 5)).toMatch(/\(diluted 5×\), CV .+ %: above the highest standard$/)
    const cells = resultCells(r, chart.standard?.dilution)
    expect(cells[0][1]).toBe('Mean signal, blank subtracted')
    expect(cells.map((row) => row[0])).toEqual(['Sample', 'Lysate A', 'Lysate B', 'Lysate C'])
    expect(cells[1][3]).toBe('10')
    const back = recoveryCells(r)
    expect(back).toHaveLength(10)
    expect(cellsText(back).split('\n')[0]).toBe('Standard\tConcentration\tMean signal\tRead back\tRecovery (%)')
    expect(cellsText([['−1']])).toBe('-1')
  })

  it('writes the methods from the chart, naming the R function', () => {
    const text = standardMethods(chart, r)!
    expect(text).toContain('8 concentrations (25 to 2000)')
    expect(text).toContain('a quadratic (second-order polynomial)')
    expect(text).toContain('blank')
    expect(text).toContain('multiplied by the dilution')
    expect(text).toContain('lm(signal ~ conc + I(conc^2))')
    const none = standardCurve({ standards: [], samples: [], model: 'linear' })
    expect(standardMethods(chart, none)).toBeNull()
  })
})
