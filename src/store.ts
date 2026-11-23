// Editor state: the figure, the selection, the active tool, the view and the undo history.

import { create } from 'zustand'
import { storedFavourites, storedRecent } from './icons/favourites'
import { emptyDoc } from './model/doc'
import { orderLetters } from './model/letters'
import type { Style } from './model/style'
import type { VisionKind } from './model/vision'
import type { ChartPart } from './model/chart'
import type { PartBox } from './model/chartParts'
import type { LineStyle } from './model/dash'
import { startTheme, type Theme } from './ui/theme'
import type { ConnectorFade, ConnectorKind, FigDoc, FigNode, IconDef, ShapeKind } from './model/types'

export type Tool = 'select' | 'pan' | 'text' | 'shape' | 'connector' | 'membrane' | 'pen' | 'eraser'

/** screen = world * zoom + (x, y) */
export interface View {
  x: number
  y: number
  zoom: number
}

export type Dialog = null | 'export' | 'ai' | 'import-icon' | 'help' | 'figures' | 'pathway' | 'analysis' | 'templates' | 'add' | 'import' | 'calculators' | 'search' | 'whats-new' | 'report' | 'protein' | 'molecule' | 'reaction' | 'sketch' | 'suggest'

const HISTORY_LIMIT = 100
const MERGE_WINDOW_MS = 1000

export interface EditorState {
  /** Id under which the open figure is saved in the browser. */
  figureId: string
  doc: FigDoc
  selection: string[]
  tool: Tool
  view: View
  past: FigDoc[]
  future: FigDoc[]
  /** Document as it was when the current drag started; null when no drag is in progress. */
  gestureStart: FigDoc | null
  mergeKey: string | null
  mergeTime: number

  connectorKind: ConnectorKind
  /** Line style of the next arrow drawn. */
  connectorLine: LineStyle
  /** Whether the next arrow drawn fades, and which way. */
  connectorFade: ConnectorFade | null
  connectorRoute: 'straight' | 'elbow'
  /** Line thickness of the next arrow drawn. */
  connectorWidth: number
  shapeKind: ShapeKind
  /** Open the next shape drawn for typing text inside it. */
  shapeText: boolean
  penColor: string
  penSize: number
  membraneThickness: number
  gridSnap: boolean
  showSketch: boolean
  editingTextId: string | null
  /** The icon whose outline points are being moved, and the copy of the icon made for that. */
  reshape: { nodeId: string; iconId: string } | null
  clipboard: FigNode[]
  /** The look taken with Copy style, given to other objects with Paste style. */
  copiedStyle: Style | null
  clipboardIcons: Record<string, IconDef>
  /** Size of the canvas area on screen, in CSS pixels. */
  canvasSize: { w: number; h: number }
  dialog: Dialog
  toast: string | null
  /** Bumped to ask the canvas to zoom so the whole page is visible. */
  fitRequest: number
  /** The row of slides under the page was opened by hand (a figure with several slides always shows it). */
  slidesShown: boolean
  /** The slides are being shown full screen, one after the other. */
  presenting: boolean
  /** The animations panel is open (beside the properties panel in a wide window, in its place otherwise). */
  animations: boolean
  /** The animations of the open slide being played on the page, from press `from` to press `to`; `n` makes a repeat a new request. */
  playing: { from: number; to: number; n: number } | null
  /** The page shown as seen with a colour-vision deficiency (`src/model/vision.ts`); null = as it is. Never exported. */
  vision: VisionKind | null
  /** The light or the dark look of the interface (not of the figure). */
  theme: Theme
  /** Ids of the icons of the collections marked as favourites, and of those used last (newest first); kept in the browser. */
  favouriteIcons: string[]
  recentIcons: string[]
  /**
   * The part of a chart pressed last: which chart and part, a box round the part in the chart's own
   * box, and the chart as it was then. It is let go of as soon as that chart changes or something
   * else is selected, so the box is never one of a chart that looks different by now.
   */
  chartPart: { id: string; part: ChartPart; box: PartBox; node: FigNode; nonce: number } | null
  /** Words to search the icon library for, asked from elsewhere (the Search box); `n` makes a repeat of the same words a new request. */
  libraryRequest: { query: string; n: number } | null
  /** Bumped to ask for the system's file picker for a figure file (File › Open, the Import dialog, Search). */
  openFileRequest: number
  /** Words a dialog opened from Search starts with (the compound to draw), or the table the chart suggestions start with; taken by the dialog when it opens. */
  dialogQuery: string
  /** What the structure editor opens with: a molfile, and the icon it replaces when it is placed again. Taken by the dialog when it opens. */
  sketchStart: { molfile: string; name?: string; replace?: string } | null

