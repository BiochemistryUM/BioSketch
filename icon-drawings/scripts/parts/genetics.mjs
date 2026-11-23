// Parts: genetics, drawn once in the soft look of icon-drawings/STYLE.md and reused by every icon that shows them: the
// nucleosome (side view or face on, with or without its DNA, with histone tails and their marks) and a chromatin fibre
// of nucleosomes on linker DNA, a gene drawn as an arrow-shaped block, scissors, and Cas9 with its guide RNA. Promoted
// from the drawings of the Molecules & genetics batches (../molecules/mg03, mg04, mg06, mg08, mg09, mg11, mg12, mg13,
// mg14, mg17, mg18, mg19, mg23), which redraw SiliCoDraw's icons (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander
// David Carlsson).
//
// Every part is `part(g, { x, y, size, turn, id, w, pal, ...options })` and returns `{ defs, body, parts }` (see
// molecules.mjs). Every id inside starts with `id`.
// Colours (the conventions of the batches): histones the lilac of every nucleus (NUC, as the approved chromatin part and
// five of the nine drawings), DNA the blue of the DNA part (267°, deep), a gene green (163°, soft), acetyl groups green
// (165°, the ligand part), methyl groups red (25°), phosphates mustard (the phosphate part), scissor blades grey with red
// rings (mg04), Cas9 pale green (158°) with a purple guide RNA (316°), a protein fused to Cas9 amber (75°).
// The DNA wound round a nucleosome and the linker DNA are the DNA part's double helix, bent along their way (`helixAlong`,
// the part's own drawing generalised to a curved axis). Where the helix would be too narrow to read it is drawn as the
// part draws a short DNA (two plain strands, `flat`), and smaller still as one flat line in the DNA's tone.
import { NUC, highlight, smoothD } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex } from '../colour.mjs'
import { catmull, f, gradient2 } from '../shapes.mjs'
import { fits, lettering, textWidth } from './letters.mjs'
import { dna, ligand, phosphate, protein } from './molecules.mjs'

// ---------- hues (OKLCH degrees) ----------
const DNA = hueOf('#4f6bb8'), ION = 165, RED = hueOf('#e86b6b'), GENE = hueOf('#5fae8b'), CAS9 = hueOf('#cfe8d8'), GUIDE = hueOf('#b07cc6')
const PROTEIN = 75, SCISSOR_RED = hueOf('#d64545')
const grey = (l, c = 0.006) => toHex({ l, c, h: 255 })
/** The neutral grey of the batches (blades, linkers). */
export const GREY = { light: grey(0.985, 0.002), base: grey(0.95), shadow: grey(0.86, 0.008), small: grey(0.75, 0.008), outline: grey(0.5, 0.01) }
/** The default palettes, for icons that recolour next to them. */
export const PALS = {
  histones: NUC, dna: deep(DNA), gene: soft(GENE), acetyl: deep(ION), methyl: deep(RED), cas9: soft(CAS9), guide: deep(GUIDE),
  fused: rich(PROTEIN), rings: deep(SCISSOR_RED), blades: GREY,
}

// ---------- helpers (as molecules.mjs) ----------
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const lineFor = (px) => f(clamp(2.5 + px * 0.03, 3.5, 10))
const BIG = 140
const frame = (g, x, y, size) => {
  const s = size / 100, px = s * g.k
  return { px, ext: size * g.k, P: ([u, v]) => g.P([x + u * s, y + v * s]) }
}
const wrap = (g, id, x, y, turn, inner) => `<g id="${id}"${turn ? ` transform="rotate(${f(turn)} ${f(g.X(x))} ${f(g.Y(y))})"` : ''}>${inner}</g>`
const ptsD = (pts) => `M${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' L')}`
const strokePath = (d, colour, w, cap = 'round') => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
const disc = ([x, y], r, fill, s = '', w = 0) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}"${s ? ` stroke="${s}" stroke-width="${f(w)}"` : ''}/>`
const grad = (id, L, [u0, v0, u1, v1], pal) => gradient2(id, [...L.P([u0, v0]), ...L.P([u1, v1])], pal.base, pal.shadow)
const shine = (L, [u, v], rx, ry, rot, fill) => { const [cx, cy] = L.P([u, v]); return highlight(cx, cy, f(rx * L.px), f(ry * L.px), rot, fill) }
const union = (ds, width, fill, outline, w) => ds.map((d) => strokePath(d, outline, width + 2 * w)).join('') + ds.map((d) => strokePath(d, fill, width)).join('')
/** A polygon of page points with its corners rounded by R (px). */
const roundPoly = (P, R) => {
  const n = P.length
  const toward = (a, b, d) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]), t = Math.min(d, l / 2) / l; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] }
  let d = ''
  for (let i = 0; i < n; i++) {
    const a = toward(P[i], P[(i - 1 + n) % n], R), b = toward(P[i], P[(i + 1) % n], R)
    d += `${i ? 'L' : 'M'}${f(a[0])},${f(a[1])} Q${f(P[i][0])},${f(P[i][1])} ${f(b[0])},${f(b[1])} `
  }
  return d + 'Z'
}
/** One piece [a, b] of a tube along page points (outline one point past each end, fill two: no seams; molecules.mjs). */
const piece = (pts, [a, b], T, fill, outline, w) => {
  const cut = (k) => pts.slice(Math.max(0, a - k), Math.min(pts.length, b + 1 + k))
  return strokePath(ptsD(cut(1)), outline, T + 2 * w, 'butt') + strokePath(ptsD(cut(2)), fill, T, 'butt')
}
const capUnder = ([x, y], T, outline, w) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(T / 2 + w / 2)}" fill="${outline}" stroke="${outline}" stroke-width="${f(w)}"/>`
const capOver = ([x, y], T, fill) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(T / 2)}" fill="${fill}"/>`
/** Resamples a point list evenly, about `step` apart (same units). */
const resample = (pts, step) => {
  const out = [pts[0]]
  let carry = 0
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]], l = Math.hypot(b[0] - a[0], b[1] - a[1])
    let d = step - carry
    while (d <= l) { out.push([a[0] + ((b[0] - a[0]) * d) / l, a[1] + ((b[1] - a[1]) * d) / l]); d += step }
    carry = l - (d - step)
  }
  if (Math.hypot(out.at(-1)[0] - pts.at(-1)[0], out.at(-1)[1] - pts.at(-1)[1]) > step * 0.3) out.push(pts.at(-1)); else out[out.length - 1] = pts.at(-1)
  return out
}

