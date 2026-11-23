// Eight icons of SiliCoDraw's "Anatomy" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), the later drawings that replace the first, redrawn in the soft look of
// icon-drawings/STYLE.md from the shared parts: Burn, Acne, Hair loss, Sweat gland, Skin ageing, Hair greying, Bone and
// Rib cage. Compositions are read by hand from the source in its 100 × 100 box centred on 0,0 and scaled onto a 512 page
// (`page` of ../cellkit.mjs); outlines at 60 % (setStrokeScale), gloss on (nothing here is a closed organ: skin blocks
// and bones stay flat, as the conventions of parts/anatomy.mjs say).
// Parts used: skin, bone, flame and the palettes of parts/anatomy.mjs; LIQUIDS.water (lab.mjs) for blister fluid.
// Drawn here because no part draws them: the blister and the charred eschar of a burn, the plugged follicle and pustule
// of acne, a shed club hair, drops of sweat, the pigmented tip of a hair that grows out grey, and the rib cage (sternum,
// seven pairs of ribs with their costal cartilages, clavicles) in the bone's ivory and the cartilage's pale blue.
// The skin part draws its blocks in the same units as SiliCoDraw's (94 wide, the surface at -4): with size 94 and depth
// 48 placed at y 20, its own frame is the source's, so what is added is written in the source's numbers.
// Lettered: nothing.
// Usage: node anM.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss } from '../cellkit.mjs'
import { toHex, toLch } from '../colour.mjs'
import { f, setStrokeScale, strokeScale } from '../shapes.mjs'
import { CARTILAGE, DERMIS, EPIDERMIS, HAIR, IVORY, SEBUM, SWEAT, bone, flame, organW, skin } from '../parts/anatomy.mjs'
import { LIQUIDS } from '../parts/lab.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012: bone, hair, char) are left out of the hue check, as the conventions of lab.mjs say; a
// palette used by several parts is listed once.
const icon = (name, [k, cx, cy], draw) => {
  const g = page(k, [cx, cy]), { defs, body, parts } = draw(g)
  const seen = parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base) === i)
  kit.cellType(name, seen, defs, body)
}
const join = (...ps) => ({ defs: ps.map((p) => p.defs ?? '').join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts ?? []) })
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })

// ---------- small drawing helpers in g's units ----------
const P2 = (p) => p.map(f).join(',')
const strokeD = (d, colour, w, cap = 'round', extra = '') => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"${extra}/>`
const fillD = (d, fill, s = '', w = 0) => `<path d="${d}" fill="${fill}"${s ? ` stroke="${s}" stroke-width="${f(w)}" stroke-linejoin="round"` : ''}/>`
/** An open smooth curve through points (Catmull–Rom as cubic Béziers), in g's units. */
const curve = (g, pts) => {
  const p = pts.map(g.P), n = p.length
  let d = `M${P2(p[0])}`
  for (let i = 0; i < n - 1; i++) {
    const a = p[Math.max(0, i - 1)], b = p[i], c = p[i + 1], e = p[Math.min(n - 1, i + 2)]
    d += `C${f(b[0] + (c[0] - a[0]) / 6)},${f(b[1] + (c[1] - a[1]) / 6)} ${f(c[0] - (e[0] - b[0]) / 6)},${f(c[1] - (e[1] - b[1]) / 6)} ${P2(c)}`
  }
  return d
}
const rrect = (g, x0, y0, x1, y1, r) => {
  const [a, b] = g.P([x0, y0]), W = (x1 - x0) * g.k, H = (y1 - y0) * g.k, R = Math.min(r * g.k, W / 2, H / 2)
  return `M${f(a + R)},${f(b)} H${f(a + W - R)} A${f(R)},${f(R)} 0 0 1 ${f(a + W)},${f(b + R)} V${f(b + H - R)} A${f(R)},${f(R)} 0 0 1 ${f(a + W - R)},${f(b + H)} H${f(a + R)} A${f(R)},${f(R)} 0 0 1 ${f(a)},${f(b + H - R)} V${f(b + R)} A${f(R)},${f(R)} 0 0 1 ${f(a + R)},${f(b)} Z`
}
/** A tube along points: an outline round a fill, `width` its visible width in g's units (strokes are thinned by
 *  setStrokeScale, so the width is given back). */
