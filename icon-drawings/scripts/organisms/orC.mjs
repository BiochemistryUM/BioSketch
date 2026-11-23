// Eight icons of SiliCoDraw's "Organisms" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts of the
// category (../parts/organisms.mjs): Macaque (its face), the bats — Bat (wings spread, from the front) and Brandt's bat
// (hanging from a branch, wings folded) — and the animals of the sea: Whale, Bowhead whale (with its spout, as SiliCoDraw
// draws it), Dolphin, Seal and Greenland shark (with the pale copepod that hangs from its eye).
// The current look: outlines at 60 % (setStrokeScale), the gloss on (setGloss; none of these bodies is a closed round one).
// Lettered: nothing (SiliCoDraw writes no labels on these).
// Usage: node orC.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss } from '../cellkit.mjs'
import { hueGap, toLch } from '../colour.mjs'
import { setStrokeScale } from '../shapes.mjs'
import { bat, face, fish, seaMammal } from '../parts/organisms.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT)
// Greys (chroma below 0.012) are left out of the hue check; the same palette used by several parts is listed once.
const icon = (name, [k, cx, cy], draw) => {
  const g = page(k, [cx, cy]), { defs, body, parts } = draw(g)
  const seen = parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base || hueGap(toLch(q.base).h, toLch(p.base).h) < 3) === i)
  kit.cellType(name, seen, defs, body)
}
// Every animal fills 100 units on its longer side: 460 px of the page, margins about 26.
const at = (fn, kind, o = {}) => (g) => fn(g, { x: 0, y: 0, size: 100, kind, ...o })
icon('Macaque', [4.6, 0, 0], at(face, 'macaque'))
// The spread bat's box holds room for its wing tips that the drawing does not use: a little larger.
icon('Bat', [4.9, 0, 0], at(bat, 'spread'))
icon("Brandt's bat", [4.6, 0, 0], at(bat, 'hanging'))
icon('Whale', [4.6, 0, 0], at(seaMammal, 'whale'))
icon('Bowhead whale', [4.6, 0, 0], at(seaMammal, 'bowhead', { spout: true }))
icon('Dolphin', [4.6, 0, 0], at(seaMammal, 'dolphin'))
icon('Seal', [4.6, 0, 0], at(seaMammal, 'seal'))
icon('Greenland shark', [4.6, 0, 0], at(fish, 'shark', { parasite: true }))
kit.check()
console.log('written', OUT)
