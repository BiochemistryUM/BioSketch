// Editor commands. Menus, buttons and keyboard shortcuts all call these.

import type { Trace } from '@biosketch/chem'
import { chainsFrom, residuesLeftOut, STRUCTURE_RESIDUES_MAX } from '@biosketch/chem'
import { keepFavourites, keepRecent, toggleId, usedId } from './icons/favourites'
import { getIcon } from './icons/library'
import { finishReshape } from './icons/reshape'
import { findPackIcon } from './icons/packs'
import {
  addFigure,
  alignNodes,
  cloneNodes,
  distributeNodes,
  duplicateNodes,
  expandGroups,
  freezeEndpoints,
  groupNodes,
  nextPanelLetter,
  removeNodes,
  reorder,
  scaleAsPicture,
  scaleFigure,
  figureScaleWithin,
  selectionRect,
  stepSelection,
  ungroupNodes,
  updateNodes,
  uid,
  type AlignMode,
  type OrderMode,
} from './model/doc'
import { clamp, rectCenter, unionRects } from './model/geometry'
import { TEXT_WIDTH_MIN, findNode, getRect, translateNode } from './model/nodes'
import { layoutNodes, slideFromTemplate, type SlideLayoutId } from './model/layouts'
import { panelNodes, type PanelLayout } from './model/panels'
import { newTable } from './model/table'
import { applyStyle, styleOf, styleWords } from './model/style'
import { chartSample, type ChartSample, type ChartStart } from './model/chartSamples'
import { MAX_SLIDES, addSlide, duplicateSlide, mapSlides, moveSlide, removeSlide, showSlide, slideCount, slideIndex } from './model/slides'
import type { ChartNode, FigDoc, FigNode, IconDef, IconNode, Point, Rect, StructureNode, TextNode } from './model/types'
import { isPickable } from './model/types'
import { toast, useEditor, type Tool, type View } from './store'

const S = () => useEditor.getState()

export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 8

export function setTool(tool: Tool): void {
  const patch: Partial<ReturnType<typeof S>> = { tool, editingTextId: null }
  if (tool !== 'select') patch.selection = []
  S().set(patch)
}

export function deleteSelection(): void {
  const { selection, commit } = S()
  if (!selection.length) return
  commit((doc) => removeNodes(doc, selection), { select: [] })
}

export function duplicateSelection(): void {
  const s = S()
  if (!s.selection.length) return
  const result = duplicateNodes(s.doc, s.selection)
  s.commit(() => result.doc, { select: result.ids })
}

export function copySelection(): void {
  const s = S()
  if (!s.selection.length) return
  const set = new Set(s.selection)
  const nodes = freezeEndpoints(
    s.doc.nodes.filter((n) => set.has(n.id)),
    s.doc,
  )
  const icons: Record<string, IconDef> = {}
  for (const n of nodes) {
    if (n.type === 'icon' && s.doc.customIcons[n.iconId]) icons[n.iconId] = s.doc.customIcons[n.iconId]
  }
  s.set({ clipboard: nodes, clipboardIcons: icons })
}

export function pasteClipboard(): void {
  const s = S()
  if (!s.clipboard.length) return
  const copies = cloneNodes(s.clipboard, s.doc, 20, 20)
  s.commit(
    (doc) => ({ ...doc, nodes: [...doc.nodes, ...copies], customIcons: { ...s.clipboardIcons, ...doc.customIcons } }),
    { select: copies.map((n) => n.id) },
  )
  // Shift the clipboard so pasting again does not land exactly on top.
  s.set({ clipboard: s.clipboard.map((n) => translateNode(n, 20, 20)) })
}

export function selectAll(): void {
  const s = S()
  s.set({ tool: 'select', selection: s.doc.nodes.filter((n) => isPickable(n) && (s.showSketch || n.type !== 'stroke')).map((n) => n.id) })
}

/** Scroll the page so that this part of the figure is on screen (the zoom stays as it is). */
export function reveal(rect: Rect): void {
  const { view, canvasSize } = S()
  const left = rect.x * view.zoom + view.x
  const top = rect.y * view.zoom + view.y
  const right = left + rect.w * view.zoom
  const bottom = top + rect.h * view.zoom
  // Something that is already in full view stays where it is; anything else is brought to the middle.
  if (left >= 0 && top >= 0 && right <= canvasSize.w && bottom <= canvasSize.h) return
  const c = rectCenter(rect)
  S().set({ view: { ...view, x: canvasSize.w / 2 - c.x * view.zoom, y: canvasSize.h / 2 - c.y * view.zoom } })
}

