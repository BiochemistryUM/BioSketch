// Eight icons of SiliCoDraw's "Techniques & assays" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David
// Carlsson; see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts:
// culture plates of microbiology and cell biology, and tubes of dilution series: a streak plate, a spread plate with its
// glass spreader, an antibiotic disc assay, an ELISpot well, a clonogenic assay, a membrane filter held by forceps, MPN
// tubes with their Durham tubes, and a serial dilution. Compositions are read by hand from the source in a 100 × 100 box
// centred on 0,0 and scaled onto a 512 page (`page` of ../cellkit.mjs). Outlines at 60 % (`setStrokeScale(0.6)`); these
// are objects, so nothing is glossed (`setGloss(true)` is set all the same, as every script of the current look does).
// Parts used: culturePlate (assays.mjs); tube (lab.mjs); arrow, plus (tissue.mjs).
// Drawn here because no part draws them: the glass spreader, the forceps, the Durham tube with its gas bubble, the rack
// of the MPN tubes (as the rack of Tube rack in ../lab/lb02.mjs) and the minus mark beside tissue.mjs's plus.
// Lettered: nothing.
// Usage: node tbC.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toLch } from '../colour.mjs'
import { f, setStrokeScale, strokeScale } from '../shapes.mjs'
import { GLASS, INK, METAL, PAPER, objW, tube } from '../parts/lab.mjs'
import { culturePlate, mixHex } from '../parts/assays.mjs'
import { arrow, plus } from '../parts/tissue.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012: the materials) are left out of the hue check, as the conventions of lab.mjs say; a palette
// used twice is one part that recolours as one, so it is listed once.
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base) === i), defs, body)
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts) })
const icon = (name, { defs, body, parts }) => cellType(name, parts, defs, body)
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })
/** A width in page pixels that `setStrokeScale` leaves as it is (for lines that are the drawing itself). */
const keep = (w) => w / strokeScale()

const P2 = (g, p) => g.P(p).map(f).join(',')
const L = (g, pts, close = false) => `M${pts.map((p) => P2(g, p)).join(' L')}${close ? 'Z' : ''}`
/** A rod of `width` g units along the courses `ds` (page paths), outlined `w` page pixels: glass or metal as one shape. */
const rod = (ds, width, pal, w, g) => {
  const W = width * g.k
  return ds.map((d) => `<path d="${d}" fill="none" stroke="${pal.outline}" stroke-width="${f(keep(W) + 2 * w)}" stroke-linecap="round" stroke-linejoin="round"/>`).join('') +
    ds.map((d) => `<path d="${d}" fill="none" stroke="${pal.base}" stroke-width="${f(keep(W))}" stroke-linecap="round" stroke-linejoin="round"/>`).join('')
}
const K = 4.72 // a plate of size 100 on about 460 px: margins of 26

