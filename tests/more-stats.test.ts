// Statistics added with the heat map tree, the confidence bands, Dunnett's test and the hazard
// ratio. Every expected number was worked out in R 4.4.2 (the calls are named at each test).

import { describe, expect, it } from 'vitest'
import { chartLayout } from '../src/model/chart'
import { fitLine, lineBand } from '../src/model/chartStats'
import { dunnettUpper, tTwoSided } from '../src/model/distributions'
import { cluster, heatMatrix, heatSummary, treeLines } from '../src/model/heatmap'
import { hazardRatios, kaplanMeier, type Subject } from '../src/model/survival'
import { validateDoc } from '../src/io/files'
import { emptyDoc } from '../src/model/doc'
import type { ChartGroup, ChartNode } from '../src/model/types'

const near = (got: number | null | undefined, want: number, tolerance = 1e-7) => {
  expect(got).not.toBeNull()
  expect(Math.abs((got as number) - want), `${got} against ${want}`).toBeLessThanOrEqual(tolerance * Math.max(1, Math.abs(want)))
}

describe('Dunnett’s distribution', () => {
  const half = Math.sqrt(0.5)
  const LAM3 = [0.632455532034, 0.674199862463, 0.733799385705]

  it('gives the p value of the integral Dunnett wrote down (R: integrate over the control and the spread)', () => {
    near(dunnettUpper(2.5, [half, half], 9), 0.0599919359567)
    near(dunnettUpper(1.0, [half, half, half], 20), 0.6326623901514)
    near(dunnettUpper(3.2, [Math.sqrt(0.4), Math.sqrt(0.6)], 5), 0.0415306338477)
    near(dunnettUpper(3.9711558106524, LAM3, 18), 0.00250317064014)
    near(dunnettUpper(0.0656870439007, LAM3, 18), 0.99979933702195)
    // A very small p value keeps its digits.
    expect(Math.abs(dunnettUpper(7.84189187242, [half, half], 9) / 4.89144628334e-5 - 1)).toBeLessThan(1e-5)
  })

  it('is the t test when there is one comparison, and the normal case with very many values', () => {
    near(dunnettUpper(2, [0.7], 1), 0.295167235301)
    near(dunnettUpper(2, [0.7], 1), tTwoSided(2, 1))
    near(dunnettUpper(-2.6, [0.6], 14), tTwoSided(2.6, 14))
    // R: 1 - pmvnorm(lower = c(-2.2, -2.2), upper = c(2.2, 2.2), corr = 0.49)
    near(dunnettUpper(2.2, [0.7, 0.7], 1e6), 0.0516694114107, 1e-5)
  })

  it('takes the sign of the statistic as it comes, and refuses what is no statistic', () => {
    expect(dunnettUpper(-2.5, [half, half], 9)).toBe(dunnettUpper(2.5, [half, half], 9))
    expect(dunnettUpper(0, [half, half], 9)).toBe(1)
    expect(dunnettUpper(Number.NaN, [half], 9)).toBeNaN()
    expect(dunnettUpper(2, [], 9)).toBeNaN()
    expect(dunnettUpper(2, [half], 0)).toBeNaN()
  })
})

const subjects = (times: number[], status: number[]): Subject[] => times.map((time, i) => ({ time, event: status[i] === 1 }))
const chart = (extra: Partial<ChartNode>): ChartNode => ({ id: 'c', type: 'chart', x: 0, y: 0, w: 420, h: 320, rotation: 0, kind: 'heatmap', groups: [], ...extra })

