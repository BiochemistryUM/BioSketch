// Eight icons of SiliCoDraw's "Lab & equipment" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared lab parts in
// ../parts/lab.mjs and their conventions of objects (glass, plastic and metal are greys; caps, handles and instrument
// bands in the one accent blue): a spin column, a microvolume spectrophotometer, a gel tank, a graduated cylinder, a
// funnel, a wash bottle, a mouse cage and oral gavage. Their compositions are read by hand from the source in a
// 100 × 100 box centred on 0,0 and scaled onto a 512 page (`page` of ../cellkit.mjs).
// Parts used: instrument, screen (inside it), glassware (cylinder, bottle), syringe (gavage), labMouse (lab.mjs).
// Drawn here because no part draws them: the spin column with its membrane, a drop of liquid, the pedestal arm of the
// microvolume spectrophotometer, the gel tank (tank, buffer, gel, wells, bands, electrodes), the funnel with its filter
// paper, the wash bottle's nozzle and dip tube, the mouse cage (box, bedding, wire lid, sipper).
// Lettered (strokes): "A260" on the spectrophotometer's display (by the screen part), "−" and "+" at the electrodes of
// the gel tank, "H₂O" on the wash bottle's label.
// Usage: node lb09.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page } from '../cellkit.mjs'
import { deep, rich, toLch } from '../colour.mjs'
import { f } from '../shapes.mjs'
import { ACCENT, DARK, GLASS, INK, LIQUIDS, METAL, PAPER, PLASTIC, glassware, instrument, labMouse, objW, syringe } from '../parts/lab.mjs'
import { lettering } from '../parts/letters.mjs'

const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012: the materials) are left out of the hue check, as the conventions of lab.mjs say.
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p]) => toLch(p.base).c >= 0.012), defs, body)
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts) })
// The same palette used by several parts (the accent on a band and a cap) is one colour, listed once.
const icon = (name, { defs, body, parts }) => cellType(name, parts.filter(([, p], i) => parts.findIndex(([, q]) => q.base === p.base) === i), defs, body)
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })
const WATER = LIQUIDS.water
const LEAD_RED = deep(25) // the red lead and its plus sign (the red lamp of lab.mjs)
const BEDDING = rich(75) // wood shavings

