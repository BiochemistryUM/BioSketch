// Working out what a piece of pasted or dropped text is, and reading it. GenBank when it has a
// LOCUS line or an ORIGIN block, FASTA when it begins with ">", a bare sequence when it is only
// letters. Returns every record the text holds.

import { parseFastaAll } from './fasta'
import { parseGenBankAll } from './genbank'
import { guessKind, type SeqRecord } from './model'

export type SeqFormat = 'genbank' | 'fasta' | 'bare' | 'unknown'

export function detectFormat(text: string): SeqFormat {
  const head = text.slice(0, 2000)
  if (/^\s*LOCUS\s/m.test(head) || /^ORIGIN/m.test(text)) return 'genbank'
  if (/^\s*>/.test(head)) return 'fasta'
  if (/[A-Za-z]/.test(head) && /^[A-Za-z*\s\d-]+$/.test(text.trim().slice(0, 2000))) return 'bare'
  return 'unknown'
}

/** Read sequences from pasted or dropped text, whatever common form it takes. */
export function readSequences(text: string, name = 'Pasted sequence'): SeqRecord[] {
  switch (detectFormat(text)) {
    case 'genbank':
      return parseGenBankAll(text)
    case 'fasta':
      return parseFastaAll(text)
    case 'bare': {
      const bases = text.replace(/[\s\d]/g, '').toUpperCase()
      return bases ? [{ name, description: '', kind: guessKind(bases), topology: 'linear', bases, features: [], source: { db: 'pasted' } }] : []
    }
    default:
      return []
  }
}
