// Plots of an entry. A plot is a chart of BioSketch made from a pasted table: the same reading of
// the table, the same suggestions and the same drawing as in the figure editor, so that a plot in
// the notebook and the same numbers in a figure look alike.

import { suggestCharts, type ChartSuggestion } from '../model/suggest'
import type { ChartNode } from '../model/types'
import { PLOT_H, PLOT_W, readChart, type Plot } from './model'

/** The charts that fit a pasted table, best first; none when the text is no table of numbers. */
export const plotChoices = (table: string): ChartSuggestion[] => (table.trim() ? suggestCharts(table, 4) : [])

/** The plot of a suggestion, or null when the chart it describes would not survive being saved. */
export function plotFrom(suggestion: ChartSuggestion, title = ''): Plot | null {
  const node: ChartNode = { id: 'plot', type: 'chart', x: 0, y: 0, w: PLOT_W, h: PLOT_H, rotation: 0, ...suggestion.chart }
  const chart = readChart(node)
  return chart ? { title: title.trim() || suggestion.name, chart } : null
}
