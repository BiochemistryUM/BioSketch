// A pilot of cells with depth, drawn from ../parts/surfaces.mjs (`cell3d`) by the rules of the approved 3D red blood cell:
// the approved Cell and Hepatocyte seen tilted from 40° and face on, lit from the top left, nuclei raised with a small cast
// shadow, vesicles and granules laid on the top face. Outlines at 60 %, as every icon drawn from 23 November 2026.
// Usage: node shaded-cells.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page } from '../cellkit.mjs'
import { setStrokeScale } from '../shapes.mjs'
import { cell3d } from '../parts/surfaces.mjs'

setStrokeScale(0.6)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const { cellType, check } = cellTypes(OUT)
const icon = (name, p) => cellType(name, p.parts, p.defs, p.body)
const g = page(4.6, [0, 0]) // 100 units fill the page less margins of 26 px

icon('Cell (3D)', cell3d(g, { x: 0, y: 0, size: 100, kind: 'generic', view: 'tilted' }))
icon('Hepatocyte (3D)', cell3d(g, { x: 0, y: 0, size: 100, kind: 'hepatocyte', view: 'tilted' }))
// The face-on views ("Cell (3D, face on)", "Hepatocyte (3D, face on)": cell3d with view 'face') were removed on 23 November
// 2026: since every cell has the gloss they were the same as Cell and Hepatocyte.
check()
console.log('written to', OUT)
