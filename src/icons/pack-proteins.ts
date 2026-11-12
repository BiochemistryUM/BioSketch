// Protein and membrane-protein icons. Like the core set, these were drawn for BioSketch from the
// biology itself (not from any other collection's artwork) and are released as CC0.
//
// Membrane proteins are drawn upright with the membrane-spanning part in the middle, so they can
// be dropped onto a membrane made with the membrane brush.

import type { IconDef } from '../model/types'
import { C, circle, def, ellipse, fill, label, line, r1, rect, ribbon } from './draw'

const MEMBRANE = 'Membrane proteins'
const PROTEINS = 'Proteins & molecules'

const BLUE = fill(C.blue, C.blueLine)
const TEAL = fill(C.teal, C.tealLine)
const GREEN = fill(C.green, C.greenLine)
const GOLD = fill(C.gold, C.goldLine)
const RED = fill(C.red, C.redLine)
const ORANGE = fill(C.orange, C.orangeLine)
const PINK = fill(C.pink, C.pinkLine)
const PURPLE = fill(C.nuc, C.nucLine)

/** Two immunoglobulin-like domains on a membrane-spanning stalk. */
const igChain = (cx: number, attrs: string): string =>
  ellipse(cx, 18, 12, 14, attrs) + ellipse(cx, 46, 12, 14, attrs) + rect(cx - 4, 60, 8, 54, 4, attrs)

function inflammasome(): string {
  let spokes = ''
  let units = ''
  for (let k = 0; k < 7; k++) {
    const a = (k * 2 * Math.PI) / 7 - Math.PI / 2
    const cos = Math.cos(a)
    const sin = Math.sin(a)
    spokes += `M${r1(50 + 14 * cos)} ${r1(50 + 14 * sin)}L${r1(50 + 27 * cos)} ${r1(50 + 27 * sin)}`
    units += circle(r1(50 + 37 * cos), r1(50 + 37 * sin), 11, RED)
  }
  return line(spokes, C.redLine, 4) + units + circle(50, 50, 15, ORANGE)
}

function steroid(): string {
  const hex = (cx: number, cy: number, s: number): string => {
    const pts: string[] = []
    for (let k = 0; k < 6; k++) {
      const a = (Math.PI / 3) * k + Math.PI / 6
      pts.push(`${r1(cx + s * Math.cos(a))},${r1(cy + s * Math.sin(a))}`)
    }
    return `<polygon points="${pts.join(' ')}" fill="#fff3d6" stroke="${C.goldLine}"/>`
  }
  const s = 10
  const w = Math.sqrt(3) * s
  // Three six-membered rings and one five-membered ring, fused like the steroid skeleton.
  return (
    hex(13, 32, s) +
    hex(13 + w, 32, s) +
    hex(13 + 1.5 * w, 17, s) +
    `<polygon points="${r1(13 + 2 * w)},12 ${r1(13 + 2 * w)},22 ${r1(13 + 2 * w + 9.5)},25 ${r1(13 + 2 * w + 15)},17 ${r1(13 + 2 * w + 9.5)},9" fill="#fff3d6" stroke="${C.goldLine}"/>`
  )
}

function collagen(): string {
  const colours = ['#f2c0a8', '#e59a78', '#d9623a']
  return colours
    .map((colour, k) => {
      const pts: string[] = []
      for (let x = 6; x <= 124; x += 2) pts.push(`${x} ${r1(20 + 9 * Math.sin((2 * Math.PI * (x - 6)) / 40 + (k * 2 * Math.PI) / 3))}`)
      return line(`M${pts.join('L')}`, colour, 4.5)
    })
    .join('')
}

function lipoprotein(size: number, shell: string, shellLine: string, coreRadius: number, belts: string): string {
  const c = size / 2
  const radius = c - 6
  let heads = ''
  const count = Math.round((2 * Math.PI * radius) / 11)
  for (let k = 0; k < count; k++) {
    const a = (k * 2 * Math.PI) / count
    heads += circle(r1(c + radius * Math.cos(a)), r1(c + radius * Math.sin(a)), 3, `fill="${C.orange}" stroke="none"`)
  }
  return (
    circle(c, c, radius, fill(shell, shellLine)) +
    circle(c, c, coreRadius, fill(C.lipid, C.lipidLine, 'stroke-width="1.5"')) +
    heads +
    belts
  )
}

