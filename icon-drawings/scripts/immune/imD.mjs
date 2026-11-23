// Eight icons of SiliCoDraw's "Immunology & infection" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David
// Carlsson; see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts:
// T cell receptor, B cell receptor, Immune synapse, Immune checkpoint, Cytotoxic killing, Senolytic CAR-T, NK cell
// clearance of senescent cells and CD28-null T cell. Compositions read by hand from the source (the last drawing of
// each) in its 100 × 100 box centred on 0,0 and scaled onto a 512 page (`page` of ../cellkit.mjs); outlines at 60 %
// (setStrokeScale), the gloss of cells on the lymphocytes and target cells through their parts.
// Parts used: surfaceProtein, synapse, lymphocyte, targetCell, palettes RECEPTORS, B_CELL, SENESCENT, GRANZYME
// (immune.mjs); bilayer (membranes.mjs); EPI (tissue.mjs); ligand (molecules.mjs); badge, GRID (assays.mjs).
// Composed here, since `synapse` lays its two cells side by side only and the same size: `meeting`, the same build of
// synapse (lymphocyte and target cell flattened against each other, receptor and ligand pairs across the cleft,
// granules) along any slant and with cells of two sizes, for the two senolytic scenes. Drawn here because no part draws
// them: the CD3ζ dimer's tails (as tubes in the TCR's palette with ITAMs), and the empty place of CD28 (the cd28 kind
// of surfaceProtein redrawn as a dashed outline).
// Lettered: nothing (SiliCoDraw writes α and β on the TCR; letters.mjs has no Greek glyphs).
// Usage: node imD.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss } from '../cellkit.mjs'
import { deep, toLch } from '../colour.mjs'
import { f, setStrokeScale } from '../shapes.mjs'
import { B_CELL, GRANZYME, RECEPTORS, SENESCENT, T_CELL, lymphocyte, surfaceProtein, synapse, targetCell } from '../parts/immune.mjs'
import { bilayer } from '../parts/membranes.mjs'
import { EPI } from '../parts/tissue.mjs'
import { ligand } from '../parts/molecules.mjs'
import { GRID, badge } from '../parts/assays.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
const icon = (name, [k, cx, cy], draw) => {
  const g = page(k, [cx, cy]), { defs, body, parts } = draw(g)
  const seen = parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base) === i)
  kit.cellType(name, seen, defs, body)
}
const join = (...ps) => ({ defs: ps.map((p) => p.defs ?? '').join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts ?? []) })
const P2 = (p) => p.map(f).join(',')
const rad = (d) => (d * Math.PI) / 180
const strokeD = (d, colour, w, cap = 'round', extra = '') => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"${extra}/>`
const lineD = (g, pts) => `M${pts.map((p) => P2(g.P(p))).join(' L')}`

