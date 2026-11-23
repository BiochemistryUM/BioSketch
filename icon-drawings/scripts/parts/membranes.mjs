// Shared parts: membranes and the proteins that sit in them, drawn once for every redrawn icon (soft look of
// icon-drawings/STYLE.md). The look is that of the drafts in cells/ct02.mjs (Lipid bilayer, Ion channel, Receptor),
// ct07.mjs (Ion pump, Gap junction) and ct10.mjs (G protein, JAK-STAT).
//
// Every part is measured in one length, the thickness of the membrane `thick` (in the frame's units, from the outer edge
// of one row of heads to the outer edge of the other). A protein drawn with the same `thick` fits a gap in the bilayer.
// Two ways to combine them:
//
//   // 1. Let the membrane leave the gaps and place the proteins (recommended):
//   const m = membraneWith(g, { x: 0, y: -20, size: 100, thick: 26, bend: 30,
//     proteins: [{ part: receptor, at: -25, bound: true }, { part: ionChannel, at: 20, open: false }] })
//   // m.anchors[0].tails: where the receptor's chains end inside the cell, for a JAK of the caller.
//
//   // 2. By hand: the bilayer with a gap, then the protein at the place `along` gives.
//   const b = bilayer(g, { x: 0, y: 0, size: 100, thick: 26, gaps: [{ at: 10, width: receptor.span().width * 26 }] })
//   const p = receptor(g, { ...b.along(10), thick: 26 })
//
// Directions: before `turn`, a membrane lies flat, its outer side (outside the cell, the side a ligand binds from) up.
// A protein's `x`, `y` is where it crosses the middle of the membrane. Proteins are blue (hue of SiliCoDraw's #4f6bb8,
// 267°), lipids peach, ligands green (165°); `pal` gives another palette. Ions, ATP and the inside parts (a JAK, a G
// protein) are the caller's: `anchors` says where they go.
import { PEACH, smoothD } from '../cellkit.mjs'
import { deep, hueOf, soft } from '../colour.mjs'
import { f, gradient2, pathOf } from '../shapes.mjs'

export const LIPID = soft(PEACH)
/** The lipids of a mitochondrial membrane: the hue of BioSketch's own mitochondrion (#F2A08C). */
export const MITO_LIPID = soft(hueOf('#F2A08C'))
export const PROTEIN = soft(hueOf('#4f6bb8'))
export const LIGAND = deep(165)

const { PI, sin, cos, min, max, floor, hypot } = Math
const rad = (d) => (d * PI) / 180
const clamp = (v, a, b) => min(b, max(a, v))

// ---------- geometry of the membrane, in thicknesses (ct02: heads 6.5 in radius, 15 apart, rows 19 from the middle, of 51) ----------
const HEAD = 0.1275, STEP = 0.294, ROW = 0.3725, TAIL_DX = 0.051, TAIL_OUT = 0.275, TAIL_IN = 0.043, CLEAR = 0.03
// A protein's outline reaches about this far (in thicknesses) beyond its fill, at any size: gaps allow for it.
const RIM = 0.06

/** Outline width of a protein on the page: 0.04 of the membrane's thickness, between 3.5 and 10 px. */
const proteinWidth = (tpx) => clamp(tpx * 0.04, 3.5, 10)
/** Parts whose membrane is at least this thick on the page get a highlight. */
const BIG = 110

/**
 * A local frame: points [u, v] in `scale` units, turned by `turn` degrees about x, y (the frame's units), then put on
 * the page. `warp` bends the local points first (a curved membrane).
 */
