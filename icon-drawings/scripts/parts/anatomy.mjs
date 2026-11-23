// Shared parts of the redrawn icons, group "anatomy": what the icons of SiliCoDraw's "Anatomy" category have in common.
// Organs (one function with kinds), the brain seen from the side with its regions lit, the eye, the ear, skin in section
// with hair follicles and glands, teeth, bones, vertebrae and joints, blood vessels by kind and state, muscle (and the fat round it in
// section), the marks of a disease state (lesion) and the flame. Each part is a function
// `part(g, { x, y, size, turn, id, w, pal, ...options })` that returns { defs, body, parts }, drawn in the frame `g` of
// `page()` (../cellkit.mjs). `size` is the longer extent in g's units, outline included; `turn` turns it about x, y
// (degrees, clockwise); `w` overrides the main outline in page pixels (from the size on the page otherwise); every id
// inside starts with `id`. Shapes from SiliCoDraw (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), its "Anatomy" icons (the later drawings that replace the first), read by hand and
// drawn in the soft look of icon-drawings/STYLE.md. Promoted unchanged in look: the lymph node, spleen, thymus, long bone
// in section, kidney and flame of ../immune/imE.mjs and imF.mjs, and the brain of complexes.mjs (its outline, folds and
// palette), which here gets the gloss and its regions.
//
// ---------- Conventions of anatomy ----------
// Look. Organs are closed round bodies: with setGloss(true) (../cellkit.mjs) they get the face-on gloss of cells (`gloss` of
//   surfaces.mjs: a narrow lit rim and highlight at the upper left, a thin pale shade at the lower right, the body's
//   gradient ending in the gloss's end tone), the shade from 40 px and the lit rim from 90 px on the page. Tubes (gut,
//   vessels, ducts, airways), bones, teeth, skin blocks and every inner detail stay flat. No highlight ellipses.
// Colours. Each organ has one palette, a little fuller than `soft` (`organPal`, as complexes.mjs's brainPal) so that it
//   reads when small; organs that meet in a body are 36° of hue or more apart:
//   brain the approved pink (0°, brainPal), heart and skeletal muscle red-rose (14°), liver brown-red (46°, darker),
//   lungs rose (352°), the gut (oesophagus, stomach, intestines, colon) and uterus pink (5° and 325°), pancreas
//   peach-yellow (rich 80), gallbladder and bile green (135°), kidney (soft 335, as the approved Transplant), bladder wall
//   rose (20°) holding yellow urine (rich 95, as the approved ureter), prostate mauve (340°), thyroid pink (8°), pituitary
//   lilac (315°), spleen, lymph node and thymus as approved (deep 335, soft 300, soft 350). Bone ivory (the grey of
//   Bone marrow, outside the hue check), marrow red (deep 10), cartilage and discs pale blue (230°), synovial fluid teal
//   (185°), tendon and ligament an off-white grey, fat yellow (rich 92), nerve yellow (rich 100). Skin in section:
//   epidermis peach (52°), dermis pink (338°; a scar and its fibres in the dermis's own deeper tones), hypodermis the fat's yellow, hair a dark warm grey (pigmented) or a pale
//   grey (grey hair), both outside the hue check, sebaceous gland pale yellow-green (rich 140, so that it does not recolour with the fat), sweat gland blue (245°). The skin of
//   a person (outer ear) is assays.mjs's SKIN (52°). Teeth: enamel an off-white grey, dentine cream (rich 88),
//   pulp rose (deep 332), gum pink (10°), caries brown (48°), dental plaque yellow-green (rich 126), metal (filling, implant) a
//   cool grey. Eye: sclera grey-white, iris blue (deep 250), pupil ink, lens
//   and cornea pale blue (195°), a cloudy lens grey, retina and fundus orange-red (40°) with the optic disc pale yellow (rich 95), optic
//   nerve the nerve's yellow. Inner ear pink (355°). Vessels as immune.mjs: artery red (deep 25), vein blue (deep 262),
//   lymphatic pale yellow (rich 100); the wall of a vessel in section the rose of tissue.mjs (18°).
// States. A highlighted region or a diseased part is a deeper tone of the organ itself (its `small` tone), outlined in
//   the organ's own outline tone, never in a second outline colour. Marks of disease are one look everywhere (`lesion`):
//   fibrosis as collagen (orange, 55°, molecules.mjs's collagen) in wavy patches, fat as yellow droplets (rich 92),
//   calcification as ivory-white chips with a grey edge, damage as a crack in the organ's outline tone, a nodule as a
//   rounded lump in the organ's deeper tone. Something lost or shrunk can leave a ghost: the former outline dashed over a
//   pale fill (`ghost: true` on organs, `atrophy` on brain regions).
// Size. Each part is designed in its source box (about 100 units) and drawn at any size; below about 60 px on the page
//   inner detail (folds, rings, follicles, pores, vessels on a surface) is left out and outlines stay at least 3.5 px;
//   the lit rim and highlight of the gloss come from 90 px.
import { glossOn, smoothD } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex } from '../colour.mjs'
import { f, strokeScale } from '../shapes.mjs'
import { gloss, glossTones, pathPoints } from './surfaces.mjs'
import { RED, VESSEL, cellW, redBloodCell, vessel } from './tissue.mjs'
import { ARTERY, LYMPH, T_CELL, VEIN, lymphocyte } from './immune.mjs'
import { brainPal } from './complexes.mjs'
import { objW } from './lab.mjs'
import { SKIN } from './assays.mjs'

// ---------- palettes ----------
/** An organ's palette: a little fuller than `soft` (as complexes.mjs's brainPal), `k` scales the colour. */
export const organPal = (h, k = 1) => ({ light: toHex({ l: 0.97, c: 0.016 * k, h }), base: toHex({ l: 0.91, c: 0.045 * k, h }), shadow: toHex({ l: 0.85, c: 0.065 * k, h }), small: toHex({ l: 0.73, c: 0.09 * k, h }), outline: toHex({ l: 0.55, c: 0.1 * k, h }) })
const grey = (l, h = 85, c = 0.008) => toHex({ l, c, h })
const greyPal = (l, h = 85, c = 0.008) => ({ light: grey(Math.min(0.99, l + 0.04), h, c * 0.5), base: grey(l, h, c), shadow: grey(l - 0.06, h, c), small: grey(l - 0.2, h, c), outline: grey(l - 0.38, h, c * 1.3) })
export const BRAIN = brainPal(hueOf('#f3d4dc'))
export const HEART = organPal(14, 1.35)
export const MUSCLE = HEART
export const LIVER = { light: toHex({ l: 0.93, c: 0.03, h: 46 }), base: toHex({ l: 0.83, c: 0.07, h: 46 }), shadow: toHex({ l: 0.76, c: 0.085, h: 46 }), small: toHex({ l: 0.64, c: 0.1, h: 46 }), outline: toHex({ l: 0.48, c: 0.1, h: 46 }) }
export const LUNGS = organPal(352, 1.1)
export const GUT = organPal(5, 1.05)
export const UTERUS = organPal(325, 1.1)
export const PANCREAS = rich(80)
export const GALL = organPal(135, 1.6)
export const KIDNEY = soft(335) // as the approved Transplant (imF)
export const BLADDER = organPal(20, 1.1)
export const URINE = rich(95) // the approved ureter
export const PROSTATE = organPal(340, 1.1)
export const THYROID = organPal(8, 1.2)
export const PITUITARY = organPal(315, 1.1)
export const SPLEEN = deep(335), NODE = soft(300), THYMUS = soft(350) // approved (imF)
export const IVORY = { light: toHex({ l: 0.985, c: 0.004, h: 85 }), base: toHex({ l: 0.95, c: 0.011, h: 85 }), shadow: toHex({ l: 0.89, c: 0.011, h: 85 }), small: toHex({ l: 0.76, c: 0.011, h: 85 }), outline: toHex({ l: 0.58, c: 0.011, h: 85 }) } // bone, as Bone marrow
export const MARROW = deep(10)
export const CARTILAGE = soft(230)
export const SYNOVIA = soft(185)
export const TENDON = greyPal(0.95, 90, 0.006)
export const FAT = rich(92)
export const NERVE = rich(100)
export const EPIDERMIS = soft(52), DERMIS = organPal(338, 0.95), HYPODERMIS = FAT
export const HAIR = { dark: greyPal(0.42, 55, 0.0095), grey: greyPal(0.86, 250, 0.006) }
export const SEBUM = rich(140), SWEAT = soft(245)
export const ENAMEL = greyPal(0.975, 90, 0.005), DENTINE = rich(88), PULP = deep(332), GUM = organPal(10, 1.3), CARIES = { light: toHex({ l: 0.75, c: 0.05, h: 48 }), base: toHex({ l: 0.58, c: 0.07, h: 48 }), shadow: toHex({ l: 0.5, c: 0.07, h: 48 }), small: toHex({ l: 0.45, c: 0.06, h: 48 }), outline: toHex({ l: 0.36, c: 0.05, h: 48 }) }, TARTAR = rich(126)
export const SCLERA = greyPal(0.97, 250, 0.006), IRIS = deep(250), LENS = soft(195), FUNDUS = organPal(40, 1.6), DISC = rich(95), INK = toHex({ l: 0.3, c: 0.01, h: 250 })
export const INNER_EAR = organPal(355, 1.1)
export const COLLAGEN = soft(hueOf('#d9824a')), CALCIUM = greyPal(0.97, 85, 0.008), PLAQUE = rich(90), CLOT = deep(15)
export { ARTERY, VEIN, LYMPH, SKIN }
export const FLAME = deep(35)

// ---------- helpers ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const rad = (d) => (d * Math.PI) / 180
const P2 = ([x, y]) => `${f(x)},${f(y)}`
/** The local frame: `E` source units about x, y are `size` units of g; px page pixels per unit; ext the size on the page. */
const frame = (g, x, y, size, E = 100, [ox, oy] = [0, 0]) => {
  const s = size / E, px = s * g.k
  return { s, px, ext: size * g.k, cx: g.X(x), cy: g.Y(y), P: ([u, v]) => g.P([x + (u + ox) * s, y + (v + oy) * s]), at: ([u, v]) => [x + (u + ox) * s, y + (v + oy) * s] }
}
/** The main outline of an organ whose longer extent on the page is `px`: 10 on a full page, never under 3.5. */
export const organW = (px) => f(clamp(1.3 + px / 13, 3.5, 10))
const group = (id, F, turn, inner) => `<g id="${id}"${turn ? ` transform="rotate(${f(turn)} ${f(F.cx)} ${f(F.cy)})"` : ''}>${inner}</g>`
const sw = (s, w) => (s ? ` stroke="${s}" stroke-width="${f(w)}" stroke-linejoin="round"` : '')
const fillD = (d, fill, s = '', w = 0, extra = '') => `<path d="${d}" fill="${fill}"${sw(s, w)}${extra}/>`
const strokeD = (d, colour, w, cap = 'round', extra = '') => (d ? `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"${extra}/>` : '')
const dashed = (w) => ` stroke-dasharray="${f(w * 2.2)} ${f(w * 1.8)}"`
/** A path in source units (absolute M, L, C, Q, Z only, numbers in pairs with commas) moved onto the page. */
const mapD = (F, d) => d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, u, v) => P2(F.P([+u, +v])))
const lineD = (F, pts) => `M${pts.map((p) => P2(F.P(p))).join(' L')}`
const polyD = (F, pts) => lineD(F, pts) + ' Z'
const circD = (F, u, v, r) => { const [X, Y] = F.P([u, v]), R = r * F.px; return `M${f(X - R)},${f(Y)} A${f(R)},${f(R)} 0 1 0 ${f(X + R)},${f(Y)} A${f(R)},${f(R)} 0 1 0 ${f(X - R)},${f(Y)} Z` }
const ellD = (F, u, v, rx, ry, rot = 0) => {
  const c = Math.cos(rad(rot)), s = Math.sin(rad(rot)), K = 0.5523
  const q = [[rx, 0], [rx, K * ry], [K * rx, ry], [0, ry], [-K * rx, ry], [-rx, K * ry], [-rx, 0], [-rx, -K * ry], [-K * rx, -ry], [0, -ry], [K * rx, -ry], [rx, -K * ry], [rx, 0]].map(([a, b]) => P2(F.P([u + a * c - b * s, v + a * s + b * c])))
  return `M${q[0]} C${q[1]} ${q[2]} ${q[3]} C${q[4]} ${q[5]} ${q[6]} C${q[7]} ${q[8]} ${q[9]} C${q[10]} ${q[11]} ${q[12]} Z`
}
const smooth = (F, pts) => smoothD(pts.map(F.P))
/** An open smooth curve through local points (Catmull–Rom as cubic Béziers). */
const curveD = (F, pts) => {
  const p = pts.map(F.P), n = p.length
  let d = `M${P2(p[0])}`
  for (let i = 0; i < n - 1; i++) {
    const a = p[Math.max(0, i - 1)], b = p[i], c = p[i + 1], e = p[Math.min(n - 1, i + 2)]
    d += `C${f(b[0] + (c[0] - a[0]) / 6)},${f(b[1] + (c[1] - a[1]) / 6)} ${f(c[0] - (e[0] - b[0]) / 6)},${f(c[1] - (e[1] - b[1]) / 6)} ${P2(c)}`
  }
  return d
}
/** A rounded rectangle in local units as a page path. */
const rectD = (F, u, v, wd, ht, r = 0) => {
  const R = Math.min(r, wd / 2, ht / 2), pts = [[u + R, v], [u + wd - R, v], [u + wd, v + R], [u + wd, v + ht - R], [u + wd - R, v + ht], [u + R, v + ht], [u, v + ht - R], [u, v + R]]
  if (!R) return polyD(F, [[u, v], [u + wd, v], [u + wd, v + ht], [u, v + ht]])
  const c = [[u + wd, v], [u + wd, v + ht], [u, v + ht], [u, v]]
  return `M${P2(F.P(pts[0]))} L${P2(F.P(pts[1]))} Q${P2(F.P(c[0]))} ${P2(F.P(pts[2]))} L${P2(F.P(pts[3]))} Q${P2(F.P(c[1]))} ${P2(F.P(pts[4]))} L${P2(F.P(pts[5]))} Q${P2(F.P(c[2]))} ${P2(F.P(pts[6]))} L${P2(F.P(pts[7]))} Q${P2(F.P(c[3]))} ${P2(F.P(pts[0]))} Z`
}
const dotsD = (F, pts, r) => pts.map(([u, v, rr]) => circD(F, u, v, rr ?? r)).join(' ')
const lin = (id, [x0, y0, x1, y1], a, b) => `<linearGradient id="${id}" x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`
const boxOf = (d) => { const p = pathPoints(d).flat(), xs = p.map((q) => q[0]), ys = p.map((q) => q[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] }
const join = (...ps) => ({ defs: ps.map((p) => p.defs ?? '').join(''), body: ps.map((p) => p.body ?? '').join(''), parts: ps.flatMap((p) => p.parts ?? []).filter((q, i, all) => all.findIndex((r) => r[0] === q[0]) === i) })
/** Points along a polyline every `step` (page or local units alike), with the direction there. */
const along = (pts, step, start = step / 2) => {
  const out = []
  let d = 0, next = start
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]], l = Math.hypot(b[0] - a[0], b[1] - a[1])
    while (l && next <= d + l) { const t = (next - d) / l; out.push({ p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], dir: [(b[0] - a[0]) / l, (b[1] - a[1]) / l] }); next += step }
    d += l
  }
  return out
}
/** Points of a Catmull–Rom curve through local points (open), `per` per segment. */
const catmull = (pts, per = 10) => {
  const out = []
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)]
    for (let j = 0; j < per; j++) { const t = j / per, t2 = t * t, t3 = t2 * t; out.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3))) }
  }
  out.push(pts.at(-1))
  return out
}
/** Is the local point inside the closed polygon (local points)? */
const inside = (poly, [x, y]) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c } return c }
/** Points of a smooth closed outline through local points (Catmull–Rom), as a local polygon. */
const smoothPoly = (pts, per = 8) => catmull([...pts, pts[0], pts[1], pts[2]], per).slice(per, per * (pts.length + 1))
/**
 * Splits a closed local polygon by an open curve (local points, both ends outside the polygon): returns the two pieces,
 * [left of the curve's direction, right], or null when the curve does not cross it twice.
 */
function split(poly, curve) {
  const hits = []
  const cross = (a, b, c, d) => { const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]], den = r[0] * s[1] - r[1] * s[0]; if (Math.abs(den) < 1e-12) return null; const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den, u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den; return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [t, u] : null }
  for (let k = 0; k < curve.length - 1; k++)
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], h = cross(curve[k], curve[k + 1], a, b)
      if (h) hits.push({ k, t: h[0], i, u: h[1], p: [curve[k][0] + (curve[k + 1][0] - curve[k][0]) * h[0], curve[k][1] + (curve[k + 1][1] - curve[k][1]) * h[0]] })
    }
  if (hits.length < 2) return null
  hits.sort((a, b) => a.k + a.t - (b.k + b.t))
  const A = hits[0], B = hits.at(-1)
  const mid = [A.p, ...curve.slice(A.k + 1, B.k + 1), B.p]
  const arc = (from, to) => { const out = []; let i = (from.i + 1) % poly.length; for (let n = 0; n <= poly.length; n++) { out.push(poly[i]); if (i === to.i) break; i = (i + 1) % poly.length } return out }
  const one = [...mid, ...arc(B, A)], two = [...[...mid].reverse(), ...arc(A, B)]
  return [one, two]
}

// ---------- the gloss of organs ----------
/**
 * A closed body in the gloss of cells: the page outlines `ds` filled as one with a gradient from the base to the gloss's
 * end tone, the face-on tones of the gloss over it, then `inner` (regions in deeper tones, inner lines), then one outline
 * round them all (several outlines: drawn first, twice as wide, so that only their outer half shows). Without the gloss: a two-stop gradient. `px` the body's size on the page.
 */
function glossBody(id, ds, pal, w, { turn = 0, about = [256, 256], inner = '', outline = true, px } = {}) {
  const box = boxOf(ds.join(' ')), size = px ?? Math.max(box[2] - box[0], box[3] - box[1]), T = glossTones(pal)
  const defs = lin(`${id}-gradient`, box, pal.base, glossOn() ? T.end : pal.shadow)
  let s = ds.length > 1 ? ds.map((d) => fillD(d, pal.outline, pal.outline, 2 * w)).join('') : ''
  s += ds.map((d) => fillD(d, `url(#${id}-gradient)`)).join('')
  if (glossOn() && size >= 40) {
    const G = gloss({ fills: ds.map(pathPoints) }, { inset: (w * strokeScale()) / 2, turn, about })
    s += ['shade', 'shadow', ...(size >= 90 ? ['lit', 'highlight'] : [])].map((k) => (G[k] ? `<path d="${G[k]}" fill="${T[k]}"/>` : '')).join('')
  }
  s += inner
  if (outline && ds.length === 1) s += fillD(ds[0], 'none', pal.outline, w)
  return { defs, body: s }
}
/** A tube (gut, duct, airway) along a local course, `width` its visible width in local units: flat, an outline round a
 *  fill. Strokes are thinned by setStrokeScale, so the width is given back here (as imF's `tube`). */
function tube(F, pts, width, pal, w, { cap = 'round', fill = pal.base, outline = pal.outline, smoothIt = true } = {}) {
  const d = typeof pts === 'string' ? mapD(F, pts) : smoothIt && pts.length > 2 ? curveD(F, pts) : lineD(F, pts), W = (width * F.px) / strokeScale()
  return strokeD(d, outline, W + 2 * w, cap) + strokeD(d, fill, W, cap)
}
/** A blood or lymph vessel along a local course (tissue.mjs's `vessel`, open ends), `width` its visible width in local units. */
const pipe = (g, F, pts, width, pal, id) => vessel(g, { points: pts.map(F.at), size: (width * F.s) / 0.4 / strokeScale(), thick: 0.4, ends: 'open', pal, id })
/** A dashed ghost of an outline: the former size of something that shrank or was lost. */
const ghostOf = (d, pal, w) => fillD(d, pal.light, pal.outline, w * 0.7, dashed(w * 0.7))

