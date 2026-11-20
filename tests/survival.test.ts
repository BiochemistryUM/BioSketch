// Survival curves and the log-rank test, pinned to R 4.4 with the survival package (survfit,
// survdiff) through tests/stats-reference.json, which scripts/stats-reference.R writes.

import { describe, expect, it } from 'vitest'
import { kaplanMeier, logRank, survivalAt, type Subject } from '../src/model/survival'
import ref from './stats-reference.json'

type Km = { time: number[]; status: number[]; at: number[]; surv: number[]; atRisk: number[]; median: number | null }
type Lr = { chisq: number; df: number; p: number; observed: number[]; expected: number[] }
const s = ref.surv as unknown as Record<'a' | 'b' | 'c' | 'half', Km> & Record<'ab' | 'abc' | 'ac' | 'bc', Lr>
const subjects = (k: Km): Subject[] => k.time.map((time, i) => ({ time, event: k.status[i] === 1 }))

describe('the Kaplan–Meier estimate', () => {
  it('gives R’s share without the event at every time, and the number still followed', () => {
    for (const name of ['a', 'b', 'c', 'half'] as const) {
      const km = kaplanMeier(subjects(s[name]))
      expect(km.steps.map((x) => x.time), name).toEqual(s[name].at)
      km.steps.forEach((step, i) => {
        expect(Math.abs(step.survival - s[name].surv[i]), `${name} at ${step.time}`).toBeLessThan(1e-12)
        expect(step.atRisk, `${name} still followed at ${step.time}`).toBe(s[name].atRisk[i])
      })
      expect(km.n).toBe(s[name].time.length)
      expect(km.events).toBe(s[name].status.filter((v) => v === 1).length)
    }
  })

  it('reports the median as R does: the first time at or below one half, the middle of a stretch at exactly one half, none when half is never reached', () => {
    expect(kaplanMeier(subjects(s.a)).median).toBe(s.a.median)
    expect(kaplanMeier(subjects(s.b)).median).toBe(s.b.median)
    expect(kaplanMeier(subjects(s.half)).median).toBe(s.half.median)
    expect(s.c.median).toBeNull()
    expect(kaplanMeier(subjects(s.c)).median).toBeNull()
  })

  it('counts subjects that leave at a time as still followed at that time, and ignores times that are not numbers', () => {
    const km = kaplanMeier([{ time: 5, event: true }, { time: 5, event: false }, { time: 8, event: true }, { time: NaN, event: true }, { time: -1, event: true }])
    expect(km.n).toBe(3)
    expect(km.steps.map(({ survival: _s, lower: _lo, upper: _hi, ...rest }) => rest)).toEqual([{ time: 5, atRisk: 3, events: 1, censored: 1 }, { time: 8, atRisk: 1, events: 1, censored: 0 }])
    expect(km.steps[0].survival).toBeCloseTo(2 / 3, 12)
    expect(km.steps[1].survival).toBe(0)
    expect(survivalAt(km, 0)).toBe(1)
    expect(survivalAt(km, 6)).toBeCloseTo(2 / 3, 12)
    expect(survivalAt(km, 99)).toBe(0)
    expect(kaplanMeier([])).toEqual({ steps: [], n: 0, events: 0, median: null })
  })
})

describe('the log-rank test', () => {
  const [a, b, c] = [subjects(s.a), subjects(s.b), subjects(s.c)]
  const same = (got: ReturnType<typeof logRank>, want: Lr, what: string) => {
    expect(got, what).not.toBeNull()
    expect(Math.abs(got!.chi2 - want.chisq), `${what} chi-squared`).toBeLessThan(1e-9)
    expect(got!.df).toBe(want.df)
    expect(Math.abs(got!.p - want.p), `${what} p`).toBeLessThan(1e-10)
    got!.observed.forEach((o, i) => expect(o).toBe(want.observed[i]))
    got!.expected.forEach((e, i) => expect(Math.abs(e - want.expected[i])).toBeLessThan(1e-9))
  }

  it('is R’s survdiff for two groups and for three', () => {
    same(logRank([a, b]), s.ab, 'a against b')
    same(logRank([a, c]), s.ac, 'a against c')
    same(logRank([b, c]), s.bc, 'b against c')
    same(logRank([a, b, c]), s.abc, 'three groups')
  })

  it('does not depend on the order of the groups, and is not defined without two groups or without events', () => {
    expect(logRank([c, a, b])!.chi2).toBeCloseTo(s.abc.chisq, 9)
    expect(logRank([a])).toBeNull()
    expect(logRank([a, []])).toBeNull()
    expect(logRank([[{ time: 3, event: false }], [{ time: 5, event: false }]])).toBeNull()
  })
})

