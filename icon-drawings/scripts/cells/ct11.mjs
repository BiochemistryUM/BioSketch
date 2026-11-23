// Eight icons of SiliCoDraw's "Cells & tissues" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md with the kit in ../cellkit.mjs:
// markers of dividing cells (EdU and BrdU, Ki-67), of ageing cells (lipofuscin, SA-β-gal staining, p16 and cell-cycle
// arrest), the care of mitochondria (mitophagy, the mitochondrial unfolded protein response) and a colony of induced
// pluripotent stem cells. Their shapes are read by hand from the source in a 100 × 100 box centred on 0,0 and scaled onto
// a 512 page; SiliCoDraw's detailed schematics are simplified so that each reads at 40 px. Nothing is lettered: where
// SiliCoDraw writes a label, it is left out or a shape says the same (see each icon). Stains keep the colour they are
// known by (EdU green, Ki-67 brown, X-gal blue). Usage: node ct11.mjs <folder>
import { BLUE, NUC, PEACH, cellTypes, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex } from '../colour.mjs'
import { f, pathOf } from '../shapes.mjs'
import { lettering } from '../parts/letters.mjs'

const OUT = process.argv[2]
const { cellType, check } = cellTypes(OUT)

// The hues of the set (OKLCH degrees). The nucleus lilac is about 319°.
const MITO = hueOf('#F2A08C') // BioSketch's own mitochondrion (34°)
const PROTEIN = 75, LYSOSOME = 355
const STEM = hueOf('#fde68a') // the yellow of the approved stem cell and of the iPS cell in Reprogramming (96°)

