// Eight icons of SiliCoDraw's "Organisms" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), the later drawings that replace the first where there are any, redrawn in the soft look
// of icon-drawings/STYLE.md from the shared parts: Rice, Maize, Tomato, Legume, Seed, Plant growth stages, Stoma and
// Vascular bundle. Seven are one kind of the `plant` part of ../parts/organisms.mjs (drawn from these very SiliCoDraw
// icons), set alone on the page; Plant growth stages is composed of plant kinds standing in the ground of `scene`.
// Outlines at 60 % (setStrokeScale), gloss on: the tomato, a closed round fruit, is glossed by the part; the rest are flat
// with the soft two-stop shading of the set.
// Parts used: plant (rice, maize, tomato, legume, seed, seedling, potted, arabidopsis, stoma, vascular bundle), scene (ground)
// and their palettes (LEAF, GRAIN, MAIZE, TOMATO, SOIL, PINK, WOOD, YOUNG, WHITE_PETAL, FLOWER_CENTRE, CYTO, PLASTID,
// SPORE, IVORY).
// Drawn here: nothing. The young plant of Plant growth stages is the potted plant of the part with its pot and soil
// groups taken out, and the seedling the part's seedling without its own patch of soil (the part's `pot: false` is
// documented but not honoured, and the seedling has no option to leave its soil out). Lettered: nothing.
// Usage: node orO.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss } from '../cellkit.mjs'
import { toLch } from '../colour.mjs'
import { setStrokeScale } from '../shapes.mjs'
import { IVORY, LEAF, plant, scene, tone } from '../parts/organisms.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012: the ivory seed of Plant growth stages) are left out of the hue check; a palette used
// several times is listed once.
const icon = (name, [k, cx, cy], draw) => {
  const g = page(k, [cx, cy]), { defs, body, parts } = draw(g)
  const seen = parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base) === i)
  kit.cellType(name, seen, defs, body)
}
const join = (...ps) => ({ defs: ps.map((p) => p.defs ?? '').join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts ?? []) })
// Every single-kind icon: the kind at 460 px on the page, then fitted by what it really covers (measured on the rendered
// page): `fit` is [scale, x, y], the scale that brings the longer side to 460 px (margins 26 px) and the page point that
// was the middle of the drawing at 4.6, which is moved to the middle of the page.
const at = ([s, mx, my] = [1, 256, 256]) => [4.6 * s, (mx - 256) / 4.6, (my - 256) / 4.6]
const one = (name, kind, opts = {}, fit) => icon(name, at(fit), (g) => plant(g, { x: 0, y: 0, size: 100, kind, id: kind.replace(/ /g, '-'), ...opts }))
/** A part without some of its groups (`<g id="<id>-<name>">` holding only paths), and without the palettes they used. */
const without = (p, id, groups) => ({
  defs: p.defs,
  body: groups.reduce((b, n) => b.replace(new RegExp(`<g id="${id}-${n}">.*?</g>`), ''), p.body),
  parts: p.parts.filter(([n]) => !groups.includes(n)),
})

// ---------- Rice ----------
// Two stems with nodding panicles of golden grains and long leaves (the far ones in the shadow tone).
one('Rice', 'rice', {}, [0.92, 265, 260])

// ---------- Maize ----------
// An ear of maize in its green husks: rows of yellow kernels, the silk at the top, the stalk at the bottom.
one('Maize', 'maize', {}, [0.991, 256, 257])

// ---------- Tomato ----------
// A glossy red fruit with its star-shaped green calyx and stalk. SiliCoDraw's white highlight is replaced by the gloss.
one('Tomato', 'tomato', {}, [0.987, 256, 250])

// ---------- Legume ----------
// A pea plant: trifoliate leaves and an opened pod with peas above the ground, the root system in the soil with pink
// rhizobial nodules.
one('Legume', 'legume', {}, [0.987, 256, 238])

// ---------- Seed ----------
// A bean seed cut open: the coat, the embryo inside (radicle and the plumule between the cotyledons) and the hilum.
one('Seed', 'seed', {}, [1.011, 258, 266])

// ---------- Plant growth stages ----------
// Four stages from left to right in one band of soil, as the growth stages of Arabidopsis are counted: a seed in the
// ground, a seedling with its two seed leaves, a young plant with its first true leaves, and the grown plant flowering
// (rosette, flowering stem with white flowers and siliques). All leaves in one green (LEAF), so the plant recolours as
// one; the seed in ivory (the bean's brown would lie within 36° of the soil). The seedling and the young plant are drawn
// before the ground, so their stems enter the soil; the rosette of the grown plant lies on it. SiliCoDraw grows one
// generic plant with a pink flower; its small root marks are left out.
// The soil is a warmer brown than SOIL (40° for 75°, same lightness and chroma): SOIL lies only 14° from the yellow
// centres of the flowers and would recolour with them.
const LOAM = tone(40, 0.5, 0.058)
icon('Plant growth stages', at([0.954, 264, 286]), (g) => {
  const seedling = without(plant(g, { x: -32, y: 28.9, size: 26, kind: 'seedling', leaf: LEAF, id: 'seedling' }), 'seedling', ['soil'])
  const young = without(plant(g, { x: -11, y: 25.5, size: 52, kind: 'potted', id: 'young-plant' }), 'young-plant', ['soil', 'pot'])
  const ground = scene(g, { x: 0, y: 39, size: 100, kind: 'ground', pal: LOAM, id: 'soil' })
  const seed = plant(g, { x: -43, y: 40.5, size: 11, turn: -15, kind: 'seed', seed: IVORY, embryo: LEAF, id: 'seed' })
  const grown = plant(g, { x: 26, y: -1.5, size: 68, kind: 'arabidopsis', id: 'flowering-plant' })
  return join(seedling, young, ground, seed, grown)
})

// ---------- Stoma ----------
// A stoma in face view: two kidney-shaped guard cells with their chloroplasts round the pore, set in the wavy-walled
// cells of the epidermis.
one('Stoma', 'stoma', {}, [0.987, 256, 256])

// ---------- Stem cross-section (SiliCoDraw: Vascular bundle; a whole stem with its ring of bundles) ----------
// A stem cut across (a dicot): the epidermis, the cortex and the pith, eight vascular bundles in a ring, each with its
// phloem cap outside and xylem vessels inside.
one('Stem cross-section', 'vascular bundle', {}, [0.987, 256, 256])

check()
console.log('written')
