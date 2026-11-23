// Eight icons of SiliCoDraw's "Molecules & genetics" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts in ../parts/:
// circulating factors and small molecules of ageing research: GDF15, adiponectin, GDF11, platelet factor 4, thyroid
// hormone (T4), circulating cell-free DNA, short-chain fatty acids and bile acids. Their compositions are read by hand from
// the source in a 100 × 100 box centred on 0,0 and scaled onto a 512 page (`page` of ../cellkit.mjs).
// One look across them: secreted proteins are lit blobs with one outline round their subunits; small molecules are the
// skeletal formulas of ../parts/formula.mjs (THYROXINE, ACETATE, PROPIONATE, BUTYRATE, CHOLIC_ACID: bonds as strokes,
// aromatic rings the glucose part's green hexagon, sterol rings pale gold, hetero atoms balls lettered with the element).
// Parts used: protein, phosphate (molecules.mjs); lipid bilayer (membranes.mjs); cell, vessel, bacterium, red blood cell,
// release, arrow, the approved Adipocyte and Platelet (`placeCellType`) (tissue.mjs); the brain (complexes.mjs, used
// twice); the nucleosome (genetics.mjs, every cfDNA fragment); the skeletal formulas (formula.mjs).
// Drawn here because no part draws them: a TGF-β-family dimer of two lobes (`lobes`), the adiponectin multimer (collagen
// stalks and globular trimers), the PF4 tetramer (`tetramer`), the stalks of single-pass receptors (`stalk`), blebs and
// nuclear fragments of a dying cell.
// Lettered (strokes, ../parts/letters.mjs): "P" on the phosphate (by the part), "I", "O" and "N" on the atoms of the
// formulas (by the formula part). Left out: no original writes more.
// Usage: node mg23.mjs <folder>
import { mkdirSync } from 'node:fs'
import { NUC, cellTypes, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex, toLch } from '../colour.mjs'
import { catmull, f, gradient2, pathOf } from '../shapes.mjs'
import { phosphate, protein } from '../parts/molecules.mjs'
import { LIGAND, PROTEIN as MEMBRANE_PROTEIN, bilayer, mergeParts } from '../parts/membranes.mjs'
import { arrow, bacterium, cell, placeCellType, redBloodCell, release, vessel } from '../parts/tissue.mjs'
import { brain } from '../parts/complexes.mjs'
import { nucleosome } from '../parts/genetics.mjs'
import { ACETATE, BUTYRATE, CHOLIC_ACID, PROPIONATE, THYROXINE, skeletal } from '../parts/formula.mjs'

const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012) are left out of the hue check, as STYLE.md says: BioSketch never recolours them with a part.
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p]) => toLch(p.base).c >= 0.012), defs, body)

// Hues (OKLCH degrees). SiliCoDraw's own colour where it can stay; moved where two parts would lie within 36°.
const GDF15 = hueOf('#3f8f9a') // SiliCoDraw's teal, 207
const ADIPONECTIN = hueOf('#4f86c0') // SiliCoDraw's blue, 251
const SMAD = 355 // rose: SiliCoDraw's pale blue lay on the receptors' hue
const PF4 = hueOf('#8a5aa8') // SiliCoDraw's purple, 311
const SMALL = 165 // small molecules: bonds and aromatic rings
const DYING = 70 // the dying cell: a pale sand, apart from the vessel's rose, the DNA's blue and the nucleus's lilac
const MICROBE = 115 // the bacterium: a yellower green than the part's 137, 50° from the bonds' green
const INK = toHex({ l: 0.5, c: 0.006, h: 250 }) // a true grey for arrows (the arrow part's own INK is a bluish slate)

