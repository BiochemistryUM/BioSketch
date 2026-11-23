// Eight icons of SiliCoDraw's "Anatomy" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts of the category
// (../parts/anatomy.mjs): the female reproductive and two endocrine organs. Uterus, Ovary, Menstrual cycle, Breast,
// Lactation, Placenta, Thyroid and Adrenal gland.
// Compositions are read by hand from the source (the last definition of each icon) in its 100 × 100 box centred on 0,0
// and scaled onto a 512 page (`page` of ../cellkit.mjs); outlines at 60 % (setStrokeScale), gloss on.
// Parts used: organ ('uterus', 'thyroid' with the trachea, 'kidney'), placeCellType ('Oocyte': the ovulated egg and the
// eggs inside follicles), arrow (tissue.mjs), lettering (letters.mjs: "28" in the cycle wheel), the palettes and organW of
// anatomy.mjs (MUSCLE, FAT, ARTERY, VEIN, organPal).
// Drawn here because no part draws them, in the look of anatomy.mjs (closed bodies glossed as `organ` does, tubes and
// signs flat): the ovary with its follicles and corpora, the cycle wheel and a drop of blood, the breast in section
// (resting and lactating, with the chest wall), the placenta with its umbilical cord, and the adrenal gland on the kidney.
// Usage: node anH.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, glossOn, page, setGloss } from '../cellkit.mjs'
import { deep, rich, toHex, toLch } from '../colour.mjs'
import { f, setStrokeScale, strokeScale } from '../shapes.mjs'
import { ARTERY, FAT, MUSCLE, VEIN, organ, organPal, organW } from '../parts/anatomy.mjs'
import { gloss, glossTones, pathPoints } from '../parts/surfaces.mjs'
import { arrow, placeCellType } from '../parts/tissue.mjs'
import { INK } from '../parts/lab.mjs'
import { lettering } from '../parts/letters.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012: ink, milk, the cord) are left out of the hue check; one palette used by several parts is listed once.
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
const fillD = (d, fill, s = '', w = 0, extra = '') => `<path d="${d}" fill="${fill}"${s ? ` stroke="${s}" stroke-width="${f(w)}" stroke-linejoin="round"` : ''}${extra}/>`
const lin = (id, [x0, y0, x1, y1], a, b) => `<linearGradient id="${id}" x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`
const boxOf = (d) => { const p = pathPoints(d).flat(), xs = p.map((q) => q[0]), ys = p.map((q) => q[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] }
const polyD = (g, pts) => 'M' + pts.map((p) => P2(g.P(p))).join(' L') + ' Z'
const circD = (g, x, y, r) => { const [X, Y] = g.P([x, y]), R = r * g.k; return `M${f(X - R)},${f(Y)} A${f(R)},${f(R)} 0 1 0 ${f(X + R)},${f(Y)} A${f(R)},${f(R)} 0 1 0 ${f(X - R)},${f(Y)} Z` }
const dotsD = (g, pts, r) => pts.map(([x, y, rr]) => circD(g, x, y, rr ?? r)).join(' ')
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
/** Strokes are thinned by setStrokeScale, so a visible width in units of g is given back here (as anatomy.mjs's `tube`). */
const tubeW = (g, width) => (width * g.k) / strokeScale()
/** Flat tubes along page paths (one outline round them all): every outline first, then every fill. `items` [d, width in units of g]. */
const tubes = (g, items, outline, fill, w, cap = 'round') => items.map(([d, wd]) => strokeD(d, outline, tubeW(g, wd) + 2 * w, cap)).join('') + items.map(([d, wd]) => strokeD(d, fill, tubeW(g, wd), cap)).join('')
/** A drop (point towards `turn`, 0 = up) at x, y of radius r, as a page path. */
const dropD = (g, x, y, r, turn = 0) => {
  const a = (turn * Math.PI) / 180, R = ([u, v]) => [x + u * Math.cos(a) - v * Math.sin(a), y + u * Math.sin(a) + v * Math.cos(a)]
  const c = [[0, -1.6], [0.4, -0.7], [1, -0.2], [1, 0.4], [1, 0.95], [0.55, 1.4], [0, 1.4], [-0.55, 1.4], [-1, 0.95], [-1, 0.4], [-1, -0.2], [-0.4, -0.7], [0, -1.6]].map(([u, v]) => P2(g.P(R([u * r, v * r]))))
  return `M${c[0]} C${c[1]} ${c[2]} ${c[3]} C${c[4]} ${c[5]} ${c[6]} C${c[7]} ${c[8]} ${c[9]} C${c[10]} ${c[11]} ${c[12]} Z`
}
const greyPal = (l, h = 85, c = 0.008) => ({ light: toHex({ l: Math.min(0.995, l + 0.03), c: c * 0.5, h }), base: toHex({ l, c, h }), shadow: toHex({ l: l - 0.05, c, h }), small: toHex({ l: l - 0.17, c, h }), outline: toHex({ l: l - 0.4, c: c * 1.3, h }) })

// ---------- palettes of this batch ----------
const BREAST = organPal(330, 1.15) // glandular breast: pink, 44° from the chest muscle (14°)
const MILK = greyPal(0.985, 90, 0.007) // milk: white, outside the hue check
const CYCLE = organPal(281, 1.3) // the phases of the cycle: violet, 38° from the egg's nucleus (319°), 46° from its zona (235°)
const MENSES = deep(10) // blood of the menses: deep red, 42° from the egg (52°), 51° from its nucleus
const LUTEUM = rich(92) // the corpus luteum: yellow (the fat's yellow, "yellow body"), 40° from the egg
const ALBICANS = greyPal(0.95, 85, 0.008) // the corpus albicans: white scar, outside the hue check
const PLACENTA = { light: toHex({ l: 0.93, c: 0.03, h: 348 }), base: toHex({ l: 0.74, c: 0.11, h: 348 }), shadow: toHex({ l: 0.67, c: 0.12, h: 348 }), small: toHex({ l: 0.58, c: 0.12, h: 348 }), outline: toHex({ l: 0.42, c: 0.1, h: 348 }) } // the placenta: a dark red-purple (darker, as the liver's palette), 37° from the umbilical vein's red (25°), 86° from the blue
const CORD = greyPal(0.93, 250, 0.009) // Wharton's jelly: bluish white, outside the hue check
const OVARY = organPal(358, 1.1) // the ovary on its own: pink (SiliCoDraw's), 39° from the egg's nucleus (319°); the uterus's lilac would be 6° from it
const ADRENAL = organPal(72, 1.75) // the adrenal cortex: golden yellow, 97° from the kidney (335°)

// ---------- Uterus: the part, with tubes and ovaries ----------
icon('Uterus', [4.58, 0, 4.1], (g) => organ(g, { kind: 'uterus', x: 0, y: 0, size: 100, id: 'uterus' }))

// ---------- Ovary: follicles at every stage, the corpus luteum and albicans, an egg just released ----------
icon('Ovary', [4.75, 1.9, -3.4], (g) => {
  const w = organW(430), lw = w * 0.42
  const O = g.smooth([[-45, 4], [-41, -10], [-29, -20], [-12, -24], [6, -24], [22, -21], [36, -13], [44, 0], [42, 14], [32, 24], [16, 30], [0, 32], [-18, 30], [-32, 24], [-42, 15]])
  // Primordial follicles along the cortex: pale rings round a small egg.
  const pf = [[-38, 2], [-37, -7], [-31, -14], [-22, -18], [39, 6], [34, 16], [-26, -2]]
  let inner = fillD(dotsD(g, pf, 2.7), OVARY.light, OVARY.small, lw) + fillD(dotsD(g, pf, 1.15), OVARY.outline)
  // A growing follicle: granulosa round its egg.
  inner += fillD(circD(g, -9, -12, 6.5), OVARY.small, OVARY.outline, lw)
  // The mature (Graafian) follicle: theca, granulosa, the fluid-filled antrum, the egg in its cumulus.
  inner += fillD(circD(g, 17, -3, 16), OVARY.shadow, OVARY.outline, lw) + fillD(circD(g, 17, -3, 13.2), OVARY.small) + fillD(ellD(g, 19.5, -5, 10.5, 10), OVARY.light)
  inner += fillD(circD(g, 9.3, 3.8, 6.2), OVARY.small)
  // The corpus luteum (yellow, folded, a clot in its middle) and an old corpus albicans (a white scar).
  const cl = []
  for (let i = 0; i < 16; i++) { const t = (i / 16) * 2 * Math.PI, r = 11.5 + (i % 2 ? -1.4 : 1.4); cl.push([-16 + r * Math.cos(t), 14 + r * 0.85 * Math.sin(t)]) }
  inner += fillD(g.smooth(cl), LUTEUM.base, LUTEUM.outline, lw * 1.2) + fillD(ellD(g, -16, 14, 4.8, 3.8), LUTEUM.small)
  inner += fillD(circD(g, -34.5, 12, 5), ALBICANS.base, ALBICANS.outline, lw) + strokeD(g.D('M-37.5,10.2L-32.5,14M-35.6,8.6L-31.4,12.8'), ALBICANS.small, lw * 0.9)
  const ov = glossBody('ovary-body', [O], OVARY, w, { inner })
  // The ruptured follicle's path to the released egg, in its corona of granulosa cells.
  const path = strokeD(g.D('M34,-13.5C37,-18 38.5,-21 39.5,-24.5'), OVARY.outline, lw * 1.1, 'round', ` stroke-dasharray="${f(lw * 2.6)} ${f(lw * 3)}"`)
  const corona = fillD(circD(g, 41.5, -32, 7.6), OVARY.small, OVARY.outline, lw * 1.1)
  const eggs = [placeCellType(g, 'Oocyte', { x: -9, y: -12, size: 7, id: 'egg-growing' }), placeCellType(g, 'Oocyte', { x: 9.3, y: 3.8, size: 9, id: 'egg-graafian' }), placeCellType(g, 'Oocyte', { x: 41.5, y: -32, size: 11.5, id: 'egg-released' })]
  return join(own('ovary', ov.body + path + corona, [['ovary', OVARY], ['corpus luteum', LUTEUM]], ov.defs), ...eggs)
})

// ---------- Menstrual cycle: a wheel of 28 days, the menses, follicular and luteal phases, ovulation on day 14 ----------
icon('Menstrual cycle', [4.95, 0, 0], (g) => {
  const R0 = 27, R1 = 40, ang = (d) => ((-90 + (d / 28) * 360) * Math.PI) / 180, at = (r, d) => [r * Math.cos(ang(d)), r * Math.sin(ang(d))]
  const arc = (r, d0, d1, n = 24) => Array.from({ length: n + 1 }, (_, i) => at(r, d0 + ((d1 - d0) * i) / n))
  const sector = (d0, d1) => polyD(g, [...arc(R1, d0, d1), ...arc(R0, d1, d0)])
  const w = organW(460) * 0.62
  let s = fillD(sector(5, 14), CYCLE.base) + fillD(sector(14, 28), CYCLE.small) + fillD(sector(0, 5), MENSES.small)
  s += fillD(circD(g, 0, 0, R1), 'none', CYCLE.outline, w) + fillD(circD(g, 0, 0, R0), 'none', CYCLE.outline, w)
  s += strokeD([0, 5, 14].map((d) => `M${P2(g.P(at(R0, d)))} L${P2(g.P(at(R1, d)))}`).join(' '), CYCLE.outline, w)
  const ring = own('cycle', s, [['cycle', CYCLE]])
  // A drop of blood in the days of the menses.
  const [dx, dy] = at(33.5, 2.5)
  const drop = own('blood-drop', fillD(dropD(g, dx, dy + 0.6, 3.6), MENSES.light, MENSES.outline, w * 0.7), [['menses', MENSES]])
  // The cycle goes round: an arrow outside the wheel, clockwise into day 1.
  const arr = arrow(g, { points: arc(46, 24.6, 1.4, 48), corners: true, colour: INK, w: 7.5, id: 'cycle-arrow' })
  // Ovulation: the egg released on day 14.
  const egg = placeCellType(g, 'Oocyte', { x: 0, y: 33.5, size: 19, id: 'egg' })
  const days = lettering(g, { x: 0, y: 0, h: 15, text: '28', colour: CYCLE.outline, id: 'days' })
  return join(ring, drop, arr, egg, { body: days.body, parts: [] })
})

// ---------- Breast: in section against the chest wall; fat, lobules and ducts running to the nipple ----------
const chestWall = (g, d, lines, w) => own('chest-wall', fillD(g.D(d), MUSCLE.base, MUSCLE.outline, w * 0.8) + strokeD(g.D(lines), MUSCLE.small, w * 0.42), [['muscle', MUSCLE]])
icon('Breast', [4.85, -1.2, 0], (g) => {
  const w = organW(420), lw = w * 0.42
  const wall = chestWall(g, 'M-47,-47L-34,-47C-31,-20 -31,20 -34,47L-47,47Z', 'M-45.5,-36L-36,-42M-45.5,-22L-35,-29M-45.5,-8L-35,-15M-45.5,6L-35,-1M-45.5,20L-35,13M-45.5,34L-35,27', w)
  const nipple = fillD(g.D('M34,4.5C34,2.5 35.5,1.5 38,1.5L41,1.5C43.5,1.5 45,3 45,5.5L45,9.5C45,12 43.5,13.5 41,13.5L38,13.5C35.5,13.5 34,12.5 34,10.5Z'), BREAST.small, BREAST.outline, w * 0.8)
  const B = g.D('M-34,-45C-10,-45 18,-34 31,-12C34,-6 36,-1 38,0C39,6 39,10 38,15C35,18 34,21 32,25C24,38 10,45 -6,45C-20,45 -30,41 -34,37Z')
  // Fat lobules, then the ducts and the lobules of the gland, the areola along the skin round the nipple.
  let inner = fillD(dotsD(g, [[-22, -30, 8], [-24, -8, 9], [-22, 18, 9], [-12, 36, 7], [18, 28, 6], [18, -20, 5]]), FAT.base, FAT.outline, lw * 0.8)
  const D = g.D('M38,7C24,4 12,-6 0,-20M14,-5C12,-14 10,-20 5,-26M38,8C24,9 8,8 -8,3M38,9C26,14 10,22 -2,32M14,19C18,26 18,32 16,37M4,8C0,14 -2,18 -4,20')
  inner += tubes(g, [[D, 2.2]], BREAST.outline, BREAST.shadow, lw)
  inner += fillD(ellD(g, 31, 8, 4.2, 2.6), BREAST.shadow, BREAST.outline, lw)
  const cl = (x, y) => [[0, 0], [-3.6, -3.2], [-3.6, 3.2], [-7, 0], [0.4, -4.6], [0.4, 4.6]].map(([u, v]) => [x + u, y + v])
  inner += fillD(dotsD(g, [cl(0, -20), cl(5, -27), cl(-8, 3), cl(-4, 20), cl(-2, 32), cl(16, 38)].flat(), 2.9), BREAST.small, BREAST.outline, lw)
  inner += strokeD(g.D('M28,-10C32,-6 35,-2 38,0M38,15C36,18 34,21 31,26'), BREAST.small, tubeW(g, 3.2))
  const b = glossBody('breast-body', [B], BREAST, w, { inner })
  return join(wall, own('breast', nipple + b.body, [['breast', BREAST], ['fat', FAT]], b.defs))
})

// ---------- Lactation: the breast in section with its alveoli and ducts full of milk, milk leaving the nipple ----------
icon('Lactation', [4.75, 0, 0], (g) => {
  const w = organW(420), lw = w * 0.42
  const wall = chestWall(g, 'M-48,-48L-37,-48C-39,-20 -39,20 -37,48L-48,48Z', 'M-46.5,-36L-40,-30M-46.5,-20L-40,-14M-46.5,-4L-40,2M-46.5,12L-40,18M-46.5,28L-40,34', w)
  const B = g.D('M-41,-42C-22,-37 0,-27 14,-16C20,-11 23,-8 25,-6C26,12 20,28 6,37C-8,46 -28,45 -41,41C-38,14 -38,-16 -41,-42Z')
  const lobes = [[-24, -24], [-8, -14], [-28, -4], [-12, 8], [-26, 22], [-7, 26]]
  const ducts = lobes.map(([x, y]) => g.D(`M24,1C14,${f(y * 0.25)} ${f(x + 12)},${f(y * 0.9)} ${x + 3},${y}`)).join(' ')
  let inner = tubes(g, [[ducts, 2.4]], BREAST.outline, MILK.base, lw)
  const alv = lobes.flatMap(([x, y]) => [[0, 0], [-5, -3], [4, -4.5], [-4.5, 4], [4.5, 3.5]].map(([u, v]) => [x + u, y + v]))
  inner += fillD(dotsD(g, alv, 3.3), MILK.base, BREAST.outline, lw)
  inner += fillD(ellD(g, 17, 1, 5, 3), MILK.base, BREAST.outline, lw)
  const b = glossBody('breast-body', [B], BREAST, w, { inner })
  const nipple = fillD(g.D('M24,-9C29,-8 34,-5 34,1C34,7 29,9 24,10C26,4 26,-3 24,-9Z'), BREAST.small, BREAST.outline, w * 0.8)
  // Milk leaving the nipple: a drop and two droplets, white.
  const milk = fillD(dropD(g, 42.5, 1, 3.4, 90), MILK.base, MILK.outline, lw) + fillD(circD(g, 45.5, -10.5, 2.5), MILK.base, MILK.outline, lw) + fillD(circD(g, 46, 11.5, 2.1), MILK.base, MILK.outline, lw)
  return join(wall, own('breast', b.body + nipple, [['breast', BREAST]], b.defs), own('milk', milk, [['milk', MILK]]))
})

// ---------- Placenta: the disc seen from the fetal side, its vessels converging on the umbilical cord ----------
icon('Placenta', [4.85, 0, 0.1], (g) => {
  const w = organW(440), lw = w * 0.42
  // The cord's course (a cubic Bézier from the disc upwards) and its outline, a band 5.2 to each side.
  const Q = [[2, 12], [-16, -4], [16, -22], [-3, -38]]
  const at = (t) => { const u = 1 - t; return [0, 1].map((k) => u * u * u * Q[0][k] + 3 * u * u * t * Q[1][k] + 3 * u * t * t * Q[2][k] + t * t * t * Q[3][k]) }
  const tn = (t) => { const u = 1 - t, d = [0, 1].map((k) => 3 * u * u * (Q[1][k] - Q[0][k]) + 6 * u * t * (Q[2][k] - Q[1][k]) + 3 * t * t * (Q[3][k] - Q[2][k])), l = Math.hypot(...d) || 1; return [d[0] / l, d[1] / l] }
  const W = 5.4, L = [], R = []
  for (let i = 0; i <= 12; i++) { const t = i / 12, [x, y] = at(t), [tx, ty] = tn(t); L.push([x - ty * W, y + tx * W]); R.unshift([x + ty * W, y - tx * W]) }
  // The rim of the disc: the lower half of its edge, seen a little from the side, with the grooves between cotyledons.
  const half = Array.from({ length: 33 }, (_, i) => { const a = (Math.PI * i) / 32; return [46 * Math.cos(a), 14 + 22 * Math.sin(a)] })
  const rim = polyD(g, [...half.map(([x, y]) => [x, y + 7]), ...[...half].reverse()])
  let s = fillD(rim, PLACENTA.shadow, PLACENTA.outline, w)
  s += strokeD([-41, -30, -12, 8, 26, 40].map((x) => { const y = 14 + 22 * Math.sqrt(1 - (x / 46) ** 2); return `M${P2(g.P([x, y + 1.2]))} L${P2(g.P([x, y + 5.8]))}` }).join(' '), PLACENTA.outline, lw)
  // The chorionic plate: the vessels of the fetus branching from where the cord inserts.
  const V = g.D('M2,12C-10,8 -22,8 -34,11M-18,9C-24,4 -30,3 -36,5M2,12C12,6 24,4 35,7M22,6C27,2 31,1 34,2M2,12C-6,18 -16,24 -27,26M-14,22C-17,27 -14,30 -10,32M2,12C10,20 22,24 32,25M20,23C23,28 22,30 19,32')
  const disc = glossBody('placenta-disc', [ellD(g, 0, 14, 46, 22)], PLACENTA, w, { inner: tubes(g, [[V, 2.6]], VEIN.outline, VEIN.base, lw) })
  // The cord: Wharton's jelly with the two arteries (blue: blood back from the fetus) and the vein (red) twisting round
  // it, cut at its end.
  let cord = fillD(g.smooth([...L, ...R]), CORD.base, CORD.outline, w * 0.85)
  let red = '', blue = ''
  for (let i = 1; i <= 10; i++) { const t = i / 11.5, [x, y] = at(t), [tx, ty] = tn(t), d = `M${P2(g.P([x - ty * 4.3 + tx * 2.2, y + tx * 4.3 + ty * 2.2]))} L${P2(g.P([x + ty * 4.3 - tx * 2.2, y - tx * 4.3 - ty * 2.2]))}`; if (i % 2) red += d; else blue += d }
  cord += strokeD(red, ARTERY.small, tubeW(g, 1.9)) + strokeD(blue, VEIN.small, tubeW(g, 1.9))
  const [ex, ey] = at(1), [tx, ty] = tn(1), rot = (Math.atan2(ty, tx) * 180) / Math.PI + 90
  const along = (u) => [ex + u * Math.cos((rot * Math.PI) / 180), ey + u * Math.sin((rot * Math.PI) / 180)]
  cord += fillD(ellD(g, ex, ey, 6.2, 3.3, rot), CORD.light, CORD.outline, lw * 1.2)
  cord += fillD(dotsD(g, [[...along(-3), 1.3], [...along(3), 1.3]]), VEIN.base, VEIN.outline, lw * 0.6) + fillD(circD(g, ...along(0), 1.6), ARTERY.base, ARTERY.outline, lw * 0.6)
  return join(own('placenta', s + disc.body, [['placenta', PLACENTA], ['vein', VEIN]], disc.defs), own('umbilical-cord', cord, [['cord', CORD], ['artery', ARTERY]]))
})

// ---------- Thyroid: the part, on the trachea below the thyroid cartilage ----------
icon('Thyroid', [4.75, 0, 0.3], (g) => organ(g, { kind: 'thyroid', x: 0, y: 0, size: 100, id: 'thyroid' }))

// ---------- Adrenal gland: the gland capping the kidney, its cortex round the darker medulla ----------
icon('Adrenal gland', [4.85, 0, 6.9], (g) => {
  const kid = organ(g, { kind: 'kidney', x: -1, y: 20, size: 64, id: 'kidney' })
  const w = organW(280)
  // The cap in the source's own place (moved up 3, as SiliCoDraw draws it), narrower to sit on the kidney's upper pole.
  const T = (d) => d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, u, v) => `${f(+u * 0.8)},${f(+v - 2)}`)
  const cap = g.D(T('M-27,6C-28,-6 -20,-20 -8,-33C-4,-37 2,-38 5,-34C12,-25 22,-13 27,-2C28,2 25,4 22,2C14,-5 4,-8.5 -3,-8C-12,-7 -19,-1 -23,6C-24,8 -27,8 -27,6Z'))
  const medulla = fillD(g.D(T('M-15,-3C-12,-12 -6,-21 -0.5,-26C4,-20 10,-11 15,-3.5C10,-7.5 5,-10 -1,-10C-6,-10 -11,-7 -15,-3Z')), ADRENAL.small, ADRENAL.outline, w * 0.42)
  const b = glossBody('adrenal-body', [cap], ADRENAL, w, { inner: medulla })
  return join(kid, own('adrenal-gland', b.body, [['adrenal gland', ADRENAL]], b.defs))
})

check()
console.log('written', OUT)
