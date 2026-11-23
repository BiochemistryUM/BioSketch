// Eight icons of SiliCoDraw's "Cells & tissues" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts in ../parts/:
// ageing in nerve, muscle and bone: glymphatic clearance, neurogenesis decline, myelin degeneration, a denervated muscle
// fibre, fragmentation of the neuromuscular junction, bone marrow adiposity, the bone remodelling unit and motor unit
// loss. Their compositions are read by hand from the source in a 100 × 100 box centred on 0,0 and scaled onto a 512 page
// (`page` of ../cellkit.mjs).
// Parts used: blood vessel lengthwise and arrows (tissue.mjs), the approved Adipocyte (`placeCellType`, tissue.mjs), the
// nucleus (organelles.mjs). Drawn here because no part draws them: astrocyte endfeet, a radial glial stem cell, myelin
// sheaths and myelin debris, a muscle fibre with its motor endplate, a nerve ending, a motor neuron with a branched axon,
// an osteoclast and osteoblasts without their bone (the approved cell types carry a slab of bone of their own), bone
// with resorption pits, cortical bone and marrow in section.
// Colours follow the approved cell types: neurons peach with blue myelin (Neuron, Schwann cell), astrocytes yellow
// (Astrocyte), muscle rose (Muscle satellite cell), acetylcholine receptors green (the receptors of Synapse), bone tan,
// osteoid yellow-green (Osteoblast, Osteocyte), every nucleus lilac. Nothing is lettered: no original writes a label.
// Usage: node ct13.mjs <folder>
import { mkdirSync } from 'node:fs'
import { IVORY, NUC, PEACH, cellTypes, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex } from '../colour.mjs'
import { f } from '../shapes.mjs'
import { arrow, placeCellType, vessel } from '../parts/tissue.mjs'
import { nucleus } from '../parts/organelles.mjs'
import { mergeParts } from '../parts/membranes.mjs'

const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const { cellType, check } = cellTypes(OUT)

// ---------- the hues of the batch (OKLCH degrees); the nucleus lilac is about 319° ----------
const NEURON = soft(PEACH) // 52°, the approved Neuron (#FCE2D3, #AF6E45)
const MYELIN = soft(245) // the approved Neuron's and Schwann cell's myelin (#D5EBFE, #4986B8)
const ASTRO = { ...rich(86), base: '#FFEDC7', shadow: '#FFD988', outline: '#BA9232' } // the approved Astrocyte
const MUSCLE = soft(15) // as Muscle satellite cell
const ACHR = soft(160) // receptors, green as in Synapse
const STEM = soft(163) // SiliCoDraw's green neural stem cell (#5fae8b)
const CSF = soft(200) // cerebrospinal fluid: aqua, clear of the vein's blue (SiliCoDraw's pale blue is the vein's hue)
const ARTERY = deep(hueOf('#f3c6c6')), VEIN = deep(262) // artery and vein are known by their colours: the vessel's rose and SiliCoDraw's vein blue, fuller
const BONE = IVORY, OSTEOID = rich(110) // the approved Osteocyte and Osteoblast (ivory since the review of 23 November 2026)
const OSTEOCLAST = soft(218), OSTEOBLAST = soft(258) // approved 222° and 255° lie 33° apart: moved to 40° apart
const MARROW = deep(10) // red marrow, a fuller rose: SiliCoDraw's 25° lies 27° from the adipocyte's peach (52°)
// Greys (chroma below 0.012): BioSketch never recolours them with a part, so they are not listed for the hue check.
const grey = (l, c = 0.006, h = 255) => toHex({ l, c, h })
const GREY = { light: grey(0.985, 0.002), base: grey(0.95), shadow: grey(0.88, 0.008), small: grey(0.74, 0.008), outline: grey(0.5, 0.008) }
const INK = grey(0.5, 0.008) // arrows that are not the colour of anything
const GHOST = toHex({ l: 0.74, c: 0.004, h: 50 }) // what is gone (as Synapse loss)
// Cortical bone round marrow fat: an ivory near grey. Bone's tan (70°) lies 18° from the adipocyte's peach and 26° from
// its fat; as a grey it never recolours with them.
// (IVORY is cellkit's bone.)

