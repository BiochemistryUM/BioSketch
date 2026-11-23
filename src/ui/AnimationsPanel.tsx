// The animations of the open slide in one place (`src/model/animation.ts`): buttons that play the
// slide on the page, a gallery of effects for the selected objects (coming in or going), the
// settings of the chosen effect, and every animation of the slide in order of play. In a wide window
// it stands beside the properties panel, otherwise in its place. Every change is one step for Undo.

import { useState, type ReactNode } from 'react'
import { getIcon, MISSING_ICON } from '../icons/library'
import {
  DEFAULT_MS,
  EFFECT_KINDS,
  animate,
  animationList,
  effectMs,
  effectName,
  effectSide,
  moveRow,
  removeRow,
  setPress,
  sidesOf,
  slideSteps,
  startsPress,
  type Anim,
} from '../model/animation'
import { nodeLabel } from '../model/describe'
import type { Effect, FigDoc, FigNode, Side } from '../model/types'
import { useEditor } from '../store'
import { Icon } from './Icon'
import { Info } from './Info'
import { playOnPage, stopPlaying } from './PagePlayer'

type Way = 'in' | 'out'
/** A tile of the gallery: one of the effects, or simply there / simply gone. */
type Tile = Effect['kind'] | 'plain'

const TILES: Tile[] = ['plain', ...EFFECT_KINDS]

const TILE_WORD: Record<Tile, [string, string]> = {
  plain: ['Appear', 'Disappear'],
  fade: ['Fade', 'Fade'],
  fly: ['Fly in', 'Fly out'],
  float: ['Float in', 'Float out'],
  wipe: ['Wipe', 'Wipe'],
  split: ['Split', 'Split'],
  circle: ['Circle', 'Circle'],
  zoom: ['Zoom', 'Zoom'],
}

const SIDE_WORD: Record<Side, [string, string]> = {
  left: ['From the left', 'To the left'],
  right: ['From the right', 'To the right'],
  top: ['From the top', 'To the top'],
  bottom: ['From the bottom', 'To the bottom'],
}
const SPLIT_WORD: Partial<Record<Side, string>> = { left: 'Sideways', top: 'Up and down' }

const DURATIONS = [250, 500, 750, 1000, 1500, 2000, 3000]

// ---------- the preference to play a change at once ----------

const AUTOPLAY_KEY = 'biosketch-animation-autoplay'

function storedAutoplay(): boolean {
  try {
    return localStorage.getItem(AUTOPLAY_KEY) !== 'off'
  } catch {
    return true
  }
}

function storeAutoplay(on: boolean): void {
  try {
    localStorage.setItem(AUTOPLAY_KEY, on ? 'on' : 'off')
  } catch {
    /* kept for this visit only */
  }
}

// ---------- changes ----------

/** Change the objects of the open slide as one step for Undo; returns the new objects (or null when nothing changed). */
function commitNodes(fn: (nodes: FigNode[]) => FigNode[] | null): FigNode[] | null {
  let made: FigNode[] | null = null
  useEditor.getState().commit((doc) => {
    const nodes = fn(doc.nodes)
    if (!nodes || nodes === doc.nodes) return doc
    made = nodes
    return { ...doc, nodes }
  })
  return made
}

/** The press on which the objects move that way, after a change. */
const stepOf = (nodes: FigNode[], ids: string[], way: Way): number => {
  const n = nodes.find((m) => m.id === ids[0])
  return (way === 'in' ? n?.appear : n?.exit) ?? 0
}

/** The name of a row: its object, or the first of its group and how many more. */
function rowName(doc: FigDoc, row: Anim): string {
  const first = doc.nodes.find((n) => n.id === row.ids[0])
  if (!first) return 'Object'
  const name = nodeLabel(first, first.type === 'icon' ? (getIcon(doc, first.iconId)?.name ?? MISSING_ICON) : undefined)
  return row.ids.length > 1 ? `${name} and ${row.ids.length - 1} more` : name
}

// ---------- the small pictures of the tiles ----------

