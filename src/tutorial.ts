// The tour of the features: a figure of twelve slides. Every slide has a few numbered examples,
// which are real objects (select one and its settings are in the panel), and under each a line
// that says where to click. It is built here from the same parts a scientist uses, so the examples
// can never show something BioSketch does not do, and it opens like the example figures: its icons
// come from the NIH BioArt cells collection, the one the library opens on.

import type { IconLookup } from './ai/scene'
import { INK, outlinePoints } from './model/build'
import { emptyDoc } from './model/doc'
import { wrapText } from './model/nodes'
import { withSlides } from './model/slides'
import type { ChartGroup, ChartKind, ChartNode, ConnectorKind, ConnectorNode, FigDoc, FigNode, IconNode, MembraneNode, Point, ShapeKind, ShapeNode, StrokeNode, TextNode } from './model/types'
import type { Template } from './templates'

const W = 1280
const H = 720
/** The left edge of what stands on a slide, and how wide it may be. */
const LEFT = 64
const WIDE = W - 2 * LEFT

const MUTED = '#5f6c7b'
const ACCENT = '#1c7462'
const SOFT = '#e1f1ed'
const LINE = '#334155'
const FRAME = '#c5cbd3'

const CELL = (name: string): string => `nih-cells--${name}`
const MACROPHAGE = CELL('macrophage')
const T_CELL = CELL('t-cell')
const NEUTROPHIL = CELL('neutrophil')
const MITOCHONDRIA = CELL('mitochondria')
const RED_CELL = CELL('red-blood-cell')
const NEURON = CELL('healthy-neuron')

const SAMPLE: ChartGroup[] = [
  { name: 'Control', values: [4.1, 3.8, 4.6, 4.3] },
  { name: 'Treated', values: [6.9, 7.4, 6.1, 7.8] },
  { name: 'Rescue', values: [5, 4.7, 5.6, 5.2] },
]

