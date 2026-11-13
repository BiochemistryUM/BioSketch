// The built-in icon library. Every icon here was drawn for BioSketch and is released as CC0,
// so figures made only with these icons need no attribution.
//
// Style rules (keep new icons consistent): flat pastel fill, darker outline of the same hue,
// 2.5 px outline, round joins, no gradients, plain hex colours so parts can be recoloured.
// The "Flat cartoon" look (style.ts) is redrawn from these same drawings shape by shape, so it
// depends on the rules: every shape is one self-closing element with its own fill and stroke
// (none set on a group), and a tube is two lines on one path, the wide one underneath.

import type { FigDoc, IconDef } from '../model/types'
import { C, FONT, def, r1, ribbon } from './draw'
import { styleIcon } from './style'
import { CELL_ICONS } from './pack-cells'
import { EXTRA_ICONS } from './pack-extra'
import { LAB_ICONS } from './pack-lab'
import { MOLECULE_ICONS } from './pack-molecules'
import { ORGAN_ICONS } from './pack-organs'
import { ORGANISM_ICONS } from './pack-organisms'
import { ORGANELLE_ICONS } from './pack-organelles'
import { PROTEIN_ICONS } from './pack-proteins'
import { TISSUE_ICONS } from './pack-tissues'

// ---------- generated shapes ----------

function virus(): string {
  let spikes = ''
  for (let k = 0; k < 12; k++) {
    const a = (k * Math.PI) / 6
    const x1 = r1(50 + 29 * Math.cos(a))
    const y1 = r1(50 + 29 * Math.sin(a))
    const x2 = r1(50 + 41 * Math.cos(a))
    const y2 = r1(50 + 41 * Math.sin(a))
    spikes += `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${C.redLine}" fill="none"/><circle cx="${x2}" cy="${y2}" r="4.5" fill="#f9cfce" stroke="${C.redLine}"/>`
  }
  return (
    spikes +
    `<circle cx="50" cy="50" r="29" fill="${C.red}" stroke="${C.redLine}"/>` +
    `<path d="M36 50q4 -9 8 0t8 0t8 0" fill="none" stroke="${C.redLine}"/>`
  )
}

function ros(): string {
  const pts: string[] = []
  for (let k = 0; k < 24; k++) {
    const a = (k * Math.PI) / 12 - Math.PI / 2
    const rad = k % 2 ? 27 : 38
    pts.push(`${r1(40 + rad * Math.cos(a))},${r1(40 + rad * Math.sin(a))}`)
  }
  return (
    `<polygon points="${pts.join(' ')}" fill="#ffe1b0" stroke="#e07b1a"/>` +
    `<text x="40" y="46" font-size="16" fill="#a85507" ${FONT}>ROS</text>`
  )
}

function dna(): string {
  const a: string[] = []
  const b: string[] = []
  let rungs = ''
  const wave = (x: number) => 17 * Math.sin((2 * Math.PI * (x - 6)) / 64)
  for (let x = 6; x <= 134; x += 2) {
    a.push(`${x} ${r1(25 + wave(x))}`)
    b.push(`${x} ${r1(25 - wave(x))}`)
  }
  for (let x = 14; x <= 130; x += 8) {
    if (Math.abs(wave(x)) > 5) rungs += `M${x} ${r1(25 + wave(x))}V${r1(25 - wave(x))}`
  }
  return (
    `<path d="${rungs}" stroke="#9aa5b1" stroke-width="2" fill="none"/>` +
    `<path d="M${a.join('L')}" stroke="${C.blueLine}" stroke-width="4" fill="none"/>` +
    `<path d="M${b.join('L')}" stroke="${C.redLine}" stroke-width="4" fill="none"/>`
  )
}

function mrna(): string {
  const strand: string[] = []
  let ticks = ''
  const wave = (x: number) => 14 + 6 * Math.sin((2 * Math.PI * (x - 8)) / 36)
  for (let x = 8; x <= 132; x += 2) strand.push(`${x} ${r1(wave(x))}`)
  for (let x = 17; x <= 128; x += 9) ticks += `M${x} ${r1(wave(x))}v10`
  return (
    `<path d="${ticks}" stroke="#e58a87" stroke-width="2.5" fill="none"/>` +
    `<path d="M${strand.join('L')}" stroke="${C.redLine}" stroke-width="3.5" fill="none"/>` +
    `<circle cx="8" cy="14" r="4.5" fill="${C.redLine}" stroke="none"/>`
  )
}

