// Eight icons of SiliCoDraw's "Anatomy" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts of the category
// (../parts/anatomy.mjs): vessels, blood and the airways. Aneurysm, Arterial stiffness, Blood drop, Coagulation cascade,
// Lungs, Trachea, Oesophagus and Diaphragm.
// Compositions are read by hand from the source (the last definition of each icon) in its 100 × 100 box centred on 0,0
// and scaled onto a 512 page (`page` of ../cellkit.mjs); outlines at 60 % (setStrokeScale), gloss on.
// Parts used: bloodVessel (tube, 'aneurysm' and 'stiff'), organ ('lungs'), the palettes and organW of anatomy.mjs; arrow,
// RED (tissue.mjs); redBloodCell3d, gloss (surfaces.mjs); lettering (the factors of the cascade).
// Drawn here because no part draws them, in the look of anatomy.mjs (closed bodies glossed as `organ` does, tubes flat):
// a drop of blood, the factors of the cascade as balls with a fibrin mesh, the trachea with its bronchi, the oesophagus
// in section with a bolus, and the diaphragm under the lungs.
// Usage: node anE.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, glossOn, page, setGloss, smoothD } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toLch } from '../colour.mjs'
import { f, setStrokeScale, strokeScale } from '../shapes.mjs'
import { CARTILAGE, GUT, TENDON, bloodVessel, organ, organPal, organW } from '../parts/anatomy.mjs'
import { gloss, glossTones, pathPoints, redBloodCell3d } from '../parts/surfaces.mjs'
import { RED, arrow } from '../parts/tissue.mjs'
import { INK } from '../parts/lab.mjs'
import { lettering } from '../parts/letters.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012: tendon, ink) are left out of the hue check; one palette used by several parts is listed once.
const icon = (name, [k, cx, cy], draw) => {
  const g = page(k, [cx, cy]), { defs, body, parts } = draw(g)
  const seen = parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base) === i)
  kit.cellType(name, seen, defs, body)
}
const join = (...ps) => ({ defs: ps.map((p) => p.defs ?? '').join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts ?? []) })
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })

