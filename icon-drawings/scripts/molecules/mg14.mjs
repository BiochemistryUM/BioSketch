// Eight icons of SiliCoDraw's "Molecules & genetics" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David
// Carlsson; see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts in
// ../parts/: Tet-On, dCas9, base editor, transposon, lentiviral vector, alpha helix, beta sheet and molecular docking.
// Their compositions are read by hand from the source in a 100 × 100 box centred on 0,0 and scaled onto a 512 page
// (`page` of ../cellkit.mjs).
// Parts used: DNA, protein, enzyme, RNA, ligand (molecules.mjs), vesicle (organelles.mjs), arrows (tissue.mjs). Where
// the DNA has a stretch of another colour (the TRE of Tet-On) the DNA part's helix is copied here with a palette per
// stretch (`helix`, `dnaWith`, as in mg08.mjs; without stretches it draws exactly what the part draws, checked when the
// script runs). Cas9 with its guide RNA and its fused domains (`cas9`, in dCas9 and Base editor) and the gene as an
// arrow-shaped block (`geneBlock`) are the parts of ../parts/genetics.mjs. Drawn here because no part draws them: a
// transposon (`transposon`: a gene block between two inverted repeats), the cone-shaped capsid of a lentivirus (`cone`)
// and its envelope spikes, an alpha helix as a ribbon (`ribbonHelix`), a beta sheet of antiparallel strands (`betaSheet`, the look of mg10.mjs's
// `betaStack`) and a small molecule as balls and sticks (`ballStick`).
// Nothing is lettered: SiliCoDraw's labels (TRE, gene, rtTA, dox, dCas9, VP64, C→T, no DSB) are words or need glyphs
// the letters part lacks (lowercase d, o, x, digits, V); shapes and colours say the same (see each icon).
// Usage: node mg14.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, highlight, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex, toLch } from '../colour.mjs'
import { f, gradient2 } from '../shapes.mjs'
import { dna, enzyme, ligand, protein, rna } from '../parts/molecules.mjs'
import { vesicle } from '../parts/organelles.mjs'
import { arrow } from '../parts/tissue.mjs'
import { cas9, geneBlock } from '../parts/genetics.mjs'

const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const { cellType, check } = cellTypes(OUT)

// ---------- hues (OKLCH degrees) ----------
// DNA is the part's blue (267°). Cas9 keeps SiliCoDraw's pale green (158°); its guide RNA is purple (315°, as the guide
// RNA of mg04's RNA interference: rose would lie 10° from the red of an edited base, blue is the DNA's); effector domains
// fused to Cas9 (VP64, the deaminase) are the amber of a protein (75°). Tet-On: the TRE keeps SiliCoDraw's orange (57°),
// the gene its green (163°), rtTA moves from SiliCoDraw's pale blue (265°, the DNA's) to cerulean (215°), doxycycline
// is the yellow of SiliCoDraw's tablet (96°). The lentivirus keeps its lilac (315°), its capsid the orange of
// SiliCoDraw's inner box (57°), its RNA genome is rose like all RNA (15°, SiliCoDraw: green). The alpha helix keeps
// SiliCoDraw's red (25°); the beta sheet and the docked protein are the amber of every protein (75°), the docked
// ligand the green of every small molecule (165°).
const DNA = hueOf('#4f6bb8'), PROTEIN = 75, ORANGE = hueOf('#e3955a')
const GREEN = hueOf('#5fae8b'), RTTA = 215, DOX = hueOf('#fde68a'), LILAC = hueOf('#e9d5f3'), RED = hueOf('#d64545'), ION = 165
const dnaPal = deep(DNA)
/** A true grey (chroma under 0.012), for arrows and linkers that are the colour of nothing. */
const grey = (l, c = 0.006) => toHex({ l, c, h: 255 })
const GREY = { light: grey(0.985, 0.002), base: grey(0.95), shadow: grey(0.86, 0.008), small: grey(0.75, 0.008), outline: grey(0.5, 0.01) }

