// Eight icons of SiliCoDraw's "Molecules & genetics" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts in ../parts/:
// the ageing signals AMPK, sirtuin, the insulin/IGF-1 receptor (DAF-2), FOXO (DAF-16) entering the nucleus, Klotho, the
// heat-shock response, glycation (AGEs) and spermidine. Their compositions are read by hand from the source in a 100 × 100
// box centred on 0,0 and scaled onto a 512 page (`page` of ../cellkit.mjs).
// Parts used: nucleosome (genetics.mjs), skeletal formula (formula.mjs), protein, enzyme, misfolded protein, phosphate, ATP (as AMP), ligand, glucose, DNA (molecules.mjs);
// lipid bilayer, receptor in a membrane (membranes.mjs); nucleus (organelles.mjs); arrow (tissue.mjs); letters.
// Drawn here because no part draws them: the β and γ subunits of AMPK (`band`, `lobes`), a battery (`battery`), the
// kinase domains of a receptor tyrosine kinase (`kinase`), a single-pass
// membrane protein's stalk (`stalk`), a thermometer with heat waves (`thermometer`), a thick collagen fibre with an
// outline (`fibre`; the collagen part is thin and flat), an AGE crosslink (`crosslink`) and a capsule (`capsule`).
// Lettered (strokes, ../parts/letters.mjs): "A" and "P" on AMP and "P" on every phosphate (by the parts), "Ac" on the
// acetyl group, "N⁺" on NAD⁺'s nicotinamide and "N" on spermidine's three nitrogens (by the skeletal part). Left out: none of the originals
// writes more than those.
// Usage: node mg17.mjs <folder>
import { mkdirSync } from 'node:fs'
import { NUC, cellTypes, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex } from '../colour.mjs'
import { catmull, f, gradient2 } from '../shapes.mjs'
import { atp, dna, enzyme, glucose, ligand, misfolded, phosphate, protein } from '../parts/molecules.mjs'
import { LIPID, PROTEIN as MEMBRANE_PROTEIN, bilayer, membraneWith, mergeParts, receptor } from '../parts/membranes.mjs'
import { nucleus } from '../parts/organelles.mjs'
import { arrow } from '../parts/tissue.mjs'
import { lettering } from '../parts/letters.mjs'
import { nucleosome } from '../parts/genetics.mjs'
import { SPERMIDINE, skeletal } from '../parts/formula.mjs'

const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const { cellType, check } = cellTypes(OUT)

// Hues (OKLCH degrees). SiliCoDraw's own colour where it can stay; moved where two parts would lie within 36°.
const AMPK = hueOf('#4f9a6a') // SiliCoDraw's green, 152
const RED = hueOf('#d64545') // a low battery, the thermometer's column, 25
const DNA = hueOf('#4f6bb8'), PHOSPHATE = 92, ACETYL = 165, NAD = 205 // NAD⁺ cerulean: DNA's blue is in the same icon
const FOXO = hueOf('#3f9a9a') // SiliCoDraw's teal, 195
const KLOTHO = 350 // rose: SiliCoDraw's orange lies within 10° of the lipids' peach
const HSP = hueOf('#5fae8b') // the green of mg11's chaperonin, 160
const AGE = hueOf('#7a5ab0') // SiliCoDraw's purple, 300
const CAPSULE = 60 // a warm amber, 105° from the nitrogens and the bonds' green
const GREY = { light: toHex({ l: 0.985, c: 0, h: 0 }), base: toHex({ l: 0.95, c: 0.004, h: 250 }), shadow: toHex({ l: 0.89, c: 0.006, h: 250 }), outline: toHex({ l: 0.55, c: 0.008, h: 250 }) }
const INK = toHex({ l: 0.5, c: 0.006, h: 250 }) // a true grey for arrows (the arrow part's own INK is a bluish slate)

