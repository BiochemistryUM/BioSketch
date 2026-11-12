import { useEffect, useRef, useState } from 'react'
import { fitView, newDocument, patchDoc, zoomBy } from '../actions'
import { download, fileBase } from '../io/export'
import { parseDoc, serializeDoc } from '../io/files'
import { toast, useEditor } from '../store'
import { TEMPLATES } from '../templates'
import { Icon, type IconName } from './Icon'

function BarButton(props: { icon: IconName; label: string; onClick: () => void; disabled?: boolean; active?: boolean; text?: string; className?: string }) {
  return (
    <button
      className={`bar-btn${props.active ? ' active' : ''}${props.className ? ` ${props.className}` : ''}`}
      aria-label={props.label}
      aria-pressed={props.active}
      title={props.label}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      <Icon name={props.icon} size={18} />
      {props.text && <span className="bar-text">{props.text}</span>}
    </button>
  )
}

export function saveFile(): void {
  const doc = useEditor.getState().doc
  download(serializeDoc(doc), `${fileBase(doc)}.biosketch.json`, 'application/json')
  toast('Figure file downloaded')
}

/** Replace the current figure, asking first when there is something to lose. */
function replaceFigure(action: () => void): void {
  const hasWork = useEditor.getState().doc.nodes.length > 0
  if (hasWork && !window.confirm('Replace the current figure? Save it first if you want to keep it.')) return
  action()
}

function FileMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const item = (label: string, icon: IconName, action: () => void) => (
    <button
      role="menuitem"
      className="menu-item"
      onClick={() => {
        setOpen(false)
        action()
      }}
    >
      <Icon name={icon} size={16} /> {label}
    </button>
  )

  const openFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const doc = parseDoc(await file.text())
      useEditor.getState().loadDoc(doc)
      toast(`Opened “${doc.name}”`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'This file could not be opened.')
    }
  }

  return (
    <div className="menu-wrap" ref={ref}>
      <button className="bar-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon name="open" size={18} />
        <span className="bar-text">File</span>
      </button>
      {open && (
        <div className="menu" role="menu">
          {item('New figure', 'newFile', () => replaceFigure(newDocument))}
          {item('Open figure file…', 'open', () => replaceFigure(() => fileRef.current?.click()))}
          {item('Save figure file', 'save', saveFile)}
          <div className="menu-label">Examples</div>
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              role="menuitem"
              className="menu-item two-line"
              onClick={() => {
                setOpen(false)
                replaceFigure(() => useEditor.getState().loadDoc(t.build()))
              }}
            >
              <Icon name="template" size={16} />
              <span>
                {t.name}
                <small>{t.description}</small>
              </span>
            </button>
          ))}
          <div className="menu-sep" />
          {item('Import SVG icon…', 'import', () => useEditor.setState({ dialog: 'import-icon' }))}
          {item('Help and shortcuts', 'help', () => useEditor.setState({ dialog: 'help' }))}
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => {
          void openFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </div>
  )
}

interface Props {
  showLibrary: boolean
  showProps: boolean
  onToggleLibrary: () => void
  onToggleProps: () => void
}

export function TopBar({ showLibrary, showProps, onToggleLibrary, onToggleProps }: Props) {
  const name = useEditor((s) => s.doc.name)
  const canUndo = useEditor((s) => s.past.length > 0)
  const canRedo = useEditor((s) => s.future.length > 0)
  const zoom = useEditor((s) => s.view.zoom)
  const gridSnap = useEditor((s) => s.gridSnap)
  const showSketch = useEditor((s) => s.showSketch)
  const set = useEditor((s) => s.set)
  const undo = useEditor((s) => s.undo)
  const redo = useEditor((s) => s.redo)

  return (
    <header className="topbar">
      <BarButton icon="library" label={showLibrary ? 'Hide the icon library' : 'Show the icon library'} active={showLibrary} onClick={onToggleLibrary} />
      <div className="brand" aria-hidden="true">
        BioSketch
      </div>
      <FileMenu />
      <input className="doc-name" aria-label="Figure name" value={name} onChange={(e) => patchDoc({ name: e.target.value }, 'doc-name')} />
      <div className="bar-group">
        <BarButton icon="undo" label="Undo" disabled={!canUndo} onClick={undo} />
        <BarButton icon="redo" label="Redo" disabled={!canRedo} onClick={redo} />
      </div>
      <div className="bar-group optional">
        <BarButton icon="zoomOut" label="Zoom out" onClick={() => zoomBy(1 / 1.25)} />
        <button className="bar-btn zoom" title="Fit the page to the window" aria-label={`Zoom ${Math.round(zoom * 100)} percent. Fit the page to the window`} onClick={fitView}>
          {Math.round(zoom * 100)}%
        </button>
        <BarButton icon="zoomIn" label="Zoom in" onClick={() => zoomBy(1.25)} />
      </div>
      <div className="bar-group optional">
        <BarButton icon="grid" label={gridSnap ? 'Snap to grid: on' : 'Snap to grid: off'} active={gridSnap} onClick={() => set({ gridSnap: !gridSnap })} />
        <BarButton
          icon={showSketch ? 'eye' : 'eyeOff'}
          label={showSketch ? 'Sketch strokes: shown' : 'Sketch strokes: hidden'}
          active={showSketch}
          onClick={() => set({ showSketch: !showSketch, selection: [] })}
        />
      </div>
      <div className="spacer" />
      <BarButton icon="sparkles" label="Create a figure with AI" text="AI" className="accent" onClick={() => set({ dialog: 'ai' })} />
      <BarButton icon="export" label="Export the figure" text="Export" className="primary" onClick={() => set({ dialog: 'export' })} />
      <BarButton icon="sliders" label={showProps ? 'Hide the properties panel' : 'Show the properties panel'} active={showProps} onClick={onToggleProps} />
    </header>
  )
}
