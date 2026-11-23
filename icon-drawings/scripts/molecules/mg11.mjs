// Eight icons of SiliCoDraw's "Molecules & genetics" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts in ../parts/:
// Lewy body, SASP, hormone, operon, aptamer, chaperone, ChIP-seq and ATAC-seq. Their compositions are read by hand from the
// source in a 100 × 100 box centred on 0,0 and scaled onto a 512 page (`page` of ../cellkit.mjs).
// Parts used: cell, the approved Senescent cell, release of signals, blood vessel, arrows (tissue.mjs); nucleus
// (organelles.mjs); protein, aggregate, antibody, DNA, RNA's look, growth-factor dots (molecules.mjs); letters (letters.mjs); the chromatin fibre and gene blocks (genetics.mjs).
// Drawn here because no part draws them: a neuron's cell body with the stubs of its processes (`neuronSoma`, round the
// cell part), the halo of a Lewy body (`lewyBody`), a nucleic-acid stem-loop that
// folds round its target and an unfolded chain (both drawn in their icons' sections), the chaperonin barrel GroEL–GroES (`chaperonin`),
// a bead (`bead`), a peak of sequencing
// reads (`peak`) and sequenced fragments with their adapters (`fragment`). Lettered by the gene-block part: the promoter "P",
// the operator "O" and the genes "Z", "Y", "A" of the operon. Left out: "repressor", "HSP",
// "Tn5" and "open chromatin"; the shapes and colours say the same.
// Usage: node mg11.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex, toLch } from '../colour.mjs'
import { catmull, f, gradient2, pathOf } from '../shapes.mjs'
import { aggregate, antibody, dna, growthFactor, protein } from '../parts/molecules.mjs'
import { nucleus } from '../parts/organelles.mjs'
import { EPI, VESSEL, arrow, cell, placeCellType, release, vessel } from '../parts/tissue.mjs'
import { fibre, geneBlock } from '../parts/genetics.mjs'

const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012) are left out of the hue check, as STYLE.md says: BioSketch never recolours them with a part.
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p]) => toLch(p.base).c >= 0.012), defs, body)

// ---------- hues (OKLCH degrees) ----------
// Of the set: protein amber 75, small molecules green 165, DNA blue 267, RNA rose 15, nucleus lilac 318, neuron and
// epithelial peach 52, vessel rose 18, secreted signals blue 244. Of this batch: the Lewy body eosin rose 8 (42° from the
// neuron, 50° from the nucleus); its green 163 for chaperones, the Tn5 transposase and
// the transcription factor; its orange 57 for the operator; its pink 357 for the repressor; the ChIP antibody is the antibody part's amber
// (75°, 116° from the histones' lilac); a cerulean 210 for the cytokines of SASP (45° from the
// senescent cell's blue granules).
const DNA_HUE = hueOf('#4f6bb8'), GREEN = hueOf('#5fae8b'), ORANGE = hueOf('#e3955a'), PINK = hueOf('#f6d0dc')
const RNA = 15, AMBER = 75, LEWY = 8, CERULEAN = 210, GLAND = 150, SIGNAL = 244
const dnaPal = deep(DNA_HUE)
// Arrows, the bead and the promoter in a true grey (chroma below 0.012): the parts' INK lies within 36° of DNA's blue.
const GREY = { light: toHex({ l: 0.985, c: 0, h: 255 }), base: toHex({ l: 0.94, c: 0.006, h: 255 }), shadow: toHex({ l: 0.84, c: 0.008, h: 255 }), small: toHex({ l: 0.75, c: 0.008, h: 255 }), outline: toHex({ l: 0.5, c: 0.008, h: 255 }) }

