// Eight icons of SiliCoDraw's "Techniques & assays" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts: worm
// assays (RNAi by feeding, a FUdR sterile cohort, thrashing, pharyngeal pumping, paralysis, motility classes), the fly
// climbing assay and auxin-inducible degradation. Compositions read by hand from the source in a 100 × 100 box centred on
// 0,0 and scaled onto a 512 page (`page` of ../cellkit.mjs); outlines at 60 % and the gloss of cells on round proteins.
// Parts used: worm, culturePlate, badge, mixHex (assays.mjs); tube, PAPER, GLASS, ACCENT, INK, LIQUIDS, AGAR, LAWN (lab.mjs);
// bacterium, arrow (tissue.mjs); dna, protein (molecules.mjs); skeletal and formula (formula.mjs); gloss (surfaces.mjs);
// lettering (letters.mjs). Drawn here because no part draws them: the fruit fly seen from above (lb12's fly, its wings
// flat pale tones instead of see-through), a C. elegans egg, the head of a worm in close-up with its pharynx, protein
// fragments.
// Lettered (strokes): the motility classes "A", "B", "C".
// Usage: node tbF.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss, smoothD } from '../cellkit.mjs'
import { deep, rich, soft, toHex, toLch } from '../colour.mjs'
import { f, setStrokeScale, strokeScale } from '../shapes.mjs'
import { ACCENT, AGAR, GLASS, INK, LAWN, LIQUIDS, PAPER, tube } from '../parts/lab.mjs'
import { GRID, WORM, badge, culturePlate, mixHex, worm } from '../parts/assays.mjs'
import { arrow, bacterium } from '../parts/tissue.mjs'
import { dna, protein } from '../parts/molecules.mjs'
import { formula, go, polygon, skeletal } from '../parts/formula.mjs'
import { gloss, glossTones, pathPoints } from '../parts/surfaces.mjs'
import { lettering } from '../parts/letters.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012: the materials) are left out of the hue check, as the conventions of lab.mjs say.
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p]) => toLch(p.base).c >= 0.012), defs, body)
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts) })
const icon = (name, { defs, body, parts }) => cellType(name, parts.filter(([, p], i) => parts.findIndex(([, q]) => q.base === p.base) === i), defs, body)
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })
const P2 = (p) => p.map(f).join(',')
const strokePath = (d, colour, w, cap = 'round', extra = '') => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"${extra}/>`
const ptsD = (g, pts) => `M${pts.map((p) => P2(g.P(p))).join(' L')}`

/**
 * The gloss of cells on a part's body (STYLE.md): the first path filled with the part's gradient gets the face-on tones
 * of `gloss` over it (shade only under 90 px), its gradient ends in the gloss's end tone, and any old highlight goes.
 * The part must be drawn with `glossPal(pal)` and not turned.
 */
const glossPal = (pal) => ({ ...pal, shadow: glossTones(pal).end })
const glossed = (part, pal, px) => {
  if (px < 40) return part
  const m = /<path d="([^"]+)" fill="url\(#[^)]+\)" stroke="[^"]+" stroke-width="([\d.]+)"[^>]*\/>/.exec(part.body)
  if (!m) return part
  const G = gloss({ fills: [pathPoints(m[1])] }, { inset: (+m[2] * strokeScale()) / 2 }), T = glossTones(pal)
  const tones = ['shade', 'shadow', ...(px >= 90 ? ['lit', 'highlight'] : [])].map((k) => (G[k] ? `<path d="${G[k]}" fill="${T[k]}"/>` : '')).join('')
  const body = part.body.replace(/<ellipse[^>]*\/>/g, '').replace(m[0], m[0] + tones)
  return { ...part, body }
}

/** The centre line of the worm part (bend 0): point and direction at t, in g's units. */
const wormLine = ({ x, y, size, turn = 0, amp = 0.1, waves = 1, phase = 0 }) => {
  const A = amp * size, a = (turn * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a)
  const at = (t) => { const u = -size / 2 + size * t, v = A * Math.sin(2 * Math.PI * waves * t + phase); return [x + u * ca - v * sa, y + u * sa + v * ca] }
  const dir = (t) => { const du = size, dv = A * 2 * Math.PI * waves * Math.cos(2 * Math.PI * waves * t + phase); return (Math.atan2(du * sa + dv * ca, du * ca - dv * sa) * 180) / Math.PI }
  return { at, dir }
}

