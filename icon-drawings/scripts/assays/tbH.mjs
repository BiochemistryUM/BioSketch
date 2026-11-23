// Eight icons of SiliCoDraw's "Techniques & assays" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts of the
// category (../parts/assays.mjs) and the conventions of objects of ../parts/lab.mjs: the designs of clinical studies.
// Cohort study, Randomisation, Placebo, Blinding, Crossover design, Washout, Time points and Inclusion criteria.
// Compositions are read by hand from the source in its 100 × 100 box centred on 0,0 and scaled onto a 512 page
// (`page` of ../cellkit.mjs); outlines at 60 % (setStrokeScale), gloss on (nothing here is a biological body).
// Parts used: person, timeline, badge (assays.mjs); tube (lab.mjs, a blood tube); arrow (tissue.mjs); lettering.
// Drawn here because no part draws them: a capsule and a tablet (`capsule`, `tablet`), a die (`die`), a sheet of paper
// with lines of writing (`sheet`), arm boxes (`armBox`) and the waves of a washout.
// Lettered: t₀…t₃ under time points (the timeline's labels), A and B on the arms, P on the placebo tablet.
// Usage: node tbH.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss } from '../cellkit.mjs'
import { deep, toLch } from '../colour.mjs'
import { f, setStrokeScale } from '../shapes.mjs'
import { GRID, SERIES, badge, person, timeline } from '../parts/assays.mjs'
import { ACCENT, INK, LIQUIDS, PAPER, objW, tube } from '../parts/lab.mjs'
import { lettering } from '../parts/letters.mjs'
import { arrow } from '../parts/tissue.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012: paper, plastic, ink) are left out of the hue check, as the conventions of lab.mjs say; the
// same palette used by several parts is one colour, listed once.
const icon = (name, [k, cx, cy], draw) => {
  const g = page(k, [cx, cy]), { defs, body, parts } = draw(g)
  const seen = parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base) === i)
  kit.cellType(name, seen, defs, body)
}
const join = (...ps) => ({ defs: ps.map((p) => p.defs ?? '').join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts ?? []) })
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })

// ---------- small drawing helpers in g's units ----------
const P2 = (p) => p.map(f).join(',')
/** A rounded rectangle given in g's units, as a path on the page. */
const rrect = (g, x0, y0, x1, y1, r) => {
  const [a, b] = g.P([x0, y0]), W = (x1 - x0) * g.k, H = (y1 - y0) * g.k, R = Math.min(r * g.k, W / 2, H / 2)
  return `M${f(a + R)},${f(b)} H${f(a + W - R)} A${f(R)},${f(R)} 0 0 1 ${f(a + W)},${f(b + R)} V${f(b + H - R)} A${f(R)},${f(R)} 0 0 1 ${f(a + W - R)},${f(b + H)} H${f(a + R)} A${f(R)},${f(R)} 0 0 1 ${f(a)},${f(b + H - R)} V${f(b + R)} A${f(R)},${f(R)} 0 0 1 ${f(a + R)},${f(b)} Z`
}
const strokeD = (d, colour, w, cap = 'round', extra = '') => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"${extra}/>`
const fillD = (d, fill, s = '', w = 0) => `<path d="${d}" fill="${fill}"${s ? ` stroke="${s}" stroke-width="${f(w)}" stroke-linejoin="round"` : ''}/>`
const polyline = (g, pts) => `M${pts.map((p) => P2(g.P(p))).join(' L')}`
/** Fill of an object: a two-stop gradient from 80 px on (lab.mjs convention), its base below. */
const objFill = (g, id, box, pal, defs) => (Math.max(box[2] - box[0], box[3] - box[1]) * g.k >= 80 ? (defs.push(g.grad(id, box, pal)), `url(#${id})`) : pal.base)
const rot = (g, x, y, turn) => (turn ? ` transform="rotate(${f(turn)} ${f(g.X(x))} ${f(g.Y(y))})"` : '')

// ---------- objects no part draws ----------
/**
 * A capsule (hard gelatine pill) `size` long, centred on x, y, turned by `turn` degrees: one half white (PAPER), the
 * other in `pal` (the accent blue), a seam between them, a gradient and a pale streak from 80 px.
 */
