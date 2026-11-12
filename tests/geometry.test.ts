import { describe, expect, it } from 'vitest'
import { boxCorners, polylineLength, rectOfBox, resample, rotate, simplify, smooth } from '../src/model/geometry'
import { membraneShape } from '../src/model/membrane'

describe('geometry', () => {
  it('rotates clockwise on screen about an origin', () => {
    const p = rotate({ x: 10, y: 0 }, 90, { x: 0, y: 0 })
    expect(p.x).toBeCloseTo(0)
    expect(p.y).toBeCloseTo(10)
  })

  it('computes the bounds of a rotated box', () => {
    const r = rectOfBox({ x: 0, y: 0, w: 100, h: 20, rotation: 90 })
    expect(r.w).toBeCloseTo(20)
    expect(r.h).toBeCloseTo(100)
    expect(boxCorners({ x: 0, y: 0, w: 10, h: 10, rotation: 0 })).toHaveLength(4)
  })

  it('simplifies a noisy straight line to its two ends', () => {
    const pts = Array.from({ length: 50 }, (_, i) => ({ x: i * 4, y: Math.sin(i) * 0.5 }))
    expect(simplify(pts, 2)).toHaveLength(2)
  })

  it('keeps corners when simplifying', () => {
    const pts = [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }, { x: 100, y: 100 }]
    expect(simplify(pts, 2)).toEqual([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }])
  })

  it('smooths through the original points', () => {
    const pts = [{ x: 0, y: 0 }, { x: 50, y: 40 }, { x: 100, y: 0 }]
    const s = smooth(pts, false, 8)
    expect(s[0]).toEqual(pts[0])
    expect(s[8]).toEqual(pts[1])
    expect(s[s.length - 1]).toEqual(pts[2])
  })

  it('resamples at even spacing with unit normals', () => {
    const line = [{ x: 0, y: 0 }, { x: 100, y: 0 }]
    const samples = resample(line, 10, false)
    expect(samples).toHaveLength(11)
    expect(samples[3].p.x).toBeCloseTo(30)
    expect(Math.hypot(samples[3].n.x, samples[3].n.y)).toBeCloseTo(1)
    expect(polylineLength(line, false)).toBe(100)
  })
})

describe('membrane', () => {
  it('lays down lipids on both sides, in proportion to length', () => {
    const short = membraneShape({ points: [{ x: 0, y: 0 }, { x: 100, y: 0 }], closed: false, thickness: 24 })
    const long = membraneShape({ points: [{ x: 0, y: 0 }, { x: 400, y: 0 }], closed: false, thickness: 24 })
    expect(short.lipidCount % 2).toBe(0)
    expect(long.lipidCount).toBeGreaterThan(short.lipidCount * 3)
    expect(short.heads).toMatch(/^M/)
    expect(short.tails).toMatch(/^M/)
  })

  it('closes the centre line of a closed membrane', () => {
    const pts = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }]
    expect(membraneShape({ points: pts, closed: true, thickness: 20 }).centre.endsWith('Z')).toBe(true)
    expect(membraneShape({ points: pts, closed: false, thickness: 20 }).centre.endsWith('Z')).toBe(false)
  })

  it('copes with a degenerate path', () => {
    const shape = membraneShape({ points: [{ x: 5, y: 5 }, { x: 5, y: 5 }], closed: false, thickness: 20 })
    expect(shape.lipidCount).toBe(0)
  })
})