// ---------- the fly (from ../lab/lb12.mjs, without see-through wings) ----------
// A tan-brown body (hue 55) with red eyes (hue 15, 40° from the body). The wings are flat pale greys; where they lie over
// the abdomen the abdomen shows as a paler tan with paler bands, so they read as clear without any opacity.
const FLY = { light: toHex({ l: 0.9, c: 0.04, h: 55 }), base: toHex({ l: 0.74, c: 0.09, h: 55 }), shadow: toHex({ l: 0.67, c: 0.1, h: 55 }), small: toHex({ l: 0.6, c: 0.1, h: 55 }), outline: toHex({ l: 0.38, c: 0.07, h: 55 }) }
const EYE = { light: toHex({ l: 0.8, c: 0.1, h: 15 }), base: toHex({ l: 0.56, c: 0.2, h: 15 }), shadow: toHex({ l: 0.5, c: 0.19, h: 15 }), small: toHex({ l: 0.56, c: 0.2, h: 15 }), outline: toHex({ l: 0.36, c: 0.13, h: 15 }) }
const WING = GLASS.light, WING_LINE = GLASS.outline
/**
 * A fruit fly seen from above, head up before `turn`, `size` its length (g's units) from the head to the wing tips:
 * two large red eyes, a round thorax, a banded abdomen under two clear oval wings folded back over it, six thin legs.
 */
