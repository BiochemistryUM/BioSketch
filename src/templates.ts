// Example figures, built from the same parts a user would use. They double as a demo of the format.

import { getIcon } from './icons/library'
import { INK, outlinePoints, textLabel } from './model/build'
import { emptyDoc, uid } from './model/doc'
import type { ConnectorKind, ConnectorNode, FigDoc, FigNode, IconNode, MembraneNode, Point, ShapeNode } from './model/types'

function icon(iconId: string, cx: number, cy: number, scale = 1, extra: Partial<IconNode> = {}): IconNode {
  const [w, h] = getIcon(null, iconId)?.viewBox ?? [80, 80]
  return { id: uid(), type: 'icon', iconId, x: cx - (w * scale) / 2, y: cy - (h * scale) / 2, w: w * scale, h: h * scale, rotation: 0, ...extra }
}

const label = textLabel

/** A rounded box with its name written inside. */
function pill(text: string, cx: number, cy: number, fill: string, stroke: string, w = 120, h = 44): ShapeNode {
  return { id: uid(), type: 'shape', shape: 'roundrect', x: cx - w / 2, y: cy - h / 2, w, h, rotation: 0, fill, stroke, strokeWidth: 2, label: { text, fontSize: 16, fill: INK, bold: true } }
}

function link(from: FigNode, to: FigNode, kind: ConnectorKind = 'arrow', extra: Partial<ConnectorNode> = {}): ConnectorNode {
  return { id: uid(), type: 'connector', from: { x: 0, y: 0, nodeId: from.id }, to: { x: 0, y: 0, nodeId: to.id }, kind, stroke: INK, strokeWidth: 2, ...extra }
}

const outline = outlinePoints

const membrane = (points: Point[], closed: boolean, extra: Partial<MembraneNode> = {}): MembraneNode => ({
  id: uid(),
  type: 'membrane',
  points,
  closed,
  thickness: 24,
  headColor: '#f0a04b',
  tailColor: '#d9b65c',
  ...extra,
})

function signalling(): FigDoc {
  const title = label('Receptor tyrosine kinase signalling', 80, 28, { align: 'left', bold: true, fontSize: 26 })
  const plasma = membrane([{ x: 80, y: 230 }, { x: 1120, y: 230 }], false, { thickness: 26 })
  const nucleus = membrane(outline(840, 560, 210, 150, 16), true, { thickness: 16, headColor: '#9c86d6', tailColor: '#c9bbec', fill: '#f4f0fc' })
  const outside = label('Extracellular space', 1030, 150, { fontSize: 14, fill: '#6b7785', italic: true })
  const inside = label('Cytoplasm', 1060, 280, { fontSize: 14, fill: '#6b7785', italic: true })
  const nucleusLabel = label('Nucleus', 840, 432, { fontSize: 14, fill: '#6b7785', italic: true })

  const ligand = icon('ligand', 430, 100)
  const ligandLabel = label('Growth factor', 520, 90)
  const receptor = icon('receptor-dimer', 430, 232, 1.2)
  const ras = pill('RAS', 430, 380, '#e3f3ef', '#1f8f84')
  const raf = pill('RAF', 430, 460, '#e3f3ef', '#1f8f84')
  const mek = pill('MEK', 430, 540, '#e3f3ef', '#1f8f84')
  const erk = pill('ERK', 430, 620, '#e3f3ef', '#1f8f84')
  const drug = icon('pill', 190, 460, 0.9)
  const drugLabel = label('RAF inhibitor', 190, 492)
  const tf = icon('transcription-factor', 840, 530, 1.1)
  const dna = icon('dna', 840, 600, 1.4)
  const genes = label('Proliferation genes', 840, 648)

  return {
    ...emptyDoc('Receptor signalling (example)'),
    nodes: [
      plasma, nucleus, title, outside, inside, nucleusLabel,
      ligand, ligandLabel, receptor, ras, raf, mek, erk, drug, drugLabel, tf, dna, genes,
      link(ligand, receptor),
      link(receptor, ras),
      link(ras, raf),
      link(raf, mek),
      link(mek, erk),
      link(erk, tf, 'arrow', { dashed: true, label: 'translocation' }),
      link(drug, raf, 'inhibit', { stroke: '#c9403d' }),
    ],
  }
}

function ferroptosis(): FigDoc {
  const cell = membrane(outline(600, 440, 500, 300, 28, 4), true, { thickness: 22, fill: '#fff8f1' })
  const title = label('Ferroptosis', 60, 18, { align: 'left', bold: true, fontSize: 26 })

  const transporter = icon('transporter', 340, 144)
  const transporterLabel = label('System xc⁻', 444, 100, { fontSize: 14 })
  const cystine = pill('Cystine', 340, 44, '#fff3d6', '#d39a1c')
  const cysteine = pill('Cysteine', 340, 270, '#fff3d6', '#d39a1c')
  const gsh = pill('GSH', 340, 360, '#fff3d6', '#d39a1c')
  const gpx4 = pill('GPX4', 340, 450, '#e3f3ef', '#1f8f84')
  const erastin = pill('Erastin', 150, 104, '#fde8e8', '#c9403d', 110)
  const rsl3 = pill('RSL3', 180, 540, '#fde8e8', '#c9403d', 100)

  const iron = icon('iron', 640, 200, 1.1)
  const ros = icon('ros', 640, 332)
  const perox = pill('Lipid peroxidation', 640, 450, '#ffe8d9', '#d9623a', 190, 50)
  const lipid = icon('phospholipid', 640, 590, 0.9)
  const lipidLabel = label('PUFA phospholipids', 760, 590, { fontSize: 14 })
  const death = pill('Ferroptosis', 920, 450, '#f8d0cf', '#c9403d', 140, 50)

  return {
    ...emptyDoc('Ferroptosis (example)'),
    nodes: [
      cell, title,
      transporter, transporterLabel, cystine, cysteine, gsh, gpx4, erastin, rsl3,
      iron, ros, perox, lipid, lipidLabel, death,
      link(cystine, transporter),
      link(transporter, cysteine),
      link(cysteine, gsh),
      link(gsh, gpx4),
      link(gpx4, perox, 'inhibit'),
      link(erastin, transporter, 'inhibit', { stroke: '#c9403d' }),
      link(rsl3, gpx4, 'inhibit', { stroke: '#c9403d' }),
      link(iron, ros, 'arrow', { label: 'Fenton reaction' }),
      link(ros, perox),
      link(lipid, perox),
      link(perox, death),
    ],
  }
}

export interface Template {
  id: string
  name: string
  description: string
  build: () => FigDoc
}

export const TEMPLATES: Template[] = [
  { id: 'signalling', name: 'Receptor signalling', description: 'Membrane, receptor, kinase cascade, nucleus', build: signalling },
  { id: 'ferroptosis', name: 'Ferroptosis pathway', description: 'Cell outline with a metabolic and cell-death pathway', build: ferroptosis },
]
