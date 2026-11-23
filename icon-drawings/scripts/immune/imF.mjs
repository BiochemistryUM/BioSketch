// Eight icons of SiliCoDraw's "Immunology & infection" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David
// Carlsson; see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts:
// Lymph node, Spleen, Thymus, Bone marrow, Inflammation, Allergy, Autoimmunity and Transplant. Compositions are read by
// hand from the source in its 100 × 100 box centred on 0,0 (the later drawings that replace the first) and scaled onto a
// 512 page (`page` of ../cellkit.mjs); outlines at 60 % (setStrokeScale), gloss on: the organs (lymph node, spleen,
// thymus, kidney) and the pollen grain are closed round bodies and carry the face-on gloss of cells (`gloss` of
// surfaces.mjs), drawn here as immune.mjs draws it; the bone in section, the flame and the person are not glossed.
// Parts used: vessel (artery, vein, lymphatics, ureter), placeCellType ('Macrophage', 'Mast cell'), arrow, EPI (tissue.mjs);
// lymphocyte, targetCell, antibodyCoat, cytokines, ARTERY, VEIN, LYMPH, B_CELL, T_CELL (immune.mjs); person (assays.mjs);
// gloss, glossTones, pathPoints (surfaces.mjs); INK, objW (lab.mjs).
// Drawn here because no part draws them: the organs (lymph node with its follicles and valved lymphatics, spleen with its
// white pulp, thymus with its lobules, a long bone in section with its marrow, a kidney cut from its vessels), a flame and
// a pollen grain.
// Lettered: nothing.
// Usage: node imF.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss } from '../cellkit.mjs'
import { deep, hueGap, hueOf, rich, soft, toHex, toLch } from '../colour.mjs'
import { f, setStrokeScale, strokeScale } from '../shapes.mjs'
import { ARTERY, B_CELL, CYTOKINE2, LYMPH, T_CELL, VEIN, antibodyCoat, cytokines, lymphocyte, targetCell } from '../parts/immune.mjs'
import { person } from '../parts/assays.mjs'
import { INK, objW } from '../parts/lab.mjs'
import { gloss, glossTones, pathPoints } from '../parts/surfaces.mjs'
import { CELL, arrow, cellW, placeCellType, vessel } from '../parts/tissue.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012: ink, the ivory of bone) are left out of the hue check; the same palette used by several
// parts is one colour, listed once, and parts of one hue (nuclei whose tones differ by a shade) count once.
const icon = (name, [k, cx, cy], draw) => {
  const g = page(k, [cx, cy]), { defs, body, parts } = draw(g)
  const seen = parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base || hueGap(toLch(q.base).h, toLch(p.base).h) < 3) === i)
  kit.cellType(name, seen, defs, body)
}
const join = (...ps) => ({ defs: ps.map((p) => p.defs ?? '').join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts ?? []) })
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })

// ---------- small drawing helpers in g's units ----------
const P2 = (p) => p.map(f).join(',')
const strokeD = (d, colour, w, cap = 'round') => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
const fillD = (d, fill, s = '', w = 0) => `<path d="${d}" fill="${fill}"${s ? ` stroke="${s}" stroke-width="${f(w)}" stroke-linejoin="round"` : ''}/>`
const polyline = (g, pts, close = false) => `M${pts.map((p) => P2(g.P(p))).join(' L')}${close ? 'Z' : ''}`
/** A path in source units (absolute M, L, C, written with commas), each point moved onto the page. */
const mapD = (g, d) => d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, a, b) => P2(g.P([+a, +b])))
/** A vessel (tissue.mjs) along a course, `width` its outer width in g's units: vessel draws the tube as a stroke, which
 *  setStrokeScale thins with the outlines, so the size is given back here. */
