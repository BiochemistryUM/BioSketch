// Microbes and tissue scenes of SiliCoDraw (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md: a biofilm, a virus, a bacteriophage,
// an amoeba, a paramecium, alveoli, intestinal villi and a pancreatic islet. Their shapes are read by hand from the
// source in a 100 × 100 box centred on 0,0 and scaled onto a 512 page with the kit in ../cellkit.mjs.
// Blood is the red of the red blood cell and a blue for the veins (both `deep`: they are known by their colour); the
// lung and gut tissue are a rose moved 10° from SiliCoDraw's, so that the red of the blood recolours apart from it.
// Usage: node ct04.mjs <folder>
import { GREEN, NUC, cellTypes, circleD, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex } from '../colour.mjs'
import { f } from '../shapes.mjs'

const OUT = process.argv[2]
const { cellType, check } = cellTypes(OUT)

// The hues of the set (OKLCH degrees). The nucleus lilac is about 319°.
const MATRIX = 125, BACTERIA = hueOf('#5fae8b'), ENVELOPE = hueOf('#e9d5f3'), SPIKE = 355, PHAGE = hueOf('#dbe4f7')
const PROTIST = hueOf('#d8ecd0'), TISSUE = 347, ARTERY = hueOf('#d64545'), VEIN = hueOf('#4f6bb8')
const ISLET = 92, BETA = hueOf('#d9824a'), ALPHA = hueOf('#6f86c8')
// A surface (glass, plastic, a tooth): a grey without a hue, so it is left out of the hue check.
const GREY = { light: toHex({ l: 0.985, c: 0, h: 250 }), base: toHex({ l: 0.93, c: 0.006, h: 250 }), shadow: toHex({ l: 0.87, c: 0.008, h: 250 }), small: toHex({ l: 0.8, c: 0.009, h: 250 }), outline: toHex({ l: 0.62, c: 0.01, h: 250 }) }

