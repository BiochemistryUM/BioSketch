// Microbes, viruses and tissue structures. Drawn for BioSketch from the biology itself (not from
// any other collection's artwork) and released as CC0.

import type { IconDef } from '../model/types'
import { C, MEM_FILL, MEM_LINE, circle, def, ellipse, fill, line, membrane, network, r1, rect, ribbon } from './draw'

const MICROBES = 'Microbes & viruses'
const TISSUES = 'Tissues & organisms'

const BACT = fill('#cfe8b6', '#5f9a2f')
const shape = (d: string, attrs: string): string => `<path d="${d}" ${attrs}/>`
const dot = (cx: number, cy: number, r: number, colour: string): string => circle(cx, cy, r, `fill="${colour}" stroke="none"`)
const nucleus = (cx: number, cy: number, rx: number, ry: number): string => ellipse(cx, cy, rx, ry, fill(C.nuc, C.nucLine, 'stroke-width="1.5"'))

/** Points of a six-sided shell (pointy top), as an SVG points string plus the corners. */
function hexagon(cx: number, cy: number, r: number): { points: string; corners: [number, number][] } {
  const corners: [number, number][] = []
  for (let k = 0; k < 6; k++) {
    const a = (-90 + k * 60) * (Math.PI / 180)
    corners.push([r1(cx + r * Math.cos(a)), r1(cy + r * Math.sin(a))])
  }
  return { points: corners.map((p) => p.join(',')).join(' '), corners }
}

/** A flat view of a 20-sided protein shell. */
function shell(cx: number, cy: number, r: number, bg: string, stroke: string): string {
  const { points, corners } = hexagon(cx, cy, r)
  const inner: [number, number][] = [90, -30, 210].map((deg) => {
    const a = deg * (Math.PI / 180)
    return [r1(cx + (r / 2) * Math.cos(a)), r1(cy + (r / 2) * Math.sin(a))] as [number, number]
  })
  const near = [[2, 3, 4], [0, 1, 2], [4, 5, 0]]
  let facets = `M${inner[0].join(' ')}L${inner[1].join(' ')}L${inner[2].join(' ')}Z`
  inner.forEach(([x, y], i) => {
    for (const k of near[i]) facets += `M${x} ${y}L${corners[k].join(' ')}`
  })
  return `<polygon points="${points}" ${fill(bg, stroke)}/>` + line(facets, stroke, 1.6)
}

/** Short projections around a circle, each ending in a knob. */
function spikes(cx: number, cy: number, from: number, to: number, count: number, colour: string, knob: number, offset = 0): string {
  let out = ''
  for (let k = 0; k < count; k++) {
    const a = (k * 2 * Math.PI) / count + offset
    const cos = Math.cos(a)
    const sin = Math.sin(a)
    out += line(`M${r1(cx + from * cos)} ${r1(cy + from * sin)}L${r1(cx + to * cos)} ${r1(cy + to * sin)}`, colour, 2.5) + dot(r1(cx + to * cos), r1(cy + to * sin), knob, colour)
  }
  return out
}

function spiralBacterium(): string {
  const pts: string[] = []
  for (let x = 22; x <= 108; x += 2) pts.push(`${x} ${r1(25 + 11 * Math.sin((2 * Math.PI * (x - 22)) / 34))}`)
  return line('M22 25C14 19 12 31 4 25M108 25C116 19 118 31 126 25', '#5f9a2f', 2) + ribbon(`M${pts.join('L')}`, '#5f9a2f', '#cfe8b6', 8)
}

function biofilm(): string {
  const rods: [number, number, number][] = [[30, 56, -20], [52, 40, 15], [74, 58, -8], [92, 44, 30], [58, 62, 70], [100, 62, -30], [40, 44, 50]]
  return (
    shape('M6 72C10 32 40 14 66 18C96 14 122 36 124 72Z', fill('#eaf5dc', '#5f9a2f', 'stroke-dasharray="5 4" stroke-width="2"')) +
    rods.map(([x, y, a]) => `<rect x="${x - 9}" y="${y - 4.5}" width="18" height="9" rx="4.5" transform="rotate(${a} ${x} ${y})" ${fill('#cfe8b6', '#5f9a2f', 'stroke-width="1.5"')}/>`).join('') +
    [[70, 34], [80, 30], [24, 66], [112, 60]].map(([x, y]) => circle(x, y, 4.5, fill(C.orange, C.orangeLine, 'stroke-width="1.5"'))).join('') +
    line('M4 74H126', C.greyLine, 4)
  )
}

