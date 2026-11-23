// Eight icons of SiliCoDraw's "Molecules & genetics" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts in ../parts/:
// epigenetic drift, X inactivation (Barr body), a Hi-C contact map with its TADs, loop extrusion by cohesin up to CTCF,
// a metabolomics pathway map, aptamer-based proteomics, the proximity extension assay and an eQTL plot. Their
// compositions are read by hand from the source in a 100 × 100 box centred on 0,0 and scaled onto a 512 page (`page` of
// ../cellkit.mjs).
// Parts used: DNA, chromosome, protein, antibody, ligand (as metabolites), RNA (molecules.mjs); nucleus (organelles.mjs);
// arrow (tissue.mjs); letters (letters.mjs).
// Drawn here because no part draws them: a slide or chip (`slab`, grey), a DNA tube along any course (`tube`, as mg09's
// enhancer loop), the cohesin ring in front and behind the DNA (`cohesin`), a CTCF site as an arrow-shaped block
// (`site`, mg12's gene block), the triangle of a Hi-C map (diamond cells in a ramp of one hue), an aptamer stem-loop
// (mg11's aptamer course made small), single DNA strands that pair (proximity extension) and the marks of a box plot.
// Lettered (strokes, ../parts/letters.mjs): "Me" in every methylated CpG of Epigenetic drift. None of the other originals
// writes anything.
// Plots are kept bold and wordless, as mg12's.
// Usage: node mg20.mjs <folder>
import { mkdirSync } from 'node:fs'
import { NUC, cellTypes, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex, toLch } from '../colour.mjs'
import { catmull, f } from '../shapes.mjs'
import { antibody, chromosome, dna, ligand, protein, rna } from '../parts/molecules.mjs'
import { nucleus } from '../parts/organelles.mjs'
import { arrow } from '../parts/tissue.mjs'

const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012) are left out of the hue check, as STYLE.md says: BioSketch never recolours them with a part.
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p]) => toLch(p.base).c >= 0.012), defs, body)

// ---------- hues (OKLCH degrees) ----------
// Of the set: DNA blue 267, RNA rose 15, protein and antibody amber 75, nucleus and chromosomes lilac 318.
// Of this batch, from SiliCoDraw's colours where they can stay: the methyl mark's raspberry 2 (#c9527a), the contact map's
// red 28 (#c9473d), cohesin's orange 57 (#e3955a), up and down in the metabolite map orange 57 and blue 268 (#6f86c8),
// eQTL boxes blue 268, a purple 318 between and orange 57. Moved: CTCF green 150 (SiliCoDraw draws it in the DNA's blue),
// the antigen of PEA green 150 (its orange lies 18° from the antibodies' amber), the second oligo of PEA teal 205 (its
// brown lies within 36° of the antibodies' amber), the aptamers' targets amber 75, teal 200 and violet 295 (SiliCoDraw
// tells them apart by shape: the protein part has one).
const DNA = hueOf('#4f6bb8'), RNA = 15, AMBER = 75, NUC_HUE = hueOf(NUC.base)
const METHYL = hueOf('#c9527a'), HEAT = hueOf('#c9473d'), ORANGE = hueOf('#e3955a'), BLUE = hueOf('#6f86c8')
const GREEN = 150, TEAL = 205, VIOLET = 295, PURPLE = 318
// A true grey (chroma below 0.012) for slides, axes, arrows and marks that are the colour of nothing: the arrow part's own
// INK is a bluish slate within 36° of DNA blue.
const GREY = { light: toHex({ l: 0.985, c: 0, h: 0 }), base: toHex({ l: 0.94, c: 0.004, h: 255 }), shadow: toHex({ l: 0.85, c: 0.006, h: 255 }), small: toHex({ l: 0.74, c: 0.006, h: 255 }), outline: toHex({ l: 0.52, c: 0.008, h: 255 }) }
const INK = toHex({ l: 0.48, c: 0, h: 0 }), AXIS = toHex({ l: 0.6, c: 0, h: 0 })

