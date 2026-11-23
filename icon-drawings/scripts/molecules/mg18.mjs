// Nine icons of SiliCoDraw's "Molecules & genetics" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts in ../parts/:
// resveratrol, NAD⁺ precursor (and, from the same SiliCoDraw icon, NMN and NR side by side), rDNA instability, cGAS-STING,
// NF-κB, LINE-1 retrotransposon, histone loss and translation errors. Their compositions are read by hand from the source
// in a 100 × 100 box centred on 0,0 and scaled onto a 512 page (`page` of ../cellkit.mjs).
// Parts used: the chromatin fibre and histone octamer (genetics.mjs), the skeletal formula (formula.mjs), the sugar
// ring of glucose, ligand balls, phosphate, DNA and circular DNA, RNA, protein, enzyme, misfolded protein, ubiquitin
// (molecules.mjs); nucleus and ribosome (organelles.mjs); the membrane with a receptor (membranes.mjs);
// arrows and plus (tissue.mjs); letters (letters.mjs).
// Drawn here because no part draws them: a bunch of grapes (`grapes`), the five-membered ribose ring (`pentagon`, in the
// look of the glucose part), a capsule (`capsule`), the nucleolus with its tandem rDNA repeats (`repeat` blocks), and the
// blocks of a retrotransposon (`element`). The chromatin fibre and the histone octamer are the genetics parts, and
// resveratrol's formula the skeletal part (formula.mjs).
// Lettered: the oxygens of resveratrol ("O", by the skeletal part), nicotinamide's "N" with a stroked plus (as mg05's
// NAD⁺) and the phosphate's "P" (by the part). Left out: SiliCoDraw writes no other label in these icons.
// Usage: node mg18.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, NUC, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex, toLch } from '../colour.mjs'
import { catmull, f, gradient2 } from '../shapes.mjs'
import { circularDna, dna, enzyme, glucose, ligand, misfolded, phosphate, protein, rna, ubiquitin } from '../parts/molecules.mjs'
import { nucleus, ribosome, HUES } from '../parts/organelles.mjs'
import { membraneWith, mergeParts, receptor } from '../parts/membranes.mjs'
import { arrow, plus } from '../parts/tissue.mjs'
import { lettering } from '../parts/letters.mjs'
import { fibre, octamer } from '../parts/genetics.mjs'
import { RESVERATROL, skeletal } from '../parts/formula.mjs'

const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012) are left out of the hue check, as STYLE.md says.
const icon = (name, { defs, body, parts }) => kit.cellType(name, mergeParts(parts).filter(([, p]) => toLch(p.base).c >= 0.012), defs, body)

// ---------- hues (OKLCH degrees) ----------
// Of the set: small molecules green 165, DNA blue 267, RNA rose 15 (352 on a ribosome), protein amber 75, phosphate
// mustard 92, lipids peach, nucleus lilac 319, ubiquitin the deeper amber. Of this batch: grapes SiliCoDraw's purple
// (#8a4f9e, 317) with a leaf of yellow green (125, 40° from the molecule's green); oxygen red (#e86b6b) and nicotinamide
// blue (#6f86c8, as mg05's NAD⁺); the capsule coral (25); the rDNA repeats SiliCoDraw's rose (#c0567a, 1°, 42° from the
// nucleus); STING SiliCoDraw's violet (#7a5ab0) moved to 310 (43° from the DNA); NF-κB coral (30) where SiliCoDraw's
// orange (60) lies 15° from ubiquitin, IκB green (150); the retrotransposon SiliCoDraw's teal (#2f9a8a, 181); histones
// the lilac of the nucleus (the genetics part); the misincorporated amino acid violet (295).
const GREEN = 165, DNA = hueOf('#4f6bb8'), GRAPE = hueOf('#8a4f9e'), LEAF = 125, OXYGEN = hueOf('#e86b6b'), NICOTINAMIDE = hueOf('#6f86c8')
const CGAS = 0, CAPSULE = 25, REPEAT = hueOf('#c0567a'), STING = 310, NFKB = 30, IKB = 150, L1 = hueOf('#2f9a8a'), WRONG = 295
const dnaPal = deep(DNA), green = deep(GREEN)
// Arrows in a true grey (chroma below 0.012): the parts' INK lies within 36° of DNA's blue.
const grey = (l, c = 0.006) => toHex({ l, c, h: 255 })
const GREY = { light: grey(0.985, 0.002), base: grey(0.95), shadow: grey(0.86, 0.008), small: grey(0.75, 0.008), outline: grey(0.52, 0.01) }