const P2 = ([x, y]) => `${f(x)},${f(y)}`
const line = (pts, colour, w, cap = 'round') => `<path d="M${pts.map(P2).join(' L')}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
/** Joins the { defs, body, parts } of several parts; parts that share a palette are one (they recolour together). */
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), parts: mergeParts(ps.flatMap((p) => p.parts)) })
const icon = (name, { defs, body, parts }) => cellType(name, parts, defs, body)
/** Some drawing of this script as a part: { defs, body, parts }. */
const own = (id, body, parts, defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })
/** A drawing that belongs to a part already listed (arrows, letters, stalks): no palette of its own. */
const extra = (p) => ({ ...p, parts: [] })
/** A local frame inside g: [u, v] at x, y, scaled by s and turned by `turn` degrees, as a page point. */
const local = (g, x, y, s = 1, turn = 0) => {
  const t = (turn * Math.PI) / 180, c = Math.cos(t), sn = Math.sin(t)
  const P = ([u, v]) => g.P([x + (u * c - v * sn) * s, y + (u * sn + v * c) * s])
  // A path of absolute M, C, S, L, Q, Z commands in local units, moved onto the page.
  const D = (d) => d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, u, v) => P2(P([+u, +v])))
  return { P, D, px: s * g.k }
}
/** A closed outline of an ellipse (page points), for unions. */
const ellipsePts = (L, [u, v], rx, ry, n = 48) => Array.from({ length: n }, (_, i) => { const a = (2 * Math.PI * i) / n; return L.P([u + rx * Math.cos(a), v + ry * Math.sin(a)]) })
/** A gradient over the page box of some points. */
const boxOf = (pts) => { const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] }
/** Several closed outlines (path data) under one outline: outlines first (twice as wide), then the fills. */
const union = (ds, fill, outline, w) => ds.map((d) => `<path d="${d}" fill="${outline}" stroke="${outline}" stroke-width="${f(2 * w)}" stroke-linejoin="round"/>`).join('') + ds.map((d) => `<path d="${d}" fill="${fill}"/>`).join('')

// ---------------------------------------------------------------------------------------------------------------------
// Drawn here
// ---------------------------------------------------------------------------------------------------------------------

/** A smooth closed outline through page points (cellkit's smoothD). */
const smoothPage = (p) => {
  const n = p.length
  let d = `M${P2(p[0])}`
  for (let i = 0; i < n; i++) {
    const a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n], e = p[(i + 2) % n]
    d += `C${f(b[0] + (c[0] - a[0]) / 6)},${f(b[1] + (c[1] - a[1]) / 6)} ${f(c[0] - (e[0] - b[0]) / 6)},${f(c[1] - (e[1] - b[1]) / 6)} ${P2(c)}`
  }
  return d + 'Z'
}

/**
 * A dimer of the TGF-β family (GDF15) seen small: two oval subunits side by side under one outline, lit from the top
 * left, a line where they meet. x, y its middle, s its scale (1: 18 × 13 units), turn.
 */
const lobes = (g, { x, y, s, turn = 0, id, pal, W }) => {
  const L = local(g, x, y, s, turn)
  const outlines = [-4.3, 4.3].map((u) => pathOf(ellipsePts(L, [u, 0], 4.8, 6.6)))
  const box = boxOf(ellipsePts(L, [0, 0], 9, 6.6))
  return {
    defs: gradient2(`${id}-gradient`, box, pal.base, pal.shadow),
    body: `<g id="${id}">${union(outlines, `url(#${id}-gradient)`, pal.outline, W / 2)}${line([L.P([0, -4.2]), L.P([0, 4.2])], pal.outline, W * 0.6)}</g>`,
    parts: [],
  }
}

/** The tetramer of PF4: four balls in a square under one outline. x, y its middle, r a ball's radius (units). */
const tetramer = (g, { x, y, r, id, pal, W }) => {
  const d = r * 0.88, spots = [[-d, -d], [d, -d], [-d, d], [d, d]]
  const ds = spots.map(([u, v]) => pathOf(Array.from({ length: 40 }, (_, i) => { const a = (2 * Math.PI * i) / 40; return g.P([x + u + r * Math.cos(a), y + v + r * Math.sin(a)]) })))
  const seams = line([g.P([x, y - d * 1.5]), g.P([x, y + d * 1.5])], pal.outline, W * 0.55) + line([g.P([x - d * 1.5, y]), g.P([x + d * 1.5, y])], pal.outline, W * 0.55)
  return { defs: gradient2(`${id}-gradient`, [...g.P([x - 2 * r, y - 2 * r]), ...g.P([x + 2 * r, y + 2 * r])], pal.base, pal.shadow), body: `<g id="${id}">${union(ds, `url(#${id}-gradient)`, pal.outline, W / 2)}${seams}</g>`, parts: [] }
}

/** A rounded rectangle given in units of g (x0, y0, x1, y1), as a path on the page; r in units. */
const roundRect = (g, [x0, y0, x1, y1], r) => {
  const pts = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(g.P), R = r * g.k, n = pts.length
  const toward = (a, b, d) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]), t = Math.min(d, l / 2) / l; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] }
  let d = ''
  for (let i = 0; i < n; i++) { const a = toward(pts[i], pts[(i - 1 + n) % n], R), b = toward(pts[i], pts[(i + 1) % n], R); d += `${i ? 'L' : 'M'}${P2(a)} Q${P2(pts[i])} ${P2(b)} ` }
  return d + 'Z'
}
/** The stalk of a single-pass membrane protein across the membrane (as mg17's Klotho). */
const stalk = (g, id, x, y0, y1, pal, hw = 3) => own(id, `<path d="${roundRect(g, [x - hw, y0, x + hw, y1], hw)}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="6" stroke-linejoin="round"/>`, [], g.grad(`${id}-gradient`, [x - hw, y0, x + hw, y1], pal))


