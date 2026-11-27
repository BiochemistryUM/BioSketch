import { describe, expect, it } from 'vitest'
import { attributionText } from '../src/io/export'
import { validateDoc } from '../src/io/files'
import { emptyDoc } from '../src/model/doc'
import { chainsFrom, plddtColour, rainbow, readMarks, residuesLeftOut, structureCredit, structureExtent, structureLayout, STRUCTURE_RESIDUES_MAX } from '@biosketch/chem'
import type { StructureNode } from '../src/model/types'

/** An α-helix: 1.5 Å rise and 100° per residue on a radius of 2.3 Å, so neighbours are 3.8 Å apart. */
function helix(count: number, id = 'A', start = 1, shift = 0) {
  return {
    id,
    residues: Array.from({ length: count }, (_, i) => ({
      n: start + i,
      name: ['ALA', 'ARG', 'GLY', 'HIS', 'LEU'][i % 5],
      x: 2.3 * Math.cos((i * 100 * Math.PI) / 180) + shift,
      y: 1.5 * i,
      z: 2.3 * Math.sin((i * 100 * Math.PI) / 180),
      b: 40 + i,
    })),
  }
}

const node = (over: Partial<StructureNode> = {}): StructureNode => ({
  id: 's1',
  type: 'structure',
  x: 10,
  y: 20,
  w: 300,
  h: 300,
  rotation: 0,
  chains: chainsFrom({ chains: [helix(30), helix(20, 'B', 101, 12)] }),
  view: [20, -10],
  source: { kind: 'alphafold', id: 'P69905' },
  ...over,
})

describe('protein structures', () => {
  it('keeps every residue of a file as a figure keeps it', () => {
    const [a, b] = chainsFrom({ chains: [helix(3), helix(2, 'B', 101)] })
    expect(a.nums).toEqual([1, 2, 3])
    expect(a.ca).toHaveLength(9)
    expect(a.seq).toBe('ARG')
    expect(b.id).toBe('B')
    expect(a.ca[0]).toBe(2.3)
  })

  it('draws a curve between neighbours and none across a gap', () => {
    const traced = helix(10)
    traced.residues[5].x += 30 // a missing stretch: residues 5 and 6 are far apart
    const n = node({ chains: chainsFrom({ chains: [traced] }) })
    const drawn = structureLayout(n)
    expect(drawn.segments).toHaveLength(7)
    for (const s of drawn.segments) {
      expect(s.d).toMatch(/^M[\d.-]+ [\d.-]+C/)
      expect(s.d).not.toContain('NaN')
    }
  })

  it('stays inside its box from every side, at the same size', () => {
    const n = node()
    for (const yaw of [0, 45, 90, 180, 300]) {
      const nums = structureLayout(n, yaw).segments.flatMap((s) => s.d.match(/-?[\d.]+/g)!.map(Number))
      expect(Math.min(...nums)).toBeGreaterThanOrEqual(0)
      expect(Math.max(...nums)).toBeLessThanOrEqual(300)
    }
    expect(structureExtent(n.chains).r).toBeGreaterThan(10)
  })

  it('draws what is far first, so that nearer parts cover it', () => {
    const plain = structureLayout(node({ view: [0, 0], chains: chainsFrom({ chains: [helix(12)] }) }))
    // Far parts are paler (mixed with white): the last drawn is the darkest of the same colour.
    const light = (hex: string) => parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16)
    expect(light(plain.segments[0].colour)).toBeGreaterThan(light(plain.segments[plain.segments.length - 1].colour))
  })

  it('colours by confidence as AlphaFold DB does, and by place in the chain', () => {
    expect([95, 80, 60, 30].map(plddtColour)).toEqual(['#0053d6', '#65cbf3', '#ffdb13', '#ff7d45'])
    expect(rainbow(0)).toBe('#313695')
    expect(rainbow(1)).toBe('#d73027')
    const drawn = structureLayout(node({ colour: 'plddt', view: [0, 0] }))
    expect(drawn.segments.length).toBeGreaterThan(0)
  })

  it('marks residues typed in a few words, and says what it could not find', () => {
    const chains = node().chains
    const { marks, unread } = readMarks('R2, A:3 active site, H4, B:101, W5, 999, nonsense', chains)
    expect(marks).toEqual([
      { chain: 'A', n: 2, label: 'R2' },
      { chain: 'A', n: 3, label: 'G3 active site' },
      { chain: 'A', n: 4, label: 'H4' },
      { chain: 'B', n: 101, label: 'A101' },
    ])
    expect(unread).toEqual(['W5', '999', 'nonsense'])
    const drawn = structureLayout(node({ marks }))
    expect(drawn.marks.map((m) => m.label)).toEqual(['R2', 'G3 active site', 'H4', 'A101'])
  })

  it('survives saving unchanged, and a damaged one is mended or dropped', () => {
    const n = node({ marks: [{ chain: 'A', n: 2, label: 'R2' }], colour: 'rainbow', spin: true, tube: 2, title: 'Haemoglobin subunit alpha' })
    const doc = { ...emptyDoc(), nodes: [n] }
    expect(validateDoc(JSON.parse(JSON.stringify(doc))).nodes[0]).toEqual(n)
    const broken = JSON.parse(JSON.stringify(doc))
    broken.nodes[0].chains[0].ca[4] = 'x'
    broken.nodes[0].chains[1].seq = 'a<b'
    const mended = validateDoc(broken).nodes[0] as StructureNode
    expect(mended.chains).toHaveLength(1)
    expect(mended.chains[0].id).toBe('B')
    const empty = JSON.parse(JSON.stringify(doc))
    empty.nodes[0].chains = []
    expect(validateDoc(empty).nodes).toHaveLength(0)
  })

  it('keeps at most the limit of residues and says how many were left out', () => {
    const big = { chains: [helix(STRUCTURE_RESIDUES_MAX - 10), helix(25, 'B')] }
    const chains = chainsFrom(big)
    expect(chains.reduce((s, c) => s + c.nums.length, 0)).toBe(STRUCTURE_RESIDUES_MAX)
    expect(residuesLeftOut(big)).toBe(15)
  })

  it('gives the credit its source asks for, in the export', () => {
    expect(structureCredit(node())).toContain('AlphaFold DB model of UniProt P69905 (CC BY 4.0)')
    expect(structureCredit(node({ source: { kind: 'pdb', id: '1A3N' } }))).toContain('PDB 1A3N')
    expect(attributionText({ ...emptyDoc(), nodes: [node()] })).toContain('Jumper et al., Nature 2021')
    expect(attributionText({ ...emptyDoc(), nodes: [node({ hidden: true })] })).toBe('')
  })
})
