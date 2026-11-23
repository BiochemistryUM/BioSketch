// Eight icons of SiliCoDraw's "Cells & tissues" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts in ../parts/:
// a nucleus whose envelope has burst, and the life of mitochondria (fission and fusion, heteroplasmy, the membrane
// potential, biogenesis, cristae remodelling, transfer between cells, mitokine signalling). Their compositions are read by
// hand from the source in a 100 × 100 box centred on 0,0 and scaled onto a 512 page (`page` of ../cellkit.mjs).
// Every mitochondrion is the owner's (../mitokit.mjs): `mitochondrion` of ../parts/organelles.mjs where it is the usual
// one, mitokit's `mitochondrion` and `drawMito` where it must be pinched, wider between its membranes or without cristae
// (as ../mito-dynamics.mjs draws fission), and the approved "Mitochondrial fission" placed as it is (../iconkit.mjs).
// Parts used: nucleus, mitochondrion (organelles.mjs); protein, circular DNA, growth factor (molecules.mjs); receptor
// (membranes.mjs); cell, arrows, plus, lightning (tissue.mjs).
// Drawn here because no part draws them: the nucleus with a burst bleb (`Nuclear envelope rupture`, in the nucleus part's
// look), the gap of a deleted mitochondrial DNA ring, swollen cristae with wide junctions (traced as a distance field, as
// mito-dynamics.mjs traces the network) and the tunnelling nanotube between two cells.
// Nothing is lettered: no original writes a label; the charges of the membrane potential are the plus part and strokes.
// Usage: node ct15.mjs <folder>
import { mkdirSync } from 'node:fs'
import { NUC, cellTypes, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex, toLch } from '../colour.mjs'
import { bbox, f, pathOf, segDist, simplify, smax, smin, trace } from '../shapes.mjs'
import { GAP_SHARE, MITO, capsule, drawMito, mitochondrion as mitoShape, place } from '../mitokit.mjs'
import { placeIcon } from '../iconkit.mjs'
import { mitochondrion, nucleus } from '../parts/organelles.mjs'
import { circularDna, growthFactor, protein } from '../parts/molecules.mjs'
import { receptor } from '../parts/membranes.mjs'
import { CELL, INK, arrow, cell, lightning, plus } from '../parts/tissue.mjs'

const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT)
// Greys (chroma below 0.012) are left out of the hue check.
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p]) => toLch(p.base).c >= 0.012), defs, body)
const { check } = kit
/** Parts' lists joined, one entry per name. */
const hues = (...ps) => [...new Map(ps.flatMap((p) => p.parts ?? p).map(([n, p]) => [n, [n, p]])).values()]

// Hues (OKLCH degrees). The nucleus lilac is about 319°, the mitochondrion 37°.
const MEMBRANE_PROTEIN = hueOf('#4f6bb8') // 267
const CHROMATIN = toHex({ l: 0.7, c: 0.085, h: hueOf(NUC.base) })
const DRP1 = { base: '#3FA99F' } // as drawn in Mitochondrial fission (mito-dynamics.mjs)
const MFF = { base: '#E2B23A' }
const I = page(1, [256, 256]) // a frame in page pixels

const P2 = ([x, y]) => `${f(x)},${f(y)}`
const circ = (x, y, r, fill, s = '', w = 0) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}"${s ? ` stroke="${s}" stroke-width="${f(w)}"` : ''}/>`
/** The open curve through points from index i0 to i1 of a closed smooth outline (their units), as SiliCoDraw's `open`. */
const openSmooth = (g, p, i0, i1) => {
  const n = p.length, seg = (i) => {
    const a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n], e = p[(i + 2) % n]
    return `C${[[b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6], [c[0] - (e[0] - b[0]) / 6, c[1] - (e[1] - b[1]) / 6], c].map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}`
  }
  let d = `M${f(p[i0][0])},${f(p[i0][1])}`
  for (let i = i0; i < i1; i++) d += seg(i)
  return g.D(d)
}
const curve = (g, d, colour, w) => `<path d="${g.D(d)}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"/>`

