// An arrow end with its own place on the object it is attached to (a port), and right-angled
// lines with one corner. Pathway files need both; arrows drawn by hand have neither.

import { describe, expect, it } from 'vitest'
import { connectorShape } from '../src/model/connector'
import { validateDoc } from '../src/io/files'
import { emptyDoc } from '../src/model/doc'
import { bendThrough, connectorMid, hasOneCorner, portPoint, resolveConnector, rotateNodeAbout, translateNode } from '../src/model/nodes'
import type { ConnectorNode, FigDoc, ShapeNode } from '../src/model/types'

const shape = (id: string, x: number, y: number, w = 100, h = 60, extra: Partial<ShapeNode> = {}): ShapeNode => ({
  id, type: 'shape', shape: 'rect', x, y, w, h, rotation: 0, fill: '#fff', stroke: '#000', strokeWidth: 2, ...extra,
})
const link = (from: ConnectorNode['from'], to: ConnectorNode['to'], extra: Partial<ConnectorNode> = {}): ConnectorNode => ({
  id: 'c', type: 'connector', from, to, kind: 'arrow', stroke: '#000', strokeWidth: 2, ...extra,
})
const docOf = (...nodes: FigDoc['nodes']): FigDoc => ({ ...emptyDoc(), nodes })

describe('an arrow end with its own place on an object', () => {
  it('sits at that place, a little outside the edge', () => {
    const box = { x: 0, y: 0, w: 100, h: 60, rotation: 0 }
    expect(portPoint(box, { x: 1, y: 0 })).toEqual({ x: 106, y: 30 })
    expect(portPoint(box, { x: -0.5, y: 1 })).toEqual({ x: 25, y: 66 })
    expect(portPoint(box, { x: -1, y: -1 })).toEqual({ x: -6, y: -6 })
    // In the middle of the object there is no edge to stay clear of.
    expect(portPoint(box, { x: 0, y: 0 })).toEqual({ x: 50, y: 30 })
  })

  it('turns with the object', () => {
    const p = portPoint({ x: 0, y: 0, w: 100, h: 60, rotation: 90 }, { x: 1, y: 0 })
    expect(p.x).toBeCloseTo(50)
    expect(p.y).toBeCloseTo(86)
  })

  it('keeps two arrows between the same objects apart', () => {
    const a = shape('a', 0, 0)
    const b = shape('b', 0, 200)
    const doc = docOf(a, b)
    const left = resolveConnector(link({ x: 0, y: 0, nodeId: 'a', port: { x: -0.5, y: 1 } }, { x: 0, y: 0, nodeId: 'b', port: { x: -0.5, y: -1 } }), doc)
    const right = resolveConnector(link({ x: 0, y: 0, nodeId: 'a', port: { x: 0.5, y: 1 } }, { x: 0, y: 0, nodeId: 'b', port: { x: 0.5, y: -1 } }), doc)
    expect(left.from).toEqual({ x: 25, y: 66 })
    expect(left.to).toEqual({ x: 25, y: 194 })
    expect(right.from).toEqual({ x: 75, y: 66 })
    expect(right.to).toEqual({ x: 75, y: 194 })
  })

  it('follows the object when it moves, and when it is resized', () => {
    const a = shape('a', 0, 0)
    const c = link({ x: 0, y: 0, nodeId: 'a', port: { x: 1, y: 0.5 } }, { x: 500, y: 45 })
    expect(resolveConnector(c, docOf(a)).from).toEqual({ x: 106, y: 45 })
    expect(resolveConnector(c, docOf(translateNode(a, 20, 100))).from).toEqual({ x: 126, y: 145 })
    expect(resolveConnector(c, docOf(shape('a', 0, 0, 200, 100))).from).toEqual({ x: 206, y: 75 })
  })

  it('is what an end without a port aims at', () => {
    const a = shape('a', 0, 0)
    const b = shape('b', 300, 0)
    // The far end sits on the top of b; the near end leaves a towards that point, not towards b's middle.
    const r = resolveConnector(link({ x: 0, y: 0, nodeId: 'a' }, { x: 0, y: 0, nodeId: 'b', port: { x: 0, y: -1 } }), docOf(a, b))
    expect(r.to).toEqual({ x: 350, y: -6 })
    expect(r.from.x).toBe(106)
    expect(r.from.y).toBeLessThan(30)
  })

  it('falls back to the stored point when the object is gone', () => {
    const r = resolveConnector(link({ x: 12, y: 34, nodeId: 'gone', port: { x: 1, y: 0 } }, { x: 200, y: 34 }), docOf())
    expect(r.from).toEqual({ x: 12, y: 34 })
  })
})

