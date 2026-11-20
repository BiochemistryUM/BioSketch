import { describe, expect, it, vi } from 'vitest'
import {
  alphafoldCredit,
  alphafoldInfoUrl,
  cifTokens,
  fetchStructure,
  lookupAlphafold,
  lookupPdbEntry,
  pdbCredit,
  pdbFileUrl,
  rcsbSearchBody,
  readAlphafoldInfo,
  readMmcif,
  readPdb,
  readRcsbEntry,
  readRcsbSearch,
  readStructure,
  searchPdb,
} from '../src/io/structures'
// Real files, fetched in November 2026: an AlphaFold model (CC BY 4.0) and an RCSB entry (CC0, trimmed
// to the backbone atoms and the haem groups; the haem groups must be left out of the trace).
import { chainsFrom } from '../src/model/structure'
import afPdb from './fixtures/AF-P69905.pdb?raw'
import afCif from './fixtures/AF-P69905.cif?raw'
import afInfo from './fixtures/alphafold-P69905.json'
import hbCif from './fixtures/1A3N.cif?raw'
import hbPdb from './fixtures/1A3N.pdb?raw'
import searchReply from './fixtures/rcsb-search.json'
import entryReply from './fixtures/rcsb-entry-1A3N.json'

const reply = (body: string, status = 200): Response => new Response(body, { status })

