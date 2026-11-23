// Eight icons of SiliCoDraw's "Techniques & assays" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts of the
// category (../parts/assays.mjs), the objects of ../parts/lab.mjs and the approved cells: Cell passage, Confluence,
// Transwell assay, Matrix dome, Brain slice, Proteomic ageing clock, Faecal microbiota transplant and Diastolic
// dysfunction (E/A reversal). Compositions are read by hand from the source in its 100 × 100 box centred on 0,0 and
// scaled onto a 512 page (`page` of ../cellkit.mjs); outlines at 60 % (setStrokeScale), gloss on (the approved cells
// placed by placeCellType are glossy already; the proteins are surfaces.mjs's shaded proteins, with their own depth).
// Parts used: imageField, tissueSection (its slide) (assays.mjs); petriDish, syringe, screen (lab.mjs); placeCellType
// ('Cell', 'Organoid'), vessel (as the colon), bacterium, arrow (tissue.mjs); shadedProtein (surfaces.mjs); brainPal
// (complexes.mjs); lettering.
// Drawn here because no part draws them: the well and insert of a transwell, a dome of matrix on a plate bottom, a
// coronal section of the brain, a clock face with the share of a lifetime, Doppler peaks of mitral inflow with an ECG.
// Lettered: P1 and P2 (passage numbers), E and A (the two waves of mitral inflow).
// Usage: node tbO.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex, toLch } from '../colour.mjs'
import { f, setStrokeScale, strokeScale } from '../shapes.mjs'
import { GRID, SERIES, imageField, tissueSection } from '../parts/assays.mjs'
import { brainPal } from '../parts/complexes.mjs'
import { DARK, GLASS, GLOW, INK, LIQUIDS, METAL, PAPER, PLASTIC, objW, petriDish, screen, syringe } from '../parts/lab.mjs'
import { lettering } from '../parts/letters.mjs'
import { AMBER, shadedProtein } from '../parts/surfaces.mjs'
import { arrow, bacterium, placeCellType, vessel } from '../parts/tissue.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012: plastic, glass, metal, paper, ink) are left out of the hue check, as the conventions of
// lab.mjs say; the same palette used by several parts is one colour, listed once.
const icon = (name, [k, cx, cy], draw) => {
  const g = page(k, [cx, cy]), { defs, body, parts } = draw(g)
  const seen = parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base) === i)
  kit.cellType(name, seen, defs, body)
}
const join = (...ps) => ({ defs: ps.map((p) => p.defs ?? '').join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts ?? []) })
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })

// ---------- small drawing helpers in g's units ----------
const P2 = (p) => p.map(f).join(',')
const rrect = (g, x0, y0, x1, y1, r) => {
  const [a, b] = g.P([x0, y0]), W = (x1 - x0) * g.k, H = (y1 - y0) * g.k, R = Math.min(r * g.k, W / 2, H / 2)
  return `M${f(a + R)},${f(b)} H${f(a + W - R)} A${f(R)},${f(R)} 0 0 1 ${f(a + W)},${f(b + R)} V${f(b + H - R)} A${f(R)},${f(R)} 0 0 1 ${f(a + W - R)},${f(b + H)} H${f(a + R)} A${f(R)},${f(R)} 0 0 1 ${f(a)},${f(b + H - R)} V${f(b + R)} A${f(R)},${f(R)} 0 0 1 ${f(a + R)},${f(b)} Z`
}
const strokeD = (d, colour, w, cap = 'round', extra = '') => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"${extra}/>`
const fillD = (d, fill, s = '', w = 0) => `<path d="${d}" fill="${fill}"${s ? ` stroke="${s}" stroke-width="${f(w)}" stroke-linejoin="round"` : ''}/>`
const polyline = (g, pts, close = false) => `M${pts.map((p) => P2(g.P(p))).join(' L')}${close ? 'Z' : ''}`
const objFill = (g, id, box, pal, defs) => (Math.max(box[2] - box[0], box[3] - box[1]) * g.k >= 80 ? (defs.push(g.grad(id, box, pal)), `url(#${id})`) : pal.base)
/** A path in source units (absolute M, L, C, Q, written with commas), each point moved onto the page. */
const mapD = (g, d) => d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, a, b) => P2(g.P([+a, +b])))
const dashed = (w) => ` stroke-dasharray="${f(w * 2.2)} ${f(w * 1.6)}"`

