// Text written inside a shape, and line styles (dashed, dotted, long dashes, dash and dot) for
// arrows and outlines.

import { describe, expect, it } from 'vitest'
import { applyRevision, docToScene } from '../src/ai/revise'
import { renderSvg } from '../src/io/export'
import { validateDoc } from '../src/io/files'
import { dashArray, hasDots, lineStyleOf, lineStylePatch, type LineStyle } from '../src/model/dash'
import { nodeLabel } from '../src/model/describe'
import { emptyDoc, labelPartner } from '../src/model/doc'
import { growToFitLabel, measureText, resolveConnector, scaleNode, shapeLabelNode, shapeTextWidth, wrapText } from '../src/model/nodes'
import { SYMBOL_GROUPS, formatRich, insertText, parseRich } from '../src/model/richtext'
import { SHAPE_KINDS, outlineAlong, shapeCorners, shapePath, shapeTextArea } from '../src/model/shapes'
import { TEMPLATES } from '../src/templates'
import { example } from './helpers'
import type { ConnectorNode, FigDoc, FigNode, ShapeKind, ShapeNode, TextNode } from '../src/model/types'

const box = (extra: Partial<ShapeNode> = {}): ShapeNode => ({
  id: 's', type: 'shape', shape: 'roundrect', x: 100, y: 200, w: 160, h: 80, rotation: 0, fill: '#e3f3ef', stroke: '#1f8f84', strokeWidth: 2, ...extra,
})
const arrow = (extra: Partial<ConnectorNode> = {}): ConnectorNode => ({
  id: 'c', type: 'connector', from: { x: 10, y: 20 }, to: { x: 210, y: 20 }, kind: 'arrow', stroke: '#2b2f36', strokeWidth: 2, ...extra,
})
const docOf = (...nodes: FigNode[]): FigDoc => ({ ...emptyDoc(), nodes })
const options = { area: 'page' as const, transparent: false, includeSketch: true }
const saved = <T extends FigNode>(node: object): T => validateDoc(JSON.parse(JSON.stringify(docOf(node as FigNode)))).nodes[0] as T
const words = { text: 'GPX4', fontSize: 16, fill: '#2b2f36' }

