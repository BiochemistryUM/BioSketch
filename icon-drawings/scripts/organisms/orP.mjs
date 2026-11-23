// Six icons of SiliCoDraw's "Organisms" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), the later drawings that replace the first where there are any, redrawn in the soft look
// of icon-drawings/STYLE.md from the shared parts: Photosynthesis, Kelp, Seagrass, Mangrove, Symbiosis and Dysbiosis.
// Kelp, Seagrass and Mangrove are one kind of the `plant` part of ../parts/organisms.mjs (drawn from these very SiliCoDraw
// icons), set alone on the page; the other three are composed as SiliCoDraw composes them. Outlines at 60 %
// (setStrokeScale), gloss on: the host cell and the bacteria of Symbiosis and Dysbiosis are glossed by their parts; plants
// and the balance are flat.
// Parts used: plant (leaf, kelp, seagrass, mangrove), scene (sun) of organisms.mjs; glossyCell (surfaces.mjs, a host cell
// with its flat lilac nucleus); microbe (immune.mjs: rods and cocci); arrow (tissue.mjs); lettering (letters.mjs).
// Drawn here because no part draws it: the balance of Dysbiosis (post, beam, pivot, strings and pans, flat in lab.mjs's
// METAL grey), and the two small dots of what host and bacterium exchange in Symbiosis.
// Lettered: CO₂ and O₂ on Photosynthesis, as SiliCoDraw writes them. Nothing else.
// Usage: node orP.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss } from '../cellkit.mjs'
import { deep, hueOf, soft, toLch } from '../colour.mjs'
import { f, setStrokeScale } from '../shapes.mjs'
import { LEAF, SUN, plant, scene } from '../parts/organisms.mjs'
import { glossyCell } from '../parts/surfaces.mjs'
import { microbe } from '../parts/immune.mjs'
import { BACTERIUM, INK, arrow } from '../parts/tissue.mjs'
import { METAL, objW } from '../parts/lab.mjs'
import { lettering } from '../parts/letters.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012: the balance's metal) are left out of the hue check; a palette used several times is listed
// once.
const icon = (name, [k, cx, cy], draw) => {
  const g = page(k, [cx, cy]), { defs, body, parts } = draw(g)
  const seen = parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base) === i)
  kit.cellType(name, seen, defs, body)
}
const join = (...ps) => ({ defs: ps.map((p) => p.defs ?? '').join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts ?? []) })
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })
// Every icon is fitted by what it really covers (measured on the rendered page): `fit` is [scale, x, y], the scale that
// brings the longer side to 460 px (margins 26 px) and the page point that was the middle of the drawing at 4.6, which is
// moved to the middle of the page.
const at = ([s, mx, my] = [1, 256, 256]) => [4.6 * s, (mx - 256) / 4.6, (my - 256) / 4.6]
const one = (name, kind, opts = {}, fit) => icon(name, at(fit), (g) => plant(g, { x: 0, y: 0, size: 100, kind, id: kind.replace(/ /g, '-'), ...opts }))

// ---------- small drawing helpers in g's units ----------
const P2 = (p) => p.map(f).join(',')
const fillD = (d, fill, s = '', w = 0) => `<path d="${d}" fill="${fill}"${s ? ` stroke="${s}" stroke-width="${f(w)}" stroke-linejoin="round"` : ''}/>`
const strokeD = (d, colour, w, cap = 'round') => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
const lineD = (g, pts) => `M${pts.map((p) => P2(g.P(p))).join(' L')}`
const ellD = (g, u, v, rx, ry) => { const K = 0.5523, q = [[rx, 0], [rx, K * ry], [K * rx, ry], [0, ry], [-K * rx, ry], [-rx, K * ry], [-rx, 0], [-rx, -K * ry], [-K * rx, -ry], [0, -ry], [K * rx, -ry], [rx, -K * ry], [rx, 0]].map(([a, b]) => P2(g.P([u + a, v + b]))); return `M${q[0]} C${q[1]} ${q[2]} ${q[3]} C${q[4]} ${q[5]} ${q[6]} C${q[7]} ${q[8]} ${q[9]} C${q[10]} ${q[11]} ${q[12]} Z` }
const mapD = (g, d) => d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, u, v) => P2(g.P([+u, +v])))
/** Points of a wave along the straight line a → b: `half` half-waves of amplitude `amp` (g's units) over the first 70 %,
 *  then straight, so that the head sits on a straight stretch and points along the line. */