// ---------- the icons ----------
// Cell passage: a confluent dish (P1) is split into two new dishes (P2), each seeded with fewer cells.
icon('Cell passage', [4.76, -1.05, 4.21], (g) => {
  const big = petriDish(g, { x: -24, y: -4, size: 52, fill: 'medium', cells: 10, id: 'dish-P1' })
  const small = [-22, 18].map((y, i) => petriDish(g, { x: 30, y, size: 35, fill: 'medium', cells: 4, seed: i + 2, id: `dish-P2-${i + 1}` }))
  const go = arrow(g, { x: 6.5, y: -2, size: 13, colour: INK, w: 7, id: 'split' })
  const labels = own('passage-numbers', lettering(g, { x: -24, y: 30, h: 7.5, text: 'P1', colour: INK, id: 'P1' }).body + lettering(g, { x: 30, y: 43.5, h: 7.5, text: 'P2', colour: INK, id: 'P2' }).body)
  return join(big, ...small, go, labels)
})

// Confluence: the same culture under phase contrast, first sparse (about 30 %), then confluent (100 %): the percentages
// are left out; an arrow says the one becomes the other.
icon('Confluence', [4.649, 0.0, 0.0], (g) => join(
  imageField(g, { x: -27, y: 0, size: 44, shape: 'rect', aspect: 1.35, mode: 'phase', count: 3, seed: 4, id: 'sparse' }),
  arrow(g, { x: 0, y: 0, size: 9, colour: INK, w: 6, id: 'grows' }),
  imageField(g, { x: 27, y: 0, size: 44, shape: 'rect', aspect: 1.35, mode: 'phase', count: 14, seed: 6, id: 'confluent' }),
))

// Transwell assay: an insert hangs in a well of medium; cells seeded on its porous membrane migrate through it towards
// a chemoattractant (amber dots, SiliCoDraw's orange) in the well below.
const ATTRACT = SERIES[3]
icon('Transwell assay', [4.75, 0.0, -0.95], (g) => {
  const defs = [], w = objW(80 * g.k), med = LIQUIDS.medium
  // the well: a cup of plastic with medium up to the membrane's level
  const well = mapD(g, 'M-42,-32L-42,30Q-42,40 -32,40L32,40Q42,40 42,30L42,-32')
  let s = fillD(well + 'Z', objFill(g, 'well-gradient', [-42, -32, 42, 40], PLASTIC, defs), PLASTIC.outline, w)
  s += fillD(mapD(g, 'M-38,-6L38,-6L38,30Q38,36 32,36L-32,36Q-38,36 -38,30Z'), med.small)
  s += strokeD(polyline(g, [[-38, -6], [38, -6]]), med.outline, Math.max(1.5, w * 0.5))
  const wellG = own('well', s, [['well', PLASTIC], ['medium', med]], defs.join(''))
  // the insert: walls with a rim resting on the well's edge, medium inside, a porous membrane (dashed) as its floor
  let t = fillD(mapD(g, 'M-30,-38L-30,6L30,6L30,-38Z'), PLASTIC.light, PLASTIC.outline, w)
  t += fillD(mapD(g, 'M-27,-22L27,-22L27,5L-27,5Z'), med.small) + strokeD(polyline(g, [[-27, -22], [27, -22]]), med.outline, Math.max(1.5, w * 0.5))
  t += fillD(rrect(g, -48, -42, -28, -36, 1.5), PLASTIC.shadow, PLASTIC.outline, w * 0.8) + fillD(rrect(g, 28, -42, 48, -36, 1.5), PLASTIC.shadow, PLASTIC.outline, w * 0.8)
  t += strokeD(polyline(g, [[-30, 6], [30, 6]]), PAPER.light, w * 1.6) + strokeD(polyline(g, [[-30, 6], [30, 6]]), PLASTIC.outline, w * 1.1, 'butt', dashed(w * 0.8))
  const insert = own('insert', t, [['insert', PLASTIC]])
  const cells = [[-17, -1, 12], [0, -1, 12], [17, -1, 12], [-9, 13, 11], [10, 15, 11]].map(([x, y, sz], i) => placeCellType(g, 'Cell', { x, y, size: sz, id: `cell${i + 1}` }))
  const dots = own('chemoattractant', [[-32, 30], [-24, 25], [26, 28], [33, 22], [-31, 18], [30, 33]].map(([x, y]) => g.circle(x, y, 2.4, ATTRACT.small)).join(''), [['chemoattractant', ATTRACT]])
  const go = arrow(g, { points: [[0, 10], [0, 27]], corners: true, colour: INK, w: 5, id: 'migration' })
  return join(wellG, dots, insert, ...cells.slice(0, 3), ...cells.slice(3), go)
})

