import { describe, expect, it } from 'vitest'
import { attachedHydrogens, findRings, molecularFormula, moleculeSvg, readMolfile, type Molecule } from '../src/model/molecule'
// 2D structures as PubChem gives them (public domain), fetched on 20 November 2026 from
// https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/<name>/SDF?record_type=2d
import atpText from './fixtures/pubchem-atp.sdf?raw'
import caffeineText from './fixtures/pubchem-caffeine.sdf?raw'
import glycineText from './fixtures/pubchem-glycine.sdf?raw'
import alanineText from './fixtures/pubchem-alanine.sdf?raw'
import ibuprofenText from './fixtures/pubchem-ibuprofen.sdf?raw'
import saltText from './fixtures/pubchem-sodium-chloride.sdf?raw'

// PubChem's MolecularFormula of each, fetched the same day.
const FIXTURES: [string, string, string][] = [
  ['ATP', atpText, 'C10H16N5O13P3'],
  ['caffeine', caffeineText, 'C8H10N4O2'],
  ['glycine', glycineText, 'C2H5NO2'],
  ['L-alanine', alanineText, 'C3H7NO2'],
  ['ibuprofen', ibuprofenText, 'C13H18O2'],
  ['sodium chloride', saltText, 'ClNa'],
]

const heavy = (m: Molecule, el: string) => m.atoms.map((a, i) => [a, i] as const).filter(([a]) => a.element === el).map(([, i]) => i)

/** A molfile written by hand: atoms as [element, x, y], bonds as [from, to, order, stereo] counted from 1. */
function molfile(atoms: [string, number, number][], bonds: [number, number, number, number?][], extra: string[] = []): string {
  const pad = (s: string | number, n: number) => String(s).padStart(n)
  const lines = ['test', '  hand', '', `${pad(atoms.length, 3)}${pad(bonds.length, 3)}  0     0  0  0  0  0  0999 V2000`]
  for (const [el, x, y] of atoms) lines.push(`${pad(x.toFixed(4), 10)}${pad(y.toFixed(4), 10)}${pad('0.0000', 10)} ${el.padEnd(3)} 0  0  0  0  0  0  0  0  0  0  0  0`)
  for (const [a, b, o, s = 0] of bonds) lines.push(`${pad(a, 3)}${pad(b, 3)}${pad(o, 3)}${pad(s, 3)}`)
  return [...lines, ...extra, 'M  END', ''].join('\n')
}

describe('readMolfile', () => {
  it('reads PubChem records', () => {
    const atp = readMolfile(atpText)
    expect(atp.title).toBe('5957')
    expect(atp.atoms.length).toBe(47)
    expect(atp.bonds.length).toBe(49)
    const caffeine = readMolfile(caffeineText)
    expect(caffeine.atoms.length).toBe(24)
    expect(caffeine.bonds.length).toBe(25)
    expect(caffeine.bonds.filter((b) => b.order === 2).length).toBe(4)
  })

  it('reads charges from the charge lines', () => {
    const salt = readMolfile(saltText)
    expect(salt.atoms.map((a) => [a.element, a.charge])).toEqual([['Cl', -1], ['Na', 1]])
    expect(salt.bonds).toEqual([])
  })

  it('lets a charge line overrule the charges of the atom block', () => {
    const lines = molfile([['N', 0, 0], ['C', 1, 0]], [[1, 2, 1]], ['M  CHG  1   1   1']).split('\n')
    lines[4] = lines[4].slice(0, 36) + '  5' + lines[4].slice(39) // atom 1 says −1 in its own line
    const text = lines.join('\n')
    expect(readMolfile(text).atoms[0].charge).toBe(1)
    expect(readMolfile(text.replace(/M {2}CHG.*\n/, '')).atoms[0].charge).toBe(-1)
  })

  it('reads wedges and hashes, the narrow end first', () => {
    const ala = readMolfile(alanineText)
    const hashes = ala.bonds.filter((b) => b.stereo === 6)
    expect(hashes.length).toBe(1)
    expect(ala.atoms[hashes[0].from].element).toBe('C')
    expect(ala.atoms[hashes[0].to].element).toBe('N')
    const atp = readMolfile(atpText)
    expect(atp.bonds.some((b) => b.stereo === 1)).toBe(true)
  })

  it('refuses what is not a V2000 molfile, in words', () => {
    expect(() => readMolfile('')).toThrow(/empty/)
    expect(() => readMolfile('hello\nworld')).toThrow(/too short/)
    expect(() => readMolfile(caffeineText.replace('V2000', 'V3000'))).toThrow(/V3000/)
    expect(() => readMolfile(caffeineText.replace(' 24 25', ' xx 25'))).toThrow(/number of atoms/)
    expect(() => readMolfile(caffeineText.replace('O   0', 'Qq  0'))).toThrow(/not an element/)
    expect(() => readMolfile(caffeineText.replace('3.7321    2.0000', '3.7321    abcdef'))).toThrow(/not a number/)
    expect(() => readMolfile(caffeineText.replace('M  END', 'M  XXX'))).toThrow(/M {2}END/)
    expect(() => readMolfile(molfile([['C', 0, 0]], [[1, 5, 1]]))).toThrow(/not there/)
    expect(() => readMolfile(molfile([['C', 0, 0], ['C', 1, 0]], [[1, 2, 8]]))).toThrow(/kind/)
    expect(() => readMolfile(molfile([['C', 0, 0], ['C', 1, 0]], [[1, 2, 1], [2, 1, 1]]))).toThrow(/already joined/)
    expect(() => readMolfile(molfile([['C', 1e6, 0]], []))).toThrow(/out of range/)
    expect(() => readMolfile(molfile([['C', 0, 0]], [], ['M  CHG  1   9   1']))).toThrow(/not there/)
    for (const bad of ['', 'x', caffeineText.slice(0, 300)]) {
      try {
        readMolfile(bad)
      } catch (e) {
        expect((e as Error).message).toMatch(/^The structure file could not be read: /)
      }
    }
  })

  it('refuses structures that are too large', () => {
    const many = molfile(Array.from({ length: 501 }, (_, i) => ['C', i, 0] as [string, number, number]), [])
    expect(() => readMolfile(many)).toThrow(/at most 500/)
    const counts = caffeineText.split('\n')
    counts[3] = ' 24601' + counts[3].slice(6)
    expect(() => readMolfile(counts.join('\n'))).toThrow(/at most 600/)
  })
})

