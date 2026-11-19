// Where the note of an info button opens: beside the button where there is room, otherwise
// below or above it, and always inside the window.

import { describe, expect, it } from 'vitest'
import { INFO_GAP, INFO_MARGIN, placeInfo } from '../src/ui/infoPlace'

const button = (left: number, top: number) => ({ left, top, right: left + 20, bottom: top + 20 })

describe('the place of an info note', () => {
  it('opens at the left of a button in the side panel, level with it', () => {
    const at = placeInfo(button(1100, 300), 320, 180, 1400, 800)
    expect(at.left + 320).toBe(1100 - INFO_GAP)
    expect(at.top).toBe(294)
    expect(at.maxHeight).toBe(800 - 2 * INFO_MARGIN)
  })

  it('opens beside the panel the button sits in, so that it covers none of its settings', () => {
    const panel = { left: 1060, top: 40, right: 1400, bottom: 860 }
    for (const x of [1080, 1200, 1370]) {
      const at = placeInfo(button(x, 300), 320, 180, 1400, 800, panel)
      expect(at.left + 320).toBe(1060 - INFO_GAP)
      expect(at.top).toBe(294)
    }
    // A panel that fills the window leaves no room beside it: the note opens below the button.
    const phone = placeInfo(button(200, 100), 320, 180, 375, 700, { left: 35, top: 40, right: 375, bottom: 700 })
    expect(phone.top).toBe(120 + INFO_GAP)
  })

  it('stays inside the window near its top and bottom edges', () => {
    expect(placeInfo(button(1100, 2), 320, 180, 1400, 800).top).toBe(INFO_MARGIN)
    const low = placeInfo(button(1100, 770), 320, 180, 1400, 800)
    expect(low.top + 180).toBe(800 - INFO_MARGIN)
  })

  it('opens at the right when there is no room at the left', () => {
    const at = placeInfo(button(100, 300), 320, 180, 1400, 800)
    expect(at.left).toBe(120 + INFO_GAP)
  })

  it('opens below the button in a narrow window, and above it when there is more room there', () => {
    const below = placeInfo(button(200, 100), 320, 180, 375, 700)
    expect(below.top).toBe(120 + INFO_GAP)
    expect(below.left).toBeGreaterThanOrEqual(INFO_MARGIN)
    expect(below.left + 320).toBeLessThanOrEqual(375 - INFO_MARGIN)
    const above = placeInfo(button(200, 600), 320, 180, 375, 700)
    expect(above.top + 180).toBe(600 - INFO_GAP)
  })

  it('limits the height of a note longer than the room it has, so that it scrolls', () => {
    const tall = placeInfo(button(1100, 300), 320, 2000, 1400, 800)
    expect(tall.top).toBe(INFO_MARGIN)
    expect(tall.maxHeight).toBe(784)
    const narrow = placeInfo(button(200, 100), 320, 2000, 375, 700)
    expect(narrow.top).toBe(120 + INFO_GAP)
    expect(narrow.maxHeight).toBe(700 - INFO_MARGIN - 128)
    const high = placeInfo(button(200, 600), 320, 2000, 375, 700)
    expect(high.top).toBe(INFO_MARGIN)
    expect(high.maxHeight).toBe(600 - INFO_GAP - INFO_MARGIN)
  })

  it('always gives a place inside a window smaller than the note', () => {
    const at = placeInfo(button(10, 10), 320, 400, 200, 120)
    expect(at.left).toBe(INFO_MARGIN)
    expect(at.maxHeight).toBeGreaterThanOrEqual(40)
    expect(Number.isFinite(at.top)).toBe(true)
  })
})
