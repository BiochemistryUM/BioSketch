// Example figures, built from the same parts a user would use. They double as a demo of the format.
// Their icons come from the NIH BioArt collections, so an example is ready once those drawings
// have been fetched (buildTemplate); they are then stored in the figure like any placed icon.

import { iconsUsed, type IconLookup } from './ai/scene'
import { loadPack, packOf, type PackInfo } from './icons/packs'
import { INK, outlinePoints, textLabel } from './model/build'
import { emptyDoc, uid } from './model/doc'
import type { ConnectorKind, ConnectorNode, FigDoc, FigNode, IconDef, IconNode, MembraneNode, Point, ShapeNode } from './model/types'

/** An icon of the given height, centred on a point. Without its drawing it is a square of that height. */
function icon(icons: IconLookup, iconId: string, cx: number, cy: number, height: number): IconNode {
  const [vw, vh] = icons(iconId)?.viewBox ?? [1, 1]
  const w = (height * vw) / vh
  return { id: uid(), type: 'icon', iconId, x: cx - w / 2, y: cy - height / 2, w, h: height, rotation: 0 }
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

const RECEPTOR = 'nih-molecules--receptor-protein-10'
const LIGAND = 'nih-molecules--cytokines'
const DRUG = 'nih-lab--pill'
const FACTOR = 'nih-molecules--irf3'
const DNA = 'nih-molecules--dna'
const PORE = 'nih-molecules--protein-pore'

function signalling(icons: IconLookup): FigDoc {
  const title = label('Receptor tyrosine kinase signalling', 80, 28, { align: 'left', bold: true, fontSize: 26 })
  const plasma = membrane([{ x: 80, y: 230 }, { x: 1120, y: 230 }], false, { thickness: 26 })
  const nucleus = membrane(outline(840, 560, 210, 150, 16), true, { thickness: 16, headColor: '#9c86d6', tailColor: '#c9bbec', fill: '#f4f0fc' })
  const outside = label('Extracellular space', 1030, 150, { fontSize: 14, fill: '#6b7785', italic: true })
  const inside = label('Cytoplasm', 1060, 280, { fontSize: 14, fill: '#6b7785', italic: true })
  const nucleusLabel = label('Nucleus', 840, 432, { fontSize: 14, fill: '#6b7785', italic: true })

  const ligand = icon(icons, LIGAND, 430, 96, 64)
  const ligandLabel = label('Growth factor', 540, 86)
  const receptor = icon(icons, RECEPTOR, 430, 226, 150)
  const ras = pill('RAS', 430, 380, '#e3f3ef', '#1f8f84')
  const raf = pill('RAF', 430, 460, '#e3f3ef', '#1f8f84')
  const mek = pill('MEK', 430, 540, '#e3f3ef', '#1f8f84')
  const erk = pill('ERK', 430, 620, '#e3f3ef', '#1f8f84')
  const drug = icon(icons, DRUG, 190, 452, 56)
  const drugLabel = label('RAF inhibitor', 190, 492)
  const tf = icon(icons, FACTOR, 760, 540, 84)
  const tfLabel = label('Transcription factor', 760, 590, { fontSize: 14 })
  const dna = icon(icons, DNA, 930, 560, 120)
  const genes = label('Proliferation genes', 930, 628, { fontSize: 14 })

  return {
    ...emptyDoc('Receptor signalling (example)'),
    nodes: [
      plasma, nucleus, title, outside, inside, nucleusLabel,
      ligand, ligandLabel, receptor, ras, raf, mek, erk, drug, drugLabel, tf, tfLabel, dna, genes,
      link(ligand, receptor),
      link(receptor, ras),
      link(ras, raf),
      link(raf, mek),
      link(mek, erk),
      link(erk, tf, 'arrow', { dashed: true, label: 'translocation' }),
      link(tf, dna),
      link(drug, raf, 'inhibit', { stroke: '#c9403d' }),
    ],
  }
}

function ferroptosis(icons: IconLookup): FigDoc {
  const cell = membrane(outline(600, 440, 500, 300, 28, 4), true, { thickness: 22, fill: '#fff8f1' })
  const title = label('Ferroptosis', 60, 18, { align: 'left', bold: true, fontSize: 26 })

  const transporter = icon(icons, PORE, 340, 144, 96)
  const transporterLabel = label('System xc⁻', 444, 100, { fontSize: 14 })
  const cystine = pill('Cystine', 340, 44, '#fff3d6', '#d39a1c')
  const cysteine = pill('Cysteine', 340, 270, '#fff3d6', '#d39a1c')
  const gsh = pill('GSH', 340, 360, '#fff3d6', '#d39a1c')
  const gpx4 = pill('GPX4', 340, 450, '#e3f3ef', '#1f8f84')
  const erastin = pill('Erastin', 150, 104, '#fde8e8', '#c9403d', 110)
  const rsl3 = pill('RSL3', 180, 540, '#fde8e8', '#c9403d', 100)

  const iron = pill('Fe^{2+}', 640, 210, '#f6dcc8', '#b5561f', 90)
  const ros = pill('ROS', 640, 330, '#ffe1b0', '#e07b1a', 90)
  const perox = pill('Lipid peroxidation', 640, 450, '#ffe8d9', '#d9623a', 190, 50)
  const lipid = pill('PUFA phospholipids', 640, 580, '#fff3d6', '#d39a1c', 200)
  const death = pill('Ferroptosis', 920, 450, '#f8d0cf', '#c9403d', 140, 50)

  return {
    ...emptyDoc('Ferroptosis (example)'),
    nodes: [
      cell, title,
      transporter, transporterLabel, cystine, cysteine, gsh, gpx4, erastin, rsl3,
      iron, ros, perox, lipid, death,
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
  /** The icons the example uses, by their id in the collections. */
  icons: string[]
  /** The figure, given a way to find those drawings. It does not hold the drawings yet: see buildTemplate. */
  build: (icons: IconLookup) => FigDoc
}

export const TEMPLATES: Template[] = [
  { id: 'signalling', name: 'Receptor signalling', description: 'Membrane, receptor, kinase cascade, nucleus', icons: [RECEPTOR, LIGAND, DRUG, FACTOR, DNA], build: signalling },
  { id: 'ferroptosis', name: 'Ferroptosis pathway', description: 'Cell outline with a metabolic and cell-death pathway', icons: [PORE], build: ferroptosis },
]

/**
 * An example as a complete figure: the collections its icons come from are fetched and the
 * drawings stored in the figure. Rejects when a collection cannot be fetched.
 */
export async function buildTemplate(template: Template, packs: PackInfo[], load: (pack: PackInfo) => Promise<IconDef[]> = loadPack): Promise<FigDoc> {
  const needed = new Set(template.icons.map(packOf))
  const found = new Map<string, IconDef>()
  for (const pack of packs.filter((p) => needed.has(p.id))) {
    for (const def of await load(pack)) found.set(def.id, def)
  }
  const missing = template.icons.filter((id) => !found.has(id))
  if (missing.length) throw new Error('The icons of this example could not be loaded. Check the connection and try again.')
  const icons: IconLookup = (id) => found.get(id)
  const doc = template.build(icons)
  return { ...doc, customIcons: { ...doc.customIcons, ...iconsUsed(doc.nodes, icons) } }
}
