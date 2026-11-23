// Two icons of SiliCoDraw's "Techniques & assays" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts and the
// approved cells: Egg freezing (vitrification) and Antral follicle count. Compositions are read by hand from the source
// in its 100 × 100 box centred on 0,0 and scaled onto a 512 page (`page` of ../cellkit.mjs); outlines at 60 %
// (setStrokeScale), gloss on (the oocyte placed by placeCellType is glossy already).
// Parts used: placeCellType ('Oocyte') (tissue.mjs); hazardSymbol (the snowflake), conventions of objects (lab.mjs).
// Drawn here because no part draws them: a vitrification carrier (Cryotop: a thin strip on a handle) with its drop, and a
// transvaginal ultrasound image (a fan-shaped sector) of an ovary with its antral follicles and a calliper.
// Lettered: nothing.
// Usage: node tbP.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss } from '../cellkit.mjs'
import { hueOf, rich, soft, toHex, toLch } from '../colour.mjs'
import { f, setStrokeScale } from '../shapes.mjs'
import { FIELD, GRID } from '../parts/assays.mjs'
import { ACCENT, DARK, GLASS, PLASTIC, hazardSymbol, objW } from '../parts/lab.mjs'
import { placeCellType } from '../parts/tissue.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012: plastic, glass, the ultrasound image) are left out of the hue check, as the conventions of
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
const rot = (g, x, y, turn) => (turn ? ` transform="rotate(${f(turn)} ${f(g.X(x))} ${f(g.Y(y))})"` : '')

// ---------- the icons ----------
// Egg freezing (vitrification): an oocyte in a tiny drop of vitrification solution on the strip of a Cryotop carrier,
// and a snowflake for the plunge into liquid nitrogen. The drop is clear (the GLASS grey), the carrier's handle the
// green (soft 150: the accent blue would lie 32° from the zona pellucida), the snowflake in the accent's outline tone (as
// Cryovial).
const HANDLE = soft(150)
icon('Egg freezing', [5.121, -2.87, -0.4], (g) => {
  const defs = [], w = objW(60 * g.k), turn = 30
  // the carrier, drawn level and turned 30° about 0, 0 as SiliCoDraw turns it: a thin strip and a handle
  let c = fillD(rrect(g, -46, 12, 16, 16.5, 2), PLASTIC.light, PLASTIC.outline, w * 0.75)
  c += fillD(rrect(g, 12, 8.5, 48, 20.5, 3), objFill(g, 'handle-gradient', [12, 8.5, 48, 20.5], HANDLE, defs), HANDLE.outline, w)
  c += strokeD(polyline(g, [[18, 12], [18, 17]]) + polyline(g, [[22, 12], [22, 17]]), HANDLE.outline, Math.max(1.5, w * 0.45))
  const carrier = own('carrier', `<g${rot(g, 0, 0, turn)}>${c}</g>`, [['strip', PLASTIC], ['handle', HANDLE]], defs.join(''))
  const drop = own('drop', g.ellipse(-8.5, -11.5, 25, 23, 0, GLASS.shadow, GLASS.outline, Math.max(1.5, w * 0.5)), [['drop', GLASS]])
  const egg = placeCellType(g, 'Oocyte', { x: -8.5, y: -12, size: 35, id: 'oocyte' })
  const snow = hazardSymbol(g, { x: 30, y: -28, size: 32, w: 10, symbol: 'snowflake', colour: ACCENT.outline, id: 'frozen' })
  return join(carrier, drop, egg, snow)
})

// Antral follicle count: a transvaginal ultrasound image, a fan-shaped sector from the probe at the top; in it the ovary
// (grey) with its antral follicles (black, fluid-filled), a calliper measuring one (yellow, as on the scanner) and
// depth marks at the side. A picture of data: flat, in greys, the calliper the one colour.
const CALLIPER = rich(hueOf('#f2c94c'))
const SCAN = { ground: toHex({ l: 0.27, c: 0.008, h: 265 }), ovary: FIELD.phase, follicle: toHex({ l: 0.16, c: 0.006, h: 265 }) }
icon('Antral follicle count', [4.543, 0.0, -2.23], (g) => {
  const w = objW(100 * g.k), k = g.k
  // the sector: two straight sides from the probe's arc at the top to the far arc at the bottom
  const [a1, b1] = g.P([-9, -44.4]), [a2, b2] = g.P([-50, 26.6]), [a3, b3] = g.P([50, 26.6]), [a4, b4] = g.P([9, -44.4])
  const sector = `M${f(a1)},${f(b1)} L${f(a2)},${f(b2)} A${f(100 * k)},${f(100 * k)} 0 0 0 ${f(a3)},${f(b3)} L${f(a4)},${f(b4)} A${f(18 * k)},${f(18 * k)} 0 0 1 ${f(a1)},${f(b1)} Z`
  let s = `<g id="sector">${fillD(sector, SCAN.ground, DARK.outline, w)}</g>`
  s += `<g id="ovary">${g.ellipse(0, 8, 31, 21, 0, SCAN.ovary.base, SCAN.ovary.light, w * 0.55)}`
  s += strokeD(`M${P2(g.P([-24, 0]))} C${P2(g.P([-18, -4]))} ${P2(g.P([-10, -6]))} ${P2(g.P([-4, -6]))} M${P2(g.P([8, 22]))} C${P2(g.P([14, 22]))} ${P2(g.P([20, 20]))} ${P2(g.P([24, 16]))}`, SCAN.ovary.light, Math.max(1.5, w * 0.45)) + '</g>'
  const fl = [[-18, 4, 6.2], [-5, 15, 6.6], [9, 1, 7.2], [21, 12, 5.4], [-20, 17, 4.2], [3, -9, 4], [14, 22, 3.6]]
  s += `<g id="follicles">${fl.map(([x, y, r]) => g.circle(x, y, r, SCAN.follicle, SCAN.ovary.outline, Math.max(1.5, w * 0.4))).join('')}</g>`
  s += `<g id="depth-marks">${strokeD([[22, -22], [28, -10], [34, 2], [40, 14]].map(([x, y]) => polyline(g, [[x, y], [x + 3, y]])).join(' '), GRID, Math.max(1.5, w * 0.45))}</g>`
  s += `<g id="probe-face">${strokeD(`M${P2(g.P([-7, -40.5]))} A${f(14 * k)},${f(14 * k)} 0 0 0 ${P2(g.P([7, -40.5]))}`, SCAN.ovary.base, Math.max(1.5, w * 0.5))}</g>`
  const cw = Math.max(2.5, w * 0.75)
  const cal = strokeD(polyline(g, [[3, 1], [15, 1]]), CALLIPER.base, cw, 'butt', ` stroke-dasharray="${f(cw * 1.6)} ${f(cw * 1.3)}"`) +
    strokeD(polyline(g, [[-1.5, 1], [3.5, 1]]) + polyline(g, [[1, -1.5], [1, 3.5]]) + polyline(g, [[14.5, 1], [19.5, 1]]) + polyline(g, [[17, -1.5], [17, 3.5]]), CALLIPER.base, cw * 1.3)
  return join({ defs: '', body: s, parts: [['image', FIELD.dark]] }, own('calliper', cal, [['calliper', CALLIPER]]))
})

check()
console.log('written')
