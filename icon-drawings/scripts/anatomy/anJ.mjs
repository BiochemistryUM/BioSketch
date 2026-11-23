// Eight icons of SiliCoDraw's "Anatomy" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts of the category
// in ../parts/anatomy.mjs: the eye, the layers of the retina, cataract, macular degeneration, glaucoma, presbyopia, the
// nose and the tongue.
// Drawn here, as no part draws them: the nose and the tongue (closed bodies glossed as organs are: the nose in the skin
// of a person, the tongue in the pink of the gut's mucosa, 8°) and the rays of presbyopia. Nothing is lettered.
// The current look: outlines at 60 % (setStrokeScale), the gloss of cells on (setGloss).
// Usage: node anJ.mjs <folder>
import { cellTypes, glossOn, page, setGloss } from '../cellkit.mjs'
import { deep, rich, toHex, toLch } from '../colour.mjs'
import { f, setStrokeScale, strokeScale } from '../shapes.mjs'
import { gloss, glossTones, pathPoints } from '../parts/surfaces.mjs'
import { SKIN, eye, organPal, organW } from '../parts/anatomy.mjs'
import { cytokines } from '../parts/immune.mjs'
import { EPI, SIGNAL, arrow, cell, epithelium, placeCellType } from '../parts/tissue.mjs'
import { DARK, beam } from '../parts/lab.mjs'
import { mkdirSync } from 'node:fs'

const OUT = process.argv[2]
setStrokeScale(0.6)
setGloss(true)
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT)
// Greys (chroma below 0.012) are left out of the hue check; a palette used twice is one part and is listed once.
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base) === i), defs, body)
const icon = (name, ps, parts) => cellType(name, parts ?? ps.flatMap((p) => p.parts ?? []), ps.map((p) => p.defs ?? '').join(''), ps.map((p) => p.body).join('\n'))

let g = page(4.6, [0, 0]) // SiliCoDraw's 100-unit box on 460 px of the page

