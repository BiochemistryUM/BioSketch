// Several slides in one figure: the open slide is the figure as everything else knows it, the
// others wait beside it. Opening, adding, copying, moving and deleting slides, files with slides,
// what belongs to the whole figure (page, icons), and the exports of all slides together.

import { beforeEach, describe, expect, it } from 'vitest'
import { copySlide, deleteSlide, moveSlideTo, newSlide, openSlide, removeCustomIcon, resizeAsPicture, stepSlide } from '../src/actions'
import { missingIconsNote } from '../src/icons/library'
import { dropUnusedParts } from '../src/icons/reshape'
import { forSlides, printPage, printPages, renderSvg, slideFileName } from '../src/io/export'
import { parseDoc, serializeDoc, validateDoc } from '../src/io/files'
import { buildDeck, deckParts, pptxParts, SLIDE, slideLike } from '../src/io/pptx'
import { listFigures, saveFigure } from '../src/io/storage'
import { addNodes, emptyDoc, scaleFigure } from '../src/model/doc'
import {
  MAX_SLIDES,
  addSlide,
  dropPlace,
  duplicateSlide,
  everyNode,
  mapSlides,
  moveSlide,
  removeSlide,
  showSlide,
  slideCount,
  slideDoc,
  slideDocs,
  slideIndex,
  slideNodes,
  uniqueIds,
  withSlides,
} from '../src/model/slides'
import type { ConnectorNode, FigDoc, FigNode, IconNode, ShapeNode, TextNode } from '../src/model/types'
import { useEditor } from '../src/store'
import { presentKey, presentPress } from '../src/ui/Presenter'
import { keepThumbs, thumbNow, thumbStamp } from '../src/ui/slideThumbs'
import { stubIcon } from './helpers'

const box = (id: string, x = 0): ShapeNode => ({ id, type: 'shape', shape: 'rect', x, y: 0, w: 50, h: 50, rotation: 0, fill: '#ffffff', stroke: '#000000', strokeWidth: 1 })
const word = (id: string, text: string): TextNode => ({ id, type: 'text', x: 10, y: 10, text, fontSize: 20, fill: '#1f2933', align: 'left', rotation: 0 })
const arrow = (id: string, from: string, to: string): ConnectorNode => ({
  id,
  type: 'connector',
  kind: 'arrow',
  from: { nodeId: from, x: 50, y: 25 },
  to: { nodeId: to, x: 200, y: 25 },
  stroke: '#334155',
  strokeWidth: 2,
})
const placed = (id: string, iconId: string): IconNode => ({ id, type: 'icon', iconId, x: 0, y: 0, w: 40, h: 40, rotation: 0 })

/** A figure of three slides: a box, two boxes with an arrow, a word. The first is open. */
const deck = (): FigDoc => withSlides(emptyDoc('Deck'), [[box('a')], [box('b'), box('c', 200), arrow('bc', 'b', 'c')], [word('w', 'End')]], 0)
const ids = (doc: FigDoc): string[][] => slideNodes(doc).map((nodes) => nodes.map((n) => n.id))