describe('reading structures', () => {
  it('reads the AlphaFold model of haemoglobin alpha from a PDB file', () => {
    const t = readPdb(afPdb)
    expect(t.chains).toHaveLength(1)
    const c = t.chains[0]
    expect(c.id).toBe('A')
    expect(c.residues).toHaveLength(142)
    expect(c.residues[0]).toEqual({ n: 1, name: 'MET', x: 2.3, y: 10.34, z: 14.71, b: 65.4 })
    expect(c.residues[141].n).toBe(142)
    for (const r of c.residues) {
      expect(r.b).toBeGreaterThanOrEqual(0)
      expect(r.b).toBeLessThanOrEqual(100)
    }
    expect(Math.max(...c.residues.map((r) => r.b))).toBeGreaterThan(90)
  })

  it('reads the same trace from the PDB and the mmCIF file of one model', () => {
    expect(readMmcif(afCif)).toEqual(readPdb(afPdb))
    expect(readStructure(afCif)).toEqual(readStructure(afPdb))
  })

  it('reads four chains of haemoglobin, leaving the haem groups out', () => {
    const t = readMmcif(hbCif)
    expect(t.chains.map((c) => [c.id, c.residues.length])).toEqual([['A', 141], ['B', 145], ['C', 141], ['D', 145]])
    expect(t.chains[0].residues[0]).toEqual({ n: 1, name: 'VAL', x: 10.23, y: 20.76, z: 6.81, b: 24.3 })
    expect(t.chains[1].residues[0]).toMatchObject({ n: 2, name: 'HIS' })
  })

  it('gives the same trace from the PDB and the mmCIF file of 1A3N', () => {
    expect(readPdb(hbPdb)).toEqual(readMmcif(hbCif))
    expect(readStructure(hbPdb).chains).toHaveLength(4)
  })

  it('takes the first alternative position and the first model only', () => {
    const line = (alt: string, n: number, x: number) =>
      `ATOM  ${String(n).padStart(5)}  CA ${alt}GLY A${String(n).padStart(4)}    ${x.toFixed(3).padStart(8)}   0.000   0.000  1.00 10.00           C  `
    const pdb = [line('A', 1, 1), line('B', 1, 9), 'ENDMDL', line(' ', 2, 5)].join('\n')
    const t = readPdb(pdb)
    expect(t.chains[0].residues).toHaveLength(1)
    expect(t.chains[0].residues[0].x).toBe(1)
  })

  it('keeps modified amino acids written as HETATM in the chain, and leaves ions out', () => {
    const line = (rec: string, name: string, res: string, n: number) =>
      `${rec.padEnd(6)}${String(n).padStart(5)} ${name.padEnd(4)} ${res} A${String(n).padStart(4)}    ${n.toFixed(3).padStart(8)}   0.000   0.000  1.00 10.00           C  `
    const pdb = [line('ATOM', ' CA', 'GLY', 1), line('HETATM', ' CA', 'PTR', 2), line('HETATM', ' CA', 'SEP', 3), line('ATOM', ' CA', 'ALA', 4), line('HETATM', 'CA', ' CA', 5)].join('\n')
    const t = readPdb(pdb)
    expect(t.chains[0].residues.map((r) => `${r.name}${r.n}`)).toEqual(['GLY1', 'PTR2', 'SEP3', 'ALA4'])
    expect(chainsFrom(t)[0].seq).toBe('GYSA')
    const cif = `data_x
loop_
_atom_site.group_PDB
_atom_site.label_atom_id
_atom_site.label_comp_id
_atom_site.label_asym_id
_atom_site.label_seq_id
_atom_site.Cartn_x
_atom_site.Cartn_y
_atom_site.Cartn_z
ATOM CA GLY A 1 1 0 0
HETATM CA PTR A 2 2 0 0
HETATM CA CA B . 3 0 0
#
`
    expect(readMmcif(cif).chains.map((c) => c.residues.map((r) => r.name))).toEqual([['GLY', 'PTR']])
  })

  it('reads quoted values in mmCIF', () => {
    expect(cifTokens(`ATOM 1 C 'CA' . "G Y" A it's 'a b' x`)).toEqual(['ATOM', '1', 'C', 'CA', '.', 'G Y', 'A', "it's", 'a b', 'x'])
    const cif = `data_x
loop_
_atom_site.group_PDB
_atom_site.label_atom_id
_atom_site.label_comp_id
_atom_site.label_asym_id
_atom_site.label_seq_id
_atom_site.Cartn_x
_atom_site.Cartn_y
_atom_site.Cartn_z
_atom_site.B_iso_or_equiv
_atom_site.auth_asym_id
_atom_site.auth_seq_id
ATOM "CA" 'ALA' X 7 1.234 5.678 -9.1 33.33 'B' 12
ATOM "CB" 'ALA' X 7 1.0 1.0 1.0 1.0 'B' 12
HETATM "CA" 'CA' X . 1 1 1 1 'C' 99
#
`
    const t = readMmcif(cif)
    // auth ids are preferred; the calcium ion (HETATM) is left out
    expect(t.chains).toEqual([{ id: 'B', residues: [{ n: 12, name: 'ALA', x: 1.23, y: 5.68, z: -9.1, b: 33.3 }] }])
  })

  it('falls back to label ids when there are no auth ids', () => {
    const cif = `data_x
loop_
_atom_site.group_PDB
_atom_site.label_atom_id
_atom_site.label_comp_id
_atom_site.label_asym_id
_atom_site.label_seq_id
_atom_site.Cartn_x
_atom_site.Cartn_y
_atom_site.Cartn_z
ATOM CA SER Q 3 1 2 3
`
    expect(readMmcif(cif).chains[0]).toEqual({ id: 'Q', residues: [{ n: 3, name: 'SER', x: 1, y: 2, z: 3, b: 0 }] })
  })

  it('refuses files without a protein chain, unreadable numbers, and files that are too large', () => {
    expect(() => readPdb('HEADER nothing here')).toThrow('No protein chain was found in this file.')
    expect(() => readStructure('data_x\n_cell.length_a 1\n')).toThrow('No protein chain was found in this file.')
    const bad = `ATOM      1  CA  GLY A   1         NaN   0.000   0.000  1.00 10.00           C  `
    expect(() => readPdb(bad)).toThrow(/coordinates/)
    expect(() => readPdb('x'.repeat(60_000_001))).toThrow(/too large/)
  })

  it('stops at 20,000 residues and at 50 chains', () => {
    const line = (chain: string, n: number) =>
      `ATOM  ${String(n).padStart(5)}  CA  GLY ${chain}${String(n).padStart(4)}       1.000   2.000   3.000  1.00 10.00           C  `
    const many = Array.from({ length: 20_001 }, (_, i) => line('A', i + 1)).join('\n')
    expect(() => readPdb(many)).toThrow(/20,000 residues/)
    const exact = Array.from({ length: 20_000 }, (_, i) => line('A', i + 1)).join('\n')
    expect(readPdb(exact).chains[0].residues).toHaveLength(20_000)
    const chains = Array.from({ length: 51 }, (_, i) => line(String.fromCharCode(i < 26 ? 65 + i : 97 + i - 26), 1)).join('\n')
    expect(() => readPdb(chains)).toThrow(/50 chains/)
  })
})

