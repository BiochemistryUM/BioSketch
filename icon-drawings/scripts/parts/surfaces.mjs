// Parts: shaded surfaces with depth, in the soft look of icon-drawings/STYLE.md. A globular protein drawn as a lumpy
// surface (as space-filling models are drawn: overlapping beads, lit from the top left, darker hollows between them, a
// shadow side at the bottom right), in five shapes, and a red blood cell whose rim and dimple show depth.
// Asked for by the owner on 23 November 2026 after seeing another product's icons (the idea only; nothing copied).
//
// Every part is `part(g, { x, y, size, turn, id, w, pal, ...options })` and returns `{ defs, body, parts }`, as the
// other modules of ../parts/: `g` a frame of `page` (../cellkit.mjs), `x, y, size` in its units (`size` the longer
// extent, outline included), `turn` in degrees about x, y, `w` the outline in page pixels (by default from the size on
// the page), `pal` the palette. Every id inside starts with `id`.
//
// How the depth is built (no opacity, filters or blend modes; only gradients and flat shapes):
// - Protein: a body (ball, cylinder, arc …) is covered with beads in 3-D; seen from the front, each bead is a circle.
//   The outline is the smooth union of all circles, traced as one path (`contours` of cellforms.mjs). Under the beads
//   the outline is filled with the deep "hollow" tone, which shows in the notches between beads. The beads are drawn far
//   to near, each a circle with a radial gradient lit from its top left, ringed by a thin line of the hollow tone where
//   it lies over another (the crevice). A bead takes one of four gradients by how much its patch of the body faces the
//   light, so the whole body has a lit side and a shadow side. A flat shadow band, traced from the outline, darkens the
//   bottom right edge. Below about 60 px on the page the protein is flat: fewer, larger lumps, one linear gradient.
//   `turn` turns the body, not the light: the light stays at the top left.
// - Red blood cell: flat shapes traced from fields (the cell, its rim, its dimple, crescents cut from them by shifted
//   copies) with linear gradients; the rim is lit on top and shaded below, the dimple darker with its far wall lit.
//
// Example: shadedProtein(g, { x: 0, y: 0, size: 60, shape: 'arc', turn: 30, pal: soft(250) })
import { deep, hueOf, rich, soft, toHex, toLch } from '../colour.mjs'
import { f, pathOf, simplify } from '../shapes.mjs'
import { contours } from './cellforms.mjs'
import { RED } from './tissue.mjs'
import { BLUE, NUC } from '../cellkit.mjs'

// ---------- palettes ----------
export const AMBER = rich(75) // the set's free protein (molecules.mjs)
export const BLUE_PROTEIN = soft(250)
export const TEAL_PROTEIN = soft(190)
/** The second subunit of a dimer: 140° from amber, so the two recolour apart. */
export const SECOND = soft(215)

// ---------- helpers ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const rad = (d) => (d * Math.PI) / 180
const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((c) => c / l) }
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
/** A colour between two of a palette, mixed in OKLCH (lightness and chroma; the hue of the more coloured one). */
const mix = (a, b, t) => { const A = toLch(a), B = toLch(b); return toHex({ l: A.l + (B.l - A.l) * t, c: A.c + (B.c - A.c) * t, h: A.c >= B.c ? A.h : B.h }) }
/** The main outline (px) of a part `px` across on the page, as molecules.mjs: 10 when large, never under 3.5. */
const lineFor = (px) => f(clamp(2.5 + px * 0.03, 3.5, 10))
const rotG = (cx, cy, turn) => (turn ? ` transform="rotate(${f(turn)} ${f(cx)} ${f(cy)})"` : '')
/** The zero line of a field over a box of the page, as one path (every loop kept). */
const traced = (fn, box, step, eps = 0.15) => contours(fn, box, [0], step)[0].map((l) => pathOf(simplify(l, eps))).join(' ')
/** Like `traced`, without holes: a pinhole between beads would otherwise get an outline ring of its own. */
const area = (l) => l.reduce((a, p, i) => { const q = l[(i + 1) % l.length]; return a + p[0] * q[1] - q[0] * p[1] }, 0) / 2
const solid = (fn, box, step, eps) => { const ls = contours(fn, box, [0], step)[0], sgn = Math.sign(area(ls[0] ?? [[0, 0]])); return ls.filter((l) => Math.sign(area(l)) === sgn).map((l) => pathOf(simplify(l, eps))).join(' ') }
const pathEl = (d, fill, stroke = '', w = 0) => `<path d="${d}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${f(w)}" stroke-linejoin="round" stroke-linecap="round"` : ''}/>`
const lin = (id, [x0, y0, x1, y1], stops) => `<linearGradient id="${id}" x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" gradientUnits="userSpaceOnUse">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`
/** A radial gradient across each shape's own box, its brightest point up and left of the middle. */
const radial = (id, stops) => `<radialGradient id="${id}" cx="0.5" cy="0.5" r="0.5" fx="0.34" fy="0.3">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</radialGradient>`
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - (h * h * k) / 4 }

// The light, in the coordinates of the page (x right, y down, z toward the viewer): from the top left and the front.
const LIGHT = norm([-0.55, -0.7, 0.9])

// =====================================================================================================================
// Bodies: points on a surface with their normals, in body units (x right, y down, z toward the viewer), about 1 across.
// Each returns { sample(rand) → { p, n }, area }: a point spread evenly over the surface.
// =====================================================================================================================

/** Turns a body-up vector [X, Y up, Z] seen from a camera tilted `tilt` degrees above, into page axes (y down). */
const view = (tilt) => { const c = Math.cos(rad(tilt)), s = Math.sin(rad(tilt)); return ([X, Y, Z]) => [X, -(Y * c - Z * s), Y * s + Z * c] }

function ballBody() {
  return { area: 4 * Math.PI, sample: (r) => { const z = 2 * r() - 1, t = 2 * Math.PI * r(), s = Math.sqrt(1 - z * z), n = [s * Math.cos(t), s * Math.sin(t), z]; return { p: n, n } } }
}
// A tall block: a cylinder (radius 0.56, 1.7 tall) with its edges rounded, seen a little from above.
function cylinderBody() {
  const a = 0.56, hh = 0.85, rr = 0.2, V = view(16)
  const side = 2 * Math.PI * a * 2 * (hh - rr), cap = Math.PI * (a - rr) ** 2, torus = Math.PI * rr * 2 * Math.PI * (a - rr * 0.36)
  const area = side + 2 * cap + 2 * torus
  return {
    area,
    sample: (r) => {
      const u = r() * area, t = 2 * Math.PI * r()
      let P, N
      if (u < side) { const Y = (r() * 2 - 1) * (hh - rr); N = [Math.cos(t), 0, Math.sin(t)]; P = [a * N[0], Y, a * N[2]] }
      else if (u < side + 2 * cap) { const up = u < side + cap ? 1 : -1, q = Math.sqrt(r()) * (a - rr); N = [0, up, 0]; P = [q * Math.cos(t), up * hh, q * Math.sin(t)] }
      else { const up = r() < 0.5 ? 1 : -1, b = (r() * Math.PI) / 2, rad0 = a - rr + rr * Math.cos(b); N = [Math.cos(b) * Math.cos(t), up * Math.sin(b), Math.cos(b) * Math.sin(t)]; P = [rad0 * Math.cos(t), up * (hh - rr + rr * Math.sin(b)), rad0 * Math.sin(t)] }
      return { p: V(P), n: V(N) }
    },
  }
}
// A C (horseshoe) open to the right: a tube (radius 0.25) round two thirds of a circle (radius 0.68), round ends.
function arcBody() {
  const R = 0.68, a = 0.25, t0 = rad(62), t1 = rad(298), V = view(12)
  const tubeA = (t1 - t0) * R * 2 * Math.PI * a, capA = 2 * Math.PI * a * a, area = tubeA + 2 * capA
  return {
    area,
    sample: (r) => {
      const u = r() * area
      let P, N
      if (u < tubeA) {
        const t = t0 + r() * (t1 - t0), s = 2 * Math.PI * r(), c = [R * Math.cos(t), R * Math.sin(t), 0], out = [Math.cos(t), Math.sin(t), 0]
        N = [out[0] * Math.cos(s), out[1] * Math.cos(s), Math.sin(s)]; P = [c[0] + a * N[0], c[1] + a * N[1], a * N[2]]
      } else {
        const t = u < tubeA + capA ? t0 : t1, c = [R * Math.cos(t), R * Math.sin(t), 0], back = u < tubeA + capA ? -1 : 1
        const along = [-Math.sin(t) * back, Math.cos(t) * back, 0]
        let n = norm([r() * 2 - 1, r() * 2 - 1, r() * 2 - 1]); if (dot(n, along) < 0) n = n.map((v, i) => v - 2 * dot(n, along) * along[i])
        N = n; P = [c[0] + a * N[0], c[1] + a * N[1], a * N[2]]
      }
      // The C lies in the plane of the page: body Y is up, so a right-opening C stays right-opening.
      return { p: V(P), n: V(N) }
    },
  }
}
// A flat outline (page-like units, y down) blown up into a dome: the height grows with the distance from the edge.
function customBody(points) {
  const n = points.length, xs = points.map((p) => p[0]), ys = points.map((p) => p[1])
  const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], span = Math.max(box[2] - box[0], box[3] - box[1])
  const P = points.map(([x, y]) => [(x - (box[0] + box[2]) / 2) / span * 2, (y - (box[1] + box[3]) / 2) / span * 2])
  const inside = (x, y) => { let c = false; for (let i = 0, j = n - 1; i < n; j = i++) { const [a, b] = P[i], [e, d] = P[j]; if (b > y !== d > y && x < ((e - a) * (y - b)) / (d - b) + a) c = !c } return c }
  const edge = (x, y) => { let m = Infinity; for (let i = 0, j = n - 1; i < n; j = i++) { const [ax, ay] = P[j], [bx, by] = P[i], dx = bx - ax, dy = by - ay, t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1); m = Math.min(m, Math.hypot(x - ax - t * dx, y - ay - t * dy)) } return m }
  let deepest = 0.05
  for (let i = 0; i < 400; i++) { const x = -1 + (i % 20) / 9.5, y = -1 + Math.floor(i / 20) / 9.5; if (inside(x, y)) deepest = Math.max(deepest, edge(x, y)) }
  const H = (x, y) => (inside(x, y) ? 0.55 * Math.sqrt(clamp(edge(x, y) / deepest, 0, 1)) : 0)
  return {
    area: 4,
    sample: (r) => {
      for (let k = 0; k < 200; k++) {
        const x = r() * 2 - 1, y = r() * 2 - 1
        if (!inside(x, y)) continue
        const e = 0.02, hx = (H(x + e, y) - H(x - e, y)) / (2 * e), hy = (H(x, y + e) - H(x, y - e)) / (2 * e)
        // Near the edge the dome turns away from the viewer: lean the normal outward so the rim reads as the side.
        const d = edge(x, y) / deepest, side = clamp(1 - d * 4, 0, 1)
        const out = norm([hx === 0 && hy === 0 ? 0.0001 : -hx, -hy || 0.0001, 0])
        const nn = norm([-hx * (1 - side) + out[0] * side * 2, -hy * (1 - side) + out[1] * side * 2, 1 - side * 0.7])
        return { p: [x, y, H(x, y)], n: nn }
      }
      return { p: [0, 0, 0.5], n: [0, 0, 1] }
    },
  }
}

