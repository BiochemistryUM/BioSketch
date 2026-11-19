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

import { CHART_FONT, MAX_REF_LINES, POINT_OPACITY_MIN, POINT_SIZE_MAX, POINT_SIZE_MIN, chartAdvice, chartSamples, chartSeries, crossTable, hasPoints, isGrouped, pointStyle, usable, withTestBrackets } from './chart'
import { TEST_NAMES, testFor } from './chartTests'
import { PALETTES } from './palettes'
import type { ChartGroup, ChartKind, ChartNode, ChartRefLine, ChartTest, LegendPlace, PointShape } from './types'

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
  'colour-blind friendly colours',
  'title: Cell viability',
  'y label: Viable cells (%)',
  'paired t test, show stars',
  'compare Control and Treated',
  'text size 16',
]

const NUM = '[-+]?(?:\\d+(?:[.,]\\d+)?|[.,]\\d+)(?:e[-+]?\\d+)?'
const toNumber = (s: string): number => Number(s.replace(',', '.'))
const KIND_NAMES: Record<ChartKind, string> = { bar: 'bar chart', dot: 'dot chart', line: 'line chart', box: 'box plot', violin: 'violin plot', scatter: 'scatter chart' }
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
  const kept: ChartTest = { ...(next.by ? { by: next.by } : {}), ...(next.paired ? { paired: true } : {}), ...(next.versusFirst ? { versusFirst: true } : {}), ...(next.stars ? { stars: true } : {}) }
  return { ...node, test: Object.keys(kept).length ? kept : undefined }
}

/** The name of the test the chart now runs, as it stands inside a sentence. */
function testName(node: ChartNode): string {
  if (!node.test?.by) return 'no test'
  const k = chartSamples(node).samples.length
  const name = TEST_NAMES[testFor(k, node.test.by, !!node.test.paired)]
  // Tests named after people keep their capital.
  return `${/^(?:One|Paired|Repeated)/.test(name) ? `a ${name[0].toLowerCase()}${name.slice(1)}` : name.includes('’s') ? name : `the ${name}`}${k > 2 ? `, as the table has ${k} groups` : ''}`
}

