// Presenting: the slides of the figure full screen, one after the other, on black. A slide is shown
// as the picture an export would give (panel frames and hidden objects are left out). The arrow
// keys, Space, a press on the slide or a swipe move on; Escape or the cross goes back to the editor.

import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { slideIndex, slideNodes } from '../model/slides'
import { useEditor } from '../store'
import { Icon } from './Icon'
import { slideThumb, thumbNow } from './slideThumbs'

/** How long the buttons stay after the pointer last moved. */
const CONTROLS_MS = 2600

/**
 * What a key does while the slides are shown: a step forward (1) or back (-1), the first or the
 * last slide, or leaving. Null for a key that means nothing here.
 */
export function presentKey(key: string): 1 | -1 | 'first' | 'last' | 'leave' | null {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
    case 'PageDown':
    case ' ':
    case 'Spacebar':
    case 'Enter':
      return 1
    case 'ArrowLeft':
    case 'ArrowUp':
    case 'PageUp':
    case 'Backspace':
      return -1
    case 'Home':
      return 'first'
    case 'End':
      return 'last'
    case 'Escape':
      return 'leave'
    default:
      return null
  }
}

/** What a press on the slide means: on the left third a step back, elsewhere a step forward; a swipe goes the way of the finger. */
export function presentPress(downX: number, upX: number, dy: number, width: number): 1 | -1 {
  const dx = upX - downX
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 1 : -1
  return upX < width / 3 ? -1 : 1
}

function leave(): void {
  useEditor.setState({ presenting: false })
  if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined)
}

function Show() {
  const doc = useEditor((s) => s.doc)
  const sketch = useEditor((s) => s.showSketch)
  const all = slideNodes(doc)
  const [at, setAt] = useState(() => slideIndex(doc))
  const [, setLoaded] = useState(0)
  const [controls, setControls] = useState(true)
  const hide = useRef<ReturnType<typeof setTimeout>>(undefined)
  const down = useRef<{ x: number; y: number } | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const count = all.length
  const here = Math.min(at, count - 1)

  const go = (step: 1 | -1 | 'first' | 'last') => setAt((now) => (step === 'first' ? 0 : step === 'last' ? count - 1 : Math.min(count - 1, Math.max(0, now + step))))

  const wake = () => {
    setControls(true)
    clearTimeout(hide.current)
    hide.current = setTimeout(() => setControls(false), CONTROLS_MS)
  }

  // The slide on screen and its neighbours are drawn ahead, so that a step shows at once.
  useEffect(() => {
    let gone = false
    for (const i of [here, here + 1, here - 1]) {
      if (i < 0 || i >= count || thumbNow(doc, all[i], sketch)) continue
      void slideThumb(doc, all[i], sketch)
        .then(() => !gone && setLoaded((n) => n + 1))
        .catch(() => undefined)
    }
    return () => {
      gone = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [here, doc, sketch])

  useEffect(() => {
    // Before the editor's own shortcuts, which must not act on the page under the slides.
    const onKey = (e: KeyboardEvent) => {
      const what = e.metaKey || e.ctrlKey || e.altKey ? null : presentKey(e.key)
      if (what === null) return
      e.preventDefault()
      e.stopPropagation()
      if (what === 'leave') leave()
      else go(what)
    }
    // Leaving full screen (Escape does that in every browser) ends the presentation.
    const onFull = () => {
      if (!document.fullscreenElement) useEditor.setState({ presenting: false })
    }
    window.addEventListener('keydown', onKey, true)
    document.addEventListener('fullscreenchange', onFull)
    root.current?.focus()
    wake()
    return () => {
      window.removeEventListener('keydown', onKey, true)
      document.removeEventListener('fullscreenchange', onFull)
      clearTimeout(hide.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count])

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const from = down.current
    down.current = null
    if (!from || (e.target as Element).closest('.present-controls')) return
    go(presentPress(from.x, e.clientX, e.clientY - from.y, window.innerWidth))
  }

  const url = thumbNow(doc, all[here], sketch)
  return (
    <div
      ref={root}
      className={`presenting${controls ? '' : ' idle'}`}
      role="dialog"
      aria-modal="true"
      aria-label="Presentation"
      tabIndex={-1}
      onPointerMove={wake}
      onPointerDown={(e) => {
        wake()
        down.current = (e.target as Element).closest('.present-controls') ? null : { x: e.clientX, y: e.clientY }
      }}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (down.current = null)}
    >
      {url && <img className="present-slide" src={url} alt={`Slide ${here + 1} of ${count}`} draggable={false} />}
      <div className="present-controls">
        <button aria-label="Previous slide" title="Previous slide" disabled={here === 0} onClick={() => go(-1)}>
          <Icon name="chevronLeft" size={20} />
        </button>
        <span className="present-count" role="status" aria-live="polite">
          {here + 1} / {count}
        </span>
        <button aria-label="Next slide" title="Next slide" disabled={here === count - 1} onClick={() => go(1)}>
          <Icon name="chevronRight" size={20} />
        </button>
        <button aria-label="Stop presenting" title="Stop presenting (Escape)" onClick={leave}>
          <Icon name="close" size={20} />
        </button>
      </div>
    </div>
  )
}

/** The slides full screen while they are being presented; nothing otherwise. */
export function Presenter() {
  const presenting = useEditor((s) => s.presenting)
  return presenting ? <Show /> : null
}
