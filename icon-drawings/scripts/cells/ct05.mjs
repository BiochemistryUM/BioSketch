// Eight icons of SiliCoDraw's "Cells & tissues" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md with the kit in ../cellkit.mjs:
// neuromuscular junction, blood-brain barrier, phagocytosis, endocytosis, exocytosis, differentiation, cell migration
// and necrosis. Their shapes are read by hand from the source in a 100 × 100 box centred on 0,0 and scaled onto a
// 512 page. Endocytosis and exocytosis are a pair: one membrane, one vesicle, one cargo, drawn by the same functions.
// Cells follow the approved cell types (the phagocyte is the green macrophage of ../silicodraw.mjs; every nucleus is
// the shared lilac). Nothing is lettered; an arrow is a stroke with a filled head in the outline tone of its part.
// Usage: node ct05.mjs <folder>
import { deep, hueOf, rich, soft } from '../colour.mjs'
import { BLUE, GREEN, NUC, PEACH, cellTypes, nucGrad, nucleus, page } from '../cellkit.mjs'
import { f } from '../shapes.mjs'

const OUT = process.argv[2]
const { cellType, check } = cellTypes(OUT)

// The hues of the set (OKLCH degrees). The nucleus lilac is about 319°.
// Muscle is the rose of the muscle cells in tissue.mjs, the astrocyte's end-feet the yellow of the astrocyte in nervous.mjs.
const MUSCLE = 15, BLOOD = hueOf('#e86b6b'), ASTRO = 85, JUNCTION = 295, BACTERIUM = 62, CARGO = hueOf('#e3955a'), YELLOW = hueOf('#fde68a'), PINK = 2, ROSE = hueOf('#f3b6b6')

/** A rounded rectangle given in their units. */
const rect = (g, x, y, w, h, rx, fill, s = '', sw = 0) =>
  `<rect x="${f(g.X(x))}" y="${f(g.Y(y))}" width="${f(w * g.k)}" height="${f(h * g.k)}" rx="${f(rx * g.k)}" fill="${fill}"${s ? ` stroke="${s}" stroke-width="${sw}" stroke-linejoin="round"` : ''}/>`
/** An open curve given in their units (absolute M, L and C only), drawn as a line; round ends unless `cap` says otherwise. */
const curve = (g, d, colour, w, cap = 'round') => `<path d="${g.D(d)}" fill="none" stroke="${colour}" stroke-width="${w}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
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
/** A triangle arrowhead with its tip at `to`, pointing away from `from` (their units); length and width in units. */
const head = (g, from, to, len, wide, fill) => {
  const [x0, y0] = from, [x1, y1] = to, d = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / d, uy = (y1 - y0) / d
  const bx = x1 - ux * len, by = y1 - uy * len
  const pts = [[x1, y1], [bx - (uy * wide) / 2, by + (ux * wide) / 2], [bx + (uy * wide) / 2, by - (ux * wide) / 2]].map(g.P)
  return `<path d="M${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' L')}Z" fill="${fill}" stroke="${fill}" stroke-width="3" stroke-linejoin="round"/>`
}
/** An arrow from `a` to `b` (their units): a round-capped line that stops under its head, then the head, in one tone. */
const arrow = (g, a, b, colour, w, len = 7, wide = 8) => {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]), t = (d - len * 0.6) / d
  return g.line([a, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]], colour, w) + head(g, a, b, len, wide, colour)
}
/** A small nucleus with a gradient of its own (several nuclei in one icon): `{ defs, body }`. */
const smallNucleus = (g, id, x, y, r, w) => ({
  defs: g.grad(id, [x - r, y - r, x + r, y + r], NUC),
  body: g.circle(x, y, r, `url(#${id})`, NUC.outline, w) + g.hl(x - r * 0.4, y - r * 0.42, f(r * g.k * 0.26), f(r * g.k * 0.12), -45, NUC.light),
})

