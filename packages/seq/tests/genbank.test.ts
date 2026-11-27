import { describe, expect, it } from 'vitest'
import tp53 from './fixtures/tp53_mrna.gb?raw'
import puc19 from './fixtures/puc19.gb?raw'
import { detectFormat, featureBases, parseFasta, parseGenBank, parseLocation, readSequences, reverseComplement } from '../src/index'

const fixtures: Record<string, string> = { 'tp53_mrna.gb': tp53, 'puc19.gb': puc19 }
const fixture = (name: string): string => fixtures[name]

describe('reverse complement', () => {
  it('turns a strand round', () => {
    expect(reverseComplement('ATGC')).toBe('GCAT')
    expect(reverseComplement('aacg'.toUpperCase())).toBe('CGTT')
    expect(reverseComplement('ATQZ')).toBe('NNAT') // unknown letters become N
  })
})

describe('a GenBank location', () => {
  it('reads a range, a point, complement and join', () => {
    expect(parseLocation('143..1324', 2512)).toEqual({ segments: [{ start: 142, end: 1324 }], strand: 1, wraps: false })
    expect(parseLocation('complement(100..200)', 5000)).toEqual({ segments: [{ start: 99, end: 200 }], strand: -1, wraps: false })
    expect(parseLocation('join(10..20,30..40)', 5000).segments).toEqual([{ start: 9, end: 20 }, { start: 29, end: 40 }])
    expect(parseLocation('35..37', 2512).segments).toEqual([{ start: 34, end: 37 }])
  })
  it('sees a feature that runs across the origin of a ring', () => {
    const loc = parseLocation('join(2600..2686,1..50)', 2686)
    expect(loc.wraps).toBe(true)
    expect(loc.segments).toEqual([{ start: 2599, end: 50 }])
  })
})

describe('the TP53 mRNA (a real RefSeq record)', () => {
  const record = parseGenBank(fixture('tp53_mrna.gb'))!
  it('reads the header and the sequence', () => {
    expect(record.name).toBe('NM_000546')
    expect(record.description).toContain('tumor protein p53')
    expect(record.topology).toBe('linear')
    expect(record.kind).toBe('rna')
    expect(record.bases.length).toBe(2512)
    expect(record.bases.startsWith('CTCAAAAGTCTAGAGCCACC')).toBe(true)
    expect(record.source?.accession).toBe('NM_000546.6')
    expect(record.source?.organism).toContain('Homo sapiens')
  })
  it('reads the features, their names and multi-line qualifiers', () => {
    const cds = record.features.find((f) => f.type === 'CDS')!
    expect(cds.start).toBe(142)
    expect(cds.end).toBe(1324)
    expect(cds.name).toBe('TP53') // from /gene
    // The CDS begins with the start codon.
    expect(featureBases(record, cds).startsWith('ATG')).toBe(true)
    // A qualifier that wraps over several lines is joined into one string.
    expect(cds.qualifiers.translation?.[0]).toMatch(/^MEEPQSDPSV/)
    expect(cds.qualifiers.translation?.[0]).toContain('KKLMFKTEGPDSD')
    expect(record.features.filter((f) => f.type === 'exon').length).toBeGreaterThan(5)
    expect(record.features.some((f) => f.type === 'gene' && f.name === 'TP53')).toBe(true)
  })
})

describe('pUC19 (a real circular plasmid)', () => {
  const record = parseGenBank(fixture('puc19.gb'))!
  it('is read as a ring of the right length, past its long COMMENT block', () => {
    expect(record.topology).toBe('circular')
    expect(record.kind).toBe('dna')
    expect(record.bases.length).toBe(2686)
    expect(record.name).toBe('SYNPUC19CV')
    expect(record.features.some((f) => f.type === 'source')).toBe(true)
  })
})

describe('FASTA and loose text', () => {
  it('reads a FASTA record', () => {
    const r = parseFasta('>seq1 my description\nACGTACGT\nTTTT\n')!
    expect(r.name).toBe('seq1')
    expect(r.description).toBe('my description')
    expect(r.bases).toBe('ACGTACGTTTTT')
    expect(r.kind).toBe('dna')
  })
  it('knows one format from another', () => {
    expect(detectFormat('LOCUS  x 10 bp')).toBe('genbank')
    expect(detectFormat('>a\nACGT')).toBe('fasta')
    expect(detectFormat('ACGTACGT')).toBe('bare')
    expect(detectFormat('hello, world!')).toBe('unknown')
  })
  it('reads whatever is pasted, GenBank, FASTA or bare bases', () => {
    expect(readSequences(fixture('puc19.gb'))[0].bases.length).toBe(2686)
    expect(readSequences('>x\nACGT')[0].bases).toBe('ACGT')
    expect(readSequences('acgt acgt\n1234')[0].bases).toBe('ACGTACGT')
    expect(readSequences('not a sequence?!')).toEqual([])
  })
})
