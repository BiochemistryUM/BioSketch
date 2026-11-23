// Animations of objects while the slides are presented. An object can come in on a press of its own
// (`appear`, with `enterFx` saying how) and go on a later press (`exit`, with `exitFx`). Objects that
// share a press move together. On the page and in every export, everything is drawn as it is.
//
// The animations of a slide are shown as one list in order of play (`animationList`): every row is
// one object, or one group of objects that move together, coming in or going. The panel edits that
// list (`withOrder`), and the steps of every object are written back from it, numbered 1, 2, 3 …
// with no gaps. The presenter plays a step from pictures: the slide without what moves (`stepMotion`),
// and over it each moving object alone, animated by the browser.

import { getRect } from './nodes'
import { unionRects } from './geometry'
import type { Effect, FigDoc, FigNode, Rect, Side } from './types'

/** The most presses on which objects of one slide can come in or go. */
export const MAX_STEPS = 50

export const DEFAULT_MS = 500
export const MIN_MS = 100
export const MAX_MS = 5000

export const EFFECT_KINDS: Effect['kind'][] = ['fade', 'fly', 'wipe', 'zoom']
export const SIDES: Side[] = ['left', 'right', 'top', 'bottom']

/** True for effects that have a side. */
export const hasSide = (kind: Effect['kind']): boolean => kind === 'fly' || kind === 'wipe'

/** An effect as read from a file or an AI answer: every field checked, null when it is not one. */
export function readEffect(raw: unknown): Effect | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const kind = EFFECT_KINDS.find((k) => k === o.kind)
  if (!kind) return null
  const from = hasSide(kind) ? SIDES.find((s) => s === o.from) : undefined
  const ms = typeof o.ms === 'number' && Number.isFinite(o.ms) ? Math.round(Math.min(MAX_MS, Math.max(MIN_MS, o.ms))) : undefined
  return { kind, ...(from && from !== 'left' ? { from } : {}), ...(ms !== undefined && ms !== DEFAULT_MS ? { ms } : {}) }
}

/** How long an effect takes. */
export const effectMs = (fx: Effect): number => fx.ms ?? DEFAULT_MS

/** The side of an effect that has one. */
export const effectSide = (fx: Effect): Side => fx.from ?? 'left'

/** True when the object is drawn after `step` presses of its slide. */
export const shownAt = (n: FigNode, step: number): boolean => !n.hidden && (n.appear ?? 0) <= step && !(n.exit !== undefined && n.exit <= step)

/** On how many presses objects of this slide come in or go: 0 when everything is there from the start. */
export const slideSteps = (nodes: FigNode[]): number => nodes.reduce((most, n) => (n.hidden ? most : Math.max(most, n.appear ?? 0, n.exit ?? 0)), 0)

const atStep = new WeakMap<FigNode[], Map<number, FigNode[]>>()

/**
 * The objects of a slide as they are shown after `step` presses: what comes later and what has gone
 * is not drawn. It stays among the objects (hidden), so that an arrow attached to it keeps its place.
 * The same list comes back for the same slide and step.
 */
export function nodesAtStep(nodes: FigNode[], step: number): FigNode[] {
  if (nodes.every((n) => n.hidden || shownAt(n, step))) return nodes
  let known = atStep.get(nodes)
  if (!known) atStep.set(nodes, (known = new Map()))
  let shown = known.get(step)
  if (!shown) known.set(step, (shown = nodes.map((n) => (n.hidden || shownAt(n, step) ? n : { ...n, hidden: true }))))
  return shown
}

// ---------- the list of animations ----------

/** One row of the list: an object, or a group of objects that move together, coming in or going on a press. */
export interface Anim {
  /** Stable while the list is edited: the way and the group (or the object). */
  key: string
  way: 'in' | 'out'
  step: number
  ids: string[]
  fx: Effect | null
}

const sameFx = (a: Effect | null | undefined, b: Effect | null | undefined): boolean =>
  (!a && !b) || (!!a && !!b && a.kind === b.kind && effectSide(a) === effectSide(b) && effectMs(a) === effectMs(b))