describe('hydrogens and formula', () => {
  it('matches the formula PubChem gives', () => {
    for (const [name, text, formula] of FIXTURES) expect(molecularFormula(readMolfile(text)), name).toBe(formula)
  })

  it('counts hydrogens on hetero atoms', () => {
    const caffeine = readMolfile(caffeineText)
    const hs = attachedHydrogens(caffeine)
    expect(heavy(caffeine, 'N').map((i) => hs[i])).toEqual([0, 0, 0, 0])
    expect(heavy(caffeine, 'O').map((i) => hs[i])).toEqual([0, 0])
    const gly = readMolfile(glycineText)
    const gh = attachedHydrogens(gly)
    expect(heavy(gly, 'N').map((i) => gh[i])).toEqual([2])
    expect(heavy(gly, 'O').map((i) => gh[i]).sort()).toEqual([0, 1])
  })

  it('works out hydrogens that the file leaves implicit, with charges', () => {
    // Ethanol without hydrogens in the file; an ammonium ion; an acetate ion.
    expect(molecularFormula(readMolfile(molfile([['C', 0, 0], ['C', 1, 0], ['O', 2, 0]], [[1, 2, 1], [2, 3, 1]])))).toBe('C2H6O')
    expect(molecularFormula(readMolfile(molfile([['N', 0, 0]], [], ['M  CHG  1   1   1'])))).toBe('H4N+')
    const acetate = readMolfile(molfile([['C', 0, 0], ['C', 1, 0], ['O', 2, 0.5], ['O', 2, -0.5]], [[1, 2, 1], [2, 3, 2], [2, 4, 1]], ['M  CHG  1   4  -1']))
    expect(molecularFormula(acetate)).toBe('C2H3O2-')
    expect(attachedHydrogens(acetate)).toEqual([3, 0, 0, 0])
    // Sulfur takes its next valence; a carbanion has three bonds.
    const dmso = readMolfile(molfile([['C', 0, 0], ['S', 1, 0], ['C', 2, 0], ['O', 1, 1]], [[1, 2, 1], [2, 3, 1], [2, 4, 2]]))
    expect(molecularFormula(dmso)).toBe('C2H6OS')
    expect(attachedHydrogens(readMolfile(molfile([['C', 0, 0]], [], ['M  CHG  1   1  -1'])))).toEqual([3])
    expect(molecularFormula(readMolfile(molfile([['O', 0, 0]], [])))).toBe('H2O')
  })

  it('finds the rings', () => {
    const caffeine = readMolfile(caffeineText)
    const rings = findRings(caffeine).map((r) => r.length).sort()
    expect(rings).toEqual([5, 6])
    expect(findRings(readMolfile(glycineText))).toEqual([])
  })
})

/** Every number in a coordinate attribute of the drawing. */
function coordinates(body: string): { xs: number[]; ys: number[] } {
  const xs: number[] = []
  const ys: number[] = []
  for (const [, name, value] of body.matchAll(/\b(x1|x2|x|y1|y2|y)="([^"]*)"/g)) (name.startsWith('x') ? xs : ys).push(Number(value))
  for (const [, pts] of body.matchAll(/points="([^"]*)"/g)) {
    for (const pair of pts.split(' ')) {
      const [x, y] = pair.split(',').map(Number)
      xs.push(x)
      ys.push(y)
    }
  }
  return { xs, ys }
}

