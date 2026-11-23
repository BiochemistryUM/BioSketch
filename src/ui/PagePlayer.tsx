// The animations of the open slide played on the page itself, over the canvas, where the page is
// drawn (asked for from the animations panel: "Play slide", "From selected", or after a change).
// It shows the slide before the first press asked for, then plays each press in turn, and goes away
// at the end, on a press anywhere on it, on Escape, or when the figure changes.

import { useEffect, useMemo, useRef, useState } from 'react'
import { slideDocs, slideIndex } from '../model/slides'
import { useEditor } from '../store'
import { AnimatedSlide, prepareStep } from './AnimatedSlide'

/** Play presses `from` to `to` of the open slide on the page. */
export function playOnPage(from: number, to: number): void {
  if (to < from || from < 1) return
  useEditor.setState((s) => ({ playing: { from, to, n: (s.playing?.n ?? 0) + 1 } }))
}

export const stopPlaying = (): void => useEditor.setState({ playing: null })

/** How long the slide rests between two presses while it is played. */
const REST_MS = 450

function Player({ from, to }: { from: number; to: number }) {
  const doc = useEditor((s) => s.doc)
  const view = useEditor((s) => s.view)
  const sketch = useEditor((s) => s.showSketch)
  const slide = useMemo(() => slideDocs(doc)[slideIndex(doc)], [doc])
  const [at, setAt] = useState({ step: from - 1, play: false })
  const started = useRef(doc.nodes)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // A change to the figure ends the playing: what is played would no longer be what is on the page.
  useEffect(() => {
    if (doc.nodes !== started.current) stopPlaying()
  }, [doc.nodes])

  useEffect(() => {
    let gone = false
    void prepareStep(slide, from, sketch).then(() => {
      if (!gone) timer.current = setTimeout(() => setAt({ step: from, play: true }), from > 1 ? REST_MS : 250)
    })
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopPropagation()
      stopPlaying()
    }
    window.addEventListener('keydown', key, true)
    return () => {
      gone = true
      clearTimeout(timer.current)
      window.removeEventListener('keydown', key, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const done = () => {
    if (!at.play) return
    clearTimeout(timer.current)
    if (at.step >= to) {
      timer.current = setTimeout(stopPlaying, REST_MS * 2)
      return
    }
    const next = at.step + 1
    void prepareStep(slide, next, sketch)
    timer.current = setTimeout(() => setAt({ step: next, play: true }), REST_MS)
  }

  return (
    <div className="page-player-clip">
      <div
        className="page-player"
        style={{ left: view.x, top: view.y, width: slide.width * view.zoom, height: slide.height * view.zoom }}
        onPointerDown={(e) => {
          e.stopPropagation()
          stopPlaying()
        }}
        title="Press to stop"
      >
        <AnimatedSlide slide={slide} step={at.step} play={at.play} sketch={sketch} alt={`The slide at press ${at.step}`} onDone={done} />
        <span className="page-player-note" role="status">
          {at.step < from ? 'Getting ready…' : `Press ${at.step}${to > from ? ` of ${to}` : ''}`} · press to stop
        </span>
      </div>
    </div>
  )
}

export function PagePlayer() {
  const playing = useEditor((s) => s.playing)
  return playing ? <Player key={playing.n} from={playing.from} to={playing.to} /> : null
}
