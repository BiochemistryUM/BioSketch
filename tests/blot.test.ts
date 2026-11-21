// Cropping placed pictures, lane labels and marker ladders (src/model/blot.ts).

import { describe, expect, it } from 'vitest'
import { renderSvg } from '../src/io/export'
import { validateDoc } from '../src/io/files'
import { cropImage, ladderPlaces, laneCentres, laneLabels, markerLadder, readLaneNames, readSizes } from '../src/model/blot'
import { emptyDoc } from '../src/model/doc'
import { measureText } from '../src/model/nodes'
import { scaleBarMarks } from '../src/model/scaleBar'
import type { ImageNode, ShapeNode, TextNode } from '../src/model/types'

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
const picture = (extra: Partial<ImageNode> = {}): ImageNode => ({ id: 'p', type: 'image', src: PNG, x: 100, y: 50, w: 400, h: 200, rotation: 0, ...extra })
let n = 0
const id = () => `n${++n}`

describe('cropping a picture', () => {
  it('keeps what stays in view where it was and at its size, and can be undone exactly', () => {
    const cut = cropImage(picture(), { x: 0.25, y: 0.1, w: 0.5, h: 0.8 })
    expect(cut).toMatchObject({ x: 200, y: 70, w: 200, h: 160, crop: { x: 0.25, y: 0.1, w: 0.5, h: 0.8 } })
    // Cropping again starts from the whole picture's size, not the cut one.
    expect(cropImage(cut, { x: 0.25, y: 0, w: 0.75, h: 1 })).toMatchObject({ x: 200, y: 50, w: 300, h: 200 })
    const whole = cropImage(cut, null)
    expect(whole).toEqual(picture())
  })

  it('keeps the middle in place on a turned picture', () => {
    const turned = picture({ rotation: 90 })
    const cut = cropImage(turned, { x: 0.5, y: 0, w: 0.5, h: 1 })
    // The right half of a picture turned a quarter clockwise lies below its middle on the page.
    expect(cut.x + cut.w / 2).toBeCloseTo(300, 6)
    expect(cut.y + cut.h / 2).toBeCloseTo(150 + 100, 6)
  })

  it('never leaves less than 2 % or reaches outside the picture', () => {
    expect(cropImage(picture(), { x: 0.9, y: -1, w: 0.5, h: 0 }).crop).toEqual({ x: 0.5, y: 0, w: 0.5, h: 0.02 })
  })

  it('keeps the scale bar right, is drawn clipped, and is kept when the figure is saved', () => {
    const scale = { pixel: 0.5, unit: 'µm' as const, pixels: 400, bar: 50 }
    const full = scaleBarMarks(picture({ scale }))!
    const cut = scaleBarMarks(cropImage(picture({ scale }), { x: 0.25, y: 0, w: 0.5, h: 1 }))!
    expect(cut.w).toBeCloseTo(full.w, 6)
    const doc = { ...emptyDoc(), nodes: [cropImage(picture(), { x: 0.25, y: 0.1, w: 0.5, h: 0.8 })] }
    expect((validateDoc(doc).nodes[0] as ImageNode).crop).toEqual({ x: 0.25, y: 0.1, w: 0.5, h: 0.8 })
    expect((validateDoc({ ...doc, nodes: [{ ...doc.nodes[0], crop: { x: 0.9, y: 0, w: 0.5, h: 1 } }] }).nodes[0] as ImageNode).crop).toBeUndefined()
    const { svg } = renderSvg(doc, { area: 'page', transparent: false, includeSketch: false })
    expect(svg).toMatch(/<clipPath id="p-crop">/)
    expect(svg).toMatch(/clip-path="url\(#p-crop\)"/)
  })
})

describe('lane labels', () => {
  it('reads names per line or with commas, and spreads the lanes evenly between the margins', () => {
    expect(readLaneNames('Marker\nWT\n\nKO ')).toEqual(['Marker', 'WT', 'KO'])
    expect(readLaneNames('WT, KO, KO + drug')).toEqual(['WT', 'KO', 'KO + drug'])
    expect(laneCentres(400, 4)).toEqual([50, 150, 250, 350])
    expect(laneCentres(400, 2, 0.25, 0.25)).toEqual([150, 250])
  })

  it('stands each name above its lane, upright or slanted from the lane up to the right', () => {
    const upright = laneLabels(picture(), ['WT', 'KO'], { angle: 0, fontSize: 12, left: 0, right: 0 }, id)
    expect(upright.map((t) => [t.text, t.x, t.align])).toEqual([['WT', 200, 'center'], ['KO', 400, 'center']])
    expect(upright.every((t) => t.y < 50)).toBe(true)
    const slanted = laneLabels(picture(), ['A long name'], { angle: 45, fontSize: 12, left: 0, right: 0 }, id)
    expect(slanted[0]).toMatchObject({ rotation: -45, align: 'left' })
    expect(slanted[0].x).toBeGreaterThan(200)
  })
})