const fly = (g, { x, y, size, turn = 0, id = 'fly' }) => {
  const s0 = size / 24, a = (turn * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a)
  const Q = ([u, v]) => P2(g.P([x + (u * ca - v * sa) * s0, y + (u * sa + v * ca) * s0]))
  const px = size * g.k, w = Math.max(1.6, Math.min(2.8, px / 30)), k = s0 * g.k
  const el = (u, v, rx, ry, r, fill, stroke, sw) => { const [cx, cy] = Q([u, v]).split(','); return `<ellipse cx="${cx}" cy="${cy}" rx="${f(rx * k)}" ry="${f(ry * k)}" transform="rotate(${f(turn + r)} ${cx} ${cy})" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${f(sw)}"` : ''}/>` }
  const legs = [[[-2.6, -4.6], [-4.8, -6.6], [-5.4, -8.6]], [[-3.4, -2.6], [-6, -2.4], [-7, -0.8]], [[-2.8, -1], [-5, 1.4], [-5.4, 3.8]]]
  const legD = [...legs, ...legs.map((l) => l.map(([u, v]) => [-u, v]))].map((l) => `M${l.map(Q).join(' L')}`).join(' ')
  const bands = (colour, sw) => strokePath([[-2.6, 4.6, 2.6], [-2, 6.6, 2]].map(([u0, v, u1]) => `M${Q([u0, v])} L${Q([u1, v])}`).join(' '), colour, sw)
  let s = strokePath(legD, FLY.outline, Math.max(1.4, w * 0.6))
  s += `<g id="${id}-abdomen">${el(0, 3.6, 3, 4.6, 0, FLY.small, FLY.outline, w)}${bands(FLY.outline, Math.max(1.3, 1.1 * k))}</g>`
  // wings: pale ovals from the back of the thorax; the abdomen shows through them as a paler tan, then their outlines
  const wing = (sgn, fill, stroke, sw) => el(sgn * 2.1, 4.6, 2.9, 7.4, sgn * 6, fill, stroke, sw)
  const seen = mixHex(WING, FLY.small, 0.4), seenBands = mixHex(WING, FLY.outline, 0.45)
  s += `<g id="${id}-wings">${wing(-1, WING, '', 0)}${wing(1, WING, '', 0)}${el(0, 3.8, 2.6, 4.2, 0, seen, '', 0)}${bands(seenBands, Math.max(1.2, 1 * k))}`
  s += wing(-1, 'none', WING_LINE, w * 0.8) + wing(1, 'none', WING_LINE, w * 0.8)
  if (px >= 80) s += strokePath([-1, 1].map((sgn) => `M${Q([sgn * 1.4, -1.6])} L${Q([sgn * 2.6, 5])} L${Q([sgn * 2.6, 10.4])}`).join(' '), WING_LINE, Math.max(1, w * 0.45))
  s += '</g>'
  s += `<g id="${id}-thorax">${el(0, -3.4, 3.8, 3.6, 0, FLY.small, FLY.outline, w)}</g>`
  s += `<g id="${id}-head">${el(0, -8.2, 2.7, 2, 0, FLY.small, FLY.outline, w)}</g>`
  s += `<g id="${id}-eyes">${el(-2.2, -8.5, 1.75, 2.1, -15, EYE.base, EYE.outline, w * 0.75)}${el(2.2, -8.5, 1.75, 2.1, 15, EYE.base, EYE.outline, w * 0.75)}</g>`
  return { defs: '', body: `<g id="${id}">${s}</g>`, parts: [['fly', FLY], ['eyes', EYE]] }
}

// dsRNA: the double helix of the DNA part in a magenta red (345): the RNA part's 15° lies only 25° from the worm (40).
const DSRNA = deep(345)

// ---------------------------------------------------------------------------------------------------------------------
// RNAi by feeding: E. coli (HT115) carrying double-stranded RNA, eaten by a worm; dsRNA in its gut, one bacterium at
// its mouth.
// (As SiliCoDraw. The bacteria are the green bacterium part, the dsRNA the double helix of the DNA part in magenta.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.71, [-0.5, 0])
  const W = { x: 7, y: 9, size: 82, amp: 0.1, waves: 0.85, phase: 0.3 }
  const body = worm(g, { ...W, gut: true, id: 'worm' })
  const line = wormLine(W)
  const gutRna = [0.34, 0.5, 0.66].map((t, i) => { const [x, y] = line.at(t); return dna(g, { x, y, size: 11, width: 4.2, turns: 1, turn: line.dir(t), pal: DSRNA, id: `gut-dsRNA${i + 1}` }) })
  const bac = (x, y, t, size, i) => [bacterium(g, { x, y, size, turn: t, flagellum: false, granules: false, id: `bacterium${i}` }), dna(g, { x, y, size: size * 0.62, width: size * 0.22, turns: 2, turn: t, pal: DSRNA, id: `dsRNA${i}` })]
  icon('RNAi by feeding', join(
    ...bac(-30, -26, -18, 30, 1), ...bac(-30, 30, 14, 30, 2), ...bac(4, -32, 8, 30, 3),
    body, ...gutRna,
    ...bac(-41, 6.5, 8, 17, 4)))
}

// ---------------------------------------------------------------------------------------------------------------------
// FUdR sterile cohort: an NGM plate with a bacterial lawn and adult worms only, and a "no" sign over an egg: no progeny.
// (As SiliCoDraw: the plate is the culture plate part with its lawn, the badge the "no" sign; the egg is drawn here.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.85, [0, 0])
  const plate = culturePlate(g, { x: -6, y: -6, size: 86, content: 'lawn', count: 0, id: 'plate' })
  const worms = [[-14, -16, -12, 0], [2, 2, 8, 1.7], [-22, 14, -36, 3]].map(([x, y, t, ph], i) => worm(g, { x, y, size: i === 2 ? 36 : 44, turn: t, phase: ph, amp: 0.08, gut: true, id: `worm${i + 1}` }))
  // the egg: an oval shell in the worm's light tone with a few embryonic cells
  const ex = 30, ey = 30, k = g.k
  const [cx, cy] = g.P([ex, ey])
  const egg = `<g id="egg"><ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(7.2 * k)}" ry="${f(10.4 * k)}" transform="rotate(-25 ${f(cx)} ${f(cy)})" fill="${WORM.light}" stroke="${WORM.outline}" stroke-width="4"/>` +
    [[-1.8, -3, 2.7], [2.2, -1, 2.6], [-1, 2.6, 2.6], [2.4, 4, 2]].map(([u, v, r]) => g.circle(ex + u, ey + v, r, WORM.base, WORM.small, f(Math.max(1.5, 0.9 * k)))).join('') + '</g>'
  const sign = badge(g, { x: ex, y: ey, size: 34, mark: 'no', inside: egg, pal: deep(4), id: 'no-progeny' })
  icon('FUdR sterile cohort', join(plate, ...worms, sign, { defs: '', body: '', parts: [['egg', WORM]] }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Worm thrashing assay: a worm swimming in a drop of M9 buffer seen from above, bent into a C one way, its previous
// bend (the other way) a pale trace behind it, and curved arrows at both sides for the beat.
// (As SiliCoDraw; its faded worm is drawn in flat tones mixed into the water instead of with opacity.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.95, [0, 0]), WATER = LIQUIDS.water, w = 7.5
  const drop = own('drop', g.circle(0, 0, 46, WATER.base, WATER.outline, w) + g.line([[-33, -27], [-26, -34], [-16, -39], [-6, -40.5]], WATER.light, 5), [['water', WATER]])
  // previous bend: the worm part in tones mixed into the water
  const ghostPart = worm(g, { x: 0, y: -22 + 36 * 0.5 + 2, size: 86, bend: 136, turn: 180, id: 'previous-bend' })
  const ghost = { ...ghostPart, body: ghostPart.body.replace(new RegExp(WORM.shadow, 'g'), mixHex(WATER.base, WORM.shadow, 0.4)).replace(new RegExp(WORM.outline, 'g'), mixHex(WATER.base, WORM.outline, 0.35)).replace(new RegExp(WORM.light, 'g'), mixHex(WATER.base, WORM.light, 0.4)), parts: [] }
  const now = worm(g, { x: 0, y: 26 - 36 * 0.5 - 2, size: 86, bend: 136, id: 'worm' })
  const beat = (sx) => ({ ...arrow(g, { points: [[sx * 36, -10], [sx * 42, 2], [sx * 36, 14]], start: 'head', colour: WATER.outline, w: 7, id: sx < 0 ? 'beat-left' : 'beat-right' }), parts: [] })
  icon('Worm thrashing assay', join(drop, ghost, now, beat(-1), beat(1)))
}

// ---------------------------------------------------------------------------------------------------------------------
// Pharyngeal pumping: the head of a worm in close-up, its pharynx inside (procorpus, the metacorpus bulb, the isthmus
// and the terminal bulb with its grinder), the intestine beginning behind it, bacteria entering the mouth, and arcs over
// and under the terminal bulb for the pumping.
// (As SiliCoDraw. Drawn here: no part shows the inside of a worm. Body and pharynx in the worm's palette, the bacteria
// the green bacterium part, the arcs in the accent blue. The body is cut at the right with a wavy line.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.62, [-4.5, 0]), k = g.k, ow = 7, fw = 4
  const bodyD = g.D('M44,-21 L-23,-21 C-35,-21 -45,-11 -45,0 C-45,11 -35,21 -23,21 L44,21 C40,14 48,7 44,0 C40,-7 48,-14 44,-21 Z')
  const body = g.path(bodyD, WORM.shadow, WORM.outline, ow) + g.line([[-30, -14], [-14, -16.5], [6, -16.5]], WORM.light, 5)
  const gut = g.path(g.D('M28,-12 L44,-12 C41,-6 47,-2 44,4 L44,12 L28,12 C23,12 20,7 20,0 C20,-7 23,-12 28,-12 Z'), WORM.small, WORM.outline, fw)
  // pharynx: one outline round the procorpus, the metacorpus, the isthmus and the terminal bulb
  const ph = [g.D('M-44,-4.4 L-20,-4.4 L-20,4.4 L-44,4.4 Z'), g.D(`M-23,0 C-23,-12 -5,-12 -5,0 C-5,12 -23,12 -23,0 Z`), g.D('M-8,-3 L6,-3 L6,3 L-8,3 Z'), g.D('M2,0 C2,-15.5 26,-15.5 26,0 C26,15.5 2,15.5 2,0 Z')]
  const pharynx = g.union(ph, WORM.base, WORM.outline, fw) + g.line([[-44, 0], [13, 0]], WORM.outline, 2.5) +
    g.line([[14, 0], [19.5, 0]], WORM.outline, 4) + g.line([[14, 0], [11, -5]], WORM.outline, 4) + g.line([[14, 0], [11, 5]], WORM.outline, 4)
  const pump = [-1, 1].flatMap((s) => [16, 22].map((r) => strokePath(`M${P2(g.P([14 - r * 0.72, s * r * 0.69]))} A${f(r * k)},${f(r * k)} 0 0 ${s < 0 ? 1 : 0} ${P2(g.P([14 + r * 0.72, s * r * 0.69]))}`, ACCENT.outline, 4.5)))
  const bact = [[-48.5, -12, 30], [-49, 11, -35], [-51, 0, 0], [-31, -0.2, 0]].map(([x, y, t], i) => bacterium(g, { x, y, size: 11, turn: t, flagellum: false, granules: false, id: `bacterium${i + 1}` }))
  icon('Pharyngeal pumping', join(own('body', body, [['worm', WORM]]), own('intestine', gut), own('pharynx', pharynx), ...bact.slice(3), own('pumping', pump.join(''), [['pumping', ACCENT]]), ...bact.slice(0, 3)))
}

