// Eight icons of SiliCoDraw's "Anatomy" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), the later drawings that replace the first where there are any, redrawn in the soft look
// of icon-drawings/STYLE.md from the shared parts: Spine, Joint, Skull, Knee joint, Vertebra, Hip fracture, Vertebral
// compression fracture and Foot. Compositions are read by hand from the source in its 100 × 100 box centred on 0,0 and
// scaled onto a 512 page (`page` of ../cellkit.mjs); outlines at 60 % (setStrokeScale), gloss on: bones stay flat, as
// the conventions of parts/anatomy.mjs say, and the foot, a closed body in the skin of a person, is glossed as the outer
// ear of the ear part is.
// Parts used: vertebra (side and top, healthy and wedge), joint (synovial and knee), organW and the
// palettes IVORY, ENAMEL, SKIN of parts/anatomy.mjs; gloss, glossTones, pathPoints (surfaces.mjs) for the foot.
// Drawn here because no part draws them: the skull from the front (cranium, orbits, nasal opening, cheekbones, upper
// and lower jaw with a row of teeth), the proximal femur broken across its neck with the head tipped in its socket (the
// bone part has no femur), and the foot from below (sole with the arch, five toes).
// Lettered: nothing (SiliCoDraw writes no labels on these).
// Usage: node anN.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, glossOn, page, setGloss } from '../cellkit.mjs'
import { toHex, toLch } from '../colour.mjs'
import { f, setStrokeScale, strokeScale } from '../shapes.mjs'
import { ENAMEL, IVORY, SKIN, joint, organW, vertebra } from '../parts/anatomy.mjs'
import { gloss, glossTones, pathPoints } from '../parts/surfaces.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012: bone, enamel) are left out of the hue check, as the conventions of lab.mjs say; a palette
// used by several parts is listed once.
const icon = (name, [k, cx, cy], draw) => {
  const g = page(k, [cx, cy]), { defs, body, parts } = draw(g)
  const seen = parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base) === i)
  kit.cellType(name, seen, defs, body)
}
const join = (...ps) => ({ defs: ps.map((p) => p.defs ?? '').join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts ?? []) })
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })

// ---------- small drawing helpers in g's units ----------
const P2 = (p) => p.map(f).join(',')
const sw = (s, w) => (s ? ` stroke="${s}" stroke-width="${f(w)}" stroke-linejoin="round"` : '')
const fillD = (d, fill, s = '', w = 0) => `<path d="${d}" fill="${fill}"${sw(s, w)}/>`
const strokeD = (d, colour, w, cap = 'round') => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
const lin = (id, [x0, y0, x1, y1], a, b) => `<linearGradient id="${id}" x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`
const boxOf = (d) => { const p = pathPoints(d).flat(), xs = p.map((q) => q[0]), ys = p.map((q) => q[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] }
/** A path in g's units (absolute M, L, C, Q, Z only, numbers in pairs with commas) moved onto the page, turned by
 *  `rot` degrees about `about` first when given. */
const mapD = (g, d, rot = 0, about = [0, 0]) => d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, u, v) => P2(g.P(turnPt([+u, +v], rot, about))))
const turnPt = ([u, v], rot, [a, b]) => { if (!rot) return [u, v]; const R = (rot * Math.PI) / 180, du = u - a, dv = v - b; return [a + du * Math.cos(R) - dv * Math.sin(R), b + du * Math.sin(R) + dv * Math.cos(R)] }
/** An ellipse in g's units as a page path, turned `rot` degrees. */
const ellD = (g, u, v, rx, ry, rot = 0) => {
  const K = 0.5523, q = [[rx, 0], [rx, K * ry], [K * rx, ry], [0, ry], [-K * rx, ry], [-rx, K * ry], [-rx, 0], [-rx, -K * ry], [-K * rx, -ry], [0, -ry], [K * rx, -ry], [rx, -K * ry], [rx, 0]].map(([a, b]) => P2(g.P(turnPt([u + a, v + b], rot, [u, v]))))
  return `M${q[0]} C${q[1]} ${q[2]} ${q[3]} C${q[4]} ${q[5]} ${q[6]} C${q[7]} ${q[8]} ${q[9]} C${q[10]} ${q[11]} ${q[12]} Z`
}
const circleD = (g, x, y, r) => ellD(g, x, y, r, r)
/** Several shapes drawn as one, with one outline round them all (outlines first, twice as wide, then the fills). */
const union = (ds, fill, outline, w) => ds.map((d) => fillD(d, outline, outline, 2 * w)).join('') + ds.map((d) => fillD(d, fill)).join('')
/** A closed body in the gloss of cells (anatomy.mjs's glossBody): gradient to the gloss's end tone, its face-on tones,
 *  `inner`, one outline. */
