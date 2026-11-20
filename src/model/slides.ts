// A figure can have several slides, shown one after the other as a presentation. The slide that is
// open is the figure as the rest of BioSketch knows it (`doc.nodes`): drawing, selecting, exporting
// and undoing need to know nothing about slides. The other slides wait in `doc.slides`, those
// before the open one and those after it. Opening another slide swaps the objects over. The page
// (its size and colour) and the icons belong to the whole figure.
//
// Everything here is pure: it returns a new figure.

import { cloneNodes } from './doc'
import type { Endpoint, FigDoc, FigNode } from './types'

/** The most slides a figure holds. */
export const MAX_SLIDES = 200

export const slideCount = (doc: FigDoc): number => 1 + (doc.slides ? doc.slides.before.length + doc.slides.after.length : 0)

/** The place of the open slide among the slides, counted from 0. */
export const slideIndex = (doc: FigDoc): number => doc.slides?.before.length ?? 0

/** The objects of every slide, in the order of the slides. */
export function slideNodes(doc: FigDoc): FigNode[][] {
  if (!doc.slides) return [doc.nodes]
  return [...doc.slides.before.map((s) => s.nodes), doc.nodes, ...doc.slides.after.map((s) => s.nodes)]
}

/** Every object of the figure, on whichever slide it is. */
export const everyNode = (doc: FigDoc): FigNode[] => (doc.slides ? slideNodes(doc).flat() : doc.nodes)

/** The same figure made of these slides, with the slide at `open` as the open one. */
export function withSlides(doc: FigDoc, slides: FigNode[][], open = 0): FigDoc {
  const { slides: _others, ...rest } = doc
  if (slides.length <= 1) return { ...rest, nodes: slides[0] ?? [] }
  const at = Math.min(slides.length - 1, Math.max(0, Math.round(open) || 0))
  return {
    ...rest,
    nodes: slides[at],
    slides: { before: slides.slice(0, at).map((nodes) => ({ nodes })), after: slides.slice(at + 1).map((nodes) => ({ nodes })) },
  }
}

/** One slide as a figure of its own, to draw or export it: the page and the icons of the figure, the objects of that slide. */
export function slideDoc(doc: FigDoc, index: number): FigDoc {
  const all = slideNodes(doc)
  return withSlides(doc, [all[Math.min(all.length - 1, Math.max(0, index))]])
}

/** Every slide as a figure of its own, in order. */
export const slideDocs = (doc: FigDoc): FigDoc[] => slideNodes(doc).map((nodes) => withSlides(doc, [nodes]))

/** The figure with another slide open. */
export function showSlide(doc: FigDoc, index: number): FigDoc {
  const count = slideCount(doc)
  const at = Math.min(count - 1, Math.max(0, Math.round(index) || 0))
  return at === slideIndex(doc) ? doc : withSlides(doc, slideNodes(doc), at)
}

/** A new, empty slide after the open one, opened. */
export function addSlide(doc: FigDoc): FigDoc {
  if (slideCount(doc) >= MAX_SLIDES) return doc
  const all = slideNodes(doc)
  const at = slideIndex(doc) + 1
  all.splice(at, 0, [])
  return withSlides(doc, all, at)
}

/** A copy of the open slide after it, opened. The copies have ids of their own; groups and attached arrows stay together. */
export function duplicateSlide(doc: FigDoc): FigDoc {
  if (slideCount(doc) >= MAX_SLIDES) return doc
  const all = slideNodes(doc)
  const at = slideIndex(doc) + 1
  all.splice(at, 0, cloneNodes(doc.nodes, doc, 0, 0))
  return withSlides(doc, all, at)
}

/** The figure without its open slide: the one after it is opened, or the one before when it was the last. A figure keeps one slide. */
export function removeSlide(doc: FigDoc): FigDoc {
  if (slideCount(doc) < 2) return doc
  const all = slideNodes(doc)
  const at = slideIndex(doc)
  all.splice(at, 1)
  return withSlides(doc, all, Math.min(at, all.length - 1))
}

/** The slide at `from` moved to the place `to`. The slide that is open stays open. */
export function moveSlide(doc: FigDoc, from: number, to: number): FigDoc {
  const count = slideCount(doc)
  if (!(from >= 0 && from < count)) return doc
  const target = Math.min(count - 1, Math.max(0, Math.round(to) || 0))
  if (target === from) return doc
  const all = slideNodes(doc)
  const [moved] = all.splice(from, 1)
  all.splice(target, 0, moved)
  let open = slideIndex(doc)
  if (open === from) open = target
  else {
    if (from < open) open--
    if (target <= open) open++
  }
  return withSlides(doc, all, open)
}

/**
 * Where a slide dragged from the place `from` ends up when it is dropped into a gap between the
 * slides: gap 0 is before the first slide, gap 1 between the first and the second, and so on.
 */
export const dropPlace = (from: number, gap: number): number => (gap > from ? gap - 1 : gap)

/** Every slide of the figure passed through `fn` (the open one too). */
export function mapSlides(doc: FigDoc, fn: (nodes: FigNode[]) => FigNode[]): FigDoc {
  if (!doc.slides) return { ...doc, nodes: fn(doc.nodes) }
  return withSlides(doc, slideNodes(doc).map(fn), slideIndex(doc))
}

/**
 * The slides with no id used twice in the figure. An object whose id an earlier slide has (a file
 * written by hand, with a "title" on every slide) gets another one, and the arrows attached to it
 * on its slide follow. Several slides are drawn into one document for a PDF, where ids must differ.
 */
export function uniqueIds(slides: FigNode[][]): FigNode[][] {
  const taken = new Set<string>()
  return slides.map((nodes) => {
    const own = new Set(nodes.map((n) => n.id))
    const renamed = new Map<string, string>()
    for (const n of nodes) {
      if (!taken.has(n.id)) continue
      let k = 2
      let fresh = `${n.id.slice(0, 56)}_${k}`
      while (taken.has(fresh) || own.has(fresh)) fresh = `${n.id.slice(0, 56)}_${++k}`
      renamed.set(n.id, fresh)
      own.add(fresh)
    }
    const out = renamed.size
      ? nodes.map((n) => {
          const end = (ep: Endpoint): Endpoint => (ep.nodeId && renamed.has(ep.nodeId) ? { ...ep, nodeId: renamed.get(ep.nodeId)! } : ep)
          const named = renamed.has(n.id) ? { ...n, id: renamed.get(n.id)! } : n
          return named.type === 'connector' ? { ...named, from: end(named.from), to: end(named.to) } : named
        })
      : nodes
    for (const n of out) taken.add(n.id)
    return out
  })
}