// ---------------------------------------------------------------------------------------------------------------------
// GDF15: the stress hormone (a "mitokine") reaches the brain through the blood and binds its receptor GFRAL in the area
// postrema of the hindbrain, which brings on nausea and loss of appetite.
// (SiliCoDraw draws a pink brain in section, a teal ring on the area postrema and two teal dimers carried by an arrow.
// Here the brain is the brain part (complexes.mjs), the dimers are lit lobes under one outline, the target a teal
// dot in a ring and the arrow in the dimers' outline tone. The brain's pink and the teal stay SiliCoDraw's.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.95, [0, -0.6]), pal = deep(GDF15)
  const b = brain(g, { x: 0, y: 0, size: 90, w: 10 })
  const [ax, ay] = b.at(16, 29)
  const target = own('area-postrema', g.circle(ax, ay, 7.4, 'none', pal.base, 5.5) + g.circle(ax, ay, 4.2, pal.small), [['GDF15 and GFRAL', pal]])
  const flow = arrow(g, { points: [[-46, 42], [-28, 43.5], [-8, 40], [7, 33]], colour: pal.outline, w: 9, id: 'blood-flow' })
  const dimers = [[-33, 30, -12], [-14, 24, -20]].map(([x, y, t], i) => lobes(g, { x, y, s: 1.2, turn: t, id: `GDF15-${i + 1}`, pal, W: 7 }))
  icon('GDF15', join(b, target, extra(flow), ...dimers))
}

