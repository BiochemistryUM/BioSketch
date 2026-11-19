// Reading a pathway file as a BioSketch figure.
//
// GPML is the file format of WikiPathways and PathVisio: XML that lists every gene, protein and
// metabolite with its place and size, every line with its end marks, and the shapes, labels and
// groups around them. Nothing is traced from a picture: each element becomes an ordinary BioSketch
// object (a shape with its name inside, a label, an arrow), so the figure can be changed like any
// other.
//
// A pathway file is as untrusted as any file: it is parsed as data, never put into the page as
// markup, its size and number of objects are limited, and the figure that comes out goes through
// `validateDoc` like a figure file.

import { INK } from '../model/build'
import { emptyDoc, uid } from '../model/doc'
import { clamp, rectOfPoints, round, unionRects } from '../model/geometry'
import { bendThrough } from '../model/nodes'
import { LINE_HEIGHT } from '../model/types'
import type { ConnectorKind, ConnectorNode, ElbowLegs, Endpoint, FigDoc, FigNode, Point, Rect, ShapeKind, ShapeNode, TextAlign, TextNode } from '../model/types'
import { validateDoc } from './files'

/** Files a pathway can be read from. */
export const PATHWAY_ACCEPT = '.gpml,.xml,application/xml,text/xml'
/** The largest pathway file that is opened (the largest on WikiPathways is about 1 MB). */
export const MAX_PATHWAY_FILE = 10 * 1024 * 1024
/** The most objects a pathway may bring; what comes after is left out and reported. */
export const MAX_PATHWAY_OBJECTS = 6000

/** 'soft' redraws the pathway in BioSketch's colours by type of molecule; 'file' keeps the colours of the file. */
export type PathwayLook = 'soft' | 'file'

export interface ImportedPathway {
  doc: FigDoc
  /** The pathway's name and organism as the file states them. */
  title: string
  organism: string
  /** How many of each kind of object were built. */
  counts: { molecules: number; arrows: number; labels: number; shapes: number; groups: number }
  /** What could not be carried over exactly, in words for the scientist. */
  notes: string[]
}

/** The file's units are screen pixels at a small size (names in 10 px); everything is enlarged to BioSketch's usual sizes. */
const SCALE = 1.5
const FONT_SCALE = 1.4
/** Empty page kept around the pathway. */
const MARGIN = 40
/** Space between the members of a group and the outline drawn around them. */
const GROUP_PAD = 8 * SCALE
/**
 * How far an end that is simply attached to its object may land from where the file draws it.
 * Beyond that the end keeps its own place on the object (a port). Right-angled lines are stricter:
 * a small shift there shows as a kink.
 */
const NEAR = 8
const NEAR_RIGHT_ANGLED = 1.5

const GPML_FORMATS = ['http://pathvisio.org/GPML/2013a', 'http://genmapp.org/GPML/2010a']

// ---------- reading attributes ----------

const kids = (el: Element, name: string): Element[] => Array.from(el.children).filter((c) => c.localName === name)
const attr = (el: Element | undefined, name: string): string | null => el?.getAttribute(name) ?? null
function numAttr(el: Element | undefined, name: string): number | null {
  const raw = attr(el, name)
  if (raw === null || raw.trim() === '') return null
  const v = Number(raw)
  return Number.isFinite(v) && Math.abs(v) < 1e6 ? v : null
}

const NAMED: Record<string, string> = { white: '#ffffff', black: '#000000', gray: '#808080', grey: '#808080', red: '#ff0000', green: '#008000', blue: '#0000ff', yellow: '#ffff00', orange: '#ffa500' }

