// Organs and structures of the body, added after the second survey of popular science videos
// (docs/icon-wishlist.md). The videos supplied the names of subjects only: every drawing here is
// an original schematic, not based on any other artwork, and released as CC0.
//
// Each shape is one element with its own fill and outline, as the style rules in library.ts ask,
// so the "Flat cartoon" look is made from these drawings automatically.

import type { IconDef } from '../model/types'
import { C, circle, def, ellipse, fill, line, network, rect, ribbon, shape } from './draw'

const TISSUES = 'Tissues & organisms'

const BRAIN_LINE = '#c9627c'
const LUNG = fill('#f9c9d2', '#cf5f7e')
const ORGAN_LINE = '#a04a36'
const KIDNEY = fill('#e8ab99', ORGAN_LINE)
const SKIN = fill('#f9cdb5', C.mitoLine)
const AIRWAY = '#d7e8f8'

function ciliatedAirway(): string {
  let cells = ''
  let cilia = ''
  for (let i = 0; i < 5; i++) {
    const x = 10 + 24 * i
    const goblet = i === 2
    cells += rect(x, 32, 24, 44, 4, goblet ? fill(C.green, C.greenLine) : fill(C.cell, C.cellLine))
    cells += ellipse(x + 12, 64, 7, 7.5, fill(C.nuc, C.nucLine, 'stroke-width="2"'))
    if (goblet) {
      cells += circle(x + 8, 42, 3, fill('#eef9d9', C.greenLine, 'stroke-width="1.5"')) + circle(x + 16, 42, 3, fill('#eef9d9', C.greenLine, 'stroke-width="1.5"')) + circle(x + 12, 50, 3, fill('#eef9d9', C.greenLine, 'stroke-width="1.5"'))
    } else {
      for (let k = 0; k < 5; k++) cilia += `M${x + 4 + 4 * k} 32q-4 -7 0 -13`
    }
  }
  return (
    line('M6 80H134', '#b58a6a', 4) +
    line(cilia, C.cellLine, 1.8) +
    cells +
    ribbon('M10 11C30 5 48 15 70 9S112 5 130 11', C.greenLine, '#d7f0a8', 3.5)
  )
}