// ---------------------------------------------------------------------------------------------------------------------
// Adiponectin: a fat cell secretes adiponectin, a bouquet of trimers: each trimer three globular heads on a collagen-like
// stalk, the stalks gathered at one base (the high-molecular-weight form).
// (SiliCoDraw draws its own fat cell; here it is the approved Adipocyte placed as it is. The multimer keeps SiliCoDraw's
// blue: pale stalks with an outline, every head three lit balls under one outline.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.34, [3.5, 0.4]), pal = deep(ADIPONECTIN)
  const fat = placeCellType(g, 'Adipocyte', { x: -17, y: 12, size: 64, id: 'adipocyte' })
  const base = [30, 8], heads = [[12, -20], [22, -33], [37, -33], [47, -20]]
  const stalks = heads.map(([x, y]) => catmull([base, [(base[0] + x) / 2 + (x < base[0] ? -1 : 1), (base[1] + y) / 2 + 2], [x, y + 5]], 10).map(g.P))
  const stalkBody = stalks.map((pts) => line(pts, pal.outline, 21)).join('') + stalks.map((pts) => line(pts, soft(ADIPONECTIN).base, 9)).join('')
  const trimers = heads.map(([x, y], k) => {
    const balls = [0, 1, 2].map((i) => { const t = i * 2.0944 - 1.5708; return pathOf(Array.from({ length: 36 }, (_, j) => { const a = (2 * Math.PI * j) / 36; return g.P([x + Math.cos(t) * 4.4 + 4.6 * Math.cos(a), y + 1 + Math.sin(t) * 4.4 + 4.6 * Math.sin(a)]) })) })
    return `<g id="adiponectin-trimer-${k + 1}">${union(balls, 'url(#adiponectin-gradient)', pal.outline, 3.5)}${line([g.P([x, y + 1]), g.P([x, y + 5.6])], pal.outline, 4)}${line([g.P([x, y + 1]), g.P([x - 3.6, y - 1.2])], pal.outline, 4)}${line([g.P([x, y + 1]), g.P([x + 3.6, y - 1.2])], pal.outline, 4)}</g>`
  }).join('')
  const knot = g.circle(base[0], base[1] + 0.5, 3.2, pal.outline)
  const multimer = own('adiponectin', `<g id="adiponectin-stalks">${stalkBody}${knot}</g>${trimers}`, [['adiponectin', pal]], `<linearGradient id="adiponectin-gradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`)
  icon('Adiponectin', join(fat, multimer))
}

// ---------------------------------------------------------------------------------------------------------------------
// GDF11: a dimer of the TGF-β family bridges its two receptors in the membrane, the type II receptor (left) and the type I
// receptor (right); the type I kinase then phosphorylates SMAD2/3 (arrow, the phosphate).
// (SiliCoDraw draws everything in tones of one blue and letters "P". Here the receptors keep the blue of membrane proteins
// (two tones, one part), GDF11 is green like every ligand, SMAD2/3 the protein part in rose and the phosphate the mustard
// part, lettered "P"; the membrane is the lipid bilayer part.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.58, [0.1, 0.5]), my = 6, T = 17
  const m = bilayer(g, { x: 0, y: my, size: 100, thick: T, id: 'membrane', gaps: [{ at: -19, width: 10 }, { at: 19, width: 10 }] })
  const typeII = MEMBRANE_PROTEIN, typeI = { ...MEMBRANE_PROTEIN, base: toHex({ l: 0.86, c: 0.07, h: hueOf(MEMBRANE_PROTEIN.base) }), shadow: toHex({ l: 0.79, c: 0.09, h: hueOf(MEMBRANE_PROTEIN.base) }) }
  const s2 = stalk(g, 'type-II-stalk', -19, -12, my + 12, typeII), s1 = stalk(g, 'type-I-stalk', 19, -12, my + 12, typeI)
  const ecd2 = protein(g, { x: -20, y: -16, size: 24, turn: -8, id: 'type-II-receptor', pal: typeII })
  const ecd1 = protein(g, { x: 20, y: -16, size: 24, turn: 14, id: 'type-I-receptor', pal: typeI })
  const k2 = protein(g, { x: -20, y: 27, size: 22, turn: 30, id: 'type-II-kinase', pal: typeII })
  const k1 = protein(g, { x: 19, y: 27, size: 22, turn: -20, id: 'type-I-kinase', pal: typeI })
  // GDF11: two wing-shaped subunits joined in the middle by a disulfide bond (a dot).
  const wing = [[1, -30], [-6, -37], [-16, -43], [-28, -42], [-34, -35], [-29, -28], [-18, -29], [-7, -26]]
  const lp = LIGAND, W = 8
  const wings = [wing.map(([u, v]) => [-u, v]), wing].map((pts) => smoothPage(pts.map(g.P)))
  const gdf = own('GDF11', `<path d="${wings[0]}" fill="url(#GDF11-right-gradient)" stroke="${lp.outline}" stroke-width="${W}" stroke-linejoin="round"/><path d="${wings[1]}" fill="url(#GDF11-gradient)" stroke="${lp.outline}" stroke-width="${W}" stroke-linejoin="round"/>` +
    g.hl(-22, -38.5, 15, 4.5, -8, lp.light) + g.circle(0, -30, 3, lp.outline), [['GDF11', lp]],
    g.grad('GDF11-gradient', [-34, -43, 1, -26], lp) + g.grad('GDF11-right-gradient', [-1, -43, 34, -26], { base: lp.shadow, shadow: toHex({ l: 0.68, c: 0.13, h: hueOf(lp.base) }) }))
  const smadPal = rich(SMAD)
  const smad = protein(g, { x: 41, y: 37, size: 16, turn: 10, id: 'SMAD2-3', pal: smadPal })
  const p = phosphate(g, { x: 43.5, y: 25.5, size: 10.5, id: 'phosphate' })
  const arr = arrow(g, { points: [[27, 36], [30, 41], [33.5, 42]], colour: INK, w: 7, head: 20, id: 'arrow' })
  icon('GDF11', join(m, extra(s2), extra(s1), ecd2, { ...ecd1, parts: [] }, { ...k2, parts: [] }, { ...k1, parts: [] }, gdf, extra(arr), smad, p))
}

