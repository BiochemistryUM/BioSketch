// Finding things by what the scientist types: the gallery, the Search box and the icon library's
// offers of things to add. Plain words, any order, any case; the start of a word counts most.

export interface Findable {
  name: string
  /** Other words people use for it (synonyms, abbreviations, what it is for). */
  keywords?: readonly string[]
  description?: string
}

const fold = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[δΔ]/g, 'd')
    .replace(/[^a-z0-9µ%]+/g, ' ')
    .trim()

/**
 * How well an item fits the words typed: 0 when one of them is found nowhere. A word at the
 * start of the name counts most, then at the start of another word of the name, then a keyword,
 * then anywhere in the description.
 */
export function matchScore(query: string, item: Findable): number {
  const words = fold(query).split(' ').filter(Boolean)
  if (!words.length) return 0
  const name = fold(item.name)
  const nameWords = name.split(' ')
  const keys = (item.keywords ?? []).map(fold)
  const keyWords = keys.flatMap((k) => k.split(' '))
  const about = fold(item.description ?? '')
  let score = 0
  for (const w of words) {
    let best = 0
    if (name.startsWith(w)) best = 8
    else if (nameWords.some((n) => n.startsWith(w))) best = 6
    else if (keys.some((k) => k === w || k.startsWith(w))) best = 5
    else if (keyWords.some((k) => k.startsWith(w))) best = 4
    else if (w.length >= 3 && (name.includes(w) || keys.some((k) => k.includes(w)))) best = 3
    else if (w.length >= 3 && about.includes(w)) best = 1
    if (!best) return 0
    score += best
  }
  return score
}

/** The items that fit, best first; ties keep their order. */
export function findItems<T extends Findable>(query: string, items: readonly T[]): T[] {
  return items
    .map((item, i) => ({ item, i, s: matchScore(query, item) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.item)
}
