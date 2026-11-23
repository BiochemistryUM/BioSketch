// Shared parts of the redrawn icons, group "cellforms": cells whose shape is drawn from a few numbers instead of by hand.
// A spindle (fibroblast, smooth muscle cell, myoblast, pericyte, any elongated cell), a stellate cell (activated
// fibroblast, myofibroblast, astrocyte-like or dendritic shapes), the flat glow of a fluorescent cell, and the helpers
// they share. Promoted from the fibroblast pilot (../cells/fibroblast-family.mjs), whose look the owner approved on
// 23 November 2026. Each part is a function `part(g, { x, y, size, turn, id, w, pal, ...options })` that returns
// { defs, body, parts } (and `pts`, `field`, `at` for fitting and placing), drawn in the frame `g` of `page()`
// (../cellkit.mjs). `size` is the longer extent of the cell in g's units (outline left out); without `size` the cell's
// own units are g's units (`scale` sets the factor by hand). With `size` the cell's box is centred on x, y; with `scale`
// (or neither) its own 0,0 lies at x, y. `turn` turns it about x, y in degrees (clockwise, as SVG).
// Every id inside starts with `id`. Positions given in the options (nuclei, vesicles, fibres) are in the cell's own
// units, centred on 0,0 with the long axis along x, before `turn`: they move, scale and turn with the cell.
//
// ---------- How the outlines are made ----------
// A cell is a distance field (a function of a point: below zero inside), traced into a path by marching squares on a
// grid over the cell's own box only (1.25 px steps by default, `grid`), with its glow rings traced from the same grid.
// The pilot traced the whole 512 page once per ring; this is about twenty times faster.
//
// ---------- Conventions ----------
//   Palettes   FIBRO soft(PEACH), the approved Fibroblast; MYO the myofibroblast's warmer, deeper peach (35°) with
//              FIBRES, its stress fibres of α-smooth muscle actin, deep(357); VES the aqua (200°) of the vesicle part.
//              The nucleus is the shared lilac NUC, drawn by `nucleus` of ./organelles.mjs.
//   Fluorescent GFP (green 150), RFP (mCherry, red 20), YFP (yellow 100), CFP (cyan 215), each bright (base l 0.86,
//              chroma up to 0.17) with `hue` for its glow; DAPI deep(265) for a stained nucleus. Use them as `pal` with
//              `glow`, or `fluorescentCellType` for an approved cell type.
//   Outlines   from the size on the page, as tissue.mjs's cellW and nucW, but read off the cell's thickness, not its
//              length (`lineOf`: 3.5 to 11 px), and `nucW(px)` of the nucleus (at most 8). A highlight from 80 px on; below 60 px no vesicles or fibres.
//   Which part  spindleCell for a cell with one long axis (resting fibroblast, smooth muscle, myoblast, pericyte on a
//              vessel, a dividing cell with `waist`); stellateCell for a body with several processes (activated
//              fibroblast, myofibroblast); glow to make any of them, or any drawing, fluorescent; fieldCell to draw a
//              field of your own (two fields joined with `smin`, a field moved with `moved`).
import { NUC, PEACH, page } from '../cellkit.mjs'
import { deep, hueGap, hueOf, soft, toHex, toLch } from '../colour.mjs'
import { catmull, f, gradient2, pathOf, simplify, smin, strokeScale } from '../shapes.mjs'
import { nucleus } from './organelles.mjs'
import { nucW, placeCellType } from './tissue.mjs'

// ---------- palettes ----------
export const FIBRO = soft(PEACH)
export const MYO_H = 35
export const MYO = { light: toHex({ l: 0.975, c: 0.018, h: MYO_H }), base: toHex({ l: 0.9, c: 0.06, h: MYO_H }), shadow: toHex({ l: 0.83, c: 0.085, h: MYO_H }), small: toHex({ l: 0.74, c: 0.1, h: MYO_H }), outline: toHex({ l: 0.55, c: 0.12, h: MYO_H }) }
export const FIBRES = deep(357)
export const VES = soft(200)
/** A bright fluorescent palette in one hue (as the pilot's GFP), with `hue` for its glow. */
export const fluo = (h) => ({ hue: h, light: toHex({ l: 0.96, c: 0.07, h }), base: toHex({ l: 0.86, c: 0.17, h }), shadow: toHex({ l: 0.77, c: 0.18, h }), small: toHex({ l: 0.7, c: 0.17, h }), outline: toHex({ l: 0.55, c: 0.15, h }) })
export const GFP = fluo(150)
export const RFP = fluo(20) // mCherry, tdTomato
export const YFP = fluo(100)
export const CFP = fluo(215)
export const DAPI = { ...deep(265), hue: 265 }

// ---------- helpers ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const rad = (d) => (d * Math.PI) / 180
const rot = ([u, v], deg) => { const c = Math.cos(rad(deg)), s = Math.sin(rad(deg)); return [u * c - v * s, u * s + v * c] }
const boxOf = (pts, pad) => [Math.min(...pts.map((p) => p[0])) - pad, Math.min(...pts.map((p) => p[1])) - pad, Math.max(...pts.map((p) => p[0])) + pad, Math.max(...pts.map((p) => p[1])) + pad]
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
const hueFrom = (pal) => pal.hue ?? toLch(pal.base).h

// =====================================================================================================================
// Fields. A field is { field(u, v), ext } in units: the signed distance to the outline (below zero inside) and a box that
// holds the shape. The makers below work in the cell's own units, centred on 0,0.
// =====================================================================================================================

