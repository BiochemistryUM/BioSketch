// Eight icons of SiliCoDraw's "Molecules & genetics" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts in ../parts/:
// ribosome stalling and collision, protein disaggregase, deubiquitinase, mTORC2, S6 kinase, 4E-BP, TSC complex and Rheb,
// and FGF21. Their compositions are read by hand from the source (a 100 × 100 box centred on 0,0) and set on a 512 page.
// Parts used: ribosome, lysosome (organelles.mjs); bilayer, receptor in a membrane (membranes.mjs); protein, enzyme,
// aggregate, ubiquitin, phosphate, RNA, growth factor (molecules.mjs); arrow, inhibition (tissue.mjs).
// The mTOR complex 2 is the part `mtorComplex` (complexes.mjs, `complex: 2`). Drawn here, because no part draws them: the
// disaggregase hexamer cut open (`hexamer`), an RNA hairpin, nascent chains of amino acids (as mg03's Translation), a disordered chain (4E-BP, `chain`) and the liver (`liver`).
// Lettered: the "P" of every phosphate (the phosphate part does it), the only letters SiliCoDraw writes in these eight
// (mTORC2, S6 kinase). Nothing else is lettered: SiliCoDraw writes no "DUB", "S6K", "4E-BP", "TSC", "Rheb" or "FGF21".
// Usage: node mg22.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex, toLch } from '../colour.mjs'
import { catmull, f } from '../shapes.mjs'
import { aggregate, enzyme, growthFactor, phosphate, protein, rna, ubiquitin } from '../parts/molecules.mjs'
import { bilayer, membraneWith, receptor } from '../parts/membranes.mjs'
import { HUES, lysosome, ribosome } from '../parts/organelles.mjs'
import { arrow, inhibition } from '../parts/tissue.mjs'
import { mtorComplex } from '../parts/complexes.mjs'

const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012) are left out of the hue check: BioSketch never recolours them with a part.
// Copies of one part (two ribosomes) are one part: they share a palette and recolour together.
const icon = (name, ...ps) => { const { defs, body, hues } = ps.length > 1 ? join(...ps) : ps[0]; kit.cellType(name, hues.filter(([, p]) => toLch(p.base).c >= 0.012).filter(([n, p], i, a) => a.findIndex(([m, q]) => m === n && q.base === p.base) === i), defs, body) }
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), hues: ps.flatMap((p) => p.parts ?? p.hues) })

