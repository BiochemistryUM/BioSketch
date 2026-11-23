// Eight icons of SiliCoDraw's "Techniques & assays" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David
// Carlsson; see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts:
// a mass spectrum, surface plasmon resonance, a baseline, an insulin clamp, an aging cell atlas, a pseudotime trajectory,
// MAG binning and lipidomics. Plots are the `plot` part of ../parts/assays.mjs (a paper card with axes, flat data in the
// series colours of the conventions of assays).
// Parts used: plot (assays.mjs); antibody, ligand, circularDna (molecules.mjs); vessel, arrow (tissue.mjs); skeletal
// (formula.mjs, for cholesterol); LIPID (membranes.mjs); PAPER, PLASTIC, METAL, ACCENT, LIQUIDS, objW (lab.mjs); lettering.
// Drawn here because no part draws them: the gold film of a sensor chip; an infusion bag, tubing with its Y junction and
// a cannula; a clock face; a single phospholipid and a triglyceride (head, glycerol and tails as tubes); the data of
// cholesterol for `skeletal`.
// Lettered (strokes): "I" and "G" on the two infusion bags (insulin, glucose), as SiliCoDraw writes them.
// Left out: SiliCoDraw's "m/z" under the mass spectrum (letters.mjs has no lowercase z) and the word "baseline".
// The current look: outlines at 60 % (setStrokeScale), the gloss on (setGloss); nothing here is a round biological body
// of 40 px or more, so nothing is glossed (plots are flat pictures of data, objects are never glossed). Lines that are the
// drawing itself (curves, axes, sticks, bonds, letters) keep their width.
// Usage: node tbB.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss } from '../cellkit.mjs'
import { deep, rich, toHex, toLch } from '../colour.mjs'
import { catmull, f, setStrokeScale } from '../shapes.mjs'
import { SERIES, mixHex, plot } from '../parts/assays.mjs'
import { formula, skeletal } from '../parts/formula.mjs'
import { ACCENT, DARK, INK, LIQUIDS, METAL, PAPER, PLASTIC, objW } from '../parts/lab.mjs'
import { lettering } from '../parts/letters.mjs'
import { LIPID, PROTEIN } from '../parts/membranes.mjs'
import { antibody, circularDna, ligand } from '../parts/molecules.mjs'
import { arrow, vessel } from '../parts/tissue.mjs'

const OUT = process.argv[2]
const SCALE = 0.6
setStrokeScale(SCALE)
setGloss(true)
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT)
// Greys (chroma below 0.012: paper, ink, materials) are left out of the hue check, as the conventions of lab.mjs say; a
// palette used twice is one part that recolours as one, so it is listed once.
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base) === i), defs, body)
/** A line on its own (fill none) is the drawing itself and keeps its width: svg() multiplies it by SCALE again. */
const keepLines = (body) => body.replace(/<path [^>]*fill="none"[^>]*>/g, (el) => el.replace(/stroke-width="([\d.]+)"/, (_, v) => `stroke-width="${f(v / SCALE)}"`))
const icon = (name, ...ps) => cellType(name, ps.flatMap((p) => p.parts ?? []), ps.map((p) => p.defs ?? '').join(''), keepLines(ps.map((p) => p.body).join('\n')))
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })

