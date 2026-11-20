// Reading and writing figure files (.biosketch.json).
//
// A file can come from anyone, so nothing in it is trusted: every field is checked and rebuilt,
// and imported icon markup is sanitised again before it can reach the page.

import { isHexColor, normalizeHex, sanitizeBody } from '../icons/svg'
import { uid } from '../model/doc'
import { DASH_SCALE_MAX, DASH_SCALE_MIN, DASH_STYLES } from '../model/dash'
import { LEGEND_PLACES, MAX_BRACKETS, MAX_GROUPS, MAX_POINTS, MAX_ROWS, MAX_VALUES, POINT_SHAPES, maxValues, ownPointStyle, pointStyle, usable, usableEnds, usablePointNames, usableRefLines, usableValueLabels } from '../model/chart'
import { heatScaleDef } from '../model/heatmap'
import { paletteId } from '../model/palettes'
import { SHAPE_KINDS } from '../model/shapes'
import { MAX_SLIDES, uniqueIds, withSlides } from '../model/slides'
import type { ChartBracket, ChartGroup, ChartKind, ChartTest, ConnectorKind, DashStyle, ElbowLegs, Endpoint, FigDoc, FigNode, FontFamily, IconDef, Point, ShapeKind, ShapeLabel, TextAlign } from '../model/types'

const num = (v: unknown, fallback: number, min = -1e6, max = 1e6): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback
const str = (v: unknown, fallback: string, maxLen = 200): string => (typeof v === 'string' ? v.slice(0, maxLen) : fallback)
const bool = (v: unknown): true | undefined => (v === true ? true : undefined)
const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null)
/** Colours end up in SVG attributes; keep them short and free of markup. */
const color = (v: unknown, fallback: string): string => (typeof v === 'string' && /^[#\w(),.%\s-]{1,40}$/.test(v) ? v : fallback)

const SHAPES: ShapeKind[] = SHAPE_KINDS
const CHART_KINDS: ChartKind[] = ['bar', 'dot', 'line', 'box', 'violin', 'scatter', 'pie', 'heatmap', 'venn']
const KINDS: ConnectorKind[] = ['arrow', 'inhibit', 'dot', 'line', 'double']
const LEGS: ElbowLegs[] = ['hh', 'vv', 'hv', 'vh']
const ALIGNS: TextAlign[] = ['left', 'center', 'right']
const FONTS: FontFamily[] = ['sans', 'serif', 'mono']

/** Pictures are stored as data URLs; only plain bitmap formats are accepted (never SVG or a web address). */
export const isImageDataUrl = (v: unknown): v is string => typeof v === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v)
/** The line style of an arrow or outline. A pattern or size without `dashed` means nothing, so it is dropped. */
function dashes(o: Record<string, unknown>): { dashed?: true; dashStyle?: DashStyle; dashScale?: number } {
  if (!bool(o.dashed)) return {}
  const scale = typeof o.dashScale === 'number' ? num(o.dashScale, 1, DASH_SCALE_MIN, DASH_SCALE_MAX) : 1
  return {
    dashed: true,
    ...(DASH_STYLES.includes(o.dashStyle as DashStyle) ? { dashStyle: o.dashStyle as DashStyle } : {}),
    ...(scale !== 1 ? { dashScale: scale } : {}),
  }
}

/** The words inside a shape, rebuilt field by field; nothing when there are none. */
function shapeLabel(v: unknown): { label?: ShapeLabel } {
  if (!v || typeof v !== 'object') return {}
  const o = v as Record<string, unknown>
  if (typeof o.text !== 'string' || !o.text.trim()) return {}
  return {
    label: {
      text: o.text.slice(0, 2000),
      fontSize: num(o.fontSize, 16, 4, 400),
      fill: color(o.fill, '#2b2f36'),
      ...(bool(o.bold) ? { bold: true } : {}),
      ...(bool(o.italic) ? { italic: true } : {}),
      ...(o.fontFamily === 'serif' || o.fontFamily === 'mono' ? { fontFamily: o.fontFamily } : {}),
      ...(o.align === 'left' || o.align === 'right' ? { align: o.align } : {}),
    },
  }
}

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
  if (!nodeId) return p
  // A place on the node only means something for an attached end, and lies on the node's box.
  const port = point(obj(v)?.port)
  return port ? { ...p, nodeId, port: { x: Math.min(1, Math.max(-1, port.x)), y: Math.min(1, Math.max(-1, port.y)) } } : { ...p, nodeId }
}

