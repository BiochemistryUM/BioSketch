// The animations of the open slide in one place (`src/model/animation.ts`): a preview that plays the
// slide, how the selected objects come in and go, and every animation of the slide in order of play.
// It takes the place of the properties panel while it is open. Every change is one step for Undo.

import { useEffect, useMemo, useState } from 'react'
import { present } from '../actions'
import { getIcon, MISSING_ICON } from '../icons/library'
import {
  DEFAULT_MS,
  EFFECT_KINDS,
  SIDES,
  animate,
  animationList,
  effectMs,
  effectName,
  effectSide,
  hasSide,
  moveRow,
  removeRow,
  setPress,
  slideSteps,
  startsPress,
  type Anim,
} from '../model/animation'
import { nodeLabel } from '../model/describe'
import { slideDocs, slideIndex } from '../model/slides'
import type { Effect, FigDoc, FigNode, Side } from '../model/types'
import { useEditor } from '../store'
import { AnimatedSlide, prepareStep } from './AnimatedSlide'
import { Icon } from './Icon'
import { Info } from './Info'

const KIND_WORD: Record<Effect['kind'], [string, string]> = {
  fade: ['Fade in', 'Fade out'],
  fly: ['Fly in', 'Fly out'],
  wipe: ['Wipe in', 'Wipe out'],
  zoom: ['Zoom in', 'Zoom out'],
}

const SIDE_WORD: Record<Side, [string, string]> = {
  left: ['From the left', 'To the left'],
  right: ['From the right', 'To the right'],
  top: ['From the top', 'To the top'],
  bottom: ['From the bottom', 'To the bottom'],
}

const DURATIONS = [250, 500, 750, 1000, 1500, 2000, 3000]

/** Change the objects of the open slide as one step for Undo. */
function commitNodes(fn: (nodes: FigNode[]) => FigNode[] | null): void {
  useEditor.getState().commit((doc) => {
    const nodes = fn(doc.nodes)
    return nodes && nodes !== doc.nodes ? { ...doc, nodes } : doc
  })
}

/** The name of a row: its object, or the first of its group and how many more. */
function rowName(doc: FigDoc, row: Anim): string {
  const first = doc.nodes.find((n) => n.id === row.ids[0])
  if (!first) return 'Object'
  const name = nodeLabel(first, first.type === 'icon' ? (getIcon(doc, first.iconId)?.name ?? MISSING_ICON) : undefined)
  return row.ids.length > 1 ? `${name} and ${row.ids.length - 1} more` : name
}

