// Tests for the second round of features: right-angled arrows, transforms of several objects,
// alignment guides, locking, pictures, panel letters, splitting icons and icon packs.

import { describe, expect, it, vi } from 'vitest'
import { listPacks, readPack, searchPackNames } from '../src/icons/packs'
import { extractParts, placePart } from '../src/icons/split'
import { parseScene } from '../src/ai/scene'
import { attributionLines, exportRect, printPage, renderSvg } from '../src/io/export'
import { isImageDataUrl, validateDoc } from '../src/io/files'
import { fitImage } from '../src/io/images'
import { connectorShape, fadeStops } from '../src/model/connector'
import { emptyDoc, expandGroups, nextPanelLetter } from '../src/model/doc'
import { snapToGuides } from '../src/model/geometry'
import { nodeLabel } from '../src/model/describe'
import { PANEL_LAYOUTS, panelNodes, panelRects } from '../src/model/panels'
import { connectorLabelNode, bendThrough, connectorLabelPos, connectorMid, getRect, resolveConnector, rotateNodeAbout, scaleNode } from '../src/model/nodes'
import type { ConnectorNode, FigDoc, FigNode, IconDef, IconNode, ImageNode, ShapeNode, TextNode } from '../src/model/types'

const box = (id: string, x: number, y: number, w = 100, h = 60, extra: Partial<ShapeNode> = {}): ShapeNode => ({
  id, type: 'shape', shape: 'rect', x, y, w, h, rotation: 0, fill: '#ffffff', stroke: '#000000', strokeWidth: 2, ...extra,
})
const elbow = (extra: Partial<ConnectorNode> = {}): ConnectorNode => ({
  id: 'c', type: 'connector', from: { x: 0, y: 0, nodeId: 'a' }, to: { x: 0, y: 0, nodeId: 'b' }, kind: 'arrow', stroke: '#000000', strokeWidth: 2, route: 'elbow', ...extra,
})
const docOf = (...nodes: FigNode[]): FigDoc => ({ ...emptyDoc(), nodes })
const PNG = 'data:image/png;base64,iVBORw0KGgo='

describe('right-angled arrows', () => {
  it('leaves the sides that face each other and turns twice', () => {
    const d = docOf(box('a', 0, 0), box('b', 400, 200))
    const r = resolveConnector(elbow(), d)
    expect(r.from).toEqual({ x: 106, y: 30 })
    expect(r.to).toEqual({ x: 394, y: 230 })
    expect(r.via).toEqual([{ x: 250, y: 30 }, { x: 250, y: 230 }])
    expect(connectorMid(r)).toEqual({ x: 250, y: 130 })
    const shape = connectorShape('arrow', 2, r)
    expect(shape.d).toBe('M106,30 L250,30 L250,230 L386.8,230')
    expect(shape.heads).toHaveLength(1)
  })

  it('runs down-across-down when the ends are further apart vertically', () => {
    const r = resolveConnector(elbow(), docOf(box('a', 0, 0), box('b', 100, 400)))
    expect(r.from).toEqual({ x: 50, y: 66 })
    expect(r.via).toEqual([{ x: 50, y: 230 }, { x: 150, y: 230 }])
    expect(r.to).toEqual({ x: 150, y: 394 })
  })

  it('moves its middle leg with the diamond handle and snaps back when released near the middle', () => {
    const d = docOf(box('a', 0, 0), box('b', 400, 200))
    expect(bendThrough(elbow(), d, { x: 300, y: 999 })).toEqual({ x: 50, y: 0 })
    expect(bendThrough(elbow(), d, { x: 251, y: 0 })).toBeUndefined()
    expect(resolveConnector(elbow({ bend: { x: 50, y: 0 } }), d).via?.[0].x).toBe(300)
  })

  it('never pulls the two ends of a short double-headed arrow past each other', () => {
    for (const length of [6, 12, 18, 30, 60]) {
      const shape = connectorShape('double', 2, { from: { x: 0, y: 0 }, to: { x: length, y: 0 }, ctrl: null })
      const [x0, x1] = shape.d.match(/-?[\d.]+(?=,)/g)!.map(Number)
      expect(x1, `length ${length}`).toBeGreaterThanOrEqual(x0)
    }
  })

  it('points the arrowhead along the last leg even when corners coincide', () => {
    const r = resolveConnector(elbow(), docOf(box('a', 0, 0), box('b', 400, 0)))
    // Both boxes are level, so the two corners sit on the same straight line.
    const shape = connectorShape('inhibit', 2, r)
    expect(shape.bars[0][0].x).toBeCloseTo(shape.bars[0][1].x)
  })

  it('places the label beside the middle leg and follows a dragged offset', () => {
    const d = docOf(box('a', 0, 0), box('b', 400, 200))
    const r = resolveConnector(elbow(), d)
    expect(connectorLabelPos({ strokeWidth: 2 }, r)).toEqual({ x: 260, y: 135, anchor: 'start' })
    expect(connectorLabelPos({ strokeWidth: 2, labelOffset: { x: 10, y: -20 } }, r)).toEqual({ x: 270, y: 115, anchor: 'start' })
  })
})

