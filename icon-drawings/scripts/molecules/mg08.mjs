// Eight icons of SiliCoDraw's "Molecules & genetics" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David
// Carlsson; see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts in
// ../parts/: molecular cloning, restriction digest, pedigree, DNA repair, transcription factor, chromatin state, gel
// electrophoresis and sequencing reads. Their compositions are read by hand from the source in a 100 × 100 box centred
// on 0,0 and scaled onto a 512 page (`page` of ../cellkit.mjs).
// Parts used: DNA and circular DNA, protein, chromatin with nucleosomes (molecules.mjs), arrows (tissue.mjs).
// Where the DNA has a stretch of another colour (the insert of a plasmid, a repaired patch, a binding site) or one strand
// runs on alone (the sticky ends of a restriction digest), the DNA part's helix is copied here with a palette and an
// on/off per strand and place (`helix`, `dnaWith`, `ringWith`); without stretches it draws exactly what the part draws
// (checked when the script runs). The scissors are the part of ../parts/genetics.mjs. Drawn here because no part draws
// them: pedigree symbols, a compact cluster of nucleosomes (closed chromatin), a gel with wells and bands, and sequence
// reads as bars.
// Nothing is lettered: SiliCoDraw's "open" and "closed" beside the chromatin are left out (the two rows say it).
// Usage: node mg08.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, highlight, NUC, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex, toLch } from '../colour.mjs'
import { catmull, f, gradient2 } from '../shapes.mjs'
import { chromatin, circularDna, dna, protein } from '../parts/molecules.mjs'
import { arrow } from '../parts/tissue.mjs'
import { scissors } from '../parts/genetics.mjs'

const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const { cellType, check } = cellTypes(OUT)

// Hues (OKLCH degrees). DNA is the part's blue (267°); what SiliCoDraw draws orange (an insert, a binding site, every
// third read) keeps its orange (57°); the repaired patch its green (163°); the transcription factor its pale green (163°);
// the scissors' rings the amber of a protein (75°, the enzyme); reads cerulean (215°, 52° from the DNA of the reference).
const DNA = hueOf('#4f6bb8'), ORANGE = hueOf('#e3955a'), GREEN = hueOf('#5fae8b'), PROTEIN = 75, READ = 215, GEL = 200
const dnaPal = deep(DNA)
/** A true grey (chroma under 0.012), for arrows, lines and blades that are the colour of nothing. */
const grey = (l, c = 0.006) => toHex({ l, c, h: 255 })
const GREY = { light: grey(0.985, 0.002), base: grey(0.95), shadow: grey(0.86, 0.008), small: grey(0.75, 0.008), outline: grey(0.5, 0.01) }

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const P2 = ([x, y]) => `${f(x)},${f(y)}`
const lineD = (pts) => `M${pts.map(P2).join(' L')}`
const strokePath = (d, colour, w, cap = 'round') => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
const disc = ([x, y], r, fill, s = '', w = 0) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}"${s ? ` stroke="${s}" stroke-width="${f(w)}"` : ''}/>`
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts ?? []) })
/** The parts of an icon for `check()`: one entry per palette, greys left out (they never join a hue). */
const huesOf = (parts) => parts.filter((p, i, a) => a.findIndex((q) => q[1].base === p[1].base) === i).filter((p) => toLch(p[1].base).c >= 0.012)
const icon = (name, { defs, body, parts }) => cellType(name, huesOf(parts), defs, body)
/** A polygon of page points with its corners rounded by r (px). */
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
/** A rectangle of g units as a rounded path on the page. */
const rrectD = (g, x, y, w, h, r) => roundPoly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(g.P), r * g.k)

