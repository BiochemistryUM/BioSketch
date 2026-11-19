// The instruction box: a change described in words becomes a change of the chart's settings,
// and what is not understood is said, never guessed.

import { describe, expect, it } from 'vitest'
import { validateDoc } from '../src/io/files'
import { chartLayout } from '../src/model/chart'
import { INSTRUCTION_EXAMPLES, applyInstruction } from '../src/model/chartCommands'
import { emptyDoc } from '../src/model/doc'
import type { ChartNode, FigDoc } from '../src/model/types'

const bar: ChartNode = {
  id: 'c', type: 'chart', x: 0, y: 0, w: 400, h: 300, rotation: 0, kind: 'bar',
  groups: [{ name: 'Control', values: [4.1, 3.8, 4.6, 4.3] }, { name: 'Treated', values: [6.9, 7.4, 6.1, 7.8] }, { name: 'Rescue', values: [5, 4.7, 5.6, 5.2] }],
}
const two: ChartNode = { ...bar, groups: bar.groups.slice(0, 2) }
const scatter: ChartNode = { ...bar, kind: 'scatter', groups: [{ name: 'NS', values: [1, 2, 3], xs: [1, 2, 3] }, { name: 'Up', values: [3, 1, 2], xs: [1, 2, 3] }] }

/** What an instruction changed in the chart, and that nothing was left unclear. */
function did(node: ChartNode, text: string): Partial<ChartNode> {
  const r = applyInstruction(node, text)
  expect(r.unclear, `“${text}”`).toEqual([])
  expect(r.done.length, `“${text}”`).toBeGreaterThan(0)
  return Object.fromEntries(Object.entries(r.node).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify((node as unknown as Record<string, unknown>)[k])))
}
const unclear = (node: ChartNode, text: string): string => {
  const r = applyInstruction(node, text)
  return r.unclear.join(' ')
}

describe('kind of chart and what it shows', () => {
  it('changes the kind, the error bars and the dots', () => {
    expect(did(bar, 'box plot with all points')).toEqual({ kind: 'box', points: true })
    expect(did(bar, 'make it a violin plot please')).toEqual({ kind: 'violin' })
    expect(did(bar, 'Please show error bars as SEM')).toEqual({ error: 'sem' })
    expect(did(bar, 'error bars SD and show every value')).toEqual({ error: 'sd', points: true })
    expect(did({ ...bar, error: 'sd', points: true }, 'no error bars; hide the points')).toEqual({ error: undefined, points: undefined })
    expect(did(bar, 'standard error')).toEqual({ error: 'sem' })
  })

  it('reads the table the other way when the chart becomes a scatter chart, as the panel does', () => {
    const r = applyInstruction({ ...bar, test: { by: 'means' }, brackets: [{ from: 0, to: 1, label: '', auto: true }] }, 'scatter plot')
    expect(r.node.kind).toBe('scatter')
    expect(r.node.groups.map((g) => g.name)).toEqual(['Treated', 'Rescue'])
    expect(r.node.groups[0].xs).toEqual(bar.groups[0].values)
    expect(r.node.test).toBeUndefined()
    expect(r.node.brackets).toBeUndefined()
    expect(applyInstruction(scatter, 'volcano plot').done[0]).toMatch(/already a scatter chart/)
  })

  it('says what a kind of chart cannot have', () => {
    expect(unclear({ ...bar, kind: 'box' }, 'error bars SEM')).toMatch(/box plot has no error bars/)
    expect(unclear(bar, 'fit a regression line')).toMatch(/needs a scatter chart/)
    expect(unclear(bar, 'vertical line at 2')).toMatch(/only a scatter chart/)
    expect(unclear(scatter, 't test')).toMatch(/scatter chart has series of points/)
  })
})

