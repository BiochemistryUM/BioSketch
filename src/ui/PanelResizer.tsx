// The edge of the properties panel: drag it (mouse, finger or pen) to make the panel wider or
// narrower, press the arrow keys when it has the focus, or double-click it for the usual width.

import { useEffect, useRef, useState } from 'react'
import { PANEL_DEFAULT, PANEL_STEP, clampPanelWidth, loadPanelWidth, panelLimits, savePanelWidth } from './panelWidth'

/** Show the panel at this width. The width is a style of the page itself, so dragging does not redraw the panel's contents at every step. */
const show = (width: number): void => document.documentElement.style.setProperty('--props-width', `${width}px`)

export function PanelResizer() {
  // The width that was chosen; a narrow window may show the panel narrower than that.
  const [wanted, setWanted] = useState(loadPanelWidth)
  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth)
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ startX: number; startWidth: number; width: number } | null>(null)
  const shown = clampPanelWidth(wanted, windowWidth)
  const { min, max } = panelLimits(windowWidth)

  useEffect(() => show(shown), [shown])
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const choose = (width: number) => {
    const next = clampPanelWidth(width, window.innerWidth)
    setWanted(next)
    savePanelWidth(next)
  }
  const finish = () => {
    if (!drag.current) return
    choose(drag.current.width)
    drag.current = null
    setDragging(false)
  }

  return (
    <div
      className={`panel-resizer${dragging ? ' dragging' : ''}`}
      role="separator"
      aria-orientation="vertical"
      aria-label="Width of the properties panel"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={shown}
      tabIndex={0}
      title="Drag to make the panel wider or narrower. Double-click for the usual width."
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        drag.current = { startX: e.clientX, startWidth: shown, width: shown }
        setDragging(true)
      }}
      onPointerMove={(e) => {
        if (!drag.current) return
        // The panel is at the right: moving the edge to the left makes it wider.
        drag.current.width = clampPanelWidth(drag.current.startWidth + drag.current.startX - e.clientX, window.innerWidth)
        show(drag.current.width)
      }}
      onPointerUp={finish}
      onPointerCancel={finish}
      onLostPointerCapture={finish}
      onDoubleClick={() => choose(PANEL_DEFAULT)}
      onKeyDown={(e) => {
        const to = e.key === 'ArrowLeft' ? shown + PANEL_STEP : e.key === 'ArrowRight' ? shown - PANEL_STEP : e.key === 'Home' ? max : e.key === 'End' ? min : e.key === 'Enter' ? PANEL_DEFAULT : null
        if (to === null) return
        e.preventDefault()
        choose(to)
      }}
    >
      <span className="grip" aria-hidden="true" />
    </div>
  )
}