const tubeD = (g, d, width, fill, outline, w) => { const W = (width * g.k) / strokeScale(); return strokeD(d, outline, W + 2 * w) + strokeD(d, fill, W) }
/** A drop hanging from x, y (its tip), `h` tall. */
const dropD = (g, x, y, h) => {
  const r = h * 0.36, cy = y + h - r, k = 0.5523
  const pts = [[x, y], [x + r * 0.55, y + h * 0.3], [x + r, cy - r * 0.15], [x + r, cy], [x, cy + r], [x - r, cy], [x - r, cy - r * 0.15], [x - r * 0.55, y + h * 0.3]]
  const [A, B, Cc, D, E, F2, G, H] = pts.map(g.P)
  return `M${P2(A)} C${P2(B)} ${P2(Cc)} ${P2(D)} C${P2(g.P([x + r, cy + r * k]))} ${P2(g.P([x + r * k, cy + r]))} ${P2(E)} C${P2(g.P([x - r * k, cy + r]))} ${P2(g.P([x - r, cy + r * k]))} ${P2(F2)} C${P2(G)} ${P2(H)} ${P2(A)} Z`
}
const circleD = (g, x, y, r) => { const [cx, cy] = g.P([x, y]), R = r * g.k; return `M${f(cx - R)},${f(cy)} A${f(R)},${f(R)} 0 1 0 ${f(cx + R)},${f(cy)} A${f(R)},${f(R)} 0 1 0 ${f(cx - R)},${f(cy)} Z` }
/** The skin part placed so that its frame is SiliCoDraw's skin block (size 94, depth 48: surface at -4, bottom at 44). */
const block = (g, o = {}) => skinBlock(g, { x: 0, y: 20, size: 94, ...o })
/**
 * The skin part with the dermis filled under it. The part fills its dermis with two outlines in one path whose windings
 * cancel where they overlap (from the rete ridges down to 12 units below the surface), so that band shows white (it does
 * in the parts sheet too); a rectangle of the dermis's base laid under the part fills it. Reported for the part.
 */
const skinBlock = (g, o) => {
  const depth = o.depth ?? 48, sc = o.size / 94, Y = (v) => o.y + (v + 4 - depth / 2) * sc
  const under = fillD(`M${P2(g.P([o.x - 46.5 * sc, Y(-4)]))} L${P2(g.P([o.x + 46.5 * sc, Y(-4)]))} L${P2(g.P([o.x + 46.5 * sc, Y(16)]))} L${P2(g.P([o.x - 46.5 * sc, Y(16)]))} Z`, DERMIS.base)
  return join(own(`${o.id ?? 'skin'}-dermis-under`, under), skin(g, o))
}
const J = (u) => 6 + 2.2 * Math.sin((u * Math.PI) / 6) // the dermo-epidermal junction of the healthy block
/** The local frame of a skin part placed with options o: local u, v to g's units. */
const skinFrame = (o) => { const depth = o.depth ?? 48, sc = o.size / 94; return ([u, v]) => [o.x + u * sc, o.y + (v + 4 - depth / 2) * sc] }
/** The points of a hair as the skin part lays them out (follicle at u0 on a flat surface, tilt, length; local units). */
const hairPts = (o, { x: u0, tilt = 0, length = 24 }) => {
  const depth = o.depth ?? 48, v0 = -4, L = (-4 + depth - 14) - 2 - v0, R = (tilt * Math.PI) / 180, dir = [Math.sin(R), Math.cos(R)]
  const P = (t) => [u0 + dir[0] * t * L, v0 + dir[1] * t * L]
  return [P(0.9), P(0.3), P(0), [u0 + dir[0] * -0.3 * length - 2, v0 - 0.45 * length], [u0 + dir[0] * -0.6 * length + 2, v0 - length]]
}

