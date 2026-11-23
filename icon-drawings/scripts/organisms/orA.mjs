// Eight icons of SiliCoDraw's "Organisms" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts of the
// category (../parts/organisms.mjs): the small mammals of the laboratory — Mouse, Rat, Naked mole-rat, Hamster (its face),
// Guinea pig, Rabbit, Marmoset (on its branch) — and Parabiosis: a young and an old mouse joined, with the shared
// circulation as the turnover sign of ../parts/tissue.mjs, where SiliCoDraw draws a red loop with two arrowheads.
// The current look: outlines at 60 % (setStrokeScale), the gloss on (setGloss; none of these bodies is a closed round one).
// Lettered: nothing (SiliCoDraw writes no labels on these).
// Usage: node orA.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss } from '../cellkit.mjs'
import { hueGap, toLch } from '../colour.mjs'
import { setStrokeScale } from '../shapes.mjs'
import { face, mammal, tone } from '../parts/organisms.mjs'
import { cycleArrow } from '../parts/tissue.mjs'

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
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join(''), parts: ps.flatMap((p) => p.parts) })
// Every animal fills 100 units on its longer side: 460 px of the page, margins about 26.
const M = (kind, o = {}) => (g) => mammal(g, { x: 0, y: 0, size: 100, kind, ...o })
icon('Mouse', [4.6, 0, 0], M('mouse'))
icon('Rat', [4.6, 0, 0], M('rat'))
icon('Naked mole-rat', [4.6, 0, 0], M('naked mole-rat'))
icon('Hamster', [4.6, 0, 0], (g) => face(g, { x: 0, y: 0, size: 100, kind: 'hamster' }))
icon('Guinea pig', [4.6, 0, 0], M('guinea pig'))
icon('Rabbit', [4.6, 0, 0], M('rabbit'))
// The branch and the tail reach past the marmoset's box: a little smaller, moved right and up.
icon('Marmoset', [4.35, -1.6, 2], M('marmoset'))
// Parabiosis: the young mouse (white) above and to the left, the old one (grey) below and to the right, each 74 % as in
// SiliCoDraw; between their flanks the exchange of blood.
const OLD = tone(80, 0.8, 0.006)
// The arrows are in the ink of the set: the red of blood lies within 20° of the mice's pink skin.
icon('Parabiosis', [5.25, 0, 0], (g) => join(
  mammal(g, { x: -6, y: -14, size: 76, kind: 'mouse', id: 'young-mouse' }),
  mammal(g, { x: 5, y: 15, size: 76, kind: 'mouse', fur: OLD, id: 'old-mouse' }),
  cycleArrow(g, { x: 19, y: 3, size: 23, arcs: 2, id: 'shared-blood' }),
))
kit.check()
console.log('written', OUT)
