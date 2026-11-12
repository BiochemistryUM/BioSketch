// The "scene": a small, model-friendly description of a figure. The AI never produces drawings or
// markup. It only names library icons, positions and arrows; this file turns that into real nodes.

import { BUILTIN_ICONS, getIcon } from '../icons/library'
import { INK, outlinePoints, textLabel } from '../model/build'
import { uid } from '../model/doc'
import { clamp } from '../model/geometry'
import type { ConnectorKind, ConnectorNode, FigNode, IconNode, MembraneNode, Point, ShapeNode } from '../model/types'

export type ElementKind = 'icon' | 'box' | 'ellipse' | 'text' | 'membrane' | 'cell'

export interface SceneElement {
  id: string
  kind: ElementKind
  /** Icon id from the catalogue; '' when not an icon. */
  icon: string
  label: string
  /** Centre and size, in a 0-1000 coordinate system covering the page. */
  x: number
  y: number
  w: number
  h: number
}

export interface SceneConnector {
  from: string
  to: string
  kind: ConnectorKind
  dashed: boolean
  label: string
}

export interface Scene {
  title: string
  elements: SceneElement[]
  connectors: SceneConnector[]
}

const ELEMENT_KINDS: ElementKind[] = ['icon', 'box', 'ellipse', 'text', 'membrane', 'cell']
const CONNECTOR_KINDS: ConnectorKind[] = ['arrow', 'inhibit', 'line', 'double']

/** JSON schema sent to the model so its answer is guaranteed to have this shape. */
export const SCENE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'elements', 'connectors'],
  properties: {
    title: { type: 'string', description: 'Short figure title, or "" if none.' },
    elements: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'kind', 'icon', 'label', 'x', 'y', 'w', 'h'],
        properties: {
          id: { type: 'string', description: 'Unique short id, used by connectors.' },
          kind: { type: 'string', enum: ELEMENT_KINDS },
          icon: { type: 'string', description: 'Icon id from the catalogue when kind is "icon", otherwise "".' },
          label: { type: 'string', description: 'Text shown with the element, or "".' },
          x: { type: 'number', description: 'Centre x, 0 (left) to 1000 (right).' },
          y: { type: 'number', description: 'Centre y, 0 (top) to 1000 (bottom).' },
          w: { type: 'number', description: 'Width in the same 0-1000 units.' },
          h: { type: 'number', description: 'Height in the same 0-1000 units.' },
        },
      },
    },
    connectors: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['from', 'to', 'kind', 'dashed', 'label'],
        properties: {
          from: { type: 'string', description: 'id of the element the arrow starts at.' },
          to: { type: 'string', description: 'id of the element the arrow points to.' },
          kind: { type: 'string', enum: CONNECTOR_KINDS },
          dashed: { type: 'boolean' },
          label: { type: 'string', description: 'Short text on the arrow, or "".' },
        },
      },
    },
  },
} as const

export function iconCatalogue(): string {
  return BUILTIN_ICONS.map((i) => `${i.id} — ${i.name} (${i.category}; ${i.tags.slice(0, 5).join(', ')})`).join('\n')
}

