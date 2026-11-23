// Eight icons of SiliCoDraw's "Cells & tissues" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts in ../parts/:
// senescence and protein quality control: irradiation-induced senescence, the burden of senescent cells in a tissue,
// chaperone-mediated autophagy, ER-associated degradation (ERAD), the aggresome, the unfolded protein response of the ER
// (IRE1 and XBP1), glucose sensing by a pancreatic beta cell and the secretion of myokines by muscle. Their compositions
// are read by hand from the source in a 100 × 100 box centred on 0,0 and scaled onto a 512 page (`page` of ../cellkit.mjs).
// Parts used: placeCellType (Senescent cell), cell, vessel, arrow, release (tissue.mjs); nucleus, lysosome
// (organelles.mjs); lipid bilayer, ion channel (as the retrotranslocon), membraneWith (membranes.mjs); protein, misfolded
// protein, aggregate, ubiquitin, phosphate, glucose, growth factor, RNA (molecules.mjs); proteasome (complexes.mjs).
// Drawn here because no part draws them: the radiation trefoil, a tissue frame, the ER lumen in section, LAMP2A, a
// chaperone (Hsc70) of two lobes, the p97 (VCP) hexamer seen from the side, the vimentin cage of the aggresome, IRE1, the
// spliced XBP1 mRNA with its excised intron, insulin granules, a muscle fibre with its tendons.
// Lettered (strokes, ../parts/letters.mjs): "P" on IRE1's phosphates (by the phosphate part). Nothing else is written in
// the originals.
// Usage: node ct17.mjs <folder>
import { mkdirSync } from 'node:fs'
import { NUC, cellTypes, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex, toLch } from '../colour.mjs'
import { f } from '../shapes.mjs'
import { arrow, cell, placeCellType, release, vessel } from '../parts/tissue.mjs'
import { lysosome, nucleus } from '../parts/organelles.mjs'
import { aggregate, glucose, growthFactor, misfolded, phosphate, protein, rna, ubiquitin } from '../parts/molecules.mjs'
import { bilayer, ionChannel, membraneWith, mergeParts } from '../parts/membranes.mjs'
import { proteasome } from '../parts/complexes.mjs'
import { readIcon } from '../iconkit.mjs'

const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const { cellType, check } = cellTypes(OUT)

// ---------- hues of the batch (OKLCH degrees) ----------
const AMBER = 75 // free proteins and ubiquitin (the parts' convention)
const TAGGED = hueOf('#5fae8b') // a misfolded protein beside amber ubiquitin or phosphates is green, as in mg01 and mg21 (163)
const ER = 30 // the ER: its lipids' peach (52) lies 23° from ubiquitin's amber; moved to the terracotta of its ribosomes
const RADIATION = hueOf('#f2c230') // SiliCoDraw's yellow (89)
const FOCUS = hueOf('#3fae6a') // γ-H2AX foci, green as in ct14 (153)
const YOUNG = 150 // healthy cells beside senescent ones: green, as in ct16 (the senescent cell's granules are blue)
const HSC70 = hueOf('#4fa384') // SiliCoDraw's green chaperone (167)
const LAMP = 265 // LAMP2A, the blue of membrane proteins
const P97 = 205 // p97/VCP aqua: clear of the green substrate (163), the blue channel (265) and the ER (30)
const SENSOR = 265 // IRE1, the blue of membrane proteins (SiliCoDraw's orange lies on the unfolded proteins' amber)
const XBP1 = 352 // the XBP1 mRNA: rose as all RNA, but 15° lies 15° from the ER; 352 as the mRNA on a ribosome
const BETA = hueOf('#fde8c8') // SiliCoDraw's beta cell (78)
const INSULIN = 35 // insulin granules: SiliCoDraw's orange-brown, kept 43° from the cell
const MUSCLE = 15 // muscle rose, as in ct13 and Muscle satellite cell
const VESSEL = 335 // the capillary: the set's rose (18°) lies on the muscle's; moved to a pink 40° away
const MYOKINE = 245 // myokines are secreted signals: blue dots

