// Eight icons of SiliCoDraw's "Cells & tissues" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts in ../parts/:
// fat in ageing muscle, brown and senescent fat cells, γ-H2AX foci of DNA damage, autophagic flux read by LC3, TFEB
// going into the nucleus, the acid lysosome and its V-ATPase, and the integrated stress response. Their compositions are
// read by hand from the source in a 100 × 100 box centred on 0,0 and scaled onto a 512 page (`page` of ../cellkit.mjs).
// Parts used: nucleus, lysosome, lipid droplet, mitochondrion (the owner's), ribosome (organelles.mjs); protein,
// phosphate, ion (molecules.mjs); DNA (molecules.mjs); arrows, inhibition, release, the approved Adipocyte placed
// (tissue.mjs); letters (letters.mjs).
// Drawn here because no part draws them: muscle fascicles in section (`fascicle`), heat (`heat`), γ-H2AX foci
// (`focus`), an autophagosome (`autophagosome`), LC3 dots, a western blot (`blot`), the V-ATPase (`vAtpase`), a
// bilobed kinase (two protein parts, `kinase`).
// Lettered (strokes, ../parts/letters.mjs): "P" on every phosphate (by the part), "H+" on the protons in the lysosome,
// "−" and "+" over the lanes of the blot (without and with a blocker of the lysosome). Nothing else is written in the
// originals.
// Usage: node ct14.mjs <folder>
import { mkdirSync } from 'node:fs'
import { NUC, cellTypes, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex, toLch } from '../colour.mjs'
import { f } from '../shapes.mjs'
import { lipidDroplet, lysosome, mitochondrion, nucleus, ribosome } from '../parts/organelles.mjs'
import { dna, ion, phosphate, protein } from '../parts/molecules.mjs'
import { PROTEIN as MEMBRANE_PROTEIN, mergeParts } from '../parts/membranes.mjs'
import { INK, arrow, cellW, inhibition, placeCellType, release } from '../parts/tissue.mjs'
import { lettering } from '../parts/letters.mjs'
import { MITO } from '../mitokit.mjs'

const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const { cellType, check } = cellTypes(OUT)

// Hues (OKLCH degrees). SiliCoDraw's own colour where it can stay; moved where two parts would lie within 36°.
const MUSCLE = 15 // muscle rose of the set (SiliCoDraw #d98a8a, 20°)
const FAT = hueOf('#fde68a') // the neutral lipid of the lipid droplet part (96°)
const BROWN_FAT = 110 // the droplets of a brown fat cell: moved 12° towards lemon, 38° clear of its tan cytoplasm
const BROWN = 72 // a brown fat cell's cytoplasm: SiliCoDraw's #f0d2b4 (67°) moved to 72°, 38° from the mitochondrion (34°)
const FOCUS = hueOf('#3fae6a') // γ-H2AX green (153°)
const LC3 = 150 // LC3 green, as in mg21
const AUTOPHAGOSOME = 200 // the aqua of the vesicles and of mg21's phagophore (SiliCoDraw: a pale lilac, the nucleus's)
const TFEB = hueOf('#2f9e8f') // SiliCoDraw's teal (182°)
const KINASE = 230 // the four stress kinases (SiliCoDraw: tan, which lies within 36° of the phosphate and the ribosome)
const SASP = 245 // secreted signals: the blue dots of the set (SiliCoDraw: purple, the nucleus's lilac in the placed cell)
const EIF2 = 150 // eIF2 green: it carries the phosphate (a protein that carries an amber tag is green, as in mg01)
// Greys (chroma below 0.012) are left out of the hue check.
const GREY = { light: toHex({ l: 0.985, c: 0, h: 0 }), base: toHex({ l: 0.95, c: 0.004, h: 250 }), shadow: toHex({ l: 0.9, c: 0.006, h: 250 }), small: toHex({ l: 0.72, c: 0.007, h: 250 }), outline: toHex({ l: 0.55, c: 0.008, h: 250 }) }

