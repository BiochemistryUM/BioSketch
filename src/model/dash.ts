// Line styles: how an arrow's line or a shape's outline is broken into dashes and dots.
//
// A figure stores `dashed` (the line is not solid), `dashStyle` (which pattern; absent = plain
// dashes) and `dashScale` (how large the dashes and gaps are). Keeping `dashed` as the on/off
// switch means figures saved before the other two existed still open as they were.

import type { DashStyle } from './types'

export type LineStyle = 'solid' | 'dashed' | DashStyle

export interface Dashable {
  dashed?: boolean
  dashStyle?: DashStyle
  dashScale?: number
}

export const DASH_STYLES: DashStyle[] = ['dotted', 'long', 'dashdot']
export const DASH_SCALE_MIN = 0.5
export const DASH_SCALE_MAX = 3

/** The line style of an arrow or shape as one word. */
export const lineStyleOf = (n: Dashable): LineStyle => (n.dashed ? (n.dashStyle ?? 'dashed') : 'solid')

/** The fields to set for a line style. Fields that should go are given as `undefined`. */
export function lineStylePatch(style: LineStyle): { dashed: true | undefined; dashStyle: DashStyle | undefined; dashScale: undefined } {
  if (style === 'solid') return { dashed: undefined, dashStyle: undefined, dashScale: undefined }
  return { dashed: true, dashStyle: style === 'dashed' ? undefined : style, dashScale: undefined }
}

/** A dot is a dash of almost no length: the round ends of the line turn it into a circle. */
const DOT = 0.01

/** Lengths of dashes and gaps, as multiples of the line's thickness. */
const PATTERNS: Record<Exclude<LineStyle, 'solid'>, number[]> = {
  dashed: [3.5, 3],
  dotted: [DOT, 2.4],
  long: [8, 3.5],
  dashdot: [6, 3, DOT, 3],
}
/** Plain dashes on an outline sit a little closer together than on an arrow. */
const OUTLINE_DASHED = [3.5, 2.5]

const round2 = (v: number): number => Math.round(v * 100) / 100

/**
 * The SVG `stroke-dasharray` for a line of the given thickness, or undefined for a solid line.
 * `outline` is for the outline of a shape.
 */
export function dashArray(n: Dashable & { strokeWidth: number }, outline = false): string | undefined {
  const style = lineStyleOf(n)
  if (style === 'solid') return undefined
  const scale = Math.min(DASH_SCALE_MAX, Math.max(DASH_SCALE_MIN, n.dashScale ?? 1))
  const pattern = style === 'dashed' && outline ? OUTLINE_DASHED : PATTERNS[style]
  return pattern.map((part) => (part === DOT ? DOT : round2(part * n.strokeWidth * scale))).join(' ')
}

/** Dots only show when the line has round ends. */
export const hasDots = (n: Dashable): boolean => !!n.dashed && (n.dashStyle === 'dotted' || n.dashStyle === 'dashdot')
