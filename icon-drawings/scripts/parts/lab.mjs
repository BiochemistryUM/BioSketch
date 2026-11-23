// Shared parts of the redrawn icons, group "lab": the objects of the "Lab & equipment" category. Tubes and vials,
// glassware, petri dishes, well plates and boxes, pipettes and tips, syringes, instrument casings with screens,
// microscopes, hazard signs, a lab mouse and a light beam. Each part is a function
// `part(g, { x, y, size, turn, id, w, pal, ...options })` that returns { defs, body, parts }, drawn in the frame `g` of
// `page()` (../cellkit.mjs). `size` is the longer extent of the part in g's units, outline included; `turn` turns it
// about x, y in degrees (clockwise, as SVG); `w` overrides the main outline in page pixels. Every id inside starts with
// `id`. Each part is designed in a box of 100 local units (−50…50 on its longer side), scaled onto the page.
// Shapes are SiliCoDraw's (lines 1520–2859, 13320–19178 of its figure editor), drawn again in the soft look.
//
// ---------- Conventions of objects ----------
// Materials are greys (chroma under 0.012), so "Shades follow" never ties them to a coloured part:
//   GLASS    cool grey, hue 230: base 0.975, shadow 0.935, a white streak as its highlight. Beakers, flasks, slides.
//   PLASTIC  neutral grey, hue 90: base 0.97, shadow 0.92. Tubes, tips, plates, dishes, syringe barrels.
//   METAL    the casing of an instrument and the stand of a microscope, hue 250: base 0.92, shadow 0.85.
//   DARK     a screen's glass and rubber, l 0.33. INK the dark grey of symbols on signs (never black).
// Coloured parts (each recolours on its own):
//   ACCENT   soft(267), SiliCoDraw's #4f6bb8: caps, pipette handles, the band and buttons of an instrument.
//   Liquids  in the `small` tone of their palette, flat, with a meniscus line in the outline tone:
//            water soft(222), culture medium soft(8) (phenol red), blood deep(22) (as the red blood cell),
//            plasma rich(96) with a paler straw tone, reagent soft(155). Pass any palette as `liquid` for another colour.
//   AGAR rich(85) with colonies in the small tone of rich(40); cells in a dish are the generic cell (soft 245) with lilac nuclei.
//   GLOW     the trace on a screen and a lamp that is on: green 150, bright. A red lamp deep(25).
//   Signs    warning triangle yellow (l 0.9, chroma 0.16, hue 98) with INK border and symbol; GHS diamond white
//            with a red (deep 27) border; safe condition square green deep(150); mandatory circle blue deep(255).
//   Mouse    white fur (grey) with pink (soft 3) ears, nose, feet and tail; or black or brown fur.
// Outlines: `objW(px)` from the part's size on the page: 3.5 up to 100 px, 5 at 200, 8.5 on a full page. Fine lines
// (graduations, label lines, ridges) are about half that and are left out below 60 px. Shading: a part from 80 px on
// gets a two-stop gradient (base at the top left to shadow) and one highlight; smaller ones are flat.
import { BLUE, NUC } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex } from '../colour.mjs'
import { f } from '../shapes.mjs'
import { fits, lettering, textWidth } from './letters.mjs'

// ---------- palettes ----------
const grey = (h, l, c = 0.008) => ({
  light: toHex({ l: Math.min(0.997, l + 0.03), c: c * 0.5, h }),
  base: toHex({ l, c, h }),
  shadow: toHex({ l: l - 0.05, c: c * 1.2, h }),
  small: toHex({ l: l - 0.11, c: Math.min(0.0115, c * 1.3), h }),
  outline: toHex({ l: 0.58, c: 0.011, h }),
})
export const GLASS = grey(230, 0.975, 0.007)
export const PLASTIC = grey(90, 0.97, 0.006)
export const METAL = grey(250, 0.92, 0.008)
export const DARK = { light: toHex({ l: 0.45, c: 0.01, h: 250 }), base: toHex({ l: 0.34, c: 0.01, h: 250 }), shadow: toHex({ l: 0.29, c: 0.01, h: 250 }), small: toHex({ l: 0.4, c: 0.01, h: 250 }), outline: toHex({ l: 0.24, c: 0.01, h: 250 }) }
export const INK = toHex({ l: 0.3, c: 0.01, h: 250 })
export const PAPER = { light: '#FFFFFF', base: toHex({ l: 0.99, c: 0.004, h: 90 }), shadow: toHex({ l: 0.95, c: 0.006, h: 90 }), small: toHex({ l: 0.75, c: 0.01, h: 250 }), outline: toHex({ l: 0.58, c: 0.011, h: 90 }) }
export const ACCENT = soft(hueOf('#4f6bb8'))
export const LIQUIDS = { water: soft(222), medium: soft(8), blood: deep(hueOf('#e86b6b')), plasma: { ...rich(96), small: toHex({ l: 0.9, c: 0.085, h: 95 }) }, reagent: soft(155) }
export const AGAR = rich(85)
export const COLONY = rich(40)
export const LAWN = soft(125)
export const CELLS = soft(BLUE)
export const GLOW = { light: toHex({ l: 0.95, c: 0.06, h: 150 }), base: toHex({ l: 0.83, c: 0.17, h: 150 }), shadow: toHex({ l: 0.75, c: 0.17, h: 150 }), small: toHex({ l: 0.83, c: 0.17, h: 150 }), outline: toHex({ l: 0.6, c: 0.15, h: 150 }) }
export const LAMP_RED = deep(25)
export const WARN = { light: toHex({ l: 0.97, c: 0.08, h: 98 }), base: toHex({ l: 0.9, c: 0.16, h: 98 }), shadow: toHex({ l: 0.85, c: 0.16, h: 98 }), small: toHex({ l: 0.8, c: 0.16, h: 98 }), outline: INK }
export const GHS = deep(27)
export const SAFE = deep(150)
export const MANDATORY = deep(255)
export const PINK = soft(hueOf('#f2b8c6'))
export const FUR = { white: grey(80, 0.975, 0.006), black: { light: toHex({ l: 0.55, c: 0.01, h: 60 }), base: toHex({ l: 0.45, c: 0.01, h: 60 }), shadow: toHex({ l: 0.38, c: 0.01, h: 60 }), small: toHex({ l: 0.33, c: 0.01, h: 60 }), outline: toHex({ l: 0.25, c: 0.01, h: 60 }) }, brown: soft(60) }
export const PLUG = grey(85, 0.95, 0.011) // cotton or foam, off-white
export const BEAMS = { red: deep(25), green: deep(150), blue: deep(250), violet: deep(290), infrared: deep(15), white: rich(98) }

