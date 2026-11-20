// A protein's domains from UniProt, and a "lollipop" diagram of its mutations built from ordinary
// BioSketch objects (shapes, lines, labels), so every part can be changed afterwards.
// UniProt (CC BY 4.0) lets any web page read its REST service. Only the accession or the words the
// scientist typed are sent, when they press "Look up": no cookies, no address of this page.
// Everything that comes back is untrusted and is rebuilt field by field.

import { measureText } from '../model/nodes'
import type { ConnectorNode, FigNode, ShapeNode, TextNode } from '../model/types'

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>

export type FeatureKind = 'domain' | 'region' | 'repeat' | 'motif' | 'transmembrane' | 'signal' | 'zinc finger' | 'DNA binding'

export interface ProteinFeature {
  kind: FeatureKind
  name: string
  /** First and last residue, counted from 1 and both included. */
  start: number
  end: number
}

export interface Protein {
  accession: string
  name: string
  gene: string
  organism: string
  length: number
  features: ProteinFeature[]
}

export interface ProteinHit {
  accession: string
  name: string
  gene: string
  organism: string
  reviewed: boolean
}

const BASE = 'https://rest.uniprot.org/uniprotkb/'
const ENTRY_FIELDS = 'accession,protein_name,gene_names,organism_name,length,sequence,ft_domain,ft_region,ft_repeat,ft_zn_fing,ft_dna_bind,ft_motif,ft_transmem,ft_signal'
const SEARCH_FIELDS = 'accession,protein_name,gene_primary,organism_name'
const ACCESSION = /^(?:[OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9](?:[A-Z][A-Z0-9]{2}[0-9]){1,2})$/
const MAX_ENTRY = 3_000_000
const MAX_SEARCH = 400_000
const MAX_LENGTH = 100_000
const MAX_FEATURES = 200
const MAX_QUERY = 200

export const isAccession = (text: string): boolean => ACCESSION.test(text.trim().toUpperCase())

/** The address of one entry, or null when the text is not a UniProt accession (P04637, Q9Y6K9, A0A024R161). */
export function uniprotUrl(accession: string): string | null {
  const acc = accession.trim().toUpperCase()
  return ACCESSION.test(acc) ? `${BASE}${acc}.json?fields=${ENTRY_FIELDS}` : null
}

/** The address of a search for up to 25 entries (the best twelve are shown); the text is the only thing in it, encoded. */
export function uniprotSearchUrl(text: string): string {
  const query = encodeURIComponent(text.trim().slice(0, MAX_QUERY))
  return `${BASE}search?query=${query}&fields=${SEARCH_FIELDS}&size=25`
}

/** UniProt is CC BY 4.0: the line to put in a figure's credits. */
export const UNIPROT_CREDIT = 'UniProt (CC BY 4.0)'
export const uniprotCredit = (accession: string): string => `UniProt (CC BY 4.0), entry ${accession.trim().toUpperCase()}`

// ---------------------------------------------------------------- reading answers

const obj = (v: unknown): Record<string, unknown> | undefined => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined)

/** A name from the network: one line, no control characters, cut to `max`. */
function tidy(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  // eslint-disable-next-line no-control-regex
  return v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max).trim()
}

const KINDS: Record<string, FeatureKind> = {
  domain: 'domain',
  region: 'region',
  repeat: 'repeat',
  motif: 'motif',
  transmembrane: 'transmembrane',
  signal: 'signal',
  'zinc finger': 'zinc finger',
  'dna binding': 'DNA binding',
}

const DEFAULT_NAME: Record<FeatureKind, string> = {
  domain: 'Domain',
  region: 'Region',
  repeat: 'Repeat',
  motif: 'Motif',
  transmembrane: 'Transmembrane',
  signal: 'Signal peptide',
  'zinc finger': 'Zinc finger',
  'DNA binding': 'DNA binding',
}

function entryName(entry: Record<string, unknown> | undefined): string {
  const d = obj(entry?.proteinDescription)
  const full = (v: unknown) => tidy(obj(obj(v)?.fullName)?.value, 200)
  const alt = Array.isArray(d?.alternativeNames) ? full(d?.alternativeNames[0]) : ''
  const sub = Array.isArray(d?.submissionNames) ? full(d?.submissionNames[0]) : ''
  return full(d?.recommendedName) || sub || alt
}

