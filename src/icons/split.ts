// Splitting an icon into its separate pieces, so one piece can be moved, stretched, turned,
// recoloured or deleted without affecting the rest.
//
// Each piece becomes a small icon of its own, stored with the figure like an imported icon.

import { removeNodes, uid } from '../model/doc'
import { rectCenter, rotate } from '../model/geometry'
import type { FigNode, IconDef, IconNode, Rect } from '../model/types'
import { toast, useEditor } from '../store'
import { getIcon } from './library'

const MAX_PARTS = 80
const SVG_NS = 'http://www.w3.org/2000/svg'

export interface IconParts {
  /** Shared definitions (gradients, clip paths) every piece may refer to. */
  defs: string
  /** Opening and closing markup of the groups the pieces sat in (they carry styles and transforms). */
  open: string
  close: string
  /** One entry per piece: its own markup, without the wrapping groups. */
  parts: string[]
}

const strip = (markup: string): string => markup.replace(/ xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, '')

/**
 * Find the pieces of an icon: the top-level shapes, looking inside a group when that group is
 * the only thing at its level (icons are usually one group holding all their shapes).
 */
export function extractParts(body: string): IconParts | null {
  if (typeof DOMParser === 'undefined') return null
  const doc = new DOMParser().parseFromString(`<svg xmlns="${SVG_NS}">${body}</svg>`, 'image/svg+xml')
  if (doc.getElementsByTagName('parsererror').length) return null
  const serializer = new XMLSerializer()
  let container: Element = doc.documentElement
  let defs = ''
  let open = ''
  let close = ''
  for (let depth = 0; depth < 6; depth++) {
    const children = Array.from(container.children)
    for (const d of children.filter((c) => c.tagName.toLowerCase() === 'defs')) defs += strip(serializer.serializeToString(d))
    const shapes = children.filter((c) => c.tagName.toLowerCase() !== 'defs')
    if (shapes.length !== 1 || shapes[0].tagName.toLowerCase() !== 'g' || !shapes[0].children.length) break
    const shell = strip(serializer.serializeToString(shapes[0].cloneNode(false)))
    open += shell.replace(/\s*\/>$/, '>').replace(/><\/g>$/, '>')
    close = '</g>' + close
    container = shapes[0]
  }
  const parts = Array.from(container.children)
    .filter((c) => c.tagName.toLowerCase() !== 'defs')
    .map((c) => strip(serializer.serializeToString(c)))
  return { defs, open, close, parts }
}

/** Measure where each piece sits inside the icon, by drawing it off-screen. Browser only. */
export function measure(pieces: string[], viewBox: [number, number]): (Rect | null)[] {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('width', String(viewBox[0]))
  svg.setAttribute('height', String(viewBox[1]))
  svg.setAttribute('viewBox', `0 0 ${viewBox[0]} ${viewBox[1]}`)
  svg.setAttribute('style', 'position:fixed;left:0;top:0;visibility:hidden;pointer-events:none')
  svg.innerHTML = pieces.map((p) => `<g>${p}</g>`).join('')
  document.body.appendChild(svg)
  try {
    return Array.from(svg.children).map((g) => {
      const el = g as SVGGraphicsElement
      const plain = el.getBBox()
      let b = plain
      try {
        b = el.getBBox({ stroke: true })
      } catch {
        b = plain
      }
      if (!(b.width > 0.01) && !(b.height > 0.01)) return null
      // Most browsers measure shapes without their outline. Where that is the case, widen the box
      // by half the thickest outline so the piece's box matches what is drawn.
      let pad = 1
      if (b.width === plain.width && b.height === plain.height) {
        let thickest = 0
        for (const shape of Array.from(el.querySelectorAll('*'))) {
          const style = getComputedStyle(shape)
          if (style.stroke && style.stroke !== 'none') thickest = Math.max(thickest, parseFloat(style.strokeWidth) || 0)
        }
        pad = Math.max(2, thickest / 2 + 1)
      }
      return { x: b.x - pad, y: b.y - pad, w: b.width + 2 * pad, h: b.height + 2 * pad }
    })
  } finally {
    svg.remove()
  }
}

/** Where a piece measured at `b` inside the icon ends up on the page, given how the icon is placed. */
export function placePart(node: IconNode, viewBox: [number, number], b: Rect): Pick<IconNode, 'x' | 'y' | 'w' | 'h' | 'rotation'> {
  const sx = node.w / viewBox[0]
  const sy = node.h / viewBox[1]
  const lx = (node.flipX ? viewBox[0] - b.x - b.w : b.x) * sx
  const ly = (node.flipY ? viewBox[1] - b.y - b.h : b.y) * sy
  const w = b.w * sx
  const h = b.h * sy
  const centre = rotate({ x: node.x + lx + w / 2, y: node.y + ly + h / 2 }, node.rotation, rectCenter(node))
  return { x: centre.x - w / 2, y: centre.y - h / 2, w, h, rotation: node.rotation }
}

/** Replace an icon on the page by its pieces, grouped so they still move together. */
export function splitIcon(nodeId: string): void {
  const s = useEditor.getState()
  const node = s.doc.nodes.find((n) => n.id === nodeId)
  if (!node || node.type !== 'icon') return
  const icon = getIcon(s.doc, node.iconId)
  const found = icon ? extractParts(icon.body) : null
  if (!icon || !found) return
  if (found.parts.length < 2) {
    toast('This icon is a single shape, so there is nothing to split.')
    return
  }
  if (found.parts.length > MAX_PARTS) {
    toast(`This icon has ${found.parts.length} pieces, which is too many to split usefully.`)
    return
  }
  const pieces = found.parts.map((p) => found.defs + found.open + p + found.close)
  const boxes = measure(pieces, icon.viewBox)
  // Keep the icon's own group when it has one, so a label grouped with it stays with the pieces.
  const groupId = node.groupId ?? uid()
  const defs: Record<string, IconDef> = {}
  const nodes: FigNode[] = []
  pieces.forEach((markup, i) => {
    const b = boxes[i]
    if (!b) return
    const id = `part-${uid()}`
    defs[id] = {
      id,
      name: icon.name,
      category: 'Part',
      tags: [],
      viewBox: [b.w, b.h],
      body: `<g transform="translate(${-b.x} ${-b.y})">${markup}</g>`,
      license: icon.license,
      author: icon.author,
      source: icon.source,
    }
    nodes.push({
      id: uid(),
      type: 'icon',
      iconId: id,
      groupId,
      ...placePart(node, icon.viewBox, b),
      ...(node.flipX ? { flipX: true } : {}),
      ...(node.flipY ? { flipY: true } : {}),
      ...(node.colors ? { colors: node.colors } : {}),
      ...(node.strokeScale ? { strokeScale: node.strokeScale } : {}),
      ...(node.opacity !== undefined ? { opacity: node.opacity } : {}),
    })
  })
  if (nodes.length < 2) {
    toast('This icon could not be split into separate pieces.')
    return
  }
  const index = s.doc.nodes.findIndex((n) => n.id === nodeId)
  s.commit(
    (doc) => {
      // Arrows attached to the icon are released first, so they stay where they were.
      const without = removeNodes(doc, [nodeId])
      const at = Math.min(index, without.nodes.length)
      return {
        ...without,
        nodes: [...without.nodes.slice(0, at), ...nodes, ...without.nodes.slice(at)],
        customIcons: { ...without.customIcons, ...defs },
      }
    },
    { select: nodes.map((n) => n.id) },
  )
  toast(`Split into ${nodes.length} pieces. Double-tap a piece to select it alone.`)
}
