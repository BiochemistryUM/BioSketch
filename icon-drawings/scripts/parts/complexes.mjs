// Parts: protein complexes and larger bodies drawn once in the soft look of icon-drawings/STYLE.md and reused by every
// icon that shows them: the 26S proteasome, the mTOR complexes (mTORC1 and mTORC2), a fluorescent protein barrel (GFP and
// its kin), a two-chain receptor in a patch of membrane with the cell's response (the pharmacology scene), and a brain in
// section. Each was first drawn inside a batch script of "Molecules & genetics" (../molecules/mg01, mg05, mg12, mg15,
// mg16, mg21, mg22, mg23; SiliCoDraw's icons redrawn, github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David
// Carlsson) and is promoted here unchanged in look, made to take a place, a size, a turn and a palette.
//
// Every part is `part(g, { x, y, size, turn, id, w, pal, ...options })` and returns `{ defs, body, parts }` (some return
// more, said above each): `g` is a frame of `page` (../cellkit.mjs), `x, y, size` are in its units, `turn` in degrees about
// x, y (the whole group is turned, gradients with it), `w` the main outline in page pixels (by default from the size on
// the page), `pal` the palette. Every id inside starts with `id`.
// Colours (as the batches used them): proteasome purple (315°, SiliCoDraw's), mTOR blue (269°), GFP green (147°, `deep`),
// receptor blue and peach lipids (membranes.mjs) with cerulean response dots (205°), brain SiliCoDraw's pink (0°) in a
// palette a little fuller than `soft` so its folds read when small.
import { smoothD } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex } from '../colour.mjs'
import { f, gradient2 } from '../shapes.mjs'
import { membraneWith, receptor } from './membranes.mjs'
import { arrow, release } from './tissue.mjs'

// ---------- hues (OKLCH degrees) ----------
const PROTEIN = 75, PROTEASOME = hueOf('#b07cc6'), MTOR = hueOf('#6f86c8'), GFP = hueOf('#86efac'), BRAIN = hueOf('#f3d4dc')
/** The cell's response under a receptor: cerulean dots, 62° from the receptor's blue, 40° from the green ligand. */
export const RESPONSE = deep(205)
/** True greys (chroma below 0.012) for the arrows of the biased response: they never join a part's hue. */
const GREY = toHex({ l: 0.5, c: 0.008, h: 255 }), PALE = toHex({ l: 0.8, c: 0.006, h: 255 })

