// Protein structures from AlphaFold DB and RCSB PDB, reduced to a backbone trace: one point (the
// Cα atom) for every residue. Both databases let any web page read their files; what the scientist
// types (an accession, a search word) is the only thing sent, and only when they press the button:
// no cookies, no address of this page. A structure file is as untrusted as any other file: size
// limits come first, every number is checked, and only the trace is kept.

import { isModifiedAminoAcid } from './structure'

export interface Residue {
  /** Residue number as the file writes it. */
  n: number
  /** Three-letter name (MET, HIS). */
  name: string
  /** Coordinates of the Cα atom in ångström, rounded to 0.01. */
  x: number
  y: number
  z: number
  /** B-factor, rounded to 0.1. In an AlphaFold model it is the confidence, pLDDT, from 0 to 100. */
  b: number
}

export interface TraceChain {
  id: string
  residues: Residue[]
}

export interface Trace {
  chains: TraceChain[]
}

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>

export const MAX_TEXT = 60_000_000
export const MAX_RESIDUES = 20_000
export const MAX_CHAINS = 50

const round = (v: number, places: number): number => {
  const f = 10 ** places
  return Math.round(v * f) / f
}

/** Collects Cα atoms: the first of each residue only (the first alternative position), polymer residues in the first model. */
class Collector {
  private chains = new Map<string, { residues: Residue[]; seen: Set<string> }>()
  private count = 0

  add(chain: string, n: number, insertion: string, name: string, x: number, y: number, z: number, b: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z) || !Number.isFinite(n)) {
      throw new Error('This file holds coordinates that could not be read.')
    }
    let entry = this.chains.get(chain)
    if (!entry) {
      if (this.chains.size >= MAX_CHAINS) throw new Error(`This structure has more than ${MAX_CHAINS} chains, which is more than BioSketch draws.`)
      entry = { residues: [], seen: new Set() }
      this.chains.set(chain, entry)
    }
    const key = `${n}${insertion}`
    if (entry.seen.has(key)) return
    if (this.count >= MAX_RESIDUES) throw new Error(`This structure has more than ${MAX_RESIDUES.toLocaleString('en-GB')} residues, which is more than BioSketch draws.`)
    entry.seen.add(key)
    this.count++
    entry.residues.push({ n, name: name.slice(0, 3).toUpperCase(), x: round(x, 2), y: round(y, 2), z: round(z, 2), b: Number.isFinite(b) ? round(b, 1) : 0 })
  }

  done(): Trace {
    const chains: TraceChain[] = []
    for (const [id, c] of this.chains) if (c.residues.length > 0) chains.push({ id, residues: c.residues })
    if (chains.length === 0) throw new Error('No protein chain was found in this file.')
    return { chains }
  }
}

function checkSize(text: string): void {
  if (text.length > MAX_TEXT) throw new Error('This file is too large to read (over 60 MB).')
}

/** Read a legacy PDB file (fixed columns): the Cα of every ATOM residue of the first model, and of every modified amino acid (HETATM). */
export function readPdb(text: string): Trace {
  checkSize(text)
  const out = new Collector()
  let start = 0
  while (start < text.length) {
    let end = text.indexOf('\n', start)
    if (end < 0) end = text.length
    const line = text.slice(start, end)
    start = end + 1
    if (line.startsWith('ENDMDL')) break
    if (!(line.startsWith('ATOM  ') || (line.startsWith('HETATM') && isModifiedAminoAcid(line.slice(17, 20).trim()))) || line.length < 54) continue
    if (line.slice(12, 16).trim() !== 'CA') continue
    // Column 17 is the alternative position; the first Cα of a residue wins, the rest are skipped.
    out.add(
      line[21] === ' ' ? 'A' : line[21],
      parseInt(line.slice(22, 26), 10),
      line[26] === ' ' ? '' : line[26],
      line.slice(17, 20).trim(),
      parseFloat(line.slice(30, 38)),
      parseFloat(line.slice(38, 46)),
      parseFloat(line.slice(46, 54)),
      line.length >= 66 ? parseFloat(line.slice(60, 66)) : 0,
    )
  }
  return out.done()
}

/** Split one line of mmCIF into values: white space separates, single or double quotes hold spaces. */
export function cifTokens(line: string): string[] {
  const out: string[] = []
  let i = 0
  const n = line.length
  while (i < n) {
    const c = line[i]
    if (c === ' ' || c === '\t' || c === '\r') {
      i++
    } else if (c === "'" || c === '"') {
      // A quote ends the value only when white space (or the end of the line) follows it.
      let j = i + 1
      while (j < n && !(line[j] === c && (j + 1 === n || /\s/.test(line[j + 1])))) j++
      out.push(line.slice(i + 1, j))
      i = j + 1
    } else {
      let j = i
      while (j < n && !/\s/.test(line[j])) j++
      out.push(line.slice(i, j))
      i = j
    }
  }
  return out
}

