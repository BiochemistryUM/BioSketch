// Presenting: the slides of the figure full screen, one after the other, on black. A slide is shown
// as the picture an export would give (panel frames and hidden objects are left out). The arrow
// keys, Space, a press on the slide or a swipe move on; Escape or the cross goes back to the editor.
// Objects that appear on a press come one by one before the next slide does. The view for the
// speaker shows the notes, the time and what comes next, and a second window can show the slides
// alone, to be put on the projector.

import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { nodesAtStep, slideDocs, slideIndex, slideSteps } from '../model/slides'
import type { FigDoc } from '../model/types'
import { toast, useEditor } from '../store'
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

/** Where a presentation stands: the slide, and how many of its presses have been made (objects that appear one by one). */
export interface Place {
  slide: number
  step: number
}

/**
 * Where a step leads. Forward: the next object of the slide that waits for a press, then the next
 * slide. Back: one object fewer, then the slide before with everything on it. `steps` says for
 * every slide on how many presses objects appear.
 */
export function presentMove(at: Place, move: 1 | -1 | 'first' | 'last', steps: number[]): Place {
  const last = steps.length - 1
  if (last < 0) return at
  if (move === 'first') return { slide: 0, step: 0 }
  if (move === 'last') return { slide: last, step: steps[last] }
  if (move === 1) {
    if (at.step < (steps[at.slide] ?? 0)) return { slide: at.slide, step: at.step + 1 }
    return at.slide < last ? { slide: at.slide + 1, step: 0 } : at
  }
  if (at.step > 0) return { slide: at.slide, step: at.step - 1 }
  return at.slide > 0 ? { slide: at.slide - 1, step: steps[at.slide - 1] } : at
}

/** A length of time as minutes and seconds, or hours, minutes and seconds. */
export function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const two = (n: number): string => String(n).padStart(2, '0')
  return s >= 3600 ? `${Math.floor(s / 3600)}:${two(Math.floor((s % 3600) / 60))}:${two(s % 60)}` : `${two(Math.floor(s / 60))}:${two(s % 60)}`
}

function leave(): void {
  useEditor.setState({ presenting: false })
  if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined)
}

/** The second window, for the audience: black, with room for one picture and a line that says what to do with it. */
function openAudience(): Window | null {
  const view = window.open('', 'biosketch-slides', 'popup,width=960,height=540')
  if (!view) return null
  view.document.title = 'Slides'
  view.document.body.style.cssText = 'margin:0;background:#000;overflow:hidden;cursor:default'
  view.document.body.innerHTML =
    '<img id="slide" alt="" draggable="false" style="position:fixed;inset:0;width:100%;height:100%;object-fit:contain">' +
    '<div id="hint" style="position:fixed;left:0;right:0;bottom:24px;text-align:center;font:16px system-ui,sans-serif;color:#fff">' +
    '<span style="background:rgba(24,28,34,.85);padding:8px 14px;border-radius:10px">Move this window to the projector, then press F for full screen. The arrow keys work here too.</span></div>'
  return view
}

