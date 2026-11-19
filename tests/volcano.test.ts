// A volcano plot from a real table of genes: every gene kept up to a large limit, a larger table
// thinned evenly (not cut off at its end), threshold lines asked for in one sentence, and names of
// genes placed clear of the points.

import { describe, expect, it } from 'vitest'
import { validateDoc } from '../src/io/files'
import { MAX_POINTS, chartLayout, placeNames, readTable, thinEvenly } from '../src/model/chart'
import { applyInstruction } from '../src/model/chartCommands'
import { emptyDoc } from '../src/model/doc'
import type { ChartNode, FigDoc } from '../src/model/types'
// tests/fixtures/volcano: limma-voom result of Fu et al. 2015 (GSE60450), from Zenodo 2529117 (CC BY 4.0).
import text from './fixtures/volcano/volcano-full.csv?raw'

const scatter = (groups: ChartNode['groups']): ChartNode => ({ id: 'c', type: 'chart', x: 0, y: 0, w: 900, h: 600, rotation: 0, kind: 'scatter', groups })
const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

describe('thinning a large table', () => {
  it('keeps every marked item and spreads the rest evenly, the same way every time', () => {
    const items = Array.from({ length: 1000 }, (_, i) => i)
    const kept = thinEvenly(items, 100, (i) => i === 3 || i === 998)
    expect(kept).toHaveLength(100)
    expect(kept).toContain(3)
    expect(kept).toContain(998)
    // Even steps: every tenth of the list keeps about a tenth of the items.
    for (let part = 0; part < 10; part++) expect(kept.filter((i) => i >= part * 100 && i < (part + 1) * 100).length).toBeGreaterThanOrEqual(9)
    expect(kept).toEqual([...kept].sort((a, b) => a - b))
    expect(thinEvenly(items, 100, (i) => i === 3 || i === 998)).toEqual(kept)
    expect(thinEvenly(items, 2000)).toBe(items)
  })

  it('a scatter series beyond the limit loses points from the whole table, not its end', () => {
    // Sorted like a table of genes: the most significant first.
    const n = MAX_POINTS + 5000
    const rows = Array.from({ length: n }, (_, i) => `${i === n - 1 ? 'LastGene' : ''}\t${(i % 7) - 3}\t${(n - i) / 1000}`)
    const r = readTable(`Gene\tlog2 FC\tp\n${rows.join('\n')}`, 'scatter')
    const g = r.groups[0]
    expect(g.values).toHaveLength(MAX_POINTS)
    expect(r.droppedValues).toBe(5000)
    expect(r.thinned).toBe(true)
    // The bottom of the volcano is still there, and the named gene too.
    expect(Math.min(...g.values)).toBeLessThan(0.01)
    expect(g.labels?.filter(Boolean)).toEqual(['LastGene'])
  })

  it('a saved scatter chart keeps more points than a group of other charts takes', () => {
    const values = Array.from({ length: 12000 }, (_, i) => i / 100)
    const node = scatter([{ name: 'Genes', values, xs: values.map((v) => -v) }])
    const back = validateDoc(JSON.parse(JSON.stringify({ ...emptyDoc(), nodes: [node] } as FigDoc))).nodes[0] as ChartNode
    expect(back.groups[0].values).toHaveLength(12000)
    expect(back.groups[0].xs).toHaveLength(12000)
  })
})

describe('threshold lines in one sentence', () => {
  const node = scatter([{ name: 'NS', values: [1, 2, 3], xs: [-1, 0, 1] }])
  const lines = (text: string) => {
    const r = applyInstruction(node, text)
    expect(r.unclear).toEqual([])
    return r.node.refLines
  }
  it('reads a value for each x it names', () => {
    expect(lines('upright dashed lines at x = -0.58 and x = 0.58')).toEqual([{ axis: 'x', value: -0.58 }, { axis: 'x', value: 0.58 }])
    expect(lines('upright lines at x = -1, x = 1')).toEqual([{ axis: 'x', value: -1 }, { axis: 'x', value: 1 }])
  })
  it('reads ± as a line on either side of zero', () => {
    expect(lines('dotted upright lines at x = ±1')).toEqual([{ axis: 'x', value: -1, dash: 'dotted' }, { axis: 'x', value: 1, dash: 'dotted' }])
  })
  it('still cuts two requests apart', () => {
    const r = applyInstruction(node, 'upright line at x = 1 and line at 2')
    expect(r.unclear).toEqual([])
    expect(r.node.refLines).toEqual([{ axis: 'x', value: 1 }, { axis: 'y', value: 2 }])
  })
})

