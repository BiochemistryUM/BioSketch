// A family of one cell type in its shapes and states: the cardiomyocyte as an isolated adult rod or block (with one or
// two nuclei), branched, in concentric and eccentric hypertrophy, wavy, joined to its neighbours by intercalated discs.
// BioSketch's own drawings in the soft look of
// icon-drawings/STYLE.md, in the colours of the approved Cardiomyocyte (./tissue.mjs: the muscle rose soft(15), the
// lilac nucleus NUC), with the shared nucleus part of ../parts/organelles.mjs. No SiliCoDraw original: the list is the
// owner's.
//
// The outlines are distance fields traced into paths (`trace` of ../shapes.mjs), as in ./fibroblast-family.mjs, written
// so that they can become a shared `muscleCell` part:
//   muscleField:  a cell made of straight limbs (body, arms, branches) joined smoothly, each end round, open or cut in
//                 steps where an intercalated disc joined a neighbour; bowed or waved as a whole; it also gives the
//                 position along the myofibrils (`phi`), so that the striations run across every limb and follow its bends
//   spreadField:  a spread cultured cell: a rounded polygon with lumpy or drawn-out corners
//   muscleCell:   draws either field as a cell: outline, gradient, highlight, striations (dense across the limbs, or in
//                 patches for a spread cell), intercalated discs as darker stepped lines, nuclei
// Sizes: a sarcomere is about 2 µm whatever the cell, so every icon uses one spacing of the striations, and the rod,
// the hypertrophied cells and the branched pair are drawn at one scale, not each filling the page.
// Usage: node cardiomyocyte-family.mjs <folder>
import { NUC, cellTypes, glossOn, page } from '../cellkit.mjs'
import { soft } from '../colour.mjs'
import { f, gradient2, pathOf, simplify, smax, smin, trace, segDist } from '../shapes.mjs'
import { nucleus } from '../parts/organelles.mjs'
import { pathToFileURL } from 'node:url'

const OUT = process.argv[2]
const { cellType, check } = cellTypes(OUT)

const MUSCLE = 15 // the rose of the approved Cardiomyocyte and every muscle cell (OKLCH hue); the nucleus lilac is 319°
const CYTO = soft(MUSCLE)
const SPACING = 3.4 // striations, units apart (one every 3–4 % of a rod's length)

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const rad = (d) => (d * Math.PI) / 180
const rot = ([u, v], deg) => { const c = Math.cos(rad(deg)), s = Math.sin(rad(deg)); return [u * c - v * s, u * s + v * c] }
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
/** Signed distance to a box with rounded corners (centre cx, cy; half sizes hx, hy; radius r). */
const sdBox = (x, y, cx, cy, hx, hy, r) => {
  const dx = Math.abs(x - cx) - hx + r, dy = Math.abs(y - cy) - hy + r
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - r
}

// =====================================================================================================================
// Fields: functions of a point in units (the 100 box of page()), the signed distance to the outline, below zero inside.
// =====================================================================================================================

/**
 * The bands of a cut end: the width of a limb (−half to half across) split into `steps.length` bands of slightly uneven
 * width, each ending `steps[i]` units beyond (or short of) the limb's end. A stepped, ragged end where an intercalated
 * disc joined the next cell.
 */
function bandsOf(half, steps, seed) {
  const n = steps.length, rnd = mulberry(seed), cuts = [-half]
  for (let i = 1; i < n; i++) cuts.push(-half + ((2 * half) / n) * (i + (rnd() - 0.5) * 0.35))
  cuts.push(half)
  return steps.map((o, i) => ({ n0: cuts[i], n1: cuts[i + 1], o }))
}
/** Ragged steps for a cut end: `count` bands, alternating out and in by about `depth` units. */
export const raggedSteps = (count, depth, seed) => { const rnd = mulberry(seed * 7 + 3); return Array.from({ length: count }, (_, i) => depth * ((i % 2 ? -0.5 : 0.5) + (rnd() - 0.5) * 0.7)) }

