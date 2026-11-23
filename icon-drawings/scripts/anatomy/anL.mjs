// Eight icons of SiliCoDraw's "Anatomy" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), the later drawings that replace the first, redrawn in the soft look of
// icon-drawings/STYLE.md from the shared parts: Gingivitis, Root canal, Skin, Skin and hair follicle, Wound, Scar,
// Melanoma and Psoriasis. Compositions are read by hand from the source in its 100 × 100 box centred on 0,0 and scaled
// onto a 512 page (`page` of ../cellkit.mjs); outlines at 60 % (setStrokeScale), gloss on (nothing here is a closed
// organ: teeth, gum and skin blocks stay flat, as the conventions of parts/anatomy.mjs say).
// Parts used: tooth, skin, and the palettes of parts/anatomy.mjs; METAL, ACCENT, objW (lab.mjs).
// Drawn here because no part draws them: the scalloped gum of an upper jaw (its inflamed margin), a blood drop, the access
// cavity and an endodontic file of a root canal, the arrector pili muscle, the raised ridge of a scar, the lesion of a
// melanoma (its nest in the dermis, its raised top and the melanocytes along the basal layer), the dilated capillaries in
// the papillae of psoriasis. The skin part draws its blocks in the same units as SiliCoDraw's (94 wide, the surface at
// -4): with size 94 and depth 48 placed at y 20, its own frame is the source's, so what is added is written in the
// source's numbers.
// Lettered: nothing.
// Usage: node anL.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss } from '../cellkit.mjs'
import { toHex, toLch } from '../colour.mjs'
import { f, setStrokeScale, strokeScale } from '../shapes.mjs'
import { ARTERY, CLOT, DERMIS, EPIDERMIS, GUM, MUSCLE, PULP, organW, skin, tooth } from '../parts/anatomy.mjs'
import { ACCENT, METAL, objW } from '../parts/lab.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012: bone, metal, hair) are left out of the hue check, as the conventions of lab.mjs say; a
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

// ---------- Gingivitis ----------
// Four upper front teeth hanging from the gum, plaque at their necks (the tooth part's 'plaque', turned 180° so the
// crowns point down), and over them the gum, drawn here: scalloped round each neck with papillae between the teeth, its
// margin swollen and red (a deeper tone of the gum, as the conventions ask for a diseased part), bleeding at the
// papillae. The blood is the gum's own outline tone (a second red would sit 5° from the gum's hue).
icon('Gingivitis', [4.79, 0, 8], (g) => {
  const s = 0.68, y0 = 42 - 40 * s, xs = [-33, -11, 11, 33]
  const teeth = xs.map((x, i) => tooth(g, { x, y: y0, size: 92 * s, kind: 'incisor', state: 'plaque', turn: 180, id: `tooth${i + 1}` }))
  const w = organW(96 * g.k) * 0.8
  // the margin: an arc over each neck, a papilla pointing down between the teeth
  const top = y0 - 15.5 * s, pap = y0 - 2.5 * s
  const margin = (dy) => {
    let d = `M${P2(g.P([-48, 6 + dy]))}`
    const stops = [[-48, 6], ...xs.flatMap((x, i) => [[x, top], [x + 11, i === 3 ? 8 : pap]]), [48, 6]]
    for (let i = 0; i < stops.length - 1; i++) {
      const [x0, y1] = stops[i], [x1, y2] = stops[i + 1], up = y2 < y1
      const c1 = up ? [x0 + 2.5, y1 - 7] : [x0 + 6, y1], c2 = up ? [x1 - 6, y2] : [x1 - 2.5, y2 - 7]
      d += ` C${P2(g.P([c1[0], c1[1] + dy]))} ${P2(g.P([c2[0], c2[1] + dy]))} ${P2(g.P([x1, y2 + dy]))}`
    }
    return d
  }
  const cap = () => ` L${P2(g.P([48, -22]))} Q${P2(g.P([48, -26]))} ${P2(g.P([44, -26]))} L${P2(g.P([-44, -26]))} Q${P2(g.P([-48, -26]))} ${P2(g.P([-48, -22]))} Z`
  let gum = fillD(margin(0) + cap(), GUM.small) + fillD(margin(-8) + cap(), GUM.base)
  gum += strokeD(margin(-8), GUM.small, w * 0.5)
  gum += fillD(margin(0) + cap(), 'none', GUM.outline, w)
  const BLOOD = toHex({ l: 0.42, c: 0.11, h: 10 })
  let blood = fillD(dropD(g, 0, pap - 1.5, 11), GUM.outline, BLOOD, w * 0.5)
  blood += fillD(circleD(g, -22, pap + 0.6, 2.2) + ' ' + circleD(g, 22, pap + 0.6, 2.2), GUM.outline, BLOOD, w * 0.4)
  return join(...teeth, own('gum', gum, [['gum', GUM]]), own('blood', blood))
})