const wavePts = ([x1, y1], [x2, y2], amp, half, n = 28) => { const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy); return Array.from({ length: n + 1 }, (_, i) => { const t = i / n, s = t < 0.7 ? amp * Math.sin((t / 0.7) * Math.PI * half) : 0; return [x1 + dx * t - (dy / l) * s, y1 + dy * t + (dx / l) * s] }) }

// ---------- Photosynthesis ----------
// The sun (scene's sun) sends two wavy rays of light onto a leaf (plant's leaf, turned so that it points up to the right
// at 35°, as SiliCoDraw draws it); CO₂ goes into the leaf from below, O₂ leaves it at the top right, each with its
// arrow and its lettering in the ink of the set's arrows. The light is in the sun's small (deepest) tone and recolours with it.
icon('Photosynthesis', at([1.041, 246, 254]), (g) => {
  const sun = scene(g, { x: -31, y: -31, size: 34, kind: 'sun', id: 'sun' })
  const leaf = plant(g, { x: 9, y: 9, size: 66, turn: 10, kind: 'leaf', id: 'leaf' })
  const light = [[[-21, -13], [-6, 0]], [[-12, -23], [3, -10]]].map(([a, b], i) => arrow(g, { points: wavePts(a, b, 1.8, 4), colour: SUN.small, w: 1.6 * g.k, head: 4.8 * g.k, id: `light-${i + 1}` }))
  const gasIn = arrow(g, { points: [[-12, 41], [-4, 39.5], [2, 31.5]], colour: INK, id: 'carbon-dioxide-arrow' })
  const gasOut = arrow(g, { points: [[25, -13], [28, -21], [33, -27]], colour: INK, id: 'oxygen-arrow' })
  const h = 7.5
  const co2 = lettering(g, { x: -25, y: 42, h, text: 'CO_2', colour: INK, id: 'carbon-dioxide' })
  const o2 = lettering(g, { x: 39, y: -35, h, text: 'O_2', colour: INK, id: 'oxygen' })
  const letters = own('gases', co2.body + o2.body)
  return join(leaf, sun, ...light.map((a) => ({ ...a, parts: [['sun', SUN]] })), gasIn, gasOut, letters)
})

// ---------- Kelp ----------
// Two stipes rising from a holdfast, each with long blades on gas-filled floats.
one('Kelp', 'kelp', {}, [0.97, 256, 254])

// ---------- Seagrass ----------
// Strap-like blades in two rows rising from rhizomes in the sandy sediment.
one('Seagrass', 'seagrass', {}, [0.987, 256, 252])

// ---------- Mangrove ----------
// A rounded canopy on a short trunk over arching stilt roots that stand in water and mud, with two hanging propagules.
one('Mangrove', 'mangrove', {}, [0.987, 256, 250])

// ---------- Symbiosis ----------
// A host cell (green, with its lilac nucleus) and a bacterium (orange rod) living together, each passing something to
// the other: a curved arrow over the top carries a dot of the host's colour to the bacterium, one under the bottom a dot
// of the bacterium's colour back to the host. SiliCoDraw's two organelle rings in the host are left out (the cell reads
// as a cell by its nucleus); the dots are drawn here as small flat balls in each partner's tones.
const HOST = soft(hueOf('#9bc47c')), SYMBIONT = soft(hueOf('#e3955a'))
icon('Symbiosis', at([1.111, 257, 256]), (g) => {
  const host = glossyCell(g, { x: -21, y: 0, size: 48, id: 'host', pal: HOST, points: [[0.04, -1], [0.55, -0.86], [0.94, -0.42], [1, 0.08], [0.86, 0.6], [0.4, 0.96], [-0.15, 1], [-0.62, 0.82], [-0.95, 0.38], [-0.98, -0.18], [-0.72, -0.68], [-0.36, -0.94]], nuclei: [[-0.05, 0.06, 0.34]] })
  const bact = microbe(g, { x: 26, y: 2, size: 42, turn: -28, pal: SYMBIONT, flagellum: false, id: 'bacterium' })
  const over = arrow(g, { points: [[-14, -27], [-6, -37], [6, -38.5], [16, -32], [22, -21]], colour: INK, id: 'to-bacterium' })
  const under = arrow(g, { points: [[28, 23], [22, 35], [10, 39], [-1, 37], [-8, 29]], colour: INK, id: 'to-host' })
  const dot = (x, y, pal, id) => own(id, fillD(ellD(g, x, y, 3.6, 3.6), pal.base, pal.outline, objW(7.2 * g.k)), [[id, pal]])
  return join(host, bact, over, under, dot(4, -38.6, HOST, 'from-host'), dot(11, 38.6, SYMBIONT, 'from-bacterium'))
})

