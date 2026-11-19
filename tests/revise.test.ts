import { describe, expect, it } from 'vitest'
import { applyRevision, docToScene, reviseTaskText } from '../src/ai/revise'
import { parseScene } from '../src/ai/scene'
import { validateDoc } from '../src/io/files'
import { emptyDoc } from '../src/model/doc'
import { getRect } from '../src/model/nodes'
import type { ConnectorNode, FigDoc, FigNode, IconNode, ShapeNode, TextNode } from '../src/model/types'
import { TEMPLATES } from '../src/templates'
import { example, packIcons, stubIcon } from './helpers'

const icon = (id: string, iconId: string, x: number, y: number, extra: Partial<IconNode> = {}): IconNode => ({ id, type: 'icon', iconId, x, y, w: 120, h: 60, rotation: 0, ...extra })
const box = (id: string, x: number, y: number, extra: Partial<ShapeNode> = {}): ShapeNode => ({
  id, type: 'shape', shape: 'roundrect', x, y, w: 120, h: 40, rotation: 0, fill: '#ff0000', stroke: '#000000', strokeWidth: 2, ...extra,
})
const text = (id: string, x: number, y: number, t: string, extra: Partial<TextNode> = {}): TextNode => ({ id, type: 'text', x, y, text: t, fontSize: 16, fill: '#000000', align: 'center', rotation: 0, ...extra })
const arrow = (id: string, from: string, to: string, extra: Partial<ConnectorNode> = {}): ConnectorNode => ({
  id, type: 'connector', from: { x: 0, y: 0, nodeId: from }, to: { x: 0, y: 0, nodeId: to }, kind: 'arrow', stroke: '#111111', strokeWidth: 3, ...extra,
})

const MITO = 'nih-cells--mitochondria'

function sample(): FigDoc {
  const nodes: FigNode[] = [
    icon('mito', MITO, 100, 100, { rotation: 30, colors: { '#f9c3a6': '#00ff00' } }),
    box('akt', 500, 100, { groupId: 'g1' }),
    text('aktLabel', 560, 110, 'AKT', { groupId: 'g1', bold: true }),
    text('note', 300, 600, 'Free note'),
    arrow('link', 'mito', 'akt'),
    icon('custom', 'custom-xyz', 800, 600),
    { id: 'pic', type: 'image', src: 'data:image/png;base64,AAAA', x: 900, y: 100, w: 100, h: 100, rotation: 0 },
    box('locked', 20, 700, { locked: true }),
  ]
  return { ...emptyDoc(), nodes, customIcons: { [MITO]: stubIcon(MITO) } }
}

describe('describing the page to the AI', () => {
  it('lists what can be revised and leaves out what cannot', () => {
    const snap = docToScene(sample())
    expect(snap.scene.elements.map((e) => [e.id, e.kind, e.icon, e.label])).toEqual([
      ['e1', 'icon', MITO, ''],
      ['e2', 'box', '', 'AKT'],
      ['e3', 'text', '', 'Free note'],
    ])
    expect(snap.scene.connectors).toEqual([{ from: 'e1', to: 'e2', kind: 'arrow', dashed: false, label: '' }])
    expect(snap.elements.get('e2')).toMatchObject({ anchorId: 'akt', labelId: 'aktLabel' })
    // Centre of the box on a 1200 x 800 page, in 0-1000 units.
    expect(snap.scene.elements[1]).toMatchObject({ x: 466.7, y: 150, w: 100, h: 50 })
  })

  it('produces a scene the answer checker accepts, for the example figures', () => {
    for (const t of TEMPLATES) {
      const snap = docToScene(example(t))
      const parsed = parseScene(JSON.parse(JSON.stringify(snap.scene)))
      expect(parsed.elements, t.id).toHaveLength(snap.scene.elements.length)
      expect(parsed.connectors, t.id).toHaveLength(snap.scene.connectors.length)
      expect(reviseTaskText(snap.scene, ' make it bigger ')).toContain('Change it as follows: make it bigger')
    }
  })
})

