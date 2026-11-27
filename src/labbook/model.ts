// The lab notebook: what an entry is, the template that says which fields an entry of each kind
// has, and the file an entry is kept in. Plain data and pure functions, no React and no browser.
//
// An entry read from a file or from storage is untrusted, like a figure: `readEntry` rebuilds every
// field. An entry keeps whatever fields it was written with, so changing the template never loses
// what was typed: a field the template no longer names is still in the entry and in its file.

import { validateDoc } from '../io/files'
import { emptyDoc } from '../model/doc'
import type { ChartNode } from '../model/types'

export type FieldType = 'text' | 'long' | 'link' | 'choice' | 'rows'

export interface Column {
  id: string
  label: string
  /** The choices of a column that is chosen from a list; absent = typed. */
  options?: string[]
}

export interface Field {
  id: string
  label: string
  type: FieldType
  /** A few words under the field on what belongs in it. */
  hint?: string
  /** The choices of a `choice` field. */
  options?: string[]
  /** The columns of a `rows` field (a small table: one row per clone, per oligo). */
  columns?: Column[]
}

export interface EntryKind {
  id: string
  name: string
  fields: Field[]
}

export interface Template {
  version: 1
  kinds: EntryKind[]
}

export type Row = Record<string, string>
export type Value = string | Row[]

/** A plot of an entry: a chart of BioSketch, which keeps its numbers, with a title. */
export interface Plot {
  title: string
  chart: ChartNode
}

export interface Entry {
  version: 1
  id: string
  /** The id of its kind in the template. */
  kind: string
  title: string
  /** The day of the experiment, as YYYY-MM-DD. */
  date: string
  /** When the entry was made and last changed, as ISO times. */
  created: string
  updated: string
  values: Record<string, Value>
  plots: Plot[]
}

export const TITLE_MAX = 200
export const TEXT_MAX = 40000
export const CELL_MAX = 2000
export const ROWS_MAX = 300
export const FIELDS_MAX = 60
export const PLOTS_MAX = 24
export const PLOT_W = 480
export const PLOT_H = 320

const isId = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(v)
const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))
const isTime = (v: unknown): v is string => typeof v === 'string' && v.length <= 40 && !Number.isNaN(Date.parse(v))
const text = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '')
const oneLine = (v: unknown, max: number): string => text(v, max * 2).replace(/\s+/g, ' ').trim().slice(0, max)
const record = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null)

const OLIGOS: Column[] = [
  { id: 'name', label: 'Name' },
  { id: 'sequence', label: 'Sequence (5′ to 3′)' },
  { id: 'link', label: 'Benchling link' },
  { id: 'use', label: 'Used for' },
]

