// Eight icons of SiliCoDraw's "Molecules & genetics" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David
// Carlsson; see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts in
// ../parts/: DNA replication, mutation, recombination, DNA methylation, CRISPR, RNA interference, gene knockout and
// transgene. Their compositions are read by hand from the source in a 100 × 100 box centred on 0,0 and scaled onto a
// 512 page (`page` of ../cellkit.mjs). DNA is the DNA part (blue double helix), chromosomes the chromosome part (lilac),
// RNA the RNA part (rose), free proteins the protein part (amber), arrows and marks the parts of ../parts/tissue.mjs.
// Drawn here because no part draws them: the two daughter helices of a replication fork (the DNA part's helix with a
// palette per strand and a gap in the new strand), a star, and methyl groups as lollipop pins. The gene and the scissors
// are the parts of ../parts/genetics.mjs (`geneBlock`, `scissors`). Nothing is lettered (SiliCoDraw writes no labels in these eight).
// Usage: node mg04.mjs <folder>
import { cellTypes, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex } from '../colour.mjs'
import { catmull, f, gradient2 } from '../shapes.mjs'
import { chromosome, dna, protein, rna } from '../parts/molecules.mjs'
import { arrow, cross } from '../parts/tissue.mjs'
import { geneBlock, scissors } from '../parts/genetics.mjs'
import { NUC } from '../cellkit.mjs'

const OUT = process.argv[2]
const { cellType, check } = cellTypes(OUT)

// Hues (OKLCH degrees). DNA is the part's blue (267°). What SiliCoDraw draws orange (new strands, the second homologue,
// methyl groups) keeps its orange (57°); a mismatch and the knockout cross its red (25°); the transgene its green
// (154°); the guide RNA of RNA interference its purple (315°); the star its yellow (96°).
const DNA = hueOf('#4f6bb8'), ORANGE = hueOf('#e3955a'), RED = hueOf('#d64545'), GREEN = hueOf('#22a05b')
const PURPLE = hueOf('#b07cc6'), YELLOW = hueOf('#fde68a')
const dnaPal = deep(DNA)

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const P2 = ([x, y]) => `${f(x)},${f(y)}`
const lineD = (pts) => `M${pts.map(P2).join(' L')}`
const stroke = (d, colour, w, cap = 'round') => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
const disc = ([x, y], r, fill, s = '', w = 0) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}"${s ? ` stroke="${s}" stroke-width="${f(w)}"` : ''}/>`
const hl = ([x, y], rx, ry, rot, fill) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" transform="rotate(${rot} ${f(x)} ${f(y)})" fill="${fill}"/>`
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n') })
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

/**
 * Where the DNA part puts its strands, worked out as the part does (../parts/molecules.mjs, `dna` and `helix`), for an
 * upright (turn 0) helix: the half length and the strands' swing in g units, the tube and its outline in px.
 */
const dnaGeometry = (g, { x, y, size, width, turns, flat }) => {
  const s = size / 100, px = s * g.k, D = (width / size) * 100, isFlat = flat ?? size * g.k < 160
  const W = clamp(D * px * 0.06, 3.5, 7), T = D * (isFlat ? 0.2 : 0.15), wl = isFlat ? 0 : W / px
  const A = (D - T) / 2 - wl, half = 50 - T / 2 - wl, tw = turns ?? Math.max(1, Math.round(100 / (D * 1.9)))
  return { x, y, s, half: half * s, A: A * s, T: T * s, Tpx: T * px, W, inset: (T / 2 + wl) * s, tw, isFlat, at: (t) => [x - half * s + 2 * half * s * t, y] }
}

/**
 * A double helix as the DNA part draws it (large, with outlines), along a centre line through page points (`path`,
 * drawn smooth and measured along its length), but with a palette per strand (`pals`: the old strand and a new one) and
 * stretches of a strand left out (`gaps`: per strand, [t0, t1] ranges). The DNA part should offer this (a curved course,
 * a new strand in another colour, a nick); until it does, its helix is copied here. `A`, `T`, `W` in px.
 */
