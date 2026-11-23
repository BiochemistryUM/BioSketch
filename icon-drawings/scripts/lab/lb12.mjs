// Eight icons of SiliCoDraw's "Lab & equipment" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared lab parts in
// ../parts/lab.mjs and their conventions of objects (glass, plastic and metal are greys; caps, handles and instrument
// bands in the one accent blue): a sharps container, an eye wash sign, a fire extinguisher, worm picking, a fly lifespan
// vial, plasma exchange between two blood bags, the Lifespan Machine (a flatbed scanner of worm plates) and a
// microfluidic worm chip. Their compositions are read by hand from the source in a 100 × 100 box centred on 0,0 and
// scaled onto a 512 page (`page` of ../cellkit.mjs).
// Parts used: hazardSign, petriDish, tube, screen-less casing colours (lab.mjs); arrow (tissue.mjs); lettering
// (letters.mjs). Drawn here because no part draws them: a C. elegans worm (`worm`), a fruit fly seen from above (`fly`),
// the sharps container and the fire extinguisher (in a full signal red, `SIGNAL`), the blood bag and its tubing, the flatbed scanner, the PDMS chip with
// its channels and chambers, and the worm pick.
// Lettered (strokes): "ABC" on the fire extinguisher's label (the fire classes, as SiliCoDraw writes them).
// Usage: node lb12.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, smoothD } from '../cellkit.mjs'
import { soft, toHex, toLch } from '../colour.mjs'
import { f } from '../shapes.mjs'
import { ACCENT, DARK, GLASS, INK, LIQUIDS, METAL, PAPER, PLASTIC, hazardSign, objW, petriDish, tube } from '../parts/lab.mjs'
import { lettering } from '../parts/letters.mjs'
import { arrow } from '../parts/tissue.mjs'

const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012: the materials) are left out of the hue check, as the conventions of lab.mjs say.
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p]) => toLch(p.base).c >= 0.012), defs, body)
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts) })
// The same palette used by several parts is one colour, listed once.
const icon = (name, { defs, body, parts }) => cellType(name, parts.filter(([, p], i) => parts.findIndex(([, q]) => q.base === p.base) === i), defs, body)
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })

/** A rounded rectangle given in g's units, as a path on the page. */
const rrect = (g, x0, y0, x1, y1, r) => {
  const [a, b] = g.P([x0, y0]), W = (x1 - x0) * g.k, H = (y1 - y0) * g.k, R = Math.min(r * g.k, W / 2, H / 2)
  return `M${f(a + R)},${f(b)} H${f(a + W - R)} A${f(R)},${f(R)} 0 0 1 ${f(a + W)},${f(b + R)} V${f(b + H - R)} A${f(R)},${f(R)} 0 0 1 ${f(a + W - R)},${f(b + H)} H${f(a + R)} A${f(R)},${f(R)} 0 0 1 ${f(a)},${f(b + H - R)} V${f(b + R)} A${f(R)},${f(R)} 0 0 1 ${f(a + R)},${f(b)} Z`
}
/** A polygon given in g's units, as a path on the page. */
const poly = (g, pts) => `M${pts.map((p) => g.P(p).map(f).join(',')).join(' L')}Z`
const curve = (g, d) => g.D(d) // a path in g's units (M, L, C, Q written with absolute commas)
const strokePath = (d, colour, w, cap = 'round') => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
/** A tube or wire: an outline stroke with a narrower fill stroke on top. */
const pipe = (d, fill, outline, inner, w) => strokePath(d, outline, inner + 2 * w) + strokePath(d, fill, inner)

// ---------- biology drawn here (no part draws it) ----------
// The worm's colour: C. elegans is a pale, translucent cream; a peach hue (40) keeps it 45° from the agar (85) and well
// away from the bacterial lawn (125) and the water of a chip (222).
const WORM = soft(40)
/**
 * C. elegans, a sinuous body tapering to a pointed tail and a blunt head, centred on x, y (g's units), `len` long,
 * `amp` the height of its waves, `W` its half-width, turned by `turn` degrees, `waves` (1) along its length.
 * Drawn flat (fill and outline); a pale line along the body from 80 px on.
 */
