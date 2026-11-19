// Reading a table for a chart from a file: text files (CSV, tab-separated, plain text) and Excel
// workbooks (.xlsx). Whatever the file, the result is the same tab-separated text the scientist
// could have pasted, and it goes through `readTable` like pasted text: a file is as untrusted as
// the clipboard.
//
// An .xlsx file is a ZIP of XML parts. It is read by hand, like the PowerPoint export is written
// (no library to ship): the ZIP's list of files, the browser's own decompression
// (`DecompressionStream`), and the three parts that hold a sheet's cells.

/** Files a chart's table can be read from. */
export const TABLE_ACCEPT = '.csv,.tsv,.tab,.txt,.xlsx,text/csv,text/tab-separated-values,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
/** The largest file that is opened. A table for a chart is a few kilobytes; this leaves room for a workbook with other sheets. */
export const MAX_TABLE_FILE = 20 * 1024 * 1024
/** The most a part of a workbook may grow to when unpacked (a small file can unpack to a huge one). */
const MAX_UNPACKED = 60 * 1024 * 1024
/** Rows and columns of a sheet that are read; a chart takes far fewer. */
const MAX_SHEET_ROWS = 25000
const MAX_SHEET_COLS = 200

export interface ImportedTable {
  /** The table as tab-separated text. */
  text: string
  /** Something the scientist should know about what was read (which sheet, what was cut). */
  note?: string
}

/** One cell as it goes into tab-separated text: on one line, without tabs. */
const clean = (cell: string): string => cell.replace(/[\t\r\n]+/g, ' ').trim()

/** Rows of cells as tab-separated text, without the empty rows and columns around the table (a table in a workbook often starts away from the corner). */
export function gridToText(grid: string[][]): string {
  const rows = grid.map((row) => row.map((c) => clean(c ?? '')))
  const used = rows.filter((row) => row.some(Boolean))
  if (!used.length) return ''
  const first = Math.min(...used.map((row) => row.findIndex(Boolean)))
  const last = Math.max(...used.map((row) => row.length - 1 - [...row].reverse().findIndex(Boolean)))
  while (rows.length && !rows[rows.length - 1].some(Boolean)) rows.pop()
  while (rows.length && !rows[0].some(Boolean)) rows.shift()
  return rows.map((row) => Array.from({ length: last - first + 1 }, (_, i) => row[first + i] ?? '').join('\t')).join('\n')
}

/**
 * A CSV file with quoted cells ("1,5" or "IL-6, 10 ng/ml") as tab-separated text. The separator
 * is the tab if the first line has one, else the semicolon if it has one, else the comma. Inside
 * quotes a doubled quote is a quote, and separators and line breaks belong to the cell.
 */
export function csvToText(text: string): string {
  // What stands outside quotes in the first row decides the separator.
  let outside = ''
  for (let i = 0, inQuotes = false; i < text.length; i++) {
    if (text[i] === '"') inQuotes = !inQuotes
    else if (!inQuotes && (text[i] === '\n' || text[i] === '\r')) break
    else if (!inQuotes) outside += text[i]
  }
  const mark = outside.includes('\t') ? '\t' : outside.includes(';') ? ';' : ','
  const grid: string[][] = [[]]
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"' && cell.trim() === '') quoted = true
    else if (ch === mark) {
      grid[grid.length - 1].push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      grid[grid.length - 1].push(cell)
      cell = ''
      grid.push([])
    } else cell += ch
  }
  grid[grid.length - 1].push(cell)
  return grid.map((row) => row.map(clean).join('\t')).join('\n')
}

