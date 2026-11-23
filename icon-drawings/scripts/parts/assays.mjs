// Shared parts of the redrawn icons, group "assays": what the icons of "Techniques & assays" have in common. A plot (axes
// with curves, points, bars, steps or sticks, and ready-made data for the usual plots), a blot, gel or TLC plate, an
// array of spots or wells, a culture plate with what grows on it, a microscope image field, a stained tissue section on a
// slide, the C. elegans worm (promoted from ../lab/lb12.mjs), a mouse seen from above, a behavioural arena (water maze,
// plus maze, T-maze, open field), a person (bust), a timeline, a badge (check, cross, no), a glass micropipette, optic
// fibre or electrode, and a hot spot of signal. Each part is a function `part(g, { x, y, size, turn, id, w, pal, ...options })`
// that returns { defs, body, parts }, drawn in the frame `g` of `page()` (../cellkit.mjs), designed in a box of 100 local
// units on its longer side, as the parts of lab.mjs. `size` is the longer extent in g's units, outline included; `turn`
// turns it about x, y (degrees, clockwise); `w` overrides the main outline in page pixels (`objW` of lab.mjs otherwise).
// Every id inside starts with `id`. Shapes are SiliCoDraw's (its "Techniques & assays" icons), drawn again in the soft look.
//
// ---------- Conventions of assays (on top of those of objects in lab.mjs) ----------
// Things are objects: cards, membranes, plates, slides, mazes and glass are the greys of lab.mjs (PAPER, PLASTIC, GLASS,
//   METAL, DARK) with the one ACCENT blue, shaded only from 80 px, never glossed. Pictures of data (a plot, an image
//   field, a section, a blot) are flat: no gloss and no highlight on what they show, whatever its size.
// Plots: a PAPER card (as the approved Flow cytometry), axes in lab's INK at 0.8 of the outline, thresholds and gates
//   dashed in GRID (a mid grey). Data series in SERIES order: ACCENT (267), red deep(25) (as Flow cytometry's gate),
//   green deep(150), amber rich(70), violet deep(310); points that do not count (a volcano's middle) in MUTED grey.
//   Lines in a series' outline tone, points and bars in its small tone with an outline. Letters (axis names) are left to
//   the icon and drawn only with letters.mjs.
// Blots and gels: a western blot is a PAPER membrane with bands in BAND, a dark ink grey, their strength mixed towards the
//   membrane; a gel is DARK with bands in GEL, a warm glow (rich 75); a TLC plate is PAPER with spots in SERIES colours.
// Plates of spots: a microarray is a DARK chip with spots in the fluorescent colours of cellforms.mjs (RFP, GFP, YFP);
//   ELISA wells take the yellow of a stopped TMB reaction (ELISA_YELLOW, rich 95) by value; screening hits are red
//   (SERIES[1]) among pale accent wells.
// Culture plates: lab.mjs's petri dish with AGAR, COLONY and LAWN; filters and ELISpot membranes PAPER white; crystal
//   violet and ELISpot spots VIOLET (deep 300); a second kind of colony deep(150).
// Images: fluorescence on a near-black grey ground (FIELD.dark) with GFP, RFP and DAPI of cellforms.mjs; each spot or
//   cell with one flat halo (its colour mixed into the ground), no opacity or blur. Phase contrast on a mid grey with a
//   white halo and dark rim round each cell; brightfield on a pale grey.
// Stains: H&E eosin pink (350) with haematoxylin nuclei (290); IHC a pale grey section, haematoxylin nuclei blue (270) and
//   DAB brown (60) in positive cells; Masson trichrome red muscle (20), blue collagen (250), black-grey nuclei; spatial
//   spots in SERIES colours (green, amber, violet, accent) on a pale pink section.
// Animals and people: the worm is lb12's C. elegans (soft 40); the mouse from above has lab.mjs's FUR and PINK; people
//   are busts without faces, skin soft(PEACH) and clothes in a palette passed as `pal` (ACCENT by default).
// Marks: timelines and arrows in lab's INK; badges as lab's safe and prohibition signs: a check on green (SAFE), a cross or
//   a no sign in red (deep 27, as GHS), the mark white. Hot spots: rings from red deep(25) through orange rich(65) to a
//   yellow rich(102) centre, flat (IVIS, PET, fMRI).
import { NUC, PEACH, smoothD } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex } from '../colour.mjs'
import { catmull, f } from '../shapes.mjs'
import { DAPI, GFP, RFP, YFP } from './cellforms.mjs'
import { ACCENT, AGAR, BEAMS, COLONY, DARK, FUR, GLASS, INK, LAWN, LIQUIDS, METAL, PAPER, PINK, PLASTIC, SAFE, objW, petriDish } from './lab.mjs'
import { fits, lettering, textWidth } from './letters.mjs'

// ---------- palettes ----------
const greyPal = (h, l, c = 0.006) => ({ light: toHex({ l: Math.min(0.997, l + 0.03), c: c * 0.5, h }), base: toHex({ l, c, h }), shadow: toHex({ l: l - 0.05, c, h }), small: toHex({ l: l - 0.12, c, h }), outline: toHex({ l: Math.min(0.58, l - 0.25), c: 0.011, h }) })
/** A stain in one hue: base l 0.86 at chroma c, small and outline deeper. */
const stainPal = (h, c = 0.09) => ({ light: toHex({ l: 0.96, c: c * 0.3, h }), base: toHex({ l: 0.86, c, h }), shadow: toHex({ l: 0.8, c: c * 1.15, h }), small: toHex({ l: 0.6, c: c * 1.4, h }), outline: toHex({ l: 0.52, c: c * 1.25, h }) })
export const SERIES = [ACCENT, deep(hueOf('#d64545')), deep(150), rich(70), deep(310)]
export const MUTED = greyPal(250, 0.82)
export const GRID = toHex({ l: 0.66, c: 0.008, h: 250 })
export const BAND = { light: toHex({ l: 0.6, c: 0.01, h: 260 }), base: toHex({ l: 0.32, c: 0.012, h: 260 }), shadow: toHex({ l: 0.28, c: 0.012, h: 260 }), small: toHex({ l: 0.32, c: 0.012, h: 260 }), outline: toHex({ l: 0.25, c: 0.01, h: 260 }) }
export const GEL = rich(75)
export const ELISA_YELLOW = rich(95)
export const HIT = SERIES[1]
export const VIOLET = deep(300)
export const COLONY2 = deep(150)
export const FIELD = { dark: greyPal(265, 0.25, 0.008), phase: greyPal(90, 0.72, 0.005), bright: greyPal(90, 0.96, 0.005) }
export const STAIN = { eosin: stainPal(350, 0.08), haematoxylin: stainPal(290, 0.11), counter: stainPal(270, 0.07), dab: { ...stainPal(60, 0.09), base: toHex({ l: 0.62, c: 0.09, h: 60 }), small: toHex({ l: 0.45, c: 0.08, h: 60 }) }, muscle: stainPal(20, 0.1), collagen: stainPal(250, 0.1), section: greyPal(90, 0.95, 0.006), nuclei: greyPal(300, 0.4, 0.008), pink: stainPal(350, 0.04) }
export const WORM = soft(40)
export const SKIN = soft(PEACH)
export const SIGN_RED = deep(27)
export const HEAT = [deep(20), rich(65), rich(102)]

// ---------- helpers ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const rad = (d) => (d * Math.PI) / 180
function rng(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
const P2 = ([x, y]) => `${f(x)},${f(y)}`
const frame = (g, x, y, size) => {
  const cx = g.X(x), cy = g.Y(y), px = size * g.k, u = px / 100
  return { g, x, y, cx, cy, px, u, P: ([a, b]) => [cx + a * u, cy + b * u], gx: (a) => x + (a * u) / g.k, gy: (b) => y + (b * u) / g.k }
}
const group = (id, F, turn, inner) => `<g id="${id}"${turn ? ` transform="rotate(${f(turn)} ${f(F.cx)} ${f(F.cy)})"` : ''}>${inner}</g>`
const stroked = (s, w) => (s ? ` stroke="${s}" stroke-width="${f(w)}" stroke-linejoin="round"` : '')
const polyD = (F, pts, close = true) => `M${pts.map((p) => P2(F.P(p))).join(' L')}${close ? 'Z' : ''}`
const smoothIn = (F, pts) => smoothD(pts.map(F.P))
const fillPath = (d, fill, s = '', w = 0) => `<path d="${d}" fill="${fill}"${stroked(s, w)}/>`
const linePath = (d, colour, w, cap = 'round', extra = '') => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"${extra}/>`
const dashed = (w) => ` stroke-dasharray="${f(w * 2.2)} ${f(w * 1.6)}"`
const circ = (F, x, y, r, fill, s = '', w = 0) => { const [cx, cy] = F.P([x, y]); return `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * F.u)}" fill="${fill}"${stroked(s, w)}/>` }
const ell = (F, x, y, rx, ry, fill, s = '', w = 0, r = 0) => { const [cx, cy] = F.P([x, y]); return `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx * F.u)}" ry="${f(ry * F.u)}"${r ? ` transform="rotate(${f(r)} ${f(cx)} ${f(cy)})"` : ''} fill="${fill}"${stroked(s, w)}/>` }
const rect = (F, x0, y0, x1, y1, r, fill, s = '', w = 0) => { const [a, b] = F.P([x0, y0]); return `<rect x="${f(a)}" y="${f(b)}" width="${f((x1 - x0) * F.u)}" height="${f((y1 - y0) * F.u)}" rx="${f(Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2) * F.u)}" fill="${fill}"${stroked(s, w)}/>` }
const lines = (F, segs, colour, w, cap = 'round', extra = '') => linePath(segs.map((s) => polyD(F, s, false)).join(' '), colour, w, cap, extra)
/** A path given in local units with absolute commands (M L C Q Z), moved onto the page. */
const D = (F, d) => d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, a, b) => P2(F.P([+a, +b])))
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
/** A colour between a and b (share t of b), mixed in sRGB. */
export const mixHex = (a, b, t) => '#' + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t).toString(16).padStart(2, '0')).join('').toUpperCase()
const grad = (id, F, [x0, y0, x1, y1], pal) => {
  const [a, b] = F.P([x0, y0]), [c, d] = F.P([x1, y1])
  return `<linearGradient id="${id}" x1="${f(a)}" y1="${f(b)}" x2="${f(c)}" y2="${f(d)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`
}
/** Fill of a shaded object: its gradient from 80 px on, its base below. */
const shade = (F, id, box, pal, defs) => { if ((F.px * Math.max(box[2] - box[0], box[3] - box[1])) / 100 >= 80) { defs.push(grad(id, F, box, pal)); return `url(#${id})` } return pal.base }
/** A lumpy closed outline round 0,0 (rx, ry), `n` points, `lump` the share the radius varies. */
const blobPts = (cx, cy, rx, ry, n, lump, rnd, rot0 = 0) => Array.from({ length: n }, (_, i) => { const t = (i / n) * Math.PI * 2 + rot0, k = 1 + (rnd() - 0.5) * 2 * lump; return [cx + rx * k * Math.cos(t), cy + ry * k * Math.sin(t)] })
/** Spread `n` points of radius r inside a circle of radius R (or a box), apart from each other; seeded. */
const scatter = (n, { R, box, r, gap = 1.15, seed = 1, tries = 400 }) => {
  const rnd = rng(seed * 7919 + 13), out = []
  for (let k = 0; k < tries && out.length < n; k++) {
    const p = box ? [box[0] + r + rnd() * (box[2] - box[0] - 2 * r), box[1] + r + rnd() * (box[3] - box[1] - 2 * r)] : (() => { const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * (R - r); return [d * Math.cos(a), d * Math.sin(a)] })()
    if (out.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) > 2 * r * gap)) out.push(p)
  }
  return out
}
const uniq = (parts) => parts.filter(([, p], i) => parts.findIndex(([, q]) => q.base === p.base) === i)

