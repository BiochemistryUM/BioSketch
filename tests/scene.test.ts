import { describe, expect, it } from 'vitest'
import { SCENE_SCHEMA, SYSTEM_PROMPT, iconCatalogue, parseScene, sceneToNodes } from '../src/ai/scene'
import { BUILTIN_ICONS } from '../src/icons/library'
import { renderSvg } from '../src/io/export'
import { validateDoc } from '../src/io/files'
import { emptyDoc } from '../src/model/doc'
import { getRect, resolveConnector } from '../src/model/nodes'
import type { ConnectorNode, FigDoc, IconNode, MembraneNode, ShapeNode, TextNode } from '../src/model/types'

/** What a model answer for a small sketch looks like. */
const answer = {
  title: 'Kinase signalling',
  elements: [
    { id: 'cell', kind: 'cell', icon: '', label: 'Cell', x: 500, y: 550, w: 800, h: 700 },
    { id: 'pm', kind: 'membrane', icon: '', label: '', x: 500, y: 150, w: 900, h: 30 },
    { id: 'r', kind: 'icon', icon: 'receptor', label: 'EGFR', x: 300, y: 300, w: 60, h: 180 },
    { id: 'k', kind: 'box', icon: '', label: 'ERK', x: 300, y: 600, w: 110, h: 55 },
    { id: 'unknown', kind: 'icon', icon: 'flux-capacitor', label: '', x: 700, y: 600, w: 100, h: 60 },
    { id: 'note', kind: 'text', icon: '', label: 'Proliferation', x: 700, y: 800, w: 200, h: 40 },
  ],
  connectors: [
    { from: 'r', to: 'k', kind: 'arrow', dashed: false, label: 'activates' },
    { from: 'k', to: 'unknown', kind: 'inhibit', dashed: true, label: '' },
    { from: 'k', to: 'ghost', kind: 'arrow', dashed: false, label: '' },
    { from: 'k', to: 'k', kind: 'arrow', dashed: false, label: '' },
  ],
}