// ---------- helpers ----------
const boxGrad = (id, pal) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`
const sw = (s, w) => (s ? ` stroke="${s}" stroke-width="${f(w)}" stroke-linejoin="round"` : '')
/** A rounded rectangle given in their units. */
const rect = (g, x, y, w, h, rx, fill, s = '', w2 = 0, extra = '') =>
  `<rect x="${f(g.X(x))}" y="${f(g.Y(y))}" width="${f(w * g.k)}" height="${f(h * g.k)}" rx="${f(rx * g.k)}" fill="${fill}"${sw(s, w2)}${extra}/>`
/** A rounded rectangle in their units as a path on the page (for unions). */
const rectP = (g, x, y, w, h, r) => {
  const [x0, y0] = g.P([x, y]), W = w * g.k, H = h * g.k, R = Math.min(r * g.k, W / 2, H / 2)
  return `M${f(x0 + R)},${f(y0)} H${f(x0 + W - R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + W)},${f(y0 + R)} V${f(y0 + H - R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + W - R)},${f(y0 + H)} H${f(x0 + R)} A${f(R)},${f(R)} 0 0 1 ${f(x0)},${f(y0 + H - R)} V${f(y0 + R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + R)},${f(y0)} Z`
}
/** An ellipse in their units as a path on the page (for unions). */
const ellP = (g, x, y, rx, ry) => { const [cx, cy] = g.P([x, y]), A = rx * g.k, B = ry * g.k; return `M${f(cx - A)},${f(cy)} A${f(A)},${f(B)} 0 1 0 ${f(cx + A)},${f(cy)} A${f(A)},${f(B)} 0 1 0 ${f(cx - A)},${f(cy)} Z` }
/** An open curve given in their units (M, L, C, Q only), drawn as a line with round ends; width in pixels. */
const curve = (g, d, colour, w, extra = '') => `<path d="${g.D(d)}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`
/** A tube along an open curve: the outline colour, then the fill inside it (outer width and wall in pixels). */
const tube = (g, d, outline, fill, w, wall) => curve(g, d, outline, w) + curve(g, d, fill, w - 2 * wall)
const dashed = (el, dash) => el.replace(/\/>$/, ` stroke-dasharray="${dash}"${el.includes('stroke-linecap') ? '' : ' stroke-linecap="round"'}/>`)
/** Joins the { defs, body, parts } of several parts; parts that share a palette are one. */
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), parts: mergeParts(ps.flatMap((p) => p.parts)) })
const icon = (name, { defs, body, parts }) => cellType(name, parts, defs, body)
/** A drawing of this script: { defs, body, parts }. */
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })
/** A part whose colour is not a part of its own (arrows in grey or in the tone of what moves). */
const extra = (p) => ({ ...p, parts: [] })

