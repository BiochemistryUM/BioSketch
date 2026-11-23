// Eight icons of SiliCoDraw's "Lab & equipment" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts in ../parts/:
// cryovial, ice bucket, lab coat, vortex mixer, orbital shaker, water bath, UV-Vis spectrophotometer and gel imager.
// Their compositions are read by hand from the source in a 100 × 100 box centred on 0,0 and scaled onto a 512 page
// (`page` of ../cellkit.mjs). Materials follow the conventions of objects at the top of ../parts/lab.mjs.
// Parts used: tube (vial, microtube, test tube, a capless vial as the cuvette), glassware (flask), instrument (casings,
// screens with a number or gel bands, buttons, knob, lamp, drawer), hazardSymbol (snowflake) from lab.mjs; cycleArrow
// from tissue.mjs for the orbit of the shaker.
// Drawn here because no part draws them: the ice bucket (a tub seen slightly from above, with ice cubes), the lab coat,
// the rubber cup of the vortex mixer and its motion marks, the shaking platform, the open top of the water bath, and the
// sample compartment of the spectrophotometer.
// Lettered: "37" on the water bath's screen and "0.42" on the spectrophotometer's, through the screen of `instrument`.
// Left out: SiliCoDraw's "°C" and the "A" before the absorbance (words and units).
// Usage: node lb07.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page } from '../cellkit.mjs'
import { toLch } from '../colour.mjs'
import { f } from '../shapes.mjs'
import { ACCENT, DARK, LIQUIDS, METAL, PAPER, glassware, hazardSymbol, instrument, objW, tube } from '../parts/lab.mjs'
import { arrowW, cycleArrow } from '../parts/tissue.mjs'
import { mergeParts } from '../parts/membranes.mjs'

const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012) are left out of the hue check: the materials are greys on purpose (../parts/lab.mjs).
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p]) => toLch(p.base).c >= 0.012), defs, body)
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), parts: mergeParts(ps.flatMap((p) => p.parts)) })
const icon = (name, { defs, body, parts }) => cellType(name, parts, defs, body)
const ICE = LIQUIDS.water

// ---------- a local frame for the drawings of this batch (as the parts' own: 100 units on the longer side) ----------
const P2 = ([x, y]) => `${f(x)},${f(y)}`
const frame = (g, x, y, size, turn = 0) => {
  const u = (size * g.k) / 100, a = (turn * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), cx = g.X(x), cy = g.Y(y)
  return { u, px: size * g.k, P: ([p, q]) => [cx + (p * c - q * s) * u, cy + (p * s + q * c) * u], gx: (p, q) => x + ((p * c - q * s) * u) / g.k, gy: (p, q) => y + ((p * s + q * c) * u) / g.k }
}
const stroked = (s, w) => (s ? ` stroke="${s}" stroke-width="${f(w)}" stroke-linejoin="round"` : '')
const poly = (F, pts, close = true) => `M${pts.map((p) => P2(F.P(p))).join(' L')}${close ? 'Z' : ''}`
const fillPath = (d, fill, s = '', w = 0) => `<path d="${d}" fill="${fill}"${stroked(s, w)}/>`
const linePath = (d, colour, w, cap = 'round') => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
const circle = (F, x, y, r, fill, s = '', w = 0) => { const [cx, cy] = F.P([x, y]); return `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * F.u)}" fill="${fill}"${stroked(s, w)}/>` }
/** A rounded rectangle as a polygon (so that it turns with the frame). */
const rr = (x0, y0, x1, y1, r) => {
  const out = []
  for (const [cx, cy, a0] of [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]])
    for (let i = 0; i <= 6; i++) { const t = ((a0 + i * 15) * Math.PI) / 180; out.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]) }
  return out
}
/** Points along an ellipse from a0 to a1 (degrees, y down: 0 right, 90 down). */
const arcPts = (cx, cy, rx, ry, a0, a1, step = 6) => {
  const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / step))
  return Array.from({ length: n + 1 }, (_, i) => { const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] })
}
/** A closed polygon with rounded corners: [[x, y, r], …]. */
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
/** Fill of a shaded drawing: a two-stop gradient (base at the top left to shadow) from 80 px on, flat below. */
const shadeFill = (F, id, [x0, y0, x1, y1], pal, defs) => {
  if ((F.px * Math.max(x1 - x0, y1 - y0)) / 100 < 80) return pal.base
  const [a, b] = F.P([x0, y0]), [c, d] = F.P([x1, y1])
  defs.push(`<linearGradient id="${id}" x1="${f(a)}" y1="${f(b)}" x2="${f(c)}" y2="${f(d)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`)
  return `url(#${id})`
}
const piece = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })

// ---------------------------------------------------------------------------------------------------------------------
// Cryovial: a screw-capped vial with a paper label and frozen cells in medium, a snowflake beside it. (The tube part's
// vial with its label; the snowflake is the hazard symbol's, in the cap's outline blue as SiliCoDraw's.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.6, [7, -1])
  const vial = tube(g, { x: -8, y: 0, size: 96, kind: 'vial', label: true, liquid: 'water', level: 0.45, id: 'cryovial' })
  const flake = hazardSymbol(g, { x: 28, y: -30, size: 32, symbol: 'snowflake', colour: ACCENT.outline, id: 'snowflake' })
  icon('Cryovial', join(vial, flake))
}

// ---------------------------------------------------------------------------------------------------------------------
// Ice bucket: a tub seen a little from above, heaped with ice, two microtubes stuck in the ice. (Drawn here: the tub in
// the accent blue, as the coloured boxes of the parts (tip and freezer boxes); its open top dark inside; ice cubes pale
// blue-white in the water palette. Microtubes from the tube part, one with reagent, one with medium.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.6, [0, -2]), F = frame(g, 0, 0, 100), defs = [], w = Number(objW(F.px)), fine = Math.max(1.5, w * 0.45)
  const rimY = -6, RX = 44, RY = 9
  const back = piece('bucket-back', fillPath(poly(F, arcPts(0, rimY, RX, RY, 0, 360)), ACCENT.shadow, ACCENT.outline, w), [['bucket', ACCENT]])
  const t1 = tube(g, { x: -15, y: -26, size: 42, turn: -14, kind: 'micro', liquid: 'reagent', level: 0.6, id: 'tube-1' })
  const t2 = tube(g, { x: 15, y: -26, size: 42, turn: 14, kind: 'micro', liquid: 'medium', level: 0.6, id: 'tube-2' })
  const cubes = [[-34, -9, 10], [-24, -13, 20], [-3, -14, -15], [3, -9, 30], [24, -12, -25], [34, -8, 12], [-13, -6, 40], [14, -5, 5], [-30, -2, -20], [28, -1, 35], [0, 0, 15]]
  let ice = ''
  for (const [cx, cy, a] of cubes) {
    const pts = rr(-6.5, -6.5, 6.5, 6.5, 2.5).map(([p, q]) => { const t = (a * Math.PI) / 180; return [cx + p * Math.cos(t) - q * Math.sin(t), cy + p * Math.sin(t) + q * Math.cos(t)] })
    ice += fillPath(poly(F, pts), ICE.light, ICE.outline, fine * 1.2)
    if (F.px >= 80) ice += linePath(poly(F, [[cx - 3.5, cy - 2], [cx - 1, cy - 4]], false), '#FFFFFF', fine)
  }
  const cubesP = piece('ice', ice, [['ice', ICE]])
  // The front wall: from the rim's lower half down to a rounded floor, narrowing.
  const body = [...arcPts(0, rimY, RX, RY, 0, 180), [-35, 42], ...arcPts(0, 42, 35, 5, 180, 0)]
  let s = fillPath(poly(F, body), shadeFill(F, 'bucket-gradient', [-RX, rimY, RX, 47], ACCENT, defs), ACCENT.outline, w)
  s += linePath(poly(F, arcPts(0, rimY + 5, RX - 1, RY, 0, 180), false), ACCENT.outline, fine)
  if (F.px >= 80) s += linePath(poly(F, [[-34, 12], [-31, 34]], false), ACCENT.light, Math.max(2, w * 0.7))
  const frontP = piece('bucket-front', s, [['bucket', ACCENT]], defs.join(''))
  icon('Ice bucket', join(back, t1, t2, cubesP, frontP))
}

