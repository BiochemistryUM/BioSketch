// Eight icons of SiliCoDraw's "Lab & equipment" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared lab parts in
// ../parts/lab.mjs and their conventions of objects (glass and metal are greys; taps, bands and buttons in the one accent
// blue): a Schlenk line, a glove box, an HPLC system, and five hazard signs drawn to the standards (GHS diamonds for
// flammable and corrosive, ISO 7010 yellow triangles for laser, low temperature and ultraviolet light). Their
// compositions are read by hand from the source in a 100 × 100 box centred on 0,0 and scaled onto a 512 page (`page` of
// ../cellkit.mjs).
// Parts used: glassware (round-bottom flask, bottles), instrument, screen, hazardSign (lab.mjs); lettering (letters.mjs).
// Drawn here because no part draws them: the Schlenk line's glass manifold with its taps, ports and cold trap in a dewar;
// the glove box's window, glove ports, gloves, antechamber and stand; the HPLC's modules, column and solvent lines.
// Lettered (strokes): "N2" (2 lowered) on the gas manifold of the Schlenk line, "Ar" on the band of the glove box.
// Usage: node lb11.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page } from '../cellkit.mjs'
import { toLch } from '../colour.mjs'
import { f } from '../shapes.mjs'
import { ACCENT, DARK, GLASS, GLOW, INK, LAMP_RED, METAL, glassware, hazardSign, instrument, objW, screen } from '../parts/lab.mjs'
import { lettering, textWidth } from '../parts/letters.mjs'

const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012: the materials) are left out of the hue check, as the conventions of lab.mjs say.
// A palette used twice (two bottles, the accent of caps and band) is one part that recolours as one, so it is listed once.
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base) === i), defs, body)
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts) })
const icon = (name, { defs, body, parts }) => cellType(name, parts, defs, body)
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })

/** A rounded rectangle given in g's units, as a path on the page. */
const rrect = (g, x0, y0, x1, y1, r) => {
  const [a, b] = g.P([x0, y0]), W = (x1 - x0) * g.k, H = (y1 - y0) * g.k, R = Math.min(r * g.k, W / 2, H / 2)
  return `M${f(a + R)},${f(b)} H${f(a + W - R)} A${f(R)},${f(R)} 0 0 1 ${f(a + W)},${f(b + R)} V${f(b + H - R)} A${f(R)},${f(R)} 0 0 1 ${f(a + W - R)},${f(b + H)} H${f(a + R)} A${f(R)},${f(R)} 0 0 1 ${f(a)},${f(b + H - R)} V${f(b + R)} A${f(R)},${f(R)} 0 0 1 ${f(a + R)},${f(b)} Z`
}
/** A polyline through points in g's units, as path data on the page. */
const L = (g, pts) => `M${pts.map((p) => g.P(p).map(f).join(',')).join(' L')}`