describe('hierarchical clustering', () => {
  // R: x <- matrix(c(2.1,5.5,14,3.3, 2.4,5.1,15,3.0, 48,31,22,9.5, 52,28,25,11, 98,101,99,102, 10,12,9,40), nrow = 6, byrow = TRUE)
  const X = [
    [2.1, 5.5, 14, 3.3],
    [2.4, 5.1, 15, 3.0],
    [48, 31, 22, 9.5],
    [52, 28, 25, 11],
    [98, 101, 99, 102],
    [10, 12, 9, 40],
  ]

  it('joins rows as hclust(dist(x)) does: Euclidean distance, complete linkage', () => {
    const tree = cluster(X)!
    expect(tree.merge).toEqual([[-1, -2], [-3, -4], [-6, 1], [2, 3], [-5, 4]])
    expect(tree.order).toEqual([5, 3, 4, 6, 1, 2])
    const heights = [1.15758369028, 6.0207972894, 38.86347900021, 56.36089069559, 187.83969229106]
    tree.height.forEach((h, i) => near(h, heights[i], 1e-10))
  })

  it('joins the columns the same way: hclust(dist(t(x)))', () => {
    const columns = X[0].map((_, c) => X.map((row) => row[c]))
    const tree = cluster(columns)!
    expect(tree.merge).toEqual([[-2, -3], [-4, 1], [-1, 2]])
    expect(tree.order).toEqual([1, 4, 2, 3])
    ;[16.5305777274, 39.7585210993, 63.8830963558].forEach((h, i) => near(tree.height[i], h, 1e-10))
  })

  it('leaves a missing value out of the pairs it belongs to, and scales the distance up, as dist does', () => {
    const gaps: (number | null)[][] = X.map((row) => [...row])
    gaps[1][2] = null
    gaps[4][0] = null
    const tree = cluster(gaps)!
    expect(tree.merge).toEqual([[-1, -2], [-3, -4], [-6, 1], [2, 3], [-5, 4]])
    expect(tree.order).toEqual([5, 3, 4, 6, 1, 2])
    ;[0.673300329224, 6.020797289396, 44.337643900716, 63.755470353531, 194.924652109475].forEach((h, i) => near(tree.height[i], h, 1e-10))
  })

  it('has no tree for one row, and none when two rows share no column', () => {
    expect(cluster([[1, 2]])).toBeNull()
    expect(cluster([])).toBeNull()
    expect(cluster([[1, null], [null, 2]])).toBeNull()
    expect(cluster([[1, 2], [3, 4]])).toEqual({ merge: [[-1, -2]], height: [Math.sqrt(8)], order: [1, 2] })
  })

  it('draws a bracket for every joining, between the two things it joins', () => {
    const lines = treeLines(cluster(X)!)
    expect(lines).toHaveLength(5 * 3)
    // The first joining: rows 1 and 2, the last two leaves, joined low down.
    expect(lines[0].from).toEqual([4.5, 0])
    expect(lines[0].to[0]).toBe(4.5)
    expect(lines[0].to[1]).toBeCloseTo(1.15758369028 / 187.83969229106, 9)
    expect(lines[1].from).toEqual([5.5, 0])
    // The last bar reaches the full height.
    expect(lines[14].from[1]).toBe(1)
    expect(lines[14].to[1]).toBe(1)
    // Every place lies among the leaves.
    for (const l of lines) for (const [along, high] of [l.from, l.to]) expect(along > 0 && along < 6 && high >= 0 && high <= 1).toBe(true)
  })
})

describe('a heat map with its rows and columns in the order of their trees', () => {
  const genes = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6']
  const X = [[2.1, 5.5, 14, 3.3], [2.4, 5.1, 15, 3.0], [48, 31, 22, 9.5], [52, 28, 25, 11], [98, 101, 99, 102], [10, 12, 9, 40]]
  const groups: ChartGroup[] = ['A', 'B', 'C', 'D'].map((name, c) => ({ name, values: X.map((row) => row[c]), labels: genes }))

  it('stands in the order of the table until asked', () => {
    const m = heatMatrix(chart({ groups }))
    expect(m.rows).toEqual(genes)
    expect(m.columns).toEqual(['A', 'B', 'C', 'D'])
    expect(m.rowTree).toBeUndefined()
    expect(m.rowOrder).toEqual([0, 1, 2, 3, 4, 5])
    expect(m.colOrder).toEqual([0, 1, 2, 3])
  })

  it('puts rows, columns or both in the order of the clustering, cells and names together', () => {
    const rows = heatMatrix(chart({ groups, heatCluster: 'rows' }))
    expect(rows.rows).toEqual(['g5', 'g3', 'g4', 'g6', 'g1', 'g2'])
    expect(rows.cells[0]).toEqual([98, 101, 99, 102])
    expect(rows.columns).toEqual(['A', 'B', 'C', 'D'])
    expect(rows.colTree).toBeUndefined()
    const both = heatMatrix(chart({ groups, heatCluster: 'both' }))
    expect(both.columns).toEqual(['A', 'D', 'B', 'C'])
    expect(both.cells[0]).toEqual([98, 102, 101, 99])
    expect(both.shown[5]).toEqual([2.4, 3.0, 5.1, 15])
    expect(both.colOrder).toEqual([0, 3, 1, 2])
    expect(heatSummary(both)).toContain('Rows and columns that are alike stand next to each other (hierarchical clustering: Euclidean distance, complete linkage).')
    expect(heatMatrix(chart({ groups, heatCluster: 'columns' })).rows).toEqual(genes)
  })

  it('orders a table of correlations both ways or not at all, and says when rows cannot be ordered', () => {
    const corr = heatMatrix(chart({ groups, corr: 'pearson', heatCluster: 'rows' }))
    expect(corr.rows).toEqual(corr.columns)
    expect(corr.rowTree).toBe(corr.colTree)
    const apart: ChartGroup[] = [{ name: 'A', values: [1], rows: [0] }, { name: 'B', values: [2], rows: [1] }]
    const none = heatMatrix(chart({ groups: apart, heatCluster: 'rows' }))
    expect(none.rowTree).toBeUndefined()
    expect(none.notes.join(' ')).toContain('The rows cannot be put in order by likeness')
  })

  it('draws the trees beside the cells, with the names of the rows at the right, and keeps the setting in a file', () => {
    const plain = chartLayout(chart({ groups }))
    const both = chartLayout(chart({ groups, heatCluster: 'both' }))
    // Five joinings of rows and three of columns, three lines each.
    expect(both.rules.length - plain.rules.length).toBe((5 + 3) * 3)
    const nameOf = (d: typeof plain, name: string) => d.texts.find((t) => t.text === name)!
    expect(nameOf(plain, 'g1').align).toBe('right')
    expect(nameOf(both, 'g1').align).toBe('left')
    expect(nameOf(both, 'g1').x).toBeGreaterThan(both.clip.x + both.clip.w)
    // The cells begin lower and further right: the trees take the room.
    expect(both.clip.y).toBeGreaterThan(plain.clip.y)
    const read = validateDoc({ ...emptyDoc(), nodes: [chart({ groups, heatCluster: 'both' }), { ...chart({ groups }), id: 'd', heatCluster: 'diagonal' }, { ...chart({ groups }), id: 'e', kind: 'bar', heatCluster: 'rows' }] })
    expect(read.nodes.map((n) => (n as ChartNode).heatCluster)).toEqual(['both', undefined, undefined])
  })
})

