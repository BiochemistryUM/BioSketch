import { describe, expect, it } from 'vitest'
import { moleculeSvg, readMolfile, uprightStructure } from '../src/molecule'
import { writeMolfile } from '../src/sketch'
import glycine from './fixtures/pubchem-glycine.sdf?raw'

const m = readMolfile(glycine)
const molfile = writeMolfile(m)
const drawn = moleculeSvg(readMolfile(molfile), { colour: true })
const [vw, vh] = drawn.viewBox

/** Where turning the picture as a whole puts atom i, inside the box before its turn. */
const plain = (i: number, w: number, h: number, flipX = false) => {
  const a = readMolfile(molfile).atoms[i]
  let x = a.x * drawn.place.scale + drawn.place.dx
  const y = -a.y * drawn.place.scale + drawn.place.dy
  if (flipX) x = vw - x
  return [(w / vw) * x, (h / vh) * y]
}

describe('a turned chemical structure', () => {
  it('is left alone when it is neither turned nor mirrored', () => {
    expect(uprightStructure(molfile, drawn.viewBox, drawn.body, { w: vw, h: vh, rotation: 0 })).toBeNull()
  })

  it.each([90, 180, 233, -45])('keeps every atom where a turn of %s° puts it, with level letters', (rotation) => {
    const w = vw * 1.7
    const h = vh * 1.7
    const r = uprightStructure(molfile, drawn.viewBox, drawn.body, { w, h, rotation })!
    expect(r).not.toBeNull()
    r.points.forEach(([x, y], i) => {
      const [px, py] = plain(i, w, h)
      expect(x).toBeCloseTo(px, 6)
      expect(y).toBeCloseTo(py, 6)
    })
    // No letter is turned: the drawing holds no rotation of its own, only the matrix that places it.
    expect(r.body).not.toMatch(/rotate/)
    expect(r.body).toMatch(/<text/)
  })

  it('puts the hydrogens of a label on the side that is free after the turn', () => {
    const level = drawn.body.match(/<text[^>]*>[^<]*O[^<]*(?:<tspan[^>]*>[^<]*<\/tspan>)*<\/text>/g)!.join('')
    const turned = uprightStructure(molfile, drawn.viewBox, drawn.body, { w: vw, h: vh, rotation: 180 })!.body
    const after = turned.match(/<text[^>]*>[^<]*O[^<]*(?:<tspan[^>]*>[^<]*<\/tspan>)*<\/text>/g)!.join('')
    // The hydroxyl is written the other way round once the structure is upside down.
    expect(after).not.toBe(level)
  })

  it('mirrors the atoms, not the letters', () => {
    const r = uprightStructure(molfile, drawn.viewBox, drawn.body, { w: vw, h: vh, rotation: 0, flipX: true })!
    r.points.forEach(([x, y], i) => {
      const [px, py] = plain(i, vw, vh, true)
      expect(x).toBeCloseTo(px, 6)
      expect(y).toBeCloseTo(py, 6)
    })
  })

  it('turns the picture as a whole when the molfile no longer gives the stored drawing', () => {
    expect(uprightStructure(molfile, [vw + 20, vh], drawn.body, { w: vw, h: vh, rotation: 90 })).toBeNull()
    expect(uprightStructure('not a molfile', drawn.viewBox, drawn.body, { w: vw, h: vh, rotation: 90 })).toBeNull()
  })
})