// Hues (OKLCH degrees). Ribosome terracotta 30 and its mRNA rose 352 (organelles.mjs), protein amber 75, ubiquitin the
// deeper amber, phosphate mustard 92, lipids peach 52, receptor blue 267, lysosome rose 355.
const GREEN = hueOf('#5fae8b') // 163: nascent chains, Rheb (as mg16)
const DISAGG = hueOf('#4f8fc0') // 243: SiliCoDraw's disaggregase blue
const SUBSTRATE = hueOf('#dbe4f7') // 265: SiliCoDraw's pale blue substrate of the DUB
const DUB = hueOf('#3f9d8a') // 178: SiliCoDraw's teal DUB
const S6K = hueOf('#8a5aa8') // 311: SiliCoDraw's purple S6 kinase
const EIF4E = hueOf('#d6e4f3') // 250: SiliCoDraw's pale blue eIF4E
const TSC = hueOf('#5f86c4') // 259: SiliCoDraw's blue TSC complex
const AKT = 350 // rose: AKT, the target of mTORC2
const LIVER = 14 // red-brown: 38° from the lipids' peach
/** The liver's palette: the `deep` steps, darker and less coloured, so that it reads red-brown, not pink. */
const LIVER_PAL = { light: toHex({ l: 0.93, c: 0.03, h: LIVER }), base: toHex({ l: 0.76, c: 0.085, h: LIVER }), shadow: toHex({ l: 0.66, c: 0.1, h: LIVER }), small: toHex({ l: 0.6, c: 0.1, h: LIVER }), outline: toHex({ l: 0.46, c: 0.1, h: LIVER }) }
const FGF = 205 // cerulean: FGF21, 62° from the receptor's blue
const KLOTHO = 310 // violet: β-Klotho
// Arrows and marks in a true grey (chroma below 0.012): the part's INK lies within 36° of the blues.
const GREY = toHex({ l: 0.5, c: 0.008, h: 255 })

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const lineFor = (px) => f(clamp(2.5 + px * 0.03, 3.5, 10))
const ptsD = (pts) => `M${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' L')}`
const stroke = (d, colour, w, cap = 'round') => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
const boxGrad = (id, pal) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`
const disc = (g, [x, y], r, fill, s = '', w = 0) => `<circle cx="${f(g.X(x))}" cy="${f(g.Y(y))}" r="${f(r * g.k)}" fill="${fill}"${s ? ` stroke="${s}" stroke-width="${f(w)}"` : ''}/>`
const shine = (g, [x, y], rx, ry, rot, fill) => `<ellipse cx="${f(g.X(x))}" cy="${f(g.Y(y))}" rx="${f(rx * g.k)}" ry="${f(ry * g.k)}" transform="rotate(${rot} ${f(g.X(x))} ${f(g.Y(y))})" fill="${fill}"/>`

// =====================================================================================================================
// Drawings of this batch (no part draws them)
// =====================================================================================================================

/**
 * The disaggregase (Hsp104 / ClpB), a ring of six AAA+ subunits seen from the side and cut open: the back subunit in
 * the shadow tone, the two front ones as columns of two tiers (NBD1 above NBD2) with the central channel between them.
 * Returns { back, front } so that a threaded chain can be drawn between the two. x, y the middle; `size` its width.
 */
export function hexamer(g, { x, y, size, id = 'disaggregase', pal = soft(DISAGG), w }) {
  const s = size / 54, W = w ?? lineFor(size * g.k * 0.8)
  const rr = (cx, cy, wd, ht, r) => { const [x0, y0] = g.P([x + (cx - wd / 2) * s, y + (cy - ht / 2) * s]), X = wd * s * g.k, Y = ht * s * g.k, R = r * s * g.k; return `M${f(x0 + R)},${f(y0)} H${f(x0 + X - R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + X)},${f(y0 + R)} V${f(y0 + Y - R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + X - R)},${f(y0 + Y)} H${f(x0 + R)} A${f(R)},${f(R)} 0 0 1 ${f(x0)},${f(y0 + Y - R)} V${f(y0 + R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + R)},${f(y0)} Z` }
  const tier = (cx, cy, grad) => `<path d="${rr(cx, cy, 19, 21.5, 7.5)}" fill="url(#${grad})" stroke="${pal.outline}" stroke-width="${W}" stroke-linejoin="round"/>`
  const lower = { ...pal, base: pal.shadow, shadow: pal.small }
  const defs = g.grad(`${id}-gradient`, [x - 27 * s, y - 23 * s, x + 27 * s, y + 23 * s], pal) + g.grad(`${id}-lower-gradient`, [x - 27 * s, y, x + 27 * s, y + 23 * s], lower) +
    g.grad(`${id}-back-gradient`, [x - 10 * s, y - 23 * s, x + 10 * s, y + 23 * s], { base: pal.small, shadow: pal.outline })
  const back = `<g id="${id}-back">${tier(0, -11.5, `${id}-back-gradient`)}${tier(0, 11.5, `${id}-back-gradient`)}</g>`
  const front = `<g id="${id}-front">${[-17.5, 17.5].map((cx) => tier(cx, -11.5, `${id}-gradient`) + tier(cx, 11.5, `${id}-lower-gradient`)).join('')}` +
    (size * g.k >= 140 ? [-17.5, 17.5].map((cx) => shine(g, [x + (cx - 3.5) * s, y - 17 * s], 4 * s, 1.5 * s, -20, pal.light)).join('') : '') + '</g>'
  return { defs, back, front, parts: [['disaggregase', pal]] }
}

/** A chain of amino acids as a tube (outline, then fill) along points of g: a disordered or unfolded polypeptide. */
const chain = (g, pts, { T, pal, id, w = 5 }) => {
  const P = catmull(pts, 12).map(g.P)
  return { defs: '', body: `<g id="${id}">${stroke(ptsD(P), pal.outline, T * g.k + 2 * w)}${stroke(ptsD(P), pal.small, T * g.k)}</g>`, parts: [['protein', pal]] }
}

/** A nascent chain leaving a ribosome: amino acids as beads on a thin link (as mg03's Translation), from `beads[0]`. */
const nascent = (g, beads, { r, pal, id }) => {
  const link = stroke(ptsD(catmull(beads, 8).map(g.P)), pal.outline, 6)
  return { defs: boxGrad(`${id}-gradient`, pal), body: `<g id="${id}">${link}${beads.map(([x, y], i) => g.circle(x, y, r, i % 2 ? pal.small : `url(#${id}-gradient)`, pal.outline, 5)).join('')}</g>`, parts: [['nascent chain', pal]] }
}

/**
 * The liver, seen from the front: the large right lobe (on the viewer's left) tapering into the left lobe, the line of
 * the falciform ligament between them, a gradient and a highlight. x, y its middle, `size` its width.
 */
export function liver(g, { x, y, size, id = 'liver', pal = LIVER_PAL, w }) {
  const s = size / 54, P = ([u, v]) => [x + u * s, y + v * s], W = w ?? lineFor(size * g.k)
  const pts = [[-27, 6], [-26, -6], [-20, -14], [-6, -17], [10, -15], [24, -10], [27, -4], [20, 1], [6, 6], [-8, 12], [-20, 15]].map(P)
  const lig = catmull([[3, -16], [-1, -6], [-6, 4], [-10, 11]], 10).map(P).map(g.P)
  return {
    defs: g.grad(`${id}-gradient`, [x - 27 * s, y - 17 * s, x + 27 * s, y + 15 * s], pal),
    body: `<g id="${id}"><path d="${g.smooth(pts)}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="${W}" stroke-linejoin="round"/>${stroke(ptsD(lig), pal.outline, W * 0.6)}` +
      `${shine(g, P([-17, -8]), 6 * s, 2.2 * s, -28, pal.light)}</g>`,
    parts: [['liver', pal]],
  }
}