// ---------- Burn ----------
// A burn of the skin: on the left a blister (the epidermis lifted as a dome over clear fluid) over a deeper-red damaged
// dermis, on the right a charred eschar through epidermis and dermis (full thickness: dark, cracked), and the flame part
// above it. The char is a dark warm grey, outside the hue check; the flame keeps its own orange (35°, 17° from the
// epidermis: the module's FLAME and EPIDERMIS lie that close).
const CHAR = { base: toHex({ l: 0.36, c: 0.011, h: 50 }), light: toHex({ l: 0.55, c: 0.011, h: 50 }), outline: toHex({ l: 0.22, c: 0.01, h: 50 }) }
const FLUID = LIQUIDS.water // clear fluid: the water of lab.mjs (plasma's yellow would sit 4° from the fat)
icon('Burn', [4.85, 0, 2.5], (g) => {
  const sk = block(g), w = organW(94 * g.k)
  let s = fillD(g.smooth([[-34, 9.5], [-20, 8.5], [-4, 9.5], [12, 12], [10, 20], [-6, 23], [-24, 22], [-34, 16]]), DERMIS.shadow, DERMIS.small, w * 0.35)
  // the eschar, kept inside the block's outline
  const es = `M${P2(g.P([18.5, -3.3]))} L${P2(g.P([45.6, -3.3]))} L${P2(g.P([45.6, 16]))} C${P2(g.P([38, 20]))} ${P2(g.P([28, 20]))} ${P2(g.P([20.5, 16]))} C${P2(g.P([18.6, 10]))} ${P2(g.P([18.5, 3]))} ${P2(g.P([18.5, -3.3]))} Z`
  s += fillD(es, CHAR.base, CHAR.outline, w * 0.5) + strokeD(curve(g, [[24, 0], [28, 5], [26, 10]]) + ' ' + curve(g, [[34, -1.5], [33, 4], [38, 8]]) + ' ' + curve(g, [[42.5, 3], [40, 12]]), CHAR.light, w * 0.4)
  // the blister: fluid under the lifted epidermis
  let b = fillD(`M${P2(g.P([-34, 0]))} C${P2(g.P([-32, -14]))} ${P2(g.P([10, -14]))} ${P2(g.P([12, 0]))} C${P2(g.P([10, 6]))} ${P2(g.P([-32, 6]))} ${P2(g.P([-34, 0]))} Z`, FLUID.base, FLUID.outline, w * 0.4)
  const roofOut = `M${P2(g.P([-38.5, -4]))} C${P2(g.P([-36.5, -22.5]))} ${P2(g.P([14.5, -22.5]))} ${P2(g.P([16.5, -4]))}`, roofIn = `M${P2(g.P([-34, -1]))} C${P2(g.P([-32, -15]))} ${P2(g.P([10, -15]))} ${P2(g.P([12, -1]))}`
  b += fillD(`${roofOut} L${P2(g.P([12, -1]))} C${P2(g.P([10, -15]))} ${P2(g.P([-32, -15]))} ${P2(g.P([-34, -1]))} Z`, EPIDERMIS.base)
  b += strokeD(roofIn, EPIDERMIS.small, w * 0.45) + strokeD(roofOut, DERMIS.outline, w)
  const fl = flame(g, { x: 31, y: -22.5, size: 32, id: 'flame' })
  return join(sk, own('burn', s, [['eschar', CHAR]]), own('blister', b, [['blister fluid', FLUID]]), fl)
})

// ---------- Acne ----------
// An inflamed spot: a hair follicle (the skin part's, with its sebaceous gland and only a vellus hair's room) plugged
// with sebum and keratin from its mouth down to the gland, raised at the surface into a red papule with a head of pus.
// SiliCoDraw's red halo in the dermis is left out (it would have to lie under the follicle the part draws); the redness
// is the papule's, a deeper tone of the dermis.
const PUS = { base: toHex({ l: 0.96, c: 0.011, h: 90 }), outline: toHex({ l: 0.62, c: 0.011, h: 90 }) } // creamy white, outside the hue check (a yellow would sit by the fat)
icon('Acne', [4.85, 0, 11.6], (g) => {
  const o = { x: 0, y: 20, size: 94 }, sk = block(g, { follicles: [{ x: 0, tilt: 0, hair: 'none', gland: true }] }), w = organW(94 * g.k)
  let s = fillD(g.smooth([[-2.4, -3], [2.4, -3], [2.6, 6], [2.2, 14], [0, 16.5], [-2.2, 14], [-2.6, 6]]), SEBUM.base, SEBUM.outline, w * 0.4)
  s += strokeD(`M${P2(g.P([-1.2, 1]))} L${P2(g.P([0.8, -0.5]))} M${P2(g.P([-0.8, 7]))} L${P2(g.P([1.2, 5.5]))} M${P2(g.P([-1, 12]))} L${P2(g.P([1, 10.8]))}`, SEBUM.outline, w * 0.35)
  const dome = `M${P2(g.P([-18, -4]))} C${P2(g.P([-12, -4]))} ${P2(g.P([-12, -21]))} ${P2(g.P([0, -21]))} C${P2(g.P([12, -21]))} ${P2(g.P([12, -4]))} ${P2(g.P([18, -4]))}`
  s += fillD(dome + ' Z', DERMIS.small) + strokeD(dome, DERMIS.outline, w)
  s += fillD(`M${P2(g.P([-6.5, -11]))} C${P2(g.P([-6.5, -19.5]))} ${P2(g.P([6.5, -19.5]))} ${P2(g.P([6.5, -11]))} C${P2(g.P([4, -8.6]))} ${P2(g.P([-4, -8.6]))} ${P2(g.P([-6.5, -11]))} Z`, PUS.base, PUS.outline, w * 0.45)
  s += fillD(`M${P2(g.P([-2.2, -3.6]))} L${P2(g.P([2.2, -3.6]))} L${P2(g.P([2.2, -9.4]))} L${P2(g.P([-2.2, -9.4]))} Z`, SEBUM.base)
  return join(sk, own('papule', s, [['sebum', SEBUM], ['pus', { base: PUS.base }]]))
})