describe('a right-angled line with one corner', () => {
  const a = shape('a', 0, 0)
  const b = shape('b', 300, 300)
  const doc = docOf(a, b)

  it('leaves sideways and arrives from above', () => {
    const c = link({ x: 0, y: 0, nodeId: 'a' }, { x: 0, y: 0, nodeId: 'b' }, { route: 'elbow', legs: 'hv' })
    const r = resolveConnector(c, doc)
    expect(r.from).toEqual({ x: 106, y: 30 })
    expect(r.to).toEqual({ x: 350, y: 294 })
    expect(r.via).toEqual([{ x: 350, y: 30 }])
    expect(connectorMid(r)).toEqual({ x: 350, y: 30 })
    // The line turns at the corner and stops where the head, pointing down into b, begins.
    expect(connectorShape('arrow', 2, r).d).toMatch(/^M106,30 L350,30 L350,2\d\d/)
  })

  it('leaves downwards and arrives from the side', () => {
    const c = link({ x: 0, y: 0, nodeId: 'a' }, { x: 0, y: 0, nodeId: 'b' }, { route: 'elbow', legs: 'vh' })
    const r = resolveConnector(c, doc)
    expect(r.from).toEqual({ x: 50, y: 66 })
    expect(r.to).toEqual({ x: 294, y: 330 })
    expect(r.via).toEqual([{ x: 50, y: 330 }])
  })

  it('has no middle stretch to move', () => {
    const c = link({ x: 0, y: 0, nodeId: 'a' }, { x: 0, y: 0, nodeId: 'b' }, { route: 'elbow', legs: 'hv' })
    expect(hasOneCorner(c)).toBe(true)
    expect(bendThrough(c, doc, { x: 200, y: 200 })).toBeUndefined()
    expect(hasOneCorner({ route: 'elbow', legs: 'hh' })).toBe(false)
    expect(hasOneCorner({ route: 'elbow' })).toBe(false)
    expect(hasOneCorner({ legs: 'hv' })).toBe(false)
  })

  it('runs between ports', () => {
    const c = link({ x: 0, y: 0, nodeId: 'a', port: { x: -1, y: 0 } }, { x: 0, y: 0, nodeId: 'b', port: { x: 0.5, y: -1 } }, { route: 'elbow', legs: 'hv' })
    const r = resolveConnector(c, doc)
    expect(r.from).toEqual({ x: -6, y: 30 })
    expect(r.to).toEqual({ x: 375, y: 294 })
    expect(r.via).toEqual([{ x: 375, y: 30 }])
  })
})

describe('a right-angled line told which way to run', () => {
  // b lies further down than across, so BioSketch alone would run the line down, across and down.
  const a = shape('a', 0, 0)
  const b = shape('b', 200, 400)
  const doc = docOf(a, b)

  it('runs across, down and across when asked', () => {
    const plain = resolveConnector(link({ x: 0, y: 0, nodeId: 'a' }, { x: 0, y: 0, nodeId: 'b' }, { route: 'elbow' }), doc)
    expect(plain.via).toEqual([{ x: 50, y: 230 }, { x: 250, y: 230 }])
    const sideways = link({ x: 0, y: 0, nodeId: 'a' }, { x: 0, y: 0, nodeId: 'b' }, { route: 'elbow', legs: 'hh' })
    const r = resolveConnector(sideways, doc)
    expect(r.from).toEqual({ x: 106, y: 30 })
    expect(r.to).toEqual({ x: 194, y: 430 })
    expect(r.via).toEqual([{ x: 150, y: 30 }, { x: 150, y: 430 }])
  })

  it('moves its middle stretch the way it runs', () => {
    const sideways = link({ x: 0, y: 0, nodeId: 'a' }, { x: 0, y: 0, nodeId: 'b' }, { route: 'elbow', legs: 'hh' })
    expect(bendThrough(sideways, doc, { x: 170, y: 200 })).toEqual({ x: 20, y: 0 })
    const r = resolveConnector({ ...sideways, bend: { x: 20, y: 0 } }, doc)
    expect(r.via).toEqual([{ x: 170, y: 30 }, { x: 170, y: 430 }])
  })

  it('swaps across and down when turned a quarter', () => {
    const c = link({ x: 0, y: 0 }, { x: 100, y: 50 }, { route: 'elbow', legs: 'hv' })
    expect(rotateNodeAbout(c, 90, { x: 0, y: 0 }, docOf(c)).legs).toBe('vh')
    expect(rotateNodeAbout(c, 180, { x: 0, y: 0 }, docOf(c)).legs).toBe('hv')
    expect(rotateNodeAbout(c, 30, { x: 0, y: 0 }, docOf(c)).legs).toBe('hv')
  })
})

describe('ports and corners in a figure file', () => {
  const file = (connector: Record<string, unknown>) => ({
    version: 1,
    name: 'x',
    width: 100,
    height: 100,
    background: '#ffffff',
    customIcons: {},
    nodes: [shape('a', 0, 0), { id: 'c', type: 'connector', kind: 'arrow', stroke: '#000000', strokeWidth: 2, ...connector }],
  })
  const read = (connector: Record<string, unknown>): ConnectorNode => validateDoc(file(connector)).nodes[1] as ConnectorNode

  it('keeps a port of an attached end, inside the box', () => {
    const c = read({ from: { x: 1, y: 2, nodeId: 'a', port: { x: 0.5, y: -1 } }, to: { x: 9, y: 9, nodeId: 'a', port: { x: 7, y: -30 } } })
    expect(c.from).toEqual({ x: 1, y: 2, nodeId: 'a', port: { x: 0.5, y: -1 } })
    expect(c.to).toEqual({ x: 9, y: 9, nodeId: 'a', port: { x: 1, y: -1 } })
  })

  it('drops a port that is not a place, or belongs to a free end', () => {
    const c = read({ from: { x: 1, y: 2, port: { x: 0.5, y: -1 } }, to: { x: 9, y: 9, nodeId: 'a', port: { x: 'left', y: 0 } } })
    expect(c.from).toEqual({ x: 1, y: 2 })
    expect(c.to).toEqual({ x: 9, y: 9, nodeId: 'a' })
    expect(read({ from: { x: 1, y: 2, nodeId: 'a', port: { x: Infinity, y: 0 } }, to: { x: 9, y: 9 } }).from).toEqual({ x: 1, y: 2, nodeId: 'a' })
  })

  it('keeps the way a right-angled line runs, and only for a right-angled line', () => {
    const ends = { from: { x: 0, y: 0 }, to: { x: 50, y: 50 } }
    expect(read({ ...ends, route: 'elbow', legs: 'hv' }).legs).toBe('hv')
    expect(read({ ...ends, route: 'elbow', legs: 'diagonal' }).legs).toBeUndefined()
    expect(read({ ...ends, legs: 'hv' }).legs).toBeUndefined()
  })
})
