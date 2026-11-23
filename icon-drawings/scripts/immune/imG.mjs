// Eight icons of SiliCoDraw's "Immunology & infection" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David
// Carlsson; see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts of
// the category (../parts/immune.mjs) and of assays and objects: epidemiology and two parasites. Herd immunity,
// Transmission tree, Outbreak map, Quarantine, Social distancing, Fever, Malaria parasite and Helminth.
// Compositions are read by hand from the source (the last definition of each icon) in its 100 × 100 box centred on 0,0
// and scaled onto a 512 page (`page` of ../cellkit.mjs); outlines at 60 % (setStrokeScale), gloss on.
// Parts used: crowd (immune.mjs); person, heatSpot, GRID (assays.mjs); the objects' palettes and objW (lab.mjs); arrow
// (tissue.mjs); redBloodCell3d (surfaces.mjs, face on); lettering ("2 m").
// Drawn here because no part draws them: a folded paper map with land, borders and a pin (`map`, `pin`), a house
// (`house`), a no-entry sign (`noEntry`), a clinical thermometer (`thermometer`) with heat waves, the ring stages of
// Plasmodium (`ringStage`) and a tapeworm (`tapeworm`).
// Usage: node imG.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toLch } from '../colour.mjs'
import { f, setStrokeScale } from '../shapes.mjs'
import { GRID, HEAT, heatSpot, person } from '../parts/assays.mjs'
import { ACCENT, GLASS, INK, LIQUIDS, PAPER, objW } from '../parts/lab.mjs'
import { lettering } from '../parts/letters.mjs'
import { STATUS, crowd } from '../parts/immune.mjs'
import { redBloodCell3d } from '../parts/surfaces.mjs'
import { RED, arrow } from '../parts/tissue.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012: paper, plastic, glass, ink) are left out of the hue check, as the conventions of lab.mjs
// say; the same palette used by several parts is one colour, listed once.
const icon = (name, [k, cx, cy], draw) => {
  const g = page(k, [cx, cy]), { defs, body, parts } = draw(g)
  const seen = parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base) === i)
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
const strokeD = (d, colour, w, cap = 'round', extra = '') => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"${extra}/>`
const fillD = (d, fill, s = '', w = 0) => `<path d="${d}" fill="${fill}"${s ? ` stroke="${s}" stroke-width="${f(w)}" stroke-linejoin="round"` : ''}/>`
const polyline = (g, pts) => `M${pts.map((p) => P2(g.P(p))).join(' L')}`
const polygon = (g, pts) => polyline(g, pts) + ' Z'
/** Fill of an object: a two-stop gradient from 80 px on (lab.mjs convention), its base below. */
const objFill = (g, id, box, pal, defs) => (Math.max(box[2] - box[0], box[3] - box[1]) * g.k >= 80 ? (defs.push(g.grad(id, box, pal)), `url(#${id})`) : pal.base)
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const mixHex = (a, b, t) => '#' + rgb(a).map((v, i) => Math.round(v + (rgb(b)[i] - v) * t).toString(16).padStart(2, '0')).join('').toUpperCase()
/** Cubic Bézier pieces [x0,y0,x1,y1,x2,y2,x3,y3] sampled `per` times each, as one list of points. */
const beziers = (S, per = 12) => {
  const out = []
  S.forEach((Q, k) => { for (let i = k ? 1 : 0; i <= per; i++) { const t = i / per, u = 1 - t; out.push([0, 1].map((c) => u * u * u * Q[c] + 3 * u * u * t * Q[2 + c] + 3 * u * t * t * Q[4 + c] + t * t * t * Q[6 + c])) } })
  return out
}