/** Select these objects and bring them into view. */
export function selectAndReveal(ids: string[]): void {
  const s = S()
  const nodes = ids.flatMap((id) => findNode(s.doc, id) ?? [])
  s.set({ tool: 'select', selection: nodes.map((n) => n.id), editingTextId: null })
  if (nodes.length) reveal(unionRects(nodes.map((n) => getRect(n, s.doc))))
}

/** Keyboard selection: move to the next or previous object. False when there is none in that direction. */
export function selectStep(dir: 1 | -1): boolean {
  const s = S()
  const next = stepSelection(s.doc, s.selection, dir, s.showSketch)
  if (!next) {
    if (s.selection.length) s.set({ selection: [] })
    return false
  }
  selectAndReveal(next)
  return true
}

/** Start typing in the selected text, when exactly one text is selected. */
export function editSelectedText(): boolean {
  const s = S()
  const node = s.selection.length === 1 ? findNode(s.doc, s.selection[0]) : undefined
  if (node?.type !== 'text') return false
  s.set({ editingTextId: node.id })
  return true
}

/** Lock or unlock, hide or show these objects. Objects that can no longer be picked up leave the selection. */
export function setNodeFlag(ids: string[], flag: 'locked' | 'hidden', on: boolean): void {
  const s = S()
  const set = new Set(ids)
  s.commit(
    (doc) =>
      updateNodes(doc, ids, (n) => {
        const { [flag]: _drop, ...rest } = n
        return (on ? { ...rest, [flag]: true } : rest) as FigNode
      }),
    { select: on ? s.selection.filter((id) => !set.has(id)) : s.selection },
  )
}

/** Show every hidden object again. */
export function showAll(): void {
  const hidden = S().doc.nodes.filter((n) => n.hidden).map((n) => n.id)
  if (hidden.length) setNodeFlag(hidden, 'hidden', false)
}

/** Give an object a name of the user's own; an empty name brings the automatic one back. */
export function renameNode(id: string, name: string): void {
  const clean = name.trim().slice(0, 60)
  S().commit((doc) =>
    updateNodes(doc, [id], (n) => {
      const { name: _drop, ...rest } = n
      return (clean ? { ...rest, name: clean } : rest) as FigNode
    }),
  )
}

/** Lock the selected objects in place: they can no longer be picked up until unlocked. */
export function lockSelection(): void {
  const { selection, commit } = S()
  commit((doc) => updateNodes(doc, selection, (n) => ({ ...n, locked: true })), { select: [] })
  toast('Locked. Use “Unlock all” in the page settings to edit these objects again.')
}

export function unlockAll(): void {
  const s = S()
  // Panel frames stay locked: they are guides, removed with their own button.
  const ids = s.doc.nodes.filter((n) => n.locked && !n.guide).map((n) => n.id)
  s.commit(
    (doc) =>
      updateNodes(doc, ids, (n) => {
        const { locked: _drop, ...rest } = n
        return rest as FigNode
      }),
    { select: ids },
  )
}

/** The numbers a new chart starts with, so there is something to look at before the scientist pastes their own. */
export const SAMPLE_CHART: ChartNode['groups'] = [
  { name: 'Control', values: [4.1, 3.8, 4.6, 4.3] },
  { name: 'Treated', values: [6.9, 7.4, 6.1, 7.8] },
  { name: 'Rescue', values: [5, 4.7, 5.6, 5.2] },
]

