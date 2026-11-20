/**
 * Reading any pasted table for one analysis: split it into cells, find the header, and guess what each
 * column is for (a name, a concentration, a signal, a Cq, a well ...). The guess is never silent: every
 * column comes with a reason, and the interface lets the scientist correct it.
 *
 * Pure: no React, no browser APIs. Conventions follow `readTable` (src/model/chart.ts): a typographic
 * minus is a hyphen, "1 234" is never joined across a space, a lone comma is a decimal comma unless the
 * table writes decimals with a point elsewhere, and what was not read is reported (`skipped`).
 */

/** One role a column can play in an analysis, declared by the analysis. */
export interface RoleSpec {
  id: string
  label: string
  kind: 'number' | 'words' | 'well' | 'any'
  /** Several columns may take it (replicate signals). */
  many?: boolean
  /** Words in a heading that point to this role. The earlier a pattern stands, the stronger it counts. */
  heading: RegExp[]
  required?: boolean
  /** With no heading to go by, the first column of words nobody else claimed takes this role (a sample name). */
  byPlace?: boolean
}

export const IGNORE = 'ignore'

export interface Cells {
  rows: string[][]
  header: string[] | null
  /** Lines left out: instrument preamble before the table, footer lines after it. */
  skipped: string[]
  /** A lone comma in the table is a decimal comma (see `cellNumber`). */
  decimalComma: boolean
}

export interface RoleGuess {
  roles: string[]
  why: string[]
  missing: string[]
}