/** A small picture of an effect; it moves while the pointer is on its tile (`.fx-tile:hover`). */
function TilePicture({ tile }: { tile: Tile }) {
  const mark = <rect className="fx-mark" x="8" y="5" width="12" height="12" rx="2" />
  let rest: ReactNode = null
  switch (tile) {
    case 'plain':
      rest = <path className="fx-rays" d="M5 3l2 2M23 3l-2 2M5 19l2-2M23 19l-2-2" />
      break
    case 'fade':
      return (
        <svg viewBox="0 0 28 22" aria-hidden="true">
          <rect className="fx-mark" x="2" y="6" width="7" height="10" rx="1.5" opacity="0.3" />
          <rect className="fx-mark" x="10.5" y="6" width="7" height="10" rx="1.5" opacity="0.6" />
          <rect className="fx-mark" x="19" y="6" width="7" height="10" rx="1.5" />
        </svg>
      )
    case 'fly':
      rest = <path className="fx-rays" d="M11 19v2.5M14 19v2.5M17 19v2.5" />
      break
    case 'float':
      rest = <path className="fx-rays" d="M14 21.5v-3M12 20l2-1.8 2 1.8" />
      break
    case 'wipe':
      return (
        <svg viewBox="0 0 28 22" aria-hidden="true">
          <rect className="fx-frame" x="4" y="4" width="20" height="14" rx="2" />
          <rect className="fx-mark" x="4" y="4" width="11" height="14" rx="2" />
          <path className="fx-rays" d="M17 11h5M20 8.5l2.5 2.5-2.5 2.5" />
        </svg>
      )
    case 'split':
      return (
        <svg viewBox="0 0 28 22" aria-hidden="true">
          <rect className="fx-mark" x="4" y="4" width="8" height="14" rx="1.5" />
          <rect className="fx-mark" x="16" y="4" width="8" height="14" rx="1.5" />
        </svg>
      )
    case 'circle':
      return (
        <svg viewBox="0 0 28 22" aria-hidden="true">
          <rect className="fx-frame" x="4" y="2" width="20" height="18" rx="2" />
          <circle className="fx-mark" cx="14" cy="11" r="5.5" />
        </svg>
      )
    case 'zoom':
      return (
        <svg viewBox="0 0 28 22" aria-hidden="true">
          <rect className="fx-frame dashed" x="4" y="2" width="20" height="18" rx="2" />
          <rect className="fx-mark" x="10" y="7" width="8" height="8" rx="1.5" />
        </svg>
      )
  }
  return (
    <svg viewBox="0 0 28 22" aria-hidden="true">
      {mark}
      {rest}
    </svg>
  )
}

// ---------- the parts of the panel ----------

/** Play the slide, play from the selected object, stop; and whether a change is played at once. */
function PlayBar({ autoplay, onAutoplay }: { autoplay: boolean; onAutoplay: (on: boolean) => void }) {
  const steps = useEditor((s) => slideSteps(s.doc.nodes))
  const playing = useEditor((s) => !!s.playing)
  const firstSelected = useEditor((s) => {
    const chosen = new Set(s.selection)
    const own = s.doc.nodes.filter((n) => chosen.has(n.id)).flatMap((n) => [n.appear ?? 0, n.exit ?? 0]).filter((v) => v > 0)
    return own.length ? Math.min(...own) : 0
  })
  return (
    <div className="anim-play">
      <div className="anim-play-row">
        <button className="btn primary anim-play-main" disabled={!steps || playing} onClick={() => playOnPage(1, steps)} title="Play every press of this slide on the page">
          <Icon name="play" size={14} /> Play slide
        </button>
        <button className="btn" disabled={!firstSelected || playing} onClick={() => playOnPage(firstSelected, steps)} title="Play from the first press of the selected object">
          <Icon name="chevronRight" size={14} /> From selected
        </button>
        <button className="icon-only" aria-label="Stop playing" title="Stop playing (Escape)" disabled={!playing} onClick={stopPlaying}>
          <span className="anim-stop" />
        </button>
      </div>
      <label className="check anim-auto">
        <input type="checkbox" checked={autoplay} onChange={(e) => onAutoplay(e.target.checked)} />
        Play when I change something
      </label>
    </div>
  )
}

