// Small molecules, ions, and nucleic acid and genetics icons. Drawn for BioSketch from the
// chemistry and biology themselves (not from any other collection's artwork) and released as CC0.

import type { IconDef } from '../model/types'
import { C, circle, def, ellipse, fill, label, line, r1, rect } from './draw'

const MOLECULES = 'Proteins & molecules'
const NUCLEIC = 'Nucleic acids'

// ---------- small molecules ----------

/** A rounded name tag, like the existing ATP icon. */
const token = (width: number, text: string, bg: string, stroke: string, ink: string, size = 18): string =>
  rect(4, 5, width - 8, 36, 18, fill(bg, stroke)) + label(width / 2, 23 + size * 0.37, size, ink, text)

/** An ion: a labelled sphere, like the existing calcium icon. */
const ion = (text: string, bg: string, stroke: string, ink: string): string => circle(28, 28, 24, fill(bg, stroke)) + label(28, 35, 19, ink, text)

type Element = 'O' | 'C' | 'H' | 'N'
const ATOM: Record<Element, { bg: string; stroke: string; ink: string }> = {
  O: { bg: '#ee7b78', stroke: C.redLine, ink: '#6e1715' },
  C: { bg: '#8b95a3', stroke: '#4a5362', ink: '#ffffff' },
  H: { bg: '#ffffff', stroke: C.greyLine, ink: C.greyLine },
  N: { bg: C.blue, stroke: C.blueLine, ink: '#1d4f86' },
}
/** One atom of a ball model. */
const atom = (el: Element, cx: number, cy: number, r: number): string =>
  circle(cx, cy, r, fill(ATOM[el].bg, ATOM[el].stroke)) + label(cx, cy + r * 0.36, Math.round(r * 0.95), ATOM[el].ink, el)

const zigzag = (x: number, y: number, rise: number, count: number): string => `M${x} ${y}${`l8 ${-rise}l8 ${rise}`.repeat(count)}`

function glucose(): string {
  const pts: string[] = []
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3
    pts.push(`${r1(36 + 27 * Math.cos(a))},${r1(34 + 27 * Math.sin(a))}`)
  }
  return (
    `<polygon points="${pts.join(' ')}" ${fill('#fff3d6', C.goldLine)}/>` +
    circle(49.5, 10.6, 6.5, fill('#ee7b78', C.redLine, 'stroke-width="2"')) +
    label(36, 40, 16, '#7a5c00', 'Glc')
  )
}

function ring(cx: number, cy: number, radius: number, count: number, r: number, attrs: string): string {
  let out = ''
  for (let k = 0; k < count; k++) {
    const a = (k * 2 * Math.PI) / count
    out += circle(r1(cx + radius * Math.cos(a)), r1(cy + radius * Math.sin(a)), r, attrs)
  }
  return out
}

function spokes(cx: number, cy: number, from: number, to: number, count: number): string {
  let d = ''
  for (let k = 0; k < count; k++) {
    const a = (k * 2 * Math.PI) / count
    d += `M${r1(cx + from * Math.cos(a))} ${r1(cy + from * Math.sin(a))}L${r1(cx + to * Math.cos(a))} ${r1(cy + to * Math.sin(a))}`
  }
  return d
}

const HEAD = fill(C.orange, C.orangeLine, 'stroke-width="1.2"')

function liposome(): string {
  return (
    circle(40, 40, 13, `fill="#e4f3fb" stroke="none"`) +
    line(spokes(40, 40, 25.5, 29.5, 22) + spokes(40, 40, 20.5, 24.5, 11), C.lipidLine, 1.6) +
    ring(40, 40, 33, 22, 3.3, HEAD) + ring(40, 40, 17, 11, 3.3, HEAD) +
    circle(36, 38, 3, `fill="${C.blueLine}" stroke="none"`) + circle(44, 43, 3, `fill="${C.blueLine}" stroke="none"`)
  )
}