const P2 = ([x, y]) => `${f(x)},${f(y)}`
const line = (pts, colour, w, cap = 'round') => `<path d="M${pts.map(P2).join(' L')}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
const hl = ([x, y], rx, ry, rot, fill) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" transform="rotate(${rot} ${f(x)} ${f(y)})" fill="${fill}"/>`
/** A polygon (page points) with its corners rounded by r px. */
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
/** A rounded rectangle given in units of g (x0, y0, x1, y1), as a path on the page; r in units. */
const roundRect = (g, [x0, y0, x1, y1], r) => roundPoly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(g.P), r * g.k)
/** A circle in units of g as a path (for unions). */
const circleD = (g, x, y, r) => { const [cx, cy] = g.P([x, y]), R = r * g.k; return `M${f(cx - R)},${f(cy)} A${f(R)},${f(R)} 0 1 0 ${f(cx + R)},${f(cy)} A${f(R)},${f(R)} 0 1 0 ${f(cx - R)},${f(cy)} Z` }
/** Joins the { defs, body, parts } of several parts; parts that share a palette are one (they recolour together). */
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), parts: mergeParts(ps.flatMap((p) => p.parts)) })
const icon = (name, { defs, body, parts }) => cellType(name, parts, defs, body)
/** Some drawing of this script as a part: { defs, body, parts }. */
const own = (id, body, parts, defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })
/** A drawing that belongs to a part already listed (arrows, letters, a protein's stalk): no palette of its own. */
const extra = (p) => ({ ...p, parts: [] })
/**
 * A part drawn turned keeps its highlight where the turn puts it (on the enzyme turned to open its pocket to the lower
 * left, at its right edge). This moves the highlight back to the upper left of the page: `at` its middle in units of g,
 * rx, ry in page pixels. (The enzyme part could take an option for where its light falls.)
 */
const relight = (g, p, { x, y, turn }, at, rx, ry) => {
  const [cx, cy] = g.P([x, y]), [hx, hy] = g.P(at), t = (-turn * Math.PI) / 180
  const u = cx + (hx - cx) * Math.cos(t) - (hy - cy) * Math.sin(t), v = cy + (hx - cx) * Math.sin(t) + (hy - cy) * Math.cos(t)
  const body = p.body.replace(/<ellipse cx="[^"]*" cy="[^"]*" rx="[^"]*" ry="[^"]*" transform="rotate\([^)]*\)" fill="([^"]*)"\/>/, (_, fill) => hl([u, v], rx, ry, f(-40 - turn), fill))
  return { ...p, body }
}

// ---------------------------------------------------------------------------------------------------------------------
// Drawn here
// ---------------------------------------------------------------------------------------------------------------------

/** A low battery: a grey case with one short red bar of charge left (energy running low). x, y its middle, `w` its width. */
const battery = (g, { x, y, w, id = 'battery', pal = deep(RED) }) => {
  const h = w * 0.52, sw = f(Math.max(4, w * g.k * 0.075)), x0 = x - w / 2, y0 = y - h / 2, inset = w * 0.12
  const nub = roundRect(g, [x0 + w - 0.5, y - h * 0.22, x0 + w + w * 0.11, y + h * 0.22], w * 0.03)
  const bar = roundRect(g, [x0 + inset, y0 + inset, x0 + inset + w * 0.2, y0 + h - inset], w * 0.04)
  return own(id, `<path d="${nub}" fill="${GREY.outline}"/><path d="${roundRect(g, [x0, y0, x0 + w, y0 + h], w * 0.13)}" fill="${GREY.base}" stroke="${GREY.outline}" stroke-width="${sw}" stroke-linejoin="round"/><path d="${bar}" fill="${pal.small}"/>`, [['charge', pal]])
}

