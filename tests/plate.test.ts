// The picture of a plate (src/model/plate.ts) and the wells of a qPCR chart it is drawn from
// (`qpcrPlate`, the Well column read by `qpcrRows`, kept by `validateDoc`).

import { describe, expect, it } from 'vitest'
import { validateDoc } from '../src/io/files'
import { chartSample } from '../src/model/chartSamples'
import { EMPTY_WELL, FLAG, platePicture, plateNodes, plateSizeOf, wellAt, wellPlace, type PlateEntry } from '../src/model/plate'
import { analyseQpcr, qpcrPlate, qpcrWells } from '../src/model/qpcr'
import { qpcrGroups, qpcrTableText, readQpcrText } from '../src/model/qpcrTable'
import type { ChartNode, ShapeNode, TextNode } from '../src/model/types'

const entry = (well: string, key: string, extra: Partial<PlateEntry> = {}): PlateEntry => ({ well, key, detail: `${key} in ${well}`, ...extra })
const reopened = (n: ChartNode): ChartNode => validateDoc({ app: 'biosketch', version: 1, name: 't', width: 600, height: 400, background: '#ffffff', nodes: [n], customIcons: {} }).nodes[0] as ChartNode

describe('wells and plates', () => {
  it('reads the place of a well and picks the smallest plate that holds every well', () => {
    expect(wellPlace('B3')).toEqual({ row: 1, col: 2 })
    expect(wellPlace('h12')).toEqual({ row: 7, col: 11 })
    expect(wellPlace('A01')).toEqual({ row: 0, col: 0 })
    expect(wellPlace('Q1')).toBeNull()
    expect(wellPlace('LPS 2')).toBeNull()
    expect(plateSizeOf(['A1', 'H12'])).toBe(96)
    expect(plateSizeOf(['A1', 'I1'])).toBe(384)
    expect(plateSizeOf(['A13'])).toBe(384)
  })
})

describe('the picture', () => {
  const entries = [entry('A1', 'Control', { text: '18.2', set: 'c' }), entry('A2', 'Control', { text: '18.3', set: 'c' }), entry('B1', 'LPS', { text: '24.9', flag: 'late' }), entry('Z9', 'Nowhere')]
  const p = platePicture(entries)

  it('draws every well of the plate, coloured by key in the order the keys appear, and rings a well with a remark', () => {
    expect(p.size).toBe(96)
    expect(p.wells).toHaveLength(96)
    const at = (w: string) => p.wells.find((m) => m.well === w)!
    expect(at('A1').fill).toBe(at('A2').fill)
    expect(at('B1').fill).not.toBe(at('A1').fill)
    expect(at('C1').fill).toBeNull()
    expect(at('B1').flagged).toBe(true)
    expect(p.legend.map((l) => l.key)).toEqual(['Control', 'LPS'])
    expect(p.h).toBeGreaterThan(p.plate.h)
    // A well that is no well of a plate is left out.
    expect(p.wells.some((w) => w.entries.some((e) => e.key === 'Nowhere'))).toBe(false)
  })

  it('finds the well under a press, and none between wells or outside the plate', () => {
    const a2 = p.wells.find((w) => w.well === 'A2')!
    expect(wellAt(p, a2.cx + 3, a2.cy - 3)?.well).toBe('A2')
    expect(wellAt(p, -40, -40)).toBeNull()
  })

  it('becomes objects of the figure in one group: a circle per well, the Cq written in it, a legend', () => {
    const nodes = plateNodes(p)
    expect(new Set(nodes.map((n) => n.groupId))).toEqual(new Set(['plate-group']))
    const circles = nodes.filter((n): n is ShapeNode => n.type === 'shape' && n.shape === 'ellipse')
    expect(circles).toHaveLength(96 + p.legend.length)
    expect(circles.filter((c) => c.stroke === FLAG)).toHaveLength(1)
    expect(circles.filter((c) => c.fill === EMPTY_WELL)).toHaveLength(93)
    const words = nodes.filter((n): n is TextNode => n.type === 'text').map((t) => t.text)
    expect(words).toEqual(expect.arrayContaining(['A', 'H', '1', '12', '18.2', '24.9', 'Control', 'LPS']))
    expect(plateNodes(platePicture(entries, { values: false })).some((n) => n.type === 'text' && n.text === '18.2')).toBe(false)
    // The objects survive being saved.
    const doc = validateDoc({ app: 'biosketch', version: 1, name: 't', width: 600, height: 400, background: '#ffffff', nodes, customIcons: {} })
    expect(doc.nodes).toHaveLength(nodes.length)
  })

  it('draws a 384-well plate smaller, without numbers in the wells', () => {
    const big = platePicture([entry('P24', 'x', { text: '30.1' })])
    expect(big.size).toBe(384)
    expect(big.wells).toHaveLength(384)
    expect(big.values).toBe(false)
    expect(plateNodes(big).some((n) => n.type === 'text' && n.text === '30.1')).toBe(false)
  })
})