// ---------- palettes of this batch ----------
const LAND = soft(140) // the land of a map: a soft green, 38° from the yellow centre of a hot spot
const SEA = LIQUIDS.water // the sea: lab's water blue (222)
const ROOF = ACCENT // the roof and door of the house: the one accent blue of objects
const FEVER_RED = deep(25) // the red liquid of a thermometer (lab's LAMP_RED and the red of SERIES)
const HEAT_WAVE = HEAT[1] // heat waves in the orange of a hot spot (65°, 40° from the red)
const GIEMSA = { cytoplasm: deep(250), chromatin: deep(320) } // Giemsa: blue parasite cytoplasm, magenta chromatin
const TAPEWORM = soft(hueOf('#f3e7c6')), PORE = deep(40) // as SiliCoDraw: a cream body (87°), amber-brown pores

// ---------- things no part draws ----------
/** A no-entry sign: a red disc with a white bar across, `size` across (as badge of assays.mjs). Its red is crimson (deep
 * 10, the infected red of immune.mjs), not the signs' red (27), to stay 36° from the skin (52), as tbH's Blinding. */
const STOP = deep(10)
const noEntry = (g, { x, y, size, id = 'no-entry' }) => {
  const R = size / 2, w = objW(size * g.k) * 0.6
  const s = g.circle(x, y, R, STOP.outline, STOP.outline, w) + fillD(rrect(g, x - R * 0.62, y - R * 0.17, x + R * 0.62, y + R * 0.17, R * 0.1), PAPER.light)
  return { defs: '', body: `<g id="${id}">${s}</g>`, parts: [['sign', STOP]] }
}

/** A house front with a pitched roof, a chimney, a window and a door, its walls from x0 to x1 and y0 (eaves) to y1. */
const house = (g, { x0, x1, y0, y1, ridge, id = 'house', win, door }) => {
  const defs = [], w = objW((x1 - x0) * g.k), over = (x1 - x0) * 0.13
  let s = `<g id="${id}-chimney">${fillD(rrect(g, x0 + (x1 - x0) * 0.1, ridge + (y0 - ridge) * 0.12, x0 + (x1 - x0) * 0.25, y0 - 2, 1.2), objFill(g, `${id}-chimney-gradient`, [x0, ridge, x0 + 15, y0], PAPER, defs), PAPER.outline, w)}</g>`
  s += `<g id="${id}-walls">${fillD(rrect(g, x0, y0 - 2, x1, y1, 1.5), objFill(g, `${id}-walls-gradient`, [x0, y0, x1, y1], PAPER, defs), PAPER.outline, w)}</g>`
  const mid = (x0 + x1) / 2
  s += `<g id="${id}-roof">${fillD(polygon(g, [[x0 - over, y0 + 1], [mid, ridge], [x1 + over, y0 + 1]]), objFill(g, `${id}-roof-gradient`, [x0 - over, ridge, x1 + over, y0], ROOF, defs), ROOF.outline, w)}</g>`
  if (door) {
    const [a, b, c, d] = door
    s += `<g id="${id}-door">${fillD(rrect(g, a, b, c, d, 1.5), objFill(g, `${id}-door-gradient`, door, ROOF, defs), ROOF.outline, w * 0.8)}${g.circle(c - (c - a) * 0.25, (b + d) / 2 + 1, (c - a) * 0.08, ROOF.light)}</g>`
  }
  return { defs: defs.join(''), body: `<g id="${id}">${s}</g>`, parts: [['roof and door', ROOF]] }
}

