// Finding a pathway on WikiPathways and fetching its file.
//
// WikiPathways (wikipathways.org) publishes its pathways in the public domain (CC0) as static
// files that any web page may read: one list of every pathway with its genes and metabolites, and
// one GPML file per pathway. BioSketch fetches the list once, searches it in the browser (the
// words typed are not sent anywhere), and fetches the file of the pathway that is chosen. Both
// answers are untrusted: the list is rebuilt field by field, and the file goes through `readGpml`.

import { MAX_PATHWAY_FILE } from './gpml'

export const WIKIPATHWAYS_LIST = 'https://www.wikipathways.org/json/findPathwaysByText.json'
/** The largest list that is read (it is about 2.5 MB). */
const MAX_LIST = 30 * 1024 * 1024
const MAX_PATHWAYS = 20000

export interface PathwayInfo {
  /** WikiPathways identifier, "WP554". */
  id: string
  name: string
  species: string
  description: string
  /** Names of the genes, proteins and metabolites on the pathway. */
  molecules: string[]
  /** Terms the pathway is filed under (cell type, disease, pathway class). */
  terms: string
  /** Date of the last change, as WikiPathways writes it. */
  revision: string
}

const isId = (v: unknown): v is string => typeof v === 'string' && /^WP\d{1,7}$/.test(v)
const text = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '')

/** The web address of a pathway's file and of its page, built from a checked identifier only. */
export const gpmlUrl = (id: string): string => `https://www.wikipathways.org/wikipathways-assets/pathways/${id}/${id}.gpml`
export const pathwayPage = (id: string): string => `https://www.wikipathways.org/instance/${id}`

/** The list of pathways from the answer of WikiPathways, rebuilt field by field. Throws when the answer is not that list. */
export function readPathwayList(data: unknown): PathwayInfo[] {
  const rows = data && typeof data === 'object' ? (data as Record<string, unknown>).pathwayInfo : null
  if (!Array.isArray(rows)) throw new Error('The list of pathways from WikiPathways could not be read.')
  const seen = new Set<string>()
  const list: PathwayInfo[] = []
  for (const raw of rows.slice(0, MAX_PATHWAYS)) {
    if (!raw || typeof raw !== 'object') continue
    const o = raw as Record<string, unknown>
    if (!isId(o.id) || seen.has(o.id)) continue
    const name = text(o.name, 200)
    if (!name) continue
    seen.add(o.id)
    list.push({
      id: o.id,
      name,
      species: text(o.species, 80),
      description: text(o.description, 400),
      molecules: text(o.datanodes, 20000)
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean)
        .slice(0, 2000),
      terms: text(o.annotations, 1000),
      revision: text(o.revision, 20),
    })
  }
  if (!list.length) throw new Error('The list of pathways from WikiPathways could not be read.')
  return list
}

/** Species in the list, the one with most pathways first. */
export function speciesOf(list: PathwayInfo[]): string[] {
  const counts = new Map<string, number>()
  for (const p of list) if (p.species) counts.set(p.species, (counts.get(p.species) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([s]) => s)
}

const lower = (s: string): string => s.toLowerCase()

/**
 * Pathways that match every word of `query`, best first. A word can match the identifier, the
 * name, a gene or metabolite on the pathway (the whole name, so "AKT1" does not find "AKT1S1"),
 * a term or the description; the name counts most. Without words: every pathway by name.
 */
export function searchPathways(list: PathwayInfo[], query: string, species = ''): PathwayInfo[] {
  const pool = species ? list.filter((p) => p.species === species) : list
  const wordsOf = lower(query)
    .split(/[\s,;]+/)
    .filter(Boolean)
    .slice(0, 12)
  const human = (p: PathwayInfo): number => (p.species === 'Homo sapiens' ? 0 : 1)
  if (!wordsOf.length) return [...pool].sort((a, b) => human(a) - human(b) || a.name.localeCompare(b.name))
  const scored: { p: PathwayInfo; score: number }[] = []
  for (const p of pool) {
    const name = lower(p.name)
    const nameWords = name.split(/[^a-z0-9]+/)
    const molecules = p.molecules.map(lower)
    const terms = lower(p.terms)
    const description = lower(p.description)
    let score = 0
    for (const w of wordsOf) {
      let best = 0
      if (lower(p.id) === w) best = 20
      if (nameWords.includes(w)) best = Math.max(best, 10)
      else if (nameWords.some((n) => n.startsWith(w))) best = Math.max(best, 8)
      else if (name.includes(w)) best = Math.max(best, 6)
      if (molecules.includes(w)) best = Math.max(best, 7)
      if (terms.includes(w)) best = Math.max(best, 3)
      if (description.includes(w)) best = Math.max(best, 1)
      if (!best) {
        score = 0
        break
      }
      score += best
    }
    if (score) scored.push({ p, score })
  }
  return scored.sort((a, b) => b.score - a.score || human(a.p) - human(b.p) || a.p.name.localeCompare(b.p.name)).map((s) => s.p)
}

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>

const UNREACHABLE = 'WikiPathways could not be reached. Check the connection, or download the pathway as a GPML file from wikipathways.org and open it here.'

async function get(url: string, fetcher: Fetcher, max: number): Promise<string> {
  let response: Response
  try {
    // Nothing about the scientist or the figure goes along: no cookies, no address of this page.
    response = await fetcher(url, { credentials: 'omit', referrerPolicy: 'no-referrer' })
  } catch {
    throw new Error(UNREACHABLE)
  }
  if (response.status === 404) throw new Error('WikiPathways has no file for this pathway.')
  if (!response.ok) throw new Error(UNREACHABLE)
  const size = Number(response.headers.get('content-length'))
  if (Number.isFinite(size) && size > max) throw new Error('The answer from WikiPathways is too large to read.')
  const body = await response.text()
  if (body.length > max) throw new Error('The answer from WikiPathways is too large to read.')
  return body
}

let listRequest: Promise<PathwayInfo[]> | null = null

/** The list of every pathway, fetched once and kept while the page is open. A failed request can be tried again. */
export function loadPathwayList(fetcher: Fetcher = fetch): Promise<PathwayInfo[]> {
  listRequest ??= get(WIKIPATHWAYS_LIST, fetcher, MAX_LIST)
    .then((body) => {
      let data: unknown
      try {
        data = JSON.parse(body)
      } catch {
        throw new Error('The list of pathways from WikiPathways could not be read.')
      }
      return readPathwayList(data)
    })
    .catch((e) => {
      listRequest = null
      throw e
    })
  return listRequest
}

/** Forget the fetched list (for tests). */
export const forgetPathwayList = (): void => {
  listRequest = null
}

/** The text of a pathway's GPML file. */
export async function fetchGpml(id: string, fetcher: Fetcher = fetch): Promise<string> {
  if (!isId(id)) throw new Error('This is not a WikiPathways identifier.')
  return get(gpmlUrl(id), fetcher, MAX_PATHWAY_FILE)
}