/** Read an mmCIF file: the `_atom_site` loop, columns found by the names in its header. */
export function readMmcif(text: string): Trace {
  checkSize(text)
  const out = new Collector()
  let start = 0
  let inHeader = false
  let names: string[] = []
  let cols: Record<string, number> | null = null
  let pending: string[] = []
  let sawLoop = false
  let firstModel: string | null = null
  const col = (row: string[], ...keys: string[]): string | undefined => {
    for (const k of keys) {
      const i = cols![k]
      if (i !== undefined && row[i] !== undefined && row[i] !== '.' && row[i] !== '?') return row[i]
    }
    return undefined
  }
  const handle = (row: string[]): void => {
    const group = col(row, 'group_PDB')
    if (group !== 'ATOM' && !(group === 'HETATM' && isModifiedAminoAcid(col(row, 'label_comp_id', 'auth_comp_id') ?? ''))) return
    const atom = col(row, 'label_atom_id', 'auth_atom_id')
    if (atom !== 'CA') return
    const model = col(row, 'pdbx_PDB_model_num') ?? '1'
    if (firstModel === null) firstModel = model
    else if (model !== firstModel) return
    const chain = col(row, 'auth_asym_id', 'label_asym_id') ?? 'A'
    const seq = col(row, 'auth_seq_id', 'label_seq_id')
    if (seq === undefined) return
    out.add(
      chain,
      Number(seq),
      col(row, 'pdbx_PDB_ins_code') ?? '',
      col(row, 'auth_comp_id', 'label_comp_id') ?? '',
      Number(col(row, 'Cartn_x')),
      Number(col(row, 'Cartn_y')),
      Number(col(row, 'Cartn_z')),
      Number(col(row, 'B_iso_or_equiv') ?? 0),
    )
  }
  while (start < text.length) {
    let end = text.indexOf('\n', start)
    if (end < 0) end = text.length
    const line = text.slice(start, end)
    start = end + 1
    if (cols) {
      // Inside the rows of the atom loop: they end at the next item, loop, block or comment.
      if (line.startsWith('_') || line.startsWith('loop_') || line.startsWith('data_') || line.startsWith('#')) {
        cols = null
        if (!line.startsWith('loop_')) continue
      } else {
        for (const t of cifTokens(line)) {
          pending.push(t)
          if (pending.length === names.length) {
            handle(pending)
            pending = []
          }
        }
        continue
      }
    }
    if (line.startsWith('loop_')) {
      inHeader = true
      names = []
      continue
    }
    if (inHeader) {
      const t = line.trim()
      if (t.startsWith('_')) {
        names.push(t.split(/\s/)[0])
        continue
      }
      inHeader = false
      if (names.length > 0 && names.every((x) => x.startsWith('_atom_site.'))) {
        sawLoop = true
        cols = {}
        names.forEach((x, i) => (cols![x.slice('_atom_site.'.length)] = i))
        names = names.map((x) => x)
        pending = []
        if (t === '' || t.startsWith('#')) continue
        for (const tok of cifTokens(line)) {
          pending.push(tok)
          if (pending.length === names.length) {
            handle(pending)
            pending = []
          }
        }
      }
    }
  }
  if (!sawLoop) throw new Error('No protein chain was found in this file.')
  return out.done()
}

/** Read either format; mmCIF is recognised by its `data_` line or its `_atom_site` names. */
export function readStructure(text: string): Trace {
  checkSize(text)
  return /^data_|^_atom_site\.|^loop_/m.test(text.slice(0, 200_000)) || text.includes('\n_atom_site.') ? readMmcif(text) : readPdb(text)
}

// ---------------------------------------------------------------------------------------------
// AlphaFold DB

const UNIPROT = /^(?:[OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9](?:[A-Z][A-Z0-9]{2}[0-9]){1,2})$/
const AF_FILES = 'https://alphafold.ebi.ac.uk/files/'

/** A UniProt accession in capitals, or null when the text is not one. */
export function cleanAccession(text: string): string | null {
  const acc = text.trim().toUpperCase()
  return UNIPROT.test(acc) ? acc : null
}