// ---------- Root canal ----------
// A molar cut lengthwise (the tooth part, placed as SiliCoDraw places it: 0.88 of its size, moved 3, 5), its pulp
// inflamed (the part's pulp in a deeper tone of the pulp), the access cavity opened through the crown, and an
// endodontic file (a steel shaft twisted along its length, a blue plastic handle: the conventions of lab.mjs) run down
// the canal of the left root.
icon('Root canal', [4.9, 3, -3], (g) => {
  const T = (u, v) => [3 + 0.88 * u, 5 + 0.88 * v]
  const t = tooth(g, { x: 3, y: 5, size: 0.88 * 92, kind: 'molar', id: 'molar' })
  t.body = t.body.split(`fill="${PULP.light}"`).join(`fill="${PULP.shadow}"`)
  const w = organW(0.88 * 92 * g.k)
  // the access cavity through enamel and dentine into the pulp chamber
  const cav = (x0, y0, x1, y1) => { const [a, b] = T(x0, y0), [c, d] = T(x1, y1); return `M${P2(g.P([a, b]))} L${P2(g.P([c, b]))} L${P2(g.P([c, d]))} L${P2(g.P([a, d]))} Z` }
  let access = fillD(cav(-4.6, -41.5, 4.6, -22), PULP.shadow)
  access += strokeD(`M${P2(g.P(T(-4.6, -41)))} L${P2(g.P(T(-4.6, -30)))} M${P2(g.P(T(4.6, -41)))} L${P2(g.P(T(4.6, -30)))}`, PULP.outline, w * 0.45, 'butt')
  // the file: a shaft along the canal, the twists of its flutes, the handle
  const S1 = [[3, -40], [3, -30], [3, -16], [-4, -6], [-4.2, 6]], S2 = [[-4.2, 6], [-4.5, 18], [-5.1, 30], [-5.4, 37]]
  const shaft = `M${P2(g.P(S1[0]))} L${P2(g.P(S1[1]))} C${P2(g.P(S1[2]))} ${P2(g.P(S1[3]))} ${P2(g.P(S1[4]))} C${P2(g.P(S2[1]))} ${P2(g.P(S2[2]))} ${P2(g.P(S2[3]))}`
  const ow = objW(30 * g.k)
  let file = tubeD(g, shaft, 2, METAL.base, METAL.outline, ow * 0.6)
  const bez = (Q, t) => { const u = 1 - t; return [0, 1].map((k) => u * u * u * Q[0][k] + 3 * u * u * t * Q[1][k] + 3 * u * t * t * Q[2][k] + t * t * t * Q[3][k]) }
  const tw = [[S1.slice(1), [0.55, 0.72, 0.9]], [S2, [0.1, 0.27, 0.44, 0.61, 0.78]]].flatMap(([Q, ts]) => ts.map((tt) => { const [x, y] = bez(Q, tt), [x2, y2] = bez(Q, tt + 0.02), l = Math.hypot(x2 - x, y2 - y), tx = (x2 - x) / l, ty = (y2 - y) / l; return `M${P2(g.P([x + ty * 1.4 - tx * 0.8, y - tx * 1.4 - ty * 0.8]))} L${P2(g.P([x - ty * 1.4 + tx * 0.8, y + tx * 1.4 + ty * 0.8]))}` }))
  file += strokeD(tw.join(' '), METAL.outline, ow * 0.5)
  file += fillD(rrect(g, -3.5, -50.5, 9.5, -39, 2.6), ACCENT.base, ACCENT.outline, ow)
  file += strokeD([-0.5, 3, 6.5].map((x) => `M${P2(g.P([x, -47.5]))} L${P2(g.P([x, -42]))}`).join(' '), ACCENT.outline, ow * 0.6)
  return join(t, own('access-cavity', access), own('endodontic-file', file, [['file handle', ACCENT], ['file', METAL]]))
})