describe('a figure with several slides', () => {
  it('has one slide when nothing else is said, and that slide is the figure', () => {
    const one = addNodes(emptyDoc(), [box('a')])
    expect(slideCount(one)).toBe(1)
    expect(slideIndex(one)).toBe(0)
    expect(slideNodes(one)).toEqual([one.nodes])
    expect(everyNode(one)).toBe(one.nodes)
    expect(slideDoc(one, 0)).toEqual(one)
    // A figure of one slide carries no word about slides, so files of before and after look alike.
    expect('slides' in withSlides(deck(), [[box('a')]])).toBe(false)
    expect(serializeDoc(withSlides(one, [one.nodes]))).toBe(serializeDoc(one))
  })

  it('keeps the slides in order, with the open one as the objects of the figure', () => {
    const doc = deck()
    expect(slideCount(doc)).toBe(3)
    expect(slideIndex(doc)).toBe(0)
    expect(doc.nodes.map((n) => n.id)).toEqual(['a'])
    expect(ids(doc)).toEqual([['a'], ['b', 'c', 'bc'], ['w']])
    expect(everyNode(doc).map((n) => n.id)).toEqual(['a', 'b', 'c', 'bc', 'w'])
  })

  it('opens another slide by swapping the objects over, and loses nothing on the way', () => {
    const second = showSlide(deck(), 1)
    expect(slideIndex(second)).toBe(1)
    expect(second.nodes.map((n) => n.id)).toEqual(['b', 'c', 'bc'])
    expect(ids(second)).toEqual(ids(deck()))
    // The lists of objects are handed over as they are: a slide that is not worked on is not copied.
    const doc = deck()
    expect(showSlide(doc, 2).slides!.before[0].nodes).toBe(doc.nodes)
    // A place that does not exist leads to the nearest slide; the open one is the same figure.
    expect(slideIndex(showSlide(doc, 99))).toBe(2)
    expect(slideIndex(showSlide(doc, -3))).toBe(0)
    expect(showSlide(doc, 0)).toBe(doc)
    expect(showSlide(showSlide(doc, 2), 0)).toEqual(doc)
  })

  it('shows one slide as a figure of its own, with the page and icons of the whole', () => {
    const doc = { ...deck(), width: 1280, height: 720, background: '#101010', customIcons: { cell: stubIcon('cell') } }
    const third = slideDoc(doc, 2)
    expect(third.nodes.map((n) => n.id)).toEqual(['w'])
    expect(third.slides).toBeUndefined()
    expect([third.width, third.height, third.background]).toEqual([1280, 720, '#101010'])
    expect(third.customIcons).toBe(doc.customIcons)
    expect(slideDocs(doc).map((d) => d.nodes.length)).toEqual([1, 3, 1])
    expect(slideDocs(doc).every((d) => d.slides === undefined)).toBe(true)
  })

  it('adds an empty slide after the open one and opens it', () => {
    const doc = addSlide(showSlide(deck(), 1))
    expect(slideCount(doc)).toBe(4)
    expect(slideIndex(doc)).toBe(2)
    expect(doc.nodes).toEqual([])
    expect(ids(doc)).toEqual([['a'], ['b', 'c', 'bc'], [], ['w']])
    // From a figure of one slide too.
    const two = addSlide(addNodes(emptyDoc(), [box('a')]))
    expect(ids(two)).toEqual([['a'], []])
    expect(slideIndex(two)).toBe(1)
  })

  it('copies the open slide under ids of its own, with arrows attached to the copies', () => {
    const doc = duplicateSlide(showSlide(deck(), 1))
    expect(slideCount(doc)).toBe(4)
    expect(slideIndex(doc)).toBe(2)
    const [, original, copy] = slideNodes(doc)
    expect(copy.map((n) => n.type)).toEqual(original.map((n) => n.type))
    expect(copy.some((n) => original.some((o) => o.id === n.id))).toBe(false)
    const line = copy[2] as ConnectorNode
    expect([line.from.nodeId, line.to.nodeId]).toEqual([copy[0].id, copy[1].id])
    // No id twice in the whole figure.
    const all = everyNode(doc).map((n) => n.id)
    expect(new Set(all).size).toBe(all.length)
  })

  it('deletes the open slide and opens the next, or the one before the last', () => {
    expect(ids(removeSlide(deck()))).toEqual([['b', 'c', 'bc'], ['w']])
    expect(slideIndex(removeSlide(deck()))).toBe(0)
    const last = removeSlide(showSlide(deck(), 2))
    expect(ids(last)).toEqual([['a'], ['b', 'c', 'bc']])
    expect(slideIndex(last)).toBe(1)
    // A figure keeps one slide, and then says nothing about slides any more.
    const one = removeSlide(removeSlide(deck()))
    expect(slideCount(one)).toBe(1)
    expect(one.slides).toBeUndefined()
    expect(removeSlide(one)).toBe(one)
  })

  it('moves a slide to another place and keeps the open slide open', () => {
    const doc = showSlide(deck(), 1)
    const front = moveSlide(doc, 2, 0)
    expect(ids(front)).toEqual([['w'], ['a'], ['b', 'c', 'bc']])
    expect(front.nodes.map((n) => n.id)).toEqual(['b', 'c', 'bc'])
    const own = moveSlide(doc, 1, 2)
    expect(ids(own)).toEqual([['a'], ['w'], ['b', 'c', 'bc']])
    expect(slideIndex(own)).toBe(2)
    const back = moveSlide(doc, 0, 2)
    expect(ids(back)).toEqual([['b', 'c', 'bc'], ['w'], ['a']])
    expect(slideIndex(back)).toBe(0)
    expect(moveSlide(doc, 1, 1)).toBe(doc)
    expect(moveSlide(doc, 7, 0)).toBe(doc)
    expect(ids(moveSlide(doc, 0, 99))).toEqual([['b', 'c', 'bc'], ['w'], ['a']])
  })

  it('says where a dragged slide lands from the gap it is dropped into', () => {
    // Three slides have four gaps: before the first, between them, after the last.
    expect([0, 1, 2, 3].map((gap) => dropPlace(0, gap))).toEqual([0, 0, 1, 2])
    expect([0, 1, 2, 3].map((gap) => dropPlace(2, gap))).toEqual([0, 1, 2, 2])
    expect([0, 1, 2, 3].map((gap) => dropPlace(1, gap))).toEqual([0, 1, 1, 2])
  })

  it('stops at the most slides a figure holds', () => {
    const full = withSlides(emptyDoc(), Array.from({ length: MAX_SLIDES }, () => []), 0)
    expect(addSlide(full)).toBe(full)
    expect(duplicateSlide(full)).toBe(full)
  })

  it('passes every slide through a change', () => {
    const doc = mapSlides(showSlide(deck(), 1), (nodes) => nodes.filter((n) => n.type !== 'connector'))
    expect(ids(doc)).toEqual([['a'], ['b', 'c'], ['w']])
    expect(slideIndex(doc)).toBe(1)
  })
})

