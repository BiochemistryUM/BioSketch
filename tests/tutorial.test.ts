// The tour of the features: a figure of twelve slides built from real objects.

import { describe, expect, it } from 'vitest'
import { serializeDoc, validateDoc } from '../src/io/files'
import { chartLayout } from '../src/model/chart'
import { rectsIntersect } from '../src/model/geometry'
import { getRect } from '../src/model/nodes'
import { everyNode, slideCount, slideDocs, slideIndex } from '../src/model/slides'
import type { FigNode, Rect } from '../src/model/types'
import { buildTemplate } from '../src/templates'
import { TUTORIAL, tutorialDoc } from '../src/tutorial'
import { PACKS, example, loadStub, packIcons } from './helpers'

const tour = example(TUTORIAL)
const slides = slideDocs(tour)

describe('the tour of the features', () => {
  it('is a figure of twelve wide slides, open on the first', () => {
    expect(slideCount(tour)).toBe(12)
    expect(slideIndex(tour)).toBe(0)
    expect([tour.width, tour.height]).toEqual([1280, 720])
    expect(tour.name).toBe('Tour of the features')
  })

  it('is the same figure every time it is built', () => {
    expect(tutorialDoc(packIcons)).toEqual(tutorialDoc(packIcons))
  })

  it('holds nothing a figure file would not keep', () => {
    // Every field of every object survives being saved and opened: nothing is misspelt or out of range.
    expect(validateDoc(JSON.parse(serializeDoc(tour)))).toEqual(tour)
    const ids = everyNode(tour).map((n) => n.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => /^[\w-]{1,64}$/.test(id))).toBe(true)
  })

  it('uses icons the collections really have, and is given their drawings', async () => {
    expect(TUTORIAL.icons.every((id) => packIcons(id))).toBe(true)
    const placed = new Set(everyNode(tour).flatMap((n) => (n.type === 'icon' ? [n.iconId] : [])))
    expect([...placed].sort()).toEqual([...TUTORIAL.icons].sort())
    const built = await buildTemplate(TUTORIAL, PACKS, loadStub)
    expect(Object.keys(built.customIcons).sort()).toEqual([...TUTORIAL.icons].sort())
    // The icons of every slide, not only of the first.
    expect(Object.keys(built.customIcons).length).toBeGreaterThan(slides[0].nodes.filter((n) => n.type === 'icon').length - 1)
    expect(slideCount(built)).toBe(12)
  })

  it('keeps everything on the page', () => {
    for (const [i, slide] of slides.entries()) {
      for (const node of slide.nodes) {
        const r = getRect(node, slide)
        const where = `slide ${i + 1}, ${node.type} ${node.id}${node.type === 'text' ? ` “${node.text.slice(0, 30)}”` : ''}`
        expect(r.x, where).toBeGreaterThanOrEqual(0)
        expect(r.y, where).toBeGreaterThanOrEqual(0)
        expect(r.x + r.w, where).toBeLessThanOrEqual(slide.width)
        expect(r.y + r.h, where).toBeLessThanOrEqual(slide.height)
      }
    }
  })

  it('has no lettering on top of other lettering or of a chart', () => {
    const shrink = (r: Rect): Rect => ({ x: r.x + 1, y: r.y + 1, w: Math.max(0, r.w - 2), h: Math.max(0, r.h - 2) })
    for (const [i, slide] of slides.entries()) {
      const texts = slide.nodes.filter((n) => n.type === 'text')
      const solid = slide.nodes.filter((n): n is FigNode => n.type === 'text' || n.type === 'chart')
      for (const t of texts) {
        for (const other of solid) {
          if (other === t) continue
          const clash = rectsIntersect(shrink(getRect(t, slide)), shrink(getRect(other, slide)))
          expect(clash, `slide ${i + 1}: “${t.type === 'text' ? t.text.slice(0, 30) : ''}” and ${other.type} ${other.id}`).toBe(false)
        }
      }
    }
  })

  it('draws every chart it shows', () => {
    const charts = everyNode(tour).filter((n) => n.type === 'chart')
    expect(charts.length).toBeGreaterThanOrEqual(9)
    for (const chart of charts) {
      const drawing = chartLayout(chart)
      const marks = drawing.rects.length + drawing.circles.length + drawing.paths.length + drawing.lines.length
      expect(marks, `${chart.kind} ${chart.id}`).toBeGreaterThan(0)
      expect(drawing.texts.length, `${chart.kind} ${chart.id}`).toBeGreaterThan(0)
    }
    // The brackets of the charts with a test carry a result, not an empty label.
    const tested = charts.filter((c) => c.test)
    expect(tested).toHaveLength(2)
    for (const chart of tested) expect(chartLayout(chart).texts.some((t) => /p [=<]|\*|ns/.test(t.text))).toBe(true)
  })

  it('has a heading and something numbered on every slide after the first', () => {
    for (const slide of slides.slice(1)) {
      const first = slide.nodes[0]
      expect(first.type === 'text' && first.bold && first.fontSize === 38).toBe(true)
      expect(slide.nodes.some((n) => n.type === 'shape' && n.shape === 'ellipse' && n.label?.text === '1')).toBe(true)
    }
  })
})