/** The gallery of effects for the selected objects, coming in or going, and the settings of the chosen one. */
function AddAnimation({ nodes, autoplay }: { nodes: FigNode[]; autoplay: boolean }) {
  const [way, setWay] = useState<Way>('in')
  const doc = useEditor((s) => s.doc)
  const ids = nodes.map((n) => n.id)
  const first = nodes[0] as FigNode | undefined
  const on = (n: FigNode) => (way === 'in' ? !!n.appear : !!n.exit)
  const fxOf = (n: FigNode) => (way === 'in' ? n.enterFx : n.exitFx) ?? null
  const same = !!first && nodes.every((n) => on(n) === on(first) && JSON.stringify(fxOf(n)) === JSON.stringify(fxOf(first)))
  const current: Tile | null = first && same && on(first) ? (fxOf(first)?.kind ?? 'plain') : null
  const fx = first && same ? fxOf(first) : null
  const list = animationList(doc.nodes)
  const row = first && same && on(first) ? list.findIndex((r) => r.way === way && r.ids.includes(first.id)) : -1

  /** Make the change, then play the press it is on when that is wanted. */
  const change = (fn: (list: FigNode[]) => FigNode[] | null) => {
    const made = commitNodes(fn)
    if (!made || !autoplay) return
    const step = stepOf(made, ids, way)
    if (step) playOnPage(step, step)
  }
  const choose = (tile: Tile) => {
    if (!nodes.length) return
    const keep = fx && tile !== 'plain' && sidesOf(tile).includes(effectSide(fx)) && fx.from ? { from: fx.from } : {}
    const next: Effect | null = tile === 'plain' ? null : { kind: tile, ...keep, ...(fx?.ms ? { ms: fx.ms } : {}) }
    change((list) => animate(list, ids, way, true, next))
  }
  const set = (next: Effect) => change((list) => animate(list, ids, way, true, next))

  return (
    <section className="section anim-add" aria-label="Add an animation">
      <div className="section-head">
        <h2>{current ? 'Animation' : 'Add animation'}</h2>
      </div>
      <p className="hint anim-target">
        {!first ? 'Select something on the page first.' : nodes.length > 1 ? `${nodes.length} selected objects` : rowName(doc, { key: '', way, step: 0, ids, fx: null })}
      </p>
      <div className="anim-ways" role="tablist" aria-label="Coming in or going">
        {(['in', 'out'] as Way[]).map((w) => (
          <button key={w} role="tab" aria-selected={way === w} className={way === w ? 'on' : ''} onClick={() => setWay(w)}>
            <span className={`anim-dot ${w}`} aria-hidden="true" /> {w === 'in' ? 'Entrance' : 'Exit'}
          </button>
        ))}
      </div>
      <div className={`fx-tiles ${way}`} role="group" aria-label={way === 'in' ? 'How it comes in' : 'How it goes'}>
        {TILES.map((tile) => (
          <button
            key={tile}
            className={`fx-tile fx-${tile}${current === tile ? ' on' : ''}`}
            aria-pressed={current === tile}
            disabled={!first}
            onClick={() => choose(tile)}
            title={effectName(tile === 'plain' ? null : { kind: tile }, way)}
          >
            <TilePicture tile={tile} />
            <span>{TILE_WORD[tile][way === 'in' ? 0 : 1]}</span>
          </button>
        ))}
      </div>
      {first && !same && <p className="hint">The selected objects move differently; a tile gives them all the same animation.</p>}
      {current && (
        <div className="anim-settings">
          {fx && sidesOf(fx.kind).length > 0 && (
            <label className="field">
              <span className="field-label">{fx.kind === 'split' ? 'Opens' : way === 'in' ? 'From' : 'To'}</span>
              <select aria-label="Direction" value={effectSide(fx)} onChange={(e) => set({ ...fx, from: e.target.value as Side })}>
                {sidesOf(fx.kind).map((s) => (
                  <option key={s} value={s}>
                    {fx.kind === 'split' ? SPLIT_WORD[s] : SIDE_WORD[s][way === 'in' ? 0 : 1]}
                  </option>
                ))}
              </select>
            </label>
          )}
          {fx && (
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
          )}
          {row >= 0 && (
            <label className="field">
              <span className="field-label">Starts</span>
              <select
                aria-label="When it starts"
                value={startsPress(list, row) ? 'press' : 'with'}
                onChange={(e) => change((n) => setPress(n, row, e.target.value === 'press'))}
              >
                <option value="press">On a press</option>
                <option value="with" disabled={row === 0 || !setPress(doc.nodes, row, false)}>
                  With the previous
                </option>
              </select>
            </label>
          )}
          <button className="btn small danger anim-remove" onClick={() => commitNodes((list) => animate(list, ids, way, false))}>
            <Icon name="trash" size={14} /> {way === 'in' ? 'No entrance' : 'No exit'}
          </button>
        </div>
      )}
    </section>
  )
}

