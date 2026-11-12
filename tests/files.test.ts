import { describe, expect, it } from 'vitest'
import { attributionLines, attributionText, exportRect, fileBase, renderSvg } from '../src/io/export'
import { parseDoc, serializeDoc, validateDoc } from '../src/io/files'
import { emptyDoc } from '../src/model/doc'
import type { FigDoc, IconDef, IconNode, StrokeNode } from '../src/model/types'
import { TEMPLATES } from '../src/templates'

const parseXml = (xml: string) => {
  const doc = new DOMParser().parseFromString(xml, 'image/svg+xml')
  expect(doc.getElementsByTagName('parsererror')).toHaveLength(0)
  return doc
}

const customIcon: IconDef = {
  id: 'custom-1', name: 'Heart', category: 'Imported', tags: [], viewBox: [50, 50],
  body: '<circle cx="25" cy="25" r="20" fill="#ff0000"/>', license: 'CC BY 4.0', author: 'Servier Medical Art', source: 'https://smart.servier.com',
}
const withCustom = (): FigDoc => {
  const node: IconNode = { id: 'n1', type: 'icon', iconId: 'custom-1', x: 100, y: 100, w: 50, h: 50, rotation: 0, colors: { '#ff0000': '#00ff00' } }
  return { ...emptyDoc('My figure'), nodes: [node], customIcons: { 'custom-1': customIcon } }
}

describe('figure files', () => {
  it('round-trips the example figures unchanged', () => {
    for (const t of TEMPLATES) {
      const doc = t.build()
      expect(parseDoc(serializeDoc(doc)), t.id).toEqual(doc)
    }
  })

  it('round-trips imported icons and colour overrides', () => {
    const doc = withCustom()
    expect(parseDoc(serializeDoc(doc))).toEqual(doc)
  })

  it('rejects files that are not figures', () => {
    expect(() => parseDoc('not json')).toThrow(/JSON/)
    expect(() => parseDoc('{"hello": 1}')).toThrow(/not a BioSketch figure/)
    expect(() => parseDoc('[]')).toThrow()
    expect(() => validateDoc({ version: 99, nodes: [] })).toThrow(/newer version/)
  })

  it('drops broken nodes and repairs bad values', () => {
    const doc = validateDoc({
      nodes: [
        { type: 'icon', iconId: 'cell', x: 'oops', y: 5, w: -3, h: Infinity },
        { type: 'mystery' },
        null,
        { type: 'membrane', points: [{ x: 1, y: 1 }] },
        { type: 'connector', from: { x: 0, y: 0 }, to: 'nowhere' },
        { type: 'text', text: 'ok', fontSize: 99999, align: 'diagonal' },
        { id: 'dup', type: 'shape', shape: 'star' },
        { id: 'dup', type: 'shape' },
      ],
      width: 'wide',
    })
    expect(doc.nodes.map((n) => n.type)).toEqual(['icon', 'text', 'shape'])
    expect(doc.nodes[0]).toMatchObject({ x: 0, y: 5, w: 1, h: 80 })
    expect(doc.nodes[1]).toMatchObject({ fontSize: 400, align: 'left' })
    expect(doc.nodes[2]).toMatchObject({ shape: 'rect' })
    expect(doc.width).toBe(1200)
  })

  it('replaces node ids that are not plain identifiers, so they can never break out of markup', () => {
    const doc = validateDoc({
      nodes: [
        { id: 'x"><img src=x onerror=alert(1)>', type: 'icon', iconId: 'grad', x: 0, y: 0, w: 10, h: 10 },
        { id: 'ok_id-1', groupId: 'bad group"', type: 'shape' },
        { type: 'connector', from: { x: 0, y: 0, nodeId: '"><script>' }, to: { x: 5, y: 5, nodeId: 'ok_id-1' } },
        { type: 'icon', iconId: '"><b>', x: 0, y: 0, w: 1, h: 1 },
      ],
      customIcons: {
        grad: { name: 'g', viewBox: [10, 10], body: '<defs><linearGradient id="g"><stop offset="0" stop-color="#ff0000"/></linearGradient></defs><rect fill="url(#g)" width="5" height="5"/>' },
        '"><i>': { name: 'bad key', viewBox: [10, 10], body: '<rect width="1" height="1"/>' },
      },
    })
    expect(doc.nodes).toHaveLength(3)
    expect(doc.nodes[0].id).toMatch(/^[\w-]+$/)
    expect(doc.nodes[1]).toMatchObject({ id: 'ok_id-1' })
    expect(doc.nodes[1].groupId).toBeUndefined()
    expect(doc.nodes[2]).toMatchObject({ from: { x: 0, y: 0 }, to: { nodeId: 'ok_id-1' } })
    expect(Object.keys(doc.customIcons)).toEqual(['grad'])
    const svg = renderSvg(doc, { area: 'page', transparent: false, includeSketch: true }).svg
    expect(svg).not.toMatch(/onerror|<img|<script/)
    expect(parseXml(svg).getElementsByTagName('linearGradient')[0].getAttribute('id')).toMatch(/^i[\w-]+-g$/)
  })

  it('neutralises markup hidden in a file', () => {
    const doc = validateDoc({
      nodes: [
        { type: 'icon', iconId: 'evil', x: 0, y: 0, w: 10, h: 10, colors: { '#ff0000': '"><script>alert(1)</script>', 'x': '#000000' } },
        { type: 'shape', fill: '"/><script>alert(2)</script>', stroke: 'red' },
      ],
      customIcons: {
        evil: { name: 'x', viewBox: [10, 10], body: '<rect width="5" height="5" onload="alert(3)"/><script>alert(4)</script>' },
        broken: { name: 'y', viewBox: [10, 10], body: '<rect' },
      },
      background: 'url(javascript:alert(5))<',
    })
    const text = JSON.stringify(doc)
    expect(text).not.toMatch(/script|onload|alert/)
    expect(doc.customIcons.evil.body).toContain('<rect')
    expect(doc.customIcons.broken).toBeUndefined()
    expect((doc.nodes[0] as IconNode).colors).toBeUndefined()
    expect(doc.nodes[1]).toMatchObject({ fill: '#ffffff', stroke: 'red' })
    expect(doc.background).toBe('#ffffff')
    const svg = renderSvg(doc, { area: 'page', transparent: false, includeSketch: true }).svg
    expect(svg).not.toMatch(/script|onload|alert/)
  })
})