// Matrix dome: a drop of basement-membrane matrix (Matrigel) set as a dome on the bottom of a well, organoids growing in
// it. The matrix is a pale amber gel (SiliCoDraw's #fde8c8), 36° and more from the green organoids.
const GEL = rich(hueOf('#fde8c8'))
icon('Matrix dome', [5.167, 0.0, 6.04], (g) => {
  const defs = [], w = objW(80 * g.k)
  const plate = own('plate', fillD(rrect(g, -44, 20, 44, 34, 4), objFill(g, 'plate-gradient', [-44, 20, 44, 34], PLASTIC, defs), PLASTIC.outline, w), [['plate', PLASTIC]], '')
  const domeD = mapD(g, 'M-36,21C-36,-10 -18,-22 0,-22C18,-22 36,-10 36,21Z')
  const dome = own('matrix', fillD(domeD, objFill(g, 'matrix-gradient', [-36, -22, 36, 21], GEL, defs), GEL.outline, w) +
    strokeD(mapD(g, 'M-26,-2C-24,-10 -16,-16 -8,-17'), GEL.light, Math.max(2.5, w * 0.9)), [['matrix', GEL]])
  const orgs = [[-15, 5, 15], [7, -7, 14], [17, 10, 13], [-3, 12, 11]].map(([x, y, s], i) => placeCellType(g, 'Organoid', { x, y, size: s, id: `organoid${i + 1}` }))
  return join({ defs: defs.join(''), body: '', parts: [] }, plate, dome, ...orgs)
})

// Brain slice: a coronal section of the brain on a glass slide: two hemispheres with the cortex, the midline and the two
// lateral ventricles; a flat stained section, in the brain's pink (complexes.mjs). The slide is tissueSection's, whose own
// round section is left out.
const BRAIN = brainPal(hueOf('#f3d4dc'))
icon('Brain slice', [4.63, 0.0, 0.0], (g) => {
  const S = tissueSection(g, { x: 0, y: 0, size: 98, stain: 'plain', id: 'slide' })
  const body = S.body.replace(/<g id="slide-tissue">[\s\S]*?<\/g>/, '')
  const w = objW(70 * g.k)
  // the section, centred on 9, 0 in the slide's free part (the frosted end is at the left)
  const T = (d) => mapD(g, d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, a, b) => `${+a * 0.95 + 10},${+b * 0.95 + 1}`))
  let s = fillD(T('M-32,6C-35,-12 -24,-26 -6,-25C-2,-27 2,-27 6,-25C24,-26 35,-12 32,6C29,20 17,27 6,23C2,26 -2,26 -6,23C-17,27 -29,20 -32,6Z'), BRAIN.base, BRAIN.outline, w)
  // cortex: a band inside the outline, then the midline and the ventricles
  s += strokeD(T('M-26,4C-28,-9 -20,-19 -7,-19M7,-19C20,-19 28,-9 26,4C24,14 16,19 8,17M-8,17C-16,19 -24,14 -26,4'), BRAIN.small, Math.max(2, w * 0.7))
  s += strokeD(T('M0,-25L0,-12M0,14L0,23'), BRAIN.outline, Math.max(2, w * 0.8))
  s += fillD(T('M-14,-5C-11,-11 -4,-11 -2,-4C-5,1 -11,1 -14,-5ZM2,-4C4,-11 11,-11 14,-5C11,1 5,1 2,-4Z'), BRAIN.light, BRAIN.outline, Math.max(1.5, w * 0.6))
  return join({ defs: S.defs, body, parts: S.parts.filter(([n]) => n !== 'tissue') }, own('coronal-section', s, [['section', BRAIN]]))
})

