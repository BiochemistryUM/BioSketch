// The library is made of publicly available collections only. These tests read the real pack list
// (public/icon-packs/index.json) and check what the library, the examples and older figures rely on.

import { describe, expect, it } from 'vitest'
import shapesRaw from '../public/icon-packs/nih-shapes.json?raw'
import { getIcon } from '../src/icons/library'
import { DEFAULT_PACK, groupPacks, packOf, readPack, searchPackNames, type PackInfo } from '../src/icons/packs'
import { shapesToPaths } from '../src/icons/reshape'
import { extractParts } from '../src/icons/split'
import { attributionText, renderSvg } from '../src/io/export'
import { validateDoc } from '../src/io/files'
import { emptyDoc } from '../src/model/doc'
import type { FigDoc, IconNode } from '../src/model/types'
import { buildTemplate, TEMPLATES } from '../src/templates'
import { loadStub, PACKS } from './helpers'

const pack = (id: string, name: string): PackInfo => ({ id, name, licence: 'CC0', source: '', count: 1, file: `${id}.json`, names: [['thing', 'Thing', '']] })

describe('the collections the library is made of', () => {
  it('are NIH BioArt, Bioicons and Servier, with NIH BioArt first', () => {
    const groups = groupPacks(PACKS)
    expect(groups.map((g) => g.source)).toEqual(['NIH BioArt', 'Bioicons', 'Servier'])
    expect(groups[0].packs.map((p) => p.label)).toContain('Cells and organelles')
    expect(groups.flatMap((g) => g.packs)).toHaveLength(PACKS.length)
    // The collection the library opens with exists.
    expect(PACKS.some((p) => p.id === DEFAULT_PACK)).toBe(true)
  })

  it('groups packs by the name before the colon and keeps the rest together', () => {
    const groups = groupPacks([pack('a-one', 'Alpha: one'), pack('odd', 'No colon here'), pack('a-two', 'Alpha: two'), pack(DEFAULT_PACK, 'Beta: cells')])
    expect(groups.map((g) => [g.source, g.packs.map((p) => p.label)])).toEqual([
      ['Beta', ['Cells']],
      ['Alpha', ['One', 'Two']],
      ['Other collections', ['No colon here']],
    ])
    expect(groupPacks([])).toEqual([])
  })

  it('tells which collection an icon id belongs to', () => {
    expect(packOf('nih-cells--macrophage')).toBe('nih-cells')
    expect(packOf('srv-body-1--abdominal-aorta-2')).toBe('srv-body-1')
    expect(packOf('mitochondrion')).toBe('')
    expect(packOf('imported-abc')).toBe('')
    expect(packOf('part-x1y2')).toBe('')
  })

  it('keep every icon id within what a figure can store', () => {
    for (const p of PACKS) {
      for (const [id] of p.names) expect(`${p.id}--${id}`).toMatch(/^[\w-]{3,64}$/)
    }
  })

  it('are what a search looks through', () => {
    const hits = searchPackNames(PACKS, 'macrophage')
    expect(hits.length).toBeGreaterThan(3)
    expect(hits.every((h) => packOf(h.id) !== '')).toBe(true)
    expect(hits[0].id).toMatch(/^nih-cells--macrophage/)
  })
})

describe('example figures', () => {
  it('use icons the collections really have', () => {
    const known = new Set(PACKS.flatMap((p) => p.names.map((n) => `${p.id}--${n[0]}`)))
    for (const t of TEMPLATES) {
      // The example figures and the templates with pictures name their icons; a graphical abstract and a poster start without any.
      if (!t.group) expect(t.icons.length, t.id).toBeGreaterThan(0)
      for (const id of t.icons) expect(known.has(id), `${t.id}: ${id}`).toBe(true)
    }
    expect(TEMPLATES.filter((t) => t.group === 'Posters').every((t) => t.icons.length === 0)).toBe(true)
  })

  it('are built once their icons are fetched, and carry the drawings with them', async () => {
    for (const t of TEMPLATES) {
      const asked: string[] = []
      const doc = await buildTemplate(t, PACKS, (p) => {
        asked.push(p.id)
        return loadStub(p)
      })
      expect(asked.sort(), t.id).toEqual([...new Set(t.icons.map(packOf))].sort())
      const used = doc.nodes.filter((n): n is IconNode => n.type === 'icon').map((n) => n.iconId)
      expect([...new Set(used)].sort(), t.id).toEqual([...t.icons].sort())
      expect(Object.keys(doc.customIcons).sort(), t.id).toEqual([...t.icons].sort())
      // Every icon comes from a collection, the figure is a valid file, and it needs no credit line.
      expect(used.every((id) => packOf(id) !== ''), t.id).toBe(true)
      expect(validateDoc(JSON.parse(JSON.stringify(doc))), t.id).toEqual(doc)
      expect(attributionText(doc), t.id).toBe('')
    }
  })

  it('say so when the icons cannot be fetched', async () => {
    await expect(buildTemplate(TEMPLATES[0], PACKS, () => Promise.reject(new Error('offline')))).rejects.toThrow()
    await expect(buildTemplate(TEMPLATES[0], [], loadStub)).rejects.toThrow('could not be loaded')
  })
})

