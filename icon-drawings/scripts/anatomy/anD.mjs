// Eight icons of SiliCoDraw's "Anatomy" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts of the
// category (../parts/anatomy.mjs): Aortic valve calcification (the aortic valve from above, its cusps thick and studded
// with calcium round a narrow opening), Blood vessel (a vessel from outside, its near end cut), Artery (cut across:
// adventitia, media, elastic lamina, lumen with red cells), Atherosclerosis (an artery opened along its length, a plaque
// under its fibrous cap bulging into the lumen), Capillary bed (an arteriole branching into capillaries that gather into a
// venule), Lymphatic vessel (valved, with lymphocytes), Thrombus (a clot of fibrin and red cells on the wall of an opened
// vessel) and Haemorrhage (blood welling out of a torn vessel).
// Parts used: bloodVessel, lesion ('calcification', 'crack'), HEART, ARTERY, VEIN, organW (anatomy.mjs); vessel
// (tissue.mjs's lengthwise vessel); gloss, glossTones, pathPoints (surfaces.mjs).
// Drawn here because no part draws them: the aortic valve from above (as in anC.mjs, here with state 'calcified'), the
// branching capillary network (the vessel part draws one course and cannot join branches: the network is drawn as one
// union of tubes in the vessel palettes, outlines first, then walls, then lumens), and the pool and drops of blood.
// The current look: outlines at 60 % (setStrokeScale), the gloss on (setGloss).
// Lettered: nothing (SiliCoDraw writes no labels on these).
// Usage: node anD.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, glossOn, page, setGloss, smoothD } from '../cellkit.mjs'
import { deep, hueGap, toLch } from '../colour.mjs'
import { f, setStrokeScale, strokeScale } from '../shapes.mjs'
import { ARTERY, HEART, VEIN, bloodVessel, lesion, organW } from '../parts/anatomy.mjs'
import { vessel } from '../parts/tissue.mjs'
import { INK } from '../parts/lab.mjs'
import { gloss, glossTones, pathPoints } from '../parts/surfaces.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT)
// Greys (chroma below 0.012: calcium, ink) are left out of the hue check; the same palette used by several parts is
// listed once.
const icon = (name, [k, cx, cy], draw) => {
  const g = page(k, [cx, cy]), { defs, body, parts } = draw(g)
  const seen = parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base || hueGap(toLch(q.base).h, toLch(p.base).h) < 3) === i)
  kit.cellType(name, seen, defs, body)
}
const join = (...ps) => ({ defs: ps.map((p) => p.defs ?? '').join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts ?? []) })
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })

// ---------- drawing helpers (as anatomy.mjs's) ----------
const sw = (s, w) => (s ? ` stroke="${s}" stroke-width="${f(w)}" stroke-linejoin="round"` : '')
const fillD = (d, fill, s = '', w = 0) => `<path d="${d}" fill="${fill}"${sw(s, w)}/>`
const strokeD = (d, colour, w, cap = 'round') => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
const lin = (id, [x0, y0, x1, y1], a, b) => `<linearGradient id="${id}" x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`
const boxOf = (d) => { const p = pathPoints(d).flat(), xs = p.map((q) => q[0]), ys = p.map((q) => q[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] }
/** A closed body in the gloss of cells (anatomy.mjs's glossBody): gradient to the gloss's end tone, its face-on tones, `inner`, one outline. */
function glossBody(id, d, pal, w, inner = '') {
  const box = boxOf(d), size = Math.max(box[2] - box[0], box[3] - box[1]), T = glossTones(pal)
  let s = fillD(d, `url(#${id}-gradient)`)
  if (glossOn() && size >= 40) {
    const G = gloss({ fills: [pathPoints(d)] }, { inset: (w * strokeScale()) / 2 })
    s += ['shade', 'shadow', ...(size >= 90 ? ['lit', 'highlight'] : [])].map((k) => (G[k] ? `<path d="${G[k]}" fill="${T[k]}"/>` : '')).join('')
  }
  return { defs: lin(`${id}-gradient`, box, pal.base, glossOn() ? T.end : pal.shadow), body: s + inner + fillD(d, 'none', pal.outline, w) }
}
const circleD = (g, x, y, r) => { const [cx, cy] = g.P([x, y]), R = r * g.k; return `M${f(cx - R)},${f(cy)} A${f(R)},${f(R)} 0 1 0 ${f(cx + R)},${f(cy)} A${f(R)},${f(R)} 0 1 0 ${f(cx - R)},${f(cy)} Z` }
const lineD = (g, pts) => `M${pts.map((p) => g.P(p).map(f).join(',')).join(' L')}`
const rad = (t) => (t * Math.PI) / 180
const polar = (r, t) => [r * Math.cos(rad(t)), r * Math.sin(rad(t))]

/**
 * The aortic valve seen from above, in SiliCoDraw's 100 box about x, y scaled by s: the aortic root (a scalloped ring,
 * glossed) round three cusps that meet in a Y, each with its free edge and nodule; the two coronary openings in the
 * root over the right and left cusps. state 'healthy' | 'calcified' (thick cusps in a deeper tone that leave a narrow
 * three-cornered opening; the calcium nodules are laid on by the caller with `lesion`).
 */
function aorticValve(g, { x = 0, y = 0, s = 1, id = 'aortic-valve', pal = HEART, state = 'healthy' }) {
  const T = ([u, v]) => [x + u * s, y + v * s], w = organW(92 * s * g.k), lw = w * 0.55, calc = state === 'calcified'
  const ro = (t) => 44 + 1.8 * Math.cos(rad(3 * (t + 90))), ri = (t) => 35 + 1.1 * Math.cos(rad(3 * (t + 90)))
  const outer = []; for (let t = 0; t < 360; t += 12) outer.push(g.P(T(polar(ro(t), t))))
  let inner = fillD(smoothD(Array.from({ length: 30 }, (_, i) => g.P(T(polar(ri(i * 12) + 1.5, i * 12))))), pal.shadow, pal.small, lw * 0.8)
  for (const c of [-90, 30, 150]) {
    const gap = calc ? 0.6 : 1.3, o = polar(gap, c), pts = [T(o)]
    for (let t = c - 60; t <= c + 60; t += 10) { const [u, v] = polar(ri(t) - 0.5, t); pts.push(T([u + o[0], v + o[1]])) }
    if (calc) { pts[0] = T([o[0] + polar(7, c)[0], o[1] + polar(7, c)[1]]) } // thick cusps hold the middle apart
    inner += fillD(lineD(g, pts) + 'Z', calc ? pal.base : pal.light, pal.outline, lw)
    const p1 = polar(ri(c - 52) - 4, c - 46), p2 = polar(ri(c + 52) - 4, c + 46), m = polar(calc ? 18 : 13, c)
    inner += strokeD(`M${g.P(T(p1)).map(f).join(',')} Q${g.P(T(m)).map(f).join(',')} ${g.P(T(p2)).map(f).join(',')}`, pal.small, lw * 0.7)
    if (!calc) inner += fillD(circleD(g, ...T(polar(5.5, c)), 2.1 * s), pal.small)
  }
  if (calc) { // the narrow opening: three-cornered, dark
    const tri = [-90, 30, 150].map((c) => T(polar(7.5, c + 60)))
    inner += fillD(smoothD([0, 1, 2].flatMap((i) => [g.P(tri[i]), g.P(T(polar(3.2, [-90, 30, 150][(i + 1) % 3])))])), INK, pal.outline, lw * 0.6)
  }
  inner += [30, 150].map((t) => fillD(circleD(g, ...T(polar(40, t)), 3.4 * s), pal.outline, pal.outline, lw * 0.5)).join('')
  const b = glossBody(`${id}-root`, smoothD(outer), pal, w, inner)
  return { defs: b.defs, body: `<g id="${id}">${b.body}</g>`, parts: [['valve', pal]] }
}

/** An open smooth curve through points of g (Catmull–Rom). */
const curveD = (g, pts) => {
  const p = pts.map(g.P), n = p.length
  let d = `M${f(p[0][0])},${f(p[0][1])}`
  for (let i = 0; i < n - 1; i++) {
    const a = p[Math.max(0, i - 1)], b = p[i], c = p[i + 1], e = p[Math.min(n - 1, i + 2)]
    d += `C${f(b[0] + (c[0] - a[0]) / 6)},${f(b[1] + (c[1] - a[1]) / 6)} ${f(c[0] - (e[0] - b[0]) / 6)},${f(c[1] - (e[1] - b[1]) / 6)} ${f(c[0])},${f(c[1])}`
  }
  return d
}
/** A cubic Bézier of SiliCoDraw's form (x0,y0, c1, c2, end) as points, for curveD. */
const bez = ([a, b, c, d], n = 8) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [0, 1].map((k) => u * u * u * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * d[k]) })