const P2 = ([x, y]) => `${f(x)},${f(y)}`
const boxGrad = (id, pal) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`
/** Joins the { defs, body, parts } of several parts; parts that share a palette are one (they recolour together). */
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), parts: mergeParts(ps.flatMap((p) => p.parts)) })
const icon = (name, { defs, body, parts }) => cellType(name, parts, defs, body)
/** Some drawing of this script as a part: { defs, body, parts }. */
const own = (id, body, parts, defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })
/** A drawing that belongs to a part already listed (arrows, letters): no palette of its own. */
const extra = (p) => ({ ...p, parts: [] })
/** A rounded rectangle in units of g (x0, y0, x1, y1), r in units, as a path on the page. */
const rrect = (g, [x0, y0, x1, y1], r) => {
  const [a, b] = g.P([x0, y0]), [c, d] = g.P([x1, y1]), R = r * g.k
  return `M${f(a + R)},${f(b)} H${f(c - R)} A${f(R)},${f(R)} 0 0 1 ${f(c)},${f(b + R)} V${f(d - R)} A${f(R)},${f(R)} 0 0 1 ${f(c - R)},${f(d)} H${f(a + R)} A${f(R)},${f(R)} 0 0 1 ${f(a)},${f(d - R)} V${f(b + R)} A${f(R)},${f(R)} 0 0 1 ${f(a + R)},${f(b)} Z`
}

// ---------------------------------------------------------------------------------------------------------------------
// Drawn here
// ---------------------------------------------------------------------------------------------------------------------

/** Muscle fascicles in section (several outlines given as points), one gradient that lights each from its top left. */
const fascicles = (g, { shapes, id, pal }) => {
  const w = 6
  const body = shapes.map((p, i) => {
    const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]), x0 = Math.min(...xs), y0 = Math.min(...ys), x1 = Math.max(...xs), y1 = Math.max(...ys)
    const r = Math.min(x1 - x0, y1 - y0)
    const shine = r * g.k > 120 ? g.hl(x0 + (x1 - x0) * 0.3, y0 + (y1 - y0) * 0.25, f((x1 - x0) * g.k * 0.13), f(r * g.k * 0.045), -25, pal.light) : ''
    return `<path d="${g.smooth(p)}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="${w}" stroke-linejoin="round"/>${shine}`
  }).join('')
  return own(id, body, [['muscle', pal]], boxGrad(`${id}-gradient`, pal))
}

/** Heat rising: wavy lines going up from x, y (units of g), `n` of them side by side. */
const heat = (g, { x, y, n = 3, len = 16, gap = 7, colour, w = 9, id = 'heat', turn = 0 }) => {
  const lines = Array.from({ length: n }, (_, i) => {
    const x0 = x + (i - (n - 1) / 2) * gap, y0 = y + (i === 1 ? -3 : 0), steps = 24
    const pts = Array.from({ length: steps + 1 }, (_, j) => { const t = j / steps; return g.P([x0 + 2.2 * Math.sin(t * Math.PI * 3), y0 - t * len]) })
    return `<path d="M${pts.map(P2).join(' L')}" fill="none" stroke="${colour}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`
  }).join('')
  const [cx, cy] = g.P([x, y - len / 2])
  return { defs: '', body: `<g id="${id}"${turn ? ` transform="rotate(${turn} ${f(cx)} ${f(cy)})"` : ''}>${lines}</g>`, parts: [] }
}

/** A focus of γ-H2AX: a green dot with a pale halo (the stain spreading along the chromatin round a break). */
const foci = (g, { list, id, pal }) => {
  const halos = list.map(([x, y, r]) => g.circle(x, y, r * 1.55, pal.base)).join('')
  const dots = list.map(([x, y, r]) => g.circle(x, y, r, `url(#${id}-gradient)`, pal.outline, 5) + g.hl(x - r * 0.38, y - r * 0.4, f(r * g.k * 0.3), f(r * g.k * 0.14), -40, pal.light)).join('')
  const grad = `<linearGradient id="${id}-gradient" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox"><stop offset="0" stop-color="${pal.small}"/><stop offset="1" stop-color="${toHex({ ...toLch(pal.small), l: 0.6 })}"/></linearGradient>`
  return own(id, `<g id="${id}-halos">${halos}</g><g id="${id}-dots">${dots}</g>`, [['γ-H2AX', pal]], grad)
}