/** What a new chart says about its example numbers, by the kind it was added as. */
const CHART_ADDED: Partial<Record<ChartSample, string>> = {
  scatter: 'Scatter chart added. Paste your table under “Numbers”: x values in the first column.',
  dose: 'Dose-response curve added. Paste doses in the first column and responses beside them.',
  survival: 'Survival curves added. Paste times in the first column, then 1 (event) or 0 (left the study) per group.',
  heatmap: 'Heat map added. Paste your table under “Numbers”: names of rows in the first column.',
  standard: 'Standard curve added with a BCA example. Paste your plate or table under “Table”: BioSketch shows what it took each column to be.',
  kinetics: 'Enzyme kinetics added. Paste substrate concentrations in the first column and rates beside them, one column per enzyme or per inhibitor concentration.',
  binding: 'Saturation binding added. Paste free ligand concentrations in the first column and the bound values beside them, one column per receptor (or “Total” and “Nonspecific”).',
  melt: 'Melting curves added. Paste temperatures in the first column and the signal of every well beside them; wells named “Apo 1”, “Apo 2” count as replicates.',
  venn: 'Venn diagram added. Paste your lists of names under “Sets”, one column per set.',
  qpcr: 'qPCR fold change added with an example plate. Paste the results of your qPCR machine under “Table”, one row per well: BioSketch shows what it took each column to be.',
}

/** Add a chart with example numbers in the middle of the view, selected, so its numbers can be replaced in the panel. */
export function addChart(sample: ChartSample = 'bar'): void {
  placeChart(chartSample(sample), CHART_ADDED[sample] ?? 'Chart added with example numbers. Paste your own under “Numbers” in the panel.')
}

/** Add a chart that is already filled (a suggestion for a pasted table) in the middle of the view, selected. */
export function placeChart(start: ChartStart, note: string): void {
  const s = S()
  const [w, h] = start.kind === 'pie' || start.kind === 'venn' ? [300, 260] : start.kind === 'qpcr' || start.kind === 'heatmap' ? [400, 280] : [360, 260]
  const centre = viewCenter()
  const node: ChartNode = { id: uid(), type: 'chart', x: Math.round(centre.x - w / 2), y: Math.round(centre.y - h / 2), w, h, rotation: 0, ...start }
  s.commit((doc) => ({ ...doc, nodes: [...doc.nodes, node] }), { select: [node.id] })
  s.set({ tool: 'select' })
  toast(note)
}

/** The cells a new table starts with, so there is something to look at before the scientist pastes their own. */
export const SAMPLE_TABLE: string[][] = [
  ['Sample', 'Genotype', 'Cells (×10^{6})', 'Viability (%)'],
  ['A', 'Wild type', '4.2', '96'],
  ['B', 'Knockout', '3.1', '88'],
  ['C', 'Rescue', '3.9', '94'],
]

/** Add a table with example cells in the middle of the view, selected, so its cells can be replaced in the panel. */
export function addTable(cells: string[][] = SAMPLE_TABLE): void {
  const s = S()
  const centre = viewCenter()
  const made = newTable(uid(), cells, 0, 0, Math.max(200, s.doc.width * 0.8))
  const node = { ...made, x: Math.round(centre.x - made.w / 2), y: Math.round(centre.y - made.h / 2) }
  s.commit((doc) => ({ ...doc, nodes: [...doc.nodes, node] }), { select: [node.id] })
  s.set({ tool: 'select' })
  toast('Table added with example cells. Paste your own under “Cells” in the panel.')
}

/** Add a table of results beside an object (at its right), selected. */
export function addTableBeside(beside: Rect, cells: string[][], note: string): void {
  const s = S()
  const right = newTable(uid(), cells, beside.x + beside.w + 24, beside.y, Math.max(200, s.doc.width * 0.6))
  // Beside the chart when there is room on the page, otherwise under it, kept on the page.
  const node =
    right.x + right.w <= s.doc.width
      ? right
      : { ...right, x: Math.max(0, Math.min(beside.x, s.doc.width - right.w)), y: beside.y + beside.h + 24 }
  s.commit((doc) => ({ ...doc, nodes: [...doc.nodes, node] }), { select: [node.id] })
  toast(note)
}

