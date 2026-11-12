// Cell types: blood and immune cells, tissue cells, and cell states. Drawn for BioSketch from the
// biology itself (not from any other collection's artwork) and released as CC0.

import type { IconDef } from '../model/types'
import { C, circle, def, ellipse, fill, line, r1, rect } from './draw'

const CELLS = 'Cells'

const NUC = fill('#b9a3e3', C.nucLine)
const NUC_SOFT = fill(C.nuc, C.nucLine)
const BONE = fill('#f3ead7', '#b59b6a')

const shape = (d: string, attrs: string): string => `<path d="${d}" ${attrs}/>`
const dots = (pts: [number, number][], r: number, colour: string): string =>
  pts.map(([x, y]) => circle(x, y, r, `fill="${colour}" stroke="none"`)).join('')
const rings = (pts: [number, number][], r: number, attrs: string): string => pts.map(([x, y]) => circle(x, y, r, attrs)).join('')
const thin = 'stroke-width="1.5"'

/** A rounded, slightly irregular outline: a circle or oval whose radius wobbles `bumps` times. */
function blob(cx: number, cy: number, rx: number, ry: number, bumps: number, amp: number, phase = 0): string {
  const pts: string[] = []
  for (let deg = 0; deg < 360; deg += 6) {
    const a = (deg * Math.PI) / 180
    const k = 1 + amp * Math.sin(bumps * a + phase)
    pts.push(`${r1(cx + rx * k * Math.cos(a))} ${r1(cy + ry * k * Math.sin(a))}`)
  }
  return `M${pts.join('L')}Z`
}

/** A nucleus made of lobes joined by thin strands (as in granulocytes). */
function lobes(pts: [number, number][], r: number): string {
  return line(`M${pts.map((p) => p.join(' ')).join('L')}`, C.nucLine, 3) + rings(pts, r, NUC)
}

/** One process (arm) of a cell, from its centre outwards, optionally curved. */
function arm(cx: number, cy: number, deg: number, length: number, bend = 0): string {
  const a = (deg * Math.PI) / 180
  const b = ((deg + bend) * Math.PI) / 180
  return `M${cx} ${cy}Q${r1(cx + length * 0.55 * Math.cos(b))} ${r1(cy + length * 0.55 * Math.sin(b))} ${r1(cx + length * Math.cos(a))} ${r1(cy + length * Math.sin(a))}`
}

/** A side branch leaving an arm part-way along it. */
function twig(cx: number, cy: number, deg: number, at: number, turn: number, length: number): string {
  const a = (deg * Math.PI) / 180
  const t = ((deg + turn) * Math.PI) / 180
  const x = cx + at * Math.cos(a)
  const y = cy + at * Math.sin(a)
  return `M${r1(x)} ${r1(y)}L${r1(x + length * Math.cos(t))} ${r1(y + length * Math.sin(t))}`
}

/** A cell body with processes that merge seamlessly into it. */
function processCell(cx: number, cy: number, r: number, arms: string[], bg: string, stroke: string, width: number): string {
  return (
    arms.map((d) => line(d, stroke, width + 5)).join('') +
    circle(cx, cy, r, fill(bg, stroke)) +
    arms.map((d) => line(d, bg, width)).join('') +
    circle(cx, cy, r - 1.25, `fill="${bg}" stroke="none"`)
  )
}

const round = (bg: string, stroke: string, r = 40): string => circle(45, 45, r, fill(bg, stroke))

// ---------- generated cells ----------

function dendriticCell(): string {
  const arms = [10, 52, 95, 140, 185, 228, 272, 318].map((deg, i) => arm(55, 55, deg, i % 2 ? 44 : 38, i % 2 ? 18 : -18))
  return processCell(55, 55, 20, arms, '#ece3fa', C.nucLine, 6) + ellipse(55, 55, 11, 9, NUC)
}

function astrocyte(): string {
  const main = [20, 75, 130, 180, 235, 290, 340]
  const arms = main.map((deg, i) => arm(60, 60, deg, i % 2 ? 46 : 40, i % 2 ? 14 : -14))
  const twigs = main.map((deg, i) => twig(60, 60, deg, 28, i % 2 ? -40 : 40, 15))
  return processCell(60, 60, 17, [...arms, ...twigs], '#fbe7c6', C.orangeLine, 5) + ellipse(60, 60, 10, 8, NUC)
}