/**
 * Beads over a body: points thrown at random and kept when at least `s` from every bead kept so far (Poisson disc),
 * sunk a little into the surface, with only those that can be seen. Returns [{ c: [x, y, z], r, n }].
 */
function beads(body, count, rand) {
  // The front half of a body holds about half its area: spacing so that about `count` beads face the viewer.
  const s = Math.sqrt((body.area * 0.5) / (count * 0.82)), out = []
  for (let tries = 0; tries < count * 120 && out.length < count * 3; tries++) {
    const { p, n } = body.sample(rand)
    if (out.some((b) => Math.hypot(b.p[0] - p[0], b.p[1] - p[1], b.p[2] - p[2]) < s)) continue
    out.push({ p, n })
  }
  return out.map(({ p, n }) => {
    const r = s * (0.7 + 0.16 * rand())
    return { c: p.map((v, i) => v - n[i] * r * 0.2), r, n }
  }).filter((b) => b.n[2] > -0.45)
}

/** Turns beads (centres and normals) by `turn` degrees in the plane of the page; the light stays where it is. */
const turned = (bs, turn) => {
  const c = Math.cos(rad(turn)), s = Math.sin(rad(turn)), R = ([x, y, z]) => [x * c - y * s, x * s + y * c, z]
  return bs.map((b) => ({ ...b, c: R(b.c), n: R(b.n) }))
}
const extentOf = (bs) => [Math.min(...bs.map((b) => b.c[0] - b.r)), Math.min(...bs.map((b) => b.c[1] - b.r)), Math.max(...bs.map((b) => b.c[0] + b.r)), Math.max(...bs.map((b) => b.c[1] + b.r))]

/** The tones a shaded surface is painted in, from its palette: lightest first, then the hollow, band and crevice. */
function tones(pal, depth) {
  const d = clamp(depth, 0, 2)
  const darkest = mix(pal.small, pal.outline, 0.12 * d)
  const ramp = [pal.light, mix(pal.light, pal.base, 0.5), pal.base, mix(pal.base, pal.shadow, 0.5), pal.shadow, mix(pal.shadow, pal.small, 0.5), pal.small, mix(pal.small, darkest, 0.6)]
  return { ramp, hollow: mix(pal.small, darkest, 0.4 * d), band: mix(pal.shadow, pal.small, 0.35 + 0.3 * d), crevice: mix(pal.small, darkest, 0.25 * d) }
}

/**
 * One lumpy surface from beads in page pixels ({ c: [x, y, z], r, n }): its defs and its drawing. `detail`: 'full' or
 * 'flat'. `fn` is the field of the outline (page px), `box` its extent on the page.
 */
function surface(id, bs, pal, { w, detail, depth, band }) {
  const k = Math.min(...bs.map((b) => b.r)) * 0.4
  const F = (x, y) => { let d = Infinity; for (const b of bs) d = smin(d, Math.hypot(x - b.c[0], y - b.c[1]) - b.r, k); return d }
  const ex = extentOf(bs), pad = k / 2 + 6, box = [ex[0] - pad, ex[1] - pad, ex[2] + pad, ex[3] + pad]
  const step = clamp((ex[2] - ex[0]) / 320, 0.5, 1.25)
  const outline = solid(F, box, step, 0.25)
  if (detail === 'flat') {
    const defs = lin(`${id}-gradient`, box, [[0, pal.base], [1, pal.shadow]])
    return { defs, body: `<g id="${id}">${pathEl(outline, `url(#${id}-gradient)`, pal.outline, w)}</g>` }
  }
  const T = tones(pal, depth)
  // Four gradients, from the bead most turned to the light to the one most turned away.
  const levels = [0, 1, 2, 3].map((i) => radial(`${id}-bead${i}`, [[0, T.ramp[i]], [0.5, T.ramp[i + 2]], [1, T.ramp[i + 4]]])).join('')
  const zs = bs.map((b) => b.c[2]), z0 = Math.min(...zs), z1 = Math.max(...zs)
  const level = (b) => {
    const lit = dot(b.n, LIGHT), near = (b.c[2] - z0) / (z1 - z0 || 1)
    const t = 0.72 * lit + 0.28 * (near * 2 - 1) // 1 lit and near … −1 turned away and far
    return t > 0.5 ? 0 : t > 0.1 ? 1 : t > -0.3 ? 2 : 3
  }
  const crev = f(clamp(w * 0.3, 1, 2.5))
  const order = [...bs].sort((a, b) => a.c[2] - b.c[2])
  // Each bead casts a shadow down and right onto the beads behind it, kept inside the outline: drawn before the bead,
  // only a crescent of it shows (the hollow under its lower right edge).
  const away = norm([-LIGHT[0], -LIGHT[1], 0]), inset = w * 0.3
  const cast = (b) => {
    const ox = b.c[0] + away[0] * b.r * 0.24, oy = b.c[1] + away[1] * b.r * 0.24, R = b.r * 1.02
    const disc = (x, y) => Math.max(Math.hypot(x - ox, y - oy) - R, F(x, y) + inset)
    // Loops smaller than a quarter of the bead are specks between other beads: left out.
    const big = (l) => Math.max(...l.map((p) => p[0])) - Math.min(...l.map((p) => p[0])) + Math.max(...l.map((p) => p[1])) - Math.min(...l.map((p) => p[1])) > R * 0.5
    const d = contours(disc, [ox - R - 3, oy - R - 3, ox + R + 3, oy + R + 3], [0], clamp(R / 14, 0.5, 1.5))[0].filter(big).map((l) => pathOf(simplify(l, 0.45))).join(' ')
    return d ? pathEl(d, T.crevice) : ''
  }
  const beadEls = order.map((b, i) => (i ? cast(b) : '') + `<circle cx="${f(b.c[0])}" cy="${f(b.c[1])}" r="${f(b.r - crev / 2)}" fill="url(#${id}-bead${level(b)})" stroke="${T.ramp[5]}" stroke-width="${crev}"/>`).join('')
  // The shadow side: what lies within `s` of the outline toward the bottom right.
  const s = (ex[2] - ex[0]) * 0.07 * clamp(depth, 0.3, 2)
  const sh = [-LIGHT[0], -LIGHT[1]], sl = Math.hypot(...sh), sx = (sh[0] / sl) * s, sy = (sh[1] / sl) * s
  const bandD = band ? traced((x, y) => Math.max(F(x, y) + w * 0.2, -F(x + sx, y + sy)), box, step) : ''
  return {
    defs: levels,
    body: `<g id="${id}">` +
      `<g id="${id}-hollows">${pathEl(outline, T.hollow)}</g>` +
      `<g id="${id}-surface">${beadEls}</g>` +
      (bandD ? `<g id="${id}-shadow">${pathEl(bandD, T.band)}</g>` : '') +
      `<g id="${id}-outline">${pathEl(outline, 'none', pal.outline, w)}</g></g>`,
  }
}

/** Beads of one shape in body units (about −1 to 1), before they are placed on the page. */
function shapeBeads(shape, count, rand, points, flat) {
  if (shape === 'cylinder') return beads(cylinderBody(), count, rand)
  if (shape === 'arc' && flat) {
    // Small: lumps along the middle line of the C only, so that its opening stays open.
    const R = 0.68, t0 = rad(62), t1 = rad(298), V = view(12)
    return Array.from({ length: 7 }, (_, i) => { const t = t0 + ((t1 - t0) * i) / 6, j = 0.9 + 0.2 * rand(); return { c: V([R * Math.cos(t), R * Math.sin(t), 0]), r: 0.25 * 0.92 * j, n: [0, 0, 1] } })
  }
  if (shape === 'arc') return beads(arcBody(), count, rand)
  if (shape === 'custom') return beads(customBody(points), count, rand)
  return beads(ballBody(), count, rand)
}
/** Beads moved and scaled onto the page: the extent `px` wide (longer side), the middle at cx, cy. */
const placed = (bs, cx, cy, px) => {
  const [x0, y0, x1, y1] = extentOf(bs), k = px / Math.max(x1 - x0, y1 - y0), mx = (x0 + x1) / 2, my = (y0 + y1) / 2
  return bs.map((b) => ({ ...b, c: [cx + (b.c[0] - mx) * k, cy + (b.c[1] - my) * k, b.c[2] * k], r: b.r * k }))
}

/**
 * Shaded protein: a globular protein as a lumpy surface with depth (beads lit from the top left, darker hollows between
 * them, a shadow side at the bottom right). Options: `shape` 'ball' | 'cylinder' (a tall lumpy block) | 'arc' (a lumpy C
 * open to the right; aim it with `turn`) | 'dimer' (two balls, the second in `pal2`) | 'custom' (`points`: an outline
 * in any units, y down, blown up into a dome); `bumps` (about how many lumps face the viewer: 40 for a ball by default),
 * `seed` (another arrangement of the lumps), `depth` (strength of the shading: 0 nearly flat, 1 by default, up to 2),
 * `band` (the shadow band at the bottom right, on by default), `flat` (by default below 60 px on the page: fewer
 * lumps, one linear gradient, no beads). Amber by default (the set's protein).
 * Example: shadedProtein(g, { x: 0, y: 0, size: 40, shape: 'cylinder', pal: BLUE_PROTEIN })
 */
export function shadedProtein(g, { x, y, size, turn = 0, id = 'protein', w, pal = AMBER, pal2 = SECOND, shape = 'ball', bumps, seed = 1, points, depth = 1, band = true, flat }) {
  const px = size * g.k, cx = g.X(x), cy = g.Y(y)
  flat ??= px < 60
  const W = w ?? lineFor(px)
  const n = bumps ?? { ball: 40, cylinder: 48, arc: 52, dimer: 28, custom: 44 }[shape] ?? 40
  // Small: fewer, larger lumps (an outline of 3.5 px would fill the notches between many small ones).
  const count = flat ? Math.max(shape === 'arc' ? 10 : 5, Math.round(n * 0.2)) : n
  const rand = mulberry(seed * 7919 + 17)
  const inner = (px - W) * 0.98
  // Small and flat: the beads grown a little, so that few of them still join into one body (the C stays a C).
  const grow = (bs) => (flat ? bs.map((b) => ({ ...b, r: b.r * 1.25 })) : bs)
  if (shape === 'dimer') {
    // Two subunits side by side, the right one a little in front and overlapping the left.
    const a = turned(grow(beads(ballBody(), count, rand)), turn), b = turned(grow(beads(ballBody(), count, mulberry(seed * 104729 + 3))), turn)
    const off = 0.86, c = Math.cos(rad(turn)), s = Math.sin(rad(turn))
    const shift = (bs, d, dz) => bs.map((q) => ({ ...q, c: [q.c[0] + d * c, q.c[1] + d * s + d * 0.12, q.c[2] + dz] }))
    const A = shift(a, -off, -0.4), B = shift(b, off * 0.95, 0.4)
    // Placed together, so both keep their share of the size.
    const all = placed([...A, ...B], cx, cy, inner), nA = A.length
    const first = surface(`${id}-subunit1`, all.slice(0, nA), pal, { w: W, detail: flat ? 'flat' : 'full', depth, band })
    const second = surface(`${id}-subunit2`, all.slice(nA), pal2, { w: W, detail: flat ? 'flat' : 'full', depth, band })
    return { defs: first.defs + second.defs, body: `<g id="${id}">${first.body}${second.body}</g>`, parts: [['protein', pal], ['second subunit', pal2]] }
  }
  const bs = placed(turned(grow(shapeBeads(shape, count, rand, points ?? [[0, -40], [40, 0], [0, 40], [-40, 0]], flat)), turn), cx, cy, inner)
  const sfc = surface(id, bs, pal, { w: W, detail: flat ? 'flat' : 'full', depth, band })
  return { defs: sfc.defs, body: sfc.body, parts: [['protein', pal]] }
}

// =====================================================================================================================
// Red blood cell with depth (colours of the approved Red blood cell: RED of tissue.mjs)
// =====================================================================================================================

/** An ellipse as a field (zero on its edge, below zero inside), in page px. */
const ellF = (cx, cy, rx, ry) => (x, y) => { const u = (x - cx) / rx, v = (y - cy) / ry, k = Math.hypot(u, v); return (k - 1) * Math.min(rx, ry) }
/** A closed polygon as a signed distance field. */
const polyF = (P) => (x, y) => {
  let m = Infinity, inside = false
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [ax, ay] = P[j], [bx, by] = P[i], dx = bx - ax, dy = by - ay, t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1)
    m = Math.min(m, Math.hypot(x - ax - t * dx, y - ay - t * dy))
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside
  }
  return inside ? -m : m
}
const and = (...fs) => (x, y) => Math.max(...fs.map((F) => F(x, y)))
const not = (F) => (x, y) => -F(x, y)
const moved = (F, dx, dy) => (x, y) => F(x - dx, y - dy)

