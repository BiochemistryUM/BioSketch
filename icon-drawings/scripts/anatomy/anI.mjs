// Eight icons of SiliCoDraw's "Anatomy" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts of the category
// in ../parts/anatomy.mjs: the pituitary, the GH–IGF-1 axis, thymic involution, inter-organ communication, a muscle, a
// tendon, sarcopenic obesity and a hand.
// Lettered (strokes, letters.mjs): GH and IGF-1 on the GH–IGF-1 axis. Drawn here, as no part draws them: the hand (a
// closed body in the skin of a person, glossed as the outer ear is) and the tendon's band (flat, in the tendon's grey).
// The current look: outlines at 60 % (setStrokeScale), the gloss of cells on (setGloss).
// Usage: node anI.mjs <folder>
import { cellTypes, glossOn, page, setGloss, smoothD } from '../cellkit.mjs'
import { toHex, toLch } from '../colour.mjs'
import { f, setStrokeScale, strokeScale } from '../shapes.mjs'
import { gloss, glossTones, pathPoints } from '../parts/surfaces.mjs'
import { BRAIN, FAT, LIVER, MUSCLE, PITUITARY, SKIN, TENDON, brain, bone, lesion, muscle, organ, organPal, organW } from '../parts/anatomy.mjs'
import { brainPal } from '../parts/complexes.mjs'
import { cytokines } from '../parts/immune.mjs'
import { SIGNAL, arrow } from '../parts/tissue.mjs'
import { INK as LAB_INK } from '../parts/lab.mjs'
import { lettering } from '../parts/letters.mjs'
import { mkdirSync } from 'node:fs'

const OUT = process.argv[2]
setStrokeScale(0.6)
setGloss(true)
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT)
// Greys (chroma below 0.012) are left out of the hue check; a palette used twice is one part and is listed once.
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base) === i), defs, body)
const icon = (name, ps, parts) => cellType(name, parts ?? ps.flatMap((p) => p.parts ?? []), ps.map((p) => p.defs ?? '').join(''), ps.map((p) => p.body).join('\n'))

let g = page(4.6, [0, 0]) // SiliCoDraw's 100-unit box on 460 px of the page

// ---------- a closed body of our own, in the gloss of organs (as anatomy.mjs's glossBody) ----------
const lin = (id, [x0, y0, x1, y1], a, b) => `<linearGradient id="${id}" x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`
const boxOf = (ds) => { const p = ds.flatMap((d) => pathPoints(d).flat()), xs = p.map((q) => q[0]), ys = p.map((q) => q[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] }
/** Page outlines `ds` filled as one body with the gloss, `inner` drawn over the tones, one outline round them all. */
function glossBody(id, ds, pal, w, { inner = '', keep } = {}) {
  const box = boxOf(ds), size = Math.max(box[2] - box[0], box[3] - box[1]), T = glossTones(pal)
  const defs = lin(`${id}-gradient`, box, pal.base, glossOn() ? T.end : pal.shadow)
  let s = ds.length > 1 ? ds.map((d) => `<path d="${d}" fill="${pal.outline}" stroke="${pal.outline}" stroke-width="${f(2 * w)}" stroke-linejoin="round"/>`).join('') : ''
  s += ds.map((d) => `<path d="${d}" fill="url(#${id}-gradient)"/>`).join('')
  if (glossOn() && size >= 40) {
    const G = gloss({ fills: ds.map(pathPoints) }, { inset: (w * strokeScale()) / 2 })
    // keep(tone, [x, y]): which pieces of a tone to draw, by their middle on the page (all of them by default).
    const pieces = (k) => (keep ? (G[k].match(/M[^M]*/g) ?? []).filter((q) => { const p = pathPoints(q).flat(); return keep(k, [p.reduce((a, b) => a + b[0], 0) / p.length, p.reduce((a, b) => a + b[1], 0) / p.length]) }).join('') : G[k])
    s += ['shade', 'shadow', ...(size >= 90 ? ['lit', 'highlight'] : [])].map((k) => (G[k] && pieces(k) ? `<path d="${pieces(k)}" fill="${T[k]}"/>` : '')).join('')
  }
  s += inner
  if (ds.length === 1) s += `<path d="${ds[0]}" fill="none" stroke="${pal.outline}" stroke-width="${f(w)}" stroke-linejoin="round"/>`
  return { defs, body: `<g id="${id}">${s}</g>` }
}
const line = (pts, colour, w) => `<path d="${pts}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"/>`
/** A path in g's units (absolute M, C, L, Q only) onto the page. */
const D = (d) => g.D(d)
const rot = ([x, y], [ox, oy], deg) => { const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r); return [ox + (x - ox) * c - (y - oy) * s, oy + (x - ox) * s + (y - oy) * c] }
/** A capsule (a finger): x the middle, from y0 to y1, w wide, turned by r about [x, y1]; as a page path. */
const capsule = (x, y0, y1, w, r) => {
  const R = w / 2, pts = []
  for (let i = 0; i <= 16; i++) { const a = Math.PI + (Math.PI * i) / 16; pts.push([x + R * Math.cos(a), y0 + R + R * Math.sin(a)]) }
  for (let i = 0; i <= 16; i++) { const a = (Math.PI * i) / 16; pts.push([x + R * Math.cos(a), y1 - R + R * Math.sin(a)]) }
  return 'M' + pts.map((p) => g.P(rot(p, [x, y1], r)).map(f).join(',')).join(' L') + 'Z'
}

