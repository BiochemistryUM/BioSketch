// Favourite icons and the icons used last: lists of ids of icons of the collections.

import { beforeEach, describe, expect, it } from 'vitest'
import { addIcon, toggleFavouriteIcon } from '../src/actions'
import { FAVOURITES_MAX, RECENT_MAX, fromCollection, readIds, storedFavourites, storedRecent, toggleId, usedId } from '../src/icons/favourites'
import { emptyDoc } from '../src/model/doc'
import { useEditor } from '../src/store'
import { stubIcon } from './helpers'

const CELL = 'nih-cells--macrophage'
const DNA = 'nih-molecules--dna'

describe('favourite icons and the icons used last', () => {
  it('are icons of the collections only', () => {
    expect(fromCollection(CELL)).toBe(true)
    // An icon imported into one figure, or a piece of a split icon, lives in that figure alone.
    expect(fromCollection('custom-abc123')).toBe(false)
    expect(fromCollection('part-xyz')).toBe(false)
  })

  it('are read back as untrusted data', () => {
    expect(readIds(JSON.stringify([CELL, DNA, CELL, 12, null, 'custom-1', '<script>', 'a--' + 'x'.repeat(80)]), 10)).toEqual([CELL, DNA])
    expect(readIds('not json', 10)).toEqual([])
    expect(readIds(JSON.stringify({ a: 1 }), 10)).toEqual([])
    expect(readIds(null, 10)).toEqual([])
    expect(readIds(JSON.stringify(Array.from({ length: 50 }, (_, i) => `nih-cells--icon-${i}`)), 5)).toHaveLength(5)
  })

  it('gain a favourite in front and lose it again on a second press', () => {
    const one = toggleId([], CELL)
    expect(one).toEqual([CELL])
    expect(toggleId(one, DNA)).toEqual([DNA, CELL])
    expect(toggleId([DNA, CELL], CELL)).toEqual([DNA])
    expect(toggleId(one, 'custom-1')).toBe(one)
    const full = Array.from({ length: FAVOURITES_MAX }, (_, i) => `nih-cells--icon-${i}`)
    expect(toggleId(full, CELL)).toHaveLength(FAVOURITES_MAX)
  })

  it('keep the icons used last newest first, each once', () => {
    const list = usedId(usedId([], CELL), DNA)
    expect(list).toEqual([DNA, CELL])
    expect(usedId(list, CELL)).toEqual([CELL, DNA])
    // The icon used last, used again: nothing changes.
    expect(usedId(list, DNA)).toBe(list)
    expect(usedId(list, 'custom-1')).toBe(list)
    const many = Array.from({ length: RECENT_MAX + 6 }, (_, i) => `nih-cells--icon-${i}`).reduce(usedId, [] as string[])
    expect(many).toHaveLength(RECENT_MAX)
    expect(many[0]).toBe(`nih-cells--icon-${RECENT_MAX + 5}`)
  })
})

describe('in the editor', () => {
  const E = () => useEditor.getState()
  beforeEach(() => {
    localStorage.clear()
    E().loadDoc({ ...emptyDoc(), customIcons: { [CELL]: stubIcon(CELL), 'custom-1': stubIcon('custom-1') } })
    E().set({ favouriteIcons: [], recentIcons: [], canvasSize: { w: 800, h: 600 }, view: { x: 0, y: 0, zoom: 1 } })
  })

  it('remembers a placed icon of a collection, in the browser too', () => {
    addIcon(CELL)
    addIcon('custom-1')
    expect(E().recentIcons).toEqual([CELL])
    expect(storedRecent()).toEqual([CELL])
    // An icon that does not exist is not remembered.
    addIcon('nih-cells--no-such-icon')
    expect(E().recentIcons).toEqual([CELL])
  })

  it('marks and unmarks a favourite, and keeps the list for the next visit', () => {
    toggleFavouriteIcon(CELL)
    expect(E().favouriteIcons).toEqual([CELL])
    expect(storedFavourites()).toEqual([CELL])
    toggleFavouriteIcon(CELL)
    expect(E().favouriteIcons).toEqual([])
    expect(storedFavourites()).toEqual([])
    // Not a step for Undo: it changes nothing in the figure.
    expect(E().past.length).toBe(0)
  })
})
