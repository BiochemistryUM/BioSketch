// Eight icons of SiliCoDraw's "Lab & equipment" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared lab parts in
// ../parts/lab.mjs and their conventions of objects (glass, plastic and metal are greys; caps, handles and instrument
// bands in the one accent blue): mouse injection, dissection, two-photon, super-resolution, live-cell imaging, slide
// scanner, stereo microscope and rotary evaporator. Their compositions are read by hand from the source in a 100 × 100
// box centred on 0,0 and scaled onto a 512 page (`page` of ../cellkit.mjs).
// Parts used: labMouse, syringe, beam, screen, instrument, microscope (stereo), petriDish, glassware (round-bottom
// flask) (lab.mjs); epithelium, cell, arrow, cycleArrow (tissue.mjs); nucleus (organelles.mjs).
// Drawn here because no part draws them: dissecting scissors and forceps; a microscope objective; the blurred and the
// localised spots of a super-resolution image; the frame of a time-lapse; the window and scan head of a slide scanner
// with its slide; the stand, motor, condenser, vapour duct and water bath of a rotary evaporator.
// Lettered (strokes): "REC" beside the recording dot of the time-lapse, "WSI" on the slide scanner.
// Usage: node lb10.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page } from '../cellkit.mjs'
import { hueOf, rich, soft, toHex, toLch } from '../colour.mjs'
import { f } from '../shapes.mjs'
import { ACCENT, GLASS, GLOW, INK, LAMP_RED, LIQUIDS, METAL, PAPER, beam, glassware, instrument, labMouse, microscope, objW, petriDish, screen, syringe } from '../parts/lab.mjs'
import { arrow, cell, cycleArrow, epithelium } from '../parts/tissue.mjs'
import { nucleus } from '../parts/organelles.mjs'
import { lettering } from '../parts/letters.mjs'
import { mergeParts } from '../parts/membranes.mjs'

const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012: the materials) are left out of the hue check, as the conventions of lab.mjs say.
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p]) => toLch(p.base).c >= 0.012), defs, body)
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), parts: mergeParts(ps.flatMap((p) => p.parts)) })
// The same palette used by several parts (the accent on a band and a cap) is one colour, listed once.
const icon = (name, { defs, body, parts }) => cellType(name, parts.filter(([, p], i) => parts.findIndex(([, q]) => q.base === p.base) === i), defs, body)
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })

// Colours of this batch besides the parts' own: the stain of a section (eosin pink, as lb03), the fluorophore of the
// super-resolution image (SiliCoDraw's orange #e3955a, bright on the dark screen) and the green of fluorescence.
const EOSIN = soft(hueOf('#c9527a'))
const FH = hueOf('#e3955a')
const FLUO = { light: toHex({ l: 0.95, c: 0.06, h: FH }), base: toHex({ l: 0.84, c: 0.14, h: FH }), shadow: toHex({ l: 0.7, c: 0.13, h: FH }), small: toHex({ l: 0.84, c: 0.14, h: FH }), outline: toHex({ l: 0.6, c: 0.13, h: FH }) }

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
/** Fill of a shaded drawing: a two-stop gradient (base at the top left to shadow) from 80 px on, flat below. */
const shadeFill = (F, id, [x0, y0, x1, y1], pal, defs) => {
  if ((F.px * Math.max(x1 - x0, y1 - y0)) / 100 < 80) return pal.base
  const [a, b] = F.P([x0, y0]), [c, d] = F.P([x1, y1])
  defs.push(`<linearGradient id="${id}" x1="${f(a)}" y1="${f(b)}" x2="${f(c)}" y2="${f(d)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`)
  return `url(#${id})`
}
/** A tube of glass along points (units of g): outline, then fill, `width` in page pixels. */
const glassTube = (g, pts, width, w, pal = GLASS) => {
  const d = `M${pts.map((p) => P2(g.P(p))).join(' L')}`
  return linePath(d, pal.outline, width + 2 * w) + linePath(d, pal.base, width)
}

// ---------------------------------------------------------------------------------------------------------------------
// Mouse injection: a white lab mouse with a syringe held at an angle, its needle in the scruff of the back
// (subcutaneous), as SiliCoDraw has it. (The labMouse and syringe parts; the syringe holds a clear, water-blue dose.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.34, [-3.3, -10])
  const S = 58, tipAt = [6, -4], turn = 40, a = (turn * Math.PI) / 180
  const c = [tipAt[0] + Math.sin(a) * 0.5 * S, tipAt[1] - Math.cos(a) * 0.5 * S]
  const mouse = labMouse(g, { x: -8, y: 14, size: 92, id: 'mouse' })
  const syr = syringe(g, { x: c[0], y: c[1], size: S, turn, liquid: 'water', level: 0.55, id: 'syringe' })
  icon('Mouse injection', join(mouse, syr))
}