/** Every animation of the slide in order of play. */
function Pane({ chosen }: { chosen: Set<string> }) {
  const doc = useEditor((s) => s.doc)
  const set = useEditor((s) => s.set)
  const list = animationList(doc.nodes)
  return (
    <section className="section" aria-label="Animation pane">
      <div className="section-head">
        <h2>Animation pane</h2>
        <Info about="Animation pane">
          <p>Every row is one object, or one group, coming in or going. A number starts a new press; a row marked “+” moves together with the row above it.</p>
          <p>Press a row to select its objects on the page.</p>
        </Info>
      </div>
      {!list.length ? (
        <div className="anim-empty">
          <b>No animations on this slide yet</b>
          <span>Select something on the page, then pick an effect above. Animations play when the slides are presented; the page and exported files always show everything.</span>
        </div>
      ) : (
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
                  <span className="anim-fx">
                    {effectName(row.fx, row.way)}
                    {row.fx && effectMs(row.fx) !== DEFAULT_MS ? `, ${effectMs(row.fx) / 1000} s` : ''}
                  </span>
                </button>
                <span className="anim-tools">
                  <button className="icon-only" aria-label={`Play press ${row.step}`} title="Play this press on the page" onClick={() => playOnPage(row.step, row.step)}>
                    <Icon name="play" size={13} />
                  </button>
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
                    <span className="turn-up">
                      <Icon name="chevronLeft" size={15} />
                    </span>
                  </button>
                  <button className="icon-only" aria-label="Later" title="Later" disabled={!moveRow(doc.nodes, i, 1)} onClick={() => commitNodes((n) => moveRow(n, i, 1))}>
                    <span className="turn-down">
                      <Icon name="chevronRight" size={15} />
                    </span>
                  </button>
                  <button className="icon-only" aria-label="Remove this animation" title="Remove this animation" onClick={() => commitNodes((n) => removeRow(n, i))}>
                    <Icon name="trash" size={15} />
                  </button>
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

export function AnimationsPanel() {
  const doc = useEditor((s) => s.doc)
  const selection = useEditor((s) => s.selection)
  const set = useEditor((s) => s.set)
  const [autoplay, setAutoplay] = useState(storedAutoplay)
  const chosen = new Set(selection)
  const nodes = doc.nodes.filter((n) => chosen.has(n.id) && !n.hidden)

  return (
    <aside className="panel anim-panel" aria-label="Animations">
      <div className="anim-head">
        <h2>Animations</h2>
        <Info about="Animations">
          <p>Objects can come in and go on presses while the slides are presented. Several objects can move on the same press.</p>
          <p>On the page, in the row of slides and in every exported file, everything is drawn as it stands.</p>
        </Info>
        <span className="spacer" />
        <button
          className="icon-only"
          aria-label="Close the animations"
          title="Close the animations"
          onClick={() => {
            stopPlaying()
            set({ animations: false })
          }}
        >
          <Icon name="close" size={16} />
        </button>
      </div>
      <PlayBar
        autoplay={autoplay}
        onAutoplay={(on) => {
          setAutoplay(on)
          storeAutoplay(on)
        }}
      />
      <AddAnimation nodes={nodes} autoplay={autoplay} />
      <Pane chosen={chosen} />
    </aside>
  )
}