// =====================================================================================================================
// The DNA part's double helix (../parts/molecules.mjs, `helix`, `dna`, `circularDna`), copied with two options the part
// lacks: `palOf(k, t)`, the palette of strand k (0 or 1) a share t along the helix, and `on(k, t)`, false where strand k is
// left out (a sticky end: the other strand runs on alone). Runs are cut where a strand passes front to back, changes
// palette or stops; a run that stops at a gap gets a round end. Base pairs are left out where a strand is missing and
// take the strands' palette where both share one. Large (outlined) helices only.
// =====================================================================================================================
const frame = (g, x, y, size) => { const s = size / 100, px = s * g.k; return { px, ext: size * g.k, P: ([u, v]) => g.P([x + u * s, y + v * s]) } }
const wrap = (g, id, x, y, turn, inner) => `<g id="${id}"${turn ? ` transform="rotate(${f(turn)} ${f(g.X(x))} ${f(g.Y(y))})"` : ''}>${inner}</g>`
const capUnder = ([x, y], T, outline, w) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(T / 2 + w / 2)}" fill="${outline}" stroke="${outline}" stroke-width="${f(w)}"/>`
const capOver = ([x, y], T, fill) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(T / 2)}" fill="${fill}"/>`

const helix = (L, { centre, normal, twists, A, T, W, palOf, on, closed = false, n }) => {
  const strands = [1, -1].map((sign, k) => Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, [cx, cy] = centre(t), [nx, ny] = normal(t), ph = 2 * Math.PI * twists * t
    return { p: L.P([cx + nx * A * sign * Math.sin(ph), cy + ny * A * sign * Math.sin(ph)]), front: sign * Math.cos(ph) >= 0, on: on(k, t), pal: palOf(k, t) }
  }))
  // Runs as [a, b] indices: a new run starts at the point where the strand turns front or back (shared with the run
  // before, as in the part) or changes palette; a point that is off ends the run before it.
  const runsOf = (pts) => {
    const out = []
    let a = null
    for (let j = 0; j < pts.length; j++) {
      if (!pts[j].on) { if (a !== null && j - 1 > a) out.push([a, j - 1]); a = null; continue }
      if (a === null) { a = j; continue }
      if (pts[j].front !== pts[j - 1].front || pts[j].pal !== pts[j - 1].pal) { out.push([a, j]); a = j }
    }
    if (a !== null && a < pts.length - 1) out.push([a, pts.length - 1])
    return out.map(([a, b]) => ({ ab: [a, b], front: pts[a].front, pal: pts[a].pal }))
  }
  const Tp = T * L.px
  const draw = (pts, { ab: [a, b], pal }, k) => {
    const all = pts.map((q) => q.p), fill = k === 0 ? pal.base : pal.shadow
    // The outline reaches one point and the fill two past each end, into points that are drawn (as `piece` of the part).
    const reach = (m) => { let lo = a, hi = b; for (let i = 0; i < m && lo > 0 && pts[lo - 1].on; i++) lo--; for (let i = 0; i < m && hi < pts.length - 1 && pts[hi + 1].on; i++) hi++; return [lo, hi] }
    const ends = closed ? [] : [!(a > 0 && pts[a - 1].on) && all[a], !(b < pts.length - 1 && pts[b + 1].on) && all[b]].filter(Boolean)
    const [o0, o1] = reach(1), [f0, f1] = reach(2)
    return ends.map((p) => capUnder(p, Tp, pal.outline, W)).join('') +
      strokePath(lineD(all.slice(o0, o1 + 1)), pal.outline, Tp + 2 * W, 'butt') + strokePath(lineD(all.slice(f0, f1 + 1)), fill, Tp, 'butt') +
      ends.map((p) => capOver(p, Tp, fill)).join('')
  }
  const runs = strands.map(runsOf)
  const layer = (front) => runs.flatMap((rs, k) => rs.filter((r) => r.front === front).map((r) => draw(strands[k], r, k))).join('')
  const pairs = []
  for (let h = 0; h < twists * 2; h++)
    for (const q of [0.25, 0.5, 0.75]) {
      const t = (h + q) / (twists * 2), [cx, cy] = centre(t), [nx, ny] = normal(t), ph = 2 * Math.PI * twists * t, s = Math.sin(ph) * A
      const inset = (T / 2 + W / L.px) * Math.sign(s)
      if (Math.abs(s) * 2 < T * 2.2 || !on(0, t) || !on(1, t)) continue
      const pal = palOf(0, t) === palOf(1, t) ? palOf(0, t) : palOf(-1, t)
      pairs.push(strokePath(lineD([L.P([cx + nx * (s - inset), cy + ny * (s - inset)]), L.P([cx - nx * (s - inset), cy - ny * (s - inset)])]), pal.small, Math.max(1.5, Tp * 0.42), 'butt'))
    }
  return layer(false) + pairs.join('') + layer(true)
}
/** The palette of a stretch list: [[t0, t1, pal, strand?], ...] over a default; strand -1 asks for the default. */
const stretchPal = (base, stretches) => (k, t) => (k < 0 ? base : stretches.find(([a, b, , s]) => t >= a && t <= b && (s === undefined || s === k))?.[2] ?? base)
/** Gaps per strand: [[t0, t1, strand], ...]. */
const gapsOn = (gaps) => (k, t) => !gaps.some(([a, b, s]) => s === k && t > a && t < b)

