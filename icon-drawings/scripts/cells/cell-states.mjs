// The general states of a cell, drawn on the generic Cell (pale blue, the lilac nucleus NUC; ../silicodraw.mjs and the
// `cell` part of ../parts/tissue.mjs): apoptotic, necrotic, senescent, migrating, dividing, infected, marker-positive
// and hypoxic. BioSketch's own drawings in the soft look of icon-drawings/STYLE.md; no SiliCoDraw original. They agree
// with the drafted process icons (Apoptosis, Necrosis, Cell migration, Cell division, Virus, Hypoxia, Mitotic spindle in
// ct02–ct06) and the approved Senescent cell, but each is the one generic cell in that state.
//
// Every state is a function `state(g, { x, y, size, id, pal, nucPal })` → { defs, body, parts }, in the form of the
// shared parts: `size` is the longer extent of the healthy cell it stands for (outline included) in g's units, `pal` the
// cytoplasm's palette (CELL by default) and `nucPal` the nucleus's (NUC), so that the same state can be put on any round
// cell type later. Each draws in a frame of its own in which the healthy cell is 92 units wide (46 × 40, as Cell);
// outlines follow the size on the page (`cellW`, `nucW` of ../parts/tissue.mjs). What a state adds has its own hue,
// at least 36° from the cytoplasm and the nucleus, so that it recolours on its own.
// Usage: node cell-states.mjs <folder>
import { pathToFileURL } from 'node:url'
import { NUC, cellTypes, page } from '../cellkit.mjs'
import { deep, soft, toHex, toLch } from '../colour.mjs'
import { f, gradient2, pathOf, simplify, smax, smin, trace } from '../shapes.mjs'
import { nucleus } from '../parts/organelles.mjs'
import { oxygen } from '../parts/molecules.mjs'
import { CELL, arrow, cellW, nucW } from '../parts/tissue.mjs'

// ---------- colours of what the states add (OKLCH hues; the cytoplasm is 245°, the nucleus 319°) ----------
const LYSOSOME = soft(355) // the lysosome part's rose: 36.5° from the nucleus, 110° from the cytoplasm
const VIRUS = deep(12) // virus capsids and spikes: a clear rose-red, 53° from the nucleus (the drafted Virus is lilac, the nucleus's hue)
const MARKER = deep(70) // surface markers: amber-gold (the B cell's receptors are amber)
const HIF = deep(75) // HIF-1α: the amber of a free protein (Conventions: proteins amber, 75°)
const SPINDLE = soft(158) // spindle fibres: green, as Mitotic spindle (ct06)
// The cue of motion is a true grey (chroma under 0.012), so that it never recolours with a part.
const MOTION = toHex({ l: 0.62, c: 0.004, h: 255 })

// ---------- helpers ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const rad = (d) => (d * Math.PI) / 180
const hueOfPal = (pal) => toLch(pal.base).h
/**
 * The frame of a state: units in which the healthy cell is 92 wide, centred on x, y of g. L gives page pixels, U is the
 * size of a unit in pixels; `w` the cell's outline in pixels.
 */
const frameOf = (g, x, y, size) => {
  const px = size * g.k, w = +cellW(px), U = (px - w) / 92, cx = g.X(x), cy = g.Y(y)
  return { px, w, U, cx, cy, L: (u, v) => [cx + u * U, cy + v * U], G: (u, v) => [x + (u * U) / g.k, y + (v * U) / g.k], S: (n) => (n * U) / g.k }
}
const stroke = (s, w) => (s ? ` stroke="${s}" stroke-width="${f(w)}" stroke-linejoin="round"` : '')
/** The same for a traced outline, which runs a little past its start: round ends, or Safari's engine leaves a nick. */
const strokeT = (s, w) => `${stroke(s, w)} stroke-linecap="round"`
const circle = (F, u, v, r, fill, s = '', w = 0) => { const [X, Y] = F.L(u, v); return `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(r * F.U)}" fill="${fill}"${stroke(s, w)}/>` }
const ellipse = (F, u, v, rx, ry, rot, fill, s = '', w = 0) => { const [X, Y] = F.L(u, v); return `<ellipse cx="${f(X)}" cy="${f(Y)}" rx="${f(rx * F.U)}" ry="${f(ry * F.U)}"${rot ? ` transform="rotate(${f(rot)} ${f(X)} ${f(Y)})"` : ''} fill="${fill}"${stroke(s, w)}/>` }
const line = (F, pts, colour, w, cap = 'round') => `<path d="M${pts.map(([u, v]) => F.L(u, v).map(f).join(',')).join(' L')}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
const polyD = (F, pts) => `M${pts.map(([u, v]) => F.L(u, v).map(f).join(',')).join(' L')}Z`
/** A highlight at u, v (radii in pixels), as cellkit's. */
const hl = (F, u, v, rx, ry, rot, fill) => ellipse(F, u, v, rx / F.U, ry / F.U, rot, fill)
const grad = (F, id, [u0, v0, u1, v1], pal) => gradient2(id, [...F.L(u0, v0), ...F.L(u1, v1)], pal.base, pal.shadow)
/** One gradient that lights every shape that uses it from its own top left. */
const boxGrad = (id, pal) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`