/** Add a protein structure read from a file or a database, in the middle of the view, seen from the front. */
export function addStructure(trace: Trace, source: StructureNode['source'], title?: string): void {
  const s = S()
  const chains = chainsFrom(trace)
  if (!chains.length) return toast('No protein chain was found in this structure.')
  const size = Math.round(Math.max(160, Math.min(s.doc.width, s.doc.height) * 0.5))
  const centre = viewCenter()
  const plddt = source.kind === 'alphafold'
  const node: StructureNode = {
    id: uid(),
    type: 'structure',
    x: Math.round(centre.x - size / 2),
    y: Math.round(centre.y - size / 2),
    w: size,
    h: size,
    rotation: 0,
    chains,
    view: [0, 0],
    ...(plddt ? { colour: 'plddt' as const } : chains.length === 1 ? { colour: 'rainbow' as const } : {}),
    source,
    ...(title ? { title: title.slice(0, 200) } : {}),
  }
  s.commit((doc) => ({ ...doc, nodes: [...doc.nodes, node] }), { select: [node.id] })
  s.set({ tool: 'select' })
  const left = residuesLeftOut(trace)
  const count = chains.reduce((n, c) => n + c.nums.length, 0)
  toast(
    `${title ? `${title}: ` : ''}${count} residues in ${chains.length} chain${chains.length === 1 ? '' : 's'} added. Turn it and colour it in the panel.` +
      (left ? ` ${left} residues beyond the first ${STRUCTURE_RESIDUES_MAX} were left out.` : ''),
  )
}

/** Add the next panel letter (A, B, C…) as a bold label near the top-left of the view. */
export function addPanelLetter(): void {
  const s = S()
  const letter = nextPanelLetter(s.doc)
  // Each new letter lands a little to the right of the last, so they never sit on top of each other.
  const step = (letter.charCodeAt(0) - 65) * 44
  const node: TextNode = {
    id: uid(),
    type: 'text',
    x: Math.round((40 + step - s.view.x) / s.view.zoom),
    y: Math.round((30 - s.view.y) / s.view.zoom),
    text: letter,
    fontSize: 28,
    fill: '#1f2933',
    bold: true,
    align: 'left',
    rotation: 0,
    letter: true,
  }
  s.commit((doc) => ({ ...doc, nodes: [...doc.nodes, node] }), { select: [node.id] })
  s.set({ tool: 'select' })
}

/** Divide the page into panels: a frame (a guide, not exported) and a letter for each. */
export function addPanels(layout: PanelLayout): void {
  const s = S()
  const nodes = panelNodes(s.doc, layout)
  const frames = nodes.filter((n) => n.guide)
  // Frames go to the back so they never cover what is already on the page; letters go on top.
  s.commit((doc) => ({ ...doc, nodes: [...frames, ...doc.nodes, ...nodes.filter((n) => !n.guide)] }), { select: [] })
  s.set({ tool: 'select' })
  toast('Panel frames added. They are guides: they show here and are left out of exports.')
}

/** Remove every guide (panel frame) from the page. */
export function removeGuides(): void {
  S().commit((doc) => ({ ...doc, nodes: doc.nodes.filter((n) => !n.guide) }), { select: [] })
}

export function groupSelection(): void {
  const { selection, commit } = S()
  commit((doc) => groupNodes(doc, selection))
}

export function ungroupSelection(): void {
  const { selection, commit } = S()
  commit((doc) => ungroupNodes(doc, selection))
}

export function orderSelection(mode: OrderMode): void {
  const { selection, commit } = S()
  commit((doc) => reorder(doc, selection, mode))
}

export function alignSelection(mode: AlignMode): void {
  const { selection, commit } = S()
  commit((doc) => alignNodes(doc, selection, mode))
}

export function distributeSelection(axis: 'h' | 'v'): void {
  const { selection, commit } = S()
  commit((doc) => distributeNodes(doc, selection, axis))
}

/**
 * Resize as one picture, by `factor`: the selected objects about the middle of the selection, or,
 * with nothing selected, the whole figure and its page. Text and the thickness of lines follow.
 * The view keeps its zoom, so the change is seen: what was in the middle of the window stays there.
 */
export function resizeAsPicture(factor: number): void {
  const { selection, commit, doc, view, canvasSize } = S()
  if (selection.length) {
    commit((d) => {
      const rect = selectionRect(d, selection)
      return rect ? scaleAsPicture(d, selection, factor, rectCenter(rect)) : d
    })
    return
  }
  const applied = figureScaleWithin(doc, factor)
  if (applied === 1) {
    toast(factor > 1 ? 'The page cannot get any larger.' : 'The page cannot get any smaller.')
    return
  }
  const middle = viewCenter()
  commit((d) => scaleFigure(d, factor))
  S().set({ view: { zoom: view.zoom, x: canvasSize.w / 2 - middle.x * applied * view.zoom, y: canvasSize.h / 2 - middle.y * applied * view.zoom } })
}

