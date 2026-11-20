// Geometry of individual nodes: bounding boxes, moving, resizing, rotating, connector ends.

import { add, clamp, len, mid, mul, rectCenter, rectOfBox, rectOfPoints, rotate, round, sub } from './geometry'
import { SCRIPT_SCALE, formatRich, parseRich, type Run } from './richtext'
import { outlineAlong, shapeTextArea } from './shapes'
import {
  FONT_STACKS,
  LINE_HEIGHT,
  type Box,
  type ConnectorNode,
  type ElbowLegs,
  type Endpoint,
  type FigDoc,
  type FigNode,
  type Point,
  type Rect,
  type ShapeLabel,
  type ShapeNode,
  type TextNode,
} from './types'

// ---------- text measuring ----------

let measureCtx: CanvasRenderingContext2D | null | undefined

type FontSpec = Pick<TextNode, 'fontSize' | 'bold' | 'italic' | 'fontFamily'>

export const fontStack = (node: Pick<TextNode, 'fontFamily'>): string => FONT_STACKS[node.fontFamily ?? 'sans']

export function fontOf(node: FontSpec): string {
  return `${node.italic ? 'italic ' : ''}${node.bold ? 'bold ' : ''}${node.fontSize}px ${fontStack(node)}`
}

function plainWidth(text: string, font: FontSpec): number {
  if (measureCtx === undefined) {
    measureCtx = null
    // jsdom has no canvas; tests use the character-count estimate below.
    if (typeof document !== 'undefined' && !/jsdom/i.test(navigator.userAgent)) {
      try {
        measureCtx = document.createElement('canvas').getContext('2d')
      } catch {
        measureCtx = null
      }
    }
  }
  if (measureCtx) {
    measureCtx.font = fontOf(font)
    return measureCtx.measureText(text).width
  }
  return text.length * font.fontSize * (font.bold ? 0.6 : 0.55)
}

/** Width of one line of label text, taking its inline formatting into account. */
function lineWidth(line: string, node: TextNode): number {
  let total = 0
  for (const run of parseRich(line)) {
    total += plainWidth(run.text, {
      fontSize: run.script ? node.fontSize * SCRIPT_SCALE : node.fontSize,
      bold: node.bold || run.bold,
      italic: node.italic || run.italic,
      fontFamily: node.fontFamily,
    })
  }
  return total
}

export function measureText(node: TextNode): { w: number; h: number } {
  if (node.width || node.bullets) {
    const { w, h } = textLayout(node)
    return { w, h }
  }
  const lines = node.text.split('\n')
  const w = Math.max(node.fontSize * 0.5, ...lines.map((l) => lineWidth(l, node)))
  return { w, h: lines.length * node.fontSize * LINE_HEIGHT }
}

/** The narrowest and the widest a text box can be. */
export const TEXT_WIDTH_MIN = 20
export const TEXT_WIDTH_MAX = 20000

/** How far the lines of a bulleted paragraph stand in from the bullet, for a font size. */
export const bulletIndent = (fontSize: number): number => round(fontSize * 1.1, 1)

export interface TextLine {
  text: string
  /** Where the line begins, across the page: its left end, its middle or its right end, as `anchor` says. */
  x: number
  /** Where the bullet of the line stands (its left end); only the first line of a bulleted paragraph has one. */
  bullet?: number
}

export interface TextLayout {
  lines: TextLine[]
  anchor: 'start' | 'middle' | 'end'
  /** The box the words stand in: its left edge and its size. */
  left: number
  w: number
  h: number
}

/**
 * The lines of a text as they are drawn. A label has the lines that were typed; a text box breaks
 * them at its width; with bullets every paragraph begins with one and is set in from it (bulleted
 * text always starts at the left of its box).
 */
