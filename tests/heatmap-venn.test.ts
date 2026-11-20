// Heat maps and Venn diagrams: reading their tables, the arithmetic, the drawing, and files.

import { describe, expect, it } from 'vitest'
import { chartFamily, chartLayout, crossTable, hasPoints, headRows, isGrouped, readTable, renameSeries, renameVenn, tableText } from '../src/model/chart'
import { correlation } from '../src/model/chartStats'
import { HEAT_ROWS, HEAT_SCALES, heatColour, heatMatrix, heatSummary } from '../src/model/heatmap'
import { regionName, renameVennSet, vennOf, vennParts } from '../src/model/venn'
import { applyInstruction } from '../src/model/chartCommands'
import { validateDoc } from '../src/io/files'
import type { ChartGroup, ChartNode } from '../src/model/types'

const chart = (more: Partial<ChartNode>): ChartNode => ({ id: 'c', type: 'chart', x: 0, y: 0, w: 420, h: 300, rotation: 0, kind: 'heatmap', groups: [], ...more })
const reopened = (node: ChartNode): ChartNode => validateDoc({ app: 'biosketch', version: 1, name: 't', width: 600, height: 400, background: '#ffffff', nodes: [node], customIcons: {} }).nodes[0] as ChartNode

const EXPRESSION = ['Name\tCtrl 1\tCtrl 2\tDrug 1\tDrug 2', 'Il6\t2\t4\t8\t10', 'Tnf\t5\t5\t11\t13', 'Actb\t100\t100\t100\t100', 'Myc\t14\t12\t6\t'].join('\n')

describe('the table of a heat map', () => {
  it('takes a first column of words as the names of the rows', () => {
    const report = readTable(EXPRESSION, 'heatmap')
    expect(report.unread).toBe(0)
    expect(report.groups.map((g) => g.name)).toEqual(['Ctrl 1', 'Ctrl 2', 'Drug 1', 'Drug 2'])
    expect(report.groups[0]).toEqual({ name: 'Ctrl 1', values: [2, 5, 100, 14], labels: ['Il6', 'Tnf', 'Actb', 'Myc'] })
    // A column with a gap keeps the names of the rows it does have.
    expect(report.groups[3]).toEqual({ name: 'Drug 2', values: [10, 13, 100], labels: ['Il6', 'Tnf', 'Actb'] })
  })

  it('is written back as it was read', () => {
    const groups = readTable(EXPRESSION, 'heatmap').groups
    expect(tableText(groups, 'heatmap')).toBe(EXPRESSION.replace(/\t$/, '\t'))
    expect(readTable(tableText(groups, 'heatmap'), 'heatmap').groups).toEqual(groups)
    // A gap in the middle of a column survives too.
    const gap = readTable('Name\tA\tB\ng1\t1\t2\ng2\t\t3\ng3\t4\t5', 'heatmap').groups
    expect(gap[0]).toEqual({ name: 'A', values: [1, 4], rows: [0, 2], labels: ['g1', 'g3'] })
    expect(readTable(tableText(gap, 'heatmap'), 'heatmap').groups).toEqual(gap)
  })

  it('reads a table without row names as plain columns, and other kinds never take a column of names', () => {
    expect(readTable('A\tB\n1\t2\n3\t4', 'heatmap').groups).toEqual([{ name: 'A', values: [1, 3] }, { name: 'B', values: [2, 4] }])
    const asBars = readTable(EXPRESSION, 'bar')
    expect(asBars.groups[0].name).toBe('Name')
    expect(asBars.unread).toBe(4)
  })

  it('keeps categories above the columns', () => {
    const text = '\tWT\tWT\tKO\nName\ta\tb\ta\ng1\t1\t2\t3\ng2\t4\t5\t6'
    const groups = readTable(text, 'heatmap').groups
    expect(groups.map((g) => `${g.category}|${g.name}`)).toEqual(['WT|a', 'WT|b', 'KO|a'])
    expect(headRows(groups, 'heatmap')).toBe(2)
    expect(readTable(tableText(groups, 'heatmap'), 'heatmap').groups).toEqual(groups)
    expect(heatMatrix(chart({ groups })).columns).toEqual(['WT · a', 'WT · b', 'KO · a'])
  })
})

