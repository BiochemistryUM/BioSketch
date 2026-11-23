// Eight icons of SiliCoDraw's "Techniques & assays" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts of the
// category (../parts/assays.mjs), the objects of ../parts/lab.mjs and the approved cells: Exclusion criteria, Twin study,
// Timed Up and Go test, and five techniques of neuroscience and embryology: Patch clamp, Recording electrode,
// Optogenetics, Deep brain stimulation and Microinjection. Compositions are read by hand from the source in its
// 100 × 100 box centred on 0,0 and scaled onto a 512 page (`page` of ../cellkit.mjs); outlines at 60 % (setStrokeScale),
// gloss on (the approved cells placed by placeCellType are glossy already).
// Parts used: person, badge, micropipette, plot (a bare trace) (assays.mjs); placeCellType ('Cell', 'Neuron', 'Zygote')
// (tissue.mjs); dna (molecules.mjs); brain (complexes.mjs); arrow (tissue.mjs).
// Drawn here because no part draws them: a sheet of paper with lines (`sheet`, as in tbH), a walking person seen from
// the side (`walker`), a chair, a traffic cone and a holding pipette (`holdingPipette`).
// Lettered: nothing.
// Usage: node tbI.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss } from '../cellkit.mjs'
import { deep, toLch } from '../colour.mjs'
import { f, setStrokeScale, strokeScale } from '../shapes.mjs'
import { GRID, PLOTS, SERIES, SKIN, badge, micropipette, person, plot } from '../parts/assays.mjs'
import { brain } from '../parts/complexes.mjs'
import { ACCENT, DARK, GLASS, INK, METAL, PAPER, objW } from '../parts/lab.mjs'
import { dna } from '../parts/molecules.mjs'
import { arrow, placeCellType } from '../parts/tissue.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012: paper, glass, metal, ink) are left out of the hue check, as the conventions of lab.mjs say;
// the same palette used by several parts is one colour, listed once.
const icon = (name, [k, cx, cy], draw) => {
  const g = page(k, [cx, cy]), { defs, body, parts } = draw(g)
  const seen = parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base) === i)
  kit.cellType(name, seen, defs, body)
}
const join = (...ps) => ({ defs: ps.map((p) => p.defs ?? '').join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts ?? []) })
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })

// ---------- small drawing helpers in g's units ----------
const P2 = (p) => p.map(f).join(',')
const rrect = (g, x0, y0, x1, y1, r) => {
  const [a, b] = g.P([x0, y0]), W = (x1 - x0) * g.k, H = (y1 - y0) * g.k, R = Math.min(r * g.k, W / 2, H / 2)
  return `M${f(a + R)},${f(b)} H${f(a + W - R)} A${f(R)},${f(R)} 0 0 1 ${f(a + W)},${f(b + R)} V${f(b + H - R)} A${f(R)},${f(R)} 0 0 1 ${f(a + W - R)},${f(b + H)} H${f(a + R)} A${f(R)},${f(R)} 0 0 1 ${f(a)},${f(b + H - R)} V${f(b + R)} A${f(R)},${f(R)} 0 0 1 ${f(a + R)},${f(b)} Z`
}
const strokeD = (d, colour, w, cap = 'round', extra = '') => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"${extra}/>`
const fillD = (d, fill, s = '', w = 0) => `<path d="${d}" fill="${fill}"${s ? ` stroke="${s}" stroke-width="${f(w)}" stroke-linejoin="round"` : ''}/>`
const polyline = (g, pts, close = false) => `M${pts.map((p) => P2(g.P(p))).join(' L')}${close ? 'Z' : ''}`
const objFill = (g, id, box, pal, defs) => (Math.max(box[2] - box[0], box[3] - box[1]) * g.k >= 80 ? (defs.push(g.grad(id, box, pal)), `url(#${id})`) : pal.base)
/** A path in source units (absolute M, L, C, Q, written with commas), each point moved by T and then onto the page. */
const mapD = (g, d, T = (p) => p) => d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, a, b) => P2(g.P(T([+a, +b]))))
/**
 * A limb or a rod whose width is the drawing itself: an outline stroke under a fill stroke. `width` and `w` are in page
 * pixels as they should come out; both strokes are divided by strokeScale() so that only the outline is thinned to 60 %.
 */