/**
 * Every animation of a slide, in order of play: by press, and within a press in the order the rows
 * were put there (coming in before going, then from the back of the page to the front). Members of
 * a group that move the same way on the same press, with the same effect, are one row.
 */
export function animationList(nodes: FigNode[]): Anim[] {
  const rows: Anim[] = []
  const byKey = new Map<string, Anim>()
  const add = (n: FigNode, way: 'in' | 'out', step: number, fx: Effect | null) => {
    const key = `${way}:${n.groupId ?? n.id}`
    const have = byKey.get(key)
    if (have && have.step === step && sameFx(have.fx, fx)) {
      have.ids.push(n.id)
      return
    }
    const row: Anim = { key: have ? `${way}:${n.id}` : key, way, step, ids: [n.id], fx }
    if (!have) byKey.set(key, row)
    rows.push(row)
  }
  for (const n of nodes) {
    if (n.hidden) continue
    if (n.appear) add(n, 'in', n.appear, n.enterFx ?? null)
  }
  for (const n of nodes) {
    if (n.hidden) continue
    if (n.exit) add(n, 'out', n.exit, n.exitFx ?? null)
  }
  // A stable sort keeps "in before out, back to front" within a press.
  return rows.sort((a, b) => a.step - b.step)
}

/** True when the row starts a press of its own; false when it moves with the row before it. */
export const startsPress = (list: Anim[], i: number): boolean => i === 0 || list[i].step !== list[i - 1].step

/**
 * The objects with the steps of a list of rows written back. `presses[i]` says whether row i starts
 * a press of its own; the steps are then numbered 1, 2, 3 … from the top. Objects not in the list
 * lose their animations of that way. Null when the order would make an object go before it comes in.
 */
export function withOrder(nodes: FigNode[], list: Anim[], presses: boolean[]): FigNode[] | null {
  const steps = new Map<string, { in?: number; inFx?: Effect | null; out?: number; outFx?: Effect | null }>()
  let step = 0
  list.forEach((row, i) => {
    if (i === 0 || presses[i]) step = Math.min(MAX_STEPS, step + 1)
    for (const id of row.ids) {
      const s = steps.get(id) ?? {}
      if (row.way === 'in') Object.assign(s, { in: step, inFx: row.fx })
      else Object.assign(s, { out: step, outFx: row.fx })
      steps.set(id, s)
    }
  })
  for (const [, s] of steps) if (s.out !== undefined && s.out <= (s.in ?? 0)) return null
  return nodes.map((n) => {
    if (n.hidden) return n
    const s = steps.get(n.id)
    const had = !!(n.appear || n.enterFx || n.exit || n.exitFx)
    if (!s && !had) return n
    const { appear: _a, enterFx: _e, exit: _x, exitFx: _f, ...rest } = n
    const next = { ...rest } as FigNode
    if (s?.in) {
      next.appear = s.in
      if (s.inFx) next.enterFx = s.inFx
    }
    if (s?.out) {
      next.exit = s.out
      if (s.outFx) next.exitFx = s.outFx
    }
    return next
  })
}

/** Whether each row of a list starts a press of its own, as it is now. */
export const pressesOf = (list: Anim[]): boolean[] => list.map((_, i) => startsPress(list, i))

/** The list with row `i` moved one place up (-1) or down (1), keeping whether each row starts a press. Null when it cannot move. */
export function moveRow(nodes: FigNode[], i: number, by: -1 | 1): FigNode[] | null {
  const list = animationList(nodes)
  const j = i + by
  if (j < 0 || j >= list.length) return null
  const presses = pressesOf(list)
  const order = [...list]
  ;[order[i], order[j]] = [order[j], order[i]]
  ;[presses[i], presses[j]] = [presses[j], presses[i]]
  presses[0] = true
  return withOrder(nodes, order, presses)
}

/** Row `i` made to start a press of its own (true) or to move with the row before it (false). Null when that cannot be. */
export function setPress(nodes: FigNode[], i: number, own: boolean): FigNode[] | null {
  const list = animationList(nodes)
  if (i <= 0 || i >= list.length) return null
  const presses = pressesOf(list)
  presses[i] = own
  return withOrder(nodes, list, presses)
}

