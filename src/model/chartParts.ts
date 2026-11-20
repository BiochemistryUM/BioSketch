// Which part of a chart lies under a press: a bar, an error bar, a fitted line, a title. The
// layout of a chart notes for every mark the part it belongs to (`partOf` in chart.ts); here the
// marks are searched for the one under a place, with some reach around it, because an error bar
// is one unit wide and a finger is not. It is plain geometry on the layout, so nothing is added
// to the page or to an exported file.

import { partOf, type ChartDrawing, type ChartPart } from './chart'
import { measureText } from './nodes'
import type { TextNode } from './types'

export interface PartBox {
  x: number
  y: number
  w: number
  h: number
}

export interface PartHit {
  part: ChartPart
  /** A box round everything drawn for that part, in the chart's own box. */
  box: PartBox
}

type Pt = [number, number]

const samePart = (a: ChartPart, b: ChartPart): boolean => a.what === b.what && a.at === b.at

/** How far a point is from the line between two others. */
function toSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const [dx, dy] = [x2 - x1, y2 - y1]
  const len2 = dx * dx + dy * dy
  const t = len2 ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2)) : 0
  return Math.hypot(px - x1 - t * dx, py - y1 - t * dy)
}

/**
 * The outline of a path of a chart as runs of points. A chart's paths are made of straight pieces
 * (M, L, H, V, Z) and the round edge of a pie slice (A, with one radius and no turn), which is cut
 * into short straight pieces here.
 */
export function pathPoints(d: string): { points: Pt[]; closed: boolean }[] {
  const runs: { points: Pt[]; closed: boolean }[] = []
  let run: Pt[] = []
  let [x, y] = [0, 0]
  const close = (closed: boolean) => {
    if (run.length) runs.push({ points: run, closed })
    run = []
  }
  for (const piece of d.match(/[MLHVAZ][^MLHVAZ]*/gi) ?? []) {
    const cmd = piece[0].toUpperCase()
    const n = (piece.slice(1).match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number)
    if (cmd === 'Z') {
      close(true)
      continue
    }
    if (cmd === 'M') close(false)
    if (cmd === 'H') for (const v of n) run.push([(x = v), y])
    else if (cmd === 'V') for (const v of n) run.push([x, (y = v)])
    else if (cmd === 'A') {
      for (let k = 0; k + 6 < n.length; k += 7) {
        const [r, large, sweep, ex, ey] = [n[k], n[k + 3], n[k + 4], n[k + 5], n[k + 6]]
        // The centre of the circle the arc is part of, from its two ends (the rule SVG states for arcs).
        const [hx, hy] = [(x - ex) / 2, (y - ey) / 2]
        const half2 = hx * hx + hy * hy
        const k2 = half2 ? Math.sqrt(Math.max(0, r * r - half2) / half2) * (large !== sweep ? 1 : -1) : 0
        const [cx, cy] = [(x + ex) / 2 + k2 * hy, (y + ey) / 2 - k2 * hx]
        const from = Math.atan2(y - cy, x - cx)
        let turn = Math.atan2(ey - cy, ex - cx) - from
        if (sweep && turn < 0) turn += 2 * Math.PI
        if (!sweep && turn > 0) turn -= 2 * Math.PI
        const steps = Math.max(1, Math.ceil(Math.abs(turn) / (Math.PI / 18)))
        const radius = Math.hypot(x - cx, y - cy)
        for (let i = 1; i <= steps; i++) run.push([cx + radius * Math.cos(from + (turn * i) / steps), cy + radius * Math.sin(from + (turn * i) / steps)])
        ;[x, y] = [ex, ey]
      }
    } else for (let k = 0; k + 1 < n.length; k += 2) run.push([(x = n[k]), (y = n[k + 1])])
  }
  close(false)
  return runs
}

/** How far a point is from the outline of a run of points. */
function toOutline(px: number, py: number, run: { points: Pt[]; closed: boolean }): number {
  const p = run.points
  if (p.length === 1) return Math.hypot(px - p[0][0], py - p[0][1])
  let best = Infinity
  for (let i = 1; i < p.length; i++) best = Math.min(best, toSegment(px, py, p[i - 1][0], p[i - 1][1], p[i][0], p[i][1]))
  if (run.closed && p.length > 2) best = Math.min(best, toSegment(px, py, p[p.length - 1][0], p[p.length - 1][1], p[0][0], p[0][1]))
  return best
}

/** True when a point lies inside a closed run of points. */
function inside(px: number, py: number, p: Pt[]): boolean {
  let within = false
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    if (p[i][1] > py !== p[j][1] > py && px < ((p[j][0] - p[i][0]) * (py - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) within = !within
  }
  return within
}

/** The box a piece of lettering fills as it is written, and its box on the chart (they differ when it is turned). */
function textBoxes(t: TextNode): { own: PartBox; drawn: PartBox } {
  const { w, h } = measureText(t)
  const left = t.align === 'left' ? t.x : t.align === 'right' ? t.x - w : t.x - w / 2
  const own = { x: left, y: t.y, w, h }
  // Lettering is turned about the middle of its box; a chart only turns it a quarter.
  const quarter = Math.abs(((t.rotation % 180) + 180) % 180 - 90) < 1
  const [cx, cy] = [left + w / 2, t.y + h / 2]
  return { own, drawn: quarter ? { x: cx - h / 2, y: cy - w / 2, w: h, h: w } : own }
}

const grow = (box: PartBox | null, x1: number, y1: number, x2: number, y2: number): PartBox => {
  if (!box) return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) }
  const [l, t] = [Math.min(box.x, x1, x2), Math.min(box.y, y1, y2)]
  return { x: l, y: t, w: Math.max(box.x + box.w, x1, x2) - l, h: Math.max(box.y + box.h, y1, y2) - t }
}

