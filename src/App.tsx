import { useEffect, useState } from 'react'
import { Canvas } from './canvas/Canvas'
import { installKeyboard } from './keys'
import { useEditor } from './store'
import { TEMPLATES } from './templates'
import { AiDialog } from './ui/AiDialog'
import { ExportDialog, HelpDialog, ImportIconDialog } from './ui/Dialogs'
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
          <button key={t.id} className="btn" onClick={() => useEditor.getState().loadDoc(t.build())}>
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
      <div className="toast-region" role="status" aria-live="polite">
        {toastText && <div className="toast">{toastText}</div>}
      </div>
    </div>
  )
}
