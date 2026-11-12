// jsdom has no IndexedDB, so these tests exercise the localStorage fallback that private
// browser windows also end up using.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadCurrent, saveCurrent } from '../src/io/storage'
import { TEMPLATES } from '../src/templates'

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('autosave', () => {
  it('returns nothing when no figure was saved', async () => {
    expect(await loadCurrent()).toBeNull()
  })

  it('saves a figure and loads it back unchanged', async () => {
    const doc = TEMPLATES[0].build()
    expect(await saveCurrent(doc)).toBe(true)
    expect(await loadCurrent()).toEqual(doc)
  })

  it('keeps only the latest figure', async () => {
    await saveCurrent(TEMPLATES[0].build())
    const second = TEMPLATES[1].build()
    await saveCurrent(second)
    expect((await loadCurrent())?.name).toBe(second.name)
  })

  it('ignores a saved figure that is corrupt instead of crashing on start', async () => {
    localStorage.setItem('current-figure', '{"nodes": "broken"')
    expect(await loadCurrent()).toBeNull()
    localStorage.setItem('current-figure', '{"hello": 1}')
    expect(await loadCurrent()).toBeNull()
  })

  it('reports failure when the browser refuses to store anything', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(await saveCurrent(TEMPLATES[0].build())).toBe(false)
  })
})