// ---------- a synapse along any slant (built as immune.mjs's synapse) ----------
// Two cells meet along the direction `angle` (degrees, clockwise from +x): the lymphocyte behind, the other cell ahead,
// both flattened where they meet, `count` pairs of receptor and ligand across the cleft, granules gathered at the
// synapse. sL, sR: the sizes of the two cells (local units of 100 = size); the rest as synapse().
function meeting(g, { x, y, size, angle = 0, id = 'synapse', pairs = 'car', count = 3, left, right, state = 'healthy', granules = true, gap = 12, sL = 50, sR = 46, spread = 26, recPal }) {
  const s = size / 100
  left ??= pairs === 'nkg2d' ? 'NK' : 'T'
  right ??= { tcr: T_CELL, car: SENESCENT, nkg2d: SENESCENT }[pairs]
  const [lk, rk] = { tcr: ['tcr', 'mhc1'], pd1: ['pd1', 'pdl1'], car: ['car', 'antigen'], nkg2d: ['nkg2d', 'mica'] }[pairs]
  const c = Math.cos(rad(angle)), sn = Math.sin(rad(angle))
  const at = (u, v) => [x + (u * c - v * sn) * s, y + (u * sn + v * c) * s]
  const rL = (left === 'NK' ? 0.47 : 0.34) * sL, rR = (state === 'dying' ? 0.38 : 0.47) * sR
  const [lx, ly] = at(-(gap / 2 + rL * 0.78), 0), [rx, ry] = at(gap / 2 + rR * 0.8, 0)
  const L = lymphocyte(g, { x: lx, y: ly, size: sL * s, kind: left, contact: 90 + angle, id: `${id}-${left === 'NK' ? 'NK-cell' : 'T-cell'}`, ...(pairs === 'car' ? { receptorPal: { outline: (recPal ?? RECEPTORS.car).outline, small: (recPal ?? RECEPTORS.car).small } } : {}) })
  const R = targetCell(g, { x: rx, y: ry, size: sR * s, pal: right, state, contact: 270 + angle, blebs: 75 + angle, id: `${id}-other-cell` })
  const ys = Array.from({ length: count }, (_, i) => (count === 1 ? 0 : -spread / 2 + (spread * i) / (count - 1)))
  const h = gap / 2 + 0.6, prot = []
  ys.forEach((v, i) => {
    const [ax, ay] = at(-gap / 2 - 0.3, v), [bx, by] = at(gap / 2 + 0.3, v)
    prot.push(surfaceProtein(g, { x: ax, y: ay, size: h * s, kind: lk, turn: 90 + angle, fat: 1.7, ...(recPal ? { pal: recPal } : {}), id: `${id}-${lk}-${i + 1}` }))
    prot.push(surfaceProtein(g, { x: bx, y: by, size: h * s, kind: rk, turn: -90 + angle, fat: 1.7, id: `${id}-${rk}-${i + 1}` }))
  })
  let extra = ''
  const parts = [...L.parts, ...R.parts, ...prot.flatMap((p) => p.parts)]
  if (granules) {
    const gr = [[-gap / 2 - 5, -7, 2.4], [-gap / 2 - 4.5, 3, 2.6], [-gap / 2 - 8.5, -1.5, 2.1], [-gap / 2 - 7.5, 9, 2], [-1, -6, 1.5], [1.5, 7, 1.4]]
    extra = `<g id="${id}-granules">${gr.map(([u, v, r]) => { const [px, py] = at(u, v); return g.circle(px, py, r * s, GRANZYME.small) }).join('')}</g>`
    parts.push(['granules', GRANZYME])
  }
  return { defs: L.defs + R.defs + prot.map((p) => p.defs).join(''), body: `<g id="${id}">${L.body}${R.body}${prot.map((p) => p.body).join('')}${extra}</g>`, parts }
}

// =====================================================================================================================
// T cell receptor: the TCR's α and β chains (each a variable and a constant domain) in the membrane, CD3εγ and CD3εδ
// beside it, and the CD3ζ dimer under it; ITAMs as dark blocks on the CD3 and ζ tails.
// (SiliCoDraw: a blue TCR, paler CD3 pairs, a pale blue membrane, α and β written on the chains. Here the TCR and its
// CD3 in the rose of immune.mjs (one palette: they recolour together), the membrane the lipid bilayer in peach.)
icon('T cell receptor', [5.0, 0, -1], (g) => {
  const top = -2, th = 15, my = top + th / 2, pal = RECEPTORS.tcr
  const mem = bilayer(g, { x: 0, y: my, size: 92, thick: th, gaps: [{ at: -25, width: 11, band: true }, { at: 0, width: 15, band: true }, { at: 25, width: 11, band: true }] })
  const tcr = surfaceProtein(g, { x: 0, y: top, size: 48, kind: 'tcr', tail: 40, fat: 1.3, id: 'TCR' })
  // CD3: εγ on the left, εδ on the right, each the cd3 kind (a pair of single domains) with its tails and ITAMs.
  const cds = [[-25, 'CD3-epsilon-gamma'], [25, 'CD3-epsilon-delta']].map(([x, id]) => surfaceProtein(g, { x, y: top, size: 50, kind: 'cd3', tail: 74, itams: true, id }))
  // CD3ζ: two tails with three ITAMs each, between the TCR's chains (tubes and blocks as the part draws them).
  const sc = 48 / 100, T = 4.5 * sc * g.k * 0.8, wO = 3.6
  const zx = [-2.2, 2.2], z0 = top + 1, z1 = top + 36
  let z = zx.map((x) => strokeD(lineD(g, [[x, z0], [x, z1]]), pal.outline, T + 2 * wO)).join('') + zx.map((x) => strokeD(lineD(g, [[x, z0], [x, z1]]), pal.small, T)).join('')
  z += zx.map((x) => [0.55, 0.72, 0.89].map((t) => { const y = top + 36 * t; return `<rect x="${f(g.X(x) - T * 0.6)}" y="${f(g.Y(y) - T * 0.75)}" width="${f(T * 1.2)}" height="${f(T * 1.5)}" rx="${f(T * 0.3)}" fill="${pal.outline}"/>` }).join('')).join('')
  const zeta = { defs: '', body: `<g id="CD3-zeta">${z}</g>`, parts: [] }
  return join(mem, zeta, ...cds, tcr)
})

