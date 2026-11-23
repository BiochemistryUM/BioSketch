// Eight icons of SiliCoDraw's "Lab & equipment" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts in ../parts/
// and the conventions of objects in ../parts/lab.mjs: lab notebook, stopwatch, safety goggles, lab glove, biohazard,
// confocal microscope, light-sheet microscope and Transmission electron microscope. Their compositions are read by hand from the source in
// a 100 × 100 box centred on 0,0 and scaled onto a 512 page (`page` of ../cellkit.mjs).
// Parts used: hazardSign (ISO 7010 biohazard triangle), beam (laser, emission, light sheet), screen, microscope
// (electron) (lab.mjs); placeCellType (the approved Morula, as the embryo in the light sheet) (tissue.mjs).
// Drawn here because no part draws them: the notebook with its spiral, the stopwatch, the goggles, the glove, the optics
// of the two light microscopes (laser housing, dichroic mirror, lenses, pinhole, detector, objectives, stage) and the
// monitor of the TEM with its micrograph of a cell.
// Lettered: nothing (no original writes on the thing; "detect" on the light-sheet microscope is a caption, left out).
// Usage: node lb05.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page } from '../cellkit.mjs'
import { deep, toHex, toLch } from '../colour.mjs'
import { f } from '../shapes.mjs'
import { ACCENT, BEAMS, DARK, GLASS, INK, METAL, PAPER, beam, hazardSign, microscope, objW, screen } from '../parts/lab.mjs'
import { placeCellType } from '../parts/tissue.mjs'

const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012: the materials) are left out of the hue check, as the conventions of lab.mjs say.
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p]) => toLch(p.base).c >= 0.012), defs, body)
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts) })
const icon = (name, { defs, body, parts }) => cellType(name, parts, defs, body)
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })

/** A rounded rectangle given in g's units, as a path on the page. */
const rrect = (g, x0, y0, x1, y1, r) => {
  const [a, b] = g.P([x0, y0]), W = (x1 - x0) * g.k, H = (y1 - y0) * g.k, R = Math.min(r * g.k, W / 2, H / 2)
  return `M${f(a + R)},${f(b)} H${f(a + W - R)} A${f(R)},${f(R)} 0 0 1 ${f(a + W)},${f(b + R)} V${f(b + H - R)} A${f(R)},${f(R)} 0 0 1 ${f(a + W - R)},${f(b + H)} H${f(a + R)} A${f(R)},${f(R)} 0 0 1 ${f(a)},${f(b + H - R)} V${f(b + R)} A${f(R)},${f(R)} 0 0 1 ${f(a + R)},${f(b)} Z`
}
const poly = (g, pts) => `M${pts.map((p) => g.P(p).map(f).join(',')).join(' L')}Z`
const mirror = (pts) => pts.map(([x, y]) => [-x, y]).reverse()
/** A biconvex lens across x0…x1 at y, `t` thick in the middle. */
const lens = (g, x0, x1, y, t) => {
  const P = (a, b) => g.P([a, b]).map(f).join(','), m = (x0 + x1) / 2
  return `M${P(x0, y)} Q${P(m, y - t)} ${P(x1, y)} Q${P(m, y + t)} ${P(x0, y)}Z`
}