// ---------------------------------------------------------------------------------------------------------------------
// Lab coat: a white coat seen from the front, arms down, collar and lapels, the shirt in the V, three buttons, a breast
// pocket with a pen and two side pockets. (Drawn here; SiliCoDraw's short stubs become sleeves to the hips. White coat
// in PAPER, the shirt, buttons and pen in the accent blue.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.6, [0, 0]), F = frame(g, 0, 0, 100), defs = [], w = Number(objW(F.px)), fine = Math.max(1.5, w * 0.45)
  const half = (sg) => [...sg, ...sg.slice().reverse().map(([x, y, r]) => [-x, y, r])]
  // the right half (x > 0) from the neck round to the hem's middle, mirrored for the left
  const right = [[9, -47, 3], [24, -43, 6], [36, -32, 8], [45, 14, 3], [33, 17, 3], [28, -10, 4], [29, 47, 3]]
  const outline = half(right).reverse()
  let s = fillPath(poly(F, roundPoly(outline)), shadeFill(F, 'coat-gradient', [-45, -47, 45, 47], PAPER, defs), PAPER.outline, w)
  // seams of the sleeves
  s += linePath(poly(F, [[26, -40], [28, -10]], false), PAPER.outline, fine) + linePath(poly(F, [[-26, -40], [-28, -10]], false), PAPER.outline, fine)
  const shirt = `<g id="shirt">${fillPath(poly(F, roundPoly([[-9, -47, 2], [9, -47, 2], [0, -14, 2]])), ACCENT.small, ACCENT.outline, fine)}</g>`
  const lapel = (sg) => fillPath(poly(F, roundPoly([[sg * 9, -47, 1.5], [sg * 18, -40, 2], [sg * 11, -32, 1.5], [sg * 14, -26, 1.5], [sg * 1, -12, 1.5]])), PAPER.shadow, PAPER.outline, fine * 1.3)
  s += shirt + lapel(1) + lapel(-1)
  // front edge and buttons
  s += linePath(poly(F, [[1, -13], [1, 47]], false), PAPER.outline, fine * 1.2)
  s += `<g id="buttons">${[-4, 12, 28].map((yy) => circle(F, -4, yy, 2.6, ACCENT.base, ACCENT.outline, fine)).join('')}</g>`
  // pockets: breast pocket with a pen, two at the hips
  s += `<g id="pen">${fillPath(poly(F, rr(-21.5, -26, -18.5, -12, 1.2)), ACCENT.base, ACCENT.outline, fine)}</g>`
  s += fillPath(poly(F, roundPoly([[-25, -17, 0], [-13, -17, 0], [-13, -8, 2], [-25, -8, 2]])), PAPER.base, PAPER.outline, fine)
  for (const sg of [-1, 1]) s += fillPath(poly(F, roundPoly([[sg * 8, 20, 0], [sg * 22, 20, 0], [sg * 22, 32, 2], [sg * 8, 32, 2]])), 'none', PAPER.outline, fine)
  icon('Lab coat', { defs: defs.join(''), body: `<g id="lab-coat">${s}</g>`, parts: [['coat', PAPER], ['shirt', ACCENT]] })
}

// ---------------------------------------------------------------------------------------------------------------------
// Vortex mixer: a low instrument with a knob and a button, a rubber cup on top with a microtube pressed into it, and
// marks of the shaking on both sides. (Casing: the instrument part. Cup and marks drawn here, the cup in the dark rubber
// of the parts.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.6, [0, 1])
  const base = instrument(g, { x: 0, y: 29, size: 90, aspect: 0.42, screen: false, buttons: 1, knob: true, lamp: false, id: 'vortex' })
  const F = frame(g, 0, 0, 100), w = Number(objW(F.px)), fine = Math.max(1.5, w * 0.45)
  const cup = piece('cup', fillPath(poly(F, roundPoly([[-15, 1, 4], [15, 1, 4], [9, 11.5, 1], [-9, 11.5, 1]])), DARK.small, DARK.outline, w * 0.8) + fillPath(poly(F, arcPts(0, 1.5, 15, 3.5, 0, 360)), DARK.base, DARK.outline, fine), [])
  const tb = tube(g, { x: -1, y: -21, size: 50, turn: 9, kind: 'micro', liquid: 'reagent', level: 0.3, id: 'tube' })
  const marks = [arcPts(-1, -22, 23, 23, 148, 212), arcPts(-1, -22, 31, 31, 160, 200), arcPts(-1, -22, 23, 23, -32, 32), arcPts(-1, -22, 31, 31, -20, 20)]
  const mk = piece('motion', marks.map((m) => linePath(poly(F, m, false), METAL.outline, w * 0.7)).join(''))
  icon('Vortex mixer', join(base, cup, tb, mk))
}