// ---------- helpers ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
/** Main outline of an object `px` page pixels long. */
export const objW = (px) => f(clamp(2.2 + px / 70, 3.5, 8.5))
const P2 = ([x, y]) => `${f(x)},${f(y)}`
const rot = (cx, cy, turn) => (turn ? ` transform="rotate(${f(turn)} ${f(cx)} ${f(cy)})"` : '')
const group = (id, F, turn, inner) => `<g id="${id}"${rot(F.cx, F.cy, turn)}>${inner}</g>`
const stroked = (s, w) => (s ? ` stroke="${s}" stroke-width="${f(w)}" stroke-linejoin="round"` : '')
/** The local frame of a part: 100 units on its longer side, centred on x, y. */
const frame = (g, x, y, size) => {
  const cx = g.X(x), cy = g.Y(y), px = size * g.k, u = px / 100
  return { g, x, y, cx, cy, px, u, P: ([a, b]) => [cx + a * u, cy + b * u], gx: (a) => x + (a * u) / g.k, gy: (b) => y + (b * u) / g.k }
}
const polyD = (F, pts, close = true) => `M${pts.map((p) => P2(F.P(p))).join(' L')}${close ? 'Z' : ''}`
const fillPath = (d, fill, s = '', w = 0) => `<path d="${d}" fill="${fill}"${stroked(s, w)}/>`
const linePath = (d, colour, w, cap = 'round') => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
const circ = (F, x, y, r, fill, s = '', w = 0) => { const [cx, cy] = F.P([x, y]); return `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * F.u)}" fill="${fill}"${stroked(s, w)}/>` }
const ell = (F, x, y, rx, ry, fill, s = '', w = 0, r = 0) => { const [cx, cy] = F.P([x, y]); return `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx * F.u)}" ry="${f(ry * F.u)}"${r ? ` transform="rotate(${f(r)} ${f(cx)} ${f(cy)})"` : ''} fill="${fill}"${stroked(s, w)}/>` }
const rect = (F, x0, y0, x1, y1, r, fill, s = '', w = 0) => { const [a, b] = F.P([x0, y0]); return `<rect x="${f(a)}" y="${f(b)}" width="${f((x1 - x0) * F.u)}" height="${f((y1 - y0) * F.u)}" rx="${f(r * F.u)}" fill="${fill}"${stroked(s, w)}/>` }
const lines = (F, segs, colour, w, cap = 'round') => linePath(segs.map((s) => polyD(F, s, false)).join(' '), colour, w, cap)
const grad = (id, F, [x0, y0, x1, y1], pal) => {
  const [a, b] = F.P([x0, y0]), [c, d] = F.P([x1, y1])
  return `<linearGradient id="${id}" x1="${f(a)}" y1="${f(b)}" x2="${f(c)}" y2="${f(d)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`
}
/** Fill of a shaded part: its gradient when large, its base when small. */
const shade = (F, id, box, pal, defs) => { if (F.px * Math.max(box[2] - box[0], box[3] - box[1]) / 100 >= 80) { defs.push(grad(id, F, box, pal)); return `url(#${id})` } return pal.base }
const bboxOf = (pts) => [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))]
/** Points along an ellipse from a0 to a1 (degrees, y down: 0 right, 90 down). */
const arcPts = (cx, cy, rx, ry, a0, a1, step = 8) => {
  const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / step))
  return Array.from({ length: n + 1 }, (_, i) => { const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] })
}
/** A closed polygon with its corners rounded: `corners` is [[x, y, r], …]; r 0 keeps a sharp corner. */
const roundPoly = (corners) => {
  const n = corners.length, out = []
  for (let i = 0; i < n; i++) {
    const [x, y, r] = corners[i], a = corners[(i - 1 + n) % n], b = corners[(i + 1) % n]
    if (!r) { out.push([x, y]); continue }
    const la = Math.hypot(a[0] - x, a[1] - y), lb = Math.hypot(b[0] - x, b[1] - y), ta = Math.min(r / la, 0.5), tb = Math.min(r / lb, 0.5)
    const p0 = [x + (a[0] - x) * ta, y + (a[1] - y) * ta], p2 = [x + (b[0] - x) * tb, y + (b[1] - y) * tb]
    for (let j = 0; j <= 6; j++) { const t = j / 6; out.push([(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * x + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * y + t * t * p2[1]]) }
  }
  return out
}
const rr = (x0, y0, x1, y1, r) => roundPoly([[x0, y0, r], [x1, y0, r], [x1, y1, r], [x0, y1, r]])
const turnPts = (pts, [ox, oy], deg) => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return pts.map(([x, y]) => [ox + (x - ox) * c - (y - oy) * s, oy + (x - ox) * s + (y - oy) * c]) }
/** The part of a polygon below the line y = yl (Sutherland–Hodgman against one edge). */
const clipBelow = (pts, yl) => {
  const out = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], ina = a[1] >= yl, inb = b[1] >= yl
    if (ina) out.push(a)
    if (ina !== inb) { const t = (yl - a[1]) / (b[1] - a[1]); out.push([a[0] + (b[0] - a[0]) * t, yl]) }
  }
  return out
}
/** Liquid filling a vessel's outline `pts` from yl down, with a meniscus dipping `dip`: { d, surface } (page paths). */
const liquidIn = (F, pts, yl, dip) => {
  const out = clipBelow(pts, yl + 0.013)
  if (out.length < 3) return null
  const n = out.length
  let k = out.findIndex((p, i) => Math.abs(p[1] - yl - 0.013) < 1e-6 && Math.abs(out[(i + 1) % n][1] - yl - 0.013) < 1e-6)
  if (k < 0) k = n - 1
  const ring = [...out.slice(k + 1), ...out.slice(0, k + 1)] // starts after the surface edge, ends at its start
  const s = ring[0], e = ring[n - 1], c = [(s[0] + e[0]) / 2, yl + dip]
  const [cx, cy] = F.P(c)
  return { d: `${polyD(F, ring, false)} Q${f(cx)},${f(cy)} ${P2(F.P(s))}Z`, surface: `M${P2(F.P(e))} Q${f(cx)},${f(cy)} ${P2(F.P(s))}` }
}
/** A vessel body drawn the shared way: fill, contents, highlight, then the outline on top (so nothing needs clipping). */
const vesselBody = (F, id, pts, { mat, w, layers = [], dip = 3, label, marks, hl, top, defs }) => {
  const box = bboxOf(pts), big = F.px >= 60
  let s = fillPath(polyD(F, pts), shade(F, `${id}-gradient`, box, mat, defs))
  // Layers from the top down: each fills from its own surface to the bottom; the topmost has the meniscus.
  layers.forEach(([yl, pal], i) => {
    const q = liquidIn(F, pts, yl, i ? 0 : dip)
    if (!q) return
    s += fillPath(q.d, pal.small) + (big || !i ? linePath(q.surface, pal.outline, Math.max(1.6, w * (i ? 0.35 : 0.5))) : '')
  })
  if (label && F.px >= 40) {
    const [x0, y0, x1, y1] = label
    s += rect(F, x0, y0, x1, y1, 1.5, PAPER.base, PAPER.outline, Math.max(1.5, w * 0.45))
    if (big) s += lines(F, [[[x0 + (x1 - x0) * 0.18, y0 + (y1 - y0) * 0.38], [x1 - (x1 - x0) * 0.18, y0 + (y1 - y0) * 0.38]], [[x0 + (x1 - x0) * 0.18, y0 + (y1 - y0) * 0.68], [x0 + (x1 - x0) * 0.6, y0 + (y1 - y0) * 0.68]]], PAPER.small, Math.max(1.5, w * 0.4))
  }
  if (marks && big) s += lines(F, marks, mat.outline, Math.max(1.5, w * 0.4), 'butt')
  if (hl && F.px >= 60) s += fillPath(polyD(F, rr(...hl, (hl[2] - hl[0]) / 2)), mat.light)
  s += fillPath(polyD(F, pts, !top), 'none', mat.outline, w).replace('/>', ' stroke-linecap="round"/>')
  return s
}
const liquidPal = (l) => (typeof l === 'string' ? LIQUIDS[l] : l)
/** Layers of liquid as [[surface y, palette], …], topmost first. `level` is the share of the height from yTop to yBottom. */
const layersOf = (liquid, level, layers, yTop, yBottom) => {
  if (layers) { let acc = 0; const out = layers.map(([share, l]) => { acc += share; return [yBottom - acc * (yBottom - yTop), liquidPal(l)] }); return out.reverse() }
  return liquid && level > 0 ? [[yBottom - level * (yBottom - yTop), liquidPal(liquid)]] : []
}
const usedLiquids = (liquid, level, layers) => (layers ? layers.map(([, l]) => liquidPal(l)) : liquid && level > 0 ? [liquidPal(liquid)] : [])

// =====================================================================================================================
// Tube: a test tube, microtube, conical tube, vial or blood tube, upright, `size` its height with the cap.
// Options: kind 'test' | 'micro' | 'conical' | 'vial' | 'blood'; cap 'rim' | 'snap' | 'screw' | 'stopper' | 'plug' |
// 'none' (each kind has its usual one); liquid (a name of LIQUIDS or a palette), level (share of the tube, 0.45);
// layers [[share, liquid], …] from the bottom up instead (plasma over red cells); label (a paper band); material
// 'glass' | 'plastic' (by kind); capPal (ACCENT); open (a snap cap stands open).
// Used by: Test tube, Microtube, Blood tube, Saliva, CSF and Stool samples, Plasma / serum, PBMC isolation, Tube rack,
// Cryovial, Ice bucket, Vortex mixer, Water bath, Liquid handling robot, Fly lifespan vial, Spin column, Centrifuge.
// Example: tube(g, { x: 0, y: 0, size: 40, kind: 'micro', liquid: 'water', level: 0.3, id: 'tube1' })
const TUBES = {
  test: { hw: 13, bottom: 'round', cap: 'rim', mat: 'glass' },
  micro: { hw: 15, bottom: 'cone', cone: 0.36, tip: 3.5, cap: 'snap', mat: 'plastic' },
  conical: { hw: 14, bottom: 'cone', cone: 0.17, tip: 4, cap: 'screw', mat: 'plastic', graduated: true },
  vial: { hw: 15, bottom: 'flat', cap: 'screw', mat: 'plastic' },
  blood: { hw: 12, bottom: 'round', cap: 'stopper', mat: 'plastic' },
}
const CAPS = { none: [0, 0], rim: [7, 0], snap: [12, 0], screw: [17, 2], stopper: [19, 5], plug: [17, 7] }
export function tube(g, { x, y, size, turn = 0, id = 'tube', w, kind = 'test', cap, liquid = 'water', level = 0.45, layers, label = false, material, capPal = ACCENT, open = false }) {
  const F = frame(g, x, y, size), K = TUBES[kind], hw = K.hw, defs = []
  cap ??= K.cap
  const mat = (material ?? K.mat) === 'glass' ? GLASS : PLASTIC
  w ??= objW(F.px)
  const [ch, over] = CAPS[cap], yt = -50 + ch - over, yb = 50
  let pts
  if (K.bottom === 'round') pts = [[-hw, yt], ...arcPts(0, yb - hw, hw, hw, 180, 0), [hw, yt]]
  else if (K.bottom === 'flat') pts = roundPoly([[-hw, yt, 0], [-hw, yb, 6], [hw, yb, 6], [hw, yt, 0]])
  else { const yc = yb - K.cone * 100, t = K.tip; pts = [[-hw, yt], [-hw, yc], ...arcPts(0, yb - t, t, t, 180, 0), [hw, yc], [hw, yt]] }
  const fillTop = yt + (cap === 'plug' || cap === 'stopper' ? over + 2 : 4)
  const lay = layersOf(liquid, level, layers, fillTop, yb)
  const lab = label ? [-hw, yt + (yb - yt) * 0.18, hw, yt + (yb - yt) * 0.48] : null
  const marks = K.graduated ? [0.3, 0.45, 0.6].map((t) => [[hw - 6, yt + (yb - yt) * t], [hw, yt + (yb - yt) * t]]) : null
  let s = vesselBody(F, id, pts, { mat, w, layers: lay, label: lab, marks, hl: [-hw * 0.62, yt + 6, -hw * 0.62 + Math.max(2.5, hw * 0.22), yb - hw - 4], top: true, defs })
  // the cap
  const cw = Math.max(2, w * 0.75)
  if (cap === 'rim') s += fillPath(polyD(F, rr(-hw - 4, -50, hw + 4, -50 + ch, 2.5)), mat.shadow, mat.outline, cw)
  if (cap === 'screw' || cap === 'stopper') {
    const box = [-hw - 2, -50, hw + 2, -50 + ch], fill = shade(F, `${id}-cap-gradient`, box, capPal, defs)
    s += `<g id="${id}-cap">${fillPath(polyD(F, rr(...box, cap === 'stopper' ? 5 : 3)), fill, capPal.outline, cw)}`
    if (F.px >= 60) s += cap === 'screw' ? lines(F, [-0.5, 0, 0.5].map((t) => [[t * hw, -46], [t * hw, -50 + ch - 4]]), capPal.outline, Math.max(1.5, w * 0.4)) : lines(F, [[[-hw - 2, -50 + ch * 0.55], [hw + 2, -50 + ch * 0.55]]], capPal.outline, Math.max(1.5, w * 0.4))
    s += '</g>'
  }
  if (cap === 'snap') {
    s += fillPath(polyD(F, rr(-hw - 3, -50 + ch - 5, hw + 3, -50 + ch + 1, 2)), mat.shadow, mat.outline, cw)
    if (open) s += fillPath(polyD(F, roundPoly([[hw + 2, -45, 2], [hw + 10, -49, 3], [hw + 20, -36, 3], [hw + 14, -32, 2]])), mat.shadow, mat.outline, cw)
    else s += ell(F, 0, -50 + ch - 6, hw + 3, 5, mat.shadow, mat.outline, cw) + fillPath(polyD(F, roundPoly([[hw + 1, -47, 1], [hw + 13, -50, 2], [hw + 13, -45, 2], [hw + 2, -42, 1]])), mat.shadow, mat.outline, cw)
  }
  if (cap === 'plug') {
    const bumps = Array.from({ length: 9 }, (_, i) => { const t = (i / 8) * Math.PI; return [-(hw - 1) * Math.cos(t), -50 + ch * 0.35 - Math.sin(t) * 3 + (i % 2 ? 1.5 : 0)] })
    s += `<g id="${id}-plug">${fillPath(polyD(F, [[hw - 1, -50 + ch], [-hw + 1, -50 + ch], ...bumps]), PLUG.base, PLUG.outline, cw)}</g>`
  }
  const parts = [['tube', mat], ...usedLiquids(liquid, level, layers).map((p, i) => [`liquid${i || ''}`, p])]
  if (cap === 'screw' || cap === 'stopper') parts.push(['cap', capPal])
  if (cap === 'plug') parts.push(['plug', PLUG])
  return { defs: defs.join(''), body: group(id, F, turn, s), parts }
}

