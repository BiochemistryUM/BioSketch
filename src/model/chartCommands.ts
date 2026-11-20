// The instruction box of a chart: the scientist describes a change in words ("upright dotted
// line at x = 2", "fit a regression line", "legend at the top") and the chart's settings change.
//
// This is a plain reader of phrases, not an AI: it runs in the browser, costs nothing, works
// offline and always does the same thing for the same words. It knows the settings of the chart
// panel and nothing else. What it does not understand it says, word for word; it never guesses.
//
// How a sentence is read: the text is cut into clauses (lines, semicolons, full stops, "and").
// Every reader below looks for its phrase in a clause, makes its change and takes its words out;
// words left over that are not small talk ("please", "the", "make") are reported back.

import { chartFamily, TWO_FACTOR_ONLY, CHART_FONT, MAX_POINT_LABELS, MAX_REF_LINES, POINT_NAMES_TOP, POINT_OPACITY_MIN, POINT_SIZE_MAX, POINT_SIZE_MIN, VALUE_DECIMALS_MAX, chartAdvice, chartSamples, chartSeries, crossTable, hasPoints, isGrouped, pointNamesIn, pointStyle, usable, usablePointNames, usableValueLabels, usualValueLabel, withTestBrackets } from './chart'
import { TEST_NAMES, testFor } from './chartTests'
import { PALETTES } from './palettes'
import type { ChartGroup, ChartKind, ChartNode, ChartPointNames, ChartRefLine, ChartTest, ChartValueLabels, LegendPlace, PointShape } from './types'

export interface InstructionResult {
  node: ChartNode
  /** What was changed, one sentence each. */
  done: string[]
  /** What was not understood or could not be done, one sentence each. */
  unclear: string[]
}

/** Examples shown under the box: one of each kind of thing that can be asked for. */
export const INSTRUCTION_EXAMPLES = [
  'box plot with all points',
  'upright dotted line at x = 2 labelled cut-off',
  'line at 1.3',
  'fit a regression line',
  'log y axis',
  'y axis from 0 to 10',
  'error bars SEM',
  'legend at the top',
  'squares for Treated',
  'Control points smaller and 60% transparent',
  'make Treated red',
  'write the mean in each bar, in white',
  'show n above the bars',
  'colour-blind friendly colours',
  'title: Cell viability',
  'y label: Viable cells (%)',
  'paired t test, show stars',
  'compare Control and Treated',
  'text size 16',
]

const NUM = '[-+]?(?:\\d+(?:[.,]\\d+)?|[.,]\\d+)(?:e[-+]?\\d+)?'
const toNumber = (s: string): number => Number(s.replace(',', '.'))
const KIND_NAMES: Record<ChartKind, string> = { bar: 'bar chart', dot: 'dot chart', line: 'line chart', box: 'box plot', violin: 'violin plot', scatter: 'scatter chart', pie: 'pie chart', heatmap: 'heat map', venn: 'Venn diagram', standard: 'standard curve', qpcr: 'qPCR fold change' }
const COLOURS: Record<string, string> = {
  red: '#d9534f', blue: '#4a90d9', green: '#5cb85c', orange: '#f0a04b', yellow: '#f3c95e', purple: '#8e6bbf', violet: '#8e6bbf', pink: '#e58ab5',
  grey: '#9aa3ad', gray: '#9aa3ad', black: '#2b2f36', teal: '#3aa6a0', turquoise: '#3aa6a0', brown: '#9c6b4e', white: '#ffffff', magenta: '#cc3fa4', cyan: '#43b7d6',
}
const LEGEND_WORDS: Record<LegendPlace | 'right', string> = { right: 'at the right of the plot', top: 'above the plot', bottom: 'below the plot', inside: 'inside the plot, top right', insideLeft: 'inside the plot, top left', none: 'hidden' }
/** Words that carry no instruction of their own. */
const SMALL_TALK = new Set(
  'run the a an to it its this that these those chart plot graph figure make show set add draw use put change switch turn into in as with of for me my i want would like can you could please be is are on at should have has give also and then all every each them need we our data now just so there by do apply display plus both point points dot dots marker markers value values group groups series them their colour color colours colors line lines axis axes scale test tests size bar bars one new some any out up'.split(' '),
)

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const without = <T extends object, K extends keyof T>(o: T, ...keys: K[]): T => {
  const copy = { ...o }
  for (const k of keys) delete copy[k]
  return copy
}

/** One clause being read: what is left of its words, and the chart as changed so far. */
interface Reading {
  node: ChartNode
  /** The clause in lower case; words that were understood are replaced by a bar (¦). */
  rest: string
  done: string[]
  unclear: string[]
  /** The group the sentence was last speaking of. */
  carried?: string
  /** The sentence was last speaking of the numbers written at the groups. */
  labels?: boolean
}

