// Cell types of SiliCoDraw (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md: cells of the skin, of blood vessels,
// of the kidney's filter, and the epithelial cells of the gut and airway. Their shapes are read by hand from the source
// in a 100 × 100 box centred on 0,0 and scaled onto a 512 page with the kit in ../cellkit.mjs.
// Usage: node epithelia.mjs <folder>
import { BLUE, NUC, PEACH, cellTypes, nucleus, nucGrad, page } from '../cellkit.mjs'
import { hueOf, soft, toHex } from '../colour.mjs'
import { f } from '../shapes.mjs'

const OUT = process.argv[2]
const { cellType, check } = cellTypes(OUT)

// A rounded rectangle given in their units.
const rect = (g, x, y, w, h, rx, fill, s = '', sw = 0) =>
  `<rect x="${f(g.X(x))}" y="${f(g.Y(y))}" width="${f(w * g.k)}" height="${f(h * g.k)}" rx="${f(rx * g.k)}" fill="${fill}"${s ? ` stroke="${s}" stroke-width="${sw}" stroke-linejoin="round"` : ''}/>`
// A thin tube along a path already on the page: the outline colour, then the fill inside it.
const tube = (d, pal, w, wall = 3.5) =>
  `<path d="${d}" fill="none" stroke="${pal.outline}" stroke-width="${w}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${pal.shadow}" stroke-width="${f(w - 2 * wall)}" stroke-linecap="round"/>`
// A nucleus that is an ellipse, with a gradient of its own (several nuclei in one icon).
const nucEllipse = (g, id, x, y, rx, ry, w) =>
  g.ellipse(x, y, rx, ry, 0, `url(#${id})`, NUC.outline, w) + g.hl(x - rx * 0.4, y - ry * 0.42, f(rx * g.k * 0.26), f(ry * g.k * 0.17), -12, NUC.light)
const nucEllipseGrad = (g, id, x, y, rx, ry) => g.grad(id, [x - rx, y - ry, x + rx, y + ry], NUC)

// The epithelial cells of the gut and airway are one family: the same peach body, the lilac nucleus of every cell type,
// and their special parts each in a hue of its own (mucus blue, microvilli rose, cilia teal).
const EPI = soft(PEACH), MUCUS = soft(hueOf('#60a5fa')), BRUSH = soft(8), CILIA = soft(200)
// Melanin: a brown of its own, darker than the soft tones, since the granules are what a melanocyte is known by.
const MELANIN = { light: toHex({ l: 0.9, c: 0.03, h: 52 }), base: toHex({ l: 0.62, c: 0.075, h: 52 }), shadow: toHex({ l: 0.54, c: 0.075, h: 52 }), small: toHex({ l: 0.5, c: 0.075, h: 52 }), outline: toHex({ l: 0.4, c: 0.06, h: 52 }) }
// Vessels: the capillary wall and endothelium rose, as in SiliCoDraw; its lumen a pale tone of the same rose.
const VESSEL = soft(hueOf('#f3c6c6'))
// Pericyte and podocyte, violet in SiliCoDraw, are blue here: violet lies within 30° of the lilac nucleus.
const MURAL = soft(250)