// =====================================================================================================================
// Glassware and bottles, upright, `size` the longer side. Options: kind 'beaker' | 'flask' (Erlenmeyer) | 'bottle'
// (media bottle with a screw cap) | 'cylinder' (graduated) | 'round' (round-bottom flask) | 'jar' (wide, lidded:
// bioreactor, anaerobic jar); liquid, level (0.4), layers as for tube; label (bottle and jar); marks (graduations,
// beaker and cylinder by default); material 'glass' | 'plastic'; capPal (ACCENT).
// Used by: Flask, Reagent bottle, Graduated cylinder, Wash bottle, Magnetic stirrer, Orbital shaker, Water sample,
// Chemostat, Filtration unit, Rotary evaporator, Bioreactor, Anaerobic jar, Schlenk line, Funnel.
// Example: glassware(g, { x: 0, y: 0, size: 50, kind: 'flask', liquid: 'medium', id: 'flask1' })
export function glassware(g, { x, y, size, turn = 0, id = 'glassware', w, kind = 'beaker', liquid = 'water', level = 0.4, layers, label, marks, material = 'glass', capPal = ACCENT }) {
  const F = frame(g, x, y, size), mat = material === 'glass' ? GLASS : PLASTIC, defs = []
  w ??= objW(F.px)
  const cw = Math.max(2, w * 0.75)
  let pts, top, fillTop, hl, lab = null, mk = null, before = '', after = ''
  if (kind === 'beaker') {
    pts = roundPoly([[-42, -47, 0], [-36, -41, 2], [-36, 48, 7], [36, 48, 7], [36, -46, 0]])
    top = -44; fillTop = -40; hl = [-29, -32, -24, 30]
    if (marks ?? true) mk = [-20, -4, 12, 28].map((yy, i) => [[16 + (i % 2 ? 6 : 0), yy], [30, yy]])
  } else if (kind === 'flask') {
    pts = roundPoly([[-10, -43, 0], [-10, -16, 4], [-43, 47, 8], [43, 47, 8], [10, -16, 4], [10, -43, 0]])
    top = -43; fillTop = -16; hl = [-7, -38, -4, -20]
    after = fillPath(polyD(F, rr(-14, -50, 14, -42, 2.5)), mat.shadow, mat.outline, cw)
  } else if (kind === 'bottle') {
    pts = roundPoly([[-11, -36, 0], [-11, -30, 3], [-32, -15, 9], [-32, 50, 7], [32, 50, 7], [32, -15, 9], [11, -30, 3], [11, -36, 0]])
    top = -36; fillTop = -14; hl = [-26, -8, -22, 40]
    if (label ?? true) lab = [-32, 4, 32, 30]
    after = `<g id="${id}-cap">${fillPath(polyD(F, rr(-14, -50, 14, -35, 3)), shade(F, `${id}-cap-gradient`, [-14, -50, 14, -35], capPal, defs), capPal.outline, cw)}${F.px >= 60 ? lines(F, [-7, 0, 7].map((t) => [[t, -46], [t, -39]]), capPal.outline, Math.max(1.5, w * 0.4)) : ''}</g>`
  } else if (kind === 'cylinder') {
    pts = [[-12, -44], [-12, 42], [12, 42], [12, -44]]
    top = -44; fillTop = -40; hl = [-8, -36, -5, 34]
    if (marks ?? true) mk = [-30, -22, -14, -6, 2, 10, 18, 26, 34].map((yy, i) => [[-12, yy], [-12 + (i % 2 ? 4 : 8), yy]])
    after = fillPath(polyD(F, rr(-16, -50, 16, -44, 2)), mat.shadow, mat.outline, cw) + fillPath(polyD(F, rr(-22, 42, 22, 50, 2.5)), mat.shadow, mat.outline, cw)
  } else if (kind === 'round') {
    const a = (Math.asin(8 / 32) * 180) / Math.PI
    pts = [[-8, -44], ...arcPts(0, 18, 32, 32, 270 - a, -90 + a, 6), [8, -44]]
    top = -44; fillTop = -14; hl = [-24, 0, -19, 24]
    after = fillPath(polyD(F, rr(-11, -50, 11, -43, 2)), mat.shadow, mat.outline, cw)
  } else if (kind === 'jar') {
    pts = roundPoly([[-36, -38, 0], [-36, 50, 10], [36, 50, 10], [36, -38, 0]])
    top = -38; fillTop = -34; hl = [-30, -30, -25, 36]
    if (label) lab = [-36, 2, 36, 26]
    after = `<g id="${id}-lid">${fillPath(polyD(F, rr(-42, -50, 42, -37, 4)), shade(F, `${id}-lid-gradient`, [-42, -50, 42, -37], capPal, defs), capPal.outline, cw)}</g>`
  }
  const lay = layersOf(liquid, level, layers, fillTop, kind === 'cylinder' ? 42 : 50)
  const s = before + vesselBody(F, id, pts, { mat, w, layers: lay, label: lab, marks: mk, hl, top: true, defs }) + after
  const parts = [['glass', mat], ...usedLiquids(liquid, level, layers).map((p, i) => [`liquid${i || ''}`, p])]
  if (kind === 'bottle') parts.push(['cap', capPal])
  if (kind === 'jar') parts.push(['lid', capPal])
  return { defs: defs.join(''), body: group(id, F, turn, s), parts }
}

// =====================================================================================================================
// Petri dish, seen from above or at an angle, `size` its width. Options: view 'top' | 'angled'; fill 'agar' | 'medium' |
// 'empty'; colonies (number of bacterial colonies, 0), cells (number of adherent cells, 0), lawn (a bacterial lawn for
// worms, false); seed (varies where colonies sit).
// Used by: Agar plate with colonies, Cell culture, Worm picking, Lifespan Machine, Anaerobic jar, Inoculation loop.
// Example: petriDish(g, { x: 0, y: 0, size: 40, colonies: 7, id: 'plate' })
export function petriDish(g, { x, y, size, turn = 0, id = 'petri-dish', w, view = 'top', fill = 'agar', colonies = 0, cells = 0, lawn = false, seed = 0 }) {
  const F = frame(g, x, y, size), defs = [], squash = view === 'angled' ? 0.42 : 1, wall = view === 'angled' ? 12 : 0
  w ??= objW(F.px)
  const cy = -wall / 2, R = 48, Ri = 42, content = fill === 'agar' ? AGAR : fill === 'medium' ? LIQUIDS.medium : null
  let s = ''
  if (wall) s += fillPath(polyD(F, [[-R, cy], ...arcPts(0, cy + wall, R, R * squash, 180, 0), [R, cy]]), PLASTIC.shadow, PLASTIC.outline, w)
  s += ell(F, 0, cy, R, R * squash, shade(F, `${id}-gradient`, [-R, cy - R * squash, R, cy + R * squash], PLASTIC, defs), PLASTIC.outline, w)
  if (content) s += `<g id="${id}-${fill}">${ell(F, 0, cy + (wall ? 2 : 0), Ri, Ri * squash, fill === 'agar' ? content.base : content.small)}</g>`
  s += ell(F, 0, cy + (wall ? 2 : 0), Ri, Ri * squash, 'none', PLASTIC.outline, Math.max(1.5, w * 0.45))
  const at = (px, py) => [px, cy + (wall ? 2 : 0) + py * squash]
  if (lawn) { const [lx, ly] = at(-3, 4); s += `<g id="${id}-lawn">${ell(F, lx, ly, 26, 18 * squash, LAWN.shadow, LAWN.outline, Math.max(1.5, w * 0.4))}</g>` }
  const spots = [[-20, -14, 6], [8, -22, 5], [20, 2, 7], [-6, 8, 5], [-24, 16, 6], [14, 22, 5], [0, -6, 4], [26, -18, 4], [-12, 28, 4], [-30, -2, 4], [4, 30, 3], [30, 14, 3]]
  const wob = (i) => Math.sin(i * 12.99 + seed * 78.2) * 3
  if (colonies) s += `<g id="${id}-colonies">${spots.slice(0, colonies).map(([cx, cy2, r], i) => { const [px, py] = at(cx + wob(i), cy2 + wob(i + 5)); const rr2 = F.px * r / 100 >= 4 ? r : 4 * 100 / F.px; return ell(F, px, py, rr2, rr2 * squash, COLONY.small, COLONY.outline, Math.max(1.2, w * 0.35)) }).join('')}</g>`
  if (cells) {
    const cs = [[-18, -14, 0], [6, -20, 30], [20, 0, -20], [-4, 6, 60], [-24, 12, -40], [12, 20, 10], [-10, -30, 20], [26, -20, 45], [-30, -4, 80], [2, 30, -10]]
    s += `<g id="${id}-cells">${cs.slice(0, cells).map(([cx, cy2, r]) => {
      const pts = [[-9, -3], [-3, -6], [6, -5], [10, 1], [3, 6], [-5, 5]].map(([a, b]) => [a * Math.cos(r * Math.PI / 180) - b * Math.sin(r * Math.PI / 180) + cx, (a * Math.sin(r * Math.PI / 180) + b * Math.cos(r * Math.PI / 180) + cy2)]).map(([a, b]) => at(a, b))
      const [nx, ny] = at(cx, cy2)
      return fillPath(polyD(F, roundPoly(pts.map((p) => [...p, 3]))), CELLS.shadow, F.px >= 80 ? CELLS.outline : '', Math.max(1.2, w * 0.35)) + ell(F, nx, ny, 2.2, 2.2 * squash, NUC.small)
    }).join('')}</g>`
  }
  if (F.px >= 80) s += linePath(polyD(F, arcPts(0, cy, R - 6, (R - 6) * squash, 200, 245, 5), false), PLASTIC.light, Math.max(2, w * 0.8))
  const parts = [['dish', PLASTIC]]
  if (content) parts.push([fill, content])
  if (lawn) parts.push(['lawn', LAWN])
  if (colonies) parts.push(['colonies', COLONY])
  if (cells) parts.push(['cells', CELLS])
  return { defs: defs.join(''), body: group(id, F, turn, s), parts }
}