// ---------- Nuclear envelope rupture ----------
// A nucleus with a bleb that has burst at its tip: chromatin runs out through the hole and nuclear proteins leak into the
// cytoplasm. The lamina (blue) lines the body of the nucleus but not the bleb. Drawn here in the nucleus part's look
// (lilac NUC, gradient, 10 px envelope, highlight, chromatin in a deeper lilac), since the part has no bleb.
// (SiliCoDraw's pale blue nucleus is the lilac of the set; its violet lamina is blue, 52° from the lilac; the two ticks
// at the edges of the hole are left out.)
{
  const g = page(4.75, [3.2, -0.5]), lamina = soft(MEMBRANE_PROTEIN)
  const P = [[40, 6], [36, 13], [29, 15], [22, 11], [16, 19], [6, 30], [-10, 36], [-28, 31], [-40, 17], [-45, 0], [-41, -17], [-29, -30], [-11, -36], [5, -31], [16, -19], [22, -11], [29, -15], [36, -13], [40, -6]]
  const Q = P.map(([x, y]) => [-10 + (x + 10) * 0.84, y * 0.84])
  cellType('Nuclear envelope rupture', [['nucleus', NUC], ['lamina', lamina]],
    g.grad('nucleus-gradient', [-45, -36, 40, 36], NUC),
    `<g id="nucleus">${g.path(g.smooth(P), 'url(#nucleus-gradient)')}${g.hl(-28, -20, 30, 10, -40, NUC.light)}</g>\n` +
      `<g id="lamina"><path d="${openSmooth(g, Q, 4, 14)}" fill="none" stroke="${lamina.outline}" stroke-width="7" stroke-linecap="round"/></g>\n` +
      `<g id="chromatin">${curve(g, 'M-31,-4 C-25,-12 -19,0 -13,-8 C-7,-16 -3,-6 1,-10', CHROMATIN, 9)}${curve(g, 'M-28,15 C-22,21 -16,11 -10,17 C-4,23 0,15 4,19', CHROMATIN, 9)}` +
      `${curve(g, 'M-14,-24 C-10,-20 -4,-24 0,-20', CHROMATIN, 9)}${curve(g, 'M16,2 C24,-2 32,4 38,0 C44,-3 47,-8 44,-13 C41,-17 44,-22 49,-22', CHROMATIN, 10)}` +
      `${[[48, 8, 3], [44, 17, 2.6], [50, -32, 2.4]].map(([x, y, r]) => g.circle(x, y, r, CHROMATIN)).join('')}</g>\n` +
      `<g id="envelope"><path d="${openSmooth(g, P, 0, P.length - 1)}" fill="none" stroke="${NUC.outline}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></g>`)
}

// ---------- Mitochondrial fission and fusion ----------
// The approved "Mitochondrial fission" (Drp1 round the waist, Mff in the outer membrane) placed as it is, with
// SiliCoDraw's arrows: above, two pointing together (fusion); below, two pointing apart (fission).
{
  const m = placeIcon('Mitochondrial fission', { x: 256, y: 256, width: 452, prefix: 'mitochondrion' })
  const a = [-1, 1].map((dir, i) => arrow(I, { x: 256 + dir * 112, y: 76, size: 150, turn: dir > 0 ? 180 : 0, w: 12, id: `fusion-arrow-${i + 1}` }))
  const b = [-1, 1].map((dir, i) => arrow(I, { x: 256 + dir * 120, y: 436, size: 150, turn: dir > 0 ? 0 : 180, w: 12, id: `fission-arrow-${i + 1}` }))
  cellType('Mitochondrial fission and fusion', [['mitochondrion', MITO], ['Drp1', DRP1], ['Mff', MFF], ...a[0].parts], m.defs,
    `${m.body}\n<g id="fusion">${a.map((p) => p.body).join('')}</g>\n<g id="fission">${b.map((p) => p.body).join('')}</g>`)
}