describe('placing names of points', () => {
  const plot = { x: 0, y: 0, w: 400, h: 400 }
  it('moves a name off a cloud of points', () => {
    // A thick cloud right of the point: the name goes left.
    const marks = [{ cx: 200, cy: 200, r: 3 }]
    for (let x = 206; x < 300; x += 4) for (let y = 180; y < 220; y += 4) marks.push({ cx: x, cy: y, r: 3 })
    const [p] = placeNames([{ name: 'Egf', cx: 200, cy: 200, gap: 5, w: 24, h: 12 }], marks, plot)
    expect(p.x + 24).toBeLessThanOrEqual(200)
    expect(p.leader).toBeUndefined()
  })
  it('steps out with a leader line when every near place is covered', () => {
    const marks = []
    for (let x = 150; x <= 250; x += 4) for (let y = 170; y <= 230; y += 4) marks.push({ cx: x, cy: y, r: 3 })
    const [p] = placeNames([{ name: 'Lif', cx: 198, cy: 198, gap: 5, w: 20, h: 12 }], marks, plot)
    expect(p.leader).toBeDefined()
    expect(Math.hypot(p.x + 10 - 198, p.y + 6 - 198)).toBeGreaterThan(15)
  })
  it('stays right of its point where nothing is in the way, as before', () => {
    const [p] = placeNames([{ name: 'A', cx: 100, cy: 100, gap: 5, w: 10, h: 12 }], [{ cx: 100, cy: 100, r: 3 }], plot)
    expect(p).toEqual({ name: 'A', x: 105, y: 94 })
  })
})

describe('the volcano plot of the Galaxy training data', () => {
  const r = readTable(text, 'scatter')
  it('takes every gene', () => {
    expect(r.droppedValues).toBe(0)
    expect(r.groups.map((g) => [g.name, g.values.length])).toEqual([['Not significant', 14194], ['Higher in pregnant', 669], ['Higher in lactating', 941]])
  })
  it('writes every name, none over another, and few over points', () => {
    const node = { ...scatter(r.groups), refLines: [{ axis: 'x' as const, value: -0.58 }, { axis: 'x' as const, value: 0.58 }] }
    const d = chartLayout(node)
    const names = new Set(r.groups.flatMap((g) => g.labels ?? []).filter(Boolean))
    const written = d.texts.filter((t) => names.has(t.text))
    expect(written).toHaveLength(names.size)
    const boxes = written.map((t) => ({ x: t.x, y: t.y, w: t.text.length * (t.fontSize ?? 11) * 0.6, h: (t.fontSize ?? 11) * 1.25 }))
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) expect(overlap(boxes[i], boxes[j]), `${written[i].text} / ${written[j].text}`).toBe(false)
    expect(d.notes.join(' ')).not.toMatch(/thinned|cut off/)
  })
})

// ---------- which names are written ----------

import { POINT_NAMES_TOP, pickNames, pointNamesIn, splitNameList, usablePointNames } from '../src/model/chart'
import { describePointNames } from '../src/model/chartCommands'
import limma from './fixtures/volcano/limma-voom_luminalpregnant-luminallactate.tsv?raw'

