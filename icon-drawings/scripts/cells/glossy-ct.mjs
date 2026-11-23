// The Cells & tissues batches (cells/ct01.mjs … ct19.mjs) with the gloss of cells (STYLE.md): one script at a time,
// drawn with the switches on (`setGloss`: organelles of ../parts/organelles.mjs glossy, nuclei flat; `setMitoGloss`:
// every mitochondrion of ../mitokit.mjs glossy; `setStrokeScale(0.6)`), then each file finished as SVG text:
// mitochondria drawn or placed some other way by `glossyMito` (./glossy-mito.mjs), and cell bodies drawn by hand (and
// placed approved icons) by `glossy` (./glossy.mjs), which also flattens nuclei. Left as they are: gradients the parts
// already made glossy, molecules (proteins, small molecules, chromosomes, fibres), tissue layers and vessels, and bodies
// under 30 px. A lumen is a body here (the round lumen of an exosome or an autophagosome).
// Usage: node cells/glossy-ct.mjs <script, e.g. cells/ct14.mjs> <out>
// Run it from a copy of icon-drawings whose approved icons are the ones before the gloss (placed icons are finished
// with the rest of the drawing).
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setStrokeScale } from '../shapes.mjs'
import { setGloss } from '../cellkit.mjs'
import { MITO, mitoTones, setMitoGloss } from '../mitokit.mjs'
import { glossHandled } from '../parts/organelles.mjs'
import { glossy } from './glossy.mjs'
import { glossyMito } from './glossy-mito.mjs'

const HERE = dirname(fileURLToPath(import.meta.url)), SCRIPTS = join(HERE, '..')
/** Gradients of what is not a cell or an organelle. */
export const FLAT = new RegExp(
  [
    // molecules
    'receptor', 'kinase', 'enzyme', 'protein', 'ligand', 'insulin', 'glucose', 'atp-', 'jak', 'stat', 'ras-', 'tfeb', 'pgc', 'eif2', 'proteasome', 'hsp', 'hsc70', 'p97', 'p16',
    'channel', 'pump', 'connexon', 'synthase', 'complex', 'chain', 'substrate', 'metabolite', 'cytokine', 'morphogen', 'signal', 'notch', 'delta', 'alpha', '^beta-', 'gamma',
    'ire1', 'retrotranslocon', 'carrier', 'atpase', 'tastant', 'lamp', 'mutation', 'chromosome', 'strand', 'spindle', 'fibre', 'myofibril', 'bundle', 'fascicles', 'unfolded', 'misfolded', 'aggregate',
    // lab things and marks
    'label', 'blot', 'slide', 'needle', 'radiation', 'stained', 'dab', 'axis', 'stress', 'foci', 'pigment', 'yellow', 'green', '^red-gradient',
    // tissue layers, vessels, spaces
    'dermis', 'ectoderm', 'mesoderm', 'endoderm', 'lamina', 'tissue', 'blood', 'marrow', 'medium', 'field', 'vessel', 'arter', 'vein', 'venule', 'sinusoid', 'tube', 'sheet',
    'crypt', 'gland', 'limb', 'somite', 'scar', 'mucus', 'csf', 'sac-', 'wedge', 'endothelium-gradient', 'epithelium-gradient', 'muscle', 'stroma', 'envelope', 'membrane', 'nucleoplasm',
  ].join('|'),
  'i',
)

// --proteins: the proteins in the scene are glossed too, by the rules of ../molecules/glossy-mg.mjs (its FLAT list; 40 px
// across and 28 px thick at least; the shade side only below 90 px).
const PROTEINS = process.argv.includes('--proteins')
const PROTEIN = /receptor|kinase|enzyme|alpha|beta|gamma|hsc70|hsp|chaperone|lamp|jak|stat|ras-|synthase|pump|channel|carrier|proteasome|eif2|ire1|p97|p16|tfeb|pgc|insulin|cytokine|notch|delta|connexon|complex|protein/i
const script = resolve(process.argv[2]), out = process.argv[3], work = join(out, '..', 'work', script.replace(/.*\//, '').replace(/\W+/g, '-'))
mkdirSync(out, { recursive: true })
mkdirSync(work, { recursive: true })
setStrokeScale(0.6)
setGloss(true)
setMitoGloss(true)
process.argv[2] = work
await import(script)
const handled = glossHandled(), mitoEnd = mitoTones().end
const MG_FLAT = PROTEINS ? (await import('../molecules/glossy-mg.mjs')).FLAT : null
// With --proteins, a protein is a gradient FLAT names that PROTEIN also names; it follows the rules of glossy-mg.mjs,
// and everything else follows the rules above.
// Cells that FLAT names by mistake (the alpha and beta cells of an islet): with --proteins they are glossed as cells.
const CELLS_NAMED_LIKE_PROTEINS = { 'Pancreatic islet.svg': /^(alpha|beta|delta)-gradient$/, 'Beta cell glucose sensing.svg': /^beta-cell-gradient$/ }
let file = ''
const asCell = (id) => PROTEINS && CELLS_NAMED_LIKE_PROTEINS[file]?.test(id)
const isProtein = (id) => PROTEINS && !asCell(id) && FLAT.test(id) && PROTEIN.test(id)
const skip = (id, [a, b]) => asCell(id) ? false : handled.has(id) || (a === MITO.base && b === mitoEnd) || (isProtein(id) ? MG_FLAT.test(id.replace(/-gradient$/, '')) : FLAT.test(id))
for (const name of readdirSync(work).filter((n) => n.endsWith('.svg'))) {
  const text = readFileSync(join(work, name), 'utf8')
  file = name
  // Traced more coarsely when the file would pass 40 kB (STYLE.md) where it did not before.
  const make = (eps) => glossy(glossyMito(text), { hlMin: 0.9, prescaled: 0.6, skip, minSize: 30, also: (id) => id === 'lumen-gradient', eps, ...(PROTEINS ? { minSize: (id) => (isProtein(id) ? 28 : 30), minAcross: (id) => (isProtein(id) ? 40 : 0), litMin: (id) => (isProtein(id) ? 90 : 0) } : {}) })
  let svg = make(0.8)
  for (const eps of [1.5, 2.5]) if (svg.length > 40000 && text.length <= 40000) svg = make(eps)
  writeFileSync(join(out, name), svg)
}
