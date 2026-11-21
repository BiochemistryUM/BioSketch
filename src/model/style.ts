// "Copy style" and "Paste style": the look of one object (colours, lines, lettering, transparency)
// taken and given to others. A style is read from any kind of object and given to any kind, each
// taking what it has room for: the lettering of a label goes to the words inside a shape and back,
// the outline of a shape to an arrow and back, the colour of a line to a pen stroke. Where nothing
// fits, the object is left as it is. Place, size, turn, words and numbers are never touched. Pure.

import { growToFitLabel } from './nodes'
import type { ConnectorFade, ConnectorKind, DashStyle, EndMark, FigNode, FontFamily, ShapeNode } from './types'

export interface Style {
  /** Transparency: a number from 0 to 1, or null for none (fully solid). */
  opacity?: number | null
  /** The ground of a shape (or of a closed membrane). */
  fill?: string
  line?: { colour: string; width: number; dashed?: boolean; dashStyle?: DashStyle; dashScale?: number }
  font?: { size: number; colour: string; bold?: boolean; italic?: boolean; fontFamily?: FontFamily }
  arrow?: { kind: ConnectorKind; startMark?: EndMark; fade?: ConnectorFade }
  membrane?: { thickness: number; headColor: string; tailColor: string }
  /** An icon's recolouring belongs to that drawing, so it is given only to other uses of the same icon. */
  icon?: { iconId: string; colors?: Record<string, string>; strokeScale?: number }
  chart?: { fontSize?: number; palette?: string; pointSize?: number; pointOpacity?: number }
  table?: { fontSize?: number; lines?: 'rows' | 'rules' | 'none'; striped?: boolean; headFill?: string; color?: string }
}

const dashOf = (n: { dashed?: boolean; dashStyle?: DashStyle; dashScale?: number }) => ({
  ...(n.dashed ? { dashed: true } : {}),
  ...(n.dashed && n.dashStyle ? { dashStyle: n.dashStyle } : {}),
  ...(n.dashed && n.dashScale !== undefined ? { dashScale: n.dashScale } : {}),
})

/** What of an object's look can be given to others. */
export function styleOf(n: FigNode): Style {
  const opacity = { opacity: n.opacity ?? null }
  switch (n.type) {
    case 'shape':
      return {
        ...opacity,
        fill: n.fill,
        line: { colour: n.stroke, width: n.strokeWidth, ...dashOf(n) },
        ...(n.label ? { font: { size: n.label.fontSize, colour: n.label.fill, bold: n.label.bold, italic: n.label.italic, fontFamily: n.label.fontFamily } } : {}),
      }
    case 'text':
      return { ...opacity, font: { size: n.fontSize, colour: n.fill, bold: n.bold, italic: n.italic, fontFamily: n.fontFamily } }
    case 'connector':
      return { ...opacity, line: { colour: n.stroke, width: n.strokeWidth, ...dashOf(n) }, arrow: { kind: n.kind, startMark: n.startMark, fade: n.fade } }
    case 'membrane':
      return { ...opacity, ...(n.fill ? { fill: n.fill } : {}), membrane: { thickness: n.thickness, headColor: n.headColor, tailColor: n.tailColor } }
    case 'stroke':
      return { ...opacity, line: { colour: n.color, width: n.size } }
    case 'icon':
      return { ...opacity, icon: { iconId: n.iconId, colors: n.colors, strokeScale: n.strokeScale } }
    case 'chart':
      return { ...opacity, chart: { fontSize: n.fontSize, palette: n.palette, pointSize: n.pointSize, pointOpacity: n.pointOpacity } }
    case 'table':
      return { ...opacity, table: { fontSize: n.fontSize, lines: n.lines, striped: n.striped, headFill: n.headFill, color: n.color } }
    default:
      return opacity
  }
}

/** Optional fields are written only when they are on, and removed otherwise (a saved figure must read back the same). */
function setOptional<T extends object>(target: T, values: Record<string, unknown>): T {
  const out = { ...target } as Record<string, unknown>
  for (const [k, v] of Object.entries(values)) {
    if (v === undefined || v === false) delete out[k]
    else out[k] = v
  }
  return out as T
}

const lineFields = (l: NonNullable<Style['line']>) => ({ dashed: l.dashed, dashStyle: l.dashStyle, dashScale: l.dashScale })

/** The object with the style given to it, as far as it has room for it; the same object when nothing changes. */
export function applyStyle(n: FigNode, s: Style): FigNode {
  let out: FigNode = n
  switch (n.type) {
    case 'shape': {
      let shape: ShapeNode = { ...n }
      if (s.fill !== undefined && shape.shape !== 'bracket') shape.fill = s.fill
      if (s.line) shape = setOptional({ ...shape, stroke: s.line.colour, strokeWidth: s.line.width }, lineFields(s.line))
      if (s.font && shape.label) {
        shape.label = setOptional({ ...shape.label, fontSize: s.font.size, fill: s.font.colour }, { bold: s.font.bold, italic: s.font.italic, fontFamily: s.font.fontFamily === 'sans' ? undefined : s.font.fontFamily })
        // Bigger words may need more room: the shape grows downwards, as when the size is typed.
        shape = growToFitLabel(shape)
      }
      out = shape
      break
    }
    case 'text':
      if (s.font) out = setOptional({ ...n, fontSize: s.font.size, fill: s.font.colour }, { bold: s.font.bold, italic: s.font.italic, fontFamily: s.font.fontFamily === 'sans' ? undefined : s.font.fontFamily })
      break
    case 'connector': {
      let c = { ...n }
      if (s.line) c = setOptional({ ...c, stroke: s.line.colour, strokeWidth: s.line.width }, lineFields(s.line))
      if (s.arrow) c = setOptional({ ...c, kind: s.arrow.kind }, { startMark: s.arrow.kind === 'double' ? undefined : s.arrow.startMark, fade: s.arrow.fade })
      out = c
      break
    }
    case 'membrane':
      if (s.membrane) out = { ...n, ...s.membrane }
      if (s.fill !== undefined && n.closed) out = { ...out, fill: s.fill } as FigNode
      break
    case 'stroke':
      if (s.line) out = { ...n, color: s.line.colour }
      break
    case 'icon':
      if (s.icon && s.icon.iconId === n.iconId) out = setOptional({ ...n }, { colors: s.icon.colors, strokeScale: s.icon.strokeScale })
      else if (s.icon) out = setOptional({ ...n }, { strokeScale: s.icon.strokeScale })
      break
    case 'chart':
      if (s.chart) out = setOptional({ ...n }, { ...s.chart })
      break
    case 'table':
      if (s.table) out = setOptional({ ...n }, { ...s.table })
      break
  }
  if (s.opacity !== undefined) out = setOptional({ ...out }, { opacity: s.opacity === null || s.opacity >= 1 ? undefined : s.opacity })
  return JSON.stringify(out) === JSON.stringify(n) ? n : out
}

/** In words, what a copied style holds, for the message that says it was copied. */
export function styleWords(s: Style): string {
  const parts = [s.fill !== undefined && 'fill', s.line && 'line', s.font && 'lettering', s.arrow && 'arrow ends', s.membrane && 'membrane', s.icon && 'icon colours', s.chart && 'chart look', s.table && 'table look', s.opacity !== undefined && s.opacity !== null && 'transparency'].filter(Boolean) as string[]
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : (parts[0] ?? 'transparency')
}