/** An autophagosome: two membranes round a lumen (a thick outer line, a pale band, the inner line), aqua. */
const autophagosome = (g, { x, y, r, id, pal }) => {
  const w = 9
  return own(id,
    `${g.circle(x, y, r, pal.light, pal.outline, w)}${g.circle(x, y, r * 0.76, `url(#${id}-gradient)`, pal.outline, w * 0.8)}` +
      g.hl(x - r * 0.76 * 0.42, y - r * 0.76 * 0.45, f(r * 0.76 * g.k * 0.24), f(r * 0.76 * g.k * 0.1), -45, pal.light),
    [['autophagosome', pal]], g.grad(`${id}-gradient`, [x - r, y - r, x + r, y + r], pal))
}

/** Flat dots of a protein (LC3) at a list of points; `r` in units. */
const dotsOf = (g, { list, r, id, pal, name }) => own(id, list.map(([x, y]) => g.circle(x, y, r, pal.small)).join(''), [[name, pal]])

/** The V-ATPase across a membrane at x, y (the middle of its V0 ring), its V1 head above. In units of g. */
const vAtpase = (g, { x, y, id, pal }) => {
  const w = 6
  const ring = `<path d="${rrect(g, [x - 13, y - 6, x + 13, y + 6], 4.5)}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="${w}"/>` +
    g.line([[x - 4.5, y - 3.5], [x - 4.5, y + 3.5]], pal.small, 4) + g.line([[x + 4.5, y - 3.5], [x + 4.5, y + 3.5]], pal.small, 4)
  const stalk = `<path d="${rrect(g, [x - 2.8, y - 15, x + 2.8, y - 4], 1.8)}" fill="${pal.shadow}" stroke="${pal.outline}" stroke-width="${w}"/>`
  const side = `<path d="M${P2(g.P([x + 11, y - 6]))} C${P2(g.P([x + 16, y - 14]))} ${P2(g.P([x + 16, y - 22]))} ${P2(g.P([x + 9, y - 25]))}" fill="none" stroke="${pal.outline}" stroke-width="${w}" stroke-linecap="round"/>`
  const lobes = [[-8.5, -20.5], [8.5, -20.5], [0, -24.5]].map(([u, v]) => g.circle(x + u, y + v, 7.2, `url(#${id}-gradient)`, pal.outline, w)).join('')
  return own(id, `<g id="${id}-peripheral-stalk">${side}</g><g id="${id}-V0">${ring}${stalk}</g><g id="${id}-V1">${lobes}${g.hl(x - 3, y - 29, f(2.6 * g.k), f(1 * g.k), -30, pal.light)}</g>`,
    [['V-ATPase', pal]], boxGrad(`${id}-gradient`, pal))
}

/** A western blot: a pale membrane, two lanes, the LC3-I band (grey) above the LC3-II band (green) in each lane. */
const blot = (g, { box: [x0, y0, x1, y1], lanes, id, pal }) => {
  const panel = `<path d="${rrect(g, [x0, y0, x1, y1], 4)}" fill="url(#${id}-panel-gradient)" stroke="${GREY.outline}" stroke-width="7"/>`
  const band = (cx, cy, wide, high, colour) => `<path d="${rrect(g, [cx - wide / 2, cy - high / 2, cx + wide / 2, cy + high / 2], high / 2)}" fill="${colour}"/>`
  const bands = lanes.map(({ x, ii }) => band(x, y0 + (y1 - y0) * 0.5, 20, 4.6, GREY.small) + band(x, y0 + (y1 - y0) * 0.75 + (ii - 4) * 0.1, 20, ii, ii > 5 ? pal.outline : pal.small)).join('')
  const marks = lanes.map(({ x, sign }) => lettering(g, { x, y: y0 + (y1 - y0) * 0.22, h: 8.5, text: sign, colour: GREY.outline, id: `${id}-${sign === '+' ? 'plus' : 'minus'}`, w: 8 }).body).join('')
  return own(id, `<g id="${id}-membrane">${panel}</g><g id="${id}-signs">${marks}</g><g id="${id}-bands">${bands}</g>`, [['LC3', pal]],
    `<linearGradient id="${id}-panel-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GREY.light}"/><stop offset="1" stop-color="${GREY.base}"/></linearGradient>`)
}

/** A kinase of two lobes (the N lobe above, the C lobe below), each a protein part of one palette. */
const kinase = (g, { x, y, size, id, pal, turn = 0 }) => {
  const t = (turn * Math.PI) / 180, at = (u, v) => [x + u * Math.cos(t) - v * Math.sin(t), y + u * Math.sin(t) + v * Math.cos(t)]
  const [a, b] = [at(-size * 0.26, 0), at(size * 0.24, 0)]
  return join(protein(g, { x: a[0], y: a[1], size: size * 0.58, id: `${id}-N-lobe`, pal, turn: turn + 20 }), protein(g, { x: b[0], y: b[1], size: size * 0.5, id: `${id}-C-lobe`, pal, turn: turn - 40 }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Muscle fat infiltration (myosteatosis): a muscle in section whose fascicles lie in fat that has spread between them,
// with small lipid droplets inside the fibres too.
// (SiliCoDraw: rose fascicles in yellow fat, a yellow dot in each. Here the fascicles are the muscle rose of the set, the
// fat the neutral lipid's yellow of the lipid droplet part, and the dots lipid droplets (the part, small), two in the
// larger fascicles. The outer edge is the fat's own outline, not the muscle's.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.95, [0, 0.5])
  const fat = rich(FAT), muscle = soft(MUSCLE)
  const outline = [[-46, 0], [-40, -24], [-20, -40], [6, -42], [30, -34], [45, -14], [46, 10], [34, 32], [12, 43], [-14, 42], [-36, 30]]
  const bed = own('fat', `<path d="${g.smooth(outline)}" fill="url(#fat-gradient)" stroke="${fat.outline}" stroke-width="12" stroke-linejoin="round"/>` +
    g.hl(-24, -28, f(16 * g.k * 0.6), f(3 * g.k * 0.6), -35, fat.light), [['fat', fat]], g.grad('fat-gradient', [-46, -42, 46, 43], fat))
  const shapes = [[[-38, -4], [-34, -22], [-20, -33], [-10, -24], [-12, -8], [-24, -2]], [[-6, -30], [6, -37], [26, -30], [30, -18], [16, -12], [-4, -16]], [[20, -6], [34, -14], [41, 0], [38, 14], [26, 16], [18, 6]], [[-38, 6], [-24, 4], [-14, 10], [-16, 24], [-28, 30], [-38, 20]], [[-8, -4], [10, -6], [14, 8], [6, 18], [-8, 18], [-10, 6]], [[-8, 26], [2, 24], [18, 24], [24, 34], [10, 38], [-6, 36]], [[22, 22], [32, 20], [36, 26], [28, 32]]]
  const muscleP = fascicles(g, { shapes, id: 'fascicles', pal: muscle })
  const drops = [[-24, -18, 5.4], [12, -24, 5], [30, 3, 5.2], [-28, 16, 5], [2, 6, 5.6], [8, 31, 4.6], [-19, -10, 3.6], [-6, -24, 3.4], [-22, 23, 3.4]]
    .map(([x, y, s], i) => lipidDroplet(g, { x, y, size: s, id: `lipid-droplet-${i + 1}`, pal: fat, perilipin: false }))
  icon('Muscle fat infiltration', join(bed, muscleP, ...drops))
}

// ---------------------------------------------------------------------------------------------------------------------
// Brown adipocyte: a brown fat cell, its fat in many small droplets (multilocular), a round nucleus in the middle,
// packed with mitochondria (whose UCP1 makes heat).
// (SiliCoDraw: a tan cell, eleven white droplets, a brown nucleus, nine striped brown mitochondria, brown heat waves.
// Here the droplets are the lipid droplet part (yellow, a little more lemon than usual: see BROWN_FAT), the nucleus
// the lilac nucleus, the mitochondria the owner's, and the heat three wavy strokes in the cell's outline tone. The cell
// keeps SiliCoDraw's tan, which the lipid droplet's peach rim would join, so the droplets' rim is their own yellow.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.75, [-1.5, -3.5])
  const cyto = soft(BROWN), fat = rich(BROWN_FAT)
  const cx = -4, cy = 6, pts = []
  for (let i = 0; i < 14; i++) { const t = (i / 14) * 2 * Math.PI, r = 39 + 2.2 * Math.sin(3 * t + 0.6) + 1.2 * Math.cos(5 * t); pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t) * 0.97]) }
  const body = own('cell', `<path d="${g.smooth(pts)}" fill="url(#cell-gradient)" stroke="${cyto.outline}" stroke-width="12" stroke-linejoin="round"/>` +
    g.hl(-26, -22, f(11 * g.k * 0.6), f(3 * g.k * 0.6), -40, cyto.light), [['cytoplasm', cyto]], g.grad('cell-gradient', [-44, -34, 36, 46], cyto))
  const drops = [[-24, -12, 8.5], [-6, -21, 7.5], [12, -17, 8], [25, -2, 7], [-29, 9, 7], [-17, 26, 8], [2, 30, 7], [19, 23, 7.5], [-14, -1, 5], [14, 3, 5]]
    .map(([x, y, r], i) => lipidDroplet(g, { x, y, size: r * 1.6, id: `lipid-droplet-${i + 1}`, pal: fat, lipidPal: fat }))
  const nuc = nucleus(g, { x: -1, y: 9, size: 17, nucleolus: true })
  const mitos = [[-1, -6, -10], [-30, -1, 80], [-6, 18, 20], [11, 13, -60], [23, -15, -40], [4, -27, 10], [-22, 16, 60], [10, 32, 0], [-30, 21, 100], [27, 11, 80]]
    .map(([x, y, t], i) => mitochondrion(g, { x, y, size: 15, turn: t, id: `mitochondrion-${i + 1}` }))
  const warm = heat(g, { x: 30, y: -32, n: 3, len: 15, gap: 7, colour: cyto.outline, w: 8 })
  icon('Brown adipocyte', join(body, ...drops, nuc, ...mitos, warm))
}

