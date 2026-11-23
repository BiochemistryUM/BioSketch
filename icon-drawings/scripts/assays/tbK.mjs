// Eight icons of SiliCoDraw's "Techniques & assays" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David
// Carlsson; see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts:
// bench methods of chemistry and cell biology: titration, distillation, electrolysis, fermentation, cell counting in a
// haemocytometer, a tissue scaffold, transfection and electroporation. Compositions are read by hand from the source in a
// 100 × 100 box centred on 0,0 and scaled onto a 512 page (`page` of ../cellkit.mjs). Outlines at 60 %
// (`setStrokeScale(0.6)`); glass tubing and wires, being the drawing itself, keep their width. Objects get no gloss; the
// cells are the approved glossy Cell (`placeCellType`, with `setGloss(true)` set as the current look asks).
// Parts used: glassware (flask, round-bottom flask, beaker), instrument colours (lab.mjs); imageField (assays.mjs);
// placeCellType ('Cell'), arrow, plus, lightning (tissue.mjs); circularDna (molecules.mjs).
// Drawn here because no part draws them: the burette with its stopcock and a drop; the still head, tubing and condenser
// of the distillation and its heat; the electrodes, wire and battery sign of the electrolysis, and gas bubbles; the
// stopper and airlock of the fermentation flask; the counting grid of the haemocytometer; the porous scaffold block;
// the electrode plates and membrane pores of electroporation, and the minus mark beside tissue.mjs's plus.
// Lettered: nothing (the + and − of SiliCoDraw are tissue.mjs's plus and a bar of the same width).
// Usage: node tbK.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toLch } from '../colour.mjs'
import { f, setStrokeScale, strokeScale } from '../shapes.mjs'
import { ACCENT, DARK, GLASS, INK, LIQUIDS, METAL, PAPER, PLASTIC, glassware, objW } from '../parts/lab.mjs'
import { GRID, HEAT, imageField } from '../parts/assays.mjs'
import { arrow, lightning, placeCellType, plus } from '../parts/tissue.mjs'
import { circularDna } from '../parts/molecules.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012: the materials) are left out of the hue check, as the conventions of lab.mjs say; a palette
// used twice is one part that recolours as one, so it is listed once.
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base) === i), defs, body)
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts) })
const icon = (name, { defs, body, parts }) => cellType(name, parts, defs, body)
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })
/** A width in page pixels that `setStrokeScale` leaves as it is (for lines that are the drawing itself). */
const keep = (w) => w / strokeScale()