/** A closed polygon in g's units with rounded corners ([[x, y, r], …]), as a page path. */
const roundD = (g, corners) => {
  const n = corners.length, out = []
  for (let i = 0; i < n; i++) {
    const [x, y, r] = corners[i], a = corners[(i - 1 + n) % n], b = corners[(i + 1) % n]
    if (!r) { out.push([x, y]); continue }
    const la = Math.hypot(a[0] - x, a[1] - y), lb = Math.hypot(b[0] - x, b[1] - y), ta = Math.min(r / la, 0.5), tb = Math.min(r / lb, 0.5)
    const p0 = [x + (a[0] - x) * ta, y + (a[1] - y) * ta], p2 = [x + (b[0] - x) * tb, y + (b[1] - y) * tb]
    for (let j = 0; j <= 6; j++) { const t = j / 6; out.push([(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * x + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * y + t * t * p2[1]]) }
  }
  return 'M' + out.map((p) => g.P(p).map(f).join(',')).join(' L') + 'Z'
}
const rrect = (g, x0, y0, x1, y1, r) => roundD(g, [[x0, y0, r], [x1, y0, r], [x1, y1, r], [x0, y1, r]])
const P2 = (g, p) => g.P(p).map(f).join(',')

/** A drop of liquid, point up, `size` its height (as in lb01): a gradient from 80 px on, one highlight. */
function drop(g, { x, y, size, id = 'drop', pal = WATER }) {
  const u = size / 100, px = size * g.k, w = objW(px)
  const d = `M${P2(g, [x, y - 50 * u])} C${P2(g, [x + 8 * u, y - 30 * u])} ${P2(g, [x + 30 * u, y - 10 * u])} ${P2(g, [x + 30 * u, y + 18 * u])} A${f(31 * u * g.k)},${f(31 * u * g.k)} 0 0 1 ${P2(g, [x - 30 * u, y + 18 * u])} C${P2(g, [x - 30 * u, y - 10 * u])} ${P2(g, [x - 8 * u, y - 30 * u])} ${P2(g, [x, y - 50 * u])}Z`
  const big = px >= 80
  const defs = big ? g.grad(`${id}-gradient`, [x - 30 * u, y - 50 * u, x + 30 * u, y + 50 * u], pal) : ''
  const body = g.path(d, big ? `url(#${id}-gradient)` : pal.small, pal.outline, w) + (big ? g.hl(x - 14 * u, y + 10 * u, f(5 * u * g.k), f(11 * u * g.k), 20, pal.light) : '')
  return own(id, body, [['drop', pal]], defs)
}

// ---------------------------------------------------------------------------------------------------------------------
// Spin column: a plastic column with a collar in the accent, the sample (water-blue) standing on the silica membrane, and
// a drop of the flow-through falling from its spout.
// (SiliCoDraw draws an arrow under the spout; here it is the drop that goes through. The membrane is in the accent, as
// SiliCoDraw has it.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(5.0, [0, 0.5]), w = objW(92 * g.k), cw = Math.max(2, w * 0.75)
  const body = [[-17, -38, 0], [17, -38, 0], [17, 12, 4], [6, 24, 3], [6, 33, 1.5], [-6, 33, 1.5], [-6, 24, 3], [-17, 12, 4]]
  const bd = roundD(g, body)
  let s = g.path(bd, 'url(#column-gradient)')
  const ys = -22, ym = 2
  s += g.path(rrect(g, -17, ys, 17, ym, 0), WATER.small)
  s += `<path d="M${P2(g, [-17, ys])} Q${P2(g, [0, ys + 4])} ${P2(g, [17, ys])}" fill="none" stroke="${WATER.outline}" stroke-width="${f(w * 0.5)}"/>`
  const membrane = g.path(rrect(g, -17, ym, 17, ym + 7, 0), ACCENT.small) + g.line([[-17, ym], [17, ym]], ACCENT.outline, f(w * 0.5)) + g.line([[-17, ym + 7], [17, ym + 7]], ACCENT.outline, f(w * 0.5))
  const hl = g.path(rrect(g, -13, -33, -10, -26, 1.5), PLASTIC.light) + g.path(rrect(g, -13, 11, -10, 15, 1.5), PLASTIC.light)
  const outline = g.path(bd, 'none', PLASTIC.outline, w)
  const collar = g.path(roundD(g, [[-22, -46, 3], [22, -46, 3], [20, -36, 2], [-20, -36, 2]]), 'url(#collar-gradient)', ACCENT.outline, cw)
  icon('Spin column', join(
    own('column', s, [['column', PLASTIC]], g.grad('column-gradient', [-17, -38, 17, 33], PLASTIC)),
    own('sample', '', [['sample', WATER]]),
    own('membrane', membrane, [['membrane', ACCENT]]),
    own('column-front', hl + outline),
    own('collar', collar, [], g.grad('collar-gradient', [-22, -46, 22, -36], ACCENT)),
    drop(g, { x: 0, y: 41, size: 12, id: 'flow-through' })))
}

// ---------------------------------------------------------------------------------------------------------------------
// Microvolume spectrophotometer: a bench unit with its display (A260) and a button, and on top the lower pedestal, a
// drop of sample held as a column of liquid, and the hinged arm with the upper pedestal brought down on it.
// (SiliCoDraw writes "A260" and "54 ng/µl" on the display; only "A260" is lettered. The drop is water-blue, where
// SiliCoDraw tints it with the accent.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(5.2, [0, -5]), w = objW(88 * g.k), cw = Math.max(2, w * 0.75)
  const unit = instrument(g, { x: 0, y: 14, size: 88, aspect: 0.5, screen: 'number', text: 'A260', buttons: 1, lamp: false, id: 'unit' })
  const top = 14 - 22
  // the arm, raised: a bar from the hinge at the back right up to the upper pedestal at its free end
  const p0 = [33, top - 7], p1 = [15, top - 33], L0 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1])
  const d = [(p1[0] - p0[0]) / L0, (p1[1] - p0[1]) / L0], n = [-d[1], d[0]], at = (p, a, b) => [p[0] + d[0] * a + n[0] * b, p[1] + d[1] * a + n[1] * b]
  const bar = roundD(g, [[...at(p0, -4, -5), 4], [...at(p1, 4, -5), 4], [...at(p1, 4, 5), 4], [...at(p0, -4, 5), 4]])
  const pad = roundD(g, [[...at(p1, -3, 3), 1], [...at(p1, 3, 3), 1], [...at(p1, 3, 8), 1], [...at(p1, -3, 8), 1]])
  let arm = g.path(pad, METAL.small, METAL.outline, cw) + g.path(bar, 'url(#arm-gradient)', METAL.outline, w)
  arm += g.path(rrect(g, 28, top - 12, 38, top + 1, 2), METAL.shadow, METAL.outline, cw) + g.circle(33, top - 7, 2, METAL.outline)
  const lower = g.path(rrect(g, 11, top - 4, 23, top + 1, 1), METAL.small, METAL.outline, cw)
  const yb = top - 4
  const dome = `M${P2(g, [11.5, yb])} C${P2(g, [11.5, yb - 7.5])} ${P2(g, [22.5, yb - 7.5])} ${P2(g, [22.5, yb])}Z`
  const sample = g.path(dome, WATER.small, WATER.outline, cw) + g.hl(14.8, yb - 3.2, f(1.1 * g.k), f(0.8 * g.k), -30, WATER.light)
