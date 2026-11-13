// Pathogens, immune and medical subjects added after a survey of popular science videos on
// biology: the videos supplied the list of subjects only. Every drawing here is original
// (generic schematic shapes, not based on any other artwork) and released as CC0.
//
// A second survey (docs/icon-wishlist.md) added more viruses and bacteria, a few molecules,
// medical equipment and figure helpers here; its organs are in pack-organs.ts and its plants and
// animals in pack-organisms.ts.
//
// Each shape is one element with its own fill and outline, as the style rules in library.ts ask,
// so the "Flat cartoon" look is made from these drawings automatically.

import type { IconDef } from '../model/types'
import { C, circle, def, ellipse, fill, label, line, r1, rect, ribbon, shape } from './draw'

const MICROBES = 'Microbes & viruses'
const CELLS = 'Cells'
const MOLECULES = 'Proteins & molecules'
const TISSUES = 'Tissues & organisms'
const LAB = 'Lab'
const NUCLEIC = 'Nucleic acids'
const HELPERS = 'Figure helpers'

const GLASS = fill('#eef6fc', C.greyLine)
const WHITE = fill('#ffffff', C.greyLine)
const BACT = fill('#cfe8b6', '#5f9a2f')
const INK = '#3b4553'
const WOOD = '#8a6a3a'
const rad = (deg: number): number => (deg * Math.PI) / 180

function coronavirus(): string {
  let spikes = ''
  for (let k = 0; k < 14; k++) {
    const a = (k * 2 * Math.PI) / 14
    const [c, s] = [Math.cos(a), Math.sin(a)]
    spikes += line(`M${r1(50 + 26 * c)} ${r1(50 + 26 * s)}L${r1(50 + 36 * c)} ${r1(50 + 36 * s)}`, C.orangeLine, 3.5) + circle(r1(50 + 40 * c), r1(50 + 40 * s), 5, fill(C.orange, C.orangeLine))
  }
  return (
    spikes +
    circle(50, 50, 27, fill(C.red, C.redLine)) +
    line('M34 52q4 -9 8 0t8 0t8 0t8 0', C.redLine, 2.5) +
    circle(40, 38, 3, fill(C.gold, C.goldLine)) + circle(60, 64, 3, fill(C.gold, C.goldLine)) + circle(62, 38, 3, fill(C.gold, C.goldLine))
  )
}

function mosquito(): string {
  const legs = 'M66 54L52 84M72 56L74 86M80 54L98 82M64 52L40 74'
  return (
    line(legs, C.greyLine, 2.2) +
    `<g transform="rotate(-16 54 32)">${ellipse(54, 32, 28, 8, fill('#eaf4fb', C.blueLine, 'stroke-width="1.8"'))}</g>` +
    `<g transform="rotate(8 42 52)">${ellipse(42, 52, 28, 8, fill(C.grey, C.greyLine))}</g>` +
    line('M24 49v8M34 47v10M44 46v11', C.greyLine, 1.8) +
    circle(74, 46, 11, fill('#c3ccd8', C.greyLine)) +
    circle(90, 42, 6.5, fill(C.grey, C.greyLine)) +
    circle(92, 41, 2, fill(C.redLine, C.redLine)) +
    line('M95 45L116 60', C.greyLine, 2.2) +
    line('M93 37L104 26M90 36L96 22', C.greyLine, 1.6)
  )
}

function gutMicrobes(): string {
  return (
    rect(10, 14, 44, 17, 8.5, fill(C.green, C.greenLine)) +
    line('M18 22.5h28', C.greenLine, 2) +
    `<g transform="rotate(-28 86 34)">${rect(64, 26, 44, 16, 8, fill(C.blue, C.blueLine))}</g>` +
    circle(30, 58, 9, fill(C.pink, C.pinkLine)) + circle(45, 64, 9, fill(C.pink, C.pinkLine)) + circle(32, 74, 9, fill(C.pink, C.pinkLine)) +
    line('M60 84q5 -10 10 0t10 0t10 0t10 0', C.tealLine, 5) +
    shape('M70 50C84 44 100 52 98 66C92 60 80 58 72 62Z', fill(C.gold, C.goldLine)) +
    circle(60, 44, 3, fill(C.orange, C.orangeLine)) + circle(104, 84, 3, fill(C.orange, C.orangeLine)) + circle(14, 44, 3, fill(C.teal, C.tealLine))
  )
}

function toxin(): string {
  const pts: string[] = []
  for (let k = 0; k < 16; k++) {
    const a = (k * Math.PI) / 8 - Math.PI / 2
    const rad = k % 2 ? 20 : 31
    pts.push(`${r1(35 + rad * Math.cos(a))},${r1(35 + rad * Math.sin(a))}`)
  }
  return `<polygon points="${pts.join(' ')}" ${fill('#d7f0a8', C.greenLine)}/>` + label(35, 41, 17, '#3f7a2a', 'Tx')
}

