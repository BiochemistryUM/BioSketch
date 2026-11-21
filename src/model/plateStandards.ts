// A standard curve read from a plate reader's grid (the 8 × 12 or 16 × 24 table most readers
// export, read by `readPlates`): the scientist says where the standards are (columns or rows, the
// top concentration and the dilution step, the last one a blank or not) and how many wells each
// sample has side by side; every other well with a number is a sample. Single wells can then be
// made a blank or left out (a bubble, a scratch) by pressing them on the picture of the plate. The
// result is the same table of standards and samples a pasted list gives (`StandardTable`), so the
// fit, the chart and the report are those of any standard curve. Pure.

import { PLATE_DIMS, plateSizeOf, wellPlace, type PlateEntry } from './plate'
import type { StandardTable } from './standardTable'
import type { PlateWell } from './tableRoles'

export interface PlatePlan {
  /** Standards run down columns (A to H in each) or along rows (1 to 12 in each). */
  along: 'columns' | 'rows'
  /** The columns (1, 2, …) or rows (A, B, … as 1, 2, …) that hold the standards; each is a replicate of the others. */
  lanes: number[]
  /** The concentration of the first standard, and the factor each next one is diluted by. */
  top: number
  factor: number
  /** How many standards each lane holds (from its start); the rest of the lane holds samples. */
  count: number
  /** The last standard of each lane is a blank (concentration 0) instead of one more dilution. */
  blankLast: boolean
  /** Wells side by side in a row that are one sample. */
  replicates: number
}

/** What a single well was changed to by a press, over what the plan makes it. */
export type WellOverride = 'blank' | 'out'
export type PlateOverrides = Record<string, WellOverride>

export type WellRole = { role: 'standard'; conc: number; index: number } | { role: 'blank' } | { role: 'sample'; name: string } | { role: 'out' }

/** A plan that fits most plates: duplicates of standards down columns 1 and 2, halving, the last a blank, samples in duplicate. */
export function defaultPlan(size: 96 | 384 = 96): PlatePlan {
  return { along: 'columns', lanes: [1, 2], top: 2000, factor: 2, count: PLATE_DIMS[size].rows, blankLast: true, replicates: 2 }
}

/** Read "1-2", "1, 3, 5" or "A-B" as lane numbers (from 1), within the plate; null when nothing usable is written. */
export function readLanes(text: string, along: PlatePlan['along'], size: 96 | 384 = 96): number[] | null {
  const most = along === 'columns' ? PLATE_DIMS[size].cols : PLATE_DIMS[size].rows
  const one = (t: string): number | null => {
    const s = t.trim().toUpperCase()
    const n = /^[A-P]$/.test(s) ? s.charCodeAt(0) - 64 : /^\d{1,2}$/.test(s) ? Number(s) : NaN
    return n >= 1 && n <= most ? n : null
  }
  const out = new Set<number>()
  for (const part of text.split(/[,;\s]+/).filter(Boolean)) {
    const range = part.split(/[-–]/)
    if (range.length === 2) {
      const [a, b] = range.map(one)
      if (a === null || b === null) return null
      for (let n = Math.min(a, b); n <= Math.max(a, b); n++) out.add(n)
    } else {
      const n = one(part)
      if (n === null) return null
      out.add(n)
    }
  }
  return out.size ? [...out].sort((a, b) => a - b) : null
}

/** The lanes written back: "1-2", "A, C". */
export function lanesText(lanes: number[], along: PlatePlan['along']): string {
  const name = (n: number) => (along === 'columns' ? String(n) : String.fromCharCode(64 + n))
  const runs: string[] = []
  for (let i = 0; i < lanes.length; i++) {
    let j = i
    while (j + 1 < lanes.length && lanes[j + 1] === lanes[j] + 1) j++
    runs.push(j > i ? `${name(lanes[i])}-${name(lanes[j])}` : name(lanes[i]))
    i = j
  }
  return runs.join(', ')
}

const conc = (plan: PlatePlan, i: number): number => Number((plan.top / plan.factor ** i).toPrecision(6))