describe('resizing and turning several objects together', () => {
  it('scales positions and sizes about one point', () => {
    const d = docOf(box('a', 100, 100, 100, 50, { rotation: 30 }))
    const scaled = scaleNode(d.nodes[0], 2, { x: 0, y: 0 }, d) as ShapeNode
    expect(scaled).toMatchObject({ x: 200, y: 200, w: 200, h: 100, rotation: 30 })
  })

  it('scales text, membranes and loose arrow ends', () => {
    const t: TextNode = { id: 't', type: 'text', x: 100, y: 100, text: 'Hi', fontSize: 20, fill: '#000', align: 'center', rotation: 0 }
    expect((scaleNode(t, 2, { x: 0, y: 0 }, docOf(t)) as TextNode).fontSize).toBe(40)
    const m: FigNode = { id: 'm', type: 'membrane', points: [{ x: 10, y: 10 }, { x: 50, y: 10 }], closed: false, thickness: 20, headColor: '#000', tailColor: '#000' }
    expect(scaleNode(m, 3, { x: 0, y: 0 }, docOf(m))).toMatchObject({ points: [{ x: 30, y: 30 }, { x: 150, y: 30 }], thickness: 60 })
    const c: ConnectorNode = { id: 'c', type: 'connector', from: { x: 10, y: 0 }, to: { x: 20, y: 0 }, kind: 'line', stroke: '#000', strokeWidth: 2, bend: { x: 0, y: 5 } }
    expect(scaleNode(c, 2, { x: 0, y: 0 }, docOf(c))).toMatchObject({ from: { x: 20, y: 0 }, to: { x: 40, y: 0 }, bend: { x: 0, y: 10 } })
  })

  it('turns an object about a shared centre', () => {
    const d = docOf(box('a', 100, -30, 100, 60))
    const turned = rotateNodeAbout(d.nodes[0], 90, { x: 0, y: 0 }, d) as ShapeNode
    // Its centre (150, 0) swings round to (0, 150) and it turns by the same angle.
    expect(turned.x + turned.w / 2).toBeCloseTo(0)
    expect(turned.y + turned.h / 2).toBeCloseTo(150)
    expect(turned.rotation).toBe(90)
  })
})

describe('alignment guides', () => {
  const target = { x: 300, y: 300, w: 100, h: 100 }
  it('snaps edges and centres within reach and says where the guide is', () => {
    expect(snapToGuides({ x: 303, y: 100, w: 50, h: 50 }, [target], 6)).toEqual({ dx: -3, dy: 0, x: 300, y: null })
    expect(snapToGuides({ x: 0, y: 322, w: 50, h: 50 }, [target], 6)).toMatchObject({ dy: 3, y: 350 })
    // Two matches are equally close here (left edge to the target's centre, right edge to its right edge): the first is shown.
    expect(snapToGuides({ x: 352, y: 0, w: 50, h: 50 }, [target], 6)).toMatchObject({ dx: -2, x: 350 })
    expect(snapToGuides({ x: 395, y: 0, w: 2, h: 50 }, [target], 6)).toMatchObject({ dx: 3, x: 400 })
  })
  it('does nothing when nothing is close', () => {
    expect(snapToGuides({ x: 0, y: 0, w: 50, h: 50 }, [target], 6)).toEqual({ dx: 0, dy: 0, x: null, y: null })
    expect(snapToGuides({ x: 0, y: 0, w: 50, h: 50 }, [], 6)).toEqual({ dx: 0, dy: 0, x: null, y: null })
  })
  it('prefers the closest of several candidates', () => {
    const snap = snapToGuides({ x: 296, y: 0, w: 10, h: 10 }, [target, { x: 297, y: 0, w: 10, h: 10 }], 6)
    expect(snap.dx).toBe(1)
  })
})

