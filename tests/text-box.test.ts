// Text boxes: a text that breaks its lines at a width, with bullet points if wanted.

import { describe, expect, it } from 'vitest'
import { parseDoc, serializeDoc, validateDoc } from '../src/io/files'
import { addNodes, emptyDoc, scaleAsPicture } from '../src/model/doc'
import { TEXT_WIDTH_MIN, bulletIndent, dragHandle, getBox, getRect, measureText, realignText, resizeNode, textBoxed, textBulleted, textLayout } from '../src/model/nodes'
import { LINE_HEIGHT, type TextNode } from '../src/model/types'

// In the tests a character is 0.55 of the font size wide (0.6 in bold): 11 units at size 20.
const label = (text: string, extra: Partial<TextNode> = {}): TextNode => ({ id: 't', type: 'text', x: 100, y: 50, text, fontSize: 20, fill: '#000000', align: 'left', rotation: 0, ...extra })
const LONG = 'one two three four five six seven eight'

describe('a label', () => {
  it('is as wide as its words and breaks only where Enter was pressed', () => {
    const laid = textLayout(label(`${LONG}\nnine`))
    expect(laid.lines.map((l) => l.text)).toEqual([LONG, 'nine'])
    expect(laid.w).toBeCloseTo(LONG.length * 11, 6)
    expect(laid.h).toBeCloseTo(2 * 20 * LINE_HEIGHT, 6)
    expect(laid.left).toBe(100)
    expect(laid.anchor).toBe('start')
    expect(laid.lines.every((l) => l.x === 100 && l.bullet === undefined)).toBe(true)
    // Measured exactly as before text boxes existed.
    expect(measureText(label(`${LONG}\nnine`))).toEqual({ w: laid.w, h: laid.h })
  })
})

