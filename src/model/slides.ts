// A figure can have several slides, shown one after the other as a presentation. The slide that is
// open is the figure as the rest of BioSketch knows it (`doc.nodes`, and with them the colour of
// its page and its notes): drawing, selecting, exporting and undoing need to know nothing about
// slides. The other slides wait in `doc.slides`, those before the open one and those after it.
// Opening another slide swaps the three over. The size of the page and the icons belong to the
// whole figure.
//
// Everything here is pure: it returns a new figure.

import { cloneNodes } from './doc'
import type { Endpoint, FigDoc, FigNode, Slide } from './types'

/** The most slides a figure holds. */
export const MAX_SLIDES = 200
/** The longest notes a slide holds, in characters. */
export const MAX_NOTES = 5000
// Objects that come in and go on presses: `src/model/animation.ts`.
export { MAX_STEPS, nodesAtStep, slideSteps } from './animation'

export const slideCount = (doc: FigDoc): number => 1 + (doc.slides ? doc.slides.before.length + doc.slides.after.length : 0)

/** The place of the open slide among the slides, counted from 0. */
export const slideIndex = (doc: FigDoc): number => doc.slides?.before.length ?? 0

/** The open slide as the other slides are kept: its objects, the colour of its page, its notes. */
export const openSlide = (doc: FigDoc): Slide => ({ nodes: doc.nodes, background: doc.background, ...(doc.notes ? { notes: doc.notes } : {}) })

/** Every slide of the figure, in order. */
export function slideList(doc: FigDoc): Slide[] {
  if (!doc.slides) return [openSlide(doc)]
  return [...doc.slides.before, openSlide(doc), ...doc.slides.after]
}

/** The objects of every slide, in the order of the slides. */
export const slideNodes = (doc: FigDoc): FigNode[][] => slideList(doc).map((s) => s.nodes)

/** Every object of the figure, on whichever slide it is. */
export const everyNode = (doc: FigDoc): FigNode[] => (doc.slides ? slideNodes(doc).flat() : doc.nodes)

/**
 * The same figure made of these slides, with the slide at `open` as the open one. A slide given as
 * a bare list of objects has the colour of the figure's page and no notes.
 */
export function withSlides(doc: FigDoc, slides: (Slide | FigNode[])[], open = 0): FigDoc {
  const { slides: _others, notes: _notes, ...rest } = doc
  const all: Slide[] = slides.map((s) => (Array.isArray(s) ? { nodes: s, background: doc.background } : { nodes: s.nodes, background: s.background, ...(s.notes ? { notes: s.notes } : {}) }))
  const at = Math.min(Math.max(all.length - 1, 0), Math.max(0, Math.round(open) || 0))
  const shown = all[at] ?? { nodes: [], background: doc.background }
  const figure: FigDoc = { ...rest, background: shown.background, ...(shown.notes ? { notes: shown.notes } : {}), nodes: shown.nodes }
  return all.length <= 1 ? figure : { ...figure, slides: { before: all.slice(0, at), after: all.slice(at + 1) } }
}

/** One slide as a figure of its own, to draw or export it: the size and the icons of the figure, the objects and the page colour of that slide. */
export function slideDoc(doc: FigDoc, index: number): FigDoc {
  const all = slideList(doc)
  return withSlides(doc, [all[Math.min(all.length - 1, Math.max(0, index))]])
}

/** Every slide as a figure of its own, in order. */
export const slideDocs = (doc: FigDoc): FigDoc[] => slideList(doc).map((slide) => withSlides(doc, [slide]))

/** The figure with another slide open. */
export function showSlide(doc: FigDoc, index: number): FigDoc {
  const count = slideCount(doc)
  const at = Math.min(count - 1, Math.max(0, Math.round(index) || 0))
  return at === slideIndex(doc) ? doc : withSlides(doc, slideList(doc), at)
}

/** A new slide after the open one, opened: empty unless `nodes` says what it holds, with the page colour of the open slide unless `background` gives another. */
export function addSlide(doc: FigDoc, nodes: FigNode[] = [], background: string = doc.background): FigDoc {
  if (slideCount(doc) >= MAX_SLIDES) return doc
  const all = slideList(doc)
  const at = slideIndex(doc) + 1
  all.splice(at, 0, { nodes, background })
  return withSlides(doc, all, at)
}

/** A copy of the open slide after it, opened. The copies have ids of their own; groups and attached arrows stay together. */
export function duplicateSlide(doc: FigDoc): FigDoc {
  if (slideCount(doc) >= MAX_SLIDES) return doc
  const all = slideList(doc)
  const at = slideIndex(doc) + 1
  all.splice(at, 0, { ...openSlide(doc), nodes: cloneNodes(doc.nodes, doc, 0, 0) })
  return withSlides(doc, all, at)
}

/** The figure without its open slide: the one after it is opened, or the one before when it was the last. A figure keeps one slide. */
export function removeSlide(doc: FigDoc): FigDoc {
  if (slideCount(doc) < 2) return doc
  const all = slideList(doc)
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
  const all = slideList(doc)
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

/** The objects of every slide of the figure passed through `fn` (those of the open one too). */
export function mapSlides(doc: FigDoc, fn: (nodes: FigNode[]) => FigNode[]): FigDoc {
  if (!doc.slides) return { ...doc, nodes: fn(doc.nodes) }
  return withSlides(doc, slideList(doc).map((slide) => ({ ...slide, nodes: fn(slide.nodes) })), slideIndex(doc))
}

/** The figure with the page of every slide in one colour. */
export function colourSlides(doc: FigDoc, background: string): FigDoc {
  if (!doc.slides) return doc.background === background ? doc : { ...doc, background }
  return withSlides(doc, slideList(doc).map((slide) => ({ ...slide, background })), slideIndex(doc))
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