/** One gradient that lights every shape that uses it from its own top left (several nuclei, several cells). */
const boxGrad = (id, pal) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`
/** A rounded rectangle given in their units. */
const rect = (g, x, y, w, h, rx, fill, s = '', sw = 0) =>
  `<rect x="${f(g.X(x))}" y="${f(g.Y(y))}" width="${f(w * g.k)}" height="${f(h * g.k)}" rx="${f(rx * g.k)}" fill="${fill}"${s ? ` stroke="${s}" stroke-width="${sw}" stroke-linejoin="round"` : ''}/>`
/** An open curve given in their units (M, L and C only), drawn as a line with round ends; width in pixels. */
const curve = (g, d, colour, w) => `<path d="${g.D(d)}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"/>`
/** A path given in their units about 0,0 (absolute M, L, C, Z), turned by `rot` degrees, scaled by s and moved to x, y. */
const placed = (d, x, y, rot = 0, s = 1) => {
  const r = (rot * Math.PI) / 180, c = Math.cos(r), n = Math.sin(r)
  return d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, u, v) => `${f(x + s * (u * c - v * n))},${f(y + s * (u * n + v * c))}`)
}
/** A triangle arrowhead with its tip at `to`, pointing away from `from` (their units); length and width in units. */
const head = (g, from, to, len, wide, fill) => {
  const [x0, y0] = from, [x1, y1] = to, d = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / d, uy = (y1 - y0) / d
  const bx = x1 - ux * len, by = y1 - uy * len
  const pts = [[x1, y1], [bx - (uy * wide) / 2, by + (ux * wide) / 2], [bx + (uy * wide) / 2, by - (ux * wide) / 2]].map(g.P)
  return `<path d="M${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' L')}Z" fill="${fill}" stroke="${fill}" stroke-width="3" stroke-linejoin="round"/>`
}
/** A point of a cubic Bézier curve. */
const bez = ([p0, p1, p2, p3], t) => [0, 1].map((i) => (1 - t) ** 3 * p0[i] + 3 * (1 - t) ** 2 * t * p1[i] + 3 * (1 - t) * t * t * p2[i] + t ** 3 * p3[i])
/** A curved arrow along a cubic Bézier curve (their units): the line stops under its head, the head points along the end. */
const bentArrow = (g, curvePts, colour, w, len = 7, wide = 8) => {
  const pts = Array.from({ length: 41 }, (_, i) => bez(curvePts, i / 40)), tip = pts.at(-1)
  const keep = pts.filter((p) => Math.hypot(p[0] - tip[0], p[1] - tip[1]) > len * 0.6)
  const back = pts.findLast((p) => Math.hypot(p[0] - tip[0], p[1] - tip[1]) >= len)
  return g.line(keep, colour, w) + head(g, back, tip, len, wide, colour)
}
/** Points round a superellipse of half axes a, b (their units): n = 2 an ellipse, larger n squarer, like a capsule. */
const superellipse = (a, b, n, steps = 96) => Array.from({ length: steps }, (_, i) => {
  const t = (i / steps) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t)
  return [a * Math.sign(c) * Math.abs(c) ** (2 / n), b * Math.sign(s) * Math.abs(s) ** (2 / n)]
})
/**
 * A mitochondrion as BioSketch draws one (../../Mitochondrion.svg): the outer membrane lit by a gradient, a paler matrix
 * inside the inner membrane, and cristae folded in from the inner membrane, alternately from above and below.
 * x, y: centre; a, b: half length and half height; rot: turn in degrees; gap: the space between the membranes (all in
 * their units); cristae: [along, side (-1 above, 1 below), share of the matrix height]. The gradient is `<id>-gradient`.
 */
const mitochondrion = (g, id, pal, { x, y, a, b, rot = 0, gap, cristae, w = 10, iw = 5, cw = 7, n = 2.6 }) => {
  const r = (rot * Math.PI) / 180, R = ([u, v]) => [x + u * Math.cos(r) - v * Math.sin(r), y + u * Math.sin(r) + v * Math.cos(r)]
  const ia = a - gap, ib = b - gap, half = (u) => ib * Math.max(0, 1 - Math.abs(u / ia) ** n) ** (1 / n)
  const outer = superellipse(a, b, n).map(R).map(g.P), inner = superellipse(ia, ib, n).map(R).map(g.P)
  const h = hueOf(pal.base), matrix = toHex({ l: 0.975, c: 0.016, h }), membrane = toHex({ l: 0.72, c: 0.09, h })
  const folds = cristae.map(([u, side, share]) => [R([u, side * (half(u) + gap * 0.45)]), R([u, side * half(u)]), R([u, side * (half(u) - share * 2 * half(u))])])
  return `<g id="${id}"><path d="${pathOf(outer)}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="${w}" stroke-linejoin="round"/>` +
    `<path d="${pathOf(inner)}" fill="${matrix}" stroke="${membrane}" stroke-width="${iw}" stroke-linejoin="round"/>` +
    folds.map(([, edge, tip]) => g.line([edge, tip], membrane, cw + 2 * iw)).join('') +
    folds.map(([out, , tip]) => g.line([out, tip], pal.shadow, cw)).join('') +
    g.hl(...R([-a * 0.5, -b + gap * 0.5]), f(a * g.k * 0.2), f(gap * g.k * 0.22), rot - 6, pal.light) + '</g>'
}
/** A grey for what has no colour of its own (a slide, a field of view); below the chroma "Shades follow" groups by. */
const grey = (h) => ({ light: toHex({ l: 0.99, c: 0.003, h }), base: toHex({ l: 0.965, c: 0.006, h }), shadow: toHex({ l: 0.925, c: 0.008, h }), outline: toHex({ l: 0.66, c: 0.01, h }) })

