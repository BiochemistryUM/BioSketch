// The drawing surface: turns mouse, touch and pen input into edits.
//
// Input rules:
//  - Mouse and pen act with the active tool.
//  - Two fingers always pan and pinch-zoom.
//  - Once a pen has been used, a single finger pans in the drawing tools (palm rejection),
//    and touches are ignored entirely while the pen is down.

import { useEffect, useRef, useState } from 'react'
import { MAX_ZOOM, MIN_ZOOM, addIcon, addText, fitView, zoomBy } from '../actions'
import { addNodes, expandGroups, labelPartner, nodesInRect, removeNodes, selectionRect, uid, updateNodes } from '../model/doc'
import { clamp, dist, mid, normalizeRect, pointInRect, polylineLength, rectCenter, round, simplify, snapTo, snapToGuides } from '../model/geometry'
import { bendThrough, canAttach, dragHandle, findNode, getBox, getRect, resizeNode, rotateNode, rotateNodeAbout, scaleNode, translateNode } from '../model/nodes'
import type { Box, ConnectorNode, Endpoint, FigDoc, FigNode, MembraneNode, Point, Rect, ShapeNode, StrokeNode } from '../model/types'
import { isPickable } from '../model/types'
import { DocNodes, strokePath } from '../render/DocNodes'
import { membraneShape } from '../model/membrane'
import { useEditor, type View } from '../store'
import { drawnPaths, movePointInDoc } from '../icons/reshape'
import { placeImageFile } from '../io/images'
import { Overlay, type Guides } from './Overlay'
import { TextEditor } from './TextEditor'
import { input } from './input'

export const GRID = 10
export const ICON_MIME = 'application/x-biosketch-icon'

interface GestureBase {
  pointerId: number
  pointerType: string
}

type Gesture = GestureBase &
  (
    | { type: 'pan'; startScreen: Point; startView: View }
    | { type: 'move'; start: Point; ids: string[]; moved: boolean; hitId: string; wasSelected: boolean; shift: boolean; rect: Rect | null; targets: Rect[] | null }
    | { type: 'multi-resize'; ids: string[]; anchor: Point; startDist: number }
    | { type: 'multi-rotate'; ids: string[]; center: Point; startAngle: number }
    | { type: 'label'; id: string; start: Point; offset: Point }
    | { type: 'point'; iconId: string; path: number; index: number; startClient: Point; inverse: [number, number, number, number] }
    | { type: 'marquee'; start: Point; base: string[] }
    | { type: 'resize'; id: string; hx: number; hy: number; node: FigNode; box: Box }
    | { type: 'rotate'; id: string; node: FigNode; center: Point; startAngle: number }
    | { type: 'endpoint'; id: string; which: 'from' | 'to' }
    | { type: 'bend'; id: string }
    | { type: 'shape'; id: string; start: Point; last: Point }
    | { type: 'connector'; id: string; start: Point; from: Endpoint; last: Point }
    | { type: 'membrane'; points: Point[] }
    | { type: 'stroke'; points: [number, number, number][] }
    | { type: 'erase'; removed: Set<string> }
    | { type: 'text'; start: Point }
  )

type Draft = { kind: 'membrane'; points: Point[] } | { kind: 'stroke'; points: [number, number, number][] } | null

const NO_GUIDES: Guides = { x: null, y: null }

/** What a moving selection can line up with: every other visible object, and the page itself. */
function guideTargets(doc: FigDoc, moving: string[], showSketch: boolean): Rect[] {
  const skip = new Set(moving)
  const rects = doc.nodes
    .filter((n) => !skip.has(n.id) && !n.hidden && n.type !== 'connector' && (showSketch || n.type !== 'stroke'))
    .map((n) => getRect(n, doc))
  return [...rects, { x: 0, y: 0, w: doc.width, h: doc.height }]
}

