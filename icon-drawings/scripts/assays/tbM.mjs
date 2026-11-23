// Eight icons of SiliCoDraw's "Techniques & assays" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts: the wire
// hang test, 16S amplicon sequencing, a metagenome, multi-omics, a phylogenetic tree, a pipeline, a biobank and an
// organ-on-a-chip. Compositions read by hand from the source in a 100 × 100 box centred on 0,0 and scaled onto a 512 page
// (`page` of ../cellkit.mjs); outlines at 60 %; the gloss of cells on the bacteria.
// Parts used: labMouse, instrument, tube, hazardSymbol, METAL, GLASS, PLASTIC, PAPER, PINK, ACCENT, INK (lab.mjs);
// SERIES (assays.mjs); bacterium, cell, arrow (tissue.mjs); dna, rna, protein (molecules.mjs); polygon (formula.mjs);
// gloss (surfaces.mjs); lettering (letters.mjs).
// Drawn here because no part draws them: the wire and posts of the hang test, its padded floor, the mouse's forelimbs
// and a stopwatch; the 16S gene with its variable regions, primers and amplicons; a spirillum, sequencing reads and
// contigs; the layers of multi-omics; the branches of a tree; the steps of a pipeline; the chip with its channels.
// Lettered (strokes): "16S", the step numbers "1", "2", "3", and the freezer's "-80" (by the instrument part).
// Usage: node tbM.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss } from '../cellkit.mjs'
import { deep, rich, soft, toLch } from '../colour.mjs'
import { f, setStrokeScale, strokeScale } from '../shapes.mjs'
import { ACCENT, GLASS, INK, METAL, PAPER, PINK, hazardSymbol, instrument, labMouse, tube } from '../parts/lab.mjs'
import { arrow, bacterium, cell } from '../parts/tissue.mjs'
import { dna, protein, rna } from '../parts/molecules.mjs'
import { polygon } from '../parts/formula.mjs'
import { gloss, glossTones, pathPoints } from '../parts/surfaces.mjs'
import { lettering } from '../parts/letters.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012: the materials) are left out of the hue check, as the conventions of lab.mjs say.
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p]) => toLch(p.base).c >= 0.012), defs, body)
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts) })
const icon = (name, { defs, body, parts }) => cellType(name, parts.filter(([, p], i) => parts.findIndex(([, q]) => q.base === p.base) === i), defs, body)
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })
/** A rounded rectangle given in g's units, as a path on the page. */
const rrect = (g, x0, y0, x1, y1, r) => {
  const [a, b] = g.P([x0, y0]), W = (x1 - x0) * g.k, H = (y1 - y0) * g.k, R = Math.min(r * g.k, W / 2, H / 2)
  return `M${f(a + R)},${f(b)} H${f(a + W - R)} A${f(R)},${f(R)} 0 0 1 ${f(a + W)},${f(b + R)} V${f(b + H - R)} A${f(R)},${f(R)} 0 0 1 ${f(a + W - R)},${f(b + H)} H${f(a + R)} A${f(R)},${f(R)} 0 0 1 ${f(a)},${f(b + H - R)} V${f(b + R)} A${f(R)},${f(R)} 0 0 1 ${f(a + R)},${f(b)} Z`
}
/** Letters whose strokes keep their width under the 60 % outlines. */
const letters = (g, x, y, h, text, colour, id) => lettering(g, { x, y, h, text, colour, w: (0.2 * h * g.k) / strokeScale(), id }).body
/** A bar: a line drawn twice, outline then fill (w in page pixels). */
const bar = (g, pts, pal, wd, ow = 4) => g.line(pts, pal.outline, wd + 2 * ow) + g.line(pts, pal.base, wd)

