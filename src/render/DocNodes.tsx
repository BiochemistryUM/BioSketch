// Draws the nodes of a figure as SVG. The same code draws the editor canvas and the exported file,
// so what you see is what you export. `interactive` adds invisible hit areas for the editor only.

import { getStroke } from 'perfect-freehand'
import { memo, useMemo } from 'react'
import { getIcon } from '../icons/library'
import { iconMarkup } from '../icons/svg'
import { connectorShape } from '../model/connector'
import { round } from '../model/geometry'
import { membraneShape } from '../model/membrane'
import { connectorMid, measureText, resolveConnector, type ResolvedConnector } from '../model/nodes'
import {
  FONT_FAMILY,
  LINE_HEIGHT,
  type ConnectorNode,
  type FigDoc,
  type FigNode,
  type IconDef,
  type IconNode,
  type MembraneNode,
  type ShapeNode,
  type StrokeNode,
  type TextNode,
} from '../model/types'

const HIT = 'transparent'

/** Outline of a pressure-sensitive pen stroke, as SVG path data. */
export function strokePath(points: [number, number, number][], size: number): string {
  if (!points.length) return ''
  const realPressure = points.some((p) => p[2] !== 0.5)
  const outline = getStroke(points, {
    size,
    thinning: 0.55,
    smoothing: 0.5,
    streamline: 0.45,
    simulatePressure: !realPressure,
  })
  if (!outline.length) return ''
  let d = `M${round(outline[0][0])} ${round(outline[0][1])}Q`
  for (let i = 0; i < outline.length; i++) {
    const [x0, y0] = outline[i]
    const [x1, y1] = outline[(i + 1) % outline.length]
    d += `${round(x0)} ${round(y0)} ${round((x0 + x1) / 2)} ${round((y0 + y1) / 2)} `
  }
  return d + 'Z'
}

const rotation = (deg: number, cx: number, cy: number): string | undefined =>
  deg ? `rotate(${deg} ${round(cx)} ${round(cy)})` : undefined

function IconView({ node, icon, interactive }: { node: IconNode; icon: IconDef | undefined; interactive: boolean }) {
  const markup = useMemo(() => (icon ? iconMarkup(icon, node.colors, node.id) : ''), [icon, node.colors, node.id])
  const transform = `translate(${round(node.x)} ${round(node.y)})${node.rotation ? ` rotate(${node.rotation} ${round(node.w / 2)} ${round(node.h / 2)})` : ''}`
  if (!icon) {
    return (
      <g data-id={node.id} transform={transform} opacity={node.opacity}>
        <rect width={node.w} height={node.h} rx={6} fill="#f1f3f5" stroke="#adb5bd" strokeDasharray="5 4" />
        <text x={node.w / 2} y={node.h / 2 + 6} textAnchor="middle" fontFamily={FONT_FAMILY} fontSize={16} fill="#868e96">
          ?
        </text>
      </g>
    )
  }
  const [vw, vh] = icon.viewBox
  const flip =
    node.flipX || node.flipY
      ? `translate(${node.flipX ? vw : 0} ${node.flipY ? vh : 0}) scale(${node.flipX ? -1 : 1} ${node.flipY ? -1 : 1})`
      : undefined
  return (
    <g data-id={node.id} transform={transform} opacity={node.opacity}>
      <svg width={round(node.w)} height={round(node.h)} viewBox={`0 0 ${vw} ${vh}`} preserveAspectRatio="none" overflow="visible">
        <g transform={flip} dangerouslySetInnerHTML={{ __html: markup }} />
      </svg>
      {interactive && <rect width={node.w} height={node.h} fill={HIT} />}
    </g>
  )
}

function ShapeView({ node, interactive }: { node: ShapeNode; interactive: boolean }) {
  const common = {
    fill: node.fill,
    stroke: node.stroke,
    strokeWidth: node.strokeWidth,
    strokeDasharray: node.dashed ? `${node.strokeWidth * 3.5} ${node.strokeWidth * 2.5}` : undefined,
    pointerEvents: interactive ? ('all' as const) : undefined,
  }
  const cx = node.x + node.w / 2
  const cy = node.y + node.h / 2
  return (
    <g data-id={node.id} transform={rotation(node.rotation, cx, cy)} opacity={node.opacity}>
      {node.shape === 'ellipse' ? (
        <ellipse cx={round(cx)} cy={round(cy)} rx={round(node.w / 2)} ry={round(node.h / 2)} {...common} />
      ) : (
        <rect
          x={round(node.x)}
          y={round(node.y)}
          width={round(node.w)}
          height={round(node.h)}
          rx={node.shape === 'roundrect' ? round(Math.min(18, node.w / 4, node.h / 4)) : undefined}
          {...common}
        />
      )}
    </g>
  )
}

function textAttrs(node: Pick<TextNode, 'fontSize' | 'bold' | 'italic'>) {
  return {
    fontFamily: FONT_FAMILY,
    fontSize: node.fontSize,
    fontWeight: node.bold ? 'bold' : undefined,
    fontStyle: node.italic ? 'italic' : undefined,
  }
}