/** A tube along points `axis` (units), its half width `half(t)` at the share t of its length (0 to 1). */
export function tubeField(axis, half, per = 16) {
  const pts = catmull(axis, per), L = [0]
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  // Each segment keeps its two end widths (half is read once per point of the axis, linear in between: the segments are
  // under a unit long) and the larger of them, so that most segments are passed over without working out a width.
  const total = L.at(-1), hs = L.map((l) => half(l / total))
  const segs = pts.slice(1).map((b, i) => { const a = pts[i], dx = b[0] - a[0], dy = b[1] - a[1]; return { ax: a[0], ay: a[1], dx, dy, q: 1 / (dx * dx + dy * dy || 1), ha: hs[i], dh: hs[i + 1] - hs[i], hm: Math.max(hs[i], hs[i + 1]) } })
  // Far from the tube the exact distance does not matter (only outlines and halos close to it are traced): a box test.
  const M = 25, wide = Math.max(...Array.from({ length: 41 }, (_, i) => half(i / 40))), [bx0, by0, bx1, by1] = boxOf(pts, wide + M)
  const field = (u, v) => {
    if (u < bx0 || u > bx1 || v < by0 || v > by1) return M + Math.hypot(Math.max(bx0 - u, 0, u - bx1), Math.max(by0 - v, 0, v - by1))
    let d = Infinity
    for (const sg of segs) {
      const px = u - sg.ax, py = v - sg.ay, t = (px * sg.dx + py * sg.dy) * sg.q, s = t < 0 ? 0 : t > 1 ? 1 : t
      const ex = px - s * sg.dx, ey = py - s * sg.dy, r2 = ex * ex + ey * ey, lim = d + sg.hm
      if (lim > 0 && r2 >= lim * lim) continue
      const e = Math.sqrt(r2) - (sg.ha + s * sg.dh)
      if (e < d) d = e
    }
    return d
  }
  // A point and the direction of the axis at share t, for placing parts along the cell.
  const at = (t) => {
    const want = t * total, i = clamp(L.findIndex((l) => l >= want), 1, pts.length - 1), a = pts[i - 1], b = pts[i], s = (want - L[i - 1]) / (L[i] - L[i - 1] || 1)
    return { p: [a[0] + s * (b[0] - a[0]), a[1] + s * (b[1] - a[1])], deg: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI }
  }
  return { field, at, axis: pts, ext: boxOf(pts, wide) }
}

/**
 * The field of a spindle, along x before `turn`. Options (units):
 *   length, width (or aspect = length / width), bend (how far the axis bows; an S when `s`), taper (1 a plain spindle,
 *   2 long thin tips), body (0 one even spindle; above 0 a fuller body of that share of the length with processes
 *   beyond it, `process` their half width as a share of width), waist (two daughters joined at a pinch that share of
 *   width wide), shift (the widest part towards one end, −0.2 to 0.2), turn.
 */
export function spindleField({ length = 96, width, aspect, bend = 3, s = false, taper = 1, body = 0, process = 0.22, waist = 0, shift = 0, turn = 0 } = {}) {
  width ??= aspect ? length / aspect : 14
  const h = length / 2, n = 9
  const axis = Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1), u = -h + length * t
    const v = s ? bend * Math.sin(2 * Math.PI * t) * Math.sin(Math.PI * t) * 1.3 : -bend * Math.sin(Math.PI * t)
    return rot([u, v], turn)
  })
  const W = width / 2, tip = 0.7
  const warp = (t) => clamp(t - shift * Math.sin(Math.PI * t), 0, 1)
  let half
  if (waist) {
    const one = (t) => Math.sin(Math.PI * t) ** taper, pinch = W * waist
    half = (t) => tip + (W - tip) * one(t < 0.5 ? t * 2 : t * 2 - 1) + (pinch - tip) * Math.exp(-(((t - 0.5) / 0.035) ** 2))
  } else if (body) {
    const P = W * process
    half = (t) => { const w = warp(t); return tip + (P - tip) * Math.sin(Math.PI * w) ** 0.7 + (W - P) * Math.exp(-(((w - 0.5) / (body / 2)) ** 2)) * Math.sin(Math.PI * w) }
  } else half = (t) => tip + (W - tip) * Math.sin(Math.PI * warp(t)) ** taper
  const tube = tubeField(axis, half)
  return { ...tube, ext: boxOf(tube.axis, W + 1), length, width, thick: body ? width * 0.8 : width }
}

/**
 * The field of a stellate cell: an oval body (rx, ry, tilt) with tapering processes, joined smoothly (`join`, units).
 * `processes` is a list [{ deg, length, width, bend }] (direction, length from the middle, width at the root, bow) or a
 * number, with `seed`, for that many spread round the body with lengths and widths of their own; `taper` 1 evenly, 2
 * quickly.
 */
export function stellateField({ rx = 22, ry = 15, tilt = 0, processes = 5, seed = 1, join = 7, taper = 1 } = {}) {
  if (typeof processes === 'number') {
    const rnd = mulberry(seed), n = processes
    processes = Array.from({ length: n }, (_, i) => ({ deg: (360 / n) * i + (rnd() - 0.5) * 40, length: 32 + rnd() * 20, width: 7 + rnd() * 4, bend: (rnd() - 0.5) * 12 }))
  }
  const arms = processes.map(({ deg, length, width, bend = 0 }) => {
    const pts = [0, 0.33, 0.66, 1].map((t) => rot([length * t, bend * Math.sin(Math.PI * t) * t], deg))
    return tubeField(pts, (t) => 0.8 + (width / 2 - 0.8) * (1 - t) ** taper, 10)
  })
  const c = Math.cos(rad(-tilt)), sn = Math.sin(rad(-tilt))
  const oval = (u, v) => { const a = u * c - v * sn, b = u * sn + v * c, k = Math.hypot(a / rx, b / ry); return (k - 1) * Math.min(rx, ry) }
  const field = (u, v) => arms.reduce((d, arm) => smin(d, arm.field(u, v), join), oval(u, v))
  const tips = arms.flatMap((a) => a.axis)
  return { field, arms, rx, ry, tilt, thick: 2 * Math.min(rx, ry), ext: boxOf([...tips, ...[0, 90, 180, 270].map((d) => rot([Math.cos(rad(d)) * rx, Math.sin(rad(d)) * ry], tilt))], 6) }
}

/** The same field moved by (dx, dy) units. */
export const moved = (fd, dx, dy) => ({ ...fd, field: (u, v) => fd.field(u - dx, v - dy), ext: [fd.ext[0] + dx, fd.ext[1] + dy, fd.ext[2] + dx, fd.ext[3] + dy], at: fd.at && ((t) => { const r = fd.at(t); return { ...r, p: [r.p[0] + dx, r.p[1] + dy] } }) })