// Distance fields in units (below zero inside), traced into outlines on the page.
const circleF = (cx, cy, r) => (u, v) => Math.hypot(u - cx, v - cy) - r
const ellipseF = (cx, cy, rx, ry) => (u, v) => {
  const a = (u - cx) / rx, b = (v - cy) / ry, k0 = Math.hypot(a, b), k1 = Math.hypot(a / rx, b / ry)
  return k1 ? (k0 * (k0 - 1)) / k1 : -Math.min(rx, ry)
}
/** A tube from a to b whose radius goes from ra to rb. */
const taperF = ([ax, ay], [bx, by], ra, rb) => (u, v) => {
  const dx = bx - ax, dy = by - ay, t = clamp(((u - ax) * dx + (v - ay) * dy) / (dx * dx + dy * dy), 0, 1)
  return Math.hypot(u - ax - t * dx, v - ay - t * dy) - (ra + (rb - ra) * t)
}
const unionF = (k, ...fs) => (u, v) => fs.slice(1).reduce((d, fn) => smin(d, fn(u, v), k), fs[0](u, v))
/** The outlines of a field in units: closed paths on the page, largest first. */
const traced = (F, field) => trace((i, j) => field((i - F.cx) / F.U, (j - F.cy) / F.U) * F.U).map((loop) => pathOf(simplify(loop, 0.15)))
/** A point on the ellipse rx, ry at angle a (degrees, clockwise from +x) and the outward normal there. */
const onEllipse = (cx, cy, rx, ry, a) => {
  const t = rad(a), p = [cx + rx * Math.cos(t), cy + ry * Math.sin(t)], n = [Math.cos(t) / rx, Math.sin(t) / ry], L = Math.hypot(...n)
  return { p, n: [n[0] / L, n[1] / L] }
}

/** The cytoplasm of a hypoxic cell: the cell's own hue, darker and nearly grey (chroma kept above the 0.012 of greys). */
export const hypoxicPal = (pal) => {
  const h = hueOfPal(pal)
  return { light: toHex({ l: 0.95, c: 0.014, h }), base: toHex({ l: 0.87, c: 0.022, h }), shadow: toHex({ l: 0.79, c: 0.03, h }), small: toHex({ l: 0.72, c: 0.036, h }), outline: toHex({ l: 0.55, c: 0.05, h }) }
}