const tubeD = (d, fill, outline, width, w) => strokeD(d, outline, (width + 2 * w * strokeScale()) / strokeScale()) + strokeD(d, fill, width / strokeScale())

/** A sheet of paper (a form) with lines of writing, from x0, y0 to x1, y1 (as in tbH). */
const sheet = (g, { x0, y0, x1, y1, id = 'sheet', rows = 5 }) => {
  const defs = [], w = objW((y1 - y0) * g.k), box = [x0, y0, x1, y1]
  let s = fillD(rrect(g, ...box, 4), objFill(g, `${id}-gradient`, box, PAPER, defs), PAPER.outline, w)
  const lx0 = x0 + (x1 - x0) * 0.2, lx1 = x1 - (x1 - x0) * 0.2, top = y0 + (y1 - y0) * 0.2, step = (y1 - y0) * 0.13
  const segs = Array.from({ length: rows }, (_, i) => polyline(g, [[lx0, top + i * step], [i === rows - 1 ? lx0 + (lx1 - lx0) * 0.6 : lx1, top + i * step]])).join(' ')
  s += strokeD(segs, GRID, Math.max(2, w * 0.6))
  return { defs: defs.join(''), body: `<g id="${id}">${s}</g>`, parts: [['sheet', PAPER]] }
}

// ---------- drawn here ----------
/**
 * A person walking to the right, seen from the side, as SiliCoDraw draws it (its coordinates mirrored and scaled by 0.82
 * about 6, 10): clothes in `pal` (the far arm and leg in its shadow tone), a peach head with no face, dark shoes.
 */
const walker = (g, { id = 'walker', pal = ACCENT, skin = SKIN }) => {
  const T = ([x, y]) => [6 - 0.82 * x, 10 + 0.82 * y], u = 0.82 * g.k, w = objW(70 * g.k) * 0.8
  const limb = (d, fill, width) => tubeD(mapD(g, d, T), fill, pal.outline, width * u, w)
  const shoe = (d) => fillD(mapD(g, d, T), DARK.base, DARK.outline, w * 0.7)
  let s = `<g id="${id}-far">${limb('M2,4C6,14 10,22 16,34', pal.shadow, 10)}${shoe('M14,30L22,34Q24,37 21,39L12,37Z')}${limb('M1,-20C-4,-12 -8,-6 -12,-2', pal.shadow, 8.5)}</g>`
  s += `<g id="${id}-body">${limb('M1,-24C2,-14 2,-6 2,4', pal.base, 17)}${limb('M2,4C-2,14 -6,24 -12,34', pal.base, 10)}${shoe('M-17,32L-8,32Q-4,33 -4,37L-4,39L-17,39Q-19,39 -19,36Z')}`
  s += `${limb('M2,-20C7,-12 11,-8 16,-6', pal.base, 8.5)}</g>`
  const [hx, hy] = T([0, -36])
  s += `<g id="${id}-head">${g.circle(hx, hy, 9 * 0.82, skin.base, skin.outline, w)}</g>`
  return { defs: '', body: `<g id="${id}">${s}</g>`, parts: [['clothes', pal], ['skin', skin], ['shoes', DARK]] }
}
/** A chair seen from the side, facing right: a metal frame (back post, seat, two legs) with a seat board. */
const chair = (g, { id = 'chair' }) => {
  const w = objW(60 * g.k) * 0.8, rod = 3.2 * g.k
  let s = tubeD(polyline(g, [[-46, -12], [-46, 42]]) + polyline(g, [[-28, 10], [-28, 42]]) + polyline(g, [[-40, 12], [-40, 42]]), METAL.base, METAL.outline, rod, w)
  s += fillD(rrect(g, -49, 6, -23, 13, 2), METAL.shadow, METAL.outline, w)
  return { defs: '', body: `<g id="${id}">${s}</g>`, parts: [['chair', METAL]] }
}
// The cone: SiliCoDraw's orange moved to a red-orange (hue 15, deep) to stay 36° from the skin (52).
const CONE = deep(15)
/** A traffic cone standing on its base, with a white reflective band. */
const cone = (g, { id = 'cone' }) => {
  const w = objW(30 * g.k) * 0.8, defs = []
  let s = fillD(polyline(g, [[33.5, 41], [39, 13], [41, 13], [46.5, 41]], true), objFill(g, `${id}-gradient`, [33, 13, 47, 41], CONE, defs), CONE.outline, w)
  s += fillD(polyline(g, [[35.8, 29], [44.2, 29], [45.1, 34], [34.9, 34]], true), PAPER.light)
  s += fillD(rrect(g, 30, 40, 50, 44.5, 1.5), CONE.outline, CONE.outline, w * 0.5)
  return { defs: defs.join(''), body: `<g id="${id}">${s}</g>`, parts: [['cone', CONE]] }
}
/**
 * A holding pipette from the left, its blunt polished end at x1, y: a glass tube `width` across narrowing to a short
 * fire-polished tip with a small opening, as in an injection rig.
 */