// =====================================================================================================================
// Plot: axes on a card with data, `size` its longer side. Options: aspect (height / width, 0.85); card (a PAPER card, true);
// axes 'L' | 'none'; arrows (heads on the axes, false); ticks (number of ticks along x, 0); show (ready-made data, below);
// series [{ kind, data | fn, pal, r, width, dots }] instead of or after `show`, where kind is 'line' (smooth through
// data), 'trace' (straight segments), 'step', 'points', 'bars' (data [u, v, err]), 'sticks' or 'gate' (a dashed outline),
// data in shares of the plot area (u 0 left to 1 right, v 0 bottom to 1 top), fn(u) → v sampled; hlines and vlines
// (values, or [value, extent] to stop a line at that height or width), dashed in GRID.
// show: 'growth' (lag, log and stationary phases), 'qpcr' (three amplification curves and a threshold), 'saturation'
// (Michaelis–Menten with Vmax and Km), 'spike' (an action potential), 'steps' (a hypnogram), 'spectrum' (mass
// spectrum sticks), 'volcano', 'manhattan', 'clusters' (UMAP), 'sensorgram' (SPR), 'bars' (with error bars), 'trend'
// (measurements over a dashed baseline), 'scatter' (points and a fitted line), 'trace' (a bare recording, no card or axes).
// Used by: Mass spectrum, Volcano plot, Manhattan plot, UMAP / clusters, Growth curve, qPCR curves, Enzyme kinetics,
// Action potential, Surface plasmon resonance, Baseline, Hypnogram, Insulin clamp, Aging cell atlas, Pseudotime trajectory,
// MAG binning, Lipidomics, Microsensor profile, DNA methylation array; as a trace: Patch clamp, Recording electrode,
// Wearable sensor, Calcium imaging, Diastolic dysfunction.
// Example: plot(g, { x: 0, y: 0, size: 60, show: 'volcano', id: 'volcano' })
const sig = (u, c, k = 14) => 1 / (1 + Math.exp(-(u - c) * k))
export const PLOTS = {
  growth: { series: [{ kind: 'line', fn: (u) => 0.08 + 0.74 * sig(u, 0.42, 13) - 0.08 * Math.max(0, u - 0.8) * 5 }], vlines: [0.27, 0.66] },
  qpcr: { series: [0, 2, 3].map((c, i) => ({ kind: 'line', fn: (u) => 0.06 + 0.8 * sig(u, 0.42 + 0.13 * i, 15), pal: SERIES[c] })), hlines: [0.3] },
  saturation: { series: [{ kind: 'line', fn: (u) => (0.92 * (u + 0.01)) / (0.17 + u) }], hlines: [0.92], vlines: [[0.17, 0.44]] },
  spike: { series: [{ kind: 'line', data: [[0, 0.32], [0.22, 0.32], [0.3, 0.38], [0.36, 0.95], [0.41, 0.88], [0.46, 0.3], [0.52, 0.08], [0.62, 0.12], [0.76, 0.3], [1, 0.32]] }], hlines: [0.32] },
  steps: { series: [{ kind: 'step', data: [[0, 0.92], [0.1, 0.66], [0.22, 0.36], [0.35, 0.14], [0.47, 0.36], [0.56, 0.66], [0.64, 0.36], [0.74, 0.14], [0.84, 0.66], [0.93, 0.92], [1, 0.92]] }] },
  spectrum: { series: [{ kind: 'sticks', data: [[0.06, 0.38], [0.13, 0.7], [0.21, 0.19], [0.28, 0.62], [0.36, 1], [0.43, 0.48], [0.51, 0.29], [0.58, 0.81], [0.66, 0.52], [0.74, 0.19], [0.83, 0.43], [0.9, 0.14]] }] },
  volcano: {
    series: [
      { kind: 'points', pal: MUTED, data: [[0.42, 0.12], [0.51, 0.07], [0.47, 0.22], [0.55, 0.17], [0.4, 0.31], [0.58, 0.36], [0.49, 0.43], [0.45, 0.5], [0.6, 0.48], [0.36, 0.41], [0.53, 0.58]] },
      { kind: 'points', pal: SERIES[0], data: [[0.22, 0.68], [0.16, 0.8], [0.27, 0.85], [0.11, 0.92], [0.2, 0.46], [0.29, 0.56]] },
      { kind: 'points', pal: SERIES[1], data: [[0.75, 0.7], [0.82, 0.85], [0.73, 0.9], [0.89, 0.78], [0.8, 0.5], [0.69, 0.6], [0.92, 0.95]] },
    ],
    hlines: [0.6], vlines: [0.33, 0.66],
  },
  manhattan: (() => {
    const a = [], b = []
    for (let i = 0; i < 14; i++) { const n = i === 7 ? 6 : 3, s = Math.floor(i / 2) % 2 ? b : a; for (let k = 0; k < n; k++) s.push([0.05 + i * 0.068 + (k % 2 ? 0.012 : -0.012), 0.08 + k * (i === 7 ? 0.15 : 0.1) + ((i * 7) % 5) * 0.025]) }
    return { series: [{ kind: 'points', data: a, pal: SERIES[0], r: 2.6 }, { kind: 'points', data: b, pal: SERIES[3], r: 2.6 }], hlines: [0.8] }
  })(),
  clusters: (() => {
    const rnd = rng(5), g = () => Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(6.2832 * rnd())
    const cl = (cx, cy, n) => Array.from({ length: n }, () => [cx + g() * 0.07, cy + g() * 0.06])
    return { series: [{ kind: 'points', data: cl(0.27, 0.72, 7), pal: SERIES[0] }, { kind: 'points', data: cl(0.74, 0.74, 7), pal: SERIES[3] }, { kind: 'points', data: cl(0.55, 0.25, 7), pal: SERIES[2] }], arrows: true }
  })(),
  sensorgram: { series: [{ kind: 'line', fn: (u) => (u < 0.12 ? 0.08 : u < 0.55 ? 0.08 + 0.72 * (1 - Math.exp(-(u - 0.12) * 9)) : 0.08 + 0.72 * (1 - Math.exp(-0.43 * 9)) * Math.exp(-(u - 0.55) * 3.2)) }], vlines: [0.12, 0.55] },
  bars: { series: [{ kind: 'bars', data: [[0.2, 0.42, 0.07]], pal: SERIES[0] }, { kind: 'bars', data: [[0.5, 0.78, 0.08]], pal: SERIES[1] }, { kind: 'bars', data: [[0.8, 0.58, 0.06]], pal: SERIES[2] }] },
  trend: { series: [{ kind: 'trace', data: [[0.06, 0.36], [0.24, 0.34], [0.42, 0.55], [0.6, 0.68], [0.78, 0.82], [0.95, 0.88]], dots: true }], hlines: [0.35] },
  scatter: { series: [{ kind: 'points', data: [[0.12, 0.2], [0.22, 0.34], [0.3, 0.26], [0.42, 0.5], [0.5, 0.44], [0.6, 0.62], [0.7, 0.58], [0.8, 0.78], [0.9, 0.8]] }, { kind: 'line', data: [[0.06, 0.18], [0.95, 0.86]], pal: SERIES[1] }] },
  trace: { card: false, axes: 'none', series: [{ kind: 'trace', data: [[0, 0.5], [0.16, 0.5], [0.21, 0.92], [0.28, 0.06], [0.34, 0.74], [0.39, 0.5], [0.6, 0.5], [0.65, 0.92], [0.72, 0.06], [0.78, 0.74], [0.83, 0.5], [1, 0.5]] }], aspect: 0.4 },
}
export function plot(g, { x, y, size, turn = 0, id = 'plot', w, aspect, card, axes, arrows, ticks = 0, show, series = [], hlines, vlines }) {
  const pre = show ? (typeof show === 'string' ? PLOTS[show] : show) : {}
  aspect ??= pre.aspect ?? 0.85; card ??= pre.card ?? true; axes ??= pre.axes ?? 'L'; arrows ??= pre.arrows ?? false
  hlines ??= pre.hlines ?? []; vlines ??= pre.vlines ?? []
  const all = [...(pre.series ?? []), ...series]
  const F = frame(g, x, y, size), defs = []
  w ??= objW(F.px)
  const W = aspect <= 1 ? 100 : 100 / aspect, H = aspect <= 1 ? 100 * aspect : 100, fine = Math.max(1.5, w * 0.45)
  const m = card ? 11 : axes === 'none' ? 2 : 5
  const x0 = -W / 2 + m, x1 = W / 2 - m * 0.75, y0 = H / 2 - m, y1 = -H / 2 + m * 0.75
  const X = (u) => x0 + 3 + (x1 - x0 - 3) * u, Y = (v) => y0 - 3 - (y0 - y1 - 3) * v
  let s = ''
  if (card) s += `<g id="${id}-card">${rect(F, -W / 2, -H / 2, W / 2, H / 2, 6, shade(F, `${id}-gradient`, [-W / 2, -H / 2, W / 2, H / 2], PAPER, defs), PAPER.outline, w)}</g>`
  let ax = ''
  if (axes !== 'none') {
    ax += lines(F, [[[x0, y1], [x0, y0], [x1, y0]]], INK, w * 0.8)
    if (arrows) { const h = (w * 2.2) / F.u, hw = (w * 1.6) / F.u; ax += fillPath(polyD(F, [[x0, y1 - h * 0.6], [x0 - hw, y1 + h * 0.6], [x0 + hw, y1 + h * 0.6]]), INK, INK, fine * 0.6) + fillPath(polyD(F, [[x1 + h * 0.6, y0], [x1 - h * 0.6, y0 - hw], [x1 - h * 0.6, y0 + hw]]), INK, INK, fine * 0.6) }
    if (ticks && F.px >= 60) ax += lines(F, Array.from({ length: ticks }, (_, i) => { const u = X((i + 1) / (ticks + 1)); return [[u, y0], [u, y0 + 3]] }), INK, fine)
  }
  // thresholds under the data
  const dl = Math.max(1.4, w * 0.5)
  const hl = hlines.map((h) => { const [v, e = 1] = [].concat(h); return [[X(0) - 3, Y(v)], [X(e), Y(v)]] }), vl = vlines.map((h) => { const [u, e = 1] = [].concat(h); return [[X(u), Y(0) + 3], [X(u), Y(e)]] })
  if (hl.length + vl.length) ax += lines(F, [...hl, ...vl], GRID, dl, 'butt', dashed(dl))
  s += `<g id="${id}-axes">${ax}</g>`
  const parts = card ? [['card', PAPER]] : []
  all.forEach((se, i) => {
    const pal = se.pal ?? SERIES[0], kind = se.kind ?? 'line'
    let data = se.data ?? Array.from({ length: 41 }, (_, k) => [k / 40, se.fn(k / 40)])
    const lw = se.width ?? Math.max(2, w * 1.05), r = Math.max(se.r ?? 3.4, 2.4 / F.u), pw = F.px >= 50 ? fine * 0.8 : 0
    let d = ''
    const pts = data.map(([u, v]) => [X(u), Y(v)])
    if (kind === 'line') d += lines(F, [se.data ? catmull(pts, 12) : pts], pal.outline, lw)
    if (kind === 'trace') d += lines(F, [pts], pal.outline, lw)
    if (kind === 'step') d += lines(F, [pts.flatMap((p, k) => (k ? [[p[0], pts[k - 1][1]], p] : [p]))], pal.outline, lw)
    if (kind === 'sticks') d += lines(F, data.map(([u, v]) => [[X(u), Y(0) + 2.5], [X(u), Y(v)]]), pal.outline, lw, 'butt')
    if (kind === 'gate') d += linePath(polyD(F, pts), pal.outline, w * 0.7, 'butt', dashed(w * 0.7))
    if (kind === 'points' || se.dots) d += data.map(([u, v]) => circ(F, X(u), Y(v), kind === 'points' ? r : r * 0.9, pal.small, pw ? pal.outline : '', pw)).join('')
    if (kind === 'bars') data.forEach(([u, v, e]) => {
      const bw = se.barWidth ?? 15
      d += rect(F, X(u) - bw / 2, Y(v), X(u) + bw / 2, Y(0) + 3 - (w * 0.4) / F.u, 1.5, pal.small, pal.outline, fine * 1.2)
      if (e && F.px >= 50) d += lines(F, [[[X(u), Y(v + e)], [X(u), Y(v)]], [[X(u) - 3, Y(v + e)], [X(u) + 3, Y(v + e)]]], pal.outline, fine * 1.2)
    })
    s += `<g id="${id}-series${i + 1}">${d}</g>`
    parts.push([`series ${i + 1}`, pal])
  })
  return { defs: defs.join(''), body: group(id, F, turn, s), parts: uniq(parts) }
}