const grey = (l, c = 0.006, h = 250) => toHex({ l, c, h })
const GREY = { light: grey(0.985, 0.002), base: grey(0.95), shadow: grey(0.88, 0.008), small: grey(0.74, 0.008), outline: grey(0.5, 0.008) }
const INK = grey(0.5, 0.006) // a true grey for arrows that are no part's colour
const DARK = grey(0.32, 0.01) // the radiation trefoil

// ---------- helpers ----------
const P2 = ([x, y]) => `${f(x)},${f(y)}`
const boxGrad = (id, pal) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`
const sw = (s, w) => (s ? ` stroke="${s}" stroke-width="${f(w)}" stroke-linejoin="round"` : '')
/** A rounded rectangle given in their units (corners x0, y0 to x1, y1). */
const rect = (g, x0, y0, x1, y1, r, fill, s = '', w = 0) => `<rect x="${f(g.X(x0))}" y="${f(g.Y(y0))}" width="${f((x1 - x0) * g.k)}" height="${f((y1 - y0) * g.k)}" rx="${f(r * g.k)}" fill="${fill}"${sw(s, w)}/>`
/** An open curve in their units (absolute M, L, C, Q), drawn as a line with round ends; width in pixels. */
const curve = (g, d, colour, w, extra = '') => `<path d="${g.D(d)}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`
/** A tube along a curve: the outline, then the fill inside it (outer width and wall in pixels). */
const tube = (g, d, outline, fill, w, wall) => curve(g, d, outline, w) + curve(g, d, fill, w - 2 * wall)
const dashed = (el, dash) => el.replace(/\/>$/, ` stroke-dasharray="${dash}"/>`)
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), parts: mergeParts(ps.flatMap((p) => p.parts)) })
const icon = (name, { defs, body, parts }) => cellType(name, parts, defs, body)
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })
const extra = (p) => ({ ...p, parts: [] })

/** Extent of an icon's drawing from its numbers (as placeCellType measures it; copied from ct16). */
function roughBox(text) {
  const xs = [], ys = []
  for (const m of text.matchAll(/\bd="([^"]+)"/g)) {
    if (/[aA]/.test(m[1])) continue
    const nums = m[1].match(/-?\d*\.?\d+(?:e-?\d+)?/g)?.map(Number) || []
    for (let i = 0; i + 1 < nums.length; i += 2) { xs.push(nums[i]); ys.push(nums[i + 1]) }
  }
  for (const m of text.matchAll(/<(circle|ellipse)\b[^>]*>/g)) {
    const a = (k) => +((m[0].match(new RegExp(`\\b${k}="(-?[\\d.]+)"`)) || [])[1] ?? NaN)
    const rx = a('r') || a('rx'), ry = a('r') || a('ry')
    if (!isNaN(a('cx'))) { xs.push(a('cx') - rx, a('cx') + rx); ys.push(a('cy') - ry, a('cy') + ry) }
  }
  for (const m of text.matchAll(/<rect\b[^>]*>/g)) {
    const a = (k) => +((m[0].match(new RegExp(`\\b${k}="(-?[\\d.]+)"`)) || [])[1] ?? NaN)
    if (!isNaN(a('x'))) { xs.push(a('x'), a('x') + a('width')); ys.push(a('y'), a('y') + a('height')) }
  }
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}
/** Where the nucleus of a Senescent cell placed at x, y with `size` lands: its middle and radius in g's units (from ct16). */
const senescentNucleus = (x, y, size) => {
  const raw = readIcon('Senescent cell', 'tmp').body, box = roughBox(raw), ext = Math.max(box[2] - box[0], box[3] - box[1])
  const at = ([u, v]) => [x + ((u - (box[0] + box[2]) / 2) * size) / ext, y + ((v - (box[1] + box[3]) / 2) * size) / ext]
  return { c: at([244.6, 256]), r: (75.8 * size) / ext }
}
/** Bright spots (γ-H2AX foci) as in ct14: a pale halo, a lit dot with its outline. */
const foci = (g, { list, id, pal, w = 4 }) => {
  const halos = list.map(([x, y, r]) => g.circle(x, y, r * 1.5, pal.base)).join('')
  const dots = list.map(([x, y, r]) => g.circle(x, y, r, `url(#${id}-gradient)`, pal.outline, w)).join('')
  const grad = `<linearGradient id="${id}-gradient" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox"><stop offset="0" stop-color="${pal.small}"/><stop offset="1" stop-color="${toHex({ ...toLch(pal.small), l: 0.6 })}"/></linearGradient>`
  return own(id, `<g id="${id}-halos">${halos}</g><g id="${id}-dots">${dots}</g>`, [['γ-H2AX foci', pal]], grad)
}
/** The ER in section: its lumen (a pale band, the top and sides with a thick outline) above a lipid bilayer. */
const erLumen = (g, { y0, y1, id = 'ER-lumen', pal }) => own(id,
  `<path d="${g.D(`M-47,${y1}L-47,${y0 + 10}Q-47,${y0} -37,${y0}L37,${y0}Q47,${y0} 47,${y0 + 10}L47,${y1}Z`)}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="9" stroke-linejoin="round"/>` +
    g.hl(22, y0 + 7, 30, 6, 0, pal.light),
  [['endoplasmic reticulum', pal]], g.grad(`${id}-gradient`, [-47, y0, 47, y1], pal))