const frame = (g, x, y, turn, scale, warp = (p) => p) => {
  const a = rad(turn), c = cos(a), s = sin(a)
  const G = (p) => { const [u, v] = warp([p[0] * scale, p[1] * scale]); return [x + u * c - v * s, y + u * s + v * c] }
  const P = (p) => g.P(G(p))
  const px = scale * g.k
  const xy = ([X, Y]) => `${f(X)},${f(Y)}`
  return {
    G, P, px, turn,
    /** A closed outline through the points, safe to stroke (no seam in Safari's engine). */
    poly: (pts) => pathOf(pts.map(P)),
    fill: (pts) => `M${pts.map(P).map(xy).join(' L')}Z`,
    open: (pts) => `M${pts.map(P).map(xy).join(' L')}`,
    smooth: (pts) => smoothD(pts.map(P)),
    curve: (pts) => `M${xy(P(pts[0]))} C${pts.slice(1).map(P).map(xy).join(' ')}`,
    circle: (p, r, fill, stroke = '', w = 0) => { const [X, Y] = P(p); return `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(r * px)}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${f(w)}"` : ''}/>` },
    line: (pts, colour, w) => `<path d="M${pts.map(P).map(xy).join(' L')}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"/>`,
    /** A highlight: an ellipse of half-axes rx, ry (local units) turned by rot degrees with the frame. */
    hl: (p, rx, ry, rot, fill) => { const [X, Y] = P(p); return `<ellipse cx="${f(X)}" cy="${f(Y)}" rx="${f(rx * px)}" ry="${f(ry * px)}" transform="rotate(${f(rot + turn)} ${f(X)} ${f(Y)})" fill="${fill}"/>` },
    /** A two-stop gradient over the page box of the points: base at the top left, shadow at the bottom right. */
    grad: (id, pts, pal) => { const q = pts.map(P), xs = q.map((p) => p[0]), ys = q.map((p) => p[1]); return gradient2(id, [min(...xs), min(...ys), max(...xs), max(...ys)], pal.base, pal.shadow) },
  }
}
/** One gradient that lights every shape that uses it from its own top left (heads of lipids). */
const boxGrad = (id, pal) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`
/** The points of a rounded rectangle, clockwise from the top right, n points on each corner. */
const rrPts = (u0, v0, u1, v1, r, n = 8) => {
  r = min(r, (u1 - u0) / 2, (v1 - v0) / 2)
  return [[u1 - r, v0 + r, -90], [u1 - r, v1 - r, 0], [u0 + r, v1 - r, 90], [u0 + r, v0 + r, 180]].flatMap(([cu, cv, a0]) =>
    Array.from({ length: n + 1 }, (_, i) => { const a = rad(a0 + (90 * i) / n); return [cu + r * cos(a), cv + r * sin(a)] }))
}
/** More points along a closed outline, at most `step` apart. */
const densify = (pts, step) => pts.flatMap((p, i) => {
  const q = pts[(i + 1) % pts.length], n = Math.max(1, Math.ceil(hypot(q[0] - p[0], q[1] - p[1]) / step))
  return Array.from({ length: n }, (_, j) => [p[0] + ((q[0] - p[0]) * j) / n, p[1] + ((q[1] - p[1]) * j) / n])
})
/** A point turned by deg degrees about `about`. */
const spin = ([u, v], deg, [cu, cv] = [0, 0]) => { const a = rad(deg); return [cu + (u - cu) * cos(a) - (v - cv) * sin(a), cv + (u - cu) * sin(a) + (v - cv) * cos(a)] }
/** The settings every protein shares: its thickness, frame, outline width and palette. */
const setup = (g, o, height, key) => {
  const t = o.thick ?? (o.size ?? 60) / height
  const fr = frame(g, o.x ?? 0, o.y ?? 0, o.turn ?? 0, t)
  return { t, fr, w: o.w ?? proteinWidth(fr.px), big: fr.px >= BIG, pal: o.pal ?? PROTEIN, id: o.id ?? key }
}
/** A point of the frame back in the frame's units (for anchors). */
const at = (fr, p) => fr.G(p).map(f)

// ---------- the lipid bilayer ----------
// A membrane seen in section: round peach heads in two rows, two tails each, a pale band (the oily core) between the rows.
// Options: `size` its length (along a bend: the length of its middle line); `thick` its thickness (default 0.35 × size);
// `upright` turns it by 90° (outer side to the right); `leaflet: 'outer' | 'inner'` draws one row only (the band then
// fills that half); `bend` in degrees turns the membrane through that angle over its length, an arc of a cell membrane,
// bulging towards its outer side (negative: towards the inner side); `gaps` leaves room for proteins: each gap is
// [u0, u1] or { at, width, band } along the membrane from its middle, in the frame's units (band: true keeps the pale
// core across the gap, under a protein with room between its parts); `pal` another palette (MITO_LIPID for a
// mitochondrion). Lipid heads have an outline only where the membrane is at least 100 px thick on the page; thinner,
// heads and tails are flat, as small parts are. Returns also `along(u)`: { x, y, turn } of the point u along the middle
// of the membrane, with the turn a protein standing there takes.
// bilayer(g, { x: 0, y: 0, size: 100, thick: 30, bend: 40, gaps: [[-8, 8]] })
export function bilayer(g, { x = 0, y = 0, size = 100, thick, turn = 0, id = 'membrane', w, pal = LIPID, upright = false, leaflet = 'both', bend = 0, gaps = [] } = {}) {
  const t = thick ?? size * 0.35, L = size, half = L / 2
  const R = bend ? L / rad(bend) : 0
  const warp = R ? ([u, v]) => [(R - v) * sin(u / R), R - (R - v) * cos(u / R)] : (p) => p
  const totalTurn = turn + (upright ? 90 : 0)
  const fr = frame(g, x, y, totalTurn, 1, warp)
  const tpx = t * g.k, outlined = w !== undefined || tpx >= 100, wl = w ?? max(3.5, tpx * 0.027)
  const sides = leaflet === 'outer' ? [-1] : leaflet === 'inner' ? [1] : [-1, 1]

  const gs = gaps.map((q) => (Array.isArray(q) ? { a: min(...q), b: max(...q), band: false } : { a: q.at - q.width / 2, b: q.at + q.width / 2, band: !!q.band })).sort((p, q) => p.a - q.a)
  // The stretches between gaps, each with the first and last place a lipid's middle may take.
  const edges = [-half, ...gs.flatMap((q) => [q.a, q.b]), half]
  const lipids = []
  for (let i = 0; i < edges.length; i += 2) {
    const a = edges[i], b = edges[i + 1]
    const first = a + (i === 0 ? HEAD : HEAD + CLEAR) * t, last = b - (i + 2 === edges.length ? HEAD : HEAD + CLEAR) * t
    const len = last - first
    if (len < -HEAD * t * 0.6) continue
    if (len < 0.85 * STEP * t) { lipids.push((first + last) / 2); continue }
    const n = min(floor(len / (STEP * t) + 0.35), floor(len / (0.85 * STEP * t))) + 1
    for (let j = 0; j < n; j++) lipids.push(first + (len * j) / (n - 1))
  }
  // The pale core: from just beyond the end lipids, into each gap a little (under the protein's outline), or across it.
  const into = 0.04 * t, endIn = (HEAD - 0.078) * t
  const bands = []
  let start = -half + endIn
  for (const q of gs) { if (q.band) continue; bands.push([start, q.a + into]); start = q.b - into }
  bands.push([start, half - endIn])
  const [vTop, vBottom] = leaflet === 'outer' ? [-ROW * t, 0] : leaflet === 'inner' ? [0, ROW * t] : [-ROW * t, ROW * t]
  const bandD = ([a, b]) => {
    if (b <= a) return ''
    const n = R ? Math.max(2, Math.ceil(((b - a) / L) * 48)) : 1
    const us = Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n)
    return `<path d="${fr.fill([...us.map((u) => [u, vTop]), ...us.reverse().map((u) => [u, vBottom])])}" fill="${pal.base}"/>`
  }
  const tailW = outlined ? wl : max(2, tpx * 0.03), tailColour = pal.outline
  const tails = lipids.flatMap((u) => sides.flatMap((s) => [-1, 1].map((d) => fr.line([[u + d * TAIL_DX * t, s * TAIL_OUT * t], [u + d * TAIL_DX * t, s * TAIL_IN * t]], tailColour, tailW))))
  const heads = lipids.flatMap((u) => sides.map((s) => (outlined ? fr.circle([u, s * ROW * t], HEAD * t, `url(#${id}-head-gradient)`, pal.outline, wl) : fr.circle([u, s * ROW * t], (HEAD + 0.01) * t, pal.small))))
  const along = (u) => { const [X, Y] = fr.G([u, 0]); return { x: f(X), y: f(Y), turn: f(totalTurn + (R ? (u / R) * 180 / PI : 0)) } }
  return {
    defs: outlined ? boxGrad(`${id}-head-gradient`, pal) : '',
    body: `<g id="${id}"><g id="${id}-core">${bands.map(bandD).join('')}</g><g id="${id}-tails">${tails.join('')}</g><g id="${id}-heads">${heads.join('')}</g></g>`,
    parts: [['lipids', pal]],
    along, thick: t,
  }
}

// ---------- receptor ----------
// A receptor of two chains across the membrane whose outer ends open like a cup (ct02 Receptor, ct10 JAK-STAT).
// Options: `bound` (default true) draws the ligand in the cup (`ligandPal`, default green; a cytokine or growth factor is
// blue, e.g. deep(225)); `tail` how far the chains reach into the cell, in thicknesses (default 0.63; about 1 to hang a
// JAK on each). Returns `anchors`: { ligand: [x, y], tails: [[x, y], [x, y]] }, where the chains end inside the cell.
// receptor(g, { x: 0, y: 0, thick: 30, bound: true })
export function receptor(g, o = {}) {
  const tail = o.tail ?? 0.63, bound = o.bound ?? true, lig = o.ligandPal ?? LIGAND
  const { t, fr, w, big, pal, id } = setup(g, o, 1.12 + tail, 'receptor')
  const cw = 0.157 * fr.px
  const xy = (p) => fr.P(p).map(f).join(',')
  const chain = (s) => ({ d: `M${xy([s * 0.216, tail])} L${xy([s * 0.216, -0.51])} C${xy([s * 0.216, -0.706])} ${xy([s * 0.353, -0.784])} ${xy([s * 0.451, -0.98])}`, width: f(cw) })
  const box = [[-0.53, -1.06], [0.53, tail + 0.08]]
  const lp = [0, -0.824], lr = 0.186
  const ligand = !bound ? '' : big
    ? `<g id="${id}-ligand">${fr.circle(lp, lr, `url(#${id}-ligand-gradient)`, lig.outline, w)}${fr.hl([lp[0] - lr * 0.4, lp[1] - lr * 0.42], lr * 0.5, lr * 0.2, -40, lig.light)}</g>`
    : `<g id="${id}-ligand">${fr.circle(lp, lr + 0.02, lig.small)}</g>`
  return {
    defs: fr.grad(`${id}-gradient`, box, pal) + (bound && big ? fr.grad(`${id}-ligand-gradient`, [[-lr, lp[1] - lr], [lr, lp[1] + lr]], lig) : ''),
    body: `<g id="${id}">${g.union([chain(-1), chain(1)], `url(#${id}-gradient)`, pal.outline, w)}${big ? [-0.259, 0.172].map((u) => fr.hl([u, -0.08], 0.014, 0.096 * (0.6 + tail * 0.64), 0, pal.light)).join('') : ''}</g>` + ligand,
    parts: bound ? [['receptor', pal], ['ligand', lig]] : [['receptor', pal]],
    anchors: { ligand: at(fr, lp), tails: [at(fr, [-0.216, tail]), at(fr, [0.216, tail])] },
  }
}
receptor.key = 'receptor'
receptor.span = () => ({ width: 0.59 + RIM, band: true })

// ---------- seven-helix receptor (GPCR) ----------
// A G protein-coupled receptor: seven helices across the membrane joined by loops, the N-terminus outside, the
// C-terminus inside (ct10 G protein, which drew four). Options: `helices` (default 7; fewer, e.g. 5, reads better below
// about 50 px of membrane). `size` is its width (the N-terminus included), its longer side. Returns `anchors`:
// { below: [x, y] } under the middle of the receptor, inside the cell, where a G protein binds, and { tail: [x, y] }, the
// end of the C-terminus.
// gpcr(g, { x: 0, y: 0, thick: 30 })
export function gpcr(g, o = {}) {
  const n = o.helices ?? 7
  const { t, fr, w, big, pal, id } = setup(g, o, ((o.helices ?? 7) - 1) * 0.25 + 0.56, 'receptor') // size: its width, N-terminus included
  const gap = 0.25, rod = 0.14, top = -0.5, bot = 0.5, loop = 0.085
  const us = Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * gap)
  const item = (pts, width) => ({ d: fr.open(pts), width: f(width * fr.px) })
  // A loop: half a circle from the end of one helix to the end of the next, outwards.
  const arch = (u0, v, s) => Array.from({ length: 13 }, (_, i) => { const a = (PI * i) / 12; return [u0 + gap / 2 - (gap / 2) * cos(a), v + s * (gap / 2) * sin(a)] })
  const items = [
    ...us.map((u) => item([[u, top], [u, bot]], rod)),
    ...us.slice(0, -1).map((u, i) => (i % 2 === 0 ? item(arch(u, bot, 1), loop) : item(arch(u, top, -1), loop))),
  ]
  const nTerm = [[us[0], top], [us[0] - 0.02, -0.64], [us[0] - 0.1, -0.73], [us[0] - 0.2, -0.75]]
  // The C-terminus leaves the last helix inside when the count is odd (it is for seven).
  const s = n % 2 ? 1 : -1, last = us.at(-1)
  const cTerm = [[last, s * 0.5], [last + 0.02, s * 0.64], [last + 0.1, s * 0.73], [last + 0.2, s * 0.75]]
  items.push(item(nTerm, loop), item(cTerm, loop))
  const half = last + rod / 2
  return {
    defs: fr.grad(`${id}-gradient`, [[-half, -0.78], [half, 0.78]], pal),
    body: `<g id="${id}">${g.union(items, `url(#${id}-gradient)`, pal.outline, w)}${big ? fr.hl([us[0] - 0.025, -0.18], 0.016, 0.18, 0, pal.light) : ''}</g>`,
    parts: [['receptor', pal]],
    anchors: { below: at(fr, [0, 0.95]), tail: at(fr, cTerm.at(-1)) },
  }
}
gpcr.key = 'receptor'
gpcr.span = (o = {}) => ({ width: ((o.helices ?? 7) - 1) * 0.25 + 0.14 + RIM, band: false })

// ---------- ion channel ----------
// Two halves across the membrane with a pore between them (ct02 Ion channel). Options: `open` (default true); closed,
// the two halves bulge together at the middle and shut the pore. The ions are the caller's: `anchors` gives the mouth
// of the pore outside, its middle and its mouth inside.
// ionChannel(g, { x: 0, y: 0, thick: 30, open: false })
export function ionChannel(g, o = {}) {
  const open = o.open ?? true
  const { t, fr, w, big, pal, id } = setup(g, o, 1.33 + RIM, 'channel')
  const inner = 0.12, outer = 0.47, hh = 0.667
  const halfPts = (s) => {
    let pts = densify(rrPts(inner, -hh, outer, hh, 0.137), 0.03)
    if (!open) pts = pts.map(([u, v]) => (u < inner + 0.02 && Math.abs(v) < 0.42 ? [u - (inner + 0.005) * cos((PI * v) / 0.84) ** 2, v] : [u, v]))
    return pts.map(([u, v]) => [s * u, v])
  }
  const halves = [-1, 1].map((s) => {
    const pts = halfPts(s)
    return `<path d="${fr.poly(s < 0 ? pts.reverse() : pts)}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="${f(w)}" stroke-linejoin="round"/>` +
      (big ? fr.hl([s * 0.295 - 0.065, -0.24], 0.018, 0.12, 0, pal.light) : '')
  })
  return {
    defs: fr.grad(`${id}-gradient`, [[-outer, -hh], [outer, hh]], pal),
    body: `<g id="${id}">${halves.join('')}</g>`,
    parts: [['channel', pal]],
    anchors: { outside: at(fr, [0, -0.92]), pore: at(fr, [0, 0]), inside: at(fr, [0, 0.92]) },
  }
}
ionChannel.key = 'channel'
ionChannel.span = () => ({ width: 0.94 + RIM, band: false })

// ---------- pump or transporter ----------
// A protein across the membrane that carries something through it (ct07 Ion pump, without its ions and ATP). Options:
// `open`: undefined draws one rounded body (a pump: the caller adds the ions, arrows and ATP); 'out' or 'in' draws a
// transporter of two lobes with a cleft open to the outside or the inside (the two states of alternating access).
// Returns `anchors`: { outside, inside, cleft, atp } (atp: beside its lower face, inside the cell, where ATP binds).
// pump(g, { x: 0, y: 0, thick: 30 }); pump(g, { x: 0, y: 0, thick: 30, open: 'out' })
export function pump(g, o = {}) {
  const { t, fr, w, big, pal, id } = setup(g, o, 1.29 + RIM, o.open ? 'transporter' : 'pump')
  const hw = 0.41, hh = 0.645
  let shape, hl
  if (!o.open) {
    shape = `<path d="${fr.poly(rrPts(-hw, -hh, hw, hh, 0.216))}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="${f(w)}" stroke-linejoin="round"/>`
    hl = fr.hl([-0.255, -0.294], 0.018, 0.1, 0, pal.light)
  } else {
    // Two overlapping lobes hinged at the closed side; they part by 9° each, so a cleft opens into the open side.
    const s = o.open === 'in' ? -1 : 1, hinge = [0, s * hh], tilt = 9
    const lobe = (side) => rrPts(side < 0 ? -hw : -0.12, -hh, side < 0 ? 0.12 : hw, hh, 0.2).map((p) => spin(p, side * s * tilt, hinge))
    shape = g.union([-1, 1].map((side) => fr.poly(lobe(side))), `url(#${id}-gradient)`, pal.outline, w)
    hl = fr.hl(spin([-0.255, -0.2], -s * tilt, hinge), 0.018, 0.1, -s * tilt, pal.light)
  }
  const cleftV = o.open === 'in' ? 0.45 : -0.45
  return {
    defs: fr.grad(`${id}-gradient`, [[-hw, -hh], [hw, hh]], pal),
    body: `<g id="${id}">${shape}${big ? hl : ''}</g>`,
    parts: [[o.open ? 'transporter' : 'pump', pal]],
    anchors: { outside: at(fr, [0, -0.92]), inside: at(fr, [0, 0.92]), cleft: at(fr, [0, o.open ? cleftV : 0]), atp: at(fr, [-0.62, 0.78]) },
  }
}
pump.key = 'pump'
pump.span = (o = {}) => ({ width: (o.open ? 0.96 : 0.82) + RIM, band: false })

// ---------- a membrane protein ----------
// A generic membrane protein: one rounded, slightly lumpy body spanning the membrane. Options: `wide` (default 1)
// scales its width. Returns `anchors`: { outside, inside }.
// membraneProtein(g, { x: 0, y: 0, thick: 30 })
export function membraneProtein(g, o = {}) {
  const wide = o.wide ?? 1
  const { t, fr, w, big, pal, id } = setup(g, o, 1.36 + RIM, 'protein')
  const rx = 0.37 * wide, ry = 0.68
  const pts = Array.from({ length: 12 }, (_, i) => { const a = (2 * PI * i) / 12, r = 1 + 0.045 * sin(3 * a + 0.6) + 0.035 * cos(5 * a); return [rx * r * cos(a), ry * r * sin(a)] })
  return {
    defs: fr.grad(`${id}-gradient`, [[-rx, -ry], [rx, ry]], pal),
    body: `<g id="${id}">${`<path d="${fr.smooth(pts)}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="${f(w)}" stroke-linejoin="round"/>`}${big ? fr.hl([-rx * 0.45, -0.3], 0.02, 0.13, 8, pal.light) : ''}</g>`,
    parts: [['protein', pal]],
    anchors: { outside: at(fr, [0, -0.95]), inside: at(fr, [0, 0.95]) },
  }
}
membraneProtein.key = 'protein'
membraneProtein.span = (o = {}) => ({ width: 0.78 * (o.wide ?? 1) + RIM, band: false })

// ---------- a membrane with its proteins ----------
// The bilayer with a gap for every protein and each protein in its gap, turned with the membrane (also along a bend).
// Options: those of `bilayer`, and `proteins`: [{ part, at, ...its own options }], `at` the place along the membrane
// from its middle (frame units). Proteins of one palette are listed as one part ('membrane proteins'). Returns also
// `anchors` (one entry per protein, in order) and `along`.
// membraneWith(g, { x: 0, y: 0, size: 100, thick: 26, proteins: [{ part: ionChannel, at: 0 }] })
export function membraneWith(g, o = {}) {
  const id = o.id ?? 'membrane', size = o.size ?? 100, t = o.thick ?? size * 0.35
  const list = o.proteins ?? []
  const gaps = list.map((p) => { const s = p.part.span(p); return { at: p.at, width: s.width * t, band: s.band } })
  const m = bilayer(g, { ...o, id, thick: t, gaps })
  const counts = {}
  const made = list.map((p, i) => {
    const { part, at: u, ...opts } = p
    const pos = m.along(u), key = part.key
    counts[key] = (counts[key] ?? 0) + 1
    const pid = opts.id ?? `${id}-${key}${list.filter((q) => q.part.key === key).length > 1 ? `-${counts[key]}` : ''}`
    return part(g, { ...opts, id: pid, x: pos.x, y: pos.y, turn: pos.turn + (opts.turn ?? 0), thick: t })
  })
  return { defs: m.defs + made.map((p) => p.defs).join(''), body: m.body + made.map((p) => p.body).join(''), parts: mergeParts([m, ...made].flatMap((p) => p.parts)), anchors: made.map((p) => p.anchors), along: m.along, thick: t }
}
/** Parts of one icon that share a palette are one part (they recolour together); several names become one. */
export const mergeParts = (parts) => {
  const by = new Map()
  for (const [name, pal] of parts) { const k = pal.base; if (!by.has(k)) by.set(k, [[], pal]); if (!by.get(k)[0].includes(name)) by.get(k)[0].push(name) }
  return [...by.values()].map(([names, pal]) => [names.length > 1 ? (pal === PROTEIN ? 'membrane proteins' : names.join(' and ')) : names[0], pal])
}

// ---------- gap junction ----------
// The membranes of two neighbouring cells across a narrow cleft, joined by channels: each a pair of connexons, one in
// each membrane, docked end to end (ct07 Gap junction). `size` the length, `thick` each membrane's thickness (default
// 0.3 × size), `channels` how many (default 2). The small molecules passing are the caller's: `anchors` gives the
// middle of every channel. Turn 90 for the cells side by side.
// gapJunction(g, { x: 0, y: 0, size: 100, thick: 28 })
export function gapJunction(g, o = {}) {
  const id = o.id ?? 'gap-junction', size = o.size ?? 100, t = o.thick ?? size * 0.3, n = o.channels ?? 2, pal = o.pal ?? PROTEIN
  const turn = o.turn ?? 0, x = o.x ?? 0, y = o.y ?? 0
  const cleft = 0.14 * t, mid = t / 2 + cleft / 2
  const spacing = min(size / n, 1.9 * t), cs = Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * spacing)
  const wall = 0.18, pore = 0.12, width = 2 * wall + pore
  const fr = frame(g, x, y, turn, t)
  const w = o.w ?? proteinWidth(fr.px)
  const mem = (s) => {
    const [mx, my] = fr.G([0, (s * mid) / t])
    return bilayer(g, { x: mx, y: my, size, thick: t, turn, id: `${id}-${s < 0 ? 'upper' : 'lower'}-membrane`, pal: o.lipidPal ?? LIPID, gaps: cs.map((c) => ({ at: c, width: (width + RIM) * t })) })
  }
  const [a, b] = [mem(-1), mem(1)]
  const ext = (mid + t / 2 + 0.12 * t) / t // walls reach a little past each membrane's outer heads
  const walls = cs.flatMap((c) => [-1, 1].flatMap((s) => [-1, 1].map((side) => {
    const u0 = c / t + (side < 0 ? -pore / 2 - wall : pore / 2)
    const [v0, v1] = s < 0 ? [-ext, -0.012] : [0.012, ext]
    return `<path d="${fr.poly(rrPts(u0, v0, u0 + wall, v1, 0.07))}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="${f(w)}" stroke-linejoin="round"/>`
  })))
  return {
    defs: a.defs + b.defs + fr.grad(`${id}-gradient`, [[cs[0] / t - width / 2, -ext], [cs.at(-1) / t + width / 2, ext]], pal),
    body: a.body + b.body + `<g id="${id}-connexons">${walls.join('')}</g>`,
    parts: [['lipids', o.lipidPal ?? LIPID], ['connexons', pal]],
    anchors: cs.map((c) => at(fr, [c / t, 0])),
  }
}

// ---------- demonstrations for the parts sheet ----------
export const DEMOS = [
  { name: 'Lipid bilayer', size: 100, draw: (g) => bilayer(g, { size: 100, thick: 51 }) },
  { name: 'Upright lipid bilayer', size: 100, draw: (g) => bilayer(g, { size: 100, thick: 40, upright: true }) },
  { name: 'Curved lipid bilayer', size: 100, draw: (g) => bilayer(g, { y: -8, size: 112, thick: 30, bend: 70 }) },
  { name: 'Lipid monolayer', size: 100, draw: (g) => bilayer(g, { size: 100, thick: 51, leaflet: 'outer' }) },
  { name: 'Lipid bilayer with gaps', size: 100, draw: (g) => bilayer(g, { size: 100, thick: 34, gaps: [[-22, -8], { at: 22, width: 20, band: true }] }) },
  { name: 'Mitochondrial membrane', size: 100, draw: (g) => bilayer(g, { y: 10, size: 104, thick: 36, pal: MITO_LIPID, bend: -50 }) },
  { name: 'Receptor with ligand', size: 100, draw: (g) => receptor(g, { y: 10, size: 100 }) },
  { name: 'Receptor without ligand', size: 100, draw: (g) => receptor(g, { y: 10, size: 100, bound: false }) },
  { name: 'Receptor with long tails', size: 100, draw: (g) => receptor(g, { y: 1, size: 100, tail: 1.05 }) },
  { name: 'G protein-coupled receptor', size: 100, draw: (g) => gpcr(g, { size: 100 }) },
  { name: 'Ion channel', size: 100, draw: (g) => ionChannel(g, { size: 100 }) },
  { name: 'Closed ion channel', size: 100, draw: (g) => ionChannel(g, { size: 100, open: false }) },
  { name: 'Pump', size: 100, draw: (g) => pump(g, { size: 100 }) },
  { name: 'Transporter open outside', size: 100, draw: (g) => pump(g, { size: 100, open: 'out' }) },
  { name: 'Transporter open inside', size: 100, draw: (g) => pump(g, { size: 100, open: 'in' }) },
  { name: 'Membrane protein', size: 100, draw: (g) => membraneProtein(g, { size: 100 }) },
  { name: 'Receptor in the membrane', size: 100, draw: (g) => membraneWith(g, { size: 100, thick: 40, y: 8, proteins: [{ part: receptor, at: 0, tail: 0.9 }] }) },
  { name: 'Proteins in a membrane', size: 100, draw: (g) => membraneWith(g, { size: 100, thick: 22, proteins: [{ part: gpcr, at: -25 }, { part: ionChannel, at: 9 }, { part: membraneProtein, at: 33 }] }) },
  { name: 'Proteins in a curved membrane', size: 100, draw: (g) => membraneWith(g, { size: 104, thick: 26, y: 6, bend: 50, proteins: [{ part: receptor, at: -28, bound: false }, { part: ionChannel, at: 0, open: false }, { part: pump, at: 28, open: 'in' }] }) },
  { name: 'Gap junction', size: 100, draw: (g) => gapJunction(g, { size: 100, thick: 34, channels: 2 }) },
]
