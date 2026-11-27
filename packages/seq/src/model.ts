// What a sequence is in BioSketch: the bases (or residues), whether the molecule is a line or a
// ring, and the features along it. Positions are kept the way a programmer expects, not the way
// GenBank writes them: `start` counts from 0, `end` is one past the last base, so `bases.slice(start,
// end)` is the feature. GenBank's own 1-based, inclusive numbers are turned into these when it is read.

export type SeqKind = 'dna' | 'rna' | 'protein'
export type Topology = 'linear' | 'circular'
export type Strand = 1 | -1

/** One stretch of a feature. A feature of several stretches (a spliced CDS) has one segment each. */
export interface Segment {
  start: number
  end: number
}

export interface Feature {
  /** The kind of feature, as GenBank names it: CDS, gene, exon, promoter, misc_feature… */
  type: string
  /** A name to show: the gene, the label, the product, else the type. */
  name: string
  start: number
  end: number
  strand: Strand
  /** The stretches, in order; one for a plain feature, several for a spliced one. */
  segments: Segment[]
  /** True when the feature runs across the origin of a circular molecule (end wraps to start). */
  wraps?: boolean
  /** Everything GenBank wrote under the feature (/gene, /product, /note…), each key once, values in order. */
  qualifiers: Record<string, string[]>
}

export interface SeqRecord {
  name: string
  description: string
  kind: SeqKind
  topology: Topology
  /** Upper-case, without spaces or numbers. For DNA/RNA the letters ACGT(U) and the ambiguity codes. */
  bases: string
  features: Feature[]
  /** Where it came from, for the record: an accession, a database, a file. */
  source?: { db?: string; accession?: string; organism?: string }
}

export const length = (record: SeqRecord): number => record.bases.length

const COMPLEMENT: Record<string, string> = {
  A: 'T', T: 'A', G: 'C', C: 'G', U: 'A', N: 'N', R: 'Y', Y: 'R', S: 'S', W: 'W', K: 'M', M: 'K', B: 'V', V: 'B', D: 'H', H: 'D',
}

/** The reverse complement of a DNA/RNA string (upper case); unknown letters are kept as N. */
export function reverseComplement(bases: string): string {
  let out = ''
  for (let i = bases.length - 1; i >= 0; i--) out += COMPLEMENT[bases[i]] ?? 'N'
  return out
}

/** The bases of a feature, read off the record with its strand and (for a ring) its wrap. */
export function featureBases(record: SeqRecord, feature: Feature): string {
  let seq = ''
  for (const seg of feature.segments) {
    seq += seg.start <= seg.end ? record.bases.slice(seg.start, seg.end) : record.bases.slice(seg.start) + record.bases.slice(0, seg.end)
  }
  return feature.strand === -1 ? reverseComplement(seq) : seq
}

/** A short name for a feature from its qualifiers, else its type. */
export function featureName(type: string, qualifiers: Record<string, string[]>): string {
  for (const key of ['gene', 'label', 'locus_tag', 'product', 'standard_name', 'note']) {
    const v = qualifiers[key]?.[0]
    if (v) return v.length > 40 ? v.slice(0, 39) + '…' : v
  }
  return type
}

const DNA = /^[ACGTNRYSWKMBDHV]+$/
const RNA = /^[ACGUNRYSWKMBDHV]+$/

/** What kind of molecule a string of letters is: DNA, RNA, or (failing those) protein. */
export function guessKind(letters: string): SeqKind {
  const up = letters.toUpperCase()
  if (!up) return 'dna'
  if (DNA.test(up)) return 'dna'
  if (RNA.test(up)) return 'rna'
  return 'protein'
}