export const ORGAN_ICONS: IconDef[] = [
  def('brain', 'Brain', TISSUES, 'brain,cerebrum,cerebellum,cortex,nervous system,neuroscience,organ', 120, 100,
    shape('M62 64C64 78 68 88 72 96H86C82 88 80 78 80 64Z', fill('#f3b3c0', BRAIN_LINE)) +
      ellipse(90, 72, 19, 13, fill('#f0a3b4', BRAIN_LINE)) +
      line('M75 71q15 -7 30 0M78 78q12 -5 24 0', BRAIN_LINE, 2) +
      shape('M14 52C6 40 12 22 28 18C34 6 54 4 64 10C78 4 98 10 102 24C114 30 116 48 106 58C102 68 88 70 78 66C70 74 52 74 44 68C30 72 16 66 14 52Z', fill('#f7c6d0', BRAIN_LINE)) +
      line('M30 30C38 24 46 30 44 40M58 14C54 24 62 30 70 26M84 20C80 30 88 36 96 34M26 50C36 46 44 52 54 50C62 48 66 54 76 52M60 38C68 42 78 38 84 44', BRAIN_LINE, 2.2)),
  def('heart', 'Heart', TISSUES, 'heart,cardiac,aorta,ventricle,atrium,cardiovascular,organ', 100, 110,
    ribbon('M44 44C44 28 34 20 14 20', C.blueLine, C.blue, 8) +
      line('M60 14V5M67 13V4M74 15L77 6', C.redLine, 4) +
      ribbon('M54 42V28C54 10 80 10 80 28V34', C.redLine, C.red, 9) +
      ellipse(24, 47, 12, 10, fill(C.red, C.redLine)) +
      shape('M34 36C46 28 62 30 72 36C88 44 90 64 80 80C72 94 58 104 46 104C32 100 18 84 16 66C14 52 22 40 34 36Z', fill('#ee8f8c', C.redLine)) +
      line('M48 42C44 58 56 76 49 100M48 62C58 69 68 69 80 62', C.redLine, 2)),
  def('lungs', 'Lungs', TISSUES, 'lung,lungs,trachea,bronchi,respiratory,breathing,airway,organ', 120, 104,
    shape('M50 26C40 14 24 22 16 44C8 64 6 84 12 94C22 100 44 96 52 88C54 70 54 44 50 26Z', LUNG) +
      shape('M70 26C80 14 96 22 104 44C112 64 114 84 108 94C98 100 76 96 68 88C66 70 66 44 70 26Z', LUNG) +
      line('M42 56L30 62M42 56L42 72M78 56L90 62M78 56L78 72', C.blueLine, 2.5) +
      network(['M60 8V38', 'M60 38L42 56', 'M60 38L78 56'], C.blueLine, AIRWAY, 5) +
      line('M57 14h6M57 21h6M57 28h6', C.blueLine, 1.6)),
  def('liver', 'Liver', TISSUES, 'liver,hepatic,gallbladder,lobe,metabolism,organ', 130, 92,
    shape('M80 48C73 62 75 80 86 80C97 78 97 62 90 48Z', fill(C.green, C.greenLine)) +
      shape('M10 40C10 20 30 10 56 10C84 10 110 16 122 28C126 34 120 40 110 42C94 46 82 56 70 66C56 78 30 82 18 70C10 62 10 52 10 40Z', fill('#e3a08f', ORGAN_LINE)) +
      line('M68 12C64 28 66 46 74 62', ORGAN_LINE, 2.2)),
  def('kidney', 'Kidney', TISSUES, 'kidney,renal,ureter,filtration,urine,organ', 84, 104,
    shape('M40 6C62 6 70 24 62 38C56 46 56 58 62 66C70 80 60 98 40 98C20 98 8 76 8 52C8 28 20 6 40 6Z', KIDNEY) +
      shape('M58 40C45 38 36 45 36 52C36 59 45 66 58 64Z', fill(C.gold, C.goldLine)) +
      ribbon('M52 44H78', C.redLine, C.red, 4) + ribbon('M52 53H78', C.blueLine, C.blue, 4) +
      ribbon('M50 62C64 62 74 72 74 97', C.goldLine, C.gold, 4)),
  def('stomach', 'Stomach', TISSUES, 'stomach,gastric,digestion,gut,oesophagus,esophagus,organ', 96, 90,
    shape('M40 6V24C40 40 34 58 20 62H8V80H22C56 82 88 68 88 42C88 22 76 10 64 12C56 13 52 18 52 24V6Z', fill('#f9cdb5', C.mitoLine)) +
      line('M52 38C54 50 48 62 36 70M66 30C72 46 64 62 48 74', C.mitoLine, 2)),
  def('intestine', 'Intestine', TISSUES, 'intestine,gut,bowel,colon,small intestine,large intestine,digestion,organ', 110, 110,
    ribbon('M70 38H40C34 38 34 48 40 48H70C76 48 76 58 70 58H40C34 58 34 68 40 68H70C76 68 76 78 70 78H26', C.pinkLine, C.pink, 4.5) +
      ribbon('M18 90V34C18 22 26 18 38 18H72C84 18 92 22 92 34V78C92 90 82 92 70 92H62C56 92 55 96 55 100', '#c9603f', '#f6c0ad', 11) +
      line('M12 48h12M12 64h12M12 80h12M40 12v12M55 12v12M70 12v12M86 44h12M86 60h12M86 76h12', '#c9603f', 1.6)),
  def('pancreas', 'Pancreas', TISSUES, 'pancreas,islet,insulin,exocrine,endocrine,digestion,organ', 130, 64,
    shape('M14 30C10 18 22 8 34 12C42 6 54 12 58 20C66 14 78 18 82 24C90 20 100 22 106 28C114 26 122 30 122 36C122 42 114 44 108 42C100 48 90 48 84 44C76 52 64 50 58 44C52 54 40 56 34 50C24 58 10 48 14 30Z', fill('#f9e0a0', C.goldLine)) +
      line('M24 34C50 30 80 34 114 36M40 32l-4 -8M56 32l4 9M74 33l-3 -7M92 35l3 6', C.goldLine, 2)),
  def('spleen', 'Spleen', TISSUES, 'spleen,splenic,lymphoid,immune organ,blood filter,organ', 84, 100,
    ribbon('M28 44H6', C.redLine, C.red, 4) + ribbon('M29 55H6', C.blueLine, C.blue, 4) +
      shape('M30 8C54 2 74 22 74 50C74 76 58 94 40 94C24 94 14 82 20 68C26 56 26 46 18 36C10 24 16 12 30 8Z', fill('#d9a9c9', '#8f4a80')) +
      line('M54 20C64 34 66 54 58 74', '#8f4a80', 2)),
  def('eye', 'Eye (cross-section)', TISSUES, 'eye,eyeball,retina,lens,cornea,optic nerve,vision,organ', 120, 100,
    ribbon('M92 58L112 68', C.goldLine, C.gold, 8) +
      ellipse(24, 50, 16, 27, fill('#d7ecf9', C.blueLine)) +
      circle(56, 50, 42, fill('#ffffff', C.greyLine)) +
      line('M38 17.7A37 37 0 1 1 38 82.3', C.redLine, 3.5) +
      ellipse(35, 50, 7, 13, fill('#fff6cf', C.goldLine)) +
      line('M26 30L31 40M26 70L31 60', C.tealLine, 4.5)),
  def('thymus', 'Thymus', TISSUES, 'thymus,t cell,thymocyte,lymphoid,immune organ,organ', 90, 96,
    shape('M44 14C34 6 22 12 22 24C12 28 8 42 14 52C8 62 12 78 24 84C32 92 44 88 44 78Z', fill('#f9d9c2', C.orangeLine)) +
      shape('M46 14C56 6 68 12 68 24C78 28 82 42 76 52C82 62 78 78 66 84C58 92 46 88 46 78Z', fill('#f9d9c2', C.orangeLine)) +
      line('M22 24C28 28 30 34 28 40M14 52C22 52 28 56 30 62M68 24C62 28 60 34 62 40M76 52C68 52 62 56 60 62', C.orangeLine, 2) +
      circle(32, 26, 3.2, fill(C.nuc, C.nucLine, 'stroke-width="1.5"')) + circle(22, 42, 3.2, fill(C.nuc, C.nucLine, 'stroke-width="1.5"')) +
      circle(36, 50, 3.2, fill(C.nuc, C.nucLine, 'stroke-width="1.5"')) + circle(26, 72, 3.2, fill(C.nuc, C.nucLine, 'stroke-width="1.5"')) +
      circle(58, 26, 3.2, fill(C.nuc, C.nucLine, 'stroke-width="1.5"')) + circle(68, 42, 3.2, fill(C.nuc, C.nucLine, 'stroke-width="1.5"')) +
      circle(54, 50, 3.2, fill(C.nuc, C.nucLine, 'stroke-width="1.5"')) + circle(64, 72, 3.2, fill(C.nuc, C.nucLine, 'stroke-width="1.5"'))),
  def('adrenal-gland', 'Adrenal gland', TISSUES, 'adrenal,suprarenal,cortisol,adrenaline,cortex,medulla,stress hormone,endocrine', 100, 100,
    shape('M14 94C10 66 26 46 50 46C74 46 90 66 86 94Z', KIDNEY) +
      shape('M50 8C62 8 80 34 84 50C70 42 30 42 16 50C20 34 38 8 50 8Z', fill(C.gold, C.goldLine)) +
      shape('M50 22C57 26 64 34 67 40C57 37 43 37 33 40C36 34 43 26 50 22Z', fill(C.orange, C.orangeLine))),
  def('human-body', 'Human body outline', TISSUES, 'human,person,patient,body,outline,figure,subject,volunteer', 70, 150,
    circle(35, 16, 12, fill('#cfe0f3', C.blueLine)) +
      shape('M30 32H40C52 32 58 38 58 48V86C58 92 50 92 50 86V54H48V140C48 148 37 148 37 140V96H33V140C33 148 22 148 22 140V54H20V86C20 92 12 92 12 86V48C12 38 18 32 30 32Z', fill('#cfe0f3', C.blueLine))),
  def('fetus', 'Fetus', TISSUES, 'fetus,foetus,pregnancy,embryo,womb,uterus,prenatal,development', 100, 110,
    ellipse(50, 56, 44, 49, fill('#fde0e6', C.pinkLine)) +
      line('M56 78C50 88 60 94 54 103', C.redLine, 3) +
      shape('M48 54C62 46 80 58 78 76C76 92 58 98 46 92C40 88 42 80 50 80C46 74 44 64 48 54Z', SKIN) +
      ribbon('M68 84C60 92 52 90 47 85', C.mitoLine, '#f9cdb5', 5) +
      circle(40, 42, 17, SKIN) +
      ribbon('M56 62C54 68 50 72 44 72', C.mitoLine, '#f9cdb5', 3.5) +
      line('M30 46q3 3 6 0', C.mitoLine, 2)),
  def('hair-follicle', 'Hair follicle', TISSUES, 'hair,follicle,skin,sebaceous gland,dermis,hair bulb,dermal papilla', 90, 120,
    rect(4, 24, 82, 92, 6, fill(C.cell, C.cellLine)) +
      line('M56 80L78 38', C.redLine, 3.5) +
      ellipse(66, 56, 9, 12, fill(C.gold, C.goldLine)) +
      rect(4, 24, 82, 13, 4, fill('#f4b9a6', C.mitoLine)) +
      shape('M37 26V80C33 88 31 98 35 106C39 112 53 112 57 106C61 98 59 88 55 80V26Z', SKIN) +
      shape('M41 109C41 100 51 100 51 109Z', fill(C.red, C.redLine, 'stroke-width="2"')) +
      ribbon('M46 98V6', '#7a5230', '#b98a55', 3.5)),
  def('taste-bud', 'Taste bud', TISSUES, 'taste,taste bud,tongue,gustatory,sensory,papilla,receptor cell', 100, 104,
    line('M42 86C42 94 36 96 32 100M58 86C58 94 64 96 68 100M50 86V100', C.goldLine, 3) +
      rect(4, 16, 92, 70, 6, fill(C.cell, C.cellLine)) +
      shape('M50 16C76 30 80 62 64 86H36C20 62 24 30 50 16Z', fill('#fff3e6', C.orangeLine)) +
      shape('M47 22C32 38 30 64 39 84H46C40 62 41 40 47 22Z', fill(C.green, C.greenLine, 'stroke-width="2"')) +
      shape('M53 22C68 38 70 64 61 84H54C60 62 59 40 53 22Z', fill(C.green, C.greenLine, 'stroke-width="2"')) +
      shape('M50 22C56 42 56 64 53 84H47C44 64 44 42 50 22Z', fill(C.pink, C.pinkLine, 'stroke-width="2"')) +
      circle(38, 62, 3, fill(C.nuc, C.nucLine, 'stroke-width="1.5"')) + circle(62, 62, 3, fill(C.nuc, C.nucLine, 'stroke-width="1.5"')) + circle(50, 54, 3, fill(C.nuc, C.nucLine, 'stroke-width="1.5"')) +
      line('M47 17V8M50 16V5M53 17V8', C.pinkLine, 1.8)),
  def('ciliated-airway', 'Ciliated airway lining', TISSUES, 'cilia,airway,bronchus,trachea,mucus,goblet cell,respiratory epithelium,mucociliary', 140, 86, ciliatedAirway()),
]
