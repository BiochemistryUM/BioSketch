// Eight icons of SiliCoDraw's "Techniques & assays" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David
// Carlsson; see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts:
// field methods of ecology and environmental microbiology: a camera trap, a quadrat, a transect, a telemetry collar, a
// soil core, a water sampler (Niskin bottle), a microsensor profile and stable isotope probing.
// Parts used: micropipette (assays.mjs, the sharp electrode as the microsensor); tube (lab.mjs, with layers: the CsCl
// gradient); arrow (tissue.mjs); ACCENT, DARK, GLASS, INK, LIQUIDS, METAL, PAPER, PLASTIC, objW (lab.mjs); lettering.
// Drawn here because no part draws them: a tree trunk and the camera trap strapped to it; a seedling; the quadrat frame;
// a measuring tape with its stakes and survey flags; a collar with its GPS unit and antenna; a soil corer with its liner
// and horizons; a Niskin bottle and the water it hangs in; water over sediment.
// Lettered (strokes): GPS on the collar's unit; O, A, B, C beside the soil horizons; O_2 over the oxygen profile;
// ^1^2C and ^1^3C beside the two DNA bands of stable isotope probing.
// Left out: words (IR, 1 m², 0 m … 30 m, tracked, depth).
// The current look: outlines at 60 % (setStrokeScale), the gloss on (setGloss). Everything here is an object or a scene
// of the ground, so nothing is glossed. Lines that are the drawing itself (waves, strings, the profile, letters) keep
// their width.
// Usage: node tbL.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex, toLch } from '../colour.mjs'
import { catmull, f, setStrokeScale } from '../shapes.mjs'
import { SERIES, mixHex, micropipette } from '../parts/assays.mjs'
import { ACCENT, DARK, GLASS, INK, LIQUIDS, METAL, PAPER, PLASTIC, objW, tube } from '../parts/lab.mjs'
import { lettering } from '../parts/letters.mjs'
import { arrow } from '../parts/tissue.mjs'

const OUT = process.argv[2]
const SCALE = 0.6
setStrokeScale(SCALE)
setGloss(true)
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT)
// Greys (chroma below 0.012: paper, ink, materials) are left out of the hue check, as the conventions of lab.mjs say; a
// palette used twice is one part that recolours as one, so it is listed once.
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base) === i), defs, body)
/** A line on its own (fill none) is the drawing itself and keeps its width: svg() multiplies it by SCALE again. */
const keepLines = (body) => body.replace(/<path [^>]*fill="none"[^>]*>/g, (el) => el.replace(/stroke-width="([\d.]+)"/, (_, v) => `stroke-width="${f(v / SCALE)}"`))
const icon = (name, ...ps) => cellType(name, ps.flatMap((p) => p.parts ?? []), ps.map((p) => p.defs ?? '').join(''), keepLines(ps.map((p) => p.body).join('\n')))
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })
const P2 = (g, p) => g.P(p).map(f).join(',')
const L = (g, pts) => `M${pts.map((p) => P2(g, p)).join(' L')}`
const rrect = (g, x0, y0, x1, y1, r) => `M${P2(g, [x0 + r, y0])} L${P2(g, [x1 - r, y0])} Q${P2(g, [x1, y0])} ${P2(g, [x1, y0 + r])} L${P2(g, [x1, y1 - r])} Q${P2(g, [x1, y1])} ${P2(g, [x1 - r, y1])} L${P2(g, [x0 + r, y1])} Q${P2(g, [x0, y1])} ${P2(g, [x0, y1 - r])} L${P2(g, [x0, y0 + r])} Q${P2(g, [x0, y0])} ${P2(g, [x0 + r, y0])}Z`
const line = (g, pts, colour, w) => `<path d="${L(g, pts)}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"/>`
const curve = (g, pts, colour, w) => line(g, catmull(pts, 8), colour, w)
/** An earthy palette of one hue: base l, chroma c. */
const earth = (h, l, c) => ({ light: toHex({ l: Math.min(0.97, l + 0.12), c: c * 0.6, h }), base: toHex({ l, c, h }), shadow: toHex({ l: l - 0.06, c: c * 1.05, h }), small: toHex({ l: l - 0.14, c: c * 1.05, h }), outline: toHex({ l: Math.max(0.3, l - 0.3), c: c * 0.9, h }) })
const K = 4.55
const word = (g, text, x, y, h, colour, id) => lettering(g, { x, y, h, text, colour, id }).body