describe('lines', () => {
  it('adds reference lines with their direction, style and label', () => {
    expect(did(scatter, 'upright dotted line at x = 2 labelled cut-off')).toEqual({ refLines: [{ axis: 'x', value: 2, label: 'cut-off', dash: 'dotted' }] })
    expect(did(scatter, 'vertical lines at x = -1 and 1')).toEqual({ refLines: [{ axis: 'x', value: -1 }, { axis: 'x', value: 1 }] })
    expect(did(scatter, 'horizontal dashed line at 1.3 labelled p = 0.05')).toEqual({ refLines: [{ axis: 'y', value: 1.3, label: 'p = 0.05' }] })
    expect(did(bar, 'line at 5')).toEqual({ refLines: [{ axis: 'y', value: 5 }] })
    expect(did(bar, 'threshold at 5,5 dotted')).toEqual({ refLines: [{ axis: 'y', value: 5.5, dash: 'dotted' }] })
    expect(did(bar, 'solid line at 2 called Detection Limit')).toEqual({ refLines: [{ axis: 'y', value: 2, label: 'Detection Limit', dash: 'solid' }] })
    expect(unclear(bar, 'add a line')).toMatch(/Say where the line goes/)
  })

  it('removes them, one or all', () => {
    const lined = { ...bar, refLines: [{ axis: 'y' as const, value: 2 }, { axis: 'y' as const, value: 5 }] }
    expect(did(lined, 'remove the line at 5')).toEqual({ refLines: [{ axis: 'y', value: 2 }] })
    expect(did(lined, 'remove the lines')).toEqual({ refLines: undefined })
  })

  it('fits and removes a regression line', () => {
    expect(did(scatter, 'fit a regression line')).toEqual({ fit: true })
    expect(did(scatter, 'add a trend line and log y axis')).toEqual({ fit: true, yLog: true })
    expect(did({ ...scatter, fit: true }, 'remove the regression line')).toEqual({ fit: undefined })
  })
})

describe('axes', () => {
  it('makes them logarithmic or linear', () => {
    expect(did(bar, 'log y axis')).toEqual({ yLog: true })
    expect(did(scatter, 'log scale on both axes')).toEqual({ xLog: true, yLog: true })
    expect(did(scatter, 'logarithmic x axis')).toEqual({ xLog: true })
    expect(did({ ...bar, yLog: true }, 'linear scale')).toEqual({ yLog: undefined })
  })

  it('sets and frees their range', () => {
    expect(did(bar, 'y axis from 0 to 10')).toEqual({ yMin: 0, yMax: 10 })
    expect(did(scatter, 'x axis from -4 to 4; y from 0 to 12')).toEqual({ xMin: -4, xMax: 4, yMin: 0, yMax: 12 })
    expect(did(bar, 'start the y axis at 2')).toEqual({ yMin: 2 })
    expect(did(bar, 'y max 100')).toEqual({ yMax: 100 })
    expect(did({ ...bar, yMin: 1, yMax: 5 }, 'reset the y axis range')).toEqual({ yMin: undefined, yMax: undefined })
    expect(unclear(bar, 'y axis from 10 to 2')).toMatch(/smaller to a larger/)
    expect(unclear(bar, 'x axis from 0 to 5')).toMatch(/Only a scatter chart/)
  })
})