const holdingPipette = (g, { x0, x1, y, width = 16, id = 'holding-pipette' }) => {
  const h = width / 2, n = width * 0.32, w = objW((x1 - x0) * g.k) * 0.85, defs = []
  const pts = [[x0, y - h], [x1 - 9, y - h], [x1 - 4, y - n], [x1, y - n * 0.9], [x1, y + n * 0.9], [x1 - 4, y + n], [x1 - 9, y + h], [x0, y + h]]
  let s = fillD(polyline(g, pts, true), objFill(g, `${id}-gradient`, [x0, y - h, x1, y + h], GLASS, defs), GLASS.outline, w)
  s += strokeD(polyline(g, [[x0, y], [x1 - 6, y]]), GLASS.outline, Math.max(1.5, w * 0.5)) // the bore
  s += strokeD(polyline(g, [[x0 + 2, y - h * 0.55], [x1 - 12, y - h * 0.55]]), GLASS.light, Math.max(2, h * g.k * 0.25))
  return { defs: defs.join(''), body: `<g id="${id}">${s}</g>`, parts: [['glass', GLASS]] }
}

// ---------- the icons ----------
// Exclusion criteria: a form of criteria with a red cross: not eligible, excluded.
icon('Exclusion criteria', [5.161, 4.9, -0.1], (g) => join(
  sheet(g, { x0: -32, y0: -44, x1: 30, y1: 40 }),
  badge(g, { x: 26, y: 28, size: 34, mark: 'cross', id: 'excluded' }),
))

// Twin study: two identical twins side by side (the one behind in the same clothes), the DNA they share between their
// heads. The twins are green (SiliCoDraw's blue is the DNA's hue in the set) and the DNA keeps the set's blue.
icon('Twin study', [4.863, 0.0, 0.73], (g) => join(
  person(g, { x: -21, y: 9, size: 76, pal: SERIES[2], id: 'twin1' }),
  person(g, { x: 21, y: 9, size: 76, pal: SERIES[2], id: 'twin2' }),
  dna(g, { x: 0, y: -24, size: 44, width: 13, turn: 90, id: 'shared-DNA' }),
))