function glossBody(id, d, pal, w, inner = '') {
  const box = boxOf(d), size = Math.max(box[2] - box[0], box[3] - box[1]), T = glossTones(pal)
  let s = fillD(d, `url(#${id}-gradient)`)
  if (glossOn() && size >= 40) {
    const G = gloss({ fills: [pathPoints(d)] }, { inset: (w * strokeScale()) / 2 })
    s += ['shade', 'shadow', ...(size >= 90 ? ['lit', 'highlight'] : [])].map((k) => (G[k] ? `<path d="${G[k]}" fill="${T[k]}"/>` : '')).join('')
  }
  return { defs: lin(`${id}-gradient`, box, pal.base, glossOn() ? T.end : pal.shadow), body: s + inner + fillD(d, 'none', pal.outline, w) }
}

// ---------- Spine ----------
// The lumbar spine from the side, front to the left: four vertebrae with their discs between them (the vertebra part).
icon('Spine', [4.47, -0.9, 0.3], (g) => vertebra(g, { x: 0, y: 0, size: 96, view: 'side', count: 4 }))

// ---------- Joint ----------
// A synovial joint (the knee cut from the front): femoral condyles and tibial plateau capped with cartilage, the menisci,
// the capsule of synovial fluid and the marrow cavities (the joint part).
icon('Joint', [4.92, 0, 0], (g) => joint(g, { x: 0, y: 0, size: 96, kind: 'synovial' }))

