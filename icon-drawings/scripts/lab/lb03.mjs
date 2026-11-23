// Eight icons of SiliCoDraw's "Lab & equipment" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts in ../parts/:
// syringe, swab, microscope slide, microscope, electron microscope, PCR machine, flow cytometry plot and
// spectrophotometer. Their compositions are read by hand from the source in a 100 × 100 box centred on 0,0 and scaled
// onto a 512 page (`page` of ../cellkit.mjs). Materials follow the conventions of objects at the top of ../parts/lab.mjs.
// Parts used: syringe, microscope (upright and electron), instrument (with a slanted lid and its screen), tube (a vial
// without a cap as the cuvette), beam (lab.mjs); cell (tissue.mjs) for the stained section on the slide.
// Drawn here because no part draws them: the swab (shaft, handle with its break point, cotton tip), the glass slide
// with its frosted end and coverslip, the flow cytometry dot plot (card, axes, two populations of events, a gate), and
// the light source and detector of the spectrophotometer (small metal housings with a dark window).
// Lettered: nothing (no original writes anything).
// Usage: node lb03.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page } from '../cellkit.mjs'
import { deep, hueOf, soft, toLch } from '../colour.mjs'
import { f } from '../shapes.mjs'
import { ACCENT, DARK, GLASS, INK, METAL, PAPER, PLASTIC, PLUG, beam, instrument, microscope, objW, syringe, tube } from '../parts/lab.mjs'
import { cell } from '../parts/tissue.mjs'
import { mergeParts } from '../parts/membranes.mjs'

const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012) are left out of the hue check: the materials are greys on purpose (../parts/lab.mjs).
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p]) => toLch(p.base).c >= 0.012), defs, body)
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), parts: mergeParts(ps.flatMap((p) => p.parts)) })
const icon = (name, { defs, body, parts }) => cellType(name, parts, defs, body)

// Colours of this batch besides the parts' own: the stain of a section (eosin pink, SiliCoDraw's #c9527a), the gated
// events of the dot plot (SiliCoDraw's #d64545 red) and the measuring beam.
const EOSIN = soft(hueOf('#c9527a'))
const GATE = deep(hueOf('#d64545'))

// ---------- a local frame for the drawings of this batch (as the parts' own: 100 units on the longer side) ----------
const P2 = ([x, y]) => `${f(x)},${f(y)}`
const frame = (g, x, y, size, turn = 0) => {
  const u = (size * g.k) / 100, a = (turn * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), cx = g.X(x), cy = g.Y(y)
  return { u, px: size * g.k, P: ([p, q]) => [cx + (p * c - q * s) * u, cy + (p * s + q * c) * u], gx: (p, q) => x + ((p * c - q * s) * u) / g.k, gy: (p, q) => y + ((p * s + q * c) * u) / g.k }
}
const stroked = (s, w) => (s ? ` stroke="${s}" stroke-width="${f(w)}" stroke-linejoin="round"` : '')
const poly = (F, pts, close = true) => `M${pts.map((p) => P2(F.P(p))).join(' L')}${close ? 'Z' : ''}`
const fillPath = (d, fill, s = '', w = 0) => `<path d="${d}" fill="${fill}"${stroked(s, w)}/>`
const linePath = (d, colour, w, cap = 'round', extra = '') => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"${extra}/>`
const circle = (F, x, y, r, fill, s = '', w = 0) => { const [cx, cy] = F.P([x, y]); return `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * F.u)}" fill="${fill}"${stroked(s, w)}/>` }
/** A rounded rectangle as a polygon (so that it turns with the frame). */
const rr = (x0, y0, x1, y1, r) => {
  const out = []
  for (const [cx, cy, a0] of [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]])
    for (let i = 0; i <= 6; i++) { const t = ((a0 + i * 15) * Math.PI) / 180; out.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]) }
  return out
}
const ellPts = (cx, cy, rx, ry, n = 48) => Array.from({ length: n }, (_, i) => { const t = (i / n) * Math.PI * 2; return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)] })
/** Fill of a shaded drawing: a two-stop gradient (base at the top left to shadow) from 80 px on, flat below. */
const shadeFill = (F, id, [x0, y0, x1, y1], pal, defs) => {
  if ((F.px * Math.max(x1 - x0, y1 - y0)) / 100 < 80) return pal.base
  const [a, b] = F.P([x0, y0]), [c, d] = F.P([x1, y1])
  defs.push(`<linearGradient id="${id}" x1="${f(a)}" y1="${f(b)}" x2="${f(c)}" y2="${f(d)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`)
  return `url(#${id})`
}

