// What a new slide can start with: one of a few ready-made layouts (a title, a title with text, two
// columns, text beside a picture), or a slide the scientist designed once and saved as a template
// (the same picture at the right, the logo in the corner). Both are objects like any other once
// they are on the slide: text boxes to type into, a frame to put a picture in.

import { cloneNodes, scaleAsPicture, usedIconIds } from './doc'
import { addSlide, slideCount, MAX_SLIDES } from './slides'
import type { FigDoc, FigNode, IconDef, ShapeNode, TextNode } from './types'

export type SlideLayoutId = 'title' | 'text' | 'columns' | 'picture'

export interface SlideLayout {
  id: SlideLayoutId
  name: string
  about: string
}

export const SLIDE_LAYOUTS: SlideLayout[] = [
  { id: 'title', name: 'Title', about: 'A large title in the middle with a line under it' },
  { id: 'text', name: 'Title and text', about: 'A heading and bullet points' },
  { id: 'columns', name: 'Two columns', about: 'A heading and two blocks of text side by side' },
  { id: 'picture', name: 'Text and picture', about: 'A heading, bullet points at the left and room for a picture at the right' },
]

const INK = '#1f2933'
const MUTED = '#5f6c7b'

/**
 * The objects of a layout for a page of this size. Sizes follow the height of the page, so a
 * layout looks the same on a wide slide and on a large one. `id` gives every object its id.
 */
export function layoutNodes(layout: SlideLayoutId, page: { width: number; height: number }, id: () => string): FigNode[] {
  const { width: W, height: H } = page
  const margin = Math.round(W * 0.06)
  const room = W - 2 * margin
  const size = (share: number): number => Math.max(8, Math.round(H * share))
  const box = (text: string, x: number, y: number, width: number, fontSize: number, extra: Partial<TextNode> = {}): TextNode => ({ id: id(), type: 'text', x: Math.round(x), y: Math.round(y), text, fontSize, fill: INK, align: 'left', rotation: 0, width: Math.round(width), ...extra })
  const heading = (): TextNode => box('Heading', margin, H * 0.08, room, size(0.058), { bold: true })
  const points = (x: number, width: number, text = 'First point\nSecond point\nThird point'): TextNode => box(text, x, H * 0.25, width, size(0.038), { bullets: true })
  switch (layout) {
    case 'title':
      return [
        box('Title', W / 2, H * 0.34, room, size(0.085), { bold: true, align: 'center' }),
        box('Subtitle, your name, the date', W / 2, H * 0.52, room, size(0.04), { align: 'center', fill: MUTED }),
      ]
    case 'text':
      return [heading(), points(margin, room)]
    case 'columns': {
      const gap = Math.round(W * 0.04)
      const half = (room - gap) / 2
      return [heading(), points(margin, half), points(margin + half + gap, half)]
    }
    case 'picture': {
      const gap = Math.round(W * 0.04)
      const left = Math.round(room * 0.5)
      const frame: ShapeNode = {
        id: id(),
        type: 'shape',
        shape: 'rect',
        x: margin + left + gap,
        y: Math.round(H * 0.25),
        w: room - left - gap,
        h: Math.round(H * 0.6),
        rotation: 0,
        fill: '#f4f6f8',
        stroke: '#9aa3ad',
        strokeWidth: 1.5,
        dashed: true,
        label: { text: 'Drag a picture in, or tap an icon, and delete this frame', fontSize: size(0.026), fill: MUTED },
      }
      return [heading(), points(margin, left), frame]
    }
  }
}

/**
 * The open slide as a template: a figure of that one slide, with the icons it places and nothing
 * else of the figure (no other slides, no notes).
 */
export function templateOf(doc: FigDoc, name: string): FigDoc {
  const used = new Set(usedIconIds(doc))
  const customIcons: Record<string, IconDef> = {}
  for (const [iconId, icon] of Object.entries(doc.customIcons)) if (used.has(iconId)) customIcons[iconId] = icon
  return { version: 1, name: name.trim().slice(0, 60) || 'My slide', width: doc.width, height: doc.height, background: doc.background, nodes: doc.nodes, customIcons }
}

/**
 * The objects of a template for a page of this size, under ids of their own: as they are when the
 * page has the template's size, otherwise made smaller or larger as one picture (text and lines in
 * step) and put in the middle of the page.
 */
export function templateNodes(template: FigDoc, page: { width: number; height: number }): FigNode[] {
  const s = Math.min(page.width / template.width, page.height / template.height)
  const sized = Math.abs(s - 1) < 1e-6 ? template : scaleAsPicture(template, template.nodes.map((n) => n.id), s, { x: 0, y: 0 })
  const dx = Math.round((page.width - template.width * s) / 2)
  const dy = Math.round((page.height - template.height * s) / 2)
  return cloneNodes(sized.nodes, sized, dx, dy)
}

/** A new slide after the open one that starts as the template: its objects, its page colour, and its icons added to the figure's. */
export function slideFromTemplate(doc: FigDoc, template: FigDoc): FigDoc {
  if (slideCount(doc) >= MAX_SLIDES) return doc
  const next = addSlide(doc, templateNodes(template, doc), template.background)
  return { ...next, customIcons: { ...template.customIcons, ...next.customIcons } }
}

/** The open slide filled with a template when it is still empty; otherwise a new slide after it. */
export function startFromTemplate(doc: FigDoc, template: FigDoc): FigDoc {
  if (doc.nodes.length) return slideFromTemplate(doc, template)
  return { ...doc, background: template.background, nodes: templateNodes(template, doc), customIcons: { ...template.customIcons, ...doc.customIcons } }
}