// ---------------------------------------------------------------------------------------------------------------------
// Worm paralysis assay: an NGM plate with a bacterial lawn; two paralysed worms lie straight, each having cleared a halo
// of the lawn round its head, and a healthy worm moves on in a sinuous track.
// (As SiliCoDraw: the plate and lawn are the culture plate part, the worms the worm part; halos and track drawn here.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.9, [0, 0])
  const plate = culturePlate(g, { x: 0, y: 0, size: 94, content: 'lawn', count: 0, id: 'plate' })
  const straight = (hx, hy, tx, ty, i) => worm(g, { x: (hx + tx) / 2, y: (hy + ty) / 2, size: Math.hypot(tx - hx, ty - hy) + 2, amp: 0, turn: (Math.atan2(ty - hy, tx - hx) * 180) / Math.PI, gut: true, id: `paralysed${i}` })
  const halos = own('halos', g.circle(-24, -12, 9.5, AGAR.base, LAWN.shadow, 2.5) + g.circle(25, -6, 9.5, AGAR.base, LAWN.shadow, 2.5))
  const track = own('track', g.line(Array.from({ length: 25 }, (_, i) => { const u = i / 24; return [10 + 22 * u, 21 + 4 * Math.sin(2 * Math.PI * 1.3 * u + 2.9)] }), LAWN.outline, 2.5))
  const moving = worm(g, { x: -7, y: 21, size: 36, amp: 0.12, waves: 1.3, gut: true, id: 'moving' })
  icon('Worm paralysis assay', join(plate, halos, track, straight(-25, -11.5, 12, -26, 1), straight(26, -5.5, -9, 6, 2), moving))
}