describe('new figure content in files', () => {
  it('keeps locking, font type, arrow shape, label offset and print width', () => {
    const doc: FigDoc = {
      ...emptyDoc(),
      widthMm: 85,
      nodes: [
        { id: 't', type: 'text', x: 0, y: 0, text: 'Ca^{2+}', fontSize: 12, fill: '#000000', align: 'left', rotation: 0, fontFamily: 'mono', locked: true },
        { id: 'c', type: 'connector', from: { x: 0, y: 0 }, to: { x: 9, y: 9 }, kind: 'arrow', stroke: '#000000', strokeWidth: 2, route: 'elbow', labelOffset: { x: 4, y: -6 }, label: 'x' },
        { id: 'i', type: 'image', src: PNG, x: 1, y: 2, w: 30, h: 40, rotation: 15 },
      ],
    }
    expect(validateDoc(JSON.parse(JSON.stringify(doc)))).toEqual(doc)
  })

  it('accepts only bitmap pictures stored inside the file', () => {
    expect(isImageDataUrl(PNG)).toBe(true)
    for (const src of ['https://example.org/a.png', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:text/html;base64,AAAA', 'javascript:alert(1)', 'data:image/png;base64,"><script>', 42]) {
      expect(isImageDataUrl(src), String(src)).toBe(false)
      expect(validateDoc({ nodes: [{ type: 'image', src, x: 0, y: 0, w: 10, h: 10 }] }).nodes).toHaveLength(0)
    }
  })

  it('drops unknown font types, arrow shapes and print widths', () => {
    const doc = validateDoc({
      widthMm: -5,
      nodes: [
        { type: 'text', text: 'a', fontFamily: 'Comic Sans' },
        { type: 'connector', from: { x: 0, y: 0 }, to: { x: 1, y: 1 }, route: 'spiral', labelOffset: 'far' },
      ],
    })
    expect(doc.widthMm).toBeUndefined()
    expect(doc.nodes[0]).not.toHaveProperty('fontFamily')
    expect(doc.nodes[1]).not.toHaveProperty('route')
    expect(doc.nodes[1]).not.toHaveProperty('labelOffset')
  })

  it('exports a picture inside the SVG and lets arrows attach to it', () => {
    const image: ImageNode = { id: 'i', type: 'image', src: PNG, x: 100, y: 100, w: 200, h: 100, rotation: 0 }
    const arrow: ConnectorNode = { id: 'c', type: 'connector', from: { x: 0, y: 0, nodeId: 'i' }, to: { x: 600, y: 150 }, kind: 'arrow', stroke: '#000000', strokeWidth: 2 }
    const d = docOf(image, arrow)
    expect(resolveConnector(arrow, d).from).toEqual({ x: 306, y: 150 })
    const xml = new DOMParser().parseFromString(renderSvg(d, { area: 'page', transparent: false, includeSketch: true }).svg, 'image/svg+xml')
    expect(xml.getElementsByTagName('parsererror')).toHaveLength(0)
    // In the spelling drawing programs read (see tests/export-files.test.ts).
    expect(xml.getElementsByTagName('image')[0].getAttributeNS('http://www.w3.org/1999/xlink', 'href')).toBe(PNG)
  })

  it('sizes a placed picture to at most 40% of the page without enlarging it', () => {
    expect(fitImage(4000, 2000, { width: 1200, height: 800 })).toEqual({ w: 480, h: 240 })
    expect(fitImage(100, 50, { width: 1200, height: 800 })).toEqual({ w: 100, h: 50 })
  })
})

describe('panel letters', () => {
  const letter = (id: string, text: string, bold = true): TextNode => ({ id, type: 'text', x: 0, y: 0, text, fontSize: 28, fill: '#000', align: 'left', rotation: 0, ...(bold ? { bold: true } : {}) })
  it('continues after the highest letter in use', () => {
    expect(nextPanelLetter(docOf())).toBe('A')
    expect(nextPanelLetter(docOf(letter('1', 'A'), letter('2', 'C')))).toBe('D')
    expect(nextPanelLetter(docOf(letter('1', 'B', false), letter('2', 'Gene')))).toBe('A')
    expect(nextPanelLetter(docOf(letter('1', 'Z')))).toBe('Z')
  })
})

describe('splitting an icon into pieces', () => {
  it('keeps the styling of the group the pieces were in', () => {
    const found = extractParts('<g stroke-width="2.5" stroke-linecap="round"><circle r="5"/><rect width="4" height="4"/></g>')!
    expect(found.parts).toEqual(['<circle r="5"/>', '<rect width="4" height="4"/>'])
    expect(found.open).toBe('<g stroke-width="2.5" stroke-linecap="round">')
    expect(found.close).toBe('</g>')
  })

  it('carries shared definitions to every piece and stops at the first level with several shapes', () => {
    const found = extractParts('<defs><linearGradient id="g"/></defs><g><g fill="red"><path d="M0 0"/></g><path d="M1 1"/></g>')!
    expect(found.defs).toContain('linearGradient')
    expect(found.parts).toHaveLength(2)
    expect(found.parts[0]).toContain('fill="red"')
  })

  it('puts a piece where it was, also for stretched, flipped and turned icons', () => {
    const node: IconNode = { id: 'n', type: 'icon', iconId: 'x', x: 100, y: 100, w: 200, h: 100, rotation: 0 }
    const piece = { x: 10, y: 20, w: 30, h: 40 }
    // Icon drawn at twice its 100 x 100 size sideways, same size vertically.
    expect(placePart(node, [100, 100], piece)).toEqual({ x: 120, y: 120, w: 60, h: 40, rotation: 0 })
    expect(placePart({ ...node, flipX: true }, [100, 100], piece)).toMatchObject({ x: 220, y: 120 })
    const turned = placePart({ ...node, rotation: 180 }, [100, 100], piece)
    expect(turned.x + turned.w / 2).toBeCloseTo(250)
    expect(turned.y + turned.h / 2).toBeCloseTo(160)
    expect(turned.rotation).toBe(180)
  })

  it('credits the pieces of a split icon once', () => {
    const part = (id: string): IconDef => ({ id, name: 'Heart', category: 'Part', tags: [], viewBox: [10, 10], body: '<circle r="4"/>', license: 'CC BY 4.0', author: 'Someone', source: '' })
    const use = (id: string): IconNode => ({ id: `n-${id}`, type: 'icon', iconId: id, x: 0, y: 0, w: 10, h: 10, rotation: 0 })
    const doc: FigDoc = { ...emptyDoc(), nodes: [use('part-1'), use('part-2')], customIcons: { 'part-1': part('part-1'), 'part-2': part('part-2') } }
    expect(attributionLines(doc)).toHaveLength(1)
    // Pieces keep their category when a figure is saved and opened again.
    expect(validateDoc(JSON.parse(JSON.stringify(doc))).customIcons['part-1'].category).toBe('Part')
  })
})

describe('icon packs', () => {
  it('cleans third-party markup and namespaces the ids', () => {
    const icons = readPack(
      {
        icons: [
          { id: 't-cell', name: 'T cell', viewBox: [100, 80], body: '<circle r="5" onclick="x()"/><script>alert(1)</script>', license: 'CC BY 4.0', author: 'A', source: 'https://example.org', tags: ['immune', 7] },
          { id: 't-cell', name: 'Duplicate', viewBox: [1, 1], body: '<rect width="1" height="1"/>' },
          { id: 'bad id!', name: 'x', viewBox: [1, 1], body: '<rect width="1" height="1"/>' },
          { id: 'no-size', name: 'x', viewBox: [0, 0], body: '<rect width="1" height="1"/>' },
          { id: 'broken', name: 'x', viewBox: [1, 1], body: '<rect' },
          'nonsense',
        ],
      },
      { id: 'demo', name: 'Demo pack' },
    )
    expect(icons).toHaveLength(1)
    expect(icons[0]).toMatchObject({ id: 'demo--t-cell', name: 'T cell', category: 'Demo pack', tags: ['immune'], license: 'CC BY 4.0', viewBox: [100, 80] })
    expect(icons[0].body).not.toMatch(/script|onclick/)
    expect(readPack(null, { id: 'demo', name: 'Demo' })).toEqual([])
    expect(readPack({ icons: 'no' }, { id: 'demo', name: 'Demo' })).toEqual([])
  })
})

describe('searching icon packs before they are fetched', () => {
  const index = [
    { id: 'organs', name: 'Open: organs', licence: 'CC BY 4.0', source: 'https://example.org', count: 2, file: 'organs.json', names: [['liver', 'Healthy liver', 'human physiology'], ['heart', 'Human heart', 'human physiology'], ['bad'], 7] },
    { id: 'lab', name: 'Open: lab', licence: 'CC0', count: 1, file: 'lab.json', names: [['flask', 'Erlenmeyer flask', 'glassware']] },
    { id: 'old', name: 'Made before names were listed', file: 'old.json' },
    { id: '../evil', file: 'x.json', names: [] },
  ]

  it('reads the names that travel with the pack list and ignores malformed entries', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => index })))
    const packs = await listPacks()
    vi.unstubAllGlobals()
    expect(packs.map((p) => [p.id, p.names.length])).toEqual([['organs', 2], ['lab', 1], ['old', 0]])
  })

  it('finds icons by name, keyword or collection, with the id a figure would store', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => index })))
    const packs = await listPacks()
    vi.unstubAllGlobals()
    expect(searchPackNames(packs, 'LIVER').map((h) => h.id)).toEqual(['organs--liver'])
    expect(searchPackNames(packs, 'human physiology').map((h) => h.id)).toEqual(['organs--liver', 'organs--heart'])
    expect(searchPackNames(packs, 'open lab').map((h) => [h.pack.id, h.id])).toEqual([['lab', 'lab--flask']])
    expect(searchPackNames(packs, 'zebrafish')).toEqual([])
    expect(searchPackNames(packs, '  ')).toEqual([])
  })
})

