// The layout check on AI figures, the notes an AI answer can carry, frames for zoomed-in views,
// and the "plan first" wording of the request.

import { describe, expect, it } from 'vitest'
import { buildChatRequest, readChatAnswer } from '../src/ai/bridge'
import { tidyScene } from '../src/ai/layout'
import { docToScene } from '../src/ai/revise'
import { elementBox, parseScene, sceneToNodes, systemPrompt, type Scene, type SceneElement } from '../src/ai/scene'
import { emptyDoc } from '../src/model/doc'
import type { ConnectorNode, ShapeNode, TextNode } from '../src/model/types'
import { PACKS, packIcons } from './helpers'

const SYSTEM = systemPrompt(PACKS)

const PAGE = { width: 1200, height: 800 }
const el = (id: string, kind: SceneElement['kind'], x: number, y: number, w: number, h: number, extra: Partial<SceneElement> = {}): SceneElement => ({
  id, kind, icon: '', label: id.toUpperCase(), x, y, w, h, ...extra,
})
const sceneOf = (...elements: SceneElement[]): Scene => ({ title: '', elements, connectors: [], notes: [] })
const overlap = (a: SceneElement, b: SceneElement): boolean => {
  const [p, q] = [elementBox(a, PAGE), elementBox(b, PAGE)]
  return Math.min(p.x + p.w, q.x + q.w) - Math.max(p.x, q.x) > 0.5 && Math.min(p.y + p.h, q.y + q.h) - Math.max(p.y, q.y) > 0.5
}