// ---------- Skin ----------
// Skin in section as SiliCoDraw draws it: epidermis, dermis and fat, two hair follicles with their hairs (the left with
// its sebaceous gland), a coiled sweat gland between them and a capillary loop (artery red to vein blue). Wholly the part.
icon('Skin', [5.15, 0, -15.3], (g) => {
  const s = 88 / 94
  return skinBlock(g, { x: 0, y: 0, size: 88, depth: 52, vessels: true, follicles: [{ x: -25, tilt: 12, length: 30 / s }], sweat: [14] }) // one hair since the review of 23 November 2026 (two made it a twin of Hair greying)
})

// ---------- Skin and hair follicle ----------
// One hair follicle, large, slanting as SiliCoDraw slants it (bulb low on the left, the hair rising to the right), its
// sebaceous gland and, drawn here, the arrector pili muscle from the follicle below the gland up to the papillary dermis,
// both on the side of the obtuse angle where they belong. Collagen in the dermis.
icon('Skin and hair follicle', [4.95, 0, -12.5], (g) => {
  const size = 92, depth = 62, sc = size / 94, oy = 4 - depth / 2
  const L2G = ([u, v]) => [u * sc, (v + oy) * sc]
  const sk = skinBlock(g, { x: 0, y: 0, size, depth, follicles: [{ x: 4, tilt: -14, length: 26 }], fibres: true, id: 'skin' })
  // the follicle's own frame, as the part lays it out: from the surface at u0 down to the bulb
  const tilt = (-14 * Math.PI) / 180, u0 = 4, v0 = -4, Lf = (-4 + depth - 14) - 2 - v0, dir = [Math.sin(tilt), Math.cos(tilt)]
  const Pf = (t, n = 0) => [u0 + dir[0] * t * Lf + dir[1] * n, v0 + dir[1] * t * Lf - dir[0] * n]
  const from = Pf(0.64, 3.4), to = [u0 + 27, 8.5], mid = [(from[0] + to[0]) / 2 + 2.5, (from[1] + to[1]) / 2 + 2.5]
  const d = curve(g, [from, mid, to].map(L2G))
  const w = organW(size * g.k)
  const m = tubeD(g, d, 2.6 * sc, MUSCLE.base, MUSCLE.outline, w * 0.4)
  return join(sk, own('arrector-pili-muscle', m, [['arrector pili muscle', MUSCLE]]))
})

// ---------- Wound ----------
// A cut through epidermis and dermis filled by a clot (the skin part's 'wound'), blood welling at the edges of the cut
// and a drop of blood above, in the clot's red.
icon('Wound', [4.9, 0, 1.5], (g) => {
  const sk = block(g, { state: 'wound' }), w = organW(94 * g.k)
  let b = fillD(`M${P2(g.P([-31, -4]))} C${P2(g.P([-31, -9]))} ${P2(g.P([-22, -9]))} ${P2(g.P([-22, -4]))} Z M${P2(g.P([19.5, -4]))} C${P2(g.P([19.5, -7.5]))} ${P2(g.P([26, -7.5]))} ${P2(g.P([26, -4]))} Z`, CLOT.base, CLOT.outline, w * 0.45)
  b += fillD(dropD(g, 0, -41, 15), CLOT.base, CLOT.outline, w * 0.6)
  return join(sk, own('blood', b))
})

// ---------- Scar ----------
// Healed skin: flat epidermis without rete ridges over a collagen scar in the dermis (the skin part's 'scar'), and,
// drawn here, the scar raised on the surface in the scar's pale tone of the dermis.
icon('Scar', [4.9, 0, 18.4], (g) => {
  const sk = block(g, { state: 'scar' }), w = organW(94 * g.k)
  const ridge = `M${P2(g.P([-21, -4]))} C${P2(g.P([-14, -10.5]))} ${P2(g.P([14, -10.5]))} ${P2(g.P([21, -4]))}`
  const r = fillD(ridge + ' Z', DERMIS.light) + strokeD(`M${P2(g.P([-10, -7]))} C${P2(g.P([-4, -8.3]))} ${P2(g.P([4, -8.3]))} ${P2(g.P([10, -7]))}`, DERMIS.small, w * 0.35) + strokeD(ridge, DERMIS.outline, w)
  return join(sk, own('raised-scar', r))
})