describe('applying a revision', () => {
  it('changes nothing when the answer equals the question', () => {
    for (const t of TEMPLATES) {
      const doc = example(t)
      const snap = docToScene(doc)
      expect(applyRevision(doc, snap, snap.scene), t.id).toBe(doc)
    }
  })

  it('moves an element with its label and keeps its styling', () => {
    const doc = sample()
    const snap = docToScene(doc)
    const after = { ...snap.scene, elements: snap.scene.elements.map((e) => (e.id === 'e2' ? { ...e, x: e.x + 100, y: e.y + 50 } : e)) }
    const next = applyRevision(doc, snap, after)
    const akt = next.nodes.find((n) => n.id === 'akt') as ShapeNode
    const label = next.nodes.find((n) => n.id === 'aktLabel') as TextNode
    expect(akt).toMatchObject({ x: 620, y: 140, fill: '#ff0000', groupId: 'g1' })
    expect(label).toMatchObject({ x: 680, y: 150, bold: true })
    expect(next.nodes.find((n) => n.id === 'mito')).toBe(doc.nodes[0])
    expect(next.nodes).toHaveLength(doc.nodes.length)
  })

  it('resizes about the centre, keeping rotation and colours', () => {
    const doc = sample()
    const snap = docToScene(doc)
    const after = { ...snap.scene, elements: snap.scene.elements.map((e) => (e.id === 'e1' ? { ...e, w: e.w * 2, h: e.h * 2 } : e)) }
    const mito = applyRevision(doc, snap, after).nodes.find((n) => n.id === 'mito') as IconNode
    expect(mito).toMatchObject({ w: 240, h: 120, rotation: 30, colors: { '#f9c3a6': '#00ff00' } })
    expect(mito.x + mito.w / 2).toBeCloseTo(160)
  })

  it('renames, removes and adds labels', () => {
    const doc = sample()
    const snap = docToScene(doc)
    const relabel = (id: string, label: string) => ({ ...snap.scene, elements: snap.scene.elements.map((e) => (e.id === id ? { ...e, label } : e)) })
    expect((applyRevision(doc, snap, relabel('e2', 'AKT1')).nodes.find((n) => n.id === 'aktLabel') as TextNode).text).toBe('AKT1')
    expect((applyRevision(doc, snap, relabel('e3', 'Changed')).nodes.find((n) => n.id === 'note') as TextNode).text).toBe('Changed')
    expect(applyRevision(doc, snap, relabel('e2', '')).nodes.some((n) => n.id === 'aktLabel')).toBe(false)
    const added = applyRevision(doc, snap, relabel('e1', 'Mitochondrion'))
    const newLabel = added.nodes.find((n) => n.type === 'text' && n.text === 'Mitochondrion') as TextNode
    expect(newLabel.groupId).toBe(added.nodes.find((n) => n.id === 'mito')!.groupId)
    expect(newLabel.groupId).toBeTruthy()
  })

  it('deletes what the answer leaves out and releases arrows that pointed at it', () => {
    const doc = { ...sample(), nodes: [...sample().nodes, arrow('loose', 'akt', 'custom')] }
    const snap = docToScene(doc)
    const after = { ...snap.scene, elements: snap.scene.elements.filter((e) => e.id !== 'e2'), connectors: [] }
    const next = applyRevision(doc, snap, after)
    expect(next.nodes.map((n) => n.id)).toEqual(['mito', 'note', 'custom', 'pic', 'locked', 'loose'])
    const loose = next.nodes.find((n) => n.id === 'loose') as ConnectorNode
    expect(loose.from.nodeId).toBeUndefined()
    expect(loose.to.nodeId).toBe('custom')
  })

  it('adds new elements and arrows that join old and new', () => {
    const doc = sample()
    const snap = docToScene(doc)
    const after = {
      ...snap.scene,
      elements: [...snap.scene.elements, { id: 'new1', kind: 'box' as const, icon: '', label: 'mTOR', x: 500, y: 600, w: 110, h: 55 }],
      connectors: [...snap.scene.connectors, { from: 'e2', to: 'new1', kind: 'inhibit' as const, dashed: true, label: 'blocks' }],
    }
    const next = applyRevision(doc, snap, after)
    const created = next.nodes.slice(doc.nodes.length)
    // The new box carries its name inside.
    expect(created.map((n) => n.type)).toEqual(['shape', 'connector'])
    expect(created[0]).toMatchObject({ label: { text: 'mTOR', bold: true } })
    const link = created[1] as ConnectorNode
    expect(link).toMatchObject({ kind: 'inhibit', dashed: true, label: 'blocks', from: { nodeId: 'akt' }, to: { nodeId: created[0].id } })
    expect(getRect(created[0], next).x + getRect(created[0], next).w / 2).toBeCloseTo(600)
    // Existing content is untouched and the result is still a valid figure.
    expect(next.nodes.slice(0, doc.nodes.length)).toEqual(doc.nodes)
    expect(validateDoc(JSON.parse(JSON.stringify(next))).nodes).toHaveLength(next.nodes.length)
  })

  it('updates the kind and label of an arrow that stays, keeping its colour and width', () => {
    const doc = sample()
    const snap = docToScene(doc)
    const after = { ...snap.scene, connectors: [{ from: 'e1', to: 'e2', kind: 'inhibit' as const, dashed: false, label: 'represses' }] }
    expect(applyRevision(doc, snap, after).nodes.find((n) => n.id === 'link')).toMatchObject({ kind: 'inhibit', label: 'represses', stroke: '#111111', strokeWidth: 3 })
  })

  it('swaps the icon of an element that keeps its id, for one from the collections', () => {
    const doc = sample()
    const snap = docToScene(doc)
    const after = { ...snap.scene, elements: snap.scene.elements.map((e) => (e.id === 'e1' ? { ...e, icon: 'nih-cells--cell-nucleus' } : e)) }
    const next = applyRevision(doc, snap, after, packIcons)
    const swapped = next.nodes.find((n) => n.id === 'mito') as IconNode
    // The stand-in drawing is 120 x 80: same height and centre, new width, old colour overrides dropped.
    expect(swapped).toMatchObject({ iconId: 'nih-cells--cell-nucleus', h: 60, w: 90, rotation: 30 })
    expect(swapped.x + swapped.w / 2).toBe(160)
    expect(swapped.colors).toBeUndefined()
    // The new drawing is stored with the figure, which is still a valid one.
    expect(next.customIcons['nih-cells--cell-nucleus']).toMatchObject({ id: 'nih-cells--cell-nucleus', category: 'Imported' })
    expect(validateDoc(JSON.parse(JSON.stringify(next))).customIcons['nih-cells--cell-nucleus']).toBeTruthy()
    const unknown = { ...snap.scene, elements: snap.scene.elements.map((e) => (e.id === 'e1' ? { ...e, icon: 'no-such-icon' } : e)) }
    expect(applyRevision(doc, snap, unknown, packIcons)).toBe(doc)
  })

  it('shows icons from the collections to the AI and stores the ones it adds', () => {
    const macrophage = stubIcon('nih-cells--macrophage')
    const doc: FigDoc = { ...emptyDoc(), nodes: [icon('mac', macrophage.id, 100, 100), icon('own', 'imported-abc', 400, 100)], customIcons: { [macrophage.id]: macrophage } }
    const snap = docToScene(doc)
    // The icon from a collection is described by its id; one imported from a file is left out.
    expect(snap.scene.elements.map((e) => e.icon)).toEqual(['nih-cells--macrophage'])
    const after = { ...snap.scene, elements: [...snap.scene.elements, { id: 'new1', kind: 'icon' as const, icon: 'nih-lab--pill', label: 'Drug', x: 700, y: 500, w: 100, h: 100 }] }
    const next = applyRevision(doc, snap, after, packIcons)
    expect(next.nodes.filter((n) => n.type === 'icon').map((n) => (n as IconNode).iconId)).toEqual(['nih-cells--macrophage', 'imported-abc', 'nih-lab--pill'])
    expect(Object.keys(next.customIcons).sort()).toEqual(['nih-cells--macrophage', 'nih-lab--pill'])
    // What was already stored is kept as it was.
    expect(next.customIcons[macrophage.id]).toBe(macrophage)
  })

  it('never touches pictures, imported icons or locked objects', () => {
    const doc = sample()
    const snap = docToScene(doc)
    const next = applyRevision(doc, snap, { title: '', elements: [], connectors: [], notes: [] })
    expect(next.nodes.map((n) => n.id)).toEqual(['custom', 'pic', 'locked'])
  })
})
