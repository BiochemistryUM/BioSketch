import { describe, expect, it } from 'vitest'
import { validateDoc } from '../src/io/files'
import {
  domainDiagram, isStructuralFeature, isAccession, lookupUniprot, parseMutations, readUniprot, readUniprotSearch, searchUniprot, uniprotCredit, uniprotSearchUrl, uniprotUrl,
} from '../src/io/uniprot'
import { rectsIntersect } from '../src/model/geometry'
import { emptyDoc } from '../src/model/doc'
import { getRect } from '../src/model/nodes'
import type { ShapeNode, TextNode } from '../src/model/types'
// Real answers of UniProt (CC BY 4.0), fetched in November 2026 with the fields uniprotUrl asks for.
import tp53Raw from './fixtures/uniprot-P04637.json?raw'
import searchRaw from './fixtures/uniprot-search-insulin-receptor.json?raw'

const tp53 = readUniprot(JSON.parse(tp53Raw))
const reply = (body: string, status = 200) => async () => new Response(body, { status })

describe('addresses', () => {
  it('accepts accessions only', () => {
    expect(isAccession('P04637')).toBe(true)
    expect(isAccession(' q9y6k9 ')).toBe(true)
    expect(isAccession('A0A024R161')).toBe(true)
    expect(isAccession('TP53')).toBe(false)
    const url = uniprotUrl('p04637')!
    expect(url.startsWith('https://rest.uniprot.org/uniprotkb/P04637.json?fields=')).toBe(true)
    expect(url).toContain('ft_domain')
    expect(uniprotUrl('p53 human')).toBeNull()
    expect(uniprotUrl('P04637/../x')).toBeNull()
  })
  it('encodes the words of a search', () => {
    const url = uniprotSearchUrl('insulin receptor & "x"')
    expect(url).toContain('query=insulin%20receptor%20%26%20%22x%22')
    expect(url).toContain('size=25')
  })
  it('names the credit', () => {
    expect(uniprotCredit('p04637')).toBe('UniProt (CC BY 4.0), entry P04637')
  })
})

describe('reading UniProt', () => {
  it('reads TP53', () => {
    expect(tp53).toMatchObject({ accession: 'P04637', name: 'Cellular tumor antigen p53', gene: 'TP53', organism: 'Homo sapiens', length: 393 })
    const dna = tp53.features.find((f) => f.kind === 'DNA binding')!
    expect([dna.start, dna.end]).toEqual([102, 292])
    expect(tp53.features.find((f) => f.name === 'Oligomerization')).toMatchObject({ kind: 'region', start: 325, end: 356 })
    expect(tp53.features.some((f) => f.kind === 'motif' && f.name === 'Nuclear export signal')).toBe(true)
    // Disordered stretches are left out; every feature lies inside the protein.
    expect(tp53.features.some((f) => /disordered/i.test(f.name))).toBe(false)
    for (const f of tp53.features) {
      expect(f.start).toBeGreaterThanOrEqual(1)
      expect(f.end).toBeLessThanOrEqual(393)
      expect(f.start).toBeLessThanOrEqual(f.end)
      expect(f.name.length).toBeLessThanOrEqual(60)
    }
  })
  it('refuses what is not an entry and drops bad features', () => {
    expect(() => readUniprot(null)).toThrow()
    expect(() => readUniprot({ primaryAccession: 'P04637', sequence: { length: 0 } })).toThrow()
    const p = readUniprot({
      primaryAccession: 'P04637', sequence: { length: 100 },
      features: [
        { type: 'Domain', description: 'x'.repeat(100), location: { start: { value: 1 }, end: { value: 50 } } },
        { type: 'Domain', description: 'late', location: { start: { value: 90 }, end: { value: 120 } } },
        { type: 'Domain', description: 'backwards', location: { start: { value: 60 }, end: { value: 50 } } },
        { type: 'Chain', description: 'not drawn', location: { start: { value: 1 }, end: { value: 50 } } },
        { type: 'Signal', description: '', location: { start: { value: 1 }, end: { value: 20 } } },
      ],
    })
    expect(p.features.map((f) => f.name.length)).toEqual([60, 14])
    expect(p.features[1]).toMatchObject({ kind: 'signal', name: 'Signal peptide' })
    expect(p.name).toBe('P04637')
  })
  it('reads a search with reviewed entries first', () => {
    const hits = readUniprotSearch(JSON.parse(searchRaw))
    expect(hits).toHaveLength(10)
    expect(hits.some((h) => h.accession === 'P06213' && h.gene === 'INSR' && h.name === 'Insulin receptor')).toBe(true)
    const mixed = readUniprotSearch({
      results: [
        { primaryAccession: 'A0A024R161', entryType: 'UniProtKB unreviewed (TrEMBL)' },
        { primaryAccession: 'P04637', entryType: 'UniProtKB reviewed (Swiss-Prot)' },
        { primaryAccession: 'nope', entryType: 'x' },
      ],
    })
    expect(mixed.map((h) => h.accession)).toEqual(['P04637', 'A0A024R161'])
    expect(mixed[0].reviewed).toBe(true)
    expect(mixed[1].reviewed).toBe(false)
  })
})