// ---------- the context a drawing gets ----------
/** Everything a kind needs to draw itself in its frame. */
const ctx = (g, F, id, w, pal, turn) => {
  const c = {
    g, F, id, w, pal, turn, big: F.ext >= 60, lw: w * 0.45,
    M: (d) => mapD(F, d), S: (pts) => smooth(F, pts), C: (u, v, r) => circD(F, u, v, r), E: (u, v, rx, ry, rot) => ellD(F, u, v, rx, ry, rot),
    body: (sub, ds, P = pal, o = {}) => glossBody(`${id}-${sub}`, ds, P, o.w ?? w, { turn, about: [F.cx, F.cy], px: o.px ?? F.ext, ...o }),
    tube: (pts, width, P = pal, o = {}) => tube(F, pts, width, P, o.w ?? w * 0.8, o),
    pipe: (pts, width, P, sub) => pipe(g, F, pts, width, P, `${id}-${sub}`),
    line: (d, colour, wd = w * 0.45, extra = '') => strokeD(typeof d === 'string' ? mapD(F, d) : curveD(F, d), colour, wd, 'round', extra),
    fill: (d, fill, stroke = '', wd = 0) => fillD(d, fill, stroke, wd),
    dots: (pts, r) => dotsD(F, pts, r),
  }
  return c
}
/** A wavy patch of fibrosis (collagen) at local u, v, radius r, turned rot: a pale patch with three wavy fibres. */
function fibrosisPatch(c, u, v, r, rot = 0) {
  const R = rad(rot), T = ([a, b]) => [u + a * Math.cos(R) - b * Math.sin(R), v + a * Math.sin(R) + b * Math.cos(R)]
  const patch = [[-1, -0.55], [-0.35, -0.95], [0.55, -0.8], [1, -0.15], [0.75, 0.65], [-0.15, 0.9], [-0.85, 0.45]].map(([a, b]) => T([a * r, b * r * 0.6]))
  const wave = (b, l) => { const pts = []; for (let i = 0; i <= 8; i++) pts.push(T([-l + (2 * l * i) / 8, b + (i % 2 ? -0.13 : 0.13) * r])); return pts }
  return c.fill(c.S(patch), COLLAGEN.light, COLLAGEN.shadow, c.lw * 0.6) + (c.F.ext * r / 100 >= 6 ? [wave(-0.26 * r, r * 0.7), wave(0.06 * r, r * 0.85), wave(0.36 * r, r * 0.6)].map((p) => c.line(p, COLLAGEN.outline, c.lw * 0.8)).join('') : '')
}
/** Packs circles of radius r (local) in a hexagonal grid inside a local polygon, keeping off its edge by `keep`. */
const packed = (poly, r, keep = 0.6, jitter = 0) => {
  const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]), out = []
  const edgeDist = ([x, y]) => Math.min(...poly.map((a, i) => { const b = poly[(i + 1) % poly.length], dx = b[0] - a[0], dy = b[1] - a[1], t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1), 0, 1); return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy) }))
  for (let j = 0, y = Math.min(...ys) + r; y < Math.max(...ys); j++, y += r * 1.73)
    for (let x = Math.min(...xs) + (j % 2 ? r : 0); x < Math.max(...xs); x += 2 * r) {
      const p = [x + jitter * Math.sin(x * 7.1 + y * 3.3) * r, y + jitter * Math.cos(x * 5.3 - y * 2.9) * r]
      if (inside(poly, p) && edgeDist(p) >= r * keep) out.push(p)
    }
  return out
}

// =====================================================================================================================
// Organs. One function, `organ(g, { kind, … })`, draws every organ the icons show, each in its usual view, as SiliCoDraw
// draws it, in its own palette (see the conventions) with the gloss of a closed body. Vessels and ducts that leave an
// organ are drawn with it when the icons show them. Options common to all kinds: `pal` (another palette), `state`
// (see each kind), `ghost` (only the dashed former outline, pale: what was lost), `detail` (false: no inner lines even
// when large). Kinds and their options:
//   'heart'          from the front, with the great vessels; coronary (true: the coronary arteries on its surface),
//                    plaque (true: a plaque narrowing the left anterior descending artery).   Heart, Coronary artery
//   'heart section'  cut open, four chambers, aorta and pulmonary trunk; state 'healthy' | 'hypertrophy' (thick left
//                    ventricle wall) | 'dilated' (globular, thin walls) | 'fibrosis' (collagen patches) | 'fibrillation'
//                    (chaotic wavelets in the atria).   Heart (section), Cardiac fibrosis, LVH, Heart failure, AF
//   'lungs'          both lungs with trachea and main bronchi; airways (true: the bronchial tree inside).
//   'liver'          from the front with the gallbladder below; gallbladder (true), state 'healthy' | 'fatty'.
//   'kidney'         the approved kidney of Transplant; vessels (false: renal artery, vein and ureter at the hilum).
//   'stomach'        with the end of the oesophagus and the duodenum.
//   'pancreas'       head in the curve of the duodenum, duct and islets; duodenum (true).
//   'intestine'      small intestine, looped, with its folds.        'colon'   large intestine with haustra and appendix.
//   'bladder'        with ureters and urethra; urine (0 … 1: how full, drawn inside).
//   'uterus'         with tubes and ovaries.                         'thyroid' butterfly on the trachea; trachea (true).
//   'prostate'       below the bladder round the urethra; state 'healthy' | 'enlarged' (benign hyperplasia, nodules).
//   'pituitary'      the gland on its stalk below the hypothalamus, in the sella; hypothalamus (true).
//   'gallbladder'    with the cystic and common bile ducts; stones (0, 1, 2 …).
//   'lymph node', 'spleen', 'thymus' (state 'healthy' | 'involuted': shrunk and replaced by fat)  as approved.
// Example: organ(g, { kind: 'heart section', x: 0, y: 0, size: 90, state: 'fibrosis' })
// =====================================================================================================================
const HEART_SECTION = [[-34, -26], [-24, -38], [-10, -38], [0, -31], [12, -40], [28, -37], [38, -24], [42, -4], [38, 18], [26, 36], [12, 46], [2, 42], [-14, 32], [-30, 16], [-40, -4]]
const LIVER_TOP = [[-46, -4], [-45, -18], [-36, -30], [-20, -37], [0, -37], [18, -33], [32, -27], [43, -21], [48, -14]]
const LIVER_LOW = [[44, -9], [32, -3], [18, 3], [6, 10], [-6, 19], [-18, 27], [-30, 30], [-40, 24], [-46, 12]]
const LIVER_FACE = [[42, -12], [30, -7], [16, -1], [4, 5], [-8, 13], [-20, 20], [-31, 22], [-40, 16], [-45, 8]]
const KIDNEY_PTS = [[-31, -23], [-21, -21], [-16, -13], [-18, -5], [-21, 1], [-18, 7], [-16, 15], [-21, 23], [-31, 25], [-41, 19], [-46, 8], [-47, -2], [-45, -12], [-39, -20]]
const THYMUS_L = [[-6, -46], [-11, -42], [-14, -34], [-18, -26], [-24, -18], [-30, -8], [-34, 2], [-37, 12], [-38, 22], [-35, 32], [-28, 39], [-18, 43], [-9, 41], [-3, 34], [-0.5, 22], [-0.5, 8], [-1.5, -6], [-3, -20], [-3.5, -32], [-3, -42]]
const THYMUS_R = [[6, -44], [11, -40], [14, -33], [19, -25], [25, -17], [31, -7], [35, 3], [38, 13], [39, 23], [36, 33], [29, 40], [19, 44], [9, 42], [3, 35], [0.5, 22], [0.5, 8], [1.5, -6], [3, -20], [3.5, -32], [3, -41]]
const mirror = (pts) => pts.map(([u, v]) => [-u, v])

