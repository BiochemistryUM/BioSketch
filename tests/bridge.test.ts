import { describe, expect, it } from 'vitest'
import { buildChatRequest, readChatAnswer } from '../src/ai/bridge'
import { sceneToNodes, systemPrompt } from '../src/ai/scene'
import { PACKS, packIcons } from './helpers'

const SYSTEM = systemPrompt(PACKS)

const json = `{
  "title": "Test",
  "elements": [
    { "id": "a", "kind": "icon", "icon": "nih-cells--mitochondria", "label": "Mito", "x": 300, "y": 500, "w": 120, "h": 60 },
    { "id": "b", "kind": "box", "icon": "", "label": "ATP", "x": 700, "y": 500, "w": 110, "h": 55 }
  ],
  "connectors": [{ "from": "a", "to": "b", "kind": "arrow", "dashed": false, "label": "" }]
}`

describe('request for the Claude app', () => {
  it('carries the instructions, the icon list, the task and the answer format', () => {
    const text = buildChatRequest(SYSTEM, false, 'glycolysis in the cytoplasm')
    expect(text).toContain('Icon catalogue')
    // The icons are those of the NIH BioArt collections, by name; the other collections are not offered to the AI.
    expect(text).toContain('nih-cells (cells and organelles): ')
    expect(text).toContain(', macrophage, ')
    expect(text).not.toContain('srv-')
    expect(text.length).toBeLessThan(26000)
    expect(text).toContain('glycolysis in the cytoplasm')
    expect(text).toContain('single code block')
    expect(text).not.toContain('attached image')
  })

  it('refers to the attached sketch and includes the notes', () => {
    const text = buildChatRequest(SYSTEM, true, 'the X means inhibition')
    expect(text).toContain('The attached image is my hand-drawn sketch')
    expect(text).toContain('Notes about the sketch: the X means inhibition')
    expect(buildChatRequest(SYSTEM, true, '  ')).not.toContain('Notes about the sketch')
  })

  it('shows an example answer that BioSketch itself can read', () => {
    const example = /Use exactly this shape:\s*(\{[\s\S]*?\n\})/.exec(buildChatRequest(SYSTEM, false, 'x'))![1]
    const scene = readChatAnswer(example)
    expect(scene.elements).toHaveLength(2)
    expect(scene.connectors).toHaveLength(1)
    // Its icon is one the library really has, so it is built as a picture with its label, a box and an arrow.
    const nodes = sceneToNodes(scene, { width: 1200, height: 800 }, undefined, packIcons)
    expect(nodes.map((n) => n.type)).toEqual(['icon', 'shape', 'text', 'connector'])
  })
})

describe('answer pasted back from the Claude app', () => {
  it('reads bare JSON, a code block, and a reply with text around it', () => {
    expect(readChatAnswer(json).elements).toHaveLength(2)
    expect(readChatAnswer('```json\n' + json + '\n```').connectors).toHaveLength(1)
    expect(readChatAnswer('Here is your figure:\n\n```\n' + json + '\n```\n\nLet me know if you want changes {like this}.').title).toBe('Test')
    expect(readChatAnswer('Sure! ' + json + ' Hope that helps.').elements).toHaveLength(2)
  })

  it('copes with curly quotes added by copy and paste', () => {
    expect(readChatAnswer(json.replace(/"/g, (_, i: number) => (i % 2 ? '”' : '“'))).elements).toHaveLength(2)
  })

  it('explains what is wrong when the paste is not usable', () => {
    expect(() => readChatAnswer('')).toThrow(/does not look like/)
    expect(() => readChatAnswer('I cannot help with that.')).toThrow(/does not look like/)
    expect(() => readChatAnswer('{ "elements": [ { "id": ')).toThrow(/does not look like|could not be read/)
    expect(() => readChatAnswer('{ "elements": [ {"id": "a" ] }')).toThrow(/could not be read/)
    expect(() => readChatAnswer('{ "title": "", "elements": [], "connectors": [] }')).toThrow(/no figure elements/)
  })
})