// ---------- helpers ----------
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const P2 = ([x, y]) => `${f(x)},${f(y)}`
const lineD = (pts) => `M${pts.map(P2).join(' L')}`
const strokePath = (d, colour, w, cap = 'round') => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
const disc = ([x, y], r, fill, s = '', w = 0) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}"${s ? ` stroke="${s}" stroke-width="${f(w)}"` : ''}/>`
/** The main outline (px) of a part of `px` on the page, as the parts have it. */
const lineFor = (px) => f(clamp(2.5 + px * 0.03, 3.5, 10))
/** A local frame of 100 units about x, y, `size` units of g (as the parts' `frame`). */
const frame = (g, x, y, size) => { const s = size / 100, px = s * g.k; return { px, ext: size * g.k, P: ([u, v]) => g.P([x + u * s, y + v * s]) } }
const wrap = (g, id, x, y, turn, inner) => `<g id="${id}"${turn ? ` transform="rotate(${f(turn)} ${f(g.X(x))} ${f(g.Y(y))})"` : ''}>${inner}</g>`
const grad = (id, L, [u0, v0, u1, v1], pal) => gradient2(id, [...L.P([u0, v0]), ...L.P([u1, v1])], pal.base, pal.shadow)
const shine = (L, [u, v], rx, ry, rot, fill) => { const [cx, cy] = L.P([u, v]); return highlight(cx, cy, f(rx * L.px), f(ry * L.px), rot, fill) }
/** Lines of width `width` (px) with one outline round them all: the outlines first, then the fills over them. */
const union = (ds, width, fill, outline, w) => ds.map((d) => strokePath(d, outline, width + 2 * w)).join('') + ds.map((d) => strokePath(d, fill, width)).join('')
/** A polygon of page points with its corners rounded by r (px). */
const roundPoly = (pts, r) => {
  const n = pts.length
  const toward = (a, b, d) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]), t = Math.min(d, l / 2) / l; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] }
  let d = ''
  for (let i = 0; i < n; i++) {
    const a = toward(pts[i], pts[(i - 1 + n) % n], r), b = toward(pts[i], pts[(i + 1) % n], r)
    d += `${i ? 'L' : 'M'}${P2(a)} Q${P2(pts[i])} ${P2(b)} `
  }
  return d + 'Z'
}
/** Puts the parts of an icon together: [part, ...] → { defs, body, parts }. */
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts ?? []) })
/** The parts of an icon for `check()`: one entry per palette, greys left out (they never join a hue). */
const huesOf = (parts) => parts.filter((p, i, a) => a.findIndex((q) => q[1].base === p[1].base) === i).filter((p) => toLch(p[1].base).c >= 0.012)
const icon = (name, { defs, body, parts }) => cellType(name, huesOf(parts), defs, body)