// ---------- helpers ----------
const P2 = ([x, y]) => `${f(x)},${f(y)}`
const ptsD = (pts) => `M${pts.map(P2).join(' L')}`
const stroke = (pts, colour, w, cap = 'round', extra = '') => `<path d="${ptsD(pts)}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"${extra}/>`
/** Puts parts together: [part, ...] → { defs, body, parts }. */
const join = (...ps) => ({ defs: ps.map((p) => p.defs ?? '').join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts ?? []) })
/** Points of a cubic Bézier (g units). */
const bez = (a, b, c, d, n = 24) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, s = 1 - t; return [0, 1].map((k) => s * s * s * a[k] + 3 * s * s * t * b[k] + 3 * s * t * t * c[k] + t * t * t * d[k]) })
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
const rectD = (g, [x0, y0, x1, y1], r) => roundPoly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(g.P), r * g.k)
/** A point turned by `deg` (clockwise, as SVG) about 0,0. */
const rot = ([u, v], deg) => { const a = (deg * Math.PI) / 180; return [u * Math.cos(a) - v * Math.sin(a), u * Math.sin(a) + v * Math.cos(a)] }
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k]

/** A slide, chip or plate seen from the side: a grey rounded slab with a gradient and an outline (g units). */
const slab = (g, id, box, r, w) => ({
  defs: g.grad(`${id}-gradient`, box, GREY),
  body: `<g id="${id}"><path d="${rectD(g, box, r)}" fill="url(#${id}-gradient)" stroke="${GREY.outline}" stroke-width="${f(w)}" stroke-linejoin="round"/></g>`,
  parts: [],
})
/** A tube along page points: the outline tone under the base tone (as mg09's DNA). */
const tube = (pts, T, pal, w, cap = 'round') => stroke(pts, pal.outline, T + 2 * w, cap) + stroke(pts, pal.base, T, cap)

// =====================================================================================================================
// Epigenetic drift: the same four stretches of DNA in a young cell (left) and an old one (right). When young, the
// methylated CpGs (raspberry dots) follow one pattern in every stretch; with age the pattern drifts, marks
// are lost and gained at random, and the stretches no longer agree.
// (SiliCoDraw draws two grey cards with rows of filled and open circles on hairlines. Here every row is the DNA part (a
// flat helix), the methylated sites are filled raspberry dots, unlettered (32 small "Me" read as speckle at 40 px and
// SiliCoDraw writes none), the unmethylated ones are pale rings in the same hue, and the cards are grey slabs. The old card's pattern is picked by hand, as the source draws it at random.)
// =====================================================================================================================
{
  const g = page(4.71, [0, 0]), mark = deep(METHYL), dnaPal = deep(DNA)
  const young = [[1, 0, 1, 1], [1, 0, 1, 1], [1, 0, 1, 1], [1, 0, 1, 1]], old = [[1, 1, 0, 1], [0, 0, 1, 1], [1, 0, 1, 0], [0, 1, 1, 0]]
  const r = 3.6, h = 2.8, ring = 3.4
  const card = (x0, rows, id) => {
    const s = slab(g, `${id}-card`, [x0, -37, x0 + 40, 37], 6, 7)
    const strands = rows.map((_, ri) => dna(g, { x: x0 + 20, y: -24 + ri * 16, size: 36, width: 11, turns: 2, flat: true, id: `${id}-DNA-${ri + 1}` }))
    const sites = rows.flatMap((row, ri) => row.map((m, ci) => {
      const x = x0 + 7.4 + ci * 8.4, y = -24 + ri * 16
      return m
        ? g.circle(x, y, r, mark.small)
        : g.circle(x, y, r - ring / 2 / g.k, mark.light, mark.small, ring)
    }))
    return { defs: s.defs + strands.map((d) => d.defs).join(''), body: `<g id="${id}">${s.body}<g id="${id}-DNA">${strands.map((d) => d.body).join('')}</g><g id="${id}-CpG">${sites.join('')}</g></g>` }
  }
  const a = card(-48, young, 'young'), b = card(8, old, 'old')
  const drift = arrow(g, { x: 0, y: 0, size: 11, colour: INK, w: 7, id: 'ageing' })
  const all = join(a, b, drift)
  cellType('Epigenetic drift', [['DNA', dnaPal], ['methyl marks', mark]], all.defs, all.body)
}