// =====================================================================================================================
// The DNA part's double helix along a curved axis
// =====================================================================================================================

/**
 * The DNA part's double helix (molecules.mjs `dna`) along a curved axis of page points, drawn in pieces so that other
 * shapes can go between them (a histone core between the DNA behind it and the DNA in front). `D` is the diameter (px).
 * Mode by `D`: 'helix' (two outlined strands, the first in the base tone, the second in the shadow tone, base pairs in
 * the small tone; as the part draws a long DNA), 'flat' (two plain strands in the outline and small tones, base pairs in
 * the base tone; as the part draws a short one), 'line' (one flat line in the small tone, where a helix cannot be read).
 * Returns { draw([a, b]) }: the SVG of axis points a..b; round ends where the axis itself ends.
 */
const helixAlong = (axis, { D, pal, W, mode }) => {
  const pts = resample(axis, Math.max(1, D / 14)), n = pts.length
  const cum = [0]
  for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  const nrm = pts.map((_, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l]
  })
  // Points of the axis: the index of the original point nearest each resampled one, so callers can give ranges of `axis`.
  const map = []
  { let j = 0; for (let i = 0; i < axis.length; i++) { while (j < n - 1 && Math.hypot(pts[j + 1][0] - axis[i][0], pts[j + 1][1] - axis[i][1]) <= Math.hypot(pts[j][0] - axis[i][0], pts[j][1] - axis[i][1])) j++; map.push(j) } }
  if (mode === 'line') {
    const T = Math.max(2.5, D * 0.55)
    return { pts, map, draw: ([a, b]) => strokePath(ptsD(pts.slice(Math.max(0, map[a] - 1), Math.min(n, map[b] + 2))), pal.small, T, a === 0 || b === axis.length - 1 ? 'round' : 'butt') }
  }
  const isFlat = mode === 'flat', T = D * (isFlat ? 0.2 : 0.15), A = (D - T) / 2 - (isFlat ? 0 : W), pitch = 1.9 * D
  const phase = (s) => (2 * Math.PI * s) / pitch
  const strands = [1, -1].map((sg) => pts.map((c, i) => { const ph = phase(cum[i]); return { p: [c[0] + nrm[i][0] * A * sg * Math.sin(ph), c[1] + nrm[i][1] * A * sg * Math.sin(ph)], front: sg * Math.cos(ph) >= 0 } }))
  const style = isFlat ? [pal.outline, pal.small] : [pal.base, pal.shadow]
  const strandRun = (k, [a, b]) => {
    const all = strands[k].map((q) => q.p)
    if (isFlat) return strokePath(ptsD(all.slice(Math.max(0, a - 1), Math.min(n, b + 2))), style[k], T, a === 0 || b === n - 1 ? 'round' : 'butt')
    const ends = [a === 0 && all[0], b === n - 1 && all.at(-1)].filter(Boolean)
    return ends.map((p) => capUnder(p, T, pal.outline, W)).join('') + piece(all, [a, b], T, style[k], pal.outline, W) + ends.map((p) => capOver(p, T, style[k])).join('')
  }
  const runsOf = (k, a, b, front) => {
    const out = []
    let s = null
    for (let i = a; i <= b; i++) {
      const on = strands[k][i].front === front
      if (on && s === null) s = Math.max(a, i - 1)
      if (!on && s !== null) { out.push([s, i]); s = null }
    }
    if (s !== null) out.push([s, b])
    return out.filter(([p, q]) => q > p)
  }
  const perHalf = isFlat ? [0.5] : [0.25, 0.5, 0.75]
  const rungs = (a, b) => {
    const out = []
    const h0 = Math.floor((cum[a] / pitch) * 2), h1 = Math.ceil((cum[b] / pitch) * 2)
    for (let h = h0; h <= h1; h++)
      for (const q of perHalf) {
        const s = ((h + q) * pitch) / 2
        if (s < cum[a] || s > cum[b]) continue
        let i = a
        while (i < b && cum[i + 1] < s) i++
        const t = cum[i + 1] > cum[i] ? (s - cum[i]) / (cum[i + 1] - cum[i]) : 0, j = Math.min(i + 1, n - 1)
        const c = [pts[i][0] + (pts[j][0] - pts[i][0]) * t, pts[i][1] + (pts[j][1] - pts[i][1]) * t], nv = nrm[i]
        const amp = Math.sin(phase(s)) * A, inset = (T / 2 + (isFlat ? 0 : W)) * Math.sign(amp)
        if (Math.abs(amp) * 2 < T * 2.2) continue
        out.push(strokePath(ptsD([[c[0] + nv[0] * (amp - inset), c[1] + nv[1] * (amp - inset)], [c[0] - nv[0] * (amp - inset), c[1] - nv[1] * (amp - inset)]]), isFlat ? pal.base : pal.small, Math.max(1.5, T * 0.42), 'butt'))
      }
    return out.join('')
  }
  return {
    pts, map,
    draw: ([a0, b0]) => {
      const a = map[a0], b = map[b0]
      return [0, 1].flatMap((k) => runsOf(k, a, b, false).map((r) => strandRun(k, r))).join('') + rungs(a, b) +
        [0, 1].flatMap((k) => runsOf(k, a, b, true).map((r) => strandRun(k, r))).join('')
    },
  }
}
/** The mode of the DNA by its diameter on the page (px). */
const dnaMode = (Dpx, helix = 'auto') => (helix !== 'auto' ? helix : Dpx >= 24 ? 'helix' : 'line')
const dnaOutline = (Dpx) => clamp(Dpx * 0.06, 3.5, 7)

