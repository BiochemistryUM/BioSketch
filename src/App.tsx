import { useEffect, useState } from 'react'
import { Canvas } from './canvas/Canvas'
import { inPreferredStyle } from './figures'
import { getIcon } from './icons/library'
import { installKeyboard } from './keys'
import { nodeLabel } from './model/describe'
import { findNode } from './model/nodes'
import { useEditor } from './store'
import { TEMPLATES } from './templates'
import { AiDialog } from './ui/AiDialog'
import { ExportDialog, HelpDialog, ImportIconDialog } from './ui/Dialogs'
import { FiguresDialog } from './ui/FiguresDialog'
import { LibraryPanel } from './ui/LibraryPanel'
import { PropertiesPanel } from './ui/PropertiesPanel'
import { ToolRail } from './ui/ToolRail'
import { TopBar } from './ui/TopBar'

const isWide = () => window.innerWidth >= 1000

function EmptyState() {
  const empty = useEditor((s) => s.doc.nodes.length === 0 && s.tool === 'select')
  if (!empty) return null
  return (
    <div className="empty-state">
      <h2>Start your figure</h2>
      <p>Tap an icon in the library to place it, sketch with the pen, or begin from an example.</p>
      <div className="row wrap center">
        {TEMPLATES.map((t) => (
          <button key={t.id} className="btn" onClick={() => useEditor.getState().loadDoc(inPreferredStyle(t.build()))}>
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
    return node ? `Selected: ${nodeLabel(node, node.type === 'icon' ? getIcon(s.doc, node.iconId)?.name : undefined)}` : ''
  })
  return (
    <div className="sr-only" role="status" aria-live="polite">
      {text}
    </div>
  )
}

export function App() {
  const dialog = useEditor((s) => s.dialog)
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
        {showProps && <PropertiesPanel />}
      </div>
      {dialog === 'export' && <ExportDialog />}
      {dialog === 'ai' && <AiDialog />}
      {dialog === 'import-icon' && <ImportIconDialog />}
      {dialog === 'help' && <HelpDialog />}
      {dialog === 'figures' && <FiguresDialog />}
      <SelectionStatus />
      <div className="toast-region" role="status" aria-live="polite">
        {toastText && <div className="toast">{toastText}</div>}
      </div>
    </div>
  )
}
