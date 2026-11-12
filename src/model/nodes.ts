// Geometry of individual nodes: bounding boxes, moving, resizing, rotating, connector ends.

import { add, clamp, len, mid, mul, rectCenter, rectOfBox, rectOfPoints, rotate, round, sub } from './geometry'
import {
  FONT_FAMILY,
  LINE_HEIGHT,
  type Box,
  type ConnectorNode,
  type Endpoint,
  type FigDoc,
  type FigNode,
  type Point,
  type Rect,
  type TextNode,
} from './types'

// ---------- text measuring ----------

let measureCtx: CanvasRenderingContext2D | null | undefined

export function fontOf(node: Pick<TextNode, 'fontSize' | 'bold' | 'italic'>): string {
  return `${node.italic ? 'italic ' : ''}${node.bold ? 'bold ' : ''}${node.fontSize}px ${FONT_FAMILY}`
}

function lineWidth(text: string, node: TextNode): number {
  if (measureCtx === undefined) {
    measureCtx = null
    // jsdom has no canvas; tests use the character-count estimate below.
    if (typeof document !== 'undefined' && !/jsdom/i.test(navigator.userAgent)) {
      try {
        measureCtx = document.createElement('canvas').getContext('2d')
      } catch {
        measureCtx = null
      }
    }
  }
  if (measureCtx) {
    measureCtx.font = fontOf(node)
    return measureCtx.measureText(text).width
  }
  return text.length * node.fontSize * (node.bold ? 0.6 : 0.55)
}

export function measureText(node: TextNode): { w: number; h: number } {
  const lines = node.text.split('\n')
  const w = Math.max(node.fontSize * 0.5, ...lines.map((l) => lineWidth(l, node)))
  return { w, h: lines.length * node.fontSize * LINE_HEIGHT }
}

// ---------- lookup ----------

export const findNode = (doc: FigDoc, id: string | undefined): FigNode | undefined =>
  id ? doc.nodes.find((n) => n.id === id) : undefined

/** Node types a connector end can attach to. */
export const canAttach = (n: FigNode | undefined): boolean => !!n && (n.type === 'icon' || n.type === 'shape' || n.type === 'text')

// ---------- connectors ----------

export const CONNECTOR_GAP = 6

export interface ResolvedConnector {
  from: Point
  to: Point
  /** Quadratic control point, or null for a straight connector. */
  ctrl: Point | null
}

interface Anchor {
  center: Point
  node: FigNode | null
  /** The attached node's own box (rotation not applied), or null for a free end. */
  box: Box | null
}

function anchorOf(ep: Endpoint, doc: FigDoc): Anchor {
  const node = findNode(doc, ep.nodeId)
  if (node && canAttach(node)) {
    const box = getBox(node, doc)
    return { center: rectCenter(box), node, box }
  }
  return { center: { x: ep.x, y: ep.y }, node: null, box: null }
}

/** Point on the edge of the anchor's node (a little outside it), on the way from its centre toward `toward`. */
function clipToEdge(a: Anchor, toward: Point): Point {
  if (!a.box || !a.node) return a.center
  const hw = a.box.w / 2 + CONNECTOR_GAP
  const hh = a.box.h / 2 + CONNECTOR_GAP
  const d = sub(toward, a.center)
  if (len(d) < 1e-6) return a.center
  // Work in the node's own frame so rotated nodes are met at their real outline.
  const local = rotate(d, -a.box.rotation)
  let s: number
  if (a.node.type === 'shape' && a.node.shape === 'ellipse') {
    s = 1 / Math.sqrt((local.x / hw) ** 2 + (local.y / hh) ** 2)
  } else {
    s = Math.min(local.x ? hw / Math.abs(local.x) : Infinity, local.y ? hh / Math.abs(local.y) : Infinity)
  }
  return add(a.center, mul(d, Math.min(1, s)))
}