function Show() {
  const doc = useEditor((s) => s.doc)
  const sketch = useEditor((s) => s.showSketch)
  const slides = useMemo(() => slideDocs(doc), [doc])
  const steps = useMemo(() => slides.map((s) => slideSteps(s.nodes)), [slides])
  const [place, setPlace] = useState<Place>(() => ({ slide: slideIndex(doc), step: 0 }))
  const [, setLoaded] = useState(0)
  const [controls, setControls] = useState(true)
  const [speaker, setSpeaker] = useState(false)
  const [audience, setAudience] = useState<Window | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const started = useRef(Date.now())
  const hide = useRef<ReturnType<typeof setTimeout>>(undefined)
  const down = useRef<{ x: number; y: number } | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const count = slides.length
  const at: Place = { slide: Math.min(place.slide, count - 1), step: Math.min(place.step, steps[Math.min(place.slide, count - 1)] ?? 0) }

  /** The slide as it is shown at a place: what appears on a later press is not drawn yet. */
  const frame = (p: Place): FigDoc => {
    const slide = slides[p.slide]
    const nodes = nodesAtStep(slide.nodes, p.step)
    return nodes === slide.nodes ? slide : { ...slide, nodes }
  }
  // The newest of everything the listeners below need, so that they are set up once.
  const live = useRef({ steps, audience })
  live.current = { steps, audience }
  const go = (move: 1 | -1 | 'first' | 'last') => setPlace((p) => presentMove(p, move, live.current.steps))
  const stop = () => {
    live.current.audience?.close()
    leave()
  }

  const wake = () => {
    setControls(true)
    clearTimeout(hide.current)
    hide.current = setTimeout(() => setControls(false), CONTROLS_MS)
  }

  const next = presentMove(at, 1, steps)
  const atEnd = next.slide === at.slide && next.step === at.step
  const before = presentMove(at, -1, steps)
  const atStart = before.slide === at.slide && before.step === at.step

  // What is on screen and what a step in either direction brings is drawn ahead, so that a step shows at once.
  useEffect(() => {
    let gone = false
    for (const p of [at, next, before]) {
      const slide = frame(p)
      if (thumbNow(slide, sketch)) continue
      void slideThumb(slide, sketch)
        .then(() => !gone && setLoaded((n) => n + 1))
        .catch(() => undefined)
    }
    return () => {
      gone = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at.slide, at.step, slides, sketch])

  const onKey = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return
    const what = presentKey(e.key)
    const letter = e.key.toLowerCase()
    if (what === null && letter !== 'n') return
    e.preventDefault()
    e.stopPropagation()
    if (letter === 'n') setSpeaker((v) => !v)
    else if (what === 'leave') stop()
    else if (what) go(what)
  }
  const keys = useRef(onKey)
  keys.current = onKey

  useEffect(() => {
    // Before the editor's own shortcuts, which must not act on the page under the slides.
    const key = (e: KeyboardEvent) => keys.current(e)
    // Leaving full screen (Escape does that in every browser) ends the presentation.
    const onFull = () => {
      if (!document.fullscreenElement) useEditor.setState({ presenting: false })
    }
    window.addEventListener('keydown', key, true)
    document.addEventListener('fullscreenchange', onFull)
    root.current?.focus()
    wake()
    const tick = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      window.removeEventListener('keydown', key, true)
      document.removeEventListener('fullscreenchange', onFull)
      clearTimeout(hide.current)
      clearInterval(tick)
      live.current.audience?.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const url = thumbNow(frame(at), sketch)
  const nextUrl = atEnd ? null : thumbNow(frame(next), sketch)

  // The second window shows what this one shows, and its keys and presses move the slides too.
  useEffect(() => {
    if (!audience) return
    const key = (e: KeyboardEvent) => {
      audience.document.getElementById('hint')?.remove()
      if (e.key.toLowerCase() === 'f') void audience.document.documentElement.requestFullscreen?.().catch(() => undefined)
      else if (e.key !== 'Escape') keys.current(e)
    }
    const press = () => {
      audience.document.getElementById('hint')?.remove()
      setPlace((p) => presentMove(p, 1, live.current.steps))
    }
    const closed = () => setAudience(null)
    audience.addEventListener('keydown', key)
    audience.addEventListener('click', press)
    audience.addEventListener('pagehide', closed)
    return () => {
      audience.removeEventListener('keydown', key)
      audience.removeEventListener('click', press)
      audience.removeEventListener('pagehide', closed)
    }
  }, [audience])
  useEffect(() => {
    const picture = audience?.document.getElementById('slide')
    if (picture && url) picture.setAttribute('src', url)
  }, [audience, url])

  const second = () => {
    if (audience) {
      audience.close()
      setAudience(null)
      return
    }
    const view = openAudience()
    if (!view) {
      toast('The browser did not open a second window. Allow pop-ups for this page and try again.')
      return
    }
    setAudience(view)
    setSpeaker(true)
  }

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const from = down.current
    down.current = null
    if (!from || (e.target as Element).closest('.present-controls, .speaker-side')) return
    go(presentPress(from.x, e.clientX, e.clientY - from.y, window.innerWidth))
  }

  const notes = slides[at.slide].notes
  const where = `Slide ${at.slide + 1} of ${count}`
  return (
    <div
      ref={root}
      className={`presenting${controls ? '' : ' idle'}${speaker ? ' speaker' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Presentation"
      tabIndex={-1}
      onPointerMove={wake}
      onPointerDown={(e) => {
        wake()
        down.current = (e.target as Element).closest('.present-controls, .speaker-side') ? null : { x: e.clientX, y: e.clientY }
      }}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (down.current = null)}
    >
      <div className="present-stage">{url && <img className="present-slide" src={url} alt={where} draggable={false} />}</div>
      {speaker && (
        <aside className="speaker-side" aria-label="For the speaker">
          <div className="speaker-next">
            <span>{atEnd ? 'This is the last slide' : next.slide === at.slide ? 'Next: the next object appears' : `Next: slide ${next.slide + 1}`}</span>
            {nextUrl && <img src={nextUrl} alt="" draggable={false} />}
          </div>
          <div className="speaker-time" role="timer">
            <b>{clock(now - started.current)}</b>
            <span>{new Date(now).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="speaker-notes">{notes ? notes : <i>No notes for this slide. Write them under “Page” in the editor, with nothing selected.</i>}</div>
        </aside>
      )}
      <div className="present-controls">
        <button aria-label="Back" title="Back" disabled={atStart} onClick={() => go(-1)}>
          <Icon name="chevronLeft" size={20} />
        </button>
        <span className="present-count" role="status" aria-live="polite">
          {at.slide + 1} / {count}
        </span>
        <button aria-label="Forward" title="Forward" disabled={atEnd} onClick={() => go(1)}>
          <Icon name="chevronRight" size={20} />
        </button>
        <button aria-label="Notes, time and the next slide, for the speaker" title="For the speaker: notes, time and what comes next (N)" aria-pressed={speaker} onClick={() => setSpeaker(!speaker)}>
          <Icon name="text" size={20} />
        </button>
        <button
          aria-label={audience ? 'Close the second window' : 'Show the slides in a second window, for the projector'}
          title={audience ? 'Close the second window' : 'Show the slides in a second window, for the projector'}
          aria-pressed={!!audience}
          onClick={second}
        >
          <Icon name="figures" size={20} />
        </button>
        <button aria-label="Stop presenting" title="Stop presenting (Escape)" onClick={stop}>
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