const ORGANS = {
  heart: {
    E: 100, off: [-3, 1], pal: HEART,
    draw(c, { coronary = true, plaque = false }) {
      const { pal, F } = c
      let s = c.pipe([[12, -22], [2, -24.5], [-8, -25.5], [-16, -24]], 7, VEIN, 'pulmonary-veins') .body
      s += c.pipe([[-22, -10], [-22, -28], [-22, -44]], 10, VEIN, 'superior-vena-cava').body + c.pipe([[-25, 24], [-26, 31], [-27, 38]], 8, VEIN, 'inferior-vena-cava').body
      const br = [[[-1, -33], [-4, -46]], [[7, -35], [7, -48]], [[14, -33], [18, -46]]].map((p, i) => c.pipe(p, 4.5, ARTERY, `arch-branch${i + 1}`))
      const arch = c.pipe([[-4, -12], [-5, -22], [-1, -30], [8, -32], [17, -31], [23, -25], [24, -16], [24, -6]], 12, ARTERY, 'aorta')
      s += br.map((b) => b.body).join('') + arch.body
      s += c.fill(c.M('M30,-9C35,-18 44,-15 43,-7C42,-1 36,1 32,-1Z'), pal.shadow, pal.outline, c.lw * 1.3)
      const body = [[-22, -17], [-31, -11], [-36, 0], [-35, 12], [-28, 24], [-16, 33], [0, 40], [14, 45], [24, 46], [31, 40], [37, 28], [40, 12], [39, -2], [33, -12], [22, -18], [8, -20], [-8, -19]]
      let inner = c.fill(c.M('M8,-19C10,2 13,26 24,46C31,40 37,28 40,12C40,0 38,-6 33,-12C24,-18 16,-20 8,-19Z'), pal.shadow)
      inner += c.fill(c.M('M-31,-7C-36,-15 -30,-22 -20,-20C-15,-16 -18,-10 -24,-7Z'), pal.light, pal.outline, c.lw)
      if (coronary && c.big) {
        const lad = 'M8,-14C10,4 13,26 23,44M10,6C16,9 22,12 28,17M12,20C17,22 21,25 24,30', rca = 'M-12,-16C-22,-6 -26,10 -22,26M-23,6C-17,9 -12,12 -9,17'
        // With a plaque the arteries are the subject: twice as wide and in the artery's deeper tone, the plaque larger
        // (review of 23 November 2026: Coronary artery could not be told from Heart).
        const k = plaque ? 2 : 1
        inner += c.line(lad + rca, ARTERY.outline, c.w * 0.75 * k) + c.line(lad + rca, plaque ? ARTERY.small : ARTERY.base, c.w * 0.4 * k)
        if (plaque) inner += c.fill(c.E(10.6, 7, 7.4, 5, 80), PLAQUE.base, PLAQUE.outline, c.lw * 0.8)
      }
      const b = c.body('heart', [c.S(body)], pal, { inner })
      const trunk = c.pipe([[4, -15], [7, -23], [14, -27], [24, -28], [31, -26], [38, -21]], 9, VEIN, 'pulmonary-trunk')
      return { defs: [...br, arch, trunk].map((p) => p.defs).join('') + b.defs, body: s + b.body + trunk.body, main: c.S(body), parts: [['heart', pal], ['aorta', ARTERY], ['veins', VEIN], ...(plaque ? [['plaque', PLAQUE]] : [])] }
    },
  },
  'heart section': {
    E: 100, off: [0, 2], pal: HEART,
    draw(c, { state = 'healthy' }) {
      const { pal } = c, dil = state === 'dilated'
      const ao = c.pipe(dil ? [[2, -24], [1, -36], [8, -46], [20, -45], [28, -42], [31, -36], [31, -27]] : [[4, -30], [5, -42], [14, -48], [24, -47], [30, -43], [32, -34]], dil ? 7.5 : 6.5, ARTERY, 'aorta')
      const pt = c.pipe(dil ? [[-6, -24], [-9, -35], [-16, -41], [-28, -41]] : [[-8, -32], [-11, -41], [-18, -45], [-28, -44]], dil ? 6.5 : 5.5, VEIN, 'pulmonary-trunk')
      const H = dil ? [[-36, -18], [-22, -27], [-6, -28], [10, -30], [26, -25], [38, -12], [43, 6], [39, 24], [28, 37], [14, 45], [2, 43], [-14, 36], [-29, 24], [-39, 8], [-41, -6]] : HEART_SECTION
      const ch = dil ? [[[5, -18], [20, -19], [33, -7], [36, 10], [30, 26], [18, 37], [8, 34], [3, 12]], [[-4, -18], [-3, 4], [-4, 26], [-14, 29], [-28, 18], [-34, 2], [-27, -13]]]
        : state === 'hypertrophy' ? [[[-32, -25], [-22, -33], [-7, -30], [-5, -18], [-30, -17]], [[6, -30], [20, -35], [32, -26], [32, -18], [6, -18]], [[-33, -9], [-12, -9], [-11, 6], [-9, 22], [-16, 23], [-26, 12], [-35, 0]], [[13, -6], [20, -6], [22, 6], [19, 17], [15, 20], [13, 8]]]
        : state === 'fibrillation' ? [[[-33, -24], [-23, -34], [-7, -32], [-4, -14], [-31, -14]], [[5, -31], [20, -36], [34, -26], [34, -14], [5, -14]], [[-30, -6], [-7, -6], [-4, 8], [-1, 22], [-10, 23], [-22, 13], [-31, 2]], [[9, -5], [28, -5], [31, 7], [25, 22], [16, 29], [9, 12]]]
        : [[[-32, -25], [-22, -33], [-7, -30], [-5, -18], [-30, -17]], [[6, -30], [20, -35], [32, -26], [32, -18], [6, -18]], [[-32, -9], [-7, -9], [-4, 8], [-1, 24], [-10, 25], [-24, 13], [-34, 0]], [[11, -8], [27, -8], [29, 6], [23, 19], [16, 25], [11, 12]]]
      let inner = ch.map((p) => c.fill(c.S(p), pal.light, pal.outline, c.lw)).join('')
      if (state === 'fibrosis') inner += [[34, 5, 8, 80], [18, 34, 8, -38], [4, 4, 9, 80]].map(([u, v, r, t]) => fibrosisPatch(c, u, v, r, t)).join('')
      if (state === 'fibrillation') {
        const wave = (u, v, l, k = 0) => { const p = []; for (let i = 0; i <= 6; i++) p.push([u + (l * i) / 6, v + ((i + k) % 2 ? -2.4 : 2.4)]); return c.line(p, INK, c.lw * 0.9) }
        inner += wave(-30, -21, 16) + wave(-26, -27.5, 9, 1) + wave(-17, -18, 9) + wave(9, -22, 16) + wave(13, -29, 10, 1) + wave(20, -18, 9)
      }
      const b = c.body('heart', [c.S(H)], pal, { inner })
      return { defs: ao.defs + pt.defs + b.defs, body: ao.body + pt.body + b.body, main: c.S(H), parts: [['heart', pal], ['aorta', ARTERY], ['pulmonary trunk', VEIN], ...(state === 'fibrosis' ? [['fibrosis', COLLAGEN]] : [])] }
    },
  },
  lungs: {
    E: 100, pal: LUNGS,
    draw(c, { airways = true }) {
      const { pal } = c, AIR = CARTILAGE
      const R = [[-18, -39], [-11, -33], [-8, -18], [-9, -3], [-7, 14], [-6, 30], [-8, 38], [-20, 33], [-34, 38], [-46, 42], [-48, 24], [-46, 0], [-40, -20], [-30, -34]]
      const L = [[18, -39], [11, -33], [8, -18], [9, -3], [14, 9], [15, 20], [10, 30], [9, 38], [20, 33], [34, 38], [46, 42], [48, 24], [46, 0], [40, -20], [30, -34]]
      let inner = ''
      if (c.big) {
        inner += c.line('M-9,2C-20,1 -32,4 -42,12M-47,4C-40,16 -34,26 -30,36M47,0C40,13 34,25 29,36', pal.outline, c.lw * 0.8)
        if (airways) inner += c.line('M-14,-3C-19,-10 -22,-17 -24,-26M-21,-15C-26,-16 -31,-15 -35,-18M-14,-3C-18,4 -18,10 -18,18M-18,10C-22,13 -26,16 -27,22M15,-2C20,-10 23,-17 25,-26M22,-14C27,-15 32,-14 36,-17M15,-2C20,6 26,14 32,22M26,14C27,20 26,24 24,28', AIR.small, c.lw * 1.1)
      }
      const b = [R, L].map((p, i) => c.body(`lung${i + 1}`, [c.S(p)], pal, { inner: i ? inner : '' }))
      const s = b[0].body + b[1].body, W1 = (9 * c.F.px) / strokeScale(), W2 = (5.5 * c.F.px) / strokeScale(), tw = c.w * 0.8
      const tr = c.M('M0,-48L0,-18'), bro = c.M('M0,-18C-4,-12 -8,-7 -14,-3M0,-18C5,-12 9,-7 15,-2')
      let air = strokeD(tr, AIR.outline, W1 + 2 * tw, 'butt') + strokeD(bro, AIR.outline, W2 + 2 * tw) + strokeD(tr, AIR.base, W1, 'butt') + strokeD(bro, AIR.base, W2)
      if (c.big) air += c.line('M-4.5,-43L4.5,-43M-4.5,-37L4.5,-37M-4.5,-31L4.5,-31M-4.5,-25L4.5,-25', AIR.small, c.lw * 0.8)
      return { defs: b.map((x) => x.defs).join(''), body: s + air, main: c.S(R) + ' ' + c.S(L), parts: [['lungs', pal], ['airways', AIR]] }
    },
  },
  liver: {
    E: 100, off: [0, 2], pal: LIVER,
    draw(c, { gallbladder = true, state = 'healthy' }) {
      const { pal } = c, body = c.S([...LIVER_TOP, ...LIVER_LOW])
      let s = gallbladder ? c.fill(c.M('M-13,14C-15,26 -11,35 -4,35C3,35 6,27 2,12Z'), GALL.base, GALL.outline, c.lw * 1.3) : ''
      let inner = c.fill(c.S([...LIVER_LOW, [-46, -4], ...[...LIVER_FACE].reverse()]), pal.shadow)
      if (c.big) inner += c.line('M4,-36C2,-22 4,-8 9,7', pal.outline, c.lw)
      if (state === 'fatty') {
        const drops = [[-30, -17, 6], [-16, -23, 4], [-25, 1, 5.5], [-11, -8, 7], [4, -20, 5], [18, -21, 4], [30, -19, 3.4], [-31, 15, 3.8], [-16, 12, 4.5], [2, -3, 4.2], [13, -9, 3.4], [-3, 11, 3], [-39, -4, 2.5], [23, -10, 2.4], [-6, -24, 2.3]]
        inner += c.fill(c.dots(drops), FAT.base, c.F.ext >= 60 ? FAT.outline : '', c.lw * 0.6)
      }
      const b = c.body('liver', [body], pal, { inner })
      return { defs: b.defs, body: s + b.body, main: body, parts: [['liver', pal], ...(gallbladder ? [['gallbladder', GALL]] : []), ...(state === 'fatty' ? [['fat', FAT]] : [])] }
    },
  },
  kidney: {
    // The approved kidney (imF's Transplant): its own 48-unit frame, the hilum to the right.
    E: 48, off: [31, -1], pal: KIDNEY,
    draw(c, { vessels = false }) {
      const { pal, F } = c, w = cellW(F.ext) * 0.8
      let s = ''
      const parts = [['kidney', pal]]
      let defs = ''
      if (vessels) {
        const ur = c.pipe([[-22, 6], [-17, 11], [-15, 18], [-14, 26]], 2.6, URINE, 'ureter'), ar = c.pipe([[-21, -3], [-14, -5], [-8, -8], [-1, -8]], 2.6, ARTERY, 'renal-artery'), vn = c.pipe([[-21, 2], [-14, 2], [-8, 3], [-1, 5]], 3.2, VEIN, 'renal-vein')
        s += ur.body + vn.body + ar.body; defs += ur.defs + vn.defs + ar.defs
        parts.push(['artery', ARTERY], ['vein', VEIN], ['ureter', URINE])
      }
      let inner = ''
      if (F.ext >= 90) {
        inner += c.fill([[[-33, -14], [-39, -7], [-30, -5]], [[-38, 2], [-40, 10], [-31, 6]], [[-34, 14], [-29, 20], [-27, 11]]].map((p) => polyD(F, p)).join(' '), pal.small)
        inner += c.fill(c.S([[-21, 1], [-25, -4], [-29, -5.5], [-32, -2], [-32, 4], [-29, 7.5], [-25, 6.5]]), URINE.light, pal.outline, w * 0.5)
      }
      const b = c.body('kidney', [c.S(KIDNEY_PTS)], pal, { inner, w })
      return { defs: defs + b.defs, body: s + b.body, main: c.S(KIDNEY_PTS), parts }
    },
  },
  stomach: {
    E: 100, pal: GUT,
    draw(c) {
      const { pal } = c
      const P = [[-8, -30], [-6, -38], [2, -44], [14, -45], [28, -40], [38, -28], [42, -12], [40, 4], [33, 18], [22, 29], [8, 36], [-8, 38], [-22, 35], [-32, 29], [-38, 24], [-40, 17], [-34, 13], [-24, 14], [-14, 12], [-5, 6], [1, -4], [0, -16], [-4, -24]]
      const s = c.tube([[-6, -28], [-8, -35], [-10, -40], [-11, -46]], 7.5) + c.tube([[-37, 20], [-43, 21], [-46, 26], [-46, 33], [-46, 45]], 8)
      let inner = c.line('M-34,14L-36,25', pal.outline, c.lw * 1.2)
      if (c.big) inner += c.line('M6,-30C14,-26 16,-18 22,-13C27,-8 29,-1 27,9M-1,-10C7,-6 11,1 17,5C22,9 22,17 15,24M-12,15C-5,19 1,22 4,29', pal.small, c.lw * 0.8)
      const b = c.body('stomach', [c.S(P)], pal, { inner })
      return { defs: b.defs, body: s + b.body, main: c.S(P) }
    },
  },
  pancreas: {
    E: 100, pal: PANCREAS,
    draw(c, { duodenum = true }) {
      const { pal } = c
      const raw = [[-34, -8], [-28, -14], [-18, -15], [-9, -12], [1, -14], [13, -17], [25, -22], [35, -28], [42, -30], [47, -26], [45, -19], [36, -13], [24, -6], [12, -1], [1, 2], [-7, 6], [-10, 15], [-16, 24], [-25, 27], [-32, 22], [-36, 9]]
      const pts = raw.flatMap((p, i) => { const q = raw[(i + 1) % raw.length], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1; return [p, [(p[0] + q[0]) / 2 + (dy / l) * 1.3, (p[1] + q[1]) / 2 - (dx / l) * 1.3]] })
      const s = duodenum ? c.tube([[-12, -24], [-28, -27], [-41, -19], [-45, -2], [-43, 16], [-36, 29], [-22, 34], [-8, 34], [6, 28]], 11, GUT) : ''
      let inner = ''
      if (c.big) inner += c.line('M40,-25C28,-18 16,-10 2,-6C-10,-3 -18,1 -24,7C-29,11 -34,11 -40,10', pal.outline, c.lw) + c.fill(c.dots([[-22, -8], [16, -5], [-23, 18], [33, -21]], 2.6), pal.light, pal.small, c.lw * 0.5)
      const b = c.body('pancreas', [c.S(pts)], pal, { inner })
      return { defs: b.defs, body: s + b.body, main: c.S(pts), parts: [['pancreas', pal], ...(duodenum ? [['duodenum', GUT]] : [])] }
    },
  },
  intestine: {
    E: 100, pal: GUT,
    draw(c) {
      const { pal, F } = c
      const S = catmull([[-46, -33], [-28, -36], [-8, -32], [12, -36], [28, -34], [38, -24], [30, -13], [12, -11], [-8, -8], [-28, -12], [-40, -2], [-32, 9], [-12, 10], [8, 7], [28, 10], [39, 20], [31, 31], [12, 32], [-8, 35], [-28, 32], [-46, 36]], 8)
      let s = c.tube(S, 11.5, pal, { smoothIt: false, cap: 'butt' })
      if (c.big) s += along(S, 7.5).map(({ p, dir }) => { const n = [-dir[1], dir[0]]; return `M${P2(F.P([p[0] + n[0] * 4.2, p[1] + n[1] * 4.2]))} Q${P2(F.P([p[0] + dir[0] * 1.6, p[1] + dir[1] * 1.6]))} ${P2(F.P([p[0] - n[0] * 4.2, p[1] - n[1] * 4.2]))}` }).map((d) => strokeD(d, pal.small, c.lw * 0.7)).join('')
      return { body: s, main: lineD(F, S) }
    },
  },
  colon: {
    E: 100, off: [0, -2], pal: GUT,
    draw(c) {
      const { pal, F, w } = c
      const S = catmull([[-33, 32], [-35, 18], [-35, 0], [-34, -17], [-29, -29], [-17, -33], [-5, -27], [8, -26], [22, -32], [33, -30], [37, -19], [37, -2], [36, 13], [31, 24], [21, 28], [12, 23], [4, 26], [1, 33], [1, 41]], 8)
      const cut = S.slice(0, -12), cs = along(cut, 7.2, 0).map((a) => a.p), d = lineD(F, S), W = (10 * F.px) / strokeScale(), R = 7.4
      let s = c.tube([[-29, 37], [-25, 44], [-18, 46], [-14, 42]], 4)
      s += strokeD(d, pal.outline, W + 2 * w * 0.8, 'butt') + c.fill(cs.map(([u, v]) => circD(F, u, v, R)).join(' '), pal.outline, pal.outline, 2 * w * 0.8)
      s += strokeD(d, pal.base, W, 'butt') + c.fill(cs.map(([u, v]) => circD(F, u, v, R)).join(' '), pal.base)
      if (c.big) s += along(cut, 7.2, 3.6).map(({ p, dir }) => { const n = [-dir[1], dir[0]]; return `M${P2(F.P([p[0] + n[0] * 6.4, p[1] + n[1] * 6.4]))} L${P2(F.P([p[0] + n[0] * 3, p[1] + n[1] * 3]))} M${P2(F.P([p[0] - n[0] * 6.4, p[1] - n[1] * 6.4]))} L${P2(F.P([p[0] - n[0] * 3, p[1] - n[1] * 3]))}` }).map((x) => strokeD(x, pal.small, c.lw * 0.8)).join('')
      return { body: s, main: d }
    },
  },
  bladder: {
    E: 100, pal: BLADDER,
    draw(c, { urine = 0 }) {
      const { pal } = c, top = [[0, -32], [18, -30], [32, -21], [39, -6]], topL = top.slice(1).reverse().map(([u, v]) => [-u, v])
      const outer = [...top, [38, 10], [30, 22], [19, 30], [10, 34], [5, 38], [-5, 38], [-10, 34], [-19, 30], [-30, 22], [-38, 10], ...topL]
      let s = c.tube('M-45,-48C-44,-38 -41,-25 -33,-14M45,-48C44,-38 41,-25 33,-14', 4.5, URINE) + c.tube([[0, 34], [0, 47]], 6.5)
      let inner = ''
      if (urine > 0) inner += urineIn(c, outer, [0, 4], 0.78, urine)
      if (c.big) inner += c.line('M-24,-24C-31,-8 -30,12 -18,28M24,-24C31,-8 30,12 18,28', pal.small, c.lw * 0.6)
      const b = c.body('bladder', [c.S(outer)], pal, { inner })
      return { defs: b.defs, body: s + b.body, main: c.S(outer), parts: [['bladder', pal], ['urine', URINE]] }
    },
  },
  uterus: {
    E: 100, off: [0, -5], pal: UTERUS,
    draw(c, { ovaries = true }) {
      const { pal, w } = c
      let s = ''
      if (ovaries) {
        s += c.line('M-23,1C-20,-1 -18,-4 -16,-7M23,1C20,-1 18,-4 16,-7', pal.outline, c.lw)
        s += [-30, 30].map((u) => c.fill(c.E(u, 4, 8.5, 5.6, u < 0 ? 18 : -18), pal.shadow, pal.outline, w * 0.7) + (c.big ? c.fill(c.dots([[u + (u < 0 ? -2 : 2), 3, 1.8], [u + (u < 0 ? 3 : -3), 5.5, 1.4]]), pal.light) : '')).join('')
      }
      s += c.tube('M-15,-20C-24,-28 -36,-30 -42,-22C-46,-16 -46,-9 -43,-4M15,-20C24,-28 36,-30 42,-22C46,-16 46,-9 43,-4', 4.5)
      s += [-43, 43].map((u) => { const k = Math.sign(u); return c.fill(c.M(`M${u},-6C${u - k},-2 ${u + 3 * k},3 ${u + 6 * k},2C${u + 7 * k},-1 ${u + 5 * k},-5 ${u + 2 * k},-8Z`), pal.base, pal.outline, w * 0.6) }).join('')
      s += c.fill(rectD(c.F, -10, 22, 20, 26, 6), pal.shadow, pal.outline, w) + c.fill(c.M('M-2,24L2,24L5,45L-5,45Z'), pal.small)
      const body = [[0, -26], [11, -26], [18, -21], [20, -11], [17, 0], [11, 10], [8, 18], [8, 26], [0, 28], [-8, 26], [-8, 18], [-11, 10], [-17, 0], [-20, -11], [-18, -21], [-11, -26]]
      const inner = c.big ? c.fill(c.M('M-11,-18C-4,-14 4,-14 11,-18C7,-10 3,-2 1.5,6L1.5,27L-1.5,27L-1.5,6C-3,-2 -7,-10 -11,-18Z'), pal.small, pal.outline, c.lw * 0.7) : ''
      const b = c.body('uterus', [c.S(body)], pal, { inner })
      return { defs: b.defs, body: s + b.body, main: c.S(body) }
    },
  },
  thyroid: {
    E: 100, pal: THYROID,
    draw(c, { trachea = true }) {
      const { pal, F, w } = c, AIR = CARTILAGE
      let s = ''
      if (trachea) {
        s += c.fill(rectD(F, -9, -24, 18, 72, 4), AIR.base, AIR.outline, w * 0.8)
        if (c.big) { let r = ''; for (let v = -12; v <= 44; v += 7) r += `M-9,${v}Q0,${v + 3} 9,${v}`; s += c.line(r, AIR.small, c.lw) }
        s += c.fill(c.M('M-15,-47L-3,-45L0,-39L3,-45L15,-47L14,-30C10,-25 5,-23 0,-23C-5,-23 -10,-25 -14,-30Z'), AIR.base, AIR.outline, w * 0.8)
        if (c.big) s += c.line('M-8,-37L0,-30L8,-37', AIR.small, c.lw)
      }
      const lobe = [[-12, -33], [-22, -24], [-32, -10], [-38, 6], [-36, 20], [-27, 29], [-16, 28], [-10, 20], [-9, 8], [-10, -6], [-11, -20]]
      const inner = c.big ? c.fill(c.dots([[-28, -6], [-22, 6], [-30, 14], [-20, 20], [-17, -10], [28, -6], [22, 6], [30, 14], [20, 20], [17, -10], [-4, 12], [4, 13]], 1.9), pal.small) : ''
      const b = c.body('thyroid', [c.S(lobe), c.S(mirror(lobe)), rectD(F, -12, 6, 24, 13, 5)], pal, { inner })
      return { defs: b.defs, body: s + b.body, main: c.S(lobe) + ' ' + c.S(mirror(lobe)), parts: [['thyroid', pal], ...(trachea ? [['trachea', AIR]] : [])] }
    },
  },
  prostate: {
    E: 100, pal: PROSTATE,
    draw(c, { state = 'healthy', vesicles = true }) {
      const { pal, w } = c, big = state === 'enlarged'
      let s = c.tube([[0, 34], [0, 48]], 5, URINE, { cap: 'butt' })
      const svR = [[10, -4], [18, -10], [28, -16], [38, -18], [44, -13], [42, -6], [34, -3], [22, 1], [14, 2]]
      if (vesicles && !big) s += [svR, mirror(svR)].map((p) => c.fill(c.S(p), pal.shadow, pal.outline, w * 0.7)).join('')
      const B = big ? [[-30, -27], [-26, -40], [-12, -46], [0, -46.5], [12, -46], [26, -40], [30, -27], [24, -14], [10, -8], [-10, -8], [-24, -14]] : [[-26, -12], [-32, -26], [-26, -40], [-12, -46], [0, -47], [12, -46], [26, -40], [32, -26], [26, -12], [14, -6], [6, -4], [-6, -4], [-14, -6]]
      const bl = c.body('bladder', [c.S(B)], BLADDER, { inner: urineIn(c, B, [0, -29], 0.76, 1) })
      s += bl.body
      const P = big ? [[0, -15], [9, -14], [20, -12], [31, -4], [35, 10], [33, 26], [22, 37], [8, 41], [-8, 41], [-22, 37], [-33, 26], [-35, 10], [-31, -4], [-20, -12], [-9, -14]] : [[-22, -6], [-10, -9], [0, -8.5], [10, -9], [22, -6], [27, 4], [24, 18], [14, 30], [4, 35], [-4, 35], [-14, 30], [-24, 18], [-27, 4]]
      let inner = ''
      if (big) inner += (c.big ? [[-17, 9, 10], [17, 9, 10], [-13, 28, 7.5], [13, 28, 7.5]] : [[-17, 9, 10], [17, 9, 10]]).map(([u, v, r]) => c.fill(c.C(u, v, r), pal.shadow, pal.outline, c.lw * 0.8) + (c.big ? c.fill(c.C(u, v, r * 0.5), 'none', pal.small, c.lw * 0.6) : '')).join('')
      else if (c.big) inner += c.fill(c.dots([[-19, -1], [-21, 9], [-17, 19], [-9, 27], [19, -1], [21, 9], [17, 19], [9, 27]], 2.2), pal.light)
      inner += big ? c.fill(c.M('M-3.5,-14C-3.5,-6 -1,4 -1,12C-1,20 -3,30 -3,40L3,40C3,30 1,20 1,12C1,4 3.5,-6 3.5,-14Z'), URINE.base, URINE.outline, c.lw * 0.6) : c.tube([[0, -8], [0, 36]], 3, URINE, { cap: 'butt', w: c.lw * 0.6 })
      const b = c.body('prostate', [c.S(P)], pal, { inner })
      return { defs: bl.defs + b.defs, body: s + b.body, main: c.S(P), parts: [['prostate', pal], ['bladder', BLADDER], ['urine', URINE]] }
    },
  },
  pituitary: {
    E: 100, pal: PITUITARY,
    draw(c, { hypothalamus = true, sella = true }) {
      const { pal, w } = c, NB = BRAIN
      let s = sella ? c.tube('M-34,4C-34,24 -24,40 -6,40C12,40 24,32 25,16C26,8 29,3 34,1', 5.5, IVORY) : ''
      let defs = ''
      const hyp = [[-44, -29], [-42, -40], [-28, -47], [-8, -48], [12, -48], [30, -45], [42, -38], [44, -29], [36, -23.5], [22, -22], [10, -22], [4, -20], [-4, -20], [-12, -22], [-28, -22], [-40, -24.5]]
      const post = c.body('posterior', [c.M('M-4,-24C-3,-14 -1,-2 2,11L10,11C7,-4 5,-14 5,-24Z'), c.E(9, 17, 11, 12), ...(hypothalamus ? [c.S(hyp)] : [])], NB, { px: c.F.ext * 0.5 })
      s += post.body; defs += post.defs
      if (c.big) s += c.line('M-14,-35C-8,-31 -1,-28 0,-21C1,-11 3,-2 6,12M12,-37C8,-32 3,-28 2.5,-21C2.5,-11 4.5,-2 10,15', NB.small, c.lw * 0.7) + c.fill(c.dots([[-14, -35, 3.2], [12, -37, 3.2], [6, 12.5, 1.9], [10.5, 15.5, 1.9], [14, 21, 1.7], [7, 22, 1.7]]), NB.small)
      const ant = [[-26, 12], [-20, 5], [-10, 3], [-2, 6], [1, 12], [0, 20], [1, 27], [-4, 32], [-14, 34], [-23, 31], [-28, 22]]
      const inner = c.big ? c.fill(c.dots([[-18, 12], [-10, 9.5], [-21, 21], [-13, 19], [-5, 15], [-7, 26], [-16, 28]], 1.9), pal.light) : ''
      const b = c.body('anterior', [c.S(ant)], pal, { inner, px: c.F.ext * 0.4 })
      return { defs: defs + b.defs, body: s + b.body, main: c.S(ant), parts: [['pituitary', pal], ['brain', NB]] }
    },
  },
  gallbladder: {
    E: 100, off: [10, 0], pal: GALL,
    draw(c, { stones = 0 }) {
      const { pal } = c
      const s = c.tube('M-6,-46C-4,-38 2,-33 6,-28M22,-46C18,-38 11,-33 6,-28', 3.8, pal) + c.tube('M6,-29L6,-10C6,4 8,24 10,43', 5.2, pal) + c.tube('M-10,-17C-8,-23 -2,-23 0,-18C1.5,-14 4,-11 6,-8', 3.8, pal)
      const B = [[-6, -23.5], [-1, -19.5], [-1, -8], [-3, 6], [-6, 20], [-11, 32], [-19, 40], [-29, 40], [-36, 32], [-38, 20], [-34, 6], [-26, -6], [-16, -16]].map(([u, v]) => [u - 6, v + 4])
      let inner = c.big ? c.line('M-9.5,0C-11,14 -14,28 -19,38', pal.shadow, c.lw * 2) : ''
      const st = [[-28, 30, 3.4], [-19, 35, 2.8], [-30, 21, 2.6], [-21, 25, 2.2]].slice(0, stones)
      if (st.length) inner += c.fill(st.map(([u, v, r], i) => { const q = []; for (let k = 0; k < 6; k++) { const t = (k / 6) * 2 * Math.PI + i, rr = r * (0.82 + 0.18 * Math.sin(3 * t + i)); q.push([u + rr * Math.cos(t), v + rr * Math.sin(t)]) } return c.S(q) }).join(' '), CARIES.base, CARIES.outline, c.lw * 0.6)
      const b = c.body('gallbladder', [c.S(B)], pal, { inner })
      return { defs: b.defs, body: s + b.body, main: c.S(B), parts: [['gallbladder', pal], ...(stones ? [['stones', CARIES]] : [])] }
    },
  },
  'lymph node': {
    // As the approved Lymph node (imF).
    E: 100, off: [-0.5, 0], pal: NODE,
    draw(c) {
      const { g, F, pal } = c, k = F.ext / 470
      const Pt = [[-44, -4], [-40, -22], [-26, -34], [-6, -38], [14, -35], [30, -26], [38, -14], [34, -5], [30, 2], [34, 9], [38, 18], [30, 28], [14, 35], [-6, 38], [-26, 34], [-40, 20]].map(([u, v]) => [u * 0.88 - 3, v * 0.88])
      const ps = [...[[[-34, -41], [-31, -36], [-28, -31], [-26, -27]], [[-48, -5], [-44, -4.5], [-40, -3.5], [-37, -3]], [[-34, 41], [-31, 36], [-28, 31], [-26, 27]]].map((p, i) => c.pipe(p, 6, LYMPH, `afferent-lymphatic${i + 1}`)), c.pipe([[20, 2], [30, 3], [38, 5], [48, 6]], 6, LYMPH, 'efferent-lymphatic'), c.pipe([[20, -3], [30, -7], [38, -10], [48, -13]], 5, ARTERY, 'artery'), c.pipe([[20, 9], [30, 12], [38, 15], [48, 19]], 6, VEIN, 'vein')]
      const node = c.body('capsule', [c.S(Pt)], pal, { w: cellW(0.84 * F.ext) })
      const F2 = [[-30, -11], [-29, 10], [-19, -22], [-18, 22], [-2, -25], [-2, 25], [13, -19], [13, 19]]
      let s = ps.map((p) => p.body).join('') + node.body
      s += c.line('M21,2C10,-2 0,-5 -12,-7M21,2C8,3 -4,5 -14,9M21,2C13,-7 7,-13 -1,-16M21,2C13,10 7,15 -1,18', pal.outline, Math.max(1, 2.31 * k))
      s += c.fill(c.dots(F2, 6), B_GREEN.base, B_GREEN.outline, cellW(0.12 * F.ext) * 0.7) + c.fill(c.dots(F2.map(([u, v]) => [u + 0.8, v + 0.6]), 2.9), B_GREEN.light)
      return { defs: ps.map((p) => p.defs).join('') + node.defs, body: s, main: c.S(Pt), parts: [['node', pal], ['follicles', B_GREEN], ['lymphatics', LYMPH], ['artery', ARTERY], ['vein', VEIN]] }
    },
  },
  spleen: {
    // As the approved Spleen (imF).
    E: 100, off: [-0.6, -0.6], pal: SPLEEN,
    draw(c) {
      const { F, pal } = c, k = F.ext / 470
      const pts = [[-44, -2], [-40, -14], [-30, -21], [-18, -23], [-12, -22], [-9, -18], [-6, -22.5], [4, -24], [14, -22], [19, -20.5], [22, -16.5], [25, -20], [34, -17], [42, -9], [45, 2], [40, 13], [30, 18], [18, 18], [8, 14], [0, 13], [-10, 15], [-22, 19], [-34, 17], [-42, 9]]
      const co = Math.cos(rad(-28)), n = Math.sin(rad(-28)), T = ([u, v]) => [1.08 * (u * co - v * n), 1.08 * (u * n + v * co) - 3]
      const art = c.pipe([[-4, 40], [-4, 32], [-3, 24], [-2.5, 12]].map(T), 6, ARTERY, 'splenic-artery'), vein = c.pipe([[7, 40], [7, 32], [6, 24], [5, 12]].map(T), 7, VEIN, 'splenic-vein')
      const body = c.body('red-pulp', [c.S(pts.map(T))], pal, { w: cellW(0.9 * F.ext) })
      let s = art.body + vein.body + body.body
      s += c.line('M' + [[[-9, -18], [-9, -15], [-9, -13], [-8, -11]], [[22, -16.5], [22, -13.5], [21, -11.5], [20, -9.5]]].map((q) => q.map(T).map((p) => p.join(',')).join('L')).join('M'), pal.outline, Math.max(1, 2.52 * k))
      const W = [[-32, -4], [-22, 6], [-14, -8], [-4, 2], [6, -12], [16, 0], [28, -6], [34, 6], [-30, 9], [6, -1]].map(T)
      s += c.fill(c.dots(W, 3.2), pal.light) + (F.ext >= 60 ? c.fill(c.dots(W, 1.1), ARTERY.small) : '')
      return { defs: art.defs + vein.defs + body.defs, body: s, main: c.S(pts.map(T)), parts: [['spleen', pal], ['artery', ARTERY], ['vein', VEIN]] }
    },
  },
  thymus: {
    // As the approved Thymus (imF); 'involuted': each lobe shrunk to two thirds and the rest of its former outline fat.
    E: 100, off: [-0.5, 0.5], pal: THYMUS,
    draw(c, { state = 'healthy' }) {
      const { F, pal } = c, k = F.ext / 470, inv = state === 'involuted'
      const bumps = [[-22, -19, 4], [-32, -1, 4.5], [-34, 26, 5], [-22, 39, 4.5], [22, -18, 4], [34, 3, 4.5], [35, 28, 5], [22, 40, 4.5]]
      const w = cellW(0.8 * F.ext) * 0.85
      const cen = (p) => [p.reduce((a, q) => a + q[0], 0) / p.length, p.reduce((a, q) => a + q[1], 0) / p.length]
      const shrinkAt = (p, m, o) => p.map(([u, v]) => [o[0] + (u - o[0]) * m, o[1] + (v - o[1]) * m])
      const m = inv ? 0.62 : 1
      let s = '', defs = ''
      ;[THYMUS_L, THYMUS_R].forEach((p, i) => {
        const o = inv ? [cen(p)[0], -40] : [0, 0], q = shrinkAt(p, m, o)
        if (inv) {
          const fatPoly = smoothPoly(p), drops = packed(fatPoly, 4.6, 0.7, 0.12).filter((d) => !inside(smoothPoly(q), d))
          const fb = c.body(`fat${i + 1}`, [c.S(p)], FAT, { w: w * 0.8, inner: c.fill(c.dots(drops, 4.2), FAT.light, FAT.shadow, c.lw * 0.4) })
          s += fb.body; defs += fb.defs
        }
        const lobe = c.body(`lobe${i + 1}`, [c.S(q), ...bumps.filter(([u]) => (i ? u > 0 : u < 0)).map(([u, v, r]) => { const [U, V] = shrinkAt([[u, v]], m, o)[0]; return c.C(U, V, r * m) })], pal, { w })
        s += lobe.body; defs += lobe.defs
        const blob = (u, v, rx, ry, kk) => { const qq = []; for (let j = 0; j < 8; j++) { const t = (j / 8) * 2 * Math.PI + kk, mm = 1 + 0.12 * Math.sin(3 * t + kk); qq.push([u + rx * mm * Math.cos(t), v + ry * mm * Math.sin(t)]) } return c.S(shrinkAt(qq, m, o)) }
        const med = (i ? [[7.5, -28, 2.4, 5.5, 0.9], [16, -9, 5, 6, 1.7], [25, 11, 6, 6.5, 0.4], [20, 31, 5.5, 5, 2.4]] : [[-7.5, -30, 2.4, 5.5, 0.2], [-15, -11, 5, 6, 1.1], [-23, 9, 6, 6.5, 2], [-19, 29, 5.5, 5, 0.7]]).map(([u, v, rx, ry, kk]) => blob(u, v, rx * m, ry * m, kk)).join(' ')
        s += c.fill(med, pal.light)
        if (F.ext >= 60) s += strokeD(mapD(F, (i ? 'M20,-23C15,-20 10,-19 4,-19M33,-1C26,0 19,1 11,3M39,21C32,21 26,22 13,21M1,-4C3,-3 5,-2 7,0M1,26C3,26 6,26 9,24' : 'M-20,-24C-15,-21 -10,-20 -4,-20M-32,-2C-25,-1 -18,0 -10,2M-38,19C-31,19 -25,20 -12,19M-1,-6C-3,-5 -5,-4 -7,-2M-1,24C-3,24 -6,24 -9,22').replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, u, v) => shrinkAt([[+u, +v]], m, o)[0].join(','))), pal.outline, Math.max(1, 2.1 * k))
      })
      return { defs, body: s, main: c.S(THYMUS_L) + ' ' + c.S(THYMUS_R), parts: [['thymus', pal], ...(inv ? [['fat', FAT]] : [])] }
    },
  },
}
/** Urine inside a hollow organ: its outline shrunk by `m` about `o`, filled up to `level` (0 … 1). */
function urineIn(c, outer, o, m, level) {
  const poly = smoothPoly(outer.map(([u, v]) => [o[0] + (u - o[0]) * m, o[1] + (v - o[1]) * m]))
  const ys = poly.map((p) => p[1]), top = Math.min(...ys), bot = Math.max(...ys), cutY = bot - (bot - top) * clamp(level, 0, 1)
  let piece = poly
  if (level < 0.98) { const sp = split(poly, [[-200, cutY], [200, cutY]]); if (sp) piece = sp.sort((a, b) => Math.max(...b.map((p) => p[1])) - Math.max(...a.map((p) => p[1])))[0].filter((p) => p[1] >= cutY - 0.01) }
  return c.fill(polyD(c.F, piece), URINE.base, URINE.outline, c.lw * 0.7)
}
const B_GREEN = soft(hueOf('#cfe8d8')) // the follicles: immune.mjs's B cell green