/** A seedling: a short stem and two leaves, `s` its height, flat. */
const seedling = (g, x, y, s, pal, w) => {
  const leaf = (sg) => `M${P2(g, [x, y - s * 0.55])} C${P2(g, [x + sg * s * 0.15, y - s * 1.05])} ${P2(g, [x + sg * s * 0.62, y - s * 1.05])} ${P2(g, [x + sg * s * 0.7, y - s * 0.95])} C${P2(g, [x + sg * s * 0.62, y - s * 0.55])} ${P2(g, [x + sg * s * 0.25, y - s * 0.45])} ${P2(g, [x, y - s * 0.55])}Z`
  return line(g, [[x, y], [x, y - s * 0.6]], pal.outline, w * 1.2) + g.path(leaf(-1), pal.base, pal.outline, w) + g.path(leaf(1), pal.base, pal.outline, w)
}

// ---------------------------------------------------------------------------------------------------------------------
// Camera trap: a camouflaged camera strapped to a tree trunk, with its lens, the motion sensor below it and the infrared
// flash panel; arcs show the sensor's field.
// (SiliCoDraw: a green box with a lens, red IR lights and grass. Here the housing is olive (camouflage), strapped to a
// brown trunk with a dark strap; the infrared LEDs are dark, as they look when off, and the grass is left out (its green
// would recolour with the housing).)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K, [-8.8, 0]), w = objW(50 * g.k), fine = Math.max(1.5, w * 0.5)
  const BARK = earth(55, 0.58, 0.06), CAMO = earth(125, 0.66, 0.07)
  const trunk = own('trunk', g.path(L(g, [[-48, -50], [-29, -50], [-28, 50], [-49, 50]]) + 'Z', 'url(#trunk-gradient)') + [[-44, -40, -42, -18], [-37, -30, -36, -4], [-43, 6, -42, 30], [-35, 18, -34, 40]].map(([a, b, c, d]) => line(g, [[a, b], [c, d]], BARK.small, fine)).join('') +
    line(g, [[-48, -50], [-49, 50]], BARK.outline, w) + line(g, [[-29, -50], [-28, 50]], BARK.outline, w), [['bark', BARK]], g.grad('trunk-gradient', [-49, -50, -28, 50], BARK))
  const strap = own('strap', g.path(rrect(g, -50, -4, -22, 3, 1), DARK.base, DARK.outline, fine))
  const X0 = -24, X1 = 12, Y0 = -30, Y1 = 26
  const housing = g.path(rrect(g, X0, Y0, X1, Y1, 5), 'url(#housing-gradient)', CAMO.outline, w) + g.path(rrect(g, X0 + 3, Y0 + 3, X1 - 3, Y0 + 7, 2), CAMO.shadow) +
    line(g, [[X0 + 3, Y1 - 6], [X1 - 3, Y1 - 6]], CAMO.outline, fine)
  const lx = (X0 + X1) / 2, ly = -14
  const lens = g.circle(lx, ly, 8.5, DARK.base, DARK.outline, w) + g.circle(lx, ly, 5.2, mixHex(DARK.base, GLASS.base, 0.35), DARK.outline, fine) + g.circle(lx - 1.8, ly - 1.8, 1.6, GLASS.light)
  const pir = g.circle(lx, 17, 4, PAPER.base, PAPER.outline, fine)
  const ir = g.path(rrect(g, lx - 10, 1, lx + 10, 10, 2), DARK.base, DARK.outline, fine) + [-6, -2, 2, 6].map((d) => g.circle(lx + d, 5.5, 1.4, DARK.light)).join('')
  const arcs = [10, 17, 24].map((r) => { const pts = Array.from({ length: 11 }, (_, i) => { const t = ((-38 + 7.6 * i) * Math.PI) / 180; return [X1 - 4 + r * Math.cos(t), ly + 10 + r * Math.sin(t)] }); return line(g, pts, INK, fine * 1.6) }).join('')
  icon('Camera trap', trunk, strap, own('camera', housing + lens + pir + ir, [['housing', CAMO]], g.grad('housing-gradient', [X0, Y0, X1, Y1], CAMO)), own('field', arcs))
}

