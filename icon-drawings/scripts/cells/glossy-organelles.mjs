// The single organelle icons with the gloss of cells (STYLE.md): drawn with the parts of ../parts/organelles.mjs
// (nucleus, ER, ribosome, lysosome, peroxisome, vesicle, endosome, multivesicular body, lipid droplet, centrosome) with
// `setGloss(true)` and outlines at 60 %; the Golgi apparatus (the approved icon) and the chloroplast (the draft of
// ct03.mjs) are turned glossy as SVG text by `glossy` of ./glossy.mjs.
// Usage: node cells/glossy-organelles.mjs <out> [--plain]   (--plain: as they are now, without the gloss, for comparison)
// The mitochondrion and its family are the owner's own drawings and are not touched.
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cellTypes, page, setGloss } from '../cellkit.mjs'
import { setStrokeScale } from '../shapes.mjs'
import { centrosome, endoplasmicReticulum, lipidDroplet, lysosome, multivesicularBody, nucleus, peroxisome, ribosome, vesicle } from '../parts/organelles.mjs'
import { glossy } from './glossy.mjs'

const HERE = dirname(fileURLToPath(import.meta.url)), ICONS = join(HERE, '..', '..')
const out = process.argv[2], plain = process.argv.includes('--plain')
mkdirSync(out, { recursive: true })
if (!plain) { setStrokeScale(0.6); setGloss(true) }

const at = { x: 0, y: 0, size: 100 }
const ICONS_FROM_PARTS = [
  ['Nucleus', (g) => nucleus(g, { ...at, pores: true, nucleolus: true, chromatin: true })],
  ['Endoplasmic reticulum', (g) => endoplasmicReticulum(g, at)],
  ['Ribosome', (g) => ribosome(g, { ...at, mRNA: true })],
  ['Lysosome', (g) => lysosome(g, at)],
  ['Peroxisome', (g) => peroxisome(g, at)],
  ['Vesicle', (g) => vesicle(g, { ...at, cargo: true })],
  ['Endosome', (g) => vesicle(g, { ...at, kind: 'endosome', cargo: true })],
  ['Multivesicular body', (g) => multivesicularBody(g, at)],
  ['Lipid droplet', (g) => lipidDroplet(g, at)],
  ['Centrosome', (g) => centrosome(g, at)],
]
const { cellType, check } = cellTypes(out)
for (const [name, draw] of ICONS_FROM_PARTS) {
  const p = draw(page(4.6, [0, 0]))
  cellType(name, p.parts, p.defs, p.body)
}
check()

// Drawn elsewhere: the approved Golgi apparatus, and the chloroplast as ct03.mjs writes it.
const work = join(out, '..', 'work')
mkdirSync(work, { recursive: true })
execFileSync('node', [join(HERE, 'ct03.mjs'), work], { stdio: 'ignore' })
const others = { 'Golgi apparatus': readFileSync(join(ICONS, 'Golgi apparatus.svg'), 'utf8'), Chloroplast: readFileSync(join(work, 'Chloroplast.svg'), 'utf8') }
for (const [name, text] of Object.entries(others)) writeFileSync(join(out, `${name}.svg`), plain ? text : glossy(text, { hlMin: 0.9 })) // the Golgi's highlight is a little darker than a cell's
console.log('written to', out)
