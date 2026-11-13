// The flat cartoon icon style: colours, shapes rebuilt in flat layers, and the hand-drawn icons.

import { beforeEach, describe, expect, it } from 'vitest'
import { inPreferredStyle, preferredStyle, rememberStyle } from '../src/figures'
import { FLAT_DRAWN } from '../src/icons/flat'
import { BUILTIN_ICONS, getIcon } from '../src/icons/library'
import { extractParts } from '../src/icons/split'
import { BUILTIN_SOURCE, flatColour, isNeutral, redrawFlat, styleIcon, tonesOf } from '../src/icons/style'
import { extractColors, iconMarkup, recolor } from '../src/icons/svg'
import { renderSvg } from '../src/io/export'
import { validateDoc } from '../src/io/files'
import { emptyDoc } from '../src/model/doc'
import type { FigDoc, IconNode } from '../src/model/types'

const lightness = (hex: string): number => {
  const n = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  return (Math.max(...n) + Math.min(...n)) / 2
}
const spread = (hex: string): number => {
  const n = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return Math.max(...n) - Math.min(...n)
}
const count = (text: string, part: string): number => text.split(part).length - 1

describe('flat cartoon colours', () => {
  it('turns pastels into vivid mid-tones and keeps their hue', () => {
    const peach = flatColour('#fde4d6')
    expect(lightness(peach)).toBeLessThan(lightness('#fde4d6'))
    expect(spread(peach)).toBeGreaterThan(spread('#fde4d6') * 2)
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(peach.slice(i, i + 2), 16))
    expect(r).toBeGreaterThan(g)
    expect(g).toBeGreaterThan(b)
  })

  it('deepens dark detail colours and leaves white and greys alone', () => {
    expect(lightness(flatColour('#2f6fb5'))).toBeLessThan(lightness('#2f6fb5'))
    expect(flatColour('#ffffff')).toBe('#ffffff')
    expect(flatColour('#e6eaf0')).toBe('#e6eaf0')
    expect(isNeutral('#808080')).toBe(true)
    expect(isNeutral('#a9cdf3')).toBe(false)
  })

  it('gives every colour a lighter and a deeper tone for its layers', () => {
    const [light, main, dark] = tonesOf('#a9cdf3')
    expect(main).toBe(flatColour('#a9cdf3'))
    expect(lightness(light)).toBeGreaterThan(lightness(main))
    expect(lightness(dark)).toBeLessThan(lightness(main))
    const [paleGrey, grey, deepGrey] = tonesOf('#e6eaf0')
    expect(grey).toBe('#e6eaf0')
    // Greys shade more gently than colours.
    expect(lightness(paleGrey) - lightness(deepGrey)).toBeLessThan(lightness(light) - lightness(dark))
  })
})