describe('layout check', () => {
  it('leaves a tidy figure exactly as it is', () => {
    const scene = sceneOf(el('a', 'box', 200, 500, 110, 55), el('b', 'box', 600, 500, 110, 55))
    const tidy = tidyScene(scene, PAGE)
    expect(tidy.fixes).toEqual([])
    expect(tidy.scene).toBe(scene)
  })

  it('moves two elements apart when one lies on top of the other, and says so', () => {
    const scene = sceneOf(el('erk', 'box', 500, 500, 110, 55), el('mek', 'box', 520, 505, 110, 55), el('far', 'box', 850, 200, 110, 55))
    expect(overlap(scene.elements[0], scene.elements[1])).toBe(true)
    const tidy = tidyScene(scene, PAGE)
    const [erk, mek, far] = tidy.scene.elements
    expect(overlap(erk, mek)).toBe(false)
    expect(tidy.fixes).toEqual(['Moved “ERK” and “MEK” apart: they were on top of each other.'])
    // Each moved half the way, in opposite directions, and there is clear space between them now.
    const [a, b] = [elementBox(erk, PAGE), elementBox(mek, PAGE)]
    const gap = Math.max(b.x - (a.x + a.w), b.y - (a.y + a.h))
    expect(gap).toBeGreaterThanOrEqual(11)
    expect(erk.y).toBeLessThan(500)
    expect(mek.y).toBeGreaterThan(505)
    // What was not in the way is untouched.
    expect(far).toBe(scene.elements[2])
  })

  it('leaves room for the arrow when the two elements are joined by one', () => {
    const scene: Scene = { ...sceneOf(el('a', 'box', 500, 500, 110, 55), el('b', 'box', 505, 520, 110, 55)), connectors: [{ from: 'b', to: 'a', kind: 'inhibit', dashed: false, label: 'blocks' }] }
    const [a, b] = tidyScene(scene, PAGE).scene.elements.map((e) => elementBox(e, PAGE))
    expect(b.y - (a.y + a.h)).toBeGreaterThanOrEqual(43)
  })

  it('untangles a pile of elements so that none overlaps another', () => {
    const scene = sceneOf(...['a', 'b', 'c', 'd', 'e'].map((id, i) => el(id, 'box', 480 + 12 * i, 480 + 8 * i, 120, 60)))
    const { scene: tidy, fixes } = tidyScene(scene, PAGE)
    for (const a of tidy.elements) for (const b of tidy.elements) if (a !== b) expect(overlap(a, b), `${a.id}/${b.id}`).toBe(false)
    expect(fixes.length).toBeGreaterThan(0)
    for (const e of tidy.elements) {
      const box = elementBox(e, PAGE)
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.x + box.w).toBeLessThanOrEqual(PAGE.width)
      expect(box.y + box.h).toBeLessThanOrEqual(PAGE.height)
    }
  })

  it('accepts what is meant to overlap: a mark on a larger thing, and anything on a membrane, in a cell or in a frame', () => {
    const scene = sceneOf(
      el('cellwall', 'cell', 500, 500, 700, 700),
      el('zoom', 'frame', 500, 500, 600, 600),
      el('bilayer', 'membrane', 500, 300, 500, 40),
      el('pump', 'icon', 500, 300, 90, 140, { icon: 'nih-molecules--protein-pore', label: '' }),
      el('mito', 'icon', 500, 600, 300, 200, { icon: 'nih-cells--mitochondria', label: '' }),
      el('mark', 'box', 520, 600, 60, 40, { label: '' }),
    )
    expect(tidyScene(scene, PAGE, packIcons)).toEqual({ scene, fixes: [] })
  })

  it('does not take a half-covered box, or anything on a box, for something meant to be there', () => {
    // An icon lying half across a box hides the box's words: that is an accident.
    const half = sceneOf(el('vkh2', 'box', 820, 690, 230, 60), el('ros', 'icon', 830, 720, 90, 90, { icon: 'nih-cells--mitochondria', label: 'ROS' }))
    expect(tidyScene(half, PAGE, packIcons).fixes).toEqual(['Moved “VKH2” and “ROS” apart: they were on top of each other.'])
    // So is a small box right in the middle of a big one, although a small box on a big picture is not.
    const onBox = sceneOf(el('big', 'box', 500, 500, 400, 140), el('small', 'box', 500, 500, 70, 40))
    expect(tidyScene(onBox, PAGE).fixes).toHaveLength(1)
    const onPicture = sceneOf(el('cellpic', 'icon', 500, 500, 400, 400, { icon: 'nih-cells--macrophage', label: '' }), el('small', 'box', 560, 520, 70, 40))
    expect(tidyScene(onPicture, PAGE, packIcons).fixes).toEqual([])
  })

  it('counts the label under an icon as part of it', () => {
    // The text sits where the icon's label is drawn, just below the icon itself.
    const scene = sceneOf(el('mito', 'icon', 500, 500, 130, 65, { icon: 'nih-cells--mitochondria', label: 'Mitochondrion' }), el('note', 'text', 500, 545, 200, 40, { label: 'makes ATP' }))
    expect(tidyScene(scene, PAGE, packIcons).fixes).toHaveLength(1)
    const bare = sceneOf({ ...scene.elements[0], label: '' }, scene.elements[1])
    expect(tidyScene(bare, PAGE, packIcons).fixes).toEqual([])
  })

  it('brings an element that hangs off the page back onto it', () => {
    const scene = sceneOf(el('ros', 'box', 995, 20, 200, 60), el('ok', 'box', 300, 500, 110, 55))
    const tidy = tidyScene(scene, PAGE)
    expect(tidy.fixes).toEqual(['Moved “ROS” back onto the page.'])
    const box = elementBox(tidy.scene.elements[0], PAGE)
    expect(box.x + box.w).toBeLessThanOrEqual(PAGE.width)
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(tidy.scene.elements[1]).toBe(scene.elements[1])
  })

  it('names an unlabelled icon by what it shows', () => {
    const scene = sceneOf(el('a', 'icon', 500, 500, 120, 120, { icon: 'nih-cells--cell-nucleus', label: '' }), el('b', 'icon', 510, 500, 120, 120, { icon: 'nih-cells--ribosome', label: '' }))
    expect(tidyScene(scene, PAGE, packIcons).fixes[0]).toBe('Moved “cell nucleus” and “ribosome” apart: they were on top of each other.')
  })
})

describe('notes from the AI', () => {
  const raw = { title: '', elements: [el('a', 'box', 500, 500, 110, 55)], connectors: [] }

  it('are kept as short plain sentences, at most six of them', () => {
    const scene = parseScene({ ...raw, notes: ['  No icon for a 4TM protein:\n used a transporter. ', '', 42, 'x'.repeat(400), 'c', 'd', 'e', 'f', 'g'] })
    expect(scene.notes).toHaveLength(6)
    expect(scene.notes[0]).toBe('No icon for a 4TM protein: used a transporter.')
    expect(scene.notes[1]).toHaveLength(240)
  })

  it('are simply absent from an answer that has none', () => {
    expect(parseScene(raw).notes).toEqual([])
    expect(parseScene({ ...raw, notes: 'not a list' }).notes).toEqual([])
  })

  it('are asked for in the instructions and read back from a pasted answer', () => {
    expect(SYSTEM).toContain('"notes"')
    const scene = readChatAnswer('```json\n{"title":"","elements":[{"id":"a","kind":"box","icon":"","label":"A","x":500,"y":500,"w":110,"h":55}],"connectors":[],"notes":["I assumed the protein sits in the inner membrane."]}\n```')
    expect(scene.notes).toEqual(['I assumed the protein sits in the inner membrane.'])
  })
})