function lipidNanoparticle(): string {
  return (
    circle(40, 40, 24, `fill="#fdf0b8" stroke="none"`) +
    line(spokes(40, 40, 24, 29.5, 22), C.lipidLine, 1.6) +
    ring(40, 40, 33, 22, 3.3, HEAD) +
    line('M25 34q4 -7 8 0t8 0t8 0M29 48q4 -7 8 0t8 0', C.redLine, 2.5) +
    circle(52, 44, 2.5, `fill="${C.orangeLine}" stroke="none"`) + circle(30, 41, 2.5, `fill="${C.orangeLine}" stroke="none"`)
  )
}

function nanoparticle(): string {
  let ligands = ''
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4 + Math.PI / 8
    ligands +=
      line(`M${r1(40 + 21 * Math.cos(a))} ${r1(40 + 21 * Math.sin(a))}L${r1(40 + 31 * Math.cos(a))} ${r1(40 + 31 * Math.sin(a))}`, C.tealLine, 2.5) +
      circle(r1(40 + 33 * Math.cos(a)), r1(40 + 33 * Math.sin(a)), 3, `fill="${C.tealLine}" stroke="none"`)
  }
  return ligands + circle(40, 40, 20, fill('#c9d3e0', C.greyLine)) + line('M28 35Q31 25 41 24', '#ffffff', 3)
}

// ---------- nucleic acids ----------

/** A stretch of double helix between x0 and x1. */
function helix(x0: number, x1: number, mid: number, amp = 12, period = 44, shift = 0): string {
  const a: string[] = []
  const b: string[] = []
  let rungs = ''
  const wave = (x: number) => amp * Math.sin((2 * Math.PI * (x - x0)) / period + shift)
  for (let x = x0; x <= x1; x += 2) {
    a.push(`${x} ${r1(mid + wave(x))}`)
    b.push(`${x} ${r1(mid - wave(x))}`)
  }
  for (let x = x0 + 4; x <= x1 - 2; x += 6) {
    if (Math.abs(wave(x)) > amp * 0.35) rungs += `M${x} ${r1(mid + wave(x))}V${r1(mid - wave(x))}`
  }
  return line(rungs, '#9aa5b1', 1.8) + line(`M${a.join('L')}`, C.blueLine, 3.5) + line(`M${b.join('L')}`, C.redLine, 3.5)
}

/** A single wavy strand with base ticks. */
function strand(x0: number, x1: number, mid: number, colour: string, tick: string): string {
  const pts: string[] = []
  let ticks = ''
  const wave = (x: number) => mid + 6 * Math.sin((2 * Math.PI * (x - x0)) / 36)
  for (let x = x0; x <= x1; x += 2) pts.push(`${x} ${r1(wave(x))}`)
  for (let x = x0 + 9; x <= x1 - 4; x += 9) ticks += `M${x} ${r1(wave(x))}v10`
  return line(ticks, tick, 2.5) + line(`M${pts.join('L')}`, colour, 3.5)
}