describe('line styles', () => {
  it('are one word for the panel and three fields in the figure', () => {
    expect(lineStyleOf({})).toBe('solid')
    expect(lineStyleOf({ dashed: true })).toBe('dashed')
    expect(lineStyleOf({ dashed: true, dashStyle: 'dotted' })).toBe('dotted')
    // A pattern without the switch means nothing.
    expect(lineStyleOf({ dashStyle: 'long' })).toBe('solid')
    for (const style of ['solid', 'dashed', 'dotted', 'long', 'dashdot'] as LineStyle[]) {
      // Choosing a style replaces the old one completely, dash size included.
      const next = { ...{ dashed: true as const, dashStyle: 'long' as const, dashScale: 2 }, ...lineStylePatch(style) }
      expect(lineStyleOf(next)).toBe(style)
      expect(next.dashScale).toBeUndefined()
    }
  })

  it('keep plain dashes exactly as they were drawn before', () => {
    expect(dashArray({ dashed: true, strokeWidth: 2 })).toBe('7 6')
    expect(dashArray({ dashed: true, strokeWidth: 2 }, true)).toBe('7 5')
    expect(dashArray({ strokeWidth: 2 })).toBeUndefined()
    expect(dashArray({ dashStyle: 'dotted', strokeWidth: 2 })).toBeUndefined()
  })

  it('give each pattern its own dashes, sized by the thickness of the line', () => {
    expect(dashArray({ dashed: true, dashStyle: 'dotted', strokeWidth: 2 })).toBe('0.01 4.8')
    expect(dashArray({ dashed: true, dashStyle: 'long', strokeWidth: 2 })).toBe('16 7')
    expect(dashArray({ dashed: true, dashStyle: 'dashdot', strokeWidth: 2 })).toBe('12 6 0.01 6')
    expect(dashArray({ dashed: true, dashStyle: 'long', strokeWidth: 5 })).toBe('40 17.5')
    expect(hasDots({ dashed: true, dashStyle: 'dotted' })).toBe(true)
    expect(hasDots({ dashed: true, dashStyle: 'dashdot' })).toBe(true)
    expect(hasDots({ dashed: true })).toBe(false)
    expect(hasDots({ dashStyle: 'dotted' })).toBe(false)
  })

  it('make dashes and gaps larger or smaller, within limits, and never stretch a dot', () => {
    expect(dashArray({ dashed: true, dashScale: 2, strokeWidth: 2 })).toBe('14 12')
    expect(dashArray({ dashed: true, dashScale: 0.5, strokeWidth: 2 })).toBe('3.5 3')
    expect(dashArray({ dashed: true, dashStyle: 'dotted', dashScale: 2, strokeWidth: 2 })).toBe('0.01 9.6')
    expect(dashArray({ dashed: true, dashScale: 50, strokeWidth: 2 })).toBe('21 18')
    expect(dashArray({ dashed: true, dashScale: 0, strokeWidth: 2 })).toBe('3.5 3')
  })

  it('are drawn and exported, with round ends wherever there are dots', () => {
    const dotted = renderSvg(docOf(arrow({ dashed: true, dashStyle: 'dotted' })), options).svg
    expect(dotted).toMatch(/<path [^>]*stroke-linecap="round"[^>]*stroke-dasharray="0.01 4.8"/)
    // A fading line normally ends square; with dots it must stay round or the dots vanish.
    const fading = renderSvg(docOf(arrow({ dashed: true, dashStyle: 'dashdot', fade: 'in' })), options).svg
    expect(fading).toMatch(/<path [^>]*stroke-linecap="round"[^>]*stroke-dasharray="12 6 0.01 6"/)
    expect(renderSvg(docOf(arrow({ dashed: true, dashStyle: 'long', fade: 'in' })), options).svg).toMatch(/stroke-linecap="butt"[^>]*stroke-dasharray="16 7"/)
    const outline = renderSvg(docOf(box({ dashed: true, dashStyle: 'dotted', dashScale: 2 })), options).svg
    expect(outline).toMatch(/<rect [^>]*stroke-dasharray="0.01 9.6"[^>]*stroke-linecap="round"/)
    expect(renderSvg(docOf(box({ dashed: true })), options).svg).toMatch(/<rect [^>]*stroke-dasharray="7 5"/)
    expect(renderSvg(docOf(box()), options).svg).not.toContain('stroke-dasharray')
  })

  it('survive saving, and a figure saved before they existed opens unchanged', () => {
    expect(saved<ConnectorNode>(arrow({ dashed: true, dashStyle: 'dashdot', dashScale: 1.5 }))).toMatchObject({ dashed: true, dashStyle: 'dashdot', dashScale: 1.5 })
    expect(saved<ShapeNode>(box({ dashed: true, dashStyle: 'long' }))).toMatchObject({ dashed: true, dashStyle: 'long' })
    const old = saved<ConnectorNode>(arrow({ dashed: true }))
    expect(old.dashed).toBe(true)
    expect('dashStyle' in old || 'dashScale' in old).toBe(false)
    // Junk is dropped, sizes are kept in range, and a pattern on a solid line is forgotten.
    const junk = saved<ConnectorNode>({ ...arrow({ dashed: true }), dashStyle: 'zigzag', dashScale: 99 })
    expect(junk.dashStyle).toBeUndefined()
    expect(junk.dashScale).toBe(3)
    expect('dashStyle' in saved<ShapeNode>({ ...box(), dashStyle: 'dotted', dashScale: 2 })).toBe(false)
  })
})

