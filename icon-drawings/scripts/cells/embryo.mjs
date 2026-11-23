// Icons of SiliCoDraw (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md: reproduction and early development
// (sperm, oocyte, zygote, morulas, blastocyst), the plant cell and a cluster of cells. Their shapes, read by hand from
// the source in a 100 × 100 box centred on 0,0, scaled onto a 512 page, with pale fills and thick membranes.
// Usage: node embryo.mjs <folder>
import { BLUE, NUC, PEACH, cellTypes, circleD, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft } from '../colour.mjs'
import { f } from '../shapes.mjs'

const OUT = process.argv[2]
const { cellType, check } = cellTypes(OUT)

// One family from the oocyte to the blastocyst: peach blastomeres, a pale blue zona pellucida, lilac nuclei.
const BLASTO = soft(PEACH), ZONA = soft(235), CAVITY = soft(BLUE)
const SPERM_K = 5.39, SPERM_C = [-7.35, 6.9]
// The zona of the oocyte, the zygote and both morulas: one size on one scale, so the four line up side by side.
const ZK = 5.1, ZIN = 37, ZOUT = 44

// A ring between two radii, as one path to fill (even-odd).
const ringD = (g, x, y, r0, r1) => `${circleD(g, x, y, r1)} ${circleD(g, x, y, r0)}`
// The zona pellucida: a ring of its own colour, the perivitelline space inside it in the zona's palest tone.
const zonaDefs = (g) => g.grad('zona-gradient', [-ZOUT, -ZOUT, ZOUT, ZOUT], ZONA)
const zonaSpace = (g) => `<g id="perivitelline-space">${g.circle(0, 0, ZIN, ZONA.light)}</g>`
const zona = (g) =>
  `<g id="zona-pellucida"><path d="${ringD(g, 0, 0, ZIN, ZOUT)}" fill="url(#zona-gradient)" fill-rule="evenodd" stroke="${ZONA.outline}" stroke-width="6" stroke-linejoin="round"/>` +
  `${g.hl(-29.5, -29.5, 26, 6, -45, ZONA.light)}</g>`
// A round cell or nucleus with a gradient of its own (`id`), an outline and a highlight scaled to its size.
const ball = (g, id, x, y, r, pal, w, hl = true) =>
  g.circle(x, y, r, `url(#${id})`, pal.outline, w) + (hl ? g.hl(x - r * 0.42, y - r * 0.45, f(r * g.k * 0.26), f(r * g.k * 0.1), -45, pal.light) : '')
const ballGrad = (g, id, x, y, r, pal) => g.grad(id, [x - r, y - r, x + r, y + r], pal)
// A nucleus with a gradient of its own (for icons with several nuclei), in the shared lilac.
const nuc = (g, id, x, y, r, w, extra = '') => `<g id="${id.replace('-gradient', '')}">${ball(g, id, x, y, r, NUC, w)}${extra}</g>`

// Sperm: an oval head that is nearly all nucleus (corrected: theirs had a small round one), a short midpiece and a
// long tail. The head is a little smaller than theirs, so the tail is longer beside it.
{
  const g = page(SPERM_K, SPERM_C), cyto = soft(BLUE)
  const head = (() => {
    // An ellipse (19 × 11, theirs 22 × 13, turned by −30°) as a path, so the head, midpiece and tail can share one outline.
    const pts = Array.from({ length: 72 }, (_, i) => { const t = (i / 72) * Math.PI * 2, a = (-30 * Math.PI) / 180, x = 19 * Math.cos(t), y = 11 * Math.sin(t); return [15.5 + x * Math.cos(a) - y * Math.sin(a), -4.5 + x * Math.sin(a) + y * Math.cos(a)] })
    return `M${pts.map(g.P).map(([x, y]) => `${f(x)},${f(y)}`).join(' L')}Z`
  })()
  const tail = g.D('M2,4C-10,6 -14,18 -26,20S-40,32 -48,32'), mid = g.D('M4,3C-2,6 -4,8 -7,8.5')
  // One outline round the head (12 px), the midpiece and the tail (5 px): outlines first, then the fills over them.
  const outl = `<path d="${head}" fill="${cyto.outline}" stroke="${cyto.outline}" stroke-width="24" stroke-linejoin="round"/>` +
    `<path d="${mid}" fill="none" stroke="${cyto.outline}" stroke-width="34" stroke-linecap="round"/>` +
    `<path d="${tail}" fill="none" stroke="${cyto.outline}" stroke-width="20" stroke-linecap="round"/>`
  const fill = `<path d="${tail}" fill="none" stroke="url(#cell-gradient)" stroke-width="10" stroke-linecap="round"/>` +
    `<path d="${mid}" fill="none" stroke="url(#cell-gradient)" stroke-width="22" stroke-linecap="round"/>` +
    `<path d="${head}" fill="url(#cell-gradient)"/>`
  cellType('Sperm', [['cell', cyto], ['nucleus', NUC]],
    g.grad('cell-gradient', [-6, -20, 34, 12], cyto) + g.grad('nucleus-gradient', [7, -13, 28, 2], NUC),
    `<g id="cell">${outl}${fill}</g>\n` +
      `<g id="midpiece">${`<path d="${mid}" fill="none" stroke="${cyto.small}" stroke-width="9" stroke-linecap="round"/>`}</g>\n` +
      `<g id="nucleus">${g.ellipse(17.6, -5.7, 11, 5.6, -30, 'url(#nucleus-gradient)', NUC.outline, 8)}${g.hl(12.5, -6.5, 13, 5, -30, NUC.light)}</g>`)
}

