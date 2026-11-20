// A backup of every figure of this browser as one file, and reading such a file back. Figures
// live only in the browser: clearing site data, another computer or another browser, and they
// are gone. A backup file is untrusted like any file: every figure in it goes through `parseDoc`
// (and so `validateDoc`), and one that does not is counted, never half-read.

import type { FigDoc } from '../model/types'
import { parseDoc, serializeDoc } from './files'
import { tidyProject } from './storage'

export const BACKUP_FORMAT = 'biosketch-backup'

/** A file larger than this is refused before it is read: a backup of hundreds of figures is a few tens of megabytes. */
export const BACKUP_MAX_BYTES = 200 * 1024 * 1024
/** At most this many figures are read from one file. */
export const BACKUP_MAX_FIGURES = 2000

export interface BackupEntry {
  doc: FigDoc
  project?: string
  /** Time of the last save, in milliseconds since 1970. */
  updated: number
}

/** The text of a backup file. Each figure is stored as the text of its own figure file, so a backup can also be taken apart by hand. */
export function backupText(entries: BackupEntry[], made: number = Date.now()): string {
  return JSON.stringify({
    format: BACKUP_FORMAT,
    version: 1,
    made,
    figures: entries.map((e) => ({ figure: serializeDoc(e.doc), updated: e.updated, ...(e.project ? { project: e.project } : {}) })),
  })
}

export interface ReadBackup {
  figures: BackupEntry[]
  /** Figures in the file that could not be read. */
  unreadable: number
  /** Figures beyond `BACKUP_MAX_FIGURES`, left out. */
  leftOut: number
}

/** Read a backup file. Throws, with a message for people, when the file is not a backup at all. */
export function readBackup(text: string): ReadBackup {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('This file is not a BioSketch backup.')
  }
  if (!data || typeof data !== 'object') throw new Error('This file is not a BioSketch backup.')
  const record = data as Record<string, unknown>
  if (record.format !== BACKUP_FORMAT) {
    // A single figure file was chosen: say where it is opened instead.
    if (Array.isArray(record.nodes)) throw new Error('This is a single figure, not a backup. Open it with File › Open figure file.')
    throw new Error('This file is not a BioSketch backup.')
  }
  if (record.version !== 1) throw new Error('This backup was made by a newer version of BioSketch. Reload the page to get the newest version, then try again.')
  const list = Array.isArray(record.figures) ? record.figures : []
  const figures: BackupEntry[] = []
  let unreadable = 0
  for (const item of list.slice(0, BACKUP_MAX_FIGURES)) {
    const entry = item as Record<string, unknown> | null
    try {
      if (!entry || typeof entry.figure !== 'string') throw new Error('no figure')
      const doc = parseDoc(entry.figure)
      const updated = typeof entry.updated === 'number' && Number.isFinite(entry.updated) && entry.updated > 0 ? entry.updated : Date.now()
      const project = tidyProject(entry.project)
      figures.push({ doc, updated, ...(project ? { project } : {}) })
    } catch {
      unreadable++
    }
  }
  return { figures, unreadable, leftOut: Math.max(0, list.length - BACKUP_MAX_FIGURES) }
}

/** The name of a backup file made on a day: biosketch-backup-2026-11-20.json. */
export function backupFileName(when: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `biosketch-backup-${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}.json`
}