// ---------------------------------------------------------------------------------------------------------------------
// Syringe: SiliCoDraw's syringe turned 40° anticlockwise, plunger up, needle down to the right, half filled.
// (The syringe part as it is; the liquid is the part's water, SiliCoDraw's pale blue.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.6, [-5, -4])
  icon('Syringe', syringe(g, { x: 0, y: 0, size: 115, turn: -40, level: 0.5, id: 'syringe' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Swab: a sample swab turned 35°, cotton tip up. (Drawn here. SiliCoDraw's grey shaft is plastic, its tip cotton (PLUG,
// off-white, with a few fibres when large); the lower third is a handle in the accent blue with the break point where
// the shaft is snapped into a tube, as on nasal and throat swabs.)
// ---------------------------------------------------------------------------------------------------------------------
function swab(g, { x, y, size, turn = 0, id = 'swab' }) {
  const F = frame(g, x, y, size, turn), defs = [], w = Number(objW(F.px)), fine = Math.max(1.5, w * 0.45)
  let s = ''
  s += fillPath(poly(F, rr(-3.2, -24, 3.2, 20, 1.6)), PLASTIC.base, PLASTIC.outline, w * 0.75)
  s += `<g id="${id}-handle">${fillPath(poly(F, rr(-5.2, 17, 5.2, 50, 3)), shadeFill(F, `${id}-handle-gradient`, [-5.2, 17, 5.2, 50], ACCENT, defs), ACCENT.outline, w)}`
  if (F.px >= 60) s += linePath(poly(F, [[-2.2, 23], [-2.2, 45]], false), ACCENT.light, Math.max(1.5, w * 0.5))
  s += '</g>'
  // break point: a notch on the shaft
  s += linePath(poly(F, [[-3.2, 4], [3.2, 4]], false), PLASTIC.outline, fine, 'butt')
  const tipPts = ellPts(0, -32.5, 10.5, 17.5)
  s += `<g id="${id}-cotton">${fillPath(poly(F, tipPts), shadeFill(F, `${id}-cotton-gradient`, [-10.5, -50, 10.5, -15], PLUG, defs), PLUG.outline, w)}`
  if (F.px >= 80) s += [[[-4, -42], [1, -38]], [[-5, -30], [2, -25]], [[2, -35], [6, -31]]].map((sg) => linePath(poly(F, sg, false), PLUG.outline, fine)).join('')
  if (F.px >= 60) s += linePath(poly(F, [[-6, -38], [-6.5, -30]], false), PLUG.light, Math.max(2, w * 0.7))
  s += '</g>'
  return { defs: defs.join(''), body: `<g id="${id}">${s}</g>`, parts: [['shaft', PLASTIC], ['cotton', PLUG], ['handle', ACCENT]] }
}
{
  const g = page(4.6, [0, 0])
  icon('Swab', swab(g, { x: 0, y: 0, size: 113, turn: 35, id: 'swab' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Microscope slide: a glass slide turned 30° anticlockwise with its frosted end at the right, a coverslip over the
// middle and a stained section under it. (Drawn here: slide and coverslip in glass, the frosted end paper. The section
// is a few cells of the cell part, pink as eosin with lilac nuclei as haematoxylin, where SiliCoDraw has two see-through
// pink dots. A slide is 3 : 1 as a real one, SiliCoDraw's 3.3 : 1.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.6, [0, 0]), turn = -30, size = 96
  const F = frame(g, 0, 0, size, turn), defs = [], w = Number(objW(F.px)), fine = Math.max(1.5, w * 0.45)
  let s = fillPath(poly(F, rr(-50, -16.5, 50, 16.5, 2.5)), shadeFill(F, 'slide-gradient', [-50, -16.5, 50, 16.5], GLASS, defs), GLASS.outline, w)
  s += fillPath(poly(F, rr(-46, -10, -40, -6.5, 1.5)), GLASS.light)
  const label = `<g id="slide-label">${fillPath(poly(F, rr(28, -16.5, 50, 16.5, 2.5)), PAPER.shadow, PAPER.outline, fine)}${linePath(poly(F, [[33, -6], [45, -6]], false) + '', PAPER.small, fine)}${linePath(poly(F, [[33, 2], [41, 2]], false), PAPER.small, fine)}</g>`
  const slide = { defs: defs.join(''), body: `<g id="slide">${s}${label}</g>`, parts: [['slide', GLASS], ['label', PAPER]] }
  const cells = [[-13, 2, 16, 20, 0], [0, -4, 15, -30, 1], [10, 6, 13, 40, 2], [-3, 9, 12, 70, 3]].map(([a, b, sz, t, i]) => cell(g, { x: F.gx(a, b), y: F.gy(a, b), size: sz, turn: t + turn, pal: EOSIN, vesicles: false, seed: i, id: `section-cell-${i + 1}` }))
  const cover = { defs: '', body: `<g id="coverslip">${fillPath(poly(F, rr(-25, -14, 22, 14, 1.5)), GLASS.base, GLASS.outline, fine)}</g>`, parts: [] }
  const coverEdge = { defs: '', body: `<g id="coverslip-edge">${fillPath(poly(F, rr(-25, -14, 22, 14, 1.5)), 'none', GLASS.outline, fine)}${linePath(poly(F, [[-21, -10.5], [-14, -10.5]], false), GLASS.light, Math.max(2, w * 0.6))}</g>`, parts: [] }
  icon('Microscope slide', join(slide, cover, ...cells, coverEdge))
}

// ---------------------------------------------------------------------------------------------------------------------
// Microscope: the upright light microscope part as it is (foot, arm, stage, slanted tube with eyepiece and objective).
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.6, [0, 0])
  icon('Microscope', microscope(g, { x: 2, y: 0, size: 96, id: 'microscope' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Electron microscope: the electron microscope part as it is (a column with three lenses and the beam down its axis, on
// a desk with a screen and a lamp that is on).
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.6, [0, 0])
  icon('Electron microscope', microscope(g, { x: 0, y: 1, size: 100, kind: 'electron', id: 'electron-microscope' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// PCR machine: a thermal cycler, the instrument part with its slanted lid holding a block of wells, a screen with a
// trace, one button and a lamp that is on. (SiliCoDraw's blank blue screen becomes the part's dark screen.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.6, [0, 0])
  icon('PCR machine', instrument(g, { x: 0, y: 0, size: 98, aspect: 0.92, lid: 'slant', screen: 'trace', buttons: 1, lamp: 'on', id: 'thermal-cycler' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Flow cytometry: SiliCoDraw's dot plot, a white card with two axes, a cloud of events in the accent blue and a gated
// population in red inside a dashed gate. (Drawn here; dots larger and fewer per area than SiliCoDraw's, so that they
// read at 40 px.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.6, [0, 0]), F = frame(g, 0, 0, 98), defs = [], w = Number(objW(F.px)), fine = Math.max(1.5, w * 0.45)
  let s = `<g id="plot">${fillPath(poly(F, rr(-50, -44, 50, 44, 5)), shadeFill(F, 'plot-gradient', [-50, -44, 50, 44], PAPER, defs), PAPER.outline, w)}`
  s += linePath(poly(F, [[-40, -34], [-40, 34], [42, 34]], false), INK, w * 0.8) + '</g>'
  const ungated = [[-31, 24], [-25, 13], [-19, 26], [-13, 17], [-6, 25], [-29, 3], [-17, 6], [-23, -6], [-8, 7], [-33, 14]]
  const gated = [[8, -4], [15, -12], [22, -2], [28, -15], [13, -21], [21, -27], [30, -25], [4, -14], [27, -6], [16, 4]]
  const r = 3.4
  s += `<g id="events">${ungated.map(([a, b]) => circle(F, a, b, r, ACCENT.small, ACCENT.outline, fine * 0.8)).join('')}</g>`
  s += `<g id="gated-events">${gated.map(([a, b]) => circle(F, a, b, r, GATE.small, GATE.outline, fine * 0.8)).join('')}`
  const gate = poly(F, [[-2, -33], [37, -33], [37, 4], [-2, 15]])
  s += linePath(gate, GATE.outline, w * 0.7, 'butt', ` stroke-dasharray="${f(w * 1.6)} ${f(w * 1.1)}"`) + '</g>'
  icon('Flow cytometry', { defs: defs.join(''), body: s, parts: [['plot', PAPER], ['events', ACCENT], ['gated events', GATE]] })
}

// ---------------------------------------------------------------------------------------------------------------------
// Spectrophotometer: a light source sends a beam through a cuvette of blue sample; less light (dashed) reaches the
// detector. (Cuvette: the tube part, a flat-bottomed vial without a cap. The beam part, red: the colour a blue sample
// absorbs, as in a Bradford assay at 595 nm. Source and detector drawn here as small metal housings with a dark window,
// where SiliCoDraw has a triangle and a dot.)
// ---------------------------------------------------------------------------------------------------------------------
function housing(g, { x, y, size, id, side }) {
  const F = frame(g, x, y, size), defs = [], w = Number(objW(F.px)), fine = Math.max(1.5, w * 0.45)
  let s = fillPath(poly(F, rr(-50, -42, 50, 42, 10)), shadeFill(F, `${id}-gradient`, [-50, -42, 50, 42], METAL, defs), METAL.outline, w)
  s += fillPath(poly(F, rr(side * 50 - (side > 0 ? 26 : -4), -20, side * 50 + (side > 0 ? -4 : 26), 20, 6)), DARK.base, DARK.outline, fine)
  if (F.px >= 60) s += linePath(poly(F, [[-34, -28], [-10, -28]], false), METAL.light, Math.max(2, w * 0.7))
  return { defs: defs.join(''), body: `<g id="${id}">${s}</g>`, parts: [[id, METAL], ['window', DARK]] }
}
{
  const g = page(4.6, [0, 0])
  const cuv = tube(g, { x: 0, y: 0, size: 76, kind: 'vial', cap: 'none', liquid: 'water', level: 0.58, material: 'plastic', id: 'cuvette' })
  const src = housing(g, { x: -38, y: 4, size: 24, id: 'light-source', side: 1 })
  const det = housing(g, { x: 38, y: 4, size: 24, id: 'detector', side: -1 })
  const inBeam = beam(g, { x: -18.7, y: 4, size: 15, colour: 'red', width: 20, id: 'beam-in' })
  const outBeam = beam(g, { x: 18.7, y: 4, size: 15, colour: 'red', kind: 'dashed', width: 10, id: 'beam-out' })
  icon('Spectrophotometer', join(inBeam, outBeam, cuv, src, det))
}

check()
console.log('written to', OUT)