/** The gloss of cells on a part's body (as tbF): the first path filled with a gradient gets the face-on tones. */
const glossPal = (pal) => ({ ...pal, shadow: glossTones(pal).end })
const glossed = (part, pal, px) => {
  if (px < 40) return part
  const m = /<(path|rect|circle) ([^>]*?)fill="url\(#[^)]+\)" stroke="[^"]+" stroke-width="([\d.]+)"[^>]*\/>/.exec(part.body)
  if (!m) return part
  const a = (k) => +(new RegExp(`(?:^|\\s)${k}="([^"]+)"`).exec(m[2])?.[1] ?? 0)
  // A rect or circle is walked round as a polygon, so that `gloss` can read it like a path.
  const round = (cx, cy, rx, ry, hw, hh) => Array.from({ length: 72 }, (_, i) => {
    const t = (i / 72) * 2 * Math.PI, c = Math.cos(t), s = Math.sin(t)
    return [cx + Math.sign(c) * hw + rx * c, cy + Math.sign(s) * hh + ry * s]
  })
  const pts = m[1] === 'circle' ? round(a('cx'), a('cy'), a('r'), a('r'), 0, 0)
    : m[1] === 'rect' ? (() => { const r = a('rx'), x = a('x'), y = a('y'), W = a('width'), H = a('height'); return round(x + W / 2, y + H / 2, r, r, W / 2 - r, H / 2 - r) })()
    : null
  const d = pts ? `M${pts.map((q) => q.map(f).join(',')).join(' L')} Z` : /d="([^"]+)"/.exec(m[2])[1]
  const G = gloss({ fills: [pathPoints(d)] }, { inset: (+m[3] * strokeScale()) / 2 }), T = glossTones(pal)
  const tones = ['shade', 'shadow', ...(px >= 90 ? ['lit', 'highlight'] : [])].map((k) => (G[k] ? `<path d="${G[k]}" fill="${T[k]}"/>` : '')).join('')
  return { ...part, body: part.body.replace(/<ellipse[^>]*\/>/g, '').replace(m[0], m[0] + tones) }
}

const BLUE_ = ACCENT // conserved DNA, the first microbe, the genome
const ORANGE = soft(58) // variable regions, the second microbe, the proteome
const GREEN = soft(150) // the third microbe, the transcriptome
const VIOLET = soft(315) // the metabolome

// ---------------------------------------------------------------------------------------------------------------------
// Wire hang test: a mouse hanging by its forepaws from a wire stretched between two posts, its hind legs dangling, a
// padded floor under it and a stopwatch for the time it holds on.
// (SiliCoDraw: the same scene, the mouse grey; here the lab mouse part turned upright, the floor a soft blue pad.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.75, [0, 0]), w = 7, PAD = soft(225)
  const posts = [-42, 42].map((x) => g.path(rrect(g, x - 3.5, -44, x + 3.5, 38, 2), 'url(#post-gradient)', METAL.outline, w)).join('')
  const wire = g.line([[-40, -38], [40, -38]], METAL.outline, 10) + g.line([[-40, -38], [40, -38]], METAL.light, 4.5)
  const pad = g.path(rrect(g, -47, 36, 47, 46, 4), 'url(#pad-gradient)', PAD.outline, w) +
    [-30, -4, 22].map((x) => g.line([[x, 41.5], [x + 4, 40], [x + 8, 41.5]], PAD.outline, 3.5)).join('')
  const mouse = labMouse(g, { x: -6, y: -4, size: 62, turn: 90, id: 'mouse' })
  // forelimbs from the chest up to the wire, the paws round it
  const arm = (a, b) => g.line([a, b], PINK.outline, 9) + g.line([a, b], PINK.shadow, 4.5) + g.circle(b[0], b[1] + 0.6, 2.3, PINK.shadow, PINK.outline, 3)
  const arms = arm([-16, -24], [-19, -38]) + arm([-9, -26], [-8, -38])
  const sw = [28, 6], R = 11
  const watch = g.path(rrect(g, sw[0] - 3, sw[1] - R - 6, sw[0] + 3, sw[1] - R + 1, 1), METAL.base, METAL.outline, 5) +
    g.circle(sw[0], sw[1], R, METAL.base, METAL.outline, w) + g.circle(sw[0], sw[1], R - 3, PAPER.base, METAL.outline, 3.5) +
    g.line([[sw[0], sw[1] - 5.5], [sw[0], sw[1]], [sw[0] + 4.5, sw[1] + 2.5]], ACCENT.outline, 5) + g.circle(sw[0], sw[1], 1.4, ACCENT.outline)
  icon('Wire hang test', join(
    own('posts', posts, [], g.grad('post-gradient', [-46, -44, 46, 38], METAL)), own('wire', wire),
    own('floor-pad', pad, [['floor pad', PAD]], g.grad('pad-gradient', [-47, 36, 47, 46], PAD)),
    own('forelimbs', arms), mouse, own('stopwatch', watch, [['stopwatch hands', ACCENT]])))
}

