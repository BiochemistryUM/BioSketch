// Autosave and switching between saved figures. jsdom has no IndexedDB, so storage falls back to
// localStorage, as it does in a private browser window.

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { duplicateFigure, figureList, newFigure, openFigure, removeFigure } from '../src/figures'
import { flushSave, markSaved, startAutosave } from '../src/io/autosave'
import { listFigures, loadFigure } from '../src/io/storage'
import { addNodes, emptyDoc } from '../src/model/doc'
import type { ShapeNode } from '../src/model/types'
import { useEditor } from '../src/store'

const E = () => useEditor.getState()
const box = (id: string): ShapeNode => ({ id, type: 'shape', shape: 'rect', x: 0, y: 0, w: 10, h: 10, rotation: 0, fill: '#ffffff', stroke: '#000000', strokeWidth: 1 })
const draw = (id: string) => E().commit((d) => addNodes(d, [box(id)]))

beforeAll(() => startAutosave())

beforeEach(() => {
  localStorage.clear()
  E().set({ figureId: 'first' })
  E().loadDoc(emptyDoc())
  markSaved(E().doc)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('autosave', () => {
  it('writes a change half a second after it was made', async () => {
    vi.useFakeTimers()
    draw('a')
    await vi.advanceTimersByTimeAsync(400)
    expect(await loadFigure('first')).toBeNull()
    await vi.advanceTimersByTimeAsync(200)
    expect((await loadFigure('first'))?.nodes).toHaveLength(1)
  })

  it('does not write anything while an object is being dragged', async () => {
    vi.useFakeTimers()
    E().beginGesture()
    E().transient((d) => addNodes(d, [box('dragged')]))
    await vi.advanceTimersByTimeAsync(1000)
    expect(await loadFigure('first')).toBeNull()
    E().endGesture()
    await vi.advanceTimersByTimeAsync(600)
    expect((await loadFigure('first'))?.nodes).toHaveLength(1)
  })

  it('forgets a pending write when the figure is back at its stored state', async () => {
    draw('a')
    await flushSave()
    vi.useFakeTimers()
    draw('b')
    E().undo()
    await vi.advanceTimersByTimeAsync(1000)
    // The stored figure must match the screen: one object, not the undone second one.
    expect((await loadFigure('first'))?.nodes.map((n) => n.id)).toEqual(['a'])
  })

  it('keeps a change that could not be written and writes it at the next attempt', async () => {
    draw('a')
    const refuse = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    await flushSave()
    expect(E().toast).toContain('Autosave is not available')
    refuse.mockRestore()
    expect(await loadFigure('first')).toBeNull()
    await flushSave()
    expect((await loadFigure('first'))?.nodes).toHaveLength(1)
  })

  it('shares one write between overlapping requests', async () => {
    draw('a')
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    await Promise.all([flushSave(), flushSave(), flushSave()])
    // One figure entry and one list entry, not three of each.
    expect(writes.mock.calls.filter(([key]) => String(key).includes('fig:'))).toHaveLength(1)
  })
})

describe('several figures', () => {
  it('keeps the figure you leave and opens the new one', async () => {
    draw('a')
    await newFigure({ ...emptyDoc('Second'), nodes: [box('b'), box('c')] })
    expect(E().figureId).not.toBe('first')
    expect(E().doc.name).toBe('Second')
    expect(E().past).toHaveLength(0)
    const list = await figureList()
    expect(list.map((f) => [f.name, f.objects]).sort()).toEqual([['Second', 2], ['Untitled figure', 1]])
  })

  it('does not list a figure that was never touched', async () => {
    await newFigure({ ...emptyDoc('Real'), nodes: [box('a')] })
    expect((await listFigures()).map((f) => f.name)).toEqual(['Real'])
    expect(await loadFigure('first')).toBeNull()
  })

  it('keeps an empty figure that was set up (named, sized) before leaving it', async () => {
    E().commit((d) => ({ ...d, name: 'Figure 3 draft', widthMm: 174 }))
    await newFigure({ ...emptyDoc('Other'), nodes: [box('a')] })
    expect((await listFigures()).map((f) => f.name).sort()).toEqual(['Figure 3 draft', 'Other'])
  })

  it('opens a saved figure and saves the open one first', async () => {
    draw('a')
    await newFigure({ ...emptyDoc('Second'), nodes: [box('b')] })
    const second = E().figureId
    draw('c')
    await openFigure('first')
    expect(E().figureId).toBe('first')
    expect(E().doc.nodes.map((n) => n.id)).toEqual(['a'])
    expect((await loadFigure(second))?.nodes.map((n) => n.id)).toEqual(['b', 'c'])
    await openFigure('does-not-exist')
    expect(E().figureId).toBe('first')
  })

  it('copies a figure under a new name', async () => {
    draw('a')
    await duplicateFigure('first')
    const names = (await figureList()).map((f) => f.name).sort()
    expect(names).toEqual(['Untitled figure', 'Untitled figure (copy)'])
  })

  it('deletes the open figure and opens another, or a new empty one when it was the last', async () => {
    draw('a')
    await newFigure({ ...emptyDoc('Second'), nodes: [box('b')] })
    const second = E().figureId
    await removeFigure(second)
    expect(E().figureId).toBe('first')
    expect((await listFigures()).map((f) => f.id)).toEqual(['first'])
    await removeFigure('first')
    expect(E().doc.nodes).toHaveLength(0)
    expect(E().figureId).not.toBe('first')
    // The deleted figure must not come back through a late autosave.
    await flushSave()
    expect(await loadFigure('first')).toBeNull()
    expect(await loadFigure(second)).toBeNull()
  })
})

describe('icon style and the list of figures', () => {
  it('does not keep an untouched figure just because it started in the flat style', async () => {
    localStorage.setItem('biosketch.icon-style', 'flat')
    await newFigure()
    expect(E().doc.iconStyle).toBe('flat')
    const blank = E().figureId
    await newFigure({ ...emptyDoc('Real'), nodes: [box('a')] })
    expect(await loadFigure(blank)).toBeNull()
    localStorage.removeItem('biosketch.icon-style')
  })
})
