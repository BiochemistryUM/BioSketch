// Organelles, cytoskeleton, and membrane structures and junctions. Drawn for BioSketch from the
// biology itself (not from any other collection's artwork) and released as CC0.

import type { IconDef } from '../model/types'
import { C, MEM_FILL, MEM_LINE, circle, def, ellipse, fill, line, membrane, network, r1, rect, ribbon, shape } from './draw'

const ORGANELLES = 'Organelles'
const MEMBRANE = 'Membrane & junctions'

const dot = (cx: number, cy: number, r: number, colour: string): string => circle(cx, cy, r, `fill="${colour}" stroke="none"`)

function exosome(): string {
  let stubs = ''
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3 + Math.PI / 6
    const cos = Math.cos(a)
    const sin = Math.sin(a)
    stubs +=
      line(`M${r1(38 + 28 * cos)} ${r1(38 + 28 * sin)}L${r1(38 + 34 * cos)} ${r1(38 + 34 * sin)}`, C.blueLine, 2.5) +
      dot(r1(38 + 35 * cos), r1(38 + 35 * sin), 2.8, C.blueLine)
  }
  return (
    stubs +
    circle(38, 38, 26, fill('#fff3d6', C.goldLine, 'stroke-width="4"')) +
    line('M24 36q4 -7 8 0t8 0t8 0', C.redLine, 2.5) +
    dot(30, 48, 3.5, C.blueLine) + dot(44, 50, 3.5, C.tealLine) + dot(46, 26, 3, C.blueLine)
  )
}

function polysome(): string {
  let out = line('M6 56H124', C.redLine, 3)
  ;[22, 50, 78, 106].forEach((x, i) => {
    out += line(`M${x} 37${'q3 -1.5 0 -3q-3 -1.5 0 -3'.repeat(i + 1)}`, C.blueLine, 2.5)
    out += ellipse(x, 46, 11, 9, fill('#d9c5a3', '#8a6a3a', 'stroke-width="2"')) + ellipse(x, 59, 9, 5, fill('#ecdfc8', '#8a6a3a', 'stroke-width="2"'))
  })
  return out
}

function actin(): string {
  let back = ''
  let front = ''
  for (let i = 0; i < 11; i++) {
    const wobble = 3 * Math.sin(i * 0.6)
    back += circle(r1(15.5 + i * 11), r1(22 - wobble), 6, fill('#f9cfce', C.redLine, 'stroke-width="1.5"'))
    front += circle(10 + i * 11, r1(14 + wobble), 6, fill(C.red, C.redLine, 'stroke-width="1.5"'))
  }
  return back + front
}

function microtubule(): string {
  let out = ''
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 11; i++) {
      const alpha = (i + row) % 2 === 0
      out += circle(10 + i * 11, 9 + row * 10.5, 5.5, fill(alpha ? C.green : '#8fd0a3', C.greenLine, 'stroke-width="1.2"'))
    }
  }
  return out
}

function twoStrandRope(colours: [string, string], width: number, length: number, mid: number, amp: number): string {
  return colours
    .map((colour, k) => {
      const pts: string[] = []
      for (let x = 6; x <= length - 6; x += 2) pts.push(`${x} ${r1(mid + amp * Math.sin((2 * Math.PI * (x - 6)) / 34 + k * Math.PI))}`)
      return line(`M${pts.join('L')}`, colour, width)
    })
    .join('')
}

function flagellum(): string {
  const pts: string[] = []
  for (let x = 18; x <= 134; x += 2) pts.push(`${x} ${r1(25 + 13 * Math.sin((2 * Math.PI * (x - 18)) / 58))}`)
  return ribbon(`M${pts.join('L')}`, '#5f9a2f', '#cfe8b6', 5) + circle(13, 25, 9, fill(C.gold, C.goldLine))
}

