// Eight icons of SiliCoDraw's "Immunology & infection" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David
// Carlsson; see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts:
// T cell clonal expansion, Naive T cell decline, Inverted CD4:CD8 ratio, Age-associated B cell, Germinal centre,
// Myeloid-biased HSC, Inflammaging and Cytokine storm. Compositions are read by hand from the source in its 100 × 100 box
// centred on 0,0 and scaled onto a 512 page (`page` of ../cellkit.mjs); outlines at 60 % (setStrokeScale), gloss on
// (lymphocytes and the approved cells placed by placeCellType gloss by themselves).
// Parts used: lymphocyte, antibodyCoat, cytokines, CLONES, T_CELL, B_CELL (immune.mjs); placeCellType ('Neutrophil',
// 'Monocyte', 'Dendritic cell', 'Macrophage'), arrow (tissue.mjs); plot (its axes) (assays.mjs); conventions of objects
// (lab.mjs: PAPER, METAL, GLASS, ACCENT, INK, objW).
// Drawn here because no part draws them: a pale pool round a repertoire of clones, a seesaw, a clock face, the zones of a
// follicle with its germinal centre, a flame and an hourglass.
// Lettered: 4 and 8 on the nuclei of the CD4 and CD8 T cells.
// Usage: node imE.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss } from '../cellkit.mjs'
import { deep, hueGap, hueOf, rich, soft, toLch } from '../colour.mjs'
import { f, setStrokeScale } from '../shapes.mjs'
import { CLONES, CYTOKINE2, T_CELL, antibodyCoat, cytokines, lymphocyte } from '../parts/immune.mjs'
import { plot } from '../parts/assays.mjs'
import { ACCENT, GLASS, INK, METAL, PAPER, objW } from '../parts/lab.mjs'
import { arrow, placeCellType } from '../parts/tissue.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012: paper, metal, glass, ink) are left out of the hue check, as the conventions of lab.mjs say;
// the same palette used by several parts is one colour, listed once.
const icon = (name, [k, cx, cy], draw) => {
  const g = page(k, [cx, cy]), { defs, body, parts } = draw(g)
  // Parts of one hue (the nuclei of placed cells and of lymphocytes, whose tones differ by a shade) count once.
  const seen = parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base || hueGap(toLch(q.base).h, toLch(p.base).h) < 3) === i)
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
const strokeD = (d, colour, w, cap = 'round') => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
const fillD = (d, fill, s = '', w = 0) => `<path d="${d}" fill="${fill}"${s ? ` stroke="${s}" stroke-width="${f(w)}" stroke-linejoin="round"` : ''}/>`
const polyline = (g, pts, close = false) => `M${pts.map((p) => P2(g.P(p))).join(' L')}${close ? 'Z' : ''}`
const objFill = (g, id, box, pal, defs) => (Math.max(box[2] - box[0], box[3] - box[1]) * g.k >= 80 ? (defs.push(g.grad(id, box, pal)), `url(#${id})`) : pal.base)
/** A path in source units (absolute M, L, C, written with commas), each point moved onto the page. */
const mapD = (g, d) => d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, a, b) => P2(g.P([+a, +b])))
const rot = (g, x, y, turn) => (turn ? ` transform="rotate(${f(turn)} ${f(g.X(x))} ${f(g.Y(y))})"` : '')
/** Lymphocytes that are drawn without a surface fill the size they are given with their cytoplasm at 0.94 of it. */
const PLAIN = 0.94

// A clock face as an object (as Proteomic aging clock, tbO): paper, twelve ticks, two hands in ink.
function clock(g, { x, y, r, id = 'clock' }) {
  const defs = [], w = objW(2 * r * g.k)
  let s = g.circle(x, y, r, objFill(g, `${id}-gradient`, [x - r, y - r, x + r, y + r], PAPER, defs), PAPER.outline, w)
  const ticks = Array.from({ length: 12 }, (_, i) => { const q = (i * Math.PI) / 6, r1 = i % 3 ? r * 0.8 : r * 0.7, r2 = r * 0.9; return polyline(g, [[x + r1 * Math.cos(q), y + r1 * Math.sin(q)], [x + r2 * Math.cos(q), y + r2 * Math.sin(q)]]) }).join(' ')
  s += strokeD(ticks, INK, Math.max(2, w * 0.55))
  s += strokeD(polyline(g, [[x, y - r * 0.6], [x, y], [x + r * 0.42, y + r * 0.22]]), INK, w * 1.1)
  s += g.circle(x, y, r * 0.12, INK)
  return own(id, s, [['clock', PAPER]], defs.join(''))
}