// ---------------------------------------------------------------------------------------------------------------------
// Glymphatic clearance: cerebrospinal fluid flows in along the space round an artery (left, aqua), crosses the brain
// tissue between the astrocyte endfeet that line that space (yellow, with their water channels, aquaporin-4, as dark
// marks facing the vessel), carries waste (grey dots) through the tissue and leaves along the space round a vein (right).
// (SiliCoDraw draws the endfeet orange and the space pale blue, and marks the flow along the spaces with small chevrons on
// their outer edge. Here the endfeet are the yellow of the approved Astrocyte, the space aqua (its pale blue lay within
// 17° of the vein), and the flow along each space is one arrow in the space itself, between vessel and endfeet, which
// is where the fluid runs; the vessels are the vessel part, the artery rose and the vein blue.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.8, [0, 0])
  const space = (s) => {
    const x0 = s < 0 ? -48 : 14
    return own(`${s < 0 ? 'periarterial' : 'perivenous'}-space`, rect(g, x0, -46.5, 34, 93, 6, `url(#csf-gradient)`, CSF.outline, 7), [['cerebrospinal fluid', CSF]])
  }
  const art = vessel(g, { x: -37.5, y: 0, size: 92, points: [[-37.5, -46.5], [-37.5, 46.5]], thick: 15.5 / 92, ends: 'open', id: 'artery', pal: ARTERY, w: 7 })
  const vein = vessel(g, { x: 37.5, y: 0, size: 92, points: [[37.5, -46.5], [37.5, 46.5]], thick: 15.5 / 92, ends: 'open', id: 'vein', pal: VEIN, w: 7 })
  const feet = [-1, 1].map((s) => {
    const x = s < 0 ? -21.5 : 12.5
    const ys = [-46, -27.5, -9, 9.5, 28]
    return own(`${s < 0 ? 'arterial' : 'venous'}-endfeet`,
      ys.map((y) => rect(g, x, y + 0.5, 9, 17, 4, 'url(#endfoot-gradient)', ASTRO.outline, 6)).join('') +
        ys.map((y) => rect(g, s < 0 ? x - 1.2 : x + 9 - 2.3, y + 6.5, 3.5, 5, 1.2, ASTRO.outline)).join(''),
      [['astrocyte endfeet', ASTRO]])
  })
  const along = [[-26, -40, -20], [-26, 4, 24]].map(([x, a, b], i) => arrow(g, { points: [[x, a], [x, b]], corners: true, w: 6, colour: CSF.outline, id: `inflow-${i + 1}` }))
  const out = [[26, 20, 0], [26, -24, -44]].map(([x, a, b], i) => arrow(g, { points: [[x, a], [x, b]], corners: true, w: 6, colour: CSF.outline, id: `outflow-${i + 1}` }))
  const flow = [-26, 0, 26].map((y, i) => arrow(g, { points: [[-9.5, y], [-5, y - 3.2], [0, y + 2.6], [5, y - 1.5], [9.5, y]], w: 8, colour: INK, id: `interstitial-flow-${i + 1}` }))
  const waste = own('waste', [[-5, -14, 2.2], [4, -11, 2], [-3, 13, 2.2], [5, 11, 1.9], [0, -39, 2], [-3, 39, 2]].map(([x, y, r]) => g.circle(x, y, r, GREY.small)).join(''))
  icon('Glymphatic clearance', join(
    { ...space(-1), defs: g.grad('csf-gradient', [-48, -46, 48, 46], CSF) + boxGrad('endfoot-gradient', ASTRO) }, space(1), art, vein,
    ...feet, ...along.map(extra), ...out.map(extra), ...flow.map(extra), waste))
}

// ---------------------------------------------------------------------------------------------------------------------
// Neurogenesis decline: a neural stem cell (radial glia: a body at the bottom, one long process branching at its end)
// makes a neuroblast, which would become a new neuron; with age both are fewer, so they are drawn as dashed ghosts, and
// a large arrow points down.
// (SiliCoDraw's composition and green. The stem cell carries the lilac nucleus of the set; the ghosts are grey, as the
// lost synapse of Synapse loss; the arrow to the ghost neuron is fainter than the first.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(5.05, [-2, -3])
  const proc = ['M-34,24C-34,8 -31,-10 -32,-26', 'M-32,-26C-36,-32 -40,-36 -44,-42', 'M-32,-26C-30,-34 -30,-38 -28,-44', 'M-32,-26C-26,-30 -22,-34 -18,-38']
  const soma = g.smooth([[-45, 35], [-42.5, 24], [-35, 16], [-27.5, 22], [-23.5, 33], [-34, 39.5]])
  const stem = own('stem-cell',
    g.union([soma, ...proc.map((d, i) => ({ d: g.D(d), width: i ? 15 : 19 }))], 'url(#stem-gradient)', STEM.outline, 6) + g.hl(-38.5, 23.5, 7, 2.6, -45, STEM.light),
    [['neural stem cell', STEM]], g.grad('stem-gradient', [-46, -44, -18, 40], STEM))
  const nuc = nucleus(g, { x: -34, y: 30, size: 12, oval: 0.85, id: 'stem-nucleus', w: 5 })
  const make = arrow(g, { points: [[-20, 30], [-11, 30]], corners: true, w: 8, colour: INK, id: 'arrow-to-neuroblast' })
  const mature = arrow(g, { points: [[10.5, 23.5], [19, 15]], corners: true, w: 7, colour: GHOST, id: 'arrow-to-neuron' })
  const ghostLine = (d, w = 6) => dashed(curve(g, d, GHOST, w), '9 10')
  const blast = own('neuroblast', dashed(g.ellipse(1, 31, 9, 6.5, 0, GREY.base, GHOST, 6), '10 10') + ghostLine('M10.5,31.5C14,31.5 17,32 20,33.5'))
  const neuron = own('new-neuron', dashed(g.path(g.smooth([[20, 8], [27, 0], [36, 4], [38, 13], [30, 19], [21, 16]]), GREY.base, GHOST, 6), '10 10') +
    ['M29,0C29,-6 28,-14 24,-24', 'M28.5,-10C33,-16 37,-22 40,-30', 'M25,-18C23,-24 22,-28 20,-34', 'M33,18.5C35,26 36,32 40,40'].map((d) => ghostLine(d)).join(''))
  const decline = arrow(g, { points: [[-1, -46.5], [-1, -11]], corners: true, w: 30, head: 78, colour: STEM.outline, id: 'decline' })
  icon('Neurogenesis decline', join(stem, nuc, extra(make), blast, extra(mature), neuron, extra(decline)))
}

