// Six icons of SiliCoDraw's "Organisms" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), the later drawings that replace the first, redrawn in the soft look of
// icon-drawings/STYLE.md from the shared parts: Hydra, Tardigrade, Jellyfish, Immortal jellyfish, Coral and Sea sponge.
// Compositions are read by hand from the source in its 100 × 100 box centred on 0,0 and scaled onto a 512 page (`page`
// of ../cellkit.mjs); outlines at 60 % (setStrokeScale), gloss on (none of these is a closed round body that glosses).
// Parts used: invertebrate (hydra, tardigrade, jellyfish, turritopsis, polyp, coral, sponge) of parts/organisms.mjs;
// arrow of parts/tissue.mjs.
// Drawn here: nothing.
// Lettered: nothing (SiliCoDraw writes no labels on these).
// Usage: node orK.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss } from '../cellkit.mjs'
import { toHex, toLch } from '../colour.mjs'
import { setStrokeScale } from '../shapes.mjs'
import { invertebrate } from '../parts/organisms.mjs'
import { arrow } from '../parts/tissue.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012) are left out of the hue check, as the conventions of lab.mjs say; a palette used by several
// parts is listed once.
const icon = (name, [k, cx, cy], draw) => {
  const g = page(k, [cx, cy]), { defs, body, parts } = draw(g)
  const seen = parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base) === i)
  kit.cellType(name, seen, defs, body)
}

const join = (...ps) => ({ defs: ps.map((p) => p.defs ?? '').join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts ?? []) })

// ---------- Hydra, Tardigrade, Jellyfish ----------
// The invertebrate part as it is: the hydra upright on its foot with six tentacles dotted with stinging cells and a bud;
// the tardigrade from the side facing left on four pairs of clawed legs; the moon-jelly-like jellyfish with its scalloped
// bell, frilled oral arms, thin tentacles and four gonad rings.
icon('Hydra', [4.6, 0, 0], (g) => invertebrate(g, { x: -0.55, y: 0.75, size: 97.7, kind: 'hydra', id: 'hydra' }))
icon('Tardigrade', [4.6, 0, 8.4], (g) => invertebrate(g, { x: 0, y: 0, size: 100, kind: 'tardigrade', id: 'tardigrade' }))
icon('Jellyfish', [4.6, 0, 0], (g) => invertebrate(g, { x: 0, y: 0.75, size: 100, kind: 'jellyfish', id: 'jellyfish' }))

// ---------- Immortal jellyfish ----------
// Turritopsis dohrnii as SiliCoDraw composes it, in its own units: the small medusa with its red cross-shaped stomach at
// the upper left, an arrow curving down to the right, and the hydroid colony it turns back into at the lower right (the
// turritopsis and polyp kinds, at the scale and place they have in the source; their palettes are the same two). The
// arrow is a neutral grey rather than the slate INK of arrows, which lies only 24° from the pale blue bell.
const GREY = toHex({ l: 0.5, c: 0.006, h: 255 })
icon('Immortal jellyfish', [5.34, 6.3, 2.4], (g) => join(
  invertebrate(g, { x: -12, y: -8.5, size: 63, kind: 'turritopsis', id: 'medusa' }),
  arrow(g, { points: [[17, -29], [31, -30], [41, -21], [43, -7]], id: 'reversal', w: 7, colour: GREY }),
  invertebrate(g, { x: 31.5, y: 24.5, size: 43, kind: 'polyp', id: 'polyp' }),
))

// ---------- Coral, Sea sponge ----------
// The invertebrate part as it is: a branching coral on a rock with polyps at the tips; three sponge tubes with pores and
// dark openings on the sea floor.
icon('Coral', [4.6, 0, 0], (g) => invertebrate(g, { x: 0, y: 1, size: 96.8, kind: 'coral', id: 'coral' }))
icon('Sea sponge', [4.6, 0, 0], (g) => invertebrate(g, { x: 0, y: 0, size: 100, kind: 'sponge', id: 'sponge' }))

check()
console.log('written', OUT)