/** Find `pattern` in what is left of the clause, take its words out, and return the match. */
function take(r: Reading, pattern: RegExp): RegExpMatchArray | null {
  const m = r.rest.match(pattern)
  if (!m || m.index === undefined) return null
  r.rest = `${r.rest.slice(0, m.index)} ¦ ${r.rest.slice(m.index + m[0].length)}`
  return m
}
const has = (r: Reading, pattern: RegExp): boolean => pattern.test(r.rest)
const NEGATION = /\b(?:remove|delete|no|not|without|hide|drop|off|don't|do not|stop)\b/

/** Which axis a clause speaks of, if any. */
function axisIn(text: string): 'x' | 'y' | null {
  if (/\bx\b|x[- ]axis|horizontal axis|bottom axis/.test(text)) return 'x'
  if (/\by\b|y[- ]axis|value axis|vertical axis/.test(text)) return 'y'
  return null
}

/** The series (or group) of the chart a clause names: the longest name found in it. Its words are taken out. */
function seriesIn(r: Reading): ReturnType<typeof chartSeries>[number] | null {
  const found = chartSeries(r.node)
    .filter((s) => s.name.trim() && new RegExp(`(^|[^\\p{L}\\p{N}])${escape(s.name.toLowerCase())}($|[^\\p{L}\\p{N}])`, 'u').test(r.rest))
    .sort((a, b) => b.name.length - a.name.length)[0]
  if (!found) return null
  r.rest = r.rest.replace(found.name.toLowerCase(), ' ¦ ')
  return found
}

/** Change the groups of one series, or of all when none is named. */
function onGroups(node: ChartNode, target: { groups: number[] } | null, change: (g: ChartGroup) => ChartGroup): ChartGroup[] {
  return node.groups.map((g, k) => (!target || target.groups.includes(k) ? change(g) : g))
}

const strip = (text: string): string => text.trim().replace(/^["“'‘]+|["”'’]+$/g, '').trim()

/** Titles are taken whole, in the scientist's own spelling: they may hold any words. Returns true when the clause was one. */
function readTitle(r: Reading, raw: string): boolean {
  const clear = /^(?:please\s+)?(?:remove|delete|no|clear|hide)\s+(?:the\s+)?(?:(x|y|value)[- ]?(?:axis\s+)?)?(?:chart\s+|main\s+)?(?:title|label)(?:\s+of\s+the\s+(x|y|value)\s+axis)?$/i.exec(raw)
  if (clear) {
    const axis = (clear[1] ?? clear[2] ?? '').toLowerCase()
    r.node = { ...r.node, ...(axis === 'x' ? { xLabel: undefined } : axis ? { yLabel: undefined } : { title: undefined }) }
    r.done.push(`Removed the title${axis ? ` of the ${axis === 'x' ? 'x' : axis === 'y' && r.node.kind === 'scatter' ? 'y' : 'value'} axis` : ''}.`)
    return true
  }
  const start = '(?:please\\s+)?(?:(?:set|make|change|call|name|write)\\s+)?(?:the\\s+)?'
  const sep = '\\s*(?:to|is|as|:|=|-)?\\s+'
  const axisFirst = new RegExp(`^${start}(x|y|value)[- ]?(?:axis)?[- ]?\\s*(?:title|label|name)${sep}(.+)$`, 'i').exec(raw) ?? new RegExp(`^${start}(?:title|label|name)\\s+(?:of\\s+|for\\s+)?(?:the\\s+)?(x|y|value)[- ]?(?:axis)?${sep}(.+)$`, 'i').exec(raw) ?? /^(?:please\s+)?label\s+(?:the\s+)?(x|y|value)[- ]?(?:axis)?\s*(?:as|with|:|=)?\s+(.+)$/i.exec(raw)
  if (axisFirst) {
    const text = strip(axisFirst[2]).slice(0, 120)
    const x = axisFirst[1].toLowerCase() === 'x'
    r.node = { ...r.node, ...(x ? { xLabel: text || undefined } : { yLabel: text || undefined }) }
    r.done.push(`The title of the ${x ? 'x' : r.node.kind === 'scatter' ? 'y' : 'value'} axis is “${text}”.`)
    return true
  }
  const main = new RegExp(`^${start}(?:chart\\s+|main\\s+|plot\\s+)?title(?:\\s+of\\s+the\\s+(?:chart|plot))?${sep}(.+)$`, 'i').exec(raw)
  if (main) {
    const text = strip(main[1]).slice(0, 120)
    r.node = { ...r.node, title: text || undefined }
    r.done.push(`The title is “${text}”.`)
    return true
  }
  return false
}

const setTest = (node: ChartNode, change: Partial<ChartTest>): ChartNode => {
  const next = { ...(node.test ?? {}), ...change }
  const kept: ChartTest = { ...(next.by ? { by: next.by } : {}), ...(next.paired ? { paired: true } : {}), ...(next.versusFirst ? { versusFirst: true } : {}), ...(next.across ? { across: true } : {}), ...(next.stars ? { stars: true } : {}) }
  return { ...node, test: Object.keys(kept).length ? kept : undefined }
}

/** The name of the test the chart now runs, as it stands inside a sentence. */
function testName(node: ChartNode): string {
  if (!node.test?.by) return 'no test'
  if (isGrouped(node)) return 'a two-way analysis of variance (ANOVA), as the table has categories and series'
  const k = chartSamples(node).samples.length
  const name = TEST_NAMES[testFor(k, node.test.by, !!node.test.paired)]
  // Tests named after people keep their capital.
  return `${/^(?:One|Paired|Repeated)/.test(name) ? `a ${name[0].toLowerCase()}${name.slice(1)}` : name.includes('’s') ? name : `the ${name}`}${k > 2 ? `, as the table has ${k} groups` : ''}`
}

function readTest(r: Reading) {
  const scatter = r.node.kind === 'scatter'
  const refuse = (what: string) => r.unclear.push(`${what} needs groups to compare; a scatter chart has series of points instead.`)
  const possible = !scatter
  // Categories and series: two factors, for which there is the two-way analysis of variance only.
  const two = !scatter && isGrouped(r.node)

  // "compare A and B": a bracket between the two, following the test.
  const compare = has(r, /\b(?:compare|brackets?|comparison)\b/)
  if (compare) {
    take(r, /\b(?:compare|comparison|(?:significance\s+)?brackets?)\b(?:\s+(?:between|of|for))?/)
    const [a, b] = [seriesIn(r), seriesIn(r)]
    take(r, /\b(?:and|with|to|vs\.?|versus|against)\b/)
    if (!possible) refuse('A test')
    else if (a && b && a !== b) {
      if (!r.node.test?.by) r.node = setTest(r.node, { by: chartAdvice(r.node).by ?? 'means' })
      const [from, to] = [a.groups[0], b.groups[0]]
      const brackets = r.node.brackets ?? []
      if (!brackets.some((x) => (x.from === from && x.to === to) || (x.from === to && x.to === from))) r.node = { ...r.node, brackets: [...brackets, { from, to, label: '', auto: true }] }
      r.done.push(`${a.name} and ${b.name} are compared with a bracket that shows the result of the test (${testName(r.node)}).`)
    } else if (a || b) r.unclear.push('To compare two groups, name both as they are written in the table.')
    else {
      // No names: brackets wherever the test finds a difference.
      if (!r.node.test?.by) r.node = setTest(r.node, { by: chartAdvice(r.node).by ?? 'means' })
      const out = withTestBrackets(r.node)
      r.node = { ...r.node, brackets: out.brackets.length ? out.brackets : undefined }
      r.done.push(out.added ? `Added ${out.added === 1 ? 'a bracket' : `${out.added} brackets`} from the test (${testName(r.node)}).` : out.different ? 'The chart already has the brackets of the test.' : `No pair of groups has p below 0.05 (${testName(r.node)}), so no bracket was added.`)
    }
  }

  const off = take(r, /\b(?:no|remove|delete|without|stop|hide)\s+(?:the\s+)?(?:statistical\s+)?(?:tests?|statistics|stats)\b/)
  if (off) {
    r.node = setTest(r.node, { by: undefined })
    r.done.push('No test is run.')
  }
  const unpaired = take(r, /\b(?:un-?paired|not paired|independent|separate samples?)\b/)
  const paired = !unpaired && take(r, /\b(?:paired|matched|repeated[- ]measures?|same (?:samples?|animals?|patients?|subjects?))\b/)
  const ranks = take(r, /\b(?:mann[- –]?whitney|wilcoxon(?:\s+(?:signed[- ]rank|rank[- ]sum))?|kruskal(?:[- –]?wallis)?|friedman|non-?parametric|rank(?:s|[- ]based)?(?:\s+tests?)?|u[- ]test)\b/)
  const means = !ranks && take(r, /\b(?:welch(?:'s)?\s+)?(?:(?:student(?:'s)?\s+)?t[- ]?tests?|(?:(?:one|two)[- ]way\s+)?(?:anova|analysis of variance)|tukey|parametric(?:\s+tests?)?|compare (?:the )?means)\b/)
  const suggested = !ranks && !means && take(r, /\b(?:(?:suggested|recommended|best|right|appropriate|fitting)\s+tests?|(?:run|do|add|use|show)\s+(?:a\s+|the\s+)?(?:statistical\s+)?tests?|test (?:the )?(?:groups|difference|significance)|statistics|significance(?:\s+tests?)?)\b/)
  if (unpaired || paired || ranks || means || suggested) {
    if (!possible) refuse('A test')
    else if (two && (ranks || paired)) r.unclear.push(TWO_FACTOR_ONLY)
    else if (two) {
      r.node = setTest(r.node, { by: chartAdvice(r.node).by ?? undefined, paired: false })
      r.done.push(r.node.test?.by ? `The categories and the series are compared with ${testName(r.node)}.` : (chartAdvice(r.node).why[0] ?? 'No test can be suggested for this table yet.'))
    } else {
      if (unpaired || paired) r.node = setTest(r.node, { paired: !!paired })
      if (ranks || means) r.node = setTest(r.node, { by: ranks ? 'ranks' : 'means' })
      else if (suggested || !r.node.test?.by) r.node = setTest(r.node, { by: chartAdvice(r.node).by ?? undefined })
      r.done.push(r.node.test?.by ? `The groups are compared with ${testName(r.node)}${paired ? '; each row is taken as one sample' : ''}.` : 'No test can be suggested for this table yet.')
    }
  }
  const first = take(r, /\b(?:(?:each|every|all)\s+(?:group\s+)?)?(?:against|versus|vs\.?|with|to)\s+(?:the\s+)?(?:control|first(?:\s+group)?)\b/)
  const every = !first && take(r, /\b(?:all|every)\s+pairs?\b|\bpairwise\b/)
  const within = two && take(r, /\b(?:compare\s+)?(?:the\s+)?(categories|series)\s+(?:with)?in\s+(?:each|every)\s+(?:series|category)\b/)
  if (within) {
    r.node = setTest(r.node, { across: within[1] === 'categories' })
    r.done.push(within[1] === 'categories' ? 'Pairs: the categories are compared within each series.' : 'Pairs: the series are compared within each category.')
  }
  if ((first || every) && possible && !two) {
    r.node = setTest(r.node, { versusFirst: !!first })
    r.done.push(first ? 'Each group is compared with the first.' : 'Every pair of groups is compared.')
  }
  const stars = take(r, /\b(?:stars?|asterisks?)\b/)
  const pValues = !stars && take(r, /\bp[- ]?values?\b/)
  if ((stars || pValues) && possible) {
    r.node = setTest(r.node, { stars: !!stars && !NEGATION.test(r.rest) })
    take(r, NEGATION)
    r.done.push(r.node.test?.stars ? 'Brackets show stars.' : 'Brackets show p values.')
  }
}

function readPalette(r: Reading) {
  if (!has(r, /colou?r[- ]?blind|okabe|\btol\b|viridis|gr[ae]y ?scale|\bgr[ae]ys\b|monochrome|tableau|matplotlib|tab10|\bset ?[12]\b|dark ?2|biosketch|(?:default|usual|standard|original) (?:colou?rs|palette)|palette/)) return
  const picks: [RegExp, string][] = [
    [/colou?r[- ]?blind(?:[- ](?:friendly|safe))?|okabe(?:[- –]?ito)?/, 'okabe-ito'],
    [/\btol(?:'s)?(?: bright)?\b/, 'tol-bright'],
    [/viridis/, 'viridis'],
    [/gr[ae]y ?scale|\bgr[ae]ys\b|monochrome/, 'greys'],
    [/tableau(?: ?10)?/, 'tableau'],
    [/matplotlib|tab10/, 'matplotlib'],
    [/\bset ?1\b/, 'set1'],
    [/\bset ?2\b/, 'set2'],
    [/dark ?2/, 'dark2'],
    [/biosketch|(?:default|usual|standard|original) (?:colou?rs|palette)/, 'biosketch'],
  ]
  for (const [pattern, id] of picks) {
    if (!take(r, pattern)) continue
    take(r, /\b(?:colou?rs?|palette|scheme|friendly|safe)\b/)
    take(r, /\b(?:colou?rs?|palette|scheme)\b/)
    const palette = PALETTES.find((p) => p.id === id)!
    // A palette chosen in words recolours every group, as it does in the panel.
    r.node = { ...r.node, palette: id === 'biosketch' ? undefined : id, groups: r.node.groups.map((g) => without(g, 'color')) }
    r.done.push(`The groups are coloured with the ${palette.name} palette${palette.safe ? ' (colour-blind friendly)' : ''}.`)
    return
  }
}

function readErrorBars(r: Reading) {
  const m = take(r, /\b(?:(?:no|remove|hide|without|delete)\s+(?:the\s+)?)?(?:(?:s\.?e\.?m\.?|s\.?d\.?|standard (?:error|deviation)(?: of the mean)?)\s+)?error ?bars?(?:\s+(?:as|of|with|showing|show|:|=))?(?:\s+(?:the\s+)?(?:s\.?e\.?m\.?|s\.?d\.?|standard (?:error|deviation)(?: of the mean)?|none|off))?|\b(?:s\.?e\.?m\.?|standard error(?: of the mean)?|standard deviation)\b/)
  if (!m) return
  if (!['bar', 'dot', 'line'].includes(r.node.kind)) {
    r.unclear.push(`A ${KIND_NAMES[r.node.kind]} has no error bars.`)
    return
  }
  const text = m[0]
  const error = /\b(?:no|remove|hide|without|delete|none|off)\b/.test(text) ? undefined : /s\.?e\.?m|standard error/.test(text) ? 'sem' : 'sd'
  r.node = { ...r.node, error }
  r.done.push(error ? `Error bars show the ${error === 'sem' ? 'standard error of the mean' : 'standard deviation'}.` : 'Error bars are hidden.')
}

function readStack(r: Reading) {
  // "100 % stacked", "stacked to 100 %", "as shares of the total": stacked, and scaled to 100 %.
  const whole = take(r, /\b(?:(?:not|no)\s+)?(?:(?:scaled?\s+)?(?:to\s+)?100\s*%|(?:in|as|to)\s+per ?cent(?:ages?)?|per ?cent(?:age)?\s+stack(?:ed)?|(?:as\s+)?(?:shares?|fractions?|proportions?)\s+of\s+(?:the\s+)?(?:total|whole))/)
  if (whole && r.node.kind !== 'scatter') {
    const off = /\b(?:not|no)\b/.test(whole[0])
    take(r, /\bstack(?:ed|ing|s)?(?:\s+(?:the\s+)?(?:bars?|columns?)(?:[- ](?:charts?|plots?|graphs?))?)?|\b(?:bars?|columns?)\b/)
    if (off) {
      r.node = without(r.node, 'percent')
      r.done.push('The bars show the means as they are, not shares of 100 %.')
    } else if (!isGrouped(r.node)) r.unclear.push('Bars scaled to 100 % need a table with categories and series: two rows of names at the top, the category above and the series below.')
    else {
      r.node = { ...r.node, kind: 'bar', stacked: true, percent: true }
      r.done.push('The bars of each category are stacked and scaled to 100 %: each part is its share of the total.')
    }
    return
  }
  const m = take(r, /\b(?:(?:do not|don't|no|not|without|remove|stop)\s+)?(?:un-?)?stack(?:ed|ing|s)?(?:\s+(?:the\s+)?(?:bars?|columns?)(?:[- ](?:charts?|plots?|graphs?))?)?(?:\s+(?:up|on top of each other))?|\b(?:(?:bars?|columns?)\s+)?(?:side[- ]by[- ]side|next to each other)\b/)
  if (!m) return
  if (r.node.kind === 'scatter') {
    r.unclear.push('Bars can be stacked in a bar chart, not in a scatter chart.')
    return
  }
  const stacked = !/\b(?:do not|don't|no|not|without|remove|stop)\b|\bun-?stack|side[- ]by[- ]side|next to each other/.test(m[0])
  if (!stacked) {
    r.node = without(r.node, 'stacked', 'percent')
    r.done.push('The bars of a category stand side by side.')
    return
  }
  if (!isGrouped(r.node)) {
    r.unclear.push('Stacking needs a table with categories and series: two rows of names at the top, the category above and the series below.')
    return
  }
  const wasBars = r.node.kind === 'bar'
  r.node = { ...r.node, kind: 'bar', stacked: true }
  r.done.push(`${wasBars ? 'The' : 'The chart is now a bar chart; the'} bars of each category are stacked${r.node.yLog ? ' (on a logarithmic axis they still stand side by side)' : ''}.`)
}

/** Words that ask for a dose-response curve. */
const DOSE_CURVE = /(?:\b(?:remove|delete|no|without|hide|drop)\s+)?(?:\b(?:the|a|an)\s+)?(?:\b(?:fit(?:ted)?|draw)\s+)?(?:\b(?:the|a|an)\s+)?(?:\bdose[- ]?response(?:\s+(?:curve|fit|line))?|\b(?:4|four)[- ]?(?:pl\b|parameter(?:s)?(?:\s+logistic)?(?:\s+(?:curve|fit))?)|\bsigmoid(?:al)?(?:\s+(?:curve|fit|line))?|\blogistic(?:\s+(?:curve|fit))|\bhill(?:\s+(?:curve|equation|fit|slope))?|\b[ei]c[- ]?50\b(?:\s+(?:curve|fit))?)/

/** "bottom at 0", "hold the top at 100", "fit the bottom": a plateau of the dose-response curve held at a value, or set free. */
function readPlateaus(r: Reading): boolean {
  let any = false
  for (const which of ['bottom', 'top'] as const) {
    const words = which === 'bottom' ? '(?:bottom|lower plateau|baseline|minimum)' : '(?:top|upper plateau|maximum)'
    const freed = take(r, new RegExp(`\\b(?:free|fit(?:ted)?|release|unconstrain(?:ed)?|do not (?:fix|hold)|don't (?:fix|hold))\\s+(?:the\\s+)?${words}\\b|\\b${words}\\s+(?:free|fitted|not (?:fixed|held))\\b`))
    const held = freed ? null : take(r, new RegExp(`\\b(?:(?:fix(?:ed)?|hold|held|constrain(?:ed)?|set|keep)\\s+)?(?:the\\s+)?${words}\\s*(?:(?:fixed|held|constrained|set)\\s+)?(?:at|to|=|:)\\s*(${NUM})\\s*%?`))
    if (!freed && !held) continue
    any = true
    if (r.node.kind !== 'scatter') {
      r.unclear.push('A plateau can be held for a dose-response curve, which needs a scatter chart.')
      continue
    }
    const key = which === 'bottom' ? 'doseBottom' : 'doseTop'
    if (freed) {
      r.node = without(r.node, key)
      r.done.push(`The ${which} of the dose-response curve is fitted again.`)
    } else {
      const value = toNumber(held![1])
      r.node = { ...r.node, fit: true, curve: 'dose', [key]: value }
      r.done.push(`The ${which} of the dose-response curve is held at ${value}.`)
    }
  }
  return any
}

function readDoseCurve(r: Reading): boolean {
  const plateaus = readPlateaus(r)
  const m = take(r, DOSE_CURVE)
  if (!m) return plateaus
  // "fit a dose-response curve": the word "fit" belongs to this request, not to a straight line.
  take(r, /\b(?:fit(?:ted)?|curve)\b/)
  if (r.node.kind !== 'scatter') {
    r.unclear.push('A dose-response curve needs a scatter chart, with the doses in the first column of the table.')
    return true
  }
  if (/\b(?:remove|delete|no|without|hide|drop)\b/.test(m[0])) {
    r.node = without(r.node, 'fit', 'curve', 'doseBottom', 'doseTop')
    r.done.push('The fitted curve is removed.')
    return true
  }
  // Already said by a plateau that was held in the same sentence.
  if (!(plateaus && r.node.curve === 'dose')) r.done.push('A dose-response curve (four-parameter logistic) is fitted to each series; its EC50 is listed under the table.')
  r.node = { ...r.node, fit: true, curve: 'dose' }
  return true
}

function readCorrelation(r: Reading) {
  const m = take(r, /(?:\b(?:remove|delete|no|without|hide|drop)\s+)?(?:\b(?:the|a)\s+)?(?:\b(?:pearson|spearman)(?:'s)?(?:\s+(?:rank\s+)?(?:correlation|r|rho))?|\b(?:rank\s+)?correlation(?:\s+coefficient)?(?:\s+\(?(?:pearson|spearman)\)?)?|\br[- ]value)\b/)
  if (!m) return
  if (r.node.kind !== 'scatter') {
    r.unclear.push('A correlation needs a scatter chart, with x values in the first column of the table.')
    return
  }
  if (/\b(?:remove|delete|no|without|hide|drop)\b/.test(m[0])) {
    r.node = without(r.node, 'corr')
    r.done.push('The correlation is no longer written on the chart.')
    return
  }
  const corr = /spearman|rank/.test(m[0]) ? 'spearman' : 'pearson'
  r.node = { ...r.node, corr }
  r.done.push(corr === 'spearman' ? 'Spearman’s rank correlation of each series is written on the chart, with its p value.' : 'Pearson’s correlation of each series is written on the chart, with its p value.')
}

function readFit(r: Reading) {
  if (readDoseCurve(r)) return
  const m = take(r, /(?:\b(?:remove|delete|no|without|hide|drop)\s+)?(?:\b(?:the|a)\s+)?(?:\b(?:linear|fitted|straight)\s+)*\b(?:regression|trend ?line|best[- ]fit|line of best fit|fit(?:ted)?)\b(?:\s+(?:a|the))?(?:\s+(?:straight|linear|regression|fitted))*(?:\s+line)?/)
  if (!m) return
  if (r.node.kind !== 'scatter') {
    r.unclear.push('A fitted line needs a scatter chart, with x values in the first column of the table.')
    return
  }
  const fit = !/\b(?:remove|delete|no|without|hide|drop)\b/.test(m[0])
  r.node = fit ? { ...without(r.node, 'curve', 'doseBottom', 'doseTop'), fit: true } : without(r.node, 'fit', 'curve', 'doseBottom', 'doseTop')
  r.done.push(fit ? 'A straight line is fitted to each series (least squares).' : 'The fitted line is removed.')
}

function readLegend(r: Reading) {
  if (!has(r, /\blegend\b|\bkey\b/)) return
  const m = take(r, /(?:\b(?:no|hide|remove|without|delete|show)\s+(?:the\s+)?)?\b(?:legend|key)\b(?:\s+(?:at|on|to|in|is|goes|should be|placed|position(?:ed)?)?\s*(?:the\s+)?(?:(?:top|upper)[- ](?:left|right)(?:\s+corner)?|inside(?:\s+(?:the\s+)?(?:plot|chart))?(?:,?\s*(?:top\s+)?(?:left|right))?|in the plot|top|above(?:\s+the\s+plot)?|bottom|below(?:\s+the\s+plot)?|under(?:neath)?|right|left|hidden|off|none))?/)
  if (!m) return
  const t = m[0]
  const place: LegendPlace | 'right' = /\b(?:no|hide|remove|without|delete|hidden|off|none)\b/.test(t)
    ? 'none'
    : /inside|in the plot|(?:top|upper)[- ](?:left|right)|\bleft\b/.test(t)
      ? /left/.test(t)
        ? 'insideLeft'
        : 'inside'
      : /top|above/.test(t)
        ? 'top'
        : /bottom|below|under/.test(t)
          ? 'bottom'
          : 'right'
  r.node = { ...r.node, legend: place === 'right' ? undefined : place }
  r.done.push(`The legend is ${LEGEND_WORDS[place]}.`)
}

function readScale(r: Reading) {
  const log = take(r, new RegExp(`(?:\\b(?:no|remove|not|without)\\s+)?\\blog(?:arithmic|10|2)?\\b(?:[- ]scale)?(?:\\s+(?:on|for|of)\\s+(?:the\\s+)?)?`))
  const linear = !log && take(r, /\blinear\b(?:[- ]scale)?/)
  if (!log && !linear) return
  const on = !!log && !/\b(?:no|remove|not|without)\b/.test(log[0])
  const both = !!take(r, /\bboth(?:\s+ax[ie]s)?\b/)
  const axis = axisIn(r.rest)
  take(r, /\b(?:x|y|value|vertical|horizontal|bottom)(?:[- ]axis)?\b/)
  take(r, /\bax[ie]s\b|\bscale\b/)
  const scatter = r.node.kind === 'scatter'
  if ((axis === 'x' || both) && !scatter) r.unclear.push('Only a scatter chart has an x axis with numbers; the value axis was changed.')
  const change: Partial<ChartNode> = {}
  if (both && scatter) Object.assign(change, { xLog: on || undefined, yLog: on || undefined })
  else if (axis === 'x' && scatter) change.xLog = on || undefined
  else change.yLog = on || undefined
  r.node = { ...r.node, ...change }
  r.done.push(`The ${both && scatter ? 'x and y axes are' : `${'xLog' in change ? 'x' : scatter ? 'y' : 'value'} axis is`} ${on ? 'logarithmic' : 'linear'}.`)
}

function readRange(r: Reading) {
  const axis = axisIn(r.rest)
  const scatter = r.node.kind === 'scatter'
  const which = axis === 'x' && scatter ? 'x' : 'y'
  const name = which === 'x' ? 'x' : scatter ? 'y' : 'value'
  const set = (min: number | undefined | null, max: number | undefined | null) => {
    // null leaves an end as it is.
    const change = which === 'x' ? { ...(min !== null ? { xMin: min } : {}), ...(max !== null ? { xMax: max } : {}) } : { ...(min !== null ? { yMin: min } : {}), ...(max !== null ? { yMax: max } : {}) }
    r.node = { ...r.node, ...change }
  }
  const consumeAxis = () => {
    take(r, /\b(?:x|y|value|vertical|horizontal)(?:[- ]axis)?\b/)
    take(r, /\b(?:axis|range|limits?|scale)\b/)
  }
  if (axis === 'x' && !scatter && has(r, /\b(?:from|range|between|limits?|min|max|start|end)\b/)) {
    r.unclear.push('Only a scatter chart has an x axis with numbers.')
    return
  }
  const auto = take(r, /\b(?:auto(?:matic)?|reset|default)\b(?:\s+(?:the\s+)?(?:x|y|value)?[- ]?(?:axis\s+)?(?:range|limits?|scale|axis))?/)
  if (auto && (axis || has(r, /\b(?:range|limits?|axis)\b/) || /range|limit|axis|scale/.test(auto[0]))) {
    set(undefined, undefined)
    consumeAxis()
    r.done.push(`The range of the ${name} axis is chosen to fit the numbers.`)
    return
  }
  const range = take(r, new RegExp(`\\b(?:from|range|between|limits?|goes|go|runs?)\\b[^¦\\d+-]*(${NUM})\\s*(?:to|-|–|and|until|up to|\\.\\.)\\s*(${NUM})`))
  if (range) {
    const [a, b] = [toNumber(range[1]), toNumber(range[2])]
    if (!usable(a) || !usable(b) || !(b > a)) r.unclear.push('An axis runs from a smaller to a larger number.')
    else {
      set(a, b)
      r.done.push(`The ${name} axis runs from ${a} to ${b}.`)
    }
    consumeAxis()
    return
  }
  const max = take(r, new RegExp(`\\b(?:max(?:imum)?|ends?|up to|upper(?: limit| end)?|top)\\b[^¦\\d+-]*(${NUM})`))
  const min = take(r, new RegExp(`\\b(?:min(?:imum)?|starts?|begins?|lower(?: limit| end)?|bottom)\\b[^¦\\d+-]*(${NUM})`))
  if ((max || min) && (axis || has(r, /\baxis\b/))) {
    const [lo, hi] = [min ? toNumber(min[1]) : null, max ? toNumber(max[1]) : null]
    set(lo, hi)
    consumeAxis()
    r.done.push(`The ${name} axis ${[lo !== null ? `starts at ${lo}` : '', hi !== null ? `ends at ${hi}` : ''].filter(Boolean).join(' and ')}.`)
  } else if (max || min) r.unclear.push('Say which axis: for example “y axis from 0 to 10”.')
}

function readLines(r: Reading, label: string | undefined) {
  if (!has(r, /\b(?:lines?|thresholds?|cut-?offs?|limit|mark)\b/)) return
  const scatter = r.node.kind === 'scatter'
  const lines = r.node.refLines ?? []
  const m = take(r, /(?:\b(?:remove|delete|clear|no|without|hide)\s+(?:all\s+)?(?:the\s+)?)?(?:\b(?:vertical|upright|horizontal|dotted|dashed|solid|reference|threshold|guide|straight|thin)\s+)*\b(?:lines?|thresholds?|cut-?offs?|limit|mark)\b[^¦]*/)
  if (!m) return
  const text = m[0]
  // "± 1" is a line on either side of zero, as fold-change thresholds are usually written.
  const values = [...text.matchAll(new RegExp(`(±\\s*)?(${NUM})`, 'g'))].flatMap((x) => (x[1] ? [-toNumber(x[2]), toNumber(x[2])] : [toNumber(x[2])])).filter(usable)
  if (/\b(?:remove|delete|clear|no|without|hide)\b/.test(text)) {
    const kept = values.length ? lines.filter((l) => !values.includes(l.value)) : []
    r.node = { ...r.node, refLines: kept.length ? kept : undefined }
    r.done.push(lines.length === kept.length ? 'There was no such line to remove.' : `Removed ${lines.length - kept.length === 1 ? 'a line' : `${lines.length - kept.length} lines`}.`)
    return
  }
  if (!values.length) {
    r.unclear.push('Say where the line goes: for example “line at 1.3” or “upright line at x = 2”.')
    return
  }
  const upright = /\b(?:vertical|upright)\b/.test(text) || (/\bx\b/.test(text) && !/\b(?:horizontal|across)\b/.test(text))
  if (upright && !scatter) {
    r.unclear.push('An upright line needs an x axis with numbers, which only a scatter chart has. Ask for a line across at a value instead.')
    return
  }
  const dash = /\bdotted\b/.test(text) ? 'dotted' : /\bsolid\b/.test(text) ? 'solid' : undefined
  const added: ChartRefLine[] = values.slice(0, Math.max(0, MAX_REF_LINES - lines.length)).map((value) => ({ axis: upright ? 'x' : 'y', value, ...(label ? { label: label.slice(0, 40) } : {}), ...(dash ? { dash } : {}) }))
  if (!added.length) {
    r.unclear.push(`A chart takes at most ${MAX_REF_LINES} lines.`)
    return
  }
  r.node = { ...r.node, refLines: [...lines, ...added] }
  r.done.push(`Added ${added.length === 1 ? `${upright ? 'an upright' : 'a'} ${dash ?? 'dashed'} line` : `${added.length} ${dash ?? 'dashed'} ${upright ? 'upright ' : ''}lines`} ${upright ? 'at x' : scatter ? 'across at y' : 'across at'} ${scatter || upright ? '= ' : ''}${added.map((l) => l.value).join(' and ')}${label ? `, labelled “${label}”` : ''}.`)
}

const COLOUR_WORD = `#[0-9a-f]{6}\\b|\\b(?:${Object.keys(COLOURS).join('|')})\\b`
const LETTERING = '(?:text|font|lettering|letters|writing|numbers?|figures|labels?)'
const STAT = '(?:means?|averages?|medians?|n|counts?|sample sizes?|numbers? of (?:values|replicates|samples|observations|points|animals|cells))'
/** A word for what stands on the chart for one group, where it is not the name of a kind of chart ("in each box", not "box plot"). */
const COLUMN = '(?:bars?|columns?|box(?:es)?|violins?|groups?)\\b(?![- ]?(?:plots?|charts?|graphs?))'
const LABEL_NOTE = 'Only the numbers written at the groups can be given a colour of their own; the rest of the chart’s lettering is always dark. Ask for the numbers first, for example “write the mean in each bar”.'
const DECIMALS_NOTE = 'Decimals can be set for the numbers written at the groups. Ask for the numbers first, for example “write the mean in each bar”.'

/** The words of a clause that no reader took and that are not small talk. */
const leftOver = (rest: string): string[] =>
  rest
    .replace(/¦/g, ' ')
    .split(/[^\p{L}\p{N}#%.+-]+/u)
    .filter((w) => w && !SMALL_TALK.has(w) && /[\p{L}\p{N}]/u.test(w))

/** True when the clause names a series of the chart. Its words are left where they are. */
const namesSeries = (r: Reading): boolean => chartSeries(r.node).some((s) => s.name.trim() && new RegExp(`(^|[^\\p{L}\\p{N}])${escape(s.name.toLowerCase())}($|[^\\p{L}\\p{N}])`, 'u').test(r.rest))

/**
 * A clause that reads like a title but speaks of the numbers written at the groups: "value label
 * white" (not a y axis called "white"), and "remove the label" when the chart has such numbers
 * and no title of that kind to remove.
 */
function aboutValueLabels(node: ChartNode, raw: string): boolean {
  const clear = /^(?:please\s+)?(?:remove|delete|no|clear|hide)\s+(?:the\s+)?(value[- ]?)?label$/i.exec(raw.trim())
  if (clear) return !!node.valueLabels && !(clear[1] ? node.yLabel : node.title)
  const setting = `(?:${COLOUR_WORD}|\\b(?:above|over|inside|on top|off|none|hidden|mean|median|average|n)\\b|\\d\\s+decimals?)`
  return new RegExp(`^(?:please\\s+)?(?:(?:set|make|change)\\s+)?(?:the\\s+)?value[- ]?label\\s+(?:(?:in|to|is|the|colou?r|with)\\s+)*${setting}(?:\\s+(?:text|colou?r))?$`, 'i').test(raw.trim())
}

const INSTRUCTION_WORDS = /^(?:top|only|just|side|sides|down|left|right|most|highest|largest|biggest|names?|labels?|genes?|hide|remove|none|no|off|significant|regulated|up-?regulated|down-?regulated|increased|decreased|positive|negative|higher|lower|change|fold|extreme|far|out|from|among|x|y|p)$/
/** "top" alone is the legend's or the axis's ("legend at the top"); "top 10" is about names. */
const TOP_N = /\btop\s+\d+\b|\b\d+\s+(?:most|best|strongest|largest|biggest)\b/
const NAME_WORDS = /\b(?:names?|named|labels?|labell?(?:ed|ing)|annotat(?:e|ed|ions?))\b/

/** The setting for names of points, in words. */
export function describePointNames(node: ChartNode): string {
  const s = usablePointNames(node.pointNames) ?? { show: 'table' as const }
  if (s.show === 'none') return 'No names of points are written.'
  const rank = s.by === 'y' ? 'the highest' : s.by === 'x' ? 'furthest from x = 0' : 'furthest out from x = 0 and the bottom'
  const n = s.top ?? POINT_NAMES_TOP
  const which =
    s.show === 'top'
      ? `the ${s.side === 'each' ? `${n} on each side of x = 0` : `${n} ${n === 1 ? 'point' : 'points'}`} ${rank}`
      : s.series && !s.series.length
        ? ''
        : 'every point named in the table'
  const side = s.side === 'up' ? ', right of x = 0 only' : s.side === 'down' ? ', left of x = 0 only' : ''
  const from = s.series?.length ? `, from ${s.series.join(' and ')}` : ''
  const always = s.always?.length ? `${which ? '; always ' : ''}${s.always.slice(0, 12).join(', ')}${s.always.length > 12 ? ` and ${s.always.length - 12} more` : ''}` : ''
  return `Names are written for ${which}${which ? side + from : ''}${always}.`
}

/**
 * Names of points of a scatter chart: "name the top 10 genes", "label up and down regulated
 * genes", "top 5 on each side, most significant", "label Egf and Lif", "hide names". Names of
 * points the clause gives are always written; with "only" they are the only ones.
 */
function readPointNames(r: Reading) {
  if (r.node.kind !== 'scatter') return
  const top = TOP_N
  const known = pointNamesIn(r.node.groups)
  const knownSet = new Map(known.map((n) => [n.toLowerCase(), n]))
  // A gene that is also a word of instructions ("SET", "MAX", "Top") is not taken for the word.
  const genes = r.rest.split(/[^\p{L}\p{N}._-]+/u).filter((w) => w && knownSet.has(w) && !SMALL_TALK.has(w) && !INSTRUCTION_WORDS.test(w))
  if (!has(r, NAME_WORDS) && !has(r, top) && !(genes.length && has(r, /\b(?:only|just)\b/))) return
  // "Label the points with the mean" asks for numbers at groups, which the next reader explains.
  if (!genes.length && !has(r, top) && has(r, new RegExp(`\\b${STAT}\\b`))) return
  const s: ChartPointNames = { ...(usablePointNames(r.node.pointNames) ?? { show: 'table' }) }
  const off = has(r, /\b(?:no|remove|delete|without|hide|hidden|clear|none|off)\b/)
  while (take(r, NAME_WORDS)) {
    // Every word for names is taken out.
  }
  while (take(r, /\b(?:genes?|proteins?|transcripts?|metabolites?|hits?|samples?)\b/)) {
    // So are the words for what is named.
  }
  if (off) {
    take(r, /\b(?:no|remove|delete|without|hide|hidden|clear|none|off|all|the)\b/)
    r.node = { ...r.node, pointNames: { show: 'none' } }
    r.done.push(describePointNames(r.node))
    return
  }
  const count = take(r, /\btop\s+(\d+)\b|\b(\d+)(?=\s+(?:most|best|strongest|largest|biggest|top)\b)/)
  const topWord = count ?? take(r, /\btop\b/)
  if (topWord) {
    s.show = 'top'
    const n = count ? Number(count[1] ?? count[2]) : NaN
    if (Number.isInteger(n)) {
      if (n >= 1 && n <= MAX_POINT_LABELS) s.top = n
      else r.unclear.push(`A chart writes 1 to ${MAX_POINT_LABELS} names.`)
    }
  }
  if (take(r, /\b(?:most significant|smallest p(?:[- ]values?)?|lowest p(?:[- ]values?)?|highest|by p(?:[- ]values?)?|by significance)\b/)) s.by = 'y'
  else if (take(r, /\b(?:largest|biggest|greatest|strongest)\s+(?:fold[- ]?)?changes?\b|\bmost changed\b|\bby (?:fold[- ]?)?change\b|\bfurthest from (?:x\s*=\s*)?0\b/)) s.by = 'x'
  else if (take(r, /\b(?:most extreme|far(?:thest)? out|most striking|volcano)\b/)) delete s.by
  // Sides of x = 0: up and down in a volcano plot. Words that can only mean a side are read before
  // the names of series; a bare "up" or "down" after them, as a series may be called "Up".
  const each = take(r, /\b(?:on\s+)?(?:each|both|either)\s+sides?\b|\bper side\b|\bin each direction\b/)
  const both = take(r, /\bup[- ]?\s*(?:and|&|\/|or)\s*down[- ]?regulated\b|\bdown[- ]?\s*(?:and|&|\/|or)\s*up[- ]?regulated\b/)
  let up = both ?? take(r, /\bup[- ]?regulated\b|\bincreased\b|\bright(?: side)?\b|\bpositive\b|\bhigher\b/)
  let down = both ?? take(r, /\bdown[- ]?regulated\b|\bdecreased\b|\bleft(?: side)?\b|\bnegative\b|\blower\b/)
  // Series the clause names: only their points are named, in the order of the table.
  const named: string[] = []
  for (let found = seriesIn(r); found; found = seriesIn(r)) named.push(found.name)
  const order = r.node.groups.map((g) => g.name)
  if (named.length) s.series = [...new Set(named)].sort((a, b) => order.indexOf(a) - order.indexOf(b))
  up ??= take(r, /\bup\b/)
  down ??= take(r, /\bdown\b/)
  take(r, /\b(?:regulated|side|of x = 0|and|or)\b/)
  if (each || (up && down)) s.side = s.show === 'top' ? 'each' : undefined
  else if (up) s.side = 'up'
  else if (down) s.side = 'down'
  else if (topWord || count) delete s.side
  // Names of points the clause gives: written always; with "only", alone.
  if (genes.length) {
    const only = take(r, /\b(?:only|just)\b/)
    for (const g of genes) r.rest = r.rest.replace(new RegExp(`(^|[^\\p{L}\\p{N}._-])${escape(g)}(?=$|[^\\p{L}\\p{N}._-])`, 'u'), '$1 ¦ ')
    const given = genes.map((g) => knownSet.get(g) as string)
    s.always = only ? given : [...new Set([...(s.always ?? []), ...given])]
    if (only) {
      s.show = 'table'
      s.series = []
      delete s.side
    } else if (s.show === 'none') {
      s.show = 'table'
      s.series = []
    }
  } else if (!topWord && !named.length && !up && !down && !each && s.show === 'none') s.show = 'table'
  else if (!topWord && !named.length && !up && !down && !each && s.show === 'top' && !s.by) {
    // "show all names", "names from the table".
    if (take(r, /\b(?:all|every|from the table|in the table)\b/)) s.show = 'table'
  }
  while (take(r, /\b(?:all|every|from|among|in|the|only|with|most|best|strongest|biggest|largest|top)\b/)) {
    // Words that only join the request.
  }
  r.node = { ...r.node, pointNames: usablePointNames(s) }
  r.done.push(describePointNames(r.node))
  if (!known.length) r.unclear.push('No point has a name yet: put a column of names (genes, samples) before the x values in the table.')
}

/** A number written at every group: its mean, median or count, where it stands, its colour and its decimals. */
function readValueLabels(r: Reading) {
  const colourBesideLettering = new RegExp(`\\b${LETTERING}\\s+(?:(?:in|to|is|are|colou?r|colou?red)\\s+)*(?:${COLOUR_WORD})|(?:${COLOUR_WORD})\\s+${LETTERING}\\b`)
  const where = `\\b(in|inside|within|into|on|onto|above|over|atop|at|for|of|to)\\s+(?:(?:the|each|every|all|top|of)\\s+)*${COLUMN}`
  const labelWord = has(r, /\b(?:labels?|labell?ed|labell?ing|annotat(?:e|ed|ions?))\b/)
  const shown = has(r, new RegExp(`\\b(?:show|write|add|display|print|put|give|state)\\s+(?:(?:the|a|each|every)\\s+)*${STAT}\\b`))
  const placed = has(r, new RegExp(`\\b(?:${STAT}|numbers?|values?|figures)\\b[^¦]*?${where}`))
  const lettering = has(r, colourBesideLettering)
  // "…, in white" goes on about the numbers the sentence has just asked for.
  const carried = !!r.labels && has(r, new RegExp(`${COLOUR_WORD}|\\b(?:automatic|auto|default|usual)\\s+colou?r\\b`)) && !namesSeries(r) && !has(r, /\b(?:points?|dots?|markers?|symbols?|bars?|box(?:es)?|violins?|lines?|groups?)\b/)
  const decimals = has(r, /\bdecimals?\b|\bwhole numbers?\b/)
  if (!labelWord && !shown && !placed && !lettering && !carried && !decimals) return
  const before = r.rest

  // Decimals first: "no decimals" is not a wish to remove the numbers.
  const exact = take(r, new RegExp(`(\\d+)\\s*(?:decimals?(?:\\s+places?)?|digits? after the (?:decimal )?point)|\\bdecimals?\\s*(?:to|of|:|=)?\\s*(\\d+)`))
  const whole = exact ? null : take(r, /\b(?:no|without|zero)\s+decimals?\b|\bwhole numbers?\b|\brounded\b/)
  const digits = exact ? Number(exact[1] ?? exact[2]) : whole ? 0 : undefined

  const spot = take(r, new RegExp(where))
  const beyond = take(r, /\b(?:above|over|atop|on top(?: of)?|outside)\b/)
  const within = take(r, /\b(?:inside|within)\b/)
  const above = !!beyond || (!!spot && /^(?:above|over|atop)$/.test(spot[1])) || (!!spot && /\btop of\b/.test(spot[0]))
  const inside = !above && (!!within || (!!spot && /^(?:in|inside|within|into)$/.test(spot[1])))
  take(r, new RegExp(`\\b(?:label|annotate)\\s+(?:(?:the|each|every|all)\\s+)*${COLUMN}`))

  const stat = take(r, new RegExp(`\\b${STAT}\\b`))
  const show: ChartValueLabels['show'] | null = !stat ? null : /^(?:mean|average)/.test(stat[0]) ? 'mean' : /^median/.test(stat[0]) ? 'median' : 'n'

  const usual = take(r, /\b(?:automatic|auto|default|usual)\s+(?:text\s+|label\s+)?colou?r\b/)
  // A colour belongs to the numbers unless the clause also names a group ("label the bars and make Treated red").
  const tint = usual || namesSeries(r) ? null : take(r, new RegExp(COLOUR_WORD))
  const off = !!take(r, /\b(?:remove|delete|no|without|hide|drop|off|none|hidden)\b/)
  while (take(r, /\b(?:text|font|lettering|letters|writing|numbers?|figures|labels?|labell?ed|labell?ing|annotat(?:e|ed|ions?)|write|written|print|state|colou?red|values?)\b/)) {
    // The words that only say what the clause is about.
  }
  // The kind of chart the clause leaves behind: one it names is read after this.
  const named = KINDS.find(([pattern]) => pattern.test(r.rest))
  const kind = named?.[1] ?? r.node.kind
  // A clause that merely holds the word "label" among words nobody knows ("rotate the labels 45
  // degrees") is not a wish for numbers at the groups: it is left to be reported whole.
  if (!shown && !placed && !lettering && !carried && !decimals && leftOver(named ? r.rest.replace(named[0], ' ') : r.rest).length) {
    r.rest = before
    return
  }
  r.labels = true
  const now = usableValueLabels(r.node.valueLabels)
  if (kind === 'scatter') {
    r.unclear.push('Numbers at the groups need a chart with groups (bars, dots, boxes, violins or a line). A scatter chart writes names beside its points from a column of names in the table.')
    return
  }
  if (off) {
    r.node = { ...r.node, valueLabels: undefined }
    r.done.push(now ? 'The numbers at the groups are removed.' : 'No numbers are written at the groups.')
    return
  }
  // A clause that only speaks of the colour of lettering changes numbers that are there; it does not add them.
  if (!now && !labelWord && !shown && !placed) {
    r.unclear.push(tint || usual ? LABEL_NOTE : DECIMALS_NOTE)
    return
  }
  const next: ChartValueLabels = { ...(now ?? { show: usualValueLabel(kind) }) }
  if (show) next.show = show
  if (above) next.above = true
  if (inside) delete next.above
  if (digits !== undefined) next.decimals = Math.min(VALUE_DECIMALS_MAX, digits)
  if (usual) delete next.color
  if (tint) next.color = tint[0].startsWith('#') ? tint[0] : COLOURS[tint[0]]
  r.node = { ...r.node, valueLabels: next }
  const colourName = tint && !tint[0].startsWith('#') ? tint[0] : (Object.keys(COLOURS).find((name) => COLOURS[name] === next.color) ?? next.color)
  const decimalsText = next.decimals === 0 ? 'no decimals' : next.decimals === 1 ? 'one decimal' : `${next.decimals} decimals`
  // Numbers that are there and only change their colour or decimals: say just that.
  if (now && !show && !above && !inside && (tint || usual || digits !== undefined)) {
    const changes = [tint ? `are ${colourName}` : usual ? 'take their usual colour' : '', digits !== undefined ? `have ${decimalsText}` : ''].filter(Boolean)
    r.done.push(`The numbers at the groups ${changes.join(' and ')}.`)
    return
  }
  const what = next.show === 'n' ? 'The number of values (n)' : `The ${next.show}`
  const column = kind === 'bar' ? 'bar' : kind === 'box' ? 'box' : kind === 'violin' ? 'violin' : 'group'
  const place = kind === 'bar' && !next.above ? 'inside its bar (above it where it does not fit)' : `above its ${column}`
  r.done.push(`${what} of each group is written ${place}${next.color ? `, in ${colourName}` : ''}${next.decimals !== undefined && next.show !== 'n' ? `, with ${decimalsText}` : ''}.${next.show === 'median' && (kind === 'bar' || kind === 'dot' || kind === 'line') ? ` The ${kind === 'bar' ? 'bar itself' : kind === 'dot' ? 'line across the dots' : 'line'} shows the mean.` : ''}`)
}

function readText(r: Reading) {
  const exact = take(r, new RegExp(`\\b(?:font|text|lettering|letters?)[- ]?(?:size)?\\s*(?:to|of|:|=|at)?\\s*(${NUM})(?:\\s*(?:pt|px|points?))?`))
  const bigger = !exact && take(r, /\b(?:bigger|larger|increase(?: the)?)\s+(?:font|text|lettering|letters)(?:\s+size)?|\b(?:font|text|lettering|letters)(?:\s+size)?\s+(?:bigger|larger)\b/)
  const smaller = !exact && !bigger && take(r, /\b(?:smaller|reduce(?: the)?|decrease(?: the)?)\s+(?:font|text|lettering|letters)(?:\s+size)?|\b(?:font|text|lettering|letters)(?:\s+size)?\s+smaller\b/)
  if (!exact && !bigger && !smaller) return
  const now = r.node.fontSize ?? CHART_FONT
  const size = Math.min(60, Math.max(6, Math.round(exact ? toNumber(exact[1]) : bigger ? now * 1.2 : now / 1.2)))
  r.node = { ...r.node, fontSize: size }
  r.done.push(`The text size is ${size}.`)
}

function readPoints(r: Reading) {
  // A clause that names no group goes on about the one named just before in the same sentence ("Treated red, and squares").
  const named1 = seriesIn(r)
  const target = named1 ?? (r.carried ? (chartSeries(r.node).find((s) => s.name === r.carried) ?? null) : null)
  if (named1) r.carried = named1.name
  const whose = target ? `of ${target.name}` : ''
  const marks = '(?:data ?)?(?:points?|dots?|markers?|symbols?|values?|replicates?|observations?|measurements?)'

  // Shape.
  const shape = take(r, /\b(circles?|squares?|triangles?|diamonds?|round)\b/)
  if (shape) {
    const kind: PointShape = shape[1].startsWith('sq') ? 'square' : shape[1].startsWith('tri') ? 'triangle' : shape[1].startsWith('dia') ? 'diamond' : 'circle'
    r.node = { ...r.node, groups: onGroups(r.node, target, (g) => (kind === 'circle' ? without(g, 'shape') : { ...g, shape: kind })) }
    r.done.push(`The points ${whose || 'of every group'} are ${kind}s.${hasPoints(r.node) ? '' : ' This chart draws no points yet: ask for “show all points”.'}`)
  }

  // Transparency.
  const percent = take(r, new RegExp(`(${NUM})\\s*%\\s*(transparent|transparency|opacity|opaque|see[- ]through)|(transparent|transparency|opacity|opaque)\\s*(?:of|to|:|=|at)?\\s*(${NUM})\\s*%`))
  const vague = percent ? null : take(r, /\b(?:semi[- ]?transparent|transparent|see[- ]through|translucent|faint|opaque|solid)\b/)
  if (percent || vague) {
    const word = percent ? (percent[2] ?? percent[3]) : (vague?.[0] ?? '')
    const share = percent ? toNumber(percent[1] ?? percent[4]) / 100 : 0.5
    const opacity = /opaque|solid/.test(word) && !percent ? 1 : /opacity|opaque/.test(word) ? share : 1 - share
    const kept = Math.min(1, Math.max(POINT_OPACITY_MIN, Math.round(opacity * 100) / 100))
    r.node = target ? { ...r.node, groups: onGroups(r.node, target, (g) => ({ ...g, pointOpacity: kept })) } : { ...r.node, pointOpacity: pointStyle(1, kept).pointOpacity, groups: r.node.groups.map((g) => without(g, 'pointOpacity')) }
    r.done.push(`The points ${whose || 'of every group'} are ${kept === 1 ? 'solid' : `${Math.round((1 - kept) * 100)}% transparent`}.`)
  }

  // Size.
  const sized = take(r, new RegExp(`(?:\\b${marks}\\s+)?\\bsize\\s*(?:of|to|:|=|at)?\\s*(?:\\b${marks}\\s*(?:to|:|=|at)?\\s*)?(${NUM})\\s*(%|x|times)?|(${NUM})\\s*(%|x\\b|times)\\s*(?:the\\s+)?(?:size|bigger|larger|as (?:big|large))`))
  const twice = sized ? null : take(r, /\b(?:twice|double|two times)(?:\s+(?:as\s+|the\s+)?(?:big|large|size|bigger|larger))?\b/)
  const half = sized || twice ? null : take(r, /\bhalf(?:\s+(?:as\s+|the\s+)?(?:big|large|size))?\b/)
  const bigger = sized || twice || half ? null : take(r, /\b(?:bigger|larger|big|large|increase)\b/)
  const smaller = sized || twice || half || bigger ? null : take(r, /\b(?:smaller|small|tiny|reduce|decrease)\b/)
  if (sized || twice || half || bigger || smaller) {
    const now = pointStyle(target?.pointSize ?? r.node.pointSize, 1).pointSize ?? 1
    let size = now
    if (sized) {
      const n = toNumber(sized[1] ?? sized[3])
      const unit = sized[2] ?? sized[4]
      size = unit === '%' ? n / 100 : unit ? n : n > 4 ? n / 100 : n
    } else size = twice ? now * 2 : half ? now / 2 : bigger ? now * 1.5 : now / 1.5
    const kept = Math.min(POINT_SIZE_MAX, Math.max(POINT_SIZE_MIN, Math.round(size * 100) / 100))
    r.node = target ? { ...r.node, groups: onGroups(r.node, target, (g) => ({ ...g, pointSize: kept })) } : { ...r.node, pointSize: pointStyle(kept, 1).pointSize, groups: r.node.groups.map((g) => without(g, 'pointSize')) }
    r.done.push(`The points ${whose || 'of every group'} are drawn at ${Math.round(kept * 100)}% of the usual size.`)
  }

  // Colour of a group.
  const hex = take(r, /#[0-9a-f]{6}\b/)
  const named = hex ? null : take(r, new RegExp(`\\b(${Object.keys(COLOURS).join('|')})\\b`))
  if (hex || named) {
    const colour = hex ? hex[0] : COLOURS[named?.[1] ?? 'grey']
    r.node = { ...r.node, groups: onGroups(r.node, target, (g) => ({ ...g, color: colour })) }
    r.done.push(`${target ? target.name : 'Every group'} is ${hex ? colour : named?.[1]}.`)
  }

  // Showing or hiding every value.
  const hide = take(r, new RegExp(`\\b(?:hide|remove|no|without|delete)\\s+(?:the\\s+|all\\s+|every\\s+|individual\\s+|single\\s+)*${marks}\\b`))
  const show = !hide && take(r, new RegExp(`\\b(?:(?:show|add|plot|overlay|draw|with|display)\\s+)?(?:all\\s+|every\\s+|each\\s+|individual\\s+|single\\s+|the\\s+|raw\\s+)+${marks}\\b|\\b(?:show|add|plot|overlay|draw|display)\\s+${marks}\\b`))
  if (hide || show) {
    if (r.node.kind === 'scatter' || r.node.kind === 'dot') r.done.push(`A ${KIND_NAMES[r.node.kind]} always shows every point.`)
    else {
      r.node = { ...r.node, points: show ? true : undefined }
      r.done.push(show ? 'Every value is shown as a dot.' : 'The dots of single values are hidden.')
    }
  }
  if (shape || percent || vague || sized || twice || half || bigger || smaller || hex || named || hide || show) take(r, new RegExp(`\\b${marks}\\b`))
  else if (named1) r.rest += ` ${named1.name.toLowerCase()}`
}

/** The words for each kind of chart. */
const KINDS: [RegExp, ChartKind][] = [
  [/\bheat[- ]?maps?\b|\bmatrix(?:[- ]?(?:plots?|charts?))?\b/, 'heatmap'],
  [/\bvenn(?:[- ]?(?:diagrams?|plots?|charts?))?\b/, 'venn'],
  [/\bpie(?:[- ]?(?:charts?|plots?|graphs?))?\b|\bpies\b/, 'pie'],
  [/\bbox(?:[- ]and[- ]whiskers?)?[- ]?(?:plots?|charts?|graphs?)?\b|\bboxes\b/, 'box'],
  [/\bviolins?(?:[- ]?(?:plots?|charts?|graphs?))?\b/, 'violin'],
  [/\bscatter(?:[- ]?(?:plots?|charts?|graphs?))?\b|\bvolcano(?:[- ]?plots?)?\b/, 'scatter'],
  [/\b(?:dot|strip)[- ]?(?:plots?|charts?|graphs?)\b/, 'dot'],
  [/\bline[- ]?(?:plots?|charts?|graphs?)\b/, 'line'],
  [/\b(?:bar|column)[- ]?(?:plots?|charts?|graphs?)\b|\bbarplot\b|\bbars\b|\bcolumns\b/, 'bar'],
]

/** Survival curves read their table like a scatter chart: times in the first column, then 1 or 0 for each group. */
function readSurvival(r: Reading): boolean {
  const curves = take(r, /\b(?:survival|kaplan[- ]?meier)(?:[- ]?(?:curves?|plots?|charts?|analysis|estimates?))?\b/)
  if (curves && !r.node.survival) {
    const wasScatter = r.node.kind === 'scatter'
    const groups = wasScatter ? r.node.groups : crossTable(r.node.groups, r.node.kind, 'scatter')
    r.node = { ...without(r.node, 'fit', 'curve', 'doseBottom', 'doseTop', 'corr', 'pointNames', 'xLog', 'yLog', 'yMin', 'yMax', 'refLines', 'brackets', 'test', 'stacked', 'percent'), kind: 'scatter', groups, survival: true }
    r.done.push(`The chart now shows survival curves (Kaplan–Meier): the first column of the table is read as the time, the others as 1 (the event) or 0 (left the study without it).`)
  } else if (curves) r.done.push('The chart already shows survival curves.')
  const test = take(r, /\b(?:(?:no|remove|hide|without)\s+(?:the\s+)?)?log[- ]?rank(?:\s+tests?)?(?:\s+p(?:[- ]?values?)?)?\b/)
  if (test) {
    if (!r.node.survival) r.unclear.push('The log-rank test compares survival curves: choose survival curves first.')
    else {
      const on = !/\b(?:no|remove|hide|without)\b/.test(test[0])
      r.node = on ? { ...r.node, logRank: true } : without(r.node, 'logRank')
      r.done.push(on ? 'The p value of the log-rank test is written on the chart.' : 'The p value of the log-rank test is no longer written on the chart.')
    }
  }
  return !!curves || !!test
}

function readKind(r: Reading) {
  for (const [pattern, kind] of KINDS) {
    if (!take(r, pattern)) continue
    if (kind === 'scatter' && r.node.survival) {
      r.node = without(r.node, 'survival', 'logRank')
      r.done.push('The chart is now a scatter chart.')
      return
    }
    if (r.node.survival) r.node = without(r.node, 'survival', 'logRank')
    if (kind === r.node.kind) r.done.push(`The chart is already a ${KIND_NAMES[kind]}.`)
    else if (chartFamily(kind) === chartFamily(r.node.kind)) {
      r.node = { ...r.node, kind }
      r.done.push(`The chart is now a ${KIND_NAMES[kind]}.`)
    } else {
      // The other family of chart reads the table differently, as it does when chosen in the panel.
      const across = (r.node.refLines ?? []).filter((l) => l.axis === 'y')
      const from = chartFamily(r.node.kind)
      r.node = { ...r.node, kind, groups: crossTable(r.node.groups, r.node.kind, kind), brackets: undefined, test: undefined, fit: undefined, curve: undefined, doseBottom: undefined, doseTop: undefined, corr: undefined, xMin: undefined, xMax: undefined, xLog: undefined, pointNames: undefined, refLines: across.length ? across : undefined }
      r.done.push(
        kind === 'scatter'
          ? 'The chart is now a scatter chart: the first column of the table is read as the x values.'
          : kind === 'venn'
            ? 'The chart is now a Venn diagram: every column of the table is read as the names of the members of one set.'
            : from === 'scatter'
              ? `The chart is now a ${KIND_NAMES[kind]}: the x values became the first group.`
              : `The chart is now a ${KIND_NAMES[kind]}: every column of the table is read as the numbers of one group.`,
      )
    }
    return
  }
}

/** Cut what the scientist wrote into sentences, and each sentence into clauses that ask for one thing or a few. */
function clauses(text: string, scatter = false): string[][] {
  return text
    .split(/[\n;]+|\.(?=\s|$)/)
    .map((part) => {
      const p = part.trim()
      if (!p) return []
      // Titles hold any words; "compare A and B" and "from 0 and 10" hold an "and" of their own.
      // "label the bars with the mean, in white" is no title: it is cut like any other sentence.
      const atGroups = /^(?:please\s+)?label\s+(?:(?:the|each|every|all)\s+)*(?:bars?|columns?|box(?:es)?|violins?|groups?)\b/i.test(p)
      if (!atGroups && (/^(?:please\s+)?(?:(?:set|make|change|call|name|write|remove|delete|no|clear|hide)\s+)?(?:the\s+)?(?:(?:x|y|value|chart|main|plot)[- ]?(?:axis)?[- ]?\s*)?(?:title|label|name)\b/i.test(p) || /^(?:please\s+)?label\s+(?:the\s+)?(?:x|y|value)\b/i.test(p))) return [p]
      if (/\b(?:compare|comparison|between)\b/i.test(p)) return [p]
      // "Names of the top 10 up and down genes", "label Egf and Lif": one request, whatever its "and".
      if (scatter && (NAME_WORDS.test(p.toLowerCase()) || TOP_N.test(p.toLowerCase())) && !/\b(?:lines?|thresholds?|cut-?offs?|title)\b/i.test(p)) return [p]
      // A number goes on with the clause before it ("lines at -1 and 1"), and so does a value
      // named by its axis ("lines at x = -1 and x = 1").
      return p.split(/\s*,\s+(?![-+−±]?[\d.]|[xy]\s*=)|\s+(?:and then|and also|and|then|also|plus)\s+(?![-+−±]?[\d.]|[xy]\s*=)/i).map((s) => s.trim()).filter(Boolean)
    })
}

/**
 * Read what the scientist wrote and change the chart accordingly. Nothing is changed for a
 * clause that is not understood; it is reported in `unclear` instead.
 */
export function applyInstruction(node: ChartNode, text: string): InstructionResult {
  const done: string[] = []
  const unclear: string[] = []
  let current = node
  for (const sentence of clauses(text.slice(0, 2000), node.kind === 'scatter')) {
    let carried: string | undefined
    let labels: boolean | undefined
    for (const raw of sentence) {
      const r: Reading = { node: current, rest: raw.toLowerCase().replace(/−/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'"), done: [], unclear: [], carried, labels }
      if (aboutValueLabels(current, raw) || !readTitle(r, raw)) {
        // The label of a line is taken out first, in the scientist's spelling: it may hold any words.
        let label: string | undefined
        if (/\b(?:lines?|thresholds?|cut-?offs?|limit|mark)\b/.test(r.rest)) {
          const m = /\b(?:labell?ed|with (?:the |a )?label|label|called|named)\s*(?:as\s+)?(.+)$/i.exec(raw)
          if (m && m.index !== undefined) {
            label = strip(m[1])
            r.rest = `${r.rest.slice(0, m.index)} ¦ `
          }
        }
        // Before the reader of tests, which would take the "rank" of "log-rank" for a test on ranks.
        readSurvival(r)
        readPalette(r)
        readTest(r)
        readErrorBars(r)
        readStack(r)
        readCorrelation(r)
        readFit(r)
        readLegend(r)
        readPointNames(r)
        readScale(r)
        readRange(r)
        readValueLabels(r)
        readText(r)
        readLines(r, label)
        readPoints(r)
        readKind(r)
        const left = leftOver(r.rest)
        if (!r.done.length && !r.unclear.length) r.unclear.push(`Not understood: “${raw}”.`)
        else if (left.length) r.unclear.push(`Not understood in “${raw}”: “${left.join(' ')}”.`)
      }
      current = r.node
      carried = r.carried
      labels = r.labels
      done.push(...r.done)
      unclear.push(...r.unclear)
    }
  }
  if (!done.length && !unclear.length) unclear.push('Write what to change, for example “log y axis” or “legend at the top”.')
  return { node: current, done, unclear }
}