// ---------- Heteroplasmy ----------
// One mitochondrion holding a mix of mitochondrial DNA: whole rings of the normal genome (the DNA part's blue) and rings
// with a deletion (crimson), the gap marked by a dot. The mitochondrion has no cristae here, so that the rings show.
// (SiliCoDraw's normal rings are a deeper tone of the mitochondrion and its mutant red lies 6° from it; two stray dots
// in the matrix are left out.)
{
  const m = mitoShape({ L: 228, H: 146, fingers: [], n: 2.6, minGap: 26 })
  const mito = drawMito(m, { dx: 256, dy: 256, L: 228, bend: -10 }, 'mitochondrion-gradient', [-184, -58, 22, 8, -62], 7)
  const mut = deep(352), S = 4.65, R = 80
  const at = ([x, y]) => [256 + x * S, 256 + y * S]
  const wt = [[-29, 2], [-9, 13], [10, -10], [29, -8]].map((p, i) => circularDna(I, { x: at(p)[0], y: at(p)[1], size: R, turn: i * 40, id: `normal-mtDNA-${i + 1}` }))
  const mutants = [[-10, -10, -0.6], [12, 11, 2.4], [31, 10, 1.2]].map(([x, y, gap], i) => {
    const [cx, cy] = at([x, y]), d = circularDna(I, { x: cx, y: cy, size: R, turn: i * 50, pal: mut, id: `mutant-mtDNA-${i + 1}-ring` })
    const r = R / 2 - R * 0.15, p = (t) => [cx + r * Math.cos(t), cy + r * Math.sin(t)]
    const cut = `<path d="M${P2(p(gap - 0.42))} A${f(r)},${f(r)} 0 0 1 ${P2(p(gap + 0.42))}" fill="none" stroke="${MITO.matrix}" stroke-width="${f(R * 0.36)}" stroke-linecap="butt"/>`
    const [dx, dy] = p(gap)
    return { ...d, body: `<g id="mutant-mtDNA-${i + 1}">${d.body}${cut}${circ(dx, dy, 8.5, mut.outline)}</g>` }
  })
  cellType('Heteroplasmy', [['mitochondrion', MITO], ['normal mtDNA', wt[0].parts[0][1]], ['mutant mtDNA', mut]], mito.defs,
    `<g id="mitochondrion">${mito.body}</g>\n<g id="normal-mtDNA">${wt.map((p) => p.body).join('')}</g>\n<g id="mutant-mtDNA">${mutants.map((p) => p.body).join('')}</g>`)
}

// ---------- Mitochondrial membrane potential ----------
// A polarised mitochondrion: a positively charged dye (TMRM, TMRE) piles up in the matrix (magenta dots); the space between
// the membranes is positive (plus signs), the matrix side of the inner membrane negative (minus strokes). The owner's
// mitochondrion with more room between its membranes than usual, so that the plus signs fit there.
// (SiliCoDraw's pink dye is magenta-red, 49° from the mitochondrion; its pink matrix is the mitochondrion's own.)
{
  const L = 228, H = 146, gap = 46
  const fingers = [{ x: -82, side: -1, depth: 0.42 }, { x: 82, side: 1, depth: 0.42 }]
  const m = mitoShape({ L, H, fingers, n: 2.6, minGap: gap })
  const at = { dx: 256, dy: 256, L, bend: 0 }
  const mito = drawMito(m, at, 'mitochondrion-gradient', [-197, -40, 20, 7, -70], 7)
  const dye = deep(348)
  const charge = MITO.outline
  const outerHalf = capsule(L, H, 2.6)
  const pluses = [[-120, -1], [-40, -1], [40, -1], [120, -1], [-120, 1], [-40, 1], [40, 1], [120, 1]]
    .map(([x, s]) => [x, s * (outerHalf(x) - gap / 2)]).concat([[-L + gap / 2, 0], [L - gap / 2, 0]])
    .map(([x, y], i) => plus(I, { x: 256 + x, y: 256 + y, size: 26, w: 7, colour: charge, id: `plus-${i + 1}` }).body)
  const minuses = [[-150, -1], [-10, -1], [140, -1], [-140, 1], [10, 1], [150, 1]].map(([x, s]) => {
    const y = 256 + s * (m.inner(x) - 22)
    return `<path d="M${f(256 + x - 11)},${f(y)} L${f(256 + x + 11)},${f(y)}" stroke="${dye.outline}" stroke-width="7" stroke-linecap="round"/>`
  })
  const dots = [[-170, -10], [-130, 30], [-110, -30], [-60, 10], [-30, -40], [-20, 50], [20, 0], [50, -42], [60, 44], [110, 16], [140, -30], [158, 0], [-80, 52], [100, -58]]
    .map(([x, y]) => circ(256 + x, 256 + y, 11, dye.small))
  cellType('Mitochondrial membrane potential', [['mitochondrion', MITO], ['dye', dye]], mito.defs,
    `<g id="mitochondrion">${mito.body}</g>\n<g id="dye">${dots.join('')}${minuses.join('')}</g>\n<g id="charges">${pluses.join('')}</g>`)
}

