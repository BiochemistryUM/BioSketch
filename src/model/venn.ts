// A Venn diagram of two or three sets: how many members each region holds. The sets come from the
// chart's table in one of two forms.
//  - Lists: every column is one set and holds the names of its members (genes, proteins, samples).
//    BioSketch counts what the sets share. Names are compared without regard to capitals.
//  - Sizes: one row of numbers. A column named after one set holds the size of that whole set; a
//    column named after two or three sets joined by "&" holds the size of what they share.
// The circles are placed in chart.ts.

import type { ChartGroup } from './types'

/** A Venn diagram is drawn for at most this many sets. */
export const VENN_SETS = 3

export interface VennSet {
  name: string
  /** Its place in the chart's table. */
  group: number
  /** How many members the whole set has. */
  total: number
}

export interface VennRegion {
  /** The sets (places in `sets`) whose members these are: in all of them and in no other set. */
  sets: number[]
  count: number
  /** The members, as first written, when the sets were given as lists. */
  names: string[]
}

export interface VennData {
  sets: VennSet[]
  /** Every region of the diagram, also the empty ones: first those of one set, then of two, then of all three. */
  regions: VennRegion[]
  /** True when the sets were given as lists of names. */
  lists: boolean
  /** All members of all sets together, each counted once. */
  union: number
  notes: string[]
  /** Why nothing can be drawn; '' when the diagram is fine. */
  problem: string
}

/** The sets a name with "&" (or "∩") joins: "A & B" gives ["A", "B"]; a name without one gives itself. */
export const vennParts = (name: string): string[] =>
  name
    .split(/\s*[&∩]\s*/)
    .map((part) => part.trim())
    .filter(Boolean)

/** The name of a column that holds what these sets share. */
export const vennJoin = (names: string[]): string => names.join(' & ')

const same = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase()

/** Every way of choosing one or more of `n` sets: first single sets, then pairs, then all three. */
const choices = (n: number): number[][] => {
  const out: number[][] = []
  for (let mask = 1; mask < 1 << n; mask++) out.push(Array.from({ length: n }, (_, i) => i).filter((i) => mask & (1 << i)))
  return out.sort((a, b) => a.length - b.length)
}

const known = new WeakMap<ChartGroup[], VennData>()

/** The Venn diagram of a chart's table; worked out once per table. */
export function vennOf(groups: ChartGroup[]): VennData {
  const done = known.get(groups)
  if (done) return done
  const out = work(groups)
  known.set(groups, out)
  return out
}