// =====================================================================================================================
// Well plate, tip box or freezer box, seen from above or at an angle, `size` its width. Options: kind 'plate' | 'tips' |
// 'box'; rows, cols (4 × 6; 8 × 12 for a 96-well plate); view 'top' | 'angled'; filled 'some' | 'all' | 'none' (wells
// with liquid, or vials in a box); liquid; pal (the box of tips and freezer boxes, ACCENT); capPal (vial caps in a box).
// Used by: Well plate, Plate reader, Liquid handling robot, Tip box, Freezer box, Tube rack, Microfluidic worm chip (grid).
// Example: wellPlate(g, { x: 0, y: 0, size: 60, view: 'angled', id: 'plate' })
export function wellPlate(g, { x, y, size, turn = 0, id = 'well-plate', w, kind = 'plate', rows = 4, cols = 6, view = 'top', filled = 'some', liquid = 'water', pal = ACCENT, capPal = LIQUIDS.plasma }) {
  const F = frame(g, x, y, size), defs = [], liq = liquidPal(liquid)
  w ??= objW(F.px)
  const body = kind === 'plate' ? PLASTIC : pal, pitch = 88 / cols, H = rows * pitch + 12, sq = view === 'angled' ? 0.55 : 1, wall = view === 'angled' ? 10 : 0
  const y0 = (-H * sq - wall) / 2, Y = (v) => y0 + v * sq, r0 = Math.min(6, H / 6)
  const top = rr(-50, 0, 50, H, r0).map(([a, b]) => [a, Y(b)])
  let s = ''
  if (wall) s += fillPath(polyD(F, [[50, Y(H / 2)], ...rr(-50, 0, 50, H, r0).filter(([, b]) => b > H / 2).map(([a, b]) => [a, Y(b) + wall]), [-50, Y(H / 2)]]), body.shadow, body.outline, w)
  s += fillPath(polyD(F, top), shade(F, `${id}-gradient`, [-50, Y(0), 50, Y(H)], body, defs), body.outline, w)
  const fine = Math.max(1.2, w * (F.px >= 80 ? 0.35 : 0.3)), r = pitch * (kind === 'box' ? 0.4 : 0.36)
  let wells = ''
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const cx = -44 + pitch * (j + 0.5), cyy = Y(6 + pitch * (i + 0.5)), on = filled === 'all' || (filled === 'some' && (i + j) % 3 !== 0)
    if (kind === 'plate') wells += ell(F, cx, cyy, r, r * sq, on ? liq.small : PLASTIC.small, F.px >= 50 ? PLASTIC.outline : '', fine)
    else if (kind === 'tips') wells += ell(F, cx, cyy, r, r * sq, PLASTIC.base, F.px >= 50 ? body.outline : '', fine) + (F.px >= 80 ? ell(F, cx, cyy, r * 0.4, r * 0.4 * sq, PLASTIC.small) : '')
    else wells += ell(F, cx, cyy, r, r * sq, on ? capPal.base : body.shadow, F.px >= 50 ? (on ? capPal.outline : body.outline) : '', fine)
  }
  s += `<g id="${id}-wells">${wells}</g>`
  const parts = [[kind === 'plate' ? 'plate' : 'box', body]]
  if (kind === 'plate' && filled !== 'none') parts.push(['liquid', liq])
  if (kind === 'box' && filled !== 'none') parts.push(['vials', capPal])
  return { defs: defs.join(''), body: group(id, F, turn, s), parts }
}

// =====================================================================================================================
// Pipette tip, pointing down, `size` its length. Options: liquid, level (share filled from the point, 0).
// Used by: Pipette, Multichannel pipette, Tip box, Liquid handling robot, 3D bioprinter (nozzle).
// Example: tip(g, { x: 0, y: 0, size: 20, liquid: 'water', level: 0.3, id: 'tip' })
export function tip(g, { x, y, size, turn = 0, id = 'tip', w, liquid = 'water', level = 0 }) {
  const F = frame(g, x, y, size), defs = []
  w ??= Math.max(2, objW(F.px) * 0.8)
  const pts = roundPoly([[-10, -44, 0], [-1.6, 50, 1.5], [1.6, 50, 1.5], [10, -44, 0]])
  let s = vesselBody(F, id, pts, { mat: PLASTIC, w, layers: layersOf(liquid, level, null, -44, 50), dip: 1.5, hl: [-6, -38, -4, 0], top: true, defs })
  s += fillPath(polyD(F, rr(-12, -50, 12, -43, 2)), PLASTIC.shadow, PLASTIC.outline, Math.max(1.8, w * 0.8))
  return { defs: defs.join(''), body: group(id, F, turn, s), parts: [['tip', PLASTIC], ...usedLiquids(liquid, level).map((p) => ['liquid', p])] }
}

// =====================================================================================================================
// Pipette, upright with the tip down, `size` its height. Options: kind 'single' | 'multi' (channels, 8 drawn as
// `channels`, default 6) | 'serological' (a long graduated pipette in a pipette controller); liquid, level (in the tips
// or the pipette, 0); pal (the handle, ACCENT).
// Used by: Pipette, Multichannel pipette, Serological pipette, Liquid handling robot.
// Example: pipette(g, { x: 0, y: 0, size: 60, kind: 'multi', channels: 8, id: 'pipette' })
export function pipette(g, { x, y, size, turn = 0, id = 'pipette', w, kind = 'single', channels = 6, liquid = 'water', level = 0, pal = ACCENT }) {
  const F = frame(g, x, y, size), defs = []
  w ??= objW(F.px)
  const fine = Math.max(1.5, w * 0.45), cw = Math.max(2, w * 0.8)
  let s = '', parts = [['handle', pal]], tips = ''
  const tipAt = (tx, ty, len, n) => { const t = tip(g, { x: F.gx(tx), y: F.gy(ty + len / 2), size: (len * F.u) / g.k, id: `${id}-tip${n}`, liquid, level, w: Math.max(1.8, w * 0.7) }); defs.push(t.defs); return t.body }
  if (kind === 'single') {
    s += fillPath(polyD(F, rr(-6, -50, 6, -43, 2)), pal.small, pal.outline, cw) + fillPath(polyD(F, rr(-2.5, -44, 2.5, -36, 1)), pal.shadow, pal.outline, cw)
    s += fillPath(polyD(F, roundPoly([[-11, -37, 6], [11, -37, 6], [11, -27, 2], [19, -23, 3], [19, -17, 3], [11, -19, 2], [11, 8, 5], [-11, 8, 5]])), shade(F, `${id}-gradient`, [-11, -37, 19, 8], pal, defs), pal.outline, w)
    s += fillPath(polyD(F, rr(-15, -31, -11, -19, 1.5)), pal.shadow, pal.outline, cw)
    if (F.px >= 80) s += fillPath(polyD(F, rr(-5, -27, 5, -17, 1.5)), PAPER.base, pal.outline, fine) + fillPath(polyD(F, rr(-8, -32, -5, -8, 1.5)), pal.light)
    s += fillPath(polyD(F, roundPoly([[-6, 7, 0], [6, 7, 0], [4, 26, 1], [-4, 26, 1]])), PLASTIC.base, PLASTIC.outline, cw)
    tips = tipAt(0, 25, 25, 0)
  } else if (kind === 'multi') {
    s += fillPath(polyD(F, rr(-5, -50, 5, -44, 2)), pal.small, pal.outline, cw)
    s += fillPath(polyD(F, rr(-9, -45, 9, -8, 5)), shade(F, `${id}-gradient`, [-9, -45, 9, -8], pal, defs), pal.outline, w)
    s += fillPath(polyD(F, rr(-34, -10, 34, 5, 4)), pal.shadow, pal.outline, w)
    const n = Math.max(2, channels), step = 60 / (n - 1)
    for (let i = 0; i < n; i++) tips += tipAt(-30 + i * step, 4, Math.min(44, step * 3.6), i)
  } else {
    s += fillPath(polyD(F, roundPoly([[-15, -50, 8], [15, -50, 8], [15, -30, 5], [5, -24, 2], [-5, -24, 2], [-15, -30, 5]])), shade(F, `${id}-gradient`, [-15, -50, 15, -24], pal, defs), pal.outline, w)
    s += fillPath(polyD(F, roundPoly([[15, -44, 2], [22, -42, 2], [22, -36, 2], [15, -35, 2]])), pal.shadow, pal.outline, cw)
    const pts = roundPoly([[-3.5, -24, 0], [-3.5, 44, 1], [-1, 50, 1], [1, 50, 1], [3.5, 44, 1], [3.5, -24, 0]])
    const marks = [-10, -2, 6, 14, 22, 30].map((yy, i) => [[-3.5, yy], [i % 2 ? -1.5 : 0, yy]])
    s += vesselBody(F, `${id}-glass`, pts, { mat: PLASTIC, w: cw, layers: layersOf(liquid, level, null, -24, 50), dip: 1, marks, top: true, defs })
  }
  if (level > 0) parts.push(['liquid', liquidPal(liquid)])
  parts.push(['tip', PLASTIC])
  return { defs: defs.join(''), body: group(id, F, turn, tips + s), parts }
}

// =====================================================================================================================
// Syringe, upright with the needle down, `size` its height. Options: needle 'needle' | 'gavage' (a longer needle with a
// ball tip) | 'filter' (a syringe filter at the end) | 'none'; liquid, level (share of the barrel, 0.5); pal (the
// filter, ACCENT).
// Used by: Syringe, Syringe filter, Mouse injection, Oral gavage, Muscle biopsy.
// Example: syringe(g, { x: 0, y: 0, size: 50, turn: -40, id: 'syringe' })
export function syringe(g, { x, y, size, turn = 0, id = 'syringe', w, needle = 'needle', liquid = 'water', level = 0.5, pal = ACCENT }) {
  const F = frame(g, x, y, size), defs = []
  w ??= objW(F.px)
  const cw = Math.max(2, w * 0.8), fine = Math.max(1.5, w * 0.45)
  const yb = needle === 'gavage' ? 6 : 20, yt = -28, barrel = rr(-10, yt, 10, yb, 3)
  const yl = yb - level * (yb - yt - 4)
  let s = fillPath(polyD(F, rr(-14, -50, 14, -45, 2)), PLASTIC.shadow, PLASTIC.outline, cw)
  s += fillPath(polyD(F, rr(-3, -46, 3, yl - 4, 1)), PLASTIC.shadow, PLASTIC.outline, cw)
  const marks = [0.25, 0.4, 0.55, 0.7].map((t) => [[4, yt + (yb - yt) * t], [10, yt + (yb - yt) * t]])
  s += vesselBody(F, id, barrel, { mat: PLASTIC, w, layers: level > 0 ? [[yl, liquidPal(liquid)]] : [], dip: 0, marks, hl: [-7, yt + 5, -5, yb - 6], defs })
  s += fillPath(polyD(F, rr(-9, yl - 6, 9, yl, 1.5)), DARK.small, DARK.outline, fine)
  s += fillPath(polyD(F, rr(-18, -31, 18, -26, 2)), PLASTIC.shadow, PLASTIC.outline, cw)
  s += fillPath(polyD(F, roundPoly([[-4, yb, 0], [4, yb, 0], [2.5, yb + 7, 1], [-2.5, yb + 7, 1]])), PLASTIC.shadow, PLASTIC.outline, cw)
  const nw = Math.max(1.8, w * 0.5)
  if (needle === 'needle') s += lines(F, [[[0, yb + 7], [0, 50]]], METAL.outline, nw, 'butt')
  if (needle === 'gavage') s += lines(F, [[[0, yb + 7], [0, 36], [2, 44]]], METAL.outline, nw * 1.2) + circ(F, 2.6, 46, 3.4, METAL.base, METAL.outline, fine)
  if (needle === 'filter') s += `<g id="${id}-filter">${fillPath(polyD(F, rr(-15, yb + 6, 15, yb + 17, 5)), pal.base, pal.outline, cw)}${F.px >= 60 ? lines(F, [[[-10, yb + 11.5], [10, yb + 11.5]]], pal.light, fine) : ''}</g>` + fillPath(polyD(F, roundPoly([[-3, yb + 16, 0], [3, yb + 16, 0], [1.5, 50, 1], [-1.5, 50, 1]])), PLASTIC.shadow, PLASTIC.outline, cw)
  const parts = [['syringe', PLASTIC]]
  if (level > 0) parts.push(['liquid', liquidPal(liquid)])
  if (needle === 'filter') parts.push(['filter', pal])
  return { defs: defs.join(''), body: group(id, F, turn, s), parts }
}