  /** Change the figure and record one undo step. Changes sharing a `merge` key in quick succession become one step. */
  commit: (fn: (doc: FigDoc) => FigDoc, opts?: { merge?: string; select?: string[] }) => void
  beginGesture: () => void
  /** Change the figure during a drag, computed from the document as it was when the drag started. */
  transient: (fn: (start: FigDoc) => FigDoc) => void
  endGesture: () => void
  cancelGesture: () => void
  undo: () => void
  redo: () => void
  loadDoc: (doc: FigDoc) => void
  set: (patch: Partial<EditorState>) => void
}

export const useEditor = create<EditorState>((set, get) => ({
  figureId: 'unsaved',
  doc: emptyDoc(),
  selection: [],
  tool: 'select',
  view: { x: 0, y: 0, zoom: 1 },
  past: [],
  future: [],
  gestureStart: null,
  mergeKey: null,
  mergeTime: 0,

  connectorKind: 'arrow',
  connectorLine: 'solid',
  connectorFade: null,
  connectorRoute: 'straight',
  connectorWidth: 2,
  shapeKind: 'roundrect',
  shapeText: false,
  penColor: '#3b4252',
  penSize: 4,
  membraneThickness: 26,
  gridSnap: false,
  showSketch: true,
  editingTextId: null,
  reshape: null,
  clipboard: [],
  copiedStyle: null,
  clipboardIcons: {},
  canvasSize: { w: 800, h: 600 },
  dialog: null,
  toast: null,
  fitRequest: 0,
  slidesShown: false,
  presenting: false,
  animations: false,
  playing: null,
  vision: null,
  theme: startTheme(),
  favouriteIcons: storedFavourites(),
  recentIcons: storedRecent(),
  chartPart: null,
  libraryRequest: null,
  openFileRequest: 0,
  dialogQuery: '',
  sketchStart: null,

  commit: (fn, opts) => {
    const s = get()
    const next = orderLetters(fn(s.doc))
    const select = opts?.select
    if (next === s.doc) {
      if (select) set({ selection: select })
      return
    }
    const now = Date.now()
    const merging = !!opts?.merge && opts.merge === s.mergeKey && now - s.mergeTime < MERGE_WINDOW_MS
    set({
      doc: next,
      past: merging ? s.past : [...s.past, s.doc].slice(-HISTORY_LIMIT),
      future: [],
      mergeKey: opts?.merge ?? null,
      mergeTime: now,
      ...(select ? { selection: select } : {}),
    })
  },

  beginGesture: () => {
    if (!get().gestureStart) set({ gestureStart: get().doc })
  },

  transient: (fn) => {
    const start = get().gestureStart
    if (start) set({ doc: fn(start) })
  },

  endGesture: () => {
    const s = get()
    if (!s.gestureStart) return
    if (s.gestureStart === s.doc) {
      set({ gestureStart: null })
      return
    }
    // A letter dragged to another panel takes the name of its new place.
    set({ doc: orderLetters(s.doc), past: [...s.past, s.gestureStart].slice(-HISTORY_LIMIT), future: [], gestureStart: null, mergeKey: null })
  },

  cancelGesture: () => {
    const start = get().gestureStart
    if (start) set({ doc: start, gestureStart: null })
  },

  undo: () => {
    const s = get()
    if (s.gestureStart || !s.past.length) return
    const prev = s.past[s.past.length - 1]
    const ids = new Set(prev.nodes.map((n) => n.id))
    set({
      doc: prev,
      past: s.past.slice(0, -1),
      future: [s.doc, ...s.future],
      selection: s.selection.filter((id) => ids.has(id)),
      editingTextId: null,
      mergeKey: null,
    })
  },

  redo: () => {
    const s = get()
    if (s.gestureStart || !s.future.length) return
    const next = s.future[0]
    const ids = new Set(next.nodes.map((n) => n.id))
    set({
      doc: next,
      past: [...s.past, s.doc],
      future: s.future.slice(1),
      selection: s.selection.filter((id) => ids.has(id)),
      editingTextId: null,
      mergeKey: null,
    })
  },

  loadDoc: (doc) =>
    set((s) => ({
      doc,
      selection: [],
      past: [],
      future: [],
      gestureStart: null,
      editingTextId: null,
      reshape: null,
      mergeKey: null,
      tool: 'select',
      fitRequest: s.fitRequest + 1,
    })),

  set: (patch) => set(patch),
}))

// The part of a chart that was pressed belongs to the chart as it was and to a selection of that chart alone.
useEditor.subscribe((s) => {
  const pick = s.chartPart
  if (pick && (s.selection.length !== 1 || s.selection[0] !== pick.id || !s.doc.nodes.includes(pick.node))) useEditor.setState({ chartPart: null })
})

let toastTimer: ReturnType<typeof setTimeout> | undefined

export function toast(message: string): void {
  useEditor.setState({ toast: message })
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => useEditor.setState({ toast: null }), 3200)
}
