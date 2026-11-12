// Lab equipment and figure helpers (markers, symbols, small plot icons). Drawn for BioSketch as
// generic schematic shapes (no brands, not based on any other collection's artwork); released as CC0.

import type { IconDef } from '../model/types'
import { C, circle, def, ellipse, fill, label, line, r1, rect } from './draw'

const LAB = 'Lab'
const HELPERS = 'Figure helpers'

const GLASS = fill('#eef6fc', C.greyLine)
const METAL = fill(C.grey, C.greyLine)
const DARK = '#3b4553'
const MEDIUM = '#fbd3dd'
const INK = '#2b2f36'

/** A filled shape without an outline (liquids, displays, bands). */
const plain = (x: number, y: number, w: number, h: number, rx: number, colour: string): string =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${colour}" stroke="none"/>`
const shape = (d: string, attrs: string): string => `<path d="${d}" ${attrs}/>`
const dot = (cx: number, cy: number, r: number, colour: string): string => circle(cx, cy, r, `fill="${colour}" stroke="none"`)

function wells(cols: number, rows: number, x0: number, y0: number, dx: number, dy: number, r: number, width: number): string {
  let out = rect(3, 3, 134, 90, 8, fill('#eef2f7', C.greyLine))
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) out += circle(r1(x0 + i * dx), r1(y0 + j * dy), r, fill(MEDIUM, C.greyLine, `stroke-width="${width}"`))
  }
  return out
}

const tips = (count: number, x0: number, dx: number, top: number, length: number): string =>
  Array.from({ length: count }, (_, i) => {
    const x = r1(x0 + i * dx)
    return shape(`M${x - 2.5} ${top}h5l-1.5 ${length}h-2z`, fill('#fff6cf', C.greyLine, 'stroke-width="1.2"'))
  }).join('')

function countingGrid(x: number, y: number, size: number): string {
  const third = size / 3
  return (
    rect(x, y, size, size, 0, fill('#ffffff', C.greyLine, 'stroke-width="1.2"')) +
    line(`M${r1(x + third)} ${y}V${y + size}M${r1(x + 2 * third)} ${y}V${y + size}M${x} ${r1(y + third)}H${x + size}M${x} ${r1(y + 2 * third)}H${x + size}`, C.greyLine, 1)
  )
}

function blot(): string {
  let out = rect(6, 8, 88, 64, 2, fill('#f7f3e8', C.greyLine))
  ;[3, 5, 7, 4, 2].forEach((h, i) => {
    out += plain(14 + 16 * i, r1(26 - h / 2), 12, h, 1, '#3b4a6b') + plain(14 + 16 * i, 50, 12, 4, 1, '#3b4a6b')
  })
  return out
}

function snowflake(cx: number, cy: number, r: number): string {
  let d = ''
  for (let k = 0; k < 3; k++) {
    const a = (k * Math.PI) / 3
    d += `M${r1(cx - r * Math.cos(a))} ${r1(cy - r * Math.sin(a))}L${r1(cx + r * Math.cos(a))} ${r1(cy + r * Math.sin(a))}`
  }
  return line(d, C.blueLine, 3)
}

// ---------- figure helpers ----------

const axes = (w: number, h: number): string => line(`M12 6V${h - 10}H${w - 6}`, C.greyLine, 2.5)

function heatMap(): string {
  const palette = ['#2f6fb5', '#a9cdf3', '#f4f6f8', '#f4a9a8', '#c9403d']
  let out = ''
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 5; i++) out += plain(8 + i * 13, 8 + j * 13, 12, 12, 1.5, palette[(i * 2 + j * 3 + ((i * j) % 2)) % 5])
  }
  return out
}

