// Resizing a figure, or part of it, as one picture: places, sizes, text and the thickness of
// lines change together.

import { describe, expect, it } from 'vitest'
import { validateDoc } from '../src/io/files'
import { emptyDoc, figureScaleWithin, scaleAsPicture, scaleFigure } from '../src/model/doc'
import { getBox, resolveConnector } from '../src/model/nodes'
import type { ConnectorNode, FigDoc, IconNode, MembraneNode, ShapeNode, StrokeNode, TextNode } from '../src/model/types'

const box: ShapeNode = {
  id: 'a', type: 'shape', shape: 'roundrect', x: 100, y: 100, w: 90, h: 30, rotation: 0, fill: '#e3f3ef', stroke: '#1f8f84', strokeWidth: 1.5,
  label: { text: 'EGFR', fontSize: 14, fill: '#2b2f36' },
}
const other: ShapeNode = { ...box, id: 'b', x: 400, y: 300, dashed: true, label: { text: 'RAS', fontSize: 14, fill: '#2b2f36' } }
const arrow: ConnectorNode = {
  id: 'c', type: 'connector', from: { x: 190, y: 115, nodeId: 'a', port: { x: 1, y: 0 } }, to: { x: 445, y: 300, nodeId: 'b' }, kind: 'arrow', stroke: '#2b2f36', strokeWidth: 2,
  route: 'elbow', legs: 'hv', label: 'binds', labelOffset: { x: 4, y: -6 },
}
const curve: ConnectorNode = { id: 'd', type: 'connector', from: { x: 50, y: 400 }, to: { x: 250, y: 400 }, kind: 'inhibit', stroke: '#c9403d', strokeWidth: 3, bend: { x: 0, y: 30 } }
const label: TextNode = { id: 't', type: 'text', x: 300, y: 40, text: 'Cytoplasm', fontSize: 16, fill: '#2b2f36', align: 'center', rotation: 0 }
const icon: IconNode = { id: 'i', type: 'icon', iconId: 'receptor', x: 600, y: 100, w: 80, h: 120, rotation: 30 }
const membrane: MembraneNode = { id: 'm', type: 'membrane', points: [{ x: 0, y: 500 }, { x: 800, y: 500 }], closed: false, thickness: 24, headColor: '#f0a04b', tailColor: '#d9b65c' }
const sketch: StrokeNode = { id: 's', type: 'stroke', points: [[10, 10, 0.5], [20, 30, 0.7]], color: '#000000', size: 4 }

const figure = (): FigDoc => ({ ...emptyDoc('Pathway'), width: 800, height: 600, nodes: [membrane, box, other, arrow, curve, label, icon, sketch] })
const byId = <T,>(doc: FigDoc, id: string): T => doc.nodes.find((n) => n.id === id) as T