/** An organ: see ORGANS above. */
export function organ(g, { x, y, size, turn = 0, id, w, pal, kind = 'heart', ghost = false, ...options }) {
  const K = ORGANS[kind]
  if (!K) throw new Error(`organ: no kind '${kind}'`)
  id ??= kind.replace(/ /g, '-')
  const F = frame(g, x, y, size, K.E, K.off), P = pal ?? K.pal
  w ??= organW(F.ext)
  const c = ctx(g, F, id, w, P, turn), r = K.draw(c, options)
  if (ghost) return { defs: '', body: group(id, F, turn, ghostOf(r.main, P, w)), parts: [[kind, P]] }
  return { defs: r.defs ?? '', body: group(id, F, turn, r.body), parts: r.parts ?? [[kind, P]] }
}


// =====================================================================================================================
// The brain from the left side (front to the left), promoted from complexes.mjs: its outline, folds and palette, here
// with the gloss of a closed body (cerebrum, cerebellum and brainstem each a cushion, the lower two a shade deeper).
// Options: region — what is shown lit, in a deeper tone of the brain: 'lobes' (the four lobes in four colours: frontal
//   pink, parietal blue, occipital yellow, temporal green), 'cortex', 'prefrontal', 'cerebellum', 'brainstem' (the part
//   itself deeper), or a deep structure drawn through the side: 'striatum', 'thalamus', 'hypothalamus' (with the
//   pituitary on its stalk), 'amygdala', 'hippocampus'; atrophy (true: the lit structure shrunk inside the dashed outline
//   it had); arteries ('full' | 'reduced': the middle cerebral artery fanning out of the lateral sulcus, thinned and
//   fading in 'reduced'); pale (true: the brain paler, as a context for what is drawn on it).
// Returns also `at(u, v)`, a point of the brain's own frame (90 units wide, middle at 0, 0) in g's units, as complexes.mjs.
// Used by: Brain, Brain regions, Cerebral cortex, Prefrontal cortex, Striatum, Thalamus, Hypothalamus, Amygdala,
//   Cerebellum, Brainstem, Hippocampus, Hippocampal atrophy, Cerebral blood flow decline, Gut–brain axis, GH–IGF-1 axis,
//   Inter-organ communication.
// Example: brain(g, { x: 0, y: 0, size: 90, region: 'hippocampus', atrophy: true })
// =====================================================================================================================
const CEREBRUM = [[-45, -6], [-43, -24], [-31, -38], [-11, -45], [11, -43], [30, -35], [42, -21], [44, -6], [34, 4], [18, 6], [2, 4], [-14, 7], [-30, 7], [-41, 3]]
const CEREBELLUM = [[18, 6], [30, 2], [42, 7], [45, 17], [38, 26], [26, 27], [17, 21]]
export const LOBES = { frontal: BRAIN, parietal: soft(250), occipital: rich(92), temporal: soft(150) }
/** The brain cut into its lobes: { frontal, parietal, occipital, temporal, prefrontal } as local polygons. */
function brainLobes() {
  const cer = smoothPoly(CEREBRUM, 10)
  const pick = (pieces, f) => [...pieces].sort((a, b) => f(cent(a)) - f(cent(b)))
  const [upper, temporal] = pick(split(cer, catmull([[-52, 18], [-36, 1], [-28, -4], [-12, -9], [6, -12], [16, -11], [22, -6], [25, 4], [26, 16]], 8)), ([, v]) => v)
  const [frontal, back] = pick(split(upper, catmull([[10, -58], [7, -40], [4, -26], [1, -14], [-2, 6]], 8)), ([u]) => u)
  const [parietal, occipital] = pick(split(back, catmull([[34, -55], [31, -34], [29, -18], [28, 0], [28, 16]], 8)), ([u]) => u)
  const [prefrontal] = pick(split(frontal, catmull([[-10, -58], [-14, -40], [-19, -25], [-25, -8], [-34, 6], [-42, 18]], 8)), ([u]) => u)
  return { frontal, parietal, occipital, temporal, prefrontal }
}
const cent = (p) => [p.reduce((a, q) => a + q[0], 0) / p.length, p.reduce((a, q) => a + q[1], 0) / p.length]
/** A band of width w0 tapering to w1 along a cubic Bézier (four local points), as a local polygon. */
const taper = (Q, w0, w1, n = 14) => {
  const at = (t) => { const u = 1 - t; return [0, 1].map((k) => u * u * u * Q[0][k] + 3 * u * u * t * Q[1][k] + 3 * u * t * t * Q[2][k] + t * t * t * Q[3][k]) }
  const L = [], R = []
  for (let i = 0; i <= n; i++) {
    const t = i / n, p = at(t), q = at(Math.min(1, t + 0.01)), r = at(Math.max(0, t - 0.01)), dx = q[0] - r[0], dy = q[1] - r[1], l = Math.hypot(dx, dy) || 1, hw = (w0 + (w1 - w0) * t ** 0.8) / 2
    L.push([p[0] - (dy / l) * hw, p[1] + (dx / l) * hw]); R.unshift([p[0] + (dy / l) * hw, p[1] - (dx / l) * hw])
  }
  return [...L, ...R]
}
const deeperPal = (pal) => ({ light: pal.base, base: pal.shadow, shadow: toHex({ l: toLchL(pal.shadow) - 0.06, c: 0.07, h: hueOf(pal.base) }), small: pal.small, outline: pal.outline })
const toLchL = (hex) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b) * 0.2104542553 + Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b) * 0.793617785 - Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b) * 0.0040720468 }
/** The tone of a lit brain region: clearly deeper and fuller than the brain, the same hue, so it reads at 40 px. */
const litPal = (pal) => { const h = hueOf(pal.base), l = toLchL(pal.shadow); return { light: pal.shadow, base: toHex({ l: l - 0.16, c: 0.12, h }), shadow: toHex({ l: l - 0.24, c: 0.12, h }), small: toHex({ l: l - 0.3, c: 0.1, h }), outline: pal.outline } }
export function brain(g, { x, y, size, turn = 0, id = 'brain', w, pal = BRAIN, region, atrophy = false, arteries, pale = false }) {
  const F = frame(g, x, y, size, 90), c = ctx(g, F, id, w ?? organW(F.ext), pale ? { ...pal, base: pal.light, shadow: pal.base, small: pal.shadow } : pal, turn)
  const P = c.pal, W = c.w, fold = W * 0.55, lower = deeperPal(P), lit = litPal(P)
  const parts = [['brain', P]]
  let defs = '', s = ''
  const put = (b) => { defs += b.defs; s += b.body }
  // brainstem and cerebellum behind the cerebrum
  const stemD = c.M('M2,2C4,16 5,28 3,44L16,44C17,32 17,20 21,6Z')
  put(c.body('brainstem', [stemD], region === 'brainstem' ? lit : lower, { px: F.ext * 0.45 }))
  put(c.body('cerebellum', [c.S(CEREBELLUM)], region === 'cerebellum' ? lit : lower, { px: F.ext * 0.35, inner: c.big ? c.line('M23,11C30,9 37,11 41,14M21,17C28,15 35,17 40,20', (region === 'cerebellum' ? lit : lower).small, fold * 0.8) : '' }))
  // the cerebrum, with its lobes or a lit region
  let inner = ''
  const L = region === 'lobes' || region === 'prefrontal' ? brainLobes() : null
  if (region === 'lobes') {
    for (const [k, Q] of Object.entries(LOBES)) inner += c.fill(polyD(F, L[k]), Q === BRAIN ? P.base : Q.base)
    inner += strokeD(['frontal', 'parietal', 'occipital', 'temporal'].map((k) => polyD(F, L[k])).join(' '), P.outline, W * 0.5)
    parts.push(['parietal', LOBES.parietal], ['occipital', LOBES.occipital], ['temporal', LOBES.temporal])
  }
  if (region === 'prefrontal') inner += c.fill(polyD(F, L.prefrontal), lit.base, P.outline, W * 0.5)
  const foldsD = 'M-34,-24C-26,-30 -20,-22 -12,-28C-6,-32 2,-34 8,-26M-30,-8C-22,-14 -16,-6 -6,-12C0,-16 8,-18 16,-10M14,-36C18,-28 26,-26 32,-20M-40,-10C-36,-14 -34,-16 -36,-22'
  if (c.big && region !== 'lobes') inner += c.line(foldsD, region === 'cortex' ? P.outline : P.small, fold)
  // deep structures, seen through the side
  const T = ([u, v]) => [u, 0.75 * v - 12.6]
  const deep = (pts) => c.fill(c.S(pts), lit.base, P.outline, W * 0.55)
  const ghostLine = (pts) => fillD(c.S(pts), P.light, P.outline, W * 0.4, dashed(W * 0.4))
  const ell = (u, v, rx, ry, rot) => { const q = []; for (let i = 0; i < 12; i++) { const t = (i / 12) * 2 * Math.PI; q.push([u + rx * Math.cos(t) * Math.cos(rad(rot)) - ry * Math.sin(t) * Math.sin(rad(rot)), v + rx * Math.cos(t) * Math.sin(rad(rot)) + ry * Math.sin(t) * Math.cos(rad(rot))]) } return q }
  const shrink = (pts, m) => { const o = cent(pts); return pts.map(([u, v]) => [o[0] + (u - o[0]) * m, o[1] + (v - o[1]) * m]) }
  const show = (pts) => (atrophy ? ghostLine(pts) + deep(shrink(pts, 0.62)) : deep(pts))
  if (region === 'striatum') {
    inner += deep(taper([[-22, -10], [-22, -22], [-2, -26], [14, -20]].map(T).map(([u, v], i) => [u, v]), 10, 6)) + deep(taper([[14, -20], [28, -14], [26, 4], [8, 12]].map(T), 6, 2.2))
    inner += deep(ell(-4, -12.6, 10, 6.5, -12))
  }
  if (region === 'thalamus') inner += show(ell(5, -17, 9.5, 6.5, -18))
  if (region === 'amygdala') inner += show(ell(-15, -3.6, 8.6, 6, -25)) // larger since the review of 23 November 2026, as the hypothalamus
  if (region === 'hypothalamus') {
    inner += c.tube([[-6, -7], [-7, -1], [-8.5, 6]], 2.6, lit, { w: W * 0.45 }) + show(ell(-5, -10, 8.6, 6, -10))
  }
  if (region === 'hippocampus') {
    const band = taper([[-28, -12.6], [-12, 2.4], [20, -0.6], [14, -24.6]], 9, 3)
    inner += atrophy ? ghostLine(band) + deep(taper([[-28, -12.6], [-12, 2.4], [20, -0.6], [14, -24.6]], 4.5, 1.6)) : deep(band)
  }
  const cer = c.body('cerebrum', [c.S(CEREBRUM)], region === 'cortex' ? lit : P, { inner })
  put(cer)
  if (region === 'hypothalamus') s += c.fill(c.C(-9, 9, 3.6), PITUITARY.base, PITUITARY.outline, W * 0.5), parts.push(['pituitary', PITUITARY])
  if (arteries) {
    const red = arteries === 'reduced', tw = red ? 0.65 : 1
    const tree = [[[0, 2], [-6, -3.4], [-12, -5], [-18, -5.1]], [[-18, -5], [-26, -8.6], [-32, -15.5], [-38, -19]], [[-18, -5], [-20, -13.8], [-24, -22.5], [-24, -33]], [[-12, -5], [-8, -13.8], [-2, -22.5], [2, -34.6]], [[-6, -3.4], [2, -10.3], [12, -15.5], [22, -22.5]], [[-2, -0.8], [8, -3.4], [20, -6.9], [32, -12]]]
    const ends = [[[-38, -19], [-42, -22.5]], [[-24, -33], [-22, -39.8]], [[2, -34.6], [4, -40.7]], [[22, -22.5], [28, -27.7]], [[32, -12], [40, -15.5]]]
    s += tree.map((p, i) => c.tube(p, (i ? 2.4 : 3.4) * tw, ARTERY, { w: W * 0.45 })).join('')
    s += red ? ends.map((p) => c.line(p, ARTERY.base, W * 0.5, dashed(W * 0.35))).join('') : ends.map((p) => c.tube(p, 1.5, ARTERY, { w: W * 0.4 })).join('')
    parts.push(['arteries', ARTERY])
  }
  const r = rad(turn), s9 = size / 90
  return { defs, body: group(id, F, turn, s), parts, at: (u, v) => [x + s9 * (u * Math.cos(r) - v * Math.sin(r)), y + s9 * (u * Math.sin(r) + v * Math.cos(r))] }
}

