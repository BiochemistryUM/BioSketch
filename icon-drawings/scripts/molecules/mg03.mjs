// Eight icons of SiliCoDraw's "Molecules & genetics" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the approved shared parts
// (../parts/*.mjs): plasmid, chromosome, telomere, nucleosome, chromatin, transcription, RNA splicing and translation.
// Their composition is read by hand from the source in a 100 × 100 box centred on 0,0 and scaled onto a 512 page.
// DNA is the blue of the DNA part, chromosomes, chromatin and histones the lilac of every nucleus, RNA rose, free protein amber,
// the ribosome terracotta. Drawn here because no part draws them: the gene arrows of a plasmid map, the telomere caps on
// a chromosome, exons, an intron lariat and a growing
// polypeptide (see each icon). Nothing is lettered.
// Usage: node mg03.mjs <folder>
import { NUC, cellTypes, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft } from '../colour.mjs'
import { catmull, f, pathOf } from '../shapes.mjs'
import { chromatin, chromosome, circularDna, dna, protein, rna } from '../parts/molecules.mjs'
import { HUES, ribosome } from '../parts/organelles.mjs'
import { arrow } from '../parts/tissue.mjs'
import { nucleosome } from '../parts/genetics.mjs'

const OUT = process.argv[2]
const { cellType, check } = cellTypes(OUT)

// The hues of the batch (OKLCH degrees). DNA is the part's blue (267°); its genes on a plasmid map are SiliCoDraw's
// orange (57°) and a green (150°); telomeres the same orange; exons
// SiliCoDraw's blue (269°), introns rose (15°, RNA); the polypeptide amber (75°, protein).
const ORANGE = hueOf('#e3955a'), GENE2 = 150, EXON = hueOf('#6f86c8')
const RNA = 15, AMBER = 75

/** Joins the parts' { defs, body } into one. */
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n') })
/** Every part's [name, palette] for check(). */
const hues = (...ps) => ps.flatMap((p) => p.parts ?? [])
/** One gradient that lights every shape that uses it from its own top left. */
const boxGrad = (id, pal) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`
const ptsD = (pts) => `M${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' L')}`
const stroke = (d, colour, w, cap = 'round') => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
/** A rounded rectangle given in units, as a path on the page. */
const rrect = (g, x, y, w, h, r) => {
  const [x0, y0] = g.P([x, y]), W = w * g.k, H = h * g.k, R = Math.min(r * g.k, W / 2, H / 2)
  return `M${f(x0 + R)},${f(y0)} H${f(x0 + W - R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + W)},${f(y0 + R)} V${f(y0 + H - R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + W - R)},${f(y0 + H)} H${f(x0 + R)} A${f(R)},${f(R)} 0 0 1 ${f(x0)},${f(y0 + H - R)} V${f(y0 + R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + R)},${f(y0)} Z`
}
// Plasmid: a ring of double-stranded DNA with two genes marked round it as arrows, the way a plasmid map is drawn (one
// gene clockwise, one the other way).
// (SiliCoDraw draws the ring as a thin line with two thick arcs on it. Here the ring is the circular DNA part, the two
// strands wound round each other, and the genes lie just outside it as broad arrows, so the helix stays in view. The
// blue gene is orange and green here, because the DNA itself is blue.)
{
  const g = page(4.68, [0.8, -2]), gene1 = soft(ORANGE), gene2 = soft(GENE2)
  const ring = circularDna(g, { x: 0, y: 0, size: 70, id: 'DNA', twists: 9 })
  // A gene: a band round the ring from a0 to a1 (degrees, clockwise on the page), with an arrowhead at a1.
  const geneArrow = (id, a0, a1, R, band, pal) => {
    const dir = Math.sign(a1 - a0), headLen = 13 * dir, rad = (a) => (a * Math.PI) / 180
    const at = (a, r) => g.P([r * Math.cos(rad(a)), r * Math.sin(rad(a))])
    const arc = (r, from, to) => Array.from({ length: 33 }, (_, i) => at(from + ((to - from) * i) / 32, r))
    const neck = a1 - headLen
    const pts = [...arc(R + band / 2, a0, neck), at(neck, R + band / 2 + 4.5), at(a1, R), at(neck, R - band / 2 - 4.5), ...arc(R - band / 2, neck, a0)]
    return `<g id="${id}"><path d="${pathOf(pts)}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="8" stroke-linejoin="round"/></g>`
  }
  const genes = geneArrow('gene-1', -172, -68, 42.5, 7.5, gene1) + geneArrow('gene-2', 112, 8, 42.5, 7.5, gene2)
  const p = join(ring)
  cellType('Plasmid', [...hues(ring), ['gene 1', gene1], ['gene 2', gene2]],
    p.defs + g.grad('gene-1-gradient', [-46, -46, 10, 10], gene1) + g.grad('gene-2-gradient', [0, 0, 46, 46], gene2),
    p.body + '\n' + genes)
}