/** Row `i` taken out: its objects are there from the start (coming in) or stay (going). */
export function removeRow(nodes: FigNode[], i: number): FigNode[] {
  const list = animationList(nodes)
  if (i < 0 || i >= list.length) return nodes
  const presses = pressesOf(list)
  // The row after it starts a press when the one taken out did.
  if (presses[i] && i + 1 < presses.length) presses[i + 1] = true
  list.splice(i, 1)
  presses.splice(i, 1)
  return withOrder(nodes, list, presses) ?? nodes
}

/**
 * The objects `ids` made to come in (or go) with an effect: on a new press at the end of the list,
 * unless they already move that way, in which case only the effect changes. `fx` null = simply there
 * (or simply gone); `on` false takes the animation away.
 */
export function animate(nodes: FigNode[], ids: Iterable<string>, way: 'in' | 'out', on: boolean, fx: Effect | null = null): FigNode[] {
  const set = new Set(ids)
  const list = animationList(nodes)
  const mine = (row: Anim) => row.way === way && row.ids.some((id) => set.has(id))
  if (!on) {
    // Leave the others where they are: take the objects out of their rows.
    const kept = list.map((row) => (row.way === way ? { ...row, ids: row.ids.filter((id) => !set.has(id)) } : row))
    const presses = pressesOf(list)
    const rows: Anim[] = []
    const p: boolean[] = []
    kept.forEach((row, i) => {
      if (!row.ids.length) {
        if (presses[i] && i + 1 < presses.length) presses[i + 1] = true
        return
      }
      rows.push(row)
      p.push(presses[i])
    })
    if (p.length) p[0] = true
    return withOrder(nodes, rows, p) ?? nodes
  }
  if (list.some(mine)) {
    return nodes.map((n) => {
      if (!set.has(n.id) || n.hidden) return n
      const field = way === 'in' ? 'enterFx' : 'exitFx'
      const { [field]: _drop, ...rest } = n
      return (fx ? { ...rest, [field]: fx } : rest) as FigNode
    })
  }
  const step = Math.min(MAX_STEPS, slideSteps(nodes) + 1)
  return nodes.map((n) => {
    if (!set.has(n.id) || n.hidden) return n
    const field = way === 'in' ? 'enterFx' : 'exitFx'
    const { [field]: _drop, ...rest } = n
    const next = (fx ? { ...rest, [field]: fx } : rest) as FigNode
    if (way === 'in') next.appear = step
    else next.exit = Math.max(step, (n.appear ?? 0) + 1)
    return next
  })
}

// ---------- playing a step ----------

/** One object (or group) that moves on a step: the slide with only it drawn, its box, and how it moves. */
export interface Layer {
  nodes: FigNode[]
  box: Rect
  way: 'in' | 'out'
  fx: Effect
}

/** What a step is played from: the slide without what moves on it, and a layer for each moving thing. */
export interface Motion {
  base: FigNode[]
  layers: Layer[]
}

const motions = new WeakMap<FigNode[], Map<number, Motion>>()

/**
 * How step `step` (1 or more) of a slide is played. Objects that come in or go simply are left to the
 * picture before or after the step; only those with an effect are layers. The same motion comes back
 * for the same slide and step, so that its pictures are made once.
 */
export function stepMotion(slide: FigDoc, step: number): Motion {
  const nodes = slide.nodes
  let known = motions.get(nodes)
  if (!known) motions.set(nodes, (known = new Map()))
  const have = known.get(step)
  if (have) return have
  const moves = (n: FigNode): 'in' | 'out' | null =>
    n.hidden ? null : n.appear === step && n.enterFx ? 'in' : n.exit === step && n.exitFx && (n.appear ?? 0) < step ? 'out' : null
  const base = nodes.map((n) => (n.hidden || (shownAt(n, step) && !moves(n)) ? n : { ...n, hidden: true }))
  const layers: Layer[] = []
  for (const row of animationList(nodes)) {
    if (row.step !== step || !row.fx) continue
    const ids = new Set(row.ids.filter((id) => {
      const n = nodes.find((m) => m.id === id)
      return n && moves(n) === row.way
    }))
    if (!ids.size) continue
    const only = nodes.map((n) => (ids.has(n.id) || n.hidden ? n : { ...n, hidden: true }))
    const box = unionRects(nodes.filter((n) => ids.has(n.id)).map((n) => getRect(n, slide)))
    layers.push({ nodes: only, box, way: row.way, fx: row.fx })
  }
  const motion = { base, layers }
  known.set(step, motion)
  return motion
}