// ---------- Dysbiosis ----------
// A balance tipped to the left: three red pathobionts (cocci) in the lower pan outweigh two green commensal rods in the
// upper one (immune.mjs's microbe, glossed). The balance itself is an object, drawn here flat in lab.mjs's METAL grey:
// a foot, a post, the beam turned 14° about its pivot with a pointer on top, two strings to each pan and the pans. The
// pathobionts are cocci in a deep red (SiliCoDraw draws them as spiky red balls; spikes would read as a virus).
const PATHOBIONT = { ...deep(15), base: deep(15).shadow, shadow: deep(15).small }
icon('Dysbiosis', at([1.07, 256, 266]), (g) => {
  const M = METAL, w = objW(92 * g.k), lw = w * 0.45, th = (14 * Math.PI) / 180, piv = [0, -30], H = 31
  const L = [piv[0] - H * Math.cos(th), piv[1] + H * Math.sin(th)], R = [piv[0] + H * Math.cos(th), piv[1] - H * Math.sin(th)], yl = L[1] + 30, yr = R[1] + 30
  const pan = (x, y) => mapD(g, `M${x - 16},${y} L${x + 16},${y} C${x + 14},${y + 10} ${x - 14},${y + 10} ${x - 16},${y} Z`)
  let s = fillD(mapD(g, 'M-15,46 L15,46 L10,39 L-10,39 Z'), M.shadow, M.outline, w)
  s += fillD(mapD(g, 'M-3,-30 L3,-30 L3,40 L-3,40 Z'), M.base, M.outline, w * 0.8)
  s += strokeD(lineD(g, [L, [L[0] - 14, yl]]) + ' ' + lineD(g, [L, [L[0] + 14, yl]]) + ' ' + lineD(g, [R, [R[0] - 14, yr]]) + ' ' + lineD(g, [R, [R[0] + 14, yr]]), M.outline, lw)
  const beam = lineD(g, [L, R])
  s += strokeD(beam, M.outline, 4 * g.k + 2 * w * 0.8) + strokeD(beam, M.base, 4 * g.k)
  s += fillD(mapD(g, 'M-4,-35 L0,-42 L4,-35 Z'), M.shadow, M.outline, lw * 1.4) + fillD(ellD(g, 0, -30, 4.2, 4.2), M.shadow, M.outline, w * 0.8)
  const scale = own('balance', s + `<g id="balance-pans">${fillD(pan(L[0], yl), M.base, M.outline, w * 0.9)}${fillD(pan(R[0], yr), M.base, M.outline, w * 0.9)}</g>`)
  // the microbes stand in the pans, drawn after them so that they sit on the rims
  const bad = [[L[0] - 7, yl - 6.5], [L[0] + 7, yl - 6.5], [L[0], yl - 18]].map(([x, y], i) => microbe(g, { x, y, size: 13.5, shape: 'coccus', pal: PATHOBIONT, id: `pathobiont-${i + 1}` }))
  const good = [[R[0] - 4, yr - 5, 0], [R[0] + 5, yr - 12.5, -12]].map(([x, y, t], i) => microbe(g, { x, y, size: 21, turn: t, pal: BACTERIUM, flagellum: false, id: `commensal-${i + 1}` }))
  return join(scale, ...bad, ...good)
})

check()
console.log('written')