/** What every well of the plate holds under the plan and the presses. */
export function wellRoles(wells: PlateWell[], plan: PlatePlan, overrides: PlateOverrides = {}): Map<string, WellRole> {
  const roles = new Map<string, WellRole>()
  const count = Math.max(1, Math.round(plan.count))
  // The standards: position i along each lane.
  for (const w of wells) {
    const p = wellPlace(w.well)
    if (!p) continue
    const [lane, at] = plan.along === 'columns' ? [p.col + 1, p.row] : [p.row + 1, p.col]
    if (!plan.lanes.includes(lane) || at >= count) continue
    if (plan.blankLast && at === count - 1) roles.set(w.well, { role: 'blank' })
    else roles.set(w.well, { role: 'standard', conc: conc(plan, at), index: at })
  }
  // The samples: every other well with a number, row by row, `replicates` side by side.
  let n = 0
  const byRow = new Map<number, { col: number; well: string }[]>()
  for (const w of wells) {
    const p = wellPlace(w.well)
    if (!p || roles.has(w.well) || w.value === null) continue
    if (!byRow.has(p.row)) byRow.set(p.row, [])
    byRow.get(p.row)!.push({ col: p.col, well: w.well })
  }
  const reps = Math.max(1, Math.round(plan.replicates))
  for (const row of [...byRow.keys()].sort((a, b) => a - b)) {
    const line = byRow.get(row)!.sort((a, b) => a.col - b.col)
    for (let i = 0; i < line.length; ) {
      // A sample is up to `replicates` wells that follow each other without a gap.
      const run = [line[i]]
      while (run.length < reps && line[i + run.length] && line[i + run.length].col === run[run.length - 1].col + 1) run.push(line[i + run.length])
      const name = `S${++n}`
      for (const w of run) roles.set(w.well, { role: 'sample', name })
      i += run.length
    }
  }
  for (const [well, o] of Object.entries(overrides)) if (roles.has(well) || wells.some((w) => w.well === well)) roles.set(well, o === 'blank' ? { role: 'blank' } : { role: 'out' })
  return roles
}

/** The standards and samples of the plate, as a pasted table would give them. */
export function plateTable(wells: PlateWell[], plan: PlatePlan, overrides: PlateOverrides = {}): StandardTable {
  const roles = wellRoles(wells, plan, overrides)
  const standards = new Map<number, { name: string; conc: number; values: number[] }>()
  const samples = new Map<string, { name: string; values: number[] }>()
  const unread: string[] = []
  for (const w of wells) {
    const role = roles.get(w.well)
    if (!role || role.role === 'out') continue
    if (w.value === null) {
      if (w.text) unread.push(w.well)
      continue
    }
    if (role.role === 'sample') {
      if (!samples.has(role.name)) samples.set(role.name, { name: role.name, values: [] })
      samples.get(role.name)!.values.push(w.value)
      continue
    }
    const c = role.role === 'blank' ? 0 : role.conc
    if (!standards.has(c)) standards.set(c, { name: role.role === 'blank' ? 'Blank' : `Std ${role.index + 1}`, conc: c, values: [] })
    standards.get(c)!.values.push(w.value)
  }
  return { standards: [...standards.values()].sort((a, b) => b.conc - a.conc), samples: [...samples.values()], unread }
}

const ROLE_KEY = { standard: 'Standard', blank: 'Blank', sample: 'Sample', out: 'Left out' } as const

/** The wells for the picture of the plate: coloured by what they hold, replicates ringed together when one is pressed. */
export function plateLayoutEntries(wells: PlateWell[], plan: PlatePlan, overrides: PlateOverrides = {}): PlateEntry[] {
  const roles = wellRoles(wells, plan, overrides)
  const entries: PlateEntry[] = []
  for (const w of wells) {
    const role = roles.get(w.well)
    if (!role) continue
    const signal = w.value === null ? 'no number' : `signal ${w.text}`
    const text = w.value === null ? undefined : w.text.length <= 5 ? w.text : String(Number(w.value.toPrecision(3)))
    if (role.role === 'standard') entries.push({ well: w.well, key: ROLE_KEY.standard, text, detail: `Standard ${role.index + 1}, concentration ${role.conc}, ${signal}`, set: `std ${role.conc}` })
    else if (role.role === 'blank') entries.push({ well: w.well, key: ROLE_KEY.blank, text, detail: `Blank, ${signal}`, set: 'blank' })
    else if (role.role === 'sample') entries.push({ well: w.well, key: ROLE_KEY.sample, text, detail: `Sample ${role.name}, ${signal}`, set: role.name })
    else entries.push({ well: w.well, key: ROLE_KEY.out, text, detail: `Left out, ${signal}`, flag: 'left out of the curve and the samples' })
  }
  return entries
}

/** The plate size of a grid. */
export const gridSize = (wells: PlateWell[]): 96 | 384 => plateSizeOf(wells.map((w) => w.well))
