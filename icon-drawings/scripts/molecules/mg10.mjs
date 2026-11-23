// Eight icons of SiliCoDraw's "Molecules & genetics" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David
// Carlsson; see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts
// in ../parts/: nanobody, bispecific antibody, PROTAC, SNP, karyotype, telomerase, amyloid fibril and tau tangle. Their
// compositions are read by hand from the source in a 100 × 100 box centred on 0,0 and scaled onto a 512 page (`page` of
// ../cellkit.mjs). The antibody, the proteins with a pocket, the ubiquitin chain, the small-molecule warheads, DNA, RNA
// and the chromosomes are the parts; what no part draws is drawn here: the single domain of a nanobody (`nanobody`), the
// two-coloured variable ends of a bispecific antibody (`variableEnds`), the stacked β-strands of an amyloid fibril
// (`betaStack`) and the paired helical filaments of a tau tangle (`pairedFilament`). Nothing is lettered: where SiliCoDraw
// writes a label (POI, E3, degradation, A→G, TERT, RNA, TTAGGG) a shape or a colour says the same, or it is left out.
// Usage: node mg10.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, highlight, page, smoothD } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex } from '../colour.mjs'
import { catmull, f, gradient2 } from '../shapes.mjs'
import { antibody, chromosome, dna, enzyme, ligand, protein, rna, ubiquitin } from '../parts/molecules.mjs'
import { arrow } from '../parts/tissue.mjs'

const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const { cellType, check } = cellTypes(OUT)

// ---------- hues (OKLCH degrees) ----------
const PROTEIN = 75, GREEN = hueOf('#5fae8b'), DNA = hueOf('#4f6bb8'), ROSE = 15, LILAC = hueOf('#e9d5f3'), RED = hueOf('#d64545')
const GREY = toHex({ l: 0.55, c: 0.004, h: 260 }) // the PROTAC's linker: a true grey, so it recolours on its own

/** Puts the parts of an icon together: [part, ...] → { defs, body, hues }. */
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), hues: ps.flatMap((p) => p.parts) })
const icon = (name, { defs, body, hues }) => cellType(name, hues.filter((p, i, a) => a.findIndex((q) => q[1].base === p[1].base) === i), defs, body)
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
/** The main outline (px) of a part of `px` on the page, as the parts have it. */
const lineFor = (px) => f(clamp(2.5 + px * 0.03, 3.5, 10))
/** A local frame of 100 units about x, y, `size` units of g (as the parts' `frame`). */
const frame = (g, x, y, size) => { const s = size / 100, px = s * g.k; return { px, ext: size * g.k, P: ([u, v]) => g.P([x + u * s, y + v * s]) } }
const ptsD = (pts) => `M${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' L')}`
const strokePath = (d, colour, w, cap = 'round') => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
/** Lines of width `width` (px) with one outline round them all: the outlines first, then the fills over them. */
const union = (ds, width, fill, outline, w) => ds.map((d) => strokePath(d, outline, width + 2 * w)).join('') + ds.map((d) => strokePath(d, fill, width)).join('')
const grad = (id, L, [u0, v0, u1, v1], pal) => gradient2(id, [...L.P([u0, v0]), ...L.P([u1, v1])], pal.base, pal.shadow)
const disc = ([cx, cy], r, fill) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"/>`
const shine = (L, [u, v], rx, ry, rot, fill) => { const [cx, cy] = L.P([u, v]); return highlight(cx, cy, f(rx * L.px), f(ry * L.px), rot, fill) }