// ---------------------------------------------------------------------------------------------------------------------
// Lab notebook: a spiral-bound notebook seen from the front, its cover showing behind the ruled page, a heading rule and
// four ruled lines, and the metal rings of the spiral along its left edge.
// (SiliCoDraw's cream page and brown lines become the paper of the conventions with blue rules; the cover is the accent
// blue; the four rings become seven, as a spiral binding has.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.75, [-1, 0]), w = objW(92 * g.k), cw = Math.max(2, w * 0.75), fine = Math.max(2, w * 0.55)
  const cover = g.path(rrect(g, -30, -44, 38, 47, 6), 'url(#notebook-cover-gradient)', ACCENT.outline, w)
  const pageD = g.path(rrect(g, -34, -47, 32, 43, 5), 'url(#notebook-page-gradient)', PAPER.outline, w)
  const rules = g.line([[-22, -30], [24, -30]], ACCENT.outline, fine * 1.15) +
    [-16, -3, 10, 23].map((y, i) => g.line([[-18, y], [i === 3 ? 6 : 22, y]], ACCENT.shadow, fine)).join('')
  const rings = [-38, -26, -14, -2, 10, 22, 34].map((y) => g.circle(-27, y, 2.6, DARK.base) +
    `<path d="M${g.P([-27, y]).map(f).join(',')} L${g.P([-39, y]).map(f).join(',')}" fill="none" stroke="${METAL.outline}" stroke-width="${f(3.6 * g.k)}" stroke-linecap="round"/>` +
    `<path d="M${g.P([-27, y]).map(f).join(',')} L${g.P([-39, y]).map(f).join(',')}" fill="none" stroke="${METAL.base}" stroke-width="${f(3.6 * g.k - 2 * cw * 0.7)}" stroke-linecap="round"/>`).join('')
  icon('Lab notebook', join(
    own('cover', cover, [['cover', ACCENT]], g.grad('notebook-cover-gradient', [-30, -44, 38, 47], ACCENT)),
    own('page', pageD + g.hl(18, -38, 22, 7, 0, PAPER.light), [], g.grad('notebook-page-gradient', [-34, -47, 32, 43], PAPER)),
    own('rules', rules), own('spiral', rings)))
}

// ---------------------------------------------------------------------------------------------------------------------
// Stopwatch: a round metal case with its crown and start button on top and a second button at the side, a white dial
// with twelve marks, and two hands.
// (SiliCoDraw's buttons and hands keep its blue, the accent; the dial gains its marks and the side button its place.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.95, [0, -0.6]), w = objW(95 * g.k), cw = Math.max(2, w * 0.75), cy = 7, R = 38
  const side = `<g transform="rotate(42 ${f(g.X(0))} ${f(g.Y(cy))})">${g.path(rrect(g, -3.5, cy - R - 7, 3.5, cy - R + 2, 1.5), METAL.shadow, METAL.outline, cw)}${g.path(rrect(g, -6, cy - R - 11, 6, cy - R - 5, 2), ACCENT.base, ACCENT.outline, cw)}</g>`
  const stem = g.path(rrect(g, -4, cy - R - 8, 4, cy - R + 2, 1.5), METAL.shadow, METAL.outline, cw)
  const crown = g.path(rrect(g, -9, cy - R - 15, 9, cy - R - 6, 3), 'url(#stopwatch-button-gradient)', ACCENT.outline, cw)
  const caseD = g.circle(0, cy, R, 'url(#stopwatch-case-gradient)', METAL.outline, w)
  const dial = g.circle(0, cy, R - 6.5, PAPER.base, METAL.outline, cw) + g.hl(-14, cy - 18, 26, 10, -35, PAPER.light)
  const marks = Array.from({ length: 12 }, (_, i) => { const a = (i * 30 * Math.PI) / 180, r0 = i % 3 ? 26.5 : 23.5, r1 = 29
    return g.line([[Math.sin(a) * r0, cy - Math.cos(a) * r0], [Math.sin(a) * r1, cy - Math.cos(a) * r1]], INK, i % 3 ? cw * 0.8 : cw * 1.2) }).join('')
  const hands = g.line([[0, cy], [0, cy - 21]], ACCENT.outline, w * 1.05) + g.line([[0, cy], [14, cy + 10]], ACCENT.outline, w * 1.05) + g.circle(0, cy, 4, ACCENT.base, ACCENT.outline, cw)
  icon('Stopwatch', join(
    own('buttons', side + stem + crown, [['buttons', ACCENT]], g.grad('stopwatch-button-gradient', [-9, cy - R - 15, 9, cy - R - 6], ACCENT)),
    own('case', caseD + dial + marks, [], g.grad('stopwatch-case-gradient', [-R, cy - R, R, cy + R], METAL)),
    own('hands', hands)))
}