// =====================================================================================================================
// Blot, gel or TLC plate, `size` its longer side. Options: kind 'western' (a PAPER membrane, dark bands, a loading row) |
// 'gel' (agarose, DARK, wells at the top, glowing bands) | 'tlc' (an upright silica plate with an origin line, a dashed
// solvent front and coloured spots); lanes (4); bands [[lane, v, strength], …] (v from 0 top to 1 bottom of the lanes,
// strength 0–1) instead of the usual pattern; loading (western: a second row of even bands, true); ladder (the first lane
// a size ladder, false); spots (tlc: [[lane, v, palette], …]).
// Used by: Western blot, Gel electrophoresis, TLC plate, DNA methylation array (bands), Serology.
// Example: blot(g, { x: 0, y: 0, size: 50, kind: 'gel', ladder: true, id: 'gel' })
export function blot(g, { x, y, size, turn = 0, id = 'blot', w, kind = 'western', lanes = 4, bands, loading = true, ladder = false, spots }) {
  const F = frame(g, x, y, size), defs = []
  w ??= objW(F.px)
  const fine = Math.max(1.4, w * 0.45), parts = []
  let s = ''
  if (kind === 'tlc') {
    const W = 56, H = 100, n = lanes === 4 ? 2 : lanes
    s += `<g id="${id}-plate">${rect(F, -W / 2, -H / 2, W / 2, H / 2, 3, shade(F, `${id}-gradient`, [-W / 2, -H / 2, W / 2, H / 2], PAPER, defs), PAPER.outline, w)}`
    s += lines(F, [[[-W / 2 + 5, 33], [W / 2 - 5, 33]]], GRID, fine) + '</g>'
    s += `<g id="${id}-front">${lines(F, [[[-W / 2 + 5, -38], [W / 2 - 5, -38]]], ACCENT.outline, fine * 1.2, 'butt', dashed(fine * 1.2))}</g>`
    spots ??= [[0, 0.62, SERIES[1]], [0, 0.32, SERIES[2]], [1, 0.75, SERIES[3]], [1, 0.16, SERIES[0]]]
    const LX = (l) => -W / 2 + (W * (l + 0.5)) / n
    s += `<g id="${id}-spots">${spots.map(([l, v, p]) => ell(F, LX(l), 33 - v * 71, 6.5, 5, p.small)).join('')}</g>`
    parts.push(['plate', PAPER], ['front', ACCENT], ...spots.map(([, , p], i) => [`spot ${i + 1}`, p]))
    return { defs: defs.join(''), body: group(id, F, turn, s), parts: uniq(parts) }
  }
  const gel = kind === 'gel', W = 100, H = gel ? 76 : 64, n = lanes + (ladder ? 1 : 0)
  const mat = gel ? DARK : PAPER, ink = gel ? GEL.base : BAND.base, ground = gel ? DARK.base : PAPER.base
  s += `<g id="${id}-${gel ? 'gel' : 'membrane'}">${rect(F, -W / 2, -H / 2, W / 2, H / 2, gel ? 4 : 3, gel ? DARK.base : shade(F, `${id}-gradient`, [-W / 2, -H / 2, W / 2, H / 2], PAPER, defs), mat.outline, w)}`
  const pad = 8, lw = (W - 2 * pad) / n, LX = (l) => -W / 2 + pad + lw * (l + 0.5), top = -H / 2 + (gel ? 13 : 9), bot = H / 2 - 7
  if (gel) s += Array.from({ length: n }, (_, l) => rect(F, LX(l) - lw * 0.36, -H / 2 + 5, LX(l) + lw * 0.36, -H / 2 + 9.5, 1, DARK.shadow, DARK.outline, fine)).join('')
  s += '</g>'
  const band = (l, v, st, hgt) => { const bh = hgt * (0.75 + 0.35 * st), yy = top + (bot - top) * v; return rect(F, LX(l) - lw * 0.38, yy - bh / 2, LX(l) + lw * 0.38, yy + bh / 2, bh / 2, mixHex(ground, ink, 0.3 + 0.7 * st)) }
  const L0 = ladder ? 1 : 0
  bands ??= gel ? [[0, 0.3, 0.9], [1, 0.3, 0.6], [1, 0.55, 0.9], [2, 0.42, 1], [3, 0.3, 0.5], [3, 0.7, 0.8]].filter(([l]) => l < lanes)
    : Array.from({ length: lanes }, (_, l) => [l, 0.22, [0.95, 0.75, 0.4, 0.95, 0.6, 0.85][l % 6]])
  let b = bands.map(([l, v, st]) => band(l + L0, v, st, gel ? 4.6 : 7)).join('')
  if (!gel && loading) b += Array.from({ length: lanes }, (_, l) => band(l + L0, 0.78, 0.8, 5.5)).join('')
  if (ladder) b += [0.1, 0.22, 0.34, 0.48, 0.64, 0.84].map((v, i) => band(0, v, i === 3 ? 0.85 : 0.5, gel ? 2.6 : 3)).join('')
  s += `<g id="${id}-bands">${b}</g>`
  parts.push([gel ? 'gel' : 'membrane', mat], ['bands', gel ? GEL : BAND])
  return { defs: defs.join(''), body: group(id, F, turn, s), parts }
}

