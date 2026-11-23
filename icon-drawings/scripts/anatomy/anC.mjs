// Eight icons of SiliCoDraw's "Anatomy" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts of the
// category (../parts/anatomy.mjs): the heart from the front with its coronary arteries (Heart; Coronary artery with a
// plaque narrowing the left anterior descending artery), the heart cut open into its four chambers (Heart (section);
// Heart failure, dilated and globular with outward arrows; Cardiac fibrosis with collagen patches; Atrial fibrillation
// with chaotic wavelets in the atria over an irregular ECG; Left ventricular hypertrophy with arrows across the thick
// wall and septum), and the aortic valve seen from above (Heart valve).
// Parts used: organ ('heart', 'heart section'), HEART, ARTERY, organW (anatomy.mjs); arrow (tissue.mjs); INK (lab.mjs);
// gloss, glossTones, pathPoints (surfaces.mjs).
// Drawn here because no part draws it: the aortic valve from above (the aortic root round three cusps, their free edges
// and nodules, the two coronary openings), in the heart's palette, the root glossed as a closed body (glossBody, copied
// from anatomy.mjs); and the ECG trace under the fibrillating heart (a line, as a picture of data: no gloss).
// The current look: outlines at 60 % (setStrokeScale), the gloss on (setGloss).
// Lettered: nothing (SiliCoDraw writes no labels on these).
// Usage: node anC.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, glossOn, page, setGloss, smoothD } from '../cellkit.mjs'
import { hueGap, toLch } from '../colour.mjs'
import { f, setStrokeScale, strokeScale } from '../shapes.mjs'
import { HEART, organ, organW } from '../parts/anatomy.mjs'
import { arrow } from '../parts/tissue.mjs'
import { INK } from '../parts/lab.mjs'
import { gloss, glossTones, pathPoints } from '../parts/surfaces.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT)
// Greys (chroma below 0.012: the ink of arrows and traces) are left out of the hue check; the same palette used by
// several parts is listed once.
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

const K = 4.6 // 100 units of SiliCoDraw's box are 460 px of the page: margins about 26

// Heart: from the front, with the great vessels and the coronary arteries on its surface.
icon('Heart', [K, 0, 0], (g) => organ(g, { kind: 'heart', x: 0, y: 0, size: 106 }))
// Heart (section): cut open into its four chambers, with the aorta and the pulmonary trunk (the part's choice for
// this icon, so that it differs from Heart; SiliCoDraw's later drawing shows the outside without coronary arteries).
icon('Heart (section)', [K, 0, 0], (g) => organ(g, { kind: 'heart section', x: 0, y: 0, size: 100 }))
// Heart valve: the aortic valve from above, closed.
icon('Heart valve', [K, 0, 0], (g) => aorticValve(g, { s: 1.08, y: -1 }))
// Coronary artery: the heart from the front with a plaque narrowing the left anterior descending artery.
icon('Coronary artery', [K, 0, 0], (g) => organ(g, { kind: 'heart', x: 0, y: 0, size: 106, plaque: true }))

// Heart failure: a dilated, globular heart with thin walls, arrows pointing out at both sides.
icon('Heart failure', [K, 0, 0], (g) => join(
  organ(g, { kind: 'heart section', x: 0, y: -1, size: 94, state: 'dilated' }),
  arrow(g, { points: [[-37, 29], [-51, 29]], colour: INK, w: 10, id: 'dilation-left' }),
  arrow(g, { points: [[39, 31], [52, 31]], colour: INK, w: 10, id: 'dilation-right' }),
))
// Cardiac fibrosis: the heart cut open, collagen patches in the wall of the left ventricle and the septum.
icon('Cardiac fibrosis', [K, 0, 0], (g) => organ(g, { kind: 'heart section', x: 0, y: 0, size: 100, state: 'fibrosis' }))

// Atrial fibrillation: the heart cut open with chaotic wavelets in both atria, over an irregular ECG with no P waves
// (a fibrillating baseline and irregular R–R intervals).
icon('Atrial fibrillation', [K, 0, 0], (g) => {
  const ecg = []
  let u = -44
  const flat = (n) => { for (let i = 0; i < n; i++) { ecg.push([u, 40], [u + 1.25, 38.4], [u + 2.5, 40], [u + 3.75, 41.4]); u += 5 } }
  const beat = () => { ecg.push([u, 40], [u + 2, 22], [u + 4.5, 46], [u + 7, 40]); u += 7 }
  flat(3); beat(); flat(2); beat(); flat(4); beat(); beat(); flat(3)
  const trace = own('ECG', strokeD(lineD(g, ecg), INK, 5 / strokeScale()), [['ECG', { base: INK }]])
  return join(organ(g, { kind: 'heart section', x: 0, y: -9, size: 80, state: 'fibrillation' }), trace)
})

// Left ventricular hypertrophy: the heart cut open, the left ventricle's wall and the septum thick round a small
// cavity; double arrows across both.
icon('Left ventricular hypertrophy', [K, 0, 0], (g) => join(
  organ(g, { kind: 'heart section', x: 0, y: 0, size: 100, state: 'hypertrophy' }),
  arrow(g, { points: [[22.5, 6], [41, 6]], start: 'head', colour: INK, w: 7, head: 16, id: 'wall-thickness' }),
  arrow(g, { points: [[-10.5, 14], [13, 14]], start: 'head', colour: INK, w: 7, head: 16, id: 'septum-thickness' }),
))

kit.check()
console.log('written', OUT)
