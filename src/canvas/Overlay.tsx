// Selection outlines, drag handles and alignment guides. Drawn in screen pixels so they keep
// their size at any zoom.

import { useEffect, useLayoutEffect, useState } from 'react'
import { anchorsOf, parsePath } from '../icons/path'
import { finishReshape, reshapablePaths } from '../icons/reshape'
import { add, boxCorners, rectCenter, rotate, unionRects } from '../model/geometry'
import { connectorLabelPos, connectorMid, findNode, getBox, getRect, hasOneCorner, resolveConnector } from '../model/nodes'
import type { Point, Rect } from '../model/types'
import { useEditor } from '../store'

const HANDLES: [number, number][] = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
]
const CORNERS: [number, number][] = [[-1, -1], [1, -1], [-1, 1], [1, 1]]

/** Where the moving selection currently lines up with something (figure coordinates), per axis. */
export interface Guides {
  x: number | null
  y: number | null
}

/**
 * The movable points of the icon being reshaped. Their places are read from the icon as it is
 * drawn on the page, so they are right whatever the icon's size, turn, flip or inner groups.
 */
function PointHandles({ nodeId, iconId }: { nodeId: string; iconId: string }) {
  const doc = useEditor((s) => s.doc)
  const view = useEditor((s) => s.view)
  const selection = useEditor((s) => s.selection)
  const tool = useEditor((s) => s.tool)
  const [points, setPoints] = useState<{ name: string; x: number; y: number }[]>([])

  useLayoutEffect(() => {
    const svg = document.querySelector('svg.canvas')
    const drawn = svg?.querySelector(`[data-id="${nodeId}"]`)
    if (!svg || !drawn) {
      setPoints([])
      return
    }
    const origin = svg.getBoundingClientRect()
    const next: { name: string; x: number; y: number }[] = []
    reshapablePaths(drawn).forEach(({ path, index: k }) => {
      const m = (path as SVGGraphicsElement).getScreenCTM()
      if (!m) return
      for (const a of anchorsOf(parsePath(path.getAttribute('d') ?? ''))) {
        next.push({ name: `pt:${k}:${a.index}`, x: m.a * a.x + m.c * a.y + m.e - origin.left, y: m.b * a.x + m.d * a.y + m.f - origin.top })
      }
    })
    setPoints(next)
  }, [doc, view, nodeId])

  // Reshaping ends when something else is selected, another tool is taken, or Undo went back
  // past the moment it started.
  const node = findNode(doc, nodeId)
  const still = tool === 'select' && selection.length === 1 && selection[0] === nodeId && node?.type === 'icon' && node.iconId === iconId
  useEffect(() => {
    if (!still) finishReshape()
  }, [still])

  return (
    <g>
      {points.map((p) => (
        <g key={p.name}>
          <circle className="handle point" data-handle={p.name} cx={p.x} cy={p.y} r={4.5} />
          <circle className="handle-hit" data-handle={p.name} cx={p.x} cy={p.y} r={11} />
        </g>
      ))}
    </g>
  )
}

interface Props {
  marquee: Rect | null
  attachHint: Rect | null
  guides: Guides
}

