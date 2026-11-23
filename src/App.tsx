import { useEffect, useState } from 'react'
import { Canvas } from './canvas/Canvas'
import { START_EXAMPLES, exampleDoc, tourDoc } from './figures'
import { MISSING_ICON, getIcon } from './icons/library'
import { installKeyboard } from './keys'
import { nodeLabel } from './model/describe'
import { findNode } from './model/nodes'
import { useEditor } from './store'
import { Icon } from './ui/Icon'
import { Dialogs, LazyAnimationsPanel, LazyPropertiesPanel } from './ui/lazyDialogs'
import { LibraryPanel } from './ui/LibraryPanel'
import { PanelResizer } from './ui/PanelResizer'
import { Presenter } from './ui/Presenter'
import { SlideStrip } from './ui/SlideStrip'
import { ToolRail } from './ui/ToolRail'
import { TopBar } from './ui/TopBar'

const isWide = () => window.innerWidth >= 1000

function EmptyState() {
  // Only for a figure that is still one empty page: an example takes the place of the whole figure,
  // which must not happen to the other slides of a figure that has some.
  const empty = useEditor((s) => s.doc.nodes.length === 0 && !s.doc.slides && s.tool === 'select')
  const figureId = useEditor((s) => s.figureId)
  // Closed for this figure only: a new empty figure shows the card again.
  const [closedFor, setClosedFor] = useState<string | null>(null)
  if (!empty || closedFor === figureId) return null
  return (
    <div className="empty-state">
      <button className="icon-only empty-close" aria-label="Close" title="Close" onClick={() => setClosedFor(figureId)}>
        <Icon name="close" size={18} />
      </button>
      <h2>Start your figure</h2>
      <p>Tap an icon in the library to place it, sketch with the pen, or begin from an example. The tour shows what BioSketch can do, slide by slide.</p>
      <div className="row wrap center">
        {START_EXAMPLES.map((t) => (
          <button key={t.id} className="btn" onClick={() => void exampleDoc(t.id).then((doc) => doc && useEditor.getState().loadDoc(doc))}>
            {t.name}
          </button>
        ))}
        <button className="btn" onClick={() => useEditor.setState({ dialog: 'templates' })}>
          Templates and posters
        </button>
        <button className="btn" onClick={() => void tourDoc().then((doc) => doc && useEditor.getState().loadDoc(doc))}>
          Tour of the features
        </button>
        <button className="btn" onClick={() => useEditor.setState({ dialog: 'help' })}>
          How it works
        </button>
      </div>
    </div>
  )
}

/** Says in words what is selected, for people who use a screen reader. */
function SelectionStatus() {
  const text = useEditor((s) => {
    if (!s.selection.length) return ''
    if (s.selection.length > 1) return `${s.selection.length} objects selected`
    const node = findNode(s.doc, s.selection[0])
    return node ? `Selected: ${nodeLabel(node, node.type === 'icon' ? (getIcon(s.doc, node.iconId)?.name ?? MISSING_ICON) : undefined)}` : ''
  })
  return (
    <div className="sr-only" role="status" aria-live="polite">
      {text}
    </div>
  )
}

export function App() {
  const toastText = useEditor((s) => s.toast)
  // A figure with several slides always shows them; one with a single slide when they were asked for.
  const showSlides = useEditor((s) => s.slidesShown || !!s.doc.slides)
  const [showLibrary, setShowLibrary] = useState(isWide)
  const [propsWanted, setShowProps] = useState(isWide)
  // The animations panel takes the place of the properties panel, and opens it when it was closed.
  const animations = useEditor((s) => s.animations)
  const showProps = propsWanted || animations

  useEffect(() => installKeyboard(), [])
  // Search asked for icons: the library must be open to show them.
  const libraryRequest = useEditor((s) => s.libraryRequest)
  useEffect(() => {
    if (libraryRequest) setShowLibrary(true)
  }, [libraryRequest])

  return (
    <div className={`app${showLibrary ? ' with-library' : ''}${showProps ? ' with-props' : ''}${showSlides ? ' with-slides' : ''}`}>
      <TopBar
        showLibrary={showLibrary}
        showProps={showProps}
        onToggleLibrary={() => setShowLibrary((v) => !v)}
        onToggleProps={() => {
          if (animations) useEditor.setState({ animations: false })
          setShowProps(animations ? true : (v) => !v)
        }}
      />
      <div className="workspace">
        <ToolRail />
        {showLibrary && <LibraryPanel />}
        <main className="stage">
          <div className="stage-page">
            <Canvas />
            <EmptyState />
          </div>
          {showSlides && <SlideStrip />}
        </main>
        {showProps && <PanelResizer />}
        {showProps && (animations ? <LazyAnimationsPanel /> : <LazyPropertiesPanel />)}
      </div>
      <Dialogs />
      <Presenter />
      <SelectionStatus />
      <div className="toast-region" role="status" aria-live="polite">
        {toastText && <div className="toast">{toastText}</div>}
      </div>
    </div>
  )
}