describe('AlphaFold DB', () => {
  it('builds the address from a checked accession', () => {
    expect(alphafoldInfoUrl(' p69905 ')).toBe('https://alphafold.ebi.ac.uk/api/prediction/P69905')
    expect(alphafoldInfoUrl('A0A0B4J2F0')).toBe('https://alphafold.ebi.ac.uk/api/prediction/A0A0B4J2F0')
    for (const bad of ['', 'P6990', '../P69905', 'P69905 /x', 'P69905?x=1', 'hemoglobin', '1A3N', 'P69905/../x'])
      expect(() => alphafoldInfoUrl(bad)).toThrow(/UniProt/)
  })

  it('reads the real answer', () => {
    const i = readAlphafoldInfo(afInfo)
    expect(i).toMatchObject({ accession: 'P69905', name: 'Hemoglobin subunit alpha', gene: 'HBA1', organism: 'Homo sapiens', version: 6 })
    expect(i.modelUrl).toBe('https://alphafold.ebi.ac.uk/files/AF-P69905-F1-model_v6.pdb')
  })

  it('uses the mmCIF address when there is no PDB address and refuses other hosts', () => {
    const base = afInfo[0] as Record<string, unknown>
    expect(readAlphafoldInfo([{ ...base, pdbUrl: undefined }]).modelUrl).toMatch(/\.cif$/)
    expect(() => readAlphafoldInfo([{ ...base, pdbUrl: 'https://evil.example/files/x.pdb', cifUrl: 'http://alphafold.ebi.ac.uk/files/x.cif' }])).toThrow()
    expect(() => readAlphafoldInfo([{ ...base, pdbUrl: 'https://alphafold.ebi.ac.uk/files/../x.pdb', cifUrl: undefined }])).toThrow()
    expect(() => readAlphafoldInfo([])).toThrow()
    expect(() => readAlphafoldInfo(null)).toThrow()
  })

  it('writes the credit', () => {
    const c = alphafoldCredit('P69905')
    expect(c).toContain('CC BY 4.0')
    expect(c).toContain('Jumper')
    expect(c).toContain('Varadi')
    expect(c).not.toContain('\n')
  })
})

describe('RCSB PDB', () => {
  it('checks PDB codes', () => {
    expect(pdbFileUrl('1a3n')).toBe('https://files.rcsb.org/download/1A3N.cif')
    for (const bad of ['', 'A3N', '1A3N5', '../1A', 'A1A3', '1A 3', '1A3/', '1A3N/../x']) expect(() => pdbFileUrl(bad)).toThrow(/PDB code/)
  })

  it('builds the search and reads the real answer', () => {
    const body = rcsbSearchBody('  haemoglobin ') as { query: { parameters: { value: string } }; return_type: string }
    expect(body.query.parameters.value).toBe('haemoglobin')
    expect(body.return_type).toBe('entry')
    const ids = readRcsbSearch(searchReply)
    expect(ids).toHaveLength(20)
    expect(ids.every((id) => /^[0-9][A-Z0-9]{3}$/.test(id))).toBe(true)
    expect(readRcsbSearch({ result_set: [{ identifier: '../x' }, { identifier: '1abc' }, { identifier: '1ABC' }, 5] })).toEqual(['1ABC'])
    expect(() => readRcsbSearch({})).toThrow()
  })

  it('reads the real entry', () => {
    expect(readRcsbEntry(entryReply)).toEqual({ id: '1A3N', title: 'DEOXY HUMAN HEMOGLOBIN', method: 'X-RAY DIFFRACTION', resolution: 1.8 })
    expect(readRcsbEntry({ rcsb_id: '2abc', struct: {}, exptl: [] })).toEqual({ id: '2ABC', title: '2ABC', method: '', resolution: null })
    expect(() => readRcsbEntry({ rcsb_id: 'x' })).toThrow()
  })

  it('writes the credit', () => {
    expect(pdbCredit('1A3N')).toBe('PDB entry 1A3N, RCSB PDB (CC0).')
  })
})