const worm = (g, { x, y, len, amp = 1.6, W = 2.6, turn = 0, waves = 1, id = 'worm', w, phase = 0 }) => {
  const N = 36, a = (turn * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a)
  const X = (t) => -len / 2 + len * t, Y = (t) => amp * Math.sin(2 * Math.PI * waves * t + phase)
  const T = (t) => { const dx = len, dy = amp * 2 * Math.PI * waves * Math.cos(2 * Math.PI * waves * t + phase), l = Math.hypot(dx, dy); return [dx / l, dy / l] }
  const hw = (t) => (t < 0.1 ? W * Math.sqrt(Math.max(0, 1 - (1 - t / 0.1) ** 2)) : t > 0.6 ? W * ((1 - t) / 0.4) ** 1.1 : W)
  const L = [], R = [], mid = []
  for (let i = 0; i <= N; i++) {
    const t = (1 - Math.cos((Math.PI * i) / N)) / 2, [tx, ty] = T(t), h = Math.max(0.3, hw(t))
    L.push([X(t) - ty * h, Y(t) + tx * h]); if (i > 0 && i < N) R.unshift([X(t) + ty * h, Y(t) - tx * h])
    if (t > 0.12 && t < 0.6) mid.push([X(t) - ty * h * 0.25, Y(t) + tx * h * 0.25])
  }
  const place = ([u, v]) => g.P([x + u * ca - v * sa, y + u * sa + v * ca])
  const px = len * g.k
  w ??= Math.max(1.6, Math.min(3.5, px / 40))
  let s = `<path d="${smoothD(L.concat(R).map(place))}" fill="${WORM.shadow}" stroke="${WORM.outline}" stroke-width="${f(w)}" stroke-linejoin="round"/>`
  if (px >= 80) s += strokePath(`M${mid.map(place).map((p) => p.map(f).join(',')).join(' L')}`, WORM.light, Math.max(1.5, W * g.k * 0.35))
  return { defs: '', body: `<g id="${id}">${s}</g>`, parts: [['worm', WORM]] }
}
// The fly: a tan-brown body (hue 55) with red eyes (hue 15, 40° from the body) and clear wings (greys, see-through).
const FLY = { light: toHex({ l: 0.9, c: 0.04, h: 55 }), base: toHex({ l: 0.74, c: 0.09, h: 55 }), shadow: toHex({ l: 0.67, c: 0.1, h: 55 }), small: toHex({ l: 0.6, c: 0.1, h: 55 }), outline: toHex({ l: 0.38, c: 0.07, h: 55 }) }
const EYE = { light: toHex({ l: 0.8, c: 0.1, h: 15 }), base: toHex({ l: 0.56, c: 0.2, h: 15 }), shadow: toHex({ l: 0.5, c: 0.19, h: 15 }), small: toHex({ l: 0.56, c: 0.2, h: 15 }), outline: toHex({ l: 0.36, c: 0.13, h: 15 }) }
/**
 * A fruit fly (Drosophila) seen from above, head up, `size` its length (g's units) from the head to the wing tips,
 * centred on x, y and turned by `turn` degrees: a small head almost covered by two large red eyes, a round thorax
 * larger than the abdomen, the abdomen banded dark at the rear, two clear oval wings folded back over it, overlapping
 * a little and reaching past its tip (a vein from 80 px), and six thin short legs.
 */