// ---------- helpers ----------
const P2 = ([x, y]) => `${f(x)},${f(y)}`
const ptsD = (pts) => `M${pts.map(P2).join(' L')}`
const stroke = (d, colour, w, cap = 'round') => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
const line = (g, pts, colour, w) => stroke(ptsD(pts.map(g.P)), colour, w)
const shine = ([x, y], rx, ry, rot, fill) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" transform="rotate(${rot} ${f(x)} ${f(y)})" fill="${fill}"/>`
/** Joins the { defs, body, parts } of several parts. */
const join = (...ps) => ({ defs: ps.map((p) => p.defs ?? '').join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts ?? []) })
/** Some drawing of this script as a part: { defs, body, parts }. */
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })
/** One gradient that lights every shape that uses it from its own top left. */
const boxGrad = (id, pal) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`
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
const rad = (d) => (d * Math.PI) / 180
const go = ([x, y], deg, l) => [x + l * Math.cos(rad(deg)), y + l * Math.sin(rad(deg))]
/** The corners of a regular polygon of n corners, radius r about c, the first at `start` degrees. */
const corners = (c, r, n, start) => Array.from({ length: n }, (_, i) => go(c, start + (360 / n) * i, r))

// =====================================================================================================================
// Drawings of this batch (no part draws them)
// =====================================================================================================================

/**
 * A ring of five (a furanose sugar such as ribose), in the look of the glucose part: rounded corners, a gradient, an
 * outline in the green of small molecules; its first corner at the top (the ring oxygen). r is its corner radius.
 */
const pentagon = (g, { x, y, r, id = 'ribose', pal = green, w = 8 }) => {
  const pts = corners([x, y], r, 5, -90).map(g.P)
  return {
    defs: g.grad(`${id}-gradient`, [x - r, y - r, x + r, y + r], pal),
    body: `<g id="${id}"><path d="${roundPoly(pts, r * g.k * 0.2)}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="${w}" stroke-linejoin="round"/></g>`,
    parts: [['sugar', pal]], corners: corners([x, y], r, 5, -90),
  }
}

/** A bunch of grapes: balls of a deep purple, each with its outline and a highlight, drawn from the back to the front; a stalk and a leaf. */
const grapes = (g, { balls, r, stalk, leaf, id = 'grapes', pal = deep(GRAPE), leafPal = soft(LEAF) }) => {
  const W = 7
  const ballBody = balls.map(([x, y], i) => {
    const [cx, cy] = g.P([x, y]), R = r * g.k - W / 2
    return `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R)}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="${W}"/>${shine([cx - R * 0.36, cy - R * 0.42], R * 0.36, R * 0.15, -40, pal.light)}`
  }).join('')
  const lp = leaf.map(g.P)
  const leafD = `M${P2(lp[0])} C${P2(lp[1])} ${P2(lp[2])} ${P2(lp[3])} C${P2(lp[4])} ${P2(lp[5])} ${P2(lp[0])} Z`
  return {
    defs: boxGrad(`${id}-gradient`, pal) + gradient2(`${id}-leaf-gradient`, [lp[3][0], Math.min(lp[1][1], lp[2][1]), lp[0][0], lp[4][1]], leafPal.base, leafPal.shadow),
    body: `<g id="${id}"><g id="${id}-stalk">${line(g, stalk, leafPal.outline, 9)}</g><g id="${id}-leaf"><path d="${leafD}" fill="url(#${id}-leaf-gradient)" stroke="${leafPal.outline}" stroke-width="6" stroke-linejoin="round"/>` +
      `${stroke(ptsD([lp[0], [(lp[0][0] + lp[3][0]) / 2, (lp[0][1] + lp[3][1]) / 2 + 2]]), leafPal.outline, 4)}</g><g id="${id}-berries">${ballBody}</g></g>`,
    parts: [['grapes', pal], ['leaf', leafPal]],
  }
}

/**
 * A capsule: a rounded bar of two halves, one coloured, one white, turned by `turn`; x, y its middle, `len` its length
 * and `wid` its width (g units).
 */