// =====================================================================================================================
// Apoptotic: the cell shrunken to two thirds, its membrane blistered into round blebs, the nucleus condensed and broken
// into dense round pieces (pyknosis and karyorrhexis), one apoptotic body pinching off on a narrow neck and one already
// free, each holding a piece of the nucleus. Cytoplasm and nucleus keep their colours, the pieces in the nucleus's
// deeper tones.
// Example: apoptotic(g, { x: 0, y: 0, size: 90 })
export function apoptotic(g, { x, y, size, id = 'apoptotic', pal = CELL, nucPal = NUC }) {
  const F = frameOf(g, x, y, size), w = F.w, nw = +nucW(F.px * 0.2)
  const body = [-6, -2], R = [30, 27]
  // Blebs: small round blisters standing half out of the membrane, more on one side, as they come and go.
  const blebs = [[-145, 7.5], [-98, 8], [-50, 6.5], [-5, 7], [92, 7.5], [140, 8], [190, 7]].map(([a, r]) => { const { p, n } = onEllipse(...body, ...R, a); return circleF(p[0] + n[0] * r * 0.15, p[1] + n[1] * r * 0.15, r) })
  // The budding body sits on a narrow neck at the lower right; the free one at the upper right.
  const bud = onEllipse(...body, ...R, 38), budC = [bud.p[0] + bud.n[0] * 11.5, bud.p[1] + bud.n[1] * 11.5], budR = 9
  const neck = taperF(bud.p, budC, 3.2, 3.2)
  const free = [32, -30], freeR = 8.5
  const field = unionF(5, ellipseF(...body, ...R), ...blebs)
  const cellField = (u, v) => Math.min(smin(smin(field(u, v), neck(u, v), 2), circleF(...budC, budR)(u, v), 2), circleF(...free, freeR)(u, v))
  const paths = traced(F, (u, v) => cellField(u, v) + w / 2 / F.U)
  const frag = (u, v, r) => circle(F, u, v, r, `url(#${id}-fragment-gradient)`, nucPal.outline, nw)
  const defs = grad(F, `${id}-gradient`, [-46, -40, 46, 40], pal) + boxGrad(`${id}-fragment-gradient`, { base: nucPal.shadow, shadow: nucPal.small })
  const out =
    `<g id="${id}-cytoplasm">${paths.map((d) => `<path d="${d}" fill="url(#${id}-gradient)"${strokeT(pal.outline, w)}/>`).join('')}` +
    `${hl(F, -22, -17, F.U * 6, F.U * 2.2, -42, pal.light)}</g>` +
    `<g id="${id}-nucleus">${frag(-8, -3, 9)}${frag(5, -9, 5)}${frag(4, 6, 5.5)}${frag(-17, 9, 4.2)}` +
    `${frag(budC[0] + 0.5, budC[1] + 0.5, 3.8)}${frag(free[0] + 0.5, free[1] + 0.5, 3.6)}</g>`
  return { defs, body: `<g id="${id}">${out}</g>`, parts: [['cytoplasm', pal], ['nucleus', nucPal]] }
}