function microglia(): string {
  const main = [15, 80, 140, 200, 260, 320]
  const arms = main.map((deg, i) => arm(60, 55, deg, i % 2 ? 44 : 38, i % 2 ? -16 : 16))
  const twigs = main.flatMap((deg) => [twig(60, 55, deg, 22, 45, 14), twig(60, 55, deg, 32, -40, 12)])
  return processCell(60, 55, 12, [...arms, ...twigs], '#dff3ea', C.greenLine, 2.5) + circle(60, 55, 6.5, NUC)
}

function megakaryocyte(): string {
  const buds: [number, number][] = [[104, 30], [110, 56], [102, 82], [86, 98]]
  return (
    line('M88 36L102 31M92 56H108M88 74L100 80M76 86L85 96', C.pinkLine, 2) +
    shape(blob(52, 56, 42, 44, 6, 0.07), fill('#f3e3f2', C.pinkLine)) +
    rings([[40, 46], [56, 40], [66, 54], [56, 68], [42, 64], [50, 54]], 11, NUC) +
    buds.map(([x, y]) => ellipse(x, y, 7, 5, fill('#f6d7e6', C.pinkLine, thin))).join('')
  )
}

function foamCell(): string {
  const droplets: [number, number, number][] = [[36, 34, 8], [56, 28, 7], [74, 40, 8], [30, 56, 7], [50, 48, 9], [70, 62, 8], [44, 70, 8], [62, 78, 6], [84, 54, 6]]
  return (
    shape(blob(55, 52, 44, 40, 6, 0.08, 1), fill('#d7ecf9', '#4a90c4')) +
    droplets.map(([x, y, r]) => circle(x, y, r, fill(C.lipid, C.lipidLine, thin))).join('') +
    shape('M20 66C24 58 34 62 36 72C38 82 28 86 22 80C18 76 18 70 20 66Z', NUC)
  )
}

function blastocyst(): string {
  let ring = ''
  for (let k = 0; k < 15; k++) {
    const a = (k * 2 * Math.PI) / 15
    ring += circle(r1(50 + 37 * Math.cos(a)), r1(50 + 37 * Math.sin(a)), 7.6, fill('#dbeaf9', C.blueLine, thin))
  }
  return circle(50, 50, 37, `fill="#f4f9fd" stroke="none"`) + ring + rings([[26, 42], [24, 56], [36, 50], [34, 64], [36, 36]], 8, fill(C.orange, C.orangeLine, thin))
}

function packed(cx: number, cy: number, rx: number, ry: number, spacing: number, r: number, attrs: string): string {
  let out = ''
  let row = 0
  for (let y = cy - ry; y <= cy + ry; y += spacing * 0.87, row++) {
    for (let x = cx - rx + (row % 2 ? spacing / 2 : 0); x <= cx + rx; x += spacing) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) out += circle(r1(x), r1(y), r, attrs)
    }
  }
  return out
}

function organoid(): string {
  let nuclei = ''
  for (let deg = 0; deg < 360; deg += 30) {
    const a = (deg * Math.PI) / 180
    const k = 1 + 0.2 * Math.sin(5 * a)
    nuclei += circle(r1(55 + 29 * k * Math.cos(a)), r1(50 + 27 * k * Math.sin(a)), 3.4, `fill="${C.nucLine}" stroke="none"`)
  }
  return shape(blob(55, 50, 38, 35, 5, 0.2), fill(C.cell, C.cellLine)) + shape(blob(55, 50, 20, 18, 5, 0.2), fill('#ffffff', C.cellLine, 'stroke-width="2"')) + nuclei
}

function keratinocyte(): string {
  let spikes = ''
  const corners: [number, number][] = [[14, 38], [34, 10], [70, 8], [90, 36], [72, 66], [32, 68]]
  corners.forEach(([x, y], i) => {
    const [nx, ny] = corners[(i + 1) % corners.length]
    for (const t of [0.25, 0.5, 0.75]) {
      const px = x + (nx - x) * t
      const py = y + (ny - y) * t
      const dx = px - 52
      const dy = py - 38
      const len = Math.hypot(dx, dy)
      spikes += `M${r1(px)} ${r1(py)}L${r1(px + (dx / len) * 6)} ${r1(py + (dy / len) * 6)}`
    }
  })
  return (
    line(spikes, '#c9825e', 2) +
    `<polygon points="${corners.map((p) => p.join(',')).join(' ')}" ${fill('#f6c9a8', '#c9825e')}/>` +
    line('M26 40Q40 26 60 24M34 56Q54 58 76 40', '#d9a071', 1.8) +
    ellipse(52, 38, 12, 9, NUC)
  )
}

