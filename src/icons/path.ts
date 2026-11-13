// SVG path data as a list of plain segments, so single points of an outline can be moved.
// Everything is made absolute and reduced to six commands: M, L, C, Q, A and Z.

import type { Point } from '../model/types'

export interface Seg {
  c: 'M' | 'L' | 'C' | 'Q' | 'A' | 'Z'
  /** M, L: x y · C: x1 y1 x2 y2 x y · Q: x1 y1 x y · A: rx ry turn large sweep x y · Z: nothing. */
  v: number[]
}

const ARGS: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 }
const NUMBER = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/

/** Read path data. Reading stops at the first thing that is not valid; what came before is kept. */
export function parsePath(d: string): Seg[] {
  const out: Seg[] = []
  let i = 0
  const skip = () => {
    while (i < d.length && /[\s,]/.test(d[i])) i++
  }
  const number = (): number | null => {
    skip()
    const m = NUMBER.exec(d.slice(i, i + 48))
    if (!m) return null
    i += m[0].length
    return Number(m[0])
  }
  // The two flags of an arc are single digits and may be written without a space after them.
  const flag = (): number | null => {
    skip()
    if (d[i] !== '0' && d[i] !== '1') return null
    return Number(d[i++])
  }

  let letter = ''
  let cur: Point = { x: 0, y: 0 }
  let start: Point = { x: 0, y: 0 }
  let ctrl: Point | null = null
  let before = ''
  for (;;) {
    skip()
    if (i >= d.length) break
    if (/[a-zA-Z]/.test(d[i])) {
      letter = d[i++]
      if (!(letter.toUpperCase() in ARGS)) break
    } else if (!letter || letter.toUpperCase() === 'Z') {
      break
    } else if (letter === 'M') {
      letter = 'L' // further coordinate pairs after a move are lines
    } else if (letter === 'm') {
      letter = 'l'
    }
    const up = letter.toUpperCase()
    const rel = letter !== up
    if (up === 'Z') {
      out.push({ c: 'Z', v: [] })
      cur = start
      ctrl = null
      before = up
      continue
    }
    const a: number[] = []
    for (let k = 0; k < ARGS[up]; k++) {
      const n = up === 'A' && (k === 3 || k === 4) ? flag() : number()
      if (n === null) return out
      a.push(n)
    }
    const ox = rel ? cur.x : 0
    const oy = rel ? cur.y : 0
    const reflected = (): Point => (ctrl ? { x: 2 * cur.x - ctrl.x, y: 2 * cur.y - ctrl.y } : cur)
    let next = cur
    let nextCtrl: Point | null = null
    switch (up) {
      case 'M':
        next = { x: a[0] + ox, y: a[1] + oy }
        start = next
        out.push({ c: 'M', v: [next.x, next.y] })
        break
      case 'L':
        next = { x: a[0] + ox, y: a[1] + oy }
        out.push({ c: 'L', v: [next.x, next.y] })
        break
      case 'H':
        next = { x: a[0] + ox, y: cur.y }
        out.push({ c: 'L', v: [next.x, next.y] })
        break
      case 'V':
        next = { x: cur.x, y: a[0] + oy }
        out.push({ c: 'L', v: [next.x, next.y] })
        break
      case 'C':
        next = { x: a[4] + ox, y: a[5] + oy }
        nextCtrl = { x: a[2] + ox, y: a[3] + oy }
        out.push({ c: 'C', v: [a[0] + ox, a[1] + oy, nextCtrl.x, nextCtrl.y, next.x, next.y] })
        break
      case 'S': {
        const c1 = before === 'C' || before === 'S' ? reflected() : cur
        next = { x: a[2] + ox, y: a[3] + oy }
        nextCtrl = { x: a[0] + ox, y: a[1] + oy }
        out.push({ c: 'C', v: [c1.x, c1.y, nextCtrl.x, nextCtrl.y, next.x, next.y] })
        break
      }
      case 'Q':
        next = { x: a[2] + ox, y: a[3] + oy }
        nextCtrl = { x: a[0] + ox, y: a[1] + oy }
        out.push({ c: 'Q', v: [nextCtrl.x, nextCtrl.y, next.x, next.y] })
        break
      case 'T':
        nextCtrl = before === 'Q' || before === 'T' ? reflected() : cur
        next = { x: a[0] + ox, y: a[1] + oy }
        out.push({ c: 'Q', v: [nextCtrl.x, nextCtrl.y, next.x, next.y] })
        break
      case 'A':
        next = { x: a[5] + ox, y: a[6] + oy }
        out.push({ c: 'A', v: [a[0], a[1], a[2], a[3], a[4], next.x, next.y] })
        break
    }
    cur = next
    ctrl = nextCtrl
    before = up
  }
  return out
}

const fmt = (n: number): string => String(Math.round(n * 1e4) / 1e4)

export function formatPath(segs: Seg[]): string {
  return segs.map((s) => s.c + s.v.map(fmt).join(' ')).join('')
}