/**
 * Red blood cell (3D): the biconcave disc with its depth shaded: the rim lit on top and shaded below, the dimple a
 * darker sunken centre whose wall away from the light catches it. Views: 'tilted' (seen at a slant, as the approved Red
 * blood cell; the thickness of the rim shows below), 'face' (face on), 'side' (the profile, two lobes and a waist).
 * The light stays at the top left when the cell is turned. Below about 50 px on the page use tissue.mjs's redBloodCell,
 * which becomes flat by itself; this part keeps its shading at every size (fewer layers under 90 px).
 * Example: redBloodCell3d(g, { x: 0, y: 0, size: 60, view: 'face' })
 */
export function redBloodCell3d(g, { x, y, size, turn = 0, id = 'red-blood-cell', w, view = 'tilted', pal = RED }) {
  const px = size * g.k, cx = g.X(x), cy = g.Y(y)
  const W = w ?? f(clamp(1.5 + px / 11, 3.5, 12)) // cellW of tissue.mjs
  const R = px / 2 - W / 2
  // Fields in the cell's own frame (upright, centred on 0, 0), read from the page through the turn.
  const c = Math.cos(rad(-turn)), s = Math.sin(rad(-turn))
  const local = (F) => (X, Y) => { const u = X - cx, v = Y - cy; return F(u * c - v * s, u * s + v * c) }
  // Shifts toward and away from the light are in page pixels, so the light stays put whichever way the cell is turned.
  const L2 = norm([LIGHT[0], LIGHT[1], 0]), toward = (F, d) => (X, Y) => F(X - L2[0] * d, Y - L2[1] * d)
  const box = [cx - px / 2 - 4, cy - px / 2 - 4, cx + px / 2 + 4, cy + px / 2 + 4], step = clamp(px / 360, 0.5, 1.25)
  const T = (F) => traced(F, box, step)
  const full = px >= 90
  const sideTone = mix(pal.shadow, pal.small, 0.55), pit = mix(pal.small, pal.outline, 0.3), wall = mix(pal.base, pal.shadow, 0.5)
  const grad = (name, a, b) => lin(`${id}-${name}`, [cx - px / 2, cy - px / 2, cx + px / 2, cy + px / 2], [[0, a], [1, b]])
  const layer = (name, d, fill) => (d ? `<g id="${id}-${name}">${pathEl(d, fill)}</g>` : '')
  let defs = '', body = ''

  if (view === 'side') {
    // The profile of Evans and Fung (1972), its waist thickened a little so it does not pinch shut, the long axis level.
    const half = (r) => R * Math.sqrt(Math.max(0, 1 - r * r)) * (0.3 + 2.0026 * r * r - 1.1228 * r ** 4) * 0.5
    const top = [], bot = []
    for (let i = 0; i <= 64; i++) { const r = -1 + (2 * i) / 64, t = half(r); top.push([r * R, -t]); bot.unshift([r * R, t]) }
    const cell = local(polyF([...top, ...bot.slice(1, -1)]))
    defs = grad('gradient', pal.base, pal.shadow)
    const under = T(and(cell, not(toward(cell, R * 0.09)))) // the lower edge, turned from the light
    const lobe = (sx) => local(ellF(sx * R * 0.64, -R * 0.12, R * 0.17, R * 0.07))
    body = `<g id="${id}-cell">${pathEl(T(cell), `url(#${id}-gradient)`)}</g>` + layer('shadow', under, sideTone) +
      (full ? layer('highlight', T(and(lobe(-1), cell)), pal.light) + layer('highlight-2', T(and(lobe(1), cell)), wall) : '') +
      `<g id="${id}-outline">${pathEl(T(cell), 'none', pal.outline, W)}</g>`
    return { defs, body: `<g id="${id}">${body}</g>`, parts: [['cell', pal]] }
  }

  if (view !== 'face') return tiltedCell({ id, cx, cy, px, W, R, turn, pal, full, box, step })
  const tilted = view !== 'face'
  const ry = tilted ? R * 0.5 : R, lift = tilted ? R * 0.17 : 0 // lift: the thickness of the rim seen below the top face
  // The whole cell: the top face swept down by its thickness (the rim's side shows at the bottom).
  const fy = ry - lift / 2 // half height of the top face
  const flatF = ellF(0, 0, R, fy), topFace = moved(flatF, 0, -lift / 2)
  // Swept along a segment (stretched at its middle), the outline of a disc that has a thickness.
  const cellF = tilted ? (u, v) => flatF(u, v - clamp(v, -lift / 2, lift / 2)) : topFace
  const cell = local(cellF), face = local(topFace)
  // The dimple: an ellipse a little below and right of the middle of the top face (as the approved cell's).
  const dz = local(ellF(R * 0.04, -lift / 2 + fy * 0.06, R * 0.47, fy * 0.47))
  defs = grad('gradient', pal.base, pal.shadow) + grad('side', pal.shadow, sideTone) + grad('pit', pit, pal.small)
  // The rim: lit on top (a crescent along its upper left crest), turned away below (a band along the lower right).
  const crest = local(ellF(0, -lift / 2, R * 0.82, fy * 0.8))
  const shine = and(crest, not(toward(crest, -R * 0.07)), not(dz))
  const rimShade = and(face, not(toward(face, R * 0.08)), not(dz))
  // The dimple: darker, sunken; the wall away from the light (lower right) catches it, the wall near it is in shade.
  const sq = fy / R, far = and(dz, not((X, Y) => dz(X - L2[0] * R * 0.09, Y - L2[1] * R * 0.09 * sq)))
  // The inner slope round the dimple, on the side of the light, falls into shade (a soft ring between rim and pit).
  const slope = local(ellF(R * 0.03, -lift / 2 + fy * 0.05, R * 0.58, fy * 0.58))
  const nearSlope = and(slope, not(dz), not(toward(slope, -R * 0.06)))
  body = `<g id="${id}-cell">${pathEl(T(cell), tilted ? `url(#${id}-side)` : `url(#${id}-gradient)`)}${tilted ? pathEl(T(face), `url(#${id}-gradient)`) : ''}</g>` +
    (full ? layer('rim-shadow', T(rimShade), wall) : '') +
    (full ? layer('slope', T(nearSlope), mix(pal.shadow, pal.small, 0.3)) : '') +
    `<g id="${id}-dimple">${pathEl(T(dz), `url(#${id}-pit)`)}${full ? pathEl(T(far), mix(pal.small, pal.shadow, 0.6)) : ''}</g>` +
    layer('highlight', T(shine), pal.light) +
    `<g id="${id}-outline">${pathEl(T(cell), 'none', pal.outline, W)}</g>`
  return { defs, body: `<g id="${id}">${body}</g>`, parts: [['cell', pal]] }
}

/**
 * The tilted red blood cell, drawn from its shape in three dimensions: the Evans–Fung surface (THICK: 0.85 of the
 * measured thickness) seen from TILT (40°) above its plane, steeper than the approved icon so more of the hollow shows. For every point of the page a ray finds
 * the surface the eye meets there, and how much that surface faces the light, less a share for how far it lies below the
 * rim (the floor of the dimple gets less light than the crest). The light comes from behind and above (the top of the
 * page); the far inner wall of the dimple, inside the upper rim, is darkened and the near inner wall lightened by rules on
 * the slope (`shade`, `lift`), as an illustrator would, since the measured rim is too low to cast a shadow of its own. The cell is then painted as flat tone areas traced at a
 * few levels of that light (cel shading) over one linear gradient: the far inner wall of the dimple, which faces the
 * viewer and turns from the light, falls into a dark crescent just inside the upper rim; the near inner wall, tipped
 * toward the light, is lit; the rim's crest is the lightest and its outer side below the darkest.
 */
const THICK = 0.85, TILT = 40
function tiltedCell({ id, cx, cy, px, W, R, turn, pal, full, box, step }) {
  const E = rad(TILT), se = Math.sin(E), ce = Math.cos(E)
  const half = (r) => (r >= 1 ? -1 : 0.5 * THICK * Math.sqrt(1 - r * r) * (0.207 + 2.003 * r * r - 1.123 * r ** 4))
  const dHalf = (r) => (half(Math.min(0.999, r + 1e-3)) - half(Math.max(0, r - 1e-3))) / 2e-3
  const hMax = 0.5 * THICK * 0.656
  // World axes: x right, y toward the viewer along the cell's plane, z up out of the plane. The eye looks along -v.
  const v = [0, ce, se], up = [0, -se, ce]
  // The light in the cell's own axes: from the left, from behind and above (on the page: from the top left), low enough
  // that the near inner wall of the dimple, tipped toward it, is lit and the far inner wall, tipped away, is not.
  const tc = Math.cos(rad(-turn)), ts = Math.sin(rad(-turn)), l0 = [-0.3, -0.9, 0.45]
  const Lw = norm([l0[0] * tc - l0[1] * ts, l0[0] * ts + l0[1] * tc, l0[2]])
  // Units: the cell's radius is 1; the picture is scaled so the whole silhouette fits `R` across its half width.
  const k = R
  const c = Math.cos(rad(-turn)), s = Math.sin(rad(-turn))
  // Height of the silhouette: from the far rim (top) to the near underside; centre it on the page.
  const yTop = -(se + hMax * ce), yBot = se + hMax * ce, mid = (yTop + yBot) / 2
  const cache = new Map()
  const at = (X, Y) => {
    const key = `${f(X)},${f(Y)}`
    if (cache.has(key)) return cache.get(key)
    const u0 = X - cx, v0 = Y - cy, u = (u0 * c - v0 * s) / k, w = (u0 * s + v0 * c) / k + mid
    // Screen point (u right, w down) as a ray: P(t) = u·x + (−w)·up + t·v; march from the viewer's side.
    let best = Infinity, hit = null, prev = null
    const N = 90
    for (let i = 0; i <= N; i++) {
      const t = 1.6 - (3.2 * i) / N
      const P = [u, -w * up[1] + t * v[1], -w * up[2] + t * v[2]], r = Math.hypot(P[0], P[1]), h = half(r)
      const g = Math.max(Math.abs(P[2]) - Math.max(h, 0), r - 1)
      best = Math.min(best, g)
      if (g < 0 && !hit) {
        // Refine between the last point outside and this one.
        let a = prev ?? t, b = t
        for (let j = 0; j < 14; j++) { const m = (a + b) / 2, Q = [u, -w * up[1] + m * v[1], -w * up[2] + m * v[2]], rq = Math.hypot(Q[0], Q[1]), gq = Math.max(Math.abs(Q[2]) - Math.max(half(rq), 0), rq - 1); if (gq < 0) b = m; else a = m }
        const Q = [u, -w * up[1] + b * v[1], -w * up[2] + b * v[2]], rq = Math.max(1e-4, Math.hypot(Q[0], Q[1]))
        const sl = rq > 0.985 ? 30 : dHalf(rq), sign = Q[2] >= 0 ? 1 : -1
        const n = norm([-sl * (Q[0] / rq) * sign, -sl * (Q[1] / rq) * sign, sign])
        // Inside the crest, the far inner wall (tipped toward the viewer) lies in the shadow of the far rim: the light
        // comes from behind, low. Worked out as a rule on the slope rather than by tracing the shadow (the measured rim is
        // too low to cast one at a light that also leaves the top lit).
        // Smooth steps (not a cut), so the traced edges are smooth too.
        const sm = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }
        const shade = sign > 0 ? sm(n[1], 0.1, 0.24) * sm(-Q[1] / rq, 0.2, 0.6) * sm(rq, 0.25, 0.4) * (1 - sm(rq, 0.68, 0.78)) : 0
        const lift = sign > 0 ? sm(-n[1], 0.06, 0.2) * sm(Q[1] / rq, 0.2, 0.6) * sm(rq, 0.25, 0.4) * (1 - sm(rq, 0.66, 0.76)) : 0
        hit = { n, top: sign > 0, r: rq, shade, lift }
      }
      prev = t
    }
    let light = -2
    if (hit) {
      light = dot(hit.n, Lw)
      // Light that reaches the floor of the dimple is cut by the rim around it.
      if (hit.top) light -= 0.3 * clamp((hMax - half(hit.r)) / hMax, 0, 1)
      light += 0.22 * hit.lift - 1.1 * hit.shade
      // The underside and the steep outer side are one band of shade (many bands there read as stripes).
      if (!hit.top || hit.n[2] < 0.35) light = 0.02
    }
    const out = { g: best * k, light }
    cache.set(key, out)
    return out
  }
  const cell = (X, Y) => at(X, Y).g
  // A tone area: inside the cell where the light is below (dark) or above (lit) a level.
  const below = (lv) => (X, Y) => { const a = at(X, Y); return Math.max(a.g + 0.3, (a.light - lv) * px * 0.5) }
  const above = (lv) => (X, Y) => { const a = at(X, Y); return Math.max(a.g + 0.3, (lv - a.light) * px * 0.5) }
  const T = (F, eps = 0.3) => traced(F, box, step, eps)
  const sideTone = mix(pal.shadow, pal.small, 0.55), pit = mix(pal.small, pal.outline, 0.35)
  const defs = lin(`${id}-gradient`, [cx - px / 2, cy - px / 2, cx + px / 2, cy + px / 2], [[0, pal.base], [1, pal.shadow]])
  const layer = (name, d, fill) => (d ? `<g id="${id}-${name}">${pathEl(d, fill)}</g>` : '')
  // Levels of light, from darkest to lightest; worked out by eye on the 512 icon.
  const outline = T(cell, 0.2)
  const body = `<g id="${id}-cell">${pathEl(outline, `url(#${id}-gradient)`)}</g>` +
    layer('shade', T(below(0.32)), mix(pal.shadow, pal.small, 0.3)) +
    layer('shadow', T(below(0.12)), sideTone) +
    layer('hollow', T(below(-0.08)), full ? pal.small : sideTone) +
    (full ? layer('crevice', T(below(-0.26)), pit) : '') +
    layer('lit', T(above(0.62)), mix(pal.light, pal.base, 0.55)) +
    (full ? layer('highlight', T(above(0.8)), pal.light) : '') +
    `<g id="${id}-outline">${pathEl(outline, 'none', pal.outline, W)}</g>`
  return { defs, body: `<g id="${id}">${body}</g>`, parts: [['cell', pal]] }
}

// =====================================================================================================================
// Cells with depth: the approved Cell and Hepatocyte as cushions seen tilted (or face on), by the rules of the tilted red
// blood cell: one shape in three dimensions, lit from the top left, painted as flat tone areas over a gradient.
// =====================================================================================================================

export const CELL_PAL = soft(BLUE) // as Cell.svg
export const HEPATOCYTE_PAL = soft(66) // as Hepatocyte.svg (cells/tissue.mjs)
const sm = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }
/** A convex polygon (units) with its corners rounded by `r`, as a signed distance field. */
const roundedPolyF = (pts, r) => {
  const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length
  const shrink = pts.map(([x, y]) => { const d = Math.hypot(x - cx, y - cy); return [x - ((x - cx) / d) * r * 1.15, y - ((y - cy) / d) * r * 1.15] })
  const F = polyF(shrink)
  return (x, y) => F(x, y) - r
}
// The two cells in their own units (the longer radius about 1), read from the approved flat icons (silicodraw.mjs Cell,
// cells/tissue.mjs Hepatocyte): footprint, nuclei [x, y, r], small parts [x, y, r], and the profile of the cushion.
const CELL_KINDS = {
  generic: {
    pal: CELL_PAL, smallPal: CELL_PAL,
    foot: (x, y) => ellF(0, 0, 1, 40 / 46)(x, y),
    nuclei: [[-6 / 46, -2 / 46, 16 / 46]],
    small: [[24 / 46, 14 / 46, 4 / 46], [-28 / 46, 20 / 46, 3 / 46], [20 / 46, -22 / 46, 3 / 46]],
    thick: 0.2, edge: 0.3, dome: 0.08, bulge: 0,
    // A smooth dome over the ellipse (its distance field is not exact, and its steps showed in the lit area).
    lift: (x, y) => Math.max(0, 1 - x * x - (y * 46 / 40) ** 2),
  },
  hepatocyte: {
    pal: HEPATOCYTE_PAL, smallPal: HEPATOCYTE_PAL,
    foot: (() => { const s = 1 / 44, F = roundedPolyF([[-20, -38], [20, -38], [42, -10], [34, 30], [-10, 40], [-40, 20], [-44, -16]].map(([x, y]) => [(x + 1.2) * s, (y - 0.5) * s]), 6 / 44); return F })(),
    nuclei: [[-8.8 / 44, -6.5 / 44, 9.5 / 44], [15.2 / 44, 7.5 / 44, 8.5 / 44]],
    small: [[20, -20], [-26, 8], [4, 26], [-22, -22], [26, 24], [-8, 14], [28, 2]].map(([x, y]) => [(x + 1.2) / 44, (y - 0.5) / 44, 2.6 / 44]),
    thick: 0.2, edge: 0.16, dome: 0.02, bulge: 0,
  },
}

/**
 * Cell (3D): the approved Cell (`kind: 'generic'`, a soft cushion with a domed top) or Hepatocyte (`'hepatocyte'`, a
 * polygonal slab with rounded edges and two nuclei) with depth, by the rules of `redBloodCell3d`: views 'tilted' (from 40°
 * above, the side wall of the cell's thickness showing below) and 'face' (from straight above). The light stays at the
 * top left when the cell is turned: lit crest and highlight on the upper left, a shade band along the lower right and on
 * the side wall, all kept close to the body colour (a gentle sheen). Each nucleus is flat, in one colour with its outline, as
 * in the flat icons, with a faint shadow at its lower right; vesicles and granules are flat spots laid on the top face (foreshortened). Below 90 px on the page the
 * fine layers (lit areas, highlights) are left out. Options: kind, view, pal, nucPal.
 * Example: cell3d(g, { x: 0, y: 0, size: 60, kind: 'hepatocyte', view: 'tilted' })
 */
export function cell3d(g, { x, y, size, turn = 0, id = 'cell', w, kind = 'generic', view = 'tilted', pal, nucPal = NUC }) {
  const K = CELL_KINDS[kind] ?? CELL_KINDS.generic
  pal ??= K.pal
  const px = size * g.k, cx = g.X(x), cy = g.Y(y)
  const W = w ?? f(clamp(1.5 + px / 11, 3.5, 12)), NW = f(clamp(2 + px / 14, 3, 10))
  const full = px >= 90
  const E = rad(view === 'face' ? 90 : 40), se = Math.sin(E), ce = Math.cos(E)
  // Heights of the top and the underside over the footprint (units): rounded at the edge, domed, a bulge per nucleus.
  const round = (u) => Math.sqrt(Math.max(0, 1 - (1 - Math.min(u / K.edge, 1)) ** 2))
  const lift = (X, Y, d) => (K.lift ? K.lift(X, Y) : clamp(d, 0, 1))
  const bump = (X, Y) => { let b = 0; for (const [nx, ny, nr] of K.nuclei) { const q = Math.hypot(X - nx, Y - ny) / (nr * 1.12); if (q < 1) b = Math.max(b, K.bulge * Math.sqrt(1 - q * q)) } return b }
  const top = (X, Y) => { const d = -K.foot(X, Y); if (d <= 0) return -1; return K.thick * round(d) + K.dome * lift(X, Y, d) + bump(X, Y) }
  const under = (X, Y) => { const d = -K.foot(X, Y); return d <= 0 ? -1 : K.thick * round(d) }
  const nucAt = (X, Y) => K.nuclei.reduce((m, [nx, ny, nr], i) => { const v = Math.hypot(X - nx, Y - ny) - nr; return v < m.v ? { v, i } : m }, { v: Infinity, i: -1 })
  // World axes as for the red blood cell: x right, y toward the viewer in the cell's plane, z up. Light from the left,
  // behind and above (on the page: the top left), turned into the cell's frame with it.
  const v = [0, ce, se], up = [0, -se, ce]
  const tc = Math.cos(rad(-turn)), ts = Math.sin(rad(-turn)), l0 = [-0.5, -0.6, 0.65]
  const Lw = norm([l0[0] * tc - l0[1] * ts, l0[0] * ts + l0[1] * tc, l0[2]])
  // The silhouette's extent, from points round the footprint: scale so the longer side is the size less the outline.
  const ring = []
  for (let a = 0; a < 360; a += 3) { const t = rad(a); let r = 0.2; while (K.foot(r * Math.cos(t), r * Math.sin(t)) < 0 && r < 2) r += 0.01; ring.push([r * Math.cos(t), r * Math.sin(t)]) }
  const hTop = K.thick + K.dome + K.bulge
  const ys = ring.flatMap(([X, Y]) => [Y * se - hTop * ce, Y * se + K.thick * ce]), xs = ring.map((p) => p[0])
  const ext = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
  const k = (px - W) / Math.max(ext[2] - ext[0], ext[3] - ext[1]), midX = (ext[0] + ext[2]) / 2, midY = (ext[1] + ext[3]) / 2
  const c = Math.cos(rad(-turn)), s = Math.sin(rad(-turn)), cs = Math.cos(rad(turn)), sn = Math.sin(rad(turn))
  /** Page point of a point of the cell (units, z up). */
  const toPage = ([X, Y, Z]) => { const u = (X - midX) * k, w0 = (Y * se - Z * ce - midY) * k; return [cx + u * cs - w0 * sn, cy + u * sn + w0 * cs] }
  // The shadow a nucleus casts falls away from the light, on the plane.
  const away = norm([-Lw[0], -Lw[1], 0])
  const cache = new Map()
  const at = (PX, PY) => {
    const key = `${f(PX)},${f(PY)}`
    if (cache.has(key)) return cache.get(key)
    const u0 = PX - cx, v0 = PY - cy, u = (u0 * c - v0 * s) / k + midX, wv = (u0 * s + v0 * c) / k + midY
    const inside = (P) => { const tz = top(P[0], P[1]); if (tz < 0) return 1; return Math.max(P[2] - tz, -under(P[0], P[1]) - P[2]) }
    const ray = (t) => [u, -wv * up[1] + t * v[1], -wv * up[2] + t * v[2]]
    let best = Infinity, hit = null, prev = null
    for (let i = 0; i <= 80; i++) {
      const t = 1.6 - (3.2 * i) / 80, P = ray(t)
      const gF = Math.max(K.foot(P[0], P[1]), Math.min(0.5, inside(P)))
      best = Math.min(best, gF)
      if (!hit && inside(P) < 0) {
        let a = prev ?? t, b = t
        for (let j = 0; j < 14; j++) { const m = (a + b) / 2; if (inside(ray(m)) < 0) b = m; else a = m }
        const Q = ray(b), e = 0.004
        const isTop = Q[2] >= 0, H = isTop ? top : under, sg = isTop ? 1 : -1
        const hx = (H(Q[0] + e, Q[1]) - H(Q[0] - e, Q[1])) / (2 * e), hy = (H(Q[0], Q[1] + e) - H(Q[0], Q[1] - e)) / (2 * e)
        const n = norm([-hx * sg, -hy * sg, sg]), nu = nucAt(Q[0], Q[1])
        hit = { n, top: isTop, X: Q[0], Y: Q[1], nuc: isTop ? nu.v : 1, edge: -K.foot(Q[0], Q[1]) }
      }
      prev = t
    }
    let light = -1, cast = 1
    if (hit) {
      light = hit.n[2] < 0.3 || !hit.top ? 0.02 : dot(hit.n, Lw)
      if (hit.top && hit.nuc > 0) cast = Math.min(...K.nuclei.map(([nx, ny, nr]) => Math.hypot(hit.X - nx - away[0] * nr * 0.16, hit.Y - ny - away[1] * nr * 0.16) - nr * 0.99))
    }
    const out = { g: best * k, light, nuc: hit ? hit.nuc * k : k, cast: cast * k, hit }
    cache.set(key, out)
    return out
  }
  const box = [cx - px / 2 - 4, cy - px / 2 - 4, cx + px / 2 + 4, cy + px / 2 + 4], step = clamp(px / 360, 0.5, 1.25)
  const T = (F, eps = 0.5) => traced(F, box, step, eps)
  const scale = px * 0.5
  const cyt = (lv, below) => (X, Y) => { const a = at(X, Y); return Math.max(a.g + 0.3, (below ? a.light - lv : lv - a.light) * scale) }
  const outline = T((X, Y) => at(X, Y).g, 0.2)
  // Each nucleus seen as a half spheroid on the top face: the ellipse it projects to above its middle, its base below,
  // worked out in the cell's frame (smooth, where the ray's own hits would leave steps along its upper edge).
  const nucOut = T((PX, PY) => {
    const u0 = PX - cx, v0 = PY - cy, u = (u0 * c - v0 * s) / k + midX, wv = (u0 * s + v0 * c) / k + midY
    let best = Infinity
    for (const [nx, ny, nr] of K.nuclei) {
      const r = nr * 1.12, d = -K.foot(nx, ny), h0 = K.thick * round(d) + K.dome * lift(nx, ny, d), my = ny * se - h0 * ce
      const full = Math.hypot(r * se, K.bulge * ce), dU = ellF(nx, my, r, full)(u, wv), dB = ellF(nx, my, r, Math.max(r * se, 1e-3))(u, wv)
      best = Math.min(best, Math.min(Math.max(dU, wv - my), dB))
    }
    return best * k
  }, 0.2)
  const castD = T((X, Y) => { const a = at(X, Y); return Math.max(a.g + 0.3, -a.nuc, a.cast) })
  const P = pal, N = nucPal
  const grad = (name, p0, p1) => lin(`${id}-${name}`, [cx - px / 2, cy - px / 2, cx + px / 2, cy + px / 2], [[0, p0], [1, p1]])
  const defs = grad('gradient', P.base, mix(P.base, P.shadow, 0.45))
  const layer = (name, d, fill) => (d ? `<g id="${id}-${name}">${pathEl(d, fill)}</g>` : '')
  // Small parts on the top face: flat ellipses, foreshortened by the tilt.
  const smallEls = K.small.map(([sx, sy, sr]) => {
    const [qx, qy] = toPage([sx, sy, top(sx, sy)])
    return `<ellipse cx="${f(qx)}" cy="${f(qy)}" rx="${f(sr * k)}" ry="${f(sr * k * se)}"${turn ? ` transform="rotate(${f(turn)} ${f(qx)} ${f(qy)})"` : ''} fill="${K.smallPal.small}"/>`
  }).join('')
  const body =
    `<g id="${id}-cytoplasm">${pathEl(outline, `url(#${id}-gradient)`)}</g>` +
    layer('shade', T(cyt(0.26, true), 0.3), mix(P.base, P.shadow, 0.55)) +
    layer('shadow', T(cyt(0.12, true), 0.3), P.shadow) +
    (full ? layer('lit', T(cyt(0.86, false), 0.3), mix(P.base, P.light, 0.5)) : '') +
    (full ? layer('highlight', T(cyt(0.95, false), 0.3), mix(P.base, P.light, 0.85)) : '') +
    layer('nucleus-shadow', castD, mix(P.base, P.shadow, 0.6)) +
    `<g id="${id}-vesicles">${smallEls}</g>` +
    `<g id="${id}-nucleus">${nucOut.split(' M').map((d, i) => pathEl(i ? 'M' + d : d, N.base)).join('')}` +
    `${pathEl(nucOut, 'none', N.outline, NW)}</g>` +
    `<g id="${id}-outline">${pathEl(outline, 'none', P.outline, W)}</g>`
  // The estimate of the extent above is generous at the far edge (the top is lower there): centre on the traced outline.
  const nums = [...outline.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((m) => [+m[1], +m[2]])
  const bx = [Math.min(...nums.map((q) => q[0])), Math.max(...nums.map((q) => q[0]))], by = [Math.min(...nums.map((q) => q[1])), Math.max(...nums.map((q) => q[1]))]
  const dx = f(cx - (bx[0] + bx[1]) / 2), dy = f(cy - (by[0] + by[1]) / 2)
  return { defs, body: `<g id="${id}"${dx || dy ? ` transform="translate(${dx} ${dy})"` : ''}>${body}</g>`, parts: [['cytoplasm', P], ['nucleus', N]] }
}

// =====================================================================================================================
// Demos: every shape in the three palettes and at three sizes on the page (40, 80 and 200 px of 460).
// =====================================================================================================================
const at = (px) => (px / 460) * 100
const D = (name, opts) => ({ name, size: 100, draw: (g) => shadedProtein(g, { x: 0, y: 0, size: 100, ...opts }) })
const S = (name, px, opts) => ({ name, size: 100, draw: (g) => shadedProtein(g, { x: 0, y: 0, size: at(px), ...opts }) })
// =====================================================================================================================
// The gloss of cells (STYLE.md "The gloss of cells"): the face-on look of `cell3d` for any closed outline.
// =====================================================================================================================

/** Page points of an SVG path (absolute or relative M L H V C S Q T A Z), one list per subpath; curves cut into short lines. */
export function pathPoints(d) {
  const toks = d.match(/[A-Za-z]|-?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/g) ?? []
  const subs = []
  let i = 0, cmd = '', cur = [0, 0], start = [0, 0], pts = null, lastC = null, lastQ = null
  const num = () => +toks[i++]
  const push = (p) => { pts.push(p); cur = p }
  const curve = (P, n = 24) => { for (let k = 1; k <= n; k++) { const s = k / n, u = 1 - s; push(P.length === 4 ? [0, 1].map((j) => u ** 3 * P[0][j] + 3 * u * u * s * P[1][j] + 3 * u * s * s * P[2][j] + s ** 3 * P[3][j]) : [0, 1].map((j) => u * u * P[0][j] + 2 * u * s * P[1][j] + s * s * P[2][j])) } }
  while (i < toks.length) {
    if (/[A-Za-z]/.test(toks[i])) cmd = toks[i++]
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase(), o = rel ? cur : [0, 0]
    const pt = () => { const x = num(), y = num(); return [o[0] + x, o[1] + y] }
    if (C === 'Z') { if (pts) { pts.length && subs.push(pts); pts = null } cur = start; lastC = lastQ = null; continue }
    if (C === 'M') { if (pts && pts.length) subs.push(pts); pts = []; start = pt(); push(start); cmd = rel ? 'l' : 'L'; lastC = lastQ = null; continue }
    if (!pts) pts = [cur]
    if (C === 'L') { push(pt()); lastC = lastQ = null }
    else if (C === 'H') { const x = num(); push([rel ? cur[0] + x : x, cur[1]]); lastC = lastQ = null }
    else if (C === 'V') { const y = num(); push([cur[0], rel ? cur[1] + y : y]); lastC = lastQ = null }
    else if (C === 'C') { const a = pt(), b = pt(), c = pt(); curve([cur, a, b, c]); lastC = b; lastQ = null }
    else if (C === 'S') { const a = lastC ? [2 * cur[0] - lastC[0], 2 * cur[1] - lastC[1]] : cur, b = pt(), c = pt(); curve([cur, a, b, c]); lastC = b; lastQ = null }
    else if (C === 'Q') { const a = pt(), c = pt(); curve([cur, a, c]); lastQ = a; lastC = null }
    else if (C === 'T') { const a = lastQ ? [2 * cur[0] - lastQ[0], 2 * cur[1] - lastQ[1]] : cur, c = pt(); curve([cur, a, c]); lastQ = a; lastC = null }
    else if (C === 'A') {
      let rx = Math.abs(num()), ry = Math.abs(num()); const phi = rad(num()), large = num(), sweep = num(), e = pt(), s0 = cur
      lastC = lastQ = null
      if (!rx || !ry) { push(e); continue }
      const cp = Math.cos(phi), sp = Math.sin(phi), dx = (s0[0] - e[0]) / 2, dy = (s0[1] - e[1]) / 2
      const x1 = cp * dx + sp * dy, y1 = -sp * dx + cp * dy, lam = x1 * x1 / (rx * rx) + y1 * y1 / (ry * ry)
      if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam) }
      const num2 = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1, den = rx * rx * y1 * y1 + ry * ry * x1 * x1
      const co = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num2 / den)), cxp = co * rx * y1 / ry, cyp = -co * ry * x1 / rx
      const cx = cp * cxp - sp * cyp + (s0[0] + e[0]) / 2, cy = sp * cxp + cp * cyp + (s0[1] + e[1]) / 2
      const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)
      const t1 = ang(1, 0, (x1 - cxp) / rx, (y1 - cyp) / ry)
      let dt = ang((x1 - cxp) / rx, (y1 - cyp) / ry, (-x1 - cxp) / rx, (-y1 - cyp) / ry)
      if (!sweep && dt > 0) dt -= 2 * Math.PI
      if (sweep && dt < 0) dt += 2 * Math.PI
      const n = Math.max(4, Math.ceil(Math.abs(dt) / 0.02))
      for (let k = 1; k <= n; k++) { const a = t1 + (dt * k) / n; push(k === n ? e : [cx + rx * Math.cos(a) * cp - ry * Math.sin(a) * sp, cy + rx * Math.cos(a) * sp + ry * Math.sin(a) * cp]) }
    } else i++
  }
  if (pts && pts.length) subs.push(pts)
  return subs
}