describe('ids across slides', () => {
  it('gives an object another id when an earlier slide has it, and its arrows follow', () => {
    const [first, second] = uniqueIds([[box('a'), box('b')], [box('a'), box('b', 200), arrow('line', 'a', 'b'), box('a_2', 400)]])
    expect(first.map((n) => n.id)).toEqual(['a', 'b'])
    expect(second.map((n) => n.id)).toEqual(['a_3', 'b_2', 'line', 'a_2'])
    const line = second[2] as ConnectorNode
    expect([line.from.nodeId, line.to.nodeId]).toEqual(['a_3', 'b_2'])
  })

  it('leaves slides alone that share nothing, and keeps ids within their length', () => {
    const slides = [[box('a')], [box('b')]]
    const out = uniqueIds(slides)
    expect(out[0]).toBe(slides[0])
    expect(out[1]).toBe(slides[1])
    const long = 'x'.repeat(64)
    const [, renamed] = uniqueIds([[box(long)], [box(long)]])
    expect(renamed[0].id).toMatch(/^[\w-]{1,64}$/)
    expect(renamed[0].id).not.toBe(long)
  })
})

describe('figure files with slides', () => {
  it('come back as they were saved, whichever slide was open', () => {
    for (const open of [0, 1, 2]) {
      const doc = showSlide(deck(), open)
      expect(parseDoc(serializeDoc(doc))).toEqual(doc)
    }
  })

  it('open as before when they hold one slide', () => {
    const one = addNodes(emptyDoc('Old'), [box('a')])
    const read = parseDoc(serializeDoc(one))
    expect(read).toEqual(one)
    expect(read.slides).toBeUndefined()
  })

  it('rebuild every object of every slide, and pass over what is not a slide', () => {
    const read = validateDoc({
      ...emptyDoc(),
      nodes: [box('a')],
      slides: {
        before: [{ nodes: [{ ...box('b'), onload: 'x', fill: 'javascript:1' }, { type: 'nonsense', id: 'n' }] }, 'not a slide', { nodes: 'none' }],
        after: [{ nodes: [box('c'), box('c')] }, null],
        other: [{ nodes: [box('z')] }],
      },
    })
    expect(ids(read)).toEqual([['b'], ['a'], ['c']])
    expect(slideIndex(read)).toBe(1)
    const b = read.slides!.before[0].nodes[0] as ShapeNode & { onload?: string }
    expect(b.onload).toBeUndefined()
    expect(b.fill).not.toContain('javascript')
    expect(Object.keys(read.slides!)).toEqual(['before', 'after'])
  })

  it('never hold an id twice, so that the slides can be drawn into one document', () => {
    const read = validateDoc({ ...emptyDoc(), nodes: [word('title', 'Two')], slides: { before: [{ nodes: [word('title', 'One')] }], after: [{ nodes: [word('title', 'Three')] }] } })
    const all = everyNode(read)
    expect(all.map((n) => (n as TextNode).text)).toEqual(['One', 'Two', 'Three'])
    expect(new Set(all.map((n) => n.id)).size).toBe(3)
    // The slide that comes first keeps the id.
    expect(all[0].id).toBe('title')
  })

  it('hold no more slides than a figure can', () => {
    const many = Array.from({ length: MAX_SLIDES + 20 }, () => ({ nodes: [] }))
    expect(slideCount(validateDoc({ ...emptyDoc(), nodes: [], slides: { before: many, after: many } }))).toBe(MAX_SLIDES)
  })

  it('are listed with their slides and all their objects', async () => {
    localStorage.clear()
    await saveFigure('deck', deck())
    await saveFigure('one', addNodes(emptyDoc('One'), [box('a')]))
    const list = await listFigures()
    expect(list.find((m) => m.id === 'deck')).toMatchObject({ slides: 3, objects: 5 })
    expect(list.find((m) => m.id === 'one')).toMatchObject({ slides: 1, objects: 1 })
  })
})