function bulletVirus(): string {
  const spike = (x1: number, y1: number, x2: number, y2: number): string =>
    line(`M${x1} ${y1}L${x2} ${y2}`, C.tealLine, 2.2) + circle(x2, y2, 2.6, fill(C.gold, C.goldLine, 'stroke-width="1.5"'))
  let spikes = ''
  for (let y = 44; y <= 94; y += 10) spikes += spike(16, y, 7, y) + spike(54, y, 63, y)
  for (let deg = 180; deg <= 360; deg += 30) {
    const [c, s] = [Math.cos(rad(deg)), Math.sin(rad(deg))]
    spikes += spike(r1(35 + 18 * c), r1(34 + 18 * s), r1(35 + 28 * c), r1(34 + 28 * s))
  }
  return (
    spikes +
    shape('M16 34C16 9 54 9 54 34V94C54 99 50 102 46 102H24C20 102 16 99 16 94Z', fill(C.teal, C.tealLine)) +
    line('M24 36L46 42L24 48L46 54L24 60L46 66L24 72L46 78L24 84L46 90', C.tealLine, 2.2)
  )
}

function giantVirus(): string {
  let fibres = ''
  for (let k = 0; k < 30; k++) {
    const [c, s] = [Math.cos(rad(k * 12)), Math.sin(rad(k * 12))]
    fibres += `M${r1(55 + 34 * c)} ${r1(55 + 34 * s)}L${r1(55 + 51 * c)} ${r1(55 + 51 * s)}`
  }
  const hexagon = (r: number): string => [0, 1, 2, 3, 4, 5].map((k) => `${r1(55 + r * Math.cos(rad(k * 60 - 90)))},${r1(55 + r * Math.sin(rad(k * 60 - 90)))}`).join(' ')
  return (
    line(fibres, C.nucLine, 1.6) +
    `<polygon points="${hexagon(40)}" ${fill(C.nuc, C.nucLine)}/>` +
    `<polygon points="${hexagon(30)}" ${fill('#e8e0f8', C.nucLine, 'stroke-width="2"')}/>` +
    circle(55, 55, 15, fill(C.pink, C.pinkLine)) +
    line('M46 55q3 -6 6 0t6 0t6 0', C.pinkLine, 2)
  )
}

function granuloma(): string {
  let cells = ''
  for (let k = 0; k < 16; k++) {
    const [x, y] = [r1(60 + 45 * Math.cos(rad(k * 22.5))), r1(60 + 45 * Math.sin(rad(k * 22.5)))]
    cells += circle(x, y, 7.5, fill('#d9f0e3', C.greenLine, 'stroke-width="2"')) + circle(x, y, 3.5, fill(C.nuc, C.nucLine, 'stroke-width="1.5"'))
  }
  for (let k = 0; k < 8; k++) {
    cells += circle(r1(60 + 26 * Math.cos(rad(k * 45 + 22.5))), r1(60 + 26 * Math.sin(rad(k * 45 + 22.5))), 9.5, fill('#d7ecf9', '#4a90c4', 'stroke-width="2"'))
  }
  return (
    circle(60, 60, 56, fill('#f6e3c7', C.orangeLine)) +
    cells +
    circle(60, 60, 14, fill('#f3d9a4', C.goldLine)) +
    line('M52 56l6 3M62 65l6 -3M57 67l-4 2M62 53l4 -2', C.redLine, 3.2)
  )
}

function insulin(): string {
  const bead = (x: number, y: number, attrs: string): string => circle(x, y, 4.6, attrs)
  let beads = ''
  for (let k = 0; k < 8; k++) beads += bead(28 + 11 * k, 24, fill(C.teal, C.tealLine, 'stroke-width="2"'))
  for (let k = 0; k < 11; k++) beads += bead(6 + 11 * k, 50, fill(C.blue, C.blueLine, 'stroke-width="2"'))
  return (
    line('M39 24V50M94 24V50M50 24C50 4 83 4 83 24', C.goldLine, 3) +
    line('M28 24H105', C.tealLine, 2) + line('M6 50H116', C.blueLine, 2) +
    beads
  )
}