describe('AI scenes', () => {
  it('describes every library icon to the model', () => {
    const catalogue = iconCatalogue()
    // One line per category; every icon id appears, with its name only where the id does not explain itself.
    expect(catalogue.split('\n')).toHaveLength(new Set(BUILTIN_ICONS.map((i) => i.category)).size)
    for (const icon of BUILTIN_ICONS) expect(catalogue, icon.id).toMatch(new RegExp(`(^|[ ,:])${icon.id}([ ,(]|$)`, 'm'))
    expect(catalogue).toContain(', mitochondrion,')
    expect(catalogue).toContain('na-k-pump (Sodium-potassium pump)')
    expect(catalogue.length).toBeLessThan(9000)
    expect(SYSTEM_PROMPT).toContain(catalogue)
    expect(SCENE_SCHEMA.required).toEqual(['title', 'elements', 'connectors', 'notes'])
  })

  it('keeps valid parts of an answer and drops the rest', () => {
    const scene = parseScene(answer)
    expect(scene.elements).toHaveLength(6)
    expect(scene.connectors).toHaveLength(2)
    const messy = parseScene({
      elements: [
        { id: 'a', kind: 'icon', icon: 'cell', label: 5, x: 99999, y: -5, w: 'big', h: 0 },
        { id: 'a', kind: 'box' },
        { id: '', kind: 'box' },
        { id: 'b', kind: 'hologram' },
        'nonsense',
      ],
      connectors: 'none',
    })
    expect(messy.elements).toEqual([{ id: 'a', kind: 'icon', icon: 'cell', label: '', x: 1000, y: 0, w: 100, h: 10 }])
    expect(messy.connectors).toEqual([])
    expect(() => parseScene(null)).toThrow()
    expect(() => parseScene({ elements: 'x' })).toThrow()
  })

  it('builds editable nodes on the page', () => {
    const page = { width: 1200, height: 800 }
    const nodes = sceneToNodes(parseScene(answer), page)
    const doc: FigDoc = { ...emptyDoc(), nodes }
    const icons = nodes.filter((n): n is IconNode => n.type === 'icon')
    const shapes = nodes.filter((n): n is ShapeNode => n.type === 'shape')
    const membranes = nodes.filter((n): n is MembraneNode => n.type === 'membrane')
    const texts = nodes.filter((n): n is TextNode => n.type === 'text')
    const links = nodes.filter((n): n is ConnectorNode => n.type === 'connector')

    // The receptor keeps its proportions and is centred where the model put it.
    expect(icons).toHaveLength(1)
    expect(icons[0].iconId).toBe('receptor')
    expect(icons[0].w / icons[0].h).toBeCloseTo(40 / 126)
    const r = getRect(icons[0], doc)
    expect(r.x + r.w / 2).toBeCloseTo(360)
    expect(r.y + r.h / 2).toBeCloseTo(240)

    // A named protein and an unknown icon both become boxes with their words inside.
    expect(shapes).toHaveLength(2)
    expect(shapes.map((s) => s.label?.text)).toEqual(['ERK', 'flux-capacitor'])
    expect(shapes.every((s) => !s.groupId && s.label?.bold)).toBe(true)
    expect(texts.map((t) => t.text)).toEqual(expect.arrayContaining(['EGFR', 'Proliferation', 'Kinase signalling', 'Cell']))
    expect(texts.map((t) => t.text)).not.toContain('ERK')

    // Cell outline and membrane come first so they sit behind everything.
    expect(membranes).toHaveLength(2)
    expect(nodes.slice(0, 2).every((n) => n.type === 'membrane')).toBe(true)
    expect(membranes.find((m) => m.closed)!.points).toHaveLength(16)
    expect(membranes.find((m) => !m.closed)!.points).toEqual([{ x: 60, y: 120 }, { x: 1140, y: 120 }])

    // Arrows are attached, so they follow the icons, and are drawn last.
    expect(links).toHaveLength(2)
    expect(links[0]).toMatchObject({ kind: 'arrow', label: 'activates', from: { nodeId: icons[0].id }, to: { nodeId: shapes[0].id } })
    expect(links[1]).toMatchObject({ kind: 'inhibit', dashed: true })
    expect(nodes[nodes.length - 1].type).toBe('connector')
    const resolved = resolveConnector(links[0], doc)
    expect(resolved.to.y).toBeGreaterThan(resolved.from.y)

    // Labels are grouped with what they describe.
    const egfr = texts.find((t) => t.text === 'EGFR')!
    expect(egfr.groupId).toBe(icons[0].groupId)
  })

  it('produces a figure that saves, loads and exports cleanly', () => {
    const doc: FigDoc = { ...emptyDoc(), nodes: sceneToNodes(parseScene(answer), { width: 1200, height: 800 }) }
    expect(validateDoc(JSON.parse(JSON.stringify(doc)))).toEqual(doc)
    const svg = renderSvg(doc, { area: 'page', transparent: false, includeSketch: true }).svg
    expect(new DOMParser().parseFromString(svg, 'image/svg+xml').getElementsByTagName('parsererror')).toHaveLength(0)
  })

  it('never lets text from the model become markup', () => {
    const scene = parseScene({
      title: '<script>alert(1)</script>',
      elements: [{ id: 'a', kind: 'box', icon: '<img onerror=x>', label: '"><svg onload=alert(1)>', x: 500, y: 500, w: 100, h: 50 }],
      connectors: [],
    })
    const doc: FigDoc = { ...emptyDoc(), nodes: sceneToNodes(scene, { width: 1200, height: 800 }) }
    const xml = new DOMParser().parseFromString(renderSvg(doc, { area: 'page', transparent: false, includeSketch: true }).svg, 'image/svg+xml')
    expect(xml.getElementsByTagName('parsererror')).toHaveLength(0)
    expect(xml.getElementsByTagName('script')).toHaveLength(0)
    expect(xml.querySelectorAll('[onload], [onerror]')).toHaveLength(0)
  })
})
