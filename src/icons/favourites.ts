// Favourite icons and the icons used last. Both are lists of ids of icons of the collections, kept
// in this browser for every figure: what a scientist reaches for again and again should not have
// to be searched for each time. An icon imported into one figure lives only there and is not listed.

import { packOf } from './packs'

/** The most favourites that are kept, and how many of the icons used last. */
export const FAVOURITES_MAX = 300
export const RECENT_MAX = 24

const FAVOURITES = 'biosketch.icons.favourites'
const RECENT = 'biosketch.icons.recent'

/** True for an icon of a collection, which can be found again from its id. */
export const fromCollection = (id: string): boolean => packOf(id) !== ''

/** A stored list as ids of icons of the collections, each once: read back as untrusted data. */
export function readIds(text: string | null, most: number): string[] {
  let list: unknown
  try {
    list = JSON.parse(text ?? '[]')
  } catch {
    return []
  }
  if (!Array.isArray(list)) return []
  const out: string[] = []
  for (const id of list) {
    if (typeof id === 'string' && id.length <= 64 && fromCollection(id) && !out.includes(id)) out.push(id)
    if (out.length >= most) break
  }
  return out
}

/** The favourites with this icon added in front, or without it when it was one. */
export function toggleId(list: string[], id: string): string[] {
  if (list.includes(id)) return list.filter((x) => x !== id)
  return fromCollection(id) ? [id, ...list].slice(0, FAVOURITES_MAX) : list
}

/** The icons used last, with this one in front. */
export function usedId(list: string[], id: string): string[] {
  if (!fromCollection(id) || list[0] === id) return list
  return [id, ...list.filter((x) => x !== id)].slice(0, RECENT_MAX)
}

function stored(key: string, most: number): string[] {
  try {
    return readIds(localStorage.getItem(key), most)
  } catch {
    return []
  }
}

function keep(key: string, list: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch {
    /* the list lasts for this visit */
  }
}

export const storedFavourites = (): string[] => stored(FAVOURITES, FAVOURITES_MAX)
export const storedRecent = (): string[] => stored(RECENT, RECENT_MAX)
export const keepFavourites = (list: string[]): void => keep(FAVOURITES, list)
export const keepRecent = (list: string[]): void => keep(RECENT, list)
