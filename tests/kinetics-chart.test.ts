import { describe, expect, it } from 'vitest'
import { validateDoc } from '../src/io/files'
import { chartLayout, isKinetics, kineticsFitFor, kineticsOf } from '../src/model/chart'
import { chartSample } from '../src/model/chartSamples'
import { comparisonRows, estimateText, fitLines, kineticsCells, kineticsMethods } from '../src/model/kineticsReport'
import { inhibitorOf, kineticsColumns } from '../src/model/kineticsTable'
import type { ChartGroup, ChartNode } from '../src/model/types'

const chart = (start: Partial<ChartNode>): ChartNode => ({ id: 'k1', type: 'chart', x: 0, y: 0, w: 360, h: 260, rotation: 0, kind: 'scatter', groups: [], ...start })
const reopened = (n: ChartNode): ChartNode => validateDoc({ app: 'biosketch', version: 1, name: 't', width: 600, height: 400, background: '#ffffff', nodes: [n], customIcons: {} }).nodes[0] as ChartNode

/** Rates of competitive inhibition with Vmax 10, Km 20, Ki 5, without noise. */
const S = [2.5, 5, 10, 20, 40, 80]
const competitive: ChartGroup[] = [0, 5, 10, 20].map((I) => ({ name: I === 0 ? 'No inhibitor' : `${I} µM`, xs: S, values: S.map((s) => (10 * s) / (20 * (1 + I / 5) + s)) }))

describe('the inhibitor concentration in the name of a series', () => {
  it.each([
    ['0', 0],
    ['5 µM', 5],
    ['I = 10', 10],
    ['2,5 nM', 2.5],
    ['[I] 20 µM', 20],
    ['Inhibitor 7.5', 7.5],
    ['Control', 0],
    ['No inhibitor', 0],
    ['Wild type', null],
    ['1e-3', 0.001],
  ])('%s gives %s', (name, value) => expect(inhibitorOf(name)).toBe(value))
})

describe('a kinetics chart', () => {
  it('is a scatter chart with kinetics, kept through a file even with no settings', () => {
    const plain = chart({ groups: competitive, kinetics: {} })
    expect(isKinetics(plain)).toBe(true)
    expect(reopened(plain).kinetics).toEqual({})
    const full = chart({ groups: competitive, kinetics: { model: 'competitive', enzyme: 0.05, lineweaver: true } })
    expect(reopened(full).kinetics).toEqual(full.kinetics)
    expect(reopened(chart({ groups: competitive, kinetics: { model: 'cubic' as never, enzyme: -1 } })).kinetics).toEqual({})
    expect(isKinetics({ ...plain, survival: true })).toBe(false)
  })

  it('draws the example with a curve through each series from no substrate, and no notices', () => {
    const node = chart(chartSample('kinetics') as Partial<ChartNode>)
    const drawing = chartLayout(node)
    expect(drawing.notes).toEqual([])
    expect(reopened(node)).toEqual(node)
    const r = kineticsOf(node)
    expect(r.fits).toHaveLength(2)
    // The rate of −0.01 with no substrate does not pull the axis down to −5.
    expect(JSON.stringify(drawing)).not.toMatch(/"−5"|"-5"/)
  })

  it('fits one competitive model over the series, named by their inhibitor concentrations', () => {
    const node = chart({ groups: competitive, kinetics: { model: 'competitive' } })
    const r = kineticsOf(node)
    const fit = kineticsFitFor(node, r, 2)!
    expect(fit.params.ki!.value).toBeCloseTo(5, 6)
    expect(fit.params.km!.value).toBeCloseTo(20, 6)
    expect(fit.predict(10, 10)).toBeCloseTo(competitive[2].values[2], 6)
    expect(r.comparison?.best).toBe('competitive')
    expect(comparisonRows(r.comparison!).find((row) => row.best)?.model).toBe('competitive')
  })

  it('says which series has no inhibitor concentration', () => {
    const groups = competitive.map((g, i) => (i === 1 ? { ...g, name: 'Treated' } : g))
    expect(kineticsColumns({ groups }).map((c) => c.inhibitor)).toEqual([0, null, 10, 20])
    const drawing = chartLayout(chart({ groups, kinetics: { model: 'competitive' } }))
    expect(drawing.notes.join(' ')).toMatch(/Treated/)
  })

  it('draws a Lineweaver–Burk plot whose lines meet on the y axis for competitive inhibition', () => {
    const node = chart({ groups: competitive, kinetics: { model: 'competitive', lineweaver: true } })
    const drawing = chartLayout(node)
    expect(drawing.notes).toEqual([])
    const text = JSON.stringify(drawing)
    expect(text).toContain('1 / [Substrate]')
    expect(text).toContain('1 / Rate')
    // Every line reaches back to where it crosses the x axis, −1/Km(apparent): the axis goes below zero.
    expect(text).toMatch(/"−0\.\d+"|"-0\.\d+"/)
  })

  it('writes the parameters, kcat and the methods', () => {
    const node = chart({ ...(chartSample('kinetics') as Partial<ChartNode>) })
    const r = kineticsOf(node)
    const fit = kineticsFitFor(node, r, 0)!
    const lines = fitLines(fit, 0.05)
    expect(lines[0]).toMatch(/^Vmax \d+\.?\d* ± [\d.]+ \(95 % CI [\d.]+ to [\d.]+\)$/)
    expect(lines.some((l) => l.startsWith('kcat '))).toBe(true)
    expect(lines.some((l) => l.startsWith('kcat/Km '))).toBe(true)
    expect(estimateText({ value: 1, se: 0.1, lo: 0.8, hi: 1.2 })).toBe('1 ± 0.1 (95 % CI 0.8 to 1.2)')
    const cells = kineticsCells(node, r)
    expect(cells[0]).toEqual(['Series', 'Parameter', 'Estimate', 'SE', '95 % CI low', '95 % CI high'])
    expect(cells.filter((row) => row[0] === 'Wild type').map((row) => row[1])).toEqual(['Vmax', 'Km', 'kcat', 'kcat/Km'])
    expect(kineticsMethods(node, r)).toMatch(/Michaelis–Menten equation.*nls\(v ~ Vmax \* S \/ \(Km \+ S\)\)/)
    const inhibited = chart({ groups: competitive, kinetics: { model: 'competitive' } })
    expect(kineticsMethods(inhibited, kineticsOf(inhibited))).toMatch(/4 inhibitor concentrations.*competitive inhibition.*F test/)
  })
})