// Oocyte: a large round egg with its nucleus (germinal vesicle) inside the zona pellucida, a polar body beside it.
// Corrected: their polar body crossed the zona; here it lies inside it, in the perivitelline space, in front of the
// egg, which is set a little off the middle to make room for it.
{
  const g = page(ZK, [0, 0])
  cellType('Oocyte', [['oocyte', BLASTO], ['zona pellucida', ZONA], ['nucleus', NUC]],
    zonaDefs(g) + ballGrad(g, 'cell-gradient', -2, 2, 30, BLASTO) + ballGrad(g, 'polar-body-gradient', 20, -25.2, 3.6, BLASTO) + ballGrad(g, 'nucleus-gradient', -4, 2.5, 12, NUC),
    zonaSpace(g) + '\n' +
      `<g id="oocyte">${ball(g, 'cell-gradient', -2, 2, 30, BLASTO, 12)}</g>\n` +
      `<g id="polar-body">${ball(g, 'polar-body-gradient', 20, -25.2, 3.6, BLASTO, 6, false)}</g>\n` +
      nuc(g, 'nucleus-gradient', -4, 2.5, 12, 10) + '\n' + zona(g))
}

// Zygote: the fertilised egg with its two pronuclei, each with a nucleolus, inside the zona; the granules their
// drawing puts outside the cell lie in the perivitelline space, where the cortical granules are released.
{
  const g = page(ZK, [0, 0])
  const granules = Array.from({ length: 8 }, (_, i) => { const t = (i / 8) * Math.PI * 2 - Math.PI / 2; return g.circle(34.4 * Math.cos(t), 34.4 * Math.sin(t), 1.3, BLASTO.small) }).join('')
  cellType('Zygote', [['zygote', BLASTO], ['zona pellucida', ZONA], ['pronuclei', NUC]],
    zonaDefs(g) + ballGrad(g, 'cell-gradient', 0, 0, 31, BLASTO) + ballGrad(g, 'pronucleus-1-gradient', -9.5, -2, 8.5, NUC) + ballGrad(g, 'pronucleus-2-gradient', 9.5, 2, 8.5, NUC),
    zonaSpace(g) + '\n' + `<g id="cortical-granules">${granules}</g>\n` +
      `<g id="zygote">${ball(g, 'cell-gradient', 0, 0, 31, BLASTO, 12)}</g>\n` +
      `<g id="pronuclei">${nuc(g, 'pronucleus-1-gradient', -9.5, -2, 8.5, 7, g.circle(-8.5, -1, 3, NUC.small))}${nuc(g, 'pronucleus-2-gradient', 9.5, 2, 8.5, 7, g.circle(10.5, 3, 3, NUC.small))}</g>\n` +
      zona(g))
}