// =====================================================================================================================
// Array of spots or wells seen from above, `size` its longer side. Options: rows, cols (8 × 8); ground 'dark' (a DARK
// chip: microarray) | 'light' (a PLASTIC plate); wells (each spot a ring well, false; true for 'light' by default);
// colours (palettes the spots cycle through in a scattered order: RFP, GFP, YFP); values (a rows × cols array of 0–1:
// each well mixed from pale to `ramp`); ramp (ELISA_YELLOW); hits ([[row, col], …] red among pale accent wells).
// Used by: Microarray, ELISA, Drug screening, Spatial transcriptomics (slide), DNA methylation array, Biobank (box top).
// Example: spotArray(g, { x: 0, y: 0, size: 50, ground: 'light', rows: 4, cols: 6, hits: [[1, 2]], id: 'screen' })
export function spotArray(g, { x, y, size, turn = 0, id = 'spot-array', w, rows = 8, cols = 8, ground = 'dark', wells, colours, values, ramp = ELISA_YELLOW, hits }) {
  const F = frame(g, x, y, size), defs = []
  w ??= objW(F.px)
  wells ??= ground === 'light'
  const dark = ground === 'dark', fine = Math.max(1.2, w * 0.4)
  const pitch = Math.min(100 / (cols + 0.9), 100 / (rows + 0.9)), W = pitch * (cols + 0.9), H = pitch * (rows + 0.9)
  const mat = dark ? DARK : PLASTIC
  let s = `<g id="${id}-${dark ? 'chip' : 'plate'}">${rect(F, -W / 2, -H / 2, W / 2, H / 2, pitch * 0.5, dark ? DARK.base : shade(F, `${id}-gradient`, [-W / 2, -H / 2, W / 2, H / 2], mat, defs), mat.outline, w)}`
  const C = (c) => -W / 2 + pitch * (c + 0.95), R = (r) => -H / 2 + pitch * (r + 0.95), rr = pitch * (wells ? 0.4 : 0.34)
  if (wells) s += Array.from({ length: rows * cols }, (_, i) => circ(F, C(i % cols), R(Math.floor(i / cols)), rr, PLASTIC.shadow, F.px >= 50 ? PLASTIC.outline : '', fine)).join('')
  s += '</g>'
  const parts = [[dark ? 'chip' : 'plate', mat]]
  let c = ''
  // pale to the small tone over the first 60 %, then on to a full colour of the same hue (darkening it turns yellow khaki)
  const full = toHex({ l: 0.8, c: 0.17, h: hueOf(ramp.small) }), tone = (v) => (v < 0.6 ? mixHex(ramp.light, ramp.small, v / 0.6) : mixHex(ramp.small, full, (v - 0.6) / 0.4))
  if (values) { values.forEach((row, r) => row.forEach((v, k) => { if (v > 0) c += circ(F, C(k), R(r), rr * 0.78, tone(v)) })); parts.push(['colour', ramp]) }
  else if (hits) {
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) { const hit = hits.some(([a, b]) => a === r && b === k); c += circ(F, C(k), R(r), rr * 0.78, hit ? HIT.small : ACCENT.base, hit && F.px >= 50 ? HIT.outline : '', fine) }
    parts.push(['wells', ACCENT], ['hits', HIT])
  } else {
    colours ??= dark ? [RFP, GFP, YFP] : [ACCENT, SERIES[1], SERIES[2]]
    const tone = (p, j) => (j === colours.length ? p.small : p.base)
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) { const j = (r * 7 + k * 3) % (colours.length + 1), p = colours[j % colours.length]; c += circ(F, C(k), R(r), rr, tone(p, j)) }
    colours.forEach((p, i) => parts.push([`spots ${i + 1}`, p]))
  }
  s += `<g id="${id}-spots">${c}</g>`
  return { defs: defs.join(''), body: group(id, F, turn, s), parts: uniq(parts) }
}

// =====================================================================================================================
// Culture plate from above (lab.mjs's petri dish with what grows on it), `size` its width. Options: content 'streak'
// (streaks in three sectors, single colonies in the last) | 'spread' (colonies all over) | 'discs' (antibiotic discs with
// clear zones in a lawn) | 'spots' (an ELISpot membrane) | 'stained' (crystal violet colonies of a clonogenic assay) |
// 'filter' (a gridded membrane filter with two kinds of colonies) | 'lawn' (an NGM plate with a bacterial lawn and worms);
// count (colonies, spots or worms); seed.
// Used by: Streak plate, Spread plate, Antibiotic disc assay, ELISpot, Clonogenic assay, Membrane filter, FUdR sterile
// cohort, Worm paralysis assay, RNAi by feeding, MPN tubes (no), Cell passage (lab's dish with cells).
// Example: culturePlate(g, { x: 0, y: 0, size: 50, content: 'discs', id: 'kirby-bauer' })
export function culturePlate(g, { x, y, size, turn = 0, id = 'culture-plate', w, content = 'streak', count, seed = 1 }) {
  const F = frame(g, x, y, size), fill = content === 'spots' || content === 'stained' ? 'empty' : 'agar'
  w ??= objW(F.px)
  const dish = petriDish(g, { x, y, size, w, fill, id: `${id}-dish` })
  const fine = Math.max(1.2, w * 0.4), rnd = rng(seed * 31 + 7), parts = [...dish.parts]
  const colony = (cx, cy, r, pal, outline = true) => circ(F, cx, cy, Math.max(r, 1.8 / F.u), pal.small, outline && F.px >= 50 ? pal.outline : '', fine)
  let s = ''
  if (content === 'streak') {
    const sw = Math.max(1.8, 3 * F.u)
    s += lines(F, [[[-30, -22], [-4, -22]], [[-32, -14], [-6, -14]], [[-33, -6], [-8, -6]], [[-28, -28], [-8, -29]]].map(([a, b]) => [a, [(a[0] + b[0]) / 2, a[1] - 3], b]).map((p) => catmull(p, 8)), COLONY.small, sw)
    s += linePath(D(F, 'M2,-18 C10,-12 16,-4 18,8 M8,-20 C16,-14 22,-6 24,6 M14,-22 C22,-16 27,-8 29,2'), COLONY.small, sw * 0.85)
    s += linePath(D(F, 'M-4,8 C2,14 4,22 2,32 M-12,10 C-6,16 -4,24 -6,34'), COLONY.small, sw * 0.7)
    s += [[-24, 22, 2.6], [-30, 12, 2.2], [-17, 30, 2.4], [-26, 32, 1.8], [10, 24, 2.2], [14, 32, 1.8]].map(([a, b, r]) => colony(a, b, r, COLONY)).join('')
    parts.push(['colonies', COLONY])
  } else if (content === 'spread') {
    s += scatter(count ?? 22, { R: 37, r: 3.2, seed }).map(([a, b]) => colony(a, b, 2 + rnd() * 1.4, COLONY)).join('')
    parts.push(['colonies', COLONY])
  } else if (content === 'discs') {
    s += circ(F, 0, 0, 41.5, LAWN.base)
    const discs = [[-16, -12, 16], [18, -10, 10], [-6, 20, 13], [21, 19, 6.5]]
    s += discs.map(([a, b, r]) => circ(F, a, b, r, AGAR.base, F.px >= 50 ? LAWN.shadow : '', fine)).join('')
    s += discs.map(([a, b]) => circ(F, a, b, 5, PAPER.base, PAPER.outline, fine * 1.1)).join('')
    parts.push(['lawn', LAWN], ['discs', PAPER])
  } else if (content === 'spots' || content === 'stained') {
    if (content === 'spots') s += circ(F, 0, 0, 41.5, PAPER.base, PAPER.shadow, fine)
    const pts = scatter(count ?? (content === 'spots' ? 12 : 7), { R: 37, r: content === 'spots' ? 4.5 : 8, gap: 1, seed: seed + 3 })
    s += pts.map(([a, b], i) => {
      if (content === 'spots') return circ(F, a, b, 2.4 + rnd() * 2.4, VIOLET.small)
      const r = 3.5 + rnd() * 4.5
      return fillPath(smoothIn(F, blobPts(a, b, r, r, 8, 0.18, rnd)), VIOLET.base, F.px >= 50 ? VIOLET.outline : '', fine)
    }).join('')
    parts.push([content === 'spots' ? 'spots' : 'colonies', VIOLET])
  } else if (content === 'filter') {
    const R = 37
    let gl = ''
    for (let k = -3; k <= 3; k++) { const d = k * 9.6, h = Math.sqrt(R * R - d * d); gl += `M${P2(F.P([d, -h]))} L${P2(F.P([d, h]))} M${P2(F.P([-h, d]))} L${P2(F.P([h, d]))} ` }
    s += circ(F, 0, 0, R, PAPER.base, PAPER.outline, fine) + (F.px >= 50 ? linePath(gl, GRID, Math.max(0.9, fine * 0.5)) : '')
    s += scatter(count ?? 10, { R: 33, r: 3.6, seed: seed + 5 }).map(([a, b], i) => colony(a, b, 2.4 + rnd() * 1.6, i % 3 === 2 ? COLONY2 : COLONY)).join('')
    parts.push(['filter', PAPER], ['colonies', COLONY], ['other colonies', COLONY2])
  } else if (content === 'lawn') {
    s += fillPath(smoothIn(F, blobPts(-2, 2, 32, 30, 14, 0.04, rnd)), LAWN.shadow, F.px >= 50 ? LAWN.outline : '', fine)
    const n = count ?? 3
    const ws = [[-10, -12, -15], [6, 6, 20], [-12, 16, -40], [16, -16, 50], [14, 22, -10]].slice(0, n).map(([a, b, t], i) => worm(g, { x: F.gx(a), y: F.gy(b), size: (28 * F.u) / g.k, turn: t, phase: i, id: `${id}-worm${i + 1}` }))
    s += ws.map((q) => q.body).join('')
    parts.push(['lawn', LAWN], ['worms', WORM])
  }
  return { defs: dish.defs, body: group(id, F, turn, dish.body + `<g id="${id}-${content}">${s}</g>`), parts: uniq(parts) }
}