/**
 * One limb: a straight bar from `from` along `deg`, `length` long, `half` wide on each side. Ends (`start`, `end`):
 * 'open' (runs on into what it joins), 'round', or 'disc' (cut in steps, `startSteps` / `endSteps`: offsets in units,
 * one per band, from raggedSteps). `wobble` makes the sides slightly irregular (units).
 */
function limb({ from, deg, length, half, start = 'open', end = 'open', startSteps, endSteps, wobble = 0, seed = 1 }) {
  const d = [Math.cos(rad(deg)), Math.sin(rad(deg))], nr = [-d[1], d[0]], r = Math.min(1.8, half * 0.2), ov = r + 0.4
  const local = (u, v) => { const x = u - from[0], y = v - from[1]; return [x * d[0] + y * d[1], x * nr[0] + y * nr[1]] }
  const bS = start === 'disc' ? bandsOf(half, startSteps ?? raggedSteps(3, 3, seed), seed) : null
  const bE = end === 'disc' ? bandsOf(half, endSteps ?? raggedSteps(3, 3, seed + 1), seed + 5) : null
  const a = start === 'open' ? -half * 0.9 : start === 'round' ? half : -Math.min(...bS.map((b) => b.o))
  const b = end === 'open' ? length : end === 'round' ? length - half : length + Math.min(...bE.map((x) => x.o))
  const boxes = [[a, b, -half, half]]
  if (bS) for (const x of bS) boxes.push([-x.o, a + 2, Math.max(-half, x.n0 - ov), Math.min(half, x.n1 + ov)])
  if (bE) for (const x of bE) boxes.push([b - 2, length + x.o, Math.max(-half, x.n0 - ov), Math.min(half, x.n1 + ov)])
  const ph = seed * 1.7
  const field = (u, v) => {
    const [s, n] = local(u, v)
    let e = Infinity
    for (const [s0, s1, n0, n1] of boxes) e = smin(e, sdBox(s, n, (s0 + s1) / 2, (n0 + n1) / 2, (s1 - s0) / 2, (n1 - n0) / 2, r), r * 0.8)
    if (start === 'round') e = Math.min(e, Math.hypot(s - a, n) - half)
    if (end === 'round') e = Math.min(e, Math.hypot(s - b, n) - half)
    if (wobble) e += wobble * (Math.sin(0.21 * s + ph + (n > 0 ? 0 : 2.1)) + 0.55 * Math.sin(0.47 * s + 2 * ph + (n > 0 ? 1 : 0)))
    return e
  }
  // A point of the limb from its own coordinates (along s, across n).
  const point = (s, n) => [from[0] + d[0] * s + nr[0] * n, from[1] + d[1] * s + nr[1] * n]
  // The position along the myofibrils: grows along the limb, in the sense of x, from the x of its start.
  const sign = d[0] >= 0 ? 1 : -1, phi = (u, v) => from[0] + sign * local(u, v)[0]
  return { field, phi, point, half, length, deg, local }
}

/**
 * A muscle cell made of limbs, as one field. Options:
 *   limbs   [limb options] (see `limb`): the first is the body, the others arms and branches joined to it
 *   join    how softly limbs run into each other (units)
 *   bow     how far the whole cell bends (units), over x from `span[0]` to `span[1]`; waves: 0 for one bow, 1 or more for
 *           that many whole waves (a wavy cell)
 * Returns the field and phi in units of the page, `at(i, s, n)` (a point of limb i on the page, with the direction of
 * the cell there), and `disc(i, s, steps)` (a stepped line across limb i at s, for an intercalated disc inside a chain).
 */