describe('confidence bands', () => {
  it('reach as far from a fitted line as predict(lm, interval = "confidence") says', () => {
    // R: xs <- 1:8; ys <- c(2.4,3.7,6.6,7.3,10.3,12.1,14.1,15.7); fit <- lm(ys ~ xs)
    const fit = fitLine([2.4, 3.7, 6.6, 7.3, 10.3, 12.1, 14.1, 15.7].map((y, i) => [i + 1, y]))!
    near(fit.intercept, 0.207142857143)
    near(fit.slope, 1.959523809524)
    const at = (x: number) => [fit.intercept + fit.slope * x - lineBand(fit, x)!, fit.intercept + fit.slope * x + lineBand(fit, x)!]
    ;[[0, -0.65477745112, 1.06906316541], [4.5, 8.63391003275, 9.41608996725], [10, 18.78540379121, 20.81935811355]].forEach(([x, lo, hi]) => {
      near(at(x)[0], lo, 1e-8)
      near(at(x)[1], hi, 1e-8)
    })
    // Narrowest at the mean of x; no band through two points.
    expect(lineBand(fit, 4.5)!).toBeLessThan(lineBand(fit, 1)!)
    expect(lineBand(fitLine([[0, 1], [1, 3]])!, 0.5)).toBeNull()
  })

  it('give a Kaplan-Meier estimate the limits of survfit (log type, Greenwood)', () => {
    // R: survfit(Surv(c(5,8,12,14,16,20,23,27), c(1,1,1,0,1,1,1,1)) ~ 1)
    const km = kaplanMeier(subjects([5, 8, 12, 14, 16, 20, 23, 27], [1, 1, 1, 0, 1, 1, 1, 1]))
    const lower = [0.673381936506, 0.502701841294, 0.3654002786824, 0.3654002786824, 0.2149011018708, 0.1022328530523, 0.0263437641695]
    const upper = [1, 1, 1, 1, 1, 0.955233538773, 0.926749204968]
    lower.forEach((v, i) => near(km.steps[i].lower, v, 1e-9))
    upper.forEach((v, i) => near(km.steps[i].upper, v, 1e-9))
    // Once nobody is left without the event there is no interval.
    expect(km.steps[7]).toMatchObject({ survival: 0, lower: null, upper: null })
    const other = kaplanMeier(subjects([9, 15, 21, 26, 30, 33, 40, 40], [1, 0, 1, 1, 0, 1, 0, 0]))
    ;[0.673381936506, 0.673381936506, 0.467993475615, 0.312712864865, 0.312712864865, 0.141022004386, 0.141022004386].forEach((v, i) => near(other.steps[i].lower, v, 1e-9))
    expect(other.steps.every((s) => s.upper === 1)).toBe(true)
  })

  it('are drawn under the line or the curve when asked for, and kept in a file', () => {
    const points: ChartGroup[] = [{ name: 'y', values: [2.4, 3.7, 6.6, 7.3, 10.3, 12.1, 14.1, 15.7], xs: [1, 2, 3, 4, 5, 6, 7, 8] }]
    const bare = chartLayout(chart({ kind: 'scatter', groups: points, fit: true }))
    const banded = chartLayout(chart({ kind: 'scatter', groups: points, fit: true, band: true }))
    expect(banded.paths.length).toBe(bare.paths.length + 1)
    const band = banded.paths.find((p) => p.opacity !== undefined)!
    expect(band).toMatchObject({ stroke: 'none', opacity: 0.18 })
    expect(band.d.endsWith('Z')).toBe(true)
    // The band comes before the line, so the line is drawn on top of it.
    expect(banded.paths.indexOf(band)).toBeLessThan(banded.paths.findIndex((p) => p.width === 2))
    // Without a fitted line there is nothing to put a band around.
    expect(chartLayout(chart({ kind: 'scatter', groups: points, band: true })).paths.some((p) => p.opacity !== undefined)).toBe(false)
    const curves: ChartGroup[] = [{ name: 'Control', values: [1, 1, 1, 0, 1, 1, 1, 1], xs: [5, 8, 12, 14, 16, 20, 23, 27] }]
    const km = chartLayout(chart({ kind: 'scatter', groups: curves, survival: true, band: true }))
    expect(km.paths.filter((p) => p.opacity !== undefined)).toHaveLength(1)
    const read = validateDoc({ ...emptyDoc(), nodes: [chart({ kind: 'scatter', groups: points, fit: true, band: true }), { ...chart({ groups: points }), id: 'h', band: true }] })
    expect(read.nodes.map((n) => (n as ChartNode).band)).toEqual([true, undefined])
  })
})

