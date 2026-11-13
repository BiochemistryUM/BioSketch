// Plants, fungi and animals, added after the second survey of popular science videos
// (docs/icon-wishlist.md). The videos supplied the names of subjects only: every drawing here is
// an original schematic, not based on any other artwork, and released as CC0.
//
// Each shape is one element with its own fill and outline, as the style rules in library.ts ask,
// so the "Flat cartoon" look is made from these drawings automatically.

import type { IconDef } from '../model/types'
import { C, circle, def, ellipse, fill, line, network, rect, shape } from './draw'

const TISSUES = 'Tissues & organisms'

const LEAF = fill(C.green, C.greenLine)
const WOOD = '#8a6a3a'
const INK = '#3b4553'
const EYE = '#2b2f36'
const dot = (cx: number, cy: number, r: number, colour: string): string => circle(cx, cy, r, `fill="${colour}" stroke="none"`)
const turned = (deg: number, cx: number, cy: number, inner: string): string => `<g transform="rotate(${deg} ${cx} ${cy})">${inner}</g>`

function cereal(): string {
  const grain = fill(C.gold, C.goldLine, 'stroke-width="2"')
  let grains = ''
  let awns = 'M30 11V3'
  for (let k = 0; k < 5; k++) {
    const y = 74 - 11 * k
    grains += turned(-24, 22, y, ellipse(22, y, 5.5, 8.5, grain)) + turned(24, 38, y, ellipse(38, y, 5.5, 8.5, grain))
    awns += `M19 ${y - 8}l-5 -13M41 ${y - 8}l5 -13`
  }
  return (
    line(awns, C.goldLine, 1.6) +
    line('M30 132V70', C.goldLine, 3) +
    shape('M30 112C40 102 50 102 56 90C54 106 44 116 30 118Z', LEAF) +
    grains +
    ellipse(30, 19, 5.5, 8.5, grain)
  )
}