/** A keyframe of a layer: what the browser animates between, in shares of the slide (CSS). */
export interface Frame {
  opacity?: number
  transform?: string
  clipPath?: string
  transformOrigin?: string
}

const pct = (v: number): string => `${Math.round(v * 10000) / 100}%`

/**
 * The two keyframes of a layer, from the start of the step to its end. The layer is a picture of the
 * whole slide with only the moving object drawn, so places are shares of the slide's width and height.
 */
export function layerFrames(layer: Layer, width: number, height: number): [Frame, Frame] {
  const b = layer.box
  const left = b.x / width
  const top = b.y / height
  const right = (b.x + b.w) / width
  const bottom = (b.y + b.h) / height
  let hidden: Frame
  const shown: Frame = {}
  const side = effectSide(layer.fx)
  switch (layer.fx.kind) {
    case 'fade':
      hidden = { opacity: 0 }
      shown.opacity = 1
      break
    case 'zoom': {
      const origin = `${pct((left + right) / 2)} ${pct((top + bottom) / 2)}`
      hidden = { opacity: 0, transform: 'scale(0.1)', transformOrigin: origin }
      Object.assign(shown, { opacity: 1, transform: 'scale(1)', transformOrigin: origin })
      break
    }
    case 'fly': {
      // Far enough to start (or end) just outside the slide.
      const shift =
        side === 'left' ? `translate(${pct(-right)}, 0)` : side === 'right' ? `translate(${pct(1 - left)}, 0)` : side === 'top' ? `translate(0, ${pct(-bottom)})` : `translate(0, ${pct(1 - top)})`
      hidden = { transform: shift }
      shown.transform = 'translate(0, 0)'
      break
    }
    case 'wipe': {
      // Clipped to nothing at the side it comes from, then to the whole slide.
      const t = pct(Math.max(0, top))
      const l = pct(Math.max(0, left))
      const r = pct(Math.max(0, 1 - right))
      const btm = pct(Math.max(0, 1 - bottom))
      const at =
        side === 'left'
          ? `inset(${t} ${pct(Math.max(0, 1 - left))} ${btm} ${l})`
          : side === 'right'
            ? `inset(${t} ${r} ${btm} ${pct(Math.max(0, right))})`
            : side === 'top'
              ? `inset(${t} ${r} ${pct(Math.max(0, 1 - top))} ${l})`
              : `inset(${pct(Math.max(0, bottom))} ${r} ${btm} ${l})`
      hidden = { clipPath: at }
      shown.clipPath = `inset(${t} ${r} ${btm} ${l})`
      break
    }
  }
  return layer.way === 'in' ? [hidden, shown] : [shown, hidden]
}

// ---------- words ----------

const SIDE_WORD: Record<Side, string> = { left: 'left', right: 'right', top: 'top', bottom: 'bottom' }

/** The name of an effect in the panel. */
export function effectName(fx: Effect | null, way: 'in' | 'out'): string {
  if (!fx) return way === 'in' ? 'Appear' : 'Disappear'
  const side = SIDE_WORD[effectSide(fx)]
  switch (fx.kind) {
    case 'fade':
      return way === 'in' ? 'Fade in' : 'Fade out'
    case 'zoom':
      return way === 'in' ? 'Zoom in' : 'Zoom out'
    case 'fly':
      return way === 'in' ? `Fly in from the ${side}` : `Fly out to the ${side}`
    case 'wipe':
      return way === 'in' ? `Wipe in from the ${side}` : `Wipe out to the ${side}`
  }
}
