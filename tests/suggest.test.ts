// Charts suggested for a pasted table (src/model/suggest.ts): one table of every common shape,
// the chart it should be offered first, and every suggestion drawn and saved without loss.

import { describe, expect, it } from 'vitest'
import { validateDoc } from '../src/io/files'
import { chartLayout } from '../src/model/chart'
import { suggestCharts, summarise } from '../src/model/suggest'
import { isTableText } from '../src/model/tableRoles'
import type { ChartNode } from '../src/model/types'

import cfx from './fixtures/tables/qpcr-biorad-cfx.csv?raw'
import bradford from './fixtures/tables/bradford-wide.tsv?raw'
const rows = (lines: (string | number)[][]) => lines.map((l) => l.join('\t')).join('\n')
const node = (chart: object): ChartNode => ({ id: 's1', type: 'chart', x: 0, y: 0, w: 360, h: 260, rotation: 0, ...chart }) as ChartNode
const reopened = (n: ChartNode): ChartNode => validateDoc({ app: 'biosketch', version: 1, name: 't', width: 600, height: 400, background: '#ffffff', nodes: [n], customIcons: {} }).nodes[0] as ChartNode

const temps = Array.from({ length: 40 }, (_, k) => 30 + k * 1.5)
const sig = (tm: number) => temps.map((t) => Math.round(1000 + 9000 / (1 + Math.exp((tm - t) / 2))))

const TABLES: Record<string, { text: string; first: string; also?: string[]; only?: boolean }> = {
  'a qPCR export': { text: cfx, first: 'qpcr' },
  'a Bradford plate': { text: bradford, first: 'standard' },
  'survival times': {
    text: rows([['Days', 'Control', 'Treated'], [5, 1, ''], [8, 1, ''], [9, '', 1], [12, 0, ''], [15, '', 0], [20, 1, ''], [26, '', 1], [30, '', 0]]),
    first: 'survival',
    only: true,
  },
  'a thermal shift': { text: rows([['Temperature (°C)', 'Apo 1', 'Apo 2'], ...temps.map((t, k) => [t, sig(52)[k], sig(52.4)[k]])]), first: 'melt' },
  'saturation binding': {
    text: rows([['Free ligand (nM)', 'Total', 'NSB'], ...[0.2, 0.5, 1, 2, 4, 8, 16].map((x) => [x, Math.round((1500 * x) / (1.2 + x) + 40 * x), Math.round(40 * x + 20)])]),
    first: 'binding',
  },
  'enzyme rates': { text: rows([['[S] (µM)', 'Rate'], ...[2.5, 5, 10, 20, 40, 80].map((s) => [s, ((10 * s) / (20 + s)).toFixed(2)])]), first: 'kinetics' },
  'a dose series': { text: rows([['Dose (µM)', 'Response'], ...[0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1, 3, 10].map((d, k) => [d, [2, 3, 5, 12, 31, 62, 85, 93, 96][k]])]), first: 'dose' },
  'a gene table': {
    text: rows([['Gene', 'log2FC', '-log10 p'], ['TP53', 2.1, 5.2], ['MYC', -1.4, 3.1], ['JUN', 0.2, 0.4], ['FOS', 3.3, 8.8], ['EGFR', -0.1, 0.2], ['KRAS', 1.1, 2.2]]),
    first: 'volcano',
  },
  'two gene lists': { text: rows([['RNA-seq', 'Proteomics'], ['TP53', 'TP53'], ['MYC', 'FOS'], ['JUN', 'MYC'], ['EGFR', 'AKT1']]), first: 'venn' },
  'an expression matrix': {
    text: rows([['Gene', 'Ctrl 1', 'Ctrl 2', 'LPS 1', 'LPS 2'], ['Il6', 2.1, 2.4, 48, 52], ['Tnf', 5.5, 5.1, 31, 28], ['Myc', 14, 15, 22, 25], ['Cdkn1a', 3.3, 3, 9.5, 11], ['Actb', 98, 101, 99, 102]]),
    first: 'heatmap',
  },
  'a few replicates per group': { text: rows([['Control', 'Treated', 'Rescue'], [4.1, 6.9, 5], [3.8, 7.4, 4.7], [4.6, 6.1, 5.6], [4.3, 7.8, 5.2]]), first: 'dot', also: ['bar'] },
  'many values per group': {
    text: rows([['WT', 'KO'], ...Array.from({ length: 24 }, (_, k) => [(10 + Math.sin(k) * 2).toFixed(2), (14 + Math.cos(k) * 3).toFixed(2)])]),
    first: 'box',
    also: ['dot', 'violin'],
  },
  'categories and series': {
    text: rows([['WT', 'WT', 'KO', 'KO'], ['Vehicle', 'Drug', 'Vehicle', 'Drug'], [1, 2, 3, 4], [1.2, 2.2, 3.1, 4.4], [0.9, 1.8, 2.8, 4.1]]),
    first: 'grouped',
  },
  'one number per group': { text: rows([['G1', 'S', 'G2/M'], [55, 20, 25]]), first: 'bar', also: ['pie'] },
}

describe('charts suggested for a table', () => {
  it.each(Object.entries(TABLES))('%s', (_, t) => {
    const found = suggestCharts(t.text)
    expect(found[0]?.id).toBe(t.first)
    for (const id of t.also ?? []) expect(found.map((s) => s.id)).toContain(id)
    if (t.only) expect(found).toHaveLength(1)
    for (const s of found) {
      expect(s.why.length).toBeGreaterThan(20)
      const n = node(s.chart)
      // Every suggestion can be drawn and comes back from a file as it was offered.
      expect(() => chartLayout(n)).not.toThrow()
      expect(reopened(n)).toEqual(n)
    }
  })

  it('offers nothing for an empty table and never more than asked', () => {
    expect(suggestCharts('')).toEqual([])
    expect(suggestCharts(TABLES['a few replicates per group'].text, 2)).toHaveLength(2)
  })

  it('says in words what was read', () => {
    expect(summarise(TABLES['an expression matrix'].text).text).toBe('5 rows under a row of names; 1 column of words and 4 columns of numbers')
  })

  it('draws the first suggestion of each table without a notice it would not have had in the panel', () => {
    const melt = suggestCharts(TABLES['a thermal shift'].text)[0]
    expect(chartLayout(node(melt.chart)).notes).toEqual([])
    const qpcr = suggestCharts(TABLES['a qPCR export'].text)[0]
    expect(qpcr.why).toMatch(/2 targets|3 targets/)
  })

  it('knows a table pasted on the page from other text', () => {
    for (const [name, t] of Object.entries(TABLES)) if (t.text.includes('\t')) expect([name, isTableText(t.text)]).toEqual([name, true])
    expect(isTableText('4.1\n3.8\n4.6\n4.3')).toBe(true)
    expect(isTableText('Control\n4.1\n3.8\n4.6')).toBe(true)
    expect(isTableText('BioSketch objects')).toBe(false)
    expect(isTableText('The cells were lysed, spun at 4 °C and\nthe supernatant kept.')).toBe(false)
    expect(isTableText('TP53\nMYC\nJUN')).toBe(false)
    expect(isTableText('CC(=O)Oc1ccccc1C(=O)O')).toBe(false)
    expect(isTableText('Words\twith a tab\nonce')).toBe(false)
  })
})
