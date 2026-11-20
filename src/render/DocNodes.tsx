// Draws the nodes of a figure as SVG. The same code draws the editor canvas and the exported file,
// so what you see is what you export. `interactive` adds invisible hit areas for the editor only.

import { getStroke } from 'perfect-freehand'
import { memo, useMemo } from 'react'
import { getIcon } from '../icons/library'
import { iconMarkup, sanitizeBody } from '../icons/svg'
import { chartLayout, pointPath, type ChartDrawing } from '../model/chart'
import { BAR_WIDTH, connectorShape, fadeStops } from '../model/connector'
import { dashArray, hasDots } from '../model/dash'
import { round } from '../model/geometry'
import { membraneShape } from '../model/membrane'
import { uprightStructure } from '../model/molecule'
import { connectorLabelNode, fontStack, resolveConnector, shapeLabelNode, textLayout, type ResolvedConnector } from '../model/nodes'
import { SCRIPT_SCALE, SCRIPT_SHIFT, parseRich } from '../model/richtext'
import { isOpenShape, shapePath } from '../model/shapes'
import { TABLE_LINE, tableLayout } from '../model/table'
import { structureLayout } from '../model/structure'
import {
  FONT_FAMILY,
  LINE_HEIGHT,
  type TableNode,
  type StructureNode,
  type ConnectorNode,
  type FigDoc,
  type FigNode,
  type IconDef,
  type IconNode,
  type ChartNode,
  type ImageNode,
  type MembraneNode,
  type Point,
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

/** Place a box-shaped node: move to its corner, then turn it about its centre. */
const boxTransform = (n: { x: number; y: number; w: number; h: number; rotation: number }): string =>
  `translate(${round(n.x)} ${round(n.y)})${n.rotation ? ` rotate(${n.rotation} ${round(n.w / 2)} ${round(n.h / 2)})` : ''}`

function IconView({ node, icon, interactive }: { node: IconNode; icon: IconDef | undefined; interactive: boolean }) {
  // A chemical structure that is turned or mirrored is drawn again with its letters upright.
  const upright = useMemo(
    () => (icon?.molfile ? uprightStructure(icon.molfile, icon.viewBox, icon.body, { w: node.w, h: node.h, rotation: node.rotation, flipX: node.flipX, flipY: node.flipY }) : null),
    [icon, node.w, node.h, node.rotation, node.flipX, node.flipY],
  )
  const markup = useMemo(
    () => (icon ? iconMarkup(upright ? { ...icon, body: sanitizeBody(upright.body) } : icon, node.colors, node.id, node.strokeScale) : ''),
    [icon, upright, node.colors, node.id, node.strokeScale],
  )
  if (!icon) {
    return (
      <g data-id={node.id} transform={boxTransform(node)} opacity={node.opacity}>
        <rect width={node.w} height={node.h} rx={6} fill="#f1f3f5" stroke="#adb5bd" strokeDasharray="5 4" />
        <text x={node.w / 2} y={node.h / 2 + 6} textAnchor="middle" fontFamily={FONT_FAMILY} fontSize={16} fill="#868e96">
          ?
        </text>
      </g>
    )
  }
  if (upright) {
    return (
      <g data-id={node.id} transform={boxTransform(node)} opacity={node.opacity}>
        <g transform={upright.transform} dangerouslySetInnerHTML={{ __html: markup }} />
        {interactive && <rect width={node.w} height={node.h} fill={HIT} />}
      </g>
    )
  }
  const [vw, vh] = icon.viewBox
  const flip =
    node.flipX || node.flipY
      ? `translate(${node.flipX ? vw : 0} ${node.flipY ? vh : 0}) scale(${node.flipX ? -1 : 1} ${node.flipY ? -1 : 1})`
      : undefined
  return (
    <g data-id={node.id} transform={boxTransform(node)} opacity={node.opacity}>
      <svg width={round(node.w)} height={round(node.h)} viewBox={`0 0 ${vw} ${vh}`} preserveAspectRatio="none" overflow="visible">
        <g transform={flip} dangerouslySetInnerHTML={{ __html: markup }} />
      </svg>
      {interactive && <rect width={node.w} height={node.h} fill={HIT} />}
    </g>
  )
}

/** A table: tinted grounds, lines and the words of its cells, as `tableLayout` places them. */
const TableView = memo(function TableView({ node, interactive }: { node: TableNode; interactive: boolean }) {
  const { x: _x, y: _y, rotation: _rotation, opacity: _opacity, id: _id, ...inside } = node
  const key = JSON.stringify(inside)
  // Laid out again only when something inside its box changes, not when it is moved or turned.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const table = useMemo(() => tableLayout(node), [key])
  return (
    <g data-id={node.id} transform={boxTransform(node)} opacity={node.opacity}>
      {/* The whole table can be pressed, also between its words. */}
      <rect width={round(node.w)} height={round(node.h)} fill={interactive ? HIT : 'none'} />
      {table.fills.map((f, i) => (
        <rect key={`f${i}`} x={f.x} y={f.y} width={f.w} height={f.h} fill={f.fill} />
      ))}
      {table.lines.map((l, i) => (
        <line key={`l${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={TABLE_LINE} strokeWidth={l.width} />
      ))}
      {table.texts.map((t, i) => (
        <TextView key={`t${i}`} node={t} interactive={false} />
      ))}
    </g>
  )
})

/** A protein structure: a tube through its Cα atoms, drawn from the back to the front. `spinBy` turns it further (the presenter). */
export const StructureView = memo(function StructureView({ node, interactive, spinBy = 0 }: { node: StructureNode; interactive: boolean; spinBy?: number }) {
  // Laid out again only when something inside its box changes (or it turns), not when it is moved.
  // The chains (thousands of residues) are compared by identity: every edit that changes them makes new ones.
  const { chains, view, colour, color, tube, marks, w, h } = node
  const key = JSON.stringify([view, colour, color, tube, marks, w, h])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const drawn = useMemo(() => structureLayout(node, spinBy), [chains, key, spinBy])
  return (
    <g data-id={node.id} transform={boxTransform(node)} opacity={node.opacity}>
      <rect width={round(node.w)} height={round(node.h)} fill={interactive ? HIT : 'none'} />
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {drawn.layers.map((layer, i) => (
          <g key={i}>
            {layer.map((sg, j) => (
              <path key={`o${j}`} d={sg.d} stroke={sg.outline} strokeWidth={round(sg.width + Math.max(0.6, sg.width * 0.22))} />
            ))}
            {layer.map((sg, j) => (
              <path key={`f${j}`} d={sg.d} stroke={sg.colour} strokeWidth={sg.width} />
            ))}
          </g>
        ))}
      </g>
      {drawn.marks.map((m, i) => (
        <g key={`m${i}`}>
          <circle cx={m.x} cy={m.y} r={m.r} fill="#1f2933" stroke="#fff" strokeWidth={round(m.r * 0.35)} />
          <TextView
            node={{ id: `${node.id}-m${i}`, type: 'text', x: m.lx, y: round(m.ly - drawn.fontSize * 0.6), text: m.label, fontSize: drawn.fontSize, fill: '#1f2933', bold: true, align: m.anchor === 'start' ? 'left' : 'right', rotation: 0 }}
            interactive={false}
            halo
          />
        </g>
      ))}
    </g>
  )
})

function ImageView({ node }: { node: ImageNode }) {
  return (
    <g data-id={node.id} transform={boxTransform(node)} opacity={node.opacity}>
      <image href={node.src} width={round(node.w)} height={round(node.h)} preserveAspectRatio="none" />
    </g>
  )
}

/**
 * Everything of a chart that changes what is drawn inside its box. Its place, turn, opacity and
 * name do not: moving a volcano plot of 20,000 points must not lay it out and draw it again.
 */
function layoutKey(node: ChartNode): string {
  const { x: _x, y: _y, rotation: _r, opacity: _o, groups: _g, locked: _l, name: _n, groupId: _gi, ...rest } = node
  return JSON.stringify(rest)
}

function ChartView({ node, interactive }: { node: ChartNode; interactive: boolean }) {
  // Nothing a chart holds should make its layout fail, but if it ever does, one chart must not
  // take the whole figure down with it: an empty frame is drawn in its place.
  const key = layoutKey(node)
  const chart = useMemo(() => {
    try {
      return chartLayout(node)
    } catch {
      return null
    }
    // The layout depends on the groups and on what `layoutKey` keeps, nothing else of the node.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.groups, key])
  if (!chart) {
    return (
      <g data-id={node.id} transform={boxTransform(node)} opacity={node.opacity}>
        <rect width={node.w} height={node.h} fill="#f1f3f5" stroke="#adb5bd" strokeDasharray="5 4" />
        <text x={node.w / 2} y={node.h / 2} textAnchor="middle" fontFamily={FONT_FAMILY} fontSize={13} fill="#868e96">
          This chart cannot be drawn. Check its numbers.
        </text>
      </g>
    )
  }
  // Data marks are cut off at the edge of the plot (an axis range can leave some outside); axes,
  // brackets, the legend and all words are not.
  return (
    <g data-id={node.id} transform={boxTransform(node)} opacity={node.opacity}>
      {interactive && <rect width={node.w} height={node.h} fill={HIT} />}
      <ChartMarks chart={chart} clipId={`chart-clip-${node.id}`} />
    </g>
  )
}

/** What a chart's layout lists, drawn. Kept as long as the layout is, so a moved chart is not drawn again. */
const ChartMarks = memo(function ChartMarks({ chart, clipId }: { chart: ChartDrawing; clipId: string }) {
  const INK = '#2b2f36'
  return (
    <>
      {chart.clipped && (
        <defs>
          <clipPath id={clipId}>
            <rect x={chart.clip.x} y={chart.clip.y} width={chart.clip.w} height={chart.clip.h} />
          </clipPath>
        </defs>
      )}
      <g clipPath={chart.clipped ? `url(#${clipId})` : undefined}>
        {chart.rects.map((r, i) => (
          <rect key={`r${i}`} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} stroke={r.edge ?? INK} strokeWidth={r.edge ? 0.6 : 1} />
        ))}
        {chart.paths.map((p, i) => (
          <path key={`p${i}`} d={p.d} fill={p.fill ?? 'none'} fillOpacity={p.opacity} stroke={p.stroke} strokeWidth={p.width} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {chart.circles.map((c, i) =>
          c.ring ? (
            <circle key={`c${i}`} cx={c.cx} cy={c.cy} r={c.r} fill="none" stroke={c.fill} strokeWidth={1.2} />
          ) : c.shape && c.shape !== 'circle' ? (
            <path key={`c${i}`} d={pointPath(c.shape, c.cx, c.cy, c.r)} fill={c.fill} fillOpacity={c.opacity} />
          ) : (
            <circle key={`c${i}`} cx={c.cx} cy={c.cy} r={c.r} fill={c.fill} fillOpacity={c.opacity} />
          ),
        )}
        {chart.lines.map((l, i) => (
          <line key={`l${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={INK} strokeWidth={l.width} strokeLinecap="round" />
        ))}
        {chart.dashes.map((l, i) => (
          // A dotted line is made of near-zero dashes with round ends, like dotted lines elsewhere in a figure.
          <line
            key={`d${i}`}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke={INK}
            strokeWidth={l.style === 'dotted' ? 1.6 : 1}
            strokeDasharray={l.style === 'solid' ? undefined : l.style === 'dotted' ? '0.1 4' : '5 4'}
            strokeLinecap={l.style === 'dotted' ? 'round' : undefined}
          />
        ))}
      </g>
      {chart.rules.map((l, i) => (
        <line key={`a${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={INK} strokeWidth={l.width} strokeLinecap="round" />
      ))}
      {chart.swatches.map((s, i) =>
        // An entry for points shows their mark, drawn as the points are; any other a colour square.
        !s.shape ? (
          <rect key={`s${i}`} x={s.x} y={s.y} width={s.size} height={s.size} fill={s.fill} stroke={INK} strokeWidth={0.8} />
        ) : s.shape === 'circle' ? (
          <circle key={`s${i}`} cx={s.x + s.size / 2} cy={s.y + s.size / 2} r={s.size * 0.4} fill={s.fill} />
        ) : (
          <path key={`s${i}`} d={pointPath(s.shape, s.x + s.size / 2, s.y + s.size / 2, s.size * 0.4)} fill={s.fill} />
        ),
      )}
      {chart.texts.map((t, i) => (
        <TextView key={`t${i}`} node={t} interactive={false} />
      ))}
      {/* Small panels: each drawn as a chart of its own in its place, cut off at its own plot. */}
      {chart.panels?.map((p, i) => (
        <g key={`f${i}`} transform={`translate(${p.x} ${p.y})`}>
          <ChartMarks chart={p.drawing} clipId={`${clipId}-${i}`} />
        </g>
      ))}
    </>
  )
})

function ShapeView({ node, interactive, hideLabel }: { node: ShapeNode; interactive: boolean; hideLabel: boolean }) {
  const common = {
    fill: node.fill,
    stroke: node.stroke,
    strokeWidth: node.strokeWidth,
    strokeDasharray: dashArray(node, true),
    strokeLinecap: hasDots(node) ? ('round' as const) : undefined,
    // An unfilled shape is still selectable by clicking inside it (unless it is locked).
    pointerEvents: interactive && !node.locked ? ('all' as const) : undefined,
  }
  const cx = node.x + node.w / 2
  const cy = node.y + node.h / 2
  const label = !hideLabel && node.label?.text ? shapeLabelNode(node) : null
  const path = shapePath(node.shape, node.x, node.y, node.w, node.h)
  return (
    <g data-id={node.id} transform={rotation(node.rotation, cx, cy)} opacity={node.opacity}>
      {path ? (
        <path d={path} {...common} fill={isOpenShape(node.shape) ? 'none' : node.fill} strokeLinejoin="round" strokeLinecap="round" />
      ) : node.shape === 'ellipse' ? (
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
      {/* The words inside the shape: left out while they are being typed in place. */}
      {label && <TextView node={label} interactive={false} />}
    </g>
  )
}

/** `halo` lays a white edge behind the words, so they stay readable on top of a line. */
function TextView({ node, interactive, halo = false }: { node: TextNode; interactive: boolean; halo?: boolean }) {
  // A label has the lines that were typed; a text box breaks them at its width and may set bullets before them.
  const laid = textLayout(node)
  const m = { w: laid.w, h: laid.h }
  const left = laid.left
  const anchor = laid.anchor
  const lines = laid.lines
  // The words are drawn once, or twice when they have a halo: the halo is a second copy behind
  // them, drawn as a thick white outline, which survives in every SVG reader.
  const words = (paint: { fill: string; stroke?: string; strokeWidth?: number; strokeLinejoin?: 'round' }) => (
    <text
      fontFamily={fontStack(node)}
      fontSize={node.fontSize}
      fontWeight={node.bold ? 'bold' : undefined}
      fontStyle={node.italic ? 'italic' : undefined}
      textAnchor={anchor}
      xmlSpace="preserve"
      {...paint}
    >
      {lines.map((line, i) => {
        const baseline = node.y + node.fontSize * (0.92 + i * LINE_HEIGHT)
        const runs = parseRich(line.text)
        // Superscripts and subscripts are smaller text shifted off the baseline; each run states
        // how far to move from where the previous run left off.
        let shift = 0
        return runs.map((run, j) => {
          const target = SCRIPT_SHIFT[run.script] * node.fontSize
          const dy = target - shift
          shift = target
          return (
            <tspan
              key={`${i}-${j}`}
              x={j === 0 ? round(line.x) : undefined}
              y={j === 0 ? round(baseline + target) : undefined}
              dy={j > 0 && dy ? round(dy) : undefined}
              fontSize={run.script ? round(node.fontSize * SCRIPT_SCALE, 1) : undefined}
              fontWeight={run.bold && !node.bold ? 'bold' : undefined}
              fontStyle={run.italic && !node.italic ? 'italic' : undefined}
            >
              {run.text}
            </tspan>
          )
        })
      })}
      {lines.map((line, i) =>
        line.bullet === undefined ? null : (
          <tspan key={`b${i}`} x={round(line.bullet)} y={round(node.y + node.fontSize * (0.92 + i * LINE_HEIGHT))} textAnchor="start">
            •
          </tspan>
        ),
      )}
    </text>
  )
  return (
    <g data-id={node.id} transform={rotation(node.rotation, left + m.w / 2, node.y + m.h / 2)} opacity={node.opacity}>
      {interactive && <rect x={left - 3} y={node.y - 2} width={m.w + 6} height={m.h + 4} fill={HIT} />}
      {halo && words({ fill: 'none', stroke: '#ffffff', strokeWidth: 5, strokeLinejoin: 'round' })}
      {words({ fill: node.fill })}
    </g>
  )
}

function ConnectorView({ node, resolved, interactive }: { node: ConnectorNode; resolved: ResolvedConnector; interactive: boolean }) {
  // A fading line is painted with a colour that runs from see-through to solid between its two
  // ends; its head, bar or dot takes the same paint, so each matches the line where it sits.
  const fade = fadeStops(node.kind, node.fade, node.startMark)
  const shape = connectorShape(node.kind, node.strokeWidth, resolved, !!fade, node.startMark)
  const sw = node.strokeWidth
  const label = connectorLabelNode(node, resolved)
  const fadeId = `fade-${node.id}`
  const paint = fade ? `url(#${fadeId})` : node.stroke
  return (
    <g data-id={node.id} opacity={node.opacity}>
      {fade && (
        // Inside <defs>, where drawing programs that open an exported file expect to find a gradient.
        <defs>
          <linearGradient id={fadeId} gradientUnits="userSpaceOnUse" x1={round(resolved.from.x)} y1={round(resolved.from.y)} x2={round(resolved.to.x)} y2={round(resolved.to.y)}>
            <stop offset="0" stopColor={node.stroke} stopOpacity={fade.start} />
            <stop offset="1" stopColor={node.stroke} stopOpacity={fade.end} />
          </linearGradient>
        </defs>
      )}
      {interactive && <path d={shape.d} fill="none" stroke={HIT} strokeWidth={Math.max(18, sw + 14)} strokeLinejoin="round" />}
      <path
        d={shape.d}
        fill="none"
        stroke={paint}
        strokeWidth={sw}
        // A fading line ends square, where its end mark begins; dots need round ends to show at all.
        strokeLinecap={fade && !hasDots(node) ? 'butt' : 'round'}
        strokeLinejoin="round"
        strokeDasharray={dashArray(node)}
      />
      {shape.heads.map((points, i) => (
        <polygon key={i} points={points} fill={paint} />
      ))}
      {shape.bars.map(([a, b], i) => (
        <line key={i} x1={round(a.x)} y1={round(a.y)} x2={round(b.x)} y2={round(b.y)} stroke={paint} strokeWidth={sw * BAR_WIDTH} strokeLinecap="round" />
      ))}
      {shape.dots.map(({ c, r }, i) => (
        <circle key={i} cx={round(c.x)} cy={round(c.y)} r={round(r, 1)} fill={paint} />
      ))}
      {/* The words on the arrow: a label like any other, with a white halo so they read on top of lines. */}
      {label && <TextView node={label} interactive={false} halo />}
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
  /** Leave out the words inside a shape (they are being typed in place). */
  hideLabel?: boolean
}

function draw({ node, icon, resolved, interactive, hideLabel }: NodeViewProps) {
  switch (node.type) {
    case 'icon':
      return <IconView node={node} icon={icon} interactive={interactive} />
    case 'image':
      return <ImageView node={node} />
    case 'chart':
      return <ChartView node={node} interactive={interactive} />
    case 'table':
      return <TableView node={node} interactive={interactive} />
    case 'structure':
      return <StructureView node={node} interactive={interactive} />
    case 'shape':
      return <ShapeView node={node} interactive={interactive} hideLabel={!!hideLabel} />
    case 'text':
      return <TextView node={node} interactive={interactive} />
    case 'connector':
      return resolved ? <ConnectorView node={node} resolved={resolved} interactive={interactive} /> : null
    case 'membrane':
      return <MembraneView node={node} interactive={interactive} />
    case 'stroke':
      return <StrokeView node={node} />
  }
}

const samePoint = (a: Point | null | undefined, b: Point | null | undefined): boolean => a === b || (!!a && !!b && a.x === b.x && a.y === b.y)

const sameResolved = (a: ResolvedConnector | undefined, b: ResolvedConnector | undefined): boolean =>
  a === b ||
  (!!a &&
    !!b &&
    samePoint(a.from, b.from) &&
    samePoint(a.to, b.to) &&
    samePoint(a.ctrl, b.ctrl) &&
    (a.via?.length ?? 0) === (b.via?.length ?? 0) &&
    (a.via ?? []).every((p, i) => samePoint(p, b.via?.[i])))

const NodeView = memo(
  function NodeView(props: NodeViewProps) {
    const drawn = draw(props)
    // In the editor a locked node lets clicks pass through to whatever is underneath.
    return props.interactive && props.node.locked ? <g pointerEvents="none">{drawn}</g> : drawn
  },
  (a, b) => a.node === b.node && a.icon === b.icon && a.interactive === b.interactive && a.hideLabel === b.hideLabel && sameResolved(a.resolved, b.resolved),
)

export interface DocNodesProps {
  doc: FigDoc
  interactive?: boolean
  /** Leave out freehand sketch strokes. */
  hideSketch?: boolean
  /** Leave out one node (the text being edited in place), or the words of one shape. */
  hiddenId?: string | null
}

export const DocNodes = memo(function DocNodes({ doc, interactive = false, hideSketch = false, hiddenId = null }: DocNodesProps) {
  return (
    <>
      {doc.nodes.map((node) => {
        // Hidden objects are never drawn; guides only on the page being worked on, not in an export.
        const editing = node.id === hiddenId
        if (node.hidden || (node.guide && !interactive) || (editing && node.type !== 'shape') || (hideSketch && node.type === 'stroke')) return null
        const icon = node.type === 'icon' ? getIcon(doc, node.iconId) : undefined
        return (
          <NodeView
            key={node.id}
            node={node}
            icon={icon}
            resolved={node.type === 'connector' ? resolveConnector(node, doc) : undefined}
            interactive={interactive}
            hideLabel={editing}
          />
        )
      })}
    </>
  )
})
