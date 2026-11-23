// Shared parts of the redrawn icons, group "food": what the icons of SiliCoDraw's "Food, sport & nutrition" category have
// in common. Foods by kind (apple, carrot, broccoli, bread, egg, steak, avocado, fish, olives, an olive sprig, a drop of
// oil, sugar cubes, salt, dietary fibre), containers (a cup of coffee, a glass, a milk carton, a sports bottle, a salt
// shaker), tableware (a plate with food on it, fork, knife), sport equipment (dumbbell, barbell), people in sport poses
// (running, swimming, squatting with a barbell), heat and cold (a sauna stove, a wooden bucket, a thermometer, a tub of cold
// water with a bather, an ice cube, a snowflake, steam), a glycogen granule, muscle fibre types in section and the data of
// lactate for formula.mjs. Each part is a function `part(g, { x, y, size, turn, id, w, flip, ...options })` that returns
// { defs, body, parts }, drawn in the frame `g` of `page()` (../cellkit.mjs) and designed in a box of about 100 local
// units, as SiliCoDraw draws them. `size` is the longer extent in g's units, outline included; `turn` turns it about x, y
// (degrees, clockwise); `flip` mirrors it; `w` overrides the main outline in page pixels (`objW` of lab.mjs otherwise);
// every id inside starts with `id`. Shapes from SiliCoDraw (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David
// Carlsson; see ../../LICENSE-SiliCoDraw.txt), its "Food, sport & nutrition" icons (the later drawings that replace the
// first), read by hand as text and drawn again in the soft look of icon-drawings/STYLE.md. The machinery of kinds (frame,
// ctx, draw) is imported from organisms.mjs, so a food, a person or a tub here is drawn with the same tools as an animal
// there. Reused, not redrawn: the hen's egg and the water of organisms.mjs's `scene`, its medaka (a food fish in silver),
// its palettes (leaf greens, wood, rock, hair, shoes); the bust of assays.mjs's `person` (the bather); lab.mjs's materials
// and liquids; anatomy.mjs's muscle red, ivory bone, tendon grey and flame; molecules.mjs's colours of glucose and of a
// protein (glycogen); formula.mjs's builder (lactate); letters.mjs (NaCl, I and II).
//
// ---------- Conventions of food and sport ----------
// Colours of food. Natural and soft, a little fuller than `soft` so that a food is known by its colour when small (`tone`
//   of organisms.mjs, as the animals): apple red (deep 25, as organisms.mjs's tomato) with an olive-brown stalk (80°) and a
//   leaf in organisms.mjs's LEAF (140°); carrot orange (55°) with YOUNG greens; broccoli green (145°) with a pale stalk in
//   the same palette's light tone; bread a golden crust (65°) with a pale crumb as its light tone; the egg cream (80°,
//   organisms.mjs's egg drawn in it); raw meat red-rose (18°) with a cream fat rim (75°) and an ivory bone (anatomy.mjs);
//   avocado a dark green skin (145°), yellow-green flesh (105°) and a brown stone (50°); the fish silver-blue (235°);
//   olives olive-green (130°), olive leaves a grey-green (172°), olive oil gold (92°); sugar and salt white greys
//   (outside the hue check); dietary fibre wheat (75°); coffee brown (55°), milk a white grey (its liquid near white). Foods that meet on a plate
//   are 36° of hue or more apart (Mediterranean: fish 235°, olives 130°, leaves 172°, oil 92°), or greys.
// What is glossed. Closed round foods get the subtle face-on gloss of a closed round body (`gloss` of surfaces.mjs through
//   organisms.mjs's `c.body(…, { gloss: true })`, with setGloss(true)): the apple, the egg, olives, a drop of oil. Every
//   other food is flat in the look of organisms.mjs's plants (from 80 px a two-stop gradient, base at the top left to
//   shadow; no highlight ellipses). Containers, tableware, sport equipment, the stove, bucket, tub and thermometer are
//   objects as lab.mjs's: flat, a gradient and one highlight in their light tone from 80 px, fine lines (ridges, ticks,
//   staves, knurling) only from 60 px; never glossed.
// Materials (lab.mjs): GLASS for glasses, bottles and shakers (water and salt show through), METAL for cutlery, bars, the
//   shaker's cap and the tub, DARK for weight plates and rubber, PAPER for the milk carton with its band in ACCENT, CHINA (a
//   warm white grey) for cups, saucers and plates; the stove a mid grey (STOVE) with stones in ROCK greys and a glowing
//   window in anatomy.mjs's FLAME; wood (bucket, ladle) organisms.mjs's WOOD. Liquids as lab.mjs's: water LIQUIDS.water in
//   its small tone with a meniscus line; ice the water palette's light tone, outlined in its outline tone (as the approved
//   Ice bucket); a snowflake in the water's outline tone; steam a pale grey line; a hot thermometer red (deep 25), a cold
//   one blue (deep 250).
// People. As clinical.mjs's `figure` (the machinery of organisms.mjs, tubes for limbs, SKIN head and hands, SHOE shoes, one
//   INK eye, hair dark brown): seen from the side facing RIGHT (`flip` for left), except the squat, which is seen from the
//   front as SiliCoDraw draws it (no eye then, as organisms.mjs's `human`). Sport kit: a singlet and shorts in ACCENT (or
//   `pal`) with bare arms and shins in SKIN; the far arm and leg in the shadow tones. A swimmer wears a cap (SWIM_CAP, the
//   accent's hue fuller) and is cut by the water line (organisms.mjs's water). The bather in a tub is assays.mjs's bust
//   with bare shoulders and a neck.
// Biology. Glycogen is a branched tree of glucose units in molecules.mjs's glucose colour (deep 165) round a glycogenin
//   core in the protein's amber (rich 75), on a pale disc (the granule). Muscle fibres in section are anatomy.mjs's muscle
//   red: type I (slow, oxidative, "red") in its deeper `small` tone, type II (fast, "white") in its pale base, in a grey
//   perimysium, with flat lilac nuclei at the edge of the fibres.
// Letters only for short marks SiliCoDraw writes (NaCl on the shaker, I and II on fibre types), through letters.mjs;
//   longer labels (kcal, BHB, La⁻) are left to the icons, as letters or parts (formula.mjs's β-hydroxybutyrate, LACTATE).
// Sizes. Outlines `objW(px)` (3.5 up to 100 px, 5 at 200, 8.5 on a full page), inner lines about 0.42 of that, as
//   organisms.mjs. Below 60 px on the page inner lines go (crumbs, marbling, buds, ridges, knurling, ticks, grains); below
//   40 px small appendages (the carrot's side fronds' veins, steam lines thinner). A food reads from about 24 px, a cup or
//   bottle from about 30 px, a person from about 40 px, the glycogen granule and the fibre section from about 50 px.
// Used by: every icon of "Food, sport & nutrition"; see each part for the icons that use it.
import { NUC } from '../cellkit.mjs'
import { deep, rich, toHex } from '../colour.mjs'
import { f, strokeScale } from '../shapes.mjs'
import { ACCENT, DARK, GLASS, INK, LIQUIDS, METAL, PAPER, objW } from './lab.mjs'
import { SKIN, person } from './assays.mjs'
import { HAIR, LEAF, ROCK, SHOE, WOOD, YOUNG, draw, fish, mixHex, rad, rng, scene, smoothPts, tone } from './organisms.mjs'
import { FLAME, IVORY, MUSCLE, TENDON } from './anatomy.mjs'
import { formula, go, skeletal } from './formula.mjs'
import { fits, lettering } from './letters.mjs'

// ---------- palettes ----------
const grey = (h, l) => tone(h, l, 0.006) // a grey in tone's steps (chroma under 0.012: outside the hue check)
export const APPLE = deep(25), STALK = tone(80, 0.56, 0.06), CARROT = tone(55, 0.8, 0.13), CARROT_TOP = YOUNG
export const BROCCOLI = { ...tone(145, 0.64, 0.11), light: toHex({ l: 0.87, c: 0.075, h: 128 }) }
export const BREAD = { ...tone(65, 0.74, 0.1), light: toHex({ l: 0.95, c: 0.04, h: 85 }) }
export const EGG = tone(80, 0.94, 0.04)
export const MEAT = tone(18, 0.72, 0.12), FAT_RIM = tone(75, 0.95, 0.035), BONE = IVORY
export const AVOCADO = tone(145, 0.5, 0.07), FLESH = tone(105, 0.9, 0.1), STONE = tone(50, 0.58, 0.07)
export const FISH = tone(235, 0.84, 0.03)
export const OLIVE = tone(130, 0.6, 0.09), OLIVE_LEAF = tone(172, 0.72, 0.05), OIL = tone(92, 0.86, 0.12)
export const SUGAR = grey(85, 0.985), SALT = grey(250, 0.985)
export const FIBRE = tone(75, 0.84, 0.08)
export const COFFEE = tone(55, 0.5, 0.06), MILK = { ...grey(95, 0.985), small: toHex({ l: 0.965, c: 0.008, h: 95 }) }, CHINA = grey(85, 0.975)
export const SWIM_CAP = deep(267) // the accent's hue, fuller, so that the cap shows on the head
export const STOVE = grey(250, 0.6), STONES = ROCK, STONES_DARK = grey(200, 0.68), STEAM = toHex({ l: 0.82, c: 0.006, h: 250 })
export const HOT = deep(25), COLD = deep(250), WATER = LIQUIDS.water, ICE = LIQUIDS.water
export const GLUCOSE = deep(165) // the palette of molecules.mjs's glucose
export const GLYCOGENIN = rich(75) // molecules.mjs's protein
export const FIBRES = MUSCLE // anatomy.mjs's skeletal muscle: type I its small tone, type II its base
export { ACCENT, DARK, GLASS, METAL, PAPER, SKIN, HAIR, SHOE, WOOD, LEAF, YOUNG }

