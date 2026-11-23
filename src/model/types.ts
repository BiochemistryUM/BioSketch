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
/** What can stand at an end of a line: a head, a flat bar or a round dot. */
export type EndMark = 'arrow' | 'inhibit' | 'dot'
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
  /**
   * Presenting: the object is not there when its slide comes up and appears on this press (1 on the
   * first, 2 on the second). Absent = there from the start. On the page and in exports it is always drawn.
   */
  appear?: number
  /** How the object comes in on its press (`appear`). Absent = it is simply there. */
  enterFx?: Effect
  /** Presenting: the object goes on this press (after `appear`). Absent = it stays until the slide ends. */
  exit?: number
  /** How the object goes on its press (`exit`). Absent = it is simply gone. */
  exitFx?: Effect
}

/** Where an object flies or wipes from (coming in) or to (going). */
export type Side = 'left' | 'right' | 'top' | 'bottom'

/** An animation of an object while its slide is presented (`src/model/animation.ts`). */
export interface Effect {
  kind: 'fade' | 'fly' | 'float' | 'wipe' | 'split' | 'circle' | 'zoom'
  /**
   * For `fly`, `float` and `wipe`: the side. For `split`: left (opening sideways from the middle) or
   * top (opening up and down). Absent = the effect's usual side (`effectSide`).
   */
  from?: Side
  /** How long it takes, in milliseconds. Absent = 500. */
  ms?: number
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
  /**
   * A text box: the words are broken into lines no wider than this. Absent = a label, which is as
   * wide as its words and breaks only where Enter was pressed. `x` is then the left edge, the
   * middle or the right edge of the box, as `align` says.
   */
  width?: number
  /** Every paragraph (what stands between two presses of Enter) begins with a bullet, and its further lines are set in under its first. */
  bullets?: boolean
  /** A panel letter: renamed A, B, C … in reading order with the other panel letters whenever the figure changes (`orderLetters`). */
  letter?: boolean
}

/** A connector end. When `nodeId` is set the end follows that node; x/y is then only a fallback. */
export interface Endpoint {
  x: number
  y: number
  nodeId?: string
  /**
   * A fixed place on the attached node, for an end that is not simply aimed at the node's middle:
   * across and down the node's box, from -1 (left edge, top edge) to 1 (right edge, bottom edge).
   * Pathway files state it. An end attached by hand has none.
   */
  port?: Point
}

/**
 * Which way a right-angled line leaves its start and reaches its end: 'h' sideways, 'v' up or down.
 * 'hv' and 'vh' are lines with one corner.
 */
export type ElbowLegs = 'hh' | 'vv' | 'hv' | 'vh'

export interface ConnectorNode extends NodeBase {
  type: 'connector'
  from: Endpoint
  to: Endpoint
  /** Offset of the curve's midpoint from the straight line's midpoint. Absent = straight. */
  bend?: Point
  kind: ConnectorKind
  /** A mark at the start of the line as well: a head, a bar or a dot. Absent = none (a 'double' arrow always has a head there). */
  startMark?: EndMark
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
  /** The way a right-angled line runs at its two ends. Absent = the same way at both, chosen by where the ends are. */
  legs?: ElbowLegs
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
  /** A micrograph's scale: the size of one pixel, and the bar drawn on it (`scaleBarMarks`). */
  scale?: ImageScale
  /** The part of the picture shown, as shares (0 to 1) of the whole picture; absent = all of it (`cropImage`). */
  crop?: ImageCrop
}

export interface ImageCrop {
  x: number
  y: number
  w: number
  h: number
}

export type ScaleUnit = 'nm' | 'µm' | 'mm'

export interface ImageScale {
  /** The size of one pixel of the picture, in `unit`. */
  pixel: number
  unit: ScaleUnit
  /** The picture's width in pixels, read from the file when the scale was set. */
  pixels: number
  /** The length of the bar in `unit`; 0 = no bar (the scale is kept for later). */
  bar: number
  /** The corner it stands in. Absent = bottom right. */
  corner?: 'bl' | 'tl' | 'tr'
  /** Absent = white. */
  colour?: string
  /** False = the length is not written over the bar. */
  label?: false
}