// =====================================================================================================================
// Screen of an instrument, `size` its width. Options: aspect (height / width, 0.62); show 'trace' | 'peaks' |
// 'spectrum' | 'bars' | 'bands' | 'dots' | 'number' | 'blank'; text (for 'number': digits, letters, '.' as a dot is
// not lettered, so '7.40' is written as 7 40 with a point drawn); ink (GLOW).
// Used inside `instrument`, and by NMR, HPLC, Flow cytometry, Sequencer, Gel imager, pH meter, Plate reader.
// Example: screen(g, { x: 0, y: 0, size: 30, show: 'number', text: '37', id: 'display' })
export function screen(g, { x, y, size, turn = 0, id = 'screen', w, aspect = 0.62, show = 'trace', text = '37', ink = GLOW }) {
  const F = frame(g, x, y, size)
  w ??= Math.max(2, objW(F.px) * 0.7)
  const s = screenIn(F, -50, -50 * aspect, 50, 50 * aspect, { show, text, ink, w, id })
  return { defs: '', body: group(id, F, turn, s), parts: [['screen', DARK], ['display', ink]] }
}
function screenIn(F, x0, y0, x1, y1, { show, text, ink, w, id }) {
  const W = x1 - x0, H = y1 - y0, X = (t) => x0 + W * t, Y = (t) => y0 + H * t, lw = Math.max(1.6, Math.min(w * 0.7, W * F.u * 0.04))
  let s = fillPath(polyD(F, rr(x0, y0, x1, y1, Math.min(W, H) * 0.12)), DARK.base, DARK.outline, w), c = ''
  if (show === 'trace') c = lines(F, [[0.08, 0.6], [0.22, 0.6], [0.3, 0.3], [0.38, 0.78], [0.46, 0.45], [0.6, 0.55], [0.7, 0.25], [0.8, 0.7], [0.92, 0.5]].map(([a, b]) => [X(a), Y(b)]).reduce((p, q) => (p[0].push(q), p), [[]]), ink.base, lw)
  if (show === 'peaks' || show === 'spectrum') {
    const pk = show === 'peaks' ? [[0.3, 0.05, 0.55], [0.55, 0.04, 0.3], [0.75, 0.06, 0.45]] : [[0.25, 0.02, 0.35], [0.4, 0.015, 0.6], [0.62, 0.02, 0.25], [0.78, 0.012, 0.5]]
    const pts = Array.from({ length: 61 }, (_, i) => { const t = 0.08 + (0.84 * i) / 60; return [X(t), Y(0.82 - pk.reduce((a, [m, sd, h]) => a + h * Math.exp(-((t - m) ** 2) / (2 * sd * sd)), 0))] })
    c = lines(F, [pts], ink.base, lw)
  }
  if (show === 'bars') c = lines(F, [0.25, 0.42, 0.59, 0.76].map((t, i) => [[X(t), Y(0.82)], [X(t), Y([0.45, 0.3, 0.55, 0.2][i])]]), ink.base, Math.max(lw, W * F.u * 0.09), 'butt')
  if (show === 'bands') {
    const bands = [[0.22, 0.25], [0.22, 0.45], [0.22, 0.7], [0.41, 0.3], [0.41, 0.55], [0.6, 0.25], [0.6, 0.5], [0.6, 0.65], [0.79, 0.4], [0.79, 0.7]]
    c = lines(F, bands.map(([a, b]) => [[X(a - 0.06), Y(b)], [X(a + 0.06), Y(b)]]), PAPER.base, Math.max(lw, H * F.u * 0.07))
  }
  if (show === 'dots') c = [[0.2, 0.7], [0.27, 0.6], [0.32, 0.74], [0.38, 0.64], [0.25, 0.8], [0.55, 0.35], [0.62, 0.28], [0.68, 0.4], [0.74, 0.3], [0.6, 0.45], [0.78, 0.22], [0.7, 0.2]].map(([a, b]) => circ(F, X(a), Y(b), Math.max(H * 0.045, 1.6 / F.u), ink.base)).join('')
  if (show === 'number') {
    const h = H * 0.46
    if (fits(F.g, (h * F.u) / F.g.k)) {
      const [a, b = ''] = String(text).split('.'), hg = (h * F.u) / F.g.k, gap = b ? 0.38 : 0, wa = textWidth(a), wb = b ? textWidth(b) : 0, tot = wa + gap + wb
      const mx = F.gx((x0 + x1) / 2), my = F.gy((y0 + y1) / 2), left = mx - (tot * hg) / 2
      c = lettering(F.g, { x: left + (wa * hg) / 2, y: my, h: hg, text: a, colour: ink.base, id: `${id}-number` }).body
      if (b) c += lettering(F.g, { x: left + ((wa + gap + wb / 2) * hg), y: my, h: hg, text: b, colour: ink.base, id: `${id}-decimals` }).body + `<circle cx="${f(F.g.X(left + (wa + gap / 2) * hg))}" cy="${f(F.g.Y(my + hg * 0.42))}" r="${f(hg * F.g.k * 0.085)}" fill="${ink.base}"/>`
    } else c = lines(F, [[[X(0.25), Y(0.5)], [X(0.4), Y(0.5)]], [[X(0.55), Y(0.5)], [X(0.75), Y(0.5)]]], ink.base, Math.max(lw, H * F.u * 0.18))
  }
  if (F.px >= 80 && show !== 'number') s += lines(F, [[[X(0.1), Y(0.2)], [X(0.18), Y(0.12)]]], DARK.light, lw)
  return s + `<g id="${id}-display">${c}</g>`
}

// =====================================================================================================================
// Instrument casing, front view, `size` its longer side: a rounded box in METAL with a coloured band along the top.
// Options: aspect (height / width, 0.7); screen (a `show` of screen, or false); text (for a number); door false |
// 'window' (glass, with `shelves` lines) | 'solid' | 'round'; drawer (a slot along the bottom, for plates and gels);
// buttons (0–4, round, in the accent); knob (a dial); lamp 'on' | 'red' | false; lid false | 'flat' | 'slant' (a
// thermal cycler's lid, with `wells`); feet; band (true); pal (the band and buttons, ACCENT).
// Used by: PCR machine, Incubator, Autoclave, Freezer, Biosafety cabinet, Plate reader, Sequencer, UV-Vis and
// microvolume spectrophotometers, Gel imager, pH meter, HPLC, Water bath, Vortex mixer, Orbital shaker, Magnetic
// stirrer, Slide scanner, Glove box, Cell culture hood, Metabolic cage (analyser), Lifespan Machine, NMR.
// Example: instrument(g, { x: 0, y: 0, size: 60, screen: 'trace', buttons: 2, lamp: 'on', id: 'reader' })
export function instrument(g, { x, y, size, turn = 0, id = 'instrument', w, aspect = 0.7, screen: show = 'trace', text = '37', door = false, shelves = 2, drawer = false, buttons = 2, knob = false, lamp = 'on', lid = false, wells = true, feet = false, band = true, pal = ACCENT }) {
  const F = frame(g, x, y, size), defs = []
  w ??= objW(F.px)
  const bw = aspect <= 1 ? 100 : 100 / aspect, bh = aspect <= 1 ? 100 * aspect : 100
  const fine = Math.max(1.5, w * 0.45), cw = Math.max(2, w * 0.8), big = F.px >= 60
  let x0 = -bw / 2, x1 = bw / 2, y0 = -bh / 2, y1 = bh / 2
  let s = ''
  if (feet) { y1 -= 6; s += fillPath(polyD(F, rr(x0 + 8, y1 - 2, x0 + 20, y1 + 6, 2)), METAL.small, METAL.outline, cw) + fillPath(polyD(F, rr(x1 - 20, y1 - 2, x1 - 8, y1 + 6, 2)), METAL.small, METAL.outline, cw) }
  if (lid === 'slant') {
    const ly = y0 + (y1 - y0) * 0.4, inset = bw * 0.12
    s += fillPath(polyD(F, roundPoly([[x0 + inset, y0, 5], [x1 - inset, y0, 5], [x1, ly, 3], [x0, ly, 3]])), shade(F, `${id}-lid-gradient`, [x0, y0, x1, ly], METAL, defs), METAL.outline, w)
    if (wells && F.px >= 50) { const n = 4, m = 3; for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) { const t = (i + 0.7) / (m + 0.4), yy = y0 + (ly - y0) * t, half = (bw / 2 - inset * (1 - t)) * 0.7; s += ell(F, -half + (2 * half * j) / (n - 1), yy, Math.min(4, bw * 0.035), Math.min(3, bw * 0.026), PAPER.base, METAL.outline, fine) } }
    y0 = ly
  }
  if (lid === 'flat') { s += fillPath(polyD(F, rr(x0 - 2, y0, x1 + 2, y0 + bh * 0.1, 3)), METAL.shadow, METAL.outline, w); y0 += bh * 0.1 - 1 }
  const H = y1 - y0, r = Math.min(bw, H) * 0.08
  s += fillPath(polyD(F, rr(x0, y0, x1, y1, r)), shade(F, `${id}-gradient`, [x0, y0, x1, y1], METAL, defs), METAL.outline, w)
  const pad = Math.min(bw, H) * 0.09
  let fy0 = y0 + pad
  // the coloured band; with a door it also holds the screen and the lamp
  let bandH = 0
  if (band) {
    bandH = H * (door && show ? 0.24 : 0.14)
    s += `<g id="${id}-band">${fillPath(polyD(F, roundPoly([[x0, y0, r], [x1, y0, r], [x1, y0 + bandH, 0], [x0, y0 + bandH, 0]])), pal.base, pal.outline, w)}</g>`
    fy0 = y0 + bandH + pad
  }
  const lampAt = (lx, ly, lr) => (lamp ? `<g id="${id}-lamp">${circ(F, lx, ly, lr, lamp === 'red' ? LAMP_RED.small : GLOW.base, big ? DARK.outline : '', fine)}</g>` : '')
  const fx0 = x0 + pad, fx1 = x1 - pad, fy1 = y1 - pad - (drawer ? H * 0.2 : 0)
  if (door) {
    const dx1 = buttons || knob || (lamp && !band) ? fx1 - bw * 0.16 : fx1
    if (door === 'round') {
      const R = Math.min(dx1 - fx0, fy1 - fy0) / 2, cx = (fx0 + dx1) / 2, cy = (fy0 + fy1) / 2
      s += circ(F, cx, cy, R, PAPER.base, METAL.outline, w) + circ(F, cx, cy, R * 0.62, 'none', METAL.outline, fine * 1.3) + lines(F, [[[cx, cy], [cx, cy - R * 0.45]]], METAL.outline, cw)
    } else {
      const glass = door === 'window'
      s += `<g id="${id}-door">${fillPath(polyD(F, rr(fx0, fy0, dx1, fy1, 2.5)), glass ? GLASS.small : METAL.base, METAL.outline, w)}`
      if (glass && big) s += lines(F, Array.from({ length: shelves }, (_, i) => { const yy = fy0 + ((fy1 - fy0) * (i + 1)) / (shelves + 1); return [[fx0, yy], [dx1, yy]] }), METAL.outline, fine, 'butt') + lines(F, [[[fx0 + 5, fy0 + 12], [fx0 + 12, fy0 + 5]], [[fx0 + 5, fy0 + 22], [fx0 + 20, fy0 + 7]]].map((sg) => sg), GLASS.light, cw)
      s += fillPath(polyD(F, rr(dx1 - 7, (fy0 + fy1) / 2 - 9, dx1 - 3.5, (fy0 + fy1) / 2 + 9, 1.5)), METAL.small, METAL.outline, fine) + '</g>'
    }
    if (show && band) s += screenIn(F, x0 + pad, y0 + bandH * 0.2, x0 + pad + bw * 0.34, y0 + bandH * 0.8, { show, text, ink: GLOW, w: cw, id: `${id}-screen` })
    if (band) s += lampAt(x1 - pad - 3, y0 + bandH / 2, Math.min(3.2, bandH * 0.22))
    const cx = (dx1 + x1) / 2
    for (let i = 0; i < buttons; i++) s += circ(F, cx, fy0 + 8 + i * 12, 3.6, pal.small, pal.outline, fine)
    if (knob) s += circ(F, cx, fy1 - 10, 6, METAL.shadow, METAL.outline, cw) + lines(F, [[[cx, fy1 - 10], [cx + 3, fy1 - 14]]], METAL.outline, fine)
  } else {
    const controls = buttons || knob || lamp
    const sx1 = show ? (controls ? fx0 + (fx1 - fx0) * 0.6 : fx1) : fx0
    if (show) s += screenIn(F, fx0, fy0, sx1, fy0 + (fy1 - fy0) * Math.min(1, (sx1 - fx0) * 0.62 / (fy1 - fy0)), { show, text, ink: GLOW, w: cw, id: `${id}-screen` })
    const cx = show ? (sx1 + fx1) / 2 : 0, ny = buttons + (knob ? 1 : 0) + (lamp ? 1 : 0)
    const span = fy1 - fy0, step = Math.min(13, span / Math.max(1, ny))
    let yy = fy0 + step / 2 + (span - step * ny) / 2
    if (lamp) { s += lampAt(cx, yy, 3.2); yy += step }
    for (let i = 0; i < buttons; i++) { s += `<g id="${id}-button${i}">${circ(F, show ? cx : x0 + pad + 6 + i * 12, show ? yy : fy0 + 6, 4, pal.small, pal.outline, fine)}</g>`; if (show) yy += step }
    if (knob) s += circ(F, show ? cx : 0, show ? yy : (fy0 + fy1) / 2, Math.min(7, step * 0.45), METAL.shadow, METAL.outline, cw) + lines(F, [[[show ? cx : 0, show ? yy : (fy0 + fy1) / 2], [(show ? cx : 0) + 3, (show ? yy : (fy0 + fy1) / 2) - 4]]], METAL.outline, fine)
  }
  if (drawer) s += fillPath(polyD(F, rr(fx0, y1 - pad - H * 0.16, fx1, y1 - pad, 2)), METAL.shadow, METAL.outline, cw) + lines(F, [[[-bw * 0.12, y1 - pad - H * 0.08], [bw * 0.12, y1 - pad - H * 0.08]]], METAL.outline, cw)
  if (F.px >= 80) s += fillPath(polyD(F, rr(x0 + pad * 0.6, y0 + bandH + pad * 0.35, x0 + pad * 0.6 + bw * 0.18, y0 + bandH + pad * 0.35 + 2.2, 1.1)), METAL.light)
  const parts = [['casing', METAL]]
  if (band || buttons) parts.push(['band', pal])
  if (show) parts.push(['screen', DARK], ['display', GLOW])
  if (lamp === 'red') parts.push(['lamp', LAMP_RED])
  return { defs: defs.join(''), body: group(id, F, turn, s), parts }
}