describe('what belongs to the whole figure', () => {
  it('resizes every slide with the page', () => {
    const doc = scaleFigure(showSlide(deck(), 1), 2)
    expect([doc.width, doc.height]).toEqual([2400, 1600])
    const [first, second] = slideNodes(doc)
    expect((first[0] as ShapeNode).w).toBe(100)
    expect((second[1] as ShapeNode).x).toBe(400)
    expect((first[0] as ShapeNode).strokeWidth).toBe(2)
    expect(slideIndex(doc)).toBe(1)
  })

  it('keeps the piece of an icon that only another slide uses', () => {
    const part = { ...stubIcon('part-1'), category: 'Part' }
    const loose = { ...stubIcon('part-2'), category: 'Part' }
    const doc = { ...withSlides(emptyDoc(), [[box('a')], [placed('i', 'part-1')]], 0), customIcons: { 'part-1': part, 'part-2': loose } }
    expect(Object.keys(dropUnusedParts(doc).customIcons)).toEqual(['part-1'])
  })

  it('counts missing icons on every slide', () => {
    const doc = withSlides(emptyDoc(), [[placed('i', 'gone')], [placed('j', 'gone-too')]], 1)
    expect(missingIconsNote(doc)).toMatch(/^2 icons of this figure/)
    expect(missingIconsNote(deck())).toBeNull()
  })
})

describe('slides in the editor', () => {
  const E = () => useEditor.getState()
  beforeEach(() => {
    E().loadDoc(deck())
    E().set({ canvasSize: { w: 800, h: 600 }, view: { x: 0, y: 0, zoom: 1 }, selection: [], slidesShown: false, toast: null })
  })

  it('opens a slide without a step for Undo, and lets go of the selection', () => {
    E().set({ selection: ['a'] })
    openSlide(1)
    expect(slideIndex(E().doc)).toBe(1)
    expect(E().selection).toEqual([])
    expect(E().past).toHaveLength(0)
    expect(stepSlide(1)).toBe(true)
    expect(stepSlide(1)).toBe(false)
    expect(slideIndex(E().doc)).toBe(2)
    expect(stepSlide(-1)).toBe(true)
    expect(slideIndex(E().doc)).toBe(1)
  })

  it('takes back a change on the slide it was made on', () => {
    E().commit((d) => addNodes(d, [box('new')]))
    openSlide(2)
    E().undo()
    expect(slideIndex(E().doc)).toBe(0)
    expect(E().doc.nodes.map((n) => n.id)).toEqual(['a'])
    E().redo()
    expect(ids(E().doc)[0]).toEqual(['a', 'new'])
  })

  it('adds, copies, moves and deletes slides, each as one step for Undo', () => {
    newSlide()
    expect(slideCount(E().doc)).toBe(4)
    expect(slideIndex(E().doc)).toBe(1)
    expect(E().slidesShown).toBe(true)
    copySlide()
    expect(slideCount(E().doc)).toBe(5)
    moveSlideTo(4, 0)
    expect(ids(E().doc)[0]).toEqual(['w'])
    deleteSlide()
    expect(slideCount(E().doc)).toBe(4)
    expect(E().toast).toMatch(/Undo brings it back/)
    expect(E().past).toHaveLength(4)
    for (let i = 0; i < 4; i++) E().undo()
    expect(E().doc).toEqual(deck())
  })

  it('does not delete the only slide', () => {
    E().loadDoc(addNodes(emptyDoc(), [box('a')]))
    deleteSlide()
    expect(E().doc.nodes).toHaveLength(1)
    expect(E().past).toHaveLength(0)
  })

  it('resizes all slides together from the page settings', () => {
    resizeAsPicture(0.5)
    expect(E().doc.width).toBe(600)
    expect((slideNodes(E().doc)[1][1] as ShapeNode).x).toBe(100)
  })

  it('takes an icon away from every slide when it is deleted from the figure', () => {
    const icon = stubIcon('cell')
    E().loadDoc({ ...withSlides(emptyDoc(), [[placed('i', 'cell'), box('a')], [placed('j', 'cell'), box('b', 200), arrow('line', 'j', 'b')]], 0), customIcons: { cell: icon } })
    removeCustomIcon('cell')
    expect(ids(E().doc)).toEqual([['a'], ['b', 'line']])
    expect(E().doc.customIcons).toEqual({})
    // The arrow that was attached to the icon stays where it was, with a free end.
    expect((slideNodes(E().doc)[1][1] as ConnectorNode).from.nodeId).toBeUndefined()
  })
})