const K = 4.6 // 100 units of SiliCoDraw's box are 460 px of the page: margins about 26

// Aortic valve calcification: the valve from above, its three cusps thickened (a deeper tone) round a narrow
// three-cornered opening, calcium nodules on each cusp.
icon('Aortic valve calcification', [K, 0, 0], (g) => join(
  aorticValve(g, { s: 1.08, y: -1, state: 'calcified' }),
  ...[-90, 30, 150].map((c, i) => lesion(g, { x: 23 * Math.cos(rad(c)), y: 23 * Math.sin(rad(c)) - 1, size: 24, kind: 'calcification', seed: i + 2, turn: c + 90, id: `calcium${i + 1}` })),
))

// Blood vessel: a length of artery from outside, its near end cut to show the wall and the lumen.
icon('Blood vessel', [K, 0, 0], (g) => bloodVessel(g, { x: -2.5, y: 0, size: 112, view: 'tube', turn: -15 }))
// Artery: cut across, with red cells in the lumen.
icon('Artery', [K, 0, 0], (g) => bloodVessel(g, { x: 0, y: 0, size: 106, view: 'section', cells: 3 }))
// Atherosclerosis: an artery opened along its length, a fatty plaque under its fibrous cap narrowing the lumen.
icon('Atherosclerosis', [K, 0, 0], (g) => bloodVessel(g, { x: 0, y: 0, size: 100, view: 'open', state: 'plaque', cells: 8 }))

// Capillary bed: an arteriole (red) at the upper left branches into capillaries (purple, where blood gives up its
// oxygen) that gather into a venule (blue) at the upper right. SiliCoDraw shades the network from red to blue; here three
// palettes, 36° or more apart, so that each recolours on its own. Its three pale tissue cells are left out (their colour
// would lie within 36° of the artery or the vein, and they crowd the network at 40 px).
icon('Capillary bed', [K, 0, 0], (g) => {
  const MID = deep(320)
  const S = [[[[-52, -30], [-44, -30], [-37, -28], [-30, -22]], 10, ARTERY], [[[30, -22], [37, -28], [44, -30], [52, -30]], 11, VEIN],
    [[[-30, -22], [-23, -27], [-12, -29], [0, -29]], 7, ARTERY], [[[0, -29], [12, -29], [23, -27], [30, -22]], 7.5, VEIN],
    [[[-30, -22], [-38, -8], [-34, 8], [-24, 16]], 5.5, ARTERY], [[[-24, 16], [-14, 26], [6, 28], [18, 20]], 5.5, MID], [[[18, 20], [30, 10], [34, -8], [30, -22]], 5.5, VEIN],
    [[[-15, -28], [-20, -14], [-14, -4], [-4, 0]], 5.5, ARTERY], [[[-4, 0], [4, 4], [10, 2], [16, -4]], 5.5, MID], [[[16, -4], [18, -14], [16, -22], [13, -28]], 5.5, VEIN],
    [[[-4, 0], [-2, 8], [-6, 16], [-9, 23]], 5.5, MID], [[[16, -4], [21, 4], [22, 12], [18, 20]], 5.5, MID]]
  // The network is set a little smaller than SiliCoDraw's and lower, so that the arteriole and venule end inside the margins.
  const T = ([x, y]) => [x * 0.88, y * 0.92 + 5]
  const w = 4.2, segs = S.map(([q, wd, P]) => ({ d: curveD(g, bez(q.map(T))), W: (wd * 0.95 * g.k) / strokeScale(), P }))
  let s = segs.map(({ d, W, P }) => strokeD(d, P.outline, W + 2 * w)).join('')
  s += segs.map(({ d, W, P }) => strokeD(d, P.base, W)).join('')
  s += segs.map(({ d, W, P }) => strokeD(d, P.light, W * 0.32)).join('')
  return own('capillary-bed', s, [['arteriole', ARTERY], ['capillaries', MID], ['venule', VEIN]])
})