// =====================================================================================================================
// Microscope, side view, `size` its height. Options: kind 'upright' (light microscope: foot, arm, stage, slanted tube
// and eyepiece) | 'stereo' (dissecting microscope: plate, pillar, head with two eyepieces) | 'electron' (a column with
// lenses on a desk); pal (tube, knobs, lenses: ACCENT).
// Used by: Microscope, Stereo microscope, Confocal, Live-cell imaging, Two-photon, Super-resolution, Slide scanner,
// Electron microscope, Transmission electron microscope, Light-sheet microscope.
// Example: microscope(g, { x: 0, y: 0, size: 50, id: 'scope' })
export function microscope(g, { x, y, size, turn = 0, id = 'microscope', w, kind = 'upright', pal = ACCENT }) {
  const F = frame(g, x, y, size), defs = []
  w ??= objW(F.px)
  const cw = Math.max(2, w * 0.8), fine = Math.max(1.5, w * 0.45), big = F.px >= 80
  let s = ''
  if (kind === 'upright') {
    s += fillPath(polyD(F, rr(-34, 38, 30, 50, 4)), shade(F, `${id}-gradient`, [-34, 38, 30, 50], METAL, defs), METAL.outline, w)
    const arm = [[-14, 40, 0], [-30, 20, 14], [-28, -6, 14], [-8, -26, 6], [0, -18, 6], [-14, -2, 10], [-14, 22, 8], [-2, 40, 0]]
    s += fillPath(polyD(F, roundPoly(arm)), METAL.shadow, METAL.outline, w)
    s += fillPath(polyD(F, rr(-20, 10, 28, 16, 2)), METAL.base, METAL.outline, w) + fillPath(polyD(F, rr(-2, 6, 16, 10.5, 1)), GLASS.base, GLASS.outline, fine)
    s += circ(F, -22, 14, 5.5, pal.small, pal.outline, cw)
    const tubePts = turnPts(rr(-1, -50, 15, -12, 3), [7, -14], 22), eye = turnPts(rr(1, -52, 13, -46, 2), [7, -14], 22), obj = turnPts(roundPoly([[1, -13, 1], [13, -13, 1], [10, 0, 1.5], [4, 0, 1.5]]), [7, -14], 22)
    s += `<g id="${id}-tube">${fillPath(polyD(F, obj), pal.shadow, pal.outline, cw)}${fillPath(polyD(F, tubePts), shade(F, `${id}-tube-gradient`, bboxOf(tubePts), pal, defs), pal.outline, w)}${fillPath(polyD(F, eye), pal.small, pal.outline, cw)}</g>`
    if (big) s += fillPath(polyD(F, turnPts(rr(2, -44, 4.5, -20, 1.2), [7, -14], 22)), pal.light)
  } else if (kind === 'stereo') {
    s += fillPath(polyD(F, rr(-36, 38, 36, 49, 4)), shade(F, `${id}-gradient`, [-36, 38, 36, 49], METAL, defs), METAL.outline, w)
    s += fillPath(polyD(F, rr(-28, 30, 28, 38, 2)), PAPER.base, METAL.outline, cw)
    s += fillPath(polyD(F, rr(-30, -28, -22, 40, 2)), METAL.shadow, METAL.outline, w)
    s += `<g id="${id}-head">`
    for (const sgn of [-1, 1]) s += fillPath(polyD(F, turnPts(rr(-4, -52, 4, -36, 2), [0, -36], sgn * 14).map(([a, b]) => [a + sgn * 8, b])), pal.small, pal.outline, cw)
    s += fillPath(polyD(F, rr(-20, -40, 20, -16, 5)), shade(F, `${id}-head-gradient`, [-20, -40, 20, -16], pal, defs), pal.outline, w)
    s += fillPath(polyD(F, roundPoly([[-12, -17, 1], [12, -17, 1], [9, -6, 2], [-9, -6, 2]])), pal.shadow, pal.outline, cw)
    s += '</g>' + circ(F, -26, -8, 5, METAL.base, METAL.outline, cw)
  } else {
    s += fillPath(polyD(F, rr(-46, 24, 46, 48, 4)), shade(F, `${id}-gradient`, [-46, 24, 46, 48], METAL, defs), METAL.outline, w)
    s += screenIn(F, -38, 29, -12, 43, { show: 'blank', ink: GLOW, w: cw, id: `${id}-screen` }) + circ(F, 34, 36, 3.2, GLOW.base, big ? DARK.outline : '', fine)
    s += fillPath(polyD(F, rr(-13, -46, 13, 26, 4)), shade(F, `${id}-column-gradient`, [-13, -46, 13, 26], METAL, defs), METAL.outline, w)
    s += fillPath(polyD(F, rr(-9, -50, 9, -44, 2)), METAL.shadow, METAL.outline, cw)
    s += `<g id="${id}-lenses">${[-32, -14, 4].map((yy) => fillPath(polyD(F, rr(-20, yy, 20, yy + 8, 3)), pal.base, pal.outline, cw)).join('')}</g>`
    if (big) s += lines(F, [[[0, -42], [0, -33]], [[0, -23], [0, -15]], [[0, -5], [0, 3]], [[0, 13], [0, 22]]], pal.outline, fine)
  }
  const parts = [['stand', METAL], ['optics', pal]]
  if (kind === 'electron') parts.push(['screen', DARK], ['lamp', GLOW])
  return { defs: defs.join(''), body: group(id, F, turn, s), parts }
}