describe('what a heat map shows', () => {
  const groups = readTable(EXPRESSION, 'heatmap').groups

  it('is the values, with the scale from the smallest to the largest', () => {
    const m = heatMatrix(chart({ groups }))
    expect(m.rows).toEqual(['Il6', 'Tnf', 'Actb', 'Myc'])
    expect(m.cells[0]).toEqual([2, 4, 8, 10])
    expect(m.cells[3]).toEqual([14, 12, 6, null])
    expect([m.unit, m.lo, m.hi, m.scale.id]).toEqual(['value', 2, 100, 'viridis'])
    expect(heatSummary(m)).toBe('4 rows and 4 columns. The colours show values from 2 to 100.')
  })

  it('scales every row to its own mean and standard deviation, as R’s scale() does', () => {
    const m = heatMatrix(chart({ groups, heatByRow: true }))
    expect(m.unit).toBe('z')
    // R 4.4: as.numeric(scale(c(2, 4, 8, 10))) gives -1.0954451150 -0.5477225575 0.5477225575 1.0954451150
    expect(m.cells[0].map((v) => Number(v!.toFixed(7)))).toEqual([-1.0954451, -0.5477226, 0.5477226, 1.0954451])
    // as.numeric(scale(c(14, 12, 6))) gives 0.8006407690 0.3202563076 -1.1208970766
    expect(m.cells[3].slice(0, 3).map((v) => Number(v!.toFixed(7)))).toEqual([0.8006408, 0.3202563, -1.1208971])
    expect(m.cells[3][3]).toBeNull()
    // A row whose values are all the same has no spread: it is left empty and the scientist is told.
    expect(m.cells[2]).toEqual([null, null, null, null])
    expect(m.notes.join(' ')).toContain('1 row has one value only, or values that are all the same')
    // Two colours around a middle, and the middle at zero.
    expect(m.scale.id).toBe('bluered')
    expect(m.lo).toBeCloseTo(-m.hi, 12)
  })

  it('follows the logarithm on a logarithmic scale and leaves out what has none', () => {
    const m = heatMatrix(chart({ groups: [{ name: 'A', values: [1, 10, 0, 1000] }], yLog: true }))
    expect(m.unit).toBe('log')
    expect(m.cells.map((row) => row[0])).toEqual([0, 1, null, 3])
    expect(m.shown.map((row) => row[0])).toEqual([1, 10, 0, 1000])
    expect(m.notes.join(' ')).toContain('1 value is zero or below')
    expect(heatSummary(m)).toContain('from 1 to 1000')
    // Scaled rows on a logarithmic scale are scaled logarithms.
    const z = heatMatrix(chart({ groups: [{ name: 'A', values: [1] }, { name: 'B', values: [10] }, { name: 'C', values: [100] }], yLog: true, heatByRow: true }))
    expect(z.cells[0].map((v) => Number(v!.toFixed(6)))).toEqual([-1, 0, 1])
  })

  it('takes the ends of the scale the scientist sets, and keeps a middle of two colours at zero otherwise', () => {
    expect(heatMatrix(chart({ groups, yMin: 0, yMax: 20 }))).toMatchObject({ lo: 0, hi: 20 })
    const around = heatMatrix(chart({ groups: [{ name: 'A', values: [-1, 3] }], heatScale: 'purpleorange' }))
    expect([around.lo, around.hi, around.scale.id]).toEqual([-3, 3, 'purpleorange'])
    expect(heatMatrix(chart({ groups: [{ name: 'A', values: [-1, 3] }], heatScale: 'bluered', yMin: -1 }))).toMatchObject({ lo: -1, hi: 3 })
    // On a logarithmic scale the ends are given as values.
    expect(heatMatrix(chart({ groups: [{ name: 'A', values: [5, 50] }], yLog: true, yMin: 1, yMax: 100 }))).toMatchObject({ lo: 0, hi: 2 })
    // One value only still has a scale of some width.
    const one = heatMatrix(chart({ groups: [{ name: 'A', values: [7] }] }))
    expect(one.hi).toBeGreaterThan(one.lo)
  })

  it('shows the correlation of every column with every other', () => {
    const cols: ChartGroup[] = [
      { name: 'a', values: [1, 2, 3, 4, 5] },
      { name: 'b', values: [2, 4, 5, 4, 5] },
      { name: 'c', values: [5, 3, 4, 1, 2], rows: [0, 1, 2, 4, 5] },
    ]
    const m = heatMatrix(chart({ groups: cols, corr: 'pearson' }))
    expect([m.unit, m.lo, m.hi, m.scale.id]).toEqual(['r', -1, 1, 'bluered'])
    expect(m.rows).toEqual(['a', 'b', 'c'])
    expect(m.cells[0][0]).toBeCloseTo(1, 12)
    // R 4.4: cor(1:5, c(2, 4, 5, 4, 5)) gives 0.7745966692
    expect(m.cells[0][1]).toBeCloseTo(0.7745967, 6)
    expect(m.cells[1][0]).toBe(m.cells[0][1])
    // Only rows in which both columns have a value count: a with c over rows 0, 1, 2 and 4.
    expect(m.cells[0][2]).toBeCloseTo(correlation([[1, 5], [2, 3], [3, 4], [5, 1]], 'pearson')!.r, 12)
    const ranks = heatMatrix(chart({ groups: cols, corr: 'spearman' }))
    expect(ranks.cells[0][1]).toBeCloseTo(correlation([[1, 2], [2, 4], [3, 5], [4, 4], [5, 5]], 'spearman')!.r, 12)
    // Too few rows in common: no number, and a word about it.
    const few = heatMatrix(chart({ groups: [{ name: 'a', values: [1, 2] }, { name: 'b', values: [2, 1] }], corr: 'pearson' }))
    expect(few.cells[0][1]).toBeNull()
    expect(few.notes).toHaveLength(1)
  })

  it('draws no more rows than it says', () => {
    const tall = heatMatrix(chart({ groups: [{ name: 'A', values: Array.from({ length: HEAT_ROWS + 50 }, (_, i) => i) }] }))
    expect(tall.cells).toHaveLength(HEAT_ROWS)
    expect(tall.notes[0]).toContain(`the first ${HEAT_ROWS} of the ${HEAT_ROWS + 50}`)
  })

  it('has colour scales that run from their first colour to their last', () => {
    for (const scale of HEAT_SCALES) {
      expect(heatColour(scale, 0)).toBe(scale.stops[0].toLowerCase())
      expect(heatColour(scale, 1)).toBe(scale.stops[scale.stops.length - 1].toLowerCase())
      expect(heatColour(scale, -5)).toBe(heatColour(scale, 0))
      expect(heatColour(scale, 7)).toBe(heatColour(scale, 1))
      expect(heatColour(scale, 0.37)).toMatch(/^#[0-9a-f]{6}$/)
    }
    // Halfway between two stops is halfway between their colours; the middle of two colours is the white stop.
    expect(heatColour(HEAT_SCALES.find((s) => s.id === 'greys')!, 0.125)).toBe('#e2e2e2')
    expect(heatColour(HEAT_SCALES.find((s) => s.id === 'bluered')!, 0.5)).toBe('#f7f7f7')
  })
})

describe('a heat map as it is drawn', () => {
  const groups = readTable(EXPRESSION, 'heatmap').groups

  it('has a cell for every place of the table, names beside the rows and under the columns, and a scale', () => {
    const d = chartLayout(chart({ groups, title: 'Expression' }))
    const cells = d.rects.filter((r) => r.w > 20)
    expect(cells).toHaveLength(16)
    // The cell without a number is drawn empty, not in a colour of the scale.
    expect(cells.filter((r) => r.fill === '#eef0f3')).toHaveLength(1)
    const words = d.texts.map((t) => t.text)
    for (const name of ['Expression', 'Il6', 'Tnf', 'Actb', 'Myc', 'Ctrl 1', 'Drug 2', '100', '2']) expect(words).toContain(name)
    // The scale: a bar of small steps beside the cells.
    expect(d.rects.filter((r) => r.w === 12)).toHaveLength(32)
    expect(chartLayout(chart({ groups, legend: 'none' })).rects.filter((r) => r.w === 12)).toHaveLength(0)
  })

  it('writes the numbers in the cells when asked, readable on their colour', () => {
    const d = chartLayout(chart({ groups, heatNumbers: true, w: 520, h: 360 }))
    const numbers = d.texts.filter((t) => ['2', '4', '8', '10', '100', '14'].includes(t.text))
    expect(numbers.length).toBeGreaterThanOrEqual(8)
    expect(new Set(numbers.map((t) => t.fill)).size).toBe(2)
    // Too small a chart says so and writes none, instead of numbers that run into each other.
    const small = chartLayout(chart({ groups, heatNumbers: true, w: 90, h: 70 }))
    expect(small.notes.join(' ')).toContain('The numbers do not fit in the cells')
  })

  it('turns long column names upright and says when rows are too thin for names', () => {
    const long = groups.map((g, i) => ({ ...g, name: `A rather long sample name ${i}` }))
    expect(chartLayout(chart({ groups: long })).texts.filter((t) => t.rotation === -90).length).toBe(4)
    const many = readTable(['Name\tA', ...Array.from({ length: 120 }, (_, i) => `g${i}\t${i}`)].join('\n'), 'heatmap').groups
    expect(chartLayout(chart({ groups: many, h: 200 })).notes.join(' ')).toContain('The rows are too thin for their names')
  })

  it('draws an empty table as a request for numbers, and draws whatever a figure can hold', () => {
    expect(chartLayout(chart({ groups: [] })).texts.map((t) => t.text)).toEqual(['Paste a table of numbers in the panel'])
    for (const values of [[0], [1e-300, 1e99], [-5, -5, -5]]) {
      for (const more of [{}, { yLog: true }, { heatByRow: true }, { corr: 'pearson' as const }, { heatNumbers: true }]) {
        expect(() => chartLayout(chart({ groups: [{ name: 'A', values }, { name: 'B', values }], ...more }))).not.toThrow()
      }
    }
  })
})

const LISTS = ['RNA\tProtein\tChIP', 'TP53\tTP53\tMYC', 'MYC\tmyc\tJUN', 'JUN\tFOS\tTP53', 'EGFR\tAKT1\tSTAT3', 'KRAS\tKRAS\tGATA1', 'BRCA1\t\tAKT1'].join('\n')

describe('the table of a Venn diagram', () => {
  it('reads every column as the names of one set', () => {
    const report = readTable(LISTS, 'venn')
    expect(report.unread).toBe(0)
    expect(report.head).toBe(1)
    expect(report.groups.map((g) => [g.name, g.labels!.length, g.values.length])).toEqual([['RNA', 6, 6], ['Protein', 5, 5], ['ChIP', 6, 6]])
    expect(report.groups[1].labels).toEqual(['TP53', 'myc', 'FOS', 'AKT1', 'KRAS'])
    expect(readTable(tableText(report.groups, 'venn'), 'venn').groups).toEqual(report.groups)
  })

  it('reads numbers as names too when there is more than one row of them, and a single row as sizes', () => {
    const ids = readTable('A\tB\n7157\t7157\n4609\t672', 'venn').groups
    expect(ids[0].labels).toEqual(['7157', '4609'])
    const sizes = readTable('A\tB\tA & B\n120\t85\t30', 'venn').groups
    expect(sizes).toEqual([{ name: 'A', values: [120] }, { name: 'B', values: [85] }, { name: 'A & B', values: [30] }])
    expect(readTable(tableText(sizes, 'venn'), 'venn').groups).toEqual(sizes)
    // Lists without a row of names are sets named for the scientist.
    expect(readTable('TP53\tMYC\nJUN\tTP53', 'venn', 0).groups.map((g) => g.name)).toEqual(['Set 1', 'Set 2'])
  })

  it('never has more than one row of names, nor categories', () => {
    const groups = readTable(LISTS, 'venn').groups
    expect(headRows(groups, 'venn')).toBe(1)
    expect(isGrouped(chart({ kind: 'venn', groups: groups.map((g) => ({ ...g, category: 'x' })) }))).toBe(false)
    expect(hasPoints(chart({ kind: 'venn', groups, points: true }))).toBe(false)
    expect(hasPoints(chart({ kind: 'heatmap', groups, points: true }))).toBe(false)
  })
})

describe('what the sets of a Venn diagram share', () => {
  const data = vennOf(readTable(LISTS, 'venn').groups)
  const count = (...sets: number[]): number => data.regions.find((r) => r.sets.join() === sets.join())!.count

  it('is counted from the lists, whatever the capitals', () => {
    expect(data.lists).toBe(true)
    expect(data.sets.map((s) => [s.name, s.total])).toEqual([['RNA', 6], ['Protein', 5], ['ChIP', 6]])
    expect([count(0), count(1), count(2)]).toEqual([2, 1, 2])
    expect([count(0, 1), count(0, 2), count(1, 2)]).toEqual([1, 1, 1])
    expect(count(0, 1, 2)).toBe(2)
    expect(data.union).toBe(10)
    // Every member is in exactly one part of the diagram.
    expect(data.regions.reduce((a, r) => a + r.count, 0)).toBe(data.union)
    expect(data.regions.find((r) => r.sets.join() === '0,1,2')!.names).toEqual(['TP53', 'MYC'])
    expect(data.regions.find((r) => r.sets.join() === '0')!.names).toEqual(['EGFR', 'BRCA1'])
  })

  it('counts a name once, however often a list repeats it', () => {
    const twice = vennOf([{ name: 'A', values: [1, 1, 1], labels: ['x', 'X', ' x '] }, { name: 'B', values: [1], labels: ['y'] }])
    expect(twice.sets.map((s) => s.total)).toEqual([1, 1])
    expect(twice.union).toBe(2)
  })

  it('names every part in words', () => {
    expect(data.regions.map((r) => regionName(data, r))).toEqual(['Only RNA', 'Only Protein', 'Only ChIP', 'RNA and Protein, not ChIP', 'RNA and ChIP, not Protein', 'Protein and ChIP, not RNA', 'RNA, Protein and ChIP'])
    const two = vennOf(readTable('A\tB\tA & B\n120\t85\t30', 'venn').groups)
    expect(two.regions.map((r) => `${regionName(two, r)}: ${r.count}`)).toEqual(['Only A: 90', 'Only B: 55', 'A and B: 30'])
  })

  it('works the parts out from sizes: each set whole, each overlap as what is shared', () => {
    const three = vennOf(readTable('A\tB\tC\tA & B\tA&C\tB ∩ C\tA & B & C\n100\t80\t60\t30\t20\t10\t5', 'venn').groups)
    expect(three.lists).toBe(false)
    const part = (...sets: number[]): number => three.regions.find((r) => r.sets.join() === sets.join())!.count
    expect([part(0), part(1), part(2)]).toEqual([55, 45, 35])
    expect([part(0, 1), part(0, 2), part(1, 2), part(0, 1, 2)]).toEqual([25, 15, 5, 5])
    expect(three.union).toBe(185)
    // An overlap that is not given is empty.
    expect(vennOf(readTable('A\tB\n10\t4', 'venn').groups).regions.map((r) => r.count)).toEqual([10, 4, 0])
  })

  it('refuses sizes that cannot be true, and says what it left out', () => {
    const wrong = vennOf(readTable('A\tB\tA & B\n10\t20\t15', 'venn').groups)
    expect(wrong.problem).toContain('do not fit together')
    expect(wrong.regions).toEqual([])
    const stray = vennOf(readTable('A\tB\tA & Z\n10\t20\t5', 'venn').groups)
    expect(stray.notes.join(' ')).toContain('“A & Z” names a set the table does not have')
    expect(stray.regions.map((r) => r.count)).toEqual([10, 20, 0])
    const four = vennOf(readTable('A\tB\tC\tD\tA & D\n1\t2\t3\t4\t1', 'venn').groups)
    expect(four.sets.map((s) => s.name)).toEqual(['A', 'B', 'C'])
    expect(four.notes).toEqual(['A Venn diagram is drawn for two or three sets: the first 3 of the 4 are used.'])
  })

  it('renames a set, and with it the columns that say what it shares', () => {
    const groups = readTable('A\tB\tA & B\n120\t85\t30', 'venn').groups
    expect(renameVennSet(groups, 0, 'Liver').map((g) => g.name)).toEqual(['Liver', 'B', 'Liver & B'])
    expect(vennParts('Liver & B')).toEqual(['Liver', 'B'])
    const node = chart({ kind: 'venn', groups })
    expect(renameVenn(node, 1, 'Kidney').change?.groups?.map((g) => g.name)).toEqual(['A', 'Kidney', 'A & Kidney'])
    expect(renameVenn(node, 1, 'a').problem).toContain('Another set is called')
    expect(renameVenn(node, 1, 'R&D').problem).toContain('cannot hold it')
    expect(renameVenn(node, 1, 'B')).toEqual({})
    // In lists a name may hold “&”: nothing is joined by it there.
    const lists = chart({ kind: 'venn', groups: readTable(LISTS, 'venn').groups })
    expect(renameVenn(lists, 0, 'R&D').change?.groups?.[0].name).toBe('R&D')
    expect(renameSeries(chart({ kind: 'heatmap', groups: readTable(EXPRESSION, 'heatmap').groups }), 0, 'Control 1').change?.groups?.[0]).toMatchObject({ name: 'Control 1', labels: ['Il6', 'Tnf', 'Actb', 'Myc'] })
  })
})

describe('a Venn diagram as it is drawn', () => {
  const groups = readTable(LISTS, 'venn').groups

  it('has a circle and a name for every set and a number for every part', () => {
    const d = chartLayout(chart({ kind: 'venn', groups, w: 330, h: 340 }))
    expect(d.circles.filter((c) => !c.ring)).toHaveLength(3)
    expect(d.circles.filter((c) => c.ring)).toHaveLength(3)
    expect(new Set(d.circles.map((c) => c.r)).size).toBe(1)
    expect(d.circles.filter((c) => !c.ring).every((c) => c.opacity! < 1)).toBe(true)
    const words = d.texts.map((t) => t.text)
    expect(words.filter((t) => /^\d+$/.test(t)).sort()).toEqual(['1', '1', '1', '1', '2', '2', '2'])
    expect(words).toEqual(expect.arrayContaining(['RNA (6)', 'Protein (5)', 'ChIP (6)']))
    // Every number stands inside the circles of its sets and outside the others.
    const centres = d.circles.filter((c) => !c.ring)
    const data = vennOf(groups)
    const numbers = d.texts.filter((t) => /^\d+$/.test(t.text))
    numbers.forEach((t, i) => {
      const [x, y] = [t.x, t.y + (t.fontSize * 1.25) / 2]
      centres.forEach((c, k) => expect(Math.hypot(x - c.cx, y - c.cy) < c.r).toBe(data.regions[i].sets.includes(k)))
    })
  })

  it('writes shares of all members, or nothing', () => {
    const two = readTable('A\tB\tA & B\n120\t85\t30', 'venn').groups
    const shares = chartLayout(chart({ kind: 'venn', groups: two, vennLabels: 'percent' })).texts.map((t) => t.text)
    expect(shares).toEqual(expect.arrayContaining(['51 %', '31 %', '17 %']))
    expect(chartLayout(chart({ kind: 'venn', groups: two, vennLabels: 'none' })).texts.map((t) => t.text)).toEqual(['A (120)', 'B (85)'])
  })

  it('draws nothing it cannot stand for', () => {
    expect(chartLayout(chart({ kind: 'venn', groups: [] })).texts.map((t) => t.text)).toEqual(['Paste one column of names for each set in the panel'])
    const wrong = chartLayout(chart({ kind: 'venn', groups: readTable('A\tB\tA & B\n10\t20\t15', 'venn').groups }))
    expect(wrong.circles).toHaveLength(0)
    expect(wrong.notes.join(' ')).toContain('do not fit together')
    expect(chartLayout(chart({ kind: 'venn', groups: [{ name: 'Alone', values: [5] }] })).circles).toHaveLength(2)
  })
})

describe('heat maps and Venn diagrams in a figure', () => {
  it('are kept as they are when the figure is saved and opened', () => {
    const heat = chart({ groups: readTable(EXPRESSION, 'heatmap').groups, heatScale: 'purpleorange', heatByRow: true, heatNumbers: true, yLog: true, yMin: 1, yMax: 200, legend: 'none', title: 'Expression', xLabel: 'Samples', yLabel: 'Genes' })
    expect(reopened(heat)).toEqual(heat)
    const corr = chart({ groups: readTable(EXPRESSION, 'heatmap').groups, corr: 'spearman' })
    expect(reopened(corr)).toEqual(corr)
    const lists = chart({ kind: 'venn', groups: readTable(LISTS, 'venn').groups, vennLabels: 'percent', palette: 'okabe-ito' })
    expect(reopened(lists)).toEqual(lists)
    const sizes = chart({ kind: 'venn', groups: readTable('A\tB\tA & B\n120\t85\t30', 'venn').groups, vennLabels: 'none' })
    expect(reopened(sizes)).toEqual(sizes)
  })

  it('are rebuilt from a file that cannot be trusted', () => {
    const raw = { ...chart({ kind: 'venn' }), heatScale: 'viridis', heatByRow: true, vennLabels: 'everything', groups: [{ name: 'A', values: ['x', -3, 7], labels: ['  tp53 ', 5, '', 'x'.repeat(90)] }, { name: 'B', values: [-1, 'no', 12, 4] }] }
    const kept = reopened(raw as unknown as ChartNode)
    expect(kept.groups[0]).toEqual({ name: 'A', values: [1, 1], labels: ['tp53', 'x'.repeat(40)] })
    expect(kept.groups[1]).toEqual({ name: 'B', values: [12] })
    expect(kept).not.toHaveProperty('heatScale')
    expect(kept).not.toHaveProperty('heatByRow')
    expect(kept).not.toHaveProperty('vennLabels')
    const heat = reopened({ ...chart({}), heatScale: 'rainbow', vennLabels: 'none', groups: [{ name: 'A', values: [1, 'x', 3], labels: ['g1', 'g2', 7] }] } as unknown as ChartNode)
    expect(heat.groups[0]).toEqual({ name: 'A', values: [1, 3], labels: ['g1', ''] })
    expect(heat).not.toHaveProperty('heatScale')
    expect(heat).not.toHaveProperty('vennLabels')
    // Only a heat map and a scatter chart keep a correlation; other charts never keep row names.
    expect(reopened({ ...chart({ kind: 'bar', corr: 'pearson' }), groups: [{ name: 'A', values: [1, 2], labels: ['a', 'b'] }] } as ChartNode)).toMatchObject({ groups: [{ name: 'A', values: [1, 2] }] })
    expect(reopened(chart({ kind: 'bar', corr: 'pearson', groups: [{ name: 'A', values: [1] }] }))).not.toHaveProperty('corr')
  })

  it('are three ways of reading a table, and going from one to another reads it again', () => {
    expect([chartFamily('bar'), chartFamily('heatmap'), chartFamily('pie'), chartFamily('scatter'), chartFamily('venn')]).toEqual(['columns', 'columns', 'columns', 'scatter', 'venn'])
    const bars: ChartGroup[] = [{ name: 'A', values: [1, 2] }, { name: 'B', values: [2, 3] }]
    expect(crossTable(bars, 'bar', 'venn').map((g) => g.labels)).toEqual([['1', '2'], ['2', '3']])
    expect(crossTable(readTable(LISTS, 'venn').groups, 'venn', 'bar').every((g) => g.values.length === 0)).toBe(true)
  })

  it('can be asked for in words', () => {
    const bars = chart({ kind: 'bar', groups: [{ name: 'A', values: [1, 2] }, { name: 'B', values: [2, 3] }] })
    const heat = applyInstruction(bars, 'heat map')
    expect(heat.node.kind).toBe('heatmap')
    expect(heat.done).toEqual(['The chart is now a heat map.'])
    expect(applyInstruction(bars, 'matrix plot').node.kind).toBe('heatmap')
    const venn = applyInstruction(bars, 'make it a Venn diagram')
    expect(venn.node.kind).toBe('venn')
    expect(venn.done[0]).toContain('every column of the table is read as the names of the members of one set')
    expect(applyInstruction(venn.node, 'bar chart').done[0]).toContain('every column of the table is read as the numbers of one group')
  })
})
