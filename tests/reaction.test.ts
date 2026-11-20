import { describe, expect, it } from 'vitest'
import { validateDoc } from '../src/io/files'
import { emptyDoc, selectionRect } from '../src/model/doc'
import { EXAMPLE_REACTION, reactionNodes, splitSpecies } from '../src/model/reaction'
import type { ConnectorNode, ShapeNode } from '../src/model/types'

describe('reaction schemes', () => {
  it('reads names typed with + or commas', () => {
    expect(splitSpecies('Glucose + ATP')).toEqual(['Glucose', 'ATP'])
    expect(splitSpecies(' Pyruvate,  NADH ;CO2 ')).toEqual(['Pyruvate', 'NADH', 'CO2'])
    expect(splitSpecies('')).toEqual([])
    expect(splitSpecies('Lactate, NAD^{+}')).toEqual(['Lactate', 'NAD^{+}'])
    expect(splitSpecies('Lactate + NAD+')).toEqual(['Lactate', 'NAD^{+}'])
    expect(splitSpecies('Ca2+ + Mg2+')).toEqual(['Ca^{2+}', 'Mg^{2+}'])
    expect(splitSpecies('Glucose+ATP')).toEqual(['Glucose+ATP'])
  })

  it('joins the last substrate to the first product, with the enzyme on the arrow', () => {
    const nodes = reactionNodes({ substrates: ['Glucose', 'ATP'], products: ['Glucose 6-phosphate', 'ADP'], enzyme: 'Hexokinase' })
    const boxes = nodes.filter((n): n is ShapeNode => n.type === 'shape')
    expect(boxes.map((b) => b.label?.text)).toEqual(['Glucose', 'ATP', 'Glucose 6-phosphate', 'ADP'])
    const [arrow] = nodes.filter((n): n is ConnectorNode => n.type === 'connector')
    expect(arrow.from.nodeId).toBe(boxes[1].id)
    expect(arrow.to.nodeId).toBe(boxes[2].id)
    expect(arrow.label).toBe('Hexokinase')
    expect(arrow.kind).toBe('arrow')
    expect(nodes.filter((n) => n.type === 'text' && n.text === '+')).toHaveLength(2)
    // Boxes do not overlap, left to right.
    for (let i = 1; i < boxes.length; i++) expect(boxes[i].x).toBeGreaterThan(boxes[i - 1].x + boxes[i - 1].w)
  })

  it('draws a cofactor on a curved arrow, and two heads when it runs both ways', () => {
    const nodes = reactionNodes({ ...EXAMPLE_REACTION, reversible: true })
    const lines = nodes.filter((n): n is ConnectorNode => n.type === 'connector')
    expect(lines).toHaveLength(2)
    expect(lines[0].kind).toBe('double')
    expect(lines[1].bend).toBeDefined()
    expect(nodes.filter((n) => n.type === 'text').map((n) => (n.type === 'text' ? n.text : ''))).toEqual(['ATP', 'ADP'])
  })

  it('is one group that survives saving unchanged', () => {
    const nodes = reactionNodes(EXAMPLE_REACTION)
    expect(new Set(nodes.map((n) => n.groupId))).toEqual(new Set(['rx-group']))
    const doc = { ...emptyDoc(), nodes }
    expect(validateDoc(JSON.parse(JSON.stringify(doc))).nodes).toEqual(nodes)
    const r = selectionRect(doc, nodes.map((n) => n.id))!
    expect(r.w).toBeLessThan(800)
  })
})