/** A bilayer drawn lipid by lipid, with an ordered patch in the middle (the raft). */
function lipidRaft(): string {
  let tails = ''
  let heads = ''
  let sterols = ''
  for (let x = 9; x <= 121; x += 9) {
    const inRaft = x > 40 && x < 90
    const top = inRaft ? 14 : 20
    const bottom = inRaft ? 60 : 54
    tails += `M${x} ${top + 5}V36M${x} ${bottom - 5}V38`
    const style = inRaft ? fill(C.red, C.redLine, 'stroke-width="1.5"') : fill(C.orange, C.orangeLine, 'stroke-width="1.5"')
    heads += circle(x, top, 4, style) + circle(x, bottom, 4, style)
    if (inRaft && x < 85) {
      sterols += ellipse(x + 4.5, 27, 2.2, 6, fill(C.lipid, C.lipidLine, 'stroke-width="1"')) + ellipse(x + 4.5, 47, 2.2, 6, fill(C.lipid, C.lipidLine, 'stroke-width="1"'))
    }
  }
  return line(tails, C.lipidLine, 1.8) + sterols + heads
}

function coat(cx: number, cy: number, inner: number, outer: number, from: number, to: number, step: number, colour: string): string {
  let d = ''
  for (let deg = from; deg <= to; deg += step) {
    const a = (deg * Math.PI) / 180
    d += `M${r1(cx + inner * Math.cos(a))} ${r1(cy + inner * Math.sin(a))}L${r1(cx + outer * Math.cos(a))} ${r1(cy + outer * Math.sin(a))}`
  }
  return line(d, colour, 2.5)
}

const PURPLE = fill(C.nuc, C.nucLine)
const GREEN = fill(C.green, C.greenLine)

/**
 * A mitochondrion cut open, with each layer a shape of its own colour: the outer membrane (a band
 * between two outlines), the intermembrane space, the inner membrane folded into cristae, and the
 * matrix inside it with its DNA and ribosomes.
 */
function mitochondrionLayers(): string {
  // The inner membrane runs along the outer one and folds inwards as fingers, from the top and
  // the bottom in turn. Each fold is open towards the intermembrane space.
  const fold = 6
  let d = 'M50 18'
  for (const x of [57, 105, 153]) d += `H${x - fold}V50C${x - fold} 58 ${x + fold} 58 ${x + fold} 50V18`
  d += 'H160C177.7 18 192 32.3 192 50C192 67.7 177.7 82 160 82'
  for (const x of [129, 81]) d += `H${x + fold}V50C${x + fold} 42 ${x - fold} 42 ${x - fold} 50V82`
  d += 'H50C32.3 82 18 67.7 18 50C18 32.3 32.3 18 50 18Z'
  const ribosome = fill('#a8763f', '#a8763f', 'stroke-width="1"')
  return (
    rect(3, 3, 204, 94, 47, fill(C.mito, C.mitoLine)) +
    rect(9, 9, 192, 82, 41, fill('#fff3ea', C.mitoLine, 'stroke-width="2"')) +
    shape(d, fill('#fdeab5', C.redLine)) +
    ribbon(d, C.redLine, C.red, 2) +
    circle(34.5, 50, 7, `fill="none" stroke="${C.nucLine}" stroke-width="2.2"`) +
    circle(81, 30, 1.8, ribosome) + circle(129, 30, 1.8, ribosome) + circle(57, 70, 1.8, ribosome) + circle(105, 70, 1.8, ribosome) +
    circle(153, 70, 1.8, ribosome) + circle(177, 41, 1.8, ribosome) + circle(175, 60, 1.8, ribosome) + circle(36, 32, 1.8, ribosome) + circle(37, 68, 1.8, ribosome)
  )
}