// =====================================================================================================================
// Necrotic: the cell swollen and round, its membrane broken in two places with the ends turned out and the contents
// (cytoplasm, small granules) spilling through the gaps, swollen vacuoles inside, the nucleus pale and fading
// (karyolysis: the palest lilac, a dashed envelope).
// Example: necrotic(g, { x: 0, y: 0, size: 90 })
export function necrotic(g, { x, y, size, id = 'necrotic', pal = CELL, nucPal = NUC }) {
  const F = frameOf(g, x, y, size), w = F.w, nw = +nucW(F.px * 0.35)
  const c = [-4, 0], rx = 42, ry = 40
  const gaps = [[-28, 19], [28, 21]] // centre and width of each break, degrees
  // The membrane between the breaks, sampled every 2°, each end turned out a little.
  const arcs = []
  for (let i = 0; i < gaps.length; i++) {
    const a0 = gaps[i][0] + gaps[i][1] / 2, a1 = gaps[(i + 1) % gaps.length][0] - gaps[(i + 1) % gaps.length][1] / 2 + (i === gaps.length - 1 ? 360 : 0)
    const pts = []
    for (let a = a0; a <= a1 + 0.01; a += 2) pts.push(onEllipse(...c, rx, ry, a).p)
    const end = (a, dir) => { const { p, n } = onEllipse(...c, rx, ry, a); const t = [-n[1] * dir, n[0] * dir]; return [p[0] + n[0] * 5 + t[0] * 2.5, p[1] + n[1] * 5 + t[1] * 2.5] }
    arcs.push([end(a0, -1), ...pts, end(a1, 1)])
  }
  // What spills out of each break: a bulge of cytoplasm with no membrane, then granules that thin out.
  const spill = gaps.map(([a], i) => {
    const { p, n } = onEllipse(...c, rx, ry, a), t = [-n[1], n[0]]
    const at = (d, s) => [p[0] + n[0] * d + t[0] * s, p[1] + n[1] * d + t[1] * s]
    const bulge = ellipse(F, ...at(1.5, 0), 7, 6, (Math.atan2(n[1], n[0]) * 180) / Math.PI, pal.base)
    const dots = [[4, -3, 2.6], [9, 2.5, 3], [7, -6.5, 2], [14, -2, 2.4], [17, 5, 1.9], [21, -5, 1.6]].map(([d, s, r]) => circle(F, ...at(d, s * (i ? -1 : 1)), r, pal.small))
    return bulge + dots.join('')
  })
  const [nx, ny] = F.L(-14, -3), nr = (F.S(36) * g.k - nw) / 2
  const faded = `<g id="${id}-nucleus"><circle cx="${f(nx)}" cy="${f(ny)}" r="${f(nr)}" fill="${nucPal.light}" stroke="${nucPal.small}" stroke-width="${f(nw)}" stroke-linecap="round" stroke-dasharray="${f(nr * 0.42)} ${f(nr * 0.36)}"/></g>`
  const vacuoles = [[18, -17, 5.5], [14, 20, 6.5], [-26, 22, 4.5]].map(([u, v, r]) => circle(F, u, v, r, pal.light, pal.small, Math.max(3.5, w * 0.42)))
  const defs = grad(F, `${id}-gradient`, [c[0] - rx, c[1] - ry, c[0] + rx, c[1] + ry], pal)
  const out =
    `<g id="${id}-cytoplasm">${ellipse(F, ...c, rx, ry, 0, `url(#${id}-gradient)`)}${spill.join('')}` +
    `${arcs.map((pts) => line(F, pts, pal.outline, w)).join('')}${hl(F, -31, -24, F.U * 6.5, F.U * 2.5, -40, pal.light)}` +
    `${vacuoles.join('')}</g>` + faded
  return { defs, body: `<g id="${id}">${out}</g>`, parts: [['cytoplasm', pal], ['nucleus', nucPal]] }
}

// =====================================================================================================================
// Senescent: the cell flattened and enlarged with an irregular outline, a large nucleus with a nucleolus, and the
// cytoplasm full of lysosomes (granules of the lysosome part's rose; senescence-associated β-galactosidase is a
// lysosomal enzyme). The approved Senescent cell has the same outline and blue granules; blue would be the generic
// cell's own hue, so they are rose here. Option lysosomePal.
// Example: senescent(g, { x: 0, y: 0, size: 96 })
export function senescent(g, { x, y, size, id = 'senescent', pal = CELL, nucPal = NUC, lysosomePal = LYSOSOME }) {
  const F = frameOf(g, x, y, size), w = F.w
  const outline = [[-46, -6], [-38, -20], [-22, -27], [-6, -27], [10, -31], [28, -26], [41, -15], [46, 2], [42, 15], [28, 25], [10, 27], [-6, 30], [-24, 27], [-38, 18]]
  const [nx, ny] = F.G(-3, -1)
  const nuc = nucleus(g, { x: nx, y: ny, size: F.S(41), id: `${id}-nucleus`, pal: nucPal, nucleolus: true, w: +nucW(F.px * 0.45) })
  const gran = [[-34, -4, 3.4], [-28, 10, 2.8], [-20, -17, 3], [27, -16, 3.6], [34, 2, 3], [24, 15, 3.4], [10, -22, 2.6], [-8, 21, 3.2], [-35, 16, 2.4], [36, -10, 2.4], [8, 19, 2.4]]
  const defs = grad(F, `${id}-gradient`, [-46, -30, 46, 29], pal) + nuc.defs
  const smooth = (pts) => { const P = pts.map(([u, v]) => F.L(u, v)), n = P.length; let d = `M${f(P[0][0])},${f(P[0][1])}`; for (let i = 0; i < n; i++) { const a = P[(i - 1 + n) % n], b = P[i], c = P[(i + 1) % n], e = P[(i + 2) % n]; d += `C${f(b[0] + (c[0] - a[0]) / 6)},${f(b[1] + (c[1] - a[1]) / 6)} ${f(c[0] - (e[0] - b[0]) / 6)},${f(c[1] - (e[1] - b[1]) / 6)} ${f(c[0])},${f(c[1])}` } return d + 'Z' }
  const out =
    `<g id="${id}-cytoplasm"><path d="${smooth(outline)}" fill="url(#${id}-gradient)"${strokeT(pal.outline, w)}/>${hl(F, -30, -16, F.U * 6, F.U * 2, -22, pal.light)}</g>` +
    nuc.body + `<g id="${id}-lysosomes">${gran.map(([u, v, r]) => circle(F, u, v, r, lysosomePal.small)).join('')}</g>`
  return { defs, body: `<g id="${id}">${out}</g>`, parts: [['cytoplasm', pal], ['nucleus', nucPal], ['lysosomes', lysosomePal]] }
}

// =====================================================================================================================
// Migrating: the cell moving to the right. A broad lamellipodium at the front (a pale band along the leading edge,
// fine actin bundles running into it), the body behind it, the nucleus towards the rear, a narrow trailing tail, and
// three short grey lines behind the tail as the cue of motion. Option cue (the lines; true).
// Example: migrating(g, { x: 0, y: 0, size: 90 })
export function migrating(g, { x, y, size, id = 'migrating', pal = CELL, nucPal = NUC, cue = true }) {
  const F = frameOf(g, x, y, size), w = F.w
  // A teardrop: the body, a broad fan ahead of it whose edge is one wide arc, and a tail tapering behind.
  const bodyF = ellipseF(-4, 0, 26, 21)
  const fan = (u, v) => smax(ellipseF(10, 0, 32, 31)(u, v), -2 - u, 10)
  const tail = taperF([-22, 1], [-46, 4], 10, 2.6)
  const cellF = unionF(10, bodyF, fan, tail)
  const inner = (u, v) => cellF(u, v) + w / 2 / F.U
  const [cellD] = traced(F, inner)
  // The lamellipodium: a band along the leading edge, 9 units deep, ahead of u = 16.
  const bandF = (u, v) => Math.max(inner(u, v), -ellipseF(1, 0, 30, 28.5)(u, v), -2 - u)
  const bands = traced(F, bandF)
  const [nx, ny] = F.G(-14, -1)
  const nuc = nucleus(g, { x: nx, y: ny, size: F.S(27), id: `${id}-nucleus`, pal: nucPal, w: +nucW(F.px * 0.3) })
  // Bundles of actin running into the lamellipodium, as short lines towards the edge.
  const actin = [-48, -24, 0, 24, 48].map((deg) => { const a = rad(deg); return line(F, [[10 + 20 * Math.cos(a), 20 * Math.sin(a)], [10 + 27.5 * Math.cos(a), 27.5 * Math.sin(a)]], pal.small, Math.max(3, w * 0.36)) })
  const cueLines = cue ? `<g id="${id}-motion">${[[-12, -48, -36], [12, -48, -36], [0, -58, -50]].map(([v, u0, u1]) => line(F, [[u0, v], [u1, v]], MOTION, Math.max(4, w * 0.6))).join('')}</g>` : ''
  const defs = grad(F, `${id}-gradient`, [-46, -32, 44, 32], pal) + nuc.defs
  const out =
    cueLines +
    `<g id="${id}-cytoplasm"><path d="${cellD}" fill="url(#${id}-gradient)"/>` +
    `<g id="${id}-lamellipodium">${bands.map((d) => `<path d="${d}" fill="${pal.light}"/>`).join('')}${actin.join('')}</g>` +
    `<path d="${cellD}" fill="none"${strokeT(pal.outline, w)}/>${hl(F, 8, -22, F.U * 5.5, F.U * 1.9, -25, pal.light)}</g>` +
    nuc.body
  return { defs, body: `<g id="${id}">${out}</g>`, parts: [['cytoplasm', pal], ['nucleus', nucPal]] }
}

// =====================================================================================================================
// Dividing: the cell rounded up and pinched in the middle by the cleavage furrow (late anaphase to telophase), a set of
// condensed chromosomes at each pole, the remains of the spindle between them (green, as Mitotic spindle).
// Options: spindlePal, spindle (true).
// Example: dividing(g, { x: 0, y: 0, size: 90 })
export function dividing(g, { x, y, size, id = 'dividing', pal = CELL, nucPal = NUC, spindlePal = SPINDLE, spindle = true }) {
  const F = frameOf(g, x, y, size), w = F.w
  const cellF = unionF(11, circleF(-18.5, 0, 27.5), circleF(18.5, 0, 27.5))
  const [cellD] = traced(F, (u, v) => cellF(u, v) + w / 2 / F.U)
  const cw = Math.max(3.5, w * 0.42), rodW = 5.4 * F.U
  // Chromosomes as short, thick rounded rods fanned towards their pole (as the chromosomes of Mitotic spindle): an
  // outline in the nucleus's outline tone, filled with its shadow tone.
  const rods = (s) => [-33, -11, 11, 33].map((deg) => {
    const a = rad(deg), pole = [s * 37, 0], d0 = 9.5, d1 = 16
    const p0 = [pole[0] - s * d0 * Math.cos(a), d0 * Math.sin(a) * 1.15], p1 = [pole[0] - s * d1 * Math.cos(a), d1 * Math.sin(a) * 1.15]
    return line(F, [p0, p1], nucPal.outline, rodW) + line(F, [p0, p1], nucPal.small, rodW - 2 * cw)
  }).join('')
  const ink = toHex({ l: 0.68, c: 0.095, h: hueOfPal(spindlePal) })
  const fibres = spindle ? [-6, 0, 6].map((v) => line(F, [[-18, v * 1.2], [-7, v * 0.6], [7, v * 0.6], [18, v * 1.2]], ink, Math.max(2.5, w * 0.32))).join('') : ''
  const defs = grad(F, `${id}-gradient`, [-46, -27, 46, 27], pal)
  const out =
    `<g id="${id}-cytoplasm"><path d="${cellD}" fill="url(#${id}-gradient)"${strokeT(pal.outline, w)}/>` +
    `${[-1, 1].map((s) => hl(F, s * 19.5 - 13, -15, F.U * 4.6, F.U * 1.7, -40, pal.light)).join('')}</g>` +
    (spindle ? `<g id="${id}-spindle">${fibres}</g>` : '') +
    `<g id="${id}-chromosomes">${rods(-1)}${rods(1)}</g>`
  const parts = [['cytoplasm', pal], ['chromosomes', nucPal]]
  if (spindle) parts.push(['spindle', spindlePal])
  return { defs, body: `<g id="${id}">${out}</g>`, parts }
}

// =====================================================================================================================
// Infected: virus particles inside the cytoplasm (capsids, drawn as hexagons for their icosahedral shell), one
// budding at the membrane with the cell's membrane wrapped round it and its spikes standing out, and one just released,
// enveloped in the cell's membrane. The virus is rose-red: the drafted Virus is lilac, the hue of the nucleus.
// Option virusPal.
// Example: infected(g, { x: 0, y: 0, size: 82 })
export function infected(g, { x, y, size, id = 'infected', pal = CELL, nucPal = NUC, virusPal = VIRUS }) {
  const F = frameOf(g, x, y, size), w = F.w, vw = Math.max(3.5, w * 0.4)
  const cellE = [0, 0, 46, 40]
  const budA = -42, bud = onEllipse(...cellE, budA), budC = [bud.p[0] + bud.n[0] * 7.5, bud.p[1] + bud.n[1] * 7.5], budR = 9
  const cellF = unionF(5, ellipseF(...cellE), circleF(...budC, budR))
  const [cellD] = traced(F, (u, v) => cellF(u, v) + w / 2 / F.U)
  const free = [bud.p[0] + bud.n[0] * 36, bud.p[1] + bud.n[1] * 36], freeR = 8.5
  const hex = (u, v, r, turn = 0) => `<path d="${polyD(F, Array.from({ length: 6 }, (_, i) => { const a = rad(turn + i * 60); return [u + r * Math.cos(a), v + r * Math.sin(a)] }))}" fill="${virusPal.small}"${stroke(virusPal.outline, vw)}/>`
  const spikes = ([u, v], r, from, to, n) => Array.from({ length: n }, (_, i) => { const a = rad(from + ((to - from) * i) / (n - 1)); return line(F, [[u + r * Math.cos(a), v + r * Math.sin(a)], [u + (r + 3.4) * Math.cos(a), v + (r + 3.4) * Math.sin(a)]], virusPal.outline, vw) + circle(F, u + (r + 4.4) * Math.cos(a), v + (r + 4.4) * Math.sin(a), 2, virusPal.outline) }).join('')
  const [nx, ny] = F.G(-8, 2)
  const nuc = nucleus(g, { x: nx, y: ny, size: F.S(33), id: `${id}-nucleus`, pal: nucPal })
  const inside = [[18, 18, 0], [28, -2, 20], [-26, -16, 10], [-30, 14, 30], [8, -24, 15], [-4, 28, 5]]
  const defs = grad(F, `${id}-gradient`, [-46, -40, 46, 40], pal) + nuc.defs + grad(F, `${id}-envelope-gradient`, [free[0] - freeR, free[1] - freeR, free[0] + freeR, free[1] + freeR], pal)
  const out =
    `<g id="${id}-cytoplasm"><path d="${cellD}" fill="url(#${id}-gradient)"${strokeT(pal.outline, w)}/>${hl(F, -28, -23, F.U * 6.5, F.U * 2.4, -38, pal.light)}` +
    `${circle(F, ...free, freeR, `url(#${id}-envelope-gradient)`, pal.outline, w * 0.75)}</g>` +
    nuc.body +
    `<g id="${id}-virus">${inside.map(([u, v, t]) => hex(u, v, 5.2, t)).join('')}` +
    `${spikes(budC, budR + w / 2 / F.U, budA - 60, budA + 60, 3)}${hex(budC[0], budC[1], 5.2, 0)}` +
    `${spikes(free, freeR + (w * 0.375) / F.U, 0, 360 - 360 / 8, 8)}${hex(free[0], free[1], 4.8, 0)}</g>`
  return { defs, body: `<g id="${id}">${out}</g>`, parts: [['cytoplasm', pal], ['nucleus', nucPal], ['virus', virusPal]] }
}

// =====================================================================================================================
// Marker-positive: the cell with a ring of surface markers (receptors drawn as Y shapes standing out of the membrane,
// all round it) in a contrasting amber, as for "CD marker positive". Options: markerPal, count (14).
// Example: markerPositive(g, { x: 0, y: 0, size: 76 })
export function markerPositive(g, { x, y, size, id = 'marker-positive', pal = CELL, nucPal = NUC, markerPal = MARKER, count = 12 }) {
  const F = frameOf(g, x, y, size), w = F.w, mw = Math.max(3.5, w * 0.85)
  const [nx, ny] = F.G(-6, -2)
  const nuc = nucleus(g, { x: nx, y: ny, size: F.S(33), id: `${id}-nucleus`, pal: nucPal })
  const stem = 6.5, arm = 5.5, spread = 40
  const ys = Array.from({ length: count }, (_, i) => {
    const { p, n } = onEllipse(0, 0, 46, 40, (i * 360) / count - 90 + 360 / count / 2)
    const base = [p[0] + n[0] * 1, p[1] + n[1] * 1], fork = [p[0] + n[0] * stem, p[1] + n[1] * stem], a = Math.atan2(n[1], n[0])
    const tip = (s) => [fork[0] + arm * Math.cos(a + s * rad(spread)), fork[1] + arm * Math.sin(a + s * rad(spread))]
    return [base, fork, tip(-1), tip(1)]
  })
  const yPath = (colour, lw) => ys.map(([b, k, t1, t2]) => line(F, [b, k], colour, lw) + line(F, [t1, k, t2], colour, lw)).join('')
  const defs = grad(F, `${id}-gradient`, [-46, -40, 46, 40], pal) + nuc.defs
  const out =
    `<g id="${id}-markers">${yPath(markerPal.outline, mw)}${yPath(markerPal.small, mw * 0.4)}</g>` +
    `<g id="${id}-cytoplasm">${ellipse(F, 0, 0, 46, 40, 0, `url(#${id}-gradient)`, pal.outline, w)}${hl(F, -28, -22, F.U * 6.5, F.U * 2.5, -38, pal.light)}` +
    `${[[24, 14, 4], [-28, 20, 3], [20, -22, 3]].map(([u, v, r]) => circle(F, u, v, r, pal.small)).join('')}</g>` + nuc.body
  return { defs, body: `<g id="${id}">${out}</g>`, parts: [['cytoplasm', pal], ['nucleus', nucPal], ['markers', markerPal]] }
}

// =====================================================================================================================
// Hypoxic: the cell short of oxygen. Its cytoplasm is its own hue made darker and nearly grey (`hypoxicPal`), HIF-1α
// (amber dots, the colour of a free protein) has gathered in the nucleus and is moving in from the cytoplasm, and an
// oxygen molecule over a falling arrow stands beside it, as in the drafted Hypoxia icon. Options: hifPal, oxygen (true).
// Example: hypoxic(g, { x: 0, y: 0, size: 80 })
export function hypoxic(g, { x, y, size, id = 'hypoxic', pal = CELL, nucPal = NUC, hifPal = HIF, oxygen: o2 = true }) {
  const F = frameOf(g, x, y, size), w = F.w, dim = hypoxicPal(pal)
  const [nx, ny] = F.G(-6, -2)
  const nuc = nucleus(g, { x: nx, y: ny, size: F.S(33), id: `${id}-nucleus`, pal: nucPal })
  const hif = [[-12, -8, 2.9], [-1, -10, 2.6], [-14, 3, 2.6], [-3, 1, 3], [3, -3, 2.3], [-8, 9, 2.4], [5, 7, 2.2], [-18, -3, 2.1]]
  const coming = [[18, 4, 2.3], [26, 9, 2.1], [21, -10, 2]]
  let o2Body = '', o2Defs = ''
  const parts = [['cytoplasm', dim], ['nucleus', nucPal], ['HIF-1α', hifPal]]
  if (o2) {
    const [ox, oy] = F.G(45, -44), ox2 = oxygen(g, { x: ox, y: oy, size: F.S(19), id: `${id}-oxygen` })
    const [ax, ay] = F.G(46, -26)
    const ar = arrow(g, { x: ax, y: ay, size: F.S(18), turn: 90, id: `${id}-arrow`, colour: deep(toLch('#e86b6b').h).outline, w: Math.max(4.5, w * 0.8) })
    o2Body = `<g id="${id}-low-oxygen">${ox2.body}${ar.body}</g>`
    o2Defs = ox2.defs
    parts.push(['oxygen', ox2.parts[0][1]])
  }
  const defs = grad(F, `${id}-gradient`, [-46, -40, 46, 40], dim) + nuc.defs + o2Defs
  const out =
    `<g id="${id}-cytoplasm">${ellipse(F, 0, 0, 46, 40, 0, `url(#${id}-gradient)`, dim.outline, w)}${hl(F, -28, -22, F.U * 6.5, F.U * 2.5, -38, dim.light)}` +
    `${[[24, 14, 4], [-28, 20, 3], [20, -22, 3]].map(([u, v, r]) => circle(F, u, v, r, dim.small)).join('')}</g>` +
    nuc.body + `<g id="${id}-hif">${[...hif, ...coming].map(([u, v, r]) => circle(F, u, v, r, hifPal.small, hifPal.outline, Math.max(2, w * 0.25))).join('')}</g>` + o2Body
  return { defs, body: `<g id="${id}">${out}</g>`, parts }
}

/** The box an icon's body covers on the page, outlines included (rotation of small ellipses ignored). */
export const extent = (body) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  const add = (x, y, m) => { x0 = Math.min(x0, x - m); y0 = Math.min(y0, y - m); x1 = Math.max(x1, x + m); y1 = Math.max(y1, y + m) }
  for (const el of body.match(/<(path|circle|ellipse)\b[^>]*>/g)) {
    const at = (a) => { const m = el.match(new RegExp(` ${a}="([^"]*)"`)); return m ? m[1] : null }
    const sw = +(at('stroke-width') ?? 0) / 2
    if (el.startsWith('<path')) {
      const d = at('d').replace(/A[\d.]+,[\d.]+ [\d.-]+ [01] [01] /g, 'L')
      for (const [, a, b] of d.matchAll(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g)) add(+a, +b, sw)
    } else if (el.startsWith('<circle')) add(+at('cx'), +at('cy'), +at('r') + sw)
    else add(+at('cx'), +at('cy'), Math.max(+at('rx'), +at('ry')) + sw)
  }
  return [x0, y0, x1, y1]
}

export const STATES = { apoptotic, necrotic, senescent, migrating, dividing, infected, markerPositive, hypoxic }

// ---------- the eight icons: the generic Cell in each state ----------
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const OUT = process.argv[2]
  const { cellType, check } = cellTypes(OUT)
  const g = page(1, [256, 256]) // units are page pixels
  // Each state is drawn once at a trial size, measured (`extent`), and drawn again scaled and moved so that its longer
  // side spans 460 pixels (26 px margins) and it sits in the middle of the page.
  const icons = [
    ['Cell (apoptotic)', apoptotic], ['Cell (necrotic)', necrotic], ['Cell (senescent)', senescent], ['Cell (migrating)', migrating],
    ['Cell (dividing)', dividing], ['Cell (infected)', infected], ['Cell (marker-positive)', markerPositive], ['Cell (hypoxic)', hypoxic],
  ]
  for (const [name, fn] of icons) {
    let o = { x: 256, y: 256, size: 400 }
    for (let i = 0; i < 3; i++) {
      const [x0, y0, x1, y1] = extent(fn(g, { ...o, id: 'cell' }).body), k = 460 / Math.max(x1 - x0, y1 - y0)
      o = { x: 256 + (o.x - (x0 + x1) / 2) * k, y: 256 + (o.y - (y0 + y1) / 2) * k, size: o.size * k }
    }
    const r = fn(g, { ...o, id: 'cell' })
    cellType(name, r.parts, r.defs, r.body)
  }
  check()
  console.log('written to', OUT)
}
