// Panel letters kept in order (src/model/letters.ts) and the store applying it to every change.

import { beforeEach, describe, expect, it } from 'vitest'
import { validateDoc } from '../src/io/files'
import { emptyDoc } from '../src/model/doc'
import { orderLetters, readingOrder } from '../src/model/letters'
import type { FigDoc, TextNode } from '../src/model/types'
import { useEditor } from '../src/store'

const letter = (id: string, text: string, x: number, y: number, extra: Partial<TextNode> = {}): TextNode => ({ id, type: 'text', x, y, text, fontSize: 28, fill: '#000', bold: true, align: 'left', rotation: 0, letter: true, ...extra })
const doc = (...nodes: TextNode[]): FigDoc => ({ ...emptyDoc(), nodes })
const texts = (d: FigDoc) => Object.fromEntries(d.nodes.map((n) => [n.id, (n as TextNode).text]))

describe('reading order', () => {
  it('reads row by row from the top, left to right, with letters a little out of line in one row', () => {
    const d = doc(letter('tr', 'A', 400, 12), letter('tl', 'B', 10, 0), letter('bl', 'C', 10, 300), letter('br', 'D', 400, 290))
    expect(readingOrder(d.nodes as TextNode[]).map((n) => n.id)).toEqual(['tl', 'tr', 'bl', 'br'])
    expect(texts(orderLetters(d))).toEqual({ tr: 'B', tl: 'A', bl: 'C', br: 'D' })
  })

  it('leaves the figure as it is when the letters are in order, and leaves other texts alone', () => {
    const d = doc(letter('a', 'A', 0, 0), letter('b', 'B', 100, 0), letter('t', 'X', 50, 500, { letter: undefined }), letter('w', 'Wide panel', 0, 400))
    expect(orderLetters(d)).toBe(d)
  })

  it('keeps lower-case letters lower case', () => {
    expect(texts(orderLetters(doc(letter('a', 'b', 0, 0), letter('b', 'a', 100, 0))))).toEqual({ a: 'a', b: 'b' })
  })

  it('is kept when the figure is saved', () => {
    const d = doc(letter('a', 'A', 0, 0))
    expect((validateDoc(d).nodes[0] as TextNode).letter).toBe(true)
    expect((validateDoc(doc(letter('a', 'A', 0, 0, { letter: undefined }))).nodes[0] as TextNode).letter).toBeUndefined()
  })
})

describe('in the editor', () => {
  beforeEach(() => useEditor.setState({ doc: doc(letter('a', 'A', 0, 0), letter('b', 'B', 300, 0)), past: [], future: [], gestureStart: null }))

  it('renames the letters when one is moved in front of another, and one Undo takes both back', () => {
    useEditor.getState().commit((d) => ({ ...d, nodes: d.nodes.map((n) => (n.id === 'b' && n.type === 'text' ? { ...n, x: -200 } : n)) }))
    expect(texts(useEditor.getState().doc)).toEqual({ a: 'B', b: 'A' })
    useEditor.getState().undo()
    expect(texts(useEditor.getState().doc)).toEqual({ a: 'A', b: 'B' })
  })

  it('renames them at the end of a drag', () => {
    const s = useEditor.getState()
    s.beginGesture()
    s.transient((d) => ({ ...d, nodes: d.nodes.map((n) => (n.id === 'a' && n.type === 'text' ? { ...n, x: 600 } : n)) }))
    useEditor.getState().endGesture()
    expect(texts(useEditor.getState().doc)).toEqual({ a: 'B', b: 'A' })
  })
})