// =====================================================================================================================
// Tracing. `contours` evaluates a field once on a grid over a box of the page and returns the outline at every level
// asked for (the cell at 0, its glow rings further out), as point lists in page pixels, longest loop first.
// =====================================================================================================================
function loopsAt(val, nx, ny, level) {
  const W = nx + 1, at = (i, j) => val[j * W + i] - level
  // Edges as numbers: 2·(j·W + i) for the edge to the right of (i, j), +1 for the edge below it.
  const point = (e) => {
    const k = e >> 1, i = k % W, j = (k - i) / W, a = at(i, j)
    if (e & 1) { const b = at(i, j + 1); return [i, j + a / (a - b)] }
    const b = at(i + 1, j); return [i + a / (a - b), j]
  }
  const next = new Map()
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const idx = (at(i, j) < 0) * 8 + (at(i + 1, j) < 0) * 4 + (at(i + 1, j + 1) < 0) * 2 + (at(i, j + 1) < 0)
      if (idx === 0 || idx === 15) continue
      const top = 2 * (j * W + i), right = 2 * (j * W + i + 1) + 1, bottom = 2 * ((j + 1) * W + i), left = 2 * (j * W + i) + 1
      // Inside on the right of the direction of travel: every loop runs the same way round (as `trace` of ../shapes.mjs).
      const table = {
        1: [[bottom, left]], 2: [[right, bottom]], 3: [[right, left]], 4: [[top, right]], 5: [[top, left], [bottom, right]], 6: [[top, bottom]], 7: [[top, left]],
        8: [[left, top]], 9: [[bottom, top]], 10: [[left, bottom], [right, top]], 11: [[right, top]], 12: [[left, right]], 13: [[bottom, right]], 14: [[left, bottom]],
      }
      for (const [a, b] of table[idx]) next.set(a, b)
    }
  const loops = [], seen = new Set()
  for (const k0 of next.keys()) {
    if (seen.has(k0)) continue
    const loop = []
    let k = k0
    while (next.has(k) && !seen.has(k)) { seen.add(k); loop.push(point(k)); k = next.get(k) }
    if (loop.length > 8) loops.push(loop)
  }
  return loops.sort((a, b) => b.length - a.length)
}
/** Outlines of `fn(px, py)` (page pixels) at each level, on a grid of `step` px over the box [x0, y0, x1, y1]. */
export function contours(fn, [x0, y0, x1, y1], levels, step = 1.25) {
  const nx = Math.ceil((x1 - x0) / step), ny = Math.ceil((y1 - y0) / step), val = new Float64Array((nx + 1) * (ny + 1))
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) val[j * (nx + 1) + i] = fn(x0 + i * step, y0 + j * step)
  return levels.map((L) => loopsAt(val, nx, ny, L).map((loop) => loop.map(([i, j]) => [x0 + i * step, y0 + j * step])))
}

// The map from a cell's own units to the frame: x, y, a scale and a turn.
function placer(x, y, sc, turn) {
  const c = Math.cos(rad(turn)), s = Math.sin(rad(turn))
  return {
    sc, turn,
    to: ([u, v]) => [x + sc * (u * c - v * s), y + sc * (u * s + v * c)],
    from: (U, V) => { const a = (U - x) / sc, b = (V - y) / sc; return [a * c + b * s, -a * s + b * c] },
  }
}
/** A field in the cell's units as a field in frame units, placed by `m`. */
const placedField = (fd, m) => (U, V) => m.sc * fd.field(...m.from(U, V))

/** The outline of a field placed by `m` and its rings `grows` (frame units) further out, as paths and page points. */
function outlines(g, fd, m, grows = [], step = 1.25) {
  const F = placedField(fd, m), X0 = g.X(0), Y0 = g.Y(0)
  const corners = [[fd.ext[0], fd.ext[1]], [fd.ext[2], fd.ext[1]], [fd.ext[0], fd.ext[3]], [fd.ext[2], fd.ext[3]]].map(m.to)
  const pad = (Math.max(0, ...grows) + 2) * g.k + 3
  const box = [Math.min(...corners.map((p) => g.X(p[0]))) - pad, Math.min(...corners.map((p) => g.Y(p[1]))) - pad, Math.max(...corners.map((p) => g.X(p[0]))) + pad, Math.max(...corners.map((p) => g.Y(p[1]))) + pad]
  const levels = [0, ...grows]
  const all = contours((px, py) => F((px - X0) / g.k, (py - Y0) / g.k), box, levels.map((l) => l), step)
  // Every loop is kept (a dividing cell drawn small can part at its waist; a glow can hold a hole between processes,
  // which runs the other way round and stays empty).
  return all.map((loops) => { const ls = loops.map((l) => simplify(l, 0.15)); return { d: ls.map(pathOf).join(' '), pts: ls.flat() } })
}

// =====================================================================================================================
// Helpers of the cells: the highlight, stress fibres, vesicles placed by themselves.
// =====================================================================================================================

/**
 * Where the highlight of a cell goes (in the cell's units): the point furthest up and left that lies `depth` inside it
 * and clear of the nuclei, with the direction of the edge there. `lean` weighs left against up (0.4; more to prefer
 * the left). Example: shineAt(fd, [{ x: 0, y: 0, size: 26 }], { length: 13, near: 30 })
 */
export function shineAt(fd, nuclei, { length, near = 30, depth = 4, lean = 0.4, turn = 0 }) {
  const inNucleus = (u, v) => nuclei.some(({ x, y, size, ratio = 0.43, turn = 0 }) => { const [a, b] = rot([u - x, v - y], -turn); return Math.hypot(a / (size / 2 + length * 0.3 + 2), b / ((size * ratio) / 2 + 3)) < 1 })
  // "Up and left" on the page: with the cell turned, the score is taken in page directions.
  const [ux, uy] = rot([1, 0], turn), [vx, vy] = rot([0, 1], turn)
  let best = null
  for (let u = -near; u <= near; u += 0.5)
    for (let v = -near; v <= near; v += 0.5) {
      if (fd.field(u, v) > -depth || inNucleus(u, v)) continue
      const gx = fd.field(u + 0.5, v) - fd.field(u - 0.5, v), gy = fd.field(u, v + 0.5) - fd.field(u, v - 0.5)
      let deg = (Math.atan2(gy, gx) * 180) / Math.PI + 90
      deg = ((deg + 90) % 180 + 180) % 180 - 90
      const [ex, ey] = rot([length / 2, 0], deg)
      if (fd.field(u + ex, v + ey) > -depth * 0.6 || fd.field(u - ex, v - ey) > -depth * 0.6) continue
      const score = u * uy + v * vy + lean * (u * ux + v * vx)
      if (!best || score < best.score) best = { x: u, y: v, turn: deg, score }
    }
  return best ?? { x: 0, y: 0, turn: 0 }
}