// ---------- the icons ----------
// T cell clonal expansion: a diverse repertoire, every T cell a clone of its own colour (CLONES), becomes one dominated by
// a single expanded clone (the rose of CLONES), with two survivors of the others. The repertoires are pale pools (a
// grey of paper, a picture of a population, not a body).
icon('T cell clonal expansion', [5.07, 0, 0], (g) => {
  const hex = [[0, 0], [14, 0], [7, 12.1], [-7, 12.1], [-14, 0], [-7, -12.1], [7, -12.1]]
  const A = [-21, -20], B = [21, 20], S = 13.4 / PLAIN
  const pool = (c, id) => own(id, g.circle(c[0], c[1], 24, PAPER.shadow, PAPER.outline, objW(48 * g.k)), [['pool', PAPER]])
  const before = hex.map(([x, y], i) => lymphocyte(g, { x: A[0] + x, y: A[1] + y, size: S, kind: 'plain', pal: CLONES[i], id: `clone${i + 1}` }))
  const after = hex.map(([x, y], i) => { const c = i === 2 ? 0 : i === 4 ? 1 : 3; return lymphocyte(g, { x: B[0] + x, y: B[1] + y, size: S, kind: 'plain', pal: CLONES[c], id: `expanded${i + 1}` }) })
  const go = arrow(g, { points: [[10, -32], [24, -30], [32, -22], [33, -6]], colour: INK, w: 7.5, id: 'expansion' })
  return join(pool(A, 'diverse-repertoire'), ...before, pool(B, 'expanded-repertoire'), ...after, go)
})

// Naive T cell decline: columns of naive T cells (with their microvilli) that shrink from three to one over the years,
// on plain axes, and an arrow falling with them in the T cell's blue.
icon('Naive T cell decline', [4.95, 0.5, 0], (g) => {
  const axes = plot(g, { x: 0, y: 0, size: 100, aspect: 1, card: false, axes: 'L', id: 'axes' })
  const cells = []
  ;[[-24, 3], [4, 2], [32, 1]].forEach(([x, n], c) => { for (let k = 0; k < n; k++) cells.push(lymphocyte(g, { x, y: 30 - k * 27, size: 29, kind: 'T', id: `naive-t-cell${c + 1}-${k + 1}` })) })
  const fall = arrow(g, { points: [[-6, -43], [43, -17]], colour: INK, w: 9, id: 'decline' })
  return join(axes, ...cells, fall)
})

// Inverted CD4:CD8 ratio (the file "Inverted CD4-CD8 ratio": a colon is refused by Windows): a seesaw tipped down at the right by three CD8 T cells against one CD4 T cell. CD4 cells in the
// T cell's blue, CD8 cells in the rose of the clones, each with its number on the nucleus. The seesaw is metal.
icon('Inverted CD4-CD8 ratio', [4.98, 0, 3.5], (g) => {
  const px = -4, py = 16, th = (11 * Math.PI) / 180, C = Math.cos(th), Sn = Math.sin(th)
  const R = (x, y) => [px + x * C - y * Sn, py + x * Sn + y * C]
  const defs = [], w = objW(88 * g.k)
  let s = fillD(polyline(g, [[px, py + 2], [px - 12, py + 20], [px + 12, py + 20]], true), objFill(g, 'stand-gradient', [px - 12, py, px + 12, py + 20], METAL, defs), METAL.outline, w)
  s += `<g${rot(g, px, py, 11)}>${fillD(rrect(g, px - 44, py - 3, px + 44, py + 3, 3), objFill(g, 'plank-gradient', [px - 44, py - 3, px + 44, py + 3], METAL, defs), METAL.outline, w)}</g>`
  s += g.circle(px, py, 1.8, METAL.outline)
  const seesaw = own('seesaw', s, [['seesaw', METAL]], defs.join(''))
  const S = 25.4 / PLAIN
  const cd4 = lymphocyte(g, { x: R(-31, -15)[0], y: R(-31, -15)[1], size: S, kind: 'plain', pal: T_CELL, letter: '4', id: 'cd4-t-cell' })
  const cd8 = [[11, -15], [35, -15], [23, -37]].map(([x, y], i) => lymphocyte(g, { x: R(x, y)[0], y: R(x, y)[1], size: S, kind: 'plain', pal: CLONES[3], letter: '8', id: `cd8-t-cell${i + 1}` }))
  return join(seesaw, cd4, ...cd8)
})

