// Choosing an analysis with Claude through the scientist's own app: what the request says, and
// how the answer is read. The answer is untrusted text: only its choices and its words are used.

import { describe, expect, it } from 'vitest'
import { analysisRequest, readAnalysisAnswer } from '../src/ai/analysis'
import { chartAnalysis, parseTable } from '../src/model/chart'
import type { ChartNode } from '../src/model/types'

const chart = (extra: Partial<ChartNode> = {}): ChartNode => ({
  id: 'ch', type: 'chart', x: 0, y: 0, w: 400, h: 300, rotation: 0, kind: 'bar',
  groups: [{ name: 'Control', values: [4.1, 3.8, 4.6, 4.3] }, { name: 'Treated', values: [6.9, 7.4, 6.1, 7.8] }, { name: 'Rescue', values: [5, 4.7, 5.6, 5.2] }],
  ...extra,
})
const two = (): ChartNode => chart({ groups: parseTable('WT\tWT\tKO\tKO\nctrl\tdrug\tctrl\tdrug\n1\t2\t3\t4\n2\t3\t4\t6\n1.5\t2.2\t3.1\t5') })
const answer = (plan: object, around = ['Here is my plan.\n\n```json\n', '\n```']): string => `${around[0]}${JSON.stringify(plan, null, 2)}${around[1]}`
const PLAN = { test: 'means', paired: false, versusFirst: true, across: false, stars: false, why: ['Each value is one mouse.'], cautions: ['Only four mice per group.'], questions: [], beyond: '' }

describe('the request for Claude', () => {
  it('holds the description, a summary of every group and what BioSketch can work out, but not the table', () => {
    const text = analysisRequest(chart(), '  Four mice per group, each value one mouse.  ')
    expect(text).toContain('THE EXPERIMENT, in the scientist’s words:\nFour mice per group, each value one mouse.')
    expect(text).toContain('group | n | mean | SD | median | smallest | largest')
    expect(text).toContain('Control | 4 | 4.2 | 0.337 | 4.2 | 3.8 | 4.6')
    expect(text).toContain('Treated | 4 | 7.05 | 0.733 | 7.15 | 6.1 | 7.8')
    // Values that are neither the smallest nor the largest of their group are nowhere in it.
    for (const single of ['4.3', '6.9', '7.4', '5.2']) expect(text, single).not.toContain(single)
    expect(text).toContain('"test": "means", "paired": false: One-way analysis of variance (ANOVA).')
    expect(text).toContain('"test": "ranks", "paired": true: Friedman test.')
    expect(text).toContain('compares each group with the first one, “Control”, only')
    expect(text).toContain('Every group has 4 values, so each row of the table could be one sample measured in every group.')
    expect(text).toContain('BioSketch’s own suggestion, from the table alone: One-way analysis of variance (ANOVA).')
    expect(text).toContain('Do not work out statistics or p values yourself.')
    expect(text).toContain('"test": "means" or "ranks" or "none"')
  })

  it('asks Claude to ask when nothing was described, and names the two-group tests for two groups', () => {
    const text = analysisRequest(chart({ groups: chart().groups.slice(0, 2) }), '')
    expect(text).toContain('(no description was given: ask what was measured')
    expect(text).toContain('"test": "means", "paired": false: Welch’s t test.')
    expect(text).not.toContain('versusFirst": false compares')
  })

  it('offers the two-way analysis for a table with categories and series', () => {
    const text = analysisRequest(two(), 'Two genotypes, with and without drug.')
    expect(text).toContain('Two factors: 2 categories along the bottom and 2 series in the legend')
    expect(text).toContain('WT · ctrl | 3 | 1.5 | 0.5 | 1.5 | 1 | 2')
    expect(text).toContain('two-way analysis of variance (Type II sums of squares) with the factors “category” (WT, KO) and “series” (ctrl, drug)')
    expect(text).toContain('"ranks" and "paired" are not available for two factors.')
  })

  it('is not written for a chart that has nothing to compare', () => {
    expect(() => analysisRequest(chart({ kind: 'scatter', groups: [{ name: 'y', values: [1, 2], xs: [1, 2] }] }), 'x')).toThrow(/scatter/)
    expect(() => analysisRequest(chart({ groups: [{ name: 'Only', values: [1, 2, 3] }] }), 'x')).toThrow(/fewer than two groups/)
  })
})

