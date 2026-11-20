// A reaction scheme built from ordinary objects: every substrate and product a rounded box with its
// name inside, "+" between them, one arrow (two heads when it runs both ways) with the enzyme
// written on it, and a cofactor going in and coming out on a curved arrow under it. Everything is
// in one group and can be changed afterwards like anything else on the page.

import { measureText } from './nodes'
import type { ConnectorNode, FigNode, ShapeNode, TextNode } from './types'

export interface Reaction {
  substrates: string[]
  products: string[]
  enzyme?: string
  /** What goes in and what comes out beside the main reaction: ATP and ADP, NAD⁺ and NADH. */
  cofactorIn?: string
  cofactorOut?: string
  reversible?: boolean
}

const INK = '#1f2933'
const BOX_FILL = '#eef1fb'
const BOX_STROKE = '#4a4fb5'
const FONT = 16
const BOX_H = 40
const ARROW = 170

/**
 * Names typed in one box, separated by a "+" with spaces round it, or by commas: "Glucose + ATP".
 * A "+" inside a name is its charge ("NAD+", "Ca2+") and is raised; one already written as a
 * mark ("NAD^{+}") is left as it is.
 */
export const splitSpecies = (text: string): string[] =>
  text
    .split(/\s+\+\s+|\s*[,;\n]\s*/)
    .map((s) => s.replace(/\s+/g, ' ').trim().slice(0, 60))
    .filter(Boolean)
    .map((s) => s.replace(/([A-Za-z)\]])(\d?\+)$/, '$1^{$2}'))
    .slice(0, 6)

const labelWidth = (text: string): number => measureText({ id: '', type: 'text', x: 0, y: 0, text, fontSize: FONT, fill: INK, align: 'left', rotation: 0 }).w

/** The objects of a reaction scheme, from (0, 0), with counted ids (`rx-1`…) for the caller to replace. */
export function reactionNodes(r: Reaction): FigNode[] {
  let n = 0
  const id = () => `rx-${++n}`
  const groupId = 'rx-group'
  const nodes: FigNode[] = []
  const y = 60
  let x = 0
  const species = (names: string[]): ShapeNode[] =>
    names.map((name, i) => {
      if (i > 0) {
        nodes.push({ id: id(), type: 'text', x: x + 2, y: y + BOX_H / 2 - FONT * 0.65, text: '+', fontSize: FONT + 2, fill: INK, align: 'left', rotation: 0, groupId } satisfies TextNode)
        x += 22
      }
      const w = Math.round(Math.max(70, labelWidth(name) + 28))
      const box: ShapeNode = {
        id: id(),
        type: 'shape',
        shape: 'roundrect',
        x,
        y,
        w,
        h: BOX_H,
        rotation: 0,
        fill: BOX_FILL,
        stroke: BOX_STROKE,
        strokeWidth: 1.5,
        label: { text: name, fontSize: FONT, fill: INK },
        groupId,
      }
      nodes.push(box)
      x += w + 6
      return box
    })
  const left = species(r.substrates.length ? r.substrates : ['Substrate'])
  x += ARROW
  const right = species(r.products.length ? r.products : ['Product'])
  const from = left[left.length - 1]
  const to = right[0]
  const arrow: ConnectorNode = {
    id: id(),
    type: 'connector',
    from: { x: from.x + from.w, y: y + BOX_H / 2, nodeId: from.id },
    to: { x: to.x, y: y + BOX_H / 2, nodeId: to.id },
    kind: r.reversible ? 'double' : 'arrow',
    stroke: INK,
    strokeWidth: 2,
    groupId,
  }
  if (r.enzyme?.trim()) arrow.label = r.enzyme.trim().slice(0, 60)
  nodes.push(arrow)
  // The cofactor: its two names under the arrow, joined by a curve that bows up towards the arrow.
  const start = from.x + from.w
  const end = to.x
  const cin = r.cofactorIn?.trim()
  const cout = r.cofactorOut?.trim()
  if (cin || cout) {
    const ty = y + BOX_H + 16
    const a: TextNode = { id: id(), type: 'text', x: start + (end - start) * 0.18, y: ty, text: (cin || ' ').slice(0, 40), fontSize: FONT - 2, fill: INK, align: 'center', rotation: 0, groupId }
    const b: TextNode = { id: id(), type: 'text', x: start + (end - start) * 0.82, y: ty, text: (cout || ' ').slice(0, 40), fontSize: FONT - 2, fill: INK, align: 'center', rotation: 0, groupId }
    nodes.push(a, b)
    nodes.push({
      id: id(),
      type: 'connector',
      from: { x: a.x, y: ty, nodeId: a.id },
      to: { x: b.x, y: ty, nodeId: b.id },
      bend: { x: 0, y: -36 },
      kind: 'arrow',
      stroke: INK,
      strokeWidth: 1.5,
      groupId,
    } satisfies ConnectorNode)
  }
  return nodes
}

export const EXAMPLE_REACTION: Reaction = { substrates: ['Glucose'], products: ['Glucose 6-phosphate'], enzyme: 'Hexokinase', cofactorIn: 'ATP', cofactorOut: 'ADP' }