// ---------------------------------------------------------------------------------------------------------------------
// AMPK: the energy sensor, a heterotrimer: the catalytic α subunit (above) with the phosphate on Thr172 that switches it
// on, the β subunit across the middle (the scaffold) and the γ subunit below, four CBS domains (lobes) in which AMP binds;
// a nearly empty battery says why it is active (energy running low).
// (SiliCoDraw letters "P" on the phosphate and draws AMP as a pentagon and a dot. Here the phosphate is the mustard part,
// lettered "P", and AMP is the ATP part with one phosphate, lettered "A" and "P". The three subunits are one green, in
// three tones, as SiliCoDraw has them: one enzyme, recoloured as one. The battery's charge is red, not green, as a low
// battery is shown.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.85, [-3.4, -1.8])
  const a = { ...deep(AMPK), light: toHex({ l: 0.95, c: 0.03, h: AMPK }) }
  const mid = { base: toHex({ l: 0.9, c: 0.055, h: AMPK }), shadow: toHex({ l: 0.84, c: 0.075, h: AMPK }), outline: a.outline }
  const pale = { base: toHex({ l: 0.95, c: 0.03, h: AMPK }), shadow: toHex({ l: 0.9, c: 0.05, h: AMPK }), outline: a.outline }
  const W = 9
  // γ: four CBS domains side by side, one outline round them all.
  const lobes = [[-25, 25], [-9, 31], [9, 31], [25, 25]].map(([x, y]) => circleD(g, x, y, 12))
  const gamma = own('gamma-subunit', g.union(lobes, 'url(#gamma-gradient)', pale.outline, W / 2 + 1), [], g.grad('gamma-gradient', [-37, 13, 37, 43], pale))
  // β: the scaffold, a long band across the middle.
  const beta = own('beta-subunit', g.path(g.smooth([[-40, 7], [-32, 0], [-10, 2], [10, 0], [32, -2], [42, 4], [36, 12], [12, 12], [-10, 13], [-34, 14]]), 'url(#beta-gradient)', mid.outline, W), [], g.grad('beta-gradient', [-42, -2, 42, 14], mid))
  const alpha = protein(g, { x: -3, y: -22, size: 50, turn: 8, id: 'alpha-subunit', pal: a, w: 10 })
  const p = phosphate(g, { x: 22, y: -37, size: 17, id: 'phosphate-Thr172' })
  const amp = atp(g, { x: 2, y: 34, size: 46, phosphates: 1, id: 'AMP' })
  const bat = battery(g, { x: -36, y: -40, w: 26 })
  icon('AMPK', join(gamma, beta, { ...alpha, parts: [['AMPK', a]] }, extra(p), { ...amp, parts: [['AMP and phosphates', amp.parts[0][1]]] }, bat))
}

// ---------------------------------------------------------------------------------------------------------------------
// Sirtuin: an NAD⁺-dependent deacetylase takes the acetyl group off a histone tail. A nucleosome (lower left) reaches its
// tail into the sirtuin's cleft, where NAD⁺ is bound; the acetyl group leaves (arrow).
// (SiliCoDraw draws the sirtuin as two violet lobes, NAD⁺ as a small hexagon and pentagon, and the acetyl group as a
// circle lettered "Ac" on a dashed line. Here the sirtuin is the enzyme part (amber: violet lay within 20° of the lilac
// histones), NAD⁺ is its nicotinamide ring lettered "N⁺" in cerulean (DNA's blue is in the icon), the acetyl group the green
// ball of mg06's Histone acetylation, lettered "Ac", and its leaving is an arrow. The nucleosome is the genetics part, its tail drawn here.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.3, [-3.3, 2.2])
  const sirt = relight(g, enzyme(g, { x: 27, y: -14, size: 48, turn: 128, id: 'sirtuin' }), { x: 27, y: -14, turn: 128 }, [22, -27], 15, 5.5)
  const nad = glucose(g, { x: 24.5, y: -10.5, size: 14, turn: 30, id: 'NAD', pal: deep(NAD) })
  const nadL = lettering(g, { x: 24, y: -9.9, h: 5.6, text: 'N+', colour: deep(NAD).outline, id: 'NAD-letters' })
  // The nucleosome part with no tails of its own; this icon's one tail is drawn behind its core, aimed at the sirtuin.
  const part = nucleosome(g, { x: -20, y: 30, size: 64 })
  const tail = `<g id="nucleosome-histone-tail">${line(catmull([[-14, 18], [-10, 2], [0, -2], [11, -2]], 12).map(g.P), NUC.outline, 13)}</g>`
  const nuc = { ...part, body: tail + part.body }
  const ac = ligand(g, { x: -22, y: -30, size: 22, id: 'acetyl-group', pal: deep(ACETYL) })
  const acL = lettering(g, { x: -22, y: -30, h: 9, text: 'Ac', colour: deep(ACETYL).outline, id: 'acetyl-letters' })
  const arr = arrow(g, { points: [[6, -16], [-2, -24], [-8, -28]], colour: INK, id: 'arrow' })
  icon('Sirtuin', join(nuc, sirt, nad, extra(nadL), extra(arr), ac, extra(acL)))
}