// =====================================================================================================================
// X inactivation: in the nucleus of a female cell one X chromosome stays active (left) and the other is silenced,
// condensed into a small dark Barr body at the nuclear rim and coated by its own XIST RNA (rose strands on a pale cloud).
// (As SiliCoDraw, with the nucleus and chromosome parts: the chromosomes are in deeper tones of the nucleus's lilac, as
// the set draws chromatin, so they recolour with it; the Barr body darker still. XIST is the RNA part in the rose of
// every RNA; SiliCoDraw's ten squiggles are seven. SiliCoDraw's small nucleolus is left out (the part puts it in the
// middle of the right half, where the Barr body lies), and the Barr body is moved against the rim, where it is found.)
// =====================================================================================================================
{
  const g = page(5.0, [0, 0]), rnaPal = deep(RNA), cloud = soft(RNA)
  const nuc = nucleus(g, { x: 0, y: 0, size: 92, oval: 40 / 46 })
  const active = chromosome(g, { x: -15, y: 3, size: 48, turn: 0, id: 'active-X', pal: deep(NUC_HUE) })
  const dark = { light: toHex({ l: 0.86, c: 0.04, h: NUC_HUE }), base: toHex({ l: 0.6, c: 0.11, h: NUC_HUE }), shadow: toHex({ l: 0.5, c: 0.12, h: NUC_HUE }), small: toHex({ l: 0.45, c: 0.12, h: NUC_HUE }), outline: toHex({ l: 0.38, c: 0.1, h: NUC_HUE }) }
  const B = [27, 6]
  const barr = chromosome(g, { x: B[0], y: B[1], size: 23, turn: 8, id: 'Barr-body', pal: dark, w: 5 })
  const halo = `<g id="XIST-cloud">${g.ellipse(B[0], B[1], 12.5, 17, 8, cloud.base)}</g>`
  const strands = [[-13, -4, 100], [-11, 12, 75], [0, -16, 0], [11, -9, 120], [12, 8, 80], [2, 18, 10], [-5, 1, 95]]
    .map(([u, v, t], i) => rna(g, { x: B[0] + u, y: B[1] + v, size: 8.5, turn: t, waves: 1.5, width: 6, id: `XIST-${i + 1}`, pal: rnaPal }))
  const all = join(nuc, active, { defs: '', body: halo }, barr, ...strands)
  cellType('X inactivation', [['nucleus and chromosomes', NUC], ['XIST RNA', rnaPal]], all.defs, all.body)
}

// =====================================================================================================================
// Hi-C contact map: how often two stretches of a chromosome touch, as a triangle over the chromosome (every diamond a pair
// of stretches, darker the more often). Contacts are strongest near the diagonal and within three domains (TADs, outlined),
// and darkest at the corners of two loops; under the map, the chromosome with its three domains.
// (As SiliCoDraw: twelve bins, the same six steps of colour, here a ramp of one red in OKLCH, the domains outlined bold.
// The track under it is a lilac bar, the colour of chromosomes, with the domains in the map's red.)
// =====================================================================================================================
{
  const g = page(4.82, [0, 1.5]), map = deep(HEAT)
  const steps = [[0.965, 0.02], [0.91, 0.05], [0.83, 0.09], [0.73, 0.13], [0.62, 0.155], [0.5, 0.15]].map(([l, c]) => toHex({ l, c, h: HEAT }))
  const n = 12, W = 94, x0 = -47, h = W / n / 2, yb = 17, tad = [0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2], doms = [[0, 5], [5, 9], [9, 12]]
  const cells = steps.map(() => [])
  for (let i = 0; i < n; i++) for (let j = i; j < n; j++) {
    let v = 0.12 + Math.exp(-(j - i) / 3.4) * 0.78 + (tad[i] === tad[j] ? 0.36 : 0)
    if ((i === 0 && j === 4) || (i === 5 && j === 8)) v = 1.3
    const k = Math.max(0, Math.min(5, Math.round(v * 3.8))), x = x0 + (i + j + 1) * h, y = yb - (j - i) * h
    const pts = i === j ? [[x - h, y], [x, y - h], [x + h, y]] : [[x - h, y], [x, y - h], [x + h, y], [x, y + h]]
    cells[k].push(`M${pts.map(g.P).map(P2).join(' L')}Z`)
  }
  const heat = cells.map((ds, k) => (ds.length ? `<path d="${ds.join(' ')}" fill="${steps[k]}" stroke="${steps[k]}" stroke-width="1.2" stroke-linejoin="round"/>` : '')).join('')
  const edge = toHex({ l: 0.42, c: 0.12, h: HEAT })
  const frameD = [[x0, yb], [0, yb - W / 2], [-x0, yb]].map(g.P)
  const outline = `<path d="M${frameD.map(P2).join(' L')}Z" fill="none" stroke="${map.outline}" stroke-width="7" stroke-linejoin="round"/>`
  const domains = doms.map(([p, q]) => { const xa = x0 + p * 2 * h, xb = x0 + q * 2 * h; return stroke([[xa, yb], [(xa + xb) / 2, yb - (xb - xa) / 2], [xb, yb]].map(g.P), edge, 7) }).join('')
  const bar = g.grad('chromosome-gradient', [x0, 23, -x0, 34], NUC)
  const track = `<g id="chromosome"><path d="${rectD(g, [x0, 23, -x0, 34], 5.5)}" fill="url(#chromosome-gradient)" stroke="${NUC.outline}" stroke-width="7" stroke-linejoin="round"/>` +
    `<g id="domains">${doms.map(([p, q], i) => `<path d="${rectD(g, [x0 + p * 2 * h + 2.4, 26, x0 + q * 2 * h - 2.4, 31], 2.5)}" fill="${i % 2 ? steps[2] : steps[4]}"/>`).join('')}</g></g>`
  cellType('Hi-C contact map', [['contacts', map], ['chromosome', NUC]], bar, `<g id="contact-map">${heat}${outline}<g id="TADs">${domains}</g></g>\n${track}`)
}