// =====================================================================================================================
// B cell receptor: membrane immunoglobulin (heavy and light chains) in the membrane, antigen held by both arms, and the
// signalling heterodimers Igα/Igβ (CD79a, CD79b) beside it with ITAMs on their tails.
// (SiliCoDraw: a blue receptor on a pale blue membrane, dark hexagons for the antigen. Here the BCR in the antibody
// amber of immune.mjs (molecules.mjs's antibody on a stalk), the membrane in the B cell's green (the lipid peach lies 22°
// from the amber), Igα/Igβ in the TCR's rose (the CD3 of the B cell), the antigen a blue ligand (deep 250): green, the
// usual colour of an antigen, would lie 7° from the membrane.)
const ANTIGEN = deep(250)
const IGAB = RECEPTORS.cd3
icon('B cell receptor', [5.0, 0, -2], (g) => {
  const top = 5, th = 15
  const mem = bilayer(g, { x: 0, y: top + th / 2, size: 92, thick: th, pal: B_CELL, gaps: [{ at: -20, width: 9, band: true }, { at: 0, width: 6, band: true }, { at: 20, width: 9, band: true }] })
  const size = 48, bcr = surfaceProtein(g, { x: 0, y: top, size, kind: 'bcr', tail: 40, id: 'BCR' })
  const ig = [[-20, 'Ig-alpha-beta-1'], [20, 'Ig-alpha-beta-2']].map(([x, id]) => surfaceProtein(g, { x, y: top, size: 44, kind: 'cd3', pal: IGAB, tail: 80, itams: true, fat: 0.85, id }))
  // the antigen just beyond the tips of both Fab arms (worked out as surfaceProtein places molecules.mjs's antibody)
  const S = size / 0.98, cy = top - 0.48 * S - 0.06 * size, tip = [0.3 * S, cy - 0.36 * S]
  const ag = [-1, 1].map((k, i) => ligand(g, { x: k * (tip[0] + 3.6), y: tip[1] - 4.8, size: 9, pal: ANTIGEN, id: `antigen-${i + 1}` }))
  return join(mem, ...ig, bcr, ...ag)
})

// =====================================================================================================================
// Immune synapse: a T cell meets an antigen-presenting cell; TCRs bind MHC with its peptide across the cleft.
// (SiliCoDraw: a blue T cell flattened against a green dendritic-looking cell, three pairs of blocks with an orange
// peptide. Here immune.mjs's synapse with TCR and MHC class I, the APC in its convention's colour.)
icon('Immune synapse', [5.09, 2.6, 0], (g) => synapse(g, { x: 0, y: 0, size: 100, pairs: 'tcr', id: 'synapse' }))

// =====================================================================================================================
// Immune checkpoint: PD-1 on a T cell bound by PD-L1 on a tumour cell, and a blocking antibody in the cleft.
// (SiliCoDraw: the same, with one pair and an antibody drawn as a Y. Here immune.mjs's synapse with PD-1 and PD-L1 and
// its checkpoint blockade.)
icon('Immune checkpoint', [5.09, 2.6, -3], (g) => synapse(g, { x: 0, y: 0, size: 100, pairs: 'pd1', block: true, id: 'checkpoint' }))

// =====================================================================================================================
// Cytotoxic killing: a cytotoxic T cell recognises an infected or tumour cell (TCR and MHC class I) and releases its
// granules (perforin, granzymes) into the synapse; the target dies, with blebs and a broken nucleus.
// (SiliCoDraw: a blue cell with granules beside a pink blebbing cell. Here immune.mjs's synapse; the target in the peach
// of tissue cells (tissue.mjs's EPI), since the tumour rose lies 20° from the TCR's rose.)
icon('Cytotoxic killing', [5.28, 1, 0], (g) => synapse(g, { x: 0, y: 0, size: 100, pairs: 'tcr', right: EPI, state: 'dying', granules: true, id: 'killing' }))