// =====================================================================================================================
// Nanobody (drawn here; no part has it): the single variable domain of a camelid heavy-chain antibody (VHH), a rounded
// barrel in the antibody's amber with its β-strands faintly inside, and its three CDR loops standing out at the top in a
// rose of their own (the part that binds). `size` is its height, loops included.
// nanobody(g, { x: 0, y: 0, size: 100 })
// =====================================================================================================================
function nanobody(g, { x, y, size, id = 'nanobody', pal = rich(PROTEIN), loopPal = deep(ROSE) }) {
  const L = frame(g, x, y, size), W = lineFor(L.ext)
  const BODY = [[-20, -30], [-7, -37], [8, -37], [21, -30], [27, -10], [26, 14], [18, 34], [2, 42], [-14, 38], [-24, 20], [-27, -6]]
  // Three loops leaving the top edge: each a short arch, the middle one tallest.
  const loops = [[[-17, -26], [-21, -42], [-12, -48], [-7, -34]], [[-5, -30], [-4, -50], [7, -52], [6, -32]], [[9, -30], [13, -47], [21, -43], [19, -26]]]
  const loopDs = loops.map((p) => ptsD(catmull(p, 10).map(L.P)))
  const strands = [-12, 0, 12].map((u, i) => ptsD([[u, -20 + (i === 1 ? -4 : 0)], [u + 1, 26 - (i === 1 ? -4 : 0)]].map(L.P)))
  return {
    defs: grad(`${id}-gradient`, L, [-27, -37, 27, 42], pal),
    body: `<g id="${id}"><g id="${id}-CDR-loops">${union(loopDs, 6.5 * L.px, loopPal.small, loopPal.outline, W * 0.8)}</g>` +
      `<g id="${id}-domain"><path d="${smoothD(BODY.map(L.P))}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="${W}" stroke-linejoin="round"/>` +
      strands.map((d) => strokePath(d, pal.shadow, 4.2 * L.px)).join('') +
      (L.ext >= 140 ? shine(L, [-14, -22], 7, 2.6, -55, pal.light) : '') + '</g></g>',
    parts: [['nanobody', pal], ['CDR loops', loopPal]],
  }
}

// =====================================================================================================================
// Variable ends of an antibody (drawn here, over the antibody part, which has one colour): the outer third of each Fab
// arm, heavy and light chain together, in a colour of its own, as the two binding sites of a bispecific antibody. Uses
// the antibody part's geometry (hinge 0,4; arms to ±30,−36; heavy chains 15 wide, light chains 9 wide and 12 out).
// variableEnds(g, { x, y, size, pals: [left, right], w })
// =====================================================================================================================
function variableEnds(g, { x, y, size, id = 'variable-ends', pals, w }) {
  const L = frame(g, x, y, size), hinge = [0, 4], from = 0.68
  const ends = [[-30, -36], [30, -36]].map(([ax, ay], k) => {
    const l = Math.hypot(ax - hinge[0], ay - hinge[1]), [dx, dy] = [(ax - hinge[0]) / l, (ay - hinge[1]) / l], side = Math.sign(ax), [nx, ny] = [-dy * side, dx * side], off = 15 * 0.5 + 4.5
    const at = (t, o = 0) => L.P([hinge[0] + dx * l * t + nx * o, hinge[1] + dy * l * t + ny * o])
    const pal = pals[k], name = k ? 'right' : 'left'
    return `<g id="${id}-${name}">` + strokePath(ptsD([at(from + 0.02, off), at(0.98, off)]), pal.outline, 9 * L.px + 2 * w) + strokePath(ptsD([at(from, 0), at(1, 0)]), pal.outline, 15 * L.px + 2 * w) +
      strokePath(ptsD([at(from + 0.02, off), at(0.98, off)]), pal.small, 9 * L.px) + strokePath(ptsD([at(from, 0), at(1, 0)]), pal.base, 15 * L.px) + '</g>'
  })
  return { defs: '', body: `<g id="${id}">${ends.join('')}</g>`, parts: [['left binding site', pals[0]], ['right binding site', pals[1]]] }
}