// Proteomic ageing clock: proteins measured in the blood feed a clock that reads a biological age (the filled share of
// its face). The proteins are the set's amber shaded proteins; the share of the face rose (SiliCoDraw's #c8618a).
const AGE = soft(hueOf('#c8618a'))
icon('Proteomic ageing clock', [4.813, -0.37, 1.79], (g) => {
  const cx = 16, cy = 2, R = 31, defs = [], w = objW(2 * R * g.k)
  const prots = [[-36, -30, 21, 3], [-39, 3, 19, 5], [-35, 34, 20, 8]].map(([x, y, s, seed], i) => shadedProtein(g, { x, y, size: s, seed, id: `protein${i + 1}` }))
  const arrows = [[[-26, -21], [-15, -12]], [[-27, 3], [-16, 3]], [[-25, 26], [-15, 18]]].map((pts, i) => arrow(g, { points: pts, corners: true, colour: INK, w: 5.5, id: `into-clock${i + 1}` }))
  let s = g.circle(cx, cy, R, objFill(g, 'clock-gradient', [cx - R, cy - R, cx + R, cy + R], PAPER, defs), PAPER.outline, w)
  // the share of the face for the age: a wedge from twelve o'clock round to 62 %
  const q1 = -Math.PI / 2, q2 = q1 + 2 * Math.PI * 0.62, rA = R - 7
  const [ax, ay] = g.P([cx + rA * Math.cos(q1), cy + rA * Math.sin(q1)]), [bx, by] = g.P([cx + rA * Math.cos(q2), cy + rA * Math.sin(q2)])
  s += `<g id="age">${fillD(`M${P2(g.P([cx, cy]))} L${f(ax)},${f(ay)} A${f(rA * g.k)},${f(rA * g.k)} 0 1 1 ${f(bx)},${f(by)} Z`, AGE.base, AGE.outline, w * 0.5)}</g>`
  const ticks = Array.from({ length: 12 }, (_, i) => { const q = (i * Math.PI) / 6, r1 = i % 3 ? R - 6 : R - 8.5, r2 = R - 3.5; return polyline(g, [[cx + r1 * Math.cos(q), cy + r1 * Math.sin(q)], [cx + r2 * Math.cos(q), cy + r2 * Math.sin(q)]]) }).join(' ')
  s += strokeD(ticks, INK, Math.max(2, w * 0.55))
  s += strokeD(polyline(g, [[cx, cy], [cx, cy - 18]]), INK, w * 1.1) + strokeD(polyline(g, [[cx, cy], [cx + rA * 0.95 * Math.cos(q2), cy + rA * 0.95 * Math.sin(q2)]]), AGE.outline, w * 0.95)
  s += g.circle(cx, cy, 2.8, INK)
  return join(...prots, ...arrows, own('clock', s, [['clock', PAPER], ['age', AGE]], defs.join('')))
})

