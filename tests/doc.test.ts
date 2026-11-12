import { describe, expect, it } from 'vitest'
import {
  alignNodes, cloneNodes, distributeNodes, duplicateNodes, emptyDoc, expandGroups, freezeEndpoints, groupNodes, nodesInRect,
  removeNodes, reorder, selectionRect, ungroupNodes, updateNodes, usedIconIds,
} from '../src/model/doc'
import { getRect } from '../src/model/nodes'
import type { ConnectorNode, FigDoc, FigNode, IconNode, ShapeNode } from '../src/model/types'

const box = (id: string, x: number, y: number, w = 50, h = 50, extra: Partial<ShapeNode> = {}): ShapeNode => ({
  id, type: 'shape', shape: 'rect', x, y, w, h, rotation: 0, fill: '#fff', stroke: '#000', strokeWidth: 1, ...extra,
})
const arrow = (id: string, from: string, to: string): ConnectorNode => ({
  id, type: 'connector', from: { x: 0, y: 0, nodeId: from }, to: { x: 0, y: 0, nodeId: to }, kind: 'arrow', stroke: '#000', strokeWidth: 2,
})
const docOf = (...nodes: FigNode[]): FigDoc => ({ ...emptyDoc(), nodes })
const ids = (d: FigDoc) => d.nodes.map((n) => n.id).join('')