// ---------- helpers ----------
const P2 = ([x, y]) => `${f(x)},${f(y)}`
const ptsD = (pts) => `M${pts.map(P2).join(' L')}`
const stroke = (d, colour, w, cap = 'round') => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
const disc = ([x, y], r, fill, s = '', w = 0) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}"${s ? ` stroke="${s}" stroke-width="${f(w)}"` : ''}/>`
const shine = ([x, y], rx, ry, rot, fill) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" transform="rotate(${rot} ${f(x)} ${f(y)})" fill="${fill}"/>`
/** Puts parts together: [part, ...] → { defs, body, parts }. */
const join = (...ps) => ({ defs: ps.map((p) => p.defs ?? '').join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts ?? []) })
/** One gradient that lights every shape that uses it from its own top left (beads, blocks). */
const boxGrad = (id, pal) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`
/** A polygon of page points with its corners rounded by r (px) (as mg04). */
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
/** The cumulative length along a point list, and a point a distance d along it. */
const lengthOf = (pts) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0)
const pointAt = (pts, d) => {
  let s = 0
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]], l = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (s + l >= d || i === pts.length - 1) { const t = l ? Math.min(1, (d - s) / l) : 0; return { p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], u: [(b[0] - a[0]) / l, (b[1] - a[1]) / l] } }
    s += l
  }
}
// =====================================================================================================================
// Drawings of this batch (no part draws them)
// =====================================================================================================================

/**
 * A neuron's cell body: the cell part (no nucleus of its own) with the stubs of its processes, tapering outwards, joined
 * to it under one outline. `stubs`: [angle (degrees, clockwise from +x), length beyond the edge, width at the base] in g
 * units. The stubs are drawn first with their outline, the body over them, then each stub's root again in the body's
 * gradient over the body's outline, so the outline runs round the whole neuron.
 */
const neuronSoma = (g, { x, y, size, aspect, id, pal, stubs }) => {
  const c = cell(g, { x, y, size, aspect, id, pal, nucleus: false, vesicles: false })
  const w = +c.body.match(/stroke-width="([\d.]+)"/)[1]
  const rx = (size / 2) * g.k - w / 2, ry = rx * aspect, [cx, cy] = g.P([x, y])
  const edge = (a) => { const t = (a * Math.PI) / 180, u = [Math.cos(t), Math.sin(t)], r = 1 / Math.hypot(u[0] / rx, u[1] / ry); return { u, r } }
  const shape = (a, len, base) => {
    const { u, r } = edge(a), n = [-u[1], u[0]], L = len * g.k, B = (base * g.k) / 2, tip = Math.max(2, B * 0.45)
    const to = r + L
    const at = (d, h) => [cx + u[0] * d + n[0] * h, cy + u[1] * d + n[1] * h]
    // Half width at a distance d from the middle: a fillet where it leaves the body, then a steady taper to a round tip.
    const half = (d) => { const t = (d - r) / L; return tip + (B - tip) * (1 - Math.max(0, t)) + B * 0.45 * Math.exp(-Math.max(0, t) / 0.14) }
    const ds = Array.from({ length: 29 }, (_, i) => r - 0.15 * L - 3 * w + (to - r + 0.15 * L + 3 * w) * (i / 28))
    const left = ds.map((d) => at(d, half(d))), right = ds.map((d) => at(d, -half(d))).reverse()
    const capPts = Array.from({ length: 9 }, (_, i) => { const t = Math.PI / 2 - (Math.PI * (i + 1)) / 10; return at(to + tip * Math.cos(t), tip * Math.sin(t)) })
    return { pts: [...left, ...capPts, ...right], u, r }
  }
  // One outline round body and stubs (as `union` of cellkit's page): the stubs' outlines under the body, their fills over
  // its outline, in the body's own gradient, so the outline runs round the whole neuron.
  const ds = stubs.map(([a, len, base]) => pathOf(shape(a, len, base).pts))
  const under = ds.map((d) => `<path d="${d}" fill="${pal.outline}" stroke="${pal.outline}" stroke-width="${f(2 * w)}" stroke-linejoin="round"/>`).join('')
  const roots = ds.map((d) => `<path d="${d}" fill="url(#${id}-gradient)"/>`).join('')
  const head = `<g id="${id}-cytoplasm">`, at0 = c.body.indexOf(head) + head.length, at1 = c.body.indexOf('/>', at0) + 2
  // The body's own outline joins the union: its ellipse is drawn as the outline layer under everything (2 w wide about
  // the edge of its fill) and again, without a stroke, as the fill.
  const outline = c.body.slice(at0, at1), [erx, ery] = ['rx', 'ry'].map((k) => +outline.match(new RegExp(` ${k}="([\\d.]+)"`))[1] - w / 2)
  const shapeOf = (fill, extra) => outline.replace(/ rx="[\d.]+"/, ` rx="${f(erx)}"`).replace(/ ry="[\d.]+"/, ` ry="${f(ery)}"`).replace(/ fill="[^"]*"/, ` fill="${fill}"`).replace(/ stroke="[^"]*" stroke-width="[^"]*"/, extra)
  const body = c.body.slice(0, at0) + `<g id="${id}-outline">${shapeOf(pal.outline, ` stroke="${pal.outline}" stroke-width="${f(2 * w)}"`)}${under}</g>` + shapeOf(`url(#${id}-gradient)`, '') + roots + c.body.slice(at1)
  return { defs: c.defs, body, parts: c.parts }
}