// ---------------------------------------------------------------------------------------------------------------------
// Dissection: open dissecting scissors (steel blades, finger rings in the accent) above a pair of fine forceps, as
// SiliCoDraw has them. (Both drawn here; SiliCoDraw draws them as lines.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.62, [-1.6, 0.6]), w = Number(objW(90 * g.k)), cw = Math.max(2, w * 0.8), defs = []
  const pivot = [4, -6]
  const blade = (tip, side, id) => {
    const dx = tip[0] - pivot[0], dy = tip[1] - pivot[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy * side, ny = ux * side
    const at = (t, o) => [pivot[0] + ux * t + nx * o, pivot[1] + uy * t + ny * o]
    // a blade: straight cutting edge on one side, a curved back on the other, from just behind the pivot to the point
    const pts = [at(-4, 0), at(-2, 4.2), at(L * 0.35, 4.6), at(L * 0.75, 3), at(L, 0.2), at(L, 0), at(L * 0.5, -0.4), at(0, -0.6), at(-4, -0.6)]
    return fillPath(g.smooth(pts).replace(/Z$/, 'Z'), METAL.base, METAL.outline, w) + (90 * g.k >= 80 ? g.line([at(L * 0.18, 2.4), at(L * 0.62, 1.8)], METAL.light, Math.max(2, w * 0.6)) : '')
  }
  const tips = [[-34, -40], [-16, -46]]
  const rings = [[24, 14], [34, -12]]
  const RR = 8, ringW = 3.2 * g.k
  let metal = ''
  for (const [rx, ry] of rings) {
    const dx = rx - pivot[0], dy = ry - pivot[1], L = Math.hypot(dx, dy)
    const end = [rx - (dx / L) * RR, ry - (dy / L) * RR]
    metal += g.line([pivot, end], METAL.outline, 4 * g.k + 2 * w) + g.line([pivot, end], METAL.shadow, 4 * g.k)
  }
  metal += blade(tips[0], 1, 'a') + blade(tips[1], -1, 'b')
  metal += g.circle(pivot[0], pivot[1], 2.6, METAL.shadow, METAL.outline, cw)
  let handles = ''
  for (const [rx, ry] of rings) handles += g.circle(rx, ry, RR, 'none', ACCENT.outline, ringW + 2 * w) + g.circle(rx, ry, RR, 'none', ACCENT.base, ringW)
  // forceps: two springy arms joined at the back (upper right), their tips meeting at the lower left
  const back = [-12, 14], tipF = [-46, 47], dx = tipF[0] - back[0], dy = tipF[1] - back[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux
  const at = (t, o) => [back[0] + ux * t + nx * o, back[1] + uy * t + ny * o]
  const arm = (s) => g.smooth([at(-1.5, 0.2 * s), at(L * 0.3, 6.2 * s), at(L * 0.65, 5.4 * s), at(L * 0.98, 1.8 * s), at(L, 0.9 * s), at(L * 0.7, 2.4 * s), at(L * 0.35, 3.2 * s), at(2, 0.2 * s)])
  const forceps = fillPath(arm(1), METAL.base, METAL.outline, w) + fillPath(arm(-1), METAL.base, METAL.outline, w) +
    g.line([at(L * 0.3, 4.7), at(L * 0.5, 4.6)], METAL.outline, Math.max(1.5, w * 0.45)) + g.line([at(L * 0.3, -4.7), at(L * 0.5, -4.6)], METAL.outline, Math.max(1.5, w * 0.45))
  icon('Dissection', join(own('forceps', forceps), own('scissors', metal), own('scissor-rings', handles, [['rings', ACCENT]], defs.join(''))))
}

// ---------------------------------------------------------------------------------------------------------------------
// Two-photon: an objective focuses two infrared beams (wavy, long wavelength) to one point deep in a block of tissue,
// and only there a fluorophore glows green. (SiliCoDraw's beams come from two red dots; here they leave a microscope
// objective in the accent, drawn here, so that it reads as imaging. The tissue is three rows of the epithelium part
// in SiliCoDraw's peach; its wavy line and the caption "2 × IR → 1 × vis" are left out.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.6, [0, 0.7]), defs = []
  const rows = [6, 22, 38].map((y, i) => epithelium(g, { x: i % 2 ? 4 : -4, y: y + 3, size: 88, cells: 5, id: `tissue-row${i + 1}` }))
  const F = frame(g, 0, -34, 30), w = Number(objW(30 * g.k * 1.2)), cw = Math.max(2, w * 0.8)
  const objBody = rr(-46, -50, 46, -10, 8), nose = [[-34, -12], [34, -12], [22, 30], [-22, 30]]
  const obj = fillPath(poly(F, objBody), shadeFill(F, 'objective-gradient', [-46, -50, 46, -10], ACCENT, defs), ACCENT.outline, w) +
    fillPath(poly(F, nose), ACCENT.shadow, ACCENT.outline, w) + fillPath(poly(F, rr(-22, 26, 22, 36, 3)), GLASS.base, ACCENT.outline, cw) +
    fillPath(poly(F, rr(-38, -42, -28, -16, 4)), ACCENT.light)
  const focus = [0, 24.5], starts = [[-6, -22], [6, -22]]
  const beams = starts.map(([sx, sy], i) => {
    const dx = focus[0] - sx, dy = focus[1] - sy, L = Math.hypot(dx, dy)
    return beam(g, { x: (sx + focus[0]) / 2, y: (sy + focus[1]) / 2, size: L, turn: (Math.atan2(dy, dx) * 180) / Math.PI, colour: 'infrared', kind: 'wave', id: `infrared-beam${i + 1}` })
  })
  const glow = own('fluorescence', g.circle(focus[0], focus[1], 7, GLOW.light, GLOW.outline, Math.max(2, w * 0.5)) + g.circle(focus[0], focus[1], 3.6, GLOW.base), [['fluorescence', GLOW]])
  icon('Two-photon', join(...rows, ...beams, glow, own('objective', obj, [['objective', ACCENT]], defs.join(''))))
}