// ---------------------------------------------------------------------------------------------------------------------
// Irradiation-induced senescence: ionising radiation (the trefoil) strikes a cell, breaks its DNA (γ-H2AX foci in the
// nucleus) and the cell becomes senescent: large and flat (the approved Senescent cell).
// (SiliCoDraw draws a pale blue cell with yellow foci and a DNA thread in its nucleus, and three zigzag rays. Here the cell
// is the approved Senescent cell with the green γ-H2AX foci of ct14; the trefoil keeps SiliCoDraw's yellow and its rays
// are arrows with a zigzag course in its outline tone; the DNA thread is left out.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.69, [1, -2]), rad = rich(RADIATION)
  const X = 8, Y = 14, S = 84
  const sen = placeCellType(g, 'Senescent cell', { x: X, y: Y, size: S, id: 'senescent-cell' })
  const { c: [nx, ny], r: nr } = senescentNucleus(X, Y, S)
  const F = [[-0.35, -0.3, 0.15], [0.32, -0.38, 0.13], [0.42, 0.25, 0.15], [-0.3, 0.38, 0.13], [0.02, 0.02, 0.16]].map(([u, v, r]) => [nx + u * nr, ny + v * nr, r * nr])
  const cx = -31, cy = -31, R = 16
  let tr = ''
  for (const a0 of [-90, 30, 150]) {
    const r1 = 4.6, r2 = 13, a1 = ((a0 - 30) * Math.PI) / 180, a2 = ((a0 + 30) * Math.PI) / 180
    const p = (r, a) => g.P([cx + r * Math.cos(a), cy + r * Math.sin(a)])
    tr += `M${P2(p(r1, a1))} L${P2(p(r2, a1))} A${f(r2 * g.k)},${f(r2 * g.k)} 0 0 1 ${P2(p(r2, a2))} L${P2(p(r1, a2))} A${f(r1 * g.k)},${f(r1 * g.k)} 0 0 0 ${P2(p(r1, a1))} Z`
  }
  const sign = own('radiation', g.circle(cx, cy, R, `url(#radiation-gradient)`, rad.outline, 8) + `<path d="${tr}" fill="${DARK}"/>` + g.circle(cx, cy, 2.8, DARK),
    [['radiation', rad]], g.grad('radiation-gradient', [cx - R, cy - R, cx + R, cy + R], rad))
  const zig = (x0, y0, x1, y1, n = 5, amp = 3.2) => {
    const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L, pts = [[x0, y0]]
    for (let i = 1; i < n; i++) { const t = (i / n) * (L - 6), s = i % 2 ? amp : -amp; pts.push([x0 + ux * t - uy * s, y0 + uy * t + ux * s]) }
    pts.push([x1, y1])
    return pts
  }
  const rays = [[-11, -35, 7, -10], [-17, -17, -2, 2], [-35, -11, -24, 9]].map(([a, b, c, d], i) => arrow(g, { points: zig(a, b, c, d), corners: true, w: 7, colour: rad.outline, id: `ray-${i + 1}` }))
  icon('Irradiation-induced senescence', join(sen, foci(g, { list: F, id: 'foci', pal: deep(FOCUS) }), sign, ...rays.map(extra)))
}

