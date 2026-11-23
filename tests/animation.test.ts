import { describe, expect, it } from 'vitest'
import { parseDoc, serializeDoc, validateDoc } from '../src/io/files'
import {
  animate,
  animationList,
  effectName,
  layerFrames,
  moveRow,
  nodesAtStep,
  readEffect,
  removeRow,
  setPress,
  slideSteps,
  stepMotion,
} from '../src/model/animation'
import { emptyDoc } from '../src/model/doc'
import type { FigDoc, FigNode, ShapeNode } from '../src/model/types'

const box = (id: string, x = 0, extra: Partial<ShapeNode> = {}): ShapeNode => ({ id, type: 'shape', shape: 'rect', x, y: 0, w: 50, h: 50, rotation: 0, fill: '#ffffff', stroke: '#000000', strokeWidth: 1, ...extra })
const steps = (nodes: FigNode[]) => nodes.map((n) => [n.id, n.appear ?? 0, n.exit ?? 0])
const page = (nodes: FigNode[]): FigDoc => ({ ...emptyDoc('Anim'), width: 1000, height: 500, nodes })

describe('animations of a slide', () => {
  it('reads an effect from a file field by field, and refuses what is not one', () => {
    expect(readEffect({ kind: 'fly', from: 'top', ms: 800 })).toEqual({ kind: 'fly', from: 'top', ms: 800 })
    expect(readEffect({ kind: 'fly', from: 'left', ms: 500 })).toEqual({ kind: 'fly' })
    expect(readEffect({ kind: 'fade', from: 'top', ms: 99999 })).toEqual({ kind: 'fade', ms: 5000 })
    expect(readEffect({ kind: 'spin' })).toBeNull()
    expect(readEffect('fade')).toBeNull()
  })

  it('counts presses for objects that come in and go, and shows each step', () => {
    const nodes = [box('a'), box('b', 100, { appear: 1 }), box('c', 200, { appear: 1, exit: 3 })]
    expect(slideSteps(nodes)).toBe(3)
    const shown = (step: number) => nodesAtStep(nodes, step).filter((n) => !n.hidden).map((n) => n.id)
    expect(shown(0)).toEqual(['a'])
    expect(shown(1)).toEqual(['a', 'b', 'c'])
    expect(shown(2)).toEqual(['a', 'b', 'c'])
    expect(shown(3)).toEqual(['a', 'b'])
    expect(nodesAtStep(nodes, 3)).toBe(nodesAtStep(nodes, 3))
    expect(nodesAtStep(nodes, 2)).toBe(nodes)
  })

  it('lists the animations in order of play, a group as one row', () => {
    const nodes = [box('a', 0, { appear: 2, enterFx: { kind: 'fade' } }), box('b', 0, { appear: 1, groupId: 'g' }), box('c', 0, { appear: 1, groupId: 'g' }), box('d', 0, { exit: 2 })]
    const list = animationList(nodes)
    expect(list.map((r) => [r.way, r.step, r.ids])).toEqual([
      ['in', 1, ['b', 'c']],
      ['in', 2, ['a']],
      ['out', 2, ['d']],
    ])
    expect(effectName(list[1].fx, 'in')).toBe('Fade in')
    expect(effectName(null, 'out')).toBe('Disappear')
    expect(effectName({ kind: 'fly', from: 'top' }, 'out')).toBe('Fly out to the top')
  })

  it('adds an animation on a new press at the end, and changes only the effect when there is one', () => {
    let nodes: FigNode[] = [box('a'), box('b', 100)]
    nodes = animate(nodes, ['a'], 'in', true, { kind: 'fade' })
    nodes = animate(nodes, ['b'], 'in', true)
    expect(steps(nodes)).toEqual([['a', 1, 0], ['b', 2, 0]])
    nodes = animate(nodes, ['a'], 'in', true, { kind: 'zoom' })
    expect(nodes[0]).toMatchObject({ appear: 1, enterFx: { kind: 'zoom' } })
    // Going: after everything, and after its own coming in.
    nodes = animate(nodes, ['a'], 'out', true, { kind: 'fly', from: 'right' })
    expect(steps(nodes)).toEqual([['a', 1, 3], ['b', 2, 0]])
    // Taking the coming in of a away closes the gap: b comes in on press 1, a goes on press 2.
    nodes = animate(nodes, ['a'], 'in', false)
    expect(steps(nodes)).toEqual([['a', 0, 2], ['b', 1, 0]])
    expect(nodes[0].enterFx).toBeUndefined()
  })

  it('moves rows, joins a row to the one before, and takes rows out, numbering the presses without gaps', () => {
    let nodes: FigNode[] = [box('a', 0, { appear: 1 }), box('b', 0, { appear: 2 }), box('c', 0, { appear: 3 })]
    nodes = moveRow(nodes, 2, -1)!
    expect(steps(nodes)).toEqual([['a', 1, 0], ['b', 3, 0], ['c', 2, 0]])
    nodes = setPress(nodes, 1, false)!
    expect(steps(nodes)).toEqual([['a', 1, 0], ['b', 2, 0], ['c', 1, 0]])
    nodes = setPress(nodes, 1, true)!
    expect(steps(nodes)).toEqual([['a', 1, 0], ['b', 3, 0], ['c', 2, 0]])
    nodes = removeRow(nodes, 0)
    expect(steps(nodes)).toEqual([['a', 0, 0], ['b', 2, 0], ['c', 1, 0]])
    expect(moveRow(nodes, 0, -1)).toBeNull()
  })

  it('refuses an order in which an object would go before it comes in', () => {
    const nodes = [box('a', 0, { appear: 1, exit: 2 })]
    expect(moveRow(nodes, 1, -1)).toBeNull()
    expect(setPress(nodes, 1, false)).toBeNull()
  })

  it('plays a step from the slide without what moves and one layer per moving thing', () => {
    const slide = page([box('a'), box('b', 100, { appear: 1, enterFx: { kind: 'fade' } }), box('c', 200, { appear: 1 }), box('d', 300, { exit: 1, exitFx: { kind: 'wipe' } })])
    const m = stepMotion(slide, 1)
    expect(m.base.filter((n) => !n.hidden).map((n) => n.id)).toEqual(['a', 'c'])
    expect(m.layers.map((l) => [l.way, l.nodes.filter((n) => !n.hidden).map((n) => n.id)])).toEqual([
      ['in', ['b']],
      ['out', ['d']],
    ])
    expect(m.layers[1].box).toEqual({ x: 300, y: 0, w: 50, h: 50 })
    expect(stepMotion(slide, 1)).toBe(m)
  })

  it('works out keyframes in shares of the slide', () => {
    const layer = { nodes: [], box: { x: 100, y: 50, w: 200, h: 100 }, way: 'in' as const, fx: { kind: 'fly' as const } }
    expect(layerFrames(layer, 1000, 500)).toEqual([{ transform: 'translate(-30%, 0)' }, { transform: 'translate(0, 0)' }])
    const wipe = layerFrames({ ...layer, fx: { kind: 'wipe', from: 'right' } }, 1000, 500)
    expect(wipe).toEqual([{ clipPath: 'inset(10% 70% 70% 30%)' }, { clipPath: 'inset(10% 70% 70% 10%)' }])
    const out = layerFrames({ ...layer, way: 'out', fx: { kind: 'fade' } }, 1000, 500)
    expect(out).toEqual([{ opacity: 1 }, { opacity: 0 }])
  })

  it('keeps animations through a file, and drops a going that comes before the coming in', () => {
    const doc = page([box('a', 0, { appear: 2, enterFx: { kind: 'fly', from: 'bottom', ms: 900 }, exit: 3, exitFx: { kind: 'fade' } }), box('b', 0, { appear: 3, exit: 2 })])
    const back = parseDoc(serializeDoc(doc))
    expect(back.nodes[0]).toMatchObject({ appear: 2, enterFx: { kind: 'fly', from: 'bottom', ms: 900 }, exit: 3, exitFx: { kind: 'fade' } })
    expect(back.nodes[1].exit).toBeUndefined()
    const odd = validateDoc({ ...doc, nodes: [{ ...box('c'), enterFx: { kind: 'fade' }, exit: 1, exitFx: { kind: 'boom' } }] })
    expect(odd.nodes[0].enterFx).toBeUndefined()
    expect(odd.nodes[0].exit).toBe(1)
    expect(odd.nodes[0].exitFx).toBeUndefined()
  })
})