// ---------- helpers of this module ----------
const ss = () => strokeScale()
/** A stroke `width` local units wide (true width on the page, whatever the stroke scale). */
const trueW = (c, width) => Math.max(0.8, (width * c.F.px) / ss())
/** The highlight of an object from 80 px on: one soft ellipse in its light tone (lab.mjs's convention). */
const shine = (c, u, v, rx, ry, rot, pal) => (c.shaded ? c.fill(c.E(u, v, rx, ry, rot), pal.light) : '')
/** Letters centred on a local point, `h` local units high, drawn only when they are large enough to read. */
const letter = (c, u, v, h, text, colour, sub = 'letter') => {
  const [x, y] = c.F.at([u, v]), H = h * c.F.s
  return fits(c.g, H) ? lettering(c.g, { x, y, h: H, text, colour, id: `${c.id}-${sub}` }).body : ''
}
/** A local point turned about another (degrees, clockwise on the page). */
const rot = ([u, v], [cu, cv], deg) => { const co = Math.cos(rad(deg)), si = Math.sin(rad(deg)); return [cu + (u - cu) * co - (v - cv) * si, cv + (u - cu) * si + (v - cv) * co] }
/** A narrow leaf from its base (u, v) pointing at `deg` (clockwise from the right), `L` long and `W` wide, as a local path. */
const leafD = (c, u, v, deg, L, W) => {
  const p = (a, b) => rot([u + a, v + b], [u, v], deg)
  const q = [p(0, 0), p(L * 0.3, -W / 2), p(L * 0.72, -W / 2), p(L, 0), p(L * 0.72, W / 2), p(L * 0.3, W / 2)]
  const P = (a) => `${f(a[0])},${f(a[1])}`
  return c.M(`M${P(q[0])} C${P(q[1])} ${P(q[2])} ${P(q[3])} C${P(q[4])} ${P(q[5])} ${P(q[0])} Z`)
}
/** Clips a closed local polygon to u ≤ cut. */
const clipLeft = (p, cut) => {
  const out = []
  for (let i = 0; i < p.length; i++) {
    const A = p[i], B = p[(i + 1) % p.length]
    if (A[0] <= cut) out.push(A)
    if ((A[0] <= cut) !== (B[0] <= cut)) { const t = (cut - A[0]) / (B[0] - A[0]); out.push([cut, A[1] + t * (B[1] - A[1])]) }
  }
  return out
}
/** A dashed stroke for ghosts (what is taken away), in page pixels scaled like every outline. */
const dash = (c, k = 1) => ` stroke-dasharray="${f(c.lw * 2.6 * k)} ${f(c.lw * 2 * k)}"`
/** Rising steam: wavy lines from (u, v) upwards, `h` high, one per entry of `us`. */
const steamD = (c, us, v, h) => us.map((u, i) => { const a = h / 2, k = i % 2 ? 1 : -1; return c.M(`M${u},${v} C${u + 5 * k},${v - a * 0.35} ${u - 5 * k},${v - a * 0.65} ${u},${v - a} C${u + 5 * k},${v - a * 1.35} ${u - 5 * k},${v - a * 1.65} ${u},${v - h}`) }).join(' ')
/** A part placed in a kind's local frame: (u, v) and `size` in local units; the part keeps its own id. */
const inside = (c, fn, u, v, size, opts) => { const [x, y] = c.F.at([u, v]); return fn(c.g, { x, y, size: size * c.F.s, flip: c.F.flip, ...opts }) }
const joinParts = (...ps) => ({ defs: ps.map((p) => p.defs ?? '').join(''), body: ps.map((p) => p.body ?? '').join(''), parts: ps.flatMap((p) => p.parts ?? []) })