// ---------------------------------------------------------------------------------------------------------------------
// Senescent adipocyte: a fat cell that has stopped dividing and secretes the senescence-associated secretory
// phenotype (SASP).
// (SiliCoDraw: a fat cell with a squashed purple nucleus full of dark foci, a few blue granules on its rim and six
// purple SASP factors leaving at the top right. Here the cell is the approved Adipocyte, placed, the SASP the release
// part (blue dots, as every secreted signal of the set), and the granules the blue dots the approved Senescent cell
// carries, on the thick lower part of the rim.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const GRANULES = [[-39.5, -5], [-39.5, 7], [-37.5, 19], [-30, 30], [-18, 37.5], [-5, 39.5], [8, 38]]
  const g = page(4.7, [2.5, -3.8])
  const fat = placeCellType(g, 'Adipocyte', { x: -7, y: 7, size: 76, id: 'adipocyte' })
  const sasp = release(g, { x: 32, y: -32, size: 30, turn: -45, rows: 3, pal: deep(SASP) })
  const granules = dotsOf(g, { list: GRANULES, r: 2.3, id: 'granules', pal: deep(SASP), name: 'granules' })
  icon('Senescent adipocyte', join(fat, granules, sasp))
}

// ---------------------------------------------------------------------------------------------------------------------
// γ-H2AX foci: a nucleus with foci of phosphorylated histone H2AX, each marking a double-strand break, as an
// immunofluorescence stain shows them.
// (SiliCoDraw: a pale blue nucleus with eight green foci, each with a pale halo. Here the nucleus is the lilac nucleus
// part with its chromatin, the foci SiliCoDraw's green.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.95, [0, 0])
  const nuc = nucleus(g, { x: 0, y: 0, size: 92, oval: 0.92, chromatin: true })
  const F = [[-24, -16, 5.6], [0, -27, 5], [23, -15, 5.8], [31, 7, 5], [12, 22, 5.8], [-13, 24, 5.2], [-30, 6, 5.4], [-4, 1, 4.8]]
  icon('Gamma-H2AX foci', join(nuc, foci(g, { list: F, id: 'foci', pal: deep(FOCUS) })))
}