// ---------------------------------------------------------------------------------------------------------------------
// Platelet factor 4 (CXCL4): an activated platelet releases PF4 tetramers from its α granules; the factor in young blood
// reaches the brain (arrow).
// (SiliCoDraw draws its own platelet with granules; here it is the approved Platelet placed as it is. The tetramers keep
// SiliCoDraw's purple, four lit balls under one outline; the brain is the brain part, as in GDF15, in its pink, not the
// pale purple of SiliCoDraw's, so that brain and factor recolour apart.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.95, [-2, -7.6]), pal = deep(PF4)
  const plt = placeCellType(g, 'Platelet', { x: -19, y: 19, size: 60, id: 'platelet' })
  const tets = [[18, 18, 4.6], [29, 3, 4.6]].map(([x, y, r], i) => tetramer(g, { x, y, r, id: `PF4-${i + 1}`, pal, W: 7 }))
  const out = release(g, { x: 8.5, y: 22, size: 9, turn: -35, spread: 70, rows: 2, pal, id: 'release' })
  const b = brain(g, { x: 22, y: -31, size: 42.3, w: 7 })
  const arr = arrow(g, { points: [[24, -6], [21, -10], [18.5, -16]], colour: INK, w: 7, head: 22, id: 'arrow' })
  icon('Platelet factor 4', join(plt, extra(out), ...tets.map((t, i) => (i ? t : { ...t, parts: [['PF4', pal]] })), extra(arr), b))
}

