// Parts: the organelles every redrawn icon shares (nucleus, endoplasmic reticulum, ribosome, lysosome, peroxisome,
// vesicle, endosome, multivesicular body, lipid droplet, centrosome, mitochondrion, damaged mitochondrion, Golgi
// apparatus), drawn once in the soft look of icon-drawings/STYLE.md so that an organelle looks the same in every icon.
// Their look is that of the drafts in ../cells/ct01.mjs (nucleus, ER, ribosome, lysosome, peroxisome, vesicle),
// ct02.mjs (centrosome) and ct07.mjs (lipid droplet), from SiliCoDraw (github.com/Alex-D-C/SiliCoDraw, MIT,
// © 2026 Alexander David Carlsson; see ../../LICENSE-SiliCoDraw.txt). The mitochondrion and the Golgi apparatus are the
// owner's own (../mitokit.mjs, ../iconkit.mjs) and are only placed here.
//
// Every part: fn(g, { x, y, size, turn, id, w, pal, ...options }) → { defs, body, parts }, with g a frame of
// page() in ../cellkit.mjs; x, y, size (the longer extent, outline included) in its units; turn in degrees about x, y;
// w the main outline in page pixels (by default from the size on the page); every id inside starts with `id`.
// A part small on the page drops what would not read (pores, chromatin, the pale band of a membrane, highlights):
// see each function. Sheet of all of them: node parts/sheet.mjs <folder> organelles
import { NUC, PEACH, circleD, glossOn, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex, toLch } from '../colour.mjs'
import { placeIcon } from '../iconkit.mjs'
import { MITO, standardMito } from '../mitokit.mjs'
import { f } from '../shapes.mjs'
import { gloss, glossTones, pathPoints } from './surfaces.mjs'

// ---------- the colours of the set (OKLCH hues) ----------
// ER peach with terracotta ribosomes (30°, moved away from the peach); lysosome rose (355°); peroxisome green;
// lipids peach, neutral lipid yellow (rich), perilipin green; centrioles the protein blue (267°), their microtubules 225°.
// Vesicles: the draft's lilac (315°) is the nucleus's (319°), and vesicles stand beside nuclei in most cells: moved to
// aqua (200°), clear of the nucleus, the cytoplasm's blue (245°), the peroxisome (158°) and the lysosome.
// The mRNA on a free ribosome is rose like all RNA, but 15° is only 15° from the ribosome: here it is 352° (see ribosome).
export const HUES = {
  er: hueOf('#f8d7b4'), ribosome: 30, rna: 15, rnaOnRibosome: 352, lysosome: 355, peroxisome: hueOf('#cfe8d8'),
  vesicle: 200, cargo: 75, fat: hueOf('#fde68a'), perilipin: hueOf('#5fae8b'), centriole: hueOf('#4f6bb8'), tubule: 225,
}
const LIPID = soft(PEACH)
/** Terracotta of a free ribosome: deeper than `soft` (a ribosome is a dense particle, known by its colour on the ER),
 * paler than `deep` so that a large one keeps the soft look; its small tone is the ER's ribosome dots (`deep().small`). */
export const terracotta = (h) => ({ ...deep(h), light: toHex({ l: 0.95, c: 0.03, h }), base: toHex({ l: 0.87, c: 0.065, h }), shadow: toHex({ l: 0.8, c: 0.09, h }), outline: toHex({ l: 0.56, c: 0.13, h }) })

// ---------- helpers ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
/** A frame whose units are K page pixels, with its 0,0 at x, y of g: the part is drawn in its own units there. */
// With the gloss on, every gradient a part writes is noted (`glossHandled`), so that a runner that also turns hand-drawn
// bodies glossy as SVG text (cells/glossy-ct.mjs) leaves the parts' own as they are.
const HANDLED = new Set()
export const glossHandled = () => HANDLED
const frame = (g, x, y, K, [ox, oy] = [0, 0]) => {
  const q = page(K, [(256 - g.X(x)) / K + ox, (256 - g.Y(y)) / K + oy])
  if (glossOn()) { const grad = q.grad; q.grad = (id, ...rest) => { HANDLED.add(id); return grad(id, ...rest) } }
  return q
}
/** The group of a part, turned about its middle. */
const wrap = (g, x, y, turn, id, inner) => `<g id="${id}"${turn ? ` transform="rotate(${f(turn)} ${f(g.X(x))} ${f(g.Y(y))})"` : ''}>${inner}</g>`
/** One gradient that lights every shape that uses it from its own top left. */
const boxGrad = (id, pal) => (glossOn() && HANDLED.add(id), `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`)
/** The main outline of a round part from its size on the page: 10 on a large one, never under 3.5. */
const roundLine = (px, max = 10) => f(clamp(px * 0.065, 3.5, max))
/** A highlight of a round body (radii rx, ry in its units) at its top left, as the nucleus of cellkit has it. */
const shine = (q, x, y, rx, ry, pal) => q.hl(x - rx * 0.42, y - ry * 0.45, f(rx * q.k * 0.24), f(ry * q.k * 0.1), -45, pal.light)
/** A rounded rectangle given in units, as a path on the page. */
const rrect = (q, x, y, w, h, r) => {
  const [x0, y0] = q.P([x, y]), W = w * q.k, H = h * q.k, R = Math.min(r * q.k, W / 2, H / 2)
  return `M${f(x0 + R)},${f(y0)} H${f(x0 + W - R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + W)},${f(y0 + R)} V${f(y0 + H - R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + W - R)},${f(y0 + H)} H${f(x0 + R)} A${f(R)},${f(R)} 0 0 1 ${f(x0)},${f(y0 + H - R)} V${f(y0 + R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + R)},${f(y0)} Z`
}
/** A polygon given in units with its corners rounded (radius in units), as a path on the page. */
const roundPoly = (q, pts, r) => {
  const n = pts.length, P = pts.map(q.P), R = r * q.k
  const toward = (a, b, d) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), t = Math.min(d, L / 2) / L; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] }
  let d = ''
  for (let i = 0; i < n; i++) {
    const prev = P[(i - 1 + n) % n], cur = P[i], next = P[(i + 1) % n], a = toward(cur, prev, R), b = toward(cur, next, R)
    d += `${i ? 'L' : 'M'}${f(a[0])},${f(a[1])} Q${f(cur[0])},${f(cur[1])} ${f(b[0])},${f(b[1])} `
  }
  return d + 'Z'
}
/** An open curve given in units (absolute M, L and C only), drawn as a line with round ends; width in pixels. */
const curve = (q, d, colour, w) => `<path d="${q.D(d)}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"/>`
/** An ellipse of `n` dashes with round ends (radii in units, width in pixels; `share` of each step is drawn). */
const dashes = (q, rx, ry, n, share, colour, w) => {
  const a = rx * q.k, b = ry * q.k, P = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b))), step = P / n
  return `<ellipse cx="${f(q.X(0))}" cy="${f(q.Y(0))}" rx="${f(a)}" ry="${f(b)}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="round" stroke-dasharray="${f(Math.max(0.1, step * share - w))} ${f(step * (1 - share) + w)}"/>`
}
const deepOf = (pal) => deep(toLch(pal.base).h)