export function textLayout(node: TextNode): TextLayout {
  const font = { fontSize: node.fontSize, ...(node.bold ? { bold: true } : {}), ...(node.italic ? { italic: true } : {}), ...(node.fontFamily ? { fontFamily: node.fontFamily } : {}) }
  const indent = node.bullets ? bulletIndent(node.fontSize) : 0
  const room = node.width ? Math.max(node.fontSize, node.width - indent) : Infinity
  const drawn: { text: string; first: boolean }[] = []
  for (const paragraph of node.text.split('\n')) {
    const lines = Number.isFinite(room) ? wrapLine(paragraph, font, room) : [paragraph]
    lines.forEach((text, i) => drawn.push({ text, first: i === 0 && paragraph.trim() !== '' }))
  }
  const w = node.width ?? Math.max(node.fontSize * 0.5, ...drawn.map((l) => lineWidth(l.text, node))) + indent
  const left = node.align === 'center' ? node.x - w / 2 : node.align === 'right' ? node.x - w : node.x
  const anchor = node.bullets ? 'start' : node.align === 'center' ? 'middle' : node.align === 'right' ? 'end' : 'start'
  const x = node.bullets ? left + indent : node.x
  return {
    lines: drawn.map((l) => ({ text: l.text, x, ...(node.bullets && l.first ? { bullet: left + round(node.fontSize * 0.2, 1) } : {}) })),
    anchor,
    left,
    w,
    h: drawn.length * node.fontSize * LINE_HEIGHT,
  }
}

// ---------- wrapping ----------

const runWidth = (run: Run, font: FontSpec): number =>
  plainWidth(run.text, { fontSize: run.script ? font.fontSize * SCRIPT_SCALE : font.fontSize, bold: font.bold || run.bold, italic: font.italic || run.italic, fontFamily: font.fontFamily })

/** Break one line into lines no wider than `maxWidth`, at spaces. A single word that is too wide stays whole. */
function wrapLine(line: string, font: FontSpec, maxWidth: number): string[] {
  const runs = parseRich(line)
  if (runs.reduce((total, run) => total + runWidth(run, font), 0) <= maxWidth) return [line]
  // Words and the spaces between them, each keeping its formatting. A word can be several runs
  // (the "Ca" and the raised "2+" of Ca^{2+}); a superscript never separates from its word.
  const words: Run[][] = [[]]
  const gaps: Run[] = []
  for (const run of runs) {
    const parts = run.script ? [run.text] : run.text.split(/( +)/)
    for (const part of parts) {
      if (!part) continue
      if (!run.script && part.trim() === '') {
        gaps.push({ ...run, text: part })
        words.push([])
      } else words[words.length - 1].push({ ...run, text: part })
    }
  }
  const lines: Run[][] = []
  let current: Run[] = []
  let width = 0
  words.forEach((word, i) => {
    if (!word.length) return
    const wordWidth = word.reduce((total, run) => total + runWidth(run, font), 0)
    const gap = i > 0 ? gaps[i - 1] : undefined
    const gapWidth = gap && current.length ? runWidth(gap, font) : 0
    if (current.length && width + gapWidth + wordWidth > maxWidth) {
      lines.push(current)
      current = []
      width = 0
    } else if (gap && current.length) {
      current.push(gap)
      width += gapWidth
    }
    current.push(...word)
    width += wordWidth
  })
  if (current.length) lines.push(current)
  return lines.map(formatRich)
}

/**
 * Break label text so that no line is wider than `maxWidth`. Line breaks the scientist typed are
 * kept, and formatting that runs across a new break is carried onto both lines.
 */
export function wrapText(text: string, font: FontSpec, maxWidth: number): string {
  return text
    .split('\n')
    .flatMap((line) => wrapLine(line, font, maxWidth))
    .join('\n')
}

/** The same text aligned another way, standing where it stood: only the edge it is measured from changes. */
export function realignText(node: TextNode, align: TextNode['align']): TextNode {
  const { left, w } = textLayout(node)
  return { ...node, align, x: round(align === 'center' ? left + w / 2 : align === 'right' ? left + w : left, 1) }
}

/** A label made into a text box as wide as it is now (and no narrower than a few words), or a text box back into a label. */
export function textBoxed(node: TextNode, on: boolean): TextNode {
  if (!on) {
    const { width: _drop, ...label } = node
    return label
  }
  if (node.width) return node
  const { left, w } = textLayout(node)
  const width = Math.round(Math.max(w, node.fontSize * 8))
  return { ...node, width, x: round(node.align === 'center' ? left + width / 2 : node.align === 'right' ? left + width : left, 1) }
}