/** Work out where a connector really starts and ends, following any nodes it is attached to. */
export function resolveConnector(c: ConnectorNode, doc: FigDoc): ResolvedConnector {
  const a = anchorOf(c.from, doc)
  const b = anchorOf(c.to, doc)
  const ctrl = c.bend ? add(mid(a.center, b.center), mul(c.bend, 2)) : null
  return { from: clipToEdge(a, ctrl ?? b.center), to: clipToEdge(b, ctrl ?? a.center), ctrl }
}

/** The point halfway along the connector (on the curve when it is bent). */
export function connectorMid(r: ResolvedConnector): Point {
  if (!r.ctrl) return mid(r.from, r.to)
  return { x: (r.from.x + 2 * r.ctrl.x + r.to.x) / 4, y: (r.from.y + 2 * r.ctrl.y + r.to.y) / 4 }
}

/** The `bend` value that makes the connector pass through `handle`. Undefined = straight. */
export function bendThrough(c: ConnectorNode, doc: FigDoc, handle: Point): Point | undefined {
  const r = resolveConnector(c, doc)
  const a = anchorOf(c.from, doc).center
  const b = anchorOf(c.to, doc).center
  const ctrl = sub(mul(handle, 2), mid(r.from, r.to))
  const bend = mul(sub(ctrl, mid(a, b)), 0.5)
  return len(bend) < 4 ? undefined : { x: round(bend.x, 1), y: round(bend.y, 1) }
}

// ---------- boxes ----------

/** The node's own box (before rotation is applied about its centre). */
export function getBox(node: FigNode, doc: FigDoc): Box {
  switch (node.type) {
    case 'icon':
    case 'shape':
      return { x: node.x, y: node.y, w: node.w, h: node.h, rotation: node.rotation }
    case 'text': {
      const m = measureText(node)
      const x = node.align === 'center' ? node.x - m.w / 2 : node.align === 'right' ? node.x - m.w : node.x
      return { x, y: node.y, w: m.w, h: m.h, rotation: node.rotation }
    }
    case 'membrane': {
      const r = rectOfPoints(node.points)
      const p = node.thickness / 2
      return { x: r.x - p, y: r.y - p, w: r.w + 2 * p, h: r.h + 2 * p, rotation: 0 }
    }
    case 'stroke': {
      const r = rectOfPoints(node.points.map(([x, y]) => ({ x, y })))
      const p = node.size / 2
      return { x: r.x - p, y: r.y - p, w: r.w + 2 * p, h: r.h + 2 * p, rotation: 0 }
    }
    case 'connector': {
      const r = resolveConnector(node, doc)
      return { ...rectOfPoints([r.from, r.to, connectorMid(r)]), rotation: 0 }
    }
  }
}

/** Axis-aligned bounds of the node as drawn (rotation included). */
export const getRect = (node: FigNode, doc: FigDoc): Rect => rectOfBox(getBox(node, doc))

// ---------- transforms ----------

export function translateNode<T extends FigNode>(node: T, dx: number, dy: number): T {
  if (!dx && !dy) return node
  switch (node.type) {
    case 'icon':
    case 'shape':
    case 'text':
      return { ...node, x: node.x + dx, y: node.y + dy }
    case 'membrane':
      return { ...node, points: node.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) }
    case 'stroke':
      return { ...node, points: node.points.map(([x, y, p]) => [x + dx, y + dy, p] as [number, number, number]) }
    case 'connector':
      return {
        ...node,
        from: { ...node.from, x: node.from.x + dx, y: node.from.y + dy },
        to: { ...node.to, x: node.to.x + dx, y: node.to.y + dy },
      }
  }
}

function mapPoint(p: Point, from: Rect, to: Rect): Point {
  return {
    x: to.x + (from.w > 1e-6 ? ((p.x - from.x) / from.w) * to.w : to.w / 2),
    y: to.y + (from.h > 1e-6 ? ((p.y - from.y) / from.h) * to.h : to.h / 2),
  }
}

