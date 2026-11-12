import { describe, expect, it } from 'vitest'
import { connectorShape } from '../src/model/connector'
import { emptyDoc } from '../src/model/doc'
import { rectCenter, rotate } from '../src/model/geometry'
import { bendThrough, connectorMid, dragHandle, getBox, getRect, resizeNode, resolveConnector, rotateNode, translateNode } from '../src/model/nodes'
import type { ConnectorNode, FigDoc, MembraneNode, ShapeNode, TextNode } from '../src/model/types'

const shape = (id: string, x: number, y: number, w = 100, h = 60, extra: Partial<ShapeNode> = {}): ShapeNode => ({
  id, type: 'shape', shape: 'rect', x, y, w, h, rotation: 0, fill: '#fff', stroke: '#000', strokeWidth: 2, ...extra,
})
const link = (from: ConnectorNode['from'], to: ConnectorNode['to'], extra: Partial<ConnectorNode> = {}): ConnectorNode => ({
  id: 'c', type: 'connector', from, to, kind: 'arrow', stroke: '#000', strokeWidth: 2, ...extra,
})
const docOf = (...nodes: FigDoc['nodes']): FigDoc => ({ ...emptyDoc(), nodes })

describe('resize handles', () => {
  it('keeps the opposite corner fixed', () => {
    const box = dragHandle({ x: 0, y: 0, w: 100, h: 50, rotation: 0 }, 1, 1, { x: 200, y: 80 }, false)
    expect(box).toMatchObject({ x: 0, y: 0, w: 200, h: 80 })
  })

  it('keeps the opposite corner fixed for a rotated box', () => {
    const start = { x: 0, y: 0, w: 100, h: 50, rotation: 30 }
    const anchorBefore = rotate({ x: 0, y: 0 }, 30, rectCenter(start))
    const next = dragHandle(start, 1, 1, { x: 180, y: 160 }, false)
    const anchorAfter = rotate({ x: next.x, y: next.y }, 30, rectCenter(next))
    expect(anchorAfter.x).toBeCloseTo(anchorBefore.x)
    expect(anchorAfter.y).toBeCloseTo(anchorBefore.y)
  })

  it('keeps proportions when asked', () => {
    const box = dragHandle({ x: 0, y: 0, w: 100, h: 50, rotation: 0 }, 1, 1, { x: 300, y: 60 }, true)
    expect(box.w / box.h).toBeCloseTo(2)
  })

  it('never collapses below the minimum size', () => {
    const box = dragHandle({ x: 0, y: 0, w: 100, h: 50, rotation: 0 }, 1, 1, { x: -500, y: -500 }, false)
    expect(box.w).toBeGreaterThan(0)
    expect(box.h).toBeGreaterThan(0)
  })
})

describe('node transforms', () => {
  it('scales membrane points into the new box', () => {
    const m: MembraneNode = { id: 'm', type: 'membrane', points: [{ x: 0, y: 0 }, { x: 100, y: 100 }], closed: false, thickness: 20, headColor: '#000', tailColor: '#000' }
    const d = docOf(m)
    const before = getBox(m, d)
    const after = { ...before, w: before.w * 2 - 20, h: before.h }
    const resized = resizeNode(m, before, after) as MembraneNode
    expect(resized.points[1].x).toBeCloseTo(200)
    expect(resized.points[1].y).toBeCloseTo(100)
  })

  it('scales text by changing its font size and keeps it centred', () => {
    const t: TextNode = { id: 't', type: 'text', x: 100, y: 100, text: 'Hello', fontSize: 20, fill: '#000', align: 'center', rotation: 0 }
    const d = docOf(t)
    const before = getBox(t, d)
    const resized = resizeNode(t, before, { ...before, x: before.x - before.w / 2, y: before.y - before.h / 2, w: before.w * 2, h: before.h * 2 }) as TextNode
    expect(resized.fontSize).toBe(40)
    expect(rectCenter(getBox(resized, d)).x).toBeCloseTo(rectCenter(before).x)
  })

  it('anchors text by its alignment', () => {
    const base: TextNode = { id: 't', type: 'text', x: 100, y: 0, text: 'Hello', fontSize: 20, fill: '#000', align: 'left', rotation: 0 }
    const d = docOf(base)
    const w = getBox(base, d).w
    expect(getBox(base, d).x).toBe(100)
    expect(getBox({ ...base, align: 'center' }, d).x).toBeCloseTo(100 - w / 2)
    expect(getBox({ ...base, align: 'right' }, d).x).toBeCloseTo(100 - w)
  })

  it('rotates point-based nodes about their centre and box nodes by angle', () => {
    const m: MembraneNode = { id: 'm', type: 'membrane', points: [{ x: 0, y: 0 }, { x: 100, y: 0 }], closed: false, thickness: 20, headColor: '#000', tailColor: '#000' }
    const turned = rotateNode(m, 90, docOf(m))
    expect(turned.points[0].x).toBeCloseTo(50)
    expect(turned.points[0].y).toBeCloseTo(-50)
    expect(rotateNode(shape('a', 0, 0), 370, docOf()).rotation).toBe(10)
  })

  it('translates every kind of node', () => {
    expect(translateNode(shape('a', 0, 0), 5, 6)).toMatchObject({ x: 5, y: 6 })
    expect(translateNode(link({ x: 0, y: 0 }, { x: 10, y: 10 }), 5, 5).to).toEqual({ x: 15, y: 15 })
  })
})