// =====================================================================================================================
// Loop extrusion: a cohesin ring (orange) holds two stretches of DNA and pushes a loop out between them, growing upwards,
// until it meets two CTCF sites that point at each other (green arrow-shaped blocks on the DNA).
// (As SiliCoDraw: the DNA is a tube in the blue of DNA along SiliCoDraw's course (as mg09's enhancer loop; the DNA part is
// straight), the ring is drawn here, its far half behind the DNA and its near half in front, with SiliCoDraw's two knobs
// (the hinge at the top, the heads at the bottom). CTCF is green: SiliCoDraw draws it in the DNA's own blue. The two
// arrows that say the loop grows are the arrow part in grey.)
// =====================================================================================================================
{
  const g = page(4.46, [0, 1.5]), dnaPal = deep(DNA), ring = deep(ORANGE), ctcf = soft(GREEN)
  const segs = [[[-48, 40], [-30, 40], [-8, 40], [-6, 24]], [[-6, 24], [-4, 10], [-36, -4], [-34, -24]], [[-34, -24], [-32, -46], [32, -46], [34, -24]], [[34, -24], [36, -4], [4, 10], [6, 24]], [[6, 24], [8, 40], [30, 40], [48, 40]]]
  const course = segs.flatMap((s, i) => bez(...s, 30).slice(i ? 1 : 0)).map(g.P)
  const T = 21, Wd = 5.5
  const half = (a0, a1) => Array.from({ length: 41 }, (_, i) => { const a = ((a0 + ((a1 - a0) * i) / 40) * Math.PI) / 180; return g.P([17 * Math.cos(a), 22 + 10 * Math.sin(a)]) })
  const RT = 15, RW = 5
  const back = `<g id="cohesin-back">${stroke(half(180, 360), ring.outline, RT + 2 * RW)}${stroke(half(180, 360), ring.shadow, RT)}</g>`
  const front = `<g id="cohesin">${stroke(half(180, 0), ring.outline, RT + 2 * RW)}${stroke(half(180, 0), ring.base, RT)}` +
    `${g.circle(0, 32, 4.4, ring.small, ring.outline, RW)}${g.circle(0, 12.5, 3.6, ring.base, ring.outline, RW)}</g>`
  const site = (flip, id) => {
    const pts = [[-35, 32.5], [-24.5, 32.5], [-17.5, 40], [-24.5, 47.5], [-35, 47.5]].map(([x, y]) => g.P([flip * x, y]))
    const [ax, ay] = g.P([flip * -35, 32.5]), [bx, by] = g.P([flip * -17.5, 47.5])
    return { defs: `<linearGradient id="${id}-gradient" x1="${f(Math.min(ax, bx))}" y1="${f(ay)}" x2="${f(Math.max(ax, bx))}" y2="${f(by)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${ctcf.base}"/><stop offset="1" stop-color="${ctcf.shadow}"/></linearGradient>`, body: `<path id="${id}" d="${roundPoly(pts, 7)}" fill="url(#${id}-gradient)" stroke="${ctcf.outline}" stroke-width="6.5" stroke-linejoin="round"/>` }
  }
  const sites = join(site(1, 'CTCF-left'), site(-1, 'CTCF-right'))
  const grow = [-1, 1].map((s) => arrow(g, { points: [[s * 44, -10], [s * 44, -32]], corners: true, colour: INK, w: 8, id: `loop-growth-${s < 0 ? 'left' : 'right'}` }))
  const all = join(sites, ...grow)
  cellType('Loop extrusion', [['DNA', dnaPal], ['cohesin', ring], ['CTCF', ctcf]], all.defs,
    `${back}\n<g id="DNA">${tube(course, T, dnaPal, Wd)}</g>\n${front}\n<g id="CTCF">${sites.body}</g>\n${grow.map((a) => a.body).join('\n')}`)
}