// =====================================================================================================================
// Foods, `size` the longer side. Kinds: 'apple' (red, glossed, a stalk and a leaf), 'carrot' (upright: tilt it with `turn`,
// SiliCoDraw shows it at 38°), 'broccoli' (a head of florets on a pale stalk), 'bread' (a loaf with a slice in front),
// 'egg' (organisms.mjs's hen's egg in cream), 'steak' (raw meat with its fat rim, marbling and a round bone), 'avocado' (a
// half with its stone), 'fish' (organisms.mjs's medaka in silver, facing left), 'olives' (two, glossed), 'olive sprig' (a
// twig with five grey-green leaves), 'oil' (a drop of olive oil, glossed, the shape of the approved Blood drop), 'sugar'
// (three cubes), 'sugar cube' (one), 'salt' (a little heap with two crystals), 'fibre' (three twisted strands with frayed
// ends: plant fibre). Options: pal (the food's palette), leaf (apple, carrot: the green), stalk (apple), leaves (apple:
// false leaves the leaf off), bone (steak, true), cut (steak: keep only what lies left of this local u, −45 … 45; the rest
// is a dashed ghost on a pale fill with a dashed cut line: a smaller portion), stone (avocado, true), count (olives: 1–3).
// Used by: Apple, Carrot, Broccoli, Bread, Egg, Meat, Sugar, Salt, Dietary fibre, Protein restriction (steak, cut),
//   Ketogenic diet (avocado), Mediterranean diet (fish, olives, olive sprig, oil on a plate), Calories (no: anatomy.mjs's
//   flame), and any icon that shows a diet.
// Example: food(g, { x: 0, y: 0, size: 40, kind: 'steak', cut: 8, bone: false, id: 'steak' })
// =====================================================================================================================
const APPLE_D = 'M0,-26 C-8,-34 -26,-36 -36,-24 C-46,-12 -44,10 -36,26 C-30,38 -20,46 -10,46 C-5,46 -3,44 0,44 C3,44 5,46 10,46 C20,46 30,38 36,26 C44,10 46,-12 36,-24 C26,-36 8,-34 0,-26 Z'
const DROP_D = 'M0,-46 C6,-34 33,-12 33,12 C33,30.2 18.2,45 0,45 C-18.2,45 -33,30.2 -33,12 C-33,-12 -6,-34 0,-46 Z' // the approved Blood drop
const STEAK = [[-44, -6], [-38, -24], [-20, -34], [4, -36], [26, -30], [42, -16], [46, 2], [40, 20], [24, 32], [2, 36], [-18, 32], [-34, 22], [-42, 8]]
/** One sugar cube seen from above at a corner: top rhombus at (u, v), half-width w, half-height h, side s. */
const cube = (c, u, v, w, h, s, pal, seed, sub) => {
  const top = c.L([[u, v - h], [u + w, v], [u, v + h], [u - w, v]]) + 'Z'
  const left = c.L([[u - w, v], [u, v + h], [u, v + h + s], [u - w, v + s]]) + 'Z'
  const right = c.L([[u, v + h], [u + w, v], [u + w, v + s], [u, v + h + s]]) + 'Z'
  let s2 = c.fill(left, pal.base, pal.outline, c.lw) + c.fill(right, pal.shadow, pal.outline, c.lw) + c.fill(top, pal.light, pal.outline, c.lw)
  if (c.big) {
    const R = rng(seed), dots = []
    for (let i = 0; i < 5; i++) { const a = 0.15 + R() * 0.7, b = 0.15 + R() * 0.7; dots.push(c.C(u + (a - b) * w, v + (a + b - 1) * h, 0.9)) }
    for (let i = 0; i < 3; i++) { const a = 0.15 + R() * 0.7, b = 0.15 + R() * 0.7; dots.push(c.C(u - w + a * w, v + a * h + b * s, 0.9)) }
    for (let i = 0; i < 3; i++) { const a = 0.15 + R() * 0.7, b = 0.15 + R() * 0.7; dots.push(c.C(u + a * w, v + h - a * h + b * s, 0.9)) }
    s2 += c.fill(dots.join(' '), pal.small)
  }
  return s2 + c.fill(c.L([[u, v - h], [u + w, v], [u + w, v + s], [u, v + h + s], [u - w, v + s], [u - w, v]]) + 'Z', 'none', pal.outline, c.w)
}
const FOODS = {
  apple: {
    box: [-46, -48, 46, 47],
    draw: (c, { pal = APPLE, leaf = LEAF, stalk = STALK, leaves = true }) => {
      let s = `<g id="${c.id}-stalk">${c.tube([[0, -24], [1, -33], [3, -40], [6, -46]], 3.6, stalk, { w: c.lw })}</g>`
      s += `<g id="${c.id}-fruit">${c.body('fruit', c.M(APPLE_D), pal, { gloss: true })}${c.big ? c.line(c.M('M-5,-25.5 C-2,-23 2,-23 5,-25.5'), pal.outline, c.lw) : ''}</g>`
      if (leaves) s += `<g id="${c.id}-leaf">${c.body('leaf', c.M('M3,-36 C8,-46 20,-48 28,-42 C22,-34 10,-32 3,-36 Z'), leaf, { w: c.lw * 1.3, flat: true })}${c.big ? c.line(c.M('M5,-36 C12,-39 18,-41 25,-42'), leaf.small, c.lw * 0.8) : ''}</g>`
      return { body: s, parts: [['fruit', pal], ['stalk', stalk], ...(leaves ? [['leaf', leaf]] : [])] }
    },
  },
  carrot: {
    box: [-25, -53, 25, 47],
    draw: (c, { pal = CARROT, leaf = CARROT_TOP }) => {
      let s = `<g id="${c.id}-leaves">${c.body('side-fronds', [c.M('M-1,-16 C-14,-24 -24,-34 -24,-45 C-13,-39 -6,-29 -1,-16 Z'), c.M('M1,-16 C14,-24 24,-34 24,-45 C13,-39 6,-29 1,-16 Z')], leaf, { tone: 'shadow', w: c.lw * 1.2 })}`
      s += c.body('front-frond', c.M('M0,-16 C-7,-28 -5,-42 0,-52 C5,-42 7,-28 0,-16 Z'), leaf, { w: c.lw * 1.2 })
      if (c.big) s += c.line(c.M('M0,-18 L0,-46 M-2,-18 C-8,-26 -14,-34 -20,-41 M2,-18 C8,-26 14,-34 20,-41'), leaf.small, c.lw * 0.7)
      s += `</g><g id="${c.id}-root">${c.body('root', c.M('M-13,-14 C-14,-21 14,-21 13,-14 C11,6 5,28 1,45 C0.5,47 -0.5,47 -1,45 C-5,28 -11,6 -13,-14 Z'), pal)}`
      if (c.big) s += c.line(c.M('M-12,-4 L-6,-2.5 M12,2 L6,3.5 M-10,12 L-5,13.5 M9,18 L4,19.5 M-6,27 L-2.5,28 M5,33 L2,34'), pal.small, c.lw) + c.line(c.M('M-8,-10 C-7,4 -5,18 -2,30'), pal.light, c.lw * 1.4)
      return { body: s + '</g>', parts: [['root', pal], ['leaves', leaf]] }
    },
  },
  broccoli: {
    box: [-43, -47, 43, 48],
    draw: (c, { pal = BROCCOLI }) => {
      const C = [[0, -22, 18], [-20, -14, 15], [20, -14, 15], [-30, 2, 12], [30, 2, 12], [-12, -34, 12], [12, -34, 12], [0, -2, 14], [-15, 6, 11], [15, 6, 11]]
      let s = `<g id="${c.id}-stalk">${c.body('stalk', c.M('M-9,46 C-10,34 -10,24 -16,12 L-7,8 C-4,16 -2,18 0,18 C2,18 4,16 7,8 L16,12 C10,24 10,34 9,46 C4,48 -4,48 -9,46 Z'), pal, { tone: 'light', w: c.w * 0.9 })}`
      if (c.big) s += c.line(c.M('M-3,26 L-3,44 M3,28 L3,44'), pal.shadow, c.lw)
      s += `</g><g id="${c.id}-florets">${c.body('florets', C.map(([u, v, r]) => c.C(u, v, r)), pal)}`
      if (c.big) {
        s += c.line(c.M('M-24,-4 C-18,-10 -10,-10 -6,-6 M6,-6 C10,-10 18,-10 24,-4 M-12,-22 C-6,-28 6,-28 12,-22 M-38,0 C-34,-6 -28,-6 -24,-4 M24,-4 C28,-6 34,-6 38,0'), pal.small, c.lw)
        const R = rng(71), buds = []
        for (let i = 0; i < 30; i++) { const q = C[i % C.length], t = R() * 6.283, d = R() * q[2] * 0.65; buds.push(c.C(q[0] + d * Math.cos(t), q[1] + d * Math.sin(t), 1.5)) }
        s += c.fill(buds.join(' '), pal.shadow) + c.fill([[-14, -36], [8, -38], [-4, -26], [16, -20], [-24, -18], [-32, -2], [26, -4], [-2, -6]].map(([u, v]) => c.C(u, v, 2)).join(' '), pal.light)
      }
      return { body: s + '</g>', parts: [['broccoli', pal]] }
    },
  },
  bread: {
    box: [-49, -31, 47, 45],
    draw: (c, { pal = BREAD }) => {
      let s = `<g id="${c.id}-loaf">${c.body('loaf', c.M('M-16,30 L-16,-6 C-16,-22 -2,-30 15,-30 C32,-30 46,-22 46,-6 L46,30 Z'), pal)}`
      if (c.big) s += c.line(c.M('M8,-23 C13,-26 18,-26 22,-24 M24,-23 C29,-26 34,-25 37,-23'), pal.light, c.lw * 1.4)
      s += `</g><g id="${c.id}-slice">${c.body('crust', c.M('M-42,44 L-42,2 C-50,-4 -48,-22 -32,-22 C-24,-26 -8,-26 0,-22 C16,-22 18,-4 10,2 L10,44 Z'), pal, { tone: 'shadow' })}`
      s += c.fill(c.M('M-37,40 L-37,0 C-44,-5 -42,-17 -31,-17 C-24,-21 -8,-21 -1,-17 C10,-17 12,-5 5,0 L5,40 Z'), pal.light)
      if (c.big) { const R = rng(7), h = []; for (let i = 0; i < 9; i++) h.push(c.E(-30 + R() * 30, -8 + R() * 42, 1.1 + R() * 1.3, 0.9 + R(), 0)); s += c.fill(h.join(' '), mixHex(pal.light, pal.base, 0.45)) }
      return { body: s + '</g>', parts: [['bread', pal]] }
    },
  },
  egg: {
    box: [-38, -46, 38, 46],
    draw: (c, { pal = EGG }) => inside(c, scene, 0, 0, 92, { kind: 'egg', pal, id: `${c.id}-egg` }),
  },
  steak: {
    box: [-47, -37, 47, 37],
    draw: (c, { pal = MEAT, fat = FAT_RIM, bone = true, cut }) => {
      const O = smoothPts(STEAK, 10), I = smoothPts(STEAK.map(([u, v]) => [u * 0.84, v * 0.8 + 3]), 10)
      const poly = (p) => c.L(p) + 'Z'
      let s = ''
      if (cut != null) s += `<g id="${c.id}-ghost">${c.fill(poly(O), pal.light)}${c.line(poly(O), pal.small, c.lw * 1.2, dash(c))}</g>`
      const out = cut != null ? clipLeft(O, cut) : O, inn = cut != null ? clipLeft(I, cut) : I
      s += `<g id="${c.id}-fat">${c.body('fat', poly(out), fat, { flat: true })}</g><g id="${c.id}-meat">${c.body('meat', poly(inn), pal, { w: c.lw * 1.3 })}`
      if (c.big) s += c.line(c.M('M-30,-6 C-24,-10 -18,-4 -12,-8 M-18,16 C-12,12 -6,18 0,14 M14,-20 C20,-24 24,-18 30,-20 M-6,-18 C-2,-14 4,-16 6,-12'), fat.base, c.lw * 1.3)
      s += '</g>'
      if (bone && (cut == null || cut > 24)) s += `<g id="${c.id}-bone">${c.fill(c.C(14, 6, 8.5), BONE.base, BONE.outline, c.lw * 1.2)}${c.fill(c.C(14, 6, 3.6), mixHex(pal.base, pal.light, 0.35))}</g>`
      if (cut != null) s += c.line(c.L([[cut, -34], [cut, 34]]), pal.outline, c.lw, dash(c, 0.8))
      return { body: s, parts: [['meat', pal], ['fat', fat]] }
    },
  },
  avocado: {
    box: [-31, -45, 31, 45],
    draw: (c, { pal = AVOCADO, flesh = FLESH, stone = true, stonePal = STONE }) => {
      const half = (k) => c.M('M0,-44 C10,-44 16,-36 18,-24 C20,-12 30,-4 30,14 C30,32 16,44 0,44 C-16,44 -30,32 -30,14 C-30,-4 -20,-12 -18,-24 C-16,-36 -10,-44 0,-44 Z'.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, u, v) => `${f(+u * k)},${f(14 + (+v - 14) * k)}`))
      let s = `<g id="${c.id}-skin">${c.body('skin', half(1), pal)}</g><g id="${c.id}-flesh">${c.body('flesh', half(0.87), flesh, { w: c.lw })}${c.fill(half(0.72), flesh.light)}</g>`
      if (stone) s += `<g id="${c.id}-stone">${c.body('stone', c.C(0, 18, 12.5), stonePal, { w: c.lw * 1.3, gloss: true })}</g>`
      return { body: s, parts: [['skin', pal], ['flesh', flesh], ...(stone ? [['stone', stonePal]] : [])] }
    },
  },
  fish: {
    box: [-49, -18, 50, 20],
    draw: (c, { pal = FISH }) => inside(c, fish, 0.5, 1, 99, { kind: 'medaka', body: pal, id: `${c.id}-fish` }),
  },
  olives: {
    box: [-30, -18, 30, 18],
    draw: (c, { pal = OLIVE, count = 2 }) => {
      const at = [[-12, -2, -25], [12, 3, 15], [0, -6, 70]].slice(0, Math.max(1, Math.min(3, count)))
      const s = at.map(([u, v, r], i) => c.body(`olive-${i + 1}`, c.E(u, v, 13, 9.5, r), pal, { gloss: true })).join('')
      return { body: `<g id="${c.id}-olives">${s}</g>`, parts: [['olives', pal]] }
    },
  },
  'olive sprig': {
    box: [-36, -26, 36, 26],
    draw: (c, { pal = OLIVE_LEAF }) => {
      let s = `<g id="${c.id}-sprig">${c.tube([[-34, 14], [-14, 6], [6, -2], [32, -14]], 2.2, pal, { tone: 'shadow', w: c.lw })}`
      const L = [[-22, 9, 205, 22, 7], [-12, 5, 140, 22, 7], [-2, 1, 210, 22, 7], [8, -3, 135, 21, 6.5], [20, -9, 200, 18, 6]].map(([u, v, d, l, w]) => leafD(c, u, v, d + 180, l, w))
      s += c.body('leaves', L, pal, { w: c.lw * 1.2 }) + c.body('tip', leafD(c, 31, -14, -25, 16, 5.5), pal, { w: c.lw * 1.2 })
      return { body: s + '</g>', parts: [['leaves', pal]] }
    },
  },
  oil: {
    box: [-34, -47, 34, 46],
    draw: (c, { pal = OIL }) => ({ body: `<g id="${c.id}-drop">${c.body('drop', c.M(DROP_D), pal, { gloss: true })}</g>`, parts: [['oil', pal]] }),
  },
  sugar: {
    box: [-38, -48, 38, 48],
    draw: (c, { pal = SUGAR }) => {
      const w = 25, h = 14.4, s = 26
      return { body: `<g id="${c.id}-cubes">${cube(c, -w / 2, -h / 2, w, h, s, pal, 17)}${cube(c, w / 2, h / 2, w, h, s, pal, 18)}${cube(c, -w / 2, -h / 2 - s, w, h, s, pal, 19)}</g>`, parts: [['sugar', pal]] }
    },
  },
  'sugar cube': {
    box: [-26, -28, 26, 28],
    draw: (c, { pal = SUGAR }) => ({ body: `<g id="${c.id}-cube">${cube(c, 0, -12, 25, 14.4, 26, pal, 17)}</g>`, parts: [['sugar', pal]] }),
  },
  salt: {
    box: [-26, -14, 26, 14],
    draw: (c, { pal = SALT }) => {
      let s = `<g id="${c.id}-salt">${c.body('heap', c.M('M-24,12 C-18,0 -8,-6 0,-6 C8,-6 18,0 24,12 Z'), pal, { w: c.lw * 1.2 })}`
      s += [[-6, -5.5, 20], [7, -6, -15]].map(([u, v, r]) => { const q = [[-3, -3], [3, -3], [3, 3], [-3, 3]].map((p) => rot([u + p[0], v + p[1]], [u, v], r)); return c.fill(c.L(q) + 'Z', pal.light, pal.outline, c.lw) }).join('')
      if (c.big) s += c.fill([[-8, 6], [-2, 2], [5, 7], [11, 4], [0, 9]].map(([u, v]) => c.C(u, v, 0.9)).join(' '), pal.small)
      return { body: s + '</g>', parts: [['salt', pal]] }
    },
  },
  fibre: {
    box: [-17, -46, 17, 46],
    draw: (c, { pal = FIBRE }) => {
      const k = (Math.PI * 2) / 56, st = (ph) => Array.from({ length: 39 }, (_, i) => { const v = -38 + i * 2; return [11 * Math.sin(v * k + ph), v] })
      const tones = ['shadow', 'base', 'light']
      let s = `<g id="${c.id}-fibre">`
      ;[0, 2.1, 4.2].forEach((ph, i) => {
        const p = st(ph), [a, b] = [p[0], p[p.length - 1]]
        if (c.big) s += c.tube(c.L([[a[0] - 3, a[1] - 7], a, [a[0] + 3, a[1] - 7]]) + ' ' + c.L([[b[0] - 3, b[1] + 7], b, [b[0] + 3, b[1] + 7]]), 1.2, pal, { tone: tones[i], w: c.lw * 0.8 })
        s += c.tube(p, 5.5, pal, { tone: tones[i], w: c.lw * 1.1 })
      })
      return { body: s + '</g>', parts: [['fibre', pal]] }
    },
  },
}
export function food(g, opts) { return draw(FOODS, 'food', g, { kind: 'apple', ...opts }) }