const tube = (g, points, width, pal, id) => vessel(g, { points, size: width / 0.4 / strokeScale(), thick: 0.4, ends: 'open', pal, id })
const dots = (g, pts, r) => pts.map(([x, y]) => { const [X, Y] = g.P([x, y]), R = r * g.k; return `M${f(X - R)},${f(Y)} A${f(R)},${f(R)} 0 1 0 ${f(X + R)},${f(Y)} A${f(R)},${f(R)} 0 1 0 ${f(X - R)},${f(Y)} Z` }).join(' ')
const lin = (id, [x0, y0, x1, y1], a, b) => `<linearGradient id="${id}" x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`
const boxOf = (d) => { const p = pathPoints(d).flat(), xs = p.map((q) => q[0]), ys = p.map((q) => q[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] }

/**
 * A closed biological body (an organ, a pollen grain) in the gloss of cells, as immune.mjs's bodies: the outlines `ds`
 * (page paths) filled as one with a gradient from the base to the gloss's end tone, one outline round them all, then the
 * face-on tones over it (shade and shadow from 40 px, lit band and highlight from 90 px).
 */
function glossBody(id, ds, pal, w) {
  const box = boxOf(ds.join(' ')), px = Math.max(box[2] - box[0], box[3] - box[1]), T = glossTones(pal)
  const defs = lin(`${id}-gradient`, box, pal.base, T.end)
  let s = ds.map((d) => fillD(d, pal.outline, pal.outline, 2 * w)).join('') + ds.map((d) => fillD(d, `url(#${id}-gradient)`)).join('')
  if (ds.length === 1) s = fillD(ds[0], `url(#${id}-gradient)`, pal.outline, w)
  if (px >= 40) {
    const G = gloss({ fills: ds.map(pathPoints) }, { inset: (w * strokeScale()) / 2 })
    s += ['shade', 'shadow', ...(px >= 90 ? ['lit', 'highlight'] : [])].map((k) => (G[k] ? `<path d="${G[k]}" fill="${T[k]}"/>` : '')).join('')
  }
  return { defs, body: s }
}

// A flame drawn as Inflammaging's (imE.mjs): an orange-red flame with a pale core, an object of a picture (no gloss).
const FLAME = deep(35)
function flame(g, { x, y, size, id = 'flame' }) {
  const k = size / 92, T = (d) => d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, a, b) => `${f(x + a * k)},${f(y + b * k)}`)
  const w = objW(size * g.k)
  const fl = T('M0,46C-22,46 -36,32 -36,14C-36,-4 -24,-14 -20,-28C-14,-20 -12,-14 -12,-8C-6,-20 -2,-34 6,-46C10,-32 22,-24 28,-12C30,-16 30,-20 30,-24C36,-14 38,-2 36,12C34,32 20,46 0,46Z')
  const core = T('M0,42C-14,42 -22,32 -22,20C-22,10 -16,2 -12,-6C-10,0 -8,4 -6,6C-4,-2 0,-10 4,-16C8,-6 16,0 18,10C20,0 20,-2 20,-4C24,4 24,12 22,22C20,34 12,42 0,42Z')
  const [a, b] = g.P([x - 36 * k, y - 46 * k]), [c, d] = g.P([x + 36 * k, y + 46 * k]), [e, h] = g.P([x - 22 * k, y - 16 * k]), [i2, j] = g.P([x + 24 * k, y + 42 * k])
  const defs = lin(`${id}-gradient`, [a, b, c, d], FLAME.base, FLAME.shadow) + lin(`${id}-core-gradient`, [e, h, i2, j], '#FFFFFF', FLAME.light)
  return own(id, fillD(mapD(g, fl), `url(#${id}-gradient)`, FLAME.outline, w) + fillD(mapD(g, core), `url(#${id}-core-gradient)`), [['flame', FLAME]], defs)
}

// A kidney (as SiliCoDraw's Transplant): a bean with its hilum to the right, the medullary pyramids and, from 90 px, the renal pelvis
// inside (pale yellow, as the ureter it drains into).
const KIDNEY = soft(335), URETER = rich(95)
function kidney(g, { x, y, size, id = 'kidney' }) {
  const k = size / 48, at = ([u, v]) => [x + (u + 31) * k, y + (v - 1) * k]
  const K = [[-31, -23], [-21, -21], [-16, -13], [-18, -5], [-21, 1], [-18, 7], [-16, 15], [-21, 23], [-31, 25], [-41, 19], [-46, 8], [-47, -2], [-45, -12], [-39, -20]]
  const d = g.smooth(K.map(at)), px = size * g.k, w = cellW(px) * 0.8
  const b = glossBody(id, [d], KIDNEY, w)
  let s = b.body
  if (px >= 90) {
    const tri = (pts) => polyline(g, pts.map(at), true)
    s += fillD(tri([[-33, -14], [-39, -7], [-30, -5]]) + ' ' + tri([[-38, 2], [-40, 10], [-31, 6]]) + ' ' + tri([[-34, 14], [-29, 20], [-27, 11]]), KIDNEY.small)
    s += fillD(g.smooth([[-21, 1], [-25, -4], [-29, -5.5], [-32, -2], [-32, 4], [-29, 7.5], [-25, 6.5]].map(at)), URETER.light, KIDNEY.outline, w * 0.5)
  }
  return own(id, s, [['kidney', KIDNEY]], b.defs)
}

