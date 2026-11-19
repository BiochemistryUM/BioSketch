// Operations on a whole figure. All of them are pure: they return a new document.

import { clamp, rectCenter, rectContains, rectsIntersect, round, unionRects } from './geometry'
import { findNode, getRect, resolveConnector, scaleNode, translateNode } from './nodes'
import type { Endpoint, FigDoc, FigNode, Point, Rect, TextNode } from './types'
import { isPickable } from './types'

export const uid = (): string => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3)

export function emptyDoc(name = 'Untitled figure'): FigDoc {
  return { version: 1, name, width: 1200, height: 800, background: '#ffffff', nodes: [], customIcons: {} }
}

export const addNodes = (doc: FigDoc, nodes: FigNode[]): FigDoc => ({ ...doc, nodes: [...doc.nodes, ...nodes] })

export function updateNodes(doc: FigDoc, ids: Iterable<string>, fn: (n: FigNode) => FigNode): FigDoc {
  const set = new Set(ids)
  if (!set.size) return doc
  let changed = false
  const nodes = doc.nodes.map((n) => {
    if (!set.has(n.id)) return n
    const next = fn(n)
    if (next !== n) changed = true
    return next
  })
  return changed ? { ...doc, nodes } : doc
}

/** Delete nodes. Connectors that were attached to a deleted node keep their position but let go. */
export function removeNodes(doc: FigDoc, ids: Iterable<string>): FigDoc {
  const set = new Set(ids)
  if (!set.size) return doc
  const release = (ep: Endpoint, at: { x: number; y: number }): Endpoint =>
    ep.nodeId && set.has(ep.nodeId) ? { x: round(at.x, 1), y: round(at.y, 1) } : ep
  const nodes: FigNode[] = []
  for (const n of doc.nodes) {
    if (set.has(n.id)) continue
    if (n.type === 'connector' && ((n.from.nodeId && set.has(n.from.nodeId)) || (n.to.nodeId && set.has(n.to.nodeId)))) {
      const r = resolveConnector(n, doc)
      nodes.push({ ...n, from: release(n.from, r.from), to: release(n.to, r.to) })
    } else {
      nodes.push(n)
    }
  }
  return { ...doc, nodes }
}

/** Add the other members of any group that has a member in `ids`. Keeps drawing order. */
export function expandGroups(doc: FigDoc, ids: Iterable<string>): string[] {
  const set = new Set(ids)
  const groups = new Set<string>()
  for (const n of doc.nodes) if (set.has(n.id) && n.groupId) groups.add(n.groupId)
  // Locked and hidden members stay out: such an object is never picked up through the group it belongs to.
  return doc.nodes.filter((n) => set.has(n.id) || (isPickable(n) && n.groupId && groups.has(n.groupId))).map((n) => n.id)
}

/**
 * What can be selected one step at a time (keyboard, objects list): each loose object, and each
 * group as a whole, in drawing order. Locked and hidden objects are left out; pen strokes only when shown.
 */
export function selectionUnits(doc: FigDoc, withStrokes = true): string[][] {
  const units: string[][] = []
  const byGroup = new Map<string, string[]>()
  for (const n of doc.nodes) {
    if (!isPickable(n) || (!withStrokes && n.type === 'stroke')) continue
    const group = n.groupId ? byGroup.get(n.groupId) : undefined
    if (group) group.push(n.id)
    else {
      const unit = [n.id]
      if (n.groupId) byGroup.set(n.groupId, unit)
      units.push(unit)
    }
  }
  return units
}

/**
 * The selection one step further (`dir` 1) or back (-1) from the current one. Null when the step
 * runs off the end, so that keyboard focus can leave the page.
 */
export function stepSelection(doc: FigDoc, selection: string[], dir: 1 | -1, withStrokes = true): string[] | null {
  const units = selectionUnits(doc, withStrokes)
  if (!units.length) return null
  const chosen = new Set(selection)
  const at = units.map((u, i) => (u.some((id) => chosen.has(id)) ? i : -1)).filter((i) => i >= 0)
  const next = at.length ? (dir === 1 ? at[at.length - 1] + 1 : at[0] - 1) : dir === 1 ? 0 : units.length - 1
  return units[next] ?? null
}