const helix2 = ({ path, twists, A, T, W, pals, gaps = [[], []], rungPal, ramp = 0, n = Math.round(twists * 60) }) => {
  const at = centreLine(catmull(path, 30))
  // The swing of the strands, grown from nothing over the first `ramp` of the length (strands that wind up again).
  const amp = (t) => { const u = ramp ? Math.min(1, t / ramp) : 1; return A * u * u * (3 - 2 * u) }
  const off = (i, t) => gaps[i].some(([a, b]) => t > a && t < b)
  const strands = [1, -1].map((sign, i) => Array.from({ length: n + 1 }, (_, j) => {
    const t = j / n, ph = 2 * Math.PI * twists * t, a = amp(t) * sign * Math.sin(ph), { c, n: [nx, ny] } = at(t)
    return { p: [c[0] + nx * a, c[1] + ny * a], front: sign * Math.cos(ph) >= 0, on: !off(i, t) }
  }))
  // Runs of each strand that are drawn and lie wholly in front or behind, as [first, last] indices.
  const runsOf = (pts) => {
    const out = []
    let a = null
    for (let j = 0; j < pts.length; j++) {
      if (!pts[j].on) { if (a !== null) { out.push([a, j - 1]); a = null } continue }
      if (a === null) a = j
      else if (pts[j].front !== pts[j - 1].front) { out.push([a, j]); a = j }
    }
    if (a !== null && a < pts.length - 1) out.push([a, pts.length - 1])
    return out.map(([a, b]) => ({ ab: [a, b], front: pts[Math.min(b, a + 1)].front }))
  }
  const draw = (pts, { ab: [a, b] }, pal) => {
    const all = pts.map((q) => q.p)
    // A run reaches one point (outline) or two (fill) into a drawn neighbour; where it stops at a gap or an end, a cap.
    const reach = (k) => [a > 0 && pts[a - 1].on ? Math.max(0, a - k) : a, b < pts.length - 1 && pts[b + 1].on ? Math.min(pts.length - 1, b + k) : b]
    const ends = [!(a > 0 && pts[a - 1].on) && all[a], !(b < pts.length - 1 && pts[b + 1].on) && all[b]].filter(Boolean)
    const [o0, o1] = reach(1), [f0, f1] = reach(2)
    return ends.map((p) => disc(p, T / 2 + W / 2, pal.outline, pal.outline, W)).join('') +
      stroke(lineD(all.slice(o0, o1 + 1)), pal.outline, T + 2 * W, 'butt') + stroke(lineD(all.slice(f0, f1 + 1)), pal.fill, T, 'butt') +
      ends.map((p) => disc(p, T / 2, pal.fill)).join('')
  }
  const runs = strands.map(runsOf)
  const layer = (front) => runs.flatMap((rs, i) => rs.filter((r) => r.front === front).map((r) => draw(strands[i], r, pals[i]))).join('')
  const rungs = []
  for (let h = 0; h < twists * 2; h++)
    for (const q of [0.25, 0.5, 0.75]) {
      const t = (h + q) / (twists * 2), s = Math.sin(2 * Math.PI * twists * t) * amp(t), inset = (T / 2 + W) * Math.sign(s)
      if (Math.abs(s) * 2 < T * 2.2 || off(0, t) || off(1, t)) continue
      const { c, n: [nx, ny] } = at(t)
      rungs.push(stroke(lineD([[c[0] + nx * (s - inset), c[1] + ny * (s - inset)], [c[0] - nx * (s - inset), c[1] - ny * (s - inset)]]), rungPal.small, Math.max(1.5, T * 0.42), 'butt'))
    }
  return layer(false) + rungs.join('') + layer(true)
}