function trna(): string {
  const outer = C.redLine
  const inner = '#f4a9a8'
  const stems = ['M44 12V68', 'M32 44H56']
  const loops: [number, number][] = [[20, 44], [68, 44], [44, 80]]
  const pass = (colour: string, width: number): string =>
    stems.map((d) => line(d, colour, width)).join('') + loops.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="10" fill="none" stroke="${colour}" stroke-width="${width}"/>`).join('')
  return (
    line('M44 12C44 4 53 3 56 9', outer, 2.5) + pass(outer, 9) + pass(inner, 4.5) + line('M39 91v6M44 92v6M49 91v6', outer, 2.5)
  )
}

function microRna(): string {
  let seed = ''
  let rest = ''
  for (let i = 0; i < 21; i++) {
    const tick = `M${12 + i * 4} 12v10`
    if (i >= 1 && i <= 7) seed += tick
    else rest += tick
  }
  return line(rest, '#e58a87', 2) + line(seed, C.orangeLine, 2.5) + line('M8 12H96', C.redLine, 3.5)
}

function siRna(): string {
  let rungs = ''
  for (let x = 21; x <= 75; x += 4.5) rungs += `M${r1(x)} 11V25`
  return line(rungs, '#9aa5b1', 1.8) + line('M6 10H78', C.redLine, 3.5) + line('M18 26H90', '#e58a87', 3.5)
}

function guideRna(): string {
  let ticks = ''
  for (let x = 10; x <= 46; x += 6) ticks += `M${x} 44v9`
  return (
    line(ticks, C.tealLine, 2.5) + line('M6 44H50', C.tealLine, 3.5) +
    line('M50 44H60V26a8 8 0 1 1 10 0V44H84V32a6 6 0 1 1 8 0V44H112', C.redLine, 3.5)
  )
}

function hairpin(): string {
  let rungs = ''
  for (let y = 48; y <= 88; y += 8) rungs += `M34 ${y}H54`
  return line(rungs, '#e58a87', 2) + line('M34 94V40A14 14 0 1 1 54 40V94', C.redLine, 3.5)
}

function chromatinFibre(): string {
  let beads = ''
  ;[20, 50, 80, 110].forEach((x, i) => {
    const y = i % 2 ? 34 : 22
    beads += circle(x, y, 11, fill(C.nuc, C.nucLine)) + line(`M${x - 10} ${y - 2}Q${x} ${y + 9} ${x + 10} ${y - 2}`, C.blueLine, 3)
  })
  return line('M4 30L10 22M30 22L40 34M60 34L70 22M90 22L100 34M120 34L126 26', C.blueLine, 3) + beads
}

function spark(cx: number, cy: number, outer: number, inner: number): string {
  const pts: string[] = []
  for (let k = 0; k < 16; k++) {
    const a = (k * Math.PI) / 8
    const rad = k % 2 ? inner : outer
    pts.push(`${r1(cx + rad * Math.cos(a))},${r1(cy + rad * Math.sin(a))}`)
  }
  return `<polygon points="${pts.join(' ')}" ${fill('#ffd76a', '#e07b1a', 'stroke-width="2"')}/>`
}

const arrowDown = (x: number, y0: number, y1: number): string =>
  line(`M${x} ${y0}V${y1 - 6}`, C.greyLine, 3) + `<polygon points="${x - 6},${y1 - 8} ${x + 6},${y1 - 8} ${x},${y1}" fill="${C.greyLine}" stroke="none"/>`

const duplex = (cx: number, cy: number): string => line(`M${cx - 11} ${cy - 3}H${cx + 11}`, C.blueLine, 3) + line(`M${cx - 11} ${cy + 3}H${cx + 11}`, C.redLine, 3)

function sequencingReads(): string {
  const reads: [number, number, number][] = [
    [8, 22, 40], [54, 22, 44], [104, 22, 20],
    [20, 32, 46], [72, 32, 40],
    [6, 42, 30], [42, 42, 42], [90, 42, 34],
    [30, 52, 40], [78, 52, 36],
  ]
  let out = `<rect x="6" y="8" width="118" height="6" rx="3" fill="#3b4a6b" stroke="none"/>`
  for (const [x, y, w] of reads) {
    out += `<rect x="${x}" y="${y}" width="${w}" height="6" rx="3" fill="${C.blue}" stroke="none"/>`
    if (x < 59 && x + w > 63) out += `<rect x="59" y="${y}" width="3.5" height="6" fill="${C.redLine}" stroke="none"/>`
  }
  return out
}

function capsid(): string {
  const hex: [number, number][] = []
  for (let k = 0; k < 6; k++) {
    const a = (-90 + k * 60) * (Math.PI / 180)
    hex.push([r1(40 + 34 * Math.cos(a)), r1(42 + 34 * Math.sin(a))])
  }
  const tri: [number, number][] = [90, -30, 210].map((deg) => {
    const a = deg * (Math.PI / 180)
    return [r1(40 + 17 * Math.cos(a)), r1(42 + 17 * Math.sin(a))] as [number, number]
  })
  // Each inner corner joins the three nearest outer corners: the usual flat view of a 20-sided shell.
  const near = [[2, 3, 4], [0, 1, 2], [4, 5, 0]]
  let facets = `M${tri[0][0]} ${tri[0][1]}L${tri[1][0]} ${tri[1][1]}L${tri[2][0]} ${tri[2][1]}Z`
  tri.forEach(([x, y], i) => {
    for (const k of near[i]) facets += `M${x} ${y}L${hex[k][0]} ${hex[k][1]}`
  })
  return `<polygon points="${hex.map((p) => p.join(',')).join(' ')}" ${fill('#dcd0f5', C.nucLine)}/>` + line(facets, C.nucLine, 1.8)
}

export const MOLECULE_ICONS: IconDef[] = [
  // ---- Small molecules and ions ----
  def('adp', 'ADP', MOLECULES, 'adp,nucleotide,energy,adenosine diphosphate', 84, 46, token(84, 'ADP', '#fdeccf', '#e07b1a', '#a85507', 20)),
  def('gtp', 'GTP', MOLECULES, 'gtp,nucleotide,guanosine triphosphate,g protein', 84, 46, token(84, 'GTP', '#d9f0e3', C.greenLine, '#1f6b3c', 20)),
  def('camp', 'cAMP', MOLECULES, 'camp,cyclic amp,second messenger,pka,adenylyl cyclase', 84, 46, token(84, 'cAMP', '#e8e0f8', C.nucLine, '#4a3496')),
  def('nadh', 'NADH', MOLECULES, 'nadh,nad,redox,electron carrier,metabolism', 84, 46, token(84, 'NADH', '#dbeaf9', C.blueLine, '#1d4f86')),
  def('acetyl-coa', 'Acetyl-CoA', MOLECULES, 'acetyl coa,tca cycle,metabolism,fatty acid synthesis,acetylation', 124, 46, token(124, 'Acetyl-CoA', '#fff3d6', C.goldLine, '#7a5c00')),
  def('sodium', 'Sodium (Na⁺)', MOLECULES, 'sodium,na,ion,action potential,osmotic', 56, 56, ion('Na⁺', '#fff1b8', '#c9a200', '#6b5600')),
  def('potassium', 'Potassium (K⁺)', MOLECULES, 'potassium,k,ion,membrane potential', 56, 56, ion('K⁺', '#e8e0f8', C.nucLine, '#4a3496')),
  def('chloride', 'Chloride (Cl⁻)', MOLECULES, 'chloride,cl,ion,anion,cftr', 56, 56, ion('Cl⁻', '#d9f0e3', C.greenLine, '#1f6b3c')),
  def('zinc', 'Zinc (Zn²⁺)', MOLECULES, 'zinc,zn,ion,metal,zinc finger', 56, 56, ion('Zn²⁺', C.grey, C.greyLine, '#3b4553')),
  def('magnesium', 'Magnesium (Mg²⁺)', MOLECULES, 'magnesium,mg,ion,cofactor,atp', 56, 56, ion('Mg²⁺', '#d3f0ec', C.tealLine, '#0f5a53')),
  def('oxygen', 'Oxygen (O₂)', MOLECULES, 'oxygen,o2,gas,hypoxia,respiration', 70, 44, atom('O', 24, 22, 16) + atom('O', 46, 22, 16)),
  def('carbon-dioxide', 'Carbon dioxide (CO₂)', MOLECULES, 'carbon dioxide,co2,gas,respiration,bicarbonate', 96, 44,
    atom('O', 20, 22, 15) + atom('O', 76, 22, 15) + atom('C', 48, 22, 14)),
  def('water', 'Water (H₂O)', MOLECULES, 'water,h2o,hydration,osmosis,solvent', 70, 56, atom('H', 14, 42, 10) + atom('H', 56, 42, 10) + atom('O', 35, 24, 17)),
  def('nitric-oxide', 'Nitric oxide (NO)', MOLECULES, 'nitric oxide,no,vasodilation,enos,signalling gas', 68, 44, atom('N', 22, 22, 15) + atom('O', 45, 22, 16)),
  def('hydrogen-peroxide', 'Hydrogen peroxide (H₂O₂)', MOLECULES, 'hydrogen peroxide,h2o2,ros,oxidative stress,catalase', 90, 56,
    atom('H', 13, 42, 9) + atom('H', 77, 14, 9) + atom('O', 34, 28, 15) + atom('O', 56, 28, 15)),
  def('glucose', 'Glucose', MOLECULES, 'glucose,sugar,glycolysis,glut,metabolism,hexose', 72, 66, glucose()),
  def('lactate', 'Lactate', MOLECULES, 'lactate,lactic acid,glycolysis,warburg,metabolite', 96, 46, token(96, 'Lactate', '#fbe3ef', C.pinkLine, '#7d2a5b', 17)),
  def('pyruvate', 'Pyruvate', MOLECULES, 'pyruvate,glycolysis,tca cycle,metabolite', 104, 46, token(104, 'Pyruvate', '#d3f0ec', C.tealLine, '#0f5a53', 17)),
  def('amino-acid', 'Amino acid', MOLECULES, 'amino acid,residue,building block,glutamine,cysteine', 84, 76,
    line('M16 30H68M42 30V60', C.greyLine, 3) + atom('N', 16, 30, 11) + atom('O', 68, 30, 11) + atom('C', 42, 30, 10) +
      circle(42, 61, 11, fill(C.green, C.greenLine)) + label(42, 65, 11, '#1f6b3c', 'R')),
  def('fatty-acid', 'Fatty acid', MOLECULES, 'fatty acid,lipid,pufa,palmitate,oleate,arachidonic acid', 124, 34,
    line(zigzag(16, 21, 9, 6), C.lipidLine, 3.5) + circle(10, 21, 7, fill('#ee7b78', C.redLine))),
  def('triglyceride', 'Triglyceride', MOLECULES, 'triglyceride,triacylglycerol,tag,fat,lipid storage', 124, 80,
    line(zigzag(16, 18, 6, 6) + zigzag(16, 42, 6, 6) + zigzag(16, 66, 6, 6), C.lipidLine, 3.5) + rect(6, 8, 11, 64, 5.5, fill(C.orange, C.orangeLine))),
  def('glutathione', 'Glutathione (GSH)', MOLECULES, 'glutathione,gsh,antioxidant,redox,gpx4,ferroptosis', 92, 52,
    line('M18 36H74M46 25V15', C.greyLine, 3) + circle(46, 9, 7.5, fill(C.lipid, C.lipidLine, 'stroke-width="2"')) + label(46, 12.5, 9, '#7a5c00', 'S') +
      [[18, 'E'], [46, 'C'], [74, 'G']].map(([x, t]) => circle(x as number, 36, 12, fill(C.teal, C.tealLine)) + label(x as number, 40.5, 12, '#0f5a53', t as string)).join('')),
  def('nanoparticle', 'Nanoparticle', MOLECULES, 'nanoparticle,gold nanoparticle,delivery,functionalised,imaging probe', 80, 80, nanoparticle()),
  def('liposome', 'Liposome', MOLECULES, 'liposome,vesicle,drug delivery,bilayer,encapsulation', 80, 80, liposome()),
  def('lipid-nanoparticle', 'Lipid nanoparticle', MOLECULES, 'lnp,lipid nanoparticle,mrna delivery,vaccine,sirna delivery', 80, 80, lipidNanoparticle()),

  // ---- Nucleic acids and genetics ----
  def('ssdna', 'Single-stranded DNA', NUCLEIC, 'ssdna,single stranded dna,oligo,primer,probe', 140, 32, strand(8, 132, 12, C.blueLine, '#8fb7e6')),
  def('trna', 'tRNA', NUCLEIC, 'trna,transfer rna,anticodon,translation,cloverleaf', 88, 100, trna()),
  def('microrna', 'microRNA', NUCLEIC, 'mirna,microrna,seed region,post-transcriptional,silencing', 104, 30, microRna()),
  def('sirna', 'siRNA', NUCLEIC, 'sirna,rnai,knockdown,duplex,silencing', 96, 36, siRna()),
  def('guide-rna', 'Guide RNA', NUCLEIC, 'guide rna,sgrna,grna,crispr,spacer,scaffold', 120, 60, guideRna()),
  def('rna-hairpin', 'RNA hairpin', NUCLEIC, 'hairpin,stem loop,shrna,pre-mirna,secondary structure', 88, 100, hairpin()),
  def('nucleosome', 'Nucleosome', NUCLEIC, 'nucleosome,histone,octamer,chromatin,epigenetics', 90, 72,
    line('M30 14q-3 -6 3 -9M56 14q4 -5 -1 -10M74 30q7 -2 8 -8', C.nucLine, 2) + rect(14, 14, 62, 46, 21, fill(C.nuc, C.nucLine)) +
      line('M2 20L10 29C30 42 60 42 80 29M10 44C30 57 60 57 80 44L88 52', C.blueLine, 4)),
  def('chromatin-fibre', 'Chromatin fibre', NUCLEIC, 'chromatin,beads on a string,nucleosomes,euchromatin,heterochromatin', 130, 56, chromatinFibre()),
  def('gene', 'Gene diagram', NUCLEIC, 'gene,promoter,exon,intron,locus,transcription start site', 130, 56,
    line('M4 40H126', C.greyLine, 2.5) + line('M16 40V20H28', C.greenLine, 3) + `<polygon points="27,14 37,20 27,26" fill="${C.greenLine}" stroke="none"/>` +
      rect(40, 31, 18, 18, 3, fill(C.blue, C.blueLine)) + rect(70, 31, 26, 18, 3, fill(C.blue, C.blueLine)) + rect(108, 31, 14, 18, 3, fill(C.blue, C.blueLine))),
  def('dna-break', 'DNA break', NUCLEIC, 'dna damage,double strand break,dsb,gamma h2ax,repair', 140, 50,
    helix(6, 54, 25) + helix(86, 134, 25, 12, 44, Math.PI) + spark(70, 25, 15, 7)),
  def('point-mutation', 'Point mutation', NUCLEIC, 'mutation,snp,variant,substitution,single nucleotide', 140, 54,
    helix(6, 134, 32) + line('M70 21V43', C.redLine, 5) + spark(70, 10, 9, 4.5)),
  def('dna-methylation', 'DNA methylation', NUCLEIC, 'methylation,cpg,5mc,epigenetics,dnmt,methyl mark', 140, 68,
    helix(6, 134, 46) +
      [40, 84].map((x) => line(`M${x} 36V21`, C.goldLine, 2.5) + circle(x, 13, 10, fill('#fff3d6', C.goldLine, 'stroke-width="2"')) + label(x, 17, 10, '#7a5c00', 'Me')).join('')),
  def('transcription', 'Transcription', NUCLEIC, 'transcription,gene expression,dna to rna,central dogma', 110, 84,
    helix(6, 104, 14, 9, 36) + arrowDown(55, 30, 50) + line('M14 68q8 -11 16 0t16 0t16 0t16 0t16 0', C.redLine, 3.5)),
  def('translation', 'Translation', NUCLEIC, 'translation,protein synthesis,rna to protein,ribosome,central dogma', 110, 92,
    line('M6 28H104', C.redLine, 3) + ellipse(55, 17, 16, 11, fill('#d9c5a3', '#8a6a3a', 'stroke-width="2"')) + ellipse(55, 35, 13, 6, fill('#ecdfc8', '#8a6a3a', 'stroke-width="2"')) +
      arrowDown(55, 46, 64) + line('M22 79H87', C.greyLine, 2) +
      [22, 35, 48, 61, 74, 87].map((x, i) => circle(x, 79, 6.5, fill([C.blue, C.teal, C.orange][i % 3], [C.blueLine, C.tealLine, C.orangeLine][i % 3], 'stroke-width="1.5"'))).join('')),
  def('pcr', 'PCR amplification', NUCLEIC, 'pcr,amplification,qpcr,thermal cycling,amplicon', 120, 84,
    line('M60 16L32 36M60 16L88 36M32 48L16 68M32 48L46 68M88 48L74 68M88 48L104 68', '#9aa5b1', 2) +
      duplex(60, 10) + duplex(32, 42) + duplex(88, 42) + duplex(16, 74) + duplex(46, 74) + duplex(74, 74) + duplex(104, 74)),
  def('sequencing-reads', 'Sequencing reads', NUCLEIC, 'sequencing,ngs,reads,alignment,rna-seq,coverage,variant calling', 130, 64, sequencingReads()),
  def('viral-vector', 'Viral vector', NUCLEIC, 'viral vector,aav,lentivirus,gene delivery,transduction,capsid', 80, 84, capsid()),
]