// ---------- helpers ----------
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
/** The main outline (px) of a part whose longer extent on the page is `px`: 10 on a large one, never under 3.5. */
const lineFor = (px) => f(clamp(2.5 + px * 0.03, 3.5, 10))
/** The group of a part, turned about x, y. */
const wrap = (g, id, x, y, turn, inner) => `<g id="${id}"${turn ? ` transform="rotate(${f(turn)} ${f(g.X(x))} ${f(g.Y(y))})"` : ''}>${inner}</g>`
const ptsD = (pts) => `M${pts.map(([a, b]) => `${f(a)},${f(b)}`).join(' L')}`
const line = (pts, colour, w) => `<path d="${ptsD(pts)}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"/>`
/** One gradient that lights every shape that uses it from its own top left (beads). */
const boxGrad = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`
const shine = (cx, cy, rx, ry, rot, fill) => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" transform="rotate(${rot} ${f(cx)} ${f(cy)})" fill="${fill}"/>`
/** A local frame: [u, v] at x + u·s, y + v·s of g, as a page point; `px` page pixels per unit. */
const local = (g, x, y, s) => ({ P: ([u, v]) => g.P([x + u * s, y + v * s]), px: s * g.k })
/** A smooth curve through the points (Catmull–Rom), as a point list. */
const chainPts = (pts, per = 12) => {
  const out = []
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)]
    for (let j = 0; j < per; j++) {
      const t = j / per, t2 = t * t, t3 = t2 * t
      out.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)))
    }
  }
  out.push(pts.at(-1))
  return out
}
/** An ellipse (local units, turned by rot degrees about its middle) as a smooth closed path. */
const ellD = (L, [u0, v0], rx, ry, rot = 0) => {
  const a = (rot * Math.PI) / 180
  return smoothD(Array.from({ length: 24 }, (_, i) => { const t = (i / 24) * 2 * Math.PI, u = rx * Math.cos(t), v = ry * Math.sin(t); return L.P([u0 + u * Math.cos(a) - v * Math.sin(a), v0 + u * Math.sin(a) + v * Math.cos(a)]) }))
}
const disc = (L, p, r, fill, stroke = '', w = 0) => { const [cx, cy] = L.P(p); return `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * L.px)}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${f(w)}"` : ''}/>` }
const grad = (id, L, [u0, v0, u1, v1], base, shadow) => gradient2(id, [...L.P([u0, v0]), ...L.P([u1, v1])], base, shadow)

// =====================================================================================================================
// Proteasome: the 26S proteasome seen from the side. The 20S core is a barrel of four stacked rings of subunits (α, β, β,
// α: the outer rings paler, the inner ones, where the proteolytic sites are, deeper); a 19S cap sits on each end, its lid
// lobed round the opening the substrate is threaded through. `size` is its height without the substrate (it is 0.64 ×
// size wide), x, y its middle. Options: `substrate` adds an unfolded protein chain (amber, `substratePal`) entering the top
// cap from the upper left and three short peptides leaving at the bottom (they reach 0.74 × size above and 0.67 × size
// below the middle); `pal` (purple 315° by default; mg21 uses soft(290) beside a ribosome's mRNA).
// proteasome(g, { x: 0, y: 0, size: 100, substrate: true })
// =====================================================================================================================
export function proteasome(g, { x, y, size, turn = 0, id = 'proteasome', w, pal = soft(PROTEASOME), substrate = false, substratePal = rich(PROTEIN) }) {
  const L = local(g, x, y, size / 100), P = L.P, px = L.px
  const W = w ?? f(Math.max(3.5, Math.min(7, 2 + px * 1.1)))
  const cap = { light: pal.base, base: pal.shadow, shadow: pal.small, outline: pal.outline }
  // The rings: four beads each, every bead lit from its own top left; one outline round each ring.
  const R = 7.4, xs = [-16.8, -5.6, 5.6, 16.8], ys = [19.5, 6.5, -6.5, -19.5]
  const bead = ([u, v], r) => { const [cx, cy] = P([u, v]), q = r * px; return `M${f(cx - q)},${f(cy)} A${f(q)},${f(q)} 0 1 0 ${f(cx + q)},${f(cy)} A${f(q)},${f(q)} 0 1 0 ${f(cx - q)},${f(cy)} Z` }
  const ring = (v, k) => {
    const fill = k === 0 || k === 3 ? `url(#${id}-alpha-gradient)` : `url(#${id}-beta-gradient)`
    return xs.map((u) => `<path d="${bead([u, v], R)}" fill="${pal.outline}" stroke="${pal.outline}" stroke-width="${f(2 * W)}"/>`).join('') + xs.map((u) => `<path d="${bead([u, v], R)}" fill="${fill}"/>`).join('')
  }
  // A cap: a wide base on the α ring and a lid of two lobes on either side of the opening (mirrored for the bottom one).
  const CAP = [[-30, -24], [-32, -33], [-27, -43], [-15, -49], [-5, -46], [-2, -41], [2, -41], [5, -46], [15, -49], [27, -43], [32, -33], [30, -24], [16, -22], [0, -21.5], [-16, -22]]
  const capD = (sign) => smoothD(CAP.map(([u, v]) => P([u, sign * v])))
  const defs = boxGrad(`${id}-alpha-gradient`, pal.base, pal.shadow) + boxGrad(`${id}-beta-gradient`, pal.shadow, pal.small) +
    grad(`${id}-cap-gradient`, L, [-32, -50, 32, -22], cap.base, cap.shadow) + grad(`${id}-lower-cap-gradient`, L, [-32, 22, 32, 50], cap.base, cap.shadow)
  const [hx, hy] = P([-22, -38])
  let inner = `<g id="${id}-core">${ys.map(ring).join('')}</g>` +
    `<g id="${id}-caps"><path d="${capD(1)}" fill="url(#${id}-lower-cap-gradient)" stroke="${pal.outline}" stroke-width="${W}" stroke-linejoin="round"/>` +
    `<path d="${capD(-1)}" fill="url(#${id}-cap-gradient)" stroke="${pal.outline}" stroke-width="${W}" stroke-linejoin="round"/>` +
    (px >= 2.5 ? shine(hx, hy, 5 * px, 1.8 * px, -28, cap.light) : '') + '</g>'
  const parts = [['proteasome', pal]]
  if (substrate) {
    // The unfolded chain: a tube in the protein's tones, from the upper left into the opening of the top cap.
    const chain = [[-46, -74], [-36, -66], [-38, -58], [-26, -54], [-18, -60], [-8, -56], [-2, -48], [0, -38]]
    const T = 4.2 * px, w2 = Math.max(3.5, W * 0.8)
    const d = ptsD(chainPts(chain).map(P))
    const tube = `<path d="${d}" fill="none" stroke="${substratePal.outline}" stroke-width="${f(T + 2 * w2)}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${substratePal.small}" stroke-width="${f(T)}" stroke-linecap="round" stroke-linejoin="round"/>`
    // Peptides: three short pieces leaving the bottom cap.
    const bits = [[[-14, 58], [-7, 63]], [[2, 61], [8, 67]], [[14, 56], [20, 61]]]
    inner = `<g id="${id}-substrate">${tube}</g>` + inner + `<g id="${id}-peptides">${bits.map((b) => line(b.map(P), substratePal.small, T)).join('')}</g>`
    parts.push(['substrate', substratePal])
  }
  return { defs, body: wrap(g, id, x, y, turn, inner), parts }
}