// =====================================================================================================================
// Metabolomics pathway map: metabolites as balls on a pathway (a feeding chain into a cycle such as the TCA cycle, and
// branches off it), large and orange where a metabolite went up, small and blue where it went down, grey where it stayed.
// The cycle runs clockwise (arrows between its metabolites).
// (As SiliCoDraw, with the ligand part as every metabolite; SiliCoDraw's circle with chevrons is six arrows of the arrow
// part from metabolite to metabolite, the lines of the pathway grey.)
// =====================================================================================================================
{
  const g = page(4.65, [0.3, 3]), up = deep(ORANGE), down = deep(BLUE)
  const cx = 10, cy = 8, R = 25, N = Array.from({ length: 6 }, (_, i) => { const t = ((-90 + i * 60) * Math.PI) / 180; return [cx + R * Math.cos(t), cy + R * Math.sin(t)] })
  const E = [[-38, -40], [-27, -24], [-14, -26], N[0]]
  const nodes = [[...E[0], 0], [...E[1], 1], [...E[2], 0], [...N[0], 1], [...N[1], 0], [...N[2], 2], [...N[3], 1], [...N[4], 0], [...N[5], 2], [-38, 8, 1], [-28, 26, 0], [42, -26, 2], [30, 44, 1]]
  const radius = [5.5, 7.5, 4.2]
  const lines = `<g id="pathway">${[E, [N[4], [-38, 8], [-28, 26]], [N[1], [42, -26]], [N[2], [30, 44]]].map((pts) => stroke(pts.map(g.P), AXIS, 7)).join('')}</g>`
  const rOf = (p) => radius[nodes.find(([x, y]) => Math.hypot(x - p[0], y - p[1]) < 0.01)[2]]
  const cycle = N.map((p, i) => {
    const q = N[(i + 1) % 6], a0 = -90 + i * 60 + ((rOf(p) + 2.2) / R) * (180 / Math.PI), a1 = -30 + i * 60 - ((rOf(q) + 1.8) / R) * (180 / Math.PI)
    const pts = Array.from({ length: 13 }, (_, k) => { const a = ((a0 + ((a1 - a0) * k) / 12) * Math.PI) / 180; return [cx + R * Math.cos(a), cy + R * Math.sin(a)] })
    return arrow(g, { points: pts, corners: true, colour: INK, w: 6.5, head: 17, id: `cycle-step-${i + 1}` })
  })
  const pal = [GREY, up, down], kind = ['unchanged', 'up', 'down']
  const balls = nodes.map(([x, y, c], i) => ligand(g, { x, y, size: radius[c] * 2, pal: pal[c], id: `${kind[c]}-${i + 1}` }))
  const grouped = [0, 1, 2].map((c) => { const bs = balls.filter((_, i) => nodes[i][2] === c); return { defs: bs.map((b) => b.defs).join(''), body: `<g id="${kind[c]}">${bs.map((b) => b.body).join('')}</g>` } })
  const all = join(...cycle, ...grouped)
  cellType('Metabolomics pathway map', [['up', up], ['down', down]], all.defs, `${lines}\n<g id="cycle">${cycle.map((a) => a.body).join('')}</g>\n${grouped.map((b) => b.body).join('\n')}`)
}

