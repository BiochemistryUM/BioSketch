// Eight icons of SiliCoDraw's "Techniques & assays" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David
// Carlsson; see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts:
// blots, plates and arrays that are read out: a western blot, an ELISA plate, a drug screen with its hits, a microarray,
// a TLC plate, a DNA methylation array (CpG sites on DNA and their β values), serology (a serum tube and antibodies) and
// replicates (three microtubes, n = 3). Compositions are read by hand from the source in a 100 × 100 box centred on 0,0
// and scaled onto a 512 page (`page` of ../cellkit.mjs). Outlines at 60 % (`setStrokeScale(0.6)`); lines that are the
// drawing itself (stalks, letters) keep their width. Objects and pictures of data are not glossed; the antibodies are thin
// arms, flat as the molecules rules have them (`setGloss(true)` is set all the same).
// Parts used: blot, spotArray, plot (assays.mjs); tube (lab.mjs); dna, antibody (molecules.mjs); lettering (letters.mjs).
// Drawn here because no part draws them: the CpG pins of the methylation array (as mg19's methyl pins: a stalk and a
// head, filled when methylated) and the equals sign of "n = 3" (letters.mjs has no "=").
// Lettered (strokes): "n = 3" under the replicates ("n" and "3" from letters.mjs, "=" as two strokes of the same width).
// Usage: node tbD.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss } from '../cellkit.mjs'
import { deep, hueOf, rich, toLch } from '../colour.mjs'
import { f, setStrokeScale, strokeScale } from '../shapes.mjs'
import { INK, tube } from '../parts/lab.mjs'
import { blot, plot, spotArray } from '../parts/assays.mjs'
import { antibody, dna } from '../parts/molecules.mjs'
import { lettering, textWidth } from '../parts/letters.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012: the materials) are left out of the hue check, as the conventions of lab.mjs say; a palette
// used twice is one part that recolours as one, so it is listed once.
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base) === i), defs, body)
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts) })
const icon = (name, { defs, body, parts }) => cellType(name, parts, defs, body)
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })
/** A width in page pixels that `setStrokeScale` leaves as it is (for lines that are the drawing itself). */
const keep = (w) => w / strokeScale()
const K = 4.52 // a part of size 100 on about 460 px: margins of 26