// ---------------------------------------------------------------------------------------------------------------------
// Orbital shaker: a low instrument with a screen and buttons, a platform on it with two flasks of culture, and a circling
// arrow for the orbit in a mid grey. (Casing: instrument; flasks: glassware with culture medium (pink, phenol red) where SiliCoDraw has green, because a green liquid would
// be the screen's green trace; the arrow: cycleArrow.
// Platform drawn here in metal.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.6, [0, 1])
  const base = instrument(g, { x: 0, y: 31, size: 96, aspect: 0.34, screen: 'trace', buttons: 2, knob: false, lamp: false, id: 'shaker' })
  const F = frame(g, 0, 0, 100), defs = [], w = Number(objW(F.px))
  const plat = piece('platform', fillPath(poly(F, rr(-44, 9, 44, 15.5, 2.5)), shadeFill(F, 'platform-gradient', [-44, 9, 44, 15.5], METAL, defs), METAL.outline, w * 0.85) + fillPath(poly(F, rr(-6, 15, 6, 16.5, 0.5)), METAL.shadow, METAL.outline, w * 0.6), [], defs.join(''))
  const f1 = glassware(g, { x: -22, y: -12, size: 43, kind: 'flask', liquid: 'medium', level: 0.4, id: 'flask-1' })
  const f2 = glassware(g, { x: 22, y: -12, size: 43, kind: 'flask', liquid: 'medium', level: 0.4, id: 'flask-2' })
  // The orbit in the outline grey of metal (l 0.58) and at about two thirds of the usual arrow width, so it reads beside
  // the soft greys without weighing on them; a grey, so it never clashes with the accent band.
  const orbit = cycleArrow(g, { x: 0, y: -39, size: 22, colour: METAL.outline, w: Math.max(3, Number(arrowW(22 * g.k)) * 0.65), id: 'orbit' })
  icon('Orbital shaker', join(plat, f1, f2, base, orbit))
}

// ---------------------------------------------------------------------------------------------------------------------
// Water bath: a tank of water at 37 with four tubes standing in it. (Tank: instrument with a screen showing 37, a button
// and a lamp; behind its top edge the open water surface, drawn here; test tubes from the tube part with medium.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.6, [0, -2])
  const tank = instrument(g, { x: 0, y: 17, size: 98, aspect: 0.58, screen: 'number', text: '37', buttons: 1, lamp: 'on', id: 'water-bath' })
  const F = frame(g, 0, 0, 100), w = Number(objW(F.px))
  const top = -11.4
  const water = piece('water', fillPath(poly(F, rr(-46, top - 7, 46, top + 4, 4)), ICE.small, ICE.outline, w * 0.8), [['water', ICE]])
  const tubes = [-27, -9, 9, 27].map((x, i) => tube(g, { x, y: top - 18, size: 40, kind: 'test', liquid: 'medium', level: 0.55, id: `tube-${i + 1}` }))
  icon('Water bath', join(water, ...tubes, tank))
}

// ---------------------------------------------------------------------------------------------------------------------
// UV-Vis spectrophotometer: a benchtop instrument with a screen reading 0.42, buttons, and a sample compartment on top
// with a cuvette of blue sample standing in it. (Instrument and screen: the instrument part; cuvette: the tube part as a
// capless plastic vial; the compartment drawn here in metal with a dark slot.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.6, [0, -5])
  const body = instrument(g, { x: 0, y: 14, size: 98, aspect: 0.58, screen: 'number', text: '0.42', buttons: 3, lamp: false, id: 'spectrophotometer' })
  const F = frame(g, 0, 0, 100), defs = [], w = Number(objW(F.px)), fine = Math.max(1.5, w * 0.45)
  const cx = 26
  const comp = piece('compartment', fillPath(poly(F, rr(cx - 15, -24, cx + 15, -12, 3)), shadeFill(F, 'compartment-gradient', [cx - 15, -24, cx + 15, -12], METAL, defs), METAL.outline, w) + fillPath(poly(F, rr(cx - 8, -26, cx + 8, -21, 1.5)), DARK.base, DARK.outline, fine), [], defs.join(''))
  const cuv = tube(g, { x: cx, y: -38, size: 30, kind: 'vial', cap: 'none', material: 'plastic', liquid: ICE, level: 0.6, id: 'cuvette' })
  const lip = piece('compartment-lip', fillPath(poly(F, rr(cx - 10, -24.5, cx + 10, -21.5, 1)), METAL.shadow, METAL.outline, fine))
  icon('UV-Vis spectrophotometer', join(body, comp, cuv, lip))
}

// ---------------------------------------------------------------------------------------------------------------------
// Gel imager: a cabinet with a large screen showing the bands of a gel and a drawer for the gel below. (The instrument
// part with screen 'bands' and its drawer.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.6, [0, 0])
  icon('Gel imager', instrument(g, { x: 0, y: 0, size: 96, aspect: 0.95, screen: 'bands', drawer: true, buttons: 0, knob: false, lamp: false, id: 'gel-imager' }))
}

check()
console.log('written to', OUT)