// ---------------------------------------------------------------------------------------------------------------------
// Thyroid hormone (T4, thyroxine, 3,5,3',5'-tetraiodothyronine): two benzene rings joined by an ether oxygen, the outer
// ring with its hydroxyl, each ring with two iodines beside its bond to the oxygen or the hydroxyl, and the alanine side
// chain (amino group, carboxyl group) on the inner ring.
// (SiliCoDraw draws the rings white with violet iodine balls lettered "I". Here the molecule is the skeletal-formula part
// (THYROXINE of formula.mjs): the rings the glucose part's green hexagon with three inner lines for their double bonds; the iodines are violet balls lettered "I",
// the oxygens red balls lettered "O", the nitrogen a blue ball lettered "N". The two rings stand a little further apart
// than SiliCoDraw's, so that the ether oxygen no longer touches an iodine.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.39, [-1.5, 0])
  icon('Thyroid hormone', skeletal(g, { x: -1.3, y: 0, size: 108, id: 'thyroxine', ...THYROXINE }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Circulating cell-free DNA: a dying (apoptotic) cell, blebbing, its nucleus broken into pieces, sheds short DNA fragments
// still wound round nucleosomes into the blood (arrow), where they circulate beside the red blood cells.
// (SiliCoDraw draws a salmon cell, a red band for the blood and a red blood cell. Here the blood vessel is the vessel part
// (rose) with the red blood cell part, the cell the cell part with blebs and lilac nuclear fragments drawn here, in a pale sand
// (its salmon lay 22° from the vessel's rose), and every fragment the nucleosome part (genetics.mjs: lilac histones, the DNA a double helix, short linkers).)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.75, [-1, -2.5]), cpal = soft(DYING)
  const v = vessel(g, { x: 0, y: 19, size: 94, thick: 0.55, ends: 'open', cells: 0, id: 'blood-vessel' })
  const rbc = redBloodCell(g, { x: 33, y: 9, size: 15, turn: 8, id: 'red-blood-cell', view: 'top' })
  const c = cell(g, { x: -26, y: -30, size: 38, id: 'dying-cell', pal: cpal, nucleus: false, vesicles: false, aspect: 0.82 })
  const blebs = own('blebs', [[-6.5, -24, 4.6], [-44.5, -19, 3.8], [-9, -43, 3.4], [-36, -47, 3]].map(([x, y, r]) => g.circle(x, y, r, cpal.base, cpal.outline, 6)).join(''), [])
  const bits = own('nuclear-fragments', [[-31, -35, 4.4], [-22, -36, 3.2], [-33, -25, 3.4], [-21, -26, 4.2], [-14, -32, 2.6]].map(([x, y, r]) => g.circle(x, y, r, NUC.small)).join(''), [['nuclear fragments', NUC]])
  const arr = arrow(g, { points: [[-1, -38], [9, -33], [14, -23], [14, -14]], colour: INK, w: 9, id: 'arrow' })
  const frags = [[-28, 22, -12], [-2, 15, 10], [24, 27, -8]].map(([x, y, t], i) => nucleosome(g, { x, y, size: 26 * 1.05, turn: t, linkers: 0.5, id: `cfDNA-${i + 1}` }))
  icon('Cell-free DNA', join(v, extra(rbc), extra(blebs), c, bits, extra(arr), ...frags))
}

// ---------------------------------------------------------------------------------------------------------------------
// Short-chain fatty acids: a gut bacterium ferments fibre and releases the short-chain fatty acids acetate (two carbons),
// propionate (three) and butyrate (four), each a short zigzag of carbon bonds ending in its carboxylate group.
// (SiliCoDraw draws the oxygens as red balls with a minus beside the charged one. Here each acid is the carboxylate of
// formula.mjs: bonds as strokes in the green of small molecules, each oxygen a red ball lettered "O", the charge a minus; the bacterium is the bacterium
// part with its flagellum, its green moved to a yellower one so that it and the bonds recolour apart.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(5.05, [-1.2, 0.5]), bpal = deep(SMALL)
  const bug = bacterium(g, { x: -33, y: 9, size: 76, turn: 90, aspect: 0.44, id: 'bacterium', pal: soft(MICROBE) })
  const out = release(g, { x: -11.5, y: 2, size: 9, spread: 80, rows: 2, pal: bpal, id: 'release' })
  const mols = [[ACETATE, 'acetate', 26.4, 27, -27], [PROPIONATE, 'propionate', 21.8, 34, 0], [BUTYRATE, 'butyrate', 17.3, 43, 27]].map(([data, id, x, size, y0]) => skeletal(g, { x, y: y0 - 5.2, size, id, ...data }))
  icon('Short-chain fatty acids', join(bug, { ...extra(out), parts: [['small molecules', bpal]] }, ...mols))
}

// ---------------------------------------------------------------------------------------------------------------------
// Bile acids: cholic acid, the main primary bile acid: the four fused rings of every sterol (as mg09's cholesterol), the
// methyl groups at C10 and C13, hydroxyl groups at C3, C7 and C12, and a side chain that ends in a carboxylic acid at C24.
// (SiliCoDraw sets the molecule on a pale green badge with red oxygen balls. The badge is left out, so the molecule is
// larger; it is CHOLIC_ACID of formula.mjs, the rings in mg09's pale gold, each oxygen a red ball lettered "O", the C=O bond double.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.6, [0, 0])
  icon('Bile acids', skeletal(g, { x: 0, y: 0, size: 100, id: 'cholic-acid', ...CHOLIC_ACID }))
}

check()
console.log('written to', OUT)