export type OrderMode = 'front' | 'back' | 'forward' | 'backward'

export function reorder(doc: FigDoc, ids: Iterable<string>, mode: OrderMode): FigDoc {
  const set = new Set(ids)
  if (!set.size) return doc
  const nodes = doc.nodes.slice()
  if (mode === 'front' || mode === 'back') {
    const picked = nodes.filter((n) => set.has(n.id))
    const rest = nodes.filter((n) => !set.has(n.id))
    return { ...doc, nodes: mode === 'front' ? [...rest, ...picked] : [...picked, ...rest] }
  }
  if (mode === 'forward') {
    for (let i = nodes.length - 2; i >= 0; i--) {
      if (set.has(nodes[i].id) && !set.has(nodes[i + 1].id)) [nodes[i], nodes[i + 1]] = [nodes[i + 1], nodes[i]]
    }
  } else {
    for (let i = 1; i < nodes.length; i++) {
      if (set.has(nodes[i].id) && !set.has(nodes[i - 1].id)) [nodes[i], nodes[i - 1]] = [nodes[i - 1], nodes[i]]
    }
  }
  return { ...doc, nodes }
}

/**
 * Copy nodes with fresh ids, shifted by (dx, dy).
 * Groups stay grouped among the copies; connector ends follow the copy of their node when it was
 * copied too, stay on the original when it still exists in `doc`, and are released otherwise.
 */
export function cloneNodes(nodes: FigNode[], doc: FigDoc, dx: number, dy: number): FigNode[] {
  const idMap = new Map(nodes.map((n) => [n.id, uid()]))
  const groupMap = new Map<string, string>()
  const remap = (ep: Endpoint): Endpoint => {
    if (!ep.nodeId) return ep
    const copied = idMap.get(ep.nodeId)
    if (copied) return { ...ep, nodeId: copied }
    return findNode(doc, ep.nodeId) ? ep : { x: ep.x, y: ep.y }
  }
  return nodes.map((n) => {
    let copy = translateNode({ ...n, id: idMap.get(n.id)! }, dx, dy)
    if (n.groupId) {
      if (!groupMap.has(n.groupId)) groupMap.set(n.groupId, uid())
      copy = { ...copy, groupId: groupMap.get(n.groupId) }
    }
    if (copy.type === 'connector') copy = { ...copy, from: remap(copy.from), to: remap(copy.to) }
    return copy
  })
}

/** Write the current, resolved position into attached connector ends (used before copying). */
export function freezeEndpoints(nodes: FigNode[], doc: FigDoc): FigNode[] {
  return nodes.map((n) => {
    if (n.type !== 'connector') return n
    const r = resolveConnector(n, doc)
    return {
      ...n,
      from: { ...n.from, x: round(r.from.x, 1), y: round(r.from.y, 1) },
      to: { ...n.to, x: round(r.to.x, 1), y: round(r.to.y, 1) },
    }
  })
}

export function duplicateNodes(doc: FigDoc, ids: Iterable<string>, dx = 20, dy = 20): { doc: FigDoc; ids: string[] } {
  const set = new Set(ids)
  const copies = cloneNodes(
    doc.nodes.filter((n) => set.has(n.id)),
    doc,
    dx,
    dy,
  )
  return { doc: addNodes(doc, copies), ids: copies.map((n) => n.id) }
}

export function groupNodes(doc: FigDoc, ids: Iterable<string>): FigDoc {
  const set = new Set(ids)
  if (set.size < 2) return doc
  const groupId = uid()
  return updateNodes(doc, set, (n) => ({ ...n, groupId }))
}

export function ungroupNodes(doc: FigDoc, ids: Iterable<string>): FigDoc {
  return updateNodes(doc, ids, (n) => {
    if (!n.groupId) return n
    const { groupId: _drop, ...rest } = n
    return rest as FigNode
  })
}

export function selectionRect(doc: FigDoc, ids: Iterable<string>): Rect | null {
  const set = new Set(ids)
  const rects = doc.nodes.filter((n) => set.has(n.id)).map((n) => getRect(n, doc))
  return rects.length ? unionRects(rects) : null
}