// =====================================================================================================================
// Senolytic CAR-T: a CAR-T cell (small, upper left) binds a senescent cell (large, flat, lower right) through its
// chimeric receptors and the antigen on it (uPAR), releases its granules, and the senescent cell dies with blebs.
// (SiliCoDraw: the same composition. Here built from immune.mjs's parts along the diagonal (`meeting`); the CAR and the
// T cell's knobs in the TCR's rose, since the CAR amber lies 22° from the senescent cell's peach.)
icon('Senolytic CAR-T', [4.85, 11.2, 5.8], (g) => meeting(g, { x: 0, y: 0, size: 100, angle: 38, pairs: 'car', state: 'dying', sL: 46, sR: 72, spread: 24, recPal: RECEPTORS.tcr, id: 'senolysis' }))

// =====================================================================================================================
// NK cell clearance of senescent cells: an NK cell (teal, granules) binds MICA on a senescent cell through NKG2D and
// kills it.
// (SiliCoDraw: a violet NK cell upper left, a large beige senescent cell with blebs. Here `meeting` with NKG2D and MICA;
// the NK cell in the approved NK cell's teal.)
icon('NK cell clearance of senescent cells', [4.65, 8.8, 3.9], (g) => meeting(g, { x: 0, y: 0, size: 100, angle: 38, pairs: 'nkg2d', state: 'dying', sL: 46, sR: 72, spread: 24, id: 'clearance' }))

// =====================================================================================================================
// CD28-null T cell: a T cell whose surface lacks the co-stimulatory receptor CD28 (its place an empty dashed outline);
// it carries NK receptors (NKG2D) instead and cytotoxic granules, and a red badge with a cross says "null".
// (SiliCoDraw: a blue cell with receptor blocks round it, one missing as a dashed ghost, red granules, a red badge. Here
// the receptors are NKG2D (immune.mjs), which CD28-null cells gain; the granules the cytotoxic purple; the badge
// assays.mjs's.)
icon('CD28-null T cell', [5.45, -2.5, 2], (g) => {
  const cx = -6, cy = 6, size = 56, R = 0.47 * size // the cell's body without receptors
  const cellP = lymphocyte(g, { x: cx, y: cy, size, kind: 'T', receptors: false, id: 'T-cell' })
  const on = (a, r) => [cx + Math.sin(rad(a)) * r, cy - Math.cos(rad(a)) * r]
  const angles = [-140, -100, -65, 10, 45, 80, 115, 150, 185, 220]
  const recs = angles.map((a, i) => { const [x, y] = on(a, R - 0.8); return surfaceProtein(g, { x, y, size: 15, kind: 'nkg2d', turn: a, id: `NKG2D-${i + 1}` }) })
  // the empty place of CD28 at -28°: the cd28 kind of surfaceProtein redrawn as a dashed grey outline without fill
  const [gx, gy] = on(-28, R - 0.8)
  const ghost0 = surfaceProtein(g, { x: gx, y: gy, size: 16, kind: 'cd28', turn: -28, id: 'CD28-missing-outline' })
  const dash = f(g.k * 1.1), dashed = `stroke="${GRID}" stroke-width="4" stroke-dasharray="${dash} ${dash}"`
  const ghostBody = ghost0.body.replace(/(<path d="[^"]+" fill="none") stroke="[^"]+" stroke-width="[\d.]+"/g, `$1 ${dashed}`)
    .replace(/<ellipse ([^>]*?)fill="[^"]+"(?: stroke="[^"]+" stroke-width="[\d.]+")?([^>]*)\/>/g, `<ellipse $1fill="none" ${dashed}$2/>`)
  const ghost = { defs: '', body: `<g id="CD28-missing">${ghostBody}</g>`, parts: [] }
  const gran = { defs: '', body: `<g id="granules">${[-150, -105, -60, 150, 115, 190].map((a) => { const [x, y] = on(a + 180 - 180, 21.5); return g.circle(x, y, 2.1, GRANZYME.small) }).join('')}</g>`, parts: [['granules', GRANZYME]] }
  const b = badge(g, { x: 28, y: -30, size: 22, mark: 'cross', id: 'null' })
  return join(...recs, ghost, cellP, gran, b)
})

check()
console.log('written')