describe('moleculeSvg', () => {
  it('draws every fixture with plain elements inside the view box', () => {
    for (const [name, text, formula] of FIXTURES) {
      const svg = moleculeSvg(readMolfile(text))
      expect(svg.formula, name).toBe(formula)
      const [w, h] = svg.viewBox
      expect(w).toBeGreaterThan(10)
      expect(h).toBeGreaterThan(10)
      expect(svg.body).not.toMatch(/NaN|Infinity|<script|style|href|id=|url\(/i)
      const tags = new Set([...svg.body.matchAll(/<([a-z]+)/g)].map((t) => t[1]))
      for (const t of tags) expect(['g', 'line', 'polygon', 'text', 'tspan'], name).toContain(t)
      const { xs, ys } = coordinates(svg.body)
      expect(xs.length).toBeGreaterThan(0)
      for (const x of xs) expect(x >= 0 && x <= w, `${name} x ${x}`).toBe(true)
      for (const y of ys) expect(y >= 0 && y <= h, `${name} y ${y}`).toBe(true)
      // Two decimals at most.
      for (const n of svg.body.match(/-?\d+\.\d+/g) ?? []) expect(n.split('.')[1].length).toBeLessThanOrEqual(2)
    }
  })

  it('writes hetero atoms with their hydrogens and leaves carbons unlabelled', () => {
    const gly = moleculeSvg(readMolfile(glycineText)).body
    const texts = [...gly.matchAll(/<text[^>]*>(.*?)<\/text>/g)].map((t) => t[1].replace(/<[^>]+>/g, ''))
    expect(texts).toContain('N')
    expect(texts).toContain('O')
    expect(texts).toContain('H2')
    expect(texts).toContain('H')
    expect(texts).not.toContain('C')
    const caffeine = moleculeSvg(readMolfile(caffeineText)).body
    expect(caffeine).not.toMatch(/>H</)
    expect((caffeine.match(/>N</g) ?? []).length).toBe(4)
  })

  it('writes charges raised, and a carbon without bonds with its hydrogens', () => {
    const salt = moleculeSvg(readMolfile(saltText)).body
    expect(salt).toMatch(/>Na</)
    expect(salt).toMatch(/>Cl</)
    expect(salt).toMatch(/font-size="9">\+</)
    expect(salt).toMatch(/font-size="9">−</)
    const methane = moleculeSvg(readMolfile(molfile([['C', 0, 0]], []))).body
    expect(methane).toMatch(/>C</)
    expect(methane).toMatch(/>H<tspan dy="3.5" font-size="9">4</)
  })

  it('puts the second line of a ring double bond inside the ring', () => {
    // Benzene as a hexagon around (0, 0): every inner line lies closer to the middle than its bond.
    const ring = Array.from({ length: 6 }, (_, k) => ['C', Math.cos((k * Math.PI) / 3), Math.sin((k * Math.PI) / 3)] as [string, number, number])
    const svg = moleculeSvg(readMolfile(molfile(ring, [[1, 2, 2], [2, 3, 1], [3, 4, 2], [4, 5, 1], [5, 6, 2], [6, 1, 1]])))
    const lines = [...svg.body.matchAll(/<line x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)"/g)].map((l) => l.slice(1).map(Number))
    expect(lines.length).toBe(9)
    const [w, h] = svg.viewBox
    const dist = ([x1, y1, x2, y2]: number[]) => Math.hypot((x1 + x2) / 2 - w / 2, (y1 + y2) / 2 - h / 2)
    const sorted = lines.map(dist).sort((a, b) => a - b)
    // Three inner lines, then six bonds at the same distance.
    expect(sorted[2]).toBeLessThan(sorted[3] - 3)
    expect(sorted[8] - sorted[3]).toBeLessThan(0.1)
  })

  it('draws wedges as triangles and hashes as short lines', () => {
    const ala = moleculeSvg(readMolfile(alanineText)).body
    expect(ala).toMatch(/stroke-width="1.2"/)
    const atp = moleculeSvg(readMolfile(atpText)).body
    expect((atp.match(/<polygon/g) ?? []).length).toBe(2)
  })

  it('draws three lines for a triple bond and keeps bonds clear of labels', () => {
    // Hydrogen cyanide: H–C≡N, the bond scaled to 30.
    const svg = moleculeSvg(readMolfile(molfile([['C', 0, 0], ['N', 1, 0]], [[1, 2, 3]])), { bond: 30, colour: false })
    const lines = [...svg.body.matchAll(/<line x1="([^"]+)" y1="[^"]+" x2="([^"]+)"/g)].map((l) => [Number(l[1]), Number(l[2])])
    expect(lines.length).toBe(3)
    const text = svg.body.match(/<text x="([^"]+)"[^>]*>N</)!
    const nx = Number(text[1])
    for (const [x1, x2] of lines) expect(Math.max(x1, x2)).toBeLessThan(nx - 6)
    expect(svg.body).not.toMatch(/#2c5fd4/)
    expect(moleculeSvg(readMolfile(caffeineText)).body).toMatch(/#2c5fd4/)
  })

  it('scales to the bond length asked for', () => {
    const small = moleculeSvg(readMolfile(caffeineText), { bond: 15 })
    const large = moleculeSvg(readMolfile(caffeineText), { bond: 60 })
    expect(large.viewBox[0]).toBeGreaterThan(small.viewBox[0] * 2.5)
  })
})
