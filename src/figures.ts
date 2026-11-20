// Working with several saved figures: new, open, duplicate, delete.

import { flushSave, markSaved } from './io/autosave'
import { deleteFigure, listFigures, loadFigure, newFigureId, renameProject, saveFigure, setCurrentFigure, setFigureProject, type FigureMeta } from './io/storage'
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
    // What a failed fetch says of itself ("Failed to fetch") tells a scientist nothing.
    toast(e instanceof Error && /icons/.test(e.message) ? e.message : 'The icons of this template could not be loaded. Check the connection and try again.')
    return null
  }
}

/**
 * The tour of the features as a new figure of several slides. It is a file of its own, fetched when
 * first asked for (and, like the dialogs, in the background after the editor is on screen).
 */
export async function tourDoc(): Promise<FigDoc | null> {
  try {
    return await exampleDoc((await import('./tutorial')).TUTORIAL)
  } catch {
    toast('The tour could not be loaded. Check the connection and try again.')
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

/**
 * Start a new figure (empty, or from an example or an opened file). The previous one stays saved.
 * With a `project` the new figure is filed under it in the list of figures.
 */
export async function newFigure(doc: FigDoc = emptyDoc(), project = ''): Promise<void> {
  const id = newFigureId()
  await show(id, doc, false)
  if (project) await setFigureProject(id, project)
}

/** File a saved figure under a project, or under none. */
export async function moveToProject(id: string, project: string): Promise<void> {
  await flushSave()
  if (!(await setFigureProject(id, project))) toast('The project could not be kept: this browser window does not store anything.')
}

export async function renameFigureProject(from: string, to: string): Promise<void> {
  await flushSave()
  await renameProject(from, to)
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
  const copy = newFigureId()
  await saveFigure(copy, { ...doc, name: `${doc.name} (copy)` })
  // The copy is filed where the figure it was made of is.
  const project = (await listFigures()).find((m) => m.id === id)?.project
  if (project) await setFigureProject(copy, project)
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
