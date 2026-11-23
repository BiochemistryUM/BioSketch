// Eight icons of SiliCoDraw's "Molecules & genetics" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David
// Carlsson; see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts
// in ../parts/: fatty acid, steroid hormone, ions, reactive oxygen species, microRNA hairpin, circular RNA, histone
// acetylation and nanopore sequencing. Their shapes are read by hand from the source in a 100 × 100 box centred on 0,0
// and scaled onto a 512 page. The ions, the oxygen, the acetyl group, the phosphate, the DNA, the membrane and the pore
// are the shared parts; the nucleosome is the genetics part; the fatty acid, the steroid rings, the RNA hairpin and ring
// are drawn here in the same look (no part draws them). Only the usual abbreviations are lettered (ROS, Ac), as strokes; other labels
// became shapes.
// Usage: node mg06.mjs <folder>
import { PEACH, cellTypes, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft } from '../colour.mjs'
import { f } from '../shapes.mjs'
import { dna, ion, ligand, oxygen, phosphate } from '../parts/molecules.mjs'
import { ionChannel, LIPID, membraneWith } from '../parts/membranes.mjs'
import { plus } from '../parts/tissue.mjs'
import { lettering } from '../parts/letters.mjs'
import { nucleosome } from '../parts/genetics.mjs'

const OUT = process.argv[2]
const { cellType, check } = cellTypes(OUT)

// Hues of the set (OKLCH degrees): RNA rose 15, ions green 165 and cerulean 205, DNA blue 267, phosphate mustard 92.
const RNA = 15, ION = 165, SECOND_ION = 205, DNA = hueOf('#4f6bb8'), PHOSPHATE = 92
const STEROID = hueOf('#f3e3b8') // SiliCoDraw's pale gold, 90°
const SPARK = 65 // the unpaired electron of a radical: an orange 43° from the oxygen's red