// ---------------------------------------------------------------------------------------------------------------------
// Safety goggles: wrap-around goggles seen from the front, one frame round two lenses with a notch for the nose, vents on
// the frame and the strap running back at both sides.
// (SiliCoDraw draws two separate lenses on a bridge like spectacles; safety goggles are one sealed frame. The lenses are
// clear glass of the conventions with a highlight; frame and strap in the accent.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.55, [0, 1]), w = objW(96 * g.k), cw = Math.max(2, w * 0.75)
  const strap = [-1, 1].map((s) => g.path(rrect(g, s < 0 ? -50 : 38, -7, s < 0 ? -38 : 50, 5, 3), ACCENT.shadow, ACCENT.outline, cw)).join('')
  const half = [[-2, -17], [-22, -19], [-40, -16], [-46, -6], [-45, 8], [-36, 18], [-16, 19], [-7, 12]]
  const frame = [...half, ...mirror(half), [0, 8]]
  const lensL = [[-7, -10], [-22, -12], [-35, -10], [-39, -2], [-37, 8], [-30, 12], [-17, 13], [-9, 7]]
  const lenses = [lensL, mirror(lensL)].map((pts) => g.path(g.smooth(pts), 'url(#goggles-lens-gradient)', ACCENT.outline, cw)).join('') +
    [-1, 1].map((s) => g.line([[s * 31, -5], [s * 24, 4]], GLASS.light, w * 1.4) + g.line([[s * 22, -6], [s * 19, -2]], GLASS.light, w * 1.4)).join('')
  const vents = [-34, -28, 28, 34].map((x) => g.circle(x, -14.2, 1.6, ACCENT.outline)).join('')
  icon('Safety goggles', join(
    own('strap', strap, [['frame', ACCENT]]),
    own('frame', g.path(g.smooth(frame), 'url(#goggles-frame-gradient)', ACCENT.outline, w) + vents, [], g.grad('goggles-frame-gradient', [-46, -19, 46, 19], ACCENT)),
    own('lenses', lenses, [], g.grad('goggles-lens-gradient', [-39, -12, 39, 13], GLASS))))
}

// ---------------------------------------------------------------------------------------------------------------------
// Lab glove: a nitrile glove, palm towards us, four fingers up and the thumb out to the side, with its cuff and rolled
// rim at the wrist.
// (SiliCoDraw's glove in the accent blue as one material, with a rounder hand and the thumb set lower, as a hand's is.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.75, [-6.8, 0.5]), w = objW(95 * g.k), cw = Math.max(2, w * 0.75)
  const fw = 10.5 * g.k, L = (pts) => `M${pts.map((p) => g.P(p).map(f).join(',')).join(' L')}`
  const hand = [
    rrect(g, -21, -10, 22, 30, 9),
    { d: L([[-15.5, -4], [-16, -35]]), width: fw }, { d: L([[-5, -4], [-5, -42]]), width: fw },
    { d: L([[5.5, -4], [6, -39]]), width: fw }, { d: L([[16, -2], [17, -28]]), width: fw * 0.92 },
    { d: L([[-16, 18], [-27, 4], [-35, -6]]), width: fw * 1.05 },
  ]
  const cuff = g.path(poly(g, [[-22, 26], [22, 26], [26, 45], [-26, 45]]), 'url(#glove-gradient)', ACCENT.outline, w) +
    g.path(rrect(g, -28, 41, 28, 48, 3.5), ACCENT.shadow, ACCENT.outline, cw)
  const creases = g.line([[-10.5, -6], [-10.5, -1]], ACCENT.outline, cw * 0.7) + g.line([[0.3, -6], [0.3, -1]], ACCENT.outline, cw * 0.7) + g.line([[11, -5], [11, 0]], ACCENT.outline, cw * 0.7)
  icon('Lab glove', own('glove', cuff + g.union(hand, 'url(#glove-gradient)', ACCENT.outline, w) + creases +
    g.hl(-12, 12, 6 * g.k, 2.5 * g.k, -30, ACCENT.light),
  [['glove', ACCENT]], g.grad('glove-gradient', [-30, -42, 26, 48], ACCENT)))
}