const entryGene = (entry: Record<string, unknown> | undefined): string => {
  const g = Array.isArray(entry?.genes) ? obj(obj(entry?.genes[0])?.geneName) : undefined
  return tidy(g?.value, 40)
}

/** Read an entry's JSON, every field checked. Throws when it holds no protein. */
export function readUniprot(data: unknown): Protein {
  const d = obj(data)
  const accession = typeof d?.primaryAccession === 'string' ? d.primaryAccession.toUpperCase() : ''
  const length = Number(obj(d?.sequence)?.length)
  if (!ACCESSION.test(accession) || !Number.isInteger(length) || length < 1 || length > MAX_LENGTH) throw new Error('UniProt’s answer could not be read.')
  const features: ProteinFeature[] = []
  const seen = new Set<string>()
  for (const raw of Array.isArray(d?.features) ? d.features : []) {
    const f = obj(raw)
    const kind = typeof f?.type === 'string' ? KINDS[f.type.toLowerCase()] : undefined
    const loc = obj(f?.location)
    const start = Number(obj(loc?.start)?.value)
    const end = Number(obj(loc?.end)?.value)
    if (!kind || !Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end > length || start > end) continue
    let name = tidy(f?.description, 60)
    if (kind === 'transmembrane' || kind === 'signal') name = DEFAULT_NAME[kind]
    // "Disordered" stretches are a prediction of no structure, not a domain: they would only clutter a diagram.
    if (kind === 'region' && /^disordered\b/i.test(name)) continue
    name ||= DEFAULT_NAME[kind]
    const key = `${kind}|${name}|${start}|${end}`
    if (seen.has(key)) continue
    seen.add(key)
    features.push({ kind, name, start, end })
    if (features.length >= MAX_FEATURES) break
  }
  return { accession, name: entryName(d) || accession, gene: entryGene(d), organism: tidy(obj(d?.organism)?.scientificName, 80), length, features }
}

/** Read a search answer: up to ten entries, reviewed (Swiss-Prot) ones first, otherwise in UniProt's order. */
/** Organisms a biochemist most often means, best first; the others follow. */
const USUAL_ORGANISMS = ['Homo sapiens', 'Mus musculus', 'Rattus norvegicus', 'Saccharomyces cerevisiae', 'Escherichia coli', 'Danio rerio', 'Drosophila melanogaster', 'Caenorhabditis elegans', 'Arabidopsis thaliana']
const organismRank = (organism: string): number => {
  const i = USUAL_ORGANISMS.findIndex((o) => organism.startsWith(o))
  return i < 0 ? USUAL_ORGANISMS.length : i
}

/**
 * Read a search reply, best first: an entry whose gene is the word searched for, then human and
 * the usual model organisms, then reviewed entries (Swiss-Prot); otherwise UniProt's order.
 */
export function readUniprotSearch(data: unknown, query = ''): ProteinHit[] {
  const results = obj(data)?.results
  const hits: ProteinHit[] = []
  for (const raw of Array.isArray(results) ? results : []) {
    const e = obj(raw)
    const accession = typeof e?.primaryAccession === 'string' ? e.primaryAccession.toUpperCase() : ''
    if (!ACCESSION.test(accession)) continue
    hits.push({
      accession,
      name: entryName(e) || accession,
      gene: entryGene(e),
      organism: tidy(obj(e?.organism)?.scientificName, 80),
      reviewed: typeof e?.entryType === 'string' && /reviewed/i.test(e.entryType) && !/unreviewed/i.test(e.entryType),
    })
    if (hits.length >= 25) break
  }
  const word = query.trim().toUpperCase()
  const gene = (h: ProteinHit) => (word && h.gene.toUpperCase() === word ? 0 : 1)
  return hits
    .map((h, i) => ({ h, i }))
    .sort((a, b) => gene(a.h) - gene(b.h) || organismRank(a.h.organism) - organismRank(b.h.organism) || Number(b.h.reviewed) - Number(a.h.reviewed) || a.i - b.i)
    .slice(0, 12)
    .map((x) => x.h)
}

