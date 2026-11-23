// Eight icons of SiliCoDraw's "Organisms" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts of the
// category (../parts/organisms.mjs): the fish — Zebrafish, Killifish, Medaka, Rougheye rockfish, and Killifish ephemeral
// pond (the pond of `scene` under the sun, a killifish in its water and three eggs resting in the mud) — and the birds:
// Bird, Chicken and Parrot (macaw) on its perch.
// Drawn here, as no part has them: the killifish eggs in diapause (a glossed round egg with the curled embryo and its eye).
// Colours changed for the hue check of the pond: the fish is a dark slate (as SiliCoDraw draws it there) where the
// killifish part is turquoise, 22° from the water; the mud is a warm dark grey, the black clay of the African pans the
// turquoise killifish lives in, as a brown mud lies within 36° of both the sun and the orange-red fins.
// The current look: outlines at 60 % (setStrokeScale), the gloss on (setGloss: the eggs are glossed).
// Lettered: nothing (SiliCoDraw writes no labels on these).
// Usage: node orD.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss } from '../cellkit.mjs'
import { hueGap, toLch } from '../colour.mjs'
import { f, setStrokeScale, strokeScale } from '../shapes.mjs'
import { EGG_SHELL, bird, fish, scene, tone } from '../parts/organisms.mjs'
import { gloss, glossTones, pathPoints } from '../parts/surfaces.mjs'
import { INK } from '../parts/lab.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT)
// Greys (chroma below 0.012) are left out of the hue check; the same palette used by several parts is listed once.
const icon = (name, [k, cx, cy], draw) => {
  const g = page(k, [cx, cy]), { defs, body, parts } = draw(g)
  const seen = parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base || hueGap(toLch(q.base).h, toLch(p.base).h) < 3) === i)
  kit.cellType(name, seen, defs, body)
}
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join(''), parts: ps.flatMap((p) => p.parts) })

/** A circle as four cubic arcs, in page pixels. */
const circleD = (cx, cy, r) => { const K = 0.5523 * r; return `M${f(cx + r)},${f(cy)} C${f(cx + r)},${f(cy + K)} ${f(cx + K)},${f(cy + r)} ${f(cx)},${f(cy + r)} C${f(cx - K)},${f(cy + r)} ${f(cx - r)},${f(cy + K)} ${f(cx - r)},${f(cy)} C${f(cx - r)},${f(cy - K)} ${f(cx - K)},${f(cy - r)} ${f(cx)},${f(cy - r)} C${f(cx + K)},${f(cy - r)} ${f(cx + r)},${f(cy - K)} ${f(cx + r)},${f(cy)} Z` }
/**
 * A killifish egg in diapause, drawn here (no part has it): a round egg with the gloss of closed round bodies and, inside,
 * the embryo curled round its yolk with its dark eye. `r` the radius in g's units; `turn` turns the embryo (degrees).
 */
function killiEgg(g, { x, y, r, id, turn = 0, pal = EGG_SHELL }) {
  const cx = g.X(x), cy = g.Y(y), R = r * g.k, w = 3.5, T = glossTones(pal), d = circleD(cx, cy, R)
  const G = gloss({ fills: [pathPoints(d)] }, { inset: (w * strokeScale()) / 2 })
  const defs = `<linearGradient id="${id}-gradient" x1="${f(cx - R)}" y1="${f(cy - R)}" x2="${f(cx + R)}" y2="${f(cy + R)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${T.end}"/></linearGradient>`
  let s = `<g id="${id}-egg"><path d="${d}" fill="url(#${id}-gradient)"/>`
  s += ['shade', 'shadow', ...(2 * R >= 90 ? ['lit', 'highlight'] : [])].map((k) => (G[k] ? `<path d="${G[k]}" fill="${T[k]}"/>` : '')).join('')
  s += `<path d="${d}" fill="none" stroke="${pal.outline}" stroke-width="${w}" stroke-linejoin="round"/></g>`
  // The embryo: a band along an arc of 0.5 R from the tail round to the head (a round swelling), and its dark eye.
  const a0 = 130 + turn, a1 = 385 + turn, rr = R * 0.5, pt = (a, k = rr) => [cx + k * Math.cos((a * Math.PI) / 180), cy + k * Math.sin((a * Math.PI) / 180)]
  const arc = Array.from({ length: 13 }, (_, i) => pt(a0 + ((a1 - a0) * i) / 12)).map(([px, py], i) => `${i ? 'L' : 'M'}${f(px)},${f(py)}`).join(' ')
  const bw = (R * 0.26) / strokeScale(), ow = 2.4, head = pt(a1), hr = R * 0.24, eye = pt(a1 + 6, rr * 1.04)
  s += `<g id="${id}-embryo"><path d="${arc}" fill="none" stroke="${pal.outline}" stroke-width="${f(bw + 2 * ow)}" stroke-linecap="round" stroke-linejoin="round"/>`
  s += `<circle cx="${f(head[0])}" cy="${f(head[1])}" r="${f(hr)}" fill="${pal.outline}" stroke="${pal.outline}" stroke-width="${f(2 * ow)}"/>`
  s += `<path d="${arc}" fill="none" stroke="${pal.small}" stroke-width="${f(bw)}" stroke-linecap="round" stroke-linejoin="round"/>`
  s += `<circle cx="${f(head[0])}" cy="${f(head[1])}" r="${f(hr)}" fill="${pal.small}"/><circle cx="${f(eye[0])}" cy="${f(eye[1])}" r="${f(R * 0.13)}" fill="${INK}"/></g>`
  return { defs, body: s, parts: [['eggs', pal]] }
}

// Every animal fills 100 units on its longer side: 460 px of the page, margins about 26; the hen and the macaw are
// moved to sit in the middle of the page (their boxes leave more room on one side).
const at = (fn, kind, o = {}) => (g) => fn(g, { x: 0, y: 0, size: 100, kind, ...o })
icon('Zebrafish', [4.6, 0, 0], at(fish, 'zebrafish'))
icon('Killifish', [4.6, 0, 0], at(fish, 'killifish'))
icon('Medaka', [4.6, 0, 0], at(fish, 'medaka'))
icon('Rougheye rockfish', [4.6, 0, 0], at(fish, 'rockfish'))
icon('Bird', [4.6, 0, 0], at(bird, 'songbird'))
icon('Chicken', [4.6, 0, 2], at(bird, 'chicken'))
icon('Parrot (macaw)', [4.6, 2, 0], at(bird, 'macaw'))

// The pond in SiliCoDraw's units: mud and water from x −48 to 48 and y −12 to 43, the sun at 32, −34 with rays to 15,
// the fish in the water, three eggs in the mud. The whole spans about 96 × 93: 4.8 px a unit.
const SLATE = tone(225, 0.5, 0.011), CLAY = tone(70, 0.5, 0.011)
icon('Killifish ephemeral pond', [4.8, 0, -4], (g) => join(
  scene(g, { x: 0, y: 15.5, size: 96, kind: 'pond', mud: CLAY, id: 'pond' }),
  scene(g, { x: 32, y: -34, size: 32, kind: 'sun', id: 'sun' }),
  fish(g, { x: -1, y: 1.5, size: 38, kind: 'killifish', body: SLATE, id: 'killifish' }),
  ...[[-16, 28, 0], [0, 31, 30], [16, 27, -20]].map(([x, y, turn], i) => killiEgg(g, { x, y, r: 5.5, turn, id: `egg-${i + 1}` })),
))
kit.check()
console.log('written', OUT)