// ---------------------------------------------------------------------------------------------------------------------
// Biohazard: the ISO 7010 warning sign for biological hazard (W009), a yellow triangle with the biohazard symbol.
// (SiliCoDraw's yellow disc with three rings becomes the standard sign and the standard symbol, as the owner approved.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(5.0, [0, -1.5])
  icon('Biohazard', hazardSign(g, { x: 0, y: 0, size: 94, symbol: 'biohazard', id: 'biohazard' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Confocal microscope (the light path): a blue laser comes in from the left, a dichroic mirror sends it down through the
// objective lens onto the specimen on the stage; the green fluorescence goes back up through the mirror, is focused by a
// lens onto the pinhole and reaches the detector.
// (SiliCoDraw draws one green line, a pinhole, two lenses and a laser turning onto the axis without a mirror. Corrected
// modestly: the exciting light is blue and the emitted light green, side by side; the dichroic mirror that separates
// them and the detector behind the pinhole are added.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(5.0, [-10.5, -2.25]), w = objW(60 * g.k), cw = Math.max(2, w * 0.75), bw = 2.1 * g.k
  const ex = BEAMS.blue, em = BEAMS.green, xe = -2.6, xm = 2.6
  const laser = g.path(rrect(g, -52, -6, -35, 5, 2.5), 'url(#laser-gradient)', METAL.outline, cw) + g.path(rrect(g, -35, -3, -32, 2, 0.8), DARK.base, DARK.outline, cw * 0.7)
  const exc = beam(g, { x: (-32 + xe) / 2, y: -0.5, size: xe + 32, width: bw, colour: ex, id: 'laser-in' })
  const excDown = beam(g, { x: xe, y: (-0.5 + 33) / 2, size: 33.5, turn: 90, width: bw, colour: ex, id: 'laser-down' })
  const emis = beam(g, { x: xm, y: (33 - 41) / 2, size: 74, turn: 90, width: bw, colour: em, id: 'emission' })
  const detector = g.path(rrect(g, -12, -49, 17, -38, 3), 'url(#detector-gradient)', METAL.outline, w) + g.path(rrect(g, -1, -40.5, 6, -37.5, 1), DARK.base, DARK.outline, cw * 0.7)
  const pinhole = g.path(rrect(g, -20, -29, xm - 2.2, -25, 1), METAL.shadow, METAL.outline, cw) + g.path(rrect(g, xm + 2.2, -29, 24, -25, 1), METAL.shadow, METAL.outline, cw)
  const lenses = g.path(lens(g, -16, 21, -13, 9), 'url(#confocal-glass)', GLASS.outline, cw) + g.path(lens(g, -16, 21, 18, 9), 'url(#confocal-glass)', GLASS.outline, cw)
  const dich = `<g transform="rotate(45 ${f(g.X(0))} ${f(g.Y(-0.5 + 0))})">${g.path(rrect(g, -15, -2.3, 15, 1.3, 1), GLASS.shadow, GLASS.outline, cw)}</g>`
  const stage = g.path(rrect(g, -24, 36, 30, 43, 2.5), 'url(#stage-gradient)', METAL.outline, w) + g.path(rrect(g, -15, 33.5, 21, 36.5, 0.8), GLASS.base, GLASS.outline, cw * 0.7)
  const spec = g.ellipse(0, 31.5, 6.5, 3, 0, em.base, em.outline, cw)
  icon('Confocal microscope', join(
    own('housings', laser + detector + pinhole + stage, [], g.grad('laser-gradient', [-52, -6, -35, 5], METAL) + g.grad('detector-gradient', [-12, -49, 17, -38], METAL) + g.grad('stage-gradient', [-24, 36, 30, 43], METAL)),
    { ...exc, parts: [['laser', ex]] }, { ...excDown, parts: [] }, { ...emis, parts: [['emission', em]] },
    own('optics', lenses + dich, [], g.grad('confocal-glass', [-16, -22, 21, 27], GLASS)),
    own('specimen', spec)))
}

// ---------------------------------------------------------------------------------------------------------------------
// Light-sheet microscope: an illumination objective at the left sends a thin sheet of blue light through an embryo;
// a detection objective above, at a right angle to the sheet, looks down on the lit plane.
// (SiliCoDraw's sheet and objectives, drawn as objectives; its yellow embryo is the approved Morula; the word "detect"
// is left out: the objective pointing at the sample says it.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const SHEET = deep(195) // cyan, 488 nm, and 40° from the Morula's blue zona
  const g = page(4.7, [-1, -17.5]), w = objW(40 * g.k), cw = Math.max(2, w * 0.75), sx = 14
  const sheet = beam(g, { x: sx, y: 0, size: 64, kind: 'sheet', colour: SHEET, width: 2 * g.k, id: 'light-sheet' })
  const objH = (pts) => g.path(poly(g, pts), 'url(#objective-gradient)', METAL.outline, w)
  const illum = g.path(rrect(g, -50, -9, -30, 9, 3), 'url(#objective-gradient)', METAL.outline, w) + g.path(rrect(g, -38, -9.5, -34, 9.5, 1), DARK.base, DARK.outline, cw * 0.7) +
    objH([[-30, -7], [-21, -4.5], [-21, 4.5], [-30, 7]]) + g.path(rrect(g, -21.5, -3.6, -19, 3.6, 1), GLASS.base, GLASS.outline, cw * 0.7)
  const detect = g.path(rrect(g, sx - 10, -50, sx + 10, -30, 3), 'url(#objective-gradient)', METAL.outline, w) + g.path(rrect(g, sx - 10.5, -42, sx + 10.5, -38, 1), DARK.base, DARK.outline, cw * 0.7) +
    objH([[sx - 7.5, -30], [sx + 7.5, -30], [sx + 4.5, -21], [sx - 4.5, -21]]) + g.path(rrect(g, sx - 3.6, -21.5, sx + 3.6, -19, 1), GLASS.base, GLASS.outline, cw * 0.7)
  const embryo = placeCellType(g, 'Morula', { x: sx, y: 0, size: 24, id: 'embryo' })
  const plane = g.line([[sx - 11, 0], [sx + 11, 0]], SHEET.small, 1.4 * g.k)
  icon('Light-sheet microscope', join(own('objectives', illum + detect, [], g.grad('objective-gradient', [-50, -50, 24, 9], METAL)), sheet, embryo, own('lit-plane', plane)))
}

// ---------------------------------------------------------------------------------------------------------------------
// Transmission electron microscope: the electron microscope part (the column with its gun, three lenses and the beam, on a desk with its
// screen and a lamp that is on) and, on the desk, a monitor showing a micrograph of a cell in greys.
// (SiliCoDraw's small panel beside the column becomes the monitor; its lines of text become the micrograph, which tells
// a transmission microscope from a scanning one.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.75, [-5.3, 0]), sz = 98, u = sz / 100, deskTop = 24 * u
  const scope = microscope(g, { x: -6, y: 0, size: sz, kind: 'electron', id: 'tem' })
  const w = objW(sz * g.k), cw = Math.max(2, w * 0.75)
  const mx = 26, my = deskTop - 22
  const stand = g.path(rrect(g, mx - 2.5, my + 8, mx + 2.5, deskTop + 0.5, 1), METAL.shadow, METAL.outline, cw) + g.path(rrect(g, mx - 9, deskTop - 3, mx + 9, deskTop + 0.5, 1.5), METAL.base, METAL.outline, cw)
  const mon = screen(g, { x: mx, y: my, size: 30, aspect: 0.72, show: 'blank', id: 'monitor' })
  const grey = (l) => toHex({ l, c: 0.004, h: 250 })
  const img = g.path(rrect(g, mx - 12.2, my - 8.6, mx + 12.2, my + 8.6, 1.2), grey(0.86)) + g.ellipse(mx - 1, my + 0.5, 10, 7, -12, grey(0.68), grey(0.4), cw * 0.6) +
    g.circle(mx - 3, my + 1, 3.6, grey(0.42)) + g.ellipse(mx + 4.5, my - 2.5, 2.4, 1.2, 30, grey(0.5)) + g.ellipse(mx + 4, my + 3.5, 1.8, 1, -20, grey(0.5))
  icon('Transmission electron microscope', join(own('monitor-stand', stand), scope, { ...mon, parts: [] }, own('micrograph', img)))
}

check()
console.log('written to', OUT)