icon('Microvolume spectrophotometer', join(unit,
    own('pedestal', lower),
    own('sample', sample, [['sample', WATER]]),
    own('arm', arm, [], g.grad('arm-gradient', [p1[0] - 5, p1[1] - 5, p0[0] + 5, p0[1] + 5], METAL))))
}

// ---------------------------------------------------------------------------------------------------------------------
// Gel tank: a horizontal electrophoresis tank seen from above, filled with buffer; an agarose gel in it with a row of
// wells at the black (−) end and bands of DNA run towards the red (+) end; a platinum wire along each end and the two
// leads.
// (SiliCoDraw runs the lanes towards the long side while its electrodes stand at the short ends; here the lanes run from
// the cathode to the anode, as DNA does. The bands are in the accent, as SiliCoDraw has them.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(5.0, [0, -4]), w = objW(92 * g.k), cw = Math.max(2, w * 0.75), fine = Math.max(1.5, w * 0.45)
  const y0 = -20, y1 = 34
  let tank = g.path(rrect(g, -46, y0, 46, y1, 6), 'url(#tank-gradient)', PLASTIC.outline, w)
  const buffer = g.path(rrect(g, -41, y0 + 5, 41, y1 - 5, 3), WATER.small, WATER.outline, fine)
  const gx0 = -27, gx1 = 29, gy0 = y0 + 9, gy1 = y1 - 9
  let gel = g.path(rrect(g, gx0, gy0, gx1, gy1, 2), GLASS.base, WATER.outline, cw)
  const lanes = [0, 1, 2, 3, 4].map((i) => gy0 + 2 + (i + 0.5) * ((gy1 - gy0 - 4) / 5))
  gel += lanes.map((ly) => g.path(rrect(g, gx0 + 3.5, ly - 2.4, gx1 - 3, ly + 2.4, 1.5), GLASS.shadow)).join('') // the track of each lane
  gel += lanes.map((ly) => g.path(rrect(g, gx0 + 3.5, ly - 2.4, gx0 + 6, ly + 2.4, 0.8), GLASS.small, PLASTIC.outline, fine)).join('')
  // distance of each band from its well along the lane; the first lane is a ladder whose steps shrink evenly (14, 10, 6)
  const runs = [[8, 22, 32, 38], [14, 34], [10, 26, 38], [20, 32], [12, 29]]
  const bands = lanes.map((ly, i) => runs[i].map((r) => g.path(rrect(g, gx0 + 4.75 + r - 1.5, ly - 2.4, gx0 + 4.75 + r + 1.5, ly + 2.4, 0.7), ACCENT.outline, ACCENT.outline, fine)).join('')).join('')
  const wires = g.line([[-36, y0 + 8], [-36, y1 - 8]], METAL.outline, cw) + g.line([[36, y0 + 8], [36, y1 - 8]], METAL.outline, cw)
  tank += g.path(rrect(g, -43, y0 + 2, -38, y0 + 4, 1), PLASTIC.light)
  const post = (x, pal) => g.path(rrect(g, x - 4, y0 - 9, x + 4, y0 + 3, 2.5), pal.shadow, pal.outline, cw) + g.circle(x, y0 - 9, 2.2, pal.base)
  const signs = lettering(g, { x: -36, y: y0 - 18, h: 8, text: '-', colour: INK, id: 'minus' }).body + lettering(g, { x: 36, y: y0 - 18, h: 8, text: '+', colour: LEAD_RED.outline, id: 'plus' }).body
  icon('Gel tank', join(
    own('tank', tank, [['tank', PLASTIC]], g.grad('tank-gradient', [-46, y0, 46, y1], PLASTIC)),
    own('buffer', buffer, [['buffer', WATER]]),
    own('gel', gel),
    own('bands', bands, [['bands', ACCENT]]),
    own('electrodes', wires),
    own('cathode', post(-36, DARK)),
    own('anode', post(36, LEAD_RED), [['anode', LEAD_RED]]),
    own('signs', signs)))
}