function striations(x0: number, x1: number, step: number, y0: number, y1: number): string {
  let d = ''
  for (let x = x0; x <= x1; x += step) d += `M${x} ${y0}V${y1}`
  return d
}

function sperm(): string {
  const pts: string[] = []
  for (let x = 36; x <= 126; x += 2) pts.push(`${x} ${r1(20 + 6 * Math.sin((2 * Math.PI * (x - 36)) / 36))}`)
  return (
    line(`M${pts.join('L')}`, C.blueLine, 2.5) + rect(22, 15, 15, 10, 4, fill(C.orange, C.orangeLine, thin)) +
    ellipse(14, 20, 11, 8, fill(C.blue, C.blueLine)) + shape('M4.5 16.5Q2 20 4.5 23.5Q8 20 4.5 16.5Z', `fill="#e9f3fb" stroke="none"`)
  )
}

export const CELL_ICONS: IconDef[] = [
  // ---- Blood and immune cells ----
  def('neutrophil', 'Neutrophil', CELLS, 'neutrophil,granulocyte,pmn,innate immunity,inflammation,net', 90, 90,
    round('#fdeef2', '#d889a6') + dots([[22, 52], [30, 64], [44, 70], [60, 66], [68, 54], [66, 30], [24, 38], [54, 20]], 1.9, '#c9a3d6') +
      lobes([[30, 36], [44, 28], [58, 38], [50, 54]], 9)),
  def('eosinophil', 'Eosinophil', CELLS, 'eosinophil,granulocyte,allergy,parasite,asthma', 90, 90,
    round('#fdeef2', '#d889a6') + lobes([[33, 42], [57, 42]], 12) +
      dots([[22, 30], [34, 20], [50, 18], [64, 26], [70, 40], [68, 56], [56, 66], [42, 70], [28, 64], [20, 50], [45, 58]], 3, '#e9836a')),
  def('basophil', 'Basophil', CELLS, 'basophil,granulocyte,histamine,allergy,ige', 90, 90,
    round('#fdeef2', '#d889a6') + lobes([[34, 44], [56, 44]], 12) +
      dots([[24, 30], [36, 22], [52, 20], [64, 30], [70, 46], [62, 62], [48, 68], [32, 64], [22, 50], [44, 34], [50, 52], [38, 50]], 3.3, '#5a3fa0')),
  def('mast-cell', 'Mast cell', CELLS, 'mast cell,degranulation,histamine,allergy,ige,tryptase', 96, 90,
    ellipse(48, 45, 44, 38, fill('#f1e9fb', C.nucLine)) + circle(48, 45, 12, NUC) +
      dots([[18, 38], [26, 24], [40, 14], [58, 14], [72, 24], [80, 40], [78, 56], [68, 68], [52, 76], [36, 74], [22, 62], [30, 46], [66, 46], [48, 26], [48, 64]], 3.6, '#7b61c4')),
  def('monocyte', 'Monocyte', CELLS, 'monocyte,innate immunity,phagocyte,blood,macrophage precursor', 90, 90,
    round('#e3ecf7', '#6f8fb8') + shape('M28 34C38 22 62 24 66 42C68 58 54 66 46 58C42 54 44 46 38 48C28 52 22 42 28 34Z', NUC)),
  def('dendritic-cell', 'Dendritic cell', CELLS, 'dendritic cell,dc,antigen presenting cell,apc,adaptive immunity', 110, 110, dendriticCell()),
  def('nk-cell', 'NK cell', CELLS, 'nk cell,natural killer,cytotoxic,innate lymphoid,granzyme,perforin', 90, 90,
    round('#dff3ea', C.greenLine) + circle(40, 45, 23, NUC) + dots([[68, 34], [72, 46], [68, 58], [62, 66]], 3.2, C.redLine)),
  def('plasma-cell', 'Plasma cell', CELLS, 'plasma cell,antibody secreting,b cell,immunoglobulin,myeloma', 100, 84,
    ellipse(50, 42, 45, 36, fill('#e6eefb', C.blueLine)) + line('M60 24Q82 42 60 60M67 22Q91 42 67 62M53 28Q72 42 53 56', C.blueLine, 1.8) +
      circle(32, 42, 17, NUC) + dots([[32, 31], [42, 38], [42, 48], [32, 53], [22, 46], [23, 36], [32, 42]], 2.4, C.nucLine)),
  def('platelet', 'Platelets', CELLS, 'platelet,thrombocyte,clotting,coagulation,thrombus', 90, 60,
    shape(blob(24, 24, 15, 11, 5, 0.12), fill('#f6d7e6', C.pinkLine)) + shape(blob(58, 20, 14, 10, 5, 0.12, 2), fill('#f6d7e6', C.pinkLine)) +
      shape(blob(46, 44, 15, 10, 5, 0.12, 4), fill('#f6d7e6', C.pinkLine)) + dots([[20, 22], [28, 26], [56, 18], [62, 22], [42, 44], [50, 46]], 1.8, C.pinkLine)),
  def('megakaryocyte', 'Megakaryocyte', CELLS, 'megakaryocyte,platelet production,bone marrow,polyploid,thrombopoiesis', 120, 110, megakaryocyte()),
  def('foam-cell', 'Foam cell', CELLS, 'foam cell,lipid laden macrophage,atherosclerosis,oxldl,plaque', 110, 100, foamCell()),
  def('sickle-cell', 'Sickle cell', CELLS, 'sickle cell,sickle red blood cell,haemoglobin s,anaemia', 92, 66,
    shape('M8 22C34 2 74 14 84 56C64 34 38 30 10 40C6 34 5 27 8 22Z', fill('#ee7b78', C.redLine))),
  def('hsc', 'Haematopoietic stem cell', CELLS, 'hsc,haematopoietic stem cell,hematopoietic,bone marrow,progenitor,cd34', 90, 90,
    round('#d3f0ec', C.tealLine, 37) + circle(45, 45, 24, NUC) + dots([[38, 38]], 5, C.nucLine)),

  // ---- Tissue cells ----
  def('goblet-cell', 'Goblet cell', CELLS, 'goblet cell,mucus,mucin,muc2,gut,airway', 70, 116,
    shape('M22 110C24 80 14 70 10 50C6 26 16 8 35 8C54 8 64 26 60 50C56 70 46 80 48 110Z', fill(C.cell, C.cellLine)) +
      rings([[26, 28], [42, 24], [34, 40], [48, 42], [22, 46], [36, 56], [48, 58]], 6.5, fill(C.green, C.greenLine, thin)) + ellipse(35, 94, 9, 8, NUC)),
  def('squamous-cell', 'Squamous epithelial cell', CELLS, 'squamous,flat epithelial cell,alveolar type 1,mesothelium,lining', 130, 50,
    `<polygon points="8,26 34,8 88,6 122,20 114,40 54,44 20,40" ${fill('#fbe3d3', C.cellLine)}/>` + circle(66, 25, 9, NUC)),
  def('cuboidal-cell', 'Cuboidal epithelial cell', CELLS, 'cuboidal,epithelial cell,tubule,duct,gland', 70, 70,
    rect(6, 6, 58, 58, 9, fill(C.cell, C.cellLine)) + circle(35, 36, 13, NUC)),
  def('cardiomyocyte', 'Cardiomyocyte', CELLS, 'cardiomyocyte,heart muscle cell,cardiac,sarcomere,intercalated disc', 150, 60,
    shape('M96 14L140 5V22L112 28Z', fill(C.red, C.redLine)) + rect(6, 12, 118, 36, 6, fill(C.red, C.redLine)) +
      line(striations(18, 114, 8, 14, 46), '#d9716f', 1.5) + line('M6 16l4 5l-4 5l4 5l-4 5l4 5', C.redLine, 2.5) + ellipse(64, 30, 13, 8, NUC)),
  def('skeletal-muscle-fibre', 'Skeletal muscle fibre', CELLS, 'skeletal muscle,myofibre,myotube,sarcomere,striated', 160, 44,
    rect(4, 8, 152, 28, 14, fill(C.red, C.redLine)) + line(striations(18, 142, 7, 10, 34), '#d9716f', 1.3) +
      [[30, 12], [70, 12], [112, 12], [50, 32], [92, 32], [132, 32]].map(([x, y]) => ellipse(x, y, 8, 3.4, fill('#b9a3e3', C.nucLine, thin))).join('')),
  def('hepatocyte', 'Hepatocyte', CELLS, 'hepatocyte,liver cell,metabolism,albumin,glycogen', 96, 90,
    `<polygon points="48,6 86,26 84,66 48,84 12,66 10,26" ${fill('#f6d9bf', '#c9825e')}/>` + rings([[38, 42], [59, 50]], 10, NUC) +
      rings([[30, 62], [66, 30], [50, 24], [70, 66]], 3.4, fill(C.lipid, C.lipidLine, 'stroke-width="1.2"'))),
  def('beta-cell', 'Pancreatic beta cell', CELLS, 'beta cell,insulin,islet,pancreas,diabetes,secretory granule', 90, 90,
    round('#e9f3fb', C.blueLine, 38) + circle(36, 46, 14, NUC) +
      [[58, 22], [70, 36], [68, 54], [56, 68], [40, 72], [52, 44], [44, 22], [24, 26]].map(([x, y]) => circle(x, y, 4.8, fill('#ffffff', C.blueLine, 'stroke-width="1.2"')) + circle(x, y, 2.2, `fill="${C.blueLine}" stroke="none"`)).join('')),
  def('keratinocyte', 'Keratinocyte', CELLS, 'keratinocyte,epidermis,skin,keratin,desmosome,prickle cell', 104, 76, keratinocyte()),
  def('pericyte', 'Pericyte', CELLS, 'pericyte,mural cell,capillary,blood-brain barrier,vessel stability', 130, 66,
    rect(6, 34, 118, 18, 9, fill('#fdeeee', C.cellLine)) + line('M26 34V52M48 34V52M84 34V52M106 34V52', '#5f9a2f', 5) + line('M26 34H106', '#5f9a2f', 4) +
      shape('M42 34C48 14 84 14 90 34Z', fill('#cfe8b6', '#5f9a2f')) + ellipse(66, 27, 11, 5.5, NUC)),
  def('osteoblast', 'Osteoblasts', CELLS, 'osteoblast,bone formation,osteoid,mineralisation,runx2', 130, 70,
    rect(4, 48, 122, 18, 3, BONE) + line('M4 47H126', '#d9c9a3', 3) +
      [0, 1, 2, 3].map((i) => rect(10 + 28 * i, 20, 26, 26, 5, fill('#dbeaf9', C.blueLine)) + circle(23 + 28 * i, 30, 6.5, NUC)).join('')),
  def('osteoclast', 'Osteoclast', CELLS, 'osteoclast,bone resorption,multinucleated,rankl,ruffled border', 130, 90,
    shape('M4 86V64H34Q65 84 96 64H126V86Z', BONE) +
      shape('M22 62C14 30 40 10 66 12C96 12 118 34 108 62C100 58 94 70 86 62C78 70 72 58 64 66C56 58 50 70 42 62C36 68 28 60 22 62Z', fill('#f1e0f0', C.pinkLine)) +
      rings([[44, 34], [62, 28], [80, 34], [64, 46]], 7.5, NUC)),
  def('chondrocyte', 'Chondrocyte', CELLS, 'chondrocyte,cartilage,lacuna,matrix,osteoarthritis', 90, 90,
    rect(6, 6, 78, 78, 10, fill('#dbeef5', '#6fa7bf')) + circle(45, 45, 27, fill('#ffffff', '#6fa7bf', 'stroke-width="2"')) + circle(45, 45, 20, fill(C.cell, C.cellLine)) + circle(45, 45, 9, NUC)),
  def('astrocyte', 'Astrocyte', CELLS, 'astrocyte,glia,gfap,blood-brain barrier,endfeet,cns', 120, 120, astrocyte()),
  def('oligodendrocyte', 'Oligodendrocyte', CELLS, 'oligodendrocyte,myelin,glia,white matter,myelination,cns', 140, 100,
    line('M2 77H52M88 77H138M44 89H96', C.orangeLine, 3) + line('M70 30L30 70M70 30V82M70 30L110 70', C.blueLine, 2.5) +
      rect(10, 70, 40, 14, 7, fill('#f4f6f9', C.greyLine)) + rect(50, 82, 40, 14, 7, fill('#f4f6f9', C.greyLine)) + rect(90, 70, 40, 14, 7, fill('#f4f6f9', C.greyLine)) +
      circle(70, 28, 16, fill('#dbeaf9', C.blueLine)) + circle(70, 28, 8, NUC)),
  def('microglia', 'Microglia', CELLS, 'microglia,brain macrophage,neuroinflammation,glia,ramified', 120, 110, microglia()),
  def('sensory-neuron', 'Sensory neuron', CELLS, 'sensory neuron,drg,pseudounipolar,nociceptor,afferent', 176, 70,
    line('M16 50H160M88 50V36M16 50L6 38M16 50H4M16 50L6 62', C.nucLine, 4) + rings([[164, 44], [166, 54]], 4.5, NUC_SOFT) +
      circle(88, 22, 17, NUC_SOFT) + circle(88, 22, 7, `fill="${C.nucLine}" stroke="none"`)),
  def('photoreceptor', 'Photoreceptor', CELLS, 'photoreceptor,rod,cone,retina,outer segment,vision', 56, 140,
    line('M28 110V126', C.cellLine, 3) + rect(18, 4, 20, 44, 5, fill('#e8e0f8', C.nucLine)) + line('M18 12H38M18 19H38M18 26H38M18 33H38M18 40H38', C.nucLine, 1.3) +
      rect(25, 47, 6, 8, 1, fill(C.cell, C.cellLine, thin)) + ellipse(28, 68, 13, 15, fill('#fbe3d3', C.cellLine)) + line('M22 62h12M22 68h12M22 74h12', C.mitoLine, 2) +
      circle(28, 98, 14, fill(C.cell, C.cellLine)) + circle(28, 98, 8, NUC) + ellipse(28, 131, 9, 6, fill(C.cell, C.cellLine))),

  // ---- Cell states and special cells ----
  def('stem-cell', 'Stem cell', CELLS, 'stem cell,self-renewal,pluripotent,progenitor,differentiation', 90, 92,
    line('M17 34A32 32 0 0 1 70 30', C.greenLine, 2.5) + `<polygon points="65,22 76,33 62,35" fill="${C.greenLine}" stroke="none"/>` +
      circle(45, 54, 30, fill('#d9f0e3', C.greenLine)) + circle(45, 54, 17, NUC)),
  def('stem-cell-colony', 'Stem cell colony', CELLS, 'ipsc colony,es cell colony,pluripotent,colony,stem cells', 110, 90,
    ellipse(55, 45, 49, 37, fill('#e6f4ea', C.greenLine)) + packed(55, 45, 40, 28, 15, 5.6, fill('#b9a3e3', C.nucLine, 'stroke-width="1.2"'))),
  def('cancer-cell', 'Cancer cell', CELLS, 'cancer cell,tumour cell,malignant,transformed,metastasis', 100, 100,
    shape(blob(50, 50, 37, 37, 7, 0.15), fill(C.pink, C.pinkLine)) + shape(blob(50, 50, 19, 18, 4, 0.14, 1), fill('#b56aa0', '#7d2a5b')) + dots([[44, 46], [56, 54]], 3.6, '#f7c6e0')),
  def('apoptotic-cell', 'Apoptotic cell', CELLS, 'apoptosis,blebbing,apoptotic body,programmed cell death,caspase', 110, 100,
    rings([[26, 34], [48, 22], [72, 34], [78, 60], [56, 80], [28, 72]], 9, fill('#ece7f5', C.nucLine)) + circle(50, 52, 28, fill('#ece7f5', C.nucLine)) +
      dots([[42, 46], [56, 44], [48, 58], [60, 58]], 5, C.nucLine) +
      circle(96, 28, 7, fill('#ece7f5', C.nucLine, thin)) + circle(100, 62, 6, fill('#ece7f5', C.nucLine, thin)) + dots([[96, 28], [100, 62]], 2.4, C.nucLine)),
  def('necrotic-cell', 'Necrotic cell', CELLS, 'necrosis,necroptosis,membrane rupture,lysis,damps,cell death', 110, 100,
    circle(48, 50, 36, fill('#fbe9e4', '#c9603a', 'stroke-dasharray="38 9"')) + circle(44, 50, 14, fill('#e8dff5', '#b9a3e3', 'stroke-dasharray="6 5" stroke-width="2"')) +
      dots([[30, 34], [60, 36], [58, 66], [34, 66]], 2.6, '#e9a08a') + dots([[88, 40], [96, 50], [90, 60], [102, 36], [104, 62]], 3, '#c9603a')),
  def('senescent-cell', 'Senescent cell', CELLS, 'senescence,senescent,sasp,p16,p21,ageing,beta-galactosidase', 120, 90,
    shape(blob(60, 45, 53, 36, 5, 0.07), fill('#e4f1ef', C.tealLine)) + ellipse(60, 45, 20, 15, NUC) +
      dots([[26, 40], [34, 58], [86, 30], [94, 50], [80, 64], [44, 24]], 3.4, C.tealLine)),
  def('dividing-cell', 'Dividing cell', CELLS, 'mitosis,cell division,cytokinesis,proliferation,telophase', 130, 80,
    rings([[42, 40], [88, 40]], 31, fill(C.cell, C.cellLine)) + ellipse(65, 40, 9, 20, `fill="${C.cell}" stroke="none"`) +
      line('M48 32L82 32M48 40H82M48 48L82 48', '#b7c0cc', 1.5) + line('M38 30V50M44 28V52M32 32V48M92 30V50M86 28V52M98 32V48', C.nucLine, 4)),
  def('oocyte', 'Oocyte', CELLS, 'oocyte,egg,zona pellucida,germinal vesicle,fertilisation', 100, 100,
    circle(50, 50, 45, fill('#f4eefc', C.nucLine)) + circle(50, 50, 36, fill('#fde9c8', C.orangeLine)) + circle(44, 48, 12, NUC) + circle(77, 24, 5.5, fill('#fde9c8', C.orangeLine, thin))),
  def('sperm', 'Sperm', CELLS, 'sperm,spermatozoon,gamete,fertilisation,flagellum', 130, 40, sperm()),
  def('early-embryo', 'Early embryo', CELLS, 'embryo,4-cell stage,blastomere,cleavage,zygote', 90, 90,
    circle(45, 45, 41, fill('#f4eefc', C.nucLine)) + rings([[32, 32], [58, 32], [32, 58], [58, 58]], 14, fill('#fde9c8', C.orangeLine)) +
      rings([[32, 32], [58, 32], [32, 58], [58, 58]], 5, fill('#b9a3e3', C.nucLine, 'stroke-width="1.2"'))),
  def('blastocyst', 'Blastocyst', CELLS, 'blastocyst,inner cell mass,trophoblast,embryo,implantation', 100, 100, blastocyst()),
  def('organoid', 'Organoid', CELLS, 'organoid,3d culture,mini organ,crypt,enteroid', 110, 100, organoid()),
  def('spheroid', 'Spheroid', CELLS, 'spheroid,3d culture,tumour spheroid,aggregate,necrotic core', 90, 90,
    circle(45, 45, 39, fill('#f7dcea', C.pinkLine)) + circle(45, 45, 13, `fill="#dba7c6" stroke="none"`) + packed(45, 45, 31, 31, 13, 3.6, `fill="${C.pinkLine}" stroke="none"`)),
  def('plant-cell', 'Plant cell', CELLS, 'plant cell,cell wall,vacuole,chloroplast,arabidopsis', 110, 110,
    rect(6, 6, 98, 98, 10, fill('#e9f5dc', '#5f9a2f', 'stroke-width="5"')) + rect(32, 26, 58, 56, 22, fill('#dff0fb', '#4a90c4', 'stroke-width="2"')) +
      [[22, 22, 20], [58, 15, 0], [94, 26, 70], [97, 62, 90], [70, 94, 0], [22, 54, 90]].map(([x, y, a]) => `<ellipse cx="${x}" cy="${y}" rx="8" ry="4.5" transform="rotate(${a} ${x} ${y})" ${fill('#8fc46a', '#5f9a2f', thin)}/>`).join('') +
      circle(24, 86, 10, NUC)),
  def('yeast-cell', 'Yeast cell', CELLS, 'yeast,budding yeast,saccharomyces,bud,fungal cell', 92, 80,
    circle(70, 24, 15, fill('#fbefc9', C.goldLine)) + ellipse(36, 46, 28, 30, fill('#fbefc9', C.goldLine)) + ellipse(58, 31, 5, 8, `fill="#fbefc9" stroke="none" transform="rotate(-50 58 31)"`) +
      circle(32, 48, 11, NUC) + circle(72, 24, 5, fill('#b9a3e3', C.nucLine, thin))),
]
