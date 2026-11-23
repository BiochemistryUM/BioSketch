// Eight icons of SiliCoDraw's "Lab & equipment" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared lab parts in
// ../parts/lab.mjs and their conventions of objects (glass, plastic and metal are greys; caps, handles and instrument
// bands in the one accent blue): a cell culture hood, a liquid handling robot, a sample barcode, a freezer box, a pH
// meter, a serological pipette, an inoculation loop and a syringe filter. Their compositions are read by hand from the
// source in a 100 × 100 box centred on 0,0 and scaled onto a 512 page (`page` of ../cellkit.mjs).
// Parts used: instrument, glassware (bottle, beaker), wellPlate (plate, box), tube, tip, screen, pipette, syringe
// (lab.mjs); arrow (tissue.mjs). Drawn here because no part draws them: the hood's sash, work opening and stand; the
// robot's gantry, pipetting head and deck; the barcode label; the pH electrode and its cable; the inoculation loop.
// Lettered (strokes): "7.40" on the pH meter's display (by the screen part).
// Usage: node lb08.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page } from '../cellkit.mjs'
import { toLch } from '../colour.mjs'
import { f } from '../shapes.mjs'
import { ACCENT, COLONY, DARK, GLASS, GLOW, INK, METAL, PAPER, glassware, instrument, objW, pipette, screen, syringe, tip, tube, wellPlate } from '../parts/lab.mjs'
import { arrow } from '../parts/tissue.mjs'

const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012: the materials) are left out of the hue check, as the conventions of lab.mjs say.
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p]) => toLch(p.base).c >= 0.012), defs, body)
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts) })
// The same palette used by several parts (the accent on a band and a cap) is one colour, listed once.
const icon = (name, { defs, body, parts }) => cellType(name, parts.filter(([, p], i) => parts.findIndex(([, q]) => q.base === p.base) === i), defs, body)
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })

/** A rounded rectangle given in g's units, as a path on the page. */
const rrect = (g, x0, y0, x1, y1, r) => {
  const [a, b] = g.P([x0, y0]), W = (x1 - x0) * g.k, H = (y1 - y0) * g.k, R = Math.min(r * g.k, W / 2, H / 2)
  return `M${f(a + R)},${f(b)} H${f(a + W - R)} A${f(R)},${f(R)} 0 0 1 ${f(a + W)},${f(b + R)} V${f(b + H - R)} A${f(R)},${f(R)} 0 0 1 ${f(a + W - R)},${f(b + H)} H${f(a + R)} A${f(R)},${f(R)} 0 0 1 ${f(a)},${f(b + H - R)} V${f(b + R)} A${f(R)},${f(R)} 0 0 1 ${f(a + R)},${f(b)} Z`
}