/** Where plot() puts its data (its frame repeated: margins 11 on a card, 0.75 of that at the top and right, 3 inside). */
function plotFrame({ x = 0, y = 0, size, aspect = 0.85 }) {
  const W = aspect <= 1 ? 100 : 100 / aspect, H = aspect <= 1 ? 100 * aspect : 100, m = 11, u = size / 100
  const x0 = -W / 2 + m, x1 = W / 2 - m * 0.75, y0 = H / 2 - m, y1 = -H / 2 + m * 0.75
  return { X: (a) => x + (x0 + 3 + (x1 - x0 - 3) * a) * u, Y: (b) => y + (y0 - 3 - (y0 - y1 - 3) * b) * u, P: ([a, b]) => [x + (x0 + 3 + (x1 - x0 - 3) * a) * u, y + (y0 - 3 - (y0 - y1 - 3) * b) * u] }
}
function rng(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
const gauss = (R) => () => Math.sqrt(-2 * Math.log(R() || 1e-9)) * Math.cos(6.2832 * R())
const P2 = (g, p) => g.P(p).map(f).join(',')
const L = (g, pts) => `M${pts.map((p) => P2(g, p)).join(' L')}`
/** A rounded rectangle in g's units, as path data. */
const rrect = (g, x0, y0, x1, y1, r) => `M${P2(g, [x0 + r, y0])} L${P2(g, [x1 - r, y0])} Q${P2(g, [x1, y0])} ${P2(g, [x1, y0 + r])} L${P2(g, [x1, y1 - r])} Q${P2(g, [x1, y1])} ${P2(g, [x1 - r, y1])} L${P2(g, [x0 + r, y1])} Q${P2(g, [x0, y1])} ${P2(g, [x0, y1 - r])} L${P2(g, [x0, y0 + r])} Q${P2(g, [x0, y0])} ${P2(g, [x0 + r, y0])}Z`
/** Tubing or a tail: lines of `width` g units with one outline round them all. */
const tubes = (g, pts, width, pal, w) => g.union(pts.map((p) => ({ d: L(g, p), width: width * g.k })), pal.base, pal.outline, w)
const K = 4.55 // a composition 100 units across fills 455 px of the page: margins about 26

// ---------------------------------------------------------------------------------------------------------------------
// Mass spectrum: peaks as sticks rising from the m/z axis.
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K, [0, 0])
  icon('Mass spectrum', plot(g, { x: 0, y: 0, size: 100, show: 'spectrum', id: 'spectrum' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Surface plasmon resonance: antibodies captured on the gold film of a sensor chip, two of them holding their antigen,
// and below it the sensorgram: the response rises while the antigen flows over the chip (association), and falls when
// buffer follows (dissociation).
// (SiliCoDraw: blue balls on stalks and orange balls on a yellow strip. Here the immobilised ligand is the antibody part,
// as in most SPR assays, the analyte the ligand part; the sensorgram is drawn in the analyte's colour, so that both
// recolour together. The film is gold, rich(85), a material of its own: it is listed as a part so that it can be changed.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K, [0, 0]), GOLD = rich(85)
  const w = objW(96 * g.k)
  const chip = own('gold-film', g.path(rrect(g, -48, -10, 48, -2, 2), 'url(#gold-gradient)', GOLD.outline, w), [['gold film', GOLD]], g.grad('gold-gradient', [-48, -10, 48, -2], GOLD))
  const xs = [-36, -18, 0, 18, 36], bound = [1, 3]
  const abs = xs.map((x, i) => antibody(g, { x, y: -21.5, size: 21, pal: PROTEIN, id: `antibody${i + 1}` }))
  const ag = bound.map((i, k) => ligand(g, { x: xs[i], y: -37.5, size: 9, id: `antigen${k + 1}` }))
  const free = [[-27, -44], [27, -45]].map(([x, y], k) => ligand(g, { x, y, size: 9, id: `free-antigen${k + 1}` }))
  const AN = ag[0].parts[0][1]
  // the sensorgram of the part (association, then dissociation), its curve in the analyte's colour
  const pre = { series: [{ kind: 'line', fn: (u) => (u < 0.12 ? 0.08 : u < 0.55 ? 0.08 + 0.72 * (1 - Math.exp(-(u - 0.12) * 9)) : 0.08 + 0.72 * (1 - Math.exp(-0.43 * 9)) * Math.exp(-(u - 0.55) * 3.2)), pal: AN }], vlines: [0.12, 0.55] }
  icon('Surface plasmon resonance', ...abs, chip, ...ag, ...free, plot(g, { x: 0, y: 25, size: 100, aspect: 0.46, show: pre, id: 'sensorgram' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Baseline: measurements over time against the dashed level measured before the treatment; the first measurement, the
// baseline itself, in amber (as the first point of the timeline part).
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K, [0, 0])
  icon('Baseline', plot(g, { x: 0, y: 0, size: 100, show: 'trend', id: 'baseline', series: [{ kind: 'points', data: [[0.06, 0.36]], pal: SERIES[3], r: 3.06 }] }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Insulin clamp (hyperinsulinaemic–euglycaemic clamp): insulin (I) and glucose (G) run from two infusion bags through a
// Y junction and a cannula into a vein; the chart shows blood glucose held flat at its target (dashed) while the glucose
// infusion rate needed to hold it rises, the measure of insulin sensitivity.
// (SiliCoDraw: the same scene. The vein is the vessel part with blood cells; the bags are clear plastic with insulin in
// the water blue and glucose in the straw yellow of the conventions, and the glucose trace on the chart is drawn in the
// glucose bag's colour so that the two recolour together; the infusion rate is the accent blue of the first series.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.75, [0, -1.5]), w = objW(30 * g.k), fine = Math.max(1.5, w * 0.5)
  const INS = LIQUIDS.water, GLU = LIQUIDS.plasma
  const bagPts = (x) => { const t = -42, b = -15; return `M${P2(g, [x - 9, t + 2])} Q${P2(g, [x - 9, t])} ${P2(g, [x - 7, t])} L${P2(g, [x + 7, t])} Q${P2(g, [x + 9, t])} ${P2(g, [x + 9, t + 2])} L${P2(g, [x + 9, b - 6])} C${P2(g, [x + 9, b - 1])} ${P2(g, [x + 4, b])} ${P2(g, [x, b])} C${P2(g, [x - 4, b])} ${P2(g, [x - 9, b - 1])} ${P2(g, [x - 9, b - 6])}Z` }
  const bagLiquid = (x, lvl) => { const b = -15; return `M${P2(g, [x - 9, lvl])} L${P2(g, [x + 9, lvl])} L${P2(g, [x + 9, b - 6])} C${P2(g, [x + 9, b - 1])} ${P2(g, [x + 4, b])} ${P2(g, [x, b])} C${P2(g, [x - 4, b])} ${P2(g, [x - 9, b - 1])} ${P2(g, [x - 9, b - 6])}Z` }
  const bag = (x, pal, letter, id) => {
    const hook = g.line([[x, -47], [x, -42]], PLASTIC.outline, f(w))
    const shell = g.path(bagPts(x), `url(#${id}-gradient)`)
    const liq = g.path(bagLiquid(x, -32), pal.small) + g.line([[x - 9, -32], [x + 9, -32]], pal.outline, f(fine))
    const port = g.path(rrect(g, x - 2.4, -15.5, x + 2.4, -11, 1), PLASTIC.shadow, PLASTIC.outline, fine)
    const edge = g.path(bagPts(x), 'none', PLASTIC.outline, w) + g.line([[x - 6.4, -39], [x - 6.4, -34.5]], PAPER.light, f(w * 0.9))
    const let_ = lettering(g, { x, y: -23.5, h: 8, text: letter, colour: pal.outline, id: `${id}-letter` }).body
    return own(id, hook + shell + liq + port + edge + let_, [[id, pal]], g.grad(`${id}-gradient`, [x - 9, -42, x + 9, -15], PLASTIC))
  }
  const J = [-27, 8]
  const tubing = own('tubing', tubes(g, [catmull([[-38, -11], [-37, -1], [-30, 4], J], 8), catmull([[-16, -11], [-17, -1], [-24, 4], J], 8), [J, [-27, 20]]], 2.6, PLASTIC, Math.max(1.5, w * 0.6)) + g.circle(J[0], J[1], 2.6, PLASTIC.shadow, PLASTIC.outline, fine))
  const vein = vessel(g, { x: 0, y: 36, size: 96, thick: 0.19, ends: 'open', cells: 3, id: 'vein' })
  const hub = g.path(rrect(g, -30.5, 19, -23.5, 25, 1.5), ACCENT.base, ACCENT.outline, fine)
  const needle = g.line([[-27, 25], [-27, 33]], METAL.outline, f(Math.max(2, 1.6 * g.k)))
  const cannula = own('cannula', needle + hub, [['cannula hub', ACCENT]])
  const aspect = 62 / 42
  const wob = [[0, 0.7], [0.1, 0.78], [0.2, 0.68], [0.32, 0.75], [0.45, 0.71], [0.58, 0.74], [0.72, 0.72], [0.86, 0.735], [1, 0.725]]
  const chart = plot(g, { x: 27, y: -15, size: 62, aspect, id: 'chart', hlines: [0.725], series: [{ kind: 'line', data: wob, pal: GLU }, { kind: 'line', fn: (u) => 0.08 + 0.42 * (1 - Math.exp(-u * 3.6)), pal: SERIES[0] }] })
  icon('Insulin clamp', vein, tubing, cannula, bag(-38, INS, 'I', 'insulin'), bag(-16, GLU, 'G', 'glucose'), chart)
}

// ---------------------------------------------------------------------------------------------------------------------
// Aging cell atlas: an embedding of single cells in which each cell type shifts with age, young cells (open rings) to old
// ones (filled), an arrow for each shift, and a clock for age.
// (SiliCoDraw: the same, with a small pair of axes. The clock is a paper dial with ink hands; the three cell types are the
// first three series colours. Young cells are white with their type's outline, as SiliCoDraw draws them.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K, [0, 0]), PF = plotFrame({ size: 100 }), G = gauss(rng(12))
  const types = [[SERIES[0], [0.1, 0.82], [0.46, 0.84]], [SERIES[3], [0.1, 0.42], [0.44, 0.52]], [SERIES[2], [0.5, 0.1], [0.86, 0.3]]]
  const cl = ([cx, cy], n) => Array.from({ length: n }, () => [cx + G() * 0.042, cy + G() * 0.045])
  const series = types.flatMap(([p, y, o]) => [{ kind: 'points', data: cl(y, 7), pal: { ...p, small: PAPER.light }, r: 2.9 }, { kind: 'points', data: cl(o, 7), pal: p, r: 2.9 }])
  const chart = plot(g, { x: 0, y: 0, size: 100, arrows: true, id: 'atlas', series })
  const shifts = types.map(([, y, o], i) => { const a = PF.P(y), b = PF.P(o), d = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / d, uy = (b[1] - a[1]) / d; return arrow(g, { points: [[a[0] + ux * 7, a[1] + uy * 7], [b[0] - ux * 7.5, b[1] - uy * 7.5]], colour: INK, w: 4, head: 13, id: `shift${i + 1}` }).body })
  // the clock: a paper dial with four ticks and two hands
  const [cx, cy] = PF.P([0.84, 0.8]), R = 11, wc = objW(2 * R * g.k)
  let clock = g.circle(cx, cy, R, PAPER.base, PAPER.outline, wc)
  clock += [0, 90, 180, 270].map((a) => { const t = (a * Math.PI) / 180; return g.line([[cx + Math.cos(t) * (R - 3.2), cy + Math.sin(t) * (R - 3.2)], [cx + Math.cos(t) * (R - 1.6), cy + Math.sin(t) * (R - 1.6)]], INK, f(wc * 0.7)) }).join('')
  clock += g.line([[cx, cy], [cx, cy - R * 0.68]], INK, f(wc * 0.9)) + g.line([[cx, cy], [cx + R * 0.45, cy + R * 0.26]], INK, f(wc * 0.9)) + g.circle(cx, cy, 1.3, INK)
  icon('Aging cell atlas', chart, own('shifts', shifts.join('')), own('clock', clock))
}

// ---------------------------------------------------------------------------------------------------------------------
// Pseudotime trajectory: cells of an embedding coloured by pseudotime, from pale (early) to deep (late), along a
// trajectory that starts at a root cell (a ring) and branches into two fates (arrows).
// (SiliCoDraw: a ramp from mint to indigo in five steps. Here the ramp is one hue, violet, from pale to deep, so that it
// recolours as one part; the trajectory is ink over a white halo; the embedding has the two arrows of the UMAP plot.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K, [0, 0]), PF = plotFrame({ size: 100 }), G = gauss(rng(9)), H = 295
  const ramp = Array.from({ length: 5 }, (_, i) => { const t = i / 4, l = 0.88 - 0.42 * t, c = 0.05 + 0.11 * t; return { light: toHex({ l: 0.97, c: 0.02, h: H }), base: toHex({ l: 0.75, c: 0.11, h: H }), shadow: toHex({ l: 0.7, c: 0.12, h: H }), small: toHex({ l, c, h: H }), outline: toHex({ l: Math.min(0.62, l - 0.2), c: c + 0.02, h: H }) } })
  const bz = (Q, t) => { const u = 1 - t; return [0, 1].map((k) => u * u * u * Q[0][k] + 3 * u * u * t * Q[1][k] + 3 * u * t * t * Q[2][k] + t * t * t * Q[3][k]) }
  const S = [[[[0.04, 0.12], [0.2, 0.12], [0.28, 0.44], [0.44, 0.47]], 0, 0.4, 16], [[[0.44, 0.47], [0.6, 0.5], [0.68, 0.86], [0.94, 0.87]], 0.4, 1, 12], [[[0.44, 0.47], [0.62, 0.43], [0.7, 0.2], [0.94, 0.22]], 0.4, 1, 12]]
  const bins = [[], [], [], [], []]
  S.forEach(([Q, t0, t1, n]) => { for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, [u, v] = bz(Q, t), pt = t0 + (t1 - t0) * t; bins[Math.min(4, Math.floor(pt * 5))].push([u + G() * 0.035, v + G() * 0.04]) } })
  const series = bins.map((data, i) => ({ kind: 'points', data, pal: ramp[i], r: 3 }))
  const curves = S.map(([Q]) => Array.from({ length: 21 }, (_, k) => bz(Q, k / 20)))
  const halo = curves.map((c) => ({ kind: 'trace', data: c, pal: { ...PAPER, outline: PAPER.light }, width: 13 }))
  const chart = plot(g, { x: 0, y: 0, size: 100, arrows: true, id: 'pseudotime', series: [...series, ...halo] })
  const path = curves.map((c, i) => arrow(g, { points: c.slice(i ? 0 : 1, i ? 20 : 21).map(PF.P), corners: true, colour: INK, w: 4.4, head: 15, end: i ? 'head' : 'none', id: `trajectory${i + 1}` }).body).join('')
  const root = PF.P([0.04, 0.12]), wr = objW(8 * g.k)
  const rootMark = g.circle(root[0], root[1], 3.6, PAPER.light, INK, f(wr * 0.9)) + g.circle(root[0], root[1], 1.4, INK)
  // one part for the ramp: its five tones are one hue and recolour together
  icon('Pseudotime trajectory', { ...chart, parts: [['card', PAPER], ['pseudotime', ramp[2]]] }, own('trajectory', path + rootMark))
}

// ---------------------------------------------------------------------------------------------------------------------
// MAG binning: contigs of a metagenome plotted by coverage against GC content fall into bins (dashed outlines), one per
// genome; one bin is assembled into a draft genome, a circle.
// (SiliCoDraw: three tinted ellipses and a green ring with a small gap. Here the bins are the plot's dashed gates, the
// genome the circular DNA part in the colour of its bin, so that the two recolour together.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K, [0, 0]), PF = plotFrame({ size: 100 }), G = gauss(rng(4))
  // bins as ellipses drawn in g units (rx, ry, turn), taken back into shares of the plot (77.75 by 62.75 units)
  const SU = 77.75, SV = 62.75
  const bins = [[SERIES[0], [0.24, 0.73], 13, 9, -20], [SERIES[3], [0.7, 0.76], 12, 8, 24], [SERIES[2], [0.27, 0.27], 14, 9, 8]]
  const ellipse = ([cx, cy], rx, ry, rot) => Array.from({ length: 40 }, (_, i) => { const t = (i / 40) * Math.PI * 2, r = (rot * Math.PI) / 180, a = rx * Math.cos(t), b = ry * Math.sin(t); return [cx + (a * Math.cos(r) - b * Math.sin(r)) / SU, cy - (a * Math.sin(r) + b * Math.cos(r)) / SV] })
  const inside = ([cx, cy], rx, ry, rot) => Array.from({ length: 7 }, (_, i) => { const t = i * 2.4 + G() * 0.3, d = i ? 0.35 + 0.35 * ((i * 0.618) % 1) + G() * 0.04 : 0, r = (rot * Math.PI) / 180, a = rx * d * Math.cos(t), b = ry * d * Math.sin(t); return [cx + (a * Math.cos(r) - b * Math.sin(r)) / SU, cy - (a * Math.sin(r) + b * Math.cos(r)) / SV] })
  const series = bins.flatMap(([p, c, rx, ry, rot]) => [{ kind: 'gate', data: ellipse(c, rx, ry, rot), pal: p }, { kind: 'points', data: inside(c, rx, ry, rot), pal: p, r: 3 }])
  const chart = plot(g, { x: 0, y: 0, size: 100, id: 'bins', series })
  const [gx, gy] = PF.P([0.8, 0.27])
  const genome = circularDna(g, { x: gx, y: gy, size: 22, pal: SERIES[2], twists: 6, id: 'genome' })
  const a = PF.P([0.47, 0.27]), b = [gx - 13.5, gy]
  const to = arrow(g, { points: [a, b], colour: INK, w: 4.4, head: 15, id: 'assembly' })
  icon('MAG binning', chart, genome, to)
}

// ---------------------------------------------------------------------------------------------------------------------
// Lipidomics: a mass spectrum of lipids with a phospholipid, a triglyceride and cholesterol over the three main peaks.
// (SiliCoDraw: the same. The lipids are drawn as tubes in the peach of the lipid part (membranes.mjs), the phospholipid
// with its round head and one kinked (unsaturated) tail, the triglyceride with three tails on its glycerol; cholesterol
// is the skeletal formula part with its sterol rings, hydroxyl and side chain; its oxygen is a crimson red, deep(355),
// rather than the formula part's red (22°), which lies only 30° from the peach of the lipids. The peaks are lower than SiliCoDraw's so
// that the molecules stand above them inside the card.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K, [0, 0]), PF = plotFrame({ size: 100, aspect: 1 })
  const pk = [[-42, 36], [-37, 31], [-31, 38], [-26, 2], [-20, 34], [-14, 29], [-9, 38], [2, -4], [8, 33], [13, 27], [18, 37], [29, 8], [35, 31], [41, 36]].map(([x, y]) => [(x + 46) / 92, ((44 - y) / 50) * 0.52])
  const chart = plot(g, { x: 0, y: 0, size: 100, aspect: 1, id: 'spectrum', series: [{ kind: 'sticks', data: pk }] })
  const top = (u) => PF.Y(pk.find((p) => Math.abs(p[0] - u) < 0.01)[1])
  const w = objW(30 * g.k), tw = 3.4
  // phospholipid over the first main peak
  const u1 = (-26 + 46) / 92, x1 = PF.X(u1), b1 = top(u1) - 4
  const pl = tubes(g, [[[x1 - 3.2, b1 - 20], [x1 - 3.2, b1]], [[x1 + 3.2, b1 - 20], [x1 + 3.2, b1 - 11], [x1 + 6, b1 - 6], [x1 + 6, b1]]], tw, LIPID, w * 0.7) +
    g.path(rrect(g, x1 - 7, b1 - 25, x1 + 7, b1 - 19, 2.5), LIPID.shadow, LIPID.outline, w * 0.8) + g.circle(x1, b1 - 30.5, 4.4, LIPID.base, LIPID.outline, w * 0.8)
  // triglyceride over the second
  const u2 = (2 + 46) / 92, x2 = PF.X(u2), b2 = top(u2) - 4
  const tg = tubes(g, [[[x2 - 7, b2 - 21], [x2 - 7, b2]], [[x2, b2 - 21], [x2, b2 - 8], [x2 + 3, b2 - 3.5], [x2 + 3, b2]], [[x2 + 7, b2 - 21], [x2 + 7, b2]]], tw, LIPID, w * 0.7) +
    g.path(rrect(g, x2 - 11, b2 - 27, x2 + 11, b2 - 20, 2.5), LIPID.shadow, LIPID.outline, w * 0.8)
  // cholesterol over the third: the sterol rings of cholic acid (formula.mjs) with one hydroxyl and the side chain
  const CHOL = (() => {
    const s3 = Math.sqrt(3), rad = (d) => (d * Math.PI) / 180, dir = (p, deg, l = 1) => [p[0] + l * Math.cos(rad(deg)), p[1] + l * Math.sin(rad(deg))]
    const hex = ([cx, cy]) => Array.from({ length: 6 }, (_, i) => { const t = Math.PI / 6 + (i * Math.PI) / 3; return [cx + Math.cos(t), cy + Math.sin(t)] })
    const A = [0, 0], B = [s3, 0], C = [s3 * 1.5, -1.5], apo = 1 / (2 * Math.tan(Math.PI / 5)), R5 = 1 / (2 * Math.sin(Math.PI / 5)), D = [C[0] + s3 / 2 + apo, C[1]]
    const pent = [144, 216, 288, 0, 72].map((a) => dir(D, a, R5))
    const c10 = [s3 / 2, -0.5], c13 = [C[0] + s3 / 2, C[1] - 0.5]
    const c17 = pent[2], c20 = dir(c17, -75), c21 = dir(c20, -135), c22 = dir(c20, -15), c23 = dir(c22, -75), c24 = dir(c23, -15), c25 = dir(c24, -75), c26 = dir(c25, -135), c27 = dir(c25, -15)
    const up = (p) => [p[0], -p[1]], m = formula(), at = (p, el) => m.at(up(p), el)
    for (const ring of [hex(A), hex(B), hex(C), pent]) m.ring(ring.map((p) => at(p)), 'sterol')
    m.chain([c17, c20, c22, c23, c24, c25, c26].map((p) => at(p))); m.bond(at(c20), at(c21)); m.bond(at(c25), at(c27))
    const c3 = hex(A)[2]; m.bond(at(c3), at(dir(c3, 150, 0.95), 'O'))
    for (const c of [c10, c13]) m.bond(at(c), at([c[0], c[1] - 0.85]))
    return m.data
  })()
  const u3 = (29 + 46) / 92, chol = skeletal(g, { x: PF.X(u3) - 1, y: top(u3) - 18, size: 34, turn: -62, id: 'cholesterol', atomPal: { O: deep(355) }, ...CHOL })
  icon('Lipidomics', chart, own('phospholipid', pl, [['lipids', LIPID]]), own('triglyceride', tg), chol)
}

kit.check()
console.log('written', OUT)
