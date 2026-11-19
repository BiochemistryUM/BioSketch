// Choosing an analysis with Claude's help, through the scientist's own Claude app (copy and paste,
// no key, no cost). BioSketch describes the experiment as the scientist told it, the table in
// summary (never the table itself) and the analyses it can work out. Claude answers with a plan
// made only of those choices, and its reasons. BioSketch reads the plan as untrusted text, checks
// it against the table, and does all the arithmetic itself: no number in the answer is used.

import { chartAdvice, chartAnalysis, chartSamples } from '../model/chart'
import { quantile } from '../model/chartStats'
import { TEST_NAMES, testFor } from '../model/chartTests'
import type { ChartNode, ChartTest } from '../model/types'

export interface AnalysisPlan {
  /** The choices for the chart's test; null when Claude advises none of the analyses on offer, or its plan cannot be worked out on this table. */
  test: ChartTest | null
  /** The analysis these choices run on this table, in words; '' when there is none. */
  name: string
  /** Claude's reasons, what to keep in mind, and what it still wants the scientist to check. */
  why: string[]
  cautions: string[]
  questions: string[]
  /** What the design would need that BioSketch cannot work out; '' when nothing. */
  beyond: string
  /** Where the plan did not fit the table, in words for the scientist. */
  adjusted: string[]
}

const three = (v: number): string => String(Number(v.toPrecision(3)))
const KIND: Record<ChartNode['kind'], string> = { bar: 'bar chart', dot: 'dot chart', line: 'line chart', box: 'box plot', violin: 'violin plot', scatter: 'scatter chart' }

/** One line per group: how many values, and where they lie. */
function summary(names: string[], samples: number[][]): string {
  const rows = samples.map((s, i) => {
    const n = s.length
    const mean = s.reduce((a, v) => a + v, 0) / n
    const sd = n > 1 ? Math.sqrt(s.reduce((a, v) => a + (v - mean) ** 2, 0) / (n - 1)) : 0
    return `${names[i] || `group ${i + 1}`} | ${n} | ${three(mean)} | ${n > 1 ? three(sd) : 'n/a'} | ${three(quantile([...s].sort((a, b) => a - b), 0.5))} | ${three(Math.min(...s))} | ${three(Math.max(...s))}`
  })
  return ['group | n | mean | SD | median | smallest | largest', ...rows].join('\n')
}

const ANSWER_FORM = `{
  "test": "means" or "ranks" or "none",
  "paired": true or false,
  "versusFirst": true or false,
  "across": true or false,
  "stars": true or false,
  "why": ["one short sentence per reason, written for a biologist"],
  "cautions": ["what to keep in mind with these data"],
  "questions": ["anything still open that the scientist should check"],
  "beyond": "what this design would really need if BioSketch cannot work it out, otherwise an empty string"
}`

/**
 * The text the scientist pastes into Claude: the experiment in their words, the table in summary,
 * what BioSketch can work out for it, and the form of the answer. Throws when the chart has
 * nothing a test could compare.
 */
export function analysisRequest(node: ChartNode, description: string): string {
  const compared = chartSamples(node)
  if (compared.problem) throw new Error(compared.problem)
  if (compared.samples.length < 2) throw new Error('A test compares groups: this chart has fewer than two groups with values.')
  const advice = chartAdvice(node)
  const k = compared.samples.length
  const f = compared.factors
  const sizes = compared.samples.map((s) => s.length)
  const sameSize = sizes.every((n) => n === sizes[0])
  const menu = f
    ? [
        `- "test": "means" runs a two-way analysis of variance (Type II sums of squares) with the factors “category” (${f.categories.join(', ')}) and “series” (${f.series.join(', ')}) and their interaction. Every combination is taken as separate samples.`,
        '- Pairs after it: "across": false compares the series within each category; "across": true compares the categories within each series (t tests with the pooled variance, Holm’s correction).',
        '- "ranks" and "paired" are not available for two factors.',
      ]
    : [
        `- "test": "means", "paired": false: ${TEST_NAMES[testFor(k, 'means', false)]}.`,
        `- "test": "ranks", "paired": false: ${TEST_NAMES[testFor(k, 'ranks', false)]}.`,
        `- "test": "means", "paired": true: ${TEST_NAMES[testFor(k, 'means', true)]}${k > 2 ? ' (sphericity assumed, no correction)' : ''}. A paired analysis treats every row of the table as one sample measured in every group.`,
        `- "test": "ranks", "paired": true: ${TEST_NAMES[testFor(k, 'ranks', true)]}.`,
        ...(k > 2
          ? [
              `- Pairs after the overall test: "versusFirst": false compares every pair of groups (Tukey’s test after a one-way analysis of variance, otherwise the matching two-group test with Holm’s correction); "versusFirst": true compares each group with the first one, “${compared.names[0]}”, only (Holm’s correction).`,
            ]
          : []),
      ]
  return [
    'You are helping a life scientist choose a statistical analysis for one chart. The arithmetic is done by BioSketch, the program the chart is drawn in: you choose among the analyses it offers and explain the choice in plain words. Do not work out statistics or p values yourself.',
    `THE EXPERIMENT, in the scientist’s words:\n${description.trim() || '(no description was given: ask what was measured, in what, and how the groups relate)'}`,
    [
      'THE TABLE (a summary; you are not given the single values)',
      `Shown as a ${KIND[node.kind]}. ${f ? `Two factors: ${f.categories.length} categories along the bottom and ${f.series.length} series in the legend; each line below is one combination.` : `One factor with ${k} groups.`}`,
      summary(compared.names, compared.samples),
      f
        ? ''
        : sameSize
          ? `Every group has ${sizes[0]} values, so each row of the table could be one sample measured in every group. Only the scientist knows whether it is.`
          : 'The groups hold different numbers of values. If rows are one sample each, only rows with a value in every group can be used.',
      node.yLog ? 'The chart has a logarithmic value axis; BioSketch still analyses the values as typed.' : '',
      advice.test ? `BioSketch’s own suggestion, from the table alone: ${TEST_NAMES[advice.test]}. Its reasons: ${advice.why.join(' ')}` : `BioSketch has no suggestion: ${advice.why.join(' ')}`,
    ]
      .filter(Boolean)
      .join('\n'),
    ['WHAT BIOSKETCH CAN WORK OUT FOR THIS TABLE', ...menu, '- "stars": true writes stars on the brackets instead of p values.', 'It cannot do anything else: no mixed or nested models, no repeated measures with two factors, no covariates, no transformation of the values, no survival analysis, no tests of counts or proportions, no Dunnett’s test, no correction for sphericity.'].join('\n'),
    [
      'YOUR ANSWER',
      'If something that decides the analysis is unclear (are the rows the same animals or cultures? are the values biological or technical replicates? what is one sample?), ask your questions first, in plain text, and wait for the answers.',
      'Then answer with one JSON object in a code block, in exactly this form, and nothing after it:',
      ANSWER_FORM,
      'Use "test": "none" when no analysis on offer fits the design, and say in "beyond" what would. Do not put numbers you worked out into the answer.',
    ].join('\n'),
  ].join('\n\n')
}