export const SYSTEM_PROMPT = `You help scientists turn a rough idea into a clean, editable figure of a biological process, in an open-source figure editor called BioSketch.

You do not draw. You describe the figure as structured data, and the editor builds it from its icon library. The scientist then adjusts the result by hand, so a faithful, tidy first layout matters more than completeness.

Coordinates: the page is 1000 units wide and 1000 units tall regardless of its real shape; (0, 0) is the top-left corner. Every element has a centre (x, y) and a size (w, h) in these units.

Element kinds:
- "icon": a picture from the catalogue below. Set "icon" to its id. Use this whenever a catalogue icon fits what is meant (a mitochondrion, a receptor, a cell type, lab equipment).
- "box": a rounded box with the label inside. Use this for named molecules that have no icon of their own, such as specific proteins, genes or metabolites ("GPX4", "ERK", "GSH").
- "ellipse": like box, but oval.
- "text": a free-standing label or caption.
- "membrane": a straight stretch of lipid bilayer, running along the longer side of its w/h box.
- "cell": a closed membrane outline (a cell or organelle boundary) filling its w/h box. Other elements can sit inside it.

Connectors join two elements by id. Kinds: "arrow" (activation, conversion, leads to), "inhibit" (inhibition, drawn with a flat bar), "line" (association), "double" (reversible or binding). Set "dashed" to true for indirect effects or transport/translocation.

Guidance:
- When given a sketch, keep its layout: things stay roughly where the scientist drew them, with the same connections. Read handwritten labels and use them as labels. Do not add biology that is not in the sketch.
- When given only a description, lay the process out so it reads left to right or top to bottom, with even spacing and no overlapping elements.
- Typical sizes: icons about 80-140 units, boxes about 110 by 55, a cell outline several hundred units. Leave at least 40 units between neighbours so arrows are visible.
- Keep labels short (one to three words). Put longer explanations in a "text" element.
- If part of a sketch is unreadable, make your best guess and keep it simple; the scientist will correct it.

Icon catalogue (id — name (category; keywords)):
${iconCatalogue()}`

/** What the scientist is asking for, in words the model reads. */
export function taskText(hasSketch: boolean, description: string): string {
  const notes = description.trim()
  if (hasSketch) {
    return (
      'The image is my hand-drawn sketch of a biological process on the page. Describe it as a clean figure.' +
      (notes ? `\n\nNotes about the sketch: ${notes}` : '')
    )
  }
  return `Create a figure of this biological process:\n\n${notes}`
}

// ---------- reading the model's answer ----------

const fin = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const text = (v: unknown, max = 120): string => (typeof v === 'string' ? v.slice(0, max) : '')

/** Check and tidy a scene that came back from the model. Throws when it is not a scene at all. */
export function parseScene(data: unknown): Scene {
  if (!data || typeof data !== 'object') throw new Error('The AI returned an answer that could not be read.')
  const o = data as Record<string, unknown>
  if (!Array.isArray(o.elements)) throw new Error('The AI returned an answer without any figure elements.')
  const elements: SceneElement[] = []
  const ids = new Set<string>()
  for (const raw of o.elements.slice(0, 120)) {
    if (!raw || typeof raw !== 'object') continue
    const e = raw as Record<string, unknown>
    const id = text(e.id, 40)
    if (!id || ids.has(id) || !ELEMENT_KINDS.includes(e.kind as ElementKind)) continue
    ids.add(id)
    elements.push({
      id,
      kind: e.kind as ElementKind,
      icon: text(e.icon, 60),
      label: text(e.label),
      x: clamp(fin(e.x, 500), 0, 1000),
      y: clamp(fin(e.y, 500), 0, 1000),
      w: clamp(fin(e.w, 100), 10, 1000),
      h: clamp(fin(e.h, 100), 10, 1000),
    })
  }
  const connectors: SceneConnector[] = []
  for (const raw of Array.isArray(o.connectors) ? o.connectors.slice(0, 200) : []) {
    if (!raw || typeof raw !== 'object') continue
    const c = raw as Record<string, unknown>
    const from = text(c.from, 40)
    const to = text(c.to, 40)
    if (!ids.has(from) || !ids.has(to) || from === to) continue
    connectors.push({
      from,
      to,
      kind: CONNECTOR_KINDS.includes(c.kind as ConnectorKind) ? (c.kind as ConnectorKind) : 'arrow',
      dashed: c.dashed === true,
      label: text(c.label, 60),
    })
  }
  return { title: text(o.title), elements, connectors }
}

// ---------- building nodes ----------

const label = textLabel