const capsule = (g, { x, y, len, wid, turn = 0, id = 'capsule', pal = soft(CAPSULE), w = 9 }) => {
  const k = g.k, L = len * k, H = wid * k, R = H / 2, [cx, cy] = g.P([x, y])
  const x0 = cx - L / 2, x1 = cx + L / 2, y0 = cy - R, y1 = cy + R
  const whole = `M${f(x0 + R)},${f(y0)} H${f(x1 - R)} A${f(R)},${f(R)} 0 0 1 ${f(x1 - R)},${f(y1)} H${f(x0 + R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + R)},${f(y0)} Z`
  const right = `M${f(cx)},${f(y0)} H${f(x1 - R)} A${f(R)},${f(R)} 0 0 1 ${f(x1 - R)},${f(y1)} H${f(cx)} Z`
  return {
    defs: gradient2(`${id}-white-gradient`, [x0, y0, cx, y1], GREY.light, GREY.base) + gradient2(`${id}-gradient`, [cx, y0, x1, y1], pal.base, pal.shadow),
    body: `<g id="${id}" transform="rotate(${turn} ${f(cx)} ${f(cy)})"><path d="${whole}" fill="url(#${id}-white-gradient)"/><path d="${right}" fill="url(#${id}-gradient)"/>` +
      `${stroke(`M${f(cx)},${f(y0)} V${f(y1)}`, pal.outline, w * 0.8)}<path d="${whole}" fill="none" stroke="${pal.outline}" stroke-width="${w}" stroke-linejoin="round"/>` +
      `${stroke(`M${f(x0 + R * 0.75)},${f(cy - R * 0.45)} H${f(cx - R * 0.5)}`, '#FFFFFF', H * 0.13)}${stroke(`M${f(cx + R * 0.5)},${f(cy - R * 0.45)} H${f(x1 - R * 0.9)}`, pal.light, H * 0.13)}</g>`,
    parts: [['capsule', pal]],
  }
}

/**
 * Nicotinamide mononucleotide (NMN), or nicotinamide riboside (NR) without its phosphate, as the textbook cartoon draws
 * it: the nicotinamide ring (mg05's, a blue hexagon lettered "N" with a stroked plus for its charge) bonded from its
 * nitrogen to C1′ of a ribose ring, with the 5′ phosphate on C5′ (NMN). x, y the middle of the ribose, s a scale.
 */
const nucleotide = (g, { x, y, s = 1, id, withPhosphate = true }) => {
  const nic = deep(NICOTINAMIDE), Rn = 13 * s, Rr = 11.5 * s
  const rib = pentagon(g, { x, y, r: Rr, id: `${id}-ribose`, w: 8 })
  const [, c4, c3, c2, c1] = rib.corners
  const ringC = [c1[0] + 4 * s, c1[1] - 21 * s]
  const ringN = [ringC[0], ringC[1] + Rn]
  const ring = glucose(g, { x: ringC[0], y: ringC[1], size: 2 * Rn + 3 * s, id: `${id}-nicotinamide`, pal: nic })
  const N = lettering(g, { x: ringC[0], y: ringC[1], h: Rn * 0.95, text: 'N', colour: nic.outline, id: `${id}-nicotinamide-letter` })
  const chargeAt = go(ringC, -142, Rn * 1.42)
  const charge = plus(g, { x: chargeAt[0], y: chargeAt[1], size: Rn * 0.72, colour: nic.outline, id: `${id}-charge` })
  const c5 = go(c4, -55, 9 * s), pAt = go(c5, -78, 12 * s)
  const bW = 10
  const bonds = own(`${id}-bonds`, line(g, [ringN, c1], green.outline, bW) + line(g, [c3, go(c3, 100, 8 * s)], green.outline, bW) + line(g, [c2, go(c2, 80, 8 * s)], green.outline, bW) +
    line(g, withPhosphate ? [c4, c5, pAt] : [c4, c5, go(c5, -78, 6 * s)], green.outline, bW))
  const ph = withPhosphate ? [phosphate(g, { x: pAt[0], y: pAt[1], size: 15 * s, id: `${id}-phosphate` })] : []
  return join(bonds, rib, ring, own(`${id}-letters`, N.body), { ...charge, parts: [] }, ...ph)
}