// ---------- Mitochondrial biogenesis ----------
// In the nucleus, the coactivator PGC-1α (amber, as every free protein) sits on the chromatin and switches on the genes
// for mitochondria; new mitochondria appear, one of them still dividing (pinched as in Mitochondrial fission).
// (SiliCoDraw's violet nucleus is the lilac of the set and its violet PGC-1α amber, so that the two recolour apart.)
{
  const g = page(4.6, [0.2, 0]), pgc = rich(75)
  const n = nucleus(g, { x: -24, y: 18, size: 52, chromatin: true, nucleolus: true, id: 'nucleus' })
  const p = protein(g, { x: -27, y: 8, size: 16, turn: 20, pal: pgc, id: 'PGC-1-alpha' })
  const a = arrow(g, { points: [[-12, -10], [-1, -25]], w: 11, colour: pgc.outline, id: 'arrow' })
  const m1 = mitochondrion(g, { x: 21, y: -32, size: 44, turn: -12, id: 'mitochondrion-1' })
  const m2 = mitochondrion(g, { x: 33, y: -1, size: 34, turn: 10, id: 'mitochondrion-2' })
  // The dividing one: the owner's mitochondrion pinched at its waist.
  const Ld = 22 * g.k, Hd = 7.6 * g.k, w = 4
  const dm = mitoShape({ L: Ld, H: Hd, pinch: 0.62, sigma: 14, fingers: [{ x: -Ld * 0.5, side: -1, depth: 0.5 }, { x: Ld * 0.5, side: 1, depth: 0.5 }], n: 2.4, minGap: w + 3 })
  const d = drawMito(dm, { dx: g.X(25), dy: g.Y(30), L: Ld, bend: 0, turn: (-18 * Math.PI) / 180 }, 'dividing-gradient', [0, 0, 0, 0, 0], w)
  cellType('Mitochondrial biogenesis', hues(n, p, m1), n.defs + p.defs + m1.defs + m2.defs + d.defs,
    [n.body, p.body, a.body, `<g id="mitochondria">${m1.body}${m2.body}<g id="dividing">${d.body}</g></g>`].join('\n'))
}

