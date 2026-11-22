import { describe, expect, it } from 'vitest'
import { followShades, hexToLch, lchToHex, shadesOf } from '../src/icons/shades'

// The palettes of the icon style sheet (icon-drawings/STYLE.md).
const MITO = ['#a3483b', '#e07a66', '#f2a08c', '#c95e4c', '#fbd9ce', '#fff3ee']
const ER = ['#5b4a8c', '#a893db', '#8a73c6', '#d3c7f2']
const RIBOSOME = ['#a65f24', '#f0a35b', '#fad6ae']

describe('OKLCH', () => {
  it('gives the published values for pure red, white and black', () => {
    const red = hexToLch('#ff0000')
    // Oklab of sRGB red: L 0.62796, C 0.25768, h 29.23 (Ottosson; CSS Color 4 gives the same).
    expect(red.l).toBeCloseTo(0.62796, 4)
    expect(red.c).toBeCloseTo(0.25768, 4)
    expect(red.h).toBeCloseTo(29.23, 1)
    expect(hexToLch('#ffffff').l).toBeCloseTo(1, 4)
    expect(hexToLch('#ffffff').c).toBeLessThan(1e-4)
    expect(hexToLch('#000000').l).toBeCloseTo(0, 6)
  })

  it('comes back to the same hex code', () => {
    for (const c of [...MITO, ...ER, ...RIBOSOME, '#000000', '#ffffff', '#808080', '#00ff00', '#0000ff']) expect(lchToHex(hexToLch(c))).toBe(c)
  })

  it('keeps a colour no screen can show on the screen, with its lightness and hue', () => {
    const hex = lchToHex({ l: 0.7, c: 0.5, h: 250 })
    expect(hex).toMatch(/^#[0-9a-f]{6}$/)
    const back = hexToLch(hex)
    expect(back.l).toBeCloseTo(0.7, 2)
    expect(Math.abs(back.h - 250)).toBeLessThan(2)
  })
})

describe('shades of one colour', () => {
  it('finds every shade of a part, and only those', () => {
    const icon = [...ER, ...RIBOSOME, '#ffffff', '#222222']
    expect(shadesOf(icon, '#a893db').sort()).toEqual([...ER].sort())
    expect(shadesOf(icon, '#f0a35b').sort()).toEqual([...RIBOSOME].sort())
  })

  it('takes a pale highlight with its colour, but not white, black or greys', () => {
    expect(shadesOf([...MITO, '#ffffff', '#000000', '#7f7f7f'], '#f2a08c').sort()).toEqual([...MITO].sort())
    expect(shadesOf([...MITO, '#ffffff'], '#ffffff')).toEqual(['#ffffff'])
  })

  it('does not care how the colour is written', () => {
    expect(shadesOf(['#A3483B', '#e07a66'], '#E07A66').sort()).toEqual(['#a3483b', '#e07a66'])
  })
})

describe('changing a colour with its shades', () => {
  const blue = '#4a78d0'
  const result = followShades(MITO, '#f2a08c', blue)

  it('gives the chosen colour exactly and moves every shade', () => {
    expect(result['#f2a08c']).toBe(blue)
    expect(Object.keys(result).sort()).toEqual([...MITO].sort())
  })

  it('turns every shade to the new hue', () => {
    const target = hexToLch(blue).h
    for (const c of MITO) {
      const h = hexToLch(result[c]).h
      expect(Math.min(Math.abs(h - target), 360 - Math.abs(h - target))).toBeLessThan(12)
    }
  })

  it('keeps darker shades darker and paler shades paler, in the same order', () => {
    const order = (map: (c: string) => string) => [...MITO].sort((a, b) => hexToLch(map(a)).l - hexToLch(map(b)).l)
    expect(order((c) => result[c])).toEqual(order((c) => c))
    // The outline stays darker than the base, the highlight stays near white.
    expect(hexToLch(result['#a3483b']).l).toBeLessThan(hexToLch(blue).l)
    expect(hexToLch(result['#fff3ee']).l).toBeGreaterThan(0.92)
  })

  it('leaves the other parts of the icon alone', () => {
    const icon = [...ER, ...RIBOSOME]
    const out = followShades(icon, '#f0a35b', '#3fa34d')
    expect(Object.keys(out).sort()).toEqual([...RIBOSOME].sort())
  })

  it('turns a whole part grey when its colour becomes grey', () => {
    const out = followShades(MITO, '#f2a08c', '#9a9a9a')
    for (const c of MITO) expect(hexToLch(out[c]).c).toBeLessThan(0.01)
    expect(hexToLch(out['#a3483b']).l).toBeLessThan(hexToLch('#9a9a9a').l)
  })

  it('changes only the colour itself when it is a grey', () => {
    expect(followShades(['#ffffff', '#f2a08c'], '#ffffff', '#ffeecc')).toEqual({ '#ffffff': '#ffeecc' })
  })

  it('gives back the original colours when the colour is set back', () => {
    const out = followShades(MITO, '#f2a08c', '#f2a08c')
    for (const c of MITO) expect(out[c]).toBe(c)
  })
})
