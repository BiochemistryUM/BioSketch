// Example figures, built from the same parts a user would use. They double as a demo of the format.
// Their icons come from the NIH BioArt collections, so an example is ready once those drawings
// have been fetched (buildTemplate); they are then stored in the figure like any placed icon.

import { iconsUsed, type IconLookup } from './ai/scene'
import { loadPack, packOf, type PackInfo } from './icons/packs'
import { INK, outlinePoints, textLabel } from './model/build'
import { emptyDoc, uid } from './model/doc'
import { everyNode } from './model/slides'
import type { ConnectorKind, ConnectorNode, FigDoc, FigNode, IconDef, IconNode, MembraneNode, Point, ShapeNode, TextNode } from './model/types'

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

const MOUSE = 'nih-animals--lab-mouse'
const SYRINGE = 'nih-lab--syringe'
const TUBE = 'nih-lab--eppendorf-tube'
const CYTOMETER = 'nih-lab--flow-cytometer'
const LAPTOP = 'nih-lab--laptop-open'
const DISH = 'nih-lab--petri-dish'
const PIPETTE = 'nih-lab--pipette'
const SEQUENCER = 'nih-lab--next-gen-sequencer'

const MUTED = '#5f6c7b'
const TEAL = '#1f8f84'

/** A text box: words that are broken into lines at `width`, with its top left corner at (x, y). */
const textBox = (text: string, x: number, y: number, width: number, fontSize: number, extra: Partial<TextNode> = {}): TextNode => ({ id: uid(), type: 'text', x: Math.round(x), y: Math.round(y), text, fontSize, fill: INK, align: 'left', rotation: 0, width: Math.round(width), ...extra })

const block = (x: number, y: number, w: number, h: number, extra: Partial<ShapeNode> = {}): ShapeNode => ({ id: uid(), type: 'shape', shape: 'rect', x, y, w, h, rotation: 0, fill: '#ffffff', stroke: '#c5cbd3', strokeWidth: 2, ...extra })

const wide = (name: string): FigDoc => ({ ...emptyDoc(name), width: 1280, height: 720 })

/** An experiment over time: a line of days with what happens at each. */
function timeline(icons: IconLookup): FigDoc {
  const y = 420
  const days: [number, string, string, string, number][] = [
    [0, 'Day 0', MOUSE, 'Tumour cells\ninjected', 92],
    [7, 'Day 7', SYRINGE, 'Treatment\nstarts', 84],
    [14, 'Day 14', TUBE, 'Blood\nsample', 84],
    [21, 'Day 21', CYTOMETER, 'Flow\ncytometry', 96],
    [28, 'Day 28', LAPTOP, 'Analysis', 84],
  ]
  const at = (day: number): number => 170 + (day / 28) * 900
  const axis: ConnectorNode = { id: uid(), type: 'connector', from: { x: 110, y }, to: { x: 1180, y }, kind: 'arrow', stroke: INK, strokeWidth: 4 }
  return {
    ...wide('Experimental timeline'),
    nodes: [
      label('Experimental timeline', 80, 44, { align: 'left', bold: true, fontSize: 34 }),
      label('Replace the icons and the words with your own; drag a day along the line to move it.', 80, 96, { align: 'left', fontSize: 18, fill: MUTED }),
      axis,
      ...days.flatMap(([day, name, iconId, what, height]): FigNode[] => [
        icon(icons, iconId, at(day), y - 110, height),
        { id: uid(), type: 'connector', from: { x: at(day), y: y - 16 }, to: { x: at(day), y: y + 16 }, kind: 'line', stroke: INK, strokeWidth: 3 },
        label(name, at(day), y + 28, { bold: true, fontSize: 20 }),
        label(what, at(day), y + 62, { fontSize: 18, fill: MUTED }),
      ]),
    ],
  }
}

/** The steps of a method, from the sample to the result. */
function workflow(icons: IconLookup): FigDoc {
  const steps: [string, string, string, number][] = [
    ['Sample', DISH, 'Cells in culture', 96],
    ['Extraction', TUBE, 'RNA isolated', 96],
    ['Library', PIPETTE, 'Library prepared', 110],
    ['Sequencing', SEQUENCER, 'Reads produced', 110],
    ['Analysis', LAPTOP, 'Differential expression', 96],
  ]
  const at = (i: number): number => 160 + i * 240
  const pills = steps.map(([name], i) => pill(name, at(i), 400, '#e3f3ef', TEAL, 170, 52))
  return {
    ...wide('Workflow'),
    nodes: [
      label('Workflow', 80, 44, { align: 'left', bold: true, fontSize: 34 }),
      label('Each step is an icon, a box and a line of words: change, add or delete steps as you need.', 80, 96, { align: 'left', fontSize: 18, fill: MUTED }),
      ...steps.map(([, iconId, , height], i) => icon(icons, iconId, at(i), 270, height)),
      ...pills,
      ...pills.slice(1).map((p, i) => link(pills[i], p)),
      ...steps.map(([, , what], i) => label(what, at(i), 446, { fontSize: 17, fill: MUTED })),
    ],
  }
}