describe('connectors', () => {
  it('stops at the edge of attached boxes, with a small gap', () => {
    const a = shape('a', 0, 0)
    const b = shape('b', 300, 0)
    const r = resolveConnector(link({ x: 0, y: 0, nodeId: 'a' }, { x: 0, y: 0, nodeId: 'b' }), docOf(a, b))
    expect(r.from).toEqual({ x: 106, y: 30 })
    expect(r.to).toEqual({ x: 294, y: 30 })
    expect(r.ctrl).toBeNull()
  })

  it('follows a node when it moves', () => {
    const a = shape('a', 0, 0)
    const c = link({ x: 0, y: 0, nodeId: 'a' }, { x: 500, y: 30 })
    const before = resolveConnector(c, docOf(a))
    const after = resolveConnector(c, docOf(translateNode(a, 0, 200)))
    expect(after.from.y).toBeGreaterThan(before.from.y + 100)
  })

  it('meets an ellipse on its outline', () => {
    const e = shape('e', 0, 0, 100, 100, { shape: 'ellipse' })
    const r = resolveConnector(link({ x: 0, y: 0, nodeId: 'e' }, { x: 300, y: 300 }), docOf(e))
    expect(Math.hypot(r.from.x - 50, r.from.y - 50)).toBeCloseTo(56)
  })

  it('meets a rotated box on its real outline, not its bounding rectangle', () => {
    const tall = shape('a', 0, 0, 200, 20, { rotation: 90 })
    const r = resolveConnector(link({ x: 0, y: 0, nodeId: 'a' }, { x: 500, y: 10 }), docOf(tall))
    // Rotated by 90 degrees the box is 20 wide: the arrow starts 10 + gap from its centre, not 100 + gap.
    expect(r.from.x).toBeCloseTo(100 + 10 + 6)
  })

  it('falls back to the stored point when the attached node is missing', () => {
    const r = resolveConnector(link({ x: 7, y: 8, nodeId: 'gone' }, { x: 50, y: 50 }), docOf())
    expect(r.from).toEqual({ x: 7, y: 8 })
  })

  it('bends through a dragged point and straightens when dragged back', () => {
    const c = link({ x: 0, y: 0 }, { x: 100, y: 0 })
    const d = docOf(c)
    const bend = bendThrough(c, d, { x: 50, y: 40 })!
    const mid = connectorMid(resolveConnector({ ...c, bend }, d))
    expect(mid.x).toBeCloseTo(50)
    expect(mid.y).toBeCloseTo(40)
    expect(bendThrough(c, d, { x: 50, y: 1 })).toBeUndefined()
  })

  it('draws heads and bars for each kind', () => {
    const r = { from: { x: 0, y: 0 }, to: { x: 100, y: 0 }, ctrl: null }
    expect(connectorShape('arrow', 2, r).heads).toHaveLength(1)
    expect(connectorShape('double', 2, r).heads).toHaveLength(2)
    expect(connectorShape('inhibit', 2, r).bars).toHaveLength(1)
    expect(connectorShape('line', 2, r)).toMatchObject({ heads: [], bars: [] })
    expect(connectorShape('arrow', 2, { ...r, ctrl: { x: 50, y: 50 } }).d).toContain('Q')
  })

  it('includes the curve in the connector bounds', () => {
    const c = link({ x: 0, y: 0 }, { x: 100, y: 0 }, { bend: { x: 0, y: 40 } })
    expect(getRect(c, docOf(c)).h).toBeCloseTo(40)
  })
})