function volcano(): string {
  const grey: [number, number][] = [[40, 60], [46, 58], [52, 62], [44, 54], [50, 52], [56, 58], [36, 58], [48, 63], [42, 62], [54, 54]]
  const up: [number, number][] = [[66, 30], [72, 22], [62, 40], [76, 34], [70, 14]]
  const down: [number, number][] = [[26, 32], [20, 24], [30, 42], [18, 36], [24, 16]]
  return (
    axes(90, 76) +
    grey.map(([x, y]) => dot(x, y, 2.6, '#9aa5b1')).join('') +
    up.map(([x, y]) => dot(x, y, 3, C.redLine)).join('') +
    down.map(([x, y]) => dot(x, y, 3, C.blueLine)).join('')
  )
}

function flowPlot(): string {
  const low: [number, number][] = [[24, 52], [30, 48], [34, 54], [28, 58], [38, 50], [32, 44], [22, 46], [36, 58], [27, 53], [31, 51], [35, 47], [25, 57]]
  const high: [number, number][] = [[58, 26], [62, 22], [66, 28], [60, 32], [56, 20], [64, 18], [68, 24], [61, 27], [57, 30], [65, 31]]
  return (
    axes(80, 76) +
    low.map(([x, y]) => dot(x, y, 2.2, C.blueLine)).join('') +
    high.map(([x, y]) => dot(x, y, 2.2, C.redLine)).join('') +
    rect(50, 12, 24, 26, 3, `fill="none" stroke="${INK}" stroke-width="1.5" stroke-dasharray="4 3"`)
  )
}

const TEAL = fill('#e3f3ef', C.tealLine)