// =====================================================================================================================
// The DNA part's double helix (../parts/molecules.mjs, `helix`, `dna`), copied as mg08.mjs copied it, with a palette per
// strand and place (`palOf(k, t)`), for a stretch of DNA in another colour (a binding site). Large (outlined) helices.
// =====================================================================================================================
const capUnder = ([x, y], T, outline, w) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(T / 2 + w / 2)}" fill="${outline}" stroke="${outline}" stroke-width="${f(w)}"/>`
const capOver = ([x, y], T, fill) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(T / 2)}" fill="${fill}"/>`
const helix = (L, { centre, normal, twists, A, T, W, palOf, on, n }) => {
  const strands = [1, -1].map((sign, k) => Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, [cx, cy] = centre(t), [nx, ny] = normal(t), ph = 2 * Math.PI * twists * t
    return { p: L.P([cx + nx * A * sign * Math.sin(ph), cy + ny * A * sign * Math.sin(ph)]), front: sign * Math.cos(ph) >= 0, on: on(k, t), pal: palOf(k, t) }
  }))
  const runsOf = (pts) => {
    const out = []
    let a = null
    for (let j = 0; j < pts.length; j++) {
      if (!pts[j].on) { if (a !== null && j - 1 > a) out.push([a, j - 1]); a = null; continue }
      if (a === null) { a = j; continue }
      if (pts[j].front !== pts[j - 1].front || pts[j].pal !== pts[j - 1].pal) { out.push([a, j]); a = j }
    }
    if (a !== null && a < pts.length - 1) out.push([a, pts.length - 1])
    return out.map(([a, b]) => ({ ab: [a, b], front: pts[a].front, pal: pts[a].pal }))
  }
  const Tp = T * L.px
  const draw = (pts, { ab: [a, b], pal }, k) => {
    const all = pts.map((q) => q.p), fill = k === 0 ? pal.base : pal.shadow
    const reach = (m) => { let lo = a, hi = b; for (let i = 0; i < m && lo > 0 && pts[lo - 1].on; i++) lo--; for (let i = 0; i < m && hi < pts.length - 1 && pts[hi + 1].on; i++) hi++; return [lo, hi] }
    const ends = [!(a > 0 && pts[a - 1].on) && all[a], !(b < pts.length - 1 && pts[b + 1].on) && all[b]].filter(Boolean)
    const [o0, o1] = reach(1), [f0, f1] = reach(2)
    return ends.map((p) => capUnder(p, Tp, pal.outline, W)).join('') +
      strokePath(lineD(all.slice(o0, o1 + 1)), pal.outline, Tp + 2 * W, 'butt') + strokePath(lineD(all.slice(f0, f1 + 1)), fill, Tp, 'butt') +
      ends.map((p) => capOver(p, Tp, fill)).join('')
  }
  const runs = strands.map(runsOf)
  const layer = (front) => runs.flatMap((rs, k) => rs.filter((r) => r.front === front).map((r) => draw(strands[k], r, k))).join('')
  const pairs = []
  for (let h = 0; h < twists * 2; h++)
    for (const q of [0.25, 0.5, 0.75]) {
      const t = (h + q) / (twists * 2), [cx, cy] = centre(t), [nx, ny] = normal(t), ph = 2 * Math.PI * twists * t, s = Math.sin(ph) * A
      const inset = (T / 2 + W / L.px) * Math.sign(s)
      if (Math.abs(s) * 2 < T * 2.2 || !on(0, t) || !on(1, t)) continue
      const pal = palOf(0, t) === palOf(1, t) ? palOf(0, t) : palOf(-1, t)
      pairs.push(strokePath(lineD([L.P([cx + nx * (s - inset), cy + ny * (s - inset)]), L.P([cx - nx * (s - inset), cy - ny * (s - inset)])]), pal.small, Math.max(1.5, Tp * 0.42), 'butt'))
    }
  return layer(false) + pairs.join('') + layer(true)
}
const stretchPal = (base, stretches) => (k, t) => (k < 0 ? base : stretches.find(([a, b, , s]) => t >= a && t <= b && (s === undefined || s === k))?.[2] ?? base)
/** The geometry of an upright, outlined DNA helix as `dna` draws it (local units of its frame). */
const dnaGeo = (g, { x, y, size, width, turns, w }) => {
  const L = frame(g, x, y, size), D = ((width ?? size * 0.26) / size) * 100
  const W = w ?? clamp(D * L.px * 0.06, 3.5, 7), T = D * 0.15, A = (D - T) / 2 - W / L.px, tw = turns ?? Math.max(1, Math.round(100 / (D * 1.9)))
  return { L, W, T, A, tw, half: 50 - T / 2 - W / L.px }
}
/** The DNA part (straight, large) with `stretches` of other palettes ([t0, t1, pal, strand?]). Same options as `dna`. */
function dnaWith(g, { x, y, size, turn = 0, id = 'DNA', w, pal = dnaPal, width, turns, stretches = [] }) {
  const { L, W, T, A, tw, half } = dnaGeo(g, { x, y, size, width, turns, w })
  const body = helix(L, { centre: (t) => [-half + 2 * half * t, 0], normal: () => [0, 1], twists: tw, A, T, W, palOf: stretchPal(pal, stretches), on: () => true, n: Math.max(60, Math.round(tw * 40)) })
  return { defs: '', body: wrap(g, id, x, y, turn, body), parts: [['DNA', pal], ...stretches.map((s) => [`${id} stretch`, s[2]])] }
}
/** The two ends of the base pair in the middle of half turn `h` of an upright helix (page points), and its width (px). */
const basePair = (g, o, h) => {
  const { L, W, T, A, tw, half } = dnaGeo(g, o), t = (h + 0.5) / (tw * 2), cx = -half + 2 * half * t, s = Math.sin(2 * Math.PI * tw * t) * A, e = s - (T / 2 + W / L.px) * Math.sign(s)
  return { ends: [L.P([cx, e]), L.P([cx, -e])], width: T * L.px, x: o.x + (cx * o.size) / 100 }
}
// Without stretches the copy must draw what the part draws.
{
  const g = page(4.6, [0, 0])
  if (dnaWith(g, { x: 3, y: -4, size: 60, width: 18, turns: 2, turn: 12 }).body !== dna(g, { x: 3, y: -4, size: 60, width: 18, turns: 2, turn: 12, flat: false }).body) throw new Error('the copied helix differs from the DNA part')
}

