// Icons of SiliCoDraw's "Cells & tissues" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md with the kit in ../cellkit.mjs:
// organoid, epithelium, sarcomere, myelinated axon, synapse, chloroplast, bacterium and a chain of cocci. Their shapes
// are read by hand from the source in a 100 × 100 box centred on 0,0 and scaled onto a 512 page.
// They follow the approved cell types: epithelial cells and neurons peach, myelin pale blue, cilia teal, muscle rose,
// the chloroplast the green of the plant cell's, every cell nucleus lilac (bacteria have none).
// Usage: node ct03.mjs <folder>
import { BLUE, GREEN, NUC, PEACH, cellTypes, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft } from '../colour.mjs'
import { f } from '../shapes.mjs'

const OUT = process.argv[2]
const { cellType, check } = cellTypes(OUT)

// The hues of the set (OKLCH degrees). The nucleus lilac is about 319°.
const EPI = soft(PEACH), CILIA = soft(200), LAMINA = soft(255), MYELIN = soft(BLUE), NEURON = soft(PEACH)
const MUSCLE = soft(15), MYOSIN = soft(262), ACTIN = soft(160), ZDISC = rich(88)
const TRANSMITTER = soft(255), RECEPTOR = soft(160)
const CHLOROPLAST = deep(155), BACTERIUM = soft(hueOf('#d8ecd0'))

/** A rounded rectangle given in their units. */
const rect = (g, x, y, w, h, rx, fill, s = '', sw = 0) =>
  `<rect x="${f(g.X(x))}" y="${f(g.Y(y))}" width="${f(w * g.k)}" height="${f(h * g.k)}" rx="${f(rx * g.k)}" fill="${fill}"${s ? ` stroke="${s}" stroke-width="${sw}" stroke-linejoin="round"` : ''}/>`
/** A thin tube along a path already on the page: the outline colour, then the fill inside it. */
const tube = (d, pal, w, wall = 3.5, inner = pal.shadow) =>
  `<path d="${d}" fill="none" stroke="${pal.outline}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${inner}" stroke-width="${f(w - 2 * wall)}" stroke-linecap="round" stroke-linejoin="round"/>`