// ---------------------------------------------------------------------------------------------------------------------
// Myelin degeneration: an axon (peach) wrapped in segments of myelin (blue) with nodes between them; the middle segment
// has swollen into a balloon as its layers split apart, and broken myelin lies below as ovoids (debris).
// (SiliCoDraw draws the myelin peach and the axon orange. Here they are the approved Neuron's: the axon peach, the myelin
// blue; the debris is myelin and takes its blue. The ovoids are a little larger, so that they still show at 40 px.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.62, [0, 7]), Y = 10
  const axon = own('axon', tube(g, `M-49,${Y}L49,${Y}`, NEURON.outline, NEURON.base, 34, 6), [['axon', NEURON]])
  const seg = (x0, x1, i) => rect(g, x0, Y - 12, x1 - x0, 24, 11, 'url(#myelin-gradient)', MYELIN.outline, 9) +
    curve(g, `M${x0 + 7},${Y - 4.5}L${x1 - 7},${Y - 4.5}M${x0 + 7},${Y + 4.5}L${x1 - 7},${Y + 4.5}`, MYELIN.small, 4) + g.hl(x0 + 10, Y - 8, 5, 2, 0, MYELIN.light)
  const sheaths = own('myelin', seg(-50, -22, 1) + seg(22, 50, 2), [['myelin', MYELIN]])
  const swollen = own('swollen-myelin',
    g.union([rectP(g, -18, Y - 12, 36, 24, 11), ellP(g, 2, Y - 22, 20, 16)], 'url(#balloon-gradient)', MYELIN.outline, 9) +
      g.ellipse(2, Y - 22, 13.5, 10, 0, MYELIN.light, MYELIN.small, 4) + g.hl(-7, Y - 30, 4.5, 2, -25, '#FFFFFF') +
      curve(g, `M-13,${Y - 6}C-9,${Y - 4} 12,${Y - 4} 16,${Y - 6}`, MYELIN.small, 4) + curve(g, `M-11,${Y + 5}L-2,${Y + 5}M6,${Y + 5}L12,${Y + 5}`, MYELIN.small, 4),
    [], g.grad('balloon-gradient', [-22, Y - 38, 22, Y + 12], MYELIN))
  const debris = own('myelin-debris', [[-10, 37, 6.2, 4, -15], [6, 40.5, 5, 3.4, 10], [19.5, 34.5, 4.4, 3, -25], [-25, 39.5, 4, 2.8, 20]]
    .map(([x, y, rx, ry, r]) => g.ellipse(x, y, rx, ry, r, MYELIN.base, MYELIN.outline, 5)).join(''))
  icon('Myelin degeneration', join({ ...axon, defs: g.grad('myelin-gradient', [-50, Y - 12, 50, Y + 12], MYELIN) }, sheaths, swollen, debris))
}