/** FGF21, a β-trefoil: three dots of the growth factor part, flat, touching, one up. `size` its width. */
const trefoil = (g, { x, y, size, id, pal }) => {
  const r = size * 0.27, d = size * 0.25
  const dots = [0, 1, 2].map((i) => { const a = (i * 2 * Math.PI) / 3 - Math.PI / 2; return growthFactor(g, { x: x + d * Math.cos(a), y: y + d * Math.sin(a) + size * 0.06, size: 2 * r, id: `${id}-${i + 1}`, pal }) })
  return { defs: '', body: `<g id="${id}">${dots.map((p) => p.body).join('')}</g>`, parts: [['FGF21', pal]] }
}

// =====================================================================================================================

// Ribosome stalling and collision: two ribosomes on an mRNA, the leading one stalled at a hairpin ahead of it and the
// trailing one run into it (the clash marked by three grey strokes over the contact); each pushes out its nascent chain,
// and the leading one carries a short ubiquitin chain on its small subunit (ZNF598 / Hel2 marks collided ribosomes).
// (SiliCoDraw draws a pale blue and a pinkish ribosome on a grey line, a red hairpin, red clash strokes and grey beads.
// Here the ribosomes are the ribosome part twice, the mRNA the RNA part with its bases in the rose the ribosome gives it,
// its hairpin drawn in the same rose, the ubiquitin the amber chain of the set and the nascent chains green (amber would
// join the ubiquitin), beaded as in Translation; the clash strokes are grey.)
{
  const g = page(4.5, [0.65, -1.6]), mrnaPal = deep(HUES.rnaOnRibosome), chainPal = soft(GREEN)
  const yr = 6, size = 40, ym = yr + 0.18 * size
  const m = rna(g, { x: -7, y: ym, size: 86, bases: true, waves: 3, width: 12, id: 'mRNA', pal: mrnaPal })
  const ye = ym - 0.04 * 86, T = 12
  const hp = [[36, ye], [39, ye], [39, ye - 13], ...Array.from({ length: 9 }, (_, i) => { const a = Math.PI + (i / 8) * Math.PI; return [43 + 4 * Math.cos(a), ye - 13 + 4 * Math.sin(a)] }), [47, ye - 13], [47, ye], [50, ye]]
  const rungs = [3, 7.5].map((d) => ptsD([g.P([39, ye - d]), g.P([47, ye - d])]))
  const hairpin = { defs: '', body: `<g id="hairpin">${rungs.map((d) => stroke(d, mrnaPal.base, T * 0.6)).join('')}${stroke(ptsD(hp.map(g.P)), mrnaPal.small, T)}</g>`, parts: [['RNA', mrnaPal]] }
  const chains = [-18.5, 17.5].map((x, i) => nascent(g, [[x, yr - 19], [x - 4.5, yr - 26], [x, yr - 32.5], [x + 4.5, yr - 39]], { r: 3.9, pal: chainPal, id: `nascent-chain-${i + 1}` }))
  const ribs = [[-18.5, 'trailing-ribosome'], [17.5, 'stalled-ribosome']].map(([x, id]) => ribosome(g, { x, y: yr, size, id }))
  const clash = { defs: '', body: `<g id="collision">${[[0, -26, 0, -33], [-6, -24, -10.5, -30], [6, -24, 10.5, -30]].map(([a, b, c, d]) => stroke(ptsD([g.P([a - 0.5, b + yr]), g.P([c - 0.5, d + yr])]), GREY, 10)).join('')}</g>`, parts: [] }
  const ub = ubiquitin(g, { x: 36.5, y: yr + 21.5, size: 22, count: 3, turn: 28, id: 'ubiquitin' })
  icon('Ribosome collision', m, hairpin, ...chains, ...ribs, ub, clash)
}