// =====================================================================================================================
// Aptamer-based proteomics: a row of aptamers (short folded strands of nucleic acid) stands on a chip; each folds round one
// kind of protein from the sample and holds it, one waits empty, and more proteins come from above.
// (As SiliCoDraw, the aptamers in the look of mg11's Aptamer (a strand in the rose of nucleic acids folded into a paired
// stem and a loop round its target), the chip a grey slab. SiliCoDraw tells its three proteins apart by shape (blob,
// triangle, square); here they are the protein part in three colours.)
// =====================================================================================================================
{
  const g = page(4.8, [0, 0]), apt = deep(RNA), kinds = [rich(AMBER), soft(TEAL), soft(VIOLET)]
  const chip = slab(g, 'chip', [-47, 26, 47, 38], 4, 8)
  const s = 0.28, sy = 0.3, dy = -5.5, T = 10
  const loop = [[-13, 10], [-23, 2], [-33, -11], [-33, -30], [-20, -41], [-7, -39], [0, -33], [7, -39], [20, -41], [33, -30], [33, -11], [23, 2], [13, 10]].map(([u, v]) => [u, v === -33 ? -36.5 : v])
  const X = [-34.5, -11.5, 11.5, 34.5], K = [0, 1, -1, 2]
  const aptamers = X.map((x, i) => {
    const course = catmull([[x - 3.5, 27], [x - 3.5, 13], [x - 3.5, 22 * sy + dy], ...loop.map(([u, v]) => [x + u * s, v * sy + dy]), [x + 3.5, 22 * sy + dy], [x + 3.5, 13], [x + 3.5, 27]], 12).map(g.P)
    const rungs = [7, 13.5, 20].map((y) => stroke([g.P([x - 3.5, y]), g.P([x + 3.5, y])], apt.base, T * 0.6, 'butt')).join('')
    return `<g id="aptamer-${i + 1}">${rungs}${stroke(course, apt.small, T)}</g>`
  })
  const bound = X.map((x, i) => (K[i] < 0 ? null : protein(g, { x, y: -9.5, size: 14.5, turn: [10, 130, 0, 250][i], pal: kinds[K[i]], id: `bound-protein-${i + 1}` }))).filter(Boolean)
  const free = [[-23, -32, 0, 60], [0, -34, 1, 200], [23, -32, 2, 300]].map(([x, y, k, t], i) => protein(g, { x, y, size: 11.5, turn: t, pal: kinds[k], id: `free-protein-${i + 1}` }))
  const all = join(chip, ...bound, ...free)
  cellType('Aptamer-based proteomics', [['aptamers', apt], ['protein 1', kinds[0]], ['protein 2', kinds[1]], ['protein 3', kinds[2]]], all.defs,
    `${chip.body}\n<g id="aptamers">${aptamers.join('')}</g>\n${bound.map((p) => p.body).join('\n')}\n${free.map((p) => p.body).join('\n')}`)
}

// =====================================================================================================================
// Proximity extension assay: two antibodies bind the same protein (green); each carries a short DNA strand on its tail.
// Only because they bind side by side can the two strands meet and pair at their ends, and a polymerase extends one along
// the other (the arrow), making a piece of DNA that is then counted.
// (As SiliCoDraw, with the antibody and protein parts; the antibodies are amber as every antibody of the set and the
// antigen green (SiliCoDraw's orange lies 18° from that amber); the two strands are blue (DNA) and teal, the pairs between
// them grey, and SiliCoDraw's dashed extension is the arrow part in the blue strand's tone.)
// =====================================================================================================================
{
  const g = page(5.55, [0, 0]), s1 = deep(DNA), s2 = deep(TEAL)
  const antigen = protein(g, { x: 0, y: 23, size: 36, turn: 15, id: 'antigen', pal: soft(GREEN) })
  const size = 31, k = size / 100
  const ab = (hinge, turn, id) => { const c = add(hinge, rot([0, 4 * k], turn), -1); return { part: antibody(g, { x: c[0], y: c[1], size, turn, id }), tail: add(c, rot([0, 42 * k], turn)) } }
  const A = ab([-19, -2], 160, 'antibody-left'), B = ab([19, -2], 200, 'antibody-right')
  const T = 8
  const one = [...bez(A.tail, add(A.tail, rot([0, 1], 160), 9), [-26, -33], [-12, -33], 20), [8, -33]]
  const two = [...bez(B.tail, add(B.tail, rot([0, 1], 200), 14), [25, -39], [12, -39], 20), [-14, -39]]
  const pairs = [-9, -4, 1, 6].map((x) => stroke([g.P([x, -34.6]), g.P([x, -37.4])], AXIS, 4.5, 'butt')).join('')
  const ext = arrow(g, { points: [[10.5, -33], [23.5, -33]], corners: true, colour: s1.outline, w: T, head: 20, id: 'extension' })
  const all = join(antigen, A.part, B.part, ext)
  cellType('Proximity extension assay', [['antigen', soft(GREEN)], ['antibodies', A.part.parts[0][1]], ['DNA strand 1', s1], ['DNA strand 2', s2]], all.defs,
    `${antigen.body}\n${A.part.body}\n${B.part.body}\n<g id="DNA-strands"><g id="pairs">${pairs}</g><g id="strand-2">${stroke(two.map(g.P), s2.small, T)}</g><g id="strand-1">${stroke(one.map(g.P), s1.small, T)}</g>${ext.body}</g>`)
}