// Morula: a ball of nine round blastomeres inside the zona, nuclei in the five that lie in front.
{
  const g = page(ZK, [0, 0])
  const cells = [[-22, 0], [22, 0], [0, -22], [0, 22], [-14, -14], [12, -14], [-12, 12], [12, 12], [0, 0]], front = cells.slice(4)
  cellType('Morula', [['blastomeres', BLASTO], ['zona pellucida', ZONA], ['nuclei', NUC]],
    zonaDefs(g) + cells.map(([x, y], i) => ballGrad(g, `blastomere-${i + 1}-gradient`, x, y, 11, BLASTO)).join('') + front.map(([x, y], i) => ballGrad(g, `nucleus-${i + 1}-gradient`, x, y, 4, NUC)).join(''),
    zonaSpace(g) + '\n' +
      `<g id="blastomeres">${cells.map(([x, y], i) => ball(g, `blastomere-${i + 1}-gradient`, x, y, 11, BLASTO, 7)).join('')}</g>\n` +
      `<g id="nuclei">${front.map(([x, y], i) => ball(g, `nucleus-${i + 1}-gradient`, x, y, 4, NUC, 6, false)).join('')}</g>\n` +
      zona(g))
}

// Compacted morula: the blastomeres pressed together into a smooth ball, one outline round them all and thin
// boundaries between them, a nucleus in each, inside the zona. It is no larger than the morula, so it stays clear of
// the zona, and the gaps between three cells are filled in the shadow tone of the cells.
{
  const g = page(ZK, [0, 0])
  const cells = [[-16, -16], [6, -20], [22, -6], [18, 16], [0, 24], [-20, 14], [-24, -2], [-2, -2], [8, 6]].map(([x, y]) => [x * 0.88, y * 0.88]), R = 11
  const outer = cells.map(([x, y]) => `<path d="${circleD(g, x, y, R)}" fill="${BLASTO.outline}" stroke="${BLASTO.outline}" stroke-width="16" stroke-linejoin="round"/>`).join('')
  cellType('Compacted morula', [['blastomeres', BLASTO], ['zona pellucida', ZONA], ['nuclei', NUC]],
    zonaDefs(g) + g.grad('blastomere-gradient', [-35, -35, 35, 35], BLASTO) + cells.map(([x, y], i) => ballGrad(g, `nucleus-${i + 1}-gradient`, x, y, 3.6, NUC)).join(''),
    zonaSpace(g) + '\n' +
      `<g id="blastomeres">${outer}<path d="M${cells.slice(0, 7).map(g.P).map(([x, y]) => `${f(x)},${f(y)}`).join(' L')}Z" fill="${BLASTO.shadow}"/>${cells.map(([x, y], i) => g.circle(x, y, R, 'url(#blastomere-gradient)', BLASTO.small, 4) + ball(g, `nucleus-${i + 1}-gradient`, x, y, 3.6, NUC, 5, false)).join('')}${g.hl(-18.5, -18.5, 24, 7, -45, BLASTO.light)}</g>\n` +
      zona(g))
}

// Blastocyst: a ring of trophectoderm round a fluid-filled cavity (blastocoel), the inner cell mass against its top.
// The trophectoderm is one layer of flat cells: a nucleus in each, all the way round, and a boundary between them.
{
  const g = page(5.33, [0, 0])
  const icm = [[-16, -16], [-4, -24], [10, -20], [-10, -4], [4, -8], [16, -8]]
  const around = [150, 110, 70, 30, -10, 190, 230, 270, 310], rad = (a) => (a * Math.PI) / 180
  const borders = around.map((a) => g.line([34, 40].map((r) => [r * Math.cos(rad(a + 20)), r * Math.sin(rad(a + 20))]), BLASTO.outline, 5)).join('')
  const tn = around.map((a) => { const t = (a * Math.PI) / 180; return g.ellipse(37 * Math.cos(t), 37 * Math.sin(t), 3.6, 1.7, a + 90, NUC.small) }).join('')
  cellType('Blastocyst', [['trophectoderm', BLASTO], ['blastocoel', CAVITY], ['nuclei', NUC]],
    g.grad('cell-gradient', [-42, -42, 42, 42], BLASTO) + g.grad('blastocoel-gradient', [-32, -32, 32, 32], CAVITY) + icm.map(([x, y], i) => ballGrad(g, `icm-${i + 1}-gradient`, x, y, 7, BLASTO)).join(''),
    `<g id="trophectoderm">${g.circle(0, 0, 42, 'url(#cell-gradient)', BLASTO.outline, 12)}${borders}${tn}</g>\n` +
      `<g id="blastocoel">${g.circle(0, 0, 32, 'url(#blastocoel-gradient)', BLASTO.outline, 8)}${g.hl(-11, 14, 24, 8, -30, CAVITY.light)}</g>\n` +
      `<g id="inner-cell-mass">${icm.map(([x, y], i) => ball(g, `icm-${i + 1}-gradient`, x, y, 7, BLASTO, 6, false) + g.circle(x + 0.5, y + 0.5, 2.4, NUC.small)).join('')}</g>`)
}