export function muscleField({ limbs, join = 7, bow = 0, waves = 0, span }) {
  const L = limbs.map(limb)
  const [u0, u1] = span ?? [Math.min(...limbs.map((l) => l.from[0])), Math.max(...limbs.map((l) => l.from[0] + l.length * Math.cos(rad(l.deg))))]
  const bend = (u) => { const t = clamp((u - u0) / (u1 - u0), 0, 1); return waves ? bow * Math.sin(2 * Math.PI * waves * t) : -bow * Math.sin(Math.PI * t) }
  const slope = (u) => (bend(u + 0.05) - bend(u - 0.05)) / 0.1
  // Straight coordinates of a point of the page (units), and back. Across the cell, distances are kept along the normal.
  const straight = (u, v) => { const c = 1 / Math.sqrt(1 + slope(u) ** 2); return [u, (v - bend(u)) * c] }
  const bent = ([u, v]) => [u, v * Math.sqrt(1 + slope(u) ** 2) + bend(u)]
  const raw = (u, v) => L.reduce((e, l, i) => (i ? smin(e, l.field(u, v), join) : l.field(u, v)), Infinity)
  const field = (u, v) => raw(...straight(u, v))
  const phi = (u, v) => {
    const [x, y] = straight(u, v)
    let W = 0, P = 0
    for (const l of L) { const w = Math.exp(-clamp(l.field(x, y), -12, 30) / 2.5); W += w; P += w * l.phi(x, y) }
    return P / W
  }
  const at = (i, s, n = 0) => { const [x, y] = L[i].point(s, n), p = bent([x, y]); return { p, deg: L[i].deg + (Math.atan(slope(x)) * 180) / Math.PI } }
  const disc = (i, s, steps, seed = 3) => {
    const l = L[i], bands = bandsOf(l.half, steps, seed), pts = []
    bands.forEach(({ n0, n1, o }) => { pts.push(l.point(s + o, n0), l.point(s + o, n1)) })
    return pts.map(bent)
  }
  return { field, phi, at, disc, kind: 'limbs' }
}

/**
 * A spread cultured cell (neonatal or iPSC-derived): a polygon `points` (units) with corners rounded by `round`, edges
 * pulled in by `hollow` between the corners, and an uneven edge (`lumps` units, `seed`).
 */
export function spreadField({ points, round = 6, hollow = 0, lumps = 0, seed = 1 }) {
  const n = points.length, cx = points.reduce((s, p) => s + p[0], 0) / n, cy = points.reduce((s, p) => s + p[1], 0) / n
  const corners = points.map(([x, y]) => Math.atan2(y - cy, x - cx)), rnd = mulberry(seed)
  const waves = [5, 7, 9, 12].map((k) => ({ k, ph: rnd() * 6.28, a: lumps * (0.5 + rnd() * 0.5) / Math.sqrt(k / 5) }))
  const poly = (x, y) => {
    // Distance to a polygon (exact), negative inside.
    let d = Infinity, inside = false
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const [xi, yi] = points[i], [xj, yj] = points[j]
      d = Math.min(d, segDist(x, y, points[j], points[i]))
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
    }
    return inside ? -d : d
  }
  // Shrink by `round` and grow back: rounded corners.
  const field = (x, y) => {
    const th = Math.atan2(y - cy, x - cx)
    let e = poly(x, y) + round * 0.35
    if (hollow) { const near = Math.max(...corners.map((a) => Math.cos(th - a))); e += hollow * (1 - near) * 2 }
    for (const w of waves) e += w.a * Math.sin(w.k * th + w.ph)
    return e
  }
  return { field, phi: null, kind: 'spread', centre: [cx, cy] }
}

// =====================================================================================================================
// Drawing
// =====================================================================================================================

const cxOf = (g) => (256 - g.X(0)) / g.k
const cyOf = (g) => (256 - g.Y(0)) / g.k
/** A field traced on the page: every loop, as point lists in pixels. */
const loopsOf = (g, field) => trace((i, j) => field((i - 256) / g.k + cxOf(g), (j - 256) / g.k + cyOf(g)))

/** Signed distance (rough) to an ellipse of half axes a, b turned by deg about x, y. */
const ellipseF = (u, v, { x, y, a, b, deg }) => { const [p, q] = rot([u - x, v - y], -deg); return (Math.hypot(p / a, q / b) - 1) * Math.min(a, b) }