// ---------- Melanoma ----------
// An irregular, raised, dark lesion: atypical melanocytes in a nest that invades the dermis (with clumps of melanin), its
// top raised above the surface in uneven darker and paler browns, and single melanocytes along the basal layer beside
// it. The browns are the approved melanin of Melanocyte (cells/epithelia.mjs), the hue of the epidermis: melanin is the
// epidermis's pigment, so the lesion is a deeper tone of it and recolours with it (listed with the epidermis).
const MELANIN = { light: toHex({ l: 0.9, c: 0.03, h: 52 }), base: toHex({ l: 0.62, c: 0.075, h: 52 }), shadow: toHex({ l: 0.54, c: 0.075, h: 52 }), small: toHex({ l: 0.5, c: 0.075, h: 52 }), outline: toHex({ l: 0.4, c: 0.06, h: 52 }) }
const MEL_DARK = toHex({ l: 0.44, c: 0.06, h: 52 }), MEL_INK = toHex({ l: 0.3, c: 0.04, h: 52 })
icon('Melanoma', [4.9, 0, 13.5], (g) => {
  const sk = block(g), w = organW(94 * g.k)
  let s = fillD([-40, -34, 30, 36, 42].map((x) => circleD(g, x, J(x) - 1.2, 1.7)).join(' '), MELANIN.small)
  s += fillD(g.smooth([[-24, -6], [-21, 3], [-23, 9], [-16, 13], [-12, 21], [-4, 18], [2, 25], [9, 18], [15, 14], [20, 6], [22, -6]]), MELANIN.base, MELANIN.outline, w * 0.55)
  s += fillD([[-16, 6], [-8, 12], [0, 6], [4, 14], [10, 6], [-14, -1], [14, 0]].map(([x, y]) => circleD(g, x, y, 2)).join(' '), MELANIN.outline)
  const top = `M${P2(g.P([-27, -4]))} C${P2(g.P([-26, -10]))} ${P2(g.P([-19, -15]))} ${P2(g.P([-10, -14]))} C${P2(g.P([-5, -18]))} ${P2(g.P([6, -18]))} ${P2(g.P([11, -13]))} C${P2(g.P([17, -14]))} ${P2(g.P([24, -10]))} ${P2(g.P([24, -4]))}`
  s += fillD(top + ' Z', MEL_DARK)
  s += fillD(`M${P2(g.P([-17, -8]))} C${P2(g.P([-14, -11]))} ${P2(g.P([-8, -11.5]))} ${P2(g.P([-6, -9]))} C${P2(g.P([-9, -6.5]))} ${P2(g.P([-14, -6]))} ${P2(g.P([-17, -8]))} Z M${P2(g.P([8, -9]))} C${P2(g.P([11, -11]))} ${P2(g.P([16, -10]))} ${P2(g.P([18, -7]))} C${P2(g.P([15, -6]))} ${P2(g.P([11, -6]))} ${P2(g.P([8, -9]))} Z`, MELANIN.small)
  s += fillD(circleD(g, -1.6, -11, 2.4) + ' ' + circleD(g, -20.4, -6.5, 1.6), MEL_INK)
  s += strokeD(top, MEL_INK, w)
  return join(sk, own('melanoma', s))
})

// ---------- Psoriasis ----------
// A raised plaque: thick epidermis with long rete ridges and silvery scales (the skin part's 'thick'), and, drawn here,
// the dilated capillaries rising in the elongated papillae between the ridges (SiliCoDraw's dots of inflammatory cells are
// left out: T cells at this size read as bubbles, and their nuclei sit 20° from the dermis).
icon('Psoriasis', [4.9, 0, 12.3], (g) => {
  const sk = block(g, { state: 'thick' }), w = organW(94 * g.k)
  const cap = [-20, -10, 0, 10, 20].map((x) => `M${P2(g.P([x - 0.6, 21]))} C${P2(g.P([x - 0.9, 14]))} ${P2(g.P([x, 9]))} ${P2(g.P([x, 4.5]))}`).join(' ')
  const vessels = own('capillaries', strokeD(cap, ARTERY.outline, w * 0.95) + strokeD(cap, ARTERY.base, w * 0.45))
  return join(sk, vessels)
})

check()
console.log('written')
