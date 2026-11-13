// Icons drawn by hand for the "Flat cartoon" look. Where an icon has an entry here, the flat
// style uses this drawing; every other built-in icon is restyled automatically (style.ts).
//
// Rules of the look (all drawings here are original; never copy another studio's artwork):
// - no outlines; a shape is told apart by colour alone
// - saturated colours that also hold up on a dark page
// - shading in flat layers, never smooth gradients: a lighter crescent along the upper left
//   edge, a darker one along the lower right, and sometimes a small bright dot
// - everything rounded: round line ends, blobs, pills, and dots for detail
// - plain hex colours only, so every part can still be recoloured

export type Shape = (attrs: string) => string

/** Three shades of one colour: [light, main, dark]. */
export type Tones = [light: string, main: string, dark: string]

const BLUE: Tones = ['#8ea2ff', '#4d6bff', '#3346d1']
const SKY: Tones = ['#8ecbff', '#2f9bff', '#1f6ad6']
const CYAN: Tones = ['#9ff3ff', '#2fd6e8', '#12a6c4']
const PURPLE: Tones = ['#b592ff', '#8a4dff', '#5f2bd1']
const PINK: Tones = ['#ff8cc6', '#ff3d9a', '#c41f78']
const RED: Tones = ['#ff9a8a', '#ff5a4f', '#c9303f']
const ORANGE: Tones = ['#ffc27a', '#ff8a1f', '#d65f0f']
const YELLOW: Tones = ['#fff0a3', '#ffd23f', '#eba313']
const GREEN: Tones = ['#9af5c0', '#3ddc84', '#17a85a']

const ellipse = (cx: number, cy: number, rx: number, ry = rx): Shape => (a) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${a}/>`
const pill = (x: number, y: number, w: number, h: number): Shape => (a) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(w, h) / 2}" ${a}/>`
const path = (d: string): Shape => (a) => `<path d="${d}" ${a}/>`
const dot = (cx: number, cy: number, r: number, colour: string): string => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${colour}"/>`
const stroke = (d: string, colour: string, width: number): string => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${width}"/>`

/**
 * A solid shape shaded in flat layers. The shape is drawn in its light tone; the main tone covers
 * all of it except a crescent along the upper left edge, and the dark tone shows as a crescent
 * along the lower right. `id` must be unique within the icon (it names the two clip paths).
 */
export function solid(id: string, shape: Shape, [light, main, dark]: Tones, depth = 4): { defs: string; body: string } {
  return {
    defs: `<clipPath id="fl-${id}">${shape('')}</clipPath><clipPath id="fl-${id}-in" transform="translate(${depth} ${depth})">${shape('')}</clipPath>`,
    // One group per shape, so that splitting an icon gives one piece per shape.
    body:
      `<g>${shape(`fill="${light}"`)}` +
      `<g clip-path="url(#fl-${id})"><g clip-path="url(#fl-${id}-in)">` +
      shape(`fill="${dark}"`) +
      `<g transform="translate(${-depth} ${-depth})">${shape(`fill="${main}"`)}</g></g></g></g>`,
  }
}

/** A thick rounded line (any element given as a function of its paint) shaded the same way: darker along its lower right side, a thin light streak on the upper left. */
export function tubeOf(line: Shape, width: number, [light, main, dark]: Tones): string {
  const shift = Math.max(0.8, Math.round(width * 0.18 * 10) / 10)
  const paint = (colour: string, w: number): string => line(`fill="none" stroke="${colour}" stroke-width="${w}"`)
  return (
    `<g><g transform="translate(${shift} ${shift})">${paint(dark, width)}</g>` +
    paint(main, width) +
    `<g transform="translate(${-shift} ${-shift})">${paint(light, Math.max(1, Math.round(width * 0.22 * 10) / 10))}</g></g>`
  )
}

const tube = (d: string, width: number, tones: Tones): string => tubeOf(path(d), width, tones)

/** Put an icon together: clip paths first, then the drawing in order. */
function icon(...parts: (string | { defs: string; body: string })[]): string {
  const defs = parts.map((p) => (typeof p === 'string' ? '' : p.defs)).join('')
  const body = parts.map((p) => (typeof p === 'string' ? p : p.body)).join('')
  return `${defs ? `<defs>${defs}</defs>` : ''}${body}`
}

const r1 = (v: number): number => Math.round(v * 10) / 10

// ---------- the drawings (same sizes as the outlined icons they stand in for) ----------

/** Animal cell, 120 × 100. */
function cell(): string {
  const blob = path('M60 5C93 3 116 24 115 52C114 81 89 96 58 95C28 96 5 80 5 50C5 22 27 7 60 5Z')
  return icon(
    solid('cell', blob, BLUE, 5),
    solid('cell-nucleus', ellipse(50, 50, 21), PINK),
    dot(56, 55, 6.5, YELLOW[1]),
    dot(44, 42, 3, PINK[0]),
    solid('cell-mito', pill(76, 24, 24, 12), ORANGE, 2.5),
    solid('cell-vesicle', ellipse(88, 62, 8), CYAN, 2.5),
    `<g transform="rotate(-24 78 80)">${pill(66, 75, 22, 9)(`fill="${GREEN[1]}"`)}</g>`,
    dot(26, 62, 3.5, CYAN[0]) + dot(34, 76, 2.5, YELLOW[0]) + dot(22, 44, 2.5, YELLOW[1]) + dot(98, 44, 2.5, CYAN[0]) + dot(70, 58, 2.2, YELLOW[0]),
  )
}