/**
 * Put what another figure holds (an imported pathway) into the open one, in the middle of the
 * window and selected, so it can be dragged into place. It is made smaller, text and lines in
 * step, when it is larger than nine tenths of the page. One Undo takes it out again.
 * Returns the factor it was resized by.
 */
export function addToFigure(added: FigDoc): number {
  const s = S()
  const result = addFigure(s.doc, added, viewCenter(), { w: s.doc.width * 0.9, h: s.doc.height * 0.9 })
  if (!result.ids.length) return 1
  s.commit(() => result.doc, { select: result.ids })
  s.set({ tool: 'select' })
  return result.scale
}

/** Objects placed where they are (beside a picture, say), as one group, selected; one Undo takes them out. */
export function addGrouped(nodes: FigNode[]): void {
  if (!nodes.length) return
  const s = S()
  const groupId = uid()
  const grouped = nodes.map((n) => ({ ...n, groupId }))
  s.commit((doc) => ({ ...doc, nodes: [...doc.nodes, ...grouped] }), { select: grouped.map((n) => n.id) })
  s.set({ tool: 'select' })
}

/** Rapid edits merge into one undo step only while they are the same kind of edit on the same objects. */
const mergeKey = (kind: string, selection: string[]): string => `${kind}:${selection.join(',')}`

export function nudge(dx: number, dy: number): void {
  const { selection, commit } = S()
  commit((doc) => updateNodes(doc, selection, (n) => translateNode(n, dx, dy)), { merge: mergeKey('nudge', selection) })
}

/** Apply a change to every selected node. `merge` groups rapid changes (e.g. dragging a colour picker) into one undo step. */
/** Take the look of the first selected object, to give it to others with `pasteStyle`. */
export function copyStyle(): void {
  const s = S()
  const first = s.doc.nodes.find((n) => n.id === s.selection[0])
  if (!first) return
  const style = styleOf(first)
  s.set({ copiedStyle: style })
  toast(`Style copied: ${styleWords(style)}. Select other objects and choose Paste style.`)
}

/** Give the copied look to every selected object, as far as each has room for it. One Undo takes it back. */
export function pasteStyle(): void {
  const s = S()
  const style = s.copiedStyle
  if (!style || !s.selection.length) return
  const before = s.doc
  s.commit((doc) => updateNodes(doc, s.selection, (n) => applyStyle(n, style)))
  if (S().doc === before) toast('Nothing of the copied style fits what is selected.')
}

export function patchSelection(fn: (n: FigNode) => FigNode, merge?: string): void {
  const { selection, commit } = S()
  commit((doc) => updateNodes(doc, selection, fn), { merge: merge && mergeKey(merge, selection) })
}

export function patchDoc(patch: Partial<FigDoc>, merge?: string): void {
  S().commit((doc) => ({ ...doc, ...patch }), { merge })
}

/** The figure coordinate currently shown in the middle of the canvas. */
export function viewCenter(): Point {
  const { view, canvasSize } = S()
  return { x: (canvasSize.w / 2 - view.x) / view.zoom, y: (canvasSize.h / 2 - view.y) / view.zoom }
}

/** Mark an icon of the collections as a favourite, or take the mark away. */
export function toggleFavouriteIcon(iconId: string): void {
  const favouriteIcons = toggleId(S().favouriteIcons, iconId)
  S().set({ favouriteIcons })
  keepFavourites(favouriteIcons)
}

/** Note that an icon was used, for the list of the icons used last. */
function iconUsed(iconId: string): void {
  const recentIcons = usedId(S().recentIcons, iconId)
  if (recentIcons === S().recentIcons) return
  S().set({ recentIcons })
  keepRecent(recentIcons)
}

