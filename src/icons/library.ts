// Finding and searching icons. Every icon in a figure is stored with the figure (`customIcons`):
// those placed from a collection (see packs.ts), those imported from a file, and the pieces of a
// split or reshaped icon. BioSketch has no drawings of its own.

import { everyNode } from '../model/slides'
import type { FigDoc, IconDef } from '../model/types'

/**
 * An icon of this figure, by id. Undefined when the figure does not hold it, which is the case for
 * the drawings BioSketch offered until November 2026: a figure from then shows a placeholder there.
 */
export function getIcon(doc: Pick<FigDoc, 'customIcons'> | null, id: string): IconDef | undefined {
  return doc?.customIcons[id]
}

/** The name shown for an icon the figure places but does not hold. */
export const MISSING_ICON = 'Missing icon'

/** The ids of icons the figure places but does not hold, each once. They are drawn as dashed boxes with a question mark. */
export function missingIcons(doc: FigDoc): string[] {
  return [...new Set(doc.nodes.flatMap((n) => (n.type === 'icon' && !doc.customIcons[n.iconId] ? [n.iconId] : [])))]
}

/** What an icon was called, read from its id ("pack--cell-membrane" gives "cell membrane"), for a figure that no longer holds it. */
export const nameFromId = (id: string): string => id.replace(/^.*--/, '').replace(/[-_]+/g, ' ').trim()

/** What to tell the scientist about a figure with icons it does not hold; null when it holds them all. */
export function missingIconsNote(doc: FigDoc): string | null {
  // Counted on every slide of the figure, not only the open one.
  const boxes = everyNode(doc).filter((n) => n.type === 'icon' && !doc.customIcons[n.iconId]).length
  if (!boxes) return null
  return `${boxes === 1 ? 'One icon of this figure is' : `${boxes} icons of this figure are`} no longer available and ${boxes === 1 ? 'shows as a dashed box' : 'show as dashed boxes'} with a question mark. Select ${boxes === 1 ? 'it' : 'one'}, then tap an icon in the library to put that in its place.`
}

/** A test for "does this text contain every word of the search?", or null when the search is empty. */
export function searchTest(query: string): ((text: string) => boolean) | null {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return null
  return (text) => {
    const hay = text.toLowerCase()
    return words.every((w) => hay.includes(w))
  }
}

/** Matches in the name come first, then matches that are only in the category or keywords. */
export function nameFirst<T>(items: T[], inName: (item: T) => boolean): T[] {
  return [...items.filter(inName), ...items.filter((i) => !inName(i))]
}

export function searchIcons(icons: IconDef[], query: string): IconDef[] {
  const test = searchTest(query)
  if (!test) return icons
  return nameFirst(
    icons.filter((icon) => test(`${icon.name} ${icon.category} ${icon.tags.join(' ')}`)),
    (icon) => test(icon.name),
  )
}

/** Public-domain artwork needs no credit line; everything else does. */
export const isPublicDomain = (licence: string): boolean => /^(cc0|public domain)/i.test(licence.trim())