/** A graphical abstract: the question, the approach and the finding, on a square page. */
function graphicalAbstract(): FigDoc {
  const parts: [string, string, string][] = [
    ['Question', '#eef5ff', 'What was not known, in one sentence.'],
    ['Approach', '#fff6dc', 'What you did: the model, the method, the comparison.'],
    ['Finding', '#e3f3ef', 'What you found, and what it means.'],
  ]
  const frames = parts.map(([, fill], i) => block(60 + i * 372, 230, 336, 620, { shape: 'roundrect', fill, stroke: '#c5cbd3' }))
  return {
    ...emptyDoc('Graphical abstract'),
    width: 1200,
    height: 1200,
    nodes: [
      textBox('The title of the paper, as short as it can be', 60, 60, 1080, 46, { bold: true }),
      textBox('Put one picture in each panel (icons from the library, a chart, a drawing) and a few words under it.', 60, 150, 1080, 22, { fill: MUTED }),
      ...frames,
      ...parts.flatMap(([name, , words], i): FigNode[] => [
        textBox(name, 84 + i * 372, 254, 288, 30, { bold: true }),
        textBox(words, 84 + i * 372, 720, 288, 22, { fill: MUTED }),
      ]),
      link(frames[0], frames[1], 'arrow', { strokeWidth: 5 }),
      link(frames[1], frames[2], 'arrow', { strokeWidth: 5 }),
      block(60, 900, 1080, 220, { shape: 'roundrect', fill: '#1f2933', stroke: '#1f2933' }),
      textBox('The one sentence a reader should take away.', 100, 960, 1000, 40, { bold: true, fill: '#ffffff' }),
    ],
  }
}

/**
 * A poster with a banner for the title and columns of sections. The page is sized in quarter
 * millimetres with its printed width set, so the PDF comes out at the size of the paper, and the
 * lettering is large enough to read from two metres: the title about 110 points, headings about 60,
 * the text about 32.
 */
function poster(name: string, mmWide: number, mmHigh: number, columns: number): FigDoc {
  const [W, H] = [mmWide * 4, mmHigh * 4]
  const margin = 120
  const gap = 90
  const banner = 560
  const colW = (W - 2 * margin - (columns - 1) * gap) / columns
  const top = banner + 110
  const bottom = H - margin
  const body = 'Write your text here, or delete this box and put a figure in its place. Double-tap to type.'
  // The sections, column by column: each takes a share of the height of its column.
  const plan: [string, number][][] =
    columns === 3
      ? [[['Introduction', 0.4], ['Methods', 0.6]], [['Results', 1]], [['Conclusions', 0.45], ['References', 0.3], ['Acknowledgements', 0.25]]]
      : [[['Introduction', 0.45], ['Methods', 0.55]], [['Results', 1]], [['Results, continued', 1]], [['Conclusions', 0.45], ['References', 0.3], ['Acknowledgements', 0.25]]]
  const nodes: FigNode[] = [
    block(0, 0, W, banner, { fill: '#1f3a5f', stroke: '#1f3a5f', strokeWidth: 0, locked: true }),
    textBox('The title of your poster', margin, 110, W - 2 * margin, 155, { bold: true, fill: '#ffffff' }),
    textBox('First Author, Second Author, Last Author  ·  Department, University  ·  contact@example.org', margin, 360, W - 2 * margin, 62, { fill: '#dfe7f1' }),
  ]
  plan.forEach((sections, c) => {
    const x = margin + c * (colW + gap)
    let y = top
    for (const [title, share] of sections) {
      const h = (bottom - top) * share - (share < 1 ? gap / 2 : 0)
      // The frame shows on the page to line things up in, and is left out of the exported poster.
      nodes.push({ ...block(Math.round(x), Math.round(y), Math.round(colW), Math.round(h), { fill: '#ffffff', stroke: '#9aa3ad', strokeWidth: 3, dashed: true }), guide: true, locked: true })
      nodes.push(textBox(title, x + 40, y + 36, colW - 80, 85, { bold: true, fill: '#1f3a5f' }))
      nodes.push(textBox(body, x + 40, y + 180, colW - 80, 45, title === 'Conclusions' ? { bullets: true } : {}))
      y += h + gap
    }
  })
  return { ...emptyDoc(name), width: W, height: H, widthMm: mmWide, background: '#ffffff', nodes }
}

export interface Template {
  id: string
  name: string
  description: string
  /** What kind of start it is, for the list it is chosen from. Absent = an example figure. */
  group?: 'Templates' | 'Posters'
  /** The icons the example uses, by their id in the collections. */
  icons: string[]
  /** The figure, given a way to find those drawings. It does not hold the drawings yet: see buildTemplate. */
  build: (icons: IconLookup) => FigDoc
}

export const TEMPLATES: Template[] = [
  { id: 'signalling', name: 'Receptor signalling', description: 'Membrane, receptor, kinase cascade, nucleus', icons: [RECEPTOR, LIGAND, DRUG, FACTOR, DNA], build: signalling },
  { id: 'ferroptosis', name: 'Ferroptosis pathway', description: 'Cell outline with a metabolic and cell-death pathway', icons: [PORE], build: ferroptosis },
  { id: 'timeline', group: 'Templates', name: 'Experimental timeline', description: 'A line of days with an icon and a few words at each', icons: [MOUSE, SYRINGE, TUBE, CYTOMETER, LAPTOP], build: timeline },
  { id: 'workflow', group: 'Templates', name: 'Workflow', description: 'The steps of a method in a row, from the sample to the result', icons: [DISH, TUBE, PIPETTE, SEQUENCER, LAPTOP], build: workflow },
  { id: 'abstract', group: 'Templates', name: 'Graphical abstract', description: 'Question, approach and finding on a square page, with the sentence to take away', icons: [], build: graphicalAbstract },
  { id: 'poster-portrait', group: 'Posters', name: 'Poster, A0 upright', description: '841 × 1189 mm, three columns: a banner for the title and framed sections', icons: [], build: () => poster('Poster', 841, 1189, 3) },
  { id: 'poster-landscape', group: 'Posters', name: 'Poster, A0 on its side', description: '1189 × 841 mm, four columns: a banner for the title and framed sections', icons: [], build: () => poster('Poster', 1189, 841, 4) },
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
  // An example can have several slides (the tour): the icons of all of them are stored.
  return { ...doc, customIcons: { ...doc.customIcons, ...iconsUsed(everyNode(doc), icons) } }
}
