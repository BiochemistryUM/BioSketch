// Icon packs: extra collections (for example openly licensed sets imported with
// scripts/import-icons.mjs) that live beside the app and are fetched only when opened.

import type { IconDef } from '../model/types'
import { nameFirst, searchTest } from './library'
import { sanitizeBody } from './svg'

export interface PackInfo {
  id: string
  name: string
  /** Licence summary shown in the library, e.g. "CC BY 4.0" or "Mixed, see each icon". */
  licence: string
  source: string
  count: number
  file: string
  /** [id, name, keywords] of every icon, so that a search finds icons in packs not fetched yet. */
  names: [string, string, string][]
}

export interface PackHit {
  pack: PackInfo
  /** Full icon id, as stored in a figure. */
  id: string
  name: string
}

const BASE = './icon-packs/'
const BATCH = 100
const loaded = new Map<string, IconDef[]>()
const byId = new Map<string, IconDef>()

const text = (v: unknown, max = 200): string => (typeof v === 'string' ? v.slice(0, max) : '')
const safeName = (v: unknown): v is string => typeof v === 'string' && /^[\w.-]{1,80}$/.test(v)

/** The packs available on this site. An empty list when there are none or the list cannot be read. */
export async function listPacks(): Promise<PackInfo[]> {
  try {
    const res = await fetch(`${BASE}index.json`)
    if (!res.ok) return []
    const list: unknown = await res.json()
    if (!Array.isArray(list)) return []
    return list.flatMap((raw) => {
      if (!raw || typeof raw !== 'object' || !safeName(raw.id) || !safeName(raw.file)) return []
      const names = (Array.isArray(raw.names) ? raw.names : []).flatMap((n: unknown): [string, string, string][] =>
        Array.isArray(n) && typeof n[0] === 'string' && typeof n[1] === 'string' ? [[n[0], n[1], text(n[2], 400)]] : [],
      )
      return [{ id: raw.id, file: raw.file, name: text(raw.name) || raw.id, licence: text(raw.licence), source: text(raw.source, 500), count: Number(raw.count) || 0, names }]
    })
  } catch {
    return []
  }
}

/** Check and clean the icons of a pack file. Pack icons are third-party artwork, so nothing is trusted. */
export function readPack(data: unknown, pack: Pick<PackInfo, 'id' | 'name'>, seen: Set<string> = new Set()): IconDef[] {
  const icons = data && typeof data === 'object' && Array.isArray((data as { icons?: unknown }).icons) ? (data as { icons: unknown[] }).icons : []
  const out: IconDef[] = []
  for (const raw of icons) {
    if (!raw || typeof raw !== 'object') continue
    const o = raw as Record<string, unknown>
    const vb = Array.isArray(o.viewBox) ? o.viewBox : []
    const id = `${pack.id}--${text(o.id, 80)}`
    // Ids stored in a figure are at most 64 plain characters (see validateDoc), so longer ones are refused here.
    if (!/^[\w-]{3,64}$/.test(id) || seen.has(id) || typeof o.body !== 'string') continue
    if (!(Number(vb[0]) > 0) || !(Number(vb[1]) > 0)) continue
    const body = sanitizeBody(o.body)
    if (!body) continue
    seen.add(id)
    out.push({
      id,
      name: text(o.name) || 'Icon',
      category: pack.name,
      tags: Array.isArray(o.tags) ? o.tags.filter((t): t is string => typeof t === 'string').slice(0, 12).map((t) => t.slice(0, 40)) : [],
      viewBox: [Number(vb[0]), Number(vb[1])],
      body,
      license: text(o.license),
      author: text(o.author),
      source: text(o.source, 500),
    })
  }
  return out
}

/** Fetch a pack (once) and return its icons. */
export async function loadPack(pack: PackInfo): Promise<IconDef[]> {
  const cached = loaded.get(pack.id)
  if (cached) return cached
  const res = await fetch(BASE + pack.file)
  if (!res.ok) throw new Error(`The “${pack.name}” icons could not be loaded.`)
  const data: unknown = await res.json()
  const raw = data && typeof data === 'object' && Array.isArray((data as { icons?: unknown }).icons) ? (data as { icons: unknown[] }).icons : []
  // Cleaning thousands of icons takes a moment; do it in batches and let the page breathe in between.
  const icons: IconDef[] = []
  const seen = new Set<string>()
  for (let i = 0; i < raw.length; i += BATCH) {
    icons.push(...readPack({ icons: raw.slice(i, i + BATCH) }, pack, seen))
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
  loaded.set(pack.id, icons)
  for (const icon of icons) byId.set(icon.id, icon)
  return icons
}

/** The icons of a pack, when it has been fetched in this session. */
export const loadedPack = (id: string): IconDef[] | undefined => loaded.get(id)

/** Icons in any pack whose name or keywords match a search, whether or not the pack was fetched. */
export function searchPackNames(packs: PackInfo[], query: string): PackHit[] {
  const test = searchTest(query)
  if (!test) return []
  const hits: PackHit[] = []
  for (const pack of packs) {
    for (const [id, name, keywords] of pack.names) {
      if (test(`${name} ${pack.name} ${keywords}`)) hits.push({ pack, id: `${pack.id}--${id}`, name })
    }
  }
  return nameFirst(hits, (h) => test(h.name))
}

/** An icon from a pack that has been opened in this session. */
export const findPackIcon = (id: string): IconDef | undefined => byId.get(id)