// ---------------------------------------------------------------------------------------------------------------------
// Schlenk line: a double glass manifold, inert gas above (lettered N2) and vacuum below, joined by four taps; a port
// under each tap, one holding a round-bottom flask of reagent; the vacuum manifold runs on into a cold trap standing in
// a dewar.
// (SiliCoDraw's manifolds are a blue and a grey bar with white bulbs and red taps; here both are glass, as they are,
// the gas one lettered "N2" ("vac" is left out), and each tap is a glass barrel turned by a key in the accent. The cold
// trap hangs from the end of the vacuum manifold, where it sits on a real line, rather than from a tap. The flask's
// liquid is the reagent green of the conventions, where SiliCoDraw's is see-through blue.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.72, [-0.4, 0]), w = objW(92 * g.k), cw = Math.max(2, w * 0.75), fine = Math.max(1.5, w * 0.45)
  const yG = -33, yV = -19, taps = [-34, -16, 2, 20], pipe = 6.4 * g.k, thin = 4 * g.k
  const items = [
    { d: L(g, [[-44, yG], [27, yG]]), width: pipe },
    { d: L(g, [[-44, yV], [37, yV], [37, 6]]), width: pipe },
    ...taps.map((x) => ({ d: L(g, [[x, yG], [x, yV]]), width: thin })),
    ...taps.map((x) => ({ d: L(g, [[x, yV], [x, x === -16 ? -8 : -10]]), width: thin })),
  ]
  const glass = g.union(items, GLASS.base, GLASS.outline, w)
  // a ground-glass joint at the end of each empty port, and the neck joint of the flask
  const joints = taps.filter((x) => x !== -16).map((x) => g.path(rrect(g, x - 3.2, -12.5, x + 3.2, -8, 1.5), GLASS.shadow, GLASS.outline, cw)).join('')
  const hl = g.line([[-40, yG - 1.4], [-30, yG - 1.4]], GLASS.light, cw * 1.1) + g.line([[-40, yV - 1.4], [-30, yV - 1.4]], GLASS.light, cw * 1.1)
  const barrels = taps.map((x) => g.circle(x, (yG + yV) / 2, 3.9, GLASS.shadow, GLASS.outline, cw)).join('')
  const keyW = 3 * g.k
  const keys = g.union(taps.map((x) => ({ d: L(g, [[x - 4.2, (yG + yV) / 2 + 4.2], [x + 4.2, (yG + yV) / 2 - 4.2]]), width: keyW })), ACCENT.base, ACCENT.outline, cw * 0.8)
  const flask = glassware(g, { x: -16, y: 12, size: 42, kind: 'round', liquid: 'reagent', level: 0.33, id: 'flask' })
  // the cold trap: a glass finger in a steel dewar
  const dewar = g.path(rrect(g, 28, 7, 46, 38, 4), 'url(#dewar-gradient)', METAL.outline, w) + g.path(rrect(g, 26.5, 4, 47.5, 9, 2), METAL.shadow, METAL.outline, cw)
  const trapTop = g.path(rrect(g, 33, 0, 41, 5, 1.5), GLASS.shadow, GLASS.outline, cw)
  const h = 3.8, n2 = lettering(g, { x: -36.5, y: yG, h, text: 'N_2', colour: INK, id: 'N2' })
  if (textWidth('N_2') * h > 12) console.log('N2 is too wide for the manifold')
  icon('Schlenk line', join(
    own('trap', dewar + trapTop, [['dewar', METAL]], g.grad('dewar-gradient', [28, 7, 46, 38], METAL)),
    own('manifold', glass + hl + joints + barrels, [['glass', GLASS]]),
    flask,
    own('taps', keys, [['taps', ACCENT]]),
    own('letters', n2.body)))
}

