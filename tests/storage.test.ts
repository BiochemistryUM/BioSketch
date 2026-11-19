// jsdom has no IndexedDB, so these tests exercise the localStorage fallback that private
// browser windows also end up using.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteFigure, listFigures, loadFigure, loadStartup, saveFigure, setCurrentFigure } from '../src/io/storage'
import { serializeDoc } from '../src/io/files'
import { TEMPLATES } from '../src/templates'
import { example } from './helpers'

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('saved figures', () => {
  it('starts with a new empty figure when nothing was saved', async () => {
    const start = await loadStartup()
    expect(start.doc).toBeNull()
    expect(start.id).toMatch(/^[\w-]+$/)
    expect(await listFigures()).toEqual([])
  })

  it('saves a figure and loads it back unchanged', async () => {
    const doc = example(TEMPLATES[0])
    expect(await saveFigure('one', doc)).toBe(true)
    expect(await loadFigure('one')).toEqual(doc)
    expect(await loadFigure('missing')).toBeNull()
  })

  it('keeps several figures, most recently saved first', async () => {
    const a = example(TEMPLATES[0])
    const b = example(TEMPLATES[1])
    vi.spyOn(Date, 'now').mockReturnValue(1000)
    await saveFigure('a', a)
    vi.spyOn(Date, 'now').mockReturnValue(2000)
    await saveFigure('b', b)
    expect((await listFigures()).map((f) => f.id)).toEqual(['b', 'a'])
    vi.spyOn(Date, 'now').mockReturnValue(3000)
    await saveFigure('a', { ...a, name: 'Renamed' })
    const list = await listFigures()
    expect(list.map((f) => f.id)).toEqual(['a', 'b'])
    expect(list[0]).toMatchObject({ name: 'Renamed', objects: a.nodes.length, updated: 3000 })
  })

  it('reopens the figure that was open last time', async () => {
    await saveFigure('a', example(TEMPLATES[0]))
    await saveFigure('b', example(TEMPLATES[1]))
    await setCurrentFigure('a')
    const start = await loadStartup()
    expect(start.id).toBe('a')
    expect(start.doc?.name).toBe(example(TEMPLATES[0]).name)
  })

  it('falls back to the most recent figure when the last one is gone', async () => {
    await saveFigure('a', example(TEMPLATES[0]))
    await setCurrentFigure('deleted-id')
    expect((await loadStartup()).id).toBe('a')
  })

  it('deletes a figure and its list entry', async () => {
    await saveFigure('a', example(TEMPLATES[0]))
    await saveFigure('b', example(TEMPLATES[1]))
    await deleteFigure('a')
    expect((await listFigures()).map((f) => f.id)).toEqual(['b'])
    expect(await loadFigure('a')).toBeNull()
  })

  it('carries over the single figure saved by earlier versions', async () => {
    const old = example(TEMPLATES[1])
    localStorage.setItem('current-figure', serializeDoc(old))
    const start = await loadStartup()
    expect(start.doc).toEqual(old)
    expect(await listFigures()).toHaveLength(1)
    // Carried over once: starting again finds the same figure, not a second copy.
    expect((await loadStartup()).id).toBe(start.id)
    expect(await listFigures()).toHaveLength(1)
  })

  it('ignores a saved figure that is corrupt instead of crashing on start', async () => {
    localStorage.setItem('biosketch.index', JSON.stringify([{ id: 'x', name: 'Broken', updated: 1, objects: 3 }]))
    localStorage.setItem('biosketch.fig:x', '{"nodes": "broken"')
    const start = await loadStartup()
    expect(start.id).toBe('x')
    expect(start.doc).toBeNull()
    localStorage.setItem('biosketch.index', 'not json')
    expect(await listFigures()).toEqual([])
  })

  it('reports failure when the browser refuses to store anything', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(await saveFigure('a', example(TEMPLATES[0]))).toBe(false)
  })
})