/** A point list measured along its length: at(t) gives the point a share t along it and the normal there. */
const centreLine = (pts) => {
  const cum = [0]
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  const total = cum.at(-1)
  return (t) => {
    const d = t * total
    let i = 1
    while (i < pts.length - 1 && cum[i] < d) i++
    const [a, b] = [pts[i - 1], pts[i]], l = cum[i] - cum[i - 1], u = l ? (d - cum[i - 1]) / l : 0, dx = (b[0] - a[0]) / l, dy = (b[1] - a[1]) / l
    return { c: [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u], n: [-dy, dx], length: total }
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// DNA replication: a replication fork. The parent double helix (left) opens into two daughter helices, each made of one
// old strand (blue) and one new strand (orange): replication is semi-conservative. The new strand of the lower daughter
// (the lagging strand) is made in pieces, so it has a gap near the fork.
// (SiliCoDraw draws the strands as flat ladders, the new strands continuous and starting a little behind the fork. Here
// the parent is the DNA part and the daughters the same helix with one strand orange; the lagging strand's gap is added.)
{
  const g = page(4.62, [0, 0]), newPal = deep(ORANGE)
  const geo = dnaGeometry(g, { x: -32, y: 0, size: 34, width: 17, turns: 1.5, flat: false })
  const parent = dna(g, { x: -32, y: 0, size: 34, width: 17, turns: 1.5, flat: false, id: 'parent-DNA' })
  const F = g.P([geo.x + geo.half, 0]), A = geo.A * g.k, T = geo.Tpx, W = geo.W
  const pitch = (2 * geo.half * g.k) / geo.tw // px per turn, as in the parent
  // Each daughter runs straight out of the fork at 26°; its strands wind up from the fork outwards (`ramp`).
  const daughter = (sign, id, gaps) => {
    const th = (sign * 26 * Math.PI) / 180, reach = (g.X(47) - F[0]) / Math.cos(th)
    const path = [F, [F[0] + reach * Math.cos(th), F[1] + reach * Math.sin(th)]]
    const len = centreLine(catmull(path, 30))(0).length, twists = Math.round((2 * len) / pitch) / 2
    return `<g id="${id}">${helix2({ path, twists, A, T, W, rungPal: dnaPal, gaps, ramp: 0.3,
      pals: [{ fill: sign < 0 ? dnaPal.base : dnaPal.shadow, outline: dnaPal.outline }, { fill: newPal.base, outline: newPal.outline }] })}</g>`
  }
  cellType('DNA replication', [['DNA', dnaPal], ['new strand', newPal]], parent.defs,
    `${daughter(-1, 'leading-daughter', [[], [[0, 0.12]]])}\n${daughter(1, 'lagging-daughter', [[], [[0, 0.24], [0.55, 0.6]]])}\n${parent.body}`)
}

// Mutation: a stretch of DNA with one base pair changed (red, the mismatch marked by a diamond), and a star over it.
// (SiliCoDraw's ladder is the DNA part's helix; the changed pair is drawn over the part's own base pair at that place.)
{
  const g = page(4.7, [0, -16])
  const o = { x: 0, y: 0, size: 96, width: 30, turns: 2 }, geo = dnaGeometry(g, o), part = dna(g, { ...o, id: 'DNA' }), red = deep(RED), star = rich(YELLOW)
  const t = 2.5 / (2 * geo.tw), [cx] = geo.at(t), s = Math.sin(2 * Math.PI * geo.tw * t) * geo.A, e = Math.abs(s) - geo.inset
  const top = g.P([cx, -e]), bottom = g.P([cx, e]), mid = g.P([cx, 0]), q = 4.2 * g.k
  const pair = `<g id="mutation">${stroke(lineD([top, bottom]), red.small, geo.Tpx * 0.62, 'butt')}<path d="M${P2([mid[0], mid[1] - q])} L${P2([mid[0] + q, mid[1]])} L${P2([mid[0], mid[1] + q])} L${P2([mid[0] - q, mid[1]])}Z" fill="${red.outline}"/></g>`
  // A five-pointed star, rounded, above the changed pair.
  const R = 13, c = g.P([cx, -34]), pts = Array.from({ length: 10 }, (_, i) => { const a = ((i * 36 - 90) * Math.PI) / 180, r = (i % 2 ? 0.47 : 1) * R * g.k; return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)] })
  const starSvg = `<g id="star"><path d="${roundPoly(pts, 1.4 * g.k)}" fill="url(#star-gradient)" stroke="${star.outline}" stroke-width="7" stroke-linejoin="round"/>${hl([c[0] - 3.2 * g.k, c[1] - 3.2 * g.k], 3 * g.k, 1.1 * g.k, -40, star.light)}</g>`
  cellType('Mutation', [['DNA', dnaPal], ['mutation', red], ['star', star]],
    part.defs + gradient2('star-gradient', [c[0] - R * g.k, c[1] - R * g.k, c[0] + R * g.k, c[1] + R * g.k], star.base, star.shadow),
    `${part.body}\n${pair}\n${starSvg}`)
}