function readTest(r: Reading) {
  const scatter = r.node.kind === 'scatter'
  const refuse = (what: string) => r.unclear.push(scatter ? `${what} needs groups to compare; a scatter chart has series of points instead.` : `${what} is not offered for a chart with categories and series (two factors).`)
  const possible = !scatter && !isGrouped(r.node)

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
  const means = !ranks && take(r, /\b(?:welch(?:'s)?\s+)?(?:(?:student(?:'s)?\s+)?t[- ]?tests?|(?:one[- ]way\s+)?anova|analysis of variance|tukey|parametric(?:\s+tests?)?|compare (?:the )?means)\b/)
  const suggested = !ranks && !means && take(r, /\b(?:(?:suggested|recommended|best|right|appropriate|fitting)\s+tests?|(?:run|do|add|use|show)\s+(?:a\s+|the\s+)?(?:statistical\s+)?tests?|test (?:the )?(?:groups|difference|significance)|statistics|significance(?:\s+tests?)?)\b/)
  if (unpaired || paired || ranks || means || suggested) {
    if (!possible) refuse('A test')
    else {
      if (unpaired || paired) r.node = setTest(r.node, { paired: !!paired })
      if (ranks || means) r.node = setTest(r.node, { by: ranks ? 'ranks' : 'means' })
      else if (suggested || !r.node.test?.by) r.node = setTest(r.node, { by: chartAdvice(r.node).by ?? undefined })
      r.done.push(r.node.test?.by ? `The groups are compared with ${testName(r.node)}${paired ? '; each row is taken as one sample' : ''}.` : 'No test can be suggested for this table yet.')
    }
  }
  const first = take(r, /\b(?:(?:each|every|all)\s+(?:group\s+)?)?(?:against|versus|vs\.?|with|to)\s+(?:the\s+)?(?:control|first(?:\s+group)?)\b/)
  const every = !first && take(r, /\b(?:all|every)\s+pairs?\b|\bpairwise\b/)
  if ((first || every) && possible) {
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

function readFit(r: Reading) {
  const m = take(r, /(?:\b(?:remove|delete|no|without|hide|drop)\s+)?(?:\b(?:the|a)\s+)?(?:\b(?:linear|fitted|straight)\s+)*\b(?:regression|trend ?line|best[- ]fit|line of best fit|fit(?:ted)?)\b(?:\s+(?:a|the))?(?:\s+(?:straight|linear|regression|fitted))*(?:\s+line)?/)
  if (!m) return
  if (r.node.kind !== 'scatter') {
    r.unclear.push('A fitted line needs a scatter chart, with x values in the first column of the table.')
    return
  }
  const fit = !/\b(?:remove|delete|no|without|hide|drop)\b/.test(m[0])
  r.node = { ...r.node, fit: fit || undefined }
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
  const values = [...text.matchAll(new RegExp(NUM, 'g'))].map((x) => toNumber(x[0])).filter(usable)
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

function readKind(r: Reading) {
  const kinds: [RegExp, ChartKind][] = [
    [/\bbox(?:[- ]and[- ]whiskers?)?[- ]?(?:plots?|charts?|graphs?)?\b|\bboxes\b/, 'box'],
    [/\bviolins?(?:[- ]?(?:plots?|charts?|graphs?))?\b/, 'violin'],
    [/\bscatter(?:[- ]?(?:plots?|charts?|graphs?))?\b|\bvolcano(?:[- ]?plots?)?\b/, 'scatter'],
    [/\b(?:dot|strip)[- ]?(?:plots?|charts?|graphs?)\b/, 'dot'],
    [/\bline[- ]?(?:plots?|charts?|graphs?)\b/, 'line'],
    [/\b(?:bar|column)[- ]?(?:plots?|charts?|graphs?)\b|\bbarplot\b|\bbars\b|\bcolumns\b/, 'bar'],
  ]
  for (const [pattern, kind] of kinds) {
    if (!take(r, pattern)) continue
    if (kind === r.node.kind) r.done.push(`The chart is already a ${KIND_NAMES[kind]}.`)
    else if ((kind === 'scatter') === (r.node.kind === 'scatter')) {
      r.node = { ...r.node, kind }
      r.done.push(`The chart is now a ${KIND_NAMES[kind]}.`)
    } else {
      // The other family of chart reads the table differently, as it does when chosen in the panel.
      const across = (r.node.refLines ?? []).filter((l) => l.axis === 'y')
      r.node = { ...r.node, kind, groups: crossTable(r.node.groups, r.node.kind, kind), brackets: undefined, test: undefined, fit: undefined, xMin: undefined, xMax: undefined, xLog: undefined, refLines: across.length ? across : undefined }
      r.done.push(kind === 'scatter' ? 'The chart is now a scatter chart: the first column of the table is read as the x values.' : `The chart is now a ${KIND_NAMES[kind]}: the x values became the first group.`)
    }
    return
  }
}

/** Cut what the scientist wrote into sentences, and each sentence into clauses that ask for one thing or a few. */
function clauses(text: string): string[][] {
  return text
    .split(/[\n;]+|\.(?=\s|$)/)
    .map((part) => {
      const p = part.trim()
      if (!p) return []
      // Titles hold any words; "compare A and B" and "from 0 and 10" hold an "and" of their own.
      if (/^(?:please\s+)?(?:(?:set|make|change|call|name|write|remove|delete|no|clear|hide)\s+)?(?:the\s+)?(?:(?:x|y|value|chart|main|plot)[- ]?(?:axis)?[- ]?\s*)?(?:title|label|name)\b/i.test(p) || /^(?:please\s+)?label\s+(?:the\s+)?(?:x|y|value)\b/i.test(p)) return [p]
      if (/\b(?:compare|comparison|between)\b/i.test(p)) return [p]
      return p.split(/\s*,\s+(?![-+−]?[\d.])|\s+(?:and then|and also|and|then|also|plus)\s+(?![-+−]?[\d.])/i).map((s) => s.trim()).filter(Boolean)
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
  for (const sentence of clauses(text.slice(0, 2000))) {
    let carried: string | undefined
    for (const raw of sentence) {
      const r: Reading = { node: current, rest: raw.toLowerCase().replace(/−/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'"), done: [], unclear: [], carried }
      if (!readTitle(r, raw)) {
        // The label of a line is taken out first, in the scientist's spelling: it may hold any words.
        let label: string | undefined
        if (/\b(?:lines?|thresholds?|cut-?offs?|limit|mark)\b/.test(r.rest)) {
          const m = /\b(?:labell?ed|with (?:the |a )?label|label|called|named)\s*(?:as\s+)?(.+)$/i.exec(raw)
          if (m && m.index !== undefined) {
            label = strip(m[1])
            r.rest = `${r.rest.slice(0, m.index)} ¦ `
          }
        }
        readPalette(r)
        readTest(r)
        readErrorBars(r)
        readFit(r)
        readLegend(r)
        readScale(r)
        readRange(r)
        readText(r)
        readLines(r, label)
        readPoints(r)
        readKind(r)
        const left = r.rest
          .replace(/¦/g, ' ')
          .split(/[^\p{L}\p{N}#%.+-]+/u)
          .filter((w) => w && !SMALL_TALK.has(w) && /[\p{L}\p{N}]/u.test(w))
        if (!r.done.length && !r.unclear.length) r.unclear.push(`Not understood: “${raw}”.`)
        else if (left.length) r.unclear.push(`Not understood in “${raw}”: “${left.join(' ')}”.`)
      }
      current = r.node
      carried = r.carried
      done.push(...r.done)
      unclear.push(...r.unclear)
    }
  }
  if (!done.length && !unclear.length) unclear.push('Write what to change, for example “log y axis” or “legend at the top”.')
  return { node: current, done, unclear }
}