// =====================================================================================================================
// Hazard symbol alone, drawn in one colour, `size` its width. Options: symbol 'biohazard' | 'radiation' | 'flame' |
// 'corrosive' | 'laser' | 'uv' | 'snowflake' | 'exclamation' | 'eyewash'; colour (INK); ground (the colour behind it,
// used to cut the gaps of the biohazard sign, PAPER.base).
// Used by `hazardSign`, and by Freezer, Cryovial, Liquid nitrogen dewar (snowflake), Sharps (biohazard).
// Example: hazardSymbol(g, { x: 0, y: 0, size: 20, symbol: 'snowflake', colour: ACCENT.outline, id: 'cold' })
export function hazardSymbol(g, { x, y, size, turn = 0, id = 'hazard-symbol', w, symbol = 'biohazard', colour = INK, ground = PAPER.base }) {
  const F = frame(g, x, y, size)
  w ??= Math.max(2.5, F.px * 0.07)
  const lw = w
  let s = ''
  if (symbol === 'biohazard') {
    // The usual construction: three lobes, each a disc with a smaller disc cut out further out (a crescent opening
    // outwards), a ring through them, a hole in the middle and three thin gaps between the lobes near the middle.
    s += circ(F, 0, 0, 24, 'none', colour, lw * 0.75)
    for (const a of [0, 120, 240]) { const [cx, cy] = turnPts([[0, -18]], [0, 0], a)[0]; s += circ(F, cx, cy, 19, colour) }
    for (const a of [0, 120, 240]) { const [cx, cy] = turnPts([[0, -25]], [0, 0], a)[0]; s += circ(F, cx, cy, 13.5, ground) }
    s += lines(F, [60, 180, 300].map((a) => turnPts([[0, 0], [0, -12]], [0, 0], a)), ground, Math.max(1.5, lw * 0.4), 'butt') + circ(F, 0, 0, 5, ground)
  }
  if (symbol === 'radiation') {
    s += circ(F, 0, 0, 7, colour)
    for (const a of [-90, 30, 150]) s += fillPath(polyD(F, [...arcPts(0, 0, 12, 12, a - 30, a + 30, 5), ...arcPts(0, 0, 42, 42, a + 30, a - 30, 5)]), colour)
  }
  if (symbol === 'flame') {
    s += fillPath(polyD(F, roundPoly([[0, -44, 4], [16, -18, 10], [26, 8, 12], [12, 30, 10], [-12, 30, 10], [-26, 8, 12], [-18, -14, 8], [-8, -4, 4]])), colour)
    s += fillPath(polyD(F, roundPoly([[2, -6, 3], [11, 10, 6], [6, 24, 5], [-6, 24, 5], [-10, 12, 5]])), ground)
    s += fillPath(polyD(F, rr(-30, 36, 30, 44, 2)), colour)
  }
  if (symbol === 'corrosive') {
    // GHS corrosion: two tubes pouring drops, onto a bar (left) and a hand (right), each eaten into where the drops land.
    for (const sgn of [-1, 1]) {
      const t = turnPts(rr(-6, -18, 6, 18, 3), [0, 0], sgn * -48).map(([a, b]) => [a + sgn * 28, b - 30])
      const liq = turnPts(rr(-6, 4, 6, 18, 3), [0, 0], sgn * -48).map(([a, b]) => [a + sgn * 28, b - 30])
      s += fillPath(polyD(F, t), ground, colour, lw * 0.5) + fillPath(polyD(F, liq), colour)
      for (const [dy, r] of [[-10, 3], [0, 2.6], [10, 2.2]]) s += circ(F, sgn * 17, dy, r, colour)
    }
    s += fillPath(polyD(F, rr(-46, 24, -6, 40, 2)), colour) + circ(F, -17, 24, 5, ground)
    s += fillPath(polyD(F, roundPoly([[6, 40, 2], [6, 30, 4], [14, 22, 3], [20, 26, 3], [46, 26, 4], [46, 40, 2]])), colour) + circ(F, 17, 25, 5, ground)
  }
  if (symbol === 'laser' || symbol === 'uv') {
    const cx = symbol === 'laser' ? -16 : 0, cy = symbol === 'laser' ? 0 : -10
    s += circ(F, cx, cy, 9, colour)
    s += lines(F, Array.from({ length: 8 }, (_, i) => turnPts([[cx, cy - 15], [cx, cy - 24]], [cx, cy], i * 45)), colour, lw * 0.8)
    if (symbol === 'laser') s += lines(F, [[[cx + 8, 0], [38, 0]]], colour, lw * 0.9) + fillPath(polyD(F, [[36, -7], [48, 0], [36, 7]]), colour)
    else if (fits(g, (18 * F.u) / g.k)) s += lettering(g, { x: F.gx(0), y: F.gy(30), h: (18 * F.u) / g.k, text: 'UV', colour, id: `${id}-letters` }).body
    else s += lines(F, [[[-14, 30], [14, 30]]], colour, lw)
  }
  if (symbol === 'snowflake') {
    const arms = []
    for (const a of [0, 60, 120, 180, 240, 300]) { arms.push(turnPts([[0, 0], [0, -42]], [0, 0], a), turnPts([[-9, -34], [0, -26], [9, -34]], [0, 0], a), turnPts([[-7, -18], [0, -12], [7, -18]], [0, 0], a)) }
    s += lines(F, arms, colour, lw * 0.85)
  }
  if (symbol === 'exclamation') s += fillPath(polyD(F, roundPoly([[-6, -40, 4], [6, -40, 4], [4, 16, 2], [-4, 16, 2]])), colour) + circ(F, 0, 30, 6.5, colour)
  if (symbol === 'eyewash') {
    const q = (p0, c, p1) => Array.from({ length: 13 }, (_, i) => { const t = i / 12; return [0, 1].map((k) => (1 - t) ** 2 * p0[k] + 2 * (1 - t) * t * c[k] + t * t * p1[k]) })
    s += fillPath(polyD(F, [...q([-40, 12], [0, -20], [40, 12]), ...q([40, 12], [0, 44], [-40, 12]).slice(1)]), 'none', colour, lw * 0.8) + circ(F, 0, 12, 10, colour)
    s += [-18, 0, 18].map((dx) => fillPath(polyD(F, roundPoly([[dx, -44, 0], [dx + 6, -30, 6], [dx, -24, 6], [dx - 6, -30, 6]])), colour)).join('')
  }
  return { defs: '', body: group(id, F, turn, s), parts: [] }
}

// =====================================================================================================================
// Hazard sign, `size` its width. Options: symbol (as hazardSymbol); shape 'triangle' (warning: yellow, dark border) |
// 'diamond' (GHS pictogram: white, red border) | 'square' (safe condition: green, white symbol) | 'circle'
// (mandatory: blue, white symbol); by default the shape the symbol is usually seen in.
// Used by: Biohazard, Flammable, Corrosive, Laser hazard, Cryogenic, UV hazard, Sharps, Eye wash.
// Example: hazardSign(g, { x: 0, y: 0, size: 30, symbol: 'flame', id: 'sign' })
const SIGN_OF = { flame: 'diamond', corrosive: 'diamond', exclamation: 'diamond', eyewash: 'square' }
export function hazardSign(g, { x, y, size, turn = 0, id = 'hazard-sign', w, symbol = 'biohazard', shape }) {
  const F = frame(g, x, y, size), defs = []
  shape ??= SIGN_OF[symbol] ?? 'triangle'
  w ??= objW(F.px) * 1.3
  let s = '', sym, pal
  if (shape === 'triangle') {
    pal = WARN
    s += fillPath(polyD(F, roundPoly([[0, -44, 7], [50, 42, 7], [-50, 42, 7]])), WARN.base, INK, w) // flat, so the cuts of a symbol match it
    sym = { x: 0, y: 15, size: symbol === 'biohazard' || symbol === 'radiation' ? 54 : 48, colour: INK, ground: WARN.base }
  } else if (shape === 'diamond') {
    pal = GHS
    s += fillPath(polyD(F, roundPoly([[0, -50, 5], [50, 0, 5], [0, 50, 5], [-50, 0, 5]])), PAPER.base, GHS.outline, w * 1.2)
    sym = { x: 0, y: 0, size: 52, colour: INK, ground: PAPER.base }
  } else {
    pal = shape === 'square' ? SAFE : MANDATORY
    s += shape === 'square' ? fillPath(polyD(F, rr(-48, -48, 48, 48, 8)), pal.base, pal.outline, w * 0.8) : circ(F, 0, 0, 47, pal.base, pal.outline, w * 0.8)
    sym = { x: 0, y: 0, size: 62, colour: PAPER.light, ground: pal.base }
  }
  const h = hazardSymbol(g, { x: F.gx(sym.x), y: F.gy(sym.y), size: (sym.size * F.u) / g.k, symbol, colour: sym.colour, ground: sym.ground, id: `${id}-symbol` })
  return { defs: defs.join(''), body: group(id, F, turn, s + h.body), parts: [['sign', pal]] }
}

// =====================================================================================================================
// Lab mouse, side view facing left, `size` its length with the tail. Options: fur 'white' | 'black' | 'brown';
// whiskers (from 80 px on).
// Used by: Mouse cage, Oral gavage, Mouse injection, Metabolic cage, Running wheel, Dissection.
// Example: labMouse(g, { x: 0, y: 0, size: 40, id: 'mouse' })
export function labMouse(g, { x, y, size, turn = 0, id = 'mouse', w, fur = 'white', whiskers }) {
  const F = frame(g, x, y, size), defs = [], pal = FUR[fur]
  w ??= objW(F.px)
  const dy = -4, big = F.px >= 80, cw = Math.max(2, w * 0.75)
  const P = (pts) => pts.map(([a, b]) => [a, b + dy])
  const tail = P([[27, 8], [36, 10], [44, 6], [49, -6]])
  let s = `<g id="${id}-tail">${linePath(polyD(F, tail, false), PINK.outline, Math.max(3.5, 4.4 * F.u + w))}${linePath(polyD(F, tail, false), PINK.shadow, Math.max(1.6, 4.4 * F.u))}</g>`
  s += ell(F, -19, 22 + dy, 4, 2, PINK.shadow, PINK.outline, Math.max(1.2, w * 0.35))
  const body = P([[-46, 10], [-40, 3], [-31, -5], [-20, -11], [-6, -15], [9, -16], [22, -12], [30, -2], [31, 10], [25, 19], [12, 22], [-6, 22], [-20, 20], [-30, 17], [-39, 14], [-44, 13]])
  const n = body.length
  let d = `M${P2(F.P(body[0]))}`
  for (let i = 0; i < n; i++) { const a = body[(i - 1 + n) % n], b = body[i], c = body[(i + 1) % n], e = body[(i + 2) % n]; d += `C${P2(F.P([b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6]))} ${P2(F.P([c[0] - (e[0] - b[0]) / 6, c[1] - (e[1] - b[1]) / 6]))} ${P2(F.P(c))}` }
  s += `<g id="${id}-body">${fillPath(d + 'Z', shade(F, `${id}-gradient`, [-46, -16 + dy, 31, 22 + dy], pal, defs), pal.outline, w)}`
  if (big) s += linePath(polyD(F, P([[-8, -11], [4, -12.6], [14, -11.5], [20, -8]]), false), pal.light, Math.max(2, w * 0.8))
  s += '</g>'
  s += `<g id="${id}-pink">${ell(F, -27, 22.5 + dy, 4.5, 2.2, PINK.shadow, PINK.outline, Math.max(1.2, w * 0.35))}${ell(F, 14, 23 + dy, 7, 2.4, PINK.shadow, PINK.outline, Math.max(1.2, w * 0.35))}`
  s += ell(F, -19, -13 + dy, 9.5, 11, pal.base, pal.outline, cw, -15) + ell(F, -18.5, -13 + dy, 5.8, 7.2, PINK.shadow, '', 0, -15)
  s += circ(F, -45.3, 9.3 + dy, 2.4, PINK.small) + '</g>'
  s += circ(F, -33, -1 + dy, 2.7, DARK.base) + (big ? circ(F, -33.8, -1.9 + dy, 0.9, '#FFFFFF') : '')
  if (whiskers ?? big) s += lines(F, [P([[-40, 8], [-51, 3]]), P([[-40, 10], [-52, 10]]), P([[-40, 12], [-50, 16]])], pal.outline, Math.max(1.2, w * 0.3))
  return { defs: defs.join(''), body: group(id, F, turn, s), parts: [['fur', pal], ['skin', PINK]] }
}

