import { useEffect, useState } from 'react'
import { Canvas } from './canvas/Canvas'
import { exampleDoc } from './figures'
import { MISSING_ICON, getIcon } from './icons/library'
import { installKeyboard } from './keys'
import { nodeLabel } from './model/describe'
import { findNode } from './model/nodes'
import { useEditor } from './store'
import { TEMPLATES } from './templates'
import { Icon } from './ui/Icon'
import { Dialogs } from './ui/lazyDialogs'
import { LibraryPanel } from './ui/LibraryPanel'
import { PanelResizer } from './ui/PanelResizer'
import { PropertiesPanel } from './ui/PropertiesPanel'
import { ToolRail } from './ui/ToolRail'
import { TopBar } from './ui/TopBar'

const isWide = () => window.innerWidth >= 1000

function EmptyState() {
  const empty = useEditor((s) => s.doc.nodes.length === 0 && s.tool === 'select')
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
      <p>Tap an icon in the library to place it, sketch with the pen, or begin from an example.</p>
      <div className="row wrap center">
        {TEMPLATES.map((t) => (
          <button key={t.id} className="btn" onClick={() => void exampleDoc(t).then((doc) => doc && useEditor.getState().loadDoc(doc))}>
            {t.name}
          </button>
        ))}
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
  const [showLibrary, setShowLibrary] = useState(isWide)
  const [showProps, setShowProps] = useState(isWide)

  useEffect(() => installKeyboard(), [])

  return (
    <div className={`app${showLibrary ? ' with-library' : ''}${showProps ? ' with-props' : ''}`}>
      <TopBar
        showLibrary={showLibrary}
        showProps={showProps}
        onToggleLibrary={() => setShowLibrary((v) => !v)}
        onToggleProps={() => setShowProps((v) => !v)}
      />
      <div className="workspace">
        <ToolRail />
        {showLibrary && <LibraryPanel />}
        <main className="stage">
          <Canvas />
          <EmptyState />
        </main>
        {showProps && <PanelResizer />}
        {showProps && <PropertiesPanel />}
      </div>
      <Dialogs />
      <SelectionStatus />
      <div className="toast-region" role="status" aria-live="polite">
        {toastText && <div className="toast">{toastText}</div>}
      </div>
    </div>
  )
}