const P2 = (g, p) => g.P(p).map(f).join(',')
const L = (g, pts, close = false) => `M${pts.map((p) => P2(g, p)).join(' L')}${close ? 'Z' : ''}`
/** A closed polygon in g's units with rounded corners ([[x, y, r], …]), as a page path (as ../lab/lb13.mjs). */
const roundD = (g, corners) => {
  const n = corners.length, out = []
  for (let i = 0; i < n; i++) {
    const [x, y, r] = corners[i], a = corners[(i - 1 + n) % n], b = corners[(i + 1) % n]
    if (!r) { out.push([x, y]); continue }
    const la = Math.hypot(a[0] - x, a[1] - y), lb = Math.hypot(b[0] - x, b[1] - y), ta = Math.min(r / la, 0.5), tb = Math.min(r / lb, 0.5)
    const p0 = [x + (a[0] - x) * ta, y + (a[1] - y) * ta], p2 = [x + (b[0] - x) * tb, y + (b[1] - y) * tb]
    for (let j = 0; j <= 6; j++) { const t = j / 6; out.push([(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * x + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * y + t * t * p2[1]]) }
  }
  return 'M' + out.map((p) => P2(g, p)).join(' L') + 'Z'
}
const rrect = (g, x0, y0, x1, y1, r) => roundD(g, [[x0, y0, r], [x1, y0, r], [x1, y1, r], [x0, y1, r]])
/** A rod of `width` g units along the courses `ds` (page paths), outlined `w` page pixels: tubing or wire as one shape. */
const rod = (ds, width, fill, outline, w, g) => {
  const W = keep(width * g.k)
  return ds.map((d) => `<path d="${d}" fill="none" stroke="${outline}" stroke-width="${f(W + 2 * w)}" stroke-linecap="round" stroke-linejoin="round"/>`).join('') +
    ds.map((d) => `<path d="${d}" fill="none" stroke="${fill}" stroke-width="${f(W)}" stroke-linecap="round" stroke-linejoin="round"/>`).join('')
}
/** A falling drop, point up, `size` its height (g units), in a liquid's small tone. */
const drop = (g, x, y, size, pal, w) => {
  const u = size / 100
  const d = `M${P2(g, [x, y - 50 * u])} C${P2(g, [x + 8 * u, y - 30 * u])} ${P2(g, [x + 30 * u, y - 10 * u])} ${P2(g, [x + 30 * u, y + 18 * u])} A${f(31 * u * g.k)},${f(31 * u * g.k)} 0 0 1 ${P2(g, [x - 30 * u, y + 18 * u])} C${P2(g, [x - 30 * u, y - 10 * u])} ${P2(g, [x - 8 * u, y - 30 * u])} ${P2(g, [x, y - 50 * u])}Z`
  return g.path(d, pal.small, pal.outline, w)
}
/** Gas bubbles: white circles with the liquid's outline. */
const bubbles = (g, pts, pal, w) => pts.map(([x, y, r]) => g.circle(x, y, r, PAPER.light, pal.outline, w)).join('')
/** A minus as the bar of tissue.mjs's plus, `size` as plus's. */
const minus = (g, x, y, size, colour, id) => {
  const w = Math.min(22, Math.max(3.5, (size * g.k) / 4.5)), h = size / 2 - w / g.k / 2
  return `<g id="${id}">${g.line([[x - h, y], [x + h, y]], colour, f(w))}</g>`
}
const WATER = LIQUIDS.water

// ---------------------------------------------------------------------------------------------------------------------
// Titration: a burette of titrant over an Erlenmeyer flask, a drop falling from its tip; the flask's solution has just
// turned pink (phenolphthalein at the end point). The stopcock is a metal key with an accent handle.
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.6, [0, 0]), w = objW(50 * g.k), fine = Math.max(1.5, w * 0.45)
  const PINK = soft(hueOf('#c9527a'))
  const bx = 7, top = -50, bot = -12 // the burette's glass from top to the stopcock
  const glass = g.path(rrect(g, -bx, top, bx, bot, 2), 'url(#burette-gradient)')
  const titrant = g.path(L(g, [[-bx, -35], [bx, -35], [bx, bot], [-bx, bot]], true), WATER.small) + g.line([[-bx, -35], [bx, -35]], WATER.outline, f(fine))
  const marks = [-45, -40, -35, -30, -25, -20, -15].map((y, i) => g.line([[-bx, y], [-bx + (i % 2 ? 3 : 5), y]], GLASS.outline, f(fine * 0.8))).join('')
  const shine = g.path(rrect(g, bx - 4, top + 4, bx - 2, bot - 4, 1), GLASS.light)
  const outline = g.path(rrect(g, -bx, top, bx, bot, 2), 'none', GLASS.outline, w)
  const tipD = L(g, [[-3.2, bot], [3.2, bot], [1.2, 0], [-1.2, 0]], true)
  const tipS = g.path(tipD, GLASS.base, GLASS.outline, fine * 1.2)
  const valve = g.path(rrect(g, -4.5, bot - 1, 4.5, bot + 5.5, 1.5), METAL.base, METAL.outline, fine * 1.3) + g.path(rrect(g, 4, bot + 0.4, 15, bot + 4, 1.8), ACCENT.base, ACCENT.outline, fine * 1.3)
  const dr = drop(g, 0, 4.8, 5.5, WATER, fine)
  const flask = glassware(g, { x: 0, y: 29, size: 44, kind: 'flask', liquid: PINK, level: 0.42, id: 'flask' })
  icon('Titration', join(
    own('burette', glass + titrant + marks + shine + outline + tipS, [['titrant', WATER]], g.grad('burette-gradient', [-bx, top, bx, bot], GLASS)),
    own('stopcock', valve, [['stopcock', ACCENT]]),
    own('drop', dr),
    flask))
}

