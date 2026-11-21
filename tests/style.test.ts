// Copy style and Paste style (src/model/style.ts): what each kind of object gives and takes.

import { describe, expect, it } from 'vitest'
import { validateDoc } from '../src/io/files'
import { emptyDoc } from '../src/model/doc'
import { applyStyle, styleOf, styleWords } from '../src/model/style'
import type { ConnectorNode, FigNode, IconNode, ShapeNode, StrokeNode, TextNode } from '../src/model/types'

const shape: ShapeNode = { id: 's', type: 'shape', shape: 'roundrect', x: 0, y: 0, w: 120, h: 40, rotation: 0, fill: '#ffeedd', stroke: '#aa3311', strokeWidth: 3, dashed: true, dashStyle: 'dotted', label: { text: 'Kinase', fontSize: 14, fill: '#222222', bold: true } }
const text: TextNode = { id: 't', type: 'text', x: 0, y: 0, text: 'Note', fontSize: 20, fill: '#0000ff', italic: true, align: 'left', rotation: 0, opacity: 0.5 }
const arrow: ConnectorNode = { id: 'c', type: 'connector', from: { x: 0, y: 0 }, to: { x: 50, y: 0 }, kind: 'inhibit', stroke: '#000000', strokeWidth: 1.5 }
const reopened = (n: FigNode) => validateDoc({ ...emptyDoc(), nodes: [n] }).nodes[0]

describe('styles', () => {
  it('gives the outline of a shape to an arrow, and its lettering to a label, leaving words and places alone', () => {
    const a = applyStyle(arrow, styleOf(shape)) as ConnectorNode
    expect(a).toMatchObject({ stroke: '#aa3311', strokeWidth: 3, dashed: true, dashStyle: 'dotted', kind: 'inhibit', from: arrow.from })
    const t = applyStyle(text, styleOf(shape)) as TextNode
    expect(t).toMatchObject({ text: 'Note', fontSize: 14, fill: '#222222', bold: true })
    expect(t.italic).toBeUndefined()
    // The shape had no transparency, so the label loses its own.
    expect(t.opacity).toBeUndefined()
    expect(reopened(t)).toEqual(t)
  })

  it('gives a label’s lettering to the words inside a shape, which grows when they need more room', () => {
    const big = applyStyle({ ...shape, w: 60, label: { text: 'Mitochondrial outer membrane', fontSize: 10, fill: '#000' } }, { font: { size: 24, colour: '#123456' } }) as ShapeNode
    expect(big.label).toMatchObject({ fontSize: 24, fill: '#123456' })
    expect(big.h).toBeGreaterThan(40)
    // A shape without words takes its fill and outline, not the lettering.
    const plain = applyStyle({ ...shape, label: undefined }, styleOf(text)) as ShapeNode
    expect(plain.label).toBeUndefined()
    expect(plain.opacity).toBe(0.5)
  })

  it('gives an arrow its ends and its fade, and a pen stroke only the colour of a line', () => {
    const fading: ConnectorNode = { ...arrow, kind: 'arrow', startMark: 'dot', fade: 'in', stroke: '#ff0000' }
    expect(applyStyle(arrow, styleOf(fading))).toMatchObject({ kind: 'arrow', startMark: 'dot', fade: 'in', stroke: '#ff0000' })
    const pen: StrokeNode = { id: 'p', type: 'stroke', points: [[0, 0, 0.5]], color: '#000000', size: 4 }
    expect(applyStyle(pen, styleOf(fading))).toMatchObject({ color: '#ff0000', size: 4 })
  })

  it('recolours another use of the same icon only, and leaves the object as it is when nothing fits', () => {
    const icon: IconNode = { id: 'i', type: 'icon', iconId: 'nih--cell', x: 0, y: 0, w: 50, h: 50, rotation: 0, colors: { '#ff0000': '#00ff00' } }
    expect((applyStyle({ ...icon, id: 'j', colors: undefined }, styleOf(icon)) as IconNode).colors).toEqual(icon.colors)
    expect((applyStyle({ ...icon, iconId: 'nih--other', colors: undefined }, styleOf(icon)) as IconNode).colors).toBeUndefined()
    const same = { ...text, opacity: undefined }
    expect(applyStyle(same, { line: { colour: '#000', width: 1 } })).toBe(same)
  })

  it('says what was copied', () => {
    expect(styleWords(styleOf(shape))).toBe('fill, line and lettering')
    expect(styleWords(styleOf(text))).toBe('lettering and transparency')
  })
})
