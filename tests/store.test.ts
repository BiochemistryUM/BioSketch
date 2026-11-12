import { beforeEach, describe, expect, it } from 'vitest'
import {
  addIcon, alignSelection, copySelection, deleteSelection, duplicateSelection, groupSelection, nudge, pasteClipboard, patchSelection,
  selectAll, setTool, zoomBy,
} from '../src/actions'
import { addNodes, emptyDoc } from '../src/model/doc'
import type { IconNode, ShapeNode } from '../src/model/types'
import { useEditor } from '../src/store'

const E = () => useEditor.getState()
const box = (id: string, x = 0): ShapeNode => ({ id, type: 'shape', shape: 'rect', x, y: 0, w: 50, h: 50, rotation: 0, fill: '#fff', stroke: '#000', strokeWidth: 1 })

beforeEach(() => {
  E().loadDoc(emptyDoc())
  E().set({ clipboard: [], clipboardIcons: {}, view: { x: 0, y: 0, zoom: 1 }, canvasSize: { w: 800, h: 600 } })
})

describe('editor history', () => {
  it('records one undo step per change and can redo', () => {
    E().commit((d) => addNodes(d, [box('a')]))
    E().commit((d) => addNodes(d, [box('b')]))
    expect(E().doc.nodes).toHaveLength(2)
    E().undo()
    expect(E().doc.nodes.map((n) => n.id)).toEqual(['a'])
    E().redo()
    expect(E().doc.nodes).toHaveLength(2)
    E().undo()
    E().commit((d) => addNodes(d, [box('c')]))
    expect(E().future).toHaveLength(0)
  })

  it('ignores changes that change nothing', () => {
    E().commit((d) => d)
    expect(E().past).toHaveLength(0)
  })

  it('merges rapid changes of the same kind into one step', () => {
    E().commit((d) => addNodes(d, [box('a')]), { select: ['a'] })
    nudge(1, 0)
    nudge(1, 0)
    nudge(1, 0)
    expect((E().doc.nodes[0] as ShapeNode).x).toBe(3)
    expect(E().past).toHaveLength(2)
    E().undo()
    expect((E().doc.nodes[0] as ShapeNode).x).toBe(0)
  })

  it('does not merge edits made to different objects', () => {
    E().commit((d) => addNodes(d, [box('a'), box('b', 100)]), { select: ['a'] })
    patchSelection((n) => ({ ...n, opacity: 0.5 }), 'opacity')
    E().set({ selection: ['b'] })
    patchSelection((n) => ({ ...n, opacity: 0.5 }), 'opacity')
    E().undo()
    expect(E().doc.nodes[0].opacity).toBe(0.5)
    expect(E().doc.nodes[1].opacity).toBeUndefined()
  })

  it('treats a drag as one step and can cancel it', () => {
    E().commit((d) => addNodes(d, [box('a')]))
    E().beginGesture()
    for (let i = 1; i <= 5; i++) E().transient((start) => ({ ...start, nodes: [box('a', i * 10)] }))
    E().endGesture()
    expect((E().doc.nodes[0] as ShapeNode).x).toBe(50)
    expect(E().past).toHaveLength(2)
    E().beginGesture()
    E().transient((start) => ({ ...start, nodes: [] }))
    E().cancelGesture()
    expect(E().doc.nodes).toHaveLength(1)
    expect(E().past).toHaveLength(2)
  })

  it('does not record a drag that ended where it started', () => {
    E().beginGesture()
    E().endGesture()
    expect(E().past).toHaveLength(0)
  })

  it('drops deleted nodes from the selection on undo', () => {
    E().commit((d) => addNodes(d, [box('a')]), { select: ['a'] })
    E().undo()
    expect(E().selection).toEqual([])
  })
})

describe('commands', () => {
  it('places an icon in the middle of the view and selects it', () => {
    const id = addIcon('mitochondrion')!
    const node = E().doc.nodes[0] as IconNode
    expect(node.id).toBe(id)
    expect(node.x + node.w / 2).toBe(400)
    expect(node.y + node.h / 2).toBe(300)
    expect(E().selection).toEqual([id])
    expect(addIcon('does-not-exist')).toBeNull()
  })

  it('copies, pastes, duplicates and deletes', () => {
    E().commit((d) => addNodes(d, [box('a'), box('b', 100)]), { select: ['a'] })
    copySelection()
    pasteClipboard()
    pasteClipboard()
    expect(E().doc.nodes).toHaveLength(4)
    expect((E().doc.nodes[2] as ShapeNode).x).toBe(20)
    expect((E().doc.nodes[3] as ShapeNode).x).toBe(40)
    duplicateSelection()
    expect(E().doc.nodes).toHaveLength(5)
    deleteSelection()
    expect(E().doc.nodes).toHaveLength(4)
    expect(E().selection).toEqual([])
  })

  it('selects all, groups, aligns and patches', () => {
    E().commit((d) => addNodes(d, [box('a'), box('b', 100)]))
    selectAll()
    expect(E().selection).toEqual(['a', 'b'])
    alignSelection('left')
    expect((E().doc.nodes[1] as ShapeNode).x).toBe(0)
    groupSelection()
    expect(E().doc.nodes[0].groupId).toBeTruthy()
    expect(E().doc.nodes[0].groupId).toBe(E().doc.nodes[1].groupId)
    patchSelection((n) => ({ ...n, opacity: 0.5 }))
    expect(E().doc.nodes.every((n) => n.opacity === 0.5)).toBe(true)
  })

  it('clears the selection when leaving the select tool', () => {
    E().commit((d) => addNodes(d, [box('a')]), { select: ['a'] })
    setTool('pen')
    expect(E().selection).toEqual([])
    expect(E().tool).toBe('pen')
  })

  it('zooms about a fixed point and stays within limits', () => {
    zoomBy(2, { x: 100, y: 100 })
    expect(E().view).toEqual({ zoom: 2, x: -100, y: -100 })
    zoomBy(1000)
    expect(E().view.zoom).toBe(8)
    zoomBy(0.00001)
    expect(E().view.zoom).toBe(0.1)
  })
})