// =====================================================================================================================
// Microscope image field, `size` its longer side. Options: shape 'circle' (an eyepiece view) | 'rect' (a camera image,
// aspect 0.75); mode 'fluorescence' (near-black ground) | 'phase' (mid grey, white halos) | 'bright' (pale ground);
// content 'cells' (cytoplasm with a nucleus) | 'nuclei' | 'spots' (nuclei with a few bright dots: FISH) | 'rods'
// (bacteria, some labelled: FISH image) | 'neurons' (one active neuron with processes among dim ones: calcium imaging);
// count; seed; cellPal (GFP), nucPal (DAPI), spotPal (RFP).
// Used by: Immunofluorescence, Calcium imaging, FISH probe, FISH image, Phase contrast, Intravital imaging,
// Confluence, Cell counting (bright), Tissue clearing.
// Example: imageField(g, { x: 0, y: 0, size: 50, content: 'spots', id: 'fish' })
export function imageField(g, { x, y, size, turn = 0, id = 'image', w, shape = 'circle', mode = 'fluorescence', content = 'cells', count, seed = 1, aspect = 0.75, cellPal = GFP, nucPal = DAPI, spotPal = RFP }) {
  const F = frame(g, x, y, size), defs = []
  w ??= objW(F.px)
  const G = mode === 'phase' ? FIELD.phase : mode === 'bright' ? FIELD.bright : FIELD.dark, fl = mode === 'fluorescence'
  const W = shape === 'circle' ? 100 : 100, H = shape === 'circle' ? 100 : 100 * aspect, R = 50
  const rnd = rng(seed * 101 + 3), fine = Math.max(1.2, w * 0.4)
  let s = `<g id="${id}-ground">${shape === 'circle' ? circ(F, 0, 0, R, G.base, DARK.outline, w) : rect(F, -W / 2, -H / 2, W / 2, H / 2, 4, G.base, DARK.outline, w)}</g>`
  const halo = (p, t = 0.32) => mixHex(G.base, p.base, t)
  const area = shape === 'circle' ? { R: R - 6 } : { box: [-W / 2 + 4, -H / 2 + 4, W / 2 - 4, H / 2 - 4] }
  const parts = [['ground', G]]
  let c = ''
  if (content === 'cells' || content === 'nuclei' || content === 'spots') {
    const rc = content === 'cells' ? 11 : 7.5
    const pts = scatter(count ?? (content === 'cells' ? 6 : 8), { ...area, r: rc * 1.15, gap: 1, seed })
    pts.forEach(([a, b]) => {
      const bp = blobPts(a, b, rc, rc * (0.8 + rnd() * 0.25), 9, 0.12, rnd, rnd() * 6)
      if (content === 'cells') {
        if (fl) c += fillPath(smoothIn(F, bp.map(([u, v]) => [a + (u - a) * 1.28, b + (v - b) * 1.28])), halo(cellPal)) + fillPath(smoothIn(F, bp), cellPal.base) + circ(F, a + (rnd() - 0.5) * 3, b + (rnd() - 0.5) * 3, rc * 0.42, nucPal.base)
        else if (mode === 'phase') c += fillPath(smoothIn(F, bp.map(([u, v]) => [a + (u - a) * 1.22, b + (v - b) * 1.22])), FIELD.bright.light) + fillPath(smoothIn(F, bp), G.shadow, G.outline, fine) + circ(F, a, b, rc * 0.36, G.small)
        else c += fillPath(smoothIn(F, bp), PAPER.shadow, G.outline, fine) + circ(F, a, b, rc * 0.38, NUC.small)
      } else {
        c += circ(F, a, b, rc * 1.25, halo(nucPal, 0.25)) + fillPath(smoothIn(F, bp), nucPal.base)
        if (content === 'spots') for (let k = 0; k < 2; k++) { const t = rnd() * 6.28, d = rc * 0.45; c += circ(F, a + d * Math.cos(t), b + d * Math.sin(t), 3.2, halo(spotPal, 0.5)) + circ(F, a + d * Math.cos(t), b + d * Math.sin(t), 1.8, spotPal.base) }
      }
    })
    if (fl) parts.push(content === 'cells' ? ['stain', cellPal] : ['nuclei', nucPal])
    if (fl && content !== 'nuclei') parts.push(content === 'cells' ? ['nuclei', nucPal] : ['spots', spotPal])
  } else if (content === 'rods') {
    scatter(count ?? 9, { ...area, r: 7, gap: 1, seed }).forEach(([a, b], i) => {
      const t = rnd() * 180, p = i % 3 === 0 ? cellPal : nucPal, L = 6, r = 2.6
      const seg = [[a - L * Math.cos(rad(t)), b - L * Math.sin(rad(t))], [a + L * Math.cos(rad(t)), b + L * Math.sin(rad(t))]]
      c += lines(F, [seg], halo(p, 0.3), (2 * r + 3) * F.u) + lines(F, [seg], p.base, 2 * r * F.u)
    })
    parts.push(['cells', nucPal], ['labelled cells', cellPal])
  } else if (content === 'neurons') {
    const dim = mixHex(G.base, cellPal.base, 0.4)
    scatter(count ?? 4, { ...area, r: 9, seed: seed + 2 }).slice(1).forEach(([a, b]) => { c += circ(F, a, b, 5.5, dim) })
    const proc = [[[-4, -2], [-16, -14], [-30, -16]], [[-4, 4], [-18, 10], [-32, 22]], [[6, -4], [18, -14], [30, -24]], [[6, 4], [20, 8], [32, 18]]]
    c += lines(F, proc.map((p) => catmull(p, 8)), halo(cellPal, 0.5), 3.4 * F.u) + lines(F, proc.map((p) => catmull(p, 8)), cellPal.small, 1.8 * F.u)
    c += fillPath(smoothIn(F, blobPts(0, 0, 13, 10, 9, 0.1, rnd)), halo(cellPal, 0.45)) + fillPath(smoothIn(F, blobPts(0, 0, 10, 7.5, 9, 0.08, rnd)), cellPal.base) + circ(F, -1, -1, 3.4, cellPal.light)
    parts.push(['neurons', cellPal])
  }
  s += `<g id="${id}-content">${c}</g>`
  return { defs: defs.join(''), body: group(id, F, turn, s), parts: uniq(parts) }
}

// =====================================================================================================================
// Tissue section, stained, on a glass slide, `size` its longer side. Options: stain 'he' (haematoxylin and eosin) | 'dab'
// (IHC: brown positive cells) | 'trichrome' (Masson: red muscle, blue collagen) | 'spatial' (a grid of barcoded spots in
// region colours) | 'plain'; slide (true; false: the section alone, filling the size); seed (the outline).
// Used by: Immunohistochemistry, Trichrome stain, Spatial transcriptomics, Biopsy, Brain slice (with complexes.mjs's
// brain), Tissue clearing.
// Example: tissueSection(g, { x: 0, y: 0, size: 60, stain: 'dab', id: 'ihc' })
export function tissueSection(g, { x, y, size, turn = 0, id = 'section', w, stain = 'he', slide = true, seed = 2 }) {
  const F = frame(g, x, y, size), defs = []
  w ??= objW(F.px)
  const fine = Math.max(1.2, w * 0.4), rnd = rng(seed * 17 + 1), parts = []
  let s = ''
  let cx = 0, cy = 0, rx = 47, ry = 40
  if (slide) {
    s += `<g id="${id}-slide">${rect(F, -50, -32, 50, 32, 3, shade(F, `${id}-gradient`, [-50, -32, 50, 32], GLASS, defs), GLASS.outline, w)}${rect(F, -46, -28, -24, 28, 2, PLASTIC.shadow)}</g>`
    cx = 12; cy = 0; rx = 30; ry = 24
    parts.push(['slide', GLASS])
  }
  const T = stain === 'he' ? STAIN.eosin : stain === 'trichrome' ? STAIN.muscle : stain === 'spatial' ? STAIN.pink : STAIN.section
  const bp = blobPts(cx, cy, rx, ry, 13, 0.07, rnd)
  s += `<g id="${id}-tissue">${fillPath(smoothIn(F, bp), T.base, T.outline, fine)}`
  parts.push(['tissue', T])
  const inside = (n, r, sd) => scatter(n, { R: 1, r: r / Math.min(rx, ry), gap: 1, seed: sd }).map(([a, b]) => [cx + a * rx * 0.86, cy + b * ry * 0.86])
  let c = ''
  if (stain === 'trichrome') {
    const band = (k) => catmull([[-0.9, k], [-0.4, k - 0.25], [0.1, k + 0.15], [0.6, k - 0.2], [0.85, k]].map(([a, b]) => [cx + a * rx, cy + b * ry]), 10)
    c += lines(F, [band(-0.35), band(0.38)], STAIN.collagen.base, Math.max(2.5, 0.22 * ry * F.u))
    c += inside(10, 3, seed).map(([a, b]) => circ(F, a, b, 1.7, STAIN.nuclei.base)).join('')
    parts.push(['collagen', STAIN.collagen])
  } else if (stain === 'spatial') {
    const cols = [SERIES[0], SERIES[2], SERIES[3], SERIES[4]], pitch = Math.max(6.5, 9 * (40 / Math.max(rx, 40)))
    for (let a = cx - rx; a <= cx + rx; a += pitch) for (let b = cy - ry; b <= cy + ry; b += pitch * 0.87) {
      const aa = a + ((Math.round((b - cy) / (pitch * 0.87)) % 2) ? pitch / 2 : 0), u = (aa - cx) / rx, v = (b - cy) / ry
      if (u * u + v * v > 0.72) continue
      const k = u * u + v * v < 0.18 ? 0 : u > 0.25 ? 1 : v < 0 ? 2 : 3
      c += circ(F, aa, b, Math.min(2.8, pitch * 0.34), cols[k].small)
    }
    cols.forEach((p, i) => parts.push([`region ${i + 1}`, p]))
  } else if (stain === 'he' || stain === 'dab') {
    inside(stain === 'he' ? 16 : 12, 3.2, seed).forEach(([a, b], i) => {
      if (stain === 'dab' && i % 3 === 0) c += fillPath(smoothIn(F, blobPts(a, b, 4.4, 3.8, 7, 0.12, rnd)), STAIN.dab.base) + circ(F, a, b, 1.9, STAIN.dab.small)
      else c += circ(F, a, b, 2.1, stain === 'he' ? STAIN.haematoxylin.small : STAIN.counter.small)
    })
    parts.push(['nuclei', stain === 'he' ? STAIN.haematoxylin : STAIN.counter])
    if (stain === 'dab') parts.push(['DAB', STAIN.dab])
  }
  s += c + '</g>'
  return { defs: defs.join(''), body: group(id, F, turn, s), parts: uniq(parts) }
}