// ---------------------------------------------------------------------------------------------------------------------
// Tet-On: the transactivator rtTA, with doxycycline bound, sits on the TRE (the tet-responsive element, an orange stretch
// of the DNA) and switches on the gene behind it (green arrow block; the bent arrow is the start of transcription).
// (SiliCoDraw: a line with an orange "TRE" box and a green "gene" box, a pale blue "rtTA" blob above, a "dox" tablet
// and an arrow. Here the DNA is the DNA part with the TRE a stretch of it, rtTA the protein part on it, doxycycline a
// small yellow molecule (the ligand part) bound to rtTA rather than a tablet: in Tet-On the drug binds the protein,
// which only then binds the TRE. The labels are left out.)
{
  const g = page(4.62, [-0.8, 3.7]), site = deep(ORANGE), genePal = soft(GREEN), rtta = soft(RTTA), dox = rich(DOX)
  const helixPart = dnaWith(g, { x: 0, y: 22, size: 98, width: 20, turns: 3, id: 'DNA', stretches: [[0.04, 0.36, site]] })
  const tf = protein(g, { x: -27, y: 1, size: 46, id: 'rtTA', pal: rtta })
  const drug = ligand(g, { x: -42, y: -22, size: 17, id: 'doxycycline', pal: dox })
  const gn = geneBlock(g, { x: 25.5, y: 22, size: 43, height: 30, pal: genePal, w: 9, id: 'gene' })
  const start = arrow(g, { points: [[8, 5], [8, -22], [36, -22]], corners: true, colour: GREY.outline, id: 'transcription-start', w: 10 })
  icon('Tet-On', join(tf, drug, helixPart, gn, start))
}

// dCas9: a dead Cas9 (it binds but does not cut), led by its guide RNA to a gene's promoter, carries an activator domain
// (VP64, amber) that switches the gene on (the bent arrow): CRISPR activation.
// (SiliCoDraw: a line with ticks, a pale green "dCas9" blob, a blue arc of guide RNA and an orange "VP64" box on a
// linker. Here Cas9 is the Cas9 part of ../parts/genetics.mjs on the DNA part, with VP64 (the protein part) fused on a
// grey linker, and the gene's start a bent arrow; the DNA is left whole, since dCas9 does not cut. The labels are left out.)
{
  const g = page(4.62, [0, -8.3]), effector = rich(PROTEIN)
  // Cas9 on the DNA (the part's DNA: 98 long at y = 16, 20 wide) with VP64 on its grey linker at the upper right.
  const c = cas9(g, { x: -12, y: 6, size: 60, onDna: true, fused: 'linker', fusedPal: effector })
  const start = arrow(g, { points: [[30, 0], [30, -10], [47, -10]], corners: true, colour: GREY.outline, id: 'transcription-start', w: 10 })
  icon('dCas9', join(c, start))
}