// ---------------------------------------------------------------------------------------------------------------------
// Quadrat: a square sampling frame laid on the ground, strung into four squares, with seedlings to count inside.
// (SiliCoDraw: a dark square with a cross and green sprouts. Here the frame is a metal frame on bare soil, the strings
// ink, the seedlings green with two leaves; the "1 m²" is left out.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(5.15, [0, 0]), w = objW(90 * g.k), fine = Math.max(1.5, w * 0.5)
  const SOIL = earth(65, 0.86, 0.04), LEAF = deep(140)
  const ground = own('soil', g.path(rrect(g, -44, -44, 44, 44, 3), SOIL.base, SOIL.small, fine) + [[-30, -36], [16, -34], [36, -10], [-36, 22], [-10, 38], [30, 36], [-16, -4], [12, 4]].map(([x, y]) => g.ellipse(x, y, 1.8, 1.2, 20, SOIL.small)).join(''), [['soil', SOIL]])
  const plants = [[-24, -24], [-10, -16], [22, -22], [-28, 14], [14, 20], [28, 34], [-6, 32], [8, -4]].map(([x, y], i) => seedling(g, x, y, 11 + (i % 3) * 2, LEAF, fine)).join('')
  const strings = line(g, [[-38, 0], [38, 0]], INK, fine) + line(g, [[0, -38], [0, 38]], INK, fine)
  const fw = 5.5
  const frame = g.path(rrect(g, -42, -42, 42, 42, 2) + ' ' + rrect(g, -42 + fw, -42 + fw, 42 - fw, 42 - fw, 1), 'url(#frame-gradient)', METAL.outline, w).replace('<path ', '<path fill-rule="evenodd" ')
  icon('Quadrat', ground, own('plants', plants, [['plants', LEAF]]), own('strings', strings), own('frame', frame, [], g.grad('frame-gradient', [-42, -42, 42, 42], METAL)))
}

// ---------------------------------------------------------------------------------------------------------------------
// Transect: a measuring tape stretched between two stakes over the ground, marked every ten metres, with survey flags
// where samples are taken along the line.
// (SiliCoDraw: an orange line with ticks and two stick figures on a green hill, distances written out. Here the tape is
// the yellow of a field tape, the observers are replaced by red survey flags at the sampling points, and the distances
// are left out.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K, [0, 6]), w = objW(90 * g.k), fine = Math.max(1.5, w * 0.5)
  const GRASS = soft(135), TAPE = rich(95), FLAG = SERIES[1]
  const top = Array.from({ length: 25 }, (_, i) => { const x = -48 + 4 * i; return [x, 20 + 3 * Math.sin(x / 11) - 2 * Math.cos(x / 23)] })
  const ground = own('ground', g.path(`M${catmull(top, 4).map((p) => P2(g, p)).join(' L')} L${P2(g, [48, 46])} L${P2(g, [-48, 46])}Z`, GRASS.base, GRASS.outline, w) +
    [-38, -14, 6, 30].map((x) => line(g, [[x - 2, 26], [x - 3, 22]], GRASS.outline, fine) + line(g, [[x, 26], [x, 21]], GRASS.outline, fine) + line(g, [[x + 2, 26], [x + 3, 22]], GRASS.outline, fine)).join(''), [['ground', GRASS]])
  const stake = (x) => g.path(L(g, [[x - 2, -20], [x + 2, -20], [x + 2, 22], [x, 26], [x - 2, 22]]) + 'Z', METAL.base, METAL.outline, fine * 1.4)
  const ty = -12
  const tape = g.path(rrect(g, -44, ty - 3, 44, ty + 3, 1), TAPE.base, TAPE.outline, fine * 1.3) + [-44, -22, 0, 22, 44].map((x) => line(g, [[x, ty - 3], [x, ty + 1.5]], INK, fine)).join('') +
    [-33, -11, 11, 33].map((x) => line(g, [[x, ty - 3], [x, ty - 0.5]], INK, fine * 0.8)).join('')
  const flag = (x, base) => line(g, [[x, base], [x, ty - 22]], METAL.outline, fine * 1.4) + g.path(L(g, [[x, ty - 22], [x + 11, ty - 18.5], [x, ty - 15]]) + 'Z', FLAG.base, FLAG.outline, fine)
  const flags = flag(-21, 22) + flag(12, 20)
  icon('Transect', ground, own('flags', flags, [['flags', FLAG]]), own('stakes', stake(-44) + stake(44)), own('tape', tape, [['tape', TAPE]]))
}