// =====================================================================================================================
// C. elegans, promoted from ../lab/lb12.mjs (`worm`, approved with Worm picking): a sinuous body tapering to a pointed tail
// and a blunt head, `size` its length, head at the left before `turn`. Options: amp (wave height, share of the length,
// 0.1), waves (1), phase, width (half-width, share of the length, 0.09), bend (degrees: a C-shaped body along an arc
// instead of a wave, as a thrashing or coiled worm), gut (a darker intestine along the body from 60 px). Flat: fill and
// outline, a pale line along the body from 80 px.
// Used by: RNAi by feeding, FUdR sterile cohort, Worm thrashing assay, Pharyngeal pumping, Worm paralysis assay, Worm
// motility classes, Auxin-inducible degradation; lab: Worm picking, Lifespan Machine, Microfluidic worm chip.
// Example: worm(g, { x: 0, y: 0, size: 40, bend: 140, id: 'worm' })
export function worm(g, { x, y, size, turn = 0, id = 'worm', w, amp = 0.1, waves = 1, phase = 0, width = 0.09, bend = 0, gut = false }) {
  const len = size, W = width * len, N = 36, a = rad(turn), ca = Math.cos(a), sa = Math.sin(a)
  let C, T
  if (bend) {
    const th = rad(bend), Rr = len / th, c = Math.cos(th / 2)
    C = (t) => { const q = -th / 2 + th * t; return [Rr * Math.sin(q), -Rr * Math.cos(q) + (Rr * (1 + c)) / 2] }
    T = (t) => { const q = -th / 2 + th * t; return [Math.cos(q), Math.sin(q)] }
  } else {
    const A = amp * len
    C = (t) => [-len / 2 + len * t, A * Math.sin(2 * Math.PI * waves * t + phase)]
    T = (t) => { const dx = len, dy = A * 2 * Math.PI * waves * Math.cos(2 * Math.PI * waves * t + phase), l = Math.hypot(dx, dy); return [dx / l, dy / l] }
  }
  const hw = (t) => (t < 0.1 ? W * Math.sqrt(Math.max(0, 1 - (1 - t / 0.1) ** 2)) : t > 0.6 ? W * ((1 - t) / 0.4) ** 1.1 : W)
  const L = [], R = [], mid = [], gl = []
  for (let i = 0; i <= N; i++) {
    const t = (1 - Math.cos((Math.PI * i) / N)) / 2, [tx, ty] = T(t), h = Math.max(0.3, hw(t)), [X, Y] = C(t)
    L.push([X - ty * h, Y + tx * h]); if (i > 0 && i < N) R.unshift([X + ty * h, Y - tx * h])
    if (t > 0.12 && t < 0.6) mid.push([X - ty * h * 0.25, Y + tx * h * 0.25])
    if (t > 0.22 && t < 0.84) gl.push([X + ty * h * 0.15, Y - tx * h * 0.15])
  }
  const place = ([u, v]) => g.P([x + u * ca - v * sa, y + u * sa + v * ca])
  const px = len * g.k
  w ??= Math.max(1.6, Math.min(3.5, px / 40))
  let s = `<path d="${smoothD(L.concat(R).map(place))}" fill="${WORM.shadow}" stroke="${WORM.outline}" stroke-width="${f(w)}" stroke-linejoin="round"/>`
  if (gut && px >= 60) s += linePath(`M${gl.map(place).map(P2).join(' L')}`, WORM.small, Math.max(1.5, W * g.k * 0.7))
  if (px >= 80) s += linePath(`M${mid.map(place).map(P2).join(' L')}`, WORM.light, Math.max(1.5, W * g.k * 0.35))
  return { defs: '', body: `<g id="${id}">${s}</g>`, parts: [['worm', WORM]] }
}

// =====================================================================================================================
// Mouse seen from above, head up before `turn`, `size` its length with the tail. Options: fur 'white' | 'black' | 'brown'
// (lab.mjs's FUR); tail (true). Shaded from 80 px, eyes from 60 px. As lab.mjs's side-view labMouse, seen from the top.
// Used by: Open field test, Novel object test, T-maze, Morris water maze, Elevated plus maze, Intravital imaging (window),
// In vivo imaging (lying flat).
// Example: mouseTop(g, { x: 0, y: 0, size: 30, turn: 40, id: 'mouse' })
export function mouseTop(g, { x, y, size, turn = 0, id = 'mouse', w, fur = 'white', tail = true }) {
  const F = frame(g, x, y, size), defs = [], pal = FUR[fur]
  w ??= objW(F.px)
  const big = F.px >= 80, dy = tail ? -14 : 0, sc = tail ? 1 : 1.35
  const Q = ([a, b]) => [a * sc, b * sc + dy]
  let s = ''
  if (tail) { const tp = catmull([[0, 22], [3, 30], [-3, 40], [2, 50]].map(Q), 8); s += `<g id="${id}-tail">${lines(F, [tp], PINK.outline, Math.max(3.2, 3.4 * F.u + w * 0.8))}${lines(F, [tp], PINK.shadow, Math.max(1.4, 3.4 * F.u))}</g>` }
  const ear = (sgn) => ell(F, ...Q([sgn * 8.5, -19]), 7 * sc, 6 * sc, pal.base, pal.outline, w * 0.75, sgn * 30) + ell(F, ...Q([sgn * 8.8, -19.2]), 4.4 * sc, 3.6 * sc, PINK.shadow, '', 0, sgn * 30)
  const body = [[0, -38], [3, -35], [5.5, -29], [7.5, -22], [10, -14], [13, -5], [14.5, 5], [13.5, 14], [9.5, 21], [4, 24.5], [0, 25], [-4, 24.5], [-9.5, 21], [-13.5, 14], [-14.5, 5], [-13, -5], [-10, -14], [-7.5, -22], [-5.5, -29], [-3, -35]].map(Q)
  s += `<g id="${id}-body">${fillPath(smoothIn(F, body), shade(F, `${id}-gradient`, [-15 * sc, -38 * sc + dy, 15 * sc, 25 * sc + dy], pal, defs), pal.outline, w)}`
  if (big) s += lines(F, [catmull([[-7, -6], [-9, 4], [-7, 14]].map(Q), 8)], pal.light, Math.max(2, w * 0.8))
  s += `</g><g id="${id}-ears">${ear(-1)}${ear(1)}</g>`
  s += circ(F, ...Q([0, -38]), 1.8 * sc, PINK.small)
  if (F.px >= 60) s += circ(F, ...Q([-4.2, -28]), 1.5 * sc, DARK.base) + circ(F, ...Q([4.2, -28]), 1.5 * sc, DARK.base)
  return { defs: defs.join(''), body: group(id, F, turn, s), parts: [['fur', pal], ['skin', PINK]] }
}

// =====================================================================================================================
// Behavioural arena seen from above, `size` its longer side. Options: kind 'pool' (Morris water maze: water, quadrant
// lines, a hidden platform) | 'plus' (elevated plus maze: open arms across, walled arms up and down) | 't' (T-maze with a
// reward in the left arm) | 'open' (open field: a box with its centre zone dashed); path (a tracked swim or walk: true for
// the usual one, or points in local units); mouse (a mouse from above at its start, true); objects (open field: two
// objects, a cube and a cone, for the novel object test).
// Used by: Morris water maze, Elevated plus maze, T-maze, Open field test, Novel object test.
// Example: arena(g, { x: 0, y: 0, size: 60, kind: 'pool', path: true, id: 'water-maze' })
export function arena(g, { x, y, size, turn = 0, id = 'arena', w, kind = 'open', path = false, mouse = true, objects = false }) {
  const F = frame(g, x, y, size), defs = []
  w ??= objW(F.px)
  const fine = Math.max(1.2, w * 0.45), parts = [], wall = Math.max(w * 1.6, 3)
  let s = '', start = [0, 0], ang = 0
  if (kind === 'pool') {
    s += `<g id="${id}-pool">${circ(F, 0, 0, 47, LIQUIDS.water.base, PLASTIC.outline, wall)}`
    if (F.px >= 60) s += lines(F, [[[0, -46], [0, 46]], [[-46, 0], [46, 0]]], LIQUIDS.water.shadow, fine)
    s += `</g><g id="${id}-platform">${rect(F, 14, -28, 28, -14, 2, LIQUIDS.water.light, LIQUIDS.water.outline, fine * 1.1, '')}</g>`
    parts.push(['water', LIQUIDS.water]); start = [-30, 24]; ang = -60
    if (path === true) path = [[-30, 24], [-24, 6], [-10, 22], [0, 8], [-6, -6], [8, -12], [18, -20]]
  } else if (kind === 'plus') {
    s += `<g id="${id}-maze">${rect(F, -48, -8, 48, 8, 2, PLASTIC.base, PLASTIC.outline, w)}${rect(F, -8, -48, 8, 48, 2, PLASTIC.shadow, PLASTIC.outline, w)}`
    s += lines(F, [[[-8, -48], [-8, -8]], [[8, -48], [8, -8]], [[-8, 8], [-8, 48]], [[8, 8], [8, 48]]], METAL.outline, wall) + '</g>'
    parts.push(['maze', PLASTIC]); start = [-26, 0]; ang = -90
    if (path === true) path = [[-26, 0], [-10, 2], [0, -14], [2, -32], [-2, -14], [14, 0], [30, -2]]
  } else if (kind === 't') {
    const T = [[-8, 48], [-8, -16], [-48, -16], [-48, -46], [48, -46], [48, -16], [8, -16], [8, 48]]
    s += `<g id="${id}-maze">${fillPath(polyD(F, T), PLASTIC.base, METAL.outline, wall)}</g>`
    s += `<g id="${id}-reward">${circ(F, -38, -31, 5, rich(85).small, rich(85).outline, fine)}</g>`
    parts.push(['maze', PLASTIC], ['reward', rich(85)]); start = [0, 34]; ang = 0
    if (path === true) path = [[0, 34], [0, 0], [-2, -26], [-26, -31]]
  } else {
    s += `<g id="${id}-box">${rect(F, -48, -48, 48, 48, 3, shade(F, `${id}-gradient`, [-48, -48, 48, 48], PLASTIC, defs), METAL.outline, wall)}`
    s += linePath(polyD(F, [[-24, -24], [24, -24], [24, 24], [-24, 24]]), GRID, fine, 'butt', dashed(fine)) + '</g>'
    parts.push(['box', PLASTIC]); start = [30, -32]; ang = -130
    if (objects) {
      s += `<g id="${id}-objects">${rect(F, -36, -36, -20, -20, 2, ACCENT.small, ACCENT.outline, fine * 1.2)}${fillPath(polyD(F, [[30, 18], [40, 36], [20, 36]]), SERIES[3].small, SERIES[3].outline, fine * 1.2)}</g>`
      parts.push(['familiar object', ACCENT], ['novel object', SERIES[3]]); start = [6, 16]; ang = 40
    }
    if (path === true) path = [[-36, -34], [-22, -40], [-12, -22], [-30, -10], [-36, 18], [-16, 26], [8, 36], [22, 16], [36, -10], [30, -32]]
  }
  if (path) s += `<g id="${id}-path">${lines(F, [catmull(path, 10)], ACCENT.outline, Math.max(1.6, w * 0.6))}</g>`, parts.push(['path', ACCENT])
  let mb = ''
  if (mouse) { const m = mouseTop(g, { x: F.gx(start[0]), y: F.gy(start[1]), size: (kind === 'pool' ? 22 : kind === 'open' ? 30 : 26) * F.u / g.k, turn: ang, id: `${id}-mouse` }); mb = m.body; defs.push(m.defs); parts.push(...m.parts) }
  return { defs: defs.join(''), body: group(id, F, turn, s + mb), parts: uniq(parts) }
}

