// Names of a chart typed over in the panel: groups, series and categories.

import { describe, expect, it } from 'vitest'
import { NAME_MAX, chartCategories, chartSeries, parseTable, renameCategory, renameSeries, tableText, tidyName } from '../src/model/chart'
import { validateDoc } from '../src/io/files'
import type { ChartGroup, ChartNode } from '../src/model/types'

const chart = (groups: ChartGroup[], more: Partial<ChartNode> = {}): ChartNode => ({ id: 'c', type: 'chart', x: 0, y: 0, w: 300, h: 200, rotation: 0, kind: 'bar', groups, ...more })

const plain = chart([
  { name: 'Control', values: [1, 2, 3], color: '#112233' },
  { name: 'Drug', values: [4, 5, 6], shape: 'square' },
])

const grouped = chart([
  { name: 'Vehicle', category: 'WT', values: [1, 2] },
  { name: 'Drug', category: 'WT', values: [3, 4] },
  { name: 'Vehicle', category: 'KO', values: [5, 6] },
  { name: 'Drug', category: 'KO', values: [7, 8] },
])

describe('a name typed in the panel', () => {
  it('is made to fit a cell of the table', () => {
    expect(tidyName('  Wild   type \t')).toBe('Wild type')
    expect(tidyName('a\nb\tc')).toBe('a b c')
    expect(tidyName('x'.repeat(200))).toHaveLength(NAME_MAX)
    expect(tidyName(' \t ')).toBe('')
    // A typographic minus and a dash before a number are read from a table as a hyphen: a typed name is written the same way.
    expect(tidyName('IL-6^{−/−}, day 1–3')).toBe('IL-6^{-/-}, day 1-3')
  })

  it('renames one group and leaves everything else about it alone', () => {
    const out = renameSeries(plain, 1, ' Compound A ')
    expect(out.problem).toBeUndefined()
    expect(out.change?.groups).toEqual([plain.groups[0], { name: 'Compound A', values: [4, 5, 6], shape: 'square' }])
    expect(out.change?.groups?.[0]).toBe(plain.groups[0])
  })

  it('does nothing for an empty name, the same name or a series that is not there', () => {
    expect(renameSeries(plain, 0, '   ')).toEqual({})
    expect(renameSeries(plain, 0, 'Control')).toEqual({})
    expect(renameSeries(plain, 0, ' Control ')).toEqual({})
    expect(renameSeries(plain, 7, 'New')).toEqual({})
    expect(renameSeries(plain, -1, 'New')).toEqual({})
  })

  it('lets two groups of a chart without categories carry one name', () => {
    // Each group is a series of its own there, so nothing is merged.
    const out = renameSeries(plain, 1, 'Control')
    expect(out.change?.groups?.map((g) => g.name)).toEqual(['Control', 'Control'])
    expect(chartSeries({ ...plain, ...out.change }).map((s) => s.groups)).toEqual([[0], [1]])
  })

  it('renames a series in every category of a grouped chart', () => {
    const out = renameSeries(grouped, 1, 'Compound')
    expect(out.change?.groups?.map((g) => `${g.category} ${g.name}`)).toEqual(['WT Vehicle', 'WT Compound', 'KO Vehicle', 'KO Compound'])
    expect(chartSeries({ ...grouped, ...out.change }).map((s) => s.name)).toEqual(['Vehicle', 'Compound'])
  })

  it('refuses a name another series of a grouped chart has, in words', () => {
    const out = renameSeries(grouped, 1, 'Vehicle')
    expect(out.change).toBeUndefined()
    expect(out.problem).toContain('Another series is called “Vehicle”')
    // Also when the two never stand in the same category, where they would silently become one series.
    const apart = chart([
      { name: 'A', category: 'X', values: [1] },
      { name: 'B', category: 'Y', values: [2] },
    ])
    expect(renameSeries(apart, 1, 'A').problem).toBeTruthy()
  })

  it('gives a name of its own to a series that was only told apart by a number', () => {
    const twice = chart([
      { name: 'Drug', category: 'WT', values: [1] },
      { name: 'Drug', category: 'WT', values: [2] },
    ])
    expect(chartSeries(twice).map((s) => s.name)).toEqual(['Drug', 'Drug (2)'])
    expect(renameSeries(twice, 1, 'Drug').problem).toBeTruthy()
    const out = renameSeries(twice, 1, 'Drug, high dose')
    expect(out.change?.groups?.map((g) => g.name)).toEqual(['Drug', 'Drug, high dose'])
  })

  it('keeps the list of series whose points are named in step', () => {
    const scatter = chart(
      [
        { name: 'Up', values: [1, 2], xs: [1, 2] },
        { name: 'Down', values: [3, 4], xs: [1, 2] },
      ],
      { kind: 'scatter', pointNames: { show: 'top', top: 5, series: ['Up'] } },
    )
    expect(renameSeries(scatter, 0, 'Induced').change?.pointNames).toEqual({ show: 'top', top: 5, series: ['Induced'] })
    // A series that is not in the list leaves the list as it is.
    expect(renameSeries(scatter, 1, 'Repressed').change?.pointNames).toBeUndefined()
    // Two series with one name: the other still has it, so both names are listed.
    const same = { ...scatter, groups: scatter.groups.map((g) => ({ ...g, name: 'Up' })) }
    expect(renameSeries(same, 1, 'Also up').change?.pointNames?.series).toEqual(['Up', 'Also up'])
  })

  it('names the categories of a grouped chart, and no others', () => {
    expect(chartCategories(grouped)).toEqual(['WT', 'KO'])
    expect(chartCategories(plain)).toEqual([])
    const out = renameCategory(grouped, 1, 'Knock-out')
    expect(out.change?.groups?.map((g) => g.category)).toEqual(['WT', 'WT', 'Knock-out', 'Knock-out'])
    expect(renameCategory(grouped, 1, 'KO')).toEqual({})
    expect(renameCategory(grouped, 1, '  ')).toEqual({})
    expect(renameCategory(grouped, 5, 'New')).toEqual({})
    expect(renameCategory(plain, 0, 'New')).toEqual({})
    expect(renameCategory(grouped, 1, 'WT').problem).toContain('Another category is called “WT”')
  })

  it('stands in the table and is read back from it', () => {
    const renamed = { ...grouped, ...renameSeries(grouped, 0, 'Wild type, untreated').change }
    const again = { ...renamed, ...renameCategory(renamed, 0, 'IL-6^{−/−} mice').change }
    const back = parseTable(tableText(again.groups, 'bar'), 'bar', 2)
    expect(back.map((g) => `${g.category}|${g.name}`)).toEqual(again.groups.map((g) => `${g.category}|${g.name}`))
    // One group whose name has spaces is still one column.
    const one = chart([{ name: 'Control', values: [1, 2, 3] }])
    const single = { ...one, ...renameSeries(one, 0, 'Wild type cells').change }
    expect(parseTable(tableText(single.groups, 'bar'), 'bar', 1).map((g) => g.name)).toEqual(['Wild type cells'])
  })

  it('survives saving and opening the figure', () => {
    const renamed = { ...grouped, ...renameSeries(grouped, 1, 'x'.repeat(80)).change }
    const doc = validateDoc({ app: 'biosketch', version: 1, name: 't', width: 400, height: 300, background: '#ffffff', nodes: [renamed], customIcons: {} })
    const kept = doc.nodes[0] as ChartNode
    expect(kept.groups.map((g) => g.name)).toEqual(renamed.groups.map((g) => g.name))
    expect(kept.groups[1].name).toHaveLength(NAME_MAX)
  })
})
