// Reshaping an icon point by point: the outlines of the icon are path data, and single points of
// those paths can be dragged. The icon is first copied into the figure (like a piece of a split
// icon), so the library icon and other copies on the page stay as they were.

import { uid } from '../model/doc'
import type { FigDoc, IconDef, IconNode } from '../model/types'
import { toast, useEditor } from '../store'
import { getIcon } from './library'
import { anchorsOf, curvesOnly, formatPath, moveAnchor, parsePath } from './path'
import { measure, placePart } from './split'
import { parseRoot, serializeChildren } from './svg'

const SVG_NS = 'http://www.w3.org/2000/svg'
/** More points than this cannot be picked apart with a finger or a pen. */
export const MAX_POINTS = 400
// Definitions are not drawn where they stand; their paths are not outlines of the icon.
const NOT_DRAWN = 'defs, clipPath, mask, marker, pattern, symbol'

/** The paths of an icon that are drawn, in document order. The same order holds for the icon on the page. */
export function drawnPaths(root: Element): Element[] {
  return Array.from(root.querySelectorAll('path')).filter((p) => !p.closest(NOT_DRAWN))
}

const sameShape = (p: Element): string => `${p.getAttribute('d') ?? ''}|${p.getAttribute('transform') ?? ''}`

/**
 * The drawn paths whose points are shown for reshaping, with their place among `drawnPaths`.
 * A shape drawn in flat layers is several copies of one path; only the first copy shows points,
 * and moving one of them moves every copy (see `movePoint`).
 */
export function reshapablePaths(root: Element): { path: Element; index: number }[] {
  const seen = new Set<string>()
  return drawnPaths(root).flatMap((path, index) => {
    const key = sameShape(path)
    if (seen.has(key)) return []
    seen.add(key)
    return [{ path, index }]
  })
}

const wrap = (body: string): Element | null => parseRoot(`<svg xmlns="${SVG_NS}">${body}</svg>`)
const num = (el: Element, name: string): number => parseFloat(el.getAttribute(name) ?? '') || 0

/** Path data that draws the same thing as a rectangle, circle, ellipse, line or polygon element. */
function shapeToPath(el: Element): string | null {
  const K = 0.5523 // how far a curve handle sits from its point for a quarter of a circle
  switch (el.tagName.toLowerCase()) {
    case 'rect': {
      const x = num(el, 'x')
      const y = num(el, 'y')
      const w = num(el, 'width')
      const h = num(el, 'height')
      if (!(w > 0) || !(h > 0)) return null
      const rx = Math.min(num(el, 'rx') || num(el, 'ry'), w / 2)
      const ry = Math.min(num(el, 'ry') || num(el, 'rx'), h / 2)
      if (!(rx > 0) || !(ry > 0)) return `M${x} ${y}L${x + w} ${y}L${x + w} ${y + h}L${x} ${y + h}Z`
      const arc = `A${rx} ${ry} 0 0 1 `
      return `M${x + rx} ${y}L${x + w - rx} ${y}${arc}${x + w} ${y + ry}L${x + w} ${y + h - ry}${arc}${x + w - rx} ${y + h}L${x + rx} ${y + h}${arc}${x} ${y + h - ry}L${x} ${y + ry}${arc}${x + rx} ${y}Z`
    }
    case 'circle':
    case 'ellipse': {
      const cx = num(el, 'cx')
      const cy = num(el, 'cy')
      const rx = el.tagName.toLowerCase() === 'circle' ? num(el, 'r') : num(el, 'rx')
      const ry = el.tagName.toLowerCase() === 'circle' ? num(el, 'r') : num(el, 'ry')
      if (!(rx > 0) || !(ry > 0)) return null
      const kx = rx * K
      const ky = ry * K
      return (
        `M${cx + rx} ${cy}C${cx + rx} ${cy + ky} ${cx + kx} ${cy + ry} ${cx} ${cy + ry}` +
        `C${cx - kx} ${cy + ry} ${cx - rx} ${cy + ky} ${cx - rx} ${cy}` +
        `C${cx - rx} ${cy - ky} ${cx - kx} ${cy - ry} ${cx} ${cy - ry}` +
        `C${cx + kx} ${cy - ry} ${cx + rx} ${cy - ky} ${cx + rx} ${cy}Z`
      )
    }
    case 'line':
      return `M${num(el, 'x1')} ${num(el, 'y1')}L${num(el, 'x2')} ${num(el, 'y2')}`
    case 'polyline':
    case 'polygon': {
      const n = (el.getAttribute('points') ?? '').split(/[\s,]+/).filter(Boolean).map(Number)
      if (n.length < 4 || n.some((v) => !Number.isFinite(v))) return null
      let d = ''
      for (let i = 0; i + 1 < n.length; i += 2) d += `${i ? 'L' : 'M'}${n[i]} ${n[i + 1]}`
      return el.tagName.toLowerCase() === 'polygon' ? `${d}Z` : d
    }
    default:
      return null
  }
}

const GEOMETRY = new Set(['x', 'y', 'width', 'height', 'rx', 'ry', 'cx', 'cy', 'r', 'x1', 'y1', 'x2', 'y2', 'points'])

/**
 * Make every outline of an icon ready for reshaping: rectangles, circles, ellipses, lines and
 * polygons become paths, and arcs become curves (see `curvesOnly`).
 */
