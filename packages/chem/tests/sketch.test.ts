import { describe, expect, it } from 'vitest'
import { attachedHydrogens, molecularFormula, readMolfile } from '../src/molecule'
import { withoutHydrogens } from '../src/sketch'
import { addRing, atomAt, bondAt, bondFrom, cycleBond, emptySketch, freeDirection, joinAtoms, normalise, placeAtom, removeAtom, removeBond, setBond, setElement, shiftCharge, writeMolfile } from '../src/sketch'
import type { Molecule } from '../src/molecule'

const bondLengths = (m: Molecule) => m.bonds.map((b) => Math.hypot(m.atoms[b.from].x - m.atoms[b.to].x, m.atoms[b.from].y - m.atoms[b.to].y))
const deg = (a: number) => Math.round((a * 180) / Math.PI)

describe('drawing a structure by hand', () => {
  it('draws a zigzag chain from a lone atom, one bond long, at 120°', () => {
    let { m, atom } = placeAtom(emptySketch(), { x: 0, y: 0 })
    for (let k = 0; k < 4; k++) ({ m, atom } = bondFrom(m, atom))
    expect(m.atoms).toHaveLength(5)
    expect(bondLengths(m).every((d) => Math.abs(d - 1) < 1e-9)).toBe(true)
    // A zigzag: every second atom at the same height, the chain going right.
    expect(m.atoms[2].y).toBeCloseTo(m.atoms[0].y, 9)
    expect(m.atoms[3].y).toBeCloseTo(m.atoms[1].y, 9)
    expect(m.atoms[4].x).toBeGreaterThan(m.atoms[2].x)
    expect(molecularFormula(m)).toBe('C5H12')
  })

  it('puts a third bond into the widest gap', () => {
    let { m } = placeAtom(emptySketch(), { x: 0, y: 0 })
    m = bondFrom(m, 0, { angle: 0 }).m
    m = bondFrom(m, 0, { angle: (2 * Math.PI) / 3 }).m
    expect((deg(freeDirection(m, 0)) + 360) % 360).toBe(240)
  })

  it('closes a ring when a bond ends on an atom, and joins two atoms by a drag', () => {
    let m = addRing(emptySketch(), 6, { point: { x: 0, y: 0 } })
    m = removeBond(m, 0)
    expect(m.bonds).toHaveLength(5)
    const a = m.bonds.length
    m = joinAtoms(m, 0, 1)
    expect(m.bonds).toHaveLength(a + 1)
    expect(joinAtoms(m, 0, 1).bonds).toHaveLength(a + 1)
  })

  it('makes benzene with three double bonds, and fuses naphthalene on a bond', () => {
    const benzene = addRing(emptySketch(), 6, { point: { x: 0, y: 0 } }, true)
    expect(benzene.atoms).toHaveLength(6)
    expect(benzene.bonds.filter((b) => b.order === 2)).toHaveLength(3)
    expect(molecularFormula(benzene)).toBe('C6H6')
    const naphthalene = addRing(benzene, 6, { bond: benzene.bonds.findIndex((b) => b.order === 1) }, true)
    expect(naphthalene.atoms).toHaveLength(10)
    expect(naphthalene.bonds).toHaveLength(11)
    expect(molecularFormula(naphthalene)).toBe('C10H8')
    expect(bondLengths(naphthalene).every((d) => Math.abs(d - 1) < 1e-9)).toBe(true)
    // The new ring lies on the other side of the shared bond: no two atoms on top of each other.
    for (let i = 0; i < 10; i++) expect(atomAt(naphthalene, naphthalene.atoms[i], 0.5, i)).toBe(-1)
  })

  it('puts a ring on an atom where it has room (cyclopropyl on a chain)', () => {
    let { m, atom } = placeAtom(emptySketch(), { x: 0, y: 0 })
    m = bondFrom(m, atom).m
    m = addRing(m, 3, { atom: 1 })
    expect(m.atoms).toHaveLength(4)
    expect(molecularFormula(m)).toBe('C4H8')
  })

  it('cycles a bond through single, double and triple, and turns a wedge round', () => {
    let { m } = bondFrom(placeAtom(emptySketch(), { x: 0, y: 0 }).m, 0)
    m = cycleBond(m, 0)
    expect(m.bonds[0].order).toBe(2)
    m = cycleBond(m, 0)
    expect(m.bonds[0].order).toBe(3)
    expect(molecularFormula(m)).toBe('C2H2')
    m = cycleBond(m, 0)
    expect(m.bonds[0].order).toBe(1)
    m = setBond(m, 0, 1, 1)
    expect([m.bonds[0].stereo, m.bonds[0].from]).toEqual([1, 0])
    m = setBond(m, 0, 1, 1)
    expect([m.bonds[0].stereo, m.bonds[0].from]).toEqual([1, 1])
  })

  it('changes elements and charges: ethanol, then ethoxide', () => {
    let { m, atom } = placeAtom(emptySketch(), { x: 0, y: 0 })
    ;({ m, atom } = bondFrom(m, atom))
    ;({ m, atom } = bondFrom(m, atom))
    m = setElement(m, atom, 'O')
    expect(molecularFormula(m)).toBe('C2H6O')
    expect(setElement(m, atom, 'Xx')).toBe(m)
    m = shiftCharge(m, atom, -1)
    expect(attachedHydrogens(m)[atom]).toBe(0)
    expect(m.atoms[atom].charge).toBe(-1)
  })

  it('deletes an atom with its bonds and the lone carbons it leaves', () => {
    let { m, atom } = placeAtom(emptySketch(), { x: 0, y: 0 })
    ;({ m, atom } = bondFrom(m, atom))
    ;({ m } = bondFrom(m, atom))
    m = removeAtom(m, 1)
    expect(m.atoms).toHaveLength(0)
    const ring = addRing(emptySketch(), 6, { point: { x: 0, y: 0 } })
    expect(removeAtom(ring, 0).atoms).toHaveLength(5)
  })

  it('finds atoms and bonds under a press', () => {
    const m = addRing(emptySketch(), 6, { point: { x: 0, y: 0 } })
    expect(atomAt(m, { x: m.atoms[2].x + 0.1, y: m.atoms[2].y }, 0.3)).toBe(2)
    const mid = { x: (m.atoms[0].x + m.atoms[1].x) / 2, y: (m.atoms[0].y + m.atoms[1].y) / 2 }
    expect(bondAt(m, mid, 0.2)).toBe(0)
    expect(bondAt(m, { x: 0, y: 0 }, 0.2)).toBe(-1)
  })

  it('writes a molfile that reads back the same, charges and wedges included', () => {
    let m = addRing(emptySketch(), 6, { point: { x: 0, y: 0 } }, true)
    m = bondFrom(m, 0).m
    m = setElement(m, 6, 'N')
    m = shiftCharge(m, 6, 1)
    m = setBond(m, 6, 1, 6)
    const back = readMolfile(writeMolfile({ ...m, title: 'Anilinium' }))
    expect(back.title).toBe('Anilinium')
    expect(back.atoms.map((a) => [a.element, a.charge])).toEqual(m.atoms.map((a) => [a.element, a.charge]))
    expect(back.bonds).toEqual(m.bonds)
    back.atoms.forEach((a, i) => {
      expect(a.x).toBeCloseTo(m.atoms[i].x, 3)
      expect(a.y).toBeCloseTo(m.atoms[i].y, 3)
    })
  })

  it('scales a structure from a file so that its bonds are one long', () => {
    const m = addRing(emptySketch(), 5, { point: { x: 0, y: 0 } })
    const big = { ...m, atoms: m.atoms.map((a) => ({ ...a, x: a.x * 1.54, y: a.y * 1.54 })) }
    expect(bondLengths(normalise(big)).every((d) => Math.abs(d - 1) < 1e-9)).toBe(true)
  })
})

describe('a structure from PubChem opened in the editor', () => {
  it('drops the hydrogens the drawing leaves out, keeps the formula, and has bonds one long', async () => {
    const { default: atp } = await import('./fixtures/pubchem-atp.sdf?raw')
    const m = readMolfile(atp)
    const bare = normalise(withoutHydrogens(m))
    expect(bare.atoms.some((a) => a.element === 'H')).toBe(false)
    expect(molecularFormula(bare)).toBe(molecularFormula(m))
    const lengths = bondLengths(bare).sort((a, b) => a - b)
    expect(lengths[Math.floor(lengths.length / 2)]).toBeCloseTo(1, 9)
    expect(readMolfile(writeMolfile(bare)).atoms).toHaveLength(bare.atoms.length)
  })
})