// Protein disaggregase: the hexameric disaggregase (Hsp104 / ClpB) sitting on an aggregate and pulling one chain out of
// it through its central channel; an arrow beside it says which way the chain goes.
// (SiliCoDraw draws a flat peach clump and blue blocks with a beige chain. Here the clump is the aggregate part, amber, and
// the chain leaves it in the same amber; the ring is drawn here (no part draws it), in SiliCoDraw's blue; the arrow grey.)
{
  const g = page(4.6, [-0.5, 0]), pal = rich(75)
  const ag = aggregate(g, { x: -2, y: 30, size: 42, count: 5, id: 'protein-aggregate' })
  const hx = hexamer(g, { x: -4, y: -8, size: 52 })
  const ch = chain(g, [[-4, 22], [-4, 10], [-4, -10], [-4, -28], [-2, -36], [5, -38], [10, -44], [17, -42], [23, -47]], { T: 3.6, pal, id: 'unfolded-chain' })
  const a = arrow(g, { points: [[30, 8], [30, -24]], corners: true, w: 11, colour: GREY, id: 'direction-arrow' })
  icon('Protein disaggregase', { defs: ag.defs + hx.defs, body: [ag.body, `<g id="disaggregase">${hx.back}`, ch.body, `${hx.front}</g>`, a.body].join('\n'), hues: [...ag.parts, ...hx.parts] })
}

// Deubiquitinase: the DUB enzyme holding the end of a polyubiquitin chain it has just cut off a substrate protein; the
// cut is marked by short grey strokes between the substrate and the chain.
// (SiliCoDraw: a pale blue substrate, a teal cupped enzyme and grey ubiquitin beads. Here the substrate is the protein
// part in SiliCoDraw's pale blue, the DUB the enzyme part in its teal (amber, the parts' protein colour, is the
// ubiquitin's), the chain the ubiquitin part. "DUB" is not written: SiliCoDraw does not write it.)
{
  const g = page(5.36, [-3.75, 6.9])
  const sub = protein(g, { x: -27, y: 22, size: 40, turn: 10, id: 'substrate', pal: soft(SUBSTRATE) })
  const dub = enzyme(g, { x: 9, y: 22, size: 40, turn: -128, id: 'deubiquitinase', pal: soft(DUB) })
  const t = -46, len = 56, start = [-2.5, 14], dir = [Math.cos((t * Math.PI) / 180), Math.sin((t * Math.PI) / 180)]
  const ub = ubiquitin(g, { x: start[0] + (dir[0] * len) / 2, y: start[1] + (dir[1] * len) / 2, size: len, count: 4, turn: t, id: 'ubiquitin-chain' })
  const cut = { defs: '', body: `<g id="cleavage">${[[-9.5, 4, -15.5, 0], [-6, -1, -8, -7.5], [-10.5, 9.5, -17, 9]].map(([a, b, c, d]) => stroke(ptsD([g.P([a, b]), g.P([c, d])]), GREY, 9)).join('')}</g>`, parts: [] }
  icon('Deubiquitinase', sub, dub, ub, cut)
}