function node(raw: unknown): FigNode | null {
  const o = obj(raw)
  if (!o) return null
  const base = {
    // Ids are written into icon markup (to keep gradient ids unique), so only plain characters are allowed.
    id: safeId(o.id) ?? uid(),
    ...(safeId(o.groupId) ? { groupId: safeId(o.groupId)! } : {}),
    ...(typeof o.opacity === 'number' ? { opacity: num(o.opacity, 1, 0, 1) } : {}),
    ...(bool(o.locked) ? { locked: true as const } : {}),
    ...(bool(o.hidden) ? { hidden: true as const } : {}),
    ...(bool(o.guide) ? { guide: true as const } : {}),
    ...(typeof o.name === 'string' && o.name.trim() ? { name: o.name.trim().slice(0, 60) } : {}),
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
        ...(typeof o.strokeScale === 'number' && o.strokeScale !== 1 ? { strokeScale: num(o.strokeScale, 1, 0.1, 10) } : {}),
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
        ...dashes(o),
        ...shapeLabel(o.label),
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
        ...(FONTS.includes(o.fontFamily as FontFamily) && o.fontFamily !== 'sans' ? { fontFamily: o.fontFamily as FontFamily } : {}),
      }
    case 'connector': {
      const from = endpoint(o.from)
      const to = endpoint(o.to)
      if (!from || !to) return null
      const bend = point(o.bend)
      const labelOffset = point(o.labelOffset)
      return {
        ...base,
        type: 'connector',
        from,
        to,
        kind: oneOf(o.kind, KINDS, 'arrow'),
        // A 'double' arrow has a head at its start already.
        ...(o.kind !== 'double' && (o.startMark === 'arrow' || o.startMark === 'inhibit' || o.startMark === 'dot') ? { startMark: o.startMark } : {}),
        stroke: color(o.stroke, '#000000'),
        strokeWidth: num(o.strokeWidth, 2, 0.25, 40),
        ...(bend ? { bend } : {}),
        ...dashes(o),
        ...(o.fade === 'in' || o.fade === 'out' ? { fade: o.fade } : {}),
        ...(typeof o.label === 'string' && o.label ? { label: o.label.slice(0, 200) } : {}),
        ...(o.route === 'elbow' ? { route: 'elbow' as const } : {}),
        ...(o.route === 'elbow' && LEGS.includes(o.legs as ElbowLegs) ? { legs: o.legs as ElbowLegs } : {}),
        ...(labelOffset ? { labelOffset } : {}),
      }
    }
    case 'image':
      if (!isImageDataUrl(o.src)) return null
      return {
        ...base,
        type: 'image',
        src: o.src,
        x: num(o.x, 0),
        y: num(o.y, 0),
        w: num(o.w, 100, 1),
        h: num(o.h, 100, 1),
        rotation: num(o.rotation, 0),
      }
    case 'chart': {
      // The numbers are rebuilt one by one: a chart never holds anything but numbers it can draw
      // (finite, and neither absurdly large nor absurdly close to zero) and short names.
      const finite = usable
      const kind = oneOf(o.kind, CHART_KINDS, 'bar')
      const groups: ChartGroup[] = []
      for (const raw of Array.isArray(o.groups) ? o.groups.slice(0, MAX_GROUPS) : []) {
        if (!raw || typeof raw !== 'object') continue
        const g = raw as Record<string, unknown>
        const name = typeof g.name === 'string' ? g.name.slice(0, 60) : ''
        const shape = POINT_SHAPES.find((s) => s === g.shape)
        const shared = { name: name || `Group ${groups.length + 1}`, ...(isHexColor(g.color) ? { color: normalizeHex(g.color) } : {}), ...(shape && shape !== 'circle' ? { shape } : {}), ...ownPointStyle(g.pointSize, g.pointOpacity) }
        const list = (Array.isArray(g.values) ? g.values : []).slice(0, maxValues(kind))
        if (kind === 'scatter') {
          // A point is kept only when both of its numbers are good, so x and y can never drift apart.
          const xs = Array.isArray(g.xs) ? g.xs : []
          // The name of a point stays with its numbers.
          const names = Array.isArray(g.labels) ? g.labels : []
          const pairs = list.map((v, k) => ({ x: xs[k], v, name: typeof names[k] === 'string' ? (names[k] as string).slice(0, 40) : '' })).filter((p): p is { x: number; v: number; name: string } => finite(p.x) && finite(p.v))
          groups.push({ ...shared, values: pairs.map((p) => p.v), xs: pairs.map((p) => p.x), ...(pairs.some((p) => p.name) ? { labels: pairs.map((p) => p.name) } : {}) })
        } else if (kind === 'venn') {
          // A set is the names of its members, each with a 1 as its value, or, without names, its size alone.
          const members = (Array.isArray(g.labels) ? g.labels : [])
            .filter((n): n is string => typeof n === 'string' && !!n.trim())
            .slice(0, MAX_POINTS)
            .map((n) => n.trim().slice(0, 40))
          const size = list.find((v): v is number => finite(v) && v >= 0)
          groups.push({ ...shared, values: members.length ? members.map(() => 1) : size !== undefined ? [size] : [], ...(members.length ? { labels: members } : {}) })
        } else {
          const category = typeof g.category === 'string' && g.category.trim() ? { category: g.category.slice(0, 60) } : {}
          // The row of each value is kept only when it makes sense for every value: whole numbers
          // that rise down the column. Values and rows are filtered together, so they cannot drift apart.
          const at = Array.isArray(g.rows) && g.rows.length === (Array.isArray(g.values) ? g.values.length : 0) ? g.rows.slice(0, MAX_VALUES) : null
          // A heat map: the name of the row stays with its number.
          const names = kind === 'heatmap' && Array.isArray(g.labels) ? g.labels : []
          const cells = list.map((v, k) => ({ v, r: at ? at[k] : k, name: typeof names[k] === 'string' ? (names[k] as string).slice(0, 40) : '' })).filter((c): c is { v: number; r: unknown; name: string } => finite(c.v))
          const rowsOk = !!at && cells.every((c, k) => Number.isInteger(c.r) && (c.r as number) >= 0 && (c.r as number) < MAX_ROWS && (k === 0 || (c.r as number) > (cells[k - 1].r as number)))
          const gaps = rowsOk && cells.some((c, k) => c.r !== k)
          groups.push({ ...shared, values: cells.map((c) => c.v), ...category, ...(gaps ? { rows: cells.map((c) => c.r as number) } : {}), ...(cells.some((c) => c.name) ? { labels: cells.map((c) => c.name) } : {}) })
        }
      }
      // The ends of an axis are kept by the same rule the chart is drawn by, so reopening changes nothing.
      const { min: yMin, max: yMax } = usableEnds(o.yMin, o.yMax, o.yLog === true)
      const { min: xMin, max: xMax } = kind === 'scatter' ? usableEnds(o.xMin, o.xMax, o.xLog === true) : { min: undefined, max: undefined }
      const brackets: ChartBracket[] = []
      for (const raw of kind !== 'scatter' && Array.isArray(o.brackets) ? o.brackets.slice(0, MAX_BRACKETS) : []) {
        if (!raw || typeof raw !== 'object') continue
        const b = raw as Record<string, unknown>
        const inTable = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) < groups.length
        if (!inTable(b.from) || !inTable(b.to) || b.from === b.to) continue
        brackets.push({ from: b.from, to: b.to, label: typeof b.label === 'string' ? b.label.slice(0, 40) : '', ...(bool(b.auto) ? { auto: true } : {}) })
      }
      // How the groups are compared. Only the choices are kept: results are worked out from the numbers.
      const t = kind !== 'scatter' && o.test && typeof o.test === 'object' ? (o.test as Record<string, unknown>) : {}
      const test: ChartTest = {
        ...(t.by === 'means' || t.by === 'ranks' ? { by: t.by } : {}),
        ...(bool(t.paired) ? { paired: true } : {}),
        ...(bool(t.versusFirst) ? { versusFirst: true } : {}),
        ...(bool(t.across) ? { across: true } : {}),
        ...(bool(t.stars) ? { stars: true } : {}),
      }
      const refLines = usableRefLines(o.refLines, kind, kind === 'scatter' && o.xLog === true, o.yLog === true)
      const legend = LEGEND_PLACES.find((p) => p === o.legend)
      const valueLabels = usableValueLabels(o.valueLabels)
      const pointNames = kind === 'scatter' ? usablePointNames(o.pointNames) : undefined
      return {
        ...base,
        type: 'chart',
        x: num(o.x, 0),
        y: num(o.y, 0),
        w: num(o.w, 360, 40),
        h: num(o.h, 260, 40),
        rotation: num(o.rotation, 0),
        kind,
        groups,
        ...(o.error === 'sd' || o.error === 'sem' ? { error: o.error } : {}),
        ...(bool(o.points) ? { points: true } : {}),
        ...(kind === 'bar' && bool(o.stacked) ? { stacked: true } : {}),
        ...(kind === 'bar' && bool(o.stacked) && bool(o.percent) ? { percent: true } : {}),
        ...(kind === 'pie' && (o.pieLabels === 'value' || o.pieLabels === 'none') ? { pieLabels: o.pieLabels } : {}),
        ...(kind === 'heatmap' && heatScaleDef(o.heatScale) ? { heatScale: heatScaleDef(o.heatScale)!.id } : {}),
        ...(kind === 'heatmap' && bool(o.heatByRow) ? { heatByRow: true } : {}),
        ...(kind === 'heatmap' && bool(o.heatNumbers) ? { heatNumbers: true } : {}),
        ...(kind === 'venn' && (o.vennLabels === 'percent' || o.vennLabels === 'none') ? { vennLabels: o.vennLabels } : {}),
        ...pointStyle(o.pointSize, o.pointOpacity),
        ...(paletteId(o.palette) ? { palette: paletteId(o.palette) } : {}),
        ...(refLines.length ? { refLines } : {}),
        ...(legend ? { legend } : {}),
        ...(valueLabels ? { valueLabels } : {}),
        ...(pointNames ? { pointNames } : {}),
        ...(typeof o.title === 'string' && o.title.trim() ? { title: o.title.slice(0, 120) } : {}),
        ...(typeof o.yLabel === 'string' && o.yLabel.trim() ? { yLabel: o.yLabel.slice(0, 120) } : {}),
        ...(typeof o.xLabel === 'string' && o.xLabel.trim() ? { xLabel: o.xLabel.slice(0, 120) } : {}),
        ...(typeof o.fontSize === 'number' ? { fontSize: num(o.fontSize, 13, 6, 60) } : {}),
        ...(yMin !== undefined ? { yMin } : {}),
        ...(yMax !== undefined ? { yMax } : {}),
        ...(bool(o.yLog) ? { yLog: true } : {}),
        ...(xMin !== undefined ? { xMin } : {}),
        ...(xMax !== undefined ? { xMax } : {}),
        ...(kind === 'scatter' && bool(o.xLog) ? { xLog: true } : {}),
        ...(kind === 'scatter' && bool(o.survival) ? { survival: true } : {}),
        ...(kind === 'scatter' && bool(o.survival) && bool(o.logRank) ? { logRank: true } : {}),
        ...(kind === 'scatter' && bool(o.fit) ? { fit: true } : {}),
        ...((kind === 'scatter' || kind === 'heatmap') && (o.corr === 'pearson' || o.corr === 'spearman') ? { corr: o.corr } : {}),
        ...(kind === 'scatter' && bool(o.fit) && o.curve === 'dose' ? { curve: 'dose' as const } : {}),
        ...(kind === 'scatter' && bool(o.fit) && o.curve === 'dose' && typeof o.doseBottom === 'number' && Number.isFinite(o.doseBottom) && Math.abs(o.doseBottom) < 1e100 ? { doseBottom: o.doseBottom } : {}),
        ...(kind === 'scatter' && bool(o.fit) && o.curve === 'dose' && typeof o.doseTop === 'number' && Number.isFinite(o.doseTop) && Math.abs(o.doseTop) < 1e100 ? { doseTop: o.doseTop } : {}),
        ...(brackets.length ? { brackets } : {}),
        ...(Object.keys(test).length ? { test } : {}),
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
    // Pieces of a split icon are kept apart from icons the user imported, so they stay out of the library.
    category: o.category === 'Part' ? 'Part' : 'Imported',
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
  // The objects of one slide: each rebuilt, and none with an id another object of the slide has.
  const slide = (list: unknown[]): FigNode[] => {
    const nodes: FigNode[] = []
    const seen = new Set<string>()
    for (const raw of list) {
      const n = node(raw)
      if (!n || seen.has(n.id)) continue
      seen.add(n.id)
      nodes.push(n)
    }
    return nodes
  }
  // The slides that are not open: lists of objects before and after the open one. Anything else is passed over.
  const others = (list: unknown): FigNode[][] => (Array.isArray(list) ? list.flatMap((raw) => (Array.isArray(obj(raw)?.nodes) ? [slide(obj(raw)!.nodes as unknown[])] : [])) : [])
  const before = others(obj(o.slides)?.before).slice(0, MAX_SLIDES - 1)
  const after = others(obj(o.slides)?.after).slice(0, MAX_SLIDES - 1 - before.length)
  const doc: FigDoc = {
    version: 1,
    name: str(o.name, 'Untitled figure', 120),
    width: num(o.width, 1200, 50, 20000),
    height: num(o.height, 800, 50, 20000),
    ...(typeof o.widthMm === 'number' && o.widthMm > 0 ? { widthMm: num(o.widthMm, 85, 10, 2000) } : {}),
    background: color(o.background, '#ffffff'),
    nodes: slide(o.nodes),
    customIcons,
  }
  if (!before.length && !after.length) return doc
  // No id twice in the whole figure: the slides of a PDF are drawn into one document.
  return withSlides(doc, uniqueIds([...before, doc.nodes, ...after]), before.length)
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