// ---------- Pituitary ----------
// The gland in the sella below the hypothalamus: the posterior lobe on its stalk (nervous tissue, the brain's pink, with
// the axons of the hypothalamic nuclei) and the glandular anterior lobe in front.
icon('Pituitary', [organ(g, { kind: 'pituitary', x: 0, y: 3, size: 110, id: 'pituitary' })])

// ---------- GH–IGF-1 axis ----------
// The pituitary releases growth hormone (GH) into the blood; it reaches the liver, which answers with IGF-1, released
// into the circulation. GH and IGF-1 are dots in the tones of the gland and of the liver; each arrow in the outline
// tone of what moves.
{
  g = page(4.6, [-1.7, 0]) // a little right of its own middle, to centre it
  const pit = organ(g, { kind: 'pituitary', x: -26, y: -26, size: 48, id: 'pituitary' })
  const liv = organ(g, { kind: 'liver', x: 8, y: 25, size: 76, gallbladder: false, id: 'liver' })
  const a1 = arrow(g, { points: [[-38, 0], [-36, 10], [-27, 16]], colour: PITUITARY.outline, w: 9, id: 'gh-arrow' })
  const gh = cytokines(g, { x: -44, y: 7, size: 14, layout: 'stream', count: 3, dot: 34, pal: PITUITARY, pal2: null, turn: 75, id: 'growth-hormone' })
  const a2 = arrow(g, { points: [[25, -1], [28, -17], [27, -33], [23, -46]], colour: LIVER.outline, w: 9, id: 'igf-arrow' })
  const igf = cytokines(g, { x: 39, y: -24, size: 18, layout: 'cloud', count: 5, dot: 34, pal: LIVER, pal2: null, id: 'igf-1', seed: 3 })
  const L1 = lettering(g, { x: -44, y: -7, h: 6.5, text: 'GH', colour: PITUITARY.outline, id: 'gh-letters' })
  const L2 = lettering(g, { x: 10, y: -15, h: 6.5, text: 'IGF-1', colour: LIVER.outline, id: 'igf-letters' })
  // The GH dots and their arrow are the gland's own tones, IGF-1 the liver's: they recolour with what releases them.
  icon('GH–IGF-1 axis', [liv, pit, a1, gh, a2, igf, L1, L2], [...pit.parts, ...liv.parts])
  g = page(4.6, [0, 0])
}

// ---------- Thymic involution ----------
icon('Thymic involution', [organ(g, { kind: 'thymus', state: 'involuted', x: 0, y: 0, size: 110, id: 'thymus' })])

// ---------- Inter-organ communication ----------
// Brain, liver, muscle and fat round the circulating factors (secreted signals, the set's blue dots), each linked to them
// by a two-way arrow. The brain is a little pinker (340°), the muscle a little
// redder (18°) and the liver a little yellower (55°) than their own palettes, so that brain, muscle, liver and fat
// stay 36° apart.
{
  g = page(4.6, [0, -2.7]) // a little below its own middle, to centre it
  const BR = brainPal(340), MU = organPal(17, 1.35)
  const LV = { light: toHex({ l: 0.93, c: 0.03, h: 55 }), base: toHex({ l: 0.83, c: 0.07, h: 55 }), shadow: toHex({ l: 0.76, c: 0.085, h: 55 }), small: toHex({ l: 0.64, c: 0.1, h: 55 }), outline: toHex({ l: 0.48, c: 0.1, h: 55 }) }
  const br = brain(g, { x: -27, y: -26, size: 44, pal: BR, id: 'brain' })
  const lv = organ(g, { kind: 'liver', x: 28, y: -25, size: 44, gallbladder: false, pal: LV, id: 'liver' })
  const mu = muscle(g, { x: -26, y: 26, size: 56, turn: -30, pal: MU, id: 'muscle' })
  const fat = lesion(g, { x: 28, y: 26, size: 36, kind: 'fat', id: 'fat' })
  const sig = cytokines(g, { x: 0, y: 0, size: 18, layout: 'cloud', count: 6, dot: 30, pal: SIGNAL, pal2: null, id: 'circulating-factors' })
  const arrows = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy], i) => arrow(g, { points: [[sx * 7, sy * 7], [sx * 17, sy * 17]], start: 'head', w: 9, colour: LAB_INK, id: `arrow${i + 1}` }))
  icon('Inter-organ communication', [sig, ...arrows, br, lv, mu, fat])
  g = page(4.6, [0, 0])
}

