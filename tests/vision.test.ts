// The colour-blind preview (src/model/vision.ts), pinned to R's colorspace package (deutan, protan,
// tritan with their defaults: Machado et al. 2009, severity 1, on linear RGB).

import { describe, expect, it } from 'vitest'
import { simulateColour, visionFilterValues } from '../src/model/vision'

const COLOURS = ['#D62728', '#2CA02C', '#1F77B4', '#FF7F0E']
// colorspace 2.1: deutan(COLOURS), protan(COLOURS), tritan(COLOURS).
const R = {
  deuteranopia: ['#8B7C1F', '#968838', '#456CB3', '#C4AE05'],
  protanopia: ['#615725', '#A39119', '#5A79B7', '#A59100'],
  tritanopia: ['#EC002B', '#009B89', '#00868D', '#FF616D'],
}
const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

describe('the colour-blind preview', () => {
  it('shows colours as R’s colorspace does, to one step of 255', () => {
    for (const [kind, want] of Object.entries(R) as [keyof typeof R, string[]][])
      COLOURS.forEach((c, i) => {
        const got = channels(simulateColour(c, kind))
        channels(want[i]).forEach((v, k) => expect(Math.abs(got[k] - v), `${kind} ${c}`).toBeLessThanOrEqual(1))
      })
  })

  it('keeps white white and black black, and greys are grey', () => {
    for (const kind of ['deuteranopia', 'protanopia', 'tritanopia', 'greys'] as const) {
      expect(simulateColour('#ffffff', kind)).toBe('#ffffff')
      expect(simulateColour('#000000', kind)).toBe('#000000')
    }
    const [r, g, b] = channels(simulateColour('#d62728', 'greys'))
    expect(r === g && g === b).toBe(true)
  })

  it('gives an SVG colour matrix of four rows of five', () => {
    const values = visionFilterValues('deuteranopia').trim().split(/\s+/).map(Number)
    expect(values).toHaveLength(20)
    expect(values.slice(15)).toEqual([0, 0, 0, 1, 0])
  })
})