/** How the selected objects come in or go: the effect, its side and how long it takes. */
function WayEditor({ nodes, way }: { nodes: FigNode[]; way: 'in' | 'out' }) {
  const ids = nodes.map((n) => n.id)
  const first = nodes[0]
  const on = way === 'in' ? !!first.appear : !!first.exit
  const fx = (way === 'in' ? first.enterFx : first.exitFx) ?? null
  const mixed = nodes.some((n) => (way === 'in' ? !!n.appear : !!n.exit) !== on || JSON.stringify((way === 'in' ? n.enterFx : n.exitFx) ?? null) !== JSON.stringify(fx))
  const choice = mixed ? 'mixed' : !on ? 'none' : fx ? fx.kind : 'plain'
  const set = (next: Effect | null, keep = true) => commitNodes((list) => animate(list, ids, way, keep, next))
  const label = way === 'in' ? 'Comes in' : 'Goes'
  return (
    <div className="anim-way">
      <label className="field">
        <span className="field-label">{label}</span>
        <select
          aria-label={way === 'in' ? 'How the selected objects come in' : 'How the selected objects go'}
          value={choice}
          onChange={(e) => {
            const v = e.target.value
            if (v === 'mixed') return
            if (v === 'none') set(null, false)
            else if (v === 'plain') set(null)
            else set({ kind: v as Effect['kind'], ...(fx && hasSide(v as Effect['kind']) && fx.from ? { from: fx.from } : {}), ...(fx?.ms ? { ms: fx.ms } : {}) })
          }}
        >
          {mixed && <option value="mixed">Differs between the objects</option>}
          <option value="none">{way === 'in' ? 'With the slide' : 'Stays to the end'}</option>
          <option value="plain">{way === 'in' ? 'Appear on a press' : 'Disappear on a press'}</option>
          {EFFECT_KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_WORD[k][way === 'in' ? 0 : 1]}
            </option>
          ))}
        </select>
      </label>
      {!mixed && fx && (
        <div className="anim-way-more">
          {hasSide(fx.kind) && (
            <label className="field">
              <span className="field-label">{way === 'in' ? 'From' : 'To'}</span>
              <select aria-label={way === 'in' ? 'Side it comes from' : 'Side it goes to'} value={effectSide(fx)} onChange={(e) => set({ ...fx, from: e.target.value as Side })}>
                {SIDES.map((s) => (
                  <option key={s} value={s}>
                    {SIDE_WORD[s][way === 'in' ? 0 : 1]}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="field">
            <span className="field-label">Takes</span>
            <select
              aria-label="How long it takes"
              value={effectMs(fx)}
              onChange={(e) => {
                const ms = Number(e.target.value)
                const { ms: _drop, ...rest } = fx
                set(ms === DEFAULT_MS ? rest : { ...rest, ms })
              }}
            >
              {[...new Set([...DURATIONS, effectMs(fx)])]
                .sort((a, b) => a - b)
                .map((ms) => (
                  <option key={ms} value={ms}>
                    {`${ms / 1000} s`}
                  </option>
                ))}
            </select>
          </label>
        </div>
      )}
    </div>
  )
}

/** The preview: the open slide, played step by step from its start, or one step at a time. */
function Preview({ doc }: { doc: FigDoc }) {
  const sketch = useEditor((s) => s.showSketch)
  const slide = useMemo(() => slideDocs(doc)[slideIndex(doc)], [doc])
  const steps = slideSteps(slide.nodes)
  const [state, setState] = useState({ step: steps, play: false, auto: false, run: 0 })
  const step = Math.min(state.step, steps)
  // A change to the slide shows it complete again, unless the preview is playing.
  useEffect(() => {
    setState((s) => (s.auto ? s : { ...s, step: steps, play: false }))
  }, [slide.nodes, steps])
  const go = (to: number, auto: boolean) => setState((s) => ({ step: to, play: to === s.step + 1 && to > 0, auto, run: s.run + 1 }))
  const start = () => {
    void prepareStep(slide, 1, sketch)
    go(0, steps > 0)
  }
  // While playing, the next step follows a moment after the last has finished.
  const done = () => {
    if (!state.auto) return
    if (step >= steps) {
      setState((s) => ({ ...s, auto: false }))
      return
    }
    void prepareStep(slide, step + 1, sketch)
    setTimeout(() => setState((s) => (s.auto && s.step === step ? { step: step + 1, play: true, auto: true, run: s.run + 1 } : s)), step === 0 ? 400 : 600)
  }
  return (
    <div className="anim-preview">
      <div className="anim-screen">
        <AnimatedSlide slide={slide} step={step} play={state.play} sketch={sketch} alt={`The slide after ${step} of ${steps} presses`} onDone={done} run={state.run} />
      </div>
      <div className="anim-controls">
        {state.auto ? (
          <button className="btn small primary" onClick={() => setState((s) => ({ ...s, auto: false, step: steps, play: false }))}>
            Stop
          </button>
        ) : (
          <button className="btn small primary" onClick={start} disabled={!steps}>
            <Icon name="play" size={14} /> Play the slide
          </button>
        )}
        <button className="icon-only" aria-label="One press back" title="One press back" disabled={step <= 0 || state.auto} onClick={() => go(step - 1, false)}>
          <Icon name="chevronLeft" size={16} />
        </button>
        <span className="anim-count" role="status">
          {steps ? `Press ${step} of ${steps}` : 'No presses'}
        </span>
        <button
          className="icon-only"
          aria-label="One press forward"
          title="One press forward"
          disabled={step >= steps || state.auto}
          onClick={() => {
            void prepareStep(slide, step + 1, sketch)
            go(step + 1, false)
          }}
        >
          <Icon name="chevronRight" size={16} />
        </button>
      </div>
    </div>
  )
}

export function AnimationsPanel() {
  const doc = useEditor((s) => s.doc)
  const selection = useEditor((s) => s.selection)
  const set = useEditor((s) => s.set)
  const chosen = new Set(selection)
  const nodes = doc.nodes.filter((n) => chosen.has(n.id) && !n.hidden)
  const list = animationList(doc.nodes)

  return (
    <aside className="panel properties animations" aria-label="Animations">
      <div className="anim-head">
        <h2>Animations</h2>
        <Info about="Animations">
          <p>Objects can come in and go on presses while the slides are presented. Several objects can move on the same press.</p>
          <p>On the page, in the row of slides and in every exported file, everything is drawn as it stands.</p>
        </Info>
        <span className="spacer" />
        <button className="btn small" onClick={present} title="Show the slides full screen, from this one">
          Present
        </button>
        <button className="icon-only" aria-label="Close the animations" title="Close the animations" onClick={() => set({ animations: false })}>
          <Icon name="close" size={16} />
        </button>
      </div>

      <Preview doc={doc} />

      <section className="section" aria-label="The selected objects">
        <div className="section-head">
          <h2>{nodes.length > 1 ? `${nodes.length} selected objects` : nodes.length ? 'The selected object' : 'Add an animation'}</h2>
        </div>
        {nodes.length ? (
          <>
            <WayEditor nodes={nodes} way="in" />
            <WayEditor nodes={nodes} way="out" />
            <p className="hint">A new animation goes on a press of its own at the end of the list below.</p>
          </>
        ) : (
          <p className="hint">Select an object on the page, then choose how it comes in and how it goes.</p>
        )}
      </section>

      <section className="section" aria-label="Order of play">
        <div className="section-head">
          <h2>Order of play</h2>
          <Info about="Order of play">
            <p>Every row is one object, or one group, coming in or going. A number starts a new press; a row without one moves together with the row above it.</p>
            <p>Press a row to select its objects on the page.</p>
          </Info>
        </div>
        {!list.length && <p className="hint">No animations on this slide yet.</p>}
        <ol className="anim-list">
          {list.map((row, i) => {
            const own = startsPress(list, i)
            const selected = row.ids.every((id) => chosen.has(id))
            return (
              <li key={`${row.key}:${i}`} className={`anim-row${selected ? ' selected' : ''}${own ? '' : ' joined'}`}>
                <span className="anim-step" aria-label={own ? `Press ${row.step}` : 'With the row above'}>
                  {own ? row.step : '+'}
                </span>
                <button className="anim-name" onClick={() => set({ selection: row.ids })} title="Select on the page">
                  <span className={`anim-dot ${row.way}`} aria-hidden="true" />
                  <span className="anim-what">{rowName(doc, row)}</span>
                  <span className="anim-fx">{effectName(row.fx, row.way)}</span>
                </button>
                <span className="anim-tools">
                  <button
                    className="icon-only"
                    aria-label={own ? 'Move together with the row above' : 'Start a press of its own'}
                    title={own ? 'Move together with the row above' : 'Start a press of its own'}
                    aria-pressed={!own}
                    disabled={i === 0 || !setPress(doc.nodes, i, !own)}
                    onClick={() => commitNodes((n) => setPress(n, i, !own))}
                  >
                    <Icon name="group" size={15} />
                  </button>
                  <button className="icon-only" aria-label="Earlier" title="Earlier" disabled={!moveRow(doc.nodes, i, -1)} onClick={() => commitNodes((n) => moveRow(n, i, -1))}>
                    <span className="turn-up"><Icon name="chevronLeft" size={15} /></span>
                  </button>
                  <button className="icon-only" aria-label="Later" title="Later" disabled={!moveRow(doc.nodes, i, 1)} onClick={() => commitNodes((n) => moveRow(n, i, 1))}>
                    <span className="turn-down"><Icon name="chevronRight" size={15} /></span>
                  </button>
                  <button className="icon-only" aria-label="Remove this animation" title="Remove this animation" onClick={() => commitNodes((n) => removeRow(n, i))}>
                    <Icon name="trash" size={15} />
                  </button>
                </span>
              </li>
            )
          })}
        </ol>
      </section>
    </aside>
  )
}