// mTORC2: the mTOR complex 2 at the plasma membrane, phosphorylating AKT (on Ser473, an arrow to the phosphate on it).
// (SiliCoDraw draws a teal complex of ellipses on a row of lipid heads, a pale AKT and a "P" in a circle. Here the complex
// is the mTOR complex part, as mg16's mTORC1 (same lozenge, same blue) with rictor over its upper sides, Sin1 at its
// ends and mLST8 under it; unlike mTORC1 it sits on the plasma membrane (the bilayer part), not on a lysosome. AKT is the protein part in rose,
// the phosphate the lettered part, the arrow grey.)
{
  const g = page(4.6, [0, 7.6])
  const mb = bilayer(g, { x: 0, y: 37, size: 100, thick: 22, id: 'plasma-membrane' })
  const mt = mtorComplex(g, { x: -13, y: 4.5 - (8 * 50) / 60, size: 1.5 * 50, complex: 2 })
  const akt = protein(g, { x: 31, y: 12.5, size: 27, turn: -15, id: 'AKT', pal: soft(AKT) })
  const ph = phosphate(g, { x: 41, y: -1.5, size: 13 })
  const a = arrow(g, { points: [[6, -26], [17, -32], [28, -28], [36, -12]], w: 11, colour: GREY, id: 'phosphorylation-arrow' })
  icon('mTORC2', mb, mt, akt, ph, a)
}

// S6 kinase: S6K1 phosphorylating ribosomal protein S6 on the small subunit of a ribosome translating an mRNA.
// (SiliCoDraw: a purple kinase, a pale purple ribosome on a grey wavy line and a "P" in a circle. Here the ribosome is the
// ribosome part on the RNA part (bases below), the kinase the protein part in SiliCoDraw's purple, the phosphate the
// lettered part on the small subunit, the arrow grey.)
{
  const g = page(4.6, [0, -9.6])
  const size = 56, xr = 16, yr = -2, ym = yr + 0.18 * size
  const m = rna(g, { x: 0, y: ym, size: 100, bases: true, waves: 3, width: 12, id: 'mRNA', pal: deep(HUES.rnaOnRibosome) })
  const rib = ribosome(g, { x: xr, y: yr, size, id: 'ribosome' })
  const s6k = protein(g, { x: -30, y: -28, size: 32, turn: 20, id: 'S6K1', pal: soft(S6K) })
  const ph = phosphate(g, { x: -0.5, y: yr + 20.5, size: 13 })
  const a = arrow(g, { points: [[-33, -10], [-31, 2], [-21, 12], [-9.5, 18]], w: 11, colour: GREY, id: 'phosphorylation-arrow' })
  icon('S6 kinase', m, rib, s6k, ph, a)
}

// 4E-BP: unphosphorylated 4E-BP wrapped over eIF4E, which sits on the cap at the 5' end of an mRNA, so that the ribosome
// cannot be recruited (an inhibition bar between them).
// (SiliCoDraw: a pale blue cupped eIF4E, a red band for 4E-BP, a faded ribosome on the mRNA and a ⊣ in between. Here
// eIF4E is the protein part in its pale blue, 4E-BP a disordered chain (it has no fold of its own until it binds) in the
// amber of a free protein, since red lies on the ribosome's terracotta; the cap is a dot in the mRNA's rose; the
// ribosome is the part, held off the mRNA rather than faded; the bar is the inhibition part, grey.)
{
  const g = page(4.39, [1.2, 6]), mrnaPal = deep(HUES.rnaOnRibosome)
  const m = rna(g, { x: 4, y: 32, size: 92, bases: true, waves: 3, width: 12, id: 'mRNA', pal: mrnaPal })
  const cap = { defs: '', body: `<g id="cap">${disc(g, [-42, 32 - 0.04 * 92], 5, mrnaPal.outline)}</g>`, parts: [['RNA', mrnaPal]] }
  const e4 = protein(g, { x: -26, y: 13, size: 34, turn: 5, id: 'eIF4E', pal: soft(EIF4E) })
  const bp = chain(g, [[-47, -12], [-45, -2], [-38, 0], [-28, -5], [-16, -4], [-8, 4], [-2, 0], [1, -7], [3, -10]], { T: 6, pal: rich(75), id: '4E-BP', w: 5 })
  const rib = ribosome(g, { x: 35.5, y: -12, size: 36, id: 'ribosome' })
  const bar = inhibition(g, { points: [[5.5, -11.5], [16, -13]], corners: true, w: 11, colour: GREY, id: 'inhibition' })
  icon('4E-BP', m, cap, e4, bp, rib, bar)
}