// Recombination: crossing over. Two homologous chromatids (lilac and orange) cross each other on their lower arms, the
// chiasma where they exchange their ends.
// (SiliCoDraw draws two bent bars, each one colour, that change sides in the middle. Here they are the chromosome part
// with one chromatid each, turned so that each changes sides; they cross below their centromeres, on the arms, where
// crossing over happens.)
{
  // (After the review of 23 November 2026: crossed bars, one colour each or with the colours changed at the crossing,
  // read as two bars lying over or beside each other. The chromatids now stand side by side, leaning to each other, as
  // they are after the exchange: each carries the other's colour below the point of crossing over.)
  const turn = 7, size = 86, yc = 13 // the point of exchange, below the centromeres
  const g = page(5.12, [0, 0]), lilac = NUC, orange = soft(ORANGE)
  const ox = -15 // half the distance between the two centres
  const a = chromosome(g, { x: -ox, y: 0, size, turn: -turn, chromatids: 1, pal: lilac, id: 'chromatid-1' })
  const b = chromosome(g, { x: ox, y: 0, size, turn, chromatids: 1, pal: orange, id: 'chromatid-2' })
  // The exchanged arm is the chromatid's own outline cut straight across at the point of exchange, in its own turned
  // frame, drawn again in the other palette (flat: the other's gradient lies in another frame).
  const arm = (part, pal, id) => {
    const turnOf = part.body.match(/transform="(rotate\([^"]+\))"/)[1], w = part.body.match(/stroke-width="([\d.]+)"/)[1]
    const pts = part.body.match(/ d="M([^"]+?) ?Z?"/)[1].split(' L').map((s) => s.split(',').map(Number))
    const cut = 256 + (yc / Math.cos((turn * Math.PI) / 180)) * g.k, out = []
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length], inP = p[1] >= cut, inQ = q[1] >= cut
      if (inP) out.push(p)
      if (inP !== inQ) out.push([p[0] + ((q[0] - p[0]) * (cut - p[1])) / (q[1] - p[1]), cut])
    }
    const d = `${lineD(out)} Z`
    return `<g id="${id}" transform="${turnOf}"><path d="${d}" fill="${pal.outline}" stroke="${pal.outline}" stroke-width="${w}" stroke-linejoin="round"/><path d="${d}" fill="${pal.shadow}"/></g>`
  }
  cellType('Recombination', [['chromatid 1', lilac], ['chromatid 2', orange]], a.defs + b.defs, `${a.body}\n${b.body}\n${arm(a, orange, 'chromatid-1-exchanged-arm')}\n${arm(b, lilac, 'chromatid-2-exchanged-arm')}`)
}

// DNA methylation: DNA with methyl groups on some of its cytosines, shown as pins: a filled head is a methylated site,
// an open one an unmethylated site (the convention of methylation plots).
// (SiliCoDraw's two flat strands are the DNA part; its pins are kept, filled orange and open white.)
{
  const g = page(4.7, [0, 5.4]), me = deep(ORANGE)
  const part = dna(g, { x: 0, y: 22, size: 96, width: 24, turns: 3, id: 'DNA' })
  const xs = [-38, -23, -8, 8, 23, 38], head = 7.2, wHead = 7
  const pins = xs.map((x, i) => {
    const [px, py] = g.P([x, -16])
    return `<g id="${i % 2 ? 'methylated' : 'unmethylated'}-site-${i + 1}">${stroke(lineD([g.P([x, 20]), [px, py + head * g.k]]), dnaPal.outline, 7)}${disc([px, py], head * g.k - wHead / 2, i % 2 ? me.small : '#FFFFFF', i % 2 ? me.outline : dnaPal.outline, wHead)}</g>`
  }).join('')
  cellType('DNA methylation', [['DNA', dnaPal], ['methyl groups', me]], part.defs, `${pins}\n${part.body}`)
}

