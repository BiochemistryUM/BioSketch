// Eight icons of SiliCoDraw's "Organisms" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), the later drawings that replace the first where there are any, redrawn in the soft look
// of icon-drawings/STYLE.md from the shared parts: Plant, Arabidopsis, Leaf, Flower, Cactus, Conifer, Moss and Fern.
// Each icon is one kind of the `plant` part of ../parts/organisms.mjs, which was drawn from these very SiliCoDraw icons,
// set alone on the page as SiliCoDraw sets it. Outlines at 60 % (setStrokeScale), gloss on (plants seen from the side
// are flat with the soft two-stop shading of the set; none of these is a closed round body).
// Parts used: plant (potted, arabidopsis, leaf, flower, cactus, conifer, moss, fern) and its palettes (LEAF, DARK_LEAF,
// SOIL, POT, PETAL, WHITE_PETAL, FLOWER_CENTRE, SAND, WOOD, SPORE). Drawn here: nothing. Lettered: nothing.
// Usage: node orN.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss } from '../cellkit.mjs'
import { toLch } from '../colour.mjs'
import { setStrokeScale } from '../shapes.mjs'
import { plant } from '../parts/organisms.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012: white petals) are left out of the hue check; a palette used twice is listed once.
const icon = (name, [k, cx, cy], draw) => {
  const g = page(k, [cx, cy]), { defs, body, parts } = draw(g)
  const seen = parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base) === i)
  kit.cellType(name, seen, defs, body)
}
// Every icon: the kind at 460 px on the page, then fitted by what it really covers (measured on the rendered page:
// some kinds reach past the box they declare): `fit` is [scale, x, y], the scale that brings the longer side to 460 px
// and the page point that was the middle of the drawing at 4.6, which is moved to the middle of the page.
const one = (name, kind, opts = {}, [s, mx, my] = [1, 256, 256]) =>
  icon(name, [4.6 * s, (mx - 256) / 4.6, (my - 256) / 4.6], (g) => plant(g, { x: 0, y: 0, size: 100, kind, id: kind.replace(/ /g, '-'), ...opts }))

// ---------- Plant ----------
// A young plant in a terracotta pot with soil: five pointed leaves up a short stem, the far leaf in the shadow tone.
one('Plant', 'potted', {}, [1.004, 256, 260])

// ---------- Arabidopsis ----------
// Arabidopsis thaliana: the rosette of spoon-shaped leaves, the flowering stem with a side branch, siliques (seed pods)
// and small white four-petalled flowers with buds at the top.
one('Arabidopsis', 'arabidopsis', {}, [0.9, 254, 282])

// ---------- Leaf ----------
// One leaf on its stalk, tilted 45°, its far half in the shadow tone, midrib and alternate side veins.
one('Leaf', 'leaf', {}, [1.127, 251, 255])

// ---------- Flower ----------
// Five pink petals in front of five behind (shadow tone), the yellow centre with its ring of anthers, a stem and two leaves.
one('Flower', 'flower', {}, [0.968, 256, 258])

// ---------- Cactus ----------
// A columnar cactus with two arms, ribs and small spines, standing on a mound of sand.
one('Cactus', 'cactus', {}, [0.996, 256, 258])

// ---------- Conifer ----------
// A tiered fir on its brown trunk, the right half in the shadow tone. SiliCoDraw's two small cones are left out (the part
// has none; the tree reads without them).
one('Conifer', 'conifer', {}, [0.987, 256, 256])

// ---------- Moss ----------
// A cushion of moss with leafy shoots, three sporophytes on stalks (setae) each ending in a capsule, one still capped
// by its calyptra.
one('Moss', 'moss', {}, [0.865, 256, 249])

// ---------- Fern ----------
// A curving frond of alternate pinnae on its rachis, sori (spore dots) under two pinnae, and a young fiddlehead beside it.
one('Fern', 'fern', {}, [0.975, 234, 260])

check()
console.log('written')
