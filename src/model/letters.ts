// Panel letters kept in order: every text marked as a panel letter (`letter` on a text) is renamed
// A, B, C … in reading order whenever the figure changes, row by row from the top and left to right
// within a row. Letters whose tops lie within one and a half letter heights of each other count as
// one row, so letters placed by hand a little out of line still read across. Lower-case letters stay
// lower case when most of them are. Each slide is lettered on its own (only the open one changes
// here: the others cannot change while they are not open). Pure.

import type { FigDoc, FigNode, TextNode } from './types'

const ONE_LETTER = /^[A-Za-z]$/

/** A panel letter that is still one letter (one retyped into a word is left alone). */
export const isPanelLetter = (n: FigNode): n is TextNode => n.type === 'text' && !!n.letter && ONE_LETTER.test(n.text.trim())

/** The panel letters of a list of objects in reading order. */
export function readingOrder(letters: TextNode[]): TextNode[] {
  const tol = 1.5 * Math.max(0, ...letters.map((l) => l.fontSize))
  const byTop = [...letters].sort((a, b) => a.y - b.y || a.x - b.x)
  const rows: TextNode[][] = []
  for (const l of byTop) {
    const row = rows[rows.length - 1]
    if (row && l.y - row[0].y <= tol) row.push(l)
    else rows.push([l])
  }
  return rows.flatMap((row) => row.sort((a, b) => a.x - b.x))
}

/** The figure with its panel letters renamed in reading order; the same figure when they already are. */
export function orderLetters(doc: FigDoc): FigDoc {
  const letters = doc.nodes.filter(isPanelLetter)
  if (!letters.length) return doc
  const lower = letters.filter((l) => l.text.trim() === l.text.trim().toLowerCase()).length > letters.length / 2
  const want = new Map<string, string>()
  readingOrder(letters).forEach((l, i) => {
    const code = String.fromCharCode(Math.min(25, i) + (lower ? 97 : 65))
    if (l.text !== code) want.set(l.id, code)
  })
  if (!want.size) return doc
  return { ...doc, nodes: doc.nodes.map((n) => (n.type === 'text' && want.has(n.id) ? { ...n, text: want.get(n.id)! } : n)) }
}