// =====================================================================================================================
// mTOR complex seen from above, as in cryo-EM pictures: a lozenge-shaped dimer of the two mTOR kinases round a central
// cavity, joined at the seam, with its partners, all in one palette (they recolour together). `complex: 1` (mTORC1, the
// default): raptor as a lobe at either end and mLST8 as two small balls on top; `complex: 2` (mTORC2): rictor as two broad
// lobes over the upper sides, Sin1 at either end and mLST8 under it. x, y the middle of the mTOR dimer (the same place in
// both); `size` the width of mTORC1 (the dimer is two thirds of it; mTORC2 is 0.9 × size wide). `pal` blue 269° by default.
// mtorComplex(g, { x: 0, y: 0, size: 100, complex: 2 })
// =====================================================================================================================
export function mtorComplex(g, { x, y, size, turn = 0, complex = 1, id = complex === 2 ? 'mTORC2' : 'mTORC1', w, pal = soft(MTOR) }) {
  // The drawing's own units: the dimer 60 wide, its middle at v = -8 (as drawn in mg16 and mg22).
  const s = size / 90, L = local(g, x, y + 8 * s, s), px = L.px
  const W = w ?? lineFor(60 * px)
  const out = [[-30, -8], [-16, -24], [0, -27], [16, -24], [30, -8], [16, 8], [0, 11], [-16, 8]].map(L.P)
  const hole = [[-11, -8], [0, -15], [11, -8], [0, -1]].map(L.P)
  const seam = (a, b) => line([a, b].map(L.P), pal.outline, W * 0.55)
  const deeper = (d) => `<path d="${d}" fill="url(#${id}-partner-gradient)" stroke="${pal.outline}" stroke-width="${W}"/>`
  const mtor = `<g id="${id}-mTOR"><path d="${smoothD(out)} ${smoothD(hole)}" fill="url(#${id}-gradient)" fill-rule="evenodd" stroke="${pal.outline}" stroke-width="${W}" stroke-linejoin="round"/>` +
    `${seam([0, -27], [0, -15])}${seam([0, -1], [0, 11])}${shine(...L.P([-17, -15]), 7 * px, 2.4 * px, -32, pal.light)}</g>`
  let defs = grad(`${id}-gradient`, L, [-30, -27, 30, 11], pal.base, pal.shadow), inner
  if (complex === 2) {
    const rictor = [-1, 1].map((k) => deeper(ellD(L, [k * 18.5, -29], 17, 9.5, k * 28)))
    const sin1 = [-1, 1].map((k) => disc(L, [k * 34, -6], 6.2, pal.base, pal.outline, W * 0.8))
    const lst8 = [-1, 1].map((k) => disc(L, [k * 13, 13], 6, pal.base, pal.outline, W * 0.8))
    defs += grad(`${id}-partner-gradient`, L, [-36, -40, 36, -18], pal.shadow, pal.small)
    inner = `<g id="${id}-rictor">${rictor.join('')}</g><g id="${id}-Sin1">${sin1.join('')}</g><g id="${id}-mLST8">${lst8.join('')}</g>${mtor}`
  } else {
    const raptor = [-1, 1].map((k) => deeper(ellD(L, [k * 34, -6], 10.5, 12.5)))
    const lst8 = [-1, 1].map((k) => disc(L, [k * 12, -29], 6, pal.base, pal.outline, W * 0.8))
    defs += grad(`${id}-partner-gradient`, L, [-45, -19, 45, 7], pal.shadow, pal.small)
    inner = `<g id="${id}-raptor">${raptor.join('')}</g>${mtor}<g id="${id}-mLST8">${lst8.join('')}</g>`
  }
  return { defs, body: wrap(g, id, x, y, turn, inner), parts: [[complex === 2 ? 'mTORC2' : 'mTORC1', pal]] }
}