// ---------- Skull ----------
// The skull from the front, flat in the bone's ivory: the cranium with its temples, the orbits and the nasal opening in a
// dark grey of the bone's hue, the upper jaw with a row of teeth (enamel) and the lower jaw behind it. SiliCoDraw's white
// highlight stroke on the brow is left out.
const HOLE = { base: toHex({ l: 0.46, c: 0.011, h: 85 }), outline: toHex({ l: 0.32, c: 0.011, h: 85 }) }
icon('Skull', [4.95, 0, -1.2], (g) => {
  const w = organW(92 * g.k), lw = w * 0.45
  const up = g.smooth([[0, -47], [18, -44], [31, -36], [37, -24], [35.5, -13], [36.5, -3], [33, 5], [26, 10], [21, 17], [12, 23], [0, 24.5], [-12, 23], [-21, 17], [-26, 10], [-33, 5], [-36.5, -3], [-35.5, -13], [-37, -24], [-31, -36], [-18, -44]])
  const jaw = g.smooth([[-27, 4], [-26, 16], [-23, 28], [-16, 38], [-7, 43.5], [0, 44.5], [7, 43.5], [16, 38], [23, 28], [26, 16], [27, 4], [20, 12], [0, 16], [-20, 12]])
  const orb = [[-26, -12], [-22, -18], [-13, -19.5], [-5, -16], [-4, -8], [-7, -2], [-15, 0], [-23, -2], [-27, -6]]
  let s = fillD(jaw, IVORY.base, IVORY.outline, w)
  s += strokeD(mapD(g, 'M-22,22C-20,30 -16,36 -10,40M22,22C20,30 16,36 10,40'), IVORY.shadow, w * 0.9)
  s += fillD(up, IVORY.base, IVORY.outline, w)
  s += strokeD(mapD(g, 'M30,-22C33,-14 33,-6 30,0M-30,-22C-33,-14 -33,-6 -30,0'), IVORY.small, lw)
  // cheekbones under the orbits
  s += strokeD(mapD(g, 'M-29,4C-24,6 -18,6 -13,4M29,4C24,6 18,6 13,4'), IVORY.small, lw)
  s += fillD(g.smooth(orb) + ' ' + g.smooth(orb.map(([x, y]) => [-x, y])), HOLE.base, HOLE.outline, lw)
  s += fillD(mapD(g, 'M0,1C-2.5,5 -7,11 -6.5,15C-6,17.5 -2.5,18 0,16C2.5,18 6,17.5 6.5,15C7,11 2.5,5 0,1Z'), HOLE.base, HOLE.outline, lw)
  s += strokeD(mapD(g, 'M0,7L0,15.5'), IVORY.shadow, lw)
  // the row of teeth: upper and lower, five gaps each
  const [x0, y0] = g.P([-15.5, 19.5]), W = 31 * g.k, H = 15.5 * g.k, R = 4 * g.k
  const rr = `M${f(x0 + R)},${f(y0)} H${f(x0 + W - R)} Q${f(x0 + W)},${f(y0)} ${f(x0 + W)},${f(y0 + R)} V${f(y0 + H - R)} Q${f(x0 + W)},${f(y0 + H)} ${f(x0 + W - R)},${f(y0 + H)} H${f(x0 + R)} Q${f(x0)},${f(y0 + H)} ${f(x0)},${f(y0 + H - R)} V${f(y0 + R)} Q${f(x0)},${f(y0)} ${f(x0 + R)},${f(y0)} Z`
  s += fillD(rr, ENAMEL.base) + strokeD(mapD(g, 'M-15,27.2L15,27.2M-10,20L-10,34.5M-5,20L-5,34.5M0,20L0,34.5M5,20L5,34.5M10,20L10,34.5'), ENAMEL.outline, lw * 0.85) + fillD(rr, 'none', IVORY.outline, w * 0.6)
  return own('skull', s, [['bone', IVORY], ['teeth', ENAMEL], ['openings', HOLE]])
})

// ---------- Knee joint ----------
// The knee from the side, front to the left: femur, tibia and fibula, the patella in its tendon (quadriceps tendon above,
// patellar ligament below), the menisci and the cartilage (the joint part).
icon('Knee joint', [4.81, -2.5, 0], (g) => joint(g, { x: 0, y: 0, size: 96, kind: 'knee' }))

// ---------- Vertebra ----------
// One vertebra from above, front to the bottom: body with its cortical rim and spongy bone, the arch with its
// transverse and spinous processes and facets, the spinal cord in its canal (the vertebra part).
icon('Vertebra', [4.99, 0, -0.3], (g) => vertebra(g, { x: 0, y: 0, size: 96, view: 'top' }))