describe('fetching', () => {
  it('looks up an accession with credentials omitted and no referrer', async () => {
    const f = vi.fn(async () => reply(JSON.stringify(afInfo)))
    const i = await lookupAlphafold('p69905', f)
    expect(i.accession).toBe('P69905')
    expect(f).toHaveBeenCalledWith('https://alphafold.ebi.ac.uk/api/prediction/P69905', expect.objectContaining({ credentials: 'omit', referrerPolicy: 'no-referrer' }))
  })

  it('says so in words when nothing is found or the service is down', async () => {
    await expect(lookupAlphafold('P69905', async () => reply('', 404))).rejects.toThrow(/no model for P69905/)
    await expect(lookupAlphafold('P69905', async () => { throw new TypeError('x') })).rejects.toThrow(/could not be reached/)
    await expect(lookupAlphafold('P69905', async () => reply('', 500))).rejects.toThrow(/could not be reached/)
    await expect(lookupAlphafold('P69905', async () => reply('<html>'))).rejects.toThrow(/could not be read/)
    await expect(lookupAlphafold('nonsense', async () => reply('{}'))).rejects.toThrow(/UniProt/)
  })

  it('searches PDB by POST and handles an empty result', async () => {
    const f = vi.fn(async (_u: string, _i?: RequestInit) => reply(JSON.stringify(searchReply)))
    expect(await searchPdb('haemoglobin', f)).toHaveLength(20)
    const [url, init] = f.mock.calls[0]
    expect(url).toBe('https://search.rcsb.org/rcsbsearch/v2/query')
    expect(init).toMatchObject({ method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer' })
    expect(JSON.parse(String(init?.body)).query.parameters.value).toBe('haemoglobin')
    expect(await searchPdb('zzzz', async () => new Response(null, { status: 204 }))).toEqual([])
    await expect(searchPdb('  ', f)).rejects.toThrow(/Type/)
  })

  it('looks up an entry', async () => {
    const f = vi.fn(async (_u: string, _i?: RequestInit) => reply(JSON.stringify(entryReply)))
    expect((await lookupPdbEntry('1a3n', f)).resolution).toBe(1.8)
    expect(f.mock.calls[0][0]).toBe('https://data.rcsb.org/rest/v1/core/entry/1A3N')
    expect(f.mock.calls[0][1]).toMatchObject({ credentials: 'omit' })
    await expect(lookupPdbEntry('1A3N', async () => reply('', 404))).rejects.toThrow(/no entry 1A3N/)
  })

  it('fetches a structure from the two databases only', async () => {
    const f = vi.fn(async (_u: string, _i?: RequestInit) => reply(afPdb))
    const t = await fetchStructure('https://alphafold.ebi.ac.uk/files/AF-P69905-F1-model_v6.pdb', f)
    expect(t.chains[0].residues).toHaveLength(142)
    expect(f.mock.calls[0][1]).toMatchObject({ credentials: 'omit', referrerPolicy: 'no-referrer' })
    const g = vi.fn(async () => reply(hbCif))
    expect((await fetchStructure(pdbFileUrl('1A3N'), g)).chains).toHaveLength(4)
    for (const bad of ['https://evil.example/files/x.pdb', 'http://files.rcsb.org/download/1A3N.cif', 'https://files.rcsb.org/download/../x.cif', 'https://files.rcsb.org/download/1A3N.cif?x=1'])
      await expect(fetchStructure(bad, g)).rejects.toThrow(/only fetched/)
    await expect(fetchStructure(pdbFileUrl('1A3N'), async () => reply('', 404))).rejects.toThrow(/not found/)
    await expect(fetchStructure(pdbFileUrl('1A3N'), async () => { throw new Error('x') })).rejects.toThrow(/could not be reached/)
    await expect(fetchStructure(pdbFileUrl('1A3N'), async () => reply('data_x\n'))).rejects.toThrow(/No protein chain/)
  })
})
