import type { Box, Point, Rect } from './types'

export const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y })
export const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y })
export const mul = (a: Point, s: number): Point => ({ x: a.x * s, y: a.y * s })
export const len = (a: Point): number => Math.hypot(a.x, a.y)
export const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y)
export const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

export function norm(a: Point): Point {
  const l = len(a)
  return l < 1e-9 ? { x: 1, y: 0 } : { x: a.x / l, y: a.y / l }
}

/** Rotate `p` by `deg` degrees (clockwise on screen) about `origin`. */
export function rotate(p: Point, deg: number, origin: Point = { x: 0, y: 0 }): Point {
  if (!deg) return p
  const r = (deg * Math.PI) / 180
  const c = Math.cos(r)
  const s = Math.sin(r)
  const dx = p.x - origin.x
  const dy = p.y - origin.y
  return { x: origin.x + dx * c - dy * s, y: origin.y + dx * s + dy * c }
}

export const round = (v: number, digits = 2): number => {
  const f = 10 ** digits
  return Math.round(v * f) / f
}

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))
export const snapTo = (v: number, grid: number): number => (grid > 0 ? Math.round(v / grid) * grid : v)

export const rectCenter = (r: Rect): Point => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })

export function boxCorners(b: Box): Point[] {
  const c = rectCenter(b)
  return [
    { x: b.x, y: b.y },
    { x: b.x + b.w, y: b.y },
    { x: b.x + b.w, y: b.y + b.h },
    { x: b.x, y: b.y + b.h },
  ].map((p) => rotate(p, b.rotation, c))
}

export function rectOfPoints(points: Point[]): Rect {
  if (!points.length) return { x: 0, y: 0, w: 0, h: 0 }
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const p of points) {
    if (p.x < x0) x0 = p.x
    if (p.y < y0) y0 = p.y
    if (p.x > x1) x1 = p.x
    if (p.y > y1) y1 = p.y
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

export const rectOfBox = (b: Box): Rect => (b.rotation ? rectOfPoints(boxCorners(b)) : { x: b.x, y: b.y, w: b.w, h: b.h })

export function unionRects(rects: Rect[]): Rect {
  if (!rects.length) return { x: 0, y: 0, w: 0, h: 0 }
  const x0 = Math.min(...rects.map((r) => r.x))
  const y0 = Math.min(...rects.map((r) => r.y))
  const x1 = Math.max(...rects.map((r) => r.x + r.w))
  const y1 = Math.max(...rects.map((r) => r.y + r.h))
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

export const rectsIntersect = (a: Rect, b: Rect): boolean =>
  a.x <= b.x + b.w && a.x + a.w >= b.x && a.y <= b.y + b.h && a.y + a.h >= b.y

/** True when `inner` lies completely inside `outer`. */
export const rectContains = (outer: Rect, inner: Rect): boolean =>
  inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h

export const pointInRect = (p: Point, r: Rect, pad = 0): boolean =>
  p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad

export function normalizeRect(a: Point, b: Point): Rect {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) }
}

function segmentDistance(p: Point, a: Point, b: Point): number {
  const ab = sub(b, a)
  const l2 = ab.x * ab.x + ab.y * ab.y
  if (l2 < 1e-12) return dist(p, a)
  const t = clamp(((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / l2, 0, 1)
  return dist(p, { x: a.x + ab.x * t, y: a.y + ab.y * t })
}

/** Ramer-Douglas-Peucker: drop points that lie within `tolerance` of the simplified line. */
export function simplify(points: Point[], tolerance: number): Point[] {
  const n = points.length
  if (n <= 2) return points.slice()
  const keep = new Uint8Array(n)
  keep[0] = 1
  keep[n - 1] = 1
  const stack: [number, number][] = [[0, n - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()!
    let worst = 0
    let index = -1
    for (let i = a + 1; i < b; i++) {
      const d = segmentDistance(points[i], points[a], points[b])
      if (d > worst) {
        worst = d
        index = i
      }
    }
    if (index >= 0 && worst > tolerance) {
      keep[index] = 1
      stack.push([a, index], [index, b])
    }
  }
  return points.filter((_, i) => keep[i])
}

/** Smooth a polyline with a Catmull-Rom spline. Returns a denser polyline through the same points. */
export function smooth(points: Point[], closed: boolean, steps = 8): Point[] {
  const n = points.length
  if (n < 3) return points.slice()
  const at = (i: number): Point => (closed ? points[((i % n) + n) % n] : points[clamp(i, 0, n - 1)])
  const out: Point[] = []
  const segments = closed ? n : n - 1
  for (let i = 0; i < segments; i++) {
    const p0 = at(i - 1)
    const p1 = at(i)
    const p2 = at(i + 1)
    const p3 = at(i + 2)
    for (let s = 0; s < steps; s++) {
      const t = s / steps
      const t2 = t * t
      const t3 = t2 * t
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      })
    }
  }
  if (!closed) out.push(points[n - 1])
  return out
}

export function polylineLength(points: Point[], closed: boolean): number {
  let total = 0
  for (let i = 1; i < points.length; i++) total += dist(points[i - 1], points[i])
  if (closed && points.length > 1) total += dist(points[points.length - 1], points[0])
  return total
}

export interface PathSample {
  p: Point
  /** Unit tangent. */
  t: Point
  /** Unit normal (tangent rotated by 90 degrees). */
  n: Point
}

/** Walk a polyline and return evenly spaced samples, about `spacing` apart. */
export function resample(points: Point[], spacing: number, closed: boolean): PathSample[] {
  if (points.length < 2 || spacing <= 0) return []
  const pts = closed ? [...points, points[0]] : points
  const total = polylineLength(points, closed)
  if (total < 1e-6) return []
  const count = Math.max(1, Math.round(total / spacing))
  const step = total / count
  const samples: PathSample[] = []
  const wanted = closed ? count : count + 1
  let seg = 0
  let segStart = 0
  let segLen = dist(pts[0], pts[1])
  for (let k = 0; k < wanted; k++) {
    const target = Math.min(k * step, total)
    while (seg < pts.length - 2 && segStart + segLen < target) {
      segStart += segLen
      seg++
      segLen = dist(pts[seg], pts[seg + 1])
    }
    const a = pts[seg]
    const b = pts[seg + 1]
    const f = segLen < 1e-9 ? 0 : clamp((target - segStart) / segLen, 0, 1)
    const t = norm(sub(b, a))
    samples.push({ p: { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }, t, n: { x: -t.y, y: t.x } })
  }
  return samples
}
