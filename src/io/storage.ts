// Autosave: the current figure is kept in the browser (IndexedDB) so a reload or a closed tab loses nothing.

import type { FigDoc } from '../model/types'
import { serializeDoc, parseDoc } from './files'

const DB_NAME = 'biosketch'
const STORE = 'kv'
const KEY = 'current-figure'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbSet(value: string): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(value, KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

async function idbGet(): Promise<string | null> {
  const db = await openDb()
  try {
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY)
      req.onsuccess = () => resolve(typeof req.result === 'string' ? req.result : null)
      req.onerror = () => reject(req.error)
    })
  } finally {
    db.close()
  }
}

/** Returns false when the figure could not be stored (private window, storage full). */
export async function saveCurrent(doc: FigDoc): Promise<boolean> {
  const text = serializeDoc(doc)
  try {
    await idbSet(text)
    return true
  } catch {
    try {
      localStorage.setItem(KEY, text)
      return true
    } catch {
      return false
    }
  }
}

export async function loadCurrent(): Promise<FigDoc | null> {
  let text: string | null = null
  try {
    text = await idbGet()
  } catch {
    /* fall through to localStorage */
  }
  if (!text) {
    try {
      text = localStorage.getItem(KEY)
    } catch {
      text = null
    }
  }
  if (!text) return null
  try {
    return parseDoc(text)
  } catch {
    return null
  }
}