// Faecal microbiota transplant: a syringe of donor stool suspension (brown, a lab liquid in another colour) delivers
// bacteria into the colon (an upside-down U from the caecum round to the rectum, rose as SiliCoDraw draws it), where
// they settle (the set's green bacteria). The colon is the vessel part, a tube with a lumen, in the colon's rose.
const COLON = soft(hueOf('#f6d0dc')), STOOL = { ...deep(60), small: toHex({ l: 0.55, c: 0.07, h: 60 }), outline: toHex({ l: 0.4, c: 0.06, h: 60 }) }
icon('Faecal microbiota transplant', [4.791, 0.1, 6.08], (g) => {
  const colon = vessel(g, { size: 100, thick: 0.27, points: [[-33, 34], [-33, 0], [-33, -22], [-25, -33], [0, -33], [25, -33], [33, -22], [33, 0], [33, 22], [22, 34], [9, 38], [8, 46]], pal: COLON, id: 'colon' })
  const bugs = [[-33, -8, 90], [-33, 12, 80], [-12, -33, 5], [12, -33, -10], [33, -4, 95], [33, 16, 75]].map(([x, y, t], i) => bacterium(g, { x, y, size: 11, turn: t, id: `bacterium${i + 1}` }))
  const syr = syringe(g, { x: -1, y: -3, size: 52, turn: -22, needle: 'none', liquid: STOOL, level: 0.62, id: 'syringe' })
  return join(colon, ...bugs, syr)
})

// Diastolic dysfunction (E/A reversal): a Doppler echocardiogram of the flow through the mitral valve: in each beat the
// early wave (E) is smaller than the late wave of the atrium (A), the reversal of the healthy pattern; an ECG runs under
// it. The waves are amber (SiliCoDraw's #e3955a), the ECG the green of a lab screen's trace.
const WAVE = rich(hueOf('#e3955a'))
icon('Diastolic dysfunction', [4.85, 0.0, 1.62], (g) => {
  const scr = screen(g, { x: 0, y: -4, size: 94, aspect: 0.74, show: 'blank', id: 'echo' })
  const w = objW(30 * g.k) * 0.6, base = 6
  const peak = (x0, xp, x1, top) => `M${x0},${base}C${x0 + 2},${base} ${xp - 2},${top} ${xp},${top}C${xp + 2},${top} ${x1 - 3},${base} ${x1},${base}Z`
  const waves = own('mitral-inflow', fillD(mapD(g, peak(-38, -31, -19, -6) + peak(-17, -11, -3, -26) + peak(3, 10, 22, -6) + peak(23, 29, 37, -26)), WAVE.small, WAVE.outline, w), [['waves', WAVE]])
  const baseline = own('baseline', strokeD(polyline(g, [[-40, base], [40, base]]), DARK.light, Math.max(1.5, w * 0.8), 'butt', dashed(Math.max(1.5, w * 0.8))))
  const ecg = own('ECG', strokeD(mapD(g, 'M-40,20L-24,20L-22,19L-20,20L-18,20L-16.5,22L-14.5,11L-12.5,23L-11,20L2,20L4,19L6,20L8,20L9.5,22L11.5,11L13.5,23L15,20L40,20'), GLOW.base, Math.max(2, w * 0.9)), [['ECG', GLOW]])
  const ink = PAPER.light, h = 7.5
  const letters = own('E-and-A', lettering(g, { x: -29.5, y: -13.5, h, text: 'E', colour: ink, id: 'E' }).body + lettering(g, { x: -11, y: -32, h, text: 'A', colour: ink, id: 'A' }).body)
  const stand = own('stand', fillD(rrect(g, -6, 31, 6, 38, 1), METAL.shadow, METAL.outline, objW(20 * g.k) * 0.8) + fillD(rrect(g, -18, 37, 18, 42, 2), METAL.base, METAL.outline, objW(40 * g.k) * 0.8), [['stand', METAL]])
  return join(stand, scr, baseline, waves, ecg, letters)
})

check()
console.log('written')