// Lymphatic vessel: bulging between its valves, lymphocytes carried along inside.
icon('Lymphatic vessel', [K, 0, 0], (g) => bloodVessel(g, { x: 0, y: 0, size: 100, kind: 'lymphatic' }))
// Thrombus: an opened vessel with a clot of fibrin and red cells stuck to its wall, red cells flowing past.
icon('Thrombus', [K, 0, 0], (g) => bloodVessel(g, { x: 0, y: 0, size: 100, view: 'open', state: 'thrombus', cells: 6 }))

// Haemorrhage: an artery running along the bottom, torn in its upper wall; blood wells out of the tear into a pool
// (its pale rim spreading in the tissue) and a few drops fly off. The blood is in the artery's own tones, so the vessel
// and its blood recolour together.
icon('Haemorrhage', [K, 0, 0], (g) => {
  const P = ARTERY, w = organW(80 * K) * 0.8, lw = w * 0.6
  const v = vessel(g, { points: [[-49, 31.5], [-20, 28], [20, 24], [49, 27.5]], size: 20 / 0.4 / strokeScale(), thick: 0.4, ends: 'open', pal: P, id: 'artery' })
  const halo = smoothD([[-6, 14], [-20, 10], [-36, 6], [-44, -4], [-40, -16], [-26, -24], [-8, -30], [10, -30], [28, -24], [41, -14], [44, -2], [36, 6], [20, 10], [6, 14]].map(g.P))
  const pool = smoothD([[-5, 24], [-8, 12], [-18, 8], [-29, 3], [-33, -6], [-27, -15], [-14, -19], [-4, -24], [8, -24], [18, -19], [29, -15], [33, -5], [28, 3], [17, 8], [7, 12], [5, 24]].map(g.P))
  const drop = (x, y, r) => { const p = (u, v) => g.P([x + u * r, y + v * r]).map(f).join(','); return `M${p(0, -2)} C${p(0.5, -1.2)} ${p(1, -0.6)} ${p(1, 0)} C${p(1, 0.55)} ${p(0.55, 1)} ${p(0, 1)} C${p(-0.55, 1)} ${p(-1, 0.55)} ${p(-1, 0)} C${p(-1, -0.6)} ${p(-0.5, -1.2)} ${p(0, -2)} Z` }
  let s = fillD(halo, P.light, P.shadow, lw * 0.6) + fillD(pool, P.small, P.outline, w)
  s += fillD([[-38, -26, 3.8], [34, -36, 3.4], [-8, -41, 3], [44, -20, 2.6]].map(([x, y, r]) => drop(x, y, r)).join(' '), P.small, P.outline, lw)
  const tear = lesion(g, { x: 0, y: 19.5, size: 14, kind: 'crack', colour: P.outline, turn: 0, id: 'tear' })
  return join(v, own('blood', s, [['blood', P]]), tear)
})

kit.check()
console.log('written', OUT)