describe('legend, text and titles', () => {
  it('places the legend', () => {
    expect(did(bar, 'legend at the top')).toEqual({ legend: 'top' })
    expect(did(scatter, 'put the legend inside top left')).toEqual({ legend: 'insideLeft' })
    expect(did(scatter, 'legend inside the plot')).toEqual({ legend: 'inside' })
    expect(did(scatter, 'hide the legend')).toEqual({ legend: 'none' })
    expect(did(scatter, 'legend below')).toEqual({ legend: 'bottom' })
    expect(did({ ...scatter, legend: 'top' }, 'legend on the right')).toEqual({ legend: undefined })
  })

  it('takes titles as they are written, whatever words they hold', () => {
    expect(did(bar, 'title: Cell viability and death')).toEqual({ title: 'Cell viability and death' })
    expect(did(bar, 'y label: Viable cells (%)')).toEqual({ yLabel: 'Viable cells (%)' })
    expect(did(bar, 'label the x axis Genotype')).toEqual({ xLabel: 'Genotype' })
    expect(did(bar, 'set the title to "Dose response, log scale"')).toEqual({ title: 'Dose response, log scale' })
    expect(did(bar, 'x axis title: Ca^{2+} (µM)')).toEqual({ xLabel: 'Ca^{2+} (µM)' })
    // A typographic minus stays in a title, and is read as a minus in a number.
    expect(did(bar, 'y label: −log_{10} *p*')).toEqual({ yLabel: '−log_{10} *p*' })
    expect(did(scatter, 'upright lines at x = −1 and −2').refLines!.map((l) => l.value)).toEqual([-1, -2])
    expect(did({ ...bar, title: 'Old' }, 'remove the title')).toEqual({ title: undefined })
    expect(did(bar, 'title: A\ny label: B')).toEqual({ title: 'A', yLabel: 'B' })
  })

  it('sets the size of the text', () => {
    expect(did(bar, 'text size 16')).toEqual({ fontSize: 16 })
    expect(did(bar, 'bigger text')).toEqual({ fontSize: 16 })
    expect(did(bar, 'font size 500')).toEqual({ fontSize: 60 })
  })
})

describe('points and colours', () => {
  it('changes shape, size and transparency for all groups or the one named', () => {
    expect(did(bar, 'squares for Treated').groups![1]).toEqual({ ...bar.groups[1], shape: 'square' })
    expect(did(scatter, 'triangles').groups!.map((g) => g.shape)).toEqual(['triangle', 'triangle'])
    expect(did(bar, 'bigger points')).toEqual({ pointSize: 1.5 })
    expect(did(bar, 'point size 150%')).toEqual({ pointSize: 1.5 })
    expect(did(bar, 'transparent points')).toEqual({ pointOpacity: 0.5 })
    expect(did(bar, 'points 80% transparent')).toEqual({ pointOpacity: 0.2 })
    expect(did(bar, 'Control points smaller and 60% transparent').groups![0]).toEqual({ ...bar.groups[0], pointSize: 0.67, pointOpacity: 0.4 })
    // A sentence goes on about the group it named.
    const ns = did(scatter, 'NS points 30% size, grey and 70% transparent').groups!
    expect(ns[0]).toEqual({ ...scatter.groups[0], pointSize: 0.3, color: '#9aa3ad', pointOpacity: 0.3 })
    expect(ns[1]).toEqual(scatter.groups[1])
    expect(did(bar, 'make the Rescue points diamonds and twice as big').groups![2]).toEqual({ ...bar.groups[2], shape: 'diamond', pointSize: 2 })
    // The next sentence starts afresh.
    expect(did(bar, 'make Treated red. bigger points')).toMatchObject({ pointSize: 1.5 })
  })

  it('colours a group, or all with a palette', () => {
    expect(did(bar, 'make Treated red').groups![1].color).toBe('#d9534f')
    expect(did(bar, 'Treated in blue, Control grey').groups!.map((g) => g.color)).toEqual(['#9aa3ad', '#4a90d9', undefined])
    expect(did(bar, 'colour Rescue #12ab9f').groups![2].color).toBe('#12ab9f')
    expect(did(bar, 'colour-blind friendly colours')).toEqual({ palette: 'okabe-ito' })
    expect(did(bar, 'use the viridis palette')).toEqual({ palette: 'viridis' })
    // A palette recolours every group, also those that had a colour of their own.
    const own = { ...bar, palette: 'viridis', groups: bar.groups.map((g) => ({ ...g, color: '#111111' })) }
    expect(did(own, 'default colours')).toEqual({ palette: undefined, groups: bar.groups })
  })
})