// =====================================================================================================================
// Containers and drinks, `size` the longer side. Kinds: 'cup' (a cup of coffee on its saucer, the handle at the right,
// steam rising), 'glass' (a tumbler of water or milk), 'carton' (a milk carton with a gable top, its band in ACCENT with a
// white drop), 'bottle' (a sports water bottle: clear body, grip waist, ACCENT cap, water inside), 'shaker' (a salt
// shaker: clear body full of salt, metal cap with holes, a paper label lettered NaCl). Options: drink (cup: COFFEE, or any
// palette), saucer (cup, true), steam (cup, true), liquid (glass: WATER, MILK or any palette), level (glass, bottle: the
// share filled, 0.65 and 0.45), pal (carton band, bottle cap: ACCENT), label (shaker: 'NaCl', false for none).
// Used by: Coffee, Milk, Water bottle, Salt, hydration and caffeine icons.
// Example: container(g, { x: 0, y: 0, size: 40, kind: 'cup', steam: false, id: 'coffee' })
// =====================================================================================================================
const CONTAINERS = {
  cup: {
    box: [-44, -42, 45, 46],
    draw: (c, { drink = COFFEE, saucer = true, steam = true, pal = CHINA }) => {
      let s = ''
      if (steam) s += `<g id="${c.id}-steam">${c.line(steamD(c, [-18, -6, 6], -22, 18), STEAM, trueW(c, c.big ? 2.6 : 3.4))}</g>`
      if (saucer) s += `<g id="${c.id}-saucer">${c.body('saucer', c.E(-4, 37, 40, 8), pal, { tone: 'shadow' })}${c.fill(c.E(-4, 35.5, 24, 4), pal.small)}</g>`
      s += `<g id="${c.id}-cup">${c.tube(c.M('M21,-6 C36,-9 41,4 35,12 C31,18 25,19 20,18'), 5, pal, { w: c.lw * 1.4 })}`
      s += c.body('cup', c.M('M-34,-14 L22,-14 C22,8 18,30 -6,33 C-30,30 -34,8 -34,-14 Z'), pal) + shine(c, -27, 8, 2.6, 10, -12, pal)
      s += c.fill(c.E(-6, -14, 28, 6), pal.shadow, pal.outline, c.lw * 1.4) + '</g>'
      s += `<g id="${c.id}-drink">${c.fill(c.E(-6, -13.4, 24, 4.2), drink.base)}${c.big ? c.fill(c.E(-10, -14, 9, 1.8), drink.light) : ''}</g>`
      return { body: s, parts: [['cup', pal], ['drink', drink]] }
    },
  },
  glass: {
    box: [-22, -42, 22, 47],
    draw: (c, { liquid = WATER, level = 0.65, pal = GLASS }) => {
      const top = -38, bot = 44, lv = bot - 2 - (bot - 2 - top) * level, x = (v) => 20 - (4 * (v - top)) / (bot - top)
      let s = `<g id="${c.id}-glass">${c.body('glass', c.M('M-20,-38 L20,-38 L16,40 C15.8,43 14,45 11,45 L-11,45 C-14,45 -15.8,43 -16,40 Z'), pal)}</g>`
      s += `<g id="${c.id}-liquid">${c.fill(c.M(`M${f(-x(lv) + 1.6)},${f(lv)} L${f(x(lv) - 1.6)},${f(lv)} L14.4,40 C14.3,42 13,43.4 11,43.4 L-11,43.4 C-13,43.4 -14.3,42 -14.4,40 Z`), liquid.small)}${c.line(c.L([[-x(lv) + 1.6, lv], [x(lv) - 1.6, lv]]), liquid.outline, c.lw)}</g>`
      s += `<g id="${c.id}-rim">${c.fill(c.M('M-20,-38 L20,-38 L16,40 C15.8,43 14,45 11,45 L-11,45 C-14,45 -15.8,43 -16,40 Z'), 'none', pal.outline, c.w)}${c.shaded ? c.line(c.L([[-13, -30], [-10.5, 30]]), '#FFFFFF', c.lw * 2) : ''}</g>`
      return { body: s, parts: [['liquid', liquid]] }
    },
  },
  carton: {
    box: [-28, -45, 28, 45],
    draw: (c, { pal = ACCENT, paper = PAPER }) => {
      let s = `<g id="${c.id}-carton">${c.body('side', c.M('M9,-8 L27,-16 L27,36 L9,44 Z'), paper, { tone: 'shadow' })}${c.body('front', c.M('M-27,-8 L9,-8 L9,44 L-27,44 Z'), paper)}`
      s += c.body('roof', c.M('M-27,-8 L-18,-36 L18,-36 L9,-8 Z'), paper, { tone: 'shadow', flat: true }) + c.body('roof-side', c.M('M9,-8 L27,-16 L18,-36 Z'), paper, { tone: 'small', flat: true })
      s += c.body('fin', c.M('M-18,-36 L-18,-44 L18,-44 L18,-36 Z'), paper, { tone: 'shadow', flat: true, w: c.lw * 1.4 }) + '</g>'
      s += `<g id="${c.id}-band">${c.fill(c.R(-23, 6, 28, 26, 3), pal.base, pal.outline, c.lw)}${c.fill(c.M('M9,6 L27,-2 L27,22 L9,30 Z'), pal.shadow, pal.outline, c.lw)}`
      s += c.fill(c.M('M-9,10 C-6,14 -2,18 -2,22 C-2,26 -5.2,29 -9,29 C-12.8,29 -16,26 -16,22 C-16,18 -12,14 -9,10 Z'), MILK.light, pal.outline, c.lw * 0.8) + '</g>'
      s += `<g id="${c.id}-cap">${c.body('cap', c.M('M-5,-25 C-5,-23 4,-23 4,-25 L4,-29 C4,-31 -5,-31 -5,-29 Z'), pal, { w: c.lw })}</g>`
      return { body: s, parts: [['band', pal]] }
    },
  },
  bottle: {
    box: [-21, -48, 21, 47],
    draw: (c, { pal = ACCENT, liquid = WATER, level = 0.45, material = GLASS }) => {
      const body = 'M-9,-36 L9,-36 L9,-31 C9,-26 20,-23 20,-12 L20,-4 C20,-1 17,1 17,4 C17,7 20,9 20,12 L20,38 C20,44 16,46 10,46 L-10,46 C-16,46 -20,44 -20,38 L-20,12 C-20,9 -17,7 -17,4 C-17,1 -20,-1 -20,-4 L-20,-12 C-20,-23 -9,-26 -9,-31 Z'
      const lv = 44 - 54 * level
      let s = `<g id="${c.id}-bottle">${c.body('bottle', c.M(body), material)}</g>`
      s += `<g id="${c.id}-water">${c.fill(c.M(`M-19,${lv} C-13,${lv - 4} -7,${lv + 2} 0,${lv - 1} C6,${lv - 4} 12,${lv - 4} 19,${lv - 1} L19,38 C19,43 15.5,45 10,45 L-10,45 C-15.5,45 -19,43 -19,38 Z`), liquid.small)}${c.line(c.M(`M-19,${lv} C-13,${lv - 4} -7,${lv + 2} 0,${lv - 1} C6,${lv - 4} 12,${lv - 4} 19,${lv - 1}`), liquid.outline, c.lw)}`
      if (c.big) s += c.fill([[-8, lv + 13, 1.8], [6, lv + 19, 1.4], [10, lv + 7, 1.1], [-3, lv + 23, 1.2]].map(([u, v, r]) => c.C(u, v, r)).join(' '), liquid.light)
      s += '</g>' + `<g id="${c.id}-grip">${c.big ? c.line(c.M('M-17,1 C-6,3 6,3 17,1 M-17,7 C-6,9 6,9 17,7'), material.small, c.lw) : ''}${c.fill(c.M(body), 'none', material.outline, c.w)}${c.shaded ? c.line(c.M('M-14,-15 L-14,-6 M-14,17 L-14,36'), '#FFFFFF', c.lw * 2) : ''}</g>`
      s += `<g id="${c.id}-cap">${c.body('ring', c.R(-12, -38, 24, 4, 1.5), pal, { tone: 'light', w: c.lw })}${c.body('cap', c.R(-11, -47, 22, 10, 3), pal, { w: c.lw * 1.2 })}`
      if (c.big) s += c.line(c.M('M-6,-44.5 L-6,-39.5 M-2,-44.5 L-2,-39.5 M2,-44.5 L2,-39.5 M6,-44.5 L6,-39.5'), pal.small, c.lw * 0.8)
      return { body: s + '</g>', parts: [['cap', pal], ['water', liquid]] }
    },
  },
  shaker: {
    box: [-25, -47, 25, 47],
    draw: (c, { salt = SALT, label = 'NaCl', material = GLASS }) => {
      const body = 'M-17,-24 L17,-24 C19,-10 24,18 24,34 C24,42 20,46 12,46 L-12,46 C-20,46 -24,42 -24,34 C-24,18 -19,-10 -17,-24 Z'
      let s = `<g id="${c.id}-shaker">${c.body('body', c.M(body), material)}</g>`
      s += `<g id="${c.id}-salt">${c.fill(c.M('M-22.6,14 C-12,11 12,11 22.6,14 C23.2,22 23.5,30 23.5,34 C23.5,41.5 19.5,45 12,45 L-12,45 C-19.5,45 -23.5,41.5 -23.5,34 C-23.5,30 -23.2,22 -22.6,14 Z'), salt.base)}${c.line(c.M('M-22.4,14 C-12,11 12,11 22.4,14'), salt.outline, c.lw)}`
      if (c.big) { const R = rng(72), d = []; for (let i = 0; i < 14; i++) d.push(c.C(-17 + R() * 34, 19 + R() * 22, 0.9)); s += c.fill(d.join(' '), salt.small) }
      s += '</g>' + `<g id="${c.id}-glass">${c.fill(c.M(body), 'none', material.outline, c.w)}${c.shaded ? c.line(c.M('M-15,-16 C-17,0 -19,16 -20,30'), '#FFFFFF', c.lw * 2) : ''}</g>`
      if (label) s += `<g id="${c.id}-label">${c.fill(c.R(-14, -12, 28, 14, 3), PAPER.light, PAPER.outline, c.lw)}${letter(c, 0, -5, 6.5, label, INK)}</g>`
      s += `<g id="${c.id}-cap">${c.body('cap', c.M('M-17,-29 L-17,-36 C-17,-43 -10,-46 0,-46 C10,-46 17,-43 17,-36 L17,-29 Z'), METAL)}`
      if (c.F.ext >= 40) s += c.fill([[-8, -38], [0, -39], [8, -38], [-4, -33], [4, -33]].map(([u, v]) => c.C(u, v, 1.6)).join(' '), DARK.base)
      s += c.body('band', c.R(-19, -30, 38, 7, 2.5), METAL, { tone: 'shadow', w: c.lw * 1.2 }) + '</g>'
      return { body: s, parts: [] }
    },
  },
}
export function container(g, opts) { return draw(CONTAINERS, 'container', g, { kind: 'cup', ...opts }) }

