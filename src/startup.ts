// What happens once the editor is on screen: the figure that was open last time is opened, with a
// time limit, so that a browser whose storage is slow or broken still shows a working editor.

import { missingIconsNote } from './icons/library'
import { startAutosave } from './io/autosave'
import { loadStartup, newFigureId } from './io/storage'
import { toast, useEditor } from './store'
import { VERSION, newSince } from './version'

/** How long saved figures may take to open before the editor goes on without them. */
export const STARTUP_WAIT = 6000
/** Where the version last seen in this browser is kept, to tell what is new after an update. */
const SEEN_VERSION = 'biosketch.seenVersion'

/** Open the figure that was open last time, then keep saving it as it changes. The editor is already on screen. */
export async function openLastFigure(load = loadStartup, wait = STARTUP_WAIT): Promise<void> {
  const blank = useEditor.getState().doc
  const late = new Promise<'late'>((resolve) => setTimeout(() => resolve('late'), wait))
  const found = await Promise.race([load().catch(() => null), late])
  let opened = false
  if (found === 'late' || found === null) {
    useEditor.getState().set({ figureId: newFigureId() })
    toast(
      found === 'late'
        ? 'Your saved figures are taking long to open, so a new figure was started. They are not lost: reload the page to try again, or find them under File › My figures.'
        : 'Your saved figures could not be opened, so a new figure was started. Reload the page to try again.',
    )
  } else if (useEditor.getState().doc !== blank) {
    // Something was drawn while the figures were opening: it is kept, as a figure of its own.
    useEditor.getState().set({ figureId: newFigureId() })
  } else {
    useEditor.getState().set({ figureId: found.id })
    if (found.doc) {
      useEditor.getState().loadDoc(found.doc)
      opened = true
    }
  }
  startAutosave()
  const note = opened && missingIconsNote(useEditor.getState().doc)
  if (note) toast(note)
  showWhatsNew(opened)
}

/** After an update, say once what changed. A first visit (nothing saved yet) is not an update. */
function showWhatsNew(hadFigures: boolean): void {
  try {
    // Versions before 0.2.0 kept no note of themselves: saved figures mean one of them was used.
    const seen = localStorage.getItem(SEEN_VERSION) ?? (hadFigures ? '0.1.0' : null)
    localStorage.setItem(SEEN_VERSION, VERSION)
    if (newSince(seen).length && !useEditor.getState().dialog) useEditor.setState({ dialog: 'whats-new' })
  } catch {
    /* storage unavailable: nothing to compare with */
  }
}