/** Squared Euclidean distance transform (Felzenszwalb–Huttenlocher) of a grid: 0 where `on`, else the squared distance in cells to the nearest `on` cell. */
function edt(on, nx, ny) {
  const INF = 1e20, D = new Float64Array(nx * ny), n = Math.max(nx, ny), fb = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1)
  const pass = (len, get, set) => {
    for (let q = 0; q < len; q++) fb[q] = get(q)
    let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF
    for (let q = 1; q < len; q++) {
      let s = ((fb[q] + q * q) - (fb[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
      while (s <= z[k]) { k--; s = ((fb[q] + q * q) - (fb[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]) }
      k++; v[k] = q; z[k] = s; z[k + 1] = INF
    }
    k = 0
    for (let q = 0; q < len; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) ** 2 + fb[v[k]] }
    for (let q = 0; q < len; q++) set(q, d[q])
  }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) D[j * nx + i] = on[j * nx + i] ? 0 : INF
  for (let i = 0; i < nx; i++) pass(ny, (q) => D[q * nx + i], (q, val) => { D[q * nx + i] = val })
  for (let j = 0; j < ny; j++) pass(nx, (q) => D[j * nx + q], (q, val) => { D[j * nx + q] = val })
  return D
}

/** The tones of the gloss for a body palette (as `cell3d` face on): the body's gradient end, the shade, the shadow, the lit band and the highlight. */
export const glossTones = (pal) => ({ end: mix(pal.base, pal.shadow, 0.45), shade: mix(pal.base, pal.shadow, 0.55), shadow: pal.shadow, lit: mix(pal.base, pal.light, 0.5), highlight: mix(pal.base, pal.light, 0.85) })

/**
 * The gloss of a cell seen from above, for any outline: `fills` are closed outlines (lists of subpaths of page points,
 * filled by the nonzero rule), `lines` thin processes ({ pts, width } in page pixels) that belong to the same body and are
 * left flat. The body is taken as a cushion over its whole silhouette (rounded at the rim, gently domed, as the generic
 * `cell3d`), lit from the top left; tone areas are traced where its light passes the thresholds of `cell3d` face on and
 * kept `inset` pixels inside the fills (half the outline, so the outline is never covered). Returns `{ shade, shadow,
 * lit, highlight }`, each a path (or ''), to be drawn in that order over the body's fill. The body's own fill should end
 * in `glossTones(pal).end` instead of its shadow.
 */
export function gloss({ fills: fills0 = [], lines: lines0 = [] }, { inset = 0, res: res0, eps = 0.3, turn = 0, about = [256, 256], exclude } = {}) {
  // A part drawn inside a turned group: its outline is turned onto the page (so the light stays at the top left), and
  // the tones are turned back into the group's frame.
  const rot = (deg) => { const c = Math.cos(rad(deg)), s = Math.sin(rad(deg)); return ([px, py]) => [about[0] + (px - about[0]) * c - (py - about[1]) * s, about[1] + (px - about[0]) * s + (py - about[1]) * c] }
  const there = rot(turn), back = rot(-turn)
  const fills = turn ? fills0.map((subs) => subs.map((sp) => sp.map(there))) : fills0
  const lines = turn ? lines0.map((l) => ({ ...l, pts: l.pts.map(there) })) : lines0
  // One outline: its exact distance, on a grid of 1 px. Several shapes or processes: a distance transform of their
  // union on a finer grid, smoothed.
  const exact = fills.length === 1 && !lines.length, res = res0 ?? (exact ? 1 : 0.5)
  const all = [...fills.flat(2), ...lines.flatMap((l) => l.pts)]
  if (!all.length) return { shade: '', shadow: '', lit: '', highlight: '' }
  const padL = Math.max(0, ...lines.map((l) => l.width / 2)) + 6
  const x0 = Math.min(...all.map((p) => p[0])) - padL, y0 = Math.min(...all.map((p) => p[1])) - padL
  const x1 = Math.max(...all.map((p) => p[0])) + padL, y1 = Math.max(...all.map((p) => p[1])) + padL
  const nx = Math.ceil((x1 - x0) / res) + 1, ny = Math.ceil((y1 - y0) / res) + 1
  const X = (i) => x0 + i * res, Y = (j) => y0 + j * res
  // Rasterise: fills by scanlines (nonzero winding over each outline's subpaths), lines as round-capped strokes.
  const fillMask = new Uint8Array(nx * ny)
  for (const subs of fills) {
    const edges = subs.flatMap((s) => s.map((p, k) => [p, s[(k + 1) % s.length]])).filter(([a, b]) => a[1] !== b[1])
    for (let j = 0; j < ny; j++) {
      const y = Y(j), xs = []
      for (const [a, b] of edges) if ((a[1] <= y) !== (b[1] <= y)) xs.push([a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]), a[1] < b[1] ? 1 : -1])
      xs.sort((p, q) => p[0] - q[0])
      let w = 0
      for (let k = 0; k < xs.length - 1; k++) {
        w += xs[k][1]
        if (w !== 0) for (let i = Math.max(0, Math.ceil((xs[k][0] - x0) / res)); i <= Math.min(nx - 1, Math.floor((xs[k + 1][0] - x0) / res)); i++) fillMask[j * nx + i] = 1
      }
    }
  }
  const sil = fillMask.slice()
  for (const { pts, width } of lines) {
    const r = width / 2
    for (let k = 0; k < pts.length - 1 || k === 0; k++) {
      const a = pts[k], b = pts[Math.min(k + 1, pts.length - 1)], vx = b[0] - a[0], vy = b[1] - a[1], L2 = vx * vx + vy * vy || 1
      const i0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - r - x0) / res)), i1 = Math.min(nx - 1, Math.ceil((Math.max(a[0], b[0]) + r - x0) / res))
      const j0 = Math.max(0, Math.floor((Math.min(a[1], b[1]) - r - y0) / res)), j1 = Math.min(ny - 1, Math.ceil((Math.max(a[1], b[1]) + r - y0) / res))
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const px = X(i) - a[0], py = Y(j) - a[1], t = clamp((px * vx + py * vy) / L2, 0, 1)
        if (Math.hypot(px - t * vx, py - t * vy) <= r) sil[j * nx + i] = 1
      }
    }
  }
  // Signed distance (px, positive inside), smoothed so the traced tones run smooth.
  const signed = (mask) => {
    const s = new Float64Array(nx * ny)
    if (exact) {
      const segs = fills[0].flatMap((sp) => sp.map((p, k) => [p, sp[(k + 1) % sp.length]]))
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const px = X(i), py = Y(j)
        let m = Infinity
        for (const [a, b] of segs) { const vx = b[0] - a[0], vy = b[1] - a[1], L2 = vx * vx + vy * vy || 1, tt = clamp(((px - a[0]) * vx + (py - a[1]) * vy) / L2, 0, 1); m = Math.min(m, (px - a[0] - tt * vx) ** 2 + (py - a[1] - tt * vy) ** 2) }
        s[j * nx + i] = mask[j * nx + i] ? Math.sqrt(m) : -Math.sqrt(m)
      }
      blur(s, 1.5 / res)
      return s
    }
    const out = edt(mask.map((m) => 1 - m), nx, ny), inn = edt(mask, nx, ny)
    let top = 0
    for (let q = 0; q < s.length; q++) { s[q] = mask[q] ? Math.sqrt(out[q]) * res - res / 2 : -(Math.sqrt(inn[q]) * res - res / 2); top = Math.max(top, s[q]) }
    blur(s, Math.max(1.5, 0.02 * top) / res)
    return s
  }
  function blur(s, sig) {
    const rad3 = Math.ceil(sig * 3), ker = Array.from({ length: 2 * rad3 + 1 }, (_, k) => Math.exp(-((k - rad3) ** 2) / (2 * sig * sig))), ks = ker.reduce((a, b) => a + b)
    const tmp = new Float64Array(s.length)
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { let a = 0; for (let k = -rad3; k <= rad3; k++) a += ker[k + rad3] * s[j * nx + clamp(i + k, 0, nx - 1)]; tmp[j * nx + i] = a / ks }
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { let a = 0; for (let k = -rad3; k <= rad3; k++) a += ker[k + rad3] * tmp[clamp(j + k, 0, ny - 1) * nx + i]; s[j * nx + i] = a / ks }
    return s
  }
  const dS = signed(sil), dF = lines.length ? signed(fillMask) : dS
  let dmax = 0
  for (let q = 0; q < dS.length; q++) dmax = Math.max(dmax, dS[q])
  // The cushion of the generic cell3d: a rim rounded over a third of the depth, two tenths high, a gentle dome.
  const edge = 0.345 * dmax, thick = 0.23 * dmax, dome = 0.092 * dmax
  const slope = (d) => { if (d <= 0) return 1e3; const u = Math.min(d / edge, 1); return (u < 1 ? (thick / edge) * (1 - u) / Math.max(1e-3, Math.sqrt(1 - (1 - u) ** 2)) : 0) + Math.max(0, dome * 2 * (1 - d / dmax) / dmax) }
  const L = norm([-0.5, -0.6, 0.65]), light = new Float64Array(nx * ny)
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const q = j * nx + i, d = dS[q]
    if (d <= 0) { light[q] = 0.02; continue }
    const gx = (dS[j * nx + Math.min(i + 1, nx - 1)] - dS[j * nx + Math.max(i - 1, 0)]), gy = (dS[Math.min(j + 1, ny - 1) * nx + i] - dS[Math.max(j - 1, 0) * nx + i])
    const gl = Math.hypot(gx, gy) || 1, s = slope(d), n = norm([-s * gx / gl, -s * gy / gl, 1])
    light[q] = n[2] < 0.3 ? 0.02 : dot(n, L)
  }
  const at = (A, px, py) => {
    const u = clamp((px - x0) / res, 0, nx - 1.001), v = clamp((py - y0) / res, 0, ny - 1.001), i = Math.floor(u), j = Math.floor(v), a = u - i, b = v - j, q = j * nx + i
    return (A[q] * (1 - a) + A[q + 1] * a) * (1 - b) + (A[q + nx] * (1 - a) + A[q + nx + 1] * a) * b
  }
  const S = 1.2 * dmax, box = [x0, y0, x1, y1], step = 1
  // `exclude: { fills, grow }`: the tones are also kept `grow` px clear of these outlines (in page points, turned like the
  // fills), so that a part drawn over the body (the matrix of a mitochondrion) is never covered by them.
  const away = exclude ? awayFrom(exclude.fills.map((subs) => (turn ? subs.map((sp) => sp.map(there)) : subs)), x0, y0, nx, ny, res) : null
  const clear = (px, py) => (away ? (exclude.grow ?? 0) + 0.3 - at(away, px, py) : -Infinity)
  const layer = (lv, below) => contours((px, py) => Math.max(inset + 0.3 - at(dF, px, py), clear(px, py), (below ? at(light, px, py) - lv : lv - at(light, px, py)) * S), box, [0], step)[0].map((l) => pathOf(simplify(l, eps).map(turn ? back : (p) => p))).join(' ')
  return { shade: layer(0.26, true), shadow: layer(0.12, true), lit: layer(0.86, false), highlight: layer(0.95, false) }
}

