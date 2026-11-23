// The muscle cells besides the cardiomyocyte: the skeletal muscle fibre and how it is made (myoblast, myoblast fusion,
// myotube), the myofibril and its sarcomeres, the motor unit, three smooth muscle cells and the myoepithelial cell.
// BioSketch's own drawings in the soft look of icon-drawings/STYLE.md, in the colours of the approved icons: the muscle
// rose soft(15) of Cardiomyocyte and Smooth muscle cell, the lilac nucleus NUC, the peach neuron with pale blue myelin of
// Neuron, the filaments and Z discs of Sarcomere (./ct03.mjs). No SiliCoDraw original: the list is the owner's.
// Built from the shared parts: spindleCell, stellateField, fieldCell, tubeField and fitted of ../parts/cellforms.mjs,
// the nucleus of ../parts/organelles.mjs, and muscleCell (striations across the myofibrils) of
// ./cardiomyocyte-family.mjs.
// Usage: node muscle-family.mjs <folder>
import { BLUE, NUC, PEACH, cellTypes } from '../cellkit.mjs'
import { hueOf, rich, soft, toHex } from '../colour.mjs'
import { f, gradient2, setStrokeScale, smin, strokeScale } from '../shapes.mjs'
import { nucleus } from '../parts/organelles.mjs'
import { fieldCell, fitted as fit, moved, spindleCell, spindleField, stellateField, tubeField } from '../parts/cellforms.mjs'
import { muscleCell } from './cardiomyocyte-family.mjs'

const OUT = process.argv[2]
// Outlines at 60 % (the owner's rule for icons drawn from 23 November 2026): svg() writes every stroke-width so. Lines
// that are a thing of their own rather than an outline (filaments, Z lines, fibres, myelin) keep their width through `B`.
setStrokeScale(0.6)
const B = (w) => w / strokeScale()
const { cellType, check } = cellTypes(OUT)
const fitted = (name, draw, o) => fit(cellType, name, draw, o)

const STRIATED = soft(15) // the rose of the approved Cardiomyocyte and Muscle satellite cell
const SMOOTH = soft(hueOf('#FFDFE0')) // the approved Smooth muscle cell (the same rose, 16°)
const NEURON = soft(PEACH), MYELIN = soft(BLUE) // as the approved Neuron
const ACTIN = soft(160), MYOSIN = soft(262), ZDISC = rich(88) // as the drafted Sarcomere
const EPI = soft(PEACH) // gland epithelium, peach (37° from the muscle rose)
const GREY = toHex({ l: 0.66, c: 0.004, h: 0 }) // the lines of an enlargement: grey, so that they recolour with nothing

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const rad = (d) => (d * Math.PI) / 180
const rot = ([u, v], deg) => { const c = Math.cos(rad(deg)), s = Math.sin(rad(deg)); return [u * c - v * s, u * s + v * c] }
const sdBox = (x, y, cx, cy, hx, hy, r) => { const dx = Math.abs(x - cx) - hx + r, dy = Math.abs(y - cy) - hy + r; return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - r }
const ellSD = (u, v, cx, cy, rx, ry) => (Math.hypot((u - cx) / rx, (v - cy) / ry) - 1) * Math.min(rx, ry)
/** Several drawings as one: defs and bodies in order, parts once each, outline points of all. */
const join = (...rs) => ({
  defs: rs.map((r) => r.defs).join(''), body: rs.map((r) => r.body).join('\n'),
  parts: rs.flatMap((r) => r.parts).filter(([n], i, all) => all.findIndex(([m]) => m === n) === i), pts: rs.flatMap((r) => r.pts ?? []),
})

/**
 * A segment of a skeletal muscle fibre seen from the side: a cylinder from x − length/2 to x + length/2, its two cut ends
 * as ellipses (`cap` of the half width across). For muscleCell: the myofibrils run along x, so the striations are upright.
 */
function cylinder({ x = 0, y = 0, length, half, cap = 0.3 }) {
  const a = length / 2, rx = half * cap
  const field = (u, v) => Math.min(sdBox(u, v, x, y, a, half, 0), ellSD(u, v, x - a, y, rx, half), ellSD(u, v, x + a, y, rx, half))
  return { field, phi: (u) => u, kind: 'limbs', x, y, a, half, rx }
}