// ---------------------------------------------------------------------------------------------------------------------
// Telemetry collar: a collar with its GPS unit at the top, an antenna and radio waves going out.
// (SiliCoDraw: a dark ring and a blue box with "GPS". Here the strap is dark rubber with a metal buckle, the unit a metal
// casing with the accent band of instruments, lettered GPS, the antenna dark with a red tip.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(5.05, [0, -7.5]), w = objW(80 * g.k), fine = Math.max(1.5, w * 0.5)
  const cy = 8, rx = 34, ry = 23
  const ring = Array.from({ length: 73 }, (_, i) => { const t = (i / 72) * Math.PI * 2; return [rx * Math.cos(t), cy + ry * Math.sin(t)] })
  const strap = own('strap', g.union([{ d: L(g, ring) + 'Z', width: 7.5 * g.k }], DARK.base, DARK.outline, w * 0.8) + line(g, ring.slice(4, 32), DARK.light, fine))
  const buckle = g.path(rrect(g, -6, cy + ry - 5.5, 6, cy + ry + 5.5, 1.5), METAL.base, METAL.outline, fine * 1.4) + g.path(rrect(g, -3, cy + ry - 2.5, 3, cy + ry + 2.5, 1), DARK.base)
  const ux0 = -16, ux1 = 16, uy0 = -32, uy1 = -8
  const unit = g.path(rrect(g, ux0, uy0, ux1, uy1, 4), 'url(#unit-gradient)', METAL.outline, w) + g.path(rrect(g, ux0, uy1 - 6, ux1, uy1 - 2, 0.01), ACCENT.base, ACCENT.outline, fine)
  const gps = word(g, 'GPS', 0, -21.5, 8.5, INK, 'gps')
  const ant = line(g, [[9, uy0], [9, -44]], DARK.base, 2.2 * g.k) + g.circle(9, -44.5, 2.6, SERIES[1].base, SERIES[1].outline, fine)
  const waves = [6, 11].map((r) => { const arc = (a0, a1) => Array.from({ length: 9 }, (_, i) => { const t = ((a0 + ((a1 - a0) * i) / 8) * Math.PI) / 180; return [9 + r * Math.cos(t), -44.5 + r * Math.sin(t)] }); return line(g, arc(-40, 40), INK, fine * 1.4) + line(g, arc(140, 220), INK, fine * 1.4) }).join('')
  icon('Telemetry collar', strap, own('buckle', buckle), own('antenna', ant, [['tip', SERIES[1]]]), own('waves', waves), own('unit', unit + gps, [['band', ACCENT]], g.grad('unit-gradient', [ux0, uy0, ux1, uy1], METAL)))
}

// ---------------------------------------------------------------------------------------------------------------------
// Soil core: a corer with its T-handle and a clear liner holding the core, its horizons from the dark organic layer (O)
// through the topsoil (A) and subsoil (B) to the pale parent material (C), lettered beside it.
// (SiliCoDraw: a white tube with four browns and A, B, C. The horizons are one brown in four lightnesses, so that they
// recolour as one soil; the O horizon is lettered too; the handle is in the accent, as handles are.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K, [4.6, -1]), w = objW(70 * g.k), fine = Math.max(1.5, w * 0.5)
  const SOIL = earth(60, 0.55, 0.07)
  const X0 = -13, X1 = 13, Y0 = -30, Y1 = 46, i = 3
  const hz = [[Y0 + i, -17, 0.32], [-17, 2, 0.48], [2, 24, 0.64], [24, Y1 - i, 0.8]]
  const tone = (l) => toHex({ l, c: 0.07 - (l - 0.32) * 0.05, h: 60 })
  const layers = hz.map(([a, b, l], k) => g.path(k === 3 ? rrect(g, X0 + i, a, X1 - i, b, 2).replace(/^M[^L]*L/, (m) => m) : L(g, [[X0 + i, a], [X1 - i, a], [X1 - i, b], [X0 + i, b]]) + 'Z', tone(l))).join('') +
    hz.slice(1).map(([a]) => line(g, [[X0 + i, a], [X1 - i, a]], SOIL.outline, fine * 0.8)).join('') + [[-5, -8], [4, 10], [-3, 16], [5, 32], [-6, 38]].map(([x, y]) => g.ellipse(x, y, 1.6, 1.1, 15, tone(0.4))).join('')
  const liner = g.path(rrect(g, X0, Y0, X1, Y1, 3) + ' ' + rrect(g, X0 + i, Y0 + i, X1 - i, Y1 - i, 2), GLASS.base, '', 0).replace('<path ', '<path fill-rule="evenodd" ') + g.path(rrect(g, X0, Y0, X1, Y1, 3), 'none', GLASS.outline, w) + line(g, [[X0 + 1.5, Y0 + 6], [X0 + 1.5, Y1 - 6]], GLASS.light, fine)
  const shaft = g.path(rrect(g, -2.4, -43, 2.4, Y0 + 1, 1), METAL.base, METAL.outline, fine * 1.4)
  const handle = g.path(rrect(g, -17, -48, 17, -41, 3.5), 'url(#handle-gradient)', ACCENT.outline, w)
  const lab = hz.map(([a, b], k) => word(g, 'OABC'[k], 23, (a + b) / 2, 8, INK, `horizon-${'OABC'[k]}`)).join('')
  icon('Soil core', own('core', layers, [['soil', SOIL]]), own('liner', liner), own('corer', shaft), own('handle', handle, [['handle', ACCENT]], g.grad('handle-gradient', [-17, -48, 17, -41], ACCENT)), own('horizons', lab))
}

