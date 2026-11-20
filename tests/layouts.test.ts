// What a new slide can begin with: ready-made layouts, and the scientist's own saved templates.

import { beforeEach, describe, expect, it } from 'vitest'
import { newSlide } from '../src/actions'
import { serializeDoc } from '../src/io/files'
import { MAX_TEMPLATES, deleteSlideTemplate, listSlideTemplates, readTemplates, saveSlideTemplate, setDefaultSlideTemplate, writeTemplates } from '../src/io/slideTemplates'
import { addNodes, emptyDoc } from '../src/model/doc'
import { SLIDE_LAYOUTS, layoutNodes, slideFromTemplate, startFromTemplate, templateNodes, templateOf } from '../src/model/layouts'
import { getRect } from '../src/model/nodes'
import { slideCount, slideIndex, slideList, withSlides } from '../src/model/slides'
import type { ConnectorNode, FigDoc, IconNode, ShapeNode, TextNode } from '../src/model/types'
import { useEditor } from '../src/store'
import { stubIcon } from './helpers'

const box = (id: string, x = 0): ShapeNode => ({ id, type: 'shape', shape: 'rect', x, y: 0, w: 50, h: 50, rotation: 0, fill: '#ffffff', stroke: '#000000', strokeWidth: 1 })
const logo = (id: string, iconId: string): IconNode => ({ id, type: 'icon', iconId, x: 1100, y: 20, w: 120, h: 80, rotation: 0 })
const counter = (): (() => string) => {
  let n = 0
  return () => `n${++n}`
}

describe('ready-made layouts', () => {
  it('fit the page they are made for, whatever its size', () => {
    for (const page of [{ width: 1280, height: 720 }, { width: 1200, height: 800 }, { width: 3364, height: 4756 }]) {
      for (const layout of SLIDE_LAYOUTS) {
        const nodes = layoutNodes(layout.id, page, counter())
        expect(nodes.length).toBeGreaterThan(1)
        const doc = { ...emptyDoc(), ...page, nodes }
        for (const node of nodes) {
          const r = getRect(node, doc)
          const where = `${layout.id} on ${page.width} × ${page.height}: ${node.id}`
          expect(r.x, where).toBeGreaterThanOrEqual(0)
          expect(r.x + r.w, where).toBeLessThanOrEqual(page.width)
          expect(r.y, where).toBeGreaterThanOrEqual(0)
        }
        expect(new Set(nodes.map((n) => n.id)).size).toBe(nodes.length)
      }
    }
  })

  it('are made of text boxes to type into, with lettering that follows the height of the page', () => {
    const [title, subtitle] = layoutNodes('title', { width: 1280, height: 720 }, counter()) as TextNode[]
    expect(title).toMatchObject({ type: 'text', align: 'center', bold: true, x: 640, fontSize: 61 })
    expect(title.width).toBe(1280 - 2 * 77)
    expect(subtitle.fontSize).toBe(29)
    const text = layoutNodes('text', { width: 1280, height: 720 }, counter()) as TextNode[]
    expect(text[1]).toMatchObject({ bullets: true, width: 1126 })
    const [, left, right] = layoutNodes('columns', { width: 1280, height: 720 }, counter()) as TextNode[]
    expect(left.width).toBe(right.width)
    expect(right.x).toBeGreaterThan(left.x + left.width!)
    const picture = layoutNodes('picture', { width: 1280, height: 720 }, counter())
    expect(picture[2]).toMatchObject({ type: 'shape', dashed: true })
    // Twice the page, twice the lettering.
    expect((layoutNodes('title', { width: 2560, height: 1440 }, counter())[0] as TextNode).fontSize).toBe(122)
  })
})

describe("a slide saved as a template", () => {
  const figure = (): FigDoc => ({
    ...withSlides({ ...emptyDoc('Lab meeting'), width: 1280, height: 720 }, [{ nodes: [logo('l', 'crest'), box('a')], background: '#f4f1ea', notes: 'Say hello' }, [box('b')]], 0),
    customIcons: { crest: stubIcon('crest'), unused: stubIcon('unused') },
  })

  it('is that one slide: its objects, its page and the icons it places', () => {
    const t = templateOf(figure(), '  Group slide  ')
    expect(t.name).toBe('Group slide')
    expect(t.nodes.map((n) => n.id)).toEqual(['l', 'a'])
    expect([t.width, t.height, t.background]).toEqual([1280, 720, '#f4f1ea'])
    expect(Object.keys(t.customIcons)).toEqual(['crest'])
    expect(t.slides).toBeUndefined()
    expect(t.notes).toBeUndefined()
    expect(templateOf(figure(), '').name).toBe('My slide')
  })

  it('begins a new slide under ids of its own, with its page colour and its icons', () => {
    const t = templateOf(figure(), 'Group slide')
    const other = addNodes({ ...emptyDoc(), width: 1280, height: 720 }, [box('a')])
    const made = slideFromTemplate(other, t)
    expect(slideCount(made)).toBe(2)
    expect(slideIndex(made)).toBe(1)
    expect(made.background).toBe('#f4f1ea')
    expect(made.nodes.map((n) => n.type)).toEqual(['icon', 'shape'])
    expect(made.nodes.some((n) => n.id === 'a' || n.id === 'l')).toBe(false)
    expect((made.nodes[0] as IconNode)).toMatchObject({ x: 1100, y: 20, w: 120 })
    expect(Object.keys(made.customIcons)).toEqual(['crest'])
    // The slide it came after is as it was.
    expect(slideList(made)[0]).toMatchObject({ background: '#ffffff' })
    expect(slideList(made)[0].nodes).toBe(other.nodes)
  })

  it('is fitted to a page of another size as one picture, in the middle', () => {
    const t = templateOf(figure(), 'Group slide')
    // Half the size: everything half as large, text and lines in step.
    const small = templateNodes(t, { width: 640, height: 360 })
    expect(small[0]).toMatchObject({ x: 550, y: 10, w: 60, h: 40 })
    expect((small[1] as ShapeNode).strokeWidth).toBe(0.5)
    // A page of other proportions: as large as fits, with room left over at both sides.
    const tall = templateNodes(t, { width: 1280, height: 1440 })
    expect(tall[0]).toMatchObject({ x: 1100, y: 380, w: 120 })
    // Arrows stay attached to the copies.
    const withArrow: FigDoc = { ...t, nodes: [box('a'), box('b', 200), { id: 'c', type: 'connector', kind: 'arrow', from: { nodeId: 'a', x: 0, y: 0 }, to: { nodeId: 'b', x: 0, y: 0 }, stroke: '#000000', strokeWidth: 2 }] }
    const copies = templateNodes(withArrow, withArrow)
    const line = copies[2] as ConnectorNode
    expect([line.from.nodeId, line.to.nodeId]).toEqual([copies[0].id, copies[1].id])
  })

  it('fills the open slide when that is still empty', () => {
    const t = templateOf(figure(), 'Group slide')
    const empty = { ...emptyDoc(), width: 1280, height: 720 }
    const filled = startFromTemplate(empty, t)
    expect(slideCount(filled)).toBe(1)
    expect(filled.nodes).toHaveLength(2)
    expect(filled.background).toBe('#f4f1ea')
    expect(slideCount(startFromTemplate(addNodes(empty, [box('x')]), t))).toBe(2)
  })
})