// ---------------------------------------------------------------------------------------------------------------------
// 16S amplicon: the 16S rRNA gene, conserved stretches in blue and the variable regions V3 and V4 in orange, a primer on
// each side of them, and below the amplicons copied from that stretch, each with the coloured barcode of its sample.
// (SiliCoDraw: the same, the amplicons orange bars; here each amplicon repeats the regions it holds.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.75, [0, -1]), w = 6
  const pill = g.path(rrect(g, -17, -46, 17, -31, 7.5), BLUE_.light, BLUE_.outline, w) + letters(g, 0, -38.5, 8, '16S', BLUE_.outline, 'name')
  const slots = 9, s = 92 / slots, x0 = -46, VAR = [2, 4]
  const gene = g.path(rrect(g, -46, -24, 46, -11, 4), 'url(#gene-gradient)', BLUE_.outline, w) +
    Array.from({ length: slots }, (_, i) => g.path(rrect(g, x0 + i * s + 2, -21.5, x0 + (i + 1) * s - 2, -13.5, 1.2), VAR.includes(i) ? ORANGE.small : BLUE_.light, VAR.includes(i) ? ORANGE.outline : BLUE_.outline, 4)).join('')
  const fwd = arrow(g, { points: [[x0 + 1.2 * s, -5], [x0 + 2 * s, -5]], colour: INK, w: 7, id: 'forward-primer' })
  const rev = arrow(g, { points: [[x0 + 5.8 * s, -5], [x0 + 5 * s, -5]], colour: INK, w: 7, id: 'reverse-primer' })
  const CODES = [deep(150), rich(102), deep(325), deep(150)]
  const amp = (y, i) => {
    const a = -24, b = 30, n = 4, t = (b - a) / n
    return g.path(rrect(g, a, y - 3.5, b, y + 3.5, 2), BLUE_.base, BLUE_.outline, 6) +
      [1, 3].map((j) => g.path(`M${f(g.X(a + j * t))},${f(g.Y(y - 3.5))} H${f(g.X(a + (j + 1) * t - 1.5))} V${f(g.Y(y + 3.5))} H${f(g.X(a + j * t))} Z`, ORANGE.small, ORANGE.outline, 4)).join('') +
      g.path(rrect(g, a - 9, y - 3.5, a - 1, y + 3.5, 1.5), CODES[i].base, CODES[i].outline, 6)
  }
  const fan = g.line([[x0 + 1.2 * s, 0], [-33, 6]], INK, 5) + g.line([[x0 + 5.8 * s, 0], [30, 6]], INK, 5)
  const amps = [12, 21, 30, 39].map((y, i) => amp(y, i)).join('')
  icon('16S amplicon', join(own('16S', pill, [['gene', BLUE_]]), own('gene', gene, [['variable regions', ORANGE]], g.grad('gene-gradient', [-46, -24, 46, -11], BLUE_)), fwd, rev, own('copies', fan),
    own('amplicons', amps, [['barcode 1', CODES[0]], ['barcode 2', CODES[1]], ['barcode 3', CODES[2]]])))
}

// ---------------------------------------------------------------------------------------------------------------------
// Metagenome: a rod, a pair of cocci and a spirillum from one sample, sequenced together into many short reads of every
// microbe, and the reads assembled into long contigs.
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.75, [0, 0]), w = 6
  const rod = glossed(bacterium(g, { x: -29, y: -33, size: 30, flagellum: false, granules: false, pal: glossPal(BLUE_), id: 'rod' }), BLUE_, 30 * g.k)
  const c1 = glossed(bacterium(g, { x: -2, y: -36, size: 15, shape: 'coccus', granules: false, pal: glossPal(ORANGE), id: 'coccus-1' }), ORANGE, 15 * g.k)
  const c2 = glossed(bacterium(g, { x: 11, y: -31, size: 15, shape: 'coccus', granules: false, pal: glossPal(ORANGE), id: 'coccus-2' }), ORANGE, 15 * g.k)
  const spi = Array.from({ length: 25 }, (_, i) => [24 + i, -33 - 5 * Math.sin((i / 24) * 2.2 * Math.PI)])
  const spirillum = own('spirillum', bar(g, spi, { ...GREEN, base: GREEN.small }, 30, 6), [['spirillum', GREEN]])
  const down = arrow(g, { points: [[0, -21], [0, -9]], colour: INK, w: 13, id: 'sequencing' })
  const P = [BLUE_, ORANGE, GREEN]
  const rows = [[[-46, -36, 1], [-31, -23, 0], [-18, -6, 2], [-1, 9, 0], [14, 22, 1], [27, 37, 2]],
    [[-44, -34, 2], [-29, -18, 1], [-13, -4, 0], [1, 13, 2], [18, 27, 0], [32, 44, 1]],
    [[-46, -38, 0], [-33, -22, 2], [-17, -8, 1], [-3, 7, 0], [12, 23, 1], [28, 36, 2]]]
  const reads = rows.map((r, j) => r.map(([a, b, c]) => g.line([[a + 2, -1 + 8 * j], [b - 2, -1 + 8 * j]], P[c].outline, 32) + g.line([[a + 2, -1 + 8 * j], [b - 2, -1 + 8 * j]], P[c].small, 20)).join('')).join('')
  const contig = (a, b, y, p) => g.path(rrect(g, a, y - 4, b, y + 4, 4), p.small, p.outline, 7)
  const contigs = contig(-44, -6, 27, BLUE_) + contig(2, 44, 27, ORANGE) + contig(-22, 22, 38, GREEN)
  icon('Metagenome', join(rod, c1, c2, spirillum, down, own('reads', reads), own('contigs', contigs)))
}