// ---------------------------------------------------------------------------------------------------------------------
// Water sampler: a Niskin bottle lowered on its line into the water to a chosen depth, where it is closed to take the
// sample; an arrow from the surface gives the depth.
// (SiliCoDraw: a grey bottle with blue water and "depth". Here the water is the water blue of the conventions, the bottle
// grey plastic with its two end caps in the accent (caps are), held by its lanyards; the word is replaced by the arrow.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K, [0, 0]), w = objW(60 * g.k), fine = Math.max(1.5, w * 0.5)
  const WATER = LIQUIDS.water
  const surf = Array.from({ length: 25 }, (_, k) => { const x = -48 + 4 * k; return [x, -14 + 2.2 * Math.sin((x + 48) / 6.4)] })
  const water = own('water', g.path(`M${catmull(surf, 4).map((p) => P2(g, p)).join(' L')} L${P2(g, [48, 44])} Q${P2(g, [48, 48])} ${P2(g, [44, 48])} L${P2(g, [-44, 48])} Q${P2(g, [-48, 48])} ${P2(g, [-48, 44])}Z`, WATER.base) + line(g, catmull(surf, 4), WATER.outline, w * 0.9), [['water', WATER]])
  const bx = -8, B0 = -6, B1 = 34, hw = 9
  const cable = line(g, [[bx, -50], [bx, B0 - 6]], INK, fine * 1.3) + g.ellipse(bx, -30, 2.8, 4, 0, DARK.base, DARK.outline, fine)
  const body = g.path(rrect(g, bx - hw, B0, bx + hw, B1, 2), 'url(#bottle-gradient)', PLASTIC.outline, w) + line(g, [[bx - hw + 3, B0 + 5], [bx - hw + 3, B1 - 5]], PAPER.light, fine * 1.4)
  const caps = g.path(rrect(g, bx - hw - 1.5, B0 - 6, bx + hw + 1.5, B0 + 1, 2.5), ACCENT.base, ACCENT.outline, fine * 1.3) + g.path(rrect(g, bx - hw - 1.5, B1 - 1, bx + hw + 1.5, B1 + 6, 2.5), ACCENT.base, ACCENT.outline, fine * 1.3)
  const lanyard = line(g, [[bx, B0 - 6], [bx, B1 + 6]], ACCENT.outline, fine)
  const depth = arrow(g, { points: [[24, -12], [24, (B0 + B1) / 2]], colour: INK, w: 4.2, head: 14, start: 'bar', id: 'depth' })
  icon('Water sampler', water, own('cable', cable), own('bottle', body + lanyard + caps, [['caps', ACCENT]], g.grad('bottle-gradient', [bx - hw, B0, bx + hw, B1], PLASTIC)), depth)
}