/** Distance (px) from every point of a grid to the nearest of some closed outlines (0 inside them). */
function awayFrom(fills, x0, y0, nx, ny, res) {
  const mask = new Uint8Array(nx * ny)
  for (const subs of fills) {
    const edges = subs.flatMap((s) => s.map((p, k) => [p, s[(k + 1) % s.length]])).filter(([a, b]) => a[1] !== b[1])
    for (let j = 0; j < ny; j++) {
      const y = y0 + j * res, xs = []
      for (const [a, b] of edges) if ((a[1] <= y) !== (b[1] <= y)) xs.push([a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]), a[1] < b[1] ? 1 : -1])
      xs.sort((p, q) => p[0] - q[0])
      let w = 0
      for (let k = 0; k < xs.length - 1; k++) {
        w += xs[k][1]
        if (w !== 0) for (let i = Math.max(0, Math.ceil((xs[k][0] - x0) / res)); i <= Math.min(nx - 1, Math.floor((xs[k + 1][0] - x0) / res)); i++) mask[j * nx + i] = 1
      }
    }
  }
  const d = edt(mask, nx, ny), out = new Float64Array(nx * ny)
  for (let q = 0; q < out.length; q++) out[q] = mask[q] ? 0 : Math.sqrt(d[q]) * res
  return out
}

