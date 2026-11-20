import { describe, expect, it } from 'vitest'
import { MOLAR_UNITS, VOLUME_UNITS, bestUnit, calcText, formulaWeight, readNumber, solveDilution, solveMolarity } from '../src/model/calc'

describe('molarity', () => {
  it('works out the mass to weigh: 500 mL of 150 mM NaCl is 4.383 g', () => {
    expect(solveMolarity('mass', { conc: 0.15, volume: 0.5, mw: 58.44 })).toBeCloseTo(4.383, 6)
  })
  it('solves for each of the four from the other three', () => {
    const v = { mass: 4.383, conc: 0.15, volume: 0.5, mw: 58.44 }
    expect(solveMolarity('conc', v)).toBeCloseTo(0.15, 9)
    expect(solveMolarity('volume', v)).toBeCloseTo(0.5, 9)
    expect(solveMolarity('mw', v)).toBeCloseTo(58.44, 9)
  })
  it('gives no answer when a number is missing, zero or negative', () => {
    expect(solveMolarity('mass', { conc: 0.15, volume: 0.5 })).toBeNull()
    expect(solveMolarity('mass', { conc: 0, volume: 0.5, mw: 58.44 })).toBeNull()
    expect(solveMolarity('conc', { mass: -1, volume: 0.5, mw: 58.44 })).toBeNull()
  })
})

describe('dilution', () => {
  it('works out how much stock to take: 10× to 1× in 50 mL is 5 mL', () => {
    expect(solveDilution('v1', { c1: 10, c2: 1, v2: 50 })).toBeCloseTo(5, 12)
  })
  it('solves for each of the four', () => {
    expect(solveDilution('c1', { v1: 5, c2: 1, v2: 50 })).toBeCloseTo(10, 12)
    expect(solveDilution('c2', { c1: 10, v1: 5, v2: 50 })).toBeCloseTo(1, 12)
    expect(solveDilution('v2', { c1: 10, v1: 5, c2: 1 })).toBeCloseTo(50, 12)
  })
  it('refuses a working solution stronger than its stock', () => {
    expect(solveDilution('v1', { c1: 1, c2: 10, v2: 50 })).toBeNull()
    expect(solveDilution('v2', { c1: 10, v1: 60, c2: 20 })).toBeNull()
  })
})

describe('molecular weight of a formula', () => {
  // Reference values: PubChem's molecular weights, which use the same IUPAC atomic weights.
  it.each([
    ['C6H12O6', 180.156], // glucose
    ['NaCl', 58.44],
    ['C4H11NO3', 121.135], // Tris
    ['Ca(OH)2', 74.092],
    ['CuSO4·5H2O', 249.677],
    ['CuSO4.5H2O', 249.677],
    ['CaSO4·0.5H2O', 145.141],
    ['K4[Fe(CN)6]', 368.343],
    ['C₆H₁₂O₆', 180.156],
    ['SO4^{2-}', 96.056],
  ])('%s weighs %f g/mol', (formula, mw) => {
    expect(formulaWeight(formula).mw).toBeCloseTo(mw, 2)
  })
  it('counts the atoms', () => {
    expect(formulaWeight('Ca(OH)2').atoms).toEqual([
      ['Ca', 1],
      ['O', 2],
      ['H', 2],
    ])
  })
  it('says what it cannot read', () => {
    expect(() => formulaWeight('')).toThrow(/Type a formula/)
    expect(() => formulaWeight('nacl')).toThrow(/not an element symbol/)
    expect(() => formulaWeight('Xx2')).toThrow(/not an element BioSketch knows/)
    expect(() => formulaWeight('Ca(OH2')).toThrow(/not closed/)
    expect(() => formulaWeight('CaOH)2')).toThrow(/no opening bracket/)
  })
})

describe('numbers and units', () => {
  it('reads what scientists type', () => {
    expect(readNumber('2,5')).toBe(2.5)
    expect(readNumber('1e-3')).toBe(0.001)
    expect(readNumber('2.5×10^3')).toBe(2500)
    expect(readNumber('3x10-6')).toBeCloseTo(3e-6, 18)
    expect(readNumber('')).toBeUndefined()
    expect(readNumber('abc')).toBeNaN()
  })
  it('writes four significant figures', () => {
    expect(calcText(4.38300001)).toBe('4.383')
    expect(calcText(0.000012346)).toBe('1.235e-5')
  })
  it('picks the unit with the fewest digits', () => {
    expect(bestUnit(VOLUME_UNITS, 0.0025).label).toBe('mL')
    expect(bestUnit(MOLAR_UNITS, 2e-8).label).toBe('nM')
    expect(bestUnit(VOLUME_UNITS, 20).label).toBe('L')
  })
})