export function shapesToPaths(body: string): string {
  const root = wrap(body)
  if (!root) return body
  // Shapes inside clip paths are converted too: the layers of a flat icon are clipped by copies of
  // the shape itself, and those copies have to follow when a point is moved.
  for (const el of Array.from(root.querySelectorAll('rect, circle, ellipse, line, polyline, polygon'))) {
    const d = shapeToPath(el)
    if (!d) continue
    const path = el.ownerDocument.createElementNS(SVG_NS, 'path')
    path.setAttribute('d', d)
    for (const attr of Array.from(el.attributes)) if (!GEOMETRY.has(attr.name)) path.setAttribute(attr.name, attr.value)
    el.replaceWith(path)
  }
  for (const path of Array.from(root.querySelectorAll('path'))) path.setAttribute('d', formatPath(curvesOnly(parsePath(path.getAttribute('d') ?? ''))))
  return serializeChildren(root)
}

/** How many points of the icon can be moved. */
export function countPoints(body: string): number {
  const root = wrap(body)
  if (!root) return 0
  return reshapablePaths(root).reduce((n, { path }) => n + anchorsOf(parsePath(path.getAttribute('d') ?? '')).length, 0)
}

/** Move one point of one path of an icon. `path` counts the drawn paths, `index` is the segment ending at the point. */
export function movePoint(body: string, path: number, index: number, dx: number, dy: number): string {
  const root = wrap(body)
  const el = root ? drawnPaths(root)[path] : undefined
  if (!root || !el) return body
  const shape = sameShape(el)
  const moved = formatPath(moveAnchor(parsePath(el.getAttribute('d') ?? ''), index, dx, dy))
  // Every copy of the shape moves with it: the layers of a flat icon and the clip paths that cut them.
  for (const copy of Array.from(root.querySelectorAll('path'))) if (sameShape(copy) === shape) copy.setAttribute('d', moved)
  return serializeChildren(root)
}

/** The same change on a figure: the icon `iconId` stored with it gets the moved point. */
export function movePointInDoc(doc: FigDoc, iconId: string, path: number, index: number, dx: number, dy: number): FigDoc {
  const icon = doc.customIcons[iconId]
  if (!icon) return doc
  return { ...doc, customIcons: { ...doc.customIcons, [iconId]: { ...icon, body: movePoint(icon.body, path, index, dx, dy) } } }
}

/** Remove pieces (split or reshaped icons) that nothing on the page uses any more. */
export function dropUnusedParts(doc: FigDoc): FigDoc {
  const used = new Set(doc.nodes.flatMap((n) => (n.type === 'icon' ? [n.iconId] : [])))
  const kept = Object.entries(doc.customIcons).filter(([id, icon]) => icon.category !== 'Part' || used.has(id))
  return kept.length === Object.keys(doc.customIcons).length ? doc : { ...doc, customIcons: Object.fromEntries(kept) }
}

/** Start reshaping an icon: give it a copy of its own with every outline as a path, and show its points. */
export function startReshape(nodeId: string): void {
  const s = useEditor.getState()
  const node = s.doc.nodes.find((n) => n.id === nodeId)
  const icon = node?.type === 'icon' ? getIcon(s.doc, node.iconId) : undefined
  if (!node || node.type !== 'icon' || !icon) return
  const body = shapesToPaths(icon.body)
  const points = countPoints(body)
  if (!points) {
    toast('This icon has no outline that can be reshaped.')
    return
  }
  if (points > MAX_POINTS) {
    toast(`This icon has ${points} points, too many to move by hand. Split it into parts and reshape one piece.`)
    return
  }
  const id = `part-${uid()}`
  const copy: IconDef = { ...icon, id, category: 'Part', tags: [], body }
  s.commit((doc) => dropUnusedParts({ ...doc, customIcons: { ...doc.customIcons, [id]: copy }, nodes: doc.nodes.map((n) => (n.id === nodeId ? { ...node, iconId: id } : n)) }), { select: [nodeId] })
  s.set({ tool: 'select', reshape: { nodeId, iconId: id } })
}

/** Stop reshaping. The icon's box is fitted to its new outline, so the selection frame matches what is drawn. */
export function finishReshape(): void {
  const s = useEditor.getState()
  const target = s.reshape
  if (!target) return
  s.set({ reshape: null })
  const node = s.doc.nodes.find((n) => n.id === target.nodeId)
  const icon = s.doc.customIcons[target.iconId]
  // After Undo the icon may be back to what it was before; then there is nothing to fit.
  if (!node || node.type !== 'icon' || node.iconId !== target.iconId || !icon) return
  const [b] = measure([icon.body], icon.viewBox)
  if (!b) return
  const same = Math.abs(b.x) < 0.5 && Math.abs(b.y) < 0.5 && Math.abs(b.w - icon.viewBox[0]) < 0.5 && Math.abs(b.h - icon.viewBox[1]) < 0.5
  if (same) return
  const fitted: IconDef = { ...icon, viewBox: [b.w, b.h], body: `<g transform="translate(${-b.x} ${-b.y})">${icon.body}</g>` }
  const placed: IconNode = { ...node, ...placePart(node, icon.viewBox, b) }
  s.commit((doc) => ({ ...doc, customIcons: { ...doc.customIcons, [icon.id]: fitted }, nodes: doc.nodes.map((n) => (n.id === node.id ? placed : n)) }))
}
