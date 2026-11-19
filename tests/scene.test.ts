import { describe, expect, it } from 'vitest'
import { sceneIcons } from '../src/ai/icons'
import { SCENE_SCHEMA, aiPacks, catalogueId, iconCatalogue, iconsUsed, parseScene, sceneToNodes, systemPrompt } from '../src/ai/scene'
import { renderSvg } from '../src/io/export'
import { validateDoc } from '../src/io/files'
import { emptyDoc } from '../src/model/doc'
import { getRect, resolveConnector } from '../src/model/nodes'
import type { ConnectorNode, FigDoc, IconNode, MembraneNode, ShapeNode, TextNode } from '../src/model/types'
import { PACKS, loadStub, packIcons } from './helpers'

/** What a model answer for a small sketch looks like. */
const answer = {
  title: 'Kinase signalling',
  elements: [
    { id: 'cell', kind: 'cell', icon: '', label: 'Cell', x: 500, y: 550, w: 800, h: 700 },
    { id: 'pm', kind: 'membrane', icon: '', label: '', x: 500, y: 150, w: 900, h: 30 },
    { id: 'r', kind: 'icon', icon: 'nih-molecules--receptor', label: 'EGFR', x: 300, y: 300, w: 60, h: 180 },
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
  it('describes the NIH BioArt icons to the model, by name', () => {
    const catalogue = iconCatalogue(PACKS)
    const nih = aiPacks(PACKS)
    // One line per collection; every icon appears, with its name only where the entry does not explain itself.
    expect(nih.length).toBeGreaterThanOrEqual(9)
    expect(catalogue.split('\n')).toHaveLength(nih.length)
    for (const pack of nih) {
      const line = catalogue.split('\n').find((l) => l.startsWith(`${pack.id} (`))!
      for (const [id] of pack.names) expect(line, `${pack.id}--${id}`).toMatch(new RegExp(`[ ,]${id}([ ,(]|$)`))
    }
    expect(catalogue).toContain('nih-cells (cells and organelles): ')
    expect(catalogue).toContain(', macrophage, macrophage-2, ')
    expect(catalogue.length).toBeLessThan(20000)
    // Collections that need a credit line or come in many hands are for the scientist to choose, not the AI.
    expect(catalogue).not.toMatch(/^(srv|bio)-/m)
    const prompt = systemPrompt(PACKS)
    expect(prompt).toContain(catalogue)
    expect(prompt).toContain('nih-cells--macrophage')
    expect(SCENE_SCHEMA.required).toEqual(['title', 'elements', 'connectors', 'notes'])
  })

  it('offers none of the drawings BioSketch used to have', () => {
    const prompt = systemPrompt(PACKS)
    // Ids of drawings that were made for BioSketch and deleted in November 2026.
    for (const id of ['receptor-dimer', 'na-k-pump', 'smooth-muscle-cell', 'ros']) {
      expect(prompt).not.toMatch(new RegExp(`[ ,]${id}[ ,(]`))
      expect(catalogueId(id, PACKS)).toBe('')
    }
  })

  it('says so when the collections could not be listed', () => {
    const prompt = systemPrompt([])
    expect(prompt).toContain('No icon catalogue could be loaded')
    expect(prompt).not.toContain('nih-cells')
  })

  it('understands an icon id however the model wrote it', () => {
    expect(catalogueId('nih-cells--macrophage', PACKS)).toBe('nih-cells--macrophage')
    expect(catalogueId('macrophage', PACKS)).toBe('nih-cells--macrophage')
    expect(catalogueId(' Mast Cell ', PACKS)).toBe('nih-cells--mast-cell')
    // The right entry under the wrong collection is still found.
    expect(catalogueId('nih-lab--macrophage', PACKS)).toBe('nih-cells--macrophage')
    // A collection the AI is not offered is used only when it is named in full.
    const servier = PACKS.find((p) => p.id.startsWith('srv-'))!
    const entry = servier.names.find(([id]) => !aiPacks(PACKS).some((p) => p.names.some((n) => n[0] === id)))![0]
    expect(catalogueId(`${servier.id}--${entry}`, PACKS)).toBe(`${servier.id}--${entry}`)
    expect(catalogueId(entry, PACKS)).toBe('')
    expect(catalogueId('flux-capacitor', PACKS)).toBe('')
    expect(catalogueId('', PACKS)).toBe('')
  })

  it('fetches the collections an answer names, and only those', async () => {
    const asked: string[] = []
    const load = (pack: (typeof PACKS)[number]) => {
      asked.push(pack.id)
      return loadStub(pack)
    }
    const scene = parseScene({
      elements: [
        { id: 'a', kind: 'icon', icon: 'macrophage', label: '', x: 200, y: 500, w: 100, h: 100 },
        { id: 'b', kind: 'icon', icon: 'nih-lab--pill', label: '', x: 500, y: 500, w: 100, h: 100 },
        { id: 'c', kind: 'icon', icon: 'flux-capacitor', label: '', x: 800, y: 500, w: 100, h: 100 },
        { id: 'd', kind: 'box', icon: 'macrophage', label: 'not an icon', x: 800, y: 800, w: 100, h: 50 },
      ],
      connectors: [],
    })
    const ready = await sceneIcons(scene, PACKS, load)
    expect(asked.sort()).toEqual(['nih-cells', 'nih-lab'])
    expect(ready.scene.elements.map((e) => e.icon)).toEqual(['nih-cells--macrophage', 'nih-lab--pill', 'flux-capacitor', 'macrophage'])
    expect(ready.icons('nih-cells--macrophage')?.id).toBe('nih-cells--macrophage')
    expect(ready.icons('flux-capacitor')).toBeUndefined()
    expect(ready.missing).toEqual([])
    // The drawings go into the figure with the nodes that use them.
    const nodes = sceneToNodes(ready.scene, { width: 1200, height: 800 }, undefined, ready.icons)
    expect(Object.keys(iconsUsed(nodes, ready.icons)).sort()).toEqual(['nih-cells--macrophage', 'nih-lab--pill'])
    expect(iconsUsed(nodes, ready.icons)['nih-lab--pill'].category).toBe('Imported')
  })

  it('builds boxes, and says which collection failed, when icons cannot be fetched', async () => {
    const scene = parseScene({ elements: [{ id: 'a', kind: 'icon', icon: 'nih-cells--macrophage', label: '', x: 500, y: 500, w: 100, h: 100 }], connectors: [] })
    const ready = await sceneIcons(scene, PACKS, () => Promise.reject(new Error('offline')))
    expect(ready.missing).toEqual(['NIH BioArt: cells and organelles'])
    const [box] = sceneToNodes(ready.scene, { width: 1200, height: 800 }, undefined, ready.icons) as ShapeNode[]
    expect(box).toMatchObject({ type: 'shape', label: { text: 'macrophage' } })
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
    const nodes = sceneToNodes(parseScene(answer), page, undefined, packIcons)
    const doc: FigDoc = { ...emptyDoc(), nodes, customIcons: iconsUsed(nodes, packIcons) }
    const icons = nodes.filter((n): n is IconNode => n.type === 'icon')
    const shapes = nodes.filter((n): n is ShapeNode => n.type === 'shape')
    const membranes = nodes.filter((n): n is MembraneNode => n.type === 'membrane')
    const texts = nodes.filter((n): n is TextNode => n.type === 'text')
    const links = nodes.filter((n): n is ConnectorNode => n.type === 'connector')

    // The receptor keeps its proportions and is centred where the model put it.
    expect(icons).toHaveLength(1)
    expect(icons[0].iconId).toBe('nih-molecules--receptor')
    expect(icons[0].w / icons[0].h).toBeCloseTo(120 / 80)
    const r = getRect(icons[0], doc)
    expect(r.x + r.w / 2).toBeCloseTo(360)
    expect(r.y + r.h / 2).toBeCloseTo(240)

    // A named protein and an unknown icon both become boxes with their words inside.
    expect(shapes).toHaveLength(2)
    expect(shapes.map((s) => s.label?.text)).toEqual(['ERK', 'flux capacitor'])
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
    const nodes = sceneToNodes(parseScene(answer), { width: 1200, height: 800 }, undefined, packIcons)
    const doc: FigDoc = { ...emptyDoc(), nodes, customIcons: iconsUsed(nodes, packIcons) }
    expect(Object.keys(doc.customIcons)).toEqual(['nih-molecules--receptor'])
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
