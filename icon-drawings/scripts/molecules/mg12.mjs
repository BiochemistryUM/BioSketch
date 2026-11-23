// Eight icons of SiliCoDraw's "Molecules & genetics" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David
// Carlsson; see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts in
// ../parts/: FRET, co-immunoprecipitation, yeast two-hybrid, genome browser, chromosome ideogram, sequence alignment,
// GSEA plot and dot plot. Their compositions are read by hand from the source in a 100 × 100 box centred on 0,0 and
// scaled onto a 512 page (`page` of ../cellkit.mjs). Proteins, the antibody, DNA, the chromosome and the arrows are the
// parts, and so are the fluorescent barrel with its glow (`fluorescentBarrel`, ../parts/complexes.mjs) and the gene and
// its binding site as blocks (`geneBlock`, ../parts/genetics.mjs); drawn here because no part draws them: a bead, the
// tracks of a genome browser, tiles of an alignment and the marks of two plots.
// Nothing is lettered: SiliCoDraw's labels (donor, acceptor, bead, bait, prey, BD, AD, UAS, reporter, ES, the letters of
// the bases and the stars under conserved columns) are left out or said by a shape (see each icon).
// Plots and tracks are kept simple, bold and wordless: coloured blocks stand for bases, no axis has a label.
// Usage: node mg12.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, NUC, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex } from '../colour.mjs'
import { f } from '../shapes.mjs'
import { antibody, chromosome, dna, protein } from '../parts/molecules.mjs'
import { arrow } from '../parts/tissue.mjs'
import { geneBlock } from '../parts/genetics.mjs'
import { fluorescentBarrel } from '../parts/complexes.mjs'

const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const { cellType, check } = cellTypes(OUT)

// Hues (OKLCH degrees), taken from SiliCoDraw's colours with `hueOf` unless said otherwise.
const DONOR = hueOf('#22c55e'), ACCEPTOR = hueOf('#ef4444'), LIGHT = hueOf('#60a5fa') // 150°, 25°, 255°
const BAIT_GREEN = hueOf('#cfe8d8'), PREY_PINK = hueOf('#f6d0dc'), PREY_LILAC = hueOf('#e9d5f3') // 158°, 357°, 315°
const YELLOW = hueOf('#fde68a'), ORANGE = hueOf('#e3955a'), GREEN = hueOf('#5fae8b'), BLUE = hueOf('#4f6bb8') // 96°, 57°, 163°, 267°
const RED = hueOf('#d64545'), PURPLE = hueOf('#b07cc6'), TEAL = 205 // 25°, 315°; TEAL: the binding domain (see Yeast two-hybrid)
// Greys (chroma below 0.012: they never join a part's hue). Arrows, axes and marks that are the colour of nothing are a
// true grey: the arrow part's own INK is a bluish slate within 36° of DNA blue.
const GREY = { light: toHex({ l: 0.985, c: 0, h: 0 }), base: toHex({ l: 0.93, c: 0.004, h: 255 }), shadow: toHex({ l: 0.82, c: 0.006, h: 255 }), small: toHex({ l: 0.72, c: 0.006, h: 255 }), outline: toHex({ l: 0.5, c: 0.008, h: 255 }) }
const INK = toHex({ l: 0.48, c: 0, h: 0 }), DARK = toHex({ l: 0.36, c: 0, h: 0 }), AXIS = toHex({ l: 0.62, c: 0, h: 0 })

const P2 = ([x, y]) => `${f(x)},${f(y)}`
const lineD = (pts) => `M${pts.map(P2).join(' L')}`
const stroke = (d, colour, w, cap = 'round') => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
/** Joins the { defs, body, parts } of several parts. */
const join = (...rs) => ({ defs: rs.map((r) => r.defs).join(''), body: rs.map((r) => r.body).join('\n'), parts: rs.flatMap((r) => r.parts ?? []) })
/** A rectangle of g units (x0, y0 to x1, y1) with corners rounded by r units, as a path on the page. */
const rectD = (g, [x0, y0, x1, y1], r) => roundPoly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(g.P), r * g.k)
/** A polygon of page points with its corners rounded by r (px) (as mg04). */
const roundPoly = (pts, r) => {
  const n = pts.length
  const toward = (a, b, d) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]), t = Math.min(d, l / 2) / l; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] }
  let d = ''
  for (let i = 0; i < n; i++) {
    const a = toward(pts[i], pts[(i - 1 + n) % n], r), b = toward(pts[i], pts[(i + 1) % n], r)
    d += `${i ? 'L' : 'M'}${P2(a)} Q${P2(pts[i])} ${P2(b)} `
  }
  return d + 'Z'
}
const polyD = (P) => `M${P.map(P2).join(' L')}Z`
/** A wave from a to b (g units): `waves` periods of amplitude `amp` across the straight line, as page points. */
const wave = (a, b, waves, amp, n = 80) => {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]], l = Math.hypot(dx, dy), [nx, ny] = [-dy / l, dx / l]
  return Array.from({ length: n + 1 }, (_, i) => { const t = i / n, s = amp * Math.sin(2 * Math.PI * waves * t) * Math.min(1, (1 - t) * 6); return [a[0] + dx * t + nx * s, a[1] + dy * t + ny * s] })
}

