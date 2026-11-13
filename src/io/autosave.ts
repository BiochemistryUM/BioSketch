// Autosave: shortly after each change the open figure is written to browser storage, and
// immediately when the page is hidden or closed, or before another figure is opened.

import type { FigDoc } from '../model/types'
import { toast, useEditor } from '../store'
import { saveFigure, setCurrentFigure } from './storage'

let saved: FigDoc | null = null
let pending: { id: string; doc: FigDoc } | null = null
let timer: ReturnType<typeof setTimeout> | undefined
let writing: Promise<void> | null = null
let warned = false

async function write(): Promise<void> {
  const job = pending
  if (!job || job.doc === saved) return
  if (await saveFigure(job.id, job.doc)) {
    saved = job.doc
    // A newer change may have arrived while this one was being written; it keeps its own timer.
    if (pending === job) pending = null
  } else if (!warned) {
    // The change stays pending, so the next attempt (a later change, or closing the page) retries it.
    warned = true
    toast('Autosave is not available in this browser window. Use File › Save figure file to keep your work.')
  }
}

/** Write any unsaved change now. Calls that overlap share one write. */
export function flushSave(): Promise<void> {
  clearTimeout(timer)
  writing ??= write().finally(() => {
    writing = null
  })
  return writing
}

/** Tell autosave that the figure now open is already stored as it is. */
export function markSaved(doc: FigDoc): void {
  clearTimeout(timer)
  saved = doc
  pending = null
}

export function startAutosave(): void {
  saved = useEditor.getState().doc
  void setCurrentFigure(useEditor.getState().figureId)
  useEditor.subscribe((s) => {
    if (s.gestureStart || s.doc === pending?.doc) return
    if (s.doc === saved) {
      // Back at the stored state (for example after Undo): nothing newer must be written.
      clearTimeout(timer)
      pending = null
      return
    }
    pending = { id: s.figureId, doc: s.doc }
    clearTimeout(timer)
    timer = setTimeout(() => void flushSave(), 500)
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushSave()
  })
  window.addEventListener('pagehide', () => void flushSave())
}