export type ChartKind = 'bar' | 'dot' | 'line' | 'box' | 'violin' | 'scatter' | 'pie' | 'heatmap' | 'venn' | 'standard' | 'qpcr'
/** The curve a standard curve fits through its standards. */
export type StandardModel = 'linear' | 'quadratic' | '4pl' | '5pl'
/**
 * The choices of a standard curve (`kind: 'standard'`). Its first group holds the standards
 * (concentration in `xs`, signal in `values`, name in `labels`, one entry per replicate); its
 * second group, when there is one, the samples to be read off the curve (signal and name, no
 * concentration). Results are never stored: they are worked out from the numbers.
 */
export interface StandardSettings {
  /** Absent = a straight line. */
  model?: StandardModel
  /** Subtract the mean signal of the standards at concentration 0 from every signal. */
  blank?: boolean
  /** How much each sample was diluted, by its name (10 = diluted tenfold). A sample not listed was not diluted. */
  dilution?: Record<string, number>
}
/**
 * The choices of a qPCR analysis (`kind: 'qpcr'`). Every group of the chart is one target (gene):
 * the Cq of each well in `values`, the sample of that well in `labels`. Results are never stored.
 */
export interface QpcrSettings {
  /** The reference genes, by name. Absent: the housekeeping genes among the targets, or the first target. */
  reference?: string[]
  /** The control condition, by name. Absent: one named as a control, or the first. */
  control?: string
  /** The condition of each sample, from a column of the table. Absent: the sample's name without its replicate number. */
  conditions?: Record<string, string>
  /** Every sample is a condition of its own (no biological replicates). */
  ownSamples?: boolean
  /** The amplification efficiency of a target in per cent (100: the product doubles every cycle), by name. Absent: 100. */
  efficiency?: Record<string, number>
  /** Show −ΔΔCt (the log₂ fold change) instead of the fold change. */
  log2?: boolean
  /** Each sample is paired with the control sample of the same number ("LPS 2" with "Control 2"), and the test is the paired t test. */
  paired?: boolean
  /** The result of the test of each condition against the control, written over its bar: as stars or as the p value. Absent: none. */
  marks?: 'stars' | 'p'
}
/** How enzyme rates are fitted: Michaelis–Menten for each series on its own, or one inhibition model over all series. */
export type KineticsModel = 'mm' | 'competitive' | 'uncompetitive' | 'noncompetitive' | 'mixed'
/**
 * The choices of enzyme kinetics, a way of drawing a scatter table (`kind: 'scatter'` with
 * `kinetics` present, even empty): substrate concentrations as x, initial rates as values, one
 * series per column. For an inhibition model every series is one inhibitor concentration, read
 * from the series' name ("0", "5 µM", "I = 10"). Results are never stored.
 */