describe('PDF through the print window', () => {
  it('sets the paper to the printed size of the figure', () => {
    const html = printPage({ ...emptyDoc('A <b> & c'), width: 1200, height: 800, widthMm: 85 }, { area: 'page', transparent: false, includeSketch: true })
    expect(html).toContain('@page{size:85mm 56.67mm;margin:0}')
    expect(html).toContain('<title>A &lt;b&gt; &amp; c</title>')
    expect(html).not.toContain('<?xml')
    expect(html).toContain('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="85mm"')
  })
  it('uses screen size (96 units per inch) when no printed width is set', () => {
    const html = printPage({ ...emptyDoc(), width: 960, height: 480 }, { area: 'page', transparent: false, includeSketch: true })
    expect(html).toContain('@page{size:254mm 127mm;margin:0}')
  })
})

describe('pack icons in saved figures', () => {
  it('have ids that survive saving and opening the figure', () => {
    const [icon] = readPack({ icons: [{ id: 'a'.repeat(36), name: 'Long', viewBox: [10, 10], body: '<circle r="4"/>' }] }, { id: 'p'.repeat(20), name: 'Pack' })
    expect(icon.id).toHaveLength(58)
    const doc: FigDoc = { ...emptyDoc(), nodes: [{ id: 'n', type: 'icon', iconId: icon.id, x: 0, y: 0, w: 10, h: 10, rotation: 0 }], customIcons: { [icon.id]: { ...icon, category: 'Imported' } } }
    const loaded = validateDoc(JSON.parse(JSON.stringify(doc)))
    expect(loaded.nodes).toHaveLength(1)
    expect(Object.keys(loaded.customIcons)).toEqual([icon.id])
    // An id too long to be stored is refused when the pack is read, not silently lost later.
    expect(readPack({ icons: [{ id: 'a'.repeat(60), name: 'x', viewBox: [1, 1], body: '<circle r="1"/>' }] }, { id: 'pack', name: 'Pack' })).toEqual([])
  })
})