// TSC complex and Rheb: the TSC complex (TSC2 with TSC1 and TBC1D7) acting on Rheb on the surface of a lysosome: TSC2 is
// Rheb's GTPase-activating protein, so Rheb's GTP is split and a phosphate leaves (Rheb is switched off; ⊣).
// (SiliCoDraw: lavender lysosome surface with dots, blue ellipses for TSC2 and TSC1, a pale blue Rheb with a GTP dot and
// a small released circle. Here the lysosome is the part, whole, Rheb is mg16's green Rheb (the protein part), the complex
// three protein parts in SiliCoDraw's blue, the released phosphate the lettered part, the marks grey.)
{
  const g = page(4.68, [-4.7, 1.5]), tsc = soft(TSC), tsc2Pal = deep(TSC)
  const ly = lysosome(g, { x: 8, y: 30.5, size: 40, id: 'lysosome' })
  const rheb = protein(g, { x: 8, y: 3.5, size: 16, id: 'Rheb', turn: 20, pal: soft(GREEN) })
  const tsc1 = protein(g, { x: -36, y: -35, size: 24, turn: -30, id: 'TSC1', pal: tsc })
  const tbc = protein(g, { x: -15.5, y: -42, size: 12, turn: 40, id: 'TBC1D7', pal: tsc })
  const tsc2 = protein(g, { x: -24, y: -17, size: 34, turn: 60, id: 'TSC2', pal: tsc2Pal })
  const bar = inhibition(g, { points: [[-8.5, -7.5], [0.5, -1]], corners: true, w: 11, colour: GREY, id: 'GAP-inhibition' })
  const ph = phosphate(g, { x: 31, y: -14, size: 13, id: 'released-phosphate' })
  const a = arrow(g, { points: [[17, -3], [23.5, -8]], corners: true, w: 10, colour: GREY, id: 'release-arrow' })
  const all = join(ly, rheb, tsc1, tbc, tsc2, bar, ph, a)
  icon('TSC complex and Rheb', { ...all, hues: [...ly.parts, ['Rheb', soft(GREEN)], ['TSC complex', tsc2Pal], ...ph.parts] })
}

// FGF21: the liver releases FGF21, a β-trefoil hormone, which reaches its receptor FGFR1 and the co-receptor β-Klotho in
// the membrane of a target cell.
// (SiliCoDraw: a terracotta liver, teal trefoils with a dashed arrow, and FGFR1 and β-Klotho as stacks of ellipses on
// stalks in a row of lipid heads. Here the liver is drawn here (no part draws an organ) in a red-brown 38° from the lipids;
// FGF21 is three dots of the growth factor part, cerulean (the parts' blue lies on the receptor's); FGFR1 is the receptor
// part in the bilayer with FGF21 in its cup; β-Klotho two violet protein parts against it; the arrow grey.)
{
  const g = page(4.5, [0, 1]), fgf = deep(FGF), kl = soft(KLOTHO)
  const at = 16
  const mb = membraneWith(g, { x: 0, y: 32, size: 100, thick: 22, id: 'membrane', proteins: [{ part: receptor, at, bound: false, id: 'FGFR1' }] })
  const lv = liver(g, { x: -22, y: -28, size: 54 })
  const cup = [at, 32 - 0.824 * 22]
  const bound = trefoil(g, { x: cup[0], y: cup[1] - 5, size: 16, id: 'FGF21-bound', pal: fgf })
  const free = trefoil(g, { x: -20, y: -5, size: 16, id: 'FGF21', pal: fgf })
  const k1 = protein(g, { x: 33.5, y: 11.5, size: 19, turn: 30, id: 'beta-Klotho-KL2', pal: kl })
  const k2 = protein(g, { x: 31, y: -5, size: 19, turn: -20, id: 'beta-Klotho-KL1', pal: kl })
  const a = arrow(g, { points: [[-10, -3], [-1, -1], [6, 4]], w: 10, colour: GREY, id: 'arrow' })
  icon('FGF21', mb, lv, a, free, k1, k2, bound)
}

check()
console.log('written to', OUT)