function gpcr(): string {
  let loops = ''
  let helices = ''
  for (let i = 0; i < 7; i++) {
    const cx = 15 + 17 * i
    helices += `<rect x="${cx - 6}" y="24" width="12" height="52" rx="6" fill="${C.blue}" stroke="${C.blueLine}"/>`
    if (i < 6) {
      loops +=
        i % 2 === 0
          ? `M${cx} 76C${cx} 93 ${cx + 17} 93 ${cx + 17} 76`
          : `M${cx} 24C${cx} 7 ${cx + 17} 7 ${cx + 17} 24`
    }
  }
  loops += 'M15 24C15 10 5 14 7 4M117 76C117 90 127 86 125 97'
  return `<path d="${loops}" fill="none" stroke="${C.blueLine}" stroke-width="3"/>${helices}`
}

function wellPlate(): string {
  let wells = ''
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 6; i++) {
      wells += `<circle cx="${20 + 20 * i}" cy="${18 + 20 * j}" r="7.5" fill="#fbd3dd" stroke="${C.greyLine}" stroke-width="1.5"/>`
    }
  }
  return `<rect x="3" y="3" width="134" height="90" rx="8" fill="#eef2f7" stroke="${C.greyLine}"/>${wells}`
}

function gel(): string {
  let out = `<rect x="5" y="5" width="90" height="100" rx="4" fill="#e9eef6" stroke="${C.greyLine}"/>`
  const lanes: number[][] = [
    [26, 36, 46, 58, 72, 88],
    [44, 66],
    [44, 66],
    [44, 70],
    [44, 70],
  ]
  lanes.forEach((bands, i) => {
    const x = 13 + 16 * i
    out += `<rect x="${x}" y="11" width="10" height="4" fill="${C.greyLine}" stroke="none"/>`
    for (const y of bands) {
      out += `<rect x="${x}" y="${y}" width="10" height="${i === 0 ? 2.5 : 4}" rx="1" fill="#3b4a6b" stroke="none"/>`
    }
  })
  return out
}

// ---------- the library ----------

const nucleusIn = (cx: number, cy: number, r: number): string =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.nuc}" stroke="${C.nucLine}"/>` +
  `<circle cx="${r1(cx - r * 0.25)}" cy="${r1(cy - r * 0.25)}" r="${r1(r * 0.3)}" fill="${C.nucLine}" stroke="none"/>`

const receptorUnit = (x: number): string =>
  `<rect x="${x + 13}" y="34" width="14" height="62" rx="7" fill="${C.blue}" stroke="${C.blueLine}"/>` +
  `<path d="M${x + 4} 8Q${x + 20} 24 ${x + 36} 8L${x + 36} 26Q${x + 36} 40 ${x + 20} 40Q${x + 4} 40 ${x + 4} 26Z" fill="${C.blue}" stroke="${C.blueLine}"/>` +
  `<ellipse cx="${x + 20}" cy="108" rx="17" ry="15" fill="${C.blue}" stroke="${C.blueLine}"/>`