/**
 * Straight stress fibres across a cell, each cut to the longest stretch lying `inset` inside it, with a dot at each end
 * (a focal adhesion). In the cell's units: count, spread (half the distance between the outer two), turn, at (their
 * middle), width (px), pal (FIBRES). Returns the lines in the cell's units, for drawing with `m`.
 * Example (inside fieldCell): fibres: { count: 5, spread: 11, turn: -2 }
 */
export function stressFibres(fd, { count = 5, spread = 10, turn = 0, inset = 2.2, at = [0, 0] } = {}) {
  const lines = []
  for (let i = 0; i < count; i++) {
    const off = count === 1 ? 0 : -spread + (2 * spread * i) / (count - 1)
    let best = null, start = null
    for (let s = -70; s <= 70.01; s += 0.25) {
      const [u, v] = rot([s, off], turn), inside = fd.field(u + at[0], v + at[1]) < -inset
      if (inside && start === null) start = s
      if ((!inside || s >= 70) && start !== null) { if (!best || s - start > best[1] - best[0]) best = [start, s - 0.25]; start = null }
    }
    if (best && best[1] - best[0] > 8) lines.push([rot([best[0], off], turn), rot([best[1], off], turn)].map(([u, v]) => [u + at[0], v + at[1]]))
  }
  return lines
}

/** `n` vesicles placed by themselves inside a field, clear of the edge, the nuclei and each other (cell's units). */
function placeVesicles(fd, nuclei, n, size, seed = 3) {
  const rnd = mulberry(seed), out = [], [x0, y0, x1, y1] = fd.ext
  const inNucleus = (u, v) => nuclei.some(({ x, y, size: s, ratio = 0.43, turn = 0 }) => { const [a, b] = rot([u - x, v - y], -turn); return Math.hypot(a / (s / 2 + size), b / ((s * ratio) / 2 + size)) < 1 })
  for (let tries = 0; tries < 4000 && out.length < n; tries++) {
    const u = x0 + rnd() * (x1 - x0), v = y0 + rnd() * (y1 - y0), r = size * (0.8 + rnd() * 0.3)
    if (fd.field(u, v) > -(r / 2 + 2.5) || inNucleus(u, v) || out.some(([a, b, s]) => Math.hypot(a - u, b - v) < (s + r) / 2 + 2)) continue
    out.push([u, v, r])
  }
  return out
}

// =====================================================================================================================
// Glow: flat halos stepping from the colour of a fluorescent cell out to the page (no opacity, no blur).
// =====================================================================================================================
/** The halo tones of a hue, innermost first (as the pilot). */
export const glowTones = (hue, steps = 3) => Array.from({ length: steps }, (_, i) => { const t = (i + 1) / (steps + 1); return toHex({ l: 0.9 + 0.08 * t, c: 0.11 * (1 - t) + 0.015, h: hue }) })

// The scale a transform attribute applies (rough: the square root of its determinant).
function scaleOf(t) {
  let s = 1
  for (const [, fn, args] of t.matchAll(/(\w+)\(([^)]*)\)/g)) {
    const a = args.split(/[\s,]+/).filter(Boolean).map(Number)
    if (fn === 'scale') s *= Math.sqrt(Math.abs(a[0] * (a[1] ?? a[0])))
    else if (fn === 'matrix') s *= Math.sqrt(Math.abs(a[0] * a[3] - a[1] * a[2]))
  }
  return s
}
/**
 * A copy of any SVG drawing grown `grow` page pixels all round, in one flat colour: every shape is filled and stroked
 * with `tone`, its outline widened by 2·grow (round joins and caps), ids dropped. Under the drawing it is a halo of its
 * outline. Shapes inside scaled groups are widened in the group's own units, so the halo is even on the page.
 */