/** An elliptical arc from `p0` to `p1` as cubic curves of at most a quarter turn each. */
function arcToCurves(p0: Point, rx: number, ry: number, turn: number, large: number, sweep: number, p1: Point): Seg[] {
  rx = Math.abs(rx)
  ry = Math.abs(ry)
  if (!rx || !ry || (Math.abs(p0.x - p1.x) < 1e-9 && Math.abs(p0.y - p1.y) < 1e-9)) return [{ c: 'L', v: [p1.x, p1.y] }]
  const phi = (turn * Math.PI) / 180
  const cos = Math.cos(phi)
  const sin = Math.sin(phi)
  // Centre of the ellipse, following the SVG specification's conversion from end points to centre.
  const hx = (p0.x - p1.x) / 2
  const hy = (p0.y - p1.y) / 2
  const x1 = cos * hx + sin * hy
  const y1 = -sin * hx + cos * hy
  const stretch = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry)
  if (stretch > 1) {
    rx *= Math.sqrt(stretch)
    ry *= Math.sqrt(stretch)
  }
  const top = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1
  const bottom = rx * rx * y1 * y1 + ry * ry * x1 * x1
  const k = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, top / bottom))
  const cx1 = (k * rx * y1) / ry
  const cy1 = (-k * ry * x1) / rx
  const cx = cos * cx1 - sin * cy1 + (p0.x + p1.x) / 2
  const cy = sin * cx1 + cos * cy1 + (p0.y + p1.y) / 2
  const angle = (ux: number, uy: number, vx: number, vy: number): number => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)
  const from = angle(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry)
  let sweepAngle = angle((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry)
  if (!sweep && sweepAngle > 0) sweepAngle -= 2 * Math.PI
  if (sweep && sweepAngle < 0) sweepAngle += 2 * Math.PI

  const pieces = Math.max(1, Math.ceil(Math.abs(sweepAngle) / (Math.PI / 2) - 1e-9))
  const step = sweepAngle / pieces
  const handle = (4 / 3) * Math.tan(step / 4)
  const at = (a: number): Point => ({ x: cx + rx * Math.cos(a) * cos - ry * Math.sin(a) * sin, y: cy + rx * Math.cos(a) * sin + ry * Math.sin(a) * cos })
  const along = (a: number): Point => ({ x: -rx * Math.sin(a) * cos - ry * Math.cos(a) * sin, y: -rx * Math.sin(a) * sin + ry * Math.cos(a) * cos })
  const out: Seg[] = []
  for (let i = 0; i < pieces; i++) {
    const a = from + i * step
    const b = a + step
    const pa = at(a)
    const pb = i === pieces - 1 ? p1 : at(b)
    const da = along(a)
    const db = along(b)
    out.push({ c: 'C', v: [pa.x + handle * da.x, pa.y + handle * da.y, pb.x - handle * db.x, pb.y - handle * db.y, pb.x, pb.y] })
  }
  return out
}

/**
 * The same outline with every arc written as curves. An arc cannot follow a point that is
 * dragged away (its radius no longer fits), a curve can.
 */
export function curvesOnly(segs: Seg[]): Seg[] {
  const out: Seg[] = []
  let cur: Point = { x: 0, y: 0 }
  let start: Point = { x: 0, y: 0 }
  for (const s of segs) {
    if (s.c === 'Z') {
      out.push(s)
      cur = start
      continue
    }
    const end = { x: s.v[s.v.length - 2], y: s.v[s.v.length - 1] }
    if (s.c === 'A') out.push(...arcToCurves(cur, s.v[0], s.v[1], s.v[2], s.v[3], s.v[4], end))
    else out.push(s)
    if (s.c === 'M') start = end
    cur = end
  }
  return out
}

const endOf = (s: Seg): Point => ({ x: s.v[s.v.length - 2], y: s.v[s.v.length - 1] })
const near = (a: Point, b: Point): boolean => Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6

/** First and last drawing segment of the stretch of outline (from one M to the next) that holds `i`. */
function stretch(segs: Seg[], i: number): [number, number] {
  let a = i
  while (a > 0 && segs[a].c !== 'M') a--
  let b = i
  while (b + 1 < segs.length && segs[b + 1].c !== 'M') b++
  while (b > a && segs[b].c === 'Z') b--
  return [a, b]
}

/** True when the outline returns to where it began, so its first and last point are one and the same. */
function joinsUp(segs: Seg[], a: number, b: number): boolean {
  return b > a && segs[a].c === 'M' && near(endOf(segs[a]), endOf(segs[b]))
}

export interface Anchor extends Point {
  /** Index of the segment that ends at this point. */
  index: number
}

/** The points an outline passes through. Where it returns to its start, that point is listed once. */
export function anchorsOf(segs: Seg[]): Anchor[] {
  const out: Anchor[] = []
  segs.forEach((s, index) => {
    if (s.c === 'Z') return
    const [a, b] = stretch(segs, index)
    if (index === b && joinsUp(segs, a, b)) return
    out.push({ index, ...endOf(s) })
  })
  return out
}

/** Move one point of the outline. The curve handles next to it move along, so curves keep their shape. */
export function moveAnchor(segs: Seg[], index: number, dx: number, dy: number): Seg[] {
  const out = segs.map((s) => ({ c: s.c, v: [...s.v] }))
  const shift = (i: number) => {
    const s = out[i]
    if (!s || s.c === 'Z') return
    s.v[s.v.length - 2] += dx
    s.v[s.v.length - 1] += dy
    if (s.c === 'C') {
      s.v[2] += dx
      s.v[3] += dy
    }
    const next = out[i + 1]
    if (next?.c === 'C') {
      next.v[0] += dx
      next.v[1] += dy
    }
  }
  if (!out[index] || out[index].c === 'Z') return out
  const [a, b] = stretch(segs, index)
  const closed = joinsUp(segs, a, b)
  shift(index)
  if (closed && index === a) shift(b)
  if (closed && index === b) shift(a)
  return out
}
