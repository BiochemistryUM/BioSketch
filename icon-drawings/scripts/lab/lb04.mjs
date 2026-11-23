// Eight icons of SiliCoDraw's "Lab & equipment" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared lab parts in
// ../parts/lab.mjs and their conventions of objects (glass, plastic and metal are greys; caps and instrument bands in the
// one accent blue): an agar plate with colonies, an incubator, a bioreactor, a magnetic stirrer, an autoclave, a
// biosafety cabinet, a liquid nitrogen dewar and a −80 °C freezer. Their compositions are read by hand from the source in
// a 100 × 100 box centred on 0,0 and scaled onto a 512 page (`page` of ../cellkit.mjs).
// Parts used: petriDish, instrument, glassware (jar, beaker), hazardSign, hazardSymbol (lab.mjs); arrow (tissue.mjs);
// lettering (letters.mjs). Drawn here because no part draws them: the bioreactor's stirrer shaft, impellers, motor and
// ports; the stirrer's stir bar and two dials; the cabinet's sash, work opening and stand; the dewar; steam and vapour.
// Lettered (strokes): "37" on the incubator's display and "-80" on the freezer's (by the screen of the instrument part),
// "LN2" (2 lowered) on the dewar.
// Usage: node lb04.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page } from '../cellkit.mjs'
import { hueOf, soft, toHex, toLch } from '../colour.mjs'
import { f } from '../shapes.mjs'
import { ACCENT, DARK, GLASS, INK, METAL, glassware, hazardSign, hazardSymbol, instrument, objW, petriDish } from '../parts/lab.mjs'
import { arrow } from '../parts/tissue.mjs'
import { lettering, textWidth } from '../parts/letters.mjs'

const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012: the materials) are left out of the hue check, as the conventions of lab.mjs say.
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p]) => toLch(p.base).c >= 0.012), defs, body)
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts) })
const icon = (name, { defs, body, parts }) => cellType(name, parts, defs, body)
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })

const STEAM = toHex({ l: 0.78, c: 0.006, h: 250 }) // steam and nitrogen vapour: a pale grey
/** A rounded rectangle given in g's units, as a path on the page. */
const rrect = (g, x0, y0, x1, y1, r) => {
  const [a, b] = g.P([x0, y0]), W = (x1 - x0) * g.k, H = (y1 - y0) * g.k, R = Math.min(r * g.k, W / 2, H / 2)
  return `M${f(a + R)},${f(b)} H${f(a + W - R)} A${f(R)},${f(R)} 0 0 1 ${f(a + W)},${f(b + R)} V${f(b + H - R)} A${f(R)},${f(R)} 0 0 1 ${f(a + W - R)},${f(b + H)} H${f(a + R)} A${f(R)},${f(R)} 0 0 1 ${f(a)},${f(b + H - R)} V${f(b + R)} A${f(R)},${f(R)} 0 0 1 ${f(a + R)},${f(b)} Z`
}
/** A wisp of steam rising from x, y0 to y1 (g's units), a gentle S. */
const wisp = (g, x, y0, y1, w, sway = 3) => {
  const h = y1 - y0, P = (a, b) => g.P([a, b]).map(f).join(',')
  return `<path d="M${P(x, y0)} C${P(x - sway, y0 + h * 0.3)} ${P(x + sway, y0 + h * 0.45)} ${P(x, y0 + h * 0.62)} S${P(x - sway * 0.6, y0 + h * 0.9)} ${P(x - sway * 0.2, y1)}" fill="none" stroke="${STEAM}" stroke-width="${f(w)}" stroke-linecap="round"/>`
}