// =====================================================================================================================
// Light beam, left to right, `size` its length. Options: colour (a name of BEAMS or a palette: red, green, blue,
// violet, infrared, white); kind 'line' | 'dashed' | 'wave' (a sine along the beam) | 'sheet' (a light sheet narrowing
// to its waist in the middle); end 'none' | 'head'; width (in page pixels, from the size by default).
// Used by: Spectrophotometer, Confocal, Light-sheet, Two-photon, Laser hazard, Atomic force microscope, Flow cytometry.
// Example: beam(g, { x: 0, y: 0, size: 40, colour: 'green', kind: 'wave', end: 'head', id: 'laser' })
export function beam(g, { x, y, size, turn = 0, id = 'beam', w, colour = 'red', kind = 'line', end = 'none', width }) {
  const F = frame(g, x, y, size), pal = typeof colour === 'string' ? BEAMS[colour] : colour
  width ??= w ?? Math.max(3, F.px * 0.035)
  const xe = end === 'head' ? 50 - (width * 2.4) / F.u : 50
  let s = ''
  if (kind === 'sheet') s += fillPath(polyD(F, [[-50, -10], [0, -2], [50, -10], [50, 10], [0, 2], [-50, 10]]), pal.light, pal.base, Math.max(1.5, width * 0.4)) + lines(F, [[[-50, 0], [xe, 0]]], pal.small, width * 0.6)
  else if (kind === 'wave') s += lines(F, [Array.from({ length: 81 }, (_, i) => { const t = -50 + ((xe + 50) * i) / 80; return [t, Math.sin(((t + 50) / 100) * Math.PI * 2 * 4) * 6] })], pal.small, width)
  else s += linePath(polyD(F, [[-50, 0], [xe, 0]], false), pal.small, width, kind === 'dashed' ? 'butt' : 'round').replace('/>', kind === 'dashed' ? ` stroke-dasharray="${f(width * 2)} ${f(width * 1.4)}"/>` : '/>')
  if (end === 'head') { const hl = (width * 2.6) / F.u, hw = (width * 1.8) / F.u; s += fillPath(polyD(F, [[50 - hl, -hw], [50, 0], [50 - hl, hw]]), pal.small) }
  return { defs: '', body: group(id, F, turn, s), parts: [['beam', pal]] }
}

// ---------- every part and variant, for the sheet ----------
export const DEMOS = [
  { name: 'Test tube', size: 100, draw: (g) => tube(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Test tube, layers', size: 100, draw: (g) => tube(g, { x: 0, y: 0, size: 100, kind: 'blood', cap: 'stopper', layers: [[0.42, 'blood'], [0.05, PAPER], [0.33, 'plasma']] }) },
  { name: 'Microtube', size: 100, draw: (g) => tube(g, { x: 0, y: 0, size: 100, kind: 'micro', level: 0.25 }) },
  { name: 'Microtube, open', size: 100, draw: (g) => tube(g, { x: 0, y: 0, size: 100, kind: 'micro', level: 0.25, open: true, liquid: 'reagent' }) },
  { name: 'Conical tube', size: 100, draw: (g) => tube(g, { x: 0, y: 0, size: 100, kind: 'conical', liquid: 'medium', level: 0.6 }) },
  { name: 'Cryovial', size: 100, draw: (g) => tube(g, { x: 0, y: 0, size: 100, kind: 'vial', label: true, level: 0.3 }) },
  { name: 'Blood tube', size: 100, draw: (g) => tube(g, { x: 0, y: 0, size: 100, kind: 'blood', liquid: 'blood', level: 0.55, label: true, capPal: soft(300) }) },
  { name: 'Fly vial', size: 100, draw: (g) => tube(g, { x: 0, y: 0, size: 100, kind: 'vial', cap: 'plug', material: 'glass', liquid: 'plasma', level: 0.3 }) },
  { name: 'Test tube, small', size: 100, draw: (g) => tube(g, { x: 0, y: 0, size: 18, liquid: 'medium' }) },
  { name: 'Beaker', size: 100, draw: (g) => glassware(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Flask', size: 100, draw: (g) => glassware(g, { x: 0, y: 0, size: 100, kind: 'flask', liquid: 'reagent' }) },
  { name: 'Bottle', size: 100, draw: (g) => glassware(g, { x: 0, y: 0, size: 100, kind: 'bottle', liquid: 'medium', level: 0.75 }) },
  { name: 'Graduated cylinder', size: 100, draw: (g) => glassware(g, { x: 0, y: 0, size: 100, kind: 'cylinder', level: 0.55 }) },
  { name: 'Round-bottom flask', size: 100, draw: (g) => glassware(g, { x: 0, y: 0, size: 100, kind: 'round', level: 0.3 }) },
  { name: 'Jar', size: 100, draw: (g) => glassware(g, { x: 0, y: 0, size: 100, kind: 'jar', liquid: 'reagent', level: 0.55, label: true, capPal: METAL }) },
  { name: 'Petri dish', size: 100, draw: (g) => petriDish(g, { x: 0, y: 0, size: 100, colonies: 9 }) },
  { name: 'Petri dish, cells', size: 100, draw: (g) => petriDish(g, { x: 0, y: 0, size: 100, fill: 'medium', cells: 8 }) },
  { name: 'Petri dish, angled', size: 100, draw: (g) => petriDish(g, { x: 0, y: 0, size: 100, view: 'angled', lawn: true }) },
  { name: 'Well plate', size: 100, draw: (g) => wellPlate(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Well plate, 96', size: 100, draw: (g) => wellPlate(g, { x: 0, y: 0, size: 100, rows: 8, cols: 12, filled: 'all', liquid: 'reagent' }) },
  { name: 'Well plate, angled', size: 100, draw: (g) => wellPlate(g, { x: 0, y: 0, size: 100, view: 'angled', liquid: 'medium' }) },
  { name: 'Tip box', size: 100, draw: (g) => wellPlate(g, { x: 0, y: 0, size: 100, kind: 'tips', rows: 4, cols: 8 }) },
  { name: 'Freezer box', size: 100, draw: (g) => wellPlate(g, { x: 0, y: 0, size: 100, kind: 'box', rows: 5, cols: 5 }) },
  { name: 'Pipette tip', size: 100, draw: (g) => tip(g, { x: 0, y: 0, size: 100, level: 0.3 }) },
  { name: 'Pipette', size: 100, draw: (g) => pipette(g, { x: 0, y: 0, size: 100, level: 0.3 }) },
  { name: 'Multichannel pipette', size: 100, draw: (g) => pipette(g, { x: 0, y: 0, size: 100, kind: 'multi', channels: 8 }) },
  { name: 'Serological pipette', size: 100, draw: (g) => pipette(g, { x: 0, y: 0, size: 100, kind: 'serological', level: 0.4, liquid: 'medium' }) },
  { name: 'Syringe', size: 100, draw: (g) => syringe(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Syringe, gavage', size: 100, draw: (g) => syringe(g, { x: 0, y: 0, size: 100, needle: 'gavage', liquid: 'plasma' }) },
  { name: 'Syringe filter', size: 100, draw: (g) => syringe(g, { x: 0, y: 0, size: 100, needle: 'filter', liquid: 'medium', level: 0.7 }) },
  { name: 'Screen, trace', size: 100, draw: (g) => screen(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Screen, peaks', size: 100, draw: (g) => screen(g, { x: 0, y: 0, size: 100, show: 'peaks' }) },
  { name: 'Screen, number', size: 100, draw: (g) => screen(g, { x: 0, y: 0, size: 100, show: 'number', text: '7.40' }) },
  { name: 'Screen, gel bands', size: 100, draw: (g) => screen(g, { x: 0, y: 0, size: 100, show: 'bands' }) },
  { name: 'Instrument', size: 100, draw: (g) => instrument(g, { x: 0, y: 0, size: 100, buttons: 2, knob: true }) },
  { name: 'Instrument, drawer', size: 100, draw: (g) => instrument(g, { x: 0, y: 0, size: 100, aspect: 0.55, screen: 'bars', drawer: true, buttons: 1 }) },
  { name: 'Instrument, door', size: 100, draw: (g) => instrument(g, { x: 0, y: 0, size: 100, aspect: 1.2, screen: 'number', text: '37', door: 'window', shelves: 2, buttons: 0, feet: true }) },
  { name: 'Instrument, round door', size: 100, draw: (g) => instrument(g, { x: 0, y: 0, size: 100, aspect: 0.85, screen: false, door: 'round', buttons: 1, lamp: 'red' }) },
  { name: 'Instrument, lid', size: 100, draw: (g) => instrument(g, { x: 0, y: 0, size: 100, aspect: 0.8, lid: 'slant', screen: 'trace', buttons: 1 }) },
  { name: 'Freezer', size: 100, draw: (g) => instrument(g, { x: 0, y: 0, size: 100, aspect: 1.6, screen: 'number', text: '-80', door: 'solid', buttons: 0, lamp: false, pal: soft(230) }) },
  { name: 'Microscope', size: 100, draw: (g) => microscope(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Microscope, stereo', size: 100, draw: (g) => microscope(g, { x: 0, y: 0, size: 100, kind: 'stereo' }) },
  { name: 'Microscope, electron', size: 100, draw: (g) => microscope(g, { x: 0, y: 0, size: 100, kind: 'electron' }) },
  ...['biohazard', 'radiation', 'flame', 'corrosive', 'laser', 'uv', 'snowflake', 'exclamation', 'eyewash'].map((sym) => ({ name: `Hazard sign, ${sym}`, size: 100, draw: (g) => hazardSign(g, { x: 0, y: 0, size: 100, symbol: sym }) })),
  { name: 'Hazard symbol, snowflake', size: 100, draw: (g) => hazardSymbol(g, { x: 0, y: 0, size: 100, symbol: 'snowflake', colour: ACCENT.outline }) },
  { name: 'Lab mouse', size: 100, draw: (g) => labMouse(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Lab mouse, black', size: 100, draw: (g) => labMouse(g, { x: 0, y: 0, size: 100, fur: 'black' }) },
  { name: 'Light beam', size: 100, draw: (g) => beam(g, { x: 0, y: 0, size: 100, end: 'head' }) },
  { name: 'Light beam, wave', size: 100, draw: (g) => beam(g, { x: 0, y: 0, size: 100, kind: 'wave', colour: 'green' }) },
  { name: 'Light sheet', size: 100, draw: (g) => beam(g, { x: 0, y: 0, size: 100, kind: 'sheet', colour: 'blue' }) },
]
