// The scientist's own slide templates: slides designed once and saved, to begin new slides with.
// They are kept in this browser beside the figures, each as a figure of one slide, and pass through
// the same checks as a figure file when they are read back or brought in from a file.

import type { FigDoc } from '../model/types'
import { parseDoc, serializeDoc } from './files'
import { kvGet, kvSet } from './storage'

export interface SlideTemplate {
  id: string
  name: string
  /** New slides begin with this template unless another start is chosen. At most one template is. */
  isDefault: boolean
  /** The template itself: a figure of one slide. */
  doc: FigDoc
}

const KEY = 'slide-templates'
/** The most templates that are kept. */
export const MAX_TEMPLATES = 30

const newId = (): string => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

/** The templates as they are stored: read back as untrusted data, each rebuilt like a figure file. */
export function readTemplates(text: string | null): SlideTemplate[] {
  let list: unknown
  try {
    list = JSON.parse(text ?? '[]')
  } catch {
    return []
  }
  if (!Array.isArray(list)) return []
  const out: SlideTemplate[] = []
  for (const raw of list.slice(0, MAX_TEMPLATES)) {
    if (!raw || typeof raw !== 'object') continue
    const o = raw as Record<string, unknown>
    if (typeof o.id !== 'string' || !/^[\w-]{1,64}$/.test(o.id) || typeof o.doc !== 'string') continue
    try {
      const doc = parseDoc(o.doc)
      // A template is one slide: anything else a stored figure may hold is left behind.
      const { slides: _slides, notes: _notes, widthMm: _mm, ...slide } = doc
      out.push({ id: o.id, name: slide.name, isDefault: o.isDefault === true && !out.some((t) => t.isDefault), doc: slide })
    } catch {
      /* an unreadable template is passed over */
    }
  }
  return out
}

export const writeTemplates = (list: SlideTemplate[]): string => JSON.stringify(list.slice(0, MAX_TEMPLATES).map((t) => ({ id: t.id, isDefault: t.isDefault, doc: serializeDoc(t.doc) })))

export const listSlideTemplates = async (): Promise<SlideTemplate[]> => readTemplates(await kvGet(KEY))

const store = async (list: SlideTemplate[]): Promise<SlideTemplate[] | null> => ((await kvSet(KEY, writeTemplates(list))) ? list : null)

/** Keep a slide as a template, in front of the others. Null when the browser refuses to store it. */
export async function saveSlideTemplate(doc: FigDoc): Promise<SlideTemplate[] | null> {
  const list = await listSlideTemplates()
  return store([{ id: newId(), name: doc.name, isDefault: false, doc }, ...list])
}

export async function deleteSlideTemplate(id: string): Promise<SlideTemplate[] | null> {
  return store((await listSlideTemplates()).filter((t) => t.id !== id))
}

/** Make one template the start of every new slide, or none (`id` null). */
export async function setDefaultSlideTemplate(id: string | null): Promise<SlideTemplate[] | null> {
  return store((await listSlideTemplates()).map((t) => ({ ...t, isDefault: t.id === id })))
}
