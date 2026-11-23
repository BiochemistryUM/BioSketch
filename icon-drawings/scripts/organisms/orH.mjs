// Eight icons of SiliCoDraw's "Organisms" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), the later drawings that replace the first where there are any, redrawn in the soft look
// of icon-drawings/STYLE.md from the shared parts: Fruit fly, Bee, Honeybee queen and worker, Butterfly, Mosquito, Ant,
// Ant queen and worker and Beetle. Compositions are read by hand from the source in its 100 × 100 box centred on 0,0 and
// scaled onto a 512 page (`page` of ../cellkit.mjs); outlines at 60 % (setStrokeScale), gloss on (the part draws the
// insects flat; only their round bodies take the gloss where the part gives it).
// Parts used: insect 'fly', 'bee', 'honeybee' (queen and worker), 'butterfly', 'mosquito', 'ant' (queen and worker) and
// 'beetle' of parts/organisms.mjs, and its tone().
// Drawn here because no part draws it: the egg beside the worker ant (Ant queen and worker), a small pale oval.
// Lettered: nothing (SiliCoDraw writes no labels on these).
// Usage: node orH.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss, smoothD } from '../cellkit.mjs'
import { toLch } from '../colour.mjs'
import { f, setStrokeScale } from '../shapes.mjs'
import { insect, tone } from '../parts/organisms.mjs'
import { objW } from '../parts/lab.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012) are left out of the hue check; a palette used by several parts is listed once.
const icon = (name, [k, cx, cy], draw) => {
  const g = page(k, [cx, cy]), { defs, body, parts } = draw(g)
  const seen = parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base) === i)
  kit.cellType(name, seen, defs, body)
}
const join = (...ps) => ({ defs: ps.map((p) => p.defs ?? '').join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts ?? []) })
/** The page scale that makes an extent of `ext` units 460 px (margins of about 26 px). */
const K = (ext) => 460 / ext

// ---------- the parts as the icons ----------
// Each icon is one part, set at 96 units on the longer side, as SiliCoDraw draws it.
// The page centre is moved a little where the part's drawing is not centred in its box (Bee, Mosquito).
for (const [name, kind, id, cx = 0, cy = 0] of [['Fruit fly', 'fly', 'fruit-fly'], ['Bee', 'bee', 'bee', 0.8], ['Butterfly', 'butterfly', 'butterfly'], ['Mosquito', 'mosquito', 'mosquito', 0, 5.1], ['Ant', 'ant', 'ant'], ['Beetle', 'beetle', 'beetle']])
  icon(name, [K(96), cx, cy], (g) => insect(g, { x: 0, y: 0, size: 96, kind, id }))

// ---------- Honeybee queen and worker ----------
// As SiliCoDraw sets them: the long-bodied queen at the left, a worker smaller and lower at the right, both seen from
// above, head up. One palette, so they recolour together.
icon('Honeybee queen and worker', [K(84), -1.2, -3.2], (g) => join(
  insect(g, { x: -21, y: -4, size: 86, kind: 'honeybee', queen: true, id: 'queen' }),
  insect(g, { x: 25, y: 10, size: 58, kind: 'honeybee', id: 'worker' }),
))

// ---------- Ant queen and worker ----------
// The queen large at the top, a worker small at the lower left, and an egg in front of the worker's mandibles (an
// off-white oval, its hue 55° from the ant's, so it recolours on its own).
const EGG = tone(95, 0.95, 0.035)
icon('Ant queen and worker', [K(96), -1.9, 4], (g) => {
  const w = objW(460)
  const queen = insect(g, { x: -2, y: -14, size: 82, kind: 'ant', queen: true, id: 'queen' })
  const worker = insect(g, { x: -12, y: 30, size: 54, kind: 'ant', id: 'worker' })
  const E = (u, v, rx, ry) => smoothD(Array.from({ length: 16 }, (_, i) => g.P([u + rx * Math.cos((i / 16) * 2 * Math.PI), v + ry * Math.sin((i / 16) * 2 * Math.PI)])))
  const egg = `<g id="egg"><path d="${E(-44, 33, 4.6, 3.3)}" fill="${EGG.base}" stroke="${EGG.outline}" stroke-width="${f(w * 0.8)}"/><path d="${E(-45.2, 31.9, 1.8, 1)}" fill="${EGG.light}"/></g>`
  return join(queen, worker, { body: egg, parts: [['egg', EGG]] })
})

check()
console.log('written', OUT)
