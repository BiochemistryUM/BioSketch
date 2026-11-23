// Immune cell types of SiliCoDraw (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md with the kit in ../cellkit.mjs:
// their shapes, read by hand from the source in a 100 × 100 box centred on 0,0, scaled onto a 512 page.
// They sit beside the T cell, B cell, neutrophil, monocyte and macrophage of ../silicodraw.mjs and are drawn the same way.
// Usage: node immune1.mjs <folder>
import { deep, rich, soft } from '../colour.mjs'
import { BLUE, GREEN, NUC, PEACH, cellTypes, circleD, nucGrad, nucleus, page } from '../cellkit.mjs'
import { f } from '../shapes.mjs'

const OUT = process.argv[2]
const { cellType, check } = cellTypes(OUT)

// A point turned by `deg` degrees about 0,0, as SVG's rotate() turns it.
const turn = (deg, [x, y]) => { const a = (deg * Math.PI) / 180; return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)] }
// A path in their units (absolute M, L, C only) turned about 0,0, still in their units.
const turnD = (deg, d) => d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, x, y) => turn(deg, [+x, +y]).map(f).join(','))
// A point on a cubic Bézier curve given by its four points.
const bez = ([p0, p1, p2, p3], t) => [0, 1].map((i) => (1 - t) ** 3 * p0[i] + 3 * (1 - t) ** 2 * t * p1[i] + 3 * (1 - t) * t ** 2 * p2[i] + t ** 3 * p3[i])
// An open line through points in their units, as an item of g.union, `width` in pixels.
const stroke = (g, pts, width) => ({ d: `M${pts.map(g.P).map(([x, y]) => `${f(x)},${f(y)}`).join(' L')}`, width })