/** A tandem repeat of rDNA (or any gene): a block pointed at its right end, with a gradient and an outline. */
const repeat = (g, { x0, x1, y, h, pal, id, w = 6 }) => {
  const tip = h * 0.45, pts = [[x0, y - h / 2], [x1 - tip, y - h / 2], [x1, y], [x1 - tip, y + h / 2], [x0, y + h / 2]].map(g.P)
  return `<path id="${id}" d="${roundPoly(pts, h * g.k * 0.18)}" fill="url(#repeat-gradient)" stroke="${pal.outline}" stroke-width="${w}" stroke-linejoin="round"/>`
}

/**
 * A LINE-1 element on a piece of DNA: its 5′ untranslated region, ORF1 and ORF2 as blocks in three tones of one teal, the
 * last pointed (the direction it is read in), and its poly(A) tail as a short stroke. `full` false: a 5′-truncated
 * copy (most new copies lose their 5′ end), ORF2's 3′ end only.
 */
const element = (g, { x0, y, h, full = true, id, pal = soft(L1), dark = deep(L1), w = 6 }) => {
  const tones = [pal.light, pal.base, dark.small], widths = full ? [6, 10, 17] : [0, 0, 11]
  let x = x0, out = ''
  widths.forEach((wd, i) => {
    if (!wd) return
    const last = i === 2, tip = last ? h * 0.42 : 0
    const pts = [[x, y - h / 2], [x + wd - tip, y - h / 2], [x + wd, y], [x + wd - tip, y + h / 2], [x, y + h / 2]].map(g.P)
    out += `<path d="${roundPoly(pts, h * g.k * 0.12)}" fill="${tones[i]}" stroke="${dark.outline}" stroke-width="${w}" stroke-linejoin="round"/>`
    x += wd
  })
  out += line(g, [[x + 2.2, y], [x + 6, y]], dark.outline, h * g.k * 0.34)
  return { defs: '', body: `<g id="${id}">${out}</g>`, parts: [['LINE-1', pal]], end: x + 6 }
}

// =====================================================================================================================
// The icons
// =====================================================================================================================

// Resveratrol: trans-resveratrol (3,5,4′-trihydroxy-trans-stilbene) as its skeletal formula, under a bunch of grapes.
// (SiliCoDraw's composition. The formula is the skeletal part (../parts/formula.mjs): rings the hexagon of the glucose
// part in the green of every small molecule with inner lines for their double bonds, bonds strokes in its outline tone,
// each OH an oxygen ball lettered "O". Corrected: SiliCoDraw puts the hydroxyl of the
// second ring meta to the double bond; in resveratrol it is para (4′). The grapes are drawn here, in SiliCoDraw's purple.)
{
  const g = page(4.56, [0, -0.8])
  const mol = skeletal(g, { x: 0, y: 20, size: 100, id: 'resveratrol', ...RESVERATROL })
  const bunch = grapes(g, {
    r: 7, stalk: [[1, -40], [2, -45], [6, -48.5]],
    balls: [[-12, -36], [0, -37], [12, -36], [-6, -25.5], [6, -25.5], [17, -26], [0, -15], [11, -16], [5, -5]],
    leaf: [[1, -44], [-5, -52], [-15, -52.5], [-22, -46], [-14, -40], [-6, -40.5]],
  })
  icon('Resveratrol', join(bunch, mol))
}

// NAD⁺ precursor: nicotinamide mononucleotide (NMN), the precursor taken as a supplement, beside a capsule.
// (SiliCoDraw's composition: the molecule above, a capsule below at the right. The molecule is drawn as mg05's NAD⁺ draws
// its nicotinamide (a blue ring lettered "N" with a stroked plus), on a ribose ring in the green of small molecules (drawn
// here as a five-membered ring in the glucose part's look) with its phosphate (the part, lettered "P"). Simplified: the
// amide of nicotinamide and the ring oxygen of the ribose are left out. The capsule is coral, where SiliCoDraw's is the
// nicotinamide's blue.)
{
  const g = page(4.72, [0, -1.3])
  const mol = nucleotide(g, { x: -10, y: 4, s: 1.3, id: 'NMN' })
  const pill = capsule(g, { x: 22, y: 29, len: 46, wid: 21, turn: -28 })
  icon('NAD precursor', join(mol, pill))
}