/** Where the highlight goes: the point furthest up and left that lies `depth` inside the cell and clear of the nuclei. */
function shineAt(fd, keep, { length, near = 40, depth = 4, lean = 0.4, centre = [0, 0] }) {
  let best = null
  for (let u = centre[0] - near; u <= centre[0] + near; u += 0.5)
    for (let v = centre[1] - near; v <= centre[1] + near; v += 0.5) {
      if (fd.field(u, v) > -depth || keep.some((k) => ellipseF(u, v, k) < 2.5)) continue
      const gx = fd.field(u + 0.5, v) - fd.field(u - 0.5, v), gy = fd.field(u, v + 0.5) - fd.field(u, v - 0.5)
      let deg = (Math.atan2(gy, gx) * 180) / Math.PI + 90
      deg = (((deg + 90) % 180) + 180) % 180 - 90
      const [ex, ey] = rot([length / 2, 0], deg)
      if (fd.field(u + ex, v + ey) > -depth * 0.6 || fd.field(u - ex, v - ey) > -depth * 0.6) continue
      if (keep.some((k) => ellipseF(u + ex, v + ey, k) < 2 || ellipseF(u - ex, v - ey, k) < 2)) continue
      const score = v + lean * u
      if (!best || score < best.score) best = { x: u, y: v, turn: deg, score }
    }
  return best ?? { x: centre[0], y: centre[1], turn: 0 }
}

/**
 * Draws a field of muscleField or spreadField as a cardiomyocyte (or any striated muscle cell). Options (units unless said):
 *   id, pal (the cytoplasm), w (outline, px)
 *   nuclei    [{ x, y, size, ratio, turn, nucleolus }] on the page (the shared nucleus part; ratio 1 for a round one)
 *   stripes   { spacing, width (px), gap (clear of nuclei) }: the striations, across the myofibrils (muscleField only).
 *             Below 60 px on the page they are half as many and half again as thick; below 30 px left out.
 *   patches   [{ x, y, deg, length, half }]: for a spread cell, bundles of myofibrils along `deg`, each striated
 *   discs     [[points]]: intercalated discs inside a chain of cells, as stepped lines in the outline tone (`discW` px)
 *   shine     { length, near, lean, centre }: the highlight, put by itself at the top left, clear of the nuclei
 */