/** The area taken up by everything that would be exported (hidden objects and guides do not count). */
export const contentRect = (doc: FigDoc): Rect | null =>
  selectionRect(
    doc,
    doc.nodes.filter((n) => !n.hidden && !n.guide).map((n) => n.id),
  )

/** Selected nodes split into units that move together: each group is one unit. */
function units(doc: FigDoc, ids: Iterable<string>): { ids: string[]; rect: Rect }[] {
  const set = new Set(ids)
  const byKey = new Map<string, FigNode[]>()
  for (const n of doc.nodes) {
    if (!set.has(n.id)) continue
    // An arrow attached to an icon goes where the icon goes; it is not something to align by itself.
    if (n.type === 'connector' && (n.from.nodeId || n.to.nodeId)) continue
    const key = n.groupId ?? n.id
    byKey.set(key, [...(byKey.get(key) ?? []), n])
  }
  return [...byKey.values()].map((members) => ({
    ids: members.map((m) => m.id),
    rect: unionRects(members.map((m) => getRect(m, doc))),
  }))
}

export type AlignMode = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom'

export function alignNodes(doc: FigDoc, ids: Iterable<string>, mode: AlignMode): FigDoc {
  const us = units(doc, ids)
  if (us.length < 2) return doc
  const all = unionRects(us.map((u) => u.rect))
  let next = doc
  for (const u of us) {
    let dx = 0
    let dy = 0
    if (mode === 'left') dx = all.x - u.rect.x
    else if (mode === 'right') dx = all.x + all.w - (u.rect.x + u.rect.w)
    else if (mode === 'hcenter') dx = all.x + all.w / 2 - (u.rect.x + u.rect.w / 2)
    else if (mode === 'top') dy = all.y - u.rect.y
    else if (mode === 'bottom') dy = all.y + all.h - (u.rect.y + u.rect.h)
    else dy = all.y + all.h / 2 - (u.rect.y + u.rect.h / 2)
    next = updateNodes(next, u.ids, (n) => translateNode(n, dx, dy))
  }
  return next
}

/** Space units evenly between the first and the last one along an axis. */
export function distributeNodes(doc: FigDoc, ids: Iterable<string>, axis: 'h' | 'v'): FigDoc {
  const us = units(doc, ids)
  if (us.length < 3) return doc
  const pos = (r: Rect) => (axis === 'h' ? r.x : r.y)
  const size = (r: Rect) => (axis === 'h' ? r.w : r.h)
  us.sort((a, b) => pos(a.rect) + size(a.rect) / 2 - (pos(b.rect) + size(b.rect) / 2))
  const first = us[0].rect
  const last = us[us.length - 1].rect
  const total = us.reduce((s, u) => s + size(u.rect), 0)
  const gap = (pos(last) + size(last) - pos(first) - total) / (us.length - 1)
  let cursor = pos(first)
  let next = doc
  for (const u of us) {
    const d = cursor - pos(u.rect)
    next = updateNodes(next, u.ids, (n) => translateNode(n, axis === 'h' ? d : 0, axis === 'v' ? d : 0))
    cursor += size(u.rect) + gap
  }
  return next
}

/**
 * Nodes touched by a selection rectangle. A node that completely surrounds the rectangle
 * (a cell outline or frame the user is working inside) is not selected.
 */
export function nodesInRect(doc: FigDoc, rect: Rect): string[] {
  return doc.nodes
    .filter((n) => {
      const r = getRect(n, doc)
      return rectsIntersect(r, rect) && !(rectContains(r, rect) && (r.w > rect.w || r.h > rect.h))
    })
    .map((n) => n.id)
}

export function usedIconIds(doc: FigDoc): string[] {
  return [...new Set(doc.nodes.flatMap((n) => (n.type === 'icon' ? [n.iconId] : [])))]
}

/** The next unused panel letter: "A" for a figure without any, otherwise the letter after the highest one. */
export function nextPanelLetter(doc: FigDoc): string {
  let highest = 64
  for (const n of doc.nodes) {
    if (n.type === 'text' && n.bold && /^[A-Z]$/.test(n.text.trim())) highest = Math.max(highest, n.text.trim().charCodeAt(0))
  }
  return String.fromCharCode(Math.min(90, highest + 1))
}

