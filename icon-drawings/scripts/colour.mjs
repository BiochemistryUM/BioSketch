// Colours of the icon scripts, worked out in OKLCH so that the shades of one part share a hue and keep their
// lightness. BioSketch's "Shades follow" groups colours whose hues lie within 35° (greys, chroma below 0.012, apart).

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const lin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const gam = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)

/** OKLCH of a hex colour: lightness 0–1, chroma, hue in degrees. */
export const toLch = (hex) => {
  const [r, g, b] = rgb(hex).map((v) => lin(v / 255))
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return { l: L, c: Math.hypot(A, B), h: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 }
}
/** Hue in OKLCH (degrees) of a hex colour. */
export const hueOf = (hex) => toLch(hex).h
const toLinRgb = ({ l: L, c, h }) => {
  const A = c * Math.cos((h * Math.PI) / 180), B = c * Math.sin((h * Math.PI) / 180)
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3, m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3, s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]
}
/** Hex colour of an OKLCH colour; chroma is lowered until it can be shown. */
export const toHex = (lch) => {
  const ok = (c) => toLinRgb({ ...lch, c }).every((v) => v >= -1e-4 && v <= 1 + 1e-4)
  let c = lch.c
  if (!ok(c)) { let lo = 0, hi = c; for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; ok(mid) ? (lo = mid) : (hi = mid) } c = lo }
  return '#' + toLinRgb({ ...lch, c }).map((v) => Math.round(gam(Math.min(1, Math.max(0, v))) * 255).toString(16).padStart(2, '0')).join('').toUpperCase()
}
/** The soft palette of one part, in one hue: pale base and shadow, a mid-tone membrane, a deeper tone for small parts. */
export const soft = (h) => ({
  light: toHex({ l: 0.985, c: 0.01, h }),
  base: toHex({ l: 0.93, c: 0.035, h }),
  shadow: toHex({ l: 0.87, c: 0.055, h }),
  small: toHex({ l: 0.8, c: 0.07, h }),
  outline: toHex({ l: 0.6, c: 0.1, h }),
})
/** A fuller palette in the same steps, for parts known by their colour (a red blood cell). */
export const deep = (h) => ({
  light: toHex({ l: 0.95, c: 0.03, h }),
  base: toHex({ l: 0.82, c: 0.1, h }),
  shadow: toHex({ l: 0.74, c: 0.13, h }),
  small: toHex({ l: 0.68, c: 0.14, h }),
  outline: toHex({ l: 0.52, c: 0.14, h }),
})
/** Smallest difference between two hues, in degrees. */
export const hueGap = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d) }
/** Like `soft`, with more colour: for yellows, which turn khaki when they are pale and grey. */
export const rich = (h) => ({
  light: toHex({ l: 0.985, c: 0.03, h }),
  base: toHex({ l: 0.95, c: 0.085, h }),
  shadow: toHex({ l: 0.9, c: 0.11, h }),
  small: toHex({ l: 0.84, c: 0.12, h }),
  outline: toHex({ l: 0.68, c: 0.12, h }),
})
