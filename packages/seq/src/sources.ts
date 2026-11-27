// Fetching a sequence from the public databases a browser can reach. Three of them answer a web
// page directly (they send the CORS header): NCBI E-utilities (any accession, as GenBank) and the
// NCBI Datasets API (a gene by its symbol). Ensembl answers a web page too (it serves FASTA that
// `readSequences` reads when pasted); a later version can call it here directly. Addgene does NOT
// send that header, so a browser cannot fetch it; a plasmid from Addgene is brought in by downloading its
// GenBank or SnapGene file and dropping it, which `readSequences` reads. Requests carry no cookies
// and no referrer, and are built from values the caller gives, so what the scientist looks up never
// leaks elsewhere. Each is made only when the scientist asks for it.

import { parseGenBank } from './genbank'
import type { SeqRecord } from './model'

const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
const DATASETS = 'https://api.ncbi.nlm.nih.gov/datasets/v2'
const TOOL = 'biosketch'

async function get(url: string, as: 'text' | 'json', ms = 20000): Promise<string | unknown> {
  const stop = new AbortController()
  const timer = setTimeout(() => stop.abort(), ms)
  try {
    const res = await fetch(url, { signal: stop.signal, referrerPolicy: 'no-referrer', credentials: 'omit' })
    if (!res.ok) throw new Error(`${res.status}`)
    return as === 'json' ? await res.json() : await res.text()
  } finally {
    clearTimeout(timer)
  }
}

/** A sequence by its accession (NM_…, NG_…, a plasmid's L-number…), from NCBI as GenBank. */
export async function fetchRecord(accession: string): Promise<SeqRecord | null> {
  const id = accession.trim()
  if (!/^[A-Za-z0-9_.]+$/.test(id)) throw new Error('That does not look like an accession.')
  const text = (await get(`${EUTILS}/efetch.fcgi?db=nuccore&id=${encodeURIComponent(id)}&rettype=gb&retmode=text&tool=${TOOL}`, 'text')) as string
  const record = parseGenBank(text)
  if (record && !record.source?.accession) record.source = { ...record.source, accession: id }
  return record
}

export interface GeneInfo {
  symbol: string
  geneId: string
  description: string
  taxname: string
  synonyms: string[]
  mapLocation?: string
  ensemblIds: string[]
  swissProt: string[]
  /** The RefSeqGene genomic accession (NG_…), the gene with its introns and exons, when there is one. */
  refSeqGene?: string
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

/** A human (or other) gene by its symbol, from NCBI Datasets: what it is, and the accessions to fetch. */
export async function findGene(symbol: string, taxon = 'human'): Promise<GeneInfo | null> {
  const sym = symbol.trim()
  if (!/^[A-Za-z0-9._-]{1,30}$/.test(sym)) throw new Error('That does not look like a gene symbol.')
  const data = (await get(`${DATASETS}/gene/symbol/${encodeURIComponent(sym)}/taxon/${encodeURIComponent(taxon)}`, 'json')) as { reports?: { gene?: Record<string, unknown> }[] }
  const gene = data.reports?.[0]?.gene
  if (!gene) return null
  const refSeqGene = (gene.reference_standards as { type?: string; gene_range?: { accession_version?: string } }[] | undefined)?.find((r) => r.type === 'REFSEQ_GENE')?.gene_range?.accession_version
  const maps = gene.map_locations as { display_label?: string }[] | undefined
  return {
    symbol: str(gene.symbol) || sym,
    geneId: str(gene.gene_id),
    description: str(gene.description),
    taxname: str(gene.taxname),
    synonyms: arr(gene.synonyms),
    mapLocation: maps?.[0]?.display_label,
    ensemblIds: arr(gene.ensembl_gene_ids),
    swissProt: arr(gene.swiss_prot_accessions),
    refSeqGene: refSeqGene || undefined,
  }
}

export interface Transcript {
  accession: string
  title: string
  length: number
}

/** The RefSeq mRNA transcripts of a gene, newest-style first, so the scientist can pick one to fetch. */
export async function geneTranscripts(symbol: string, taxon = 'Homo sapiens'): Promise<Transcript[]> {
  const sym = symbol.trim()
  if (!/^[A-Za-z0-9._-]{1,30}$/.test(sym)) return []
  const term = `${sym}[Gene Name] AND "${taxon}"[Organism] AND srcdb_refseq[Properties] AND biomol_mrna[Properties]`
  const search = (await get(`${EUTILS}/esearch.fcgi?db=nuccore&retmax=25&retmode=json&tool=${TOOL}&term=${encodeURIComponent(term)}`, 'json')) as { esearchresult?: { idlist?: string[] } }
  const ids = search.esearchresult?.idlist ?? []
  if (!ids.length) return []
  const summary = (await get(`${EUTILS}/esummary.fcgi?db=nuccore&retmode=json&tool=${TOOL}&id=${ids.join(',')}`, 'json')) as { result?: Record<string, { accessionversion?: string; title?: string; slen?: number }> }
  const result = summary.result ?? {}
  return ids
    .map((id) => result[id])
    .filter((r): r is { accessionversion?: string; title?: string; slen?: number } => !!r)
    .map((r) => ({ accession: str(r.accessionversion), title: str(r.title), length: typeof r.slen === 'number' ? r.slen : 0 }))
    .filter((t) => t.accession)
}

/** The Addgene page for a plasmid, to send the scientist to download its sequence file. */
export const addgeneUrl = (id: string | number): string => `https://www.addgene.org/${String(id).replace(/[^0-9]/g, '')}/sequences/`

export const ADDGENE_NOTE =
  'Addgene does not let a web page read it directly, so a plasmid is brought in by its file: open the plasmid on Addgene, download the full sequence as GenBank (.gb) or SnapGene (.dna), and drop it here.'