// ---------------------------------------------------------------------------------------------------------------------
// Insulin/IGF-1 receptor (DAF-2 in the worm): a receptor tyrosine kinase across the membrane, insulin bound between its
// two arms, and below the membrane its two kinase domains, each with two phosphates (autophosphorylation).
// (SiliCoDraw draws the arms as an arch and letters "P" on four small circles. Here the receptor is the receptor part, its
// ligand insulin in the green of every ligand, the kinase domains drawn as rounded blocks in the receptor's palette, and
// the phosphates are the mustard part, lettered "P".)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.55, [0, 7.2])
  const T = 38
  const m = membraneWith(g, { x: 0, y: 2, size: 100, thick: T, id: 'membrane', proteins: [{ part: receptor, at: 0, tail: 0.9, id: 'receptor' }] })
  const pal = MEMBRANE_PROTEIN, [[lx, ly], [rx, ry]] = m.anchors[0].tails
  const kw = 16, kh = 15, W = 6
  const kinase = [lx, rx].map((x, i) => { const s = i ? 1 : -1, cx = x / 1 + s * 3; return { cx, d: roundRect(g, [cx - kw / 2, ly - 2, cx + kw / 2, ly - 2 + kh], 4.5) } })
  const kin = own('kinase-domains', kinase.map(({ d }) => `<path d="${d}" fill="url(#kinase-gradient)" stroke="${pal.outline}" stroke-width="${W}" stroke-linejoin="round"/>`).join(''), [], g.grad('kinase-gradient', [lx - 20, ly, rx + 20, ly + kh], { base: pal.shadow, shadow: toHex({ l: 0.8, c: 0.075, h: hueOf(pal.base) }) }))
  const phos = kinase.flatMap(({ cx }, i) => { const s = i ? 1 : -1; return [ly + 1, ly + 13].map((y, j) => phosphate(g, { x: cx + s * (kw / 2 + 4.5), y, size: 10, id: `phosphate-${i * 2 + j + 1}` })) })
  icon('Insulin receptor', join(m, kin, ...phos))
}

// ---------------------------------------------------------------------------------------------------------------------
// FOXO (DAF-16) to the nucleus: with insulin signalling low, FOXO loses the phosphate that kept it in the cytoplasm,
// moves through a nuclear pore (arrow) and binds DNA to switch on its target genes.
// (Corrected: SiliCoDraw's FOXO carries its "P" on the way in; a phosphorylated FOXO is held in the cytoplasm, so here
// the phosphate (the mustard part, lettered "P") has come off it. The nucleus is the nucleus part with pores, in the lilac
// of every nucleus, the DNA the blue DNA part, FOXO the protein part in SiliCoDraw's teal.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.68, [1.9, 0.6])
  const C = [15, 7], S = 72
  const nuc = nucleus(g, { x: C[0], y: C[1], size: S, pores: true, id: 'nucleus' })
  const d = dna(g, { x: C[0], y: C[1] + 14, size: 52, width: 12, id: 'DNA' })
  const fpal = soft(FOXO), fp = { ...fpal, base: toHex({ l: 0.86, c: 0.07, h: FOXO }), shadow: toHex({ l: 0.78, c: 0.09, h: FOXO }), outline: toHex({ l: 0.52, c: 0.1, h: FOXO }) }
  const inside = protein(g, { x: C[0] + 2, y: C[1] + 3, size: 25, turn: 20, id: 'FOXO-in-nucleus', pal: fp })
  const outside = protein(g, { x: -35, y: -24, size: 25, id: 'FOXO', pal: fp })
  const p = phosphate(g, { x: -40, y: -2, size: 13, id: 'phosphate' })
  const arr = arrow(g, { points: [[-28, -37], [-17, -39], [-8, -33], [-4, -27]], colour: fp.outline, id: 'arrow' })
  icon('FOXO to nucleus', join(nuc, d, inside, outside, p, extra(arr)))
}