// =====================================================================================================================
// eQTL: how much of a gene's RNA people make (box plots) by their genotype at one variant (the pairs of circles below:
// open the common allele, filled the other). Each extra copy of the variant raises expression (the dashed trend line).
// (As SiliCoDraw: three boxes from blue to purple to orange with their points, grey axes, the genotypes as allele pairs;
// the trend line is dashed grey. The points are flat dots in each box's tone; jitter picked by hand.)
// =====================================================================================================================
{
  const g = page(5.05, [4, -1.5])
  const pals = [soft(BLUE), soft(PURPLE), soft(ORANGE)], dots = [deep(BLUE), deep(PURPLE), deep(ORANGE)]
  const B = [[-20, 14, 6, 22, -4, 28], [7, -2, -10, 6, -20, 14], [34, -20, -28, -12, -38, -4]]
  const J = [[-0.3, 0.1], [0.32, 0.8], [-0.1, 0.45], [0.22, 0.27], [-0.38, 0.66], [0.05, 0.95], [0.36, 0.05]]
  const axes = `<g id="axes">${stroke([[-38, -46], [-38, 31], [46, 31]].map(g.P), AXIS, 7)}</g>`
  const trend = `<g id="trend">${stroke(B.map(([x, m]) => g.P([x, m])), AXIS, 5, 'round', ' stroke-dasharray="1 13"')}</g>`
  const boxes = B.map(([x, m, q1, q3, lo, hi], i) => {
    const pal = pals[i], id = ['reference', 'heterozygous', 'alternative'][i]
    const whisk = stroke([g.P([x, lo]), g.P([x, q1])], pal.outline, 6) + stroke([g.P([x, q3]), g.P([x, hi])], pal.outline, 6) + [lo, hi].map((y) => stroke([g.P([x - 4.5, y]), g.P([x + 4.5, y])], pal.outline, 6)).join('')
    const box = `<path d="${rectD(g, [x - 8.5, q1, x + 8.5, q3], 2.2)}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="6.5" stroke-linejoin="round"/>`
    const med = stroke([g.P([x - 8.5, m]), g.P([x + 8.5, m])], pal.outline, 7, 'butt')
    const pts = J.map(([u, v]) => g.circle(x + u * 12, lo + 3 + v * (hi - lo - 6), 1.7, dots[i].small)).join('')
    return { defs: g.grad(`${id}-gradient`, [x - 8.5, q1, x + 8.5, q3], pal), body: `<g id="${id}">${whisk}${box}${med}<g id="${id}-points">${pts}</g></g>` }
  })
  const alt = dots[2]
  const alleles = B.map(([x], i) => [0, 1].map((j) => (j < i ? g.circle(x - 4.6 + 9.2 * j, 41, 3.6, alt.small) : g.circle(x - 4.6 + 9.2 * j, 41, 3.6 - 2.5 / g.k, GREY.light, GREY.outline, 5))).join('')).join('')
  const all = join(...boxes)
  cellType('eQTL', [['reference', pals[0]], ['heterozygous', pals[1]], ['alternative', pals[2]]], all.defs, `${axes}\n${trend}\n${all.body}\n<g id="genotypes">${alleles}</g>`)
}

check()
console.log('written to', OUT)
