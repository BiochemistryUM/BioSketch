// Shared parts of the redrawn icons, group "immune": what the icons of "Immunology & infection" have in common. Viruses of
// several kinds (promoted from ../cells/ct04.mjs: the approved Virus and Bacteriophage), bacteria with what tells them
// apart (built on the approved `bacterium` of tissue.mjs), a lymphocyte for clones and counts, the receptors and ligands
// of immune cells on a surface, two cells meeting at an immune synapse, a target cell (healthy, damaged or dying),
// cytokines, a coat of small antibodies, and a crowd of people for epidemiology. Each part is a function
// `part(g, { x, y, size, turn, id, w, pal, ...options })` that returns { defs, body, parts }, drawn in the frame `g` of
// `page()` (../cellkit.mjs) and designed in a box of 100 local units on its longer side. `size` is the longer extent in
// g's units, outline included; `turn` turns it about x, y (degrees, clockwise); `w` overrides the main outline in page
// pixels (from the size on the page otherwise); every id inside starts with `id`. Shapes from SiliCoDraw
// (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see ../../LICENSE-SiliCoDraw.txt), its
// "Immunology & infection" icons, read by hand and drawn in the soft look of icon-drawings/STYLE.md. With setGloss(true)
// (../cellkit.mjs) closed round bodies (envelopes, bacteria, cells) get the face-on gloss and nuclei are flat; spikes,
// receptors, dots and people stay flat.
//
// ---------- Conventions of immunology & infection ----------
// Host cells keep the colours of the approved cell types: T cells the cell's blue (244), B cells green (158) with amber
//   receptors, NK cells teal (201) with red granules, nuclei the lilac NUC (319), a tumour cell the Cancer cell's rose
//   (24), a senescent cell the Senescent cell's peach (52), an antigen-presenting cell the B cell's green.
// Pathogens differ from host cells by hue and by outline (spikes, a capsule, a wall), never by being darker:
//   bacteria the approved green (137); a capsule pale gold (rich 95); a spore amber (rich 62); Gram stain crystal violet
//   (deep 305) and safranin pink (deep 352). Viruses each by kind, so that two kinds in one figure recolour apart: the
//   generic enveloped virus is Virus.svg (lilac envelope 315, rose spikes 355); SARS-CoV-2 a grey envelope with red
//   spikes (deep 25) and amber envelope proteins (as the CDC's picture); influenza a blue envelope (230) with green HA
//   (deep 150) and amber NA (rich 80) and rose RNA segments; HIV a pink envelope (350) with green Env trimers (deep 150)
//   and a yellow cone capsid (rich 88); a herpesvirus (CMV) a teal envelope (185) round an orange icosahedral capsid
//   (deep 40); a naked icosahedral virus and the bacteriophage the phage's blue (265).
// Receptors and ligands (surfaceProtein): TCR rose (2, as Antigen presentation) with its CD3 in the same palette; MHC
//   blue-teal (205; Antigen presentation's 267 is 23° from the T cell's blue) holding a green peptide (deep 165, every
//   antigen and small molecule); antibodies, BCRs and CARs amber (rich 75; small ones flat in deep(75).small as on the
//   B cell); PD-1 green (deep 130) and PD-L1 teal (deep 190); CD28 and NKG2D yellow-green (deep 100), NKG2D's ligand
//   (MICA) green (deep 150); a CAR's target antigen green (deep 165).
// Signals: cytokines orange (deep 50) with a second kind yellow (rich 95), flat dots; cytotoxic granules purple (deep 282,
//   azurophilic; the approved NK cell's red, 18°, is 6° from a tumour cell). Vessels (tissue.mjs's `vessel` with these palettes): artery red (deep 25), vein blue (deep 262),
//   lymphatic pale yellow (rich 100).
// Epidemiology: people are assays.mjs's busts; a susceptible person in the accent blue of lab.mjs, an infected one red
//   (deep 25), an immune or vaccinated one green (deep 150), a person in quarantine grey.
import { BLUE, GREEN, NUC, PEACH, glossOn } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex } from '../colour.mjs'
import { f, strokeScale } from '../shapes.mjs'
import { gloss, glossTones, pathPoints } from './surfaces.mjs'
import { BACTERIUM, cellW, vessel } from './tissue.mjs'
import { antibody, circularDna } from './molecules.mjs'
import { person } from './assays.mjs'
import { ACCENT } from './lab.mjs'
import { fits, lettering } from './letters.mjs'

// ---------- palettes ----------
const grey = (l, c = 0.006, h = 250) => toHex({ l, c, h })
export const VIRUS = { envelope: soft(hueOf('#e9d5f3')), spike: soft(355) } // as Virus.svg (ct04)
export const CORONA = { envelope: { light: grey(0.985, 0.002), base: grey(0.93), shadow: grey(0.87, 0.008), small: grey(0.78, 0.009), outline: grey(0.55, 0.01) }, spike: deep(25), protein: rich(70) }
export const FLU = { envelope: soft(230), ha: deep(150), na: rich(80), rna: deep(15) }
export const HIV = { envelope: soft(350), spike: deep(150), capsid: rich(88) }
export const HERPES = { envelope: soft(185), capsid: deep(40) }
export const PHAGE = soft(hueOf('#dbe4f7')) // as Bacteriophage.svg (ct04)
export const CAPSULE = rich(95)
export const SPORE = rich(62)
export const GRAM = { positive: deep(305), negative: deep(352) }
export const DNA_PAL = deep(hueOf('#4f6bb8')) // as molecules.mjs's DNA
export const T_CELL = soft(BLUE), B_CELL = soft(GREEN), NK_CELL = soft(hueOf('#CEEFF1')), APC = rich(hueOf('#FFEDBE'))
export const TUMOUR = soft(hueOf('#ffdfdc')), SENESCENT = soft(hueOf('#fce2d3'))
export const ANTIBODY = rich(75), SMALL_Y = deep(75)
export const RECEPTORS = {
  tcr: soft(hueOf('#c9527a')), mhc: soft(205), peptide: deep(165), pd1: deep(130), pdl1: deep(190), cd28: deep(100),
  nkg2d: deep(100), mica: deep(150), antigen: deep(165), bcr: ANTIBODY, car: ANTIBODY, mhc1: soft(205), mhc2: soft(205),
}
RECEPTORS.cd3 = RECEPTORS.tcr
export const CYTOKINE = deep(50), CYTOKINE2 = rich(95), GRANZYME = deep(282)
export const ARTERY = deep(25), VEIN = deep(262), LYMPH = rich(100)
export const STATUS = { susceptible: ACCENT, infected: deep(10), immune: deep(150), isolated: { light: grey(0.97, 0.003), base: grey(0.88), shadow: grey(0.82, 0.008), small: grey(0.7, 0.009), outline: grey(0.5, 0.01) } }
/** Hues for clones of lymphocytes (T cell clonal expansion): the T cell's blue first, all 36° or more from the nucleus. */
export const CLONES = [244, 158, 75, 25, 201, 115, 280].map((h) => soft(h))

// ---------- helpers ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const rad = (d) => (d * Math.PI) / 180
const P2 = ([x, y]) => `${f(x)},${f(y)}`
/** The local frame: 100 units about x, y are `size` units of g; px page pixels per unit; ext the size on the page. */
const frame = (g, x, y, size) => {
  const s = size / 100, px = s * g.k
  return { s, px, ext: size * g.k, cx: g.X(x), cy: g.Y(y), P: ([u, v]) => g.P([x + u * s, y + v * s]), D: (d) => d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, u, v) => P2(g.P([x + u * s, y + v * s]))) }
}
const group = (id, F, turn, inner) => `<g id="${id}"${turn ? ` transform="rotate(${f(turn)} ${f(F.cx)} ${f(F.cy)})"` : ''}>${inner}</g>`
const sw = (s, w) => (s ? ` stroke="${s}" stroke-width="${f(w)}" stroke-linejoin="round"` : '')
const circ = (F, u, v, r, fill, s = '', w = 0) => { const [X, Y] = F.P([u, v]); return `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(r * F.px)}" fill="${fill}"${sw(s, w)}/>` }
const ell = (F, u, v, rx, ry, rot, fill, s = '', w = 0) => { const [X, Y] = F.P([u, v]); return `<ellipse cx="${f(X)}" cy="${f(Y)}" rx="${f(rx * F.px)}" ry="${f(ry * F.px)}"${rot ? ` transform="rotate(${f(rot)} ${f(X)} ${f(Y)})"` : ''} fill="${fill}"${sw(s, w)}/>` }
const fillPath = (d, fill, s = '', w = 0) => `<path d="${d}" fill="${fill}"${sw(s, w)}/>`
const strokePath = (d, colour, w, cap = 'round') => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
const lineD = (F, pts) => `M${pts.map((p) => P2(F.P(p))).join(' L')}`
const polyD = (F, pts) => lineD(F, pts) + ' Z'
/** A circle (local units) as a page path. */
const circD = (F, u, v, r) => { const [X, Y] = F.P([u, v]), R = r * F.px; return `M${f(X - R)},${f(Y)} A${f(R)},${f(R)} 0 1 0 ${f(X + R)},${f(Y)} A${f(R)},${f(R)} 0 1 0 ${f(X - R)},${f(Y)} Z` }
/** An ellipse (local units, turned by rot degrees about its middle) as a page path. */
const ellD = (F, u, v, rx, ry, rot = 0) => {
  const c = Math.cos(rad(rot)), s = Math.sin(rad(rot)), K = 0.5523
  const q = [[rx, 0], [rx, K * ry], [K * rx, ry], [0, ry], [-K * rx, ry], [-rx, K * ry], [-rx, 0], [-rx, -K * ry], [-K * rx, -ry], [0, -ry], [K * rx, -ry], [rx, -K * ry], [rx, 0]]
    .map(([a, b]) => P2(F.P([u + a * c - b * s, v + a * s + b * c])))
  return `M${q[0]} C${q[1]} ${q[2]} ${q[3]} C${q[4]} ${q[5]} ${q[6]} C${q[7]} ${q[8]} ${q[9]} C${q[10]} ${q[11]} ${q[12]} Z`
}
/** A smooth closed outline through local points (Catmull–Rom as cubic Béziers). */
const smooth = (F, pts) => {
  const p = pts.map(F.P), n = p.length
  let d = `M${P2(p[0])}`
  for (let i = 0; i < n; i++) {
    const a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n], e = p[(i + 2) % n]
    d += `C${f(b[0] + (c[0] - a[0]) / 6)},${f(b[1] + (c[1] - a[1]) / 6)} ${f(c[0] - (e[0] - b[0]) / 6)},${f(c[1] - (e[1] - b[1]) / 6)} ${P2(c)}`
  }
  return d + 'Z'
}
/** A polygon (local units) with rounded corners (radius r units), as a page path. */
const roundPoly = (F, pts, r) => {
  const n = pts.length, P = pts.map(F.P), R = r * F.px
  const toward = (a, b, d) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]), t = Math.min(d, l / 2) / l; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] }
  let d = ''
  for (let i = 0; i < n; i++) { const a = toward(P[i], P[(i - 1 + n) % n], R), b = toward(P[i], P[(i + 1) % n], R); d += `${i ? 'L' : 'M'}${P2(a)} Q${P2(P[i])} ${P2(b)} ` }
  return d + 'Z'
}
/** A bar from radius r0 to r1 along angle a (degrees, 0 = up, clockwise), half width hw, corners rounded (local units). */
const bar = (F, a, r0, r1, hw, rr) => { const t = rad(a), ux = Math.sin(t), uy = -Math.cos(t), nx = -uy, ny = ux; return roundPoly(F, [[ux * r0 + nx * hw, uy * r0 + ny * hw], [ux * r1 + nx * hw, uy * r1 + ny * hw], [ux * r1 - nx * hw, uy * r1 - ny * hw], [ux * r0 - nx * hw, uy * r0 - ny * hw]], rr) }
/** A point at radius r along angle a (degrees, 0 = up, clockwise), turned further by local offsets (along, across). */
const polar = (a, r, across = 0) => { const t = rad(a); return [Math.sin(t) * r + Math.cos(t) * across, -Math.cos(t) * r + Math.sin(t) * across] }
const boxGrad = (id, pal) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`
const linGrad = (id, F, [u0, v0, u1, v1], pal) => { const [a, b] = F.P([u0, v0]), [c, d] = F.P([u1, v1]); return `<linearGradient id="${id}" x1="${f(a)}" y1="${f(b)}" x2="${f(c)}" y2="${f(d)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>` }
const hl = (F, u, v, rx, ry, rot, fill) => ell(F, u, v, rx, ry, rot, fill)
// A deterministic wobble (the same call draws the same part).
const wob = (i, seed) => Math.sin(i * 12.9898 + seed * 78.233) * 0.5 + Math.sin(i * 4.1 + seed * 1.7) * 0.5