/** The tour as a figure. It names its icons; `buildTemplate` stores their drawings in it. */
export function tutorialDoc(icons: IconLookup): FigDoc {
  // Ids are counted, not drawn at random, so the tour is the same figure every time it is built.
  let count = 0
  const id = (): string => `tour${++count}`

  const text = (words: string, x: number, y: number, size = 20, extra: Partial<TextNode> = {}): TextNode => ({ id: id(), type: 'text', x, y, text: words, fontSize: size, fill: INK, align: 'left', rotation: 0, ...extra })
  /** Words broken into lines no wider than `width`. */
  const para = (words: string, x: number, y: number, width: number, size = 18, extra: Partial<TextNode> = {}): TextNode =>
    text(wrapText(words, { fontSize: size, ...(extra.bold ? { bold: true } : {}) }, width), x, y, size, extra)
  const shape = (kind: ShapeKind, x: number, y: number, w: number, h: number, extra: Partial<ShapeNode> = {}): ShapeNode => ({ id: id(), type: 'shape', shape: kind, x, y, w, h, rotation: 0, fill: '#ffffff', stroke: LINE, strokeWidth: 2, ...extra })
  const named = (kind: ShapeKind, name: string, x: number, y: number, w: number, h: number, extra: Partial<ShapeNode> = {}, size = 16): ShapeNode =>
    shape(kind, x, y, w, h, { label: { text: name, fontSize: size, fill: INK }, ...extra })
  /** A rounded box with its name inside, placed by its middle. */
  const pill = (name: string, cx: number, cy: number, w = 150, h = 50, fill = SOFT, stroke = ACCENT): ShapeNode => named('roundrect', name, cx - w / 2, cy - h / 2, w, h, { fill, stroke }, 18)
  /** The number of an example, in a filled circle. */
  const badge = (k: number, x: number, y: number): ShapeNode => shape('ellipse', x, y, 34, 34, { fill: ACCENT, stroke: ACCENT, strokeWidth: 0, label: { text: String(k), fontSize: 18, fill: '#ffffff', bold: true } })
  /** A numbered example's line: its number, and beside it where to click. */
  const how = (k: number, words: string, x: number, y: number, width: number): FigNode[] => [badge(k, x, y), para(words, x + 46, y + 5, width - 46, 17, { fill: MUTED })]
  const link = (from: FigNode, to: FigNode, kind: ConnectorKind = 'arrow', extra: Partial<ConnectorNode> = {}): ConnectorNode => ({ id: id(), type: 'connector', from: { x: 0, y: 0, nodeId: from.id }, to: { x: 0, y: 0, nodeId: to.id }, kind, stroke: LINE, strokeWidth: 2, ...extra })
  /** An arrow between two places, attached to nothing. */
  const line = (x1: number, y1: number, x2: number, y2: number, kind: ConnectorKind = 'arrow', extra: Partial<ConnectorNode> = {}): ConnectorNode => ({ id: id(), type: 'connector', from: { x: x1, y: y1 }, to: { x: x2, y: y2 }, kind, stroke: LINE, strokeWidth: 2, ...extra })
  /** An icon of the given height with its middle at a point. Without its drawing it is a square of that height. */
  const icon = (iconId: string, cx: number, cy: number, height: number, extra: Partial<IconNode> = {}): IconNode => {
    const [vw, vh] = icons(iconId)?.viewBox ?? [1, 1]
    const w = (height * vw) / vh
    return { id: id(), type: 'icon', iconId, x: Math.round(cx - w / 2), y: Math.round(cy - height / 2), w, h: height, rotation: 0, ...extra }
  }
  const chart = (kind: ChartKind, groups: ChartGroup[], x: number, y: number, w: number, h: number, extra: Partial<ChartNode> = {}): ChartNode => ({ id: id(), type: 'chart', x, y, w, h, rotation: 0, kind, groups, ...extra })
  const membrane = (points: Point[], closed: boolean, extra: Partial<MembraneNode> = {}): MembraneNode => ({ id: id(), type: 'membrane', points, closed, thickness: 22, headColor: '#f0a04b', tailColor: '#d9b65c', ...extra })
  /** The heading of a slide with a short bar under it. */
  const heading = (words: string): FigNode[] => [text(words, LEFT, 34, 38, { bold: true }), shape('rect', LEFT, 90, 110, 6, { fill: ACCENT, stroke: ACCENT, strokeWidth: 0 })]
  /** A sentence for the whole slide, under its examples. */
  const band = (words: string, y: number): TextNode => para(words, LEFT, y, WIDE, 18)

  // Four columns, and a grid of two by two, for slides with four examples.
  const COLS = [0, 1, 2, 3].map((i) => LEFT + i * 296)
  const COL_W = 264
  const GRID: Point[] = [
    { x: LEFT, y: 124 },
    { x: 668, y: 124 },
    { x: LEFT, y: 400 },
    { x: 668, y: 400 },
  ]
  const CELL_W = 548

  // ---------- 1. Welcome ----------
  const steps = ['Place icons', 'Label and connect', 'Add your numbers', 'Export or present'].map((name, i) => pill(name, 190 + i * 300, 470, 220, 56))
  const welcome: FigNode[] = [
    text('BioSketch: a tour of the features', W / 2, 84, 54, { bold: true, align: 'center' }),
    para('Every example on these slides is a real object. Select one to see its settings in the panel at the right, and change it, move it or delete it.', W / 2, 168, 940, 24, { align: 'center', fill: MUTED }),
    ...[MACROPHAGE, T_CELL, NEUTROPHIL, MITOCHONDRIA, RED_CELL, NEURON].map((iconId, i) => icon(iconId, 215 + i * 170, 330, 96)),
    ...steps,
    ...steps.slice(1).map((step, i) => link(steps[i], step)),
    para('Page Down opens the next slide, and “Present” in the top bar shows the tour full screen. The tour is a figure like any other: it is kept under File › My figures until you delete it.', W / 2, 580, 1000, 18, {
      align: 'center',
      fill: MUTED,
    }),
  ]

  // ---------- 2. The screen ----------
  const part = (x: number, y: number, w: number, h: number, fill = '#ffffff'): ShapeNode => shape('rect', x, y, w, h, { fill, stroke: FRAME, strokeWidth: 1.5 })
  const places: [number, number, string][] = [
    [377, 129, 'Top bar: File, the name of the figure, Undo, zoom, Slides, Present, AI and Export.'],
    [70, 300, 'Tools: select, move the view, text, shape, arrow, membrane, pen and eraser.'],
    [158, 300, 'Icon library: choose a collection or search all of them. Tap an icon to place it.'],
    [390, 186, 'The page: what you draw here is what is exported.'],
    [632, 300, 'Properties: the settings of what is selected. With nothing selected, those of the page.'],
    [526, 517, 'Slides: every slide of the figure, shown with “Slides” in the top bar.'],
  ]
  const screen: FigNode[] = [
    ...heading('The screen'),
    part(64, 124, 660, 440, '#eceef2'),
    part(64, 124, 660, 44),
    part(64, 168, 46, 396),
    part(110, 168, 130, 396),
    part(574, 168, 150, 396),
    part(240, 504, 334, 60),
    shape('rect', 277, 232, 260, 173, { stroke: '#9aa3ad', strokeWidth: 1.5 }),
    shape('ellipse', 302, 292, 64, 46, { fill: '#fde8e8', stroke: '#c9403d', strokeWidth: 1.5 }),
    shape('roundrect', 440, 296, 72, 38, { fill: SOFT, stroke: ACCENT, strokeWidth: 1.5 }),
    line(370, 315, 436, 315, 'arrow', { strokeWidth: 1.5 }),
    ...[0, 1, 2].map((i) => shape('rect', 252 + i * 62, 516, 54, 36, { stroke: i === 0 ? ACCENT : FRAME, strokeWidth: 1.5 })),
    ...places.map(([x, y], i) => badge(i + 1, x, y)),
    ...places.flatMap(([, , words], i) => how(i + 1, words, 760, 124 + i * 72, 456)),
    band('The buttons at the two ends of the top bar hide and show the panels, and the left edge of the properties panel can be dragged to make it wider. A small “i” beside a setting explains it.', 596),
  ]

  // ---------- 3. Icons ----------
  const iconsSlide: FigNode[] = [
    ...heading('Icons'),
    icon(MACROPHAGE, COLS[0] + COL_W / 2, 240, 160),
    icon(MACROPHAGE, COLS[1] + COL_W / 2, 240, 160, { flipX: true, opacity: 0.5 }),
    icon(MITOCHONDRIA, COLS[2] + COL_W / 2, 240, 110),
    icon(NEUTROPHIL, COLS[3] + 46, 240, 72),
    icon(RED_CELL, COLS[3] + COL_W / 2, 240, 72),
    icon(T_CELL, COLS[3] + COL_W - 46, 240, 72),
    ...how(1, 'Tap an icon in the library to place it, or drag it onto the page. Drag a corner to resize it and the round handle to turn it.', COLS[0], 360, COL_W),
    ...how(2, 'In the panel: flip it, change its colours, make its outlines thicker or thinner. “Transparency” fades it, as here.', COLS[1], 360, COL_W),
    ...how(3, '“Split into parts” turns an icon into pieces to move, recolour or delete. “Reshape” shows the points of its outline: drag them.', COLS[2], 360, COL_W),
    ...how(4, 'The collections are NIH BioArt, Bioicons and Servier Medical Art. Search looks through all of them. File › Import SVG icon adds your own.', COLS[3], 360, COL_W),
    band('An icon you place is stored in the figure, so a figure never depends on the library being reachable. Icons that need a credit are listed under Export, with the text to copy.', 580),
  ]

  // ---------- 4. Text, shapes and lines ----------
  const [g1, g2, g3, g4] = GRID
  const wave: [number, number, number][] = Array.from({ length: 41 }, (_, i) => [g4.x + 20 + i * 6, 462 + 22 * Math.sin(i / 3.2), 0.5])
  const pen: StrokeNode = { id: id(), type: 'stroke', points: wave.map(([x, y, p]) => [Math.round(x), Math.round(y * 10) / 10, p]), color: '#3b4252', size: 5 }
  const kinds: [ShapeKind, string][] = [
    ['roundrect', 'Kinase'],
    ['ellipse', 'Cell'],
    ['hexagon', 'Sugar'],
    ['diamond', 'If'],
    ['cylinder', 'Data'],
    ['callout', 'Note'],
  ]
  const writing: FigNode[] = [
    ...heading('Text, shapes and lines'),
    text('Ca^{2+}', g1.x + 20, 142, 28),
    text('H_{2}O', g1.x + 140, 142, 28),
    text('*E. coli*', g1.x + 262, 142, 28),
    text('**IL-6**', g1.x + 410, 142, 28),
    text('IFN-γ → STAT1', g1.x + 20, 196, 24),
    text('37 °C, 5 % CO_{2}', g1.x + 262, 196, 24),
    ...how(1, 'Double-tap a label to type. Ca^{2+} is typed as Ca, then ^ and 2+ in curly brackets; _ lowers in the same way. A star on each side gives italic, two give bold. “Symbols” in the panel has Greek letters and arrows.', g1.x, 262, CELL_W),
    ...kinds.map(([kind, name], i) => named(kind, name, g2.x + 4 + i * 92, 146, 80, 62, { fill: ['#e1f1ed', '#fde8e8', '#fff3d6', '#dbeafe', '#ede9fe', '#ffffff'][i] }, 14)),
    ...how(2, 'The shape tool (R) draws nine kinds of shape. Double-tap a shape to type inside it: the words belong to the shape, and it grows downwards when they need more lines.', g2.x, 262, CELL_W),
    line(g3.x + 20, 424, g3.x + 250, 424, 'line', { strokeWidth: 3 }),
    line(g3.x + 20, 450, g3.x + 250, 450, 'line', { strokeWidth: 3, dashed: true }),
    line(g3.x + 20, 476, g3.x + 250, 476, 'line', { strokeWidth: 3, dashed: true, dashStyle: 'dotted' }),
    line(g3.x + 20, 502, g3.x + 250, 502, 'line', { strokeWidth: 3, dashed: true, dashStyle: 'dashdot' }),
    shape('rect', g3.x + 300, 420, 100, 84, { dashed: true }),
    shape('ellipse', g3.x + 424, 420, 100, 84, { dashed: true, dashStyle: 'dotted', strokeWidth: 3 }),
    ...how(3, 'Outlines and arrows can be solid, dashed, dotted, long-dashed or dash-and-dot (“Line style”), and as thick as you like.', g3.x, 536, CELL_W),
    pen,
    text('a pen stroke', g4.x + 290, 450, 18, { italic: true, fill: MUTED }),
    ...how(4, 'The pen (P) sketches freehand and the eraser (E) removes strokes; “AI” can turn a sketch into a clean figure. Drag in or paste your own pictures, such as micrographs and gels.', g4.x, 536, CELL_W),
  ]

  // ---------- 5. Arrows and membranes ----------
  const a = pill('A', g2.x + 70, 152, 110, 40)
  const b = pill('B', g2.x + 380, 152, 110, 40)
  const c = pill('C', g2.x + 380, 240, 110, 40)
  const ends: [ConnectorKind, string][] = [
    ['arrow', 'activates'],
    ['inhibit', 'inhibits'],
    ['dot', 'catalyses'],
    ['line', 'binds'],
    ['double', 'exchanges'],
  ]
  const organelle = membrane(outlinePoints(g4.x + 410, 462, 104, 58, 16), true, { thickness: 16, fill: '#fff8f1' })
  const arrows: FigNode[] = [
    ...heading('Arrows and membranes'),
    ...ends.map(([kind, name], i) => line(g1.x + 20 + (i % 2) * 270, 156 + Math.floor(i / 2) * 44, g1.x + 230 + (i % 2) * 270, 156 + Math.floor(i / 2) * 44, kind, { label: name })),
    ...how(1, 'The arrow tool (A): drag from one object to another. An end can be a head, a bar, a dot or nothing, or a head at both ends; “Reverse” turns the arrow round.', g1.x, 286, CELL_W),
    a,
    b,
    c,
    link(a, b, 'arrow', { label: 'straight' }),
    link(b, c, 'arrow', { bend: { x: 44, y: 0 }, label: 'curved' }),
    link(a, c, 'arrow', { route: 'elbow', label: 'right-angled' }),
    ...how(2, 'An arrow attached to an object follows it when the object is moved. “Line shape” makes it straight, curved or right-angled, and it can carry words.', g2.x, 286, CELL_W),
    line(g3.x + 20, 432, g3.x + 250, 432, 'arrow', { strokeWidth: 5, fade: 'in' }),
    line(g3.x + 20, 476, g3.x + 250, 476, 'arrow', { strokeWidth: 5, fade: 'out' }),
    line(g3.x + 300, 432, g3.x + 524, 432, 'arrow', { strokeWidth: 3, startMark: 'dot' }),
    line(g3.x + 300, 476, g3.x + 524, 476, 'inhibit', { strokeWidth: 3, startMark: 'arrow', dashed: true }),
    ...how(3, '“Fading” lets a line appear or vanish along its length, for something that builds up or runs out. A second mark can stand at the start of the line.', g3.x, 536, CELL_W),
    membrane(
      [0, 1, 2, 3, 4, 5].map((i) => ({ x: g4.x + 20 + i * 50, y: 462 + [8, -6, -10, -4, 6, 10][i] })),
      false,
    ),
    organelle,
    icon(MITOCHONDRIA, g4.x + 410, 462, 44),
    ...how(4, 'The membrane brush (M) draws a lipid bilayer along your line. End the line near its start to close it into a cell or an organelle.', g4.x, 536, CELL_W),
  ]

  // ---------- 6. Arranging the page ----------
  const arranging: FigNode[] = [
    ...heading('Arranging the page'),
    shape('rect', g1.x + 20, 146, 96, 60, { fill: '#dbeafe', stroke: '#1e40af' }),
    shape('rect', g1.x + 156, 146, 96, 96, { fill: '#fee2e2', stroke: '#991b1b' }),
    shape('rect', g1.x + 292, 146, 96, 40, { fill: '#fef3c7', stroke: '#92400e' }),
    line(g1.x + 8, 146, g1.x + 400, 146, 'line', { stroke: '#e0457b', strokeWidth: 1, dashed: true }),
    ...how(1, 'Select several objects and use “Arrange”: align them, space them evenly, group them (Ctrl/⌘ G) or bring them to the front. Pink lines appear while you drag when things line up.', g1.x, 262, CELL_W),
    ...['Macrophage', 'Label “IL-6”', 'Arrow, locked'].map((name, i) => named('roundrect', name, g2.x + 20, 142 + i * 36, 250, 30, { stroke: FRAME, strokeWidth: 1.5, ...(i === 0 ? { fill: SOFT } : {}) }, 14)),
    ...how(2, '“Objects” at the bottom of the panel lists everything on the page: select, rename, hide or lock from there. A locked background stays put while you work on top of it.', g2.x, 262, CELL_W),
    shape('rect', g3.x + 20, 420, 150, 96, { stroke: '#9aa3ad', strokeWidth: 1.5, dashed: true }),
    shape('rect', g3.x + 190, 420, 150, 96, { stroke: '#9aa3ad', strokeWidth: 1.5, dashed: true }),
    text('A', g3.x + 28, 424, 22, { bold: true }),
    text('B', g3.x + 198, 424, 22, { bold: true }),
    ...how(3, '“Divide the page into panels” adds lettered frames to line a figure up in. The frames are guides and are left out of exports. “Panel letter” adds the next letter.', g3.x, 536, CELL_W),
    shape('rect', g4.x + 20, 438, 108, 72, { stroke: '#9aa3ad', strokeWidth: 1.5 }),
    shape('ellipse', g4.x + 56, 458, 36, 30, { fill: '#fde8e8', stroke: '#c9403d', strokeWidth: 1.5 }),
    line(g4.x + 142, 474, g4.x + 196, 474),
    shape('rect', g4.x + 210, 420, 162, 108, { stroke: '#9aa3ad', strokeWidth: 2.2 }),
    shape('ellipse', g4.x + 264, 450, 54, 45, { fill: '#fde8e8', stroke: '#c9403d', strokeWidth: 2.2 }),
    ...how(4, 'With nothing selected the panel shows the page: its size, its colour and a printed width for journals. “Resize everything together” makes the whole figure larger or smaller, text and lines in step.', g4.x, 536, CELL_W),
  ]

  // ---------- 7. Charts from your numbers ----------
  const more = (base: number, spread: number[]): number[] => spread.map((d) => Math.round((base + d) * 10) / 10)
  const SPREAD = [-0.9, -0.5, -0.3, -0.1, 0.1, 0.2, 0.5, 1.1]
  const phases: ChartGroup[] = [
    { name: 'G1', values: [55, 58, 52], category: 'WT' },
    { name: 'S', values: [30, 27, 31], category: 'WT' },
    { name: 'G2/M', values: [15, 15, 17], category: 'WT' },
    { name: 'G1', values: [35, 38, 33], category: 'Mutant' },
    { name: 'S', values: [25, 24, 28], category: 'Mutant' },
    { name: 'G2/M', values: [40, 38, 39], category: 'Mutant' },
  ]
  const THIRD = [LEFT, 456, 848]
  const charts: FigNode[] = [
    ...heading('Charts from your numbers'),
    chart('bar', SAMPLE, THIRD[0], 124, 368, 300, { error: 'sd', points: true, yLabel: 'Signal (a.u.)' }),
    chart('box', [{ name: 'Control', values: more(4.2, SPREAD) }, { name: 'Treated', values: more(7, SPREAD.map((d) => d * 1.4)) }, { name: 'Rescue', values: more(5.1, SPREAD) }], THIRD[1], 124, 368, 300, { points: true, yLabel: 'Signal (a.u.)' }),
    chart('bar', phases, THIRD[2], 124, 368, 300, { stacked: true, palette: 'okabe-ito', valueLabels: { show: 'mean', decimals: 0 }, yLabel: 'Cells (%)' }),
    ...how(1, '“Chart” under “Add to the page” adds a chart with example numbers. Paste your own table under Data, or read it from a CSV or Excel file.', THIRD[0], 442, 368),
    ...how(2, 'The same table can be drawn as bars, dots, lines, boxes or violins: choose the kind of chart under Data.', THIRD[1], 442, 368),
    ...how(3, 'A second row of names gives series within categories. Their bars stand side by side or on top of each other, also as shares of 100 %.', THIRD[2], 442, 368),
    band('The settings of a chart are sorted under Data, Statistics, Look and Axes. Press a part of a selected chart, such as a bar, an axis or the legend, to open its setting. The box above the headings takes an instruction in words, for example “dotted line at y = 5” or “box plot”.', 580),
  ]

  // ---------- 8. Statistics ----------
  const factors: ChartGroup[] = [
    { name: 'Vehicle', values: [4.1, 3.8, 4.6, 4.3], category: 'WT' },
    { name: 'Drug', values: [6.9, 7.4, 6.1, 7.8], category: 'WT' },
    { name: 'Vehicle', values: [5, 4.7, 5.6, 5.2], category: 'KO' },
    { name: 'Drug', values: [9.4, 8.8, 10.1, 9], category: 'KO' },
  ]
  const follow = (from: number, to: number) => ({ from, to, label: '', auto: true })
  const statistics: FigNode[] = [
    ...heading('Statistics on a chart'),
    chart('bar', SAMPLE, LEFT, 124, 420, 360, { error: 'sd', points: true, yLabel: 'Signal (a.u.)', test: { by: 'means' }, brackets: [follow(0, 1), follow(1, 2), follow(0, 2)] }),
    chart('bar', factors, 520, 124, 420, 360, { error: 'sd', points: true, yLabel: 'Response', test: { by: 'means', stars: true }, brackets: [follow(0, 1), follow(2, 3)] }),
    ...how(1, 'Under Statistics, say whether the rows are the same samples and which pairs to compare. BioSketch suggests a test, says why it fits, and writes the result on the brackets.', LEFT, 502, 420),
    ...how(2, 'A chart with categories and series is tested by two-way analysis of variance; the pairs follow, corrected for the number of comparisons.', 520, 502, 420),
    para('Results are worked out from the table every time, so they cannot go stale.', 980, 130, 236, 17),
    para('Each test is the default of the R function of the same name.', 980, 214, 236, 17),
    para('“Copy a text for the methods” writes what was done, ready to paste.', 980, 278, 236, 17),
    para('“Ask Claude which analysis fits” takes your description of the experiment to the Claude app. Claude proposes; BioSketch does the arithmetic.', 980, 364, 236, 17),
  ]

  // ---------- 9. More kinds of chart ----------
  const doses = [0.01, 0.03, 0.1, 0.3, 1, 3, 10, 30, 100]
  const genes = ['Il6', 'Tnf', 'Myc', 'Cdkn1a', 'Actb']
  const sample = (name: string, values: number[]): ChartGroup => ({ name, values, labels: genes })
  const set = (name: string, members: string[]): ChartGroup => ({ name, values: members.map(() => 1), labels: members })
  const QUARTER_H = 250
  const kindsSlide: FigNode[] = [
    ...heading('More kinds of chart'),
    chart('scatter', [{ name: 'Agonist', values: [2.1, 3.4, 4, 11.8, 31.5, 62, 84.9, 93.1, 96.4], xs: doses }], COLS[0], 124, COL_W, QUARTER_H, { xLog: true, fit: true, curve: 'dose', legend: 'none', xLabel: 'Dose (µM)', yLabel: 'Response (%)' }),
    chart(
      'scatter',
      [
        { name: 'Control', values: [1, 1, 1, 0, 1, 1, 1, 1], xs: [5, 8, 12, 14, 16, 20, 23, 27] },
        { name: 'Treated', values: [1, 0, 1, 1, 0, 1, 0, 0], xs: [9, 15, 21, 26, 30, 33, 40, 40] },
      ],
      COLS[1],
      124,
      COL_W,
      QUARTER_H,
      { survival: true, logRank: true, legend: 'top', xLabel: 'Days' },
    ),
    chart('heatmap', [sample('Ctrl 1', [2.1, 5.5, 14, 3.3, 98]), sample('Ctrl 2', [2.4, 5.1, 15, 3, 101]), sample('LPS 1', [48, 31, 22, 9.5, 99]), sample('LPS 2', [52, 28, 25, 11, 102])], COLS[2], 124, COL_W, QUARTER_H, { heatByRow: true }),
    chart('venn', [set('RNA-seq', ['TP53', 'MYC', 'JUN', 'EGFR', 'KRAS', 'BRCA1']), set('Proteomics', ['TP53', 'MYC', 'FOS', 'AKT1', 'KRAS']), set('ChIP-seq', ['TP53', 'JUN', 'FOS', 'STAT3', 'MYC', 'RELA'])], COLS[3], 124, COL_W, QUARTER_H),
    ...how(1, 'Scatter: x values in the first column. “Fitted line” draws a straight line or a dose-response curve and gives the EC50; “Correlation” writes r on the plot.', COLS[0], 392, COL_W),
    ...how(2, 'Survival: times in the first column, then 1 (the event) or 0 (left the study) for each group. Kaplan–Meier curves with the log-rank test.', COLS[1], 392, COL_W),
    ...how(3, 'Heat map: a coloured cell for every number. Rows can be scaled to z-scores, as here, or the columns correlated with each other.', COLS[2], 392, COL_W),
    ...how(4, 'Venn diagram: two or three sets, from lists of names or from sizes. The panel lists what each part holds. A pie chart shows shares.', COLS[3], 392, COL_W),
    band('A chart keeps its numbers: paste a new table at any time, and colours, brackets and settings follow the groups by name. Palettes, the shape of the points, lines at chosen values and numbers at the groups are under Look and Axes.', 596),
  ]

  // ---------- 10. AI and pathways ----------
  const route = ['Describe or sketch', 'Copy the request', 'Your Claude app', 'Paste the answer', 'Editable figure'].map((name, i) => pill(name, 154 + i * 243, 160, 180, 54, i === 2 ? '#fff3d6' : SOFT, i === 2 ? '#d39a1c' : ACCENT))
  const molecule = (name: string, cx: number, cy: number, w = 150): ShapeNode => named('rect', name, cx - w / 2, cy - 22, w, 44, { stroke: LINE, strokeWidth: 1.5 })
  const ligand = molecule('Ligand', 200, 420)
  const receptor = molecule('Receptor', 440, 420)
  const kinase = molecule('Kinase', 680, 420)
  const factor = molecule('Transcription factor', 970, 420, 220)
  const drug = molecule('Inhibitor', 680, 506)
  const helpers: FigNode[] = [
    ...heading('AI and pathways'),
    ...route,
    ...route.slice(1).map((step, i) => link(route[i], step)),
    ...how(1, '“AI” in the top bar turns a description or a pen sketch into a figure made of library icons, boxes and arrows, which you can go on changing. It works through your own Claude app by copy and paste: no key, and nothing to pay. It can also change a figure you already have, and with “Plan first” Claude asks its questions before it draws.', LEFT, 218, WIDE),
    ligand,
    receptor,
    kinase,
    factor,
    drug,
    link(ligand, receptor),
    link(receptor, kinase),
    link(kinase, factor),
    link(drug, kinase, 'inhibit', { stroke: '#c9403d' }),
    ...how(2, 'File › Import a pathway searches WikiPathways by name, gene or metabolite (or opens a .gpml file) and redraws the pathway as boxes and arrows, every one of which can be changed. It opens as a new figure or is added to the open one.', LEFT, 566, WIDE),
  ]

  // ---------- 11. Slides and presenting ----------
  const thumbs = [0, 1, 2].map((i) => named('rect', String(i + 1), 84 + i * 124, 183, 110, 62, { stroke: i === 1 ? ACCENT : FRAME, strokeWidth: i === 1 ? 3 : 1.5 }, 16))
  const stage = shape('rect', 700, 124, 320, 180, { fill: '#111827', stroke: '#111827' })
  const presenting: FigNode[] = [
    ...heading('Slides and presenting'),
    ...thumbs,
    named('rect', '+', 456, 183, 50, 62, { stroke: '#9aa3ad', strokeWidth: 1.5, dashed: true }, 22),
    stage,
    named('rect', 'Slide 2', 730, 146, 260, 136, { stroke: '#ffffff', strokeWidth: 0 }, 22),
    line(524, 214, 692, 214, 'arrow', { strokeWidth: 3, label: 'Present' }),
    ...how(1, '“Slides” in the top bar shows the slides of the figure in a row under the page. + adds a slide; the buttons at the right copy, move and delete the open one. Page Down and Page Up open the next and the previous slide.', LEFT, 340, WIDE),
    ...how(2, '“Present” shows the slides full screen, starting with the open one. The arrow keys, Space or a press move on, a press at the left goes back, and Escape returns to the editor.', LEFT, 426, WIDE),
    ...how(3, 'Under Export, “All slides” saves one PDF with a page per slide, one PowerPoint file, or every slide as a picture in one ZIP file. The page, its size and its colour, is the same for every slide.', LEFT, 512, WIDE),
  ]

  // ---------- 12. Export, saving and keys ----------
  const closing: FigNode[] = [
    ...heading('Export, saving and keys'),
    ...['SVG', 'PNG', 'PDF', 'PowerPoint'].map((name, i) => pill(name, 149 + i * 200, 154, 170, 50)),
    ...how(1, '“Export”: SVG for Inkscape or Illustrator, PNG at 300 or 600 dpi once a printed width is set, PDF through the print window, and PowerPoint with the figure as a sharp picture. The credit for icons that need one is written for you.', LEFT, 204, WIDE),
    ...how(2, 'Figures are saved in this browser as you work and are listed under File › My figures. File › Save figure file keeps a copy to move to another computer. After the first visit BioSketch also works without a connection.', LEFT, 294, WIDE),
    ...how(3, 'Keys: V select, H move the view, T text, R shape, A arrow, M membrane, P pen, E eraser. Ctrl/⌘ with Z undoes, with D duplicates, with G groups, with S saves the figure file, with 0 fits the page. Space and a drag move the view; Tab steps through the objects. File › Help and shortcuts has the full list.', LEFT, 384, WIDE),
    text('That is the tour. File › New figure starts your own.', W / 2, 560, 28, { bold: true, align: 'center', fill: ACCENT }),
  ]

  const page = { ...emptyDoc('Tour of the features'), width: W, height: H }
  return withSlides(page, [welcome, screen, iconsSlide, writing, arrows, arranging, charts, statistics, kindsSlide, helpers, presenting, closing], 0)
}

/** The tour as something to open from the File menu, like the example figures. */
export const TUTORIAL: Template = {
  id: 'tour',
  name: 'Tour of the features',
  description: 'Twelve slides with examples to try, from icons to statistics',
  icons: [MACROPHAGE, T_CELL, NEUTROPHIL, MITOCHONDRIA, RED_CELL, NEURON],
  build: tutorialDoc,
}