// ---------- the gloss of cells (STYLE.md), with setGloss(true) of ../cellkit.mjs ----------
// A closed body gets the face-on gloss of `gloss` (./surfaces.mjs) in place of its highlight, its gradient ending in the
// gloss's end tone; a nucleus is flat. Bodies under 40 px on the page stay flat, under 90 px they get the shade only.
// Thin or stacked parts stay flat (ER sheets, centriole lines, microtubules, ribosome subunits under 60 px).
/** The tone paths of the gloss over a closed shape (a page path `d`) of a part at x, y turned by `turn`; '' when off. */
const glossOf = (g, x, y, turn, d, pal, inset, px) => {
  if (!glossOn() || px < 40) return ''
  const G = gloss({ fills: [pathPoints(d)] }, { inset, turn, about: [g.X(x), g.Y(y)] }), T = glossTones(pal)
  return ['shade', 'shadow', ...(px >= 90 ? ['lit', 'highlight'] : [])].map((k) => (G[k] ? `<path d="${G[k]}" fill="${T[k]}"/>` : '')).join('')
}
/** A palette whose gradient ends in the gloss's end tone when the gloss is on. */
const glossPal = (pal) => (glossOn() ? { ...pal, shadow: glossTones(pal).end } : pal)
/** An ellipse in units, as a page path. */
const ellD = (q, cx, cy, rx, ry) => { const [X, Y] = q.P([cx, cy]), a = rx * q.k, b = ry * q.k; return `M${f(X - a)},${f(Y)} A${f(a)},${f(b)} 0 1 0 ${f(X + a)},${f(Y)} A${f(a)},${f(b)} 0 1 0 ${f(X - a)},${f(Y)} Z` }

