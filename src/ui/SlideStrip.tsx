// The row of slides under the page: a small picture of every slide, the open one marked. A press
// opens a slide; the buttons beside the row add, copy, move and delete, and start the presentation.

import { memo, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { copySlide, deleteSlide, moveSlideTo, newSlide, openSlide, present } from '../actions'
import { dropPlace, slideIndex, slideNodes } from '../model/slides'
import type { FigDoc, FigNode } from '../model/types'
import { useEditor } from '../store'
import { Icon } from './Icon'
import { keepThumbs, slideThumb, thumbNow } from './slideThumbs'

/** How high the picture of a slide is in the row, and the least and most it is wide. */
const THUMB_H = 60
const thumbWidth = (doc: FigDoc): number => Math.round(Math.min(150, Math.max(40, (THUMB_H * doc.width) / doc.height)))

const SlidePicture = memo(function SlidePicture(props: { doc: FigDoc; nodes: FigNode[]; live: boolean; sketch: boolean }) {
  const { doc, nodes, live, sketch } = props
  // The picture shown last stays until the new one is made, so the row never flickers.
  const [last, setLast] = useState<string | null>(null)
  const ready = thumbNow(doc, nodes, sketch)
  useEffect(() => {
    if (thumbNow(doc, nodes, sketch)) return
    let gone = false
    // The open slide changes with every step of a drag: its picture follows when the hand rests.
    const timer = setTimeout(
      () =>
        void slideThumb(doc, nodes, sketch)
          .then((url) => !gone && setLast(url))
          .catch(() => undefined),
      live ? 350 : 0,
    )
    return () => {
      gone = true
      clearTimeout(timer)
    }
    // The page and the icons are part of the picture; the rest of the figure is not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.width, doc.height, doc.background, doc.customIcons, nodes, sketch, live])
  const url = ready ?? last
  return url ? <img src={url} alt="" draggable={false} /> : null
})

export function SlideStrip() {
  const doc = useEditor((s) => s.doc)
  const sketch = useEditor((s) => s.showSketch)
  const busy = useEditor((s) => !!s.gestureStart)
  const all = slideNodes(doc)
  const open = slideIndex(doc)
  const list = useRef<HTMLOListElement>(null)
  // A slide being dragged to another place: where it came from and the gap it would be dropped into.
  const [drag, setDrag] = useState<{ from: number; gap: number } | null>(null)
  const press = useRef<{ from: number; x: number; id: number; dragged: boolean } | null>(null)

  // Pictures of what is no longer a slide are let go of, a moment after the last change.
  useEffect(() => {
    if (busy) return
    const timer = setTimeout(() => keepThumbs(slideNodes(useEditor.getState().doc)), 2000)
    return () => clearTimeout(timer)
  }, [doc, busy])
  useEffect(() => () => keepThumbs([]), [])

  // The open slide is always in view in the row.
  useEffect(() => {
    list.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [open, all.length])

  const centres = (): number[] =>
    Array.from(list.current?.querySelectorAll<HTMLElement>('.slide-thumb') ?? []).map((el) => {
      const r = el.getBoundingClientRect()
      return r.left + r.width / 2
    })

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>, from: number) => {
    // A finger scrolls the row; slides are dragged with a mouse or a pen, and moved with the buttons otherwise.
    if (e.pointerType === 'touch' || e.button !== 0 || all.length < 2) return
    press.current = { from, x: e.clientX, id: e.pointerId, dragged: false }
  }
  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const p = press.current
    if (!p || p.id !== e.pointerId) return
    if (!p.dragged) {
      if (Math.abs(e.clientX - p.x) < 8) return
      p.dragged = true
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    setDrag({ from: p.from, gap: centres().filter((c) => c < e.clientX).length })
  }
  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    const p = press.current
    if (!p || p.id !== e.pointerId) return
    if (p.dragged && drag) moveSlideTo(drag.from, dropPlace(drag.from, drag.gap))
    setDrag(null)
    // The press that ends a drag is not a press on the slide: the click that follows it is passed over.
    if (!p.dragged) press.current = null
    else setTimeout(() => (press.current = null))
  }

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    const to = e.key === 'Home' ? 0 : e.key === 'End' ? all.length - 1 : index + step
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      e.stopPropagation()
      if (index === open) deleteSlide()
      return
    }
    if (!step && e.key !== 'Home' && e.key !== 'End') return
    e.preventDefault()
    e.stopPropagation()
    if (to < 0 || to >= all.length) return
    openSlide(to)
    list.current?.querySelectorAll<HTMLElement>('.slide-thumb')[to]?.focus()
  }

  const width = thumbWidth(doc)
  const several = all.length > 1
  return (
    <section className="slide-strip" aria-label="Slides">
      <div className="slide-tools">
        <button className="btn small primary" title="Show the slides full screen, starting with the open one" onClick={present}>
          <Icon name="play" size={14} /> Present
        </button>
      </div>
      <ol className="slide-list" ref={list}>
        {all.map((nodes, i) => (
          <li key={i} className={drag && drag.gap === i ? 'drop-before' : drag && drag.gap === all.length && i === all.length - 1 ? 'drop-after' : undefined}>
            <button
              className={`slide-thumb${i === open ? ' current' : ''}${drag?.from === i ? ' dragged' : ''}`}
              style={{ width, height: THUMB_H }}
              aria-label={`Slide ${i + 1} of ${all.length}${i === open ? ', open' : ''}`}
              aria-current={i === open ? 'true' : undefined}
              title={several ? `Slide ${i + 1}. Drag it to move it.` : 'Slide 1'}
              onClick={() => {
                if (!press.current?.dragged) openSlide(i)
              }}
              onPointerDown={(e) => onPointerDown(e, i)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              <SlidePicture doc={doc} nodes={nodes} live={i === open} sketch={sketch} />
              <span className="slide-number" aria-hidden="true">
                {i + 1}
              </span>
            </button>
          </li>
        ))}
        <li>
          <button className="slide-add" style={{ height: THUMB_H }} aria-label="Add a slide" title="Add an empty slide after the open one" onClick={newSlide}>
            <Icon name="plus" size={18} />
          </button>
        </li>
      </ol>
      <div className="slide-tools">
        <button className="icon-only" aria-label="Copy the open slide" title="Copy the open slide" onClick={copySlide}>
          <Icon name="copy" size={16} />
        </button>
        <button className="icon-only" aria-label="Move the open slide earlier" title="Move the open slide earlier" disabled={open === 0} onClick={() => moveSlideTo(open, open - 1)}>
          <Icon name="chevronLeft" size={16} />
        </button>
        <button
          className="icon-only"
          aria-label="Move the open slide later"
          title="Move the open slide later"
          disabled={open === all.length - 1}
          onClick={() => moveSlideTo(open, open + 1)}
        >
          <Icon name="chevronRight" size={16} />
        </button>
        <button className="icon-only danger" aria-label="Delete the open slide" title="Delete the open slide" disabled={!several} onClick={deleteSlide}>
          <Icon name="trash" size={16} />
        </button>
        {!several && (
          <button className="icon-only plain" aria-label="Hide the slides" title="Hide the slides" onClick={() => useEditor.setState({ slidesShown: false })}>
            <Icon name="close" size={16} />
          </button>
        )}
      </div>
    </section>
  )
}