// =====================================================================================================================
// Fluorescent protein: the β-barrel of GFP and its kin, a cylinder with an open top and broad β strands down its front,
// every second one deeper; the chromophore inside is not drawn. `size` is the barrel's height (it is 0.59 × size wide),
// x, y its middle. Options: `glow` two solid pale discs in the barrel's hue round it (worked out from SiliCoDraw's
// see-through ones), `glowSize` their outer diameter (default 1.4 × size; FRET's acceptor used 1.2); `pal` green (GFP,
// `deep(147)`) by default, deep(25) for a red one (mCherry, a FRET acceptor); `name` the name in `parts`.
// fluorescentBarrel(g, { x: 0, y: 0, size: 70, glow: true })
// =====================================================================================================================
export function fluorescentBarrel(g, { x, y, size, turn = 0, id = 'fluorescent-protein', w, pal = deep(GFP), glow = false, glowSize, name = 'fluorescent protein' }) {
  // The drawing's own units (as mg05): half width 21, the side from -27 to 27, ellipses 8.5 deep; 71 high in all.
  const L = local(g, x, y, size / 71), P = L.P, px = L.px
  const W = w ?? lineFor(71 * px)
  const hw = 21, top = -27, bot = 27, ry = 8.5
  const [x0, y0] = P([-hw, top]), [x1, y1] = P([hw, bot])
  const side = `M${f(x0)},${f(y0)} L${f(x0)},${f(y1)} A${f(hw * px)},${f(ry * px)} 0 0 0 ${f(x1)},${f(y1)} L${f(x1)},${f(y0)} Z`
  // β strands: bands down the front of the barrel, spaced as the sine of their angle round it, every second one deeper.
  const strand = (a0, a1) => {
    const [u0, u1] = [a0, a1].map((a) => hw * Math.sin(a))
    const yb = (u) => bot + ry * Math.sqrt(Math.max(0, 1 - (u / hw) ** 2)), yt = (u) => top + ry * Math.sqrt(Math.max(0, 1 - (u / hw) ** 2))
    const us = Array.from({ length: 9 }, (_, i) => u0 + ((u1 - u0) * i) / 8)
    return `${ptsD([...us.map((u) => P([u, yt(u)])), ...[...us].reverse().map((u) => P([u, yb(u)]))])}Z`
  }
  const bands = [-1.05, -0.35, 0.35, 1.05].map((a) => strand(a - 0.17, a + 0.17)).map((d, i) => `<path d="${d}" fill="${i % 2 ? pal.shadow : pal.small}"/>`).join('')
  const ell = (u, v, rx, ry2, fill, stroke = '', sw = 0) => { const [cx, cy] = P([u, v]); return `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx * px)}" ry="${f(ry2 * px)}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${f(sw)}"` : ''}/>` }
  const mouth = ell(0, top, hw, ry, pal.light, pal.outline, W * 0.9) + ell(0, top + ry * 0.19, hw * 0.62, ry * 0.5, pal.shadow)
  const big = 71 * px >= 140
  const barrel = `<g id="${id}-barrel"><path d="${side}" fill="url(#${id}-gradient)"/>${bands}` +
    (big ? shine(...P([-hw * 0.64, 2]), hw * 0.186 * px, hw * 0.046 * px, -90, pal.light) : '') +
    `<path d="${side}" fill="none" stroke="${pal.outline}" stroke-width="${f(W)}" stroke-linejoin="round"/>${mouth}</g>`
  let halo = ''
  if (glow) {
    const h = hueOf(pal.base), R = ((glowSize ?? size * 1.4) / 2) * (71 / size)
    halo = `<g id="${id}-glow">${disc(L, [0, 0], R, toHex({ l: 0.965, c: 0.035, h }))}${disc(L, [0, 0], R * 0.78, toHex({ l: 0.925, c: 0.065, h }))}</g>`
  }
  return { defs: grad(`${id}-gradient`, L, [-hw, top, hw, bot + ry], pal.base, pal.shadow), body: wrap(g, id, x, y, turn, halo + barrel), parts: [[name, pal]] }
}

// =====================================================================================================================
// Receptor in a membrane: the pharmacology scene of mg15 and mg16 as a part. A stretch of lipid bilayer seen in section
// (outside up), the two-chain receptor of membranes.mjs in its middle with its chains reaching into the cell, and under it
// the cell's response, a fan of cerulean signal dots pointing down (release of tissue.mjs). `size` the membrane's length
// (it is 0.34 × size thick); x, y the middle of the membrane. The scene reaches 0.35 × size above y (the rims of the cup)
// and, with a response, 0.56 × size below it.
// Options: `bound` (the receptor part's own green ligand seated deep in its cup, an agonist; default false: the caller
// draws its ligand), `ligandPal` (with `bound`), `response`: 'full' (4 rows of dots), 'partial' (2 rows), 'none', a number
// of rows (5 with `spread: 90` is the stronger answer of a positive allosteric modulator), or 'biased' (two pathways leave
// the receptor: a grey arrow down to the left ending in a small burst, a pale arrow down to the right ending in nothing);
// `spread` the fan's angle (74°); `pal` the lipids, `receptorPal` the receptor, `responsePal` the dots; `w` the receptor's
// outline. A ligand of the caller must keep 36° from 205, 267 and 52 (red 12°, yellow 96°, green 165° do).
// Returns also `cup` { x, y, r, rim } (the middle and radius of the seated ligand, the height of the cup's rims), `below`
// (where the chains end inside the cell) and `at(u, v)`: a point of the scene's own frame (100 units long, membrane at
// v = 0, outside up) in g's units, turned with it. `cup` and `below` are in g's units for an unturned part.
// receptorInMembrane(g, { x: 0, y: 0, size: 100, bound: true, response: 'full' })
// =====================================================================================================================
export function receptorInMembrane(g, { x, y, size, turn = 0, id = 'receptor-scene', w, bound = false, ligandPal, response = 'full', spread = 74, pal, receptorPal, responsePal = RESPONSE }) {
  // The scene's own frame (as mg15): a membrane 100 long and 34 thick at v = 0; S page units of g per scene unit.
  const S = size / 100, thick = 34 * S, tail = 0.63, k = (size * g.k) / 460 // k: the scene's pixels against mg15's page
  const U = ([u, v]) => [x + u * S, y + v * S]
  const protein = { part: receptor, at: 0, bound, tail, id: `${id}-receptor`, ...(ligandPal ? { ligandPal } : {}), ...(receptorPal ? { pal: receptorPal } : {}), ...(w ? { w } : {}) }
  const m = membraneWith(g, { x, y, size, thick, id: `${id}-membrane`, ...(pal ? { pal } : {}), proteins: [protein] })
  const below = tail * 34 + 2
  const extra = []
  if (response === 'biased') {
    const y0 = below + 1, at = (p) => U(p)
    extra.push(arrow(g, { points: [[-3, y0], [-14, y0 + 10]].map(at), corners: true, w: f(Math.max(3.5, 11 * k)), colour: GREY, id: `${id}-pathway-on` }))
    extra.push(arrow(g, { points: [[3, y0], [15, y0 + 11]].map(at), corners: true, w: f(Math.max(3.5, 10 * k)), colour: PALE, id: `${id}-pathway-off` }))
    const t = (135 * Math.PI) / 180, from = [-14, y0 + 9.5], [rx, ry] = U([from[0] + 11 * Math.cos(t), from[1] + 11 * Math.sin(t)])
    extra.push(release(g, { x: rx, y: ry, size: 22 * S, turn: 135, spread: 66, rows: 3, pal: responsePal, id: `${id}-response` }))
  } else {
    const rows = typeof response === 'number' ? response : { full: 4, partial: 2, none: 0 }[response]
    if (rows) { const [rx, ry] = U([0, below + 17]); extra.push(release(g, { x: rx, y: ry, size: 32 * S, turn: 90, spread, rows, pal: responsePal, id: `${id}-response` })) }
  }
  const parts = [...m.parts, ...extra.flatMap((e) => e.parts.filter(([n]) => n === 'signal'))]
  const r = (turn * Math.PI) / 180
  const at = (u, v) => { const du = u * S, dv = v * S; return [x + du * Math.cos(r) - dv * Math.sin(r), y + du * Math.sin(r) + dv * Math.cos(r)] }
  return {
    defs: m.defs + extra.map((e) => e.defs).join(''),
    body: wrap(g, id, x, y, turn, m.body + extra.map((e) => e.body).join('')),
    parts,
    cup: { x, y: y - 0.824 * thick, r: 0.186 * thick, rim: y - 0.98 * thick },
    below: y + below * S,
    at,
  }
}

// =====================================================================================================================
// Brain: a brain cut lengthwise, seen from the left (as SiliCoDraw's GDF15 draws it): the cerebrum with a few folds, the
// cerebellum behind and below it with its folia, and the brainstem going down, the latter two in deeper tones. `size` its
// width (it is about as high), x, y the middle. `pal` SiliCoDraw's pink by default; `brainPal(h)` gives the same fuller
// palette in another hue. Returns also `at(u, v)`, a point of the brain's own frame (90 units wide, middle at 0, 0) in g's
// units, turned with it: the area postrema lies at (16, 29), the base of the brainstem at (9.5, 44).
// brain(g, { x: 0, y: 0, size: 90 })
// =====================================================================================================================
/** The brain's palette: a little fuller than `soft` so that the folds read when small. */
export const brainPal = (h) => ({ light: toHex({ l: 0.97, c: 0.015, h }), base: toHex({ l: 0.91, c: 0.04, h }), shadow: toHex({ l: 0.85, c: 0.06, h }), small: toHex({ l: 0.72, c: 0.08, h }), outline: toHex({ l: 0.55, c: 0.1, h }) })
export function brain(g, { x, y, size, turn = 0, id = 'brain', w, pal = brainPal(BRAIN) }) {
  const s = size / 90, L = local(g, x, y, s), px = L.px
  const W = w ?? f(clamp(2 + 90 * px * 0.022, 3.5, 10)), fold = W * 0.62
  // A path of absolute M, C, S, L, Z commands in the brain's units, moved onto the page.
  const D = (d) => d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, u, v) => L.P([+u, +v]).map(f).join(','))
  const cerebrum = [[-45, -6], [-43, -24], [-31, -38], [-11, -45], [11, -43], [30, -35], [42, -21], [44, -6], [34, 4], [18, 6], [2, 4], [-14, 7], [-30, 7], [-41, 3]]
  const cerebellum = [[18, 6], [30, 2], [42, 7], [45, 17], [38, 26], [26, 27], [17, 21]]
  const stem = D('M2,2C4,16 5,28 3,44L16,44C17,32 17,20 21,6Z')
  const boxOf = (pts) => { const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] }
  const box = boxOf(cerebrum.map(L.P)), lower = boxOf([...cerebellum, [2, 2], [16, 44]].map(L.P))
  const deeper = { base: pal.shadow, shadow: toHex({ l: 0.79, c: 0.07, h: hueOf(pal.base) }) }
  const folds = D('M-34,-24C-26,-30 -20,-22 -12,-28S2,-34 8,-26M-30,-8C-22,-14 -16,-6 -6,-12S8,-18 16,-10M14,-36C18,-28 26,-26 32,-20M-40,-10C-36,-14 -34,-16 -36,-22')
  const folia = D('M23,11C30,9 37,11 41,14M21,17C28,15 35,17 40,20')
  const inner = `<g id="${id}-brainstem"><path d="${stem}" fill="url(#${id}-lower-gradient)" stroke="${pal.outline}" stroke-width="${f(W)}" stroke-linejoin="round"/></g>` +
    `<g id="${id}-cerebellum"><path d="${smoothD(cerebellum.map(L.P))}" fill="url(#${id}-lower-gradient)" stroke="${pal.outline}" stroke-width="${f(W)}" stroke-linejoin="round"/>` +
    `<path d="${folia}" fill="none" stroke="${pal.small}" stroke-width="${f(fold * 0.8)}" stroke-linecap="round"/></g>` +
    `<g id="${id}-cerebrum"><path d="${smoothD(cerebrum.map(L.P))}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="${f(W)}" stroke-linejoin="round"/>` +
    `<path d="${folds}" fill="none" stroke="${pal.small}" stroke-width="${f(fold)}" stroke-linecap="round" stroke-linejoin="round"/>` +
    (px * 90 > 300 ? shine(...L.P([-24, -36]), (26 * px) / 3, 3 * px, -24, pal.light) : '') + '</g>'
  const r = (turn * Math.PI) / 180
  return {
    defs: gradient2(`${id}-gradient`, box, pal.base, pal.shadow) + gradient2(`${id}-lower-gradient`, lower, deeper.base, deeper.shadow),
    body: wrap(g, id, x, y, turn, inner),
    parts: [['brain', pal]],
    at: (u, v) => [x + s * (u * Math.cos(r) - v * Math.sin(r)), y + s * (u * Math.sin(r) + v * Math.cos(r))],
  }
}

