// The settings of a chart are sorted under four headings in the properties panel, with one of
// them open at a time, so the panel is not one long list to scroll. Which setting stands under
// which heading is decided where the panel is drawn (ChartProps); here is which headings a chart
// has, which one is open, and where an arrow key leads.

import type { ChartPart } from '../model/chart'
import type { ChartKind } from '../model/types'

export type ChartTab = 'data' | 'stats' | 'look' | 'axes'

/** The headings in the order they are shown, with what stands under each. */
export const CHART_TABS: { id: ChartTab; label: string; title: string }[] = [
  { id: 'data', label: 'Data', title: 'The kind of chart and its numbers' },
  { id: 'stats', label: 'Statistics', title: 'Error bars, tests, brackets, fitted lines and curves' },
  { id: 'look', label: 'Look', title: 'Colours, points, numbers at the groups, legend, text size' },
  { id: 'axes', label: 'Axes', title: 'Titles, ranges, lines at values, names of points' },
]

const ALL: ChartTab[] = CHART_TABS.map((t) => t.id)

/** The headings a chart of this kind has. A pie and a Venn diagram have no axes, no error bars and no test: their title stands under "Look". */
export function chartTabs(kind: ChartKind): ChartTab[] {
  return kind === 'pie' || kind === 'venn' ? ['data', 'look'] : ALL
}

/** The heading that is open: the one asked for when the chart has it, otherwise the first one. */
export function openTab(wanted: unknown, tabs: ChartTab[]): ChartTab {
  return tabs.find((t) => t === wanted) ?? tabs[0] ?? 'data'
}

/** The heading an arrow key leads to: the next one or the one before, going round at the ends. */
export function stepTab(current: ChartTab, tabs: ChartTab[], step: 1 | -1): ChartTab {
  if (!tabs.length) return current
  const at = tabs.indexOf(current)
  return at < 0 ? tabs[0] : tabs[(at + step + tabs.length) % tabs.length]
}

/**
 * Where the settings of a part of a chart are: the heading, and the name the panel gives the
 * setting (`data-setting`). A group is named by its place in the table; the panel turns that into
 * the row of its list. `survival` says the chart draws survival curves, `way` the analysis a scatter table is drawn as (enzyme kinetics, binding, melting curves).
 */
export function settingFor(part: ChartPart, kind: ChartKind, survival = false, way: 'kinetics' | 'binding' | 'melt' | null = null): { tab: ChartTab; setting: string } {
  const at = part.at ?? 0
  switch (part.what) {
    case 'group':
      return { tab: 'look', setting: `group-${at}` }
    case 'category':
      return { tab: 'look', setting: `category-${at}` }
    case 'cells':
    case 'scale':
      return { tab: 'look', setting: 'heat-scale' }
    case 'legend':
      return { tab: 'look', setting: 'legend' }
    case 'number':
      return { tab: 'look', setting: kind === 'heatmap' ? 'heat-numbers' : 'numbers' }
    case 'error':
      return { tab: 'stats', setting: 'error' }
    case 'fit':
      return { tab: 'stats', setting: way ? `${way}-fit` : 'fit' }
    case 'bracket':
      return { tab: 'stats', setting: kind === 'qpcr' ? 'qpcr-marks' : `bracket-${at}` }
    case 'result':
      return { tab: 'stats', setting: survival ? 'log-rank' : 'corr' }
    case 'refLine':
      return { tab: 'axes', setting: `line-${at}` }
    case 'pointName':
      return { tab: 'axes', setting: 'point-names' }
    case 'yAxis':
      // The names beside the rows of a heat map come from the table; survival is always drawn from 0 to 100 %.
      return kind === 'heatmap' ? { tab: 'data', setting: 'table' } : { tab: 'axes', setting: survival ? 'y-title' : 'y-range' }
    case 'xAxis':
      return { tab: 'axes', setting: kind === 'scatter' ? 'x-range' : 'x-title' }
    case 'yTitle':
      return { tab: 'axes', setting: 'y-title' }
    case 'xTitle':
      return { tab: 'axes', setting: 'x-title' }
    case 'title':
      return { tab: chartTabs(kind).includes('axes') ? 'axes' : 'look', setting: 'title' }
    case 'facet':
      return { tab: 'look', setting: 'facets' }
  }
}

// The heading last opened, so the next chart that is selected opens on it too. It is kept for as
// long as the page is open and not stored: after a reload a chart opens on its numbers.
let last: ChartTab = 'data'

export function lastChartTab(): ChartTab {
  return last
}

export function rememberChartTab(tab: ChartTab): void {
  if (ALL.includes(tab)) last = tab
}