export function grownCopy(svg, tone, grow) {
  const stack = [1], out = []
  let skip = 0
  for (const m of svg.matchAll(/<(\/?)([\w:-]+)([^>]*?)(\/?)>|[^<]+/g)) {
    const [all, close, tag, attrs = '', self] = m
    if (!tag) { if (!skip) out.push(all); continue }
    if (/^(defs|clipPath|mask|linearGradient|radialGradient|pattern|title|desc|style)$/.test(tag)) { if (!self) skip += close ? -1 : 1; continue }
    if (skip) continue
    if (tag === 'g') {
      if (close) { stack.pop(); out.push('</g>'); continue }
      const t = (attrs.match(/\btransform="([^"]*)"/) || [])[1]
      stack.push(stack.at(-1) * (t ? scaleOf(t) : 1))
      out.push(`<g${t ? ` transform="${t}"` : ''}>`)
      if (self) { stack.pop(); out.push('</g>') }
      continue
    }
    if (!/^(path|circle|ellipse|rect|polygon|polyline|line)$/.test(tag) || close) continue
    const fill = (attrs.match(/\bfill="([^"]*)"/) || [])[1], stroke = (attrs.match(/\bstroke="([^"]*)"/) || [])[1]
    const sw = +((attrs.match(/\bstroke-width="([^"]*)"/) || [])[1] ?? 1)
    const filled = fill !== 'none' && tag !== 'line' && tag !== 'polyline', stroked = stroke && stroke !== 'none'
    if (!filled && !stroked) continue
    const width = (stroked ? sw : 0) + (2 * grow) / stack.at(-1) / strokeScale() // the halo keeps its width under setStrokeScale
    const keep = attrs.replace(/\s(id|fill|stroke|stroke-width|stroke-linejoin|stroke-linecap|stroke-dasharray|class|style)="[^"]*"/g, '')
    out.push(`<${tag}${keep} fill="${filled ? tone : 'none'}" stroke="${tone}" stroke-width="${f(width)}" stroke-linejoin="round" stroke-linecap="round"/>`)
  }
  return out.join('')
}

/**
 * The glow of a fluorescent cell: `steps` flat rings `gap` apart, from the light tone of `pal`'s hue out to nearly white,
 * drawn under the cell. Two ways:
 *   glow(g, { field, ext, ... })  round a field in frame units (as fieldCell does; `gap` in frame units)
 *   glow(g, { svg, ... })         round any drawing, e.g. an approved cell type placed (`gap` in page pixels): the
 *                                 drawing is copied in each tone and grown (grownCopy), outermost and palest first.
 * Options: pal (GFP), hue (else pal's), steps (3), gap, id. Returns { defs, body, parts, pts } (pts for a field only).
 * Example: glow(g, { svg: placed.body, pal: GFP, gap: 12 })
 */
export function glow(g, { field, ext, svg, pal = GFP, hue, steps = 3, gap, id = 'glow', grid = 1.25 }) {
  const tones = glowTones(hue ?? hueFrom(pal), steps).reverse() // outermost and palest first
  if (svg !== undefined) {
    gap ??= 4 * g.k
    return { defs: '', body: `<g id="${id}">${tones.map((c, i) => grownCopy(svg, c, gap * (steps - i))).join('')}</g>`, parts: [] }
  }
  gap ??= 4
  const fd = { field, ext }, m = placer(0, 0, 1, 0)
  const rings = outlines(g, fd, m, tones.map((_, i) => gap * (steps - i)), grid).slice(1)
  return { defs: '', body: `<g id="${id}">${rings.map((o, i) => `<path d="${o.d}" fill="${tones[i]}"/>`).join('')}</g>`, parts: [], pts: rings[0].pts }
}

/** The outline of a cell from its thickness on the page (`thick` of its field, in px): 11 on a full-page spindle, 5 on
 *  a cell 30 px thick, 3.5 at the least (the cell outline of tissue.mjs's cellW, read off the thickness: these cells are
 *  long and thin, and an outline taken from their length would fill them). */
const lineOf = (fd, k) => f(clamp(1.5 + ((fd.thick ?? Math.max(fd.ext[2] - fd.ext[0], fd.ext[3] - fd.ext[1]) * 0.25) * k) / 8, 3.5, 11))

// =====================================================================================================================
// fieldCell: draws a field as a cell. spindleCell and stellateCell are this with their field and defaults.
// =====================================================================================================================
/**
 * Draws a field (in the cell's units) as a cell: outline and gradient in `pal`, a highlight at the top left, nuclei,
 * vesicles, stress fibres and a glow. Options (the cell's units unless said):
 *   x, y, size or scale, turn   where and how large (see the top of this file)
 *   pal (FIBRO), w (outline px), grid (tracing step, px)
 *   nuclei    [{ x, y, size, ratio, turn, nucleolus, pores, chromatin }] (./organelles.mjs nucleus), nucPal (NUC), nucW
 *   vesicles  [[x, y, size]] or a number of them placed by themselves; vesPal (VES), vesSize
 *   fibres    stressFibres options plus width (px) and pal (FIBRES); true for five along the cell
 *   glow      { steps, gap } or true: halos round the cell in pal's hue (for GFP and the other fluorescent palettes)
 *   shine     { length, near, lean } or false: the highlight; drawn from 80 px on
 *   under     svg drawn under the cell (collagen leaving it); its parts are the caller's
 * Returns also pts (page points with a radius, for fitting), field (frame units), at(t) (a spindle's axis, frame units).
 * Example: fieldCell(g, stellateField({ processes: 6 }), { x: 0, y: 0, size: 80, nuclei: [{ x: 0, y: 0, size: 24, ratio: 0.6 }] })
 */
export function fieldCell(g, fd, { x = 0, y = 0, size, scale, turn = 0, id = 'cell', w, pal = FIBRO, nuclei = [], nucPal = NUC, nucW: nw, vesicles = [], vesPal = VES, vesSize, fibres, glow: halo, shine, under = '', grid = 1.25 }) {
  const ext = Math.max(fd.ext[2] - fd.ext[0], fd.ext[3] - fd.ext[1])
  let sc = scale ?? (size ? size / ext : 1)
  // `size` is the drawn extent, outline included: the box of a field is only roughly the cell's, so the outline is traced
  // once at a coarse step and the scale corrected from what it measures.
  if (size && scale === undefined) {
    const trial = outlines(g, fd, placer(x, y, sc, turn), [], 2.5)[0].pts, xs = trial.map((p) => p[0]), ys = trial.map((p) => p[1])
    const got = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)), want = size * g.k
    const ratio = (want - (w ?? lineOf(fd, sc * g.k))) / got
    sc *= ratio
    // Centred on x, y by its box (a stellate cell's processes are seldom even round its body).
    const cx = ((Math.max(...xs) + Math.min(...xs)) / 2 - g.X(0)) / g.k, cy = ((Math.max(...ys) + Math.min(...ys)) / 2 - g.Y(0)) / g.k
    x -= (cx - x) * ratio; y -= (cy - y) * ratio
  }
  const m = placer(x, y, sc, turn), px = size ? size * g.k : ext * sc * g.k
  w ??= lineOf(fd, sc * g.k)
  if (halo === true) halo = {}
  // The glow's rings are `gap` of the cell's units apart (3.4, as the pilot), never under 2.5 px.
  const steps = halo ? halo.steps ?? 3 : 0, gap = halo ? Math.max((halo.gap ?? 3.4) * sc, 2.5 / g.k) : 0
  const rings = outlines(g, fd, m, Array.from({ length: steps }, (_, i) => gap * (steps - i)), grid)
  const o = rings[0]
  const xs = o.pts.map((p) => p[0]), ys = o.pts.map((p) => p[1])
  let defs = gradient2(`${id}-gradient`, [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], pal.base, pal.shadow), body = '', parts = [['cytoplasm', pal]]
  let pts = o.pts.map(([a, b]) => [a, b, w / 2])
  if (halo) {
    const tones = glowTones(hueFrom(pal), steps).reverse()
    body += `<g id="${id}-glow">${rings.slice(1).map((r, i) => `<path d="${r.d}" fill="${tones[i]}"/>`).join('')}</g>\n`
    pts = rings[1].pts.map(([a, b]) => [a, b, 0])
  }
  body += under
  body += `<g id="${id}-cytoplasm"><path d="${o.d}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="${w}" stroke-linejoin="round"/>`
  if (shine !== false && px >= 80) {
    const sh = { length: 10, near: 20, ...shine }
    const s = shineAt(fd, nuclei, { ...sh, depth: (2.4 + (w * 0.5 + 6) / g.k) / sc, turn })
    const [hx, hy] = m.to([s.x, s.y])
    body += g.hl(hx, hy, f(sh.length * sc * g.k * 0.5), f(clamp(px / 50, 2.5, 5)), f(s.turn + turn), pal.light)
  }
  body += '</g>\n'
  if (fibres && px >= 60) {
    const fo = fibres === true ? { count: 5, spread: (fd.width ?? 14) * 0.3 } : fibres
    const { pal: fp = FIBRES, width = clamp(px / 100, 2, 4.5) } = fo
    const lines = stressFibres(fd, fo).map((l) => l.map(m.to))
    body += `<g id="${id}-stress-fibres">${lines.map((l) => g.line(l, fp.small, width)).join('')}${lines.flatMap((l) => l.map(([u, v]) => g.circle(u, v, (width * 0.9) / g.k, fp.outline))).join('')}</g>\n`
    parts.push(['stress fibres', fp])
  }
  if (typeof vesicles === 'number') vesicles = px >= 60 ? placeVesicles(fd, nuclei, vesicles, vesSize ?? ext * 0.045) : []
  if (vesicles.length) {
    body += `<g id="${id}-vesicles">${vesicles.map(([a, b, s]) => { const [u, v] = m.to([a, b]); return g.circle(u, v, (s * sc) / 2, vesPal.small) }).join('')}</g>\n`
    parts.push(['vesicles', vesPal])
  }
  nuclei.forEach(({ x: nx, y: ny, size: ns, ratio = 0.43, turn: nt = 0, nucleolus = false, pores, chromatin }, i) => {
    const [u, v] = m.to([nx, ny])
    const n = nucleus(g, { x: u, y: v, size: ns * sc, turn: nt + turn, oval: ratio, nucleolus, pores, chromatin, id: nuclei.length > 1 ? `${id}-nucleus-${i + 1}` : `${id}-nucleus`, w: nw ?? Math.min(8, nucW(ns * sc * g.k)), pal: nucPal })
    defs += n.defs; body += n.body + '\n'
  })
  if (nuclei.length) parts.push(['nucleus', nucPal])
  const F = placedField(fd, m)
  const at = fd.at && ((t) => { const r = fd.at(t); return { p: m.to(r.p), deg: r.deg + turn } })
  return { defs, body, parts, pts, field: F, at }
}