// =====================================================================================================================
// The eye. view 'front' (the open eye between its lids: white, iris, pupil with its catch-light, lashes), 'section'
// (the globe cut through: cornea, iris, lens, retina lining the back, optic nerve leaving to the right) or 'fundus'
// (the back of the eye as an ophthalmoscope shows it: retina, optic disc with its vessels, macula).
// state: 'healthy' | 'cataract' (front and section: a clouded lens) | 'presbyopia' (section: a thin stiff lens) |
//   'glaucoma' (section: the optic disc cupped) | 'amd' (fundus: drusen round the macula).
// Used by: Eye, Cataract, Presbyopia, Glaucoma, Macular degeneration, Retina (as the place of the layers).
// Example: eye(g, { x: 0, y: 0, size: 90, view: 'section', state: 'glaucoma' })
// =====================================================================================================================
const CLOUD = greyPal(0.9, 220, 0.01)
export function eye(g, { x, y, size, turn = 0, id = 'eye', w, view = 'front', state = 'healthy' }) {
  const F = frame(g, x, y, size, view === 'fundus' ? 94 : 100, view === 'section' ? [-6, 0] : view === 'front' ? [0, 4] : [0, 0]), c = ctx(g, F, id, w ?? organW(F.ext), SCLERA, turn)
  let s = '', defs = ''
  const parts = []
  if (view === 'front') {
    const al = c.M('M-47,2C-34,-22 -12,-29 6,-27C24,-25 39,-13 47,0C38,15 20,25 0,25C-20,25 -37,16 -47,2Z')
    s += c.fill(al, SCLERA.base) + c.fill(c.M('M-47,2C-34,-22 -12,-29 6,-27C24,-25 39,-13 47,0C36,-8 22,-16 4,-18C-16,-19 -34,-10 -47,2Z'), SCLERA.shadow)
    s += c.fill(c.M('M-46,2C-44,-2 -40,-2 -37,1C-40,5 -44,5 -46,2Z'), GUM.shadow)
    s += c.fill(c.C(0, 0, 19), IRIS.base, IRIS.outline, c.w * 0.6)
    if (c.big) { let r = ''; for (let i = 0; i < 16; i++) { const t = (i / 16) * 2 * Math.PI; r += `M${f(10.5 * Math.cos(t))},${f(10.5 * Math.sin(t))}L${f(16.5 * Math.cos(t))},${f(16.5 * Math.sin(t))}` } s += c.line(r, IRIS.small, c.lw * 0.6) }
    if (state === 'cataract') {
      s += c.fill(c.C(0, 0, 11), INK) + c.fill(c.S([[-10, -3], [-8, -9], [-2, -11], [5, -9.5], [10, -4], [10, 3], [7, 9], [0, 11], [-6, 9.5], [-10, 4]]), CLOUD.base, CLOUD.outline, c.lw * 0.6)
      if (c.big) s += c.line('M-3,-2L-8,-7M2,-3L3.5,-8.5M4,1L8.5,2M1,4L2.5,8.5M-3,3L-8,5', CLOUD.small, c.lw * 0.6)
      parts.push(['cloudy lens', CLOUD])
    } else s += c.fill(c.C(0, 0, 8), INK)
    s += c.fill(c.C(6, -6, 3.4), '#FFFFFF')
    s += c.fill(al, 'none', SCLERA.outline, c.w)
    s += c.line('M-35.6,-12.9L-41,-19.5M-22.4,-22.3L-25,-30.5M-8,-26.7L-8.5,-35M6,-27L7,-35.5M18.8,-23.7L22,-31.5M30.3,-17.7L35.5,-24.5', INK, c.w * 0.7)
    parts.unshift(['eye', SCLERA], ['iris', IRIS])
  }
  if (view === 'section') {
    s += c.tube([[30, 0], [50, 0]], 12, NERVE, { cap: 'butt' })
    s += c.fill(c.M('M-25,-21C-36,-13 -38,-5 -38,0C-38,5 -36,13 -25,21Z'), LENS.light, LENS.outline, c.w * 0.6)
    let inner = c.line('M-8,-28.6C2,-33.5 14,-32.5 24,-24.5C33,-17 36,-6 36,0C36,6 33,17 24,24.5C14,32.5 2,33.5 -8,28.6', FUNDUS.base, c.w * 1.1)
    if (state === 'glaucoma') inner += c.fill(c.M('M25,-13C29,-9 30,-7 40,-6C44,-5 44,5 40,6C30,7 29,9 25,13C30,7 30,-7 25,-13Z'), DISC.light, DISC.outline, c.lw * 0.7)
    if (c.big) inner += c.line('M-16,-11L-15,-26M-16,11L-15,26M-13,-9L-9,-26M-13,9L-9,26', SCLERA.small, c.lw * 0.5)
    inner += c.line('M-24,-20L-23,-11M-24,20L-23,11', IRIS.base, c.w * 0.9)
    const L = state === 'presbyopia' ? [3.3, 12, LENS.shadow] : [5, 12.5, LENS.base]
    inner += state === 'cataract' ? c.fill(c.E(-16, 0, 5, 12.5, 0), CLOUD.base, CLOUD.outline, c.lw * 0.8) + (c.big ? c.line('M-16,-8L-16,8M-19,-4L-13,4M-19,4L-13,-4', CLOUD.small, c.lw * 0.6) : '') : c.fill(c.E(-16, 0, L[0], L[1], 0), L[2], LENS.outline, c.lw * 0.8)
    const b = c.body('globe', [c.C(4, 0, 34)], SCLERA, { inner })
    s += b.body; defs += b.defs
    parts.push(['eye', SCLERA], ['lens', LENS], ['retina', FUNDUS], ['iris', IRIS], ['optic nerve', NERVE])
    if (state === 'cataract') parts.splice(1, 1, ['cloudy lens', CLOUD])
  }
  if (view === 'fundus') {
    let inner = c.fill(c.C(16, 4, 24), FUNDUS.shadow)
    if (c.big) {
      inner += c.line('M-24,-3C-14,-26 12,-34 40,-22M-12,-21C-12,-30 -8,-36 -2,-42M6,-28C14,-22 22,-18 30,-14M-24,3C-14,26 12,34 40,22M-12,21C-12,30 -8,36 -2,42M6,28C14,22 22,18 30,14', FUNDUS.outline, c.w * 0.6)
      inner += c.line('M-26,-4C-32,-14 -36,-22 -40,-26M-26,4C-32,14 -36,22 -40,26M-28,0C-34,0 -40,-2 -45,-3', FUNDUS.outline, c.w * 0.45)
    }
    inner += c.fill(c.C(-24, 0, 9.5), DISC.base, DISC.outline, c.lw * 0.7) + c.fill(c.C(-23, 0, 4), DISC.light)
    inner += c.fill(c.C(14, 2, 9), FUNDUS.small) + c.fill(c.C(14, 2, 2.6), FUNDUS.outline)
    if (state === 'amd') inner += c.fill(c.dots([[4, -8, 2.4], [12, -12, 1.8], [22, -9, 2.6], [27, 0, 2], [25, 10, 2.8], [16, 15, 2.2], [6, 13, 2.6], [1, 4, 1.8], [19, -3, 1.6], [9, 8, 1.5], [31, 8, 1.6], [-1, -3, 1.4]]), DISC.base, DISC.outline, c.lw * 0.5)
    const b = c.body('retina', [c.C(0, 0, 46)], FUNDUS, { inner })
    s += b.body; defs += b.defs
    parts.push(['retina', FUNDUS], ['optic disc', DISC])
  }
  return { defs, body: group(id, F, turn, s), parts }
}

// =====================================================================================================================
// The ear. view 'outer' (the pinna from the side, in the skin of a person), 'inner' (the labyrinth: three semicircular
// canals with their ampullae, the vestibule with its otoliths and the cochlea) or 'cochlea' (the snail alone, with the
// oval and round windows).
// Used by: Ear, Cochlea, Tinnitus, Vestibular system.
// Example: ear(g, { x: 0, y: 0, size: 90, view: 'inner' })
// =====================================================================================================================
export function ear(g, { x, y, size, turn = 0, id = 'ear', w, view = 'outer', pal }) {
  const F = frame(g, x, y, size, 100, view === 'outer' ? [-5, 0] : [0, 0]), P = pal ?? (view === 'outer' ? SKIN : INNER_EAR), c = ctx(g, F, id, w ?? organW(F.ext), P, turn)
  let s = '', defs = ''
  if (view === 'outer') {
    const out = [[-20, -22], [-14, -35], [-2, -44], [13, -45], [26, -38], [33, -24], [33, -8], [27, 8], [19, 19], [14, 30], [11, 40], [2, 46], [-7, 42], [-10, 32], [-12, 23], [-19, 15], [-23, 4], [-21, -6], [-22, -14]]
    let inner = c.fill(c.S([[-12, -6], [-4, -12], [6, -10], [11, -2], [10, 10], [4, 19], [-4, 21], [-10, 15], [-14, 6]]), P.shadow) + c.fill(c.M('M-6,-20C0,-24 6,-26 10,-24C8,-20 4,-18 -2,-17Z'), P.shadow)
    if (c.big) inner += c.line('M-10,-25C-4,-35 8,-39 18,-33C26,-27 27,-12 23,0C19,11 13,17 9,26M2,22C10,14 14,4 13,-8C12,-18 8,-26 0,-30M12,-12C6,-16 -2,-18 -10,-20M-19,-11C-13,-10 -7,-8 -2,-5M-16,-3C-11,-1 -11,9 -15,12M-6,22C-2,19 2,19 5,21', P.small, c.lw * 0.8)
    inner += c.fill(c.E(-7, 4, 4, 5.2, 0), P.small)
    const b = c.body('pinna', [c.S(out)], P, { inner })
    s += b.body; defs += b.defs
  }
  if (view === 'inner') {
    const tubeD = 'M2,2L2,-22C0,-46 -38,-46 -38,-22C-38,-10 -28,-2 -16,0M2,-22C4,-46 42,-44 42,-20C42,-6 34,2 22,2M12,12C24,8 46,10 46,24C46,38 24,38 16,24'
    const sp = []; for (let i = 0; i <= 60; i++) { const t = (i / 60) * Math.PI * 2.4, r = 15 - i * 0.19; sp.push([-26 + Math.cos(t + 1.2) * r, 28 + Math.sin(t + 1.2) * r]) }
    const st = [-26 + Math.cos(1.2) * 15, 28 + Math.sin(1.2) * 15]
    s += c.tube(tubeD, 7) + c.tube([[-6, 16], [-12, 22], [-18, 26], st], 6) + c.tube(sp, 3.5, P, { smoothIt: false })
    s += [[-16, -1, 10], [22, 2, 0], [13, 15, -35]].map(([u, v, r]) => c.fill(c.E(u, v, 7, 5.5, r), P.shadow, P.outline, c.w * 0.7)).join('')
    const vb = c.body('vestibule', [c.E(0, 10, 14, 11, 0)], P, { px: F.ext * 0.3, inner: c.big ? c.fill(c.dots([[-5, 7, 1.6], [-1, 12, 1.8], [4, 8, 1.5], [6, 13, 1.7], [-4, 14, 1.4], [1, 5, 1.3], [8, 6, 1.4]]), CALCIUM.base, CALCIUM.outline, c.lw * 0.4) : '' })
    s += vb.body; defs += vb.defs
  }
  if (view === 'cochlea') {
    const R0 = 37, k = 0.125, P0 = (t) => { const r = R0 * Math.exp(-k * t), a0 = 0.5 - t; return [-1 + r * Math.cos(a0), -4 + r * Math.sin(a0), r] }
    const L = [], R = [], t0 = -1.2, t1 = 13.4
    for (let i = 0; i <= 64; i++) { const t = t0 + ((t1 - t0) * i) / 64, [u, v, r] = P0(t), [u2, v2] = P0(t + 0.02), dx = u2 - u, dy = v2 - v, l = Math.hypot(dx, dy) || 1, hw = 0.17 * r + 0.9; L.push([u - (dy / l) * hw, v + (dx / l) * hw]); R.unshift([u + (dy / l) * hw, v - (dx / l) * hw]) }
    const mid = []; for (let i = 0; i <= 120; i++) { const t = t0 + 1.05 + ((t1 - 0.5 - t0 - 1.05) * i) / 120, [u, v] = P0(t); mid.push([-1 + (u + 1) * 1.07, -4 + (v + 4) * 1.07]) }
    const inner = c.big ? strokeD(lineD(F, mid), P.small, c.lw) : ''
    const b = c.body('cochlea', [c.S([...L, ...R])], P, { inner })
    const [bx, by] = P0(t0 + 0.25), [wx, wy] = P0(t0 + 0.75)
    s += b.body + c.fill(c.E(bx, by, 4.2, 2.8, -60), P.light, P.outline, c.lw) + c.fill(c.C(wx, wy, 2.4), P.light, P.outline, c.lw); defs += b.defs
  }
  return { defs, body: group(id, F, turn, s), parts: [[view === 'outer' ? 'ear' : 'inner ear', P], ...(view === 'inner' ? [['otoliths', CALCIUM]] : [])] }
}

// =====================================================================================================================
// Skin in section: a block of epidermis (with its rete ridges), dermis and hypodermis (fat lobules), the surface at the
// top. Options: depth (the block's height in its 94-unit width, 48), follicles (a list: { x, tilt, hair: 'dark' | 'grey'
// | 'none' | 'thin', gland: true, length } — a hair follicle with its bulb and papilla, sebaceous gland and the hair it
// grows), sweat (a list of x: coiled sweat glands with their ducts to a pore), vessels (true: a capillary loop, artery
// red to vein blue), fibres (true: collagen in the dermis), state 'healthy' | 'aged' (thin flat epidermis, wrinkled
// surface, broken fibres) | 'wound' (a cut through epidermis and dermis filled by a clot) | 'scar' (flat epidermis over
// a collagen scar) | 'thick' (psoriasis: thick epidermis with scales).
// Used by: Skin, Skin & hair follicle, Wound, Scar, Melanoma, Psoriasis, Burn, Acne, Hair loss, Sweat gland, Skin aging,
//   Hair graying.
// Example: skin(g, { x: 0, y: 0, size: 94, follicles: [{ x: -20, tilt: 12 }], sweat: [24] })
// =====================================================================================================================
export function skin(g, { x, y, size, turn = 0, id = 'skin', w, depth = 48, follicles = [], sweat = [], vessels = false, fibres = false, state = 'healthy' }) {
  const F = frame(g, x, y, size, 94, [0, 4 - depth / 2 - 4 + 4]), c = ctx(g, F, id, w ?? organW(F.ext), DERMIS, turn)
  const bot = -4 + depth, dermBot = bot - 14, X0 = -47, X1 = 47
  const xs = []; for (let u = X0; u <= X1 + 0.01; u += 1.5) xs.push(u)
  const aged = state === 'aged', thick = state === 'thick', scar = state === 'scar'
  const top = (u) => (aged ? -4 + 5 * Math.max(0, 1 - Math.min(Math.abs(u + 21), Math.abs(u - 4), Math.abs(u - 27)) / 3.5) ** 1.5 : thick ? -4 - 9 * Math.max(0, 1 - (Math.abs(u) / 30) ** 4) : -4)
  const J = (u) => {
    if (aged) return 1.6 + 0.6 * Math.sin((u * Math.PI) / 8)
    if (thick) { const k = clamp((29 - Math.abs(u)) / 6, 0, 1), n = 6 + 2.2 * Math.sin((u * Math.PI) / 6), p = 1 + 18 * ((1 - Math.cos((u * Math.PI) / 5)) / 2) ** 0.6; return n * (1 - k) + p * k }
    if (scar) { const k = clamp((Math.abs(u) - 15) / 7, 0, 1); return 4 + k * (2 + 2.2 * Math.sin((u * Math.PI) / 6)) }
    return 6 + 2.2 * Math.sin((u * Math.PI) / 6)
  }
  const topPts = xs.map((u) => [u, top(u)]), jun = xs.map((u) => [u, J(u)])
  const block = [...topPts, [X1, bot], [X0, bot]]
  let s = ''
  // hypodermis, dermis, epidermis
  s += c.fill(polyD(F, [[X0, dermBot - 2], [X1, dermBot - 2], [X1, bot], [X0, bot]]), HYPODERMIS.light)
  if (c.big) s += c.fill(c.dots(xs.filter((_, i) => i % 7 === 3).map((u, i) => [u, dermBot + 7 + (i % 2) * 1.5, 5])), 'none', HYPODERMIS.shadow, c.lw * 0.6)
  s += c.fill(c.M(`M${X0},${dermBot}C-32,${dermBot + 2} -18,${dermBot - 2} -2,${dermBot}C14,${dermBot + 2} 30,${dermBot + 2} ${X1},${dermBot - 1}L${X1},${J(X1)}L${X0},${J(X0)}Z`) + ' ' + polyD(F, [...jun, [X1, 12], [X0, 12]]), DERMIS.base)
  if (scar) s += c.fill(c.E(0, 16, 18, 11.5, 0), DERMIS.light, DERMIS.small, c.lw * 0.6) + (c.big ? c.line('M-15,8L15,8M-17,12L17,12M-17.5,16L17.5,16M-17,20L17,20M-15,24L15,24', DERMIS.small, c.lw * 0.7) : '')
  if (fibres || aged) { const C = [[-40, 14], [-28, 20], [-12, 15], [2, 22], [14, 15], [30, 19], [40, 13]]; s += c.line(C.map(([u, v], i) => { const k = i % 2 ? 1 : -1; return aged ? `M${u - 4},${v + k}C${u - 2},${v - 2 * k} ${u + 1},${v + 2 * k} ${u + 3},${v - k}` : `M${u - 7},${v + k}C${u - 3},${v - 3 * k} ${u + 2},${v + 3 * k} ${u + 7},${v - k}` }).join(''), DERMIS.small, c.lw * 0.8) }
  if (vessels) s += c.line('M-11,19C-11,11 -11,4 -9,0C-8,-3 -4,-3 -3,0', ARTERY.base, c.lw * 1.2) + c.line('M-3,0C-1,4 -1,11 -1,19', VEIN.base, c.lw * 1.2)
  // sweat glands
  for (const u0 of sweat) {
    const coil = []; for (let t = 0; t <= 6 * Math.PI; t += 0.2) { const th = t / 3; coil.push([u0 + 7 * Math.cos(t) * Math.cos(th) - 3.4 * Math.sin(t) * Math.sin(th), dermBot - 1 + 7 * Math.cos(t) * Math.sin(th) * 0.6 + 3.4 * Math.sin(t) * Math.cos(th)]) }
    s += c.tube(coil, 2.4, SWEAT, { smoothIt: false, w: c.lw * 0.5 }) + c.tube([[u0, top(u0) + 0.5], [u0 + 1.5, 6], [u0 - 1, 14], [u0 + 1, dermBot - 9]], 1.8, SWEAT, { w: c.lw * 0.5 })
  }
  // the epidermis
  s += c.fill(polyD(F, [...topPts, ...[...jun].reverse()]), EPIDERMIS.base)
  if (c.big) s += strokeD(lineD(F, jun), EPIDERMIS.small, c.lw * 0.7) + strokeD(lineD(F, topPts.map(([u, v]) => [u, v + (thick ? 3 : 2.4)])), EPIDERMIS.shadow, c.lw * 0.6)
  // follicles
  const fol = follicles.map((o, i) => follicle(c, { u: 0, tilt: 0, hair: 'dark', gland: true, length: 24, ...o, x: undefined, at: o.x ?? 0 }, top, dermBot, i))
  s += fol.map((q) => q.under).join('')
  // a wound: a wedge cut through, filled by a clot
  if (state === 'wound') {
    s += c.fill(c.M('M-26,-4L26,-4C23,0 22,4 20,7L-20,7C-22,4 -23,0 -26,-4Z'), DERMIS.shadow)
    s += c.fill(c.M('M-11,-4C-8,-11 8,-11 11,-4L6,3L8,10L3,16L0,25L-4,15L-10,9L-8,3Z'), CLOT.base, CLOT.outline, c.lw)
  }
  if (thick) s += [[-24, -13, -14], [-12, -14.2, 2], [0, -13.8, -3], [12, -14.2, 4], [24, -13, 14], [-18, -16.4, -4], [-6, -17, 3], [6, -17, -2], [18, -16.4, 6]].map(([u, v, r]) => { const R = rad(r), T = ([a, b]) => [u + a * Math.cos(R) - b * Math.sin(R), v + a * Math.sin(R) + b * Math.cos(R)]; return c.fill(polyD(F, [[-7, 1.5], [-5.5, -2.5], [6.5, -2], [7, 1.8]].map(T)), CALCIUM.base, CALCIUM.outline, c.lw * 0.6) }).join('')
  s += fol.map((q) => q.over).join('')
  s += c.fill(polyD(F, block), 'none', DERMIS.outline, c.w)
  const parts = [['epidermis', EPIDERMIS], ['dermis', DERMIS], ['fat', HYPODERMIS], ...(follicles.some((o) => o.gland !== false) ? [['sebaceous gland', SEBUM]] : []), ...(sweat.length ? [['sweat gland', SWEAT]] : []), ...(state === 'wound' ? [['clot', CLOT]] : [])]
  return { defs: '', body: group(id, F, turn, s), parts }
}
/** A hair follicle in a skin block: under the epidermis (sheath, bulb, papilla, gland) and over it (the hair). */
function follicle(c, { at, tilt, hair, gland, length }, top, dermBot) {
  const R = rad(tilt), u0 = at, v0 = top(at), L = dermBot - 2 - v0, dir = [Math.sin(R), Math.cos(R)]
  const P = (t, n = 0) => [u0 + dir[0] * t * L + dir[1] * n, v0 + dir[1] * t * L - dir[0] * n]
  const H = hair === 'grey' ? HAIR.grey : HAIR.dark
  const bulb = P(1)
  let under = c.tube([P(-0.02), P(0.5), P(0.86)], hair === 'thin' ? 4.5 : 6.5, EPIDERMIS, { w: c.lw * 0.8, fill: EPIDERMIS.shadow, outline: EPIDERMIS.outline })
  if (gland) under += c.fill([[0.32, 5], [0.42, 6.5], [0.52, 4.6]].map(([t, n]) => { const [u, v] = P(t, n); return circD(c.F, u, v, 3.4) }).join(' '), SEBUM.base, SEBUM.outline, c.lw * 0.6)
  under += c.fill(c.E(bulb[0], bulb[1], hair === 'thin' ? 3.4 : 5, hair === 'thin' ? 4 : 6, tilt), EPIDERMIS.small, EPIDERMIS.outline, c.lw * 0.8)
  if (hair !== 'none') under += c.fill(c.E(...P(1.04), hair === 'thin' ? 1.4 : 2.2, hair === 'thin' ? 1.8 : 2.8, tilt), DERMIS.shadow)
  let over = ''
  if (hair !== 'none') {
    const tip = [P(0.9), P(0.3), P(0), [u0 + dir[0] * -0.3 * length - 2, v0 - 0.45 * length], [u0 + dir[0] * -0.6 * length + 2, v0 - length]]
    over = c.tube(tip.slice(0, 3), hair === 'thin' ? 1.2 : 2, H, { w: c.lw * 0.5 }) + c.tube(tip.slice(2), hair === 'thin' ? 1.2 : 2.2, H, { w: c.lw * 0.6 })
  }
  return { under, over }
}