// ---------------------------------------------------------------------------------------------------------------------
// Graduated cylinder: the cylinder of the glassware part, half full of water-blue liquid.
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.98, [0, 0])
  icon('Graduated cylinder', glassware(g, { x: 0, y: 0, size: 92, kind: 'cylinder', liquid: 'water', level: 0.5, id: 'cylinder' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Funnel: a glass funnel with a folded filter paper in it, liquid standing in the paper, and a drop of the filtrate
// falling from the stem.
// (SiliCoDraw's liquid is tinted with the accent; here it is water-blue. The paper's fold is drawn as one line.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.7, [0, 3]), w = objW(92 * g.k), cw = Math.max(2, w * 0.75), fine = Math.max(1.5, w * 0.45)
  const funnel = roundD(g, [[-45, -40, 2], [45, -40, 2], [7, 2, 5], [7, 32, 1], [-7, 36, 1], [-7, 2, 5]])
  let glass = g.path(funnel, 'url(#funnel-gradient)')
  const paper = roundD(g, [[-36, -36, 1], [36, -36, 1], [0, 2, 3]])
  const ys = -19, hw = 36 * (2 - ys) / 38
  const liquid = roundD(g, [[-hw, ys, 0], [hw, ys, 0], [0, 2, 3]])
  let filter = g.path(paper, PAPER.base, PAPER.outline, fine) + g.path(liquid, WATER.small) +
    `<path d="M${P2(g, [-hw, ys])} Q${P2(g, [0, ys + 2.5])} ${P2(g, [hw, ys])}" fill="none" stroke="${WATER.outline}" stroke-width="${f(w * 0.5)}"/>` +
    g.line([[-9, -36], [0, 0]], PAPER.outline, fine)
  const hl = `<path d="M${P2(g, [-38, -35])} L${P2(g, [-30, -35])} L${P2(g, [-10, -14])} L${P2(g, [-13, -12])}Z" fill="${GLASS.light}"/>`
  const front = g.path(funnel, 'none', GLASS.outline, w) + g.path(rrect(g, -47, -43, 47, -38, 2), GLASS.shadow, GLASS.outline, cw)
  icon('Funnel', join(
    own('funnel', glass, [['funnel', GLASS]], g.grad('funnel-gradient', [-45, -40, 45, 36], GLASS)),
    own('filter-paper', filter, [['liquid', WATER]]),
    own('funnel-front', hl + front),
    drop(g, { x: 0, y: 44, size: 10, id: 'filtrate' })))
}

// ---------------------------------------------------------------------------------------------------------------------
// Wash bottle: a plastic squeeze bottle of water with a cap in the accent, a bent nozzle, the dip tube inside and a
// label lettered H₂O.
// (The bottle of the glassware part, in plastic, without its own label.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.9, [1, 1]), w = objW(80 * g.k), cw = Math.max(2, w * 0.75)
  const bx = -8, by = 10, S = 76, L = (p) => [bx + (p[0] * S) / 100, by + (p[1] * S) / 100]
  const bottle = glassware(g, { x: bx, y: by, size: S, kind: 'bottle', material: 'plastic', liquid: 'water', level: 0.62, label: false, id: 'bottle' })
  const capTop = L([0, -50])[1]
  const dip = g.line([L([4, -35]), L([4, 44])], PLASTIC.outline, f(Math.max(2.5, w * 0.6)))
  const [lx0, ly0] = L([-24, -6]), [lx1, ly1] = L([24, 20])
  const label = g.path(rrect(g, lx0, ly0, lx1, ly1, 2), PAPER.base, PAPER.outline, Math.max(1.5, w * 0.45)) +
    lettering(g, { x: (lx0 + lx1) / 2, y: (ly0 + ly1) / 2 + 0.8, h: 9, text: 'H_2O', colour: INK, id: 'h2o' }).body
  const noz = `M${P2(g, [bx, capTop + 1])} L${P2(g, [bx, capTop - 6])} C${P2(g, [bx, capTop - 15])} ${P2(g, [bx + 12, capTop - 19])} ${P2(g, [bx + 24, capTop - 14])} L${P2(g, [bx + 40, capTop - 7])}`
  const nw = 3.4 * g.k
  const nozzle = `<path d="${noz}" fill="none" stroke="${PLASTIC.outline}" stroke-width="${f(nw + 2 * w * 0.75)}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${noz}" fill="none" stroke="${PLASTIC.shadow}" stroke-width="${f(nw)}" stroke-linecap="round" stroke-linejoin="round"/>` +
    g.path(roundD(g, [[bx - 6, capTop + 1, 1], [bx + 6, capTop + 1, 1], [bx + 3, capTop - 5, 1], [bx - 3, capTop - 5, 1]]), PLASTIC.shadow, PLASTIC.outline, cw)
  icon('Wash bottle', join(own('nozzle', nozzle), bottle, own('dip-tube', dip), own('label', label)))
}

// ---------------------------------------------------------------------------------------------------------------------
// Mouse cage: a clear plastic cage with bedding, a white lab mouse on it, the wire lid in the accent and a water bottle
// standing upside down in the lid with its sipper reaching into the cage.
// (SiliCoDraw puts a plain box on the lid; here it is the water bottle every cage has.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(5.0, [0, -2.5]), w = objW(92 * g.k), cw = Math.max(2, w * 0.75), fine = Math.max(1.5, w * 0.45)
  const cage = roundD(g, [[-44, -10, 2], [44, -10, 2], [40, 40, 4], [-40, 40, 4]])
  const xAt = (y) => 44 - (4 * (y + 10)) / 50
  let pts = [], yb = 29
  for (let i = 0; i <= 16; i++) { const x = -xAt(yb) + (2 * xAt(yb) * i) / 16; pts.push([x, yb + Math.sin(i * 1.3) * 1.4]) }
  const bedTop = pts.map((p) => P2(g, p)).join(' L')
  const bedding = `<path d="M${bedTop} L${P2(g, [40, 36])} L${P2(g, [38, 40])} L${P2(g, [-38, 40])} L${P2(g, [-40, 36])}Z" fill="${BEDDING.small}" stroke="${BEDDING.outline}" stroke-width="${f(fine)}" stroke-linejoin="round"/>` +
    [[-30, 34, 20], [-12, 36, -15], [14, 35, 25], [30, 36, -20], [-22, 38, -10], [2, 38, 15]].map(([x, y, r]) => g.ellipse(x, y, 3, 1, r, BEDDING.shadow, BEDDING.outline, Math.max(1.2, fine * 0.7))).join('')
  const mouse = labMouse(g, { x: -2, y: 17, size: 50, id: 'mouse' })
  const front = g.path(cage, 'none', PLASTIC.outline, w) + g.line([[-37, -3], [-34, 22]], PLASTIC.light, f(w * 0.9))
  let lid = g.path(rrect(g, -47, -20, 47, -8, 3), 'url(#lid-gradient)', ACCENT.outline, w)
  lid += [-32, -20, -8, 4, 36].map((x) => g.line([[x, -17], [x, -11]], ACCENT.outline, f(fine))).join('')
  const sipper = g.line([[22, -12], [22, -1]], METAL.outline, f(Math.max(3, w * 0.7))) + g.circle(22, -0.5, 1.8, METAL.base, METAL.outline, fine)
  const bottle = glassware(g, { x: 22, y: -30, size: 34, turn: 180, kind: 'bottle', material: 'plastic', liquid: 'water', level: 0, label: false, id: 'water-bottle' })
  icon('Mouse cage', join(
    own('cage', g.path(cage, 'url(#cage-gradient)'), [['cage', PLASTIC]], g.grad('cage-gradient', [-44, -10, 44, 40], PLASTIC)),
    own('bedding', bedding, [['bedding', BEDDING]]),
    mouse,
    own('sipper', sipper),
    own('cage-front', front),
    bottle,
    own('lid', lid, [['lid', ACCENT]], g.grad('lid-gradient', [-47, -20, 47, -8], ACCENT))))
}

