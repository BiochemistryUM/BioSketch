// Editor commands. Menus, buttons and keyboard shortcuts all call these.

import { getIcon } from './icons/library'
import {
  alignNodes,
  cloneNodes,
  distributeNodes,
  duplicateNodes,
  emptyDoc,
  expandGroups,
  freezeEndpoints,
  groupNodes,
  removeNodes,
  reorder,
  ungroupNodes,
  updateNodes,
  uid,
  type AlignMode,
  type OrderMode,
} from './model/doc'
import { clamp } from './model/geometry'
import { translateNode } from './model/nodes'
import type { FigDoc, FigNode, IconDef, IconNode, Point, TextNode } from './model/types'
import { toast, useEditor, type Tool, type View } from './store'

const S = () => useEditor.getState()

export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 8

export function setTool(tool: Tool): void {
  const patch: Partial<ReturnType<typeof S>> = { tool, editingTextId: null }
  if (tool !== 'select') patch.selection = []
  S().set(patch)
}

export function deleteSelection(): void {
  const { selection, commit } = S()
  if (!selection.length) return
  commit((doc) => removeNodes(doc, selection), { select: [] })
}

export function duplicateSelection(): void {
  const s = S()
  if (!s.selection.length) return
  const result = duplicateNodes(s.doc, s.selection)
  s.commit(() => result.doc, { select: result.ids })
}

export function copySelection(): void {
  const s = S()
  if (!s.selection.length) return
  const set = new Set(s.selection)
  const nodes = freezeEndpoints(
    s.doc.nodes.filter((n) => set.has(n.id)),
    s.doc,
  )
  const icons: Record<string, IconDef> = {}
  for (const n of nodes) {
    if (n.type === 'icon' && s.doc.customIcons[n.iconId]) icons[n.iconId] = s.doc.customIcons[n.iconId]
  }
  s.set({ clipboard: nodes, clipboardIcons: icons })
}

export function pasteClipboard(): void {
  const s = S()
  if (!s.clipboard.length) return
  const copies = cloneNodes(s.clipboard, s.doc, 20, 20)
  s.commit(
    (doc) => ({ ...doc, nodes: [...doc.nodes, ...copies], customIcons: { ...s.clipboardIcons, ...doc.customIcons } }),
    { select: copies.map((n) => n.id) },
  )
  // Shift the clipboard so pasting again does not land exactly on top.
  s.set({ clipboard: s.clipboard.map((n) => translateNode(n, 20, 20)) })
}

export function selectAll(): void {
  const s = S()
  s.set({ tool: 'select', selection: s.doc.nodes.filter((n) => s.showSketch || n.type !== 'stroke').map((n) => n.id) })
}

export function groupSelection(): void {
  const { selection, commit } = S()
  commit((doc) => groupNodes(doc, selection))
}

export function ungroupSelection(): void {
  const { selection, commit } = S()
  commit((doc) => ungroupNodes(doc, selection))
}

export function orderSelection(mode: OrderMode): void {
  const { selection, commit } = S()
  commit((doc) => reorder(doc, selection, mode))
}

export function alignSelection(mode: AlignMode): void {
  const { selection, commit } = S()
  commit((doc) => alignNodes(doc, selection, mode))
}

export function distributeSelection(axis: 'h' | 'v'): void {
  const { selection, commit } = S()
  commit((doc) => distributeNodes(doc, selection, axis))
}

/** Rapid edits merge into one undo step only while they are the same kind of edit on the same objects. */
const mergeKey = (kind: string, selection: string[]): string => `${kind}:${selection.join(',')}`

export function nudge(dx: number, dy: number): void {
  const { selection, commit } = S()
  commit((doc) => updateNodes(doc, selection, (n) => translateNode(n, dx, dy)), { merge: mergeKey('nudge', selection) })
}

/** Apply a change to every selected node. `merge` groups rapid changes (e.g. dragging a colour picker) into one undo step. */
export function patchSelection(fn: (n: FigNode) => FigNode, merge?: string): void {
  const { selection, commit } = S()
  commit((doc) => updateNodes(doc, selection, fn), { merge: merge && mergeKey(merge, selection) })
}