/** A box round everything a drawing holds for a part; null when it holds nothing for it. */
export function partBox(drawing: ChartDrawing, part: ChartPart): PartBox | null {
  let box: PartBox | null = null
  // The marks of small panels, moved to where each panel stands.
  for (const p of drawing.panels ?? []) {
    const own = partBox(p.drawing, part)
    if (own) box = grow(box, p.x + own.x, p.y + own.y, p.x + own.x + own.w, p.y + own.y + own.h)
  }
  const mine = (mark: object): boolean => {
    const own = partOf(mark)
    return !!own && samePart(own, part)
  }
  for (const r of drawing.rects) if (mine(r)) box = grow(box, r.x, r.y, r.x + r.w, r.y + r.h)
  for (const s of drawing.swatches) if (mine(s)) box = grow(box, s.x, s.y, s.x + s.size, s.y + s.size)
  for (const c of drawing.circles) if (mine(c)) box = grow(box, c.cx - c.r, c.cy - c.r, c.cx + c.r, c.cy + c.r)
  for (const list of [drawing.lines, drawing.dashes, drawing.rules]) for (const l of list) if (mine(l)) box = grow(box, l.x1, l.y1, l.x2, l.y2)
  for (const p of drawing.paths) if (mine(p)) for (const run of pathPoints(p.d)) for (const [x, y] of run.points) box = grow(box, x, y, x, y)
  for (const t of drawing.texts) {
    if (!mine(t)) continue
    const { drawn } = textBoxes(t)
    box = grow(box, drawn.x, drawn.y, drawn.x + drawn.w, drawn.y + drawn.h)
  }
  return box
}

/** A circle this large is an area to press into (a Venn circle, a pie of one slice), not a point to aim at. */
const AREA_RADIUS = 14

/**
 * The part of a chart at a place in the chart's own box; null when nothing that belongs to a part
 * is within `reach` of it. Lettering comes first, then what is small or thin (points, error bars,
 * fitted and dashed lines) within reach, then what is filled (bars, boxes, slices, cells) under the
 * place itself, then axes and brackets within reach, then what is filled and only near.
 */
export function partAt(drawing: ChartDrawing, x: number, y: number, reach: number): PartHit | null {
  // A chart of small panels: its own lettering and legend first, then the panel under the press.
  if (drawing.panels?.length) {
    const own = marksAt({ ...drawing, panels: undefined }, x, y, reach)
    if (own) return { part: own.part, box: partBox(drawing, own.part) ?? own.box }
    for (const p of drawing.panels) {
      if (x < p.x - reach || x > p.x + p.w + reach || y < p.y - reach || y > p.y + p.h + reach) continue
      const hit = marksAt(p.drawing, x - p.x, y - p.y, reach)
      if (hit) return { part: hit.part, box: { ...hit.box, x: hit.box.x + p.x, y: hit.box.y + p.y } }
    }
    return null
  }
  return marksAt(drawing, x, y, reach)
}

function marksAt(drawing: ChartDrawing, x: number, y: number, reach: number): PartHit | null {
  let best: { part: ChartPart; score: number } | null = null
  const offer = (mark: object, tier: number, far: number) => {
    const part = partOf(mark)
    if (!part || !(far <= reach)) return
    const score = tier * 1e6 + far
    if (!best || score <= best.score) best = { part, score }
  }
  for (const t of drawing.texts) {
    if (!partOf(t)) continue
    const { drawn } = textBoxes(t)
    if (x >= drawn.x - 2 && x <= drawn.x + drawn.w + 2 && y >= drawn.y - 1 && y <= drawn.y + drawn.h + 1) offer(t, 0, 0)
  }
  for (const r of drawing.rects) {
    const far = Math.hypot(Math.max(r.x - x, 0, x - r.x - r.w), Math.max(r.y - y, 0, y - r.y - r.h))
    offer(r, far === 0 ? 2 : 3, far)
  }
  for (const s of drawing.swatches) {
    const far = Math.hypot(Math.max(s.x - x, 0, x - s.x - s.size), Math.max(s.y - y, 0, y - s.y - s.size))
    offer(s, far === 0 ? 2 : 3, far)
  }
  for (const p of drawing.paths) {
    if (!partOf(p)) continue
    const runs = pathPoints(p.d)
    const edge = Math.max(0, Math.min(...runs.map((run) => toOutline(x, y, run))) - p.width / 2)
    if (p.fill && runs.some((run) => run.points.length > 2 && inside(x, y, run.points))) offer(p, 2, 0)
    else offer(p, p.fill ? 3 : 1, edge)
  }
  for (const c of drawing.circles) {
    const centre = Math.hypot(x - c.cx, y - c.cy)
    if (c.ring && c.r >= AREA_RADIUS) continue
    if (c.r >= AREA_RADIUS) offer(c, centre <= c.r ? 2 : 3, Math.max(0, centre - c.r))
    else offer(c, 1, Math.max(0, centre - c.r))
  }
  for (const l of drawing.lines) offer(l, 1, Math.max(0, toSegment(x, y, l.x1, l.y1, l.x2, l.y2) - l.width / 2))
  for (const l of drawing.dashes) offer(l, 1, toSegment(x, y, l.x1, l.y1, l.x2, l.y2))
  // An axis runs along the foot of every bar: a press inside a bar means the bar, a press beside it the axis.
  for (const l of drawing.rules) offer(l, 2.5, Math.max(0, toSegment(x, y, l.x1, l.y1, l.x2, l.y2) - l.width / 2))
  if (!best) return null
  const found: ChartPart = (best as { part: ChartPart }).part
  const box = partBox(drawing, found)
  return box ? { part: found, box } : null
}