// ---------------------------------------------------------------------------------------------------------------------
// Glove box: a steel box on a stand with a glass window, two glove ports with the black rubber gloves hanging inside, an
// antechamber at the side with its round door, and "Ar" (the inert gas) on its band.
// (SiliCoDraw draws the box without its antechamber; the antechamber is added because it is how a glove box is told
// from a fume hood. Gloves in the dark rubber of the conventions, the window glass clear grey, the band in the accent.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.82, [1.1, 6.5]), size = 78, aspect = 0.64, bx = -7, by = -6
  const w = objW(size * g.k), cw = Math.max(2, w * 0.75), fine = Math.max(1.5, w * 0.45)
  const H = size * aspect, x0 = bx - size / 2, x1 = bx + size / 2, y0 = by - H / 2, y1 = by + H / 2, bandH = H * 0.14
  const legs = [x0 + 6, x1 - 6].map((x) => g.path(rrect(g, x - 2.6, y1 - 2, x + 2.6, 41, 1.3), METAL.shadow, METAL.outline, cw) + g.path(rrect(g, x - 5, 40, x + 5, 44, 1.5), METAL.small, METAL.outline, cw)).join('') +
    g.path(rrect(g, x0 + 6, 30, x1 - 6, 33.5, 1.5), METAL.shadow, METAL.outline, cw)
  const body = instrument(g, { x: bx, y: by, size, aspect, screen: false, buttons: 0, lamp: false, id: 'glove-box' })
  const wx0 = x0 + 6, wx1 = x1 - 6, wy0 = y0 + bandH + 4.5, wy1 = y1 - 5
  let front = g.path(rrect(g, wx0, wy0, wx1, wy1, 3), GLASS.small, METAL.outline, w)
  front += g.line([[wx0 + 3.5, wy0 + 8], [wx0 + 9, wy0 + 2.5]], GLASS.light, cw * 1.2) + g.line([[wx0 + 3.5, wy0 + 15], [wx0 + 15, wy0 + 3.5]], GLASS.light, cw * 1.2)
  const ports = [bx - 14, bx + 14], py = wy0 + 9.5, pr = 7
  // gloves hang from the ports into the box: a cuff widening to a mitten with a thumb
  const glove = (x) => g.path(g.smooth([[x - 5.2, py], [x - 6.5, py + 9], [x - 8.5, py + 13], [x - 7.5, py + 16.5], [x - 4, py + 15], [x - 4.5, py + 19], [x, py + 21.5], [x + 5.2, py + 19.5], [x + 6.2, py + 12], [x + 5.2, py]]), DARK.base, DARK.outline, cw)
  const gloves = ports.map(glove).join('')
  const rings = ports.map((x) => g.circle(x, py, pr, 'none', DARK.outline, w * 2.4) + g.circle(x, py, pr, 'none', DARK.small, w * 1.3)).join('')
  // the antechamber: a steel cylinder on the right side, seen from the front, with its round door at the end
  const ay0 = by - 7, ay1 = by + 13
  const ante = g.path(rrect(g, x1 - 2, ay0, 45, ay1, 2), 'url(#antechamber-gradient)', METAL.outline, w) +
    g.ellipse(45, (ay0 + ay1) / 2, 3.2, (ay1 - ay0) / 2 + 1.5, 0, METAL.shadow, METAL.outline, w) +
    g.path(rrect(g, 43.6, (ay0 + ay1) / 2 - 4, 47.6, (ay0 + ay1) / 2 + 4, 1.5), ACCENT.small, ACCENT.outline, fine)
  const h = 4.6, ar = lettering(g, { x: bx, y: y0 + bandH / 2, h, text: 'Ar', colour: ACCENT.outline, id: 'Ar' })
  icon('Glove box', join(
    own('stand', legs),
    own('antechamber', ante, [], g.grad('antechamber-gradient', [x1, ay0, 45, ay1], METAL)),
    body,
    own('window', front + gloves + rings, [['gloves', DARK]]),
    own('letters', ar.body)))
}