// ---------- the icons ----------
// Lymph node: a bean-shaped node in its capsule, the follicles (B cell zones, in the B cell's green, each with a pale
// germinal centre) round the cortex, the medullary cords running to the hilum at the right; three afferent lymphatics
// enter round the convex side, and at the hilum the efferent lymphatic leaves between an artery and a
// vein (the lymphatics' valves are left out: they do not read at this size). The node is lilac (as SiliCoDraw's; the Germinal centre's 265 lies 3° from the vein); lymphatics the pale yellow
// of immune.mjs.
const NODE = soft(300)
icon('Lymph node', [4.71, 0.5, 0], (g) => {
  const Pt = [[-44, -4], [-40, -22], [-26, -34], [-6, -38], [14, -35], [30, -26], [38, -14], [34, -5], [30, 2], [34, 9], [38, 18], [30, 28], [14, 35], [-6, 38], [-26, 34], [-40, 20]].map(([x, y]) => [x * 0.88 - 3, y * 0.88])
  const node = glossBody('lymph-node', [g.smooth(Pt)], NODE, cellW(84 * g.k))
  const L = (pts, id) => tube(g, pts, 6, LYMPH, id)
  const aff = [[[-34, -41], [-31, -36], [-28, -31], [-26, -27]], [[-48, -5], [-44, -4.5], [-40, -3.5], [-37, -3]], [[-34, 41], [-31, 36], [-28, 31], [-26, 27]]].map((p, i) => L(p, `afferent-lymphatic${i + 1}`))
  const eff = L([[20, 2], [30, 3], [38, 5], [48, 6]], 'efferent-lymphatic')
  const art = tube(g, [[20, -3], [30, -7], [38, -10], [48, -13]], 5, ARTERY, 'artery')
  const vein = tube(g, [[20, 9], [30, 12], [38, 15], [48, 19]], 6, VEIN, 'vein')
  const cords = own('medullary-cords', strokeD(mapD(g, 'M21,2C10,-2 0,-5 -12,-7M21,2C8,3 -4,5 -14,9M21,2C13,-7 7,-13 -1,-16M21,2C13,10 7,15 -1,18'), NODE.outline, cellW(30) * 0.55), [])
  const F = [[-30, -11], [-29, 10], [-19, -22], [-18, 22], [-2, -25], [-2, 25], [13, -19], [13, 19]]
  const fw = cellW(12 * g.k) * 0.7
  const follicles = own('follicles', F.map(([x, y]) => g.circle(x, y, 6, B_CELL.base, B_CELL.outline, fw)).join('') + fillD(dots(g, F.map(([x, y]) => [x + 0.8, y + 0.6]), 2.9), B_CELL.light), [['follicles', B_CELL]])
  return join(...aff, eff, art, vein, own('capsule', node.body, [['node', NODE]], node.defs), cords, follicles)
})

// Spleen: the bean of the spleen with the notches of its upper border, its red pulp in a red-violet, white pulp as pale
// nodules each round its central arteriole; the splenic artery and vein enter at the hilum below.
const PULP = deep(335)
icon('Spleen', [4.98, 0.6, 0.6], (g) => {
  const pts = [[-44, -2], [-40, -14], [-30, -21], [-18, -23], [-12, -22], [-9, -18], [-6, -22.5], [4, -24], [14, -22], [19, -20.5], [22, -16.5], [25, -20], [34, -17], [42, -9], [45, 2], [40, 13], [30, 18], [18, 18], [8, 14], [0, 13], [-10, 15], [-22, 19], [-34, 17], [-42, 9]]
  const c = Math.cos((-28 * Math.PI) / 180), n = Math.sin((-28 * Math.PI) / 180), T = ([x, y]) => [1.08 * (x * c - y * n), 1.08 * (x * n + y * c) - 3]
  const art = tube(g, [[-4, 40], [-4, 32], [-3, 24], [-2.5, 12]].map(T), 6, ARTERY, 'splenic-artery')
  const vein = tube(g, [[7, 40], [7, 32], [6, 24], [5, 12]].map(T), 7, VEIN, 'splenic-vein')
  const body = glossBody('spleen', [g.smooth(pts.map(T))], PULP, cellW(90 * g.k))
  const notch = strokeD(mapD(g, [[[-9, -18], [-9, -15], [-9, -13], [-8, -11]], [[22, -16.5], [22, -13.5], [21, -11.5], [20, -9.5]]].map((q) => 'M' + q.map(T).map((p) => p.map(f).join(',')).join('L')).join('')), PULP.outline, cellW(30) * 0.6)
  const W = [[-32, -4], [-22, 6], [-14, -8], [-4, 2], [6, -12], [16, 0], [28, -6], [34, 6], [-30, 9], [6, -1]].map(T)
  const white = own('white-pulp', fillD(dots(g, W, 3.2), PULP.light) + fillD(dots(g, W, 1.1), ARTERY.small), [])
  return join(art, vein, own('red-pulp', body.body + notch, [['spleen', PULP]], body.defs), white)
})