describe('redrawing an outlined icon in flat layers', () => {
  const wrap = (inner: string): string => `<g stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5">${inner}</g>`

  it('rebuilds a filled shape as three tones of one colour, without its outline', () => {
    const out = redrawFlat(wrap('<circle cx="50" cy="50" r="30" fill="#a9cdf3" stroke="#2f6fb5"/>'), 'x')
    const [light, main, dark] = tonesOf('#a9cdf3')
    for (const tone of [light, main, dark]) expect(out).toContain(`fill="${tone}"`)
    expect(out).not.toContain('stroke="#')
    expect(count(out, '<clipPath')).toBe(2)
    expect(out).toContain('id="fl-art"')
    // The wrapper no longer sets an outline width.
    expect(out).not.toContain('stroke-width="2.5"')
  })

  it('draws small shapes in one tone', () => {
    const out = redrawFlat(wrap('<circle cx="5" cy="5" r="3" fill="#a9cdf3" stroke="#2f6fb5"/>'), 'x')
    expect(out).toContain(`fill="${flatColour('#a9cdf3')}"`)
    expect(out).not.toContain('<clipPath')
  })

  it('keeps an edge on white and grey parts, which would vanish on a white page otherwise', () => {
    const out = redrawFlat(wrap('<rect x="0" y="0" width="40" height="60" rx="4" fill="#ffffff" stroke="#5b6676"/>'), 'x')
    expect(out).toContain(`fill="none" stroke="${flatColour('#5b6676')}" stroke-width="2"`)
  })

  it('turns the two lines of a tube into one shaded tube, and thick lines into tubes', () => {
    const tube = redrawFlat(wrap('<path d="M0 0h90" fill="none" stroke="#d39a1c" stroke-width="10"/><path d="M0 0h90" fill="none" stroke="#fbe3a6" stroke-width="5"/>'), 'x')
    const [, main, dark] = tonesOf('#fbe3a6')
    expect(tube).toContain(`stroke="${main}" stroke-width="10"`)
    expect(tube).toContain(`stroke="${dark}" stroke-width="10"`)
    expect(tube).not.toContain(flatColour('#d39a1c'))
    const thick = redrawFlat(wrap('<path d="M0 0h90" fill="none" stroke="#2f6fb5" stroke-width="6"/>'), 'x')
    expect(count(thick, '<path')).toBe(3)
  })

  it('keeps thin and dashed lines as plain lines in the new colour', () => {
    const thin = redrawFlat(wrap('<path d="M0 0h9" fill="none" stroke="#2f6fb5"/>'), 'x')
    expect(count(thin, '<path')).toBe(1)
    expect(thin).toContain(`stroke="${flatColour('#2f6fb5')}" stroke-width="2.5"`)
    const dashed = redrawFlat(wrap('<path d="M0 0h90" fill="none" stroke="#2f6fb5" stroke-width="6" stroke-dasharray="4 4"/>'), 'x')
    expect(count(dashed, '<path')).toBe(1)
    expect(dashed).toContain('stroke-dasharray="4 4"')
  })

  it('deepens lettering so it reads on vivid shapes, and leaves grey lettering alone', () => {
    const out = redrawFlat(wrap('<text x="5" y="5" font-size="10" fill="#d39a1c">ATP</text><text x="5" y="9" fill="#808080">x</text>'), 'x')
    const colour = /<text[^>]*fill="(#[0-9a-f]{6})"/.exec(out)![1]
    expect(lightness(colour)).toBeLessThan(lightness(flatColour('#d39a1c')))
    expect(out).toContain('fill="#808080">x<')
    expect(out).toContain('>ATP<')
  })
})

