// Selection outlines and drag handles. Drawn in screen pixels so they keep their size at any zoom.

import { add, boxCorners, rectCenter, rotate, unionRects } from '../model/geometry'
import { connectorMid, findNode, getBox, getRect, resolveConnector } from '../model/nodes'
import type { Point, Rect } from '../model/types'
import { useEditor } from '../store'

const HANDLES: [number, number][] = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
]

interface Props {
  marquee: Rect | null
  attachHint: Rect | null
}

export function Overlay({ marquee, attachHint }: Props) {
  const doc = useEditor((s) => s.doc)
  const selection = useEditor((s) => s.selection)
  const view = useEditor((s) => s.view)
  const editing = useEditor((s) => s.editingTextId)

  const toScreen = (p: Point): Point => ({ x: p.x * view.zoom + view.x, y: p.y * view.zoom + view.y })
  const screenRect = (r: Rect) => ({ x: r.x * view.zoom + view.x, y: r.y * view.zoom + view.y, width: r.w * view.zoom, height: r.h * view.zoom })

  const parts: React.ReactNode[] = []
  const selected = selection.map((id) => findNode(doc, id)).filter((n) => !!n)

  if (selected.length === 1 && selected[0].id !== editing) {
    const node = selected[0]
    if (node.type === 'connector') {
      const r = resolveConnector(node, doc)
      const from = toScreen(r.from)
      const to = toScreen(r.to)
      const mid = toScreen(connectorMid(r))
      parts.push(
        <g key="connector">
          <rect className="handle bend" data-handle="bend" x={mid.x - 6} y={mid.y - 6} width={12} height={12} transform={`rotate(45 ${mid.x} ${mid.y})`} />
          <circle className="handle-hit" data-handle="bend" cx={mid.x} cy={mid.y} r={14} />
          <circle className={`handle${node.from.nodeId ? ' attached' : ''}`} data-handle="ep:from" cx={from.x} cy={from.y} r={6} />
          <circle className="handle-hit" data-handle="ep:from" cx={from.x} cy={from.y} r={14} />
          <circle className={`handle${node.to.nodeId ? ' attached' : ''}`} data-handle="ep:to" cx={to.x} cy={to.y} r={6} />
          <circle className="handle-hit" data-handle="ep:to" cx={to.x} cy={to.y} r={14} />
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
          <circle className="handle rotate" data-handle="rot" cx={rot.x} cy={rot.y} r={6} />
          <circle className="handle-hit" data-handle="rot" cx={rot.x} cy={rot.y} r={14} />
          {handles.map(([hx, hy]) => {
            const p = local(hx, hy)
            const name = `r:${hx}:${hy}`
            return (
              <g key={name}>
                <rect className="handle" data-handle={name} x={p.x - 5} y={p.y - 5} width={10} height={10} transform={`rotate(${box.rotation} ${p.x} ${p.y})`} />
                <circle className="handle-hit" data-handle={name} cx={p.x} cy={p.y} r={13} />
              </g>
            )
          })}
        </g>,
      )
    }
  } else if (selected.length > 1) {
    const rects = selected.map((n) => getRect(n, doc))
    parts.push(
      <g key="multi">
        {rects.map((r, i) => (
          <rect key={i} className="selection-outline thin" {...screenRect(r)} />
        ))}
        <rect className="selection-outline dashed" {...screenRect(unionRects(rects))} />
      </g>,
    )
  }

  if (attachHint) {
    const r = screenRect(attachHint)
    parts.push(<rect key="attach" className="attach-hint" x={r.x - 5} y={r.y - 5} width={r.width + 10} height={r.height + 10} rx={8} />)
  }
  if (marquee) parts.push(<rect key="marquee" className="marquee" {...screenRect(marquee)} />)

  return <g className="overlay">{parts}</g>
}