// ---------------------------------------------------------------------------------------------------------------------
// Klotho: α-Klotho, a single-pass membrane protein of two globular domains (KL1, KL2), beside FGFR1, whose two Ig-like
// domains stand on a stalk of its own; together they bind FGF23 (the small ball between them).
// (SiliCoDraw draws both proteins in orange. Here Klotho is rose, FGFR1 the blue of membrane proteins and FGF23 the green
// of a ligand, so that the three and the peach lipids recolour apart; the domains are the protein part, the stalks across
// the membrane are drawn here.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.6, [0, 1.4])
  const T = 22, my = 31
  const kl = soft(KLOTHO), fr = MEMBRANE_PROTEIN
  const m = bilayer(g, { x: 0, y: my, size: 100, thick: T, id: 'membrane', gaps: [{ at: -18, width: 9 }, { at: 22, width: 9 }] })
  const stalk = (id, x, y0, y1, pal) => own(id, `<path d="${roundRect(g, [x - 3, y0, x + 3, y1], 3)}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="6" stroke-linejoin="round"/>`, [], g.grad(`${id}-gradient`, [x - 3, y0, x + 3, y1], pal))
  const ks = stalk('Klotho-stalk', -18, 4, my + 14, kl), fs = stalk('FGFR1-stalk', 22, 6, my + 14, fr)
  const kl1 = protein(g, { x: -18, y: 0, size: 32, turn: 0, id: 'Klotho-KL1', pal: kl })
  const kl2 = protein(g, { x: -21, y: -27, size: 32, turn: 12, id: 'Klotho-KL2', pal: kl })
  const d3 = protein(g, { x: 23, y: -1, size: 25, turn: -10, id: 'FGFR1-D3', pal: fr })
  const d2 = protein(g, { x: 24, y: -25, size: 25, turn: 8, id: 'FGFR1-D2', pal: fr })
  const fgf = ligand(g, { x: 3, y: -33, size: 16, id: 'FGF23' })
  icon('Klotho', join(m, extra(ks), kl1, kl2, extra(fs), d3, d2, fgf))
}