export function patchDoc(patch: Partial<FigDoc>, merge?: string): void {
  S().commit((doc) => ({ ...doc, ...patch }), { merge })
}

/** The figure coordinate currently shown in the middle of the canvas. */
export function viewCenter(): Point {
  const { view, canvasSize } = S()
  return { x: (canvasSize.w / 2 - view.x) / view.zoom, y: (canvasSize.h / 2 - view.y) / view.zoom }
}

export function addIcon(iconId: string, at?: Point): string | null {
  const s = S()
  const def = getIcon(s.doc, iconId)
  if (!def) return null
  const [w, h] = def.viewBox
  // Imported icons can have any coordinate size; bring them to a sensible size on the page.
  const scale = Math.max(w, h) > 240 || Math.max(w, h) < 30 ? 110 / Math.max(w, h) : 1
  const stagger = at ? 0 : (s.doc.nodes.length % 6) * 14
  const c = at ?? viewCenter()
  const node: IconNode = {
    id: uid(),
    type: 'icon',
    iconId,
    x: Math.round(c.x - (w * scale) / 2 + stagger),
    y: Math.round(c.y - (h * scale) / 2 + stagger),
    w: w * scale,
    h: h * scale,
    rotation: 0,
  }
  s.commit((doc) => ({ ...doc, nodes: [...doc.nodes, node] }), { select: [node.id] })
  s.set({ tool: 'select' })
  return node.id
}

export function addText(at: Point, text = 'Label'): string {
  const s = S()
  const node: TextNode = {
    id: uid(),
    type: 'text',
    x: Math.round(at.x),
    y: Math.round(at.y - 11),
    text,
    fontSize: 18,
    fill: '#1f2933',
    align: 'center',
    rotation: 0,
  }
  s.commit((doc) => ({ ...doc, nodes: [...doc.nodes, node] }), { select: [node.id] })
  s.set({ tool: 'select', editingTextId: node.id })
  return node.id
}

export function addCustomIcon(def: IconDef): void {
  S().commit((doc) => ({ ...doc, customIcons: { ...doc.customIcons, [def.id]: def } }))
}

export function removeCustomIcon(id: string): void {
  const s = S()
  const users = s.doc.nodes.filter((n) => n.type === 'icon' && n.iconId === id).map((n) => n.id)
  s.commit(
    (doc) => {
      const { [id]: _drop, ...rest } = doc.customIcons
      return { ...removeNodes(doc, users), customIcons: rest }
    },
    { select: [] },
  )
}

// ---------- view ----------

export function setView(view: View): void {
  S().set({ view: { ...view, zoom: clamp(view.zoom, MIN_ZOOM, MAX_ZOOM) } })
}

/** Zoom by `factor`, keeping the given screen point (default: canvas centre) fixed. */
export function zoomBy(factor: number, at?: Point): void {
  const { view, canvasSize } = S()
  const p = at ?? { x: canvasSize.w / 2, y: canvasSize.h / 2 }
  const zoom = clamp(view.zoom * factor, MIN_ZOOM, MAX_ZOOM)
  const k = zoom / view.zoom
  S().set({ view: { zoom, x: p.x - (p.x - view.x) * k, y: p.y - (p.y - view.y) * k } })
}

export function fitView(): void {
  const { doc, canvasSize } = S()
  const pad = Math.min(48, canvasSize.w * 0.06)
  const zoom = clamp(Math.min((canvasSize.w - 2 * pad) / doc.width, (canvasSize.h - 2 * pad) / doc.height), MIN_ZOOM, 2)
  S().set({ view: { zoom, x: (canvasSize.w - doc.width * zoom) / 2, y: (canvasSize.h - doc.height * zoom) / 2 } })
}

export function newDocument(): void {
  S().loadDoc(emptyDoc())
  toast('Started a new figure')
}

export function expandSelection(ids: string[]): string[] {
  return expandGroups(S().doc, ids)
}