// ---------------------------------------------------------------------------------------------------------------------
// Senescent cell burden: a piece of tissue in which half the cells have become senescent (large, flat, peach, the
// approved Senescent cell) among healthy ones; the wedge below says that their share grows with age.
// (SiliCoDraw draws a grid of twelve pale cells, six of them tan with a large nucleus, and an orange wedge. Here the
// healthy cells are the cell part in the green of ct16's young cells, the senescent ones the approved Senescent cell,
// the tissue a grey frame, the wedge the senescent cell's peach.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.75, [0, 2]), young = soft(YOUNG), peach = soft(hueOf('#FCE2D3'))
  const SEN = new Set(['1,1', '2,0', '2,2', '3,0', '3,1', '3,2'])
  const frame = own('tissue', rect(g, -47, -41, 47, 23.5, 8, GREY.base, GREY.outline, 9))
  const cells = []
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
    const x = -33.75 + i * 22.5, y = -29.5 + j * 20.5
    cells.push(SEN.has(i + ',' + j)
      ? placeCellType(g, 'Senescent cell', { x, y, size: 21.5, id: `senescent-cell-${i + 1}-${j + 1}` })
      : cell(g, { x, y, size: 17.5, aspect: 0.86, pal: young, id: `cell-${i + 1}-${j + 1}` }))
  }
  const wedge = own('increase-with-age', g.path(g.D('M-45,45L45,45L45,31Z'), 'url(#wedge-gradient)', peach.outline, 7), [], g.grad('wedge-gradient', [-45, 31, 45, 45], peach))
  icon('Senescent cell burden', join(frame, ...cells, extra(wedge)))
}

// ---------------------------------------------------------------------------------------------------------------------
// Chaperone-mediated autophagy: the chaperone Hsc70 (green) recognises a protein by its KFERQ-like motif and brings it
// to LAMP2A (blue) in the lysosome's membrane, through which the protein, unfolded, is threaded into the lysosome to be
// broken down.
// (SiliCoDraw draws a lilac lysosome, a pale green substrate and a deeper green chaperone. Here the lysosome is the
// lysosome part (rose), the substrate a free protein (amber, its chain the same), LAMP2A two blue bars as membrane
// proteins of the set, Hsc70 drawn here as two lobes in SiliCoDraw's green.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.7, [-5, -0.9]), sub = rich(AMBER), hsc = soft(HSC70), lamp = soft(LAMP)
  const lyso = lysosome(g, { x: 8, y: 18, size: 60 })
  const chainD = 'M-27,-31C-18,-28 -10,-32 -2,-29C6,-26 8.5,-22 8.5,-15L8.5,8C8.5,12 6,16 2,18'
  const chain = own('substrate-chain', tube(g, chainD, sub.outline, sub.small, 15, 4.5))
  const substrate = protein(g, { x: -36, y: -30, size: 24, turn: 20, pal: sub, id: 'substrate' })
  const chap = own('Hsc70',
    g.path(g.smooth([[-20, -36], [-16, -46], [-6, -49], [5, -46], [9, -39], [5, -32], [-7, -31.5], [-17, -32]]), 'url(#hsc70-gradient)', hsc.outline, 7) +
      g.path(g.smooth([[3, -42], [10, -48], [18, -45], [20, -37], [14, -32], [7, -33]]), 'url(#hsc70-gradient)', hsc.outline, 7) +
      g.hl(-11, -44, 7, 2.4, -12, hsc.light),
    [['Hsc70', hsc]], g.grad('hsc70-gradient', [-20, -49, 20, -31], hsc))
  const lampP = own('LAMP2A', [2, 15].map((x) => rect(g, x - 3, -17.5, x + 3, -1.5, 3, 'url(#lamp-gradient)', lamp.outline, 5.5)).join(''), [['LAMP2A', lamp]], boxGrad('lamp-gradient', lamp))
  icon('Chaperone-mediated autophagy', join(lyso, chain, substrate, chap, lampP))
}