describe('presenting', () => {
  it('reads the keys of a presentation', () => {
    for (const key of ['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter']) expect(presentKey(key)).toBe(1)
    for (const key of ['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace']) expect(presentKey(key)).toBe(-1)
    expect(presentKey('Home')).toBe('first')
    expect(presentKey('End')).toBe('last')
    expect(presentKey('Escape')).toBe('leave')
    expect(presentKey('a')).toBeNull()
    expect(presentKey('Tab')).toBeNull()
  })

  it('steps forward on a press, back on the left third, and follows a swipe', () => {
    expect(presentPress(700, 700, 0, 900)).toBe(1)
    expect(presentPress(450, 452, 3, 900)).toBe(1)
    expect(presentPress(100, 100, 0, 900)).toBe(-1)
    // A swipe to the left brings the next slide, wherever it starts; one to the right the slide before.
    expect(presentPress(200, 80, 5, 900)).toBe(1)
    expect(presentPress(600, 760, -10, 900)).toBe(-1)
    // A drag that goes mostly up or down is a press where it ended.
    expect(presentPress(700, 640, 200, 900)).toBe(1)
  })

  it('knows when the picture of a slide must be made again', () => {
    const doc = { ...deck(), customIcons: { cell: stubIcon('cell'), other: stubIcon('other') } }
    const nodes: FigNode[] = [placed('i', 'cell')]
    const stamp = thumbStamp(doc, nodes, true)
    const same = (other: unknown[]) => other.length === stamp.length && other.every((v, k) => v === stamp[k])
    expect(same(thumbStamp({ ...doc, name: 'Another name' }, nodes, true))).toBe(true)
    // An icon the slide does not place is none of its business.
    expect(same(thumbStamp({ ...doc, customIcons: { ...doc.customIcons, other: stubIcon('other') } }, nodes, true))).toBe(true)
    expect(same(thumbStamp({ ...doc, customIcons: { ...doc.customIcons, cell: stubIcon('cell') } }, nodes, true))).toBe(false)
    expect(same(thumbStamp({ ...doc, background: '#000000' }, nodes, true))).toBe(false)
    expect(same(thumbStamp({ ...doc, width: 1280 }, nodes, true))).toBe(false)
    expect(same(thumbStamp(doc, nodes, false))).toBe(false)
    expect(thumbNow(doc, nodes, true)).toBeNull()
    keepThumbs([])
  })
})

describe('all slides exported together', () => {
  const options = { area: 'content', transparent: false, includeSketch: true } as const

  it('are whole pages, whatever was asked for one slide', () => {
    expect(forSlides(options).area).toBe('page')
    expect(forSlides(options).transparent).toBe(false)
  })

  it('print as one page each, all of the size of the page', () => {
    const doc = { ...deck(), width: 960, height: 540 }
    const html = printPages(slideDocs(doc), options)
    expect(html.match(/<svg /g)).toHaveLength(3)
    expect(html).toContain('@page{size:254mm 142.88mm;margin:0}')
    expect(html).toContain('svg+svg{break-before:page')
    expect(html.match(/viewBox="0 0 960 540"/g)).toHaveLength(3)
    expect(html).not.toContain('<?xml')
    expect(html).toContain('>End<')
    // No id twice in the page, or one slide would borrow what another defines.
    const idsInPage = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1])
    expect(new Set(idsInPage).size).toBe(idsInPage.length)
  })

  it('print a single figure exactly as before', () => {
    const one = slideDoc(deck(), 1)
    const page = { area: 'page', transparent: false, includeSketch: true } as const
    expect(printPage(one, page)).toBe(printPages([one], page))
    expect(printPage(one, page)).not.toContain('break-before')
    expect(printPage(one, page)).toContain(renderSvg(one, page).svg.replace(/^<\?xml[^>]*>\s*/, ''))
    expect(printPages([], page)).toBe('')
  })

  it('are named so that they sort in order', () => {
    expect(slideFileName('deck', 0, 3, 'svg')).toBe('deck-01.svg')
    expect(slideFileName('deck', 11, 12, 'png')).toBe('deck-12.png')
    expect(slideFileName('deck', 4, 120, 'png')).toBe('deck-005.png')
  })
})

