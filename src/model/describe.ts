// Short names for the objects of a figure, used wherever an object is named in words:
// the objects list, the properties panel and announcements for screen readers.

import type { FigNode } from './types'

const SHAPES = {
  rect: 'Rectangle',
  roundrect: 'Rounded rectangle',
  ellipse: 'Ellipse',
  triangle: 'Triangle',
  diamond: 'Diamond',
  hexagon: 'Hexagon',
  cylinder: 'Cylinder',
  callout: 'Callout',
  bracket: 'Bracket',
} as const
const CHARTS = { bar: 'Bar chart', dot: 'Dot chart', line: 'Line chart', box: 'Box plot', violin: 'Violin plot', scatter: 'Scatter chart', pie: 'Pie chart', heatmap: 'Heat map', venn: 'Venn diagram', standard: 'Standard curve', qpcr: 'qPCR fold change' } as const
const CONNECTORS = { arrow: 'Arrow', inhibit: 'Inhibition arrow', dot: 'Round-ended arrow', line: 'Line', double: 'Double arrow' } as const

/** Text without formatting marks, on one line, shortened to `max` characters. */
function excerpt(text: string, max = 28): string {
  const plain = text
    .replace(/[\^_]\{([^}]*)\}/g, '$1')
    .replace(/\*+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length > max ? `${plain.slice(0, max - 1).trimEnd()}…` : plain
}

/** What kind of object this is, e.g. "Arrow" or "Text". For an icon, the icon's own name when known. */
export function nodeKind(node: FigNode, iconName?: string): string {
  switch (node.type) {
    case 'icon':
      return iconName?.trim() || 'Icon'
    case 'shape':
      return SHAPES[node.shape]
    case 'text':
      return 'Text'
    case 'connector':
      return CONNECTORS[node.kind]
    case 'membrane':
      return node.closed ? 'Closed membrane' : 'Membrane'
    case 'stroke':
      return 'Pen stroke'
    case 'image':
      return 'Picture'
    case 'chart':
      return CHARTS[node.kind]
    case 'table':
      return 'Table'
    case 'structure':
      return 'Protein structure'
  }
}

/**
 * A name a person would recognise the object by: the name they gave it, or else one made from what
 * it is, e.g. `Text “Ca2+ level”` or `Arrow “activates”`.
 */
export function nodeLabel(node: FigNode, iconName?: string): string {
  if (node.name?.trim()) return node.name.trim()
  const kind = nodeKind(node, iconName)
  const words =
    node.type === 'text' ? excerpt(node.text) : node.type === 'connector' && node.label ? excerpt(node.label) : node.type === 'shape' && node.label ? excerpt(node.label.text) : node.type === 'chart' && node.title ? excerpt(node.title) : ''
  return words ? `${kind} “${words}”` : kind
}
