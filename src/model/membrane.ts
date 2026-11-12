// Lipid bilayer geometry: phospholipid heads and tails laid out along a path.

import { clamp, resample, round, smooth } from './geometry'
import type { MembraneNode, Point } from './types'

export interface MembraneShape {
  /** All head groups, as one path of small circles. */
  heads: string
  /** All fatty-acid tails, as one path of short lines. */
  tails: string
  /** The smoothed centre line (used for hit testing and for the interior fill). */
  centre: string
  headRadius: number
  tailWidth: number
  lipidCount: number
}

const n1 = (v: number): number => round(v, 1)

function circle(c: Point, r: number): string {
  return `M${n1(c.x - r)} ${n1(c.y)}a${r} ${r} 0 1 0 ${n1(2 * r)} 0a${r} ${r} 0 1 0 ${n1(-2 * r)} 0`
}

export function membraneShape(m: Pick<MembraneNode, 'points' | 'closed' | 'thickness'>): MembraneShape {
  const half = m.thickness / 2
  const r = n1(clamp(m.thickness * 0.17, 1.2, 12))
  const tailWidth = n1(Math.max(0.6, r * 0.36))
  const line = smooth(m.points, m.closed)
  const samples = resample(line, 2 * r + Math.max(0.5, r * 0.2), m.closed)
  const heads: string[] = []
  const tails: string[] = []
  const tailStart = half - 2 * r
  const tailEnd = Math.min(tailStart, half * 0.06)
  const spread = r * 0.42
  for (const s of samples) {
    for (const side of [1, -1]) {
      const head = { x: s.p.x + s.n.x * side * (half - r), y: s.p.y + s.n.y * side * (half - r) }
      heads.push(circle(head, r))
      for (const k of [-1, 1]) {
        const ox = s.t.x * k * spread
        const oy = s.t.y * k * spread
        tails.push(
          `M${n1(s.p.x + s.n.x * side * tailStart + ox)} ${n1(s.p.y + s.n.y * side * tailStart + oy)}` +
            `L${n1(s.p.x + s.n.x * side * tailEnd + ox)} ${n1(s.p.y + s.n.y * side * tailEnd + oy)}`,
        )
      }
    }
  }
  const centre = line.length
    ? 'M' + line.map((p) => `${n1(p.x)} ${n1(p.y)}`).join('L') + (m.closed ? 'Z' : '')
    : ''
  return { heads: heads.join(''), tails: tails.join(''), centre, headRadius: r, tailWidth, lipidCount: samples.length * 2 }
}