/** The cut face at the right end of a cylinder: the cross-section, paler, with myofibrils as dots and a nucleus at its rim. */
function cutFace(g, cy, { id, pal = STRIATED, w, dots = 0.27, nucAt }) {
  const X = cy.x + cy.a, rx = cy.rx, ry = cy.half
  let defs = gradient2(`${id}-face-gradient`, [g.X(X - rx), g.Y(cy.y - ry), g.X(X + rx), g.Y(cy.y + ry)], pal.light, pal.base)
  let body = `<g id="${id}-cut-face">${g.ellipse(X, cy.y, rx, ry, 0, `url(#${id}-face-gradient)`, pal.outline, w)}`
  const list = []
  for (let q = -1; q <= 1; q += dots) for (let p = -1; p <= 1; p += dots * 1.1) {
    const pp = p + (Math.round(q / dots) % 2 ? dots * 0.55 : 0)
    if (Math.hypot(pp, q) < 0.72 && !(nucAt && Math.hypot(pp - Math.cos(rad(nucAt)) * 0.8, q - Math.sin(rad(nucAt)) * 0.8) < 0.34)) list.push([X + pp * rx * 0.9, cy.y + q * ry * 0.9])
  }
  body += list.map(([u, v]) => g.ellipse(u, v, rx * dots * 0.42, ry * dots * 0.36, 0, pal.small)).join('') + '</g>\n'
  if (nucAt !== undefined) {
    const t = rad(nucAt), u = X + Math.cos(t) * rx * 0.78, v = cy.y + Math.sin(t) * ry * 0.78
    body += `<g id="${id}-face-nucleus">${g.ellipse(u, v, rx * 0.24, ry * 0.16, -30, NUC.base, NUC.outline, 5)}</g>\n`
  }
  return { defs, body }
}

// ---------- 1. Skeletal muscle cell ----------
// A segment of a fibre: a long cylinder, cut at both ends, finely and densely striated across its length, its nuclei
// flattened under the membrane at the edge; the cut face at the right shows the myofibrils packed in cross-section.
{
  const cy = cylinder({ length: 96, half: 16, cap: 0.38 })
  const nuc = (x, top, size = 17) => ({ x, y: top ? -(16 - 4.4) : 16 - 4.4, size, ratio: 0.26, turn: top ? -2 : 2 })
  fitted('Skeletal muscle cell', (g) => {
    const w = 11
    const r = muscleCell(g, cy, { id: 'skeletal-muscle-cell', pal: STRIATED, w, nuclei: [nuc(-10, true), nuc(-30, false), nuc(22, false)], stripes: { spacing: 2.6, width: 3.4, gap: 1.4 }, shine: { length: 16, near: 60, lean: 0.3 } })
    const face = cutFace(g, cy, { id: 'skeletal-muscle-cell', w, nucAt: -60 })
    return { ...r, defs: r.defs + face.defs, body: r.body + face.body }
  })
}

// ---------- 2. Myotube ----------
// A young multinucleate cell: long, tapering to both ends, its nuclei in a chain down the middle, no striations yet.
const myotube = (o = {}) => spindleField({ length: 100, width: 15, bend: 3, s: true, taper: 1.25, ...o })
const chain = (fd, ts, size, ratio = 0.62) => ts.map((t) => { const { p, deg } = fd.at(t); return { x: p[0], y: p[1], size, ratio, turn: deg } })
{
  const fd = myotube()
  fitted('Myotube', (g) => fieldCell(g, fd, { id: 'myotube', scale: 1, w: 10, pal: STRIATED, nuclei: chain(fd, [0.25, 0.35, 0.45, 0.55, 0.65, 0.75], 9.4, 0.6), shine: { length: 12, near: 40, lean: 0.25 } }))
}

// ---------- 3. Myoblast ----------
// A muscle precursor: a small spindle with a fuller body, one oval nucleus with a nucleolus.
const myoblastField = (o = {}) => spindleField({ length: 100, width: 30, bend: 3.5, s: true, body: 0.55, process: 0.3, shift: 0.03, ...o })
fitted('Myoblast', (g) => fieldCell(g, myoblastField(), { id: 'myoblast', scale: 1, w: 11, pal: STRIATED, nuclei: [{ x: -1, y: 0, size: 30, ratio: 0.6, turn: -6, nucleolus: true }], shine: { length: 11, near: 24 } }))

// ---------- 4. Myoblast fusion ----------
// Two myoblasts joining a young myotube: one already fused into its upper side (its nucleus still in the bridge), one
// lying against it, about to fuse.
{
  const tube = moved(spindleField({ length: 92, width: 16, bend: 2.5, taper: 1.2 }), 4, 16)
  const fusing = moved(spindleField({ length: 42, width: 15, bend: 2, turn: -28, body: 0.5, process: 0.32 }), -14, 1)
  const next = moved(spindleField({ length: 40, width: 15, bend: -2, turn: 22, body: 0.5, process: 0.32 }), 28, -14)
  const merged = { field: (u, v) => smin(tube.field(u, v), fusing.field(u, v), 9), ext: [Math.min(tube.ext[0], fusing.ext[0]), Math.min(tube.ext[1], fusing.ext[1]), Math.max(tube.ext[2], fusing.ext[2]), Math.max(tube.ext[3], fusing.ext[3])] }
  fitted('Myoblast fusion', (g) => join(
    fieldCell(g, merged, { id: 'myotube', scale: 1, w: 10, pal: STRIATED, nuclei: [{ x: -15, y: 1.5, size: 11, ratio: 0.62, turn: -28 }, { x: 4, y: 16.6, size: 10, ratio: 0.62 }, { x: 16, y: 16.8, size: 10, ratio: 0.62 }, { x: 28, y: 16.6, size: 10, ratio: 0.62 }], shine: { length: 10, near: 45, lean: 0.25 } }),
    fieldCell(g, next, { id: 'myoblast', scale: 1, w: 10, pal: STRIATED, nuclei: [{ x: 28, y: -14, size: 12, ratio: 0.62, turn: 22 }], shine: { length: 8, near: 50 } }),
  ))
}

// ---------- 5–7. Smooth muscle cells ----------
// 1: the classic spindle with a long central, cigar-shaped nucleus. 2: longer and thinner, slightly bent.
// 3: contracted: shorter and wider, the membrane drawn into blebs, the nucleus twisted into a corkscrew.
fitted('Smooth muscle cell (spindle)', (g) => spindleCell(g, { scale: 1, length: 100, aspect: 6.6, bend: 2, taper: 1.1, w: 10, pal: SMOOTH, nucleus: { ratio: 0.28, size: 34 }, shine: { length: 14, near: 35 } }))
fitted('Smooth muscle cell (long, thin)', (g) => spindleCell(g, { scale: 1, length: 100, width: 10, bend: 5, taper: 1.35, w: 9, turn: -12, pal: SMOOTH, nucleus: { ratio: 0.22, size: 26 }, shine: { length: 14, near: 40 } }))

/**
 * A corkscrew nucleus along x (the nucleus of a contracted smooth muscle cell): a long nucleus whose middle line winds
 * like a spring seen from the side, with the folds of its envelope across it.
 */
function corkscrew(g, { x, y, length, half, turns = 2.5, wave = 1.6, id = 'nucleus', w = 7, pal = NUC }) {
  const n = 48, top = [], bot = []
  const mid = (t) => wave * Math.sin(2 * Math.PI * turns * t) * Math.sin(Math.PI * t) ** 0.5
  const hw = (t) => half * Math.sin(Math.PI * t) ** 0.45
  for (let i = 0; i <= n; i++) { const t = i / n, u = x - length / 2 + length * t; top.push([u, y + mid(t) - hw(t)]); bot.push([u, y + mid(t) + hw(t)]) }
  const outline = [...top.slice(0, -1), ...bot.reverse().slice(0, -1)]
  const defs = g.grad(`${id}-gradient`, [x - length / 2, y - half, x + length / 2, y + half], pal)
  // A fold where the middle line crosses over: one slanting line per half turn, between the outlines.
  const folds = Array.from({ length: Math.round(turns * 2) - 1 }, (_, i) => {
    const t = (i + 1) / (turns * 2), u = x - length / 2 + length * t, h = hw(t) * 0.62
    return g.line([[u - h * 0.55, y + mid(t) - h], [u + h * 0.55, y + mid(t) + h]], pal.small, B(3.2))
  })
  const body = `<g id="${id}">${g.path(g.smooth(outline), `url(#${id}-gradient)`, pal.outline, w)}${folds.join('')}${g.hl(x - length * 0.3, y + mid(0.2) - hw(0.2) * 0.35, f(length * 0.07 * g.k), 2.5, -8, pal.light)}</g>`
  return { defs, body, parts: [['nucleus', pal]] }
}
{
  const base = spindleField({ length: 62, width: 24, bend: 2, taper: 0.75 })
  const fd = { ...base, field: (u, v) => base.field(u, v) - 0.75 * Math.sin(u * 0.42 + (v > 0 ? 1.9 : 0.3)) }
  fitted('Smooth muscle cell (contracted)', (g) => {
    const r = fieldCell(g, fd, { id: 'smooth-muscle-cell', scale: 1, w: 10, pal: SMOOTH, shine: { length: 11, near: 22 } })
    const n = corkscrew(g, { x: 0.5, y: 0, length: 32, half: 4.2, id: 'smooth-muscle-cell-nucleus', w: 9 })
    return { ...join(r, n), pts: r.pts }
  })
}

// ---------- 8. Myoepithelial cell ----------
// A star-shaped contractile cell on the outside of a gland's acinus, its long thin processes curving round it like the
// fingers of a basket, with contractile fibres along them. The acinus beneath: secretory cells round a small lumen.
{
  const R = 34, cells = 9
  const myo = stellateField({ rx: 10, ry: 7.5, tilt: -10, join: 5, taper: 1.3, processes: [
    { deg: 200, length: 27, width: 7, bend: 9 }, { deg: 140, length: 26, width: 6.5, bend: 9 }, { deg: 20, length: 27, width: 7, bend: 9 },
    { deg: -40, length: 26, width: 6.5, bend: 9 }, { deg: 82, length: 25, width: 6, bend: 8 }, { deg: -100, length: 24, width: 6, bend: 8 },
  ] })
  const MX = 0, MY = -1
  fitted('Myoepithelial cell', (g) => {
    // The acinus: one ball of cells, their borders as lines from the lumen outwards, a nucleus near the base of each.
    let defs = g.grad('acinus-gradient', [-R, -R, R, R], EPI) + g.grad('acinus-nucleus-gradient', [-R, -R, R, R], NUC)
    let body = `<g id="acinus">${g.circle(0, 0, R, 'url(#acinus-gradient)', EPI.outline, 10)}${g.hl(-R * 0.62, -R * 0.6, f(R * g.k * 0.2), 6, -45, EPI.light)}`
    body += Array.from({ length: cells }, (_, i) => { const a = rad(-80 + (360 / cells) * i); return g.line([[Math.cos(a) * 8, Math.sin(a) * 8], [Math.cos(a) * (R - 2.5), Math.sin(a) * (R - 2.5)]], EPI.small, B(3.2)) }).join('')
    body += g.circle(0, 0, 6.2, EPI.light, EPI.outline, 7) + '</g>\n'
    body += `<g id="acinus-nuclei">${Array.from({ length: cells }, (_, i) => { const a = rad(-80 + (360 / cells) * (i + 0.5)); return g.ellipse(Math.cos(a) * 26, Math.sin(a) * 26, 3.6, 2.8, (a * 180) / Math.PI + 90, 'url(#acinus-nucleus-gradient)', NUC.outline, 6) }).join('')}</g>\n`
    const cell = fieldCell(g, myo, { id: 'myoepithelial-cell', x: MX, y: MY, scale: 1, w: 9, pal: STRIATED, nuclei: [{ x: 0, y: 0, size: 13, ratio: 0.62, turn: -10 }], nucW: 8, shine: { length: 7, near: 9 } })
    // Contractile fibres along each process, from the body towards its tip.
    const fibres = myo.arms.map((arm) => {
      const pts = arm.axis.filter((_, i, all) => i >= all.length * 0.25 && i <= all.length * 0.78).map(([u, v]) => [u + MX, v + MY])
      return g.line(pts, STRIATED.small, B(3.6))
    })
    cell.body += `\n<g id="myoepithelial-cell-fibres">${fibres.join('')}</g>`
    return { defs: defs + cell.defs, body: body + cell.body, parts: [['acinus', EPI], ['cytoplasm', STRIATED], ['nucleus', NUC]], pts: [[g.X(-R), g.Y(-R), 5], [g.X(R), g.Y(R), 5], ...cell.pts] }
  })
}

// ---------- 9. Myofibril structure ----------
// Above: a myofibril, a row of sarcomeres: dark A bands (an M line across the middle of each), pale I bands, a Z line
// (gold) across the middle of each I band. Below: one sarcomere enlarged, as the drafted Sarcomere: thin filaments
// (actin) fixed to the Z discs, thick filaments (myosin) in the middle, overlapping them; grey lines lead from the
// sarcomere above to its enlargement.
const rounded = (g, [x0, y0, x1, y1], r) => g.D(`M${x0 + r},${y0} L${x1 - r},${y0} C${x1 - r * 0.45},${y0} ${x1},${y0 + r * 0.45} ${x1},${y0 + r} L${x1},${y1 - r} C${x1},${y1 - r * 0.45} ${x1 - r * 0.45},${y1} ${x1 - r},${y1} L${x0 + r},${y1} C${x0 + r * 0.45},${y1} ${x0},${y1 - r * 0.45} ${x0},${y1 - r} L${x0},${y0 + r} C${x0},${y0 + r * 0.45} ${x0 + r * 0.45},${y0} ${x0 + r},${y0} Z`)
{
  const S = 19 // length of a sarcomere
  fitted('Myofibril structure', (g) => {
    const top = [-36, -20], ends = [-47.5, 47.5]
    let defs = g.grad('myofibril-gradient', [ends[0], top[0], ends[1], top[1]], STRIATED) + g.grad('sarcomere-gradient', [-47, 3, 47, 45], STRIATED)
    const zs = [-1.5, -0.5, 0.5, 1.5].map((i) => i * S)
    const iBand = 0.22 * S // half an I band
    const ins = 4.8 / g.k + 0.6
    const aBands = [-2, -1, 0, 1, 2].map((i) => i * S).map((c) => [Math.max(c - S / 2 + iBand, ends[0] + 2.4), Math.min(c + S / 2 - iBand, ends[1] - 2.4), c])
    let body = `<g id="myofibril">${g.path(rounded(g, [ends[0], top[0], ends[1], top[1]], 3.5), 'url(#myofibril-gradient)', STRIATED.outline, 9)}`
    body += aBands.map(([a, b]) => g.path(g.D(`M${a},${top[0] + ins} L${b},${top[0] + ins} L${b},${top[1] - ins} L${a},${top[1] - ins} Z`), STRIATED.small)).join('')
    body += aBands.map(([, , c]) => g.line([[c, top[0] + ins], [c, top[1] - ins]], STRIATED.outline, B(2.6))).join('') + '</g>\n'
    body += `<g id="z-lines">${zs.map((z) => g.line([[z, top[0] + ins - 0.3], [z, top[1] - ins + 0.3]], ZDISC.outline, B(5))).join('')}</g>\n`
    // The enlargement lines, from the Z lines of the middle sarcomere to the Z discs below.
    const box = [-47, 5, 47, 45], Z = 32
    body += `<g id="enlargement">${[-1, 1].map((s) => g.line([[s * S * 0.5, top[1] + 2], [s * Z, box[1] - 2]], GREY, B(3.5))).join('')}</g>\n`
    const rows = 4, step = (box[3] - box[1]) / (rows + 0.5), ys = Array.from({ length: rows }, (_, i) => box[1] + step * (0.75 + i))
    body += `<g id="sarcomere">${g.path(rounded(g, box, 4), 'url(#sarcomere-gradient)', STRIATED.outline, 11)}</g>\n`
    body += `<g id="thin-filaments">${ys.flatMap((y) => [g.line([[box[0] + 4.5, y], [-11, y]], ACTIN.outline, B(6.5)), g.line([[box[2] - 4.5, y], [11, y]], ACTIN.outline, B(6.5))]).join('')}</g>\n`
    const mids = ys.slice(1).map((y, i) => (y + ys[i]) / 2)
    body += `<g id="thick-filaments">${mids.map((y) => g.line([[-21, y], [21, y]], MYOSIN.outline, B(10) + 9) + g.line([[-21, y], [21, y]], MYOSIN.small, B(10))).join('')}</g>\n`
    body += `<g id="z-discs">${[-Z, Z].map((x) => g.line([[x, box[1] + 2.6], [x, box[3] - 2.6]], ZDISC.outline, B(9))).join('')}</g>\n`
    const pts = [[g.X(box[0]), g.Y(box[3]), 5], [g.X(box[2]), g.Y(box[3]), 5], [g.X(ends[0]), g.Y(top[0]), 4], [g.X(ends[1]), g.Y(top[0]), 4]]
    return { defs, body, parts: [['myofibril', STRIATED], ['thin filaments', ACTIN], ['thick filaments', MYOSIN], ['Z discs', ZDISC]], pts }
  })
}

// ---------- 10. Motor unit (with end plates) ----------
// One motor neuron and the fibres it supplies: a cell body with dendrites, a myelinated axon running down and branching,
// each branch ending in a small end plate on one skeletal muscle fibre.
{
  const soma = [-37, -41], half = 7, trunkX = -37
  const fibres = [-10, 13, 36].map((y, i) => ({ y, x: 14 + [0, 4, -2][i], plate: [4, 12, 8][i] }))
  const tops = fibres.map((fb) => fb.y - half), runs = tops.map((t) => t - 8)
  const dend = stellateField({ rx: 10, ry: 9, tilt: -10, join: 4, taper: 1.1, processes: [
    { deg: 195, length: 23, width: 6, bend: 4 }, { deg: 240, length: 22, width: 6, bend: -4 }, { deg: 290, length: 23, width: 6, bend: 5 }, { deg: 340, length: 20, width: 5.5, bend: -3 }, { deg: 150, length: 17, width: 5.5, bend: -3 },
  ] })
  const axon = [tubeField([[trunkX, soma[1] + 6], [trunkX - 0.5, -8], [trunkX + 0.5, 8], [trunkX, runs[2] - 3]], () => 2)]
  fibres.forEach((fb, i) => axon.push(tubeField([[trunkX, runs[i] - 3.5], [trunkX + 4.5, runs[i]], [fb.plate - 9, runs[i]], [fb.plate - 1, tops[i] - 2.5]], () => 1.8)))
  const plates = fibres.map((fb, i) => ({ x: fb.plate, y: tops[i] - 1 }))
  const neuron = {
    field: (u, v) => {
      let e = dend.field(u - soma[0], v - soma[1])
      for (const a of axon) e = smin(e, a.field(u, v), 2.5)
      for (const p of plates) e = smin(e, ellSD(u, v, p.x, p.y, 6.4, 2.6), 2)
      return e
    },
    ext: [-70, -75, 25, 45],
  }
  fitted('Motor unit', (g) => {
    const rs = fibres.map((fb, i) => {
      const cy = cylinder({ x: fb.x, y: fb.y, length: 68, half, cap: 0.32 })
      return muscleCell(g, cy, { id: `muscle-fibre-${i + 1}`, pal: STRIATED, w: 10, nuclei: [{ x: fb.x + 20, y: fb.y + half - 2.5, size: 11, ratio: 0.28 }, { x: fb.x - 14, y: fb.y + half - 2.5, size: 11, ratio: 0.28 }], stripes: { spacing: 3, width: 3.6, gap: 1.2 }, shine: { length: 10, near: 40, centre: [fb.x, fb.y], lean: 0.3 } })
    })
    const fibreParts = { defs: rs.map((r) => r.defs).join(''), body: rs.map((r) => r.body).join(''), parts: [['muscle fibre', STRIATED]], pts: rs.flatMap((r) => r.pts) }
    const cell = fieldCell(g, neuron, { id: 'motor-neuron', scale: 1, w: 9, pal: NEURON, nuclei: [{ x: soma[0], y: soma[1], size: 11, ratio: 0.9 }], nucW: 8, shine: { length: 6, near: 50, lean: 0.6 } })
    // Myelin: segments of sheath along the trunk and on each branch before its end plate, as on the approved Neuron.
    const seg = (a, b, r) => g.line([a, b], MYELIN.outline, B(2 * r * g.k) + 8) + g.line([a, b], MYELIN.base, B(2 * r * g.k))
    let my = [[runs[0] + 4, runs[1] - 7], [runs[1] + 4, runs[2] - 7]].map(([a, b]) => seg([trunkX, a], [trunkX, b], 2.6)).join('')
    my += fibres.map((fb, i) => seg([trunkX + 9, runs[i]], [fb.plate - 13, runs[i]], 2.4)).join('')
    const myelin = { defs: '', body: `<g id="myelin">${my}</g>`, parts: [['myelin', MYELIN]] }
    return join(fibreParts, cell, myelin)
  })
}

check()
console.log('written to', OUT)