const fly = (g, { x, y, size, turn = 0, id = 'fly' }) => {
  const s0 = size / 24, a = (turn * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a)
  const Q = ([u, v]) => g.P([x + (u * ca - v * sa) * s0, y + (u * sa + v * ca) * s0]).map(f).join(',')
  const px = size * g.k, w = Math.max(1.3, Math.min(2.8, px / 34)), k = s0 * g.k
  const el = (u, v, rx, ry, r, fill, stroke, sw, extra = '') => { const [cx, cy] = Q([u, v]).split(','); return `<ellipse cx="${cx}" cy="${cy}" rx="${f(rx * k)}" ry="${f(ry * k)}" transform="rotate(${f(turn + r)} ${cx} ${cy})" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${f(sw)}"` : ''}${extra}/>` }
  const legs = [[[-2.6, -4.6], [-4.8, -6.6], [-5.4, -8.6]], [[-3.4, -2.6], [-6, -2.4], [-7, -0.8]], [[-2.8, -1], [-5, 1.4], [-5.4, 3.8]]]
  const legD = [...legs, ...legs.map((l) => l.map(([u, v]) => [-u, v]))].map((l) => `M${l.map(Q).join(' L')}`).join(' ')
  let s = strokePath(legD, FLY.outline, Math.max(1, w * 0.5))
  // abdomen, under the wings: tan, its rear two bands dark
  s += `<g id="${id}-abdomen">` + el(0, 3.6, 3, 4.6, 0, FLY.small, FLY.outline, w)
  s += strokePath([[-2.7, 4.6, 2.7], [-2.1, 6.6, 2.1]].map(([u0, v, u1]) => `M${Q([u0, v])} L${Q([u1, v])}`).join(' '), FLY.outline, Math.max(1.3, 1.1 * k)) + '</g>'
  // wings: see-through glass ovals from the back of the thorax, folded back and crossing a little over the middle
  const wing = (sgn) => el(sgn * 2.1, 4.6, 2.9, 7.4, sgn * 6, GLASS.light, GLASS.outline, w * 0.85, ' fill-opacity="0.45"')
  s += `<g id="${id}-wings">` + wing(-1) + wing(1)
  if (px >= 80) s += strokePath([-1, 1].map((sgn) => `M${Q([sgn * 1.4, -1.6])} L${Q([sgn * 2.6, 5])} L${Q([sgn * 2.6, 10.4])}`).join(' '), GLASS.outline, Math.max(1, w * 0.45))
  s += '</g>'
  s += `<g id="${id}-thorax">` + el(0, -3.4, 3.8, 3.6, 0, FLY.small, FLY.outline, w)
  if (px >= 80) s += el(-1.2, -4.6, 1.3, 1, 0, FLY.base, '', 0)
  s += '</g>'
  s += `<g id="${id}-head">` + el(0, -8.2, 2.7, 2, 0, FLY.small, FLY.outline, w) + '</g>'
  s += `<g id="${id}-eyes">` + el(-2.2, -8.5, 1.75, 2.1, -15, EYE.base, EYE.outline, w * 0.75) + el(2.2, -8.5, 1.75, 2.1, 15, EYE.base, EYE.outline, w * 0.75)
  if (px >= 80) s += el(-2.6, -9.3, 0.5, 0.6, 0, EYE.light, '', 0) + el(1.8, -9.3, 0.5, 0.6, 0, EYE.light, '', 0)
  s += '</g>'
  return { defs: '', body: `<g id="${id}">${s}</g>`, parts: [['fly', FLY], ['eyes', EYE]] }
}

// The signal red of the sharps container and the fire extinguisher (hue 27, as GHS, but full: deep(27) reads salmon).
const SIGNAL = { light: toHex({ l: 0.8, c: 0.1, h: 27 }), base: toHex({ l: 0.62, c: 0.19, h: 27 }), shadow: toHex({ l: 0.56, c: 0.18, h: 27 }), small: toHex({ l: 0.52, c: 0.17, h: 27 }), outline: toHex({ l: 0.45, c: 0.15, h: 27 }) }

// ---------------------------------------------------------------------------------------------------------------------
// Sharps container: a red bin with a lid, the slot for needles in the lid, and the biohazard warning on its front.
// (SiliCoDraw puts a yellow biohazard roundel on it; here it is the ISO 7010 warning triangle of the hazardSign part.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const RED = SIGNAL, g = page(5.8, [0, 12]), w = objW(64 * g.k), cw = Math.max(2, w * 0.75)
  const binR = `<path d="${smoothD([[-27, -14], [27, -14], [26, 20], [24, 47], [20, 51], [-20, 51], [-24, 47], [-26, 20]].map(g.P))}" fill="url(#bin-gradient)" stroke="${RED.outline}" stroke-width="${f(w)}" stroke-linejoin="round"/>`
  const lid = g.path(rrect(g, -32, -27, 32, -12, 4), 'url(#lid-gradient)', RED.outline, w) + g.path(rrect(g, -12, -24, 12, -18, 2.5), DARK.base, DARK.outline, cw) +
    g.line([[-26, -23.5], [-18, -23.5]], RED.light, Math.max(2, w * 0.6))
  const shine = g.line([[-21, -6], [-20, 34]], RED.light, Math.max(2.5, w * 0.7))
  const sign = hazardSign(g, { x: 1.5, y: 20, size: 36, symbol: 'biohazard', id: 'sign' })
  icon('Sharps container', join(
    own('bin', binR + shine, [['bin', RED]], g.grad('bin-gradient', [-27, -14, 27, 51], RED)),
    own('lid', lid, [], g.grad('lid-gradient', [-32, -27, 32, -12], SIGNAL)),
    sign))
}

// ---------------------------------------------------------------------------------------------------------------------
// Eye wash: the ISO 7010 safe-condition sign E011 (eyewash station): a green square with an eye under three jets.
// (SiliCoDraw draws the same green square with an eye and drops; here it is the hazardSign part.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.95, [0, 0])
  icon('Eye wash', hazardSign(g, { x: 0, y: 0, size: 93, symbol: 'eyewash', id: 'eye-wash' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Fire extinguisher: a red cylinder with a paper label lettered ABC (the classes of fire), a metal valve head with its
// gauge, a dark lever and a hose ending in a nozzle.
// (SiliCoDraw's head and hose are one dark grey; here the head is metal, the lever and hose rubber-dark.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const RED = SIGNAL, g = page(5.0, [2, 1]), w = objW(64 * g.k), cw = Math.max(2, w * 0.75)
  const body = g.path(rrect(g, -17, -22, 17, 46, 11), 'url(#cylinder-gradient)', RED.outline, w) +
    g.path(rrect(g, -17, 39, 17, 46, 3), RED.shadow, RED.outline, cw) +
    g.line([[-11, -13], [-11, 30]], RED.light, Math.max(3, w * 0.8))
  const label = g.path(rrect(g, -12, -4, 12, 20, 3), PAPER.base, PAPER.outline, cw) + lettering(g, { x: 0, y: 8, h: 8, text: 'ABC', colour: INK, id: 'abc' }).body
  const head = g.path(rrect(g, -8, -33, 8, -21, 3), 'url(#head-gradient)', METAL.outline, cw) +
    g.circle(-15, -33, 6, PAPER.base, METAL.outline, cw) + g.line([[-15, -33], [-12.5, -36.5]], INK, Math.max(1.8, w * 0.45))
  const lever = g.path(poly(g, [[-6, -37], [-4, -41], [20, -45], [21, -41]]), DARK.base, DARK.outline, cw) + g.path(rrect(g, -6, -38, 6, -32, 2), DARK.base, DARK.outline, cw)
  const hoseD = curve(g, 'M6,-29 C20,-29 26,-22 26,-8 L26,22')
  const hose = pipe(hoseD, DARK.base, DARK.outline, 4.6 * g.k * 0.9, cw * 0.8) + g.path(rrect(g, 22.5, 20, 29.5, 34, 2.5), DARK.base, DARK.outline, cw)
  icon('Fire extinguisher', join(
    own('cylinder', body, [['cylinder', RED]], g.grad('cylinder-gradient', [-17, -22, 17, 46], RED)),
    own('label', label),
    own('hose', hose),
    own('head', head + lever, [], g.grad('head-gradient', [-8, -33, 8, -21], METAL))))
}

// ---------------------------------------------------------------------------------------------------------------------
// Worm picking: an NGM plate with a bacterial lawn and worms on it, and a worm pick (a handle in the accent and a thin
// platinum wire) lifting one worm off.
// (SiliCoDraw's holder is tan; here a handle in the accent, by the conventions. The plate is the angled petri dish with
// its lawn; the worms are drawn here.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.85, [0, 4.7]), w = objW(90 * g.k)
  const plate = petriDish(g, { x: 0, y: 26, size: 94, view: 'angled', lawn: true, id: 'plate' })
  const worms = [[-14, 27, 10, 1], [5, 23, -15, 0.95], [9, 32, 22, 0.9], [-29, 33, -5, 0.8], [29, 22, 30, 0.8]].map(([x, y, t, k], i) => worm(g, { x, y, len: 17 * k, amp: 2, W: 2.2 * k, turn: t, id: `worm${i}`, phase: i }))
  // the pick
  const ww = Math.max(3, w * 0.55)
  const wireD = `M${g.P([25, -21]).map(f).join(',')} L${g.P([3, 3]).map(f).join(',')}`
  const wire = strokePath(wireD, METAL.outline, ww + 2 * w * 0.45) + strokePath(wireD, METAL.base, ww)
  const a = Math.atan2(-30, 25), hx = 31.5, hy = -28.5, Lh = 12.5, Wd = 4.6
  const corners = [[-Lh, -Wd], [Lh, -Wd], [Lh, Wd], [-Lh, Wd]].map(([u, v]) => [hx + u * Math.cos(a) - v * Math.sin(a), hy + u * Math.sin(a) + v * Math.cos(a)])
  const handle = `<path d="${smoothD(corners.flatMap((c, i) => { const n = corners[(i + 1) % 4]; return [c, [(c[0] * 2 + n[0]) / 3, (c[1] * 2 + n[1]) / 3], [(c[0] + n[0] * 2) / 3, (c[1] + n[1] * 2) / 3]] }).map(g.P))}" fill="url(#handle-gradient)" stroke="${ACCENT.outline}" stroke-width="${f(w)}" stroke-linejoin="round"/>` +
    g.line([[hx - 9 + 3.2, hy + 11 - 3.2 - 0.5], [hx + 3, hy - 3.5]], ACCENT.light, Math.max(2.5, w * 0.6))
  const hanging = worm(g, { x: -3, y: 10.5, len: 15, amp: 1.8, W: 2.2, turn: 115, id: 'picked-worm', phase: 0.5 })
  icon('Worm picking', join(
    plate, ...worms,
    own('wire', wire),
    hanging,
    own('handle', handle, [['handle', ACCENT]], g.grad('handle-gradient', [hx - 12, hy - 12, hx + 12, hy + 12], ACCENT))))
}

// ---------------------------------------------------------------------------------------------------------------------
// Fly lifespan vial: a glass vial with fly food at the bottom and a foam plug, and three fruit flies on its walls.
// (The vial is the tube part's fly vial; the food is yellow, as SiliCoDraw's. The flies are drawn here, larger and with
// fewer details so that they still read at 40 px.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.9, [0, 0])
  const vial = tube(g, { x: 0, y: 0, size: 94, kind: 'vial', cap: 'plug', material: 'glass', liquid: 'plasma', level: 0.3, id: 'vial' })
  const flies = [[-2.5, -18, -20, 27], [3, 7.5, 16, 27]].map(([x, y, t, s], i) => fly(g, { x, y, size: s, turn: t, id: `fly${i}` }))
  icon('Fly lifespan vial', join(vial, ...flies))
}

// ---------------------------------------------------------------------------------------------------------------------
// Plasma exchange: two blood bags, young (brighter) and old (darker) blood, trading their contents through two crossing
// lines with arrowheads.
// (As SiliCoDraw. The bags are clear plastic, the blood one palette in two tones, so it recolours as one part.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.75, [0, 0.5]), w = objW(36 * g.k), cw = Math.max(2, w * 0.75)
  const BLOOD = LIQUIDS.blood, young = BLOOD.small, old = BLOOD.outline
  const bag = (cx, fill, i) => {
    const x0 = cx - 17, x1 = cx + 17, y0 = -38, y1 = 12
    let s = g.path(rrect(g, cx - 5.5, -47, cx + 5.5, -34, 2.5), PLASTIC.shadow, PLASTIC.outline, cw) + g.circle(cx, -43, 1.9, PLASTIC.base, PLASTIC.outline, Math.max(1.5, cw * 0.6))
    s += g.path(rrect(g, x0, y0, x1, y1, 7), `url(#bag${i}-gradient)`, PLASTIC.outline, w)
    s += `<path d="${curve(g, `M${x0 + 2.5},-15 C${cx - 6},-12 ${cx + 6},-18 ${x1 - 2.5},-15 L${x1 - 2.5},${y1 - 7} Q${x1 - 2.5},${y1 - 2.5} ${x1 - 7},${y1 - 2.5} L${x0 + 7},${y1 - 2.5} Q${x0 + 2.5},${y1 - 2.5} ${x0 + 2.5},${y1 - 7} Z`)}" fill="${fill}"/>`
    s += strokePath(curve(g, `M${x0 + 2.5},-15 C${cx - 6},-12 ${cx + 6},-18 ${x1 - 2.5},-15`), BLOOD.outline, Math.max(1.6, w * 0.45))
    s += g.path(rrect(g, cx - 10, -32, cx + 10, -21, 2), PAPER.base, PAPER.outline, Math.max(1.5, w * 0.45)) + g.line([[cx - 6, -28.5], [cx + 6, -28.5]], PAPER.small, Math.max(1.5, w * 0.4)) + g.line([[cx - 6, -24.5], [cx + 2, -24.5]], PAPER.small, Math.max(1.5, w * 0.4))
    s += g.path(rrect(g, x0, y0, x1, y1, 7), 'none', PLASTIC.outline, w) // the outline again, over the blood
    s += g.line([[x0 + 4.5, -11], [x0 + 4.5, 5]], PLASTIC.light, Math.max(2, w * 0.6))
    s += [cx - 8, cx + 4].map((px) => g.path(rrect(g, px, 11, px + 5, 17.5, 1.2), PLASTIC.shadow, PLASTIC.outline, cw)).join('')
    return own(`bag${i}`, s, [], g.grad(`bag${i}-gradient`, [x0, y0, x1, y1], PLASTIC))
  }
  const t1 = curve(g, 'M-32.5,17 C-32.5,50 33.5,50 33.5,26'), t2 = curve(g, 'M23.5,17 C23.5,38 -19.5,38 -19.5,26')
  const inner = 3.2 * g.k, ow = Math.max(1.8, w * 0.5)
  const head = (x, fill) => g.path(poly(g, [[x, 17.5], [x - 5.5, 27], [x + 5.5, 27]]), fill, BLOOD.outline, ow)
  const lines = pipe(t2, old, PLASTIC.outline, inner, ow) + head(-19.5, old) + pipe(t1, young, PLASTIC.outline, inner, ow) + head(33.5, young)
  icon('Plasma exchange', join(bag(-27, young, 0), bag(27, old, 1), own('lines', lines, [['blood', BLOOD]])))
}

