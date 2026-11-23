// Eight icons of SiliCoDraw's "Organisms" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), the later drawings that replace the first, redrawn in the soft look of
// icon-drawings/STYLE.md from the shared parts: Yeast, Yeast chronological lifespan, Fungal hyphae, Mushroom, Spores,
// Lichen, Actinomycete and Mycorrhiza.
// Compositions are read by hand from the source in its 100 × 100 box centred on 0,0 and scaled onto a 512 page (`page`
// of ../cellkit.mjs); outlines at 60 % (setStrokeScale), gloss on (the yeast cells, spores and the hypha's spore gloss in
// their parts).
// Parts used: fungus (yeast, hyphae, fly agaric, spores, lichen, actinomycete, mycelium), plant (seedling, roots) of
// parts/organisms.mjs; glassware (flask) and petriDish of parts/lab.mjs; arrow of parts/tissue.mjs.
// Drawn here because no part draws them: the block of soil of Mycorrhiza (the ground part is a thin strip) and the
// fungal mantle round the root tips (lilac sheaths under the roots).
// Lettered: nothing (SiliCoDraw writes no labels on these).
// Usage: node orL.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss } from '../cellkit.mjs'
import { deep, toHex, toLch } from '../colour.mjs'
import { f, setStrokeScale, strokeScale } from '../shapes.mjs'
import { ACTINO_SPORE, SOIL, fungus, plant } from '../parts/organisms.mjs'
import { AGAR, glassware, objW, petriDish } from '../parts/lab.mjs'
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
const own = (id, body, parts = []) => ({ defs: '', body: `<g id="${id}">${body}</g>`, parts })
const P2 = (p) => p.map(f).join(',')
const GREY = toHex({ l: 0.5, c: 0.006, h: 255 })

// ---------- Yeast ----------
// The budding yeast of the fungus part: the glossy mother cell with its bud and vacuole and two bud scars (SiliCoDraw
// shows two).
icon('Yeast', [4.6, 0, 0], (g) => fungus(g, { x: 0, y: 0, size: 100, kind: 'yeast', scars: 2, id: 'yeast' }))

// ---------- Yeast chronological lifespan ----------
// The chronological lifespan assay as SiliCoDraw lays it out: a flask of culture with yeast cells settled in it, some
// stained dark blue as dead (methylene blue), and an arrow over to an agar plate where the cells still alive grow into
// colonies. The live cells take the agar's palette (two pale yellows could not be 36° apart, and both stand for the
// growth medium's colour of living yeast); the dead cells a deep blue 40° from the water; no bud scars on these small
// cells (their blue would sit 2° from the dead cells).
const DEAD = deep(262)
icon('Yeast chronological lifespan', [4.9, 0.75, 2.4], (g) => {
  const cells = [[-36, 17, 0, 20], [-27, 18, 1, -30], [-18, 17.5, 0, 40], [-9, 18, 0, 0], [-31, 10, 0, -60], [-22, 11, 0, 15], [-13, 10.5, 1, 70], [-26, 3, 0, 30], [-17, 3.5, 0, -40]]
  return join(
    glassware(g, { x: -23, y: -4, size: 56, kind: 'flask', liquid: 'water', level: 0.72, id: 'flask' }),
    ...cells.map(([x, y, d, t], i) => fungus(g, { x, y, size: 7.5, kind: 'yeast', scars: 0, turn: t, cell: d ? DEAD : AGAR, id: `${d ? 'dead' : 'live'}-cell-${i + 1}` })),
    arrow(g, { points: [[-6, -33], [10, -38], [24, -28], [28, -12]], id: 'plating', w: 7, colour: GREY }),
    petriDish(g, { x: 27, y: 23, size: 42, fill: 'agar', colonies: 6, seed: 2, id: 'plate' }),
  )
})