// NMN and NR: the two NAD⁺ precursors, nicotinamide riboside (NR, left) and nicotinamide mononucleotide (NMN, right),
// which differ by the phosphate NR kinase adds to C5′; the arrow is that step.
// (From the same SiliCoDraw icon, whose name holds both and whose comment says NR lacks the phosphate. Each molecule as in
// "NAD precursor"; the arrow is the arrow part in a true grey.)
{
  const g = page(4.5, [-6.4, -1.15])
  const nr = nucleotide(g, { x: -32, y: 10, id: 'NR', withPhosphate: false })
  const nmn = nucleotide(g, { x: 18, y: 10, id: 'NMN' })
  const arr = arrow(g, { x: -9, y: 0, size: 16, colour: GREY.outline, id: 'phosphorylation' })
  icon('NMN and NR', join(nr, arr, nmn))
}

// rDNA instability: a nucleus whose nucleolus holds the tandem repeats of ribosomal DNA; recombination between repeats
// pops out extrachromosomal rDNA circles (ERCs), which gather in the nucleus.
// (SiliCoDraw's composition. The nucleus is the part, lilac with pores; the nucleolus is drawn here in the nucleus's
// deeper lilac, as the part draws its own nucleolus, but large enough to hold the repeats. The repeats are pointed blocks
// in SiliCoDraw's rose on a thread of DNA; each ERC is the circular DNA part with one rose repeat on it.)
{
  const g = page(4.6, [0, 0]), rose = soft(REPEAT), rDeep = deep(REPEAT), dark = deep(hueOf(NUC.base))
  const nuc = nucleus(g, { x: 0, y: 0, size: 98, id: 'nucleus', pores: true })
  const nl = [[-25, -4], [-18, -17], [0, -21], [16, -15], [21, 0], [14, 13], [-4, 17], [-20, 11]]
  const nucleolus = own('nucleolus', g.path(g.smooth(nl), 'url(#nucleolus-gradient)', NUC.outline, 7), [], g.grad('nucleolus-gradient', [-25, -21, 21, 17], { base: dark.base, shadow: dark.shadow }))
  const rows = [[-7, [-20, -10, 0, 10]], [8, [-15, -5, 5]]]
  const thread = rows.map(([y, xs]) => line(g, [[xs[0] - 3, y], [xs.at(-1) + 12, y]], dnaPal.outline, 5)).join('')
  const blocks = rows.flatMap(([y, xs], j) => xs.map((x, i) => repeat(g, { x0: x, x1: x + 9.5, y, h: 8, pal: rDeep, id: `repeat-${j + 1}-${i + 1}` }))).join('')
  const array = own('rDNA-array', thread + blocks, [['rDNA repeats', rose]], boxGrad('repeat-gradient', rose))
  const ercs = [[30, -5, 19], [-29, -22, 16], [11, 30, 17], [-24, 24, 12]].map(([x, y, s], i) => {
    const c = circularDna(g, { x, y, size: s, id: `ERC-${i + 1}` })
    const b = repeat(g, { x0: x - 3.2, x1: x + 3.6, y: y - s / 2 + 0.9, h: 4.4, pal: rDeep, id: `ERC-${i + 1}-repeat`, w: 4 })
    return { ...c, body: c.body + b }
  })
  icon('rDNA instability', join(nuc, nucleolus, array, ...ercs))
}

// cGAS-STING: DNA in the cytosol is bound by cGAS, which makes the cyclic dinucleotide 2′3′-cGAMP; cGAMP binds STING, a
// dimer in the membrane of the endoplasmic reticulum, which then signals on (to TBK1 and IRF3, interferon).
// (SiliCoDraw's composition. The ER membrane is the lipid bilayer part, where SiliCoDraw draws a flat grey cisterna; STING
// is the receptor part, whose two chains open into a cup that holds the cGAMP, in SiliCoDraw's violet moved away from the
// DNA's blue; cGAS is the protein part (amber) on a piece of the DNA part; cGAMP, a small molecule, the green ligand part
// (SiliCoDraw draws a pale ring with two dots). The arrows are the arrow part in a true grey.)
{
  const g = page(4.9, [0, 0.5]), sting = soft(STING)
  const m = membraneWith(g, { x: 0, y: 29, size: 94, thick: 23, id: 'ER-membrane', proteins: [{ part: receptor, at: 18, id: 'STING', pal: sting, bound: true }] })
  const lig = m.anchors[0].ligand
  const d = dna(g, { x: -24, y: -30, size: 50, width: 14, turns: 3, turn: 20, id: 'cytosolic-DNA' })
  const cgas = protein(g, { x: -26, y: -31, size: 24, turn: 10, id: 'cGAS', pal: soft(CGAS) })
  const free = ligand(g, { x: -3, y: -34, size: 9, id: 'cGAMP' })
  const toSting = arrow(g, { points: [[3, -34], [12, -30], [17, -21], [lig[0] - 0.5, +lig[1] - 7]], colour: GREY.outline, id: 'to-STING' })
  const fromCgas = arrow(g, { points: [[-18, -36], [-11, -37.5], [-8.5, -37]], colour: GREY.outline, id: 'makes-cGAMP', end: 'none' })
  const signal = arrow(g, { points: [[32, 4], [38, -8], [40, -24], [40, -40]], colour: GREY.outline, id: 'signal' })
  icon('cGAS-STING', join(m, d, cgas, fromCgas, free, toSting, signal))
}