describe('picking the names to write', () => {
  // A plot 100 wide and 100 high, x = 0 in the middle, the bottom at 100.
  const pts = [
    { name: 'A', series: 'NS', cx: 52, cy: 95 },
    { name: 'B', series: 'Up', cx: 90, cy: 60 },
    { name: 'C', series: 'Up', cx: 60, cy: 10 },
    { name: 'D', series: 'Down', cx: 5, cy: 50 },
    { name: 'E', series: 'Down', cx: 40, cy: 20 },
  ]
  const pick = (s?: Parameters<typeof pickNames>[1]) => pickNames(pts, s, 50, 100, { w: 100, h: 100 }).map((p) => p.name)
  it('writes every named point in the order of the table by default', () => {
    expect(pick()).toEqual(['A', 'B', 'C', 'D', 'E'])
    expect(pick({ show: 'none', always: ['A'] })).toEqual([])
  })
  it('ranks the top ones by distance, height or change', () => {
    // Distances: A 0.05, B 0.57, C 0.91, D 0.67, E 0.81.
    expect(pick({ show: 'top', top: 2 })).toEqual(['C', 'E'])
    expect(pick({ show: 'top', top: 2, by: 'y' })).toEqual(['C', 'E'])
    expect(pick({ show: 'top', top: 2, by: 'x' })).toEqual(['D', 'B'])
  })
  it('keeps to one side of x = 0, or takes the top on each side', () => {
    expect(pick({ show: 'top', top: 1, side: 'up' })).toEqual(['C'])
    expect(pick({ show: 'top', top: 1, side: 'down' })).toEqual(['E'])
    expect(pick({ show: 'top', top: 1, side: 'each' })).toEqual(['C', 'E'])
    expect(pick({ show: 'top', top: 1, side: 'each', by: 'x' })).toEqual(['D', 'B'])
    expect(pick({ show: 'table', side: 'down' })).toEqual(['D', 'E'])
  })
  it('takes points of the chosen series only, and always the names listed', () => {
    expect(pick({ show: 'top', top: 1, series: ['Down'] })).toEqual(['E'])
    expect(pick({ show: 'top', top: 1, series: ['Down'], always: ['a'] })).toEqual(['A', 'E'])
    expect(pick({ show: 'table', series: [], always: ['B', 'D'] })).toEqual(['B', 'D'])
  })
  it('writes no more than 100 names', () => {
    const many = Array.from({ length: 300 }, (_, i) => ({ name: `g${i}`, series: 'S', cx: i, cy: i }))
    expect(pickNames(many, { show: 'table' }, 0, 300, { w: 300, h: 300 })).toHaveLength(100)
  })
})

describe('keeping the setting', () => {
  it('drops what it cannot use, and the usual setting is no setting', () => {
    expect(usablePointNames({ show: 'table' })).toBeUndefined()
    expect(usablePointNames({ show: 'maybe' })).toBeUndefined()
    expect(usablePointNames({ show: 'top', top: POINT_NAMES_TOP, by: 'distance' })).toEqual({ show: 'top' })
    expect(usablePointNames({ show: 'top', top: 500, by: 'p', side: 'middle', series: ['Up', 3, '', 'Up'], always: [' Egf ', '<b>'] })).toEqual({ show: 'top', series: ['Up'], always: ['Egf', '<b>'] })
  })
  it('survives saving and reopening unchanged, on scatter charts only', () => {
    const pointNames = { show: 'top' as const, top: 5, by: 'y' as const, side: 'each' as const, series: ['Up', 'Down'], always: ['Egf'] }
    const node = { ...scatter([{ name: 'Up', values: [1], xs: [1], labels: ['Egf'] }]), pointNames }
    const back = (n: ChartNode) => validateDoc(JSON.parse(JSON.stringify({ ...emptyDoc(), nodes: [n] } as FigDoc))).nodes[0] as ChartNode
    expect(back(node).pointNames).toEqual(pointNames)
    expect(back({ ...node, kind: 'bar' }).pointNames).toBeUndefined()
  })
  it('reads a pasted list of names', () => {
    expect(splitNameList('Egf, Lif;Csf1\nKitl\tPdgfb', [])).toEqual(['Egf', 'Lif', 'Csf1', 'Kitl', 'Pdgfb'])
    expect(splitNameList('Egf Lif, Sample 1', ['Sample 1'])).toEqual(['Egf', 'Lif', 'Sample 1'])
  })
})