// Thymus: two lobes side by side, lobulated at their edges, each lobule with its paler medulla in the middle of a darker
// cortex, and the septa between lobules. Pink, as SiliCoDraw draws it.
const THYMUS = soft(350)
icon('Thymus', [5.07, 0.5, -0.5], (g) => {
  const Lp = [[-6, -46], [-11, -42], [-14, -34], [-18, -26], [-24, -18], [-30, -8], [-34, 2], [-37, 12], [-38, 22], [-35, 32], [-28, 39], [-18, 43], [-9, 41], [-3, 34], [-0.5, 22], [-0.5, 8], [-1.5, -6], [-3, -20], [-3.5, -32], [-3, -42]]
  const Rp = [[6, -44], [11, -40], [14, -33], [19, -25], [25, -17], [31, -7], [35, 3], [38, 13], [39, 23], [36, 33], [29, 40], [19, 44], [9, 42], [3, 35], [0.5, 22], [0.5, 8], [1.5, -6], [3, -20], [3.5, -32], [3, -41]]
  const bumps = [[-22, -19, 4], [-32, -1, 4.5], [-34, 26, 5], [-22, 39, 4.5], [22, -18, 4], [34, 3, 4.5], [35, 28, 5], [22, 40, 4.5]]
  const circleD = (x, y, r) => { const [X, Y] = g.P([x, y]), R = r * g.k; return `M${f(X - R)},${f(Y)} A${f(R)},${f(R)} 0 1 0 ${f(X + R)},${f(Y)} A${f(R)},${f(R)} 0 1 0 ${f(X - R)},${f(Y)} Z` }
  const w = cellW(80 * g.k) * 0.85
  const lobes = [Lp, Rp].map((p, i) => glossBody(`lobe${i + 1}`, [g.smooth(p), ...bumps.filter(([x]) => (i ? x > 0 : x < 0)).map(([x, y, r]) => circleD(x, y, r))], THYMUS, w))
  const blob = (x, y, rx, ry, k) => { const q = []; for (let i = 0; i < 8; i++) { const t = (i / 8) * 2 * Math.PI + k, m = 1 + 0.12 * Math.sin(3 * t + k); q.push([x + rx * m * Math.cos(t), y + ry * m * Math.sin(t)]) } return g.smooth(q) }
  const med = [[-7.5, -30, 2.4, 5.5, 0.2], [-15, -11, 5, 6, 1.1], [-23, 9, 6, 6.5, 2], [-19, 29, 5.5, 5, 0.7], [7.5, -28, 2.4, 5.5, 0.9], [16, -9, 5, 6, 1.7], [25, 11, 6, 6.5, 0.4], [20, 31, 5.5, 5, 2.4]].map(([x, y, rx, ry, k]) => blob(x, y, rx, ry, k)).join(' ')
  const medulla = own('medulla', fillD(med, THYMUS.light), [])
  const sw = cellW(30) * 0.5
  const septa = own('septa', strokeD(mapD(g, 'M-20,-24C-15,-21 -10,-20 -4,-20M-32,-2C-25,-1 -18,0 -10,2M-38,19C-31,19 -25,20 -12,19M-1,-6C-3,-5 -5,-4 -7,-2M-1,24C-3,24 -6,24 -9,22M20,-23C15,-20 10,-19 4,-19M33,-1C26,0 19,1 11,3M39,21C32,21 26,22 13,21M1,-4C3,-3 5,-2 7,0M1,26C3,26 6,26 9,24'), THYMUS.outline, sw), [])
  return join(own('thymus', lobes.map((l) => l.body).join(''), [['thymus', THYMUS]], lobes.map((l) => l.defs).join('')), medulla, septa)
})