export const LAB_ICONS: IconDef[] = [
  // ---- Lab equipment ----
  def('culture-flask', 'Culture flask', LAB, 'flask,t75,t25,cell culture,tissue culture,adherent cells', 120, 70,
    rect(6, 12, 76, 46, 6, GLASS) + shape('M8 38H80V52Q80 56 76 56H12Q8 56 8 52Z', `fill="${MEDIUM}" stroke="none"`) +
      shape('M82 20L98 27V43L82 50Z', GLASS) + rect(98, 23, 16, 24, 3, fill(C.blue, C.blueLine))),
  def('plate-96', '96-well plate', LAB, '96 well plate,microplate,assay,elisa,screen', 140, 96, wells(12, 8, 14, 14, 10.2, 9.8, 3.6, 1)),
  def('plate-6', '6-well plate', LAB, '6 well plate,culture plate,transfection,cell culture', 140, 96, wells(3, 2, 28, 28, 42, 40, 17, 1.5)),
  def('multichannel-pipette', 'Multichannel pipette', LAB, 'multichannel pipette,8 channel,plate pipetting', 100, 122,
    plain(44, 2, 12, 8, 2, DARK) + rect(39, 8, 22, 54, 7, METAL) + rect(8, 60, 84, 16, 5, METAL) + tips(8, 16, 9.7, 76, 40)),
  def('serological-pipette', 'Serological pipette', LAB, 'serological pipette,stripette,10 ml,media transfer', 30, 152,
    rect(10, 4, 10, 10, 2, fill(C.orange, C.orangeLine, 'stroke-width="1.5"')) + rect(10, 14, 10, 112, 0, GLASS) +
      line([26, 36, 46, 56, 66, 76, 86, 96, 106, 116].map((y) => `M10 ${y}h5`).join(''), C.greyLine, 1.2) + shape('M10 126H20L16.5 148H13.5Z', GLASS)),
  def('tip-box', 'Pipette tip box', LAB, 'tip box,pipette tips,rack,consumables', 110, 84,
    rect(6, 26, 98, 52, 6, fill('#dbeaf9', C.blueLine)) + tips(8, 18, 10.6, 28, 38) + rect(10, 18, 90, 10, 3, METAL)),
  def('cryovial', 'Cryovial', LAB, 'cryovial,cryotube,freezing,cell stock,biobank', 40, 90,
    shape('M11 24H29V74Q29 86 20 86Q11 86 11 74Z', GLASS) + shape('M12.5 50H27.5V74Q27.5 84.5 20 84.5Q12.5 84.5 12.5 74Z', `fill="#cfe6fa" stroke="none"`) +
      rect(8, 4, 24, 20, 3, fill(C.blue, C.blueLine)) + line('M14 8V20M20 8V20M26 8V20', C.blueLine, 1.5)),
  def('microscope-slide', 'Microscope slide', LAB, 'slide,glass slide,coverslip,histology,section,staining', 130, 46,
    rect(4, 10, 122, 26, 2, fill('#f4f9fd', C.greyLine)) + plain(5.5, 11.5, 24, 23, 1, '#d5dbe3') +
      rect(60, 13, 30, 20, 1, fill('#ffffff', C.greyLine, 'stroke-width="1.2"')) + ellipse(75, 23, 9, 6, fill('#f7b6c8', C.pinkLine, 'stroke-width="1.2"'))),
  def('haemocytometer', 'Haemocytometer', LAB, 'haemocytometer,hemocytometer,counting chamber,cell count,neubauer', 120, 70,
    rect(4, 10, 112, 50, 3, GLASS) + line('M52 10V60M68 10V60', C.greyLine, 1.5) + countingGrid(22, 24, 22) + countingGrid(76, 24, 22)),
  def('electrophoresis-tank', 'Electrophoresis tank', LAB, 'electrophoresis,gel tank,agarose,sds-page,running buffer', 130, 90,
    line('M20 22V44M110 22V44', DARK, 2.5) + rect(8, 30, 114, 52, 6, GLASS) + shape('M10 48H120V76Q120 80 116 80H14Q10 80 10 76Z', `fill="#d7ecf9" stroke="none"`) +
      rect(34, 54, 62, 16, 2, fill('#cfe0f5', C.blueLine, 'stroke-width="1.5"')) + line('M40 58h5M49 58h5M58 58h5M67 58h5M76 58h5M85 58h5', C.blueLine, 2) +
      circle(20, 20, 6, fill(C.red, C.redLine)) + circle(110, 20, 6, fill(DARK, INK))),
  def('blot-membrane', 'Blot membrane', LAB, 'western blot,membrane,bands,immunoblot,loading control', 100, 80, blot()),
  def('cuvette', 'Cuvette', LAB, 'cuvette,spectrophotometer,absorbance,od,optical density', 44, 90,
    rect(8, 6, 28, 78, 2, GLASS) + plain(10, 38, 24, 44, 1, C.blue) + line('M8 14H36', C.greyLine, 1.2)),
  def('beaker', 'Beaker', LAB, 'beaker,glassware,solution,buffer', 90, 90,
    shape('M14 8H76L72 14V76Q72 84 64 84H26Q18 84 18 76V14Z', GLASS) + shape('M19.5 44H70.5V76Q70.5 82.5 64 82.5H26Q19.5 82.5 19.5 76Z', `fill="${C.teal}" stroke="none"`) +
      line('M24 30h9M24 44h9M24 58h9', C.greyLine, 1.5)),
  def('graduated-cylinder', 'Graduated cylinder', LAB, 'measuring cylinder,graduated cylinder,volume,glassware', 50, 130,
    shape('M14 8H36L34 12V112H16V12Z', GLASS) + plain(17.5, 62, 15, 49, 0, C.teal) +
      line([24, 36, 48, 60, 72, 84, 96].map((y) => `M16 ${y}h6`).join(''), C.greyLine, 1.2) + rect(8, 112, 34, 10, 3, METAL)),
  def('medium-bottle', 'Medium bottle', LAB, 'media bottle,culture medium,dmem,reagent bottle,buffer', 70, 110,
    shape('M26 20V28Q10 32 10 46V98Q10 106 18 106H52Q60 106 60 98V46Q60 32 44 28V20Z', GLASS) +
      shape('M11.5 56H58.5V98Q58.5 104.5 52 104.5H18Q11.5 104.5 11.5 98Z', `fill="${MEDIUM}" stroke="none"`) +
      rect(18, 66, 34, 22, 2, fill('#ffffff', C.greyLine, 'stroke-width="1.2"')) + rect(23, 4, 24, 17, 3, fill(C.blue, C.blueLine))),
  def('blood-tube', 'Blood collection tube', LAB, 'blood tube,vacutainer,edta,plasma,serum,sample', 36, 110,
    shape('M9 22H27V94Q27 104 18 104Q9 104 9 94Z', GLASS) + shape('M10.5 52H25.5V94Q25.5 102.5 18 102.5Q10.5 102.5 10.5 94Z', `fill="#d9534f" stroke="none"`) +
      rect(6, 4, 24, 18, 4, fill(C.nuc, C.nucLine))),
  def('bunsen-burner', 'Bunsen burner', LAB, 'bunsen burner,flame,sterile technique,microbiology', 70, 110,
    shape('M35 6C47 20 49 32 35 46C21 32 23 20 35 6Z', fill('#a9cdf3', C.blueLine)) + shape('M35 22C40 29 41 37 35 43C29 37 30 29 35 22Z', `fill="#ffffff" stroke="none"`) +
      line('M41 84H62', C.greyLine, 5) + rect(29, 44, 12, 46, 0, METAL) + rect(26, 74, 18, 8, 2, METAL) + shape('M12 102H58L52 88H18Z', METAL)),
  def('microfluidic-chip', 'Microfluidic chip', LAB, 'microfluidics,organ on chip,lab on a chip,channel,droplet', 130, 80,
    rect(4, 6, 122, 68, 6, GLASS) + line('M20 24L48 40M20 56L48 40H60V22H72V58H84V22H96V40H110', C.blueLine, 3.5) +
      circle(20, 24, 5, fill('#ffffff', C.blueLine, 'stroke-width="2"')) + circle(20, 56, 5, fill('#ffffff', C.blueLine, 'stroke-width="2"')) +
      circle(110, 40, 5, fill('#ffffff', C.blueLine, 'stroke-width="2"'))),
  def('centrifuge', 'Centrifuge', LAB, 'centrifuge,spin,pellet,rpm,benchtop', 110, 100,
    shape('M14 36Q14 10 55 10Q96 10 96 36Z', fill('#f4f6f9', C.greyLine)) + rect(8, 36, 94, 56, 10, METAL) +
      plain(24, 54, 34, 14, 2, DARK) + line('M29 61h10', '#7fe0a0', 2) + circle(80, 61, 8, fill('#ffffff', C.greyLine, 'stroke-width="2"')) + line('M80 61V55', C.greyLine, 2)),
  def('incubator', 'Incubator', LAB, 'incubator,co2 incubator,37 degrees,cell culture', 100, 120,
    rect(8, 6, 84, 104, 6, METAL) + rect(16, 26, 68, 76, 4, GLASS) + line('M16 52H84M16 78H84', C.greyLine, 1.5) +
      plain(24, 44, 22, 7, 1, MEDIUM) + plain(54, 70, 22, 7, 1, MEDIUM) + plain(16, 12, 26, 9, 2, DARK) + line('M24 110V116M76 110V116', C.greyLine, 4)),
  def('pcr-machine', 'PCR machine', LAB, 'thermocycler,pcr machine,thermal cycler,qpcr', 110, 90,
    rect(14, 12, 82, 28, 8, fill('#f4f6f9', C.greyLine)) + rect(8, 36, 94, 46, 8, METAL) + plain(20, 46, 38, 18, 2, DARK) +
      line('M25 59C33 59 35 51 43 51H53', '#7fe0a0', 2) + dot(72, 50, 4, C.greyLine) + dot(86, 50, 4, C.greyLine) + dot(72, 64, 4, C.greyLine) + dot(86, 64, 4, C.greyLine)),
  def('plate-reader', 'Plate reader', LAB, 'plate reader,absorbance,fluorescence,luminescence,elisa reader', 120, 90,
    rect(6, 14, 108, 60, 8, METAL) + plain(70, 24, 34, 14, 2, DARK) + rect(14, 56, 50, 26, 3, fill('#eef2f7', C.greyLine, 'stroke-width="2"')) +
      [0, 1, 2].map((j) => [0, 1, 2, 3, 4].map((i) => dot(21 + i * 9, 62 + j * 7, 2.2, '#f7b6c8')).join('')).join('')),
  def('vortex-mixer', 'Vortex mixer', LAB, 'vortex,mixer,shaker,resuspend', 80, 100,
    shape('M26 44Q26 28 40 28Q54 28 54 44Z', fill(DARK, INK)) + shape('M20 44H60L66 90Q66 96 60 96H20Q14 96 14 90Z', METAL) +
      circle(40, 72, 9, fill('#ffffff', C.greyLine, 'stroke-width="2"')) + line('M40 72L45 66', C.greyLine, 2)),
  def('water-bath', 'Water bath', LAB, 'water bath,thawing,37 degrees,heating', 120, 90,
    rect(8, 26, 104, 56, 6, METAL) + rect(14, 16, 92, 22, 4, fill('#d7ecf9', C.blueLine)) + line('M24 27q6 -6 12 0t12 0t12 0t12 0t12 0t12 0', C.blueLine, 2) +
      plain(20, 52, 30, 14, 2, DARK) + circle(88, 60, 8, fill('#ffffff', C.greyLine, 'stroke-width="2"')) + line('M88 60L93 55', C.greyLine, 2)),
  def('balance', 'Balance', LAB, 'balance,scale,weighing,analytical balance,mass', 110, 100,
    rect(22, 8, 66, 60, 3, fill('#f4f9fd', C.greyLine, 'stroke-width="2"')) + line('M55 64V54', C.greyLine, 3) + ellipse(55, 52, 24, 5, METAL) +
      rect(8, 66, 94, 28, 6, METAL) + plain(18, 74, 40, 12, 2, DARK) + dot(74, 80, 4, C.greyLine) + dot(88, 80, 4, C.greyLine)),
  def('freezer', 'Freezer', LAB, 'freezer,-80,-20,cold storage,samples', 80, 120,
    rect(8, 4, 64, 108, 5, METAL) + line('M8 26H72', C.greyLine, 2) + plain(14, 10, 24, 9, 2, DARK) + rect(61, 44, 5, 30, 2.5, fill('#ffffff', C.greyLine, 'stroke-width="1.5"')) +
      snowflake(36, 68, 15) + line('M18 112V118M62 112V118', C.greyLine, 4)),
  def('ln2-tank', 'Liquid nitrogen tank', LAB, 'liquid nitrogen,ln2,dewar,cryostorage,cryopreservation', 80, 110,
    line('M12 52Q4 52 4 60M68 52Q76 52 76 60', C.greyLine, 3) + rect(10, 30, 60, 74, 22, METAL) + rect(28, 16, 24, 18, 2, METAL) +
      rect(23, 6, 34, 11, 4, fill(C.blue, C.blueLine)) + label(40, 74, 17, C.blueLine, 'LN₂')),

  // ---- Figure helpers ----
  def('arrow-up', 'Up-regulation arrow', HELPERS, 'up,increase,upregulated,induced,higher', 40, 70,
    shape('M20 4L36 26H26V66H14V26H4Z', fill(C.red, C.redLine))),
  def('arrow-down', 'Down-regulation arrow', HELPERS, 'down,decrease,downregulated,reduced,lower', 40, 70,
    shape('M20 66L36 44H26V4H14V44H4Z', fill(C.blue, C.blueLine))),
  def('plus-marker', 'Plus marker', HELPERS, 'plus,positive,with,added,treated', 50, 50, circle(25, 25, 21, TEAL) + line('M25 13V37M13 25H37', C.tealLine, 5)),
  def('minus-marker', 'Minus marker', HELPERS, 'minus,negative,without,control,untreated', 50, 50, circle(25, 25, 21, fill('#fdecec', C.redLine)) + line('M13 25H37', C.redLine, 5)),
  def('tick', 'Tick', HELPERS, 'tick,check,yes,present,success', 50, 50, line('M9 27L20 38L41 13', C.greenLine, 7)),
  def('cross', 'Cross', HELPERS, 'cross,no,absent,blocked,knockout,failed', 50, 50, line('M12 12L38 38M38 12L12 38', C.redLine, 7)),
  def('question-mark', 'Question mark', HELPERS, 'question,unknown,hypothesis,unclear', 50, 50, circle(25, 25, 21, METAL) + label(25, 35, 28, DARK, '?')),
  def('stimulus', 'Stimulus (lightning)', HELPERS, 'stimulus,stress,activation,trigger,damage,uv', 50, 70,
    shape('M30 4L8 38H22L16 66L42 28H27Z', fill('#ffd76a', '#e07b1a'))),
  def('clock', 'Clock', HELPERS, 'time,duration,incubation,hours,kinetics', 60, 60,
    circle(30, 30, 25, fill('#ffffff', C.greyLine)) + line('M30 9V13M30 47V51M9 30H13M47 30H51', C.greyLine, 2) + line('M30 30V16M30 30L41 36', DARK, 3)),
  def('thermometer', 'Thermometer', HELPERS, 'temperature,heat,cold,fever,hypothermia', 36, 100,
    rect(13, 6, 10, 70, 5, GLASS) + line('M24 20h5M24 32h5M24 44h5M24 56h5', C.greyLine, 1.5) + circle(18, 82, 12, fill('#ee7b78', C.redLine)) + plain(15.5, 36, 5, 42, 2.5, '#d9534f')),
  def('magnifier', 'Magnifier', HELPERS, 'zoom,inset,detail,magnification,close-up', 70, 70,
    line('M43 43L62 62', C.greyLine, 7) + circle(28, 28, 20, fill('#eef6fc', C.greyLine, 'stroke-width="4"')) + line('M17 25Q19 17 27 15', '#ffffff', 3)),
  def('scale-bar', 'Scale bar', HELPERS, 'scale bar,size,micrometre,length', 110, 30, line('M8 9V21M102 9V21M8 15H102', INK, 4)),
  def('timeline', 'Timeline', HELPERS, 'timeline,time course,schedule,days,protocol', 140, 40,
    line('M6 24H124', INK, 3) + `<polygon points="122,17 136,24 122,31" fill="${INK}" stroke="none"/>` + line('M20 16V32M50 16V32M80 16V32M110 16V32', INK, 3)),
  def('bar-chart', 'Bar chart', HELPERS, 'bar chart,graph,quantification,result,data', 80, 70,
    plain(20, 34, 12, 25, 1, C.blueLine) + plain(38, 18, 12, 41, 1, C.orangeLine) + plain(56, 42, 12, 17, 1, C.tealLine) +
      line('M26 28V34M22 28H30M44 11V18M40 11H48M62 37V42M58 37H66', INK, 1.5) + axes(80, 70)),
  def('survival-curve', 'Survival curve', HELPERS, 'survival,kaplan meier,time to event,mortality', 90, 70,
    axes(90, 70) + line('M12 14H28V24H42V30H58V40H78', C.blueLine, 3) + line('M12 14H22V30H34V44H48V54H78', C.redLine, 3)),
  def('volcano-plot', 'Volcano plot', HELPERS, 'volcano plot,differential expression,rna-seq,proteomics,fold change', 90, 76, volcano()),
  def('heat-map', 'Heat map', HELPERS, 'heat map,heatmap,expression,clustering,omics', 80, 66, heatMap()),
  def('flow-plot', 'Flow cytometry plot', HELPERS, 'flow cytometry,facs,gating,dot plot,population', 80, 76, flowPlot()),
  def('qpcr-curve', 'qPCR curve', HELPERS, 'qpcr,amplification curve,ct value,real-time pcr', 90, 70,
    axes(90, 70) + line('M14 40H82', INK, 1.2).replace('/>', ' stroke-dasharray="4 3"/>') +
      [0, 10, 20].map((s, i) => line(`M14 56H${18 + s}C${34 + s} 56 ${38 + s} 16 ${58 + s} 14H82`, [C.blueLine, C.orangeLine, C.tealLine][i], 2.5)).join('')),
]