describe('names on the volcano plot of every gene', () => {
  // Every gene keeps its name in the table: the chart chooses which to write.
  const rows = limma.trim().split('\n').slice(1).map((l) => l.split('\t'))
  const table = `Gene\tlog2 FC\tGenes\n${rows.map((c) => `${c[1]}\t${c[3]}\t${-Math.log10(Number(c[6]))}`).join('\n')}`
  const groups = readTable(table, 'scatter').groups
  const node = scatter(groups)
  const written = (n: ChartNode) => {
    const names = new Set(pointNamesIn(n.groups))
    return chartLayout(n).texts.filter((t) => names.has(t.text)).map((t) => t.text)
  }
  const fc = new Map(rows.map((c) => [c[1], Number(c[3])]))
  it('has a name for every gene', () => {
    expect(groups[0].values.length).toBe(rows.length)
    expect(pointNamesIn(groups).length).toBeGreaterThan(15000)
  })
  it('writes 100 names by default and says how to choose', () => {
    expect(written(node)).toHaveLength(100)
    expect(chartLayout(node).notes.join(' ')).toMatch(/Choose “Top”/)
  })
  it('writes the top 10 on each side, up right and down left', () => {
    const names = written({ ...node, pointNames: { show: 'top', side: 'each' } })
    expect(names).toHaveLength(20)
    expect(names.filter((n) => fc.get(n)! > 0)).toHaveLength(10)
    expect(names.filter((n) => fc.get(n)! < 0)).toHaveLength(10)
    // The most significant gene of the table is among them.
    expect(names).toContain('Csn1s2b')
  })
  it('writes up-regulated genes only, and the genes always asked for', () => {
    const names = written({ ...node, pointNames: { show: 'top', top: 5, side: 'up', always: ['Egf'] } })
    expect(names[0]).toBe('Egf')
    expect(names.slice(1).every((n) => fc.get(n)! > 0)).toBe(true)
    expect(chartLayout({ ...node, pointNames: { show: 'top', always: ['NoSuchGene'] } }).notes.join(' ')).toMatch(/Not found among the named points: NoSuchGene/)
  })
  it('writes none when asked', () => {
    expect(written({ ...node, pointNames: { show: 'none' } })).toEqual([])
  })
})

describe('names in the instruction box', () => {
  const node = scatter([
    { name: 'NS', values: [0.5, 1], xs: [0.1, -0.2], labels: ['Actb', 'Gapdh'] },
    { name: 'Up', values: [5, 3], xs: [2, 1.5], labels: ['Lif', 'Csf1'] },
    { name: 'Down', values: [8, 4], xs: [-3, -1], labels: ['Egf', 'Set'] },
  ])
  const names = (text: string, from: ChartNode = node) => {
    const r = applyInstruction(from, text)
    expect(r.unclear, text).toEqual([])
    expect(r.done.length, text).toBeGreaterThan(0)
    return r.node.pointNames
  }
  it('reads top N, the ranking and the sides', () => {
    expect(names('name the top 10 genes')).toEqual({ show: 'top' })
    expect(names('label the top 5 up and down regulated genes')).toEqual({ show: 'top', top: 5, side: 'each' })
    expect(names('names of the 20 most significant genes')).toEqual({ show: 'top', top: 20, by: 'y' })
    expect(names('top 3 genes by fold change, up-regulated only')).toEqual({ show: 'top', top: 3, by: 'x', side: 'up' })
    expect(names('label down-regulated genes')).toEqual({ show: 'table', side: 'down' })
  })
  it('reads series, genes to point out, and hiding', () => {
    expect(names('names from Up and Down')).toEqual({ show: 'table', series: ['Up', 'Down'] })
    expect(names('label Egf and Lif')).toEqual({ show: 'table', always: ['Egf', 'Lif'] })
    expect(names('label only Egf')).toEqual({ show: 'table', series: [], always: ['Egf'] })
    expect(names('hide names')).toEqual({ show: 'none' })
    expect(names('show names', { ...node, pointNames: { show: 'none' } })).toBeUndefined()
  })
  it('does not take a word of the instruction for a gene', () => {
    expect(names('set the top 10 names')).toEqual({ show: 'top' })
  })
  it('says the setting in words', () => {
    expect(describePointNames({ ...node, pointNames: { show: 'top', top: 5, side: 'each' } })).toBe('Names are written for the 5 on each side of x = 0 furthest out from x = 0 and the bottom.')
    expect(describePointNames({ ...node, pointNames: { show: 'table', series: [], always: ['Egf'] } })).toBe('Names are written for Egf.')
  })
  it('lines and titles in a scatter chart are read as before', () => {
    const r = applyInstruction(node, 'upright line at x = 1 labelled cut-off and line at 2')
    expect(r.unclear).toEqual([])
    expect(r.node.refLines).toEqual([{ axis: 'x', value: 1, label: 'cut-off' }, { axis: 'y', value: 2 }])
  })
})