// Bone marrow: a long bone cut lengthwise: the compact bone of the shaft and the spongy bone of its ends in ivory (as
// Bone marrow adiposity), the marrow cavity filled with red marrow (the same rose) in which white blood cells form.
const IVORY = { light: toHex({ l: 0.985, c: 0.004, h: 85 }), base: toHex({ l: 0.95, c: 0.011, h: 85 }), shadow: toHex({ l: 0.89, c: 0.011, h: 85 }), small: toHex({ l: 0.76, c: 0.011, h: 85 }), outline: toHex({ l: 0.58, c: 0.011, h: 85 }) }
const MARROW = deep(10)
icon('Bone marrow', [4.44, 0, 0], (g) => {
  const half = [[30, -12], [37, -16], [42, -22], [48, -18], [49, -8], [45, 0], [49, 8], [48, 18], [42, 22], [37, 16], [30, 12]]
  const outer = half.concat([[0, 10.5]], half.map(([x, y]) => [-x, -y]), [[0, -10.5]])
  const ih = [[28, -6.5], [35, -10], [40, -15], [44, -11], [43, -4], [40, 0], [43, 4], [44, 11], [40, 15], [35, 10], [28, 6.5]]
  const inner = ih.concat([[0, 6]], ih.map(([x, y]) => [-x, -y]), [[0, -6]])
  const w = cellW(98 * g.k) * 0.8
  const defs = g.grad('bone-gradient', [-49, -22, 49, 22], IVORY) + g.grad('marrow-gradient', [-44, -15, 44, 15], MARROW)
  let s = `<g id="bone">${g.path(g.smooth(outer), 'url(#bone-gradient)', IVORY.outline, w)}</g>`
  s += `<g id="red-marrow">${g.path(g.smooth(inner), 'url(#marrow-gradient)', MARROW.outline, w * 0.55)}`
  s += fillD(dots(g, [[-24, 3], [-6, 3.5], [4, -2.5], [20, 3], [-15, -2.5], [10, 3.2], [26, -2], [-32, -4], [34, 4]], 0.9), MARROW.outline) + '</g>'
  const tb = 'M28,-4L33,-8L39,-11M33,-8L35,-2L30,3M35,-2L41,-5L43,-9M35,-2L39,4L35,9M39,4L43,5M30,3L35,9L39,13'
  s += `<g id="spongy-bone">${strokeD(mapD(g, tb + tb.replace(/(-?\d+),(-?\d+)/g, (m, x, y) => `${-x},${-y}`)), IVORY.base, w * 0.75)}</g>`
  const wbc = [[-12, 1.5], [14, -1.5], [-21, -2], [3, 2]].map(([x, y], i) => lymphocyte(g, { x, y, size: 5.2 / 0.94, kind: 'plain', pal: T_CELL, id: `white-blood-cell${i + 1}` }))
  const inside = join(...wbc)
  return { defs: defs + inside.defs, body: `<g id="long-bone" transform="rotate(-22 256 256)">${s}${inside.body}</g>`, parts: [['bone', IVORY], ['red marrow', MARROW], ...inside.parts] }
})

// Inflammation: an activated macrophage (the approved Macrophage) releasing cytokines into the tissue round it, and a
// flame for the heat and redness of inflammation. The cytokines are the second kind (yellow), clear of the flame.
icon('Inflammation', [4.46, -4.1, 2.3], (g) => {
  const mac = placeCellType(g, 'Macrophage', { x: -9, y: 9, size: 62, id: 'macrophage' })
  const sig = cytokines(g, { x: -9, y: 9, size: 96, layout: 'rings', inner: 76, rings: 1, dot: 7, pal: CYTOKINE2, pal2: null, id: 'cytokines' })
  return join(sig, mac, flame(g, { x: 27, y: -26, size: 46, id: 'flame' }))
})

