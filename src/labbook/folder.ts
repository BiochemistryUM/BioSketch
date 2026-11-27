// Keeping the notebook in a folder on the scientist's own computer, through the File System Access
// API. Every entry is a Markdown file under `entries/<year>/`, the same file the notebook can save
// and read back, so the folder is a plain, readable notebook that does not need this app. The
// template is `template.json`. The chosen folder is remembered (its handle in IndexedDB), so the
// notebook opens it again next time, asking once for permission.
//
// Only Chromium browsers have this API (`canUseFolder` says so); elsewhere the notebook stays in the
// browser and entries are moved by the file buttons.

import { DEFAULT_TEMPLATE, entryFile, readEntryFile, readTemplate, type Entry, type Template } from './model'
import type { NotebookStore } from './store'

export const canUseFolder = typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'

const TEMPLATE_FILE = 'template.json'

/** Walk to the file at a path like `entries/2026/x.md`, making the folders on the way when asked. */
async function fileAt(dir: FileSystemDirectoryHandle, path: string, create: boolean): Promise<FileSystemFileHandle> {
  const parts = path.split('/')
  let here = dir
  for (const part of parts.slice(0, -1)) here = await here.getDirectoryHandle(part, { create })
  return here.getFileHandle(parts[parts.length - 1], { create })
}

async function removeAt(dir: FileSystemDirectoryHandle, path: string): Promise<void> {
  const parts = path.split('/')
  let here = dir
  try {
    for (const part of parts.slice(0, -1)) here = await here.getDirectoryHandle(part)
    await here.removeEntry(parts[parts.length - 1])
  } catch {
    /* already gone */
  }
}

async function writeText(dir: FileSystemDirectoryHandle, path: string, text: string): Promise<void> {
  const handle = await fileAt(dir, path, true)
  const writable = await handle.createWritable()
  await writable.write(text)
  await writable.close()
}

/** A notebook kept in a folder. The id-to-path map lets an entry whose title or day changed replace its old file instead of leaving a second one. */
export function folderStore(dir: FileSystemDirectoryHandle): NotebookStore {
  const paths = new Map<string, string>()
  let template: Template = DEFAULT_TEMPLATE

  return {
    async list() {
      paths.clear()
      const out: Entry[] = []
      let root: FileSystemDirectoryHandle
      try {
        root = await dir.getDirectoryHandle('entries')
      } catch {
        return out
      }
      for await (const year of root.values()) {
        if (year.kind !== 'directory') continue
        for await (const file of year.values()) {
          if (file.kind !== 'file' || !file.name.endsWith('.md')) continue
          const entry = readEntryFile(await (await file.getFile()).text())
          if (entry) {
            out.push(entry)
            paths.set(entry.id, `entries/${year.name}/${file.name}`)
          }
        }
      }
      return out
    },
    async save(entry) {
      try {
        const { path, text } = entryFile(entry, template)
        await writeText(dir, path, text)
        const old = paths.get(entry.id)
        if (old && old !== path) await removeAt(dir, old)
        paths.set(entry.id, path)
        return true
      } catch {
        return false
      }
    },
    async remove(id) {
      const path = paths.get(id)
      if (path) await removeAt(dir, path)
      paths.delete(id)
    },
    async template() {
      try {
        const handle = await dir.getFileHandle(TEMPLATE_FILE)
        const read = readTemplate(JSON.parse(await (await handle.getFile()).text()))
        if (read) template = read
      } catch {
        /* no template file: the notebook starts from the default */
      }
      return template
    },
    async saveTemplate(next) {
      try {
        await writeText(dir, TEMPLATE_FILE, JSON.stringify(next, null, 2))
        template = next
        return true
      } catch {
        return false
      }
    },
  }
}

// ---- Remembering the folder between visits ----

const DB = 'biosketch-labbook'
const STORE = 'handles'
const KEY = 'folder'

function withDb<T>(run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB, 1)
    open.onupgradeneeded = () => open.result.createObjectStore(STORE)
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const db = open.result
      try {
        const tx = db.transaction(STORE, 'readwrite')
        const req = run(tx.objectStore(STORE))
        tx.oncomplete = () => {
          db.close()
          resolve(req.result)
        }
        tx.onerror = () => {
          db.close()
          reject(tx.error)
        }
      } catch (e) {
        db.close()
        reject(e)
      }
    }
  })
}

export async function rememberFolder(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    await withDb((s) => s.put(handle, KEY))
  } catch {
    /* the folder is used for this visit only */
  }
}

export async function recallFolder(): Promise<FileSystemDirectoryHandle | null> {
  try {
    return (await withDb<FileSystemDirectoryHandle | undefined>((s) => s.get(KEY))) ?? null
  } catch {
    return null
  }
}

export async function forgetFolder(): Promise<void> {
  try {
    await withDb((s) => s.delete(KEY))
  } catch {
    /* nothing kept */
  }
}

/** Whether the folder may be read and written: true at once when permission still holds, otherwise only after asking (which needs a press). */
export async function folderReady(handle: FileSystemDirectoryHandle, ask: boolean): Promise<boolean> {
  const opts = { mode: 'readwrite' as const }
  try {
    if ((await handle.queryPermission(opts)) === 'granted') return true
    if (!ask) return false
    return (await handle.requestPermission(opts)) === 'granted'
  } catch {
    return false
  }
}

/** Ask the scientist for a folder. Null when they close the picker. */
export async function pickFolder(): Promise<FileSystemDirectoryHandle | null> {
  try {
    return await window.showDirectoryPicker({ id: 'biosketch-labbook', mode: 'readwrite' })
  } catch {
    return null
  }
}