// =====================================================================================================================
// Tableware, `size` the longer side. Kinds: 'plate' (a plate seen from above: rim and well in CHINA; `foods` lays foods on
// it), 'fork', 'knife' (upright, METAL, tines and blade up), 'cutlery' (fork at the left, knife at the right: a meal).
// Options: foods (plate: [[kind, u, v, size, turn, options], …] in the plate's local units, −48 … 48, drawn by `food`),
// pal (the china or the metal).
// Used by: Meal (cutlery), Mediterranean diet (plate with fish, olives and a sprig), diet and fasting icons.
// Example: tableware(g, { x: 0, y: 0, size: 60, kind: 'plate', foods: [['fish', 0, -10, 50, 0], ['olives', -14, 16, 24, 0]], id: 'plate' })
// =====================================================================================================================
const forkD = (c, u) => {
  let s = c.tube([-10, -3.3, 3.3, 10].map((d) => c.L([[u + d, -46], [u + d, -28]])).join(' '), 2.8, METAL, { w: c.lw })
  return s + c.body('fork', [c.M(`M${u - 12},-29 L${u + 12},-29 C${u + 12},-17 ${u + 8},-13 ${u + 3},-11 L${u - 3},-11 C${u - 8},-13 ${u - 12},-17 ${u - 12},-29 Z`), c.M(`M${u - 3.5},-12 C${u - 3.5},4 ${u - 5.5},14 ${u - 5.5},38 C${u - 5.5},45 ${u + 5.5},45 ${u + 5.5},38 C${u + 5.5},14 ${u + 3.5},4 ${u + 3.5},-12 Z`)], METAL)
}
const knifeD = (c, u) => {
  let s = c.body('blade', c.M(`M${u - 7},-46 C${u + 3},-42 ${u + 9},-26 ${u + 8},-8 C${u + 8},-4 ${u + 6},-2 ${u + 3},-2 L${u - 7},-2 Z`), METAL)
  if (c.big) s += c.line(c.M(`M${u - 2.5},-39 C${u + 2.5},-33 ${u + 4.5},-21 ${u + 3.5},-7`), METAL.light, c.lw * 1.6)
  s += c.body('handle', c.M(`M${u - 8},4 L${u + 6},4 C${u + 6},16 ${u + 7},30 ${u + 7},38 C${u + 7},45 ${u - 9},45 ${u - 9},38 C${u - 9},30 ${u - 8},16 ${u - 8},4 Z`), METAL)
  s += c.body('bolster', c.R(u - 9.5, -4, 17, 8, 2.5), METAL, { tone: 'shadow', w: c.lw * 1.3 })
  if (c.big) s += c.fill([14, 25, 36].map((v) => c.C(u - 1, v, 1.8)).join(' '), METAL.small)
  return s
}
const TABLEWARE = {
  plate: {
    box: [-48, -48, 48, 48],
    draw: (c, { pal = CHINA, foods = [] }) => {
      let s = `<g id="${c.id}-plate">${c.body('rim', c.C(0, 0, 46), pal)}${c.fill(c.C(0, 0, 35), pal.light, pal.small, c.lw)}</g>`
      const P = foods.map(([kind, u, v, size, turn = 0, o = {}], i) => inside(c, food, u, v, size, { kind, turn, id: `${c.id}-${kind.replace(/[^\w]+/g, '-')}-${i + 1}`, ...o }))
      const J = joinParts(...P)
      return { defs: J.defs, body: s + J.body, parts: [...J.parts] }
    },
  },
  fork: { box: [-13, -47, 13, 46], draw: (c) => ({ body: `<g id="${c.id}-fork">${forkD(c, 0)}</g>`, parts: [] }) },
  knife: { box: [-11, -47, 9, 46], draw: (c) => ({ body: `<g id="${c.id}-knife">${knifeD(c, 0)}</g>`, parts: [] }) },
  cutlery: { box: [-30, -47, 28, 46], draw: (c) => ({ body: `<g id="${c.id}-fork">${forkD(c, -17)}</g><g id="${c.id}-knife">${knifeD(c, 19)}</g>`, parts: [] }) },
}
export function tableware(g, opts) { return draw(TABLEWARE, 'tableware', g, { kind: 'plate', ...opts }) }

// =====================================================================================================================
// Sport equipment, lying level, `size` its length. Kinds: 'dumbbell' (a short knurled bar with two plates a side and
// collars), 'barbell' (a long bar with a large and a smaller plate at each end, as on a squat rack). Options: pal (the
// plates, DARK rubber; any palette for coloured bumper plates).
// Used by: Dumbbell, Resistance training (squat, with `athlete`), strength and muscle icons.
// Example: equipment(g, { x: 0, y: 0, size: 50, kind: 'dumbbell', id: 'dumbbell' })
// =====================================================================================================================
const plateD = (c, u, v, wd, ht, pal, sub) => c.body(sub, c.R(u, v, wd, ht, Math.min(3, wd / 2.5)), pal, { flat: true, w: c.lw * 1.3 }) + (c.big ? c.line(c.L([[u + wd * 0.3, v + 4], [u + wd * 0.3, v + ht - 4]]), pal.light, c.lw) : '')
const EQUIPMENT = {
  dumbbell: {
    box: [-47, -27, 47, 27],
    draw: (c, { pal = DARK }) => {
      let s = `<g id="${c.id}-bar">${c.body('bar', c.R(-46, -3.5, 92, 7, 3.5), METAL, { w: c.lw * 1.3 })}`
      if (c.big) s += c.line(Array.from({ length: 9 }, (_, i) => c.L([[-13 + i * 3.25, -2.6], [-11 + i * 3.25, 2.6]])).join(' '), METAL.small, c.lw * 0.6)
      s += '</g>' + `<g id="${c.id}-plates">${plateD(c, -32, -26, 11, 52, pal, 'plate-1')}${plateD(c, 21, -26, 11, 52, pal, 'plate-2')}${plateD(c, -41, -18, 8, 36, pal, 'plate-3')}${plateD(c, 33, -18, 8, 36, pal, 'plate-4')}</g>`
      s += `<g id="${c.id}-collars">${c.body('collars', [c.R(-21, -7, 5, 14, 1.5), c.R(16, -7, 5, 14, 1.5)], METAL, { tone: 'shadow', w: c.lw * 1.2 })}</g>`
      return { body: s, parts: [['plates', pal]] }
    },
  },
  barbell: {
    box: [-50, -31, 50, 31],
    draw: (c, { pal = DARK, load = 1 }) => {
      const k = Math.max(0.4, Math.min(1, load))
      let s = `<g id="${c.id}-bar">${c.body('bar', c.R(-49, -2.2, 98, 4.4, 2.2), METAL, { w: c.lw * 1.2 })}${c.body('sleeves', [c.R(-49, -3.4, 18, 6.8, 2), c.R(31, -3.4, 18, 6.8, 2)], METAL, { tone: 'shadow', w: c.lw * 1.2 })}</g>`
      s += `<g id="${c.id}-plates">${plateD(c, -43, -30 * k, 8, 60 * k, pal, 'plate-1')}${plateD(c, 35, -30 * k, 8, 60 * k, pal, 'plate-2')}${plateD(c, -49, -22 * k, 6, 44 * k, pal, 'plate-3')}${plateD(c, 43, -22 * k, 6, 44 * k, pal, 'plate-4')}</g>`
      s += `<g id="${c.id}-collars">${c.body('collars', [c.R(-35, -5, 4, 10, 1.2), c.R(31, -5, 4, 10, 1.2)], METAL, { w: c.lw })}</g>`
      return { body: s, parts: [['plates', pal]] }
    },
  },
}
export function equipment(g, opts) { return draw(EQUIPMENT, 'equipment', g, { kind: 'dumbbell', ...opts }) }