describe('templates kept in the browser', () => {
  beforeEach(() => localStorage.clear())
  const slide = (name: string): FigDoc => ({ ...addNodes(emptyDoc(name), [box('a')]), width: 1280, height: 720 })

  it('come back as they were saved, newest first', async () => {
    expect(await listSlideTemplates()).toEqual([])
    await saveSlideTemplate(slide('First'))
    const list = await saveSlideTemplate(slide('Second'))
    expect(list!.map((t) => t.name)).toEqual(['Second', 'First'])
    const again = await listSlideTemplates()
    expect(again.map((t) => t.name)).toEqual(['Second', 'First'])
    expect(again[1].doc).toEqual(slide('First'))
    expect(again.every((t) => !t.isDefault)).toBe(true)
  })

  it('have at most one that begins every new slide', async () => {
    await saveSlideTemplate(slide('First'))
    const [second, first] = (await saveSlideTemplate(slide('Second')))!
    expect((await setDefaultSlideTemplate(first.id))!.map((t) => t.isDefault)).toEqual([false, true])
    expect((await setDefaultSlideTemplate(second.id))!.map((t) => t.isDefault)).toEqual([true, false])
    expect((await setDefaultSlideTemplate(null))!.some((t) => t.isDefault)).toBe(false)
    expect((await deleteSlideTemplate(second.id))!.map((t) => t.name)).toEqual(['First'])
  })

  it('are read back as untrusted data', () => {
    const good = { id: 'abc', isDefault: true, doc: serializeDoc(slide('Good')) }
    const list = readTemplates(JSON.stringify([good, { ...good, id: 'def' }, { id: 'bad id!', doc: good.doc }, { id: 'x', doc: '{not json' }, { id: 'y', doc: 12 }, null, 'text', { id: 'z', doc: JSON.stringify({ nodes: 'none' }) }]))
    expect(list.map((t) => t.id)).toEqual(['abc', 'def'])
    // Only the first of two that claim to begin every new slide does.
    expect(list.map((t) => t.isDefault)).toEqual([true, false])
    expect(readTemplates('not json')).toEqual([])
    expect(readTemplates(JSON.stringify({ id: 'a' }))).toEqual([])
    expect(readTemplates(null)).toEqual([])
    // A stored figure with several slides or notes is one slide as a template.
    const deck = withSlides({ ...slide('Deck'), notes: 'private' }, [[box('a')], [box('b')]], 0)
    const [one] = readTemplates(JSON.stringify([{ id: 'd', doc: serializeDoc({ ...deck, notes: 'private' }) }]))
    expect(one.doc.slides).toBeUndefined()
    expect(one.doc.notes).toBeUndefined()
    expect(readTemplates(writeTemplates(list))).toEqual(list)
    expect(readTemplates(JSON.stringify(Array.from({ length: MAX_TEMPLATES + 5 }, (_, i) => ({ ...good, id: `t${i}` })))).length).toBe(MAX_TEMPLATES)
  })
})

describe('a new slide in the editor', () => {
  const E = () => useEditor.getState()
  beforeEach(() => {
    E().loadDoc({ ...addNodes(emptyDoc(), [box('a')]), width: 1280, height: 720 })
  })

  it('begins with a layout or with a template, as one step for Undo', () => {
    newSlide('columns')
    expect(slideCount(E().doc)).toBe(2)
    expect(E().doc.nodes.map((n) => n.type)).toEqual(['text', 'text', 'text'])
    const template = templateOf({ ...addNodes(emptyDoc(), [box('logo', 1000)]), width: 1280, height: 720, background: '#eeeeee' }, 'Mine')
    newSlide(template)
    expect(slideCount(E().doc)).toBe(3)
    expect(E().doc.background).toBe('#eeeeee')
    expect((E().doc.nodes[0] as ShapeNode).x).toBe(1000)
    newSlide()
    expect(E().doc.nodes).toEqual([])
    expect(E().past).toHaveLength(3)
    E().undo()
    E().undo()
    E().undo()
    expect(slideCount(E().doc)).toBe(1)
  })
})
