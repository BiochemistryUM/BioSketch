// Eight icons of SiliCoDraw's "Molecules & genetics" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts in ../parts/:
// protein, enzyme and substrate, phosphorylation, ubiquitination, proteasome, antibody, antibody and antigen, and antigen
// presentation. Their compositions are read by hand from the source (a 100 × 100 box centred on 0,0) and set on a 512
// page. Every protein, tag, antibody, membrane and the proteasome is a part (the proteasome from ../parts/complexes.mjs). Nothing is lettered: SiliCoDraw's "P" on the phosphate is the mustard phosphate of the set.
// Colours: a free protein is amber (the parts' convention); where it carries an amber tag (ubiquitin, 75°) or a mustard
// phosphate (92°), the tagged protein is SiliCoDraw's own green (163°) instead, so that the two recolour apart. Antigens
// are green too (as the ligand of the receptor part).
// Usage: node mg01.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page } from '../cellkit.mjs'
import { deep, hueOf, soft } from '../colour.mjs'
import { f } from '../shapes.mjs'
import { antibody, enzyme, phosphate, protein, ubiquitin } from '../parts/molecules.mjs'
import { membraneWith, receptor } from '../parts/membranes.mjs'
import { proteasome } from '../parts/complexes.mjs'

const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const { cellType, check } = cellTypes(OUT)

const PHOSPHATE = 92, GREEN = hueOf('#5fae8b'), TCR = hueOf('#c9527a')
const tagged = soft(GREEN) // a protein that carries an amber or mustard tag
/** Puts the parts of an icon together: [part, ...] → { defs, body, hues }. */
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), hues: ps.flatMap((p) => p.parts) })
const line = (pts, colour, w) => `<path d="M${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' L')}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"/>`
/** A stalk from a protein to its tag, in the tag's tone (it is part of the tag). */
const stalk = (g, a, b, colour, w, id) => ({ defs: '', body: `<g id="${id}">${line([a, b].map(g.P), colour, w)}</g>`, parts: [] })

const icon = (name, { defs, body, hues }) => cellType(name, hues, defs, body)

// Protein: the protein part alone, filling the page. (SiliCoDraw's protein is green with two darker spots; here it is
// the amber free protein of the set, without the spots.)
{
  const g = page(4.85, [0, -0.4])
  icon('Protein', join(protein(g, { x: 0, y: 0, size: 100 })))
}

// Enzyme and substrate: the enzyme part with its substrate (green, as every small molecule) in the active site.
// (SiliCoDraw's pocket opens to the left with a square substrate half in it; the part opens to the right, so that its
// light still falls from the top left.)
{
  const g = page(4.9, [-0.9, -0.3])
  icon('Enzyme and substrate', join(enzyme(g, { x: 0, y: 0, size: 100, substrate: true })))
}

// Phosphorylation: a protein carrying a phosphate on a short stalk at its upper right. (SiliCoDraw writes "P" in a
// yellow circle: here it is the mustard phosphate part. The protein is green, SiliCoDraw's colour, because amber lies
// only 17° from the phosphate.)
{
  const g = page(5.02, [0.8, -5.1])
  const pr = protein(g, { x: -8, y: 4, size: 78, id: 'protein', pal: tagged })
  const ph = phosphate(g, { x: 34, y: -38, size: 25 })
  icon('Phosphorylation', join(pr, stalk(g, [18, -22], [30, -34], deep(PHOSPHATE).small, 14, 'phosphate-stalk'), ph))
}

// Ubiquitination: a protein tagged with a chain of four ubiquitins (the amber beads of the set), the length that sends it
// to the proteasome. (SiliCoDraw draws three blue beads on thin links; the protein is its pale blue there, green here,
// since the ubiquitin is amber.)
{
  const g = page(4.74, [0.2, -6.6])
  const pr = protein(g, { x: -10, y: 6, size: 76, id: 'protein', pal: tagged })
  const dir = [Math.cos(-0.92), Math.sin(-0.92)], start = [15, -18], len = 46
  const ub = ubiquitin(g, { x: start[0] + dir[0] * len / 2, y: start[1] + dir[1] * len / 2, size: len, count: 4, turn: (-0.92 * 180) / Math.PI })
  icon('Ubiquitination', join(pr, ub))
}

// Proteasome: the proteasome part (../parts/complexes.mjs): the barrel of four rings between two caps, an unfolded protein threaded in
// at the top and peptides leaving at the bottom. (SiliCoDraw draws a plain barrel with faint ring lines; the rings of
// subunits and the lobed caps are what the 26S proteasome is recognised by. Its purple is kept: no nucleus is near.)
{
  const g = page(3.14, [-8.4, -4.5])
  icon('Proteasome', join(proteasome(g, { x: 0, y: 0, size: 100, substrate: true })))
}

// Antibody: the antibody part, upright, with its light chains. (SiliCoDraw's antibody is blue with orange tips; the set's
// antibodies are amber, as on the B cell and the plasma cell.)
{
  const g = page(4.78, [0, 3])
  icon('Antibody', join(antibody(g, { x: 0, y: 0, size: 100 })))
}

// Antibody and antigen: the antibody with an antigen (a green protein) bound at the tip of its left arm, where the
// antigen-binding site is. (SiliCoDraw's antigen is orange, 20° from the amber antibody: here it is green, like the
// ligand of the receptor part.)
{
  const g = page(3.62, [-5.3, -5.6])
  const ab = antibody(g, { x: 4, y: 6, size: 100 })
  const tip = [4 - 30, 6 - 36], dir = [-0.6, -0.8], ag = protein(g, { x: tip[0] + dir[0] * 23, y: tip[1] + dir[1] * 23, size: 42, id: 'antigen', pal: tagged })
  icon('Antibody and antigen', join(ab, ag))
}

// Antigen presentation: an MHC molecule in the membrane of the antigen-presenting cell (below) holds a peptide (green) in
// its groove, and the T cell receptor in the membrane of the T cell (above) meets it. Both are the receptor part, the
// TCR turned towards the MHC. (SiliCoDraw draws the membranes as plain bands and the TCR as two pink blocks; here both
// cells have the lipid membrane of the set, the TCR keeps SiliCoDraw's rose, the MHC its blue.)
{
  const g = page(4.15, [0, 0]), t = 32
  const apc = membraneWith(g, { x: 0, y: 0.98 * t, size: 100, thick: t, id: 'antigen-presenting-cell', proteins: [{ part: receptor, at: 0, bound: true, id: 'MHC' }] })
  const tc = membraneWith(g, { x: 0, y: -0.98 * t, size: 100, thick: t, turn: 180, id: 'T-cell', proteins: [{ part: receptor, at: 0, bound: false, id: 'TCR', pal: soft(TCR) }] })
  icon('Antigen presentation', { defs: apc.defs + tc.defs, body: apc.body + '\n' + tc.body, hues: [...apc.parts, ['TCR', soft(TCR)]].filter((p, i, a) => a.findIndex((q) => q[1].base === p[1].base) === i) })
}

check()
console.log('written to', OUT)