// =====================================================================================================================
// A person in a sport pose, in sport kit, `size` the longer side of the pose's box. Poses: 'run' (seen from the side, mid
// stride, leaning forward, arms bent and swinging, three speed lines behind: `motion`), 'swim' (front crawl seen from the
// side: the back, the capped head and the recovering arm above organisms.mjs's water, the rest under it), 'squat' (seen
// from the front, thighs level, a barbell across the shoulders: `bar`). Options: pal (singlet and shorts, ACCENT), skin
// (SKIN), hair (a palette, false for none; dark brown), cap (swim: the swimming cap, SWIM_CAP), motion (run, true), bar
// (squat: true, or the options of `equipment` 'barbell', e.g. { pal: … }; load 0.6), water (swim, true). Facing right (`flip` for
// left), as clinical.mjs's people; one INK eye on side views.
// Used by: Runner, Swimming, Resistance training (squat); exercise, training and rehabilitation icons.
// Example: athlete(g, { x: 0, y: 0, size: 60, pose: 'run', id: 'runner' })
// =====================================================================================================================
// Joints in local units of a person about 96 tall: head [u, v, tilt], torso (neck to hip), arms and legs [shoulder or hip,
// elbow or knee, hand or ankle], foot (the shoe's turn, degrees clockwise).
const SIDE = {
  run: { box: [-49, -49, 32, 41], head: [12, -38, 10], torso: [[8.5, -27.5], [4.5, -12], [0, 4]], near: { arm: [[7.5, -24], [-2, -12.5], [-12, -20.5]], leg: [[0, 4], [15, 15.5], [12, 34]], foot: 8 }, far: { arm: [[7, -24], [16.5, -12], [26.5, -20]], leg: [[-1, 4], [-7, 22], [-24, 29.5]], foot: 100 } },
  swim: { box: [-48, -19, 48, 20], head: [24, 1, 75], torso: [[15, 3], [3, 4], [-10, 5]], near: { arm: [[14, -1], [22, -15], [40, -6]], leg: [[-10, 6], [-27, 10], [-43, 12]], foot: 180 }, far: { arm: [[14, 3], [28, 9], [42, 10]], leg: [[-10, 7], [-27, 12], [-42, 15]], foot: 180 } },
}
const HAIR_SIDE = [[-0.98, -0.2], [-0.95, -0.9], [-0.5, -1.1], [0.05, -1.12], [0.55, -1.0], [0.86, -0.62], [0.45, -0.74], [0, -0.68], [-0.38, -0.28], [-0.55, 0.05], [-0.8, 0.26], [-0.99, 0.05]]
const CAP_SIDE = [[-1.08, 0.15], [-1.06, -0.6], [-0.62, -1.1], [0, -1.16], [0.62, -1.03], [0.98, -0.5], [0.72, -0.36], [0.2, -0.44], [-0.28, -0.18], [-0.56, 0.3]]
/** A leg in skin with shorts over its first `share` (from the hip), drawn before the torso so that the torso covers the hip. */
const shortsLeg = (c, pts, width, kit, skin, tone, share) => {
  const [a, b] = pts, m = [a[0] + (b[0] - a[0]) * share, a[1] + (b[1] - a[1]) * share]
  return c.tube(pts, width, skin, { straight: true, tone, w: c.w * 0.75 }) + c.tube([a, m], width + 1.2, kit, { straight: true, tone, w: c.w * 0.75 })
}
/** Short hair seen from the front, on a head of radius r at (u, v). */
const HAIR_FRONT = [[-0.99, -0.06], [-1.05, -0.76], [-0.58, -1.07], [0, -1.07], [0.58, -1.07], [1.05, -0.76], [0.99, -0.06], [0.7, -0.41], [0.35, -0.52], [0, -0.52], [-0.35, -0.52], [-0.7, -0.41], [-0.99, -0.06]]
const hairFront = (c, u, v, r, hair) => {
  const P = HAIR_FRONT.map(([a, b]) => `${u + a * r},${v + b * r}`)
  return c.body('hair', c.M(`M${P[0]} C${P[1]} ${P[2]} ${P[3]} C${P[4]} ${P[5]} ${P[6]} C${P[7]} ${P[8]} ${P[9]} C${P[10]} ${P[11]} ${P[12]} Z`), hair, { w: c.lw, flat: true })
}
const sideFigure = (P, pose) => ({
  box: P.box,
  draw: (c, { pal = ACCENT, skin = SKIN, hair = HAIR.dark, cap = SWIM_CAP, motion = true, water = true }) => {
    const shoe = ([u, v], deg, tn) => c.fill(c.E(...rot([u + 4, v + 2.4], [u, v], deg), 6.4, 3.1, deg), tn === 'shadow' ? SHOE.shadow : SHOE.base, SHOE.outline, c.lw * 1.2)
    const hand = ([u, v], tn) => c.fill(c.C(u, v, 3.3), skin[tn], skin.outline, c.lw * 1.2)
    const swim = pose === 'swim', tLeg = 9.5, tArm = 6.8, tBody = swim ? 15 : 19
    const arm = (A, tn) => c.tube(A, tArm, skin, { straight: true, tone: tn, w: c.w * 0.75 }) + hand(A[2], tn)
    const leg = (L, tn) => (swim ? c.tube(L, tLeg, skin, { straight: true, tone: tn, w: c.w * 0.75 }) : shortsLeg(c, L, tLeg, pal, skin, tn, 0.5))
    let s = '', defs = ''
    if (pose === 'run' && motion) s += `<g id="${c.id}-motion">${c.line(c.M('M-48,-12 L-38,-12 M-46,0 L-32,0 M-48,12 L-40,12'), STEAM, trueW(c, 2.6))}</g>`
    s += `<g id="${c.id}-far">${leg(P.far.leg, 'shadow')}${swim ? '' : shoe(P.far.leg[2], P.far.foot, 'shadow')}${arm(P.far.arm, 'shadow')}</g>`
    s += `<g id="${c.id}-near-leg">${leg(P.near.leg, 'base')}${swim ? '' : shoe(P.near.leg[2], P.near.foot, 'base')}</g>`
    s += `<g id="${c.id}-body">${c.tube(P.torso, tBody, swim ? skin : pal, { w: c.w * 0.85 })}${c.big && !swim ? c.line(P.torso.map(([u, v]) => [u + 4.5, v]).slice(0, 2), pal.light, c.lw * 1.3) : ''}</g>`
    let parts = [['kit', pal], ['skin', skin], ['shoes', SHOE]]
    if (swim && water) {
      const w = inside(c, scene, 0, 11, 96, { kind: 'water', id: `${c.id}-water` })
      s += w.body; defs += w.defs ?? ''; parts = [['skin', skin], ['cap', cap], ['water', WATER]]
      if (c.big) s += c.fill([[45, 1, 1.6], [41, -1, 1.2], [-41, 2, 1.5], [-46, 3, 1.2]].map(([u, v, r]) => c.C(u, v, r)).join(' '), WATER.outline)
    }
    s += `<g id="${c.id}-arm">${arm(P.near.arm, 'base')}</g>`
    const [hu, hv, tilt] = P.head, r = 8.6
    let h = c.fill(c.C(...rot([hu - 1.5, hv + 8.5], [hu, hv], tilt), 3.6), skin.base, skin.outline, c.w * 0.8) // the neck
    h += c.body('head', c.C(hu, hv, r), skin, { w: c.w * 0.9 })
    if (swim) h += c.body('cap', c.S(CAP_SIDE.map(([a, b]) => rot([hu + a * r, hv + b * r], [hu, hv], tilt))), cap, { w: c.lw * 1.2, flat: true })
    else if (hair) { h += c.body('hair', c.S(HAIR_SIDE.map(([a, b]) => rot([hu + a * r, hv + b * r], [hu, hv], tilt))), hair, { w: c.lw, flat: true }); parts.push(['hair', hair]) }
    h += c.eye(...rot([hu + 0.5 * r, hv - 0.05 * r], [hu, hv], tilt), 1.4)
    s += `<g id="${c.id}-head">${h}</g>`
    return { defs, body: s, parts }
  },
})
const ATHLETE = {
  run: sideFigure(SIDE.run, 'run'),
  swim: sideFigure(SIDE.swim, 'swim'),
  squat: {
    box: [-50, -48, 50, 45],
    draw: (c, { pal = ACCENT, skin = SKIN, hair = HAIR.dark, bar = true }) => {
      let s = '', defs = ''
      const parts = [['kit', pal], ['skin', skin], ['shoes', SHOE]]
      if (bar) { const b = inside(c, equipment, 0, -31, 100, { kind: 'barbell', load: 0.6, id: `${c.id}-barbell`, ...(typeof bar === 'object' ? bar : {}) }); s += b.body; defs += b.defs; parts.push(...b.parts) }
      const legs = [-1, 1].map((k) => [[k * 6.5, -4], [k * 24, 12], [k * 18, 37]]), arms = [-1, 1].map((k) => [[k * 9.5, -23.5], [k * 24, -17], [k * 20, -31]])
      s += `<g id="${c.id}-legs">${legs.map((L) => shortsLeg(c, L, 10, pal, skin, 'base', 0.72)).join('')}</g>`
      s += `<g id="${c.id}-shoes">${[-1, 1].map((k) => c.fill(c.E(k * 20.5, 40.5, 6.4, 3.2, k * 8), SHOE.base, SHOE.outline, c.lw * 1.2)).join('')}</g>`
      s += `<g id="${c.id}-body">${c.tube([[0, -26], [0, -15], [0, -4]], 20, pal, { w: c.w * 0.85 })}</g>`
      s += `<g id="${c.id}-arms">${arms.map((A) => c.tube(A, 6.8, skin, { straight: true, w: c.w * 0.75 }) + c.fill(c.C(A[2][0], A[2][1], 3.4), skin.base, skin.outline, c.lw * 1.2)).join('')}</g>`
      let h = c.fill(c.C(0, -29.5, 3.8), skin.base, skin.outline, c.w * 0.8) + c.body('head', c.C(0, -38, 8.6), skin, { w: c.w * 0.9 })
      if (hair) { h += hairFront(c, 0, -38, 8.6, hair); parts.push(['hair', hair]) }
      s += `<g id="${c.id}-head">${h}</g>`
      return { defs, body: s, parts }
    },
  },
}
export function athlete(g, { pose, ...opts }) { return draw(ATHLETE, 'athlete', g, { id: 'athlete', ...opts, kind: pose ?? opts.kind ?? 'run' }) }