// ---------- the gloss of cells (STYLE.md), with setGloss(true) of ../cellkit.mjs ----------
// As organelles.mjs: a closed body gets the face-on tones of `gloss` over its fill (shade and shadow from 40 px, lit band
// and highlight from 90 px), its gradient ends in the gloss's end tone, and it has no highlight ellipse.
const glossOf = (F, turn, d, pal, w, px) => {
  if (!glossOn() || px < 40) return ''
  const G = gloss({ fills: [pathPoints(d)] }, { inset: (w * strokeScale()) / 2, turn, about: [F.cx, F.cy] }), T = glossTones(pal)
  return ['shade', 'shadow', ...(px >= 90 ? ['lit', 'highlight'] : [])].map((k) => (G[k] ? `<path d="${G[k]}" fill="${T[k]}"/>` : '')).join('')
}
const gp = (pal) => (glossOn() ? { ...pal, shadow: glossTones(pal).end } : pal)
/** A body: its path filled with a gradient, outlined, then the gloss (or, without it, a highlight when large). */
const bodyOf = (F, turn, id, d, pal, w, px, box, light) => ({
  defs: linGrad(`${id}-gradient`, F, box, gp(pal)),
  body: fillPath(d, `url(#${id}-gradient)`, pal.outline, w) + (glossOn() ? glossOf(F, turn, d, pal, w, px) : px >= 120 && light ? hl(F, ...light, pal.light) : ''),
})