/**
 * A cell of any outline with the gloss and a flat nucleus (the demo of `gloss`): `points` the outline in the cell's
 * units (-1 to 1, smoothed), `nuclei` [[x, y, r], ...] in the same units.
 * Example: glossyCell(g, { x: 0, y: 0, size: 80, points: [[-1, 0], [0, -0.8], [1, 0], [0, 0.9]] })
 */
export function glossyCell(g, { x, y, size, id = 'cell', w, pal = CELL_PAL, nucPal = NUC, points, nuclei = [[0, 0, 0.3]] }) {
  const px = size * g.k, cx = g.X(x), cy = g.Y(y), W = w ?? f(clamp(1.5 + px / 11, 3.5, 12)) * 0.6, k = (px - W) / 2
  const pts = points.map(([u, v]) => [cx + u * k, cy + v * k])
  const n = pts.length
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`
  for (let i = 0; i < n; i++) { const a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n], e = pts[(i + 2) % n]; d += `C${f(b[0] + (c[0] - a[0]) / 6)},${f(b[1] + (c[1] - a[1]) / 6)} ${f(c[0] - (e[0] - b[0]) / 6)},${f(c[1] - (e[1] - b[1]) / 6)} ${f(c[0])},${f(c[1])}` }
  d += 'Z'
  const T = glossTones(pal), G = gloss({ fills: [pathPoints(d)] }, { inset: W / 2 })
  const defs = lin(`${id}-gradient`, [cx - px / 2, cy - px / 2, cx + px / 2, cy + px / 2], [[0, pal.base], [1, T.end]])
  const NW = f(clamp(2 + px / 10, 3.5, 10) * 0.6)
  const body = `<g id="${id}-cytoplasm"><path d="${d}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="${f(W)}" stroke-linejoin="round"/>` +
    [['shade', T.shade], ['shadow', T.shadow], ['lit', T.lit], ['highlight', T.highlight]].map(([kk, c]) => (G[kk] ? `<path d="${G[kk]}" fill="${c}"/>` : '')).join('') + '</g>' +
    `<g id="${id}-nucleus">${nuclei.map(([u, v, r]) => `<circle cx="${f(cx + u * k)}" cy="${f(cy + v * k)}" r="${f(r * k)}" fill="${nucPal.base}" stroke="${nucPal.outline}" stroke-width="${NW}"/>`).join('')}</g>`
  return { defs, body, parts: [['cytoplasm', pal], ['nucleus', nucPal]] }
}