// Platelet: a small disc without a nucleus, its outline a soft oval, a few granules inside.
{
  const g = page(6.49, [-0.3, 0]), cyto = soft(BLUE)
  cellType('Platelet', [['cytoplasm', cyto]],
    g.grad('cell-gradient', [-34, -20, 34, 20], cyto),
    `<g id="cytoplasm">${g.path(g.smooth([[-34, -6], [-14, -20], [16, -18], [34, -2], [22, 16], [-6, 20], [-28, 12]]), 'url(#cell-gradient)', cyto.outline, 12)}${g.hl(-18, -11, 26, 8, -18, cyto.light)}</g>\n` +
      `<g id="granules">${[[-14, -2], [4, -6], [13, 6], [-3, 9]].map(([x, y]) => g.circle(x, y, 3.4, cyto.small)).join('')}</g>`)
}
// NK cell: a round lymphocyte with an indented nucleus and cytotoxic granules, some of them released at its right.
{
  const g = page(5.42, [7.2, 0]), cyto = soft(200), gran = deep(18)
  cellType('NK cell', [['cytoplasm', cyto], ['nucleus', NUC], ['granules', gran]],
    g.grad('cell-gradient', [-34, -30, 26, 30], cyto) + g.grad('nucleus-gradient', [-22, -20, 7, 10], NUC),
    `<g id="cytoplasm">${g.circle(-4, 0, 30, 'url(#cell-gradient)', cyto.outline, 12)}${g.hl(-23, -17, 22, 8, -45, cyto.light)}</g>\n` +
      `<g id="nucleus">${g.path(g.D('M-22,-10C-14,-24 4,-22 6,-8C8,4 -6,12 -16,6C-10,0 -12,-6 -22,-10Z'), 'url(#nucleus-gradient)', NUC.outline, 10)}${g.hl(-7, -15, 10, 4, -15, NUC.light)}</g>\n` +
      `<g id="granules">${[[12, -14], [17, 2], [10, 14], [-4, 18], [19, -6]].map(([x, y]) => g.circle(x, y, 3.2, gran.small)).join('')}` +
      `${[[36, -12], [42, 0], [36, 12], [46, -10], [47, 10]].map(([x, y]) => g.circle(x, y, 2.6, gran.small)).join('')}</g>`)
}
// Eosinophil: a granulocyte like the neutrophil, a nucleus of two lobes joined by a strand, red (eosin-stained) granules.
{
  const g = page(6.55, [0, 0]), cyto = soft(PEACH), gran = deep(10)
  const lobes = [[-10.5, 2, 9.5], [10.5, -2, 9.5]]
  cellType('Eosinophil', [['cytoplasm', cyto], ['nucleus', NUC], ['granules', gran]],
    g.grad('cell-gradient', [-34, -34, 34, 34], cyto) + g.grad('nucleus-gradient', [-20, -12, 20, 12], NUC),
    `<g id="cytoplasm">${g.circle(0, 0, 34, 'url(#cell-gradient)', cyto.outline, 12)}${g.hl(-21, -19, 23, 8, -45, cyto.light)}</g>\n` +
      `<g id="granules">${[[-22, -16], [19, -19], [-25, 9], [25, 9], [-6, 23], [12, 21], [2, -25], [-12, -13], [19, 13]].map(([x, y]) => g.circle(x, y, 3.4, gran.small)).join('')}</g>\n` +
      `<g id="nucleus">${g.union([...lobes.map(([x, y, r]) => circleD(g, x, y, r)), stroke(g, [[-10.5, 2], [10.5, -2]], f(4.5 * g.k))], 'url(#nucleus-gradient)', NUC.outline, 9)}${g.hl(-14, -3, 9, 4, -45, NUC.light)}${g.hl(7, -7, 9, 4, -45, NUC.light)}</g>`)
}
// Basophil: a granulocyte with a two-lobed nucleus partly hidden under large dark violet granules.
{
  const g = page(5.9, [0, 0]), cyto = soft(PEACH), gran = deep(282)
  cellType('Basophil', [['cytoplasm', cyto], ['nucleus', NUC], ['granules', gran]],
    g.grad('cell-gradient', [-38, -38, 38, 38], cyto) + g.grad('nucleus-gradient', [-24, -30, 28, 2], NUC),
    `<g id="cytoplasm">${g.circle(0, 0, 38, 'url(#cell-gradient)', cyto.outline, 12)}${g.hl(-24, -22, 26, 9, -45, cyto.light)}</g>\n` +
      `<g id="nucleus">${g.path(g.D('M-16,-8C-26,-16 -22,-30 -10,-28C-2,-27 -2,-16 -8,-10C-2,-6 10,-8 14,-16C20,-28 32,-18 24,-6C20,0 10,2 0,0C-8,-2 -14,-2 -16,-8Z'), 'url(#nucleus-gradient)', NUC.outline, 10)}${g.hl(-15, -23, 6, 3, -60, NUC.light)}${g.hl(17, -18, 6, 3, -40, NUC.light)}</g>\n` +
      `<g id="granules">${[[-24, 10], [-10, 22], [8, 24], [24, 12], [25, -19], [-28, -12], [-6, 10], [14, 9], [-18, 25], [0, 30]].map(([x, y]) => g.circle(x, y, 5, gran.outline)).join('')}</g>`)
}
// Dendritic cell: a small body with long branching processes (dendrites) all round, a small round nucleus.
{
  const g = page(4.83, [0.3, -2]), cyto = rich(90)
  // Each dendrite is their curve; its two side branches start on the curve (where it crosses y = −38 and −32), so that
  // the joins are clean, and run off as theirs do (7 left and 4 up, 6 right and 4 up).
  const curve = [[0, -14], [-6, -26], [4, -34], [0, -46]]
  const on = (y) => { let t = 0.5; for (let i = 0; i < 40; i++) { const [, py] = bez(curve, t); t += (py - y) / 60 } return bez(curve, t) }
  const [b1, b2] = [on(-38), on(-32)]
  const arms = []
  for (let i = 0; i < 7; i++) {
    const a = i * 51
    arms.push({ d: g.D(turnD(a, 'M0,-14C-6,-26 4,-34 0,-46')), width: 12 }, stroke(g, [turn(a, b1), turn(a, [b1[0] - 7, b1[1] - 4])], 9), stroke(g, [turn(a, b2), turn(a, [b2[0] + 6, b2[1] - 4])], 9))
  }
  const body = g.smooth([[-18, -8], [-6, -18], [12, -14], [20, 2], [10, 16], [-8, 18], [-20, 6]])
  cellType('Dendritic cell', [['cytoplasm', cyto], ['nucleus', NUC]],
    g.grad('cell-gradient', [-46, -46, 46, 46], cyto) + nucGrad(g, 0, 0, 8),
    `<g id="cytoplasm">${g.union([...arms, body], 'url(#cell-gradient)', cyto.outline, 7)}${g.hl(-11, -10, 12, 5, -40, cyto.light)}</g>\n` +
      nucleus(g, 0, 0, 8, 8))
}
// Mast cell: a round cell packed with granules in a spiral, a round nucleus in the middle (pale blue with rose granules,
// as toluidine blue stains it). The spiral starts outside the nucleus, so that no granule is half hidden under it.
{
  const g = page(5.9, [0, 0]), cyto = soft(BLUE), gran = deep(0)
  const grains = Array.from({ length: 24 }, (_, i) => { const t = i * 2.4, r = Math.sqrt(16.8 ** 2 + (i / 23) * (31.5 ** 2 - 16.8 ** 2)); return [r * Math.cos(t), r * Math.sin(t)] })
  cellType('Mast cell', [['cytoplasm', cyto], ['nucleus', NUC], ['granules', gran]],
    g.grad('cell-gradient', [-38, -38, 38, 38], cyto) + nucGrad(g, 0, 0, 11),
    `<g id="cytoplasm">${g.circle(0, 0, 38, 'url(#cell-gradient)', cyto.outline, 12)}${g.hl(-25, -22, 24, 8, -45, cyto.light)}</g>\n` +
      `<g id="granules">${grains.map(([x, y]) => g.circle(x, y, 3.6, gran.small)).join('')}</g>\n` +
      nucleus(g, 0, 0, 11))
}
// Plasma cell: an oval cell with its nucleus to one side (chromatin like a clock face), rough ER beside it, and the
// antibodies it secretes leaving at the right (amber, like the receptors of the B cell it comes from).
{
  const g = page(5.31, [6, -10]), cyto = soft(GREEN), ab = deep(75)
  const ys = [[34, -26, 20], [42, -4, 0], [34, 22, -20], [30, -40, 40]].map(([x, y, r]) => {
    const at = (p) => { const [u, v] = turn(r, p); return [x + u, y + v] }
    return [[at([0, 8]), at([0, 0])], [at([-6, -7]), at([0, 0]), at([6, -7])]]
  })
  const spokes = [0, 45, 90, 135].map((a) => [turn(a, [0, -7.5]), turn(a, [0, 7.5])].map(([x, y]) => [x - 18, y + 4]))
  cellType('Plasma cell', [['cytoplasm', cyto], ['nucleus', NUC], ['antibodies', ab]],
    g.grad('cell-gradient', [-36, -20, 24, 28], cyto) + nucGrad(g, -18, 4, 11),
    `<g id="antibodies">${ys.map(([stem, arms]) => g.line(stem, ab.small, 12) + g.line(arms, ab.small, 12)).join('')}</g>\n` +
      `<g id="cytoplasm">${g.ellipse(-6, 4, 30, 24, 0, 'url(#cell-gradient)', cyto.outline, 12)}${g.hl(-13, -12, 24, 8, -20, cyto.light)}</g>\n` +
      `<g id="endoplasmic-reticulum">${g.path(g.D('M-1,-4C5,-8 11,-8 17,-4'), 'none', cyto.small, 7).replace('/>', ' stroke-linecap="round"/>')}${g.path(g.D('M1,8C7,4 13,4 19,8'), 'none', cyto.small, 7).replace('/>', ' stroke-linecap="round"/>')}${g.path(g.D('M3,20C8,17 12,17 16,19'), 'none', cyto.small, 7).replace('/>', ' stroke-linecap="round"/>')}</g>\n` +
      `<g id="nucleus">${g.circle(-18, 4, 11, 'url(#nucleus-gradient)', NUC.outline, 10)}${spokes.map((s) => g.line(s, NUC.small, 6)).join('')}${g.circle(-18, 4, 2.2, NUC.small)}</g>`)
}
// CAR-T cell: a T cell (microvilli with knobs, a large nucleus) reaching a tumour cell with its chimeric antigen receptors.
{
  const g = page(4.74, [0.85, 0]), cyto = soft(BLUE), car = deep(75), tumour = soft(25)
  // The microvilli of the T cell of ../silicodraw.mjs (rays at the same angles), without the two that would face the tumour cell.
  const villi = [67.5, 112.5, 157.5, 202.5, 247.5, 292.5].map((a) => { const [x, y] = turn(a, [1, 0]); return [[-18 + x * 21, y * 21], [-18 + x * 27, y * 27], [-18 + x * 28.8, y * 28.8]] })
  const heads = ['M12,-15L17,-10L12,-5Z', 'M12,5L17,10L12,15Z']
  cellType('CAR-T cell', [['cytoplasm', cyto], ['nucleus', NUC], ['receptors', car], ['tumour cell', tumour]],
    g.grad('cell-gradient', [-40, -22, 4, 22], cyto) + nucGrad(g, -20, 0, 9) + g.grad('tumour-gradient', [18, -20, 48, 18], tumour) +
      g.grad('tumour-nucleus-gradient', [29, -7, 39, 3], NUC),
    `<g id="microvilli">${villi.map(([a, b]) => g.line([a, b], cyto.outline, 9)).join('')}${villi.map(([, , c]) => g.circle(c[0], c[1], 3.2, cyto.small)).join('')}</g>\n` +
      `<g id="receptors">${g.line([[0, -5.4], [12, -10]], car.small, 12)}${g.line([[0, 5.4], [12, 10]], car.small, 12)}${heads.map((d) => g.path(g.D(d), car.small, car.small, 5)).join('')}</g>\n` +
      `<g id="cytoplasm">${g.circle(-18, 0, 22, 'url(#cell-gradient)', cyto.outline, 12)}${g.hl(-30, -11, 14, 6, -45, cyto.light)}</g>\n` +
      nucleus(g, -20, 0, 9, 9) + '\n' +
      `<g id="tumour-cell">${g.path(g.smooth([[26, -16], [40, -20], [48, -8], [46, 8], [36, 18], [24, 12], [18, -2]]), 'url(#tumour-gradient)', tumour.outline, 11)}${g.hl(31, -13, 11, 4, -25, tumour.light)}</g>\n` +
      `<g id="tumour-nucleus">${g.circle(34, -2, 5.5, 'url(#tumour-nucleus-gradient)', NUC.outline, 7)}</g>`)
}

check()
console.log('written to', OUT)