/** The text of a file, whatever a spreadsheet program wrote it as: UTF-8, UTF-16 ("Unicode text") or the Windows character set. */
export function decodeText(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes.subarray(2))
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes.subarray(2))
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^﻿/, '')
  } catch {
    // Not UTF-8: an older Windows program wrote it. µ and ° survive this way.
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

// ---------- the ZIP an Excel workbook is ----------

interface ZipPart {
  method: number
  start: number
  packed: number
  size: number
}

const NOT_WORKBOOK = 'This file is not an Excel workbook (.xlsx). Save the table as .xlsx or .csv and try again.'

/** The files inside a ZIP, by name, from the list at its end. */
export function zipParts(bytes: Uint8Array): Map<string, ZipPart> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  // The list ends the file, followed at most by a comment of 65535 bytes.
  let end = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65535); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i
      break
    }
  }
  if (end < 0) throw new Error(NOT_WORKBOOK)
  const count = view.getUint16(end + 10, true)
  let at = view.getUint32(end + 16, true)
  const parts = new Map<string, ZipPart>()
  const decoder = new TextDecoder()
  for (let n = 0; n < count && at + 46 <= bytes.length; n++) {
    if (view.getUint32(at, true) !== 0x02014b50) break
    const method = view.getUint16(at + 10, true)
    const packed = view.getUint32(at + 20, true)
    const size = view.getUint32(at + 24, true)
    const [nameLength, extraLength, commentLength] = [view.getUint16(at + 28, true), view.getUint16(at + 30, true), view.getUint16(at + 32, true)]
    const local = view.getUint32(at + 42, true)
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength))
    // The data follows the file's own header, whose name and extra field may differ in length from the list's.
    if (local + 30 <= bytes.length && view.getUint32(local, true) === 0x04034b50) {
      const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true)
      if (start + packed <= bytes.length) parts.set(name, { method, start, packed, size })
    }
    at += 46 + nameLength + extraLength + commentLength
  }
  return parts
}

/** Unpack "deflate" data with the browser's own decompression, giving up beyond `limit` bytes. */
async function inflate(data: Uint8Array, limit: number): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot open Excel files. Save the table as .csv and try again.')
  const stream = new DecompressionStream('deflate-raw')
  const writer = stream.writable.getWriter()
  // Errors of writing show up when reading, where they are caught.
  void writer.write(data as unknown as BufferSource).catch(() => {})
  void writer.close().catch(() => {})
  const reader = stream.readable.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.length
    if (total > limit) {
      void reader.cancel().catch(() => {})
      throw new Error('This workbook is too large to read. Copy the table into a sheet of its own, or save it as .csv.')
    }
    chunks.push(value)
  }
  const out = new Uint8Array(total)
  let at = 0
  for (const chunk of chunks) {
    out.set(chunk, at)
    at += chunk.length
  }
  return out
}

async function partText(bytes: Uint8Array, parts: Map<string, ZipPart>, name: string): Promise<string | null> {
  const part = parts.get(name)
  if (!part) return null
  if (part.size > MAX_UNPACKED) throw new Error('This workbook is too large to read. Copy the table into a sheet of its own, or save it as .csv.')
  const data = bytes.subarray(part.start, part.start + part.packed)
  if (part.method === 0) return new TextDecoder().decode(data)
  if (part.method !== 8) throw new Error(NOT_WORKBOOK)
  try {
    return new TextDecoder().decode(await inflate(data, MAX_UNPACKED))
  } catch (error) {
    throw error instanceof Error && /too large|cannot open/.test(error.message) ? error : new Error('This workbook is damaged and cannot be read.')
  }
}

// ---------- the sheet inside ----------

const parseXml = (text: string): Document => new DOMParser().parseFromString(text, 'application/xml')
const all = (root: Document | Element, tag: string): Element[] => Array.from(root.getElementsByTagNameNS('*', tag))

/** The number of a column from its letters: A = 0, Z = 25, AA = 26. */
export function columnIndex(ref: string): number {
  let n = 0
  for (const ch of ref.toUpperCase()) {
    if (ch < 'A' || ch > 'Z') break
    n = n * 26 + (ch.charCodeAt(0) - 64)
  }
  return n - 1
}

/** The words of one entry of the workbook's list of texts, or of a cell that holds its own: all its runs, without phonetic notes. */
const richText = (el: Element): string =>
  all(el, 't')
    .filter((t) => !t.closest('rPh'))
    .map((t) => t.textContent ?? '')
    .join('')

/**
 * The first sheet of an Excel workbook as tab-separated text. Numbers are taken as stored (a
 * formula gives its last result), texts as written; dates come out as Excel's day numbers.
 */