describe('text inside a shape', () => {
  it('is a label centred in the shape that carries the shape\'s id', () => {
    expect(shapeLabelNode(box())).toBeNull()
    const label = shapeLabelNode(box({ label: { ...words, bold: true } }))!
    expect(label).toMatchObject({ id: 's', type: 'text', text: 'GPX4', align: 'center', x: 180, fontSize: 16, bold: true, rotation: 0 })
    const m = measureText(label)
    expect(label.y + m.h / 2).toBeCloseTo(240)
    // More lines grow from the middle, and the words follow the shape wherever it goes.
    const two = shapeLabelNode(box({ label: { ...words, text: 'GPX4\nactive' } }))!
    expect(two.y + measureText(two).h / 2).toBeCloseTo(240)
    expect(two.y).toBeLessThan(label.y)
    expect(shapeLabelNode(box({ x: 500, y: 0, label: words }))!.x).toBe(580)
  })

  it('is drawn inside the shape, on the page and in exports alike', () => {
    const svg = renderSvg(docOf(box({ label: { ...words, text: 'Ca^{2+} store' }, rotation: 30 })), options).svg
    // The words sit in the shape's own (turned) group, after its outline.
    expect(svg).toMatch(/<g[^>]*transform="rotate\(30[^>]*>\s*<rect[^>]*>(<\/rect>)?\s*<g[^>]*>\s*<text[^>]*text-anchor="middle"/)
    expect(svg).toContain('>Ca<')
    expect(svg).toContain('>2+<')
    expect(renderSvg(docOf(box()), options).svg).not.toContain('<text')
    expect(renderSvg(docOf(box({ shape: 'ellipse', label: words })), options).svg).toMatch(/<ellipse[\s\S]*<text[\s\S]*GPX4/)
  })

  it('is kept in a saved figure, rebuilt field by field', () => {
    expect(saved<ShapeNode>(box({ label: { ...words, bold: true } })).label).toEqual({ text: 'GPX4', fontSize: 16, fill: '#2b2f36', bold: true })
    const odd = saved<ShapeNode>({ ...box(), label: { text: 'x'.repeat(5000), fontSize: 9999, fill: 'javascript:alert(1)', bold: 'yes', extra: true } })
    expect(odd.label).toEqual({ text: 'x'.repeat(2000), fontSize: 400, fill: '#2b2f36' })
    expect('label' in saved<ShapeNode>({ ...box(), label: { text: '   ', fontSize: 16, fill: '#000000' } })).toBe(false)
    expect('label' in saved<ShapeNode>({ ...box(), label: 'GPX4' })).toBe(false)
    expect('label' in saved<ShapeNode>(box())).toBe(false)
  })

  it('names the shape in the objects list and grows with it when a group is resized', () => {
    expect(nodeLabel(box({ label: { ...words, text: 'Ca^{2+} store' } }))).toBe('Rounded rectangle “Ca2+ store”')
    expect(nodeLabel(box())).toBe('Rounded rectangle')
    const doc = docOf(box({ label: words }))
    const bigger = scaleNode(doc.nodes[0] as ShapeNode, 2, { x: 100, y: 200 }, doc)
    expect(bigger).toMatchObject({ w: 320, h: 160, label: { text: 'GPX4', fontSize: 32 } })
    expect(scaleNode(box(), 2, { x: 0, y: 0 }, docOf(box())).label).toBeUndefined()
  })

  it('is what the AI reads as the shape\'s label, and what it changes', () => {
    const doc: FigDoc = { ...emptyDoc(), width: 1000, height: 1000, nodes: [box({ label: words })] }
    const snap = docToScene(doc)
    expect(snap.scene.elements[0]).toMatchObject({ kind: 'box', label: 'GPX4' })
    const renamed = applyRevision(doc, snap, { ...snap.scene, elements: [{ ...snap.scene.elements[0], label: 'GPX4 (active)' }] })
    expect(renamed.nodes).toHaveLength(1)
    expect((renamed.nodes[0] as ShapeNode).label).toEqual({ ...words, text: 'GPX4 (active)' })
    const cleared = applyRevision(doc, snap, { ...snap.scene, elements: [{ ...snap.scene.elements[0], label: '' }] })
    expect(cleared.nodes).toHaveLength(1)
    expect('label' in cleared.nodes[0]).toBe(false)
  })
})

describe('breaking text into lines', () => {
  // Without a real font (in tests) every letter is 0.55 of the font size wide: 8.8 at size 16.
  const font = { fontSize: 16 }

  it('writes formatted runs back as the marks they came from', () => {
    for (const line of ['plain words', 'Ca^{2+} and H_{2}O', '*GPX4* expression', '**bold** then *italic*', '***both*** x', '**Ca^{2+}** store', 'p < 0.05 *', 'a \\* b', '***']) {
      expect(parseRich(formatRich(parseRich(line))), line).toEqual(parseRich(line))
    }
  })

  it('breaks at spaces, keeps typed line breaks, and never splits a word', () => {
    expect(wrapText('Lipid peroxidation product', font, 142)).toBe('Lipid\nperoxidation\nproduct')
    expect(wrapText('one two three four', font, 80)).toBe('one two\nthree\nfour')
    expect(wrapText('short', font, 142)).toBe('short')
    expect(wrapText('first line\nsecond', font, 142)).toBe('first line\nsecond')
    expect(wrapText('Phosphatidylethanolamine', font, 50)).toBe('Phosphatidylethanolamine')
    expect(wrapText('', font, 50)).toBe('')
  })

  it('carries formatting across a break and keeps a superscript with its word', () => {
    // The italic phrase is broken in two: each line gets its own pair of stars.
    const lines = wrapText('*Mycobacterium tuberculosis* grows', font, 120).split('\n')
    expect(lines).toEqual(['*Mycobacterium*', '*tuberculosis*', 'grows'])
    expect(parseRich(lines[1])[0]).toMatchObject({ text: 'tuberculosis', italic: true })
    expect(wrapText('free Ca^{2+} rises quickly', font, 90)).toBe('free Ca^{2+}\nrises\nquickly')
  })
})

describe('text inside a shape: fitting and placing', () => {
  const long = { ...words, text: 'Lipid peroxidation product' }

  it('breaks lines to fit the shape and gives them back when the shape is widened', () => {
    expect(shapeTextWidth(box())).toBe(142)
    const narrow = shapeLabelNode(box({ label: long }))!
    expect(narrow.text).toBe('Lipid\nperoxidation\nproduct')
    // Three lines, still centred from top to bottom.
    expect(narrow.y + measureText(narrow).h / 2).toBeCloseTo(240)
    expect(shapeLabelNode(box({ w: 400, label: long }))!.text).toBe('Lipid peroxidation product')
    // An ellipse has less room than a box of the same size.
    expect(shapeTextWidth(box({ shape: 'ellipse' }))).toBeLessThan(shapeTextWidth(box()))
    // What is stored is what was typed: the breaks are only in the drawing.
    expect(saved<ShapeNode>(box({ label: long })).label!.text).toBe('Lipid peroxidation product')
  })

  it('places the lines left, centre or right, in the chosen font', () => {
    expect(shapeLabelNode(box({ label: words }))).toMatchObject({ align: 'center', x: 180 })
    expect(shapeLabelNode(box({ label: { ...words, align: 'left' } }))).toMatchObject({ align: 'left', x: 109 })
    expect(shapeLabelNode(box({ label: { ...words, align: 'right' } }))).toMatchObject({ align: 'right', x: 251 })
    expect(shapeLabelNode(box({ label: { ...words, italic: true, fontFamily: 'serif' } }))).toMatchObject({ italic: true, fontFamily: 'serif' })
    const svg = renderSvg(docOf(box({ label: { ...words, align: 'left', fontFamily: 'mono', italic: true } })), options).svg
    expect(svg).toMatch(/<text[^>]*font-style="italic"[^>]*text-anchor="start"/)
    expect(svg).toContain('monospace')
  })

  it('keeps position, font and italic in a saved figure', () => {
    expect(saved<ShapeNode>(box({ label: { ...words, align: 'right', fontFamily: 'serif', italic: true } })).label).toEqual({ ...words, align: 'right', fontFamily: 'serif', italic: true })
    const plain = saved<ShapeNode>({ ...box(), label: { ...words, align: 'center', fontFamily: 'sans', italic: false } }).label!
    expect(Object.keys(plain).sort()).toEqual(['fill', 'fontSize', 'text'])
    expect(saved<ShapeNode>({ ...box(), label: { ...words, align: 'diagonal', fontFamily: 'comic' } }).label).toEqual(words)
  })
})

describe('boxes made by BioSketch', () => {
  it('finds the separate label of a box from an older figure', () => {
    const shape = box({ groupId: 'g' })
    const text: TextNode = { id: 't', type: 'text', groupId: 'g', x: 180, y: 230, text: 'AKT', fontSize: 16, fill: '#000000', align: 'center', rotation: 0 }
    expect(labelPartner(docOf(shape, text), shape)).toBe(text)
    // Not when the group holds more than the two, and not without a group.
    expect(labelPartner(docOf(shape, text, { ...text, id: 't2' }), shape)).toBeUndefined()
    expect(labelPartner(docOf(box(), text), box())).toBeUndefined()
    expect(labelPartner(docOf(shape, box({ id: 's2', groupId: 'g' })), shape)).toBeUndefined()
  })

  it('carry their names inside in the example figures', () => {
    // The example figures; the templates also hold frames and banners without words.
    for (const template of TEMPLATES.filter((t) => !t.group)) {
      const shapes = example(template).nodes.filter((n): n is ShapeNode => n.type === 'shape')
      expect(shapes.length, template.id).toBeGreaterThan(0)
      for (const shape of shapes) {
        expect(shape.label?.text, template.id).toBeTruthy()
        expect(shape.groupId).toBeUndefined()
      }
    }
  })
})

describe('more kinds of shape', () => {
  const PATHS: ShapeKind[] = ['triangle', 'diamond', 'hexagon', 'cylinder', 'callout', 'bracket']

  it('offers nine kinds, six of them drawn as a path of their own', () => {
    expect(SHAPE_KINDS).toHaveLength(9)
    expect(new Set(SHAPE_KINDS).size).toBe(9)
    for (const kind of SHAPE_KINDS) {
      const path = shapePath(kind, 100, 200, 160, 80)
      expect(path === null, kind).toBe(!PATHS.includes(kind))
      if (!path) continue
      expect(path, kind).not.toMatch(/NaN|undefined|Infinity/)
      expect(path.startsWith('M'), kind).toBe(true)
      // A bracket is an open line; every other outline closes.
      expect(path.includes('Z'), kind).toBe(kind !== 'bracket')
    }
  })

  it('keeps every corner inside the box the shape is drawn in', () => {
    for (const kind of ['triangle', 'diamond', 'hexagon', 'callout'] as ShapeKind[]) {
      const corners = shapeCorners(kind, 160, 80)!
      expect(corners.length, kind).toBeGreaterThanOrEqual(3)
      for (const c of corners) {
        expect(c.x >= 0 && c.x <= 160 && c.y >= 0 && c.y <= 80, `${kind} ${c.x},${c.y}`).toBe(true)
      }
    }
    expect(shapeCorners('rect', 160, 80)).toBeNull()
    expect(shapeCorners('ellipse', 160, 80)).toBeNull()
    expect(shapePath('triangle', 0, 0, 100, 60)).toBe('M50 0L100 60L0 60Z')
    expect(shapePath('diamond', 10, 20, 100, 60)).toBe('M60 20L110 50L60 80L10 50Z')
  })

  it('finds where the outline lies in any direction from the middle', () => {
    // A triangle 100 wide and 60 tall: the tip is 30 above the middle, the slanted side 25 to the right of it.
    expect(outlineAlong('triangle', 100, 60, { x: 0, y: -1 })).toBeCloseTo(30)
    expect(outlineAlong('triangle', 100, 60, { x: 1, y: 0 })).toBeCloseTo(25)
    expect(outlineAlong('triangle', 100, 60, { x: 0, y: 1 })).toBeCloseTo(30)
    // A diamond reaches its box only at the four points.
    expect(outlineAlong('diamond', 100, 60, { x: 1, y: 0 })).toBeCloseTo(50)
    expect(outlineAlong('diamond', 100, 60, { x: 50, y: 30 })).toBeCloseTo(0.5)
    // Leaving a gap moves the outline outwards.
    expect(outlineAlong('diamond', 100, 60, { x: 1, y: 0 }, 6)).toBeCloseTo(56)
    // Kinds that fill their box are left to the caller.
    expect(outlineAlong('rect', 100, 60, { x: 1, y: 0 })).toBeNull()
    expect(outlineAlong('cylinder', 100, 60, { x: 1, y: 0 })).toBeNull()
  })

  it('ends an arrow on the slanted side of a diamond, not at the corner of its box', () => {
    const link: ConnectorNode = { id: 'c', type: 'connector', from: { x: 0, y: 0, nodeId: 's' }, to: { x: 400, y: 440 }, kind: 'arrow', stroke: '#000000', strokeWidth: 2 }
    const start = (shape: ShapeKind): { x: number; y: number } => resolveConnector(link, docOf(box({ shape, x: 100, y: 200, w: 160, h: 80 }), link)).from
    const [onBox, onDiamond] = [start('rect'), start('diamond')]
    // Both leave towards the lower right; the diamond's side is nearer the middle than the box's edge.
    const far = (p: { x: number; y: number }): number => Math.hypot(p.x - 180, p.y - 240)
    expect(far(onDiamond)).toBeLessThan(far(onBox) - 15)
    expect(onDiamond.x).toBeGreaterThan(180)
    expect(onDiamond.y).toBeGreaterThan(240)
    // Right-angled arrows leave a triangle at its slanted side too, not at the edge of its box.
    const elbow = resolveConnector({ ...link, route: 'elbow', to: { x: 600, y: 250 } }, docOf(box({ shape: 'triangle', x: 100, y: 200, w: 160, h: 80 }), link))
    expect(elbow.from.x).toBeLessThan(260)
    expect(elbow.from.x).toBeGreaterThan(215)
  })

  it('puts the words where the shape has room for them', () => {
    expect(shapeTextArea('rect', 160, 80)).toEqual({ width: 1, middle: 0.5, height: 1 })
    expect(shapeTextArea('triangle', 160, 80).middle).toBeGreaterThan(0.6)
    expect(shapeTextArea('callout', 160, 80).middle).toBeLessThan(0.45)
    expect(shapeTextArea('cylinder', 160, 80).middle).toBeGreaterThan(0.5)
    expect(shapeTextWidth(box({ shape: 'triangle' }))).toBe(80)
    expect(shapeTextWidth(box({ shape: 'hexagon' }))).toBe(120)
    expect(shapeTextWidth(box({ shape: 'cylinder' }))).toBe(142)
    const inTriangle = shapeLabelNode(box({ shape: 'triangle', label: words }))!
    const inBox = shapeLabelNode(box({ label: words }))!
    expect(inTriangle.y).toBeGreaterThan(inBox.y)
    expect(shapeLabelNode(box({ shape: 'callout', label: words }))!.y).toBeLessThan(inBox.y)
  })

  it('is drawn, named, saved and exported like any shape', () => {
    const svg = renderSvg(docOf(box({ shape: 'hexagon', label: words })), options).svg
    expect(svg).toMatch(/<path d="M[^"]+Z"[^>]*fill="#e3f3ef"/)
    expect(svg).toContain('GPX4')
    // A bracket is never filled, whatever fill the shape carries.
    expect(renderSvg(docOf(box({ shape: 'bracket' })), options).svg).toMatch(/<path d="M[^"]+"[^>]*fill="none"/)
    expect(nodeLabel(box({ shape: 'cylinder' }))).toBe('Cylinder')
    expect(nodeLabel(box({ shape: 'callout', label: words }))).toBe('Callout “GPX4”')
    for (const kind of SHAPE_KINDS) expect(saved<ShapeNode>(box({ shape: kind })).shape).toBe(kind)
    expect(saved<ShapeNode>({ ...box(), shape: 'star' }).shape).toBe('rect')
  })
})

describe('symbols', () => {
  it('go in at the cursor, or over what is selected', () => {
    expect(insertText('TNF', 3, 3, 'α')).toEqual({ text: 'TNFα', caret: 4 })
    expect(insertText('5 uM', 2, 3, 'µ')).toEqual({ text: '5 µM', caret: 3 })
    expect(insertText('A B', 1, 2, '→')).toEqual({ text: 'A→B', caret: 2 })
    expect(insertText('', 0, 0, '°')).toEqual({ text: '°', caret: 1 })
    // A selection given backwards or past the end is still understood.
    expect(insertText('abc', 3, 1, 'β')).toEqual({ text: 'aβ', caret: 2 })
    expect(insertText('abc', 99, 99, 'γ')).toEqual({ text: 'abcγ', caret: 4 })
  })

  it('are offered once each, one character at a time, in a few groups', () => {
    const all = SYMBOL_GROUPS.flatMap((g) => g.symbols)
    expect(new Set(all).size).toBe(all.length)
    for (const symbol of all) expect([...symbol], symbol).toHaveLength(1)
    for (const wanted of ['α', 'β', 'µ', '→', '°', '±', 'Δ', '⊣']) expect(all).toContain(wanted)
    expect(SYMBOL_GROUPS.map((g) => g.title)).toEqual(['Greek letters', 'Arrows', 'Maths and units', 'Marks'])
  })
})


// In tests a letter is 0.55 of the font size wide and a line 1.25 of it high (see `measureText`).
describe('a shape that grows with its words', () => {
  const box = (extra: Partial<ShapeNode> = {}): ShapeNode => ({
    id: 's', type: 'shape', shape: 'rect', x: 100, y: 50, w: 120, h: 40, rotation: 0, fill: '#ffffff', stroke: '#000000', strokeWidth: 2,
    label: { text: 'one two three four five six seven', fontSize: 16, fill: '#000000' },
    ...extra,
  })
  const linesOf = (node: ShapeNode): number => shapeLabelNode(node)!.text.split('\n').length

  it('becomes tall enough for the lines the words need, growing downwards', () => {
    const grown = growToFitLabel(box())
    const lines = linesOf(grown)
    expect(lines).toBeGreaterThan(2)
    // Every line is 20 high; 9 units are kept free above and below (8, and half the outline).
    expect(grown.h).toBe(lines * 20 + 18)
    expect([grown.x, grown.y, grown.w]).toEqual([100, 50, 120])
    // The words now sit inside the shape, top and bottom.
    const label = shapeLabelNode(grown)!
    expect(label.y).toBeGreaterThanOrEqual(grown.y + 9 - 0.5)
    expect(label.y + lines * 20).toBeLessThanOrEqual(grown.y + grown.h - 9 + 0.5)
  })

  it('leaves a shape alone that has room, or no words, and never makes one smaller', () => {
    const roomy = box({ h: 400 })
    expect(growToFitLabel(roomy)).toBe(roomy)
    const empty = box({ label: undefined })
    expect(growToFitLabel(empty)).toBe(empty)
    const blank = box({ label: { text: '   ', fontSize: 16, fill: '#000000' } })
    expect(growToFitLabel(blank)).toBe(blank)
    const once = growToFitLabel(box())
    expect(growToFitLabel(once)).toBe(once)
  })

  it('keeps the top edge of a turned shape where it is', () => {
    const turned = box({ rotation: 90 })
    const grown = growToFitLabel(turned)
    const topMiddle = (n: ShapeNode) => {
      const a = (n.rotation * Math.PI) / 180
      const [cx, cy] = [n.x + n.w / 2, n.y + n.h / 2]
      return { x: cx + Math.sin(a) * (n.h / 2), y: cy - Math.cos(a) * (n.h / 2) }
    }
    expect(grown.h).toBeGreaterThan(turned.h)
    expect(topMiddle(grown).x).toBeCloseTo(topMiddle(turned).x, 0)
    expect(topMiddle(grown).y).toBeCloseTo(topMiddle(turned).y, 0)
  })

  it('grows more where the outline leaves less room: an ellipse, a diamond, a callout', () => {
    const rect = growToFitLabel(box()).h
    for (const shape of ['ellipse', 'diamond', 'callout', 'triangle', 'hexagon', 'cylinder'] as const) {
      const grown = growToFitLabel(box({ shape, w: 200 }))
      const label = shapeLabelNode(grown)!
      const need = label.text.split('\n').length * 20 + 18
      expect(grown.h * shapeTextArea(shape, grown.w, grown.h).height, shape).toBeGreaterThanOrEqual(need - 0.5)
    }
    expect(growToFitLabel(box({ shape: 'ellipse' })).h).toBeGreaterThan(rect)
  })
})