/** The template a new notebook starts with. A lab changes it to its own work. */
export const DEFAULT_TEMPLATE: Template = {
  version: 1,
  kinds: [
    {
      id: 'experiment',
      name: 'Experiment',
      fields: [
        { id: 'aim', label: 'Aim', type: 'long', hint: 'The question this experiment answers.' },
        { id: 'reasoning', label: 'Reasoning', type: 'long', hint: 'Why this experiment, and why this way.' },
        { id: 'protocol', label: 'Protocol', type: 'long', hint: 'What was done, with what differed from the plan.' },
        { id: 'results', label: 'Results', type: 'long' },
        { id: 'conclusions', label: 'Conclusions', type: 'long' },
        { id: 'next', label: 'Next steps', type: 'long' },
      ],
    },
    {
      id: 'editing',
      name: 'Genome editing',
      fields: [
        { id: 'aim', label: 'Aim', type: 'long' },
        { id: 'gene', label: 'Target gene', type: 'text' },
        { id: 'locus', label: 'Locus or exon', type: 'text' },
        { id: 'approach', label: 'Approach', type: 'choice', options: ['Knockout', 'Knock-in', 'Base editing', 'Prime editing', 'CRISPRi or CRISPRa', 'Other'] },
        { id: 'cells', label: 'Cell line', type: 'text', hint: 'With its passage number.' },
        {
          id: 'guides',
          label: 'Guides',
          type: 'rows',
          columns: [
            { id: 'name', label: 'Name' },
            { id: 'sequence', label: 'Sequence (5′ to 3′)' },
            { id: 'link', label: 'Benchling link' },
          ],
        },
        { id: 'donor', label: 'Donor or template', type: 'text' },
        { id: 'delivery', label: 'Delivery', type: 'choice', options: ['Nucleofection', 'RNP electroporation', 'Lipofection', 'Lentivirus', 'Other'] },
        { id: 'oligos', label: 'Oligos', type: 'rows', columns: OLIGOS },
        { id: 'protocol', label: 'Protocol', type: 'long' },
        { id: 'results', label: 'Results', type: 'long' },
        { id: 'next', label: 'Next steps', type: 'long' },
      ],
    },
    {
      id: 'clones',
      name: 'Clone validation',
      fields: [
        { id: 'experiment', label: 'Editing experiment', type: 'text', hint: 'The title of the entry these clones come from.' },
        { id: 'method', label: 'Method', type: 'choice', options: ['Sanger sequencing', 'PCR and gel', 'Amplicon sequencing', 'Western blot', 'Other'] },
        {
          id: 'clones',
          label: 'Clones',
          type: 'rows',
          columns: [
            { id: 'clone', label: 'Clone' },
            { id: 'outcome', label: 'Outcome', options: ['Edited, both alleles', 'Edited, one allele', 'Indel', 'Wild type', 'Unclear'] },
            { id: 'genotype', label: 'Genotype' },
            { id: 'link', label: 'Benchling alignment' },
            { id: 'kept', label: 'Kept', options: ['Yes', 'No'] },
          ],
        },
        { id: 'oligos', label: 'Oligos', type: 'rows', columns: OLIGOS },
        { id: 'results', label: 'Results', type: 'long' },
        { id: 'conclusions', label: 'Conclusions', type: 'long' },
        { id: 'next', label: 'Next steps', type: 'long' },
      ],
    },
  ],
}

function readColumns(raw: unknown): Column[] {
  if (!Array.isArray(raw)) return []
  const out: Column[] = []
  for (const c of raw.slice(0, 12)) {
    const r = record(c)
    if (!r || !isId(r.id) || out.some((o) => o.id === r.id)) continue
    const options = readOptions(r.options)
    out.push({ id: r.id, label: oneLine(r.label, 60) || r.id, ...(options.length ? { options } : {}) })
  }
  return out
}

const readOptions = (raw: unknown): string[] => (Array.isArray(raw) ? [...new Set(raw.map((o) => oneLine(o, 80)).filter(Boolean))].slice(0, 40) : [])

/** A template as it may be used: every field rebuilt, anything unreadable left out. Null when nothing usable is left. */
export function readTemplate(data: unknown): Template | null {
  const kinds = record(data)?.kinds
  if (!Array.isArray(kinds)) return null
  const out: EntryKind[] = []
  for (const k of kinds.slice(0, 30)) {
    const r = record(k)
    if (!r || !isId(r.id) || out.some((o) => o.id === r.id) || !Array.isArray(r.fields)) continue
    const fields: Field[] = []
    for (const f of r.fields.slice(0, FIELDS_MAX)) {
      const fr = record(f)
      if (!fr || !isId(fr.id) || fields.some((o) => o.id === fr.id)) continue
      const type: FieldType = fr.type === 'long' || fr.type === 'link' || fr.type === 'choice' || fr.type === 'rows' ? fr.type : 'text'
      const hint = oneLine(fr.hint, 200)
      const options = type === 'choice' ? readOptions(fr.options) : []
      const columns = type === 'rows' ? readColumns(fr.columns) : []
      if (type === 'rows' && !columns.length) continue
      fields.push({ id: fr.id, label: oneLine(fr.label, 60) || fr.id, type, ...(hint ? { hint } : {}), ...(options.length ? { options } : {}), ...(columns.length ? { columns } : {}) })
    }
    if (fields.length) out.push({ id: r.id, name: oneLine(r.name, 60) || r.id, fields })
  }
  return out.length ? { version: 1, kinds: out } : null
}