describe('tests', () => {
  it('chooses the test, the design and what brackets show', () => {
    expect(did(two, 'paired t test, show stars')).toEqual({ test: { by: 'means', paired: true, stars: true } })
    expect(did(two, 'Mann-Whitney')).toEqual({ test: { by: 'ranks' } })
    expect(did(bar, 'anova against control')).toEqual({ test: { by: 'means', versusFirst: true } })
    expect(did({ ...bar, test: { by: 'means', stars: true } }, 'no test')).toEqual({ test: { stars: true } })
    expect(did({ ...bar, test: { by: 'means', stars: true } }, 'show p values')).toEqual({ test: { by: 'means' } })
    // The test is named as it applies to the table.
    expect(applyInstruction(bar, 'Mann-Whitney').done[0]).toBe('The groups are compared with the Kruskal–Wallis test, as the table has 3 groups.')
    expect(applyInstruction(two, 't test').done[0]).toBe('The groups are compared with Welch’s t test.')
  })

  it('adds brackets that follow the test', () => {
    expect(did(bar, 'compare Control and Treated')).toEqual({ test: { by: 'means' }, brackets: [{ from: 0, to: 1, label: '', auto: true }] })
    // Tukey finds Control–Treated and Treated–Rescue different in these numbers.
    expect(did(bar, 'run the suggested test and add brackets')).toEqual({ test: { by: 'means' }, brackets: [{ from: 0, to: 1, label: '', auto: true }, { from: 1, to: 2, label: '', auto: true }] })
    expect(unclear(bar, 'compare Control and Placebo')).toMatch(/name both/)
  })
})

describe('what is not understood', () => {
  it('is said, and changes nothing', () => {
    for (const text of ['make it pop', 'rotate the labels 45 degrees', 'dots', 'xyzzy']) {
      const r = applyInstruction(bar, text)
      expect(r.node).toEqual(bar)
      expect(r.done).toEqual([])
      expect(r.unclear).toEqual([`Not understood: “${text}”.`])
    }
    expect(unclear(bar, '')).toMatch(/Write what to change/)
    expect(unclear(bar, '   \n ; ')).toMatch(/Write what to change/)
  })

  it('does not stop the rest of an instruction from being done', () => {
    const r = applyInstruction(bar, 'log y axis and make it sparkle; legend at the top')
    expect(r.node.yLog).toBe(true)
    expect(r.node.legend).toBe('top')
    expect(r.unclear).toEqual(['Not understood: “make it sparkle”.'])
    // Words left over in a clause that was partly understood are named.
    expect(unclear(bar, 'log y axis diagonally')).toBe('Not understood in “log y axis diagonally”: “diagonally”.')
  })

  it('never takes the chart apart: whatever is typed, the result is a chart that can be saved and drawn', () => {
    const texts = [...INSTRUCTION_EXAMPLES, 'line at 1e999', 'point size -5', 'text size 0', 'y axis from 1e400 to 2', 'title: ' + 'x'.repeat(500), 'line at 1 labelled ' + 'y'.repeat(200), '<script>alert(1)</script>', 'lines at ' + Array.from({ length: 40 }, (_, i) => i).join(' and ')]
    for (const start of [bar, scatter]) {
      for (const text of texts) {
        const node = applyInstruction(start, text).node
        const saved = validateDoc(JSON.parse(JSON.stringify({ ...emptyDoc(), nodes: [node] } as FigDoc))).nodes[0] as ChartNode
        expect(JSON.parse(JSON.stringify(saved)), `“${text.slice(0, 40)}”`).toEqual(JSON.parse(JSON.stringify(node)))
        expect(() => chartLayout(node)).not.toThrow()
      }
    }
  })

  it('every example under the box does something', () => {
    for (const example of INSTRUCTION_EXAMPLES) {
      const start = /x =|regression/.test(example) ? scatter : bar
      const r = applyInstruction(start, example)
      expect(r.done.length, example).toBeGreaterThan(0)
      expect(r.unclear, example).toEqual([])
    }
  })
})