export async function xlsxToTable(bytes: Uint8Array): Promise<ImportedTable> {
  const parts = zipParts(bytes)
  const workbook = await partText(bytes, parts, 'xl/workbook.xml')
  if (!workbook) throw new Error(NOT_WORKBOOK)
  const sheets = all(parseXml(workbook), 'sheet')
  if (!sheets.length) throw new Error('This workbook has no sheet.')
  // Where the first sheet is kept is written in the workbook's list of relations.
  const relId = sheets[0].getAttribute('r:id') ?? sheets[0].getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id')
  const rels = await partText(bytes, parts, 'xl/_rels/workbook.xml.rels')
  const target = rels ? all(parseXml(rels), 'Relationship').find((r) => r.getAttribute('Id') === relId)?.getAttribute('Target') : null
  const path = target ? (target.startsWith('/') ? target.slice(1) : `xl/${target}`) : 'xl/worksheets/sheet1.xml'
  const sheet = await partText(bytes, parts, path)
  if (!sheet) throw new Error('The first sheet of this workbook is not a table (it may be a chart sheet). Move the table to the first sheet, or save it as .csv.')
  const shared = await partText(bytes, parts, 'xl/sharedStrings.xml')
  const strings = shared ? all(parseXml(shared), 'si').map(richText) : []

  const grid: string[][] = []
  let cut = false
  let rowAt = -1
  for (const row of all(parseXml(sheet), 'row')) {
    const r = Number(row.getAttribute('r'))
    rowAt = Number.isInteger(r) && r > 0 ? r - 1 : rowAt + 1
    if (rowAt >= MAX_SHEET_ROWS) {
      cut = true
      break
    }
    let colAt = -1
    for (const c of Array.from(row.children).filter((el) => el.localName === 'c')) {
      const ref = c.getAttribute('r')
      colAt = ref ? columnIndex(ref) : colAt + 1
      if (colAt < 0 || colAt >= MAX_SHEET_COLS) {
        cut ||= colAt >= MAX_SHEET_COLS
        continue
      }
      const type = c.getAttribute('t') ?? 'n'
      const v = Array.from(c.children).find((el) => el.localName === 'v')?.textContent ?? ''
      let text = ''
      if (type === 's') text = strings[Number(v)] ?? ''
      else if (type === 'inlineStr') text = richText(c)
      else if (type === 'b') text = v === '1' ? 'TRUE' : 'FALSE'
      else if (type === 'e') text = ''
      else if (type === 'n') text = v !== '' && Number.isFinite(Number(v)) ? String(Number(v)) : v
      else text = v
      if (text === '') continue
      while (grid.length <= rowAt) grid.push([])
      grid[rowAt][colAt] = text
    }
  }
  const text = gridToText(grid.map((row) => Array.from(row, (c) => c ?? '')))
  if (!text) throw new Error(`The first sheet of this workbook${sheets.length > 1 ? ` (“${sheets[0].getAttribute('name') ?? ''}”)` : ''} is empty.`)
  const notes = [
    sheets.length > 1 ? `Read the first of ${sheets.length} sheets, “${sheets[0].getAttribute('name') ?? ''}”.` : '',
    cut ? `Only the first ${MAX_SHEET_ROWS} rows and ${MAX_SHEET_COLS} columns of the sheet were read.` : '',
  ].filter(Boolean)
  return { text, ...(notes.length ? { note: notes.join(' ') } : {}) }
}

/**
 * The table in a file the scientist chose, as tab-separated text. Throws an error whose message
 * can be shown as it is when the file cannot be read as a table.
 */
export async function tableFromFile(file: { name: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> }): Promise<ImportedTable> {
  if (file.size > MAX_TABLE_FILE) throw new Error(`This file is larger than ${MAX_TABLE_FILE / 1024 / 1024} MB. Copy the table for the chart into a file of its own.`)
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!bytes.length) throw new Error('This file is empty.')
  // A file is known by how it starts, not by its name.
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return xlsxToTable(bytes)
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) throw new Error('This is a file in the old Excel format (.xls). Save it as .xlsx or .csv and try again.')
  const text = decodeText(bytes)
  if (text.includes('\u0000')) throw new Error('This file is not a table BioSketch can read. Use .csv, .tsv, .txt or .xlsx.')
  return { text: text.includes('"') ? csvToText(text) : text }
}