// ---------------------------------------------------------------------------------------------------------------------
// Autophagic flux (LC3): an autophagosome, studded with LC3 and holding a mitochondrion, fuses with a lysosome and its
// contents are broken down; below, the western blot that measures the flux: the LC3-II band is stronger when the
// lysosome is blocked (+, bafilomycin) than without (−).
// (SiliCoDraw: a lilac autophagosome with an oval cargo and green dots, an arrow, a small lysosome joining, a grey
// autolysosome with fragments, and a blot panel with "−" and "+" drawn as strokes. Here the autophagosome is aqua (the
// lilac is the nucleus's), its cargo the owner's mitochondrion, the lysosome and autolysosome the lysosome part, LC3
// green, the blot grey with "−" and "+" lettered.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.78, [-1, -1])
  const lc3 = deep(LC3)
  const ap = autophagosome(g, { x: -25, y: -20, r: 19, id: 'autophagosome', pal: soft(AUTOPHAGOSOME) })
  const cargo = mitochondrion(g, { x: -25, y: -20, size: 20, turn: -25, id: 'cargo-mitochondrion' })
  const ring = [0, 52, 104, 156, 208, 260, 312].map((d) => { const t = ((d - 20) * Math.PI) / 180; return [-25 + 19 * Math.cos(t), -20 + 19 * Math.sin(t)] })
  const lc3Dots = dotsOf(g, { list: [...ring, [24, -13], [35, -22]], r: 3.1, id: 'LC3', pal: lc3, name: 'LC3' })
  const flow = extra(arrow(g, { points: [[-3, -20], [9, -20]], colour: INK, w: 9, id: 'arrow' }))
  const lyso = lysosome(g, { x: 3, y: -38, size: 13, id: 'lysosome' })
  const join_ = extra(arrow(g, { points: [[3, -30.5], [3, -24]], colour: INK, w: 6, id: 'fusion-arrow' }))
  const auto = lysosome(g, { x: 30, y: -18, size: 34, id: 'autolysosome' })
  const wb = blot(g, { box: [-40, 7, 40, 45], lanes: [{ x: -19, sign: '-', ii: 3.4 }, { x: 19, sign: '+', ii: 7 }], id: 'blot', pal: lc3 })
  icon('Autophagic flux', join(ap, cargo, auto, lyso, lc3Dots, flow, join_, wb))
}

