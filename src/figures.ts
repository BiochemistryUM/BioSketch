// Working with several saved figures: new, open, duplicate, delete.

import { flushSave, markSaved } from './io/autosave'
import { deleteFigure, listFigures, loadFigure, newFigureId, saveFigure, setCurrentFigure, type FigureMeta } from './io/storage'
import { missingIconsNote } from './icons/library'
import { packList } from './icons/packs'
import { emptyDoc } from './model/doc'
import type { FigDoc } from './model/types'
import { toast, useEditor } from './store'
import { buildTemplate, type Template } from './templates'

/**
 * An example as a new figure, with its icons fetched from the collections. Null, with a message
 * on screen, when they could not be fetched.
 */
export async function exampleDoc(template: Template): Promise<FigDoc | null> {
  try {
    return await buildTemplate(template, await packList())
  } catch (e) {
    toast(e instanceof Error ? e.message : 'The example could not be opened.')
    return null
  }
}

/** True for a figure nobody has touched: still exactly a new, empty one. */
const untouched = (doc: FigDoc): boolean => JSON.stringify(doc) === JSON.stringify(emptyDoc())

/** Make `doc` the open figure under `id`. The figure that was open is saved first. */
async function show(id: string, doc: FigDoc, alreadyStored: boolean): Promise<void> {
  await flushSave()
  // A figure that was never touched (still exactly a new, empty one) is not worth keeping in the list.
  const leaving = useEditor.getState()
  if (leaving.figureId !== id && untouched(leaving.doc)) await deleteFigure(leaving.figureId)
  useEditor.getState().set({ figureId: id })
  useEditor.getState().loadDoc(doc)
  if (!alreadyStored) await saveFigure(id, doc)
  markSaved(doc)
  await setCurrentFigure(id)
  const note = missingIconsNote(doc)
  if (note) toast(note)
}

/** Start a new figure (empty, or from an example or an opened file). The previous one stays saved. */
export async function newFigure(doc: FigDoc = emptyDoc()): Promise<void> {
  await show(newFigureId(), doc, false)
}

export async function openFigure(id: string): Promise<void> {
  if (id === useEditor.getState().figureId) return
  const doc = await loadFigure(id)
  if (!doc) {
    toast('This figure could not be opened.')
    return
  }
  await show(id, doc, true)
}

export async function duplicateFigure(id: string): Promise<void> {
  await flushSave()
  const doc = await loadFigure(id)
  if (!doc) return
  await saveFigure(newFigureId(), { ...doc, name: `${doc.name} (copy)` })
}

/** Delete a saved figure. When it is the open one, another figure (or a new empty one) is opened. */
export async function removeFigure(id: string): Promise<void> {
  const open = useEditor.getState().figureId === id
  if (open) markSaved(useEditor.getState().doc)
  await deleteFigure(id)
  if (!open) return
  const rest = await listFigures()
  const next = rest[0] ? await loadFigure(rest[0].id) : null
  if (rest[0] && next) await show(rest[0].id, next, true)
  else await show(newFigureId(), emptyDoc(), false)
}

export async function figureList(): Promise<FigureMeta[]> {
  await flushSave()
  return listFigures()
}
