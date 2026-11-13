import { describe, expect, it } from 'vitest'
import { buildChatRequest, readChatAnswer } from '../src/ai/bridge'
import { sceneToNodes } from '../src/ai/scene'

const json = `{
  "title": "Test",
  "elements": [
    { "id": "a", "kind": "icon", "icon": "mitochondrion", "label": "Mito", "x": 300, "y": 500, "w": 120, "h": 60 },
    { "id": "b", "kind": "box", "icon": "", "label": "ATP", "x": 700, "y": 500, "w": 110, "h": 55 }
  ],
  "connectors": [{ "from": "a", "to": "b", "kind": "arrow", "dashed": false, "label": "" }]
}`

describe('request for the Claude app', () => {
  it('carries the instructions, the icon list, the task and the answer format', () => {
    const text = buildChatRequest(false, 'glycolysis in the cytoplasm')
    expect(text).toContain('Icon catalogue')
    expect(text).toContain('mitochondrion')
    expect(text.length).toBeLessThan(14000)
    expect(text).toContain('glycolysis in the cytoplasm')
    expect(text).toContain('single code block')
    expect(text).not.toContain('attached image')
  })

  it('refers to the attached sketch and includes the notes', () => {
    const text = buildChatRequest(true, 'the X means inhibition')
    expect(text).toContain('The attached image is my hand-drawn sketch')
    expect(text).toContain('Notes about the sketch: the X means inhibition')
    expect(buildChatRequest(true, '  ')).not.toContain('Notes about the sketch')
  })

  it('shows an example answer that BioSketch itself can read', () => {
    const example = /Use exactly this shape:\s*(\{[\s\S]*?\n\})/.exec(buildChatRequest(false, 'x'))![1]
    const scene = readChatAnswer(example)
    expect(scene.elements).toHaveLength(2)
    expect(scene.connectors).toHaveLength(1)
    expect(sceneToNodes(scene, { width: 1200, height: 800 }).length).toBeGreaterThan(3)
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
