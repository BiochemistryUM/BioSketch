// Reading FASTA: a header line beginning with ">", then the letters. The simplest sequence format,
// and what Ensembl serves. No features; the name is the first word of the header, the rest its
// description. One file can hold several sequences.

import { guessKind, type SeqRecord } from './model'

const MAX_TEXT = 30_000_000

export function parseFastaAll(text: string): SeqRecord[] {
  if (typeof text !== 'string' || text.length > MAX_TEXT) return []
  const records: SeqRecord[] = []
  let header: string | null = null
  let letters: string[] = []
  const flush = () => {
    if (header === null) return
    const bases = letters.join('').replace(/\s/g, '').toUpperCase()
    const firstSpace = header.search(/\s/)
    const name = (firstSpace < 0 ? header : header.slice(0, firstSpace)) || 'Sequence'
    const description = firstSpace < 0 ? '' : header.slice(firstSpace + 1).trim()
    records.push({ name, description, kind: guessKind(bases), topology: 'linear', bases, features: [], source: { db: 'FASTA' } })
  }
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('>')) {
      flush()
      header = line.slice(1).trim()
      letters = []
    } else if (header !== null) {
      letters.push(line)
    }
  }
  flush()
  return records.filter((r) => r.bases)
}

export const parseFasta = (text: string): SeqRecord | null => parseFastaAll(text)[0] ?? null
