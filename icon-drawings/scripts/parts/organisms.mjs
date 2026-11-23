// Shared parts of the redrawn icons, group "organisms": what the icons of SiliCoDraw's "Organisms" category have in common.
// Animals by body plan, each with its kinds (a mammal seen from the side, the face of a cat, hamster or macaque, a bat, a
// whale, dolphin or seal, a bird, a fish, an amphibian, a reptile, an insect, another arthropod, the soft-bodied animals of
// the sea and the soil), a person, plants by part and as whole plants, fungi, the small life of water, and the scene
// pieces they stand in (water, ground, an egg). Each part is a function `part(g, { x, y, size, turn, id, w, pal, ...options })`
// that returns { defs, body, parts }, drawn in the frame `g` of `page()` (../cellkit.mjs) and designed in a box of 100 local
// units, as SiliCoDraw draws them. `size` is the longer extent in g's units, outline included; `turn` turns it about x, y
// (degrees, clockwise); `flip` mirrors it (to face right); `w` overrides the main outline in page pixels (`objW` of lab.mjs
// otherwise, as the approved lab mouse); every id inside starts with `id`. Shapes from SiliCoDraw
// (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see ../../LICENSE-SiliCoDraw.txt), its "Organisms"
// icons (the later drawings that replace the first), read by hand and drawn in the soft look of icon-drawings/STYLE.md.
// Promoted unchanged in look: the fruit fly seen from above of ../assays/tbF.mjs (without see-through wings), the budding
// yeast of ../cells/ct12.mjs (Yeast replicative ageing) and the plant cell of ../cells/embryo.mjs. Reused, not redrawn: the
// C. elegans worm and the mouse seen from above of assays.mjs, the lab mouse of lab.mjs, the bacteria of immune.mjs and
// tissue.mjs, the chloroplast of organelles.mjs, arrows of tissue.mjs.
//
// ---------- Conventions of organisms ----------
// Facing. Animals in side view face LEFT, as SiliCoDraw draws them and as the approved lab mouse does; `flip: true` turns
//   one to the right (the points are mirrored, so the light stays at the top left). Flat animals (frog, lizard, beetle,
//   spider, crab, starfish) are seen from above, head up.
// Look. Animals and plants seen from the side are flat, with the soft shading of the set: one fill in the body's base tone
//   (from 80 px on the page a two-stop gradient, base at the top left to shadow), a far leg, ear or fin in the shadow tone,
//   and from 80 px a pale line along the back in the light tone (as the lab mouse). No highlight ellipses. Closed round
//   bodies — a yeast cell, an egg, an embryo, a pollen grain, a Volvox colony, a round alga — get the face-on gloss of cells
//   (`gloss` of surfaces.mjs) with setGloss(true): a narrow lit rim and highlight at the upper left, a thin pale shade at the
//   lower right; their nuclei are flat.
// Eyes. One small dark dot in lab's INK (never black) with a tiny white light at its upper left from 60 px; the same in every
//   animal, about 2.4 units of the 100 box (insects and spiders keep their own compound or simple eyes).
// Detail. Below 60 px on the page inner lines are left out (fur and wrinkle lines, scales, fin rays, veins of leaves and
//   wings, segment lines, whiskers, spots); the silhouette, the far limbs, the eye and the colour patches stay. Below 40 px
//   the eye's light and thin appendages (antennae, whiskers, tendrils) go too. Outlines `objW(px)`: 3.5 up to 100 px.
// Colours (each part recolours on its own; parts that meet in one animal are 36° of hue or more apart, or greys):
//   Fur: the mouse lab.mjs's white FUR with PINK skin (ears, nose, feet, tail); the rat, rabbit, cat, sheep's fleece,
//   cow, elephant, seal, shark and mosquito greys (outside the hue check); browns for the dog (tan, 65°), horse
//   (chestnut, 55°), guinea pig and hamster (golden, 70°), bat (dark brown, 50°), macaque and marmoset (olive-brown, 75°);
//   the pig and the naked mole-rat a pink skin (5° and 30°); a face of bare skin pink (25°). Birds: a songbird blue
//   (250°) with a pale buff breast, the hen white with a red comb (deep 25) and yellow legs and beak (rich 80), the macaw red
//   (deep 25), blue (deep 260) and yellow (rich 95). Fish: zebrafish pale gold (rich 90) with blue stripes (deep 260);
//   killifish turquoise (200°) with orange-red fins (deep 40); medaka orange (65°); rockfish red (deep 28) with apricot
//   fins (rich 70); the Greenland shark grey. Marine mammals blue-greys and greys with pale bellies. Amphibians and
//   reptiles: frog, lizard and snake greens (130–140°), axolotl pink (355°) with deeper gills, olm pale (60°) with red gills
//   (deep 15), tadpole olive (105°), tortoise shell olive-brown (70°) with grey skin. Insects: the fly as approved (tan 55°,
//   red eyes 15°); bees amber (rich 78) with dark grey bands; ant, beetle and spider dark (browns and greys); butterfly
//   orange (rich 60) with dark margins and white spots; locust and caterpillar greens; wings a pale grey-blue (WING, under
//   the grey line, so they never recolour with a body). Crustaceans: crab orange (deep 45), lobster red (deep 25), shrimp
//   pink-orange (35°), daphnia pale amber with a green gut, copepod pale teal with green egg sacs. Soft animals: octopus
//   mauve (350°), jellyfish lilac (310°), starfish orange, sea urchin violet (deep 305), snail grey-beige with a brown shell
//   (40°), earthworm pink (15°), hydra green, planarian brown, tardigrade beige, rotifer pale teal.
//   Plants: three greens, close enough to recolour together (LEAF 140°, DARK_LEAF 152° for conifers and old leaves,
//   YOUNG 122° for seedlings and grass; the plant cell and the stoma keep the approved plant cell's yellow-green cytoplasm and deep green chloroplasts); stems in the leaf's green; wood and bark brown (55°); soil a dark brown (75°)
//   and a pot terracotta (deep 38), 37° apart; flowers pink (deep 350) or white (grey) with a yellow centre (rich 90);
//   grain gold (rich 85); maize yellow (rich 98) in green husks; tomato red (deep 28); kelp olive (85°).
//   Fungi: caps beige-brown (65°) or the fly agaric's red (deep 25) with white warts; stems and hyphae the off-white grey
//   of the approved Mould; yeast the approved yellow (rich 94) with blue-grey bud scars; spores brown (60°).
//   Small life in water: green algae (cell 121°, chloroplast deep 157), Volvox green, diatoms golden brown (rich 78, their
//   real colour: SiliCoDraw's is blue), dinoflagellates amber (70°), coccolithophores white plates round a green cell,
//   copepods teal; pollen yellow (rich 90). Water lab.mjs's water (222°), sand pale (85°).
//   People: assays.mjs's SKIN with clothes in lab's ACCENT (or any palette), hair dark brown or grey for the old.
// Used by: every icon of "Organisms"; see each part for the icons that use it.
import { NUC, glossOn, smoothD } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex, toLch } from '../colour.mjs'
import { f, strokeScale } from '../shapes.mjs'
import { gloss, glossTones, pathPoints } from './surfaces.mjs'
import { ACCENT, DARK, FUR, GLASS, INK, LIQUIDS, PINK, objW } from './lab.mjs'
import { SKIN, person, worm } from './assays.mjs'

// ---------- palettes ----------
/** A palette in one hue around a base lightness l and chroma c (greys below c 0.012 stay outside the hue check). */
export const tone = (h, l, c) => ({
  light: toHex({ l: Math.min(0.985, l + 0.075), c: c * 0.45, h }),
  base: toHex({ l, c, h }),
  shadow: toHex({ l: l - 0.065, c: c * 1.12, h }),
  small: toHex({ l: l - 0.15, c: c * 1.2, h }),
  outline: toHex({ l: Math.max(0.28, Math.min(0.58, l - 0.3)), c: Math.min(0.14, c * 1.05 + 0.004), h }),
})
const greyTone = (l, h = 250) => tone(h, l, 0.007)
// mammals
export const MOUSE = FUR.white
export { PINK }
export const RAT = greyTone(0.86, 75), RABBIT = greyTone(0.9, 80), CAT = greyTone(0.82, 250), COW = greyTone(0.97, 85), COW_PATCH = greyTone(0.36, 250)
export const FLEECE = greyTone(0.95, 90), SHEEP_FACE = greyTone(0.4, 300), ELEPHANT = greyTone(0.74, 250), IVORY = greyTone(0.96, 90)
export const DOG = tone(65, 0.8, 0.075), DOG_EAR = tone(55, 0.62, 0.075), HORSE = tone(55, 0.7, 0.09), MANE = greyTone(0.36, 300)
export const GOLDEN = tone(72, 0.84, 0.085), CREAM = greyTone(0.96, 200), BAT = tone(50, 0.58, 0.045), PIG = tone(5, 0.88, 0.065), MOLE_RAT = tone(30, 0.88, 0.055)
export const PRIMATE = tone(75, 0.74, 0.06), MARMOSET = tone(75, 0.7, 0.025), FACE = tone(25, 0.86, 0.06), TOOTH = rich(92)
export const WHALE = tone(245, 0.7, 0.035), DOLPHIN = tone(240, 0.76, 0.03), SEAL = greyTone(0.74, 250), BOWHEAD = greyTone(0.45, 250), BELLY = greyTone(0.95, 60)
// birds
export const SONGBIRD = tone(250, 0.76, 0.09), BUFF = tone(60, 0.93, 0.04), BEAK = rich(68), HEN = greyTone(0.97, 250), COMB = deep(25), HEN_LEGS = rich(80)
export const MACAW = deep(25), MACAW_BLUE = deep(260), MACAW_YELLOW = rich(95), PERCH = greyTone(0.62, 200)
// fish
export const ZEBRAFISH = rich(90), STRIPE = deep(260), KILLIFISH = tone(200, 0.82, 0.07), KILLI_FIN = deep(40), MEDAKA = tone(65, 0.86, 0.09)
export const ROCKFISH = deep(28), ROCK_FIN = rich(70), SHARK = greyTone(0.72, 240), COPEPOD = rich(85)
// amphibians and reptiles
export const FROG = tone(140, 0.8, 0.1), AXOLOTL = tone(355, 0.88, 0.065), GILLS = deep(355), OLM = tone(60, 0.92, 0.035), OLM_GILLS = deep(15), TADPOLE = tone(105, 0.72, 0.06)
export const LIZARD = tone(135, 0.78, 0.1), SNAKE = tone(125, 0.8, 0.09), TONGUE = deep(15), SHELL = tone(70, 0.72, 0.07), GIANT_SHELL = tone(70, 0.56, 0.035), REPTILE_SKIN = greyTone(0.74, 160)
// insects and other arthropods
export const FLY = { light: toHex({ l: 0.9, c: 0.04, h: 55 }), base: toHex({ l: 0.74, c: 0.09, h: 55 }), shadow: toHex({ l: 0.67, c: 0.1, h: 55 }), small: toHex({ l: 0.6, c: 0.1, h: 55 }), outline: toHex({ l: 0.38, c: 0.07, h: 55 }) }
export const FLY_EYE = { light: toHex({ l: 0.8, c: 0.1, h: 15 }), base: toHex({ l: 0.56, c: 0.2, h: 15 }), shadow: toHex({ l: 0.5, c: 0.19, h: 15 }), small: toHex({ l: 0.56, c: 0.2, h: 15 }), outline: toHex({ l: 0.36, c: 0.13, h: 15 }) }
export const WING = { light: '#FFFFFF', base: toHex({ l: 0.975, c: 0.008, h: 240 }), shadow: toHex({ l: 0.94, c: 0.01, h: 240 }), small: toHex({ l: 0.88, c: 0.011, h: 240 }), outline: toHex({ l: 0.6, c: 0.011, h: 240 }) }
export const BEE = tone(78, 0.86, 0.12), BEE_BAND = greyTone(0.38, 330), ANT = tone(40, 0.42, 0.045), BEETLE = tone(165, 0.42, 0.03), BUTTERFLY = tone(60, 0.8, 0.13), WING_MARGIN = greyTone(0.34, 330)
export const MOSQUITO = greyTone(0.62, 320), LOCUST = tone(120, 0.76, 0.09), TEGMEN = tone(80, 0.8, 0.05), CATERPILLAR = tone(135, 0.82, 0.1), SPOT = rich(95), PUPA = tone(70, 0.76, 0.07)
export const SPIDER = greyTone(0.45, 60), TICK = tone(40, 0.56, 0.08), SCUTUM = greyTone(0.36, 250), CRAB = deep(45), LOBSTER = deep(25), SHRIMP = tone(35, 0.85, 0.08)
export const DAPHNIA = tone(75, 0.93, 0.05), GUT = tone(130, 0.78, 0.08), COPEPOD_BODY = tone(180, 0.9, 0.05), EGG_SAC = tone(135, 0.86, 0.07), RED_EYE = deep(25)
// soft animals
export const OCTOPUS = tone(350, 0.8, 0.08), JELLY = tone(310, 0.91, 0.045), JELLY_GONAD = tone(310, 0.78, 0.08), STARFISH = deep(45), URCHIN = deep(305)
export const SNAIL = tone(80, 0.86, 0.03), SNAIL_SHELL = tone(40, 0.72, 0.09), EARTHWORM = tone(15, 0.8, 0.08), HYDRA = tone(135, 0.86, 0.07), PLANARIAN = tone(55, 0.7, 0.06)
export const TARDIGRADE = tone(40, 0.88, 0.04), ROTIFER = tone(190, 0.92, 0.04), ROTIFER_GUT = rich(55), CLAM = tone(55, 0.66, 0.05), CLAM_INSIDE = greyTone(0.95, 200)
export const CORAL = tone(15, 0.84, 0.08), ROCK = greyTone(0.78, 200), SPONGE = rich(78), TURRITOPSIS = tone(230, 0.92, 0.04), STOMACH = deep(25)
// plants, fungi, small life
export const LEAF = tone(140, 0.78, 0.11), DARK_LEAF = tone(152, 0.64, 0.09), YOUNG = tone(122, 0.84, 0.12), WOOD = tone(55, 0.6, 0.06), SOIL = tone(75, 0.5, 0.058), POT = deep(38)
export const PETAL = deep(350), WHITE_PETAL = greyTone(0.97, 250), FLOWER_CENTRE = rich(90), GRAIN = rich(85), MAIZE = rich(98), TOMATO = deep(28), KELP = tone(85, 0.64, 0.07)
export const CAP = tone(65, 0.74, 0.08), AGARIC = deep(25), STEM = { light: toHex({ l: 0.99, c: 0.004, h: 100 }), base: toHex({ l: 0.95, c: 0.008, h: 100 }), shadow: toHex({ l: 0.9, c: 0.01, h: 100 }), small: toHex({ l: 0.82, c: 0.011, h: 100 }), outline: toHex({ l: 0.6, c: 0.011, h: 100 }) }
export const YEAST = rich(hueOf('#f0e3b8')), CHITIN = soft(hueOf('#5b7fc4')), SPORE = tone(60, 0.74, 0.07), LICHEN = tone(150, 0.82, 0.05), LICHEN_CUP = rich(70)
export const ALGA = tone(121, 0.89, 0.1), CHLORO = deep(157), DIATOM = rich(78), DINO = tone(70, 0.84, 0.07), COCCOLITH = greyTone(0.97, 220), POLLEN = rich(90), SLIME = tone(100, 0.88, 0.11) /* deeper than rich(100) since the review of 23 November 2026: too pale to see */, GUARD = tone(128, 0.84, 0.1), OLD_DOG = tone(65, 0.86, 0.035)
export const WATER = LIQUIDS.water, SAND = tone(85, 0.9, 0.05)
export const BARK = greyTone(0.62, 140)
export const HAIR = { dark: greyTone(0.42, 330), grey: greyTone(0.86, 120) }, SHOE = greyTone(0.36, 190), STICK = greyTone(0.55, 330)
export { SKIN, ACCENT }

// ---------- helpers ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const rad = (d) => (d * Math.PI) / 180
const P2 = ([x, y]) => `${f(x)},${f(y)}`
const lin = (id, [x0, y0, x1, y1], a, b) => `<linearGradient id="${id}" x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`
const sw = (s, w) => (s ? ` stroke="${s}" stroke-width="${f(w)}" stroke-linejoin="round"` : '')
const fillD = (d, fill, s = '', w = 0) => (d ? `<path d="${d}" fill="${fill}"${sw(s, w)}/>` : '')
const strokeD = (d, colour, w, cap = 'round', extra = '') => (d ? `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"${extra}/>` : '')
const boxOf = (d) => { const p = pathPoints(d).flat(), xs = p.map((q) => q[0]), ys = p.map((q) => q[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] }
const group = (id, F, turn, inner) => `<g id="${id}"${turn ? ` transform="rotate(${f(turn)} ${f(F.cx)} ${f(F.cy)})"` : ''}>${inner}</g>`
const join = (...ps) => ({ defs: ps.map((p) => p.defs ?? '').join(''), body: ps.map((p) => p.body ?? '').join(''), parts: uniq(ps.flatMap((p) => p.parts ?? [])) })
const uniq = (parts) => parts.filter(([n, p], i) => parts.findIndex(([m, q]) => m === n || q.base === p.base) === i)
const mixHex = (a, b, t) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('').toUpperCase()
function rng(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
/** Points of a cubic Bézier given as eight numbers. */
const bez = (P, t) => { const u = 1 - t; return [u * u * u * P[0] + 3 * u * u * t * P[2] + 3 * u * t * t * P[4] + t * t * t * P[6], u * u * u * P[1] + 3 * u * u * t * P[3] + 3 * u * t * t * P[5] + t * t * t * P[7]] }
/** Points along a chain of cubic Béziers (each eight numbers, in local units). */
const chain = (segs, per = 10) => { const out = []; segs.forEach((P, k) => { for (let i = k ? 1 : 0; i <= per; i++) out.push(bez(P, i / per)) }); return out }
/** A band along a centre line (local points) whose width runs from w0 to w1 (or follows wf(t)), as a closed local polygon. */
const band = (C, w0, w1, wf) => {
  const n = C.length, L = [], R = []
  C.forEach((p, i) => {
    const q = C[Math.min(i + 1, n - 1)], r = C[Math.max(i - 1, 0)], dx = q[0] - r[0], dy = q[1] - r[1], l = Math.hypot(dx, dy) || 1, t = i / (n - 1), w = (wf ? wf(t) : w0 + (w1 - w0) * t) / 2
    L.push([p[0] - (dy / l) * w, p[1] + (dx / l) * w]); R.unshift([p[0] + (dy / l) * w, p[1] - (dx / l) * w])
  })
  return L.concat(R)
}
/** Points of a smooth closed outline through `p`, exactly as smoothD draws it, `per` points a span. */
const smoothPts = (p, per = 8) => {
  const n = p.length, out = []
  for (let i = 0; i < n; i++) {
    const a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n], e = p[(i + 2) % n]
    const Q = [b[0], b[1], b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6, c[0] - (e[0] - b[0]) / 6, c[1] - (e[1] - b[1]) / 6, c[0], c[1]]
    for (let j = 0; j < per; j++) out.push(bez(Q, j / per))
  }
  return out
}
/** Points on an ellipse in local units. */
const ellPts = (u, v, rx, ry, rot = 0, n = 24) => Array.from({ length: n }, (_, i) => { const t = (i / n) * 2 * Math.PI, c = Math.cos(rad(rot)), s = Math.sin(rad(rot)), a = rx * Math.cos(t), b = ry * Math.sin(t); return [u + a * c - b * s, v + a * s + b * c] })
const mirror = (pts) => pts.map(([u, v]) => [-u, v])

// ---------- the local frame and what a drawing gets ----------
/** The local frame of a kind: its box [u0, v0, u1, v1] in local units is fitted so that its longer side is `size`. */
const frame = (g, x, y, size, box = [-50, -50, 50, 50], flip = false) => {
  const E = Math.max(box[2] - box[0], box[3] - box[1]), s = size / E, ou = (box[0] + box[2]) / 2, ov = (box[1] + box[3]) / 2
  const at = ([u, v]) => [x + (flip ? -(u - ou) : u - ou) * s, y + (v - ov) * s]
  return { s, px: s * g.k, ext: size * g.k, cx: g.X(x), cy: g.Y(y), at, P: (p) => g.P(at(p)), flip }
}
const mapD = (F, d) => d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, u, v) => P2(F.P([+u, +v])))
const curveD = (F, pts) => {
  const p = pts.map(F.P), n = p.length
  let d = `M${P2(p[0])}`
  for (let i = 0; i < n - 1; i++) {
    const a = p[Math.max(0, i - 1)], b = p[i], c = p[i + 1], e = p[Math.min(n - 1, i + 2)]
    d += `C${f(b[0] + (c[0] - a[0]) / 6)},${f(b[1] + (c[1] - a[1]) / 6)} ${f(c[0] - (e[0] - b[0]) / 6)},${f(c[1] - (e[1] - b[1]) / 6)} ${P2(c)}`
  }
  return d
}
const lineD = (F, pts) => `M${pts.map((p) => P2(F.P(p))).join(' L')}`
const ellD = (F, u, v, rx, ry, rot = 0) => {
  const c = Math.cos(rad(rot)), s = Math.sin(rad(rot)), K = 0.5523
  const q = [[rx, 0], [rx, K * ry], [K * rx, ry], [0, ry], [-K * rx, ry], [-rx, K * ry], [-rx, 0], [-rx, -K * ry], [-K * rx, -ry], [0, -ry], [K * rx, -ry], [rx, -K * ry], [rx, 0]].map(([a, b]) => P2(F.P([u + a * c - b * s, v + a * s + b * c])))
  return `M${q[0]} C${q[1]} ${q[2]} ${q[3]} C${q[4]} ${q[5]} ${q[6]} C${q[7]} ${q[8]} ${q[9]} C${q[10]} ${q[11]} ${q[12]} Z`
}

/**
 * The context a kind draws with: `c.S(pts)` a smooth closed outline, `c.O(pts)` an open smooth curve, `c.L(pts)` straight
 * segments, `c.M(d)` a path in local units (absolute M L C Q Z), `c.E(u, v, rx, ry, rot)` and `c.C(u, v, r)` ellipses,
 * `c.T(segs, w0, w1)` a tapered band along Béziers; `c.body(sub, ds, pal, o)` a filled body with its outline (several
 * outlines as one), `c.far(...)` the same in the shadow tone, `c.tube(pts, width, pal)` a limb or stalk drawn as a stroke
 * with an outline, `c.line(d, colour, width)` a fine line, `c.eye(u, v, r)`, `c.back(pts, pal)` the pale line along a back.
 * `c.big` is 60 px or more on the page, `c.shaded` 80 px or more, `c.tiny` under 40 px.
 */
const ctx = (g, F, id, w, turn) => {
  const defs = [], ss = strokeScale()
  const c = {
    g, F, id, w, defs, turn, lw: Math.max(1.1, w * 0.42), big: F.ext >= 60, shaded: F.ext >= 80, tiny: F.ext < 40,
    S: (pts) => smoothD(pts.map(F.P)), O: (pts) => curveD(F, pts), L: (pts) => lineD(F, pts), M: (d) => mapD(F, d),
    E: (u, v, rx, ry, rot = 0) => ellD(F, u, v, rx, ry, rot), C: (u, v, r) => ellD(F, u, v, r, r),
    T: (segs, w0, w1, wf) => smoothD(band(chain(segs), w0, w1, wf).map(F.P)),
    fill: fillD, stroke: strokeD,
    /** A body: `ds` (one path or several, drawn as one outline) filled in `pal`; o.tone 'base' | 'shadow' | 'small' | 'light',
     *  o.flat (no gradient), o.gloss (the gloss of a closed round body), o.w (outline), o.outline (false: none). */
    body: (sub, ds, pal, o = {}) => {
      ds = [].concat(ds).filter(Boolean)
      const ow = o.w ?? w, tone = o.tone ?? 'base', key = `${id}-${sub}`
      let fill = pal[tone], s = ''
      const box = boxOf(ds.join(' ')), size = Math.max(box[2] - box[0], box[3] - box[1])
      const glossy = o.gloss && glossOn() && size >= 40
      if (glossy || (tone === 'base' && !o.flat && size >= 80)) {
        const T = glossTones(pal)
        defs.push(lin(`${key}-gradient`, box, pal.base, glossy ? T.end : pal.shadow)); fill = `url(#${key}-gradient)`
      }
      if (ds.length > 1 && o.outline !== false) s += ds.map((d) => fillD(d, pal.outline, pal.outline, 2 * ow)).join('')
      s += ds.map((d) => fillD(d, fill)).join('')
      if (glossy) {
        const G = gloss({ fills: ds.map(pathPoints) }, { inset: (ow * ss) / 2, turn, about: [F.cx, F.cy] }), T = glossTones(pal)
        s += ['shade', 'shadow', ...(size >= 90 ? ['lit', 'highlight'] : [])].map((k) => (G[k] ? `<path d="${G[k]}" fill="${T[k]}"/>` : '')).join('')
      }
      if (o.inner) s += o.inner
      if (ds.length === 1 && o.outline !== false) s += fillD(ds[0], 'none', o.stroke ?? pal.outline, ow)
      return s
    },
    /** A limb, stalk or tail along local points (or a page path from c.M, c.L …), `width` local units wide, as a stroke over a wider outline stroke. */
    tube: (pts, width, pal, o = {}) => {
      const d = typeof pts === 'string' ? pts : o.straight ? lineD(F, pts) : curveD(F, pts), W = Math.max(0.8, width * F.px) / ss
      return strokeD(d, o.outline ?? pal.outline, W + 2 * (o.w ?? w * 0.8), o.cap ?? 'round') + strokeD(d, o.fill ?? pal[o.tone ?? 'base'], W, o.cap ?? 'round')
    },
    /** A fine line: a page path (from c.M, c.O …) or local points (a smooth curve). */
    line: (d, colour, width = w * 0.42, extra = '') => strokeD(typeof d === 'string' ? d : curveD(F, d), colour, width, 'round', extra),
    /** A rounded rectangle in local units. */
    R: (u, v, wd, ht, r = 0) => {
      const q = Math.min(r, wd / 2, ht / 2), K = 0.45
      if (!q) return lineD(F, [[u, v], [u + wd, v], [u + wd, v + ht], [u, v + ht]]) + 'Z'
      return mapD(F, `M${u + q},${v} L${u + wd - q},${v} C${u + wd - q * K},${v} ${u + wd},${v + q * K} ${u + wd},${v + q} L${u + wd},${v + ht - q} C${u + wd},${v + ht - q * K} ${u + wd - q * K},${v + ht} ${u + wd - q},${v + ht} L${u + q},${v + ht} C${u + q * K},${v + ht} ${u},${v + ht - q * K} ${u},${v + ht - q} L${u},${v + q} C${u},${v + q * K} ${u + q * K},${v} ${u + q},${v} Z`)
    },
    /** The eye of every animal: a dark dot with a tiny light from 60 px. */
    eye: (u, v, r = 2.4) => {
      const R = Math.max(1.1 / F.px, r)
      return fillD(ellD(F, u, v, R, R), INK) + (c.big ? fillD(ellD(F, u - (F.flip ? -0.33 : 0.33) * R, v - 0.35 * R, R * 0.34, R * 0.34), '#FFFFFF') : '')
    },
    /** The pale line along a back (from 80 px), as the lab mouse. */
    back: (pts, pal, k = 1) => (c.shaded ? strokeD(curveD(F, pts), pal.light, Math.max(2, w * 0.8 * k)) : ''),
  }
  return c
}
/** Runs a kind of a body plan: its box, flip and turn, and the group round it. */
function draw(KINDS, plan, g, { x, y, size, turn = 0, id, w, flip = false, kind, ...options }) {
  const K = KINDS[kind]
  if (!K) throw new Error(`${plan}: no kind '${kind}'`)
  id ??= kind.replace(/[^\w]+/g, '-')
  const F = frame(g, x, y, size, K.box, flip)
  const c = ctx(g, F, id, w ?? objW(F.ext), turn)
  const r = K.draw(c, options)
  return { defs: c.defs.join('') + (r.defs ?? ''), body: group(id, F, turn, r.body), parts: uniq(r.parts) }
}

// =====================================================================================================================
// Mammal seen from the side, facing left (`flip` for right), `size` its length with the tail. Kinds: 'mouse' (white fur,
// pink ears, feet and tail), 'rat' (larger, small ears, ringed tail), 'naked mole-rat' (wrinkled pink skin, long yellow
// incisors, tiny eye), 'guinea pig' (rotund, tailless, golden with a white saddle), 'rabbit' (sitting, long ears), 'dog'
// (tan, floppy ear), 'pig' (pink, snout disc, curly tail), 'cow' (white with black patches, horns, pink muzzle and udder),
// 'sheep' (scalloped fleece, dark face), 'horse' (chestnut, mane and tail), 'elephant' (grey, trunk, tusk, great ear),
// 'marmoset' (crouched on a branch, white ear tufts, banded tail). Options: fur (a palette for the coat; each kind has its
// own), collar (the dog: a collar with a tag in ACCENT), old (the dog: a greying muzzle and brow and a cloudy eye),
// branch (the marmoset: true). Far legs in the coat's shadow tone; whiskers, fur and wrinkle lines from 60 px.
// Used by: Mouse, Rat, Naked mole-rat, Guinea pig, Rabbit, Dog, Ageing companion dog, Pig, Cow, Sheep, Horse, Elephant,
//   Marmoset, Parabiosis (two mice), Life cycle and scene icons that need a mammal.
// Example: mammal(g, { x: 0, y: 0, size: 60, kind: 'dog', old: true, collar: true, id: 'dog' })
// =====================================================================================================================
const whiskers = (c, pts, colour) => (c.big ? c.line(c.L(pts[0]) + ' ' + c.L(pts[1]) + ' ' + c.L(pts[2]), colour, Math.max(0.9, c.w * 0.22)) : '')
const MAMMALS = {
  mouse: {
    box: [-52, -31, 51, 25],
    draw: (c, { fur = MOUSE }) => {
      let s = `<g id="${c.id}-tail">${c.body('tail', c.T([[26, 10, 38, 12, 48, 6, 49, -8], [49, -8, 50, -18, 46, -26, 39, -30]], 4.5, 1.6), PINK, { tone: 'shadow', w: c.w * 0.8, flat: true })}`
      s += c.body('far-foot', c.E(-19, 22, 4, 2), PINK, { tone: 'shadow', w: c.lw }) + '</g>'
      s += `<g id="${c.id}-fur">` + c.body('fur', c.S([[-46, 10], [-40, 3], [-31, -5], [-20, -11], [-6, -15], [9, -16], [22, -12], [30, -2], [31, 10], [25, 19], [12, 22], [-6, 22], [-20, 20], [-30, 17], [-39, 14], [-44, 13]]), fur)
      s += c.back([[-8, -11], [2, -12.6], [12, -12], [20, -8]], fur)
      if (c.big) s += c.line(c.M('M6,20 C2,12 6,2 18,0 M-24,19 C-24,16 -23,13 -21,11'), fur.small, c.lw * 0.8)
      s += '</g>' + `<g id="${c.id}-skin">` + c.body('feet', [c.E(-27, 22.5, 4.5, 2.2), c.E(14, 23, 7, 2.4)].join(' '), PINK, { tone: 'shadow', w: c.lw, outline: true })
      s += c.body('ear', c.E(-19, -13, 9.5, 11, -15), fur, { w: c.w * 0.8, flat: true }) + c.fill(c.E(-18.5, -13, 5.8, 7.2, -15), PINK.shadow)
      s += c.fill(c.C(-45.3, 9.3, 2.3), PINK.small) + '</g>'
      s += c.eye(-33, -1, 2.6) + whiskers(c, [[[-40, 8], [-51, 3]], [[-40, 10], [-52, 10]], [[-40, 12], [-50, 16]]], fur.outline)
      return { body: s, parts: [['fur', fur], ['skin', PINK]] }
    },
  },
  rat: {
    box: [-52, -24, 53, 40],
    draw: (c, { fur = RAT }) => {
      const C = chain([[34, 0, 44, 2, 50, 10, 50, 20], [50, 20, 50, 30, 44, 37, 35, 38]], 8)
      let s = `<g id="${c.id}-tail">${c.body('tail', c.S(band(C, 6, 1.4)), PINK, { tone: 'shadow', w: c.w * 0.8, flat: true })}`
      if (c.big) s += c.line(C.slice(3, -2).filter((_, i) => i % 2 === 0).map((p, i, A) => { const q = C[C.indexOf(p) + 1], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy), w = 2.6 * (1 - C.indexOf(p) / C.length * 0.6); return c.L([[p[0] - dy / l * w, p[1] + dx / l * w], [p[0] + dy / l * w, p[1] - dx / l * w]]) }).join(' '), PINK.outline, c.lw * 0.6)
      s += c.body('far-foot', c.E(-17, 13.5, 4.5, 2), PINK, { tone: 'shadow', w: c.lw }) + '</g>'
      s += `<g id="${c.id}-fur">` + c.body('fur', c.S([[-48, -2], [-42, -9], [-32, -15], [-20, -19], [-4, -23], [14, -23], [28, -18], [36, -8], [36, 3], [28, 10], [12, 13], [-6, 13], [-22, 10], [-32, 6], [-41, 3], [-46, 1]]), fur)
      s += c.back([[-12, -18], [0, -20], [12, -20], [22, -16]], fur)
      if (c.big) s += c.line(c.M('M10,12 C4,4 8,-6 22,-8 M-26,9 C-26,6 -25,4 -23,2'), fur.small, c.lw * 0.8)
      s += '</g>' + `<g id="${c.id}-skin">` + c.body('feet', [c.E(-29, 14, 5, 2.2), c.E(14, 14.5, 7.5, 2.4)], PINK, { tone: 'shadow', w: c.lw })
      s += c.body('ear', c.E(-21, -19, 7, 8, -15), fur, { w: c.w * 0.8, flat: true }) + c.fill(c.E(-20.5, -19, 4, 5, -15), PINK.shadow)
      s += c.fill(c.C(-47.3, -1.4, 2.2), PINK.small) + '</g>'
      s += c.eye(-35, -9, 2.4) + whiskers(c, [[[-42, -1], [-52, -6]], [[-42, 1], [-52, 1]], [[-42, 3], [-51, 8]]], fur.outline)
      return { body: s, parts: [['fur', fur], ['skin', PINK]] }
    },
  },
  'naked mole-rat': {
    box: [-52, -21, 52, 24],
    draw: (c, { fur = MOLE_RAT }) => {
      const fleg = (x) => c.M(`M${x - 4.5},9 C${x - 4.5},13 ${x - 3},16.5 ${x - 3.4},19.2 C${x - 5.6},19.6 ${x - 9},19.9 ${x - 10.2},21.3 C${x - 10.8},22.8 ${x - 9.6},23.4 ${x - 8},23.4 L${x + 0.5},23.4 C${x + 2.4},23.4 ${x + 2.8},21.8 ${x + 1.8},20 C${x + 1.6},16.5 ${x + 3.5},13 ${x + 5},9 Z`)
      const hleg = (x) => c.M(`M${x - 2},10 C${x - 3},14 ${x - 1},17 ${x + 2},19.4 C${x - 1},19.8 ${x - 5.5},20 ${x - 6.6},21.6 C${x - 7},23 ${x - 5.8},23.4 ${x - 4},23.4 L${x + 7},23.4 C${x + 9.4},23.4 ${x + 9.8},21.4 ${x + 9},19.4 C${x + 10.5},15.5 ${x + 11.5},12 ${x + 11},8 Z`)
      const tooth = (x, y, L) => c.M(`M${x - 2.4},${y} C${x - 2.4},${y + L * 0.5} ${x - 3.8},${y + L * 0.8} ${x - 6.6},${y + L + 0.2} C${x - 7.2},${y + L + 2.4} ${x - 3.8},${y + L + 2.6} ${x - 3.2},${y + L} C${x - 0.8},${y + L * 0.75} ${x + 2.4},${y + L * 0.45} ${x + 2.4},${y} Z`)
      const body = c.S([[-46, -3], [-47.5, 2], [-46, 6.5], [-40, 9.5], [-32, 11.5], [-24, 14], [-10, 17.5], [5, 18.5], [18, 17], [28, 15], [38, 10.5], [45, 2], [44, -6], [36, -13], [22, -17], [6, -18], [-10, -17], [-22, -14.5], [-32, -11], [-40, -7.5]])
      let s = `<g id="${c.id}-far-legs">${c.body('far-legs', [fleg(-19), hleg(31)], fur, { tone: 'shadow' })}</g>`
      s += `<g id="${c.id}-teeth">${c.body('teeth', [tooth(-40.5, 3, 14), tooth(-44.8, 3, 15)], TOOTH, { w: c.lw })}</g>`
      s += `<g id="${c.id}-skin">` + c.body('skin', [body, c.M('M42,-1 C47,0 50,4 51,9 C51.4,11 49.6,11.6 48.8,10 C47,6.5 45,5 41,5 Z'), fleg(-27), hleg(20)], fur)
      s += c.back([[-12, -14], [2, -15.5], [16, -15], [28, -12]], fur)
      if (c.big) s += c.line([[-24, -12.5, 15], [-20, -13.5, 17], [-16, -14.5, 16], [-2, -16, 14], [13, -16, 15], [24, -13.5, 12], [29, -11.5, 10], [34, -9, 8]].map(([x, y, L]) => c.M(`M${x},${y} C${x - 3.5},${y + L * 0.35} ${x - 3.5},${y + L * 0.7} ${x - 1},${y + L}`)).join(' ') + ' ' + c.M('M-37,9.5 C-34,11.5 -30,11.5 -27,10 M37,-1 C35,6 30,11 23,14'), fur.small, c.lw * 0.75)
      s += c.fill(c.M('M-46.6,-3.6 C-45.2,-4.4 -44,-2 -44.8,-0.2 C-45.6,0.8 -47.4,0.2 -47.4,-1.6 Z'), fur.small) + '</g>'
      s += c.eye(-37, -4, 1.5) + whiskers(c, [[[-43, -2], [-51, -6]], [[-43, 0], [-52, -1]], [[-43, 2], [-51, 4]]], fur.outline)
      return { body: s, parts: [['skin', fur], ['teeth', TOOTH]] }
    },
  },
  'guinea pig': {
    box: [-53, -37, 48, 27],
    draw: (c, { fur = GOLDEN }) => {
      const P = [[-46, 2], [-44, -10], [-36, -22], [-24, -28], [-8, -29], [10, -28], [28, -24], [42, -14], [47, 0], [44, 14], [34, 22], [16, 25], [-6, 25], [-24, 22], [-38, 16], [-45, 10]]
      const O = smoothPts(P, 8), arc = (i, j) => O.slice(i * 8, j * 8 + 1)
      let s = `<g id="${c.id}-feet">${c.body('far-feet', [c.E(-27, 24, 5, 2.6), c.E(27, 23, 6, 2.6)], CREAM, { tone: 'shadow', w: c.lw })}</g>`
      s += `<g id="${c.id}-fur">` + c.body('fur', c.S(P), fur, { outline: false })
      // the white saddle and the white muzzle follow the outline exactly (points of the outline itself)
      s += `</g><g id="${c.id}-white">` + c.fill(c.S([...arc(4, 6), [18, -4], [6, 14], ...arc(11, 12), [-2, 10], [-8, -8]]), CREAM.base)
      s += c.fill(c.S([...arc(15, 16), ...O.slice(0, 9), [-40, -6], [-38, 4]]), CREAM.base) + '</g>'
      s += `<g id="${c.id}-outline">${c.fill(c.S(P), 'none', fur.outline, c.w)}`
      s += c.back([[-4, -22], [4, -24], [12, -24], [20, -21]], CREAM)
      if (c.big) s += c.line(c.M('M30,-14 L33,-10 M36,-6 L39,-3 M34,4 L38,6 M24,14 L27,17'), fur.small, c.lw * 0.8)
      s += '</g>' + `<g id="${c.id}-near-feet">${c.body('feet', [c.E(-17, 24.5, 5, 2.6), c.E(16, 25, 6.5, 2.6)], CREAM, { tone: 'shadow', w: c.lw })}</g>`
      s += `<g id="${c.id}-ear">${c.body('ear', c.M('M-27,-24 C-30,-33 -20,-37 -15,-31 C-12,-27 -15,-21 -20,-20 C-24,-19 -26,-21 -27,-24 Z'), fur, { tone: 'shadow', w: c.w * 0.8 })}</g>`
      s += c.eye(-33, -12, 2.8) + (c.big ? c.line(c.M('M-46,-1.5 L-44,0.5 L-44,3.5 C-42.5,5 -41,5.2 -39.5,4.6'), fur.outline, c.lw * 0.8) : '') + whiskers(c, [[[-40, 0], [-52, -5]], [[-40, 2], [-52, 2]], [[-40, 4], [-51, 8]]], fur.outline)
      return { body: s, parts: [['fur', fur], ['white fur', CREAM]] }
    },
  },
  rabbit: {
    box: [-53, -50, 46, 34],
    draw: (c, { fur = RABBIT }) => {
      let s = `<g id="${c.id}-far-ear">${c.body('far-ear', c.S([[-27, -18], [-26, -30], [-23, -42], [-18, -50], [-13, -49], [-12, -40], [-15, -28], [-18, -17]]), fur, { tone: 'shadow' })}</g>`
      s += `<g id="${c.id}-ear">${c.body('ear', c.S([[-22, -17], [-17, -30], [-9, -42], [-2, -47], [3, -44], [0, -34], [-8, -22], [-12, -14]]), fur)}${c.fill(c.S([[-16, -22], [-12, -31], [-6, -40], [-1, -43], [0, -39], [-4, -31], [-10, -21]]), PINK.base)}</g>`
      s += `<g id="${c.id}-tail">${c.body('tail', c.C(38, 3, 7), fur, { tone: 'light' })}</g>`
      s += `<g id="${c.id}-fur">` + c.body('fur', [c.S([[-47, -4], [-44, -12], [-36, -19], [-26, -21], [-18, -17], [-8, -13], [6, -11], [20, -8], [32, -2], [40, 8], [41, 18], [35, 26], [22, 30], [6, 30], [-8, 28], [-16, 22], [-20, 14], [-28, 8], [-38, 6], [-45, 2]])], fur)
      s += c.back([[-6, -9], [6, -10], [16, -7], [24, -3]], fur)
      if (c.big) s += c.line(c.M('M34,26 C20,26 10,18 12,6 C14,-2 22,-4 28,-2'), fur.small, c.lw * 0.8)
      s += c.body('hind-foot', c.S([[-6, 30.5], [-2, 28], [10, 27], [22, 25.5], [31, 25], [36, 28.5], [33, 33.5], [18, 33.8], [2, 33.8], [-5, 33]]), fur, { flat: true, w: c.w * 0.9 })
      s += c.body('fore-leg', c.S([[-25, 9], [-15, 11], [-14, 22], [-13, 29], [-17, 33], [-27, 32.5], [-26, 28], [-25, 18]]), fur, { flat: true, w: c.w * 0.9 }) + '</g>'
      s += c.eye(-33, -9, 3) + `<g id="${c.id}-nose">${c.fill(c.E(-46, -3.6, 1.8, 1.4), PINK.small)}</g>` + whiskers(c, [[[-42, -2], [-52, -6]], [[-42, 0], [-52, 0]], [[-42, 2], [-51, 5]]], fur.outline)
      return { body: s, parts: [['fur', fur], ['skin', PINK]] }
    },
  },
  dog: {
    box: [-49, -31, 46, 41],
    draw: (c, { fur = DOG, collar = false, old = false }) => {
      if (old && fur === DOG) fur = OLD_DOG // a faded, greyer coat (review of 23 November 2026: too close to Dog)
      const fl = (x) => c.M(`M${x - 3},4 C${x - 3},16 ${x - 2},26 ${x - 2},34 C${x - 4},35 ${x - 7},36 ${x - 7},38.5 C${x - 7},40 ${x - 5},40.5 ${x - 3},40.5 L${x + 5},40.5 C${x + 6},40.5 ${x + 6},39 ${x + 5.5},37.5 L${x + 5.5},30 C${x + 6},22 ${x + 7},12 ${x + 8},4 Z`)
      const hl = (x) => c.M(`M${x},2 C${x + 1},12 ${x + 5},18 ${x + 7},24 L${x + 7},33.5 C${x + 5},34.5 ${x + 2.5},36 ${x + 2.5},38.5 C${x + 2.5},40 ${x + 4},40.5 ${x + 6},40.5 L${x + 14},40.5 C${x + 15.5},40.5 ${x + 15.5},39 ${x + 15},37.5 L${x + 14.5},27 C${x + 17},22 ${x + 20},14 ${x + 18},2 Z`)
      const body = c.S([[-48, -15], [-46.5, -11], [-41, -8.5], [-33, -7], [-28, -2], [-25, 6], [-19, 11], [-8, 11.5], [4, 9], [15, 8], [25, 10], [33, 8], [36, 0], [35, -8], [28, -12], [12, -12], [-6, -12.5], [-17, -16], [-23, -24], [-29, -29.5], [-36, -28.5], [-41, -21.5]])
      let s = `<g id="${c.id}-fur">` + c.body('tail', c.T([[31, -6, 38, -9, 43, -16, 45, -29]], 5.5, 2), fur, { flat: true })
      s += c.body('far-legs', [fl(-13), hl(10)], fur, { tone: 'shadow' }) + c.body('body', [body, fl(-20), hl(16)], fur)
      s += c.back([[-8, -10], [4, -11], [16, -11], [26, -10]], fur)
      if (c.big) s += c.line(c.M('M-22,6 C-21,0 -18,-3 -14,-4 M18,7 C17,1 21,-4 30,-5'), fur.small, c.lw * 0.8)
      if (old) s += c.fill(c.S([[-47.5, -14], [-44, -9.5], [-38, -8], [-33, -7.5], [-31, -12], [-34, -16], [-40, -17], [-45, -17]]), HAIR.grey.base) + c.fill(c.E(-37, -24.5, 3.6, 1.6, -10), HAIR.grey.base)
      s += '</g>'
      if (collar) s += `<g id="${c.id}-collar">${c.tube([[-20, -17], [-22, -11], [-25, -6], [-28, -3]], 3, ACCENT, { w: c.lw })}${c.body('tag', c.C(-27, -1, 2.2), rich(90), { w: c.lw * 0.8, flat: true })}</g>`
      s += `<g id="${c.id}-ear">${c.body('ear', c.M('M-30,-28 C-24,-30 -20,-25 -21,-18 C-21.5,-13 -23.5,-9.5 -26.5,-10 C-29.5,-10.5 -29.5,-15 -30.5,-19 C-31.5,-22 -32.5,-26 -30,-28 Z'), fur, { tone: 'small', w: c.w * 0.85 })}</g>`
      s += c.eye(-37, -20.5, 2.4)
      if (old && c.big) s += c.fill(c.C(-37, -20.5, 1.5), mixHex(INK, '#C8D2DC', 0.6))
      s += `<g id="${c.id}-nose">${c.fill(c.E(-46.5, -14.5, 3, 2.6), INK)}${c.big ? c.line(c.M('M-45.5,-10 C-43,-8.5 -40,-8.5 -37.5,-9.5'), fur.outline, c.lw * 0.8) : ''}</g>`
      const parts = [['fur', fur]]
      if (collar) parts.push(['collar', ACCENT])
      return { body: s, parts }
    },
  },
  pig: {
    box: [-53, -36, 51, 34],
    draw: (c, { fur = PIG }) => {
      const leg = (x) => c.M(`M${x - 5.5},6 C${x - 5.5},16 ${x - 4.5},22 ${x - 4},29 L${x + 4},29 C${x + 4.5},22 ${x + 5.5},16 ${x + 5.5},6 Z`)
      const trot = (x) => c.R(x - 4.5, 28, 9, 6, 1.5)
      let s = `<g id="${c.id}-skin">` + c.line(c.M('M41,-6 C46,-8 49,-4 46,0 C44,2 41,-1 43,-3 C45,-5 49,-6 50,-10'), fur.outline, Math.max(1.6, c.w * 0.55))
      s += c.body('far-legs', [leg(-12), leg(18)], fur, { tone: 'shadow' }) + c.body('far-trotters', [trot(-12), trot(18)], fur, { tone: 'small', w: c.lw })
      s += c.body('far-ear', c.S([[-18, -21], [-20, -30], [-24, -35], [-28, -30], [-27, -21]]), fur, { tone: 'shadow', w: c.w * 0.85 })
      s += c.body('body', [c.S([[-48, -9], [-40, -13], [-30, -19], [-16, -22], [2, -24], [20, -22], [34, -16], [42, -6], [42, 6], [35, 15], [20, 19], [2, 20], [-14, 18], [-26, 13], [-36, 8], [-43, 4], [-48, 2]]), leg(-22), leg(28)], fur)
      s += c.body('trotters', [trot(-22), trot(28)], fur, { tone: 'small', w: c.lw })
      s += c.back([[-10, -19], [4, -21], [16, -20], [26, -17]], fur)
      if (c.big) s += c.line(c.M('M-20,15 C-24,6 -24,-4 -20,-12 M26,17 C21,8 22,-3 30,-10 M-46,5 C-42,7.5 -38.5,7 -36.5,4.5'), fur.small, c.lw * 0.8)
      s += c.body('snout', c.E(-48.5, -3.5, 3.6, 6.5), fur, { tone: 'shadow', w: c.w * 0.85 }) + c.fill(c.E(-48.6, -6, 1.1, 1.6) + c.E(-48.6, -1, 1.1, 1.6), fur.outline)
      s += c.body('ear', c.S([[-26, -20], [-30, -28], [-36, -33], [-41, -32], [-40, -26], [-36, -18], [-31, -14]]), fur, { w: c.w * 0.85, flat: true }) + '</g>'
      s += c.eye(-34, -9, 2.2)
      return { body: s, parts: [['skin', fur]] }
    },
  },
  cow: {
    box: [-54, -36, 50, 40],
    draw: (c, { fur = COW, patch = COW_PATCH }) => {
      const body = c.S([[-24, -16], [-10, -19], [6, -18], [22, -19], [35, -21], [43, -15], [45, -4], [42, 8], [36, 14], [22, 16], [6, 15], [-8, 16], [-18, 13], [-26, 6], [-30, -4], [-30, -10]])
      const head = c.S([[-27, -16], [-32, -23], [-38, -25], [-44, -21], [-47, -12], [-50, -2], [-51, 5], [-47, 10], [-41, 9], [-37, 3], [-32, -4], [-25, -7]])
      const dew = c.S([[-36, -2], [-32, 8], [-24, 13], [-20, 4], [-28, -6]])
      const lf = c.M('M-22,6 C-21,18 -20,26 -20,34 L-20,39 L-12,39 L-12,34 C-12,26 -12,18 -10,8 Z'), lh = c.M('M24,6 C28,14 30,20 30,28 L30,39 L38,39 L38,30 C38,22 42,14 42,4 Z')
      let s = `<g id="${c.id}-tail">${c.line(c.M('M43,-14 C48,-8 48,6 46,18'), fur.outline, Math.max(1.4, c.w * 0.55))}${c.fill(c.E(46, 21, 2.6, 4.6), patch.base)}</g>`
      s += `<g id="${c.id}-coat">` + c.body('far-legs', [c.M('M-14,8 C-13,18 -12,26 -12,34 L-12,38 L-5,38 L-5,34 C-5,26 -4,18 -2,8 Z'), c.M('M16,8 C20,14 22,20 22,28 L22,38 L29,38 L29,30 C29,22 32,14 32,6 Z')], fur, { tone: 'shadow' })
      s += c.fill(c.R(-12.5, 34.5, 8, 4, 1) + ' ' + c.R(21.5, 34.5, 8, 4, 1), patch.outline) + '</g>'
      s += `<g id="${c.id}-udder">${c.body('udder', c.M('M10,13 C10,21 14,24 18,24 C22,24 26,21 26,13 Z'), PINK, { w: c.lw })}${c.big ? c.line(c.M('M13.5,23.5 L13.5,26.5 M18,24.2 L18,27.2 M22.5,23.5 L22.5,26.5'), PINK.outline, c.lw) : ''}</g>`
      s += `<g id="${c.id}-coat-near">` + c.body('far-ear', c.E(-26, -20, 8, 3.6, -18), fur, { tone: 'shadow', w: c.w * 0.85 })
      s += c.body('body', [body, head, dew, lf, lh], fur, { outline: true }) + c.fill(c.R(-20.5, 35, 9, 4.5, 1) + ' ' + c.R(29.5, 35, 9, 4.5, 1), patch.outline) + '</g>'
      s += `<g id="${c.id}-patches">` + c.fill([c.S([[-16, -12], [-6, -15], [2, -12], [2, -4], [-4, 2], [-12, 0], [-18, -4]]), c.S([[12, -14], [24, -16], [32, -10], [30, -2], [22, 4], [14, 2], [10, -6]]), c.S([[29, 5], [36, 3], [39, 8], [33, 11]]), c.S([[-37, -24], [-31, -21], [-29, -12], [-32, -7], [-35, -14]])].join(' '), patch.base) + '</g>'
      s += c.back([[-6, -16], [8, -16], [22, -17], [32, -18]], fur)
      if (c.big) s += c.line(c.M('M30,-19 C28,-13 30,-7 34,-3 M-20,10 C-17,4 -15,-2 -15,-8'), fur.small, c.lw * 0.8)
      s += `<g id="${c.id}-horn">${c.body('horn', c.M('M-36,-23 C-37,-29 -35,-33 -31,-35 C-32,-30 -32,-27 -31,-22 Z'), IVORY, { w: c.lw })}</g>`
      s += `<g id="${c.id}-muzzle">${c.body('muzzle', c.E(-47, 4, 6, 6.8, 12), PINK, { w: c.lw * 1.1 })}${c.fill(c.E(-49.4, 2, 1.2, 2), PINK.outline)}</g>`
      s += c.eye(-40, -12, 2.4)
      return { body: s, parts: [['coat', fur], ['patches', patch], ['skin', PINK]] }
    },
  },
  sheep: {
    box: [-50, -27, 46, 41],
    draw: (c, { fur = FLEECE, face = SHEEP_FACE }) => {
      const N = 14, E0 = Array.from({ length: N }, (_, k) => { const t = (2 * Math.PI * k) / N + 0.1; return [8 + 36 * Math.cos(t), -3 + 21 * Math.sin(t)] })
      let fleece = `M${P2(c.F.P(E0[0]))}`
      E0.forEach((p, k) => { const q = E0[(k + 1) % N], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, ox = mx - 8, oy = (my + 3) * 1.7, l = Math.hypot(ox, oy), h = Math.hypot(q[0] - p[0], q[1] - p[1]) * 0.32; fleece += ` Q${P2(c.F.P([mx + (ox / l) * h, my + (oy / l) * h]))} ${P2(c.F.P(q))}` })
      fleece += ' Z'
      const leg = (x) => c.R(x - 2.6, 10, 5.2, 28, 2.4), hoof = (x) => c.R(x - 3, 36, 6, 5, 1.5)
      let s = `<g id="${c.id}-legs">${c.body('far-legs', [leg(-6), leg(30)], face, { tone: 'light', w: c.w * 0.85 })}${c.fill(hoof(-6) + ' ' + hoof(30), face.outline)}`
      s += c.body('legs', [leg(-14), leg(22)], face, { tone: 'light', w: c.w * 0.85 }) + c.fill(hoof(-14) + ' ' + hoof(22), face.outline) + '</g>'
      s += `<g id="${c.id}-fleece">${c.body('fleece', fleece, fur)}`
      if (c.big) s += c.line(c.M('M-14,-10 C-12,-13 -8,-13 -7,-10 M8,-14 C10,-17 14,-17 15,-14 M28,-6 C30,-9 34,-9 35,-6 M-2,2 C0,-1 4,-1 5,2 M18,6 C20,3 24,3 25,6 M-16,8 C-14,5 -10,5 -9,8'), fur.small, c.lw * 0.8)
      s += '</g>' + `<g id="${c.id}-face">${c.body('ear', c.M('M-26,-16 C-22,-24 -14,-26 -10,-23 C-14,-19 -19,-15 -24,-12 Z'), face, { tone: 'light', w: c.w * 0.8 })}`
      s += c.body('head', c.S([[-30, -18], [-38, -20], [-45, -13], [-49, -3], [-48, 5], [-43, 8], [-36, 4], [-29, -4], [-26, -12]]), face) + '</g>'
      s += `<g id="${c.id}-topknot">${c.body('topknot', c.M('M-42,-16 C-42,-20 -39,-23 -36,-22 C-34,-25 -29,-24 -29,-21 C-26,-21 -24,-17 -25,-14 Q-33,-14 -42,-16 Z'), fur, { w: c.w * 0.8, flat: true })}</g>`
      s += c.eye(-38.5, -8, 2.2)
      return { body: s, parts: [['fleece', fur], ['face', face]] }
    },
  },
  horse: {
    box: [-48, -51, 48, 45],
    draw: (c, { fur = HORSE, mane = MANE }) => {
      const body = c.S([[-47, -17], [-44, -26], [-38, -34], [-31, -40], [-24, -34], [-17, -24], [-10, -15], [2, -13], [16, -14], [28, -13], [36, -6], [38, 4], [33, 12], [22, 14], [6, 15], [-10, 14], [-22, 10], [-28, 2], [-30, -8], [-33, -17], [-37, -21], [-42, -16], [-46, -13]])
      const fl = (dx) => c.M(`M${-26 + dx},2 C${-25.5 + dx},12 ${-23.5 + dx},19 ${-23 + dx},24 L${-22.6 + dx},36 C${-22.6 + dx},38.5 ${-23 + dx},40 ${-23.4 + dx},41.5 L${-17 + dx},41.5 C${-17 + dx},40 ${-17.4 + dx},38 ${-17.4 + dx},36 L${-17.6 + dx},24 C${-17 + dx},19 ${-15 + dx},12 ${-14 + dx},2 Z`)
      const hl = (dx) => c.M(`M${18 + dx},6 C${20 + dx},14 ${25 + dx},18 ${28 + dx},22 C${30 + dx},24.5 ${30.5 + dx},27 ${30 + dx},30 L${29.6 + dx},37 C${29.4 + dx},39 ${28.6 + dx},40.5 ${28 + dx},41.5 L${34.4 + dx},41.5 C${34.2 + dx},40 ${33.8 + dx},38.5 ${33.8 + dx},37 L${34 + dx},29 C${35 + dx},24 ${37 + dx},16 ${36 + dx},4 Z`)
      const hoof = (x0, x1) => c.M(`M${x0},41 L${x1},41 L${x1 + 0.6},44.5 L${x0 - 0.6},44.5 Z`)
      let s = `<g id="${c.id}-tail">${c.body('tail', c.M('M35,-8 C44,-6 47,6 46,20 C45.5,28 44,33 42,37 C40,31 39,24 38,18 C37,10 36,4 34,0 Z'), mane)}</g>`
      s += `<g id="${c.id}-coat">${c.body('far-legs', [fl(7), hl(-7)], fur, { tone: 'shadow' })}</g><g id="${c.id}-far-hooves">${c.fill(hoof(-16.4, -9.4) + ' ' + hoof(21, 27.4), mane.small, mane.outline, c.lw)}</g>`
      s += `<g id="${c.id}-coat-near">${c.body('ear', c.M('M-31,-38 C-32,-44 -30,-48 -26.5,-50 C-25.5,-46 -24.5,-42 -25.5,-37 Z'), fur, { w: c.w * 0.85, flat: true })}`
      s += c.body('body', [body, fl(0), hl(0)], fur)
      s += c.back([[-6, -10], [6, -11], [16, -11], [26, -10]], fur)
      if (c.big) s += c.line(c.M('M-23,-5 C-19,0 -17,6 -18,11 M21,-6 C27,-2 29,5 25,12 M-35,-22 C-38,-26 -38,-31 -34,-33'), fur.small, c.lw * 0.8)
      s += `</g><g id="${c.id}-hooves">${c.fill(hoof(-23.4, -16.4) + ' ' + hoof(28, 34.4), mane.small, mane.outline, c.lw)}</g>`
      s += `<g id="${c.id}-mane">${c.body('mane', [c.M('M-32,-42 C-24,-40 -18,-32 -13,-23 C-11,-18 -8,-15.5 -4,-14 L-9,-13.5 L-12,-16 L-14,-14.5 L-16,-19 L-19,-18 L-20,-24 L-23,-23 L-24,-29 L-27,-28 L-28,-34 L-30.5,-33 Z'), c.M('M-32,-41 C-35,-39 -38,-36 -40,-32 L-37,-33.5 L-36.5,-30 L-34,-35 Z')], mane, { flat: true, w: c.w * 0.75 })}</g>`
      s += c.eye(-34, -29, 2.3) + c.fill(c.E(-44, -18.5, 1.4, 2, 30), fur.outline)
      return { body: s, parts: [['coat', fur], ['mane', mane]] }
    },
  },
  elephant: {
    box: [-51, -38, 48, 43],
    draw: (c, { fur = ELEPHANT, tusk = IVORY }) => {
      const leg = (x0, x1, y1) => c.M(`M${x0},0 C${x0 - 1},14 ${x0 - 1},28 ${x0},${y1} L${x1},${y1} C${x1 + 1},28 ${x1 + 1},14 ${x1},0 Z`)
      const nails = (x0, x1, y1) => c.M(`M${x0 + 2.5},${y1 - 1.5} L${x0 + 5},${y1 - 1.5} M${(x0 + x1) / 2 - 1.2},${y1 - 1.5} L${(x0 + x1) / 2 + 1.3},${y1 - 1.5} M${x1 - 5},${y1 - 1.5} L${x1 - 2.5},${y1 - 1.5}`)
      const trunk = band(chain([[-36, -12, -44, 4, -45, 18, -42, 30], [-42, 30, -40, 36, -44, 40, -48, 36]], 10), 13, 4.5)
      let s = `<g id="${c.id}-skin">${c.body('far-legs', [leg(-10, 3, 40), leg(31, 42, 40)], fur, { tone: 'shadow' })}`
      s += c.line(c.M('M41,-10 C45,-4 46,4 45,12'), fur.outline, Math.max(1.4, c.w * 0.55)) + c.fill(c.M('M43.5,11 L47,11 L46.5,17 L44,16 Z'), fur.outline)
      s += c.body('body', [c.S([[-38, -24], [-32, -33], [-22, -37], [-13, -32], [-4, -30], [10, -31], [24, -29], [36, -22], [42, -10], [42, 4], [36, 10], [22, 12], [4, 12], [-10, 11], [-18, 6], [-26, 0], [-33, -4], [-39, -12]]), c.S(trunk), leg(-24, -10, 42), leg(22, 36, 42)], fur)
      if (c.big) s += c.line(nails(-24, -10, 42) + ' ' + nails(22, 36, 42), fur.light, c.lw * 1.2) + c.line(c.M('M-38,6 L-33.5,7 M-40,12 L-35.5,12.5 M-41,18 L-36.5,18 M-41,24 L-36.5,23.5 M-41,30 L-37,29'), fur.small, c.lw * 0.8)
      s += c.back([[-6, -27], [8, -29], [24, -27], [34, -20]], fur)
      s += `</g><g id="${c.id}-tusk">${c.body('tusk', c.M('M-33,-6 C-37,0 -43,3 -50,1 C-49,-1 -44,-2 -39,-6 C-37,-8 -35,-9 -33,-6 Z'), tusk, { w: c.lw })}</g>`
      s += `<g id="${c.id}-ear">${c.body('ear', c.M('M-24,-30 C-14,-38 2,-36 5,-24 C7,-10 3,4 -5,10 C-9,8 -11,3 -15,1 C-19,-8 -24,-18 -24,-30 Z'), fur, { tone: 'shadow' })}${c.big ? c.line(c.M('M-19,-26 C-10,-30 -2,-26 0,-18 C1,-10 -1,-2 -5,4'), fur.small, c.lw * 0.8) : ''}</g>`
      s += c.eye(-30, -21, 1.9)
      return { body: s, parts: [['skin', fur], ['tusk', tusk]] }
    },
  },
  marmoset: {
    box: [-48, -38, 51, 48],
    draw: (c, { fur = MARMOSET, branch = true }) => {
      const dark = tone(70, 0.36, 0.02), tufts = CREAM
      let s = `<g id="${c.id}-tail">${c.tube([[28, 10], [44, 18], [46, 34], [40, 45], [31, 45], [30, 42]], 5.5, fur)}`
      if (c.big) s += c.line(c.O([[28, 10], [44, 18], [46, 34], [40, 45], [31, 45], [30, 42]]), fur.small, Math.max(1.2, 5.5 * c.F.px / strokeScale()), ' stroke-dasharray="' + f(3 * c.F.px / strokeScale()) + ' ' + f(3.5 * c.F.px / strokeScale()) + '"')
      s += '</g>'
      if (branch) s += `<g id="${c.id}-branch">${c.tube([[-48, 31], [-20, 28.5], [10, 27.5], [48, 23]], 6.5, BARK)}</g>`
      s += `<g id="${c.id}-fur">` + c.tube([[1, 6], [2, 14], [2, 21], [1, 27]], 5, fur, { tone: 'shadow' })
      s += c.body('body', c.S([[-14, -5], [-2, -12], [12, -13], [24, -9], [31, 0], [31, 11], [25, 19], [12, 22], [-2, 21], [-11, 13]]), fur)
      if (c.big) s += c.line(c.M('M6,-11 C10,-6 10,0 8,5 M14,-11 C18,-6 18,1 16,6 M21,-9 C25,-4 25,3 23,8'), fur.small, c.lw * 0.9)
      s += c.body('thigh', c.M('M10,9 C17,3 29,6 28,16 C27,22 22,25 16,27 L8,27 C9,24 12,22 14,21 C10,18 8,13 10,9 Z'), fur, { tone: 'shadow', w: c.w * 0.85 })
      s += c.tube([[-8, 2], [-7, 12], [-9, 20], [-12, 27]], 5.5, fur)
      s += c.body('hands', [c.M('M-18,25.5 C-15,24 -10,24 -8,26.5 L-9,29.5 L-18,29.5 Z'), c.M('M13,25.5 C16,24 21,24 23,26.5 L22,29.5 L13,29.5 Z')], fur, { w: c.lw, flat: true }) + '</g>'
      s += `<g id="${c.id}-tufts">` + c.body('tufts', [c.S(ellPts(-37, -24, 7, 12, -28, 16)), c.S(ellPts(-11, -24, 7, 12, 28, 16))], tufts, { w: c.lw * 1.1, flat: true }) + '</g>'
      s += `<g id="${c.id}-head">${c.body('head', c.C(-24, -16, 13), fur)}${c.fill(c.S([[-24, -23], [-18, -20], [-16, -12], [-19, -6], [-24, -4], [-29, -6], [-32, -12], [-30, -20]]), dark.base)}${c.fill(c.M('M-27,-26 C-25,-28 -23,-28 -21,-26 C-22,-23 -26,-23 -27,-26 Z'), tufts.base)}</g>`
      s += c.eye(-27.5, -15, 2.2) + c.eye(-20.5, -15, 2.2)
      const parts = [['fur', fur], ['ear tufts', tufts]]
      if (branch) parts.push(['branch', BARK])
      return { body: s, parts }
    },
  },
}
export function mammal(g, opts) { return draw(MAMMALS, 'mammal', g, { kind: 'mouse', ...opts }) }

// =====================================================================================================================
// A face seen from the front, for animals whose face is what tells them apart. Kinds: 'cat' (grey, pointed ears with pink
// insides, green eyes with slit pupils, whiskers), 'hamster' (golden with a darker cap, round ears, cream cheek pouches,
// buck teeth), 'macaque' (olive-brown fur round a bare pink face, ears at the sides, a muzzle). Options: fur, skin.
// Used by: Cat, Hamster, Macaque.
// Example: face(g, { x: 0, y: 0, size: 50, kind: 'hamster', id: 'hamster' })
// =====================================================================================================================
const FACES = {
  cat: {
    box: [-47, -48, 47, 34],
    draw: (c, { fur = CAT, skin = PINK, iris = tone(110, 0.84, 0.13) }) => {
      const head = c.S([[0, -27], [16, -26], [30, -19], [38, -5], [41, 9], [35, 22], [20, 31], [0, 34], [-20, 31], [-35, 22], [-41, 9], [-38, -5], [-30, -19], [-16, -26]])
      const eye = (x) => { const k = x < 0 ? -1 : 1; return c.body(`eye${k}`, c.M(`M${x - 7 * k},-3 C${x - 4 * k},-9 ${x + 5 * k},-9 ${x + 8 * k},-3 C${x + 4 * k},2 ${x - 4 * k},2 ${x - 7 * k},-3 Z`), iris, { w: c.lw, flat: true }) + c.fill(c.E(x + 0.5 * k, -3.6, 1.7, 4.4), INK) + (c.big ? c.fill(c.C(x - 1.6 * k, -5.4, 1), '#FFFFFF') : '') }
      let s = `<g id="${c.id}-fur">` + c.body('ears', [c.M('M-36,-10 L-38,-45 C-37,-48 -34,-48 -32,-46 L-9,-25 Z'), c.M('M36,-10 L38,-45 C37,-48 34,-48 32,-46 L9,-25 Z')], fur, { tone: 'shadow' })
      s += c.fill(c.M('M-32,-15 L-33.5,-39 L-16,-24 Z M32,-15 L33.5,-39 L16,-24 Z'), skin.base)
      s += c.body('head', head, fur)
      if (c.big) s += c.line(c.M('M0,-26 L0,-17 M-7,-25.5 L-5,-17.5 M7,-25.5 L5,-17.5 M-40,3 C-35,4 -31,5 -28,7 M-39,10 C-35,10 -32,11 -29,12 M40,3 C35,4 31,5 28,7 M39,10 C35,10 32,11 29,12'), fur.small, c.lw * 1.3)
      s += c.fill(c.M('M0,9 C-6,7 -14,10 -15,17 C-15,24 -7,26 0,22 C7,26 15,24 15,17 C14,10 6,7 0,9 Z'), fur.light) + '</g>'
      s += `<g id="${c.id}-eyes">${eye(-15)}${eye(15)}</g>`
      s += `<g id="${c.id}-nose">${c.body('nose', c.M('M-4.5,8.5 L4.5,8.5 C4.5,11 2,13 0,13.5 C-2,13 -4.5,11 -4.5,8.5 Z'), skin, { w: c.lw, flat: true })}</g>`
      s += c.line(c.M('M0,13.5 L0,16.5 C0,20 -4,21.5 -7.5,19.5 M0,16.5 C0,20 4,21.5 7.5,19.5'), fur.outline, c.lw)
      if (c.big) s += c.line(c.M('M-12,15 L-46,10 M-12,18 L-47,19 M-12,21 L-44,27 M12,15 L46,10 M12,18 L47,19 M12,21 L44,27'), fur.small, c.lw * 0.7)
      return { body: s, parts: [['fur', fur], ['skin', skin], ['eyes', iris]] }
    },
  },
  hamster: {
    box: [-44, -38, 44, 38],
    draw: (c, { fur = GOLDEN, cheeks = CREAM, skin = PINK }) => {
      const head = c.S([[0, -31], [18, -29], [30, -19], [36, -5], [42, 10], [40, 24], [28, 34], [0, 38], [-28, 34], [-40, 24], [-42, 10], [-36, -5], [-30, -19], [-18, -29]])
      let s = `<g id="${c.id}-ears">${c.body('ears', [c.C(-27, -26, 11.5), c.C(27, -26, 11.5)], fur, { tone: 'small' })}${c.fill(c.C(-26, -25, 6.5) + ' ' + c.C(26, -25, 6.5), skin.base)}</g>`
      s += `<g id="${c.id}-fur">` + c.body('head', head, fur, { outline: false })
      s += c.fill(c.M('M-33,-13 C-26,-29 -12,-31 0,-31 C12,-31 26,-29 33,-13 C26,-9 16,-11 9,-7 C5,-5 2,-3 0,-1 C-2,-3 -5,-5 -9,-7 C-16,-11 -26,-9 -33,-13 Z'), fur.shadow) + '</g>'
      s += `<g id="${c.id}-cheeks">${c.fill([c.E(-25, 17, 15, 13), c.E(25, 17, 15, 13), c.E(0, 18, 12, 11)].join(' '), cheeks.base)}</g>`
      s += c.fill(head, 'none', fur.outline, c.w)
      s += c.eye(-15, -4, 4.6) + c.eye(15, -4, 4.6)
      s += `<g id="${c.id}-nose">${c.body('nose', c.M('M-4,6 L4,6 C4,8 2,10 0,10.5 C-2,10 -4,8 -4,6 Z'), skin, { w: c.lw, flat: true })}</g>`
      s += c.line(c.M('M0,10.5 L0,14 M-5,16 C-3,17.5 0,16.5 0,14 C0,16.5 3,17.5 5,16'), fur.outline, c.lw)
      if (c.big) s += c.line(c.M('M-9,13 L-44,8 M-9,16 L-44,17 M9,13 L44,8 M9,16 L44,17'), fur.small, c.lw * 0.7)
      s += `<g id="${c.id}-teeth">${c.body('teeth', c.R(-3.4, 18.5, 6.8, 7, 1.5), IVORY, { w: c.lw, flat: true })}${c.big ? c.line(c.M('M0,18.8 L0,25.2'), IVORY.outline, c.lw * 0.8) : ''}</g>`
      s += `<g id="${c.id}-paws">${c.body('paws', [c.E(-6, 28, 4, 3.2), c.E(6, 28, 4, 3.2)], skin, { w: c.lw, flat: true })}</g>`
      return { body: s, parts: [['fur', fur], ['cheeks', cheeks], ['skin', skin]] }
    },
  },
  macaque: {
    box: [-46, -41, 46, 41],
    draw: (c, { fur = PRIMATE, skin = FACE }) => {
      const R = [[0, -41], [10, -40], [20, -36], [28, -29], [33, -20], [35, -10], [37, 0], [38, 8], [35, 16], [29, 25], [20, 33], [10, 38], [0, 40]]
      let s = `<g id="${c.id}-ears">${c.body('ears', [c.C(-37, -2, 8.5), c.C(37, -2, 8.5)], skin, { w: c.w * 0.85 })}${c.fill(c.C(-37.5, -2, 4.2) + ' ' + c.C(37.5, -2, 4.2), skin.shadow)}</g>`
      s += `<g id="${c.id}-fur">${c.body('fur', c.S(R.concat(R.slice(1, -1).reverse().map(([x, y]) => [-x, y]))), fur)}`
      if (c.big) s += c.line(c.M('M-16,-33 C-10,-30 -5,-28 0,-24 M16,-33 C10,-30 5,-28 0,-24 M0,-40 L0,-26 M-26,-22 C-26,-14 -26,-8 -27,0 M26,-22 C26,-14 26,-8 27,0'), fur.small, c.lw)
      s += `</g><g id="${c.id}-face">${c.body('face', c.S([[0, -20], [10, -24], [19, -21], [24, -12], [22, 0], [17, 13], [10, 22], [0, 25], [-10, 22], [-17, 13], [-22, 0], [-24, -12], [-19, -21], [-10, -24]]), skin)}`
      s += c.fill(c.E(-8, -6, 6.4, 4.8) + ' ' + c.E(8, -6, 6.4, 4.8), skin.shadow)
      s += c.line(c.M('M-18,-11 C-12,-16 -4,-14 0,-11 C4,-14 12,-16 18,-11'), skin.outline, c.lw)
      s += c.body('muzzle', c.S([[0, 1], [8, 2], [13, 8], [12, 16], [6, 21], [0, 22], [-6, 21], [-12, 16], [-13, 8], [-8, 2]]), skin, { tone: 'light', w: c.lw })
      s += c.fill(c.E(-2.6, 7, 1.2, 1.8) + ' ' + c.E(2.6, 7, 1.2, 1.8), skin.outline) + c.line(c.M('M-5.5,15 C-2,15.8 2,15.8 5.5,15'), skin.outline, c.lw) + '</g>'
      s += c.eye(-7.5, -6, 3) + c.eye(7.5, -6, 3)
      return { body: s, parts: [['fur', fur], ['face', skin]] }
    },
  },
}
export function face(g, opts) { return draw(FACES, 'face', g, { kind: 'cat', ...opts }) }

// =====================================================================================================================
// A bat. Kinds: 'spread' (seen from the front, wings open, as the Bat icon) and 'hanging' (Brandt's bat: upside down from
// a branch, wings folded round the body). Options: fur (the body), wing (the membrane; one palette with the fur by default,
// darker), branch ('hanging': true). Used by: Bat, Brandt's bat.
// Example: bat(g, { x: 0, y: 0, size: 60, kind: 'hanging', id: 'myotis' })
// =====================================================================================================================
const BATS = {
  spread: {
    box: [-52, -28, 52, 27],
    draw: (c, { fur = BAT }) => {
      const wingL = (m) => (m ? (d) => d.replace(/(-?\d*\.?\d+),/g, (_, u) => `${-u},`) : (d) => d)
      const side = (m) => {
        const t = wingL(m)
        return c.body(`wing${m}`, c.M(t('M5,-9 C13,-14 19,-18 26,-20 C34,-21 42,-19 48,-14 C43,-8 42,1 44,8 C38,8 33,12 30,19 C24,15 16,14 9,18 L4,10 Z')), fur, { tone: 'small', flat: true })
          + c.fill(c.M(t('M5,-9 C13,-14 19,-18 26,-20 L30,19 C24,15 16,14 9,18 L4,10 Z')), fur.shadow)
          + c.fill(c.M(t('M5,-9 C13,-14 19,-18 26,-20 C34,-21 42,-19 48,-14 C43,-8 42,1 44,8 C38,8 33,12 30,19 C24,15 16,14 9,18 L4,10 Z')), 'none', fur.outline, c.w)
          + c.line(c.M(t('M6,-8.5 C13,-13 19,-16.5 26,-19.5 M26,-19.5 L47,-14.5 M26,-19.5 C34,-13 39,-3 43.5,7 M26,-19.5 C28,-7 29,6 29.8,18.5')), fur.outline, c.lw * 1.1)
          + c.line(c.M(t('M26,-20 L27.5,-24.5 L25.5,-26.5')), fur.outline, c.lw)
      }
      let s = `<g id="${c.id}-wings">${side(0)}${side(1)}${c.body('tail-membrane', c.M('M-9,18 C-6,26 6,26 9,18 L5,10 L-5,10 Z'), fur, { tone: 'shadow', w: c.lw * 1.2, flat: true })}</g>`
      s += `<g id="${c.id}-fur">${c.body('ears', [c.M('M-6.5,-14 L-9,-26.5 L-1.5,-18 Z'), c.M('M6.5,-14 L9,-26.5 L1.5,-18 Z')], fur, { w: c.lw * 1.1, flat: true })}`
      s += c.body('body', [c.E(0, 3, 8.5, 14), c.C(0, -12, 7.5)], fur, { tone: 'light' })
      s += c.fill(c.E(0, -8.5, 3.6, 2.6), fur.base) + c.fill(c.C(-1.2, -9, 0.7) + ' ' + c.C(1.2, -9, 0.7), fur.outline) + '</g>'
      s += c.eye(-3.2, -13, 1.6) + c.eye(3.2, -13, 1.6)
      return { body: s, parts: [['bat', fur]] }
    },
  },
  hanging: {
    box: [-22, -46, 22, 50],
    draw: (c, { fur = BAT, branch = true }) => {
      let s = ''
      if (branch) s += `<g id="${c.id}-branch">${c.body('branch', c.M('M-46,-43 C-30,-46 -10,-45 4,-44 C20,-43 34,-45 46,-43 C47,-40 47,-38 46,-36 C30,-37 14,-37 0,-37 C-16,-37 -32,-36 -46,-37 C-47,-39 -47,-41 -46,-43 Z'), BARK, { flat: true })}</g>`
      s += `<g id="${c.id}-bat">` + c.tube([[-5, -31], [-5, -38]], 2.2, fur, { tone: 'small', straight: true }) + c.tube([[5, -31], [5, -38]], 2.2, fur, { tone: 'small', straight: true })
      if (c.big) s += c.line(c.M('M-7.5,-38 C-8,-44 -3,-45 -2,-42 M2.5,-38 C2,-44 7,-45 8,-42'), fur.outline, c.lw)
      s += c.body('wings', c.S([[0, -34], [10, -31], [17, -20], [20, -4], [18, 12], [12, 23], [4, 27], [-4, 27], [-12, 23], [-18, 12], [-20, -4], [-17, -20], [-10, -31]]), fur, { tone: 'small' })
      if (c.big) s += c.line(c.M('M-15,-18 C-17,-6 -17,6 -14,16 M15,-18 C17,-6 17,6 14,16'), fur.shadow, c.lw)
      s += c.body('belly', c.S([[0, -31], [6, -26], [8, -10], [7, 6], [4, 18], [0, 21], [-4, 18], [-7, 6], [-8, -10], [-6, -26]]), fur, { tone: 'light', w: c.lw * 1.2 })
      s += c.tube([[-14, -22], [-12, -6], [-11, 8], [-8, 21]], 2, fur, { tone: 'shadow', w: c.lw * 0.9 }) + c.tube([[14, -22], [12, -6], [11, 8], [8, 21]], 2, fur, { tone: 'shadow', w: c.lw * 0.9 })
      s += c.body('ears', [c.M('M-7,37 C-12,40 -14,45 -13,49 C-9,48 -6,44 -3,40 Z'), c.M('M7,37 C12,40 14,45 13,49 C9,48 6,44 3,40 Z')], fur, { tone: 'small', w: c.lw * 1.1, flat: true })
      s += c.body('head', c.S([[0, 23], [7, 26], [9, 32], [7, 38], [0, 40], [-7, 38], [-9, 32], [-7, 26]]), fur, { tone: 'light', w: c.lw * 1.2 })
      s += c.fill(c.M('M-3.5,25 C-2,23.5 2,23.5 3.5,25 C3,28.5 -3,28.5 -3.5,25 Z'), fur.base) + '</g>'
      s += c.eye(-3.8, 32.5, 1.5) + c.eye(3.8, 32.5, 1.5)
      const parts = [['bat', fur]]
      if (branch) parts.push(['branch', BARK])
      return { body: s, parts }
    },
  },
}
export function bat(g, opts) { return draw(BATS, 'bat', g, { kind: 'spread', ...opts }) }

// =====================================================================================================================
// A marine mammal seen from the side, facing left. Kinds: 'whale' (blue-grey, pale throat with pleats, flipper, small
// dorsal fin, flukes), 'bowhead' (dark, bowed mouth, white chin with spots, no dorsal fin; `spout` a V of droplets), 'dolphin'
// (beak, tall dorsal fin, pale belly), 'seal' (spotted grey, lying, whiskers, hind flippers). Options: skin, belly, spout.
// Used by: Whale, Bowhead whale, Dolphin, Seal.
// Example: seaMammal(g, { x: 0, y: 0, size: 60, kind: 'bowhead', spout: true, id: 'bowhead' })
// =====================================================================================================================
const SEA_MAMMALS = {
  whale: {
    box: [-50, -29, 52, 29],
    draw: (c, { skin = WHALE, belly = BELLY }) => {
      let s = `<g id="${c.id}-skin">` + c.body('body', [c.S([[-48, 6.5], [-45, -1.5], [-36, -6.5], [-20, -9.5], [-4, -8.5], [10, -6], [22, -4.5], [30, -7.5], [35, -12.5], [38, -17], [41.5, -16], [39, -9.5], [32, -0.5], [22, 7.5], [8, 13.5], [-8, 17.5], [-24, 18.5], [-36, 16.5], [-45, 12.5]]), c.M('M35.5,-14.5 C33,-19 30.5,-24 27.5,-28.5 C33,-28 37,-26 39.8,-22.5 C42.5,-26 46.5,-28 51,-28 C48,-23.5 45,-19 43,-14 Z'), c.M('M9,-5.9 C12.5,-8 15.5,-11 19,-11.8 C18.4,-8.5 18.8,-6.1 20.5,-4.1 Z')], skin)
      s += `</g><g id="${c.id}-belly">${c.fill(c.S([[-46.6, 8.9], [-38, 11.3], [-24, 12.7], [-8, 12.5], [6, 9.9], [20, 4.5], [23.5, 5.9], [8, 12.5], [-8, 16.5], [-24, 17.5], [-36, 15.5], [-44.6, 11.7]]), belly.base)}`
      if (c.big) s += c.line(c.M('M-41,13.1 C-33,15.5 -24,16.7 -12,16.7 M-38,11.3 C-30,13.5 -22,14.5 -10,14.5'), belly.small, c.lw * 0.8)
      s += `</g><g id="${c.id}-skin-near">` + c.back([[-30, -5], [-18, -8], [-4, -7.5], [8, -4.9]], skin)
      s += c.body('flipper', c.M('M-21,13.5 C-15,18.5 -9,24.5 -1,28.5 C-2.5,22.5 -6.5,16.5 -10.5,13 Z'), skin, { tone: 'shadow', w: c.w * 0.85 })
      s += c.line(c.M('M-47.5,7.5 C-42,8.7 -36,8.5 -31,6.5'), skin.outline, c.lw) + '</g>' + c.eye(-29, 2.9, 1.8)
      return { body: s, parts: [['skin', skin], ['belly', belly]] }
    },
  },
  bowhead: {
    box: [-50, -40, 52, 31],
    draw: (c, { skin = BOWHEAD, belly = BELLY, spout = false }) => {
      let s = ''
      if (spout) {
        let d = ''
        ;[[-34, -36], [-6, -36]].forEach(([ex, ey]) => { for (let i = 1; i <= 5; i++) { const t = i / 5; d += c.C(-20 + (ex + 20) * t, -16 + (ey + 16) * t, 1.3 + 2.4 * t) + ' ' } })
        d += [c.C(-38, -30, 2), c.C(-28, -40, 2.2), c.C(-2, -30, 2), c.C(-12, -40, 2.2)].join(' ')
        s += `<g id="${c.id}-spout">${c.fill(d, belly.base, belly.outline, c.lw)}</g>`
      }
      s += `<g id="${c.id}-skin">` + c.body('far-flipper', c.M('M-4,20 C0,26 6,30 13,31 C11,26 8,22 6,19 Z'), skin, { tone: 'shadow', w: c.w * 0.85 })
      s += c.body('body', [c.S([[-48, 5], [-44, -3], [-34, -11], [-22, -15], [-14, -13], [-6, -10], [6, -10], [18, -7], [30, -1], [38, 3], [38, 9], [30, 12], [18, 17], [4, 22], [-10, 25], [-24, 24], [-36, 19], [-44, 13]]), c.M('M36,3 C40,-1 44,-6 50,-9 C52,-9 52,-6 51,-4 C48,1 45,5 42,6 C45,7 48,11 51,15 C52,17 51,19 49,18 C44,16 40,12 36,9 Z')], skin)
      s += `</g><g id="${c.id}-chin">${c.fill(c.M('M-47,8 C-44,14 -38,19 -30,21 C-32,16 -36,12 -40,8 C-43,6 -46,6 -47,8 Z'), belly.base)}`
      if (c.big) { const R = rng(3); let sp = ''; for (let i = 0; i < 7; i++) sp += c.C(-44 + R() * 10, 9 + R() * 7, 0.8) + ' '; s += c.fill(sp, skin.base) }
      s += `</g><g id="${c.id}-skin-near">` + c.line(c.M('M-47,5 C-42,-8 -28,-9 -20,10'), skin.outline, c.lw * 1.2)
      s += c.back([[-36, -10], [-26, -15], [-16, -14], [-8, -11]], skin) + c.back([[2, -9], [12, -9], [22, -6], [30, -2]], skin)
      s += c.body('flipper', c.M('M-6,15 C-1,21 6,26 14,28 C12,23 9,19 6,16 Z'), skin, { w: c.w * 0.85, flat: true }) + '</g>'
      s += c.eye(-17, 7, 1.8)
      const parts = [['skin', skin], ['chin', belly]]
      return { body: s, parts }
    },
  },
  dolphin: {
    box: [-51, -28, 52, 28],
    draw: (c, { skin = DOLPHIN, belly = BELLY }) => {
      const body = c.S([[-50, 8], [-45, 5.5], [-39, 3.5], [-35, -1], [-29, -6], [-18, -9.5], [-4, -10], [10, -8], [24, -3], [36, 3], [45, 7], [45, 10], [36, 12], [22, 16], [6, 19], [-10, 19], [-24, 16], [-34, 13], [-43, 11], [-48, 10]])
      let s = `<g id="${c.id}-skin">` + c.body('flukes', c.M('M42,8 C45,3 48,-3 52,-6 C52,0 51,4 48,8.5 C51,12 52,17 52,22 C48,20 45,15 42,11 Z'), skin, { tone: 'shadow', w: c.w * 0.85 })
      s += c.body('dorsal-fin', c.M('M-6,-9 C-4,-17 2,-24 10,-27 C6,-20 7,-13 14,-7 Z'), skin, { w: c.w * 0.9 })
      s += c.body('body', body, skin, { outline: false }) + `</g><g id="${c.id}-belly">${c.fill(c.S([[-46, 9.5], [-38, 8], [-28, 9.5], [-14, 12.5], [2, 14], [18, 12.5], [30, 11], [36, 11.5], [22, 15.5], [6, 18.5], [-10, 18.5], [-24, 15.5], [-34, 12.5], [-42, 10.5]]), belly.base)}</g>`
      s += `<g id="${c.id}-skin-near">${c.fill(body, 'none', skin.outline, c.w)}` + c.back([[-26, -5], [-14, -8], [2, -8], [18, -4]], skin)
      s += c.body('flipper', c.M('M-24,13 C-22,19 -18,25 -12,28 C-13,22 -14,17 -16,14 Z'), skin, { tone: 'shadow', w: c.w * 0.85 })
      s += c.line(c.M('M-49.5,8.5 C-45,9 -40,8 -35.5,6'), skin.outline, c.lw) + '</g>' + c.eye(-31, 1, 2.2)
      return { body: s, parts: [['skin', skin], ['belly', belly]] }
    },
  },
  seal: {
    box: [-52, -29, 53, 29],
    draw: (c, { skin = SEAL }) => {
      let s = `<g id="${c.id}-skin">` + c.body('flippers', [c.M('M40,7 C44,1 49,-3 52,-1 C52,4 49,8 44,12 Z'), c.M('M40,12 C45,11 50,13 52,18 C48,21 43,19 39,16 Z')], skin, { tone: 'shadow', w: c.w * 0.85 })
      s += c.body('body', c.S([[-49, -13], [-47, -19], [-42, -25], [-35, -28], [-27, -27], [-21, -22], [-14, -14], [-4, -9], [10, -6], [24, -2], [36, 3], [44, 8], [43, 13], [33, 16], [18, 20], [4, 23], [-10, 24], [-21, 22], [-27, 15], [-32, 6], [-38, -2], [-44, -6], [-48, -9]]), skin)
      s += c.back([[-14, -10], [-4, -6.5], [6, -4.5], [18, -1]], skin)
      if (c.big) s += c.fill([[-4, 0, 2.4], [8, 3, 2], [20, 7, 2.4], [-12, 8, 1.8], [3, 13, 2], [29, 10, 1.8], [14, 13, 1.6], [-22, -14, 1.6]].map(([x, y, r]) => c.E(x, y, r, r * 0.8)).join(' '), skin.shadow)
      s += c.body('flipper', c.M('M-22,14 C-20,21 -13,26 -4,27 C-6,22 -10,17 -15,13 Z'), skin, { tone: 'shadow', w: c.w * 0.85 })
      s += c.fill(c.E(-47.3, -14.5, 1.5, 1, -30), INK) + c.line(c.M('M-47.5,-9.5 C-45.5,-7.5 -42.5,-7.5 -40.5,-8.5'), skin.outline, c.lw) + '</g>'
      s += c.eye(-36, -19, 3) + whiskers(c, [[[-44, -11], [-52, -14]], [[-44, -10], [-52, -9]], [[-43, -9], [-51, -5]]], skin.outline)
      return { body: s, parts: [['skin', skin]] }
    },
  },
}
export function seaMammal(g, opts) { return draw(SEA_MAMMALS, 'seaMammal', g, { kind: 'whale', ...opts }) }

// =====================================================================================================================
// A fish seen from the side, facing left. Kinds: 'zebrafish' (slender, pale gold with four blue stripes running into the
// tail), 'killifish' (turquoise, scaled, large rounded orange-red fins), 'medaka' (small, orange, flat back, dashed lateral
// line), 'rockfish' (rougheye rockfish: red, deep body, spiny dorsal fin, rough spines under the large eye, apricot fins),
// 'shark' (Greenland shark: grey, blunt, small eye; `parasite` the pale copepod hanging from its eye). Fish eyes have a
// pale ring round the dot, as fish do. Fin rays and scales from 60 px. Options: body, fins, stripe, parasite.
// Used by: Zebrafish, Killifish, Medaka, Rougheye rockfish, Greenland shark, Killifish ephemeral pond, Low temperature
//   longevity, Life cycle.
// Example: fish(g, { x: 0, y: 0, size: 50, kind: 'zebrafish', id: 'zebrafish' })
// =====================================================================================================================
const fishEye = (c, u, v, r, pal) => c.fill(c.C(u, v, r * 1.55), pal.light, pal.outline, c.lw * 0.8) + c.eye(u, v, r)
const FISH = {
  zebrafish: {
    box: [-49, -19, 50, 19],
    draw: (c, { body = ZEBRAFISH, stripe = STRIPE }) => {
      let s = `<g id="${c.id}-fins">` + c.body('fins', [c.M('M32,-3.5 C38,-6 44,-12 50,-17 C49,-10 46,-4 42.5,0 C46,4 49,10 50,17 C44,12 38,6 32,3.5 Z'), c.M('M2,-11 C7,-18 14,-19 21,-16.5 C20.5,-12 22,-9 24,-6.5 Z'), c.M('M0,10 C5,17 13,18.5 22,15.5 C21,11.5 22,9 24,6 Z'), c.M('M-10,10.5 C-8,15 -5,17 -1,18 C-2,14 -3,12 -3,10.5 Z')], body, { tone: 'shadow' }) + '</g>'
      s += `<g id="${c.id}-stripes-fins">${c.line(c.M('M36,-2.2 C40,-4.5 44,-8 48,-12.5 M36,2.2 C40,4.5 44,8 48,12.5 M8,-13 L17,-15 M6,13 L17,14.5'), stripe.small, Math.max(1.2, 1.4 * c.F.px))}</g>`
      s += `<g id="${c.id}-body">${c.body('body', c.S([[-47, -1], [-44, -5.5], [-38, -9], [-28, -11.5], [-14, -12.5], [0, -11.5], [14, -9], [26, -6], [34, -4], [36, 0], [34, 4], [26, 6], [14, 8.5], [0, 11], [-14, 11.5], [-28, 10], [-38, 7.5], [-44, 4]]), body)}</g>`
      s += `<g id="${c.id}-stripes">${c.line(c.M('M-24,-6 C-6,-7.5 16,-5.5 35,-1.6 M-26,0.5 C-6,0.8 16,0.5 36,0 M-20,6.5 C-4,7.5 16,5 34,1.8'), stripe.small, Math.max(1.3, 2.2 * c.F.px))}</g>`
      s += c.back([[-34, -9], [-24, -10.6], [-10, -11], [4, -10]], body)
      if (c.big) s += c.line(c.M('M-30,-8 C-26.5,-4 -26.5,4 -30,8'), body.outline, c.lw)
      s += c.body('pectoral', c.M('M-26,3 C-22,5 -18,9 -16,12.5 C-20,12.5 -25,9.5 -27,5.5 Z'), body, { tone: 'shadow', w: c.lw })
      s += fishEye(c, -37.5, -2, 2.8, body)
      return { body: s, parts: [['body', body], ['stripes', stripe]] }
    },
  },
  killifish: {
    box: [-48, -29, 51, 29],
    draw: (c, { body = KILLIFISH, fins = KILLI_FIN }) => {
      let s = `<g id="${c.id}-fins">` + c.body('fins', [c.M('M-6,-14 C-2,-23 8,-29 17,-27 C24,-25 28,-17 29,-6 L20,-9 Z'), c.M('M-8,14 C-4,24 6,29 15,28 C22,26 27,18 28,6 L20,9 Z'), c.M('M26,-5 C34,-13 42,-21 48,-19 C52,-10 52,10 48,19 C42,21 34,13 26,5 Z')], fins)
      if (c.big) s += c.line(c.M('M1,-15 L6,-24 M8,-13 L13,-26 M15,-11 L20,-24 M22,-8 L25,-18 M-1,15 L4,24 M6,13 L11,26 M13,12 L18,25 M20,9 L23,19 M29,0 L50,0 M29,-2 L49,-11 M29,2 L49,11 M29,-3 L45,-18 M29,3 L45,18'), fins.light, c.lw * 0.75)
      s += `</g><g id="${c.id}-body">${c.body('body', c.S([[-47, -3], [-44, -9], [-36, -13.5], [-24, -15.5], [-10, -15.5], [4, -13.5], [16, -10], [26, -6.5], [30, -5], [30, 5], [26, 6.5], [16, 10.5], [4, 14], [-10, 15.5], [-24, 14.5], [-36, 11], [-43, 6], [-47, 1.5]]), body)}`
      if (c.big) { let w = ''; [-7, 0, 7].forEach((y, r) => { for (let x = -18 + (r % 2) * 3.5; x <= 17; x += 7) w += c.M(`M${x},${y - 3.2} Q${x + 2.8},${y} ${x},${y + 3.2}`) + ' ' }); s += c.line(w, body.small, c.lw * 0.7) + c.line(c.M('M-29,-11 C-25,-5 -25,4 -29,10'), body.outline, c.lw) }
      s += c.back([[-34, -11], [-20, -13.8], [-6, -13.6], [8, -11]], body) + '</g>'
      s += `<g id="${c.id}-pectoral">${c.body('pectoral', c.M('M-23,3 C-17,1 -11,3 -9,7 C-13,10 -19,9 -23,3 Z'), fins, { w: c.lw })}</g>`
      s += fishEye(c, -37, -4, 2.5, body)
      return { body: s, parts: [['body', body], ['fins', fins]] }
    },
  },
  medaka: {
    box: [-49, -18, 50, 20],
    draw: (c, { body = MEDAKA }) => {
      let s = `<g id="${c.id}-fish">` + c.body('fins', [c.M('M11,-8 C13,-15 17,-18 22,-17 C24,-12 25,-8 25,-5 Z'), c.M('M-6,11 C0,20 14,20 26,15 L27,5 Z'), c.M('M27,-4 C34,-9 42,-13 49,-13 C50,-5 50,5 49,13 C42,13 34,9 27,4 Z')], body, { tone: 'shadow' })
      if (c.big) s += c.line(c.M('M15,-9 L18,-16 M19,-7 L21,-15 M-1,13 L1,17 M4,13 L6,18 M9,12 L11,18 M14,11 L16,17 M19,9 L21,16 M29,0 L48,0 M29,-2 L48,-8 M29,2 L48,8 M29,-3 L46,-11 M29,3 L46,11'), body.small, c.lw * 0.7)
      s += c.body('body', c.S([[-48, -5], [-44, -8], [-36, -10], [-22, -10.5], [-6, -9.8], [10, -8], [22, -5.6], [30, -3.6], [30, 3.6], [22, 5.6], [10, 8.5], [-4, 11.5], [-18, 12], [-32, 10], [-42, 6], [-47, 0]]), body)
      s += c.fill(c.M('M-40,6 C-30,10 -14,12 0,11 C10,10 20,7 28,4 C18,4 8,5 -4,6 C-18,6 -30,5 -40,6 Z'), body.light)
      if (c.big) s += c.line(c.M('M-26,-1 C-10,-1 8,-0.5 26,0'), body.small, c.lw * 0.8, ` stroke-dasharray="${f(2 * c.F.px)} ${f(2.4 * c.F.px)}"`) + c.line(c.M('M-28,-9 C-26,-3 -26,4 -29,9'), body.outline, c.lw)
      s += c.back([[-30, -7.5], [-14, -9.6], [4, -9], [18, -6.4]], body)
      s += c.body('pectoral', c.M('M-22,2 C-16,0 -11,3 -10,7 C-15,9 -20,7 -22,2 Z'), body, { tone: 'shadow', w: c.lw }) + '</g>'
      s += fishEye(c, -38, -3, 3.4, body)
      return { body: s, parts: [['body', body]] }
    },
  },
  rockfish: {
    box: [-48, -37, 51, 28],
    draw: (c, { body = ROCKFISH, fins = ROCK_FIN }) => {
      const T = [[-34, -17], [-22, -22], [-8, -23], [6, -21], [18, -16]]
      const by = (x) => { for (let i = 1; i < T.length; i++) if (x <= T[i][0]) { const t = (x - T[i - 1][0]) / (T[i][0] - T[i - 1][0]); return T[i - 1][1] + (T[i][1] - T[i - 1][1]) * t } return -16 }
      const H = [11, 14, 14.5, 14, 13, 12, 11, 10, 9, 7], tips = H.map((h, i) => { const x = -24 + i * 3.6; return [x, by(x) + 1, h] })
      let mem = [[tips[0][0], tips[0][1]]], spines = ''
      tips.forEach(([x, y, h], i) => { mem.push([x + 2.4, y - h]); spines += c.L([[x, y], [x + 2.4, y - h]]) + ' '; if (i < tips.length - 1) { const nx = (x + tips[i + 1][0]) / 2; mem.push([nx + 1.8, by(nx) - h * 0.62]) } })
      mem.push([tips.at(-1)[0] + 3, tips.at(-1)[1]])
      let s = `<g id="${c.id}-fins">` + c.body('dorsal', c.L(mem) + 'Z', fins, { w: c.lw * 1.2 }) + (c.big ? c.line(spines, fins.outline, c.lw) : '')
      s += c.body('fins', [c.M('M10,-19 C13,-29 24,-28 29,-11 Z'), c.M('M4,16 C6,26 16,27 22,12 Z'), c.M('M31,-7 C37,-11 43,-16 48,-18 C51,-6 51,6 48,16 C43,14 37,9 31,5 Z')], fins)
      if (c.big) s += c.line(c.M('M14,-20 L17,-26 M19,-17 L22,-24 M24,-14 L26,-20 M7,16 L9,24 M11,16 L13,24 M15,15 L17,22 M34,-4 L47,-13 M35,-1 L49,-5 M35,2 L49,4 M34,4 L47,12'), fins.small, c.lw * 0.8)
      s += `</g><g id="${c.id}-body">${c.body('body', c.S([[-47, -2], [-43, -10], [-34, -17], [-22, -22], [-8, -23], [6, -21], [18, -16], [28, -10], [34, -6], [34, 4], [28, 8], [16, 13], [2, 17], [-14, 17], [-28, 14], [-38, 9], [-47, 3]]), body)}`
      s += c.fill(c.M('M-36,9 C-24,15 -6,17 8,15 C18,13 26,9 33,5 L34,3 C24,8 12,11 -2,12 C-16,12 -28,10 -36,6 Z'), body.light)
      s += c.back([[-28, -17], [-16, -21], [-2, -21], [10, -19]], body)
      if (c.big) s += c.line(c.M('M-22,-11 C-6,-15 14,-11 32,-2'), body.small, c.lw * 0.8) + c.line(c.M('M-25,-15 C-21,-7 -21,3 -25,12'), body.outline, c.lw)
      s += c.fill(c.M('M-41,-0.5 L-40,2.8 L-38.5,-0.5 L-37.3,3 L-35.8,-0.5 L-34.5,2.8 L-33.2,-0.5 L-32,2.4 L-30.5,-1 Z M-38,-15.5 L-37,-18.5 L-35.5,-15.3 L-34,-18.5 L-33,-15 Z'), body.shadow, body.outline, c.lw * 0.7)
      s += c.line(c.M('M-47,1 C-44,2 -41,2 -38,0.5'), body.outline, c.lw) + '</g>'
      s += `<g id="${c.id}-near-fins">${c.body('pectoral', [c.M('M-20,15 C-20,23 -15,28 -10,27 C-12,22 -12,18 -12,16 Z'), c.M('M-18,-3 C-11,-9 -1,-6 2,4 C-4,10 -13,9 -18,3 Z')], fins, { w: c.lw * 1.2 })}</g>`
      s += fishEye(c, -35, -8, 3.6, fins)
      return { body: s, parts: [['body', body], ['fins', fins]] }
    },
  },
  shark: {
    box: [-50, -25, 52, 24],
    draw: (c, { body = SHARK, parasite = false, copepod = COPEPOD }) => {
      let s = `<g id="${c.id}-skin">` + c.body('far-fin', c.M('M10,12 C13,16 16,19 20,20 C18,15 17,12 16,10 Z'), body, { tone: 'shadow', w: c.lw * 1.2 })
      s += c.body('body', [c.S([[-49, 1], [-46, -6], [-38, -11.5], [-24, -15.5], [-8, -16.5], [8, -14.5], [20, -11], [30, -7], [36, -5], [36, 4], [28, 6.5], [16, 10.5], [2, 14.5], [-12, 15.5], [-26, 13.5], [-38, 10], [-46, 6]]), c.M('M33,-6 C38,-9 43,-13 48,-19 C51,-21 52,-18 51,-15 C49,-9 47,-4 44,0 C45,2 46,4 46,6 C46,8 44,8 42,7 C39,6 36,5 33,4 Z'), c.M('M-4,-16 C-1,-21 4,-24 8,-24 C8,-20 9,-17 11,-14 Z'), c.M('M17,-11.5 C19,-15 22,-17 25,-17 C25,-14 25.5,-11 27,-9 Z')], body)
      s += c.fill(c.M('M-46,5 C-34,11 -16,14 4,12 C18,10 28,6 36,3 C28,7 16,11 2,14.5 C-12,15.5 -30,13 -46,6 Z'), body.light)
      s += c.back([[-40, -9], [-26, -14], [-8, -15], [8, -13]], body)
      if (c.big) {
        s += c.line(c.M('M-29,0 C-30,3 -30,6 -29,8 M-26,0 C-27,3 -27,6 -26,8.5 M-23,0 C-24,3 -24,6 -23,9 M-20,0.5 C-21,3.5 -21,6 -20,9'), body.small, c.lw)
        const R = rng(7); let sp = ''; for (let i = 0; i < 9; i++) sp += c.C(-30 + R() * 58, -11 + R() * 12, 1) + ' '; s += c.fill(sp, body.shadow)
      }
      s += c.body('pectoral', c.M('M-26,9 C-24,15 -18,21 -10,23 C-12,18 -14,13 -14,10 Z'), body, { tone: 'shadow', w: c.lw * 1.2 })
      s += c.line(c.M('M-48,5 C-45,7.5 -41,8.5 -37,8'), body.outline, c.lw) + '</g>' + c.eye(-39, -4, 2.2)
      const parts = [['skin', body]]
      if (parasite) { s += `<g id="${c.id}-copepod">${c.line(c.M('M-38,-2.5 C-36,1 -33,3 -29,3.5 M-38.5,-2.5 C-37,2 -35,5 -32,6.5'), copepod.small, c.lw)}${c.body('copepod', c.M('M-40.5,-3.5 C-41,-1 -39.5,1 -37.5,0.5 C-36.5,-1 -37,-3 -38.5,-3.5 Z'), copepod, { w: c.lw * 0.8, flat: true })}</g>`; parts.push(['copepod', copepod]) }
      return { body: s, parts }
    },
  },
}
export function fish(g, opts) { return draw(FISH, 'fish', g, { kind: 'zebrafish', ...opts }) }

// =====================================================================================================================
// A bird seen from the side, facing left. Kinds: 'songbird' (a small blue bird with a pale breast, orange beak, thin
// legs, standing), 'chicken' (a white hen with red comb and wattle, yellow beak and legs, upturned tail), 'macaw' (red,
// with a yellow and blue wing and a long tail, white bare face and a pale hooked beak, upright on a perch; `perch: false`
// leaves the perch out). Options: body, beak, comb, wing, yellow, perch. Used by: Bird, Chicken, Parrot (macaw), Chick
// embryo (the hen), Life cycle.
// Example: bird(g, { x: 0, y: 0, size: 50, kind: 'chicken', id: 'hen' })
// =====================================================================================================================
const BIRDS = {
  songbird: {
    box: [-47, -32, 49, 33],
    draw: (c, { body = SONGBIRD, beak = BEAK }) => {
      const leg = (x) => `M${x},17 L${x - 1},30 M${x - 1},30 L${x - 8},31.5 M${x - 1},30 L${x - 7},34 M${x - 1},30 L${x + 3},33`
      let s = c.line(c.M(leg(-8) + ' ' + leg(2)), INK, Math.max(1.2, 2 * c.F.px * 0.6))
      s += `<g id="${c.id}-feathers">${c.body('tail', c.S([[18, -7], [32, -3], [44, 3], [49, 9], [46, 13], [34, 11], [20, 7]]), body, { tone: 'small' })}`
      if (c.big) s += c.line(c.M('M26,1 L45,9 M26,5 L42,11.5'), body.light, c.lw * 0.8)
      s += c.body('body', c.S([[-34, -19], [-31, -27], [-24, -32], [-15, -32], [-8, -28], [0, -21], [12, -15], [24, -8], [30, -1], [26, 7], [14, 15], [0, 18], [-12, 16], [-22, 9], [-29, 0], [-33, -9]]), body, { outline: false })
      s += c.fill(c.S([[-32, -9], [-28, 1], [-20, 9], [-10, 14], [0, 17], [8, 16], [2, 9], [-10, 3], [-20, -4], [-27, -10]]), body.light)
      s += c.fill(c.S([[-34, -19], [-31, -27], [-24, -32], [-15, -32], [-8, -28], [0, -21], [12, -15], [24, -8], [30, -1], [26, 7], [14, 15], [0, 18], [-12, 16], [-22, 9], [-29, 0], [-33, -9]]), 'none', body.outline, c.w)
      s += c.back([[-26, -29.5], [-20, -31.5], [-14, -31], [-9, -27.5]], body)
      s += c.body('wing', c.S([[-14, -15], [-2, -18], [12, -13], [24, -5], [37, 3], [30, 6], [16, 5], [2, 2], [-10, -5]]), body, { tone: 'shadow', w: c.w * 0.85 })
      if (c.big) s += c.line(c.M('M-8,-7 C0,-3 8,-3 15,-7 M6,1 L32,4 M12,-3 L30,1'), body.light, c.lw * 0.8)
      s += `</g><g id="${c.id}-beak">${c.body('beak', c.M('M-31,-24 L-47,-18.5 L-31,-13.5 Z'), beak, { tone: 'shadow', w: c.lw * 1.1, flat: true })}</g>` + c.eye(-24, -22, 2.6)
      return { body: s, parts: [['feathers', body], ['beak', beak]] }
    },
  },
  chicken: {
    box: [-47, -48, 46, 44],
    draw: (c, { body = HEN, comb = COMB, legs = HEN_LEGS }) => {
      const leg = (x) => `M${x},25 L${x},39 M${x},39 L${x - 8},41 M${x},39 L${x - 5},44 M${x},39 L${x + 4},42`
      let s = `<g id="${c.id}-legs">${c.tube(c.M(leg(10)), 2.6, legs, { tone: 'shadow' })}${c.tube(c.M(leg(-6)), 2.6, legs)}</g>`
      s += `<g id="${c.id}-comb">${c.body('comb', c.M('M-37,-33 C-41,-38 -39,-43 -35,-41 C-35,-47 -29,-48 -28,-43 C-26,-48 -20,-47 -21,-41 C-17,-41 -16,-36 -20,-33 Z'), comb, { w: c.lw * 1.2 })}</g>`
      s += `<g id="${c.id}-feathers">${c.body('body', c.S([[-38, -30], [-33, -37], [-25, -38], [-19, -32], [-17, -22], [-12, -14], [-2, -10], [12, -11], [24, -18], [31, -29], [38, -37], [44, -33], [46, -19], [44, -3], [38, 10], [26, 21], [8, 27], [-10, 27], [-24, 21], [-34, 10], [-38, -3], [-36, -14], [-39, -21]]), body)}`
      if (c.big) s += c.line(c.M('M33,-26 C37,-16 38,-6 36,6 M40,-31 C43,-20 43,-8 40,4 M-20,-26 C-21,-18 -24,-10 -30,-5 M-24,-28 C-26,-20 -30,-14 -35,-11'), body.small, c.lw * 0.9)
      s += c.body('wing', c.M('M-14,-3 C-2,-8 18,-6 27,4 C22,14 8,18 -6,14 C-14,10 -16,3 -14,-3 Z'), body, { tone: 'shadow', w: c.w * 0.85 })
      if (c.big) s += c.line(c.M('M-4,9 C4,7 12,7 20,8 M-6,3 C2,0 12,0 22,2'), body.small, c.lw * 0.9)
      s += c.back([[-35, -6], [-34, 2], [-31, 8], [-26, 13]], body) + '</g>'
      s += `<g id="${c.id}-beak">${c.body('beak', c.M('M-38,-31 L-47,-27.5 L-38,-24 Z'), legs, { tone: 'shadow', w: c.lw * 1.1, flat: true })}</g>`
      s += `<g id="${c.id}-wattle">${c.body('wattle', c.M('M-37,-24 C-40,-18 -38,-13 -35,-14 C-33,-16 -33,-21 -34,-24 Z'), comb, { w: c.lw * 1.1, flat: true })}</g>` + c.eye(-31, -30, 2.4)
      return { body: s, parts: [['feathers', body], ['comb', comb], ['legs and beak', legs]] }
    },
  },
  macaw: {
    box: [-46, -50, 50, 51],
    draw: (c, { body = MACAW, wing = MACAW_BLUE, yellow = MACAW_YELLOW, perch = true }) => {
      const t = (d) => d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, u, v) => `${+u + 4},${+v - 3}`)
      const M = (d) => c.M(t(d)), S = (p) => c.S(p.map(([u, v]) => [u + 4, v - 3]))
      let s = `<g id="${c.id}-tail">${c.body('tail', M('M2,10 C10,26 20,40 32,54 C33,50 30,40 22,26 C18,18 14,12 12,8 Z'), body, { w: c.w * 0.9 })}${c.body('tail-blue', M('M12,8 C18,18 24,30 32,54 C27,44 20,32 14,22 C10,16 8,12 8,9 Z'), wing, { w: c.lw * 1.2, flat: true })}</g>`
      if (perch) s += `<g id="${c.id}-perch">${c.body('perch', M('M-44,13 C-20,11 20,12 44,15 C46,16 46,19 44,20 C20,18 -20,17 -44,19 C-46,18 -46,14 -44,13 Z'), PERCH, { flat: true })}</g>`
      s += `<g id="${c.id}-feathers">${c.body('body', S([[-20, -36], [-14, -44], [-4, -44], [4, -38], [8, -28], [12, -16], [14, -4], [12, 8], [6, 14], [-2, 14], [-8, 8], [-12, -2], [-15, -14], [-18, -24]]), body)}${c.back([[-12, -38], [-6, -42], [0, -40], [3, -34]].map(([u, v]) => [u + 4, v - 3]), body)}</g>`
      s += `<g id="${c.id}-wing">${c.body('wing', M('M-2,-22 C8,-27 15,-18 17,-6 C19,6 21,16 24,26 C16,20 8,12 3,4 C-1,-4 -3,-14 -2,-22 Z'), wing)}`
      if (c.big) s += c.line(M('M4,-2 C8,6 14,14 20,20 M9,-2 C12,6 16,12 21,16 M1,4 C6,10 12,16 18,21'), wing.small, c.lw * 0.9)
      s += `</g><g id="${c.id}-yellow">${c.body('coverts', M('M-2,-22 C7,-26 13,-20 15,-11 C9,-9 3,-9 -2,-12 Z'), yellow, { w: c.lw * 1.1, flat: true })}</g>`
      s += c.line(M('M-4,13 C-6,16 -8,17 -10,16 M-2,14 C-2,17 0,19 2,18 M4,13 C3,16 4,18 6,18'), INK, Math.max(1.2, 2.2 * c.F.px * 0.6))
      s += `<g id="${c.id}-face">${c.body('face', S([[-24, -36], [-18, -38], [-12, -35], [-10, -30], [-13, -26], [-19, -25], [-24, -28]]), CREAM, { w: c.lw, flat: true })}`
      s += c.body('lower-beak', M('M-22,-26 C-28,-23 -29,-16 -24,-14 C-21,-15 -20,-19 -21,-23 Z'), FUR.black, { w: c.lw, flat: true })
      s += c.body('beak', M('M-22,-36 C-30,-38 -37,-31 -35,-21 C-34.5,-18 -32,-18 -31.5,-21 C-31,-25 -27,-27 -22,-25 Z'), IVORY, { w: c.lw * 1.2, flat: true }) + c.fill(M('M-35,-23 C-35,-20 -33.5,-18.5 -32,-20 C-32,-21.5 -33,-22.5 -35,-23 Z'), INK) + '</g>'
      s += c.eye(-12, -35.5, 2.2)
      const parts = [['feathers', body], ['wing', wing], ['yellow', yellow]]
      if (perch) parts.push(['perch', PERCH])
      return { body: s, parts }
    },
  },
}
export function bird(g, opts) { return draw(BIRDS, 'bird', g, { kind: 'songbird', ...opts }) }

/** Mirrors a local path string or a Bézier list across the vertical axis (u → −u). */
const flipD = (d) => d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, u, v) => `${-u},${v}`)
const flipP = (P) => P.map((n, i) => (i % 2 ? n : -n))

// =====================================================================================================================
// An amphibian. Kinds: 'frog' (seen from above, head up, legs folded with webbed feet, faint darker spots, bulging eyes),
// 'axolotl' (side view facing left: pink, three feathery gills on each side, a fin along back and tail, four short legs),
// 'olm' (side view facing left: long pale body, tiny legs, red gills, no eye to speak of, as the cave salamander),
// 'tadpole' (side view facing left: round body with the coiled gut showing, a wavy finned tail, a first hind leg).
// Options: skin, gills, spots (the frog). Used by: Frog, Axolotl, Olm, Tadpole, Limb regeneration (blastema), Life cycle.
// Example: amphibian(g, { x: 0, y: 0, size: 50, kind: 'axolotl', id: 'axolotl' })
// =====================================================================================================================
const AMPHIBIANS = {
  frog: {
    box: [-48, -45, 48, 45],
    draw: (c, { skin = FROG, spots = true }) => {
      const half = (m) => {
        const P = m ? flipP : (p) => p, D = m ? flipD : (d) => d, fing = D('M-28,-28 L-33,-33 M-28,-28 L-29.5,-35 M-28,-28 L-25,-34.5 M-28,-28 L-22.5,-31')
        let s = c.body(`foot${m}`, c.M(D('M-26,30 L-47,31 Q-43,35 -45,39 Q-40,39 -39,44 Q-35,41 -31,44.5 L-23,34 Z')), skin, { tone: 'shadow', w: c.w * 0.85 })
        if (c.big) s += c.line(c.M(D('M-25,32 L-45,33 M-25,32 L-43,38.5 M-25,32 L-38,42.5 M-25,32 L-31.5,43')), skin.small, c.lw * 0.7)
        s += c.body(`shin${m}`, c.T([P([-33, 1, -35, 11, -31, 21, -24, 29])], 8, 5.5), skin, { w: c.w * 0.9 })
        s += c.body(`thigh${m}`, c.T([P([-10, 12, -18, 7, -27, 1, -33, 0])], 11, 8), skin, { w: c.w * 0.9 })
        s += c.tube(c.M(fing), 2.2, skin, { w: c.lw })
        s += c.body(`forearm${m}`, c.T([P([-27, -11, -29, -16, -29, -22, -28, -28])], 5, 3.6), skin, { w: c.w * 0.9 })
        s += c.body(`arm${m}`, c.T([P([-12, -17, -17, -17, -22, -15, -27, -11])], 6.5, 5), skin, { w: c.w * 0.9 })
        return s
      }
      let s = `<g id="${c.id}-skin">${half(0)}${half(1)}`
      s += c.body('body', c.S([[0, -41], [-7, -39.5], [-13, -35], [-16, -28], [-16.5, -20], [-17, -12], [-16, -2], [-16, 8], [-13, 16], [-7, 20.5], [0, 21.5], [7, 20.5], [13, 16], [16, 8], [16, -2], [17, -12], [16.5, -20], [16, -28], [13, -35], [7, -39.5]]), skin)
      if (c.big) s += c.line(c.M('M-9,-23 C-11,-10 -11,2 -8,13 M9,-23 C11,-10 11,2 8,13'), skin.small, c.lw * 0.9)
      if (spots && c.big) s += c.fill([[-3, -12, 3], [4, -4, 2.6], [-4, 5, 2.6], [5, 10, 2.2], [3, -19, 2.2]].map(([x, y, r]) => c.C(x, y, r)).join(' '), skin.shadow)
      s += c.back([[-6, -22], [-3, -25], [3, -25], [6, -22]], skin)
      s += c.body('eyes', [c.C(-11, -32, 6.2), c.C(11, -32, 6.2)], skin, { w: c.w * 0.9 }) + c.fill(c.C(-2.6, -37.5, 0.9) + ' ' + c.C(2.6, -37.5, 0.9), skin.outline) + '</g>'
      s += c.fill(c.E(-11.5, -32.5, 3.6, 2.6) + ' ' + c.E(11.5, -32.5, 3.6, 2.6), INK) + (c.big ? c.fill(c.C(-12.6, -33.4, 0.9) + ' ' + c.C(10.4, -33.4, 0.9), '#FFFFFF') : '')
      return { body: s, parts: [['skin', skin]] }
    },
  },
  axolotl: {
    box: [-47, -28, 50, 24],
    draw: (c, { skin = AXOLOTL, gills = GILLS }) => {
      const G = [[-27, -4, -30, -10, -34, -15, -39, -20], [-24.5, -4.5, -25, -11, -25, -17, -26, -25], [-22, -3.5, -19, -9, -15, -14, -10, -19]]
      const foot = (x, y) => c.M(`M${x},${y} L${x - 4},${y + 1.5} M${x},${y} L${x - 2.5},${y + 3.5} M${x},${y} L${x + 1},${y + 4}`)
      let stems = '', fr = ''
      G.forEach((P) => {
        stems += c.M(`M${P[0]},${P[1]} C${P[2]},${P[3]} ${P[4]},${P[5]} ${P[6]},${P[7]}`) + ' '
        for (let i = 3; i <= 8; i++) { const t = i / 8, [x, y] = bez(P, t), [x2, y2] = bez(P, t - 0.02), dx = x - x2, dy = y - y2, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, L = 3.2 * (1 - 0.3 * t); fr += c.L([[x - nx * L - (dx / l) * 1.5, y - ny * L - (dy / l) * 1.5], [x, y], [x + nx * L - (dx / l) * 1.5, y + ny * L - (dy / l) * 1.5]]) + ' ' }
      })
      const W = (k) => Math.max(0.8, k * c.F.px) / strokeScale()
      let s = `<g id="${c.id}-gills">${c.line(c.big ? fr : '', gills.outline, W(1.3) + c.lw * 2)}${c.line(stems, gills.outline, W(2.4) + c.lw * 2)}${c.big ? c.line(fr, gills.shadow, W(1.3)) : ''}${c.line(stems, gills.base, W(2.4))}</g>`
      s += `<g id="${c.id}-skin">` + c.body('fins', [c.M('M-18,-3 C-8,-11 6,-12 18,-10 C32,-7.5 43,-2 50,3.5 L20,5 Z'), c.M('M6,9 C18,15 34,12 50,3.5 L20,3 Z')], skin, { tone: 'light', w: c.lw * 1.2 })
      s += c.body('far-legs', [c.T([[-18, 9, -20, 13, -22, 16, -24, 20]], 5, 3.4), c.T([[15, 9, 16, 13, 15, 16, 13, 20]], 5.5, 3.4)], skin, { tone: 'shadow', w: c.w * 0.9 }) + c.tube(foot(-24, 20) + ' ' + foot(13, 20), 1.8, skin, { tone: 'shadow', w: c.lw })
      s += c.body('body', c.S([[-47, 4], [-45.5, -1.5], [-41, -5.5], [-34, -7.5], [-27, -7], [-22, -5], [-12, -4.5], [0, -4], [12, -3], [24, -1.5], [36, 1], [48, 3.5], [36, 5.5], [24, 7.5], [12, 9.5], [0, 11], [-12, 11.5], [-22, 11], [-30, 11.5], [-38, 10.5], [-44, 8]]), skin)
      s += c.body('legs', [c.T([[-24, 8, -26, 13, -28, 17, -31, 21]], 6, 3.6), c.T([[8, 8, 9, 13, 8, 17, 6, 21]], 6.5, 3.6)], skin, { w: c.w * 0.9 }) + c.tube(foot(-31, 21) + ' ' + foot(6, 21), 1.8, skin, { w: c.lw })
      s += c.back([[-38, -4.5], [-30, -6], [-20, -3.5], [-8, -2.5]], skin)
      if (c.big) s += c.line(c.M('M-14,-1 L-14,8 M-8,-1 L-8,8 M-2,-1 L-2,8'), skin.shadow, c.lw * 0.8)
      s += c.line(c.M('M-46,5 C-43,7.5 -38,8 -33,6.5'), skin.outline, c.lw) + '</g>' + c.eye(-37, -0.5, 2.3)
      return { body: s, parts: [['skin', skin], ['gills', gills]] }
    },
  },
  olm: {
    box: [-47, -14, 47, 13],
    draw: (c, { skin = OLM, gills = OLM_GILLS }) => {
      const P = [-44, -3, -16, -13, 14, 13, 46, -6], Q = (t) => bez(P, t)
      const W = [[0, 6.5], [0.035, 11], [0.09, 13.5], [0.13, 12], [0.2, 13.5], [0.55, 14.5], [0.66, 15], [0.83, 10], [1, 0.8]]
      const wf = (t) => { for (let i = 1; i < W.length; i++) if (t <= W[i][0]) { const [t0, w0] = W[i - 1], [t1, w1] = W[i]; return w0 + ((w1 - w0) * (t - t0)) / (t1 - t0) } return 0.8 }
      const N = (t) => { const p = Q(Math.max(0, t - 0.01)), q = Q(Math.min(1, t + 0.01)), dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy); return [-dy / l, dx / l] }
      const S = (t, k, ex = 0) => { const p = Q(t), n = N(t), w = (wf(t) / 2) * k + ex; return [p[0] + n[0] * w, p[1] + n[1] * w] }
      const L = [], R = []
      for (let i = 0; i <= 40; i++) { const t = i / 40; L.push(S(t, 1)); R.unshift(S(t, -1)) }
      const nose = Q(0)
      const leg = (t, toes, dx, far) => { const [x, y] = S(t, 1, -1.5), x0 = x + (far ? 2.5 : 0), X = x0 + dx, Y = y + 4.5; let d = c.L([[x0, y], [X, Y]]); for (let k = 0; k < toes; k++) d += ' ' + c.L([[X, Y], [X - 2.6 + k * 2.6 * (toes > 2 ? 1 : 2), Y + 2.4]]); return c.tube(d, 1.6, skin, { tone: far ? 'shadow' : 'base', w: c.lw }) }
      const gill = (t, ang, len) => { const [x, y] = S(t, -0.25), co = Math.cos(ang), sn = Math.sin(ang), pt = []; for (let i = 0; i <= 10; i++) { const u = i / 10, r = (i % 2 ? 2.6 : 1.6) * Math.sin(Math.PI * Math.min(1, u * 1.1 + 0.05)); pt.push([u * len, r]) } return pt.concat(pt.slice().reverse().map(([u, r]) => [u, -r])).map(([u, r]) => [x + u * co - r * sn, y + u * sn + r * co]) }
      let s = `<g id="${c.id}-skin">${leg(0.25, 3, -2.5, 1)}${leg(0.63, 2, -1.5, 1)}${c.body('body', c.S([[nose[0] - 2.6, nose[1] + 0.4], ...L, ...R]), skin)}`
      s += c.back(Array.from({ length: 20 }, (_, i) => S(0.2 + i * 0.028, -1, 2.4)), skin) + '</g>'
      s += `<g id="${c.id}-gills">${c.body('gills', [gill(0.14, -1.5, 10.5), gill(0.16, -0.78, 11.5), gill(0.18, -0.05, 10)].map((p) => c.S(p)), gills, { w: c.lw })}</g>`
      s += `<g id="${c.id}-skin-near">${leg(0.23, 3, -2.5, 0)}${leg(0.61, 2, -1.5, 0)}`
      if (c.big) s += c.line([0.3, 0.36, 0.42, 0.48, 0.54].map((t) => c.L([S(t, 0.7), S(t, -0.2)])).join(' '), skin.small, c.lw * 0.8)
      const m0 = S(0.005, 0.3), m1 = S(0.07, 0.35)
      s += c.line(c.O([[m0[0] - 1.5, m0[1]], [(m0[0] + m1[0]) / 2, m1[1] + 1], m1]), skin.outline, c.lw)
      const ey = S(0.05, -0.35); s += c.fill(c.C(ey[0], ey[1], 1.1), skin.small) + '</g>'
      return { body: s, parts: [['skin', skin], ['gills', gills]] }
    },
  },
  tadpole: {
    box: [-48, -17, 49, 21],
    draw: (c, { skin = TADPOLE }) => {
      const N = 26, X = (t) => -10 + 58 * t, Y = (t) => -1 + 5 * Math.sin(2 * Math.PI * 0.95 * t + 0.5) * t
      const T = (t) => { const e = 0.001, dx = X(t + e) - X(t - e), dy = Y(t + e) - Y(t - e), l = Math.hypot(dx, dy); return [dx / l, dy / l] }
      const fw = (t) => Math.pow(Math.sin(Math.PI * t), 0.75), mw = (t) => 5.8 * (1 - t) + 0.3
      const side = (wu, wl) => { const U = [], D = []; for (let i = 0; i <= N; i++) { const t = i / N, [tx, ty] = T(t), x = X(t), y = Y(t); U.push([x + ty * wu(t), y - tx * wu(t)]); if (i > 0 && i < N) D.unshift([x - ty * wl(t), y + tx * wl(t)]) } return U.concat(D) }
      let s = `<g id="${c.id}-skin">${c.body('fin', c.S(side((t) => 15 * fw(t) + 0.2, (t) => 11.5 * fw(t) + 0.2)), skin, { tone: 'light', w: c.w * 0.85 })}`
      s += c.body('tail', c.S(side(mw, mw)), skin, { w: c.lw * 1.2 })
      if (c.big) { let ch = ''; [0.2, 0.3, 0.4, 0.5, 0.6, 0.7].forEach((t) => { const [tx, ty] = T(t), x = X(t), y = Y(t), w = mw(t) * 0.75; ch += c.L([[x + ty * w + tx * 1.6, y - tx * w + ty * 1.6], [x - tx * 1.4, y - ty * 1.4], [x - ty * w + tx * 1.6, y + tx * w + ty * 1.6]]) + ' ' }); s += c.line(ch, skin.small, c.lw * 0.8) }
      s += c.tube([[-5, 11], [-3.5, 16], [-5, 19], [-10, 20]], 2.4, skin, { w: c.lw })
      s += c.body('body', c.S([[-47, 0], [-45, -8], [-37, -14], [-25, -16], [-13, -14.5], [-5, -9], [-2, -1], [-4, 7], [-11, 13.5], [-23, 16.5], [-35, 15], [-43, 9]]), skin)
      s += c.fill(c.E(-20, 6.5, 11, 6.5), skin.light)
      if (c.big) { const sp = Array.from({ length: 29 }, (_, i) => { const th = (i / 28) * 3.2 * Math.PI, r = 8.5 - th * 0.62; return [-20 + r * Math.cos(th), 6.5 + r * 0.62 * Math.sin(th)] }); s += c.line(c.O(sp), skin.small, c.lw * 0.9) }
      s += c.back([[-34, -12], [-26, -15], [-18, -14.5], [-12, -12]], skin)
      s += c.fill(c.C(-43.5, -6, 1), skin.outline) + c.line(c.M('M-46.5,3 C-45,4.5 -42.5,4.6 -41,3.6'), skin.outline, c.lw) + '</g>' + c.eye(-35, -5, 3)
      return { body: s, parts: [['skin', skin]] }
    },
  },
}
export function amphibian(g, opts) { return draw(AMPHIBIANS, 'amphibian', g, { kind: 'frog', ...opts }) }

// =====================================================================================================================
// A reptile. Kinds: 'lizard' (seen from above, head left, four splayed legs with five toes, a tail curling down, pale
// spots), 'snake' (seen from above in an S, head at the upper left with a forked red tongue, darker blotches), 'turtle'
// (a pond turtle from the side, facing left: green-brown domed shell with scute lines, skin of the head and legs paler),
// 'tortoise' (a Galápagos giant tortoise: high domed shell with growth rings in each scute, long raised neck, elephant
// legs; `ground` a faint ground line). Options: skin, shell, spots. Used by: Lizard, Snake, Turtle, Galapagos giant
// tortoise.
// Example: reptile(g, { x: 0, y: 0, size: 60, kind: 'tortoise', id: 'tortoise' })
// =====================================================================================================================
const REPTILES = {
  lizard: {
    box: [-50, -33, 41, 42],
    draw: (c, { skin = LIZARD }) => {
      const C = chain([[-48, -8, -36, -8, -20, -6, -4, -4], [-4, -4, 10, -2, 22, 0, 30, 8], [30, 8, 38, 16, 36, 30, 26, 36], [26, 36, 20, 40, 14, 40, 10, 38]])
      const K = [[0, 0], [0.012, 6], [0.035, 10], [0.06, 10], [0.085, 7], [0.12, 14], [0.2, 14.5], [0.25, 9], [0.29, 7.5], [1, 1]]
      const wf = (t) => { for (let i = 1; i < K.length; i++) if (t <= K[i][0]) { const [t0, w0] = K[i - 1], [t1, w1] = K[i]; return w0 + ((w1 - w0) * (t - t0)) / (t1 - t0) } return 1 }
      const n = C.length, N = C.map((p, i) => { const q = C[Math.min(i + 1, n - 1)], r = C[Math.max(i - 1, 0)], dx = q[0] - r[0], dy = q[1] - r[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l, wf(i / (n - 1)) / 2] })
      let legs = '', toes = ''
      ;[[[-27, -9], [-24, -20], [-32, -27]], [[-27, -4], [-24, 8], [-32, 15]], [[-6, -7], [6, -15], [2, -25]], [[-6, -2], [6, 7], [2, 17]]].forEach(([a, e, ft]) => {
        legs += c.L([a, e, ft]) + ' '
        const b0 = Math.atan2(ft[1] - e[1], ft[0] - e[0]); [-70, -35, 0, 35, 70].forEach((gd) => { const t = b0 + (gd * Math.PI) / 180; toes += c.L([ft, [ft[0] + Math.cos(t) * 5, ft[1] + Math.sin(t) * 5]]) + ' ' })
      })
      let s = `<g id="${c.id}-skin">${c.tube(legs, 4, skin, { tone: 'shadow' })}${c.big ? c.tube(toes, 1.4, skin, { tone: 'shadow', w: c.lw }) : ''}`
      s += c.body('body', c.S(band(C, 0, 0, (t) => wf(t))), skin)
      if (c.big) { let sp = ''; for (let i = 12; i < n - 14; i += 2) { const p = C[i], [nx, ny, w] = N[i], gs = (i / 2) % 2 ? 1 : -1; sp += c.C(p[0] + nx * w * 0.35 * gs, p[1] + ny * w * 0.35 * gs, Math.max(1, w * 0.2)) + ' ' } s += c.fill(sp, skin.light) }
      s += c.back(C.slice(9, 23).map((p, i) => [p[0] - N[i + 9][0] * N[i + 9][2] * 0.55, p[1] - N[i + 9][1] * N[i + 9][2] * 0.55]), skin) + '</g>'
      const [ex, ey] = C[2], [nx, ny, w] = N[2]
      s += c.eye(ex - nx * w * 0.7, ey - ny * w * 0.7, 2) + c.eye(ex + nx * w * 0.7, ey + ny * w * 0.7, 2)
      return { body: s, parts: [['skin', skin]] }
    },
  },
  snake: {
    box: [-52, -34, 46, 40],
    draw: (c, { skin = SNAKE, tongue = TONGUE }) => {
      const C = chain([[-30, -24, -14, -30, 16, -34, 34, -22], [34, -22, 46, -12, 40, 4, 24, 6], [24, 6, 8, 8, -14, 2, -30, 10], [-30, 10, -46, 18, -42, 36, -22, 38], [-22, 38, -2, 40, 22, 38, 46, 30]])
      const n = C.length, wf = (t) => (t < 0.1 ? 9 + (t / 0.1) * 4 : t < 0.62 ? 13 : 13 - ((t - 0.62) / 0.38) * 12)
      let s = `<g id="${c.id}-tongue">${c.line(c.M('M-46.5,-21.5 L-50.5,-21.5 L-52,-23.5 M-50.5,-21.5 L-52,-19.5'), tongue.small, Math.max(1, 1.4 * c.F.px * 0.6))}</g>`
      s += `<g id="${c.id}-skin">${c.body('body', c.S(band(C, 0, 0, wf)), skin)}`
      if (c.big) { let bl = ''; C.forEach((p, i) => { if (i >= 3 && i <= n - 6 && i % 3 === 0) { const q = C[i + 1], r = C[i - 1], an = (Math.atan2(q[1] - r[1], q[0] - r[0]) * 180) / Math.PI, w = wf(i / (n - 1)) / 2; bl += c.E(p[0], p[1], w * 0.62, w * 0.45, an) + ' ' } }); s += c.fill(bl, skin.shadow) }
      s += c.back(C.slice(2, 13).map((p, i) => { const k = i + 2, q = C[k + 1], r = C[k - 1], dx = q[0] - r[0], dy = q[1] - r[1], l = Math.hypot(dx, dy), w = wf(k / (n - 1)) / 2; return [p[0] + (dy / l) * w * 0.55, p[1] - (dx / l) * w * 0.55] }), skin)
      s += c.body('head', c.S([[-48, -22], [-46, -27], [-40, -30], [-32, -30.5], [-25, -27.5], [-24, -21], [-30, -17.5], [-38, -17], [-45, -18.5]]), skin)
      s += c.fill(c.C(-45.5, -24.5, 0.8), skin.outline) + c.line(c.M('M-46,-19.5 C-42,-18.8 -37,-19 -33,-20'), skin.outline, c.lw) + '</g>' + c.eye(-38.5, -24, 2.3)
      return { body: s, parts: [['skin', skin], ['tongue', tongue]] }
    },
  },
  turtle: {
    box: [-51, -32, 50, 33],
    draw: (c, { shell = SHELL, skin = REPTILE_SKIN }) => {
      const leg = (x, far) => c.body(`leg${x}`, c.M(`M${x - 6},13 C${x - 6.5},19 ${x - 8},24 ${x - 8.5},28 C${x - 9},31.5 ${x - 6},32 ${x},32 C${x + 6},32 ${x + 8.5},31.5 ${x + 7.5},28 C${x + 6.5},24 ${x + 5.5},19 ${x + 5},13 Z`), skin, { tone: far ? 'shadow' : 'base', w: c.w * 0.9 })
      let s = `<g id="${c.id}-skin">${leg(-13, 1)}${leg(19, 1)}${c.body('tail', c.M('M38,10 C44,11 48,14 50,18 C46,18.5 41,17.5 37,16 Z'), skin, { w: c.w * 0.85 })}`
      s += c.body('head', c.S([[-26, 13], [-31, 5], [-37, -1], [-44, -3.5], [-49, -1], [-50.5, 4.5], [-46.5, 9], [-38, 11], [-32, 15.5]]), skin) + leg(-26) + leg(29) + '</g>'
      s += `<g id="${c.id}-shell">${c.body('shell', c.M('M-35,11 C-35,-13 -18,-32 3,-32 C24,-32 41,-13 41,11 Z'), shell)}`
      s += c.back([[-14, -24.6], [-9, -27], [-4, -28.3], [2, -28.8]], shell)
      if (c.big) s += c.line(c.M('M-24,-17 C-12,-23.5 18,-23.5 30,-17 M-32,1 C-20,-2.5 26,-2.5 38,1 M-12,-22 L-15,-1.5 M18,-22 L21,-1.5 M-6,-22.5 L-8,-31 M13,-22.5 L15,-31 M-25,-17 L-33,-7 M31,-17 L38,-7'), shell.small, c.lw * 1.2)
      s += c.body('rim', c.M('M-38,8.5 C-14,13 20,13 44,8.5 C45.5,11 45,14.5 43,16 C20,20 -14,20 -37,16 C-39.5,14.5 -40,11 -38,8.5 Z'), shell, { tone: 'shadow', w: c.w * 0.9 })
      if (c.big) s += c.line(c.M('M-28,12 L-28,17.8 M-18,13 L-18,18.8 M-8,13.6 L-8,19.4 M2,13.8 L2,19.6 M12,13.6 L12,19.4 M22,13 L22,18.8 M32,12 L32,17.6'), shell.small, c.lw)
      s += '</g>' + c.line(c.M('M-50,4.5 C-48,5.8 -46,6 -43.5,5.5'), skin.outline, c.lw) + c.eye(-43.5, 1, 2.1)
      return { body: s, parts: [['shell', shell], ['skin', skin]] }
    },
  },
  tortoise: {
    box: [-47, -30, 49, 36],
    draw: (c, { shell = GIANT_SHELL, skin = REPTILE_SKIN, ground = false }) => {
      const M = (d) => c.M(d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, u, v) => `${+u + 3},${+v + 7}`))
      const leg = (x0, x1) => c.body(`leg${x0}`, M(`M${x0},2 C${x0 - 3},10 ${x0 - 3},20 ${x0 - 1},27 L${x1 + 1},27 C${x1 + 2},20 ${x1 + 1},10 ${x1},2 Z`), skin, { w: c.w * 0.95 }) + (c.big ? c.line(M(`M${x0},11 L${x0 + (x1 - x0) * 0.5},11 M${x0 + 3},18 L${x0 + 3 + (x1 - x0) * 0.55},18`), skin.small, c.lw * 0.8) + c.line(M(`M${x0 + 1},24.5 L${x0 + 1},27 M${(x0 + x1) / 2},24.5 L${(x0 + x1) / 2},27 M${x1 - 1},24.5 L${x1 - 1},27`), skin.light, c.lw * 1.6) : '')
      let s = ''
      if (ground) s += c.line(M('M-48,28.5 L48,28.5'), skin.small, c.lw)
      s += `<g id="${c.id}-skin">${c.body('far-legs', [M('M-9,2 C-10,10 -10,18 -9,25 L3,25 C4,18 3,10 2,2 Z'), M('M30,2 C31,10 32,18 32,25 L42,25 C42,18 41,10 40,2 Z')], skin, { tone: 'shadow' })}${c.body('tail', M('M37,0 C42,2 45,6 46,10 C42,9 38,7 35,5 Z'), skin, { w: c.w * 0.85 })}`
      s += c.body('neck', c.S([[-20, -10], [-27, -15], [-33, -22], [-38, -29], [-44, -31], [-49, -28], [-50, -23], [-47, -20], [-42, -19], [-37, -17], [-33, -10], [-29, -2], [-24, 3], [-17, 3]].map(([u, v]) => [u + 3, v + 7])), skin)
      if (c.big) s += c.line(M('M-31,-17 C-28,-15 -27,-11 -27,-8 M-27,-9 C-24,-7 -23,-3 -23,0 M-36,-22 C-34,-21 -33,-19 -33,-16'), skin.small, c.lw * 0.9)
      s += c.line(M('M-50,-23.5 C-47,-23 -44,-22.5 -41,-21.5'), skin.outline, c.lw) + leg(-23, -8) + leg(19, 34) + '</g>'
      s += `<g id="${c.id}-shell">${c.body('shell', M('M-30,4 C-31,-2 -31,-8 -27,-13 C-22,-28 -6,-37 8,-37 C27,-37 41,-22 41,-2 C41,4 38,6 34,6 L-25,6 C-28,6 -30,5 -30,4 Z'), shell)}`
      s += c.line(M('M-29,-2 C-14,-5 20,-5 40,-4 M-23,-20 C-10,-27 18,-27 34,-19 M-9,-25 L-9,-4.5 M9,-26 L9,-4.6 M25,-23.5 L25,-4.4 M0,-26.5 L-1,-36 M18,-25.5 L20,-35'), shell.outline, c.lw * 1.1)
      if (c.big) s += c.line(M('M-20,-3.6 L-20,5 M-8,-4.3 L-8,5.5 M4,-4.5 L4,5.5 M16,-4.5 L16,5.5 M28,-4.3 L28,5.5'), shell.outline, c.lw * 0.9)
      if (c.big) s += [[-17, -12, 9, 8], [0, -14, 11, 9], [17, -14, 11, 9], [32, -12, 7, 8], [-10, -30, 9, 4.5], [9, -31, 11, 5], [27, -28, 8, 5]].map(([x, y, w, h]) => c.fill(c.R(x - w / 2 + 3, y - h / 2 + 7, w, h, h / 2.2), 'none', shell.small, c.lw * 0.8)).join('')
      s += '</g>' + c.eye(-40, -19.5, 1.6)
      return { body: s, parts: [['shell', shell], ['skin', skin]] }
    },
  },
}
export function reptile(g, opts) { return draw(REPTILES, 'reptile', g, { kind: 'lizard', ...opts }) }

// =====================================================================================================================
// An insect. Kinds: 'fly' (the fruit fly seen from above, head up: promoted unchanged in look from ../assays/tbF.mjs, red
// eyes, banded abdomen showing paler through clear wings), 'bee' (a bumble-like honeybee from the side facing left, banded
// abdomen, wings, a pollen load on the hind leg), 'honeybee' (seen from above, head up; `queen: true` the long-bodied
// queen with a white mark, otherwise a worker), 'butterfly' (from above, orange wings with dark margins and white spots,
// eyespots on the hind wings), 'mosquito' (side view facing left: long legs, proboscis, scaled wing), 'ant' (side view
// facing left, elbowed antennae, petiole; `queen: true` a larger gaster and thorax), 'beetle' (from above, head up,
// clubbed antennae, wing cases with a seam), 'locust' (side view facing left: long folded wings with spots, big hind
// leg), 'caterpillar' (side view facing left: segments, spiracles, prolegs, a horn at the tail), 'pupa' (a chrysalis
// hanging from a twig). Wings are WING (a pale grey-blue, the same in every insect) and never see-through; wing veins,
// segment lines and spots from 60 px. Options: body, eyes, wing, bands, queen.
// Used by: Fruit fly, Bee, Honeybee queen and worker, Butterfly, Mosquito, Ant, Ant queen and worker, Beetle, Locust,
//   Caterpillar, Pupa, Life cycle, Dysbiosis (the fly), and the assay icons that already draw their own fly.
// Example: insect(g, { x: 0, y: 0, size: 30, kind: 'honeybee', queen: true, id: 'queen' })
// =====================================================================================================================
const INSECTS = {
  fly: {
    box: [-7.4, -10.8, 7.4, 12.2],
    draw: (c, { body = FLY, eyes = FLY_EYE }) => {
      const wingFill = GLASS.light, wingLine = GLASS.outline, k = c.F.px
      const el = (u, v, rx, ry, r, fill, stroke, sw) => fillD(c.E(u, v, rx, ry, c.F.flip ? -r : r), fill, stroke, sw)
      const legs = [[[-2.6, -4.6], [-4.8, -6.6], [-5.4, -8.6]], [[-3.4, -2.6], [-6, -2.4], [-7, -0.8]], [[-2.8, -1], [-5, 1.4], [-5.4, 3.8]]]
      const legD = [...legs, ...legs.map((l) => l.map(([u, v]) => [-u, v]))].map((l) => c.L(l)).join(' ')
      const bands = (colour, sw) => c.line(c.L([[-2.6, 4.6], [2.6, 4.6]]) + ' ' + c.L([[-2, 6.6], [2, 6.6]]), colour, sw)
      let s = c.line(legD, body.outline, Math.max(1.4, c.w * 0.6))
      s += `<g id="${c.id}-abdomen">${el(0, 3.6, 3, 4.6, 0, body.small, body.outline, c.w)}${bands(body.outline, Math.max(1.3, 1.1 * k))}</g>`
      const wing = (sgn, fill, stroke, sw) => el(sgn * 2.1, 4.6, 2.9, 7.4, sgn * 6, fill, stroke, sw)
      s += `<g id="${c.id}-wings">${wing(-1, wingFill, '', 0)}${wing(1, wingFill, '', 0)}${el(0, 3.8, 2.6, 4.2, 0, mixHex(wingFill, body.small, 0.4), '', 0)}${bands(mixHex(wingFill, body.outline, 0.45), Math.max(1.2, 1 * k))}`
      s += wing(-1, 'none', wingLine, c.w * 0.8) + wing(1, 'none', wingLine, c.w * 0.8)
      if (c.shaded) s += c.line([-1, 1].map((sgn) => c.L([[sgn * 1.4, -1.6], [sgn * 2.6, 5], [sgn * 2.6, 10.4]])).join(' '), wingLine, Math.max(1, c.w * 0.45))
      s += `</g><g id="${c.id}-thorax">${el(0, -3.4, 3.8, 3.6, 0, body.small, body.outline, c.w)}</g><g id="${c.id}-head">${el(0, -8.2, 2.7, 2, 0, body.small, body.outline, c.w)}</g>`
      s += `<g id="${c.id}-eyes">${el(-2.2, -8.5, 1.75, 2.1, -15, eyes.base, eyes.outline, c.w * 0.75)}${el(2.2, -8.5, 1.75, 2.1, 15, eyes.base, eyes.outline, c.w * 0.75)}</g>`
      return { body: s, parts: [['fly', body], ['eyes', eyes]] }
    },
  },
  bee: {
    box: [-46, -33, 50, 33],
    draw: (c, { body = BEE, bands = BEE_BAND, wing = WING, pollen = true }) => {
      const cx = 20, cy = 4, rx = 24, ry = 16, h = (x) => ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2))
      const band = (x1, x2) => { const top = [], bot = []; for (let i = 0; i <= 6; i++) { const x = x1 + ((x2 - x1) * i) / 6; top.push([x, cy - h(x)]); bot.unshift([x, cy + h(x)]) } return c.O([...top, [x2 - 2.2, cy], ...bot.slice(0)]) + ' ' + c.O([[x1, cy + h(x1)], [x1 - 2.2, cy], [x1, cy - h(x1)]]) }
      const bandPoly = (x1, x2) => { const P = []; for (let i = 0; i <= 6; i++) { const x = x1 + ((x2 - x1) * i) / 6; P.push([x, cy - h(x)]) } P.push([x2 - 2.2, cy]); for (let i = 6; i >= 0; i--) { const x = x1 + ((x2 - x1) * i) / 6; P.push([x, cy + h(x)]) } P.push([x1 - 2.2, cy]); return c.S(P) }
      let s = `<g id="${c.id}-legs">${c.line(c.M('M-16,10 L-22,18 L-24,27 M-10,13 L-11,22 L-14,30 M-3,11 L5,20 L4,31'), bands.base, Math.max(1.2, 2.2 * c.F.px * 0.6))}</g>`
      if (pollen) s += `<g id="${c.id}-pollen">${c.body('pollen', c.E(5.5, 22, 3.2, 4.6, -12), body, { tone: 'small', w: c.lw })}</g>`
      s += `<g id="${c.id}-body">${c.fill(c.M('M43,2 L50,4 L43,6 Z'), bands.base)}${c.body('abdomen', c.E(cx, cy, rx, ry), body, { outline: false })}</g>`
      s += `<g id="${c.id}-bands">${c.fill([bandPoly(8, 14), bandPoly(20, 26), bandPoly(32, 38), bandPoly(41, 44)].join(' '), bands.base)}</g>`
      s += c.fill(c.E(cx, cy, rx, ry), 'none', body.outline, c.w) + c.back([[2, -7], [5, -10], [9, -11], [13, -11.5]], body)
      if (c.big) { let hr = ''; for (let t = 195; t <= 345; t += 15) { const r = rad(t); hr += c.L([[-10 + 12.5 * Math.cos(r), 1 + 12.5 * Math.sin(r)], [-10 + 15.1 * Math.cos(r), 1 + 15.1 * Math.sin(r)]]) + ' ' } s += c.line(hr, body.outline, c.lw * 0.8) }
      s += `<g id="${c.id}-thorax">${c.body('thorax', c.C(-10, 1, 12.5), body, { tone: 'shadow' })}</g>`
      s += c.line(c.M('M-31,-4 L-35,-13 L-44,-17 M-32,14 L-35,19'), bands.outline, c.lw * 1.2)
      s += `<g id="${c.id}-head">${c.body('head', c.E(-28, 5, 8, 10.5, 18), bands)}${c.fill(c.E(-26.5, 2, 3.6, 6.4, 18), bands.light)}</g>`
      s += `<g id="${c.id}-wings">${c.body('wings', [c.S([[-2, -5], [10, -10], [22, -13], [30, -12], [27, -7], [12, -4]]), c.S([[-6, -7], [4, -17], [16, -26], [28, -31], [38, -30], [38, -25], [26, -18], [10, -10]])], wing, { w: c.lw })}`
      if (c.big) s += c.line(c.M('M-4,-8 C8,-17 20,-25 34,-28 M6,-12 L18,-16 L16,-22 M18,-16 L28,-20'), wing.small, c.lw * 0.8)
      s += '</g>'
      return { body: s, parts: [['body', body], ['bands', bands]] }
    },
  },
  honeybee: {
    box: [-14, -29, 14, 37],
    draw: (c, { body = BEE, bands = BEE_BAND, wing = WING, queen = false }) => {
      const ry = queen ? 20 : 11, cy = queen ? 16 : 9, rx = queen ? 8 : 9, wt = queen ? 17 : 21
      const wd = (y) => rx * Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2))
      const abd = c.M(`M0,${cy - ry} C${rx * 1.35},${cy - ry} ${rx * 1.35},${cy + ry * 0.55} 0,${cy + ry} C${-rx * 1.35},${cy + ry * 0.55} ${-rx * 1.35},${cy - ry} 0,${cy - ry} Z`)
      const band = (y1, y2) => { const L = [], R = []; for (let i = 0; i <= 5; i++) { const y = y1 + ((y2 - y1) * i) / 5, w = wd(y) * 1.02; L.push([-w, y]); R.unshift([w, y]) } return c.L([...L, ...R]) + 'Z' }
      const wingE = (x1, y1, x2, y2, w) => { const mx = (x1 + x2) / 2, my = (y1 + y2) / 2; return c.E(mx, my, Math.hypot(x2 - x1, y2 - y1) / 2, w, (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI) }
      let s = c.line(c.M('M-2,-19 C-4,-24 -6,-26 -10,-27 M2,-19 C4,-24 6,-26 10,-27'), bands.outline, c.lw)
      s += `<g id="${c.id}-wings">${c.body('wings', [wingE(-3, -8, -13, wt, 5.4), wingE(3, -8, 13, wt, 5.4), wingE(-3, -5, -10, wt - 7, 3.6), wingE(3, -5, 10, wt - 7, 3.6)], wing, { w: c.lw })}</g>`
      s += `<g id="${c.id}-body">${c.body('abdomen', abd, body, { outline: false })}</g>`
      const nb = queen ? 4 : 3; let bd = ''
      for (let i = 0; i < nb; i++) { const y1 = cy - ry * 0.55 + i * ((ry * 1.5) / nb); bd += band(y1, y1 + (ry * 0.75) / nb) + ' ' }
      s += `<g id="${c.id}-bands">${c.fill(bd, bands.base)}</g>` + c.fill(abd, 'none', body.outline, c.w)
      s += `<g id="${c.id}-thorax">${c.body('thorax', c.C(0, -7, 7), body, { tone: 'small' })}${queen ? c.fill(c.C(0, -7, 2.8), '#FFFFFF', body.outline, c.lw * 0.8) : ''}</g>`
      s += `<g id="${c.id}-head">${c.body('head', c.C(0, -16.5, 4.8), bands, { tone: 'light' })}${c.fill(c.C(-3.6, -16.5, 1.8) + ' ' + c.C(3.6, -16.5, 1.8), bands.shadow)}</g>`
      return { body: s, parts: [['body', body], ['bands', bands]] }
    },
  },
  butterfly: {
    box: [-48, -45, 48, 42],
    draw: (c, { body = BUTTERFLY, margin = WING_MARGIN }) => {
      const sc = (P, B, k) => P.map(([x, y]) => [B[0] + (x - B[0]) * k, B[1] + (y - B[1]) * k])
      const FW = [[-3, -8], [-10, -24], [-22, -38], [-36, -44], [-46, -40], [-48, -30], [-44, -18], [-32, -8], [-16, -3]], FB = [-4, -6]
      const HW = [[-3, -1], [-16, 0], [-32, 4], [-41, 14], [-40, 28], [-32, 38], [-20, 40], [-10, 32], [-4, 16]], HB = [-4, 2]
      const wing = (P, B, spots, eye, k) => {
        let s = c.body(`wing${k}`, c.S(P), margin, { flat: true }) + c.fill(c.S(sc(P, B, 0.74)), body.base)
        if (c.big) s += c.line([2, 3, 4, 5, 6, 7].map((i) => c.L([sc([P[i]], B, 0.12)[0], sc([P[i]], B, 0.76)[0]])).join(' '), body.small, c.lw * 0.8)
        if (c.big) s += c.fill(spots.map((i) => { const [x, y] = sc([P[i]], B, 0.88)[0]; return c.C(x, y, 1.7) }).join(' '), '#FFFFFF')
        if (eye) { const [x, y] = sc([P[eye]], B, 0.55)[0]; s += c.fill(c.C(x, y, 4.4), margin.base) + c.fill(c.C(x, y, 1.8), body.light) }
        return s
      }
      const mi = (P) => P.map(([x, y]) => [-x, y])
      let s = `<g id="${c.id}-wings">${wing(HW, HB, [3, 4, 5, 6], 5, 1)}${wing(mi(HW), [4, 2], [3, 4, 5, 6], 5, 2)}${wing(FW, FB, [2, 3, 4, 5, 6], 0, 3)}${wing(mi(FW), [4, -6], [2, 3, 4, 5, 6], 0, 4)}</g>`
      s += `<g id="${c.id}-body">${c.line(c.M('M-1.5,-17 C-4,-26 -7,-33 -11,-40 M1.5,-17 C4,-26 7,-33 11,-40'), margin.base, Math.max(1, 1.4 * c.F.px * 0.6))}${c.fill(c.C(-11.3, -40.5, 2.1) + ' ' + c.C(11.3, -40.5, 2.1), margin.base)}`
      s += c.body('body', [c.E(0, 14, 3.4, 15), c.E(0, -5, 4.6, 7.5), c.C(0, -14.5, 4)], margin, { w: c.lw }) + '</g>'
      return { body: s, parts: [['wings', body], ['margins and body', margin]] }
    },
  },
  mosquito: {
    box: [-48, -38, 46, 41],
    draw: (c, { body = MOSQUITO, wing = WING }) => {
      const M = (d) => c.M(d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, u, v) => `${u},${+v - 4}`)), S = (p) => c.S(p.map(([u, v]) => [u, v - 4]))
      const AB = [6, -5, 18, -4, 32, 0, 46, 7], legW = Math.max(1, 2.5 * c.F.px * 0.6) // wider since the review of 23 November 2026: the legs vanished at 40 px
      let s = `<g id="${c.id}-far-legs">${c.line(M('M-6,3 L-13,14 L-19,29 L-27,43 M0,5 L5,18 L6,33 L10,45 M5,3 L20,8 L32,-2 L46,-16'), body.shadow, legW)}</g>`
      s += `<g id="${c.id}-body">${c.body('abdomen', c.T([AB], 10, 3), body)}`
      if (c.big) { let r = ''; [0.18, 0.32, 0.46, 0.6, 0.74, 0.87].forEach((t) => { const p = bez(AB, t), q = bez(AB, t + 0.01), l = Math.hypot(q[0] - p[0], q[1] - p[1]), nx = -(q[1] - p[1]) / l, ny = (q[0] - p[0]) / l, w = ((10 - 7 * t) / 2) * 0.8; r += c.L([[p[0] + nx * w, p[1] + ny * w], [p[0] - nx * w, p[1] - ny * w]]) + ' ' }); s += c.line(r, body.light, c.lw) }
      s += c.body('thorax', S([[-15, -7], [-11, -14], [-2, -17], [7, -13], [10, -5], [6, 3], [-4, 6], [-13, 2]]), body, { tone: 'light' })
      s += c.line(M('M-24,-2.5 L-48,8 M-24,-3.5 L-32,-1.5 M-22,-9.5 L-29,-17 L-35,-24'), body.outline, Math.max(1, 1.6 * c.F.px * 0.6))
      s += c.body('head', c.C(-19, -9, 6), body, { tone: 'light' }) + c.fill(c.C(-19.8, -9.6, 4.3), body.outline) + '</g>'
      s += `<g id="${c.id}-wings">${c.body('wing', S([[2, -11], [12, -15], [26, -16], [40, -14], [44, -11], [38, -8], [22, -7], [8, -7]]), wing, { w: c.lw })}${c.big ? c.line(M('M4,-10 L41,-12 M10,-8.5 L36,-9.5'), wing.small, c.lw * 0.8) : ''}</g>`
      s += `<g id="${c.id}-legs">${c.line(M('M-8,3 L-20,10 L-28,26 L-38,41 M-3,5 L-6,18 L-12,34 L-15,45 M3,4 L14,14 L18,30 L26,44'), body.outline, legW * 1.15)}</g>`
      return { body: s, parts: [['body', body]] }
    },
  },
  ant: {
    box: [-48, -28, 46, 27],
    draw: (c, { body = ANT, queen = false }) => {
      const far = 'M-15,2 L-18,13 L-24,25 L-27,26 M-7,3 L1,12 L5,25 L8,26 M-1,2 L17,10 L33,22 L36,22'
      const near = 'M-17,2 L-23,12 L-31,24 L-35,25 M-9,3 L-3,13 L-6,26 L-10,27 M-3,2 L12,12 L23,25 L28,26'
      const gs = queen ? 1.25 : 1
      let s = `<g id="${c.id}-ant">${c.tube(c.M(far), 2.2, body, { tone: 'shadow', w: c.lw })}${c.tube(c.M('M-34,-14 L-37,-27 L-44,-27.5 L-47,-23'), 1.6, body, { w: c.lw })}`
      s += c.body('gaster', c.E(27 + (gs - 1) * 8, 1, 19 * gs, 14 * gs, 12), body)
      if (c.big) s += c.line(c.M(`M20,-12 C16.5,-4 16.5,6 20,13 M30,-11 C27,-3 27,8 30,14.5`), body.light, c.lw)
      s += c.back([[14, -8], [20, -12.5], [30, -13], [38, -9]].map(([u, v]) => [u + (gs - 1) * 8, v * gs]), body)
      s += c.body('petiole', c.S([[2, 1], [4, -5], [7, -9], [10, -6], [11.5, 0], [8, 3.5], [4, 3.5]]), body, { w: c.w * 0.9 })
      s += c.body('thorax', c.S([[-23, -4], [-19, -10 * gs], [-11, -12.5 * gs], [-5, -8 * gs], [0, -7], [3.5, -3], [1.5, 2], [-8, 5], [-17, 4.5], [-22.5, 1]]), body)
      s += c.tube(c.M(near), 2.2, body, { w: c.lw })
      s += c.body('mandible', c.M('M-40,0 C-45,1 -48.5,4 -47.5,7.5 C-45.5,5.5 -42.5,5.5 -38,4.5 Z'), body, { tone: 'light', w: c.lw })
      s += c.body('head', c.S([[-22, -7], [-26, -14], [-33, -16.5], [-39.5, -13.5], [-42.5, -7], [-41.5, 0], [-37, 4.5], [-30, 4.5], [-24, 1]]), body)
      s += c.back([[-37, -14], [-32, -16], [-27, -15], [-24.5, -11.5]], body) + '</g>' + c.eye(-33, -8.5, 2.6)
      return { body: s, parts: [['ant', body]] }
    },
  },
  beetle: {
    box: [-43, -47, 43, 45],
    draw: (c, { body = BEETLE }) => {
      const legs = 'M-9,-17 L-21,-23 L-27,-33 L-30,-41 M9,-17 L21,-23 L27,-33 L30,-41 M-12,-6 L-26,-4 L-36,5 L-42,8 M12,-6 L26,-4 L36,5 L42,8 M-12,3 L-24,14 L-30,30 L-33,40 M12,3 L24,14 L30,30 L33,40'
      let s = `<g id="${c.id}-beetle">${c.tube(c.M(legs), 2, body, { tone: 'light', w: c.lw })}${c.line(c.M('M-5,-37 C-9,-41 -13,-43 -17,-43 M5,-37 C9,-41 13,-43 17,-43'), body.outline, c.lw)}`
      s += c.body('clubs', [[-18.5, -43.2], [-21.8, -43.8], [-25, -44.8], [18.5, -43.2], [21.8, -43.8], [25, -44.8]].map(([x, y]) => c.E(x, y, 2.1, 1.7)), body, { tone: 'light', w: c.lw * 0.8 })
      s += c.body('jaws', [c.M('M-4,-38 C-8,-42 -6,-46 -2,-46 C-3,-44 -3,-42 -1.5,-40 Z'), c.M('M4,-38 C8,-42 6,-46 2,-46 C3,-44 3,-42 1.5,-40 Z')], body, { tone: 'light', w: c.lw })
      s += c.body('head', c.S([[0, -41], [6.5, -39.5], [9, -34], [8, -28.5], [0, -27], [-8, -28.5], [-9, -34], [-6.5, -39.5]]), body)
      s += c.fill(c.E(-7.4, -33.5, 2, 3) + ' ' + c.E(7.4, -33.5, 2, 3), INK)
      s += c.body('elytra', [c.M('M-1,-11 L-17,-11 C-21,0 -21,20 -16,32 C-12,40 -6,44 -1,44 Z'), c.M('M1,-11 L17,-11 C21,0 21,20 16,32 C12,40 6,44 1,44 Z')], body, { outline: true })
      if (c.big) s += c.line(c.M('M-6,-6 C-7,10 -7,26 -5,38 M-11,-7 C-13,8 -13,22 -10,32 M6,-6 C7,10 7,26 5,38 M11,-7 C13,8 13,22 10,32'), body.small, c.lw * 0.8)
      s += c.back([[-15, -4], [-16.5, 6], [-16.5, 16], [-15, 25]], body)
      s += c.body('pronotum', c.S([[0, -28.5], [10, -28.5], [16, -25], [18.5, -18], [17, -11.5], [0, -10.5], [-17, -11.5], [-18.5, -18], [-16, -25], [-10, -28.5]]), body, { tone: 'light' })
      s += c.body('scutellum', c.M('M-4,-11 L4,-11 L0,-4.5 Z'), body, { tone: 'light', w: c.lw }) + '</g>'
      return { body: s, parts: [['beetle', body]] }
    },
  },
  locust: {
    box: [-51, -38, 49, 29],
    draw: (c, { body = LOCUST, wing = TEGMEN }) => {
      const M = (d) => c.M(d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, u, v) => `${u},${+v + 6}`)), S = (p) => c.S(p.map(([u, v]) => [u, v + 6])), D = (P) => P.map((n, i) => (i % 2 ? n + 6 : n))
      let s = `<g id="${c.id}-body">${c.tube(M('M-16,8 L-19,16 L-25,21 L-29,22 M-6,8 L-3,16 L-8,21 L-12,22'), 2, body, { tone: 'shadow', w: c.lw })}`
      s += c.body('abdomen', S([[-12, -6], [4, -8], [20, -7], [34, -4], [42, -1], [44, 2], [40, 5], [28, 8], [12, 9], [-4, 9], [-12, 6]]), body)
      if (c.big) s += c.line(M('M2,3 C2,5 2,7 1,9 M10,3 C10,5 10,7 9,9 M18,2 C18,4 18,6 17,8 M26,1 C26,3 26,5 25,7 M34,0 C34,2 33,4 32,5'), body.small, c.lw * 0.8)
      s += `</g><g id="${c.id}-wings">${c.body('wing', S([[-12, -10], [4, -13.5], [22, -12.5], [38, -9.5], [48, -6], [49, -3], [44, -0.5], [28, 0.5], [10, 0], [-6, -2], [-11, -5]]), wing)}`
      if (c.big) s += c.line(M('M-6,-6 C10,-8 30,-6 46,-4 M-4,-10 C12,-11 30,-9 44,-6.5 M14,-1 C20,-4 26,-5 32,-5'), wing.small, c.lw * 0.8) + c.fill([[20, -8], [27, -7.5], [34, -6], [40, -5]].map(([x, y]) => c.C(x, y + 6, 1.3)).join(' '), wing.small)
      s += `</g><g id="${c.id}-body-near">${c.tube(M('M33,-6 L10,15 L3,20 L-1,20.5'), 2, body, { w: c.lw })}`
      s += c.body('femur', c.T([D([-4, 5, 8, 2, 20, -3, 33, -7])], 15, 4.5), body, { tone: 'light' })
      if (c.big) { let hb = ''; [0.22, 0.36, 0.5, 0.64, 0.78].forEach((t) => { const x = -4 + 37 * t, y = 5 - 12 * t + 6; hb += c.L([[x - 2.4, y - 3.6 + t * 1.6], [x + 1, y], [x - 2.4, y + 3.6 - t * 1.6]]) + ' ' }); s += c.line(hb, body.small, c.lw * 0.8) }
      s += c.tube(M('M-20,9 L-24,16 L-30,21 L-34,22 M-10,9 L-8,16 L-14,21 L-18,22'), 2, body, { w: c.lw })
      s += c.body('thorax', S([[-26, -10], [-17, -13.5], [-6, -12.5], [-4, -6], [-4, 3], [-7, 9], [-18, 10.5], [-26, 8], [-28, 0]]), body)
      if (c.big) s += c.line(M('M-25,-1 C-18,1 -11,1 -5,-1 M-20,-12.5 C-19,-6 -19,0 -20,6'), body.small, c.lw * 0.8)
      s += c.line(M('M-38,-12 C-42,-21 -46,-28 -51,-34'), body.outline, c.lw)
      s += c.body('head', S([[-26, -9], [-31, -14], [-38, -14.5], [-43, -10], [-45.5, -3], [-45.5, 5], [-42.5, 11.5], [-36, 13], [-30, 10], [-27, 4]]), body)
      s += c.body('mouth', M('M-44,9 C-46,12 -44,16 -40,15 C-39,13 -40,11 -42,10 Z'), body, { tone: 'shadow', w: c.lw }) + '</g>' + c.eye(-35, -0.5, 3)
      return { body: s, parts: [['body', body], ['wings', wing]] }
    },
  },
  caterpillar: {
    box: [-48, -22, 48, 21],
    draw: (c, { body = CATERPILLAR, spots = SPOT }) => {
      const n = 11, x0 = -30, x1 = 42, sw = (x1 - x0) / n, top = (x) => -5 - 6 * Math.sin((Math.PI * (x - x0)) / (x1 - x0)), xm = (k) => x0 + sw * (k + 0.5)
      const pts = [[-31, 6], [-30, -3]]
      for (let k = 0; k < n; k++) { const a = xm(k), b = x0 + sw * (k + 1); pts.push([a, top(a) - 2]); if (k < n - 1) pts.push([b, top(b) + 0.8]) }
      pts.push([45, -3], [47.5, 5], [45, 12.5], [38, 16], [24, 16.5], [8, 16.8], [-8, 16.8], [-24, 16], [-30, 13])
      const Y = (p) => p.map(([u, v]) => [u, v - 3]), M = (d) => c.M(d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, u, v) => `${u},${+v - 3}`))
      let s = `<g id="${c.id}-body">${c.body('horn', M('M38,-7 C39,-13 42,-17 47,-19 C45,-15 43,-11 42,-6 Z'), spots, { w: c.lw })}`
      s += c.body('prolegs', [5, 6, 7, 8].map((k) => c.R(xm(k) - 3.4, 11, 6.8, 8.5, 2)).concat([M('M36,13 L33,21 C33,22.5 34,23 35,23 L40,23 C41,23 42,22.5 42,21 L43,12 Z')]), body, { tone: 'shadow', w: c.lw * 1.1 })
      s += c.body('legs', [0, 1, 2].map((k) => M(`M${xm(k) - 2.6},14 L${xm(k) - 1.5},20.5 L${xm(k) - 3.5},22.5 L${xm(k) + 0.5},21 L${xm(k) + 2.4},14 Z`)), body, { tone: 'small', w: c.lw })
      s += c.body('body', c.S(Y(pts)), body)
      if (c.big) { let sg = ''; for (let k = 0; k < n - 1; k++) { const b = x0 + sw * (k + 1); sg += M(`M${b},${top(b) + 2} C${b - 1.4},4 ${b - 1.4},10 ${b},15.5`) + ' ' } s += c.line(sg, body.small, c.lw * 0.9) }
      if (c.big) { let ob = ''; for (let k = 3; k <= 9; k++) ob += M(`M${xm(k) - 3.2},11 L${xm(k) + 2.6},${top(xm(k)) + 3}`) + ' '; s += c.line(ob, body.light, c.lw * 1.2) }
      s += `</g><g id="${c.id}-spots">${c.fill([0, 3, 4, 5, 6, 7, 8, 9, 10].map((k) => c.E(xm(k), 4.5, 1.2, 1.6)).join(' '), spots.shadow)}</g>`
      s += `<g id="${c.id}-head">${c.body('head', c.S(Y([[-30, -6], [-37, -8.5], [-44, -5.5], [-48, 1], [-47.5, 9], [-43, 14.5], [-36, 16], [-30.5, 12], [-29, 3]])), body, { tone: 'shadow' })}`
      if (c.big) s += c.line(M('M-35,-7.5 C-37,-1 -40,5 -44.5,10.5'), body.small, c.lw * 0.9)
      s += c.fill([[-42, -1.5], [-44.3, 0.6], [-43.4, 3.4]].map(([x, y]) => c.C(x, y - 3, 1.1)).join(' '), INK) + c.body('jaw', M('M-46,10 C-49,12 -48,15 -45,15 C-44,13.5 -44,12 -44.5,11 Z'), body, { tone: 'small', w: c.lw }) + '</g>'
      return { body: s, parts: [['body', body], ['spots', spots]] }
    },
  },
  pupa: {
    box: [-37, -45, 37, 47],
    draw: (c, { body = PUPA, twig = BARK }) => {
      let s = `<g id="${c.id}-twig">${c.tube([[-36, -41], [-16, -43.5], [10, -43.5], [36, -40]], 4.5, twig)}</g>`
      s += `<g id="${c.id}-pupa">${c.fill(c.E(0, -39.5, 5, 2.4), body.light, body.small, c.lw * 0.8)}${c.tube([[0, -39], [0, -33]], 2.6, body, { tone: 'small', straight: true, w: c.lw })}`
      s += c.body('body', c.S([[0, -35], [6, -33], [11, -26], [15, -14], [18, 0], [19, 14], [17, 28], [12, 38], [5, 45], [-1, 46.5], [-6, 43.5], [-11, 36], [-15, 24], [-17, 10], [-16, -4], [-12, -18], [-7, -29]]), body)
      if (c.big) s += c.line(c.M('M-11,-24 C-4,-21 4,-21 10,-25 M-14,-15 C-5,-11 6,-11 14,-15 M-16,-5 C-6,0 6,0 17,-5 M-17,6 C-10,9 -6,10 -3,10'), body.small, c.lw)
      s += c.body('wing-case', c.M('M18.5,0 C8,6 0,16 -3,28 C-4,36 -1,42 4,45.5 C10,41 15,33 17.5,24 C19.5,14 19.5,6 18.5,0 Z'), body, { tone: 'light', w: c.lw * 1.2 })
      if (c.big) s += c.line(c.M('M15,7 C9,15 5,24 4,35 M17.5,15 C14,22 11,30 10,38'), body.shadow, c.lw * 0.8)
      s += c.body('eye-case', c.E(-6, 39, 3.4, 2.6, -30), body, { tone: 'shadow', w: c.lw })
      if (c.big) s += c.fill([[-12.5, -19], [-15, -9.5], [-16.4, 1]].map(([x, y]) => c.C(x, y, 1.3)).join(' '), twig.small)
      s += c.back([[-11.5, 14], [-12.5, 22], [-11, 29], [-8, 34]], body) + '</g>'
      return { body: s, parts: [['pupa', body], ['twig', twig]] }
    },
  },
}
export function insect(g, opts) { return draw(INSECTS, 'insect', g, { kind: 'fly', ...opts }) }

// =====================================================================================================================
// An arthropod other than an insect. Kinds: 'spider' (from above, head up: eight jointed legs, palps, eye cluster, a
// pale mark on the abdomen), 'tick' (from above: a swollen body with a dark shield, mouthparts, eight legs), 'crab' (from
// above: wide shell with side teeth, claws, stalked eyes), 'lobster' (from above, head up: big claws, banded tail, tail
// fan, long antennae), 'shrimp' (side view facing left: curved segmented body, rostrum, legs and swimmerets), 'daphnia'
// (the water flea, side view facing left: see-through carapace with the green gut and eggs, branched antenna, one big
// eye, a tail spine), 'copepod' (from above: long antennae with bristles, segmented body, two green egg sacs, a red eye).
// Options: body, shield (tick), gut and eggs (daphnia), eggs (copepod). Joints, bristles and segment lines from 60 px.
// Used by: Spider, Tick, Crab, Lobster, Shrimp, Daphnia, Plankton.
// Example: arthropod(g, { x: 0, y: 0, size: 40, kind: 'daphnia', id: 'daphnia' })
// =====================================================================================================================
const ARTHROPODS = {
  spider: {
    box: [-47, -48, 47, 45],
    draw: (c, { body = SPIDER }) => {
      let d = ''
      ;[[[6, -16], [23, -31], [29, -47]], [[8, -12], [32, -23], [46, -35]], [[8, -8], [31, -3], [45, 13]], [[6, -4], [23, 15], [31, 44]]].forEach(([p, k, t]) => { for (const s of [1, -1]) d += c.M(`M${s * p[0]},${p[1]} L${s * k[0]},${k[1]} Q${s * (k[0] + (t[0] - k[0]) * 0.45 + (t[1] > k[1] ? 2 : -2))},${(k[1] + t[1]) / 2} ${s * t[0]},${t[1]}`) + ' ' })
      for (const s of [1, -1]) d += c.M(`M${s * 4},-20 L${s * 9},-28 L${s * 8},-34`) + ' '
      let s = `<g id="${c.id}-spider">${c.tube(d, 3, body, { w: c.lw * 1.1 })}${c.body('chelicerae', [c.E(-3.3, -23, 3, 4), c.E(3.3, -23, 3, 4)], body, { tone: 'shadow', w: c.lw })}`
      s += c.body('abdomen', c.E(0, 19, 16.5, 20.5), body)
      if (c.big) s += c.fill(c.M('M0,4 C3.5,9 3.5,16 0,22 C-3.5,16 -3.5,9 0,4 Z'), body.light) + c.line(c.M('M-9,24 L0,29 L9,24 M-7,31 L0,35.5 L7,31'), body.light, c.lw * 1.4)
      s += c.back([[-12, 8], [-9, 3], [-4, 0.5], [1, 0]], body) + c.body('cephalothorax', c.E(0, -10, 12.5, 13.5), body)
      if (c.big) s += c.line(c.M('M0,-8 L0,-2 M-7,-12 L-3,-7 M7,-12 L3,-7 M-8,-4 L-3,-4 M8,-4 L3,-4'), body.small, c.lw * 0.9)
      s += '</g>' + c.eye(-2.4, -18.5, 2) + c.eye(2.4, -18.5, 2) + c.fill([[-6.3, -17.2, 1.4], [6.3, -17.2, 1.4], [-3.6, -14.6, 1.3], [3.6, -14.6, 1.3]].map(([x, y, r]) => c.C(x, y, r)).join(' '), INK)
      return { body: s, parts: [['spider', body]] }
    },
  },
  tick: {
    box: [-48, -44, 48, 40],
    draw: (c, { body = TICK, shield = SCUTUM }) => {
      const L = 'M-12,-14 L-23,-24 L-29,-35 L-31,-44 M-16,-8 L-29,-14 L-39,-21 L-46,-25 M-18,-2 L-31,0 L-41,6 L-48,10 M-17,4 L-28,12 L-36,22 L-40,32'
      let s = `<g id="${c.id}-legs">${c.tube(c.M(L) + ' ' + c.M(flipD(L)), 2.4, shield, { tone: 'light', w: c.lw * 1.1 })}</g>`
      s += `<g id="${c.id}-body">${c.body('body', c.S([[0, -18], [13, -16], [21, -7], [25, 7], [23, 23], [14, 35], [0, 40], [-14, 35], [-23, 23], [-25, 7], [-21, -7], [-13, -16]]), body)}`
      if (c.big) s += c.line(c.M('M-17,10 C-18,22 -10,32 0,33 C10,32 18,22 17,10'), body.small, c.lw)
      s += c.back([[15, -4], [20, 2], [22, 10], [21, 19]], body) + '</g>'
      s += `<g id="${c.id}-shield">${c.body('palps', [c.E(-3.4, -29, 2.2, 5.2, -8), c.E(3.4, -29, 2.2, 5.2, 8)], shield, { w: c.lw })}${c.body('hypostome', c.M('M-1.5,-24 L0,-35 L1.5,-24 Z'), shield, { tone: 'shadow', w: c.lw * 0.8 })}`
      s += c.body('capitulum', c.M('M-7,-17 L-6,-25 L6,-25 L7,-17 Z'), shield, { w: c.lw * 1.2 }) + c.body('scutum', c.S([[0, -20], [11, -18], [15, -9], [11, 3], [0, 8], [-11, 3], [-15, -9], [-11, -18]]), shield)
      if (c.big) s += c.line(c.M('M-5,-15 C-6,-8 -6,-2 -4,3 M5,-15 C6,-8 6,-2 4,3'), shield.light, c.lw * 0.9)
      s += '</g>'
      return { body: s, parts: [['body', body], ['shield', shield]] }
    },
  },
  crab: {
    box: [-49, -49, 49, 32],
    draw: (c, { body = CRAB }) => {
      const legs = [[[-27, -3], [-39, -11], [-47, -2]], [[-29, 3], [-43, -1], [-49, 10]], [[-28, 9], [-42, 10], [-46, 22]], [[-24, 14], [-36, 19], [-38, 32]]]
      const all = legs.concat(legs.map((L) => L.map(([x, y]) => [-x, y])))
      let s = `<g id="${c.id}-crab">${c.tube(all.map((L) => c.L(L.slice(1))).join(' '), 2.8, body, { tone: 'shadow', w: c.lw * 1.1 })}${c.tube(all.map((L) => c.L(L.slice(0, 2))).join(' '), 4.5, body, { w: c.lw * 1.2 })}`
      s += c.tube(c.M('M-18,-14 L-28,-22 L-31,-29 M18,-14 L28,-22 L31,-29'), 6, body)
      const claw = (k) => c.S([[-38 * k, -30], [-42 * k, -38], [-38 * k, -46], [-30 * k, -48], [-21 * k, -46], [-26 * k, -42.5], [-30 * k, -40.5], [-23 * k, -37], [-28 * k, -31]])
      s += c.body('claws', [claw(1), claw(-1)], body)
      s += c.line(c.M('M-7,-18 L-9,-26 M7,-18 L9,-26'), body.outline, c.lw * 1.2)
      const tooth = (x, y, r) => { const a = rad(r), co = Math.cos(a), sn = Math.sin(a); return c.L([[-3, -3], [4, 0], [-3, 3]].map(([u, v]) => [x + u * co - v * sn, y + u * sn + v * co])) + 'Z' }
      s += c.body('teeth', [tooth(-30, -9, 200), tooth(-27, -15, 220), tooth(-21, -19, 245), tooth(30, -9, -20), tooth(27, -15, -40), tooth(21, -19, -65)], body, { w: c.lw })
      s += c.body('shell', c.S([[-30, -5], [-27, -13], [-18, -19], [-6, -20.5], [6, -20.5], [18, -19], [27, -13], [30, -5], [29, 4], [23, 12], [12, 18], [0, 19.5], [-12, 18], [-23, 12], [-29, 4]]), body)
      if (c.big) s += c.line(c.M('M-10,-9 C-6,-4 -6,4 -10,9 M10,-9 C6,-4 6,4 10,9 M-6,-1 L6,-1 M-4,-19 L-2,-15 L2,-15 L4,-19'), body.small, c.lw)
      s += c.back([[-20, -13], [-12, -16], [-4, -16], [4, -16]], body) + '</g>' + c.eye(-9, -27, 2.6) + c.eye(9, -27, 2.6)
      return { body: s, parts: [['shell', body]] }
    },
  },
  lobster: {
    box: [-46, -50, 46, 48],
    draw: (c, { body = LOBSTER }) => {
      let legs = ''
      ;[-6, -1, 4, 9].forEach((y, i) => { legs += c.M(`M-9,${y} L${-19 - i},${y - 3} L${-23 - i},${y + 7} M9,${y} L${19 + i},${y - 3} L${23 + i},${y + 7}`) + ' ' })
      let s = `<g id="${c.id}-lobster">${c.line(c.M('M-4,-22 C-24,-26 -42,-14 -46,12 M4,-22 C24,-26 42,-14 46,12'), body.outline, c.lw)}${c.tube(legs, 1.8, body, { tone: 'shadow', w: c.lw })}`
      s += c.tube(c.M('M-8,-15 L-17,-15 L-23,-22'), 5, body) + c.tube(c.M('M8,-15 L17,-15 L23,-22'), 4, body)
      s += c.body('claws', [c.M('M-20,-21 C-12,-26 -12,-38 -17,-46 L-19,-50 C-22,-46 -25,-42 -27,-40 C-29,-43 -31,-46 -34,-49 L-36,-48 C-39,-40 -38,-30 -32,-22 C-28,-19 -23,-19 -20,-21 Z'), c.M(flipD('M-20,-21 C-14,-25 -14,-38 -18,-47 L-20,-50 C-22,-45 -24,-42 -26,-40 C-28,-43 -30,-46 -32,-49 L-34,-48 C-36,-40 -35,-30 -31,-23 C-28,-20 -23,-19 -20,-21 Z'))], body)
      if (c.big) s += c.line(c.M('M-27,-40 C-26,-35 -25,-30 -24,-27 M26,-40 C25.5,-35 25,-30 24,-27'), body.small, c.lw) + c.fill([[-21, -30], [-30, -31], [-25, -25]].map(([x, y]) => c.C(x, y, 1.2)).join(' '), body.light)
      s += c.body('tail', [[12, 9], [17, 8.5], [22, 8], [27, 7], [32, 6]].map(([y, w]) => c.R(-w, y - 1, 2 * w, 6, 2.5)), body, { outline: true, w: c.w * 0.85 })
      s += c.body('fan', [c.M('M-6,36 C-12,38 -14,44 -11,47 L-4,46 Z'), c.M('M6,36 C12,38 14,44 11,47 L4,46 Z'), c.M('M-4,36 L4,36 L5,47 Q0,49 -5,47 Z')], body, { tone: 'light', w: c.lw * 1.2 })
      s += c.body('carapace', c.S([[0, -29], [5, -23], [10, -15], [11, -3], [10, 7], [6, 12], [-6, 12], [-10, 7], [-11, -3], [-10, -15], [-5, -23]]), body)
      if (c.big) s += c.line(c.M('M-10,-5 Q0,0 10,-5 M0,-26 L0,-16'), body.small, c.lw)
      s += c.back([[-5, -12], [-6, -4], [-6, 2], [-4, 8]], body) + '</g>' + c.eye(-4, -22, 1.8) + c.eye(4, -22, 1.8)
      return { body: s, parts: [['shell', body]] }
    },
  },
  shrimp: {
    box: [-52, -38, 47, 40],
    draw: (c, { body = SHRIMP }) => {
      const C = chain([[-38, -1, -24, -9, -2, -11, 16, -7], [16, -7, 32, -3, 40, 11, 34, 23], [34, 23, 30, 31, 22, 33, 13, 31]], 12)
      const n = C.length, hw = (t) => (t < 0.08 ? 5 + 7 * Math.sqrt(t / 0.08) : t < 0.3 ? 12 : 12 - (7.2 * (t - 0.3)) / 0.7)
      const at = (t, k) => { const i = Math.min(n - 1, Math.max(0, Math.round(t * (n - 1)))), p = C[i], q = C[Math.min(i + 1, n - 1)], r = C[Math.max(i - 1, 0)], dx = q[0] - r[0], dy = q[1] - r[1], l = Math.hypot(dx, dy) || 1, w = hw(i / (n - 1)) * k; return { p, tx: dx / l, ty: dy / l, L: [p[0] - (dy / l) * w, p[1] + (dx / l) * w], R: [p[0] + (dy / l) * w, p[1] - (dx / l) * w] } }
      const L = [], R = []; for (let i = 0; i < n; i++) { const a = at(i / (n - 1), 1); L.push(a.L); R.unshift(a.R) }
      let s = `<g id="${c.id}-shrimp">${c.line(c.M('M-40,3 C-30,-31 6,-42 46,-36 M-41,5 C-28,-23 10,-34 47,-26 M-42,1 C-46,-3 -49,-4 -52,-2 M-42,2 C-46,1 -49,3 -52,6'), body.outline, c.lw * 0.9)}`
      let lg = ''; [0.05, 0.1, 0.15, 0.2, 0.25].forEach((t, i) => { const [x, y] = at(t, 0.85).L; lg += c.L([[x, y], [x - 1 - i * 0.3, y + 7], [x - 5 - i * 0.3 + i * 0.5, y + 13]]) + ' ' })
      s += c.line(lg, body.outline, c.lw)
      s += c.body('tail-fan', [[-3, 25], [-5, 32], [-1, 39]].map(([x, y]) => { const dx = x - 13, dy = y - 31, l = Math.hypot(dx, dy), nx = (-dy / l) * 3.2, ny = (dx / l) * 3.2; return c.M(`M13,31 Q${13 + dx * 0.5 + nx},${31 + dy * 0.5 + ny} ${x},${y} Q${13 + dx * 0.5 - nx},${31 + dy * 0.5 - ny} 13,31 Z`) }), body, { tone: 'light', w: c.lw * 1.2 })
      let pl = ''; [0.4, 0.5, 0.6, 0.7].forEach((t) => { const [x, y] = at(t, 0.9).L, dx = 12 - x, dy = 13 - y, l = Math.hypot(dx, dy); pl += c.L([[x, y], [x + (dx / l) * 6, y + (dy / l) * 6]]) + ' ' })
      s += c.tube(pl, 1.6, body, { tone: 'shadow', w: c.lw }) + c.body('body', c.S([...L, ...R]), body)
      if (c.big) { let sg = ''; [0.4, 0.49, 0.58, 0.67, 0.76, 0.86].forEach((t) => { const a = at(t, 0.92); sg += c.O([a.R, [(a.L[0] + a.R[0]) / 2 + a.tx * 2, (a.L[1] + a.R[1]) / 2 + a.ty * 2], a.L]) + ' ' }); const cg = at(0.31, 0.95); sg += c.O([cg.R, [cg.p[0] + 2, cg.p[1] + 1], cg.L]); s += c.line(sg, body.small, c.lw) }
      const hl = []; for (let t = 0.1; t <= 0.62; t += 0.04) hl.push(at(t, 0.55).R); s += c.back(hl, body)
      s += c.body('rostrum', c.M('M-31,-8 C-38,-10 -45,-12.5 -52,-14 C-46,-9 -40,-6 -35,-4 Z'), body, { w: c.lw * 1.1 })
      s += c.tube(c.M('M-35,-2 L-39,-4'), 2.6, body, { w: c.lw }) + '</g>' + c.eye(-40.5, -4.6, 2.8)
      return { body: s, parts: [['shell', body]] }
    },
  },
  daphnia: {
    box: [-46, -47, 48, 45],
    draw: (c, { body = DAPHNIA, gut = GUT, eggs = GUT }) => {
      let s = `<g id="${c.id}-carapace">${c.body('carapace', [c.M('M24,25.5 C32,30 40,36 47.5,44.5 C39.5,39 31.5,34.5 25,31.5 Z'), c.S([[-40, 9], [-45, -2], [-44, -13], [-38, -21], [-29, -25], [-20, -25], [-8, -28], [8, -27], [22, -21], [32, -10], [36, 4], [34, 17], [28, 27], [18, 32], [6, 32], [-6, 28], [-16, 21], [-23, 15], [-30, 13], [-35, 14]])], body)}`
      if (c.big) s += c.line(c.M('M-23,-24 C-25.5,-12 -25.5,2 -23,15'), body.small, c.lw) + c.line(c.M('M-16,10 C-14,15 -11,19 -7,21 M-9,8 C-7,13 -4,17 0,20 M-2,8 C1,12 4,16 8,18'), body.small, c.lw * 0.8)
      s += c.back([[-13, -25], [-2, -27.5], [12, -26], [22, -19]], body) + '</g>'
      s += `<g id="${c.id}-gut">${c.tube([[-33, 6], [-22, -4], [-10, -3], [2, -1], [14, 1], [22, 8], [26, 18], [24, 27]], 3, gut, { w: c.lw })}${c.body('eggs', [[2, -17], [10, -19], [18, -15], [6, -10], [14, -9]].map(([x, y]) => c.E(x, y, 3.8, 3.1)), eggs, { tone: 'light', w: c.lw * 0.9 })}</g>`
      s += `<g id="${c.id}-antenna">${c.big ? c.line(c.M('M14,-45.5 L22,-43 M14,-45.5 L21,-48 M11,-35 L19,-32 M11,-35 L19,-36.5 M0,-44.5 L4,-48.5 M-2,-39 L2,-35.5'), body.outline, c.lw * 0.8) : ''}${c.tube(c.M('M-15,-37 C-7,-43 3,-45.5 14,-45.5 M-15,-37 C-7,-39 2,-37.5 11,-35'), 2.6, body, { w: c.lw })}${c.tube(c.M('M-25,-19 L-15,-37'), 4, body, { w: c.lw })}</g>`
      s += c.eye(-35, -11, 4.6) + c.fill(c.C(-39, 0, 1.4), INK)
      return { body: s, parts: [['carapace', body], ['gut', gut]] }
    },
  },
  copepod: {
    box: [-48, -39, 48, 50],
    draw: (c, { body = COPEPOD_BODY, eggs = EGG_SAC, eye = RED_EYE }) => {
      let an = '', se = ''
      for (const k of [1, -1]) { const P = [k * 5, -31, k * 18, -37, k * 35, -35, k * 47, -22]; an += c.M(`M${P[0]},${P[1]} C${P[2]},${P[3]} ${P[4]},${P[5]} ${P[6]},${P[7]}`) + ' '; [0.35, 0.5, 0.65, 0.8, 0.93].forEach((t) => { const [x, y] = bez(P, t); se += c.L([[x, y], [x + k * 2, y + 4.5]]) + ' ' }) }
      let s = `<g id="${c.id}-body">${c.big ? c.line(se, body.outline, c.lw * 0.7) : ''}${c.tube(an, 2.2, body, { w: c.lw })}`
      s += c.line(c.M('M-5,38 L-12,48 M-5,38 L-7,49.5 M5,38 L12,48 M5,38 L7,49.5'), body.outline, c.lw * 0.8) + c.tube(c.M('M-2.5,31 L-5,38 M2.5,31 L5,38'), 2, body, { w: c.lw }) + '</g>'
      s += `<g id="${c.id}-eggs">${c.body('egg-sacs', [1, -1].map((k) => c.E(k * 12, 21, 6.5, 11, -k * 12)), eggs)}`
      if (c.big) s += c.fill([[-14, 15], [-10, 18], [-14, 22], [-10, 25], [-13, 28.5]].flatMap(([x, y]) => [1, -1].map((k) => c.C(k * x + (k * 12 - k * x) * 0.15, y, 2))).join(' '), eggs.shadow)
      s += `</g><g id="${c.id}-body-near">${c.body('urosome', [c.R(-3.6, 26, 7.2, 6.5, 3), c.R(-4, 20.5, 8, 6.5, 3), c.R(-4.4, 15, 8.8, 6.5, 3), c.R(-5.4, 8, 10.8, 8, 3.5)], body, { w: c.w * 0.85 })}`
      s += c.body('prosome', c.S([[0, -38.5], [8, -36.5], [13, -30], [15, -20], [14.2, -8], [11, 2], [6, 9], [-6, 9], [-11, 2], [-14.2, -8], [-15, -20], [-13, -30], [-8, -36.5]]), body)
      s += c.line(c.M('M0,-25 C1,-14 -1,-4 0,7'), eggs.shadow, Math.max(1.2, 3.2 * c.F.px * 0.6))
      if (c.big) s += c.line(c.M('M-14,-24 Q0,-20.5 14,-24 M-14.6,-14 Q0,-10.5 14.6,-14 M-13.2,-4 Q0,-0.5 13.2,-4 M-10.6,3 Q0,6 10.6,3'), body.small, c.lw)
      s += c.back([[-10, -31], [-7, -35], [-3, -36.5], [1, -36.8]], body) + '</g>'
      s += `<g id="${c.id}-eye">${c.body('eye', c.C(0, -31, 2.6), eye, { tone: 'shadow', w: c.lw * 0.8, flat: true })}</g>`
      return { body: s, parts: [['body', body], ['egg sacs', eggs], ['eye', eye]] }
    },
  },
}
export function arthropod(g, opts) { return draw(ARTHROPODS, 'arthropod', g, { kind: 'spider', ...opts }) }

// =====================================================================================================================
// A soft-bodied or shelled invertebrate. Kinds: 'octopus' (front view, eight curling arms with pale suckers, round
// mantle, two eyes), 'snail' (side view facing left: spiral shell, foot, eye stalks), 'starfish' (five slightly turned
// arms with rows of bumps), 'urchin' (seen from above: spines, five rows of tube feet), 'jellyfish' (scalloped bell,
// frilled oral arms, thin tentacles, four gonad rings), 'turritopsis' (the immortal jellyfish: small bell with the red
// cross-shaped stomach and many short tentacles), 'polyp' (a hydroid colony: polyps on a branching stolon, the stage
// Turritopsis returns to), 'hydra' (upright on a foot, six tentacles with dots of stinging cells, a bud), 'planarian'
// (flatworm from above: arrow head with two eyespots, branched gut), 'tardigrade' (side view facing left: four pairs of
// stubby clawed legs), 'rotifer' (two ciliated wheels, mastax, foot with toes), 'earthworm' (a wavy ringed worm with its
// clitellum), 'clam' (the ocean quahog: shell with annual growth rings, the other valve behind), 'coral' (a branching
// coral on a rock, polyps at the tips), 'sponge' (three tubes with pores and dark openings, on the sea floor).
// Options: body, and for each kind the second colour named in it (suckers, shell, gonads, stomach, gut, rock, clitellum).
// Used by: Octopus, Snail, Starfish, Sea urchin, Jellyfish, Immortal jellyfish, Hydra, Planarian, Tardigrade, Rotifer,
//   Earthworm, Ocean quahog, Coral, Sea sponge, Mycorrhiza and soil scenes (the earthworm), Limb regeneration.
// Example: invertebrate(g, { x: 0, y: 0, size: 40, kind: 'hydra', id: 'hydra' })
// =====================================================================================================================
/** A tapering arm along Bézier segments with suckers on one side (`side` ±1), as the octopus draws them. */
const armOf = (c, S, w0, w1, side) => {
  const C = chain(S, 8), n = C.length, out = band(C, w0, w1)
  const dots = []
  C.forEach((p, i) => {
    if (!side || i <= 2 || i >= n - 2 || i % 2) return
    const q = C[Math.min(i + 1, n - 1)], r = C[Math.max(i - 1, 0)], dx = q[0] - r[0], dy = q[1] - r[1], l = Math.hypot(dx, dy) || 1, w = (w0 + ((w1 - w0) * i) / (n - 1)) / 2
    dots.push(c.C(p[0] - (side * dy / l) * w * 0.42, p[1] + (side * dx / l) * w * 0.42, Math.max(0.9, w * 0.42)))
  })
  return [c.S(out), dots.join(' ')]
}
const INVERTEBRATES = {
  octopus: {
    box: [-47, -47, 47, 48],
    draw: (c, { body = OCTOPUS }) => {
      const back = [[[-10, -6, -24, -6, -36, -8, -42, -18], [-42, -18, -46, -25, -40, -30, -35, -26]], [[-5, 2, -12, 14, -18, 26, -21, 36], [-21, 36, -23, 44, -14, 47, -13, 40]], [[10, -6, 24, -6, 36, -8, 42, -18], [42, -18, 46, -25, 40, -30, 35, -26]], [[5, 2, 12, 14, 18, 26, 21, 36], [21, 36, 23, 44, 14, 47, 13, 40]]]
      const front = [[[-12, -2, -24, 6, -36, 10, -42, 22], [-42, 22, -46, 31, -40, 37, -35, 32], 1], [[-3, 2, -5, 16, -9, 30, -7, 40], [-7, 40, -5, 46, -1, 46, -2, 41], -1], [[12, -2, 24, 6, 36, 10, 42, 22], [42, 22, 46, 31, 40, 37, 35, 32], -1], [[3, 2, 5, 16, 9, 30, 7, 40], [7, 40, 5, 46, 1, 46, 2, 41], 1]]
      let s = `<g id="${c.id}-body">${c.body('far-arms', back.map((S) => armOf(c, S, 8, 1.6, 0)[0]), body, { tone: 'shadow' })}`
      let suck = ''
      const arms = front.map(([a, b, sd]) => { const [p, d] = armOf(c, [a, b], 9, 1.6, sd); suck += d + ' '; return p })
      s += c.body('body', [...arms, c.S([[-14, -8], [-12, 4], [0, 8], [12, 4], [14, -8]]), c.S([[-15, -6], [-20, -16], [-22, -28], [-17, -39], [-6, -46], [7, -46], [17, -40], [22, -28], [20, -16], [15, -6], [0, -2]])], body)
      if (c.big) s += c.fill(suck, body.light, body.small, c.lw * 0.6) + c.fill([[8, -34, 2], [-4.4, -24, 1.6], [11.6, -22, 1.6], [-0.6, -36, 1.4]].map(([x, y, r]) => c.C(x, y, r)).join(' '), body.shadow)
      s += c.back([[-14, -30], [-12, -37], [-6, -42], [1, -43]], body)
      s += c.body('eyes', [c.C(-10, -12, 5.6), c.C(10, -12, 5.6)], body, { tone: 'light', w: c.lw * 1.2 }) + '</g>'
      s += c.fill(c.E(-10, -11.6, 3.5, 2.1) + ' ' + c.E(10, -11.6, 3.5, 2.1), INK) + (c.big ? c.fill(c.C(-11.4, -12.4, 0.8) + ' ' + c.C(8.6, -12.4, 0.8), '#FFFFFF') : '')
      return { body: s, parts: [['body', body]] }
    },
  },
  snail: {
    box: [-52, -36, 48, 38],
    draw: (c, { body = SNAIL, shell = SNAIL_SHELL }) => {
      const cx = 13, cy = -6
      let s = `<g id="${c.id}-body">${c.tube([[-35, 12], [-35, 4], [-35.5, -4], [-37, -12]], 2.8, body, { tone: 'shadow', w: c.lw * 1.1 })}${c.body('far-tip', c.C(-37, -13, 3), body, { tone: 'shadow', w: c.lw })}`
      s += c.body('foot', c.S([[48, 35], [34, 37], [10, 38], [-16, 38], [-34, 37], [-44, 35], [-48.5, 30], [-48.5, 22], [-45, 14], [-39, 10], [-31, 10], [-23, 14], [-12, 20], [4, 22], [24, 23], [38, 27], [46, 31.5]]), body)
      if (c.big) s += c.line(c.M('M-44,36.5 C-20,34.5 20,34.5 46,34 M-28,29 L-23,26 M-18,31 L-13,28 M-8,32 L-3,29 M2,33 L7,30 M12,33 L17,30'), body.small, c.lw * 0.8)
      s += c.tube([[-42, 14], [-44, 6], [-46, -2], [-49, -10]], 2.8, body, { w: c.lw * 1.1 }) + c.body('tip', c.C(-49, -11, 3), body, { w: c.lw })
      s += c.tube(c.M('M-45,17.5 C-48,18 -50.5,19.5 -52,22'), 2, body, { w: c.lw }) + '</g>' + c.fill(c.C(-37.4, -13.4, 1.4) + ' ' + c.C(-49.4, -11.4, 1.4), INK)
      s += `<g id="${c.id}-shell">${c.body('shell', c.C(cx, cy, 30), shell)}`
      const sp = []; for (let i = 0; i <= 72; i++) { const p = i * 0.24, r = 27 * Math.exp(-0.1 * p), t = 2.05 + p; sp.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]) }
      s += c.line(c.O(sp), shell.outline, Math.max(c.lw, 2.4 * c.F.px * 0.6))
      if (c.big) { let gr = ''; for (let k = 0; k < 12; k++) { const t = 2.5 + k * 0.42; gr += c.L([[cx + 28.6 * Math.cos(t), cy + 28.6 * Math.sin(t)], [cx + 24.1 * Math.cos(t), cy + 24.1 * Math.sin(t)]]) + ' ' } s += c.line(gr, shell.small, c.lw * 0.8) }
      s += c.back(Array.from({ length: 8 }, (_, i) => { const t = 0.95 + (i / 7) * 0.65; return [cx - 24 * Math.cos(t), cy - 24 * Math.sin(t)] }), shell) + '</g>'
      return { body: s, parts: [['body', body], ['shell', shell]] }
    },
  },
  starfish: {
    box: [-47, -47, 47, 47],
    draw: (c, { body = STARFISH }) => {
      const tw = [5, -6, 7, -4, 6], pt = (r, t) => [r * Math.cos(rad(t)), r * Math.sin(rad(t))], ang = (i, r) => -90 + 72 * i + tw[i] * Math.pow(r / 46, 2)
      const P = []; for (let i = 0; i < 5; i++) { const t = -90 + 72 * i; P.push(pt(30, ang(i, 30) - 11), pt(43.5, ang(i, 43.5) - 5.2), pt(46.5, ang(i, 46.5)), pt(43.5, ang(i, 43.5) + 5.2), pt(30, ang(i, 30) + 11), pt(17, t + 36)) }
      let s = `<g id="${c.id}-body">${c.body('body', c.S(P), body)}`
      if (c.big) {
        let d = '', d2 = ''
        for (let i = 0; i < 5; i++) { [10, 17, 24, 31, 38].forEach((r, k) => { const [x, y] = pt(r, ang(i, r)); d += c.C(x, y, 2.6 - k * 0.32) + ' ' }); [15, 23, 31].forEach((r, k) => [-1, 1].forEach((g2) => { const [x, y] = pt(r, ang(i, r) + g2 * (15 - k * 3.5)); d2 += c.C(x, y, 1.5 - k * 0.15) + ' ' })) }
        s += c.fill(d2, body.light) + c.fill(d, body.small)
      }
      s += c.fill(c.C(0, 0, 3.2), body.small) + c.fill(c.C(9, 7, 3), body.light, body.small, c.lw * 0.8) + '</g>'
      return { body: s, parts: [['body', body]] }
    },
  },
  urchin: {
    box: [-47, -47, 47, 47],
    draw: (c, { body = URCHIN }) => {
      const sp = (n, R, r0, w, off) => { const out = []; for (let i = 0; i < n; i++) { const t = ((i + off) / n) * 2 * Math.PI, co = Math.cos(t), sn = Math.sin(t), L = typeof R === 'number' ? R : R[i % 2]; out.push(c.L([[co * r0 - sn * w, sn * r0 + co * w], [co * L, sn * L], [co * r0 + sn * w, sn * r0 - co * w]]) + 'Z') } return out.join(' ') }
      let s = `<g id="${c.id}-spines">${c.fill(sp(24, 36, 22, 2, 0.5), body.light, body.shadow, c.lw * 0.6)}${c.fill(sp(24, [47, 41], 22, 2.6, 0), body.shadow, body.outline, c.lw * 0.7)}</g>`
      s += `<g id="${c.id}-body">${c.body('test', c.C(0, 0, 27), body)}`
      if (c.big) {
        let am = '', it = ''
        for (let k = 0; k < 5; k++) { const t = rad(-90 + 72 * k), co = Math.cos(t), n = Math.sin(t); [9, 13.5, 18, 22.5].forEach((r) => [-2.6, 2.6].forEach((q) => { am += c.C(co * r - n * q, n * r + co * q, 1.3) + ' ' })); const t2 = t + rad(36); [[12, 2.2], [19.5, 2.4]].forEach(([r, R]) => { it += c.C(Math.cos(t2) * r, Math.sin(t2) * r, R) + ' ' }) }
        s += c.fill(it, body.shadow) + c.fill(am, body.light)
      }
      s += c.back(Array.from({ length: 6 }, (_, i) => { const t = rad(205 + i * 9); return [23 * Math.cos(t), 23 * Math.sin(t)] }), body)
      s += c.fill(c.L(Array.from({ length: 5 }, (_, k) => { const t = rad(-90 + 72 * k); return [6 * Math.cos(t), 6 * Math.sin(t)] })) + 'Z', body.light, body.small, c.lw * 0.8) + '</g>'
      return { body: s, parts: [['body', body]] }
    },
  },
  jellyfish: {
    box: [-42, -42, 42, 46],
    draw: (c, { body = JELLY, gonads = JELLY_GONAD }) => {
      const frill = (P, w0, w1) => c.S(band(chain([P], 12), 0, 0, (t) => (w0 + (w1 - w0) * t) * (1 + 0.18 * Math.sin(t * 20))))
      let s = `<g id="${c.id}-body">${c.line([-38, -26, -13, 13, 26, 38].map((x, i) => c.O([[x, 1], [x + (i % 2 ? 1 : -1), 9], [x, 17], [x + (i % 2 ? 1.5 : -1.5), 27], [x + (x > 0 ? 2 : -2), 44]])).join(' '), body.small, Math.max(1, 1.3 * c.F.px * 0.6))}`
      s += c.body('arms', [frill([-2, -2, -4, 16, 6, 26, -2, 44], 6, 2.5), frill([-6, -2, -16, 14, -6, 26, -17, 40], 8, 3), frill([6, -2, 16, 14, 6, 26, 17, 40], 8, 3)], body, { tone: 'shadow', w: c.lw * 1.1 })
      let bell = 'M-42,0 C-42,-26 -22,-42 0,-42 C22,-42 42,-26 42,0'
      for (let x = 42; x > -42; x -= 14) bell += ` Q${x - 7},6 ${x - 14},0`
      s += c.body('bell', c.M(bell + ' Z'), body)
      if (c.big) s += c.line(c.M('M-38,-3 C-26,-7 26,-7 38,-3'), body.small, c.lw)
      s += c.back([[-31, -20], [-27, -29], [-18, -35], [-8, -37]], body) + '</g>'
      s += `<g id="${c.id}-gonads">${c.line(c.M('M-21,-19 C-22,-25 -12,-25 -13,-19 M-4,-22 C-5,-28 5,-28 4,-22 M13,-19 C12,-25 22,-25 21,-19'), gonads.shadow, Math.max(1.2, 2.8 * c.F.px * 0.6))}</g>`
      return { body: s, parts: [['bell', body], ['gonads', gonads]] }
    },
  },
  turritopsis: {
    box: [-39, -40, 15, 23],
    draw: (c, { body = TURRITOPSIS, stomach = STOMACH }) => {
      let tt = ''
      for (let i = 0; i < 15; i++) { const x = -33 + i * 3.1, k = i % 2 ? 2 : -2; tt += c.M(`M${x},5 C${x + k},11 ${x - k},15 ${x + k * 0.6},${19 + (i % 3) * 2}`) + ' ' }
      let s = `<g id="${c.id}-body">${c.line(tt, body.outline, Math.max(1, 1.1 * c.F.px * 0.6))}${c.body('bell', c.M('M-36,5 C-38,-15 -30,-40 -12,-40 C6,-40 14,-15 12,5 C4,8 -28,8 -36,5 Z'), body)}`
      if (c.big) s += c.line(c.M('M-31,3 C-31,-12 -25,-33 -12,-33 C1,-33 7,-12 7,3'), body.small, c.lw)
      s += c.back([[-28, -24], [-26, -31], [-20, -36], [-14, -37]], body) + '</g>'
      const P = []; for (let i = 0; i < 32; i++) { const t = (i / 32) * Math.PI * 2, r = 6.5 + 3.2 * Math.cos(4 * t); P.push([-12 + Math.cos(t) * r, -16 + Math.sin(t) * r * 0.8]) }
      s += `<g id="${c.id}-stomach">${c.big ? c.line(c.M('M-12,-26 C-22,-24 -28,-10 -29,4 M-12,-26 C-2,-24 4,-10 5,4 M-12,-22 L-12,5 M-34,4.5 C-24,7.5 -2,7.5 10,4.5'), stomach.base, c.lw * 1.1) : ''}${c.body('stomach', [c.S(P), c.M('M-15,-12 C-15,-6 -14,-2 -12,1 C-10,-2 -9,-6 -9,-12 Z')], stomach, { w: c.lw })}</g>`
      return { body: s, parts: [['bell', body], ['stomach', stomach]] }
    },
  },
  polyp: {
    box: [14, 3, 49, 46],
    draw: (c, { body = TURRITOPSIS, stomach = STOMACH }) => {
      const hy = (x, y, r) => { const a = rad(r), co = Math.cos(a), sn = Math.sin(a), T = (pts) => pts.map(([u, v]) => [x + u * co - v * sn, y + u * sn + v * co]); return [c.S(T([[-2, 2], [-3.6, -1], [-3.6, -4], [-3, -6], [3, -6], [3.6, -4], [3.6, -1], [2, 2]])), [[-5, -11], [-2, -12.5], [2, -12.5], [5, -11], [-6, -8], [6, -8]].map((e) => c.L(T([[0, -6], e]))).join(' ')] }
      const H = [hy(30, 13, 0), hy(40, 17, 25), hy(20, 25, -25)]
      let s = `<g id="${c.id}-stolon">${c.tube(c.M('M16,44 L48,44 M26,44 C26,34 28,24 30,14 M30,26 C34,24 38,22 40,18 M28,36 C24,34 22,30 20,26'), 2, stomach, { tone: 'shadow', w: c.lw })}${c.line(H.map((h) => h[1]).join(' '), stomach.small, Math.max(1, 1.1 * c.F.px * 0.6))}</g>`
      s += `<g id="${c.id}-polyps">${c.body('polyps', H.map((h) => h[0]), body, { tone: 'shadow', w: c.lw })}</g>`
      return { body: s, parts: [['polyps', body], ['stolon', stomach]] }
    },
  },
  hydra: {
    box: [-46, -50, 46, 48],
    draw: (c, { body = HYDRA }) => {
      const T = [[-7, -16, -18, -21, -30, -16, -45, -22], [-6, -19, -14, -30, -26, -34, -36, -46], [-2, -21, -4, -32, -14, -40, -13, -50], [2, -21, 6, -34, 4, -42, 12, -50], [6, -19, 16, -28, 24, -36, 36, -45], [7, -16, 20, -20, 32, -14, 46, -21]]
      const BT = [[20.5, 1.5, 18.5, -2.5, 17.5, -5.5, 14.5, -9.5], [23.5, -0.5, 24.5, -4.5, 25.5, -7.5, 27.5, -11.5], [27, 2, 30, 0, 33, -1, 36.5, -3], [28, 6, 31, 7, 34, 8, 37.5, 8]]
      const tp = (P, w0, w1) => c.S(band(chain([P], 6), w0, w1))
      let s = `<g id="${c.id}-body">${c.body('body', [...T.map((P) => tp(P, 4.4, 1.4)), ...BT.map((P) => tp(P, 2.8, 1)), tp([2, 26, 11, 21, 18, 13, 24, 4], 13, 10), c.S([[-3, 45], [-4, 36], [-4, 26], [-6, 14], [-8, 2], [-10, -8], [-9, -15], [-5, -20], [0, -22], [5, -20], [9, -15], [10, -8], [8, 2], [6, 14], [5, 26], [4, 36], [3, 45]])], body)}`
      s += c.fill(c.S([[-1.5, 36], [-2, 26], [-3.5, 14], [-5, 2], [-6, -8], [-4, -14], [0, -16], [4, -14], [6, -8], [5, 2], [3.5, 14], [2, 26], [1.5, 36]]), body.shadow)
      if (c.big) s += c.line(c.M('M-7,-14 C-3,-12 3,-12 7,-14'), body.small, c.lw) + c.fill(T.flatMap((P) => [0.32, 0.55, 0.78].map((t) => { const [x, y] = bez(P, t); return c.C(x, y, 1.25) })).join(' '), body.small)
      s += c.back([[-7, -6], [-6.5, 4], [-5, 14], [-3, 24]], body) + c.body('foot', c.E(0, 45.5, 6.5, 2.6), body, { tone: 'shadow', w: c.lw * 1.1 }) + '</g>'
      return { body: s, parts: [['body', body]] }
    },
  },
  planarian: {
    box: [-50, -16, 49, 16],
    draw: (c, { body = PLANARIAN }) => {
      const top = [[-46, -5], [-42, -10], [-37, -15.5], [-33, -12], [-28, -12], [-14, -14.5], [2, -15.5], [18, -14], [30, -11], [40, -6.5], [46, -2.5]]
      let s = `<g id="${c.id}-body">${c.body('body', c.S([[-49.5, 0], ...top, [49, 0], ...top.slice().reverse().map(([x, y]) => [x, -y])]), body)}`
      s += c.back([[-20, -11], [-4, -13], [14, -12.5], [28, -9.5]], body)
      if (c.big) s += c.line(c.M('M-4,0 L-30,0 M-4,0 C0,-6 6,-7.5 14,-7.5 C24,-7.5 32,-5.5 40,-3 M-4,0 C0,6 6,7.5 14,7.5 C24,7.5 32,5.5 40,3 M-11,0 L-15,-6 M-19,0 L-23,-6 M-26,0 L-29,-5 M-11,0 L-15,6 M-19,0 L-23,6 M-26,0 L-29,5 M4,-7 L6,-11.5 M12,-7.5 L14,-12 M20,-7.5 L22,-12 M28,-6.5 L30,-10.5 M35,-5 L37,-8.5 M4,7 L6,11.5 M12,7.5 L14,12 M20,7.5 L22,12 M28,6.5 L30,10.5 M35,5 L37,8.5'), body.shadow, c.lw * 1.2)
      s += c.fill(c.E(7, 0, 9, 3), body.light, body.small, c.lw * 0.8) + '</g>'
      s += c.fill(c.E(-36, -4.6, 3.3, 2.6) + ' ' + c.E(-36, 4.6, 3.3, 2.6), '#FFFFFF', body.small, c.lw * 0.6) + c.fill(c.C(-35.2, -3.6, 1.7) + ' ' + c.C(-35.2, 3.6, 1.7), INK)
      return { body: s, parts: [['body', body]] }
    },
  },
  tardigrade: {
    box: [-48, -28, 48, 14],
    draw: (c, { body = TARDIGRADE }) => {
      const leg = (x, y, r) => { const a = rad(r), co = Math.cos(a), sn = Math.sin(a), T = (pts) => pts.map(([u, v]) => [x + u * co - v * sn, y - 6 + u * sn + v * co]); return { d: c.S(T([[-5, -6], [-5.2, 6], [-4, 12.5], [0, 14.5], [4, 12.5], [5.2, 6], [5, -6]])), claw: c.O(T([[-1.8, 14], [-4, 15.8], [-7.5, 16.8]])) + ' ' + c.O(T([[1.2, 14.4], [0.6, 17], [-3, 19.8]])) } }
      const far = [leg(-22, 11, 0), leg(-4, 12, 0), leg(14, 12, 0), leg(36, 5, -40)], near = [leg(-30, 16, 0), leg(-12, 17, 0), leg(6, 17, 0), leg(29, 13, -40)]
      const Y = (p) => p.map(([u, v]) => [u, v - 6])
      let s = `<g id="${c.id}-body">${c.body('far-legs', far.map((l) => l.d), body, { tone: 'shadow' })}${c.body('legs', near.map((l) => l.d), body)}${c.big ? c.line(near.map((l) => l.claw).join(' '), body.outline, c.lw) : ''}`
      s += c.body('body', c.S(Y([[-47, 2], [-45, -6], [-39, -13], [-31, -17], [-24, -16], [-16, -20], [-6, -21], [2, -19], [10, -22], [20, -22], [27, -19], [34, -20], [41, -15], [46, -6], [47, 4], [43, 12], [34, 16], [20, 17], [4, 17], [-12, 16], [-26, 14], [-38, 11], [-44, 7]])), body)
      s += c.back(Y([[-12, -16], [-4, -19], [6, -19], [16, -18.5]]), body)
      if (c.big) s += c.line(c.M('M-24,-20 C-27,-10 -27,0 -25,7 M2,-23 C-1,-12 -1,0 1,9 M27,-23 C30,-12 30,-2 28,8'), body.small, c.lw) + c.fill([[-16, -6], [-10, 5], [-18, 4], [10, -8], [14, 4], [7, -1], [34, -6], [37, 4], [20, -10]].map(([x, y]) => c.C(x, y - 6, 1.7)).join(' '), body.shadow)
      s += c.fill(c.E(-31.5, -5, 4, 3.2), body.light, body.small, c.lw * 0.8) + c.body('mouth', c.E(-46, -4, 2, 3), body, { tone: 'shadow', w: c.lw }) + '</g>' + c.eye(-37, -13, 1.6)
      return { body: s, parts: [['body', body]] }
    },
  },
  rotifer: {
    box: [-27, -45, 27, 47],
    draw: (c, { body = ROTIFER, gut = ROTIFER_GUT }) => {
      const cil = (cx, cy, r) => Array.from({ length: 11 }, (_, i) => { const t = Math.PI * (1.05 + i * 0.09); return c.L([[cx + Math.cos(t) * r, cy + Math.sin(t) * r], [cx + Math.cos(t) * (r + 5), cy + Math.sin(t) * (r + 5)]]) }).join(' ')
      let s = `<g id="${c.id}-body">${c.big ? c.line(cil(-12, -30, 10) + ' ' + cil(12, -30, 10), body.outline, c.lw * 0.8) : ''}`
      s += c.body('foot', [[0, 26, 6, 6], [0, 32, 5, 5], [0, 37.5, 4, 4.5]].map(([x, y, w, h]) => c.E(x, y, w, h)).concat([c.M('M-3.5,40 L-6,47 L-2,44 Z'), c.M('M3.5,40 L6,47 L2,44 Z')]), body, { w: c.w * 0.9 })
      s += c.body('body', c.S([[-6, 22], [-10, 14], [-15, 2], [-18, -10], [-18, -22], [-11, -24], [0, -22], [11, -24], [18, -22], [18, -10], [15, 2], [10, 14], [6, 22]]), body)
      s += c.body('wheels', [c.C(-12, -30, 10), c.C(12, -30, 10)], body, { tone: 'light' }) + c.fill(c.C(-12, -30, 4.5) + ' ' + c.C(12, -30, 4.5), body.shadow, body.small, c.lw * 0.8)
      s += c.back([[-13, -14], [-14, -4], [-12, 6], [-8, 14]], body) + '</g>'
      s += `<g id="${c.id}-gut">${c.body('mastax', c.M('M-6,-14 C-6,-19 -1,-19 0,-15 C1,-19 6,-19 6,-14 C6,-9 2,-7 0,-6 C-2,-7 -6,-9 -6,-14 Z'), gut, { w: c.lw })}${c.body('gut', c.S([[0, -4], [7, 0], [9, 8], [6, 14], [0, 16], [-6, 14], [-9, 8], [-7, 0]]), gut, { tone: 'light', w: c.lw })}`
      if (c.big) s += c.fill(c.C(-1, 4, 2) + ' ' + c.C(2.6, 10, 1.6) + ' ' + c.C(-3.6, 9, 1.4), gut.shadow)
      s += '</g>' + c.line(c.M('M-4,30 L-9,33 M4,30 L9,33'), body.outline, c.lw)
      return { body: s, parts: [['body', body], ['gut', gut]] }
    },
  },
  earthworm: {
    box: [-46, -20, 46, 20],
    draw: (c, { body = EARTHWORM }) => {
      const N = 56, W = 7, X = (t) => -46 + 92 * t, Y = (t) => -12 * Math.sin(2 * Math.PI * t)
      const T = (t) => { const dx = 92, dy = -24 * Math.PI * Math.cos(2 * Math.PI * t), l = Math.hypot(dx, dy); return [dx / l, dy / l] }
      const cl = (t) => 1.8 * Math.max(0, Math.min(1, (t - 0.2) / 0.025, (0.32 - t) / 0.025))
      const hw = (t) => (t < 0.1 ? W * Math.pow(Math.max(0, 1 - Math.pow(1 - t / 0.1, 2)), 0.55) : t > 0.86 ? W * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.86) / 0.14, 2))) * 0.92 + (W * 0.08 * (1 - t)) / 0.14 : W) + cl(t)
      const pt = (t, k) => { const [tx, ty] = T(t), w = hw(t) * k; return [[X(t) - ty * w, Y(t) + tx * w], [X(t) + ty * w, Y(t) - tx * w]] }
      const L = [], R = []; for (let i = 0; i <= N; i++) { const t = (1 - Math.cos((Math.PI * i) / N)) / 2, [l, r] = pt(t, 1); L.push(l); if (i > 0 && i < N) R.unshift(r) }
      let s = `<g id="${c.id}-body">${c.body('body', c.S([...L, ...R]), body)}`
      if (c.big) { let rg = ''; for (let t = 0.06; t < 0.95; t += 0.034) { if (t > 0.185 && t < 0.335) continue; const [l, r] = pt(t, 0.86), [tx, ty] = T(t); rg += c.O([l, [(l[0] + r[0]) / 2 + tx * 1.6, (l[1] + r[1]) / 2 + ty * 1.6], r]) + ' ' } s += c.line(rg, body.small, c.lw * 0.8) }
      const hl = []; for (let t = 0.38; t <= 0.72; t += 0.02) hl.push(pt(t, 0.48)[1]); s += c.back(hl, body)
      const bl = [], br = []; for (let t = 0.2; t <= 0.3201; t += 0.01) { const [l, r] = pt(t, 1); bl.push(l); br.unshift(r) }
      s += c.body('clitellum', c.S([...bl, ...br]), body, { tone: 'shadow', w: c.lw * 1.1 }) + '</g>'
      return { body: s, parts: [['body', body]] }
    },
  },
  clam: {
    box: [-46, -43, 47, 45],
    draw: (c, { body = CLAM, inside = CLAM_INSIDE }) => {
      const U = [-11, -38], P = [[-12, -42], [-4, -40], [8, -37], [22, -30], [34, -20], [42, -6], [44, 8], [40, 21], [30, 31], [16, 37], [0, 40], [-16, 38], [-29, 31], [-39, 20], [-44, 6], [-43, -8], [-37, -22], [-27, -33], [-19, -39]]
      const sc = (k, dx = 0, dy = 0) => c.S(P.map(([x, y]) => [U[0] + (x - U[0]) * k - 1 + dx, U[1] + (y - U[1]) * k + 1 + dy]))
      let s = `<g id="${c.id}-inside">${c.body('other-valve', sc(1, 2.5, 3.5), inside, { tone: 'shadow' })}</g><g id="${c.id}-shell">${c.body('shell', sc(1), body, { tone: 'shadow' })}`
      ;[0.955, 0.915, 0.875, 0.83, 0.77, 0.69, 0.58, 0.44, 0.28].forEach((k, i) => { if (c.big || i % 2 === 0) s += c.fill(sc(k), i % 2 ? body.shadow : body.base, body.small, c.lw * (c.big ? 0.6 : 0.8)) })
      s += c.fill(c.M('M-14,-41 C-10,-43 -6,-40 -7,-36 C-10,-34 -14,-36 -14,-41 Z'), body.light, body.small, c.lw * 0.7) + c.line(c.M('M-5,-39 C3,-38 11,-35 17,-31'), body.outline, Math.max(1.4, 3 * c.F.px * 0.6))
      s += c.back([[-35, -13], [-32, -21], [-26, -27], [-19, -31]], body) + '</g>'
      return { body: s, parts: [['shell', body], ['inside', inside]] }
    },
  },
  coral: {
    box: [-43, -46, 43, 47],
    draw: (c, { body = CORAL, rock = ROCK }) => {
      const S = [[[0, 40, 0, 30, -2, 22, -2, 14], 12], [[-2, 16, -10, 8, -20, 4, -24, -8], 10], [[-23, -5, -32, -8, -36, -16, -38, -29], 8], [[-24, -8, -25, -18, -22, -27, -24, -39], 8], [[-1, 16, 8, 6, 18, 2, 22, -8], 10], [[21, -5, 30, -8, 36, -14, 39, -28], 8], [[22, -8, 22, -18, 19, -28, 22, -40], 8], [[-1, 14, 1, 0, -3, -22, 0, -43], 9], [[-35, -14, -39, -15, -42, -17, -43, -22], 6], [[33, -11, 37, -11, 40, -12, 43, -16], 6]]
      const W = (w) => Math.max(0.8, w * c.F.px) / strokeScale(), d = S.map(([P]) => c.M(`M${P[0]},${P[1]} C${P[2]},${P[3]} ${P[4]},${P[5]} ${P[6]},${P[7]}`))
      let s = `<g id="${c.id}-coral">${S.map(([, w], i) => c.line(d[i], body.outline, W(w) + 2 * c.w * 0.8)).join('')}${S.map(([, w], i) => c.line(d[i], body.base, W(w))).join('')}`
      if (c.big) { let dt = ''; S.forEach(([P, w], i) => { if (!i) return; [0.3, 0.55, 0.78].forEach((t, j) => { const [x, y] = bez(P, t); dt += c.C(x + (j % 2 ? 1 : -1) * w * 0.2, y, 1.3) + ' ' }) }); s += c.fill(dt, body.shadow) }
      s += c.fill(S.slice(1).map(([P, w]) => c.C(P[6], P[7], w * 0.3)).join(' '), body.light, body.small, c.lw * 0.8)
      s += c.back([[-5, 30], [-5, 24], [-6, 19], [-7, 16]], body) + '</g>'
      s += `<g id="${c.id}-rock">${c.body('rock', c.S([[-38, 46], [-33, 39], [-20, 35], [-6, 34.5], [10, 35], [24, 37], [35, 42], [38, 46.5]]), rock)}${c.big ? c.fill(c.C(-22.5, 41, 1.5) + ' ' + c.C(15.3, 41, 1.3) + ' ' + c.C(27.1, 43, 1.1), rock.small) : ''}</g>`
      return { body: s, parts: [['coral', body], ['rock', rock]] }
    },
  },
  sponge: {
    box: [-46, -44, 46, 46],
    draw: (c, { body = SPONGE, floor = ROCK }) => {
      const R = rng(32)
      const tube = (cx, top, base, w, lean) => {
        const mid = (top + base) / 2, h = w / 2
        let t = c.body(`tube${cx}`, c.M(`M${cx - h * 0.9},${base} C${cx - h * 1.2},${mid} ${cx - h * 1.1 + lean},${top + 14} ${cx - h + lean},${top} L${cx + h + lean},${top} C${cx + h * 1.1 + lean},${top + 14} ${cx + h * 1.2},${mid} ${cx + h * 0.9},${base} Z`), body)
        t += c.back([[cx - h * 0.6, base - 4], [cx - h * 0.82, mid], [cx - h * 0.78 + lean, top + 14], [cx - h * 0.7 + lean, top + 6]], body)
        let p = ''; for (let i = 0; i < Math.round((base - top) / 5); i++) { const y = top + 9 + R() * (base - top - 14), k = (y - top) / (base - top), x = cx + lean * (1 - k) + (R() * 1.5 - 0.5) * h * 0.65, r = 1.2 + R() * 0.9; p += c.C(x, y, r) + ' ' }
        if (c.big) t += c.fill(p, body.small)
        return t + c.fill(c.E(cx + lean, top, h, w * 0.18), body.light, body.outline, c.w) + c.fill(c.E(cx + lean, top + 0.8, h * 0.68, w * 0.11), body.outline)
      }
      let s = `<g id="${c.id}-sponge">${tube(0, -40, 40, 26, 1)}${tube(-25, -12, 40, 22, -4)}${tube(25, -24, 40, 24, 4)}</g>`
      s += `<g id="${c.id}-floor">${c.body('floor', c.M('M-46,46 C-46,40 -36,37 -24,38 C-12,36 8,37 20,38 C34,36 46,40 46,46 Z'), floor)}</g>`
      return { body: s, parts: [['sponge', body], ['sea floor', floor]] }
    },
  },
}
export function invertebrate(g, opts) { return draw(INVERTEBRATES, 'invertebrate', g, { kind: 'octopus', ...opts }) }

/** Points turned by r degrees about the origin and moved to x, y (local units). */
const place = (pts, x, y, r = 0) => { const a = rad(r), co = Math.cos(a), sn = Math.sin(a); return pts.map(([u, v]) => [x + u * co - v * sn, y + u * sn + v * co]) }
/** A pointed leaf from 0,0 to 0,−L, W wide, as points; with its midrib. */
const leafPts = (L, W) => [[0, 0], [W * 0.55, -L * 0.12], [W, -L * 0.42], [W * 0.75, -L * 0.75], [0, -L], [-W * 0.75, -L * 0.75], [-W, -L * 0.42], [-W * 0.55, -L * 0.12]]

// =====================================================================================================================
// A plant, or a part of one. Kinds: 'potted' (a young plant in a terracotta pot with soil), 'seedling' (two seed leaves
// on a short stem above a soil line, `roots` shows a few roots), 'arabidopsis' (rosette, flowering stem with small white
// flowers and seed pods), 'leaf' (one leaf on its stalk with veins, tilted), 'flower' (five petals with a yellow centre,
// stem and two leaves), 'cactus' (columnar with two arms, ribs and spines, on sand), 'conifer' (tiered fir on a trunk),
// 'moss' (a cushion with capsules on stalks), 'fern' (a curving frond of pinnae with spore dots, and a fiddlehead),
// 'rice' (stems with nodding grain heads and long leaves), 'maize' (an ear of corn in its husks with silk), 'tomato' (a
// glossy red fruit with its green calyx), 'legume' (a pea plant: trifoliate leaves and a pod above ground, roots with pink
// nodules in soil), 'seed' (a bean seed with the embryo inside and its hilum), 'roots' (a root system with root hairs,
// for mycorrhiza), 'kelp' (two stipes with blades and floats on a holdfast), 'seagrass' (blades in sediment), 'mangrove'
// (rounded canopy on stilt roots standing in water), 'stoma' (two guard cells round the pore, in the epidermis, face view),
// 'vascular bundle' (cross-section of a stem with a ring of bundles: xylem and phloem round the pith), 'pot' (the empty
// pot with soil). Greens: LEAF, DARK_LEAF for conifers, moss and kelp-like dark leaves, YOUNG for seedlings and grass.
// Options: leaf, flower, soil, pot (false leaves the pot out), roots, water. Veins and ribs from 60 px.
// Used by: Plant, Arabidopsis, Leaf, Flower, Cactus, Conifer, Moss, Fern, Rice, Maize, Tomato, Legume, Seed, Kelp, Seagrass,
//   Mangrove, Stoma, Vascular bundle, Plant growth stages, Photosynthesis, Mycorrhiza, Symbiosis, Life cycle.
// Example: plant(g, { x: 0, y: 0, size: 60, kind: 'potted', id: 'plant' })
// =====================================================================================================================
const potOf = (c, soil = SOIL, pot = POT) =>
  `<g id="${c.id}-soil">${c.body('soil', c.M('M-24,15 C-14,10.5 14,10.5 24,15 Z'), soil, { w: c.lw * 1.2 })}</g><g id="${c.id}-pot">${c.body('pot', c.M('M-23,22 L23,22 L18.5,46 L-18.5,46 Z'), pot)}${c.fill(c.M('M12.5,22 L22.5,22 L18.5,45.3 L10.5,45.3 Z'), pot.shadow)}${c.body('rim', c.R(-27, 14, 54, 9, 2.5), pot, { tone: 'light' })}${c.back([[-16, 27], [-15.5, 32], [-14.5, 37], [-14, 41]], pot)}</g>`
const PLANTS = {
  potted: {
    box: [-30, -48, 30, 46],
    draw: (c, { leaf = LEAF, soil = SOIL, pot = POT }) => {
      const L = (x, y, r, l, w) => c.S(place(leafPts(l, w), x, y, r))
      const veins = (x, y, r, l) => c.L(place([[0, -1.5], [0, -l * 0.8]], x, y, r))
      let s = `<g id="${c.id}-plant">${c.tube([[0, 14], [-1.5, 2], [1.5, -14], [0, -33]], 3.2, leaf, { tone: 'shadow', w: c.lw })}`
      const set = [[0, 2, -62, 37, 15], [0, -8, 60, 37, 15], [-0.5, -20, -44, 22, 10], [0.5, -25, 42, 19, 8.5], [0, -32, -2, 14, 6]]
      s += c.body('far-leaf', L(...set[0]), leaf, { tone: 'shadow', w: c.w * 0.9 }) + c.body('leaves', set.slice(1).map((p) => L(...p)), leaf, { w: c.w * 0.9 })
      if (c.big) s += c.line(set.map((p) => veins(p[0], p[1], p[2], p[3])).join(' '), leaf.small, c.lw * 0.9)
      return { body: s + '</g>' + potOf(c, soil, pot), parts: [['leaves', leaf], ['soil', soil], ['pot', pot]] }
    },
  },
  pot: {
    box: [-27, 10, 27, 46],
    draw: (c, { soil = SOIL, pot = POT }) => ({ body: potOf(c, soil, pot), parts: [['soil', soil], ['pot', pot]] }),
  },
  seedling: {
    box: [-20, -24, 20, 20],
    draw: (c, { leaf = YOUNG, soil = SOIL, roots = false }) => {
      let s = `<g id="${c.id}-soil">${c.body('soil', c.M('M-20,8 C-10,6 10,6 20,8 L20,20 L-20,20 Z'), soil, { flat: true })}</g>`
      if (roots) s += `<g id="${c.id}-roots">${c.line(c.M('M0,8 C0,12 1,15 0,19 M0,11 C-3,13 -5,15 -7,18 M0,12 C3,14 5,16 7,18'), soil.light, c.lw * 1.4)}</g>`
      s += `<g id="${c.id}-plant">${c.tube([[0, 8], [0.5, -2], [0, -10]], 2.2, leaf, { tone: 'shadow', w: c.lw })}`
      s += c.body('leaves', [c.S(place(leafPts(13, 5.5), 0, -10, -60)), c.S(place(leafPts(13, 5.5), 0, -10, 60))], leaf)
      if (c.big) s += c.line(c.L(place([[0, -1], [0, -10]], 0, -10, -60)) + ' ' + c.L(place([[0, -1], [0, -10]], 0, -10, 60)), leaf.small, c.lw * 0.8)
      return { body: s + '</g>', parts: [['leaves', leaf], ['soil', soil]] }
    },
  },
  arabidopsis: {
    box: [-37, -44, 37, 39],
    draw: (c, { leaf = LEAF, flower = WHITE_PETAL, centre = FLOWER_CENTRE }) => {
      const sp = (x, y, r, L, W) => c.S(place([[-1.4, 0], [-W, -L * 0.42], [-W, -L * 0.72], [-W * 0.6, -L * 0.98], [0, -L], [W * 0.6, -L * 0.98], [W, -L * 0.72], [W, -L * 0.42], [1.4, 0]], x, y, r))
      const pd = (x, y, k, L) => c.L([[x, y], [x + k * 3, y - 2.5], [x + k * (3 + L * 0.45), y - 2.5 - L * 0.9]])
      let s = `<g id="${c.id}-plant">${c.body('far-rosette', [sp(0, 37, -58, 24, 6.5), sp(0, 37, 56, 25, 6.5), sp(0, 37, -28, 17, 5.5), sp(0, 37, 26, 17, 5.5)], leaf, { tone: 'shadow', w: c.w * 0.85 })}`
      s += c.tube(c.M('M0,36 C1.5,18 -1.5,0 0,-33 M0,8 C5,0 10,-10 14,-23'), 2.2, leaf, { tone: 'shadow', w: c.lw })
      s += c.tube([pd(0, 24, -1, 14), pd(0, 15, 1, 14), pd(0, -3, -1, 13), pd(7, -4, 1, 11), pd(11, -14, 1, 9)].join(' '), 2.2, leaf, { tone: 'light', w: c.lw })
      s += c.body('rosette', [sp(0, 6, -58, 13, 4), sp(0, 37, -84, 34, 8.5), sp(0, 37, 82, 33, 8.5), sp(0, 37, -98, 27, 7.5), sp(0, 37, 99, 27, 7.5)], leaf, { w: c.w * 0.85 })
      if (c.big) s += c.line([[0, 37, -84, 34], [0, 37, 82, 33], [0, 37, -98, 27], [0, 37, 99, 27]].map(([x, y, r, L]) => c.L(place([[0, -1], [0, -L * 0.86]], x, y, r))).join(' '), leaf.small, c.lw * 0.8)
      s += c.body('buds', [c.C(0, -41, 2.4), c.C(-4, -37, 2.2), c.C(4, -38, 2.2)], leaf, { tone: 'light', w: c.lw * 0.8 }) + '</g>'
      const flw = (x, y) => [45, 135, 225, 315].map((t) => c.C(x + 3 * Math.cos(rad(t)), y + 3 * Math.sin(rad(t)), 2.9))
      s += `<g id="${c.id}-flowers">${c.body('petals', [...flw(-6, -29), ...flw(6, -28), ...flw(-1, -21), ...flw(15, -26)], flower, { w: c.lw * 0.8, flat: true })}${c.fill([[-6, -29], [6, -28], [-1, -21], [15, -26]].map(([x, y]) => c.C(x, y, 1.5)).join(' '), centre.shadow)}</g>`
      return { body: s, parts: [['leaves', leaf], ['flowers', flower], ['centres', centre]] }
    },
  },
  leaf: {
    box: [-40, -40, 40, 40],
    draw: (c, { leaf = LEAF }) => {
      const T = (pts) => place(pts.map(([u, v]) => [u * 0.95, v * 0.95]), 1, -2, 45)
      const hw = (y) => { const K = [[44, 0], [40, 6], [30, 13], [20, 18.5], [10, 21.5], [0, 23], [-10, 23], [-20, 20.5], [-30, 16], [-40, 8], [-47, 0]]; for (let i = 1; i < K.length; i++) if (y >= K[i][0]) { const [y0, w0] = K[i - 1], [y1, w1] = K[i]; return w0 + ((w1 - w0) * (y - y0)) / (y1 - y0) } return 0 }
      const out = [[0, 42], [9, 37], [17, 27], [22, 12], [23, -10], [20, -24], [12, -36], [0, -47], [-12, -36], [-20, -24], [-23, -10], [-22, 12], [-17, 27], [-9, 37]]
      let s = `<g id="${c.id}-leaf">${c.tube(c.L(T([[0, 40], [0, 53]])), 2.6, leaf, { tone: 'shadow', w: c.lw })}${c.body('leaf', c.S(T(out)), leaf)}`
      if (c.big) { let v = ''; [[32, 1], [26, -1], [20, 1], [14, -1], [8, 1], [2, -1], [-4, 1], [-10, -1], [-16, 1], [-22, -1], [-28, 1], [-34, -1]].forEach(([y, k]) => { const w = hw(y - 10); v += c.O(T([[0, y], [k * w * 0.4, y - 5], [k * w * 0.82, y - 10]])) + ' ' }); s += c.line(v, leaf.light, c.lw * 0.9) }
      s += c.line(c.L(T([[0, 46], [0, -40]])), leaf.light, c.lw * 1.4) + c.fill(c.S(T(out)), 'none', leaf.outline, c.w) + '</g>'
      return { body: s, parts: [['leaf', leaf]] }
    },
  },
  flower: {
    box: [-31, -45, 31, 46],
    draw: (c, { leaf = LEAF, flower = PETAL, centre = FLOWER_CENTRE }) => {
      const cy = -12, pet = (r, k) => c.S(place([[0, -3], [-8, -6], [-13, -14], [-13, -24], [-10, -30], [-5, -33], [0, -30], [5, -33], [10, -30], [13, -24], [13, -14], [8, -6]].map(([u, v]) => [u * k, v * k]), 0, cy, r))
      let s = `<g id="${c.id}-plant">${c.tube([[0, 10], [-1, 22], [1, 34], [0, 46]], 2.8, leaf, { w: c.lw * 1.1 })}${c.body('leaves', [c.M('M0,36 C-6,27 -16,23 -27,25 C-21,33 -11,38 0,36 Z'), c.M('M0,29 C6,20 16,16 27,18 C21,26 11,31 0,29 Z')], leaf, { w: c.w * 0.85 })}`
      if (c.big) s += c.line(c.M('M-1,35.4 C-8,30.5 -15,27.6 -23,26.2 M1,28.4 C8,23.5 15,20.6 23,19.2'), leaf.small, c.lw * 0.8)
      s += `</g><g id="${c.id}-petals">${c.body('back-petals', [36, 108, 180, 252, 324].map((r) => pet(r, 0.86)), flower, { tone: 'shadow', w: c.w * 0.85 })}${c.body('petals', [0, 72, 144, 216, 288].map((r) => pet(r, 1)), flower, { w: c.w * 0.85 })}`
      if (c.big) s += c.line([0, 72, 144, 216, 288].map((r) => c.L(place([[0, -9], [0, -24]], 0, cy, r))).join(' '), flower.small, c.lw * 0.8)
      s += `</g><g id="${c.id}-centre">${c.body('centre', c.C(0, cy, 9.5), centre, { tone: 'shadow' })}${c.big ? c.fill(Array.from({ length: 10 }, (_, i) => c.C(6 * Math.cos((i / 10) * 2 * Math.PI), cy + 6 * Math.sin((i / 10) * 2 * Math.PI), 1.2)).join(' '), centre.small) : ''}</g>`
      return { body: s, parts: [['leaves', leaf], ['petals', flower], ['centre', centre]] }
    },
  },
  cactus: {
    box: [-42, -48, 42, 45],
    draw: (c, { leaf = LEAF, sand = SAND }) => {
      const W = (w) => Math.max(1, w * c.F.px) / strokeScale(), arms = [c.M('M0,-35 L0,32'), c.M('M-6,12 L-20,12 C-26,12 -28,8 -28,2 L-28,-18'), c.M('M6,-2 L16,-2 C22,-2 26,-6 26,-12 L26,-27')], wd = [18, 12, 12]
      let s = `<g id="${c.id}-cactus">${arms.map((d, i) => c.line(d, leaf.outline, W(wd[i]) + 2 * c.w)).join('')}${arms.map((d, i) => c.line(d, leaf.base, W(wd[i]))).join('')}`
      s += c.line(c.M('M5.6,-35 L5.6,32'), leaf.shadow, W(6.4)) + c.line(c.M('M-24.6,-18 L-24.6,5 M29.4,-27 L29.4,-9'), leaf.shadow, W(4.4))
      if (c.big) s += c.line(c.M('M-3,-38 L-3,34 M3,-38 L3,34 M-28,-20 L-28,4 M26,-29 L26,-9'), leaf.small, c.lw * 0.9) + c.line(c.M('M-9,-28 L-13,-29.5 M-9,-14 L-13,-15.5 M-9,0 L-13,-1.5 M-9,26 L-13,24.5 M9,-30 L13,-31.5 M9,-16 L13,-17.5 M9,14 L13,12.5 M9,28 L13,26.5 M-34,-12 L-38,-13 M-34,-2 L-38,-3 M-22,-14 L-18,-15 M32,-22 L36,-23 M20,-24 L16,-25 M-3,-44 L-4,-47.5 M3,-44 L4,-47.5'), leaf.outline, c.lw * 0.7)
      s += c.back([[-6.5, -30], [-6.5, -8], [-6.5, 14]], leaf) + '</g>'
      s += `<g id="${c.id}-sand">${c.body('sand', c.M('M-42,45 C-38,37 -24,33 0,33 C24,33 38,37 42,45 Z'), sand)}${c.big ? c.line(c.M('M-26,40 C-20,38.5 -14,38 -8,38 M12,39 C18,38.5 24,39 28,40'), sand.small, c.lw * 0.8) : ''}</g>`
      return { body: s, parts: [['cactus', leaf], ['sand', sand]] }
    },
  },
  conifer: {
    box: [-42, -47, 42, 46],
    draw: (c, { leaf = DARK_LEAF, wood = WOOD }) => {
      const R = [[0, -47], [4, -38], [9, -31], [17, -24], [13, -22.5], [8, -22.5], [12, -14], [18, -8], [26, -3], [21, -1.8], [13, -2], [18, 6], [25, 12], [34, 17], [28, 18.5], [18, 18], [24, 25], [31, 31], [42, 35], [36, 37], [28, 37.5], [22, 36], [14, 38.5], [6, 36.5], [0, 37]]
      let s = `<g id="${c.id}-trunk">${c.body('trunk', c.R(-4.5, 34, 9, 12, 1), wood)}</g>`
      s += `<g id="${c.id}-needles">${c.body('tree', c.L([...R, ...R.slice(0, -1).reverse().map(([x, y]) => [-x, y])]) + 'Z', leaf)}`
      s += c.fill(c.L([...R.slice(0, -1), [0, 37]]) + 'Z', leaf.shadow) + c.fill(c.L([...R, ...R.slice(0, -1).reverse().map(([x, y]) => [-x, y])]) + 'Z', 'none', leaf.outline, c.w)
      if (c.big) s += c.line(c.M('M-6,-30 L-1,-26 M-12,-10 L-4,-6 M-18,10 L-7,15 M-22,28 L-10,32'), leaf.light, c.lw)
      s += '</g>'
      return { body: s, parts: [['needles', leaf], ['trunk', wood]] }
    },
  },
  moss: {
    box: [-46, -46, 46, 44],
    draw: (c, { leaf = DARK_LEAF, capsule = SPORE }) => {
      const Y = (p) => p.map(([u, v]) => [u, v + 4]), y0 = (x) => 22 + Math.pow(x / 46, 2) * 14
      const V = Array.from({ length: 21 }, (_, k) => { const x = -45 + (90 * k) / 20; return [x, k % 2 ? y0(x) - (k % 4 === 1 ? 7 : 5) : y0(x)] })
      let s = `<g id="${c.id}-capsules">${c.tube(c.M('M-20,28 C-20,12 -23,-4 -26,-18 M4,25 C4,6 7,-12 10,-28 M25,30 C25,16 28,2 31,-8'), 1.5, capsule, { tone: 'shadow', w: c.lw })}`
      s += c.body('capsules', [[-27, -24, -12], [11, -35, 10], [32, -14, 14]].map(([x, y, r]) => c.S(place(ellPts(0, 0, 4.4, 7.2), x, y, r))), capsule, { w: c.lw * 1.1 })
      s += c.body('caps', [c.S(place([[-3.8, -4], [-3, -9], [1, -15], [3.6, -8], [3.8, -4]], 11, -35, 10))], capsule, { tone: 'light', w: c.lw }) + '</g>'
      s += `<g id="${c.id}-moss">${c.body('cushion', c.S(Y([[-46, 40], ...V, [46, 40]])), leaf)}`
      if (c.big) { let lv = ''; [[-36, 30], [-24, 27], [-12, 25], [0, 24], [12, 25], [24, 27], [36, 30], [-30, 34], [-18, 32], [-6, 31], [6, 31], [18, 32], [30, 34]].forEach(([x, y]) => { lv += c.M(`M${x},${y + 7} L${x},${y + 1} M${x},${y + 4} L${x - 3},${y + 0.5} M${x},${y + 4} L${x + 3},${y + 0.5}`) + ' ' }); s += c.line(lv, leaf.light, c.lw) }
      s += '</g>'
      return { body: s, parts: [['moss', leaf], ['capsules', capsule]] }
    },
  },
  fern: {
    box: [-40, -46, 40, 46],
    draw: (c, { leaf = LEAF, spores = SPORE }) => {
      const B = [-22, 46, -20, 8, 0, -26, 32, -44], tg = (t) => { const p = bez(B, Math.max(0, t - 0.01)), q = bez(B, Math.min(1, t + 0.01)); return Math.atan2(q[1] - p[1], q[0] - p[0]) }
      const far = [], near = [], ribs = []; let sori = ''
      const pinna = (t, side, L, W, so) => {
        const [x, y] = bez(B, t), an = tg(t) + side * rad(58), co = Math.cos(an), sn = Math.sin(an), top = [], bot = []
        for (let j = 0; j <= 6; j++) { const u = j / 6, w = W * Math.sin(Math.PI * (0.15 + 0.85 * u)) * (j % 2 ? 1 : 0.86); top.push([u * L, -w]); if (j < 6) bot.unshift([u * L, w]) }
        const T = ([px, py]) => [x + px * co - py * sn, y + px * sn + py * co]
        ;(side > 0 ? near : far).push(c.S(top.concat(bot).map(T))); ribs.push(c.L([T([0, 0]), T([L * 0.82, 0])]))
        if (so) [0.3, 0.5, 0.7].forEach((u) => [-1, 1].forEach((k) => { const [px, py] = T([u * L, k * W * 0.5]); sori += c.C(px, py, 1.3) + ' ' }))
      }
      for (let k = 0; k < 10; k++) { const t = 0.1 + k * 0.089, L = 27 * (1 - k * 0.082); pinna(t, -1, L, L * 0.21, k === 1 || k === 3); pinna(Math.min(0.97, t + 0.04), 1, L * 0.95, L * 0.21, 0) }
      let s = `<g id="${c.id}-fern">${c.tube(c.M('M8,46 C8,38 10,30 16,27 C22,24 27,28 26,33 C25,37 20,37 19.5,33.5 C19.2,31.5 21,30.5 22,31.5'), 3, leaf, { tone: 'light', w: c.lw })}`
      s += c.body('pinnae', far, leaf) + c.body('near-pinnae', near, leaf, { tone: 'shadow' })
      if (c.big) s += c.line(ribs.join(' '), leaf.small, c.lw * 0.8)
      s += c.tube(Array.from({ length: 21 }, (_, i) => bez(B, i / 20)), 2.2, leaf, { tone: 'shadow', w: c.lw }) + '</g>'
      if (c.big) s += `<g id="${c.id}-spores">${c.fill(sori, spores.shadow)}</g>`
      return { body: s, parts: [['frond', leaf], ['spores', spores]] }
    },
  },
  rice: {
    box: [-47, -48, 46, 46],
    draw: (c, { leaf = LEAF, grain = GRAIN }) => {
      const tp = (P, w) => c.S(band(chain([P], 10), w, 0.4))
      const M = [[6, -24, 9, -40, 28, -48, 39, -37], [39, -37, 45, -31, 46, -20, 44, -10]], S = [[-12, -12, -17, -26, -31, -30, -38, -21], [-38, -21, -42, -15, -43, -7, -42, 1]]
      const grains = (segs, list) => list.map(([k, t, sd]) => { const [x, y] = bez(segs[k], t), q = bez(segs[k], Math.min(1, t + 0.01)), p = bez(segs[k], Math.max(0, t - 0.01)), dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1, tx = dx / l, ty = dy / l; return c.E(x - ty * sd * 3.2 + tx * (sd ? 2.4 : 3.6), y + tx * sd * 3.2 + ty * (sd ? 2.4 : 3.6), 5.2, 2.7, (Math.atan2(ty, tx) * 180) / Math.PI + sd * 32) })
      let s = `<g id="${c.id}-plant">${c.body('far-leaves', [tp([-2, 46, -14, 24, -32, 8, -47, 8], 6), tp([2, 46, 16, 28, 32, 22, 45, 30], 5.5)], leaf, { tone: 'shadow', w: c.w * 0.9 })}`
      s += c.tube(c.M('M1,46 C1,20 3,-6 6,-24 M-3,46 C-4,24 -6,6 -12,-12'), 2.2, leaf, { tone: 'light', w: c.lw }) + c.line(c.O(chain(M, 10)) + ' ' + c.O(chain(S, 10)), grain.outline, c.lw * 1.2) + '</g>'
      s += `<g id="${c.id}-grain">${c.body('grains', [...grains(M, [[0, 0.42, -1], [0, 0.56, 1], [0, 0.7, -1], [0, 0.84, 1], [1, 0, -1], [1, 0.2, 1], [1, 0.4, -1], [1, 0.6, 1], [1, 0.8, -1], [1, 1, 0]]), ...grains(S, [[0, 0.4, 1], [0, 0.6, -1], [0, 0.8, 1], [1, 0.05, -1], [1, 0.35, 1], [1, 0.6, -1], [1, 1, 0]])], grain, { tone: 'shadow', w: c.lw })}</g>`
      s += `<g id="${c.id}-leaves">${c.body('leaves', [tp([0, 46, -4, 24, -14, 0, -26, -14], 5.2), tp([3, 46, 8, 26, 18, 8, 28, -2], 5)], leaf, { w: c.w * 0.9 })}</g>`
      return { body: s, parts: [['leaves', leaf], ['grain', grain]] }
    },
  },
  maize: {
    box: [-31, -48, 31, 47],
    draw: (c, { leaf = LEAF, kernels = MAIZE }) => {
      const P = [[-40, 0], [-36, 8], [-26, 12.5], [-12, 14.5], [2, 15], [16, 14], [28, 11], [32, 4]], W = (y) => { for (let i = 1; i < P.length; i++) if (y <= P[i][0]) { const [y0, w0] = P[i - 1], [y1, w1] = P[i]; return w0 + ((w1 - w0) * (y - y0)) / (y1 - y0) } return 4 }
      let s = `<g id="${c.id}-silk">${c.line(c.M('M0,-38 C-2,-42 -5,-45 -10,-46 M0,-38 C0,-42 -1,-45 -3,-48 M0,-38 C1,-42 4,-45 8,-47 M0,-38 C3,-41 7,-42 12,-41'), kernels.outline, c.lw)}</g>`
      s += `<g id="${c.id}-cob">${c.body('cob', c.S([[0, -40], [8, -36], [12.5, -26], [14.5, -12], [15, 2], [14, 16], [11, 28], [0, 32], [-11, 28], [-14, 16], [-15, 2], [-14.5, -12], [-12.5, -26], [-8, -36]]), kernels, { tone: 'small' })}`
      let k1 = '', k2 = ''
      for (let y = -33; y <= 27; y += 6.2) { const w = W(y); for (let k = -2; k <= 2; k++) { const ph = k * 0.52, d = c.E(w * Math.sin(ph) * 0.96, y, Math.max(0.7, (3.2 * Math.cos(ph) * w) / 15), Math.min(2.8, 1.2 + w / 9)); if (k === 2) k2 += d + ' '; else k1 += d + ' ' } }
      s += c.fill(k1, kernels.base, kernels.small, c.lw * 0.5) + c.fill(k2, kernels.shadow, kernels.small, c.lw * 0.5) + '</g>'
      s += `<g id="${c.id}-husks">${c.body('husks', [c.M('M-2,44 C-20,40 -32,20 -30,-6 C-28,-17 -25,-25 -22,-30 C-20,-16 -18,-2 -14,10 C-11,20 -8,30 -2,44 Z'), c.M('M2,44 C20,40 31,22 30,-2 C29,-12 27,-19 25,-24 C22,-10 18,4 14,12 C10,22 7,32 2,44 Z')], leaf)}`
      if (c.big) s += c.line(c.M('M-6,40 C-18,32 -25,14 -26,-8 M-11,33 C-16,22 -19,10 -21,-6 M6,40 C18,32 25,16 26,-4 M11,33 C15,24 18,12 21,-2'), leaf.small, c.lw * 0.8)
      s += c.body('base', c.M('M-10,30 C-4,26 4,26 10,30 C9,37 5,42 0,47 C-5,42 -9,37 -10,30 Z'), leaf, { tone: 'light', w: c.w * 0.85 }) + '</g>'
      return { body: s, parts: [['husks', leaf], ['kernels', kernels]] }
    },
  },
  tomato: {
    box: [-44, -42, 44, 41],
    draw: (c, { fruit = TOMATO, leaf = LEAF }) => {
      const pts = []; for (let i = 0; i < 24; i++) { const t = (i / 24) * 2 * Math.PI, co = Math.cos(t), sn = Math.sin(t), r = 1 + 0.012 * Math.cos(5 * t + 1.6); let y = 5 + 36 * sn * r * (sn > 0 ? 1 : 0.97); if (sn < 0) y += 8 * Math.exp(-((co / 0.32) ** 2)) * -sn; pts.push([44 * co * r * (1 - 0.05 * sn * sn * (sn > 0 ? 1 : 0)), y]) }
      let s = `<g id="${c.id}-fruit">${c.body('fruit', c.S(pts), fruit, { gloss: true })}${c.big ? c.line(c.M('M-7,-20 C-19,-16 -27,-6 -29,6 M7,-20 C19,-16 26,-7 28,4'), fruit.shadow, c.lw) : ''}</g>`
      const C = [0, -23.5], sep = (th) => { const r = rad(th), ux = Math.cos(r), uy = Math.sin(r) * 0.5, l = Math.hypot(ux, uy), nx = -uy / l, ny = ux / l, L = 19, m = (k, sd) => [C[0] + ux * L * k + nx * sd, C[1] + uy * L * k + ny * sd]; return c.M(`M${m(0, 3.6)} Q${m(0.5, 4)} ${C[0] + ux * L},${C[1] + uy * L} Q${m(0.5, -4)} ${m(0, -3.6)} Z`) }
      s += `<g id="${c.id}-calyx">${c.body('sepals', [210, 270, 330, 30, 90, 150].map(sep), leaf, { w: c.lw * 1.1 })}${c.body('centre', c.C(0, -23.5, 4), leaf, { w: c.lw })}${c.tube(c.M('M0,-25 C0,-33 2,-38 7,-42'), 3.5, leaf, { w: c.lw })}</g>`
      return { body: s, parts: [['fruit', fruit], ['calyx', leaf]] }
    },
  },
  legume: {
    box: [-48, -40, 48, 48],
    draw: (c, { leaf = LEAF, soil = SOIL, nodule = PINK }) => {
      const tp = (P, w0, w1) => c.S(band(chain([P], 8), w0, w1))
      const lf = (x, y, r, L, w) => c.S(place(leafPts(L, w * 0.85), x, y, r))
      const roots = [[[0, 14, 0, 26, 1, 36, 0, 47], 5.5, 1], [[0, 19, -10, 21, -21, 27, -31, 36], 3.2, 0.8], [[0, 23, 10, 25, 22, 30, 32, 40], 3.2, 0.8], [[0, 31, -6, 35, -12, 40, -18, 47], 2.6, 0.8], [[0, 34, 6, 38, 12, 42, 17, 47], 2.6, 0.8]]
      let s = `<g id="${c.id}-soil">${c.body('soil', c.R(-48, 14, 96, 34, 5), soil, { tone: 'light', flat: true })}</g>`
      s += `<g id="${c.id}-roots">${c.body('roots', roots.map(([P, a, b]) => tp(P, a, b)), CREAM, { w: c.lw * 1.2 })}</g>`
      s += `<g id="${c.id}-nodules">${c.body('nodules', [[1, 0.35, 3.6, -1], [1, 0.7, 3.4, 1], [2, 0.4, 3.8, 1], [2, 0.75, 3.2, -1], [0, 0.55, 3.4, 1], [3, 0.55, 3, 1], [4, 0.5, 3, -1]].map(([i, t, r, sd]) => { const P = roots[i][0], [x, y] = bez(P, t), [x2, y2] = bez(P, t + 0.05), dx = x2 - x, dy = y2 - y, l = Math.hypot(dx, dy) || 1; return c.C(x - (dy / l) * sd * r * 0.7, y + (dx / l) * sd * r * 0.7, r) }), nodule, { w: c.lw, gloss: true })}</g>`
      s += `<g id="${c.id}-plant">${c.tube(c.M('M0,14 C1,0 -1,-20 0,-33 M0,-12 C-5,-15 -10,-17 -14,-18 M1,-8 C4,-8 6,-7 8,-5'), 2.4, leaf, { tone: 'shadow', w: c.lw })}`
      s += c.body('far-leaves', [lf(-14, -18, -115, 15, 6.5), lf(0, -33, 58, 15, 6.5)], leaf, { tone: 'shadow', w: c.w * 0.85 }) + c.body('leaves', [lf(-14, -18, -72, 16, 7), lf(-14, -18, -28, 14, 6.5), lf(0, -33, -58, 15, 6.5), lf(0, -33, 0, 14, 6.5)], leaf, { w: c.w * 0.85 })
      s += c.body('pod', tp([7, -5, 16, -8, 30, -6, 40, 7], 11, 3.5), leaf, { tone: 'shadow', w: c.w * 0.9 }) + c.fill([0.3, 0.55, 0.78].map((t) => { const [x, y] = bez([7, -5, 16, -8, 30, -6, 40, 7], t); return c.C(x, y, 3.4) }).join(' '), leaf.light, leaf.small, c.lw * 0.8) + '</g>'
      return { body: s, parts: [['plant', leaf], ['soil', soil], ['nodules', nodule]] }
    },
  },
  seed: {
    box: [-47, -33, 47, 31],
    draw: (c, { seed = WOOD, embryo = YOUNG }) => {
      const P = [[-46, 0], [-42, -16], [-30, -27], [-14, -31], [4, -31], [22, -28], [36, -19], [45, -5], [45, 10], [38, 22], [26, 29], [14, 30], [6, 26], [0, 23], [-6, 25], [-14, 29], [-26, 30], [-38, 24], [-45, 13]]
      const T = (p) => place(p, 0, 0, -9)
      let s = `<g id="${c.id}-seed">${c.body('coat', c.S(T(P)), seed)}${c.back(T([[-30, -23], [-18, -28], [0, -29], [16, -26]]), seed)}`
      s += c.fill(c.S(T(P.map(([x, y]) => [x * 0.87, (y - 1) * 0.8 + 1.5]))), seed.light, seed.small, c.lw * 0.8)
      if (c.big) s += c.line(c.O(T([[-2, -16], [12, -17], [26, -12], [32, -2]])) + ' ' + c.O(T([[4, -6], [14, -6], [22, -2], [26, 6]])), seed.shadow, c.lw * 0.8)
      s += c.body('hilum', c.S(T(ellPts(0, 24.5, 6.5, 2.6))), seed, { tone: 'small', w: c.lw }) + '</g>'
      s += `<g id="${c.id}-embryo">${c.body('embryo', [c.S(T([[-2, 21], [-8, 21], [-14, 16], [-20, 9], [-23, 2], [-19, -1], [-14, 6], [-8, 13], [-2, 17]])), c.S(T([[-20, 0], [-19, -7], [-13, -12], [-6, -13], [-9, -6], [-14, -2]])), c.S(T([[-20, 0], [-25, -5], [-26, -12], [-23, -17], [-19, -11], [-18, -5]]))], embryo, { w: c.lw })}</g>`
      return { body: s, parts: [['seed coat', seed], ['embryo', embryo]] }
    },
  },
  roots: {
    box: [-40, -4, 40, 46],
    draw: (c, { root = CREAM }) => {
      const R = [[0, -4, 0, 12, 2, 28, 0, 46], [0, 8, -10, 12, -24, 18, -38, 30], [0, 12, 10, 16, 24, 22, 38, 34], [0, 22, -8, 26, -16, 34, -22, 44], [0, 26, 8, 30, 16, 38, 22, 45], [-18, 15, -22, 22, -24, 30, -28, 38], [16, 17, 20, 24, 22, 32, 26, 40]]
      let s = `<g id="${c.id}-roots">${c.body('roots', R.map((P, i) => c.S(band(chain([P], 8), i ? 3.2 : 6, 0.8))), root, { w: c.lw * 1.2 })}`
      if (c.big) { let h = ''; R.slice(1).forEach((P) => [0.4, 0.6, 0.8].forEach((t) => { const [x, y] = bez(P, t); h += c.L([[x, y], [x - 2, y + 3.5]]) + ' ' + c.L([[x, y], [x + 2.5, y + 3]]) + ' ' })); s += c.line(h, root.small, c.lw * 0.6) }
      return { body: s + '</g>', parts: [['roots', root]] }
    },
  },
  kelp: {
    box: [-46, -46, 46, 46],
    draw: (c, { kelp = KELP }) => {
      const blade = (x, y, ang, L) => c.S(place([[3, 0], [6, -3], [10, -4.4], [L * 0.33, -6], [L * 0.52, -5], [L * 0.72, -4.6], [L * 0.9, -2.2], [L, 0], [L * 0.9, 2.6], [L * 0.7, 4.2], [L * 0.5, 5.6], [L * 0.3, 4.8], [10, 4.4], [6, 3]], x, y, ang))
      const S1 = [-5, 38, -22, 14, -6, -18, -22, -44], S2 = [6, 38, 22, 14, 8, -18, 24, -42]
      const list = [[S1, 0.16, -162, 30], [S1, 0.4, -150, 28], [S1, 0.64, -160, 24], [S1, 0.86, -132, 18], [S1, 0.52, -45, 14], [S2, 0.14, -18, 30], [S2, 0.38, -30, 28], [S2, 0.62, -18, 24], [S2, 0.86, -48, 18], [S2, 0.72, -135, 13]]
      let s = `<g id="${c.id}-kelp">${c.tube(c.M('M-5,38 C-22,14 -6,-18 -22,-44 M6,38 C22,14 8,-18 24,-42'), 3, kelp, { tone: 'small', w: c.lw })}`
      s += c.body('blades', list.map(([P, t, g2, L]) => { const q = bez(P, t); return blade(q[0], q[1], g2, L) }), kelp)
      s += c.fill(list.map(([P, t, g2]) => { const q = bez(P, t); return c.S(place(ellPts(3, 0, 3, 2.2), q[0], q[1], g2)) }).join(' '), kelp.light, kelp.small, c.lw * 0.7)
      s += c.body('holdfast', c.S([[-14, 46], [-14, 42], [-9, 38], [-2, 36], [4, 36], [10, 38], [16, 42], [16, 46]]), kelp, { tone: 'small' }) + '</g>'
      return { body: s, parts: [['kelp', kelp]] }
    },
  },
  seagrass: {
    box: [-48, -46, 48, 46],
    draw: (c, { leaf = YOUNG, sand = SAND }) => {
      const tp = (P, w0, w1) => c.S(band(chain([P], 8), w0, w1))
      const back = [[-32, 31, -38, 10, -46, -8, -44, -26], [-2, 31, -8, 8, 2, -14, -6, -40], [26, 31, 24, 10, 34, -8, 30, -30], [-16, 31, -14, 14, -24, 0, -22, -14]]
      const front = [[-32, 31, -30, 10, -22, -12, -28, -40], [-32, 31, -26, 16, -14, 4, -10, -16], [-2, 31, 2, 12, -12, -6, -16, -26], [-2, 31, 4, 8, 12, -12, 8, -46], [26, 31, 30, 12, 22, -10, 24, -42], [26, 31, 32, 16, 44, 2, 46, -18], [12, 31, 14, 16, 8, 4, 12, -12]]
      let s = `<g id="${c.id}-blades">${c.body('far-blades', back.map((P) => tp(P, 5, 2.6)), leaf, { tone: 'shadow', w: c.lw * 1.2 })}</g>`
      s += `<g id="${c.id}-sand">${c.body('sand', c.M('M-48,32 C-30,28 -10,33 8,29 C22,27 36,28 48,31 L48,44 C48,45.5 47,46 46,46 L-46,46 C-47,46 -48,45.5 -48,44 Z'), sand, { flat: true })}${c.big ? c.line(c.M('M-44,38 C-30,36 -12,39 0,37 C14,35 30,36 44,38'), sand.small, c.lw) : ''}</g>`
      s += `<g id="${c.id}-blades-near">${c.body('blades', front.map((P) => tp(P, 5.2, 2.6)), leaf, { w: c.lw * 1.2 })}${c.big ? c.line(c.M('M-28,8 C-25,-4 -24,-14 -26,-24 M5,0 C8,-10 9,-24 8,-34 M27,4 C25,-8 24,-20 24,-30'), leaf.light, c.lw) : ''}</g>`
      return { body: s, parts: [['blades', leaf], ['sand', sand]] }
    },
  },
  mangrove: {
    box: [-48, -47, 48, 46],
    draw: (c, { leaf = LEAF, wood = WOOD, water = WATER, mud = SOIL }) => {
      let s = `<g id="${c.id}-mud">${c.body('mud', c.M('M-48,36 C-30,34 -10,37 6,35 C20,33 34,34 48,36 L48,44 C48,45.5 47,46 46,46 L-46,46 C-47,46 -48,45.5 -48,44 Z'), mud, { tone: 'light', flat: true })}</g>`
      s += `<g id="${c.id}-water">${c.fill(c.M('M-48,20 L48,20 L48,35 C34,33 10,36 -6,35 C-22,34 -30,33 -48,35 Z'), water.base)}${c.line(c.M('M-48,20 L48,20'), water.outline, c.lw)}</g>`
      s += `<g id="${c.id}-wood">${c.tube(c.M('M-3,0 C-18,-2 -36,8 -42,37 M-3,4 C-14,4 -26,14 -28,37 M-2,8 C-8,10 -14,22 -14,37 M2,8 C8,10 14,22 14,37 M3,4 C14,4 26,14 28,37 M3,0 C18,-2 36,8 42,37'), 3, wood, { w: c.lw })}`
      s += c.body('trunk', c.M('M-5,-14 C-4,-4 -5,2 -6,8 L6,8 C5,2 4,-4 5,-14 Z'), wood, { w: c.w * 0.9 }) + '</g>'
      s += `<g id="${c.id}-canopy">${c.body('canopy', [[-30, -18, 13], [-16, -30, 15], [2, -34, 15], [20, -30, 15], [33, -17, 12], [0, -16, 16], [-18, -12, 12], [18, -12, 12]].map(([x, y, r]) => c.C(x, y, r)), leaf)}`
      if (c.big) s += c.line(c.M('M-22,-20 C-18,-24 -12,-24 -8,-22 M8,-24 C12,-27 18,-27 22,-23 M-6,-10 C-2,-13 4,-13 8,-10 M20,-12 C24,-14 28,-14 31,-12 M-34,-10 C-30,-12 -26,-12 -23,-10'), leaf.small, c.lw)
      s += c.back([[-24, -34], [-18, -41], [-8, -44], [2, -44]], leaf) + '</g>'
      return { body: s, parts: [['leaves', leaf], ['wood', wood], ['water', water]] }
    },
  },
  stoma: {
    box: [-46, -46, 46, 46],
    draw: (c, { cell = CYTO, chloro = PLASTID, guard = GUARD }) => { // guard cells a deeper green than the epidermis (review, 23 November 2026)
      const ell = (deg) => { const co = Math.cos(rad(deg)), sn = Math.sin(rad(deg)), r = 1 / Math.sqrt((co * co) / 361 + (sn * sn) / 841); return [r * co, r * sn] }, rp = (g2) => [33 * Math.cos(rad(g2)), 38 * Math.sin(rad(g2))], pol = (r, g2) => [r * Math.cos(rad(g2)), r * Math.sin(rad(g2))]
      let s = `<g id="${c.id}-epidermis">${c.body('epidermis', c.C(0, 0, 46), cell, { tone: 'light' })}`
      let d = ''
      ;[-90, -30, 30, 90, 150, 210].forEach((g2) => { d += c.L([ell(g2), rp(g2)]) + ' ' })
      ;[-60, 0, 60, 120, 180, 240].forEach((g2) => { d += c.L([rp(g2), pol(44.5, g2)]) + ' ' })
      d += c.S(Array.from({ length: 36 }, (_, i) => rp(i * 10)))
      s += c.line(d, cell.small, c.lw) + c.fill(c.E(0, 0, 19, 29), cell.light, cell.small, c.lw) + '</g>'
      s += `<g id="${c.id}-guard-cells">${c.body('guard-cells', [c.M('M0,-25 C-10,-25 -17,-14 -17,0 C-17,14 -10,25 0,25 L0,13 C-6,7 -6,-7 0,-13 Z'), c.M('M0,-25 C10,-25 17,-14 17,0 C17,14 10,25 0,25 L0,13 C6,7 6,-7 0,-13 Z')], guard)}`
      s += c.body('pore', c.M('M0,-13 C6.5,-6 6.5,6 0,13 C-6.5,6 -6.5,-6 0,-13 Z'), cell, { tone: 'small', w: c.w * 0.9 }) + '</g>'
      s += `<g id="${c.id}-chloroplasts">${c.body('chloroplasts', [[-11, -12], [-13, -2], [-12.5, 8], [-8, 17], [-7.5, -19]].flatMap(([x, y]) => [c.E(x, y, 2.6, 2.2), c.E(-x, y, 2.6, 2.2)]), chloro, { w: c.lw * 0.6, flat: true })}</g>`
      return { body: s, parts: [['cells', cell], ['chloroplasts', chloro]] }
    },
  },
  'vascular bundle': {
    box: [-46, -46, 46, 46],
    draw: (c, { stem = YOUNG, xylem = SPORE }) => {
      let s = `<g id="${c.id}-stem">${c.body('stem', c.C(0, 0, 46), stem, { tone: 'light' })}${c.fill(c.C(0, 0, 42.5), 'none', stem.small, c.lw * 0.8)}${c.fill(c.C(0, 0, 13), stem.light)}`
      if (c.big) s += c.line([[0, 0], [-6, -5], [6, -5], [-6, 5], [6, 5], [0, -9], [0, 9], [-9, 0], [9, 0]].map(([x, y]) => c.C(x, y, 2.4)).join(' '), stem.shadow, c.lw * 0.6)
      const bundles = [], phloem = [], vessels = []
      for (let k = 0; k < 8; k++) { const r = k * 45; bundles.push(c.S(place([[0, -38], [6, -37], [9, -32], [9, -26], [7, -20], [4, -15.5], [0, -14], [-4, -15.5], [-7, -20], [-9, -26], [-9, -32], [-6, -37]], 0, 0, r))); phloem.push(c.S(place([[-8.5, -30], [-6, -35.5], [0, -37], [6, -35.5], [8.5, -30], [0, -28]], 0, 0, r))); vessels.push(c.S(place(ellPts(0, -24, 3.6, 3.6, 0, 12), 0, 0, r)), c.S(place(ellPts(-4.2, -19.5, 2.3, 2.3, 0, 10), 0, 0, r)), c.S(place(ellPts(4.2, -19.5, 2.3, 2.3, 0, 10), 0, 0, r))) }
      s += c.body('bundles', bundles, stem, { tone: 'light', w: c.lw }) + `</g><g id="${c.id}-xylem">${c.fill(phloem.join(' '), xylem.light)}${c.fill(vessels.join(' '), '#FFFFFF', xylem.shadow, c.lw * 0.8)}</g>`
      return { body: s, parts: [['stem', stem], ['vessels', xylem]] }
    },
  },
}
export function plant(g, opts) { return draw(PLANTS, 'plant', g, { kind: 'potted', ...opts }) }

// ---------- palettes of fungi, small water life, people and scene pieces ----------
export const HYPHA = { light: toHex({ l: 0.99, c: 0.004, h: 100 }), base: toHex({ l: 0.95, c: 0.008, h: 100 }), shadow: toHex({ l: 0.9, c: 0.01, h: 100 }), small: toHex({ l: 0.82, c: 0.011, h: 100 }), outline: toHex({ l: 0.56, c: 0.011, h: 100 }) }
export const ACTINO = tone(70, 0.9, 0.035), ACTINO_SPORE = rich(305), EYESPOT = deep(35), PLATE = greyTone(0.97, 220)
export const EGG_SHELL = greyTone(0.96, 200), YOLK = rich(90), VESSEL = deep(25), EMBRYO = tone(340, 0.88, 0.06), SUN = tone(88, 0.88, 0.14)
export const WALL = rich(72), CYTO = rich(112), VACUOLE = soft(hueOf('#dbeafe')), PLASTID = deep(155)

// =====================================================================================================================
// A fungus. Kinds: 'mushroom' (a cap of beige-brown over gills, a stem with its ring and bulb), 'fly agaric' (the same with
// the red cap and white warts), 'yeast' (the budding yeast of ../cells/ct12.mjs, promoted unchanged in shape: a mother cell
// with its bud and vacuole, glossy; options scars (number of bud scars 0–7, 7), bud (true)), 'hyphae' (a branching hypha
// grown from a spore, with cross walls, nuclei and tips, as tubes in the off-white of the approved Mould), 'mycelium' (a
// loose net of fine hyphae with a few spores, to lay over soil or roots, as in Mycorrhiza), 'spores' (three spiny spores,
// one germinating), 'lichen' (a lobed foliose rosette with orange fruiting cups), 'actinomycete' (Streptomyces: thin
// branching filaments with chains of spores; a bacterium, drawn here because it grows like a fungus).
// Options: cap, stem, spores (palettes), scars, bud.
// Used by: Mushroom, Yeast, Yeast chronological lifespan, Fungal hyphae, Mycorrhiza, Spores, Lichen, Actinomycete, Symbiosis.
// Example: fungus(g, { x: 0, y: 0, size: 60, kind: 'yeast', scars: 4, id: 'yeast' })
// =====================================================================================================================
const FUNGI = {
  mushroom: {
    box: [-47, -45, 47, 47],
    draw: (c, { cap = CAP, stem = HYPHA, spots = false }) => {
      const yt = (x) => 1.2 + 3 * (x / 40) * (x / 40), yb = (x) => 9.2 - 5 * (x / 40) * (x / 40)
      let s = `<g id="${c.id}-stem">${c.body('gills', c.M('M-40,4 C-26,0 26,0 40,4 C28,11.5 -28,11.5 -40,4 Z'), stem, { tone: 'shadow', w: c.w * 0.7 })}`
      if (c.big) { let gl = ''; for (let x = -33; x <= 33; x += 5.5) { if (Math.abs(x) < 3) continue; gl += c.L([[x, yt(x) + 0.8], [x * 0.5, yb(x * 0.5) - 0.6]]) + ' ' } s += c.line(gl, stem.small, c.lw * 0.8) }
      s += c.body('stem', c.M('M-8,7 C-8.5,17 -9,26 -11,33 C-17.5,36 -17,45.5 -8,46 L8,46 C17,45.5 17.5,36 11,33 C9,26 8.5,17 8,7 Z'), stem)
      s += c.fill(c.M('M3.5,10 C4.5,19 5,26 6.5,33.5 L10.5,33.5 C8.6,26 7.8,18 7.6,10 Z'), stem.shadow) + c.line(c.M('M-11,33.5 C-6,36 6,36 11,33.5'), stem.small, c.lw)
      s += c.body('ring', c.M('M-8.5,13 C-12.5,17 -14,21 -12.5,24.5 C-5,22 5,22 12.5,24.5 C14,21 12.5,17 8.5,13 C3,14.6 -3,14.6 -8.5,13 Z'), stem, { tone: 'light', w: c.w * 0.75 }) + '</g>'
      s += `<g id="${c.id}-cap">${c.body('cap', c.M('M-46,3 C-47,-24 -26,-44 0,-44 C26,-44 47,-24 46,3 C46,6 42.5,6.5 40,4 C26,0 -26,0 -40,4 C-42.5,6.5 -46,6 -46,3 Z'), cap)}`
      s += c.back([[-37, -16], [-32, -28], [-22, -36], [-10, -39.5]], cap)
      if (spots) s += c.fill([[-22, -24, 5.5, 4.5], [0, -33, 4.5, 3.6], [18, -26, 5, 4], [33, -11, 3.6, 3], [-35, -5, 3.4, 2.8], [6, -16, 4, 3.2], [-12, -9, 3.2, 2.6], [24, -5, 3, 2.4]].map(([x, y, rx, ry]) => c.E(x, y, rx, ry)).join(' '), stem.light, stem.small, c.lw * 0.7)
      return { body: s + '</g>', parts: [['cap', cap], ['stem', stem]] }
    },
  },
  yeast: {
    box: [-45, -42, 45, 41],
    draw: (c, { cell = YEAST, scar = CHITIN, scars = 7, bud = true }) => {
      const mother = c.S([[-44, 6], [-40, -14], [-26, -30], [-6, -36], [14, -30], [26, -16], [30, 2], [25, 22], [10, 36], [-12, 40], [-32, 32], [-42, 20]])
      let s = `<g id="${c.id}-cell">${c.body('cell', bud ? [mother, c.C(29, -26, 15)] : mother, cell, { gloss: true })}</g>`
      s += `<g id="${c.id}-vacuole">${c.fill(c.C(-6, 8, 9.5), cell.shadow)}</g>`
      const S = [[-31, -4, 3.8, 6.8, 8], [-20, 22, 6.6, 4.8, -30], [4, -22, 6.2, 4.6, 10], [12, 18, 6.4, 5, 40], [-13, -25, 5.8, 4, -8], [19, -2, 4.2, 6.4, 4], [-35, 15, 3.6, 5.8, -26]].slice(0, scars)
      if (S.length) s += `<g id="${c.id}-bud-scars">${S.map(([x, y, rx, ry, r]) => c.fill(c.E(x, y, rx, ry, r), scar.base, scar.outline, c.w * 0.64) + (c.tiny ? '' : c.fill(c.E(x, y, rx * 0.42, ry * 0.42, r), scar.small))).join('')}</g>`
      return { body: s, parts: [['cell', cell], ...(S.length ? [['bud scars', scar]] : [])] }
    },
  },
  hyphae: {
    box: [-48, -45, 48, 45],
    draw: (c, { stem = HYPHA, spores = SPORE }) => {
      const m = [-37, 25, -20, 20, 10, -6, 45, -26], br = (P, t, a, b, e) => [...bez(P, t), ...a, ...b, ...e]
      const b1 = br(m, 0.3, [-22, 4], [-30, -14], [-39, -31]), b2 = br(m, 0.55, [8, 12], [22, 18], [40, 20]), b3 = br(b1, 0.5, [-34, -6], [-40, -3], [-44, 5]), b4 = br(m, 0.8, [24, -24], [20, -34], [12, -42]), b5 = br(b2, 0.5, [16, 24], [12, 34], [6, 42])
      const S = [m, b1, b2, b3, b4, b5], dir = (P, t) => { const p = bez(P, Math.max(0, t - 0.01)), q = bez(P, Math.min(1, t + 0.01)), l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1; return [(q[0] - p[0]) / l, (q[1] - p[1]) / l] }
      let s = `<g id="${c.id}-spore">${c.body('spore', c.E(-40, 28, 7.5, 6.5, -20), spores, { gloss: true })}</g>`
      s += `<g id="${c.id}-hyphae">${c.tube(S.map((P) => c.O(chain([P], 10))).join(' '), 7.5, stem, { w: c.w * 0.7 })}`
      if (c.big) {
        let sp = '', nu = ''
        ;[[m, [0.17, 0.44, 0.68, 0.92]], [b1, [0.3, 0.75]], [b2, [0.3, 0.78]], [b3, [0.6]], [b4, [0.55]], [b5, [0.6]]].forEach(([P, ts]) => ts.forEach((t) => { const [x, y] = bez(P, t), [tx, ty] = dir(P, t), h = 3.4; sp += c.L([[x - ty * h, y + tx * h], [x + ty * h, y - tx * h]]) + ' ' }))
        ;[[m, 0.07], [m, 0.57], [m, 0.8], [b1, 0.52], [b2, 0.55], [b3, 0.3], [b4, 0.28], [b5, 0.3]].forEach(([P, t]) => { const [x, y] = bez(P, t); nu += c.C(x, y, 1.7) + ' ' })
        s += c.line(sp, stem.outline, c.lw * 0.9) + c.fill(nu, stem.small)
      }
      s += c.fill(S.map((P) => { const [x, y] = bez(P, 0.975); return c.C(x, y, 2) }).join(' '), stem.light) + '</g>'
      return { body: s, parts: [['hyphae', stem], ['spore', spores]] }
    },
  },
  mycelium: {
    box: [-48, -12, 48, 48],
    draw: (c, { stem = HYPHA, spores = SPORE }) => {
      const h = 'M-22,8 C-28,0 -36,-2 -44,-6 M-34,18 C-40,22 -43,28 -45,35 M-16,28 C-24,34 -30,38 -36,44 M24,12 C30,4 38,2 46,-2 M36,20 C40,26 43,32 45,40 M16,32 C22,38 30,42 38,44 M-40,-2 C-37,8 -40,14 -44,22 M-26,40 C-16,44 -6,45 4,43 M40,2 C37,10 39,16 43,22 M-30,13 C-24,18 -22,22 -20,30 M28,15 C24,20 22,24 20,32 M-4,6 C-10,8 -12,12 -14,16 M3,10 C10,12 12,16 14,20'
      let s = `<g id="${c.id}-hyphae">${c.tube(c.M(h), 2, stem, { w: c.lw * 0.6 })}${c.big ? c.line(c.M('M-36,-3 L-37,-9 M-44,22 L-48,25 M38,43 L40,47 M44,22 L47,26 M-31,39 L-33,45'), stem.outline, c.lw * 0.8) : ''}</g>`
      s += `<g id="${c.id}-spores">${c.body('spores', [[-44, -6, 3.6], [46, -2, 3.4], [-45, 35, 3.2], [38, 44, 3.6], [4, 43, 3]].map(([x, y, r]) => c.C(x, y, r)), spores, { w: c.lw })}</g>`
      return { body: s, parts: [['hyphae', stem], ['spores', spores]] }
    },
  },
  spores: {
    box: [-40, -46, 44, 44],
    draw: (c, { spores = SPORE, stem = HYPHA }) => {
      const sp = (x, y, r) => { const n = Math.round(r * 0.8); let d = ''; for (let i = 0; i < n; i++) { const t = (i / n) * 2 * Math.PI + 0.2; d += c.L([[x + (r - 0.5) * Math.cos(t), y + (r - 0.5) * Math.sin(t)], [x + (r + 3.2) * Math.cos(t), y + (r + 3.2) * Math.sin(t)]]) + ' ' } return [d, c.C(x, y, r), c.C(x, y, r * 0.7)] }
      const A = [sp(-17, -13, 19), sp(21, 19, 15), sp(-23, 30, 10)]
      let s = `<g id="${c.id}-germ-tube">${c.tube(c.M('M28,8 C36,-2 28,-14 36,-24 C44,-34 43,-38 40,-45'), 4, stem, { w: c.w * 0.7 })}</g>`
      s += `<g id="${c.id}-spores">${c.big ? c.line(A.map((a) => a[0]).join(' '), spores.outline, c.lw * 1.2) : ''}${c.body('spores', A.map((a) => a[1]), spores, { gloss: true })}${c.fill(A.map((a) => a[2]).join(' '), spores.light, spores.small, c.lw * 0.8)}</g>`
      return { body: s, parts: [['spores', spores], ['germ tube', stem]] }
    },
  },
  lichen: {
    box: [-48, -48, 48, 48],
    draw: (c, { thallus = LICHEN, cups = LICHEN_CUP }) => {
      const n = 9, P = []
      for (let i = 0; i < n; i++) { const t0 = (i / n) * 2 * Math.PI + 0.1, wd = (2 * Math.PI) / n, R = i % 2 ? 47 : 44;[[0.12, R - 7], [0.34, R], [0.66, R], [0.88, R - 7], [1, 32]].forEach(([u, r]) => P.push([r * Math.cos(t0 + u * wd), r * Math.sin(t0 + u * wd)])) }
      let s = `<g id="${c.id}-thallus">${c.body('thallus', c.S(P), thallus)}`
      if (c.big) s += c.line(Array.from({ length: n }, (_, i) => { const t = (i / n) * 2 * Math.PI + 0.1; return c.L([[32 * Math.cos(t), 32 * Math.sin(t)], [17 * Math.cos(t), 17 * Math.sin(t)]]) }).join(' '), thallus.small, c.lw)
      s += c.fill(c.C(0, 0, 16), thallus.shadow, thallus.small, c.lw) + '</g>'
      const C = [[-4, -3, 6], [9, 7, 5], [-9, 10, 4.2], [24, -16, 4.6], [-28, -12, 4.2], [-6, -31, 3.8], [12, 30, 4.2], [-22, 25, 3.6], [33, 12, 3.6]]
      s += `<g id="${c.id}-cups">${c.body('cups', C.map(([x, y, r]) => c.C(x, y, r)), cups, { w: c.lw * 1.1 })}${c.tiny ? '' : c.fill(C.map(([x, y, r]) => c.C(x, y, r * 0.45)).join(' '), cups.shadow)}</g>`
      return { body: s, parts: [['thallus', thallus], ['fruiting cups', cups]] }
    },
  },
  actinomycete: {
    box: [-48, -46, 46, 42],
    draw: (c, { stem = ACTINO, spores = ACTINO_SPORE }) => {
      let s = `<g id="${c.id}-filaments">${c.tube(c.M('M-46,38 C-30,36 -20,28 -10,14 M-10,14 C-6,2 -14,-10 -20,-21 M-24,30 C-10,38 6,38 19,36 M-10,14 C0,10 8,4 14,-5'), 4.5, stem, { w: c.w * 0.7 })}`
      if (c.big) s += c.line(c.M('M-33,36 L-34,31 M-17,23 L-21,20 M-12,2 L-7,1 M-6,35 L-5,30 M2,8 L-1,4'), stem.outline, c.lw)
      const S = [[-22, -27], [-22, -35], [-17, -41], [-9, -42], [-4, -36], [-8, -30], [24, 34], [31, 31], [37, 26], [40, 19], [38, 12], [32, 10], [17, -11], [21, -18], [27, -23], [34, -24], [39, -19], [38, -12]]
      s += `</g><g id="${c.id}-spores">${c.body('spores', S.map(([x, y]) => c.C(x, y, 4.3)), spores, { w: c.lw * 1.1 })}</g>`
      return { body: s, parts: [['filaments', stem], ['spores', spores]] }
    },
  },
}
FUNGI['fly agaric'] = { box: FUNGI.mushroom.box, draw: (c, o) => FUNGI.mushroom.draw(c, { cap: AGARIC, spots: true, ...o }) }
export function fungus(g, opts) { return draw(FUNGI, 'fungus', g, { kind: 'mushroom', ...opts }) }

// =====================================================================================================================
// Small life in water, and pollen, seen under the microscope. Kinds: 'algae' (two filaments of Spirogyra with their
// spiral chloroplasts and cross walls), 'microalga' (Chlamydomonas: an oval cell with two flagella, a cup-shaped
// chloroplast with its pyrenoid, a nucleus and a red eyespot; glossy), 'volvox' (a glossy colony sphere of tiny cells
// with daughter colonies inside), 'diatom' (a pennate diatom: golden-brown valve with its striae, raphe and central
// nodule), 'dinoflagellate' (an armoured cell with its plates, the groove round its middle with a wavy flagellum, and a
// trailing flagellum), 'coccolithophore' (a cell covered with oval calcite plates), 'pollen' (a spiny pollen grain with
// its furrows and pores, glossy), 'slime mould' (the network of veins of a plasmodium with its fan-shaped front).
// Options: pal (the cell), and per kind: chloro, plates, eyespot.
// Used by: Algae, Microalga, Volvox, Diatom, Dinoflagellate, Coccolithophore, Pollen grain, Slime mould, Plankton (with
//   the copepod of arthropod), Symbiosis, Lichen and scene icons of water.
// Example: micro(g, { x: 0, y: 0, size: 50, kind: 'volvox', id: 'volvox' })
// =====================================================================================================================
const MICRO = {
  algae: {
    box: [-56, -38, 58, 38],
    draw: (c, { pal = ALGA, chloro = CHLORO }) => {
      const K = 1.25, fil = (x0, x1, yc, ph) => {
        const Y = (x) => yc + 2.2 * Math.sin(((x + ph) * Math.PI) / 36), dY = (x) => ((2.2 * Math.PI) / 36) * Math.cos(((x + ph) * Math.PI) / 36), nm = (x) => { const d = dY(x), l = Math.hypot(1, d); return [-d / l, 1 / l] }
        const Q = (x, h = 0) => { const [nx, ny] = nm(x); return [(x + nx * h) * K + 1, (Y(x) + ny * h) * K] }
        const C = Array.from({ length: 31 }, (_, i) => Q(x0 + ((x1 - x0) * i) / 30))
        const L = x1 - x0, cw = [1, 2, 3].map((k) => x0 + (L * k) / 4), ed = [x0 - 3, ...cw, x1 + 3]
        let bk = '', fr = '', py = ''
        for (let k = 0; k < 4; k++) {
          const xa = ed[k] + 1.8, xb = ed[k + 1] - 1.8, lam = 14; let run = [], front = null
          const flush = () => { if (run.length > 1) { if (front) fr += c.L(run) + ' '; else bk += c.L(run) + ' ' } run = [] }
          for (let j = 0; j <= 40; j++) { const x = xa + ((xb - xa) * j) / 40, ph2 = (2 * Math.PI * (x - xa)) / lam - Math.PI / 2, f2 = Math.cos(ph2) >= 0; if (f2 !== front) { const last = run[run.length - 1]; flush(); if (last) run.push(last); front = f2 } run.push(Q(x, 7 * Math.sin(ph2))) }
          flush()
          for (let x = xa + lam / 4; x < xb - 1; x += lam) py += c.C(...Q(x), 1.7 * K) + ' '
        }
        return { C, bk, fr, py, walls: cw.map((x) => c.L([Q(x, -10.2), Q(x, 10.2)])).join(' ') }
      }
      const A = [fil(-33, 35, -17, 8), fil(-35, 33, 17, -10)]
      let s = `<g id="${c.id}-filaments">${A.map((a) => c.tube(a.C, 21, pal, { straight: true })).join('')}`
      s += `</g><g id="${c.id}-chloroplasts">${c.big ? c.line(A.map((a) => a.bk).join(' '), chloro.light, c.lw * 1.2) : ''}${c.line(A.map((a) => a.fr).join(' '), chloro.base, Math.max(c.lw * 1.6, 3.2 * c.F.px * 0.8))}${c.big ? c.fill(A.map((a) => a.py).join(' '), chloro.shadow) : ''}</g>`
      s += `<g id="${c.id}-walls">${c.line(A.map((a) => a.walls).join(' '), pal.outline, c.lw * 1.1)}</g>`
      return { body: s, parts: [['cells', pal], ['chloroplasts', chloro]] }
    },
  },
  microalga: {
    box: [-32, -42, 32, 45],
    draw: (c, { pal = ALGA, chloro = CHLORO, eyespot = EYESPOT }) => {
      let s = `<g id="${c.id}-flagella">${c.line(c.M('M-5,-26 C-9,-38 -22,-44 -31,-37 M5,-26 C9,-38 22,-44 31,-37'), pal.outline, Math.max(c.lw, 1.6 * c.F.px * 0.6))}</g>`
      s += `<g id="${c.id}-cell">${c.body('cell', c.E(0, 9, 30, 35), pal, { gloss: true })}</g>`
      s += `<g id="${c.id}-chloroplast">${c.body('chloroplast', c.M('M-24,-2 C-27,22 -13,39 0,39 C13,39 27,22 24,-2 C19,-13 14,4 0,4 C-14,4 -19,-13 -24,-2 Z'), chloro, { w: c.lw * 1.1 })}${c.fill(c.C(0, 24, 7.5), chloro.light, chloro.outline, c.lw)}</g>`
      s += `<g id="${c.id}-nucleus">${c.fill(c.C(0, -8, 8.5), NUC.base, NUC.outline, c.lw)}${c.fill(c.C(0, -8, 3.2), NUC.small)}</g>`
      s += `<g id="${c.id}-eyespot">${c.fill(c.C(-17, 6, 3), eyespot.base, eyespot.outline, c.lw * 0.7)}</g>`
      if (c.big) s += `<g id="${c.id}-vacuoles">${c.fill(c.C(-5, -21, 2) + ' ' + c.C(5, -21, 2), '#FFFFFF', pal.outline, c.lw * 0.7)}</g>`
      return { body: s, parts: [['cell', pal], ['chloroplast', chloro], ['eyespot', eyespot], ['nucleus', NUC]] }
    },
  },
  volvox: {
    box: [-45, -45, 45, 45],
    draw: (c, { pal = ALGA }) => {
      const R = 44
      let s = `<g id="${c.id}-colony">${c.body('colony', c.C(0, 0, R), pal, { tone: 'light', gloss: true })}`
      let rim = '', face = ''
      for (let i = 0; i < 120; i++) { const z = 1 - (2 * (i + 0.5)) / 120; if (z < 0) continue; const rr = Math.sqrt(1 - z * z), th = i * 2.39996, x = rr * Math.cos(th) * (R - 4), y = rr * Math.sin(th) * (R - 4); if (z < 0.38) rim += c.C(x, y, 1.8) + ' '; else face += c.C(x, y, 1.4) + ' ' }
      if (!c.tiny) s += c.fill(face, pal.shadow) + c.fill(rim, pal.small)
      s += `</g><g id="${c.id}-daughters">`
      ;[[-14, -9, 14], [17, 9, 12], [-6, 23, 9], [16, -22, 8]].forEach(([x, y, r], j) => {
        s += c.body(`daughter-${j + 1}`, c.C(x, y, r), pal, { w: c.lw * 1.3, gloss: true })
        if (c.big) { const m = Math.round(r * 1.15); let d = ''; for (let i = 0; i < m; i++) { const t = (i / m) * 2 * Math.PI + j; d += c.C(x + Math.cos(t) * r * 0.72, y + Math.sin(t) * r * 0.72, 1.2) + ' ' } s += c.fill(d, pal.small) }
      })
      return { body: s + '</g>', parts: [['colony', pal]] }
    },
  },
  diatom: {
    box: [-48, -19, 48, 19],
    draw: (c, { pal = DIATOM }) => {
      const W = (x) => 19 * Math.pow(Math.max(0, 1 - (x / 48) ** 2), 0.72)
      const out = (k, inset) => { const T = [], B = []; for (let i = 0; i <= k; i++) { const x = -48 + inset + ((96 - 2 * inset) * i) / k; T.push([x, -Math.max(0, W(x) - inset)]); if (i > 0 && i < k) B.unshift([x, Math.max(0, W(x) - inset)]) } return c.S(T.concat(B)) }
      let s = `<g id="${c.id}-valve">${c.body('valve', out(28, 0), pal)}${c.fill(out(28, 3.6), 'none', pal.small, c.lw)}`
      if (c.big) { let st = ''; for (let x = -41.6; x <= 41.7; x += 4.16) { if (Math.abs(x) < 6) continue; const e = W(x) - 4.4; if (e < 4.6) continue; const tilt = x * 0.07; st += c.L([[x, -3.4], [x + tilt, -e]]) + ' ' + c.L([[x, 3.4], [x + tilt, e]]) + ' ' } s += c.line(st, pal.shadow, c.lw * 0.9) }
      s += c.fill(c.E(0, 0, 6.5, 4.2), pal.light, pal.small, c.lw * 0.8) + c.line(c.M('M-41,0 C-30,-0.8 -16,0.8 -3,0 M3,0 C16,-0.8 30,0.8 41,0'), pal.outline, c.lw * 1.1)
      s += c.fill([[-3, 0, 1.3], [3, 0, 1.3], [-42, 0, 2.1], [42, 0, 2.1]].map(([x, y, r]) => c.C(x, y, r)).join(' '), pal.outline) + '</g>'
      return { body: s, parts: [['valve', pal]] }
    },
  },
  dinoflagellate: {
    box: [-29, -45, 29, 48],
    draw: (c, { pal = DINO }) => {
      const body = c.M('M0,-45 C4,-35 22,-31 28,-13 C32,1 24,13 20,21 C18,27 20,33 18,39 C12,35 8,29 4,23 C2,21 -2,21 -4,23 C-8,29 -12,35 -18,39 C-20,33 -18,27 -20,21 C-24,13 -32,1 -28,-13 C-22,-31 -4,-35 0,-45 Z')
      let s = `<g id="${c.id}-flagellum">${c.line(c.M('M0,22 C-5,30 5,36 0,42 C-3,45 3,47 1,48'), pal.outline, Math.max(c.lw, 1.2 * c.F.px * 0.6))}</g>`
      s += `<g id="${c.id}-cell">${c.body('cell', body, pal)}`
      if (c.big) s += c.line(c.M('M0,-35 L0,-5 M-13,-27 L-10,-5 M13,-27 L10,-5 M0,3 L0,21 M-14,1 L-12,19 M14,1 L12,19'), pal.small, c.lw)
      s += c.tube(c.M('M-29,-9 C-16,-1 16,-1 29,-9'), 6, pal, { tone: 'light', w: c.lw })
      if (c.big) s += c.line(c.M('M-27,-8.5 C-24,-10.5 -23,-5 -20,-6.5 C-17,-8 -16,-3 -13,-4.5 C-10,-6 -9,-2 -6,-3 C-3,-4 -2,-1 1,-3 C4,-5 5,-2.5 8,-5 C11,-7.5 12,-6 14,-9 C17,-12 18,-11 20,-12'), pal.outline, c.lw * 0.9)
      s += c.fill([[-9, -19, 4], [8, 12, 3.2], [9, -17, 2.6], [-8, 11, 2.6]].map(([x, y, r]) => c.C(x, y, r)).join(' '), pal.shadow) + '</g>'
      return { body: s, parts: [['cell', pal]] }
    },
  },
  coccolithophore: {
    box: [-49, -49, 49, 49],
    draw: (c, { pal = ALGA, plates = PLATE }) => {
      const K = 1.13, lith = (x, y, r, k = 1) => { const T = (pts) => place(pts.map(([u, v]) => [u * k * K, v * k * K]), x * K, y * K, r); return [c.S(T(ellPts(0, 0, 13.5, 8.5))), c.S(T(ellPts(0, 0, 7.5, 4))), c.L(T([[-12, 0], [-8.5, 0]])) + c.L(T([[8.5, 0], [12, 0]])) + c.L(T([[0, -7.5], [0, -5]])) + c.L(T([[0, 5], [0, 7.5]]))] }
      const L = Array.from({ length: 7 }, (_, i) => { const t = (i / 7) * 2 * Math.PI - 0.35; return lith(30 * Math.cos(t), 30 * Math.sin(t), (t * 180) / Math.PI + 90) }).concat([lith(0, 0, -18, 1.3)])
      let s = `<g id="${c.id}-cell">${c.body('cell', c.C(0, 0, 30 * K), pal, { tone: 'light', gloss: true, w: c.w * 0.8 })}</g><g id="${c.id}-plates">`
      L.forEach((l, i) => { s += c.body(`plate-${i + 1}`, l[0], plates, { w: c.w * 0.75 }) + c.fill(l[1], plates.shadow, plates.small, c.lw * 0.8) + (c.big ? c.line(l[2], plates.small, c.lw * 0.8) : '') })
      return { body: s + '</g>', parts: [['cell', pal], ['plates', plates]] }
    },
  },
  pollen: {
    box: [-44, -44, 44, 44],
    draw: (c, { pal = POLLEN }) => {
      const spines = Array.from({ length: 22 }, (_, i) => { const t = (i / 22) * 2 * Math.PI + 0.07, co = Math.cos(t), sn = Math.sin(t); return c.L([[co * 31 - sn * 3.6, sn * 31 + co * 3.6], [co * 43, sn * 43], [co * 31 + sn * 3.6, sn * 31 - co * 3.6]]) + 'Z' })
      let s = `<g id="${c.id}-grain">${spines.map((d) => c.fill(d, pal.shadow, pal.outline, c.w * 0.8)).join('')}${c.body('grain', c.C(0, 0, 34), pal, { gloss: true })}`
      if (c.big) { let d = ''; for (let y = -28; y <= 28; y += 7) for (let x = -28; x <= 28; x += 7) { const xx = x + ((y / 7) % 2 ? 3.5 : 0); if (Math.hypot(xx, y) > 27.5 || (Math.abs(xx) < 7 && Math.abs(y) < 26) || (Math.abs(xx) > 19 && Math.abs(y) < 20)) continue; d += c.C(xx, y, 1.5) + ' ' } s += c.fill(d, pal.small) }
      s += c.fill(c.M('M0,-24 C5.5,-12 5.5,12 0,24 C-5.5,12 -5.5,-12 0,-24 Z M-26,-16 C-29.5,-6 -29.5,6 -26,16 C-23,6 -23,-6 -26,-16 Z M26,-16 C29.5,-6 29.5,6 26,16 C23,6 23,-6 26,-16 Z'), pal.shadow, pal.outline, c.lw)
      s += c.fill(c.E(0, 0, 3.8, 4.8), pal.small, pal.outline, c.lw * 0.8) + '</g>'
      return { body: s, parts: [['grain', pal]] }
    },
  },
  'slime mould': {
    box: [-48, -44, 50, 42],
    draw: (c, { pal = SLIME }) => {
      const N = { A: [-46, 30], B: [-33, 13], C: [-42, -16], D: [-24, -30], E: [-18, -3], F: [-26, 36], G: [-2, 20], H: [-4, -14], I: [2, -40], J: [18, 6], K: [18, -20], L: [18, 26] }
      const E = [['A', 'B', 4], ['B', 'E', 5.5], ['C', 'B', 3], ['C', 'D', 3], ['D', 'E', 3.2], ['D', 'H', 4], ['E', 'H', 5.5], ['E', 'G', 4.2], ['F', 'B', 3], ['F', 'G', 3.2], ['G', 'L', 5], ['H', 'K', 6], ['G', 'J', 4.5], ['H', 'J', 3.4], ['I', 'D', 3], ['I', 'K', 4]]
      const ed = E.map(([p, q, wd], i) => { const [x0, y0] = N[p], [x1, y1] = N[q], dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy), k = (i % 2 ? 1 : -1) * l * 0.12, mx = (x0 + x1) / 2 - (dy / l) * k, my = (y0 + y1) / 2 + (dx / l) * k; return [c.M(`M${x0},${y0} C${x0 + (mx - x0) * 0.67},${y0 + (my - y0) * 0.67} ${x1 + (mx - x1) * 0.67},${y1 + (my - y1) * 0.67} ${x1},${y1}`), wd] })
      const fan = c.S([[14, -30], [22, -40], [32, -42.5], [40, -37], [46, -27], [48.5, -15], [47.5, -3], [49.5, 9], [47, 21], [42, 32], [32, 40], [21, 38.5], [14, 29], [11, 15], [12, 0], [11, -14]])
      let s = `<g id="${c.id}-plasmodium">${ed.map(([d, wd]) => c.tube(d, wd, pal, { w: c.lw * 1.1 }).split('/>')[0] + '/>').join('')}${c.body('front', fan, pal)}${ed.map(([d, wd]) => c.stroke(d, pal.base, Math.max(0.8, wd * c.F.px) / strokeScale())).join('')}`
      if (c.big) s += c.line([[18, -20, [[28, -38], [38, -34], [44, -24]]], [18, 6, [[45, -12], [46, 2], [46, 15]]], [18, 26, [[42, 26], [36, 34], [26, 36]]]].map(([x0, y0, T]) => T.map(([x, y]) => c.O([[x0, y0], [x0 + (x - x0) * 0.55, y0 + (y - y0) * 0.35], [x, y]])).join(' ')).join(' '), pal.shadow, c.lw)
      return { body: s + '</g>', parts: [['plasmodium', pal]] }
    },
  },
}
export function micro(g, opts) { return draw(MICRO, 'micro', g, { kind: 'microalga', ...opts }) }

// =====================================================================================================================
// A person. Kinds: 'adult' (standing, seen from the front), 'older' (seen from the side, stooped, with grey hair and a
// walking stick, facing right as SiliCoDraw draws him), 'infant' (sitting, from the front, with a curl of hair), 'bust'
// (head and shoulders: the person of assays.mjs, reused as it is). Options: pal (clothes, lab's ACCENT), skin (SKIN),
// hair (a palette or false), stick (the older person: true). Faces have dots for eyes like every animal; the infant smiles.
// Used by: Human, Older person, Infant, Centenarian (the older person with a medal), Symbiosis, Dysbiosis.
// Example: human(g, { x: 0, y: 0, size: 60, kind: 'older', id: 'older-person' })
// =====================================================================================================================
const HUMANS = {
  adult: {
    box: [-23, -48, 23, 48],
    draw: (c, { pal = ACCENT, skin = SKIN, hair = HAIR.dark }) => {
      let s = `<g id="${c.id}-body">${c.body('body', c.M('M-4.5,-33 C-4.5,-30 -8,-28.5 -13,-27.5 C-18.5,-26.5 -21,-23 -21,-17 L-22.5,3 C-22.8,6.5 -16.5,7 -16,3.5 L-15,-13 C-15,-14.5 -13,-14.5 -12.8,-12.5 L-12,6 C-12,10 -11.5,20 -11,30 L-10.5,42 C-12.5,43.5 -13,47.5 -10,47.5 L-3,47.5 C-1.5,47.5 -1.5,45 -2.5,42 L-2,12 C-2,9.5 2,9.5 2,12 L2.5,42 C1.5,45 1.5,47.5 3,47.5 L10,47.5 C13,47.5 12.5,43.5 10.5,42 L11,30 C11.5,20 12,10 12,6 L12.8,-12.5 C13,-14.5 15,-14.5 15,-13 L16,3.5 C16.5,7 22.8,6.5 22.5,3 L21,-17 C21,-23 18.5,-26.5 13,-27.5 C8,-28.5 4.5,-30 4.5,-33 Z'), pal)}`
      if (c.big) s += c.line(c.M('M-12.5,-20 C-12,-16 -12,-12 -12.5,-8 M12.5,-20 C12,-16 12,-12 12.5,-8 M-12,6 C-6,8 6,8 12,6'), pal.small, c.lw)
      s += c.back([[-17, -23], [-13, -26], [-9, -26.5], [-5, -26.5]], pal) + `</g><g id="${c.id}-hands">${c.fill(c.C(-19.3, 4.2, 3.1) + ' ' + c.C(19.3, 4.2, 3.1), skin.base, skin.outline, c.lw * 1.3)}</g>`
      s += `<g id="${c.id}-head">${c.body('head', c.C(0, -39.5, 8.5), skin)}${hair ? c.body('hair', c.M('M-8.4,-40 C-9,-46 -5,-48.6 0,-48.6 C5,-48.6 9,-46 8.4,-40 C6,-43 3,-44 0,-44 C-3,-44 -6,-43 -8.4,-40 Z'), hair, { w: c.lw }) : ''}</g>`
      return { body: s, parts: [['clothes', pal], ['skin', skin], ...(hair ? [['hair', hair]] : [])] }
    },
  },
  older: {
    box: [-26, -45, 26, 48],
    draw: (c, { pal = ACCENT, skin = SKIN, hair = HAIR.grey, stick = true, wood = STICK }) => {
      const tp = (P, w0, w1) => c.S(band(chain([P], 8), w0, w1)), X = (d) => d
      let s = `<g id="${c.id}-body">${c.body('far-leg', tp([-14, 6, -16, 20, -15, 32, -14, 42], 10, 8), pal, { tone: 'shadow' })}</g><g id="${c.id}-shoes">${c.body('far-shoe', c.R(-19, 41, 13, 6, 3), SHOE, { w: c.lw * 1.2 })}</g>`
      if (stick) s += `<g id="${c.id}-stick">${c.tube(c.M('M18,-4 C17,-10 11,-11 9,-6 M18,-4 L24,46'), 3.8, wood, { w: c.lw })}</g>`
      s += `<g id="${c.id}-body-near">${c.body('body', [c.S(X([[-8, -25], [2, -24], [8, -16], [9, -4], [7, 8], [-2, 12], [-16, 13], [-21, 4], [-24, -8], [-19, -19]])), tp([-2, 6, 2, 20, 1, 32, 0, 42], 10.5, 8)], pal)}`
      s += c.back([[-21, -4], [-21, -11], [-18, -17], [-12, -21]], pal) + (c.big ? c.line(c.M('M-18,8 C-12,10 -4,10 4,8'), pal.small, c.lw) : '')
      s += c.body('arm', tp([-1, -19, 3, -8, 9, -3, 16, -1], 8, 6.5), pal, { w: c.w * 0.85 }) + `</g><g id="${c.id}-shoes-near">${c.body('shoe', c.R(-5, 41, 15, 6, 3), SHOE, { w: c.lw * 1.2 })}</g>`
      s += `<g id="${c.id}-head">${c.fill(c.C(17, -1.5, 3.8), skin.base, skin.outline, c.w * 0.8)}${c.body('head', c.C(3, -33, 10.5), skin)}${hair ? c.body('hair', c.M('M-7.2,-36 C-7,-43 -2,-44.5 3,-44.5 C8,-44.5 11.5,-42 12.5,-39 C8,-41 3,-40.5 -1,-36 C-2.5,-34 -4,-32 -5.5,-30.5 C-7,-32 -7.4,-34 -7.2,-36 Z'), hair, { w: c.lw }) : ''}${c.eye(9.5, -34, 1.6)}${c.big ? c.line(c.M('M-0.5,-35 C-2.5,-34 -2.5,-30 -0.5,-29.5'), skin.small, c.lw) : ''}</g>`
      return { body: s, parts: [['clothes', pal], ['skin', skin], ...(hair ? [['hair', hair]] : []), ...(stick ? [['stick', wood]] : []), ['shoes', SHOE]] }
    },
  },
  infant: {
    box: [-37, -48, 37, 45],
    draw: (c, { pal = ACCENT, skin = SKIN, hair = HAIR.dark }) => {
      const tp = (P, w0, w1) => c.S(band(chain([P], 8), w0, w1))
      let s = `<g id="${c.id}-clothes">`
      for (const k of [-1, 1]) s += c.body(`leg-${k < 0 ? 'right' : 'left'}`, tp([k * -10, 20, k * -18, 24, k * -23, 30, k * -26, 35], 15, 12), pal, { w: c.w * 0.85 })
      s += `</g><g id="${c.id}-feet">${c.body('feet', [c.E(29, 39, 7.5, 6, -20), c.E(-29, 39, 7.5, 6, 20)], skin, { w: c.w * 0.8 })}</g>`
      s += `<g id="${c.id}-clothes-body">${c.body('body', c.M('M-10,-7 C-18,-5 -21,5 -21,14 C-21,25 -13,31 0,31 C13,31 21,25 21,14 C21,5 18,-5 10,-7 Z'), pal)}`
      if (c.big) s += c.fill(c.C(0, 10, 1.6) + ' ' + c.C(0, 17, 1.6), pal.light, pal.small, c.lw * 0.6)
      for (const k of [-1, 1]) s += c.body(`arm-${k < 0 ? 'right' : 'left'}`, tp([k * -14, -2, k * -20, 2, k * -25, 6, k * -27, 12], 10, 8), pal, { w: c.w * 0.85 })
      s += `</g><g id="${c.id}-head">${c.body('hands', [c.C(-28, 15, 5.2), c.C(28, 15, 5.2)], skin, { w: c.w * 0.8 })}${c.body('ears', [c.C(-17.5, -23, 4.5), c.C(17.5, -23, 4.5)], skin, { w: c.w * 0.8 })}${c.body('head', c.C(0, -24, 18), skin)}`
      s += c.fill(c.C(-11, -17.5, 3.2) + ' ' + c.C(11, -17.5, 3.2), PINK.light) + c.eye(-6.5, -24, 2.4) + c.eye(6.5, -24, 2.4) + c.line(c.M('M-4,-15.5 C-2,-13 2,-13 4,-15.5'), skin.outline, c.lw)
      if (hair) s += c.line(c.M('M-3,-41.5 C-3.5,-45 -1,-47.5 2,-47 M1,-41.8 C2,-44.5 4.5,-45.5 6.5,-44.5'), hair.base, Math.max(c.lw * 1.4, 1.6 * c.F.px * 0.6))
      return { body: s + '</g>', parts: [['clothes', pal], ['skin', skin], ...(hair ? [['hair', hair]] : [])] }
    },
  },
}
export function human(g, opts) {
  const o = { kind: 'adult', ...opts }
  if (o.kind === 'bust') { const { kind, ...rest } = o; return person(g, { id: 'person', ...rest }) }
  return draw(HUMANS, 'human', g, o)
}

// =====================================================================================================================
// What organisms stand in. Kinds: 'water' (a band of water with a gently waving surface, lab.mjs's water), 'ground' (a band
// of soil with a few pebbles), 'pond' (a hollow of water in mud, the killifish's pond; water: false leaves it dry and
// cracked), 'egg' (a hen's egg, glossy; embryo: true opens it: the yolk with its ring of vessels and a chick embryo with
// its eye and beating heart), 'sun' (a disc with eight rays, for photosynthesis and seasons). `size` the longer side.
// Options: water, embryo, pal.
// Used by: Chick embryo, Killifish ephemeral pond, Photosynthesis, Seagrass and Mangrove (water lines), Life cycle,
//   Plant growth stages, Dysbiosis and any icon that sets an animal in its place.
// Example: scene(g, { x: 0, y: 0, size: 60, kind: 'egg', embryo: true, id: 'egg' })
// =====================================================================================================================
const SCENE = {
  water: {
    box: [-50, -8, 50, 10],
    draw: (c, { pal = WATER }) => {
      const top = Array.from({ length: 21 }, (_, i) => [-50 + i * 5, -6 + 1.6 * Math.sin(i * 0.9)])
      return { body: `<g id="${c.id}-water">${c.fill(c.L([...top, [50, 10], [-50, 10]]) + 'Z', pal.base)}${c.line(c.O(top), pal.outline, c.lw * 1.3)}${c.big ? c.line(c.M('M-38,2 L-24,2 M-6,5 L10,5 M24,1 L38,1'), pal.light, c.lw * 1.3) : ''}</g>`, parts: [['water', pal]] }
    },
  },
  ground: {
    box: [-50, -8, 50, 10],
    draw: (c, { pal = SOIL }) => ({ body: `<g id="${c.id}-soil">${c.body('soil', c.M('M-50,-6 C-30,-8 -10,-5 10,-6.5 C26,-7.5 40,-6 50,-6 L50,10 L-50,10 Z'), pal, { tone: 'light', flat: true })}${c.big ? c.fill([[-36, 2, 2.2, 1.5], [-12, 5, 1.6, 1.1], [8, 1, 2.6, 1.7], [30, 4, 1.8, 1.2]].map(([x, y, rx, ry]) => c.E(x, y, rx, ry)).join(' '), pal.shadow) : ''}</g>`, parts: [['soil', pal]] }),
  },
  pond: {
    box: [-48, -12, 48, 43],
    draw: (c, { pal = WATER, mud = SOIL, water = true }) => {
      let s = `<g id="${c.id}-mud">${c.fill(c.M('M-48,-12 L-40,-12 C-32,-12 -30,14 0,14 C30,14 32,-12 40,-12 L48,-12 L48,38 C30,44 -30,44 -48,38 Z'), mud.light)}${c.line(c.M('M-48,-12 L-40,-12 M40,-12 L48,-12'), mud.outline, c.w * 0.8)}`
      if (c.big) s += c.line(c.M('M-46,-4 L-42,0 L-45,4 M44,-4 L40,1 L43,5 M-30,26 L-24,29 L-25,35 M28,24 L23,28 L25,34 M-6,38 L-2,35 L3,37'), mud.small, c.lw)
      s += '</g>'
      if (water) s += `<g id="${c.id}-water">${c.fill(c.M('M-40,-12 C-32,-12 -30,14 0,14 C30,14 32,-12 40,-12 Z'), pal.base, pal.outline, c.w * 0.8)}${c.big ? c.line(c.M('M-30,-6 L-18,-6 M-8,-6 L6,-6 M16,-6 L30,-6'), pal.light, c.lw * 1.2) : ''}</g>`
      else s += `<g id="${c.id}-bed">${c.fill(c.M('M-40,-12 C-32,-12 -30,14 0,14 C30,14 32,-12 40,-12 Z'), mud.shadow, mud.outline, c.w * 0.8)}${c.line(c.M('M-26,-6 L-18,-2 L-20,4 M-4,0 L2,-6 L8,-2 M18,-8 L22,-2 L28,-4'), mud.outline, c.lw)}</g>`
      return { body: s, parts: [['mud', mud], ...(water ? [['water', pal]] : [])] }
    },
  },
  egg: {
    box: [-38, -46, 38, 46],
    draw: (c, { pal = EGG_SHELL, embryo = false, yolk = YOLK, vessel = VESSEL, chick = EMBRYO }) => {
      const shell = c.M('M0,-46 C20,-46 38,-20 38,6 C38,30 22,46 0,46 C-22,46 -38,30 -38,6 C-38,-20 -20,-46 0,-46 Z')
      if (!embryo) return { body: `<g id="${c.id}-shell">${c.body('shell', shell, pal, { gloss: true })}</g>`, parts: [['shell', pal]] }
      let s = `<g id="${c.id}-shell">${c.body('shell', shell, pal)}${c.fill(c.M('M0,-41 C17,-41 33,-18 33,6 C33,27 19,41 0,41 C-19,41 -33,27 -33,6 C-33,-18 -17,-41 0,-41 Z'), pal.light, pal.small, c.lw)}</g>`
      s += `<g id="${c.id}-yolk">${c.body('yolk', c.C(0, 10, 25), yolk, { w: c.lw * 1.2 })}</g><g id="${c.id}-vessels">${c.fill(c.C(1, 9, 19), 'none', vessel.base, c.lw)}`
      if (c.big) { let v = '';[[200, 1], [245, -1], [300, 1], [345, -1], [30, 1], [75, -1], [120, 1], [160, -1]].forEach(([gd, k]) => { const t = rad(gd), co = Math.cos(t), sn = Math.sin(t), p = (r) => [1 + co * r - sn * k * (r - 9) * 0.25, 9 + sn * r + co * k * (r - 9) * 0.25]; v += c.O([p(10), p(14.5), p(19)]) + ' ' }); s += c.line(v, vessel.base, c.lw * 0.9) }
      s += `</g><g id="${c.id}-embryo">${c.body('embryo', [c.S(band(chain([[-2, -1, 11, -6, 16, 14, 4, 17.5]], 10), 9, 2.4)), c.C(-5.5, 2, 8), c.E(14.5, 3, 3.2, 2, 70), c.E(13, 14, 3.2, 2, -50)], chick, { w: c.lw * 1.3 })}`
      s += c.fill(c.C(-0.5, 11, 3.2), vessel.base, vessel.outline, c.lw * 0.7) + c.eye(-6.5, 1.5, 3.2) + '</g>'
      return { body: s, parts: [['shell', pal], ['yolk', yolk], ['vessels', vessel], ['embryo', chick]] }
    },
  },
  sun: {
    box: [-19, -19, 19, 19],
    draw: (c, { pal = SUN }) => {
      const rays = Array.from({ length: 8 }, (_, k) => { const t = (k * Math.PI) / 4; return c.L([[Math.cos(t) * 14, Math.sin(t) * 14], [Math.cos(t) * 18, Math.sin(t) * 18]]) }).join(' ')
      return { body: `<g id="${c.id}-sun">${c.tube(rays, 2.4, pal, { tone: 'shadow', w: c.lw })}${c.body('disc', c.C(0, 0, 10.5), pal)}</g>`, parts: [['sun', pal]] }
    },
  },
}
export function scene(g, opts) { return draw(SCENE, 'scene', g, { kind: 'water', ...opts }) }

// =====================================================================================================================
// Plant cell, promoted from ../cells/embryo.mjs (Plant cell) keeping its shapes and colours: a rectangular cell wall, the
// cytoplasm inside its membrane, a large central vacuole, a flat lilac nucleus beside it and four chloroplasts, each with
// three grana. The old highlight ellipses are left out (STYLE.md); not glossed (not round). Options: chloroplasts (4, or
// fewer), vacuole (true).
// Used by: Plant cell (already drawn), Photosynthesis, Stoma, Lichen and Symbiosis where a plant cell is meant.
// Example: plantCell(g, { x: 0, y: 0, size: 60, id: 'plant-cell' })
// =====================================================================================================================
const PLANT_CELL = {
  cell: {
    box: [-45, -36, 45, 36],
    draw: (c, { wall = WALL, cyto = CYTO, vac = VACUOLE, chl = PLASTID, chloroplasts = 4, vacuole = true }) => {
      const W = c.w * 1.1
      let s = `<g id="${c.id}-cell-wall">${c.body('wall', c.R(-45, -36, 90, 72, 5), wall, { w: W * 0.8 })}</g><g id="${c.id}-cytoplasm">${c.body('cytoplasm', c.R(-39, -30, 78, 60, 3), cyto, { w: W })}</g>`
      if (vacuole) s += `<g id="${c.id}-vacuole">${c.body('vacuole', c.R(-18, -20, 40, 42, 10), vac, { w: W * 0.8 })}</g>`
      const C = [[-30, -21, -30], [-30, 19, 30], [30.5, 19, -30], [30.5, -19, 30]].slice(0, chloroplasts)
      s += `<g id="${c.id}-chloroplasts">${C.map(([x, y, r], i) => c.body(`chloroplast-${i + 1}`, c.E(x, y, 7, 4, r), chl, { w: W * 0.6 }) + (c.tiny ? '' : c.fill([-3.6, 0, 3.6].map((d) => c.E(x + d * Math.cos(rad(r)), y + d * Math.sin(rad(r)), 1.1, 2.1, r)).join(' '), chl.small))).join('')}</g>`
      s += `<g id="${c.id}-nucleus">${c.fill(c.C(-28.5, -1, 6.2), NUC.base, NUC.outline, W * 0.8)}</g>`
      return { body: s, parts: [['cell wall', wall], ['cytoplasm', cyto], ...(vacuole ? [['vacuole', vac]] : []), ['chloroplasts', chl], ['nucleus', NUC]] }
    },
  },
}
export function plantCell(g, opts) { return draw(PLANT_CELL, 'plantCell', g, { kind: 'cell', id: 'plant-cell', ...opts }) }

// ---------- demonstrations: every kind once, a few options ----------
const cap = (s) => s[0].toUpperCase() + s.slice(1)
const demosOf = (fn, plan, table, size = 96, extra = {}) => Object.keys(table).map((kind) => ({ name: `${cap(plan)}, ${kind}`, size: 100, draw: (g) => fn(g, { x: 0, y: 0, size, kind, ...(extra[kind] ?? {}) }) }))
const V = (name, fn, o) => ({ name, size: 100, draw: (g) => fn(g, { x: 0, y: 0, size: 96, ...o }) })
export const DEMOS = [
  ...demosOf(mammal, 'mammal', MAMMALS), V('Mammal, dog, old with collar', mammal, { kind: 'dog', old: true, collar: true }), V('Mammal, mouse facing right', mammal, { kind: 'mouse', flip: true }),
  ...demosOf(face, 'face', FACES), ...demosOf(bat, 'bat', BATS), ...demosOf(seaMammal, 'sea mammal', SEA_MAMMALS), V('Sea mammal, bowhead with spout', seaMammal, { kind: 'bowhead', spout: true }),
  ...demosOf(fish, 'fish', FISH), ...demosOf(bird, 'bird', BIRDS), ...demosOf(amphibian, 'amphibian', AMPHIBIANS), ...demosOf(reptile, 'reptile', REPTILES),
  ...demosOf(insect, 'insect', INSECTS), V('Insect, honeybee queen', insect, { kind: 'honeybee', queen: true }), V('Insect, ant queen', insect, { kind: 'ant', queen: true }),
  ...demosOf(arthropod, 'arthropod', ARTHROPODS), ...demosOf(invertebrate, 'invertebrate', INVERTEBRATES),
  V('Nematode (worm of assays.mjs)', (g, o) => worm(g, { ...o, amp: 0.12 }), {}),
  ...demosOf(plant, 'plant', PLANTS), V('Plant, seedling with roots', plant, { kind: 'seedling', roots: true }),
  ...demosOf(fungus, 'fungus', FUNGI), V('Fungus, yeast without bud or scars', fungus, { kind: 'yeast', scars: 0, bud: false }),
  ...demosOf(micro, 'micro', MICRO), ...demosOf(human, 'human', HUMANS), V('Human, bust (person of assays.mjs)', human, { kind: 'bust' }),
  ...demosOf(scene, 'scene', SCENE), V('Scene, dry pond', scene, { kind: 'pond', water: false }), V('Scene, egg with embryo', scene, { kind: 'egg', embryo: true }),
  V('Plant cell', plantCell, {}),
]

// The machinery of kinds, shared with clinical.mjs.
export { rad, P2, lin, sw, fillD, strokeD, boxOf, group, join, uniq, mixHex, rng, bez, chain, band, smoothPts, ellPts, mirror, frame, mapD, curveD, lineD, ellD, ctx, draw }