function TextView({ node, interactive }: { node: TextNode; interactive: boolean }) {
  const m = measureText(node)
  const left = node.align === 'center' ? node.x - m.w / 2 : node.align === 'right' ? node.x - m.w : node.x
  const anchor = node.align === 'center' ? 'middle' : node.align === 'right' ? 'end' : 'start'
  const lines = node.text.split('\n')
  return (
    <g data-id={node.id} transform={rotation(node.rotation, left + m.w / 2, node.y + m.h / 2)} opacity={node.opacity}>
      {interactive && <rect x={left - 3} y={node.y - 2} width={m.w + 6} height={m.h + 4} fill={HIT} />}
      <text {...textAttrs(node)} fill={node.fill} textAnchor={anchor}>
        {lines.map((line, i) => (
          <tspan key={i} x={round(node.x)} y={round(node.y + node.fontSize * (0.92 + i * LINE_HEIGHT))}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  )
}

function ConnectorView({ node, resolved, interactive }: { node: ConnectorNode; resolved: ResolvedConnector; interactive: boolean }) {
  const shape = connectorShape(node.kind, node.strokeWidth, resolved)
  const sw = node.strokeWidth
  const label = node.label?.trim()
  const at = connectorMid(resolved)
  // Put the label beside the line, not on it: above a mostly horizontal arrow, to the right of a vertical one.
  const horizontal = Math.abs(resolved.to.x - resolved.from.x) >= Math.abs(resolved.to.y - resolved.from.y)
  const labelProps = horizontal
    ? { x: round(at.x), y: round(at.y - 8 - sw / 2), textAnchor: 'middle' as const, fontFamily: FONT_FAMILY, fontSize: 14 }
    : { x: round(at.x + 9 + sw / 2), y: round(at.y + 5), textAnchor: 'start' as const, fontFamily: FONT_FAMILY, fontSize: 14 }
  return (
    <g data-id={node.id} opacity={node.opacity}>
      {interactive && <path d={shape.d} fill="none" stroke={HIT} strokeWidth={Math.max(18, sw + 14)} />}
      <path
        d={shape.d}
        fill="none"
        stroke={node.stroke}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={node.dashed ? `${sw * 3.5} ${sw * 3}` : undefined}
      />
      {shape.heads.map((points, i) => (
        <polygon key={i} points={points} fill={node.stroke} />
      ))}
      {shape.bars.map(([a, b], i) => (
        <line key={i} x1={round(a.x)} y1={round(a.y)} x2={round(b.x)} y2={round(b.y)} stroke={node.stroke} strokeWidth={sw * 1.3} strokeLinecap="round" />
      ))}
      {label && (
        <>
          {/* White halo behind the label, drawn as a second copy so it survives in every SVG reader. */}
          <text {...labelProps} fill="none" stroke="#ffffff" strokeWidth={5} strokeLinejoin="round">
            {label}
          </text>
          <text {...labelProps} fill={node.stroke}>
            {label}
          </text>
        </>
      )}
    </g>
  )
}

function MembraneView({ node, interactive }: { node: MembraneNode; interactive: boolean }) {
  const shape = useMemo(
    () => membraneShape({ points: node.points, closed: node.closed, thickness: node.thickness }),
    [node.points, node.closed, node.thickness],
  )
  return (
    <g data-id={node.id} opacity={node.opacity}>
      {/* The inside of a cell is not grabbable: only its membrane is, so objects inside can be box-selected. */}
      {node.closed && node.fill && <path d={shape.centre} fill={node.fill} pointerEvents={interactive ? 'none' : undefined} />}
      {interactive && <path d={shape.centre} fill="none" stroke={HIT} strokeWidth={node.thickness + 10} />}
      <path d={shape.tails} fill="none" stroke={node.tailColor} strokeWidth={shape.tailWidth} strokeLinecap="round" />
      <path d={shape.heads} fill={node.headColor} />
    </g>
  )
}

function StrokeView({ node }: { node: StrokeNode }) {
  const d = useMemo(() => strokePath(node.points, node.size), [node.points, node.size])
  return <path data-id={node.id} d={d} fill={node.color} opacity={node.opacity} />
}

interface NodeViewProps {
  node: FigNode
  icon?: IconDef
  resolved?: ResolvedConnector
  interactive: boolean
}

const samePoint = (a: { x: number; y: number } | null, b: { x: number; y: number } | null): boolean =>
  a === b || (!!a && !!b && a.x === b.x && a.y === b.y)

const NodeView = memo(
  function NodeView({ node, icon, resolved, interactive }: NodeViewProps) {
    switch (node.type) {
      case 'icon':
        return <IconView node={node} icon={icon} interactive={interactive} />
      case 'shape':
        return <ShapeView node={node} interactive={interactive} />
      case 'text':
        return <TextView node={node} interactive={interactive} />
      case 'connector':
        return resolved ? <ConnectorView node={node} resolved={resolved} interactive={interactive} /> : null
      case 'membrane':
        return <MembraneView node={node} interactive={interactive} />
      case 'stroke':
        return <StrokeView node={node} />
    }
  },
  (a, b) =>
    a.node === b.node &&
    a.icon === b.icon &&
    a.interactive === b.interactive &&
    (a.resolved === b.resolved ||
      (!!a.resolved &&
        !!b.resolved &&
        samePoint(a.resolved.from, b.resolved.from) &&
        samePoint(a.resolved.to, b.resolved.to) &&
        samePoint(a.resolved.ctrl, b.resolved.ctrl))),
)

export interface DocNodesProps {
  doc: FigDoc
  interactive?: boolean
  /** Leave out freehand sketch strokes. */
  hideSketch?: boolean
  /** Leave out one node (the text being edited in place). */
  hiddenId?: string | null
}

export const DocNodes = memo(function DocNodes({ doc, interactive = false, hideSketch = false, hiddenId = null }: DocNodesProps) {
  return (
    <>
      {doc.nodes.map((node) => {
        if (node.id === hiddenId || (hideSketch && node.type === 'stroke')) return null
        return (
          <NodeView
            key={node.id}
            node={node}
            icon={node.type === 'icon' ? getIcon(doc, node.iconId) : undefined}
            resolved={node.type === 'connector' ? resolveConnector(node, doc) : undefined}
            interactive={interactive}
          />
        )
      })}
    </>
  )
})