// Timed Up and Go test: a person stands up from a chair, walks to a cone 3 m away and back (the dashed path), timed.
icon('Timed Up and Go test', [4.559, 0.07, 1.4], (g) => {
  const path = own('path', strokeD(polyline(g, [[-28, -42], [32, -42]]) + ` M${P2(g.P([32, -42]))} A${f(6 * g.k)},${f(6 * g.k)} 0 0 1 ${P2(g.P([32, -30]))} L${P2(g.P([-18, -30]))}`, GRID, 3.6, 'round', ` stroke-dasharray="${f(9)} ${f(7)}"`) +
    fillD(polyline(g, [[-25, -30], [-16, -35], [-16, -25]], true), GRID, GRID, 2), [['path', { base: GRID }]])
  const floor = own('floor', strokeD(polyline(g, [[-50, 44.5], [50, 44.5]]), INK, objW(100 * g.k) * 0.7))
  return join(path, chair(g, {}), cone(g, {}), walker(g, {}), floor)
})

// A recording as a bare trace (the `trace` plot without card or axes) in green, as the trace on a lab screen (GLOW):
// the set's blue would lie within 36° of the generic cell and of the neuron's myelin.
const recording = (g, { x, y, size, id }) => plot(g, { x, y, size, id, card: false, axes: 'none', aspect: 0.4, series: [{ ...PLOTS.trace.series[0], pal: SERIES[2] }] })

// Patch clamp: a glass patch pipette sealed on a cell, and the current it records. The pipette has no holder: its accent
// band would lie within 36° of the cell's blue.
icon('Patch clamp', [4.943, 1.58, 0.28], (g) => join(
  recording(g, { x: -22, y: -34, size: 50, id: 'current' }),
  placeCellType(g, 'Cell', { x: -12, y: 16, size: 60, id: 'cell' }),
  micropipette(g, { x: 28, y: -19, size: 56, turn: 40, kind: 'patch', holder: false, id: 'patch-pipette' }),
))

// Recording electrode: a sharp electrode at the soma of a neuron, and the spikes it records. The electrode has no
// holder: the holder's accent band would lie within 36° of the myelin.
icon('Recording electrode', [4.912, 0.49, 8.9], (g) => join(
  placeCellType(g, 'Neuron', { x: 4, y: 16, size: 86, id: 'neuron' }),
  micropipette(g, { x: -27.5, y: -17, size: 52, turn: -42, kind: 'sharp', holder: false, id: 'electrode' }),
  recording(g, { x: 26, y: -30, size: 42, id: 'spikes' }),
))

// Optogenetics: an optic fibre shines blue light on a neuron that carries a light-gated channel. A pyramidal neuron
// (no myelin, whose blue would lie within 36° of the light) stands in for SiliCoDraw's round cell.
icon('Optogenetics', [4.249, 0.0, 2.64], (g) => join(
  placeCellType(g, 'Pyramidal neuron', { x: 0, y: 14, size: 84, id: 'neuron' }),
  micropipette(g, { x: 0, y: -24, size: 54, kind: 'fibre', id: 'fibre' }),
))

// Deep brain stimulation: an electrode lead implanted from the top of the head into a deep nucleus of the brain.
icon('Deep brain stimulation', [4.452, 0.0, -0.89], (g) => join(
  brain(g, { x: 0, y: 6, size: 90, id: 'brain' }),
  micropipette(g, { x: 6, y: -24, size: 56, kind: 'probe', id: 'lead' }),
))

// Microinjection: a zygote held by a holding pipette (left) is injected with a fine needle (right) that goes through
// the zona pellucida into the cell. The needle has no holder (its band would lie near the zona's blue).
icon('Microinjection', [4.63, -2.59, -4.48], (g) => join(
  holdingPipette(g, { x0: -52, x1: -26.5, y: 0, width: 20 }),
  placeCellType(g, 'Zygote', { x: 0, y: 0, size: 56, id: 'zygote' }),
  micropipette(g, { x: 24, y: -21, size: 58, turn: 47, kind: 'injection', holder: false, id: 'needle' }),
))

check()
console.log('written')
