// Revising a figure with AI: the figure on the page is described to the model in the same "scene"
// format it answers in, and its answer is applied as changes, so colours, rotation and anything
// else the scientist set by hand survive.

import { removeNodes, uid, updateNodes } from '../model/doc'
import { rectCenter } from '../model/geometry'
import { getRect, scaleNode, translateNode } from '../model/nodes'
import type { ConnectorNode, FigDoc, FigNode, TextNode } from '../model/types'
import { isPickable } from '../model/types'
import { BUILTIN_ICONS } from '../icons/library'
import { sceneToNodes, type Scene, type SceneElement } from './scene'

interface Tracked {
  element: SceneElement
  /** The node arrows attach to (the icon, box, text or membrane itself). */
  anchorId: string
  /** The label that belongs to it, when the two are grouped. */
  labelId?: string
}

export interface Snapshot {
  scene: Scene
  elements: Map<string, Tracked>
  /** "from->to" (scene ids) -> the arrow's node id. */
  connectors: Map<string, string>
}

const BUILTIN = new Set(BUILTIN_ICONS.map((i) => i.id))
const r1 = (v: number): number => Math.round(v * 10) / 10

/**
 * Describe the page as a scene. Left out (and therefore left untouched by a revision): pictures,
 * sketch strokes, imported icons and pieces of split icons, locked or hidden objects, and arrows with a free end.
 */
export function docToScene(doc: FigDoc): Snapshot {
  const ux = 1000 / doc.width
  const uy = 1000 / doc.height
  const elements = new Map<string, Tracked>()
  const sceneIdOf = new Map<string, string>()

  // A group of exactly one icon or shape plus one text is "a thing with its label".
  const groups = new Map<string, FigNode[]>()
  for (const n of doc.nodes) if (n.groupId) groups.set(n.groupId, [...(groups.get(n.groupId) ?? []), n])
  const labelOf = new Map<string, TextNode>()
  const isLabel = new Set<string>()
  for (const members of groups.values()) {
    if (members.length !== 2) continue
    const text = members.find((m): m is TextNode => m.type === 'text')
    const thing = members.find((m) => m.type === 'icon' || m.type === 'shape')
    if (text && thing && isPickable(text) && isPickable(thing)) {
      labelOf.set(thing.id, text)
      isLabel.add(text.id)
    }
  }

  let count = 0
  for (const n of doc.nodes) {
    if (!isPickable(n) || n.guide || isLabel.has(n.id)) continue
    let kind: SceneElement['kind']
    let icon = ''
    // A shape's label is the text grouped with it, or else the words written inside it.
    let label = labelOf.get(n.id)?.text ?? (n.type === 'shape' ? (n.label?.text ?? '') : '')
    if (n.type === 'icon') {
      if (!BUILTIN.has(n.iconId)) continue
      kind = 'icon'
      icon = n.iconId
    } else if (n.type === 'shape') {
      // An empty rectangle is a frame (a zoomed-in view or a marked region), not a label holder.
      kind = n.shape === 'ellipse' ? 'ellipse' : n.fill === 'none' ? 'frame' : 'box'
    } else if (n.type === 'text') {
      kind = 'text'
      label = n.text
    } else if (n.type === 'membrane') {
      kind = n.closed ? 'cell' : 'membrane'
    } else {
      continue
    }
    const rect = getRect(n, doc)
    const c = rectCenter(rect)
    const id = `e${++count}`
    const element: SceneElement = { id, kind, icon, label: label.slice(0, 120), x: r1(c.x * ux), y: r1(c.y * uy), w: r1(rect.w * ux), h: r1(rect.h * uy) }
    elements.set(id, { element, anchorId: n.id, ...(labelOf.get(n.id) ? { labelId: labelOf.get(n.id)!.id } : {}) })
    sceneIdOf.set(n.id, id)
  }

  const connectors = new Map<string, string>()
  const sceneConnectors: Scene['connectors'] = []
  for (const n of doc.nodes) {
    if (n.type !== 'connector' || !isPickable(n)) continue
    const from = n.from.nodeId && sceneIdOf.get(n.from.nodeId)
    const to = n.to.nodeId && sceneIdOf.get(n.to.nodeId)
    if (!from || !to || connectors.has(`${from}->${to}`)) continue
    connectors.set(`${from}->${to}`, n.id)
    sceneConnectors.push({ from, to, kind: n.kind, dashed: !!n.dashed, label: n.label ?? '' })
  }

  return { scene: { title: '', elements: [...elements.values()].map((t) => t.element), connectors: sceneConnectors, notes: [] }, elements, connectors }
}

/** The request text that asks the model to change the figure. */
export function reviseTaskText(current: Scene, instruction: string): string {
  return (
    `Here is the figure as it is now, in the same format you answer in:\n\n${JSON.stringify(current)}\n\n` +
    `Change it as follows: ${instruction.trim()}\n\n` +
    'Return the complete revised figure. Keep the "id" of every element that stays, and leave everything you were not asked to change exactly as it is. ' +
    'To remove an element, leave it out. Give new elements new ids. Leave "title" as "". In "notes", say only what the scientist should know about this change.'
  )
}

