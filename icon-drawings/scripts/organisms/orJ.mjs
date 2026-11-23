// Eight icons of SiliCoDraw's "Organisms" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), the later drawings that replace the first, redrawn in the soft look of
// icon-drawings/STYLE.md from the shared parts: Crab, Shrimp, Lobster, Octopus, Starfish, Sea urchin, Snail and Ocean
// quahog. Compositions are read by hand from the source in its 100 × 100 box centred on 0,0 and scaled onto a 512 page
// (`page` of ../cellkit.mjs); outlines at 60 % (setStrokeScale), gloss on (none of these is a closed round body that
// glosses: the parts draw them flat, with the soft gradient of their base tone).
// Parts used: arthropod (crab, shrimp, lobster) and invertebrate (octopus, starfish, urchin, snail, clam) of
// parts/organisms.mjs, each as it is: every icon here is one thing a part already draws.
// Drawn here: nothing.
// Lettered: nothing (SiliCoDraw writes no labels on these).
// Usage: node orJ.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss } from '../cellkit.mjs'
import { toLch } from '../colour.mjs'
import { setStrokeScale } from '../shapes.mjs'
import { arthropod, invertebrate } from '../parts/organisms.mjs'

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

// ---------- Crab, Shrimp, Lobster ----------
// The arthropod part as it is: the crab seen from above (wide shell with side teeth, claws, stalked eyes), the shrimp from
// the side facing left (curved segmented body, rostrum, legs and swimmerets, tail fan), the American lobster from above,
// head up (crusher and cutter claws, banded abdomen, tail fan, long antennae).
icon('Crab', [4.6, 0, 0], (g) => arthropod(g, { x: 0, y: 0, size: 96.2, kind: 'crab', id: 'crab' }))
icon('Shrimp', [4.6, 0, 0], (g) => arthropod(g, { x: 0, y: 0, size: 100, kind: 'shrimp', id: 'shrimp' }))
icon('Lobster', [4.6, 0, 0], (g) => arthropod(g, { x: 0, y: 0.3, size: 98.1, kind: 'lobster', id: 'lobster' }))

// ---------- Octopus, Starfish, Sea urchin, Snail ----------
// The invertebrate part as it is: the octopus from the front (eight curling arms with pale suckers, the mantle, two
// eyes), the starfish (five slightly turned arms with rows of bumps), the sea urchin from above (spines, five rows of tube
// feet), the garden snail from the side facing left (spiral shell, foot, eye stalks).
icon('Octopus', [4.6, 0, 0], (g) => invertebrate(g, { x: 0, y: 0.75, size: 99.4, kind: 'octopus', id: 'octopus' }))
icon('Starfish', [4.6, 0, 0], (g) => invertebrate(g, { x: 0, y: 2.85, size: 106, kind: 'starfish', id: 'starfish' }))
icon('Sea urchin', [4.6, 0, 0], (g) => invertebrate(g, { x: 0, y: 0, size: 100, kind: 'urchin', id: 'urchin' }))
icon('Snail', [4.6, 0, 0], (g) => invertebrate(g, { x: 0, y: 0, size: 97, kind: 'snail', id: 'snail' }))

// ---------- Ocean quahog ----------
// Arctica islandica, the longest-lived animal: one valve with its dense annual growth rings and the umbo, the other valve
// behind (the clam kind of the invertebrate part).
icon('Ocean quahog', [4.6, 0, 0], (g) => invertebrate(g, { x: 0.4, y: 0, size: 100, kind: 'clam', id: 'quahog' }))

check()
console.log('written', OUT)
