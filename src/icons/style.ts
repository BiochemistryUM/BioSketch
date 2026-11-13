// Icon styles: other looks for the built-in icons.
//
// "flat" is the flat cartoon look. A few icons are drawn by hand for it (flat.ts). Every other
// built-in icon is redrawn from its outlined drawing by rule: each filled shape is rebuilt in
// flat layers (light, main and dark tone of one vivid colour, no outline), each thick line as a
// shaded tube. The rules are the ones the hand-drawn icons follow, so the two kinds match.

import type { IconDef } from '../model/types'
import { FLAT_DRAWN, solid, tubeOf, type Shape, type Tones } from './flat'
import { anchorsOf, parsePath } from './path'

export type IconStyle = 'flat'

/** `source` of every built-in icon; pieces split off a built-in icon keep it. */
export const BUILTIN_SOURCE = 'BioSketch built-in library'

type Hsl = [h: number, s: number, l: number]

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))

function toHsl(hex: string): Hsl {
  const full = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex
  const r = parseInt(full.slice(1, 3), 16) / 255
  const g = parseInt(full.slice(3, 5), 16) / 255
  const b = parseInt(full.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (!d) return [0, 0, l]
  const s = d / (1 - Math.abs(2 * l - 1))
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, clamp01(s), l]
}

function toHex([h, s, l]: Hsl): string {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  const part = (v: number): string => Math.round(clamp01(v + m) * 255).toString(16).padStart(2, '0')
  return `#${part(r)}${part(g)}${part(b)}`
}

/** True for white, greys and black: colours with no hue to speak of. */
export function isNeutral(hex: string): boolean {
  const [, s, l] = toHsl(hex)
  return s * (1 - Math.abs(2 * l - 1)) < 0.06
}

/**
 * The flat-cartoon version of one colour: pastels become vivid mid-tones, dark detail colours
 * become deeper, and white and greys stay as they are.
 */
export function flatColour(hex: string): string {
  const [h, s, l] = toHsl(hex)
  if (isNeutral(hex)) return hex.toLowerCase()
  if (l >= 0.7) return toHex([h, clamp01(s * 1.1 + 0.2), 0.58 + (l - 0.7) * 0.5])
  return toHex([h, clamp01(s + 0.12), l * 0.8])
}

/** Light, main and dark tone for a shape that was drawn in `hex`. */
export function tonesOf(hex: string): Tones {
  const main = flatColour(hex)
  const [h, s, l] = toHsl(main)
  // Greys shade gently; colours get a clearly lighter and a clearly deeper layer.
  const step = isNeutral(main) ? 0.06 : 0.13
  return [toHex([h, s, clamp01(l + step)]), main, toHex([h, s, clamp01(l - step)])]
}

const attr = (attrs: string, name: string): string | undefined => new RegExp(`\\s${name}="([^"]*)"`).exec(attrs)?.[1]
const without = (attrs: string, names: string[]): string => names.reduce((a, n) => a.replace(new RegExp(`\\s${n}="[^"]*"`), ''), attrs)
const isHex = (v: string | undefined): v is string => !!v && /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(v)
const round1 = (v: number): number => Math.round(v * 10) / 10

/** The smaller side of an element's box, in the icon's units (good enough to choose how deep its shading goes). */
function smallSide(tag: string, attrs: string): number {
  const n = (name: string): number => Number(attr(attrs, name) ?? 0)
  const spread = (values: number[][]): number => {
    if (!values.length) return 0
    const xs = values.map((p) => p[0])
    const ys = values.map((p) => p[1])
    return Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
  }
  switch (tag) {
    case 'circle':
      return 2 * n('r')
    case 'ellipse':
      return 2 * Math.min(n('rx'), n('ry'))
    case 'rect':
      return Math.min(n('width'), n('height'))
    case 'polygon': {
      const p = (attr(attrs, 'points') ?? '').split(/[\s,]+/).filter(Boolean).map(Number)
      return spread(p.flatMap((_, i) => (i % 2 ? [] : [[p[i], p[i + 1]]])))
    }
    case 'path':
      return spread(anchorsOf(parsePath(attr(attrs, 'd') ?? '')).map((a) => [a.x, a.y]))
    default:
      return 0
  }
}

/** Shapes smaller than this are drawn in one tone: their shading would be thinner than a hair. */
const TOO_SMALL = 8
/** Lines at least this wide are drawn as shaded tubes. */
const TUBE_FROM = 4

