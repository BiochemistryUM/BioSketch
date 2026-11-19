// Reshaping an icon point by point: reading path data, moving single points, and turning simple
// shapes into paths.

import { describe, expect, it } from 'vitest'
import { anchorsOf, curvesOnly, formatPath, moveAnchor, parsePath } from '../src/icons/path'
import { countPoints, dropUnusedParts, movePoint, movePointInDoc, shapesToPaths } from '../src/icons/reshape'
import { emptyDoc } from '../src/model/doc'
import type { FigDoc, IconDef } from '../src/model/types'

const text = (d: string) => formatPath(parsePath(d))

describe('reading path data', () => {
  it('makes relative commands absolute and spells out shorthand lines', () => {
    expect(text('M10 10 l5 0 v5 h-5 z')).toBe('M10 10L15 10L15 15L10 15Z')
    expect(text('m1,2 3,4 5,6')).toBe('M1 2L4 6L9 12')
    expect(text('M0 0H10V10')).toBe('M0 0L10 0L10 10')
  })

  it('turns smooth curve shorthand into full curves', () => {
    // S mirrors the previous handle (5,5 about 10,0 gives 15,-5); T does the same for Q.
    expect(text('M0 0C0 5 5 5 10 0S20 5 20 0')).toBe('M0 0C0 5 5 5 10 0C15 -5 20 5 20 0')
    expect(text('M0 0Q5 5 10 0T20 0')).toBe('M0 0Q5 5 10 0Q15 -5 20 0')
    expect(text('M0 0S5 5 10 0')).toBe('M0 0C0 0 5 5 10 0')
  })

  it('reads arcs, also with their flags written without spaces', () => {
    expect(text('M0 0A5 5 0 0 1 10 0')).toBe('M0 0A5 5 0 0 1 10 0')
    expect(text('M0 0a5 5 0 0110 0')).toBe('M0 0A5 5 0 0 1 10 0')
    expect(text('M0 0a5 5 0 1 0-10 0')).toBe('M0 0A5 5 0 1 0 -10 0')
  })

  it('reads compact numbers and keeps what is valid before a mistake', () => {
    expect(text('M.5.5L-1-1 1e1,2E-1')).toBe('M0.5 0.5L-1 -1L10 0.2')
    expect(text('M0 0L5 5 L banana')).toBe('M0 0L5 5')
    expect(text('')).toBe('')
    expect(text('M0 0Z5 5')).toBe('M0 0Z')
  })

  it('starts a new stretch where the last one closed', () => {
    expect(text('M5 5l5 0z l0 5')).toBe('M5 5L10 5ZL5 10')
  })
})

describe('arcs as curves', () => {
  it('writes a half circle as two quarter curves that end where the arc ended', () => {
    const segs = curvesOnly(parsePath('M0 0A5 5 0 0 1 10 0'))
    expect(segs.map((s) => s.c).join('')).toBe('MCC')
    // Clockwise from (0,0) to (10,0) passes over the top, through (5,-5).
    expect(segs[1].v.slice(4).map((n) => Math.round(n * 1000) / 1000)).toEqual([5, -5])
    expect(segs[2].v.slice(4)).toEqual([10, 0])
    // A quarter-circle handle is 0.5523 of the radius long.
    expect(segs[1].v[0]).toBeCloseTo(0, 6)
    expect(segs[1].v[1]).toBeCloseTo(-5 * 0.5523, 3)
  })

  it('takes the long way round when asked, and the other side when the sweep is turned', () => {
    const long = curvesOnly(parsePath('M0 0A5 5 0 1 1 5 5'))
    expect(long.filter((s) => s.c === 'C')).toHaveLength(3)
    const under = curvesOnly(parsePath('M0 0A5 5 0 0 0 10 0'))
    expect(under[1].v.slice(4).map((n) => Math.round(n * 1000) / 1000)).toEqual([5, 5])
  })

  it('enlarges radii that are too small to reach, and draws a line for a flat arc', () => {
    const reach = curvesOnly(parsePath('M0 0A1 1 0 0 1 10 0'))
    expect(reach[1].v.slice(4).map((n) => Math.round(n * 1000) / 1000)).toEqual([5, -5])
    expect(formatPath(curvesOnly(parsePath('M0 0A0 5 0 0 1 10 0L20 0Z')))).toBe('M0 0L10 0L20 0Z')
  })

  it('leaves outlines without arcs as they are', () => {
    const d = 'M0 0L10 0C10 5 5 10 0 10Z'
    expect(formatPath(curvesOnly(parsePath(d)))).toBe(d)
  })
})