/** The DNA part (straight, large) with `stretches` of other palettes and `gaps` in a strand. Same options as `dna`. */
function dnaWith(g, { x, y, size, turn = 0, id = 'DNA', w, pal = dnaPal, width, turns, stretches = [], gaps = [] }) {
  const L = frame(g, x, y, size), D = ((width ?? size * 0.26) / size) * 100
  const W = w ?? clamp(D * L.px * 0.06, 3.5, 7), T = D * 0.15, A = (D - T) / 2 - W / L.px, tw = turns ?? Math.max(1, Math.round(100 / (D * 1.9)))
  const half = 50 - T / 2 - W / L.px
  const body = helix(L, { centre: (t) => [-half + 2 * half * t, 0], normal: () => [0, 1], twists: tw, A, T, W, palOf: stretchPal(pal, stretches), on: gapsOn(gaps), n: Math.max(60, Math.round(tw * 40)) })
  return { defs: '', body: wrap(g, id, x, y, turn, body), parts: [['DNA', pal], ...stretches.map((s) => [`${id} stretch`, s[2]])] }
}
/** The circular DNA part (large) with `stretches` of other palettes. Same options as `circularDna`. */
function ringWith(g, { x, y, size, turn = 0, id = 'circular-DNA', w, pal = dnaPal, twists = 8, stretches = [] }) {
  const L = frame(g, x, y, size), W = w ?? clamp(L.ext * 0.012, 3.5, 6), T = 5, A = 7, R = 50 - A - T / 2 - W / L.px
  const centre = (t) => [R * Math.cos(2 * Math.PI * t), R * Math.sin(2 * Math.PI * t)], normal = (t) => [Math.cos(2 * Math.PI * t), Math.sin(2 * Math.PI * t)]
  const body = helix(L, { centre, normal, twists, A, T, W, palOf: stretchPal(pal, stretches), on: () => true, closed: true, n: twists * 48 })
  return { defs: '', body: wrap(g, id, x, y, turn, body), parts: [['DNA', pal], ...stretches.map((s) => [`${id} stretch`, s[2]])] }
}
// Without stretches the copy must draw what the part draws.
{
  const g = page(4.6, [0, 0])
  const same = (a, b, what) => { if (a.body !== b.body) throw new Error(`the copied helix differs from the part (${what})`) }
  same(dnaWith(g, { x: 3, y: -4, size: 60, width: 18, turns: 2, turn: 12 }), dna(g, { x: 3, y: -4, size: 60, width: 18, turns: 2, turn: 12, flat: false }), 'dna')
  same(ringWith(g, { x: 0, y: 0, size: 70, twists: 9 }), circularDna(g, { x: 0, y: 0, size: 70, twists: 9, flat: false }), 'circular DNA')
}