// ---------------------------------------------------------------------------------------------------------------------
// Lifespan Machine: a flatbed scanner with its lid off, six NGM plates of worms lying on the glass, the light of the
// scan bar under them, and the scanner's front with its band, vents and a green lamp.
// (SiliCoDraw's lamp and light are its accent yellow; here the light is white and the front carries the accent band and
// a button of an instrument; a green lamp would lie too near the green lawn in hue. The plates are angled petri dishes with their lawn.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.85, [0, 0]), w = objW(94 * g.k), cw = Math.max(2, w * 0.75)
  const front = g.path(curve(g, 'M-47,6 L47,6 L47,26 Q47,32 41,32 L-41,32 Q-47,32 -47,26 Z'), METAL.shadow, METAL.outline, w) +
    g.line([[-37, 15], [-21, 15]], METAL.outline, Math.max(2, w * 0.45)) + g.line([[-37, 20.5], [-21, 20.5]], METAL.outline, Math.max(2, w * 0.45)) + g.line([[-37, 26], [-21, 26]], METAL.outline, Math.max(2, w * 0.45))
  const band = g.path(rrect(g, -10, 13, 28, 18, 2.5), ACCENT.base, ACCENT.outline, cw)
  const button = g.circle(37, 19, 3, ACCENT.small, ACCENT.outline, Math.max(1.5, w * 0.45))
  const top = g.path(poly(g, [[-38, -32], [38, -32], [47, 6], [-47, 6]]), 'url(#top-gradient)', METAL.outline, w) +
    g.path(poly(g, [[-33.5, -28], [33.5, -28], [41.5, 2], [-41.5, 2]]), DARK.base, DARK.outline, cw) +
    g.path(poly(g, [[-35.5, -19], [35.5, -19], [36.8, -14], [-36.8, -14]]), PAPER.light, '', 0)
  const plates = [], worms = []
  ;[[-21, -22, 19], [0, -22, 19], [21, -22, 19], [-25, -5, 23], [0, -5, 23], [25, -5, 23]].forEach(([x, y, s], i) => {
    plates.push(petriDish(g, { x, y, size: s, view: 'angled', lawn: true, id: `plate${i}` }))
    const k = s / 23
    ;[[-4, -1.5, 15], [3.5, 0.6, -20]].forEach(([dx, dy, t], j) => worms.push(worm(g, { x: x + dx * k, y: y + dy * k, len: 6.5 * k, amp: 0.8 * k, W: 0.95 * k, turn: t, id: `worm${i}-${j}`, w: 1.4, phase: i + j })))
  })
  icon('Lifespan Machine', join(own('scanner', front + top, [], g.grad('top-gradient', [-47, -32, 47, 6], METAL)), own('band', band + button, [['band', ACCENT]]), ...plates, ...worms))
}