function igm(): string {
  let arms = ''
  for (let k = 0; k < 5; k++) {
    arms += `<g transform="rotate(${k * 72} 60 60)">${line('M60 46V28L50 10M60 28L70 10', C.blueLine, 5)}</g>`
  }
  return arms + circle(60, 60, 14, BLUE) + circle(60, 60, 5, ORANGE)
}

function helicase(): string {
  let dividers = ''
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3
    dividers += `M${r1(46 + 8 * Math.cos(a))} ${r1(35 + 8 * Math.sin(a))}L${r1(46 + 23 * Math.cos(a))} ${r1(35 + 23 * Math.sin(a))}`
  }
  return (
    line('M2 31H24M68 31L98 12', C.blueLine, 3.5) +
    line('M2 39H24M68 39L98 58', C.redLine, 3.5) +
    circle(46, 35, 23, GREEN) +
    line(dividers, C.greenLine, 1.5) +
    circle(46, 35, 8, fill('#ffffff', C.greenLine))
  )
}

const betaStrand = (y: number, reversed: boolean): string => {
  const x = (v: number) => (reversed ? 112 - v : v)
  return `<path d="M${x(6)} ${y + 6}H${x(76)}V${y}L${x(106)} ${y + 11}L${x(76)} ${y + 22}V${y + 16}H${x(6)}Z" ${GOLD}/>`
}