export const kindOf = (template: Template, id: string): EntryKind | undefined => template.kinds.find((k) => k.id === id)

function readRows(raw: unknown[]): Row[] {
  const rows: Row[] = []
  for (const r of raw.slice(0, ROWS_MAX)) {
    const rec = record(r)
    if (!rec) continue
    const row: Row = {}
    for (const [key, v] of Object.entries(rec).slice(0, 12)) if (isId(key) && typeof v === 'string' && v) row[key] = v.slice(0, CELL_MAX)
    rows.push(row)
  }
  return rows
}

/** A chart as a figure may hold it, or null: it goes through the check every figure file goes through. */
export function readChart(raw: unknown): ChartNode | null {
  const r = record(raw)
  if (!r || r.type !== 'chart') return null
  try {
    const node = validateDoc({ ...emptyDoc(), width: PLOT_W, height: PLOT_H, nodes: [{ ...r, id: 'plot', x: 0, y: 0, w: PLOT_W, h: PLOT_H, rotation: 0 }] }).nodes[0]
    return node?.type === 'chart' ? node : null
  } catch {
    return null
  }
}

/** An entry as it may be used, or null when it is not one. Every field is rebuilt. */
export function readEntry(data: unknown): Entry | null {
  const r = record(data)
  if (!r || !isId(r.id) || !isId(r.kind)) return null
  const created = isTime(r.created) ? r.created : new Date(0).toISOString()
  const values: Record<string, Value> = {}
  for (const [key, v] of Object.entries(record(r.values) ?? {}).slice(0, FIELDS_MAX)) {
    if (!isId(key)) continue
    if (typeof v === 'string') {
      if (v) values[key] = v.slice(0, TEXT_MAX)
    } else if (Array.isArray(v)) {
      const rows = readRows(v)
      if (rows.length) values[key] = rows
    }
  }
  const plots: Plot[] = []
  for (const p of Array.isArray(r.plots) ? r.plots.slice(0, PLOTS_MAX) : []) {
    const chart = readChart(record(p)?.chart)
    if (chart) plots.push({ title: oneLine(record(p)?.title, TITLE_MAX), chart })
  }
  return {
    version: 1,
    id: r.id,
    kind: r.kind,
    title: oneLine(r.title, TITLE_MAX),
    date: isDate(r.date) ? r.date : created.slice(0, 10),
    created,
    updated: isTime(r.updated) ? r.updated : created,
    values,
    plots,
  }
}

const newId = (): string => 'e' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