function work(groups: ChartGroup[]): VennData {
  const drawn = groups.map((group, index) => ({ group, index })).filter((c) => c.group.values.length)
  const notes: string[] = []
  const empty: VennData = { sets: [], regions: [], lists: false, union: 0, notes, problem: '' }
  const lists = drawn.some((c) => c.group.labels?.some(Boolean))
  if (lists) {
    const withNames = drawn.filter((c) => c.group.labels?.some(Boolean))
    if (withNames.length > VENN_SETS) notes.push(`A Venn diagram is drawn for two or three sets: the first ${VENN_SETS} of the ${withNames.length} columns are used.`)
    const used = withNames.slice(0, VENN_SETS)
    // Every member once per set, under the spelling it has first.
    const spelled = new Map<string, string>()
    const members = used.map((c) => {
      const set = new Set<string>()
      for (const raw of c.group.labels ?? []) {
        const name = raw.trim()
        if (!name) continue
        const key = name.toLowerCase()
        if (!spelled.has(key)) spelled.set(key, name)
        set.add(key)
      }
      return set
    })
    const sets = used.map((c, i) => ({ name: c.group.name, group: c.index, total: members[i].size }))
    const regions = choices(sets.length).map((inSets) => ({ sets: inSets, count: 0, names: [] as string[] }))
    const place = new Map(regions.map((r, i) => [r.sets.join(','), i]))
    for (const [key, name] of spelled) {
      const inSets = members.flatMap((set, i) => (set.has(key) ? [i] : []))
      const region = regions[place.get(inSets.join(','))!]
      region.count++
      region.names.push(name)
    }
    return { sets, regions, lists: true, union: spelled.size, notes, problem: '' }
  }

  // Sizes: columns named after one set, and columns named after what several share.
  const single = drawn.filter((c) => vennParts(c.group.name).length === 1)
  const joined = drawn.filter((c) => vennParts(c.group.name).length > 1)
  if (!single.length) return empty
  if (single.length > VENN_SETS) notes.push(`A Venn diagram is drawn for two or three sets: the first ${VENN_SETS} of the ${single.length} are used.`)
  const used = single.slice(0, VENN_SETS)
  const sets = used.map((c) => ({ name: c.group.name, group: c.index, total: c.group.values[0] }))
  if (sets.some((s) => !(s.total >= 0))) return { ...empty, sets, problem: 'The size of a set cannot be below zero.' }
  // What each choice of sets shares, as given: a missing column means they share nothing.
  const shared = new Map<string, number>()
  for (const c of joined) {
    const parts = vennParts(c.group.name)
    const inSets = parts.map((part) => sets.findIndex((s) => same(s.name, part)))
    if (inSets.some((i) => i < 0) || new Set(inSets).size !== inSets.length) {
      // A column about a set that is not drawn (a fourth one) is passed over without a word; any other is a slip worth telling.
      if (!parts.every((part) => single.some((s) => same(s.group.name, part)))) notes.push(`The column “${c.group.name}” names a set the table does not have, and is left out.`)
      continue
    }
    shared.set([...inSets].sort((a, b) => a - b).join(','), c.group.values[0])
  }
  const sharedBy = (inSets: number[]): number => (inSets.length === 1 ? sets[inSets[0]].total : (shared.get(inSets.join(',')) ?? 0))
  // The members of exactly these sets: what they share, less what they also share with each further set, and so on.
  const all = sets.map((_, i) => i)
  const regions = choices(sets.length).map((inSets) => {
    const others = all.filter((i) => !inSets.includes(i))
    let count = 0
    for (const extra of [[], ...choices(others.length).map((pick) => pick.map((k) => others[k]))]) {
      count += (extra.length % 2 ? -1 : 1) * sharedBy([...inSets, ...extra].sort((a, b) => a - b))
    }
    return { sets: inSets, count, names: [] as string[] }
  })
  if (regions.some((r) => r.count < -1e-9 || !Number.isFinite(r.count))) {
    return { ...empty, sets, problem: 'These sizes do not fit together: a part of the diagram would hold fewer than nothing. Give every set with its whole size, and every overlap (named like “A & B”) with the size of what the sets share.' }
  }
  for (const r of regions) r.count = Math.max(0, r.count)
  return { sets, regions, lists: false, union: regions.reduce((a, r) => a + r.count, 0), notes, problem: '' }
}

/** A region in words: "Only A", "A and B" (of two sets), "A and B, not C", "A, B and C". */
export function regionName(data: VennData, region: VennRegion): string {
  const names = region.sets.map((i) => data.sets[i].name)
  const others = data.sets.filter((_, i) => !region.sets.includes(i)).map((s) => s.name)
  if (names.length === 1) return others.length ? `Only ${names[0]}` : names[0]
  const listed = `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
  return others.length ? `${listed}, not ${others.join(' or ')}` : listed
}

/**
 * The table's groups with one set under another name. In a table of sizes the columns that say
 * what it shares with others are named after it, so they follow.
 */
export function renameVennSet(groups: ChartGroup[], set: number, name: string): ChartGroup[] {
  const data = vennOf(groups)
  const old = data.sets[set]
  if (!old) return groups
  return groups.map((g, k) => {
    if (k === old.group) return { ...g, name }
    const parts = vennParts(g.name)
    return !data.lists && parts.length > 1 && parts.some((part) => same(part, old.name)) ? { ...g, name: vennJoin(parts.map((part) => (same(part, old.name) ? name : part))) } : g
  })
}