// =====================================================================================================================
// Heat and cold, `size` the longer side. Kinds: 'stove' (a sauna heater: a grey box with a glowing window, heaped with
// stones, steam rising: `steam`), 'bucket' (a wooden sauna bucket with two metal hoops and a ladle), 'thermometer' (a glass
// thermometer with ticks; `level` 0–1, `liquid` 'hot' red, 'cold' blue or a palette), 'tub' (a metal tub of cold water
// seen a little from above, on feet; `bather` puts a person in it to the shoulders, assays.mjs's bust with a neck and short hair (`hair`, false for none); `ice` the number of
// floating ice cubes, 0–3), 'ice' (one ice cube), 'snowflake', 'steam' (three rising wavy lines). Options: steam (stove,
// true), level (thermometer, 0.75), liquid (thermometer, 'hot'), bather (tub, true), ice (tub, 2), pal (the wood, metal
// or water where it makes sense), colour (snowflake and steam: the stroke).
// Used by: Sauna (stove, bucket, thermometer), Cold-water immersion (tub with bather and ice, snowflakes), heat shock,
//   thermogenesis and hormesis icons.
// Example: thermal(g, { x: 0, y: 0, size: 60, kind: 'tub', ice: 2, id: 'ice-bath' })
// =====================================================================================================================
const iceCube = (c, u, v, r, deg, sub) => {
  const q = [[-r, -r], [r, -r], [r, r], [-r, r]].map((p) => rot([u + p[0], v + p[1]], [u, v], deg))
  const C = q.map((p, i) => { const n = q[(i + 1) % 4]; return [[p[0] + (n[0] - p[0]) * 0.18, p[1] + (n[1] - p[1]) * 0.18], [p[0] + (n[0] - p[0]) * 0.82, p[1] + (n[1] - p[1]) * 0.82]] }).flat()
  let s = c.fill(c.S(C), ICE.light, ICE.outline, c.lw * 1.2)
  if (c.F.ext * (r / 50) >= 6) s += c.line(c.L([rot([u - r * 0.5, v - r * 0.15], [u, v], deg), rot([u - r * 0.15, v - r * 0.5], [u, v], deg)]), '#FFFFFF', c.lw * 1.4)
  return `<g id="${c.id}-${sub}">${s}</g>`
}
const flakeD = (c, u, v, r) => {
  let d = ''
  for (let k = 0; k < 6; k++) {
    const t = rad(k * 60 + 30), co = Math.cos(t), si = Math.sin(t), pu = u + r * 0.55 * co, pv = v + r * 0.55 * si, q = r * 0.36
    d += c.L([[u, v], [u + r * co, v + r * si]]) + ' ' + c.L([[pu + q * Math.cos(t + 0.8), pv + q * Math.sin(t + 0.8)], [pu, pv], [pu + q * Math.cos(t - 0.8), pv + q * Math.sin(t - 0.8)]]) + ' '
  }
  return d
}
const THERMAL = {
  stove: {
    box: [-26, -44, 26, 44],
    draw: (c, { pal = STOVE, steam = true }) => {
      let s = ''
      if (steam) s += `<g id="${c.id}-steam">${c.line(steamD(c, [-12, 0, 12], -14, 30), STEAM, trueW(c, 3))}</g>`
      s += `<g id="${c.id}-stove">${c.body('feet', [c.R(-20, 40, 6, 4, 1), c.R(14, 40, 6, 4, 1)], DARK, { w: c.lw })}${c.body('stove', c.R(-23, 6, 46, 36, 4), pal)}`
      if (c.big) s += c.line(c.L([[-23, 13], [23, 13]]), pal.small, c.lw)
      s += '</g>' + `<g id="${c.id}-glow">${c.body('window', c.R(-15, 22, 30, 11, 3), FLAME, { w: c.lw * 1.2, flat: true })}${c.big ? c.line(c.L([[-9, 27.5], [9, 27.5]]), FLAME.light, c.lw * 1.4) : ''}</g>`
      const st = [[-16, 3, 5.5], [-6, 1, 6.5], [5, 2, 6], [16, 3, 5.5], [-11, -6, 5.5], [0, -7, 6], [11, -5, 5.2], [-5, -14, 4.8], [6, -14, 4.6]]
      s += `<g id="${c.id}-stones">${st.map(([u, v, r], i) => c.fill(c.C(u, v, r), (i % 2 ? STONES_DARK : STONES).base, STONES.outline, c.lw * 1.2)).join('')}</g>`
      return { body: s, parts: [['window', FLAME]] }
    },
  },
  bucket: {
    box: [-26, -42, 26, 42],
    draw: (c, { pal = WOOD }) => {
      let s = `<g id="${c.id}-ladle">${c.tube([[4, -2], [10, -20], [15, -34]], 3.6, pal, { tone: 'light', w: c.lw * 1.1, straight: true })}${c.body('knob', c.E(15.6, -36.5, 3.4, 4.6, 20), pal, { tone: 'light', w: c.lw * 1.1 })}</g>`
      s += `<g id="${c.id}-bucket">${c.fill(c.E(0, -4, 24, 5), pal.small, pal.outline, c.lw * 1.2)}${c.body('bucket', c.M('M-24,-4 C-24,-1 -12,1 0,1 C12,1 24,-1 24,-4 L19,38 C19,40 10,41.5 0,41.5 C-10,41.5 -19,40 -19,38 Z'), pal)}`
      if (c.big) s += c.line(c.M('M-12,0.5 L-10,40.5 M0,1 L0,41.5 M12,0.5 L10,40.5'), pal.small, c.lw * 0.9)
      s += '</g>' + `<g id="${c.id}-hoops">${c.tube(c.M('M-23.2,6 C-12,9 12,9 23.2,6 M-20.4,30 C-10,33 10,33 20.4,30'), 2.6, METAL, { tone: 'shadow', w: c.lw * 0.9 })}</g>`
      return { body: s, parts: [['wood', pal]] }
    },
  },
  thermometer: {
    box: [-10, -48, 12, 48],
    draw: (c, { level = 0.75, liquid = 'hot' }) => {
      const L = typeof liquid === 'string' ? (liquid === 'cold' ? COLD : HOT) : liquid, top = -40, bot = 26, lv = bot - (bot - top) * Math.max(0, Math.min(1, level))
      let s = `<g id="${c.id}-glass">${c.body('tube', c.R(-6, -47, 12, 80, 6), GLASS)}${c.fill(c.C(0, 36, 10), GLASS.base, GLASS.outline, c.w)}</g>`
      s += `<g id="${c.id}-liquid">${c.fill(c.R(-2.6, lv, 5.2, 38 - lv, 2.6), L.small)}${c.fill(c.C(0, 36, 7), L.small)}</g>`
      if (c.big) s += `<g id="${c.id}-ticks">${c.line(Array.from({ length: 7 }, (_, i) => c.L([[6, top + 2 + i * 10], [i % 2 ? 9 : 11, top + 2 + i * 10]])).join(' '), INK, c.lw * 0.8)}</g>`
      if (c.shaded) s += c.line(c.L([[-3.6, -40], [-3.6, 20]]), '#FFFFFF', c.lw * 1.3)
      return { body: s, parts: [['liquid', L]] }
    },
  },
  tub: {
    box: [-47, -42, 47, 47],
    draw: (c, { pal = METAL, water = WATER, bather = true, ice = 2, skin = SKIN, hair = HAIR.dark }) => {
      const rimFront = 'M-46,1 C-46,6.4 -25.4,10 0,10 C25.4,10 46,6.4 46,1'
      let s = `<g id="${c.id}-feet">${c.body('feet', [c.M('M-36,39 L-41,46 L-31,46 Z'), c.M('M36,39 L41,46 L31,46 Z')], pal, { tone: 'shadow', w: c.lw * 1.2 })}</g>`
      s += `<g id="${c.id}-water">${c.fill(c.E(0, 1, 46, 9), water.base)}</g>`
      let defs = ''
      const parts = [['water', water]]
      if (bather) {
        const p = inside(c, person, 0, -17, 52, { pal: skin, skin, id: `${c.id}-bather` })
        s += `<g id="${c.id}-neck">${c.fill(c.R(-4, -21, 8, 9, 2), skin.base, skin.outline, c.lw)}</g>` + p.body + (hair ? `<g id="${c.id}-hair">${hairFront(c, 0, -28.4, 11.4, hair)}</g>` : ''); defs += p.defs; parts.push(['skin', skin])
        if (hair) parts.push(['hair', hair])
        s += `<g id="${c.id}-water-front">${c.fill(c.M(rimFront + ' Z'), water.base)}${c.line(c.M('M-28,2.5 C-22,0.5 -16,4 -10,2 C-4,0 2,4 8,2 C14,0 20,4 28,2'), water.outline, c.lw * 1.2)}</g>`
      }
      if (c.big) s += c.line(c.M('M-30,5 L-20,5 M18,6 L30,6'), water.light, c.lw * 1.3)
      s += [[-33, -1, 5.5, 14], [33, -2, 6, -12], [8, 4, 4.5, 30]].slice(0, Math.max(0, Math.min(3, ice))).map(([u, v, r, d], i) => iceCube(c, u, v, r, d, `ice-${i + 1}`)).join('')
      if (ice) parts.push(['ice', ICE])
      s += `<g id="${c.id}-tub">${c.body('tub', c.M(rimFront + ' C46,26 36,41 18,41 L-18,41 C-36,41 -46,26 -46,1 Z'), pal)}${c.fill(c.E(0, 1, 46, 9), 'none', pal.outline, c.w)}${c.big ? c.line(c.M('M-38,14 C-36,26 -28,34 -16,35'), pal.light, c.lw * 1.6) : ''}</g>`
      return { defs, body: s, parts }
    },
  },
  ice: { box: [-11, -11, 11, 11], draw: (c) => ({ body: iceCube(c, 0, 0, 9, 12, 'cube'), parts: [['ice', ICE]] }) },
  snowflake: {
    box: [-12, -12, 12, 12],
    draw: (c, { colour = ICE.outline }) => ({ body: `<g id="${c.id}-flake">${c.line(flakeD(c, 0, 0, 11), colour, trueW(c, 1.7))}</g>`, parts: [] }),
  },
  steam: {
    box: [-16, -20, 16, 20],
    draw: (c, { colour = STEAM }) => ({ body: `<g id="${c.id}-steam">${c.line(steamD(c, [-10, 0, 10], 19, 38), colour, trueW(c, 2.8))}</g>`, parts: [] }),
  },
}
export function thermal(g, opts) { return draw(THERMAL, 'thermal', g, { kind: 'stove', ...opts }) }