// ---------------------------------------------------------------------------------------------------------------------
// The muscle fibre of nerve and muscle in this batch: rose, myofibrils as long lines and myonuclei flat at its edge, as
// the approved Muscle satellite cell draws it. Returns the fibre and its nuclei.
const fibre = (g, { x, y, w, h, id, line = 5, faint = false }) => ({
  body: rect(g, x, y, w, h, Math.min(h / 2, 14), faint ? MUSCLE.light : `url(#${id}-gradient)`, faint ? MUSCLE.small : MUSCLE.outline, line),
  defs: g.grad(`${id}-gradient`, [x, y, x + w, y + h], MUSCLE),
})

// ---------------------------------------------------------------------------------------------------------------------
// Denervated muscle fibre: the nerve has withdrawn from the fibre and ends in a swollen retraction bulb; a dashed line
// marks where it reached the motor endplate, which is left empty, its acetylcholine receptors (green) still in place.
// (SiliCoDraw draws the nerve yellow with Schwann cell marks and the receptors dark red. Here the nerve is the approved
// Neuron's peach, the receptors green as in Synapse, the fibre as in Muscle satellite cell: myofibrils lengthwise,
// myonuclei flat at its edge, where SiliCoDraw draws cross-striations.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.86, [0, -1.5])
  const fb = fibre(g, { x: -47, y: 3, w: 94, h: 38, id: 'fibre', line: 12 })
  const muscle = own('muscle-fibre', fb.body + g.hl(-30, 9.5, 26, 4.5, -2, MUSCLE.light) +
    [17, 24, 31].map((y) => g.line([[-37, y], [37, y]], MUSCLE.small, 5)).join(''), [['muscle fibre', MUSCLE]], fb.defs)
  const nuclei = own('myonuclei', [[-25, 35.5], [26, 35.5]].map(([x, y]) => g.ellipse(x, y, 7.5, 3.2, 0, 'url(#myonucleus-gradient)', NUC.outline, 6)).join(''), [['nucleus', NUC]], boxGrad('myonucleus-gradient', NUC))
  const plate = own('motor-endplate', g.path(g.D('M-9,4C-9,-5.5 25,-5.5 25,4Z'), MUSCLE.shadow, MUSCLE.outline, 8) +
    [[-1.5, 0.6], [8, -1.4], [17.5, 0.6]].map(([x, y]) => g.ellipse(x, y, 3.3, 2.4, 0, ACHR.small, ACHR.outline, 4)).join(''), [['acetylcholine receptors', ACHR]])
  const axD = 'M-41.5,-45C-35,-28 -26,-22.5 -16,-21.5'
  const nerve = own('nerve', tube(g, axD, NEURON.outline, 'url(#nerve-gradient)', 50, 6) + g.circle(-11, -20.5, 8.2, 'url(#nerve-gradient)', NEURON.outline, 6) +
    g.hl(-13.5, -23.5, 4, 1.8, -40, NEURON.light) + curve(g, 'M-39,-40C-35,-32 -31,-28.5 -27,-26.5', NEURON.light, 5), [['nerve', NEURON]], g.grad('nerve-gradient', [-48, -47, -3, -12], NEURON))
  const gone = own('lost-contact', dashed(curve(g, 'M-3,-15C3,-11 6,-7 8,-6', GHOST, 6), '8 10'))
  icon('Denervated muscle fibre', join(muscle, nuclei, plate, nerve, gone))
}