// ---------- Cristae remodelling ----------
// One mitochondrion: on the left tight cristae whose narrow junctions are held shut by OPA1 (green pairs), on the right
// swollen cristae whose junctions have widened, letting cytochrome c (red) out. Outer membrane and palette of the owner's
// mitochondrion; the matrix is traced as a distance field (as the network of mito-dynamics.mjs) so that a swollen crista
// can be a bulb on a wide neck. (SiliCoDraw's dashed line between the halves is left out.)
{
  const S = 4.9, L = 48 * S, H = 27 * S, w = 6
  const m = mitoShape({ L, H, fingers: [], n: 2.6 })
  const at = { dx: 256, dy: 256, L, bend: 0 }
  const GAP = m.gap, inner = capsule(L - GAP, H - GAP, 2.6)
  const X = (x) => 256 + x * S, Y = (y) => 256 + y * S
  const fw = 0.23 * H // a tight crista, as the owner's
  // Tight cristae: a segment from beyond the inner membrane to its tip (side -1: from the top).
  const tight = [[-33, -1, 7], [-15, -1, 7], [-24, 1, -7]].map(([x, s, tip]) => [[X(x), 256 + s * (H + 10)], [X(x), Y(tip) - s * fw / 2]])
  // Swollen cristae: a wide neck from the inner membrane and a round bulb.
  const swollen = [[10, -1], [28, 1]].map(([x, s]) => ({ neck: [[X(x), 256 + s * (H + 10)], [X(x), Y(s * 4)]], bulb: [X(x), Y(-s * 3)], r: 8.2 * S }))
  const matrixAt = (x, y) => {
    const u = x - 256, v = y - 256
    let d = Math.abs(u) >= L - GAP ? 40 : Math.abs(v) - inner(u)
    for (const [a, b] of tight) d = smax(d, -(segDist(x, y, a, b) - fw / 2), 14)
    for (const c of swollen) d = smax(d, -smin(segDist(x, y, ...c.neck) - 0.15 * H, Math.hypot(x - c.bulb[0], y - c.bulb[1]) - c.r, 30), 14)
    return d
  }
  const matrix = simplify(trace(matrixAt)[0])
  const outer = place(m.outer, at)
  const [x0, y0, x1, y1] = bbox(outer)
  const grad = `<linearGradient id="mitochondrion-gradient" x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${MITO.base}"/><stop offset="1" stop-color="${MITO.shadow}"/></linearGradient>`
  const opa1 = deep(hueOf('#6DBA55')), cytc = deep(352)
  const opa = [[-33, -1], [-15, -1], [-24, 1]].map(([x, s]) => {
    const y = 256 + s * (inner(X(x) - 256) - 2)
    return circ(X(x) - fw / 2 - 9, y, 7.5, opa1.small) + circ(X(x) + fw / 2 + 9, y, 7.5, opa1.small)
  })
  const cc = [[7, -3], [13, -5], [25, 4], [31, 1], [9, -33.5], [29, 33.5], [17, -38]].map(([x, y]) => circ(X(x), Y(y), 9.5, cytc.outline))
  cellType('Cristae remodelling', [['mitochondrion', MITO], ['OPA1', opa1], ['cytochrome c', cytc]], grad,
    `<g id="mitochondrion"><g id="outer-membrane"><path d="${pathOf(outer)}" fill="url(#mitochondrion-gradient)" stroke="${MITO.outline}" stroke-width="${w}" stroke-linejoin="round"/></g>` +
      `<g id="matrix"><path d="${pathOf(matrix)}" fill="${MITO.matrix}" stroke="${MITO.inner}" stroke-width="${w}" stroke-linejoin="round"/></g>` +
      `<g id="highlight"><ellipse cx="${f(256 - 0.82 * L)}" cy="${f(256 - 0.3 * H)}" rx="20" ry="8" transform="rotate(-62 ${f(256 - 0.82 * L)} ${f(256 - 0.3 * H)})" fill="${MITO.light}"/></g></g>\n` +
      `<g id="OPA1">${opa.join('')}</g>\n<g id="cytochrome-c">${cc.join('')}</g>`)
}