// =====================================================================================================================
// Nucleosomes
// =====================================================================================================================

/** The tilt of a histone core seen from the side: the height of its top face over its width (mg03, mg11, mg18). */
const E = 0.43
/** The geometry of one core in g units: side view (a short cylinder seen a little from above) or face on (a disc). */
const coreGeo = ({ x, y, R }, view) => view === 'face'
  ? { x, y, R, view, top: y - R, Rw: R * 1.02 }
  : { x, y, R, view, top: y - 0.5 * R, bot: y + 0.45 * R, Rw: R * 1.035 }
/**
 * The way of the DNA round one core (g units), as { p, front } points, from where it comes in to where it leaves.
 * Side view (mg11's wrap): in at the core's left edge, across the front, round the back and across the front again a band
 * lower, out at its right edge: one and a half turns, two bands across the front as textbooks draw it. Face on (mg19): in
 * at the lower left, over the top and out at the lower right, all in front.
 */
const wrapOf = (c) => c.view === 'face'
  ? Array.from({ length: 121 }, (_, i) => { const a = ((145 + (250 * i) / 120) * Math.PI) / 180; return { p: [c.x + c.Rw * Math.cos(a), c.y + c.Rw * Math.sin(a)], front: true } })
  : Array.from({ length: 181 }, (_, i) => {
    const p = i / 180, th = Math.PI - 3 * Math.PI * p, yc = c.y + 0.71 * c.R * (p - 0.5)
    return { p: [c.x + c.Rw * Math.cos(th), yc + c.Rw * E * Math.sin(th)], front: Math.sin(th) >= -1e-9 }
  })
/** A point just outside where the DNA comes in (before) and leaves (after), so that a linker joins on smoothly. */
const leadIn = (c) => c.view === 'face' ? [c.x - c.Rw * 1.12, c.y + c.Rw * 1.02] : [c.x - c.Rw - 0.1 * c.R, c.y - 0.355 * c.R - 0.26 * c.R]
const leadOut = (c) => c.view === 'face' ? [c.x + c.Rw * 1.12, c.y + c.Rw * 1.02] : [c.x + c.Rw + 0.1 * c.R, c.y + 0.355 * c.R - 0.26 * c.R]