export interface KineticsSettings {
  /** Absent = Michaelis–Menten, each series on its own. */
  model?: Exclude<KineticsModel, 'mm'>
  /** The enzyme in the assay, in the concentration unit of the rates, for kcat = Vmax / [E]. Absent = no kcat. */
  enzyme?: number
  /** Draw 1/v against 1/[S] (Lineweaver–Burk) with the lines of the fitted curve, for display only. */
  lineweaver?: boolean
}
/** Saturation binding on a scatter chart: bound against free ligand (see `src/model/binding.ts`). */
export interface BindingSettings {
  /** Absent = one site, specific binding, every series on its own. `hill`: with a Hill slope. `total`: total and nonspecific binding fitted together. */
  model?: 'hill' | 'total'
  /** Draw bound/free against bound (Scatchard), for display only; one-site model only. */
  scatchard?: boolean
}
/** Melting curves on a scatter chart: a signal against temperature (see `src/model/melt.ts`). */
export interface MeltSettings {
  /** Absent = Tm of a fitted Boltzmann sigmoid; `derivative`: where the signal changes fastest. */
  method?: 'derivative'
  /** The range of temperatures of the transition; absent = found from the curve. */
  from?: number
  to?: number
  /** Draw the rate of change of each curve instead of the signal (melt peaks). */
  view?: 'derivative'
  /** Draw every curve scaled from 0 to 1 between its plateaus. */
  normalise?: boolean
}
/** The run of colours the cells of a heat map take, from the lowest value to the highest. */
export type HeatScale = 'viridis' | 'blues' | 'greys' | 'bluered' | 'purpleorange'
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
  /**
   * A name for every value, as many as there are values; '' = no name. Absent = none has one.
   * Scatter charts: the name written beside the point (a gene, a sample). Heat maps: the name of
   * the row the value stands in. Venn diagrams: the members of the set, one name each, with a 1
   * as its value; a set without names is given by its size, its one value.
   */
  labels?: string[]
  /**
   * The row of the table each value stands in, when the column has gaps (an empty or unreadable
   * cell above a value). Absent = the values fill the rows from the top. Paired tests compare
   * values row by row, so the rows must survive.
   */
  rows?: number[]
  /**
   * qPCR charts: the well of the plate every value was read from ("B3"), as many as there are
   * values; '' = not known. Absent = the table named no wells. Draws the picture of the plate.
   */
  wells?: string[]
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

/** A number written at every group of a chart: its mean, its median or how many values it has. */
export interface ChartValueLabels {
  show: 'mean' | 'median' | 'n'
  /** Written above what is drawn for the group. Absent = inside the bar of a bar chart where it fits, above otherwise. */
  above?: boolean
  /** Digits after the decimal point, 0 to 6. Absent = three significant figures. */
  decimals?: number
  /** Colour of the numbers. Absent = dark, or white inside a dark bar. */
  color?: string
}

/**
 * Which points of a scatter chart have their name written, out of those named in the table.
 * Absent = every point whose row has a name, as the table says.
 */
export interface ChartPointNames {
  /** 'table': every named point; 'top': the `top` points ranked by `by`; 'none': no names at all. */
  show: 'table' | 'top' | 'none'
  /** How many points 'top' names, 1 to 100. Absent = 10. */
  top?: number
  /** How 'top' ranks points: far from x = 0 and the bottom of the plot together (a volcano plot), highest, or furthest from x = 0. Absent = 'distance'. */
  by?: 'distance' | 'y' | 'x'
  /** Only points right of x = 0 ('up'), left of it ('down'), or the top number on each side ('each'). Absent = both sides together. */
  side?: 'up' | 'down' | 'each'
  /** Names of the series whose points may be named. Absent = every series. */
  series?: string[]
  /** Names of points written whatever the ranking (genes the scientist wants to point out). */
  always?: string[]
}