describe('reading Claude’s plan', () => {
  it('takes the choices and the words, and names the analysis BioSketch will run', () => {
    const plan = readAnalysisAnswer(answer(PLAN), chart())
    expect(plan.test).toEqual({ by: 'means', versusFirst: true })
    expect(plan.name).toBe('One-way analysis of variance (ANOVA), then t tests with the scatter pooled over all groups, each group with the first, Holm’s correction')
    expect(plan.why).toEqual(['Each value is one mouse.'])
    expect(plan.cautions).toEqual(['Only four mice per group.'])
    expect(plan.questions).toEqual([])
    expect(plan.beyond).toBe('')
    expect(plan.adjusted).toEqual([])
    // What it sets is a test BioSketch can run on this table.
    expect(chartAnalysis(chart({ test: plan.test! }))!.ok).toBe(true)
  })

  it('reads the last plan of a whole conversation, bare JSON, and quotes a chat app made curly', () => {
    const talk = `I have two questions first.\n\n\`\`\`json\n{"test": "ranks"}\n\`\`\`\n\nThank you. Final plan:\n\n${answer({ ...PLAN, test: 'ranks', paired: true, versusFirst: false, stars: true })}`
    expect(readAnalysisAnswer(talk, chart()).test).toEqual({ by: 'ranks', paired: true, stars: true })
    expect(readAnalysisAnswer(JSON.stringify(PLAN), chart()).test).toEqual({ by: 'means', versusFirst: true })
    expect(readAnalysisAnswer('{“test”: “means”, “why”: [“ok”]}', chart()).why).toEqual(['ok'])
  })

  it('uses nothing but the choices on offer: numbers, unknown fields and wrong types are dropped', () => {
    const odd = { test: 'means', paired: 'yes', versusFirst: 1, stars: null, p: 0.0001, statistic: 'F = 99', node: { kind: 'scatter' }, why: ['a', 7, { b: 1 }, '  spaced   out  ', ''], cautions: 'one caution', questions: Array.from({ length: 20 }, (_, i) => `q${i}`), beyond: ['x'.repeat(900)] }
    const plan = readAnalysisAnswer(answer(odd), chart())
    expect(plan.test).toEqual({ by: 'means' })
    expect(plan.why).toEqual(['a', 'spaced out'])
    expect(plan.cautions).toEqual(['one caution'])
    expect(plan.questions).toHaveLength(8)
    expect(plan.beyond).toHaveLength(500)
    expect(JSON.stringify(plan)).not.toMatch(/0\.0001|F = 99|scatter/)
    // "Each with the first" means nothing for two groups; "across" nothing for one factor.
    expect(readAnalysisAnswer(answer({ ...PLAN, across: true }), chart({ groups: chart().groups.slice(0, 2) })).test).toEqual({ by: 'means' })
  })

  it('offers nothing when Claude advises against every analysis, and passes on what would be needed', () => {
    const plan = readAnalysisAnswer(answer({ test: 'none', why: ['The mice were measured on five days.'], beyond: 'A mixed model with mouse as a random effect.' }), chart())
    expect(plan.test).toBeNull()
    expect(plan.name).toBe('')
    expect(plan.beyond).toBe('A mixed model with mouse as a random effect.')
  })

  it('does not offer a plan that cannot be worked out on the table, and says why', () => {
    const ranks = readAnalysisAnswer(answer({ ...PLAN, test: 'ranks' }), two())
    expect(ranks.test).toBeNull()
    expect(ranks.adjusted[0]).toContain('a test on ranks, which BioSketch cannot work out for a table with two factors')
    expect(readAnalysisAnswer(answer({ ...PLAN, paired: true }), two()).adjusted[0]).toContain('a paired analysis')
    // Paired, but only one row has a value in both groups.
    const sparse = chart({ groups: [{ name: 'a', values: [1, 2, 3] }, { name: 'b', values: [4], rows: [0] }] })
    const paired = readAnalysisAnswer(answer({ ...PLAN, paired: true }), sparse)
    expect(paired.test).toBeNull()
    expect(paired.adjusted[0]).toMatch(/^Claude’s plan cannot be worked out on this table: /)
    expect(readAnalysisAnswer(answer({ ...PLAN, across: true }), two()).test).toEqual({ by: 'means', across: true })
  })

  it('says what is wrong with a paste that holds no plan', () => {
    expect(() => readAnalysisAnswer('Could you tell me whether the rows are the same animals?', chart())).toThrow(/does not look like Claude’s plan/)
    expect(() => readAnalysisAnswer('{ "test": "means", ', chart())).toThrow(/does not look like|could not be read/)
    expect(() => readAnalysisAnswer('{ "test": "means" "why": [] }', chart())).toThrow(/could not be read/)
    expect(() => readAnalysisAnswer('{"test": "bayes"}', chart())).toThrow(/does not say which analysis/)
    expect(() => readAnalysisAnswer('[1, 2]{}', chart())).toThrow(/does not say which analysis/)
  })
})