// NF-κB: IκB, which holds NF-κB in the cytoplasm, is marked with ubiquitin for degradation; the freed p65/p50 dimer
// enters the nucleus and binds its κB sites on the DNA.
// (SiliCoDraw's composition. The nucleus is the part with pores; the DNA in it is the DNA part; each p65/p50 dimer is two
// protein parts in coral (SiliCoDraw's orange lies within 15° of ubiquitin), p50 the paler; IκB is the protein part in
// green, where SiliCoDraw draws a grey crescent of ankyrin repeats, and its ubiquitin chain the part. The arrow is the
// arrow part in the dimer's outline tone, solid where SiliCoDraw's is dotted. SiliCoDraw's two dashes for the broken-up
// IκB are left out.)
{
  const g = page(4.51, [1.2, -1.6]), p65 = rich(NFKB), p50 = { ...soft(NFKB), outline: p65.outline }, ikb = soft(IKB)
  const nuc = nucleus(g, { x: 18, y: 8, size: 68, id: 'nucleus', pores: true })
  const site = dna(g, { x: 18, y: 21, size: 46, width: 11, turns: 2, id: 'DNA' })
  // p65 and p50 are one part (one hue): p50 is p65's paler tone.
  const dimer = (x, y, id, turn = 0) => ({ ...join(
    protein(g, { x: x + 6.4, y: y + 0.6, size: 17, turn: turn + 60, id: `${id}-p50`, pal: p50 }),
    protein(g, { x: x - 6.4, y, size: 19.5, turn, id: `${id}-p65`, pal: p65 })), parts: [['NF-κB', p65]] })
  const bound = dimer(18, 11.5, 'NF-kB-bound')
  const free = dimer(-34, 8, 'NF-kB', -10)
  const move = arrow(g, { x: -12.5, y: 7, size: 12, colour: p65.outline, id: 'to-nucleus' })
  const ib = protein(g, { x: -28, y: -24, size: 25, turn: -30, id: 'IkB', pal: ikb })
  const ub = ubiquitin(g, { x: -10, y: -37, size: 22, count: 4, turn: -36, id: 'ubiquitin' })
  icon('NF-kB', join(nuc, site, bound, free, { ...move, parts: [] }, ib, ub))
}

// LINE-1 retrotransposon: a LINE-1 element in the genome (5′ UTR, ORF1, ORF2, poly(A) tail) is transcribed; its RNA, with
// the proteins ORF1p and ORF2p (a reverse transcriptase) bound to it, is copied back into DNA at new places in the
// genome (copy and paste), often 5′-truncated.
// (SiliCoDraw's composition. The genome is the DNA part above and below; the element's blocks are drawn here in
// SiliCoDraw's teal; the RNA is the RNA part (rose, where SiliCoDraw's is teal); ORF1p is the protein part, three small
// ones, and ORF2p the enzyme part with its pocket on the RNA, both amber; the arrows are the arrow part in a true grey.
// SiliCoDraw's short ticks at the target-site duplications are left out.)
{
  const g = page(4.6, [0, -0.5]), h = 10
  const top = dna(g, { x: 0, y: -33, size: 100, width: 12, turns: 6, id: 'genome' })
  const bottom = dna(g, { x: 0, y: 33, size: 100, width: 12, turns: 6, id: 'genome-new-sites' })
  const src = element(g, { x0: -20, y: -33, h, id: 'LINE-1' })
  const full = element(g, { x0: 4, y: 33, h, id: 'LINE-1-new-copy' }), cut = element(g, { x0: -40, y: 33, h, full: false, id: 'LINE-1-truncated-copy' })
  const r = rna(g, { x: -6, y: -1, size: 38, waves: 2.5, width: 10, id: 'LINE-1-RNA' })
  const orf1 = [[-19, -5.5], [-9, -6], [1, -5.5]].map(([x, y], i) => protein(g, { x, y, size: 8, id: `ORF1p-${i + 1}` }))
  const orf2 = enzyme(g, { x: 18, y: -3, size: 17, turn: 180, id: 'ORF2p' })
  const down = arrow(g, { x: -6, y: -20, size: 12, turn: 90, colour: GREY.outline, id: 'transcription' })
  const right = arrow(g, { points: [[20, 7], [22, 14], [23, 23]], colour: GREY.outline, id: 'insertion-1' })
  const left = arrow(g, { points: [[-18, 6], [-25, 13], [-30, 23]], colour: GREY.outline, id: 'insertion-2' })
  icon('LINE-1 retrotransposon', join(top, bottom, src, full, cut, r, ...orf1, orf2, down, right, left))
}