// Allergy: a mast cell (the approved Mast cell) whose IgE (the amber of antibodies) is cross-linked by a pollen grain;
// it degranulates, releasing histamine granules (the rose of its granules). The pollen grain is spiky, with three pores,
// in a yellow-green (rich 115), 40° from the antibodies' amber.
const POLLEN = rich(115), HISTAMINE = deep(hueOf('#DC7095'))
icon('Allergy', [5.2, 0, -2], (g) => {
  const C = [-12, 10], D = 62
  const ige = antibodyCoat(g, { x: C[0], y: C[1], size: D * 0.94, angles: [35, 55], length: 32, facing: 'out', id: 'ige' })
  const mast = placeCellType(g, 'Mast cell', { x: C[0], y: C[1], size: D, id: 'mast-cell' })
  const out = cytokines(g, { x: 21, y: 30, size: 26, count: 6, pal: HISTAMINE, pal2: null, seed: 2, id: 'histamine' })
  const Pp = [29, -31], w = cellW(28 * g.k) * 0.7
  let sp = ''
  for (let i = 0; i < 16; i++) { const t = (i / 16) * 2 * Math.PI, q = 0.2; sp += polyline(g, [[Pp[0] + 10.5 * Math.cos(t - q), Pp[1] + 10.5 * Math.sin(t - q)], [Pp[0] + 14.5 * Math.cos(t), Pp[1] + 14.5 * Math.sin(t)], [Pp[0] + 10.5 * Math.cos(t + q), Pp[1] + 10.5 * Math.sin(t + q)]], true) + ' ' }
  const [X, Y] = g.P(Pp), R = 11 * g.k
  const grain = glossBody('pollen', [`M${f(X - R)},${f(Y)} A${f(R)},${f(R)} 0 1 0 ${f(X + R)},${f(Y)} A${f(R)},${f(R)} 0 1 0 ${f(X - R)},${f(Y)} Z`], POLLEN, w)
  const pollen = own('pollen-grain', fillD(sp, POLLEN.small, POLLEN.outline, w * 0.7) + grain.body + fillD(dots(g, [[Pp[0] - 4, Pp[1] - 3.5], [Pp[0] + 4.5, Pp[1] + 1.5], [Pp[0] - 2, Pp[1] + 5]], 1.7), POLLEN.outline), [['pollen', POLLEN]], grain.defs)
  return join(ige, mast, out, pollen)
})

// Autoimmunity: a cell of the body (the generic cell's blue: the peach of epithelia lies 22° from the antibodies), damaged (a crack), coated by autoantibodies bound by
// their arms to its own antigens (antibodies in the set's amber).
icon('Autoimmunity', [5.85, -1.6, 3.4], (g) => {
  const self = targetCell(g, { x: 0, y: 0, size: 60, state: 'damaged', pal: CELL, id: 'self-cell' })
  const auto = antibodyCoat(g, { x: 0, y: 0, size: 51, angles: [325, 45, 115, 190, 260], length: 30, facing: 'in', id: 'autoantibodies' })
  return join(self, auto)
})

// Transplant: a donor kidney, cut from its renal artery, vein and ureter, moves (arrow) into the recipient, who now has it.
// The recipient is assays.mjs's bust in a green (soft 160): the accent blue lies 5° from the vein. The artery is deep 15
// instead of immune.mjs's 25, which would lie 27° from the skin.
const ARTERY_T = deep(15), GOWN = soft(160)
icon('Transplant', [4.95, 0, 2.4], (g) => {
  const x = -24, y = -13, size = 60, k = size / 48, K = (pts) => pts.map(([u, v]) => [x + (u + 31) * k, y + (v - 1) * k])
  const donor = kidney(g, { x, y, size, id: 'donor-kidney' })
  const stumps = [
    tube(g, K([[-21, 4], [-18, 8], [-16.5, 14], [-15.5, 21]]), 4.5, URETER, 'ureter'),
    tube(g, K([[-21, -1], [-17, -1], [-13.5, 0], [-9, 1]]), 5.5, VEIN, 'renal-vein'),
    tube(g, K([[-20, -5.5], [-16.5, -7], [-13, -7], [-9, -6]]), 4.5, ARTERY_T, 'renal-artery'),
  ]
  const go = arrow(g, { points: [[3, -2], [13, 9]], colour: INK, w: 8, id: 'transplantation' })
  const who = person(g, { x: 26, y: 22, size: 52, pal: GOWN, id: 'recipient' })
  const graft = kidney(g, { x: 26, y: 37.5, size: 15, id: 'grafted-kidney' })
  return join(...stumps, donor, go, who, graft)
})

check()
console.log('written')
