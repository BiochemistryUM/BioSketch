// The layout check: before an AI figure is put on the page, look at where every element will be
// drawn and repair what a scientist would otherwise have to fix by hand. Elements that hang off
// the page are moved back onto it, and elements that lie on top of each other by accident are
// moved apart. No AI is involved: this is plain geometry, so it costs nothing and works the same
// on both routes.

import { elementBox, type ElementKind, type IconLookup, type Scene, type SceneElement } from './scene'

export interface Tidied {
  scene: Scene
  /** What was changed, in words for the scientist. Empty when the layout was fine. */
  fixes: string[]
}

interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** Kinds that other elements are meant to sit on or in: they never count as "in the way". */
const BACKGROUND: ElementKind[] = ['membrane', 'cell', 'frame']
/**
 * Free space kept between two elements that were moved apart (more when an arrow joins them, so
 * the arrow and its label can be seen), and between an element and the page edge.
 */
const GAP = 12
const ARROW_GAP = 44
const EDGE = 6
/**
 * One element lying inside a clearly larger picture is on purpose (a mark on an organelle, a
 * nucleus in a cell): it is at most this share of the picture's size, and at least `NESTED_COVER`
 * of it lies within the picture. Boxes, ovals and text never hold anything: whatever lies on them
 * hides their words.
 */
const NESTED_SHARE = 0.5
const NESTED_COVER = 0.8
const PASSES = 40

const area = (b: Box): number => b.w * b.h
const centre = (b: Box): { x: number; y: number } => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 })

/** True when `small` sits in `large` the way a part sits in a picture. */
function within(small: Box, large: Box): boolean {
  const shared = Math.max(0, Math.min(small.x + small.w, large.x + large.w) - Math.max(small.x, large.x)) * Math.max(0, Math.min(small.y + small.h, large.y + large.h) - Math.max(small.y, large.y))
  return area(small) <= area(large) * NESTED_SHARE && shared >= area(small) * NESTED_COVER
}

/** What to call an element when telling the scientist about it. */
function nameOf(e: SceneElement, icons: IconLookup): string {
  const words = e.label.trim() || (e.kind === 'icon' ? (icons(e.icon)?.name ?? e.icon) : '')
  return words ? `\u201c${words}\u201d` : `a ${e.kind === 'icon' ? 'shape' : e.kind}`
}

/**
 * Repair the layout of a scene for a page of the given size. The scene that comes back has the
 * same elements, some of them moved; `fixes` says which and why.
 */
export function tidyScene(scene: Scene, page: { width: number; height: number }, icons: IconLookup = () => undefined): Tidied {
  const boxes = scene.elements.map((e) => elementBox(e, page, true, icons))
  const start = boxes.map((b) => ({ x: b.x, y: b.y }))
  // The drawing without its label, where it is now: something lying on the drawing of a larger
  // thing is on purpose, something lying on its label is not.
  const drawings = scene.elements.map((e) => elementBox(e, page, false, icons))
  const drawing = (i: number): Box => ({ ...drawings[i], x: drawings[i].x + boxes[i].x - start[i].x, y: drawings[i].y + boxes[i].y - start[i].y })
  const picture = scene.elements.map((e) => e.kind === 'icon' && !!icons(e.icon))
  const nested = (i: number, j: number): boolean => {
    const [small, large] = area(drawings[i]) <= area(drawings[j]) ? [i, j] : [j, i]
    return picture[large] && within(drawing(small), drawing(large))
  }
  const solid = scene.elements.map((e) => !BACKGROUND.includes(e.kind))

  // Something larger than the page cannot be moved onto it: centre it instead.
  const ontoPage = (b: Box): boolean => {
    const x = b.w + 2 * EDGE > page.width ? (page.width - b.w) / 2 : Math.min(Math.max(b.x, EDGE), page.width - EDGE - b.w)
    const y = b.h + 2 * EDGE > page.height ? (page.height - b.h) / 2 : Math.min(Math.max(b.y, EDGE), page.height - EDGE - b.h)
    const moved = Math.abs(x - b.x) > 0.5 || Math.abs(y - b.y) > 0.5
    b.x = x
    b.y = y
    return moved
  }

  const offPage = new Set<number>()
  boxes.forEach((b, i) => {
    if (ontoPage(b)) offPage.add(i)
  })

  const joined = new Set(scene.connectors.flatMap((c) => [`${c.from}>${c.to}`, `${c.to}>${c.from}`]))
  const gapBetween = (i: number, j: number): number => (joined.has(`${scene.elements[i].id}>${scene.elements[j].id}`) ? ARROW_GAP : GAP)

  // Push overlapping pairs apart, half the way each, along the direction that needs the smaller
  // move. Moving one pair can create another overlap, so repeat until nothing moves.
  const apart = new Set<string>()
  for (let pass = 0; pass < PASSES; pass++) {
    let moved = false
    for (let i = 0; i < boxes.length; i++) {
      if (!solid[i]) continue
      for (let j = i + 1; j < boxes.length; j++) {
        if (!solid[j]) continue
        const [a, b] = [boxes[i], boxes[j]]
        const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
        const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
        // Only a real overlap starts a repair; once started, the pair is given the full gap.
        const known = apart.has(`${i}:${j}`)
        const gap = gapBetween(i, j)
        if (overlapX <= (known ? -gap + 0.5 : 0.5) || overlapY <= (known ? -gap + 0.5 : 0.5)) continue
        if (!known && nested(i, j)) continue
        apart.add(`${i}:${j}`)
        const [ca, cb] = [centre(a), centre(b)]
        if (overlapX <= overlapY) {
          const push = (overlapX + gap) / 2
          const dir = ca.x <= cb.x ? 1 : -1
          a.x -= push * dir
          b.x += push * dir
        } else {
          const push = (overlapY + gap) / 2
          const dir = ca.y <= cb.y ? 1 : -1
          a.y -= push * dir
          b.y += push * dir
        }
        ontoPage(a)
        ontoPage(b)
        moved = true
      }
    }
    if (!moved) break
  }

  const fixes: string[] = []
  for (const key of apart) {
    const [i, j] = key.split(':').map(Number)
    fixes.push(`Moved ${nameOf(scene.elements[i], icons)} and ${nameOf(scene.elements[j], icons)} apart: they were on top of each other.`)
  }
  const inPair = new Set([...apart].flatMap((key) => key.split(':').map(Number)))
  for (const i of offPage) if (!inPair.has(i)) fixes.push(`Moved ${nameOf(scene.elements[i], icons)} back onto the page.`)
  if (!fixes.length) return { scene, fixes }

  const round = (v: number): number => Math.round(v * 10) / 10
  const elements = scene.elements.map((e, i) => {
    const dx = boxes[i].x - start[i].x
    const dy = boxes[i].y - start[i].y
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return e
    return { ...e, x: round(e.x + (dx * 1000) / page.width), y: round(e.y + (dy * 1000) / page.height) }
  })
  return { scene: { ...scene, elements }, fixes }
}