export const DEMOS = [
  { name: 'Cell 3D, tilted', size: 100, draw: (g) => cell3d(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Cell 3D, face on', size: 100, draw: (g) => cell3d(g, { x: 0, y: 0, size: 100, view: 'face' }) },
  { name: 'Hepatocyte 3D, tilted', size: 100, draw: (g) => cell3d(g, { x: 0, y: 0, size: 100, kind: 'hepatocyte' }) },
  { name: 'Hepatocyte 3D, face on', size: 100, draw: (g) => cell3d(g, { x: 0, y: 0, size: 100, kind: 'hepatocyte', view: 'face' }) },
  { name: 'Hepatocyte 3D, tilted, turned', size: 100, draw: (g) => cell3d(g, { x: 0, y: 0, size: 100, kind: 'hepatocyte', turn: 30 }) },
  { name: 'Cell 3D, 80 px', size: 100, draw: (g) => cell3d(g, { x: 0, y: 0, size: at(80) }) },
  { name: 'Hepatocyte 3D, 40 px', size: 100, draw: (g) => cell3d(g, { x: 0, y: 0, size: at(40), kind: 'hepatocyte' }) },
  { name: 'Glossy cell, any outline', size: 100, draw: (g) => glossyCell(g, { x: 0, y: 0, size: 100, points: [[-1, -0.1], [-0.7, -0.75], [0, -0.85], [0.6, -0.95], [1, -0.3], [0.85, 0.45], [0.3, 0.8], [-0.4, 0.95], [-0.9, 0.55]], nuclei: [[-0.1, 0, 0.32]] }) },
  { name: 'Glossy cell, 40 px', size: 100, draw: (g) => glossyCell(g, { x: 0, y: 0, size: at(40), points: [[-1, -0.1], [-0.7, -0.75], [0, -0.85], [0.6, -0.95], [1, -0.3], [0.85, 0.45], [0.3, 0.8], [-0.4, 0.95], [-0.9, 0.55]], nuclei: [[-0.1, 0, 0.32]] }) },
  D('Shaded protein, ball', { shape: 'ball' }),
  D('Shaded protein, cylinder', { shape: 'cylinder' }),
  D('Shaded protein, arc', { shape: 'arc' }),
  D('Shaded protein, dimer', { shape: 'dimer' }),
  D('Shaded protein, custom', { shape: 'custom', points: [[-40, -30], [10, -42], [44, -10], [30, 34], [-10, 40], [-44, 10]] }),
  D('Shaded protein, ball, blue', { shape: 'ball', pal: BLUE_PROTEIN, seed: 3 }),
  D('Shaded protein, cylinder, teal', { shape: 'cylinder', pal: TEAL_PROTEIN, seed: 2 }),
  D('Shaded protein, arc, blue, turned', { shape: 'arc', pal: BLUE_PROTEIN, turn: -40 }),
  D('Shaded protein, ball, more depth', { shape: 'ball', depth: 1.8, seed: 4 }),
  D('Shaded protein, ball, more bumps', { shape: 'ball', bumps: 64, seed: 5 }),
  S('Shaded protein, ball, 200 px', 200, { shape: 'ball' }),
  S('Shaded protein, cylinder, 200 px', 200, { shape: 'cylinder', pal: TEAL_PROTEIN }),
  S('Shaded protein, ball, 80 px', 80, { shape: 'ball' }),
  S('Shaded protein, arc, 80 px', 80, { shape: 'arc', pal: BLUE_PROTEIN }),
  S('Shaded protein, ball, 40 px', 40, { shape: 'ball' }),
  S('Shaded protein, cylinder, 40 px', 40, { shape: 'cylinder', pal: TEAL_PROTEIN }),
  S('Shaded protein, arc, 40 px', 40, { shape: 'arc' }),
  S('Shaded protein, dimer, 40 px', 40, { shape: 'dimer' }),
  { name: 'Red blood cell 3D, tilted', size: 100, draw: (g) => redBloodCell3d(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Red blood cell 3D, face on', size: 100, draw: (g) => redBloodCell3d(g, { x: 0, y: 0, size: 100, view: 'face' }) },
  { name: 'Red blood cell 3D, side', size: 100, draw: (g) => redBloodCell3d(g, { x: 0, y: 0, size: 100, view: 'side' }) },
  { name: 'Red blood cell 3D, tilted, turned', size: 100, draw: (g) => redBloodCell3d(g, { x: 0, y: 0, size: 100, turn: 35 }) },
  { name: 'Red blood cell 3D, 80 px', size: 100, draw: (g) => redBloodCell3d(g, { x: 0, y: 0, size: at(80) }) },
  { name: 'Red blood cell 3D, 40 px', size: 100, draw: (g) => redBloodCell3d(g, { x: 0, y: 0, size: at(40), view: 'face' }) },
]