// Age-associated B cell: a B cell in its green with amber B cell receptors all round, and a clock beside it for age.
icon('Age-associated B cell', [5.0, -1.7, -1.3], (g) => {
  const cx = -6, cy = -5, D = 54
  const coat = antibodyCoat(g, { x: cx, y: cy, size: D, angles: [0, 45, 90, 180, 225, 270, 315], length: 28, facing: 'out', id: 'b-cell-receptors' })
  const b = lymphocyte(g, { x: cx, y: cy, size: D / PLAIN, kind: 'B', receptors: false, id: 'b-cell' })
  return join(coat, b, clock(g, { x: 29, y: 29, r: 15 }))
})

// Germinal centre: a follicle in section. The mantle is a ring of small naive B cells; inside, the germinal centre with
// its dark zone (left, darker, packed with large dividing centroblasts) and its light zone (right, with smaller
// centrocytes round a follicular dendritic cell, drawn as the approved Dendritic cell). The tissue is a pale violet,
// apart from the B cells' green and the dendritic cell's yellow.
const FOLLICLE = soft(265)
icon('Germinal centre', [5.0, 0, 0], (g) => {
  const defs = [], w = objW(90 * g.k)
  let s = g.circle(0, 0, 45, objFill(g, 'follicle-gradient', [-45, -45, 45, 45], { base: FOLLICLE.light, shadow: FOLLICLE.base }, defs), FOLLICLE.outline, w)
  s += g.circle(0, 0, 31.5, FOLLICLE.base, FOLLICLE.outline, w * 0.8)
  s += fillD(mapD(g, 'M2,-31C-1,-26 -4.5,-14 -4.5,0C-4.5,14 -1,26 2,31C-15,31 -31,17 -31,0C-31,-17 -15,-31 2,-31Z'), FOLLICLE.shadow)
  const zones = own('follicle', s, [['follicle', FOLLICLE]], defs.join(''))
  const mantle = Array.from({ length: 30 }, (_, i) => { const t = (i / 30) * 2 * Math.PI, r = 38.6 + (i % 2 ? 1.4 : -1.2); return lymphocyte(g, { x: r * Math.cos(t), y: r * Math.sin(t), size: 6.4 / PLAIN, kind: 'B', receptors: false, id: `mantle-b-cell${i + 1}` }) })
  const blasts = [[-20, -12], [-12, -20], [-22, 2], [-13, -6], [-16, 12], [-5, -12], [-8, 22], [-3, 6], [-20, -20.5], [-26, 11], [-11, -28], [-6, -3], [-24, -4]]
    .filter(([x, y]) => Math.hypot(x, y) < 27.5).map(([x, y], i) => lymphocyte(g, { x, y, size: 7.6 / PLAIN, kind: 'B', receptors: false, id: `centroblast${i + 1}` }))
  const fdc = placeCellType(g, 'Dendritic cell', { x: 14.5, y: -1, size: 25, id: 'follicular-dendritic-cell' })
  const cytes = [[24, -15], [9, -21], [26, 11], [12, 16], [5, -9], [20, 22], [25, -2]].map(([x, y], i) => lymphocyte(g, { x, y, size: 5.6 / PLAIN, kind: 'B', receptors: false, id: `centrocyte${i + 1}` }))
  return join(zones, ...mantle, ...blasts, fdc, ...cytes)
})

// Myeloid-biased HSC: an aged haematopoietic stem cell (the yellow of the approved HSC, as a small round cell with a large
// nucleus) gives rise mostly to myeloid cells, a neutrophil and a monocyte (thick arrows), and little to the lymphoid
// line, a small B cell (a thin arrow).
const HSC = rich(hueOf('#FFEFB0'))
icon('Myeloid-biased HSC', [4.75, 0.1, 0.1], (g) => {
  const hsc = lymphocyte(g, { x: -28, y: 2, size: 39 / PLAIN, kind: 'plain', pal: HSC, id: 'haematopoietic-stem-cell' })
  const big = [[[-12, -7], [7, -19]], [[-8, 3], [15, 5]]].map((pts, i) => arrow(g, { points: pts, colour: INK, w: 11, id: `myeloid-output${i + 1}` }))
  const thin = arrow(g, { points: [[-12, 13], [12, 29]], colour: INK, w: 4.5, id: 'lymphoid-output' })
  const neu = placeCellType(g, 'Neutrophil', { x: 27, y: -27, size: 35, id: 'neutrophil' })
  const mono = placeCellType(g, 'Monocyte', { x: 33, y: 8, size: 29, id: 'monocyte' })
  const lym = lymphocyte(g, { x: 25, y: 35, size: 19 / PLAIN, kind: 'B', receptors: false, id: 'b-cell' })
  return join(hsc, ...big, thin, neu, mono, lym)
})