/** Bullet points on or off. Bulleted text starts at the left of its box, so the text is then aligned left. */
export function textBulleted(node: TextNode, on: boolean): TextNode {
  const { bullets: _drop, ...plain } = node
  return on ? { ...realignText(plain, 'left'), bullets: true } : plain
}

// ---------- text inside a shape ----------

/** Size and colour of the text typed into a shape that has none yet. */
export const SHAPE_LABEL_DEFAULT = { fontSize: 16, fill: '#2b2f36' } as const

/** Free space kept between the words and the outline of the shape. */
const SHAPE_TEXT_PAD = 8

/** How wide a line of text inside the shape may be before it is broken: less where the outline slants or curves in. */
export function shapeTextWidth(node: ShapeNode, fontSize: number = node.label?.fontSize ?? SHAPE_LABEL_DEFAULT.fontSize): number {
  const share = shapeTextArea(node.shape, node.w, node.h).width
  const room = share < 1 ? node.w * share : node.w - 2 * (SHAPE_TEXT_PAD + node.strokeWidth / 2)
  return Math.max(room, fontSize * 2)
}

/**
 * The text inside a shape as a label, ready to be drawn or measured like any other label: broken
 * into lines that fit the shape, placed left, centre or right, and centred from top to bottom.
 * Null when the shape has no text. It carries the shape's id, so a tap on the words is a tap on
 * the shape. The shape's turn is not included: the words are drawn inside the turned shape.
 */
export function shapeLabelNode(node: ShapeNode, label: ShapeLabel | undefined = node.label): TextNode | null {
  if (!label) return null
  const align = label.align ?? 'center'
  const room = shapeTextWidth(node, label.fontSize)
  const middle = node.x + node.w / 2
  const font = { fontSize: label.fontSize, ...(label.bold ? { bold: true } : {}), ...(label.italic ? { italic: true } : {}), ...(label.fontFamily ? { fontFamily: label.fontFamily } : {}) }
  const text: TextNode = {
    id: node.id,
    type: 'text',
    x: align === 'left' ? middle - room / 2 : align === 'right' ? middle + room / 2 : middle,
    y: 0,
    text: wrapText(label.text, font, room),
    fill: label.fill,
    align,
    rotation: 0,
    ...font,
  }
  // The middle of the words is the middle of the roomy part of the shape (lower in a triangle, higher in a callout).
  return { ...text, y: node.y + node.h * shapeTextArea(node.shape, node.w, node.h).middle - measureText(text).h / 2 }
}

/**
 * The shape made tall enough for its words, when they need more lines than fit: it grows
 * downwards, its top edge staying where it is (also when it is turned). A shape with room to
 * spare, or without words, is handed back as it is: a shape never shrinks by itself. Used when
 * the words or their size change, not when the scientist resizes the shape by hand.
 */
export function growToFitLabel(node: ShapeNode): ShapeNode {
  if (!node.label?.text.trim()) return node
  let grown = node
  // A taller shape can leave more or less room across (a hexagon, a cylinder), so look again after growing.
  for (let pass = 0; pass < 4; pass++) {
    const label = shapeLabelNode(grown)
    if (!label) break
    const need = measureText(label).h + 2 * (SHAPE_TEXT_PAD + grown.strokeWidth / 2)
    const share = shapeTextArea(grown.shape, grown.w, grown.h).height
    if (need <= grown.h * share + 0.5) break
    const h = Math.ceil(need / share)
    // The middle of the top edge stays put: the centre moves down the shape's own axis by half the growth.
    const turn = (grown.rotation * Math.PI) / 180
    const by = (h - grown.h) / 2
    const cx = grown.x + grown.w / 2 - Math.sin(turn) * by
    const cy = grown.y + grown.h / 2 + Math.cos(turn) * by
    grown = { ...grown, x: round1(cx - grown.w / 2), y: round1(cy - h / 2), h }
  }
  return grown
}

const round1 = (v: number): number => Math.round(v * 10) / 10

// ---------- lookup ----------

export const findNode = (doc: FigDoc, id: string | undefined): FigNode | undefined =>
  id ? doc.nodes.find((n) => n.id === id) : undefined