export function muscleCell(g, fd, { id = 'cardiomyocyte', pal = CYTO, w = 11, nuclei = [], stripes = {}, patches, discs = [], discW = 6.5, shine }) {
  const loops = loopsOf(g, fd.field), pts = simplify(loops[0], 0.15)
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
  const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], px = Math.max(box[2] - box[0], box[3] - box[1])
  let defs = gradient2(`${id}-gradient`, box, pal.base, pal.shadow), body = ''
  const keep = nuclei.map(({ x, y, size, ratio = 0.55, turn = 0 }) => ({ x, y, a: size / 2, b: (size * ratio) / 2, deg: turn }))
  let hl = null
  // With the gloss of cells on (setGloss of ../cellkit.mjs) there is no highlight, so the striations run through its place.
  if (shine && !glossOn()) { hl = shineAt(fd, keep, { ...shine, depth: 2.6 + (w * 0.5 + 6) / g.k }); keep.push({ x: hl.x, y: hl.y, a: (shine.length * 0.5 * 0.55) + 0.6, b: 5 / g.k + 0.6, deg: hl.turn }) }
  body += `<g id="${id}-cytoplasm"><path d="${pathOf(pts)}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="${w}" stroke-linejoin="round"/>`
  if (hl) body += g.hl(hl.x, hl.y, f(shine.length * g.k * 0.5 * 0.55 * 2 / 2), 5, hl.turn, pal.light)
  body += '</g>\n'

  // Striations: thin bands across the myofibrils, traced as one field, kept inside the outline, off the nuclei and the
  // highlight, and off the intercalated discs.
  if (px >= 30) {
    const few = px < 60
    const P = (stripes.spacing ?? SPACING) * (few ? 2 : 1), hw = ((stripes.width ?? 3.8) * (few ? 1.5 : 1)) / 2 / g.k
    const inset = (w / 2) / g.k + 1.3, gap = stripes.gap ?? 1.8
    const discSegs = discs.map((line) => line.slice(1).map((b, i) => [line[i], b])).flat()
    const band = (phi) => { const m = (((phi % P) + P) % P); return Math.min(m, P - m) - hw }
    const field = (u, v) => {
      const cell = fd.field(u, v)
      if (cell > -inset + 0.5) return 1
      let e
      if (patches) {
        e = Infinity
        for (const pt of patches) {
          const [s, n] = rot([u - pt.x, v - pt.y], -pt.deg)
          const mask = sdBox(s, n, 0, 0, pt.length / 2, pt.half, pt.half * 0.9)
          e = Math.min(e, smax(band(s + (pt.phase ?? 0)), mask, 0.4))
        }
      } else e = band(fd.phi(u, v))
      e = smax(e, cell + inset, 0.5)
      for (const k of keep) e = Math.max(e, gap - ellipseF(u, v, k))
      for (const [a, b] of discSegs) e = Math.max(e, 2.0 - segDist(u, v, a, b))
      return e
    }
    const bands = loopsOf(g, field).map((l) => simplify(l, 0.2))
    body += `<g id="${id}-striations">${bands.map((l) => `<path d="${pathOf(l)}" fill="${pal.small}"/>`).join('')}</g>\n`
  }
  if (discs.length) body += `<g id="${id}-intercalated-discs">${discs.map((l) => g.line(l, pal.outline, discW)).join('')}</g>\n`
  nuclei.forEach(({ x, y, size, ratio = 0.55, turn = 0, nucleolus = false }, i) => {
    const n = nucleus(g, { x, y, size, turn, oval: ratio === 1 ? false : ratio, nucleolus, id: nuclei.length > 1 ? `${id}-nucleus-${i + 1}` : `${id}-nucleus`, pal: NUC })
    defs += n.defs; body += n.body + '\n'
  })
  const parts = [['cytoplasm', pal]]
  if (nuclei.length) parts.push(['nucleus', NUC])
  return { defs, body, parts, pts: pts.map(([x, y]) => [x, y, w / 2]) }
}

/** Nuclei along limb `i` of a muscleField at the shares s (units along it), each turned with the cell there. */
const along = (fd, i, list) => list.map(({ s, n = 0, ...o }) => { const { p, deg } = fd.at(i, s, n); return { x: p[0], y: p[1], turn: deg, ...o } })

// =====================================================================================================================
// Fitting: drawn once on a trial page, measured, drawn again at the scale that leaves 26 px margins on its longer side,
// centred. With `scale`, drawn at that scale (to keep sizes comparable across icons), centred.
// =====================================================================================================================
function fitted(name, draw, { scale } = {}) {
  let g = page(scale ?? 2.6, [0, 0])
  for (let pass = 0; pass < 2; pass++) {
    const { pts } = draw(g)
    const x0 = Math.min(...pts.map(([x, , r]) => x - r)), x1 = Math.max(...pts.map(([x, , r]) => x + r)), y0 = Math.min(...pts.map(([, y, r]) => y - r)), y1 = Math.max(...pts.map(([, y, r]) => y + r))
    const toU = (p, c0) => (p - 256) / g.k + c0, [cx, cy] = [cxOf(g), cyOf(g)]
    const k = scale ?? g.k * (460 / Math.max(x1 - x0, y1 - y0))
    g = page(k, [(toU(x0, cx) + toU(x1, cx)) / 2, (toU(y0, cy) + toU(y1, cy)) / 2])
  }
  const r = draw(g)
  cellType(name, r.parts, r.defs, r.body)
  return g.k
}
/** The scale at which a drawing fills the page (for drawing others at the same scale). */
function scaleOf(draw) {
  let k = 2.6
  for (let pass = 0; pass < 2; pass++) {
    const { pts } = draw(page(k, [0, 0]))
    const x0 = Math.min(...pts.map(([x, , r]) => x - r)), x1 = Math.max(...pts.map(([x, , r]) => x + r)), y0 = Math.min(...pts.map(([, y, r]) => y - r)), y1 = Math.max(...pts.map(([, y, r]) => y + r))
    k *= 460 / Math.max(x1 - x0, y1 - y0)
  }
  return k
}

