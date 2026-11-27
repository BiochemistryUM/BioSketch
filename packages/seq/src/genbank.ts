// Reading GenBank text: the universal format for an annotated sequence, the one NCBI serves and
// the one Addgene, SnapGene and every plasmid tool can save. A file holds one record or several
// (separated by //). Everything is parsed as data; sizes are limited; the sequence is checked.

import { featureName, guessKind, type Feature, type SeqKind, type Segment, type SeqRecord, type Strand, type Topology } from './model'

const MAX_TEXT = 30_000_000
const MAX_FEATURES = 20_000

/** Turn GenBank's `complement(join(12..34,55..60))` into stretches and a strand. */
export function parseLocation(raw: string, seqLen: number): { segments: Segment[]; strand: Strand; wraps: boolean } {
  const strand: Strand = /complement/.test(raw) ? -1 : 1
  const spans = [...raw.matchAll(/(\d+)\s*\.\.\s*[<>]?(\d+)|(?<!\.)\b(\d+)\b(?!\s*\.\.)/g)]
  const segments: Segment[] = []
  for (const m of spans) {
    if (m[1] !== undefined) segments.push({ start: Math.max(0, Number(m[1]) - 1), end: Number(m[2]) })
    else if (m[3] !== undefined) {
      const at = Number(m[3])
      segments.push({ start: at - 1, end: at })
    }
  }
  if (!segments.length) segments.push({ start: 0, end: 0 })
  // A feature written as join(2500..2686,1..300) on a ring runs across the origin.
  let wraps = false
  if (segments.length === 2 && segments[0].end >= seqLen && segments[1].start === 0) {
    wraps = true
    return { segments: [{ start: segments[0].start, end: segments[1].end }], strand, wraps }
  }
  return { segments, strand, wraps }
}

const MOL = /^\s*LOCUS\s+\S+\s+\d+\s+bp\s+(\S+)/i

function moleculeKind(locus: string, bases: string): SeqKind {
  const m = locus.match(MOL)
  const mol = (m?.[1] ?? '').toUpperCase()
  if (mol.includes('RNA')) return 'rna'
  if (mol.includes('DNA')) return 'dna'
  return guessKind(bases)
}

/** Every record in a GenBank file. */
export function parseGenBankAll(text: string): SeqRecord[] {
  if (typeof text !== 'string' || text.length > MAX_TEXT) return []
  const records: SeqRecord[] = []
  // Split on the // that ends each record, keeping each record's own text.
  for (const chunk of text.split(/^\/\/\s*$/m)) {
    if (!/^\s*LOCUS\s/m.test(chunk)) continue
    const record = parseOne(chunk)
    if (record) records.push(record)
  }
  return records
}

/** The first record in a GenBank file, or null when there is none. */
export function parseGenBank(text: string): SeqRecord | null {
  return parseGenBankAll(text)[0] ?? null
}

function parseOne(text: string): SeqRecord | null {
  const lines = text.split(/\r?\n/)
  const locus = lines.find((l) => /^LOCUS\s/.test(l)) ?? ''
  const topology: Topology = /\bcircular\b/i.test(locus) ? 'circular' : 'linear'

  let name = locus.replace(/^LOCUS\s+/, '').split(/\s+/)[0] || 'Sequence'
  let description = ''
  let accession = ''
  let organism = ''

  // The header: DEFINITION, ACCESSION, VERSION, ORGANISM, each possibly wrapped onto further lines.
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^FEATURES\s/.test(line) || /^ORIGIN/.test(line)) break
    const cont = (): string => {
      let v = line.slice(12).trim()
      while (i + 1 < lines.length && /^ {12}\S/.test(lines[i + 1]) && !/^\S/.test(lines[i + 1])) v += ' ' + lines[++i].trim()
      return v
    }
    if (/^DEFINITION/.test(line)) description = cont().replace(/\.$/, '')
    else if (/^ACCESSION/.test(line)) accession = line.slice(12).trim().split(/\s+/)[0] || ''
    else if (/^VERSION/.test(line)) accession = line.slice(12).trim().split(/\s+/)[0] || accession
    else if (/^\s+ORGANISM/.test(line)) organism = line.replace(/^\s+ORGANISM\s+/, '').trim()
  }

  const bases = readOrigin(lines)
  const features = readFeatures(lines, bases.length)
  if (!bases && !features.length) return null

  if (description) name = name // keep the LOCUS name as the short name
  return {
    name,
    description,
    kind: moleculeKind(locus, bases),
    topology,
    bases,
    features,
    source: { db: 'GenBank', accession: accession || undefined, organism: organism || undefined },
  }
}

function readOrigin(lines: string[]): string {
  const start = lines.findIndex((l) => /^ORIGIN/.test(l))
  if (start < 0) return ''
  let seq = ''
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\/\//.test(lines[i]) || /^[A-Z]/.test(lines[i])) break
    seq += lines[i].replace(/[\s\d]/g, '')
  }
  return seq.toUpperCase()
}

function readFeatures(lines: string[], seqLen: number): Feature[] {
  const start = lines.findIndex((l) => /^FEATURES\s/.test(l))
  if (start < 0) return []
  const features: Feature[] = []
  let i = start + 1
  while (i < lines.length) {
    const line = lines[i]
    if (/^ORIGIN/.test(line) || /^\/\//.test(line) || /^[A-Z]/.test(line)) break
    // A feature begins with its key in the left margin (five spaces, then the key).
    const head = line.match(/^ {5}(\S+)\s+(.*)$/)
    if (!head) {
      i++
      continue
    }
    const type = head[1]
    let location = head[2]
    i++
    // The location can run onto further indented lines until the first qualifier or the next feature.
    while (i < lines.length && /^ {21}[^/]/.test(lines[i])) location += lines[i++].trim()
    const qualifiers: Record<string, string[]> = {}
    while (i < lines.length && /^ {21}\//.test(lines[i])) {
      const q = lines[i].trim().match(/^\/(\w+)(?:=(.*))?$/)
      i++
      if (!q) continue
      let value = q[2] ?? ''
      if (value.startsWith('"')) {
        value = value.slice(1)
        while (!value.endsWith('"') && i < lines.length && !/^ {21}\//.test(lines[i]) && !/^ {5}\S/.test(lines[i])) value += ' ' + lines[i++].trim()
        value = value.replace(/"$/, '')
      } else {
        while (i < lines.length && /^ {21}[^/]/.test(lines[i]) && !/^ {5}\S/.test(lines[i])) value += ' ' + lines[i++].trim()
      }
      // A /translation wraps for width only, so its lines join with no space; other text keeps its spaces.
      ;(qualifiers[q[1]] ??= []).push(q[1] === 'translation' ? value.replace(/\s+/g, '') : value.trim())
    }
    const { segments, strand, wraps } = parseLocation(location, seqLen)
    features.push({
      type,
      name: featureName(type, qualifiers),
      start: Math.min(...segments.map((s) => s.start)),
      end: Math.max(...segments.map((s) => s.end)),
      strand,
      segments,
      ...(wraps ? { wraps } : {}),
      qualifiers,
    })
    if (features.length >= MAX_FEATURES) break
  }
  return features
}