// =====================================================================================================================
// β-strand stack (drawn here; no part has it): the cross-β core of an amyloid fibril, β-strands as broad flat arrows
// stacked one on another along the fibril's axis, every other one in the shadow tone; short dashes between them are the
// hydrogen bonds that hold the stack. `size` is its width; `count` strands.
// betaStack(g, { x: 0, y: 0, size: 100, count: 6 })
// =====================================================================================================================
function betaStack(g, { x, y, size, id = 'amyloid-fibril', pal = rich(PROTEIN), count = 6, gap = 16.5 }) {
  const L = frame(g, x, y, size), W = lineFor(L.ext) * 0.8
  const top = (-(count - 1) * gap) / 2, h = 4.4, head = 7.4
  const strand = (v) => ptsD([[-46, v - h], [26, v - h], [26, v - head], [46, v], [26, v + head], [26, v + h], [-46, v + h]].map(L.P)) + 'Z'
  const vs = Array.from({ length: count }, (_, i) => top + i * gap)
  const bonds = vs.slice(1).flatMap((v) => [-34, -16, 2, 18].map((u) => ptsD([L.P([u, v - gap + h + 2.4]), L.P([u, v - h - 2.4])])))
  return {
    defs: grad(`${id}-gradient`, L, [-46, top - head, 46, -top + head], pal) + gradient2(`${id}-shadow-gradient`, [...L.P([-46, top - head]), ...L.P([46, -top + head])], pal.shadow, pal.small),
    body: `<g id="${id}"><g id="${id}-hydrogen-bonds">${bonds.map((d) => strokePath(d, pal.outline, Math.max(2.5, 1.9 * L.px))).join('')}</g>` +
      `<g id="${id}-strands">${vs.map((v, i) => `<path d="${strand(v)}" fill="url(#${id}-${i % 2 ? 'shadow-' : ''}gradient)" stroke="${pal.outline}" stroke-width="${f(W)}" stroke-linejoin="round"/>`).join('')}` +
      (L.ext >= 140 ? shine(L, [-30, top - 1.2], 9, 1.4, 0, pal.light) : '') + '</g></g>',
    parts: [['amyloid', pal]],
  }
}