// ---------- Hair loss ----------
// Follicles from terminal (left) to miniaturised and empty (right): two terminal hairs with their glands, two thin vellus
// hairs, an empty follicle, and a shed club hair above (drawn here: a hair with its keratinised club). The follicles of
// the part keep one depth; miniaturised ones are only narrower.
icon('Hair loss', [4.85, 0, -0.4], (g) => {
  const sk = block(g, { follicles: [{ x: -34, length: 40 }, { x: -17, length: 37 }, { x: 0, hair: 'thin', length: 24, gland: false }, { x: 17, hair: 'thin', length: 13, gland: false }, { x: 34, hair: 'none', gland: false }] })
  const w = organW(94 * g.k)
  const d = curve(g, [[26.5, -23.5], [31, -30], [36, -35.5], [42.5, -41.5]])
  let c = tubeD(g, d, 2, HAIR.dark.base, HAIR.dark.outline, w * 0.27)
  c += fillD(`M${P2(g.P([25, -25]))} C${P2(g.P([27.6, -25.2]))} ${P2(g.P([28, -21]))} ${P2(g.P([25.4, -18.6]))} C${P2(g.P([23, -17.6]))} ${P2(g.P([21.4, -19.6]))} ${P2(g.P([22.4, -22.4]))} C${P2(g.P([23, -24]))} ${P2(g.P([24, -24.9]))} ${P2(g.P([25, -25]))} Z`, EPIDERMIS.small, EPIDERMIS.outline, w * 0.35)
  return join(sk, own('shed-club-hair', c))
})

// ---------- Sweat gland ----------
// An eccrine sweat gland coiled deep in the dermis, its duct rising to a pore (the skin part), a bead of sweat at the
// pore and drops of sweat above it (drawn here, in the sweat gland's blue).
icon('Sweat gland', [4.85, 0, -0.8], (g) => {
  const sk = block(g, { sweat: [0] }), w = organW(94 * g.k)
  let s = fillD(`M${P2(g.P([-3.8, -3.6]))} C${P2(g.P([-3.8, -8.5]))} ${P2(g.P([-1.2, -11]))} ${P2(g.P([0, -13.5]))} C${P2(g.P([1.2, -11]))} ${P2(g.P([3.8, -8.5]))} ${P2(g.P([3.8, -3.6]))} Z`, SWEAT.base, SWEAT.outline, w * 0.45)
  s += [[-17, -37, 13], [15, -44, 13], [-1, -46, 10.5]].map(([x, y, h]) => fillD(dropD(g, x, y, h), SWEAT.base, SWEAT.outline, w * 0.55)).join('')
  return join(sk, own('sweat', s))
})

// ---------- Skin ageing ----------
// Aged skin in section (the skin part's 'aged'): a thin, flat epidermis, wrinkles at the surface and broken, sparse
// collagen in the dermis.
icon('Skin ageing', [4.85, 0, 26], (g) => block(g, { state: 'aged', depth: 60, y: 26 }))