// =====================================================================================================================
// The parts sheet: every part and variant alone (see sheet.mjs).
// =====================================================================================================================
export const DEMOS = [
  { name: 'Proteasome', size: 100, draw: (g) => proteasome(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Proteasome with substrate', size: 150, draw: (g) => proteasome(g, { x: 0, y: 4, size: 100, substrate: true }) },
  { name: 'Violet proteasome', size: 100, draw: (g) => proteasome(g, { x: 0, y: 0, size: 100, pal: soft(290) }) },
  { name: 'mTORC1', size: 100, draw: (g) => mtorComplex(g, { x: 0, y: 6, size: 100 }) },
  { name: 'mTORC2', size: 100, draw: (g) => mtorComplex(g, { x: 0, y: 2, size: 100, complex: 2 }) },
  { name: 'Fluorescent protein', size: 100, draw: (g) => fluorescentBarrel(g, { x: 0, y: 0, size: 100 }) },
  { name: 'GFP with glow', size: 100, draw: (g) => fluorescentBarrel(g, { x: 0, y: 0, size: 71, glow: true, name: 'GFP' }) },
  { name: 'Red fluorescent protein with glow', size: 100, draw: (g) => fluorescentBarrel(g, { x: 0, y: 0, size: 71, glow: true, pal: deep(25) }) },
  { name: 'Receptor with agonist', size: 100, draw: (g) => receptorInMembrane(g, { x: 0, y: -10, size: 100, bound: true, response: 'full' }) },
  { name: 'Empty receptor in membrane', size: 100, draw: (g) => receptorInMembrane(g, { x: 0, y: -10, size: 100, response: 'none' }) },
  { name: 'Receptor with partial response', size: 100, draw: (g) => receptorInMembrane(g, { x: 0, y: -10, size: 100, response: 'partial' }) },
  { name: 'Receptor with biased response', size: 100, draw: (g) => receptorInMembrane(g, { x: 0, y: -10, size: 100, bound: true, response: 'biased' }) },
  { name: 'Receptor with stronger response', size: 100, draw: (g) => receptorInMembrane(g, { x: 0, y: -10, size: 100, bound: true, response: 5, spread: 90 }) },
  { name: 'Brain', size: 100, draw: (g) => brain(g, { x: 0, y: 0, size: 100 }) },
]