// ---------------------------------------------------------------------------------------------------------------------
// Heat-shock response: heat (a thermometer, heat rising) unfolds proteins, and a heat-shock protein (HSP70, the chaperone
// HSF-1 switches on) holds the misfolded chain in its cleft.
// (SiliCoDraw draws everything in red. Here the thermometer's column and the heat are red, the chaperone the enzyme part
// in the green of mg11's chaperonin, its jaw open to the left, and the chain in it the misfolded-protein part, amber.)
// ---------------------------------------------------------------------------------------------------------------------
const thermometer = (g, { x, y, h, id = 'thermometer', pal = deep(RED) }) => {
  // x, y: the middle of the tube's axis at the top of the bulb; h the tube's length; the bulb below.
  const tw = 12, br = 11, top = y - h, sw = 7
  const glass = g.union([roundRect(g, [x - tw / 2, top, x + tw / 2, y + 4], tw / 2), circleD(g, x, y + br - 1, br)], GREY.base, GREY.outline, sw / 2)
  const column = `<path d="${roundRect(g, [x - 2.6, top + h * 0.24, x + 2.6, y + 4], 2.6)}" fill="${pal.small}"/>` + g.circle(x, y + br - 1, br - 3.6, pal.small)
  const ticks = [0.22, 0.38, 0.54, 0.7].map((t) => line([g.P([x + tw / 2 - 0.6, top + h * t]), g.P([x + 1.8, top + h * t])], GREY.outline, 4)).join('')
  return own(id, glass + column + ticks + g.hl(x - 3.8, y + br - 5.5, 6, 3, -45, pal.light), [['heat', pal]])
}
{
  const g = page(4.75, [0.6, -2.8])
  const th = thermometer(g, { x: -36, y: 20, h: 60 })
  const wave = (x0) => catmull(Array.from({ length: 7 }, (_, i) => [x0 + (i % 2 ? 2.6 : -2.6) * (i % 6 ? 1 : 0), -47 + i * 4.3]), 10).map(g.P)
  const heat = own('heat-waves', [-21, -12].map((x) => line(wave(x), deep(RED).small, 7.5)).join(''), [])
  const hsp = relight(g, enzyme(g, { x: 22, y: -10, size: 58, turn: 180, id: 'HSP70', pal: soft(HSP) }), { x: 22, y: -10, turn: 180 }, [22, -30], 17, 6)
  const chain = misfolded(g, { x: 7, y: -9, size: 27, turn: 15, id: 'misfolded-protein' })
  icon('Heat-shock response', join(th, heat, hsp, chain))
}

// ---------------------------------------------------------------------------------------------------------------------
// Glycation / AGEs: glucose binds a protein (a collagen fibre) and over the years becomes an advanced glycation end
// product that crosslinks it to its neighbour; two fibres stiffened by two such crosslinks.
// (SiliCoDraw draws the glucose ring purple with a red dot. Here it is the glucose part, green like every small molecule,
// on a short stalk from the upper fibre; the fibres are drawn here in the collagen part's palette, the crosslinks (pentosidine and the like, a
// ring between two side chains) are drawn here in SiliCoDraw's purple.)
// ---------------------------------------------------------------------------------------------------------------------
const crosslink = (g, { x, y0, y1, id, pal }) => {
  const r = 7.5, cy = (y0 + y1) / 2
  const hex = Array.from({ length: 6 }, (_, i) => { const a = (i * Math.PI) / 3; return g.P([x + r * Math.cos(a), cy + r * Math.sin(a)]) })
  return own(id, line([g.P([x, y0]), g.P([x, y1])], pal.outline, 22) + line([g.P([x, y0]), g.P([x, y1])], pal.small, 11) +
    `<path d="${roundPoly(hex, 4)}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="6" stroke-linejoin="round"/>`, [['AGE crosslinks', pal]], gradient2(`${id}-gradient`, [...g.P([x - r, cy - r]), ...g.P([x + r, cy + r])], pal.base, pal.shadow))
}
/**
 * A collagen fibre seen lengthwise: a thick wavy tube in the collagen part's palette (orange, 52°) with an outline and a
 * pale line along its top, as SiliCoDraw draws it. (The collagen part draws a thin flat fibre, which at this thickness
 * would have no outline.) `y` its middle line, `phase` shifts its waves.
 */
const fibre = (g, { y, phase, id, pal = soft(hueOf('#d9824a')) }) => {
  const pts = Array.from({ length: 49 }, (_, i) => { const x = -48 + 2 * i; return [x, y + 3.2 * Math.sin((x + phase) / 7)] }).map(g.P)
  const T = 9 * g.k, W = 8
  const shine = pts.slice(4, -4).map(([x, yy]) => [x, yy - T * 0.22])
  return own(id, line(pts, pal.outline, T + 2 * W) + line(pts, pal.base, T) + line(shine, pal.light, T * 0.18), [['collagen', pal]])
}
{
  const g = page(4.24, [0, -0.3])
  const age = deep(AGE)
  const top = fibre(g, { y: -2, phase: 0, id: 'collagen-upper' }), bottom = fibre(g, { y: 30, phase: 7, id: 'collagen-lower' })
  const links = [-22, 18].map((x, i) => crosslink(g, { x, y0: -2, y1: 30, id: `AGE-crosslink-${i + 1}`, pal: age }))
  const gl = glucose(g, { x: 2, y: -29, size: 24, id: 'glucose' })
  const stalkLine = own('glucose-stalk', line([g.P([2, -7]), g.P([2, -19])], deep(ACETYL).outline, 9), [])
  icon('Glycation', join(...links, top, bottom, stalkLine, gl))
}