export function Overlay({ marquee, attachHint, guides }: Props) {
  const doc = useEditor((s) => s.doc)
  const selection = useEditor((s) => s.selection)
  const view = useEditor((s) => s.view)
  const editing = useEditor((s) => s.editingTextId)
  const reshape = useEditor((s) => s.reshape)
  const chartPart = useEditor((s) => s.chartPart)

  const toScreen = (p: Point): Point => ({ x: p.x * view.zoom + view.x, y: p.y * view.zoom + view.y })
  const screenRect = (r: Rect) => ({ x: r.x * view.zoom + view.x, y: r.y * view.zoom + view.y, width: r.w * view.zoom, height: r.h * view.zoom })
  const grip = (name: string, p: Point, shape: React.ReactNode, hit = 14) => (
    <g key={name}>
      {shape}
      <circle className="handle-hit" data-handle={name} cx={p.x} cy={p.y} r={hit} />
    </g>
  )

  const parts: React.ReactNode[] = []
  const selected = selection.map((id) => findNode(doc, id)).filter((n) => !!n)

  if (reshape) {
    parts.push(<PointHandles key="points" nodeId={reshape.nodeId} iconId={reshape.iconId} />)
  } else if (selected.length === 1 && selected[0].id !== editing) {
    const node = selected[0]
    if (node.type === 'connector') {
      const r = resolveConnector(node, doc)
      const from = toScreen(r.from)
      const to = toScreen(r.to)
      const mid = toScreen(connectorMid(r))
      const labelAt = node.label?.trim() ? connectorLabelPos(node, r) : null
      const lab = labelAt ? toScreen({ x: labelAt.x, y: labelAt.y - 5 }) : null
      parts.push(
        <g key="connector">
          {!hasOneCorner(node) && grip('bend', mid, <rect className="handle bend" data-handle="bend" x={mid.x - 6} y={mid.y - 6} width={12} height={12} transform={`rotate(45 ${mid.x} ${mid.y})`} />)}
          {grip('ep:from', from, <circle className={`handle${node.from.nodeId ? ' attached' : ''}`} data-handle="ep:from" cx={from.x} cy={from.y} r={6} />)}
          {grip('ep:to', to, <circle className={`handle${node.to.nodeId ? ' attached' : ''}`} data-handle="ep:to" cx={to.x} cy={to.y} r={6} />)}
          {lab && grip('lab', lab, <circle className="handle label" data-handle="lab" cx={lab.x} cy={lab.y} r={5} />, 16)}
        </g>,
      )
    } else {
      const box = getBox(node, doc)
      const c = rectCenter(box)
      const corners = boxCorners(box).map(toScreen)
      const local = (hx: number, hy: number, out = 0): Point =>
        toScreen(add(c, rotate({ x: (hx * box.w) / 2, y: (hy * box.h) / 2 - out / view.zoom }, box.rotation)))
      const small = Math.min(box.w, box.h) * view.zoom < 28
      const handles = HANDLES.filter(([hx, hy]) => {
        const corner = hx !== 0 && hy !== 0
        if (node.type === 'text') return corner
        return corner || !small
      })
      const rot = local(0, -1, 26)
      const top = local(0, -1)
      parts.push(
        <g key="box">
          <polygon className="selection-outline" points={corners.map((p) => `${p.x},${p.y}`).join(' ')} />
          <line className="selection-outline" x1={top.x} y1={top.y} x2={rot.x} y2={rot.y} />
          {grip('rot', rot, <circle className="handle rotate" data-handle="rot" cx={rot.x} cy={rot.y} r={6} />)}
          {handles.map(([hx, hy]) => {
            const p = local(hx, hy)
            const name = `r:${hx}:${hy}`
            return grip(name, p, <rect className="handle" data-handle={name} x={p.x - 5} y={p.y - 5} width={10} height={10} transform={`rotate(${box.rotation} ${p.x} ${p.y})`} />, 13)
          })}
        </g>,
      )
    }
  } else if (selected.length > 1) {
    const rects = selected.map((n) => getRect(n, doc))
    const all = unionRects(rects)
    const c = rectCenter(all)
    const top = toScreen({ x: c.x, y: all.y })
    const rot = { x: top.x, y: top.y - 26 }
    parts.push(
      <g key="multi">
        {rects.map((r, i) => (
          <rect key={i} className="selection-outline thin" {...screenRect(r)} />
        ))}
        <rect className="selection-outline dashed" {...screenRect(all)} />
        <line className="selection-outline" x1={top.x} y1={top.y} x2={rot.x} y2={rot.y} />
        {grip('mrot', rot, <circle className="handle rotate" data-handle="mrot" cx={rot.x} cy={rot.y} r={6} />)}
        {CORNERS.map(([hx, hy]) => {
          const p = toScreen({ x: c.x + (hx * all.w) / 2, y: c.y + (hy * all.h) / 2 })
          const name = `m:${hx}:${hy}`
          return grip(name, p, <rect className="handle" data-handle={name} x={p.x - 5} y={p.y - 5} width={10} height={10} />, 13)
        })}
      </g>,
    )
  }

  // The part of a chart that was pressed: a dashed box round it, turned with the chart.
  const pressed = chartPart && selected.length === 1 && selected[0].id === chartPart.id && selected[0].type === 'chart' ? selected[0] : null
  if (chartPart && pressed) {
    const b = chartPart.box
    const pad = 3 / view.zoom
    const middle = { x: pressed.x + pressed.w / 2, y: pressed.y + pressed.h / 2 }
    const corners = [[b.x - pad, b.y - pad], [b.x + b.w + pad, b.y - pad], [b.x + b.w + pad, b.y + b.h + pad], [b.x - pad, b.y + b.h + pad]].map(([x, y]) => toScreen(add(middle, rotate({ x: x - pressed.w / 2, y: y - pressed.h / 2 }, pressed.rotation))))
    parts.push(<polygon key="chart-part" className="part-outline" points={corners.map((p) => `${p.x},${p.y}`).join(' ')} />)
  }

  if (guides.x !== null) {
    const x = guides.x * view.zoom + view.x
    parts.push(<line key="guide-x" className="guide" x1={x} x2={x} y1={0} y2="100%" />)
  }
  if (guides.y !== null) {
    const y = guides.y * view.zoom + view.y
    parts.push(<line key="guide-y" className="guide" x1={0} x2="100%" y1={y} y2={y} />)
  }
  if (attachHint) {
    const r = screenRect(attachHint)
    parts.push(<rect key="attach" className="attach-hint" x={r.x - 5} y={r.y - 5} width={r.width + 10} height={r.height + 10} rx={8} />)
  }
  if (marquee) parts.push(<rect key="marquee" className="marquee" {...screenRect(marquee)} />)

  return <g className="overlay">{parts}</g>
}