// ---------------------------------------------------------------------------------------------------------------------
// Neuromuscular junction fragmentation: a nerve ending branches over a muscle fibre (seen from above), but the pretzel of
// acetylcholine receptors beneath it has broken into many small islands, as at an ageing junction.
// (SiliCoDraw draws the nerve almost white and the receptor islands crimson. Here the nerve is the approved Neuron's
// peach, the receptors green as in Synapse; eleven islands round the ring and two inside, as SiliCoDraw has them, a
// little larger.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.8, [0, -2.5])
  const muscle = own('muscle-fibre', g.path(g.D('M-48,-6C-20,-12 20,-12 48,-6L48,40C20,46 -20,46 -48,40Z'), 'url(#fibre-gradient)', MUSCLE.outline, 12) +
    g.hl(-33, -2.5, 12, 3, -4, MUSCLE.light) + [3, 15, 27, 37].map((y) => g.line([[-41, y], [41, y]], MUSCLE.small, 4)).join(''),
  [['muscle fibre', MUSCLE]], g.grad('fibre-gradient', [-48, -12, 48, 46], MUSCLE))
  // Islands round the ring; sizes from a fixed sequence, so the same call draws the same islands.
  const sizes = [0.3, 0.9, 0.55, 0.15, 0.75, 0.4, 1, 0.2, 0.65, 0.85, 0.35]
  const isl = sizes.map((u, i) => {
    const t = (i / 11) * 2 * Math.PI + 0.2, x = 2 + 25 * Math.cos(t), y = 17 + 14 * Math.sin(t), r = 3.1 + u * 2.2, e = 1 + ((u * 7) % 1) * 0.5
    return g.ellipse(x, y, r * e, r, (t * 180) / Math.PI + 90, ACHR.small, ACHR.outline, 4.5)
  }).join('') + g.ellipse(-3, 15, 3.6, 2.7, 0, ACHR.small, ACHR.outline, 4.5) + g.ellipse(8.5, 21, 3, 2.3, 0, ACHR.small, ACHR.outline, 4.5)
  const islands = own('receptor-islands', isl, [['acetylcholine receptors', ACHR]])
  const ax = 'M-18,-48C-14,-30 -6,-20 -2,-8'
  const br = ['M-2,-8C-12,-2 -20,4 -22,12', 'M-2,-8C6,-4 16,0 24,10', 'M-2,-8C-2,2 -1,10 -2,16', 'M24,10C26,16 24,22 18,28', 'M-22,12C-22,20 -16,26 -8,30']
  const nerve = own('nerve-ending', g.union([{ d: g.D(ax), width: 34 }, ...br.map((d) => ({ d: g.D(d), width: 14 }))], 'url(#nerve-gradient)', NEURON.outline, 5) +
    curve(g, 'M-16,-44C-13,-33 -9,-25 -6,-18', NEURON.light, 5), [['nerve', NEURON]], g.grad('nerve-gradient', [-25, -48, 25, 30], NEURON))
  icon('Neuromuscular junction fragmentation', join(muscle, islands, nerve))
}

// ---------------------------------------------------------------------------------------------------------------------
// Bone marrow adiposity: a bone in section, its cortex round red marrow that fat cells (adipocytes) have crowded.
// (SiliCoDraw draws a cream cortex, red marrow and twelve fat cells as pale circles. Here the fat cells are the approved
// Adipocyte, nine of them a little larger, and the cortex an ivory near grey with its osteocytes as dots: the tan of the
// set's bone would recolour with the adipocyte (see IVORY). The marrow is a fuller rose (10°), clear of the adipocyte's
// peach.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(5.1, [0, 0.5])
  const outer = [[-44, -4], [-38, -26], [-18, -42], [6, -44], [30, -34], [44, -12], [44, 12], [32, 34], [8, 45], [-18, 42], [-38, 26]]
  const inner = [[-31, -2], [-26, -19], [-12, -30], [6, -31], [22, -24], [31, -8], [31, 9], [22, 24], [6, 32], [-12, 30], [-26, 18]]
  const bone = own('cortical-bone', g.path(g.smooth(outer), 'url(#bone-gradient)', IVORY.outline, 12) + g.hl(-27, -30, 13, 4, -40, IVORY.light) +
    [[-38, -13], [-27, -33], [-6, -40], [18, -38], [37, -21], [40, 1], [37, 21], [20, 37], [-4, 40.5], [-27, 33], [-39, 12]].map(([x, y]) => g.circle(x, y, 1.6, IVORY.small)).join(''),
  [], g.grad('bone-gradient', [-44, -44, 44, 45], IVORY))
  const marrow = own('red-marrow', g.path(g.smooth(inner), 'url(#marrow-gradient)', MARROW.outline, 7) +
    [[-26, 7], [-8, -27], [24, -15], [27, 0], [24, 14], [-17, 24], [-26, -9], [-4, 11], [10, 0], [8, -6], [-7, -8], [17, 23], [-2, 28], [-15, -24]].map(([x, y]) => g.circle(x, y, 1.6, MARROW.outline)).join(''),
  [['red marrow', MARROW]], g.grad('marrow-gradient', [-31, -31, 31, 32], MARROW))
  const fat = [[-14, -14, 14], [4, -19.5, 13], [19, -7, 13], [-20, 3, 13], [-3.5, -1, 15], [15, 9.5, 13], [-9.5, 16.5, 13], [6, 21, 12]]
    .map(([x, y, d], i) => placeCellType(g, 'Adipocyte', { x: x * 1.07, y: y * 1.07, size: d * 1.17, id: `adipocyte-${i + 1}`, turn: (i * 47) % 360 }))
  const fatJoined = { defs: fat.map((p) => p.defs).join(''), body: `<g id="adipocytes">${fat.map((p) => p.body).join('')}</g>`, parts: fat[0].parts }
  icon('Bone marrow adiposity', join(bone, marrow, fatJoined))
}