/** Nucleus, 100 × 100. */
function nucleus(): string {
  let pores = ''
  for (let k = 0; k < 10; k++) {
    const a = (k * Math.PI) / 5 + 0.3
    pores += dot(r1(50 + 43 * Math.cos(a)), r1(50 + 43 * Math.sin(a)), 3.2, YELLOW[1])
  }
  return icon(
    solid('nuc', ellipse(50, 50, 43), PURPLE, 5),
    stroke('M22 44q8 -12 16 -2t14 -4', PURPLE[2], 4.5),
    stroke('M30 70q10 8 18 -2', PURPLE[2], 4.5),
    stroke('M66 28q10 2 10 12', PURPLE[2], 4.5),
    solid('nuc-lolus', ellipse(60, 58, 14), PINK, 3),
    dot(55, 53, 3, PINK[0]),
    pores,
  )
}

/** Mitochondrion, 120 × 60. */
function mitochondrion(): string {
  const folds = ['M26 15v19', 'M42 45v-19', 'M58 15v19', 'M74 45v-19', 'M90 15v19']
  return icon(
    solid('mito', pill(4, 6, 112, 48), RED, 4.5),
    folds.map((d) => stroke(d, ORANGE[0], 7)).join(''),
    dot(34, 40, 2.5, YELLOW[0]) + dot(50, 20, 2.5, YELLOW[0]) + dot(66, 40, 2.5, YELLOW[0]) + dot(82, 20, 2.5, YELLOW[0]) + dot(100, 40, 2.5, YELLOW[0]),
  )
}

/** Bacterium, 132 × 60. */
function bacterium(): string {
  const hairs = ['M22 12v-7', 'M40 11v-8', 'M58 11v-8', 'M76 12v-7', 'M22 48v7', 'M40 49v8', 'M58 49v8', 'M76 48v7', 'M8 30h-5']
  return icon(
    stroke('M94 30c7 -12 12 12 19 0s9 -10 14 -2', GREEN[2], 4.5),
    hairs.map((d) => stroke(d, GREEN[0], 3.5)).join(''),
    solid('bact', pill(8, 12, 90, 36), GREEN, 4),
    stroke('M30 30q7 -9 14 0t14 0t14 0', '#0e7a47', 4),
    dot(24, 24, 2.6, YELLOW[1]) + dot(82, 36, 2.6, YELLOW[1]) + dot(70, 22, 2, YELLOW[0]),
  )
}

/** Virus, 100 × 100. */
function virus(): string {
  let spikes = ''
  for (let k = 0; k < 12; k++) {
    const a = (k * Math.PI) / 6
    const [c, s] = [Math.cos(a), Math.sin(a)]
    spikes += stroke(`M${r1(50 + 27 * c)} ${r1(50 + 27 * s)}L${r1(50 + 40 * c)} ${r1(50 + 40 * s)}`, CYAN[1], 5) + dot(r1(50 + 42 * c), r1(50 + 42 * s), 5.2, CYAN[0])
  }
  return icon(
    spikes,
    solid('virus', ellipse(50, 50, 28), PINK, 4),
    stroke('M36 52q4 -9 8 0t8 0t8 0', '#8a1256', 4),
    dot(42, 38, 3, PINK[0]) + dot(62, 62, 2.4, YELLOW[1]),
  )
}

/** Receptor, 40 × 126: binding cup outside the cell, stem through the membrane, signalling end inside. */
function receptor(): string {
  const cup = path('M3 9a6.5 6.5 0 0 1 13 0v9a4 4 0 0 0 8 0v-9a6.5 6.5 0 0 1 13 0v13c0 12 -8 19 -17 19s-17 -7 -17 -19z')
  return icon(
    stroke('M20 38v56', SKY[2], 11),
    stroke('M18.5 40v52', SKY[1], 8),
    solid('rec-cup', cup, SKY, 3),
    solid('rec-end', ellipse(20, 106, 14, 16), ORANGE, 3.5),
    dot(15, 100, 2.6, ORANGE[0]),
  )
}

/** Antibody, 100 × 112. */
function antibody(): string {
  return icon(
    tube('M32 64L11 33', 9, CYAN),
    tube('M68 64L89 33', 9, CYAN),
    tube('M50 102V62', 14, PURPLE),
    tube('M50 62L24 24', 14, PURPLE),
    tube('M50 62L76 24', 14, PURPLE),
    dot(20, 18, 6, YELLOW[1]) + dot(80, 18, 6, YELLOW[1]) + dot(8, 28, 4.5, YELLOW[0]) + dot(92, 28, 4.5, YELLOW[0]),
    dot(50, 66, 3, PURPLE[0]),
  )
}

/** DNA, 140 × 50. */
function dna(): string {
  const front = 'M4 25C13 4 24 4 36 25S59 46 70 25S93 4 104 25S127 46 136 25'
  const back = 'M4 25C13 46 24 46 36 25S59 4 70 25S93 46 104 25S127 4 136 25'
  const rungs = [12, 20, 28, 46, 54, 62, 78, 86, 94, 112, 120, 128]
  const colours = [YELLOW[1], CYAN[1], GREEN[1], ORANGE[1]]
  return icon(
    tube(back, 6, SKY),
    rungs
      .map((x, i) => {
        // Half the height of the gap between the two strands at this place along the helix.
        const half = Math.abs(Math.sin(((x - 4) / 66) * Math.PI)) * 14
        return half > 3 ? stroke(`M${x} ${r1(25 - half + 2)}V${r1(25 + half - 2)}`, colours[i % colours.length], 3.5) : ''
      })
      .join(''),
    tube(front, 6, PINK),
  )
}

/** Hand-drawn flat cartoon versions, by the id of the icon they replace in that style. */
export const FLAT_DRAWN: Record<string, string> = {
  cell: cell(),
  nucleus: nucleus(),
  mitochondrion: mitochondrion(),
  bacterium: bacterium(),
  virus: virus(),
  receptor: receptor(),
  antibody: antibody(),
  dna: dna(),
}