// ---------------------------------------------------------------------------------------------------------------------
// Super-resolution: the same two structures seen twice on dark screens: at the left as two blurred, diffraction-limited
// spots, at the right resolved into the single molecules that make them up. (Both panels are the screen part; the spots
// are drawn here, in one fluorophore colour for both panels where SiliCoDraw has a see-through blue and an orange, so
// that the right panel reads as the left one resolved. The captions "diffraction" and "~20 nm" are left out.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.85, [0, 0])
  const panels = [-25, 25].map((x, i) => screen(g, { x, y: 0, size: 44, aspect: 1.6, show: 'blank', id: `panel${i + 1}` }))
  const blobs = [[-14, 10.5], [13, 9.5]]
  const tones = [0.42, 0.55, 0.68, 0.8].map((l, i) => toHex({ l, c: 0.05 + i * 0.03, h: FH }))
  let blur = ''
  for (const [y, r] of blobs) tones.forEach((t, i) => { blur += g.circle(-25, y, r * (1 - i * 0.22), t) })
  const dots = [[-3, -17], [3, -13], [-1, -9], [5, -19], [-6, -12], [1, -21], [-3, 7], [3, 11], [0, 15], [-5, 12], [5, 7]]
  const sharp = dots.map(([dx, y]) => g.circle(25 + dx, y, 2.1, FLUO.base)).join('')
  icon('Super-resolution', join(...panels, own('fluorescence', `<g id="blurred">${blur}</g><g id="localised">${sharp}</g>`, [['fluorophore', FLUO]])))
}