// =====================================================================================================================
// A tooth, cut lengthwise (kind 'molar': enamel cap, dentine, pulp in crown and roots) or seen from the front (kind
// 'incisor'), or a dental implant (kind 'implant': a screw in the jaw bone, an abutment and a crown through the gum).
// Options: gum (true: the gum round its neck), bone (true: the jaw bone round its roots), state 'healthy' | 'caries'
// (a brown cavity eating through the enamel into the dentine) | 'filled' (root canal: the pulp replaced by a filling)
// | 'plaque' (a yellow band at the gum line) | 'gingivitis' (red swollen gum).
// Used by: Tooth, Dental caries, Root canal, Dental implant, Braces, Gingivitis.
// Example: tooth(g, { x: 0, y: 0, size: 90, state: 'caries', gum: true })
// =====================================================================================================================
const METAL = greyPal(0.84, 250, 0.01)
export function tooth(g, { x, y, size, turn = 0, id = 'tooth', w, kind = 'molar', state = 'healthy', gum = false, bone = false }) {
  const F = frame(g, x, y, size, 92), c = ctx(g, F, id, w ?? organW(F.ext), ENAMEL, turn)
  const parts = [['tooth', ENAMEL]]
  let s = ''
  const G = state === 'gingivitis' ? { ...GUM, base: GUM.shadow, shadow: GUM.small } : GUM
  const gumD = (lift = 0) => c.M(`M-40,${2 + lift}L-40,${-8 + lift}C-40,${-12 + lift} -30,${-13 + lift} -22,${-12 + lift}C-19,${-11 + lift} -18,${-8 + lift} -18.5,${-4 + lift}L-17,${8 + lift}L-40,${8 + lift}ZM40,${2 + lift}L40,${-8 + lift}C40,${-12 + lift} 30,${-13 + lift} 22,${-12 + lift}C19,${-11 + lift} 18,${-8 + lift} 18.5,${-4 + lift}L17,${8 + lift}L40,${8 + lift}Z`)
  if (bone || kind === 'implant') { s += c.fill(rectD(F, -40, 2, 80, 44, 6), IVORY.base, IVORY.outline, c.w * 0.8); if (c.big) s += c.fill(c.dots([[-30, 12], [-26, 26], [-33, 36], [26, 14], [31, 28], [24, 38], [-20, 41], [19, 41]], 2), IVORY.small); parts.push(['bone', IVORY]) }
  if (kind === 'molar') {
    const T = 'M0,-36C4,-42 10,-45 16,-44C23,-43 26,-36 26,-28C26,-18 22,-10 19,-4C18,8 18,24 15,36C14,40 12,44 9,44C6,44 5,40 5,34C5,22 3,12 0,10C-3,12 -5,22 -5,34C-5,40 -6,44 -9,44C-12,44 -14,40 -15,36C-18,24 -18,8 -19,-4C-22,-10 -26,-18 -26,-28C-26,-36 -23,-43 -16,-44C-10,-45 -4,-42 0,-36Z'
    const E = 'M0,-36C4,-42 10,-45 16,-44C23,-43 26,-36 26,-28C26,-18 22,-10 19,-4C10,-9 -10,-9 -19,-4C-22,-10 -26,-18 -26,-28C-26,-36 -23,-43 -16,-44C-10,-45 -4,-42 0,-36Z'
    const DC = 'M0,-30C4,-35 9,-38 14,-37C19,-36 21,-31 21,-26C21,-18 18,-11 15,-7C8,-10 -8,-10 -15,-7C-18,-11 -21,-18 -21,-26C-21,-31 -19,-36 -14,-37C-9,-38 -4,-35 0,-30Z'
    const Pp = 'M-12,-20C-12,-27 -9,-29 -7,-24C-3,-20 3,-20 7,-24C9,-29 12,-27 12,-20C12,-11 11,-4 10,2C10,16 11,30 10.5,40L9,40C8.5,30 7,16 6.5,6C5,2 -5,2 -6.5,6C-7,16 -8.5,30 -9,40L-10.5,40C-11,30 -10,16 -10,2C-11,-4 -12,-11 -12,-20Z'
    s += c.fill(c.M(T), DENTINE.base) + c.fill(c.M(E), ENAMEL.base) + c.fill(c.M(DC), DENTINE.base)
    if (c.big) s += c.line('M-15,-7C-18,-11 -21,-18 -21,-26C-21,-31 -19,-36 -14,-37C-9,-38 -4,-35 0,-30C4,-35 9,-38 14,-37C19,-36 21,-31 21,-26C21,-18 18,-11 15,-7', DENTINE.small, c.lw * 0.6)
    if (state === 'filled') { s += c.fill(c.M(Pp), METAL.base, METAL.outline, c.lw * 0.7) + c.fill(c.M('M-4,-40.5L4,-40.5L4,-22L-4,-22Z'), METAL.base, METAL.outline, c.lw * 0.7); parts.push(['filling', METAL]) }
    else s += c.fill(c.M(Pp), PULP.light, PULP.outline, c.lw * 0.7)
    if (state === 'caries') { s += c.fill(c.M('M-1,-33C-4,-30 -4,-25 0,-23C4,-21 10,-23 11,-27C12,-31 8,-35 4,-35Z'), CARIES.light) + c.fill(c.M('M-6,-41.5C-8,-36 -6,-29 -1,-27C4,-25 9,-29 9,-34C9,-38 8,-41 7,-43.5C4,-41 2,-38.5 0,-36C-2,-38.5 -3.5,-40.5 -6,-41.5Z'), CARIES.base, CARIES.outline, c.lw * 0.7); parts.push(['caries', CARIES]) }
    parts.push(['dentine', DENTINE], ['pulp', PULP])
    s += c.fill(c.M(T), 'none', ENAMEL.outline, c.w)
    if (state === 'plaque') { s += c.fill(c.M('M-19,-9C-23,-12 -25.5,-17 -26.5,-22C-29.5,-18 -29,-12 -23,-8Z') + ' ' + c.M('M19,-9C23,-12 25.5,-17 26.5,-22C29.5,-18 29,-12 23,-8Z'), TARTAR.base, TARTAR.outline, c.lw * 0.7); parts.push(['plaque', TARTAR]) }
    if (gum || bone) { s += c.fill(gumD(), G.base, G.outline, c.w * 0.8); parts.push(['gum', G]) }
  }
  if (kind === 'incisor') {
    // a lower front tooth from the front: the crown up, its root in the gum
    const T = 'M-15,-40C-17,-28 -15,-14 -11,-2C-9,6 -7,22 -5,36C-4,42 4,42 5,36C7,22 9,6 11,-2C15,-14 17,-28 15,-40C10,-43 -10,-43 -15,-40Z'
    s += c.fill(c.M(T), ENAMEL.base, ENAMEL.outline, c.w)
    if (c.big) s += c.line('M9,-34C10,-24 9,-14 7,-6', ENAMEL.shadow, c.lw * 1.4) + c.line('M-6,-40.5L-6,-37M6,-40.5L6,-37', ENAMEL.shadow, c.lw * 0.8)
    const sw = state === 'gingivitis' ? 3 : 0
    if (state === 'plaque') { s += c.line('M-10,10C-5,14 5,14 10,10', TARTAR.base, c.w * 1.2); parts.push(['plaque', TARTAR]) }
    if (gum) { s += c.fill(c.M(`M-40,46L-40,${10 - sw}C-30,${8 - sw} -20,${4 - sw} -13,${10 - sw}C-8,${15 - sw} -4,${18 - sw} 0,${18 - sw}C4,${18 - sw} 8,${15 - sw} 13,${10 - sw}C20,${4 - sw} 30,${8 - sw} 40,${10 - sw}L40,46Z`), G.base, G.outline, c.w * 0.8); if (sw && c.big) s += c.line('M-9,12C-5,16 5,16 9,12', G.small, c.lw * 1.2); parts.push(['gum', G]) }
  }
  if (kind === 'implant') {
    const Wd = (v) => 9 - (3 * (v + 1)) / 37
    let l = 'M-9,-1', r = ''
    for (let v = 2; v <= 32; v += 5) { l += `L${-Wd(v) - 3.4},${v + 1}L${-Wd(v + 3)},${v + 3.5}`; r = `L${Wd(v + 3)},${v + 3.5}L${Wd(v) + 3.4},${v + 1}` + r }
    s += c.fill(c.M((l + 'L-6,36Q-6,42 0,42Q6,42 6,36' + r + 'L9,-1Z').replace(/(-?\d+\.\d{3,})/g, (m) => (+m).toFixed(2))), METAL.base, METAL.outline, c.w * 0.7)
    s += c.fill(c.M('M-9,-13L9,-13L7.5,-1L-7.5,-1Z'), METAL.light, METAL.outline, c.w * 0.6)
    s += c.fill(gumD(), G.base, G.outline, c.w * 0.8)
    s += c.fill(c.M('M0,-38C4,-43 10,-46 16,-45C22,-44 25,-38 25,-30C25,-22 21,-16 15,-12L-15,-12C-21,-16 -25,-22 -25,-30C-25,-38 -22,-44 -16,-45C-10,-46 -4,-43 0,-38Z'), ENAMEL.base, ENAMEL.outline, c.w)
    parts.push(['implant', METAL], ['gum', G])
  }
  return { defs: '', body: group(id, F, turn, s), parts }
}

// =====================================================================================================================
// Bones. kind 'long' (a long bone from outside, lying along x: shaft and two knobbly ends) or 'section' (the long bone
// cut lengthwise, promoted from the approved Bone marrow: compact bone, spongy ends, red marrow with white blood cells).
// state: 'healthy' | 'fracture' (long: broken across the shaft, the two pieces apart) | 'osteoporotic' (section: thin
// compact bone, sparse trabeculae, the marrow gone pale with fat).
// Used by: Bone, Hip fracture (with the parts of the femur drawn in the icon), Bone marrow (approved), Osteoporosis.
// Example: bone(g, { x: 0, y: 0, size: 100, kind: 'long', turn: -40 })
// =====================================================================================================================
export function bone(g, { x, y, size, turn = 0, id = 'bone', w, kind = 'long', state = 'healthy' }) {
  const F = frame(g, x, y, size, kind === 'long' ? 104 : 98), c = ctx(g, F, id, w ?? organW(F.ext), IVORY, turn)
  let s = '', defs = ''
  const parts = [['bone', IVORY]]
  if (kind === 'long') {
    const H = [[0, -6.5], [14, -7], [25, -9], [31, -13.5], [35, -18.5], [41.5, -20.5], [48, -18], [51.5, -11.5], [50.5, -5], [46.5, 0], [50.5, 5], [51.5, 11.5], [48, 18], [41.5, 20.5], [35, 18.5], [31, 13.5], [25, 9], [14, 7], [0, 6.5]]
    const pts = H.concat(H.slice(1, -1).map(([u, v]) => [-u, -v]))
    const lines = c.big ? c.line('M-31,10.2C-22,4.6 22,4.6 31,10.2', IVORY.shadow, c.w * 0.8) + c.line('M33.5,-16C30.5,-6 30.5,6 33.5,16M-33.5,-16C-30.5,-6 -30.5,6 -33.5,16', IVORY.small, c.lw * 0.6) : ''
    if (state === 'fracture') {
      const [a, b] = split(smoothPoly(pts, 8), [[-3, -30], [1, -8], [-3, -3], [3, 3], [-1, 8], [2, 30]]).sort((p, q) => cent(p)[0] - cent(q)[0])
      const R = rad(-8), mv = ([u, v]) => [3.5 + 2 + (u - 2) * Math.cos(R) - v * Math.sin(R), -2 + (u - 2) * Math.sin(R) + v * Math.cos(R)]
      s += c.fill(polyD(F, a.map(([u, v]) => [u - 2, v])), IVORY.base, IVORY.outline, c.w) + c.fill(polyD(F, b.map(mv)), IVORY.base, IVORY.outline, c.w)
    } else s += c.fill(c.S(pts), IVORY.base, '', 0) + lines + c.fill(c.S(pts), 'none', IVORY.outline, c.w)
  }
  if (kind === 'section') {
    const poro = state === 'osteoporotic'
    const half = [[30, -12], [37, -16], [42, -22], [48, -18], [49, -8], [45, 0], [49, 8], [48, 18], [42, 22], [37, 16], [30, 12]]
    const outer = half.concat([[0, 10.5]], half.map(([u, v]) => [-u, -v]), [[0, -10.5]])
    const ih = poro ? [[28, -8.5], [35, -12.5], [40, -18], [45, -14], [45, -5], [42, 0], [45, 5], [45, 14], [40, 18], [35, 12.5], [28, 8.5]] : [[28, -6.5], [35, -10], [40, -15], [44, -11], [43, -4], [40, 0], [43, 4], [44, 11], [40, 15], [35, 10], [28, 6.5]]
    const inner = ih.concat([[0, poro ? 8.4 : 6]], ih.map(([u, v]) => [-u, -v]), [[0, poro ? -8.4 : -6]])
    const M2 = poro ? { ...MARROW, base: mixHex(MARROW.base, FAT.base, 0.55), shadow: mixHex(MARROW.shadow, FAT.shadow, 0.55) } : MARROW
    defs += lin(`${id}-gradient`, [...F.P([-49, -22]), ...F.P([49, 22])], IVORY.base, IVORY.shadow) + lin(`${id}-marrow-gradient`, [...F.P([-44, -15]), ...F.P([44, 15])], M2.base, M2.shadow)
    s += c.fill(c.S(outer), `url(#${id}-gradient)`, IVORY.outline, c.w) + c.fill(c.S(inner), `url(#${id}-marrow-gradient)`, MARROW.outline, c.w * 0.55)
    if (c.big) s += c.fill(c.dots(poro ? [[-24, 3], [4, -2.5], [20, 3], [-32, -4]] : [[-24, 3], [-6, 3.5], [4, -2.5], [20, 3], [-15, -2.5], [10, 3.2], [26, -2], [-32, -4], [34, 4]], 0.9), MARROW.outline)
    if (poro) s += c.fill(c.dots([[-18, -3, 2.6], [-8, 3, 2.2], [8, -3, 2.4], [17, 3, 2]]), FAT.light, FAT.shadow, c.lw * 0.4)
    const tb = poro ? 'M28,-4L33,-8M35,-2L41,-5M39,4L43,5M30,3L35,9' : 'M28,-4L33,-8L39,-11M33,-8L35,-2L30,3M35,-2L41,-5L43,-9M35,-2L39,4L35,9M39,4L43,5M30,3L35,9L39,13'
    s += c.line(tb + tb.replace(/(-?\d+),(-?\d+)/g, (m, u, v) => `${-u},${-v}`), IVORY.base, c.w * 0.75)
    if (c.F.ext >= 60 && !poro) { const cells = [[-12, 1.5], [14, -1.5], [-21, -2], [3, 2]].map(([u, v], i) => lymphocyte(g, { x: F.at([u, v])[0], y: F.at([u, v])[1], size: (5.2 / 0.94) * F.s, kind: 'plain', pal: T_CELL, id: `${id}-white-blood-cell${i + 1}` })); s += cells.map((q) => q.body).join(''); defs += cells.map((q) => q.defs).join(''); parts.push(...cells[0].parts) }
    parts.push(['red marrow', MARROW], ...(poro ? [['fat', FAT]] : []))
  }
  return { defs, body: group(id, F, turn, s), parts }
}
const mixHex = (a, b, t) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('').toUpperCase()