/**
 * A Lewy body: a round inclusion with a pale halo of radiating fibrils round a dense core of aggregated α-synuclein (the
 * aggregate part). `size` is the halo's diameter.
 */
const lewyBody = (g, { x, y, size, id = 'Lewy-body', pal = deep(LEWY), halo = soft(LEWY) }) => {
  const R = size / 2, [cx, cy] = g.P([x, y]), Rp = R * g.k, w = 5
  const core = aggregate(g, { x: x + 0.6, y: y + 0.4, size: size * 0.6, id: `${id}-core`, pal, count: 4, turn: 15 })
  // Fibrils: short strokes from the edge of the core to the halo's rim, evenly round it.
  const fibrils = Array.from({ length: 16 }, (_, i) => {
    const t = (i / 16) * 2 * Math.PI + 0.12, u = [Math.cos(t), Math.sin(t)]
    return stroke(ptsD([[cx + u[0] * Rp * 0.62, cy + u[1] * Rp * 0.62], [cx + u[0] * (Rp - w * 1.6), cy + u[1] * (Rp - w * 1.6)]]), halo.small, Math.max(3, Rp * 0.06))
  }).join('')
  return {
    defs: gradient2(`${id}-halo-gradient`, [cx - Rp, cy - Rp, cx + Rp, cy + Rp], halo.light, halo.base) + core.defs,
    body: `<g id="${id}"><g id="${id}-halo">${disc([cx, cy], Rp - w / 2, `url(#${id}-halo-gradient)`, halo.outline, w)}${fibrils}</g>${core.body}</g>`,
    parts: [['Lewy body', pal]],
  }
}

/** A bead (magnetic or agarose, for pulling an antibody down): a grey sphere with its highlight. `size` its diameter. */
const bead = (g, { x, y, size, id = 'bead', pal = GREY, w = 6 }) => {
  const R = (size / 2) * g.k - w / 2, [cx, cy] = g.P([x, y])
  return {
    defs: gradient2(`${id}-gradient`, [cx - R, cy - R, cx + R, cy + R], pal.base, pal.small),
    body: `<g id="${id}">${disc([cx, cy], R, `url(#${id}-gradient)`, pal.outline, w)}${shine([cx - R * 0.38, cy - R * 0.42], R * 0.34, R * 0.13, -40, pal.light)}</g>`,
    parts: [['bead', pal]],
  }
}

// =====================================================================================================================
// The icons
// =====================================================================================================================

// Lewy body: a neuron's cell body (peach, as the approved Neuron) with the stubs of its processes, its nucleus pushed to
// one side by a Lewy body: a round inclusion with a dense core of aggregated α-synuclein and a pale halo of fibrils.
// (SiliCoDraw: a peach body with four thin stubs, a grey nucleus and a body of three orange rings. Here the stubs are the
// roots of real processes under one outline with the body, the nucleus is the lilac of every nucleus, and the inclusion is
// eosin rose, how it stains in the sections it is known from, its core the aggregate part.)
{
  const g = page(4.1, [-0.3, -3.7])
  const soma = neuronSoma(g, { x: 0, y: 0, size: 84, aspect: 0.86, id: 'neuron', pal: EPI, stubs: [[198, 13, 9], [-18, 12, 8.5], [138, 12, 8], [48, 11, 7.5], [-100, 9, 7]] })
  const nuc = nucleus(g, { x: -21, y: -14, size: 24, id: 'nucleus', nucleolus: true })
  const lb = lewyBody(g, { x: 9, y: 6, size: 42 })
  const all = join(soma, nuc, lb)
  cellType('Lewy body', all.parts, all.defs, all.body)
}

// SASP (senescence-associated secretory phenotype): the approved Senescent cell giving off two kinds of factors to its
// right, cytokines and chemokines (cerulean) and proteases (green), each a fan of the release part.
// (SiliCoDraw: a pink cell with a dark nucleus, dashed lines and orange and green dots. Here the cell is the approved one,
// peach with its blue β-galactosidase granules; the factors are cerulean, 45° from those granules so that they recolour
// apart, and green; the dashed lines are left out, the fans of dots say "released".)
{
  const g = page(4.66, [0, 0])
  const sc = placeCellType(g, 'Senescent cell', { x: -15, y: 0, size: 70, id: 'senescent-cell' })
  const fan = (S, deg, size, pal, id) => { const t = (deg * Math.PI) / 180; return release(g, { x: S[0] + (size / 2) * Math.cos(t), y: S[1] + (size / 2) * Math.sin(t), size, turn: deg, spread: 54, rows: 3, pal, id }) }
  const a = fan([21, -7], -30, 29, deep(CERULEAN), 'cytokines'), b = fan([21, 9], 30, 27, deep(GREEN), 'proteases')
  const all = join(sc, a, b)
  cellType('SASP', all.parts, all.defs, all.body)
}

// Hormone: a gland cell (green) holding its hormone in granules (blue dots: the secreted signals of the set) releases it
// towards a blood vessel, where the blood carries it away (red blood cells and the hormone in the lumen, an arrow for the
// flow).
// (SiliCoDraw: a lilac gland with grey granules, a dashed line, purple dots in a red-edged vessel and a red arrow. The
// lilac is the nucleus's here and the purple dots 14° from it, so the gland is green and the hormone the blue of every
// secreted signal; the vessel is the vessel part, rose.)
{
  const g = page(4.5, [0, 1.9]), gland = soft(GLAND), hormone = soft(SIGNAL)
  const c = cell(g, { x: -19, y: -21, size: 58, id: 'gland-cell', pal: gland, vesicles: false, turn: 8 })
  const granules = growthFactor(g, { x: -9, y: -13, size: 20, count: 5, dot: 5, id: 'granules', pal: hormone })
  const t = (52 * Math.PI) / 180, S = [8, -9], L = 21
  const out = release(g, { x: S[0] + (L / 2) * Math.cos(t), y: S[1] + (L / 2) * Math.sin(t), size: L, turn: 52, spread: 50, rows: 3, pal: hormone, id: 'secretion' })
  const v = vessel(g, { x: 0, y: 28, size: 100, thick: 0.27, ends: 'open', cells: 2, id: 'blood-vessel' })
  const carried = [[-37, 28], [-5, 30], [25, 27], [41, 30]].map(([x, y], i) => growthFactor(g, { x, y, size: 5.5, id: `hormone-${i + 1}`, pal: hormone }))
  const flow = arrow(g, { x: -36, y: 48, size: 20, w: 9, colour: VESSEL.outline, id: 'blood-flow' })
  const all = join(c, granules, out, v, ...carried, flow)
  cellType('Hormone', [...c.parts, ['hormone', hormone], ...v.parts], all.defs, all.body)
}

// Operon: one promoter (grey, "P") and one operator (orange, "O") in front of three genes read as one (green arrows: the
// lac operon's lacZ, lacY and lacA), on the DNA; the repressor (pink) sits on the operator.
// (SiliCoDraw letters every block (P, O, Z, Y, A) and writes "repressor". Here the promoter and operator keep their
// letters, drawn with the letters part, and the genes, arrows in the direction they are read, carry Z, Y and A; the
// repressor is the protein part, pink, and needs no word. The DNA is the DNA part.)
{
  const g = page(4.42, [0, -4.5]), y = 10, H = 27
  const d = dna(g, { x: 0, y, size: 104, width: 15, turns: 5, id: 'DNA' })
  const prom = geneBlock(g, { x: -41.5, y, size: 15, height: H, pal: GREY, w: 7, pointed: false, letter: 'P', letterScale: 0.72, id: 'promoter' })
  const op = geneBlock(g, { x: -24.5, y, size: 14, height: H, pal: soft(ORANGE), w: 7, pointed: false, letter: 'O', letterScale: 0.72, id: 'operator' })
  const genePal = soft(GREEN), genes = [[-14.5, 6], [9, 29.5], [32.5, 52]].map(([a, b], i) => geneBlock(g, { x: (a + b) / 2, y, size: b - a, height: H + 3, pal: genePal, w: 7, letter: 'ZYA'[i], letterScale: 0.72, id: `gene-${i + 1}` }))
  const rep = protein(g, { x: -24.5, y: -18.5, size: 32, turn: 8, id: 'repressor', pal: rich(PINK) })
  const all = join(d, prom, op, ...genes, rep)
  cellType('Operon', [...d.parts, ['promoter', GREY], ['operator', soft(ORANGE)], ['genes', genePal], ['repressor', rich(PINK)]], all.defs, all.body)
}

// Aptamer: a single strand of nucleic acid folded on itself, a paired stem below and a loop above that wraps round its
// target (a protein) and holds it.
// (SiliCoDraw draws a green strand shaped as a heart round an orange blob. Here the strand is drawn as the RNA of the set
// (rose, its bases in the paler tone: rungs across the stem, ticks pointing at the target from the loop), the target is
// the protein part.)
{
  const g = page(4.62, [0, 2.8]), pal = deep(RNA), T = 21
  const course = catmull([[-12, 47], [-12, 22], [-13, 10], [-23, 2], [-33, -11], [-33, -30], [-20, -41], [-7, -39], [0, -33], [7, -39], [20, -41], [33, -30], [33, -11], [23, 2], [13, 10], [12, 22], [12, 42]], 16)
  const pts = course.map(g.P), tgt = [0, -15]
  const rungs = [16, 24, 32, 40].map((v) => stroke(ptsD([g.P([-12, v]), g.P([12, v])]), pal.base, T * 0.6, 'butt'))
  // Bases of the loop: ticks every so often along the loop, turned towards the target.
  const loop = course.filter(([, v]) => v < 4), Ltot = lengthOf(loop)
  const ticks = Array.from({ length: 9 }, (_, i) => {
    const { p } = pointAt(loop, Ltot * (0.04 + (0.92 * i) / 8)), dx = tgt[0] - p[0], dy = tgt[1] - p[1], l = Math.hypot(dx, dy)
    return stroke(ptsD([g.P(p), g.P([p[0] + (dx / l) * 5.5, p[1] + (dy / l) * 5.5])]), pal.base, T * 0.6, 'butt')
  })
  const target = protein(g, { x: tgt[0], y: tgt[1], size: 37, turn: -10, id: 'target' })
  cellType('Aptamer', [['aptamer', pal], ...target.parts], target.defs,
    `<g id="aptamer"><g id="aptamer-bases">${rungs.join('')}${ticks.join('')}</g>${stroke(ptsD(pts), pal.small, T)}</g>\n` + target.body)
}

/**
 * The chaperonin GroEL–GroES seen from the side with the front cut away: the near ring of GroEL open as a cup (its wall
 * a column of subunits on either side, the far wall behind), the far ring whole below, and the GroES lid closing the cup.
 * `size` is its height; x, y its middle. What it folds is the caller's (placed in `cavity`).
 */
const chaperonin = (g, { x, y, size, id = 'chaperonin', pal = soft(GREEN) }) => {
  const s = size / 100, P = ([u, v]) => g.P([x + u * s, y + v * s]), px = s * g.k, W = f(Math.max(3.5, Math.min(7.5, 2 + px * 1.1)))
  const lid = { light: pal.base, base: pal.shadow, shadow: pal.small, outline: pal.outline }
  const bead = ([u, v], rx, ry) => { const [cx, cy] = P([u, v]); return `M${f(cx - rx * px)},${f(cy)} A${f(rx * px)},${f(ry * px)} 0 1 0 ${f(cx + rx * px)},${f(cy)} A${f(rx * px)},${f(ry * px)} 0 1 0 ${f(cx - rx * px)},${f(cy)} Z` }
  const row = (beads, fill) => beads.map((d) => `<path d="${d}" fill="${pal.outline}" stroke="${pal.outline}" stroke-width="${f(2 * W)}"/>`).join('') + beads.map((d) => `<path d="${d}" fill="${fill}"/>`).join('')
  // The far wall of the open ring: a band behind the cavity, deeper in tone.
  const [b0x, b0y] = P([-34, -36]), [b1x, b1y] = P([34, 4])
  const back = `<path d="${roundPoly([[b0x, b0y], [b1x, b0y], [b1x, b1y], [b0x, b1y]], 8 * px)}" fill="url(#${id}-back-gradient)" stroke="${pal.outline}" stroke-width="${W}" stroke-linejoin="round"/>`
  const walls = [-1, 1].map((sg) => row([-24, -7].map((v) => bead([sg * 33, v], 9, 9)), `url(#${id}-near-gradient)`)).join('')
  const far = [11, 27].map((v) => row([-33, -11, 11, 33].map((u) => bead([u, v], 11.5, 8.5)), `url(#${id}-far-gradient)`)).join('')
  const LID = [[-45, -36], [-43, -45], [-28, -51], [0, -53], [28, -51], [43, -45], [45, -36], [22, -34], [-22, -34]]
  const lidD = smoothPts(LID.map(P))
  const [l0x, l0y] = P([-45, -55]), [l1x, l1y] = P([45, -33]), [hx, hy] = P([-24, -46])
  return {
    defs: boxGrad(`${id}-near-gradient`, pal) + boxGrad(`${id}-far-gradient`, { base: pal.shadow, shadow: pal.small }) +
      gradient2(`${id}-back-gradient`, [b0x, b0y, b1x, b1y], pal.small, pal.shadow) + gradient2(`${id}-lid-gradient`, [l0x, l0y, l1x, l1y], lid.base, lid.shadow),
    back: `<g id="${id}-cavity">${back}</g>`,
    body: `<g id="${id}"><g id="${id}-far-ring">${far}</g><g id="${id}-near-ring">${walls}</g>` +
      `<g id="${id}-lid"><path d="${lidD}" fill="url(#${id}-lid-gradient)" stroke="${pal.outline}" stroke-width="${W}" stroke-linejoin="round"/>${px >= 2.5 ? shine([hx, hy], 6 * px, 1.8 * px, -14, lid.light) : ''}</g></g>`,
    parts: [['chaperonin', pal]],
    cavity: [x, y - 16 * s],
  }
}
/** A smooth closed outline through page points (as cellkit's smoothD). */
const smoothPts = (p) => {
  const n = p.length
  let d = `M${P2(p[0])}`
  for (let i = 0; i < n; i++) {
    const a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n], e = p[(i + 2) % n]
    d += `C${f(b[0] + (c[0] - a[0]) / 6)},${f(b[1] + (c[1] - a[1]) / 6)} ${f(c[0] - (e[0] - b[0]) / 6)},${f(c[1] - (e[1] - b[1]) / 6)} ${P2(c)}`
  }
  return d + 'Z'
}

// Chaperone: an unfolded protein chain (left) is taken into a chaperonin (GroEL with its GroES lid, green, cut open) and
// comes out folded: the folded protein sits in its cavity.
// (SiliCoDraw draws a grey wavy line, an arrow and a green box with stripes holding a white protein, lettered "HSP". Here
// the chaperone is drawn as the chaperonin barrel (no part draws it), the chain and the protein are the amber of every
// protein, the arrow is grey; "HSP" is left out.)
{
  const g = page(4.12, [1.6, -5.3]), chainPal = rich(AMBER)
  const ch = chaperonin(g, { x: 25, y: 0, size: 66 })
  const folded = protein(g, { x: ch.cavity[0], y: ch.cavity[1] + 0.5, size: 19, turn: 20, id: 'folded-protein' })
  const wave = catmull([[-50, 1], [-46, -8], [-40.5, 2], [-35, -8], [-29.5, 1], [-25, -6]], 14).map(g.P)
  const tube = `<g id="unfolded-protein">${stroke(ptsD(wave), chainPal.outline, 4.2 * g.k + 12)}${stroke(ptsD(wave), chainPal.small, 4.2 * g.k)}</g>`
  const a = arrow(g, { x: -12.5, y: -3, size: 15, w: 10, colour: GREY.outline, id: 'arrow' })
  cellType('Chaperone', [['protein', chainPal], ...ch.parts], ch.defs + folded.defs,
    tube + '\n' + a.body + '\n' + ch.back + '\n' + folded.body + '\n' + ch.body)
}

/** A peak of sequencing reads along the genome: a smooth hill over a base line (where the reads pile up), filled. */
const peak = (g, { x0, x1, base, top, at = 0, sigma = 8, bumps = [], id = 'peak', pal, w = 6 }) => {
  const hgt = (x) => (base - top) * Math.exp(-(((x - at) / sigma) ** 2) / 2) + bumps.reduce((s, [bx, bh, bs]) => s + bh * Math.exp(-(((x - bx) / bs) ** 2) / 2), 0)
  const xs = Array.from({ length: 97 }, (_, i) => x0 + ((x1 - x0) * i) / 96)
  const pts = [[x0, base], ...xs.map((x) => [x, base - hgt(x) - 1.2]), [x1, base]].map(g.P)
  const [ax, ay] = g.P([x0, top]), [bx, by] = g.P([x1, base])
  return {
    defs: gradient2(`${id}-gradient`, [ax, ay, ax, by], pal.shadow, pal.base),
    body: `<g id="${id}"><path d="${roundPoly(pts, 3)}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="${f(w)}" stroke-linejoin="round"/></g>`,
  }
}

// ChIP-seq: chromatin (two nucleosomes on a thread of DNA) with a transcription factor bound in the open stretch between
// them; an antibody holds the factor by its arms and a bead holds the antibody by its stem (the immunoprecipitation); under
// it, the peak the sequenced DNA makes where the factor sits.
// (SiliCoDraw: a blue DNA line with ticks, an orange protein, a small green antibody standing on it with a grey bead on its
// arms, grey and orange reads and an orange curve. Here the DNA wraps nucleosomes (the fibre part of ../parts/genetics.mjs, lilac
// cores, a bare stretch where a nucleosome is missing), the factor is green, the antibody is upside down, its arms on the
// factor and its stem in the bead (protein A/G beads bind the stem), in the antibody part's amber; the reads are the peak, in the factor's green.)
{
  const g = page(4.33, [0, -2.7]), tfPal = soft(GREEN), abPal = rich(AMBER), fy = 7
  const chrom = fibre(g, { from: [-51, fy - 9.5], to: [51, fy + 10], count: 3, missing: [1], R: 16.5, id: 'chromatin' })
  const tf = protein(g, { x: 0, y: fy - 9, size: 21, turn: -8, id: 'transcription-factor', pal: tfPal })
  const ab = antibody(g, { x: 0, y: -27.5, size: 30, turn: 180, id: 'antibody', pal: abPal })
  const bd = bead(g, { x: 0, y: -44.5, size: 13 })
  const pk = peak(g, { x0: -47, x1: 47, base: 45, top: 25, sigma: 7.5, bumps: [[-30, 2.2, 5], [27, 1.8, 6]], pal: tfPal, id: 'reads' })
  const all = join(chrom, pk, ab, bd, tf)
  cellType('ChIP-seq', [...chrom.parts, ['transcription factor', tfPal], ['antibody', abPal], ['bead', GREY]], all.defs,
    [chrom.body, pk.body, ab.body, bd.body, tf.body].join('\n'))
}

/** A sequenced fragment: a short piece of DNA (the DNA part) with an adapter (a flat bar) on each end. */
const fragment = (g, { x0, x1, y, id, adapter }) => {
  const d = dna(g, { x: (x0 + x1) / 2, y, size: x1 - x0, width: 8, turns: 2, id: `${id}-DNA` })
  const cap = (x) => `<rect x="${f(g.X(x - 3))}" y="${f(g.Y(y - 4.4))}" width="${f(6 * g.k)}" height="${f(8.8 * g.k)}" rx="${f(2.6 * g.k)}" fill="${adapter.small}"/>`
  return { defs: d.defs, body: `<g id="${id}">${d.body}<g id="${id}-adapters">${cap(x0)}${cap(x1)}</g></g>`, parts: d.parts }
}

// ATAC-seq: chromatin with an open stretch between two nucleosomes; the Tn5 transposase (two green subunits) cuts the open
// DNA and tags the pieces with adapters; below, the fragments that are sequenced, each with an adapter at both ends.
// (SiliCoDraw: a blue wave with four small nucleosomes, two green balls lettered "Tn5" above the open stretch, three green
// reads over a grey line, lettered "open chromatin". Here the nucleosomes are the fibre part's on one DNA thread, Tn5 is the protein
// part twice, green, and the reads are pieces of the DNA part with green adapters. The words are left out.)
{
  const g = page(4.33, [0, 13.7]), tn5 = soft(GREEN), adapter = deep(GREEN), fy = -2
  const chrom = fibre(g, { from: [-51, fy - 9.5], to: [51, fy + 10], count: 3, missing: [1], R: 16.5, id: 'chromatin' })
  const t1 = protein(g, { x: -7.5, y: fy - 12.5, size: 20, turn: -20, id: 'Tn5-1', pal: tn5 }), t2 = protein(g, { x: 7.5, y: fy - 13.5, size: 20, turn: 30, id: 'Tn5-2', pal: tn5 })
  const frs = [[-30, -2, 27], [-6, 22, 37.5], [-19, 9, 48]].map(([x0, x1, y], i) => fragment(g, { x0, x1, y, id: `fragment-${i + 1}`, adapter }))
  const all = join(chrom, t1, t2, ...frs)
  cellType('ATAC-seq', [...chrom.parts, ['Tn5 and adapters', tn5]], all.defs, all.body)
}

check()
console.log('written to', OUT)
