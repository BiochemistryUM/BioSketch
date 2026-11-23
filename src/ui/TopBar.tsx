import { useEffect, useRef, useState } from 'react'
import { fitView, patchDoc, present, zoomBy } from '../actions'
import { newFigure, tourDoc } from '../figures'
import { download, fileBase } from '../io/download'
import { parseDoc, serializeDoc } from '../io/files'
import { slideCount } from '../model/slides'
import { toast, useEditor } from '../store'
import { Icon, type IconName } from './Icon'
import { applyTheme } from './theme'

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

/** Switch between the light and the dark look, and remember the choice. */
export function toggleTheme(): void {
  const next = useEditor.getState().theme === 'dark' ? 'light' : 'dark'
  applyTheme(next, true)
  useEditor.setState({ theme: next })
}

/** Open a figure file (.biosketch.json) as a new figure. */
export async function openFigureFile(file: File | undefined): Promise<void> {
  if (!file) return
  try {
    const doc = parseDoc(await file.text())
    await newFigure(doc)
    toast(`Opened “${doc.name}” as a new figure`)
  } catch (e) {
    toast(e instanceof Error ? e.message : 'This file could not be opened.')
  }
}

function FileMenu() {
  const [open, setOpen] = useState(false)
  const theme = useEditor((s) => s.theme)
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

  // Other places (the Import dialog, Search) ask for the file picker through the store.
  const openRequest = useEditor((s) => s.openFileRequest)
  useEffect(() => {
    if (openRequest) fileRef.current?.click()
  }, [openRequest])

  return (
    <div className="menu-wrap" ref={ref}>
      <button className="bar-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon name="open" size={18} />
        <span className="bar-text">File</span>
      </button>
      {open && (
        <div className="menu" role="menu">
          {item('New figure', 'newFile', () => void newFigure())}
          {item('My figures…', 'figures', () => useEditor.setState({ dialog: 'figures' }))}
          <div className="menu-sep" />
          {item('Open figure file…', 'open', () => fileRef.current?.click())}
          {item('Save figure file', 'save', saveFile)}
          {item('Import…', 'import', () => useEditor.setState({ dialog: 'import' }))}
          {item('Start from a template…', 'template', () => useEditor.setState({ dialog: 'templates' }))}
          <button
            role="menuitem"
            className="menu-item two-line"
            onClick={() => {
              setOpen(false)
              void tourDoc().then((doc) => doc && newFigure(doc))
            }}
          >
            <Icon name="slides" size={16} />
            <span>
              Tour of the features
              <small>Thirteen slides with examples to try, from icons to statistics and molecules</small>
            </span>
          </button>
          <div className="menu-sep" />
          {item(theme === 'dark' ? 'Light theme' : 'Dark theme', theme === 'dark' ? 'sun' : 'moon', toggleTheme)}
          {item('Colour-blind preview', 'eye', () => useEditor.setState((s) => ({ vision: s.vision ? null : 'deuteranopia' })))}
          {item('Help and shortcuts', 'help', () => useEditor.setState({ dialog: 'help' }))}
          {item("What's new", 'sparkles', () => useEditor.setState({ dialog: 'whats-new' }))}
          {item('Report a problem…', 'mail', () => useEditor.setState({ dialog: 'report' }))}
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => {
          void openFigureFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </div>
  )
}

/** The four doors to what BioSketch can do besides drawing: add, import, calculators, search. In a narrow window they fold into one menu. */
const TOOLS_ITEMS: { icon: IconName; text: string; label: string; dialog: 'add' | 'import' | 'calculators' | 'search' }[] = [
  { icon: 'addBox', text: 'Add', label: 'Add to the page: charts, analyses, shapes, tables…', dialog: 'add' },
  { icon: 'import', text: 'Import', label: 'Import a pathway, a table, a picture or a figure file', dialog: 'import' },
  { icon: 'calculator', text: 'Calculators', label: 'Lab calculators: molarity, dilution, molecular weight', dialog: 'calculators' },
  { icon: 'search', text: 'Search', label: 'Search for anything to add, a command or an icon (⌘K)', dialog: 'search' },
]

function ToolsGroup() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [open])
  const go = (dialog: (typeof TOOLS_ITEMS)[number]['dialog']) => {
    setOpen(false)
    useEditor.setState({ dialog })
  }
  return (
    <>
      <div className="bar-group tools-group">
        {TOOLS_ITEMS.map((t) => (
          <BarButton key={t.dialog} icon={t.icon} label={t.label} text={t.text} className="slim bar-tool" onClick={() => go(t.dialog)} />
        ))}
      </div>
      <div className="menu-wrap tools-more" ref={ref}>
        <button className="bar-btn" aria-haspopup="menu" aria-expanded={open} aria-label="More: add, import, calculators, search" title="Add, import, calculators, search" onClick={() => setOpen(!open)}>
          <Icon name="addBox" size={18} />
        </button>
        {open && (
          <div className="menu" role="menu">
            {TOOLS_ITEMS.map((t) => (
              <button key={t.dialog} role="menuitem" className="menu-item" onClick={() => go(t.dialog)}>
                <Icon name={t.icon} size={16} /> {t.text}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
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
  const slides = useEditor((s) => slideCount(s.doc))
  const slidesShown = useEditor((s) => s.slidesShown || !!s.doc.slides)
  const animations = useEditor((s) => s.animations)
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
      <div className="bar-group slides-group">
        <BarButton
          icon="slides"
          label={slides > 1 ? `Slides: this figure has ${slides}` : slidesShown ? 'Hide the slides' : 'Show the slides, to make a presentation of several'}
          text={slides > 1 ? `${slides} slides` : 'Slides'}
          active={slidesShown}
          className="slim"
          // A figure with several slides always shows them: the button then leads to the open slide in the row.
          onClick={() => (slides < 2 ? set({ slidesShown: !slidesShown }) : document.querySelector<HTMLElement>('.slide-thumb.current')?.focus())}
        />
        {slidesShown && (
          <BarButton
            icon="animate"
            label={animations ? 'Close the animations' : 'Animations: how objects come in and go while the slides are presented'}
            text="Animate"
            active={animations}
            className="slim"
            onClick={() => set({ animations: !animations })}
          />
        )}
      </div>
      <ToolsGroup />
      <div className="spacer" />
      <BarButton icon="play" label="Present: show the slides full screen" text="Present" className="slim present-btn" onClick={present} />
      <BarButton icon="sparkles" label="Create a figure with AI" text="AI" className="accent" onClick={() => set({ dialog: 'ai' })} />
      <BarButton icon="export" label="Export the figure" text="Export" className="primary" onClick={() => set({ dialog: 'export' })} />
      <BarButton icon="sliders" label={showProps ? 'Hide the properties panel' : 'Show the properties panel'} active={showProps} onClick={onToggleProps} />
    </header>
  )
}