// =====================================================================================================================
// Vertebrae. view 'side' (a stack of `count` vertebrae, front to the left: bodies with their discs between and the arch
// with its spinous process behind) or 'top' (one vertebra from above: body, arch, transverse and spinous processes, the
// spinal cord in its canal). state 'healthy' | 'wedge' (side: the middle body crushed to a wedge with a crack).
// Used by: Spine, Vertebra, Vertebral compression fracture, Spinal cord (top view as the place of the cord).
// Example: vertebra(g, { x: 0, y: 0, size: 90, view: 'side', count: 3, state: 'wedge' })
// =====================================================================================================================
export function vertebra(g, { x, y, size, turn = 0, id = 'vertebra', w, view = 'side', count = 3, state = 'healthy' }) {
  const H = view === 'side' ? 22 * count : 100
  const F = frame(g, x, y, size, Math.max(H, 74), view === 'side' ? [0, 0] : [0, 3]), c = ctx(g, F, id, w ?? organW(F.ext), IVORY, turn)
  let s = ''
  const parts = [['bone', IVORY]]
  if (view === 'side') {
    const Ys = Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * 22), mid = Math.floor(count / 2)
    const wedge = (i) => state === 'wedge' && i === mid && count >= 3
    Ys.slice(0, -1).forEach((v, i) => { s += c.fill(rectD(F, -35.5, v + 8, 30.5, 6, 2.5), CARTILAGE.base, CARTILAGE.outline, c.lw) })
    Ys.forEach((v, i) => {
      const arch = [[-6, -6], [2, -6.5], [6, -11], [11, -12.5], [14.5, -8.5], [22, -4.5], [31, 0], [35, 4.5], [33, 8.5], [27, 9], [18, 6.5], [13, 6.5], [12, 11.5], [7, 12.5], [5, 3], [-6, 2]].map(([u, q]) => [u, v + q])
      const body = wedge(i) ? c.M(`M-35,${v - 1}C-24,${v - 4} -14,${v - 7} -6,${v - 8}C-4.5,${v - 8} -4,${v - 7} -4.5,${v - 5}L-4.5,${v + 5}C-4,${v + 7} -5,${v + 8} -7,${v + 8}L-34,${v + 8}C-36,${v + 8} -37,${v + 7} -36.5,${v + 5}L-36.5,${v + 1}Z`) : rectD(F, -36.5, v - 8, 32, 16, 3)
      s += c.fill(c.S(arch), IVORY.base, IVORY.outline, c.w * 2) + c.fill(body, IVORY.base, IVORY.outline, c.w * 2) + c.fill(c.S(arch), IVORY.base) + c.fill(body, wedge(i) ? IVORY.small : IVORY.base) // crushed body in a deeper tone (review, 23 November 2026)
      if (c.big) s += c.line(`M-33,${v + 5}L-8,${v + 5}M16,${v + 4}C22,${v + 5} 28,${v + 6.5} 31,${v + 6}`, IVORY.shadow, c.lw * 1.1)
      if (wedge(i)) s += c.line(`M-31,${v + 2}L-25,${v - 1}L-21,${v + 3}L-15,${v - 2}L-10,${v + 1}`, IVORY.outline, c.lw * 1.9)
    })
    parts.push(['disc', CARTILAGE])
  } else {
    const tp = (u0, v0, u1, v1, w0, w1) => { const dx = u1 - u0, dy = v1 - v0, l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l, P = []; for (let i = 0; i <= 4; i++) { const t = i / 4, hw = (w0 + (w1 - w0) * t) / 2; P.push([u0 + dx * t + nx * hw, v0 + dy * t + ny * hw]) } for (let i = 4; i >= 0; i--) { const t = i / 4, hw = (w0 + (w1 - w0) * t) / 2; P.push([u0 + dx * t - nx * hw, v0 + dy * t - ny * hw]) } return c.S(P) }
    const body = c.S([[-30, 8], [-20, 3], [-8, 5], [0, 6], [8, 5], [20, 3], [30, 8], [35, 20], [29, 33], [15, 39], [0, 41], [-15, 39], [-29, 33], [-35, 20]])
    const arch = c.S([[-24, 9], [-26, -6], [-21, -20], [-9, -29], [0, -31], [9, -29], [21, -20], [26, -6], [24, 9], [0, 11]])
    const ds = [tp(16, -13, 45, -25, 13, 8), tp(-16, -13, -45, -25, 13, 8), tp(0, -24, 0, -47, 10, 8), arch, body]
    s += ds.map((d) => c.fill(d, IVORY.outline, IVORY.outline, 2 * c.w)).join('') + ds.map((d) => c.fill(d, IVORY.base)).join('')
    s += c.fill(c.S([[-26, 12], [-18, 8], [0, 10], [18, 8], [26, 12], [30, 21], [25, 30], [13, 35], [0, 36], [-13, 35], [-25, 30], [-30, 21]]), IVORY.shadow, IVORY.small, c.lw * 0.6)
    if (c.big) s += c.fill(c.dots([[-16, 18], [-6, 15], [6, 16], [16, 20], [-20, 26], [-9, 24], [2, 25], [13, 27], [22, 26], [-10, 31], [4, 32], [-2, 19]], 1.6), IVORY.small)
    s += c.fill(c.S([[-14, 0], [-16, -9], [-11, -17], [0, -21], [11, -17], [16, -9], [14, 0], [0, 3]]), IVORY.light, IVORY.outline, c.lw * 1.2)
    s += c.fill(c.E(0, -8, 9.5, 7.5, 0), NERVE.base, NERVE.outline, c.lw * 0.9)
    if (c.big) s += c.fill(c.M('M-6,-12C-3,-12 -1.5,-10 0,-8C1.5,-10 3,-12 6,-12C6,-9 3,-8 1.5,-7.5C3,-6 6,-5 6,-3C3,-3 1.5,-5 0,-7C-1.5,-5 -3,-3 -6,-3C-6,-5 -3,-6 -1.5,-7.5C-3,-8 -6,-9 -6,-12Z'), NERVE.small)
    s += c.fill(c.E(-17, -20, 5, 3.6, 35) + ' ' + c.E(17, -20, 5, 3.6, -35), CARTILAGE.base, CARTILAGE.outline, c.lw * 0.7)
    parts.push(['spinal cord', NERVE], ['cartilage', CARTILAGE])
  }
  return { defs: '', body: group(id, F, turn, s), parts }
}

// =====================================================================================================================
// Joints. kind 'synovial' (two bone ends capped with cartilage in a capsule of synovial fluid, as a diagram) or 'knee'
// (the knee from the side: femur, tibia, patella in its tendon, menisci, cartilage). state 'healthy' | 'arthritis'
// (cartilage worn to patches, the joint space narrowed, bone spurs at the edges).
// Used by: Joint, Knee joint, Osteoarthritis-type icons.
// Example: joint(g, { x: 0, y: 0, size: 96, kind: 'synovial', state: 'arthritis' })
// =====================================================================================================================
export function joint(g, { x, y, size, turn = 0, id = 'joint', w, kind = 'synovial', state = 'healthy' }) {
  const F = frame(g, x, y, size, 100), c = ctx(g, F, id, w ?? organW(F.ext), IVORY, turn), oa = state === 'arthritis'
  let s = ''
  const parts = [['bone', IVORY], ['cartilage', CARTILAGE]]
  if (kind === 'synovial') {
    const d = oa ? 3 : 0
    s += c.fill(c.M('M-12,-30C-28,-25 -34,-12 -34,1C-34,14 -28,26 -10,34L10,34C28,26 34,14 34,1C34,-12 28,-25 12,-30Z'), SYNOVIA.light, SYNOVIA.outline, c.w * 0.7)
    const fc = `M-26,${-11 + d}C-27,${-5 + d} -20,${-2 + d} -12,${-3 + d}C-6,${-4 + d} -4,${-6 + d} 0,${-6 + d}C4,${-6 + d} 6,${-4 + d} 12,${-3 + d}C20,${-2 + d} 27,${-5 + d} 26,${-11 + d}`, tc = `M-26,${15 - d}C-27,${11.5 - d} -24,${10 - d} -18,${10 - d}C-10,${10 - d} -6,${9 - d} -3.5,${6.5 - d}M3.5,${6.5 - d}C6,${9 - d} 10,${10 - d} 18,${10 - d}C24,${10 - d} 27,${11.5 - d} 26,${15 - d}`
    const fem = `M-14,-48L14,-48L14,-30C14,-24 26,-22 27,-14C28,-6 20,${-2 + d} 12,${-3 + d}C6,${-4 + d} 4,${-6 + d} 0,${-6 + d}C-4,${-6 + d} -6,${-4 + d} -12,${-3 + d}C-20,${-2 + d} -28,-6 -27,-14C-26,-22 -14,-24 -14,-30Z`
    const tib = `M-12,48L12,48L12,32C12,25 26,23 27,16C27.5,12 24,${10 - d} 18,${10 - d}C10,${10 - d} 6,${9 - d} 3,${6 - d}L0,${3 - d}L-3,${6 - d}C-6,${9 - d} -10,${10 - d} -18,${10 - d}C-24,${10 - d} -27.5,12 -27,16C-26,23 -12,25 -12,32Z`
    if (oa) s += c.line('M-24,-8C-20,-4 -14,-4 -9,-5M10,-4C16,-3 20,-4 23,-7M-20,12C-14,12 -10,11 -7,8', CARTILAGE.base, c.w * 1.1)
    else s += c.tube(fc + tc, 4.6, CARTILAGE, { w: c.lw })
    s += c.fill(c.M('M33,0.5L21,4.2L33,8Z') + ' ' + c.M('M-33,0.5L-21,4.2L-33,8Z'), CARTILAGE.light, CARTILAGE.outline, c.lw * 0.7)
    s += c.fill(c.M(fem), IVORY.base) + c.fill(c.M(tib), IVORY.base)
    if (c.big) s += c.fill(c.dots([[-19, -12], [-12, -16], [18, -13], [11, -17], [-20, 18], [19, 18], [-9, 17], [9, 16], [-15, -7], [15, -7]], 1.4), IVORY.small)
    s += c.fill(c.M('M-8,-48L8,-48L8,-36C8,-30 5,-27 0,-27C-5,-27 -8,-30 -8,-36Z') + ' ' + c.M('M-7,48L7,48L7,38C7,33 4,31 0,31C-4,31 -7,33 -7,38Z'), MARROW.light, IVORY.small, c.lw * 0.6)
    if (oa) s += c.fill(c.M('M-27,-14L-32,-9L-26,-8Z') + ' ' + c.M('M27,-14L32,-9L26,-8Z') + ' ' + c.M('M-27,16L-32,12L-26,11Z') + ' ' + c.M('M27,16L32,12L26,11Z'), IVORY.base, IVORY.outline, c.lw)
    s += c.fill(c.M(fem), 'none', IVORY.outline, c.w) + c.fill(c.M(tib), 'none', IVORY.outline, c.w)
    parts.push(['synovial fluid', SYNOVIA])
  } else {
    s += c.fill(c.M('M-17,-49C-18,-38 -20,-30 -24,-24L-18,-20C-14,-28 -11,-38 -10,-49Z') + ' ' + c.M('M-31,-2C-30,6 -24,16 -14,26L-10,22C-18,14 -24,6 -25,-2Z'), TENDON.base, TENDON.outline, c.w * 0.7)
    s += c.fill(c.M('M-10,-49C-10,-34 -11,-24 -15,-14C-19,-5 -16,4 -6,6C4,8 16,8 22,2C28,-4 28,-16 20,-22C14,-26 12,-36 12,-49Z'), IVORY.base, IVORY.outline, c.w)
    s += oa ? c.line('M-14,0C-12,4 -8,6 -4,6.5M14,7C18,6 21,3 23,0', CARTILAGE.shadow, c.w * 0.9) : c.line('M-15,-12C-18,-4 -15,4 -6,6C4,8 16,8 22,2C26,-3 27,-10 25,-15', CARTILAGE.shadow, c.w * 0.9)
    s += c.fill(c.M('M-12,12C-2,10 12,10 22,12C26,14 25,20 19,24C13,30 10,38 10,49L-6,49C-6,38 -9,31 -13,27C-17,22 -16,14 -12,12Z'), IVORY.base, IVORY.outline, c.w)
    if (!oa) s += c.line('M-10,12.5C0,11 12,11 21,12.5', CARTILAGE.shadow, c.w * 0.8)
    s += c.fill(c.M('M-15,8C-12,7 -8,8 -6,9.5C-10,10.5 -13,11 -16,11.5Z') + ' ' + c.M('M24,8C21,7 18,8 15,9.5C18,10.5 21,11 25,11.5Z'), CARTILAGE.base, CARTILAGE.outline, c.lw * 0.6)
    s += c.fill(c.M('M17,27C16,22 22,20 25,23C27,26 25,29 23,31C22,38 22,44 22,49L17,49C17,42 18,35 17,27Z'), IVORY.shadow, IVORY.outline, c.w * 0.8)
    s += c.fill(c.E(-24, -12, 7.5, 11.5, -12), IVORY.base, IVORY.outline, c.w)
    if (oa) s += c.fill(c.M('M-16,-2L-21,1L-15,3Z') + ' ' + c.M('M23,12L28,14L22,15Z'), IVORY.base, IVORY.outline, c.lw)
    parts.push(['tendon', TENDON])
  }
  return { defs: '', body: group(id, F, turn, s), parts }
}

// =====================================================================================================================
// Blood vessels. view 'open' (a length of vessel cut open along its axis: two walls with the lumen between, blood cells
// flowing in it), 'section' (cut across: adventitia, media with its smooth muscle, wavy elastic lamina, lumen) or 'tube'
// (the vessel from outside, its near end cut). kind 'artery' | 'vein' (thinner wall, wider lumen) | 'lymphatic' (pale
// yellow, bulging between valves, lymphocytes inside; open view only). state 'healthy' | 'plaque' (a fatty plaque under
// a fibrous cap bulging into the lumen) | 'thrombus' (a clot of fibrin and red cells stuck to the wall) | 'stiff'
// (calcified plates in a thick wall) | 'aneurysm' (tube: the wall ballooning out). cells: red blood cells in the lumen.
// Used by: Blood vessel, Artery, Atherosclerosis, Thrombus, Haemorrhage, Aneurysm, Arterial stiffness, Lymphatic vessel,
//   Coronary artery (plaque), Capillary bed (the tube view, thin).
// Example: bloodVessel(g, { x: 0, y: 0, size: 96, view: 'open', state: 'plaque', cells: 6 })
// =====================================================================================================================
export function bloodVessel(g, { x, y, size, turn = 0, id = 'blood-vessel', w, view = 'open', kind = 'artery', state = 'healthy', cells = 4 }) {
  const lym = kind === 'lymphatic', P = lym ? LYMPH : VESSEL
  const F = frame(g, x, y, size, 100), c = ctx(g, F, id, w ?? organW(F.ext), P, turn)
  let s = '', defs = ''
  const parts = [['vessel', P]]
  const rbc = (pts, r = 5) => { const q = pts.map(([u, v, t], i) => redBloodCell(g, { x: F.at([u, v])[0], y: F.at([u, v])[1], size: r * 2 * F.s, turn: t, view: i % 2 ? 'top' : 'tilted', id: `${id}-red-blood-cell${i + 1}`, flat: true })); defs += q.map((p) => p.defs).join(''); if (q.length) parts.push(['red blood cells', RED]); return q.map((p) => p.body).join('') }
  if (view === 'open' && lym) {
    const r = (u) => 12 + 7 * Math.sin((Math.PI * (u + 48)) / 32) ** 2, T = [], B = []
    for (let u = -48; u <= 48; u += 4) { T.push([u, -r(u)]); B.unshift([u, r(u)]) }
    const valves = [-16, 16].map((u) => c.M(`M${u - 3},-11.5C${u + 1},-10 ${u + 6},-6 ${u + 8},-1.4C${u + 3},-3 ${u - 1},-5.5 ${u - 3},-7.5Z`) + ' ' + c.M(`M${u - 3},11.5C${u + 1},10 ${u + 6},6 ${u + 8},1.4C${u + 3},3 ${u - 1},5.5 ${u - 3},7.5Z`)).join(' ')
    const ly = [[-38, -6], [-28, 7], [-2, -7], [4, 7], [30, -5], [39, 7]].map(([u, v], i) => lymphocyte(g, { x: F.at([u, v])[0], y: F.at([u, v])[1], size: 8.6 * F.s, kind: 'plain', pal: T_CELL, id: `${id}-lymphocyte${i + 1}` }))
    const b = c.body('lymphatic', [c.S([...T, ...B])], P, { inner: c.fill(valves, P.light, P.outline, c.lw * 0.8) + ly.map((q) => q.body).join('') })
    s += b.body; defs += b.defs + ly.map((q) => q.defs).join('')
    parts.push(...ly[0].parts)
  } else if (view === 'open') {
    const wall = kind === 'vein' ? 9 : 14, top = -19 - wall, R2 = kind === 'vein' ? 22 : 19
    s += c.fill(polyD(F, [[-50, -R2], [50, -R2], [50, R2], [-50, R2]]), RED.light)
    if (state === 'plaque') {
      s += c.fill(c.M('M-36,20C-28,19 -22,2 -6,-3C10,-7 20,8 30,20Z'), P.light, P.outline, c.w * 0.8)
      s += c.fill(c.S([[-21, 17], [-16, 8], [-6, 3], [6, 2], [15, 8], [19, 16], [0, 18]]), PLAQUE.base, PLAQUE.outline, c.lw)
      if (c.big) s += c.line('M-12,13L-5,8M-2,14L6,9M8,15L13,11', PLAQUE.light, c.lw * 0.9)
      parts.push(['plaque', PLAQUE])
    }
    if (state === 'thrombus') {
      s += c.fill(c.S([[-25, 21], [-19.5, 10.4], [-11.5, -1.2], [-1.2, -9.2], [10.4, -11.5], [19.5, -5.8], [26.5, 4.6], [31, 16], [32, 21]]), CLOT.base, CLOT.outline, c.w * 0.7)
      if (c.big) s += c.line('M-16,11.5C-7,2.3 7,4.6 20.7,-2.3M-18.4,19.5C-4.6,10.4 11.5,15 28.7,12.6M-4.6,-4.6C0,4.6 2.3,13.8 0,23M11.5,-8C13.8,2.3 17.2,11.5 17.2,23', CLOT.light, c.lw * 0.6)
      parts.push(['clot', CLOT])
    }
    const flow = cells ? [[-38, -8, 10], [-26, 4, -15], [-38, 9, -5], [36, -10, 15], [42, 5, -10], [24, -6, 5], [4, -12, 0], [-10, -9, 20]].slice(0, cells) : []
    s += rbc(state === 'healthy' ? flow.map(([u, v, t]) => [u, v * 0.8 + 2, t]) : flow)
    s += c.fill(rectD(F, -50, top, 100, wall, 0), P.base) + c.fill(rectD(F, -50, R2, 100, wall, 0), P.base)
    if (c.big) s += c.line(`M-50,${top + wall * 0.5}L50,${top + wall * 0.5}M-50,${R2 + wall * 0.5}L50,${R2 + wall * 0.5}`, P.small, c.lw * 0.6)
    s += strokeD(c.M(`M-50,${top}L50,${top}M-50,${-R2}L50,${-R2}M-50,${R2}L50,${R2}M-50,${R2 + wall}L50,${R2 + wall}`), P.outline, c.w * 0.8, 'butt')
  } else if (view === 'section') {
    const vein = kind === 'vein', stiff = state === 'stiff'
    const adv = []; for (let i = 0; i < 20; i++) { const t = (i / 20) * 2 * Math.PI, r = 45 + 0.9 * Math.sin(5 * t) + 0.6 * Math.cos(3 * t); adv.push([r * Math.cos(t) * (vein ? 1.02 : 1), r * Math.sin(t) * (vein ? 0.9 : 1)]) }
    const rm = vein ? 30 : stiff ? 37 : 35, rl = vein ? 25 : stiff ? 12 : 19
    let inner = c.fill(vein ? c.E(0, 0, rm, rm * 0.86, 0) : c.C(0, 0, rm), P.shadow, P.outline, c.lw * 0.8)
    if (c.big && !vein) { let mn = ''; for (let k = 0; k < 18; k++) { const a0 = rad(k * 20), a1 = rad(k * 20 + 9), r = (rm + rl + 6) / 2; const q = (a) => `${f(r * Math.cos(a))},${f(r * Math.sin(a))}`; mn += `M${q(a0)}C${q(a0 + 0.05)} ${q(a1 - 0.05)} ${q(a1)}` } inner += c.line(mn, P.small, c.lw * 0.7) }
    if (!vein) { const wv = []; for (let i = 0; i < 48; i++) { const t = (i / 48) * 2 * Math.PI, r = rl + 3.5 + 1.1 * Math.sin(18 * t); wv.push([r * Math.cos(t), r * Math.sin(t)]) } inner += c.fill(c.S(wv), P.light, P.small, c.lw * 0.8) }
    if (stiff) inner += c.fill([[30, 22], [100, 26], [170, 22], [230, 27], [300, 24]].map(([t, r], i) => { const u = r * Math.cos(rad(t)), v = r * Math.sin(rad(t)), q = []; for (let k = 0; k < 7; k++) { const a = (k / 7) * 2 * Math.PI, rr = (k % 2 ? 3.2 : 4.6) * (1 + 0.15 * Math.sin(i + k)); q.push([u + rr * Math.cos(a), v + rr * Math.sin(a)]) } return c.S(q) }).join(' '), CALCIUM.base, CALCIUM.outline, c.lw * 0.7)
    inner += c.fill(vein ? c.E(0, 0, rl, rl * 0.8, 0) : c.C(0, 0, rl), RED.light, P.outline, c.lw * 0.8)
    if (cells) { const q = [[-6, -6, -20], [7, -4, 30], [0, 8, 0]].slice(0, cells).map(([u, v, t], i) => redBloodCell(g, { x: F.at([u, v])[0], y: F.at([u, v])[1], size: 10 * F.s * (stiff ? 0.7 : 1), turn: t, view: i % 2 ? 'top' : 'tilted', id: `${id}-red-blood-cell${i + 1}`, flat: true })); inner += q.map((p) => p.body).join(''); defs += q.map((p) => p.defs).join(''); parts.push(['red blood cells', RED]) }
    const b = c.body('wall', [c.S(adv)], P, { inner })
    s += b.body; defs += b.defs
    if (stiff) parts.push(['calcification', CALCIUM])
  } else {
    // tube: from outside, the near (left) end cut
    const an = state === 'aneurysm', stiff = state === 'stiff', R = 19
    const bodyD = an ? c.M('M-34,-19L-12,-19C-16,-30 -12,-44 2,-44C16,-44 20,-30 16,-19L38,-19C43,-19 46,-10 46,0C46,10 43,19 38,19L-34,19Z') : c.M('M-34,-19L38,-19C43,-19 46,-10 46,0C46,10 43,19 38,19L-34,19Z')
    let inner = ''
    if (stiff) inner += c.fill([[[-22, -18], [-12, -19], [-10, -10], [-20, -8]], [[0, -6], [10, -8], [13, 2], [2, 4]], [[18, -19], [28, -18], [30, -10], [20, -11]], [[-16, 6], [-6, 5], [-4, 15], [-14, 17]], [[20, 8], [30, 7], [32, 17], [22, 18]]].map((p, i) => { const [cu, cv] = cent(p), q = []; for (let k = 0; k < 7; k++) { const t = (k / 7) * 2 * Math.PI, r = (k % 2 ? 4 : 6) * (1 + 0.12 * Math.sin(i * 3 + k)); q.push([cu + Math.cos(t) * r * 1.15, cv + Math.sin(t) * r * 0.85]) } return c.S(q) }).join(' '), CALCIUM.base, CALCIUM.outline, c.lw * 0.7)
    const b = c.body('vessel', [bodyD], P, { inner, px: F.ext * 0.6 })
    s += b.body; defs += b.defs
    s += c.fill(c.E(-34, 0, 7, R, 0), P.shadow, P.outline, c.w) + c.fill(c.E(-34, 0, stiff ? 3 : 4.4, stiff ? 7 : 12, 0), RED.base, P.outline, c.lw * 0.8)
    if (stiff) parts.push(['calcification', CALCIUM])
  }
  return { defs, body: group(id, F, turn, s), parts }
}