// ---------------------------------------------------------------------------------------------------------------------
// Oral gavage: a white lab mouse and a syringe with a gavage needle whose ball tip is at the mouse's mouth.
// (SiliCoDraw's mouse faces right with the syringe above it; the part's mouse faces left, so the syringe comes from the
// upper left. The syringe is the gavage kind of the syringe part, with water-blue dosing solution.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(5.2, [12, 6.4]), S = 84, mx = 12, my = 22
  const mouse = labMouse(g, { x: mx, y: my, size: S, id: 'mouse' })
  const mouth = [mx + (-45.3 * S) / 100, my + ((9.3 - 4) * S) / 100]
  const T = 42, SS = 64, a = (T * Math.PI) / 180, bx = 2.6, byy = 46
  const off = [(bx * Math.cos(a) - byy * Math.sin(a)) * SS / 100, (bx * Math.sin(a) + byy * Math.cos(a)) * SS / 100]
  const sx = mouth[0] - off[0] + 1.5, sy = mouth[1] - off[1] - 1
  const syr = syringe(g, { x: sx, y: sy, size: SS, turn: T, needle: 'gavage', liquid: 'water', level: 0.6, id: 'gavage-syringe' })
  icon('Oral gavage', join(mouse, syr))
}

check()
console.log('written to', OUT)