/** A clinical thermometer standing upright, its bulb at the bottom: glass, red liquid, ticks (SiliCoDraw's shape). */
const thermometer = (g, { id = 'thermometer', level = -31 }) => {
  const defs = [], w = objW(80 * g.k) * 0.85
  const glassD = g.D('M-9,19 L-9,-35 C-9,-40 -5,-44 0,-44 C5,-44 9,-40 9,-35 L9,19 C15,22 19,28 18.5,34 C18,42 9,48 0,48 C-9,48 -18,42 -18.5,34 C-19,28 -15,22 -9,19 Z')
  let s = `<g id="${id}-glass">${fillD(glassD, objFill(g, `${id}-gradient`, [-19, -44, 19, 48], GLASS, defs), GLASS.outline, w)}</g>`
  s += `<g id="${id}-liquid">${fillD(rrect(g, -3.8, level, 3.8, 30, 3.8), FEVER_RED.small)}${g.circle(0, 33.5, 10.5, FEVER_RED.small, FEVER_RED.outline, w * 0.6)}${g.ellipse(-3.8, 29.5, 2.6, 1.8, -40, FEVER_RED.light)}</g>`
  s += `<g id="${id}-streak">${strokeD(polyline(g, [[-5.5, -36], [-5.5, 14]]), GLASS.light, Math.max(2, 2.4 * g.k))}</g>`
  s += `<g id="${id}-scale">${strokeD([-34, -24, -14, -4, 6].map((y, i) => polyline(g, [[12, y], [i % 2 ? 16 : 19, y]])).join(' '), INK, Math.max(2, w * 0.6))}</g>`
  return { defs: defs.join(''), body: `<g id="${id}">${s}</g>`, parts: [['liquid', FEVER_RED]] }
}

/** Heat waves: wavy vertical lines rising (SiliCoDraw's s-curves), at the x positions given, between y0 (bottom) and y1. */
const heatWaves = (g, { xs, y0 = -4, y1 = -36, id = 'heat' }) => {
  const one = (x) => { const n = 40, pts = Array.from({ length: n + 1 }, (_, i) => { const t = i / n; return [x + 3.2 * Math.sin(t * Math.PI * 2.2), y0 + (y1 - y0) * t] }); return polyline(g, pts) }
  return own(id, strokeD(xs.map(one).join(' '), HEAT_WAVE.outline, Math.max(3, 2.6 * g.k * 0.6)), [['heat waves', HEAT_WAVE]])
}

/**
 * Ring stages of Plasmodium falciparum as Giemsa shows them: a ring of blue cytoplasm, thicker on one side, with a dot of
 * magenta chromatin (one or two: the "headphone" form); r the ring's radius, `at` the angle of the thick side (degrees,
 * 0 = right, clockwise), dots [[angle, …]] where the chromatin sits on the ring.
 */
const ringStage = (g, { x, y, r, at = 135, dots = [-45], id = 'ring' }) => {
  const C = GIEMSA.cytoplasm, H = GIEMSA.chromatin, px = g.k, band = r * 0.3
  const arc = (a0, a1, rr) => Array.from({ length: 25 }, (_, i) => { const a = ((a0 + ((a1 - a0) * i) / 24) * Math.PI) / 180; return [x + Math.cos(a) * rr, y + Math.sin(a) * rr] })
  let s = g.circle(x, y, r, 'none', C.outline, band * px + 2.4) + g.circle(x, y, r, 'none', C.small, band * px)
  // the thick side: a crescent of cytoplasm on the ring
  // the thick side: the ring swells inwards over 120°, tapering into the ring at both ends
  const swell = Array.from({ length: 31 }, (_, i) => { const u = i / 30, a = ((at - 60 + 120 * u) * Math.PI) / 180, rr = r - band * (0.5 + 0.75 * Math.sin(u * Math.PI)); return [x + Math.cos(a) * rr, y + Math.sin(a) * rr] })
  const thick = [...arc(at - 60, at + 60, r), ...swell.reverse()]
  s += fillD(polygon(g, thick), C.outline) + fillD(polygon(g, thick), C.small, C.small, Math.max(0.1, band * px - 2.4)) + g.circle(x, y, r, 'none', C.small, band * px)
  const dotR = r * 0.36
  s += dots.map((a) => { const t = (a * Math.PI) / 180; return g.circle(x + Math.cos(t) * r, y + Math.sin(t) * r, dotR, H.small, H.outline, 1.6) }).join('')
  return { defs: '', body: `<g id="${id}">${s}</g>`, parts: [['cytoplasm', C], ['chromatin', H]] }
}