/** A colour of the file as BioSketch writes it: '#rrggbb', 'none' for transparent, null when absent or unreadable. */
export function gpmlColor(raw: string | null): string | null {
  const v = (raw ?? '').trim().toLowerCase()
  if (!v) return null
  if (v === 'transparent') return 'none'
  if (/^#?[0-9a-f]{6}$/.test(v)) return `#${v.replace('#', '')}`
  return NAMED[v] ?? null
}

/** A colour moved a share `t` of the way towards another. */
function mix(a: string, b: string, t: number): string {
  const ch = (hex: string, i: number): number => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
  return `#${[0, 1, 2].map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t).toString(16).padStart(2, '0')).join('')}`
}

/** A turn of the file (radians, or the name of a side) in degrees. */
function degrees(raw: string | null): number {
  const v = (raw ?? '').trim().toLowerCase()
  const sides: Record<string, number> = { top: 0, right: 90, bottom: 180, left: 270 }
  if (v in sides) return sides[v]
  const rad = Number(v)
  if (!v || !Number.isFinite(rad)) return 0
  const deg = Math.round(((rad * 180) / Math.PI) * 100) / 100
  return ((deg % 360) + 360) % 360
}

// ---------- shapes and end marks ----------

/** The BioSketch shape drawn for a shape of the file; `approx` names an outline BioSketch does not have. */
export function shapeFor(shapeType: string): { shape: ShapeKind; approx?: string; organelle?: boolean } {
  switch (shapeType.trim().toLowerCase()) {
    case 'rectangle':
      return { shape: 'rect' }
    case 'roundedrectangle':
      return { shape: 'roundrect' }
    case 'oval':
    case 'ellipse':
    case 'circle':
      return { shape: 'ellipse' }
    case 'triangle':
      return { shape: 'triangle' }
    case 'hexagon':
      return { shape: 'hexagon' }
    case 'brace':
      return { shape: 'bracket' }
    case 'pentagon':
    case 'octagon':
      return { shape: 'hexagon', approx: shapeType.trim().toLowerCase() }
    case 'arc':
      return { shape: 'ellipse', approx: 'arc' }
    case 'mitochondria':
    case 'nucleus':
    case 'vesicle':
      return { shape: 'ellipse', organelle: true }
    case 'cell':
    case 'organelle':
    case 'endoplasmic reticulum':
    case 'sarcoplasmic reticulum':
    case 'golgi apparatus':
      return { shape: 'roundrect', organelle: true }
    default:
      return { shape: 'rect', approx: shapeType.trim().toLowerCase() || 'unnamed shape' }
  }
}

/** The BioSketch end mark for an end mark of the file; null when the end has none. */
export function headKind(head: string | null): Exclude<ConnectorKind, 'line' | 'double'> | null {
  const h = (head ?? '').trim().toLowerCase()
  if (!h || h === 'line') return null
  if (/inhibit|tbar/.test(h)) return 'inhibit'
  if (/cataly/.test(h)) return 'dot'
  if (/gap|bond|branch/.test(h)) return null
  return 'arrow'
}

// ---------- colours by type of molecule ----------

const SOFT: Record<string, { fill: string; stroke: string }> = {
  geneproduct: { fill: '#e3f3ef', stroke: '#1f8f84' },
  protein: { fill: '#e3f3ef', stroke: '#1f8f84' },
  rna: { fill: '#f1ecfb', stroke: '#8a6fd1' },
  metabolite: { fill: '#fff3d6', stroke: '#d39a1c' },
  pathway: { fill: '#eaf5e4', stroke: '#4f9a3a' },
  other: { fill: '#f1f3f5', stroke: '#8a94a0' },
}
/** Colours WikiPathways gives a type by habit; in BioSketch's colours they count as "no colour chosen". */
const HABIT: Record<string, string> = { metabolite: '#0000ff', pathway: '#14961e' }
const GROUP_GREY = '#8a94a0'

interface Style {
  fill: string
  stroke: string
  text: string
}

function moleculeStyle(type: string, color: string | null, fill: string | null, look: PathwayLook): Style {
  if (look === 'file') {
    const stroke = color && color !== 'none' ? color : '#000000'
    return { fill: fill ?? '#ffffff', stroke, text: stroke }
  }
  const soft = SOFT[type] ?? SOFT.other
  // A colour the author chose (not black, not the habitual colour of the type) says something: keep it.
  const own = color && color !== 'none' && color !== '#000000' && color !== HABIT[type] ? color : null
  if (fill && fill !== 'none' && fill !== '#ffffff') {
    return { fill: mix(fill, '#ffffff', 0.6), stroke: own ?? mix(fill, '#000000', 0.3), text: own ?? INK }
  }
  return { fill: fill === 'none' ? 'none' : soft.fill, stroke: own ?? soft.stroke, text: own ?? INK }
}

// ---------- building ----------

interface Target {
  /** The BioSketch object an arrow can be attached to; null for a point on another arrow or a group without an outline. */
  id: string | null
  rect: Rect | null
  /** A point on another line, and whether that line runs more sideways than up and down. */
  onLine?: boolean
  sideways?: boolean
  /** A group that is not drawn: an arrow to it is attached to the member it reaches. */
  members?: { id: string; rect: Rect }[]
}

interface Built {
  z: number
  node: FigNode
  /** The space the object takes in the file (enlarged), for the page size and for attaching arrows. */
  rect: Rect
}

interface LineExtra {
  id: string
  /** A point the line should pass through (a corner of the file's line). */
  handle?: Point
}

const inside = (p: Point, r: Rect, pad = 0): boolean => p.x > r.x - pad && p.x < r.x + r.w + pad && p.y > r.y - pad && p.y < r.y + r.h + pad

/** Where a line from the middle of `r` towards `toward` leaves the rectangle. */
function edgePoint(r: Rect, toward: Point): Point {
  const c = { x: r.x + r.w / 2, y: r.y + r.h / 2 }
  const d = { x: toward.x - c.x, y: toward.y - c.y }
  const s = Math.min(d.x ? r.w / 2 / Math.abs(d.x) : Infinity, d.y ? r.h / 2 / Math.abs(d.y) : Infinity)
  return Number.isFinite(s) ? { x: c.x + d.x * s, y: c.y + d.y * s } : c
}

/** How far a point lies from a rectangle (0 inside it). */
const distanceTo = (r: Rect, p: Point): number => Math.hypot(Math.max(r.x - p.x, 0, p.x - (r.x + r.w)), Math.max(r.y - p.y, 0, p.y - (r.y + r.h)))

/** Which way a line leaves a place on an object: sideways from its left and right, up or down from its top and bottom (the rule of PathVisio). */
type Side = 'h' | 'v'
const sideOf = (port: Point): Side => (Math.abs(port.x) > Math.abs(port.y) ? 'h' : 'v')

/** The point halfway along a line through `pts`. */
function halfway(pts: Point[]): Point {
  const lens = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y))
  let rest = lens.reduce((a, b) => a + b, 0) / 2
  for (let i = 0; i < lens.length; i++) {
    if (rest <= lens[i] && lens[i] > 0) {
      const t = rest / lens[i]
      return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * t, y: pts[i].y + (pts[i + 1].y - pts[i].y) * t }
    }
    rest -= lens[i]
  }
  return pts[Math.floor(pts.length / 2)]
}