// ---------------------------------------------------------------------------------------------------------------------
// Microfluidic worm chip: a clear PDMS chip with an inlet, a channel branching to three chambers that each hold one worm
// at a tapered outlet, an outlet, and an arrow for the flow.
// (As SiliCoDraw. The chip is glass-grey; the channels hold water; the worms are drawn here, heads towards the inlet.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.85, [0, 1.5]), w = objW(94 * g.k), cw = Math.max(2, w * 0.75), WATER = LIQUIDS.water
  const chip = g.path(rrect(g, -47, -34, 47, 40, 7), GLASS.shadow, GLASS.outline, w) + g.path(rrect(g, -47, -38, 47, 33, 7), 'url(#chip-gradient)', GLASS.outline, w) +
    g.line([[-41, -32], [-15, -32]], '#FFFFFF', Math.max(3, w * 0.7))
  const Y = [-20, -3, 14]
  const chD = [g.D('M-37,-3 L-31,-3'), g.D('M-31,-20 L-31,14'), g.D('M33,-20 L33,14'), g.D('M33,-3 L39,-3'), ...Y.flatMap((y) => [g.D(`M-31,${y} L-24,${y}`), g.D(`M26,${y} L33,${y}`)])].join(' ')
  const chW = 2.8 * g.k
  let ch = strokePath(chD, WATER.outline, chW + 2 * cw * 0.7)
  ch += Y.map((y) => g.path(poly(g, [[-24, y - 6.5], [16, y - 6.5], [26, y - 1.4], [26, y + 1.4], [16, y + 6.5], [-24, y + 6.5]]), WATER.base, WATER.outline, cw * 0.7)).join('')
  ch += strokePath(chD, WATER.base, chW)
  ch += [-38, 39].map((x) => g.circle(x, -3, 6.5, GLASS.shadow, WATER.outline, cw * 0.8) + g.circle(x, -3, 3.4, WATER.small, WATER.outline, cw * 0.6)).join('')
  const worms = Y.map((y, i) => worm(g, { x: -3 - (i % 2), y, len: 36, amp: i === 1 ? -1.5 : 1.5, W: 3.1, id: `worm${i}`, turn: 180 }))
  const flow = arrow(g, { points: [[-20, 26], [22, 26]], colour: INK, w: Math.max(3.5, w * 0.6), id: 'flow' })
  icon('Microfluidic worm chip', join(own('chip', chip, [], g.grad('chip-gradient', [-47, -38, 47, 33], GLASS)), own('channels', ch, [['water', WATER]]), ...worms, flow))
}

check()
console.log('written to', OUT)