// ---------------------------------------------------------------------------------------------------------------------
// Distillation: a round-bottom flask of liquid over heat, its vapour rising through the still head and down a
// condenser (a water jacket round the inner tube) into a receiving flask, where the distillate collects.
// (SiliCoDraw's heat is three orange strokes; kept, in the orange of the hot spot part, as wavy heat lines.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(5.2, [1.9, 4.7]), w = objW(50 * g.k), fine = Math.max(1.5, w * 0.45)
  const flask = glassware(g, { x: -28, y: 12, size: 42, kind: 'round', liquid: WATER, level: 0.42, id: 'boiling-flask' })
  const receiver = glassware(g, { x: 33, y: 29, size: 32, kind: 'flask', liquid: WATER, level: 0.3, id: 'receiving-flask' })
  // the glass tube: up from the flask's neck, over, then down the condenser into the receiver's neck
  const course = L(g, [[-28, -9], [-28, -31], [-24, -34], [-10, -34], [27, 1], [32, 8], [33, 15]])
  const tubeIn = rod([course], 3.2, GLASS.base, GLASS.outline, fine, g)
  // the condenser: a wider jacket of cooling water along the sloping stretch, the inner tube drawn again inside it
  const a = [-4, -28.5], b = [21, -4.5], jacket = L(g, [a, b])
  const cond = rod([jacket], 11, WATER.base, GLASS.outline, w, g) + rod([jacket], 3.2, GLASS.base, WATER.outline, fine * 0.8, g)
  const ports = rod([L(g, [[-4 + 3, -28.5 - 3.4], [-4 + 7, -28.5 - 7.6]]), L(g, [[21 - 3, -4.5 + 3.4], [21 - 7, -4.5 + 7.6]])], 3, GLASS.base, GLASS.outline, fine, g)
  const heatPal = HEAT[1]
  const heat = [-38, -28, -18].map((x) => g.path(`M${P2(g, [x, 47])} C${P2(g, [x - 3, 44])} ${P2(g, [x + 3, 41])} ${P2(g, [x, 38])}`, 'none', heatPal.outline, f(keep(1.6 * g.k * 0.6)))).join('')
  icon('Distillation', join(own('tubing', ports + tubeIn), own('condenser', cond, [['cooling water', WATER]]), flask, receiver, own('heat', heat.replace(/fill="none"/g, 'fill="none" stroke-linecap="round"'), [['heat', heatPal]])))
}

// ---------------------------------------------------------------------------------------------------------------------
// Electrolysis: two electrodes in a beaker of water joined through a battery; gas rises from both, twice as much at the
// negative electrode (hydrogen) as at the positive one (oxygen).
// (SiliCoDraw's equal bubbles become two to one, as water splits; the battery sign has its long plate on the + side.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.45, [-2.6, -1.2]), w = objW(60 * g.k), fine = Math.max(1.5, w * 0.45)
  const beaker = glassware(g, { x: 0, y: 8, size: 86, kind: 'beaker', liquid: WATER, level: 0.66, id: 'beaker' })
  const ex = 15, etop = -38, ebot = 38
  const electrodes = [-ex, ex].map((x) => g.path(rrect(g, x - 3, etop, x + 3, ebot, 1.2), DARK.base, DARK.outline, fine * 1.3)).join('')
  // the wire from each electrode up and across to the battery in the middle
  const wire = rod([L(g, [[-ex, etop], [-ex, -46], [-3.2, -46]]), L(g, [[3.2, -46], [ex, -46], [ex, etop]])], 1.4, METAL.shadow, METAL.outline, fine * 0.7, g)
  const cell = g.line([[3.2, -51], [3.2, -41]], INK, f(keep(1.6 * g.k * 0.6))) + g.line([[-3.2, -48.5], [-3.2, -43.5]], INK, f(keep(2.8 * g.k * 0.6))) // − short and thick
  const H2 = [[-21, 6, 2.4], [-9.5, 12, 2.1], [-21.5, 19, 1.9], [-9, 25, 2.3], [-20.5, 31, 1.8], [-10, 0, 1.8]], O2 = [[21, 10, 2.3], [9.5, 21, 2], [20.5, 29, 1.8]]
  const gas = bubbles(g, [...H2, ...O2], WATER, fine)
  const marks = minus(g, -27, -46, 8, INK, 'minus') + plus(g, { x: 27, y: -46, size: 8, colour: INK, id: 'plus' }).body
  icon('Electrolysis', join(beaker, own('electrodes', electrodes), own('gas', gas), own('circuit', wire + cell), own('poles', marks)))
}