// ---------------------------------------------------------------------------------------------------------------------
// Spermidine: the polyamine as its skeletal formula, H₂N–(CH₂)₃–NH–(CH₂)₄–NH₂: a zigzag of carbon bonds with three
// nitrogens, each carrying a positive charge as it does in the cell; below it a capsule (the supplement).
// (SiliCoDraw letters the nitrogens "N" and draws grey dots on the carbons. Here the formula is the skeletal part
// (../parts/formula.mjs): bonds in the green of small molecules, carbons unmarked, each nitrogen a blue ball lettered
// "N" with its charge. The capsule is pale grey and amber instead of grey and
// blue, which was the nitrogens' blue.)
// ---------------------------------------------------------------------------------------------------------------------
const capsule = (g, { x, y, len, r, turn, id = 'capsule', pal }) => {
  const sw = 9, half = len / 2
  const turnPt = ([u, v]) => { const t = (turn * Math.PI) / 180; return g.P([x + u * Math.cos(t) - v * Math.sin(t), y + u * Math.sin(t) + v * Math.cos(t)]) }
  const halfD = (s) => {
    const arc = Array.from({ length: 17 }, (_, i) => { const a = -Math.PI / 2 + (Math.PI * i) / 16; return [s * (half - r) + s * r * Math.cos(a), r * Math.sin(a)] })
    const pts = s > 0 ? [[0, -r], ...arc, [0, r]] : [[0, r], ...arc.map(([u, v]) => [u, -v]), [0, -r]]
    return `M${pts.map(turnPt).map(P2).join(' L')}Z`
  }
  const [a0x, a0y] = turnPt([-half, -r]), [a1x, a1y] = turnPt([half, r])
  return own(id,
    `<path d="${halfD(-1)}" fill="url(#${id}-left-gradient)"/><path d="${halfD(1)}" fill="url(#${id}-right-gradient)"/>` +
      line([turnPt([0, -r]), turnPt([0, r])], GREY.outline, sw * 0.8) +
      `<path d="${halfD(-1)} ${halfD(1)}" fill="none" stroke="${GREY.outline}" stroke-width="${sw}" stroke-linejoin="round"/>` +
      line([turnPt([-half + r * 0.7, -r * 0.45]), turnPt([-r * 0.5, -r * 0.45])], GREY.light, 6) + line([turnPt([r * 0.5, -r * 0.45]), turnPt([half - r * 0.7, -r * 0.45])], pal.light, 6),
    [['capsule', pal]],
    gradient2(`${id}-left-gradient`, [Math.min(a0x, a1x), Math.min(a0y, a1y), Math.max(a0x, a1x), Math.max(a0y, a1y)], GREY.base, GREY.shadow) +
      gradient2(`${id}-right-gradient`, [Math.min(a0x, a1x), Math.min(a0y, a1y), Math.max(a0x, a1x), Math.max(a0y, a1y)], pal.base, pal.shadow))
}
{
  const g = page(4.3, [1.5, 1])
  const mol = skeletal(g, { x: 0, y: -16, size: 104, id: 'spermidine', ...SPERMIDINE })
  const cap = capsule(g, { x: 0, y: 22, len: 70, r: 12.5, turn: -10, pal: rich(CAPSULE) })
  icon('Spermidine', join(mol, cap))
}

check()
console.log('written to', OUT)
