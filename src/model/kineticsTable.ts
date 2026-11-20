// The table of enzyme kinetics is a scatter table: substrate concentrations in the first column,
// rates beside them, one column per series. For an inhibition model every column is one inhibitor
// concentration, written in its heading: "0", "5 µM", "I = 10", "2,5 nM". A heading that says there
// is no inhibitor ("Control", "No inhibitor", "Vehicle", "None") counts as 0.

import type { ChartNode } from './types'

const NONE = /^\s*(no inhibitor|none|control|ctrl|vehicle|untreated|dmso|buffer|−|-)\s*$/i

/** The inhibitor concentration a series' name gives: its first number, or 0 for a name that says there is none; null otherwise. */
export function inhibitorOf(name: string): number | null {
  if (NONE.test(name)) return 0
  const m = name.replace(/(\d),(\d)/g, '$1.$2').match(/(?:^|[^\d.A-Za-z])(\d+(?:\.\d+)?(?:e[-+]?\d+)?)|^(\d+(?:\.\d+)?)/i)
  const text = m?.[1] ?? m?.[2]
  if (!text) return null
  const v = Number(text)
  return Number.isFinite(v) && v >= 0 && v < 1e12 ? v : null
}

export interface KineticsColumn {
  name: string
  inhibitor: number | null
  s: number[]
  v: number[]
}

/** The series of a kinetics chart, as columns of substrate concentrations and rates, in the order of the table. */
export function kineticsColumns(node: Pick<ChartNode, 'groups'>): KineticsColumn[] {
  return node.groups.map((g) => {
    const s: number[] = []
    const v: number[] = []
    g.values.forEach((value, k) => {
      const x = g.xs?.[k]
      if (x === undefined) return
      s.push(x)
      v.push(value)
    })
    return { name: g.name, inhibitor: inhibitorOf(g.name), s, v }
  })
}