// ---------------------------------------------------------------------------------------------------------------------
// TFEB nuclear translocation: TFEB, kept phosphorylated in the cytoplasm at the lysosome, loses its phosphate and moves
// into the nucleus, where it binds DNA and switches on the genes of lysosomes and autophagy.
// (SiliCoDraw: a blue nucleus with a dashed envelope and wavy DNA, a teal TFEB on it, a grey lysosome with enzymes, a
// teal TFEB beside it with a "P" leaving, and an arrow into the nucleus. Here the nucleus is the lilac nucleus part with
// pores, the DNA the DNA part, TFEB the protein part in SiliCoDraw's teal, the lysosome the lysosome part, the
// phosphate the phosphate part with its "P".)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.85, [0, -1])
  const teal = soft(TFEB)
  const nuc = nucleus(g, { x: 16, y: -14, size: 64, pores: true })
  const helix = dna(g, { x: 16, y: 2, size: 46, width: 9, turns: 2.5, flat: true })
  const inside = protein(g, { x: 16, y: -7, size: 17, id: 'TFEB-nuclear', pal: teal })
  const lyso = lysosome(g, { x: -24, y: 28, size: 38, id: 'lysosome' })
  const outside = protein(g, { x: -34, y: -4, size: 16, id: 'TFEB-cytoplasmic', pal: teal, turn: 40 })
  const p = phosphate(g, { x: -42, y: -22, size: 11, id: 'phosphate' })
  const off = extra({ defs: '', body: `<g id="phosphate-leaving">${g.line([[-38.5, -14], [-40, -16.5]], INK, 5)}</g>`, parts: [] })
  const move = extra(arrow(g, { points: [[-27, -12], [-20, -20], [-8, -21]], colour: INK, w: 9, id: 'arrow' }))
  icon('TFEB nuclear translocation', join(nuc, helix, inside, lyso, outside, p, off, move))
}

