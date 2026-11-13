// Panel layouts for multi-panel figures: the page divided into frames, each with its letter.
// Frames are guides: they show on the page so content can be lined up in them, and are left
// out of every export.

import { nextPanelLetter, uid } from './doc'
import type { FigDoc, FigNode, Rect, ShapeNode, TextNode } from './types'

export type PanelLayout = '1x2' | '2x1' | '1x3' | '2x2' | '2x3' | 'big-left'

export const PANEL_LAYOUTS: { value: PanelLayout; label: string }[] = [
  { value: '1x2', label: 'Two side by side' },
  { value: '2x1', label: 'Two stacked' },
  { value: '1x3', label: 'Three side by side' },
  { value: '2x2', label: 'Four (2 × 2)' },
  { value: '2x3', label: 'Six (2 rows of 3)' },
  { value: 'big-left', label: 'One large, two small' },
]

const GRID: Record<Exclude<PanelLayout, 'big-left'>, [rows: number, cols: number]> = { '1x2': [1, 2], '2x1': [2, 1], '1x3': [1, 3], '2x2': [2, 2], '2x3': [2, 3] }

/** The frames of a layout on a page, in reading order (left to right, top to bottom). */
export function panelRects(layout: PanelLayout, width: number, height: number): Rect[] {
  const margin = Math.round(Math.min(width, height) * 0.04)
  const gap = Math.round(Math.min(width, height) * 0.03)
  const w = width - 2 * margin
  const h = height - 2 * margin
  if (layout === 'big-left') {
    // The large panel takes three fifths of the width; the two small ones share the rest.
    const left = Math.round((w - gap) * 0.6)
    const right = w - gap - left
    const half = (h - gap) / 2
    return [
      { x: margin, y: margin, w: left, h },
      { x: margin + left + gap, y: margin, w: right, h: half },
      { x: margin + left + gap, y: margin + half + gap, w: right, h: half },
    ]
  }
  const [rows, cols] = GRID[layout]
  const cw = (w - gap * (cols - 1)) / cols
  const ch = (h - gap * (rows - 1)) / rows
  const out: Rect[] = []
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push({ x: margin + c * (cw + gap), y: margin + r * (ch + gap), w: cw, h: ch })
  return out
}

/** Frames and letters for a layout, ready to add to the figure. Letters carry on after those already there. */
export function panelNodes(doc: FigDoc, layout: PanelLayout): FigNode[] {
  const first = nextPanelLetter(doc).charCodeAt(0)
  const size = Math.max(16, Math.round(Math.min(doc.width, doc.height) * 0.035))
  return panelRects(layout, doc.width, doc.height).flatMap((r, i): FigNode[] => {
    const letter = String.fromCharCode(Math.min(90, first + i))
    const frame: ShapeNode = {
      id: uid(),
      type: 'shape',
      shape: 'rect',
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.w),
      h: Math.round(r.h),
      rotation: 0,
      fill: 'none',
      stroke: '#9aa5b1',
      strokeWidth: 1.5,
      dashed: true,
      guide: true,
      locked: true,
      name: `Panel ${letter} frame`,
    }
    const label: TextNode = { id: uid(), type: 'text', x: frame.x + Math.round(size * 0.3), y: frame.y + Math.round(size * 0.2), text: letter, fontSize: size, fill: '#1f2933', bold: true, align: 'left', rotation: 0 }
    return [frame, label]
  })
}
