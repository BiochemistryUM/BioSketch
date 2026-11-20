// The row of slides under the page: a small picture of every slide, the open one marked. A press
// opens a slide; the buttons beside the row add, copy, move and delete, and start the presentation.

import { memo, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { copySlide, deleteSlide, moveSlideTo, newSlide, openSlide, present } from '../actions'
import { download, fileBase } from '../io/download'
import { parseDoc, serializeDoc } from '../io/files'
import { deleteSlideTemplate, listSlideTemplates, saveSlideTemplate, setDefaultSlideTemplate, type SlideTemplate } from '../io/slideTemplates'
import { SLIDE_LAYOUTS, templateOf, type SlideLayoutId } from '../model/layouts'
import { dropPlace, slideDocs, slideIndex, slideNodes } from '../model/slides'
import type { FigDoc } from '../model/types'
import { toast, useEditor } from '../store'
import { Icon } from './Icon'
import { keepThumbs, slideThumb, thumbNow } from './slideThumbs'

/** How high the picture of a slide is in the row, and the least and most it is wide. */
const THUMB_H = 60
const thumbWidth = (doc: FigDoc): number => Math.round(Math.min(150, Math.max(40, (THUMB_H * doc.width) / doc.height)))

/** The picture of one slide; `slide` is that slide as a figure of its own. */
const SlidePicture = memo(function SlidePicture(props: { slide: FigDoc; live: boolean; sketch: boolean }) {
  const { slide, live, sketch } = props
  // The picture shown last stays until the new one is made, so the row never flickers.
  const [last, setLast] = useState<string | null>(null)
  const ready = thumbNow(slide, sketch)
  useEffect(() => {
    if (thumbNow(slide, sketch)) return
    let gone = false
    // The open slide changes with every step of a drag: its picture follows when the hand rests.
    const timer = setTimeout(
      () =>
        void slideThumb(slide, sketch)
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
  }, [slide.width, slide.height, slide.background, slide.customIcons, slide.nodes, sketch, live])
  const url = ready ?? last
  return url ? <img src={url} alt="" draggable={false} /> : null
})

/**
 * What a new slide can begin with: nothing, a ready-made layout, or one of the scientist's own
 * templates. Templates are saved, made the start of every new slide, handed on as a file and
 * deleted from here.
 */
function SlideStarts({ templates, onTemplates, onClose }: { templates: SlideTemplate[]; onTemplates: (list: SlideTemplate[]) => void; onClose: () => void }) {
  const [name, setName] = useState('')
  const box = useRef<HTMLDivElement>(null)
  const file = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onDown = (e: globalThis.PointerEvent) => {
      const target = e.target as Element
      if (!box.current?.contains(target) && !target.closest('.slide-starts-button')) onClose()
    }
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const start = (from?: FigDoc | SlideLayoutId) => {
    newSlide(from)
    onClose()
  }
  const stored = (list: SlideTemplate[] | null, done: string) => {
    if (!list) {
      toast('The template could not be kept: this browser window does not store anything.')
      return
    }
    onTemplates(list)
    toast(done)
  }
  const save = async () => {
    const doc = useEditor.getState().doc
    if (!doc.nodes.length) {
      toast('This slide is empty. Put on it what every new slide should begin with, then save it as a template.')
      return
    }
    stored(await saveSlideTemplate(templateOf(doc, name || `${doc.name}, slide ${slideIndex(doc) + 1}`)), 'Template saved. It begins a new slide whenever you choose it here.')
    setName('')
  }
  const fromFile = async (picked: File | undefined) => {
    if (!picked) return
    try {
      const read = parseDoc(await picked.text())
      stored(await saveSlideTemplate(templateOf(read, read.name)), `“${read.name}” is now one of your templates.`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'This file could not be read.')
    }
  }

  return (
    <div className="slide-starts" ref={box} role="dialog" aria-label="Begin a new slide">
      <h3>A new slide with</h3>
      <button className="menu-item" onClick={() => start()}>
        <Icon name="plus" size={16} /> Nothing on it
      </button>
      {SLIDE_LAYOUTS.map((layout) => (
        <button key={layout.id} className="menu-item two-line" onClick={() => start(layout.id)}>
          <Icon name="template" size={16} />
          <span>
            {layout.name}
            <small>{layout.about}</small>
          </span>
        </button>
      ))}
      <h3>My templates</h3>
      {templates.length === 0 && <p className="hint">Design a slide once (a logo in the corner, a picture at the right, a text box at the top), then save it here. New slides can begin with it, all of them if you wish.</p>}
      <ul className="template-list">
        {templates.map((t) => (
          <li key={t.id}>
            <button className="menu-item" title="Begin a new slide with this template" onClick={() => start(t.doc)}>
              <Icon name="slides" size={16} />
              <span>
                {t.name}
                {t.isDefault && <small>Every new slide begins with it</small>}
              </span>
            </button>
            <button
              className={`icon-only${t.isDefault ? ' active' : ''}`}
              aria-pressed={t.isDefault}
              aria-label={t.isDefault ? `Stop beginning every new slide with ${t.name}` : `Begin every new slide with ${t.name}`}
              title={t.isDefault ? 'Every new slide begins with this template. Press to stop that.' : 'Begin every new slide with this template'}
              onClick={async () => stored(await setDefaultSlideTemplate(t.isDefault ? null : t.id), t.isDefault ? 'New slides are empty again.' : `Every new slide now begins with “${t.name}”.`)}
            >
              <Icon name="star" size={16} />
            </button>
            <button
              className="icon-only"
              aria-label={`Save ${t.name} as a file`}
              title="Save this template as a file, for a colleague or another computer"
              onClick={() => download(serializeDoc(t.doc), `${fileBase(t.doc)}.slide-template.biosketch.json`, 'application/json')}
            >
              <Icon name="save" size={16} />
            </button>
            <button
              className="icon-only danger"
              aria-label={`Delete the template ${t.name}`}
              title="Delete this template"
              onClick={async () => {
                if (window.confirm(`Delete the template “${t.name}”? Slides made with it stay as they are.`)) stored(await deleteSlideTemplate(t.id), 'Template deleted.')
              }}
            >
              <Icon name="trash" size={16} />
            </button>
          </li>
        ))}
      </ul>
      <div className="row">
        <input type="text" aria-label="Name of the new template" placeholder="Name of the template" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        <button className="btn small primary" onClick={() => void save()}>
          Save this slide
        </button>
      </div>
      <button className="btn small" title="The open slide of a figure file, or a template a colleague saved as a file" onClick={() => file.current?.click()}>
        <Icon name="open" size={14} /> Template from a file…
      </button>
      <input
        ref={file}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => {
          void fromFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </div>
  )
}

export function SlideStrip() {
  const doc = useEditor((s) => s.doc)
  const sketch = useEditor((s) => s.showSketch)
  // While something is dragged, and while the slides are presented (the pictures of objects that appear one by one are kept).
  const busy = useEditor((s) => !!s.gestureStart || s.presenting)
  const all = slideDocs(doc)
  const open = slideIndex(doc)
  const list = useRef<HTMLOListElement>(null)
  // A slide being dragged to another place: where it came from and the gap it would be dropped into.
  const [drag, setDrag] = useState<{ from: number; gap: number } | null>(null)
  const press = useRef<{ from: number; x: number; id: number; dragged: boolean } | null>(null)
  // The scientist's own templates, and whether the list of what a new slide can begin with is open.
  const [templates, setTemplates] = useState<SlideTemplate[]>([])
  const [starts, setStarts] = useState(false)
  const usual = templates.find((t) => t.isDefault)
  useEffect(() => {
    void listSlideTemplates().then(setTemplates)
  }, [])

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
        {all.map((slide, i) => (
          <li key={i} className={drag && drag.gap === i ? 'drop-before' : drag && drag.gap === all.length && i === all.length - 1 ? 'drop-after' : undefined}>
            <button
              className={`slide-thumb${i === open ? ' current' : ''}${drag?.from === i ? ' dragged' : ''}`}
              style={{ width, height: THUMB_H }}
              aria-label={`Slide ${i + 1} of ${all.length}${i === open ? ', open' : ''}`}
              aria-current={i === open ? 'true' : undefined}
              title={several ? `Slide ${i + 1}. Drag it to move it; the arrow keys open the next and the previous slide.` : 'Slide 1'}
              onClick={() => {
                if (press.current?.dragged) return
                // A press on a slide leaves nothing selected on the page, also on the open slide:
                // the arrow keys then step through the slides instead of moving an object.
                if (i === open) useEditor.setState({ selection: [], editingTextId: null })
                else openSlide(i)
              }}
              onPointerDown={(e) => onPointerDown(e, i)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              <SlidePicture slide={slide} live={i === open} sketch={sketch} />
              <span className="slide-number" aria-hidden="true">
                {i + 1}
              </span>
            </button>
          </li>
        ))}
        <li>
          <button
            className="slide-add"
            style={{ height: THUMB_H }}
            aria-label="Add a slide"
            title={usual ? `Add a slide that begins with your template “${usual.name}”` : 'Add an empty slide after the open one'}
            onClick={() => newSlide(usual?.doc)}
          >
            <Icon name="plus" size={18} />
          </button>
        </li>
      </ol>
      <div className="slide-tools">
        <button
          className={`icon-only slide-starts-button${starts ? ' active' : ''}`}
          aria-label="Layouts and your own templates for a new slide"
          title="Layouts and your own templates for a new slide"
          aria-expanded={starts}
          onClick={() => setStarts(!starts)}
        >
          <Icon name="template" size={16} />
        </button>
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
      {starts && <SlideStarts templates={templates} onTemplates={setTemplates} onClose={() => setStarts(false)} />}
    </section>
  )
}