// ---------------------------------------------------------------------------------------------------------------------
// Agar plate with colonies: a petri dish of agar seen from above, with nine bacterial colonies.
// (The petri dish part as it is: agar in its amber, colonies in their orange, as SiliCoDraw's cream and yellow.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(5.12, [0, 0])
  icon('Agar plate with colonies', petriDish(g, { x: 0, y: 0, size: 90, colonies: 9, id: 'agar-plate' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Incubator: a cabinet with a glass door, two shelves, and a display reading 37 in its band.
// (SiliCoDraw writes "37 °C" on the band; here the instrument part's display shows "37", with its lamp beside it. The
// door is glass, as on a CO2 incubator's inner door.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(5.0, [0, 0])
  icon('Incubator', instrument(g, { x: 0, y: 0, size: 90, aspect: 1.21, door: 'window', shelves: 2, screen: 'number', text: '37', buttons: 0, lamp: 'on', id: 'incubator' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Bioreactor: a lidded glass vessel of culture with a stirrer shaft and two impellers, a motor on the lid, two ports and
// rising bubbles of air.
// (The vessel is the jar of glassware with its lid in the accent; the culture keeps SiliCoDraw's green. Added: a motor
// that drives the shaft, which SiliCoDraw leaves open at the lid.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(5.12, [0, 1.6]), culture = soft(hueOf('#5fae8b'))
  const jar = glassware(g, { x: 0, y: 6, size: 80, kind: 'jar', liquid: culture, level: 0.62, id: 'vessel' })
  const top = 6 - 0.8 * 37 // the lid's lower edge
  const w = objW(80 * g.k), cw = Math.max(2, w * 0.75)
  let s = g.path(rrect(g, -1.4, top, 1.4, 40, 1.2), METAL.shadow, METAL.outline, cw)
  for (const y of [21, 36]) s += g.path(rrect(g, -12, y - 2, 12, y + 2, 2), METAL.base, METAL.outline, cw)
  const bubbles = [[-20, 14], [-23, 28], [-17, 38], [19, 12], [22, 26], [17, 32]].map(([x, y]) => g.circle(x, y, 1.8, culture.light)).join('')
  const lidTop = 6 - 0.8 * 50
  const ports = [-24, 24].map((x) => g.path(rrect(g, x - 2.2, lidTop - 6, x + 2.2, lidTop + 1, 1), METAL.shadow, METAL.outline, cw)).join('')
  const motor = g.path(rrect(g, -10, lidTop - 9, 10, lidTop + 1, 2.5), METAL.base, METAL.outline, cw)
  icon('Bioreactor', join(jar, own('bubbles', bubbles), own('stirrer', s), own('motor', ports + motor)))
}

// ---------------------------------------------------------------------------------------------------------------------
// Magnetic stirrer: a beaker of water on a stirring hotplate with two dials; a stir bar turns at the bottom of the beaker.
// (The base is the instrument part, its top band in the accent; the stir bar dark, as SiliCoDraw's; its turning is an
// arrow over it in the grey of symbols, where SiliCoDraw has a short arc.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.98, [0, 2.2])
  const base = instrument(g, { x: 0, y: 31, size: 90, aspect: 0.34, screen: false, buttons: 0, lamp: false, id: 'hotplate' })
  const bTop = 31 - 0.34 * 45, beakerSize = 60
  const beaker = glassware(g, { x: 1.8, y: bTop - 48 * beakerSize / 100 - 0.7, size: beakerSize, kind: 'beaker', liquid: 'water', level: 0.55, id: 'beaker' })
  const w = objW(90 * g.k), cw = Math.max(2, w * 0.8), fine = Math.max(1.5, w * 0.45)
  const dials = [-28, 28].map((x) => g.circle(x, 34, 5.5, METAL.shadow, METAL.outline, cw) + g.line([[x, 34], [x + 2.4, 30.5]], METAL.outline, fine)).join('')
  const by = bTop - 3.6
  const bar = g.path(rrect(g, -6.5, by - 1.8, 10.5, by + 1.8, 1.8), DARK.base, DARK.outline, Math.max(2, w * 0.5))
  const turn = arrow(g, { points: [[-7, by - 7], [2, by - 11.5], [11, by - 7]], colour: INK, w: Math.max(3.5, w * 0.6), id: 'turning' })
  icon('Magnetic stirrer', join(base, beaker, own('dials', dials), own('stir-bar', bar), { ...turn, parts: [] }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Autoclave: a front-loading steriliser with a round pressure door and its handle, a green lamp, and steam rising.
// (The instrument part with its round door; SiliCoDraw's green light is the lamp in the band.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(5.25, [0, 1.4])
  const box = instrument(g, { x: 0, y: 8.5, size: 82, aspect: 0.875, door: 'round', screen: false, buttons: 0, lamp: 'on', id: 'autoclave' })
  const top = 8.5 - 0.875 * 41
  const steam = [-14, 0, 14].map((x) => wisp(g, x, top - 2.5, top - 14.5, 6.5)).join('')
  icon('Autoclave', join(own('steam', steam), box))
}

// ---------------------------------------------------------------------------------------------------------------------
// Biosafety cabinet: a cabinet on a stand, its filter housing in the band at the top, a glass sash over the work opening
// and the work surface, with filtered air flowing down over the work.
// (Corrected: SiliCoDraw draws the airflow as slanted strokes; in a class II cabinet the filtered air comes straight down
// from the filter above the work, so the arrows point down. The sash, the opening and the stand are drawn here in the
// materials of the parts.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.9, [0, 0]), w = objW(92 * g.k), cw = Math.max(2, w * 0.75), fine = Math.max(1.5, w * 0.45)
  const yc = -12, H = 0.7 * 92, y0 = yc - H / 2, y1 = yc + H / 2
  const legs = [-38, 38].map((x) => g.path(rrect(g, x - 3, y1 - 2, x + 3, 42, 1.5), METAL.shadow, METAL.outline, cw) + g.path(rrect(g, x - 6, 41, x + 6, 45, 1.5), METAL.small, METAL.outline, cw)).join('') +
    g.path(rrect(g, -36, 31, 36, 35, 1.5), METAL.shadow, METAL.outline, cw)
  const body = instrument(g, { x: 0, y: yc, size: 92, aspect: 0.7, screen: false, buttons: 0, lamp: false, id: 'cabinet' })
  const sx0 = -38, sx1 = 38, sTop = y0 + H * 0.14 + 5, sBot = y1 - 22
  let front = g.path(rrect(g, sx0, sBot - 1, sx1, y1 - 6, 2), METAL.small, METAL.outline, cw) // the work opening
  front += g.path(rrect(g, sx0 - 2, y1 - 9, sx1 + 2, y1 - 5, 1.5), METAL.base, METAL.outline, cw) // the work surface's front edge
  front += `<g id="sash">${g.path(rrect(g, sx0, sTop, sx1, sBot, 2), GLASS.small, METAL.outline, w)}` +
    g.line([[sx0 + 4, sTop + 9], [sx0 + 10, sTop + 3]], GLASS.light, cw * 1.2) + g.line([[sx0 + 4, sTop + 17], [sx0 + 17, sTop + 4]], GLASS.light, cw * 1.2) + '</g>'
  front += g.path(rrect(g, -10, sBot - 1.5, 10, sBot + 2, 1.5), ACCENT.small, ACCENT.outline, fine) // the sash's handle
  const flow = [-17, 2, 21].map((x, i) => arrow(g, { points: [[x, sTop + 4], [x, sBot - 4]], colour: ACCENT.outline, w: Math.max(3.5, w * 0.6), id: `airflow${i}` }).body).join('')
  icon('Biosafety cabinet', join(own('stand', legs), body, own('front', front), own('airflow', flow)))
}

// ---------------------------------------------------------------------------------------------------------------------
// Liquid nitrogen dewar: a steel vessel with side handles, a narrow neck, a cap in the accent and cold vapour rising;
// "LN2" on its front over a cryogenic warning sign.
// (SiliCoDraw writes "LN₂" and underlines it; here the line under it is the ISO 7010 sign for low temperature, a yellow
// triangle with a snowflake. The handles are lugs on the shoulders.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.8, [0, -2]), w = objW(80 * g.k), cw = Math.max(2, w * 0.75)
  const handles = [-1, 1].map((sg) => g.path(rrect(g, sg < 0 ? -39 : 27, -16, sg < 0 ? -27 : 39, -9, 3.5), METAL.shadow, METAL.outline, cw)).join('')
  const body = g.path(rrect(g, -30, -27, 30, 45, 12), 'url(#dewar-gradient)', METAL.outline, w) + g.hl(-21, -10, 6, 22, 0, METAL.light)
  const neck = g.path(rrect(g, -12, -34, 12, -25, 2), METAL.shadow, METAL.outline, cw)
  const cap = g.path(rrect(g, -17, -41, 17, -33, 3.5), 'url(#dewar-cap-gradient)', ACCENT.outline, cw)
  const vapour = [-7, 7].map((x, i) => wisp(g, x, -42.5, -49.5, 5.5, i ? 2.5 : -2.5)).join('')
  const h = 11, word = lettering(g, { x: 0, y: 3, h, text: 'LN_2', colour: ACCENT.outline, id: 'LN2' })
  const sign = hazardSign(g, { x: 0, y: 26, size: 20, symbol: 'snowflake', id: 'cryogenic' })
  icon('Liquid nitrogen dewar', join(
    own('vapour', vapour),
    own('dewar', handles + body + neck, [['dewar', METAL]], g.grad('dewar-gradient', [-30, -27, 30, 45], METAL)),
    own('cap', cap, [['cap', ACCENT]], g.grad('dewar-cap-gradient', [-17, -41, 17, -33], ACCENT)),
    own('letters', word.body),
    sign))
  if (textWidth('LN_2') * h > 50) console.log('LN2 is too wide for the dewar')
}

// ---------------------------------------------------------------------------------------------------------------------
// Freezer (−80 °C): an upright ultra-low freezer with a solid door, its display reading −80 in the band, and a snowflake
// on the door.
// (The instrument part as its "Freezer" example, with the band in a colder blue; SiliCoDraw's snowflake is on the door.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.9, [0, 0]), pal = soft(230)
  const box = instrument(g, { x: 0, y: 0, size: 92, aspect: 1.6, screen: 'number', text: '-80', door: 'solid', buttons: 0, lamp: false, pal, id: 'freezer' })
  const flake = hazardSymbol(g, { x: -2.5, y: 11, size: 26, symbol: 'snowflake', colour: pal.small, id: 'snowflake' })
  icon('Freezer', join(box, flake))
}

check()
console.log('written to', OUT)