export const PROTEIN_ICONS: IconDef[] = [
  // ---- Membrane proteins ----
  def('na-k-pump', 'Sodium-potassium pump', MEMBRANE, 'na k atpase,pump,sodium,potassium,active transport,ion', 80, 120,
    rect(10, 12, 26, 78, 12, TEAL) + rect(44, 12, 26, 78, 12, TEAL) +
      ellipse(40, 101, 30, 14, GOLD) + label(40, 106, 12, '#7a5c00', 'ATP') +
      circle(40, 8, 4, `fill="${C.orange}" stroke="none"`) + circle(40, 22, 4, `fill="${C.orange}" stroke="none"`) + circle(40, 36, 4, `fill="${C.orange}" stroke="none"`) +
      circle(40, 58, 4, `fill="${C.nucLine}" stroke="none"`) + circle(40, 72, 4, `fill="${C.nucLine}" stroke="none"`)),
  def('atp-synthase', 'ATP synthase', MEMBRANE, 'atp synthase,complex v,f1fo,oxidative phosphorylation,mitochondria', 90, 130,
    line('M66 26H80V100H70', C.greyLine, 4) +
      rect(24, 12, 42, 42, 8, GOLD) + line('M34.5 12V54M45 12V54M55.5 12V54', C.goldLine, 1.5) +
      rect(40, 54, 10, 22, 0, ORANGE) +
      circle(45, 100, 26, RED) + line('M45 74V126M22.5 87L67.5 113M22.5 113L67.5 87', C.redLine, 1.5)),
  def('respiratory-complex', 'Respiratory chain complex', MEMBRANE, 'complex i,electron transport chain,etc,oxphos,mitochondria,nadh', 92, 110,
    `<path d="M22 20H68Q82 20 82 34V88Q82 102 68 102H62Q48 102 48 88V56H22Q8 56 8 38Q8 20 22 20Z" ${TEAL}/>` +
      circle(65, 60, 4, `fill="${C.lipid}" stroke="${C.lipidLine}" stroke-width="1.5"`) +
      circle(65, 75, 4, `fill="${C.lipid}" stroke="${C.lipidLine}" stroke-width="1.5"`) +
      circle(65, 90, 4, `fill="${C.lipid}" stroke="${C.lipidLine}" stroke-width="1.5"`)),
  def('integrin', 'Integrin', MEMBRANE, 'integrin,adhesion,focal adhesion,extracellular matrix,alpha beta', 70, 130,
    rect(17, 28, 12, 98, 6, BLUE) + rect(41, 28, 12, 98, 6, TEAL) + ellipse(21, 20, 16, 15, BLUE) + ellipse(49, 20, 16, 15, TEAL)),
  def('cadherin', 'Cadherin', MEMBRANE, 'cadherin,adherens junction,cell adhesion,calcium dependent', 50, 130,
    [12, 29, 46, 63, 80].map((cy) => ellipse(25, cy, 12, 8.5, PURPLE)).join('') +
      [20.5, 37.5, 54.5, 71.5].map((cy) => circle(41, cy, 3, `fill="${C.orange}" stroke="none"`)).join('') +
      rect(19, 88, 12, 28, 6, PURPLE) + line('M25 116q7 6 0 12', C.nucLine, 2.5)),
  def('t-cell-receptor', 'T-cell receptor', MEMBRANE, 'tcr,t cell receptor,antigen recognition,immune', 80, 120,
    igChain(28, PURPLE) + igChain(52, BLUE)),
  def('b-cell-receptor', 'B-cell receptor', MEMBRANE, 'bcr,b cell receptor,membrane antibody,immunoglobulin,immune', 100, 130,
    rect(24, 84, 8, 40, 4, ORANGE) + rect(68, 84, 8, 40, 4, ORANGE) +
      line('M44 124V62L18 24M56 124V62L82 24', C.blueLine, 7) + line('M10 30L23 49M90 30L77 49', '#6fa8dc', 7)),
  def('mhc-class-1', 'MHC class I', MEMBRANE, 'mhc i,hla,antigen presentation,peptide,cd8', 70, 120,
    rect(42, 62, 8, 52, 4, GREEN) + ellipse(24, 22, 13, 12, GREEN) + ellipse(46, 22, 13, 12, GREEN) + ellipse(46, 52, 13, 12, GREEN) +
      ellipse(24, 52, 13, 12, BLUE) + ellipse(35, 7, 11, 4.5, fill(C.red, C.redLine, 'stroke-width="2"'))),
  def('mhc-class-2', 'MHC class II', MEMBRANE, 'mhc ii,hla,antigen presentation,peptide,cd4', 70, 120,
    rect(20, 62, 8, 52, 4, GREEN) + rect(42, 62, 8, 52, 4, TEAL) + ellipse(24, 22, 13, 12, GREEN) + ellipse(24, 52, 13, 12, GREEN) +
      ellipse(46, 22, 13, 12, TEAL) + ellipse(46, 52, 13, 12, TEAL) + ellipse(35, 7, 11, 4.5, fill(C.red, C.redLine, 'stroke-width="2"'))),
  def('cytokine-receptor', 'Cytokine receptor', MEMBRANE, 'cytokine receptor,jak,stat,interleukin receptor,interferon receptor', 80, 126,
    [26, 54].map((cx) => rect(cx - 4, 58, 8, 44, 4, BLUE) + ellipse(cx, 18, 13, 14, BLUE) + ellipse(cx, 46, 13, 14, BLUE) + ellipse(cx, 111, 13, 11, ORANGE)).join('')),
  def('toll-like-receptor', 'Toll-like receptor', MEMBRANE, 'tlr,toll like receptor,innate immunity,pattern recognition,lps', 90, 130,
    rect(34, 62, 8, 44, 4, PURPLE) + rect(48, 62, 8, 44, 4, PURPLE) +
      ribbon('M38 64V30A13 13 0 0 0 12 30V46', C.nucLine, C.nuc, 7) + ribbon('M52 64V30A13 13 0 0 1 78 30V46', C.nucLine, C.nuc, 7) +
      ellipse(33, 115, 11, 10, PINK) + ellipse(57, 115, 11, 10, PINK)),
  def('death-receptor', 'Death receptor', MEMBRANE, 'death receptor,fas,tnf receptor,trail,apoptosis,trimer', 80, 126,
    [20, 40, 60].map((cx) => rect(cx - 4, 56, 8, 44, 4, BLUE) + rect(cx - 7, 8, 14, 50, 7, BLUE) + circle(cx, 108, 9.5, RED)).join('')),
  def('aquaporin', 'Aquaporin', MEMBRANE, 'aquaporin,water channel,osmosis', 70, 100,
    `<path d="M8 14Q8 6 18 6Q26 6 26 16Q26 34 32 50Q26 66 26 84Q26 94 18 94Q8 94 8 86Z" ${BLUE}/>` +
      `<path d="M62 14Q62 6 52 6Q44 6 44 16Q44 34 38 50Q44 66 44 84Q44 94 52 94Q62 94 62 86Z" ${BLUE}/>` +
      [18, 50, 82].map((cy) => circle(35, cy, 3, fill('#bfe3fb', C.blueLine, 'stroke-width="1.5"'))).join('')),
  def('abc-transporter', 'ABC transporter', MEMBRANE, 'abc transporter,efflux pump,p-glycoprotein,abca1,drug resistance', 90, 130,
    `<rect x="14" y="8" width="24" height="80" rx="11" transform="rotate(6 26 48)" ${BLUE}/>` +
      `<rect x="52" y="8" width="24" height="80" rx="11" transform="rotate(-6 64 48)" ${BLUE}/>` +
      ellipse(27, 107, 19, 16, GOLD) + ellipse(63, 107, 19, 16, GOLD) +
      circle(45, 30, 6, fill(C.orange, C.orangeLine, 'stroke-width="2"'))),
  def('porin', 'Porin (β-barrel)', MEMBRANE, 'porin,beta barrel,vdac,outer membrane,pore', 70, 100,
    `<path d="M9 16V84A26 9 0 0 0 61 84V16" ${GREEN}/>` + line('M17 24L23 88M27 25L33 92M37 25L43 92M47 24L53 88', C.greenLine, 2) +
      ellipse(35, 16, 26, 9, fill('#e2f4e7', C.greenLine))),
  def('gpi-anchored-protein', 'GPI-anchored protein', MEMBRANE, 'gpi anchor,lipid anchored,raft,glycolipid', 60, 110,
    line('M27 82V106M33 82V106', C.lipidLine, 3) +
      [54, 66, 78].map((cy) => circle(30, cy, 6, fill(C.green, C.greenLine, 'stroke-width="2"'))).join('') +
      ellipse(30, 26, 22, 20, BLUE)),

  // ---- Proteins ----
  def('kinase', 'Kinase', PROTEINS, 'kinase,phosphorylation,enzyme,signalling,atp', 92, 80,
    ellipse(46, 54, 34, 22, BLUE) + ellipse(42, 24, 24, 17, BLUE) + circle(78, 26, 11, fill(C.lipid, C.lipidLine)) + label(78, 31, 14, '#7a5c00', 'P')),
  def('phosphatase', 'Phosphatase', PROTEINS, 'phosphatase,dephosphorylation,enzyme,pten,pp2a', 92, 80,
    `<path d="M18 32C22 12 48 6 58 16L50 30L68 34C86 40 86 60 72 68C58 78 34 76 22 66C8 54 12 44 18 32Z" ${GREEN}/>` +
      circle(78, 14, 11, fill(C.lipid, C.lipidLine)) + label(78, 19, 14, '#7a5c00', 'P')),
  def('protease', 'Protease', PROTEINS, 'protease,peptidase,cleavage,proteolysis,mmp', 100, 84,
    line('M12 68H40M60 70L86 76', C.greyLine, 2) +
      [[12, 68], [26, 68], [40, 68], [60, 70], [73, 73], [86, 76]].map(([x, y]) => circle(x, y, 6, fill(C.orange, C.orangeLine, 'stroke-width="1.5"'))).join('') +
      `<path d="M20 30C20 12 40 6 54 8C70 10 82 20 80 34C78 44 66 46 58 46L50 60L44 46C30 46 20 42 20 30Z" ${PINK}/>`),
  def('caspase', 'Caspase', PROTEINS, 'caspase,apoptosis,pyroptosis,protease,cell death', 90, 80,
    rect(6, 8, 40, 30, 8, RED) + rect(50, 8, 34, 30, 8, fill('#f9cfce', C.redLine)) +
      rect(6, 42, 34, 30, 8, fill('#f9cfce', C.redLine)) + rect(44, 42, 40, 30, 8, RED)),
  def('g-protein', 'G protein (trimer)', PROTEINS, 'g protein,heterotrimeric,galpha,gbeta,ggamma,gpcr signalling', 100, 84,
    ellipse(34, 40, 28, 24, ORANGE) + circle(72, 36, 18, BLUE) + ellipse(76, 64, 14, 9, TEAL) +
      label(34, 46, 18, '#8a4a06', 'α') + label(72, 41, 15, '#1d4f86', 'β') + label(76, 68, 11, '#0f5a53', 'γ')),
  def('small-gtpase', 'Small GTPase', PROTEINS, 'gtpase,ras,rho,rab,rac,gtp,molecular switch', 76, 70,
    circle(33, 37, 27, GREEN) + circle(60, 18, 11, fill(C.lipid, C.lipidLine))),
  def('ubiquitin', 'Ubiquitin', PROTEINS, 'ubiquitin,ub,ubiquitination,degradation,tag', 50, 50,
    circle(25, 25, 21, PINK) + label(25, 31, 17, '#7d2a5b', 'Ub')),
  def('ubiquitin-chain', 'Ubiquitin chain', PROTEINS, 'polyubiquitin,ubiquitin chain,k48,k63,proteasome', 112, 62,
    line('M16 42L42 22L68 42L94 22', C.pinkLine, 3) +
      [[16, 42], [42, 22], [68, 42], [94, 22]].map(([x, y]) => circle(x, y, 13.5, PINK) + label(x, y + 4, 11, '#7d2a5b', 'Ub')).join('')),
  def('chaperone', 'Chaperone', PROTEINS, 'chaperone,chaperonin,hsp,protein folding,groel', 80, 92,
    `<path d="M16 30Q16 8 40 8Q64 8 64 30Z" ${fill('#d3f0ec', C.tealLine)}/>` + rect(12, 30, 56, 27, 9, TEAL) + rect(12, 57, 56, 27, 9, TEAL) +
      line('M31 30V57M49 30V57M31 57V84M49 57V84', C.tealLine, 1.5)),
  def('motor-protein', 'Motor protein', PROTEINS, 'kinesin,dynein,myosin,motor,cargo transport,microtubule', 90, 112,
    rect(4, 98, 82, 10, 5, GREEN) + line('M28 80Q32 62 43 56M58 80Q54 62 43 56M43 56V26', C.blueLine, 4) +
      ellipse(28, 88, 14, 10, BLUE) + ellipse(58, 88, 14, 10, BLUE) + circle(43, 15, 11, fill('#e9f3fb', C.blueLine, 'stroke-width="3"'))),
  def('cytokine', 'Cytokine', PROTEINS, 'cytokine,interleukin,interferon,tnf,chemokine,signal', 50, 50,
    [[17, 17], [33, 17], [17, 33], [33, 33]].map(([x, y]) => circle(x, y, 11, PURPLE)).join('') + circle(25, 25, 11, `fill="${C.nuc}" stroke="none"`)),
  def('hormone', 'Steroid hormone', PROTEINS, 'hormone,steroid,cortisol,oestrogen,testosterone,endocrine', 72, 46, steroid()),
  def('complement-protein', 'Complement protein', PROTEINS, 'complement,c3,c5,innate immunity,opsonisation', 90, 80,
    `<path d="M32 26C40 10 62 8 74 22C88 38 84 60 68 70C52 80 30 76 22 60C16 48 24 40 32 26Z" ${ORANGE}/>` +
      circle(16, 18, 11, fill('#fde0bd', C.orangeLine))),
  def('inflammasome', 'Inflammasome', PROTEINS, 'inflammasome,nlrp3,asc,caspase-1,pyroptosis,il-1', 100, 100, inflammasome()),
  def('protein-complex', 'Protein complex', PROTEINS, 'complex,multimer,subunits,assembly,interaction', 100, 80,
    ellipse(34, 32, 24, 20, BLUE) + ellipse(66, 34, 22, 18, TEAL) + ellipse(46, 56, 26, 16, ORANGE) + circle(79, 58, 12, PINK)),
  def('alpha-helix', 'α-helix', PROTEINS, 'alpha helix,secondary structure,helix,transmembrane domain', 120, 50,
    rect(6, 10, 108, 30, 15, PINK) + line('M28 10L18 40M45 10L35 40M62 10L52 40M79 10L69 40M96 10L86 40', C.pinkLine, 2)),
  def('beta-sheet', 'β-sheet', PROTEINS, 'beta sheet,beta strand,secondary structure,amyloid', 112, 76,
    betaStrand(4, false) + betaStrand(27, true) + betaStrand(50, false)),
  def('signal-peptide', 'Signal peptide', PROTEINS, 'signal peptide,targeting sequence,signal sequence,secretion,import', 112, 40,
    line('M40 20q9 -14 18 0t18 0t18 0t14 0', C.blueLine, 4) + rect(6, 11, 36, 18, 9, RED)),
  def('collagen-fibre', 'Collagen fibre', PROTEINS, 'collagen,triple helix,extracellular matrix,fibrosis,ecm', 130, 40, collagen()),
  def('fibrin', 'Fibrin mesh', PROTEINS, 'fibrin,clot,coagulation,thrombus,fibrinogen', 100, 80,
    line('M6 22L94 30M8 58L94 50M20 6L32 74M58 6L50 74M86 8L76 72M6 40L46 24L94 68', C.orangeLine, 3)),
  def('elastin', 'Elastin', PROTEINS, 'elastin,elastic fibre,extracellular matrix,vessel wall', 124, 40,
    line('M27 12V28M55 12V28M83 12V28M111 12V28', C.greenLine, 2.5) +
      line('M6 12q7 -9 14 0t14 0t14 0t14 0t14 0t14 0t14 0t14 0', C.tealLine, 3.5) +
      line('M6 28q7 9 14 0t14 0t14 0t14 0t14 0t14 0t14 0t14 0', C.tealLine, 3.5)),
  def('proteoglycan', 'Proteoglycan', PROTEINS, 'proteoglycan,glycosaminoglycan,gag,aggrecan,extracellular matrix', 90, 100,
    line([16, 26, 36, 46, 56, 66, 76, 86].map((y) => `M45 ${y}L18 ${y - 7}M45 ${y}L72 ${y - 7}`).join(''), C.greenLine, 2.5) +
      line('M45 8V92', C.blueLine, 4)),
  def('ldl-particle', 'LDL particle', PROTEINS, 'ldl,lipoprotein,cholesterol,apob,atherosclerosis', 80, 80,
    lipoprotein(80, '#fdf0b8', C.lipidLine, 21, line('M9 28Q40 52 71 28', C.blueLine, 6))),
  def('hdl-particle', 'HDL particle', PROTEINS, 'hdl,lipoprotein,cholesterol,apoa1,reverse cholesterol transport', 62, 62,
    lipoprotein(62, '#e6f4d9', '#5f9a2f', 13, line('M8 23Q31 39 54 23M8 39Q31 23 54 39', C.nucLine, 4))),
  def('igm', 'IgM (pentamer)', PROTEINS, 'igm,antibody,pentamer,immunoglobulin,primary response', 120, 120, igm()),
  def('iga', 'IgA (dimer)', PROTEINS, 'iga,antibody,dimer,mucosal,secretory', 120, 70,
    line('M54 35H34L18 20M34 35L18 50M66 35H86L102 20M86 35L102 50', C.blueLine, 6) + circle(60, 35, 7, ORANGE)),
  def('cas9', 'Cas9 with guide RNA', PROTEINS, 'cas9,crispr,genome editing,guide rna,nuclease', 110, 90,
    line('M4 52H106M4 60H106', C.blueLine, 3) +
      `<path d="M24 34C26 14 50 6 68 12C88 18 96 36 90 52C86 70 70 82 50 80C30 80 18 62 24 34Z" ${fill('#ddd3f4', C.nucLine)}/>` +
      line('M38 56H64C71 56 73 48 67 44C61 40 63 30 71 30C79 30 79 20 73 15', C.redLine, 3.5)),
  def('polymerase', 'Polymerase', PROTEINS, 'polymerase,rna polymerase,dna polymerase,transcription,replication', 110, 80,
    line('M4 52H106M4 59H106', C.blueLine, 3) + ellipse(56, 46, 30, 24, ORANGE) + line('M50 42C44 28 32 26 24 10', C.redLine, 3.5)),
  def('helicase', 'Helicase', PROTEINS, 'helicase,unwinding,replication fork,dna repair', 100, 70, helicase()),
]