describe('frames', () => {
  it('are built as empty dashed rectangles of any size, behind everything, with a caption', () => {
    const scene: Scene = {
      title: '',
      elements: [el('box', 'box', 300, 500, 110, 55), el('zoom', 'frame', 650, 500, 600, 800, { label: 'Zoomed in' })],
      connectors: [{ from: 'box', to: 'zoom', kind: 'line', dashed: true, label: '' }],
      notes: [],
    }
    const nodes = sceneToNodes(scene, PAGE)
    const frame = nodes[0] as ShapeNode
    expect(frame).toMatchObject({ type: 'shape', shape: 'rect', fill: 'none', dashed: true, w: 720, h: 640 })
    const caption = nodes.find((n): n is TextNode => n.type === 'text' && n.text === 'Zoomed in')!
    expect(caption.groupId).toBe(frame.groupId)
    expect(caption.y).toBeGreaterThan(frame.y)
    // Arrows can attach to a frame.
    const link = nodes.find((n): n is ConnectorNode => n.type === 'connector')!
    expect(link.to.nodeId).toBe(frame.id)
    // A box keeps its limit: it holds a label, it is not a container.
    const tall = sceneToNodes(sceneOf(el('tall', 'box', 500, 500, 300, 900)), PAGE)[0] as ShapeNode
    expect(tall.h).toBe(120)
  })

  it('are described as frames again when the figure is shown to the AI for a change', () => {
    const nodes = sceneToNodes(sceneOf(el('zoom', 'frame', 500, 500, 400, 400, { label: '' }), el('b', 'box', 500, 500, 110, 55)), PAGE)
    const kinds = docToScene({ ...emptyDoc(), width: PAGE.width, height: PAGE.height, nodes }).scene.elements.map((e) => e.kind)
    expect(kinds).toEqual(['frame', 'box'])
  })
})

describe('plan first', () => {
  it('asks Claude to describe its plan and wait before it builds', () => {
    const plain = buildChatRequest(SYSTEM, false, 'glycolysis')
    const planned = buildChatRequest(SYSTEM, false, 'glycolysis', undefined, true)
    expect(plain).toContain('Answer format: reply with one JSON object')
    expect(plain).not.toContain('Step 1')
    expect(planned).toContain('Step 1, your first reply: no JSON yet.')
    expect(planned).toContain('ask up to three questions')
    expect(planned).toContain('Step 2, after I answer or say "go ahead": reply with one JSON object in a single code block')
    // Both carry the same example and rules, so the final answer is read the same way.
    for (const text of [plain, planned]) {
      expect(text).toContain('"notes": []')
      expect(text).toContain('"kind" of an element is one of: icon, box, ellipse, text, membrane, cell, frame.')
    }
    expect(planned.length).toBeLessThan(26000)
  })

  it('reads the figure from the end of a pasted conversation', () => {
    const figure = (label: string): string => `{"title":"","elements":[{"id":"a","kind":"box","icon":"","label":"${label}","x":500,"y":500,"w":110,"h":55}],"connectors":[],"notes":[]}`
    const chat = [
      'Here is my plan:\n```\n1. A box for AKT\n2. An arrow to mTOR\n```\nShall I go ahead?',
      'go ahead',
      `First attempt:\n\`\`\`json\n${figure('Old')}\n\`\`\``,
      'rename it',
      `Done:\n\`\`\`json\n${figure('New')}\n\`\`\`\nLet me know if you want changes.`,
    ].join('\n\n')
    expect(readChatAnswer(chat).elements[0].label).toBe('New')
    // A plan alone is not an answer yet.
    expect(() => readChatAnswer('Here is my plan: a box for AKT. Shall I go ahead?')).toThrow(/does not look like/)
  })
})