// Keratinocyte: a polygonal squamous cell with an oval nucleus and bundles of keratin filaments across it.
{
  const g = page(4.87, [0, -2]), cyto = EPI, keratin = soft(5)
  cellType('Keratinocyte', [['cytoplasm', cyto], ['keratin', keratin], ['nucleus', NUC]],
    g.grad('cell-gradient', [-46, -30, 46, 26], cyto) + nucEllipseGrad(g, 'nucleus-gradient', 0, -2, 14, 10),
    `<g id="cytoplasm">${g.path(g.D('M-46,-6L-30,-30L30,-30L46,-6L34,26L-34,26Z'), 'url(#cell-gradient)', cyto.outline, 12)}${g.hl(-28, -21, 24, 8, -28, cyto.light)}</g>\n` +
      `<g id="keratin">${['M-34,11C-24,7 -15,7 -6,11', 'M-26,19C-12,13 6,13 22,19', 'M-20,-21C-10,-17 4,-17 20,-21'].map((d) => `<path d="${g.D(d)}" fill="none" stroke="${keratin.small}" stroke-width="10" stroke-linecap="round"/>`).join('')}</g>\n` +
      `<g id="nucleus">${nucEllipse(g, 'nucleus-gradient', 0, -2, 14, 10, 10)}</g>`)
}
// Melanocyte: a dendritic cell, four branching dendrites from a round body, melanin granules round the nucleus. The
// body is pale blue, not SiliCoDraw's beige: a beige lies too close in hue to the brown of the melanin.
{
  const g = page(4.3, [-1, -1]), cyto = soft(BLUE)
  const L = (pts, width) => ({ d: `M${pts.map(g.P).map(([x, y]) => `${f(x)},${f(y)}`).join(' L')}`, width })
  const dendrites = [
    [[[-20, -18], [-44, -40]], [[-44, -40], [-50, -38]], [[-44, -40], [-42, -46]]],
    [[[18, -20], [42, -42]], [[42, -42], [48, -43]], [[42, -42], [41, -48]]],
    [[[-22, 16], [-46, 36]], [[-46, 36], [-52, 35]], [[-46, 36], [-45, 42]]],
    [[[22, 18], [44, 40]], [[44, 40], [50, 38]], [[44, 40], [42, 46]]],
  ].flatMap(([stem, ...forks]) => [L(stem, 13), ...forks.map((p) => L(p, 8))])
  const body = g.smooth([[-24, -18], [-4, -26], [18, -20], [28, 0], [20, 20], [-2, 28], [-24, 18], [-30, 0]])
  cellType('Melanocyte', [['cytoplasm', cyto], ['melanin', MELANIN], ['nucleus', NUC]],
    g.grad('cell-gradient', [-52, -48, 50, 46], cyto) + nucGrad(g, -2, 0, 10),
    `<g id="cytoplasm">${g.union([...dendrites, body], 'url(#cell-gradient)', cyto.outline, 6)}${g.hl(-19, -15, 14, 5.5, -38, cyto.light)}</g>\n` +
      `<g id="melanin">${[[-18, -9], [12, -14], [16, 12], [-14, 14], [-1, -16], [6, 20], [-21, 4], [21, 0]].map(([x, y]) => g.circle(x, y, 3.2, MELANIN.small)).join('')}</g>\n` +
      nucleus(g, -2, 0, 10, 9))
}
// Endothelial cell: a vessel cut lengthwise, its wall a row of flat cells with junctions between them and nuclei that
// bulge into the lumen.
{
  const g = page(4.48, [0, 0])
  const nuclei = [[-34, -13], [-2, -13], [32, -13], [-28, 13], [4, 13], [36, 13]]
  cellType('Endothelial cell', [['endothelium', VESSEL], ['nucleus', NUC]],
    g.grad('cell-gradient', [-50, -26, 50, 26], VESSEL) + nuclei.map(([x, y], i) => nucEllipseGrad(g, `nucleus-gradient-${i + 1}`, x, y, 9, 4.5)).join(''),
    `<g id="endothelium">${rect(g, -50, -26, 100, 52, 16, 'url(#cell-gradient)', VESSEL.outline, 12)}${g.hl(-36, -21, 22, 5, -6, VESSEL.light)}` +
      `${['M-20,-26L-20,-11', 'M14,-26L14,-11', 'M-14,11L-14,26', 'M20,11L20,26'].map((d) => `<path d="${g.D(d)}" fill="none" stroke="${VESSEL.outline}" stroke-width="6" stroke-linecap="round"/>`).join('')}</g>\n` +
      `<g id="lumen">${rect(g, -44, -11, 88, 22, 8, VESSEL.light, VESSEL.outline, 7)}</g>\n` +
      `<g id="nucleus">${nuclei.map(([x, y], i) => nucEllipse(g, `nucleus-gradient-${i + 1}`, x, y, 9, 4.5, 6)).join('')}</g>`)
}
// Pericyte: a capillary seen from the side, the pericyte sitting on it with its processes wrapped round the vessel.
{
  const g = page(4.48, [0, -9])
  const processes = ['M-10,-14C-26,-8 -34,0 -30,12', 'M8,-14C24,-6 30,2 26,14', 'M-2,-14C-4,0 2,8 -2,18'].map((d) => ({ d: g.D(d), width: 11 }))
  const body = g.smooth([[-14, -32], [2, -36], [16, -30], [18, -20], [8, -14], [-10, -14], [-18, -22]])
  cellType('Pericyte', [['capillary', VESSEL], ['pericyte', MURAL], ['nucleus', NUC]],
    g.grad('capillary-gradient', [-50, -14, 50, 14], VESSEL) + g.grad('cell-gradient', [-34, -36, 30, 18], MURAL) + nucGrad(g, 0, -25, 6),
    `<g id="capillary">${rect(g, -50, -14, 100, 28, 14, 'url(#capillary-gradient)', VESSEL.outline, 12)}${rect(g, -42, -5.5, 84, 11, 5.5, VESSEL.light)}</g>\n` +
      `<g id="pericyte">${g.union([...processes, body], 'url(#cell-gradient)', MURAL.outline, 6)}${g.hl(-8, -29, 11, 4.5, -25, MURAL.light)}</g>\n` +
      nucleus(g, 0, -24.5, 6, 7))
}
// Podocyte: a cell of the kidney's filter on a glomerular capillary, its processes ending in interdigitating foot
// processes on the basement membrane, the slits between them bridged by slit diaphragms (the dashed line). Every
// second foot is this cell's own and hangs from one of its processes; the paler ones between are a neighbour's.
{
  const g = page(4.48, [0, -5])
  const processes = ['M-14,-14C-30,-10 -38,-8 -44,-2', 'M14,-14C30,-10 38,-8 44,-2', 'M0,-14L0,-4', 'M-8,-15C-9,-9 -17,-10 -20,-3', 'M8,-15C9,-9 17,-10 20,-3'].map((d) => ({ d: g.D(d), width: 11 }))
  const body = g.smooth([[-20, -40], [0, -46], [20, -40], [26, -24], [14, -14], [-14, -14], [-26, -24]])
  const feet = [-40, -30, -20, -10, 0, 10, 20, 30, 40]
  const footDark = toHex({ l: 0.7, c: 0.09, h: 250 })
  cellType('Podocyte', [['capillary', VESSEL], ['podocyte', MURAL], ['nucleus', NUC]],
    g.grad('capillary-gradient', [-50, 6, 50, 36], VESSEL) + g.grad('cell-gradient', [-30, -46, 30, -4], MURAL) + nucGrad(g, 0, -30, 7),
    `<g id="capillary">${rect(g, -50, 6, 100, 30, 15, 'url(#capillary-gradient)', VESSEL.outline, 12)}${rect(g, -42, 18, 84, 12, 6, VESSEL.light)}` +
      `<path d="${g.D('M-48,2L48,2')}" fill="none" stroke="${VESSEL.outline}" stroke-width="5" stroke-dasharray="9 7" stroke-linecap="round"/></g>\n` +
      `<g id="podocyte">${g.union([...processes, body], 'url(#cell-gradient)', MURAL.outline, 6)}${g.hl(-11, -38, 14, 5, -22, MURAL.light)}` +
      `${feet.map((x, i) => rect(g, x - 3.2, -4.5, 6.4, 8.5, 2.2, i % 2 ? MURAL.small : footDark)).join('')}</g>\n` +
      nucleus(g, 0, -30, 7, 8))
}
// Goblet cell: a cup-shaped cell between two neighbours, its top filled with mucin granules, mucus leaving at the
// surface, the nucleus pressed to the base.
{
  const g = page(4.48, [0, -1.2])
  const cup = g.D('M-18,46L-18,10C-18,-2 -22,-18 -22,-28C-22,-38 22,-38 22,-28C22,-18 18,-2 18,10L18,46Z')
  const neighbours = [-50, 20]
  cellType('Goblet cell', [['cytoplasm', EPI], ['mucus', MUCUS], ['nucleus', NUC]],
    g.grad('neighbour-gradient', [-50, -30, 50, 46], { base: EPI.light, shadow: EPI.base }) + g.grad('cell-gradient', [-22, -36, 22, 46], EPI) +
      [[-35, 24, 7], [35, 24, 7]].map(([x, y, r], i) => g.grad(`nucleus-gradient-${i + 2}`, [x - r, y - r, x + r, y + r], NUC)).join('') + nucEllipseGrad(g, 'nucleus-gradient', 0, 30, 8, 6),
    `<g id="neighbouring-cells">${neighbours.map((x) => rect(g, x, -30, 30, 76, 4, 'url(#neighbour-gradient)', EPI.outline, 12)).join('')}</g>\n` +
      `<g id="neighbour-nuclei">${[[-35, 24, 7], [35, 24, 7]].map(([x, y, r], i) => g.circle(x, y, r, `url(#nucleus-gradient-${i + 2})`, NUC.outline, 8)).join('')}</g>\n` +
      `<g id="cytoplasm">${g.path(cup, 'url(#cell-gradient)', EPI.outline, 12)}</g>\n` +
      `<g id="mucus">${[[-10, -26], [0, -30], [10, -26], [-8, -14], [2, -18], [11, -12], [-4, -4], [6, -2]].map(([x, y]) => g.circle(x, y, 4.6, MUCUS.small)).join('')}` +
      `<path d="${g.D('M-14,-43C-8,-49 8,-49 14,-43')}" fill="none" stroke="${MUCUS.small}" stroke-width="11" stroke-linecap="round"/>${[[-6, -47.5], [6, -47.5]].map(([x, y]) => g.circle(x, y, 2.4, MUCUS.small)).join('')}</g>\n` +
      `<g id="nucleus">${nucEllipse(g, 'nucleus-gradient', 0, 31, 8, 6, 8)}</g>`)
}
// Enterocyte: a tall absorptive cell between two neighbours, a brush border of microvilli on top, the nucleus at the
// base, vesicles of what it has taken up.
{
  const g = page(4.48, [0, 0])
  const villi = [-15, -9, -3, 3, 9, 15]
  cellType('Enterocyte', [['cytoplasm', EPI], ['microvilli', BRUSH], ['vesicles', soft(hueOf('#5fae8b'))], ['nucleus', NUC]],
    g.grad('neighbour-gradient', [-50, -26, 50, 44], { base: EPI.light, shadow: EPI.base }) + g.grad('cell-gradient', [-20, -26, 20, 44], EPI) +
      [-36, 36].map((x, i) => nucEllipseGrad(g, `nucleus-gradient-${i + 2}`, x, 24, 8, 6)).join('') + nucEllipseGrad(g, 'nucleus-gradient', 0, 24, 10, 8),
    `<g id="neighbouring-cells">${[-50, 22].map((x) => rect(g, x, -26, 28, 70, 4, 'url(#neighbour-gradient)', EPI.outline, 12)).join('')}</g>\n` +
      `<g id="neighbour-nuclei">${[-36, 36].map((x, i) => g.ellipse(x, 24, 8, 6, 0, `url(#nucleus-gradient-${i + 2})`, NUC.outline, 8)).join('')}</g>\n` +
      `<g id="microvilli">${villi.map((x) => tube(g.D(`M${x},-24L${x},-43`), BRUSH, 15)).join('')}</g>\n` +
      `<g id="cytoplasm">${rect(g, -20, -26, 40, 70, 4, 'url(#cell-gradient)', EPI.outline, 12)}${g.hl(-11, -18, 12, 5, -60, EPI.light)}</g>\n` +
      `<g id="vesicles">${[[-8, -10], [6, -3], [-3, 5]].map(([x, y]) => g.circle(x, y, 3.2, soft(hueOf('#5fae8b')).small)).join('')}</g>\n` +
      `<g id="nucleus">${nucEllipse(g, 'nucleus-gradient', 0, 25, 10, 8, 9)}</g>`)
}
// Ciliated cell: a cell of the airway lining, a row of motile cilia on its free surface and a round nucleus.
{
  const g = page(5.42, [0, -1])
  const cilia = [-30, -20, -10, 0, 10, 20, 30].map((x) => g.D(`M${x},-10C${x - 4},-22 ${x + 2},-32 ${x + (x < 0 ? -4 : 4)},-42`))
  cellType('Ciliated cell', [['cytoplasm', EPI], ['cilia', CILIA], ['nucleus', NUC]],
    g.grad('cell-gradient', [-40, -12, 40, 40], EPI) + nucGrad(g, 0, 14, 10),
    `<g id="cilia">${cilia.map((d) => tube(d, CILIA, 14)).join('')}</g>\n` +
      `<g id="cytoplasm">${g.path(g.D('M-40,-12L40,-12L40,28C40,34.6 34.6,40 28,40L-28,40C-34.6,40 -40,34.6 -40,28Z'), 'url(#cell-gradient)', EPI.outline, 12)}${g.hl(-28, -3, 24, 7, -10, EPI.light)}</g>\n` +
      nucleus(g, 0, 14, 10))
}

check()
console.log('written to', OUT)
