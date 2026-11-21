// Placed pictures of blots, gels and micrographs: cropping (`crop` on a picture: the part shown, as
// shares of the whole, so the file itself is never cut and a crop can be undone or changed), and the
// labels journals ask for, built as ordinary objects beside the picture: a name over every lane and
// a ladder of marker sizes (kDa) at one side, its bands placed between the top and bottom marker
// the scientist points to, by the logarithm of the size (proteins run by about the logarithm of
// their mass). The labels are a group of texts and short lines, so every one can be moved or
// retyped afterwards. Pure.

import { measureText } from './nodes'
import type { FigNode, ImageCrop, ImageNode, ShapeNode, TextNode } from './types'

const INK = '#1f2933'
/** The smallest share of a picture a crop may keep, so the picture never vanishes. */
const SMALLEST = 0.02

/** The crop of a picture, always a usable one: the whole picture when it has none. */
export const cropOf = (node: ImageNode): ImageCrop => node.crop ?? { x: 0, y: 0, w: 1, h: 1 }

/** A crop made usable: inside the picture and no smaller than 2 % each way. */
export function tidyCrop(c: ImageCrop): ImageCrop {
  const w = Math.min(1, Math.max(SMALLEST, c.w))
  const h = Math.min(1, Math.max(SMALLEST, c.h))
  return { x: Math.min(1 - w, Math.max(0, c.x)), y: Math.min(1 - h, Math.max(0, c.y)), w, h }
}

/** A point of the picture's own box (before its turn) on the page. */
function toPage(node: { x: number; y: number; w: number; h: number; rotation: number }, lx: number, ly: number): { x: number; y: number } {
  const [cx, cy] = [node.w / 2, node.h / 2]
  const a = (node.rotation * Math.PI) / 180
  const [dx, dy] = [lx - cx, ly - cy]
  return { x: node.x + cx + dx * Math.cos(a) - dy * Math.sin(a), y: node.y + cy + dx * Math.sin(a) + dy * Math.cos(a) }
}

/**
 * The picture showing another part of itself. What stays in view stays where it was on the page and
 * at its size, so cropping never moves or scales the blot; the box grows or shrinks around it.
 */
export function cropImage(node: ImageNode, next: ImageCrop | null): ImageNode {
  const old = cropOf(node)
  const crop = tidyCrop(next ?? { x: 0, y: 0, w: 1, h: 1 })
  // Size of the whole picture on the page, which cropping keeps.
  const [fullW, fullH] = [node.w / old.w, node.h / old.h]
  const [w, h] = [crop.w * fullW, crop.h * fullH]
  // The new box's middle, in the old box's own frame, then on the page.
  const mid = toPage(node, (crop.x - old.x) * fullW + w / 2, (crop.y - old.y) * fullH + h / 2)
  const whole = crop.x === 0 && crop.y === 0 && crop.w === 1 && crop.h === 1
  const { crop: _drop, ...rest } = node
  return { ...rest, x: round(mid.x - w / 2), y: round(mid.y - h / 2), w: round(w), h: round(h), ...(whole ? {} : { crop }) }
}

const round = (v: number): number => Math.round(v * 100) / 100

/** Names typed one per line, or with commas or tabs between them. */
export function readLaneNames(text: string): string[] {
  const parts = text.includes('\n') ? text.split('\n') : text.split(/[,\t]/)
  return parts.map((p) => p.trim().slice(0, 40)).filter(Boolean).slice(0, 40)
}

/** Marker sizes typed as "250, 150, 100 75": numbers above zero, largest first, each once. */
export function readSizes(text: string): number[] {
  const values = (text.match(/\d+(?:[.,]\d+)?/g) ?? []).map((t) => Number(t.replace(',', '.'))).filter((v) => v > 0 && Number.isFinite(v))
  return [...new Set(values)].sort((a, b) => b - a).slice(0, 20)
}

export interface LaneOptions {
  /** Upright, or slanted up to the right (for long names). */
  angle: 0 | 45
  fontSize: number
  /** Shares of the picture's width left free before the first lane and after the last. */
  left: number
  right: number
}

/** The middle of every lane across the picture's own box, the lanes filling it between the margins. */
export function laneCentres(width: number, count: number, left = 0, right = 0): number[] {
  const from = width * Math.max(0, left)
  const span = width * Math.max(0, 1 - left - right)
  return Array.from({ length: count }, (_, i) => from + ((i + 0.5) * span) / count)
}

/** A name over every lane, standing on a line just above the picture. */
export function laneLabels(node: ImageNode, names: string[], opts: LaneOptions, makeId: () => string): TextNode[] {
  const gap = Math.max(3, opts.fontSize * 0.35)
  return laneCentres(node.w, names.length, opts.left, opts.right).map((lx, i) => {
    const base: TextNode = { id: makeId(), type: 'text', x: 0, y: 0, text: names[i], fontSize: opts.fontSize, fill: INK, align: opts.angle ? 'left' : 'center', rotation: 0 }
    const { w, h } = measureText(base)
    const at = toPage(node, lx, -gap)
    if (!opts.angle) return { ...base, x: round(at.x), y: round(at.y - h) }
    // Slanted: the start of the name sits on the lane. The text turns about its middle, so the middle
    // is placed half its length up and to the right of that point.
    const k = Math.SQRT1_2 / 2
    const mid = { x: at.x + k * w, y: at.y - k * w - h * 0.35 }
    return { ...base, x: round(mid.x - w / 2), y: round(mid.y - h / 2), rotation: -45 }
  })
}