/** Node types a connector end can attach to. */
export const canAttach = (n: FigNode | undefined): boolean =>
  !!n && (n.type === 'icon' || n.type === 'shape' || n.type === 'text' || n.type === 'image' || n.type === 'chart' || n.type === 'table' || n.type === 'structure')

// ---------- connectors ----------

export const CONNECTOR_GAP = 6

export interface ResolvedConnector {
  from: Point
  to: Point
  /** Quadratic control point for a curved connector, otherwise null. */
  ctrl: Point | null
  /** Corner points of a right-angled connector, between `from` and `to`. */
  via?: Point[]
}

interface Anchor {
  center: Point
  node: FigNode | null
  /** The attached node's own box (rotation not applied), or null for a free end. */
  box: Box | null
}

/** Where a port lies: on the node's box (turned with it), a little outside an edge it sits on, like any attached end. */
export function portPoint(box: Box, port: Point): Point {
  const out = (v: number): number => (Math.abs(v) >= 0.999 ? Math.sign(v) * CONNECTOR_GAP : 0)
  const local = { x: (port.x * box.w) / 2 + out(port.x), y: (port.y * box.h) / 2 + out(port.y) }
  return add(rectCenter(box), rotate(local, box.rotation))
}

function anchorOf(ep: Endpoint, doc: FigDoc): Anchor {
  const node = findNode(doc, ep.nodeId)
  if (node && canAttach(node)) {
    const box = getBox(node, doc)
    // An end with a port has its place on the node: from there on it behaves like a free end at that point.
    if (ep.port) return { center: portPoint(box, ep.port), node: null, box: null }
    return { center: rectCenter(box), node, box }
  }
  return { center: { x: ep.x, y: ep.y }, node: null, box: null }
}

/** Point on the edge of the anchor's node (a little outside it), on the way from its centre toward `toward`. */
function clipToEdge(a: Anchor, toward: Point): Point {
  if (!a.box || !a.node) return a.center
  const hw = a.box.w / 2 + CONNECTOR_GAP
  const hh = a.box.h / 2 + CONNECTOR_GAP
  const d = sub(toward, a.center)
  if (len(d) < 1e-6) return a.center
  // Work in the node's own frame so rotated nodes are met at their real outline.
  const local = rotate(d, -a.box.rotation)
  let s: number
  const slanted = a.node.type === 'shape' ? outlineAlong(a.node.shape, a.box.w, a.box.h, local, CONNECTOR_GAP) : null
  if (slanted !== null) {
    // A triangle, diamond, hexagon or callout is met at its real outline, not at its box.
    s = slanted
  } else if (a.node.type === 'shape' && a.node.shape === 'ellipse') {
    s = 1 / Math.sqrt((local.x / hw) ** 2 + (local.y / hh) ** 2)
  } else {
    s = Math.min(local.x ? hw / Math.abs(local.x) : Infinity, local.y ? hh / Math.abs(local.y) : Infinity)
  }
  return add(a.center, mul(d, Math.min(1, s)))
}

/** A right-angled connector runs sideways-down-sideways when its ends are further apart sideways. */
const elbowIsHorizontal = (a: Point, b: Point): boolean => Math.abs(b.x - a.x) >= Math.abs(b.y - a.y)

/** Whether each end of a right-angled connector runs sideways (true) or up and down. */
function elbowRuns(c: ConnectorNode, a: Anchor, b: Anchor): [boolean, boolean] {
  if (c.legs) return [c.legs[0] === 'h', c.legs[1] === 'h']
  const horizontal = elbowIsHorizontal(a.center, b.center)
  return [horizontal, horizontal]
}

/** True for a right-angled connector with one corner: it has no middle leg to move. */
export const hasOneCorner = (c: Pick<ConnectorNode, 'route' | 'legs'>): boolean => c.route === 'elbow' && !!c.legs && c.legs[0] !== c.legs[1]