const THOUSANDS_BY_COMMA = /^[-+]?\d{1,3}(,\d{3})+$/
const PLAIN_NUMBER = /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i
const COMMA_NUMBER = /^[-+]?(\d+,\d*|,\d+)(e[-+]?\d+)?$/i
/** Cells an instrument writes where it has no number. */
const NO_VALUE = /^(undetermined|n\/?a|nan|na|-+|—|–|\*+|ovrflw|overflow|over|\.{2,}|<.*|>.*|nd|n\.d\.|#.*)$/i

const clean = (s: string): string => s.replace(/−/g, '-').replace(/[–—](?=\s*\d)/g, '-').replace(/ /g, ' ').trim()

/**
 * A number as a biologist types it. "1,23" is 1.23 when `decimalComma`; "1,234" and "1,234.5" are
 * thousands when it is not; "1.234,5" is read by its last mark. "1 234" is not joined: null.
 * Words such as "Undetermined", "N/A", "-", "<LOD", "OVRFLW" and "*" are null.
 */
export function cellNumber(cell: string, decimalComma: boolean): number | null {
  const t = clean(cell)
  if (!t) return null
  let s = t
  if (PLAIN_NUMBER.test(s)) {
    /* as is */
  } else if (/^[-+]?\d{1,3}(\.\d{3})+,\d+$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (/^[-+]?\d{1,3}(,\d{3})+\.\d*$/.test(s)) {
    s = s.replace(/,/g, '')
  } else if (COMMA_NUMBER.test(s) && (decimalComma || !THOUSANDS_BY_COMMA.test(s)) && (s.match(/,/g) ?? []).length === 1) {
    if (!decimalComma) return null
    s = s.replace(',', '.')
  } else if (THOUSANDS_BY_COMMA.test(s)) {
    s = s.replace(/,/g, '')
  } else return null
  const v = Number(s)
  return Number.isFinite(v) ? v : null
}

/** Is a lone comma in these cells a decimal comma? Yes, unless the table writes decimals with a point and every comma sits where thousands would. */
export function decimalCommaIn(cells: string[]): boolean {
  const withComma = cells.filter((c) => c.includes(',') && !c.includes('.') && /\d/.test(c))
  return withComma.some((c) => !THOUSANDS_BY_COMMA.test(clean(c))) || !cells.some((c) => /\d\.\d/.test(c) && !c.includes(','))
}

/** "a1", "A01", "A 1" become "A1". Rows A to P, columns 1 to 24; anything else is null. */
export function wellName(text: string): string | null {
  const m = /^\s*([A-Pa-p])\s*0*(\d{1,2})\s*$/.exec(text)
  if (!m) return null
  const n = Number(m[2])
  return n >= 1 && n <= 24 ? `${m[1].toUpperCase()}${n}` : null
}

/** One line into cells; quotes are honoured for a single-character mark. */
function splitLine(line: string, mark: string): string[] {
  if (mark === '  ') return line.trim().split(/ {2,}|\t/).map((c) => c.trim())
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else quoted = false
      } else cur += ch
    } else if (ch === '"' && cur.trim() === '') {
      quoted = true
      cur = ''
    } else if (ch === mark) {
      out.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  out.push(cur.trim())
  return out
}

const nonblank = (row: string[]): number => row.filter((c) => c.trim() !== '').length

/** The width that covers the most cells, among widths of at least two that occur at least twice (or once in a one-line text). */
function bestWidth(counts: number[]): { width: number; score: number } | null {
  const freq = new Map<number, number>()
  for (const c of counts) if (c >= 2) freq.set(c, (freq.get(c) ?? 0) + 1)
  const need = counts.length <= 1 ? 1 : 2
  let best: { width: number; score: number } | null = null
  for (const [width, f] of freq) {
    if (f < need) continue
    const score = f * width
    if (!best || score > best.score || (score === best.score && width > best.width)) best = { width, score }
  }
  return best
}

/**
 * Split pasted text (or a file's text) into cells: tabs, then semicolons, then commas (quoted CSV), then
 * runs of two or more spaces. Lines before the table (instrument preamble such as "* Block Type = 96-Well",
 * a title, empty lines) and lines after it that hold a single cell are left out and listed in `skipped`.
 * The first kept row is a header when it is words over columns that are numbers (or all different words).
 */
export function readCells(text: string): Cells {
  const lines = text
    .replace(/^﻿/, '')
    .split(/\r\n|\r|\n/)
    .filter((l) => l.trim() !== '')
  const result: Cells = { rows: [], header: null, skipped: [], decimalComma: false }
  if (!lines.length) return result

  // The mark that gives the widest consistent table.
  let chosen: { mark: string; rows: string[][]; width: number; score: number } | null = null
  for (const mark of ['\t', ';', ',', '  ']) {
    const rows = lines.map((l) => splitLine(l, mark))
    const best = bestWidth(rows.map((r) => r.length))
    if (best && (!chosen || best.score > chosen.score)) chosen = { mark, rows, width: best.width, score: best.score }
  }
  if (!chosen) {
    // One cell on every line: a single column.
    result.rows = lines.map((l) => [l.trim()])
    result.decimalComma = decimalCommaIn(result.rows.flat())
    return finish(result)
  }
  const { rows: all, width } = chosen
  let start = all.findIndex((r) => r.length === width && nonblank(r) >= 2)
  if (start < 0) start = all.findIndex((r) => r.length === width)
  // A title row padded with empty cells ("Bradford 19.11.2026;;;;;") is not the table.
  while (start < all.length - 1 && nonblank(all[start]) <= 1 && nonblank(all[start + 1]) >= 2) start++
  let end = all.length
  while (end > start + 1 && all[end - 1].length !== width && nonblank(all[end - 1]) <= 1) end--
  for (let i = 0; i < start; i++) result.skipped.push(lines[i].trim())
  for (let i = end; i < all.length; i++) result.skipped.push(lines[i].trim())
  const kept = all.slice(start, end)
  const w = Math.max(...kept.map((r) => r.length))
  result.rows = kept.map((r) => (r.length < w ? [...r, ...Array<string>(w - r.length).fill('')] : r))
  result.decimalComma = decimalCommaIn(result.rows.flat())
  return finish(result)
}

/** Decide whether the first row is a header. */
function finish(cells: Cells): Cells {
  const { rows, decimalComma } = cells
  if (rows.length < 2) return cells
  const first = rows[0]
  const filled = first.filter((c) => c.trim() !== '')
  if (!filled.length) return cells
  const numeric = (c: string): boolean => cellNumber(c, decimalComma) !== null
  if (filled.some(numeric) && filled.filter(numeric).length / filled.length > 0.2) return cells
  const below = rows.slice(1)
  const numericBelow = first.some((_, j) => {
    const col = below.map((r) => r[j] ?? '').filter((c) => c.trim() !== '')
    return col.length > 0 && col.filter((c) => numeric(c) || NO_VALUE.test(clean(c))).length / col.length >= 0.7 && col.some(numeric)
  })
  let header = numericBelow
  if (!header) {
    const names = filled.map((c) => c.trim().toLowerCase())
    const seen = new Set(names)
    const inBody = below.some((r) => r.some((c) => seen.has(c.trim().toLowerCase())))
    header = seen.size === names.length && !inBody
  }
  if (header) return { ...cells, header: first.map((c) => c.trim()), rows: below }
  return cells
}

export interface PlateWell {
  well: string
  value: number | null
  text: string
}

/**
 * A 96- or 384-well plate grid (rows A–H or A–P down the side, 1–12 or 1–24 across the top) as plate
 * readers export it: a corner cell, the column numbers, then a row of values per letter. Anything before,
 * after or to the right of the grid is ignored. Grids one under another (several reads) give several plates.
 * Null when the cells are not a plate.
 */
export function readPlates(input: Cells | string): { wells: PlateWell[]; title?: string }[] | null {
  const cells = typeof input === 'string' ? readCells(input) : input
  const rows = cells.header ? [cells.header, ...cells.rows] : cells.rows
  const plates: { wells: PlateWell[]; title?: string }[] = []
  let r = 0
  while (r < rows.length) {
    const row = rows[r]
    const at = row.findIndex((c, j) => c.trim() === '1' && row[j + 1]?.trim() === '2')
    let n = 0
    if (at > 0) while (row[at + n]?.trim() === String(n + 1)) n++
    const labelCol = at - 1
    if (at >= 1 && (n === 12 || n === 24) && labelCol >= 0) {
      const letters = n === 12 ? 8 : 16
      let ok = r + letters <= rows.length - 1
      const wells: PlateWell[] = []
      if (ok) {
        for (let k = 0; k < letters; k++) {
          const line = rows[r + 1 + k]
          if (!line || (line[labelCol] ?? '').trim().toUpperCase() !== String.fromCharCode(65 + k)) {
            ok = false
            break
          }
          for (let j = 0; j < n; j++) {
            const text = (line[at + j] ?? '').trim()
            wells.push({ well: `${String.fromCharCode(65 + k)}${j + 1}`, value: cellNumber(text, cells.decimalComma), text })
          }
        }
      }
      if (ok) {
        const above = r > 0 ? rows[r - 1].filter((c) => c.trim() !== '') : []
        plates.push(above.length === 1 && cellNumber(above[0], true) === null ? { wells, title: above[0].trim() } : { wells })
        r += letters + 1
        continue
      }
    }
    r++
  }
  return plates.length ? plates : null
}

type Kind = 'empty' | 'number' | 'well' | 'words'

interface ColumnInfo {
  kind: Kind
  /** Short description for the reason: "numbers, with gaps". */
  desc: string
}

function describeColumn(values: string[], decimalComma: boolean): ColumnInfo {
  const filled = values.filter((c) => c.trim() !== '')
  if (!filled.length) return { kind: 'empty', desc: 'empty' }
  const noValue = filled.filter((c) => cellNumber(c, decimalComma) === null && NO_VALUE.test(clean(c))).length
  const numbers = filled.filter((c) => cellNumber(c, decimalComma) !== null).length
  const gaps = values.length - numbers
  if (numbers > 0 && numbers >= 0.8 * (filled.length - noValue)) {
    return { kind: 'number', desc: gaps > 0 ? 'numbers, with gaps' : 'numbers' }
  }
  const wells = filled.filter((c) => wellName(c) !== null).length
  if (wells >= 0.8 * filled.length && new Set(filled.map((c) => wellName(c))).size >= Math.min(filled.length, 2)) {
    return { kind: 'well', desc: 'well names' }
  }
  const distinct = new Set(filled.map((c) => c.trim().toLowerCase())).size
  return { kind: 'words', desc: distinct === 1 ? 'the same word in every row' : 'words' }
}

const fits = (spec: RoleSpec, kind: Kind): boolean => spec.kind === 'any' || (kind !== 'empty' && spec.kind === kind)

/**
 * Guess what each column is for. Every column is scored for every role: the heading (an earlier pattern
 * of `heading` counts more, a pattern that is the whole heading counts a little more) weighs most, then
 * whether the cells are of the kind the role takes, and for a column that no heading points anywhere the
 * place counts (well names are recognised by themselves, `byPlace` takes the first column of words, a
 * `many` role takes the numbers beside its own). Roles are assigned best score first, leftmost column on a
 * tie; a role without `many` goes to one column at most. Columns that no role fits are `ignore`.
 */
export function guessRoles(cells: Cells, specs: RoleSpec[]): RoleGuess {
  const width = Math.max(cells.header?.length ?? 0, ...cells.rows.map((r) => r.length), 0)
  const infos: ColumnInfo[] = []
  for (let j = 0; j < width; j++) infos.push(describeColumn(cells.rows.map((r) => r[j] ?? ''), cells.decimalComma))
  const heading = (j: number): string => (cells.header?.[j] ?? '').trim()

  interface Cand { col: number; spec: number; score: number; byHeading: boolean; mismatch: boolean }
  const cands: Cand[] = []
  for (let j = 0; j < width; j++) {
    const h = heading(j)
    for (let s = 0; s < specs.length; s++) {
      const spec = specs[s]
      let best = -1
      if (h) {
        spec.heading.forEach((re, idx) => {
          const m = new RegExp(re.source, re.flags.replace(/[gy]/g, '')).exec(h)
          if (!m) return
          const score = 10 + (spec.heading.length - idx) + (m[0].length === h.length ? 2 : 0)
          if (score > best) best = score
        })
      }
      const ok = fits(spec, infos[j].kind)
      if (best >= 0) {
        if (infos[j].kind === 'empty') continue
        // A heading may outweigh the cells only where a name is typed as a number ("Sample" 1, 2, 3; "Well" 1 to 96);
        // numbers are never taken from a column of words.
        if (!ok && !((spec.kind === 'words' || spec.kind === 'well') && infos[j].kind === 'number') && !(spec.kind === 'words' && infos[j].kind === 'well')) continue
        cands.push({ col: j, spec: s, score: ok ? best + 3 : best - 4, byHeading: true, mismatch: !ok })
      } else if (spec.kind === 'well' && infos[j].kind === 'well') {
        cands.push({ col: j, spec: s, score: 6, byHeading: false, mismatch: false })
      }
    }
  }
  cands.sort((a, b) => b.score - a.score || a.col - b.col || a.spec - b.spec)

  const roles: string[] = Array<string>(width).fill(IGNORE)
  const why: string[] = Array<string>(width).fill('')
  const taken = new Set<number>()
  const assign = (col: number, s: number, reason: string): void => {
    roles[col] = specs[s].id
    why[col] = reason
    taken.add(s)
  }
  const label = (s: number): string => specs[s].label
  for (const c of cands) {
    if (roles[c.col] !== IGNORE || (taken.has(c.spec) && !specs[c.spec].many)) continue
    const h = heading(c.col)
    assign(
      c.col,
      c.spec,
      c.byHeading
        ? `heading “${h}” points to “${label(c.spec)}”` + (c.mismatch ? `, though the cells are ${infos[c.col].desc}` : `; ${infos[c.col].desc}`)
        : `${infos[c.col].desc} look like “${label(c.spec)}”`,
    )
  }

  // No heading to go by: the first column of words takes a role that asks for its place, and a column of
  // numbers beside a column of a `many` role joins it.
  for (let s = 0; s < specs.length; s++) {
    if (!specs[s].byPlace || taken.has(s)) continue
    const j = roles.findIndex((r, k) => r === IGNORE && infos[k].kind === 'words')
    if (j >= 0) assign(j, s, `first column of words that no heading explains: taken as “${label(s)}”`)
  }
  for (let s = 0; s < specs.length; s++) {
    if (!specs[s].many || !taken.has(s) || specs[s].kind === 'any') continue
    for (let j = 1; j < width; j++) {
      if (roles[j] !== IGNORE || roles[j - 1] !== specs[s].id || !fits(specs[s], infos[j].kind)) continue
      roles[j] = specs[s].id
      why[j] = `${infos[j].desc} next to “${label(s)}”, so another of them`
    }
  }

  for (let j = 0; j < width; j++) {
    if (roles[j] !== IGNORE) continue
    const h = heading(j)
    const lost = h ? cands.find((c) => c.col === j && !c.mismatch) : undefined
    if (infos[j].kind === 'empty') why[j] = 'nothing in this column'
    else if (lost) why[j] = `heading “${h}” looks like “${label(lost.spec)}”, but another column was a better fit`
    else why[j] = `no role fits${h ? ` “${h}”` : ''}; ${infos[j].desc}`
  }
  const missing = specs.filter((s) => s.required && !roles.includes(s.id)).map((s) => s.id)
  return { roles, why, missing }
}

/**
 * Whether text pasted on the page is a table to make a chart from: cells separated by tabs (what
 * every spreadsheet puts on the clipboard) over two or more lines (columns of names are lists for a Venn diagram), or one
 * column of three or more numbers under at most a name. Prose, a list of words, a SMILES or a
 * number on its own is not.
 */
export function isTableText(text: string): boolean {
  if (text.length > 5_000_000) return false
  const lines = text.split(/\r\n|\r|\n/).filter((l) => l.trim() !== '')
  if (lines.length < 2) return false
  const isNumber = (c: string) => cellNumber(c.trim(), false) !== null || cellNumber(c.trim(), true) !== null
  const cells = lines.map((l) => l.split('\t'))
  const tabbed = cells.filter((r) => r.length >= 2).length
  if (tabbed >= Math.max(2, Math.ceil(lines.length * 0.6))) return true
  if (tabbed) return false
  const numbers = lines.filter(isNumber).length
  return numbers >= 3 && numbers >= lines.length - 1
}
