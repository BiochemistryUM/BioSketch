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

/** How an arrow ends: a head, a flat bar, a round dot, nothing, or a head at both ends. */
export type ConnectorKind = 'arrow' | 'inhibit' | 'dot' | 'line' | 'double'
/** A line that fades: 'in' is faint at its start and solid at its end, 'out' the other way round. */
export type ConnectorFade = 'in' | 'out'
/** How a line that is not solid is broken up. Absent on a dashed line means plain dashes. */
export type DashStyle = 'dotted' | 'long' | 'dashdot'
export type ShapeKind = 'rect' | 'roundrect' | 'ellipse' | 'triangle' | 'diamond' | 'hexagon' | 'cylinder' | 'callout' | 'bracket'
export type TextAlign = 'left' | 'center' | 'right'
export type FontFamily = 'sans' | 'serif' | 'mono'

interface NodeBase {
  id: string
  /** Nodes sharing a groupId are selected and moved together. */
  groupId?: string
  opacity?: number
  /** Locked nodes cannot be selected or moved on the canvas until they are unlocked. */
  locked?: boolean
  /** Hidden nodes are not drawn, on the page or in an export, until they are shown again. */
  hidden?: boolean
  /** A name given by the user, shown in the objects list instead of the automatic one. */
  name?: string
  /** Guides (panel frames) show on the page while working and are left out of every export. */
  guide?: boolean
}

/** True when the object can be picked up on the page: neither locked nor hidden. */
export const isPickable = (n: { locked?: boolean; hidden?: boolean }): boolean => !n.locked && !n.hidden

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
  /** Thickness of the icon's outlines as a multiple of how it was drawn. Absent = as drawn. */
  strokeScale?: number
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
  dashStyle?: DashStyle
  /** Size of the dashes and gaps as a multiple of the usual size. Absent = 1. */
  dashScale?: number
  /** Words written inside the shape, centred. */
  label?: ShapeLabel
}