// =====================================================================================================================
// Virus. kind 'enveloped' (the approved Virus: a lilac envelope, twelve rose spikes on stalks, a capsid in the middle),
// 'corona' (SARS-CoV-2: club-shaped spike trimers all round, envelope proteins as dots in the rim, the RNA with its
// nucleocapsid inside from 100 px), 'influenza' (rods of haemagglutinin and every fourth spike a mushroom of
// neuraminidase, the M1 layer and eight RNA segments inside from 100 px), 'hiv' (Env trimers as three balls on a stalk,
// the matrix as dots under the envelope, the cone-shaped capsid with two RNA strands from 90 px), 'herpes' (a
// herpesvirus such as CMV: short glycoproteins, the tegument, an icosahedral capsid with its DNA), 'naked' (an
// icosahedral capsid without envelope, seen as a hexagon with its facets), 'phage' (the approved Bacteriophage, T4-like,
// upright). Options: spikes (how many; by kind), inside (false leaves the inside empty), pal (envelope or capsid),
// spikePal. Below 60 px the spikes are fewer and nothing is drawn inside.
// Used by: Coronavirus, HIV, Influenza virus, Pandemic, CMV memory inflation, Vaccine (later), Transmission (later).
// Example: virus(g, { x: 30, y: -30, size: 24, kind: 'corona', id: 'virus' })
export function virus(g, { x, y, size, turn = 0, id = 'virus', w, kind = 'enveloped', spikes, inside = true, pal, spikePal }) {
  const F = frame(g, x, y, size), small = F.ext < 60, rich_ = F.ext >= 100 && inside
  w ??= cellW(F.ext * 0.62)
  let defs = '', s = ''
  const parts = []
  const envelope = (d, P, box, extra = '') => { const b = bodyOf(F, turn, `${id}-envelope`, d, P, w, F.ext * 0.62, box, [-16, -17, 12, 4.5, -45]); defs += b.defs; return `<g id="${id}-envelope">${b.body}${extra}</g>` }
  if (kind === 'enveloped') {
    // Virus.svg (ct04), scaled so that the knobs reach the edge: envelope 30, stalks 29–43, knobs 4.9 at 45.
    const env = pal ?? VIRUS.envelope, sp = spikePal ?? VIRUS.spike, n = spikes ?? (small ? 10 : 12)
    const a = Array.from({ length: n }, (_, i) => (i / n) * 360 + 90)
    s += `<g id="${id}-spikes">${a.map((t) => strokePath(lineD(F, [polar(t, 29), polar(t, 43)]), sp.outline, w * 0.83)).join('')}${a.map((t) => circ(F, ...polar(t, 45), 4.9, sp.small, sp.outline, w * 0.42)).join('')}</g>`
    s += envelope(circD(F, 0, 0, 30), env, [-30, -30, 30, 30])
    if (inside) s += `<g id="${id}-capsid">${circ(F, 1, 2, 11, env.small)}</g>`
    parts.push(['envelope', env], ['spikes', sp])
  } else if (kind === 'corona') {
    // SiliCoDraw's coronavirus ×1.075: envelope 31, stalks 29–36.5, clubs to 50; 12 M/E dots in the rim.
    const env = pal ?? CORONA.envelope, sp = spikePal ?? CORONA.spike, pr = CORONA.protein, n = spikes ?? (small ? 9 : 12), k = 1.075
    const club = (t) => { const r = (u, v) => polar(t, -v * k, u * k); return F.D(`M${P2(r(-1.6, -33.5))}C${P2(r(-5.5, -35))} ${P2(r(-6.5, -41))} ${P2(r(-4, -44))}C${P2(r(-2, -46.5))} ${P2(r(2, -46.5))} ${P2(r(4, -44))}C${P2(r(6.5, -41))} ${P2(r(5.5, -35))} ${P2(r(1.6, -33.5))}Z`) }
    const a = Array.from({ length: n }, (_, i) => (i / n) * 360)
    s += `<g id="${id}-spikes">${a.map((t) => strokePath(lineD(F, [polar(t, 28), polar(t, 36.5)]), sp.outline, w * 0.55)).join('')}${a.map((t) => fillPath(club(t), sp.base, sp.outline, w * 0.42)).join('')}</g>`
    const dots = F.ext >= 45 ? Array.from({ length: n }, (_, i) => circ(F, ...polar((i + 0.5) * (360 / n), 26.5), 2, pr.small)).join('') : ''
    let inner = ''
    if (rich_) {
      const rna = 'M-15,-7C-9,-16 0,-4 6,-12S16,-10 14,-2S2,6 -4,4S-16,8 -12,15S0,20 6,14'.replace(/(-?[\d.]+),(-?[\d.]+)/g, (_, u, v) => `${f(u * k)},${f(v * k)}`)
      inner = `<g id="${id}-genome">${strokePath(F.D(rna), env.outline, Math.max(1.5, w * 0.35))}${[[-15, -7], [6, -12], [14, -2], [-4, 4], [-12, 15], [6, 14]].map(([u, v]) => circ(F, u * k, v * k, 2.6, pr.base, pr.outline, w * 0.25)).join('')}</g>`
    }
    s += envelope(circD(F, 0, 0, 31), env, [-31, -31, 31, 31], dots ? `<g id="${id}-envelope-proteins">${dots}</g>` : '') + inner
    parts.push(['spikes', sp], ['envelope proteins', pr])
  } else if (kind === 'influenza') {
    // SiliCoDraw's influenza ×1.16: a slightly wavy envelope 30, HA rods 28–41, an NA mushroom every fourth spike.
    const env = pal ?? FLU.envelope, ha = spikePal ?? FLU.ha, na = FLU.na, k = 1.16, n = spikes ?? (small ? 12 : 20)
    const edge = Array.from({ length: 18 }, (_, i) => { const t = (i / 18) * 2 * Math.PI, r = (30 + 0.9 * Math.sin(4 * t + 0.4)) * k * 0.92; return [r * Math.cos(t), r * Math.sin(t)] })
    let hs = '', ns = ''
    for (let i = 0; i < n; i++) {
      const t = (i / n) * 360 + 4
      if (i % 4 === 2) ns += strokePath(lineD(F, [polar(t, 29 * k * 0.92), polar(t, 36 * k * 0.92)]), na.outline, w * 0.4) + fillPath(bar(F, t, 35.5 * k * 0.92, 42.5 * k * 0.92 + 2, 4.2, 1.5), na.base, na.outline, w * 0.4)
      else hs += fillPath(bar(F, t, 27 * k * 0.92, 43.5, 2.9, 2.4), ha.base, ha.outline, w * 0.4)
    }
    let inner = ''
    if (rich_) {
      const rn = FLU.rna, L = [26, 32, 36, 30, 34, 24, 28, 20]
      inner = `<g id="${id}-segments">${L.map((l, i) => { const u = (-18.9 + i * 5.4) * k * 0.92, m = 2 * Math.sqrt(Math.max(0, (22 * k * 0.92) ** 2 - u * u)), h = Math.min(l * k * 0.92, m), v0 = -h / 2 + (((i * 7) % 5) - 2) * 0.8; return fillPath(roundPoly(F, [[u - 1.5, v0], [u + 1.5, v0], [u + 1.5, v0 + h], [u - 1.5, v0 + h]], 1.5), rn.base, rn.outline, w * 0.22) }).join('')}</g>`
      inner = `<g id="${id}-matrix">${strokePath(circD(F, 0, 0, 26.5 * k * 0.92), env.small, w * 0.35)}</g>` + inner
    }
    s += `<g id="${id}-spikes">${hs}${ns}</g>` + envelope(smooth(F, edge), env, [-32, -32, 32, 32]) + inner
    parts.push(['envelope', env], ['haemagglutinin', ha], ['neuraminidase', na], ...(rich_ ? [['RNA', FLU.rna]] : []))
  } else if (kind === 'hiv') {
    // SiliCoDraw's HIV ×1.05: envelope 32, Env stalks 30–39, three balls 2.8 at the top; matrix dots at 27.5; the cone.
    const env = pal ?? HIV.envelope, sp = spikePal ?? HIV.spike, cap = HIV.capsid, k = 1.045, n = spikes ?? (small ? 7 : 10)
    const a = Array.from({ length: n }, (_, i) => (i / n) * 360 + 18)
    s += `<g id="${id}-spikes">${a.map((t) => strokePath(lineD(F, [polar(t, 30 * k), polar(t, 39 * k)]), sp.outline, w * 0.5)).join('')}${a.map((t) => [polar(t, 41.5 * k, -2.9), polar(t, 41.5 * k, 2.9), polar(t, 45.3 * k)].map((p) => circ(F, ...p, 3.1, sp.small, sp.outline, w * 0.3)).join('')).join('')}</g>`
    const mat = F.ext >= 60 ? `<g id="${id}-matrix">${Array.from({ length: 28 }, (_, i) => circ(F, ...polar((i / 28) * 360, 27.5 * k), 1.7, env.small)).join('')}</g>` : ''
    s += envelope(circD(F, 0, 0, 32 * k), env, [-33, -33, 33, 33], mat)
    if (inside) {
      const c = Math.cos(rad(-32)), sn = Math.sin(rad(-32)), T = ([u, v]) => [(u * c - v * sn) * k, (u * sn + v * c) * k]
      const coneD = F.D('M-4.5,-21Q0,-24 4.5,-21L13,13Q0,23 -13,13Z'.replace(/(-?[\d.]+),(-?[\d.]+)/g, (_, u, v) => P2(T([+u, +v]))))
      let strands = ''
      if (F.ext >= 90) strands = ['M-2.5,-15C-5,-9 -1,-5 -3.5,1S-6,10 -4,15', 'M2,-15C0,-9 4,-5 2.5,1S1,10 3.5,15'].map((d) => strokePath(F.D(d.replace(/(-?[\d.]+),(-?[\d.]+)/g, (_, u, v) => P2(T([+u, +v])))), cap.outline, Math.max(1.4, w * 0.3))).join('')
      s += `<g id="${id}-capsid">${fillPath(coneD, cap.base, cap.outline, w * 0.55)}${strands}</g>`
      parts.push(['envelope', env], ['spikes', sp], ['capsid', cap])
    } else parts.push(['envelope', env], ['spikes', sp])
  } else if (kind === 'herpes') {
    // SiliCoDraw's CMV ×1.97: envelope 38, glycoproteins 37–45 with a knob, the tegument a paler disc, capsid hexagon 21.
    const env = pal ?? HERPES.envelope, cap = spikePal ?? HERPES.capsid, n = spikes ?? (small ? 10 : 14)
    const a = Array.from({ length: n }, (_, i) => (i / n) * 360)
    s += `<g id="${id}-spikes">${a.map((t) => strokePath(lineD(F, [polar(t, 36), polar(t, 44.5)]), env.outline, w * 0.42)).join('')}${a.map((t) => circ(F, ...polar(t, 46), 3.6, env.small)).join('')}</g>`
    const edge = Array.from({ length: 16 }, (_, i) => { const t = (i / 16) * 2 * Math.PI, r = 38 + 1.1 * Math.sin(3 * t + 0.7); return [r * Math.cos(t), r * Math.sin(t)] })
    const teg = F.ext >= 60 && inside ? `<g id="${id}-tegument">${circ(F, 0, 0, 29.5, env.light)}</g>` : ''
    s += envelope(smooth(F, edge), env, [-39, -39, 39, 39], teg)
    if (inside) {
      const hex = Array.from({ length: 6 }, (_, i) => polar(i * 60 + 30, 20.5))
      const wave = (v0) => lineD(F, Array.from({ length: 17 }, (_, i) => [-11 + (22 * i) / 16, v0 + 3 * Math.sin((i / 16) * 3 * Math.PI)]))
      const dnaLine = F.ext >= 90 ? strokePath(wave(-4) + ' ' + wave(5), cap.outline, Math.max(1.4, w * 0.3)) : ''
      s += `<g id="${id}-capsid">${fillPath(roundPoly(F, hex, 2), cap.base, cap.outline, w * 0.6)}${dnaLine}</g>`
    }
    parts.push(['envelope', env], ['capsid', cap])
  } else if (kind === 'naked') {
    // An icosahedron seen along a three-fold axis: a hexagon, an inner triangle and the edges between them.
    const cap = pal ?? PHAGE, R = 48, hex = Array.from({ length: 6 }, (_, i) => polar(i * 60, R)), tri = [0, 120, 240].map((t) => polar(t + 60, R * 0.42))
    const b = bodyOf(F, turn, `${id}-capsid`, roundPoly(F, hex, 3), cap, w, F.ext, [-R, -R, R, R], [-22, -26, 12, 4.5, -45])
    defs += b.defs
    const edges = tri.flatMap((t, i) => [[t, hex[(2 * i + 0) % 6]], [t, hex[(2 * i + 1) % 6]], [t, hex[(2 * i + 2) % 6]], [t, tri[(i + 1) % 3]]])
    s += `<g id="${id}-capsid">${b.body}${F.ext >= 30 ? edges.map((e) => strokePath(lineD(F, e), cap.small, Math.max(1.2, w * 0.45))).join('') : ''}${fillPath(roundPoly(F, hex, 3), 'none', cap.outline, w)}</g>`
    parts.push(['capsid', cap])
  } else if (kind === 'phage') {
    // Bacteriophage.svg (ct04), its 95.3 units high scaled to 100, the head at the top.
    const ph = pal ?? PHAGE, k = 1.05, Q = ([u, v]) => [u * k, (v + 0.8) * k]
    const head = [[0, -48], [19, -37], [19, -15], [0, -4], [-19, -15], [-19, -37]].map(Q)
    const rr = (u, v, ww, hh, r) => roundPoly(F, [[u, v], [u + ww, v], [u + ww, v + hh], [u, v + hh]].map(Q), r * k)
    const fib = [[[-11, 30], [-25, 20], [-31, 46.5]], [[11, 30], [25, 20], [31, 46.5]], [[-5, 32], [-9, 46.5]], [[5, 32], [9, 46.5]]].map((p) => p.map(Q))
    const W = w * 0.83
    defs += linGrad(`${id}-head-gradient`, F, [...Q([-19, -48]), ...Q([19, -4])], gp(ph)) + linGrad(`${id}-sheath-gradient`, F, [...Q([-6.5, 1]), ...Q([6.5, 28])], gp(ph))
    const hd = polyD(F, head)
    s += `<g id="${id}-tail-fibres">${fib.map((p) => strokePath(lineD(F, p), ph.outline, W)).join('')}</g>`
    s += `<g id="${id}-tail-sheath">${fillPath(rr(-6.5, 0, 13, 28, 2), `url(#${id}-sheath-gradient)`, ph.outline, W * 0.8)}${F.ext >= 60 ? [7.5, 14, 20.5].map((v) => strokePath(lineD(F, [Q([-6, v]), Q([6, v])]), ph.outline, W * 0.5)).join('') : ''}</g>`
    s += `<g id="${id}-baseplate">${fillPath(rr(-13, 26.5, 26, 6, 2), ph.small, ph.outline, W * 0.7)}</g><g id="${id}-collar">${fillPath(rr(-8.5, -3.5, 17, 5.5, 1.5), ph.small, ph.outline, W * 0.7)}</g>`
    s += `<g id="${id}-head">${fillPath(hd, `url(#${id}-head-gradient)`, ph.outline, W)}${glossOn() ? glossOf(F, turn, hd, ph, W, F.ext * 0.4) : ''}${F.ext >= 40 ? [[head[0], head[3]], [head[5], head[2]], [head[1], head[4]]].map((p) => strokePath(lineD(F, p), ph.small, W * 0.5)).join('') : ''}${fillPath(hd, 'none', ph.outline, W)}</g>`
    parts.push(['phage', ph])
  } else throw new Error(`virus: no kind "${kind}"`)
  return { defs, body: group(id, F, turn, s), parts }
}

// =====================================================================================================================
// Bacterium with what tells bacteria apart, built on the approved `bacterium` of tissue.mjs (its green, its granules
// and flagellum, the same outline). Options as there (shape 'rod' | 'coccus', aspect, flagellum, granules, pal), and:
// shape 'oval' (a short rounded oval, aspect 0.68, e.g. Akkermansia); pair (two cells end to end with a septum: a
// diplococcus, a dividing oval); envelope 'plain' | 'negative' (an inner membrane inside the outline: Gram-negative) |
// 'positive' (a wall half as thick again: Gram-positive); capsule (true: a pale gold capsule with fine fibres from 80 px;
// 'waxy': the tight waxy coat of mycobacteria, no fibres); spore (true or 'terminal': an endospore near one end;
// 'central'); plasmid (a small ring of DNA, molecules.mjs's circular DNA); nucleoid (the chromosome as a loose wavy
// line); beads (mycobacteria: beads along the cell instead of granules); stain 'positive' | 'negative' (the Gram stain's
// violet or pink, sets pal and envelope). size includes the capsule and the flagellum.
// Used by: Antibiotic, Antimicrobial resistance, Sepsis, Granuloma, Mycobacterium, Opsonisation, Gram stain, Quorum
// sensing, Endospore, Capsule, Akkermansia muciniphila, Microbiome composition (legend), Secretion system (outline).
// Example: microbe(g, { x: 0, y: 0, size: 60, envelope: 'negative', plasmid: true, id: 'bacterium' })
export function microbe(g, { x, y, size, turn = 0, id = 'bacterium', w, pal, shape = 'rod', aspect, flagellum, granules = true, pair = false, envelope = 'plain', capsule = false, spore = false, plasmid = false, nucleoid = false, beads = false, stain }) {
  if (stain) { pal ??= GRAM[stain]; envelope = stain }
  pal ??= BACTERIUM
  const F = frame(g, x, y, size), oval = shape === 'oval', coccus = shape === 'coccus'
  aspect ??= oval ? 0.68 : coccus ? 1 : 0.41
  flagellum ??= shape === 'rod' && !pair && !capsule
  // The capsule's margin, as a share of the cell's width; the cell is made smaller so that size includes it.
  const cm = capsule === 'waxy' ? 0.2 : capsule ? 0.36 : 0
  // Work in page pixels about the middle: the whole is `ext` long; one cell is Lc long and H wide (outline centres).
  const ext = F.ext, cx = F.cx, cy = F.cy
  const flagShare = flagellum ? 37 / 129 : 0
  const bodyExt = ext * (1 - flagShare) // cells and capsule
  // bodyExt = n*Lc + w + 2*cm*H, H = Lc*aspect (one cell's length Lc): solve for Lc with w from cellW.
  const n = pair ? 2 : 1
  let W = w ?? cellW(Math.min(bodyExt, bodyExt * aspect * 2.2 / n) * (n === 2 ? 1.2 : 1))
  if (envelope === 'positive') W *= 1.5
  // Round cells of a pair overlap a little (a dividing diplococcus); rods meet end to end at a septum.
  const stepK = n === 2 && (oval || coccus) ? 0.84 : 1, nEff = 1 + (n - 1) * stepK
  const Lc = (bodyExt - W) / (nEff + 2 * cm * aspect), H = Lc * aspect, C = cm * H
  const x0 = cx - ext / 2 + C + W / 2, x1 = x0 + nEff * Lc
  const ox = (x0 + x1) / 2 // middle of the cells
  let defs = '', s = ''
  const parts = [['cell', pal]]
  const gid = `${id}-gradient`
  defs += `<linearGradient id="${gid}" x1="${f(x0)}" y1="${f(cy - H / 2)}" x2="${f(x1)}" y2="${f(cy + H / 2)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${gp(pal).shadow}"/></linearGradient>`
  const pg = { cx, cy, px: 1, P: (p) => p } // page-pixel frame for the gloss
  // A cell outline (page path): rod or coccus as a stadium, oval as an ellipse.
  const cellD = (a, b) => {
    const r = Math.min(H / 2, (b - a) / 2), m = (a + b) / 2
    if (oval) { const rx = (b - a) / 2, ry = H / 2, K = 0.5523; return `M${f(m - rx)},${f(cy)} C${f(m - rx)},${f(cy - K * ry)} ${f(m - K * rx)},${f(cy - ry)} ${f(m)},${f(cy - ry)} C${f(m + K * rx)},${f(cy - ry)} ${f(m + rx)},${f(cy - K * ry)} ${f(m + rx)},${f(cy)} C${f(m + rx)},${f(cy + K * ry)} ${f(m + K * rx)},${f(cy + ry)} ${f(m)},${f(cy + ry)} C${f(m - K * rx)},${f(cy + ry)} ${f(m - rx)},${f(cy + K * ry)} ${f(m - rx)},${f(cy)} Z` }
    return `M${f(a + r)},${f(cy - H / 2)} H${f(b - r)} A${f(r)},${f(r)} 0 0 1 ${f(b - r)},${f(cy + H / 2)} H${f(a + r)} A${f(r)},${f(r)} 0 0 1 ${f(a + r)},${f(cy - H / 2)} Z`
  }
  const stadium = (a, b, hh) => { const r = Math.min(hh, (b - a) / 2); return `M${f(a + r)},${f(cy - hh)} H${f(b - r)} A${f(r)},${f(r)} 0 0 1 ${f(b - r)},${f(cy + hh)} H${f(a + r)} A${f(r)},${f(r)} 0 0 1 ${f(a + r)},${f(cy - hh)} Z` }
  // Capsule: under the cells, as wide again on every side.
  if (capsule) {
    const hh = H / 2 + C, d = oval || coccus ? `M${f(x0 - C)},${f(cy)} A${f((x1 - x0) / 2 + C)},${f(hh)} 0 1 0 ${f(x1 + C)},${f(cy)} A${f((x1 - x0) / 2 + C)},${f(hh)} 0 1 0 ${f(x0 - C)},${f(cy)} Z` : stadium(x0 - C, x1 + C, hh)
    let fib = ''
    if (capsule !== 'waxy' && ext >= 80) {
      const k = Math.round((2 * (x1 - x0) + 2 * Math.PI * hh) / (C * 1.1))
      fib = pathPoints(d)[0].filter((_, i, a) => i % Math.max(1, Math.floor(a.length / k)) === 0).map(([px, py]) => {
        const dx = px - ox, dy = py - cy, near = [clamp(px, x0 + H / 2, x1 - H / 2), cy], vx = px - near[0], vy = py - near[1], l = Math.hypot(vx, vy) || 1
        return `M${f(px - (vx / l) * C * 0.75)},${f(py - (vy / l) * C * 0.75)} L${f(px - (vx / l) * C * 0.25)},${f(py - (vy / l) * C * 0.25)}`
      }).join(' ')
      fib = strokePath(fib, CAPSULE.small, Math.max(1.2, W * 0.35))
    }
    s += `<g id="${id}-capsule">${fillPath(d, capsule === 'waxy' ? CAPSULE.light : CAPSULE.base, CAPSULE.outline, Math.max(2, W * 0.4))}${fib}</g>`
    parts.push(['capsule', CAPSULE])
  }
  // Flagellum: tissue.mjs's curve, at the right end.
  if (flagellum) {
    const k = (Lc - 0) / 92, xs = x1 - 2
    const pts = ['44,0', '47,5 51,8.5 55,7.5', '60,6 62,-5 67,-6.5', '72,-8 75,-2 80.5,3']
    const d = 'M' + pts.map((q, i) => (i ? 'C' : '') + q.split(' ').map((p) => { const [u, v] = p.split(',').map(Number); return P2([xs + (u - 44) * k * 1.12, cy + v * k]) }).join(' ')).join(' ')
    s += `<g id="${id}-flagellum">${strokePath(d, pal.outline, Math.max(3.5, W * 0.75))}</g>`
  }
  // The cells.
  let cells = ''
  for (let i = 0; i < n; i++) {
    const a = x0 + i * Lc * stepK, b = a + Lc, d = cellD(a, b)
    cells += fillPath(d, `url(#${gid})`, pal.outline, W) + (glossOn() ? glossOf(pg, turn, d, pal, W, Math.min(b - a, H) * 1.6) : H >= 60 ? `<ellipse cx="${f(a + (b - a) * 0.28)}" cy="${f(cy - H * 0.3)}" rx="${f((b - a) * 0.14)}" ry="${f(H * 0.05)}" transform="rotate(-8 ${f(a + (b - a) * 0.28)} ${f(cy - H * 0.3)})" fill="${pal.light}"/>` : '')
    if (envelope === 'negative' && H >= 14) { const t = W * 1.1; cells += strokePath(oval ? cellD(a + t, b - t) : stadium(a + t, b - t, H / 2 - t), pal.outline, Math.max(1.2, W * 0.4)) }
  }
  if (n === 2 && stepK === 1) cells += strokePath(`M${f(x0 + Lc)},${f(cy - H / 2)} L${f(x0 + Lc)},${f(cy + H / 2)}`, pal.outline, W * 0.8)
  s += `<g id="${id}-cell">${cells}</g>`
  // What is inside: granules (as tissue.mjs's), beads, the nucleoid, a plasmid, a spore.
  const inner = []
  const each = (fn) => Array.from({ length: n }, (_, i) => fn(x0 + i * Lc * stepK, x0 + i * Lc * stepK + Lc)).join('')
  if (beads) inner.push(`<g id="${id}-beads">${each((a, b) => [0.22, 0.42, 0.62, 0.8].map((t) => `<circle cx="${f(a + (b - a) * t)}" cy="${f(cy)}" r="${f(Math.max(1.4, H * 0.17))}" fill="${pal.small}"/>`).join(''))}</g>`)
  else if (granules && !spore) inner.push(`<g id="${id}-granules">${each((a, b) => ((oval || coccus) ? [[0.62, -0.18, 0.1], [0.35, 0.2, 0.08]] : [[0.26, -0.03, 0.045], [0.48, 0.065, 0.055], [0.7, -0.05, 0.045]]).map(([t, v, r]) => `<circle cx="${f(a + (b - a) * t)}" cy="${f(cy + v * (oval || coccus ? H : b - a))}" r="${f(Math.max(1.6, r * (oval || coccus ? H : b - a)))}" fill="${pal.small}"/>`).join(''))}</g>`)
  if (nucleoid) { const a = x0 + Lc * 0.22, b = x0 + Lc * (spore ? 0.52 : 0.72), A = H * 0.13, m = 6; let d = `M${f(a)},${f(cy)}`; for (let i = 1; i <= m; i++) { const xm = a + ((b - a) * (i - 0.5)) / m, xe = a + ((b - a) * i) / m; d += ` Q${f(xm)},${f(cy + (i % 2 ? -A : A) * 2)} ${f(xe)},${f(cy)}` } inner.push(`<g id="${id}-nucleoid">${strokePath(d, DNA_PAL.small, Math.max(1.3, W * 0.4))}</g>`); parts.push(['DNA', DNA_PAL]) }
  if (plasmid) { const r = H * 0.24, px_ = x0 + Lc * (n === 1 ? 0.8 : 0.5), gx = (px_ - g.X(0)) / g.k, gy = (cy - g.Y(0)) / g.k; const c = circularDna(g, { x: gx, y: gy, size: (2 * r) / g.k, id: `${id}-plasmid`, twists: 5 }); inner.push(c.body); if (!nucleoid) parts.push(['DNA', DNA_PAL]) }
  if (spore) {
    const sx = spore === 'central' ? x0 + Lc / 2 : x0 + Lc * 0.76, rx = Math.min(H * 0.48, Lc * 0.2), ry = H * 0.3
    const e = (k, fill, st = '', ww = 0) => `<ellipse cx="${f(sx)}" cy="${f(cy)}" rx="${f(rx * k)}" ry="${f(ry * k)}" fill="${fill}"${sw(st, ww)}/>`
    inner.push(`<g id="${id}-spore">${e(1, SPORE.shadow, SPORE.outline, Math.max(1.4, W * 0.45))}${ry >= 6 ? e(0.74, SPORE.light) + e(0.5, SPORE.base, SPORE.outline, Math.max(1, W * 0.25)) : ''}</g>`)
    parts.push(['spore', SPORE])
  }
  s += inner.join('')
  return { defs, body: `<g id="${id}"${turn ? ` transform="rotate(${f(turn)} ${f(cx)} ${f(cy)})"` : ''}>${s}</g>`, parts }
}

// =====================================================================================================================
// Lymphocyte: a small round cell with a large nucleus, drawn as the approved T cell and B cell are (cytoplasm 34 of 50,
// nucleus 22, microvilli ending in knobs, or the B cell's amber Ys), for scenes with many lymphocytes (clones, counts,
// a germinal centre). Options: kind 'T' (the T cell's blue, knobs) | 'B' (green, Y receptors) | 'NK' (teal, red granules,
// no knobs) | 'plain' (no surface); pal (a clone's colour: CLONES); receptors (true from 36 px on the page); letter (a
// short label on the nucleus, e.g. '4' or '8', lettered by letters.mjs when it is large enough); contact (degrees, 0 up,
// clockwise: the cell is flattened on that side, against another cell, and no receptor stands there).
// Used by: Naive T cell decline, CMV memory inflation, T cell clonal expansion, Inverted CD4:CD8 ratio, Germinal centre,
// Granuloma (cuff), Myeloid-biased HSC, CD28-null T cell, Age-associated B cell, Immune synapse (via synapse).
// Example: lymphocyte(g, { x: 0, y: 0, size: 24, kind: 'T', letter: '8', id: 'cd8' })
export function lymphocyte(g, { x, y, size, turn = 0, id = 'lymphocyte', w, kind = 'T', pal, nucPal = NUC, receptors, letter, contact, receptorPal }) {
  const F = frame(g, x, y, size)
  pal ??= { T: T_CELL, B: B_CELL, NK: NK_CELL }[kind] ?? T_CELL
  receptors ??= F.ext >= 36 && (kind === 'T' || kind === 'B')
  const R = receptors ? 34 : 47, NR = R * (22 / 34)
  w ??= cellW(2 * R * F.px)
  const nw = w * (10 / 12)
  // The outline: a circle, flattened at `contact` (points beyond 0.78 R towards it are pulled back).
  const pts = Array.from({ length: 36 }, (_, i) => {
    const t = (i / 36) * 360, p = polar(t, R)
    if (contact == null) return p
    const u = polar(contact, 1), d = p[0] * u[0] + p[1] * u[1], lim = R * 0.78
    return d > lim ? [p[0] - u[0] * (d - lim), p[1] - u[1] * (d - lim)] : p
  })
  const d = contact == null ? circD(F, 0, 0, R) : smooth(F, pts)
  const b = bodyOf(F, turn, id, d, pal, w, 2 * R * F.px, [-R, -R, R, R], [-R * 0.62, -R * 0.56, R * 0.7, R * 0.26, -45])
  let s = ''
  const parts = [['cytoplasm', pal], ['nucleus', nucPal]]
  const away = (t) => contact == null || Math.abs(((t - contact + 540) % 360) - 180) > 50
  if (receptors && kind === 'T') {
    const rp = receptorPal ?? pal, a = Array.from({ length: 8 }, (_, i) => (i / 8) * 360 + 22.5).filter(away)
    s += `<g id="${id}-microvilli">${a.map((t) => strokePath(lineD(F, [polar(t, 33), polar(t, 43)]), rp.outline, w * 0.75)).join('')}${a.map((t) => circ(F, ...polar(t, 45.5), 4.6, rp.small)).join('')}</g>`
  } else if (receptors && kind === 'B') {
    const rp = receptorPal ?? SMALL_Y, a = Array.from({ length: 6 }, (_, i) => i * 60).filter(away)
    s += `<g id="${id}-receptors">${a.map((t) => strokePath(lineD(F, [polar(t, 33), polar(t, 40)]), rp.small, w) + strokePath(lineD(F, [polar(t, 47, -5.5), polar(t, 40), polar(t, 47, 5.5)]), rp.small, w)).join('')}</g>`
    if (!receptorPal) parts.push(['receptors', rp])
  }
  s += `<g id="${id}-cytoplasm">${b.body}</g>`
  if (kind === 'NK') { const a = (contact ?? 90) + 180; s += `<g id="${id}-granules">${[-62, -30, 0, 30, 62].map((da, i) => circ(F, ...polar(a + da + 180, R * (i % 2 ? 0.8 : 0.76)), R * 0.075, GRANZYME.small)).join('')}</g>`; parts.push(['granules', GRANZYME]) }
  const [nu, nv] = kind === 'NK' ? polar((contact ?? 90) + 180, R * 0.14) : contact == null ? [0, -1 * R / 34] : polar(contact + 180, R * 0.08)
  s += `<g id="${id}-nucleus">${circ(F, nu, nv, NR, glossOn() ? nucPal.base : `url(#${id}-nucleus-gradient)`, nucPal.outline, nw)}${!glossOn() && F.ext >= 120 ? hl(F, nu - NR * 0.42, nv - NR * 0.45, NR * 0.24, NR * 0.1, -45, nucPal.light) : ''}</g>`
  if (letter) { const h = NR * 0.95; if (fits(g, (h * F.s))) s += lettering(g, { x: x + nu * F.s, y: y + nv * F.s, h: h * F.s, text: letter, colour: nucPal.outline, id: `${id}-letter`, turn: -turn }).body }
  return { defs: b.defs + (glossOn() ? '' : linGrad(`${id}-nucleus-gradient`, F, [nu - NR, nv - NR, nu + NR, nv + NR], nucPal)), body: group(id, F, turn, s), parts }
}

// =====================================================================================================================
// Surface protein of an immune cell, standing on the membrane at x, y and pointing up before `turn`, `size` its height
// above the membrane. Rounded domains with one outline (flat, in two tones, below 60 px), stalks through to the
// membrane. kind 'tcr' (α and β chains, each a constant and a variable domain) | 'cd3' (a pair of single domains) |
// 'mhc1' (α3 and β2-microglobulin under the α1–α2 platform with its peptide) | 'mhc2' (two chains under the platform) |
// 'pd1' (one domain on a long stalk) | 'pdl1' (two domains) | 'cd28' (a dimer) | 'nkg2d' (a dimer of knobs) | 'mica'
// (two domains, NKG2D's ligand) | 'car' (a hinge and the two lobes of an scFv) | 'antigen' (a green ball on a stalk) |
// 'bcr' (molecules.mjs's antibody on a short stalk). Options: pal (RECEPTORS[kind] by default), peptide (true; the
// peptide's palette with `peptidePal`), tail (local units of 100 = size: the chains go on through the membrane and into
// the cell, 0 by default), itams (with a tail: dark blocks on the tails, as ITAMs).
// Used by: T cell receptor, B cell receptor, Immune checkpoint, Immune synapse, Cytotoxic killing, Senolytic CAR-T,
// NK cell clearance, CD28-null T cell, Antigen presentation (later redraws).
// Example: surfaceProtein(g, { x: 0, y: 10, size: 30, kind: 'mhc1', turn: 180, id: 'MHC' })
const DOMAINS = {
  // [u, v, rx, ry, tone] (tone 0 base, 1 second chain) and stalks [u, v-top]; v up is negative, membrane at v = 0.
  tcr: { d: [[-9.5, -32, 9, 13, 0], [9.5, -32, 9, 13, 1], [-9.5, -61, 9, 14, 0], [9.5, -61, 9, 14, 1]], st: [[-9.5, -20], [9.5, -20]], w: 40 },
  cd3: { d: [[-9, -28, 8.5, 12, 0], [9, -28, 8.5, 12, 1]], st: [[-9, -16], [9, -16]], w: 36 },
  mhc1: { d: [[-7, -30, 10, 13, 0], [13, -27, 7.5, 9, 1]], st: [[-7, -18]], w: 52, platform: true },
  mhc2: { d: [[-9.5, -30, 9, 13, 0], [9.5, -30, 9, 13, 1]], st: [[-9.5, -18], [9.5, -18]], w: 52, platform: true },
  pd1: { d: [[0, -66, 14, 18, 0]], st: [[0, -48]], w: 30 },
  pdl1: { d: [[0, -30, 13, 15, 0], [0, -64, 14, 17, 0]], st: [[0, -16]], w: 30 },
  cd28: { d: [[-10, -64, 10, 15, 0], [10, -64, 10, 15, 1]], st: [[-6, -50], [6, -50]], w: 42, link: -44 },
  nkg2d: { d: [[-10, -66, 11, 12, 0], [10, -66, 11, 12, 1]], st: [[-6, -54], [6, -54]], w: 44 },
  mica: { d: [[0, -30, 13, 15, 0], [0, -64, 14, 17, 0]], st: [[0, -16]], w: 30 },
  car: { d: [[-9, -80, 9, 11, 0], [9, -80, 9, 11, 1]], st: [[0, -66]], w: 38 },
  antigen: { d: [[0, -66, 17, 17, 0]], st: [[0, -48]], w: 34 },
}
export function surfaceProtein(g, { x, y, size, turn = 0, id, w, kind = 'tcr', pal, peptide = true, peptidePal = RECEPTORS.peptide, tail = 0, itams = false, fat = 1 }) {
  id ??= kind
  pal ??= RECEPTORS[kind]
  // The local frame: 100 units are `size` (the height); its origin at the foot, so v runs from -100 to the tail.
  const s = size / 100, px = s * g.k, ext = size * g.k
  const F = { s, px, ext, cx: g.X(x), cy: g.Y(y), P: ([u, v]) => g.P([x + u * fat * s, y + v * s]) }
  F.D = (d) => d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, u, v) => P2(F.P([+u, +v])))
  const flat = ext < 60
  w ??= f(clamp(ext * 0.035, 3.5, 6))
  const parts = [[kind, pal]]
  let s1 = '', defs = ''
  if (kind === 'bcr') {
    // molecules.mjs's antibody, its stem ending at v = -6 (its own frame: stem foot at 42 + half its width, arms at -45).
    const S = size / 0.98, c = Math.cos(rad(turn)), sn = Math.sin(rad(turn)), off = -(0.42 + 0.06) * S - 6 * s
    const ab = antibody(g, { x: x - sn * off, y: y + c * off, size: S, turn, id: `${id}-antibody`, pal })
    s1 += strokePath(lineD(F, [[0, -8], [0, tail || 0.5]]), pal.outline, Math.max(3.5, w * 1.6)) + strokePath(lineD(F, [[0, -8], [0, tail || 0.5]]), pal.small, Math.max(1.6, w * 0.7))
    if (tail && itams) s1 += [0.5, 0.8].map((t) => fillPath(roundPoly(F, [[-3, tail * t - 3], [3, tail * t - 3], [3, tail * t + 3], [-3, tail * t + 3]], 1.2), pal.outline)).join('')
    return { defs: ab.defs, body: `<g id="${id}"${turn ? ` transform="rotate(${f(turn)} ${f(F.cx)} ${f(F.cy)})"` : ''}>${s1}</g>` + ab.body, parts: [['antibody', pal]] }
  }
  const spec = DOMAINS[kind]
  if (!spec) throw new Error(`surfaceProtein: no kind "${kind}"`)
  const tone = (t) => (flat ? (t ? pal.outline : pal.small) : t ? pal.shadow : `url(#${id}-gradient)`)
  if (!flat) defs += boxGrad(`${id}-gradient`, pal)
  // Stalks (and tails through the membrane), drawn first: tubes 4.5 units wide (times `fat`) with the outline round them.
  const T = 4.5 * fat * px, sw_ = flat ? Math.max(2, T) : T + 2 * w
  const stalks = spec.st.map(([u, top]) => [[u, top], [u, tail ? tail : 0.5]])
  if (spec.link) stalks.push([[spec.st[0][0], spec.link], [spec.st[1][0], spec.link]])
  s1 += stalks.map((p) => strokePath(lineD(F, p), pal.outline, sw_)).join('')
  if (!flat) s1 += stalks.map((p) => strokePath(lineD(F, p), pal.small, T)).join('')
  if (tail && itams) s1 += spec.st.map(([u]) => [0.45, 0.75].map((t) => fillPath(roundPoly(F, [[u - 2.6, tail * t - 3], [u + 2.6, tail * t - 3], [u + 2.6, tail * t + 3], [u - 2.6, tail * t + 3]], 1), pal.outline)).join('')).join('')
  if (kind === 'car') s1 += strokePath(lineD(F, [[-6, -72], [0, -66], [6, -72]]), pal.outline, sw_) + (flat ? '' : strokePath(lineD(F, [[-6, -72], [0, -66], [6, -72]]), pal.small, T))
  // The platform of MHC: a rounded block with its groove, the peptide lying in it.
  if (spec.platform) {
    const pl = roundPoly(F, [[-24, -70], [24, -70], [24, -47], [-24, -47]], 9)
    s1 += fillPath(pl, tone(0), flat ? '' : pal.outline, w)
    if (!flat) s1 += strokePath(lineD(F, [[-14, -70], [14, -70]]), pal.outline, w * 0.9)
    if (peptide) { s1 += fillPath(roundPoly(F, [[-15, -76], [15, -76], [15, -68], [-15, -68]], 4), flat ? peptidePal.small : peptidePal.base, flat ? '' : peptidePal.outline, w * 0.8); parts.push(['peptide', peptidePal]) }
  }
  s1 += spec.d.map(([u, v, rx, ry, t]) => (flat ? ell(F, u, v, rx * fat, ry, 0, tone(t)) : ell(F, u, v, rx * fat, ry, 0, tone(t), pal.outline, w))).join('')
  return { defs, body: `<g id="${id}"${turn ? ` transform="rotate(${f(turn)} ${f(F.cx)} ${f(F.cy)})"` : ''}>${s1}</g>`, parts }
}

// =====================================================================================================================
// Target cell: a cell of a tissue or tumour that immune cells meet or kill, its outline gently lumpy (as SiliCoDraw's
// tumour cells), a lilac nucleus. Options: pal (TUMOUR; SENESCENT, APC or any), state 'healthy' | 'damaged' (a crack
// across it, as Autoimmunity) | 'dying' (apoptotic blebs bulging out on one side, the nucleus broken into fragments);
// blebs (degrees, where the blebs bulge: 60, lower right); contact (degrees: flattened on that side against another
// cell); seed (varies the lumps); aspect (height / width, 1).
// Used by: Cytotoxic killing, Senolytic CAR-T, NK cell clearance, Autoimmunity, Immune checkpoint and Immune synapse (via
// synapse), Opsonisation (later).
// Example: targetCell(g, { x: 20, y: 0, size: 50, state: 'dying', id: 'tumour-cell' })
export function targetCell(g, { x, y, size, turn = 0, id = 'target-cell', w, pal = TUMOUR, nucPal = NUC, state = 'healthy', blebs = 60, contact, seed = 1, aspect = 1 }) {
  const F = frame(g, x, y, size), dying = state === 'dying'
  const R = dying ? 38 : 47
  w ??= cellW(2 * R * F.px)
  const nw = w * (10 / 12)
  const pts = Array.from({ length: 18 }, (_, i) => {
    const t = (i / 18) * 360, r = R * (1 + 0.075 * Math.sin(rad(5 * t) + seed) + 0.045 * Math.cos(rad(7 * t) + 2 * seed))
    let p = polar(t, r); p = [p[0], p[1] * aspect]
    if (contact == null) return p
    const u = polar(contact, 1), d = p[0] * u[0] + p[1] * u[1], lim = R * 0.8
    return d > lim ? [p[0] - u[0] * (d - lim), p[1] - u[1] * (d - lim)] : p
  })
  const d = smooth(F, pts)
  let s = '', defs = ''
  const parts = [['cytoplasm', pal], ['nucleus', nucPal]]
  // Blebs: three round buds on the far side, each outlined, under the cell's fill so that they join it.
  if (dying) {
    const bl = [[0, 44, 9], [-22, 41, 7], [21, 43, 5.5]].map(([da, r, rr]) => [...polar(blebs + da, r), rr])
    s += `<g id="${id}-blebs">${bl.map(([u, v, r]) => circ(F, u, v, r, pal.base, pal.outline, w * 0.85)).join('')}</g>`
  }
  const b = bodyOf(F, turn, id, d, pal, w, 2 * R * F.px, [-R, -R, R, R], [-R * 0.55, -R * 0.6, R * 0.6, R * 0.22, -40])
  defs += b.defs
  s += `<g id="${id}-cytoplasm">${b.body}</g>`
  const [nu, nv] = contact == null ? [-R * 0.06, -R * 0.04] : polar(contact + 180, R * 0.18)
  if (dying) {
    const fr = [[-6, -4, 6], [6, 3, 5], [-3, 9, 4], [8, -8, 3.4]].map(([u, v, r]) => [nu + u * R / 38, nv + v * R / 38, r * R / 38])
    s += `<g id="${id}-nucleus">${fr.map(([u, v, r]) => circ(F, u, v, r, nucPal.small, F.ext >= 50 ? nucPal.outline : '', nw * 0.6)).join('')}</g>`
  } else {
    const NR = R * 0.4
    s += `<g id="${id}-nucleus">${ell(F, nu, nv, NR, NR * 0.88, 0, nucPal.base, nucPal.outline, nw)}</g>`
    if (state === 'damaged') s += `<g id="${id}-damage">${strokePath(lineD(F, [[R * 0.98, R * 0.22], [R * 0.6, R * 0.16], [R * 0.72, R * 0.36], [R * 0.36, R * 0.3]]), pal.outline, Math.max(2, w * 0.55))}</g>`
  }
  return { defs, body: group(id, F, turn, s), parts }
}

// =====================================================================================================================
// Immune synapse: a lymphocyte (left) pressed against another cell (right), both flattened where they meet, with pairs
// of receptor and ligand across the narrow cleft. Options: pairs 'tcr' (TCR with MHC and peptide; the right cell an APC) |
// 'pd1' (PD-1 with PD-L1; a tumour cell) | 'car' (CAR with its antigen; a tumour cell, the T cell's knobs amber as on the
// approved CAR-T cell) | 'nkg2d' (NKG2D with MICA; an NK cell and a senescent cell); count (pairs, 3); left (lymphocyte
// kind 'T' | 'NK'; by pairs); right (a palette for the other cell); state (the other cell's: 'healthy' | 'dying');
// granules (cytotoxic granules gathered at the synapse, some crossing; true for 'car' and 'nkg2d'); block (an antibody
// in the cleft over the upper pair: checkpoint blockade); gap (the cleft, in local units, 9).
// Used by: Immune synapse, Immune checkpoint, Cytotoxic killing, Senolytic CAR-T, NK cell clearance of senescent cells.
// Example: synapse(g, { x: 0, y: 0, size: 100, pairs: 'pd1', block: true, id: 'synapse' })
export function synapse(g, { x, y, size, turn = 0, id = 'synapse', pairs = 'tcr', count = 3, left, right, state = 'healthy', granules, block = false, gap = 12 }) {
  const F = frame(g, x, y, size)
  left ??= pairs === 'nkg2d' ? 'NK' : 'T'
  right ??= { tcr: APC, pd1: TUMOUR, car: TUMOUR, nkg2d: SENESCENT }[pairs]
  granules ??= pairs === 'car' || pairs === 'nkg2d'
  const [lk, rk] = { tcr: ['tcr', 'mhc1'], pd1: ['pd1', 'pdl1'], car: ['car', 'antigen'], nkg2d: ['nkg2d', 'mica'] }[pairs]
  // Two cells about 48 across, each flattened (at 0.78 and 0.8 of its radius) on the side that faces the other, the
  // flat faces `gap` apart. A lymphocyte's body is 34 of its 100 (its knobs reach the rest), a target cell's 47 (38 dying).
  const sL = 50, sR = 46, rL = (left === 'NK' ? 0.47 : 0.34) * sL, rR = (state === 'dying' ? 0.38 : 0.47) * sR
  const cxL = -(gap / 2 + rL * 0.78), cxR = gap / 2 + rR * 0.8
  const L = lymphocyte(g, { x: x + cxL * F.s, y, size: sL * F.s, kind: left, contact: 90, id: `${id}-${left === 'NK' ? 'NK-cell' : 'T-cell'}`, ...(pairs === 'car' ? { receptorPal: { outline: RECEPTORS.car.outline, small: RECEPTORS.car.small } } : {}) })
  const Rc = targetCell(g, { x: x + cxR * F.s, y, size: sR * F.s, pal: right, state, contact: 270, blebs: 75, id: `${id}-other-cell` })
  const ys = Array.from({ length: count }, (_, i) => (count === 1 ? 0 : -13 + (26 * i) / (count - 1)))
  const h = gap / 2 + 0.6 // each protein reaches a little past the middle of the cleft
  const prot = []
  ys.forEach((v, i) => {
    prot.push(surfaceProtein(g, { x: x + (-gap / 2 - 0.3) * F.s, y: y + v * F.s, size: h * F.s, kind: lk, turn: 90, fat: 1.7, id: `${id}-${lk}-${i + 1}` }))
    prot.push(surfaceProtein(g, { x: x + (gap / 2 + 0.3) * F.s, y: y + v * F.s, size: h * F.s, kind: rk, turn: -90, fat: 1.7, id: `${id}-${rk}-${i + 1}` }))
  })
  let extra = '', defs = ''
  const parts = [...L.parts, ...Rc.parts, ...prot.flatMap((p) => p.parts)]
  if (granules) {
    const gr = [[-gap / 2 - 5, -7, 2.4], [-gap / 2 - 4.5, 3, 2.6], [-gap / 2 - 8.5, -1.5, 2.1], [-gap / 2 - 7.5, 9, 2], [-1, -6, 1.5], [1.5, 7, 1.4]]
    extra += `<g id="${id}-granules">${gr.map(([u, v, rr]) => circ(F, u, v, rr, GRANZYME.small)).join('')}</g>`
    parts.push(['granules', GRANZYME])
  }
  if (block) {
    const ab = antibody(g, { x, y: y + (ys[0] - 11) * F.s, size: 14 * F.s, turn: 180, id: `${id}-blocking-antibody` })
    defs += ab.defs; extra += ab.body; parts.push(['antibody', ANTIBODY])
  }
  const uniq = parts.filter(([, p], i) => parts.findIndex(([, q]) => q.base === p.base) === i)
  return { defs: L.defs + Rc.defs + prot.map((p) => p.defs).join('') + defs, body: group(id, F, turn, L.body + Rc.body + prot.map((p) => p.body).join('') + extra), parts: uniq }
}

// =====================================================================================================================
// Cytokines: flat dots of two kinds, `size` the diameter of what they fill. layout 'cloud' (scattered evenly in a disc,
// count dots) | 'rings' (rings of dots round an empty middle of `inner` units, as a cell releasing waves of them; rings,
// the dots larger outwards) | 'stream' (a line of dots along +x, as a release; count). Options: pal (CYTOKINE), pal2
// (the second kind, CYTOKINE2; null for one kind), dot (diameter of a dot, local units of 100), seed.
// Used by: Cytokine storm, Inflammaging, Inflammation, Sepsis, Allergy (histamine, with the mast cell's rose), Fever.
// Example: cytokines(g, { x: 0, y: 0, size: 96, layout: 'rings', inner: 48, id: 'cytokines' })
export function cytokines(g, { x, y, size, turn = 0, id = 'cytokines', layout = 'cloud', count = 9, rings = 3, inner = 40, pal = CYTOKINE, pal2 = CYTOKINE2, dot, seed = 1 }) {
  const F = frame(g, x, y, size), pts = []
  if (layout === 'rings') {
    for (let k = 0; k < rings; k++) {
      const r = inner / 2 + ((50 - inner / 2) * (k + 0.5)) / rings, dd = (dot ?? 7) * (0.8 + 0.25 * k), n = Math.max(5, Math.round((2 * Math.PI * r) / (dd * 2.6)))
      for (let i = 0; i < n; i++) pts.push([...polar(((i + 0.5 * (k % 2) + 0.3 * wob(i + 9 * k, seed)) / n) * 360, r + 1.2 * wob(i * 3 + k, seed)), dd / 2, (i + k) % 2])
    }
  } else if (layout === 'stream') {
    for (let i = 0; i < count; i++) { const t = count === 1 ? 0.5 : i / (count - 1); pts.push([-50 + (dot ?? 9) / 2 + t * (100 - (dot ?? 9)), 6 * wob(i, seed), ((dot ?? 9) / 2) * (1 - 0.25 * t), i % 2]) }
  } else {
    const dd = dot ?? 100 / Math.sqrt(count) / 2.2
    for (let i = 0; i < count; i++) { const r = (50 - dd / 2) * Math.sqrt((i + 0.5) / count), a = i * 137.508 + seed * 40; pts.push([...polar(a, r), dd / 2 * (0.85 + 0.15 * wob(i, seed)), i % 2]) }
  }
  const one = !pal2
  const draw = (k, P) => pts.filter((p) => one || p[3] === k).map(([u, v, r]) => circ(F, u, v, r, P.small)).join('')
  const body = `<g id="${id}-first">${draw(0, pal)}</g>` + (one ? '' : `<g id="${id}-second">${draw(1, pal2)}</g>`)
  return { defs: '', body: group(id, F, turn, body), parts: one ? [['cytokines', pal]] : [['cytokines', pal], ['second cytokines', pal2]] }
}

// =====================================================================================================================
// A coat of small antibodies round a circle of diameter `size` (a cell, a bacterium, a pollen grain): Ys standing on it,
// stems on the surface and arms out ('out': receptors, BCRs, IgE on a mast cell), or arms on the surface and stems out
// ('in': antibodies bound to a microbe or a self cell, opsonins). Flat, in the B cell's amber (deep 75, small tone); from
// 50 px a Y is molecules.mjs's antibody. Options: count (8), from, to (degrees, 0 up, clockwise: the arc that carries
// them; the whole circle by default), angles (a list instead), length (of a Y, local units: 30), facing, pal, aspect
// (height / width of the surface, 1: an ellipse).
// Used by: Autoimmunity, Opsonisation, Allergy, Age-associated B cell, Vaccine response in old age, B cell receptor.
// Example: antibodyCoat(g, { x: 0, y: 0, size: 60, count: 6, facing: 'in', id: 'opsonins' })
export function antibodyCoat(g, { x, y, size, turn = 0, id = 'antibodies', count = 8, from = 0, to = 360, angles, length = 30, facing = 'out', pal = SMALL_Y, aspect = 1 }) {
  const F = frame(g, x, y, size)
  angles ??= Array.from({ length: count }, (_, i) => from + ((to - from) * (to - from >= 360 ? i : i + 0.5)) / (to - from >= 360 ? count : count))
  const Ypx = length * F.px, big = Ypx >= 50
  let s = '', defs = ''
  angles.forEach((a, i) => {
    const t = rad(a), ex = Math.sin(t) * 50, ey = -Math.cos(t) * 50 * aspect
    const nl = Math.hypot(Math.sin(t) * aspect, Math.cos(t)) || 1, nx = (Math.sin(t) * aspect) / nl, ny = -Math.cos(t) / nl
    const dir = facing === 'out' ? 1 : -1, ang = (Math.atan2(ny, nx) * 180) / Math.PI + 90 + (facing === 'out' ? 0 : 180)
    const mid = [ex + nx * length * 0.5, ey + ny * length * 0.5]
    if (big) {
      const ab = antibody(g, { x: x + mid[0] * F.s, y: y + mid[1] * F.s, size: length * F.s * 1.08, turn: ang, id: `${id}-${i + 1}`, pal: ANTIBODY })
      defs += ab.defs; s += ab.body
    } else {
      // Stem 0–40 % of the length, arms to 100 %, 0.36 of the length apart at their tips.
      const at = (k, side) => { const along = k * length, across = side * length * 0.2; const bx = facing === 'out' ? ex : ex + nx * length, by = facing === 'out' ? ey : ey + ny * length; return [bx + nx * along * dir + -ny * across, by + ny * along * dir + nx * across] }
      const lw = Math.max(2.4, length * F.px * 0.2)
      s += strokePath(lineD(F, [at(0, 0), at(0.42, 0)]) + ' ' + lineD(F, [at(1, -1), at(0.42, 0), at(1, 1)]), pal.small, lw)
    }
  })
  return { defs, body: group(id, F, turn, `<g id="${id}-ys">${s}</g>`), parts: [['antibodies', big ? ANTIBODY : pal]] }
}

// =====================================================================================================================
// Crowd: people (assays.mjs's busts) in rows, each coloured by what the infection did to them: status a string of one
// letter per person, row by row: 's' susceptible (the accent blue), 'i' infected (red), 'r' immune or vaccinated
// (green), 'q' isolated (grey), '.' nobody. `size` is the width of the crowd. Options: cols (4), gap (between people,
// share of a person's width, 0.3), stagger (every second row shifted by half a person, true).
// Used by: Herd immunity, Social distancing, Quarantine, Pandemic (later), Transmission tree (case colours).
// Example: crowd(g, { x: 0, y: 0, size: 90, cols: 4, status: 'rrsr rirs rrrs', id: 'crowd' })
export function crowd(g, { x, y, size, turn = 0, id = 'crowd', status = 'ssss', cols = 4, gap = 0.3, stagger = true }) {
  const F = frame(g, x, y, size), rows = status.trim().split(/\s+/)
  const cw = 100 / (cols + (stagger && rows.length > 1 ? 0.5 : 0) + (cols - 1) * gap), step = cw * (1 + gap), rh = cw * 1.15
  const parts = [], bodies = []
  let defs = ''
  rows.forEach((row, j) => {
    ;[...row].forEach((c, i) => {
      if (c === '.') return
      const key = { s: 'susceptible', i: 'infected', r: 'immune', v: 'immune', q: 'isolated' }[c] ?? 'susceptible'
      const u = -50 + cw / 2 + i * step + (stagger && j % 2 ? step / 2 : 0), v = (j - (rows.length - 1) / 2) * rh
      const p = person(g, { x: x + u * F.s, y: y + v * F.s, size: cw * F.s, pal: STATUS[key], id: `${id}-${key}-${j + 1}-${i + 1}` })
      defs += p.defs; bodies.push(p.body)
      if (key !== 'isolated' && !parts.some(([n]) => n === key)) parts.push([key, STATUS[key]])
    })
  })
  return { defs, body: group(id, F, turn, bodies.join('')), parts: [...parts, ['skin', soft(PEACH)]] }
}

// ---------- the parts sheet ----------
const at = (px) => (px / 460) * 100
const V = (name, opts) => ({ name, size: 100, draw: (g) => virus(g, { x: 0, y: 0, size: 100, ...opts }) })
const Vs = (name, px, opts) => ({ name, size: 100, draw: (g) => virus(g, { x: 0, y: 0, size: at(px), ...opts }) })
const M = (name, opts, px) => ({ name, size: 100, draw: (g) => microbe(g, { x: 0, y: 0, size: px ? at(px) : 100, ...opts }) })
const S = (name, kind, opts = {}) => ({ name, size: 100, draw: (g) => surfaceProtein(g, { x: 0, y: opts.tail ? 10 : 46, size: opts.size ?? 88, kind, ...opts }) })
export const DEMOS = [
  V('Virus, enveloped', {}), V('Virus, coronavirus', { kind: 'corona' }), V('Virus, influenza', { kind: 'influenza' }), V('Virus, HIV', { kind: 'hiv' }),
  V('Virus, herpesvirus', { kind: 'herpes' }), V('Virus, naked icosahedral', { kind: 'naked' }), V('Virus, bacteriophage', { kind: 'phage' }),
  Vs('Virus, enveloped, 40 px', 40, {}), Vs('Virus, coronavirus, 40 px', 40, { kind: 'corona' }), Vs('Virus, influenza, 60 px', 60, { kind: 'influenza' }), Vs('Virus, HIV, 60 px', 60, { kind: 'hiv' }), Vs('Virus, herpesvirus, 50 px', 50, { kind: 'herpes' }),
  M('Bacterium, Gram-negative with nucleoid', { envelope: 'negative', nucleoid: true }), M('Bacterium with plasmid', { plasmid: true, flagellum: false }),
  M('Bacterium, capsule', { capsule: true }), M('Bacterium, endospore', { spore: true, flagellum: false, aspect: 0.36 }), M('Mycobacterium, waxy and beaded', { capsule: 'waxy', beads: true, aspect: 0.26 }),
  M('Bacterium, Gram stain positive', { stain: 'positive', flagellum: false }), M('Coccus, Gram stain positive', { stain: 'positive', shape: 'coccus' }), M('Bacterium, Gram stain negative', { stain: 'negative', flagellum: false }),
  M('Diplococcus, oval (Akkermansia)', { shape: 'oval', pair: true, pal: soft(hueOf('#e0708a')) }), M('Bacterium, oval', { shape: 'oval' }),
  M('Bacterium, capsule, 50 px', { capsule: true }, 50), M('Bacterium, Gram-negative, 40 px', { envelope: 'negative', flagellum: false }, 40), M('Bacterium, endospore, 40 px', { spore: true, flagellum: false }, 40),
  { name: 'Lymphocyte, T', size: 100, draw: (g) => lymphocyte(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Lymphocyte, B', size: 100, draw: (g) => lymphocyte(g, { x: 0, y: 0, size: 100, kind: 'B' }) },
  { name: 'Lymphocyte, NK', size: 100, draw: (g) => lymphocyte(g, { x: 0, y: 0, size: 100, kind: 'NK' }) },
  { name: 'Lymphocyte, lettered CD8', size: 100, draw: (g) => lymphocyte(g, { x: 0, y: 0, size: 100, kind: 'plain', letter: '8', pal: CLONES[3] }) },
  { name: 'Lymphocytes, clones, 30 px', size: 100, draw: (g) => { const ps = CLONES.map((p, i) => lymphocyte(g, { x: -36 + (i % 4) * 24, y: i < 4 ? -14 : 14, size: at(30) * 1.6, kind: 'plain', pal: p, id: `clone-${i + 1}` })); return { defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join(''), parts: ps.flatMap((p) => p.parts).slice(0, 2) } } },
  { name: 'Lymphocyte, T, 40 px', size: 100, draw: (g) => lymphocyte(g, { x: 0, y: 0, size: at(40) }) },
  S('Receptor, TCR', 'tcr'), S('Receptor, TCR with CD3 tails', 'tcr', { tail: 40, itams: true, size: 70 }), S('Receptor, MHC class I with peptide', 'mhc1'), S('Receptor, MHC class II', 'mhc2'),
  S('Receptor, PD-1', 'pd1'), S('Ligand, PD-L1', 'pdl1'), S('Receptor, CD28', 'cd28'), S('Receptor, NKG2D', 'nkg2d'), S('Ligand, MICA', 'mica'), S('Receptor, CAR', 'car'), S('Antigen on a cell', 'antigen'),
  S('Receptor, BCR', 'bcr', { size: 80, y: 40, tail: 0 }), S('Receptor, CD3', 'cd3'),
  { name: 'Receptors, 40 px', size: 100, draw: (g) => { const ps = ['tcr', 'mhc1', 'pd1', 'pdl1', 'car'].map((k, i) => surfaceProtein(g, { x: -40 + i * 20, y: 10, size: at(40), kind: k, id: `r${i}` })); return { defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join(''), parts: ps.flatMap((p) => p.parts).slice(0, 1) } } },
  { name: 'Synapse, TCR and MHC', size: 100, draw: (g) => synapse(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Synapse, PD-1 blocked', size: 100, draw: (g) => synapse(g, { x: 0, y: 0, size: 100, pairs: 'pd1', block: true }) },
  { name: 'Synapse, CAR-T killing', size: 100, draw: (g) => synapse(g, { x: 0, y: 0, size: 100, pairs: 'car', state: 'dying' }) },
  { name: 'Synapse, NK and senescent cell', size: 100, draw: (g) => synapse(g, { x: 0, y: 0, size: 100, pairs: 'nkg2d', state: 'dying' }) },
  { name: 'Target cell', size: 100, draw: (g) => targetCell(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Target cell, damaged', size: 100, draw: (g) => targetCell(g, { x: 0, y: 0, size: 100, state: 'damaged', pal: SENESCENT }) },
  { name: 'Target cell, dying', size: 100, draw: (g) => targetCell(g, { x: 0, y: 0, size: 100, state: 'dying' }) },
  { name: 'Target cell, dying, 40 px', size: 100, draw: (g) => targetCell(g, { x: 0, y: 0, size: at(40), state: 'dying' }) },
  { name: 'Cytokines, cloud', size: 100, draw: (g) => cytokines(g, { x: 0, y: 0, size: 100, count: 14 }) },
  { name: 'Cytokines, rings', size: 100, draw: (g) => cytokines(g, { x: 0, y: 0, size: 100, layout: 'rings', inner: 46 }) },
  { name: 'Cytokines, stream', size: 100, draw: (g) => cytokines(g, { x: 0, y: 0, size: 100, layout: 'stream', count: 6, pal2: null }) },
  { name: 'Antibody coat, out', size: 100, draw: (g) => antibodyCoat(g, { x: 0, y: 0, size: 62, count: 8 }) },
  { name: 'Antibody coat, bound', size: 100, draw: (g) => antibodyCoat(g, { x: 0, y: 0, size: 62, count: 7, facing: 'in', from: -120, to: 120 }) },
  { name: 'Antibody coat, large', size: 100, draw: (g) => antibodyCoat(g, { x: 0, y: 0, size: 50, count: 6, length: 25 }) },
  { name: 'Crowd, herd immunity', size: 100, draw: (g) => crowd(g, { x: 0, y: 0, size: 100, status: 'rrsr rirs rrrr' }) },
  { name: 'Crowd, 40 px people', size: 100, draw: (g) => crowd(g, { x: 0, y: 0, size: at(200), cols: 4, status: 'srir qsrs' }) },
  { name: 'Artery, vein and lymphatic', size: 100, draw: (g) => { const vs = [[ARTERY, -20, 'artery'], [VEIN, 0, 'vein'], [LYMPH, 20, 'lymphatic']].map(([pal, v, id]) => vessel(g, { points: [[-45, v], [-10, v - 8], [20, v + 6], [45, v]], size: 26, thick: 0.4, ends: 'open', pal, id })); return { defs: vs.map((p) => p.defs).join(''), body: vs.map((p) => p.body).join(''), parts: vs.flatMap((p) => p.parts) } } },
]