function resolveElbow(c: ConnectorNode, a: Anchor, b: Anchor): ResolvedConnector {
  const [startSideways, endSideways] = elbowRuns(c, a, b)
  // Leave each attached node from the middle of the side that faces the other end.
  const exit = (anchor: Anchor, toward: Point, horizontal: boolean): Point => {
    if (!anchor.box) return anchor.center
    // A shape with slanted sides is left where its outline really is on that side.
    if (anchor.node?.type === 'shape' && !anchor.box.rotation && outlineAlong(anchor.node.shape, anchor.box.w, anchor.box.h, { x: 1, y: 0 }) !== null) {
      const far = Math.max(anchor.box.w, anchor.box.h) * 4
      const side = horizontal ? { x: toward.x >= anchor.center.x ? far : -far, y: 0 } : { x: 0, y: toward.y >= anchor.center.y ? far : -far }
      return clipToEdge(anchor, add(anchor.center, side))
    }
    const r = rectOfBox(anchor.box)
    if (horizontal) return { x: toward.x >= anchor.center.x ? r.x + r.w + CONNECTOR_GAP : r.x - CONNECTOR_GAP, y: anchor.center.y }
    return { x: anchor.center.x, y: toward.y >= anchor.center.y ? r.y + r.h + CONNECTOR_GAP : r.y - CONNECTOR_GAP }
  }
  const from = exit(a, b.center, startSideways)
  const to = exit(b, a.center, endSideways)
  // One corner: straight out of the start, then straight into the end.
  if (startSideways !== endSideways) return { from, to, ctrl: null, via: [startSideways ? { x: to.x, y: from.y } : { x: from.x, y: to.y }] }
  const horizontal = startSideways
  const offset = c.bend ? (horizontal ? c.bend.x : c.bend.y) : 0
  const via = horizontal
    ? [{ x: (from.x + to.x) / 2 + offset, y: from.y }, { x: (from.x + to.x) / 2 + offset, y: to.y }]
    : [{ x: from.x, y: (from.y + to.y) / 2 + offset }, { x: to.x, y: (from.y + to.y) / 2 + offset }]
  return { from, to, ctrl: null, via }
}

/** Work out where a connector really starts and ends, following any nodes it is attached to. */
export function resolveConnector(c: ConnectorNode, doc: FigDoc): ResolvedConnector {
  const a = anchorOf(c.from, doc)
  const b = anchorOf(c.to, doc)
  if (c.route === 'elbow') return resolveElbow(c, a, b)
  const ctrl = c.bend ? add(mid(a.center, b.center), mul(c.bend, 2)) : null
  return { from: clipToEdge(a, ctrl ?? b.center), to: clipToEdge(b, ctrl ?? a.center), ctrl }
}

/** The point halfway along the connector (on the curve when bent, on the middle leg when right-angled). */
export function connectorMid(r: ResolvedConnector): Point {
  if (r.via?.length) return mid(r.via[0], r.via[r.via.length - 1])
  if (!r.ctrl) return mid(r.from, r.to)
  return { x: (r.from.x + 2 * r.ctrl.x + r.to.x) / 4, y: (r.from.y + 2 * r.ctrl.y + r.to.y) / 4 }
}

/** The `bend` value that makes the connector pass through `handle`. Undefined = no bend. */
export function bendThrough(c: ConnectorNode, doc: FigDoc, handle: Point): Point | undefined {
  const a = anchorOf(c.from, doc)
  const b = anchorOf(c.to, doc)
  if (c.route === 'elbow') {
    if (hasOneCorner(c)) return undefined
    const { bend: _ignored, ...plain } = c
    const r = resolveElbow(plain, a, b)
    const [horizontal] = elbowRuns(c, a, b)
    const offset = horizontal ? handle.x - (r.from.x + r.to.x) / 2 : handle.y - (r.from.y + r.to.y) / 2
    if (Math.abs(offset) < 3) return undefined
    return horizontal ? { x: round(offset, 1), y: 0 } : { x: 0, y: round(offset, 1) }
  }
  const r = resolveConnector(c, doc)
  const ctrl = sub(mul(handle, 2), mid(r.from, r.to))
  const bend = mul(sub(ctrl, mid(a.center, b.center)), 0.5)
  return len(bend) < 4 ? undefined : { x: round(bend.x, 1), y: round(bend.y, 1) }
}