/** Text inside a shape. It accepts the same formatting marks as any label. */
export interface ShapeLabel {
  text: string
  fontSize: number
  fill: string
  bold?: boolean
  italic?: boolean
  /** Font type; sans-serif when absent. */
  fontFamily?: FontFamily
  /** Where the lines sit across the shape; centred when absent. */
  align?: TextAlign
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
  /** Font type; sans-serif when absent. */
  fontFamily?: FontFamily
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
  dashStyle?: DashStyle
  /** Size of the dashes and gaps as a multiple of the usual size. Absent = 1. */
  dashScale?: number
  /** The line fades along its length. Absent = one solid colour. */
  fade?: ConnectorFade
  label?: string
  /** 'elbow' draws right-angled segments; absent = a straight or curved line. */
  route?: 'elbow'
  /** How far the label was dragged from its default place beside the line. */
  labelOffset?: Point
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

/** A picture placed by the user (a micrograph, a plot), stored inside the figure as a data URL. */
export interface ImageNode extends NodeBase {
  type: 'image'
  src: string
  x: number
  y: number
  w: number
  h: number
  rotation: number
}

export type ChartKind = 'bar' | 'dot' | 'line' | 'box' | 'violin' | 'scatter'
/** The mark drawn for a data point. */
export type PointShape = 'circle' | 'square' | 'triangle' | 'diamond'

/**
 * One column of a chart's table: a group (condition) with its replicate values. In a grouped
 * chart, groups with the same name in different categories are one series (one colour, one
 * legend entry). In a scatter chart a group is a series of points: `xs[k]` goes with `values[k]`.
 */
export interface ChartGroup {
  name: string
  values: number[]
  /** Colour of its bar or points. Absent = the next of the standard colours. */
  color?: string
  /** The mark drawn for its points. Absent = a circle. */
  shape?: PointShape
  /** Size and solidity of its points, where they differ from the chart's (see `pointSize`, `pointOpacity` of the chart). */
  pointSize?: number
  pointOpacity?: number
  /** Grouped charts: the category on the x axis this group belongs to (for example the genotype). */
  category?: string
  /** Scatter charts: the x value of every point, as many as there are values. */
  xs?: number[]
  /** Scatter charts: the name written beside each point (a gene, a sample), as many as there are values; '' = no name. Absent = no point has one. */
  labels?: string[]
  /**
   * The row of the table each value stands in, when the column has gaps (an empty or unreadable
   * cell above a value). Absent = the values fill the rows from the top. Paired tests compare
   * values row by row, so the rows must survive.
   */
  rows?: number[]
}

/** A bracket over two groups, with a label the scientist typed (for example "p = 0.03", "**" or "ns") or the result of the chart's test. */
export interface ChartBracket {
  /** Places of the two groups in `groups`. */
  from: number
  to: number
  label: string
  /** The label is the result of the chart's test for these two groups, worked out again whenever the numbers change; `label` is not used. */
  auto?: boolean
}

/** A dashed line across the plot at one value, for example a threshold: along the value axis (`y`), or along the x axis of a scatter chart. */
export interface ChartRefLine {
  axis: 'x' | 'y'
  value: number
  label?: string
  /** How the line is drawn. Absent = dashed. */
  dash?: 'dotted' | 'solid'
}

/** Where the legend stands when it is not at the right of the plot. */
export type LegendPlace = 'top' | 'bottom' | 'inside' | 'insideLeft' | 'none'

/** How the scientist wants the groups of a chart compared, and with which family of test. */
export interface ChartTest {
  /** Compare means (t test, analysis of variance) or ranks (Mann-Whitney, Kruskal-Wallis and their paired forms). Absent = no test is run. */
  by?: 'means' | 'ranks'
  /** Each row of the table is one sample measured in every group. */
  paired?: boolean
  /** With several groups: compare each group with the first only, not every pair. */
  versusFirst?: boolean
  /** Brackets show stars instead of the p value. */
  stars?: boolean
}

/** A chart drawn from numbers the scientist pasted in. The numbers stay in the figure, so the chart can be changed later. */
export interface ChartNode extends NodeBase {
  type: 'chart'
  x: number
  y: number
  w: number
  h: number
  rotation: number
  kind: ChartKind
  groups: ChartGroup[]
  /** What the error bars show: standard deviation or standard error. Absent = no error bars. */
  error?: 'sd' | 'sem'
  /** Draw every value as a point (a dot chart always does). */
  points?: boolean
  /** How large the points are, as a multiple of their usual size (0.25 to 4). Absent = 1. */
  pointSize?: number
  /** How solid the points of single values are, 0.1 to 1. Absent = 1 (not transparent). */
  pointOpacity?: number
  title?: string
  /** Title of the value axis. */
  yLabel?: string
  /** Title of the axis along the bottom. */
  xLabel?: string
  /** Size of the chart's lettering. Absent = 13. */
  fontSize?: number
  /** Ends of the value axis as the scientist set them. Absent = chosen to fit the numbers. */
  yMin?: number
  yMax?: number
  /** The value axis is logarithmic: only values above zero can be shown. */
  yLog?: boolean
  /** The same three for the x axis of a scatter chart. */
  xMin?: number
  xMax?: number
  xLog?: boolean
  /** Scatter charts: draw the least-squares straight line through each series. */
  fit?: boolean
  brackets?: ChartBracket[]
  /** The palette that colours groups without a colour of their own (an id of `PALETTES`). Absent = the usual colours. */
  palette?: string
  /** Dashed lines at chosen values (thresholds). */
  refLines?: ChartRefLine[]
  /** Where the legend stands. Absent = at the right of the plot. */
  legend?: LegendPlace
  /** The statistical test for the groups. Its results are never stored: they are worked out from the numbers. */
  test?: ChartTest
}

export type FigNode = IconNode | ShapeNode | TextNode | ConnectorNode | MembraneNode | StrokeNode | ImageNode | ChartNode
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
  /** Printed width of the page in millimetres (journal column width). Absent = not set. */
  widthMm?: number
  /** The look of the built-in icons in this figure: absent = outlined pastel, 'flat' = flat cartoon. */
  iconStyle?: 'flat'
  background: string
  /** Drawing order: first is at the back. */
  nodes: FigNode[]
  /** Icons imported by the user, stored with the figure so the file is self-contained. */
  customIcons: Record<string, IconDef>
}

export const FONT_STACKS: Record<FontFamily, string> = {
  sans: 'Helvetica, Arial, sans-serif',
  serif: "Georgia, 'Times New Roman', Times, serif",
  mono: "'Courier New', Courier, monospace",
}
export const FONT_FAMILY = FONT_STACKS.sans
export const LINE_HEIGHT = 1.25