// Histone loss: chromatin with fewer nucleosomes than it should have: between two nucleosomes a stretch of naked DNA
// where one is missing (its place a dashed outline), its histone octamer leaving.
// (SiliCoDraw's composition: histones, blue DNA. The chromatin is the fibre part of ../parts/genetics.mjs with one
// nucleosome missing (the DNA runs on bare there), the octamer leaving is the octamer part; the histones are the lilac of
// chromatin in the set, not SiliCoDraw's peach; the arrow is the arrow part in the histones' outline tone. SiliCoDraw's two
// small balls beside the octamer (histone dimers) are left out.)
{
  const g = page(4.26, [0, -7.6]), core = NUC, y0 = 18
  const chrom = fibre(g, { from: [-52, y0 - 9], to: [52, y0 + 10], count: 3, missing: [1], R: 15, id: 'chromatin' })
  const ghost = own('lost-nucleosome', g.ellipse(0, y0 - 1, 13, 13 * 0.43 * 1.6, 0, 'none', core.small, 4).replace('/>', ' stroke-dasharray="9 9" stroke-linecap="round"/>'))
  const oct = octamer(g, { x: 0, y: -32, size: 32, id: 'octamer' })
  const up = arrow(g, { x: 0, y: -8, size: 15, turn: -90, colour: core.outline, id: 'leaving' })
  icon('Histone loss', join(chrom, ghost, { ...up, parts: [] }, oct))
}

// Translation errors: a ribosome reading an mRNA; one wrong amino acid in the growing chain, which then misfolds into a
// tangle.
// (SiliCoDraw's composition. The ribosome and its mRNA are the parts, as in mg03's Translation (terracotta, the mRNA rose
// with its bases); the chain is amber beads, as mg03's, with the wrong amino acid violet (SiliCoDraw's red lies 6° from
// the ribosome); the tangle is the misfolded protein part.)
{
  const g = page(4.6, [0, 0]), chain = rich(75), wrong = deep(WRONG), mrnaPal = deep(HUES.rnaOnRibosome)
  const m = rna(g, { x: 0, y: 30, size: 100, bases: true, waves: 3, width: 12, id: 'mRNA', pal: mrnaPal })
  const rib = ribosome(g, { x: -14, y: 17, size: 66, id: 'ribosome' })
  const tang = misfolded(g, { x: 28, y: -28, size: 40, turn: 10, id: 'misfolded-protein' })
  const beads = [[-8, -12], [-6, -20], [-1, -27.5], [6, -31.5], [13, -32]], r = 4.4
  const link = line(g, catmull(beads, 8), chain.outline, 6)
  const amino = beads.map(([x, y], i) => g.circle(x, y, i === 2 ? 5.6 : r, i === 2 ? 'url(#wrong-gradient)' : 'url(#amino-acid-gradient)', i === 2 ? wrong.outline : chain.outline, 6)).join('')
  const pep = own('polypeptide', link + amino, [['polypeptide', chain], ['wrong amino acid', wrong]], boxGrad('amino-acid-gradient', chain) + boxGrad('wrong-gradient', wrong))
  icon('Translation errors', join(m, pep, tang, rib))
}

check()
console.log('written to', OUT)