// FRET: a donor (green) and an acceptor (red) fluorescent protein side by side. Blue light excites the donor, the energy
// passes to the acceptor (the grey arrow), and the acceptor glows and gives off red light.
// (SiliCoDraw draws two discs with "donor" and "acceptor" under them, an arrow between them and two pairs of strokes for
// the light. Here the two fluorophores are the fluorescent protein part, as GFP in mg05, which is how FRET sensors are
// built; the labels are left out: the light coming in is blue and the light going out red, so the order says which is
// which. Only the acceptor glows, since the donor hands its energy on.)
{
  const g = page(4.51, [1, -2.9]), donor = deep(DONOR), acceptor = deep(ACCEPTOR), light = deep(LIGHT)
  const d = fluorescentBarrel(g, { x: -25, y: 14, size: 45.6, w: 8, pal: donor, id: 'donor', name: 'donor' })
  const a = fluorescentBarrel(g, { x: 25, y: 14, size: 45.6, w: 8, pal: acceptor, id: 'acceptor', name: 'acceptor', glow: true, glowSize: 54 })
  const transfer = arrow(g, { x: 0, y: 16, size: 17, colour: INK, w: 7, id: 'energy-transfer' })
  const inLight = arrow(g, { points: wave([-49, -44], [-28, -12], 2, 2.6), corners: true, colour: light.outline, w: 7, id: 'excitation' })
  const outLight = arrow(g, { points: wave([30, -14], [49, -44], 2, 2.6), corners: true, colour: acceptor.outline, w: 7, id: 'emission' })
  const all = join(d, a, transfer, inLight, outLight)
  cellType('FRET', [['donor', donor], ['acceptor', acceptor], ['light', light]], all.defs, all.body)
}

/** A point (u, v) of a part's frame turned by `deg` (clockwise, as SVG) about 0,0. */
const rot = ([u, v], deg) => { const a = (deg * Math.PI) / 180; return [u * Math.cos(a) - v * Math.sin(a), u * Math.sin(a) + v * Math.cos(a)] }
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k]
const unit = ([u, v]) => { const l = Math.hypot(u, v); return [u / l, v / l] }

