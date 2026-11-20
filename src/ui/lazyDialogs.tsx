// The dialogs are fetched when first opened, so that the editor itself starts sooner: together
// with the export code, the pathway importer and the AI route they are a third of the app.
// `preloadDialogs` fetches them all in the background right after the editor is on screen, which
// also puts them into the offline cache: after the first visit the whole app works offline.

import { Component, Suspense, lazy, type ComponentType, type ReactNode } from 'react'
import { toast, useEditor, type Dialog } from '../store'

type Name = Exclude<Dialog, null>

const loaders: Record<Name, () => Promise<{ default: ComponentType }>> = {
  export: () => import('./Dialogs').then((m) => ({ default: m.ExportDialog })),
  'import-icon': () => import('./Dialogs').then((m) => ({ default: m.ImportIconDialog })),
  help: () => import('./Dialogs').then((m) => ({ default: m.HelpDialog })),
  ai: () => import('./AiDialog').then((m) => ({ default: m.AiDialog })),
  figures: () => import('./FiguresDialog').then((m) => ({ default: m.FiguresDialog })),
  pathway: () => import('./PathwayDialog').then((m) => ({ default: m.PathwayDialog })),
  analysis: () => import('./AnalysisDialog').then((m) => ({ default: m.AnalysisDialog })),
  templates: () => import('./TemplatesDialog').then((m) => ({ default: m.TemplatesDialog })),
}

const views = Object.fromEntries(Object.entries(loaders).map(([name, load]) => [name, lazy(load)])) as unknown as Record<Name, ComponentType>

/** Fetch every dialog now (they are small next to the editor), and the tour of the features with them. Never fails: what cannot be fetched is fetched when it is opened. */
export const preloadDialogs = (): Promise<unknown> => Promise.allSettled([...Object.values(loaders).map((load) => load()), import('../tutorial')])

/** A dialog that cannot be fetched (the connection dropped before it was ever opened) closes with a message instead of taking the editor down. */
class Fetched extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }
  componentDidCatch(): void {
    useEditor.setState({ dialog: null })
    toast('This part of BioSketch could not be loaded. Check the connection and try again.')
  }
  componentDidUpdate(): void {
    // Closed again: ready for the next dialog.
    if (this.state.failed && useEditor.getState().dialog === null) this.setState({ failed: false })
  }
  render(): ReactNode {
    return this.state.failed ? null : this.props.children
  }
}

/** The dialog that is open, if any. */
export function Dialogs() {
  const dialog = useEditor((s) => s.dialog)
  if (!dialog) return <Fetched>{null}</Fetched>
  const View = views[dialog]
  return (
    <Fetched>
      <Suspense fallback={null}>
        <View />
      </Suspense>
    </Fetched>
  )
}
