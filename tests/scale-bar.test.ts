// Scale bars of micrographs (src/model/scaleBar.ts): the length on the page from the size of a
// pixel, a bar that follows the picture when it is resized, and the scale saved with the figure.

import { describe, expect, it } from 'vitest'
import { renderSvg } from '../src/io/export'
import { validateDoc } from '../src/io/files'
import { emptyDoc } from '../src/model/doc'
import { niceBar, scaleBarMarks } from '../src/model/scaleBar'
import type { ImageNode } from '../src/model/types'

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
// A 2048-pixel-wide micrograph at 0.1625 µm per pixel (a 40× objective): 332.8 µm across.
const pic = (extra: Partial<ImageNode> = {}): ImageNode => ({ id: 'm', type: 'image', src: PNG, x: 0, y: 0, w: 400, h: 300, rotation: 0, scale: { pixel: 0.1625, unit: 'µm', pixels: 2048, bar: 50 }, ...extra })

describe('scale bars', () => {
  it('suggests a round length near a fifth of the picture', () => {
    expect(niceBar(332.8)).toBe(50)
    expect(niceBar(1000)).toBe(200)
    expect(niceBar(12)).toBe(2)
    expect(niceBar(0.9)).toBe(0.2)
  })

  it('draws the bar to scale, and keeps it to scale when the picture is resized', () => {
    const bar = scaleBarMarks(pic())!
    expect(bar.w).toBeCloseTo((50 / 332.8) * 400, 6)
    expect(bar.x + bar.w).toBeLessThan(400)
    expect(bar.text?.value).toBe('50 µm')
    expect(scaleBarMarks(pic({ w: 800, h: 600 }))!.w).toBeCloseTo(bar.w * 2, 6)
  })

  it('stands in the corner asked for, without words when asked, and not at all when it would not fit', () => {
    const p = pic()
    const tl = scaleBarMarks(pic({ scale: { ...p.scale!, corner: 'tl', label: false } }))!
    expect(tl.x).toBeLessThan(50)
    expect(tl.y).toBeLessThan(50)
    expect(tl.text).toBeUndefined()
    expect(scaleBarMarks(pic({ scale: { ...p.scale!, bar: 330 } }))).toBeNull()
    expect(scaleBarMarks(pic({ scale: { ...p.scale!, bar: 0 } }))).toBeNull()
  })

  it('is saved with the picture, checked, and in every export', () => {
    const p = pic({ scale: { pixel: 0.1625, unit: 'µm', pixels: 2048, bar: 50, corner: 'tr', colour: '#000000', label: false } })
    expect(validateDoc({ ...emptyDoc(), nodes: [p] }).nodes[0]).toEqual(p)
    const bad = validateDoc({ ...emptyDoc(), nodes: [pic({ scale: { pixel: -1, unit: 'inch', pixels: 2048, bar: 50 } as never })] }).nodes[0] as ImageNode
    expect(bad.scale).toBeUndefined()
    const { svg } = renderSvg({ ...emptyDoc(), nodes: [pic()] }, { area: 'page', scale: 1, includeSketch: false, background: true } as never)
    expect(svg).toContain('50 µm')
  })
})