async function getJson(url: string, limit: number, fetcher: Fetcher): Promise<unknown> {
  let response: Response
  try {
    response = await fetcher(url, { credentials: 'omit', referrerPolicy: 'no-referrer' })
  } catch {
    throw new Error('UniProt could not be reached. Check the connection, or try again in a moment.')
  }
  if (response.status === 404) throw new Error('UniProt has no entry with this accession.')
  if (!response.ok) throw new Error('UniProt could not be reached. Try again in a moment.')
  const body = await response.text()
  if (body.length > limit) throw new Error('UniProt’s answer is too large to read.')
  try {
    return JSON.parse(body)
  } catch {
    throw new Error('UniProt’s answer could not be read.')
  }
}

/** Look an entry up by accession (P04637). */
export async function lookupUniprot(accession: string, fetcher: Fetcher = (u, i) => fetch(u, i)): Promise<Protein> {
  const url = uniprotUrl(accession)
  if (!url) throw new Error('This is not a UniProt accession. An accession looks like P04637 or Q9Y6K9.')
  return readUniprot(await getJson(url, MAX_ENTRY, fetcher))
}

/** Search entries by name, gene or words ("insulin receptor", "TP53 human"). */
export async function searchUniprot(text: string, fetcher: Fetcher = (u, i) => fetch(u, i)): Promise<ProteinHit[]> {
  const clean = text.trim()
  if (!clean) throw new Error('Type a protein or gene name to search for.')
  if (clean.length > MAX_QUERY) throw new Error('This text is too long to search for.')
  const hits = readUniprotSearch(await getJson(uniprotSearchUrl(clean), MAX_SEARCH, fetcher), clean)
  if (!hits.length) throw new Error(`UniProt has nothing for “${clean}”. Try another name, or the gene symbol.`)
  return hits
}

// ---------------------------------------------------------------- mutations

export interface Mutation {
  /** The change in one-letter notation: R175H, R213*, P152fs. */
  label: string
  position: number
  count: number
  /** Stop and frameshift changes cut the protein short; the others change one residue. */
  kind: 'missense' | 'truncating'
}

const THREE: Record<string, string> = {
  ala: 'A', arg: 'R', asn: 'N', asp: 'D', cys: 'C', gln: 'Q', glu: 'E', gly: 'G', his: 'H', ile: 'I',
  leu: 'L', lys: 'K', met: 'M', phe: 'F', pro: 'P', ser: 'S', thr: 'T', trp: 'W', tyr: 'Y', val: 'V',
}
const ONE = 'ACDEFGHIKLMNPQRSTVWY'
const MAX_MUTATIONS = 200
const MAX_COUNT = 10_000_000

const VARIANT = /^(?:p\.)?(?:([A-Z]|[A-Za-z]{3})(\d{1,6}))(\*|X|Ter|fs(?:[*X]\d*)?|[A-Z]|[A-Za-z]{3}(?:fs(?:[*X]\d*)?)?|=)(?:[x×](\d{1,8}))?$/

function oneLetter(code: string): string | null {
  if (code.length === 1) return ONE.includes(code) ? code : null
  return THREE[code.toLowerCase()] ?? null
}

/** Read one token as a protein change, or null. */
function readVariant(token: string): { label: string; position: number; kind: Mutation['kind']; count?: number } | null {
  const m = VARIANT.exec(token)
  if (!m) return null
  const from = oneLetter(m[1])
  if (!from) return null
  const position = Number(m[2])
  const to = m[3]
  let end: string
  let kind: Mutation['kind'] = 'missense'
  if (to === '*' || to === 'X' || /^ter$/i.test(to)) {
    end = '*'
    kind = 'truncating'
  } else if (/fs/i.test(to)) {
    end = 'fs'
    kind = 'truncating'
  } else if (to === '=') {
    end = '='
  } else {
    const aa = oneLetter(to)
    if (!aa) return null
    end = aa
  }
  return { label: `${from}${position}${end}`, position, kind, ...(m[4] ? { count: Number(m[4]) } : {}) }
}

const COUNT = /^(?:[x×]\s*(\d{1,8})|[([]\s*(\d{1,8})\s*[)\]]|n=(\d{1,8})|(\d{1,8}))$/i

/**
 * Read mutations the way a scientist types or pastes them: "R175H, R248Q x12, R273H (8), G245S",
 * one per line, or with the count after a tab ("R175H<tab>35", as a table of mutations is copied).
 * One-letter (R175H) and three-letter (Arg175His) notation, stops (R213*, R213X, Arg213Ter) and
 * frameshifts (P152fs). A change named twice has its counts added. What is not a change in a
 * protein of this length is returned in `unread`, word for word, never guessed.
 */