// Chromosome: a mitotic chromosome, two sister chromatids held together at the centromere (marked by a dot).
// (SiliCoDraw's chromosome is blue with a near-black centromere; here it is the chromosome part, the lilac of every
// nucleus, and the centromere is a dot in its outline tone.)
{
  const g = page(4.6, [0, 0]), SIZE = 97
  const c = chromosome(g, { x: 0, y: 0, size: SIZE, id: 'chromosome' })
  cellType('Chromosome', hues(c), c.defs,
    c.body + `\n<g id="centromere">${g.circle(0, 0, 4.4, NUC.outline)}</g>`)
}

// Telomere: a chromosome whose four ends (the telomeres) are marked orange.
// (SiliCoDraw puts an orange ball on each end of a blue chromosome. Here the ends of the chromatids themselves are
// orange, the telomere being the tip of the chromosome, not something stuck on it. The chromosome is the part, lilac.)
{
  const g = page(4.6, [0, 0]), telo = deep(ORANGE), SIZE = 97
  const c = chromosome(g, { x: 0, y: 0, size: SIZE, id: 'chromosome' })
  // The chromatids as the part draws them (chromosome() in ../parts/molecules.mjs: the same centre lines, pinch and
  // round ends), so that the caps lie exactly on their tips.
  const s = SIZE / 100, P = ([u, v]) => g.P([u * s, v * s])
  const pinch = (t) => 9.5 * (1 - 0.42 * Math.exp(-(((t - 0.5) / 0.09) ** 2)))
  const side = (cl) => {
    const n = cl.length, left = [], right = []
    for (let i = 0; i < n; i++) {
      const a = cl[Math.max(0, i - 1)], b = cl[Math.min(n - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]), [nx, ny] = [-(b[1] - a[1]) / l, (b[0] - a[0]) / l], h = pinch(i / (n - 1))
      left.push([cl[i][0] + nx * h, cl[i][1] + ny * h]); right.push([cl[i][0] - nx * h, cl[i][1] - ny * h])
    }
    return { left, right }
  }
  const halfRound = (c0, from) => { const a0 = Math.atan2(from[1] - c0[1], from[0] - c0[0]), r = Math.hypot(from[0] - c0[0], from[1] - c0[1]); return Array.from({ length: 11 }, (_, k) => { const a = a0 - (Math.PI * (k + 1)) / 12; return [c0[0] + r * Math.cos(a), c0[1] + r * Math.sin(a)] }) }
  const caps = [-1, 1].flatMap((sg) => {
    const cl = catmull([[-18, -40], [-9.5, -20], [-4.6, 0], [-9.5, 20], [-18, 40]].map(([u, v]) => [sg * u, v]), 16), { left, right } = side(cl)
    const n = cl.length, k = Math.round(0.1 * (n - 1))
    return [
      [...left.slice(0, k + 1), ...right.slice(0, k + 1).reverse(), ...halfRound(cl[0], right[0])],
      [...left.slice(n - 1 - k), ...halfRound(cl.at(-1), left.at(-1)), ...right.slice(n - 1 - k).reverse()],
    ]
  })
  cellType('Telomere', [...hues(c), ['telomeres', telo]], c.defs + boxGrad('telomere-gradient', { base: telo.base, shadow: telo.shadow }),
    c.body + `\n<g id="telomeres">${caps.map((pts) => `<path d="${pathOf(pts.map(P))}" fill="url(#telomere-gradient)"/>`).join('')}</g>` +
      `\n<g id="centromere">${g.circle(0, 0, 4.4, NUC.outline)}</g>`)
}

// Nucleosome: DNA wrapped almost twice round a core of eight histones (a short cylinder seen from above), with the
// linker DNA running in and out: the nucleosome part (../parts/genetics.mjs), DNA as its double helix, histones lilac.
// (SiliCoDraw's composition: a peach core, blue DNA. Here the core is the lilac of chromatin in the set, as in every
// nucleosome of the batches. SiliCoDraw's two dots on the core are left out.)
{
  const g = page(4.6, [0, 0])
  const n = nucleosome(g, { x: 0, y: 0, size: 100 })
  cellType('Nucleosome', hues(n), n.defs, n.body)
}

// Chromatin: "beads on a string", nucleosomes along a thread of DNA (the chromatin part with nucleosomes), set at a
// slant so that it fills the square.
// (SiliCoDraw draws peach beads on a blue thread; here it is the approved part, in the lilac of chromatin in the nucleus.)
{
  const g = page(4.6, [0, 1])
  const c = chromatin(g, { x: 0, y: 0, size: 118, turn: -32, nucleosomes: true, id: 'chromatin', width: 9 })
  cellType('Chromatin', hues(c), c.defs, c.body)
}