// ---------------------------------------------------------------------------------------------------------------------
// Cell culture hood: a cabinet on a stand with its filter band at the top and a green lamp, a glass sash over the work
// opening, filtered air flowing straight down, and a bottle of culture medium on the work surface.
// (SiliCoDraw draws dashed lines with small triangles for the downflow; here they are arrows. The bottle of medium is
// added so that the hood reads as one for cell culture, beside the plain biosafety cabinet of lb04.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.9, [0, 2.6]), w = objW(92 * g.k), cw = Math.max(2, w * 0.75), fine = Math.max(1.5, w * 0.45)
  const yc = -10, H = 0.66 * 92, y0 = yc - H / 2, y1 = yc + H / 2
  const legs = [-38, 38].map((x) => g.path(rrect(g, x - 3, y1 - 2, x + 3, 43, 1.5), METAL.shadow, METAL.outline, cw) + g.path(rrect(g, x - 6, 42, x + 6, 46, 1.5), METAL.small, METAL.outline, cw)).join('') +
    g.path(rrect(g, -36, 33, 36, 37, 1.5), METAL.shadow, METAL.outline, cw)
  const body = instrument(g, { x: 0, y: yc, size: 92, aspect: 0.66, screen: false, buttons: 0, lamp: false, id: 'hood' })
  const bandH = H * 0.14
  const sx0 = -38, sx1 = 38, sTop = y0 + bandH + 5, sBot = y1 - 9
  let front = g.path(rrect(g, sx0, sTop, sx1, sBot, 2), METAL.small, METAL.outline, cw) // the work opening
  front += g.path(rrect(g, sx0 - 2, sBot - 2, sx1 + 2, sBot + 2.5, 1.5), METAL.base, METAL.outline, cw) // the work surface's front edge
  const sashBot = sTop + (sBot - sTop) * 0.5
  const sash = `<g id="sash">${g.path(rrect(g, sx0, sTop, sx1, sashBot, 2), GLASS.small, METAL.outline, w)}` +
    g.line([[sx0 + 4, sTop + 8], [sx0 + 10, sTop + 2.5]], GLASS.light, cw * 1.2) + g.line([[sx0 + 4, sTop + 15], [sx0 + 16, sTop + 3]], GLASS.light, cw * 1.2) +
    g.path(rrect(g, -10, sashBot - 1.5, 10, sashBot + 2, 1.5), ACCENT.small, ACCENT.outline, fine) + '</g>'
  const bottle = glassware(g, { x: 18, y: sBot - 2 - 11, size: 22, kind: 'bottle', liquid: 'medium', level: 0.7, id: 'bottle' })
  const flow = [-22, -4].map((x, i) => arrow(g, { points: [[x, sTop + 3], [x, sBot - 5]], colour: ACCENT.outline, w: Math.max(3.5, w * 0.6), id: `airflow${i}` }).body).join('') +
    arrow(g, { points: [[22, sTop + 3], [22, sashBot - 1]], colour: ACCENT.outline, w: Math.max(3.5, w * 0.6), id: 'airflow2' }).body
  const lampOn = `<g id="lamp">${g.circle(-36, y0 + bandH / 2, 2.6, GLOW.base, DARK.outline, fine)}</g>`
  icon('Cell culture hood', join(own('stand', legs), body, own('front', front), bottle, own('front-glass', sash), own('airflow', flow), { defs: '', body: lampOn, parts: [['lamp', GLOW]] }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Liquid handling robot: a gantry (a beam on two posts) carrying a pipetting head with five tips, over a deck that holds
// a well plate and three microtubes.
// (The head is in the accent, as SiliCoDraw's channels; the tips are the tip part, the plate and tubes their parts.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.9, [0, -1.4]), w = objW(92 * g.k), cw = Math.max(2, w * 0.75)
  let frame = [-40, 40].map((x) => g.path(rrect(g, x - 3, -36, x + 3, 32, 1.5), METAL.shadow, METAL.outline, cw)).join('')
  frame += g.path(rrect(g, -46, -45, 46, -34, 3), 'url(#gantry-gradient)', METAL.outline, w)
  const deck = g.path(rrect(g, -46, 30, 46, 42, 3), METAL.shadow, METAL.outline, w)
  const tips = [-14, -7, 0, 7, 14].map((x, i) => tip(g, { x, y: -10, size: 16, id: `tip${i}` }))
  const head = g.path(rrect(g, -20, -36, 20, -19, 3.5), 'url(#head-gradient)', ACCENT.outline, w) + g.path(rrect(g, -6, -40, 6, -35, 1.5), ACCENT.shadow, ACCENT.outline, cw)
  const plate = wellPlate(g, { x: -14, y: 22, size: 46, view: 'angled', liquid: 'reagent', id: 'plate' })
  const tubes = [19, 29, 39].map((x, i) => tube(g, { x, y: 18, size: 22, kind: 'micro', level: 0.35, liquid: 'reagent', id: `tube${i}` }))
  icon('Liquid handling robot', join(
    own('gantry', frame, [], g.grad('gantry-gradient', [-46, -45, 46, -34], METAL)),
    own('deck', deck),
    ...tips,
    own('head', head, [['head', ACCENT]], g.grad('head-gradient', [-20, -36, 20, -19], ACCENT)),
    plate, ...tubes))
}

// ---------------------------------------------------------------------------------------------------------------------
// Sample barcode: a paper label with the bars of a barcode and a line of small print under them.
// (SiliCoDraw writes a sample number, "S-0427", under the bars; here it is a row of short strokes, since an invented
// number is not an abbreviation. The bars are fewer and bolder so that they still read as a barcode at 40 px.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(5.3, [0, 0]), w = objW(88 * g.k)
  const card = g.path(rrect(g, -44, -28, 44, 28, 5), 'url(#label-gradient)', PAPER.outline, w)
  const widths = [3.4, 1.6, 1.6, 3.4, 1.6, 3.4, 1.6, 1.6, 3.4, 1.6, 3.4, 1.6, 1.6, 3.4]
  let x = -33, bars = ''
  const gap = (66 - widths.reduce((a, b) => a + b, 0)) / (widths.length - 1)
  for (const bw of widths) { bars += g.path(rrect(g, x, -19, x + bw, 9, 0.4), INK); x += bw + gap }
  const print = [-22, -11, 0, 11, 22].map((cx) => g.line([[cx - 3.5, 18], [cx + 3.5, 18]], PAPER.small, Math.max(3, w * 0.7))).join('')
  icon('Sample barcode', join(own('label', card, [], g.grad('label-gradient', [-44, -28, 44, 28], PAPER)), own('bars', bars + print)))
}