// ---------------------------------------------------------------------------------------------------------------------
// Microsensor profile: a microsensor lowered through the water into the sediment, and beside it the oxygen profile it
// records: steady in the water, falling to nothing a few millimetres into the sediment.
// (SiliCoDraw: the same scene. The sensor is the sharp electrode of the micropipette part with its holder; water the
// water blue, sediment one sandy hue in two lightnesses; the profile oxygen red on ink axes, the depth running down, with
// O_2 lettered at its axis.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.88, [0, 0]), w = objW(92 * g.k), fine = Math.max(1.5, w * 0.5)
  const WATER = LIQUIDS.water, SAND = earth(80, 0.82, 0.06), OX = deep(hueOf('#e86b6b'))
  const s1 = (k) => Array.from({ length: 24 }, (_, i) => { const x = -46 + 4 * i; return [x, k + 1.6 * Math.sin(x / 9 + k)] })
  const fillBelow = (pts, y1, col) => g.path(`M${catmull(pts, 4).map((p) => P2(g, p)).join(' L')} L${P2(g, [46, y1])} L${P2(g, [-46, y1])}Z`, col)
  const box = rrect(g, -46, -40, 46, 46, 5)
  const scene = g.path(box, WATER.light) + fillBelow(s1(6), 46, SAND.base) + fillBelow(s1(26), 46, SAND.shadow) + line(g, catmull(s1(6), 4), SAND.outline, fine * 1.3) +
    [[-38, 14], [-8, 16], [-34, 34], [-4, 36], [30, 38], [40, 14], [24, 30], [-20, 40]].map(([x, y]) => g.circle(x, y, 1.3, SAND.small)).join('')
  const frame = g.path(box, 'none', PLASTIC.outline, w)
  const sensor = micropipette(g, { x: -23, y: -11.5, size: 69, kind: 'sharp', id: 'microsensor' })
  const axes = line(g, [[9, -22], [9, 40]], INK, fine * 1.4) + line(g, [[9, -22], [42, -22]], INK, fine * 1.4)
  const profile = line(g, catmull([[36, -22], [36, -6], [33, 3], [22, 10], [13, 18], [10, 24]], 8), OX.outline, w * 1.1) + line(g, [[10, 24], [10, 40]], OX.outline, w * 1.1)
  const o2 = word(g, 'O_2', 26, -30, 8, INK, 'o2')
  icon('Microsensor profile', own('scene', scene, [['water', WATER], ['sediment', SAND]]), sensor, own('profile', axes + profile + o2, [['oxygen', OX]]), own('frame', frame))
}

// ---------------------------------------------------------------------------------------------------------------------
// Stable isotope probing: DNA from a community fed a ¹³C-labelled substrate is spun in a caesium chloride gradient; the
// unlabelled DNA (¹²C) forms a band higher up, the labelled, heavier DNA (¹³C) a band lower down.
// (SiliCoDraw: a tube with a grey gradient, a blue and a red band, and names on pills. Here the tube is lab's test tube in
// plastic with the gradient as layers of greys, denser towards the bottom; the bands the first two series colours, and
// the names lettered beside them on ink leaders, without pills.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.75, [2, 0]), fine = Math.max(1.5, objW(90 * g.k) * 0.5)
  const grey = (l) => ({ light: toHex({ l: Math.min(0.99, l + 0.04), c: 0.004, h: 250 }), base: toHex({ l, c: 0.008, h: 250 }), shadow: toHex({ l: l - 0.04, c: 0.008, h: 250 }), small: toHex({ l, c: 0.008, h: 250 }), outline: toHex({ l: l - 0.12, c: 0.009, h: 250 }) })
  const LIGHT = SERIES[0], HEAVY = SERIES[1]
  const tx = -14, size = 94, u = size / 100
  const shares = [[0.2, grey(0.8)], [0.07, HEAVY], [0.16, grey(0.85)], [0.07, LIGHT], [0.2, grey(0.9)], [0.2, grey(0.95)]]
  const t = tube(g, { x: tx, y: 0, size, kind: 'test', material: 'plastic', layers: shares, id: 'gradient-tube' })
  // where the bands lie: the test tube's frame (rim 7, liquid from 4 under it to the bottom at 50), in g units
  const yTop = -43 + 4, yBot = 50, at = (a, b) => ((yBot - ((a + b / 2) * (yBot - yTop))) * u)
  const yH = at(0.2, 0.07), yL = at(0.43, 0.07)
  const lead = line(g, [[tx + 15 * u, yH], [tx + 26, yH]], INK, fine * 1.3) + line(g, [[tx + 15 * u, yL], [tx + 26, yL]], INK, fine * 1.3)
  const names = word(g, '^1^2C', tx + 39, yL, 11, LIGHT.outline, 'light-name') + word(g, '^1^3C', tx + 39, yH, 11, HEAVY.outline, 'heavy-name')
  icon('Stable isotope probing', t, own('labels', lead + names))
}

kit.check()
console.log('written', OUT)
