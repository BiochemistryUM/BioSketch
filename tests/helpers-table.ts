import type { TableNode } from '../src/model/types'

/** A table in a few words, for test messages. */
export const describeTable = (t: TableNode): string => `${t.cells.length} rows, ${Math.max(0, ...t.cells.map((r) => r.length))} columns`