// Base editor: a Cas9 nickase led by its guide RNA, with a deaminase (amber) fused to it, changes one base without
// cutting the DNA across: the edited base pair is red.
// (SiliCoDraw: a ladder with one red rung, "C→T" over it, a pale green blob and "no DSB". Here the DNA is the DNA part,
// Cas9 the Cas9 part as in dCas9, the deaminase (the protein part) fused beside it, reaching the red base pair; the DNA is
// whole (no double-strand break). The labels are left out; the red base pair says what changed.)
{
  const g = page(4.62, [0, -2.9]), effector = rich(PROTEIN), edit = deep(RED)
  // Cas9 with the deaminase against its nuclease lobe, on the DNA; `o` is where the part puts that DNA (20 right of and
  // 16.7 below Cas9's middle, 1.63 × its size long, in Cas9's units), for the edited base pair.
  const cx = -12, cy = 6, size = 60, s = size / 100
  const c = cas9(g, { x: cx, y: cy, size, onDna: true, dnaWidth: 22, fused: 'side', fusedPal: effector })
  const o = { x: cx + 20 * s, y: cy + 16.7 * s, size: 163 * s, width: 22, turns: 3 }
  const bp = basePair(g, o, 4)
  const pair = { defs: '', body: `<g id="edited-base-pair">${strokePath(lineD(bp.ends), edit.small, bp.width * 0.85, 'butt')}</g>`, parts: [['edited base', edit]] }
  icon('Base editor', join(c, pair))
}

// ---------------------------------------------------------------------------------------------------------------------
// A transposon (drawn here): a gene block (green) between two inverted repeats (orange triangles pointing inwards),
// set on a DNA. `x` is its middle; it is `width` long and `h` high (g units).
const transposon = (g, { x, y, width, h, id, genePal, repeatPal, w }) => {
  const tri = 9, x0 = x - width / 2 + tri, x1 = x + width / 2 - tri, th = h * 1.15
  const box = [[x0, y - h / 2], [x1, y - h / 2], [x1, y + h / 2], [x0, y + h / 2]].map(g.P)
  const repeat = (s) => { const b = s < 0 ? x - width / 2 : x + width / 2; return roundPoly([[b, y - th / 2], [b - s * tri, y], [b, y + th / 2]].map(g.P), 2 * g.k) }
  return {
    defs: gradient2(`${id}-gradient`, [g.X(x0), g.Y(y - h / 2), g.X(x1), g.Y(y + h / 2)], genePal.base, genePal.shadow),
    body: `<g id="${id}"><g id="${id}-inverted-repeats">${[-1, 1].map((s) => `<path d="${repeat(s)}" fill="${repeatPal.small}" stroke="${repeatPal.outline}" stroke-width="${w}" stroke-linejoin="round"/>`).join('')}</g>` +
      `<g id="${id}-gene"><path d="${roundPoly(box, 3 * g.k)}" fill="url(#${id}-gradient)" stroke="${genePal.outline}" stroke-width="${w}" stroke-linejoin="round"/>${highlight(...g.P([x0 + h * 0.42, y - h * 0.26]), f(h * g.k * 0.26), f(h * g.k * 0.08), -8, genePal.light)}</g></g>`,
    parts: [['transposon gene', genePal], ['inverted repeats', repeatPal]],
  }
}

// Transposon: a transposon (a gene between inverted repeats) leaves one place in the DNA and is inserted in another.
// (SiliCoDraw: two lines, each with a green box between orange triangles, and a dashed arrow between them. Here both
// are the DNA part, the transposon is drawn larger, and the arrow is the arrow part in grey, solid and bent.)
{
  const g = page(4.62, [0, 1]), genePal = soft(GREEN), repeatPal = deep(ORANGE)
  const top = dna(g, { x: 0, y: -27, size: 98, width: 16, turns: 4, id: 'donor-DNA' })
  const bottom = dna(g, { x: 0, y: 29, size: 98, width: 16, turns: 4, id: 'target-DNA' })
  const t1 = transposon(g, { x: -16, y: -27, width: 40, h: 22, id: 'transposon', genePal, repeatPal, w: 8 })
  const t2 = transposon(g, { x: 18, y: 29, width: 40, h: 22, id: 'inserted-transposon', genePal, repeatPal, w: 8 })
  const jump = arrow(g, { points: [[-10, -12], [6, 0], [14, 12]], colour: GREY.outline, id: 'jump', w: 9 })
  icon('Transposon', join(top, bottom, t1, t2, jump))
}