// Inflammaging: a flame (chronic inflammation) holding an hourglass (age), with cytokines rising round it. The flame is a
// warm orange-red with a pale core, the cytokines the second kind (yellow), 60° from it; the hourglass is glass with sand and end plates in the
// accent blue of objects. Flame and hourglass are objects of a picture, not bodies: a gradient, no gloss.
const FLAME = deep(35)
icon('Inflammaging', [4.9, 1.7, 0], (g) => {
  const defs = [], w = objW(92 * g.k)
  const fl = 'M0,46C-22,46 -36,32 -36,14C-36,-4 -24,-14 -20,-28C-14,-20 -12,-14 -12,-8C-6,-20 -2,-34 6,-46C10,-32 22,-24 28,-12C30,-16 30,-20 30,-24C36,-14 38,-2 36,12C34,32 20,46 0,46Z'
  const core = 'M0,42C-14,42 -22,32 -22,20C-22,10 -16,2 -12,-6C-10,0 -8,4 -6,6C-4,-2 0,-10 4,-16C8,-6 16,0 18,10C20,0 20,-2 20,-4C24,4 24,12 22,22C20,34 12,42 0,42Z'
  const flame = own('flame', fillD(mapD(g, fl), objFill(g, 'flame-gradient', [-36, -46, 36, 46], FLAME, defs), FLAME.outline, w), [['flame', FLAME]])
  const inner = own('flame-core', fillD(mapD(g, core), objFill(g, 'core-gradient', [-22, -16, 24, 42], { base: '#FFFFFF', shadow: FLAME.light }, defs)), [])
  const hw = objW(30 * g.k)
  let h = fillD(mapD(g, 'M-7,8L7,8C7,15 2,18 1.2,21.5C2,25 7,28 7,35L-7,35C-7,28 -2,25 -1.2,21.5C-2,18 -7,15 -7,8Z'), GLASS.light, GLASS.outline, hw)
  h += fillD(mapD(g, 'M-4.5,12L4.5,12C3.5,15 1.5,17 0,19C-1.5,17 -3.5,15 -4.5,12Z') + ' ' + mapD(g, 'M-5.5,34C-4,29.5 4,29.5 5.5,34Z'), ACCENT.outline)
  h += strokeD(polyline(g, [[0, 19], [0, 31]]), ACCENT.outline, Math.max(1.5, hw * 0.35))
  h += fillD(rrect(g, -10, 5, 10, 9, 1.5), ACCENT.base, ACCENT.outline, hw) + fillD(rrect(g, -10, 34, 10, 38, 1.5), ACCENT.base, ACCENT.outline, hw)
  const glass = own('hourglass', h, [['hourglass', ACCENT]])
  const left = cytokines(g, { x: -36, y: -36, size: 18, count: 3, pal: CYTOKINE2, pal2: null, id: 'cytokines-left' })
  const right = cytokines(g, { x: 40, y: -29, size: 18, count: 3, pal: CYTOKINE2, pal2: null, seed: 3, id: 'cytokines-right' })
  return join({ defs: defs.join(''), body: '', parts: [] }, flame, inner, glass, left, right)
})

// Cytokine storm: an activated macrophage (the approved Macrophage) releasing wave after wave of cytokines of two kinds
// (orange and yellow), in three rings round it.
icon('Cytokine storm', [4.64, 0, 0], (g) => {
  const storm = cytokines(g, { x: 0, y: 0, size: 98, layout: 'rings', inner: 58, rings: 3, dot: 6.2, id: 'cytokines' })
  const mac = placeCellType(g, 'Macrophage', { x: 0, y: 0, size: 48, id: 'macrophage' })
  return join(storm, mac)
})

check()
console.log('written')
