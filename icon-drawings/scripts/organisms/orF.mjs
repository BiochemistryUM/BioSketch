// Six icons of SiliCoDraw's "Organisms" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), the later drawings that replace the first where there are any, redrawn in the soft look
// of icon-drawings/STYLE.md from the shared parts: Tortoise, Galapagos giant tortoise, Human, Infant, Older person and
// Centenarian. Compositions are read by hand from the source in its 100 × 100 box centred on 0,0 and scaled onto a 512
// page (`page` of ../cellkit.mjs); outlines at 60 % (setStrokeScale), gloss on (none of these is a closed round body: the
// animals and people are flat, the medal is an object and stays flat as lab.mjs's objects do).
// Parts used: reptile 'turtle' and 'tortoise' (with its ground line), human 'adult', 'infant' and 'older' of
// parts/organisms.mjs; lettering of parts/letters.mjs.
// Drawn here because no part draws it: the medal of the Centenarian (a rosette: a gold disc with a raised rim on two red
// ribbon tails), in the palettes of the set.
// Lettered: "100" on the medal, as SiliCoDraw writes it.
// Usage: node orF.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss, smoothD } from '../cellkit.mjs'
import { toLch } from '../colour.mjs'
import { f, setStrokeScale } from '../shapes.mjs'
import { human, reptile, tone } from '../parts/organisms.mjs'
import { lettering, textWidth } from '../parts/letters.mjs'
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
icon('Tortoise', [K(96), 0, 0], (g) => reptile(g, { x: 0, y: 0, size: 96, kind: 'turtle', id: 'turtle' }))
icon('Galapagos giant tortoise', [K(97), 0.7, 0], (g) => reptile(g, { x: 0, y: 0, size: 96, kind: 'tortoise', ground: true, id: 'tortoise' }))
icon('Human', [K(96), 0, 0], (g) => human(g, { x: 0, y: 0, size: 96, kind: 'adult', id: 'human' }))
icon('Infant', [K(96), 0, 0], (g) => human(g, { x: 0, y: 0, size: 96, kind: 'infant', id: 'infant' }))
icon('Older person', [K(96), 0, 0], (g) => human(g, { x: 0, y: 0, size: 96, kind: 'older', id: 'older-person' }))

// ---------- Centenarian ----------
// The older person of the part, smaller and to the left, and at the upper right a medal for a hundred years: a gold disc
// with a raised rim, lettered "100", over two red ribbon tails with notched ends (the gold 38° and the red 37° from the
// skin, so all recolour on their own).
const GOLD = tone(90, 0.85, 0.13), RIBBON = tone(15, 0.64, 0.15)
icon('Centenarian', [K(91), 2.2, 0.9], (g) => {
  const w = objW(460), P2 = (p) => g.P(p).map(f).join(',')
  const path = (d, fill, s = '', sw = 0) => `<path d="${d}" fill="${fill}"${s ? ` stroke="${s}" stroke-width="${f(sw)}" stroke-linejoin="round"` : ''}/>`
  const circ = (u, v, r) => smoothD(Array.from({ length: 16 }, (_, i) => g.P([u + r * Math.cos((i / 16) * 2 * Math.PI), v + r * Math.sin((i / 16) * 2 * Math.PI)])))
  const lin = (id, [x0, y0, x1, y1], a, b) => `<linearGradient id="${id}" x1="${f(g.X(x0))}" y1="${f(g.Y(y0))}" x2="${f(g.X(x1))}" y2="${f(g.Y(y1))}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`
  const person = human(g, { x: -19, y: 5, size: 82, kind: 'older', id: 'older-person' })
  const mx = 29, my = -28, r = 16
  // Ribbon tails, notched at their ends, under the disc.
  const tail = (k) => g.D(`M${mx - k * 4},${my + 4} L${mx - k * 13},${my + 31} L${mx - k * 7.5},${my + 27} L${mx - k * 4},${my + 34} L${mx + k * 5},${my + 8} Z`)
  let s = `<g id="ribbon">${[tail(1), tail(-1)].map((d) => path(d, RIBBON.base, RIBBON.outline, w * 0.8)).join('')}</g>`
  s += `<g id="medal">${path(circ(mx, my, r), 'url(#medal-gradient)', GOLD.outline, w)}${path(circ(mx, my, r * 0.76), 'none', GOLD.small, w * 0.55)}`
  const h = Math.min(r * 0.62, (r * 1.15) / textWidth('100'))
  s += lettering(g, { x: mx, y: my, h, text: '100', colour: GOLD.outline, id: 'medal-letters' }).body + '</g>'
  const defs = lin('medal-gradient', [mx - r, my - r, mx + r, my + r], GOLD.base, GOLD.shadow)
  return join(person, { defs, body: s, parts: [['medal', GOLD], ['ribbon', RIBBON]] })
})

check()
console.log('written', OUT)