// ---------------------------------------------------------------------------------------------------------------------
// Molecular cloning: a plasmid (the vector) carrying an insert, and the insert, a short piece of DNA, going in.
// (SiliCoDraw draws a thin blue ring with a thick orange arc on it, an orange dash at the upper left and a small arrow from
// the dash to the ring. Here the ring is the circular DNA part with the insert a stretch of it in orange, both strands;
// the free insert is the DNA part in the same orange, and the arrow is the arrow part in grey.)
{
  const g = page(5.09, [-0.44, -0.06]), ins = deep(ORANGE)
  const ring = ringWith(g, { x: 12, y: 12, size: 66, id: 'vector', twists: 9, stretches: [[0.58, 0.74, ins]] })
  const insert = dnaWith(g, { x: -27, y: -35, size: 38, width: 15, turns: 1.5, turn: -14, pal: ins, id: 'insert' })
  const to = arrow(g, { x: -12, y: -19, size: 17, turn: 48, colour: GREY.outline, id: 'arrow' })
  icon('Molecular cloning', join(ring, insert, to))
}

// Restriction digest: a restriction enzyme (the scissors) has cut a DNA in two, leaving sticky ends.
// (SiliCoDraw draws two flat ladders of DNA side by side with dark scissors over the gap. Here the two pieces are the DNA
// part, each with one strand running on past the other: the staggered cut most restriction enzymes make. The scissors
// are the scissors part (../parts/genetics.mjs), their rings the amber of a protein, since the cutter is an enzyme.)
{
  const g = page(4.62, [0, -9.7])
  const left = dnaWith(g, { x: -25.5, y: 20, size: 45, width: 19, turns: 1.5, id: 'DNA-left', gaps: [[0.74, 1.01, 1]] })
  const right = dnaWith(g, { x: 25.5, y: 20, size: 45, width: 19, turns: 1.5, id: 'DNA-right', gaps: [[-0.01, 0.26, 0]] })
  const cut = scissors(g, { x: 0, y: -16.8, size: 62, pal: deep(PROTEIN), w: 6 })
  icon('Restriction digest', join(left, right, cut))
}

// Pedigree: two parents and three children: the father (square) unaffected, the mother (circle) affected; a son affected,
// a daughter and a son unaffected. Lines: the mating line between the parents, the line of descent and the sibship line.
// (SiliCoDraw's symbols and lines, rounded a little; affected is a dark slate as SiliCoDraw's near-black, unaffected
// pale grey. Drawn here: no part draws them.)
{
  const g = page(5.25, [0, -4])
  const pale = { light: grey(0.995, 0.002), base: grey(0.965, 0.004), shadow: grey(0.89, 0.007), outline: grey(0.5, 0.01) }
  const dark = { light: toHex({ l: 0.66, c: 0.03, h: 262 }), base: toHex({ l: 0.5, c: 0.035, h: 262 }), shadow: toHex({ l: 0.4, c: 0.035, h: 262 }), outline: toHex({ l: 0.33, c: 0.035, h: 262 }) }
  const W = 8, S = 24, H = S / 2
  let defs = ''
  const shape = (id, kind, [x, y], pal) => {
    // Flat (review of 23 November 2026): the symbols of a chart are a picture of data, not bodies; with a gradient and
    // the gloss they looked like buttons.
    const d = kind === 'square' ? rrectD(g, x - H, y - H, S, S, 2.6) : null
    const outline = d ? `<path d="${d}" fill="${pal.base}" stroke="${pal.outline}" stroke-width="${W}" stroke-linejoin="round"/>` : g.circle(x, y, H, pal.base, pal.outline, W)
    return `<g id="${id}">${outline}</g>`
  }
  const lines = `<g id="lines">${g.line([[-8, -30], [8, -30]], GREY.outline, W)}${g.line([[0, -30], [0, -6]], GREY.outline, W)}${g.line([[-30, -6], [30, -6]], GREY.outline, W)}` +
    [-30, 0, 30].map((x) => g.line([[x, -6], [x, 10]], GREY.outline, W)).join('') + '</g>'
  const body = lines + '\n' + shape('father', 'square', [-20, -30], pale) + shape('mother', 'circle', [20, -30], dark) +
    shape('son-affected', 'square', [-30, 22], dark) + shape('daughter', 'circle', [0, 22], pale) + shape('son', 'square', [30, 22], pale)
  icon('Pedigree', { defs, body, parts: [['unaffected', pale], ['affected', dark], ['lines', GREY]] })
}