// ---------- Mitochondrial transfer ----------
// Two cells joined by a tunnelling nanotube; a mitochondrion travels through it from the donor (top left) to the
// recipient (bottom right), as the arrow beside the tube shows. The cells are the cell part; the tube is drawn here,
// its fill shaded from the donor's shadow to the recipient's base so that it runs into both without a seam.
{
  const g = page(4.85, [0, 0])
  const c1 = cell(g, { x: -29, y: -23, size: 40, aspect: 1, vesicles: false, id: 'donor' })
  const c2 = cell(g, { x: 29, y: 23, size: 40, aspect: 1, vesicles: false, id: 'recipient' })
  const wc = 11, tw = 8 * g.k
  const d = g.D('M-22,-17 C-6,-4 4,2 22,17')
  const [a0, a1] = [g.P([-17, -12]), g.P([17, 12])]
  const tubeGrad = `<linearGradient id="tube-gradient" x1="${f(a0[0])}" y1="${f(a0[1])}" x2="${f(a1[0])}" y2="${f(a1[1])}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${CELL.shadow}"/><stop offset="1" stop-color="${CELL.base}"/></linearGradient>`
  const tubeOut = `<path d="${g.D('M-17,-12 C-6,-4 4,2 17,12')}" fill="none" stroke="${CELL.outline}" stroke-width="${f(tw + 2 * wc)}" stroke-linecap="round"/>`
  const tubeIn = `<path d="${d}" fill="none" stroke="url(#tube-gradient)" stroke-width="${f(tw)}" stroke-linecap="butt"/>`
  const mitos = [[-23, -11, 15, -25], [-17, -32, 13, 60], [0, 0, 17, 36], [20, 30, 13, -10], [32, 9, 13, 70]]
    .map(([x, y, s, t], i) => mitochondrion(g, { x, y, size: s, turn: t, id: `mitochondrion-${i + 1}` }))
  const a = arrow(g, { points: [[-13, 11], [7, 26]], w: 11, colour: MITO.outline, id: 'arrow' })
  cellType('Mitochondrial transfer', hues(c1, mitos[0]), c1.defs + c2.defs + tubeGrad + mitos.map((m) => m.defs).join(''),
    `<g id="cells">${tubeOut}${c1.body}${c2.body}<g id="nanotube">${tubeIn}</g></g>\n<g id="mitochondria">${mitos.map((m) => m.body).join('')}${a.body}</g>`)
}

// ---------- Mitokine signalling ----------
// A stressed mitochondrion in a cell sends out secreted factors (FGF21, GDF15, humanin) that travel to receptors on a
// distant cell. Both cells are the cell part (the target whole, not SiliCoDraw's edge, so that it reads as a cell);
// the factors are the growth-factor dots in green, the receptors the receptor part in violet, the stress the lightning.
// (SiliCoDraw's peach cell is the cell's pale blue, apart from the mitochondrion; its green diamonds are green dots, since
// the set's blue secreted signals would join the blue cells; its teal receptors are violet, 55° from the blue.)
{
  const g = page(4.75, [0, 0]), factor = deep(165), rec = soft(300)
  const src = cell(g, { x: -24, y: 20, size: 50, aspect: 1, nucleus: false, vesicles: false, id: 'source-cell' })
  const T = [29, -25], TR = 20
  const tgt = cell(g, { x: T[0], y: T[1], size: 2 * TR + 2, aspect: 1, id: 'target-cell' })
  const m = mitochondrion(g, { x: -23, y: 24, size: 40, turn: -30, id: 'mitochondrion' })
  const bolt = lightning(g, { x: -31, y: 6, size: 17, turn: 10, id: 'stress' })
  // Receptors on the side of the target cell that faces the source, pointing out; each holds one factor.
  const recs = [114, 166].map((deg, i) => {
    const t = (deg * Math.PI) / 180, x = T[0] + (TR - 1) * Math.cos(t), y = T[1] + (TR - 1) * Math.sin(t)
    return receptor(g, { x, y, thick: 10, turn: deg + 90, pal: rec, ligandPal: factor, id: `receptor-${i + 1}` })
  })
  const dots = [[-9, -7], [2, -11], [10, -1]].map(([x, y], i) => growthFactor(g, { x, y, size: 4.6, pal: factor, id: `mitokine-${i + 1}` }))
  const a = arrow(g, { points: [[-3, 1], [5, -5]], w: 9, colour: factor.outline, id: 'arrow' })
  cellType('Mitokine signalling', [...hues(src, m, bolt), ['mitokines', factor], ['receptors', rec]],
    src.defs + tgt.defs + m.defs + bolt.defs + recs.map((r) => r.defs).join(''),
    [src.body, tgt.body, m.body, bolt.body, `<g id="receptors">${recs.map((r) => r.body).join('')}</g>`, `<g id="mitokines">${dots.map((p) => p.body).join('')}${a.body}</g>`].join('\n'))
}

check()
console.log('written to', OUT)