/** How the scientist wants the groups of a chart compared, and with which family of test. */
export interface ChartTest {
  /** Compare means (t test, analysis of variance) or ranks (Mann-Whitney, Kruskal-Wallis and their paired forms). Absent = no test is run. */
  by?: 'means' | 'ranks'
  /** Each row of the table is one sample measured in every group. */
  paired?: boolean
  /** With several groups: compare each group with the first only, not every pair. */
  versusFirst?: boolean
  /** A chart with categories and series (two factors): compare the categories within each series; absent = the series within each category. */
  across?: boolean
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
  /** A bar chart with categories and series: the bars of one category stand on top of each other instead of side by side. */
  stacked?: boolean
  /** Stacked bars: every bar is as tall as 100 %, and each part is its share of the category's total. */
  percent?: boolean
  /** Pie charts: what is written on the slices: the value of the group, or nothing. Absent = its share in per cent. */
  pieLabels?: 'value' | 'none'
  /** Heat maps: the colours of the cells. Absent = Viridis, or blue to red through white when the cells hold correlations or rows scaled to their own spread. */
  heatScale?: HeatScale
  /** Heat maps: every row is shown as z-scores, its values less their mean and divided by their standard deviation, so rows of different size can be compared. */
  heatByRow?: boolean
  /** Heat maps: the number of each cell is written in it. */
  heatNumbers?: boolean
  /** Heat maps: rows, columns or both are put in the order of a hierarchical clustering, with its tree drawn beside them. */
  heatCluster?: 'rows' | 'columns' | 'both'
  /** Scatter charts and survival curves: a shaded band shows the 95 % confidence interval of the fitted straight line or of the survival curve. */
  band?: boolean
  /** Venn diagrams: what is written in the regions: the share of all members in per cent, or nothing. Absent = the count. */
  vennLabels?: 'percent' | 'none'
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
  /** Scatter charts: draw a fitted line through each series: the least-squares straight line, unless `curve` says otherwise. */
  fit?: boolean
  /**
   * Scatter charts: read the table as times (x) and what happened then (1 = the event, 0 = left the
   * study without it) and draw Kaplan-Meier survival curves instead of points.
   */
  survival?: boolean
  /** Survival curves: write the p value of the log-rank test on the chart. */
  logRank?: boolean
  /** Survival curves: a table of the number of subjects still followed in every group, under the time axis at its ticks. */
  atRisk?: boolean
  /** Scatter charts: write the correlation of each series on the chart: Pearson's r, or Spearman's rank correlation. Absent = none. */
  corr?: 'pearson' | 'spearman'
  /** What `fit` draws: 'dose' is a dose-response curve (four-parameter logistic along the logarithm of x). Absent = a straight line. */
  curve?: 'dose'
  /** Dose-response curves: a plateau held at this value instead of being fitted (a response known to start at 0, or to end at 100 %). */
  doseBottom?: number
  doseTop?: number
  brackets?: ChartBracket[]
  /** The palette that colours groups without a colour of their own (an id of `PALETTES`). Absent = the usual colours. */
  palette?: string
  /** Dashed lines at chosen values (thresholds). */
  refLines?: ChartRefLine[]
  /** Where the legend stands. Absent = at the right of the plot. */
  legend?: LegendPlace
  /** A number written at every group (not in a scatter chart). Absent = none. */
  valueLabels?: ChartValueLabels
  /** Scatter charts: which named points have their name written. Absent = all of them. */
  pointNames?: ChartPointNames
  /** The statistical test for the groups. Its results are never stored: they are worked out from the numbers. */
  test?: ChartTest
  /** Standard curves: the curve, the blank and the dilutions. */
  standard?: StandardSettings
  /** qPCR: relative expression by ΔΔCt (see `QpcrSettings`). */
  qpcr?: QpcrSettings
  /** Scatter charts: enzyme kinetics instead of points with a straight line (see `KineticsSettings`). */
  kinetics?: KineticsSettings
  /** Scatter charts: saturation binding (see `BindingSettings`). */
  binding?: BindingSettings
  /** Scatter charts: melting curves (see `MeltSettings`). */
  melt?: MeltSettings
  /** Drawn as small panels, one per category, series or curve (see `FacetSettings`); kept even when empty. */
  facet?: FacetSettings
}

/**
 * A chart drawn as small panels side by side: one per category of a grouped chart (or one per
 * series), one per series of a scatter chart. It changes how the chart is drawn, never what is
 * worked out: tests, brackets and fits are those of the whole chart.
 */
export interface FacetSettings {
  /** Grouped charts: one panel per series instead of per category. */
  by?: 'series'
  /** Panels side by side before the next row (1 to 6); absent = as square a grid as fits. */
  cols?: number
  /** Every panel its own value axis; absent = one range for all, so heights can be compared. */
  free?: boolean
}

/** A table: rows and columns of words and numbers, pasted from a spreadsheet or typed. See `src/model/table.ts`. */
export interface TableNode extends NodeBase {
  type: 'table'
  x: number
  y: number
  w: number
  h: number
  rotation: number
  /** The cells, row by row; every row has as many cells as the others. */
  cells: string[][]
  /** The first row holds the names of the columns: bold, on a tinted ground. Absent = it does. */
  header?: boolean
  /** Size of the lettering. Absent = 14. */
  fontSize?: number
  /** Which lines are drawn: between the rows only, the three lines of a table in a journal, or none. Absent = a full grid. */
  lines?: 'rows' | 'rules' | 'none'
  /** Every second row stands on a light tint. */
  striped?: boolean
  /** The ground of the row of names. Absent = a light grey. */
  headFill?: string
  /** The colour of the lettering. Absent = dark. */
  color?: string
}