function hypha(): string {
  const tubes = ['M6 62C40 58 70 46 134 42', 'M60 52C68 32 82 22 98 16']
  return (
    network(tubes, '#8a6a3a', '#e6d6b8', 8) +
    line('M34 53L37 66M62 47L66 60M90 41L93 54M116 37L118 50M76 26L86 34', '#8a6a3a', 1.8) +
    [[104, 12], [112, 8], [110, 18]].map(([x, y]) => circle(x, y, 4.5, fill('#e6d6b8', '#8a6a3a', 'stroke-width="1.5"'))).join('')
  )
}

function tumour(): string {
  const cells: [number, number, number][] = [[40, 42, 17], [66, 34, 15], [58, 60, 18], [84, 54, 14], [34, 68, 13], [78, 76, 13], [52, 82, 11], [90, 34, 10], [24, 48, 10]]
  return (
    line('M4 8C14 16 20 22 28 30M14 17C22 14 28 14 34 18', C.redLine, 3) +
    cells.map(([x, y, r]) => circle(x, y, r, fill(C.pink, C.pinkLine))).join('') +
    cells.map(([x, y, r]) => dot(x + 1, y - 1, r1(r * 0.42), '#9c4f86')).join('')
  )
}

function adipose(): string {
  const cells: [number, number][] = [[22, 24], [56, 22], [90, 24], [38, 52], [72, 52], [22, 80], [56, 82], [90, 80]]
  return cells.map(([x, y]) => circle(x, y, 17, fill(C.lipid, C.lipidLine)) + nucleus(x + 13, y - 9, 3, 5)).join('')
}

function boneMarrow(): string {
  const red: [number, number][] = [[40, 44], [52, 36], [70, 40], [82, 52], [44, 66], [60, 74], [76, 70], [64, 52]]
  const white: [number, number][] = [[50, 52], [72, 58], [58, 62], [84, 64], [36, 56]]
  return (
    ellipse(60, 55, 54, 48, fill('#f3ead7', '#b59b6a')) + ellipse(60, 55, 40, 34, fill('#fbe1de', C.redLine, 'stroke-width="2"')) +
    [[46, 78], [78, 36], [34, 46]].map(([x, y]) => circle(x, y, 6, fill(C.lipid, C.lipidLine, 'stroke-width="1.5"'))).join('') +
    red.map(([x, y]) => dot(x, y, 3.6, '#d9534f')).join('') + white.map(([x, y]) => circle(x, y, 4.6, fill(C.nuc, C.nucLine, 'stroke-width="1.5"'))).join('')
  )
}