/** Where a connector's label is drawn: beside the line, plus any offset the user dragged it by. */
export function connectorLabelPos(
  c: Pick<ConnectorNode, 'strokeWidth' | 'labelOffset'>,
  r: ResolvedConnector,
): { x: number; y: number; anchor: 'middle' | 'start' } {
  const at = connectorMid(r)
  const a = r.via?.length ? r.via[0] : r.from
  const b = r.via?.length ? r.via[r.via.length - 1] : r.to
  const horizontal = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y)
  const off = c.labelOffset ?? { x: 0, y: 0 }
  return horizontal
    ? { x: at.x + off.x, y: at.y - 8 - c.strokeWidth / 2 + off.y, anchor: 'middle' }
    : { x: at.x + 9 + c.strokeWidth / 2 + off.x, y: at.y + 5 + off.y, anchor: 'start' }
}

/** Size of the words on an arrow, which is fixed. */
export const ARROW_LABEL_SIZE = 14

/**
 * The words on an arrow as a label, drawn like any other label, so the marks for raised and
 * lowered text, italics and bold work there too. Null when the arrow has no words. It carries the
 * arrow's id, so a tap on the words is a tap on the arrow.
 */
export function connectorLabelNode(c: ConnectorNode, r: ResolvedConnector): TextNode | null {
  const text = c.label?.trim()
  if (!text) return null
  const at = connectorLabelPos(c, r)
  // `at.y` is the line the words stand on; a label is placed by its top.
  return { id: c.id, type: 'text', x: at.x, y: at.y - ARROW_LABEL_SIZE * 0.92, text, fontSize: ARROW_LABEL_SIZE, fill: c.stroke, align: at.anchor === 'middle' ? 'center' : 'left', rotation: 0 }
}

// ---------- boxes ----------

/** The node's own box (before rotation is applied about its centre). */
export function getBox(node: FigNode, doc: FigDoc): Box {
  switch (node.type) {
    case 'icon':
    case 'shape':
    case 'image':
    case 'chart':
    case 'table':
    case 'structure':
      return { x: node.x, y: node.y, w: node.w, h: node.h, rotation: node.rotation }
    case 'text': {
      const m = measureText(node)
      const x = node.align === 'center' ? node.x - m.w / 2 : node.align === 'right' ? node.x - m.w : node.x
      return { x, y: node.y, w: m.w, h: m.h, rotation: node.rotation }
    }
    case 'membrane': {
      const r = rectOfPoints(node.points)
      const p = node.thickness / 2
      return { x: r.x - p, y: r.y - p, w: r.w + 2 * p, h: r.h + 2 * p, rotation: 0 }
    }
    case 'stroke': {
      const r = rectOfPoints(node.points.map(([x, y]) => ({ x, y })))
      const p = node.size / 2
      return { x: r.x - p, y: r.y - p, w: r.w + 2 * p, h: r.h + 2 * p, rotation: 0 }
    }
    case 'connector': {
      const r = resolveConnector(node, doc)
      return { ...rectOfPoints([r.from, r.to, connectorMid(r), ...(r.via ?? [])]), rotation: 0 }
    }
  }
}

/** Axis-aligned bounds of the node as drawn (rotation included). */
export const getRect = (node: FigNode, doc: FigDoc): Rect => rectOfBox(getBox(node, doc))

// ---------- transforms ----------

type Triple = [number, number, number]

export function translateNode<T extends FigNode>(node: T, dx: number, dy: number): T {
  if (!dx && !dy) return node
  switch (node.type) {
    case 'icon':
    case 'shape':
    case 'text':
    case 'image':
    case 'chart':
    case 'table':
    case 'structure':
      return { ...node, x: node.x + dx, y: node.y + dy }
    case 'membrane':
      return { ...node, points: node.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) }
    case 'stroke':
      return { ...node, points: node.points.map(([x, y, p]) => [x + dx, y + dy, p] as Triple) }
    case 'connector':
      return {
        ...node,
        from: { ...node.from, x: node.from.x + dx, y: node.from.y + dy },
        to: { ...node.to, x: node.to.x + dx, y: node.to.y + dy },
      }
  }
}

function mapPoint(p: Point, from: Rect, to: Rect): Point {
  return {
    x: to.x + (from.w > 1e-6 ? ((p.x - from.x) / from.w) * to.w : to.w / 2),
    y: to.y + (from.h > 1e-6 ? ((p.y - from.y) / from.h) * to.h : to.h / 2),
  }
}