const capsule = (g, { x, y, size, turn = 0, id = 'capsule', pal = ACCENT }) => {
  const L = size, W = size * 0.44, r = W / 2, defs = [], px = L * g.k, w = objW(px)
  const box = [x - L / 2, y - W / 2, x + L / 2, y + W / 2]
  let s = fillD(rrect(g, ...box, r), objFill(g, `${id}-white-gradient`, box, PAPER, defs), PAPER.outline, w)
  // the coloured half: from the left end to the middle, its seam a slightly wider band
  const [a, b] = g.P([x - L / 2, y - W / 2]), R = r * g.k, mx = g.X(x + L * 0.04), H = W * g.k
  const half = `M${f(mx)},${f(b)} H${f(a + R)} A${f(R)},${f(R)} 0 0 0 ${f(a + R)},${f(b + H)} H${f(mx)} Z`
  s += fillD(half, objFill(g, `${id}-gradient`, [x - L / 2, y - W / 2, x, y + W / 2], pal, defs), pal.outline, w)
  if (px >= 80) s += strokeD(polyline(g, [[x - L * 0.3, y - W * 0.22], [x + L * 0.3, y - W * 0.22]]), PAPER.light, Math.max(2, W * g.k * 0.12))
  return { defs: defs.join(''), body: `<g id="${id}"${rot(g, x, y, turn)}>${s}</g>`, parts: [['capsule', pal], ['white half', PAPER]] }
}
/** A round tablet seen from above, `size` across: a white disc with a bevelled rim; `letter` lettered in its middle. */
const tablet = (g, { x, y, size, id = 'tablet', letter, pal = PAPER }) => {
  const R = size / 2, defs = [], w = objW(size * g.k)
  let s = g.circle(x, y, R, objFill(g, `${id}-gradient`, [x - R, y - R, x + R, y + R], pal, defs), pal.outline, w)
  s += g.circle(x, y, R * 0.8, 'none', pal.small, Math.max(1.5, w * 0.5))
  if (letter) s += lettering(g, { x, y, h: R * 0.78, text: letter, colour: ACCENT.outline, id: `${id}-letter` }).body
  return { defs: defs.join(''), body: `<g id="${id}">${s}</g>`, parts: [['tablet', pal], ['letter', ACCENT]] }
}
/** A die seen face on, `size` across, showing five: a white rounded cube face with five dark pips. */
const die = (g, { x, y, size, id = 'die' }) => {
  const h = size / 2, defs = [], w = objW(size * g.k), box = [x - h, y - h, x + h, y + h]
  let s = fillD(rrect(g, ...box, size * 0.2), objFill(g, `${id}-gradient`, box, PAPER, defs), PAPER.outline, w)
  s += [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]].map(([u, v]) => g.circle(x + u * h * 0.48, y + v * h * 0.48, size * 0.1, INK)).join('')
  return { defs: defs.join(''), body: `<g id="${id}">${s}</g>`, parts: [['die', PAPER]] }
}
/** A box for one arm of a trial, in `pal`, with its letter in the outline tone (as the periods of `timeline`). */
const armBox = (g, { x, y, size, id = 'arm', pal, letter }) => {
  const h = size / 2, defs = [], w = objW(size * g.k), box = [x - h, y - h, x + h, y + h]
  let s = fillD(rrect(g, ...box, size * 0.16), objFill(g, `${id}-gradient`, box, pal, defs), pal.outline, w)
  s += lettering(g, { x, y, h: size * 0.5, text: letter, colour: pal.outline, id: `${id}-letter` }).body
  return { defs: defs.join(''), body: `<g id="${id}">${s}</g>`, parts: [[`arm ${letter}`, pal]] }
}
/** A sheet of paper (a form) with lines of writing, from x0, y0 to x1, y1. */
const sheet = (g, { x0, y0, x1, y1, id = 'sheet', rows = 5 }) => {
  const defs = [], w = objW((y1 - y0) * g.k), box = [x0, y0, x1, y1]
  let s = fillD(rrect(g, ...box, 4), objFill(g, `${id}-gradient`, box, PAPER, defs), PAPER.outline, w)
  const lx0 = x0 + (x1 - x0) * 0.2, lx1 = x1 - (x1 - x0) * 0.2, top = y0 + (y1 - y0) * 0.2, step = (y1 - y0) * 0.13
  const segs = Array.from({ length: rows }, (_, i) => polyline(g, [[lx0, top + i * step], [i === rows - 1 ? lx0 + (lx1 - lx0) * 0.6 : lx1, top + i * step]])).join(' ')
  s += strokeD(segs, GRID, Math.max(2, w * 0.6))
  return { defs: defs.join(''), body: `<g id="${id}">${s}</g>`, parts: [['sheet', PAPER]] }
}

// The two arms of a trial in every icon of the set: A the accent blue, B amber (SiliCoDraw's #e3955a, rich 70).
const ARM_A = SERIES[0], ARM_B = SERIES[3]

// ---------- the icons ----------
// Cohort study: four participants followed over time, one of them (green) the case that develops the outcome; under
// them the follow-up as a timeline with t₀, t₁, t₂.
icon('Cohort study', [5.18, 0, 1], (g) => join(
  ...[-31, -10.3, 10.3, 31].map((x, i) => person(g, { x, y: -18, size: 27, pal: i === 2 ? SERIES[2] : ACCENT, id: `participant${i + 1}` })),
  timeline(g, { x: 0, y: 14, size: 88, at: [0.15, 0.5, 0.85], labels: ['t_0', 't_1', 't_2'], id: 'follow-up' }),
))