/** A histone core (g units): its side and top face with a highlight (side view), or a disc (face on). */
const coreSvg = (g, c, id, pal, W) => {
  const P2 = (p) => g.P(p).map(f).join(',')
  if (c.view === 'face') {
    const big = 2 * c.R * g.k >= BIG * 0.5
    return {
      defs: g.grad(`${id}-gradient`, [c.x - c.R, c.y - c.R, c.x + c.R, c.y + c.R], pal),
      body: `<g id="${id}">${g.circle(c.x, c.y, c.R - W / 2 / g.k, `url(#${id}-gradient)`, pal.outline, f(W))}${big ? g.hl(c.x - 0.42 * c.R, c.y - 0.42 * c.R, f(c.R * g.k * 0.34), f(c.R * g.k * 0.13), -40, pal.light) : ''}</g>`,
    }
  }
  const { x, top, bot, R } = c
  const side = `M${P2([x - R, top])} L${P2([x - R, bot])} A${f(R * g.k)},${f(R * E * g.k)} 0 0 0 ${P2([x + R, bot])} L${P2([x + R, top])} Z`
  const big = 2 * R * g.k >= BIG * 0.5
  return {
    defs: g.grad(`${id}-side-gradient`, [x - R, top, x + R, bot + R * E], { base: pal.shadow, shadow: pal.small }) + g.grad(`${id}-top-gradient`, [x - R, top - R * E, x + R, top + R * E], pal),
    body: `<g id="${id}">${g.path(side, `url(#${id}-side-gradient)`, pal.outline, f(W))}${g.ellipse(x, top, R, R * E, 0, `url(#${id}-top-gradient)`, pal.outline, f(W))}` +
      `${big ? highlight(...g.P([x - 0.38 * R, top - 0.16 * R]), f(0.36 * R * g.k), f(0.085 * R * g.k), -8, pal.light) : ''}</g>`,
  }
}

/** The kinds of mark a histone tail can carry, with their letters and default palettes. */
const MARKS = { Ac: 'acetyl', Me: 'methyl', P: 'phosphate' }
/**
 * Histone tails reaching up out of a core (g units), each ending in a mark: 'Ac' (an acetyl group, green), 'Me' (a methyl
 * group, red), 'Me3' (three methyl groups, as mg19's H3K27me3), 'P' (the phosphate part), or '' (a bare tail). Marks are
 * flat dots lettered in their light tone (mg09); they are lettered only when the letters can be read.
 */
const tailsSvg = (g, c, marks, id, pal, markPals, turn, Wt, markSize = 1) => {
  const n = marks.length
  if (!n) return { defs: '', body: '', marks: '', parts: [], ends: [] }
  const R = c.R, mr = 0.3 * R * markSize
  const spread = (j) => (n === 1 ? 0.35 : -1 + (2 * j) / (n - 1)) // −1 … 1 across the core
  const baseY = c.view === 'face' ? c.y - 0.7 * R : c.top, rise = (c.view === 'face' ? 1.25 : 1.05) + (markSize - 1) * 0.45 // larger marks stand further out, so their tails show
  const ends = marks.map((_, j) => { const s = spread(j); return [c.x + s * 1.3 * R, baseY - rise * R + Math.abs(s) * 0.42 * R] })
  const starts = marks.map((_, j) => { const s = spread(j); return [c.x + s * 0.5 * R, baseY + (c.view === 'face' ? 0 : Math.abs(s) * 0.05 * R)] })
  const lines = marks.map((_, j) => {
    const [a, e] = [starts[j], ends[j]], mid = [(a[0] + e[0]) / 2 + (e[0] - c.x) * 0.12 - (e[0] > c.x ? 0.12 : -0.12) * R * 0.2, (a[1] + e[1]) / 2 - 0.05 * R]
    return strokePath(ptsD(catmull([a, mid, e], 12).map(g.P)), pal.outline, Wt)
  }).join('')
  let defs = '', body = ''
  const parts = []
  marks.forEach((m, j) => {
    const [ex, ey] = ends[j], mid = `${id}-mark-${j + 1}`
    if (!m) return
    if (m === 'P') {
      const p = phosphate(g, { x: ex, y: ey, size: 2 * mr, id: mid, pal: markPals.phosphate })
      body += turn ? p.body.replace(/<g id="([^"]+)-letter">/, (s0) => s0.replace('>', ` transform="rotate(${f(-turn)} ${f(g.X(ex))} ${f(g.Y(ey))})">`)) : p.body
      parts.push(['phosphate', markPals.phosphate])
      return
    }
    const kind = m === 'Me3' ? 'methyl' : MARKS[m]
    if (!kind) throw new Error(`genetics.mjs: unknown histone mark "${m}" (Ac, Me, Me3, P or '')`)
    const mp = markPals[kind]
    if (m === 'Me3') {
      const r = mr * 0.58
      body += `<g id="${mid}">${[[-0.8, 0.46], [0.8, 0.46], [0, -0.9]].map(([u, v]) => g.circle(ex + u * r, ey + v * r, r, mp.small)).join('')}</g>`
    } else {
      const b = ligand(g, { x: ex, y: ey, size: 2 * mr, id: mid, pal: mp, flat: true })
      const h = (2 * mr * 0.74) / textWidth(m)
      body += b.body + (fits(g, h) ? lettering(g, { x: ex, y: ey, h, text: m, colour: mp.light, id: `${mid}-letters`, turn: -turn }).body : '')
    }
    parts.push([`${kind} group${m === 'Me3' ? 's' : ''}`, mp])
  })
  return { defs, body: `<g id="${id}-tails">${lines}</g>`, marks: `<g id="${id}-marks">${body}</g>`, parts, ends }
}

/** Draws cores and one DNA through them, layer by layer (g units). Shared by `nucleosome` and `fibre`. */
const drawChromatin = (g, { id, cores, axis, layers, pal, dnaPal, D, helix, W, Wd, tails }) => {
  const Dpx = D * g.k, mode = dnaMode(Dpx, helix)
  const h = axis.length > 1 ? helixAlong(axis.map(g.P), { D: Dpx, pal: dnaPal, W: Wd, mode }) : null
  // Runs of the axis with the same layer.
  const runs = []
  for (let i = 1, a = 0; i <= layers.length; i++) if (i === layers.length || layers[i] !== layers[a]) { runs.push({ ab: [Math.max(0, a - 1), i - 1], layer: layers[a] }); a = i }
  const dnaIn = (layer) => (h ? runs.filter((r) => r.layer === layer && r.ab[1] > r.ab[0]).map((r) => h.draw(r.ab)).join('') : '')
  let defs = '', body = ''
  const tailBits = cores.map((c, i) => tails[i] ?? { body: '', marks: '', defs: '', parts: [] })
  body += tailBits.map((t) => t.body).join('')
  cores.forEach((c, i) => {
    const cs = coreSvg(g, c, cores.length > 1 ? `${id}-histones-${i + 1}` : `${id}-histones`, pal, W)
    defs += cs.defs
    body += `<g id="${id}-DNA-${i + 1}-behind">${dnaIn(2 * i)}</g>${cs.body}<g id="${id}-DNA-${i + 1}">${dnaIn(2 * i + 1)}</g>`
  })
  if (!cores.length) body += `<g id="${id}-DNA">${dnaIn(1)}</g>`
  body += tailBits.map((t) => t.marks).join('')
  defs += tailBits.map((t) => t.defs).join('')
  return { defs, body, markParts: tailBits.flatMap((t) => t.parts) }
}
const defaultMarkPals = (o = {}) => ({ acetyl: PALS.acetyl, methyl: PALS.methyl, phosphate: deep(92), ...o })

/**
 * The DNA axis and its layers for cores along a thread (g units). Layer 2i: the linker into core i and the DNA behind
 * it (drawn before the core); 2i + 1: the DNA in front of core i (after it). Linkers run in front; `via[i]` are extra
 * points of the thread before core i (and via[cores.length] after the last).
 */
const threadOf = (cores, from, to, via = []) => {
  const axis = [], layers = []
  const push = (pts, layer) => pts.forEach((p) => { axis.push(p); layers.push(layer) })
  if (!cores.length) { push(catmull([from, ...(via[0] ?? []), to], 20), 1); return { axis, layers } }
  let last = from
  cores.forEach((c, i) => {
    const w = wrapOf(c)
    const link = catmull([last, ...(i === 0 ? [] : [leadOut(cores[i - 1])]), ...(via[i] ?? []), leadIn(c), w[0].p], 14)
    push(i === 0 ? link.slice(0, -1) : link.slice(1, -1), 2 * i + 1)
    w.forEach((q) => push([q.p], q.front ? 2 * i + 1 : 2 * i))
    last = w.at(-1).p
  })
  const n = cores.length - 1
  push(catmull([last, leadOut(cores[n]), ...(via[n + 1] ?? []), to], 14).slice(1), 2 * n + 1)
  return { axis, layers }
}

/**
 * Nucleosome: the histone core (eight histones, lilac as chromatin is in the set) with the DNA wound one and a half
 * times round it, the DNA the DNA part's double helix. Based on mg03's and mg11's nucleosome: a short cylinder seen a
 * little from above, two bands of DNA across its front, which reads as a nucleosome down to 40 px. `size` is the longer
 * extent of the whole drawing, tails and marks included.
 * Options: `view` ('side', or 'face': a disc with the DNA over its rim, as mg19), `wrap` (false: the histone octamer
 * alone, as in Histone loss), `linkers` (length of the linker DNA on each side, in core radii; 0 for none; default 0.7),
 * `tails` (marks at the ends of histone tails, left to right: 'Ac', 'Me', 'Me3', 'P' or '' for a bare tail),
 * `helix` ('auto', 'helix', 'flat', 'line': how the DNA is drawn; by default from its width on the page),
 * `markSize` (marks this many times their usual size, for an icon about the mark itself),
 * `pal` (histones), `dnaPal`, `markPals` ({ acetyl, methyl, phosphate }).
 * `nucleosome(g, { x: 0, y: 10, size: 60, tails: ['Ac', 'P', 'Me'] })`
 */
export function nucleosome(g, { x, y, size, turn = 0, id = 'nucleosome', w, pal = NUC, dnaPal = PALS.dna, view = 'side', wrap: wound = true, linkers = 0.7, tails = [], helix = 'auto', markPals = {}, markSize = 1 }) {
  const mp = defaultMarkPals(markPals)
  // The layout with a core of radius 1 at 0,0: its extent sets the scale.
  const box = (R) => {
    const c = coreGeo({ x: 0, y: 0, R }, view), xs = [], ys = []
    const add = ([px, py], r = 0) => { xs.push(px - r, px + r); ys.push(py - r, py + r) }
    if (view === 'face') { add([0, 0], R * 1.22) } else { add([-R, c.top - E * R]); add([R, c.bot + E * R]); add([-c.Rw - 0.17 * R, 0]); add([c.Rw + 0.17 * R, 0]) }
    if (wound && linkers > 0) { add(view === 'face' ? [-c.Rw - linkers * R, c.y + c.Rw * 1.35] : [-c.Rw - linkers * R, -0.95 * R]); add(view === 'face' ? [c.Rw + linkers * R, c.y + c.Rw * 1.35] : [c.Rw + linkers * R, -0.3 * R]) }
    if (tails.length) {
      const baseY = view === 'face' ? -0.7 * R : c.top, n = tails.length, rise = (view === 'face' ? 1.25 : 1.05) + (markSize - 1) * 0.45
      tails.forEach((_, j) => { const s = n === 1 ? 0.35 : -1 + (2 * j) / (n - 1); add([s * 1.3 * R, baseY - rise * R + Math.abs(s) * 0.42 * R], 0.36 * R * markSize) })
    }
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
  }
  const [bx0, by0, bx1, by1] = box(1), R = size / Math.max(bx1 - bx0, by1 - by0)
  const c = coreGeo({ x: x - ((bx0 + bx1) / 2) * R, y: y - ((by0 + by1) / 2) * R, R }, view)
  const W = w ?? clamp(lineFor(2 * R * g.k) * 0.9, 3.5, 9), D = 0.36 * R, Dpx = D * g.k, Wd = dnaOutline(Dpx)
  let axis = [], layers = []
  if (wound) {
    const wr = wrapOf(c)
    if (linkers > 0) {
      const a = view === 'face' ? [c.x - c.Rw - linkers * R, c.y + c.Rw * 1.3] : [c.x - c.Rw - linkers * R, c.y - 0.95 * R]
      const b = view === 'face' ? [c.x + c.Rw + linkers * R, c.y + c.Rw * 1.3] : [c.x + c.Rw + linkers * R, c.y - 0.3 * R]
      ;({ axis, layers } = threadOf([c], a, b))
    } else wr.forEach((q) => { axis.push(q.p); layers.push(q.front ? 1 : 0) })
  }
  const t = tailsSvg(g, c, tails, id, pal, mp, turn, clamp(0.09 * R * g.k, 3.5, 16), markSize)
  const d = drawChromatin(g, { id, cores: [c], axis, layers, pal, dnaPal, D, helix, W, Wd, tails: [t] })
  return {
    defs: d.defs,
    body: wrap(g, id, x, y, turn, d.body),
    parts: [['histones', pal], ...(wound ? [['DNA', dnaPal]] : []), ...d.markParts.filter(([n], i, a) => a.findIndex(([m]) => m === n) === i)],
  }
}
/** Histone octamer: the histone core alone, without its DNA (`nucleosome` with `wrap: false`). */
export const octamer = (g, o) => nucleosome(g, { id: 'histone-octamer', ...o, wrap: false })

/**
 * Chromatin fibre: nucleosomes along one thread of linker DNA ("beads on a string"), each the `nucleosome` part. The
 * thread runs from `from` to `to` (g units; by default a level line of length `size` about x, y); `count` nucleosomes sit
 * evenly along it. Based on mg11's and mg18's fibre (side view) and mg19's row (face on).
 * Options: `count` (default 3), `from`, `to`, `via` (extra points of the thread: via[i] before nucleosome i, via[count]
 * after the last), `compact` (nucleosomes packed side by side in a zigzag, closed chromatin; default open), `missing`
 * (indices of places where a nucleosome is missing: the DNA runs on bare there, as in Histone loss), `R` (the core radius,
 * g units; by default from the spacing), `view`, `tails` (one list of marks per nucleosome), `helix`, `pal`, `dnaPal`,
 * `markPals`. `turn` turns the whole fibre about x, y. Also returns `thread` (the DNA's axis, g units, before turning) and
 * `cores` ({ x, y, R } of each nucleosome), for placing what binds the chromatin (mg11's ChIP-seq, ATAC-seq).
 * `fibre(g, { x: 0, y: 20, size: 100, count: 3, missing: [1] })`
 */
export function fibre(g, { x = 0, y = 0, size = 100, turn = 0, id = 'chromatin-fibre', w, pal = NUC, dnaPal = PALS.dna, count = 3, from, to, via = [], compact = false, missing = [], R, view = 'side', tails = [], helix = 'auto', markPals = {} }) {
  const mp = defaultMarkPals(markPals)
  const A = from ?? [x - size / 2, y], B = to ?? [x + size / 2, y]
  const len = Math.hypot(B[0] - A[0], B[1] - A[1]), u = [(B[0] - A[0]) / len, (B[1] - A[1]) / len], nv = [-u[1], u[0]]
  const step = len / (count + (compact ? 0.6 : 0.35))
  const r = R ?? step * (compact ? 0.5 : view === 'face' ? 0.36 : 0.36)
  const places = Array.from({ length: count }, (_, i) => {
    const s = (i - (count - 1) / 2) * step, off = compact ? (i % 2 ? 1 : -1) * 0.42 * r : 0
    return [(A[0] + B[0]) / 2 + u[0] * s + nv[0] * off, (A[1] + B[1]) / 2 + u[1] * s + nv[1] * off]
  })
  const keep = places.map((p, i) => ({ p, i })).filter(({ i }) => !missing.includes(i))
  const cores = keep.map(({ p }) => coreGeo({ x: p[0], y: p[1], R: r }, view))
  // A missing nucleosome: the bare DNA passes through its place.
  const viaAll = keep.map(() => [])
  viaAll.push([])
  places.forEach((p, i) => { if (missing.includes(i)) { const k = keep.findIndex(({ i: j }) => j > i); viaAll[k < 0 ? keep.length : k].push(p) } })
  via.forEach((pts, i) => { if (pts?.length) viaAll[Math.min(i, keep.length)].push(...pts) })
  const { axis, layers } = threadOf(cores, A, B, viaAll)
  const W = w ?? clamp(lineFor(2 * r * g.k) * 0.8, 3.5, 8), D = 0.36 * r, Wd = dnaOutline(D * g.k)
  const ts = keep.map(({ i }, k) => tailsSvg(g, cores[k], tails[i] ?? [], `${id}-${i + 1}`, pal, mp, turn, clamp(0.09 * r * g.k, 3.5, 12)))
  const d = drawChromatin(g, { id, cores, axis, layers, pal, dnaPal, D, helix, W, Wd, tails: ts })
  return {
    defs: d.defs,
    body: wrap(g, id, x, y, turn, d.body),
    parts: [['histones', pal], ['DNA', dnaPal], ...d.markParts.filter(([n], i, a) => a.findIndex(([m]) => m === n) === i)],
    thread: axis, cores: cores.map(({ x: cx, y: cy, R: cr }) => ({ x: cx, y: cy, R: cr })),
  }
}

// =====================================================================================================================
// Gene block
// =====================================================================================================================

/**
 * Gene: a gene drawn as an arrow-shaped block pointing the way it is read (mg04's `gene`, shared by mg12, mg13, mg14; mg11's
 * `block`), pale green with a gradient, an outline and a highlight; on the DNA part or alone. `size` is the block's length.
 * Options: `height` (g units; default 0.63 × size), `pointed` (false: a square-ended block, a binding site or a regulatory
 * stretch), `letter` (a short name lettered on the block in its outline tone, as the operon's Z, Y, A; drawn when it can
 * be read), `onDna` (draws the DNA part through the block, `dnaLength` long, default 1.63 × size, and `dnaWidth` wide,
 * default 0.37 × height), `pal`, `dnaPal`.
 * `geneBlock(g, { x: 0, y: 0, size: 60, onDna: true })`
 */
export function geneBlock(g, { x, y, size, turn = 0, id = 'gene', w, pal = PALS.gene, height, pointed = true, letter, onDna = false, dnaLength, dnaWidth, dnaPal = PALS.dna, dnaTurns }) {
  const h = height ?? size * 0.63, x0 = x - size / 2, x1 = x + size / 2, hpx = h * g.k
  const W = w ?? clamp(hpx * 0.05, 3.5, 9), tip = pointed ? Math.min(h * 0.55, size * 0.45) : 0
  const pts = (pointed ? [[x0, y - h / 2], [x1 - tip, y - h / 2], [x1, y], [x1 - tip, y + h / 2], [x0, y + h / 2]] : [[x0, y - h / 2], [x1, y - h / 2], [x1, y + h / 2], [x0, y + h / 2]]).map(g.P)
  const body = Math.min(h, size - tip)
  const lit = hpx >= 70 ? highlight(...g.P([x0 + body * 0.42, y - h * 0.26]), f(body * g.k * 0.26), f(hpx * 0.08), -8, pal.light) : ''
  const lh = h * 0.5
  const lettered = letter && fits(g, lh) ? lettering(g, { x: x - tip / 2, y, h: Math.min(lh, ((size - tip) * 0.7) / textWidth(letter)), text: letter, colour: pal.outline, id: `${id}-letter`, turn: -turn }).body : ''
  const strand = onDna ? dna(g, { x, y, size: dnaLength ?? size * 1.63, width: dnaWidth ?? h * 0.37, turns: dnaTurns, id: `${id}-DNA`, pal: dnaPal }) : null
  return {
    defs: (strand?.defs ?? '') + gradient2(`${id}-gradient`, [g.X(x0), g.Y(y - h / 2), g.X(x1), g.Y(y + h / 2)], pal.base, pal.shadow),
    body: wrap(g, id, x, y, turn, (strand?.body ?? '') + `<g id="${id}-block"><path d="${roundPoly(pts, Math.min(3 * g.k, hpx * 0.08))}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="${f(W)}" stroke-linejoin="round"/>${lit}</g>${lettered}`),
    parts: [...(strand ? [['DNA', dnaPal]] : []), ['gene', pal]],
  }
}

// =====================================================================================================================
// Scissors
// =====================================================================================================================

/**
 * Scissors: a cut in DNA (a nuclease, CRISPR, a restriction enzyme): two halves crossing at a pivot, each a ring, a shank
 * and a sharp grey blade, the blades pointing down (mg04's CRISPR, as mg08 copied it). `size` is the height, rings to tips.
 * Options: `pal` (the rings; red as mg04; mg08 gave them the amber of a protein, `deep(75)`), `bladePal`, `open` (degrees
 * each half is opened further, default 0), `flat` (no outlines, rings and blades in their small tone; default under 110 px).
 * `scissors(g, { x: 0, y: -10, size: 50 })`
 */
export function scissors(g, { x, y, size, turn = 0, id = 'scissors', w, pal = PALS.rings, bladePal = PALS.blades, open = 0, flat }) {
  const L = frame(g, x, y, size), isFlat = flat ?? L.ext < 110, W = w ?? clamp(L.ext * 0.02, 3.5, 7)
  const pivot = [0, 5.6], ringR = 10.8
  const half = (s) => {
    const ringC = [-s * 18.9, -35.4], tip = [s * 16.4, 49.9]
    const u = [tip[0] - pivot[0], tip[1] - pivot[1]], l = Math.hypot(...u), [dx, dy] = [u[0] / l, u[1] / l], [nx, ny] = [-dy, dx]
    const at = (d, wd) => [pivot[0] + dx * d + nx * wd, pivot[1] + dy * d + ny * wd]
    const blade = [at(-23, -7.2), at(3.3, -9.5), at(l * 0.55, -7.5), at(l, 0), at(l * 0.6, 2.3), at(6.6, 4.6), at(-23, 4.6)].map(L.P)
    const shank = [L.P(at(-19.7, -1.3)), L.P([ringC[0] + s * 5.9, ringC[1] + 9.2])]
    const rot = open ? ` transform="rotate(${f(-s * open)} ${f(L.P(pivot)[0])} ${f(L.P(pivot)[1])})"` : ''
    if (isFlat) return `<g id="${id}-${s < 0 ? 'left' : 'right'}"${rot}>` + strokePath(ptsD(shank), bladePal.outline, 9.2 * L.px) +
      disc(L.P(ringC), ringR * L.px, 'none', pal.small, 9.5 * L.px) + `<path d="${roundPoly(blade, 2 * L.px)}" fill="${bladePal.small}"/></g>`
    return `<g id="${id}-${s < 0 ? 'left' : 'right'}"${rot}>` +
      strokePath(ptsD(shank), bladePal.outline, 9.2 * L.px + 2 * W) + strokePath(ptsD(shank), bladePal.base, 9.2 * L.px) +
      disc(L.P(ringC), ringR * L.px, 'none', pal.outline, 7.2 * L.px + 2 * W) + disc(L.P(ringC), ringR * L.px, 'none', pal.base, 7.2 * L.px) +
      `<path d="${roundPoly(blade, 2 * L.px)}" fill="url(#${id}-blade-gradient)" stroke="${bladePal.outline}" stroke-width="${f(W)}" stroke-linejoin="round"/></g>`
  }
  return {
    defs: isFlat ? '' : grad(`${id}-blade-gradient`, L, [-16.4, -25, 16.4, 50], bladePal),
    body: wrap(g, id, x, y, turn, half(1) + half(-1) + disc(L.P(pivot), 4.9 * L.px, bladePal.outline)),
    parts: [['scissor rings', pal], ['blades', bladePal]],
  }
}

// =====================================================================================================================
// Cas9
// =====================================================================================================================

/**
 * Cas9: a large two-lobed protein (the recognition lobe and the nuclease lobe, a crease between them) with its guide RNA
 * looping out of the top (mg14's `cas9`, shared by dCas9 and Base editor). `size` is the protein's width; the DNA belongs
 * across its lower third (local v ≈ 16), drawn after it so that the protein holds the DNA.
 * Options: `guide` (false: no guide RNA), `onDna` (draws the DNA part across, as mg14's icons:
 * 1.63 × size long, `dnaWidth` g units wide, default 0.33 × size),
 * `fused` (a protein fused to Cas9: 'linker' an effector on a grey linker at the upper right, as dCas9's VP64; 'side' an
 * enzyme against the nuclease lobe, as the base editor's deaminase), `pal`, `guidePal`, `fusedPal`, `dnaPal`.
 * A dead Cas9 (dCas9) or a nickase is drawn the same: what differs is whether the DNA is cut.
 * `cas9(g, { x: -12, y: 6, size: 60, onDna: true, fused: 'linker' })`
 */
export function cas9(g, { x, y, size, turn = 0, id = 'Cas9', w, pal = PALS.cas9, guidePal = PALS.guide, guide = true, onDna = false, dnaPal = PALS.dna, dnaWidth, fused, fusedPal = PALS.fused }) {
  const L = frame(g, x, y, size), W = w ?? lineFor(L.ext), s = size / 100
  const BODY = [[-46, 6], [-43, -18], [-28, -35], [-6, -38], [7, -31], [21, -39], [38, -31], [46, -10], [44, 14], [30, 30], [8, 35], [-18, 33], [-38, 25]]
  const crease = strokePath(ptsD(catmull([[7, -30], [3, -15], [-8, -2], [-24, 4]], 10).map(L.P)), pal.outline, W * 0.7)
  const loop = catmull([[-30, -24], [-34, -42], [-24, -58], [-8, -60], [0, -48], [-8, -36], [-16, -26]], 12)
  const T = 6.5 * L.px, Wg = Math.max(3.5, W * 0.75)
  const guideSvg = guide ? `<g id="${id}-guide-RNA">${union([ptsD(loop.map(L.P))], T, guidePal.small, guidePal.outline, Wg)}</g>` : ''
  const at = ([u, v]) => [x + u * s, y + v * s]
  let extra = null, linker = ''
  if (fused === 'linker') {
    const [ex, ey] = at([63, -65])
    extra = protein(g, { x: ex, y: ey, size: 40 * s, id: `${id}-effector`, pal: fusedPal })
    linker = `<g id="${id}-linker">${strokePath(ptsD(catmull([[40, -30], [48.3, -43.3], [56.7, -55]], 8).map(L.P)), GREY.outline, clamp(11.7 * L.px, 3.5, 9))}</g>`
  } else if (fused === 'side') {
    const [ex, ey] = at([61.7, -21.7])
    extra = protein(g, { x: ex, y: ey, size: 46.7 * s, id: `${id}-enzyme`, pal: fusedPal })
  } else if (fused) throw new Error(`genetics.mjs: cas9 fused must be 'linker' or 'side'`)
  const strand = onDna ? dna(g, { x: x + 20 * s, y: y + 16.7 * s, size: 163 * s, width: dnaWidth ?? 33 * s, turns: 3, id: `${id}-DNA`, pal: dnaPal }) : null
  return {
    defs: grad(`${id}-gradient`, L, [-46, -39, 46, 35], pal) + (extra?.defs ?? '') + (strand?.defs ?? ''),
    body: wrap(g, id, x, y, turn, linker + guideSvg + `<g id="${id}-protein"><path d="${smoothD(BODY.map(L.P))}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="${f(W)}" stroke-linejoin="round"/>` +
      crease + (L.ext >= BIG ? shine(L, [-26, -22], 10, 3.6, -35, pal.light) : '') + '</g>' + (extra?.body ?? '') + (strand?.body ?? '')),
    parts: [['Cas9', pal], ...(guide ? [['guide RNA', guidePal]] : []), ...(extra ? [['fused protein', fusedPal]] : []), ...(strand ? [['DNA', dnaPal]] : [])],
  }
}

// =====================================================================================================================

export const DEMOS = [
  { name: 'Nucleosome', size: 100, draw: (g) => nucleosome(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Nucleosome without linkers', size: 100, draw: (g) => nucleosome(g, { x: 0, y: 0, size: 100, linkers: 0 }) },
  { name: 'Nucleosome, face on', size: 100, draw: (g) => nucleosome(g, { x: 0, y: 0, size: 100, view: 'face' }) },
  { name: 'Nucleosome with marked tails', size: 100, draw: (g) => nucleosome(g, { x: 0, y: 0, size: 100, tails: ['Ac', 'P', 'Ac', 'Me'] }) },
  { name: 'Nucleosome with one acetyl group', size: 100, draw: (g) => nucleosome(g, { x: 0, y: 0, size: 100, tails: ['Ac'] }) },
  { name: 'Nucleosome face on with trimethyl mark', size: 100, draw: (g) => nucleosome(g, { x: 0, y: 0, size: 100, view: 'face', tails: ['Me3'] }) },
  { name: 'Histone octamer', size: 100, draw: (g) => octamer(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Chromatin fibre', size: 100, draw: (g) => fibre(g, { x: 0, y: 0, size: 100, count: 3 }) },
  { name: 'Chromatin fibre, compact', size: 100, draw: (g) => fibre(g, { x: 0, y: 0, size: 100, count: 5, compact: true }) },
  { name: 'Chromatin fibre with a missing nucleosome', size: 100, draw: (g) => fibre(g, { x: 0, y: 0, size: 100, count: 3, missing: [1] }) },
  { name: 'Chromatin fibre along a curve', size: 100, draw: (g) => fibre(g, { from: [-48, 30], to: [48, -30], via: [[], [[-10, 18]], [[12, -16]]], count: 3, turn: 0 }) },
  { name: 'Chromatin fibre, face on', size: 100, draw: (g) => fibre(g, { x: 0, y: 0, size: 100, count: 3, view: 'face', via: [[], [[-17, 14]], [[17, 14]]], tails: [['Me3'], ['Me3'], ['Me3']] }) },
  { name: 'Gene', size: 100, draw: (g) => geneBlock(g, { x: 0, y: 0, size: 60 }) },
  { name: 'Gene on DNA', size: 100, draw: (g) => geneBlock(g, { x: 0, y: 0, size: 60, onDna: true }) },
  { name: 'Gene, square-ended', size: 100, draw: (g) => geneBlock(g, { x: 0, y: 0, size: 60, pointed: false }) },
  { name: 'Gene with a letter', size: 100, draw: (g) => geneBlock(g, { x: 0, y: 0, size: 60, letter: 'Z' }) },
  { name: 'Scissors', size: 100, draw: (g) => scissors(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Scissors, opened', size: 100, draw: (g) => scissors(g, { x: 0, y: 0, size: 100, open: 12, pal: deep(PROTEIN) }) },
  { name: 'Cas9', size: 100, draw: (g) => cas9(g, { x: 0, y: 8, size: 92 }) },
  { name: 'Cas9 on DNA', size: 100, draw: (g) => cas9(g, { x: -16, y: 0, size: 62, onDna: true }) },
  { name: 'dCas9 with an activator', size: 100, draw: (g) => cas9(g, { x: -14, y: 10, size: 60, onDna: true, fused: 'linker' }) },
  { name: 'Base editor', size: 100, draw: (g) => cas9(g, { x: -16, y: 4, size: 60, onDna: true, fused: 'side' }) },
]