// ---------------------------------------------------------------------------------------------------------------------
// ER-associated degradation (ERAD): a misfolded protein in the ER lumen is pulled back through the membrane by a
// retrotranslocon (Hrd1), tagged with ubiquitin as it emerges, extracted by the p97 (VCP) hexamer and fed into the
// proteasome.
// (SiliCoDraw draws a pale blue ER, an orange chain, a grey ubiquitin chain, a pink double ring for p97 and a grey barrel.
// Here the ER is the lipid bilayer with its lumen above, in the ER's tone moved to 30° (its peach lay 23° from
// ubiquitin's amber); the retrotranslocon the ion channel part (blue); the misfolded protein the part in green (a protein
// beside amber ubiquitin is green, as in mg01); ubiquitin the part; p97 two stacked rings in aqua; the proteasome the
// part, lying on its side.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.75, [0, -3.8]), er = soft(ER), sub = soft(TAGGED), vcp = soft(P97)
  const MY = -14, T = 9
  const lumen = erLumen(g, { y0: -47, y1: MY, pal: er })
  const mem = membraneWith(g, { x: 0, y: MY, size: 94, thick: T, pal: er, id: 'ER-membrane', proteins: [{ part: ionChannel, at: -11, id: 'retrotranslocon', pal: soft(265) }] })
  const chainD = 'M-24,-31C-16,-31 -11,-30 -11,-22L-11,16C-11,27 0,30 14,30'
  const chain = own('substrate-chain', tube(g, chainD, sub.outline, sub.small, 15, 4.5))
  const mis = misfolded(g, { x: -31, y: -31, size: 21, pal: sub, id: 'misfolded-protein' })
  const ub = ubiquitin(g, { x: -22.8, y: -2, size: 19, count: 3, zigzag: 0.3, id: 'ubiquitin' })
  const ring = (y, id) => rect(g, -25, y, 3, y + 8.6, 4.3, `url(#p97-gradient)`, vcp.outline, 6) + curve(g, `M-15.7,${y + 1.5}L-15.7,${y + 7.1}M-6.3,${y + 1.5}L-6.3,${y + 7.1}`, vcp.outline, 4)
  const p97 = own('p97', ring(1.5, 'D1') + ring(10.6, 'D2') + g.hl(-18, 3.6, 5, 1.4, 0, vcp.light), [['p97', vcp]], boxGrad('p97-gradient', vcp))
  // The chain is seen passing through p97's central pore: drawn again over the rings, between them.
  const through = own('substrate-in-pore', curve(g, 'M-11,4L-11,16.5', sub.outline, 15) + curve(g, 'M-11,4L-11,16.5', sub.small, 6))
  const pro = proteasome(g, { x: 32, y: 30, size: 30, turn: 90 })
  icon('ER-associated degradation', join(lumen, mem, chain, mis, p97, through, ub, pro))
}

// ---------------------------------------------------------------------------------------------------------------------
// Aggresome: misfolded proteins are carried along microtubules to the centrosome, where they gather into one large
// aggregate inside a cage of vimentin, beside the nucleus.
// (SiliCoDraw's composition: a pale blue cell with a grey kidney-shaped nucleus, six microtubules and five orange
// proteins on them, and the orange aggregate in a dashed ring. Here the cell is the cell part, the nucleus the lilac part,
// the proteins and the aggregate amber (the protein and aggregate parts), the cage grey.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(5.0, [0.5, 0]), c = cell(g, { x: 0.5, y: 0, size: 94, aspect: 0.9, nucleus: false, vesicles: false })
  const cpal = soft(hueOf('#cfe3f5')), am = rich(AMBER)
  const cx = 12, cy = -3, T = [-28, -70, 15, 50, 95, -125, 180]
  const mts = own('microtubules', T.map((t) => { const r = (Math.PI / 180) * t; return curve(g, `M${f(cx + 16 * Math.cos(r))},${f(cy + 16 * Math.sin(r))}L${f(cx + 34 * Math.cos(r))},${f(cy + 32 * Math.sin(r))}`, cpal.outline, 5) }).join(''))
  const nuc = nucleus(g, { x: -24, y: 2, size: 34, oval: 0.62, turn: 78, id: 'nucleus' })
  const cargo = T.slice(0, 5).map((t, i) => { const r = (Math.PI / 180) * t; return protein(g, { x: cx + 26 * Math.cos(r), y: cy + 25 * Math.sin(r), size: 7.5, pal: am, id: `misfolded-protein-${i + 1}` }) })
  const cage = own('vimentin-cage', dashed(g.circle(cx, cy, 15, 'none', GREY.outline, 5.5), '11 8'))
  const agg = aggregate(g, { x: cx, y: cy, size: 23, count: 4, pal: am })
  icon('Aggresome', join(c, mts, nuc, ...cargo, cage, agg))
}