/** Turn a scene into figure nodes placed on a page of the given size. */
export function sceneToNodes(scene: Scene, page: { width: number; height: number }): FigNode[] {
  const sx = page.width / 1000
  const sy = page.height / 1000
  const back: FigNode[] = []
  const middle: FigNode[] = []
  const texts: FigNode[] = []
  const links: FigNode[] = []
  /** Scene element id -> the node connectors attach to. */
  const anchor = new Map<string, string>()

  for (const e of scene.elements) {
    const cx = e.x * sx
    const cy = e.y * sy
    const bw = Math.max(20, e.w * sx)
    const bh = Math.max(20, e.h * sy)
    const def = e.kind === 'icon' ? getIcon(null, e.icon) : undefined

    if (e.kind === 'icon' && def) {
      const [vw, vh] = def.viewBox
      const scale = Math.min(bw / vw, bh / vh)
      const w = vw * scale
      const h = vh * scale
      const groupId = e.label ? uid() : undefined
      const node: IconNode = { id: uid(), type: 'icon', iconId: def.id, x: cx - w / 2, y: cy - h / 2, w, h, rotation: 0, ...(groupId ? { groupId } : {}) }
      middle.push(node)
      anchor.set(e.id, node.id)
      if (e.label) texts.push(label(e.label, cx, cy + h / 2 + 4, { groupId }))
    } else if (e.kind === 'text') {
      if (!e.label) continue
      const t = label(e.label, cx, cy - 10, { fontSize: clamp(Math.round(bh * 0.5), 13, 30) })
      t.y = Math.round(cy - (t.fontSize * 1.25) / 2)
      texts.push(t)
      anchor.set(e.id, t.id)
    } else if (e.kind === 'membrane' || e.kind === 'cell') {
      let points: Point[]
      const closed = e.kind === 'cell'
      if (closed) {
        points = outlinePoints(cx, cy, bw / 2, bh / 2, 16)
      } else if (bw >= bh) {
        points = [{ x: Math.round(cx - bw / 2), y: Math.round(cy) }, { x: Math.round(cx + bw / 2), y: Math.round(cy) }]
      } else {
        points = [{ x: Math.round(cx), y: Math.round(cy - bh / 2) }, { x: Math.round(cx), y: Math.round(cy + bh / 2) }]
      }
      const node: MembraneNode = {
        id: uid(),
        type: 'membrane',
        points,
        closed,
        thickness: closed ? 20 : 24,
        headColor: '#f0a04b',
        tailColor: '#d9b65c',
        ...(closed ? { fill: '#fff8f1' } : {}),
      }
      back.push(node)
      if (e.label) texts.push(label(e.label, cx, closed ? cy - bh / 2 + 26 : cy - 40, { fontSize: 14, fill: '#6b7785', italic: true }))
    } else {
      // A box or ellipse, or an icon the library does not have: a labelled shape.
      const groupId = uid()
      const w = Math.max(bw, 60)
      const h = Math.max(Math.min(bh, 120), 36)
      const shape: ShapeNode = {
        id: uid(),
        groupId,
        type: 'shape',
        shape: e.kind === 'ellipse' ? 'ellipse' : 'roundrect',
        x: cx - w / 2,
        y: cy - h / 2,
        w,
        h,
        rotation: 0,
        fill: '#e3f3ef',
        stroke: '#1f8f84',
        strokeWidth: 2,
      }
      middle.push(shape)
      anchor.set(e.id, shape.id)
      const words = e.label || (e.kind === 'icon' ? e.icon : '')
      if (words) texts.push(label(words, cx, cy - 10, { bold: true, groupId }))
    }
  }

  for (const c of scene.connectors) {
    const from = anchor.get(c.from)
    const to = anchor.get(c.to)
    if (!from || !to) continue
    const node: ConnectorNode = {
      id: uid(),
      type: 'connector',
      from: { x: 0, y: 0, nodeId: from },
      to: { x: 0, y: 0, nodeId: to },
      kind: c.kind,
      stroke: c.kind === 'inhibit' ? '#c9403d' : INK,
      strokeWidth: 2,
      ...(c.dashed ? { dashed: true } : {}),
      ...(c.label ? { label: c.label } : {}),
    }
    links.push(node)
  }

  if (scene.title) texts.push(label(scene.title, page.width / 2, 18, { bold: true, fontSize: 24 }))
  return [...back, ...middle, ...texts, ...links]
}