const inset = (r: Rect, p: number): Rect => ({
  x: r.x + p,
  y: r.y + p,
  w: Math.max(0, r.w - 2 * p),
  h: Math.max(0, r.h - 2 * p),
})

/** Fit a node into `newBox`, given the box it had before (`oldBox`). Connectors are left alone. */
export function resizeNode(node: FigNode, oldBox: Box, newBox: Box): FigNode {
  switch (node.type) {
    case 'icon':
    case 'shape':
      return { ...node, x: newBox.x, y: newBox.y, w: newBox.w, h: newBox.h }
    case 'text': {
      const scale = oldBox.h > 1e-6 ? newBox.h / oldBox.h : 1
      const next: TextNode = { ...node, fontSize: clamp(round(node.fontSize * scale, 1), 4, 400) }
      const m = measureText(next)
      const c = rectCenter(newBox)
      const left = c.x - m.w / 2
      next.x = node.align === 'center' ? c.x : node.align === 'right' ? left + m.w : left
      next.y = c.y - m.h / 2
      return next
    }
    case 'membrane': {
      const p = node.thickness / 2
      const a = inset(oldBox, p)
      const b = inset(newBox, p)
      return { ...node, points: node.points.map((pt) => mapPoint(pt, a, b)) }
    }
    case 'stroke': {
      const p = node.size / 2
      const a = inset(oldBox, p)
      const b = inset(newBox, p)
      return {
        ...node,
        points: node.points.map(([x, y, pr]) => {
          const q = mapPoint({ x, y }, a, b)
          return [q.x, q.y, pr] as [number, number, number]
        }),
      }
    }
    default:
      return node
  }
}

const normDeg = (d: number): number => round(((d % 360) + 360) % 360, 1)

/** Rotate a node by `delta` degrees about its own centre. */
export function rotateNode<T extends FigNode>(node: T, delta: number, doc: FigDoc): T {
  if (!delta) return node
  switch (node.type) {
    case 'icon':
    case 'shape':
    case 'text':
      return { ...node, rotation: normDeg(node.rotation + delta) }
    case 'membrane': {
      const c = rectCenter(getBox(node, doc))
      return { ...node, points: node.points.map((p) => rotate(p, delta, c)) }
    }
    case 'stroke': {
      const c = rectCenter(getBox(node, doc))
      return {
        ...node,
        points: node.points.map(([x, y, pr]) => {
          const q = rotate({ x, y }, delta, c)
          return [q.x, q.y, pr] as [number, number, number]
        }),
      }
    }
    default:
      return node
  }
}

/**
 * New box after dragging a resize handle.
 * `hx`/`hy` say which handle (-1, 0 or 1 on each axis); `pointer` is where it was dragged to.
 * The opposite side stays where it is, also for rotated boxes.
 */
export function dragHandle(box: Box, hx: number, hy: number, pointer: Point, keepAspect: boolean, minSize = 4): Box {
  const c = rectCenter(box)
  const anchorLocal = { x: (-hx * box.w) / 2, y: (-hy * box.h) / 2 }
  const anchor = add(c, rotate(anchorLocal, box.rotation))
  const v = rotate(sub(pointer, anchor), -box.rotation)
  let w = hx ? Math.max(minSize, v.x * hx) : box.w
  let h = hy ? Math.max(minSize, v.y * hy) : box.h
  if (keepAspect && box.w > 1e-6 && box.h > 1e-6) {
    const s = hx && hy ? Math.max(w / box.w, h / box.h) : hx ? w / box.w : h / box.h
    w = box.w * s
    h = box.h * s
  }
  const center = add(anchor, rotate({ x: (hx * w) / 2, y: (hy * h) / 2 }, box.rotation))
  return { x: center.x - w / 2, y: center.y - h / 2, w, h, rotation: box.rotation }
}