// DNA repair: a repair enzyme on a DNA whose damaged stretch of one strand has been replaced (the new patch in green).
// (SiliCoDraw draws a flat ladder with two green rungs, a pale green protein above it with a green dot and a small arrow
// down to the DNA. Here the DNA is the DNA part with a green patch on one strand, as excision repair leaves it; the
// enzyme is the protein part in the amber of every free protein, sitting on the DNA over the patch. The arrow and the dot
// are left out: the enzyme on the DNA says where it acts.)
{
  const g = page(4.66, [0, -5]), patch = deep(GREEN)
  const helixPart = dnaWith(g, { x: 0, y: 16, size: 96, width: 24, turns: 2.5, id: 'DNA', stretches: [[0.42, 0.73, patch, 0]] })
  const enzyme = protein(g, { x: 8, y: -15, size: 48, id: 'repair-enzyme' })
  icon('DNA repair', join(enzyme, helixPart))
}

// Transcription factor: a transcription factor bound to its site in a promoter (orange), upstream of the start of a gene
// (the bent arrow, the way transcription starts are drawn on a gene map).
// (SiliCoDraw draws a line of DNA with an orange box under a pale green protein, a straight arrow along the DNA and a
// small blue box joined to it by a dotted line. Here the DNA is the DNA part with the binding site a stretch of it in
// orange, the factor the protein part in SiliCoDraw's pale green (amber would lie 18° from the site), and the start of
// transcription the bent arrow part; the small box and the dotted line are left out.)
{
  const g = page(4.62, [0, -1.6]), site = deep(ORANGE), factor = soft(GREEN)
  const helixPart = dnaWith(g, { x: 0, y: 22, size: 96, width: 22, turns: 2.5, id: 'DNA', stretches: [[0.2, 0.5, site]] })
  const tf = protein(g, { x: -15, y: -12, size: 50, id: 'transcription-factor', pal: factor })
  const start = arrow(g, { points: [[25, 8], [25, -22], [46, -22]], corners: true, colour: GREY.outline, id: 'transcription-start', w: 10 })
  icon('Transcription factor', join(tf, helixPart, start))
}

// Chromatin state: open chromatin above (nucleosomes spaced out on the DNA, which proteins can reach) and closed chromatin
// below (nucleosomes packed together).
// (SiliCoDraw draws the two as thin threads with pale oval nucleosomes and writes "open" and "closed" beside them. Here
// the open chromatin is the chromatin part with nucleosomes; the closed one, which no part draws, is a cluster of the
// same beads on the same thread, drawn here. The words are left out.)
{
  const g = page(4.7, [0, 1.5])
  const open = chromatin(g, { x: 0, y: -24, size: 96, nucleosomes: true, id: 'open-chromatin' })
  // The beads of the part: radius 7 of its 100 units, its gradient and outline; the same here at the part's size.
  const s = 96 / 100, r = 7 * s, ext = 96 * g.k, Wb = clamp(clamp(2.5 + ext * 0.03, 3.5, 10) * 0.6, 3.5, 6), Tt = clamp(ext * 0.018, 2, 8)
  const thread = [[-48, 30], [-38, 22], [-28, 26], [-22, 18], [-12, 22], [-6, 14], [4, 20], [12, 12], [18, 22], [26, 16], [34, 26], [42, 20], [48, 26]]
  const beads = [[-22, 22], [-12, 14], [-10, 28], [0, 20], [2, 7], [12, 26], [14, 13], [24, 20], [-2, 33], [24, 7]]
  const order = beads.slice().sort((a, b) => a[1] - b[1] || a[0] - b[0])
  const closed = `<g id="closed-chromatin"><path d="${lineD(catmull(thread, 12).map(g.P))}" fill="none" stroke="${NUC.outline}" stroke-width="${f(Tt)}" stroke-linecap="round" stroke-linejoin="round"/>` +
    order.map(([x, y]) => g.circle(x, y, r, 'url(#closed-chromatin-gradient)', NUC.outline, f(Wb))).join('') + '</g>'
  const boxGrad = `<linearGradient id="closed-chromatin-gradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${NUC.base}"/><stop offset="1" stop-color="${NUC.shadow}"/></linearGradient>`
  icon('Chromatin state', { defs: open.defs + boxGrad, body: open.body + '\n' + closed, parts: [...open.parts] })
}