// ---------------------------------------------------------------------------------------------------------------------
// Bone remodelling unit: an osteoclast (aqua, several nuclei, ruffled border) resorbs a pit in the bone; beside it
// osteoblasts (blue) line the next pit and fill it with new matrix (osteoid, yellow-green); an osteocyte lies in the bone,
// and an arrow gives the order, resorption then formation.
// (SiliCoDraw draws the cells purple and the osteoid cream. Here each cell is drawn in the colours of its approved cell
// type, which cannot be placed as they are because each carries a slab of bone: the osteoclast aqua (moved from 222° to
// 218°) and the osteoblasts and osteocyte blue (255° to 258°), so that the two lie 40° apart; bone tan, osteoid
// yellow-green, nuclei lilac.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.78, [0, 2.5])
  const bone = own('bone', g.path(g.D('M-48,0L-42,0Q-24,26 -6,0L0,0Q20,16 40,0L48,0L48,44.5L-48,44.5Z'), 'url(#bone-gradient)', BONE.outline, 10) +
    curve(g, 'M-44,31Q-24,40 -3,31Q20,38 44,29', BONE.small, 5) + curve(g, 'M-44,39Q0,46 44,38', BONE.small, 5), [['bone', BONE]], g.grad('bone-gradient', [-48, 0, 48, 45], BONE))
  const osteoid = own('osteoid', g.path(g.D('M0,0Q20,16 40,0Q20,1 0,0Z'), 'url(#osteoid-gradient)', OSTEOID.outline, 5), [['osteoid', OSTEOID]], g.grad('osteoid-gradient', [0, 0, 40, 9], OSTEOID))
  const pq = (t) => [-42 + 36 * t, 52 * t * (1 - t)], bot = []
  for (let i = 1; i <= 9; i++) { const [x, y] = pq(i / 10); bot.push([x, y - 3]) }
  let rf = ''; for (let i = 2; i <= 16; i++) { const [x, y] = pq(i / 18); rf += `${i === 2 ? 'M' : 'L'}${f(x)},${f(y - (i % 2 ? 1.4 : 4.4))}` }
  const clast = own('osteoclast', g.path(g.smooth([[-48, -3], [-45, -14], [-34, -22], [-20, -23], [-8, -18], [-2, -8], [-3, -2], ...bot.reverse()]), 'url(#osteoclast-gradient)', OSTEOCLAST.outline, 9) +
    curve(g, rf, OSTEOCLAST.outline, 4) + g.hl(-36, -16.5, 7, 2.6, -25, OSTEOCLAST.light),
  [['osteoclast', OSTEOCLAST]], g.grad('osteoclast-gradient', [-48, -23, -2, 13], OSTEOCLAST))
  const clastNuclei = own('osteoclast-nuclei', [[-36.5, -9], [-26, -14], [-15.5, -10.5], [-24, -3]].map(([x, y]) => g.ellipse(x, y, 4.2, 3.3, 0, 'url(#nucleus-gradient)', NUC.outline, 5)).join(''), [['nuclei', NUC]], boxGrad('nucleus-gradient', NUC))
  const blasts = own('osteoblasts', [[5, 1.4, -10], [15, 3.4, -5], [25, 3.4, 1], [35, 1.4, 6]].map(([x, y, r]) =>
    `<g transform="rotate(${r} ${f(g.X(x))} ${f(g.Y(y))})">${rect(g, x - 4.6, y - 13.5, 9.2, 13.5, 3, 'url(#osteoblast-gradient)', OSTEOBLAST.outline, 6)}${g.circle(x, y - 8.3, 2.5, 'url(#nucleus-gradient)', NUC.outline, 4)}</g>`).join(''),
  [['osteoblasts and osteocyte', OSTEOBLAST]], boxGrad('osteoblast-gradient', OSTEOBLAST))
  const cyte = own('osteocyte', curve(g, 'M6,26L0,22M18,26L24,22M10,29L7,35M14,23L16,17M15,29L19,34', OSTEOBLAST.outline, 4) +
    g.ellipse(12, 26, 7.2, 4.2, 0, 'url(#osteoblast-gradient)', OSTEOBLAST.outline, 5))
  const order = arrow(g, { points: [[-3, -33], [8, -39.5], [18, -36], [22.5, -26]], w: 8, colour: INK, id: 'sequence' })
  icon('Bone remodelling unit', join(bone, osteoid, clast, clastNuclei, blasts, cyte, extra(order)))
}