// ---------------------------------------------------------------------------------------------------------------------
// Western blot: a membrane with one band per lane at the height of the protein, of differing strength, and a row of
// even loading-control bands below.
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K, [0, 0])
  icon('Western blot', blot(g, { x: 0, y: 0, size: 100, bands: [[0, 0.22, 0.95], [1, 0.2, 0.75], [2, 0.23, 0.4], [3, 0.22, 0.95]], id: 'western-blot' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// ELISA: two rows of wells whose yellow (the stopped TMB reaction) deepens with the amount of antigen.
// (SiliCoDraw mixes the blue of TMB before stopping with the yellow after it; one yellow by value, as the conventions say.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K, [0, 0])
  icon('ELISA', spotArray(g, { x: 0, y: 0, size: 100, ground: 'light', rows: 2, cols: 4, values: [[0.25, 0.45, 0.7, 0.95], [0.05, 0.25, 0.5, 0.8]], id: 'elisa' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Drug screening: a plate of compounds, three hits in red among the wells that did nothing.
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K, [0, 0])
  icon('Drug screening', spotArray(g, { x: 0, y: 0, size: 100, ground: 'light', rows: 4, cols: 6, hits: [[1, 2], [2, 4], [0, 5]], id: 'screen' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Microarray: a dark chip with an 8 × 8 grid of spots in the red, green and yellow of two-colour hybridisation.
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K, [0, 0])
  icon('Microarray', spotArray(g, { x: 0, y: 0, size: 100, id: 'microarray' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// TLC plate: an upright silica plate with the origin line, the dashed solvent front and four coloured spots in two lanes.
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K, [0, 0])
  icon('TLC plate', blot(g, { x: 0, y: 0, size: 100, kind: 'tlc', id: 'tlc-plate' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// DNA methylation array: a stretch of DNA with six CpG sites, each a pin whose head is filled when the site is
// methylated and open when not, and under it the β value of each site (the share of copies methylated) as a bar.
// (Methyl groups and their bars in mg04's orange, the DNA the part's blue, rather than SiliCoDraw's teal on grey-blue.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.75, [0, 5.6])
  const DNA = deep(hueOf('#4f6bb8')), ME = deep(hueOf('#e3955a'))
  const B = [0.92, 0.78, 0.12, 0.7, 0.22, 0.95], U = B.map((_, i) => 0.07 + i * 0.172)
  // the plot: 96 wide, its bars at shares U of the plot area; the same x for the pins above (plot.mjs's X(u) in g units)
  const PS = 96, Y0 = 28
  const chart = plot(g, { x: 0, y: Y0, size: PS, aspect: 0.48, series: [{ kind: 'bars', data: B.map((v, i) => [U[i], v * 0.92]), pal: ME, barWidth: 9 }], hlines: [0.46], id: 'beta-values' })
  const xOf = (u) => ((-39 + 3 + (50 - 11 * 0.75 - -39 - 3) * u) * PS) / 100
  const Yd = -14, strand = dna(g, { x: 0, y: Yd, size: 98, width: 10, id: 'DNA' })
  const r = 5.6, top = Yd - 4, head = -35, w = 7
  const pins = B.map((b, i) => {
    const x = xOf(U[i]), m = b > 0.5
    const stalk = g.line([[x, top], [x, head + r]], DNA.outline, f(keep(w * 0.6)))
    return `<g id="${m ? 'methylated' : 'unmethylated'}-CpG-${i + 1}">${stalk}${g.circle(x, head, r - w / 2 / g.k, m ? ME.small : '#FFFFFF', m ? ME.outline : DNA.outline, w)}</g>`
  }).join('')
  icon('DNA methylation array', join(chart, strand, own('CpG-sites', pins, [['methyl groups', ME]])))
}

// ---------------------------------------------------------------------------------------------------------------------
// Serology: a serum tube (red top, clear serum with a label) and the antibodies the test looks for in it.
// (SiliCoDraw's tube with its red cap; the antibodies in its blue, as one part, without the orange tips of the arms.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.94, [7.6, 0])
  const CAP = deep(25), AB = rich(hueOf('#6f86c8'))
  const t = tube(g, { x: -22, y: 0, size: 92, kind: 'blood', liquid: 'plasma', level: 0.62, label: true, capPal: CAP, id: 'serum-tube' })
  const abs = [[20, -24, 0, 30], [37, -2, 22, 26], [21, 22, -14, 28]].map(([x, y, turn, size], i) => antibody(g, { x, y, size, turn, pal: AB, id: `antibody${i + 1}` }))
  icon('Serology', join(t, ...abs))
}

// ---------------------------------------------------------------------------------------------------------------------
// Replicates: three identical microtubes of one sample, and "n = 3" under them.
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(5.1, [3.2, 3.4])
  const tubes = [-30, 0, 30].map((x, i) => tube(g, { x, y: -8, size: 62, kind: 'micro', liquid: 'water', level: 0.42, id: `tube${i + 1}` }))
  const h = 10, Y = 40, lw = keep(0.17 * h * g.k), gap = 0.45 * h
  const wn = textWidth('n') * h, w3 = textWidth('3') * h, we = 0.6 * h, total = wn + we + w3 + 2 * gap, x0 = -total / 2
  const n = lettering(g, { x: x0 + wn / 2, y: Y, h, text: 'n', colour: INK, w: lw, id: 'letter-n' })
  const three = lettering(g, { x: x0 + wn + gap * 2 + we + w3 / 2, y: Y, h, text: '3', colour: INK, w: lw, id: 'digit-3' })
  const ex = x0 + wn + gap, eq = [-0.17, 0.17].map((d) => g.line([[ex, Y + d * h], [ex + we, Y + d * h]], INK, f(lw))).join('')
  icon('Replicates', join(...tubes, own('n-equals-3', n.body + `<g id="equals">${eq}</g>` + three.body)))
}

check()
console.log('written to', OUT)