// Gel electrophoresis: an agarose gel with four lanes, a well at the top of each and bands of DNA run down it.
// (SiliCoDraw draws a dark slate gel with pale wells and white bands, as a stained gel looks under light. Here the gel is
// pale (aqua grey, the colour of a gel slab), the wells and the bands deep: the bands in the blue of DNA. Band places as
// SiliCoDraw's. Drawn here: no part draws a gel.)
{
  const g = page(5.05, [0, 0]), slab = soft(GEL), band = deep(DNA)
  const W = 11, x0 = -46, y0 = -36, gw = 92, gh = 72
  const gel = `<g id="gel"><path d="${rrectD(g, x0, y0, gw, gh, 4.5)}" fill="url(#gel-gradient)" stroke="${slab.outline}" stroke-width="${W}" stroke-linejoin="round"/>` +
    `${g.hl(-41.2, -4, 5.5, 30, 0, slab.light)}` +
    [-30, -10, 10, 30].map((x) => `<path d="${rrectD(g, x - 7, -31, 14, 6, 1.6)}" fill="${slab.outline}"/>`).join('') + '</g>'
  const bands = [[-30, -16], [-30, 2], [-30, 16], [-10, -8], [-10, 20], [10, -16], [10, 10], [30, -2], [30, 22]]
  const body = gel + `\n<g id="bands">${bands.map(([x, y]) => `<path d="${rrectD(g, x - 7, y, 14, 4.4, 2.2)}" fill="${band.small}"/>`).join('')}</g>`
  icon('Gel electrophoresis', { defs: g.grad('gel-gradient', [x0, y0, x0 + gw, y0 + gh], slab), body, parts: [['gel', slab], ['bands', band]] })
}

// Sequencing reads: short reads lined up against a reference sequence.
// (SiliCoDraw draws the reference as a dark line and the reads as blue and orange bars in five rows. Here the reference is
// the DNA part; the reads are bars, drawn here, cerulean with every third orange, as SiliCoDraw has them.)
{
  const g = page(4.66, [0, -3.5]), a = soft(READ), b = soft(ORANGE)
  const ref = dna(g, { x: 0, y: -36, size: 96, width: 14, turns: 4, id: 'reference' })
  const reads = [[-44, -20, 34], [-6, -20, 40], [-30, -8, 44], [20, -8, 26], [-46, 4, 30], [-10, 4, 50], [-36, 16, 40], [12, 16, 34], [-20, 28, 36], [22, 28, 24]]
  const gradOf = (id, pal) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`
  const bars = reads.map(([x, y, w], i) => { const pal = i % 3 === 1 ? b : a, id = i % 3 === 1 ? 'reads-b' : 'reads-a'; return `<path d="${rrectD(g, x + 0.5, y, w - 1, 8, 2.6)}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="5" stroke-linejoin="round"/>` })
  icon('Sequencing reads', {
    defs: ref.defs + gradOf('reads-a-gradient', a) + gradOf('reads-b-gradient', b),
    body: ref.body + `\n<g id="reads">${bars.join('')}</g>`,
    parts: [...ref.parts, ['reads', a], ['reads, second kind', b]],
  })
}

check()
console.log('written to', OUT)
