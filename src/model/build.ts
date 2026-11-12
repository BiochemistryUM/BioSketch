// Small builders for common figure parts, shared by the example figures and the AI scene converter.

import { uid } from './doc'
import type { Point, TextNode } from './types'

export const INK = '#2b2f36'

/** A centred text label whose top edge is at `top`. */
export function textLabel(text: string, cx: number, top: number, extra: Partial<TextNode> = {}): TextNode {
  return { id: uid(), type: 'text', x: Math.round(cx), y: Math.round(top), text, fontSize: 16, fill: INK, align: 'center', rotation: 0, ...extra }
}

/** Points on a rounded outline. `power` 2 is an ellipse; higher values give flatter sides. */
export function outlinePoints(cx: number, cy: number, rx: number, ry: number, count: number, power = 2): Point[] {
  const pts: Point[] = []
  for (let i = 0; i < count; i++) {
    const t = (i / count) * 2 * Math.PI
    const c = Math.cos(t)
    const s = Math.sin(t)
    pts.push({
      x: Math.round(cx + rx * Math.sign(c) * Math.abs(c) ** (2 / power)),
      y: Math.round(cy + ry * Math.sign(s) * Math.abs(s) ** (2 / power)),
    })
  }
  return pts
}