// ---------------------------------------------------------------------------------------------------------------------
// Motor unit loss: one motor neuron and the muscle fibres its axon supplies; one branch is lost (dashed) and its fibre,
// denervated, has wasted to a thin pale strip.
// (SiliCoDraw draws the neuron yellow. Here it is the approved Neuron's peach with its lilac nucleus, its axon and
// branches one outline with the body; the fibres as in Muscle satellite cell, a myofibril line down each. The neuron
// is drawn here rather than placed: the approved Neuron has its own straight axon and terminal, and this one branches.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.78, [0, -4])
  const fy = [-6, 7, 20, 33]
  const fibres = fy.map((y, i) => (i === 2 ? fibre(g, { x: -14, y: y - 3.5, w: 58, h: 7, id: `fibre-${i + 1}`, line: 5, faint: true }) : fibre(g, { x: -22, y: y - 5.8, w: 70, h: 11.6, id: `fibre-${i + 1}`, line: 7 })))
  const muscle = own('muscle-fibres', fibres.map((p) => p.body).join('') + fy.filter((_, i) => i !== 2).map((y) => g.line([[-8, y + 0.6], [42, y + 0.6]], MUSCLE.small, 4) + g.line([[-14, y - 3], [36, y - 3]], MUSCLE.light, 4)).join(''),
    [['muscle fibres', MUSCLE]], fibres.map((p) => p.defs).join(''))
  const ax = 'M-36,-28C-34,-18 -34,-8 -33,0'
  const br = ['M-33,0C-30,-5 -24,-6 -18,-6', 'M-33,0C-28,5 -24,7 -18,7', 'M-33,0C-34,16 -28,33 -18,33']
  const soma = g.smooth([[-44, -46], [-36, -40], [-24, -47], [-24, -38], [-14, -34], [-26, -30], [-31, -24], [-40, -29], [-48, -24], [-44, -33]])
  const neuron = own('motor-neuron', g.union([soma, { d: g.D(ax), width: 22 }, ...br.map((d) => ({ d: g.D(d), width: 18 }))], 'url(#neuron-gradient)', NEURON.outline, 6) +
    [[-17.6, -6], [-17.6, 7], [-17.6, 33]].map(([x, y]) => g.ellipse(x, y, 3.8, 5, 0, NEURON.shadow, NEURON.outline, 5)).join(''),
  [['motor neuron', NEURON]], g.grad('neuron-gradient', [-48, -47, -14, 33], NEURON))
  const nuc = nucleus(g, { x: -34, y: -37.5, size: 11.5, id: 'neuron-nucleus', w: 5 })
  const lost = own('lost-branch', dashed(curve(g, 'M-30.5,12.5C-27.5,16.5 -25.5,18.5 -21,20', GHOST, 6), '7 9') + dashed(g.ellipse(-16.6, 20, 2.8, 3.4, 0, 'none', GHOST, 4.5), '6 6'))
  icon('Motor unit loss', join(muscle, neuron, nuc, lost))
}

check()
console.log('written to', OUT)
