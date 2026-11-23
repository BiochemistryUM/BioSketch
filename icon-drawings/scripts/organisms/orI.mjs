// Eight icons of SiliCoDraw's "Organisms" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), the later drawings that replace the first, redrawn in the soft look of
// icon-drawings/STYLE.md from the shared parts: Locust, Caterpillar, Pupa, Life cycle, Tick, Spider, Daphnia and Plankton.
// Compositions are read by hand from the source in its 100 × 100 box centred on 0,0 and scaled onto a 512 page (`page`
// of ../cellkit.mjs); outlines at 60 % (setStrokeScale), gloss on (the butterfly's eggs are too small to be glossed).
// Parts used: insect (locust, caterpillar, pupa, butterfly), arthropod (tick, spider, daphnia, copepod), plant (leaf),
// micro (diatom) of parts/organisms.mjs; arrow of parts/tissue.mjs.
// Drawn here because no part draws them: the three butterfly eggs on the leaf of Life cycle (small pale ovals).
// Lettered: nothing (SiliCoDraw writes no labels on these).
// Usage: node orI.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss } from '../cellkit.mjs'
import { toLch } from '../colour.mjs'
import { f, setStrokeScale } from '../shapes.mjs'
import { CATERPILLAR, EGG_SHELL, PETAL, arthropod, insect, micro, plant, tone } from '../parts/organisms.mjs'
import { objW } from '../parts/lab.mjs'
import { arrow } from '../parts/tissue.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012) are left out of the hue check, as the conventions of lab.mjs say; a palette used by several
// parts is listed once.
const icon = (name, [k, cx, cy], draw) => {
  const g = page(k, [cx, cy]), { defs, body, parts } = draw(g)
  const seen = parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base) === i)
  kit.cellType(name, seen, defs, body)
}
const join = (...ps) => ({ defs: ps.map((p) => p.defs ?? '').join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts ?? []) })
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })
const P2 = (p) => p.map(f).join(',')
const ellD = (g, u, v, rx, ry, rot = 0) => {
  const K = 0.5523, c = Math.cos((rot * Math.PI) / 180), s = Math.sin((rot * Math.PI) / 180)
  const q = [[rx, 0], [rx, K * ry], [K * rx, ry], [0, ry], [-K * rx, ry], [-rx, K * ry], [-rx, 0], [-rx, -K * ry], [-K * rx, -ry], [0, -ry], [K * rx, -ry], [rx, -K * ry], [rx, 0]].map(([a, b]) => P2(g.P([u + a * c - b * s, v + a * s + b * c])))
  return `M${q[0]} C${q[1]} ${q[2]} ${q[3]} C${q[4]} ${q[5]} ${q[6]} C${q[7]} ${q[8]} ${q[9]} C${q[10]} ${q[11]} ${q[12]} Z`
}

// ---------- Locust, Caterpillar, Pupa ----------
// Each the insect part as it is: the desert locust from the side (long folded wings with spots, the big hind leg), the
// caterpillar from the side (segments, spiracles, prolegs, horn), the chrysalis hanging from its twig.
icon('Locust', [4.6, 0, 5.1], (g) => insect(g, { x: -0.35, y: 0, size: 98.7, kind: 'locust', id: 'locust' }))
icon('Caterpillar', [4.6, 0, 0], (g) => insect(g, { x: 0.43, y: 0, size: 98.7, kind: 'caterpillar', id: 'caterpillar' }))
icon('Pupa', [4.6, 0, 0], (g) => insect(g, { x: 0, y: 1, size: 97.7, kind: 'pupa', id: 'pupa' }))

// ---------- Life cycle ----------
// Complete metamorphosis round a circle, clockwise as SiliCoDraw draws it: eggs on a leaf at the top, the caterpillar at
// the right, the pupa at the bottom, the butterfly at the left, joined by four curved arrows in the slate grey of arrows.
// The leaf takes the caterpillar's green (one palette: in SiliCoDraw both are its main colour, and two greens could not
// be 36° apart); the butterfly is pink as in SiliCoDraw's cycle (PETAL), so that it stays clear of the tan pupa, and the
// pupa a warmer brown (hue 42 for the part's 70), so that it stays clear of the caterpillar's yellow horn and spiracles.
const CHRYSALIS = tone(42, 0.74, 0.075)
icon('Life cycle', [4.6, 0, 2.5], (g) => {
  const R = 37.5, pt = (a) => [R * Math.cos((a * Math.PI) / 180), R * Math.sin((a * Math.PI) / 180)]
  const arc = (a0, a1, id) => arrow(g, { points: Array.from({ length: 13 }, (_, i) => pt(a0 + ((a1 - a0) * i) / 12)), id, w: 7 })
  const leaf = plant(g, { x: 1.5, y: -34, size: 31, kind: 'leaf', leaf: CATERPILLAR, turn: 33, id: 'leaf' })
  const w = objW(9 * g.k) * 0.7
  const eggs = own('eggs', [[-3.5, -36.5], [2, -38.5], [7.5, -37]].map(([x, y], i) => `<path d="${ellD(g, x, y, 2.3, 3, -10 + i * 8)}" fill="${EGG_SHELL.base}" stroke="${EGG_SHELL.outline}" stroke-width="${f(w)}" stroke-linejoin="round"/>`).join(''), [['eggs', EGG_SHELL]])
  return join(
    arc(-62, -28, 'arrow-1'), arc(26, 62, 'arrow-2'), arc(118, 152, 'arrow-3'), arc(208, 238, 'arrow-4'),
    leaf, eggs,
    insect(g, { x: 34, y: 2, size: 33.5, kind: 'caterpillar', id: 'caterpillar' }),
    insect(g, { x: 0, y: 33, size: 32, kind: 'pupa', body: CHRYSALIS, id: 'pupa' }),
    insect(g, { x: -34.5, y: 1, size: 31.5, kind: 'butterfly', body: PETAL, id: 'butterfly' }),
  )
})

// ---------- Tick, Spider ----------
// The arthropod part as it is, seen from above, head up: the hard tick with its dark shield, mouthparts and eight legs;
// the spider with its eye cluster, palps and the pale mark on the abdomen.
icon('Tick', [4.6, 0, 0], (g) => arthropod(g, { x: 0, y: 0, size: 96.2, kind: 'tick', id: 'tick' }))
icon('Spider', [4.6, 0, 0], (g) => arthropod(g, { x: 0, y: 0, size: 97.9, kind: 'spider', id: 'spider' }))

// ---------- Daphnia ----------
// The water flea from the side facing left: see-through carapace with the green gut and the brood of eggs, branched
// antenna, one big eye, the tail spine (the arthropod part as it is).
icon('Daphnia', [4.6, 0, 0], (g) => arthropod(g, { x: 0, y: 0, size: 100, kind: 'daphnia', id: 'daphnia' }))

// ---------- Plankton ----------
// SiliCoDraw's plankton is a copepod seen from above; it is the copepod part (antennae with bristles, segmented body, the
// two green egg sacs, the red eye), and two small golden diatoms beside its tail stand for the plant plankton it eats.
icon('Plankton', [4.6, 0, 0], (g) => join(
  micro(g, { x: -33, y: 33, size: 26, kind: 'diatom', turn: -35, id: 'diatom-1' }),
  micro(g, { x: 34, y: 30, size: 22, kind: 'diatom', turn: 30, id: 'diatom-2' }),
  arthropod(g, { x: 0, y: 0, size: 98.7, kind: 'copepod', id: 'copepod' }),
))

check()
console.log('written', OUT)