/**
 * Spindle cell: one long axis, tapering to both ends. Fibroblast (resting), smooth muscle cell, myoblast, pericyte.
 * Options: the shape of spindleField (length, width or aspect, bend, s, taper, body, process, waist, shift), then
 * nucleus ({ x, y, size, ratio, turn, nucleolus } or false; by default one oval nucleus at the widest place, two for a
 * dividing cell with `waist`), nuclei (a full list instead), and the extras of fieldCell (vesicles, fibres, glow, shine,
 * pal, nucPal, under). `turn` turns the whole cell; the shape's own `shapeTurn` turns the axis inside it.
 * Example: spindleCell(g, { x: 0, y: 0, size: 90, aspect: 6, s: true, nucleus: { nucleolus: true }, vesicles: 4 })
 */
export function spindleCell(g, { length = 96, width, aspect, bend = 3, s = false, taper = 1, body = 0, process = 0.22, waist = 0, shift = 0, shapeTurn = 0, nucleus: nuc = {}, nuclei, shine, ...rest }) {
  const fd = spindleField({ length, width, aspect, bend, s, taper, body, process, waist, shift, turn: shapeTurn })
  if (!nuclei && nuc) {
    const W = fd.width, one = (t, size) => { const { p, deg } = fd.at(t); return { x: p[0], y: p[1], size, ratio: clamp((W * 0.62) / size, 0.3, 0.75), turn: deg, ...nuc } }
    nuclei = waist ? [one(0.26, Math.min(length * 0.18, W * 1.3)), one(0.74, Math.min(length * 0.18, W * 1.3))].map((n, i) => ({ ...n, ...(Array.isArray(nuc) ? nuc[i] : {}) })) : [one(clamp(0.5 - shift, 0.2, 0.8), nuc.size ?? Math.min(length * 0.3, W * 1.8))]
  }
  return fieldCell(g, fd, { nuclei: nuclei || [], shine: shine ?? { length: Math.min(13, length * 0.13), near: length * 0.3 }, ...rest })
}

/**
 * Stellate cell: an oval body with processes. Fibroblast spread on a stiff surface, myofibroblast (with fibres and MYO).
 * Options: the shape of stellateField (rx, ry, tilt, processes as a list or a count with seed, join, taper), nucleus
 * ({ size, ratio, ... } or false; by default an oval in the body along its tilt), nuclei, and the extras of fieldCell.
 * Example: stellateCell(g, { x: 0, y: 0, size: 100, processes: 6, seed: 4, nucleus: { nucleolus: true }, glow: true, pal: RFP, nucPal: DAPI })
 */
export function stellateCell(g, { rx = 22, ry = 15, tilt = 0, processes = 5, seed = 1, join = 7, taper = 1, nucleus: nuc = {}, nuclei, shine, ...rest }) {
  const fd = stellateField({ rx, ry, tilt, processes, seed, join, taper })
  if (!nuclei && nuc) { const size = nuc.size ?? rx * 1.23; nuclei = [{ x: 0, y: 0, size, ratio: clamp((ry * 1.1) / size, 0.4, 0.9), turn: tilt, ...nuc }] }
  return fieldCell(g, fd, { nuclei: nuclei || [], shine: shine ?? { length: 10 * (rx / 22), near: 20 * (rx / 22) }, ...rest })
}

