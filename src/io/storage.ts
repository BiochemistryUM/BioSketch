// Saved figures. Every figure is kept in the browser (IndexedDB, falling back to localStorage in
// private windows), so a reload or a closed tab loses nothing and several figures can be kept.

import { everyNode, slideCount } from '../model/slides'
import type { FigDoc } from '../model/types'
import { parseDoc, serializeDoc } from './files'

export interface FigureMeta {
  id: string
  name: string
  /** Time of the last save, in milliseconds since 1970. */
  updated: number
  /** Number of objects in the figure (on all its slides), shown in the list of figures. */
  objects: number
  /** Number of slides; absent for a figure saved before slides existed, which has one. */
  slides?: number
}

const DB_NAME = 'biosketch'
const STORE = 'kv'
const LS_PREFIX = 'biosketch.'
const INDEX = 'index'
const CURRENT = 'current'
/** Where the single figure of earlier versions was kept. */
const LEGACY = 'current-figure'
const figKey = (id: string): string => `fig:${id}`

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idb<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const req = run(tx.objectStore(STORE))
      tx.oncomplete = () => resolve(req.result)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

async function kvGet(key: string): Promise<string | null> {
  try {
    const value = await idb('readonly', (s) => s.get(key))
    if (typeof value === 'string') return value
  } catch {
    /* fall through to localStorage */
  }
  try {
    return localStorage.getItem(LS_PREFIX + key)
  } catch {
    return null
  }
}

async function kvSet(key: string, value: string): Promise<boolean> {
  try {
    await idb('readwrite', (s) => s.put(value, key))
    return true
  } catch {
    try {
      localStorage.setItem(LS_PREFIX + key, value)
      return true
    } catch {
      return false
    }
  }
}

async function kvDel(key: string): Promise<void> {
  try {
    await idb('readwrite', (s) => s.delete(key))
  } catch {
    /* nothing stored there */
  }
  try {
    localStorage.removeItem(LS_PREFIX + key)
  } catch {
    /* storage unavailable */
  }
}

const newId = (): string => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

export async function listFigures(): Promise<FigureMeta[]> {
  try {
    const list: unknown = JSON.parse((await kvGet(INDEX)) ?? '[]')
    if (!Array.isArray(list)) return []
    return list
      .filter((m): m is FigureMeta => !!m && typeof m.id === 'string' && typeof m.name === 'string' && typeof m.updated === 'number')
      .sort((a, b) => b.updated - a.updated)
  } catch {
    return []
  }
}

/** Save a figure under its id. Returns false when the browser refuses to store it. */
export async function saveFigure(id: string, doc: FigDoc): Promise<boolean> {
  if (!(await kvSet(figKey(id), serializeDoc(doc)))) return false
  const meta: FigureMeta = { id, name: doc.name, updated: Date.now(), objects: everyNode(doc).length, slides: slideCount(doc) }
  const others = (await listFigures()).filter((m) => m.id !== id)
  return kvSet(INDEX, JSON.stringify([meta, ...others]))
}

export async function loadFigure(id: string): Promise<FigDoc | null> {
  const text = await kvGet(figKey(id))
  if (!text) return null
  try {
    return parseDoc(text)
  } catch {
    return null
  }
}

export async function deleteFigure(id: string): Promise<void> {
  await kvDel(figKey(id))
  await kvSet(INDEX, JSON.stringify((await listFigures()).filter((m) => m.id !== id)))
}

export const setCurrentFigure = (id: string): Promise<boolean> => kvSet(CURRENT, id)

/**
 * What to open when the app starts: the figure that was open last time, else the most recent one,
 * else a new empty figure. A figure saved by an earlier version of BioSketch is carried over once.
 */
export async function loadStartup(): Promise<{ id: string; doc: FigDoc | null }> {
  let figures = await listFigures()
  if (!figures.length) {
    let legacy = await kvGet(LEGACY)
    if (!legacy) {
      try {
        legacy = localStorage.getItem(LEGACY)
      } catch {
        legacy = null
      }
    }
    if (legacy) {
      try {
        const id = newId()
        if (await saveFigure(id, parseDoc(legacy))) {
          await kvDel(LEGACY)
          figures = await listFigures()
        }
      } catch {
        /* the old figure is unreadable; start fresh */
      }
    }
  }
  const wanted = await kvGet(CURRENT)
  const pick = figures.find((m) => m.id === wanted) ?? figures[0]
  if (!pick) return { id: newId(), doc: null }
  return { id: pick.id, doc: await loadFigure(pick.id) }
}

export { newId as newFigureId }