/** Apply the model's revised scene to the page as moves, resizes, relabels, deletions and additions. */
export function applyRevision(doc: FigDoc, before: Snapshot, after: Scene): FigDoc {
  const sx = doc.width / 1000
  const sy = doc.height / 1000
  const kept = new Map(after.elements.map((e) => [e.id, e]))
  let next = doc

  // Deleted elements (and their labels) go first; arrows attached to them are released by removeNodes.
  const gone: string[] = []
  for (const [id, t] of before.elements) if (!kept.has(id)) gone.push(t.anchorId, ...(t.labelId ? [t.labelId] : []))
  for (const [key, nodeId] of before.connectors) {
    if (!after.connectors.some((c) => `${c.from}->${c.to}` === key)) gone.push(nodeId)
  }
  next = removeNodes(next, gone)

  const known = new Map<string, string>()
  const newLabels: FigNode[] = []
  for (const [id, t] of before.elements) {
    const now = kept.get(id)
    if (!now) continue
    known.set(id, t.anchorId)
    const was = t.element
    const ids = [t.anchorId, ...(t.labelId ? [t.labelId] : [])]

    const dx = (now.x - was.x) * sx
    const dy = (now.y - was.y) * sy
    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) next = updateNodes(next, ids, (n) => translateNode(n, dx, dy))

    const factor = (now.w / was.w + now.h / was.h) / 2
    if (Number.isFinite(factor) && Math.abs(factor - 1) > 0.1) {
      const anchor = next.nodes.find((n) => n.id === t.anchorId)
      if (anchor) {
        const origin = rectCenter(getRect(anchor, next))
        const snapshot = next
        next = updateNodes(next, ids, (n) => scaleNode(n, factor, origin, snapshot))
      }
    }

    if (was.kind === 'icon' && now.kind === 'icon' && now.icon !== was.icon && BUILTIN.has(now.icon)) {
      // Same element, different picture: keep its place and height, take the new icon's proportions.
      const [vw, vh] = BUILTIN_ICONS.find((i) => i.id === now.icon)!.viewBox
      next = updateNodes(next, [t.anchorId], (n) => {
        if (n.type !== 'icon') return n
        const w = (n.h * vw) / vh
        const { colors: _old, ...rest } = n
        return { ...rest, iconId: now.icon, x: n.x + n.w / 2 - w / 2, w }
      })
    }

    const anchorNow = next.nodes.find((n) => n.id === t.anchorId)
    if (now.label !== was.label && !t.labelId && anchorNow?.type === 'shape' && anchorNow.label) {
      // The words are written inside the shape: change them there (or take them away).
      next = updateNodes(next, [t.anchorId], (n) => {
        if (n.type !== 'shape' || !n.label) return n
        const { label, ...rest } = n
        return now.label ? { ...rest, label: { ...label, text: now.label } } : rest
      })
    } else if (now.label !== was.label) {
      const textId = was.kind === 'text' ? t.anchorId : t.labelId
      if (textId && now.label) {
        next = updateNodes(next, [textId], (n) => (n.type === 'text' ? { ...n, text: now.label } : n))
      } else if (textId && was.kind !== 'text') {
        next = removeNodes(next, [textId])
      } else if (!textId && now.label) {
        // The element had no label before: add one underneath and group the two.
        const anchor = next.nodes.find((n) => n.id === t.anchorId)
        if (anchor?.type === 'shape' && was.kind !== 'frame') {
          // A box or oval takes its words inside.
          next = updateNodes(next, [anchor.id], (n) => (n.type === 'shape' ? { ...n, label: { text: now.label, fontSize: 16, fill: '#2b2f36', bold: true } } : n))
        } else if (anchor && (anchor.type === 'icon' || anchor.type === 'shape')) {
          const rect = getRect(anchor, next)
          const groupId = anchor.groupId ?? uid()
          next = updateNodes(next, [anchor.id], (n) => ({ ...n, groupId }))
          newLabels.push({ id: uid(), type: 'text', groupId, x: Math.round(rect.x + rect.w / 2), y: Math.round(rect.y + rect.h + 4), text: now.label, fontSize: 16, fill: '#2b2f36', align: 'center', rotation: 0 })
        }
      }
    }
  }

  // Arrows that stay may have changed kind, dash or label.
  for (const c of after.connectors) {
    const nodeId = before.connectors.get(`${c.from}->${c.to}`)
    if (!nodeId) continue
    next = updateNodes(next, [nodeId], (n) => {
      if (n.type !== 'connector') return n
      const { dashed: _d, label: _l, ...rest } = n
      const changed: ConnectorNode = { ...rest, kind: c.kind, ...(c.dashed ? { dashed: true } : {}), ...(c.label ? { label: c.label } : {}) }
      return changed.kind === n.kind && !!changed.dashed === !!n.dashed && (changed.label ?? '') === (n.label ?? '') ? n : changed
    })
  }

  // New elements, and new arrows (which may join existing and new elements).
  const additions = sceneToNodes(
    {
      title: '',
      elements: after.elements,
      connectors: after.connectors.filter((c) => !before.connectors.has(`${c.from}->${c.to}`)),
      notes: [],
    },
    doc,
    known,
  )
  return additions.length || newLabels.length ? { ...next, nodes: [...next.nodes, ...newLabels, ...additions] } : next
}
