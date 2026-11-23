// Eight icons of SiliCoDraw's "Techniques & assays" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David
// Carlsson; see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts
// of the category in ../parts/assays.mjs: a volcano plot, a Manhattan plot, UMAP clusters, a growth curve, qPCR curves,
// enzyme kinetics, an action potential and a hypnogram. Each is the `plot` part (a paper card with axes, flat data in the
// series colours of the conventions of assays), with its ready-made data where the part has them.
// Lettered (strokes, letters.mjs): V_max and K_m on the enzyme kinetics plot, mV on the action potential.
// Left out: SiliCoDraw's words (lag, log, stat. on the growth curve; night under the hypnogram) and the stage names of the
// hypnogram (W, REM, N2, N3), which are too small to read beside the card; REM sleep is marked by a heavier red line,
// as sleep laboratories draw it.
// The current look: outlines at 60 % (setStrokeScale), the gloss on (setGloss; nothing here is glossed: plots are flat
// pictures of data). Lines that are the drawing itself (curves, axes, thresholds, letters) keep their width.
// Usage: node tbA.mjs <folder>
import { cellTypes, page, setGloss } from '../cellkit.mjs'
import { toLch } from '../colour.mjs'
import { f, setStrokeScale } from '../shapes.mjs'
import { SERIES, plot } from '../parts/assays.mjs'
import { INK } from '../parts/lab.mjs'
import { fits, lettering } from '../parts/letters.mjs'
import { mkdirSync } from 'node:fs'

const OUT = process.argv[2]
const SCALE = 0.6
setStrokeScale(SCALE)
setGloss(true)
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT)
// Greys (chroma below 0.012: paper, ink, materials) are left out of the hue check, as the conventions of lab.mjs say; a
// palette used twice is one part that recolours as one, so it is listed once.
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base) === i), defs, body)
/** A line on its own (fill none) is the drawing itself and keeps its width: svg() multiplies it by SCALE again. */
const keepLines = (body) => body.replace(/<path [^>]*fill="none"[^>]*>/g, (el) => el.replace(/stroke-width="([\d.]+)"/, (_, v) => `stroke-width="${f(v / SCALE)}"`))
const icon = (name, ...ps) => cellType(name, ps.flatMap((p) => p.parts ?? []), ps.map((p) => p.defs ?? '').join(''), keepLines(ps.map((p) => p.body).join('\n')))

/** Where plot() puts its data (its frame repeated: margins 11 on a card, 0.75 of that at the top and right, 3 inside). */
function plotFrame({ x = 0, y = 0, size, aspect = 0.85 }) {
  const W = 100, H = 100 * aspect, m = 11, u = size / 100
  const x0 = -W / 2 + m, x1 = W / 2 - m * 0.75, y0 = H / 2 - m, y1 = -H / 2 + m * 0.75
  return { X: (a) => x + (x0 + 3 + (x1 - x0 - 3) * a) * u, Y: (b) => y + (y0 - 3 - (y0 - y1 - 3) * b) * u, axisY: y + y0 * u, top: y - (H / 2) * u }
}
const S = 100, K = 4.55 // the plot fills 100 units across, 455 px of the page: margins about 26 at the sides
const g = page(K, [0, 0]), PF = plotFrame({ size: S })
const letters = (text, x, y, h, id) => (fits(g, h) ? lettering(g, { x, y, h, text, colour: INK, id }) : { body: '' })

// Volcano plot: grey genes in the middle, blue ones down and red ones up beyond the fold change and p value thresholds.
icon('Volcano plot', plot(g, { x: 0, y: 0, size: S, show: 'volcano', id: 'volcano' }))

// Manhattan plot: points along the chromosomes in two alternating colours, one locus rising above the genome-wide line.
// The top point of the locus above the line is the hit, in red (as SiliCoDraw marks it): drawn over that point.
icon('Manhattan plot', plot(g, { x: 0, y: 0, size: S, show: 'manhattan', id: 'manhattan', series: [{ kind: 'points', data: [[0.05 + 7 * 0.068 + 0.012, 0.08 + 5 * 0.15 + 0.1]], pal: SERIES[1], r: 2.6 }] }))

// UMAP clusters: three clusters of cells in an embedding, with the two axes drawn as arrows.
icon('UMAP clusters', plot(g, { x: 0, y: 0, size: S, show: 'clusters', id: 'umap' }))

// Growth curve: lag, log and stationary phases, the phases parted by dashed lines.
icon('Growth curve', plot(g, { x: 0, y: 0, size: S, show: 'growth', id: 'growth' }))

// qPCR curves: three amplification curves crossing the threshold one after another.
icon('qPCR curves', plot(g, { x: 0, y: 0, size: S, show: 'qpcr', id: 'qpcr' }))

// Enzyme kinetics: the Michaelis–Menten curve rising to Vmax (dashed), with Km where it reaches half of it.
{
  const h = 7
  const vmax = letters('V_m_a_x', PF.X(0.8), PF.Y(0.92) - 2 - h / 2, h, 'vmax')
  const km = letters('K_m', PF.X(0.17), PF.axisY + 3.4 + h / 2, h * 0.9, 'km')
  icon('Enzyme kinetics', plot(g, { x: 0, y: 0, size: S, show: 'saturation', id: 'kinetics' }), { body: `<g id="letters">${vmax.body}${km.body}</g>` })
}

// Action potential: depolarisation from the resting potential (dashed), the overshoot, repolarisation and the
// after-hyperpolarisation; the membrane potential in mV.
{
  const h = 7.5
  icon('Action potential', plot(g, { x: 0, y: 0, size: S, show: 'spike', id: 'action-potential' }), { body: `<g id="letters">${letters('mV', PF.X(0.1), PF.Y(0.82), h, 'mv').body}</g>` })
}

// Hypnogram: the stages of sleep through a night, wake at the top and deep sleep (N3) at the bottom, in cycles that
// get lighter towards morning; REM periods heavier and in red.
// (SiliCoDraw's steps put REM straight after falling asleep and deep sleep late in the night; the cycles here follow a
// usual night: wake, N2, N3, back up to REM, and less N3 in the later cycles.)
{
  const Wk = 0.9, REM = 0.66, N2 = 0.38, N3 = 0.1
  const night = [[0, Wk], [0.07, N2], [0.15, N3], [0.29, N2], [0.37, REM], [0.47, N2], [0.55, N3], [0.63, N2], [0.72, REM], [0.84, N2], [0.9, REM], [0.97, Wk], [1, Wk]]
  const rem = [[0.37, 0.47], [0.72, 0.84], [0.9, 0.97]].map(([a, b]) => ({ kind: 'trace', data: [[a, REM], [b, REM]], pal: SERIES[1], width: 16 }))
  icon('Hypnogram', plot(g, { x: 0, y: 0, size: S, id: 'hypnogram', series: [{ kind: 'step', data: night }, ...rem] }))
}

kit.check()
console.log('written', OUT)