// Transcription: RNA polymerase (a protein) sitting on the DNA, with the new RNA strand coming out of it.
// (SiliCoDraw's polymerase and RNA are both green and its DNA two grey lines with rungs. Here the DNA is the DNA part,
// the polymerase the free protein (amber) and the RNA the RNA part with its bases (rose), so each is the colour it has
// in every other icon.)
{
  const g = page(4.79, [0, -7.4])
  const d = dna(g, { x: 0, y: 26, size: 96, width: 17, id: 'DNA' })
  const pol = protein(g, { x: -4, y: 12, size: 52, turn: 10, id: 'RNA-polymerase' })
  const r = rna(g, { x: 20, y: -27, size: 52, turn: -62, bases: true, waves: 2, id: 'RNA', width: 20 })
  const p = join(d, r, pol)
  cellType('Transcription', hues(d, pol, r), p.defs, [d.body, r.body, pol.body].join('\n'))
}

// RNA splicing: a pre-mRNA of three exons (blue blocks) and two introns (rose strands) above; the introns are cut out,
// one leaving as a lariat (a loop with a tail), and the exons are joined into the mRNA below.
// (SiliCoDraw draws the introns as an orange line and its lariat as an orange ring with a tail; here they are the rose
// of RNA, the introns of the pre-mRNA the RNA part. The arrow is the arrow part, in the outline tone of the exons.)
{
  const g = page(4.6, [0, -0.5]), exon = soft(EXON), intron = deep(RNA)
  const H = 17, ty = -33, by = 32
  const block = (x, y, w) => g.path(rrect(g, x - w / 2, y - H / 2, w, H, 4), 'url(#exon-gradient)', exon.outline, 7)
  const introns = [[-19.5, ty], [19.5, ty]].map(([x, y], i) => rna(g, { x, y, size: 21, waves: 1.5, width: 9, id: `intron-${i + 1}`, pal: intron }))
  const arr = arrow(g, { x: -12, y: -0.5, size: 31, turn: 90, id: 'arrow', colour: exon.outline })
  // The lariat: the cut-out intron, a loop closed on itself with a short tail.
  const lx = 23, ly = -2.5, lr = 8.5
  const loop = Array.from({ length: 49 }, (_, i) => { const a = Math.PI / 2 + (i / 48) * 2 * Math.PI * 0.93; return [lx + lr * Math.cos(a) * 1.05, ly + lr * Math.sin(a)] })
  const tail = catmull([[lx - 1, ly + lr], [lx + 3, ly + lr + 5], [lx + 9, ly + lr + 8]], 8)
  const lariat = `<g id="lariat">${stroke(ptsD([...loop.reverse(), ...tail.slice(1)].map(g.P)), intron.small, 9)}</g>`
  const exons = `<g id="exons">${[-39, 0, 39].map((x) => block(x, ty, 20)).join('')}${[-21, 0, 21].map((x) => block(x, by, 21)).join('')}</g>`
  cellType('RNA splicing', [['exons and arrow', exon], ['introns', intron]],
    boxGrad('exon-gradient', exon),
    introns.map((i) => i.body).join('') + '\n' + exons + '\n' + arr.body + '\n' + lariat)
}

// Translation: a ribosome reading an mRNA (its bases below the strand), with the new protein, a chain of amino acids,
// growing out of the large subunit.
// (SiliCoDraw's ribosome is pale blue over a blue small subunit; here it is the ribosome part, terracotta. The mRNA is
// the RNA part with its bases, in the rose the ribosome part gives its mRNA (352°, clear of the terracotta). The chain is
// amber, the protein colour of the set, its beads in two tones where SiliCoDraw has green and blue.)
{
  const g = page(4.6, [0, -3.8]), chain = rich(AMBER), mrnaPal = deep(HUES.rnaOnRibosome)
  const m = rna(g, { x: 0, y: 26, size: 100, bases: true, waves: 3, width: 12, id: 'mRNA', pal: mrnaPal })
  const rib = ribosome(g, { x: 0, y: 14, size: 66, id: 'ribosome' })
  const beads = [[0, -20], [-5, -27.5], [0, -34.5], [7, -39.5], [11, -46.5]]
  const r = 4.4
  const link = stroke(ptsD(catmull(beads, 8).map(g.P)), chain.outline, 6)
  const amino = beads.map(([x, y], i) => g.circle(x, y, r, i % 2 ? chain.small : 'url(#amino-acid-gradient)', chain.outline, 6)).join('')
  cellType('Translation', [...hues(rib), ['mRNA', mrnaPal], ['polypeptide', chain]],
    rib.defs + boxGrad('amino-acid-gradient', chain),
    m.body + '\n' + `<g id="polypeptide">${link}${amino}</g>` + '\n' + rib.body)
}

check()
console.log('written to', OUT)