// =====================================================================================================================
// Paired helical filament (drawn here; no part has it): two tau filaments wound round each other along a centre line
// (points in g units), each passing in front and behind in turn, as tubes with one outline: filament 1 in the base tone,
// filament 2 in the shadow tone. The routine is the double helix of the DNA part without its base pairs.
// pairedFilament(g, { points: [[x, y], ...], twists: 3, width: 12 })
// =====================================================================================================================
function pairedFilament(g, { points, id = 'paired-filament', pal = rich(PROTEIN), twists = 3, width = 12, w }) {
  const cl = catmull(points.map(g.P), 30), n = cl.length - 1
  // Lengths along the centre line, so that the turns are even however the points are spaced.
  const acc = [0]
  for (let i = 1; i <= n; i++) acc.push(acc[i - 1] + Math.hypot(cl[i][0] - cl[i - 1][0], cl[i][1] - cl[i - 1][1]))
  const Wp = w ?? clamp(width * g.k * 0.08, 3.5, 6), Tp = width * g.k * 0.34, A = (width * g.k - Tp) / 2 - Wp
  const strands = [1, -1].map((sign) => cl.map((p, i) => {
    const a = cl[Math.max(0, i - 1)], b = cl[Math.min(n, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]), [nx, ny] = [-(b[1] - a[1]) / l, (b[0] - a[0]) / l]
    const ph = 2 * Math.PI * twists * (acc[i] / acc[n]) + Math.PI / 2
    return { p: [p[0] + nx * A * sign * Math.sin(ph), p[1] + ny * A * sign * Math.sin(ph)], front: sign * Math.cos(ph) >= 0 }
  }))
  const runsOf = (pts) => {
    const out = []
    let a = 0
    for (let i = 1; i < pts.length; i++) if (pts[i].front !== pts[i - 1].front || i === pts.length - 1) { out.push({ front: pts[i - 1].front, ab: [a, i] }); a = i }
    return out
  }
  const fills = [pal.base, pal.shadow]
  const draw = (pts, { ab: [a, b] }, k) => {
    const all = pts.map((q) => q.p), cut = (m) => all.slice(Math.max(0, a - m), Math.min(all.length, b + 1 + m))
    const ends = [a === 0 && all[0], b === all.length - 1 && all.at(-1)].filter(Boolean)
    const disc = ([cx, cy], r, fill, sw = 0) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${sw ? ` stroke="${fill}" stroke-width="${f(sw)}"` : ''}/>`
    return ends.map((p) => disc(p, Tp / 2 + Wp / 2, pal.outline, Wp)).join('') + strokePath(ptsD(cut(1)), pal.outline, Tp + 2 * Wp, 'butt') + strokePath(ptsD(cut(2)), fills[k], Tp, 'butt') + ends.map((p) => disc(p, Tp / 2, fills[k])).join('')
  }
  const rs = strands.map(runsOf)
  const back = rs.flatMap((r, k) => r.filter((q) => !q.front).map((q) => draw(strands[k], q, k))).join('')
  const front = rs.flatMap((r, k) => r.filter((q) => q.front).map((q) => draw(strands[k], q, k))).join('')
  return { defs: '', body: `<g id="${id}">${back}${front}</g>`, parts: [['tau', pal]] }
}

// =====================================================================================================================
// The icons
// =====================================================================================================================

// Nanobody: one VHH domain, upright, its three CDR loops at the top (drawn here, see `nanobody`). (SiliCoDraw's domain is
// a blue rounded box with orange loops and three lines; here it is the antibodies' amber, as every antibody of the set,
// with the loops rose, 60° away, and the lines as faint β-strands.)
{
  const g = page(4.4, [0, -6])
  icon('Nanobody', join(nanobody(g, { x: 0, y: 0, size: 100 })))
}

// Bispecific antibody: the antibody part, upright with its light chains, its two variable ends in two colours (blue and
// rose), one for each antigen it binds. (SiliCoDraw: a blue Y, one tip a darker blue, the other red. The body is the
// set's amber antibody here; the tips keep SiliCoDraw's blue and red, made soft.)
{
  const g = page(4.78, [0, 3])
  const ab = antibody(g, { x: 0, y: 0, size: 100 })
  const W = lineFor(100 * g.k) * 0.85
  icon('Bispecific antibody', join(ab, variableEnds(g, { x: 0, y: 0, size: 100, w: W, pals: [deep(DNA), deep(ROSE)] })))
}

// PROTAC: the ternary complex. The target protein (left) and the E3 ubiquitin ligase (right) are the enzyme part, their
// pockets facing each other; the PROTAC is two small-molecule warheads (the ligand part, blue in the target's pocket, red
// in the ligase's) joined by a grey linker; the ligase has hung a chain of ubiquitins (the part) on the target. (SiliCoDraw
// writes POI, E3 and "degradation" and puts the ubiquitins by the ligase: here the labels are left out and the chain
// hangs on the target protein, which is the one sent to the proteasome. Target green, as a tagged protein of mg01; the
// ligase keeps SiliCoDraw's lilac.)
{
  const g = page(4.62, [0, -4.3]), s = 46, depth = 0.29 * s
  const poi = enzyme(g, { x: -27, y: 8, size: s, id: 'target-protein', pal: soft(GREEN) })
  // The ligase: the enzyme part mirrored left to right, its gradient and highlight set back to fall from the top left.
  const e3raw = enzyme(g, { x: 27, y: 8, size: s, id: 'E3-ligase', pal: soft(LILAC) }), X = g.X(27), lp = soft(LILAC)
  const e3 = {
    defs: e3raw.defs.replace(/x1="([\d.-]+)"(.*?)x2="([\d.-]+)"/, (_, a, mid, b) => `x1="${b}"${mid}x2="${a}"`),
    body: `<g transform="translate(${f(2 * X)} 0) scale(-1 1)">${e3raw.body.replace(/<ellipse[^>]*\/>/, '')}</g>`,
    parts: e3raw.parts,
  }
  const [hx, hy] = g.P([27 - 9.5, 8 - 12])
  const e3light = { defs: '', body: `<g id="E3-ligase-highlight">${highlight(hx, hy, f(6 * g.k), f(2.1 * g.k), -38, lp.light)}</g>`, parts: [] }
  const wl = ligand(g, { x: -27 + depth, y: 8, size: 10, id: 'warhead-target', pal: deep(DNA) })
  const wr = ligand(g, { x: 27 - depth, y: 8, size: 10, id: 'warhead-ligase', pal: deep(RED) })
  const linker = { defs: '', body: `<g id="linker">${strokePath(ptsD([g.P([-27 + depth + 4, 8]), g.P([-2.5, 5.6]), g.P([2.5, 10.4]), g.P([27 - depth - 4, 8])]), GREY, 2.4 * g.k)}</g>`, parts: [['linker', { base: GREY }]] }
  const dir = -118, len = 30, start = [-33, -11]
  const ub = ubiquitin(g, { x: start[0] + (Math.cos((dir * Math.PI) / 180) * len) / 2, y: start[1] + (Math.sin((dir * Math.PI) / 180) * len) / 2, size: len, count: 4, turn: dir })
  icon('PROTAC', join(ub, poi, e3, e3light, linker, wl, wr))
}

// SNP: the DNA part, lying flat, with one base pair in red (the variant), pointed at by a short arrow from above.
// (SiliCoDraw draws a ladder with one red rung in a white ring and writes "A→G" above it: the arrow takes the label's
// place, the helix that of the ladder.)
{
  const g = page(4.95, [0, -10.9])
  const Ld = 96, Wd = 34, turns = 2.5, pal = deep(DNA)
  const d = dna(g, { x: 0, y: 6, size: Ld, width: Wd, turns })
  // The middle base pair, where the strands stand farthest apart (worked out as the part places its base pairs).
  const L = frame(g, 0, 6, Ld), D = (Wd / Ld) * 100, W = clamp(D * L.px * 0.06, 3.5, 7), T = D * 0.15, A = (D - T) / 2 - W / L.px
  const reach = A - (T / 2 + W / L.px), red = deep(RED)
  const rung = { defs: '', body: `<g id="variant">${strokePath(ptsD([L.P([0, -reach]), L.P([0, reach])]), red.outline, T * L.px * 0.42 + 2 * W, 'round')}${strokePath(ptsD([L.P([0, -reach]), L.P([0, reach])]), red.small, T * L.px * 0.42, 'round')}</g>`, parts: [['variant', red]] }
  const mark = arrow(g, { points: [[0, -44], [0, -24.5]], colour: red.outline, id: 'variant-arrow', w: 9 })
  icon('SNP', join(d, rung, mark))
}

// Karyotype: twenty-four chromosomes as twelve pairs of homologues (the chromosome part, banded), in three rows from the
// largest to the smallest. (SiliCoDraw: sixteen bars with a dark centromere dot in two rows, split by a dotted line; the
// line is left out, and the bars are the set's lilac X chromosomes. The part puts every centromere in the middle.)
{
  // Pairs in three columns, as on a karyogram; every chromosome of a row centred on one line.
  const rows = [[28, 26, 24], [22, 20, 18], [16, 14, 12]], cols = [-38, 0, 38], ys = [-31, 3, 31]
  const g = page(4.15, [-1.2, -3.2])
  const ps = []
  rows.forEach((sizes, r) => sizes.forEach((s, i) => {
    const off = (0.55 * s + 3.6) / 2
    for (const k of [-1, 1]) ps.push(chromosome(g, { x: cols[i] + k * off, y: ys[r], size: s, id: `chromosome-${r * 3 + i + 1}${k < 0 ? 'a' : 'b'}`, bands: s >= 20 }))
  }))
  icon('Karyotype', join(...ps))
}

// Telomerase: the end of a chromosome (the DNA part, double-stranded) with its single-stranded overhang threaded over
// telomerase (an amber protein, the part), which holds its RNA template (the RNA part, rose, bases up) under the strand's
// end; the newest repeats, copied from the template, are pale. (SiliCoDraw writes TTAGGG, TERT and RNA and draws the new
// DNA dashed; the labels are left out, the protein is the set's amber, not lilac.)
{
  const g = page(4.6, [-0.8, 5.8])
  const pal = deep(DNA), Ld = 38, Wd = 22, xc = -31, yc = -13, turns = 1.25
  const L = frame(g, xc, yc, Ld), D = (Wd / Ld) * 100, W = clamp(D * L.px * 0.06, 3.5, 7), T = D * 0.15, A = (D - T) / 2 - W / L.px, half = 50 - T / 2 - W / L.px
  const end = L.P([half, A]), Tp = T * L.px
  const tert = protein(g, { x: 19, y: 6, size: 64, id: 'telomerase' })
  // The part sets base pairs past the end of a helix whose turns end on a quarter (t up to 1.1): those are left out.
  const raw = dna(g, { x: xc, y: yc, size: Ld, width: Wd, turns })
  const d = { ...raw, body: raw.body.replace(/<path d="M([\d.]+),[\d.]+ L([\d.]+),[\d.]+"[^>]*stroke-linecap="butt"[^>]*\/>/g, (m, x1, x2) => (Math.min(+x1, +x2) > end[0] - Tp * 0.6 ? '' : m)) }
  const yo = g.Y(yc) + (end[1] - g.Y(yc)) // the overhang's height on the page
  const old = [end, [g.X(20), yo]], fresh = [[g.X(20), yo], [g.X(36), yo]]
  const overhang = {
    defs: '',
    // Butt at the strand's end, so that it runs on from the strand without a seam; round at its free end.
    body: `<g id="overhang">${strokePath(ptsD([end, fresh[1]]), pal.outline, Tp + 2 * W, 'butt')}${disc(fresh[1], Tp / 2 + W, pal.outline)}` +
      `${strokePath(ptsD(old), pal.base, Tp, 'butt')}${strokePath(ptsD(fresh), pal.light, Tp, 'butt')}${disc(fresh[1], Tp / 2, pal.light)}</g>`,
    parts: [],
  }
  const [, oy] = g.P([0, 0])
  const tmpl = rna(g, { x: 22, y: (yo - oy) / g.k + 10.5, size: 34, bases: true, turn: 180, waves: 1.5, id: 'RNA-template' })
  icon('Telomerase', join(tert, d, tmpl, overhang))
}

// Amyloid fibril: six β-strands stacked into the cross-β core of a fibril, held by hydrogen bonds (drawn here, see
// `betaStack`). (SiliCoDraw: six flat arrows of alternating shade between two faint brackets; the brackets are left out
// and the hydrogen bonds drawn between the strands. Amber, the set's colour for proteins and their aggregates.)
{
  const g = page(4.86, [0, 0])
  icon('Amyloid fibril', join(betaStack(g, { x: 0, y: 0, size: 96, count: 6 })))
}

// Tau tangle: three paired helical filaments of tau lying across one another (drawn here, see `pairedFilament`).
// (SiliCoDraw: three pairs of crossing lines, orange and brown; here they are tubes passing in front and behind, in the
// set's amber.)
{
  const g = page(4.45, [-1.2, 1.2])
  const f1 = pairedFilament(g, { id: 'filament-1', points: [[-46, -30], [-16, -36], [14, -14], [44, 2]], twists: 3, width: 15 })
  const f2 = pairedFilament(g, { id: 'filament-2', points: [[-46, 26], [-18, 4], [12, -20], [44, -36]], twists: 3, width: 15 })
  const f3 = pairedFilament(g, { id: 'filament-3', points: [[-42, -4], [-12, 18], [16, 34], [44, 38]], twists: 3, width: 15 })
  icon('Tau tangle', join(f1, f2, f3))
}

check()
console.log('written to', OUT)