// =====================================================================================================================
// Skeletal muscle. view 'belly' (a muscle from outside, spindle-shaped, its fibres along it, a tendon at each end) or
// 'section' (a limb cut across, as a CT shows it: skin and subcutaneous fat round the muscle, the bone in the middle).
// Options: state 'healthy' | 'atrophied' (belly: thinner; section: less muscle), fat (section: how thick the fat ring
// is, 0.15 … 0.5; sarcopenic obesity is atrophied with fat 0.45).
// Used by: Muscle, Tendon, Sarcopenic obesity, Inter-organ communication (muscle).
// Example: muscle(g, { x: 0, y: 0, size: 96, view: 'section', state: 'atrophied', fat: 0.45 })
// =====================================================================================================================
export function muscle(g, { x, y, size, turn = 0, id = 'muscle', w, view = 'belly', state = 'healthy', fat = 0.2, pal = MUSCLE }) {
  const F = frame(g, x, y, size, 100), c = ctx(g, F, id, w ?? organW(F.ext), pal, turn), at = state === 'atrophied'
  let s = '', defs = ''
  const parts = [['muscle', pal]]
  if (view === 'belly') {
    const k = at ? 0.62 : 1
    const body = [[-38, -3], [-30, -10.5], [-18, -17], [-4, -19.5], [10, -18], [24, -12.5], [34, -5.5], [38.5, 0], [34, 5.5], [24, 12.5], [10, 18], [-4, 19.5], [-18, 17], [-30, 10.5], [-38, 3]].map(([u, v]) => [u, v * k])
    s += c.fill(c.M('M-50,-2.6C-45,-3 -40,-4.5 -32,-6.5L-32,6.5C-40,4.5 -45,3 -50,2.6C-51.5,2.5 -51.5,-2.5 -50,-2.6Z') + ' ' + c.M('M50,-2.6C45,-3 40,-4.5 32,-6.5L32,6.5C40,4.5 45,3 50,2.6C51.5,2.5 51.5,-2.5 50,-2.6Z'), TENDON.base, TENDON.outline, c.w * 0.8)
    const fl = [-0.62, -0.22, 0.2, 0.6].map((q) => `M-36,0C-20,${q * 24 * k} 16,${q * 24 * k} 36.5,0`).join('')
    const b = c.body('belly', [c.S(body)], pal, { inner: c.big ? c.line(fl, pal.small, c.lw * 0.7) : '' })
    s += b.body; defs += b.defs
    parts.push(['tendon', TENDON])
  } else {
    const R = 45, rm = at ? 20 * (1 - fat * 0.3) : R * (1 - fat) - 3
    const limb = [[0, -41], [22, -38], [38, -26], [45, -6], [43, 16], [32, 33], [12, 42], [-12, 41], [-31, 33], [-43, 15], [-45, -6], [-38, -26], [-21, -38]].map(([u, v]) => [u * (R / 45), v * (R / 45)])
    const M = [[0, -23], [10, -22], [17, -15], [22, -6], [24, 4], [19, 13], [12, 20], [2, 22], [-8, 21], [-16, 16], [-22, 8], [-24, -2], [-21, -12], [-12, -20]].map(([u, v]) => [u * (rm / 23), v * (rm / 23)])
    let inner = c.fill(c.S(M), pal.base, pal.outline, c.w * 0.7)
    if (c.big) inner += c.line(`M${0.2 * rm},${-0.17 * rm}C${0.09 * rm},${-0.5 * rm} ${-0.09 * rm},${-0.78 * rm} ${-0.35 * rm},${-0.9 * rm}M${0.08 * rm},${0.26 * rm}C${0.04 * rm},${0.5 * rm} ${-0.09 * rm},${0.78 * rm} ${-0.22 * rm},${0.9 * rm}M${-0.09 * rm},${0.04 * rm}C${-0.43 * rm},0 ${-0.74 * rm},${0.09 * rm} ${-rm},${0.17 * rm}`.replace(/(-?\d+\.\d{3,})/g, (m) => (+m).toFixed(2)), pal.small, c.lw * 0.7)
    inner += c.fill(c.C(0.3 * rm, -0.04 * rm, 8), IVORY.base, IVORY.outline, c.lw) + c.fill(c.C(0.3 * rm, -0.04 * rm, 4.4), MARROW.light, IVORY.small, c.lw * 0.5)
    const b = c.body('fat', [c.S(limb)], FAT, { inner })
    s += b.body; defs += b.defs
    parts.push(['fat', FAT], ['bone', IVORY])
  }
  return { defs, body: group(id, F, turn, s), parts }
}

// =====================================================================================================================
// The marks of a disease state, to lay over an organ or a tissue (see the conventions): kind 'fibrosis' (a pale
// collagen patch with wavy fibres), 'fat' (a cluster of yellow lipid droplets), 'calcification' (ivory-white chips),
// 'crack' (a jagged crack in an outline tone, `colour`), 'nodule' (a rounded lump in a deeper tone of `pal`), 'clot'
// (a dark red clot with fibrin). `size` is the mark's extent; seed varies the cluster.
// Used by: Cardiac fibrosis, Fatty liver, Aortic valve calcification, Arterial stiffness, Hip fracture, Vertebral
//   compression fracture, Benign prostatic hyperplasia, Thrombus, Liver fibrosis and the like.
// Example: lesion(g, { x: 10, y: 4, size: 20, kind: 'fibrosis', turn: 30 })
// =====================================================================================================================
export function lesion(g, { x, y, size, turn = 0, id = 'lesion', w, kind = 'fibrosis', pal = HEART, colour, seed = 1 }) {
  const F = frame(g, x, y, size, 20), c = ctx(g, F, id, w ?? clamp(F.ext / 14, 1.2, 4), pal, turn)
  const rnd = (i) => { const v = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453; return v - Math.floor(v) }
  let s = ''
  const parts = []
  if (kind === 'fibrosis') { s += fibrosisPatch({ ...c, lw: c.w }, 0, 0, 10, 0); parts.push(['fibrosis', COLLAGEN]) }
  if (kind === 'fat') { const d = [[0, 0, 4.2], [-5.5, -3.5, 2.8], [5, -4, 3], [-5, 4.5, 3.2], [5.5, 4, 2.6], [0, -7, 2], [-8.5, 0.5, 1.6], [8.5, 0, 1.8], [1, 7.5, 2]].map(([u, v, r], i) => [u + (rnd(i) - 0.5), v + (rnd(i + 9) - 0.5), r]); s += c.fill(c.dots(d), FAT.base, FAT.outline, c.w * 0.5); parts.push(['fat', FAT]) }
  if (kind === 'calcification') { s += c.fill([[-4, -3, 3.4], [4, -4, 2.8], [1, 4, 3.6], [-6, 5, 2.2], [7, 3, 2]].map(([u, v, r], i) => { const q = []; for (let k = 0; k < 6; k++) { const a = (k / 6) * 2 * Math.PI + rnd(i + k), rr = r * (0.75 + rnd(i * 7 + k) * 0.45); q.push([u + rr * Math.cos(a), v + rr * Math.sin(a)]) } return c.S(q) }).join(' '), CALCIUM.base, CALCIUM.outline, c.w * 0.6); parts.push(['calcification', CALCIUM]) }
  if (kind === 'crack') s += c.line('M-10,-3L-5,-6L-1,-1L4,-5L10,-1', colour ?? pal.outline, c.w * 1.2)
  if (kind === 'nodule') s += c.fill(c.S([[-9, 0], [-7, -6], [0, -9], [7, -7], [9, 0], [6, 7], [0, 9], [-7, 6]]), pal.shadow, pal.outline, c.w) + (c.F.ext >= 30 ? c.fill(c.C(0, 0, 4.5), 'none', pal.small, c.w * 0.6) : '')
  if (kind === 'clot') { s += c.fill(c.S([[-9, 3], [-6, -4], [0, -8], [7, -6], [10, 1], [6, 7], [-2, 8]]), CLOT.base, CLOT.outline, c.w * 0.7) + c.line('M-6,0C-2,-3 3,-2 7,-4M-5,4C0,2 4,4 8,2', CLOT.light, c.w * 0.5); parts.push(['clot', CLOT]) }
  return { defs: '', body: group(id, F, turn, s), parts }
}

// =====================================================================================================================
// A flame (promoted from imE.mjs's Inflammaging and imF.mjs's Inflammation): an orange-red flame with a pale core, an
// object of a picture (no gloss). Used by: Burn, Inflammation-type icons.
// Example: flame(g, { x: 0, y: 0, size: 46 })
// =====================================================================================================================
export function flame(g, { x, y, size, turn = 0, id = 'flame', w }) {
  const F = frame(g, x, y, size, 92)
  w ??= objW(F.ext)
  const fl = mapD(F, 'M0,46C-22,46 -36,32 -36,14C-36,-4 -24,-14 -20,-28C-14,-20 -12,-14 -12,-8C-6,-20 -2,-34 6,-46C10,-32 22,-24 28,-12C30,-16 30,-20 30,-24C36,-14 38,-2 36,12C34,32 20,46 0,46Z')
  const core = mapD(F, 'M0,42C-14,42 -22,32 -22,20C-22,10 -16,2 -12,-6C-10,0 -8,4 -6,6C-4,-2 0,-10 4,-16C8,-6 16,0 18,10C20,0 20,-2 20,-4C24,4 24,12 22,22C20,34 12,42 0,42Z')
  const defs = lin(`${id}-gradient`, [...F.P([-36, -46]), ...F.P([36, 46])], FLAME.base, FLAME.shadow) + lin(`${id}-core-gradient`, [...F.P([-22, -16]), ...F.P([24, 42])], '#FFFFFF', FLAME.light)
  return { defs, body: group(id, F, turn, fillD(fl, `url(#${id}-gradient)`, FLAME.outline, w) + fillD(core, `url(#${id}-core-gradient)`)), parts: [['flame', FLAME]] }
}
// =====================================================================================================================
// The parts sheet: every part, kind and state alone.
// =====================================================================================================================
const O = (name, kind, o = {}, size = 100) => ({ name, size, draw: (g) => organ(g, { x: 0, y: 0, size: 96, kind, ...o }) })
export const DEMOS = [
  ...[undefined, 'lobes', 'cortex', 'prefrontal', 'striatum', 'thalamus', 'hypothalamus', 'amygdala', 'hippocampus', 'cerebellum', 'brainstem'].map((region) => ({ name: region ? `Brain, ${region}` : 'Brain', size: 100, draw: (g) => brain(g, { x: 0, y: 0, size: 96, region }) })),
  { name: 'Brain, hippocampus shrunk', size: 100, draw: (g) => brain(g, { x: 0, y: 0, size: 96, region: 'hippocampus', atrophy: true, pale: true }) },
  { name: 'Brain with arteries', size: 100, draw: (g) => brain(g, { x: 0, y: 0, size: 96, arteries: 'full' }) },
  { name: 'Brain with reduced blood flow', size: 100, draw: (g) => brain(g, { x: 0, y: 0, size: 96, arteries: 'reduced' }) },
  O('Heart', 'heart'), O('Heart with coronary plaque', 'heart', { plaque: true }), O('Heart in section', 'heart section'),
  O('Heart with thick left ventricle', 'heart section', { state: 'hypertrophy' }), O('Dilated heart', 'heart section', { state: 'dilated' }),
  O('Heart with fibrosis', 'heart section', { state: 'fibrosis' }), O('Heart in atrial fibrillation', 'heart section', { state: 'fibrillation' }),
  O('Lungs', 'lungs'), O('Liver', 'liver'), O('Fatty liver', 'liver', { state: 'fatty' }), O('Kidney', 'kidney'), O('Kidney with vessels', 'kidney', { vessels: true }),
  O('Stomach', 'stomach'), O('Pancreas', 'pancreas'), O('Small intestine', 'intestine'), O('Colon', 'colon'), O('Bladder', 'bladder', { urine: 0.6 }),
  O('Uterus', 'uterus'), O('Thyroid', 'thyroid'), O('Prostate', 'prostate'), O('Enlarged prostate', 'prostate', { state: 'enlarged' }), O('Pituitary', 'pituitary'),
  O('Gallbladder with stones', 'gallbladder', { stones: 3 }), O('Lymph node', 'lymph node'), O('Spleen', 'spleen'), O('Thymus', 'thymus'), O('Involuted thymus', 'thymus', { state: 'involuted' }),
  ...['front', 'section', 'fundus'].map((view) => ({ name: `Eye, ${view}`, size: 100, draw: (g) => eye(g, { x: 0, y: 0, size: 96, view }) })),
  { name: 'Eye with cataract', size: 100, draw: (g) => eye(g, { x: 0, y: 0, size: 96, state: 'cataract' }) },
  ...['cataract', 'presbyopia', 'glaucoma'].map((state) => ({ name: `Eye in section, ${state}`, size: 100, draw: (g) => eye(g, { x: 0, y: 0, size: 96, view: 'section', state }) })),
  { name: 'Fundus with drusen', size: 100, draw: (g) => eye(g, { x: 0, y: 0, size: 96, view: 'fundus', state: 'amd' }) },
  ...['outer', 'inner', 'cochlea'].map((view) => ({ name: `Ear, ${view}`, size: 100, draw: (g) => ear(g, { x: 0, y: 0, size: 96, view }) })),
  { name: 'Skin', size: 100, draw: (g) => skin(g, { x: 0, y: 0, size: 96, vessels: true, follicles: [{ x: -26, tilt: 12 }, { x: 30, tilt: 8, gland: false }], sweat: [10] }) },
  { name: 'Skin with hair follicle', size: 100, draw: (g) => skin(g, { x: 0, y: 0, size: 96, depth: 62, follicles: [{ x: -4, tilt: 14, length: 30 }], fibres: true }) },
  ...['aged', 'wound', 'scar', 'thick'].map((state) => ({ name: `Skin, ${state}`, size: 100, draw: (g) => skin(g, { x: 0, y: 0, size: 96, state, follicles: state === 'aged' ? [{ x: 30, tilt: 10, hair: 'grey' }] : [] }) })),
  { name: 'Skin with thinning hair', size: 100, draw: (g) => skin(g, { x: 0, y: 0, size: 96, follicles: [{ x: -30, tilt: 6 }, { x: -2, tilt: 6, hair: 'thin', gland: false }, { x: 26, tilt: 6, hair: 'none', gland: false }] }) },
  ...['healthy', 'caries', 'filled', 'plaque'].map((state) => ({ name: `Tooth, ${state}`, size: 100, draw: (g) => tooth(g, { x: 0, y: 0, size: 96, state, gum: state !== 'healthy', bone: state === 'filled' }) })),
  { name: 'Incisor with gingivitis', size: 100, draw: (g) => tooth(g, { x: 0, y: 0, size: 96, kind: 'incisor', gum: true, state: 'gingivitis' }) },
  { name: 'Dental implant', size: 100, draw: (g) => tooth(g, { x: 0, y: 0, size: 96, kind: 'implant' }) },
  { name: 'Long bone', size: 100, draw: (g) => bone(g, { x: 0, y: 0, size: 96, turn: -40 }) },
  { name: 'Broken bone', size: 100, draw: (g) => bone(g, { x: 0, y: 0, size: 96, turn: -40, state: 'fracture' }) },
  { name: 'Bone in section', size: 100, draw: (g) => bone(g, { x: 0, y: 0, size: 96, kind: 'section', turn: -22 }) },
  { name: 'Osteoporotic bone in section', size: 100, draw: (g) => bone(g, { x: 0, y: 0, size: 96, kind: 'section', turn: -22, state: 'osteoporotic' }) },
  { name: 'Vertebrae from the side', size: 100, draw: (g) => vertebra(g, { x: 0, y: 0, size: 90, count: 4 }) },
  { name: 'Wedge fracture of a vertebra', size: 100, draw: (g) => vertebra(g, { x: 0, y: 0, size: 90, count: 3, state: 'wedge' }) },
  { name: 'Vertebra from above', size: 100, draw: (g) => vertebra(g, { x: 0, y: 0, size: 96, view: 'top' }) },
  { name: 'Joint', size: 100, draw: (g) => joint(g, { x: 0, y: 0, size: 96 }) }, { name: 'Joint with arthritis', size: 100, draw: (g) => joint(g, { x: 0, y: 0, size: 96, state: 'arthritis' }) },
  { name: 'Knee', size: 100, draw: (g) => joint(g, { x: 0, y: 0, size: 96, kind: 'knee' }) }, { name: 'Knee with arthritis', size: 100, draw: (g) => joint(g, { x: 0, y: 0, size: 96, kind: 'knee', state: 'arthritis' }) },
  ...['healthy', 'plaque', 'thrombus'].map((state) => ({ name: `Artery opened, ${state}`, size: 100, draw: (g) => bloodVessel(g, { x: 0, y: 0, size: 96, state, cells: 6 }) })),
  { name: 'Lymphatic vessel', size: 100, draw: (g) => bloodVessel(g, { x: 0, y: 0, size: 96, kind: 'lymphatic' }) },
  { name: 'Artery in section', size: 100, draw: (g) => bloodVessel(g, { x: 0, y: 0, size: 96, view: 'section', cells: 3 }) },
  { name: 'Vein in section', size: 100, draw: (g) => bloodVessel(g, { x: 0, y: 0, size: 96, view: 'section', kind: 'vein', cells: 3 }) },
  { name: 'Stiff artery in section', size: 100, draw: (g) => bloodVessel(g, { x: 0, y: 0, size: 96, view: 'section', state: 'stiff', cells: 2 }) },
  ...['healthy', 'stiff', 'aneurysm'].map((state) => ({ name: `Artery from outside, ${state}`, size: 100, draw: (g) => bloodVessel(g, { x: 0, y: 0, size: 96, view: 'tube', state }) })),
  { name: 'Muscle', size: 100, draw: (g) => muscle(g, { x: 0, y: 0, size: 96, turn: -25 }) }, { name: 'Wasted muscle', size: 100, draw: (g) => muscle(g, { x: 0, y: 0, size: 96, turn: -25, state: 'atrophied' }) },
  { name: 'Thigh in section', size: 100, draw: (g) => muscle(g, { x: 0, y: 0, size: 96, view: 'section' }) }, { name: 'Thigh in section, sarcopenic obesity', size: 100, draw: (g) => muscle(g, { x: 0, y: 0, size: 96, view: 'section', state: 'atrophied', fat: 0.45 }) },
  ...['fibrosis', 'fat', 'calcification', 'crack', 'nodule', 'clot'].map((kind) => ({ name: `Lesion, ${kind}`, size: 30, draw: (g) => lesion(g, { x: 0, y: 0, size: 26, kind }) })),
  { name: 'Flame', size: 100, draw: (g) => flame(g, { x: 0, y: 0, size: 92 }) },
  { name: 'Liver regrowing', size: 100, draw: (g) => join(organ(g, { x: 0, y: 0, size: 96, kind: 'liver', ghost: true, id: 'former-liver' }), organ(g, { x: -12, y: 0, size: 60, kind: 'liver', gallbladder: false })) },
]