const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`

/**
 * Build a figure from the text of a GPML file. Throws an error with a message for the scientist
 * when the text is not a pathway file BioSketch can read.
 */
export function readGpml(text: string, options: { look?: PathwayLook } = {}): ImportedPathway {
  const look: PathwayLook = options.look ?? 'soft'
  if (text.length > MAX_PATHWAY_FILE) throw new Error('This pathway file is too large to open.')
  if (typeof DOMParser === 'undefined') throw new Error('Pathway files cannot be read here.')
  const xml = new DOMParser().parseFromString(text, 'application/xml')
  const root = xml.documentElement
  if (!root || xml.getElementsByTagName('parsererror').length || root.localName !== 'Pathway') {
    throw new Error('This file is not a pathway file (GPML). Download the pathway as GPML from WikiPathways, or save it from PathVisio.')
  }
  const format = root.namespaceURI ?? ''
  if (/GPML\/20(2|3)\d/.test(format)) {
    throw new Error('This pathway is saved in the newer GPML 2021 format, which BioSketch does not read yet. Save it as GPML 2013a from PathVisio, or download it from WikiPathways.')
  }
  if (!GPML_FORMATS.includes(format)) {
    throw new Error('This pathway file is in a format BioSketch does not read. Open it in PathVisio and save it again as GPML 2013a.')
  }

  const ink = look === 'soft' ? INK : '#000000'
  const built: Built[] = []
  const targets = new Map<string, Target>()
  /** The group of the file each object sits in, by the object's BioSketch id. */
  const memberOf = new Map<string, string>()
  const organelles = new Set<string>()
  const approx = new Set<string>()
  let approxCount = 0
  let skipped = 0
  let cut = false
  const counts = { molecules: 0, arrows: 0, labels: 0, shapes: 0, groups: 0 }
  const room = (): boolean => {
    if (built.length < MAX_PATHWAY_OBJECTS) return true
    cut = true
    return false
  }

  const boxOf = (g: Element | undefined): Rect | null => {
    const cx = numAttr(g, 'CenterX')
    const cy = numAttr(g, 'CenterY')
    const w = numAttr(g, 'Width')
    const h = numAttr(g, 'Height')
    if (cx === null || cy === null || w === null || h === null || w <= 0 || h <= 0) return null
    return { x: (cx - w / 2) * SCALE, y: (cy - h / 2) * SCALE, w: w * SCALE, h: h * SCALE }
  }
  const fontOf = (g: Element | undefined, fallback: number): { fontSize: number; bold?: true; italic?: true } => ({
    fontSize: Math.round(Math.min(200, Math.max(4, (numAttr(g, 'FontSize') ?? fallback) * FONT_SCALE)) * 2) / 2,
    ...(attr(g, 'FontWeight')?.toLowerCase() === 'bold' ? { bold: true as const } : {}),
    ...(attr(g, 'FontStyle')?.toLowerCase() === 'italic' ? { italic: true as const } : {}),
  })
  const lineOf = (g: Element | undefined): { strokeWidth: number; dashed?: true } => ({
    strokeWidth: Math.min(12, Math.max(look === 'soft' ? 1.5 : 1, (numAttr(g, 'LineThickness') ?? 1) * SCALE)),
    ...(attr(g, 'LineStyle')?.toLowerCase() === 'broken' ? { dashed: true as const } : {}),
  })
  const words = (el: Element): string => (attr(el, 'TextLabel') ?? '').replace(/\r\n?/g, '\n').trim()

  /** Words without an outline, placed as the file places them in their box. */
  const textAt = (id: string, text: string, rect: Rect, g: Element | undefined, fill: string, fallbackSize: number): TextNode => {
    const font = fontOf(g, fallbackSize)
    const side = attr(g, 'Align')?.toLowerCase()
    const align: TextAlign = side === 'left' || side === 'right' ? side : 'center'
    const height = text.split('\n').length * font.fontSize * LINE_HEIGHT
    const valign = attr(g, 'Valign')?.toLowerCase()
    return {
      id,
      type: 'text',
      x: align === 'left' ? rect.x : align === 'right' ? rect.x + rect.w : rect.x + rect.w / 2,
      y: valign === 'top' ? rect.y : valign === 'bottom' ? rect.y + rect.h - height : rect.y + rect.h / 2 - height / 2,
      text,
      fill,
      align,
      rotation: 0,
      ...font,
    }
  }

  /** A shape of the file as a BioSketch shape; a brace lies along its width in the file and stands upright in BioSketch, so it is turned. */
  const shapeAt = (id: string, shapeType: string, rect: Rect, g: Element | undefined, style: Style, label: string, fallbackSize: number, soften = false): ShapeNode => {
    const kind = shapeFor(shapeType)
    if (kind.approx) {
      approx.add(kind.approx)
      approxCount++
    }
    if (kind.organelle) organelles.add(shapeType.trim().toLowerCase())
    const shape = soften && kind.shape === 'rect' ? 'roundrect' : kind.shape
    const brace = shape === 'bracket'
    const box = brace ? { x: rect.x + rect.w / 2 - rect.h / 2, y: rect.y + rect.h / 2 - rect.w / 2, w: rect.h, h: rect.w } : rect
    return {
      id,
      type: 'shape',
      shape,
      ...box,
      rotation: (degrees(attr(g, 'Rotation')) + (brace ? 90 : 0)) % 360,
      fill: style.fill,
      stroke: style.stroke,
      ...lineOf(g),
      ...(label ? { label: { text: label, fill: style.text, ...fontOf(g, fallbackSize) } } : {}),
    }
  }

  const add = (el: Element, node: FigNode, rect: Rect, z: number): void => {
    built.push({ z, node, rect })
    const graphId = attr(el, 'GraphId')
    if (graphId) targets.set(graphId, { id: node.id, rect })
    const group = attr(el, 'GroupRef')
    if (group) memberOf.set(node.id, group)
  }

  // Molecules: genes, proteins, metabolites and links to other pathways.
  const moleculeBox = new Map<string, { id: string; rect: Rect; z: number }>()
  for (const el of kids(root, 'DataNode')) {
    if (!room()) break
    const g = kids(el, 'Graphics')[0]
    const rect = boxOf(g)
    if (!rect) {
      skipped++
      continue
    }
    const id = uid()
    const type = (attr(el, 'Type') ?? '').toLowerCase()
    const style = moleculeStyle(type, gpmlColor(attr(g, 'Color')), gpmlColor(attr(g, 'FillColor')), look)
    const shapeType = attr(g, 'ShapeType') ?? 'Rectangle'
    const label = words(el)
    const z = numAttr(g, 'ZOrder') ?? 32768
    if (shapeType.toLowerCase() === 'none') {
      if (!label) {
        skipped++
        continue
      }
      const habit = look === 'soft' && HABIT[type] && gpmlColor(attr(g, 'Color')) === HABIT[type] ? (SOFT[type] ?? SOFT.other).stroke : null
      add(el, textAt(id, label, rect, g, habit ?? style.text, 10), rect, z)
    } else {
      add(el, shapeAt(id, shapeType, rect, g, style, label, 10, look === 'soft'), rect, z)
    }
    counts.molecules++
    const graphId = attr(el, 'GraphId')
    if (graphId) moleculeBox.set(graphId, { id, rect, z })
  }

  // Marks on a molecule (a phosphate, for example): small shapes that stay with their molecule.
  const withMarks = new Map<string, string>()
  for (const el of kids(root, 'State')) {
    if (!room()) break
    const g = kids(el, 'Graphics')[0]
    const parent = moleculeBox.get(attr(el, 'GraphRef') ?? '')
    const w = (numAttr(g, 'Width') ?? 15) * SCALE
    const h = (numAttr(g, 'Height') ?? 15) * SCALE
    if (!parent || w <= 0 || h <= 0) {
      skipped++
      continue
    }
    const cx = parent.rect.x + parent.rect.w / 2 + ((numAttr(g, 'RelX') ?? 0) * parent.rect.w) / 2
    const cy = parent.rect.y + parent.rect.h / 2 + ((numAttr(g, 'RelY') ?? 0) * parent.rect.h) / 2
    const rect = { x: cx - w / 2, y: cy - h / 2, w, h }
    const color = gpmlColor(attr(g, 'Color'))
    const stroke = color && color !== 'none' ? color : ink
    const fill = gpmlColor(attr(g, 'FillColor')) ?? '#ffffff'
    const id = uid()
    const node = shapeAt(id, attr(g, 'ShapeType') ?? 'Oval', rect, g, { fill, stroke, text: stroke }, words(el), 10)
    const size = Math.round(Math.min(node.label?.fontSize ?? 14, h * 0.6) * 2) / 2
    add(el, node.label ? { ...node, label: { ...node.label, fontSize: Math.max(4, size) } } : node, rect, parent.z + 0.5)
    withMarks.set(id, parent.id)
  }

  // Shapes (compartments, cell outlines) and labels.
  for (const el of kids(root, 'Shape')) {
    if (!room()) break
    const g = kids(el, 'Graphics')[0]
    const rect = boxOf(g)
    const shapeType = attr(g, 'ShapeType') ?? 'Rectangle'
    const label = words(el)
    const none = shapeType.toLowerCase() === 'none'
    if (!rect || (none && !label)) {
      skipped++
      continue
    }
    const color = gpmlColor(attr(g, 'Color'))
    const stroke = color && color !== 'none' ? color : ink
    const z = numAttr(g, 'ZOrder') ?? 16384
    const id = uid()
    if (none) add(el, textAt(id, label, rect, g, stroke, 10), rect, z)
    else add(el, shapeAt(id, shapeType, rect, g, { fill: gpmlColor(attr(g, 'FillColor')) ?? 'none', stroke, text: stroke }, label, 10), rect, z)
    counts.shapes++
  }
  for (const el of kids(root, 'Label')) {
    if (!room()) break
    const g = kids(el, 'Graphics')[0]
    const rect = boxOf(g)
    const label = words(el)
    if (!rect || !label) {
      skipped++
      continue
    }
    const color = gpmlColor(attr(g, 'Color'))
    const stroke = color && color !== 'none' ? color : ink
    const shapeType = attr(g, 'ShapeType') ?? 'None'
    const z = numAttr(g, 'ZOrder') ?? 28672
    const id = uid()
    if (shapeType.toLowerCase() === 'none') add(el, textAt(id, label, rect, g, stroke, 12), rect, z)
    else add(el, shapeAt(id, shapeType, rect, g, { fill: gpmlColor(attr(g, 'FillColor')) ?? 'none', stroke, text: stroke }, label, 12), rect, z)
    counts.labels++
  }

  // Lines of the file, read before the groups so that a group's outline can be put under the lines inside it.
  interface RawLine {
    g: Element | undefined
    pts: { p: Point; ref: string | null; relX: number | null; relY: number | null; head: string | null }[]
    z: number
  }
  const rawLines: RawLine[] = []
  for (const el of [...kids(root, 'Interaction'), ...kids(root, 'GraphicalLine')]) {
    const g = kids(el, 'Graphics')[0]
    const pts = (g ? kids(g, 'Point') : []).flatMap((pt) => {
      const x = numAttr(pt, 'X')
      const y = numAttr(pt, 'Y')
      if (x === null || y === null) return []
      return [{ p: { x: x * SCALE, y: y * SCALE }, ref: attr(pt, 'GraphRef'), relX: numAttr(pt, 'RelX'), relY: numAttr(pt, 'RelY'), head: attr(pt, 'ArrowHead') }]
    })
    if (pts.length < 2) {
      skipped++
      continue
    }
    rawLines.push({ g, pts, z: numAttr(g, 'ZOrder') ?? 12288 })
    // A point on this line that other lines end on.
    const run = { x: pts[pts.length - 1].p.x - pts[0].p.x, y: pts[pts.length - 1].p.y - pts[0].p.y }
    for (const anchor of g ? kids(g, 'Anchor') : []) {
      const graphId = attr(anchor, 'GraphId')
      if (graphId) targets.set(graphId, { id: null, rect: null, onLine: true, sideways: Math.abs(run.x) >= Math.abs(run.y) })
    }
  }

  // Groups: the objects of a group move together. A complex gets an outline, and so does a plain
  // group (dashed); a group of the style "Group" is a stack of molecules that is not drawn at all.
  const groups = new Map<string, { el: Element; parent: string | null }>()
  for (const el of kids(root, 'Group')) {
    const groupId = attr(el, 'GroupId')
    if (groupId) groups.set(groupId, { el, parent: attr(el, 'GroupRef') })
  }
  const topOf = (groupId: string): string => {
    let at = groupId
    for (let i = 0; i < 20; i++) {
      const parent = groups.get(at)?.parent
      if (!parent || !groups.has(parent)) break
      at = parent
    }
    return at
  }
  const sharedId = new Map<string, string>()
  const groupIdFor = (key: string): string => sharedId.get(key) ?? (sharedId.set(key, uid()), sharedId.get(key)!)
  const groupOfNode = new Map<string, string>()
  const members = new Map<string, Built[]>()
  for (const b of built) {
    const group = memberOf.get(b.node.id)
    if (!group || !groups.has(group)) continue
    groupOfNode.set(b.node.id, groupIdFor(topOf(group)))
    // The object counts for the outline of its group and of every group around that one.
    for (let at: string | null | undefined = group, i = 0; at && groups.has(at) && i < 20; at = groups.get(at)!.parent, i++) {
      members.set(at, [...(members.get(at) ?? []), b])
    }
  }
  for (const [groupId, { el }] of groups) {
    const inGroup = members.get(groupId) ?? []
    const graphId = attr(el, 'GraphId')
    const style = (attr(el, 'Style') ?? 'None').toLowerCase()
    if (!inGroup.length) continue
    counts.groups++
    const around = unionRects(inGroup.map((b) => b.rect))
    const rect = { x: around.x - GROUP_PAD, y: around.y - GROUP_PAD, w: around.w + 2 * GROUP_PAD, h: around.h + 2 * GROUP_PAD }
    if (style === 'group' || !room()) {
      // Nothing is drawn for such a group: an arrow to it is attached to the member it reaches.
      const attachable = inGroup.filter((b) => b.node.type === 'shape' || b.node.type === 'text').map((b) => ({ id: b.node.id, rect: b.rect }))
      if (graphId) targets.set(graphId, { id: null, rect, members: attachable })
      continue
    }
    const id = uid()
    const complex = style === 'complex'
    const stroke = style === 'pathway' ? SOFT.pathway.stroke : look === 'soft' ? GROUP_GREY : '#808080'
    const node: ShapeNode = {
      id,
      type: 'shape',
      shape: complex ? 'roundrect' : 'rect',
      ...rect,
      rotation: 0,
      fill: style === 'pathway' ? 'none' : look === 'soft' ? '#f3f5f7' : '#f6f6ee',
      stroke,
      strokeWidth: 1.5,
      ...(complex ? {} : { dashed: true as const }),
    }
    // Under its members, and under any line that runs inside it, so that the fill hides nothing.
    const lineInside = rawLines.filter((l) => l.pts.some((pt) => inside(pt.p, rect))).map((l) => l.z)
    built.push({ z: Math.min(...inGroup.map((b) => b.z), ...lineInside) - 0.5, node, rect })
    groupOfNode.set(id, groupIdFor(topOf(groupId)))
    if (graphId) targets.set(graphId, { id, rect })
  }
  // A molecule with marks on it moves with them.
  for (const [markId, moleculeId] of withMarks) {
    const shared = groupOfNode.get(moleculeId) ?? groupIdFor(`marks:${moleculeId}`)
    groupOfNode.set(moleculeId, shared)
    groupOfNode.set(markId, shared)
  }

  // Arrows.
  const extras: LineExtra[] = []
  let onArrow = 0
  let loose = 0
  let corners = 0
  let bothEnds = 0
  let rerouted = 0
  for (const raw of rawLines) {
    if (!room()) break
    let pts = raw.pts
    const startMark = headKind(pts[0].head)
    const endMark = headKind(pts[pts.length - 1].head)
    // BioSketch marks the end of an arrow: a line marked at its start only is read the other way round.
    if (startMark && !endMark) pts = [...pts].reverse()
    let kind: ConnectorKind = endMark ?? startMark ?? 'line'
    if (startMark && endMark) {
      if (startMark === 'arrow' && endMark === 'arrow') kind = 'double'
      else bothEnds++
    }
    const first = pts[0]
    const last = pts[pts.length - 1]
    const type = (attr(raw.g, 'ConnectorType') ?? 'Straight').toLowerCase()
    const elbow = type === 'elbow'
    let endsOnArrow = false
    /** One end of the line: free, attached, or attached at its own place on the object; and the way the line leaves it, when the file says. */
    const end = (pt: RawLine['pts'][number], other: Point): { ep: Endpoint; side: Side | null } => {
      const free = { x: pt.p.x, y: pt.p.y }
      if (!pt.ref) return { ep: free, side: null }
      let target = targets.get(pt.ref)
      if (target?.onLine) {
        // A line meets another line square on.
        endsOnArrow = true
        return { ep: free, side: target.sideways ? 'v' : 'h' }
      }
      // The place the file gives lies on the object the line is joined to; on a group that is not drawn, that is no object of the figure.
      const given = pt.relX !== null && pt.relY !== null ? { x: clamp(pt.relX, -1, 1), y: clamp(pt.relY, -1, 1) } : null
      let onTarget = true
      if (target && !target.id && target.members?.length) {
        const nearest = target.members.reduce((a, b) => (distanceTo(b.rect, pt.p) < distanceTo(a.rect, pt.p) ? b : a))
        if (distanceTo(nearest.rect, pt.p) <= 2 * GROUP_PAD) {
          target = nearest
          onTarget = false
        }
      }
      if (!target?.id || !target.rect) {
        loose++
        return { ep: free, side: given ? sideOf(given) : null }
      }
      const r = target.rect
      const c = { x: r.x + r.w / 2, y: r.y + r.h / 2 }
      const port = given && onTarget ? given : { x: clamp((pt.p.x - c.x) / (r.w / 2), -1, 1), y: clamp((pt.p.y - c.y) / (r.h / 2), -1, 1) }
      const side = sideOf(given ?? port)
      const drawn = { x: c.x + (port.x * r.w) / 2, y: c.y + (port.y * r.h) / 2 }
      // Where the end would land if it were simply attached: BioSketch aims a straight line at the
      // middle of the object, and takes a right-angled one from the middle of the side facing the other end.
      const usual = !elbow ? edgePoint(r, other) : side === 'h' ? { x: other.x >= c.x ? r.x + r.w : r.x, y: c.y } : { x: c.x, y: other.y >= c.y ? r.y + r.h : r.y }
      const simply = !inside(other, r, 8) && Math.hypot(usual.x - drawn.x, usual.y - drawn.y) <= (elbow ? NEAR_RIGHT_ANGLED : NEAR)
      return { ep: simply ? { ...free, nodeId: target.id } : { ...free, nodeId: target.id, port: { x: round(port.x, 4), y: round(port.y, 4) } }, side }
    }
    const from = end(first, last.p)
    const to = end(last, first.p)
    if (endsOnArrow) onArrow++
    const color = gpmlColor(attr(raw.g, 'Color'))
    // An end the file says nothing about runs the way BioSketch would choose: along the longer stretch.
    const along: Side = Math.abs(last.p.x - first.p.x) >= Math.abs(last.p.y - first.p.y) ? 'h' : 'v'
    const legs = `${from.side ?? along}${to.side ?? along}` as ElbowLegs
    const id = uid()
    const node: ConnectorNode = {
      id,
      type: 'connector',
      from: from.ep,
      to: to.ep,
      kind,
      stroke: color && color !== 'none' && !(look === 'soft' && color === '#000000') ? color : ink,
      ...lineOf(raw.g),
      ...(elbow ? { route: 'elbow' as const, legs } : {}),
    }
    const extra: LineExtra = { id }
    const between = pts.length - 2
    if (elbow) {
      // The file keeps a point in the middle of each stretch that was moved by hand. BioSketch can
      // place one middle stretch; a line with more corners than that takes its usual route.
      if (between === 1 && legs[0] === legs[1]) extra.handle = pts[1].p
      else if (between > 0) rerouted++
    } else if (between > 0) {
      // One bend is all a BioSketch line has: it is put where the file's line is halfway along.
      extra.handle = halfway(pts.map((pt) => pt.p))
      corners++
    } else if (type === 'curved' && from.side && to.side && from.side !== to.side) {
      // A curved line of the file leaves each object at right angles to its side: curve towards the corner between the two.
      const corner = from.side === 'h' ? { x: last.p.x, y: first.p.y } : { x: first.p.x, y: last.p.y }
      const middle = { x: (first.p.x + last.p.x) / 2, y: (first.p.y + last.p.y) / 2 }
      extra.handle = { x: (middle.x + corner.x) / 2, y: (middle.y + corner.y) / 2 }
    }
    extras.push(extra)
    built.push({ z: raw.z, node, rect: rectOfPoints(pts.map((pt) => pt.p)) })
    counts.arrows++
  }

  if (!built.length) throw new Error('This pathway file holds nothing that can be drawn.')

  // The page: everything moved so that the pathway starts one margin from the top left corner.
  const bounds = unionRects(built.map((b) => b.rect))
  const dx = MARGIN - bounds.x
  const dy = MARGIN - bounds.y
  const shift = (n: FigNode): FigNode => {
    if (n.type === 'connector') return { ...n, from: { ...n.from, x: n.from.x + dx, y: n.from.y + dy }, to: { ...n.to, x: n.to.x + dx, y: n.to.y + dy } }
    if (n.type === 'shape' || n.type === 'text') return { ...n, x: n.x + dx, y: n.y + dy }
    return n
  }
  // The file's drawing order, first at the back; objects of equal height keep the order they were read in.
  const ordered = built.map((b, i) => ({ ...b, i })).sort((a, b) => a.z - b.z || a.i - b.i)
  const title = (attr(root, 'Name') ?? '').trim().slice(0, 120) || 'Pathway'
  let doc: FigDoc = {
    ...emptyDoc(title),
    width: Math.min(20000, Math.max(400, Math.ceil(bounds.w + 2 * MARGIN))),
    height: Math.min(20000, Math.max(300, Math.ceil(bounds.h + 2 * MARGIN))),
    nodes: ordered.map((b) => {
      const groupId = groupOfNode.get(b.node.id)
      return shift(groupId ? { ...b.node, groupId } : b.node)
    }),
  }
  // Bends, worked out on the finished figure because they depend on where attached ends meet their objects.
  const handles = new Map(extras.filter((e) => e.handle).map((e) => [e.id, { x: e.handle!.x + dx, y: e.handle!.y + dy }]))
  doc = {
    ...doc,
    nodes: doc.nodes.map((n) => {
      const handle = n.type === 'connector' ? handles.get(n.id) : undefined
      if (n.type !== 'connector' || !handle) return n
      const bend = bendThrough(n, doc, handle)
      return bend ? { ...n, bend } : n
    }),
  }

  const notes: string[] = []
  if (onArrow) {
    notes.push(
      `${plural(onArrow, 'arrow ends', 'arrows end')} on another arrow (an enzyme acting on a reaction, for example). ${onArrow === 1 ? 'It is' : 'They are'} drawn where the file puts ${onArrow === 1 ? 'it' : 'them'}, but will not follow when the other arrow is moved.`,
    )
  }
  if (loose) notes.push(`${plural(loose, 'arrow end')} could not be attached (the file joins ${loose === 1 ? 'it' : 'them'} to something that is not in the file) and ${loose === 1 ? 'stays' : 'stay'} where the file puts ${loose === 1 ? 'it' : 'them'}.`)
  if (rerouted) notes.push(`${plural(rerouted, 'right-angled line')} with more than two corners ${rerouted === 1 ? 'was' : 'were'} given a simpler route.`)
  if (corners) notes.push(`${plural(corners, 'line')} with several corners ${corners === 1 ? 'was' : 'were'} drawn as one curve.`)
  if (bothEnds) notes.push(`${plural(bothEnds, 'line has', 'lines have')} a mark at both ends; BioSketch draws the mark at one end only.`)
  if (organelles.size) notes.push(`Outlines of organelles (${[...organelles].join(', ')}) were drawn as plain ovals or rounded boxes. An icon from the library can take their place.`)
  if (approxCount) notes.push(`${plural(approxCount, 'outline')} BioSketch does not have (${[...approx].join(', ')}) ${approxCount === 1 ? 'was' : 'were'} drawn as the nearest shape.`)
  if (skipped) notes.push(`${plural(skipped, 'object')} without a place, a size or a text ${skipped === 1 ? 'was' : 'were'} left out.`)
  if (cut) notes.push(`The pathway has more than ${MAX_PATHWAY_OBJECTS} objects; the rest was left out.`)

  return { doc: validateDoc(doc), title, organism: (attr(root, 'Organism') ?? '').trim().slice(0, 80), counts, notes }
}

/** One line that says what was built, for the dialog. */
export function pathwaySummary(p: ImportedPathway): string {
  const c = p.counts
  const parts = [
    c.molecules ? plural(c.molecules, 'gene, protein or metabolite', 'genes, proteins and metabolites') : '',
    c.arrows ? plural(c.arrows, 'arrow or line', 'arrows and lines') : '',
    c.shapes + c.labels ? plural(c.shapes + c.labels, 'shape or label', 'shapes and labels') : '',
    c.groups ? plural(c.groups, 'group') : '',
  ].filter(Boolean)
  return `“${p.title}”${p.organism ? ` (${p.organism})` : ''}: ${parts.join(', ')}.`
}