// ---------------------------------------------------------------------------------------------------------------------
// Fermentation: a flask of fermenting broth with rising bubbles of carbon dioxide, closed by a rubber stopper with an
// airlock that lets the gas out through a little water.
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.75, [0, -2]), w = objW(60 * g.k), fine = Math.max(1.5, w * 0.45)
  const BROTH = rich(hueOf('#e9c46a'))
  const flask = glassware(g, { x: 0, y: 11, size: 74, kind: 'flask', liquid: BROTH, level: 0.52, id: 'flask' })
  const stopper = g.path(roundD(g, [[-9.5, -33, 2], [9.5, -33, 2], [7.5, -22, 1.5], [-7.5, -22, 1.5]]), DARK.base, DARK.outline, fine * 1.3)
  const lock = rod([L(g, [[0, -33], [0, -44], [1.2, -47.5], [5.2, -48.5], [9, -46.5], [10, -43]])], 2.8, GLASS.base, GLASS.outline, fine, g)
  const bulb = g.circle(11, -38.5, 5.4, GLASS.base, GLASS.outline, fine * 1.2) + g.path(`M${P2(g, [6.4, -37])} A${f(4.8 * g.k)},${f(4.8 * g.k)} 0 0 0 ${P2(g, [15.6, -37])}Z`, WATER.small) + g.circle(10, -41.5, 1.4, PAPER.light, WATER.outline, fine * 0.7)
  const co2 = bubbles(g, [[-10, 26, 2.2], [6, 31, 2], [-2, 38, 1.8], [14, 40, 1.6], [-16, 38, 1.5], [2, 22, 1.6]], BROTH, fine)
  icon('Fermentation', join(flask, own('bubbles', co2), own('stopper', stopper), own('airlock', lock + bulb, [['airlock water', WATER]])))
}

// ---------------------------------------------------------------------------------------------------------------------
// Cell counting: the counting grid of a haemocytometer seen down the microscope, cells scattered over its squares.
// (The image field part in brightfield; the grid, which no part draws, laid under its cells.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.52, [0, 0]), w = objW(100 * g.k), fine = Math.max(1.2, w * 0.4)
  const field = imageField(g, { x: 0, y: 0, size: 100, shape: 'rect', aspect: 1, mode: 'bright', count: 10, seed: 4, id: 'haemocytometer' })
  const v = [-25, 0, 25], lines = []
  for (const t of v) for (const d of [-1.3, 1.3]) lines.push(L(g, [[t + d, -46], [t + d, 46]]), L(g, [[-46, t + d], [46, t + d]]))
  const thin = [-37.5, -12.5, 12.5, 37.5].flatMap((t) => [L(g, [[t, -46], [t, 46]]), L(g, [[-46, t], [46, t]])])
  const grid = `<g id="counting-grid"><path d="${thin.join(' ')}" fill="none" stroke="${GRID}" stroke-width="${f(fine * 0.7)}" stroke-linecap="butt"/><path d="${lines.join(' ')}" fill="none" stroke="${GRID}" stroke-width="${f(fine)}" stroke-linecap="butt"/></g>`
  const body = field.body.replace('<g id="haemocytometer-content">', `${grid}<g id="haemocytometer-content">`)
  icon('Cell counting', { ...field, body })
}

