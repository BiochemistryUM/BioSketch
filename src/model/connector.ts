// Turns a resolved connector into drawable geometry: the line, arrowheads and inhibition bars.

import { add, dist, mul, norm, round, sub } from './geometry'
import type { ResolvedConnector } from './nodes'
import type { ConnectorKind, Point } from './types'

export interface ConnectorShape {
  /** SVG path data for the line. */
  d: string
  /** Filled arrowheads, each as an SVG `points` string. */
  heads: string[]
  /** Flat bars (the "T" of an inhibition arrow), each as two end points. */
  bars: [Point, Point][]
}

const f = (p: Point): string => `${round(p.x, 1)},${round(p.y, 1)}`

export function connectorShape(kind: ConnectorKind, strokeWidth: number, r: ResolvedConnector): ConnectorShape {
  const headLen = Math.max(9, strokeWidth * 4.5)
  const headWidth = headLen * 0.85
  const barLen = Math.max(12, strokeWidth * 6)
  // Direction of travel when arriving at the end, and when leaving the start backwards.
  const endDir = norm(sub(r.to, r.ctrl ?? r.from))
  const startDir = norm(sub(r.from, r.ctrl ?? r.to))
  const roomForHeads = dist(r.from, r.to) > headLen * (kind === 'double' ? 2.2 : 1.2)

  let from = r.from
  let to = r.to
  const heads: string[] = []
  const bars: [Point, Point][] = []

  const head = (tip: Point, dir: Point) => {
    const base = sub(tip, mul(dir, headLen))
    const n = { x: -dir.y, y: dir.x }
    heads.push([tip, add(base, mul(n, headWidth / 2)), sub(base, mul(n, headWidth / 2))].map(f).join(' '))
  }

  if (kind === 'arrow' || kind === 'double') {
    head(r.to, endDir)
    // Stop the line inside the head so its square end does not poke past the tip.
    if (roomForHeads) to = sub(r.to, mul(endDir, headLen * 0.8))
  }
  if (kind === 'double') {
    head(r.from, startDir)
    if (roomForHeads) from = sub(r.from, mul(startDir, headLen * 0.8))
  }
  if (kind === 'inhibit') {
    const n = { x: -endDir.y, y: endDir.x }
    bars.push([add(r.to, mul(n, barLen / 2)), sub(r.to, mul(n, barLen / 2))])
  }

  const d = r.ctrl ? `M${f(from)} Q${f(r.ctrl)} ${f(to)}` : `M${f(from)} L${f(to)}`
  return { d, heads, bars }
}