// ---------------------------------------------------------------------------------------------------------------------
// ER unfolded protein response (IRE1 branch): unfolded proteins in the ER lumen make IRE1 gather into dimers, which
// phosphorylate each other; its RNase cuts an intron out of the XBP1 mRNA (below), whose spliced form makes the
// transcription factor of the response.
// (SiliCoDraw draws a pale blue ER, an orange IRE1 dimer with dark dots and a grey mRNA with an orange arc lifted out of
// it. Here the ER is the bilayer with its lumen in the ER's tone (30°, as in ERAD), the unfolded proteins the misfolded
// part in green (amber lay 17° from the phosphates' mustard), IRE1 blue as membrane proteins of the set, its phosphates
// the phosphate part with its "P", and the mRNA the RNA part in rose (352°, clear of the ER) with the intron as a loop of
// the same strand lifted out of it.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.75, [0, -6]), er = soft(ER), un = soft(TAGGED), ire = soft(SENSOR), rp = deep(XBP1)
  const MY = -14, T = 9
  const lumen = erLumen(g, { y0: -47, y1: MY, pal: er })
  const mem = bilayer(g, { x: 0, y: MY, size: 94, thick: T, pal: er, id: 'ER-membrane', gaps: [[-10.5, 10.5]] })
  const unf = [[-34, -32, 17, 10], [32, -32, 16, -30]].map(([x, y, s, t], i) => misfolded(g, { x, y, size: s, turn: t, pal: un, id: `unfolded-protein-${i + 1}` }))
  const stalks = curve(g, 'M-6,-26L-6,-2M6,-26L6,-2', ire.outline, 15) + curve(g, 'M-6,-26L-6,-2M6,-26L6,-2', ire.base, 6)
  const doms = [-1, 1].map((s) => g.ellipse(7 * s, -30, 6.5, 8.5, 0, 'url(#ire1-gradient)', ire.outline, 6) + g.ellipse(9 * s, 4, 8.5, 10.5, 0, 'url(#ire1-gradient)', ire.outline, 6.5)).join('') +
    g.hl(-10, 0, 4, 1.6, -40, ire.light)
  const ire1 = own('IRE1', stalks + doms, [['IRE1', ire]], boxGrad('ire1-gradient', ire))
  const ph = [-1, 1].map((s) => phosphate(g, { x: 21.5 * s, y: -2, size: 9, id: `phosphate-${s < 0 ? 'left' : 'right'}` }))
  const exon = [[-29, 30], [29, 30]].map(([x, y], i) => rna(g, { x, y, size: 34, waves: 1.5, pal: rp, width: 9, id: `XBP1-mRNA-${i + 1}` }))
  const intron = own('intron', curve(g, 'M-8,29C-8,16 8,16 8,29', rp.small, 9))
  const cut = own('cuts', curve(g, 'M-12.5,25L-11,35M12.5,25L11,35', ire.outline, 5))
  icon('ER unfolded protein response', join(lumen, mem, ...unf, ire1, ...ph, ...exon, intron, extra(cut)))
}

