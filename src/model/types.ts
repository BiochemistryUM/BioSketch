// The figure document. Everything the editor draws, saves and exports is described here.

export interface Point {
  x: number
  y: number
}

/** Axis-aligned rectangle. */
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** A rectangle rotated by `rotation` degrees about its own centre. */
export interface Box extends Rect {
  rotation: number
}

export type ConnectorKind = 'arrow' | 'inhibit' | 'line' | 'double'
export type ShapeKind = 'rect' | 'roundrect' | 'ellipse'
export type TextAlign = 'left' | 'center' | 'right'

interface NodeBase {
  id: string
  /** Nodes sharing a groupId are selected and moved together. */
  groupId?: string
  opacity?: number
}

export interface IconNode extends NodeBase {
  type: 'icon'
  iconId: string
  x: number
  y: number
  w: number
  h: number
  rotation: number
  flipX?: boolean
  flipY?: boolean
  /** Colour overrides: original colour (lower-case hex) -> replacement. */
  colors?: Record<string, string>
}

export interface ShapeNode extends NodeBase {
  type: 'shape'
  shape: ShapeKind
  x: number
  y: number
  w: number
  h: number
  rotation: number
  fill: string
  stroke: string
  strokeWidth: number
  dashed?: boolean
}

export interface TextNode extends NodeBase {
  type: 'text'
  /** Horizontal anchor: left edge, centre or right edge depending on `align`. */
  x: number
  /** Top of the text block. */
  y: number
  text: string
  fontSize: number
  fill: string
  bold?: boolean
  italic?: boolean
  align: TextAlign
  rotation: number
}

/** A connector end. When `nodeId` is set the end follows that node; x/y is then only a fallback. */
export interface Endpoint {
  x: number
  y: number
  nodeId?: string
}

export interface ConnectorNode extends NodeBase {
  type: 'connector'
  from: Endpoint
  to: Endpoint
  /** Offset of the curve's midpoint from the straight line's midpoint. Absent = straight. */
  bend?: Point
  kind: ConnectorKind
  stroke: string
  strokeWidth: number
  dashed?: boolean
  label?: string
}

export interface MembraneNode extends NodeBase {
  type: 'membrane'
  points: Point[]
  closed: boolean
  thickness: number
  headColor: string
  tailColor: string
  /** Interior colour, only drawn when the membrane is closed. */
  fill?: string
}

export interface StrokeNode extends NodeBase {
  type: 'stroke'
  /** [x, y, pressure] */
  points: [number, number, number][]
  color: string
  size: number
}

export type FigNode = IconNode | ShapeNode | TextNode | ConnectorNode | MembraneNode | StrokeNode
export type NodeType = FigNode['type']

export interface IconDef {
  id: string
  name: string
  category: string
  tags: string[]
  /** Width and height of the icon's own coordinate system. */
  viewBox: [number, number]
  /** Inner SVG markup (everything inside the <svg> element). */
  body: string
  license: string
  author: string
  source: string
}

export interface FigDoc {
  version: 1
  name: string
  width: number
  height: number
  background: string
  /** Drawing order: first is at the back. */
  nodes: FigNode[]
  /** Icons imported by the user, stored with the figure so the file is self-contained. */
  customIcons: Record<string, IconDef>
}

export const FONT_FAMILY = 'Helvetica, Arial, sans-serif'
export const LINE_HEIGHT = 1.25