// ---------- Muscle ----------
icon('Muscle', [muscle(g, { x: 0, y: 0, size: 106, turn: -25, id: 'muscle' })])

// ---------- Tendon ----------
// A muscle belly whose tendon, a band of wavy collagen, runs to its attachment on a bone.
{
  const bn = bone(g, { x: 32, y: 0, size: 82, turn: 90, id: 'bone' })
  const mu = muscle(g, { x: -16, y: 0, size: 68, id: 'muscle' })
  // The band, from the muscle's tapering end to the bone's surface: flat, in the tendon's grey, with its crimped fibres.
  const w = organW(64 * g.k) * 0.8, X = (u) => f(g.X(u)), Y = (v) => f(g.Y(v))
  const band = `M${X(10)},${Y(-4)} C${X(16)},${Y(-4.2)} ${X(21)},${Y(-4.4)} ${X(24)},${Y(-6.6)} L${X(28)},${Y(-7)} L${X(28)},${Y(7)} L${X(24)},${Y(6.6)} C${X(21)},${Y(4.4)} ${X(16)},${Y(4.2)} ${X(10)},${Y(4)} Z`
  const crimp = (yy) => { let d = `M${X(11)},${Y(yy)}`; for (let k = 0; k < 4; k++) d += ` Q${X(12.5 + k * 3)},${Y(yy + (k % 2 ? 1.1 : -1.1))} ${X(14 + k * 3)},${Y(yy)}`; return d }
  const tendon = { body: `<g id="tendon"><path d="${band}" fill="${TENDON.base}" stroke="${TENDON.outline}" stroke-width="${f(w)}" stroke-linejoin="round"/>${line(crimp(-1.6) + crimp(1.6), TENDON.small, w * 0.6)}</g>`, parts: [['tendon', TENDON]] }
  icon('Tendon', [bn, tendon, mu])
}

// ---------- Sarcopenic obesity ----------
// A thigh cut across, as a CT shows it: a thick ring of subcutaneous fat round a shrunken muscle, the femur in the middle.
icon('Sarcopenic obesity', [muscle(g, { x: 0, y: 0, size: 108, view: 'section', state: 'atrophied', fat: 0.45, id: 'thigh' })])

// ---------- Hand ----------
// The palm of a right hand, fingers up, thumb to the left: one closed body in the skin of a person, with the creases of
// the finger joints and the three main lines of the palm.
{
  g = page(4.6, [-5, 2]) // the hand drawn a little right of and above its own middle, to centre it
  const F = [[-15, -38, 4, 10.5, -7], [-3, -46, 2, 11, -1], [9, -41, 4, 10.5, 5], [20, -29, 8, 9, 12]]
  const palm = g.smooth([[-20, -4], [-8, -8], [4, -8], [16, -5], [25, 4], [26, 20], [22, 34], [19, 48], [-14, 48], [-18, 34], [-22, 18], [-22, 6]])
  const ds = [capsule(-16, -8, 24, 13, -48), ...F.map((p) => capsule(...p)), palm]
  const w = organW(460), cr = SKIN.small
  let inner = ''
  F.forEach(([x, y0, y1, wd, r]) => { const v = -6 - y0, h = wd * 0.26; [0.3, 0.63].forEach((t) => { const a = g.P(rot([x - h, y0 + v * t], [x, y1], r)), b = g.P(rot([x + h, y0 + v * t], [x, y1], r)); inner += line(`M${f(a[0])},${f(a[1])} L${f(b[0])},${f(b[1])}`, cr, w * 0.45) }) })
  { const a = g.P(rot([-19.5, 2], [-16, 24], -48)), b = g.P(rot([-12.5, 2], [-16, 24], -48)); inner += line(`M${f(a[0])},${f(a[1])} L${f(b[0])},${f(b[1])}`, cr, w * 0.45) }
  inner += line(D('M24,8C15,5 4,7 -5,12M-19,10C-9,11 3,16 13,19M-14,9C-8,19 -6,31 -3,44'), cr, w * 0.45)
  // The lit rim and highlight only on the finger tips and the thumb: the gloss of the joined shapes lights up the
  // clefts between the fingers too.
  const tip = (k, [px, py]) => (k === 'lit' || k === 'highlight' ? py < g.Y(-16) || px < g.X(-30) : true)
  const hand = glossBody('hand', ds, SKIN, w, { inner, keep: tip })
  icon('Hand', [hand], [['skin', SKIN]])
  g = page(4.6, [0, 0])
}

kit.check()
console.log('written', OUT)