describe('real drawings from a collection', () => {
  // The smallest NIH pack, read the way the app reads it.
  const pack = PACKS.find((p) => p.id === 'nih-shapes')!
  const icons = readPack(JSON.parse(shapesRaw), pack)

  it('all pass the cleaning the app applies to third-party artwork', () => {
    expect(icons).toHaveLength(pack.count)
    for (const icon of icons) {
      expect(icon.id, icon.id).toMatch(/^nih-shapes--[\w-]+$/)
      expect(icon.license, icon.id).toBe('Public domain')
      expect(icon.source, icon.id).toMatch(/^https:\/\/bioart\.niaid\.nih\.gov\/bioart\/\d+$/)
      expect(icon.viewBox[0] > 0 && icon.viewBox[1] > 0, icon.id).toBe(true)
      expect(icon.body, icon.id).not.toMatch(/<script|<image|<filter|ns0:|javascript:/i)
    }
  })

  it('can be split into pieces and turned into paths for reshaping', () => {
    const wellFormed = (markup: string) => new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`, 'image/svg+xml').getElementsByTagName('parsererror').length === 0
    let split = 0
    for (const icon of icons) {
      const found = extractParts(icon.body)
      if (found) {
        split++
        expect(found.parts.length, icon.id).toBeGreaterThan(0)
        // Each piece, put back in its wrapping group, is well-formed markup.
        expect(wellFormed(found.defs + found.open + found.parts[0] + found.close), icon.id).toBe(true)
      }
      expect(wellFormed(shapesToPaths(icon.body)), icon.id).toBe(true)
    }
    expect(split).toBeGreaterThan(icons.length / 2)
  })
})

describe('a figure made with the drawings BioSketch used to offer', () => {
  // Those 353 drawings were deleted in November 2026; such a figure names them by id.
  const old: FigDoc = {
    ...emptyDoc('Older figure'),
    nodes: [
      { id: 'n1', type: 'icon', iconId: 'mitochondrion', x: 100, y: 100, w: 130, h: 65, rotation: 0 },
      { id: 'n2', type: 'connector', from: { x: 0, y: 0, nodeId: 'n1' }, to: { x: 400, y: 130 }, kind: 'arrow', stroke: '#2b2f36', strokeWidth: 2 },
    ],
  }

  it('still opens: the icon keeps its place and is drawn as a placeholder', () => {
    const opened = validateDoc(JSON.parse(JSON.stringify({ ...old, iconStyle: 'flat' })))
    expect(opened.nodes).toEqual(old.nodes)
    // The setting that chose between the two looks of those drawings is dropped.
    expect('iconStyle' in opened).toBe(false)
    expect(getIcon(opened, 'mitochondrion')).toBeUndefined()
    const svg = renderSvg(opened, { area: 'page', transparent: false, includeSketch: true }).svg
    const xml = new DOMParser().parseFromString(svg, 'image/svg+xml')
    expect(xml.getElementsByTagName('parsererror')).toHaveLength(0)
    expect(svg).toContain('stroke-dasharray="5 4"')
    expect(attributionText(opened)).toBe('')
  })

  it('does not share an id with any icon of the collections', () => {
    const known = new Set(PACKS.flatMap((p) => p.names.map((n) => `${p.id}--${n[0]}`)))
    for (const id of ['mitochondrion', 'macrophage', 'receptor-dimer', 'dna']) expect(known.has(id), id).toBe(false)
  })
})
