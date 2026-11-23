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
  add: () => import('./AddDialog').then((m) => ({ default: m.AddDialog })),
  import: () => import('./AddDialog').then((m) => ({ default: m.ImportDialog })),
  search: () => import('./AddDialog').then((m) => ({ default: m.SearchDialog })),
  suggest: () => import('./SuggestDialog').then((m) => ({ default: m.SuggestDialog })),
  calculators: () => import('./CalculatorsDialog').then((m) => ({ default: m.CalculatorsDialog })),
  'whats-new': () => import('./AboutDialog').then((m) => ({ default: m.WhatsNewDialog })),
  molecule: () => import('./MoleculeDialog').then((m) => ({ default: m.MoleculeDialog })),
  reaction: () => import('./MoleculeDialog').then((m) => ({ default: m.ReactionDialog })),
  sketch: () => import('./SketchDialog').then((m) => ({ default: m.SketchDialog })),
  protein: () => import('./ProteinDialog').then((m) => ({ default: m.ProteinDialog })),
  report: () => import('./AboutDialog').then((m) => ({ default: m.ReportDialog })),
}

const views = Object.fromEntries(Object.entries(loaders).map(([name, load]) => [name, lazy(load)])) as unknown as Record<Name, ComponentType>

/** Fetch every dialog now (they are small next to the editor), and the tour of the features with them. Never fails: what cannot be fetched is fetched when it is opened. */
export const preloadDialogs = (): Promise<unknown> => Promise.allSettled([...Object.values(loaders).map((load) => load()), loadPanel(), loadAnimations(), import('../tutorial'), import('../templates')])

// The properties panel is the largest part of the editor (every setting of every kind of chart), so
// it is a file of its own too: the page is drawn first and the panel follows a moment later. It is
// fetched at once, not when something is selected.
const loadPanel = () => import('./PropertiesPanel').then((m) => ({ default: m.PropertiesPanel }))
const PanelView = lazy(loadPanel)
const emptyPanel = (text?: string) => (
  <aside className="panel properties" aria-label="Properties" aria-busy={!text}>
    {text && <p className="notice">{text}</p>}
  </aside>
)

class PanelFetched extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }
  render(): ReactNode {
    return this.state.failed ? emptyPanel('The settings could not be loaded. Reload the page once there is a connection.') : this.props.children
  }
}

/** The properties panel, fetched on its own. */
const loadAnimations = () => import('./AnimationsPanel').then((m) => ({ default: m.AnimationsPanel }))
const AnimationsView = lazy(loadAnimations)

/** The animations panel, fetched when first opened (and in the background with the dialogs). */
export function LazyAnimationsPanel() {
  return (
    <PanelFetched>
      <Suspense fallback={emptyPanel()}>
        <AnimationsView />
      </Suspense>
    </PanelFetched>
  )
}

export function LazyPropertiesPanel() {
  return (
    <PanelFetched>
      <Suspense fallback={emptyPanel()}>
        <PanelView />
      </Suspense>
    </PanelFetched>
  )
}

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
