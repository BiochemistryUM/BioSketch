// Eight icons of SiliCoDraw's "Organisms" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts of the
// category (../parts/organisms.mjs): the larger mammals — Dog, Ageing companion dog (the dog of the part, old, with its
// collar: a greying muzzle and brow and a cloudy eye; SiliCoDraw draws a head and shoulders), Cat (its face), Pig, Cow,
// Sheep, Horse and Elephant.
// The current look: outlines at 60 % (setStrokeScale), the gloss on (setGloss; none of these bodies is a closed round one).
// Lettered: nothing (SiliCoDraw writes no labels on these).
// Usage: node orB.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss } from '../cellkit.mjs'
import { hueGap, toLch } from '../colour.mjs'
import { setStrokeScale } from '../shapes.mjs'
import { face, mammal } from '../parts/organisms.mjs'

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
const M = (kind, o = {}) => (g) => mammal(g, { x: 0, y: 0, size: 100, kind, ...o })
icon('Dog', [4.6, 0, 0], M('dog'))
icon('Ageing companion dog', [4.6, 0, 0], M('dog', { old: true, collar: true }))
icon('Cat', [4.6, 0, 0], (g) => face(g, { x: 0, y: 0, size: 100, kind: 'cat' }))
icon('Pig', [4.6, 0, 0], M('pig'))
icon('Cow', [4.6, 0, 0], M('cow'))
icon('Sheep', [4.6, 0, 0], M('sheep'))
icon('Horse', [4.6, 0, 0], M('horse'))
icon('Elephant', [4.6, 0, 0], M('elephant'))
kit.check()
console.log('written', OUT)