export function parseMutations(text: string, length: number): { mutations: Mutation[]; unread: string[] } {
  const found = new Map<string, Mutation>()
  const unread: string[] = []
  const prepared = text
    .replace(/\(\s*(\d+)\s*\)/g, ' ($1) ')
    .replace(/\[\s*(\d+)\s*\]/g, ' [$1] ')
    .replace(/n\s*=\s*(\d+)/gi, ' n=$1 ')
    .replace(/(^|[\s,;])([x×])\s+(\d+)/g, '$1 $2$3 ')
  let last: { mutation: Mutation | null; counted: boolean; added: number } | null = null
  const refuse = (token: string) => {
    if (!unread.includes(token)) unread.push(token)
  }
  for (const token of prepared.split(/[\s,;]+/).filter(Boolean)) {
    const variant = readVariant(token)
    if (variant) {
      if (variant.position < 1 || variant.position > length || (variant.count !== undefined && (variant.count < 1 || variant.count > MAX_COUNT))) {
        refuse(token)
        last = { mutation: null, counted: true, added: 0 }
        continue
      }
      const count = variant.count ?? 1
      const known = found.get(variant.label)
      if (known) known.count = Math.min(MAX_COUNT, known.count + count)
      else if (found.size >= MAX_MUTATIONS) {
        refuse(token)
        last = { mutation: null, counted: true, added: 0 }
        continue
      } else found.set(variant.label, { label: variant.label, position: variant.position, count, kind: variant.kind })
      last = { mutation: found.get(variant.label)!, counted: variant.count !== undefined, added: count }
      continue
    }
    const c = COUNT.exec(token)
    if (c && last && !last.counted) {
      const n = Number(c[1] ?? c[2] ?? c[3] ?? c[4])
      last.counted = true
      if (last.mutation) {
        if (n < 1 || n > MAX_COUNT) refuse(token)
        else last.mutation.count = Math.min(MAX_COUNT, last.mutation.count - last.added + n)
      }
      continue
    }
    refuse(token)
  }
  return { mutations: [...found.values()].sort((a, b) => a.position - b.position || a.label.localeCompare(b.label)), unread }
}

// ---------------------------------------------------------------- the diagram

/** Functional notes on a region ("Interaction with X", "Required for Y") and compositional bias: not what a domain diagram shows. */
const ANNOTATION = /^(interaction|interacts|required|necessary|involved|sufficient|important|binding to|binds|mediates|essential|responsible|critical|crucial|basic and acidic|basic residues|acidic residues|polar residues|pro residues|gly residues|ser residues|low complexity|compositional|disordered|sufficient)\b|\b(interaction with|required for|necessary for|involved in|sufficient for)\b/i

/** True for what a domain diagram shows: domains, DNA binding, zinc fingers, repeats, transmembrane, signal and motifs, and regions whose name is not a functional annotation. */
export function isStructuralFeature(f: Pick<ProteinFeature, 'kind' | 'name'>): boolean {
  return f.kind !== 'region' || !ANNOTATION.test(f.name)
}

export interface DiagramOptions {
  /** Draw every feature, also the functional notes on regions. Default: only the structural ones (if none are, all). */
  allFeatures?: boolean
  /** Width of the backbone in figure units. Default 800. */
  width?: number
  /** Colours for the domains, taken in turn by name. */
  colours?: string[]
}

export const DOMAIN_COLOURS = ['#9ecae1', '#a1d99b', '#fdd0a2', '#bcbddc', '#f4b6c2', '#fee391', '#8dd3c7', '#d9b99b', '#c7e9c0', '#b8c4e0']

const INK = '#1f2430'
const GREY = '#8d99ae'
const GROUP = 'dom-group'
const BACKBONE_H = 8
const FEATURE_H = 22
const SMALL_H = 14
const TOP = FEATURE_H / 2 + 1
const FONT = 11
const GAP = 4
const NUMBER_ROOM = 12

/** Text for a label: a star or a bracket in a name must not be taken for a mark of the label. */
const plain = (s: string): string => s.replace(/[{}]/g, '').replace(/\*/g, '\\*')