/** One chain of a protein structure: the Cα atom of every residue. See `src/model/structure.ts`. */
export interface StructureChain {
  id: string
  /** Residue numbers, one per residue. */
  nums: number[]
  /** Cα coordinates in ångström, three numbers per residue (x, y, z). */
  ca: number[]
  /** B-factor of every residue; for an AlphaFold model, the confidence (pLDDT, 0 to 100). */
  b: number[]
  /** The residues in one-letter code, one letter per residue ('X' when unknown). */
  seq: string
}

/** A residue marked with a dot and a few words. */
export interface StructureMark {
  chain: string
  n: number
  label: string
}

export type StructureColour = 'chain' | 'rainbow' | 'plddt' | 'single'

/**
 * A protein structure drawn as a smooth tube through its Cα atoms, seen from a chosen side. It is
 * drawn as SVG by BioSketch itself, so it is exported like everything else and can turn while
 * the slides are presented.
 */
export interface StructureNode extends NodeBase {
  type: 'structure'
  x: number
  y: number
  w: number
  h: number
  rotation: number
  chains: StructureChain[]
  /** The side it is seen from: a turn about the upright axis, then a tilt, in degrees. */
  view: [number, number]
  /** How it is coloured. Absent = by chain. */
  colour?: StructureColour
  /** The colour of a structure coloured with one colour. */
  color?: string
  /** Thickness of the tube, in ångström. Absent = 1.5 (`TUBE`). */
  tube?: number
  marks?: StructureMark[]
  /** Turns slowly while the slides are presented. */
  spin?: boolean
  /** Where it came from, for the credit: an AlphaFold DB model (UniProt accession), a PDB entry, or a file. */
  source: { kind: 'alphafold' | 'pdb' | 'file'; id: string }
  /** The protein's name, as its source gives it. */
  title?: string
}

export type FigNode = IconNode | ShapeNode | TextNode | ConnectorNode | MembraneNode | StrokeNode | ImageNode | ChartNode | TableNode | StructureNode
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
  /** A chemical structure: the molfile it was drawn from, so that it can be opened in the structure editor again. */
  molfile?: string
}

/**
 * A slide of a figure while another slide is the open one: the objects it holds (first at the
 * back), the colour of its page and the notes of the speaker.
 */
export interface Slide {
  nodes: FigNode[]
  background: string
  notes?: string
}

export interface FigDoc {
  version: 1
  name: string
  width: number
  height: number
  /** Printed width of the page in millimetres (journal column width). Absent = not set. */
  widthMm?: number
  /** The colour of the page. In a figure with several slides: of the open slide, every slide has its own. */
  background: string
  /** What the speaker wants to say at the open slide; shown while presenting, never drawn or exported. */
  notes?: string
  /** Drawing order: first is at the back. In a figure with several slides these are the objects of the open slide. */
  nodes: FigNode[]
  /** Icons imported by the user, stored with the figure so the file is self-contained. */
  customIcons: Record<string, IconDef>
  /**
   * The other slides of a figure that has several: those before the open one and those after it,
   * each list in the order of the slides. Absent in a figure of one slide. The size of the page
   * and the icons are those of the whole figure. See `src/model/slides.ts`.
   */
  slides?: { before: Slide[]; after: Slide[] }
}

export const FONT_STACKS: Record<FontFamily, string> = {
  sans: 'Helvetica, Arial, sans-serif',
  serif: "Georgia, 'Times New Roman', Times, serif",
  mono: "'Courier New', Courier, monospace",
}
export const FONT_FAMILY = FONT_STACKS.sans
export const LINE_HEIGHT = 1.25