const CORE_ICONS: IconDef[] = [
  // ---- Cells ----
  def('cell', 'Animal cell', 'Cells', 'cell,eukaryote,generic,cytoplasm', 120, 100,
    `<ellipse cx="60" cy="50" rx="56" ry="46" fill="${C.cell}" stroke="${C.cellLine}"/>${nucleusIn(54, 50, 19)}`),
  def('cell-outline', 'Cell (empty)', 'Cells', 'cell,outline,container,blank', 120, 100,
    `<ellipse cx="60" cy="50" rx="56" ry="46" fill="${C.cell}" stroke="${C.cellLine}"/>`),
  def('epithelial-cell', 'Epithelial cell', 'Cells', 'epithelium,columnar,barrier,gut', 70, 112,
    `<path d="M12 14v-9M22 14v-9M32 14v-9M42 14v-9M52 14v-9" stroke="${C.cellLine}" fill="none"/>` +
      `<rect x="5" y="14" width="60" height="94" rx="8" fill="${C.cell}" stroke="${C.cellLine}"/>` +
      `<ellipse cx="35" cy="78" rx="15" ry="13" fill="${C.nuc}" stroke="${C.nucLine}"/>`),
  def('smooth-muscle-cell', 'Smooth muscle cell', 'Cells', 'vsmc,smc,vascular,muscle,spindle,contractile', 160, 44,
    `<path d="M4 22C40 2 120 2 156 22C120 42 40 42 4 22Z" fill="${C.red}" stroke="${C.redLine}"/>` +
      `<ellipse cx="80" cy="22" rx="20" ry="7" fill="${C.nuc}" stroke="${C.nucLine}"/>`),
  def('endothelial-cell', 'Endothelial cell', 'Cells', 'endothelium,vessel,vascular,ec,lining', 150, 42,
    `<path d="M4 30C30 26 50 8 75 8C100 8 120 26 146 30C120 38 30 38 4 30Z" fill="#fbd0c9" stroke="${C.mitoLine}"/>` +
      `<ellipse cx="75" cy="22" rx="16" ry="7" fill="${C.nuc}" stroke="${C.nucLine}"/>`),
  def('fibroblast', 'Fibroblast', 'Cells', 'fibroblast,stroma,connective,mesenchymal', 160, 70,
    `<path d="M4 34C30 30 44 10 62 14C76 4 96 12 108 22C124 26 140 30 156 36C138 40 122 44 106 52C92 66 70 62 60 54C40 54 24 40 4 34Z" fill="#e3f0d2" stroke="#6a9a3a"/>` +
      `<ellipse cx="80" cy="34" rx="16" ry="9" fill="${C.nuc}" stroke="${C.nucLine}"/>`),
  def('macrophage', 'Macrophage', 'Cells', 'macrophage,immune,phagocyte,monocyte,innate', 120, 110,
    `<path d="M60 8C78 4 86 18 100 22C116 28 114 46 108 58C104 68 116 80 104 92C92 104 78 94 64 100C48 108 34 102 26 90C18 78 4 72 8 54C12 38 10 26 24 18C36 10 46 12 60 8Z" fill="#d7ecf9" stroke="#4a90c4"/>` +
      `<path d="M44 44C54 34 76 38 78 52C80 64 68 72 60 66C54 62 50 68 44 62C38 56 38 50 44 44Z" fill="${C.nuc}" stroke="${C.nucLine}"/>` +
      `<circle cx="88" cy="38" r="3" fill="#4a90c4" stroke="none"/><circle cx="92" cy="74" r="3" fill="#4a90c4" stroke="none"/><circle cx="34" cy="80" r="3" fill="#4a90c4" stroke="none"/><circle cx="28" cy="36" r="3" fill="#4a90c4" stroke="none"/>`),
  def('lymphocyte', 'Lymphocyte (T or B cell)', 'Cells', 't cell,b cell,immune,lymphocyte,adaptive', 90, 90,
    `<circle cx="45" cy="45" r="41" fill="#d9f0e3" stroke="${C.greenLine}"/><circle cx="45" cy="45" r="28" fill="${C.nuc}" stroke="${C.nucLine}"/>`),
  def('neuron', 'Neuron', 'Cells', 'neuron,nerve,axon,dendrite,brain', 180, 100,
    `<path d="M62 50H150M150 50l18 -17M150 50h22M150 50l18 17" stroke="${C.nucLine}" fill="none" stroke-width="4"/>` +
      `<path d="M30 36L14 16M22 26L8 30M26 50L4 52M30 64L12 84M22 74L22 92M45 30L48 8M45 70L50 94" stroke="${C.nucLine}" fill="none" stroke-width="3"/>` +
      `<circle cx="45" cy="50" r="21" fill="${C.nuc}" stroke="${C.nucLine}"/><circle cx="45" cy="50" r="8" fill="${C.nucLine}" stroke="none"/>`),
  def('red-blood-cell', 'Red blood cell', 'Cells', 'erythrocyte,rbc,blood,oxygen', 80, 80,
    `<circle cx="40" cy="40" r="36" fill="#ee7b78" stroke="${C.redLine}"/><circle cx="40" cy="40" r="16" fill="#d9534f" stroke="none"/>`),
  def('adipocyte', 'Adipocyte', 'Cells', 'fat,adipose,lipid,adipocyte', 100, 100,
    `<circle cx="50" cy="50" r="46" fill="${C.cell}" stroke="${C.cellLine}"/><circle cx="47" cy="50" r="36" fill="${C.lipid}" stroke="${C.lipidLine}"/>` +
      `<ellipse cx="89" cy="50" rx="4.5" ry="11" fill="${C.nuc}" stroke="${C.nucLine}"/>`),
  def('bacterium', 'Bacterium', 'Microbes & viruses', 'bacteria,prokaryote,microbe,e. coli', 132, 60,
    `<path d="M100 30c8 -12 10 12 18 0s6 -8 10 0" fill="none" stroke="#5f9a2f"/>` +
      `<rect x="14" y="12" width="88" height="36" rx="18" fill="#cfe8b6" stroke="#5f9a2f"/>` +
      `<path d="M34 30q6 -10 12 0t12 0t12 0t12 0" fill="none" stroke="#5f9a2f"/>`),
  def('virus', 'Virus', 'Microbes & viruses', 'virus,virion,pathogen,infection,spike', 100, 100, virus()),

  // ---- Organelles ----
  def('nucleus', 'Nucleus', 'Organelles', 'nucleus,dna,chromatin,envelope,nuclear', 100, 100,
    `<circle cx="50" cy="50" r="46" fill="#dcd0f5" stroke="${C.nucLine}"/>` +
      `<circle cx="50" cy="50" r="39" fill="none" stroke="${C.nucLine}" stroke-dasharray="7 6"/>` +
      `<path d="M52 66q6 -10 12 0t12 -2M56 34q8 4 14 -2" fill="none" stroke="#9c86d6"/>` +
      `<circle cx="40" cy="46" r="11" fill="${C.nucLine}" stroke="none"/>`),
  def('mitochondrion', 'Mitochondrion', 'Organelles', 'mitochondria,energy,atp,respiration,cristae', 120, 60,
    `<rect x="3" y="3" width="114" height="54" rx="27" fill="${C.mito}" stroke="${C.mitoLine}"/>` +
      `<path d="M18 30C18 14 30 14 30 30S42 46 42 30S54 14 54 30S66 46 66 30S78 14 78 30S90 46 90 30S102 14 102 30" fill="none" stroke="${C.mitoLine}"/>`),
  def('er', 'Endoplasmic reticulum', 'Organelles', 'er,reticulum,rough,secretory,folding', 110, 92,
    ribbon('M10 20C40 6 70 34 100 20', C.greenLine, C.green, 7) +
      ribbon('M10 40C40 26 70 54 100 40', C.greenLine, C.green, 7) +
      ribbon('M10 60C40 46 70 74 100 60', C.greenLine, C.green, 7) +
      ribbon('M18 79C42 67 68 89 92 79', C.greenLine, C.green, 7) +
      `<circle cx="22" cy="8" r="3" fill="${C.blueLine}" stroke="none"/><circle cx="44" cy="6" r="3" fill="${C.blueLine}" stroke="none"/><circle cx="66" cy="13" r="3" fill="${C.blueLine}" stroke="none"/><circle cx="88" cy="12" r="3" fill="${C.blueLine}" stroke="none"/>`),
  def('golgi', 'Golgi apparatus', 'Organelles', 'golgi,secretory,trafficking,cisternae', 112, 92,
    ribbon('M16 18Q56 38 96 18', C.goldLine, C.gold, 7) +
      ribbon('M10 36Q56 58 102 36', C.goldLine, C.gold, 7) +
      ribbon('M16 54Q56 76 96 54', C.goldLine, C.gold, 7) +
      ribbon('M26 72Q56 88 86 72', C.goldLine, C.gold, 7) +
      `<circle cx="104" cy="14" r="5" fill="${C.gold}" stroke="${C.goldLine}"/><circle cx="7" cy="60" r="4.5" fill="${C.gold}" stroke="${C.goldLine}"/><circle cx="100" cy="64" r="4" fill="${C.gold}" stroke="${C.goldLine}"/>`),
  def('lysosome', 'Lysosome', 'Organelles', 'lysosome,degradation,acidic,autophagy', 80, 80,
    `<circle cx="40" cy="40" r="36" fill="${C.pink}" stroke="${C.pinkLine}"/>` +
      `<circle cx="28" cy="30" r="4" fill="${C.pinkLine}" stroke="none"/><circle cx="50" cy="26" r="3" fill="${C.pinkLine}" stroke="none"/><circle cx="54" cy="46" r="4.5" fill="${C.pinkLine}" stroke="none"/><circle cx="32" cy="52" r="3.5" fill="${C.pinkLine}" stroke="none"/><circle cx="42" cy="40" r="2.5" fill="${C.pinkLine}" stroke="none"/>`),
  def('autophagosome', 'Autophagosome', 'Organelles', 'autophagy,autophagosome,double membrane,lc3', 90, 90,
    `<circle cx="45" cy="45" r="41" fill="#e9f3fb" stroke="${C.blueLine}"/><circle cx="45" cy="45" r="33" fill="#f6fbff" stroke="${C.blueLine}"/>` +
      `<rect x="26" y="34" width="26" height="14" rx="7" fill="${C.mito}" stroke="${C.mitoLine}" stroke-width="2"/><circle cx="56" cy="56" r="6" fill="${C.blue}" stroke="${C.blueLine}" stroke-width="2"/>`),
  def('vesicle', 'Vesicle', 'Organelles', 'vesicle,endosome,exosome,transport,cargo', 80, 80,
    `<circle cx="40" cy="40" r="35" fill="#e9f3fb" stroke="${C.blueLine}" stroke-width="5"/>` +
      `<circle cx="32" cy="34" r="4" fill="${C.orange}" stroke="none"/><circle cx="48" cy="40" r="4" fill="${C.orange}" stroke="none"/><circle cx="36" cy="50" r="4" fill="${C.orange}" stroke="none"/>`),
  def('lipid-droplet', 'Lipid droplet', 'Organelles', 'lipid,droplet,fat,storage,triglyceride,ld', 80, 80,
    `<circle cx="40" cy="40" r="36" fill="${C.lipid}" stroke="${C.lipidLine}"/><path d="M20 32Q26 19 40 16" stroke="#ffffff" fill="none" stroke-width="4" opacity="0.75"/>`),
  def('ribosome', 'Ribosome', 'Organelles', 'ribosome,translation,protein synthesis', 80, 72,
    `<ellipse cx="40" cy="27" rx="31" ry="22" fill="#d9c5a3" stroke="#8a6a3a"/><ellipse cx="40" cy="55" rx="25" ry="13" fill="#ecdfc8" stroke="#8a6a3a"/>`),

  // ---- Membrane proteins ----
  def('receptor', 'Receptor', 'Membrane proteins', 'receptor,transmembrane,signalling,binding', 40, 126, receptorUnit(0)),
  def('receptor-dimer', 'Receptor dimer (RTK)', 'Membrane proteins', 'rtk,tyrosine kinase,dimer,egfr,growth factor', 80, 126,
    receptorUnit(0) + receptorUnit(40) +
      `<circle cx="6" cy="96" r="6" fill="${C.lipid}" stroke="${C.lipidLine}" stroke-width="1.5"/><circle cx="74" cy="96" r="6" fill="${C.lipid}" stroke="${C.lipidLine}" stroke-width="1.5"/>`),
  def('gpcr', 'GPCR', 'Membrane proteins', 'gpcr,g protein,7tm,seven transmembrane,receptor', 132, 100, gpcr()),
  def('ion-channel', 'Ion channel', 'Membrane proteins', 'channel,ion,pore,calcium,potassium,sodium', 80, 110,
    `<path d="M8 22Q8 8 22 8Q34 8 34 22V88Q34 102 22 102Q8 102 8 88Z" fill="${C.teal}" stroke="${C.tealLine}"/>` +
      `<path d="M46 22Q46 8 58 8Q72 8 72 22V88Q72 102 58 102Q46 102 46 88Z" fill="${C.teal}" stroke="${C.tealLine}"/>` +
      `<circle cx="40" cy="20" r="4" fill="${C.orange}" stroke="none"/><circle cx="40" cy="52" r="4" fill="${C.orange}" stroke="none"/><circle cx="40" cy="88" r="4" fill="${C.orange}" stroke="none"/>`),
  def('transporter', 'Transporter', 'Membrane proteins', 'transporter,carrier,slc,pump,antiporter', 84, 110,
    `<path d="M10 14Q22 6 32 14L40 92Q34 104 22 100Q12 98 10 86Z" fill="#c9e4b4" stroke="#5f9a2f"/>` +
      `<path d="M74 14Q62 6 52 14L44 92Q50 104 62 100Q72 98 74 86Z" fill="#c9e4b4" stroke="#5f9a2f"/>` +
      `<circle cx="42" cy="26" r="6" fill="${C.orange}" stroke="${C.orangeLine}" stroke-width="2"/>`),

  // ---- Proteins & molecules ----
  def('protein', 'Protein', 'Proteins & molecules', 'protein,globular,generic,factor,kinase', 92, 80,
    `<path d="M20 30C24 10 52 4 66 16C82 28 88 46 76 60C64 76 40 78 24 66C8 54 12 42 20 30Z" fill="${C.blue}" stroke="${C.blueLine}"/>`),
  def('enzyme', 'Enzyme', 'Proteins & molecules', 'enzyme,active site,catalysis,substrate,lock and key', 100, 92,
    `<path d="M50 8C74 8 90 22 90 34H64C56 34 56 58 64 58H90C90 72 74 84 50 84C26 84 10 68 10 46C10 24 26 8 50 8Z" fill="${C.teal}" stroke="${C.tealLine}"/>`),
  def('transcription-factor', 'Transcription factor', 'Proteins & molecules', 'transcription factor,tf,dna binding,nrf2,p53', 100, 62,
    `<path d="M8 40C8 16 30 6 50 6C70 6 92 16 92 40C92 52 80 56 70 50C60 44 40 44 30 50C20 56 8 52 8 40Z" fill="${C.green}" stroke="${C.greenLine}"/>`),
  def('antibody', 'Antibody', 'Proteins & molecules', 'antibody,igg,immunoglobulin,immune', 100, 112,
    `<path d="M44 106V62L18 24M56 106V62L82 24" fill="none" stroke="${C.blueLine}" stroke-width="7"/>` +
      `<path d="M10 30L23 49M90 30L77 49" fill="none" stroke="#6fa8dc" stroke-width="7"/>`),
  def('ligand', 'Ligand', 'Proteins & molecules', 'ligand,hormone,growth factor,cytokine,signal', 50, 50,
    `<path d="M25 5L45 25L25 45L5 25Z" fill="${C.orange}" stroke="${C.orangeLine}"/>`),
  def('small-molecule', 'Small molecule', 'Proteins & molecules', 'drug,compound,inhibitor,metabolite,chemical', 70, 76,
    `<path d="M35 6L62 22V54L35 70L8 54V22Z" fill="#e8e0f8" stroke="${C.nucLine}"/><circle cx="35" cy="38" r="15" fill="none" stroke="${C.nucLine}"/>`),
  def('pill', 'Drug (capsule)', 'Proteins & molecules', 'drug,pill,capsule,treatment,therapy', 90, 50,
    `<path d="M45 7H25a18 18 0 0 0 0 36H45Z" fill="${C.red}" stroke="${C.redLine}"/><path d="M45 7H65a18 18 0 0 1 0 36H45Z" fill="#ffffff" stroke="${C.redLine}"/>`),
  def('phosphate', 'Phosphate', 'Proteins & molecules', 'phosphate,phosphorylation,p,kinase', 50, 50,
    `<circle cx="25" cy="25" r="21" fill="${C.lipid}" stroke="${C.lipidLine}"/><text x="25" y="33" font-size="24" fill="#7a5c00" ${FONT}>P</text>`),
  def('atp', 'ATP', 'Proteins & molecules', 'atp,energy,nucleotide', 84, 46,
    `<rect x="4" y="5" width="76" height="36" rx="18" fill="#ffe1b0" stroke="#e07b1a"/><text x="42" y="30" font-size="20" fill="#a85507" ${FONT}>ATP</text>`),
  def('ros', 'Reactive oxygen species', 'Proteins & molecules', 'ros,oxidative stress,radical,peroxide,ferroptosis', 80, 80, ros()),
  def('iron', 'Iron (Fe²⁺)', 'Proteins & molecules', 'iron,fe,ferrous,ferroptosis,metal,ion', 56, 56,
    `<circle cx="28" cy="28" r="24" fill="#f3c7a6" stroke="#b5561f"/><text x="28" y="35" font-size="19" fill="#7c3610" ${FONT}>Fe²⁺</text>`),
  def('calcium', 'Calcium (Ca²⁺)', 'Proteins & molecules', 'calcium,ca,ion,second messenger,calcification', 56, 56,
    `<circle cx="28" cy="28" r="24" fill="#cfe6fa" stroke="${C.blueLine}"/><text x="28" y="35" font-size="19" fill="#1d4f86" ${FONT}>Ca²⁺</text>`),
  def('phospholipid', 'Phospholipid', 'Proteins & molecules', 'lipid,phospholipid,membrane,pufa,fatty acid', 40, 92,
    `<path d="M15 28C11 40 19 48 15 60S11 78 15 87M25 28C29 40 21 48 25 60S29 78 25 87" fill="none" stroke="${C.lipidLine}" stroke-width="3.5"/>` +
      `<circle cx="20" cy="17" r="13" fill="${C.orange}" stroke="${C.orangeLine}"/>`),

  // ---- Nucleic acids ----
  def('dna', 'DNA', 'Nucleic acids', 'dna,double helix,gene,genome', 140, 50, dna()),
  def('mrna', 'mRNA', 'Nucleic acids', 'rna,mrna,transcript,messenger', 140, 32, mrna()),
  def('chromosome', 'Chromosome', 'Nucleic acids', 'chromosome,chromatid,mitosis,karyotype', 60, 100,
    ribbon('M18 12C27 36 27 64 18 88', C.nucLine, C.nuc, 10) +
      ribbon('M42 12C33 36 33 64 42 88', C.nucLine, C.nuc, 10) +
      `<circle cx="30" cy="50" r="6" fill="${C.nucLine}" stroke="none"/>`),
  def('plasmid', 'Plasmid', 'Nucleic acids', 'plasmid,vector,cloning,construct', 90, 90,
    `<circle cx="45" cy="45" r="36" fill="none" stroke="${C.blueLine}" stroke-width="5"/><circle cx="45" cy="45" r="28" fill="none" stroke="#9cc3ee" stroke-width="3"/>` +
      `<path d="M51.3 9.5A36 36 0 0 1 80.5 38.7" fill="none" stroke="#e07b1a" stroke-width="9" stroke-linecap="butt"/>`),

  // ---- Tissues & organisms ----
  def('blood-vessel', 'Blood vessel (cross-section)', 'Tissues & organisms', 'vessel,artery,vein,lumen,media,intima,vascular', 120, 120,
    `<circle cx="60" cy="60" r="56" fill="#f9dccf" stroke="${C.mitoLine}"/><circle cx="60" cy="60" r="45" fill="${C.red}" stroke="${C.redLine}"/>` +
      `<circle cx="60" cy="60" r="31" fill="${C.cell}" stroke="${C.cellLine}"/><circle cx="60" cy="60" r="25" fill="#ffffff" stroke="${C.cellLine}"/>`),
  def('mouse', 'Mouse', 'Tissues & organisms', 'mouse,mice,animal model,in vivo,rodent', 150, 86,
    `<path d="M30 52C12 50 6 32 20 18" fill="none" stroke="#e59a9a" stroke-width="3.5"/>` +
      `<ellipse cx="54" cy="76" rx="9" ry="4.5" fill="#f6d5d3" stroke="${C.greyLine}"/><ellipse cx="94" cy="76" rx="9" ry="4.5" fill="#f6d5d3" stroke="${C.greyLine}"/>` +
      `<ellipse cx="70" cy="52" rx="43" ry="25" fill="${C.grey}" stroke="${C.greyLine}"/>` +
      `<circle cx="104" cy="34" r="11" fill="#f6d5d3" stroke="${C.greyLine}"/>` +
      `<path d="M96 42C108 34 126 42 142 58C130 70 110 72 98 68Z" fill="${C.grey}" stroke="${C.greyLine}"/>` +
      `<circle cx="142" cy="58" r="3.5" fill="#e58a87" stroke="none"/><circle cx="121" cy="51" r="2.8" fill="#2b2f36" stroke="none"/>`),

  // ---- Lab ----
  def('microtube', 'Microcentrifuge tube', 'Lab', 'tube,eppendorf,sample,microtube', 50, 102,
    `<path d="M12 22H38V60L28 94Q25 99 22 94L12 60Z" fill="#eef6fc" stroke="${C.greyLine}"/>` +
      `<path d="M13.5 56H36.5V60L27 92Q25 96 23 92L13.5 60Z" fill="${C.blue}" stroke="none"/>` +
      `<rect x="8" y="11" width="34" height="11" rx="3" fill="${C.grey}" stroke="${C.greyLine}"/>`),
  def('falcon-tube', 'Conical tube', 'Lab', 'tube,falcon,conical,50 ml,15 ml,sample', 50, 132,
    `<path d="M11 24H39V98L25 126L11 98Z" fill="#eef6fc" stroke="${C.greyLine}"/>` +
      `<path d="M12.5 70H37.5V98L25 123L12.5 98Z" fill="#fbd3dd" stroke="none"/>` +
      `<rect x="7" y="6" width="36" height="18" rx="3" fill="#4a90c4" stroke="${C.blueLine}"/>`),
  def('petri-dish', 'Petri dish', 'Lab', 'dish,culture,plate,petri,cells,agar', 120, 60,
    `<path d="M6 24V38C6 54 114 54 114 38V24" fill="#eef6fc" stroke="${C.greyLine}"/>` +
      `<ellipse cx="60" cy="24" rx="54" ry="16" fill="#fbd3dd" stroke="${C.greyLine}"/>`),
  def('flask', 'Flask', 'Lab', 'flask,erlenmeyer,medium,solution,chemistry', 90, 112,
    `<path d="M39 8V40L10 96Q6 104 16 104H74Q84 104 80 96L51 40V8Z" fill="#eef6fc" stroke="${C.greyLine}"/>` +
      `<path d="M25 70H65L78 96Q81 102 74 102H16Q9 102 12 96Z" fill="${C.teal}" stroke="none"/>` +
      `<path d="M34 8H56" fill="none" stroke="${C.greyLine}" stroke-width="4"/>`),
  def('pipette', 'Pipette', 'Lab', 'pipette,pipetting,liquid handling', 40, 142,
    `<rect x="16" y="2" width="8" height="10" rx="2" fill="${C.greyLine}" stroke="none"/>` +
      `<rect x="13" y="10" width="14" height="60" rx="5" fill="${C.grey}" stroke="${C.greyLine}"/>` +
      `<path d="M15 70H25L21.5 136H18.5Z" fill="#fff6cf" stroke="${C.greyLine}" stroke-width="2"/>`),
  def('syringe', 'Syringe', 'Lab', 'syringe,injection,needle,dose,treatment', 144, 40,
    `<path d="M104 20H138" fill="none" stroke="${C.greyLine}" stroke-width="2"/>` +
      `<path d="M6 20H34M6 9V31" fill="none" stroke="${C.greyLine}" stroke-width="4"/>` +
      `<rect x="30" y="9" width="72" height="22" rx="3" fill="#eef6fc" stroke="${C.greyLine}"/>` +
      `<rect x="56" y="10.5" width="44.5" height="19" rx="2" fill="${C.blue}" stroke="none"/>` +
      `<path d="M102 15H108V25H102" fill="${C.grey}" stroke="${C.greyLine}" stroke-width="2"/>`),
  def('well-plate', 'Well plate', 'Lab', 'plate,wells,24 well,96 well,assay,screen', 140, 96, wellPlate()),
  def('gel', 'Gel / blot', 'Lab', 'gel,western blot,electrophoresis,bands,sds-page', 100, 110, gel()),
  def('microscope', 'Microscope', 'Lab', 'microscope,imaging,microscopy', 100, 120,
    `<path d="M64 106V62C64 42 54 32 42 28" fill="none" stroke="${C.greyLine}" stroke-width="8"/>` +
      `<rect x="16" y="104" width="68" height="11" rx="4" fill="${C.grey}" stroke="${C.greyLine}"/>` +
      `<rect x="20" y="80" width="40" height="6" rx="2" fill="${C.grey}" stroke="${C.greyLine}"/>` +
      `<rect x="27" y="10" width="17" height="48" rx="3" transform="rotate(-20 35.5 34)" fill="#4a90c4" stroke="${C.blueLine}"/>` +
      `<rect x="43" y="56" width="9" height="13" rx="2" transform="rotate(-20 47.5 62.5)" fill="${C.grey}" stroke="${C.greyLine}"/>`),
]