export interface LadderOptions {
  side: 'left' | 'right'
  /** Where the largest and the smallest marker lie, as shares of the picture's height from its top. */
  top: number
  bottom: number
  fontSize: number
  /** Written over the sizes: "kDa", "bp". Empty = nothing. */
  unit: string
}

/** Where each band of the ladder lies across the picture's height, by the logarithm of its size. */
export function ladderPlaces(sizes: number[], top: number, bottom: number): number[] {
  const [big, small] = [Math.max(...sizes), Math.min(...sizes)]
  if (!(big > small)) return sizes.map(() => top)
  return sizes.map((s) => top + ((Math.log(big) - Math.log(s)) / (Math.log(big) - Math.log(small))) * (bottom - top))
}

/** The ladder beside the picture: a short line at every band and its size, and the unit over them. */
/**
 * The size of the lettering of lane names and a ladder: 7 pt in print when the figure has a printed
 * width (what journals ask for), otherwise in step with the picture, between 8 and 16.
 */
export function blotLabelSize(pictureWidth: number, mmPerUnit: number | null): number {
  if (mmPerUnit) return Math.round(((7 * 25.4) / 72 / mmPerUnit) * 10) / 10
  return Math.max(8, Math.min(16, Math.round(pictureWidth / 30)))
}

/**
 * Places that are at least `gap` apart, each as near its own as it can be: places too close
 * together are set as one evenly spaced run centred where they were (sorted from top to bottom).
 */
export function spreadApart(ys: number[], gap: number): number[] {
  const runs: { from: number; count: number; mid: number }[] = []
  ys.forEach((y, i) => {
    runs.push({ from: i, count: 1, mid: y })
    for (;;) {
      const last = runs[runs.length - 1]
      const before = runs[runs.length - 2]
      if (!before) break
      const beforeEnd = before.mid + ((before.count - 1) * gap) / 2
      const lastStart = last.mid - ((last.count - 1) * gap) / 2
      if (lastStart - beforeEnd >= gap - 1e-9) break
      const count = before.count + last.count
      const mid = (before.mid * before.count + last.mid * last.count) / count
      runs.splice(runs.length - 2, 2, { from: before.from, count, mid })
    }
  })
  return runs.flatMap((r) => Array.from({ length: r.count }, (_, k) => r.mid + (k - (r.count - 1) / 2) * gap))
}

/** Whether the numbers of a ladder are too close to stand level with their marks (`spreadApart` moves one). */
export function ladderCrowded(ys: number[], fontSize: number): boolean {
  const at = spreadApart(ys, fontSize * 1.1)
  return at.some((y, i) => Math.abs(y - ys[i]) > fontSize * 0.15)
}

export function markerLadder(node: ImageNode, sizes: number[], opts: LadderOptions, makeId: () => string): FigNode[] {
  if (!sizes.length) return []
  const out: FigNode[] = []
  const fs = opts.fontSize
  const tick = Math.max(4, fs * 0.6)
  const thick = Math.max(0.8, fs * 0.08)
  const right = opts.side === 'right'
  const edge = right ? node.w + 2 : -2
  const places = ladderPlaces(sizes, opts.top, opts.bottom)
  const ys = places.map((p) => p * node.h)
  // The ticks stand where the bands run; the numbers beside them are moved apart where they would touch,
  // and then every tick runs on to its number in a thin leader, so no number can be read against another band.
  const labelAt = spreadApart(ys, fs * 1.1)
  const bend = ladderCrowded(ys, fs) ? fs * 0.9 : 0
  const out_ = (d: number): number => (right ? edge + d : edge - d)
  const text = (value: string, ly: number, bold = false): TextNode => {
    const at = toPage(node, out_(tick + bend + 3), ly)
    const t: TextNode = { id: makeId(), type: 'text', x: 0, y: 0, text: value, fontSize: fs, fill: INK, align: right ? 'left' : 'right', rotation: 0, ...(bold ? { bold: true } : {}) }
    return { ...t, x: round(at.x), y: round(at.y - measureText(t).h / 2) }
  }
  /** A straight line between two points of the picture's own frame, as a thin box turned with it. */
  const segment = (ax: number, ay: number, bx: number, by: number): ShapeNode => {
    const length = Math.hypot(bx - ax, by - ay)
    const mid = toPage(node, (ax + bx) / 2, (ay + by) / 2)
    const angle = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI + node.rotation
    return { id: makeId(), type: 'shape', shape: 'rect', x: round(mid.x - length / 2), y: round(mid.y - thick / 2), w: round(length), h: round(thick), rotation: round(angle), fill: INK, stroke: 'none', strokeWidth: 0 }
  }
  sizes.forEach((size, i) => {
    const ly = ys[i]
    out.push(segment(out_(0), ly, out_(tick), ly))
    if (bend) out.push(segment(out_(tick), ly, out_(tick + bend), labelAt[i]))
    out.push(text(String(size), bend ? labelAt[i] : ly))
  })
  if (opts.unit.trim()) out.push(text(opts.unit.trim().slice(0, 12), Math.min(ys[0], labelAt[0]) - fs * 1.4, true))
  return out
}