// =====================================================================================================================
// A fluorescent version of an approved cell type.
// =====================================================================================================================
// A colour of the soft look moved into another palette at the same place on its ladder (light, base, shadow, small,
// outline): lightness and chroma are read off the target palette between its steps.
const LADDER = [0.985, 0.93, 0.87, 0.8, 0.6]
function onLadder(hex, pal) {
  const L = toLch(hex).l, steps = [pal.light, pal.base, pal.shadow, pal.small, pal.outline].map(toLch), h = hueFrom(pal)
  if (L >= LADDER[0]) return toHex({ ...steps[0], h })
  for (let i = 1; i < LADDER.length; i++)
    if (L >= LADDER[i]) { const t = (LADDER[i - 1] - L) / (LADDER[i - 1] - LADDER[i]); return toHex({ l: steps[i - 1].l + t * (steps[i].l - steps[i - 1].l), c: steps[i - 1].c + t * (steps[i].c - steps[i - 1].c), h }) }
  return toHex({ l: Math.max(0.3, steps[4].l - (0.6 - L)), c: steps[4].c, h })
}
const greyOf = (hex) => { const c = toLch(hex); return toHex({ l: c.l, c: 0.006, h: 90 }) } // a warm grey: its hue stays clear of DAPI's

/**
 * An approved cell type (placeCellType of ./tissue.mjs) as it looks labelled: every coloured part in `pal` (GFP), its
 * nucleus in `nucleus` (DAPI), parts named in `unlabelled` (e.g. ['myelin']) in greys, and a glow round its whole
 * outline (glow with `svg`). Options: those of placeCellType, glow ({ steps, gap } in px, or false).
 * Example: fluorescentCellType(g, 'Neuron', { x: 0, y: 0, size: 100, unlabelled: ['myelin'] })
 */