/** Every built-in icon: the core set followed by the themed packs. */
export const BUILTIN_ICONS: IconDef[] = [...CORE_ICONS, ...CELL_ICONS, ...TISSUE_ICONS, ...ORGANELLE_ICONS, ...PROTEIN_ICONS, ...MOLECULE_ICONS, ...LAB_ICONS, ...EXTRA_ICONS, ...ORGAN_ICONS, ...ORGANISM_ICONS]

export const CATEGORIES: string[] = [...new Set(BUILTIN_ICONS.map((i) => i.category))]

const BY_ID = new Map(BUILTIN_ICONS.map((i) => [i.id, i]))

/** Find an icon by id: built-in first, then icons imported into this figure. */
/** An icon by id: a built-in one, in the figure's icon style, or one stored with the figure. */
export function getIcon(doc: Pick<FigDoc, 'customIcons' | 'iconStyle'> | null, id: string): IconDef | undefined {
  const builtin = BY_ID.get(id)
  return builtin ? styleIcon(builtin, doc?.iconStyle) : doc?.customIcons[id]
}

/** A test for "does this text contain every word of the search?", or null when the search is empty. */
export function searchTest(query: string): ((text: string) => boolean) | null {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return null
  return (text) => {
    const hay = text.toLowerCase()
    return words.every((w) => hay.includes(w))
  }
}

/** Matches in the name come first, then matches that are only in the category or keywords. */
export function nameFirst<T>(items: T[], inName: (item: T) => boolean): T[] {
  return [...items.filter(inName), ...items.filter((i) => !inName(i))]
}

export function searchIcons(icons: IconDef[], query: string): IconDef[] {
  const test = searchTest(query)
  if (!test) return icons
  return nameFirst(
    icons.filter((icon) => test(`${icon.name} ${icon.category} ${icon.tags.join(' ')}`)),
    (icon) => test(icon.name),
  )
}

/** Public-domain artwork needs no credit line; everything else does. */
export const isPublicDomain = (licence: string): boolean => /^(cc0|public domain)/i.test(licence.trim())
