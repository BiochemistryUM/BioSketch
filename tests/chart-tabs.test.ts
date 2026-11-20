// The headings the settings of a chart are sorted under: which ones a chart has, which is open.

import { describe, expect, it } from 'vitest'
import { CHART_TABS, chartTabs, lastChartTab, openTab, rememberChartTab, stepTab } from '../src/ui/chartTabs'
import type { ChartKind } from '../src/model/types'

describe('the headings of the chart panel', () => {
  it('are four, in a fixed order, for every chart with axes', () => {
    const kinds: ChartKind[] = ['bar', 'dot', 'line', 'box', 'violin', 'scatter', 'heatmap']
    for (const kind of kinds) expect(chartTabs(kind)).toEqual(['data', 'stats', 'look', 'axes'])
    expect(CHART_TABS.map((t) => t.label)).toEqual(['Data', 'Statistics', 'Look', 'Axes'])
  })

  it('leave out statistics and axes for a pie and a Venn diagram, which have neither', () => {
    expect(chartTabs('pie')).toEqual(['data', 'look'])
    expect(chartTabs('venn')).toEqual(['data', 'look'])
  })

  it('open on the heading asked for when the chart has it, otherwise on the first', () => {
    expect(openTab('look', chartTabs('bar'))).toBe('look')
    expect(openTab('stats', chartTabs('pie'))).toBe('data')
    expect(openTab('axes', chartTabs('pie'))).toBe('data')
    expect(openTab('look', chartTabs('pie'))).toBe('look')
    expect(openTab('colours', chartTabs('bar'))).toBe('data')
    expect(openTab(undefined, chartTabs('bar'))).toBe('data')
    expect(openTab('look', [])).toBe('data')
  })

  it('are walked with the arrow keys, going round at the ends', () => {
    const all = chartTabs('box')
    expect(stepTab('data', all, 1)).toBe('stats')
    expect(stepTab('axes', all, 1)).toBe('data')
    expect(stepTab('data', all, -1)).toBe('axes')
    expect(stepTab('look', all, -1)).toBe('stats')
    const pie = chartTabs('pie')
    expect(stepTab('data', pie, 1)).toBe('look')
    expect(stepTab('look', pie, 1)).toBe('data')
    // A heading the chart does not have leads to the first one, and an empty row changes nothing.
    expect(stepTab('axes', pie, 1)).toBe('data')
    expect(stepTab('look', [], 1)).toBe('look')
  })

  it('remember the one opened last, and nothing that is not a heading', () => {
    expect(lastChartTab()).toBe('data')
    rememberChartTab('stats')
    expect(lastChartTab()).toBe('stats')
    rememberChartTab('colours' as never)
    expect(lastChartTab()).toBe('stats')
    rememberChartTab('data')
  })
})