// ---------------------------------------------------------------------------------------------------------------------
// HPLC: two solvent bottles on top of a stacked system, their lines running into it; on the left the pump, the
// autosampler and the column oven with the column seen through its window, on the right the detector's screen with a
// chromatogram of peaks.
// (SiliCoDraw draws three blank modules and a white panel with a trace lettered "UV"; here the screen is the screen part
// showing peaks, "UV" is left out, and the solvent bottles and the column are added, as they are what an HPLC is known
// by. Each module has its lamp: green, and red on the pump.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(5.05, [0, -1.2]), size = 80, aspect = 0.74, by = 13
  const w = objW(size * g.k), cw = Math.max(2, w * 0.75), fine = Math.max(1.5, w * 0.45)
  const H = size * aspect, x0 = -size / 2, x1 = size / 2, y0 = by - H / 2, y1 = by + H / 2, bandH = H * 0.14
  const body = instrument(g, { x: 0, y: by, size, aspect, screen: false, buttons: 0, lamp: false, id: 'hplc' })
  const bottles = [-24, -6].map((x, i) => glassware(g, { x, y: y0 - 12.6, size: 25, kind: 'bottle', liquid: 'water', level: 0.7, label: false, id: `solvent${i}` }))
  // solvent lines: from the side of each cap one loose curve, like a hanging tube, outwards and down into the top of the
  // system (the left bottle's on its left, the right bottle's on its right), so nothing runs above the bottles.
  const lineW = Math.max(2, w * 0.45)
  const lines = [[-24, -1], [-6, 1]].map(([x, s]) => {
    const P = (dx, y) => g.P([x + s * dx, y]).map(f).join(',')
    return `<path d="M${P(3, y0 - 23.3)} C${P(10, y0 - 23.8)} ${P(14.5, y0 - 14)} ${P(13, y0 + 0.5)}" fill="none" stroke="${METAL.outline}" stroke-width="${f(lineW)}" stroke-linecap="round"/>`
  }).join('')
  const mx0 = x0 + 5, mx1 = -3, top = y0 + bandH + 4, bot = y1 - 5, gap = 2.5, mh = (bot - top - 2 * gap) / 3
  let mods = ''
  for (let i = 0; i < 3; i++) {
    const a = top + i * (mh + gap), b = a + mh
    mods += g.path(rrect(g, mx0, a, mx1, b, 2), METAL.base, METAL.outline, cw)
    if (i === 2) { // the column oven: a window with the column across it
      mods += g.path(rrect(g, mx0 + 3, a + 2.6, mx1 - 8, b - 2.6, 1.5), GLASS.small, METAL.outline, fine)
      mods += g.path(rrect(g, mx0 + 6, (a + b) / 2 - 1.6, mx1 - 11, (a + b) / 2 + 1.6, 1.4), METAL.shadow, METAL.outline, fine)
    } else if (i === 1) { // the autosampler: a row of vials behind its door
      mods += g.path(rrect(g, mx0 + 3, a + 2.6, mx1 - 8, b - 2.6, 1.5), GLASS.small, METAL.outline, fine)
      mods += [0, 1, 2, 3].map((j) => g.circle(mx0 + 7 + j * 4.6, (a + b) / 2, 1.5, METAL.shadow, METAL.outline, fine * 0.8)).join('')
    } else mods += g.circle(mx0 + 8, (a + b) / 2, 3.2, METAL.shadow, METAL.outline, cw) + g.line([[mx0 + 8, (a + b) / 2], [mx0 + 9.6, (a + b) / 2 - 2.2]], METAL.outline, fine) // the pump's dial
  }
  const lamps = [0, 1, 2].map((i) => { const c = top + i * (mh + gap) + mh / 2; return g.circle(mx1 - 4, c, 1.8, i === 0 ? LAMP_RED.small : GLOW.base, DARK.outline, fine * 0.8) }).join('')
  const fittings = [mx0 + 6, mx1 - 11].map((x, j) => { const c = top + 2 * (mh + gap) + mh / 2; return g.path(rrect(g, x - (j ? 0 : 2.5), c - 2.4, x + (j ? 2.5 : 0), c + 2.4, 1), ACCENT.base, ACCENT.outline, fine * 0.8) }).join('')
  const sx0 = 1, sx1 = x1 - 5, sy0 = top, sh = (sx1 - sx0) * 0.82
  const scr = screen(g, { x: (sx0 + sx1) / 2, y: sy0 + sh / 2, size: sx1 - sx0, aspect: 0.82, show: 'peaks', id: 'detector' })
  const buttons = [0, 1].map((j) => g.circle((sx0 + sx1) / 2 + (j ? 6 : -6), (sy0 + sh + bot) / 2, 3.1, ACCENT.small, ACCENT.outline, fine)).join('')
  icon('HPLC', join(
    own('solvent-lines', lines),
    ...bottles,
    body,
    own('modules', mods + lamps, [['lamp', LAMP_RED]]),
    own('column', fittings),
    scr,
    own('buttons', buttons)))
}

// ---------------------------------------------------------------------------------------------------------------------
// The hazard signs, each the sign of its standard as the owner approved (not SiliCoDraw's yellow diamonds):
// Flammable and Corrosive are GHS pictograms (GHS02, GHS05: a white diamond with a red border and a dark symbol);
// Laser hazard (W004), Cryogenic (W010, low temperature) and UV hazard (W027, optical radiation, lettered "UV") are
// ISO 7010 warning triangles, yellow with a dark border and symbol.
// (SiliCoDraw's flame is red and yellow, its cryogenic sign blue on pale blue and its UV symbol purple; the standards
// draw every symbol in one dark colour. The corrosive pictogram is the GHS one: two tubes pouring onto a bar and a hand.)
// ---------------------------------------------------------------------------------------------------------------------
for (const [name, symbol, id] of [['Flammable', 'flame', 'flammable'], ['Corrosive', 'corrosive', 'corrosive']]) {
  const g = page(5.1, [0, 0])
  icon(name, hazardSign(g, { x: 0, y: 0, size: 90, symbol, id }))
}
for (const [name, symbol, id] of [['Laser hazard', 'laser', 'laser'], ['Cryogenic', 'snowflake', 'cryogenic'], ['UV hazard', 'uv', 'uv']]) {
  const g = page(5.0, [0, 0.5])
  icon(name, hazardSign(g, { x: 0, y: 0, size: 94, symbol, id }))
}

check()
console.log('written to', OUT)