export function alphafoldInfoUrl(accession: string): string {
  const acc = cleanAccession(accession)
  if (!acc) throw new Error('This is not a UniProt accession. They look like P69905 or Q8I3H7.')
  return `https://alphafold.ebi.ac.uk/api/prediction/${acc}`
}

export interface AlphafoldInfo {
  accession: string
  name: string
  gene: string
  organism: string
  version: number
  modelUrl: string
}

const text = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').slice(0, max) : '')

function allowedUrl(v: unknown, prefix: string, extension: RegExp): string | null {
  if (typeof v !== 'string' || !v.startsWith(prefix) || /[\s"'<>\\]/.test(v)) return null
  const rest = v.slice(prefix.length)
  if (rest.includes('..') || rest.includes('/') || rest.includes('?') || rest.includes('#') || !extension.test(rest)) return null
  return v
}

/** Read AlphaFold DB's answer for an accession (a list with one model, or the model itself). */
export function readAlphafoldInfo(json: unknown): AlphafoldInfo {
  const first = (Array.isArray(json) ? json[0] : json) as Record<string, unknown> | null | undefined
  if (!first || typeof first !== 'object') throw new Error('AlphaFold DB’s answer could not be read.')
  const accession = typeof first.uniprotAccession === 'string' ? cleanAccession(first.uniprotAccession) : null
  const modelUrl = allowedUrl(first.pdbUrl, AF_FILES, /\.pdb$/) ?? allowedUrl(first.cifUrl, AF_FILES, /\.cif$/)
  if (!accession || !modelUrl) throw new Error('AlphaFold DB’s answer could not be read.')
  const version = Number(first.latestVersion)
  return {
    accession,
    name: text(first.uniprotDescription, 200) || accession,
    gene: text(first.gene, 60),
    organism: text(first.organismScientificName, 120),
    version: Number.isInteger(version) && version > 0 ? version : 0,
    modelUrl,
  }
}

export const ALPHAFOLD_CITATIONS =
  'Jumper et al. (2021) Nature 596, 583–589; Varadi et al. (2024) Nucleic Acids Research 52, D368–D375'

/** The credit line for an AlphaFold model: CC BY 4.0, which asks for the two papers. */
export function alphafoldCredit(accession: string): string {
  return `AlphaFold DB model for UniProt ${accession} (CC BY 4.0). ${ALPHAFOLD_CITATIONS}.`
}

// ---------------------------------------------------------------------------------------------
// RCSB PDB

const PDB_ID = /^[0-9][A-Za-z0-9]{3}$/
const RCSB_FILES = 'https://files.rcsb.org/download/'
export const RCSB_SEARCH_URL = 'https://search.rcsb.org/rcsbsearch/v2/query'
const MAX_ANSWER = 2_000_000

/** A PDB id in capitals, or null. */
export function cleanPdbId(id: string): string | null {
  const t = id.trim()
  return PDB_ID.test(t) ? t.toUpperCase() : null
}

export function pdbFileUrl(id: string): string {
  const clean = cleanPdbId(id)
  if (!clean) throw new Error('This is not a PDB code. They have four characters, like 1A3N.')
  return `${RCSB_FILES}${clean}.cif`
}

export function rcsbEntryUrl(id: string): string {
  const clean = cleanPdbId(id)
  if (!clean) throw new Error('This is not a PDB code. They have four characters, like 1A3N.')
  return `https://data.rcsb.org/rest/v1/core/entry/${clean}`
}

/** The body of the full-text search, to be sent with POST: the ids of up to 20 entries. */
export function rcsbSearchBody(words: string): unknown {
  return {
    query: { type: 'terminal', service: 'full_text', parameters: { value: words.trim().slice(0, 200) } },
    return_type: 'entry',
    request_options: { paginate: { start: 0, rows: 20 } },
  }
}

/** The ids in a search answer, each checked. */
export function readRcsbSearch(json: unknown): string[] {
  const set = (json as { result_set?: unknown } | null)?.result_set
  if (!Array.isArray(set)) throw new Error('RCSB PDB’s answer could not be read.')
  const ids: string[] = []
  for (const r of set) {
    const id = typeof (r as { identifier?: unknown } | null)?.identifier === 'string' ? cleanPdbId((r as { identifier: string }).identifier) : null
    if (id && !ids.includes(id)) ids.push(id)
  }
  return ids.slice(0, 20)
}

export interface PdbEntry {
  id: string
  title: string
  method: string
  /** Resolution in ångström, or null (NMR and other methods have none). */
  resolution: number | null
}

export function readRcsbEntry(json: unknown): PdbEntry {
  const d = json as Record<string, any> | null // eslint-disable-line @typescript-eslint/no-explicit-any
  const id = typeof d?.rcsb_id === 'string' ? cleanPdbId(d.rcsb_id) : null
  if (!id) throw new Error('RCSB PDB’s answer could not be read.')
  const res = Array.isArray(d?.rcsb_entry_info?.resolution_combined) ? Number(d.rcsb_entry_info.resolution_combined[0]) : NaN
  return {
    id,
    title: text(d?.struct?.title, 300) || id,
    method: text(Array.isArray(d?.exptl) ? d.exptl[0]?.method : '', 80),
    resolution: Number.isFinite(res) && res > 0 ? res : null,
  }
}

export function pdbCredit(id: string): string {
  return `PDB entry ${id}, RCSB PDB (CC0).`
}

// ---------------------------------------------------------------------------------------------
// Fetching

const UNREACHABLE = 'The structure service could not be reached. Check the connection and try again in a moment.'

async function getJson(url: string, fetcher: Fetcher, init: RequestInit, who: string): Promise<{ status: number; data: unknown }> {
  let response: Response
  try {
    response = await fetcher(url, { ...init, credentials: 'omit', referrerPolicy: 'no-referrer' })
  } catch {
    throw new Error(`${who} could not be reached. Check the connection and try again in a moment.`)
  }
  if (response.status === 204) return { status: 204, data: null }
  if (response.status === 404) return { status: 404, data: null }
  if (!response.ok) throw new Error(`${who} could not be reached. Try again in a moment.`)
  const body = await response.text()
  if (body.length > MAX_ANSWER) throw new Error(`${who}’s answer is too large to read.`)
  try {
    return { status: response.status, data: JSON.parse(body) }
  } catch {
    throw new Error(`${who}’s answer could not be read.`)
  }
}

/** Look up the predicted model of a UniProt accession in AlphaFold DB. */
export async function lookupAlphafold(accession: string, fetcher: Fetcher = fetch): Promise<AlphafoldInfo> {
  const acc = cleanAccession(accession)
  if (!acc) throw new Error('This is not a UniProt accession. They look like P69905 or Q8I3H7.')
  const { status, data } = await getJson(alphafoldInfoUrl(acc), fetcher, {}, 'AlphaFold DB')
  if (status === 404 || status === 204) throw new Error(`AlphaFold DB has no model for ${acc}. Check the accession, or look for the protein in RCSB PDB.`)
  return readAlphafoldInfo(data)
}

/** Search RCSB PDB by words (a protein, a gene, a title); gives up to 20 PDB codes. */
export async function searchPdb(words: string, fetcher: Fetcher = fetch): Promise<string[]> {
  if (!words.trim()) throw new Error('Type a protein name, a gene or a PDB code.')
  const { status, data } = await getJson(
    RCSB_SEARCH_URL,
    fetcher,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rcsbSearchBody(words)) },
    'RCSB PDB',
  )
  if (status === 204) return []
  return readRcsbSearch(data)
}