// =====================================================================================================================
// A glycogen granule, `size` its width: a branched tree of glucose units (beads in molecules.mjs's glucose colour, joined by
// thin bonds) round a glycogenin core (amber), on a pale disc. Each chain branches twice, as glycogen's α-1,6 branch
// points do. Options: pal (the glucose units, GLUCOSE), core (GLYCOGENIN; false for none), tiers (2 or 3: how many times
// the chains branch, 2), disc (the pale granule behind, true).
// Used by: Glycogen, muscle and liver energy icons (glycogen depletion: fewer tiers).
// Example: glycogen(g, { x: 0, y: 0, size: 40, id: 'glycogen' })
// =====================================================================================================================
const GLYCOGEN = {
  granule: {
    box: [-48, -48, 48, 48],
    draw: (c, { pal = GLUCOSE, core = GLYCOGENIN, tiers = 2, disc = true }) => {
      const sp = 6.6, br = [34, 24, 18], beads = [], bonds = []
      const grow = (u, v, ang, dep) => {
        const n = dep === 0 ? 3 : 2
        let eu = u, ev = v
        for (let i = 1; i <= n; i++) { eu = u + Math.cos(rad(ang)) * sp * i; ev = v + Math.sin(rad(ang)) * sp * i; if (!(dep === 0 && i === 1)) beads.push([eu, ev]) }
        bonds.push(c.L([[u, v], [eu, ev]]))
        if (dep < tiers) { grow(eu, ev, ang - br[dep], dep + 1); grow(eu, ev, ang + br[dep], dep + 1) }
      }
      ;[-90, 30, 150].forEach((a) => grow(0, 0, a, 0))
      let s = disc ? `<g id="${c.id}-granule">${c.fill(c.C(0, 0, 47), pal.light)}</g>` : ''
      s += `<g id="${c.id}-glucose">${c.line(bonds.join(' '), pal.outline, Math.max(1.2, c.lw * 0.9))}${c.fill(beads.map(([u, v]) => c.C(u, v, 3.1)).join(' '), pal.base, pal.outline, Math.max(1, c.lw * 0.7))}</g>`
      if (core) s += `<g id="${c.id}-glycogenin">${c.body('core', c.C(0, 0, 7.5), core, { w: c.lw * 1.3 })}</g>`
      return { body: s, parts: [['glucose', pal], ...(core ? [['glycogenin', core]] : [])] }
    },
  },
}
export function glycogen(g, opts) { return draw(GLYCOGEN, 'glycogen', g, { kind: 'granule', id: 'glycogen', ...opts }) }

// =====================================================================================================================
// Muscle fibre types in section, `size` its width: a fascicle cut across, its fibres packed as rounded polygons in a grey
// perimysium; type I fibres (slow, oxidative) in the muscle's deeper tone, type II (fast) in its pale base, a flat lilac
// nucleus at the edge of about half of them. Options: share (of type I fibres, 0.45), seed (which fibres, 31), nuclei (true),
// letters (I and II lettered in two fibres when they are large enough, true), pal (FIBRES).
// Used by: Muscle fibre types, muscle adaptation to endurance or resistance training, sarcopenia (with a lower share).
// Example: fibreSection(g, { x: 0, y: 0, size: 50, share: 0.6, id: 'fibres' })
// =====================================================================================================================
const SECTION = {
  section: {
    box: [-48, -48, 48, 48],
    draw: (c, { pal = FIBRES, share = 0.45, seed = 31, nuclei = true, letters = true }) => {
      const R = rng(seed), r = 10.5, dx = Math.sqrt(3) * r, dy = 1.5 * r, I = [], II = [], N = []
      for (let j = -2; j <= 2; j++) for (let i = -3; i <= 3; i++) {
        const u = i * dx + (j & 1 ? dx / 2 : 0), v = j * dy
        if (Math.hypot(u, v) > 34) continue
        const pts = Array.from({ length: 6 }, (_, k) => { const t = rad(30 + k * 60), q = r * (0.9 + 0.05 * R()); return [u + q * Math.cos(t), v + q * Math.sin(t)] })
        const typeI = u === 0 && v === 0 ? false : Math.abs(u + dx) < 0.1 && v === 0 ? true : R() < share
        ;(typeI ? I : II).push(c.S(pts))
        if (nuclei && R() < 0.55) { const t = R() * Math.PI * 2; N.push(c.C(u + r * 0.62 * Math.cos(t), v + r * 0.62 * Math.sin(t), 1.5)) }
      }
      const out = Array.from({ length: 16 }, (_, i) => { const t = (i / 16) * Math.PI * 2, q = 45 + (i % 3 ? 0 : -1.2); return [q * Math.cos(t), q * Math.sin(t) * 0.98] })
      let s = `<g id="${c.id}-perimysium">${c.body('perimysium', c.S(out), TENDON, { flat: true })}</g>`
      s += `<g id="${c.id}-type-II">${c.fill(II.join(' '), pal.base, pal.outline, c.lw)}</g><g id="${c.id}-type-I">${c.fill(I.join(' '), pal.small, pal.outline, c.lw)}</g>`
      if (nuclei && c.F.ext >= 40) s += `<g id="${c.id}-nuclei">${c.fill(N.join(' '), NUC.small)}</g>`
      if (letters) s += letter(c, -dx, 0, 8, 'I', pal.light, 'type-I-letter') + letter(c, 0, 0, 8, 'II', pal.outline, 'type-II-letter')
      return { body: s, parts: [['fibres', pal], ['nuclei', NUC]] }
    },
  },
}
export function fibreSection(g, opts) { return draw(SECTION, 'fibreSection', g, { kind: 'section', id: 'fibres', ...opts }) }

// =====================================================================================================================
// Data for formula.mjs's `skeletal`: lactate, CH₃–CH(OH)–COO⁻ (the anion the blood carries), the hydroxyl up, as the
// β-hydroxybutyrate of formula.mjs is drawn. Used by: Lactate (with a blood drop and a curve), the Cori cycle.
// Example: skeletal(g, { x: 0, y: 0, size: 40, ...LACTATE, id: 'lactate' })
// =====================================================================================================================
export const LACTATE = (() => {
  const m = formula(), c3 = [0, 0], c2 = go(c3, 30), c1 = go(c2, -30)
  m.chain([c3, c2, c1])
  m.bond(m.at(c2), m.at(go(c2, 90), 'O'))
  m.bond(m.at(c1), m.at(go(c1, -90), 'O'), 2); m.bond(m.at(c1), m.at(go(c1, 30), 'O-'))
  return m.data
})()

// ---------- demonstrations: every kind once, a few options ----------
const cap = (s) => s[0].toUpperCase() + s.slice(1)
const V = (name, fn, o, size = 96) => ({ name, size: 100, draw: (g) => fn(g, { x: 0, y: 0, size, ...o }) })
const kindsOf = (fn, plan, table, extra = {}) => Object.keys(table).map((kind) => V(`${cap(plan)}, ${kind}`, fn, { kind, ...(extra[kind] ?? {}) }))
export const DEMOS = [
  ...kindsOf(food, 'food', FOODS, { carrot: { turn: 35 } }),
  V('Food, steak cut to a smaller portion', food, { kind: 'steak', cut: 8, bone: false }),
  ...kindsOf(container, 'container', CONTAINERS), V('Container, glass of milk', container, { kind: 'glass', liquid: MILK, level: 0.8 }),
  ...kindsOf(tableware, 'tableware', TABLEWARE),
  V('Tableware, Mediterranean plate', tableware, { kind: 'plate', foods: [['fish', 0, -12, 56, -8], ['olives', -15, 17, 24, 0], ['olive sprig', 16, 15, 30, -20]] }),
  ...kindsOf(equipment, 'equipment', EQUIPMENT), V('Equipment, barbell with coloured plates', equipment, { kind: 'barbell', pal: deep(25) }),
  ...Object.keys(ATHLETE).map((pose) => V(`Athlete, ${pose}`, athlete, { pose })),
  ...kindsOf(thermal, 'thermal', THERMAL), V('Thermal, cold thermometer', thermal, { kind: 'thermometer', liquid: 'cold', level: 0.2 }), V('Thermal, empty tub with ice', thermal, { kind: 'tub', bather: false, ice: 3 }),
  V('Glycogen', glycogen, {}), V('Glycogen, depleted', glycogen, { tiers: 1 }),
  V('Muscle fibre types', fibreSection, {}),
  { name: 'Lactate (formula)', size: 100, draw: (g) => skeletal(g, { x: 0, y: 0, size: 80, ...LACTATE, id: 'lactate' }) }, V('Muscle fibre types, mostly type I', fibreSection, { share: 0.8, seed: 5 }),
]