describe('moving one point of an outline', () => {
  it('lists each point once, also where a closed outline returns to its start', () => {
    expect(anchorsOf(parsePath('M0 0L10 0L10 10Z')).map((a) => a.index)).toEqual([0, 1, 2])
    // The last line ends on the starting point: one point, not two on top of each other.
    expect(anchorsOf(parsePath('M0 0L10 0L10 10L0 0Z')).map((a) => a.index)).toEqual([0, 1, 2])
    expect(anchorsOf(parsePath('M0 0L10 0M20 20L30 20')).map((a) => [a.index, a.x, a.y])).toEqual([[0, 0, 0], [1, 10, 0], [2, 20, 20], [3, 30, 20]])
  })

  it('moves a corner and nothing else', () => {
    expect(formatPath(moveAnchor(parsePath('M0 0L10 0L10 10Z'), 1, 2, -3))).toBe('M0 0L12 -3L10 10Z')
  })

  it('takes the curve handles on both sides along', () => {
    const moved = moveAnchor(parsePath('M0 0C0 5 5 10 10 10C15 10 20 5 20 0'), 1, 1, 1)
    expect(formatPath(moved)).toBe('M0 0C0 5 6 11 11 11C16 11 20 5 20 0')
  })

  it('keeps a closed outline closed when its starting point is moved', () => {
    const square = parsePath('M0 0L10 0L10 10L0 10L0 0Z')
    expect(formatPath(moveAnchor(square, 0, -2, -2))).toBe('M-2 -2L10 0L10 10L0 10L-2 -2Z')
    // A circle as four curves: moving the start moves the end and the handles next to both.
    const circle = parsePath('M10 0C10 5 5 10 0 10C-5 10 -10 5 -10 0C-10 -5 -5 -10 0 -10C5 -10 10 -5 10 0Z')
    expect(formatPath(moveAnchor(circle, 0, 4, 0))).toBe('M14 0C14 5 5 10 0 10C-5 10 -10 5 -10 0C-10 -5 -5 -10 0 -10C5 -10 14 -5 14 0Z')
  })

  it('leaves the path alone for a point that does not exist', () => {
    const d = 'M0 0L10 0Z'
    expect(formatPath(moveAnchor(parsePath(d), 9, 1, 1))).toBe(d)
    expect(formatPath(moveAnchor(parsePath(d), 2, 1, 1))).toBe(d)
  })
})