describe('locked objects', () => {
  it('are not picked up through the group they belong to', () => {
    const d = docOf(box('a', 0, 0, 100, 60, { groupId: 'g' }), box('b', 200, 0, 100, 60, { groupId: 'g', locked: true }), box('c', 400, 0, 100, 60, { groupId: 'g' }))
    expect(expandGroups(d, ['a'])).toEqual(['a', 'c'])
  })

  it('still take part in geometry (arrows can stay attached to them)', () => {
    const d = docOf(box('a', 0, 0, 100, 60, { locked: true }))
    expect(getRect(d.nodes[0], d)).toEqual({ x: 0, y: 0, w: 100, h: 60 })
  })
})

describe('panel layouts', () => {
  it('divides the page into frames that stay inside it and never overlap', () => {
    for (const { value } of PANEL_LAYOUTS) {
      const rects = panelRects(value, 1200, 800)
      for (const r of rects) {
        expect(r.x).toBeGreaterThan(0)
        expect(r.y).toBeGreaterThan(0)
        expect(r.x + r.w).toBeLessThan(1200)
        expect(r.y + r.h).toBeLessThan(800)
      }
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i]
          const b = rects[j]
          const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y
          expect(apart, `${value}: ${i} and ${j}`).toBe(true)
        }
      }
    }
    expect(panelRects('2x3', 1200, 800)).toHaveLength(6)
    expect(panelRects('big-left', 1200, 800).map((r) => Math.round(r.w))).toEqual([667, 445, 445])
  })

  it('reads left to right, then top to bottom', () => {
    const [a, b, c] = panelRects('2x2', 1000, 1000)
    expect(b.x).toBeGreaterThan(a.x)
    expect(b.y).toBe(a.y)
    expect(c.y).toBeGreaterThan(a.y)
    expect(c.x).toBe(a.x)
  })

  it('adds a locked guide frame and a letter per panel, carrying on after letters already there', () => {
    const d = { ...emptyDoc(), nodes: [{ id: 't', type: 'text' as const, x: 0, y: 0, text: 'B', fontSize: 28, fill: '#000000', bold: true, align: 'left' as const, rotation: 0 }] }
    const nodes = panelNodes(d, '1x2')
    expect(nodes.map((n) => (n.type === 'text' ? n.text : `${n.type}:${n.guide}:${n.locked}:${n.name}`))).toEqual(['shape:true:true:Panel C frame', 'C', 'shape:true:true:Panel D frame', 'D'])
  })

  it('shows guide frames on the page but leaves them out of exports and of the export area', () => {
    const d = { ...emptyDoc(), nodes: [...panelNodes(emptyDoc(), '2x2'), box('content', 500, 300, 100, 60)] }
    const svg = renderSvg(d, { area: 'page', transparent: false, includeSketch: true }).svg
    expect(svg).not.toContain('stroke-dasharray')
    expect(svg).toContain('>A<')
    const rect = exportRect({ ...d, nodes: d.nodes.filter((n) => n.type !== 'text') }, 'content')
    // Only the box counts (plus the margin around the content), not the frames near the page edge.
    expect(rect.x).toBeGreaterThan(400)
    expect(rect.w).toBeLessThan(200)
    const back = validateDoc(JSON.parse(JSON.stringify(d)))
    expect(back.nodes.filter((n) => n.guide)).toHaveLength(4)
  })
})