// ---------- Hip fracture ----------
// The upper end of the femur from the front in its socket: the pelvis round the acetabulum (in the bone's shadow tone,
// as SiliCoDraw shades it), the shaft with the greater trochanter and the stump of the neck, and the head broken off
// across the neck, tipped in the socket. The break is shown by the jagged ends of the two pieces with a gap between
// them (SiliCoDraw draws a red zigzag in the gap; a crack line there would cross nothing); the fovea and the white
// highlight line are left out.
const TIP = 22 // degrees the head is tipped
icon('Hip fracture', [4.64, -9.3, 0.9], (g) => {
  const w = organW(94 * g.k), lw = w * 0.45
  // the rim of the socket: an arc round the head (centre -24, -27) from -40° back over the top to -195°
  const rim = Array.from({ length: 16 }, (_, i) => { const t = ((-40 - (155 * i) / 15) * Math.PI) / 180; return `${f(-24 + 16.6 * Math.cos(t))},${f(-27 + 16.6 * Math.sin(t))}` }).join(' L')
  let s = fillD(mapD(g, `M${rim} L-46,-17C-48,-32 -42,-46 -26,-48L0,-48C6,-47 6,-41 -11.3,-37.7Z`), IVORY.shadow, IVORY.outline, w * 0.9)
  const body = g.smooth([[8, -27], [14, -34], [22, -33], [27, -26], [25, -15], [20, -5], [18, 10], [17, 30], [18, 47], [4, 47], [5, 30], [5, 15], [0, 10], [-3, 4], [2, -1], [4, -8]])
  // the stump of the neck, its broken end jagged
  s += union([body, mapD(g, 'M-4,-30L12,-24L8,-6L-2,-14L-4.5,-18L-2.5,-22L-5,-26Z')], IVORY.base, IVORY.outline, w)
  s += strokeD(mapD(g, 'M15,-28C11,-18 10,-8 11,2M21,-27C18,-18 16,-8 15,0'), IVORY.small, lw)
  // the head with what is left of the neck on it, its broken end jagged, tipped down in the socket
  s += union([circleD(g, -24, -27, 12.5), mapD(g, 'M-24,-38L-11,-35L-8.5,-31L-11,-27L-8,-23L-10,-19L-24,-16Z', -TIP, [-24, -27])], IVORY.base, IVORY.outline, w)
  return own('hip', s, [['bone', IVORY]])
})

// ---------- Vertebral compression fracture ----------
// Three vertebrae from the side, the middle body crushed to a wedge (front height lost) with a crack (the vertebra
// part's 'wedge'). SiliCoDraw also tips the vertebra above forward onto the wedge; the part keeps the stack upright.
icon('Vertebral compression fracture', [4.8, -0.9, 0], (g) => vertebra(g, { x: 0, y: 0, size: 96, view: 'side', count: 3, state: 'wedge' }))

// ---------- Foot ----------
// A right foot from below in the skin of a person, glossed as a closed body: the sole with the hollow of the arch in a
// deeper tone and the creases at the base of the toes, five toes graded in size. SiliCoDraw's pale pads and toe
// highlights are left out (the gloss gives the light).
icon('Foot', [4.7, 0.7, -1.4], (g) => {
  const P = SKIN, w = organW(94 * g.k), lw = w * 0.45
  const toes = [[-16, -39, 7.5, 9.5, -8], [-3, -43, 5.2, 6.8, 0], [7, -41, 4.6, 6, 8], [15.5, -37, 4.1, 5.2, 16], [22, -30, 3.6, 4.5, 26]]
  let defs = '', s = ''
  toes.forEach(([x, y, rx, ry, r], i) => { const b = glossBody(`foot-toe${i + 1}`, ellD(g, x, y, rx, ry, r), P, w * 0.85); defs += b.defs; s += b.body })
  const sole = g.smooth([[-24, -26], [-23, -14], [-17, -2], [-11, 10], [-13, 22], [-15, 33], [-10, 43], [0, 47], [10, 43], [15, 33], [15, 20], [17, 6], [21, -8], [23, -20], [19, -29], [6, -31], [-8, -31], [-19, -31]])
  const inner = fillD(mapD(g, 'M-22,-14C-17,-2 -11,8 -11,14C-11,22 -13,26 -14,30C-10,26 -5,18 -5,8C-5,-2 -12,-10 -22,-14Z'), P.shadow) + strokeD(mapD(g, 'M-20,-31C-14,-33 -10,-33 -6,-32M-4,-33C2,-35 10,-33 16,-30'), P.small, lw)
  const b = glossBody('foot-sole', sole, P, w, inner)
  return own('foot', s + b.body, [['skin', P]], defs + b.defs)
})

check()
console.log('written')