/** Redraw an outlined built-in drawing in the flat cartoon look. `key` makes the clip path ids unique. */
export function redrawFlat(body: string, key: string): string {
  // A tube in the outlined style is two lines on the same path, a wide dark one under a narrow
  // light one. Here it becomes one shaded tube, as wide as the wide line, in the light line's colour.
  const lines = new Map<string, { width: number; stroke: string }[]>()
  for (const m of body.matchAll(/<path\b([^>]*?)\/>/g)) {
    const d = attr(m[1], 'd')
    const stroke = attr(m[1], 'stroke')
    if (!d || !isHex(stroke) || attr(m[1], 'fill') !== 'none' || attr(m[1], 'stroke-dasharray')) continue
    lines.set(d, [...(lines.get(d) ?? []), { width: Number(attr(m[1], 'stroke-width') ?? 2.5), stroke }])
  }
  let defs = ''
  let count = 0
  const drawn = body
    .replace(/<(path|circle|ellipse|rect|polygon|polyline|line)\b([^>]*?)\/>/g, (whole, tag: string, attrs: string) => {
      const fill = attr(attrs, 'fill')
      const stroke = attr(attrs, 'stroke')
      const width = Number(attr(attrs, 'stroke-width') ?? 2.5)
      const bare = without(attrs, ['fill', 'stroke', 'stroke-width'])
      const shape: Shape = (a) => `<${tag}${bare} ${a}/>`
      if (isHex(fill)) {
        const tones = tonesOf(fill)
        const size = smallSide(tag, attrs)
        // White and grey parts keep an edge, or they would vanish on a white page.
        const edge = isNeutral(fill) && isHex(stroke) ? shape(`fill="none" stroke="${flatColour(stroke)}" stroke-width="${Math.min(width, 2)}"`) : ''
        if (size < TOO_SMALL || attr(attrs, 'opacity') || attr(attrs, 'fill-opacity')) return shape(`fill="${tones[1]}"`) + edge
        const layers = solid(`${key}-${++count}`, shape, tones, Math.min(5, Math.max(1.5, round1(size * 0.1))))
        defs += layers.defs
        return edge ? `<g>${layers.body}${edge}</g>` : layers.body
      }
      if (fill === 'none' && isHex(stroke)) {
        const same = tag === 'path' ? (lines.get(attr(attrs, 'd') ?? '') ?? []) : []
        if (same.some((l) => l.width < width)) return '' // the wide line under a tube: the tube is drawn with the narrow one
        const outer = same.filter((l) => l.width > width).sort((a, b) => b.width - a.width)[0]
        if (outer) return tubeOf(shape, outer.width, tonesOf(stroke))
        if (width >= TUBE_FROM && !attr(attrs, 'stroke-dasharray')) return tubeOf(shape, width, tonesOf(stroke))
        return shape(`fill="none" stroke="${flatColour(stroke)}" stroke-width="${width}"`)
      }
      return whole
    })
    // Lettering keeps its colour family but goes deeper, to read on the vivid shapes.
    .replace(/(<text\b[^>]*?\sfill=")(#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3}))(")/g, (_, lead: string, colour: string, tail: string) => {
      const [h, s, l] = toHsl(flatColour(colour))
      return `${lead}${isNeutral(colour) ? colour : toHex([h, s, l * 0.7])}${tail}`
    })
  // The outlined drawings sit in one group that sets round line ends; the clip paths go in front, inside it.
  const open = /^<g\b[^>]*>/.exec(drawn)?.[0] ?? ''
  const marked = open ? open.replace(/^<g\b/, '<g id="fl-art"').replace(/\sstroke-width="[^"]*"/, '') : '<g id="fl-art" stroke-linecap="round" stroke-linejoin="round">'
  const rest = open ? drawn.slice(open.length) : `${drawn}</g>`
  return `${marked}${defs ? `<defs>${defs}</defs>` : ''}${rest}`
}

const styled = new Map<string, IconDef>()

/** A built-in icon in the given style. The result is kept, so the same icon is always the same object. */
export function styleIcon(def: IconDef, style: IconStyle | undefined): IconDef {
  if (style !== 'flat') return def
  const key = `${style}:${def.id}`
  let icon = styled.get(key)
  if (!icon) {
    // Icons drawn by hand for this look take their own drawing; the rest are redrawn by rule.
    const drawn = FLAT_DRAWN[def.id]
    icon = { ...def, body: drawn ? `<g id="fl-art" stroke-linecap="round" stroke-linejoin="round">${drawn}</g>` : redrawFlat(def.body, def.id) }
    styled.set(key, icon)
  }
  return icon
}