// A point turned by `deg` degrees about 0,0, as SVG's rotate() turns it.
const turn = (deg, [x, y]) => { const a = (deg * Math.PI) / 180; return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)] }
// A path in their units (absolute M, L, C only) turned about 0,0, still in their units.
const turnD = (deg, d) => d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, x, y) => turn(deg, [+x, +y]).map(f).join(','))
/** A rounded rectangle given in their units, as a path on the page. */
const rrect = (g, x, y, w, h, r) => {
  const [x0, y0] = g.P([x, y]), W = w * g.k, H = h * g.k, R = Math.min(r * g.k, W / 2, H / 2)
  return `M${f(x0 + R)},${f(y0)} H${f(x0 + W - R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + W)},${f(y0 + R)} V${f(y0 + H - R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + W - R)},${f(y0 + H)} H${f(x0 + R)} A${f(R)},${f(R)} 0 0 1 ${f(x0)},${f(y0 + H - R)} V${f(y0 + R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + R)},${f(y0)} Z`
}
/** A finger standing on y = `foot`, `half` wide to each side of x, its round tip reaching up to y = `top` (their units). */
const finger = (g, x, top, foot, half) => {
  const [xl, yb] = g.P([x - half, foot]), [xr, ys] = g.P([x + half, top + half]), R = f(half * g.k)
  return `M${f(xl)},${f(yb)} V${f(ys)} A${R},${R} 0 0 1 ${f(xr)},${f(ys)} V${f(yb)} Z`
}
/** An ellipse of their units turned by `deg` about its centre, as a path on the page (no transform, so its gradient keeps its direction). */
const ellipseTurned = (g, cx, cy, rx, ry, deg) => {
  const K = 0.5523
  const p = [[rx, 0], [rx, K * ry], [K * rx, ry], [0, ry], [-K * rx, ry], [-rx, K * ry], [-rx, 0], [-rx, -K * ry], [-K * rx, -ry], [0, -ry], [K * rx, -ry], [rx, -K * ry], [rx, 0]]
    .map((q) => { const [x, y] = turn(deg, q); return g.P([cx + x, cy + y]).map(f).join(',') })
  return `M${p[0]} C${p[1]} ${p[2]} ${p[3]} C${p[4]} ${p[5]} ${p[6]} C${p[7]} ${p[8]} ${p[9]} C${p[10]} ${p[11]} ${p[12]} Z`
}
/** An open curve given in their units (M, L and C only), drawn as a line with round ends. */
const curve = (g, d, colour, w) => `<path d="${g.D(d)}" fill="none" stroke="${colour}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`
/** One gradient that lights every shape that uses it from its own top left (several cells, several nuclei). */
const boxGrad = (id, pal) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`

// Biofilm: a dome of slime (matrix) on a surface, rod-shaped bacteria lying in it every which way.
// (Seven rods where SiliCoDraw has eight, each a little larger, so that they still show at 40 px.)
{
  const g = page(4.52, [0, 8.2]), matrix = soft(MATRIX), rod = soft(BACTERIA)
  const rods = [[-27, 19, 20], [-11, 3, -30], [10, 10, 15], [27, 21, -20], [-5, 23, 0], [3, -10, 40], [24, 2, 60]]
    .map(([x, y, r]) => { const [u, v] = turn(r, [4.4, 0]); return [[x - u, y - v], [x + u, y + v]] })
  cellType('Biofilm', [['matrix', matrix], ['bacteria', rod]],
    g.grad('matrix-gradient', [-48, -22, 48, 32], matrix),
    `<g id="matrix">${g.path(g.D('M-48,33 C-42,-2 -18,-22 0,-22 C18,-22 42,-2 48,33 Z'), 'url(#matrix-gradient)', matrix.outline, 12)}${g.hl(-25, -5, 24, 8, -42, matrix.light)}</g>\n` +
      `<g id="bacteria">${rods.map((p) => g.line(p, rod.outline, 30) + g.line(p, rod.small, 20)).join('')}</g>\n` +
      `<g id="surface">${g.path(rrect(g, -50, 32.5, 100, 6.5, 2), GREY.shadow, GREY.outline, 7)}</g>`)
}
// Virus: an enveloped particle, twelve spike proteins standing out all round, the capsid with the genome inside.
// (The spikes are rose, 40° from the lilac envelope, so that they recolour apart; the capsid sits in the middle.)
{
  const g = page(4.86, [0, 0]), env = soft(ENVELOPE), spike = soft(SPIKE)
  const rays = Array.from({ length: 12 }, (_, i) => (i / 12) * Math.PI * 2)
  cellType('Virus', [['envelope', env], ['spikes', spike]],
    g.grad('envelope-gradient', [-28, -28, 28, 28], env),
    `<g id="spikes">${rays.map((t) => g.line([[Math.cos(t) * 27, Math.sin(t) * 27], [Math.cos(t) * 40, Math.sin(t) * 40]], spike.outline, 10)).join('')}${rays.map((t) => g.circle(Math.cos(t) * 42, Math.sin(t) * 42, 4.6, spike.small, spike.outline, 5)).join('')}</g>\n` +
      `<g id="envelope">${g.circle(0, 0, 28, 'url(#envelope-gradient)', env.outline, 12)}${g.hl(-17, -16, 22, 8, -45, env.light)}</g>\n` +
      `<g id="capsid">${g.circle(1, 2, 10.5, env.small)}</g>`)
}
// Bacteriophage (T4-like): an icosahedral head, a collar, a striped tail sheath, a baseplate, and tail fibres.
// (Corrected: the two long fibres are kinked at a knee, as a phage's long tail fibres are; SiliCoDraw's four are straight.
// The sheath is a third wider than theirs, so that it does not vanish at 40 px.)
{
  const g = page(4.72, [0, -0.8]), ph = soft(PHAGE)
  const head = [[0, -48], [19, -37], [19, -15], [0, -4], [-19, -15], [-19, -37]]
  const headD = `M${head.map(g.P).map(([x, y]) => `${f(x)},${f(y)}`).join(' L')} Z`
  const fibres = [[[-11, 30], [-25, 20], [-31, 46.5]], [[11, 30], [25, 20], [31, 46.5]], [[-5, 32], [-9, 46.5]], [[5, 32], [9, 46.5]]]
  cellType('Bacteriophage', [['phage', ph]],
    g.grad('head-gradient', [-19, -48, 19, -4], ph) + g.grad('sheath-gradient', [-6.5, 1, 6.5, 28], ph),
    `<g id="tail-fibres">${fibres.map((p) => g.line(p, ph.outline, 10)).join('')}</g>\n` +
      `<g id="tail-sheath">${g.path(rrect(g, -6.5, 0, 13, 28, 2), 'url(#sheath-gradient)', ph.outline, 8)}${[7.5, 14, 20.5].map((y) => g.line([[-6, y], [6, y]], ph.outline, 5)).join('')}</g>\n` +
      `<g id="baseplate">${g.path(rrect(g, -13, 26.5, 26, 6, 2), ph.small, ph.outline, 7)}</g>\n` +
      `<g id="collar">${g.path(rrect(g, -8.5, -3.5, 17, 5.5, 1.5), ph.small, ph.outline, 7)}</g>\n` +
      `<g id="head">${g.path(headD, 'url(#head-gradient)', ph.outline, 10)}${[[head[0], head[3]], [head[5], head[2]], [head[1], head[4]]].map((p) => g.line(p, ph.small, 5)).join('')}${g.path(headD, 'none', ph.outline, 10)}</g>`)
}
// Amoeba: a cell that changes its outline as it crawls (pseudopodia), a nucleus, a clear contractile vacuole, food granules.
{
  const g = page(5.02, [-0.5, 1.2]), cyto = soft(GREEN)
  cellType('Amoeba', [['cytoplasm', cyto], ['nucleus', NUC]],
    g.grad('cell-gradient', [-44, -40, 44, 42], cyto) + g.grad('nucleus-gradient', [-8, -8, 12, 12], NUC),
    `<g id="cytoplasm">${g.path(g.smooth([[-40, -10], [-26, -30], [-4, -24], [10, -40], [26, -26], [22, -8], [44, 2], [30, 18], [36, 36], [12, 30], [-6, 42], [-20, 24], [-44, 20]]), 'url(#cell-gradient)', cyto.outline, 12)}${g.hl(-25, -17, 22, 8, -40, cyto.light)}</g>\n` +
      `<g id="contractile-vacuole">${g.circle(-21, 7, 6, cyto.light, cyto.outline, 5)}</g>\n` +
      `<g id="granules">${[[20, 14], [-10, -14], [18, -12], [24, 28], [-2, 30], [-30, 18]].map(([x, y]) => g.circle(x, y, 2.8, cyto.small)).join('')}</g>\n` +
      `<g id="nucleus">${g.circle(2, 2, 10, 'url(#nucleus-gradient)', NUC.outline, 10)}${g.hl(-2.2, -2.5, 12, 5, -45, NUC.light)}</g>`)
}
// Paramecium: a ciliate, cilia all round, a kidney-shaped macronucleus with the small micronucleus in its hollow, the oral
// groove, and a contractile vacuole towards each end. (Corrected: the micronucleus is added, since a ciliate has both
// kinds of nucleus; the cilia are set evenly round the cell, where SiliCoDraw's crowd at the two ends.)
{
  const g = page(4.53, [0, 0]), cyto = soft(PROTIST), A = 46, B = 18, TURN = -25
  // Points evenly spaced along the outline of the ellipse, with the outward direction at each.
  const fine = Array.from({ length: 721 }, (_, i) => { const t = (i / 720) * Math.PI * 2; return [A * Math.cos(t), B * Math.sin(t)] })
  const along = [0]
  for (let i = 1; i < fine.length; i++) along.push(along[i - 1] + Math.hypot(fine[i][0] - fine[i - 1][0], fine[i][1] - fine[i - 1][1]))
  const cilia = Array.from({ length: 26 }, (_, n) => {
    const want = ((n + 0.5) / 26) * along.at(-1), i = along.findIndex((s) => s >= want), [x, y] = fine[i], len = Math.hypot(x / A / A, y / B / B), nx = x / A / A / len, ny = y / B / B / len
    return [turn(TURN, [x, y]), turn(TURN, [x + nx * 7.6, y + ny * 7.6])]
  })
  const at = (p) => turn(TURN, p)
  cellType('Paramecium', [['cytoplasm', cyto], ['nucleus', NUC]],
    g.grad('cell-gradient', [-42, -30, 42, 30], cyto) + g.grad('nucleus-gradient', [-14, -12, 16, 14], NUC),
    `<g id="cilia">${cilia.map((p) => g.line(p, cyto.outline, 7)).join('')}</g>\n` +
      `<g id="cytoplasm">${g.path(ellipseTurned(g, 0, 0, A, B, TURN), 'url(#cell-gradient)', cyto.outline, 12)}${g.hl(...at([-20, -9.5]), 26, 6, TURN - 6, cyto.light)}</g>\n` +
      `<g id="oral-groove">${curve(g, turnD(TURN, 'M-36,-3 C-28,-1 -22,3 -18,9'), cyto.outline, 6)}</g>\n` +
      `<g id="contractile-vacuoles">${[[-27, 9], [27, -5]].map((p) => g.circle(...at(p), 4, cyto.light, cyto.outline, 5)).join('')}</g>\n` +
      `<g id="macronucleus">${g.path(g.D(turnD(TURN, 'M-12,-10 C0,-18 14,-14 16,-2 C18,8 6,14 -6,10 C0,4 0,-4 -12,-10 Z')), 'url(#nucleus-gradient)', NUC.outline, 8)}${g.hl(...at([6, -9.5]), 9, 3.5, TURN + 12, NUC.light)}</g>\n` +
      `<g id="micronucleus">${g.circle(...at([-9, 1.5]), 2.7, NUC.shadow, NUC.outline, 4.5)}</g>`)
}
// Alveoli: a cluster of air sacs at the end of a bronchiole, capillaries running over them (red: oxygen-rich blood,
// blue: oxygen-poor). (Corrected: the airway opens into the sacs, drawn with one outline; SiliCoDraw closes it off.)
{
  const g = page(4.78, [1, -5]), sac = soft(TISSUE), artery = deep(ARTERY), vein = deep(VEIN)
  // Back to front. The first closes the small gap SiliCoDraw leaves in the middle of the cluster: a sac behind the others.
  const sacs = [[2, 9, 12.5], [0, -12, 12], [-20, -4, 17], [18, -2, 16], [-9, 24, 15], [18, 26, 14]]
  cellType('Alveoli', [['air sacs', sac], ['oxygen-rich blood', artery], ['oxygen-poor blood', vein]],
    g.grad('sac-gradient', [-37, -50, 34, 40], sac),
    `<g id="air-sacs">${g.union([rrect(g, -7, -50, 14, 34, 5), ...sacs.map(([x, y, r]) => circleD(g, x, y, r))], 'url(#sac-gradient)', sac.outline, 12)}${g.hl(-29, -12, 18, 7, -50, sac.light)}${g.hl(-17, 15, 13, 5, -48, sac.light)}${g.hl(11, -11, 13, 5, -48, sac.light)}</g>\n` +
      `<g id="capillaries">${curve(g, 'M-42,-12 C-32,-4 -22,-4 -12,-12 C-2,-20 8,-20 18,-12 C28,-4 28,-4 40,-12', artery.small, 10)}${curve(g, 'M-40,22 C-30,30 -18,30 -8,22 C2,14 14,14 26,22', artery.small, 10)}` +
      `${curve(g, 'M-36,4 C-26,10 -16,10 -6,4 C4,-2 14,-2 24,4 C34,10 36,10 44,4', vein.small, 10)}</g>`)
}
// Intestinal villi: three fingers of the gut lining standing on the gut wall, each with a core of loose tissue and a
// blood vessel running up it. (The core stands for SiliCoDraw's two faint lines along each side: the lining, the
// epithelium, is the band round it.)
{
  const g = page(4.4, [0, 3]), wall = soft(TISSUE), blood = deep(ARTERY)
  const villi = [[-28, -25], [0, -43], [28, -25]]
  cellType('Intestinal villi', [['gut lining', wall], ['blood vessels', blood]],
    g.grad('wall-gradient', [-50, -43, 50, 49], wall),
    `<g id="gut-lining">${g.union([...villi.map(([x, top]) => finger(g, x, top, 44, 11)), rrect(g, -50, 38, 100, 11, 3)], 'url(#wall-gradient)', wall.outline, 10)}</g>\n` +
      `<g id="core">${[...villi.map(([x, top]) => finger(g, x, top + 5.5, 43.5, 5.5)), rrect(g, -45.5, 41, 91, 5, 2.5)].map((d) => `<path d="${d}" fill="${wall.light}"/>`).join('')}</g>\n` +
      `<g id="blood-vessels">${villi.map(([x, top]) => g.line([[x, top + 13.5], [x, 36]], blood.small, 10)).join('')}</g>`)
}
// Pancreatic islet (islet of Langerhans): a cluster of hormone-secreting cells, beta cells (insulin, amber) in the
// middle and alpha cells (glucagon, blue) towards the edge, each with its nucleus.
{
  const g = page(5.33, [0, 0]), islet = rich(ISLET), beta = soft(BETA), alpha = soft(ALPHA)
  const cells = [[-24, -10, 'b'], [-8, -16, 'b'], [8, -12, 'b'], [24, -6, 'a'], [-26, 10, 'a'], [-10, 6, 'b'], [6, 9.5, 'b'], [22, 14, 'b'], [-3, 23, 'a']]
  cellType('Pancreatic islet', [['islet', islet], ['beta cells', beta], ['alpha cells', alpha], ['nucleus', NUC]],
    g.grad('islet-gradient', [-42, -32, 42, 32], islet) + boxGrad('beta-gradient', beta) + boxGrad('alpha-gradient', alpha) + boxGrad('nucleus-gradient', NUC),
    `<g id="islet">${g.ellipse(0, 0, 42, 32, 0, 'url(#islet-gradient)', islet.outline, 12)}${g.hl(-27, -21, 20, 6, -30, islet.light)}</g>\n` +
      `<g id="beta-cells">${cells.filter((c) => c[2] === 'b').map(([x, y]) => g.circle(x, y, 7.3, 'url(#beta-gradient)', beta.outline, 6)).join('')}</g>\n` +
      `<g id="alpha-cells">${cells.filter((c) => c[2] === 'a').map(([x, y]) => g.circle(x, y, 7.3, 'url(#alpha-gradient)', alpha.outline, 6)).join('')}</g>\n` +
      `<g id="nuclei">${cells.map(([x, y]) => g.circle(x + 0.3, y + 0.3, 3, 'url(#nucleus-gradient)', NUC.outline, 4.5)).join('')}</g>`)
}

check()
console.log('written to', OUT)