// =====================================================================================================================
// The icons (drawn only when this file is run, not when another script imports its functions)
// =====================================================================================================================
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {

/** A straight or bent rod (or block): one limb cut in steps at both ends. */
const rod = ({ length, half, bow = 1.5, waves = 0, wobble = 0, steps = 3, depth = 3, seed = 1, branches = [] }) => muscleField({
  limbs: [{ from: [-length / 2, 0], deg: 0, length, half, start: 'disc', end: 'disc', startSteps: raggedSteps(steps, depth, seed), endSteps: raggedSteps(steps, depth, seed + 2), wobble, seed }, ...branches],
  bow, waves, span: [-length / 2, length / 2], join: 6,
})
const draw = (fd, nuclei, o = {}) => (g) => muscleCell(g, fd, { nuclei: along(fd, 0, nuclei), shine: { length: 14, near: 70, lean: 0.25 }, ...o })

// ---------- rods, and hypertrophy at the rod's scale ----------
// Isolated adult cells: a rod about 5 : 1, cut in steps at both ends where the intercalated discs were. Concentric
// hypertrophy adds myofibrils side by side (wider, as long); eccentric adds sarcomeres end to end (longer, thinner).
const ROD = { length: 100, half: 10, seed: 3 }
const ECC = { length: 128, half: 7.5, seed: 9, depth: 2.6 }
const CON = { length: 100, half: 17, steps: 4, depth: 3.4, seed: 5, wobble: 0.5 }
const rodScale = scaleOf(draw(rod(ECC), [{ s: 64, size: 17, ratio: 0.42 }]))
fitted('Cardiomyocyte (rod)', draw(rod(ROD), [{ s: 50, size: 18, ratio: 0.48 }]), { scale: rodScale })
fitted('Cardiomyocyte (rod, binucleate)', draw(rod(ROD), [{ s: 37, size: 16, ratio: 0.5 }, { s: 63, size: 16, ratio: 0.5 }]), { scale: rodScale })
fitted('Cardiomyocyte (concentric hypertrophy)', draw(rod(CON), [{ s: 50, size: 24, ratio: 0.6 }]), { scale: rodScale })
fitted('Cardiomyocyte (concentric hypertrophy, binucleate)', draw(rod(CON), [{ s: 35, size: 21, ratio: 0.6 }, { s: 65, size: 21, ratio: 0.6 }]), { scale: rodScale })
fitted('Cardiomyocyte (eccentric hypertrophy)', draw(rod(ECC), [{ s: 64, size: 18, ratio: 0.42 }]), { scale: rodScale })
fitted('Cardiomyocyte (eccentric hypertrophy, binucleate)', draw(rod(ECC), [{ s: 49, size: 16, ratio: 0.45 }, { s: 79, size: 16, ratio: 0.45 }]), { scale: rodScale })

// ---------- blocks ----------
// The second common shape of isolated cells: shorter, wider, slightly irregular. Each fills the page.
const BLOCK = { length: 74, half: 17, steps: 4, depth: 3.2, wobble: 0.8, bow: 1, seed: 11 }
fitted('Cardiomyocyte (block)', draw(rod(BLOCK), [{ s: 37, size: 21, ratio: 0.56 }]))
fitted('Cardiomyocyte (block, binucleate)', draw(rod(BLOCK), [{ s: 25, size: 18, ratio: 0.56 }, { s: 50, size: 18, ratio: 0.56 }]))

// ---------- branched ----------
// In the heart wall: a body whose two ends both split into two arms (an H or X), each arm cut in steps at its
// intercalated disc, one large oval nucleus in the middle. The hypertrophic one is wider and larger, at the same scale.
const branched = ({ body = 36, half = 10.5, arm = 38, armHalf = 8.5, spread = 27, seed = 21 }) => {
  const b = body / 2 - 3, arms = [-spread, spread, 180 + spread, 180 - spread].map((deg, i) => ({
    from: [i < 2 ? b : -b, 0], deg, length: arm, half: armHalf, end: 'disc', endSteps: raggedSteps(3, 2.8, seed + i), seed: seed + i,
  }))
  return muscleField({ limbs: [{ from: [-body / 2, 0], deg: 0, length: body, half, seed }, ...arms], join: 4, bow: 1.5, span: [-body / 2 - arm, body / 2 + arm] })
}
const BR = branched({}), BRH = branched({ body: 42, half: 16, arm: 44, armHalf: 13, spread: 29, seed: 31 })
const branchScale = scaleOf(draw(BRH, [{ s: 21, size: 28, ratio: 0.58 }]))
fitted('Cardiomyocyte (branched)', draw(BR, [{ s: 18, size: 21, ratio: 0.55 }]), { scale: branchScale })
fitted('Cardiomyocyte (branched, hypertrophic)', draw(BRH, [{ s: 21, size: 28, ratio: 0.58 }]), { scale: branchScale })

// ---------- wavy ----------
// A rod bent gently like a wave (as cells lie in a relaxed or fixed muscle), two nuclei; one with a short side branch.
const WAVY = { length: 112, half: 9.5, bow: 6, waves: 1, seed: 41 }
fitted('Cardiomyocyte (wavy, binucleate)', draw(rod(WAVY), [{ s: 42, size: 15, ratio: 0.5 }, { s: 70, size: 15, ratio: 0.5 }]))
fitted('Cardiomyocyte (wavy, binucleate, branched)', draw(rod({ ...WAVY, branches: [{ from: [16, 0], deg: -58, length: 30, half: 7, end: 'disc', endSteps: raggedSteps(3, 2.4, 44), seed: 44 }] }), [{ s: 36, size: 15, ratio: 0.5 }, { s: 82, size: 15, ratio: 0.5 }]))

// ---------- joined ----------
// Three cells in a chain: the left cell and the middle one end to end, the middle one branching, the third continuing
// its upper arm. The intercalated discs between them are darker stepped lines; the free ends are cut in steps.
{
  const fd = muscleField({
    limbs: [
      { from: [-66, 2], deg: 0, length: 76, half: 10.5, start: 'disc', startSteps: raggedSteps(3, 3, 51), seed: 51 },
      { from: [6, 2], deg: -26, length: 58, half: 9, end: 'disc', endSteps: raggedSteps(3, 2.6, 52), seed: 52 },
      { from: [6, 2], deg: 30, length: 34, half: 8.5, end: 'disc', endSteps: raggedSteps(3, 2.6, 53), seed: 53 },
    ],
    join: 4.5, bow: 2, span: [-66, 58],
  })
  const discs = [fd.disc(0, 34, [2.4, -1.6, 1.8], 61), fd.disc(1, 28, [-2, 2.2, -1.2], 62)]
  fitted('Cardiomyocytes (joined)', (g) => muscleCell(g, fd, {
    id: 'cardiomyocytes', discs,
    nuclei: [...along(fd, 0, [{ s: 16, size: 16, ratio: 0.5 }, { s: 56, size: 16, ratio: 0.5 }]), ...along(fd, 1, [{ s: 45, size: 14, ratio: 0.52 }])],
    shine: { length: 13, near: 70, lean: 0.25 },
  }))
}

// The spread cultured cells (neonatal and iPSC-derived) were removed at the owner's request on 23 November 2026;
// `spreadField` is kept for other icons.

check()
console.log('written to', OUT)
}