// ---------- Fungal hyphae, Mushroom, Spores, Lichen, Actinomycete ----------
// The fungus part as it is: a branching hypha grown from its spore, with cross walls, nuclei and tips; SiliCoDraw's
// mushroom, which is a fly agaric (red cap with white warts, gills, ring and bulb); three spiny spores, one germinating;
// a foliose lichen rosette with orange fruiting cups; Streptomyces filaments with chains of spores.
icon('Fungal hyphae', [4.6, 0, 0], (g) => fungus(g, { x: -0.55, y: 0, size: 97.8, kind: 'hyphae', id: 'hyphae' }))
icon('Mushroom', [4.6, 0, 0], (g) => fungus(g, { x: 0, y: 0, size: 100.6, kind: 'fly agaric', id: 'mushroom' }))
icon('Spores', [4.6, 0, 0], (g) => fungus(g, { x: -0.75, y: 1.3, size: 98.5, kind: 'spores', id: 'spores' }))
icon('Lichen', [4.6, 0, 0], (g) => fungus(g, { x: 0.45, y: 0, size: 106, kind: 'lichen', id: 'lichen' }))
icon('Actinomycete', [4.6, 0, 0], (g) => fungus(g, { x: 1.2, y: 0.9, size: 100, kind: 'actinomycete', id: 'actinomycete' }))

// ---------- Mycorrhiza ----------
// A seedling above a block of soil, its roots below, the tips of the side roots sheathed in a fungal mantle and a net of
// fine hyphae with spores spreading through the soil (the mycelium kind, at the place and scale it was made for). The
// fungus is one lilac (the actinomycete's spores, 305°) for hyphae, spores and mantle alike, as in SiliCoDraw. The
// seedling's own strip of soil lies under the soil block.
const FUNGUS = ACTINO_SPORE
icon('Mycorrhiza', [4.6, 0, 0.2], (g) => {
  const seedling = plant(g, { x: 0, y: -25, size: 60, kind: 'seedling', id: 'seedling' })
  // The soil block: its top a gentle curve over the seedling's strip; a few pebbles in its shadow tone.
  const wS = objW(96 * g.k)
  const soilD = g.D('M-48,-14 C-30,-16.5 30,-16.5 48,-14 L48,43 C48,46 46,48 43,48 L-43,48 C-46,48 -48,46 -48,43 Z')
  const pebble = (x, y, rx, ry) => g.ellipse(x, y, rx, ry, 0, SOIL.shadow)
  const soil = own('soil', g.path(soilD, SOIL.light, SOIL.outline, f(wS)) + [[-30, 30, 2.2, 1.5], [-8, 41, 1.6, 1.1], [30, 3, 2.4, 1.6], [40, 38, 1.8, 1.2], [-40, 6, 1.6, 1.1], [12, -6, 1.6, 1.1]].map((p) => pebble(...p)).join(''), [['soil', SOIL]])
  // The mantle: the outer half of each side root of the roots part (at x 0, y 17, size 84), as a lilac tube.
  const s = 84 / 80, at = ([u, v]) => [u * s, 17 + (v - 21) * s]
  const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]
  const half = (B, t0) => {
    const [A, Bb, C, D] = [0, 2, 4, 6].map((i) => at([B[i], B[i + 1]]))
    const ab = lerp(A, Bb, t0), bc = lerp(Bb, C, t0), cd = lerp(C, D, t0), abc = lerp(ab, bc, t0), bcd = lerp(bc, cd, t0), m = lerp(abc, bcd, t0)
    return `M${P2(g.P(m))} C${P2(g.P(bcd))} ${P2(g.P(cd))} ${P2(g.P(D))}`
  }
  const side = [[0, 8, -10, 12, -24, 18, -38, 30], [0, 12, 10, 16, 24, 22, 38, 34], [0, 22, -8, 26, -16, 34, -22, 44], [0, 26, 8, 30, 16, 38, 22, 45]]
  const mD = side.map((B) => half(B, 0.5)).join(' '), ss = strokeScale(), W = (5.5 * g.k) / ss, wm = objW(96 * g.k) * 0.42 * 0.6 * 1.6
  const stroke = (colour, width) => `<path d="${mD}" fill="none" stroke="${colour}" stroke-width="${f(width)}" stroke-linecap="round" stroke-linejoin="round"/>`
  const mantle = own('mantle', stroke(FUNGUS.outline, W + 2 * wm) + stroke(FUNGUS.base, W), [['mantle', FUNGUS]])
  return join(
    seedling, soil, mantle,
    plant(g, { x: 0, y: 17, size: 84, kind: 'roots', id: 'roots' }),
    fungus(g, { x: 0, y: 18, size: 96, kind: 'mycelium', stem: FUNGUS, spores: FUNGUS, id: 'mycelium' }),
  )
})

check()
console.log('written', OUT)
