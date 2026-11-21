// How a figure looks to readers with a colour-vision deficiency: the page is shown through a colour
// matrix (an SVG filter, so nothing in the figure changes and nothing is exported this way). The
// matrices are those of Machado, Oliveira and Fernandes (2009, IEEE TVCG 15:1291), severity 1.0,
// the ones Chrome's DevTools and the R package colorspace use; they work on linear RGB, which is
// what an SVG filter works in by default. "Greys" is the luminance of Rec. 709 (a black-and-white
// print). Pure.

export type VisionKind = 'deuteranopia' | 'protanopia' | 'tritanopia' | 'greys'

export const VISIONS: { value: VisionKind; label: string; about: string }[] = [
  { value: 'deuteranopia', label: 'Deuteranopia', about: 'no green cones: red and green look alike (the most common, about 1 man in 16 has some form of it)' },
  { value: 'protanopia', label: 'Protanopia', about: 'no red cones: red and green look alike, and reds look dark' },
  { value: 'tritanopia', label: 'Tritanopia', about: 'no blue cones: blue and green look alike, and yellow and pink (rare)' },
  { value: 'greys', label: 'Greys', about: 'no colour at all, as on a black-and-white print' },
]

const MATRICES: Record<VisionKind, number[][]> = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
  greys: [
    [0.2126, 0.7152, 0.0722],
    [0.2126, 0.7152, 0.0722],
    [0.2126, 0.7152, 0.0722],
  ],
}

/** The `values` of an SVG `feColorMatrix` that shows the page as seen with `kind`. */
export const visionFilterValues = (kind: VisionKind): string => [...MATRICES[kind].map((row) => [...row, 0, 0]), [0, 0, 0, 1, 0]].map((row) => row.join(' ')).join('  ')

const toLinear = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toScreen = (c: number): number => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

/** A colour (#rrggbb) as seen with `kind`, as the filter shows it. */
export function simulateColour(hex: string, kind: VisionKind): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex
  const rgb = [0, 2, 4].map((i) => toLinear(parseInt(m[1].slice(i, i + 2), 16) / 255))
  const out = MATRICES[kind].map((row) => toScreen(Math.min(1, Math.max(0, row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2]))))
  return `#${out.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`
}