describe('export', () => {
  it('produces well-formed SVG for the example figures', () => {
    for (const t of TEMPLATES) {
      const doc = t.build()
      const { svg, width, height } = renderSvg(doc, { area: 'page', transparent: false, includeSketch: true })
      const xml = parseXml(svg)
      expect(xml.documentElement.getAttribute('viewBox')).toBe(`0 0 ${doc.width} ${doc.height}`)
      expect([width, height]).toEqual([doc.width, doc.height])
      expect(svg).not.toContain('data-id')
      expect(svg).not.toContain('transparent')
      expect(xml.getElementsByTagName('title')[0].textContent).toBe(doc.name)
      expect(xml.getElementsByTagName('path').length).toBeGreaterThan(5)
    }
  })

  it('escapes text that looks like markup', () => {
    const doc: FigDoc = {
      ...emptyDoc('A & B <test>'),
      nodes: [{ id: 't', type: 'text', x: 10, y: 10, text: 'p53 < MDM2 & "x"', fontSize: 16, fill: '#000', align: 'left', rotation: 0 }],
    }
    const xml = parseXml(renderSvg(doc, { area: 'page', transparent: false, includeSketch: true }).svg)
    expect(xml.getElementsByTagName('tspan')[0].textContent).toBe('p53 < MDM2 & "x"')
  })

  it('can crop to the drawing, drop the background and leave out the sketch', () => {
    const stroke: StrokeNode = { id: 's', type: 'stroke', points: [[900, 700, 0.5], [950, 750, 0.5]], color: '#000', size: 4 }
    const doc = { ...withCustom(), nodes: [...withCustom().nodes, stroke] }
    expect(exportRect(doc, 'content', false)).toEqual({ x: 84, y: 84, w: 82, h: 82 })
    expect(exportRect(doc, 'content', true).w).toBeGreaterThan(800)
    expect(exportRect(emptyDoc(), 'content')).toEqual({ x: 0, y: 0, w: 1200, h: 800 })
    const bare = renderSvg(doc, { area: 'content', transparent: true, includeSketch: false }).svg
    expect(bare).not.toContain('<rect x="84"')
    expect(parseXml(bare).getElementsByTagName('path')).toHaveLength(0)
    const full = renderSvg(doc, { area: 'page', transparent: false, includeSketch: true }).svg
    expect(parseXml(full).getElementsByTagName('path')).toHaveLength(1)
  })

  it('applies colour overrides in the exported file', () => {
    const svg = renderSvg(withCustom(), { area: 'page', transparent: false, includeSketch: true }).svg
    expect(svg).toContain('fill="#00ff00"')
    expect(svg).not.toContain('fill="#ff0000"')
  })

  it('credits icons that need it and only those', () => {
    const doc = withCustom()
    expect(attributionLines(doc)).toEqual(['"Heart" by Servier Medical Art (https://smart.servier.com), licence: CC BY 4.0'])
    expect(renderSvg(doc, { area: 'page', transparent: false, includeSketch: true }).svg).toContain('<desc>Created with BioSketch. Icons:')
    for (const t of TEMPLATES) expect(attributionText(t.build())).toBe('')
    const unknown = { ...doc, customIcons: { 'custom-1': { ...customIcon, license: '', author: '' } } }
    expect(attributionLines(unknown)[0]).toContain('unknown author')
  })

  it('builds safe file names', () => {
    expect(fileBase({ ...emptyDoc(), name: 'My Figure: v2/final' })).toBe('my-figure-v2final')
    expect(fileBase({ ...emptyDoc(), name: '///' })).toBe('figure')
  })
})
