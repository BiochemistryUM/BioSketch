import { describe, expect, it } from 'vitest'
import { emptyDoc } from '../src/model/doc'
import { journalCheck } from '../src/model/journalCheck'
import type { FigDoc, FigNode, ImageNode, ShapeNode, TextNode } from '../src/model/types'

const text = (id: string, fontSize: number, extra: Partial<TextNode> = {}): TextNode => ({ id, type: 'text', x: 10, y: 10, text: 'Label', fontSize, fill: '#000', align: 'left', rotation: 0, ...extra })
const box = (id: string, strokeWidth: number): ShapeNode => ({ id, type: 'shape', shape: 'rect', x: 0, y: 0, w: 100, h: 50, rotation: 0, fill: '#fff', stroke: '#000', strokeWidth }) as ShapeNode
const picture = (id: string, w: number, extra: Partial<ImageNode> = {}): ImageNode => ({ id, type: 'image', src: 'data:image/png;base64,', x: 0, y: 0, w, h: w, rotation: 0, ...extra })

// 1,000 units printed at 89 mm: one unit is 0.089 mm, so 10 units are 2.52 pt.
const figure = (nodes: FigNode[], extra: Partial<FigDoc> = {}): FigDoc => ({ ...emptyDoc(), width: 1000, height: 600, widthMm: 89, nodes, ...extra })

describe('journal check', () => {
  it('says there is nothing to measure without a printed width', () => {
    const items = journalCheck(figure([text('a', 4)], { widthMm: undefined }), {})
    expect(items).toHaveLength(1)
    expect(items[0].level).toBe('info')
  })

  it('reports the smallest text in points and names its objects', () => {
    const items = journalCheck(figure([text('a', 30), text('b', 18), text('c', 18)]), {})
    const t = items.find((i) => i.text.startsWith('The smallest text'))!
    // 18 units × 0.089 mm × 72 / 25.4 = 4.54 pt
    expect(t.level).toBe('problem')
    expect(t.text).toContain('4.5 pt')
    expect(t.ids).toEqual(['b', 'c'])
    expect(journalCheck(figure([text('a', 22)]), {})[0].level).toBe('warn') // 5.55 pt
    expect(journalCheck(figure([text('a', 30)]), {})[0].level).toBe('ok') // 7.57 pt
  })

  it('leaves out hidden objects, guides and empty texts', () => {
    const items = journalCheck(figure([text('a', 30), text('b', 4, { hidden: true }), text('c', 4, { guide: true }), text('d', 4, { text: ' ' })]), {})
    expect(items[0].level).toBe('ok')
  })

  it('takes every slide', () => {
    const doc = figure([text('a', 30)], { slides: { before: [], after: [{ nodes: [text('b', 10)], background: '#ffffff' }] } })
    expect(journalCheck(doc, {})[0].ids).toEqual(['b'])
  })

  it('reports lines too thin to print', () => {
    // 0.5 units = 0.126 pt; 2 units = 0.5 pt
    const items = journalCheck(figure([box('a', 0.5), box('b', 2), { ...box('c', 0.1), stroke: 'none' }]), {})
    const l = items.find((i) => i.text.startsWith('The thinnest line'))!
    expect(l.level).toBe('problem')
    expect(l.ids).toEqual(['a'])
    expect(journalCheck(figure([box('b', 2)]), {})[0].level).toBe('ok')
  })

  it('works out the resolution of pictures at their printed size, cropped or not', () => {
    // 500 units = 44.5 mm = 1.752 in; 1,000 px over it = 571 dpi
    expect(journalCheck(figure([picture('p', 500)]), { p: 1000 })[0].level).toBe('ok')
    // cropped to a quarter of its width: 250 px over 1.752 in = 143 dpi
    const cropped = journalCheck(figure([picture('p', 500, { crop: { x: 0, y: 0, w: 0.25, h: 1 } })]), { p: 1000 })[0]
    expect(cropped.level).toBe('problem')
    expect(cropped.text).toContain('143 dots per inch')
    // 400 px = 228 dpi
    expect(journalCheck(figure([picture('p', 500)]), { p: 400 })[0].level).toBe('warn')
    // not loaded yet
    expect(journalCheck(figure([picture('p', 500)]), {})[0].level).toBe('info')
  })
})