// ---------------------------------------------------------------------------------------------------------------------
// Lysosomal pH (V-ATPase): the V-ATPase in the lysosome's membrane pumps protons in, which keeps the lumen acid
// (about pH 4.5).
// (SiliCoDraw: a lilac lysosome with a dashed inner line, a grey V-ATPase on top (three-lobed V1 head, stalk, V0 ring),
// an arrow down and seven red protons marked "+". Here the lysosome is the lysosome part (rose) without contents, the
// V-ATPase drawn here in the blue of the membrane proteins, the protons the ions of the set lettered "H+".)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.5, [0, -5])
  const lyso = lysosome(g, { x: 0, y: 10, size: 72, contents: false, enzymes: false })
  const pump = vAtpase(g, { x: 0, y: -24.5, id: 'V-ATPase', pal: MEMBRANE_PROTEIN })
  const H = [[-18, -2], [17, -3], [-25, 17], [0, 10], [23, 17], [-11, 31], [12, 31]]
  const protonPal = deep(165)
  const protons = H.map(([x, y], i) => ion(g, { x, y, size: 12, id: `proton-${i + 1}` }))
  const letters = H.map(([x, y], i) => extra({ defs: '', body: lettering(g, { x: x - 0.2, y, h: 4.6, text: 'H+', colour: protonPal.light, id: `proton-${i + 1}-letters`, w: 4 }).body, parts: [] }))
  const inward = extra(arrow(g, { points: [[0, -15], [0, -4]], colour: protonPal.outline, w: 8, id: 'arrow' }))
  icon('Lysosomal pH', join(lyso, pump, ...protons, ...letters, inward))
}

// ---------------------------------------------------------------------------------------------------------------------
// Integrated stress response: four stress kinases (PERK, GCN2, PKR, HRI) each phosphorylate eIF2α, which halts the start
// of translation on the ribosome.
// (SiliCoDraw: four tan two-lobed kinases with arrows to a cluster of three tan balls (eIF2 α, β, γ) with a red "P" on
// α, an inhibition bar down to a ribosome on an mRNA. Here the kinases are two protein parts each in a sky blue, eIF2
// three protein parts in green (the tan of both lies within 36° of the phosphate's mustard and the ribosome), the
// phosphate the part with its "P", the ribosome the part with its mRNA, arrows and the bar the parts in grey.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.7, [0, 3.8])
  const kin = soft(KINASE), eif = soft(EIF2)
  const ks = [[-37, -36, 0], [37, -36, 180], [-37, -6, 0], [37, -6, 180]].map(([x, y, t], i) => kinase(g, { x, y, size: 23, id: `kinase-${i + 1}`, pal: kin, turn: t }))
  const arrows = [[[-26, -32], [-17, -26]], [[26, -32], [17, -26]], [[-26, -8], [-17, -13]], [[26, -8], [17, -13]]]
    .map((pts, i) => extra(arrow(g, { points: pts, colour: INK, w: 7, id: `arrow-${i + 1}` })))
  const e = [[6, -7, 17, 'gamma'], [7, -20, 17, 'beta'], [-6, -14, 19, 'alpha']].map(([x, y, s, n]) => protein(g, { x, y, size: s, id: `eIF2-${n}`, pal: eif }))
  const stalk = extra({ defs: '', body: `<g id="phosphate-bond">${g.line([[-6, -23], [-6, -28]], INK, 5)}</g>`, parts: [] })
  const p = phosphate(g, { x: -6, y: -33.5, size: 11.5, id: 'phosphate' })
  const stop = extra(inhibition(g, { points: [[1.5, 2], [1.5, 11.5]], colour: INK, w: 8, id: 'inhibition' }))
  const ribo = ribosome(g, { x: 1.5, y: 33, size: 50, mRNA: true })
  icon('Integrated stress response', join(...ks, ...arrows, ...e, stalk, p, stop, ribo))
}

check()
console.log('written')
