// Reading and writing figure files (.biosketch.json).
//
// A file can come from anyone, so nothing in it is trusted: every field is checked and rebuilt,
// and imported icon markup is sanitised again before it can reach the page.

import { isHexColor, normalizeHex, sanitizeBody } from '../icons/svg'
import { uid } from '../model/doc'
import type { ConnectorKind, Endpoint, FigDoc, FigNode, IconDef, Point, ShapeKind, TextAlign } from '../model/types'

const num = (v: unknown, fallback: number, min = -1e6, max = 1e6): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback
const str = (v: unknown, fallback: string, maxLen = 200): string => (typeof v === 'string' ? v.slice(0, maxLen) : fallback)
const bool = (v: unknown): true | undefined => (v === true ? true : undefined)
const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null)
/** Colours end up in SVG attributes; keep them short and free of markup. */
const color = (v: unknown, fallback: string): string => (typeof v === 'string' && /^[#\w(),.%\s-]{1,40}$/.test(v) ? v : fallback)

const SHAPES: ShapeKind[] = ['rect', 'roundrect', 'ellipse']
const KINDS: ConnectorKind[] = ['arrow', 'inhibit', 'line', 'double']
const ALIGNS: TextAlign[] = ['left', 'center', 'right']
const oneOf = <T extends string>(v: unknown, list: T[], fallback: T): T => (list.includes(v as T) ? (v as T) : fallback)

const safeId = (v: unknown): string | null => (typeof v === 'string' && /^[\w-]{1,64}$/.test(v) ? v : null)

function point(v: unknown): Point | null {
  const o = obj(v)
  if (!o || typeof o.x !== 'number' || typeof o.y !== 'number' || !Number.isFinite(o.x) || !Number.isFinite(o.y)) return null
  return { x: o.x, y: o.y }
}

function endpoint(v: unknown): Endpoint | null {
  const p = point(v)
  if (!p) return null
  const nodeId = safeId(obj(v)?.nodeId)
  return nodeId ? { ...p, nodeId } : p
}

function node(raw: unknown): FigNode | null {
  const o = obj(raw)
  if (!o) return null
  const base = {
    // Ids are written into icon markup (to keep gradient ids unique), so only plain characters are allowed.
    id: safeId(o.id) ?? uid(),
    ...(safeId(o.groupId) ? { groupId: safeId(o.groupId)! } : {}),
    ...(typeof o.opacity === 'number' ? { opacity: num(o.opacity, 1, 0, 1) } : {}),
  }
  switch (o.type) {
    case 'icon': {
      if (!safeId(o.iconId)) return null
      const colors: Record<string, string> = {}
      for (const [k, v] of Object.entries(obj(o.colors) ?? {})) {
        if (isHexColor(k) && isHexColor(v)) colors[normalizeHex(k)] = normalizeHex(v)
      }
      return {
        ...base,
        type: 'icon',
        iconId: o.iconId as string,
        x: num(o.x, 0),
        y: num(o.y, 0),
        w: num(o.w, 80, 1),
        h: num(o.h, 80, 1),
        rotation: num(o.rotation, 0),
        ...(bool(o.flipX) ? { flipX: true } : {}),
        ...(bool(o.flipY) ? { flipY: true } : {}),
        ...(Object.keys(colors).length ? { colors } : {}),
      }
    }
    case 'shape':
      return {
        ...base,
        type: 'shape',
        shape: oneOf(o.shape, SHAPES, 'rect'),
        x: num(o.x, 0),
        y: num(o.y, 0),
        w: num(o.w, 80, 1),
        h: num(o.h, 80, 1),
        rotation: num(o.rotation, 0),
        fill: color(o.fill, '#ffffff'),
        stroke: color(o.stroke, '#000000'),
        strokeWidth: num(o.strokeWidth, 2, 0, 100),
        ...(bool(o.dashed) ? { dashed: true } : {}),
      }
    case 'text':
      return {
        ...base,
        type: 'text',
        x: num(o.x, 0),
        y: num(o.y, 0),
        text: str(o.text, '', 5000),
        fontSize: num(o.fontSize, 18, 4, 400),
        fill: color(o.fill, '#000000'),
        align: oneOf(o.align, ALIGNS, 'left'),
        rotation: num(o.rotation, 0),
        ...(bool(o.bold) ? { bold: true } : {}),
        ...(bool(o.italic) ? { italic: true } : {}),
      }
    case 'connector': {
      const from = endpoint(o.from)
      const to = endpoint(o.to)
      if (!from || !to) return null
      const bend = point(o.bend)
      return {
        ...base,
        type: 'connector',
        from,
        to,
        kind: oneOf(o.kind, KINDS, 'arrow'),
        stroke: color(o.stroke, '#000000'),
        strokeWidth: num(o.strokeWidth, 2, 0.25, 40),
        ...(bend ? { bend } : {}),
        ...(bool(o.dashed) ? { dashed: true } : {}),
        ...(typeof o.label === 'string' && o.label ? { label: o.label.slice(0, 200) } : {}),
      }
    }
    case 'membrane': {
      const points = (Array.isArray(o.points) ? o.points : []).map(point).filter((p): p is Point => !!p)
      if (points.length < 2) return null
      return {
        ...base,
        type: 'membrane',
        points,
        closed: o.closed === true,
        thickness: num(o.thickness, 26, 6, 120),
        headColor: color(o.headColor, '#f0a04b'),
        tailColor: color(o.tailColor, '#d9b65c'),
        ...(typeof o.fill === 'string' ? { fill: color(o.fill, '#ffffff') } : {}),
      }
    }
    case 'stroke': {
      const points: [number, number, number][] = []
      for (const p of Array.isArray(o.points) ? o.points : []) {
        if (Array.isArray(p) && p.length >= 2 && p.slice(0, 2).every((v) => typeof v === 'number' && Number.isFinite(v))) {
          points.push([p[0], p[1], num(p[2], 0.5, 0, 1)])
        }
      }
      if (!points.length) return null
      return { ...base, type: 'stroke', points, color: color(o.color, '#000000'), size: num(o.size, 4, 0.5, 100) }
    }
    default:
      return null
  }
}

function customIcon(id: string, raw: unknown): IconDef | null {
  const o = obj(raw)
  if (!o || typeof o.body !== 'string') return null
  const body = sanitizeBody(o.body)
  if (!body) return null
  const vb = Array.isArray(o.viewBox) ? o.viewBox : []
  return {
    id,
    name: str(o.name, 'Imported icon'),
    category: 'Imported',
    tags: [],
    viewBox: [num(vb[0], 100, 1, 1e5), num(vb[1], 100, 1, 1e5)],
    body,
    license: str(o.license, ''),
    author: str(o.author, ''),
    source: str(o.source, '', 500),
  }
}

/** Build a clean document from untrusted data. Throws when it is not a BioSketch figure at all. */
export function validateDoc(data: unknown): FigDoc {
  const o = obj(data)
  if (!o || !Array.isArray(o.nodes)) throw new Error('This file is not a BioSketch figure.')
  if (typeof o.version === 'number' && o.version > 1) throw new Error('This figure was made with a newer version of BioSketch.')
  const customIcons: Record<string, IconDef> = {}
  for (const [id, raw] of Object.entries(obj(o.customIcons) ?? {})) {
    if (!safeId(id)) continue
    const icon = customIcon(id, raw)
    if (icon) customIcons[id] = icon
  }
  const nodes: FigNode[] = []
  const seen = new Set<string>()
  for (const raw of o.nodes) {
    const n = node(raw)
    if (!n || seen.has(n.id)) continue
    seen.add(n.id)
    nodes.push(n)
  }
  return {
    version: 1,
    name: str(o.name, 'Untitled figure', 120),
    width: num(o.width, 1200, 50, 20000),
    height: num(o.height, 800, 50, 20000),
    background: color(o.background, '#ffffff'),
    nodes,
    customIcons,
  }
}

export function parseDoc(text: string): FigDoc {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('This file could not be read (it is not valid JSON).')
  }
  return validateDoc(data)
}

export const serializeDoc = (doc: FigDoc): string => JSON.stringify({ app: 'biosketch', ...doc })