export const TISSUE_ICONS: IconDef[] = [
  // ---- Microbes and viruses ----
  def('coccus', 'Cocci', MICROBES, 'coccus,cocci,staphylococcus,streptococcus,round bacteria', 76, 70,
    [[22, 22], [46, 20], [34, 42], [58, 42], [14, 46]].map(([x, y]) => circle(x, y, 13, BACT)).join('')),
  def('spiral-bacterium', 'Spiral bacterium', MICROBES, 'spirochaete,helicobacter,spirillum,spiral bacteria,campylobacter', 130, 50, spiralBacterium()),
  def('gram-positive-wall', 'Gram-positive cell wall', MICROBES, 'gram positive,peptidoglycan,teichoic acid,cell wall,envelope', 120, 92,
    line('M20 22V8M38 22V6M56 22V10M74 22V6M92 22V9M106 22V7', C.tealLine, 2.5) +
      rect(6, 22, 108, 34, 4, fill('#ddd3f4', C.nucLine)) +
      line('M6 33.5H114M6 44.5H114M24 22V56M42 22V56M60 22V56M78 22V56M96 22V56', '#b9a3e3', 1.5) + membrane('M6 76H114')),
  def('gram-negative-wall', 'Gram-negative cell wall', MICROBES, 'gram negative,outer membrane,lps,lipopolysaccharide,periplasm,porin', 120, 102,
    line('M18 22l-3 -6l6 -5l-6 -5M36 22l-3 -6l6 -5l-6 -5M82 22l-3 -6l6 -5l-6 -5M100 22l-3 -6l6 -5l-6 -5', C.tealLine, 2.2) +
      membrane('M6 26H114') + rect(52, 16, 16, 20, 4, fill(C.green, C.greenLine)) +
      rect(6, 48, 108, 9, 3, fill('#ddd3f4', C.nucLine, 'stroke-width="2"')) + membrane('M6 80H114')),
  def('biofilm', 'Biofilm', MICROBES, 'biofilm,matrix,eps,community,antibiotic tolerance', 130, 80, biofilm()),
  def('bacteriophage', 'Bacteriophage', MICROBES, 'phage,bacteriophage,t4,lytic,phage therapy', 70, 120,
    line('M26 89L10 78L6 114M44 89L60 78L64 114M30 92L23 114M40 92L47 114', C.nucLine, 2.5) + rect(30, 46, 10, 40, 2, fill(C.nuc, C.nucLine)) +
      line('M30 54H40M30 62H40M30 70H40M30 78H40', C.nucLine, 1.5) + rect(24, 85, 22, 7, 3, fill(C.nuc, C.nucLine)) +
      shell(35, 26, 22, '#dcd0f5', C.nucLine)),
  def('enveloped-virus', 'Enveloped virus', MICROBES, 'enveloped virus,herpesvirus,envelope,glycoprotein,capsid', 100, 100,
    spikes(50, 50, 40, 47, 16, C.nucLine, 3) + circle(50, 50, 38, fill(MEM_FILL, MEM_LINE, 'stroke-width="4"')) + shell(50, 50, 22, '#dcd0f5', C.nucLine)),
  def('icosahedral-virus', 'Icosahedral virus', MICROBES, 'adenovirus,icosahedral,non-enveloped,capsid,fibre', 100, 104,
    spikes(50, 52, 30, 44, 6, C.tealLine, 4.5, -Math.PI / 2) + shell(50, 52, 31, '#c6ebe6', C.tealLine)),
  def('retrovirus', 'Retrovirus', MICROBES, 'retrovirus,lentivirus,hiv,cone capsid,reverse transcription', 100, 100,
    spikes(50, 50, 39, 46, 12, C.nucLine, 3.5) + circle(50, 50, 38, fill('#fff3d6', C.goldLine, 'stroke-width="3"')) +
      shape('M38 30L62 26Q74 50 58 72Q50 79 44 70Q32 50 38 30Z', fill(C.nuc, C.nucLine)) +
      line('M44 38q5 -6 8 0t8 0M46 52q4 -6 7 0t7 0', C.redLine, 2.5)),
  def('fungal-hypha', 'Fungal hypha', MICROBES, 'fungus,hypha,mycelium,mould,candida,aspergillus,spores', 140, 76, hypha()),

  // ---- Tissue structures ----
  def('artery-plaque', 'Artery with plaque', TISSUES, 'atherosclerosis,plaque,stenosis,lipid core,artery,vascular disease', 120, 120,
    circle(60, 60, 56, fill('#f9dccf', C.mitoLine)) + circle(60, 60, 45, fill(C.red, C.redLine)) + circle(60, 60, 31, fill(C.cell, C.cellLine)) +
      circle(52, 60, 19, fill('#ffffff', C.cellLine)) +
      shape('M64 29.5A31 31 0 0 1 64 90.5C71 82 72.5 70 72.5 60C72.5 50 71 38 64 29.5Z', fill(C.lipid, C.lipidLine, 'stroke-width="2"')) +
      dot(80, 50, 3, C.orangeLine) + dot(83, 62, 3, C.orangeLine) + dot(78, 73, 3, C.orangeLine)),
  def('capillary', 'Capillary', TISSUES, 'capillary,microvessel,endothelium,blood flow,perfusion', 140, 60,
    `<rect x="4" y="14" width="132" height="32" fill="#fdeeee" stroke="none"/>` + ribbon('M4 14H136', C.cellLine, C.cell, 4) + ribbon('M4 46H136', C.cellLine, C.cell, 4) +
      nucleus(70, 11, 12, 5) + [22, 50, 90, 118].map((x) => ellipse(x, 30, 9, 6.5, fill('#ee7b78', C.redLine, 'stroke-width="2"'))).join('')),
  def('epithelial-sheet', 'Epithelial sheet', TISSUES, 'epithelium,monolayer,barrier,columnar,basement membrane', 140, 80,
    [0, 1, 2, 3, 4].map((i) => rect(6 + 25.6 * i, 10, 25.6, 54, 4, fill(C.cell, C.cellLine)) + nucleus(18.8 + 25.6 * i, 48, 7.5, 9)).join('') +
      [1, 2, 3, 4].map((i) => dot(6 + 25.6 * i, 15, 2.6, C.nucLine)).join('') + line('M4 69H136', '#b58a3c', 4)),
  def('synapse', 'Synapse', TISSUES, 'synapse,neurotransmitter,vesicle release,postsynaptic,synaptic cleft', 110, 120,
    shape('M45 4V24C22 28 16 46 20 58C24 70 86 70 90 58C94 46 88 28 65 24V4', fill('#e8e0f8', C.nucLine)) +
      [[38, 44], [54, 38], [70, 46], [46, 56], [62, 56]].map(([x, y]) => circle(x, y, 5.5, fill('#fff3d6', C.goldLine, 'stroke-width="1.5"'))).join('') +
      [[34, 74], [46, 77], [56, 73], [66, 77], [76, 74]].map(([x, y]) => dot(x, y, 2.4, C.orangeLine)).join('') +
      shape('M14 116V98C14 88 30 84 55 84C80 84 96 88 96 98V116', fill(C.cell, C.cellLine)) +
      [34, 52, 70].map((x) => rect(x - 4, 80, 8, 12, 2, fill(C.blue, C.blueLine, 'stroke-width="1.5"'))).join('')),
  def('neuromuscular-junction', 'Neuromuscular junction', TISSUES, 'nmj,motor end plate,acetylcholine,motor neuron,muscle', 130, 110,
    rect(6, 62, 118, 42, 10, fill(C.red, C.redLine)) + line('M24 72V96M40 72V96M90 72V96M106 72V96', C.redLine, 1.5) +
      line('M46 62v9M56 62v9M66 62v9M76 62v9M86 62v9', C.redLine, 2) +
      ribbon('M10 6C30 10 42 22 48 36', C.nucLine, '#e8e0f8', 7) + ellipse(65, 45, 28, 13, fill('#e8e0f8', C.nucLine)) +
      [[52, 44], [64, 42], [76, 45], [58, 49], [70, 49]].map(([x, y]) => circle(x, y, 3.6, fill('#fff3d6', C.goldLine, 'stroke-width="1.2"'))).join('') +
      [[50, 60], [60, 61], [70, 60], [80, 61]].map(([x, y]) => dot(x, y, 2, C.orangeLine)).join('')),
  def('nephron', 'Nephron', TISSUES, 'nephron,glomerulus,tubule,loop of henle,kidney,filtration', 120, 132,
    network(['M38 30C54 16 68 30 58 42C48 52 62 58 62 70V112Q62 122 72 122Q82 122 82 112V52C82 38 100 38 100 52', 'M100 20V126'], C.goldLine, '#f9e7b0', 6) +
      circle(24, 28, 17, fill('#f9e7b0', C.goldLine)) + circle(24, 28, 10, fill('#ee7b78', C.redLine, 'stroke-width="2"')) +
      line('M18 28q3 -5 6 0t6 0', '#9c2b28', 1.8)),
  def('intestinal-villus', 'Intestinal villus', TISSUES, 'villus,intestine,enterocyte,absorption,gut epithelium,lacteal', 90, 130,
    line('M45 126V54', MEM_LINE, 7) + line('M31 126V50Q31 30 45 30', C.redLine, 3) + line('M59 126V50Q59 30 45 30', C.blueLine, 3) +
      ribbon('M11 126V44Q11 9 45 9Q79 9 79 44V126', C.cellLine, C.cell, 9) +
      line('M4 30H18M4 50H18M4 70H18M4 90H18M4 110H18M72 30H86M72 50H86M72 70H86M72 90H86M72 110H86M28 6L33 19M45 2V16M62 6L57 19', C.cellLine, 1.5)),
  def('skin-layers', 'Skin layers', TISSUES, 'skin,epidermis,dermis,hypodermis,keratinocyte,wound', 130, 112,
    rect(6, 8, 118, 96, 6, fill(C.cell, C.cellLine)) +
      [22, 43.5, 65, 86.5, 108].map((x) => circle(x, 90, 9, fill(C.lipid, C.lipidLine, 'stroke-width="1.5"'))).join('') +
      circle(34, 58, 5, fill('#ee7b78', C.redLine, 'stroke-width="1.5"')) + circle(48, 64, 5, fill(C.blue, C.blueLine, 'stroke-width="1.5"')) +
      line('M84 70L91 4', '#8a6a3a', 2.5) + circle(84, 71, 4.5, fill('#d9c5a3', '#8a6a3a', 'stroke-width="1.5"')) +
      shape('M6 30V14Q6 8 12 8H118Q124 8 124 14V30Q114 40 104 30T84 30T64 30T44 30T24 30T6 30Z', fill('#f2b99a', '#c9825e'))),
  def('tumour', 'Tumour', TISSUES, 'tumour,tumor,cancer,neoplasm,mass,angiogenesis', 110, 100, tumour()),
  def('adipose-tissue', 'Adipose tissue', TISSUES, 'adipose tissue,fat,white adipose,adipocytes,obesity', 112, 104, adipose()),
  def('bone-marrow', 'Bone marrow', TISSUES, 'bone marrow,haematopoiesis,niche,marrow cavity,bone', 120, 110, boneMarrow()),
]