describe('every built-in icon in the flat look', () => {
  it('is well-formed, keeps its size and name, and never repeats or misses an id', () => {
    for (const icon of BUILTIN_ICONS) {
      const flat = styleIcon(icon, 'flat')
      expect(flat.viewBox, icon.id).toEqual(icon.viewBox)
      expect(flat.name).toBe(icon.name)
      expect(icon.source).toBe(BUILTIN_SOURCE)
      const doc = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${flat.body}</svg>`, 'image/svg+xml')
      expect(doc.getElementsByTagName('parsererror').length, icon.id).toBe(0)
      const ids = [...flat.body.matchAll(/ id="([^"]+)"/g)].map((m) => m[1])
      expect(new Set(ids).size, icon.id).toBe(ids.length)
      for (const ref of flat.body.matchAll(/url\(#([^)]+)\)/g)) expect(ids, `${icon.id}: ${ref[1]}`).toContain(ref[1])
      // Plain colours only: no gradients, pictures or see-through tricks, so every part can be recoloured.
      expect(flat.body, icon.id).not.toMatch(/Gradient|<image|<filter|<mask|rgb\(/)
      expect(extractColors(flat.body).length, icon.id).toBeGreaterThan(0)
    }
  })

  it('keeps all lettering', () => {
    for (const icon of BUILTIN_ICONS.filter((i) => !FLAT_DRAWN[i.id])) {
      const words = (body: string): string[] => [...body.matchAll(/>([^<>]+)<\/text>/g)].map((m) => m[1])
      expect(words(styleIcon(icon, 'flat').body), icon.id).toEqual(words(icon.body))
    }
  })

  it('hands out the same object each time, and the original when no style is set', () => {
    const icon = BUILTIN_ICONS[0]
    expect(styleIcon(icon, 'flat')).toBe(styleIcon(icon, 'flat'))
    expect(styleIcon(icon, undefined)).toBe(icon)
    expect(getIcon({ customIcons: {}, iconStyle: 'flat' }, icon.id)).toBe(styleIcon(icon, 'flat'))
    expect(getIcon({ customIcons: {} }, icon.id)).toBe(icon)
    expect(getIcon(null, icon.id)).toBe(icon)
  })

  it('can be recoloured, drawn twice on one page, and split into one piece per shape', () => {
    const flat = styleIcon(BUILTIN_ICONS.find((i) => i.id === 'lysosome') ?? BUILTIN_ICONS[20], 'flat')
    const [first] = extractColors(flat.body)
    expect(recolor(flat.body, { [first]: '#010203' })).toContain('#010203')
    const a = iconMarkup(flat, undefined, 'n1')
    const b = iconMarkup(flat, undefined, 'n2')
    const idsOf = (markup: string): string[] => [...markup.matchAll(/ id="([^"]+)"/g)].map((m) => m[1])
    expect(idsOf(a).some((id) => idsOf(b).includes(id))).toBe(false)
    const parts = extractParts(flat.body)!
    const shapes = count(styleIcon(BUILTIN_ICONS.find((i) => i.id === flat.id)!, undefined).body, '/>')
    // Never more pieces than the outlined icon has shapes: the layers of one shape stay together.
    expect(parts.parts.length).toBeLessThanOrEqual(shapes)
    expect(parts.defs).toContain('<clipPath')
  })
})

describe('icons drawn by hand for the flat look', () => {
  it('stand in for existing icons', () => {
    const drawn = Object.keys(FLAT_DRAWN)
    expect(drawn.length).toBeGreaterThanOrEqual(8)
    for (const id of drawn) {
      const original = BUILTIN_ICONS.find((i) => i.id === id)
      expect(original, id).toBeDefined()
      expect(styleIcon(original!, 'flat').body).toContain(FLAT_DRAWN[id])
    }
  })
})

describe('icon style of a figure', () => {
  const node: IconNode = { id: 'n1', type: 'icon', iconId: BUILTIN_ICONS[1].id, x: 10, y: 10, w: 80, h: 80, rotation: 0 }
  const options = { area: 'page' as const, transparent: false, includeSketch: true }

  it('exports built-in icons in the look the figure asks for', () => {
    const outlined: FigDoc = { ...emptyDoc(), nodes: [node] }
    const flat: FigDoc = { ...outlined, iconStyle: 'flat' }
    expect(renderSvg(outlined, options).svg).not.toContain('fl-art')
    const svg = renderSvg(flat, options).svg
    expect(svg).toContain('fl-art')
    expect(svg).toContain(extractColors(styleIcon(BUILTIN_ICONS[1], 'flat').body)[0])
  })

  it('leaves icons from elsewhere as they are', () => {
    const custom = { ...BUILTIN_ICONS[0], id: 'custom-1', category: 'Imported', source: 'https://example.org', body: '<circle r="4" fill="#a9cdf3"/>' }
    const doc: FigDoc = { ...emptyDoc(), iconStyle: 'flat', nodes: [{ ...node, iconId: 'custom-1' }], customIcons: { 'custom-1': custom } }
    const svg = renderSvg(doc, options).svg
    expect(svg).not.toContain('fl-art')
    expect(svg).toContain('#a9cdf3')
  })

  it('is kept in a saved figure, and anything else is dropped', () => {
    expect(validateDoc(JSON.parse(JSON.stringify({ ...emptyDoc(), iconStyle: 'flat' }))).iconStyle).toBe('flat')
    expect(validateDoc(JSON.parse(JSON.stringify({ ...emptyDoc(), iconStyle: 'neon' }))).iconStyle).toBeUndefined()
    expect('iconStyle' in validateDoc(JSON.parse(JSON.stringify(emptyDoc())))).toBe(false)
  })

  describe('new figures', () => {
    beforeEach(() => localStorage.clear())

    it('start in the style chosen last', () => {
      expect(preferredStyle()).toBeUndefined()
      expect('iconStyle' in inPreferredStyle(emptyDoc())).toBe(false)
      rememberStyle('flat')
      expect(inPreferredStyle(emptyDoc()).iconStyle).toBe('flat')
      rememberStyle(undefined)
      expect('iconStyle' in inPreferredStyle({ ...emptyDoc(), iconStyle: 'flat' })).toBe(false)
    })
  })
})