/** A tapeworm (SiliCoDraw's): a scolex with suckers and hooks, a thin neck, and proglottids that widen to the end. */
const tapeworm = (g, { id = 'tapeworm' }) => {
  const S = [[-34, -36, -12, -36, 8, -36, 24, -36], [24, -36, 46.7, -36, 46.7, -2, 24, -2], [24, -2, 8, -2, -8, -2, -24, -2], [-24, -2, -46.7, -2, -46.7, 30, -24, 30], [-24, 30, -6, 30, 18, 30, 40, 30]]
  const C = beziers(S), n = C.length, len = [0]
  for (let i = 1; i < n; i++) len.push(len[i - 1] + Math.hypot(C[i][0] - C[i - 1][0], C[i][1] - C[i - 1][1]))
  const W = (i) => 2.8 + 11.6 * Math.pow(i / (n - 1), 0.85)
  const N = [], Lf = [], Rt = []
  C.forEach((p, i) => { const q = C[Math.min(i + 1, n - 1)], r = C[Math.max(i - 1, 0)], dx = q[0] - r[0], dy = q[1] - r[1], l = Math.hypot(dx, dy) || 1, w = W(i) / 2; N.push([-dy / l, dx / l]); Lf.push([p[0] - (dy / l) * w, p[1] + (dx / l) * w]); Rt.unshift([p[0] + (dy / l) * w, p[1] - (dx / l) * w]) })
  // The last proglottid ends square, not in a point: the outline runs across the end.
  const e = C[n - 1], [tx, ty] = [e[0] - C[n - 2][0], e[1] - C[n - 2][1]], tl = Math.hypot(tx, ty)
  const outline = g.smooth([...Lf, [e[0] + (tx / tl) * 1.6, e[1] + (ty / tl) * 1.6], ...Rt])
  const head = g.smooth([[-33, -37.6], [-35.5, -41.5], [-41, -43.5], [-46, -40.5], [-47, -36], [-46, -31.5], [-41, -28.5], [-35.5, -30.5], [-33, -34.4]])
  const defs = [], w = objW(90 * g.k) * 0.8
  defs.push(g.grad(`${id}-gradient`, [-47, -44, 48, 38], TAPEWORM))
  let s = `<g id="${id}-body">${g.union([outline, head], `url(#${id}-gradient)`, TAPEWORM.outline, w / 2)}`
  // proglottids: lines across the body, further apart towards the end; a genital pore on alternate sides
  let seg = '', pores = '', k = 0
  for (let sL = 13; sL < len[n - 1] - 3; sL += 3 + 0.045 * sL) {
    let i = 1
    while (len[i] < sL) i++
    const t = (sL - len[i - 1]) / (len[i] - len[i - 1]), x = C[i - 1][0] + (C[i][0] - C[i - 1][0]) * t, y = C[i - 1][1] + (C[i][1] - C[i - 1][1]) * t, [nx, ny] = N[i], hw = W(i) / 2 - 0.4
    seg += polyline(g, [[x - nx * hw, y - ny * hw], [x + nx * hw, y + ny * hw]]) + ' '
    if (hw > 3.4) {
      const sd = k % 2 ? 1 : -1, st = 3 + 0.045 * sL, dl = Math.hypot(C[i][0] - C[i - 1][0], C[i][1] - C[i - 1][1])
      const px = x + ((C[i][0] - C[i - 1][0]) / dl) * st * 0.5, py = y + ((C[i][1] - C[i - 1][1]) / dl) * st * 0.5
      pores += g.circle(px + sd * nx * (hw - 2), py + sd * ny * (hw - 2), 1.15, PORE.small)
    }
    k++
  }
  s += strokeD(seg, mixHex(TAPEWORM.small, TAPEWORM.outline, 0.4), Math.max(1.6, w * 0.45)) + '</g>'
  s += `<g id="${id}-pores">${pores}</g>`
  s += `<g id="${id}-suckers">${[[-41.2, -39.4], [-41.2, -32.6]].map(([x, y]) => g.circle(x, y, 2.5, TAPEWORM.small, TAPEWORM.outline, w * 0.45)).join('')}</g>`
  s += `<g id="${id}-hooks">${strokeD([[[-47, -39], [-50, -40.8]], [[-47.6, -36], [-51, -36]], [[-47, -33], [-50, -31.2]]].map((p) => polyline(g, p)).join(' '), PORE.outline, Math.max(2, w * 0.5))}</g>`
  return { defs: defs.join(''), body: `<g id="${id}">${s}</g>`, parts: [['body', TAPEWORM], ['pores and hooks', PORE]] }
}

/** A folded paper map in three panels (SiliCoDraw's zigzag), sea between land with dashed borders. */
const map = (g, { id = 'map' }) => {
  const defs = [], w = objW(92 * g.k)
  const panels = [[[-46, -36], [-16, -44], [-16, 32], [-46, 40]], [[-16, -44], [16, -36], [16, 40], [-16, 32]], [[16, -36], [46, -44], [46, 32], [16, 40]]]
  let s = `<g id="${id}-sea">${panels.map((p, i) => fillD(polygon(g, p), i === 1 ? SEA.shadow : SEA.base)).join('')}</g>`
  const landD = g.smooth([[-38, -18], [-24, -28], [-6, -30], [8, -22], [24, -26], [38, -16], [40, 0], [30, 10], [34, 22], [20, 28], [2, 22], [-14, 28], [-30, 22], [-36, 6]])
  s += `<g id="${id}-land">${fillD(landD, LAND.base, LAND.outline, w * 0.55)}`
  s += strokeD(g.D('M-6,-30 C-3,-12 -10,6 -14,28 M-8,-2 C6,0 20,6 30,10'), LAND.outline, Math.max(1.6, w * 0.4), 'round', ` stroke-dasharray="${f(2.4 * g.k)} ${f(2 * g.k)}"`) + '</g>'
  // the folds: the middle panel lies in shadow, its edges are creases
  s += `<g id="${id}-folds">${strokeD(polyline(g, [[-16, -44], [-16, 32]]) + ' ' + polyline(g, [[16, -36], [16, 40]]), SEA.outline, w * 0.5)}</g>`
  s += `<g id="${id}-edge">${fillD(polygon(g, [[-46, -36], [-16, -44], [16, -36], [46, -44], [46, 32], [16, 40], [-16, 32], [-46, 40]]), 'none', SEA.outline, w)}</g>`
  return { defs: defs.join(''), body: `<g id="${id}">${s}</g>`, parts: [['sea', SEA], ['land', LAND]] }
}
/** A map pin, its point at x, y, `size` tall, in `pal` (the red of hot spots), with a white hole. */
const pin = (g, { x, y, size, pal = HEAT[0], id = 'pin' }) => {
  const r = size * 0.36, cy = y - size + r, defs = [], w = objW(size * g.k) * 0.8
  const d = g.D(`M${x},${y} C${x - r * 0.35},${y - size * 0.3} ${x - r},${cy + r * 0.75} ${x - r},${cy} C${x - r},${cy - r * 0.56} ${x - r * 0.56},${cy - r} ${x},${cy - r} C${x + r * 0.56},${cy - r} ${x + r},${cy - r * 0.56} ${x + r},${cy} C${x + r},${cy + r * 0.75} ${x + r * 0.35},${y - size * 0.3} ${x},${y} Z`)
  const s = fillD(d, objFill(g, `${id}-gradient`, [x - r, y - size, x + r, y], pal, defs), pal.outline, w) + g.circle(x, cy, r * 0.4, PAPER.light, pal.outline, w * 0.5)
  return { defs: defs.join(''), body: `<g id="${id}">${s}</g>`, parts: [['pin', pal]] }
}

// ---------- the icons ----------
// Herd immunity: a crowd mostly immune (green), two still susceptible (blue) and one infected person (red) in the middle,
// held in a dashed ring: surrounded by immune people, the infection goes no further.
icon('Herd immunity', [5.35, 0, 0], (g) => {
  const gap = 0.1, size = 100, s = size / 100, cw = 100 / (4 + 0.5 + 3 * gap), step = cw * (1 + gap), rh = cw * 1.15
  const shift = (step / 4) * s // the middle row holds three people: centre the crowd on its outer rows
  const ix = (-50 + cw / 2 + step * 1.5) * s + shift, iy = 0.03 * cw * s
  const R = cw * 0.8 * s
  const ring = own('contained', g.circle(ix, iy, R, STATUS.infected.light, STATUS.infected.small, Math.max(2.4, 0.9 * g.k)).replace('/>', ` stroke-dasharray="${f(3.2 * g.k)} ${f(2.4 * g.k)}"/>`), [['ring', STATUS.infected]])
  return join(ring, crowd(g, { x: shift, y: 0, size, cols: 4, status: 'rrsr rir. srrr', gap, id: 'crowd' }))
})

// Transmission tree: an index case (red) infects three contacts, who pass it on to four of their six own contacts; the two
// that escape (blue) are reached by dashed grey arrows. People instead of SiliCoDraw's dots, as the crowd's convention.
icon('Transmission tree', [4.55, -6, 0.5], (g) => {
  const I = STATUS.infected, S = STATUS.susceptible
  const g1 = [-29, 0, 29], g2 = [[-40, 1, -29], [-24, 0, -29], [-8, 1, 0], [8, 1, 0], [24, 0, 29], [40, 1, 29]]
  const halo = own('index-halo', g.circle(-36, 1, 21, I.light), [['index', I]])
  const edges = []
  const edge = (from, to, live, id) => {
    const m = (from[0] + to[0]) / 2, curve = beziers([[...from, m, from[1], m, to[1], ...to]], 24)
    const a = arrow(g, { points: curve, corners: true, colour: live ? INK : GRID, w: Math.max(2.6, 1.1 * g.k), id })
    if (!live) a.body = a.body.replace('fill="none"', `fill="none" stroke-dasharray="${f(2.6 * g.k)} ${f(2.2 * g.k)}"`)
    edges.push(a)
  }
  g1.forEach((y, i) => edge([-22, y * 0.3], [-5.5, y], true, `infects-contact${i + 1}`))
  g2.forEach(([y, inf, py], i) => edge([9.5, py + Math.sign(y - py) * 3.5], [31.5, y], inf, `${inf ? 'infects' : 'spares'}-second-contact${i + 1}`))
  const people = [
    person(g, { x: -36, y: 1, size: 32, pal: I, id: 'index-case' }),
    ...g1.map((y, i) => person(g, { x: 2, y: y + 0.5, size: 19, pal: I, id: `contact${i + 1}` })),
    ...g2.map(([y, inf], i) => person(g, { x: 38, y: y + 0.3, size: 14.5, pal: inf ? I : S, id: `second-contact${i + 1}` })),
  ]
  return join(halo, ...edges, ...people)
})

// Outbreak map: a folded paper map; three hot spots of cases (red to yellow) with a few single cases about them, a pin on
// the largest.
icon('Outbreak map', [5.0, 0, -2], (g) => {
  const spots = [[-22, -6, 24], [18, 6, 18], [4, 22, 12]]
  const heat = spots.map(([x, y, d], i) => heatSpot(g, { x, y, size: d, id: `hot-spot${i + 1}` }))
  const cases = own('single-cases', [[-30, 12], [26, -14], [10, -14], [-6, 12], [28, 20]].map(([x, y]) => g.circle(x, y, 1.9, HEAT[0].small)).join(''), [['cases', HEAT[0]]])
  return join(map(g, {}), ...heat, cases, pin(g, { x: -22, y: -6, size: 25 }))
})

// Quarantine: a person (grey, isolated) at the window of a house, the door shut, a red no-entry sign beside the roof.
icon('Quarantine', [4.85, -0.6, 0], (g) => {
  const H = house(g, { x0: -38, x1: 24, y0: -6, y1: 40, ridge: -40, door: [3, 14, 16, 40] })
  const glass = own('window', fillD(rrect(g, -32, 2, -12, 21, 1.5), GLASS.base), [])
  const resident = person(g, { x: -22, y: 12.6, size: 15.5, pal: STATUS.isolated, id: 'resident' })
  const frame = own('window-frame', fillD(rrect(g, -32, 2, -12, 21, 1.5), 'none', PAPER.outline, objW(62 * g.k) * 0.9) + strokeD(polyline(g, [[-32, 21], [-12, 21]]), PAPER.outline, objW(62 * g.k) * 1.2), [])
  const ground = own('ground', strokeD(polyline(g, [[-47, 40.5], [43, 40.5]]), INK, objW(80 * g.k)), [])
  return join(H, glass, resident, frame, ground, noEntry(g, { x: 33, y: -29, size: 26 }))
})

// Social distancing: two people kept apart, a measured distance of 2 m between them (lettered, as SiliCoDraw writes it).
icon('Social distancing', [4.8, 0, 0], (g) => {
  const a = person(g, { x: -27, y: -12, size: 58, id: 'person1' }), b = person(g, { x: 27, y: -12, size: 58, id: 'person2' })
  const dim = arrow(g, { points: [[-38, 34], [38, 34]], start: 'head', end: 'head', colour: INK, w: Math.max(3, 1.15 * g.k), id: 'distance' })
  const ticks = own('distance-ends', strokeD(polyline(g, [[-41, 27.5], [-41, 40.5]]) + ' ' + polyline(g, [[41, 27.5], [41, 40.5]]), INK, Math.max(3, 1.15 * g.k)), [])
  const label = own('distance-label', lettering(g, { x: 0, y: 24.5, h: 9, text: '2 m', colour: INK, id: 'two-metres' }).body, [])
  return join(a, b, dim, ticks, label)
})

// Fever: a clinical thermometer with its red column high, heat waves rising on both sides.
icon('Fever', [4.9, 0, 2], (g) => join(heatWaves(g, { xs: [-37, -26, 28, 39] }), thermometer(g, { level: -38 })))

// Malaria parasite: a red blood cell face on with two ring stages of P. falciparum (one with two chromatin dots), and
// Maurer's clefts as small dots near the rim. The cell is the approved Red blood cell (3D, face on); the parasite in
// Giemsa's colours (blue cytoplasm, magenta chromatin) instead of SiliCoDraw's single blue.
icon('Malaria parasite', [4.9, 0, 0], (g) => {
  const cell = redBloodCell3d(g, { x: 0, y: 0, size: 93, view: 'face', id: 'red-blood-cell' })
  const r1 = ringStage(g, { x: 10, y: -8, r: 11, at: 140, dots: [-55], id: 'ring1' })
  const r2 = ringStage(g, { x: -17, y: 14, r: 7.5, at: 70, dots: [-120, -60], id: 'ring2' })
  const clefts = own('maurers-clefts', [[-33, -12], [-34, 6], [-26, 25], [-8, 32], [18, 30], [33, 15], [35, -10], [24, -28], [-14, -31]].map(([x, y]) => g.circle(x, y, 1.7, GIEMSA.chromatin.small)).join(''), [])
  return join(cell, clefts, r1, r2)
})

// Helminth: a tapeworm, its scolex with suckers and hooks at the top left, the strobila of proglottids widening along an
// S to the end, genital pores on alternate sides.
icon('Helminth', [4.75, -2.2, -3], (g) => tapeworm(g, {}))

check()
console.log('written')
