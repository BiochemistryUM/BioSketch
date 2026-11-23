// Shaded proteins and a red blood cell with depth, drawn from ../parts/surfaces.mjs in the soft look of
// icon-drawings/STYLE.md (outlines at 60 %, as every icon drawn from 23 November 2026). The owner asked for globular
// proteins drawn as lumpy surfaces with soft shading (a ball, a tall block, a C, a dimer) and a red blood cell whose rim
// and dimple show depth: the idea of another product's icons, none of its artwork.
// Colours: the set's protein amber (rich 75°), the dimer's second subunit blue (215°), the red blood cell in the colours of
// the approved Red blood cell.
// Usage: node shaded.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page } from '../cellkit.mjs'
import { setStrokeScale } from '../shapes.mjs'
import { redBloodCell3d, shadedProtein } from '../parts/surfaces.mjs'

setStrokeScale(0.6)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const { cellType, check } = cellTypes(OUT)
const icon = (name, p) => cellType(name, p.parts, p.defs, p.body)
// 100 units fill the page less margins of 26 px.
const g = page(4.6, [0, 0])

// The ball is round, so at full size it covers far more of the page than the block or the C: 80 units leaves it margins
// between theirs.
icon('Protein (ball)', shadedProtein(g, { x: 0, y: 0, size: 80, shape: 'ball', seed: 1 }))
icon('Protein (cylinder)', shadedProtein(g, { x: 0, y: 0, size: 100, shape: 'cylinder', seed: 1 }))
icon('Protein (arc)', shadedProtein(g, { x: 0, y: 0, size: 100, shape: 'arc', seed: 1 }))
icon('Protein (dimer)', shadedProtein(g, { x: 0, y: 0, size: 100, shape: 'dimer', seed: 1 }))
icon('Red blood cell (3D)', redBloodCell3d(g, { x: 0, y: 0, size: 100, view: 'tilted' }))
// Saved as "Red blood cell" since 23 November 2026: the icon "Red blood cell (3D, face on)" was the same drawing twice.
icon('Red blood cell', redBloodCell3d(g, { x: 0, y: 0, size: 100, view: 'face' }))
check()
console.log('written to', OUT)