// Randomisation: a die, then a line that splits into the two arms of the trial, A and B.
icon('Randomisation', [4.86, 0, 0], (g) => join(
  die(g, { x: -32, y: 0, size: 30 }),
  arrow(g, { points: [[-13, 0], [2, 0], [20, -20]], corners: true, colour: INK, id: 'to-arm-A', w: 6.5 }),
  arrow(g, { points: [[2, 0], [20, 20]], corners: true, colour: INK, id: 'to-arm-B', w: 6.5 }),
  armBox(g, { x: 36, y: -27, size: 22, pal: ARM_A, letter: 'A', id: 'arm-A' }),
  armBox(g, { x: 36, y: 27, size: 22, pal: ARM_B, letter: 'B', id: 'arm-B' }),
))

// Placebo: a capsule beside a tablet marked P (the word "placebo" written on it is left out).
icon('Placebo', [5.3, 1, 2], (g) => join(
  capsule(g, { x: -21, y: 2, size: 46, turn: -35 }),
  tablet(g, { x: 23, y: 2, size: 42, letter: 'P' }),
))

// Blinding: a participant with a blindfold; a red sign with a cross says that what was given is not known. Its red is
// crimson (deep 10), not the signs' red (27), to stay 36° from the skin (52).
// (The red cross sign was taken out after the review of 23 November 2026: it is the sign of Exclusion criteria and read
// as "not blinded" or "excluded"; the blindfold says it.)
icon('Blinding', [5.18, -6, -3], (g) => join(
  person(g, { x: -6, y: -3, size: 92, blindfold: true, id: 'participant' }),
))

// Crossover design: two groups, each a timeline of two treatment periods with a washout between them: A then B, and
// B then A (the word "washout" is left out; the dashed period is the washout).
const periods = (first, second) => [[0.04, 0.4, first, first === ARM_A ? 'A' : 'B'], [0.4, 0.6, PAPER, '', true], [0.6, 0.96, second, second === ARM_A ? 'A' : 'B']]
icon('Crossover design', [4.95, 0, 5], (g) => join(
  timeline(g, { x: 0, y: -4, size: 92, at: [0.04, 0.4, 0.6, 0.96], blocks: periods(ARM_A, ARM_B), id: 'group1' }),
  timeline(g, { x: 0, y: 34, size: 92, at: [0.04, 0.4, 0.6, 0.96], blocks: periods(ARM_B, ARM_A), id: 'group2' }),
))

// Washout: two periods of treatment (a capsule above each, in place of the word "dose") with a drug-free washout
// between them, its waves the drug being cleared.
icon('Washout', [4.86, 0, -21.7], (g) => {
  const T = timeline(g, { x: 0, y: 0, size: 94, at: [0.04, 0.34, 0.66, 0.96], blocks: [[0.04, 0.34, ARM_A], [0.34, 0.66, PAPER, '', true], [0.66, 0.96, ARM_A]], id: 'periods' })
  const u = 0.94, wave = (y0) => { const pts = Array.from({ length: 25 }, (_, i) => [-9 + (18 * i) / 24, y0 + 2.2 * Math.sin((i / 24) * Math.PI * 3)]); return polyline(g, pts) }
  const waves = own('washout-waves', strokeD(`${wave(-20 * u)} ${wave(-12 * u)}`, LIQUIDS.water.outline, Math.max(3, 4.5 * g.k * 0.35)), [['waves', LIQUIDS.water]])
  return join(T, waves, capsule(g, { x: -32, y: -39, size: 24, turn: -25, id: 'dose1' }), capsule(g, { x: 32, y: -39, size: 24, turn: -25, id: 'dose2' }))
})

// Time points: a timeline with four sampling points t₀…t₃ (the first amber), a blood tube drawn at each.
icon('Time points', [4.86, 0, -10], (g) => {
  const xs = [0.1, 0.36, 0.62, 0.88].map((u) => -47 + 94 * u)
  const tubes = xs.map((x, i) => tube(g, { x, y: -26, size: 28, kind: 'blood', liquid: 'blood', level: 0.62, id: `sample${i + 1}` }))
  const stems = own('stems', strokeD(xs.map((x) => polyline(g, [[x, -5], [x, -11]])).join(' '), INK, objW(30 * g.k) * 0.6))
  return join(timeline(g, { x: 0, y: 0, size: 94, dots: true, labels: ['t_0', 't_1', 't_2', 't_3'], id: 'schedule' }), stems, ...tubes)
})

// Inclusion criteria: a form of criteria with a green check: eligible, included.
icon('Inclusion criteria', [5.15, 5, 0], (g) => join(
  sheet(g, { x0: -32, y0: -44, x1: 30, y1: 40 }),
  badge(g, { x: 26, y: 28, size: 34, mark: 'check', id: 'included' }),
))

check()
console.log('written')