export const ORGANELLE_ICONS: IconDef[] = [
  // ---- Organelles and cell structures ----
  def('nuclear-pore', 'Nuclear pore', ORGANELLES, 'nuclear pore complex,npc,nuclear envelope,import,export,nucleoporin', 100, 80,
    membrane('M4 30H34Q42 30 42 40Q42 50 34 50H4') + membrane('M96 30H66Q58 30 58 40Q58 50 66 50H96') +
      line('M43 28L37 12M50 28V10M57 28L63 12', C.nucLine, 2.5) + line('M43 52Q50 78 57 52', C.nucLine, 2.5) +
      rect(39, 27, 8, 26, 4, PURPLE) + rect(53, 27, 8, 26, 4, PURPLE) + circle(50, 67, 3.5, PURPLE)),
  def('nucleolus', 'Nucleolus', ORGANELLES, 'nucleolus,ribosome biogenesis,rrna,nuclear body', 80, 80,
    `<path d="M42 6C60 4 76 20 74 42C72 62 58 76 38 74C20 72 6 58 8 38C10 20 24 8 42 6Z" ${fill('#9c86d6', C.nucLine)}/>` +
      dot(30, 30, 9, C.nuc) + dot(50, 44, 11, C.nuc) + dot(32, 55, 7, C.nuc)),
  def('mitochondrion-layers', 'Mitochondrion (outer and inner membrane)', ORGANELLES, 'mitochondria,omm,imm,outer membrane,inner membrane,matrix,cristae,intermembrane space,mtdna,cut-away,cross-section', 210, 100, mitochondrionLayers()),
  def('mitochondrial-network', 'Mitochondrial network', ORGANELLES, 'mitochondria,network,fusion,fission,tubular,dynamics', 130, 90,
    network(['M10 72C30 62 40 42 60 46C80 50 92 30 118 22', 'M60 46C66 62 86 72 114 74', 'M36 56C32 38 24 28 12 18'], C.mitoLine, C.mito, 9)),
  def('smooth-er', 'Smooth ER', ORGANELLES, 'smooth endoplasmic reticulum,ser,tubules,lipid synthesis,calcium store', 110, 90,
    network(
      ['M10 24C30 10 50 34 70 20S100 26 102 40', 'M12 50C30 40 48 62 66 48S96 54 100 66', 'M20 78C40 68 60 86 88 78', 'M38 22C34 36 40 42 34 50', 'M72 22C76 34 68 42 70 48', 'M52 54C50 64 56 72 52 80'],
      C.greenLine, C.green, 6)),
  def('endosome', 'Endosome', ORGANELLES, 'endosome,multivesicular body,mvb,sorting,endocytic pathway', 84, 84,
    ribbon('M56 26L74 8', C.blueLine, '#e9f3fb', 7) + circle(40, 46, 30, fill('#e9f3fb', C.blueLine, 'stroke-width="4"')) +
      circle(30, 40, 6.5, fill(C.blue, C.blueLine, 'stroke-width="1.5"')) + circle(48, 38, 6.5, fill(C.blue, C.blueLine, 'stroke-width="1.5"')) +
      circle(38, 56, 6.5, fill(C.blue, C.blueLine, 'stroke-width="1.5"')) + circle(54, 54, 5, fill(C.blue, C.blueLine, 'stroke-width="1.5"'))),
  def('peroxisome', 'Peroxisome', ORGANELLES, 'peroxisome,catalase,beta oxidation,pex,hydrogen peroxide', 70, 70,
    circle(35, 35, 30, fill('#e3f0d2', '#6a9a3a')) + `<rect x="24" y="24" width="22" height="22" rx="2" transform="rotate(45 35 35)" ${fill('#a9cf80', '#6a9a3a', 'stroke-width="2"')}/>`),
  def('exosome', 'Exosome', ORGANELLES, 'exosome,extracellular vesicle,ev,microvesicle,cargo,secretion', 76, 76, exosome()),
  def('polysome', 'Polysome', ORGANELLES, 'polysome,polyribosome,translation,mrna,nascent peptide', 130, 70, polysome()),
  def('proteasome', 'Proteasome', ORGANELLES, 'proteasome,26s,degradation,ubiquitin,proteolysis', 60, 108,
    `<path d="M18 30Q13 12 30 8Q47 12 42 30Z" ${PURPLE}/>` + `<path d="M18 78Q13 96 30 100Q47 96 42 78Z" ${PURPLE}/>` +
      rect(14, 30, 32, 12, 4, fill(C.blue, C.blueLine)) + rect(14, 42, 32, 12, 4, fill(C.teal, C.tealLine)) +
      rect(14, 54, 32, 12, 4, fill(C.teal, C.tealLine)) + rect(14, 66, 32, 12, 4, fill(C.blue, C.blueLine))),
  def('centrosome', 'Centrosome', ORGANELLES, 'centrosome,centriole,mtoc,spindle pole,microtubule organising', 80, 80,
    circle(40, 40, 34, fill('#f3eefc', C.nucLine, 'stroke-dasharray="5 5" stroke-width="2"')) +
      rect(20, 22, 14, 36, 3, GREEN) + line('M24.7 22V58M29.3 22V58', C.greenLine, 1.5) +
      rect(40, 28, 28, 14, 3, GREEN) + line('M40 32.7H68M40 37.3H68', C.greenLine, 1.5)),
  def('actin-filament', 'Actin filament', ORGANELLES, 'actin,f-actin,microfilament,cytoskeleton,stress fibre', 130, 36, actin()),
  def('microtubule', 'Microtubule', ORGANELLES, 'microtubule,tubulin,cytoskeleton,spindle,protofilament', 130, 40, microtubule()),
  def('intermediate-filament', 'Intermediate filament', ORGANELLES, 'intermediate filament,vimentin,keratin,desmin,lamin,cytoskeleton', 130, 30,
    twoStrandRope(['#b9a3e3', C.nucLine], 5, 130, 15, 6)),
  def('cilium', 'Cilium', ORGANELLES, 'cilium,primary cilium,axoneme,basal body,ciliopathy', 60, 128,
    rect(22, 104, 16, 20, 3, GREEN) + line('M26 104V18M34 104V18', C.greenLine, 3) + membrane('M4 110H18V20Q18 6 30 6Q42 6 42 20V110H56')),
  def('flagellum', 'Flagellum', ORGANELLES, 'flagellum,motility,sperm tail,bacterial flagellum,swimming', 140, 50, flagellum()),
  def('vacuole', 'Vacuole', ORGANELLES, 'vacuole,storage,plant cell,yeast,tonoplast', 90, 90,
    `<path d="M44 6C66 4 86 20 84 46C82 70 64 86 42 84C20 82 4 64 8 40C10 20 24 8 44 6Z" ${fill('#e4f3fb', '#4a90c4')}/>` +
      line('M22 34Q28 20 42 16', '#ffffff', 4)),
  def('chloroplast', 'Chloroplast', ORGANELLES, 'chloroplast,photosynthesis,thylakoid,grana,plant', 120, 70,
    ellipse(60, 35, 55, 30, fill('#cfe8b6', '#5f9a2f')) + line('M42 34H50M70 34H78', '#5f9a2f', 2) +
      [22, 50, 78].map((x) => [22, 31, 40].map((y) => `<rect x="${x}" y="${y}" width="20" height="6" rx="3" fill="#5f9a2f" stroke="none"/>`).join('')).join('')),
  def('stress-granule', 'Stress granule', ORGANELLES, 'stress granule,condensate,phase separation,membraneless,rnp granule,p-body', 80, 80,
    circle(40, 40, 31, fill('#fde9c8', C.orangeLine, 'stroke-dasharray="5 5"')) +
      line('M22 34q4 -7 8 0t8 0M38 54q4 -7 8 0t8 0', C.redLine, 2.5) +
      dot(52, 30, 5, C.blueLine) + dot(28, 50, 4.5, C.tealLine) + dot(56, 44, 4, C.nucLine) + dot(40, 24, 3.5, C.tealLine)),

  // ---- Membrane and junctions ----
  def('cholesterol', 'Cholesterol', MEMBRANE, 'cholesterol,sterol,lipid,membrane fluidity,ldl', 50, 100,
    line('M25 64q6 8 0 16q-6 8 0 15', C.lipidLine, 3.5) + rect(14, 22, 22, 44, 8, fill(C.lipid, C.lipidLine)) +
      line('M14 37H36M14 51H36', C.lipidLine, 1.5) + circle(25, 12, 8, fill(C.orange, C.orangeLine))),
  def('lipid-raft', 'Lipid raft', MEMBRANE, 'lipid raft,microdomain,cholesterol,sphingolipid,ordered domain', 130, 74, lipidRaft()),
  def('tight-junction', 'Tight junction', MEMBRANE, 'tight junction,claudin,occludin,zo-1,barrier,paracellular', 100, 110,
    `<rect x="4" y="6" width="34" height="98" rx="6" fill="${C.cell}" stroke="none"/><rect x="62" y="6" width="34" height="98" rx="6" fill="${C.cell}" stroke="none"/>` +
      membrane('M40 6V104') + membrane('M60 6V104') +
      [24, 38, 52].map((y) => circle(46, y, 5, PURPLE) + circle(54, y, 5, PURPLE)).join('')),
  def('gap-junction', 'Gap junction', MEMBRANE, 'gap junction,connexin,connexon,cell coupling,channel', 100, 100,
    membrane('M6 36H94') + membrane('M6 64H94') +
      [26, 50, 74].map((x) =>
        rect(x - 8, 26, 16, 23, 4, fill(C.teal, C.tealLine)) + rect(x - 8, 51, 16, 23, 4, fill(C.teal, C.tealLine)) +
        line(`M${x} 30V70`, '#ffffff', 3) + dot(x, 50, 2.5, C.orangeLine)).join('')),
  def('desmosome', 'Desmosome', MEMBRANE, 'desmosome,desmoglein,desmoplakin,keratin,adhesion,epithelium', 110, 100,
    line('M34 36C18 30 12 20 4 14M34 50H4M34 64C18 70 12 80 4 86M76 36C92 30 98 20 106 14M76 50H106M76 64C92 70 98 80 106 86', '#b58a3c', 2.5) +
      membrane('M46 6V94') + membrane('M64 6V94') +
      line([34, 42, 50, 58, 66].map((y) => `M50 ${y}H60`).join(''), C.nucLine, 2.5) +
      rect(33, 28, 9, 44, 3, fill('#9c86d6', C.nucLine)) + rect(68, 28, 9, 44, 3, fill('#9c86d6', C.nucLine))),
  def('focal-adhesion', 'Focal adhesion', MEMBRANE, 'focal adhesion,integrin,talin,vinculin,fak,extracellular matrix,stress fibre', 120, 100,
    line('M6 90H114M12 96H108', '#e59a78', 3) + line('M48 20L86 4M62 20L104 6', C.redLine, 3) +
      membrane('M6 46H114') +
      [42, 60, 78].map((x) => line(`M${x - 3} 30V82M${x + 3} 30V82`, C.blueLine, 3) + dot(x - 3, 84, 3.5, C.blueLine) + dot(x + 3, 84, 3.5, C.blueLine)).join('') +
      rect(30, 18, 60, 14, 7, fill(C.orange, C.orangeLine))),
  def('endocytosis', 'Endocytosis', MEMBRANE, 'endocytosis,clathrin,coated pit,uptake,internalisation', 120, 90,
    coat(60, 40, 17, 23, 20, 160, 28, C.nucLine) + membrane('M6 24H42Q46 24 46 30V40A14 14 0 0 0 74 40V30Q74 24 78 24H114') +
      dot(56, 40, 3, C.orangeLine) + dot(64, 44, 3, C.orangeLine) + dot(60, 33, 3, C.orangeLine) +
      circle(94, 70, 12, fill('#ffffff', MEM_LINE, 'stroke-width="2"')) + circle(94, 70, 9.5, fill(MEM_FILL, MEM_LINE, 'stroke-width="1"')) +
      dot(91, 68, 2.5, C.orangeLine) + dot(97, 72, 2.5, C.orangeLine)),
  def('exocytosis', 'Exocytosis', MEMBRANE, 'exocytosis,secretion,vesicle fusion,snare,release', 120, 90,
    membrane('M6 30H50Q54 30 54 36A16 16 0 1 0 66 36Q66 30 70 30H114') +
      dot(52, 16, 3, C.orangeLine) + dot(60, 9, 3, C.orangeLine) + dot(68, 16, 3, C.orangeLine) + dot(60, 22, 3, C.orangeLine) +
      dot(60, 48, 3, C.orangeLine) + dot(53, 56, 3, C.orangeLine) + dot(67, 56, 3, C.orangeLine)),
  def('phagocytosis', 'Phagocytosis', MEMBRANE, 'phagocytosis,engulfment,pseudopod,phagosome,macrophage', 130, 100,
    `<rect x="50" y="34" width="30" height="18" rx="9" transform="rotate(-12 65 43)" ${fill('#cfe8b6', '#5f9a2f')}/>` +
      membrane('M6 74H30C24 52 30 24 50 20C56 19 58 24 54 28C42 36 42 54 50 64Q65 76 80 64C88 54 88 36 76 28C72 24 74 19 80 20C100 24 106 52 100 74H124')),
  def('caveola', 'Caveola', MEMBRANE, 'caveola,caveolin,cavin,flask,mechanosensing,transcytosis', 110, 80,
    membrane('M6 24H46Q50 24 50 28V34A13 13 0 1 0 60 34V28Q60 24 64 24H104') +
      [200, 240, 280, 320, 0, 40, 80, 120, 160].map((deg) => {
        const a = (deg * Math.PI) / 180
        return dot(r1(55 + 20 * Math.cos(a)), r1(46 + 20 * Math.sin(a)), 2.8, C.redLine)
      }).filter((_, i) => i !== 2).join('')),
]