function cellulose(): string {
  let links = ''
  let rings = ''
  for (let row = 0; row < 3; row++) {
    const y = 13 + 19 * row
    for (let k = 0; k < 6; k++) {
      const x = 16 + 22 * k + (row % 2 ? 11 : 0)
      const points = [0, 1, 2, 3, 4, 5].map((i) => `${r1(x + 8 * Math.cos(rad(i * 60)))},${r1(y + 8 * Math.sin(rad(i * 60)))}`).join(' ')
      rings += `<polygon points="${points}" ${fill(C.green, C.greenLine, 'stroke-width="2"')}/>`
      if (k < 5) links += `M${x + 8} ${y}h6`
    }
  }
  return line(links, C.greenLine, 2.5) + rings
}

function radiationSign(): string {
  const at = (r: number, deg: number): string => `${r1(50 + r * Math.cos(rad(deg)))} ${r1(50 + r * Math.sin(rad(deg)))}`
  let blades = ''
  for (const mid of [90, 210, 330]) {
    blades += shape(`M${at(12, mid - 30)}L${at(35, mid - 30)}A35 35 0 0 1 ${at(35, mid + 30)}L${at(12, mid + 30)}A12 12 0 0 0 ${at(12, mid - 30)}Z`, fill(INK, INK, 'stroke-width="1"'))
  }
  return circle(50, 50, 45, fill('#ffe36b', INK)) + blades + circle(50, 50, 6.5, fill(INK, INK, 'stroke-width="1"'))
}

