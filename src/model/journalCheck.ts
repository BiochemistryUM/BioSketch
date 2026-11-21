// The check before a figure goes to a journal: at the printed width the scientist set, the smallest
// lettering in points, the thinnest line in points, and the resolution of every placed picture in
// dots per inch, each against what journals commonly ask (text at least 5 to 7 pt, lines at least
// 0.25 pt, photographs at least 300 dpi). It takes every slide, leaves out hidden objects and the
// guides that are never exported, and says which objects are concerned. Pure: the pixel size of
// each picture is read by the caller (from the file) and passed in.

import { CHART_FONT } from './chart'
import { ARROW_LABEL_SIZE } from './nodes'
import { TABLE_FONT } from './table'
import type { FigDoc, FigNode } from './types'
import { everyNode } from './slides'

export interface CheckItem {
  /** `problem`: likely to be refused or to print badly; `warn`: worth a look; `ok`: fine; `info`: nothing could be checked. */
  level: 'problem' | 'warn' | 'ok' | 'info'
  /** What was measured, in words, with what to do about it. */
  text: string
  /** The objects concerned (the smallest text, the thinnest line, the pictures below the mark). */
  ids?: string[]
}

const PT_PER_MM = 72 / 25.4

/** The lettering of an object, in figure units: every size it draws text at. */
function textSizes(n: FigNode): number[] {
  switch (n.type) {
    case 'text':
      return n.text.trim() ? [n.fontSize] : []
    case 'shape':
      return n.label?.text.trim() ? [n.label.fontSize] : []
    case 'connector':
      return n.label?.trim() ? [ARROW_LABEL_SIZE] : []
    case 'chart':
      return [n.fontSize ?? CHART_FONT]
    case 'table':
      return [n.fontSize ?? TABLE_FONT]
    default:
      return []
  }
}

/** The width of an object's lines, in figure units; none when it draws no line. */
function lineWidths(n: FigNode): number[] {
  switch (n.type) {
    case 'shape':
      return n.stroke !== 'none' && n.strokeWidth > 0 ? [n.strokeWidth] : []
    case 'connector':
      return n.strokeWidth > 0 ? [n.strokeWidth] : []
    case 'stroke':
      return [n.size]
    default:
      return []
  }
}

const one = (v: number): string => String(Math.round(v * 10) / 10)
const two = (v: number): string => String(Math.round(v * 100) / 100)

/**
 * The check of a figure. `pixels` gives the width in pixels of each placed picture's file, by the
 * picture's id; a picture missing from it is not judged.
 */
export function journalCheck(doc: FigDoc, pixels: Record<string, number>): CheckItem[] {
  const mmPerUnit = doc.widthMm && doc.width > 0 ? doc.widthMm / doc.width : null
  if (!mmPerUnit) return [{ level: 'info', text: 'No printed width is set, so sizes in points and resolutions cannot be checked. Set the width the figure will be printed at under Page in the right-hand panel (with nothing selected): 89 mm is one column in most journals, 183 mm two.' }]
  const pt = (units: number): number => units * mmPerUnit * PT_PER_MM
  const nodes = everyNode(doc).filter((n) => !n.hidden && !n.guide)
  const items: CheckItem[] = []

  const texts = nodes.flatMap((n) => textSizes(n).map((size) => ({ id: n.id, size: pt(size) })))
  if (texts.length) {
    const smallest = Math.min(...texts.map((t) => t.size))
    const ids = [...new Set(texts.filter((t) => t.size < Math.max(smallest + 0.05, 5)).map((t) => t.id))]
    if (smallest < 5) items.push({ level: 'problem', ids, text: `The smallest text is ${one(smallest)} pt in print: below 5 pt, which most journals do not accept (many ask for 6 to 8 pt). Make ${ids.length === 1 ? 'it' : 'these'} larger, or the figure wider.` })
    else if (smallest < 6) items.push({ level: 'warn', ids, text: `The smallest text is ${one(smallest)} pt in print: accepted by most journals, but some ask for at least 6 or 7 pt.` })
    else items.push({ level: 'ok', text: `The smallest text is ${one(smallest)} pt in print.` })
  }

  const lines = nodes.flatMap((n) => lineWidths(n).map((width) => ({ id: n.id, width: pt(width) })))
  if (lines.length) {
    const thinnest = Math.min(...lines.map((l) => l.width))
    const ids = [...new Set(lines.filter((l) => l.width < 0.25).map((l) => l.id))]
    if (thinnest < 0.25) items.push({ level: 'problem', ids, text: `The thinnest line is ${two(thinnest)} pt in print: lines below 0.25 pt can vanish when printed. ${ids.length === 1 ? 'One object has' : `${ids.length} objects have`} such lines.` })
    else items.push({ level: 'ok', text: `The thinnest line is ${two(thinnest)} pt in print.` })
  }

  const pictures = nodes.filter((n) => n.type === 'image')
  const judged = pictures.flatMap((n) => {
    const px = pixels[n.id]
    if (n.type !== 'image' || !px) return []
    const inches = (n.w * mmPerUnit) / 25.4
    return [{ id: n.id, dpi: (px * (n.crop?.w ?? 1)) / inches }]
  })
  if (judged.length) {
    const low = judged.filter((p) => p.dpi < 300)
    const lowest = Math.min(...judged.map((p) => p.dpi))
    if (low.length)
      items.push({
        level: lowest < 150 ? 'problem' : 'warn',
        ids: low.map((p) => p.id),
        text: `${low.length === 1 ? 'A placed picture has' : `${low.length} placed pictures have`} ${low.length === 1 ? '' : 'as little as '}${Math.round(lowest)} dots per inch at its printed size. Journals ask for at least 300 for photographs, blots and micrographs: place a larger file, or print ${low.length === 1 ? 'it' : 'them'} smaller.`,
      })
    else items.push({ level: 'ok', text: `Every placed picture has at least ${Math.round(lowest)} dots per inch at its printed size.` })
  }
  if (pictures.length > judged.length) items.push({ level: 'info', text: 'The resolution of some pictures could not be read yet.' })
  return items
}