// ---------- Hair greying ----------
// Two hair follicles: the left grows its hair grey near the root (the melanocytes of its bulb are gone), the old
// pigmented part still at the tip; the right still grows a dark hair. The skin part draws the follicles and hairs; the
// dark tip of the grey hair is drawn over it along the same curve (the part has one colour per hair).
icon('Hair greying', [4.85, 0, 1], (g) => {
  const o = { x: 0, y: 20, size: 94 }, grey = { x: 2, tilt: 9, hair: 'grey', length: 38 }
  const sk = block(g, { follicles: [grey, { x: 32, tilt: 4, gland: false, length: 28 }] })
  const w = organW(94 * g.k), lw = w * 0.45
  const [, , p0, A, B] = hairPts(o, grey), mid = [A[0] + (B[0] - A[0]) * 0.12, A[1] + (B[1] - A[1]) * 0.12]
  // the part's curve from A to B (Catmull–Rom through P(0), A, B), from a little past A
  const T = [(B[0] - p0[0]) / 6, (B[1] - p0[1]) / 6], E = [(B[0] - A[0]) / 6, (B[1] - A[1]) / 6]
  const seg = (t) => { const a = A, b = [A[0] + T[0], A[1] + T[1]], c = [B[0] - E[0], B[1] - E[1]], d = B, u = 1 - t; return [0, 1].map((k) => u * u * u * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * d[k]) }
  const pts = [0.18, 0.4, 0.6, 0.8, 1].map(seg)
  const d = curve(g, pts)
  const tip = tubeD(g, d, 2.2, HAIR.dark.base, HAIR.dark.outline, lw * 0.6)
  return join(sk, own('pigmented-tip', tip))
})

// ---------- Bone ----------
// A long bone from outside, turned as SiliCoDraw turns it (the bone part).
icon('Bone', [4.82, 0, 0], (g) => bone(g, { x: 0, y: 0, size: 101, turn: -40 }))

// ---------- Rib cage ----------
// The rib cage from the front: the sternum, seven pairs of ribs curving round from their costal cartilages (pale blue,
// the cartilage of the conventions; the lowest two share one cartilage down to the sternum's foot) and the two
// clavicles. Bone ivory, flat, each rib an outlined tube; lower ribs drawn over the ones above, the sternum over all.
icon('Rib cage', [4.85, 0, 2.6], (g) => {
  const w = organW(100 * g.k), tw = w * 0.55
  const W = [27, 33, 37, 40, 42, 43, 43], Y = [-34, -25, -16, -7, 2, 11, 20].map((y) => y + 4)
  let s = ''
  W.forEach((wd, i) => {
    const y = Y[i], y0 = Math.min(y, i > 5 ? 18 : y)
    let ca = '', bo = ''
    for (const k of [1, -1]) {
      const X = (u, v) => P2(g.P([k * u, v]))
      ca += `M${X(5, y0)} C${X(10, y0 + (y + 1.5 - y0) * 0.4 + 1.5)} ${X(14, y + 2)} ${X(18, y + 1.5)} `
      bo += `M${X(18, y + 1.5)} C${X(26, y - 1)} ${X(wd - 6, y - 5)} ${X(wd, y + 3)} C${X(wd + 1.5, y + 8)} ${X(wd, y + 13)} ${X(wd - 3, y + 17)} `
    }
    s += tubeD(g, ca, 3.6, CARTILAGE.base, CARTILAGE.outline, tw) + tubeD(g, bo, 4.4, IVORY.base, IVORY.outline, tw)
  })
  const cl = `M${P2(g.P([6, -37]))} C${P2(g.P([14, -41]))} ${P2(g.P([22, -40]))} ${P2(g.P([30, -37]))} C${P2(g.P([35, -35]))} ${P2(g.P([40, -37]))} ${P2(g.P([44, -40]))} M${P2(g.P([-6, -37]))} C${P2(g.P([-14, -41]))} ${P2(g.P([-22, -40]))} ${P2(g.P([-30, -37]))} C${P2(g.P([-35, -35]))} ${P2(g.P([-40, -37]))} ${P2(g.P([-44, -40]))}`
  s += tubeD(g, cl, 5, IVORY.base, IVORY.outline, tw)
  const st = g.smooth([[0, -41], [7, -39], [8.5, -33], [5.5, -27], [6, -18], [6.5, -2], [6, 8], [4, 14], [1.5, 20], [0, 23], [-1.5, 20], [-4, 14], [-6, 8], [-6.5, -2], [-6, -18], [-5.5, -27], [-8.5, -33], [-7, -39]])
  s += fillD(st, IVORY.base, IVORY.outline, w * 0.75)
  s += strokeD(`M${P2(g.P([-4.5, -27]))} L${P2(g.P([4.5, -27]))} M${P2(g.P([-3.5, 14]))} L${P2(g.P([3.5, 14]))}`, IVORY.small, w * 0.4)
  return own('rib-cage', s, [['bone', IVORY], ['cartilage', CARTILAGE]])
})

check()
console.log('written')