// =====================================================================================================================
// Person as a bust (head and shoulders, no face), `size` its height. Options: pal (the clothes, ACCENT), skin (SKIN),
// blindfold (a band over the eyes in DARK, false).
// Used by: Cohort study, Twin study, Blinding, Randomization, Placebo, Inclusion and Exclusion criteria, Timed Up and Go
// test (with its own walking figure), Wearable sensor.
// Example: person(g, { x: 0, y: 0, size: 30, pal: SERIES[2], id: 'person' })
export function person(g, { x, y, size, turn = 0, id = 'person', w, pal = ACCENT, skin = SKIN, blindfold = false }) {
  const F = frame(g, x, y, size), defs = []
  w ??= objW(F.px)
  let s = `<g id="${id}-clothes">${fillPath(D(F, 'M-34,50 C-34,22 -24,8 0,8 C24,8 34,22 34,50 Z'), shade(F, `${id}-gradient`, [-34, 8, 34, 50], pal, defs), pal.outline, w)}</g>`
  s += `<g id="${id}-head">${circ(F, 0, -22, 22, skin.base, skin.outline, w)}`
  if (F.px >= 80) s += lines(F, [catmull([[-14, -30], [-8, -37], [0, -39]], 6)], skin.light, Math.max(2, w * 0.8))
  s += '</g>'
  if (blindfold) s += `<g id="${id}-blindfold">${rect(F, -23, -28, 23, -16, 4, DARK.base, DARK.outline, w * 0.7)}${lines(F, [[[23, -22], [32, -18]], [[23, -21], [30, -12]]], DARK.base, Math.max(2, 3.2 * F.u))}</g>`
  const parts = [['clothes', pal], ['skin', skin]]
  if (blindfold) parts.push(['blindfold', DARK])
  return { defs: defs.join(''), body: group(id, F, turn, s), parts }
}

// =====================================================================================================================
// Timeline: an arrow left to right with ticks, `size` its length. Options: at (shares 0–1 where the ticks are, four even
// ones); dots (a dot on each tick, the first in SERIES[3], the rest in ACCENT, false); labels (strings lettered under the
// ticks, e.g. ['t_0', 't_1']; drawn only where letters.mjs says they fit); blocks ([[u0, u1, palette, letter?, dashed?],
// …] periods drawn above the line, as treatment arms or washouts); colour (INK).
// Used by: Time points, Cohort study, Crossover design, Washout, Pipeline, Baseline, FUdR sterile cohort, Egg freezing.
// Example: timeline(g, { x: 0, y: 0, size: 80, dots: true, labels: ['t_0', 't_1', 't_2', 't_3'], id: 'timeline' })
export function timeline(g, { x, y, size, turn = 0, id = 'timeline', w, at = [0.1, 0.36, 0.62, 0.88], dots = false, labels, blocks = [], colour = INK }) {
  const F = frame(g, x, y, size)
  w ??= objW(F.px)
  const lw = Math.max(2, w * 0.9), hh = (lw * 2.6) / F.u, X = (u) => -50 + 100 * u, parts = []
  let s = ''
  blocks.forEach(([u0, u1, p, letter, dash], i) => {
    s += `<g id="${id}-block${i + 1}">${linePath(polyD(F, [[X(u0) + 1, -26], [X(u1) - 1, -26], [X(u1) - 1, -6], [X(u0) + 1, -6]]).replace(/^/, ''), p.outline, w * 0.7, 'round', dash ? dashed(w * 0.7) : '').replace('fill="none"', `fill="${p.base}"`)}`
    if (letter && fits(g, (11 * F.u) / g.k)) s += lettering(g, { x: F.gx((X(u0) + X(u1)) / 2), y: F.gy(-16), h: (11 * F.u) / g.k, text: letter, colour: p.outline, id: `${id}-letter${i + 1}` }).body
    s += '</g>'
    parts.push([`period ${i + 1}`, p])
  })
  s += `<g id="${id}-line">${lines(F, [[[-50, 0], [50 - hh * 0.8, 0]]], colour, lw)}${fillPath(polyD(F, [[50, 0], [50 - hh, -hh * 0.6], [50 - hh, hh * 0.6]]), colour, colour, lw * 0.4)}`
  s += lines(F, at.map((u) => [[X(u), -4], [X(u), 4]]), colour, lw * 0.8) + '</g>'
  if (dots) { s += `<g id="${id}-dots">${at.map((u, i) => circ(F, X(u), 0, 4.5, (i ? ACCENT : SERIES[3]).small, (i ? ACCENT : SERIES[3]).outline, w * 0.6)).join('')}</g>`; parts.push(['dots', ACCENT], ['first dot', SERIES[3]]) }
  if (labels) {
    const h = 9
    if (fits(g, (h * F.u) / g.k)) s += `<g id="${id}-labels">${labels.map((t, i) => lettering(g, { x: F.gx(X(at[i])), y: F.gy(14), h: (h * F.u) / g.k, text: t, colour, id: `${id}-label${i + 1}` }).body).join('')}</g>`
  }
  return { defs: '', body: group(id, F, turn, s), parts }
}

// =====================================================================================================================
// Badge: a round sign with a white mark, `size` its width. Options: mark 'check' (green, SAFE) | 'cross' (red) | 'no' (a
// red ring and bar on a white disc; `inside`, an SVG string such as a part's body, is drawn between the disc and the
// bar); pal (to change its colour).
// Used by: Inclusion criteria, Exclusion criteria, Blinding, FUdR sterile cohort, Wire hang test (no), Replicates.
// Example: badge(g, { x: 0, y: 0, size: 16, mark: 'check', id: 'included' })
export function badge(g, { x, y, size, turn = 0, id = 'badge', w, mark = 'check', pal, inside = '' }) {
  const F = frame(g, x, y, size)
  pal ??= mark === 'check' ? SAFE : SIGN_RED
  w ??= objW(F.px)
  const mw = Math.max(2.4, 10 * F.u)
  let s
  if (mark === 'no') s = circ(F, 0, 0, 44, PAPER.light) + inside + circ(F, 0, 0, 42, 'none', pal.outline, Math.max(3, 12 * F.u)) + lines(F, [[[-29, -29], [29, 29]]], pal.outline, Math.max(3, 12 * F.u), 'butt')
  else s = circ(F, 0, 0, 48, pal.outline, pal.outline, w * 0.6) + lines(F, mark === 'check' ? [[[-22, 2], [-7, 17], [22, -15]]] : [[[-17, -17], [17, 17]], [[17, -17], [-17, 17]]], PAPER.light, mw)
  return { defs: '', body: group(id, F, turn, `<g id="${id}-sign">${s}</g>`), parts: [['badge', pal]] }
}

