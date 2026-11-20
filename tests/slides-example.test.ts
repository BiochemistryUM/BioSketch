// The example figure with several slides in docs/ opens as it was written.

import { describe, expect, it } from 'vitest'
import example from '../docs/slides-example.biosketch.json?raw'
import { parseDoc, serializeDoc } from '../src/io/files'
import { everyNode, slideCount, slideIndex } from '../src/model/slides'

describe('the example of slides', () => {
  it('is a figure of four slides that is read back unchanged', () => {
    const doc = parseDoc(example)
    expect(slideCount(doc)).toBe(4)
    expect(slideIndex(doc)).toBe(0)
    expect([doc.width, doc.height]).toEqual([1280, 720])
    expect(JSON.parse(serializeDoc(doc))).toEqual(JSON.parse(example))
    const ids = everyNode(doc).map((n) => n.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