describe('arrow ends and fading lines', () => {
  const straight = { from: { x: 0, y: 0 }, to: { x: 100, y: 0 }, ctrl: null }
  const free = (extra: Partial<ConnectorNode> = {}): ConnectorNode => ({
    id: 'c', type: 'connector', from: { x: 10, y: 20 }, to: { x: 210, y: 20 }, kind: 'arrow', stroke: '#2b2f36', strokeWidth: 2, ...extra,
  })
  const options = { area: 'page' as const, transparent: false, includeSketch: true }

  it('ends an arrow in a round dot that sits on the end point', () => {
    const shape = connectorShape('dot', 2, straight)
    expect(shape.dots).toEqual([{ c: { x: 100, y: 0 }, r: 4.5 }])
    expect(shape).toMatchObject({ heads: [], bars: [], d: 'M0,0 L100,0' })
    // A thicker line gets a bigger dot.
    expect(connectorShape('dot', 6, straight).dots[0].r).toBeCloseTo(13.2)
    for (const kind of ['arrow', 'inhibit', 'line', 'double'] as const) expect(connectorShape(kind, 2, straight).dots).toEqual([])
  })

  it('stops a fading line where its end mark begins, so the two never overlap', () => {
    // Head 9 long, dot radius 4.5, bar 2.6 thick: the line ends at their edge, half a unit inside.
    expect(connectorShape('arrow', 2, straight, true).d).toBe('M0,0 L91.5,0')
    expect(connectorShape('dot', 2, straight, true).d).toBe('M0,0 L96,0')
    expect(connectorShape('inhibit', 2, straight, true).d).toBe('M0,0 L99.2,0')
    expect(connectorShape('double', 2, straight, true).d).toBe('M8.5,0 L91.5,0')
    expect(connectorShape('line', 2, straight, true).d).toBe('M0,0 L100,0')
    // Without fading the line still runs into the head, as before.
    expect(connectorShape('arrow', 2, straight).d).toBe('M0,0 L92.8,0')
  })

  it('fades towards the start or the end, and keeps an end with a mark faintly visible', () => {
    expect(fadeStops('arrow', undefined)).toBeNull()
    expect(fadeStops('arrow', 'in')).toEqual({ start: 0, end: 1 })
    expect(fadeStops('double', 'in')).toEqual({ start: 0.25, end: 1 })
    expect(fadeStops('line', 'out')).toEqual({ start: 1, end: 0 })
    for (const kind of ['arrow', 'inhibit', 'dot', 'double'] as const) expect(fadeStops(kind, 'out')).toEqual({ start: 1, end: 0.25 })
  })

  it('exports a fading arrow as a colour that runs along the line, used by the line and its head', () => {
    const svg = renderSvg(docOf(free({ fade: 'in' })), options).svg
    expect(svg).toContain('<linearGradient id="fade-c" gradientUnits="userSpaceOnUse" x1="10" y1="20" x2="210" y2="20">')
    expect(svg).toMatch(/<stop offset="0" stop-color="#2b2f36" stop-opacity="0"\s*\/?>/)
    expect(svg).toMatch(/<stop offset="1" stop-color="#2b2f36" stop-opacity="1"\s*\/?>/)
    expect(svg).toMatch(/<path [^>]*stroke="url\(#fade-c\)"[^>]*stroke-linecap="butt"/)
    expect(svg).toMatch(/<polygon [^>]*fill="url\(#fade-c\)"/)
    // A plain arrow has none of that.
    const plain = renderSvg(docOf(free()), options).svg
    expect(plain).not.toContain('linearGradient')
    expect(plain).toMatch(/<polygon [^>]*fill="#2b2f36"/)
    // A round end is drawn as a circle in the line's paint.
    expect(renderSvg(docOf(free({ kind: 'dot' })), options).svg).toMatch(/<circle cx="210" cy="20" r="4.5" fill="#2b2f36"/)
    expect(renderSvg(docOf(free({ kind: 'dot', fade: 'out' })), options).svg).toMatch(/<circle cx="210" cy="20" r="4.5" fill="url\(#fade-c\)"/)
  })

  it('keeps both settings in a saved figure and drops anything else', () => {
    const saved = (extra: object): ConnectorNode => validateDoc(JSON.parse(JSON.stringify(docOf({ ...free(), ...extra } as ConnectorNode)))).nodes[0] as ConnectorNode
    expect(saved({ kind: 'dot', fade: 'out' })).toMatchObject({ kind: 'dot', fade: 'out' })
    expect(saved({ fade: 'in' }).fade).toBe('in')
    expect('fade' in saved({ fade: 'sideways' })).toBe(false)
    expect('fade' in saved({})).toBe(false)
  })

  it('has a name for the round-ended arrow, and AI answers may ask for one', () => {
    expect(nodeLabel(free({ kind: 'dot' }))).toBe('Round-ended arrow')
    const scene = parseScene({
      title: '',
      elements: [
        { id: 'a', kind: 'box', icon: '', label: 'A', x: 200, y: 500, w: 110, h: 55 },
        { id: 'b', kind: 'box', icon: '', label: 'B', x: 700, y: 500, w: 110, h: 55 },
      ],
      connectors: [{ from: 'a', to: 'b', kind: 'dot', dashed: false, label: '' }],
    })
    expect(scene.connectors[0].kind).toBe('dot')
  })
})