// ---------------------------------------------------------------------------------------------------------------------
// Tissue scaffold: a porous block of biomaterial seen at an angle, its pores open on every face, cells settled in some.
// (A plastic grey, as the conventions give materials; the cells are the approved Cell.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(5.55, [0, -5]), w = objW(80 * g.k), fine = Math.max(1.5, w * 0.45)
  const front = [[-40, -26], [14, -26], [14, 34], [-40, 34]], topF = [[-40, -26], [-14, -44], [40, -44], [14, -26]], side = [[14, -26], [40, -44], [40, 16], [14, 34]]
  const faces = g.path(L(g, front, true), 'url(#scaffold-gradient)', PLASTIC.outline, w) + g.path(L(g, topF, true), PLASTIC.light, PLASTIC.outline, w) + g.path(L(g, side, true), PLASTIC.shadow, PLASTIC.outline, w)
  const hole = (x, y, rx, ry, rot = 0) => g.ellipse(x, y, rx, ry, rot, PLASTIC.small, PLASTIC.outline, fine)
  const frontPores = [[-28, -14, 6.5], [-4, -15, 5.5], [-29, 13, 6], [-2, 18, 6.5], [-16, 0, 4.5], [5, 1, 3.5], [-35, 27, 3.2], [-14, 27, 3.5]]
  const pores = frontPores.map(([x, y, r]) => hole(x, y, r, r)).join('') +
    [[27, -27, 2.6, 5, 0], [28, -5, 2.8, 5.6, 0], [27, 15, 2.4, 4.6, 0], [21, -14, 1.8, 3.4, 0], [34, 4, 1.8, 3.4, 0]].map(([x, y, rx, ry]) => hole(x, y, rx, ry, -10)).join('') +
    [[-10, -35, 6, 2.6], [12, -38, 5, 2.2], [24, -33, 3.6, 1.6]].map(([x, y, rx, ry]) => hole(x, y, rx, ry)).join('')
  const cells = [[-28, -14, 11], [-2, 18, 11]].map(([x, y, s], i) => placeCellType(g, 'Cell', { x, y, size: s, id: `cell${i + 1}` }))
  icon('Tissue scaffold', join(own('scaffold', faces + pores, [], g.grad('scaffold-gradient', [-40, -26, 14, 34], PLASTIC)), ...cells))
}

// ---------------------------------------------------------------------------------------------------------------------
// Transfection: plasmids outside a cell, an arrow into it, and one plasmid already inside the cytoplasm.
// (SiliCoDraw's orange rings become the plasmid part, kept in its orange so it stands apart from the blue cell.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.75, [0.4, -2.5]), PLASMID = deep(hueOf('#e3955a'))
  const cell = placeCellType(g, 'Cell', { x: 6, y: 8, size: 76, id: 'cell' })
  const plasmids = [[-35, -29, 21, 0], [-13, -42, 17, 40], [24, -6, 14, 20]].map(([x, y, s, t], i) => circularDna(g, { x, y, size: s, turn: t, twists: 5, pal: PLASMID, id: `plasmid${i + 1}` }))
  const into = arrow(g, { points: [[-33, -14], [-19.5, -3]], colour: INK, w: 10, head: 26, id: 'entry' })
  icon('Transfection', join(cell, plasmids[2], plasmids[0], plasmids[1], into))
}

// ---------------------------------------------------------------------------------------------------------------------
// Electroporation: a cell between two electrode plates; a pulse (the bolt) opens pores in its membrane, and plasmids on
// the negative side move into it, towards the positive plate.
// (SiliCoDraw's DNA waits by the + plate; DNA is negatively charged and moves towards +, so it is drawn by the − plate
// here, entering the cell. Plasmids as in Transfection, rather than green dashes.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.74, [0, -6]), w = objW(60 * g.k), PLASMID = deep(hueOf('#e3955a'))
  const plates = [-44, 44].map((x) => g.path(rrect(g, x - 4, -30, x + 4, 36, 2), 'url(#plate-gradient)', METAL.outline, w)).join('')
  const S = 62, cx = 2, cy = 3, rx = S / 2 - 0.6, ry = rx * 0.87
  const cell = placeCellType(g, 'Cell', { x: cx, y: cy, size: S, id: 'cell' })
  // pores: gaps in the membrane at the two poles that face the plates
  const pores = [160, 180, 200, -20, 0, 20].map((a) => { const t = (a * Math.PI) / 180; return g.circle(cx + rx * Math.cos(t), cy + ry * Math.sin(t), 1.6, '#FFFFFF') }).join('')
  const plasmids = [[-33, -10, 12, 0], [-34, 14, 11, 50], [-20, 2, 11, 20]].map(([x, y, s, t], i) => circularDna(g, { x, y, size: s, turn: t, twists: 4, pal: PLASMID, id: `plasmid${i + 1}` }))
  const bolt = lightning(g, { x: 2, y: -42, size: 20, turn: 12, id: 'pulse' })
  const marks = minus(g, -44, -40, 8, INK, 'minus') + plus(g, { x: 44, y: -40, size: 8, colour: INK, id: 'plus' }).body
  icon('Electroporation', join(own('electrodes', plates, [], g.grad('plate-gradient', [-48, -30, 48, 36], METAL)), cell, own('pores', pores), plasmids[2], plasmids[0], plasmids[1], bolt, own('poles', marks)))
}

check()
console.log('written to', OUT)
