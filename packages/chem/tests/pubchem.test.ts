import { describe, expect, it } from 'vitest'
import { compoundName, lookupCompound, pubchemUrl, readCompound } from '../src/pubchem'

// An answer as PubChem gave it on 20 November 2026.
const TRIS = { PropertyTable: { Properties: [{ CID: 6503, MolecularFormula: 'C4H11NO3', MolecularWeight: '121.14', Title: 'Tris(hydroxymethyl)aminomethane', SMILES: 'C(C(CO)(CO)N)O' }] } }

const answer = (status: number, body: unknown) => async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })

describe('PubChem lookup', () => {
  it('puts only the name in the address, encoded', () => {
    expect(pubchemUrl(' sodium chloride ')).toBe('https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/sodium%20chloride/property/MolecularWeight,MolecularFormula,Title,SMILES/JSON')
    expect(pubchemUrl('a/../b?x=1')).toContain('a%2F..%2Fb%3Fx%3D1')
  })
  it('reads a compound', async () => {
    expect(await lookupCompound('tris', answer(200, TRIS))).toEqual({ cid: 6503, title: 'Tris(hydroxymethyl)aminomethane', formula: 'C4H11NO3', mw: 121.14, smiles: 'C(C(CO)(CO)N)O' })
  })
  it('sends no cookies and no referrer', async () => {
    let init: RequestInit | undefined
    await lookupCompound('tris', async (_url, i) => {
      init = i
      return new Response(JSON.stringify(TRIS))
    })
    expect(init).toMatchObject({ credentials: 'omit', referrerPolicy: 'no-referrer' })
  })
  it('says so when PubChem does not know the name, or cannot be reached', async () => {
    await expect(lookupCompound('notacompound', answer(404, ''))).rejects.toThrow(/no compound called “notacompound”/)
    await expect(lookupCompound('x', answer(503, ''))).rejects.toThrow(/could not be reached/)
    await expect(
      lookupCompound('x', async () => {
        throw new TypeError('offline')
      }),
    ).rejects.toThrow(/could not be reached/)
    await expect(lookupCompound('  ')).rejects.toThrow(/Type the name/)
  })
  it('does not send a name of dots, which the browser would read as a step up the address', async () => {
    let asked = false
    await expect(
      lookupCompound('..', async () => {
        asked = true
        return new Response('{}')
      }),
    ).rejects.toThrow(/no compound called “..”/)
    expect(asked).toBe(false)
  })
  it('refuses an answer that says it is too large before reading it', async () => {
    const big = async () => new Response(JSON.stringify(TRIS), { headers: { 'content-length': '50000000' } })
    await expect(lookupCompound('tris', big)).rejects.toThrow(/too large/)
  })
  it('refuses an answer that is not a compound', () => {
    expect(() => readCompound({})).toThrow()
    expect(() => readCompound({ PropertyTable: { Properties: [{ CID: 1, MolecularWeight: 'x', MolecularFormula: 'C' }] } })).toThrow()
    expect(() => readCompound({ PropertyTable: { Properties: [{ CID: 1, MolecularWeight: '12', MolecularFormula: '<script>' }] } })).toThrow()
    expect(readCompound({ PropertyTable: { Properties: [{ CID: 1, MolecularWeight: '12', MolecularFormula: 'C', SMILES: 'C\n<b>' }] } }).smiles).toBe('')
  })

  it('names a compound by the words that found it, unless they are PubChem\'s title in other capitals', () => {
    const atp = { cid: 5957, title: "5'-Atp", formula: 'C10H16N5O13P3', mw: 507.18, smiles: '' }
    expect(compoundName({ ...atp, asked: 'ATP' })).toBe('ATP')
    expect(compoundName(atp)).toBe("5'-Atp")
    expect(compoundName({ ...atp, title: 'Caffeine', asked: 'caffeine' })).toBe('Caffeine')
    expect(compoundName({ ...atp, asked: '  ' })).toBe("5'-Atp")
  })
})