/**
 * The separate label that belongs to a shape or icon: the only text in a group of exactly the two.
 * Figures made before shapes could hold text label their boxes this way.
 */
export function labelPartner(doc: FigDoc, node: FigNode): TextNode | undefined {
  if (!node.groupId) return undefined
  const members = doc.nodes.filter((n) => n.groupId === node.groupId)
  if (members.length !== 2) return undefined
  const other = members.find((n) => n.id !== node.id)
  return other?.type === 'text' ? other : undefined
}

// ---------- resizing as one picture ----------

/** The smallest and largest side a page can have (the limits of a figure file). */
export const PAGE_MIN = 100
export const PAGE_MAX = 20000

/** The same object with its outline or its line `s` times as thick. Dashes and arrow heads follow the thickness. */
function scaleLines<T extends FigNode>(node: T, s: number): T {
  if (node.type === 'shape') return { ...node, strokeWidth: clamp(round(node.strokeWidth * s, 2), 0, 100) }
  if (node.type === 'connector') return { ...node, strokeWidth: clamp(round(node.strokeWidth * s, 2), 0.25, 40) }
  return node
}

/**
 * Resize objects as one picture, about `origin`: places, sizes, text and the thickness of outlines
 * and arrows all change by the factor `s`, so the picture looks the same, only larger or smaller.
 * (Dragging a corner of a selection resizes too, but keeps lines as thick as they were.)
 */
export function scaleAsPicture(doc: FigDoc, ids: Iterable<string>, s: number, origin: Point): FigDoc {
  if (!(s > 0) || !Number.isFinite(s) || s === 1) return doc
  return updateNodes(doc, ids, (n) => scaleLines(scaleNode(n, s, origin, doc), s))
}

/**
 * Put what another figure holds into this one, as one picture with its middle at `at`: every
 * object copied under an id of its own (groups and attached arrows stay together), made smaller
 * with text and lines in step when it is larger than `fit`, never enlarged. Icons the other figure
 * holds come along. Returns the figure, the ids of what was added and the factor it was resized by.
 */
export function addFigure(doc: FigDoc, added: FigDoc, at: Point, fit?: { w: number; h: number }): { doc: FigDoc; ids: string[]; scale: number } {
  const rect = selectionRect(added, added.nodes.map((n) => n.id))
  if (!rect || !added.nodes.length) return { doc, ids: [], scale: 1 }
  const middle = rectCenter(rect)
  const scale = fit && rect.w > 0 && rect.h > 0 ? Math.min(1, fit.w / rect.w, fit.h / rect.h) : 1
  const sized = scaleAsPicture(added, added.nodes.map((n) => n.id), scale, middle)
  const copies = cloneNodes(sized.nodes, sized, round(at.x - middle.x, 1), round(at.y - middle.y, 1))
  return { doc: { ...doc, nodes: [...doc.nodes, ...copies], customIcons: { ...added.customIcons, ...doc.customIcons } }, ids: copies.map((n) => n.id), scale }
}

/** The factor nearest to `s` that keeps the page of `doc` within the sizes a page can have. */
export function figureScaleWithin(doc: FigDoc, s: number): number {
  if (!(s > 0) || !Number.isFinite(s)) return 1
  const lo = Math.min(1, PAGE_MIN / Math.min(doc.width, doc.height))
  const hi = Math.max(1, PAGE_MAX / Math.max(doc.width, doc.height))
  return clamp(s, lo, hi)
}

/**
 * Resize the whole figure: every object (hidden, locked and guides too) and the page, from the
 * page's top left corner. A factor that would make the page too small or too large is cut back.
 */
export function scaleFigure(doc: FigDoc, s: number): FigDoc {
  const factor = figureScaleWithin(doc, s)
  if (factor === 1) return doc
  const scaled = scaleAsPicture(doc, doc.nodes.map((n) => n.id), factor, { x: 0, y: 0 })
  return { ...scaled, width: Math.round(doc.width * factor), height: Math.round(doc.height * factor) }
}