describe('a text box', () => {
  it('breaks its lines at its width and is exactly that wide', () => {
    const box = label(LONG, { width: 150 })
    const laid = textLayout(box)
    // 150 units hold 13 characters.
    expect(laid.lines.map((l) => l.text)).toEqual(['one two three', 'four five six', 'seven eight'])
    expect(laid.w).toBe(150)
    expect(laid.h).toBeCloseTo(3 * 20 * LINE_HEIGHT, 6)
    expect(getRect(box, emptyDoc())).toMatchObject({ x: 100, y: 50, w: 150 })
    expect(measureText(box)).toEqual({ w: 150, h: laid.h })
  })

  it('keeps the breaks that were typed, and never splits a word', () => {
    const laid = textLayout(label('one two\nthree\n\nextraordinarily long', { width: 100 }))
    expect(laid.lines.map((l) => l.text)).toEqual(['one two', 'three', '', 'extraordinarily', 'long'])
  })

  it('stands at the left, the middle or the right of where it is anchored', () => {
    expect(textLayout(label(LONG, { width: 150, align: 'center' }))).toMatchObject({ left: 25, anchor: 'middle' })
    expect(textLayout(label(LONG, { width: 150, align: 'right' }))).toMatchObject({ left: -50, anchor: 'end' })
    // Aligned another way it stays where it stood: only the edge it is measured from changes.
    const right = realignText(label(LONG, { width: 150 }), 'right')
    expect(right).toMatchObject({ align: 'right', x: 250 })
    expect(textLayout(right).left).toBe(100)
    expect(realignText(right, 'center')).toMatchObject({ align: 'center', x: 175 })
  })

  it('is made from a label as wide as the label is, and turned back into one', () => {
    const made = textBoxed(label('A fairly long title for a slide', { align: 'center' }), true)
    expect(made.width).toBe(Math.round(31 * 11))
    expect(textLayout(made).left).toBeCloseTo(textLayout(label('A fairly long title for a slide', { align: 'center' })).left, 0)
    // A short label gets room for a few words.
    expect(textBoxed(label('Hi'), true).width).toBe(160)
    expect(textBoxed(made, true)).toBe(made)
    expect(textBoxed(made, false).width).toBeUndefined()
    expect('width' in textBoxed(made, false)).toBe(false)
  })

  it('gets wider or narrower at its sides without its lettering changing', () => {
    const box = label(LONG, { width: 150 })
    const doc = addNodes(emptyDoc(), [box])
    const old = getBox(box, doc)
    // The handle at the right side, pulled 100 to the right.
    const wider = resizeNode(box, old, dragHandle(old, 1, 0, { x: 350, y: 80 }, false)) as TextNode
    expect(wider).toMatchObject({ width: 250, fontSize: 20, x: 100, y: 50 })
    expect(textLayout(wider).lines).toHaveLength(2)
    // The handle at the left side moves the left edge; a box anchored at its right keeps that edge.
    const fromLeft = resizeNode(box, old, dragHandle(old, -1, 0, { x: 50, y: 80 }, false)) as TextNode
    expect(fromLeft).toMatchObject({ width: 200, x: 50, fontSize: 20 })
    const anchoredRight = realignText(box, 'right')
    expect(resizeNode(anchoredRight, old, dragHandle(old, -1, 0, { x: 50, y: 80 }, false))).toMatchObject({ width: 200, x: 250 })
    // Never narrower than the least.
    expect((resizeNode(box, old, { ...old, w: 3 }) as TextNode).width).toBe(TEXT_WIDTH_MIN)
  })

  it('grows with its lettering at a corner, and when resized as a picture', () => {
    const box = label(LONG, { width: 150 })
    const doc = addNodes(emptyDoc(), [box])
    const old = getBox(box, doc)
    const twice = resizeNode(box, old, { ...old, w: old.w * 2, h: old.h * 2 }) as TextNode
    expect(twice).toMatchObject({ width: 300, fontSize: 40 })
    expect(textLayout(twice).lines.map((l) => l.text)).toEqual(textLayout(box).lines.map((l) => l.text))
    const half = scaleAsPicture(doc, ['t'], 0.5, { x: 0, y: 0 }).nodes[0] as TextNode
    expect(half).toMatchObject({ width: 75, fontSize: 10, x: 50, y: 25 })
  })

  it('survives a figure file, with a width of a sensible size', () => {
    const doc = addNodes(emptyDoc(), [label(LONG, { width: 150, bullets: true }), label('plain', { id: 'u' })])
    expect(parseDoc(serializeDoc(doc))).toEqual(doc)
    const read = validateDoc({ ...emptyDoc(), nodes: [label('a', { width: 5 }), label('b', { id: 'b', width: -4 }), label('c', { id: 'c', width: 9e9 }), { ...label('d', { id: 'd' }), width: 'wide', bullets: 'yes' }] })
    expect(read.nodes.map((n) => (n as TextNode).width)).toEqual([20, undefined, 20000, undefined])
    expect((read.nodes[3] as TextNode).bullets).toBeUndefined()
  })
})

describe('bullet points', () => {
  it('put a bullet before every paragraph and set its further lines in under its first', () => {
    const indent = bulletIndent(20)
    expect(indent).toBe(22)
    // 172 units less the indent hold 13 characters.
    const laid = textLayout(label(`${LONG}\n\nnine`, { width: 150 + indent, bullets: true }))
    expect(laid.lines.map((l) => l.text)).toEqual(['one two three', 'four five six', 'seven eight', '', 'nine'])
    expect(laid.lines.map((l) => l.bullet !== undefined)).toEqual([true, false, false, false, true])
    expect(laid.lines.every((l) => l.x === 100 + indent)).toBe(true)
    expect(laid.lines[0].bullet).toBe(104)
    expect(laid.w).toBe(150 + indent)
  })

  it('work in a label too, which is then wider by the room for the bullet', () => {
    const laid = textLayout(label('one\ntwo three', { bullets: true }))
    expect(laid.w).toBeCloseTo(9 * 11 + 22, 6)
    expect(laid.lines.map((l) => l.bullet !== undefined)).toEqual([true, true])
  })

  it('always start at the left of the box', () => {
    const centred = label(LONG, { width: 200, align: 'center' })
    const on = textBulleted(centred, true)
    expect(on).toMatchObject({ bullets: true, align: 'left', x: 0 })
    expect(textLayout(on)).toMatchObject({ left: 0, anchor: 'start' })
    const off = textBulleted(on, false)
    expect(off.bullets).toBeUndefined()
    expect('bullets' in off).toBe(false)
  })
})