// ---------- nucleus ----------
// The nucleus of every cell: the shared lilac NUC, a gradient, a 10 px envelope and a highlight (as cellkit's
// `nucleus`). Options: pores (the envelope as two membranes, the inner one broken by pores), nucleolus, chromatin
// (three threads), oval (true for 0.72, or the height as a share of the width; size is then the width). Below 64 px on
// the page (`simple`, which can be forced either way) pores and chromatin are left out and the nucleolus is a flat spot,
// so that a nucleus of a few dozen pixels still reads. Example: nucleus(g, { x: -6, y: -2, size: 32, nucleolus: true })
export function nucleus(g, { x, y, size, turn = 0, id = 'nucleus', w, pal = NUC, pores = false, nucleolus = false, chromatin = false, oval = false, simple }) {
  const px = size * g.k, lw = w ?? roundLine(px), small = simple ?? px < 64
  const ratio = oval === true ? 0.72 : oval || 1
  const q = frame(g, x, y, (px - lw) / 100), R = 50, RY = R * ratio, dark = deepOf(pal)
  // With the gloss on, the nucleus is flat (one fill, no highlight).
  const flatNuc = glossOn(), fillN = flatNuc ? pal.base : `url(#${id}-gradient)`
  let defs = flatNuc ? '' : q.grad(`${id}-gradient`, [-R, -RY, R, RY], pal), body = ''
  if (pores && !small) {
    const ri = 0.87, rd = 0.86
    body += `<g id="${id}-envelope">${q.ellipse(0, 0, R, RY, 0, pal.light, pal.outline, lw)}${q.ellipse(0, 0, R * ri, RY * ri, 0, fillN)}` +
      `${dashes(q, R * rd, RY * rd, clamp(Math.round((Math.PI * 2 * R * q.k) / 80), 6, 16), 0.74, pal.outline, lw * 0.6)}</g>`
  } else body += `<g id="${id}-envelope">${q.ellipse(0, 0, R, RY, 0, fillN, pal.outline, lw)}</g>`
  if (px >= 70 && !flatNuc) body += `<g id="${id}-highlight">${shine(q, 0, 0, R * (pores ? 0.87 : 1), RY * (pores ? 0.87 : 1), pal)}</g>`
  if (chromatin && !small) {
    const s = R / 42
    const threads = ['M-28,-14 C-20,-20 -14,-12 -8,-18', 'M-28,14 C-18,18 -12,8 -4,14', 'M3,-28 C11,-26 13,-18 21,-22']
      .map((d) => d.replace(/(-?\d+),(-?\d+)/g, (_, a, b) => `${f(a * s)},${f(b * s * ratio)}`))
    body += `<g id="${id}-chromatin">${threads.map((d) => curve(q, d, dark.base, clamp(0.045 * R * q.k, 3.5, 10))).join('')}</g>`
  }
  if (nucleolus) {
    const [nx, ny, nr] = [0.24 * R, 0.14 * RY, 0.26 * R * Math.min(1, ratio + 0.15)]
    if (small) body += `<g id="${id}-nucleolus">${q.circle(nx, ny, nr, dark.small)}</g>`
    else {
      defs += q.grad(`${id}-nucleolus-gradient`, [nx - nr, ny - nr, nx + nr, ny + nr], { base: dark.base, shadow: dark.shadow })
      body += `<g id="${id}-nucleolus">${q.circle(nx, ny, nr, `url(#${id}-nucleolus-gradient)`, pal.outline, f(lw * 0.7))}${px >= 150 ? shine(q, nx, ny, nr, nr, pal) : ''}</g>`
    }
  }
  return { defs, body: wrap(g, x, y, turn, id, body), parts: [['nucleus', pal]] }
}

// ---------- endoplasmic reticulum ----------
// Rough ER: a stack of curved sheets (cisternae), peach, bowed round a centre below them like ER beside a nucleus, with
// terracotta ribosomes on both faces of every sheet (both face the cytoplasm; the lumen is inside the sheet).
// Options: ribosomes (false for smooth ER), sheets (how many, 2–5), ribosomePal. Example:
// endoplasmicReticulum(g, { x: 20, y: -10, size: 40, turn: 30, ribosomes: true })
export function endoplasmicReticulum(g, { x, y, size, turn = 0, id = 'er', w, pal = soft(HUES.er), ribosomes = true, sheets = 3, ribosomePal = deep(HUES.ribosome) }) {
  // Small on the page the cross-section of the stack is made thicker (sheets, gaps and ribosomes alike, the bow kept),
  // so that a sheet stays wider than its outline.
  const px = size * g.k, c = clamp(110 / px, 1, 2.2)
  const t = 6 * c, gap = 10 + 2 * t, len = 96, rr = 3 * c, off = t + 2.2 * c, step = 12 * c
  const list = Array.from({ length: sheets }, (_, i) => { const R = 70 + gap * i; return { R, a: len / 2 / R } })
  // Where everything lies, for the box: centre of the bow at 0,0, sheets above it.
  const at = (R, phi) => [R * Math.sin(phi), -R * Math.cos(phi)]
  const dots = []
  if (ribosomes)
    for (const { R, a } of list)
      for (const [r, shift] of [[R + off, 0], [R - off, step / 2]])
        for (let s = -len / 2 + 3 * c + shift; s <= len / 2 - 3 * c; s += step) dots.push(at(r, (s / len) * 2 * a))
  const pts = list.flatMap(({ R, a }) => [-a, -a / 2, 0, a / 2, a].flatMap((p) => [at(R + (ribosomes ? off + rr : t), p), at(R - (ribosomes ? off + rr : t), p), at(R, p).map((v, k) => v + (k ? 0 : Math.sign(p) * (t + (ribosomes ? rr : 0))))]))
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)], E = Math.max(x1 - x0, y1 - y0)
  const lw = w ?? f(clamp(((2 * t * px) / E) * 0.13, 3.5, 9)), K = (px - (ribosomes ? 0 : lw)) / E
  const q = frame(g, x, y, K, [(x0 + x1) / 2, (y0 + y1) / 2])
  const sheet = ({ R, a }) => {
    const P = (r, p) => q.P(at(r, p)), [o0, o1, i1, i0] = [P(R + t, -a), P(R + t, a), P(R - t, a), P(R - t, -a)], ro = (R + t) * K, ri = (R - t) * K, rc = t * K
    return `M${f(o0[0])},${f(o0[1])} A${f(ro)},${f(ro)} 0 0 1 ${f(o1[0])},${f(o1[1])} A${f(rc)},${f(rc)} 0 0 1 ${f(i1[0])},${f(i1[1])} A${f(ri)},${f(ri)} 0 0 0 ${f(i0[0])},${f(i0[1])} A${f(rc)},${f(rc)} 0 0 1 ${f(o0[0])},${f(o0[1])} Z`
  }
  const gleam = ({ R, a }) => {
    const r = R + t * 0.3, [p0, p1] = [q.P(at(r, -a * 0.82)), q.P(at(r, -a * 0.3))]
    return `<path d="M${f(p0[0])},${f(p0[1])} A${f(r * K)},${f(r * K)} 0 0 1 ${f(p1[0])},${f(p1[1])}" fill="none" stroke="${pal.light}" stroke-width="${f(t * 0.5 * K)}" stroke-linecap="round"/>`
  }
  const body =
    (ribosomes ? `<g id="${id}-ribosomes">${dots.map(([u, v]) => { const [X, Y] = q.P([u, v]); return `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(rr * K)}" fill="${ribosomePal.small}"/>` }).join('')}</g>` : '') +
    `<g id="${id}-sheets">${list.map((s) => `<path d="${sheet(s)}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="${lw}" stroke-linejoin="round"/>` + (2 * t * K >= 30 && !glossOn() ? gleam(s) : '')).join('')}</g>`
  return { defs: boxGrad(`${id}-gradient`, pal), body: wrap(g, x, y, turn, id, body), parts: ribosomes ? [['sheets', pal], ['ribosomes', ribosomePal]] : [['sheets', pal]] }
}