// ---------------------------------------------------------------------------------------------------------------------
// Multi-omics: the layers of one sample stacked, from the genome (a DNA helix) through the transcriptome (RNA) and the
// proteome (a protein) to the metabolome (a small ring molecule), read from top to bottom along the arrow.
// (SiliCoDraw writes the name in each layer; here each layer carries what it measures.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.75, [0, 0]), w = 6
  const layer = (y, p, i) => {
    const pts = [[-46, y], [-6, y - 11], [34, y], [-6, y + 11]]
    return g.path(`M${pts.map((q) => g.P(q).map(f).join(',')).join(' L')} Z`, `url(#layer${i}-gradient)`, p.outline, w)
  }
  const L = [[-30, BLUE_], [-10, GREEN], [10, ORANGE], [30, VIOLET]]
  const defs = L.map(([y, p], i) => g.grad(`layer${i}-gradient`, [-46, y - 11, 34, y + 11], { ...p, base: p.base, shadow: p.shadow })).join('')
  // From the bottom up, so each layer lies over the one under it.
  const layers = [...L.keys()].reverse().map((i) => own(`layer-${i + 1}`, layer(L[i][0], L[i][1], i)))
  const hex = polygon([0, 0], 6, 90).map(([u, v]) => [-6 + u * 8, 30 + v * 8])
  const marks = [
    dna(g, { x: -6, y: -30, size: 40, width: 10, turn: 0, pal: deep(265), id: 'genome' }),
    rna(g, { x: -6, y: -10, size: 36, waves: 2.5, bases: true, pal: deep(150), id: 'transcriptome' }),
    protein(g, { x: -6, y: 10, size: 15, pal: rich(58), id: 'proteome' }),
    own('metabolome', g.path(`M${hex.map((q) => g.P(q).map(f).join(',')).join(' L')} Z`, VIOLET.light, deep(315).outline, 8) + g.circle(-6 + 8 * 1.35, 30 - 8 * 0.8, 2.2, deep(315).outline), [['metabolome', deep(315)]]),
  ]
  const down = arrow(g, { points: [[43, -40], [43, 40]], colour: INK, w: 10, id: 'layers' })
  // Each mark is in the hue of its own layer on purpose, so only the layers enter the hue check.
  icon('Multi-omics', join(own('defs', '', [['genome', BLUE_], ['transcriptome', GREEN], ['proteome', ORANGE], ['metabolome', VIOLET]], defs), ...interleave(layers, marks.map((m) => ({ ...m, parts: [] }))), down))
}
function interleave(layers, marks) {
  // layers are bottom-up (4,3,2,1); marks are top-down (1..4). Draw: layer4, mark4, layer3, mark3 … so an upper layer
  // covers the edge of the one under it but never the mark that layer carries in its middle.
  return layers.flatMap((l, j) => [l, marks[marks.length - 1 - j]])
}

// ---------------------------------------------------------------------------------------------------------------------
// Phylogenetic tree: a rooted tree drawn with right angles, two clades, the tips coloured by clade.
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.75, [0, 0]), lw = 15
  const B = [[[-46, 0], [-32, 0]], [[-32, -24], [-32, 23]], [[-32, -24], [-8, -24]], [[-8, -36], [-8, -12]], [[-8, -36], [34, -36]], [[-8, -12], [34, -12]],
    [[-32, 23], [-4, 23]], [[-4, 8], [-4, 37]], [[-4, 8], [14, 8]], [[14, 1], [14, 16]], [[14, 1], [39, 1]], [[14, 16], [39, 16]], [[-4, 37], [33, 37]]]
  const lines = B.map((p) => g.line(p, INK, lw)).join('')
  const C1 = soft(265), C2 = soft(150)
  const tips = [[34, -36, C1], [34, -12, C1], [39, 1, C2], [39, 16, C2], [33, 37, C2]].map(([x, y, p]) => g.circle(x, y, 6, p.small, p.outline, 7)).join('')
  icon('Phylogenetic tree', join(own('branches', lines), own('tips', tips, [['clade 1', C1], ['clade 2', C2]])))
}

