// Eight icons of SiliCoDraw's "Anatomy" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts of the
// category (../parts/anatomy.mjs): the brain from the left side, alone and with a region lit — Brain, Brain regions
// (the four lobes), Cerebral cortex, Prefrontal cortex, Striatum, Thalamus, Hypothalamus (with the pituitary on its
// stalk) and Amygdala. Each is the `brain` part with its `region`, which draws a lit region in a deeper tone of the brain
// itself (the conventions of anatomy) where SiliCoDraw fills it in a second colour.
// The current look: outlines at 60 % (setStrokeScale), the gloss on (setGloss: the cerebrum, cerebellum and brainstem
// are glossed by the part as closed bodies).
// Lettered: nothing (SiliCoDraw writes no labels on these).
// Usage: node anA.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss } from '../cellkit.mjs'
import { hueGap, toLch } from '../colour.mjs'
import { setStrokeScale } from '../shapes.mjs'
import { brain } from '../parts/anatomy.mjs'

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
// The brain fills 100 units across: 460 px of the page, margins about 26 at the sides.
const B = (region) => (g) => brain(g, { x: 0, y: 0, size: 100, region })
icon('Brain', [4.6, 0, 0], B())
icon('Brain regions', [4.6, 0, 0], B('lobes'))
icon('Cerebral cortex', [4.6, 0, 0], B('cortex'))
icon('Prefrontal cortex', [4.6, 0, 0], B('prefrontal'))
icon('Striatum', [4.6, 0, 0], B('striatum'))
icon('Thalamus', [4.6, 0, 0], B('thalamus'))
icon('Hypothalamus', [4.6, 0, 0], B('hypothalamus'))
icon('Amygdala', [4.6, 0, 0], B('amygdala'))
kit.check()
console.log('written', OUT)