// CRISPR: scissors cutting DNA in two (the double-strand break Cas9 makes, at the place the guide RNA names).
// (SiliCoDraw's scissors point up with their rings on the DNA. Here the blades point down into the break between the
// two pieces of DNA (the DNA part twice), and the rings are above. The blades are grey, the rings keep SiliCoDraw's red.)
{
  const g = page(4.78, [0, -8]), ring = deep(RED)
  const left = dna(g, { x: -27, y: 20, size: 42, width: 19, turns: 1.5, id: 'DNA-left' }), right = dna(g, { x: 27, y: 20, size: 42, width: 19, turns: 1.5, id: 'DNA-right' })
  const sc = scissors(g, { x: 0, y: -13.4, size: 61, w: 6, pal: ring })
  cellType('CRISPR', [['DNA', dnaPal], ['scissor rings', ring]], left.defs + right.defs + sc.defs, `${left.body}\n${right.body}\n${sc.body}`)
}

// RNA interference: the silencing complex (RISC, its Argonaute protein) carries a short guide RNA (purple), pairs it
// with a messenger RNA (rose) and cuts the messenger in two.
// (SiliCoDraw draws RISC as a lilac circle holding two purple waves (the siRNA duplex) above an mRNA with a cross. Here
// RISC is the protein part, it holds one guide strand (the duplex is unwound when RISC is loaded) facing the mRNA, and
// the cut mRNA is two pieces of the RNA part, the cut-off piece tilting away; the cross is left out.)
{
  const g = page(4.8, [0, 5.2]), guidePal = deep(PURPLE)
  const risc = protein(g, { x: -9, y: -6, size: 48, id: 'RISC' })
  const guide = rna(g, { x: -9, y: 9, size: 32, bases: true, waves: 1.5, pal: guidePal, id: 'guide-RNA', width: 10 })
  const m1 = rna(g, { x: -15, y: 27, size: 66, bases: true, waves: 2.5, id: 'mRNA', width: 12 })
  const m2 = rna(g, { x: 34, y: 32, size: 28, bases: true, waves: 1, turn: 18, id: 'mRNA-cut-off', width: 12 })
  cellType('RNA interference', [['RISC', rich(75)], ['guide RNA', guidePal], ['mRNA', deep(15)]], risc.defs, `${m1.body}\n${m2.body}\n${risc.body}\n${guide.body}`)
}

// Gene knockout: a gene in the genome's DNA, crossed out.
// (SiliCoDraw's line is the DNA part; its block is a gene drawn as an arrow, in the blue of DNA (it is part of it), with
// the red cross of the tissue parts over it.)
{
  const g = page(4.62, [0, 0]), genePal = soft(DNA), red = deep(RED)
  const part = dna(g, { x: 0, y: 0, size: 98, width: 14, turns: 4, id: 'DNA' })
  const gn = geneBlock(g, { x: 1, y: 0, size: 60, height: 38, pal: genePal, w: 9, id: 'gene' })
  const x = cross(g, { x: 0, y: 0, size: 30, colour: red.outline, w: 15, id: 'knocked-out' })
  cellType('Gene knockout', [['DNA', dnaPal], ['cross', red]], part.defs + gn.defs, `${part.body}\n${gn.body}\n${x.body}`)
}

// Transgene: a foreign gene (green) inserted into the genome's DNA, with an arrow showing it going in.
// (SiliCoDraw draws a blue gene with a green block in it and an arrow onto the block. Here the inserted gene itself is
// the green arrow-shaped block, set into the DNA part, and the arrow is the tissue part in the gene's green.)
{
  const g = page(4.62, [0, -16]), genePal = soft(GREEN)
  const part = dna(g, { x: 0, y: 0, size: 98, width: 14, turns: 4, id: 'DNA' })
  const gn = geneBlock(g, { x: 1, y: 0, size: 60, height: 38, pal: genePal, w: 9, id: 'transgene' })
  const a = arrow(g, { x: 0, y: -37, size: 28, turn: 90, colour: genePal.outline, w: 9, id: 'insertion' })
  cellType('Transgene', [['DNA', dnaPal], ['transgene', genePal]], part.defs + gn.defs, `${part.body}\n${gn.body}\n${a.body}`)
}

check()
console.log('written to', OUT)