export const EXTRA_ICONS: IconDef[] = [
  // ---- Microbes & viruses ----
  def('coronavirus', 'Coronavirus', MICROBES, 'coronavirus,sars-cov-2,covid,spike protein,enveloped virus,respiratory', 100, 100, coronavirus()),
  def('filovirus', 'Thread-shaped virus (filovirus)', MICROBES, 'ebola,marburg,filovirus,thread,filament,haemorrhagic fever', 130, 70,
    ribbon('M12 52C30 62 52 60 70 46S96 14 110 20S116 46 98 44', C.pinkLine, C.pink, 9) +
      circle(98, 44, 2.2, fill(C.pinkLine, C.pinkLine))),
  def('amoeba', 'Amoeba', MICROBES, 'amoeba,protozoan,pseudopod,naegleria,parasite,protist', 120, 100,
    shape('M30 20C44 6 58 22 70 14C86 4 100 16 96 32C112 34 118 52 104 60C112 78 92 92 78 80C66 96 44 94 42 78C24 86 6 72 16 56C4 44 12 24 30 20Z', fill(C.teal, C.tealLine)) +
      circle(56, 48, 13, fill(C.nuc, C.nucLine)) + circle(56, 48, 5, fill(C.nucLine, C.nucLine)) +
      circle(84, 46, 7, fill('#ffffff', C.tealLine)) + circle(42, 68, 5, fill('#ffffff', C.tealLine)) +
      circle(76, 66, 3, fill(C.gold, C.goldLine)) + circle(34, 36, 3, fill(C.gold, C.goldLine)) + circle(90, 28, 2.5, fill(C.gold, C.goldLine))),
  def('parasitic-worm', 'Parasitic worm (helminth)', MICROBES, 'helminth,worm,nematode,parasite,roundworm,schistosome', 140, 60,
    ribbon('M12 40C28 10 48 10 64 30S100 52 128 22', C.pinkLine, C.pink, 12) +
      line('M30 20l5 8M48 17l-1 9M62 28l-7 6M76 40l-6 7M92 44l1 9M108 38l5 7', C.pinkLine, 1.8) +
      circle(126, 23, 2, fill(C.pinkLine, C.pinkLine))),
  def('mosquito', 'Mosquito', MICROBES, 'mosquito,vector,anopheles,aedes,malaria,dengue,insect', 120, 90, mosquito()),
  def('malaria-parasite', 'Malaria parasite (merozoite)', MICROBES, 'plasmodium,malaria,merozoite,parasite,apicomplexa', 70, 90,
    shape('M35 6C52 6 62 26 60 48C58 70 48 84 35 84C22 84 12 70 10 48C8 26 18 6 35 6Z', fill(C.pink, C.pinkLine)) +
      ellipse(35, 12, 9, 5, fill(C.pinkLine, C.pinkLine)) +
      ellipse(29, 30, 3.5, 8, fill(C.gold, C.goldLine)) + ellipse(41, 30, 3.5, 8, fill(C.gold, C.goldLine)) +
      circle(35, 56, 12, fill(C.nuc, C.nucLine)) + circle(26, 74, 2.5, fill(C.orange, C.orangeLine)) + circle(44, 72, 2.5, fill(C.orange, C.orangeLine))),
  def('gut-microbes', 'Gut microbes (microbiome)', MICROBES, 'microbiome,microbiota,gut flora,commensal,bacteria,community', 120, 100, gutMicrobes()),
  def('bullet-virus', 'Bullet-shaped virus (rabies)', MICROBES, 'rabies,rhabdovirus,bullet,lyssavirus,vesicular stomatitis,vsv,virus', 70, 108, bulletVirus()),
  def('giant-virus', 'Giant virus', MICROBES, 'giant virus,mimivirus,megavirus,pandoravirus,capsid,fibres,virus', 110, 110, giantVirus()),
  def('pox-virus', 'Brick-shaped virus (pox)', MICROBES, 'poxvirus,smallpox,vaccinia,mpox,monkeypox,brick,variola,virus', 120, 90,
    rect(6, 10, 108, 70, 22, fill(C.orange, C.orangeLine)) +
      rect(14, 18, 92, 54, 16, fill('#fde3c0', C.orangeLine, 'stroke-width="2"')) +
      ellipse(60, 26.5, 11, 4, fill(C.gold, C.goldLine, 'stroke-width="2"')) + ellipse(60, 63.5, 11, 4, fill(C.gold, C.goldLine, 'stroke-width="2"')) +
      shape('M24 45C24 30 40 26 48 34C54 38 66 38 72 34C80 26 96 30 96 45C96 60 80 64 72 56C66 52 54 52 48 56C40 64 24 60 24 45Z', fill(C.red, C.redLine)) +
      line('M36 45q4 -7 8 0t8 0t8 0t8 0t8 0t8 0', C.redLine, 2)),
  def('mycobacterium', 'Mycobacterium (tuberculosis)', MICROBES, 'mycobacterium,tuberculosis,tb,acid-fast,bacillus,rod,bacteria,leprosy', 130, 80,
    ribbon('M12 26C32 16 52 18 74 28', C.redLine, C.red, 7) +
      ribbon('M48 52C70 42 94 46 118 38', C.redLine, C.red, 7) +
      ribbon('M14 56C26 62 40 62 54 70', C.redLine, C.red, 7) +
      circle(28, 20.5, 1.8, fill(C.redLine, C.redLine, 'stroke-width="1"')) + circle(44, 20, 1.8, fill(C.redLine, C.redLine, 'stroke-width="1"')) + circle(60, 23, 1.8, fill(C.redLine, C.redLine, 'stroke-width="1"')) +
      circle(66, 46.5, 1.8, fill(C.redLine, C.redLine, 'stroke-width="1"')) + circle(84, 44, 1.8, fill(C.redLine, C.redLine, 'stroke-width="1"')) + circle(102, 41.5, 1.8, fill(C.redLine, C.redLine, 'stroke-width="1"')) +
      circle(28, 61, 1.8, fill(C.redLine, C.redLine, 'stroke-width="1"')) + circle(42, 65, 1.8, fill(C.redLine, C.redLine, 'stroke-width="1"'))),
  def('prophage', 'Prophage (phage DNA in a bacterial genome)', MICROBES, 'prophage,lysogeny,lysogenic,temperate phage,integrated,bacteriophage,genome', 130, 80,
    rect(6, 8, 118, 64, 32, BACT) +
      ellipse(65, 40, 38, 16, `fill="none" stroke="${C.blueLine}" stroke-width="3"`) +
      `<path d="M44 26.7Q65 21.3 86 26.7" fill="none" stroke="${C.redLine}" stroke-width="7" stroke-linecap="butt"/>`),
  def('bacterial-lysis', 'Bacterium bursting (lysis)', MICROBES, 'lysis,burst,lytic cycle,phage release,cell death,antibiotic,bacteria', 130, 90,
    shape('M40 20H84L78 30L90 36L80 46L90 54L82 62L86 70H40C24 70 14 60 14 45C14 30 24 20 40 20Z', BACT) +
      shape('M97 22l11 -5l-3 10Z', BACT) + shape('M99 62l10 6l-11 4Z', BACT) +
      line('M28 46q4 -8 8 0t8 0', '#5f9a2f', 2) +
      circle(54, 34, 5, fill(C.red, C.redLine, 'stroke-width="2"')) + circle(68, 52, 5, fill(C.red, C.redLine, 'stroke-width="2"')) +
      circle(102, 42, 5, fill(C.red, C.redLine, 'stroke-width="2"')) + circle(118, 30, 5, fill(C.red, C.redLine, 'stroke-width="2"')) + circle(118, 56, 5, fill(C.red, C.redLine, 'stroke-width="2"'))),

  // ---- Cells ----
  def('infected-cell', 'Infected cell', CELLS, 'infected cell,virus,infection,host cell,viral replication', 124, 100,
    ellipse(60, 50, 54, 44, fill(C.cell, C.cellLine)) +
      circle(42, 52, 18, fill(C.nuc, C.nucLine)) +
      circle(76, 30, 7, fill(C.red, C.redLine)) + circle(90, 52, 7, fill(C.red, C.redLine)) + circle(72, 72, 7, fill(C.red, C.redLine)) +
      circle(113, 44, 7, fill(C.red, C.redLine)) +
      circle(76, 30, 2, fill(C.redLine, C.redLine)) + circle(90, 52, 2, fill(C.redLine, C.redLine)) + circle(72, 72, 2, fill(C.redLine, C.redLine)) + circle(113, 44, 2, fill(C.redLine, C.redLine))),
  def('memory-cell', 'Memory cell', CELLS, 'memory cell,memory b cell,memory t cell,immune memory,adaptive,vaccination', 90, 90,
    circle(45, 45, 41, fill('#d9f0e3', C.greenLine)) + circle(45, 45, 28, fill(C.nuc, C.nucLine)) + label(45, 54, 26, C.nucLine, 'M')),

  // ---- Nucleic acids ----
  def('telomeres', 'Telomeres (chromosome ends)', 'Nucleic acids', 'telomere,chromosome end,ageing,aging,telomerase,senescence', 110, 120,
    ribbon('M30 22L80 98', C.nucLine, C.nuc, 14) + ribbon('M80 22L30 98', C.nucLine, C.nuc, 14) +
      ribbon('M30 22L34 28', C.goldLine, C.gold, 14) + ribbon('M80 22L76 28', C.goldLine, C.gold, 14) +
      ribbon('M80 98L76 92', C.goldLine, C.gold, 14) + ribbon('M30 98L34 92', C.goldLine, C.gold, 14) +
      circle(55, 60, 6, fill(C.nucLine, C.nucLine))),
  def('oncogene', 'Oncogene and tumour suppressor', NUCLEIC, 'oncogene,tumour suppressor,tumor suppressor,cancer gene,locus,chromosome band,mutation', 150, 56,
    rect(6, 22, 46, 24, 12, fill(C.nuc, C.nucLine)) + rect(56, 22, 88, 24, 12, fill(C.nuc, C.nucLine)) +
      rect(24, 22, 12, 24, 0, fill(C.red, C.redLine)) + rect(104, 22, 12, 24, 0, fill(C.green, C.greenLine)) +
      rect(74, 22, 8, 24, 0, fill('#b7a3e6', C.nucLine, 'stroke-width="1.5"')) +
      circle(54, 34, 6, fill(C.nucLine, C.nucLine)) +
      line('M30 16V5M25 10L30 5L35 10', C.redLine, 2.5) + line('M110 16V7M103 7H117', C.greenLine, 2.5)),

  // ---- Proteins & molecules ----
  def('neurotransmitter-vesicle', 'Neurotransmitter vesicle', MOLECULES, 'neurotransmitter,serotonin,dopamine,synaptic vesicle,release,signalling', 96, 90,
    circle(40, 50, 32, fill('#eef6fc', C.blueLine)) +
      circle(30, 42, 5, fill(C.orange, C.orangeLine)) + circle(46, 40, 5, fill(C.orange, C.orangeLine)) + circle(38, 56, 5, fill(C.orange, C.orangeLine)) +
      circle(54, 56, 5, fill(C.orange, C.orangeLine)) + circle(26, 60, 5, fill(C.orange, C.orangeLine)) + circle(44, 70, 5, fill(C.orange, C.orangeLine)) +
      circle(76, 26, 5, fill(C.orange, C.orangeLine)) + circle(88, 14, 4, fill(C.orange, C.orangeLine)) + circle(86, 40, 4, fill(C.orange, C.orangeLine))),
  def('toxin', 'Toxin', MOLECULES, 'toxin,bacterial toxin,venom,poison,virulence factor', 70, 70, toxin()),
  def('prion', 'Prion (misfolded protein)', MOLECULES, 'prion,misfolded protein,amyloid,beta sheet,aggregate,neurodegeneration', 90, 84,
    line('M64 18C80 18 80 40 70 40M26 40C10 40 10 62 20 62', C.redLine, 3) +
      shape('M10 10H54L66 18L54 26H10Z', fill(C.red, C.redLine)) +
      shape('M80 32H36L24 40L36 48H80Z', fill(C.red, C.redLine)) +
      shape('M10 54H54L66 62L54 70H10Z', fill(C.red, C.redLine))),
  def('insulin', 'Peptide hormone (insulin)', MOLECULES, 'insulin,peptide hormone,peptide,glucagon,disulfide,two chains,diabetes,hormone', 122, 60, insulin()),
  def('cellulose-fibre', 'Cellulose fibre', MOLECULES, 'cellulose,fibre,fiber,cell wall,polysaccharide,glucose chain,plant,biofuel', 152, 64, cellulose()),

  // ---- Tissues & organisms ----
  def('lymph-node', 'Lymph node', TISSUES, 'lymph node,lymphatic,follicle,germinal centre,immune organ', 110, 92,
    line('M30 14L24 3M60 9V2.5M88 17L96 6', C.greenLine, 4) + line('M62 78V90', C.blueLine, 4) +
      shape('M22 20C40 4 78 4 92 22C106 40 100 68 80 78C64 86 52 74 44 78C28 86 10 70 10 50C10 38 12 28 22 20Z', fill('#f6e3c7', C.orangeLine)) +
      circle(34, 34, 9, fill(C.nuc, C.nucLine)) + circle(58, 26, 9, fill(C.nuc, C.nucLine)) + circle(80, 38, 9, fill(C.nuc, C.nucLine)) +
      circle(28, 58, 9, fill(C.nuc, C.nucLine)) + circle(78, 62, 9, fill(C.nuc, C.nucLine)) +
      circle(34, 34, 3.5, fill('#ffffff', C.nucLine)) + circle(58, 26, 3.5, fill('#ffffff', C.nucLine)) + circle(80, 38, 3.5, fill('#ffffff', C.nucLine)) +
      circle(28, 58, 3.5, fill('#ffffff', C.nucLine)) + circle(78, 62, 3.5, fill('#ffffff', C.nucLine)) +
      ellipse(54, 54, 11, 8, fill(C.pink, C.pinkLine))),
  def('alveoli', 'Alveoli (air sacs)', TISSUES, 'alveolus,alveoli,lung,air sac,gas exchange,respiratory', 110, 100,
    ribbon('M56 22V8', C.pinkLine, '#fde0e6', 10) +
      circle(38, 46, 26, fill('#fde0e6', C.pinkLine)) + circle(72, 42, 24, fill('#fde0e6', C.pinkLine)) + circle(58, 66, 22, fill('#fde0e6', C.pinkLine)) +
      circle(38, 46, 15, fill('#ffffff', C.pinkLine)) + circle(72, 42, 13, fill('#ffffff', C.pinkLine)) + circle(58, 66, 11, fill('#ffffff', C.pinkLine)) +
      ribbon('M8 76C30 98 82 98 102 68', C.redLine, C.red, 6)),
  def('granuloma', 'Granuloma', TISSUES, 'granuloma,tuberculosis,macrophage,chronic inflammation,caseous necrosis,sarcoidosis', 120, 120, granuloma()),

  // ---- Lab ----
  def('infusion-bag', 'Infusion bag (IV drip)', LAB, 'infusion,iv,drip,intravenous,saline,transfusion,therapy', 60, 110,
    line('M30 14V4M22 4H38', C.greyLine, 3) +
      rect(8, 14, 44, 62, 8, GLASS) + rect(11, 42, 38, 31, 5, fill(C.blue, C.blueLine)) +
      rect(16, 20, 28, 14, 2, fill('#ffffff', C.greyLine)) +
      line('M30 76V84M30 94V106', C.blueLine, 2.5) + rect(26, 82, 8, 12, 3, GLASS)),
  def('vaccine-vial', 'Vaccine vial', LAB, 'vaccine,vial,injection,immunisation,dose,drug', 50, 90,
    rect(13, 6, 24, 12, 3, fill(C.red, C.redLine)) + rect(16, 18, 18, 14, 2, GLASS) +
      rect(8, 30, 34, 54, 6, GLASS) + rect(11, 58, 28, 23, 4, fill(C.teal, C.tealLine)) +
      rect(8, 38, 34, 16, 1, fill('#ffffff', C.greyLine)) + line('M25 41v10M20 46h10', C.redLine, 2.5)),
  def('face-mask', 'Face mask', LAB, 'mask,face mask,surgical mask,protection,ppe,hygiene', 110, 70,
    line('M22 20C6 20 6 46 22 46M88 20C104 20 104 46 88 46', C.blueLine, 2.5) +
      shape('M22 16C40 8 70 8 88 16V50C70 62 40 62 22 50Z', fill('#bfe3f7', C.blueLine)) +
      line('M25 28C44 22 66 22 85 28M25 40C44 46 66 46 85 40', C.blueLine, 2)),
  def('injection-pen', 'Injection pen', LAB, 'injection pen,insulin pen,autoinjector,glp-1,semaglutide,epinephrine,dose,drug', 150, 36,
    line('M128 18H146', C.greyLine, 2) +
      rect(118, 12, 12, 12, 2, fill(C.grey, C.greyLine)) +
      rect(84, 8, 36, 20, 4, GLASS) + rect(88, 11.5, 28, 13, 2, fill(C.blue, C.blueLine, 'stroke-width="1.5"')) +
      rect(22, 6, 64, 24, 6, fill(C.teal, C.tealLine)) +
      rect(38, 11, 18, 14, 3, fill('#ffffff', C.tealLine, 'stroke-width="2"')) + line('M43 18h8', C.tealLine, 2.5) +
      rect(6, 9, 16, 18, 3, fill(C.grey, C.greyLine)) + line('M11 12v12M16 12v12', C.greyLine, 1.6)),
  def('blood-pressure-gauge', 'Blood pressure gauge', LAB, 'blood pressure,sphygmomanometer,cuff,hypertension,manometer,clinic,vital signs', 112, 110,
    line('M40 62C40 44 50 38 60 36M88 58C92 68 94 76 94 84', INK, 3) +
      rect(6, 60, 60, 42, 8, fill(C.blue, C.blueLine)) +
      rect(16, 70, 26, 22, 3, fill('#ffffff', C.blueLine, 'stroke-width="2"')) + line('M52 62v38', C.blueLine, 2) +
      circle(80, 34, 27, WHITE) +
      line('M80 12v5M62.7 24l4.3 2.5M97.3 24l-4.3 2.5M58 34h5M102 34h-5M65 49l4 -3M95 49l-4 -3', C.greyLine, 2) +
      line('M80 34L93 21', C.redLine, 3) + circle(80, 34, 3.5, fill(C.greyLine, C.greyLine, 'stroke-width="1"')) +
      ellipse(94, 94, 9, 12, fill('#8a93a3', INK))),
  def('patient-monitor', 'Patient monitor', LAB, 'monitor,ecg,heart rate,vital signs,intensive care,icu,hospital,pulse', 120, 100,
    rect(54, 78, 12, 14, 0, fill(C.grey, C.greyLine)) + rect(34, 90, 52, 7, 3, fill(C.grey, C.greyLine)) +
      rect(6, 6, 108, 74, 8, fill(C.grey, C.greyLine)) +
      rect(13, 13, 70, 60, 4, fill('#2b3a4a', INK)) +
      line('M17 34h12l4 -12l6 26l5 -18l3 4h12l4 -12l6 26l4 -14h4', '#5fd39a', 2.2) +
      line('M17 60q5 -8 10 0t10 0t10 0t10 0t10 0t10 0', '#7fc4f0', 2.2) +
      rect(90, 14, 18, 14, 2, fill(C.green, C.greenLine, 'stroke-width="2"')) + rect(90, 34, 18, 14, 2, fill(C.blue, C.blueLine, 'stroke-width="2"')) +
      rect(90, 54, 18, 14, 2, fill(C.gold, C.goldLine, 'stroke-width="2"'))),
  def('rapid-test', 'Rapid test (lateral flow)', LAB, 'rapid test,lateral flow,antigen test,pregnancy test,covid test,diagnostic,strip', 60, 130,
    rect(8, 6, 44, 118, 8, WHITE) +
      rect(22, 26, 18, 44, 4, fill('#f3f6fa', C.greyLine, 'stroke-width="2"')) +
      line('M26 40H36M26 56H36', C.redLine, 3) +
      label(15, 43.5, 10, C.greyLine, 'C') + label(15, 59.5, 10, C.greyLine, 'T') +
      circle(31, 98, 9, fill(C.blue, C.blueLine))),
  def('pill-bottle', 'Pill bottle', LAB, 'pill bottle,medicine,tablets,prescription,drug,pharmacy,medication', 70, 110,
    rect(18, 22, 34, 12, 0, fill(C.orange, C.orangeLine)) +
      rect(8, 30, 54, 74, 8, fill(C.orange, C.orangeLine)) +
      rect(8, 48, 54, 36, 0, WHITE) + line('M18 60H52M18 71H40', C.greyLine, 2.5) +
      rect(13, 6, 44, 18, 4, WHITE) + line('M22 10v10M30 10v10M40 10v10M48 10v10', C.greyLine, 1.6)),
  def('laser-beam', 'Laser beam', LAB, 'laser,beam,light,optogenetics,excitation,ablation,optical tweezers', 140, 60,
    line('M66 30H122', C.redLine, 3.5) +
      rect(56, 23, 11, 14, 2, fill('#c3ccd8', C.greyLine)) +
      rect(6, 16, 50, 28, 6, fill(C.grey, C.greyLine)) +
      circle(18, 30, 4, fill(C.red, C.redLine, 'stroke-width="1.5"')) + line('M30 24h16M30 30h16M30 36h16', C.greyLine, 1.6) +
      `<polygon points="124,14 128,24 138,20 132,30 138,40 128,36 124,46 120,36 110,40 116,30 110,20 120,24" ${fill(C.gold, C.goldLine, 'stroke-width="2"')}/>`),
  def('radiation-sign', 'Radiation sign', LAB, 'radiation,radioactive,radioactivity,isotope,x-ray,gamma,hazard,warning', 100, 100, radiationSign()),
  def('protective-suit', 'Protective suit', LAB, 'protective suit,hazmat,ppe,biosafety,bsl-4,containment,outbreak', 80, 132,
    shape('M32 36H48C60 36 68 44 68 54V86H58V60H56V122H42V96H38V122H24V60H22V86H12V54C12 44 20 36 32 36Z', fill('#ffe9a6', C.goldLine)) +
      line('M40 40V88', C.goldLine, 2) +
      rect(10.5, 80, 13, 14, 5, fill(C.blue, C.blueLine)) + rect(56.5, 80, 13, 14, 5, fill(C.blue, C.blueLine)) +
      rect(21, 116, 18, 11, 4, fill('#8a93a3', INK)) + rect(41, 116, 18, 11, 4, fill('#8a93a3', INK)) +
      circle(40, 22, 17, fill('#ffe9a6', C.goldLine)) +
      rect(29, 15, 22, 14, 6, fill('#d7ecf9', C.blueLine, 'stroke-width="2"'))),

  // ---- Figure helpers ----
  def('phylogenetic-tree', 'Phylogenetic tree', HELPERS, 'phylogeny,phylogenetic tree,cladogram,evolution,lineage,species,ancestor', 112, 100,
    line('M6 50H24M24 26V74M24 26H50M50 14V38M50 14H98M50 38H74M74 30V46M74 30H98M74 46H98M24 74H62M62 64V86M62 64H98M62 86H98', INK, 2.5) +
      circle(101, 14, 5, fill(C.blue, C.blueLine, 'stroke-width="2"')) + circle(101, 30, 5, fill(C.teal, C.tealLine, 'stroke-width="2"')) +
      circle(101, 46, 5, fill(C.teal, C.tealLine, 'stroke-width="2"')) + circle(101, 64, 5, fill(C.orange, C.orangeLine, 'stroke-width="2"')) +
      circle(101, 86, 5, fill(C.red, C.redLine, 'stroke-width="2"'))),
  def('pedigree', 'Pedigree (family tree)', HELPERS, 'pedigree,family tree,inheritance,genetics,carrier,affected,mendelian', 120, 92,
    line('M48 18H72M60 18V44M20 44H100M20 44V60M60 44V60M100 44V60', INK, 2.5) +
      rect(28, 8, 20, 20, 0, fill('#ffffff', INK)) + circle(82, 18, 10, fill('#8a93a3', INK)) +
      circle(20, 71, 10, fill('#ffffff', INK)) + rect(50, 61, 20, 20, 0, fill('#8a93a3', INK)) + rect(90, 61, 20, 20, 0, fill('#ffffff', INK))),
  def('globe', 'Globe', HELPERS, 'globe,world,earth,global,worldwide,pandemic,epidemiology,geography', 100, 100,
    circle(50, 50, 44, fill(C.blue, C.blueLine)) +
      shape('M24 28C32 20 44 22 46 30C48 38 40 40 38 48C36 58 44 62 40 72C34 76 28 66 28 58C22 50 16 40 24 28Z', fill(C.green, C.greenLine, 'stroke-width="2"')) +
      shape('M58 24C68 18 82 26 84 38C86 48 78 50 74 58C72 68 64 70 62 60C60 52 52 48 54 38C54 32 54 28 58 24Z', fill(C.green, C.greenLine, 'stroke-width="2"')) +
      circle(70, 77, 4, fill(C.green, C.greenLine, 'stroke-width="2"'))),
  def('hourglass', 'Hourglass', HELPERS, 'hourglass,time,waiting,duration,ageing,aging,incubation', 70, 110,
    shape('M16 15H54C54 36 40 46 38 55C40 64 54 74 54 95H16C16 74 30 64 32 55C30 46 16 36 16 15Z', GLASS) +
      shape('M22 30H48C44 40 38 46 35 52C32 46 26 40 22 30Z', fill(C.gold, C.goldLine, 'stroke-width="2"')) +
      shape('M20 93C22 82 30 76 35 72C40 76 48 82 50 93Z', fill(C.gold, C.goldLine, 'stroke-width="2"')) +
      line('M35 54V72', C.goldLine, 2) +
      rect(8, 6, 54, 9, 3, fill('#c9a27a', WOOD)) + rect(8, 95, 54, 9, 3, fill('#c9a27a', WOOD))),
]