describe('hazard ratios', () => {
  const control = subjects([5, 8, 12, 14, 16, 20, 23, 27], [1, 1, 1, 0, 1, 1, 1, 1])
  const treated = subjects([9, 15, 21, 26, 30, 33, 40, 40], [1, 0, 1, 1, 0, 1, 0, 0])

  it('are those of coxph(Surv(time, status) ~ group) for two groups', () => {
    const [hr] = hazardRatios([control, treated])!
    near(hr!.ratio, 0.208155345073, 1e-8)
    near(hr!.lower, 0.0515796739579, 1e-7)
    near(hr!.upper, 0.8400333766689, 1e-7)
    near(hr!.p, 0.0274649213905, 1e-7)
    // Turned round, the ratio is the other way up.
    near(hazardRatios([treated, control])![0]!.ratio, 1 / 0.208155345073, 1e-8)
  })

  it('are those of coxph for three groups, with tied times handled by Efron’s method', () => {
    const a = subjects([4, 6, 6, 9, 11, 13], [1, 1, 1, 1, 0, 1])
    const b = subjects([5, 8, 8, 12, 15, 19, 22], [1, 1, 0, 1, 1, 1, 0])
    const c = subjects([7, 10, 14, 14, 21, 25, 30], [1, 0, 1, 1, 0, 1, 0])
    const [hb, hc] = hazardRatios([a, b, c])!
    near(hb!.ratio, 0.284947743593, 1e-7)
    near(hc!.ratio, 0.132531072247, 1e-7)
    near(hb!.lower, 0.0674918046225, 1e-6)
    near(hb!.upper, 1.203038161932, 1e-6)
    near(hc!.lower, 0.0259526940303, 1e-6)
    near(hc!.upper, 0.676788509526, 1e-6)
    near(hb!.p, 0.0875585606056, 1e-6)
    near(hc!.p, 0.0151307978462, 1e-6)
  })

  it('are not given where the model has no answer', () => {
    expect(hazardRatios([control])).toBeNull()
    expect(hazardRatios([control, []])).toBeNull()
    expect(hazardRatios([subjects([1, 2], [0, 0]), subjects([3, 4], [0, 0])])).toBeNull()
    // Every event of one group before any of the other: the ratio runs off, and none is reported.
    expect(hazardRatios([subjects([1, 2, 3], [1, 1, 1]), subjects([10, 11, 12], [1, 1, 1])])).toEqual([null])
  })
})
