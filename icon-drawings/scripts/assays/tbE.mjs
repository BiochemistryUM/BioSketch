// Eight icons of SiliCoDraw's "Techniques & assays" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David
// Carlsson; see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts:
// microscope images and stained sections: immunofluorescence, calcium imaging with its trace, a FISH probe on nuclei, a
// FISH image of bacteria, phase contrast, immunohistochemistry, a Masson trichrome stain and spatial transcriptomics.
// Compositions are read by hand from the source in a 100 × 100 box centred on 0,0 and scaled onto a 512 page (`page` of
// ../cellkit.mjs). Outlines at 60 % (`setStrokeScale(0.6)`). These are pictures of data: flat, never glossed
// (`setGloss(true)` is set all the same, as every script of the current look does).
// Parts used: imageField, tissueSection, plot (assays.mjs); GFP of cellforms.mjs through the image field.
// Drawn here: nothing of its own; the calcium trace is the plot part with its own data (two transients).
// Lettered: nothing ("unstained" and "collagen" of SiliCoDraw are words, left out).
// Usage: node tbE.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss } from '../cellkit.mjs'
import { toLch } from '../colour.mjs'
import { setStrokeScale } from '../shapes.mjs'
import { objW } from '../parts/lab.mjs'
import { GFP } from '../parts/cellforms.mjs'
import { imageField, plot, tissueSection } from '../parts/assays.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012: the grounds) are left out of the hue check, as the conventions of lab.mjs say; a palette
// used twice is one part that recolours as one, so it is listed once.
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base) === i), defs, body)
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts) })
const icon = (name, { defs, body, parts }) => cellType(name, parts, defs, body)
const K = 4.52 // a part of size 100 on about 460 px: margins of 26

// ---------------------------------------------------------------------------------------------------------------------
// Immunofluorescence: a camera image of cells stained green (GFP/FITC) with blue DAPI nuclei on a near-black ground.
// (SiliCoDraw's three red dots of a second stain are left out: one stain and a counterstain read better at 40 px.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K, [0, 0])
  icon('Immunofluorescence', imageField(g, { x: 0, y: 0, size: 100, shape: 'rect', count: 7, seed: 2, id: 'immunofluorescence' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Calcium imaging: a GCaMP image with one active neuron among dim ones, and under it the fluorescence of that neuron
// over time: two calcium transients, each a fast rise and a slow fall.
// (SiliCoDraw draws a spiky trace; a calcium indicator rises fast and decays slowly, so the trace has that shape.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.6, [0, -3.3])
  const image = imageField(g, { x: 0, y: -15, size: 98, shape: 'rect', aspect: 0.66, content: 'neurons', id: 'calcium-image' })
  const transient = (u, t0, a, tau) => (u < t0 ? 0 : a * (1 - Math.exp(-(u - t0) / 0.012)) * Math.exp(-(u - t0) / tau))
  const trace = plot(g, { x: 0, y: 34, size: 98, card: false, axes: 'none', aspect: 0.27, series: [{ kind: 'line', fn: (u) => 0.1 + transient(u, 0.14, 0.95, 0.16) + transient(u, 0.6, 0.6, 0.14), pal: GFP, width: objW(98 * g.k) * 1.6 }], id: 'calcium-trace' })
  icon('Calcium imaging', join(image, trace))
}

// ---------------------------------------------------------------------------------------------------------------------
// FISH probe: an eyepiece view of DAPI-stained nuclei, each with the two bright red dots where the probe has bound its
// sequence on the two copies of the chromosome.
// (SiliCoDraw draws one chromosome with a red and a green signal; the part's view of nuclei with probe dots is what a
// FISH result looks like down the microscope, and leaves the chromosome to the genetics icons.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K, [0, 0])
  icon('FISH probe', imageField(g, { x: 0, y: 0, size: 100, content: 'spots', count: 7, seed: 3, id: 'fish-probe' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// FISH image: an epifluorescence view of a bacterial community, every cell stained blue and one group lit green by its
// probe.
// (SiliCoDraw's pink dots, a filament and the scale bar are left out; the part's labelled and unlabelled rods carry it.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K, [0, 0])
  icon('FISH image', imageField(g, { x: 0, y: 0, size: 100, content: 'rods', count: 11, seed: 2, id: 'fish-image' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Phase contrast: unstained cells seen in phase contrast, dark with a bright halo round each, on a mid grey.
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K, [0, 0])
  icon('Phase contrast', imageField(g, { x: 0, y: 0, size: 100, mode: 'phase', count: 4, id: 'phase-contrast' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Immunohistochemistry: a section on a slide, nuclei blue with haematoxylin and the positive cells brown with DAB.
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.99, [-1.9, 0.8]) // the section alone, its outline filling the icon
  icon('Immunohistochemistry', tissueSection(g, { x: 0, y: 0, size: 100, stain: 'dab', slide: false, id: 'ihc' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Trichrome stain: a section stained by Masson's trichrome: muscle red, bands of collagen blue, nuclei dark.
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.99, [-1.9, 0.8]) // the section alone, its outline filling the icon
  icon('Trichrome stain', tissueSection(g, { x: 0, y: 0, size: 100, stain: 'trichrome', slide: false, id: 'trichrome' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Spatial transcriptomics: a pale section on a slide covered by a grid of barcoded spots, coloured by the cluster of
// the tissue region each lies in.
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.99, [-1.9, 0.8]) // the section alone, its outline filling the icon
  icon('Spatial transcriptomics', tissueSection(g, { x: 0, y: 0, size: 100, stain: 'spatial', slide: false, id: 'spatial' }))
}

check()
console.log('written to', OUT)
