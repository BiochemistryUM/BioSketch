// The scale bar of a micrograph: the scientist says how large one pixel of the picture is (the
// microscope's software writes it, often as "pixel size" or "µm/px"), and the picture keeps that with
// its width in pixels (`scale` on a picture). The bar is drawn with the picture, by the renderer, so
// it stays right however the picture is resized on the page, and every export has it. Pure.

import type { ImageNode, ScaleUnit } from './types'

export const SCALE_UNITS: ScaleUnit[] = ['nm', 'µm', 'mm']

/** The length of the bar that suits a picture this wide (in the unit of its pixels): a round number near a fifth of it. */
export function niceBar(width: number): number {
  if (!(width > 0)) return 1
  const target = width / 5
  const power = 10 ** Math.floor(Math.log10(target))
  const step = [1, 2, 5, 10].find((m) => m * power >= target * 0.75) ?? 10
  return Number((step * power).toPrecision(6))
}

export interface ScaleBarMarks {
  /** The bar, in the picture's box (before its turn). */
  x: number
  y: number
  w: number
  h: number
  colour: string
  /** The words over it, centred: "10 µm". */
  text?: { x: number; y: number; size: number; value: string }
}

/** Format a length for the bar: 10, 2.5, 0.5 (no trailing zeros). */
const lengthText = (v: number): string => String(Number(v.toPrecision(4)))

/**
 * Where the bar of a picture goes, or null when it has none, or when the bar asked for would not fit
 * (longer than nine tenths of the picture, or thinner than a hairline on the page).
 */
export function scaleBarMarks(node: ImageNode): ScaleBarMarks | null {
  const s = node.scale
  if (!s || !s.bar) return null
  // A cropped picture shows only a share of its pixels across its width.
  const length = (s.bar / s.pixel / (s.pixels * (node.crop?.w ?? 1))) * node.w
  if (!(length > 1) || length > node.w * 0.9) return null
  const short = Math.min(node.w, node.h)
  const margin = short * 0.05
  const h = Math.max(1.5, short * 0.018)
  const size = Math.max(6, short * 0.055)
  const right = s.corner !== 'bl' && s.corner !== 'tl'
  const top = s.corner === 'tl' || s.corner === 'tr'
  const x = right ? node.w - margin - length : margin
  const text = s.label === false ? undefined : { x: x + length / 2, size, value: `${lengthText(s.bar)} ${s.unit}` }
  // The words stand above a bar at the foot, and below a bar at the top.
  const y = top ? margin : node.h - margin - h
  const colour = s.colour ?? '#ffffff'
  if (!text) return { x, y, w: length, h, colour }
  return { x, y, w: length, h, colour, text: { ...text, y: top ? y + h + size * 0.25 : y - size * 1.35 } }
}
