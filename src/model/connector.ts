// Turns a resolved connector into drawable geometry: the line, arrowheads, inhibition bars and
// round ends, and how a fading line fades.

import { add, dist, mul, norm, round, sub } from './geometry'
import type { ResolvedConnector } from './nodes'
import type { ConnectorFade, ConnectorKind, ConnectorNode, EndMark, Point } from './types'

export interface ConnectorShape {
  /** SVG path data for the line. */
  d: string
  /** Filled arrowheads, each as an SVG `points` string. */
  heads: string[]
  /** Flat bars (the "T" of an inhibition arrow), each as two end points. */
  bars: [Point, Point][]
  /** Round ends: filled circles. */
  dots: { c: Point; r: number }[]
}

/** Thickness of an inhibition bar, as a multiple of the line's. */
export const BAR_WIDTH = 1.3

/**
 * How see-through a fading line is at its start and at its end (1 = solid). An end that carries
 * a head, bar or dot stays faintly visible, so the mark is not lost; a bare end fades away.
 */
export function fadeStops(kind: ConnectorKind, fade: ConnectorFade | undefined, startMark?: EndMark): { start: number; end: number } | null {
  if (!fade) return null
  const marked = 0.25
  return fade === 'in' ? { start: marksOf(kind, startMark).start ? marked : 0, end: 1 } : { start: 1, end: kind === 'line' ? 0 : marked }
}

/** The mark at each end of a line: the end's comes from the kind of arrow, the start's is chosen apart ('double' has a head at both). */
export function marksOf(kind: ConnectorKind, startMark?: EndMark): { start?: EndMark; end?: EndMark } {
  if (kind === 'double') return { start: 'arrow', end: 'arrow' }
  return { ...(startMark ? { start: startMark } : {}), ...(kind === 'line' ? {} : { end: kind }) }
}

/** The kind of arrow and the start mark that put these marks at the two ends. */
export function fromMarks(start: EndMark | undefined, end: EndMark | undefined): { kind: ConnectorKind; startMark?: EndMark } {
  if (start === 'arrow' && end === 'arrow') return { kind: 'double' }
  return { kind: end ?? 'line', ...(start ? { startMark: start } : {}) }
}

/** The arrow turned round: its ends change places, and each mark goes with its end. */
export function reversed<T extends Pick<ConnectorNode, 'from' | 'to' | 'kind' | 'startMark'>>(c: T): T {
  const marks = marksOf(c.kind, c.startMark)
  const { startMark: _was, ...rest } = c
  return { ...rest, from: c.to, to: c.from, ...fromMarks(marks.end, marks.start) } as T
}

const f = (p: Point): string => `${round(p.x, 1)},${round(p.y, 1)}`

/** The point just before `end` that the line arrives from (skipping corners that coincide with it). */
function neighbour(end: Point, candidates: Point[]): Point {
  for (const p of candidates) if (dist(p, end) > 0.5) return p
  return candidates[candidates.length - 1]
}

/**
 * `flush` ends the line where a head, bar or dot begins instead of running into it. A fading line
 * needs that: two see-through shapes on top of each other would show as a darker patch.
 */
export function connectorShape(kind: ConnectorKind, strokeWidth: number, r: ResolvedConnector, flush = false, startMark?: EndMark): ConnectorShape {
  const headLen = Math.max(9, strokeWidth * 4.5)
  const headWidth = headLen * 0.85
  const barLen = Math.max(12, strokeWidth * 6)
  const dotRadius = Math.max(4.5, strokeWidth * 2.2)
  // A hair of overlap keeps the join closed when the line stops at the edge of its end mark.
  const seam = 0.5
  const via = r.via ?? []
  // Direction of travel when arriving at the end, and when leaving the start backwards.
  const beforeEnd = via.length ? neighbour(r.to, [...via].reverse().concat(r.from)) : (r.ctrl ?? r.from)
  const afterStart = via.length ? neighbour(r.from, [...via, r.to]) : (r.ctrl ?? r.to)
  const endDir = norm(sub(r.to, beforeEnd))
  const startDir = norm(sub(r.from, afterStart))
  // Pulling the line back inside a head needs room. On a straight or curved arrow both heads share
  // one stretch of line; on a right-angled one each head has its own leg.
  const needed = headLen * 1.2
  const shared = dist(r.from, r.to) > headLen * (kind === 'double' || startMark ? 2.2 : 1.2)
  const roomAtEnd = via.length ? dist(r.to, beforeEnd) > needed : shared
  const roomAtStart = via.length ? dist(r.from, afterStart) > needed : shared

  let from = r.from
  let to = r.to
  const heads: string[] = []
  const bars: [Point, Point][] = []
  const dots: { c: Point; r: number }[] = []

  const head = (tip: Point, dir: Point) => {
    const base = sub(tip, mul(dir, headLen))
    const n = { x: -dir.y, y: dir.x }
    heads.push([tip, add(base, mul(n, headWidth / 2)), sub(base, mul(n, headWidth / 2))].map(f).join(' '))
  }

  /** Draw a mark at one end and say where the line stops for it: `dir` points out of the line at that end. */
  const mark = (which: EndMark | undefined, tip: Point, dir: Point, room: boolean): Point => {
    if (which === 'arrow') {
      head(tip, dir)
      // Stop the line inside the head so its square end does not poke past the tip.
      return room ? sub(tip, mul(dir, flush ? headLen - seam : headLen * 0.8)) : tip
    }
    if (which === 'inhibit') {
      const n = { x: -dir.y, y: dir.x }
      bars.push([add(tip, mul(n, barLen / 2)), sub(tip, mul(n, barLen / 2))])
      return flush && room ? sub(tip, mul(dir, (strokeWidth * BAR_WIDTH) / 2 - seam)) : tip
    }
    if (which === 'dot') {
      // The dot sits on the end point, so an arrow that stops at the edge of an icon touches it.
      dots.push({ c: tip, r: dotRadius })
      return flush && room ? sub(tip, mul(dir, dotRadius - seam)) : tip
    }
    return tip
  }
  const marks = marksOf(kind, startMark)
  to = mark(marks.end, r.to, endDir, roomAtEnd)
  from = mark(marks.start, r.from, startDir, roomAtStart)

  const d = via.length
    ? `M${f(from)} ${via.map((p) => `L${f(p)}`).join(' ')} L${f(to)}`
    : r.ctrl
      ? `M${f(from)} Q${f(r.ctrl)} ${f(to)}`
      : `M${f(from)} L${f(to)}`
  return { d, heads, bars, dots }
}
