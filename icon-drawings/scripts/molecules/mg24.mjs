// Two icons of SiliCoDraw's "Molecules & genetics" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts in ../parts/:
// TMAO and lipopolysaccharide (LPS), two microbial molecules of ageing research, in the look of mg23 (small molecules as
// skeletal formulas with lettered atom balls, as mg07's dopamine). Their compositions are read by hand from the source in
// a 100 × 100 box centred on 0,0 and scaled onto a 512 page (`page` of ../cellkit.mjs).
// Parts used: ligand (atoms, sugars), glucose (sugar rings), phosphate (molecules.mjs); lipid bilayer, one leaflet
// (membranes.mjs); bacterium, arrow (tissue.mjs); the skeletal formula (formula.mjs).
// TMAO is the skeletal formula of ../parts/formula.mjs. Drawn here because no part draws them: lipid A (two glucosamines
// on six acyl chains) with its core oligosaccharide and O-antigen chain.
// Lettered (strokes, ../parts/letters.mjs): "N" and "O" on TMAO's atoms (by the formula part), "P" on lipid A's
// phosphates (by the part).
// Left out: no original writes more.
// Usage: node mg24.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page } from '../cellkit.mjs'
import { deep, soft, toHex, toLch } from '../colour.mjs'
import { f } from '../shapes.mjs'
import { glucose, ligand, phosphate } from '../parts/molecules.mjs'
import { LIPID, bilayer, mergeParts } from '../parts/membranes.mjs'
import { arrow, bacterium } from '../parts/tissue.mjs'
import { TMAO, skeletal } from '../parts/formula.mjs'

const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012) are left out of the hue check, as STYLE.md says.
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p]) => toLch(p.base).c >= 0.012), defs, body)

// Hues (OKLCH degrees), as mg23: small molecules and sugars green 165 (TMAO's atoms in the element colours of formula.mjs), the bacterium
// a yellower green (115) than the part's 137 so that it and the bonds recolour apart, a second sugar cerulean 205,
// lipids peach 52, phosphate mustard 92.
const SMALL = 165, MICROBE = 115, SUGAR2 = 205
const INK = toHex({ l: 0.5, c: 0.006, h: 250 }) // a true grey for arrows

const P2 = ([x, y]) => `${f(x)},${f(y)}`
const line = (pts, colour, w, cap = 'round') => `<path d="M${pts.map(P2).join(' L')}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), parts: mergeParts(ps.flatMap((p) => p.parts)) })
const icon = (name, { defs, body, parts }) => cellType(name, parts, defs, body)
const own = (id, body, parts, defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })
const extra = (p) => ({ ...p, parts: [] })

// ---------------------------------------------------------------------------------------------------------------------
// TMAO (trimethylamine N-oxide): gut bacteria make trimethylamine from choline and carnitine, which the liver oxidises to
// TMAO: a nitrogen carrying three methyl groups and an oxygen, the nitrogen positive and the oxygen negative.
// (Corrected: SiliCoDraw's ball-and-stick model gives the nitrogen four methyl balls besides its oxygen, five bonds; here
// it has three. The molecule is TMAO of ../parts/formula.mjs, drawn as a tetrahedron: the nitrogen a blue ball lettered
// "N" with a plus, the oxygen straight up a red ball lettered "O" with a minus, the three methyls grey carbon balls, one
// in the plane, one on a wedge and one hashed. The source is the bacterium part (SiliCoDraw's small blue rod), the dashed
// line an arrow.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(5.9, [-4.9, -5.9])
  const tmao = skeletal(g, { x: 6.5, y: 5.5, size: 58, id: 'TMAO', ...TMAO })
  const bug = bacterium(g, { x: -29, y: -33, size: 30, turn: -35, flagellum: false, aspect: 0.48, id: 'gut-bacterium', pal: soft(MICROBE) })
  const arr = arrow(g, { points: [[-19.5, -23.5], [-13, -17.5], [-6.5, -14]], colour: INK, w: 8, id: 'arrow' })
  icon('TMAO', join(bug, extra(arr), tmao))
}

// ---------------------------------------------------------------------------------------------------------------------
// Lipopolysaccharide (LPS): the outer leaflet of a Gram-negative bacterium's outer membrane is made of LPS: lipid A (two
// glucosamines with their phosphates on six acyl chains) in the membrane, then the core oligosaccharide and the O-antigen,
// a chain of repeated sugars reaching out; phospholipids make the inner leaflet below.
// (SiliCoDraw draws the lipids tan and every sugar green. Here the inner leaflet is the lipid bilayer part (one leaflet,
// peach), lipid A's chains are drawn in its outline tone over the same pale core, its phosphates are the mustard part,
// lettered "P", the hexagonal sugars the glucose part (green) and the round sugars the ligand part in cerulean, so that
// the two kinds of sugar of the O-antigen recolour apart.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.6, [0, -1.5]), sPal = deep(SMALL), s2 = deep(SUGAR2), t = 37.6
  const inner = bilayer(g, { x: 0, y: 27, size: 100, thick: t, leaflet: 'inner', id: 'inner-leaflet' })
  const core = own('lipid-A-core', `<path d="M${[[-50, 11], [50, 11], [50, 27], [-50, 27]].map(g.P).map(P2).join(' L')}Z" fill="${LIPID.base}"/>`, [])
  const lps = [-30, 0, 30].map((cx, j) => {
    const id = `LPS-${j + 1}`, top = [-32, -46, -39][j]
    const tails = own(`${id}-acyl-chains`, Array.from({ length: 6 }, (_, k) => line([g.P([cx - 10 + k * 4, 12]), g.P([cx - 10 + k * 4, 25])], LIPID.outline, 5.5)).join(''), [])
    const stem = own(`${id}-chain`, line([g.P([cx, 2]), g.P([cx, top])], sPal.outline, 6), [])
    const sugars = [glucose(g, { x: cx - 5.5, y: 6, size: 10.6, id: `${id}-glucosamine-1` }), glucose(g, { x: cx + 5.5, y: 6, size: 10.6, id: `${id}-glucosamine-2` })]
    const phos = [-1, 1].map((s, k) => phosphate(g, { x: cx + s * 14.5, y: 7, size: 6.4, id: `${id}-phosphate-${k + 1}` }))
    const coreSugars = [glucose(g, { x: cx, y: -4.5, size: 9, id: `${id}-core-1` }), glucose(g, { x: cx, y: -13.5, size: 9, id: `${id}-core-2` })]
    const branch = own(`${id}-branch`, line([g.P([cx, -9]), g.P([cx + 7, -9])], sPal.outline, 6), [])
    const side = ligand(g, { x: cx + 7.5, y: -9, size: 5.6, id: `${id}-core-3`, pal: s2 })
    const repeats = []
    for (let y = -22, i = 0; y >= top; y -= 8, i++)
      repeats.push(i % 2 ? ligand(g, { x: cx, y, size: 6.6, id: `${id}-O-antigen-${i + 1}`, pal: s2 }) : glucose(g, { x: cx, y, size: 7.8, id: `${id}-O-antigen-${i + 1}` }))
    return join(tails, stem, branch, ...sugars, ...phos, ...coreSugars, side, ...repeats)
  })
  icon('Lipopolysaccharide', join(core, inner, ...lps))
}

check()
console.log('written to', OUT)