// ---------------------------------------------------------------------------------------------------------------------
// Live-cell imaging: a time-lapse in one field of view: a cell grows, then divides into two, with a red recording dot
// and "REC" at the top left. (The cells are the cell part with lilac nuclei; the field and the steps between are drawn
// here. SiliCoDraw shows a cell whose nucleus shifts; dividing reads more surely as a living cell over time. The
// caption "t = 0 → 24 h" is left out; the arrows between the frames carry the time.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.9, [0, 0]), w = Number(objW(92 * g.k)), defs = []
  const F = frame(g, 0, 0, 92)
  const field = fillPath(poly(F, rr(-50, -35, 50, 35, 6)), shadeFill(F, 'field-gradient', [-50, -35, 50, 35], PAPER, defs), METAL.outline, w)
  const c1 = cell(g, { x: -34, y: 4, size: 20, id: 'cell-start' })
  const c2 = cell(g, { x: -3, y: 4, size: 24, aspect: 0.66, nucleus: false, id: 'cell-dividing' })
  const n2 = [-8, 2].map((x, i) => nucleus(g, { x, y: 4, size: 7, id: `dividing-nucleus${i + 1}` }))
  const c3 = [[30, -5, -20], [35, 12, 10]].map(([x, y, t], i) => cell(g, { x, y, size: 15, turn: t, id: `daughter-cell${i + 1}` }))
  const arrows = [[-23, -16], [10, 20]].map(([a, b], i) => arrow(g, { points: [[a, 4], [b, 4]], colour: INK, w: 6, id: `time-arrow${i + 1}` }))
  const rec = own('recording', g.circle(-38, -24, 3.4, LAMP_RED.outline) + lettering(g, { x: -26, y: -24, h: 5, text: 'REC', colour: LAMP_RED.outline, id: 'rec-letters' }).body, [['recording', LAMP_RED]])
  icon('Live-cell imaging', join(own('field', field, [], defs.join('')), ...arrows, c1, c2, ...n2, ...c3, rec))
}

// ---------------------------------------------------------------------------------------------------------------------
// Slide scanner: an instrument with a window over a glass slide that carries a stained section (pink cells with lilac
// nuclei, as the microscope slide of lb03), and a scan head in the accent passing across it. "WSI" (whole-slide
// imaging) is lettered on the casing, as SiliCoDraw writes it. (The casing is the instrument part; window, slide and
// head are drawn here. SiliCoDraw's base plate is left out: the casing stands on feet.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.95, [0, 2]), defs = []
  const casing = instrument(g, { x: 0, y: 2, size: 92, aspect: 0.66, screen: false, buttons: 0, lamp: 'on', feet: true, id: 'scanner' })
  const w = Number(objW(60 * g.k)), cw = Math.max(2, w * 0.8)
  const win = g.path(g.smooth ? `M${P2(g.P([-38, -14]))} L${P2(g.P([16, -14]))} L${P2(g.P([16, 22]))} L${P2(g.P([-38, 22]))}Z` : '', PAPER.shadow, METAL.outline, w)
  const S = frame(g, -11, 4, 46)
  const slide = fillPath(poly(S, rr(-50, -17, 50, 17, 3)), GLASS.base, GLASS.outline, cw) + fillPath(poly(S, rr(26, -17, 50, 17, 3)), PAPER.base, PAPER.outline, Math.max(1.5, w * 0.45))
  const cells = [[-21, 1, 9, 20], [-14, -3.5, 8.5, -30], [-8, 3, 8, 40]].map(([x, y, sz, t], i) => cell(g, { x, y, size: sz, turn: t, pal: EOSIN, vesicles: false, seed: i, id: `section-cell${i + 1}` }))
  const head = g.path(`M${P2(g.P([-2, -16]))} L${P2(g.P([4, -16]))} L${P2(g.P([4, 24]))} L${P2(g.P([-2, 24]))}Z`, ACCENT.base, ACCENT.outline, cw) +
    g.path(`M${P2(g.P([-6, -19]))} L${P2(g.P([8, -19]))} L${P2(g.P([8, -12]))} L${P2(g.P([-6, -12]))}Z`, ACCENT.shadow, ACCENT.outline, cw)
  const wsi = lettering(g, { x: 30, y: 4, h: 7, text: 'WSI', colour: METAL.outline, id: 'wsi' }).body
  icon('Slide scanner', join(casing, own('window', win), own('slide', slide), ...cells, own('scan-head', head, [['scan head', ACCENT]]), own('letters', wsi)))
}

// ---------------------------------------------------------------------------------------------------------------------
// Stereo microscope: the stereo kind of the microscope part (plate, pillar, head with two eyepieces) with a petri dish
// of agar on its stage, where SiliCoDraw has a small grey specimen. (Its dark grey head is the accent of the part.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.6, [0, -1.4])
  icon('Stereo microscope', join(microscope(g, { x: 0, y: 0, size: 98, kind: 'stereo', id: 'stereo-microscope' }), petriDish(g, { x: 3, y: 23.5, size: 26, view: 'angled', id: 'dish' })))
}