/** The title, method and resolution of a PDB entry. */
export async function lookupPdbEntry(id: string, fetcher: Fetcher = fetch): Promise<PdbEntry> {
  const clean = cleanPdbId(id)
  if (!clean) throw new Error('This is not a PDB code. They have four characters, like 1A3N.')
  const { status, data } = await getJson(rcsbEntryUrl(clean), fetcher, {}, 'RCSB PDB')
  if (status === 404 || status === 204) throw new Error(`RCSB PDB has no entry ${clean}.`)
  return readRcsbEntry(data)
}

/** Download a structure file from one of the two databases and reduce it to its trace. */
export async function fetchStructure(url: string, fetcher: Fetcher = fetch): Promise<Trace> {
  const ok =
    allowedUrl(url, AF_FILES, /\.(pdb|cif)$/) ?? allowedUrl(url, RCSB_FILES, /^[0-9][A-Za-z0-9]{3}\.(cif|pdb)$/)
  if (!ok) throw new Error('Structures are only fetched from AlphaFold DB and RCSB PDB.')
  let response: Response
  try {
    response = await fetcher(ok, { credentials: 'omit', referrerPolicy: 'no-referrer' })
  } catch {
    throw new Error(UNREACHABLE)
  }
  if (response.status === 404) throw new Error('This structure file was not found.')
  if (!response.ok) throw new Error(UNREACHABLE)
  const body = await response.text()
  if (body.length > MAX_TEXT) throw new Error('This file is too large to read (over 60 MB).')
  return readStructure(body)
}