// ---------------------------------------------------------------------------------------------------------------------
// Streak plate: an agar plate streaked in three sectors, single colonies where the last streak runs out.
// (The part's streak plate; colonies in the cream of lab.mjs's colonies on yellow agar, where SiliCoDraw has green.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K, [0, 0])
  icon('Streak plate', culturePlate(g, { x: 0, y: 0, size: 100, content: 'streak', id: 'streak-plate' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Spread plate: colonies spread evenly over an agar plate, and the glass spreader (a triangle bent from a rod) lying on
// it, its handle running off to the top right.
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.93, [1.2, -1.8])
  const plate = culturePlate(g, { x: -5, y: 5, size: 82, content: 'spread', count: 16, seed: 2, id: 'spread-plate' })
  const w = objW(60 * g.k)
  const handle = L(g, [[45, -46], [12, -10]]), loop = L(g, [[12, -10], [-17, -5], [7, 19]], true)
  const spreader = rod([handle, loop], 3, GLASS, w, g) + g.line([[39.5, -41.5], [26, -26.5]], GLASS.light, f(keep(0.9 * g.k)))
  icon('Spread plate', join(plate, own('spreader', spreader, [['spreader', GLASS]])))
}

// ---------------------------------------------------------------------------------------------------------------------
// Antibiotic disc assay (Kirby–Bauer): paper discs on a bacterial lawn, each in a clear zone of its own size.
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K, [0, 0])
  icon('Antibiotic disc assay', culturePlate(g, { x: 0, y: 0, size: 100, content: 'discs', id: 'disc-assay' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// ELISpot: the membrane of a well with the dark spots that cytokine-secreting cells leave, in crystal violet's purple.
// (SiliCoDraw's spots are the accent blue; the conventions give ELISpot spots the violet of a stained membrane.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K, [0, 0])
  icon('ELISpot', culturePlate(g, { x: 0, y: 0, size: 100, content: 'spots', count: 11, seed: 2, id: 'elispot' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Clonogenic assay: a dish of colonies grown from single cells and stained with crystal violet.
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K, [0, 0])
  icon('Clonogenic assay', culturePlate(g, { x: 0, y: 0, size: 100, content: 'stained', id: 'clonogenic' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Membrane filter: a gridded filter on its agar with colonies of two kinds, held at its edge by flat forceps.
// (The filter lies on agar in a dish, as it is incubated; the forceps are steel grey, two arms joined at their back.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.86, [2.3, -1])
  const plate = culturePlate(g, { x: -5, y: 5, size: 82, content: 'filter', seed: 3, id: 'membrane-filter' })
  const w = objW(60 * g.k)
  // two arms from the tips at the filter's edge to the joined back end
  const a = L(g, [[15.5, -14], [42, -43.5], [46.5, -45]]), b = L(g, [[18, -11.5], [47.5, -38.5], [46.5, -45]])
  const forceps = rod([a, b], 2.4, METAL, w, g) + g.line([[39, -38.5], [30, -28.5]], METAL.light, f(keep(0.7 * g.k)))
  icon('Membrane filter', join(plate, own('forceps', forceps, [['forceps', METAL]])))
}

// ---------------------------------------------------------------------------------------------------------------------
// MPN tubes: five tubes of broth in a rack, each with a small Durham tube upside down in it. Acid turns the broth
// yellow and gas collects in the Durham tube (positive, a plus under the tube); a negative tube stays purple and its
// Durham tube full (a minus).
// (SiliCoDraw draws the gas as the white upper part of the Durham tube; here a bubble at its top, as it is seen.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.5, [0, -1.5])
  const POS = rich(hueOf('#e9b949')), NEG = soft(hueOf('#dccdee'))
  const X = [-41, -20.5, 0, 20.5, 41], pos = [1, 1, 0, 1, 0], S = 56, ty = -12
  const W = objW(96 * g.k), fine = Math.max(1.5, objW(S * g.k) * 0.45)
  // the rack: a back rail behind the tubes, a base plate in front of their feet
  const back = own('rack-rail', g.path(L(g, [[-49, -15], [49, -15], [49, -8], [-49, -8]], true), METAL.shadow, METAL.outline, f(W * 0.8)))
  const tubes = X.map((x, i) => tube(g, { x, y: ty, size: S, kind: 'test', liquid: pos[i] ? POS : NEG, level: 0.6, id: `tube${i + 1}` }))
  // Durham tubes: a small glass tube upside down near the foot of each tube (closed end up); gas at its top if positive
  const durham = X.map((x, i) => {
    const top = -1, bot = 13.5, hw = 3.3, d = `M${P2(g, [x - hw, bot])} L${P2(g, [x - hw, top + hw])} A${f(hw * g.k)},${f(hw * g.k)} 0 0 1 ${P2(g, [x + hw, top + hw])} L${P2(g, [x + hw, bot])}`
    const gas = pos[i] ? g.path(`M${P2(g, [x - hw, top + 7])} L${P2(g, [x - hw, top + hw])} A${f(hw * g.k)},${f(hw * g.k)} 0 0 1 ${P2(g, [x + hw, top + hw])} L${P2(g, [x + hw, top + 7])} Q${P2(g, [x, top + 5.4])} ${P2(g, [x - hw, top + 7])}Z`, PAPER.light) : ''
    return gas + `<path d="${d}" fill="none" stroke="${(pos[i] ? POS : NEG).outline}" stroke-width="${f(fine * 1.3)}" stroke-linecap="round" stroke-linejoin="round"/>`
  }).join('')
  const base = own('rack-base', g.path(L(g, [[-49, 16.5], [49, 16.5], [49, 23.5], [-49, 23.5]], true), 'url(#rack-gradient)', METAL.outline, f(W * 0.8)), [], g.grad('rack-gradient', [-49, 16.5, 49, 23.5], METAL))
  // the result under each tube: tissue.mjs's plus, or a minus drawn as its bar alone
  const ms = 9, mw = f(Math.min(22, Math.max(3.5, (ms * g.k) / 4.5))), mh = ms / 2 - mw / g.k / 2
  const marks = X.map((x, i) => (pos[i] ? plus(g, { x, y: 34, size: ms, colour: INK, id: `plus${i + 1}` }).body : `<g id="minus${i + 1}">${g.line([[x - mh, 34], [x + mh, 34]], INK, mw)}</g>`)).join('')
  icon('MPN tubes', join(back, ...tubes, own('durham-tubes', durham), base, own('results', marks)))
}

// ---------------------------------------------------------------------------------------------------------------------
// Serial dilution: five tubes, each holding a tenth of the one before, the sample paler from tube to tube, with an
// arrow carrying a volume over from each tube to the next.
// (One part for the sample: its paler tones are mixes of it towards the glass, so they recolour with it.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.5, [0, -6.5])
  const DYE = deep(hueOf('#4f6bb8'))
  const X = [-41, -20.5, 0, 20.5, 41], ty = 0, S = 56
  const pals = [0, 0.3, 0.52, 0.7, 0.84].map((t) => ({ ...DYE, small: mixHex(DYE.small, GLASS.base, t), outline: mixHex(DYE.outline, GLASS.base, t * 0.6) }))
  const tubes = X.map((x, i) => tube(g, { x, y: ty, size: S, kind: 'test', liquid: pals[i], level: 0.5, id: `tube${i + 1}` }))
  const arrows = X.slice(0, 4).map((x, i) => arrow(g, { points: [[x + 3, -34], [x + 10.25, -42], [x + 17.5, -34.5]], colour: INK, w: 7, head: 17, id: `transfer${i + 1}` }).body).join('')
  icon('Serial dilution', join(...tubes.map((t, i) => ({ ...t, parts: t.parts.filter(([n]) => !n.startsWith('liquid') || i === 0) })), own('transfers', arrows)))
}

check()
console.log('written to', OUT)