export const ORGANISM_ICONS: IconDef[] = [
  // ---- Plants and fungi ----
  def('leaf', 'Leaf', TISSUES, 'leaf,plant,photosynthesis,foliage,vein,botany', 80, 110,
    shape('M40 8C66 26 72 62 40 94C8 62 14 26 40 8Z', LEAF) +
      line('M40 18V106', C.greenLine, 2.5) +
      line('M40 34L53 25M40 34L27 25M40 50L59 39M40 50L21 39M40 66L57 56M40 66L23 56M40 80L49 74M40 80L31 74', C.greenLine, 1.8)),
  def('seedling', 'Seedling', TISSUES, 'seedling,sprout,germination,plant,cotyledon,arabidopsis,growth', 80, 108,
    line('M40 88V103M40 92L30 101M40 96L50 103', '#b58a6a', 2.5) +
      line('M40 84C40 66 38 56 40 42', C.greenLine, 4) +
      ellipse(40, 86, 32, 7, fill('#c9a27a', WOOD)) +
      shape('M40 44C28 46 12 38 10 22C26 20 40 28 40 44Z', LEAF) +
      shape('M40 44C52 46 68 38 70 22C54 20 40 28 40 44Z', LEAF) +
      line('M38 42L18 26M42 42L62 26', C.greenLine, 1.8) +
      shape('M40 40C35 30 37 20 42 12C47 20 46 32 40 40Z', fill('#d7f0a8', C.greenLine, 'stroke-width="2"'))),
  def('tree', 'Tree', TISSUES, 'tree,plant,forest,wood,canopy,ecology', 100, 122,
    shape('M43 116C46 98 46 82 44 62H56C54 82 54 98 57 116Z', fill('#c9a27a', WOOD)) +
      line('M24 116H76', WOOD, 2.5) +
      shape('M50 6C66 4 78 14 78 26C92 30 96 48 84 58C80 72 62 76 50 68C38 76 20 72 16 58C4 48 8 30 22 26C22 14 34 4 50 6Z', LEAF) +
      line('M32 34q6 -6 12 0M56 46q6 -6 12 0M36 54q5 -5 10 0M58 24q5 -5 10 0', C.greenLine, 2)),
  def('stomata', 'Stomata (leaf pore)', TISSUES, 'stoma,stomata,guard cell,leaf pore,gas exchange,transpiration,plant', 100, 80,
    shape('M50 8C40 20 38 30 38 40C38 50 40 60 50 72C60 60 62 50 62 40C62 30 60 20 50 8Z', fill('#2f6b45', C.greenLine)) +
      shape('M50 8C22 10 10 26 10 40C10 54 22 70 50 72C40 60 38 50 38 40C38 30 40 20 50 8Z', LEAF) +
      shape('M50 8C78 10 90 26 90 40C90 54 78 70 50 72C60 60 62 50 62 40C62 30 60 20 50 8Z', LEAF) +
      ellipse(24, 30, 4, 2.6, fill('#7cc48f', C.greenLine, 'stroke-width="1.5"')) + ellipse(22, 44, 4, 2.6, fill('#7cc48f', C.greenLine, 'stroke-width="1.5"')) + ellipse(28, 56, 4, 2.6, fill('#7cc48f', C.greenLine, 'stroke-width="1.5"')) +
      ellipse(76, 30, 4, 2.6, fill('#7cc48f', C.greenLine, 'stroke-width="1.5"')) + ellipse(78, 44, 4, 2.6, fill('#7cc48f', C.greenLine, 'stroke-width="1.5"')) + ellipse(72, 56, 4, 2.6, fill('#7cc48f', C.greenLine, 'stroke-width="1.5"'))),
  def('mycorrhiza', 'Root with fungal partners (mycorrhiza)', TISSUES, 'mycorrhiza,root,fungus,symbiosis,hyphae,soil,plant,nutrient exchange', 120, 110,
    line('M30 60L12 62M30 60L16 78M30 60L34 84M24 68L8 84M60 78L46 98M60 78L62 104M60 78L78 96M92 72L112 68M92 72L108 88M92 72L88 98M100 80L114 100M50 90L36 104', C.nucLine, 1.6) +
      circle(12, 62, 3, fill(C.nuc, C.nucLine, 'stroke-width="1.5"')) + circle(8, 84, 3, fill(C.nuc, C.nucLine, 'stroke-width="1.5"')) + circle(62, 104, 3, fill(C.nuc, C.nucLine, 'stroke-width="1.5"')) +
      circle(112, 68, 3, fill(C.nuc, C.nucLine, 'stroke-width="1.5"')) + circle(114, 100, 3, fill(C.nuc, C.nucLine, 'stroke-width="1.5"')) + circle(36, 104, 3, fill(C.nuc, C.nucLine, 'stroke-width="1.5"')) +
      network(['M60 8V78', 'M60 34L30 60', 'M60 50L92 72'], '#a8763f', '#f3dfc0', 6) +
      line('M8 10H112', WOOD, 2.5)),
  def('mushroom', 'Mushroom', TISSUES, 'mushroom,fungus,fruiting body,cap,gills,spores,mycology', 100, 108,
    shape('M40 52C42 74 40 90 34 102H66C60 90 58 74 60 52Z', fill('#fbf1e2', '#b58a6a')) +
      ellipse(50, 51, 40, 8, fill('#f6dcc0', '#a8663a')) +
      line('M26 55l-2 3M38 57l-1 2M50 57v2M62 57l1 2M74 55l2 3', '#a8663a', 1.6) +
      shape('M8 50C8 22 30 8 50 8C70 8 92 22 92 50C78 56 22 56 8 50Z', fill('#e9b98a', '#a8663a')) +
      circle(34, 28, 5, fill('#fff3e6', '#a8663a', 'stroke-width="1.5"')) + circle(58, 22, 4, fill('#fff3e6', '#a8663a', 'stroke-width="1.5"')) + circle(70, 38, 5, fill('#fff3e6', '#a8663a', 'stroke-width="1.5"')) + circle(46, 42, 3.5, fill('#fff3e6', '#a8663a', 'stroke-width="1.5"'))),
  def('cereal', 'Cereal crop (wheat)', TISSUES, 'wheat,cereal,crop,grain,barley,rice,agriculture,plant', 60, 136, cereal()),

  // ---- Animals ----
  def('fruit-fly', 'Fruit fly', TISSUES, 'drosophila,fruit fly,fly,insect,model organism,genetics', 120, 104,
    line('M52 44L34 32L24 36M52 50L32 52L22 60M54 54L40 70L30 72M68 44L86 32L96 36M68 50L88 52L98 60M66 54L80 70L90 72', C.greyLine, 2) +
      turned(28, 42, 68, ellipse(42, 68, 11, 28, fill('#eaf4fb', C.blueLine, 'stroke-width="1.8"'))) +
      turned(-28, 78, 68, ellipse(78, 68, 11, 28, fill('#eaf4fb', C.blueLine, 'stroke-width="1.8"'))) +
      ellipse(60, 70, 12, 18, fill('#f3d9a4', '#a8763f')) +
      line('M51 64h18M50 72h20M52 80h16', WOOD, 2.5) +
      circle(60, 46, 11, fill('#e2b877', '#a8763f')) +
      ellipse(60, 31, 8, 6, fill('#e2b877', '#a8763f')) +
      circle(52, 30, 4.5, fill(C.red, C.redLine, 'stroke-width="2"')) + circle(68, 30, 4.5, fill(C.red, C.redLine, 'stroke-width="2"')) +
      line('M57 25l-2 -6M63 25l2 -6', '#a8763f', 1.8)),
  def('bee', 'Bee', TISSUES, 'bee,honeybee,pollinator,insect,pollination,ecology', 120, 92,
    line('M70 62L64 80L58 82M78 64L78 82L72 84M86 62L92 78L88 82', INK, 2.2) +
      line('M17 56L7 58', INK, 2.5) +
      turned(35, 58, 22, ellipse(58, 22, 20, 7.5, fill('#eaf4fb', C.blueLine, 'stroke-width="1.8"'))) +
      turned(18, 52, 28, ellipse(52, 28, 26, 9, fill('#eaf4fb', C.blueLine, 'stroke-width="1.8"'))) +
      ellipse(44, 56, 28, 18, fill(C.gold, C.goldLine)) +
      line('M32 45V67M46 43V69M58 46V66', INK, 6) +
      circle(76, 50, 15, fill(C.orange, C.orangeLine)) +
      circle(97, 54, 10, fill('#8a93a3', INK)) +
      ellipse(100, 53, 3.2, 4.6, fill(EYE, EYE, 'stroke-width="1"')) +
      line('M101 46L109 34M96 45L98 32', INK, 2)),
  def('ant', 'Ant', TISSUES, 'ant,insect,colony,social insect,ecology,behaviour', 130, 84,
    line('M60 46L48 60L42 76M66 47L66 62L62 78M72 46L84 58L92 74M58 44L40 56L30 72M70 44L92 52L104 68', '#7a3f24', 2.2) +
      line('M100 27L110 16L120 20M96 25L100 11L110 9M104 40l7 3', '#7a3f24', 2) +
      ellipse(30, 40, 22, 15, fill('#d99a7a', '#7a3f24')) +
      circle(54, 44, 4.5, fill('#d99a7a', '#7a3f24')) +
      ellipse(68, 40, 13, 9, fill('#d99a7a', '#7a3f24')) +
      ellipse(94, 34, 11, 10, fill('#d99a7a', '#7a3f24')) +
      dot(98, 32, 2.2, EYE) +
      line('M22 28C26 34 26 46 22 53M34 26C38 34 38 46 34 54', '#7a3f24', 1.6)),
  def('cow', 'Cow', TISSUES, 'cow,cattle,bovine,livestock,ruminant,milk,agriculture', 150, 108,
    line('M22 40C12 44 12 60 14 72', C.greyLine, 2.5) +
      rect(34, 68, 10, 34, 3, fill('#ffffff', C.greyLine)) + rect(52, 70, 10, 32, 3, fill('#ffffff', C.greyLine)) +
      rect(92, 70, 10, 32, 3, fill('#ffffff', C.greyLine)) + rect(108, 68, 10, 34, 3, fill('#ffffff', C.greyLine)) +
      rect(34, 96, 10, 6, 2, fill(C.greyLine, C.greyLine)) + rect(52, 96, 10, 6, 2, fill(C.greyLine, C.greyLine)) +
      rect(92, 96, 10, 6, 2, fill(C.greyLine, C.greyLine)) + rect(108, 96, 10, 6, 2, fill(C.greyLine, C.greyLine)) +
      ellipse(74, 77, 10, 7, fill(C.pink, C.pinkLine)) +
      rect(20, 30, 104, 48, 22, fill('#ffffff', C.greyLine)) +
      shape('M44 31C54 36 60 46 52 54C42 58 32 50 34 40C36 34 40 32 44 31Z', fill(C.greyLine, C.greyLine, 'stroke-width="1.5"')) +
      shape('M84 46C94 42 104 50 100 62C92 70 80 64 78 56C78 50 80 48 84 46Z', fill(C.greyLine, C.greyLine, 'stroke-width="1.5"')) +
      line('M124 24C122 18 124 14 128 11', '#b58a6a', 3) +
      shape('M118 30C112 24 106 26 104 30C108 35 114 35 118 33Z', fill('#ffffff', C.greyLine)) +
      shape('M116 34C120 22 138 20 142 32L144 50C144 58 136 62 130 60C122 58 116 48 116 34Z', fill('#ffffff', C.greyLine)) +
      ellipse(137, 54, 8.5, 6.5, fill(C.pink, C.pinkLine)) +
      dot(134, 54, 1.3, C.pinkLine) + dot(140, 54, 1.3, C.pinkLine) + dot(131, 38, 2.3, EYE)),
  def('bird', 'Bird', TISSUES, 'bird,songbird,avian,finch,ecology,evolution,animal', 120, 100,
    line('M56 78V92M50 92H62M68 76V92M62 92H74', C.orangeLine, 2.5) +
      shape('M32 60L6 72L11 58L4 50L32 48Z', fill(C.blue, C.blueLine)) +
      shape('M97 25L114 32L97 37Z', fill(C.orange, C.orangeLine)) +
      shape('M28 54C28 34 46 26 64 28C70 14 92 12 98 28C100 38 96 44 90 48C88 68 70 82 52 80C38 78 28 68 28 54Z', fill(C.blue, C.blueLine)) +
      shape('M40 50C52 42 70 44 78 54C68 66 50 68 40 50Z', fill('#7fb1e6', C.blueLine)) +
      dot(87, 28, 2.8, EYE)),
  def('flatworm', 'Flatworm (planarian)', TISSUES, 'planarian,flatworm,regeneration,platyhelminth,model organism,stem cells', 150, 60,
    shape('M10 30C20 18 60 14 100 16C112 16 120 12 128 8C126 16 134 22 142 30C134 38 126 44 128 52C120 48 112 44 100 44C60 46 20 42 10 30Z', fill('#d9b38c', WOOD)) +
      line('M28 30H50M82 30H110', WOOD, 1.8) +
      ellipse(66, 30, 14, 5, fill('#f6e3c7', WOOD, 'stroke-width="2"')) +
      circle(124, 25, 4, fill('#ffffff', WOOD, 'stroke-width="1.5"')) + circle(124, 35, 4, fill('#ffffff', WOOD, 'stroke-width="1.5"')) +
      dot(123, 26, 1.8, EYE) + dot(123, 34, 1.8, EYE)),
]