// ---------------------------------------------------------------------------------------------------------------------
// Freezer box: a cryobox seen from above, a grid of 5 × 7 places with some cryovials in it.
// (The freezer box of the wellPlate part, box in the accent as SiliCoDraw's band, vial caps in its default yellow.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.98, [0, 0])
  icon('Freezer box', wellPlate(g, { x: 0, y: 0, size: 92, kind: 'box', rows: 5, cols: 7, id: 'freezer-box' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// pH meter: a bench meter with its display reading 7.40 and two buttons, and a cable to a glass electrode standing in a
// beaker of buffer.
// (The meter is the instrument part, the display its screen with the number; the electrode and cable are drawn here.
// The buffer is water-blue; SiliCoDraw tints it with the accent.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.6, [-4, 3.4]), w = objW(60 * g.k), cw = Math.max(2, w * 0.75)
  const meter = instrument(g, { x: -22, y: -4, size: 62, aspect: 1, screen: false, buttons: 0, lamp: false, id: 'meter' })
  const disp = screen(g, { x: -22, y: -6, size: 42, aspect: 0.55, show: 'number', text: '7.40', id: 'display' })
  const buttons = [-32, -12].map((x, i) => `<g id="button${i}">${g.circle(x, 15, 3.6, ACCENT.small, ACCENT.outline, Math.max(1.5, w * 0.45))}</g>`).join('')
  const beaker = glassware(g, { x: 30, y: 27, size: 42, kind: 'beaker', liquid: 'water', level: 0.6, id: 'beaker' })
  const ex = 30
  const cable = `<path d="M${g.P([-4, -35]).map(f).join(',')} C${g.P([10, -46]).map(f).join(',')} ${g.P([ex, -40]).map(f).join(',')} ${g.P([ex, -22]).map(f).join(',')}" fill="none" stroke="${DARK.base}" stroke-width="${f(Math.max(3, w * 0.7))}" stroke-linecap="round"/>`
  const electrode = g.path(rrect(g, ex - 4, -10, ex + 4, 34, 4), GLASS.base, GLASS.outline, cw) + g.circle(ex, 36, 5, GLASS.small, GLASS.outline, cw) +
    g.path(rrect(g, ex - 5, -24, ex + 5, -8, 2.5), 'url(#electrode-cap-gradient)', ACCENT.outline, cw)
  icon('pH meter', join(
    own('cable', cable),
    meter, disp, own('buttons', buttons), beaker,
    own('electrode', electrode, [['electrode', ACCENT]], g.grad('electrode-cap-gradient', [ex - 5, -24, ex + 5, -8], ACCENT))))
}

// ---------------------------------------------------------------------------------------------------------------------
// Serological pipette: a graduated pipette of culture medium in a pipette controller, tilted as SiliCoDraw has it.
// (The serological kind of the pipette part.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(5.0, [6.8, -2.4])
  icon('Serological pipette', pipette(g, { x: 0, y: 0, size: 98, turn: 30, kind: 'serological', liquid: 'medium', level: 0.4, id: 'serological-pipette' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Inoculation loop: a handle in the accent and a metal wire ending in a loop that holds a film of a bacterial colony.
// (The film is the colony colour of the agar plates, where SiliCoDraw has a pale green; the wire is a steel grey.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(5.2, [-7.9, 8.6]), w = objW(90 * g.k)
  const lc = [21, -20], R = 7.5
  const wireW = Math.max(4, w * 0.9), cx = lc[0] - R * Math.SQRT1_2, cy = lc[1] + R * Math.SQRT1_2
  const wireD = `M${g.P([-24, 24]).map(f).join(',')} L${g.P([cx, cy]).map(f).join(',')}`
  const ring = (stroke, sw) => `<circle cx="${f(g.X(lc[0]))}" cy="${f(g.Y(lc[1]))}" r="${f(R * g.k)}" fill="none" stroke="${stroke}" stroke-width="${f(sw)}"/>`
  const wire = `<path d="${wireD}" fill="none" stroke="${METAL.outline}" stroke-width="${f(wireW + 2 * w * 0.6)}" stroke-linecap="round"/>` + ring(METAL.outline, wireW + 2 * w * 0.6) +
    `<path d="${wireD}" fill="none" stroke="${METAL.shadow}" stroke-width="${f(wireW)}" stroke-linecap="round"/>` + ring(METAL.shadow, wireW)
  const film = g.circle(lc[0], lc[1], R - 1.2, COLONY.base) + g.hl(lc[0] - 4, lc[1] - 4, f(R * g.k * 0.32), f(R * g.k * 0.14), -45, COLONY.light)
  // the handle: a rounded bar along the same line
  const a = (45 * Math.PI) / 180, hx = -34, hy = 34, L = 17, Wd = 6.5
  const corners = [[-L, -Wd], [L, -Wd], [L, Wd], [-L, Wd]].map(([u, v]) => [hx + u * Math.cos(-a) - v * Math.sin(-a), hy + u * Math.sin(-a) + v * Math.cos(-a)])
  const P = (p) => g.P(p).map(f).join(',')
  const handleD = `M${P(corners[0])} L${P(corners[1])} L${P(corners[2])} L${P(corners[3])} Z`
  const handle = `<path d="${handleD}" fill="url(#handle-gradient)" stroke="${ACCENT.outline}" stroke-width="${f(w)}" stroke-linejoin="round"/>` +
    g.line([[hx - 9, hy - 3.5], [hx + 1, hy - 13.5]], ACCENT.light, Math.max(2.5, w * 0.6))
  icon('Inoculation loop', join(
    own('film', film, [['film', COLONY]]),
    own('wire', wire),
    own('handle', handle, [['handle', ACCENT]], g.grad('handle-gradient', [hx - 14, hy - 14, hx + 14, hy + 14], ACCENT))))
}

// ---------------------------------------------------------------------------------------------------------------------
// Syringe filter: a syringe of culture medium with a filter disc on its end, tilted as SiliCoDraw has it.
// (The filter kind of the syringe part; the disc in the accent, the medium phenol red by the conventions.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(5.0, [-3.2, -2.6])
  icon('Syringe filter', syringe(g, { x: 0, y: 0, size: 98, turn: -30, needle: 'filter', liquid: 'medium', level: 0.7, id: 'syringe-filter' }))
}

check()
console.log('written to', OUT)