// ---------------------------------------------------------------------------------------------------------------------
// Rotary evaporator: on a stand, a motor turns a round-bottom flask of solution that lies tilted in a warm water bath;
// the vapour rises through the duct into a condenser cooled by a coil, and the solvent drips into a receiving flask
// below. (The two flasks are the glassware part; stand, motor, duct, condenser, coil and bath are drawn here. The
// solution is the green reagent, the collected solvent and the bath water-blue; SiliCoDraw tints both flasks blue.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.6, [0, -1.4]), w = Number(objW(70 * g.k)), cw = Math.max(2, w * 0.8), defs = []
  const B = frame(g, 0, 0, 100)
  // stand
  let stand = fillPath(poly(B, rr(-46, -46, -38, 42, 2)), shadeFill(B, 'pillar-gradient', [-46, -46, -38, 42], METAL, defs), METAL.outline, w)
  stand += fillPath(poly(B, rr(-49, 38, -2, 46, 3)), shadeFill(B, 'foot-gradient', [-49, 38, -2, 46], METAL, defs), METAL.outline, w)
  stand += fillPath(poly(B, rr(-40, -32, -18, -26, 1.5)), METAL.shadow, METAL.outline, cw)
  // receiving flask under the motor, joined by a glass tube
  const recv = glassware(g, { x: -20, y: 10, size: 34, kind: 'round', liquid: 'water', level: 0.35, id: 'receiving-flask' })
  const drop = glassTube(g, [[-20, -24], [-20, -8]], 3.4 * g.k, cw)
  // condenser: a glass column up to the right with the cooling coil inside
  const C0 = [-12, -30], C1 = [16, -46]
  const condenser = glassTube(g, [C0, C1], 9 * g.k, w)
  const cdx = C1[0] - C0[0], cdy = C1[1] - C0[1], CL = Math.hypot(cdx, cdy), cux = cdx / CL, cuy = cdy / CL
  const coil = Array.from({ length: 41 }, (_, i) => { const t = 4 + ((CL - 8) * i) / 40, o = Math.sin((i / 40) * Math.PI * 2 * 5) * 2.6; return [C0[0] + cux * t - cuy * o, C0[1] + cuy * t + cux * o] })
  const coilD = g.line(coil, LIQUIDS.water.outline, Math.max(2, w * 0.55))
  // bath, flask and the water over the flask's lower part
  const bath = fillPath(poly(B, rr(2, 14, 48, 44, 4)), shadeFill(B, 'bath-gradient', [2, 14, 48, 44], METAL, defs), METAL.outline, w)
  const t = -50, a = (t * Math.PI) / 180, S = 44, bodyAt = [27, 20]
  const Cf = [bodyAt[0] + Math.sin(a) * 0.18 * S, bodyAt[1] - Math.cos(a) * 0.18 * S]
  const neck = [Cf[0] + Math.sin(a) * 0.5 * S, Cf[1] - Math.cos(a) * 0.5 * S]
  const flask = glassware(g, { x: Cf[0], y: Cf[1], size: S, turn: t, kind: 'round', liquid: 'reagent', level: 0.45, id: 'evaporating-flask' })
  const water = fillPath(poly(B, rr(6, 26, 44, 40, 2.5)), LIQUIDS.water.small) + linePath(poly(B, [[6, 26], [44, 26]], false), LIQUIDS.water.outline, Math.max(1.6, w * 0.5))
  const duct = glassTube(g, [neck, [-8, -22]], 4.2 * g.k, cw)
  // motor
  const motor = fillPath(poly(B, rr(-24, -38, 0, -16, 4)), shadeFill(B, 'motor-gradient', [-24, -38, 0, -16], METAL, defs), METAL.outline, w) +
    fillPath(poly(B, rr(-24, -38, 0, -32, 3)), ACCENT.base, ACCENT.outline, w) + circle(B, -12, -24, 3, ACCENT.small, ACCENT.outline, Math.max(1.5, w * 0.45))
  const turnArrow = cycleArrow(g, { x: 4, y: -4, size: 13, turn: -50, colour: INK, w: 3.6, sweep: 240, id: 'rotation' })
  icon('Rotary evaporator', join(
    own('stand', stand, [], defs.join('')),
    own('drip-tube', drop), recv,
    own('condenser', condenser), own('coolant', coilD, [['coolant', LIQUIDS.water]]),
    own('bath', bath), flask, own('bath-water', water, [['bath water', LIQUIDS.water]]),
    own('duct', duct), own('motor', motor, [['motor', ACCENT]]), turnArrow))
}

check()
console.log('written to', OUT)