const angleDeg = (from: Point, to: Point): number => (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI

/** The topmost node a connector end dropped at `p` should attach to, if any. */
function attachTarget(doc: FigDoc, p: Point, exclude: (string | undefined)[]): FigNode | null {
  for (let i = doc.nodes.length - 1; i >= 0; i--) {
    const n = doc.nodes[i]
    if (!canAttach(n) || exclude.includes(n.id)) continue
    const r = getRect(n, doc)
    // Large background elements (a whole cell, a frame) are not attachment targets.
    if (r.w > doc.width * 0.45 && r.h > doc.height * 0.45) continue
    if (pointInRect(p, r, 2)) return n
  }
  return null
}

function shapeFromDrag(id: string, a: Point, b: Point, square: boolean, kind: ShapeNode['shape']): ShapeNode {
  let r = normalizeRect(a, b)
  if (square) {
    const size = Math.max(r.w, r.h)
    r = { x: b.x < a.x ? a.x - size : a.x, y: b.y < a.y ? a.y - size : a.y, w: size, h: size }
  }
  return {
    id,
    type: 'shape',
    shape: kind,
    x: round(r.x, 1),
    y: round(r.y, 1),
    w: round(r.w, 1),
    h: round(r.h, 1),
    rotation: 0,
    fill: '#eaf2fb',
    stroke: '#2f6fb5',
    strokeWidth: 2,
  }
}

export function Canvas() {
  const doc = useEditor((s) => s.doc)
  const view = useEditor((s) => s.view)
  const tool = useEditor((s) => s.tool)
  const showSketch = useEditor((s) => s.showSketch)
  const editingTextId = useEditor((s) => s.editingTextId)
  const fitRequest = useEditor((s) => s.fitRequest)
  const penColor = useEditor((s) => s.penColor)
  const penSize = useEditor((s) => s.penSize)
  const membraneThickness = useEditor((s) => s.membraneThickness)

  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const gesture = useRef<Gesture | null>(null)
  const touches = useRef(new Map<number, Point>())
  const pinch = useRef<{ d0: number; mid0: Point; view0: View } | null>(null)
  const penSeen = useRef(false)
  const lastTap = useRef({ id: '', time: 0 })
  const sized = useRef(false)

  const [marquee, setMarquee] = useState<Rect | null>(null)
  const [attachHint, setAttachHint] = useState<Rect | null>(null)
  const [draft, setDraft] = useState<Draft>(null)
  const [panning, setPanning] = useState(false)
  const [guides, setGuides] = useState<Guides>(NO_GUIDES)

  // ----- size, fit and wheel -----

  useEffect(() => {
    const el = wrapRef.current!
    const measure = () => {
      const r = el.getBoundingClientRect()
      if (r.width < 10 || r.height < 10) return
      useEditor.setState({ canvasSize: { w: r.width, h: r.height } })
      if (!sized.current) {
        sized.current = true
        fitView()
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (sized.current) fitView()
  }, [fitRequest])

  useEffect(() => {
    const el = svgRef.current!
    const localOf = (e: { clientX: number; clientY: number }): Point => {
      const r = el.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const unit = e.deltaMode === 1 ? 16 : 1
      if (e.ctrlKey || e.metaKey) {
        zoomBy(Math.exp(-e.deltaY * unit * 0.01), localOf(e))
      } else {
        const v = useEditor.getState().view
        useEditor.setState({ view: { ...v, x: v.x - e.deltaX * unit, y: v.y - e.deltaY * unit } })
      }
    }
    // Safari on macOS reports trackpad pinches as gesture events instead of ctrl+wheel.
    let gestureZoom = 1
    const onGestureStart = (e: Event) => {
      e.preventDefault()
      gestureZoom = useEditor.getState().view.zoom
    }
    const onGestureChange = (e: Event) => {
      e.preventDefault()
      if (touches.current.size) return
      const ge = e as Event & { scale: number; clientX: number; clientY: number }
      const current = useEditor.getState().view.zoom
      zoomBy((gestureZoom * ge.scale) / current, localOf(ge))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('gesturestart', onGestureStart)
    el.addEventListener('gesturechange', onGestureChange)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('gesturestart', onGestureStart)
      el.removeEventListener('gesturechange', onGestureChange)
    }
  }, [])

  // A finger lifted outside the canvas may never report back to it. Forget such touches,
  // otherwise the next single touch would be mistaken for a pinch.
  useEffect(() => {
    const forget = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return
      touches.current.delete(e.pointerId)
      if (touches.current.size < 2) pinch.current = null
    }
    window.addEventListener('pointerup', forget, true)
    window.addEventListener('pointercancel', forget, true)
    return () => {
      window.removeEventListener('pointerup', forget, true)
      window.removeEventListener('pointercancel', forget, true)
    }
  }, [])

  // ----- coordinate helpers -----

  const toLocal = (e: { clientX: number; clientY: number }): Point => {
    const r = svgRef.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const toWorld = (local: Point): Point => {
    const v = useEditor.getState().view
    return { x: (local.x - v.x) / v.zoom, y: (local.y - v.y) / v.zoom }
  }
  const snapPoint = (p: Point): Point => (useEditor.getState().gridSnap ? { x: snapTo(p.x, GRID), y: snapTo(p.y, GRID) } : p)

  const clearTransientUi = () => {
    setMarquee(null)
    setAttachHint(null)
    setDraft(null)
    setPanning(false)
    setGuides(NO_GUIDES)
  }

  const abortGesture = () => {
    if (!gesture.current) return
    gesture.current = null
    useEditor.getState().cancelGesture()
    clearTransientUi()
  }

  /** Where a connector end should go when dragged to `world`. */
  const endpointAt = (docNow: FigDoc, world: Point, free: boolean, exclude: (string | undefined)[]): Endpoint => {
    const target = free ? null : attachTarget(docNow, world, exclude)
    setAttachHint(target ? getRect(target, docNow) : null)
    const p = snapPoint(world)
    return target ? { x: round(p.x, 1), y: round(p.y, 1), nodeId: target.id } : { x: round(p.x, 1), y: round(p.y, 1) }
  }

  const connectorFromDrag = (g: Extract<Gesture, { type: 'connector' }>, to: Endpoint): ConnectorNode => {
    const s = useEditor.getState()
    return {
      id: g.id,
      type: 'connector',
      from: g.from,
      to,
      kind: s.connectorKind,
      stroke: '#2b2f36',
      strokeWidth: s.connectorWidth,
      ...(s.connectorLine !== 'solid' ? { dashed: true as const, ...(s.connectorLine !== 'dashed' ? { dashStyle: s.connectorLine } : {}) } : {}),
      ...(s.connectorFade ? { fade: s.connectorFade } : {}),
      ...(s.connectorRoute === 'elbow' ? { route: 'elbow' as const } : {}),
    }
  }

  // ----- pointer input -----

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    // Touching the canvas finishes any text being edited (this can change the document, so do it first).
    if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) document.activeElement.blur()
    // The page takes keyboard focus, so that Tab and the arrow keys act on its objects next.
    svgRef.current?.focus({ preventScroll: true })
    const s = useEditor.getState()
    if (e.pointerType === 'pen') penSeen.current = true
    const local = toLocal(e)

    if (e.pointerType === 'touch') {
      if (gesture.current?.pointerType === 'pen') return // palm resting while the pen draws
      touches.current.set(e.pointerId, local)
      if (touches.current.size === 2) {
        abortGesture()
        const [a, b] = [...touches.current.values()]
        pinch.current = { d0: Math.max(1, dist(a, b)), mid0: mid(a, b), view0: s.view }
        return
      }
      if (touches.current.size > 2) return
    }
    if (gesture.current) return

    try {
      svgRef.current!.setPointerCapture(e.pointerId)
    } catch {
      /* the pointer may already be gone */
    }
    const world = toWorld(local)
    const base: GestureBase = { pointerId: e.pointerId, pointerType: e.pointerType }
    const fingerPans = e.pointerType === 'touch' && penSeen.current && s.tool !== 'select'

    if (e.button === 1 || s.tool === 'pan' || input.space || fingerPans) {
      gesture.current = { ...base, type: 'pan', startScreen: local, startView: s.view }
      setPanning(true)
      return
    }
    if (e.button !== 0) return
    const target = e.target as Element

    switch (s.tool) {
      case 'select': {
        const handle = target.closest('[data-handle]')?.getAttribute('data-handle')
        const single = s.selection.length === 1 ? findNode(s.doc, s.selection[0]) : undefined
        if (handle) {
          const many = selectionRect(s.doc, s.selection)
          if ((handle.startsWith('m:') || handle === 'mrot') && many) {
            // Several objects are resized or turned together, about their shared outline.
            const center = rectCenter(many)
            if (handle === 'mrot') {
              gesture.current = { ...base, type: 'multi-rotate', ids: s.selection, center, startAngle: angleDeg(center, world) }
            } else {
              const [, hx, hy] = handle.split(':')
              const anchor = { x: center.x - (Number(hx) * many.w) / 2, y: center.y - (Number(hy) * many.h) / 2 }
              gesture.current = { ...base, type: 'multi-resize', ids: s.selection, anchor, startDist: Math.max(1, dist(anchor, world)) }
            }
          } else if (!single) {
            return
          } else if (handle.startsWith('pt:') && s.reshape?.nodeId === single.id) {
            // One point of the icon's outline. The drag is measured on screen and converted to the
            // path's own coordinates, whatever the icon's size, turn, flip or inner groups.
            const [, k, i] = handle.split(':')
            const drawn = svgRef.current?.querySelector(`[data-id="${single.id}"]`)
            const path = drawn ? (drawnPaths(drawn)[Number(k)] as SVGGraphicsElement | undefined) : undefined
            const m = path?.getScreenCTM()?.inverse()
            if (m) gesture.current = { ...base, type: 'point', iconId: s.reshape.iconId, path: Number(k), index: Number(i), startClient: { x: e.clientX, y: e.clientY }, inverse: [m.a, m.b, m.c, m.d] }
          } else if (handle === 'lab' && single.type === 'connector') {
            gesture.current = { ...base, type: 'label', id: single.id, start: world, offset: single.labelOffset ?? { x: 0, y: 0 } }
          } else if (handle.startsWith('r:')) {
            const [, hx, hy] = handle.split(':')
            gesture.current = { ...base, type: 'resize', id: single.id, hx: Number(hx), hy: Number(hy), node: single, box: getBox(single, s.doc) }
          } else if (handle === 'rot') {
            const center = rectCenter(getBox(single, s.doc))
            gesture.current = { ...base, type: 'rotate', id: single.id, node: single, center, startAngle: angleDeg(center, world) }
          } else if (handle === 'ep:from' || handle === 'ep:to') {
            gesture.current = { ...base, type: 'endpoint', id: single.id, which: handle === 'ep:from' ? 'from' : 'to' }
          } else if (handle === 'bend') {
            gesture.current = { ...base, type: 'bend', id: single.id }
          }
          if (gesture.current) s.beginGesture()
          return
        }
        const hitId = target.closest('[data-id]')?.getAttribute('data-id')
        if (hitId && findNode(s.doc, hitId)) {
          const ids = expandGroups(s.doc, [hitId])
          const wasSelected = s.selection.includes(hitId)
          let selection = s.selection
          if (e.shiftKey) {
            selection = wasSelected ? selection.filter((id) => !ids.includes(id)) : [...selection, ...ids]
            s.set({ selection })
            if (wasSelected) return
          } else if (!wasSelected) {
            selection = ids
            s.set({ selection })
          }
          const rect = selectionRect(s.doc, selection)
          gesture.current = {
            ...base,
            type: 'move',
            start: world,
            ids: selection,
            moved: false,
            hitId,
            wasSelected,
            shift: e.shiftKey,
            rect,
            targets: null,
          }
        } else {
          if (!e.shiftKey) s.set({ selection: [] })
          gesture.current = { ...base, type: 'marquee', start: world, base: e.shiftKey ? s.selection : [] }
        }
        return
      }
      case 'text':
        gesture.current = { ...base, type: 'text', start: world }
        return
      case 'shape': {
        const start = snapPoint(world)
        gesture.current = { ...base, type: 'shape', id: uid(), start, last: start }
        s.beginGesture()
        return
      }
      case 'connector': {
        const from = endpointAt(s.doc, world, e.altKey, [])
        gesture.current = { ...base, type: 'connector', id: uid(), start: world, from, last: world }
        s.beginGesture()
        return
      }
      case 'membrane':
        gesture.current = { ...base, type: 'membrane', points: [world] }
        setDraft({ kind: 'membrane', points: [world] })
        return
      case 'pen': {
        const p: [number, number, number] = [world.x, world.y, e.pointerType === 'pen' ? e.pressure || 0.5 : 0.5]
        gesture.current = { ...base, type: 'stroke', points: [p] }
        setDraft({ kind: 'stroke', points: [p] })
        return
      }
      case 'eraser': {
        const g: Gesture = { ...base, type: 'erase', removed: new Set() }
        gesture.current = g
        eraseAt(world, g.removed)
        return
      }
    }
  }

  const eraseAt = (world: Point, removed: Set<string>) => {
    const s = useEditor.getState()
    const reach = 9 / s.view.zoom
    let found = false
    for (const n of s.doc.nodes) {
      if (n.type !== 'stroke' || !isPickable(n) || removed.has(n.id)) continue
      if (n.points.some(([x, y]) => Math.hypot(x - world.x, y - world.y) <= reach + n.size / 2)) {
        removed.add(n.id)
        found = true
      }
    }
    if (found) {
      s.beginGesture()
      s.transient((start) => removeNodes(start, removed))
    }
  }

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const local = toLocal(e)
    if (e.pointerType === 'touch' && touches.current.has(e.pointerId)) {
      touches.current.set(e.pointerId, local)
      const p = pinch.current
      if (p && touches.current.size >= 2) {
        const [a, b] = [...touches.current.values()]
        const zoom = clamp((p.view0.zoom * dist(a, b)) / p.d0, MIN_ZOOM, MAX_ZOOM)
        const m = mid(a, b)
        const wx = (p.mid0.x - p.view0.x) / p.view0.zoom
        const wy = (p.mid0.y - p.view0.y) / p.view0.zoom
        useEditor.setState({ view: { zoom, x: m.x - wx * zoom, y: m.y - wy * zoom } })
        return
      }
    }
    const g = gesture.current
    if (!g || g.pointerId !== e.pointerId) return
    const s = useEditor.getState()
    const world = toWorld(local)

    switch (g.type) {
      case 'pan':
        s.set({ view: { ...g.startView, x: g.startView.x + local.x - g.startScreen.x, y: g.startView.y + local.y - g.startScreen.y } })
        return
      case 'move': {
        let dx = world.x - g.start.x
        let dy = world.y - g.start.y
        if (!g.moved) {
          if (Math.hypot(dx, dy) * s.view.zoom < 4) return
          g.moved = true
          s.beginGesture()
        }
        const constrained = e.shiftKey && !g.shift
        const freeX = !constrained || Math.abs(dx) > Math.abs(dy)
        const freeY = !constrained || !freeX
        if (!freeX) dx = 0
        if (!freeY) dy = 0
        if (s.gridSnap && g.rect) {
          if (freeX) dx = snapTo(g.rect.x + dx, GRID) - g.rect.x
          if (freeY) dy = snapTo(g.rect.y + dy, GRID) - g.rect.y
        } else if (g.rect && !e.altKey) {
          // Smart guides: line up with the edges and centres of other objects and of the page.
          const start = s.gestureStart ?? s.doc
          g.targets ??= guideTargets(start, g.ids, s.showSketch)
          const snap = snapToGuides({ ...g.rect, x: g.rect.x + dx, y: g.rect.y + dy }, g.targets, 6 / s.view.zoom)
          if (freeX) dx += snap.dx
          if (freeY) dy += snap.dy
          setGuides({ x: freeX ? snap.x : null, y: freeY ? snap.y : null })
        } else {
          setGuides(NO_GUIDES)
        }
        s.transient((start) => updateNodes(start, g.ids, (n) => translateNode(n, dx, dy)))
        return
      }
      case 'marquee': {
        const rect = normalizeRect(g.start, world)
        setMarquee(rect)
        const hit = nodesInRect(s.doc, rect).filter((id) => {
          const n = findNode(s.doc, id)
          return !!n && isPickable(n) && (s.showSketch || n.type !== 'stroke')
        })
        s.set({ selection: [...new Set([...g.base, ...expandGroups(s.doc, hit)])] })
        return
      }
      case 'multi-resize': {
        const factor = clamp(dist(g.anchor, world) / g.startDist, 0.05, 20)
        s.transient((start) => updateNodes(start, g.ids, (n) => scaleNode(n, factor, g.anchor, start)))
        return
      }
      case 'multi-rotate': {
        let delta = angleDeg(g.center, world) - g.startAngle
        if (e.shiftKey) delta = Math.round(delta / 15) * 15
        s.transient((start) => updateNodes(start, g.ids, (n) => rotateNodeAbout(n, delta, g.center, start)))
        return
      }
      case 'point': {
        const sx = e.clientX - g.startClient.x
        const sy = e.clientY - g.startClient.y
        const [a, b, c, d] = g.inverse
        s.transient((start) => movePointInDoc(start, g.iconId, g.path, g.index, a * sx + c * sy, b * sx + d * sy))
        return
      }
      case 'label': {
        const labelOffset = { x: round(g.offset.x + world.x - g.start.x, 1), y: round(g.offset.y + world.y - g.start.y, 1) }
        s.transient((start) => updateNodes(start, [g.id], (n) => (n.type === 'connector' ? { ...n, labelOffset } : n)))
        return
      }
      case 'resize': {
        const lockByDefault = g.node.type === 'icon' || g.node.type === 'text' || g.node.type === 'image'
        const keep = lockByDefault ? !e.shiftKey : e.shiftKey
        const box = dragHandle(g.box, g.hx, g.hy, snapPoint(world), keep)
        s.transient((start) => updateNodes(start, [g.id], () => resizeNode(g.node, g.box, box)))
        return
      }
      case 'rotate': {
        let delta = angleDeg(g.center, world) - g.startAngle
        if (e.shiftKey) {
          const base = 'rotation' in g.node ? g.node.rotation : 0
          delta = Math.round((base + delta) / 15) * 15 - base
        }
        s.transient((start) => updateNodes(start, [g.id], () => rotateNode(g.node, delta, start)))
        return
      }
      case 'endpoint': {
        const start = s.gestureStart ?? s.doc
        const c = findNode(start, g.id)
        if (!c || c.type !== 'connector') return
        const other = g.which === 'from' ? c.to.nodeId : c.from.nodeId
        const ep = endpointAt(start, world, e.altKey, [g.id, other])
        s.transient((d) => updateNodes(d, [g.id], (n) => (n.type === 'connector' ? { ...n, [g.which]: ep } : n)))
        return
      }
      case 'bend':
        s.transient((start) =>
          updateNodes(start, [g.id], (n) => {
            if (n.type !== 'connector') return n
            const bend = bendThrough(n, start, world)
            const { bend: _old, ...rest } = n
            return bend ? { ...rest, bend } : rest
          }),
        )
        return
      case 'shape': {
        g.last = snapPoint(world)
        const node = shapeFromDrag(g.id, g.start, g.last, e.shiftKey, s.shapeKind)
        s.transient((start) => addNodes(start, [node]))
        return
      }
      case 'connector': {
        g.last = world
        const start = s.gestureStart ?? s.doc
        const node = connectorFromDrag(g, endpointAt(start, world, e.altKey, [g.from.nodeId]))
        s.transient((d) => addNodes(d, [node]))
        return
      }
      case 'membrane': {
        if (e.shiftKey) g.points = [g.points[0], world]
        else if (dist(g.points[g.points.length - 1], world) * s.view.zoom > 2) g.points.push(world)
        setDraft({ kind: 'membrane', points: g.points.slice() })
        return
      }
      case 'stroke': {
        const events = e.nativeEvent.getCoalescedEvents?.() ?? []
        const samples = events.length ? events : [e.nativeEvent]
        for (const ev of samples) {
          const w = toWorld(toLocal(ev))
          g.points.push([w.x, w.y, e.pointerType === 'pen' ? ev.pressure || 0.5 : 0.5])
        }
        setDraft({ kind: 'stroke', points: g.points.slice() })
        return
      }
      case 'erase':
        eraseAt(world, g.removed)
        return
    }
  }

  const finishMembrane = (points: Point[]) => {
    const s = useEditor.getState()
    const zoom = s.view.zoom
    let pts = simplify(points, 4 / zoom)
    const length = polylineLength(pts, false)
    if (pts.length < 2 || length < 16 / zoom) return
    const closed = pts.length > 3 && length > 140 / zoom && dist(pts[0], pts[pts.length - 1]) < 30 / zoom
    if (closed) pts = pts.slice(0, -1)
    const node: MembraneNode = {
      id: uid(),
      type: 'membrane',
      points: pts.map((p) => ({ x: round(p.x, 1), y: round(p.y, 1) })),
      closed,
      thickness: s.membraneThickness,
      headColor: '#f0a04b',
      tailColor: '#d9b65c',
      ...(closed ? { fill: '#fff4ea' } : {}),
    }
    // A closed membrane is a cell outline: put it behind what is already drawn.
    s.commit((d) => (closed ? { ...d, nodes: [node, ...d.nodes] } : addNodes(d, [node])))
  }

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    touches.current.delete(e.pointerId)
    if (touches.current.size < 2) pinch.current = null
    const g = gesture.current
    if (!g || g.pointerId !== e.pointerId) return
    gesture.current = null
    const s = useEditor.getState()
    const world = toWorld(toLocal(e))
    clearTransientUi()

    switch (g.type) {
      case 'move': {
        if (g.moved) {
          s.endGesture()
          return
        }
        const clicked = expandGroups(s.doc, [g.hitId])
        if (!g.shift && g.wasSelected && s.selection.length > clicked.length) s.set({ selection: clicked })
        const now = performance.now()
        if (lastTap.current.id === g.hitId && now - lastTap.current.time < 420) {
          const node = findNode(s.doc, g.hitId)
          if (node?.type === 'text') s.set({ selection: [node.id], editingTextId: node.id })
          // Double-tapping a shape types inside it, grouped or not. A box from an older figure has
          // its words in a separate label grouped with it: then that label is the one to type in.
          else if (node?.type === 'shape') {
            const words = node.label ? undefined : labelPartner(s.doc, node)
            s.set({ selection: [words?.id ?? node.id], editingTextId: words?.id ?? node.id })
          }
          // Double-tapping one member of a group selects just that member, so it can be edited alone.
          else if (node?.groupId) s.set({ selection: [node.id] })
          lastTap.current = { id: '', time: 0 }
        } else {
          lastTap.current = { id: g.hitId, time: now }
        }
        return
      }
      case 'resize':
      case 'rotate':
      case 'multi-resize':
      case 'multi-rotate':
      case 'label':
      case 'point':
      case 'endpoint':
      case 'bend':
      case 'erase':
        s.endGesture()
        return
      case 'shape': {
        let node = shapeFromDrag(g.id, g.start, g.last, e.shiftKey, s.shapeKind)
        if (node.w < 6 || node.h < 6) node = { ...node, x: g.start.x - 70, y: g.start.y - 45, w: 140, h: 90 }
        s.transient((start) => addNodes(start, [node]))
        s.endGesture()
        // With "Type text inside" on, the new shape opens for typing straight away.
        s.set({ selection: [g.id], tool: 'select', ...(s.shapeText ? { editingTextId: g.id } : {}) })
        return
      }
      case 'connector': {
        if (dist(g.start, g.last) * s.view.zoom < 10) s.cancelGesture()
        else s.endGesture()
        return
      }
      case 'membrane':
        finishMembrane(g.points)
        return
      case 'stroke': {
        const node: StrokeNode = {
          id: uid(),
          type: 'stroke',
          points: g.points.map(([x, y, p]) => [round(x, 1), round(y, 1), round(p, 2)]),
          color: s.penColor,
          size: s.penSize,
        }
        s.commit((d) => addNodes(d, [node]))
        if (!s.showSketch) s.set({ showSketch: true })
        return
      }
      case 'text':
        addText(world)
        return
    }
  }

  const onPointerCancel = (e: React.PointerEvent<SVGSVGElement>) => {
    touches.current.delete(e.pointerId)
    if (touches.current.size < 2) pinch.current = null
    if (gesture.current?.pointerId === e.pointerId) abortGesture()
  }

  // ----- dropping icons from the library -----

  const onDrop = (e: React.DragEvent) => {
    const at = toWorld(toLocal(e))
    const id = e.dataTransfer.getData(ICON_MIME)
    if (id) {
      e.preventDefault()
      addIcon(id, at)
      return
    }
    // A picture file dragged in from the computer.
    const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'))
    if (file) {
      e.preventDefault()
      void placeImageFile(file, at)
    }
  }

  const draftMembrane =
    draft?.kind === 'membrane' && draft.points.length > 1
      ? membraneShape({ points: simplify(draft.points, 4 / view.zoom), closed: false, thickness: membraneThickness })
      : null

  return (
    <div
      className="canvas-wrap"
      ref={wrapRef}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(ICON_MIME) || e.dataTransfer.types.includes('Files')) e.preventDefault()
      }}
      onDrop={onDrop}
    >
      <svg
        ref={svgRef}
        className={`canvas tool-${tool}${panning ? ' panning' : ''}`}
        tabIndex={0}
        role="application"
        aria-label="Figure page. Tab selects the next object, arrow keys move it, Enter edits a text, Delete removes it."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <g transform={`translate(${view.x} ${view.y}) scale(${view.zoom})`}>
          <rect className="artboard" width={doc.width} height={doc.height} fill={doc.background} />
          <DocNodes doc={doc} interactive hideSketch={!showSketch} hiddenId={editingTextId} />
          {draftMembrane && (
            <g opacity={0.75} pointerEvents="none">
              <path d={draftMembrane.tails} fill="none" stroke="#d9b65c" strokeWidth={draftMembrane.tailWidth} />
              <path d={draftMembrane.heads} fill="#f0a04b" />
            </g>
          )}
          {draft?.kind === 'stroke' && <path d={strokePath(draft.points, penSize)} fill={penColor} pointerEvents="none" />}
        </g>
        <Overlay marquee={marquee} attachHint={attachHint} guides={guides} />
      </svg>
      {editingTextId && <TextEditor key={editingTextId} id={editingTextId} />}
    </div>
  )
}