// ---------- drawing helpers in g's units (as anatomy.mjs's, which it does not export) ----------
const P2 = (p) => p.map(f).join(',')
const strokeD = (d, colour, w, cap = 'round', extra = '') => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"${extra}/>`
const fillD = (d, fill, s = '', w = 0) => `<path d="${d}" fill="${fill}"${s ? ` stroke="${s}" stroke-width="${f(w)}" stroke-linejoin="round"` : ''}/>`
const lin = (id, [x0, y0, x1, y1], a, b) => `<linearGradient id="${id}" x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`
const boxOf = (d) => { const p = pathPoints(d).flat(), xs = p.map((q) => q[0]), ys = p.map((q) => q[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] }
/** An open smooth curve through points of g (Catmull–Rom as cubic Béziers), as a page path. */
const curveD = (g, pts) => {
  const p = pts.map(g.P), n = p.length
  let d = `M${P2(p[0])}`
  for (let i = 0; i < n - 1; i++) {
    const a = p[Math.max(0, i - 1)], b = p[i], c = p[i + 1], e = p[Math.min(n - 1, i + 2)]
    d += `C${f(b[0] + (c[0] - a[0]) / 6)},${f(b[1] + (c[1] - a[1]) / 6)} ${f(c[0] - (e[0] - b[0]) / 6)},${f(c[1] - (e[1] - b[1]) / 6)} ${P2(c)}`
  }
  return d
}
const ellD = (g, u, v, rx, ry, rot = 0) => {
  const c = Math.cos((rot * Math.PI) / 180), s = Math.sin((rot * Math.PI) / 180), K = 0.5523
  const q = [[rx, 0], [rx, K * ry], [K * rx, ry], [0, ry], [-K * rx, ry], [-rx, K * ry], [-rx, 0], [-rx, -K * ry], [-K * rx, -ry], [0, -ry], [K * rx, -ry], [rx, -K * ry], [rx, 0]].map(([a, b]) => P2(g.P([u + a * c - b * s, v + a * s + b * c])))
  return `M${q[0]} C${q[1]} ${q[2]} ${q[3]} C${q[4]} ${q[5]} ${q[6]} C${q[7]} ${q[8]} ${q[9]} C${q[10]} ${q[11]} ${q[12]} Z`
}
/**
 * A closed body in the gloss of organs (anatomy.mjs's glossBody): the page outlines `ds` filled with a gradient from the
 * base to the gloss's end tone, the face-on tones over it (shade from 40 px, lit rim from 90 px), `inner`, then one outline.
 */
function glossBody(id, ds, pal, w, { inner = '', px, outline = true } = {}) {
  const box = boxOf(ds.join(' ')), size = px ?? Math.max(box[2] - box[0], box[3] - box[1]), T = glossTones(pal)
  const defs = lin(`${id}-gradient`, box, pal.base, glossOn() ? T.end : pal.shadow)
  let s = ds.length > 1 ? ds.map((d) => fillD(d, pal.outline, pal.outline, 2 * w)).join('') : ''
  s += ds.map((d) => fillD(d, `url(#${id}-gradient)`)).join('')
  if (glossOn() && size >= 40) {
    const G = gloss({ fills: ds.map(pathPoints) }, { inset: (w * strokeScale()) / 2 })
    s += ['shade', 'shadow', ...(size >= 90 ? ['lit', 'highlight'] : [])].map((k) => (G[k] ? `<path d="${G[k]}" fill="${T[k]}"/>` : '')).join('')
  }
  s += inner
  if (outline && ds.length === 1) s += fillD(ds[0], 'none', pal.outline, w)
  return { defs, body: s }
}
/** A flat tube along page paths: an outline round a fill, `width` its visible width in units of g. Strokes are thinned
 *  by setStrokeScale, so the width is given back here (as anatomy.mjs's `tube`). */
const tubeW = (g, width) => (width * g.k) / strokeScale()

// ---------- palettes of this batch ----------
const FACTOR = soft(hueOf('#6f86c8')) // clotting factors: SiliCoDraw's blue (269°)
const THROMBIN = deep(345) // thrombin (IIa): crimson, 37° from the red blood cell
const FIBRIN = rich(95) // fibrin strands: pale straw yellow
const BOLUS = rich(65) // a swallowed bolus of food: tan
const DIAPHRAGM = organPal(30, 1.35) // skeletal muscle, turned from 14° to 30° to stay 38° from the lungs (352°)

// ---------- Aneurysm: the artery from outside with its wall ballooning out (the part as it is) ----------
icon('Aneurysm', [5.29, 2.5, -12.5], (g) => bloodVessel(g, { x: 0, y: 0, size: 100, view: 'tube', state: 'aneurysm', id: 'artery' }))

// ---------- Arterial stiffness: the stiff, calcified artery under a steep, peaked pulse wave ----------
icon('Arterial stiffness', [4.85, 1, -13.5], (g) => {
  const v = bloodVessel(g, { x: 0, y: 0, size: 100, view: 'tube', state: 'stiff', id: 'artery' })
  const wave = [[-46, -30], [-40, -30], [-34, -46], [-28, -34], [-24, -37], [-18, -30], [-6, -30], [0, -46], [6, -34], [10, -37], [16, -30], [28, -30], [34, -46], [40, -34], [44, -37], [48, -31]]
  return join(v, own('pulse-wave', strokeD(`M${wave.map((p) => P2(g.P(p))).join(' L')}`, INK, 12), [['pulse wave', { base: INK }]]))
})

// ---------- Blood drop: a drop of blood, glossed as a closed body ----------
icon('Blood drop', [5.05, 0, -0.5], (g) => {
  const d = g.D('M0,-46C6,-34 33,-12 33,12C33,30.2 18.2,45 0,45C-18.2,45 -33,30.2 -33,12C-33,-12 -6,-34 0,-46Z')
  const b = glossBody('drop', [d], RED, organW(460))
  return { defs: b.defs, body: `<g id="drop">${b.body}</g>`, parts: [['blood', RED]] }
})

// ---------- Coagulation cascade: XII → XI → IX → X, TF–VIIa onto X, X → thrombin (IIa) → a fibrin mesh with a red cell ----------
icon('Coagulation cascade', [5.0, -1.5, 2], (g) => {
  const ps = [], w = organW(90)
  const N = [['XII', -36, -38], ['XI', -20, -21], ['IX', -4, -4], ['X', 12, 13]], r = 7.8
  const link = (x1, y1, x2, y2, r1, r2, id) => {
    const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l
    return arrow(g, { points: [[x1 + ux * (r1 + 1), y1 + uy * (r1 + 1)], [x2 - ux * (r2 + 1.2), y2 - uy * (r2 + 1.2)]], corners: true, colour: INK, w: 9, id })
  }
  // The fibrin mesh first, under everything: strands as flat tubes, the red cell caught in them.
  const strands = [[[-47, 25], [-34, 21], [-20, 31], [-4, 27]], [[-46, 39], [-32, 33], [-18, 34], [-6, 42]], [[-38, 18], [-37, 28], [-34, 36], [-31, 46]], [[-20, 19], [-23, 29], [-21, 38], [-16, 46]], [[-46, 32], [-34, 28], [-24, 40], [-8, 35]]]
  const sd = strands.map((p) => curveD(g, p)), W = tubeW(g, 1.7), sw = 2.6
  ps.push(own('fibrin', sd.map((d) => strokeD(d, FIBRIN.outline, W + 2 * sw)).join('') + sd.map((d) => strokeD(d, FIBRIN.base, W)).join(''), [['fibrin', FIBRIN]]))
  ps.push(redBloodCell3d(g, { x: -23, y: 33, size: 14, turn: -15, id: 'red-blood-cell' }))
  // Arrows of the cascade.
  for (let i = 0; i < 3; i++) ps.push(link(N[i][1], N[i][2], N[i + 1][1], N[i + 1][2], r, r, `arrow${i + 1}`))
  ps.push(link(12, 13, 28, 30, r, 9.5, 'arrow4'), link(24, -29, 12, 13, 0, r, 'arrow5'), link(28, 30, 2, 36, 9.5, 0, 'arrow6'))
  // The factors as balls with their numbers; TF–VIIa a rounded box; thrombin the deeper ball.
  N.forEach(([l, x, y], i) => {
    const b = glossBody(`factor${i + 1}`, [ellD(g, x, y, r, r)], FACTOR, w)
    const h = l.length > 2 ? 5.2 : 6, t = lettering(g, { x, y, h, text: l, colour: FACTOR.outline, w: 0.24 * h * g.k, id: `factor${i + 1}-name` })
    ps.push({ defs: b.defs, body: `<g id="factor-${l}">${b.body}${t.body}</g>`, parts: [['factors', FACTOR]] })
  })
  const box = (() => { const [a, b] = g.P([10, -44]), W2 = 34 * g.k, H = 15 * g.k, R = H / 2; return `M${f(a + R)},${f(b)} H${f(a + W2 - R)} A${f(R)},${f(R)} 0 0 1 ${f(a + W2 - R)},${f(b + H)} H${f(a + R)} A${f(R)},${f(R)} 0 0 1 ${f(a + R)},${f(b)} Z` })()
  const tb = glossBody('tissue-factor', [box], FACTOR, w)
  ps.push({ defs: tb.defs, body: `<g id="TF-VIIa">${tb.body}${lettering(g, { x: 27, y: -36.5, h: 5.6, text: 'TF-VIIa', colour: FACTOR.outline, w: 0.24 * 5.6 * g.k, id: 'TF-VIIa-name' }).body}</g>`, parts: [['factors', FACTOR]] })
  const th = glossBody('thrombin', [ellD(g, 28, 30, 9.5, 9.5)], THROMBIN, w)
  ps.push({ defs: th.defs, body: `<g id="thrombin">${th.body}${lettering(g, { x: 28, y: 30, h: 6.4, text: 'IIa', colour: THROMBIN.light, w: 0.24 * 6.4 * g.k, id: 'thrombin-name' }).body}</g>`, parts: [['thrombin', THROMBIN]] })
  return join(...ps)
})

// ---------- Lungs: the part ----------
icon('Lungs', [4.8, 0, -3], (g) => organ(g, { kind: 'lungs', x: 0, y: 0, size: 100, id: 'lungs' }))

// ---------- Trachea: the windpipe with its cartilage rings, the carina, the main and lobar bronchi ----------
icon('Trachea', [5.0, 1.5, -1], (g) => {
  const AIR = CARTILAGE, w = organW(460) * 0.8
  // Branches as cubic pieces [x0,y0, x1,y1, x2,y2, x3,y3, width]: right lobar bronchi (upper, middle, lower), left lobar
  // bronchi (upper, lower), then the two main bronchi.
  const T = [[-11, 9, -20, 6, -28, 2, -37, -1, 7.5], [-17, 15, -21, 24, -23, 32, -24, 41, 9], [-20, 26, -27, 30, -32, 34, -37, 39, 6.5], [22, 15, 29, 10, 35, 5, 40, 0, 7], [24, 16, 28, 25, 30, 33, 32, 41, 8], [0, -4, -5, 3, -11, 9, -17, 15, 12], [0, -4, 7, 3, 15, 10, 24, 16, 10.5]]
  const D = (Q) => `M${P2(g.P([Q[0], Q[1]]))} C${P2(g.P([Q[2], Q[3]]))} ${P2(g.P([Q[4], Q[5]]))} ${P2(g.P([Q[6], Q[7]]))}`
  const trunk = `M${P2(g.P([0, -44]))} L${P2(g.P([0, -4]))}`
  let s = strokeD(trunk, AIR.outline, tubeW(g, 16) + 2 * w, 'butt') + T.map((Q) => strokeD(D(Q), AIR.outline, tubeW(g, Q[8]) + 2 * w)).join('')
  s += strokeD(trunk, AIR.base, tubeW(g, 16), 'butt') + T.map((Q) => strokeD(D(Q), AIR.base, tubeW(g, Q[8]))).join('')
  // Cartilage rings: arcs across the trunk and a few on the bronchi.
  const ring = (Q, t, hw) => {
    const u = 1 - t, x = u ** 3 * Q[0] + 3 * u * u * t * Q[2] + 3 * u * t * t * Q[4] + t ** 3 * Q[6], y = u ** 3 * Q[1] + 3 * u * u * t * Q[3] + 3 * u * t * t * Q[5] + t ** 3 * Q[7]
    const dx = 3 * u * u * (Q[2] - Q[0]) + 6 * u * t * (Q[4] - Q[2]) + 3 * t * t * (Q[6] - Q[4]), dy = 3 * u * u * (Q[3] - Q[1]) + 6 * u * t * (Q[5] - Q[3]) + 3 * t * t * (Q[7] - Q[5]), l = Math.hypot(dx, dy) || 1, tx = dx / l, ty = dy / l
    return `M${P2(g.P([x + ty * hw, y - tx * hw]))} Q${P2(g.P([x + tx * 2.6, y + ty * 2.6]))} ${P2(g.P([x - ty * hw, y + tx * hw]))}`
  }
  let r = ''
  for (let y = -36; y <= -10; y += 6.5) r += `M${P2(g.P([-6.4, y]))} Q${P2(g.P([0, y + 3.2]))} ${P2(g.P([6.4, y]))}`
  r += ring(T[5], 0.42, 4.4) + ring(T[5], 0.8, 4.4) + ring(T[6], 0.4, 3.9) + ring(T[6], 0.76, 3.9) + ring(T[1], 0.5, 3) + ring(T[4], 0.5, 2.6)
  s += strokeD(r, AIR.small, w * 0.75)
  // The cut top: the ring seen end on round the dark airway.
  s += fillD(ellD(g, 0, -44, 9.4, 3.2), AIR.light, AIR.outline, w) + fillD(ellD(g, 0, -43.7, 5.6, 1.7), AIR.small)
  return own('trachea', s, [['trachea', AIR]])
})

// ---------- Oesophagus: in section, a bolus pushed down by the ring of muscle contracting above it ----------
icon('Oesophagus', [4.75, 0, 0], (g) => {
  const pal = GUT, w = organW(460) * 0.8
  const outer = g.D('M13,-47L13,-34C13,-28 10,-26 10,-21C10,-15 17.5,-10 17.5,2C17.5,12 13,15 13,22L13,47L-13,47L-13,22C-13,15 -17.5,12 -17.5,2C-17.5,-10 -10,-15 -10,-21C-10,-26 -13,-28 -13,-34L-13,-47Z')
  const lumen = g.D('M4,-47L4,-34C4,-28 1.2,-26 1.2,-21C1.2,-15 11,-11 11,2C11,12 5,15 4,22L4,47L-4,47L-4,22C-5,15 -11,12 -11,2C-11,-11 -1.2,-15 -1.2,-21C-1.2,-26 -4,-28 -4,-34L-4,-47Z')
  const side = 'M4,-47L4,-34C4,-28 1.2,-26 1.2,-21C1.2,-15 11,-11 11,2C11,12 5,15 4,22L4,47', wallSide = 'M13,-47L13,-34C13,-28 10,-26 10,-21C10,-15 17.5,-10 17.5,2C17.5,12 13,15 13,22L13,47'
  const mirrorD = (d) => d.replace(/(-?\d*\.?\d+),/g, (_, u) => `${-u},`)
  let s = fillD(outer, pal.base) + fillD(lumen, pal.light) + strokeD(g.D(side) + ' ' + g.D(mirrorD(side)), pal.small, w * 0.55)
  // Circular muscle in the wall, as short strokes across it.
  const m = [[6, -42, 11], [6, -37.5, 11], [3, -25, 9.5], [2.5, -20, 9], [6, 29, 11], [6, 34, 11], [6, 39, 11], [6, 44, 11]]
  s += strokeD(m.flatMap(([a, y, b]) => [[a, b], [-a, -b]].map(([u, U]) => `M${P2(g.P([u, y]))} L${P2(g.P([U, y]))}`)).join(' '), pal.small, w * 0.6)
  // The open ends are cut: the wall's cut faces outlined, the lumen left open.
  s += strokeD([wallSide, mirrorD(wallSide), 'M4,-47L13,-47M-4,-47L-13,-47M4,47L13,47M-4,47L-13,47'].map(g.D).join(' '), pal.outline, w)
  const wall = own('oesophagus', s, [['oesophagus', pal]])
  const bb = glossBody('bolus', [ellD(g, 0, 1, 9.5, 12.5)], BOLUS, w * 0.8)
  const bolus = { defs: bb.defs, body: `<g id="bolus">${bb.body}</g>`, parts: [['bolus', BOLUS]] }
  const arrows = [arrow(g, { points: [[27, -21], [16.5, -21]], corners: true, w: 9, colour: INK, id: 'squeeze-right' }), arrow(g, { points: [[-27, -21], [-16.5, -21]], corners: true, w: 9, colour: INK, id: 'squeeze-left' }), arrow(g, { points: [[0, 18], [0, 37]], corners: true, w: 9, colour: INK, id: 'onwards' })]
  return join(wall, bolus, ...arrows)
})

// ---------- Diaphragm: the dome of muscle under the lungs, its central tendon and crura, pulling down as it contracts ----------
icon('Diaphragm', [4.8, 0, -1.5], (g) => {
  const lungs = organ(g, { kind: 'lungs', x: 0, y: -8, size: 82, id: 'lungs' })
  const pal = DIAPHRAGM, w = organW(460) * 0.8
  let s = fillD(g.D('M-6,15C-8,24 -8,32 -6,40L-2.5,40C-3,32 -2.5,24 -1,17Z M6,15C8,24 8,32 6,40L2.5,40C3,32 2.5,24 1,17Z'), pal.shadow, pal.outline, w * 0.7)
  const dome = g.D('M-48,36C-47,14 -34,2 -20,4C-10,6 -5,11 0,11C5,11 10,7 20,5C34,2 47,14 48,36C42,26 32,15 20,14C10,14 5,18 0,18C-5,18 -10,15 -20,15C-32,15 -42,26 -48,36Z')
  const box = boxOf(dome)
  const defs = lin('diaphragm-gradient', box, pal.base, pal.shadow)
  s += fillD(dome, 'url(#diaphragm-gradient)')
  s += strokeD(g.D('M-42,26L-34,9M-34,18L-27,6M-25,15L-21,6M25,14L21,6M34,17L27,5M42,26L34,8'), pal.small, w * 0.55)
  s += fillD(dome, 'none', pal.outline, w)
  const tendon = fillD(g.D('M-16,8C-9,9 -5,12 0,12C5,12 9,9 16,7C15,11 9,14 0,14C-9,14 -15,12 -16,8Z'), TENDON.base, TENDON.outline, w * 0.55)
  const arrows = [arrow(g, { points: [[-28, 32], [-28, 45]], corners: true, w: 9, colour: INK, id: 'down-left' }), arrow(g, { points: [[28, 32], [28, 45]], corners: true, w: 9, colour: INK, id: 'down-right' })]
  return join(lungs, own('diaphragm', s, [['diaphragm', pal]], defs), own('central-tendon', tendon, [['tendon', TENDON]]), ...arrows)
})

check()
console.log('written', OUT)