interface Item {
  f: ProteinFeature
  x0: number
  x1: number
  h: number
  outside: boolean
  row: number
  label: string
}

/**
 * The protein as a row of ordinary objects, starting at (0, 0): a backbone for residues 1 to the
 * end, its domains and regions over it (stacked in rows where they overlap, named inside or under
 * them), and one lollipop for every mutation, whose height grows with its count (on a logarithmic
 * scale) and whose name is kept clear of the others. All objects share one group.
 */
export function domainDiagram(protein: Protein, mutations: Mutation[], opts: DiagramOptions = {}): { nodes: FigNode[] } {
  const W = Math.max(200, Math.min(4000, opts.width ?? 800))
  const palette = opts.colours?.length ? opts.colours : DOMAIN_COLOURS
  const L = protein.length
  const xOf = (res: number): number => (res / L) * W
  let counter = 0
  const id = (): string => `dom-${++counter}`

  const text = (x: number, y: number, s: string, align: TextNode['align'], extra: Partial<TextNode> = {}): TextNode => ({
    id: id(), type: 'text', x, y, text: s, fontSize: FONT, fill: INK, align, rotation: 0, groupId: GROUP, ...extra,
  })
  const size = (s: string, extra: Partial<TextNode> = {}) => measureText(text(0, 0, s, 'center', extra))

  // ---- features: colours by name, rows by overlap (y measured from the backbone's middle, B = 0)
  const colourOf = new Map<string, string>()
  const fixed: Partial<Record<FeatureKind, string>> = { transmembrane: '#b7bcc7', signal: '#f6bd60' }
  const fillFor = (f: ProteinFeature): string => {
    const f0 = fixed[f.kind]
    if (f0) return f0
    const key = f.name.toLowerCase()
    if (!colourOf.has(key)) colourOf.set(key, palette[colourOf.size % palette.length])
    return colourOf.get(key)!
  }
  const structural = protein.features.filter(isStructuralFeature)
  const shown = opts.allFeatures || !structural.length ? protein.features : structural
  const items: Item[] = [...shown]
    .sort((a, b) => a.start - b.start || b.end - a.end)
    .map((f) => {
      const x0 = xOf(f.start - 1)
      const x1 = Math.max(xOf(f.end), x0 + 3)
      const small = f.kind === 'motif' || f.kind === 'transmembrane' || f.kind === 'signal'
      const label = plain(f.name)
      const fits = size(label).w * 1.08 <= x1 - x0 - 12
      return {
        f, x0, x1, h: small ? SMALL_H : FEATURE_H, outside: !fits,
        row: 0, label,
      }
    })
  const startW = size('1').w
  const endW = size(String(L)).w
  const rows: [number, number][][] = []
  const free = (list: [number, number][], a: number, b: number): boolean => list.every(([p, q]) => b + GAP <= p || a >= q + GAP)
  for (const it of items) {
    let r = 0
    for (; ; r++) {
      rows[r] ??= []
      if (free(rows[r], it.x0, it.x1)) break
    }
    rows[r].push([it.x0, it.x1])
    it.row = r
  }
  const PITCH = FEATURE_H + 6
  // Under the backbone's ends stand its first and last numbers: the rows below start a little lower.
  const rowY = (r: number): number => (r === 0 ? 0 : r * PITCH + NUMBER_ROOM)
  const lastRow = Math.max(0, rows.length - 1)
  const stackBottom = rowY(lastRow) + FEATURE_H / 2

  // Names that do not fit inside their shape stand in lanes under the whole stack. A thin line runs
  // straight down from the shape to its name, so a name always covers the place its line comes
  // from (with 4 to spare on each side). A name may take a lane only if it overlaps no name there,
  // its line passes through no name of a lane above, and no line of a name already put in a lane
  // below passes through it. The names are placed one by one in the order of the place their lines
  // leave from, each in the first lane that works and as near the middle of its shape as it can;
  // when that leads to a dead end, the earlier choices are changed (a small search). If no clean
  // arrangement exists, the first order's result with the fewest crossings is drawn.
  const laneTop = stackBottom + 8
  const laneH = size('Xy').h + 2
  const LANE_GAP = 8
  const MAX_LANES = 6
  interface Placed { x: number; w: number; ax: number; lane: number }
  const numbers: [number, number][] = [[0, startW], [W - endW, W]]
  const anchorOf = (it: Item): number => Math.max(it.x0, Math.min(it.x1, (it.x0 + it.x1) / 2))
  const overlaps = (placed: Placed[], lane: number, x: number, w: number): boolean =>
    placed.some((q) => q.lane === lane && !(x + w + LANE_GAP <= q.x || x >= q.x + q.w + LANE_GAP)) || (lane === 0 && numbers.some(([p, q]) => !(x + w + GAP <= p || x >= q + GAP)))
  const crossings = (placed: Placed[], c: Placed): number =>
    placed.filter((q) => (q.lane < c.lane && c.ax >= q.x - 3 && c.ax <= q.x + q.w + 3) || (q.lane > c.lane && q.ax >= c.x - 3 && q.ax <= c.x + c.w + 3)).length
  /** Every way to put one name, best first: lane by lane, the anchor nearest the middle first, the name nearest the centre first. */
  const options = (it: Item, placed: Placed[]): { c: Placed; n: number }[] => {
    const w = size(it.label).w
    const mid0 = anchorOf(it)
    const inner0 = it.x0 + 3
    const inner1 = it.x1 - 3
    const anchors = [mid0]
    for (let d = 6; inner0 <= inner1 && (mid0 - d >= inner0 - 6 || mid0 + d <= inner1 + 6); d += 6) {
      if (mid0 - d >= inner0) anchors.push(mid0 - d)
      else if (mid0 - d > inner0 - 6) anchors.push(inner0)
      if (mid0 + d <= inner1) anchors.push(mid0 + d)
      else if (mid0 + d < inner1 + 6) anchors.push(inner1)
    }
    const out: { c: Placed; n: number }[] = []
    for (let lane = 0; lane < MAX_LANES; lane++) {
      for (const ax of anchors) {
        const lo = Math.max(0, ax + 4 - w)
        const hi = Math.min(W - w, ax - 4)
        const centred = Math.max(0, Math.min(W - w, ax - w / 2))
        const xs = [centred]
        if (lo <= hi) {
          xs[0] = Math.max(lo, Math.min(hi, centred))
          for (let d = 12; xs[0] - d >= lo - 0.001 || xs[0] + d <= hi + 0.001; d += 12) {
            if (xs[0] - d < lo - 0.001 && xs[0] - d + 12 > lo) xs.push(lo)
            if (xs[0] + d > hi + 0.001 && xs[0] + d - 12 < hi) xs.push(hi)
            if (xs[0] - d >= lo - 0.001) xs.push(xs[0] - d)
            if (xs[0] + d <= hi + 0.001) xs.push(xs[0] + d)
          }
        }
        for (const x of xs) {
          const c: Placed = { x, w, ax, lane }
          if (!overlaps(placed, lane, x, w)) out.push({ c, n: crossings(placed, c) })
        }
      }
    }
    return out
  }
  const outsiders = items.filter((i) => i.outside).sort((a, b) => anchorOf(a) - anchorOf(b) || a.x0 - b.x0)
  const spots = new Map<Item, Placed>()
  // Names whose reach (the anchors they can have, a name's width either side) cannot meet are
  // arranged apart from each other, each group by a small search.
  const reach = (it: Item): [number, number] => [Math.min(anchorOf(it), it.x0 + 3) - size(it.label).w, Math.max(anchorOf(it), it.x1 - 3) + size(it.label).w]
  const groupsOf: Item[][] = []
  let groupEnd = -Infinity
  for (const it of outsiders) {
    const [lo, hi] = reach(it)
    if (!groupsOf.length || lo > groupEnd) groupsOf.push([it])
    else groupsOf[groupsOf.length - 1].push(it)
    groupEnd = Math.max(groupEnd, hi)
  }
  for (const group of groupsOf) {
    // Short names are searched first: they stand nearest the shapes, and the long ones then go below.
    const order = [...group].sort((a, b) => size(a.label).w - size(b.label).w || anchorOf(a) - anchorOf(b))
    let budget = 20000
    const chosen: Placed[] = []
    const search = (i: number): boolean => {
      if (i === order.length) return true
      if (--budget < 0) return false
      const clean = options(order[i], chosen).filter((x) => x.n === 0)
      // For each lane and anchor: the most central place, and the two extremes of what is possible.
      const byKey = new Map<string, typeof clean>()
      for (const x of clean) {
        const key = `${x.c.lane}/${x.c.ax}`
        byKey.set(key, [...(byKey.get(key) ?? []), x])
      }
      const tried = [...byKey.values()].flatMap((g) => {
        const xs = g.map((o) => o.c.x)
        const pick = new Set([g[0], g.find((o) => o.c.x === Math.min(...xs)), g.find((o) => o.c.x === Math.max(...xs))])
        return [...pick].filter((o): o is (typeof g)[number] => !!o)
      })
      for (const o of tried) {
        chosen.push(o.c)
        if (search(i + 1)) return true
        chosen.pop()
      }
      return false
    }
    if (search(0)) order.forEach((it, i) => spots.set(it, chosen[i]))
    else {
      // No clean arrangement: one by one, the place with the fewest crossings (the nearest lane first).
      const placed: Placed[] = []
      for (const it of group) {
        const opts = options(it, placed)
        let pick = opts[0]
        for (const o of opts) if (o.n < pick.n) pick = o
        const c = pick?.c ?? { x: 0, w: size(it.label).w, ax: anchorOf(it), lane: MAX_LANES }
        placed.push(c)
        spots.set(it, c)
      }
    }
  }
  const spotOf = spots

  const nodes: FigNode[] = []
  const backbone: ShapeNode = {
    id: id(), type: 'shape', shape: 'roundrect', x: 0, y: -BACKBONE_H / 2, w: W, h: BACKBONE_H, rotation: 0,
    fill: '#cfd4dc', stroke: GREY, strokeWidth: 1, groupId: GROUP, name: 'Protein',
  }
  nodes.push(backbone)
  const leaders: ConnectorNode[] = []
  for (const it of items) {
    const cy = rowY(it.row)
    const shape: ShapeNode = {
      id: id(), type: 'shape', shape: 'roundrect', x: it.x0, y: cy - it.h / 2, w: it.x1 - it.x0, h: it.h, rotation: 0,
      fill: fillFor(it.f), stroke: '#4a5568', strokeWidth: 1, groupId: GROUP, name: it.f.name,
      ...(it.f.kind === 'motif' ? { dashed: true } : {}),
      ...(it.outside ? {} : { label: { text: it.label, fontSize: FONT, fill: INK } }),
    }
    nodes.push(shape)
    const spot = spotOf.get(it)
    if (spot) {
      const ly = laneTop + spot.lane * laneH
      nodes.push(text(spot.x, ly, it.label, 'left'))
      const direct = it.row === lastRow && spot.lane === 0
      if (!direct) leaders.push({ id: id(), type: 'connector', from: { x: spot.ax, y: cy + it.h / 2 }, to: { x: spot.ax, y: ly }, kind: 'line', stroke: '#9aa3b2', strokeWidth: 0.75, groupId: GROUP })
    }
  }
  nodes.push(...leaders, text(0, TOP + 1, '1', 'left'), text(W, TOP + 1, String(L), 'right'))

  // ---- lollipops
  const sorted = [...mutations].filter((m) => m.position >= 1 && m.position <= L && m.count >= 1).sort((a, b) => a.position - b.position || a.label.localeCompare(b.label))
  const cmax = Math.max(30, ...sorted.map((m) => m.count))
  const baseY = -TOP
  interface Pop { m: Mutation; x: number; cy: number; d: number }
  const pops: Pop[] = []
  for (const m of sorted) {
    const d = 9 + 2.5 * Math.log2(1 + m.count) * (cmax < 64 ? 1 : 0.8)
    const cy = baseY - (20 + (90 * Math.log(1 + m.count)) / Math.log(1 + cmax))
    let x = xOf(m.position - 0.5)
    for (let i = 0; i < 60 && pops.some((p) => Math.hypot(p.x - x, p.cy - cy) < (p.d + d) / 2 + 1); i++) x += 2
    pops.push({ m, x, cy, d })
  }
  type R = [number, number, number, number] // left, top, right, bottom
  const hit = (a: R, b: R): boolean => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]
  const circleRect = (p: Pop): R => [p.x - p.d / 2, p.cy - p.d / 2, p.x + p.d / 2, p.cy + p.d / 2]
  for (const p of pops) {
    const stem: ConnectorNode = {
      id: id(), type: 'connector', from: { x: p.x, y: baseY }, to: { x: p.x, y: p.cy }, kind: 'line', stroke: '#6b7280', strokeWidth: 1.25, groupId: GROUP,
    }
    nodes.push(stem)
  }
  for (const p of pops) {
    const circle: ShapeNode = {
      id: id(), type: 'shape', shape: 'ellipse', x: p.x - p.d / 2, y: p.cy - p.d / 2, w: p.d, h: p.d, rotation: 0,
      fill: p.m.kind === 'truncating' ? '#2b2f36' : '#d1495b', stroke: '#ffffff', strokeWidth: 1, groupId: GROUP, name: p.m.label,
    }
    nodes.push(circle)
  }
  // Labels, the biggest lollipops first so their names stand where they belong. A name may cross
  // the thin stem of another lollipop, but not another name or circle: it tries its place above its
  // own circle, then shifted sideways (up to one and a half name widths), and only then goes up a
  // step. A name that is not straight above its circle has a thin line down to it.
  const placed: R[] = []
  const order = [...pops].sort((a, b) => b.m.count - a.m.count || a.m.position - b.m.position)
  const labelNodes = new Map<Pop, { t: TextNode; leader?: ConnectorNode }>()
  const SHIFTS = [0, -0.5, 0.5, -1, 1, -1.5, 1.5]
  const MAX_STEP = 4
  for (const p of order) {
    const label = plain(p.m.label)
    const { w: lw, h: lh } = size(label)
    const top = p.cy - p.d / 2
    const circles = pops.filter((q) => q !== p).map(circleRect)
    let chosen: { lx: number; bottom: number; k: number } | null = null
    for (let k = 0; k <= MAX_STEP && !chosen; k++) {
      const bottom = top - 2 - k * (lh + 2)
      for (const sh of SHIFTS) {
        const lx = Math.max(0, Math.min(W - lw, p.x - lw / 2 + sh * lw))
        const box: R = [lx - 1, bottom - lh, lx + lw + 1, bottom]
        if (!circles.some((c) => hit(box, c)) && !placed.some((b) => hit(box, b))) {
          chosen = { lx, bottom, k }
          break
        }
      }
    }
    const { lx, bottom, k } = chosen ?? { lx: Math.max(0, Math.min(W - lw, p.x - lw / 2)), bottom: top - 2 - MAX_STEP * (lh + 2), k: MAX_STEP }
    placed.push([lx - 1, bottom - lh, lx + lw + 1, bottom])
    const straight = k === 0 && Math.abs(lx + lw / 2 - p.x) < 1
    const t = text(lx, bottom - lh, label, 'left')
    const tx = Math.max(lx, Math.min(lx + lw, p.x))
    labelNodes.set(p, {
      t,
      ...(straight ? {} : { leader: { id: id(), type: 'connector', from: { x: p.x, y: top }, to: { x: tx, y: bottom }, kind: 'line', stroke: '#9aa3b2', strokeWidth: 0.75, groupId: GROUP } as ConnectorNode }),
    })
  }
  for (const p of pops) {
    const l = labelNodes.get(p)
    if (!l) continue
    if (l.leader) nodes.push(l.leader)
    nodes.push(l.t)
  }

  // ---- the name above everything, then the whole figure moved so it starts at (0, 0)
  const topOf = (n: FigNode): number => (n.type === 'connector' ? Math.min(n.from.y, n.to.y) : n.type === 'shape' || n.type === 'text' ? n.y : 0)
  const title = `${plain(protein.name)}${protein.gene ? ` (*${plain(protein.gene)}*)` : ''}`
  const top = Math.min(0, ...nodes.map(topOf))
  const t = text(0, 0, title, 'left', { fontSize: 16, bold: true, width: W })
  const tH = measureText(t).h
  const dy = -(top - tH - 8)
  const shift = (n: FigNode): FigNode =>
    n.type === 'connector' ? { ...n, from: { ...n.from, y: n.from.y + dy }, to: { ...n.to, y: n.to.y + dy } } : n.type === 'shape' || n.type === 'text' ? { ...n, y: n.y + dy } : n
  return { nodes: [{ ...t, y: 0 }, ...nodes.map(shift)] }
}
