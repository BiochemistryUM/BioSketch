// A standard curve read from a plate reader's grid (src/model/plateStandards.ts).

import { describe, expect, it } from 'vitest'
import { defaultPlan, lanesText, plateLayoutEntries, plateTable, readLanes, wellRoles } from '../src/model/plateStandards'
import { standardGroups } from '../src/model/standardTable'
import { readPlates } from '../src/model/tableRoles'

// A BCA plate: standards in duplicate down columns 1 and 2 (2000 µg/ml halving, the last a blank),
// samples in duplicate in columns 3 to 8, columns 9 to 12 empty.
const signal = (conc: number) => 0.1 + conc / 1000
const grid = (): string => {
  const head = ['', ...Array.from({ length: 12 }, (_, i) => String(i + 1))].join('\t')
  const rows = 'ABCDEFGH'.split('').map((letter, r) => {
    const conc = r === 7 ? 0 : 2000 / 2 ** r
    const cells = Array.from({ length: 12 }, (_, c) => (c < 2 ? signal(conc).toFixed(3) : c < 8 ? (0.3 + r * 0.1 + Math.floor((c - 2) / 2) * 0.01).toFixed(3) : ''))
    return [letter, ...cells].join('\t')
  })
  return ['Read 1:562', head, ...rows].join('\n')
}

describe('a standard curve from a plate', () => {
  const wells = readPlates(grid())![0].wells

  it('reads the standards down the columns, the blank last, and the samples side by side', () => {
    const table = plateTable(wells, defaultPlan())
    expect(table.standards.map((s) => [s.name, s.conc, s.values.length])).toEqual([
      ['Std 1', 2000, 2], ['Std 2', 1000, 2], ['Std 3', 500, 2], ['Std 4', 250, 2], ['Std 5', 125, 2], ['Std 6', 62.5, 2], ['Std 7', 31.25, 2], ['Blank', 0, 2],
    ])
    expect(table.standards[0].values).toEqual([2.1, 2.1])
    // Three samples in each of eight rows, two wells each, numbered row by row.
    expect(table.samples).toHaveLength(24)
    expect(table.samples[0]).toEqual({ name: 'S1', values: [0.3, 0.3] })
    expect(table.samples[4]).toEqual({ name: 'S5', values: [0.41, 0.41] })
    // It becomes the chart's groups like any pasted table.
    const { groups } = standardGroups(table)
    expect(groups.map((g) => [g.name, g.values.length])).toEqual([['Standards', 16], ['Samples', 48]])
  })

  it('takes a press: a well made a blank joins the blanks, one left out is in nothing', () => {
    const table = plateTable(wells, defaultPlan(), { A3: 'out', C4: 'blank' })
    expect(table.samples[0]).toEqual({ name: 'S1', values: [0.3] })
    expect(table.standards.find((s) => s.conc === 0)!.values).toHaveLength(3)
    const entries = plateLayoutEntries(wells, defaultPlan(), { A3: 'out' })
    expect(entries.find((e) => e.well === 'A3')).toMatchObject({ key: 'Left out', flag: expect.any(String) })
    expect(entries.find((e) => e.well === 'A1')).toMatchObject({ key: 'Standard', set: 'std 2000' })
    expect(entries.filter((e) => e.set === 'S1').map((e) => e.well)).toEqual(['A4'])
  })

  it('takes standards along rows, a lane of its own length, no blank, and single wells as samples', () => {
    const plan = { ...defaultPlan(), along: 'rows' as const, lanes: [1], count: 4, top: 10, factor: 10, blankLast: false, replicates: 1 }
    const roles = wellRoles(wells, plan)
    expect(['A1', 'A2', 'A3', 'A4'].map((w) => roles.get(w))).toEqual([0, 1, 2, 3].map((i) => ({ role: 'standard', conc: Number((10 / 10 ** i).toPrecision(6)), index: i })))
    expect(roles.get('A5')).toEqual({ role: 'sample', name: 'S1' })
    expect(roles.get('A9')).toBeUndefined()
    expect(plateTable(wells, plan).samples).toHaveLength(4 + 7 * 8)
  })

  it('reads the lanes as typed and writes them back', () => {
    expect(readLanes('1-2', 'columns')).toEqual([1, 2])
    expect(readLanes('1, 3; 5', 'columns')).toEqual([1, 3, 5])
    expect(readLanes('a-c', 'rows')).toEqual([1, 2, 3])
    expect(readLanes('13', 'columns')).toBeNull()
    expect(readLanes('', 'columns')).toBeNull()
    expect(lanesText([1, 2, 3, 5], 'columns')).toBe('1-3, 5')
    expect(lanesText([1, 2], 'rows')).toBe('A-B')
  })
})