// ---------- on a chart ----------

import { renderSvg } from '../src/io/export'
import { validateDoc } from '../src/io/files'
import { chartLayout, curveMethodsText, isSurvival, logRankText, parseTable, survivalOf, survivalText } from '../src/model/chart'
import { applyInstruction } from '../src/model/chartCommands'
import { emptyDoc } from '../src/model/doc'
import type { ChartNode, FigNode } from '../src/model/types'

// The three groups above as a table: time first, then 1 or 0 in the column of the subject's group.
const rows = (k: Km, col: number): string[] => k.time.map((t, i) => [t, ...[0, 1, 2].map((c) => (c === col ? k.status[i] : ''))].join('\t'))
const TABLE = ['Day\tControl\tDrug A\tDrug B', ...rows(s.a, 0), ...rows(s.b, 1), ...rows(s.c, 2)].join('\n')
const chart = (extra: Partial<ChartNode> = {}): ChartNode => ({ id: 'ch', type: 'chart', x: 0, y: 0, w: 460, h: 320, rotation: 0, kind: 'scatter', survival: true, groups: parseTable(TABLE, 'scatter'), ...extra })

describe('survival curves on a chart', () => {
  it('reads times and events from the table and gives R’s medians and log-rank test', () => {
    expect(isSurvival(chart())).toBe(true)
    const { groups, test, pairs } = survivalOf(chart())
    expect(groups.map((g) => [g.name, g.km.n, g.km.events, g.km.median])).toEqual([['Control', 10, 6, 25], ['Drug A', 10, 9, 10.5], ['Drug B', 10, 4, null]])
    expect(Math.abs(test!.chi2 - s.abc.chisq)).toBeLessThan(1e-9)
    expect(test!.df).toBe(2)
    expect(logRankText(test!)).toBe('χ² = 11.5, df = 2, p = 0.0032')
    expect(survivalText(groups[0])).toBe('n = 10, 6 events, median 25')
    expect(survivalText(groups[2])).toBe('n = 10, 4 events, median not reached')
    // Pairs: each its own log-rank test, corrected by Holm over the three.
    expect(pairs.map((x) => `${x.a}/${x.b}`)).toEqual(['Control/Drug A', 'Control/Drug B', 'Drug A/Drug B'])
    const raw = [s.ab.p, s.ac.p, s.bc.p]
    const order = [...raw].sort((a, b) => a - b)
    expect(pairs[2].p!).toBeCloseTo(Math.min(1, order[0] * 3), 10)
    expect(pairs[1].p!).toBeCloseTo(Math.max(...raw), 10)
  })

  it('draws one stepped curve per group from 100 %, with a tick for every subject that left', () => {
    const d = chartLayout(chart())
    const curves = d.paths.filter((p) => p.width === 2)
    const ticks = d.paths.filter((p) => p.width === 1.4)
    expect(curves).toHaveLength(3)
    expect(ticks).toHaveLength(3)
    // Only sideways and up-and-down strokes: a step curve.
    expect(curves.every((p) => /^M[\d.]+ [\d.]+(?:[HV][\d.]+)+$/.test(p.d))).toBe(true)
    // Control has four subjects that left (19, 34, 40, 40): three places with a tick.
    expect(ticks[0].d.match(/M/g)).toHaveLength(3)
    expect(d.circles).toHaveLength(0)
    expect(d.texts.map((t) => t.text)).toEqual(expect.arrayContaining(['Survival (%)', 'Control', 'Drug A', 'Drug B', '0', '100']))
    // The curve of Drug A ends on the base line: all followed to the end had the event.
    const y = (path: string): number[] => [...path.matchAll(/V([\d.]+)/g)].map((m) => Number(m[1]))
    expect(Math.max(...y(curves[1].d))).toBeGreaterThan(Math.max(...y(curves[0].d)))
  })

  it('writes the p value of the log-rank test on the chart when asked, and a title of its own for the axis', () => {
    expect(chartLayout(chart()).texts.some((t) => t.text.startsWith('Log-rank'))).toBe(false)
    expect(chartLayout(chart({ logRank: true })).texts.map((t) => t.text)).toContain('Log-rank *p* = 0.0032')
    expect(chartLayout(chart({ yLabel: 'Tumour-free (%)' })).texts.map((t) => t.text)).toContain('Tumour-free (%)')
    const one = chart({ logRank: true, groups: parseTable(['Day\tOnly', ...s.a.time.map((t, i) => `${t}\t${s.a.status[i]}`)].join('\n'), 'scatter') })
    expect(chartLayout(one).notes.some((n) => n.startsWith('The log-rank test needs at least two groups'))).toBe(true)
  })

  it('leaves out rows that are neither 1 nor 0, or have a time below zero, and says so', () => {
    const odd = chart({ groups: parseTable('Day\tA\tB\n5\t1\t\n7\t2\t\n-3\t1\t\n9\t\t0\n12\t\t1\n14\t0.5\t', 'scatter') })
    const { groups } = survivalOf(odd)
    expect(groups.map((g) => [g.km.n, g.leftOut])).toEqual([[1, 3], [2, 0]])
    expect(chartLayout(odd).notes.some((n) => n.startsWith('3 rows are left out: a survival table has the time in the first column'))).toBe(true)
  })

  it('has a text for the methods, is kept in a saved figure, and is exported', () => {
    const text = curveMethodsText(chart())!
    expect(text).toContain('Survival was estimated by the Kaplan–Meier method')
    expect(text).toContain('Control: n = 10, 6 events, median 25; Drug A: n = 10, 9 events, median 10.5; Drug B: n = 10, 4 events, median not reached.')
    expect(text).toContain('Groups were compared with the log-rank test: χ² = 11.5, df = 2, p = 0.0032.')
    expect(text).toContain('Pairs of groups were compared by log-rank tests with Holm’s correction')
    expect(text).toContain('survival package of R (survfit, survdiff, coxph).')
    expect(text).toMatch(/Hazard ratios against .+ came from a Cox proportional hazards model/)
    const saved = validateDoc(JSON.parse(JSON.stringify({ ...emptyDoc(), nodes: [chart({ logRank: true }) as FigNode] }))).nodes[0] as ChartNode
    expect(saved).toMatchObject({ kind: 'scatter', survival: true, logRank: true })
    expect((validateDoc(JSON.parse(JSON.stringify({ ...emptyDoc(), nodes: [{ ...chart(), survival: undefined, logRank: true } as FigNode] }))).nodes[0] as ChartNode).logRank).toBeUndefined()
    expect(renderSvg({ ...emptyDoc(), nodes: [chart({ logRank: true })] }, { area: 'page', transparent: false, includeSketch: true }).svg).toContain('Log-rank')
  })

  it('can be asked for in the instruction box, from any kind of chart, and left again', () => {
    const plain: ChartNode = { ...chart(), survival: undefined }
    const on = applyInstruction(plain, 'Kaplan-Meier curves with the log-rank p value')
    expect(on.node).toMatchObject({ kind: 'scatter', survival: true, logRank: true })
    expect(on.unclear).toEqual([])
    expect(applyInstruction(chart({ logRank: true }), 'hide the log-rank test').node.logRank).toBeUndefined()
    const back = applyInstruction(chart({ logRank: true }), 'scatter chart')
    expect([back.node.kind, back.node.survival, back.node.logRank]).toEqual(['scatter', undefined, undefined])
    expect(applyInstruction(chart(), 'bar chart').node.survival).toBeUndefined()
    expect(applyInstruction(plain, 'log-rank test').unclear[0]).toContain('choose survival curves first')
    const fromBars = applyInstruction({ ...plain, kind: 'bar', groups: [{ name: 'A', values: [1, 2] }, { name: 'B', values: [0, 1] }] }, 'survival curves')
    expect(fromBars.node).toMatchObject({ kind: 'scatter', survival: true })
  })
})