// ---------- ribosome ----------
// A free ribosome: the large subunit above, the small one below in a deeper tone of the same terracotta as the
// ribosomes on the ER. Option mRNA: the strand held between the two subunits, rose; since rose RNA (15°) lies only 15°
// from the ribosome, the strand here is 352° (still rose, 38° apart) so that each recolours on its own (rnaPal to change).
// Under 44 px it is two flat ovals without outlines. Example: ribosome(g, { x: 0, y: 0, size: 12, mRNA: true })
export function ribosome(g, { x, y, size, turn = 0, id = 'ribosome', w, pal = terracotta(HUES.ribosome), mRNA = false, rnaPal = deep(HUES.rnaOnRibosome) }) {
  const px = size * g.k, lw = w ?? roundLine(px, 10), flat = px < 44
  const E = mRNA ? 88 : 60, bump = mRNA ? 2.4 / 2 : 0
  const q = frame(g, x, y, (px - (flat || mRNA ? 0 : lw)) / (E + bump * 2))
  const [ly, sy] = mRNA ? [-12, 21] : [-10, 16]
  const lower = { ...pal, base: pal.shadow, shadow: pal.small }
  let defs = '', body = ''
  if (mRNA) body += `<g id="${id}-mRNA">${q.line([[-44, 9.5], [44, 9.5]], rnaPal.small, f(Math.max(3, 2.6 * q.k)))}</g>`
  if (flat) body += `<g id="${id}-large-subunit">${q.ellipse(0, ly, 30, 21, 0, pal.small)}</g><g id="${id}-small-subunit">${q.ellipse(0, sy, 22, 11, 0, pal.outline)}</g>`
  else {
    // With the gloss on, each subunit from 60 px gets it in place of its highlight.
    const gl = glossOn() && px >= 60
    defs = q.grad(`${id}-large-gradient`, [-30, ly - 21, 30, ly + 21], gl ? glossPal(pal) : pal) + q.grad(`${id}-small-gradient`, [-22, sy - 11, 22, sy + 11], gl ? glossPal(lower) : lower)
    const hlL = gl ? glossOf(g, x, y, turn, ellD(q, 0, ly, 30, 21), pal, lw / 2, 60 * q.k) : px >= 100 ? q.hl(-13, ly - 12.5, f(32 * q.k / 5.2), f(10 * q.k / 5.2), -22, pal.light) : ''
    const hlS = gl ? glossOf(g, x, y, turn, ellD(q, 0, sy, 22, 11), lower, lw / 2, 44 * q.k) : px >= 100 ? q.hl(-9, sy - 6.8, f(22 * q.k / 5.2), f(6 * q.k / 5.2), -10, lower.light) : ''
    body += `<g id="${id}-large-subunit">${q.ellipse(0, ly, 30, 21, 0, `url(#${id}-large-gradient)`, pal.outline, lw)}${hlL}</g>` +
      `<g id="${id}-small-subunit">${q.ellipse(0, sy, 22, 11, 0, `url(#${id}-small-gradient)`, pal.outline, lw)}${hlS}</g>`
  }
  return { defs, body: wrap(g, x, y, turn, id, body), parts: mRNA ? [['ribosome', pal], ['mRNA', rnaPal]] : [['ribosome', pal]] }
}

// ---------- membrane-bound round bodies: lysosome, vesicle, multivesicular body, peroxisome ----------
// A membrane drawn as a thick line with a pale band inside (the lumen's own edge in the small tone), as the drafts have
// it, so that it is not read as two membranes; below 64–72 px on the page only the outer line is left.
// With the gloss on (`at` = [g, x, y, turn]), the lumen gets it in place of its highlight.
const membraneBody = (q, id, R, inner, pal, lw, full, at) => {
  const gl = (r, w) => (at && glossOn() ? glossOf(...at, circleD(q, 0, 0, r), pal, w / 2, 2 * r * q.k) : '')
  return full
    ? `<g id="${id}-membrane">${q.circle(0, 0, R, pal.light, pal.outline, lw)}</g><g id="${id}-lumen">${q.circle(0, 0, R * inner, `url(#${id}-gradient)`, pal.small, f(Math.max(2, lw * 0.5)))}${at && glossOn() ? gl(R * inner, Math.max(2, lw * 0.5)) : shine(q, 0, 0, R * inner, R * inner, pal)}</g>`
    : `<g id="${id}-lumen">${q.circle(0, 0, R, `url(#${id}-gradient)`, pal.outline, lw)}${gl(R, lw)}</g>`
}

// Lysosome: rose, with the material being broken down (contents) and enzymes (dots). Options: contents, enzymes.
// Example: lysosome(g, { x: 30, y: 20, size: 14 })
export function lysosome(g, { x, y, size, turn = 0, id = 'lysosome', w, pal = soft(HUES.lysosome), contents = true, enzymes = true }) {
  const px = size * g.k, lw = w ?? roundLine(px), full = px >= 72, q = frame(g, x, y, (px - lw) / 100), R = 50, s = R / 36
  const lump = [[-12, -7], [-2, -13], [10, -5], [16, 7], [8, 17], [-6, 15], [-14, 5]].map(([a, b]) => [a * s, b * s])
  const dots = full ? [[-21, 8], [13, -20], [22, 12], [-9, 23]] : [[-16, -12], [16, -6], [2, 18]]
  const body = membraneBody(q, id, R, 0.833, pal, lw, full, [g, x, y, turn]) +
    (contents && full ? `<g id="${id}-contents">${q.path(q.smooth(lump), pal.small)}</g>` : '') +
    (enzymes ? `<g id="${id}-enzymes">${dots.map(([a, b]) => q.circle(a * s, b * s, full ? 3.1 * s : 4.4 * s, pal.outline)).join('')}</g>` : '')
  return { defs: q.grad(`${id}-gradient`, [-R, -R, R, R], glossPal(pal)), body: wrap(g, x, y, turn, id, body), parts: [['lysosome', pal]] }
}

// Vesicle and endosome: aqua (see HUES), optionally with cargo (amber protein dots). kind 'endosome' gives an
// irregular body with a tubule budding from it. Options: cargo, kind, cargoPal.
// Example: vesicle(g, { x: 0, y: -30, size: 10, cargo: true })
export function vesicle(g, { x, y, size, turn = 0, id = 'vesicle', w, pal = soft(HUES.vesicle), cargo = false, kind = 'vesicle', cargoPal = deep(HUES.cargo) }) {
  const px = size * g.k, lw = w ?? roundLine(px), full = px >= 64
  if (kind === 'endosome') return endosome(g, { x, y, size, turn, id, lw, pal, cargo, cargoPal, full, px })
  const q = frame(g, x, y, (px - lw) / 100), R = 50, s = R / 38
  const load = (full ? [[-9, -4, 7], [13, 9, 5.2], [7, -16, 4.2], [-11, 16, 4.2]] : [[-8, -3, 9], [12, 10, 7]]).map(([a, b, r]) => q.circle(a * s, b * s, r * s, cargoPal.small))
  const body = membraneBody(q, id, R, 0.816, pal, lw, full, [g, x, y, turn]) + (cargo ? `<g id="${id}-cargo">${load.join('')}</g>` : '')
  return { defs: q.grad(`${id}-gradient`, [-R, -R, R, R], glossPal(pal)), body: wrap(g, x, y, turn, id, body), parts: cargo ? [['vesicle', pal], ['cargo', cargoPal]] : [['vesicle', pal]] }
}
function endosome(g, { x, y, size, turn, id, lw, pal, cargo, cargoPal, full, px }) {
  // The body is 77 across about 0,0, the tubule reaches to the right: the whole is 102 wide, its middle at 12.5.
  const q = frame(g, x, y, (px - lw) / 102, [12.5, 0])
  const R = 37, radii = [1, 0.95, 1.03, 0.97, 0.92, 1.03, 0.95, 1.01, 0.93, 1.02]
  const blob = (k) => q.smooth(radii.map((r, i) => { const a = (i / radii.length) * Math.PI * 2 - Math.PI / 2; return [Math.cos(a) * R * r * k, Math.sin(a) * R * r * k] }))
  const tube = q.D('M24,-12 C36,-18 44,-20 57,-27'), tw = 10 * q.k
  const load = (full ? [[-8, -4, 7], [12, 9, 5.5], [6, -16, 4.5], [-12, 14, 4.5]] : [[-8, -3, 9], [12, 10, 7]]).map(([a, b, r]) => q.circle(a, b, r, cargoPal.small))
  const glB = (k, w) => (glossOn() ? glossOf(g, x, y, turn, blob(k), pal, w / 2, 2 * R * k * q.k) : '')
  const outer = `<path d="${tube}" fill="none" stroke="${pal.outline}" stroke-width="${f(tw + lw)}" stroke-linecap="round"/><path d="${blob(1)}" fill="${full ? pal.light : `url(#${id}-gradient)`}" stroke="${pal.outline}" stroke-width="${lw}" stroke-linejoin="round"/>${full ? '' : glB(1, lw)}` +
    `<path d="${tube}" fill="none" stroke="${full ? pal.light : pal.base}" stroke-width="${f(tw - lw)}" stroke-linecap="round"/>`
  const body = `<g id="${id}-membrane">${outer}</g>` +
    (full ? `<g id="${id}-lumen"><path d="${blob(0.82)}" fill="url(#${id}-gradient)" stroke="${pal.small}" stroke-width="${f(lw * 0.5)}"/>${glossOn() ? glB(0.82, lw * 0.5) : shine(q, 0, 0, R * 0.82, R * 0.82, pal)}</g>` : '') +
    (cargo ? `<g id="${id}-cargo">${load.join('')}</g>` : '')
  return { defs: q.grad(`${id}-gradient`, [-R, -R, R, R], glossPal(pal)), body: wrap(g, x, y, turn, id, body), parts: cargo ? [['endosome', pal], ['cargo', cargoPal]] : [['endosome', pal]] }
}

// Multivesicular body: a late endosome full of small vesicles (intraluminal vesicles), in the vesicle's aqua.
// Option count (of small vesicles, 3–8). Example: multivesicularBody(g, { x: 0, y: 0, size: 20 })
export function multivesicularBody(g, { x, y, size, turn = 0, id = 'mvb', w, pal = soft(HUES.vesicle), count = 6 }) {
  const px = size * g.k, lw = w ?? roundLine(px), full = px >= 64, q = frame(g, x, y, (px - lw) / 100), R = 50
  const spots = [[-16, -14], [12, -18], [20, 8], [-2, 4], [-20, 14], [4, 24], [-6, -26], [26, -6]].slice(0, clamp(count, 3, 8))
  const r = full ? 8.5 : 9.5
  const small = spots.map(([a, b]) => (full ? q.circle(a, b, r, pal.light, pal.outline, f(clamp(lw * 0.5, 3.5, 6))) : q.circle(a, b, r, pal.light)))
  const body = membraneBody(q, id, R, 0.84, pal, lw, full, [g, x, y, turn]) + `<g id="${id}-intraluminal-vesicles">${small.join('')}</g>`
  return { defs: q.grad(`${id}-gradient`, [-R, -R, R, R], glossPal(pal)), body: wrap(g, x, y, turn, id, body), parts: [['multivesicular body', pal]] }
}

// Peroxisome: green, one membrane, its crystalline core and a few granules. Under 72 px the core is a flat shape.
// Example: peroxisome(g, { x: -20, y: 25, size: 12 })
export function peroxisome(g, { x, y, size, turn = 0, id = 'peroxisome', w, pal = soft(HUES.peroxisome) }) {
  const px = size * g.k, lw = w ?? roundLine(px), full = px >= 72, q = frame(g, x, y, (px - lw) / 100), R = 50, s = R / 32
  const core = deepOf(pal), corners = [[0, -16], [16, -4], [10, 14], [-10, 14], [-16, -4]].map(([a, b]) => [a * s, b * s])
  let defs = q.grad(`${id}-gradient`, [-R, -R, R, R], glossPal(pal)), body = `<g id="${id}-matrix">${q.circle(0, 0, R, `url(#${id}-gradient)`, pal.outline, lw)}${glossOn() ? glossOf(g, x, y, turn, circleD(q, 0, 0, R), pal, lw / 2, px) : px >= 70 ? shine(q, 0, 0, R, R, pal) : ''}</g>`
  if (full) {
    defs += q.grad(`${id}-core-gradient`, [-16 * s, -16 * s, 16 * s, 14 * s], { base: core.base, shadow: core.shadow })
    body += `<g id="${id}-granules">${[[-21, 15], [22, -17], [18, 19]].map(([a, b]) => q.circle(a * s, b * s, 2.6 * s, pal.small)).join('')}</g>` +
      `<g id="${id}-core">${q.path(roundPoly(q, corners, 2.2 * s), `url(#${id}-core-gradient)`, pal.outline, f(lw * 0.67))}${q.line([[0, -11 * s], [0, 9.5 * s]], core.small, f(lw * 0.42))}${q.line([[-10.5 * s, -3.2 * s], [10.5 * s, -3.2 * s]], core.small, f(lw * 0.42))}</g>`
  } else body += `<g id="${id}-core">${q.path(roundPoly(q, corners, 3 * s), core.small)}</g>`
  return { defs, body: wrap(g, x, y, turn, id, body), parts: [['peroxisome', pal]] }
}

// ---------- lipid droplet ----------
// A store of neutral lipid (yellow) wrapped in a single layer of lipids, heads out and tails in (the peach lipids of
// the membranes of the set), with perilipin (green) on its surface. Large (160 px and more): every lipid with its two
// tails; from 70 px: the heads only, as a ring of beads; smaller: a yellow drop with a peach rim. Option perilipin.
// Example: lipidDroplet(g, { x: 25, y: 10, size: 16, perilipin: false })
export function lipidDroplet(g, { x, y, size, turn = 0, id = 'lipid-droplet', w, pal = rich(HUES.fat), lipidPal = LIPID, perilipin = true, coatPal = soft(HUES.perilipin) }) {
  const px = size * g.k, R = 44, hr = 5
  const level = px >= 160 ? 'full' : px >= 70 ? 'beads' : 'drop'
  const hw = w ?? f(level === 'drop' ? roundLine(px, 6) : clamp(px * 0.011, 3.5, 5))
  const q = frame(g, x, y, (px - hw) / (2 * (R + hr))), skip = perilipin && level !== 'drop' ? [-90, 40] : []
  const N = level === 'full' ? 26 : clamp(Math.round((2 * Math.PI * R * q.k) / 15), 12, 22)
  const angles = Array.from({ length: N }, (_, i) => -90 + (i * 360) / N).filter((a) => skip.every((s) => Math.abs(((a - s + 540) % 360) - 180) > 9))
  const polar = (a, r, side = 0) => { const t = (a * Math.PI) / 180; return [r * Math.cos(t) - side * Math.sin(t), r * Math.sin(t) + side * Math.cos(t)] }
  let defs = q.grad(`${id}-gradient`, [-R, -R, R, R], glossPal(pal)) + boxGrad(`${id}-head-gradient`, lipidPal), body
  if (level === 'drop') body = `<g id="${id}-neutral-lipid">${q.circle(0, 0, R + hr * 0.6, `url(#${id}-gradient)`, lipidPal.outline, hw)}${glossOf(g, x, y, turn, circleD(q, 0, 0, R + hr * 0.6), pal, hw / 2, px)}</g>`
  else {
    const headR = level === 'full' ? hr : Math.max(hr, (Math.PI * R) / N * 0.62)
    body = `<g id="${id}-neutral-lipid">${q.circle(0, 0, R, `url(#${id}-gradient)`)}${glossOn() ? glossOf(g, x, y, turn, circleD(q, 0, 0, R), pal, 0, 2 * R * q.k) : px >= 100 ? q.hl(-0.37 * R, -0.39 * R, f(R * q.k * 0.3), f(R * q.k * 0.11), -45, pal.light) : ''}</g>` +
      `<g id="${id}-monolayer">` +
      (level === 'full' ? `<g id="${id}-lipid-tails">${angles.flatMap((a) => [-1.75, 1.75].map((s) => q.line([polar(a, R - 4.6, s), polar(a, R - 13.3, s)], lipidPal.outline, hw))).join('')}</g>` : '') +
      `<g id="${id}-lipid-heads">${angles.map((a) => { const [u, v] = polar(a, R); return q.circle(u, v, headR, `url(#${id}-head-gradient)`, lipidPal.outline, hw) }).join('')}</g></g>`
    if (skip.length) {
      defs += boxGrad(`${id}-coat-gradient`, coatPal)
      body += `<g id="${id}-perilipin">${skip.map((a) => { const [u, v] = polar(a, R); return q.ellipse(u, v, 8.7, 5.3, a + 90, `url(#${id}-coat-gradient)`, coatPal.outline, f(hw * 1.2)) }).join('')}</g>`
    }
  }
  const parts = [['neutral lipid', pal], ['lipids', lipidPal]]
  if (skip.length) parts.push(['perilipin', coatPal])
  return { defs, body: wrap(g, x, y, turn, id, body), parts }
}

// ---------- centrosome ----------
// Two centrioles at a right angle (the protein blue; the lines along each stand for its triplets of microtubules),
// the pericentriolar material round them (a pale disc) and the microtubules growing from it. Options: microtubules,
// material (the disc); both false gives the centriole pair alone. Example: centrosome(g, { x: 0, y: 0, size: 20 })
export function centrosome(g, { x, y, size, turn = 0, id = 'centrosome', w, pal = soft(HUES.centriole), tubulePal = soft(HUES.tubule), microtubules = true, material = true }) {
  const E = microtubules ? 94 : material ? 56 : 46
  const px = size * g.k, K0 = px / E, lw = w ?? f(clamp(26 * K0 * 0.07, 3.5, 9))
  const q = frame(g, x, y, (px - (microtubules ? 0 : material ? 0 : lw)) / E)
  const turnPt = (deg, [a, b]) => { const t = (deg * Math.PI) / 180; return [a * Math.cos(t) - b * Math.sin(t), a * Math.sin(t) + b * Math.cos(t)] }
  const rays = Array.from({ length: 12 }, (_, i) => [turnPt(i * 30, [0, -24]), turnPt(i * 30, [0, -46])])
  const lines = 26 * q.k >= 50
  const body =
    (microtubules ? `<g id="${id}-microtubules">${rays.map((r) => q.line(r, tubulePal.small, f(Math.max(3, 2 * q.k)))).join('')}</g>` : '') +
    (material ? `<g id="${id}-pericentriolar-material">${q.circle(0, 0, 27, tubulePal.base)}</g>` : '') +
    `<g id="${id}-centrioles">${q.path(rrect(q, -23, -1, 26, 14, 4), `url(#${id}-gradient)`, pal.outline, lw)}${lines && glossOn() ? glossOf(g, x, y, turn, rrect(q, -23, -1, 26, 14, 4), pal, lw / 2, 26 * q.k) : ''}${lines ? [3.7, 8.3].map((b) => q.line([[-18.5, b], [-1.5, b]], pal.small, f(lw * 0.55))).join('') : ''}` +
    `${q.path(rrect(q, 9, -13, 14, 26, 4), `url(#${id}-gradient)`, pal.outline, lw)}${lines && glossOn() ? glossOf(g, x, y, turn, rrect(q, 9, -13, 14, 26, 4), pal, lw / 2, 26 * q.k) : ''}${lines ? [13.7, 18.3].map((a) => q.line([[a, -8.5], [a, 8.5]], pal.small, f(lw * 0.55))).join('') : ''}</g>`
  const parts = [['centrioles', pal]]
  if (microtubules || material) parts.push(['microtubules', tubulePal])
  return { defs: boxGrad(`${id}-gradient`, lines ? glossPal(pal) : pal), body: wrap(g, x, y, turn, id, body), parts }
}

// ---------- the owner's organelles, placed ----------
// Mitochondrion: standardMito of ../mitokit.mjs in this module's form; size is its length. Options passed on: height,
// bend, cristae, highlight. Example: mitochondrion(g, { x: 20, y: 25, size: 24, turn: -20 })
export function mitochondrion(g, { x, y, size, turn = 0, id = 'mitochondrion', w, ...rest }) {
  const m = standardMito({ x: g.X(x), y: g.Y(y), length: size * g.k, turn, id, w, ...rest })
  return { defs: m.defs, body: m.body, parts: [['mitochondrion', MITO]] }
}
/** The outline the owner's mitochondrion has at a length on the page (as standardMito works it out). */
const mitoLine = (px) => f(clamp((6 * px) / 448, 3.5, 6))

// Damaged mitochondrion: the approved icon `Damaged mitochondrion`, placed; size is its width. Option flip.
// Example: damagedMitochondrion(g, { x: 0, y: 0, size: 30 })
export function damagedMitochondrion(g, { x, y, size, turn = 0, id = 'damaged-mitochondrion', w, flip = false }) {
  const px = size * g.k, p = placeIcon('Damaged mitochondrion', { x: g.X(x), y: g.Y(y), width: px, turn, flip, prefix: id, stroke: w ?? mitoLine(px) })
  return { defs: p.defs, body: p.body, parts: [['mitochondrion', MITO]] }
}

// Golgi apparatus: the approved icon `Golgi apparatus`, placed; size is its width. Option flip. Its cisternae are thin,
// so its outline is thinner than other parts' when it is small (2 px at 80 px wide, 6 at 240): with 3.5 the stack
// closes up into one dark patch.
// Example: golgi(g, { x: 10, y: -20, size: 30, turn: 15 })
export function golgi(g, { x, y, size, turn = 0, id = 'golgi', w, flip = false }) {
  const px = size * g.k, p = placeIcon('Golgi apparatus', { x: g.X(x), y: g.Y(y), width: px, turn, flip, prefix: id, stroke: w ?? f(clamp(px * 0.025, 2, 6)) })
  return { defs: p.defs, body: p.body, parts: [['Golgi apparatus', { base: '#84B3E0' }]] }
}

// ---------- the sheet ----------
/** Several copies of a part in a row at sizes given in page pixels (the frame of the sheet is 4.6 px a unit for size 100). */
const sizes = (fn, list, opts = {}) => (g) => {
  const total = list.reduce((s, p) => s + p, 0) + 30 * (list.length - 1)
  let at = -total / 2
  const all = list.map((p, i) => { const r = fn(g, { x: (at + p / 2) / g.k, y: 0, size: p / g.k, ...opts, id: `${opts.id ?? 'part'}-${i + 1}` }); at += p + 30; return r })
  return { defs: all.map((r) => r.defs).join(''), body: all.map((r) => r.body).join('\n'), parts: all[0].parts }
}
/** Two rows: the part large-ish, then the same at sizes it takes inside icons. */
const stack = (top, bottom) => (g) => {
  const a = top(g), b = bottom(g)
  return { defs: a.defs + b.defs, body: a.body + '\n' + b.body, parts: a.parts }
}
const shifted = (fn, dy, list, opts) => (g) => {
  const r = sizes(fn, list, opts)(page(g.k, [0, -dy / g.k]))
  return r
}
const SMALL = [40, 60, 90, 120]

export const DEMOS = [
  { name: 'Nucleus', size: 100, draw: (g) => nucleus(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Nucleus with pores', size: 100, draw: (g) => nucleus(g, { x: 0, y: 0, size: 100, pores: true, nucleolus: true }) },
  { name: 'Nucleus with chromatin', size: 100, draw: (g) => nucleus(g, { x: 0, y: 0, size: 100, pores: true, nucleolus: true, chromatin: true }) },
  { name: 'Oval nucleus', size: 100, draw: (g) => nucleus(g, { x: 0, y: 0, size: 100, oval: true, nucleolus: true, chromatin: true }) },
  { name: 'Nucleus at small sizes', size: 100, draw: stack(shifted(nucleus, -70, [30, 45, 64, 100], { id: 'plain', nucleolus: true }), shifted(nucleus, 70, [30, 45, 64, 100], { id: 'full', pores: true, nucleolus: true, chromatin: true })) },
  { name: 'Endoplasmic reticulum', size: 100, draw: (g) => endoplasmicReticulum(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Endoplasmic reticulum without ribosomes', size: 100, draw: (g) => endoplasmicReticulum(g, { x: 0, y: 0, size: 100, ribosomes: false }) },
  { name: 'Endoplasmic reticulum at small sizes', size: 100, draw: sizes(endoplasmicReticulum, SMALL, { id: 'er', turn: 0 }) },
  { name: 'Ribosome', size: 100, draw: (g) => ribosome(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Ribosome with mRNA', size: 100, draw: (g) => ribosome(g, { x: 0, y: 0, size: 100, mRNA: true }) },
  { name: 'Ribosome at small sizes', size: 100, draw: stack(shifted(ribosome, -60, [20, 30, 44, 70], { id: 'free' }), shifted(ribosome, 60, [30, 44, 70, 100], { id: 'rna', mRNA: true })) },
  { name: 'Lysosome', size: 100, draw: (g) => lysosome(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Peroxisome', size: 100, draw: (g) => peroxisome(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Vesicle', size: 100, draw: (g) => vesicle(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Vesicle with cargo', size: 100, draw: (g) => vesicle(g, { x: 0, y: 0, size: 100, cargo: true }) },
  { name: 'Endosome', size: 100, draw: (g) => vesicle(g, { x: 0, y: 0, size: 100, kind: 'endosome', cargo: true }) },
  { name: 'Multivesicular body', size: 100, draw: (g) => multivesicularBody(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Round organelles at small sizes', size: 100, draw: (g) => {
    const rows = [[lysosome, {}], [peroxisome, {}], [vesicle, { cargo: true }], [multivesicularBody, {}]].map(([fn, o], i) => shifted(fn, -120 + i * 80, [24, 40, 60, 90], { id: `r${i}`, ...o })(g))
    return { defs: rows.map((r) => r.defs).join(''), body: rows.map((r) => r.body).join('\n'), parts: [['lysosome', soft(HUES.lysosome)], ['peroxisome', soft(HUES.peroxisome)], ['vesicle', soft(HUES.vesicle)]] }
  } },
  { name: 'Lipid droplet', size: 100, draw: (g) => lipidDroplet(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Lipid droplet at small sizes', size: 100, draw: sizes(lipidDroplet, [40, 60, 90, 130], { id: 'ld' }) },
  { name: 'Centrosome', size: 100, draw: (g) => centrosome(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Centriole pair', size: 100, draw: (g) => centrosome(g, { x: 0, y: 0, size: 100, microtubules: false, material: false }) },
  { name: 'Centrosome at small sizes', size: 100, draw: sizes(centrosome, SMALL, { id: 'cs' }) },
  { name: 'Mitochondrion', size: 100, draw: (g) => mitochondrion(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Damaged mitochondrion', size: 100, draw: (g) => damagedMitochondrion(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Golgi apparatus', size: 100, draw: (g) => golgi(g, { x: 0, y: 0, size: 100 }) },
]