// Neuromuscular junction: the end of a motor axon, full of transmitter vesicles, lying over the folded membrane (the
// motor end plate) of a striated muscle fibre. (SiliCoDraw draws the folds as a wavy line on the fibre's straight
// edge; here the edge itself folds, and the striations stop short of it.)
{
  const g = page(4.67, [0, -2.5]), fibre = soft(MUSCLE), axon = soft(PEACH), ves = deep(PEACH)
  // The fibre: a rounded box whose upper edge folds three times under the nerve ending.
  const folds = [-12, 0, 12].map((x) => `C${x - 3.4},10 ${x - 2.6},17 ${x},17 C${x + 2.6},17 ${x + 3.4},10 ${x + 6},10`).join(' ')
  const fibreD = g.D(`M-40,10 L-18,10 ${folds} L40,10 C44.4,10 48,13.6 48,18 L48,36 C48,40.4 44.4,44 40,44 L-40,44 C-44.4,44 -48,40.4 -48,36 L-48,18 C-48,13.6 -44.4,10 -40,10 Z`)
  const bouton = g.D('M-17,-11.5 C-17,-24 17,-24 17,-11.5 C17,-1.5 11,6 0,6 C-11,6 -17,-1.5 -17,-11.5 Z')
  cellType('Neuromuscular junction', [['muscle fibre', fibre], ['nerve ending', axon]],
    g.grad('fibre-gradient', [-48, 10, 48, 44], fibre) + g.grad('axon-gradient', [-17, -48, 17, 5], axon),
    `<g id="muscle-fibre">${g.path(fibreD, 'url(#fibre-gradient)', fibre.outline, 10)}${g.hl(-34, 15.5, 22, 5, -3, fibre.light)}</g>\n` +
      `<g id="striations">${[-36, -24, 24, 36].map((x) => g.line([[x, 18.5], [x, 37.5]], fibre.small, 8)).join('')}${[-12, 0, 12].map((x) => g.line([[x, 25], [x, 37.5]], fibre.small, 8)).join('')}</g>\n` +
      `<g id="nerve-ending">${g.union([{ d: g.D('M-4,-47 C-2,-36 -6,-28 -1,-16'), width: 15 }, bouton], 'url(#axon-gradient)', axon.outline, 7)}${g.hl(-8.5, -16, 13, 5, -28, axon.light)}</g>\n` +
      `<g id="vesicles">${[[-8.5, -7.5], [2, -13], [9, -5], [-1.5, -1]].map(([x, y]) => g.circle(x, y, 3.1, ves.small)).join('')}</g>`)
}
// Blood-brain barrier: a capillary of the brain cut lengthwise. Blood with red cells below, the wall of endothelial
// cells sealed by tight junctions, and the end-feet of astrocytes covering it from the brain side.
{
  const g = page(4.5, [0, -2.15]), endo = soft(BLUE), blood = soft(BLOOD), red = deep(BLOOD), astro = rich(ASTRO), tj = deep(JUNCTION)
  const cells = [-50, -16, 18], feet = [-33, 0, 33]
  const foot = (x) => g.D(`M${x - 14},-5 C${x - 14},-16 ${x - 6},-23 ${x},-25 C${x + 6},-23 ${x + 14},-16 ${x + 14},-5 Z`)
  const processes = ['M-33,-22 C-33,-31 -30,-39 -27,-47', 'M0,-22 L0,-47', 'M33,-22 C33,-31 30,-39 27,-47'].map((d) => ({ d: g.D(d), width: 13 }))
  cellType('Blood-brain barrier', [['endothelium', endo], ['blood', blood], ['astrocyte end-feet', astro], ['tight junctions', tj]],
    g.grad('blood-gradient', [-50, 6, 50, 44], blood) + g.grad('endothelium-gradient', [-50, -2, 50, 14], endo) + g.grad('astrocyte-gradient', [-47, -47, 47, -5], astro),
    `<g id="blood">${rect(g, -50, 6, 100, 38, 0, 'url(#blood-gradient)')}${[[-39, 29, -18], [-12, 35, 12], [15, 27, -10], [39, 34, 16]].map(([x, y, a]) => g.ellipse(x, y, 5.6, 3.7, a, red.small)).join('')}</g>\n` +
      `<g id="vessel-wall">${g.line([[-50, 44], [50, 44]], endo.outline, 10).replace('stroke-linecap="round"', 'stroke-linecap="butt"')}</g>\n` +
      `<g id="astrocyte-end-feet">${g.union([...processes, ...feet.map(foot)], 'url(#astrocyte-gradient)', astro.outline, 6)}${feet.map((x) => g.hl(x - 6, -15, 9, 3.5, -50, astro.light)).join('')}</g>\n` +
      `<g id="endothelium">${cells.map((x) => rect(g, x, -2, 32, 16, 7, 'url(#endothelium-gradient)', endo.outline, 9)).join('')}${cells.map((x) => g.hl(x + 9, 1.6, 12, 3.2, -4, endo.light)).join('')}</g>\n` +
      `<g id="tight-junctions">${[-17, 17].map((x) => rect(g, x - 2.5, 0.2, 5, 11.6, 2.5, tj.outline)).join('')}</g>`)
}
// Phagocytosis: a macrophage (as in ../silicodraw.mjs) closing two pseudopods round a rod-shaped bacterium.
// (SiliCoDraw draws the pseudopods as thin lines over the bacterium; here they are arms of the cell itself.)
{
  const g = page(5.29, [1.2, -0.8]), cyto = soft(GREEN), bact = rich(BACTERIUM)
  const body = [[-41, -8], [-37, -27], [-20, -39], [3, -39.5], [22, -36], [34, -31], [40.5, -25], [38.5, -20.5], [30, -19.2], [20, -15.8], [10.8, -11.6], [4, -5.2], [3.4, 3.5], [9.3, 10.4], [19, 11.6], [29, 8.2], [36.5, 4.8], [41.5, 4.6], [43.5, 9], [39, 16.5], [29, 25.5], [14, 34.5], [-2, 38.5], [-22, 36], [-37, 22]]
  const rod = `M${g.P([15.4, -0.9]).map(f).join(',')} L${g.P([32.6, -7.1]).map(f).join(',')}`
  cellType('Phagocytosis', [['cytoplasm', cyto], ['nucleus', NUC], ['bacterium', bact]],
    g.grad('cell-gradient', [-42, -40, 44, 39], cyto) + nucGrad(g, -17, 1, 11.5) + g.grad('bacterium-gradient', [8, -15, 40, 7], bact),
    `<g id="cytoplasm">${g.path(g.smooth(body), 'url(#cell-gradient)', cyto.outline, 12)}${g.hl(-28, -24, 20, 7, -50, cyto.light)}</g>\n` +
      `<g id="vacuoles">${[[-24, 21, 4.2], [-6, -27, 3.6], [-3, 24.5, 3.2], [-31, -8, 3]].map(([x, y, r]) => g.circle(x, y, r, cyto.small)).join('')}</g>\n` +
      nucleus(g, -17, 1, 11.5) + '\n' +
      `<g id="bacterium"><path d="${rod}" fill="none" stroke="${bact.outline}" stroke-width="${f(14.5 * g.k)}" stroke-linecap="round"/><path d="${rod}" fill="none" stroke="url(#bacterium-gradient)" stroke-width="${f(14.5 * g.k - 16)}" stroke-linecap="round"/>${g.hl(18.5, -5.5, 14, 4, -20, bact.light)}</g>`)
}
// Endocytosis and exocytosis: the same stretch of plasma membrane (outside above, cytoplasm below), drawn as a band,
// with a vesicle of the same membrane and the same cargo. In endocytosis the membrane folds in round cargo from
// outside into a pit with a narrow neck, and a vesicle carries it into the cell; in exocytosis a vesicle arrives,
// opens to the outside as a wide cup and lets its cargo go.
{
  const MEMBRANE = soft(BLUE), CARGO_PAL = deep(CARGO)
  const WIDTH = 34, WALL = 7.5, R_VESICLE = 9, R_CARGO = 3.7
  const scene = (name, membraneD, cargo, vesicle, [from, to]) => {
    // Their units, with the membrane's middle line at y = 0.
    const g = page(4.78, [0, 21.7]), m = MEMBRANE, c = CARGO_PAL
    const [vx, vy] = vesicle
    cellType(name, [['membrane', m], ['cargo', c]],
      g.grad('membrane-gradient', [-48, -4, 48, 28], m) + g.grad('vesicle-gradient', [vx - 12, vy - 12, vx + 12, vy + 12], m),
      `<g id="membrane">${curve(g, membraneD, m.outline, WIDTH, 'butt')}${curve(g, membraneD, 'url(#membrane-gradient)', WIDTH - 2 * WALL, 'butt')}</g>\n` +
        `<g id="vesicle">${g.circle(vx, vy, R_VESICLE, m.light, m.outline, WIDTH)}${g.circle(vx, vy, R_VESICLE, 'none', 'url(#vesicle-gradient)', WIDTH - 2 * WALL)}</g>\n` +
        `<g id="cargo">${[...cargo, vesicle].map(([x, y]) => g.circle(x, y, R_CARGO, c.small)).join('')}</g>\n` +
        `<g id="arrow">${arrow(g, from, to, m.outline, 9, 7, 8.5)}</g>`)
  }
  // Endocytosis: a pit with a narrow neck, cargo outside and in the pit, a vesicle below it, an arrow into the cell.
  scene('Endocytosis',
    'M-48,0 L-17,0 C-10.5,0 -7,2.5 -7,6.2 C-7,8.8 -10.6,9.6 -10.6,14.5 C-10.6,20 -6,23.6 0,23.6 C6,23.6 10.6,20 10.6,14.5 C10.6,9.6 7,8.8 7,6.2 C7,2.5 10.5,0 17,0 L48,0',
    [[-9.5, -11.5], [3, -21.8], [11.5, -10], [0, 14.6]], [0, 56.3], [[0, 30.3], [0, 41.3]])
  // Exocytosis: a wide cup open to the outside, cargo leaving in a fan, a vesicle arriving from below left.
  scene('Exocytosis',
    'M-48,0 L-22,0 C-15.5,0 -12.8,3 -12.8,8 C-12.8,16 -7.2,21 0,21 C7.2,21 12.8,16 12.8,8 C12.8,3 15.5,0 22,0 L48,0',
    [[0, 8.5], [-17.5, -9], [17.5, -9], [-9.5, -17], [9.5, -17], [0, -21.8]], [-26, 56.3], [[-19.9, 42.6], [-11.6, 23.6]])
}
// Differentiation: one stem cell, three arrows, three cells of different shape and colour, each with its nucleus.
{
  const g = page(5.08, [-2, -3]), stem = rich(YELLOW), round = soft(BLUE), blob = soft(PINK), poly = soft(GREEN)
  const n = [smallNucleus(g, 'nucleus-gradient-2', 30, -30, 4.6, 7), smallNucleus(g, 'nucleus-gradient-3', 30, -2.5, 4.6, 7), smallNucleus(g, 'nucleus-gradient-4', 30, 27, 4.6, 7)]
  const aim = (x, y, r) => { const dx = x + 30, dy = y, d = Math.hypot(dx, dy); return [[-30 + (dx / d) * 20, (dy / d) * 20], [x - (dx / d) * r, y - (dy / d) * r]] }
  cellType('Differentiation', [['stem cell', stem], ['nucleus', NUC], ['round cell', round], ['irregular cell', blob], ['polygonal cell', poly]],
    g.grad('stem-gradient', [-46, -16, -14, 16], stem) + nucGrad(g, -30, 0, 6.8) + g.grad('round-gradient', [18, -42, 42, -18], round) + g.grad('irregular-gradient', [18, -12, 43, 8], blob) + g.grad('polygonal-gradient', [18, 16, 42, 36], poly) + n.map((x) => x.defs).join(''),
    `<g id="arrows">${[aim(30, -30, 16), [[-10, -1], [14, -1]], aim(30, 27, 16.2)].map(([a, b]) => arrow(g, a, b, stem.outline, 9, 7, 8.5)).join('')}</g>\n` +
      `<g id="stem-cell">${g.circle(-30, 0, 16, 'url(#stem-gradient)', stem.outline, 12)}${g.hl(-39.5, -8.5, 11, 4.5, -45, stem.light)}</g>\n` +
      nucleus(g, -30, 0, 6.8, 9) + '\n' +
      `<g id="round-cell">${g.circle(30, -30, 12, 'url(#round-gradient)', round.outline, 10)}${g.hl(23.5, -36.5, 8, 3.2, -45, round.light)}${n[0].body}</g>\n` +
      `<g id="irregular-cell">${g.path(g.D('M18,-6 C22,-14 38,-14 42,-6 C44,2 36,8 30,8 C24,8 16,2 18,-6 Z'), 'url(#irregular-gradient)', blob.outline, 10)}${g.hl(25.3, -7.4, 7, 2.8, -25, blob.light)}${n[1].body}</g>\n` +
      `<g id="polygonal-cell">${g.path(roundPoly(g, [[18, 22], [30, 16], [42, 22], [40, 36], [20, 36]], 2.5), 'url(#polygonal-gradient)', poly.outline, 10)}${g.hl(24.5, 21.3, 7, 2.6, -27, poly.light)}${n[2].body}</g>`)
}
// Cell migration: a cell crawling to the right, a broad lamellipodium with bands of actin at its leading edge, the
// nucleus behind and a tail drawn after it; the arrow under it gives the direction. (Corrected: SiliCoDraw's cell is
// round at the back and comes to a point at the front; a crawling cell is broad in front and narrow behind.)
{
  const g = page(4.92, [0.5, 9.1]), cyto = soft(BLUE)
  const body = [[-45, 5], [-36, -4], [-24, -13], [-8, -22], [12, -27], [30, -25], [42, -14], [46, 0], [41, 13], [28, 21], [10, 23], [-8, 19], [-24, 13], [-36, 10]]
  cellType('Cell migration', [['cytoplasm', cyto], ['nucleus', NUC]],
    g.grad('cell-gradient', [-45, -27, 46, 23], cyto) + nucGrad(g, -12, -1, 10),
    `<g id="cytoplasm">${g.path(g.smooth(body), 'url(#cell-gradient)', cyto.outline, 12)}${g.hl(-2, -17.5, 22, 6, -17, cyto.light)}</g>\n` +
      `<g id="lamellipodium">${curve(g, 'M27,-17 C34,-12 37.5,-5 37.5,0 C37.5,5 35,10 30,14', cyto.small, 8)}${curve(g, 'M17,-13 C23,-9 26,-4 26,0 C26,4 24,8 20,11.5', cyto.small, 8)}</g>\n` +
      nucleus(g, -12, -1, 10) + '\n' +
      `<g id="arrow">${arrow(g, [-43.8, 38], [45, 38], cyto.outline, 14, 15, 18)}</g>`)
}
// Necrosis: a swollen cell whose membrane has torn open on one side, its contents leaking out, its nucleus dissolving.
// (SiliCoDraw's faint curved line beside the nucleus is left out: with the nucleus it read as a face.)
{
  const g = page(5.08, [6.1, -1.4]), cyto = soft(ROSE), spill = deep(ROSE)
  // The nucleus is breaking down (karyolysis): its envelope is drawn in eight pieces.
  const turn = (2 * Math.PI * 12 * g.k) / 8, dash = 24
  // Their outline, zigzag at the right; the membrane is left open at the two inner corners of the tear.
  const membrane = ['M30.5,9.8 L36,18 C24,34 -6,40 -26,30 C-40,22 -42,-8 -30,-24 C-18,-40 10,-42 24,-30 L34,-22 L29,-15.8', 'M29.5,-9.1 L38,-2 L31.5,3.2']
  cellType('Necrosis', [['cytoplasm', cyto], ['nucleus', NUC]],
    g.grad('cell-gradient', [-40, -40, 38, 36], cyto) + nucGrad(g, -6, -4, 12),
    `<g id="cytoplasm">${g.path(g.D('M-30,-24 C-18,-40 10,-42 24,-30 L34,-22 L26,-12 L38,-2 L28,6 L36,18 C24,34 -6,40 -26,30 C-40,22 -42,-8 -30,-24 Z'), 'url(#cell-gradient)')}` +
      `${membrane.map((d) => curve(g, d, cyto.outline, 12)).join('')}${g.hl(-22, -24, 20, 7, -42, cyto.light)}</g>\n` +
      `<g id="nucleus">${g.circle(-6, -4, 12, 'url(#nucleus-gradient)')}<circle cx="${f(g.X(-6))}" cy="${f(g.Y(-4))}" r="${f(12 * g.k)}" fill="none" stroke="${NUC.outline}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${dash} ${f(turn - dash)}"/>${g.hl(-11, -9.4, f(12 * g.k * 0.24), f(12 * g.k * 0.1), -45, NUC.light)}</g>\n` +
      `<g id="contents">${[[18, -17, 2.6], [20, 2, 3], [13, 17, 2.6], [33.5, -11.5, 2.5], [44, -18, 3.4], [48.6, -29, 2.6], [46, 2, 3.6], [34.5, 7.5, 2.5], [42.5, 21.5, 3]].map(([x, y, r]) => g.circle(x, y, r, spill.small)).join('')}</g>`)
}

check()
console.log('written to', OUT)