export function addIcon(iconId: string, at?: Point): string | null {
  const s = S()
  // An icon from a pack is copied into the figure when first used, so the figure stays self-contained.
  const fromPack = getIcon(s.doc, iconId) ? undefined : findPackIcon(iconId)
  const def = getIcon(s.doc, iconId) ?? fromPack
  if (!def) return null
  iconUsed(iconId)
  const [w, h] = def.viewBox
  const customIcons = fromPack ? { customIcons: { ...s.doc.customIcons, [fromPack.id]: { ...fromPack, category: 'Imported' } } } : {}
  // With the dashed box of a missing icon selected, the new icon takes its place: as large as fits
  // in the box, about its middle, turned and grouped as the box was.
  const gap = !at && s.selection.length === 1 ? s.doc.nodes.find((n) => n.id === s.selection[0]) : undefined
  if (gap?.type === 'icon' && !getIcon(s.doc, gap.iconId)) {
    const fit = Math.min(gap.w / w, gap.h / h)
    const { colors: _colors, strokeScale: _strokeScale, ...kept } = gap
    const filled: IconNode = { ...kept, iconId, x: gap.x + (gap.w - w * fit) / 2, y: gap.y + (gap.h - h * fit) / 2, w: w * fit, h: h * fit }
    s.commit((doc) => ({ ...doc, ...customIcons, nodes: doc.nodes.map((n) => (n.id === gap.id ? filled : n)) }), { select: [gap.id] })
    return gap.id
  }
  // Imported icons can have any coordinate size; bring them to a sensible size on the page.
  const scale = Math.max(w, h) > 240 || Math.max(w, h) < 30 ? 110 / Math.max(w, h) : 1
  const stagger = at ? 0 : (s.doc.nodes.length % 6) * 14
  const c = at ?? viewCenter()
  const node: IconNode = {
    id: uid(),
    type: 'icon',
    iconId,
    x: Math.round(c.x - (w * scale) / 2 + stagger),
    y: Math.round(c.y - (h * scale) / 2 + stagger),
    w: w * scale,
    h: h * scale,
    rotation: 0,
  }
  s.commit(
    (doc) => ({ ...doc, ...customIcons, nodes: [...doc.nodes, node] }),
    { select: [node.id] },
  )
  s.set({ tool: 'select' })
  return node.id
}

/**
 * Add a text and open it for typing: a label with its middle at `at`, or, with a `width`, a text
 * box whose top left corner is at `at` and whose words are broken at that width.
 */
export function addText(at: Point, text = 'Label', width?: number): string {
  const s = S()
  const node: TextNode = width
    ? { id: uid(), type: 'text', x: Math.round(at.x), y: Math.round(at.y), text, fontSize: 20, fill: '#1f2933', align: 'left', rotation: 0, width: Math.max(TEXT_WIDTH_MIN, Math.round(width)) }
    : {
        id: uid(),
        type: 'text',
        x: Math.round(at.x),
        y: Math.round(at.y - 11),
        text,
        fontSize: 18,
        fill: '#1f2933',
        align: 'center',
        rotation: 0,
      }
  s.commit((doc) => ({ ...doc, nodes: [...doc.nodes, node] }), { select: [node.id] })
  s.set({ tool: 'select', editingTextId: node.id })
  return node.id
}

export function addCustomIcon(def: IconDef): void {
  S().commit((doc) => ({ ...doc, customIcons: { ...doc.customIcons, [def.id]: def } }))
}

/**
 * An icon of the figure drawn again (a chemical structure edited in the structure editor): every
 * use of it on every slide keeps its middle and its scale, and takes the new drawing's shape.
 */
export function replaceCustomIcon(def: IconDef): void {
  S().commit((doc) => {
    const old = doc.customIcons[def.id]
    const redraw = (nodes: FigNode[]): FigNode[] =>
      nodes.map((n) => {
        if (n.type !== 'icon' || n.iconId !== def.id || !old) return n
        const k = n.w / old.viewBox[0]
        const w = def.viewBox[0] * k
        const h = def.viewBox[1] * k
        return { ...n, x: n.x + (n.w - w) / 2, y: n.y + (n.h - h) / 2, w, h }
      })
    return { ...mapSlides(doc, redraw), customIcons: { ...doc.customIcons, [def.id]: def } }
  })
}

export function removeCustomIcon(id: string): void {
  S().commit(
    (doc) => {
      const { [id]: _drop, ...rest } = doc.customIcons
      // The icon goes from every slide of the figure, and arrows attached to it let go.
      const without = (nodes: FigNode[]): FigNode[] => {
        const users = nodes.filter((n) => n.type === 'icon' && n.iconId === id).map((n) => n.id)
        return users.length ? removeNodes({ ...doc, nodes }, users).nodes : nodes
      }
      return { ...mapSlides(doc, without), customIcons: rest }
    },
    { select: [] },
  )
}