describe('document operations', () => {
  it('returns the same document when nothing changes', () => {
    const d = docOf(box('a', 0, 0))
    expect(updateNodes(d, ['a'], (n) => n)).toBe(d)
    expect(updateNodes(d, [], (n) => ({ ...n }))).toBe(d)
    expect(removeNodes(d, [])).toBe(d)
  })

  it('releases connectors when their node is deleted, keeping them in place', () => {
    const d = docOf(box('a', 0, 0), box('b', 200, 0), arrow('c', 'a', 'b'))
    const next = removeNodes(d, ['b'])
    const c = next.nodes.find((n) => n.id === 'c') as ConnectorNode
    expect(c.from.nodeId).toBe('a')
    expect(c.to.nodeId).toBeUndefined()
    expect(c.to.x).toBeCloseTo(194)
    expect(c.to.y).toBeCloseTo(25)
  })

  it('reorders in all four ways', () => {
    const d = docOf(box('a', 0, 0), box('b', 0, 0), box('c', 0, 0), box('d', 0, 0))
    expect(ids(reorder(d, ['a'], 'front'))).toBe('bcda')
    expect(ids(reorder(d, ['d'], 'back'))).toBe('dabc')
    expect(ids(reorder(d, ['a'], 'forward'))).toBe('bacd')
    expect(ids(reorder(d, ['d'], 'backward'))).toBe('abdc')
    expect(ids(reorder(d, ['a', 'b'], 'forward'))).toBe('cabd')
    expect(ids(reorder(d, ['d'], 'forward'))).toBe('abcd')
  })

  it('duplicates with new ids, keeping groups and arrows between the copies', () => {
    const d = groupNodes(docOf(box('a', 0, 0), box('b', 200, 0), arrow('c', 'a', 'b')), ['a', 'b'])
    const result = duplicateNodes(d, ['a', 'b', 'c'])
    expect(result.doc.nodes).toHaveLength(6)
    const [a2, b2, c2] = result.ids.map((id) => result.doc.nodes.find((n) => n.id === id)!)
    expect(new Set(result.ids).size).toBe(3)
    expect(result.ids).not.toContain('a')
    expect(a2.groupId).toBe(b2.groupId)
    expect(a2.groupId).not.toBe(d.nodes[0].groupId)
    expect((c2 as ConnectorNode).from.nodeId).toBe(a2.id)
    expect((c2 as ConnectorNode).to.nodeId).toBe(b2.id)
    expect((a2 as ShapeNode).x).toBe(20)
  })

  it('keeps an arrow attached to the original when only the arrow is copied', () => {
    const d = docOf(box('a', 0, 0), box('b', 200, 0), arrow('c', 'a', 'b'))
    const [copy] = cloneNodes([d.nodes[2]], d, 0, 0) as ConnectorNode[]
    expect(copy.from.nodeId).toBe('a')
  })

  it('releases pasted arrows whose node no longer exists, at the frozen position', () => {
    const d = docOf(box('a', 0, 0), box('b', 200, 0), arrow('c', 'a', 'b'))
    const frozen = freezeEndpoints([d.nodes[2]], d)
    const [copy] = cloneNodes(frozen, docOf(), 0, 0) as ConnectorNode[]
    expect(copy.from.nodeId).toBeUndefined()
    expect(copy.from.x).toBeCloseTo(56)
  })

  it('expands a selection to whole groups and ungroups again', () => {
    const d = groupNodes(docOf(box('a', 0, 0), box('b', 100, 0), box('c', 200, 0)), ['a', 'b'])
    expect(expandGroups(d, ['a'])).toEqual(['a', 'b'])
    expect(expandGroups(d, ['c'])).toEqual(['c'])
    expect(expandGroups(ungroupNodes(d, ['a', 'b']), ['a'])).toEqual(['a'])
    expect(groupNodes(d, ['c'])).toBe(d)
  })

  it('aligns, moving each group as one unit', () => {
    const d = groupNodes(docOf(box('a', 100, 0), box('b', 160, 0), box('c', 0, 100)), ['a', 'b'])
    const next = alignNodes(d, ['a', 'b', 'c'], 'left')
    const x = (id: string) => getRect(next.nodes.find((n) => n.id === id)!, next).x
    expect(x('a')).toBe(0)
    expect(x('b')).toBe(60)
    expect(x('c')).toBe(0)
    expect(alignNodes(d, ['c'], 'left')).toBe(d)
  })

  it('distributes with equal gaps', () => {
    const d = docOf(box('a', 0, 0), box('b', 60, 0), box('c', 300, 0))
    const next = distributeNodes(d, ['a', 'b', 'c'], 'h')
    expect((next.nodes[1] as ShapeNode).x).toBe(150)
    expect((next.nodes[0] as ShapeNode).x).toBe(0)
    expect((next.nodes[2] as ShapeNode).x).toBe(300)
  })

  it('finds nodes in a rectangle and measures a selection', () => {
    const d = docOf(box('a', 0, 0), box('b', 500, 500))
    expect(nodesInRect(d, { x: -10, y: -10, w: 100, h: 100 })).toEqual(['a'])
    expect(selectionRect(d, ['a', 'b'])).toEqual({ x: 0, y: 0, w: 550, h: 550 })
    expect(selectionRect(d, [])).toBeNull()
  })

  it('does not select a container when the selection box is drawn inside it', () => {
    const cell: FigNode = { id: 'cell', type: 'membrane', points: [{ x: 0, y: 0 }, { x: 600, y: 0 }, { x: 600, y: 400 }, { x: 0, y: 400 }], closed: true, thickness: 20, headColor: '#000', tailColor: '#000' }
    const d = docOf(cell, box('a', 100, 100), box('b', 300, 100))
    expect(nodesInRect(d, { x: 90, y: 90, w: 280, h: 80 })).toEqual(['a', 'b'])
    // A box that crosses the cell boundary, or surrounds the cell, still selects it.
    expect(nodesInRect(d, { x: -50, y: 90, w: 220, h: 80 })).toEqual(['cell', 'a'])
    expect(nodesInRect(d, { x: -100, y: -100, w: 900, h: 700 })).toEqual(['cell', 'a', 'b'])
  })

  it('ignores attached arrows when aligning and distributing', () => {
    const d = docOf(box('a', 0, 0), box('b', 60, 0), box('c', 300, 0), arrow('ab', 'a', 'b'), arrow('bc', 'b', 'c'))
    const next = distributeNodes(d, ['a', 'b', 'c', 'ab', 'bc'], 'h')
    expect((next.nodes[1] as ShapeNode).x).toBe(150)
    const aligned = alignNodes(docOf(box('a', 0, 0), box('b', 200, 40), arrow('ab', 'a', 'b')), ['a', 'b', 'ab'], 'top')
    expect((aligned.nodes[1] as ShapeNode).y).toBe(0)
  })

  it('lists each used icon once', () => {
    const icon = (id: string, iconId: string): IconNode => ({ id, type: 'icon', iconId, x: 0, y: 0, w: 10, h: 10, rotation: 0 })
    expect(usedIconIds(docOf(icon('1', 'cell'), icon('2', 'cell'), icon('3', 'dna')))).toEqual(['cell', 'dna'])
  })
})