const P2 = ([x, y]) => `${f(x)},${f(y)}`
/** An open line through page points, round ends. */
const stroke = (pts, colour, w, cap = 'round') => `<path d="M${pts.map(P2).join(' L')}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
/** A closed polygon through page points, filled and outlined. */
const poly = (pts, fill, s = '', w = 0) => `<path d="M${pts.map(P2).join(' L')}Z" fill="${fill}"${s ? ` stroke="${s}" stroke-width="${f(w)}" stroke-linejoin="round"` : ''}/>`
/** One merged result of several parts. */
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n') })

// Fatty acid: a carboxyl head and one hydrocarbon chain, drawn as the lipids of the membranes are (a peach head with its
// outline, the chain in the outline tone), with the chain as a zigzag of carbon bonds at their real angle (30° either
// side of the chain's axis).
// (SiliCoDraw writes "O" in the head; it is left out: the head alone says carboxyl group, as in every lipid of the set.
// Its head is peach and its chain orange, both of one hue (52°), so the molecule is one part here.)
{
  const g = page(4.45, [2.5, -2.2]), pal = LIPID
  const head = [-37, 0], r = 11.5, step = 13, n = 6, rise = step * Math.tan(Math.PI / 6)
  const chain = Array.from({ length: n + 1 }, (_, i) => [-25 + i * step, i % 2 ? -rise : 0])
  cellType('Fatty acid', [['fatty acid', pal]], g.grad('head-gradient', [head[0] - r, -r, head[0] + r, r], pal),
    `<g id="chain">${stroke([head, ...chain].map(g.P), pal.outline, 20)}</g>\n` +
      `<g id="head">${g.circle(head[0], head[1], r, 'url(#head-gradient)', pal.outline, 10)}${g.hl(head[0] - 4.6, -5, 12, 4.5, -45, pal.light)}</g>`)
}

// Steroid hormone: the four fused rings every steroid shares (three of six carbons, one of five), with the two methyl
// groups that stand up from the ring junctions.
// (Corrected: SiliCoDraw sets the first three rings in a zigzag; here they lie as the steroid skeleton is drawn in every
// textbook, A and B side by side, C above and right of B, D beside C, and the methyl groups stand at C10 and C13.)
{
  const pal = rich(STEROID), r = 13, s3 = r * Math.sqrt(3)
  const hex = ([cx, cy]) => Array.from({ length: 6 }, (_, i) => { const t = Math.PI / 6 + (i * Math.PI) / 3; return [cx + r * Math.cos(t), cy + r * Math.sin(t)] })
  const A = [0, 0], B = [s3, 0], C = [s3 * 1.5, -1.5 * r]
  // Ring D: a regular pentagon on ring C's right edge.
  const edge = r, apo = edge / (2 * Math.tan(Math.PI / 5)), R5 = edge / (2 * Math.sin(Math.PI / 5)), D = [C[0] + s3 / 2 + apo, C[1]]
  const pent = [144, 216, 288, 0, 72].map((a) => [D[0] + R5 * Math.cos((a * Math.PI) / 180), D[1] + R5 * Math.sin((a * Math.PI) / 180)])
  const rings = [hex(A), hex(B), hex(C), pent]
  const c10 = [s3 / 2, -r / 2], c13 = [C[0] + s3 / 2, C[1] - r / 2], up = 11
  const g = page(5.85, [(-s3 / 2 + D[0] + R5) / 2, (c13[1] - up + r) / 2])
  cellType('Steroid hormone', [['steroid', pal]], g.grad('steroid-gradient', [-s3 / 2, C[1] - r, D[0] + R5, r], pal),
    `<g id="rings">${rings.map((pts) => poly(pts.map(g.P), 'url(#steroid-gradient)')).join('')}` +
      `${g.hl(-3.5, -4.2, 22, 8, -40, pal.light)}${rings.map((pts) => poly(pts.map(g.P), 'none', pal.outline, 11)).join('')}</g>\n` +
      `<g id="methyl-groups">${[c10, c13].map(([x, y]) => stroke([g.P([x, y]), g.P([x, y - up])], pal.outline, 11)).join('')}</g>`)
}

// Ions: a cation and an anion (sodium and chloride), each a dot of the ions of the set with its charge in it, a plus
// and a minus drawn as strokes in the dot's palest tone.
// (SiliCoDraw writes "Na⁺" and "Cl⁻" in a blue and a pink circle; the element names are left out, the charges are
// drawn. The cation takes the green of every ion of the set, the anion the second kind's cerulean.)
{
  const g = page(5.75, [0, 2]), na = deep(ION), cl = deep(SECOND_ION)
  const a = ion(g, { x: -20, y: -10, size: 40, id: 'cation', pal: na }), b = ion(g, { x: 22, y: 16, size: 36, id: 'anion', second: true, pal: cl })
  const mark = 17, w = 13
  const p = plus(g, { x: -20, y: -10, size: mark, id: 'positive-charge', colour: na.light, w })
  const minus = `<g id="negative-charge">${stroke([g.P([22 - mark / 2 + w / 2 / g.k, 16]), g.P([22 + mark / 2 - w / 2 / g.k, 16])], cl.light, w)}</g>`
  const all = join(a, b, p)
  cellType('Ions', [['cation', na], ['anion', cl]], all.defs, all.body + '\n' + minus)
}

// Reactive oxygen species: one oxygen atom of the set (its deep red) carrying an unpaired electron, an orange dot that
// gives off sparks, with "ROS" written on it. The owner asked for one sphere with the letters (22 November 2026); the
// letters are drawn as strokes, not as text, so they look the same in every program and need no font.
// (SiliCoDraw draws two yellow atoms with "O" in each.)
{
  const g = page(4.95, [1.5, -1.5]), spark = deep(SPARK)
  const red = oxygen(g, { x: 0, y: 0, size: 60, id: 'probe' }).parts[0][1]
  const c = [-8, 8], R = 36
  const atom = ligand(g, { x: c[0], y: c[1], size: 2 * R, id: 'oxygen', pal: red, w: 11 })
  // The letters: strokes in the atom's outline tone (../parts/letters.mjs), set a little below the middle.
  const letters = lettering(g, { x: c[0], y: c[1] + 7, h: 20, text: 'ROS', colour: red.outline, id: 'letters' }).body
  const dot = [30, -30]
  const rays = [-95, -45, 5].map((a) => { const t = (a * Math.PI) / 180; return stroke([9.5, 17].map((d) => g.P([dot[0] + d * Math.cos(t), dot[1] + d * Math.sin(t)])), spark.small, 11) })
  cellType('Reactive oxygen species', [['oxygen', red], ['radical', spark]], atom.defs,
    atom.body + '\n' + letters + '\n' + `<g id="radical">${g.circle(dot[0], dot[1], 5.5, spark.small)}${rays.join('')}</g>`)
}

// MicroRNA hairpin: a precursor microRNA, one RNA strand folded back on itself into a paired stem (the base pairs as
// rungs) closed by a loop, with the phosphate at its 5′ end and the two bases the 3′ end overhangs.
// (SiliCoDraw's lilac is the nucleus's here; the strand is the rose of RNA, drawn as the RNA part draws it: a flat strand
// with its bases in the paler tone. Its two end circles become what the ends of a pre-miRNA carry: a phosphate on the
// 5′ end, and the lower strand runs on past the upper one, the 3′ overhang. The loop is round and wider than the stem.)
{
  const g = page(4.42, [0, 0]), pal = deep(RNA), T = 19
  const y = 11, lc = [31, 0], R = 17, neck = lc[0] - Math.sqrt(R * R - y * y)
  const a0 = Math.atan2(-y, neck - lc[0]), a1 = Math.atan2(y, neck - lc[0]) + 2 * Math.PI
  const loop = Array.from({ length: 41 }, (_, i) => { const t = a0 + ((a1 - a0) * i) / 40; return [lc[0] + R * Math.cos(t), lc[1] + R * Math.sin(t)] })
  const strand = [[-40, -y], ...loop, [-49, y]]
  const rungs = Array.from({ length: 8 }, (_, i) => -36 + i * 7.2).map((x) => stroke([g.P([x, -y]), g.P([x, y])], pal.base, T * 0.6, 'butt'))
  const p = phosphate(g, { x: -46.5, y: -y, size: 8.5, id: 'phosphate', pal: deep(PHOSPHATE) })
  cellType('MicroRNA hairpin', [['RNA', pal], ['phosphate', p.parts[0][1]]], '',
    `<g id="RNA"><g id="base-pairs">${rungs.join('')}</g>${stroke(strand.map(g.P), pal.small, T)}</g>\n` + p.body)
}

// Circular RNA: an RNA strand closed into a ring (by back-splicing), its bases turned inwards: the RNA part bent round.
// (SiliCoDraw's ring is lilac with fourteen beads on it; here it is the rose strand of RNA with its bases, which reads
// as a nucleic acid where beads did not.)
{
  const g = page(6.3, [0, 0]), pal = deep(RNA), T = 21, R0 = 33, waves = 9, amp = 1.6
  const at = (t) => { const r = R0 + amp * Math.sin(waves * t); return [r * Math.cos(t), r * Math.sin(t)] }
  const ring = Array.from({ length: 217 }, (_, i) => at(-Math.PI / 2 + (i * 2 * Math.PI) / 216))
  const ticks = Array.from({ length: 22 }, (_, i) => { const t = -Math.PI / 2 + ((i + 0.5) * 2 * Math.PI) / 22, [x, y] = at(t), u = [Math.cos(t), Math.sin(t)]; return stroke([g.P([x, y]), g.P([x - u[0] * 11, y - u[1] * 11])], pal.base, T * 0.6) })
  cellType('Circular RNA', [['RNA', pal]], '',
    `<g id="RNA"><g id="bases">${ticks.join('')}</g>${stroke(ring.map(g.P), pal.small, T)}</g>`)
}

// Histone acetylation: a nucleosome (the nucleosome part of ../parts/genetics.mjs: the histone core, lilac as chromatin
// is in the set, with DNA wound round it as a double helix) and a histone tail reaching out of it, whose end carries an
// acetyl group (a green dot lettered "Ac", as the part marks tails).
// (SiliCoDraw writes "Ac" in the green circle; here it is the part's lettered mark on the tail's end. The histone core is
// the lilac of chromatin, not SiliCoDraw's blue, which is the DNA's.)
{
  const g = page(4.6, [0, 0])
  const n = nucleosome(g, { x: 0, y: 0, size: 100, tails: ['Ac'], markSize: 2.2 })
  cellType('Histone acetylation', n.parts, n.defs, n.body)
}

// Nanopore sequencing: a protein pore in a membrane, and a DNA molecule whose double helix comes apart at the pore's
// mouth, one strand passing through the pore to the other side (the current through the pore reads its bases).
// (SiliCoDraw draws the membrane as a blue block with faint dots and the DNA as an orange wavy line; here the membrane is
// the lipid bilayer of the set and the pore its channel, and the DNA the blue double helix of the set, which passes as a
// single strand, as it does in a nanopore. The pore is cerulean, 62° from the DNA, so that the two recolour apart.)
{
  const g = page(4.43, [0, -1.6]), porePal = soft(SECOND_ION), dnaPal = deep(DNA)
  const m = membraneWith(g, { x: 0, y: 10, size: 100, thick: 32, id: 'membrane', proteins: [{ part: ionChannel, at: 0, id: 'pore', pal: porePal }] })
  const helix = dna(g, { x: 0, y: -33, size: 34, width: 15, turn: 90, id: 'DNA-helix', pal: dnaPal })
  const single = [[0, -16], [0, 32], ...Array.from({ length: 25 }, (_, i) => { const t = i / 24; return [3.2 * Math.sin(2 * Math.PI * 1.5 * t), 32 + 16 * t] })]
  cellType('Nanopore sequencing', [['membrane', LIPID], ['pore', porePal], ['DNA', dnaPal]], m.defs + helix.defs,
    m.body + '\n' + `<g id="DNA">${helix.body}<g id="DNA-single-strand">${stroke(single.map(g.P), dnaPal.outline, 11)}</g></g>`)
}

check()
console.log('written to', OUT)