// ---------- slides ----------

/** Finish what is being typed or reshaped on the open slide, before another slide takes its place. */
function settleSlide(): void {
  // Leaving the text box saves what was typed (see TextEditor).
  if (S().editingTextId && document.activeElement instanceof HTMLElement) document.activeElement.blur()
  if (S().reshape) finishReshape()
  if (S().editingTextId) S().set({ editingTextId: null })
}

/**
 * Open another slide. This is not a step of its own for Undo: Undo takes back the last change,
 * and shows the slide it was made on.
 */
export function openSlide(index: number): void {
  const s = S()
  if (s.gestureStart || index === slideIndex(s.doc) || index < 0 || index >= slideCount(s.doc)) return
  settleSlide()
  S().set({ doc: showSlide(S().doc, index), selection: [], mergeKey: null })
}

/** Open the slide after the open one (1) or before it (-1). False when there is none. */
export function stepSlide(dir: 1 | -1): boolean {
  const { doc } = S()
  const next = slideIndex(doc) + dir
  if (next < 0 || next >= slideCount(doc)) return false
  openSlide(next)
  return true
}

/** One change to the slides of the figure, as one step for Undo. */
function changeSlides(fn: (doc: FigDoc) => FigDoc): boolean {
  if (S().gestureStart) return false
  settleSlide()
  const before = S().doc
  S().commit(fn, { select: [] })
  return S().doc !== before
}

/**
 * A new slide after the open one: empty, or beginning as a template (a slide of the scientist's own
 * design) or as one of the ready-made layouts.
 */
export function newSlide(start?: FigDoc | SlideLayoutId): void {
  const made = changeSlides((doc) =>
    typeof start === 'string' ? addSlide(doc, layoutNodes(start, doc, uid)) : start ? slideFromTemplate(doc, start) : addSlide(doc),
  )
  if (made) S().set({ slidesShown: true })
  else toast(`A figure holds at most ${MAX_SLIDES} slides.`)
}

/** A copy of the open slide, after it. */
export function copySlide(): void {
  if (changeSlides(duplicateSlide)) S().set({ slidesShown: true })
  else toast(`A figure holds at most ${MAX_SLIDES} slides.`)
}

/** Delete the open slide. A figure keeps one slide. */
export function deleteSlide(): void {
  if (changeSlides(removeSlide)) toast('Slide deleted. Undo brings it back.')
}

/** Move a slide to another place among the slides. */
export function moveSlideTo(from: number, to: number): void {
  changeSlides((doc) => moveSlide(doc, from, to))
}

/** Show the slides full screen, from the open one. */
export function present(): void {
  settleSlide()
  S().set({ presenting: true, selection: [] })
  // Asked for here, while the press that started it is being handled: browsers grant full screen
  // only then. Where it is refused (an iPhone, a frame) the slides fill the window instead.
  try {
    void document.documentElement.requestFullscreen?.()?.catch(() => undefined)
  } catch {
    /* no full screen in this browser */
  }
}

// ---------- view ----------

export function setView(view: View): void {
  S().set({ view: { ...view, zoom: clamp(view.zoom, MIN_ZOOM, MAX_ZOOM) } })
}

/** Zoom by `factor`, keeping the given screen point (default: canvas centre) fixed. */
export function zoomBy(factor: number, at?: Point): void {
  const { view, canvasSize } = S()
  const p = at ?? { x: canvasSize.w / 2, y: canvasSize.h / 2 }
  const zoom = clamp(view.zoom * factor, MIN_ZOOM, MAX_ZOOM)
  const k = zoom / view.zoom
  S().set({ view: { zoom, x: p.x - (p.x - view.x) * k, y: p.y - (p.y - view.y) * k } })
}

export function fitView(): void {
  const { doc, canvasSize } = S()
  const pad = Math.min(48, canvasSize.w * 0.06)
  const zoom = clamp(Math.min((canvasSize.w - 2 * pad) / doc.width, (canvasSize.h - 2 * pad) / doc.height), MIN_ZOOM, 2)
  S().set({ view: { zoom, x: (canvasSize.w - doc.width * zoom) / 2, y: (canvasSize.h - doc.height * zoom) / 2 } })
}

export function expandSelection(ids: string[]): string[] {
  return expandGroups(S().doc, ids)
}
