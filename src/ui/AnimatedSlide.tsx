// A slide shown as a picture, at one of its steps, playing the step's animations when it was reached
// by a press forward. Used by the presenter and by the preview in the animations panel.
//
// A step is played from pictures the export code makes (`slideThumb`): the slide without what moves,
// and over it one see-through picture of the whole slide for each object that moves, animated by the
// browser (`layerFrames`). When the step is over, the picture of the slide at that step takes their
// place, so what stays on screen is exactly what would be exported.

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { effectMs, layerFrames, nodesAtStep, stepMotion, type Motion } from '../model/animation'
import type { FigDoc } from '../model/types'
import { slideThumb, thumbNow } from './slideThumbs'

interface Picture {
  doc: FigDoc
  transparent: boolean
}

/** The slide as it is shown after `step` presses. */
export function frameOf(slide: FigDoc, step: number): FigDoc {
  const nodes = nodesAtStep(slide.nodes, step)
  return nodes === slide.nodes ? slide : { ...slide, nodes }
}

const picturesOf = (slide: FigDoc, motion: Motion): Picture[] => [
  { doc: { ...slide, nodes: motion.base }, transparent: false },
  ...motion.layers.map((l) => ({ doc: { ...slide, nodes: l.nodes }, transparent: true })),
]

/** Make every picture a step is played from ahead of time, so that it plays at once. */
export function prepareStep(slide: FigDoc, step: number, sketch: boolean): Promise<unknown> {
  const motion = step > 0 ? stepMotion(slide, step) : null
  const pictures = motion?.layers.length ? picturesOf(slide, motion) : []
  return Promise.all([frameOf(slide, step), frameOf(slide, Math.max(0, step - 1))].map((d) => slideThumb(d, sketch)).concat(pictures.map((p) => slideThumb(p.doc, sketch, p.transparent)))).catch(() => undefined)
}

const reduced = (): boolean => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

interface Props {
  slide: FigDoc
  step: number
  /** Play the animations of `step` (it was reached by one press forward). */
  play: boolean
  sketch: boolean
  alt: string
  /** Called when the animations of the step have played (or there were none). */
  onDone?: () => void
}

function Playing({ slide, step, play, sketch, alt, onDone }: Props) {
  const [, setLoaded] = useState(0)
  const motion = play && step > 0 && !reduced() ? stepMotion(slide, step) : null
  const moving = motion && motion.layers.length ? motion : null
  const [done, setDone] = useState(!moving)
  const layers = useRef<(HTMLImageElement | null)[]>([])
  const base = useRef<HTMLImageElement>(null)
  const final = frameOf(slide, step)
  const finalUrl = thumbNow(final, sketch)
  const pictures = moving && !done ? picturesOf(slide, moving) : []
  const urls = pictures.map((p) => thumbNow(p.doc, sketch, p.transparent))
  const ready = urls.every(Boolean)
  // Before its pictures are made, the step shows the slide as it was before it.
  const beforeUrl = moving && !done && !ready ? thumbNow(frameOf(slide, step - 1), sketch) : null

  useEffect(() => {
    let gone = false
    const wanted = [{ doc: final, transparent: false }, ...pictures, ...(moving && !done ? [{ doc: frameOf(slide, step - 1), transparent: false }] : [])]
    for (const p of wanted) {
      if (thumbNow(p.doc, sketch, p.transparent)) continue
      void slideThumb(p.doc, sketch, p.transparent)
        .then(() => !gone && setLoaded((n) => n + 1))
        .catch(() => !gone && setDone(true))
    }
    return () => {
      gone = true
    }
  })

  useLayoutEffect(() => {
    if (!moving || done || !ready) return
    const { width, height } = slide
    const running = moving.layers.map((layer, i) => {
      const el = layers.current[i]
      if (!el?.animate) return null
      const frames = layerFrames(layer, width, height)
      const origin = frames[0].transformOrigin
      if (origin) el.style.transformOrigin = origin
      const keyframes = frames.map(({ transformOrigin: _o, ...f }) => f as Keyframe)
      const a = el.animate(keyframes, { duration: effectMs(layer.fx), easing: layer.way === 'in' ? 'ease-out' : 'ease-in', fill: 'both' })
      // Held at its first frame until every picture can be drawn, so that nothing flashes.
      a.pause()
      return a
    })
    let gone = false
    const shown = [base.current, ...layers.current].filter((el): el is HTMLImageElement => !!el)
    void Promise.all(shown.map((el) => el.decode?.().catch(() => undefined)))
      .then(() => {
        if (gone) return
        for (const a of running) a?.play()
        return Promise.all(running.map((a) => a?.finished.catch(() => undefined)))
      })
      .then(() => !gone && setDone(true))
    return () => {
      gone = true
      for (const a of running) a?.cancel()
    }
  }, [moving, done, ready, slide])

  useEffect(() => {
    if (done) onDone?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done])

  if (moving && !done && ready) {
    return (
      <>
        <img ref={base} className="anim-pic" src={urls[0]!} alt={alt} draggable={false} />
        {urls.slice(1).map((url, i) => (
          <img key={i} ref={(el) => void (layers.current[i] = el)} className="anim-pic" src={url!} alt="" draggable={false} />
        ))}
      </>
    )
  }
  const url = done || !moving ? finalUrl : beforeUrl
  return url ? <img className="anim-pic" src={url} alt={alt} draggable={false} /> : null
}

/** A slide at a step, the size of its box with the shape of the page, playing the step's animations when `play` is set. */
export function AnimatedSlide(props: Props & { className?: string; run?: number }) {
  const { slide, className, run = 0 } = props
  const ratio = slide.width / Math.max(1, slide.height)
  return (
    <div className={`anim-box${className ? ` ${className}` : ''}`}>
      <div className="anim-frame" style={{ ['--ratio' as string]: ratio }}>
        <Playing key={`${props.step}:${props.play ? 1 : 0}:${run}`} {...props} />
      </div>
    </div>
  )
}