describe('looking up', () => {
  it('sends no cookies and no referrer', async () => {
    let init: RequestInit | undefined
    const p = await lookupUniprot('P04637', async (_u, i) => {
      init = i
      return new Response(tp53Raw)
    })
    expect(p.gene).toBe('TP53')
    expect(init).toMatchObject({ credentials: 'omit', referrerPolicy: 'no-referrer' })
  })
  it('says what went wrong in words', async () => {
    await expect(lookupUniprot('TP53')).rejects.toThrow(/not a UniProt accession/)
    await expect(lookupUniprot('P04637', reply('', 404))).rejects.toThrow(/no entry/)
    await expect(lookupUniprot('P04637', reply('', 500))).rejects.toThrow(/could not be reached/)
    await expect(lookupUniprot('P04637', reply('not json'))).rejects.toThrow(/could not be read/)
    await expect(lookupUniprot('P04637', async () => { throw new Error('offline') })).rejects.toThrow(/could not be reached/)
    await expect(searchUniprot('  ')).rejects.toThrow(/Type/)
    await expect(searchUniprot('zzzz', reply('{"results":[]}'))).rejects.toThrow(/nothing for/)
    expect((await searchUniprot('insulin receptor', reply(searchRaw))).length).toBe(10)
  })
})

describe('parseMutations', () => {
  const parse = (t: string, len = 393) => parseMutations(t, len)
  it('reads a list with counts in every style', () => {
    const { mutations, unread } = parse('R175H, R248Q x12, R273H (8), G245S, R282W ×3, Y220C n=4')
    expect(unread).toEqual([])
    expect(mutations.map((m) => [m.label, m.position, m.count])).toEqual([
      ['R175H', 175, 1], ['Y220C', 220, 4], ['G245S', 245, 1], ['R248Q', 248, 12], ['R273H', 273, 8], ['R282W', 282, 3],
    ])
  })
  it('reads lines and tab-separated counts, as copied from a table', () => {
    const { mutations, unread } = parse('R175H\t35\nR273C\t20\nR248W 14\n')
    expect(unread).toEqual([])
    expect(mutations.map((m) => [m.label, m.count])).toEqual([['R175H', 35], ['R248W', 14], ['R273C', 20]])
  })
  it('reads three-letter notation, with p. in front', () => {
    const { mutations } = parse('p.Arg175His, Arg248Gln x2, ARG273HIS')
    expect(mutations.map((m) => [m.label, m.count])).toEqual([['R175H', 1], ['R248Q', 2], ['R273H', 1]])
  })
  it('reads stops and frameshifts', () => {
    const { mutations, unread } = parse('R213*, R196X 5, Arg306Ter, P152fs, Pro152Leufs*5 (2), Q144*')
    expect(unread).toEqual([])
    const by = Object.fromEntries(mutations.map((m) => [m.label, m]))
    expect(by['R213*']).toMatchObject({ position: 213, count: 1, kind: 'truncating' })
    expect(by['R196*'].count).toBe(5)
    expect(by['R306*']).toBeTruthy()
    expect(by['Q144*']).toBeTruthy()
    // P152fs written twice: the counts are added.
    expect(by['P152fs']).toMatchObject({ count: 3, kind: 'truncating' })
    expect(by['R175H']).toBeUndefined()
  })
  it('adds the counts of a change named twice', () => {
    expect(parse('R175H, R175H x4').mutations).toEqual([{ label: 'R175H', position: 175, count: 5, kind: 'missense' }])
  })
  it('hands back what it cannot read, word for word', () => {
    const { mutations, unread } = parse('R175H, R999H 3, Mutation, K132_Q136del, hello x2, R248Q (0)', 393)
    expect(mutations.map((m) => m.label)).toEqual(['R175H', 'R248Q'])
    expect(unread).toEqual(expect.arrayContaining(['R999H', 'Mutation', 'K132_Q136del', 'hello', '(0)']))
    // The count after a change that is refused does not go to the one before.
    expect(mutations.find((m) => m.label === 'R175H')!.count).toBe(1)
  })
  it('refuses positions beyond the protein and bad residues', () => {
    const { mutations, unread } = parse('R175H, R175Z, Xyz12Abc', 100)
    expect(mutations).toEqual([])
    expect(unread).toEqual(['R175H', 'R175Z', 'Xyz12Abc'])
  })
  it('copes with empty text and huge lists', () => {
    expect(parse('')).toEqual({ mutations: [], unread: [] })
    const many = Array.from({ length: 300 }, (_, i) => `A${i + 1}G`).join(', ')
    expect(parse(many, 1000).mutations).toHaveLength(200)
    expect(parse(many, 1000).unread).toHaveLength(100)
  })
})

