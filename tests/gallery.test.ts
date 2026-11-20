import { describe, expect, it } from 'vitest'
import { validateDoc } from '../src/io/files'
import { chartLayout } from '../src/model/chart'
import { chartSample, type ChartSample } from '../src/model/chartSamples'
import { emptyDoc } from '../src/model/doc'
import { findItems, matchScore } from '../src/model/match'
import type { ChartNode } from '../src/model/types'

const KINDS: ChartSample[] = ['bar', 'dot', 'box', 'violin', 'line', 'scatter', 'pie', 'heatmap', 'venn', 'survival', 'dose', 'stacked', 'standard', 'kinetics', 'qpcr']

describe('example charts of the gallery', () => {
  it.each(KINDS)('%s is drawn, and survives saving unchanged', (kind) => {
    const node: ChartNode = { id: 'c1', type: 'chart', x: 10, y: 10, w: 360, h: 260, rotation: 0, ...chartSample(kind) }
    const drawn = chartLayout(node)
    expect(drawn.rects.length + drawn.lines.length + drawn.paths.length + drawn.circles.length).toBeGreaterThanOrEqual(3)
    // The standard curve's example has one lysate above the standards on purpose, to show the notice.
    expect(drawn.notes).toEqual(kind === 'standard' ? [expect.stringMatching(/^Lysate C lies outside/)] : [])
    const doc = { ...emptyDoc(), nodes: [node] }
    expect(validateDoc(JSON.parse(JSON.stringify(doc))).nodes[0]).toEqual(node)
  })
  it('gives a fresh copy each time, so editing one example does not change the next', () => {
    const a = chartSample('bar')
    a.groups[0].values[0] = 99
    expect(chartSample('bar').groups[0].values[0]).toBe(4.1)
  })
})

describe('finding things by what is typed', () => {
  const items = [
    { name: 'Standard curve', keywords: ['Bradford', 'BCA', 'ELISA'] },
    { name: 'Survival curves', keywords: ['Kaplan–Meier'] },
    { name: 'Lab calculators', keywords: ['molarity', 'dilution'], description: 'How much to weigh' },
    { name: 'qPCR fold change', keywords: ['ΔΔCt', 'Cq'] },
  ]
  it('finds by name, by keyword, by description, in any case and order', () => {
    expect(findItems('curve', items).map((i) => i.name)).toEqual(['Standard curve', 'Survival curves'])
    expect(findItems('bradford', items)[0].name).toBe('Standard curve')
    expect(findItems('kaplan', items)[0].name).toBe('Survival curves')
    expect(findItems('weigh', items)[0].name).toBe('Lab calculators')
    expect(findItems('ddct', items)[0].name).toBe('qPCR fold change')
    expect(findItems('CURVE standard', items)[0].name).toBe('Standard curve')
  })
  it('wants every word to fit', () => {
    expect(findItems('standard zebra', items)).toEqual([])
    expect(matchScore('', items[0])).toBe(0)
  })
  it('puts the start of a name first', () => {
    expect(matchScore('stand', items[0])).toBeGreaterThan(matchScore('curve', items[0]))
  })
})

describe('the first view of the gallery', () => {
  it('has a Chart card under Basics that opens the charts and analyses, and no membrane', async () => {
    const { ADDABLE, COMMANDS } = await import('../src/ui/catalogue')
    const card = ADDABLE.find((e) => e.heading === 'Basics' && e.opens?.includes('Charts') && e.opens.includes('Analyses'))
    expect(card?.name).toBe('Chart')
    expect(ADDABLE.filter((e) => e.heading === 'Charts').length).toBeGreaterThan(5)
    expect(ADDABLE.some((e) => /membrane/i.test(e.name))).toBe(false)
    // The membrane tool is still found by Search.
    expect(findItems('membrane', COMMANDS)[0]?.name).toBe('Membrane')
  })
})