// EdU and BrdU: four cells, two of which went through S phase while the nucleotide analogue was there, so that their nuclei
// carry it and light up green (as EdU is shown after click chemistry with a green dye); the others keep the lilac nucleus.
// (SiliCoDraw's red nuclei with a red glow are green here, and the cells pale blue; its "EdU" tag and "S-phase" are left out.)
{
  const g = page(5.45, [-1, 1.5]), cyto = soft(BLUE), stain = deep(145)
  const cells = [[-26, -8, 0], [6, -18, 1], [24, 12, 0], [-10, 21, 1]]
  cellType('EdU and BrdU', [['cytoplasm', cyto], ['nucleus', NUC], ['labelled nucleus', stain]],
    boxGrad('cell-gradient', cyto) + boxGrad('nucleus-gradient', NUC) + boxGrad('label-gradient', stain),
    `<g id="cells">${cells.map(([x, y]) => g.circle(x, y, 16, 'url(#cell-gradient)', cyto.outline, 12) + g.hl(x - 7, y - 9.5, 14, 5.5, -40, cyto.light)).join('')}</g>\n` +
      `<g id="nuclei">${cells.filter((c) => !c[2]).map(([x, y]) => g.circle(x + 1, y + 1, 8, 'url(#nucleus-gradient)', NUC.outline, 9) + g.hl(x - 2.4, y - 2.4, 7, 2.8, -45, NUC.light)).join('')}</g>\n` +
      `<g id="labelled-nuclei">${cells.filter((c) => c[2]).map(([x, y]) => g.circle(x + 1, y + 1, 8, 'url(#label-gradient)', stain.outline, 9) + g.hl(x - 2.4, y - 2.4, 7, 2.8, -45, stain.light)).join('')}</g>`)
}
// Ki-67: a stained section on a slide. Nuclei of dividing cells carry Ki-67 and are brown (DAB); the others are only
// counterstained (the lilac of every nucleus of the set, where SiliCoDraw has a pale blue). The section is rose, not
// SiliCoDraw's peach, which lies too near the brown; the slide is grey. "Ki-67 index" under the slide is left out.
{
  const g = page(4.93, [0, 0]), slide = grey(250), tissue = soft(12), brown = deep(hueOf('#8b5a2b'))
  const dab = { light: brown.base, base: brown.small, shadow: brown.outline, outline: toHex({ l: 0.42, c: 0.09, h: hueOf('#8b5a2b') }) }
  const nuclei = [[-30, -11, 1], [-14, -12, 0], [1, -12, 1], [17, -10, 0], [31, -12, 1], [-31, 10, 0], [-16, 12, 1], [-1, 9, 0], [15, 13, 0], [30, 10, 1]]
  cellType('Ki-67', [['section', tissue], ['nucleus', NUC], ['Ki-67', dab]],
    g.grad('slide-gradient', [-46, -30, 46, 30], slide) + g.grad('tissue-gradient', [-40, -23, 40, 23], tissue) + boxGrad('nucleus-gradient', NUC) + boxGrad('dab-gradient', dab),
    `<g id="slide">${rect(g, -46, -30, 92, 60, 4, 'url(#slide-gradient)', slide.outline, 8)}</g>\n` +
      `<g id="section">${g.path(g.smooth([[-40, -22], [-14, -24], [14, -22], [40, -23], [41, 0], [40, 23], [12, 24], [-16, 22], [-40, 23], [-41, 0]]), 'url(#tissue-gradient)', tissue.outline, 7)}${g.hl(-31, -17.5, 16, 4.5, -8, tissue.light)}</g>\n` +
      `<g id="nuclei">${nuclei.filter((n) => !n[2]).map(([x, y]) => g.circle(x, y, 5.6, 'url(#nucleus-gradient)', NUC.outline, 6)).join('')}</g>\n` +
      `<g id="Ki-67">${nuclei.filter((n) => n[2]).map(([x, y]) => g.circle(x, y, 5.6, 'url(#dab-gradient)', dab.outline, 6) + g.hl(x - 2, y - 2.2, 5, 2, -45, dab.light)).join('')}</g>`)
}
// Mitophagy: a damaged mitochondrion, tagged with chains of ubiquitin (amber beads, as every protein of the set), being
// wrapped by the cup of a phagophore (a double membrane: two lines with a pale band between them); a lysosome comes to its
// opening. The mitochondrion is drawn as BioSketch's own; the lysosome is rose, as the approved Lysosome.
{
  const g = page(4.86, [1.4, 2]), phag = soft(hueOf('#dfe6f5')), mito = soft(MITO), ub = deep(PROTEIN), lyso = soft(LYSOSOME)
  const cx = -4, cy = 2, R = 37, at = (deg, r = R) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)]
  const cup = Array.from({ length: 61 }, (_, i) => at(-46 - (i / 60) * 284)) // the long way round, open to the right
  const [m, mr] = [{ x: -8, y: 4, a: 23, b: 13.5, rot: -18 }, (-18 * Math.PI) / 180]
  // A chain of three beads standing out from the outer membrane at `deg` round the mitochondrion (its own frame).
  const chain = (deg, step = 5.2) => {
    const t = (deg * Math.PI) / 180, u = m.a * Math.cos(t), v = m.b * Math.sin(t), nu = Math.cos(t) / m.a, nv = Math.sin(t) / m.b, l = Math.hypot(nu, nv)
    return [0, 1, 2].map((i) => { const d = 4.2 + i * step, pu = u + (nu / l) * d, pv = v + (nv / l) * d; return g.circle(m.x + pu * Math.cos(mr) - pv * Math.sin(mr), m.y + pu * Math.sin(mr) + pv * Math.cos(mr), 2.7, ub.small) }).join('')
  }
  cellType('Mitophagy', [['phagophore', phag], ['mitochondrion', mito], ['ubiquitin', ub], ['lysosome', lyso]],
    g.grad('lumen-gradient', [-41, -35, 33, 39], phag) + g.grad('mitochondrion-gradient', [-31, -12, 15, 20], mito) + g.grad('lysosome-gradient', [27, -34, 47, -14], lyso),
    `<g id="phagophore">${g.path(`M${cup.map(g.P).map(([x, y]) => `${f(x)},${f(y)}`).join(' L')} Q${f(g.X(cx + R * 0.45))},${f(g.Y(cy - 5))} ${f(g.X(cup[0][0]))},${f(g.Y(cup[0][1]))}Z`, 'url(#lumen-gradient)')}` +
      `${g.line(cup, phag.outline, 40)}${g.line(cup, phag.light, 20)}</g>\n` +
      mitochondrion(g, 'mitochondrion', mito, { ...m, gap: 4.4, w: 9, iw: 4.5, cw: 6, cristae: [[-14, -1, 0.62], [-7, 1, 0.62], [0, -1, 0.62], [7, 1, 0.62], [14, -1, 0.55]] }) + '\n' +
      `<g id="ubiquitin">${[-128, -84, -38, 96].map((d) => chain(d)).join('')}</g>\n` +
      `<g id="lysosome">${g.circle(37, -24, 10, 'url(#lysosome-gradient)', lyso.outline, 9)}${[[34, -26, 2.1], [40, -27.5, 1.7], [38, -20, 1.9]].map(([x, y, r]) => g.circle(x, y, r, lyso.outline)).join('')}${g.hl(33, -29.5, 7, 2.6, -40, lyso.light)}</g>`)
}
// Lipofuscin: a cell that no longer divides, its cytoplasm crowded with residual bodies: lysosomes (rose, as the approved
// Lysosome) filled with clumps of the yellow-brown age pigment. (SiliCoDraw's grey cell is the pale blue of a cell; its
// lysosomes are the pigment's own colour, here they have a rose membrane round the pigment; seven are six, a little larger.)
{
  const g = page(4.77, [0.5, 0]), cyto = soft(hueOf('#eef0f4')), lyso = soft(LYSOSOME), ochre = deep(hueOf('#c08a2e'))
  const pigment = { light: ochre.light, base: ochre.shadow, shadow: ochre.small, outline: ochre.outline }
  const bodies = [[13, -15, 9.5, 0.4], [31, 2, 8.5, 2.1], [11, 16, 9, 4.2], [-6, -22, 7, 1.3], [27, 19.5, 6, 3.1], [-31, 21, 5.6, 5.3]]
  // A clump of pigment: a lumpy blob inside the lysosome, turned a little differently in each.
  const clump = (x, y, r, turn) => g.smooth(Array.from({ length: 7 }, (_, i) => { const t = (i / 7) * Math.PI * 2 + turn, q = r * (i % 2 ? 0.5 : 0.7); return [x + 0.4 + q * Math.cos(t), y + 0.4 + q * Math.sin(t)] }))
  cellType('Lipofuscin', [['cytoplasm', cyto], ['nucleus', NUC], ['lysosome', lyso], ['pigment', pigment]],
    g.grad('cell-gradient', [-46, -34, 47, 34], cyto) + g.grad('nucleus-gradient', [-33, -9, -3, 17], NUC) + boxGrad('lysosome-gradient', lyso) + boxGrad('pigment-gradient', pigment),
    `<g id="cytoplasm">${g.path(g.smooth([[-46, 0], [-38, -22], [-14, -34], [14, -33], [38, -22], [47, -2], [40, 20], [16, 33], [-14, 34], [-38, 22]]), 'url(#cell-gradient)', cyto.outline, 12)}${g.hl(-25, -21.5, 26, 9, -25, cyto.light)}</g>\n` +
      `<g id="nucleus">${g.ellipse(-18, 4, 14.5, 12.5, 0, 'url(#nucleus-gradient)', NUC.outline, 10)}${g.circle(-14.5, 2.5, 3.6, NUC.small)}${g.hl(-24, -2.5, 13, 5, -40, NUC.light)}</g>\n` +
      `<g id="lysosomes">${bodies.map(([x, y, r]) => g.circle(x, y, r, 'url(#lysosome-gradient)', lyso.outline, 6)).join('')}</g>\n` +
      `<g id="pigment">${bodies.map(([x, y, r, t]) => g.path(clump(x, y, r, t), 'url(#pigment-gradient)', pigment.outline, 4) + g.circle(x - r * 0.15, y - r * 0.1, r * 0.15, pigment.outline)).join('')}</g>`)
}
// SA-β-gal staining: a field of view under the microscope with one large, flat senescent cell stained blue by X-gal round
// its nucleus, among small spindle-shaped cells that stay unstained. (SiliCoDraw's beige field is a pale grey, its beige
// cells the peach of the approved fibroblast, with a lilac nucleus like every nucleus of the set; the spindles sit a little
// further in, inside the field.)
{
  const g = page(5.06, [0, 0]), field = grey(85), fibro = soft(PEACH), xgal = deep(hueOf('#2f7fb8'))
  const spindle = 'M-16,0C-8,-6.5 8,-6.5 16,0C8,6.5 -8,6.5 -16,0Z'
  const small = [[-20, -23, -30], [21, -24, 25], [-24, 21, 40], [21, 24, -35], [32.5, 1, 88]]
  const body = [[-30, -6], [-22, -16], [-6, -18], [8, -14], [22, -12], [24, 2], [18, 14], [2, 18], [-14, 16], [-26, 10]]
  // Blue granules in a ring round the nucleus, spread evenly with a fixed wobble (no random numbers, so the icon is the same every time).
  const granules = Array.from({ length: 16 }, (_, i) => { const t = (i / 16) * Math.PI * 2 + 0.25 * Math.sin(i * 2.3), d = 12.5 + 3.5 * Math.sin(i * 1.7 + 1); return [-3 + d * 1.12 * Math.cos(t), d * 0.72 * Math.sin(t), 1.7 + 0.55 * ((i * 5) % 3)] })
  cellType('SA-beta-gal staining', [['cells', fibro], ['nucleus', NUC], ['stained cell', xgal]],
    g.grad('field-gradient', [-41, -41, 41, 41], field) + boxGrad('cell-gradient', fibro) + g.grad('stained-gradient', [-30, -18, 24, 18], xgal) + g.grad('nucleus-gradient', [-11.5, -7, 5.5, 7], NUC),
    `<g id="field">${g.circle(0, 0, 44, field.base, field.outline, 12)}${g.circle(0, 0, 39.5, 'url(#field-gradient)', field.outline, 4)}</g>\n` +
      `<g id="cells">${small.map(([x, y, r]) => g.path(g.D(placed(spindle, x, y, r, 0.9)), 'url(#cell-gradient)', fibro.outline, 7)).join('')}</g>\n` +
      `<g id="nuclei">${small.map(([x, y, r]) => g.ellipse(x, y, 4.3, 2.7, r, NUC.small)).join('')}</g>\n` +
      `<g id="stained-cell">${g.path(g.smooth(body), 'url(#stained-gradient)', xgal.outline, 10)}${g.hl(-19, -10.5, 14, 4.5, -25, xgal.light)}` +
      `${granules.map(([x, y, r]) => g.circle(x, y, r, xgal.outline)).join('')}</g>\n` +
      `<g id="nucleus">${g.ellipse(-3, 0, 8.5, 7, 0, 'url(#nucleus-gradient)', NUC.outline, 7)}${g.circle(-1, -0.5, 2.2, NUC.small)}${g.hl(-6.5, -3.3, 7, 2.8, -40, NUC.light)}</g>`)
}
// p16 and cell-cycle arrest: the cell cycle of the approved Cell cycle (four arrows clockwise: G1 blue, S green, G2 yellow,
// M pink, each as long as its phase), turned so that the step from G1 to S is at the bottom, where p16 (red, in the
// middle) blocks it with the bar of an inhibition. (SiliCoDraw's grey ring with letters and the word "p16" are left out;
// the M arrow is a little more magenta than in Cell cycle, so that it recolours apart from the red of p16.)
{
  const g = page(4.97, [-1.6, -0.3]), R = 43, r = 27, flare = 5, gap = 7, headBy = 18, turn = 40
  const phases = [['G1', soft(hueOf('#bfdbfe')), 0, 140, 22], ['S', soft(hueOf('#bbf7d0')), 140, 236, 160], ['G2', rich(hueOf('#fde68a')), 236, 306, 262], ['M', soft(348), 306, 360, 322]]
  const p16 = deep(hueOf('#d64545'))
  // A point at `deg` clockwise from the top, `rad` from the middle.
  const at = (deg, rad) => { const a = ((deg + turn) * Math.PI) / 180; return g.P([rad * Math.sin(a), -rad * Math.cos(a)]) }
  const arc = (a0, a1, rad) => { const n = Math.ceil(Math.abs(a1 - a0) / 3); return Array.from({ length: n + 1 }, (_, i) => at(a0 + ((a1 - a0) * i) / n, rad)) }
  const ringArrow = (a0, a1) => {
    const s = a0 + gap / 2, e = a1 - gap / 2, h = e - headBy
    return `M${[...arc(s, h, R), at(h, R + flare), at(e, (R + r) / 2), at(h, r - flare), ...arc(h, s, r)].map(([x, y]) => `${f(x)},${f(y)}`).join(' L')}Z`
  }
  const shine = (deg, fill) => { const [x, y] = at(deg, R - 4.2); return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="11" ry="4" transform="rotate(${f(deg + turn)} ${f(x)} ${f(y)})" fill="${fill}"/>` }
  const blob = [[-17, -4], [-11, -13.5], [1, -16], [13, -12], [17.5, -2], [11, 6.5], [-1, 8.5], [-13, 5.5]].map(([x, y]) => [x, y - 1.5])
  cellType('p16 cell-cycle arrest', [...phases.map(([n, pal]) => [n, pal]), ['p16', p16]],
    phases.map(([n, pal]) => boxGrad(`${n.toLowerCase()}-gradient`, pal)).join('') + g.grad('p16-gradient', [-17, -16, 17, 8.5], p16),
    phases.map(([n, pal, a0, a1, lit]) => `<g id="${n.toLowerCase()}-phase"><path d="${ringArrow(a0, a1)}" fill="url(#${n.toLowerCase()}-gradient)" stroke="${pal.outline}" stroke-width="10" stroke-linejoin="round"/>${shine(lit, pal.light)}</g>`).join('\n') + '\n' +
      `<g id="p16">${g.line([[0, 2], [0, 16]], p16.outline, 11)}${g.line([[-8.5, 16.5], [8.5, 16.5]], p16.outline, 13)}` +
      `${g.path(g.smooth(blob), 'url(#p16-gradient)', p16.outline, 10)}${g.hl(-7, -9.5, 13, 4.4, -22, p16.light)}${lettering(g, { x: 0, y: -4, h: 9, text: 'p16', colour: p16.light, id: 'p16-letters' }).body}</g>`) // lettered since the review of 23 November 2026, as p21: unlettered it read as a lamp
}
// Mitochondrial UPR: misfolded proteins (amber tangles) pile up in a mitochondrion; a signal (the blue dot, ATFS-1 or ATF5)
// is carried to the nucleus, which answers with chaperones (the green double ring of HSP60) sent back to the mitochondrion.
// The mitochondrion is drawn as BioSketch's own, the nucleus is the lilac of the set. (SiliCoDraw's orange is the hue of
// the mitochondrion; its chaperone, which stands beside the returning arrow, rides on it here, as the signal does on the other.)
{
  const g = page(4.77, [1.15, -0.55]), mito = soft(MITO), misfolded = deep(PROTEIN), signal = soft(BLUE), hsp = soft(170)
  const tangle = (x, y) => curve(g, placed('M-5,2 C-4,-4 1,-4 1,0 C1,4 -3,3 -2,-1 C-1,-5 6,-4 5,1', x, y), misfolded.small, 7)
  const out = [[27, -25], [39, -21], [45, -10], [39, 3]], back = [[2, 31], [-14, 38], [-29, 28], [-28, -3.5]]
  const chaperone = (x, y) => rect(g, x - 8.5, y - 8, 17, 7.6, 3.4, 'url(#hsp-gradient)', hsp.outline, 5) + rect(g, x - 8.5, y + 0.4, 17, 7.6, 3.4, 'url(#hsp-gradient)', hsp.outline, 5) +
    g.line([[x - 2.8, y - 7], [x - 2.8, y + 7]], hsp.outline, 3.5) + g.line([[x + 2.8, y - 7], [x + 2.8, y + 7]], hsp.outline, 3.5)
  cellType('Mitochondrial UPR', [['mitochondrion', mito], ['misfolded protein', misfolded], ['signal', signal], ['nucleus', NUC], ['chaperone', hsp]],
    g.grad('mitochondrion-gradient', [-46, -44, 26, -8], mito) + g.grad('nucleus-gradient', [4, 4, 44, 44], NUC) + boxGrad('signal-gradient', signal) + boxGrad('hsp-gradient', hsp),
    mitochondrion(g, 'mitochondrion', mito, { x: -10, y: -26, a: 36, b: 18, gap: 4.6, n: 3, cristae: [[-24, -1, 0.6], [-11, 1, 0.6], [2, -1, 0.6], [15, 1, 0.6]] }) + '\n' +
      `<g id="misfolded-protein">${tangle(-17.5, -29) + tangle(9, -23)}</g>\n` +
      `<g id="nucleus">${g.circle(24, 24, 19, 'url(#nucleus-gradient)', NUC.outline, 10)}${g.circle(27, 26, 6, NUC.small)}${g.hl(16, 15, 15, 5.5, -45, NUC.light)}</g>\n` +
      `<g id="signal">${bentArrow(g, out, signal.outline, 10, 8, 9.5)}${g.circle(44, -13, 4.6, 'url(#signal-gradient)', signal.outline, 6)}</g>\n` +
      `<g id="chaperone">${bentArrow(g, back, hsp.outline, 10, 8, 9.5)}${chaperone(-21, 33)}</g>`)
}
// iPSC colony: a compact colony with a crisp edge, of small cells packed tight, each with a large nucleus and a nucleolus,
// on feeder fibroblasts. (SiliCoDraw's lilac colony is the yellow of the approved stem cell, as the iPS cell in
// Reprogramming, so that it recolours apart from the nuclei; the feeders are the peach of the approved fibroblast; the
// packed cells are fewer and larger, so that they still show at 40 px.)
{
  const g = page(4.52, [0, 0]), colony = rich(STEM), fibro = soft(PEACH)
  const spindle = 'M-15,0C-7.5,-5.6 7.5,-5.6 15,0C7.5,5.6 -7.5,5.6 -15,0Z'
  const feeders = [[-35, -32, -35], [35, -33, 30], [-37, 33, 30], [37, 32, -30]]
  const nuclei = []
  for (let j = -2; j <= 2; j++)
    for (let i = -3; i <= 3; i++) {
      const x = i * 11.5 + (j & 1 ? 5.75 : 0) + 1.2 * Math.sin(i * 3.1 + j * 1.3) + 1, y = j * 10.4 + 1.1 * Math.cos(i * 2.2 + j * 2.7) + 0.5
      if ((x / 33) ** 2 + (y / 25.5) ** 2 < 1) nuclei.push([x, y])
    }
  cellType('iPSC colony', [['colony', colony], ['nucleus', NUC], ['feeder cells', fibro]],
    boxGrad('feeder-gradient', fibro) + g.grad('colony-gradient', [-40, -34, 42, 34], colony),
    `<g id="feeder-cells">${feeders.map(([x, y, r]) => g.path(g.D(placed(spindle, x, y, r)), 'url(#feeder-gradient)', fibro.outline, 7) + g.ellipse(x, y, 4, 2.5, r, NUC.small)).join('')}</g>\n` +
      `<g id="colony">${g.path(g.smooth([[-40, -4], [-34, -24], [-14, -34], [10, -34], [32, -24], [42, -2], [36, 20], [14, 34], [-12, 34], [-34, 22]]), 'url(#colony-gradient)', colony.outline, 12)}${g.hl(-24, -23, 22, 7, -32, colony.light)}</g>\n` +
      `<g id="nuclei">${nuclei.map(([x, y]) => g.ellipse(x, y, 4.4, 3.9, 0, NUC.small)).join('')}${nuclei.map(([x, y]) => g.circle(x + 1.1, y - 0.6, 1.35, NUC.outline)).join('')}</g>`)
}

check()
console.log('written to', OUT)
