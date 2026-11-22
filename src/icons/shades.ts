// Shades that follow: when one colour of an icon is changed, the other shades of the same colour
// (its outline, shadow and highlight) change with it, so the part keeps its light and shade.
//
// Colours are compared and moved in OKLCH (Björn Ottosson's Oklab, in polar form), where equal steps
// look equal: a red's dark outline and pale highlight become a blue's dark outline and pale
// highlight. Pure functions on hex codes; no browser needed.

import { isHexColor, normalizeHex } from './svg'

export interface Lch {
  l: number // lightness, 0 (black) to 1 (white)
  c: number // chroma, 0 (grey) upwards
  h: number // hue in degrees, 0 to 360
}

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const toGamma = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)

export function hexToLch(hex: string): Lch {
  const h6 = normalizeHex(hex)
  const [r, g, b] = [1, 3, 5].map((i) => toLinear(parseInt(h6.slice(i, i + 2), 16) / 255))
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const h = (Math.atan2(B, A) * 180) / Math.PI
  return { l: L, c: Math.hypot(A, B), h: h < 0 ? h + 360 : h }
}

/** Linear RGB of an OKLCH colour, possibly outside 0..1 when the colour is beyond what a screen shows. */
function lchToLinear({ l: L, c, h }: Lch): [number, number, number] {
  const A = c * Math.cos((h * Math.PI) / 180)
  const B = c * Math.sin((h * Math.PI) / 180)
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]
}

const inGamut = (rgb: number[]) => rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4)

/** The hex code of an OKLCH colour; a colour no screen can show keeps its lightness and hue and loses chroma until it fits. */
export function lchToHex(lch: Lch): string {
  const l = Math.min(1, Math.max(0, lch.l))
  let c = Math.max(0, lch.c)
  if (!inGamut(lchToLinear({ l, c, h: lch.h }))) {
    let lo = 0
    let hi = c
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2
      if (inGamut(lchToLinear({ l, c: mid, h: lch.h }))) lo = mid
      else hi = mid
    }
    c = lo
  }
  const rgb = lchToLinear({ l, c, h: lch.h })
  return `#${rgb.map((v) => Math.round(Math.min(1, Math.max(0, toGamma(Math.min(1, Math.max(0, v))))) * 255).toString(16).padStart(2, '0')).join('')}`
}

/** Below this chroma a colour is a grey (white, black, greys): it has no hue to belong by. */
const GREY = 0.012
/** Two colours are shades of one colour when their hues are this close, directly or through other shades. */
const SAME_HUE = 35

const hueGap = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

/**
 * The colours of an icon that are shades of `colour`: those whose hue lies within 35° of it, or of a
 * colour already counted (so a red outline, a salmon base and a pale pink highlight are one family).
 * Greys belong to no family and a grey has only itself.
 */
export function shadesOf(colors: string[], colour: string): string[] {
  const all = [...new Set(colors.filter(isHexColor).map(normalizeHex))]
  const start = normalizeHex(colour)
  const lch = new Map(all.map((c) => [c, hexToLch(c)]))
  const first = lch.get(start) ?? hexToLch(start)
  if (first.c < GREY) return [start]
  const family = [start]
  for (let i = 0; i < family.length; i++) {
    const h = (lch.get(family[i]) ?? first).h
    for (const c of all) {
      const x = lch.get(c)!
      if (!family.includes(c) && x.c >= GREY && hueGap(x.h, h) <= SAME_HUE) family.push(c)
    }
  }
  return all.filter((c) => family.includes(c))
}

/** Map a lightness so that `from` lands on `to` and black and white stay where they are: darker shades stay darker, paler stay paler. */
function moveLightness(l: number, from: number, to: number): number {
  if (from <= 0 || from >= 1) return l + (to - from)
  return l <= from ? (l * to) / from : 1 - ((1 - l) * (1 - to)) / (1 - from)
}

/**
 * The new colour of every shade of `colour` when `colour` becomes `next`. Each shade turns by the
 * same hue, its chroma is scaled by the same factor and its lightness keeps its place between black,
 * `colour` and white. `colour` itself becomes exactly `next`. The result maps original colours to new
 * ones; colours that are not shades of `colour` are not in it.
 */
export function followShades(colors: string[], colour: string, next: string): Record<string, string> {
  const from = normalizeHex(colour)
  const to = normalizeHex(next)
  const a = hexToLch(from)
  const b = hexToLch(to)
  const out: Record<string, string> = {}
  for (const c of shadesOf(colors, from)) {
    if (c === from) {
      out[c] = to
      continue
    }
    const x = hexToLch(c)
    // A colour turned grey takes its shades with it; a grey turned into a colour has no shades.
    const chroma = a.c > 1e-6 ? (x.c * b.c) / a.c : b.c
    out[c] = lchToHex({ l: moveLightness(x.l, a.l, b.l), c: chroma, h: b.c < 1e-6 ? x.h : x.h + (b.h - a.h) })
  }
  return out
}