/** An open line through points in their units. */
const lineD = (g, pts) => `M${pts.map(g.P).map(([x, y]) => `${f(x)},${f(y)}`).join(' L')}`
/** One gradient that lights every shape that uses it from its own top left (several cells, several nuclei). */
const boxGrad = (id, pal) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`
/** A small nucleus in the shared lilac, with a little highlight when it has room for one. */
const smallNucleus = (g, x, y, rx, ry, w, light = true) =>
  g.ellipse(x, y, rx, ry, 0, 'url(#nucleus-gradient)', NUC.outline, w) + (light ? g.hl(x - rx * 0.4, y - ry * 0.42, f(rx * g.k * 0.3), f(ry * g.k * 0.14), -30, NUC.light) : '')

// Organoid: a ball of cells grown in culture, cut through the middle: a ring of cells round a hollow lumen.
{
  const g = page(5.33, [0, 0]), body = soft(GREEN)
  const cells = Array.from({ length: 10 }, (_, i) => { const t = (i / 10) * Math.PI * 2; return [28 * Math.cos(t), 28 * Math.sin(t)] })
  const pale = { base: body.light, shadow: body.base }
  cellType('Organoid', [['organoid', body], ['nucleus', NUC]],
    g.grad('organoid-gradient', [-42, -42, 42, 42], body) + boxGrad('cell-gradient', pale) + boxGrad('nucleus-gradient', NUC),
    `<g id="organoid">${g.circle(0, 0, 42, 'url(#organoid-gradient)', body.outline, 12)}${g.hl(-27.6, -27.6, 24, 5, -45, body.light)}</g>\n` +
      `<g id="lumen">${g.circle(0, 0, 12, body.light, body.outline, 8)}</g>\n` +
      `<g id="cells">${cells.map(([x, y]) => g.circle(x, y, 8.4, 'url(#cell-gradient)', body.outline, 7)).join('')}</g>\n` +
      `<g id="nuclei">${cells.map(([x, y]) => g.circle(x, y, 3.5, 'url(#nucleus-gradient)', NUC.outline, 5)).join('')}</g>`)
}
// Epithelium: a sheet of four columnar cells on their basement membrane, nuclei towards the base, cilia on the free
// surface (two to a cell: SiliCoDraw spaces eight evenly, so that they drift across the cells).
{
  const g = page(4.6, [0, -5.1])
  const at = [-44, -22, 0, 22]
  const cilia = at.flatMap((x) => [x + 6, x + 16]).map((x) => g.D(`M${x},-27C${x - 2.5},-34 ${x - 2.5},-38 ${x},-43.5`))
  cellType('Epithelium', [['cytoplasm', EPI], ['cilia', CILIA], ['basement membrane', LAMINA], ['nucleus', NUC]],
    boxGrad('cell-gradient', EPI) + boxGrad('nucleus-gradient', NUC),
    `<g id="basement-membrane">${tube(lineD(g, [[-48, 32.9], [48, 32.9]]), LAMINA, 18, 4.5, LAMINA.small)}</g>\n` +
      `<g id="cilia">${cilia.map((d) => tube(d, CILIA, 14)).join('')}</g>\n` +
      `<g id="cytoplasm">${at.map((x) => rect(g, x, -30, 22, 60, 4, 'url(#cell-gradient)', EPI.outline, 12) + g.hl(x + 6.5, -22, 11, 4.5, -50, EPI.light)).join('')}</g>\n` +
      `<g id="nuclei">${at.map((x) => smallNucleus(g, x + 11, 9, 6, 7, 8)).join('')}</g>`)
}
// Sarcomere: one unit of a striated muscle fibril between two Z discs: thin filaments (actin) fixed to the Z discs,
// thick filaments (myosin) between them in the middle. Three thick and four thin rows, where SiliCoDraw has four and
// five; and the thin filaments run on beyond the Z discs, into the neighbouring sarcomeres, as they do.
{
  const g = page(4.65, [0, 0])
  const thin = [-15, -5, 5, 15], thick = [-10, 0, 10]
  cellType('Sarcomere', [['myofibril', MUSCLE], ['thin filaments', ACTIN], ['thick filaments', MYOSIN], ['Z discs', ZDISC]],
    g.grad('myofibril-gradient', [-48, -20, 48, 20], MUSCLE),
    `<g id="myofibril">${rect(g, -48, -20, 96, 40, 4, 'url(#myofibril-gradient)', MUSCLE.outline, 12)}</g>\n` +
      `<g id="thin-filaments">${thin.map((y) => [-1, 1].map((s) => g.line([[s * 43.5, y], [s * 13, y]], ACTIN.outline, 8)).join('')).join('')}</g>\n` +
      `<g id="thick-filaments">${thick.map((y) => tube(lineD(g, [[-19, y], [19, y]]), MYOSIN, 25, 6.5, MYOSIN.small)).join('')}</g>\n` +
      `<g id="z-discs">${[-32, 32].map((x) => g.line([[x, -18.2], [x, 18.2]], ZDISC.outline, 11)).join('')}</g>`)
}
// Myelinated axon: an axon wrapped in three segments of myelin, each made by one Schwann cell (its nucleus), with
// nodes of Ranvier between them where the axon lies bare.
{
  const g = page(4.55, [0, 0])
  const at = [-45, -12.5, 20]
  const axon = lineD(g, [[-47, 0], [47, 0]])
  cellType('Myelinated axon', [['axon', NEURON], ['myelin', MYELIN], ['nucleus', NUC]],
    g.grad('axon-gradient', [-50, -3, 50, 3], NEURON) + boxGrad('myelin-gradient', MYELIN) + boxGrad('nucleus-gradient', NUC),
    `<g id="axon">${g.union([{ d: axon, width: 19 }], 'url(#axon-gradient)', NEURON.outline, 6)}</g>\n` +
      `<g id="myelin">${at.map((x) => rect(g, x, -11, 25, 22, 11, 'url(#myelin-gradient)', MYELIN.outline, 10) + g.hl(x + 5.2, -5.6, 9, 3.5, -50, MYELIN.light)).join('')}</g>\n` +
      `<g id="nuclei">${at.map((x) => smallNucleus(g, x + 13, -4.6, 5.4, 3, 6, false)).join('')}</g>`)
}
// Synapse: an axon terminal with synaptic vesicles, transmitter released into the cleft, and receptors in the
// membrane of the cell below. (SiliCoDraw's terminal ends in a point at its top left; here the axon enters there.)
{
  const g = page(4.87, [0, 0])
  const terminal = g.D('M-35,-46L-15,-46C-13,-38 14,-40 26,-26C36,-16 36,-4 24,-2L-24,-2C-34,-2 -37,-14 -32,-24C-29,-31 -33,-38 -35,-46Z')
  cellType('Synapse', [['neuron', NEURON], ['transmitter', TRANSMITTER], ['receptors', RECEPTOR]],
    g.grad('terminal-gradient', [-36, -46, 34, -2], NEURON) + g.grad('postsynaptic-gradient', [-36, 16, 36, 46], NEURON),
    `<g id="axon-terminal">${g.path(terminal, 'url(#terminal-gradient)', NEURON.outline, 12)}${g.hl(-24.5, -27, 16, 6, -75, NEURON.light)}</g>\n` +
      `<g id="vesicles">${[[-11, -27], [5, -27.5], [-18, -13.5], [13, -14], [-2, -10.5]].map(([x, y]) => g.circle(x, y, 5, TRANSMITTER.small, TRANSMITTER.outline, 6)).join('')}</g>\n` +
      `<g id="transmitter">${[[-15, 3], [-5, 3.8], [5, 3], [15, 3.8]].map(([x, y]) => g.circle(x, y, 2.6, TRANSMITTER.small)).join('')}</g>\n` +
      `<g id="postsynaptic-cell">${rect(g, -36, 16, 72, 30, 4, 'url(#postsynaptic-gradient)', NEURON.outline, 12)}${g.hl(-21, 26.5, 20, 4.5, -4, NEURON.light)}</g>\n` +
      `<g id="receptors">${[-21, -7, 7, 21].map((x) => rect(g, x - 4, 8, 8, 12, 3, RECEPTOR.small, RECEPTOR.outline, 6)).join('')}</g>`)
}
// Chloroplast: the double envelope, the stroma inside it, and three grana (stacks of thylakoids) joined by stroma
// lamellae. Four thylakoids to a stack where SiliCoDraw has five, and the stacks moved in so that they stay inside the
// inner membrane (theirs cross it).
{
  const g = page(4.87, [0, 0]), chl = CHLOROPLAST
  const stacks = [[-23, -1.5], [0, 2.5], [23, -2]], rows = [-7.2, -2.4, 2.4, 7.2]
  const lamellae = [[[-15, -3.9], [-8, -4.7]], [[-15, 5.7], [-8, 4.9]], [[8, -4.7], [15, -4.4]], [[8, 4.9], [15, 5.2]]]
  cellType('Chloroplast', [['chloroplast', chl]],
    g.grad('envelope-gradient', [-46, -25, 46, 25], chl),
    `<g id="envelope">${g.ellipse(0, 0, 46, 25, 0, 'url(#envelope-gradient)', chl.outline, 12)}${g.hl(-30.5, -15.7, 20, 3, -27, chl.light)}</g>\n` +
      `<g id="stroma">${g.ellipse(0, 0, 40.5, 19.5, 0, chl.light, chl.outline, 6)}</g>\n` +
      `<g id="thylakoids">${lamellae.map((p) => g.line(p, chl.outline, 6)).join('')}${stacks.map(([x, y]) => rows.map((dy) => rect(g, x - 8, y + dy - 1.7, 16, 3.4, 1.7, chl.outline)).join('')).join('')}</g>`)
}
// Bacterium: a rod with a flagellum at one end and a few granules inside. No nucleus, so nothing lilac.
{
  const g = page(3.553, [17.04, 0]), cyto = BACTERIUM
  cellType('Bacterium', [['cell', cyto]],
    g.grad('cell-gradient', [-46, -19, 46, 19], cyto),
    `<g id="flagellum"><path d="${g.D('M44,0C47,5 51,8.5 55,7.5C60,6 62,-5 67,-6.5C72,-8 75,-2 80.5,3')}" fill="none" stroke="${cyto.outline}" stroke-width="9" stroke-linecap="round"/></g>\n` +
      `<g id="cell">${rect(g, -46, -19, 92, 38, 19, 'url(#cell-gradient)', cyto.outline, 12)}${g.hl(-26, -11.5, 26, 6, -8, cyto.light)}</g>\n` +
      `<g id="granules">${[[-22, -3, 4], [-2, 6, 5], [18, -5, 4]].map(([x, y, r]) => g.circle(x, y, r, cyto.small)).join('')}</g>`)
}
// Cocci chain: five round bacteria joined in a chain (streptococci), each with a granule. They touch where
// SiliCoDraw's overlap, with one outline round the chain.
{
  const g = page(4.76, [0, 2]), cyto = BACTERIUM, R = 10.9
  const cocci = [[-36, 10], [-18, -4], [0, 8], [18, -6], [36, 6]]
  cellType('Cocci chain', [['cell', cyto]],
    boxGrad('cell-gradient', cyto),
    `<g id="cells">${cocci.map(([x, y]) => g.circle(x, y, R, cyto.outline, cyto.outline, 12)).join('')}${cocci.map(([x, y]) => g.circle(x, y, R - 6 / g.k, 'url(#cell-gradient)') + g.hl(x - 4, y - 4.6, 11, 4.5, -45, cyto.light)).join('')}</g>\n` +
      `<g id="granules">${cocci.map(([x, y]) => g.circle(x + 2.4, y + 2.8, 3, cyto.small)).join('')}</g>`)
}

check()
console.log('written to', OUT)