// Plant cell: a rectangular cell wall, the cytoplasm inside its membrane, a large central vacuole, a nucleus beside it
// and four chloroplasts, each with a few grana.
{
  const g = page(5.05, [0, 0])
  const wall = rich(72), cyto = rich(112), vac = soft(hueOf('#dbeafe')), chl = deep(155)
  const rect = (x, y, w, h, rx, fill, s, sw) => `<rect x="${f(g.X(x))}" y="${f(g.Y(y))}" width="${f(w * g.k)}" height="${f(h * g.k)}" rx="${f(rx * g.k)}" fill="${fill}" stroke="${s}" stroke-width="${sw}" stroke-linejoin="round"/>`
  const chloros = [[-30, -21, -30], [-30, 19, 30], [30.5, 19, -30], [30.5, -19, 30]]
  const grana = (x, y, r) => [-3.6, 0, 3.6].map((d) => { const t = (r * Math.PI) / 180; return g.ellipse(x + d * Math.cos(t), y + d * Math.sin(t), 1.1, 2.1, r, chl.small) }).join('')
  cellType('Plant cell', [['cell wall', wall], ['cytoplasm', cyto], ['vacuole', vac], ['chloroplasts', chl], ['nucleus', NUC]],
    g.grad('wall-gradient', [-45, -36, 45, 36], wall) + g.grad('cell-gradient', [-39, -30, 39, 30], cyto) + g.grad('vacuole-gradient', [-18, -20, 22, 22], vac) +
      chloros.map(([x, y], i) => g.grad(`chloroplast-${i + 1}-gradient`, [x - 7, y - 5, x + 7, y + 5], chl)).join('') + ballGrad(g, 'nucleus-gradient', -28.5, -1, 6.2, NUC),
    `<g id="cell-wall">${rect(-45, -36, 90, 72, 5, 'url(#wall-gradient)', wall.outline, 8)}${g.hl(-36, -33, 30, 5, -12, wall.light)}</g>\n` +
      `<g id="cytoplasm">${rect(-39, -30, 78, 60, 3, 'url(#cell-gradient)', cyto.outline, 10)}</g>\n` +
      `<g id="vacuole">${rect(-18, -20, 40, 42, 10, 'url(#vacuole-gradient)', vac.outline, 8)}${g.hl(-8, -12, 28, 9, -30, vac.light)}</g>\n` +
      `<g id="chloroplasts">${chloros.map(([x, y, r], i) => g.ellipse(x, y, 7, 4, r, `url(#chloroplast-${i + 1}-gradient)`, chl.outline, 6) + grana(x, y, r)).join('')}</g>\n` +
      nuc(g, 'nucleus-gradient', -28.5, -1, 6.2, 8))
}

// Cell cluster: three round cells pressed together, each with its nucleus (as Cell.svg: pale blue, lilac nuclei).
{
  const g = page(4.36, [-1, 1.5]), cyto = soft(BLUE)
  const cells = [[-22, -18, 30], [24, -10, 26], [0, 24, 27]]
  cellType('Cell cluster', [['cytoplasm', cyto], ['nucleus', NUC]],
    cells.map(([x, y, r], i) => ballGrad(g, `cell-${i + 1}-gradient`, x, y, r, cyto) + ballGrad(g, `nucleus-${i + 1}-gradient`, x, y, r * 0.35, NUC)).join(''),
    cells.map(([x, y, r], i) => `<g id="cell-${i + 1}">${ball(g, `cell-${i + 1}-gradient`, x, y, r, cyto, 12)}${nuc(g, `nucleus-${i + 1}-gradient`, x, y, r * 0.35, 10)}</g>`).join('\n'))
}

check()
console.log('written to', OUT)