const lines = (raw: unknown, most = 8): string[] =>
  (Array.isArray(raw) ? raw : typeof raw === 'string' && raw.trim() ? [raw] : [])
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.replace(/\s+/g, ' ').trim().slice(0, 500))
    .filter(Boolean)
    .slice(0, most)

/**
 * Read Claude's plan out of whatever was pasted back (the bare JSON, a code block, or a whole
 * conversation) and fit it to the chart's table. Every field is rebuilt; nothing but the choices
 * and the words is taken. Throws, with words for the scientist, when no plan can be read.
 */
export function readAnalysisAnswer(text: string, node: ChartNode): AnalysisPlan {
  const blocks = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map((m) => m[1]).filter((block) => block.includes('{'))
  const candidate = blocks.length ? blocks[blocks.length - 1] : text
  const [start, end] = [candidate.indexOf('{'), candidate.lastIndexOf('}')]
  if (start < 0 || end <= start) throw new Error('This does not look like Claude’s plan. If Claude asked you questions, answer them in the chat first; then copy its final answer, including everything between { and }.')
  let data: unknown
  try {
    // Chat apps sometimes swap straight quotes for curly ones when text is copied.
    data = JSON.parse(candidate.slice(start, end + 1).replace(/[“”]/g, '"'))
  } catch {
    throw new Error('The answer could not be read. Make sure you copied all of it, or ask Claude to repeat the JSON.')
  }
  const o = data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : null
  const by = o?.test === 'means' || o?.test === 'ranks' ? o.test : o?.test === 'none' ? null : undefined
  if (!o || by === undefined) throw new Error('The answer does not say which analysis to use ("means", "ranks" or "none"). Ask Claude to answer in the form the request describes.')

  const compared = chartSamples(node)
  if (compared.problem) throw new Error(compared.problem)
  const plan: AnalysisPlan = { test: null, name: '', why: lines(o.why), cautions: lines(o.cautions), questions: lines(o.questions), beyond: lines(o.beyond, 1)[0] ?? '', adjusted: [] }
  if (!by) return plan

  const two = !!compared.factors
  const k = compared.samples.length
  const wanted: ChartTest = {
    by,
    ...(o.paired === true ? { paired: true } : {}),
    ...(!two && k > 2 && o.versusFirst === true ? { versusFirst: true } : {}),
    ...(two && o.across === true ? { across: true } : {}),
    ...(o.stars === true ? { stars: true } : {}),
  }
  if (two && (by === 'ranks' || wanted.paired)) {
    plan.adjusted.push(`Claude proposes ${by === 'ranks' ? 'a test on ranks' : 'a paired analysis'}, which BioSketch cannot work out for a table with two factors. Nothing was chosen: tell Claude so, or analyse the data elsewhere.`)
    return plan
  }
  // The plan is tried on the table before it is offered: BioSketch does the arithmetic, not Claude.
  const tried = chartAnalysis({ ...node, test: wanted })
  if (!tried?.ok) {
    plan.adjusted.push(`Claude’s plan cannot be worked out on this table: ${tried ? tried.problem : 'no test could be run.'}`)
    return plan
  }
  plan.test = wanted
  plan.name = `${TEST_NAMES[tried.result.test]}${tried.result.pairMethod ? `, then ${tried.result.pairMethod}` : ''}`
  return plan
}