const muts = parseMutations('R175H x35, R248Q x30, R248W x20, R273H x25, R273C x15, G245S x12, R282W x9, Y220C x10, R249S x8, V157F 3, R213* x6, P152fs 2, R337H, E285K 4', 393).mutations

describe('isStructuralFeature', () => {
  const region = (name: string) => ({ kind: 'region' as const, name })
  it('drops functional notes on regions and keeps structure', () => {
    for (const n of ['Interaction with CCAR2', 'Required for interaction with FBXO42', 'Necessary for X', 'Involved in Y', 'Sufficient for Z', 'Basic and acidic residues', 'Polar residues', 'Disordered'])
      expect(isStructuralFeature(region(n)), n).toBe(false)
    for (const n of ['Transcription activation (acidic)', 'Oligomerization', 'Tetramerization', 'Proline-rich', 'Region'])
      expect(isStructuralFeature(region(n)), n).toBe(true)
    expect(isStructuralFeature({ kind: 'domain', name: 'Interaction with x' })).toBe(true)
  })
  it('falls back to every feature when none is structural', () => {
    const p = { ...tp53, features: [{ kind: 'region' as const, name: 'Interaction with A', start: 1, end: 50 }] }
    expect(domainDiagram(p, []).nodes.some((n) => n.type === 'shape' && n.name === 'Interaction with A')).toBe(true)
    expect(domainDiagram(tp53, [], { allFeatures: true }).nodes.some((n) => n.type === 'shape' && n.name === 'Interaction with CCAR2')).toBe(true)
  })
})