// ---------------------------------------------------------------------------------------------------------------------
// The cone-shaped capsid of a lentivirus (drawn here): a cone with rounded ends, narrow end r0 at the left, wide end r1
// at the right, `len` between the centres of the ends (g units), turned by `turn`.
const cone = (g, { x, y, len, r0, r1, turn, id, pal, w }) => {
  const a = Math.asin((r1 - r0) / len)
  // The wide end (right): angles from −(90° + a) to 90° + a about its centre; the narrow end (left) the rest.
  const right = Array.from({ length: 25 }, (_, i) => { const t = -(Math.PI / 2 + a) + ((Math.PI + 2 * a) * i) / 24; return [x + len / 2 + r1 * Math.cos(t), y + r1 * Math.sin(t)] })
  const left = Array.from({ length: 25 }, (_, i) => { const t = Math.PI / 2 + a + ((Math.PI - 2 * a) * i) / 24; return [x - len / 2 + r0 * Math.cos(t), y + r0 * Math.sin(t)] })
  const d = `M${[...right, ...left].map(g.P).map(P2).join(' L')}Z`
  const L = { px: g.k, P: g.P }
  return {
    defs: gradient2(`${id}-gradient`, [g.X(x - len / 2), g.Y(y - r1), g.X(x + len / 2), g.Y(y + r1)], pal.base, pal.shadow),
    body: `<g id="${id}"${turn ? ` transform="rotate(${f(turn)} ${f(g.X(x))} ${f(g.Y(y))})"` : ''}><path d="${d}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="${w}" stroke-linejoin="round"/>${shine(L, [x + len / 2 - r1 * 0.35, y - r1 * 0.55], 6, 2, -12, pal.light)}</g>`,
    parts: [['capsid', pal]],
  }
}

// Lentiviral vector: an enveloped particle (lilac lipid envelope studded with glycoprotein spikes) round a cone-shaped
// capsid that holds two copies of the RNA genome (rose), which carries the transgene.
// (SiliCoDraw: a lilac disc with twelve spikes, two green wavy lines and a small orange box. Here the envelope is the
// vesicle part with the spikes drawn on it, the box becomes the cone-shaped capsid of a lentivirus, and the two wavy
// lines are the RNA part inside it, rose like all RNA.)
{
  const g = page(4.62, [0, 0]), env = soft(LILAC), capsidPal = soft(ORANGE)
  const envelope = vesicle(g, { x: 0, y: 0, size: 72, id: 'envelope', pal: env })
  const spikes = Array.from({ length: 12 }, (_, i) => {
    const t = ((i + 0.5) / 12) * 2 * Math.PI, at = (r) => g.P([r * Math.cos(t), r * Math.sin(t)])
    return `<g id="spike-${i + 1}">${strokePath(lineD([at(34), at(42.5)]), env.outline, 7)}${disc(at(44), 4.3 * g.k, env.small, env.outline, 6)}</g>`
  }).join('')
  const capsid = cone(g, { x: 0, y: 1, len: 34, r0: 6.5, r1: 15, turn: -28, id: 'capsid', pal: capsidPal, w: 8 })
  const genome = [-4.5, 4.5].map((v, i) => rna(g, { x: 1 + v * Math.sin(0.49), y: 1 + v * Math.cos(0.49), size: 26, waves: 2, turn: -28, width: 7, id: `RNA-genome-${i + 1}` }))
  icon('Lentiviral vector', join(envelope, { defs: '', body: `<g id="spikes">${spikes}</g>`, parts: [] }, capsid, ...genome))
}