describe('the plate of a qPCR chart', () => {
  const sample = chartSample('qpcr') as Pick<ChartNode, 'groups' | 'qpcr'>

  it('places every well of the example, coloured by condition, sample or target', () => {
    const byCondition = qpcrPlate(sample.groups)
    expect(byCondition).toHaveLength(81)
    expect(new Set(byCondition.map((e) => e.key))).toEqual(new Set(['Control', 'LPS', 'LPS + drug']))
    expect(new Set(qpcrPlate(sample.groups, {}, 'target').map((e) => e.key))).toEqual(new Set(['GAPDH', 'IL6', 'TNF']))
    expect(new Set(qpcrPlate(sample.groups, {}, 'sample').map((e) => e.key)).size).toBe(9)
    expect(new Set(qpcrPlate(sample.groups, { ownSamples: true }).map((e) => e.key)).size).toBe(9)
    const a1 = byCondition.find((e) => e.well === 'A1')!
    expect(a1.detail).toMatch(/^Control 1, GAPDH, Cq /)
    expect(byCondition.filter((e) => e.set === a1.set).map((e) => e.well)).toEqual(['A1', 'A2', 'A3'])
  })

  it('rings the wells the analysis remarks on, by the same rule', () => {
    const wells = qpcrWells(sample.groups).map((w, i) => (i === 0 ? { ...w, cq: w.cq + 1.4 } : w))
    const groups = qpcrGroups({ wells, conditions: {}, noCq: [], controls: [], amplified: [] })
    const remark = analyseQpcr(wells).notices.find((n) => n.startsWith('Technical replicates differ'))
    expect(remark).toMatch(/GAPDH in Control 1/)
    const flagged = qpcrPlate(groups).filter((e) => e.flag)
    expect(flagged.map((e) => e.well)).toEqual(['A1', 'A2', 'A3'])
    expect(flagged[0].flag).toMatch(/technical replicates .* cycles apart/)
  })

  it('reads the wells of a machine export and keeps them through the table, saving and reading again', () => {
    const text = ['Well\tSample Name\tTarget Name\tCT', 'A01\tWT 1\tGAPDH\t18.1', 'A02\tWT 1\tIL6\t25.3', 'B01\tKO 1\tGAPDH\t18.4', 'B02\tKO 1\tIL6\t23.0', 'C01\tNTC\tGAPDH\tUndetermined'].join('\n')
    const groups = qpcrGroups(readQpcrText(text).table)
    expect(groups.map((g) => g.wells)).toEqual([
      ['A1', 'B1'],
      ['A2', 'B2'],
    ])
    const node: ChartNode = { id: 'q', type: 'chart', x: 0, y: 0, w: 400, h: 300, rotation: 0, kind: 'qpcr', groups }
    expect(qpcrTableText(node).split('\n')[0]).toBe('Well\tSample\tTarget\tCq')
    expect(qpcrGroups(readQpcrText(qpcrTableText(node)).table)).toEqual(groups)
    expect(reopened(node).groups).toEqual(groups)
    // A well that is not one is dropped; a table without wells has none.
    const odd = reopened({ ...node, groups: [{ ...groups[0], wells: ['A1', '<script>'] }, groups[1]] })
    expect(odd.groups[0].wells).toEqual(['A1', ''])
    const plain = qpcrGroups(readQpcrText('Sample\tTarget\tCq\nWT 1\tGAPDH\t18').table)
    expect(plain[0].wells).toBeUndefined()
    expect(qpcrPlate(plain)).toEqual([])
  })
})