export function fluorescentCellType(g, name, { x, y, size, turn = 0, id, w, flip, pal = GFP, nucleus: nucPal = DAPI, unlabelled = [], glow: halo = {} }) {
  id ??= name.replace(/\W+/g, '-').toLowerCase()
  const placed = placeCellType(g, name, { x, y, size, turn, id, w, flip })
  // Cut the drawing at its groups (`${id}-name`), recolour each, and the gradients each one uses.
  const modeOf = (part) => (/nucle/.test(part) ? 'nucleus' : unlabelled.includes(part) ? 'grey' : 'label')
  const map = { label: (h) => (toLch(h).c < 0.012 ? h : onLadder(h, pal)), nucleus: (h) => (toLch(h).c < 0.012 ? h : onLadder(h, nucPal)), grey: greyOf }
  const gradMode = {}
  const body = placed.body.replace(new RegExp(`(<g id="${id}-([\\w-]+)"[^>]*>)([\\s\\S]*?)(?=<g id="${id}-|$)`, 'g'), (all, open, part, inner) => {
    const mode = modeOf(part)
    for (const [, gid] of inner.matchAll(/url\(#([\w-]+)\)/g)) gradMode[gid] = mode
    return open + inner.replace(/#[0-9A-Fa-f]{6}\b/g, map[mode])
  }).replace(/^([\s\S]*?)(?=<g id="[\w-]+-)/, (head) => head.replace(/#[0-9A-Fa-f]{6}\b/g, map.label))
  const defs = placed.defs.replace(/<(linearGradient|radialGradient)\b[^>]*id="([\w-]+)"[\s\S]*?<\/\1>/g, (all, tag, gid) => all.replace(/#[0-9A-Fa-f]{6}\b/g, map[gradMode[gid] ?? 'label']))
  const parts = [['cell', pal], ['nucleus', nucPal]]
  if (unlabelled.length) parts.push(['unlabelled', { base: toHex({ l: 0.9, c: 0.006, h: 90 }) }])
  if (halo === false) return { defs, body, parts }
  const h = glow(g, { svg: body, pal, id: `${id}-glow`, steps: halo.steps ?? 3, gap: halo.gap ?? Math.max(2.5, size * g.k * 0.03) })
  return { defs, body: h.body + '\n' + body, parts }
}

// =====================================================================================================================
// Fitting a drawing to the icon: drawn on a trial page, measured from its `pts`, drawn again at the scale that leaves
// 26 px margins on its longer side, centred (or at a given scale). For whole icons made of one of these cells.
// Example: fitted(cellType, 'Fibroblast (resting)', (g) => spindleCell(g, { ... }))
// =====================================================================================================================
export function fitted(cellType, name, draw, { scale } = {}) {
  const cOf = (g) => [(256 - g.X(0)) / g.k, (256 - g.Y(0)) / g.k]
  let g = page(scale ?? 4.6, [0, 0])
  for (let pass = 0; pass < 3; pass++) {
    const { pts } = draw(g)
    const x0 = Math.min(...pts.map(([x, , r]) => x - r)), x1 = Math.max(...pts.map(([x, , r]) => x + r)), y0 = Math.min(...pts.map(([, y, r]) => y - r)), y1 = Math.max(...pts.map(([, y, r]) => y + r))
    const [cx, cy] = cOf(g), toU = (p, c0) => (p - 256) / g.k + c0
    const u0 = toU(x0, cx), u1 = toU(x1, cx), v0 = toU(y0, cy), v1 = toU(y1, cy)
    const k = scale ?? g.k * (460 / Math.max(x1 - x0, y1 - y0))
    g = page(k, [(u0 + u1) / 2, (v0 + v1) / 2])
  }
  const r = draw(g)
  cellType(name, r.parts, r.defs, r.body)
  return g.k
}

// ---------- demos (sheet.mjs) ----------
const SMOOTH = soft(hueOf('#FFDFE0')) // the approved Smooth muscle cell's rose
const PERI = soft(hueOf('#D7EAFF')) // the approved Pericyte's blue
const join = (...rs) => ({ defs: rs.map((r) => r.defs).join(''), body: rs.map((r) => r.body).join('\n'), parts: rs.flatMap((r) => r.parts).filter(([n], i, all) => all.findIndex(([m]) => m === n) === i) })
export const DEMOS = [
  { name: 'Spindle cell', size: 100, draw: (g) => spindleCell(g, { size: 100, width: 17, bend: 3.5, s: true, taper: 1.4, nucleus: { ratio: 0.36 } }) },
  { name: 'Spindle cell, long tips', size: 100, draw: (g) => spindleCell(g, { size: 100, width: 18, taper: 2.2, bend: 2 }) },
  { name: 'Spindle cell, bowed', size: 100, draw: (g) => spindleCell(g, { size: 100, width: 16, bend: 10 }) },
  { name: 'Spindle cell with processes', size: 100, draw: (g) => spindleCell(g, { size: 100, width: 33, bend: 4, s: true, body: 0.52, process: 0.3, shift: 0.04, w: 11, nucleus: { nucleolus: true, ratio: 0.58, size: 32 }, vesicles: 4 }) },
  { name: 'Spindle cell, dividing', size: 100, draw: (g) => spindleCell(g, { size: 100, width: 23, bend: 3, taper: 1.2, waist: 0.2 }) },
  { name: 'Spindle cell with stress fibres', size: 100, draw: (g) => spindleCell(g, { size: 100, width: 26, bend: 3, taper: 1.2, pal: MYO, fibres: { count: 4, spread: 6.5 }, nucleus: { ratio: 0.5 } }) },
  { name: 'Spindle cell, turned', size: 100, draw: (g) => spindleCell(g, { size: 100, turn: 35, width: 17, bend: 3.5, s: true, taper: 1.4, vesicles: 3 }) },
  { name: 'Spindle cell, small', size: 100, draw: (g) => spindleCell(g, { size: 22, width: 17, bend: 3.5, s: true, taper: 1.4, vesicles: 3 }) },
  { name: 'Smooth muscle cell from the spindle', size: 100, draw: (g) => spindleCell(g, { size: 100, aspect: 7, bend: 2, taper: 1.1, pal: SMOOTH, nucleus: { ratio: 0.3, size: 34 } }) },
  { name: 'Pericyte from the spindle', size: 100, draw: (g) => spindleCell(g, { size: 100, width: 14, bend: 14, taper: 1.6, pal: PERI, nucleus: { ratio: 0.55, size: 20 } }) },
  { name: 'Spindle cell, GFP', size: 100, draw: (g) => spindleCell(g, { size: 88, width: 17, bend: 3.5, s: true, taper: 1.4, pal: GFP, nucPal: DAPI, glow: true, nucleus: { ratio: 0.36 } }) },
  { name: 'Stellate cell', size: 100, draw: (g) => stellateCell(g, { size: 100, rx: 22, ry: 17, tilt: -8, join: 9, processes: [{ deg: 192, length: 50, width: 17, bend: 5 }, { deg: 8, length: 46, width: 17, bend: -6 }, { deg: 112, length: 37, width: 14, bend: 6 }, { deg: 300, length: 35, width: 14, bend: -5 }, { deg: 243, length: 28, width: 12, bend: 4 }], nucleus: { nucleolus: true }, vesicles: 4 }) },
  { name: 'Stellate cell, seven processes', size: 100, draw: (g) => stellateCell(g, { size: 100, processes: 7, seed: 5 }) },
  { name: 'Stellate cell, thin processes', size: 100, draw: (g) => stellateCell(g, { size: 100, rx: 17, ry: 14, processes: 6, seed: 2, taper: 2, join: 5 }) },
  { name: 'Stellate cell with stress fibres', size: 100, draw: (g) => stellateCell(g, { size: 100, rx: 28, ry: 16, tilt: -4, join: 10, pal: MYO, processes: [{ deg: 186, length: 53, width: 19, bend: 4 }, { deg: 4, length: 53, width: 19, bend: -4 }, { deg: 128, length: 32, width: 13, bend: 5 }, { deg: 302, length: 32, width: 13, bend: -5 }, { deg: 58, length: 27, width: 11, bend: -4 }], nucleus: { size: 23, ratio: 0.55, nucleolus: true }, fibres: { count: 5, spread: 11, turn: -2, width: 5, inset: 2.8 } }) },
  { name: 'Stellate cell, small', size: 100, draw: (g) => stellateCell(g, { size: 24, processes: 5, seed: 1 }) },
  { name: 'Stellate cell, RFP', size: 100, draw: (g) => stellateCell(g, { size: 86, processes: 6, seed: 4, pal: RFP, nucPal: DAPI, glow: true }) },
  { name: 'Spindle cell, YFP', size: 100, draw: (g) => spindleCell(g, { size: 88, width: 20, bend: 5, pal: YFP, nucPal: DAPI, glow: true }) },
  { name: 'Spindle cell, CFP', size: 100, draw: (g) => spindleCell(g, { size: 88, width: 20, bend: 5, pal: CFP, nucPal: DAPI, glow: true }) },
  { name: 'Glow round two cells', size: 100, draw: (g) => {
    const a = spindleField({ length: 60, width: 14, turn: 30 }), b = stellateField({ rx: 12, ry: 10, processes: 4, seed: 7 })
    const fd = { field: (u, v) => smin(a.field(u + 18, v), b.field(u - 22, v - 4), 6), ext: [-60, -40, 60, 40] }
    return fieldCell(g, fd, { size: 86, pal: GFP, nucPal: DAPI, glow: true, nuclei: [{ x: -18, y: 0, size: 14, ratio: 0.5, turn: 30 }, { x: 22, y: 4, size: 13, ratio: 0.75 }] })
  } },
  { name: 'Macrophage, GFP', size: 100, draw: (g) => fluorescentCellType(g, 'Macrophage', { x: 0, y: 0, size: 84 }) },
  { name: 'T cell, GFP', size: 100, draw: (g) => fluorescentCellType(g, 'T cell', { x: 0, y: 0, size: 84 }) },
  { name: 'Neuron, GFP', size: 100, draw: (g) => fluorescentCellType(g, 'Neuron', { x: 0, y: 0, size: 84, unlabelled: ['myelin'] }) },
  { name: 'Neuron, RFP', size: 100, draw: (g) => fluorescentCellType(g, 'Neuron', { x: 0, y: 0, size: 84, pal: RFP }) },
  { name: 'Macrophage, GFP small', size: 100, draw: (g) => fluorescentCellType(g, 'Macrophage', { x: 0, y: 0, size: 25 }) },
  { name: 'Two cells side by side', size: 100, draw: (g) => join(spindleCell(g, { id: 'cell-1', x: -20, y: -12, size: 60, turn: -15, width: 16, s: true, bend: 3 }), stellateCell(g, { id: 'cell-2', x: 22, y: 18, size: 50, processes: 5, seed: 3 })) },
]