describe('reshaping icon markup', () => {
  it('turns simple shapes into paths and keeps their colours', () => {
    const out = shapesToPaths('<rect x="1" y="2" width="10" height="5" fill="#ff0000" stroke="#000000"/><line x1="0" y1="0" x2="4" y2="4" stroke="#000000"/><polygon points="0,0 4,0 4,4" fill="#00ff00"/>')
    expect(out).toBe('<path d="M1 2L11 2L11 7L1 7Z" fill="#ff0000" stroke="#000000"/><path d="M0 0L4 4" stroke="#000000"/><path d="M0 0L4 0L4 4Z" fill="#00ff00"/>')
  })

  it('draws a circle as four curves and a rounded rectangle with arcs', () => {
    const circle = shapesToPaths('<circle cx="10" cy="10" r="10"/>')
    expect(parsePath(/d="([^"]+)"/.exec(circle)![1]).map((s) => s.c).join('')).toBe('MCCCCZ')
    expect(countPoints(circle)).toBe(4)
    const rounded = shapesToPaths('<rect width="20" height="10" rx="3"/>')
    expect(parsePath(/d="([^"]+)"/.exec(rounded)![1]).map((s) => s.c).join('')).toBe('MLCLCLCLCZ')
  })

  it('converts the shapes inside clip paths too, but shows no points for them', () => {
    const body = '<defs><clipPath id="c"><rect width="5" height="5"/></clipPath></defs><circle r="3" clip-path="url(#c)"/>'
    const out = shapesToPaths(body)
    expect(out).toContain('<clipPath id="c"><path d="M0 0L5 0L5 5L0 5Z"/></clipPath>')
    expect(countPoints(out)).toBe(4)
  })

  it('treats copies of one outline as one shape: one set of points, and all copies move together', () => {
    // A drawing may draw an outline several times: filled, and again inside clip paths for shading.
    const layered = '<defs><clipPath id="a"><path d="M0 0L9 0L9 9Z"/></clipPath></defs><path d="M0 0L9 0L9 9Z" fill="#ff0000"/><g clip-path="url(#a)"><g transform="translate(-2 -2)"><path d="M0 0L9 0L9 9Z" fill="#00ff00"/></g></g><path d="M0 0L9 0L9 9Z" transform="rotate(90)" fill="#0000ff"/>'
    const moved = movePoint(layered, 0, 1, 3, 0)
    expect(moved.split('M0 0L12 0L9 9Z').length - 1).toBe(3)
    // The same outline under another transform is another shape and stays.
    expect(moved).toContain('<path d="M0 0L9 0L9 9Z" transform="rotate(90)" fill="#0000ff"/>')
  })

  it('moves a point of the right path', () => {
    const body = '<g transform="scale(2)"><path d="M0 0L10 0" stroke="#000000"/><path d="M0 5L10 5" stroke="#000000"/></g>'
    expect(movePoint(body, 1, 1, 0, 3)).toBe('<g transform="scale(2)"><path d="M0 0L10 0" stroke="#000000"/><path d="M0 5L10 8" stroke="#000000"/></g>')
    expect(movePoint(body, 7, 0, 1, 1)).toBe(body)
  })

  const icon = (id: string, category: string): IconDef => ({ id, name: 'Piece', category, tags: [], viewBox: [10, 10], body: '<path d="M0 0L10 0"/>', license: 'CC0', author: '', source: '' })

  it('changes the icon stored with the figure, and only that one', () => {
    const doc: FigDoc = { ...emptyDoc(), customIcons: { 'part-a': icon('part-a', 'Part'), 'part-b': icon('part-b', 'Part') } }
    const next = movePointInDoc(doc, 'part-a', 0, 1, 0, 5)
    expect(next.customIcons['part-a'].body).toBe('<path d="M0 0L10 5"/>')
    expect(next.customIcons['part-b']).toBe(doc.customIcons['part-b'])
    expect(movePointInDoc(doc, 'missing', 0, 1, 0, 5)).toBe(doc)
  })

  it('drops pieces nothing uses, but never an icon the user imported', () => {
    const doc: FigDoc = {
      ...emptyDoc(),
      nodes: [{ id: 'n', type: 'icon', iconId: 'part-a', x: 0, y: 0, w: 10, h: 10, rotation: 0 }],
      customIcons: { 'part-a': icon('part-a', 'Part'), 'part-b': icon('part-b', 'Part'), mine: icon('mine', 'Imported') },
    }
    expect(Object.keys(dropUnusedParts(doc).customIcons)).toEqual(['part-a', 'mine'])
    const tidy = { ...doc, customIcons: { 'part-a': doc.customIcons['part-a'] } }
    expect(dropUnusedParts(tidy)).toBe(tidy)
  })
})
