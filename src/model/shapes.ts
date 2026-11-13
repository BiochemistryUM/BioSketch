// The outlines of shapes: what each kind looks like, where an arrow meets it, and where the
// words inside it go. Rectangles, rounded rectangles and ellipses are drawn with SVG's own
// elements; every other kind is a path made here.

import type { Point, ShapeKind } from './types'

/** Every kind of shape, in the order the picker shows them. */
export const SHAPE_KINDS: ShapeKind[] = ['roundrect', 'rect', 'ellipse', 'triangle', 'diamond', 'hexagon', 'cylinder', 'callout', 'bracket']

/** A bracket is an open line: it is never filled. */
export const isOpenShape = (shape: ShapeKind): boolean => shape === 'bracket'

const r1 = (v: number): number => Math.round(v * 10) / 10
const at = (p: Point): string => `${r1(p.x)} ${r1(p.y)}`

/** How far the slanted ends of a hexagon cut into its width. */
const hexInset = (w: number, h: number): number => Math.min(w * 0.25, h * 0.5)
/** Half the height of the rim of a cylinder. */
export const cylinderRim = (w: number, h: number): number => Math.min(h * 0.15, w * 0.25)
/** Share of a callout's height taken by the bubble; the rest is the pointer under it. */
const CALLOUT_BODY = 0.78

/**
 * The corners of a shape with straight sides, in a box of the given size with its top-left
 * corner at (0, 0); null for kinds that follow their box (or an ellipse).
 */
export function shapeCorners(shape: ShapeKind, w: number, h: number): Point[] | null {
  switch (shape) {
    case 'triangle':
      return [{ x: w / 2, y: 0 }, { x: w, y: h }, { x: 0, y: h }]
    case 'diamond':
      return [{ x: w / 2, y: 0 }, { x: w, y: h / 2 }, { x: w / 2, y: h }, { x: 0, y: h / 2 }]
    case 'hexagon': {
      const i = hexInset(w, h)
      return [{ x: i, y: 0 }, { x: w - i, y: 0 }, { x: w, y: h / 2 }, { x: w - i, y: h }, { x: i, y: h }, { x: 0, y: h / 2 }]
    }
    case 'callout': {
      const b = h * CALLOUT_BODY
      return [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: b }, { x: w * 0.42, y: b }, { x: w * 0.2, y: h }, { x: w * 0.26, y: b }, { x: 0, y: b }]
    }
    default:
      return null
  }
}

/** SVG path data for a shape that is drawn as a path; null for rectangles and ellipses. */
export function shapePath(shape: ShapeKind, x: number, y: number, w: number, h: number): string | null {
  const p = (px: number, py: number): string => at({ x: x + px, y: y + py })
  switch (shape) {
    case 'triangle':
    case 'diamond':
    case 'hexagon':
      return `M${shapeCorners(shape, w, h)!.map((c) => p(c.x, c.y)).join('L')}Z`
    case 'callout': {
      // A rounded bubble with a pointer at the bottom left.
      const b = h * CALLOUT_BODY
      const r = Math.min(14, w / 4, b / 4)
      return (
        `M${p(r, 0)}L${p(w - r, 0)}Q${p(w, 0)} ${p(w, r)}L${p(w, b - r)}Q${p(w, b)} ${p(w - r, b)}` +
        `L${p(w * 0.42, b)}L${p(w * 0.2, h)}L${p(w * 0.26, b)}L${p(r, b)}Q${p(0, b)} ${p(0, b - r)}L${p(0, r)}Q${p(0, 0)} ${p(r, 0)}Z`
      )
    }
    case 'cylinder': {
      // An upright tube: the body, then the front edge of its top rim.
      const ry = cylinderRim(w, h)
      const rx = r1(w / 2)
      const arc = `A${rx} ${r1(ry)} 0 0 0`
      return `M${p(0, ry)}L${p(0, h - ry)}${arc} ${p(w, h - ry)}L${p(w, ry)}${arc} ${p(0, ry)}ZM${p(0, ry)}${arc} ${p(w, ry)}`
    }
    case 'bracket': {
      // A curly brace that opens to the right, like "{": turn it to face any other way.
      const q = Math.min(w / 2, h / 4)
      const m = w / 2
      return (
        `M${p(w, 0)}Q${p(m, 0)} ${p(m, q)}L${p(m, h / 2 - q)}Q${p(m, h / 2)} ${p(0, h / 2)}` +
        `Q${p(m, h / 2)} ${p(m, h / 2 + q)}L${p(m, h - q)}Q${p(m, h)} ${p(w, h)}`
      )
    }
    default:
      return null
  }
}

/**
 * How far along `direction` (from the centre of the shape's box) the outline lies, as a multiple
 * of `direction`; null for kinds that follow their box or an ellipse. `grow` pushes the outline
 * outwards by that many units, so an arrow stops a little short of it.
 */
export function outlineAlong(shape: ShapeKind, w: number, h: number, direction: Point, grow = 0): number | null {
  const corners = shapeCorners(shape, w, h)
  if (!corners) return null
  // The outline, seen from the centre of the box and enlarged to leave the gap.
  const sx = (w + 2 * grow) / w
  const sy = (h + 2 * grow) / h
  const points = corners.map((c) => ({ x: (c.x - w / 2) * sx, y: (c.y - h / 2) * sy }))
  let best: number | null = null
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    const edge = { x: b.x - a.x, y: b.y - a.y }
    const cross = direction.x * edge.y - direction.y * edge.x
    if (Math.abs(cross) < 1e-9) continue
    const t = (a.x * edge.y - a.y * edge.x) / cross
    const u = (a.x * direction.y - a.y * direction.x) / cross
    if (t > 0 && u >= -1e-9 && u <= 1 + 1e-9 && (best === null || t < best)) best = t
  }
  return best
}

/**
 * Where the words inside a shape go: the share of its width a line may take, and how far down
 * (as a share of its height) their middle sits.
 */
export function shapeTextArea(shape: ShapeKind, w: number, h: number): { width: number; middle: number } {
  switch (shape) {
    case 'ellipse':
      return { width: 0.72, middle: 0.5 }
    case 'triangle':
      return { width: 0.5, middle: 0.66 }
    case 'diamond':
      return { width: 0.5, middle: 0.5 }
    case 'hexagon':
      // Words sit across the middle, where a hexagon is widest: allow halfway between its flat top and its full width.
      return { width: 1 - hexInset(w, h) / w, middle: 0.5 }
    case 'cylinder':
      return { width: 1, middle: 0.5 + cylinderRim(w, h) / h }
    case 'callout':
      return { width: 1, middle: CALLOUT_BODY / 2 }
    default:
      return { width: 1, middle: 0.5 }
  }
}