describe('resizing the whole figure', () => {
  const big = scaleFigure(figure(), 2)

  it('enlarges the page', () => {
    expect(big.width).toBe(1600)
    expect(big.height).toBe(1200)
    expect(big.name).toBe('Pathway')
  })

  it('moves and enlarges every object from the top left corner of the page', () => {
    expect(byId<ShapeNode>(big, 'a')).toMatchObject({ x: 200, y: 200, w: 180, h: 60 })
    expect(byId<ShapeNode>(big, 'b')).toMatchObject({ x: 800, y: 600, w: 180, h: 60 })
    // A turned icon keeps its turn and its middle moves with the rest.
    const turned = byId<IconNode>(big, 'i')
    expect(turned).toMatchObject({ w: 160, h: 240, rotation: 30 })
    expect(turned.x + turned.w / 2).toBe(1280)
    expect(turned.y + turned.h / 2).toBe(320)
  })

  it('enlarges text, inside shapes and on its own', () => {
    expect(byId<ShapeNode>(big, 'a').label?.fontSize).toBe(28)
    const text = byId<TextNode>(big, 't')
    expect(text.fontSize).toBe(32)
    expect(text.x).toBe(600)
    expect(getBox(text, big).y).toBeCloseTo(80, 0)
  })

  it('thickens outlines and arrows, so that dashes and arrow heads grow too', () => {
    expect(byId<ShapeNode>(big, 'a').strokeWidth).toBe(3)
    expect(byId<ShapeNode>(big, 'b')).toMatchObject({ strokeWidth: 3, dashed: true })
    expect(byId<ConnectorNode>(big, 'c').strokeWidth).toBe(4)
    expect(byId<ConnectorNode>(big, 'd').strokeWidth).toBe(6)
  })

  it('keeps arrows on their objects and bends in proportion', () => {
    const c = byId<ConnectorNode>(big, 'c')
    expect(c.from).toEqual({ x: 380, y: 230, nodeId: 'a', port: { x: 1, y: 0 } })
    expect(c).toMatchObject({ route: 'elbow', legs: 'hv', labelOffset: { x: 8, y: -12 } })
    const before = resolveConnector(arrow, figure())
    const after = resolveConnector(c, big)
    // The corner is twice as far from the top left; the gap between arrow and object stays the usual 6.
    expect(after.via![0]).toEqual({ x: before.via![0].x * 2, y: before.via![0].y * 2 })
    expect(after.from).toEqual({ x: 386, y: 230 })
    const d = byId<ConnectorNode>(big, 'd')
    expect(d).toMatchObject({ from: { x: 100, y: 800 }, to: { x: 500, y: 800 }, bend: { x: 0, y: 60 } })
  })

  it('enlarges membranes and sketch strokes', () => {
    expect(byId<MembraneNode>(big, 'm')).toMatchObject({ thickness: 48, points: [{ x: 0, y: 1000 }, { x: 1600, y: 1000 }] })
    expect(byId<StrokeNode>(big, 's')).toMatchObject({ size: 8, points: [[20, 20, 0.5], [40, 60, 0.7]] })
  })

  it('takes hidden and locked objects and guides along', () => {
    const doc = { ...figure(), nodes: [{ ...box, locked: true }, { ...other, hidden: true }, { ...label, guide: true }] }
    const out = scaleFigure(doc, 2)
    expect(byId<ShapeNode>(out, 'a')).toMatchObject({ x: 200, w: 180, locked: true })
    expect(byId<ShapeNode>(out, 'b')).toMatchObject({ x: 800, w: 180, hidden: true })
    expect(byId<TextNode>(out, 't')).toMatchObject({ fontSize: 32, guide: true })
  })

  it('comes back to where it was when made smaller again by the same factor', () => {
    const back = scaleFigure(scaleFigure(figure(), 1.25), 0.8)
    expect(back.width).toBe(800)
    expect(byId<ShapeNode>(back, 'a')).toMatchObject({ w: 90, h: 30, strokeWidth: 1.5 })
    expect(byId<ShapeNode>(back, 'a').x).toBeCloseTo(100)
    expect(byId<ShapeNode>(back, 'a').label?.fontSize).toBeCloseTo(14, 1)
    expect(byId<ConnectorNode>(back, 'c').strokeWidth).toBe(2)
  })

  it('gives a figure that opens again unchanged', () => {
    expect(validateDoc(JSON.parse(JSON.stringify(big)))).toEqual(big)
  })

  it('leaves the figure alone for a factor of one or one that is no size', () => {
    const doc = figure()
    expect(scaleFigure(doc, 1)).toBe(doc)
    expect(scaleFigure(doc, 0)).toBe(doc)
    expect(scaleFigure(doc, -2)).toBe(doc)
    expect(scaleFigure(doc, NaN)).toBe(doc)
    expect(scaleFigure(doc, Infinity)).toBe(doc)
  })
})

describe('how far a figure can be resized', () => {
  it('stops where the page would get too large or too small', () => {
    const doc = figure()
    // 800 × 600: the longer side may reach 20000, the shorter side may go down to 100.
    expect(figureScaleWithin(doc, 2)).toBe(2)
    expect(figureScaleWithin(doc, 100)).toBe(25)
    expect(figureScaleWithin(doc, 0.01)).toBeCloseTo(1 / 6)
    expect(scaleFigure(doc, 100).width).toBe(20000)
    expect(scaleFigure(doc, 100).height).toBe(15000)
    expect(byId<ShapeNode>(scaleFigure(doc, 100), 'a').w).toBe(2250)
  })

  it('does not enlarge a page that is as large as a page can be', () => {
    const doc = { ...figure(), width: 20000 }
    expect(figureScaleWithin(doc, 2)).toBe(1)
    expect(scaleFigure(doc, 2)).toBe(doc)
    expect(scaleFigure(doc, 0.5).width).toBe(10000)
  })
})

describe('resizing part of a figure as one picture', () => {
  it('resizes the chosen objects about a point and leaves the rest and the page alone', () => {
    const doc = figure()
    const out = scaleAsPicture(doc, ['a', 'c'], 2, { x: 145, y: 115 })
    // About its own middle the box stays in place and doubles.
    expect(byId<ShapeNode>(out, 'a')).toMatchObject({ x: 55, y: 85, w: 180, h: 60, strokeWidth: 3 })
    expect(byId<ShapeNode>(out, 'a').label?.fontSize).toBe(28)
    expect(byId<ConnectorNode>(out, 'c').strokeWidth).toBe(4)
    expect(byId<ShapeNode>(out, 'b')).toBe(other)
    expect(byId<TextNode>(out, 't')).toBe(label)
    expect(out.width).toBe(800)
  })

  it('keeps line thickness within what a figure can hold', () => {
    const doc = figure()
    expect(byId<ConnectorNode>(scaleAsPicture(doc, ['d'], 50, { x: 0, y: 0 }), 'd').strokeWidth).toBe(40)
    expect(byId<ConnectorNode>(scaleAsPicture(doc, ['d'], 0.01, { x: 0, y: 0 }), 'd').strokeWidth).toBe(0.25)
  })
})