// =====================================================================================================================
// Glass micropipette, optic fibre or electrode, pointing down before `turn`, `size` its length. Options: kind 'patch'
// (a blunt glass pipette with a silver wire inside) | 'injection' (a sharp needle with liquid, `liquid` a lab liquid) |
// 'sharp' (a fine recording electrode) | 'fibre' (an optic fibre in a metal ferrule casting a cone of `light`) | 'probe'
// (a dark implanted lead with four contacts: deep brain stimulation, a silicon probe); holder (a metal holder at the top
// with an accent band, true; not for 'probe'); light (fibre: a palette of lab's BEAMS, blue).
// Used by: Patch clamp, Microinjection, Recording electrode, Optogenetics, Deep brain stimulation, Microsensor profile,
// Electroporation, Intravital imaging (objective: no), Biopsy (no: lab's syringe).
// Example: micropipette(g, { x: 0, y: 0, size: 50, turn: -40, kind: 'patch', id: 'pipette' })
export function micropipette(g, { x, y, size, turn = 0, id = 'micropipette', w, kind = 'patch', holder, liquid = 'reagent', light = BEAMS.blue }) {
  const F = frame(g, x, y, size), defs = []
  w ??= objW(F.px)
  holder ??= kind !== 'probe'
  const fine = Math.max(1.2, w * 0.45), parts = []
  let s = ''
  if (kind === 'probe') {
    s += `<g id="${id}-lead">${rect(F, -5, -50, 5, 48, 5, DARK.base, DARK.outline, w)}`
    s += [16, 26, 36].map((b) => rect(F, -5, b - 3, 5, b + 3, 1, METAL.base)).join('') + rect(F, -5, 41, 5, 48, 5, METAL.base) + '</g>'
    parts.push(['lead', DARK], ['contacts', METAL])
    return { defs: '', body: group(id, F, turn, s), parts }
  }
  const top = holder ? -18 : -50
  if (kind === 'fibre') {
    const tipY = 4
    s += `<g id="${id}-light">${fillPath(polyD(F, [[-2.5, tipY], [2.5, tipY], [24, 50], [-24, 50]]), light.light)}${fillPath(polyD(F, [[-1.5, tipY], [1.5, tipY], [11, 50], [-11, 50]]), light.base)}</g>`
    s += `<g id="${id}-fibre">${rect(F, -3, top, 3, tipY, 1, METAL.light, METAL.outline, fine)}${rect(F, -1.1, top, 1.1, tipY, 0.5, light.small)}</g>`
    parts.push(['light', light], ['fibre', METAL])
  } else {
    const [w0, w1, tip] = kind === 'patch' ? [8, 2.2, 46] : kind === 'injection' ? [8, 0.8, 48] : [6, 0.5, 48]
    const glass = [[-w0 / 2, top], [w0 / 2, top], [w0 / 2, 10], [w1 / 2, tip], [-w1 / 2, tip], [-w0 / 2, 10]]
    s += `<g id="${id}-glass">${fillPath(polyD(F, glass), shade(F, `${id}-gradient`, [-w0 / 2, top, w0 / 2, tip], GLASS, defs), GLASS.outline, fine * 1.4)}`
    if (kind === 'injection') s += fillPath(polyD(F, [[-w0 / 2 + 1.2, -6], [w0 / 2 - 1.2, -6], [w0 / 2 - 1.2, 10], [w1 / 2 * 0.6, tip - 3], [-w1 / 2 * 0.6, tip - 3], [-w0 / 2 + 1.2, 10]]), LIQUIDS[liquid]?.small ?? liquid.small)
    else s += lines(F, [[[0, top + 2], [0, kind === 'patch' ? 26 : 34]]], METAL.outline, Math.max(1, 1.2 * F.u))
    s += '</g>'
    parts.push(['glass', GLASS])
    if (kind === 'injection') parts.push(['liquid', LIQUIDS[liquid] ?? liquid])
  }
  if (holder) {
    // A fibre's ferrule has no accent band: its blue light would recolour with it.
    s += `<g id="${id}-holder">${rect(F, -7, -50, 7, top + 1, 2.5, shade(F, `${id}-holder-gradient`, [-7, -50, 7, top], METAL, defs), METAL.outline, w)}${kind === 'fibre' ? '' : rect(F, -7, -36, 7, -29, 0, ACCENT.small, ACCENT.outline, fine)}</g>`
    parts.push(['holder', METAL]); if (kind !== 'fibre') parts.push(['band', ACCENT])
  }
  return { defs: defs.join(''), body: group(id, F, turn, s), parts }
}

// =====================================================================================================================
// Hot spot of signal: flat concentric rings from red at the rim through orange to a yellow centre, `size` its width.
// Options: steps (3), aspect (height / width, 1), pal ([outer, …, inner], HEAT).
// Used by: In vivo imaging (on lab's mouse), PET scan and fMRI activation (on complexes.mjs's brain), Luciferase reporter,
// Photoacoustic.
// Example: heatSpot(g, { x: 0, y: 0, size: 14, id: 'signal' })
export function heatSpot(g, { x, y, size, turn = 0, id = 'hot-spot', steps = 3, aspect = 1, pal = HEAT }) {
  const F = frame(g, x, y, size)
  const tones = steps === 2 ? [pal[0], pal.at(-1)] : pal
  const s = tones.map((p, i) => ell(F, 0, 0, 50 * (1 - i / tones.length), 50 * aspect * (1 - i / tones.length), i === tones.length - 1 ? p.base : p.small)).join('')
  return { defs: '', body: group(id, F, turn, `<g id="${id}-signal">${s}</g>`), parts: tones.map((p, i) => [`signal ${i + 1}`, p]) }
}

// ---------- every part and variant, for the sheet ----------
const P = (name, opts, size = 100) => ({ name, size: 100, draw: (g) => plot(g, { x: 0, y: 0, size, ...opts }) })
export const DEMOS = [
  ...['growth', 'qpcr', 'saturation', 'spike', 'steps', 'spectrum', 'volcano', 'manhattan', 'clusters', 'sensorgram', 'bars', 'trend', 'scatter', 'trace'].map((k) => P(`Plot, ${k}`, { show: k })),
  P('Plot, bare axes with ticks', { card: false, arrows: true, ticks: 4, show: 'growth' }),
  { name: 'Western blot', size: 100, draw: (g) => blot(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Western blot, ladder', size: 100, draw: (g) => blot(g, { x: 0, y: 0, size: 100, ladder: true, lanes: 5 }) },
  { name: 'Gel', size: 100, draw: (g) => blot(g, { x: 0, y: 0, size: 100, kind: 'gel', ladder: true }) },
  { name: 'TLC plate', size: 100, draw: (g) => blot(g, { x: 0, y: 0, size: 100, kind: 'tlc' }) },
  { name: 'Spot array, microarray', size: 100, draw: (g) => spotArray(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Spot array, screening hits', size: 100, draw: (g) => spotArray(g, { x: 0, y: 0, size: 100, ground: 'light', rows: 4, cols: 6, hits: [[1, 2], [2, 4], [0, 5]] }) },
  { name: 'Spot array, ELISA', size: 100, draw: (g) => spotArray(g, { x: 0, y: 0, size: 100, ground: 'light', rows: 2, cols: 4, values: [[0.25, 0.45, 0.7, 0.95], [0.05, 0.25, 0.5, 0.8]] }) },
  ...['streak', 'spread', 'discs', 'spots', 'stained', 'filter', 'lawn'].map((c) => ({ name: `Culture plate, ${c}`, size: 100, draw: (g) => culturePlate(g, { x: 0, y: 0, size: 100, content: c }) })),
  { name: 'Image, fluorescent cells', size: 100, draw: (g) => imageField(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Image, FISH nuclei', size: 100, draw: (g) => imageField(g, { x: 0, y: 0, size: 100, content: 'spots' }) },
  { name: 'Image, FISH bacteria', size: 100, draw: (g) => imageField(g, { x: 0, y: 0, size: 100, content: 'rods' }) },
  { name: 'Image, calcium imaging', size: 100, draw: (g) => imageField(g, { x: 0, y: 0, size: 100, shape: 'rect', content: 'neurons' }) },
  { name: 'Image, phase contrast', size: 100, draw: (g) => imageField(g, { x: 0, y: 0, size: 100, mode: 'phase', count: 4 }) },
  { name: 'Image, brightfield', size: 100, draw: (g) => imageField(g, { x: 0, y: 0, size: 100, mode: 'bright', shape: 'rect', count: 7 }) },
  ...['he', 'dab', 'trichrome', 'spatial'].map((st) => ({ name: `Tissue section, ${st}`, size: 100, draw: (g) => tissueSection(g, { x: 0, y: 0, size: 100, stain: st }) })),
  { name: 'Tissue section, no slide', size: 100, draw: (g) => tissueSection(g, { x: 0, y: 0, size: 100, stain: 'he', slide: false }) },
  { name: 'Worm', size: 100, draw: (g) => worm(g, { x: 0, y: 0, size: 100, gut: true }) },
  { name: 'Worm, bent', size: 100, draw: (g) => worm(g, { x: 0, y: 0, size: 100, bend: 150 }) },
  { name: 'Worm, straight', size: 100, draw: (g) => worm(g, { x: 0, y: 0, size: 100, amp: 0 }) },
  { name: 'Mouse from above', size: 100, draw: (g) => mouseTop(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Mouse from above, black', size: 100, draw: (g) => mouseTop(g, { x: 0, y: 0, size: 100, fur: 'black', turn: 30 }) },
  { name: 'Arena, water maze', size: 100, draw: (g) => arena(g, { x: 0, y: 0, size: 100, kind: 'pool', path: true }) },
  { name: 'Arena, plus maze', size: 100, draw: (g) => arena(g, { x: 0, y: 0, size: 100, kind: 'plus' }) },
  { name: 'Arena, T-maze', size: 100, draw: (g) => arena(g, { x: 0, y: 0, size: 100, kind: 't', path: true }) },
  { name: 'Arena, open field', size: 100, draw: (g) => arena(g, { x: 0, y: 0, size: 100, path: true }) },
  { name: 'Arena, novel object', size: 100, draw: (g) => arena(g, { x: 0, y: 0, size: 100, objects: true }) },
  { name: 'Person', size: 100, draw: (g) => person(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Person, blindfold', size: 100, draw: (g) => person(g, { x: 0, y: 0, size: 100, pal: SERIES[2], blindfold: true }) },
  { name: 'Timeline', size: 100, draw: (g) => timeline(g, { x: 0, y: 0, size: 100, dots: true, labels: ['t_0', 't_1', 't_2', 't_3'] }) },
  { name: 'Timeline, periods', size: 100, draw: (g) => timeline(g, { x: 0, y: 0, size: 100, at: [0.05, 0.36, 0.64, 0.95], blocks: [[0.05, 0.36, SERIES[0], 'A'], [0.36, 0.64, PAPER, '', true], [0.64, 0.95, SERIES[3], 'B']] }) },
  { name: 'Badge, check', size: 100, draw: (g) => badge(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Badge, cross', size: 100, draw: (g) => badge(g, { x: 0, y: 0, size: 100, mark: 'cross' }) },
  { name: 'Badge, no', size: 100, draw: (g) => badge(g, { x: 0, y: 0, size: 100, mark: 'no' }) },
  ...['patch', 'injection', 'sharp', 'fibre', 'probe'].map((k) => ({ name: `Micropipette, ${k}`, size: 100, draw: (g) => micropipette(g, { x: 0, y: 0, size: 100, kind: k }) })),
  { name: 'Hot spot', size: 100, draw: (g) => heatSpot(g, { x: 0, y: 0, size: 100 }) },
]