// =====================================================================================================================
// A bead (drawn here; no part has one): a grey sphere (agarose or magnetic bead), gradient, outline and highlight. Grey,
// so it never recolours with a protein. r in g units; w in px.
// =====================================================================================================================
const bead = (g, { x, y, r, id = 'bead', w = 10 }) => ({
  defs: g.grad(`${id}-gradient`, [x - r, y - r, x + r, y + r], GREY),
  body: `<g id="${id}">${g.circle(x, y, r, `url(#${id}-gradient)`, GREY.outline, w)}${g.hl(x - r * 0.42, y - r * 0.45, f(r * g.k * 0.3), f(r * g.k * 0.1), -45, GREY.light)}</g>`,
  parts: [],
})

// Co-immunoprecipitation: an antibody held on a bead pulls down its target (the bait, green) and, with it, the protein
// bound to the bait (the prey, pink).
// (SiliCoDraw writes "bead", "bait" and "prey" and draws a small blue antibody on a grey disc. Here the labels are left
// out: the bead is a grey sphere drawn here, the antibody is the antibody part (amber, as every antibody of the set),
// its stem set into the bead, the bait and the prey are the protein part in SiliCoDraw's green and pink.)
{
  const g = page(4.79, [0.8, 2]), bait = soft(BAIT_GREEN), prey = soft(PREY_PINK)
  const B = [-22, 20], R = 24, turn = 30, size = 46, s = size / 100
  const axis = unit(rot([0, -1], turn)), stemEnd = add(B, axis, R - 3), centre = add(stemEnd, rot([0, 42 * s], turn), -1)
  const hinge = add(centre, rot([0, 4 * s], turn)), tip = add(centre, rot([30 * s, -36 * s], turn)), dir = unit([tip[0] - hinge[0], tip[1] - hinge[1]])
  const ab = antibody(g, { x: centre[0], y: centre[1], size, turn })
  const bt = add(tip, dir, 12), baitPart = protein(g, { x: bt[0], y: bt[1], size: 28, turn: 20, id: 'bait', pal: bait })
  const pr = add(bt, unit([0.3, 0.95]), 24), preyPart = protein(g, { x: pr[0], y: pr[1], size: 26, turn: -70, id: 'prey', pal: prey })
  const all = join(ab, bead(g, { x: B[0], y: B[1], r: R }), preyPart, baitPart)
  cellType('Co-immunoprecipitation', [['antibody', ab.parts[0][1]], ['bait', bait], ['prey', prey]], all.defs, all.body)
}

// Yeast two-hybrid: the DNA-binding domain (teal) sits on its binding site (UAS, orange) and carries the bait (pink); the
// prey (lilac) carries the activation domain (yellow). When bait and prey bind, the activation domain comes to the
// reporter gene (green) and it is switched on (the bent arrow).
// (SiliCoDraw letters BD, bait, prey, AD, UAS and "reporter". Here the labels are left out and the colours keep them
// apart; the reporter is the gene part (an arrow-shaped block) and the UAS the same part with square ends; the reporter's
// being read is the bent arrow of the parts, grey, instead of an arrow along the DNA. The DNA is the DNA part. SiliCoDraw's binding domain is the green of the
// reporter: it is teal (205°) here, so that the two recolour apart.)
{
  const g = page(4.6, [0, 1.3])
  const uasPal = soft(ORANGE), repPal = soft(GREEN), bdPal = soft(TEAL), baitPal = soft(PREY_PINK), preyPal = soft(PREY_LILAC), adPal = rich(YELLOW)
  const helix = dna(g, { x: 0, y: 33, size: 98, width: 12, turns: 5, id: 'DNA' })
  const uas = geneBlock(g, { x: -25, y: 33, size: 26, height: 14, pal: uasPal, w: 8, pointed: false, id: 'UAS' })
  const rep = geneBlock(g, { x: 22, y: 33, size: 40, height: 16, pal: repPal, w: 8, id: 'reporter' })
  const bd = protein(g, { x: -25, y: 12, size: 28, turn: 10, id: 'binding-domain', pal: bdPal })
  const bt = protein(g, { x: -19, y: -14, size: 31, turn: 100, id: 'bait', pal: baitPal })
  const pr = protein(g, { x: 7, y: -25, size: 31, turn: 200, id: 'prey', pal: preyPal })
  const ad = protein(g, { x: 15, y: -1, size: 26, turn: -60, id: 'activation-domain', pal: adPal })
  const on = arrow(g, { points: [[33, 23], [33, 11], [46, 11]], corners: true, colour: INK, w: 7, id: 'transcription' })
  const all = join(helix, uas, rep, bd, bt, pr, ad, on)
  cellType('Yeast two-hybrid', [['DNA', helix.parts[0][1]], ['UAS', uasPal], ['reporter', repPal], ['binding domain', bdPal], ['bait', baitPal], ['prey', preyPal], ['activation domain', adPal]], all.defs, all.body)
}

// =====================================================================================================================
// A coverage track (drawn here): bars side by side as one stepped area on a base line, gradient, outline in the track's
// tone. heights in g units, from x0 to x1 above `base`.
// =====================================================================================================================
const coverage = (g, { id, x0, x1, base, heights, pal, w }) => {
  const n = heights.length, step = (x1 - x0) / n, pts = [[x0, base]]
  heights.forEach((h, i) => { pts.push([x0 + i * step, base - h], [x0 + (i + 1) * step, base - h]) })
  pts.push([x1, base])
  const top = base - Math.max(...heights)
  return {
    defs: g.grad(`${id}-gradient`, [x0, top, x1, base], pal),
    body: `<g id="${id}"><path d="${roundPoly(pts.map(g.P), 1.2 * g.k)}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="${f(w)}" stroke-linejoin="round"/></g>`,
    parts: [[id, pal]],
  }
}

// Genome browser: three tracks along one stretch of the genome: two coverage tracks (blue, green: reads piled up, peaks
// where there are more) over a gene model (orange exons joined by the grey line of the introns).
// (SiliCoDraw draws separate thin bars on hairline axes. Here each coverage track is one stepped area with an outline,
// so it reads at 40 px; the bars keep SiliCoDraw's heights; the gene model keeps its four exons.)
{
  const g = page(4.83, [0, 0]), t1 = deep(BLUE), t2 = deep(GREEN), exon = soft(ORANGE)
  const a = coverage(g, { id: 'coverage-1', x0: -44, x1: 44, base: -14, heights: [4, 10, 16, 8, 12, 18, 6].map((h) => h * 1.6), pal: t1, w: 7 })
  const b = coverage(g, { id: 'coverage-2', x0: -44, x1: 44, base: 16, heights: [6, 12, 20, 10, 16, 8].map((h) => h * 1.15), pal: t2, w: 7 })
  const bases = `<g id="track-lines">${[-14, 16].map((y) => g.line([[-47, y], [47, y]], AXIS, 5)).join('')}</g>`
  const intron = `<g id="intron">${g.line([[-46, 36], [46, 36]], INK, 6)}</g>`
  const exons = [[-42, 10], [-20, 15], [8, 10], [28, 13]].map(([x, wd], i) => ({ defs: g.grad(`exon-${i + 1}-gradient`, [x, 29, x + wd, 43], exon), body: `<path d="${rectD(g, [x, 29, x + wd, 43], 2)}" fill="url(#exon-${i + 1}-gradient)" stroke="${exon.outline}" stroke-width="7" stroke-linejoin="round"/>`, parts: [] }))
  const ex = join(...exons)
  const all = join(a, b, { defs: '', body: bases }, { defs: '', body: intron }, { defs: ex.defs, body: `<g id="exons">${ex.body}</g>` })
  cellType('Genome browser', [['coverage 1', t1], ['coverage 2', t2], ['exons', exon]], all.defs, all.body)
}

// Chromosome ideogram: one chromosome drawn as a banded rod, pinched at the centromere, a red arrow marking a locus on a band.
// (SiliCoDraw draws a pale grey rod with dark bands. Here it is the chromosome part, one chromatid with its bands, in
// the lilac of every chromosome of the set; the arrow is the arrow part in SiliCoDraw's red.)
{
  const g = page(4.43, [9, 0]), red = deep(RED)
  const x = -8, size = 96, s = size / 100, dark = deep(hueOf(NUC.base))
  const chr = chromosome(g, { x, y: 0, size, chromatids: 1, bands: true })
  // The part draws four pale bands; an ideogram is known by its banding, so more bands are laid over the rod here, some
  // pale (the part's tone) and some dark, across the rod's full width. Where a band lies along the rod and how wide the
  // rod is there are worked out as the part does (`chromosome` with one chromatid: a centre line from -40 to 40 drawn
  // through `catmull`, so a share t of its points lies at t/2 + 1.5t² - t³ of its length; half width 12, pinched by
  // 0.42 at the middle).
  const along = (t) => -40 + 80 * (t / 2 + 1.5 * t * t - t ** 3), half = (t) => 12 * (1 - 0.42 * Math.exp(-(((t - 0.5) / 0.09) ** 2)))
  const band = ([t0, t1], fill) => {
    const ts = Array.from({ length: 7 }, (_, i) => t0 + ((t1 - t0) * i) / 6)
    return `<path d="${polyD([...ts.map((t) => [-half(t), along(t)]), ...ts.reverse().map((t) => [half(t), along(t)])].map(([u, v]) => g.P([x + u * s, v * s])))}" fill="${fill}"/>`
  }
  const extra = `<g id="chromosome-more-bands">${[[0.05, 0.085], [0.22, 0.25], [0.745, 0.775], [0.925, 0.955]].map((b) => band(b, NUC.small)).join('')}${[[0.13, 0.19], [0.39, 0.43], [0.585, 0.62], [0.66, 0.72], [0.8, 0.88]].map((b) => band(b, dark.small)).join('')}</g>`
  const locus = arrow(g, { x: 27, y: along(0.69) * s, size: 24, turn: 180, colour: red.outline, w: 10, id: 'locus' })
  const all = join(chr, { defs: '', body: extra }, locus)
  cellType('Chromosome ideogram', [['chromosome', NUC], ['locus', red]], all.defs, all.body)
}

// Sequence alignment: four sequences one above the other, every base a coloured tile (A green, C blue, G orange, T red),
// and under every column a grey bar as tall as the column is conserved.
// (SiliCoDraw letters every tile and puts a star under each conserved column. Here the letters are left out, the colours
// say the base, and the stars are bars: tall under a column where all four agree, short where three do. T is moved from
// SiliCoDraw's red (25°) to 10° and G from its orange to 52°, so that the two recolour apart.)
{
  const g = page(4.98, [0, 0]), rows = ['ACGTTGCA', 'ACGATGCA', 'ACGTTGGA', 'ATGTTGCA']
  const pal = { A: deep(GREEN), C: deep(BLUE), G: deep(52), T: deep(10) }
  const x0 = -46, pitch = 11.75, tile = 10, y0 = -44, rowPitch = 14.5, tileH = 12.5
  const tiles = Object.keys(pal).map((ch) => `<g id="${ch}">${rows.flatMap((r, i) => [...r].map((c, j) => (c === ch ? `<path d="${rectD(g, [x0 + j * pitch, y0 + i * rowPitch, x0 + j * pitch + tile, y0 + i * rowPitch + tileH], 2.2)}" fill="${pal[ch].small}"/>` : ''))).join('')}</g>`).join('')
  const agree = [...rows[0]].map((_, j) => { const n = {}; rows.forEach((r) => (n[r[j]] = (n[r[j]] ?? 0) + 1)); return Math.max(...Object.values(n)) })
  const bars = `<g id="conservation">${agree.map((k, j) => `<path d="${rectD(g, [x0 + j * pitch, 44 - (k === 4 ? 22 : 9), x0 + j * pitch + tile, 44], 2.2)}" fill="${AXIS}"/>`).join('')}</g>`
  cellType('Sequence alignment', [['A', pal.A], ['C', pal.C], ['G', pal.G], ['T', pal.T]], '', tiles + '\n' + bars)
}

// GSEA plot: the running enrichment score climbs to its peak while the genes of the set (the barcode below) crowd at the
// top of the ranked list, then falls back.
// (SiliCoDraw writes "ES" over the peak. Here the label is left out; the area under the curve is filled, so the peak
// reads at 40 px.)
{
  const g = page(4.72, [0, 0]), pal = soft(GREEN), line = deep(GREEN), base = 10
  const bez = (p, t) => [0, 1].map((k) => (1 - t) ** 3 * p[0][k] + 3 * (1 - t) ** 2 * t * p[1][k] + 3 * (1 - t) * t ** 2 * p[2][k] + t ** 3 * p[3][k])
  const Y = (y) => (y - 16) * 1.2 + base
  const segs = [[[-44, 16], [-30, -30], [-10, -34], [4, -16]], [[4, -16], [14, -4], [30, 10], [44, 16]]].map((s) => s.map(([x, y]) => [x * 1.04, Y(y)]))
  const curve = segs.flatMap((s, i) => Array.from({ length: 31 }, (_, k) => bez(s, k / 30)).slice(i ? 1 : 0))
  const area = `<path d="${polyD(curve.map(g.P))}" fill="url(#score-gradient)"/>`
  const score = `<g id="enrichment-score">${area}${stroke(lineD(curve.map(g.P)), line.outline, 10)}</g>`
  const baseline = `<g id="baseline">${g.line([[-48, base], [48, base]], AXIS, 5)}</g>`
  const ticks = [-40, -36, -34, -30, -28, -22, -18, -16, -10, -6, 0, 8, 14, 24, 32, 40].map((x) => g.line([[x * 1.04, 21], [x * 1.04, 41]], DARK, 8)).join('')
  cellType('GSEA plot', [['score', pal]], g.grad('score-gradient', [-46, -36, 46, base], pal), `${score}\n${baseline}\n<g id="gene-set">${ticks}</g>`)
}

// Dot plot: markers (rows) against groups of cells (columns); a dot's size is the share of cells that express the
// marker, its colour how strongly (blue low, purple, red high).
// (As SiliCoDraw, without its see-through dots: solid dots in three palettes, on grey axes.)
{
  const g = page(5.0, [1.1, 0]), low = deep(BLUE), mid = deep(PURPLE), high = deep(RED)
  const sz = [[2, 4, 6, 3], [5, 2, 3, 7], [3, 6, 2, 4], [7, 3, 5, 2]]
  const pick = (v) => (v > 4 ? high : v > 2 ? mid : low)
  const dots = [low, mid, high].map((p, k) => `<g id="${['low', 'middle', 'high'][k]}">${sz.flatMap((row, r) => row.map((v, c) => (pick(v) === p ? g.circle(-26 + c * 20, -30 + r * 20, v * 1.35, p.small) : ''))).join('')}</g>`).join('')
  const axes = `<g id="axes">${g.line([[-44, -44], [-44, 44], [46, 44]], AXIS, 7)}</g>`
  cellType('Dot plot', [['low', low], ['middle', mid], ['high', high]], '', axes + '\n' + dots)
}

check()
console.log('written to', OUT)