describe('a PowerPoint file with several slides', () => {
  const pic = (title: string, width = 1200, height = 800) => ({ title, width, height, png: new Uint8Array([137, 80, 78, 71]), svg: `<svg xmlns="http://www.w3.org/2000/svg"><title>${title}</title></svg>` })
  const read = (files: { name: string; data: Uint8Array }[], name: string): string => new TextDecoder().decode(files.find((f) => f.name === name)!.data)

  it('has a slide, a PNG and an SVG for every picture, in order', () => {
    const files = deckParts([pic('one'), pic('two'), pic('three')], true)
    const names = files.map((f) => f.name)
    for (const k of [1, 2, 3]) {
      expect(names).toContain(`ppt/slides/slide${k}.xml`)
      expect(names).toContain(`ppt/slides/_rels/slide${k}.xml.rels`)
      expect(names).toContain(`ppt/media/image${2 * k - 1}.png`)
      expect(names).toContain(`ppt/media/image${2 * k}.svg`)
    }
    expect(new Set(names).size).toBe(names.length)
    expect(read(files, 'ppt/media/image4.svg')).toContain('<title>two</title>')
    expect(read(files, 'ppt/slides/_rels/slide3.xml.rels')).toContain('../media/image5.png')
    expect(read(files, 'ppt/slides/_rels/slide3.xml.rels')).toContain('../media/image6.svg')
    const presentation = read(files, 'ppt/presentation.xml')
    expect(presentation.match(/<p:sldId /g)).toHaveLength(3)
    expect(presentation).toContain('<p:sldId id="256" r:id="rId2"/><p:sldId id="257" r:id="rId3"/><p:sldId id="258" r:id="rId4"/>')
    const links = read(files, 'ppt/_rels/presentation.xml.rels')
    expect(links).toContain('Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide3.xml"')
    expect(links).toContain('Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme"')
    const types = read(files, '[Content_Types].xml')
    expect(types.match(/slide\+xml/g)).toHaveLength(3)
  })

  it('makes the slides the size of the page and the pictures cover them', () => {
    const files = deckParts([pic('one'), pic('two')], true)
    expect(read(files, 'ppt/presentation.xml')).toContain(`<p:sldSz cx="${SLIDE.w}" cy="8128000"/>`)
    expect(read(files, 'ppt/slides/slide2.xml')).toContain(`<a:off x="0" y="0"/><a:ext cx="${SLIDE.w}" cy="8128000"/>`)
    // A wide page is a 16:9 slide; sizes PowerPoint refuses are brought within its limits.
    expect(slideLike(1280, 720)).toEqual(SLIDE)
    expect(slideLike(100, 2000).h).toBe(51206400)
    expect(slideLike(100, 2000).w).toBe(2560320)
    expect(slideLike(20000, 100).h).toBe(914400)
    expect(slideLike(0, 0)).toEqual(SLIDE)
  })

  it('is the same file as before for one figure on a slide', () => {
    const one = pic('one')
    expect(deckParts([one])).toEqual(pptxParts(one))
    const slide = read(pptxParts(one), 'ppt/slides/slide1.xml')
    expect(slide).not.toContain('<a:off x="0" y="0"/><a:ext cx="12192000"')
    expect(read(pptxParts(one), 'ppt/presentation.xml')).toContain(`<p:sldSz cx="${SLIDE.w}" cy="${SLIDE.h}"/>`)
    expect(read(pptxParts(one), 'ppt/_rels/presentation.xml.rels')).toContain('Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme"')
    // A stored ZIP archive: it begins with the mark of a local file.
    expect(Array.from(buildDeck([one, pic('two')], true).slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04])
  })
})