// ---------------------------------------------------------------------------------------------------------------------
// Alpha helix (drawn here): a ribbon wound into a right-handed helix about an upright axis, as protein cartoons draw it.
// The halves of each turn that face the viewer are lit (a gradient over the whole helix, one highlight on the top one);
// the halves behind show the inside of the ribbon in the small tone. `height` is the axis's length, `radius` the
// helix's, `band` the ribbon's half width (g units).
function ribbonHelix(g, { x, y, height, radius, turns, band, id = 'alpha-helix', pal, w }) {
  const c = height / (2 * Math.PI * turns), th0 = -Math.PI / 2, yc = (th) => y + height / 2 - c * (th - th0)
  const pieces = Array.from({ length: Math.round(turns * 2) }, (_, k) => {
    const ths = Array.from({ length: 25 }, (_, i) => th0 + k * Math.PI + (Math.PI * i) / 24)
    const upper = ths.map((th) => [x + radius * Math.sin(th), yc(th) - band]), lower = ths.map((th) => [x + radius * Math.sin(th), yc(th) + band]).reverse()
    return { front: k % 2 === 0, d: `M${[...upper, ...lower].map(g.P).map(P2).join(' L')}Z`, k }
  })
  const draw = (p) => `<path d="${p.d}" fill="${p.front ? `url(#${id}-gradient)` : pal.small}" stroke="${pal.outline}" stroke-width="${w}" stroke-linejoin="round"/>`
  const top = pieces.filter((p) => p.front).at(-1), thTop = th0 + top.k * Math.PI
  return {
    defs: gradient2(`${id}-gradient`, [g.X(x - radius), g.Y(y - height / 2), g.X(x + radius), g.Y(y + height / 2)], pal.base, pal.shadow),
    body: `<g id="${id}"><g id="${id}-back">${pieces.filter((p) => !p.front).map(draw).join('')}</g><g id="${id}-front">${pieces.filter((p) => p.front).map(draw).join('')}` +
      highlight(...g.P([x - radius * 0.3, yc(thTop + Math.PI * 0.4) - band * 0.25]), f(radius * g.k * 0.28), f(band * g.k * 0.22), -14, pal.light) + '</g></g>',
    parts: [['alpha helix', pal]],
  }
}

// Alpha helix: one alpha helix of a protein, as a ribbon (drawn here, see `ribbonHelix`), right-handed as it is in
// proteins. (SiliCoDraw: five slanted red bands over pink ones; here four turns of a ribbon in SiliCoDraw's red.)
{
  const g = page(4.62, [0, 0])
  icon('Alpha helix', join(ribbonHelix(g, { x: 0, y: 0, height: 76, radius: 31, turns: 3, band: 6.5, pal: deep(RED), w: 8 })))
}

// ---------------------------------------------------------------------------------------------------------------------
// Beta sheet (drawn here, in the look of mg10.mjs's `betaStack`): β-strands as broad flat arrows side by side, each
// running the other way from its neighbours (an antiparallel sheet), every other one in the shadow tone, with short
// dashes between them, the hydrogen bonds that hold the sheet. `size` is its height; `count` strands.
function betaSheet(g, { x, y, size, id = 'beta-sheet', pal = rich(PROTEIN), count = 4, gap = 25 }) {
  const L = frame(g, x, y, size), W = lineFor(L.ext) * 0.8
  const left = (-(count - 1) * gap) / 2, h = 6.4, head = 12.5, hl = 20
  const strand = (u, up) => {
    const s = up ? -1 : 1 // the tip is at v = 48 s
    return lineD([[u - h, -48 * s], [u + h, -48 * s], [u + h, 48 * s - hl * s], [u + head, 48 * s - hl * s], [u, 48 * s], [u - head, 48 * s - hl * s], [u - h, 48 * s - hl * s]].map(L.P)) + 'Z'
  }
  const us = Array.from({ length: count }, (_, i) => left + i * gap)
  const bonds = us.slice(1).flatMap((u, i) => [-24, -6, 12, 30].map((v) => lineD([L.P([u - gap + h + 3.2, v + (i % 2 ? 6 : 0)]), L.P([u - h - 3.2, v + (i % 2 ? 6 : 0)])])))
  return {
    defs: grad(`${id}-gradient`, L, [left - head, -48, -left + head, 48], pal) + gradient2(`${id}-shadow-gradient`, [...L.P([left - head, -48]), ...L.P([-left + head, 48])], pal.shadow, pal.small),
    body: `<g id="${id}"><g id="${id}-hydrogen-bonds">${bonds.map((d) => strokePath(d, pal.outline, Math.max(2.5, 2 * L.px))).join('')}</g>` +
      `<g id="${id}-strands">${us.map((u, i) => `<path d="${strand(u, i % 2 === 0)}" fill="url(#${id}-${i % 2 ? 'shadow-' : ''}gradient)" stroke="${pal.outline}" stroke-width="${f(W)}" stroke-linejoin="round"/>`).join('')}` +
      (L.ext >= 140 ? shine(L, [left - 1.5, 0], 1.6, 14, 0, pal.light) : '') + '</g></g>',
    parts: [['beta sheet', pal]],
  }
}

// Beta sheet: four antiparallel β-strands side by side (drawn here, see `betaSheet`).
// (SiliCoDraw: four upright arrows, alternately up and down, alternately orange and pale, with dotted hydrogen bonds.
// Here in the amber of every protein, as the amyloid fibril's strands.)
{
  const g = page(4.62, [0, 0])
  icon('Beta sheet', join(betaSheet(g, { x: 0, y: 0, size: 96, count: 4 })))
}

// ---------------------------------------------------------------------------------------------------------------------
// A small molecule as balls and sticks (drawn here): atoms at `atoms` (g units about x, y, turned by `turn`) joined by
// sticks between the atoms named in `bonds`, in the green of every small molecule; balls with an outline and a gradient.
function ballStick(g, { x, y, atoms, bonds, r, turn = 0, id = 'small-molecule', pal = deep(ION), w }) {
  const R = (turn * Math.PI) / 180, at = ([u, v]) => g.P([x + u * Math.cos(R) - v * Math.sin(R), y + u * Math.sin(R) + v * Math.cos(R)])
  const sticks = bonds.map(([i, j]) => lineD([at(atoms[i]), at(atoms[j])]))
  return {
    defs: `<linearGradient id="${id}-gradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`,
    body: `<g id="${id}"><g id="${id}-bonds">${union(sticks, r * g.k * 0.55, pal.small, pal.outline, w * 0.8)}</g><g id="${id}-atoms">` +
      atoms.map((a) => { const [cx, cy] = at(a); return disc([cx, cy], r * g.k - w / 2, `url(#${id}-gradient)`, pal.outline, w) + highlight(cx - r * g.k * 0.38, cy - r * g.k * 0.4, f(r * g.k * 0.34), f(r * g.k * 0.14), -40, pal.light) }).join('') + '</g></g>',
    parts: [['ligand', pal]],
  }
}

// Molecular docking: a small molecule (green, balls and sticks) fitted into the binding pocket of a protein (amber, the
// enzyme part), coming in along the grey arrow.
// (SiliCoDraw: a pale blue protein with a white pocket holding an orange three-atom molecule, motion lines and a dashed
// trail. Here the protein is the enzyme part in the amber of every protein, the molecule green like every small
// molecule, half way into the pocket, and the trail a grey arrow; the motion lines are left out.)
{
  const g = page(4.85, [-4.2, 10.4])
  const turn = -40, rad = (turn * Math.PI) / 180, dir = [Math.cos(rad), Math.sin(rad)], c = [-12, 10]
  const prot = enzyme(g, { x: c[0], y: c[1], size: 84, turn, id: 'protein' })
  // The molecule's axis lies along the pocket: one atom deep in the pocket, two at its mouth.
  const along = (d) => [c[0] + dir[0] * d, c[1] + dir[1] * d]
  const [mx, my] = along(25)
  const mol = ballStick(g, { x: mx, y: my, turn, r: 5.2, w: 6, id: 'ligand', atoms: [[-10, 0], [0, 0], [7, -9.5], [7, 9.5]], bonds: [[0, 1], [1, 2], [1, 3]] })
  const [ax, ay] = along(58), [bx, by] = along(42)
  const trail = arrow(g, { points: [[ax + 10, ay - 2], [(ax + bx) / 2 + 4, (ay + by) / 2 + 2], [bx, by]], colour: GREY.outline, id: 'approach', w: 9 })
  icon('Molecular docking', join(prot, trail, mol))
}

check()
console.log('written to', OUT)