// ---------- a closed body of our own, in the gloss of organs (as anatomy.mjs's glossBody) ----------
const lin = (id, [x0, y0, x1, y1], a, b) => `<linearGradient id="${id}" x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`
const boxOf = (ds) => { const p = ds.flatMap((d) => pathPoints(d).flat()), xs = p.map((q) => q[0]), ys = p.map((q) => q[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] }
/** Page outlines `ds` filled as one body with the gloss, `inner` drawn over the tones, one outline round them all. */
function glossBody(id, ds, pal, w, { inner = '' } = {}) {
  const box = boxOf(ds), size = Math.max(box[2] - box[0], box[3] - box[1]), T = glossTones(pal)
  const defs = lin(`${id}-gradient`, box, pal.base, glossOn() ? T.end : pal.shadow)
  let s = ds.length > 1 ? ds.map((d) => `<path d="${d}" fill="${pal.outline}" stroke="${pal.outline}" stroke-width="${f(2 * w)}" stroke-linejoin="round"/>`).join('') : ''
  s += ds.map((d) => `<path d="${d}" fill="url(#${id}-gradient)"/>`).join('')
  if (glossOn() && size >= 40) {
    const G = gloss({ fills: ds.map(pathPoints) }, { inset: (w * strokeScale()) / 2 })
    s += ['shade', 'shadow', ...(size >= 90 ? ['lit', 'highlight'] : [])].map((k) => (G[k] ? `<path d="${G[k]}" fill="${T[k]}"/>` : '')).join('')
  }
  s += inner
  if (ds.length === 1) s += `<path d="${ds[0]}" fill="none" stroke="${pal.outline}" stroke-width="${f(w)}" stroke-linejoin="round"/>`
  return { defs, body: `<g id="${id}">${s}</g>` }
}
const line = (d, colour, w) => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"/>`
const fill = (d, colour) => `<path d="${d}" fill="${colour}"/>`
const dotsD = (pts, r) => pts.map(([x, y, rr]) => { const [X, Y] = g.P([x, y]), R = (rr ?? r) * g.k; return `M${f(X - R)},${f(Y)} A${f(R)},${f(R)} 0 1 0 ${f(X + R)},${f(Y)} A${f(R)},${f(R)} 0 1 0 ${f(X - R)},${f(Y)} Z` }).join(' ')
/** A straight beam from point a to point b (lab.mjs's beam). */
const ray = (a, b, opts) => beam(g, { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, size: Math.hypot(b[0] - a[0], b[1] - a[1]), turn: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI, ...opts })

// ---------- Eye ----------
icon('Eye', [eye(g, { x: 0, y: 0, size: 106, view: 'front', id: 'eye' })])

// ---------- Retina ----------
// The layers of the retina, light coming from the top: the ganglion cells (their axons running off as the nerve fibre
// layer), the photoreceptors with their outer segments pointing away from the light into the pigment epithelium at the
// back. The pigment epithelium is dark with melanin (the dark hair's pigment grey, outside the hue check).
// The photoreceptor is the approved cell type, placed upside down without its own light arrows.
{
  g = page(4.6, [0, -2]) // a little below its own middle, to centre it
  // Melanin: a mid brown-grey, lighter than the dark hair's so that the nuclei still show (outside the hue check).
  const PIGMENT = { light: toHex({ l: 0.78, c: 0.011, h: 55 }), base: toHex({ l: 0.62, c: 0.011, h: 55 }), shadow: toHex({ l: 0.56, c: 0.011, h: 55 }), small: toHex({ l: 0.46, c: 0.011, h: 55 }), outline: toHex({ l: 0.36, c: 0.011, h: 55 }) }
  const S = 54, n = 6, dx = 15.2, x0 = -((n - 1) * dx) / 2
  // Where the placed icon puts the cell's axis and middle: its box includes the light arrows at the right.
  const axis = 0.1469 * S, mid = -0.0379 * S
  const cells = Array.from({ length: n }, (_, i) => {
    const p = placeCellType(g, 'Photoreceptor', { x: x0 + i * dx - axis, y: 12 - mid, size: S, turn: 180, id: `photoreceptor${i + 1}` })
    return { ...p, body: p.body.replace(new RegExp(`<g id="photoreceptor${i + 1}-light"[\\s\\S]*?</g>`), ''), parts: p.parts.filter(([k]) => k !== 'light') }
  })
  const top = 12 - (0.924 * S) / 2 // the synaptic terminals
  const rpe = epithelium(g, { x: 0, y: 41.5, size: 96, cells: 7, tall: 0.55, pal: PIGMENT, id: 'pigment-epithelium' })
  const gx = [-29, 1, 31]
  const nw = organW(80) * 0.5
  const links = gx.map((x, i) => [x0 + 2 * i * dx, x0 + (2 * i + 1) * dx].map((t) => `M${f(g.X(x))},${f(g.Y(-23))} L${f(g.X(t))},${f(g.Y(top + 1.5))}`).join(' ')).join(' ')
  const axons = gx.map((x) => `M${f(g.X(x))},${f(g.Y(-34))} C${f(g.X(x))},${f(g.Y(-38))} ${f(g.X(x + 3))},${f(g.Y(-40))} ${f(g.X(x + 8))},${f(g.Y(-40))} L${f(g.X(48))},${f(g.Y(-40))}`).join(' ')
  const wiring = { body: `<g id="neurites">${line(links + ' ' + axons, EPI.outline, nw)}</g>` }
  const gang = gx.map((x, i) => cell(g, { x, y: -29, size: 14, pal: EPI, id: `ganglion-cell${i + 1}` }))
  const light = [-44, -34].map((x, i) => arrow(g, { points: [[x, -49], [x, -36]], colour: rich(95).small, id: `light${i + 1}` }))
  icon('Retina', [rpe, ...cells, wiring, ...gang, ...light], [...cells[0].parts, ['light', rich(95)]])
  g = page(4.6, [0, 0])
}

// ---------- Cataract ----------
icon('Cataract', [eye(g, { x: 0, y: 0, size: 106, view: 'front', state: 'cataract', id: 'eye' })])

// ---------- Macular degeneration ----------
// The fundus as an ophthalmoscope shows it: drusen, yellow deposits, gathered round the macula.
icon('Macular degeneration', [eye(g, { x: 0, y: 0, size: 103, view: 'fundus', state: 'amd', id: 'fundus' })])

// ---------- Glaucoma ----------
// The eye in section with the optic disc cupped, and the raised pressure inside the globe pushing outward (red arrows).
{
  g = page(4.6, [-0.2, 0])
  const e = eye(g, { x: 0, y: 0, size: 108, view: 'section', state: 'glaucoma', id: 'eye' })
  const PRESS = deep(350)
  const c = [4, 0]
  const arrows = [-90, 0, 90].map((d, i) => { const t = (d * Math.PI) / 180; return arrow(g, { points: [[c[0] + Math.cos(t) * 6, c[1] + Math.sin(t) * 6], [c[0] + Math.cos(t) * 23, c[1] + Math.sin(t) * 23]], colour: PRESS.small, w: 12, id: `pressure${i + 1}` }) })
  icon('Glaucoma', [e, ...arrows], [...e.parts, ['pressure', PRESS]])
  g = page(4.6, [0, 0])
}

// ---------- Presbyopia ----------
// The eye in section with a thin, stiff lens: light from a near point is not bent enough and would come to a focus behind
// the retina (dashed). Rays and the near point in dark grey, as in a diagram of optics.
{
  const e = eye(g, { x: 5, y: 0, size: 94, view: 'section', state: 'presbyopia', id: 'eye' })
  const near = [-47, 0], lens = [-17, 0], focus = [48, 0], wd = 4.5
  const rays = [-1, 1].flatMap((s, i) => [ray(near, [lens[0], s * 9], { colour: DARK, width: wd, id: `ray${i + 1}-in` }), ray([lens[0], s * 9], [33, s * 2.1], { colour: DARK, width: wd, id: `ray${i + 1}-eye` }), ray([33, s * 2.1], focus, { colour: DARK, width: wd, kind: 'dashed', id: `ray${i + 1}-behind` })])
  const point = { body: `<g id="near-point">${fill(dotsD([[near[0], near[1], 2.6]]), DARK.small)}</g>` }
  icon('Presbyopia', [e, ...rays, point])
}

// ---------- Nose ----------
// The nose from the side, a closed body in the skin of a person, with its nostril and the crease of its wing; smells
// (odour molecules, the set's blue signals) drifting towards it.
{
  g = page(5, [-14, -0.5]) // the nose fills the height of the page, a little right of its own middle
  const N = g.D('M6,-46C4,-30 -4,-14 -16,2C-23,11 -30,16 -30,25C-30,33 -23,37 -15,35C-11,34 -8,34 -4,36C4,40 16,38 21,30C25,23 22,15 16,12C14,-4 13,-28 16,-46Z')
  const w = organW(460)
  const inner = fill(g.D('M-6,34C-10,26 -4,16 6,16C15,16 20,22 19,29C17,36 6,39 -2,37Z'), SKIN.shadow) + line(g.D('M-6,34C-10,26 -4,16 6,16C13,16 17,19 19,24'), SKIN.small, w * 0.5) + fill(g.D('M-16,34C-15,31 -11,30 -7,32C-7,35 -12,36 -16,34Z'), SKIN.outline)
  const nose = glossBody('nose', [N], SKIN, w, { inner })
  const waves = [[-43, 16], [-41, 28], [-43, 40]].map(([x, y], i) => beam(g, { x, y, size: 15, kind: 'wave', colour: SIGNAL, width: 9, id: `odour${i + 1}` }))
  const odour = cytokines(g, { x: -42, y: 28, size: 32, count: 4, dot: 22, pal: SIGNAL, pal2: null, seed: 4, id: 'odour-molecules' })
  icon('Nose', [nose, ...waves, odour], [['skin', SKIN], ['odour', SIGNAL]])
  g = page(4.6, [0, 0])
}

// ---------- Tongue ----------
// The tongue from above: the V of circumvallate papillae at the back, the median groove, fungiform papillae (taste buds)
// as deeper dots over the body, the ridges of the foliate papillae at the sides.
{
  g = page(5, [0, 0])
  const TG = organPal(8, 1.45)
  const T = g.smooth([[-30, -44], [-38, -36], [-42, -20], [-42, -2], [-38, 16], [-29, 32], [-15, 43], [0, 46], [15, 43], [29, 32], [38, 16], [42, -2], [42, -20], [38, -36], [30, -44], [0, -46]])
  const w = organW(460)
  let inner = fill(dotsD([[-18, -38], [-8, -40], [4, -40], [15, -38], [24, -36], [-26, -34], [-12, -33], [10, -33]], 3), TG.shadow)
  inner += line(g.D('M0,-14C-1,4 1,20 0,34'), TG.small, w * 0.6)
  inner += line(g.D('M-40,-22L-35,-21M-41,-16L-36,-15M-41,-10L-36,-9M40,-22L35,-21M41,-16L36,-15M41,-10L36,-9'), TG.small, w * 0.45)
  inner += [[-26, -14], [-17, -18], [-8, -21], [8, -21], [17, -18], [26, -14], [0, -24]].map(([x, y]) => `<path d="${dotsD([[x, y + 3, 3]])}" fill="${TG.light}" stroke="${TG.small}" stroke-width="${f(w * 0.4)}"/>`).join('')
  inner += fill(dotsD([[-26, -2], [-14, -6], [12, -6], [26, -2], [-32, 10], [-18, 8], [-8, 4], [8, 4], [18, 8], [32, 10], [-24, 22], [-12, 18], [12, 18], [24, 22], [-14, 32], [-6, 26], [6, 26], [14, 32], [-4, 38], [4, 38]], 2), TG.small)
  icon('Tongue', [glossBody('tongue', [T], TG, w, { inner })], [['tongue', TG]])
  g = page(4.6, [0, 0])
}

kit.check()
console.log('written', OUT)