// ---------------------------------------------------------------------------------------------------------------------
// Pipeline: three steps in a row joined by arrows, the last one dark, the numbers lettered in them.
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.75, [0, 0]), w = 7, s = 25
  const box = (cx, i) => {
    const last = i === 2
    return g.path(rrect(g, cx - s / 2, -s / 2, cx + s / 2, s / 2, 5.5), last ? 'url(#last-gradient)' : 'url(#step-gradient)', ACCENT.outline, w) +
      letters(g, cx, 0, 11, String(i + 1), last ? '#FFFFFF' : ACCENT.outline, `step-${i + 1}-number`)
  }
  const xs = [-34, 0, 34]
  const heads = [-17, 17].map((x) => g.path(`M${g.P([x - 2.5, -4.5]).map(f).join(',')} L${g.P([x + 3.5, 0]).map(f).join(',')} L${g.P([x - 2.5, 4.5]).map(f).join(',')} Z`, INK, INK, 3)).join('')
  icon('Pipeline', join(own('steps', xs.map(box).join(''), [['steps', ACCENT]],
    g.grad('step-gradient', [-46, -12.5, 46, 12.5], { ...ACCENT, base: ACCENT.light, shadow: ACCENT.base }) + g.grad('last-gradient', [21, -12.5, 46, 12.5], { ...ACCENT, base: ACCENT.small, shadow: ACCENT.outline })),
  own('arrows', heads)))
}

// ---------------------------------------------------------------------------------------------------------------------
// Biobank: a −80 °C freezer, its glass door showing three shelves of sample vials, a snowflake for the cold.
// (SiliCoDraw: a cabinet with three shelves of vials; here the freezer is the instrument part with its reading.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.75, [0, 0])
  const fr = instrument(g, { x: 0, y: 0, size: 96, aspect: 1.35, screen: 'number', text: '-80', door: 'window', shelves: 2, buttons: 0, lamp: false, id: 'freezer' })
  const ys = [-12, 12, 36], xs = [-22, -7, 8]
  const vials = ys.flatMap((y, j) => xs.map((x, i) => tube(g, { x, y: y - 6.5, size: 12, kind: 'vial', liquid: 'water', level: 0.5, capPal: ACCENT, id: `vial-${j + 1}-${i + 1}` })))
  const cold = hazardSymbol(g, { x: 24, y: -6, size: 11, symbol: 'snowflake', colour: ACCENT.outline, ground: GLASS.small, id: 'snowflake' })
  icon('Biobank', join(fr, ...vials, cold))
}

// ---------------------------------------------------------------------------------------------------------------------
// Organ-on-a-chip: a clear chip with two channels that meet in a chamber of tissue in the middle, a port at each end.
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.75, [0, 0]), w = 7, TISSUE = soft(355)
  const chip = g.path(rrect(g, -47, -29, 47, 29, 7), 'url(#chip-gradient)', METAL.outline, w)
  const ch = (s) => Array.from({ length: 31 }, (_, i) => { const x = -42 + (84 * i) / 30, b = Math.exp(-((x / 15) ** 2)); return [x, s * (14 - 9 * b)] })
  const channels = [1, -1].map((s) => bar(g, ch(s), { ...ACCENT, base: ACCENT.small }, 34, 6)).join('')
  const chamber = g.path(rrect(g, -15, -10, 15, 10, 4.5), 'url(#tissue-gradient)', TISSUE.outline, w)
  const cells = [[-7.5, -2.5], [6.5, -3.5], [0, 4.5]].map(([x, y], i) => cell(g, { x, y, size: 8.2, pal: TISSUE, id: `cell-${i + 1}` }))
  const ports = [-42, 42].flatMap((x) => [-14, 14].map((y) => g.circle(x, y, 4.2, PAPER.base, METAL.outline, 5))).join('')
  icon('Organ-on-a-chip', join(own('chip', chip, [], g.grad('chip-gradient', [-47, -29, 47, 29], GLASS)), own('channels', channels, [['channels', ACCENT]]),
    own('chamber', chamber, [['tissue', TISSUE]], g.grad('tissue-gradient', [-15, -10, 15, 10], { ...TISSUE, base: TISSUE.light, shadow: TISSUE.base })), ...cells, own('ports', ports)))
}

check()
console.log('written to', OUT)