// ---------------------------------------------------------------------------------------------------------------------
// Worm motility classes: class A moves in sinuous waves, class B moves less, class C lies straight and only twitches its
// head; each row marked with its letter in a round label.
// (As SiliCoDraw, the letters lettered in strokes. The worms are the worm part, all in one colour.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.9, [2, 0]), lab = ACCENT
  const rows = [['A', -30, 0.1, 1.4], ['B', 0, 0.04, 0.8], ['C', 30, 0, 1]]
  const labels = rows.map(([L, y], i) => own(`class-${L}`, g.circle(-39, y, 8, lab.base, lab.outline, 5) + lettering(g, { x: -39, y, h: 8.4, text: L, colour: lab.outline, w: (0.2 * 8.4 * g.k) / strokeScale(), id: `letter-${L}` }).body, i ? [] : [['labels', lab]]))
  const worms = rows.map(([L, y, amp, waves], i) => worm(g, { x: 11, y, size: 68, amp, waves, phase: i === 1 ? 0.6 : 0, gut: true, id: `worm-${L}` }))
  const twitch = own('twitch', strokePath(`${g.D('M-27,22.5 Q-23,19.5 -19,22.5')} ${g.D('M-27,37.5 Q-23,40.5 -19,37.5')}`, lab.outline, 6))
  icon('Worm motility classes', join(...labels, ...worms, twitch))
}