/** The day of a time, where the scientist is: YYYY-MM-DD. */
export function localDay(now: Date): string {
  const two = (n: number): string => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`
}

export function newEntry(kind: string, now: Date = new Date(), id: string = newId()): Entry {
  const time = now.toISOString()
  return { version: 1, id, kind, title: '', date: localDay(now), created: time, updated: time, values: {}, plots: [] }
}

/** The entry with one field changed; an empty value takes the field out. */
export function setValue(entry: Entry, field: string, value: Value): Entry {
  const values = { ...entry.values }
  const empty = typeof value === 'string' ? !value : !value.length
  if (empty) delete values[field]
  else values[field] = value
  return { ...entry, values }
}

/** Newest first: by the day of the experiment, then by the last change. */
export const sortEntries = (entries: Entry[]): Entry[] => [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.updated.localeCompare(a.updated))

/** Everything typed into an entry, for searching: title, day, fields, cells of rows, plot titles. */
export function entryWords(entry: Entry): string {
  const parts = [entry.title, entry.date]
  for (const v of Object.values(entry.values)) {
    if (typeof v === 'string') parts.push(v)
    else for (const row of v) parts.push(...Object.values(row))
  }
  for (const p of entry.plots) parts.push(p.title)
  return parts.join('\n').toLowerCase()
}

/** The entries that hold every word typed, in any field. Without words: all of them. */
export function searchEntries(entries: Entry[], query: string): Entry[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return entries
  return entries.filter((e) => {
    const hay = entryWords(e)
    return words.every((w) => hay.includes(w))
  })
}

// ---- The file of an entry ----
//
// One Markdown file per entry: first the entry written out for reading (on GitHub, in any editor,
// by someone who does not have the notebook), then the entry itself in a block the notebook reads
// back. Only that block is read; the text above it is written again from it at every save.

const BLOCK = 'json labbook-entry'

const slug = (title: string): string =>
  title
    .normalize('NFKD')
    .replace(/[^\x20-\x7e]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)

/** Where an entry is kept: a folder per year, a name that begins with the day and ends in the entry's id, so that a new title never makes two entries collide. */
export function entryPath(entry: Entry): string {
  const name = [entry.date, slug(entry.title), entry.id].filter(Boolean).join('-')
  return `entries/${entry.date.slice(0, 4)}/${name}.md`
}

const cell = (v: string): string => v.replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ')

function rowsTable(columns: Column[], rows: Row[]): string {
  const used = columns.filter((c) => rows.some((r) => r[c.id]))
  const extra = [...new Set(rows.flatMap((r) => Object.keys(r)))].filter((k) => !columns.some((c) => c.id === k)).map((id) => ({ id, label: id }))
  const cols = [...used, ...extra]
  if (!cols.length) return ''
  const line = (cells: string[]): string => `| ${cells.join(' | ')} |`
  return [line(cols.map((c) => cell(c.label))), line(cols.map(() => '---')), ...rows.map((r) => line(cols.map((c) => cell(r[c.id] ?? ''))))].join('\n')
}

/** The entry written out for reading. */
export function entryMarkdown(entry: Entry, template: Template): string {
  const kind = kindOf(template, entry.kind)
  const out: string[] = [`# ${entry.title || 'Untitled entry'}`, '', `${entry.date} · ${kind?.name ?? entry.kind}`]
  const known = kind?.fields ?? []
  // Fields of the template in its order, then whatever else the entry holds (fields of an older template).
  const left: Field[] = Object.keys(entry.values)
    .filter((id) => !known.some((f) => f.id === id))
    .map((id) => ({ id, label: id, type: 'text' }))
  for (const field of [...known, ...left]) {
    const v = entry.values[field.id]
    if (v === undefined) continue
    const body = typeof v === 'string' ? v.trim() : rowsTable(field.columns ?? [], v)
    if (!body) continue
    out.push('', `## ${field.label}`, '', body)
  }
  if (entry.plots.length) {
    out.push('', '## Plots', '')
    entry.plots.forEach((p, i) => out.push(`- ${p.title || `Plot ${i + 1}`} (${p.chart.groups.length} ${p.chart.groups.length === 1 ? 'group' : 'groups'}; its numbers are kept below and drawn by the notebook)`))
  }
  return out.join('\n')
}

/** The file of an entry: its path in the notebook and its text. */
export function entryFile(entry: Entry, template: Template): { path: string; text: string } {
  const note = '<!-- Written by the BioSketch lab notebook. The block below is the entry itself: change the entry in the notebook, not here. -->'
  const text = `${entryMarkdown(entry, template)}\n\n${note}\n\n\`\`\`${BLOCK}\n${JSON.stringify(entry, null, 1)}\n\`\`\`\n`
  return { path: entryPath(entry), text }
}

/** The entry a file holds, or null when the file is not an entry of the notebook. */
export function readEntryFile(text: string): Entry | null {
  if (typeof text !== 'string' || text.length > 20_000_000) return null
  // The block begins on a line of its own. What is typed into an entry can hold the same words, but
  // inside the block every text is one line of JSON, so the last such line is the block itself.
  const mark = '\n```' + BLOCK + '\n'
  const start = ('\n' + text).lastIndexOf(mark)
  if (start < 0) return null
  const from = start + mark.length - 2
  const end = text.indexOf('\n```', from)
  if (end < 0) return null
  try {
    return readEntry(JSON.parse(text.slice(from + 1, end)))
  } catch {
    return null
  }
}