const inset = (r: Rect, p: number): Rect => ({
  x: r.x + p,
  y: r.y + p,
  w: Math.max(0, r.w - 2 * p),
  h: Math.max(0, r.h - 2 * p),
})

/** Fit a node into `newBox`, given the box it had before (`oldBox`). Connectors are left alone. */
export function resizeNode(node: FigNode, oldBox: Box, newBox: Box): FigNode {
  switch (node.type) {
    case 'icon':
    case 'shape':
    case 'image':
    case 'chart':
    case 'table':
    case 'structure':
      return { ...node, x: newBox.x, y: newBox.y, w: newBox.w, h: newBox.h }
    case 'text': {
      const scale = oldBox.h > 1e-6 ? newBox.h / oldBox.h : 1
      if (node.width) {
        // A text box. Pulled at a side it gets wider or narrower and its words are broken anew;
        // pulled at a corner (or resized as a picture) its lettering grows with it.
        const sideways = Math.abs(scale - 1) < 1e-6
        const width = clamp(round(newBox.w, 1), TEXT_WIDTH_MIN, TEXT_WIDTH_MAX)
        const box: TextNode = { ...node, width, fontSize: sideways ? node.fontSize : clamp(round(node.fontSize * scale, 1), 4, 400) }
        box.x = round(node.align === 'center' ? newBox.x + width / 2 : node.align === 'right' ? newBox.x + width : newBox.x, 1)
        box.y = round(newBox.y, 1)
        return box
      }
      const next: TextNode = { ...node, fontSize: clamp(round(node.fontSize * scale, 1), 4, 400) }
      const m = measureText(next)
      const c = rectCenter(newBox)
      const left = c.x - m.w / 2
      next.x = node.align === 'center' ? c.x : node.align === 'right' ? left + m.w : left
      next.y = c.y - m.h / 2
      return next
    }
    case 'membrane': {
      const p = node.thickness / 2
      const a = inset(oldBox, p)
      const b = inset(newBox, p)
      return { ...node, points: node.points.map((pt) => mapPoint(pt, a, b)) }
    }
    case 'stroke': {
      const p = node.size / 2
      const a = inset(oldBox, p)
      const b = inset(newBox, p)
      return {
        ...node,
        points: node.points.map(([x, y, pr]) => {
          const q = mapPoint({ x, y }, a, b)
          return [q.x, q.y, pr] as Triple
        }),
      }
    }
    default:
      return node
  }
}

const normDeg = (d: number): number => round(((d % 360) + 360) % 360, 1)

/** Rotate a node by `delta` degrees about its own centre. */
export function rotateNode<T extends FigNode>(node: T, delta: number, doc: FigDoc): T {
  if (!delta) return node
  return rotateNodeAbout(node, delta, rectCenter(getBox(node, doc)), doc)
}

/** Rotate a node by `delta` degrees about any point (used when several objects turn together). */
export function rotateNodeAbout<T extends FigNode>(node: T, delta: number, origin: Point, doc: FigDoc): T {
  if (!delta) return node
  switch (node.type) {
    case 'icon':
    case 'shape':
    case 'text':
    case 'image':
    case 'chart':
    case 'table':
    case 'structure': {
      const c = rectCenter(getBox(node, doc))
      const moved = rotate(c, delta, origin)
      return { ...translateNode(node, moved.x - c.x, moved.y - c.y), rotation: normDeg(node.rotation + delta) }
    }
    case 'membrane':
      return { ...node, points: node.points.map((p) => rotate(p, delta, origin)) }
    case 'stroke':
      return {
        ...node,
        points: node.points.map(([x, y, pr]) => {
          const q = rotate({ x, y }, delta, origin)
          return [q.x, q.y, pr] as Triple
        }),
      }
    case 'connector': {
      const turn = (ep: Endpoint): Endpoint => ({ ...ep, ...rotate({ x: ep.x, y: ep.y }, delta, origin) })
      // After a quarter turn, what ran sideways runs up and down.
      const quarter = Math.abs(delta % 90) < 1e-6 && Math.round(delta / 90) % 2 !== 0
      const swap = (leg: string): string => (leg === 'h' ? 'v' : 'h')
      return {
        ...node,
        from: turn(node.from),
        to: turn(node.to),
        ...(node.bend && node.route !== 'elbow' ? { bend: rotate(node.bend, delta) } : {}),
        ...(node.legs && quarter ? { legs: (swap(node.legs[0]) + swap(node.legs[1])) as ElbowLegs } : {}),
      }
    }
  }
}

