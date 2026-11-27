// Where the entries of the notebook are kept. The notebook talks to a `NotebookStore` only, so the
// place can be changed (this browser today; a repository on GitHub or a folder later) without the
// rest of the notebook knowing.

import { DEFAULT_TEMPLATE, readEntry, readTemplate, type Entry, type Template } from './model'

export interface NotebookStore {
  /** Every entry that can be read; one that cannot is left out. */
  list(): Promise<Entry[]>
  /** False when the entry could not be written. */
  save(entry: Entry): Promise<boolean>
  remove(id: string): Promise<void>
  /** The template of this notebook; the one a new notebook starts with when none is kept. */
  template(): Promise<Template>
  saveTemplate(template: Template): Promise<boolean>
}

/** Keys and values as text, as the browser's storage offers them. */
export interface KeyValue {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<boolean>
  del(key: string): Promise<void>
}

const INDEX = 'labbook:index'
const TEMPLATE = 'labbook:template'
const entryKey = (id: string): string => `labbook:entry:${id}`

function parse(text: string | null): unknown {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/** A notebook kept as keys and values: a list of the ids, and every entry under its own key. */
export function keyValueStore(kv: KeyValue): NotebookStore {
  const ids = async (): Promise<string[]> => {
    const raw = parse(await kv.get(INDEX))
    return Array.isArray(raw) ? [...new Set(raw.filter((v): v is string => typeof v === 'string'))] : []
  }
  return {
    async list() {
      const out: Entry[] = []
      for (const id of await ids()) {
        const entry = readEntry(parse(await kv.get(entryKey(id))))
        if (entry && entry.id === id) out.push(entry)
      }
      return out
    },
    async save(entry) {
      // The entry first, then the list: an entry that is not in the list is only unseen, while a
      // list that names an entry which was never written would lose nothing either.
      if (!(await kv.set(entryKey(entry.id), JSON.stringify(entry)))) return false
      const list = await ids()
      return list.includes(entry.id) ? true : kv.set(INDEX, JSON.stringify([...list, entry.id]))
    },
    async remove(id) {
      const list = await ids()
      await kv.set(INDEX, JSON.stringify(list.filter((v) => v !== id)))
      await kv.del(entryKey(id))
    },
    async template() {
      return readTemplate(parse(await kv.get(TEMPLATE))) ?? DEFAULT_TEMPLATE
    },
    saveTemplate: (template) => kv.set(TEMPLATE, JSON.stringify(template)),
  }
}

/** Keys and values kept in memory, for tests and for a window whose storage is closed. */
export function memoryKeyValue(): KeyValue & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    get: async (key) => data.get(key) ?? null,
    set: async (key, value) => {
      data.set(key, value)
      return true
    },
    del: async (key) => {
      data.delete(key)
    },
  }
}