// ---------------------------------------------------------------------------------------------------------------------
// Fly climbing assay (negative geotaxis): two empty vials with a dashed target line; the young flies (left) have climbed
// above it, the old ones (right) stay at the bottom; an arrow up between them.
// (As SiliCoDraw. The vials are the tube part's glass vial with a foam plug; the flies are lb12's, with flat wings.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.9, [0, 0.5])
  const vials = [-27, 27].map((x, i) => tube(g, { x, y: 1, size: 95, kind: 'vial', cap: 'plug', material: 'glass', level: 0, id: `vial${i + 1}` }))
  const target = own('target', [-27, 27].map((x) => strokePath(ptsD(g, [[x - 12, -12], [x + 12, -12]]), GRID, 3.5, 'butt', ' stroke-dasharray="7 5"')).join(''))
  const young = [[-31, -22, -8], [-22, -14, 12], [-31, -1, 4], [-23, 35, -6]], old = [[22, 35, -10], [32, 33, 14], [26, 19, 4], [32, 3, -8]]
  const flies = [...young, ...old].map(([x, y, t], i) => fly(g, { x, y, size: 19, turn: t, id: `fly${i + 1}` }))
  const up = arrow(g, { points: [[0, 32], [0, -32]], colour: INK, w: 7, id: 'climb' })
  icon('Fly climbing assay', join(...vials, target, ...flies, up))
}

// ---------------------------------------------------------------------------------------------------------------------
// Auxin-inducible degradation: a protein of interest with the AID degron tag; auxin (indole-3-acetic acid) over the
// arrow; the protein and its tag broken into fragments.
// (As SiliCoDraw. The proteins are the protein part with the gloss, the protein of interest in the pale blue of the
// shaded surfaces (215) and the tag orange (62), so they stay 36° from nitrogen's blue and oxygen's red; auxin is the
// skeletal formula part. The fragments are drawn here as small flat lumps.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.66, [0.4, -5]), POI = soft(215), TAG = rich(62)
  const poi = glossed(protein(g, { x: -25, y: 2, size: 50, pal: glossPal(POI), id: 'protein' }), POI, 50 * g.k)
  const tag = glossed(protein(g, { x: -2, y: 27, size: 19, pal: glossPal(TAG), id: 'degron' }), TAG, 19 * g.k)
  const linker = own('linker', strokePath(g.D('M-10,16 C-9,20 -8,22 -6,23'), TAG.outline, 5))
  // auxin: the indole ring (benzene fused with a pyrrole, its NH at the bottom) and CH2–COOH at C3
  const m = formula(), B = polygon([0, 0], 6, 90).map((p) => m.at(p)), pt = (i) => m.data.atoms[i]
  m.ring(B, 'aromatic', [1, 3, 5])
  // the five-membered ring shares the bond of B[5] (30°) and B[4] (-30°): C3a, C3, C2, N1, C7a
  const a5 = pt(B[5]), c3 = go(a5, 18), c2 = go(c3, -54), n1 = m.at(go(c2, -126), 'N')
  m.ring([B[5], m.at(c3), m.at(c2), n1, B[4]], 'aromatic', [1])
  const ch2 = go(c3, 90), cc = go(ch2, 30)
  m.chain([m.at(c3), m.at(ch2), m.at(cc)])
  m.bond(m.at(cc), m.at(go(cc, 90), 'O'), 2); m.bond(m.at(cc), m.at(go(cc, -30), 'O'))
  const auxin = skeletal(g, { x: 10, y: -28, size: 38, id: 'auxin', ...m.data })
  const go1 = arrow(g, { points: [[-1, -3], [29, -3]], colour: INK, w: 7, id: 'degradation' })
  const lump = (cx, cy, r, pal, id, seed) => own(id, g.path(smoothD(Array.from({ length: 7 }, (_, i) => { const t = (i / 7) * 2 * Math.PI + seed, q = r * (1 + 0.16 * Math.sin(3 * t + seed * 5)); return g.P([cx + q * Math.cos(t), cy + q * 0.85 * Math.sin(t)]) })), pal.base, pal.outline, 4.5))
  const frags = [lump(38, 9, 5.6, POI, 'fragment1', 0.3), lump(43, -17, 5, POI, 'fragment2', 1.1), lump(41, 29, 5.4, POI, 'fragment3', 2.2), lump(28, 23, 4.2, TAG, 'fragment4', 0.7)]
  const bits = own('amino-acids', [[47.5, 2, 1.9], [33, -14, 1.7], [48, 17, 1.7], [31, 35, 1.5], [35, -26, 1.4]].map(([x, y, r]) => g.circle(x, y, r, POI.small)).join(''))
  icon('Auxin-inducible degradation', join(linker, tag, poi, auxin, go1, ...frags, bits))
}

check()
console.log('written to', OUT)