/** Scale a node by factor `s` about `origin`, keeping its proportions (used when several objects resize together). */
export function scaleNode<T extends FigNode>(node: T, s: number, origin: Point, doc: FigDoc): T {
  if (s === 1) return node
  const at = (p: Point): Point => ({ x: origin.x + (p.x - origin.x) * s, y: origin.y + (p.y - origin.y) * s })
  switch (node.type) {
    case 'icon':
    case 'shape':
    case 'image':
    case 'chart':
    case 'table':
    case 'structure': {
      const c = at(rectCenter(getBox(node, doc)))
      const w = node.w * s
      const h = node.h * s
      // The words inside a shape grow and shrink with it, like a label resized in the same group.
      const label = node.type === 'shape' && node.label ? { label: { ...node.label, fontSize: clamp(round(node.label.fontSize * s, 1), 4, 400) } } : {}
      // A chart's lettering grows and shrinks with it in the same way.
      const lettering = node.type === 'chart' ? { fontSize: clamp(round((node.fontSize ?? 13) * s, 1), 6, 60) } : node.type === 'table' ? { fontSize: clamp(round((node.fontSize ?? 14) * s, 1), 4, 200) } : {}
      return { ...node, x: c.x - w / 2, y: c.y - h / 2, w, h, ...label, ...lettering }
    }
    case 'text': {
      const box = getBox(node, doc)
      const c = at(rectCenter(box))
      const w = box.w * s
      const h = box.h * s
      return resizeNode(node, box, { x: c.x - w / 2, y: c.y - h / 2, w, h, rotation: box.rotation }) as T
    }
    case 'membrane':
      return { ...node, points: node.points.map(at), thickness: clamp(round(node.thickness * s, 1), 6, 120) }
    case 'stroke':
      return {
        ...node,
        size: clamp(round(node.size * s, 1), 0.5, 100),
        points: node.points.map(([x, y, pr]) => {
          const q = at({ x, y })
          return [q.x, q.y, pr] as Triple
        }),
      }
    case 'connector': {
      const grow = (ep: Endpoint): Endpoint => ({ ...ep, ...at({ x: ep.x, y: ep.y }) })
      return {
        ...node,
        from: grow(node.from),
        to: grow(node.to),
        ...(node.bend ? { bend: mul(node.bend, s) } : {}),
        ...(node.labelOffset ? { labelOffset: mul(node.labelOffset, s) } : {}),
      }
    }
  }
}

/**
 * New box after dragging a resize handle.
 * `hx`/`hy` say which handle (-1, 0 or 1 on each axis); `pointer` is where it was dragged to.
 * The opposite side stays where it is, also for rotated boxes.
 */
export function dragHandle(box: Box, hx: number, hy: number, pointer: Point, keepAspect: boolean, minSize = 4): Box {
  const c = rectCenter(box)
  const anchorLocal = { x: (-hx * box.w) / 2, y: (-hy * box.h) / 2 }
  const anchor = add(c, rotate(anchorLocal, box.rotation))
  const v = rotate(sub(pointer, anchor), -box.rotation)
  let w = hx ? Math.max(minSize, v.x * hx) : box.w
  let h = hy ? Math.max(minSize, v.y * hy) : box.h
  if (keepAspect && box.w > 1e-6 && box.h > 1e-6) {
    const s = hx && hy ? Math.max(w / box.w, h / box.h) : hx ? w / box.w : h / box.h
    w = box.w * s
    h = box.h * s
  }
  const center = add(anchor, rotate({ x: (hx * w) / 2, y: (hy * h) / 2 }, box.rotation))
  return { x: center.x - w / 2, y: center.y - h / 2, w, h, rotation: box.rotation }
}