describe('domainDiagram', () => {
  const { nodes } = domainDiagram(tp53, muts)
  const text = nodes.filter((n): n is TextNode => n.type === 'text')

  it('is deterministic and uses plain, unique, short ids in one group', () => {
    expect(domainDiagram(tp53, muts)).toEqual({ nodes })
    const ids = nodes.map((n) => n.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[A-Za-z][A-Za-z0-9_-]{0,63}$/)
    expect(new Set(nodes.map((n) => n.groupId)).size).toBe(1)
  })

  it('survives validateDoc unchanged', () => {
    const doc = { ...emptyDoc(), nodes }
    const round = validateDoc(JSON.parse(JSON.stringify(doc)))
    expect(round.nodes).toEqual(nodes)
  })

  it('starts at the origin and is about as wide as asked', () => {
    const doc = { ...emptyDoc(), nodes }
    const rects = nodes.map((n) => getRect(n, doc))
    expect(Math.min(...rects.map((r) => r.x))).toBeGreaterThanOrEqual(0)
    expect(Math.min(...rects.map((r) => r.y))).toBe(0)
    expect(Math.max(...rects.map((r) => r.x + r.w))).toBeLessThanOrEqual(800.5)
    const narrow = domainDiagram(tp53, muts, { width: 500 })
    expect(Math.max(...narrow.nodes.map((n) => getRect(n, doc)).map((r) => r.x + r.w))).toBeLessThanOrEqual(500.5)
  })

  it('draws the backbone, the numbers, the name and the features', () => {
    expect(text.some((t) => t.text === '1')).toBe(true)
    expect(text.some((t) => t.text === '393')).toBe(true)
    expect(text.some((t) => t.text.includes('(*TP53*)') && t.text.startsWith('Cellular tumor antigen p53'))).toBe(true)
    const named = (name: string) => nodes.find((n): n is ShapeNode => n.type === 'shape' && n.name === name)!
    const dna = named('DNA binding')
    expect(dna.x).toBeCloseTo((101 / 393) * 800, 5)
    expect(dna.x + dna.w).toBeCloseTo((292 / 393) * 800, 5)
    expect(dna.label?.text).toBe('DNA binding')
  })

  it('stacks overlapping features so that none hides another', () => {
    const shapes = nodes.filter((n): n is ShapeNode => n.type === 'shape' && n.shape === 'roundrect' && n.name !== 'Protein')
    expect(shapes.length).toBe(tp53.features.filter(isStructuralFeature).length)
    for (const a of shapes) for (const b of shapes) if (a !== b) expect(rectsIntersect(a, { x: b.x, y: b.y, w: b.w, h: b.h }), `${a.name} / ${b.name}`).toBe(false)
  })

  it('gives the same name the same colour', () => {
    const p = { ...tp53, features: [{ kind: 'domain' as const, name: 'Kinase', start: 1, end: 40 }, { kind: 'domain' as const, name: 'Kinase', start: 100, end: 140 }, { kind: 'domain' as const, name: 'SH2', start: 200, end: 240 }] }
    const f = domainDiagram(p, []).nodes.filter((n): n is ShapeNode => n.type === 'shape' && n.name !== 'Protein')
    expect(f[0].fill).toBe(f[1].fill)
    expect(f[0].fill).not.toBe(f[2].fill)
  })

  it('has no label on another label', () => {
    const doc = { ...emptyDoc(), nodes }
    const shrink = (r: { x: number; y: number; w: number; h: number }) => ({ x: r.x + 1, y: r.y + 1, w: Math.max(0, r.w - 2), h: Math.max(0, r.h - 2) })
    for (const a of text) for (const b of text) if (a !== b) expect(rectsIntersect(shrink(getRect(a, doc)), shrink(getRect(b, doc))), `“${a.text}” and “${b.text}”`).toBe(false)
  })

  it('has no label on a circle', () => {
    const doc = { ...emptyDoc(), nodes }
    const circles = nodes.filter((n): n is ShapeNode => n.type === 'shape' && n.shape === 'ellipse')
    for (const t of text.filter((x) => /^[A-Z]\d+/.test(x.text)))
      for (const c of circles) expect(rectsIntersect(getRect(t, doc), getRect(c, doc)), `${t.text} on ${c.name}`).toBe(false)
  })

  it('keeps a dense cluster of mutations low', () => {
    const cluster = parseMutations('R175H x35, R248Q (28), R273H 30, G245S 12, R248W 20, R213* 9, Y220C 8', 393).mutations
    const out = domainDiagram(tp53, cluster).nodes
    const doc = { ...emptyDoc(), nodes: out }
    const rects = out.map((n) => getRect(n, doc))
    expect(Math.max(...rects.map((r) => r.y + r.h))).toBeLessThanOrEqual(340)
    expect(Math.max(...rects.map((r) => r.x + r.w))).toBeLessThanOrEqual(800.5)
    const backbone = out.find((n): n is ShapeNode => n.type === 'shape' && n.name === 'Protein')!
    expect(backbone.y).toBeLessThanOrEqual(215)
  })

  it('runs the line of a feature name straight down, through no other name', () => {
    const cluster = parseMutations('R175H x35, R248Q (28), R273H 30, G245S 12, R248W 20, R213* 9, Y220C 8', 393).mutations
    const out = domainDiagram(tp53, cluster).nodes
    const doc = { ...emptyDoc(), nodes: out }
    const names = new Set(tp53.features.filter(isStructuralFeature).map((f) => f.name.replace(/\*/g, '\\*')))
    const labels = out.filter((n): n is TextNode => n.type === 'text' && names.has(n.text))
    expect(labels.length).toBeGreaterThan(3)
    const baseline = out.find((n): n is ShapeNode => n.type === 'shape' && n.name === 'Protein')!.y
    const leaders = out.filter((n) => n.type === 'connector' && n.strokeWidth === 0.75 && n.from.y > baseline)
    expect(leaders.length).toBeGreaterThan(0)
    for (const l of leaders) {
      if (l.type !== 'connector') continue
      expect(l.from.x).toBe(l.to.x)
      const own = labels.filter((t) => { const r = getRect(t, doc); return l.from.x >= r.x + 4 - 0.001 && l.from.x <= r.x + r.w - 4 + 0.001 && Math.abs(r.y - l.to.y) < 0.001 })
      expect(own.length, `a name under the line at ${l.from.x}`).toBe(1)
      for (const t of labels) {
        if (t === own[0]) continue
        const r = getRect(t, doc)
        const inside = l.from.x > r.x && l.from.x < r.x + r.w && Math.min(l.from.y, l.to.y) < r.y + r.h && Math.max(l.from.y, l.to.y) > r.y
        expect(inside, `line at ${l.from.x} through “${t.text}”`).toBe(false)
      }
    }
  })

  it('makes lollipops taller the more often a change was found', () => {
    const one = (label: string, count: number) =>
      domainDiagram(tp53, [{ label, position: 175, count, kind: 'missense' }]).nodes.find((n): n is ShapeNode => n.type === 'shape' && n.name === label)!
    const rise = (c: number) => {
      const out = domainDiagram(tp53, [{ label: 'R175H', position: 175, count: c, kind: 'missense' }]).nodes
      return out.find((n): n is ShapeNode => n.type === 'shape' && n.name === 'Protein')!.y - one('R175H', c).y
    }
    const heights = [1, 2, 5, 12, 40, 200].map(rise)
    for (let i = 1; i < heights.length; i++) expect(heights[i]).toBeGreaterThan(heights[i - 1])
    // In one picture too.
    const tops = new Map(nodes.filter((n): n is ShapeNode => n.type === 'shape' && n.shape === 'ellipse').map((n) => [n.name, n.y]))
    expect(tops.get('R175H')!).toBeLessThan(tops.get('R273H')!)
    expect(tops.get('R273H')!).toBeLessThan(tops.get('V157F')!)
    expect(tops.get('R248Q')!).toBeLessThan(tops.get('R248W')!)
  })

  it('draws without mutations, and with a protein with no features', () => {
    const none = domainDiagram({ ...tp53, features: [] }, [])
    expect(none.nodes.length).toBe(4)
    expect(validateDoc(JSON.parse(JSON.stringify({ ...emptyDoc(), nodes: none.nodes }))).nodes).toEqual(none.nodes)
  })

  it('keeps marks in names from being read as formatting', () => {
    const p = { ...tp53, name: 'A*B^{2}', features: [{ kind: 'domain' as const, name: 'Star*', start: 1, end: 5 }] }
    const out = domainDiagram(p, parseMutations('R213*', 393).mutations).nodes
    expect(out.some((n) => n.type === 'text' && n.text.includes('R213\\*'))).toBe(true)
    expect(validateDoc(JSON.parse(JSON.stringify({ ...emptyDoc(), nodes: out }))).nodes).toEqual(out)
  })
})

describe('the order of search results', () => {
  it('puts the gene searched for, then human and the usual organisms, first', () => {
    const entry = (acc: string, gene: string, organism: string, reviewed = true) => ({
      primaryAccession: acc,
      entryType: reviewed ? 'UniProtKB reviewed (Swiss-Prot)' : 'UniProtKB unreviewed (TrEMBL)',
      proteinDescription: { recommendedName: { fullName: { value: 'Haemoglobin' } } },
      genes: [{ geneName: { value: gene } }],
      organism: { scientificName: organism },
    })
    const reply = { results: [entry('Q1A6S5', 'hba1', 'Arctogadus glacialis'), entry('P01942', 'Hba', 'Mus musculus'), entry('P69905', 'HBA1', 'Homo sapiens'), entry('A0A024R0Y4', 'HBA2', 'Homo sapiens', false)] }
    expect(readUniprotSearch(reply, 'HBA1').map((h) => h.accession)).toEqual(['P69905', 'Q1A6S5', 'A0A024R0Y4', 'P01942'])
    expect(readUniprotSearch(reply, 'haemoglobin').map((h) => h.accession)).toEqual(['P69905', 'A0A024R0Y4', 'P01942', 'Q1A6S5'])
  })
})
