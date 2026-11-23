// Tissue cell types of SiliCoDraw (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md: their shapes, read by hand from the
// source in a 100 × 100 box centred on 0,0, scaled onto a 512 page, with pale fills and thick membranes.
// Muscle cells share one rose hue, bone-forming cells one blue (the osteoclast a lighter blue beside it), and the matrix around
// bone and cartilage cells is a part of its own: sand for bone, aqua for cartilage, yellow for osteoid.
// Usage: node tissue.mjs <folder>
import { IVORY, NUC, cellTypes, page } from '../cellkit.mjs'
import { rich, soft } from '../colour.mjs'
import { f } from '../shapes.mjs'

const OUT = process.argv[2]
const { cellType, check } = cellTypes(OUT)

// The hues of the set (OKLCH degrees). The nucleus lilac is about 319°.
const MUSCLE = 15, BONE_CELL = 255, OSTEOCLAST = 222, BONE = 70, OSTEOID = 110, CARTILAGE = 185, HEPATOCYTE = 66, SATELLITE = 158, LAMINA = 255

/** A rounded rectangle given in their units, as a path on the page. */
const rrect = (g, x, y, w, h, r) => {
  const [x0, y0] = g.P([x, y]), W = w * g.k, H = h * g.k, R = Math.min(r * g.k, W / 2, H / 2)
  return `M${f(x0 + R)},${f(y0)} H${f(x0 + W - R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + W)},${f(y0 + R)} V${f(y0 + H - R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + W - R)},${f(y0 + H)} H${f(x0 + R)} A${f(R)},${f(R)} 0 0 1 ${f(x0)},${f(y0 + H - R)} V${f(y0 + R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + R)},${f(y0)} Z`
}
/** A polygon given in their units with its corners rounded (radius in their units), as a path on the page. */
const roundPoly = (g, pts, r) => {
  const n = pts.length, P = pts.map(g.P), R = r * g.k
  const toward = (a, b, d) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), t = Math.min(d, L / 2) / L; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] }
  let d = ''
  for (let i = 0; i < n; i++) {
    const prev = P[(i - 1 + n) % n], cur = P[i], next = P[(i + 1) % n]
    const a = toward(cur, prev, R), b = toward(cur, next, R)
    d += `${i ? 'L' : 'M'}${f(a[0])},${f(a[1])} Q${f(cur[0])},${f(cur[1])} ${f(b[0])},${f(b[1])} `
  }
  return d + 'Z'
}
/** An ellipse given in their units, as a path on the page (for `g.union`). */
const ellipseD = (g, x, y, rx, ry) => { const [cx, cy] = g.P([x, y]), RX = f(rx * g.k), RY = f(ry * g.k); return `M${f(cx - RX)},${f(cy)} A${RX},${RY} 0 1 0 ${f(cx + RX)},${f(cy)} A${RX},${RY} 0 1 0 ${f(cx - RX)},${f(cy)} Z` }
/** An open curve given in their units (M and C only), drawn as a line with round ends. */
const curve = (g, d, colour, w) => `<path d="${g.D(d)}" fill="none" stroke="${colour}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`
/** One gradient that lights every shape that uses it from its own top left (several nuclei, several cells). */
const boxGrad = (id, pal) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`
/** A small nucleus: lilac, outlined, with a little highlight when it has room for one. */
const smallNucleus = (g, x, y, rx, ry, rot, w, light = true) =>
  g.ellipse(x, y, rx, ry, rot, 'url(#nucleus-gradient)', NUC.outline, w) + (light ? g.hl(x - rx * 0.4, y - ry * 0.4, f(rx * g.k * 0.3), f(ry * g.k * 0.18), rot - 20, NUC.light) : '')

// Hepatocyte: a polygonal liver cell with two nuclei and glycogen granules.
{
  const g = page(5.32, [-1.2, 0.5]), cyto = soft(HEPATOCYTE)
  const corners = [[-20, -38], [20, -38], [42, -10], [34, 30], [-10, 40], [-40, 20], [-44, -16]]
  cellType('Hepatocyte', [['cytoplasm', cyto], ['nucleus', NUC]],
    g.grad('cell-gradient', [-44, -38, 42, 40], cyto) + boxGrad('nucleus-gradient', NUC),
    `<g id="cytoplasm">${g.path(roundPoly(g, corners, 6), 'url(#cell-gradient)', cyto.outline, 12)}${g.hl(-26, -22, 26, 9, -40, cyto.light)}</g>\n` +
      `<g id="granules">${[[20, -20], [-26, 8], [4, 26], [-22, -22], [26, 24], [-8, 14], [28, 2]].map(([x, y]) => g.circle(x, y, 2.6, cyto.small)).join('')}</g>\n` +
      `<g id="nuclei">${g.circle(-10, -6, 9.5, 'url(#nucleus-gradient)', NUC.outline, 10)}${g.hl(-14.5, -10.5, 14, 6, -45, NUC.light)}${g.circle(14, 8, 8.5, 'url(#nucleus-gradient)', NUC.outline, 10)}${g.hl(10, 4, 12, 5, -45, NUC.light)}</g>`)
}
// Cardiomyocyte: a striated heart muscle cell that branches at one end, an intercalated disc and one central nucleus.
// (Corrected: SiliCoDraw leaves the branches bare; they are muscle too, so the striations run on across them.)
{
  const g = page(4.5, [0.5, 0]), cyto = soft(MUSCLE)
  const parts = [rrect(g, -48, -11, 72, 22, 11), g.D('M16,-4 L42,-24 L49,-16 L23,4 Z'), g.D('M16,4 L42,24 L49,16 L23,-4 Z')]
  cellType('Cardiomyocyte', [['cytoplasm', cyto], ['nucleus', NUC]],
    g.grad('cell-gradient', [-48, -24, 49, 24], cyto) + g.grad('nucleus-gradient', [-20, -4.5, -4, 4.5], NUC),
    `<g id="cytoplasm">${g.union(parts, 'url(#cell-gradient)', cyto.outline, 12)}${g.hl(-38, -5.5, 22, 5, -6, cyto.light)}</g>\n` +
      `<g id="striations">${[-38, -30, -22, 0, 8].map((x) => g.line([[x, -7.5], [x, 7.5]], cyto.small, 7)).join('')}${[-1, 1].map((s) => [[30.4, 8.4], [37.9, 14.2]].map(([x, y]) => g.line([[x - 2.2, s * (y + 2.5)], [x + 2.2, s * (y - 2.5)]], cyto.small, 7)).join('')).join('')}</g>\n` +
      `<g id="intercalated-disc">${g.line([[14, -8], [17, -4], [14, 0], [17, 4], [14, 8]], cyto.outline, 6)}</g>\n` +
      `<g id="nucleus">${g.ellipse(-12, 0, 8, 4.5, 0, 'url(#nucleus-gradient)', NUC.outline, 7)}${g.hl(-15, -1.6, 9, 3, -8, NUC.light)}</g>`)
}
// Smooth muscle cells: three spindles side by side, each with its long central nucleus.
{
  const g = page(4.7, [0, 0]), cyto = soft(MUSCLE)
  const at = [[-6, -16], [6, 0], [-6, 16]]
  const spindle = ([x, y]) => g.D(`M${x - 42},${y} C${x - 26},${y - 8.5} ${x + 26},${y - 8.5} ${x + 42},${y} C${x + 26},${y + 8.5} ${x - 26},${y + 8.5} ${x - 42},${y} Z`)
  cellType('Smooth muscle cell', [['cytoplasm', cyto], ['nucleus', NUC]],
    boxGrad('cell-gradient', cyto) + boxGrad('nucleus-gradient', NUC),
    `<g id="cytoplasm">${at.map((p) => g.path(spindle(p), 'url(#cell-gradient)', cyto.outline, 9) + g.hl(p[0] - 18, p[1] - 3.2, 18, 3.5, -5, cyto.light)).join('')}</g>\n` +
      `<g id="nuclei">${at.map(([x, y]) => g.ellipse(x + 2, y + 0.4, 11, 3.4, 0, 'url(#nucleus-gradient)', NUC.outline, 6)).join('')}</g>`)
}
// Muscle satellite cell: a stem cell sitting on a muscle fibre (myofibrils, myonuclei), under the fibre's basal lamina.
// (Corrected: SiliCoDraw sets the myonuclei in the middle of the fibre, which is how a regenerating or diseased fibre
// looks; in a healthy fibre they lie at its edge, under the membrane.)
{
  const g = page(4.48, [0, -4]), fibre = soft(MUSCLE), sat = soft(SATELLITE), lamina = soft(LAMINA)
  cellType('Muscle satellite cell', [['muscle fibre', fibre], ['satellite cell', sat], ['basal lamina', lamina], ['nucleus', NUC]],
    g.grad('fibre-gradient', [-50, -14, 50, 22], fibre) + g.grad('satellite-gradient', [-16, -27, 16, -14], sat) + boxGrad('nucleus-gradient', NUC),
    `<g id="muscle-fibre">${g.path(rrect(g, -50, -14, 100, 36, 12), 'url(#fibre-gradient)', fibre.outline, 12)}${g.hl(-36, -7.5, 30, 6, -4, fibre.light)}</g>\n` +
      `<g id="myofibrils">${[-0.5, 4, 8.5].map((y) => g.line([[-40, y], [40, y]], fibre.small, 5)).join('')}</g>\n` +
      `<g id="myonuclei">${[[31, -7.3], [-28, 15.3], [12, 15.3]].map(([x, y]) => smallNucleus(g, x, y, 7.5, 3.6, 0, 6, false)).join('')}</g>\n` +
      `<g id="satellite-cell">${g.path(g.D('M-17,-15.5 C-17,-30.5 17,-30.5 17,-15.5 Z'), 'url(#satellite-gradient)', sat.outline, 10)}${smallNucleus(g, 0, -19.8, 6.5, 3.4, 0, 6, false)}${g.hl(-9, -22.5, 9, 4, -35, sat.light)}</g>\n` +
      `<g id="basal-lamina"><path d="M${[[-50, -19], [-23.5, -19]].map(g.P).map(([x, y]) => `${f(x)},${f(y)}`).join(' L')} ${g.D('C-23.5,-35.5 23.5,-35.5 23.5,-19')} L${f(g.X(50))},${f(g.Y(-19))}" fill="none" stroke="${lamina.outline}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="14 11"/></g>`)
}
// Osteoclast: a large multinucleated cell on bone, its ruffled border resorbing a pit (Howship's lacuna) into it.
{
  const g = page(4.5, [0, 12.75]), cell = soft(OSTEOCLAST), bone = IVORY
  const zig = Array.from({ length: 14 }, (_, i) => [-26 + 4 * i, i % 2 ? 21.5 : 27.5])
  cellType('Osteoclast', [['cytoplasm', cell], ['bone', bone], ['nucleus', NUC]],
    g.grad('bone-gradient', [-50, 22, 50, 46], bone) + g.grad('cell-gradient', [-36, -20, 36, 32], cell) + boxGrad('nucleus-gradient', NUC),
    `<g id="bone">${g.path(g.D('M-50,22 L-26,22 C-18,34 18,34 26,22 L50,22 L50,46 L-50,46 Z'), 'url(#bone-gradient)', bone.outline, 10)}${[[-43, 39, 10], [-8, 40.5, 12], [30, 38, 10]].map(([x, y, w]) => g.line([[x, y], [x + w, y]], bone.small, 6)).join('')}</g>\n` +
      `<g id="cytoplasm">${g.path(g.D('M-36,22 C-36,-6 -14,-22 2,-20 C22,-20 38,-6 36,22 C30,34 -28,36 -36,22 Z'), 'url(#cell-gradient)', cell.outline, 12)}${g.hl(-19, -11, 18, 7, -42, cell.light)}</g>\n` +
      `<g id="ruffled-border">${g.line(zig, cell.outline, 5)}</g>\n` +
      `<g id="nuclei">${[[-18, -1], [0, -8], [18, 0], [-6, 10], [12, 11]].map(([x, y]) => g.circle(x, y, 5.6, 'url(#nucleus-gradient)', NUC.outline, 6) + g.hl(x - 2.2, y - 2.3, 7, 3, -45, NUC.light)).join('')}</g>`)
}
// Osteoblasts: a row of cuboidal cells laying down osteoid (unmineralised matrix) on bone.
{
  const g = page(4.5, [0, 8]), cell = soft(BONE_CELL), bone = IVORY, osteoid = rich(OSTEOID)
  cellType('Osteoblast', [['cytoplasm', cell], ['bone', bone], ['osteoid', osteoid], ['nucleus', NUC]],
    g.grad('bone-gradient', [-50, 10, 50, 40], bone) + g.grad('osteoid-gradient', [-50, 2, 50, 10], osteoid) + boxGrad('cell-gradient', cell) + boxGrad('nucleus-gradient', NUC),
    `<g id="bone">${g.path(rrect(g, -50, 10, 100, 30, 6), 'url(#bone-gradient)', bone.outline, 10)}${[[-44, 22, 10], [-30, 31, 12], [-10, 20, 10], [12, 31, 12], [30, 19, 10]].map(([x, y, w]) => g.line([[x, y], [x + w, y]], bone.small, 6)).join('')}</g>\n` +
      `<g id="osteoid">${g.path(rrect(g, -50, 2, 100, 8, 2), 'url(#osteoid-gradient)', osteoid.outline, 6)}</g>\n` +
      `<g id="cytoplasm">${[-32, 0, 32].map((x) => g.path(rrect(g, x - 14, -24, 28, 26, 6), 'url(#cell-gradient)', cell.outline, 10) + g.hl(x - 7.5, -18.5, 13, 5, -35, cell.light)).join('')}</g>\n` +
      `<g id="nuclei">${[-32, 0, 32].map((x) => g.circle(x, -11, 5.5, 'url(#nucleus-gradient)', NUC.outline, 7) + g.hl(x - 2.2, -13.3, 7, 3, -45, NUC.light)).join('')}</g>`)
}
// Osteocyte: a cell walled into bone in its lacuna, its processes reaching out through the matrix (lamellae drawn faint).
{
  const g = page(4.88, [0, 0]), cell = soft(BONE_CELL), bone = IVORY
  // Corrected: in SiliCoDraw the processes start at the rim of the lacuna; here they grow from the cell itself.
  const processes = [[[-11, -6], [-36, -22]], [[-13, 3], [-42, 6]], [[-9, 7], [-30, 30]], [[11, -6], [36, -22]], [[13, 3], [42, 6]], [[9, 7], [30, 30]], [[-4, -8], [-8, -35]], [[4, -8], [8, -35]], [[0, 8], [0, 37]]]
  cellType('Osteocyte', [['cytoplasm', cell], ['bone', bone], ['nucleus', NUC]],
    g.grad('bone-gradient', [-46, -40, 46, 40], bone) + g.grad('cell-gradient', [-14, -9, 14, 9], cell) + g.grad('nucleus-gradient', [-7, -5, 7, 5], NUC),
    `<g id="bone">${g.path(rrect(g, -46, -40, 92, 80, 8), 'url(#bone-gradient)', bone.outline, 10)}${g.hl(-33, -29, 26, 8, -30, bone.light)}` +
      `${[-24, 0, 24].map((y) => curve(g, `M-40,${y} C-14,${y - 6} 14,${y + 6} 40,${y}`, bone.small, 5)).join('')}` +
      `${g.ellipse(0, 0, 19, 13.5, 0, bone.light, bone.outline, 5)}</g>\n` +
      `<g id="cytoplasm">${g.union([...processes.map((p) => ({ d: `M${p.map(g.P).map(([x, y]) => `${f(x)},${f(y)}`).join(' L')}`, width: 5 })), ellipseD(g, 0, 0, 14, 9)], 'url(#cell-gradient)', cell.outline, 5)}${g.hl(-7, -5, 14, 4.5, -20, cell.light)}</g>\n` +
      `<g id="nucleus">${smallNucleus(g, 1, 0.5, 7, 5, 0, 6)}</g>`)
}
// Chondrocytes: hyaline cartilage matrix with four lacunae, each holding a pair of cells (an isogenous group).
{
  const g = page(4.88, [0, 0]), cell = soft(BONE_CELL), matrix = soft(CARTILAGE)
  const lacunae = [[-20, -14], [18, -18], [-16, 18], [20, 14]]
  cellType('Chondrocyte', [['cytoplasm', cell], ['matrix', matrix], ['nucleus', NUC]],
    g.grad('matrix-gradient', [-46, -40, 46, 40], matrix) + boxGrad('cell-gradient', cell) + boxGrad('nucleus-gradient', NUC),
    `<g id="matrix">${g.path(rrect(g, -46, -40, 92, 80, 8), 'url(#matrix-gradient)', matrix.outline, 10)}${g.hl(-36, -33, 22, 6, -20, matrix.light)}${lacunae.map(([x, y]) => g.ellipse(x, y, 17.5, 13, 0, matrix.light, matrix.outline, 5)).join('')}</g>\n` +
      `<g id="cytoplasm">${lacunae.map(([x, y]) => [x - 5.5, x + 6].map((cx) => g.circle(cx, y, 7.5, 'url(#cell-gradient)', cell.outline, 6)).join('')).join('')}</g>\n` +
      `<g id="nuclei">${lacunae.map(([x, y]) => [x - 5.5, x + 6].map((cx) => g.circle(cx + 0.5, y + 0.3, 3.4, 'url(#nucleus-gradient)', NUC.outline, 4.5)).join('')).join('')}</g>`)
}

check()
console.log('written to', OUT)