describe('the marker ladder', () => {
  it('reads sizes in any order, largest first, and places the bands by the logarithm of their size', () => {
    expect(readSizes('25, 250 100;75, 25, 0, 37,5')).toEqual([250, 100, 75, 37.5, 25])
    const places = ladderPlaces([100, 10, 1], 0.1, 0.9)
    expect(places).toEqual([0.1, 0.5, 0.9])
  })

  it('puts a line and a size at every band beside the picture, with the unit over them', () => {
    const nodes = markerLadder(picture(), [100, 10, 1], { side: 'left', top: 0.1, bottom: 0.9, fontSize: 10, unit: 'kDa' }, id)
    const texts = nodes.filter((x): x is TextNode => x.type === 'text')
    const lines = nodes.filter((x): x is ShapeNode => x.type === 'shape')
    expect(texts.map((t) => t.text)).toEqual(['100', '10', '1', 'kDa'])
    expect(lines).toHaveLength(3)
    // Left of the picture, each line at its band.
    expect(lines.every((l) => l.x + l.w <= 100)).toBe(true)
    expect(lines.map((l) => Math.round(l.y + l.h / 2))).toEqual([70, 150, 230])
    expect(texts.every((t) => t.align === 'right' && t.x < 100)).toBe(true)
    expect(validateDoc({ ...emptyDoc(), nodes }).nodes).toHaveLength(nodes.length)
    const right = markerLadder(picture(), [50], { side: 'right', top: 0.5, bottom: 0.5, fontSize: 10, unit: '' }, id)
    expect(right.map((x) => x.type)).toEqual(['shape', 'text'])
    expect((right[1] as TextNode).x).toBeGreaterThan(500)
  })
})

describe('ladder numbers kept apart', () => {
  it('leaves places that are far enough apart where they are', async () => {
    const { spreadApart } = await import('../src/model/blot')
    expect(spreadApart([0, 20, 40], 10)).toEqual([0, 20, 40])
  })
  it('sets places that crowd as an even run centred where they were', async () => {
    const { spreadApart } = await import('../src/model/blot')
    const out = spreadApart([0, 50, 54, 100], 10)
    expect(out[0]).toBe(0)
    expect(out[1]).toBeCloseTo(47)
    expect(out[2]).toBeCloseTo(57)
    expect(out[3]).toBe(100)
    // a run that grows into its neighbour joins it
    const chain = spreadApart([0, 5, 10, 15], 10)
    for (let i = 1; i < chain.length; i++) expect(chain[i] - chain[i - 1]).toBeCloseTo(10)
    expect((chain[0] + chain[3]) / 2).toBeCloseTo(7.5)
  })
})

describe('size of lane names and ladder numbers', () => {
  it('is 7 pt in print when the figure has a printed width, else in step with the picture', async () => {
    const { blotLabelSize } = await import('../src/model/blot')
    // 180 mm over 1,200 units: 0.15 mm a unit; 7 pt = 2.469 mm = 16.5 units
    expect(blotLabelSize(300, 0.15)).toBeCloseTo(16.5, 1)
    expect(blotLabelSize(300, null)).toBe(10)
    expect(blotLabelSize(60, null)).toBe(8)
  })
})

describe('a crowded ladder', () => {
  it('runs every tick on to its number in a leader, and keeps the numbers apart', async () => {
    const { ladderCrowded } = await import('../src/model/blot')
    const sizes = [250, 150, 100, 75, 50, 37, 25, 20, 15, 10]
    const short = picture({ h: 135, w: 300 })
    const nodes = markerLadder(short, sizes, { side: 'left', top: 0.1, bottom: 0.9, fontSize: 16, unit: '' }, id)
    const texts = nodes.filter((x): x is TextNode => x.type === 'text')
    const lines = nodes.filter((x): x is ShapeNode => x.type === 'shape')
    expect(ladderCrowded(ladderPlaces(sizes, 0.1, 0.9).map((p) => p * 135), 16)).toBe(true)
    expect(lines).toHaveLength(sizes.length * 2)
    for (let i = 1; i < texts.length; i++) expect(texts[i].y - texts[i - 1].y).toBeGreaterThan(16 * 1.09)
    // Each leader starts where its tick ends and ends level with its number.
    const leaders = lines.filter((_, i) => i % 2 === 1)
    leaders.forEach((l, i) => {
      const a = (l.rotation * Math.PI) / 180
      const end = { x: l.x + l.w / 2 + (Math.cos(a) * l.w) / 2, y: l.y + l.h / 2 + (Math.sin(a) * l.w) / 2 }
      const t = texts[i]
      expect(Math.abs(end.y - (t.y + measureText(t).h / 2))).toBeLessThan(0.5)
    })
    expect(ladderCrowded([0, 50, 100], 16)).toBe(false)
  })
})