describe('words on an arrow', () => {
  const arrow = (label: string, extra: Partial<ConnectorNode> = {}): ConnectorNode => ({
    id: 'c', type: 'connector', from: { x: 100, y: 100 }, to: { x: 300, y: 100 }, kind: 'arrow', stroke: '#123456', strokeWidth: 2, label, ...extra,
  })
  const texts = (node: ConnectorNode): Element[] => {
    const xml = new DOMParser().parseFromString(renderSvg(docOf(node), { area: 'page', transparent: false, includeSketch: true }).svg, 'image/svg+xml')
    return Array.from(xml.getElementsByTagName('text'))
  }

  it('are drawn where they were, in the colour of the arrow, on a white halo', () => {
    const [halo, words] = texts(arrow('activates'))
    expect(halo.getAttribute('stroke')).toBe('#ffffff')
    expect(halo.getAttribute('fill')).toBe('none')
    expect(words.getAttribute('fill')).toBe('#123456')
    expect(words.getAttribute('text-anchor')).toBe('middle')
    expect(words.getAttribute('font-size')).toBe('14')
    // Above the middle of a line that runs sideways: 8 units and half the line's thickness clear of it.
    const first = words.getElementsByTagName('tspan')[0]
    expect([first.getAttribute('x'), first.getAttribute('y')]).toEqual(['200', '91'])
    expect(words.textContent).toBe('activates')
    expect(halo.textContent).toBe('activates')
  })

  it('take the marks for raised and lowered text, italics and bold, like every other label', () => {
    const [halo, words] = texts(arrow('k_{cat} = 3 s^{-1} *in vivo*, **fast**'))
    expect(words.textContent).toBe('kcat = 3 s-1 in vivo, fast')
    expect(halo.textContent).toBe(words.textContent)
    const spans = Array.from(words.getElementsByTagName('tspan'))
    const small = spans.filter((s) => s.getAttribute('font-size'))
    expect(small.map((s) => s.textContent)).toEqual(['cat', '-1'])
    expect(spans.find((s) => s.getAttribute('font-style') === 'italic')?.textContent).toBe('in vivo')
    expect(spans.find((s) => s.getAttribute('font-weight') === 'bold')?.textContent).toBe('fast')
    // Lone stars stay stars: they mark significance.
    expect(texts(arrow('p < 0.05 *'))[1].textContent).toBe('p < 0.05 *')
  })

  it('stand beside an upright line, and nowhere when there are none', () => {
    const upright = arrow('down', { to: { x: 100, y: 300 } })
    const r = resolveConnector(upright, docOf(upright))
    expect(connectorLabelNode(upright, r)).toMatchObject({ id: 'c', x: 110, align: 'left', text: 'down', fontSize: 14, fill: '#123456' })
    expect(connectorLabelNode(arrow('   '), r)).toBeNull()
    expect(texts(arrow(''))).toHaveLength(0)
  })
})