// ---------------------------------------------------------------------------------------------------------------------
// Beta cell glucose sensing: glucose enters a pancreatic beta cell, which answers by releasing insulin from its
// granules (exocytosis at the top).
// (SiliCoDraw's composition: a pale orange cell with its nucleus, eight insulin granules with dark cores, two glucose
// hexagons with an arrow in, and a granule releasing dots at the top. Here the cell is the cell part in SiliCoDraw's
// colour with the lilac nucleus part, glucose the glucose part (green), the granules drawn here as pale halos round an
// orange-brown core, the insulin released the release part in the cores' tone.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.8, [-0.5, -2.4]), beta = soft(BETA), ins = deep(INSULIN)
  const c = cell(g, { x: 4, y: 6, size: 84, aspect: 0.92, pal: beta, nucleus: false, vesicles: false, id: 'beta-cell' })
  const nuc = nucleus(g, { x: 17, y: 19, size: 25, nucleolus: true })
  const G = [[-22, -6], [-8, -17], [7, -19], [-15, 7], [-26, 18], [-10, 27], [2, 3], [27, -2], [22, -20]]
  const granules = own('insulin-granules', G.map(([x, y]) => g.circle(x, y, 5.6, beta.light, beta.outline, 4)).join('') + G.map(([x, y]) => g.circle(x, y, 2.9, ins.small)).join(''), [['insulin', ins]])
  const out = release(g, { x: 31, y: -33, size: 19, turn: -45, pal: ins, spread: 70, rows: 2, id: 'insulin-release' })
  const glu = [[-41, -31], [-26, -43]].map(([x, y], i) => glucose(g, { x, y, size: 14, id: `glucose-${i + 1}` }))
  const inn = arrow(g, { points: [[-35, -20], [-29, -14], [-21, -11]], w: 7, colour: INK, id: 'glucose-uptake' })
  icon('Beta cell glucose sensing', join(c, granules, nuc, ...glu, extra(inn), out))
}

// ---------------------------------------------------------------------------------------------------------------------
// Myokine secretion: a contracting muscle fibre releases myokines (signalling proteins such as IL-6 and irisin) into
// the blood, which carries them to other organs.
// (SiliCoDraw draws a rose fibre with tendons, teal pentagons for the myokines and a pale red vessel with red blood cells.
// Here the fibre is muscle rose with lengthwise myofibrils, the myokines the growth factor part (blue dots, the set's
// secreted signals), the vessel the vessel part in pink (the set's rose lay on the muscle's); its red blood cells are
// left out, being the muscle's hue too.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.6, [0, -1.8]), mus = soft(MUSCLE), ves = soft(VESSEL), mk = soft(MYOKINE), ten = GREY
  const vs = vessel(g, { x: 0, y: -35, size: 100, thick: 0.27, ends: 'open', pal: ves, w: 9, id: 'capillary' })
  const inVessel = [[-30, -35], [-8, -35], [16, -35], [36, -35]].map(([x, y], i) => growthFactor(g, { x, y, size: 7, pal: mk, id: `myokine-in-blood-${i + 1}` }))
  const free = [[-10, -5], [3, -12], [-3, 2], [-18, -13], [8, 1]].map(([x, y], i) => growthFactor(g, { x, y, size: 7.5, pal: mk, id: `myokine-${i + 1}` }))
  const tendons = own('tendons', g.path(g.D('M-36,21.5L-47,22.5L-47,25.5L-36,26.5Z'), ten.base, ten.outline, 5) + g.path(g.D('M26,21.5L40,22.5L40,25.5L26,26.5Z'), ten.base, ten.outline, 5))
  const body = g.smooth([[-37, 24], [-29, 12], [-12, 6], [8, 6], [20, 12], [27, 24], [20, 36], [8, 42], [-12, 42], [-29, 36]])
  const fibre = own('muscle-fibre', g.path(body, 'url(#muscle-gradient)', mus.outline, 10) +
    curve(g, 'M-26,17C-10,12.5 8,12.5 18,17M-30,24L22,24M-26,31C-10,35.5 8,35.5 18,31', mus.small, 4.5) + g.hl(-16, 9.8, 10, 2.2, -6, mus.light),
  [['muscle fibre', mus]], g.grad('muscle-gradient', [-37, 6, 27, 42], mus))
  const up = arrow(g, { points: [[16, 3], [18.5, -8], [15.5, -20]], w: 7.5, colour: mk.outline, id: 'secretion' })
  icon('Myokine secretion', join(vs, ...inVessel, tendons, fibre, ...free, extra(up)))
}

check()
console.log('written to', OUT)
