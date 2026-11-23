// Eight icons of SiliCoDraw's "Cells & tissues" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md with the kit in ../cellkit.mjs:
// processes in tissue (angiogenesis, metastasis, fibrosis, hypoxia), cell division (mitotic spindle, cell cycle),
// reprogramming and the tight junction. Their shapes are read by hand from the source in a 100 × 100 box centred on 0,0
// and scaled onto a 512 page. Nothing is lettered: where SiliCoDraw writes a label, a shape says the same (see each icon).
// Usage: node ct06.mjs <folder>
import { BLUE, GREEN, NUC, PEACH, cellTypes, circleD, nucGrad, nucleus, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex } from '../colour.mjs'
import { f } from '../shapes.mjs'

const OUT = process.argv[2]
const { cellType, check } = cellTypes(OUT)

// The hues of the set (OKLCH degrees). The nucleus lilac is about 319°.
const VESSEL = hueOf('#f3c6c6') // the rose of the approved endothelial cell and pericyte (18°)
const RED = hueOf('#e86b6b') // the red of the approved red blood cell

/** A rounded rectangle given in their units. */
const rect = (g, x, y, w, h, rx, fill, s = '', sw = 0) =>
  `<rect x="${f(g.X(x))}" y="${f(g.Y(y))}" width="${f(w * g.k)}" height="${f(h * g.k)}" rx="${f(rx * g.k)}" fill="${fill}"${s ? ` stroke="${s}" stroke-width="${sw}" stroke-linejoin="round"` : ''}/>`
/** A rounded rectangle given in their units, as a path on the page (for `g.union`). */
const rrect = (g, x, y, w, h, r) => {
  const [x0, y0] = g.P([x, y]), W = w * g.k, H = h * g.k, R = Math.min(r * g.k, W / 2, H / 2)
  return `M${f(x0 + R)},${f(y0)} H${f(x0 + W - R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + W)},${f(y0 + R)} V${f(y0 + H - R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + W - R)},${f(y0 + H)} H${f(x0 + R)} A${f(R)},${f(R)} 0 0 1 ${f(x0)},${f(y0 + H - R)} V${f(y0 + R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + R)},${f(y0)} Z`
}
/** An open curve given in their units (M, L and C only), drawn as a line with round ends; width in pixels. */
const curve = (g, d, colour, w, extra = '') => `<path d="${g.D(d)}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`
/** One gradient that lights every shape that uses it from its own top left (several nuclei, several cells). */
const boxGrad = (id, pal) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`
/** The first part, up to `t`, of a cubic Bézier curve given by its four points. */
const firstPart = ([p0, p1, p2, p3], t) => {
  const mid = (a, b) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
  const a = mid(p0, p1), b = mid(p1, p2), c = mid(p2, p3), ab = mid(a, b), bc = mid(b, c)
  return [p0, a, ab, mid(ab, bc)]
}
const bezD = ([p0, p1, p2, p3]) => `M${p0} C${p1} ${p2} ${p3}`
/** A triangle arrowhead with its tip at `to`, pointing away from `from` (their units); length and width in units. */
const head = (g, from, to, len, wide, fill) => {
  const [x0, y0] = from, [x1, y1] = to, d = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / d, uy = (y1 - y0) / d
  const bx = x1 - ux * len, by = y1 - uy * len
  const pts = [[x1, y1], [bx - (uy * wide) / 2, by + (ux * wide) / 2], [bx + (uy * wide) / 2, by - (ux * wide) / 2]].map(g.P)
  return `<path d="M${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' L')}Z" fill="${fill}" stroke="${fill}" stroke-width="3" stroke-linejoin="round"/>`
}
/** An arrow from `a` to `b` (their units): a round-capped line that stops under its head, then the head. */
const arrow = (g, a, b, colour, w, len = 7, wide = 8) => {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]), t = (d - len * 0.6) / d
  return g.line([a, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]], colour, w) + head(g, a, b, len, wide, colour)
}
/** The lumpy outline of a cancer cell (as in ../silicodraw.mjs): n points, alternately at radius R and r. */
const lumpy = (cx, cy, R, r, n = 16, turn = 0) => Array.from({ length: n }, (_, i) => { const t = (i / n) * Math.PI * 2 + turn, q = i % 2 ? r : R; return [cx + q * Math.cos(t), cy + q * Math.sin(t)] })
/** A nucleus that is an ellipse, lit by the shared box gradient `nucleus-gradient`. */
const ovalNucleus = (g, x, y, rx, ry, rot, w) =>
  g.ellipse(x, y, rx, ry, rot, 'url(#nucleus-gradient)', NUC.outline, w) + g.hl(x - rx * 0.36, y - ry * 0.5, f(rx * g.k * 0.3), f(ry * g.k * 0.2), rot - 8, NUC.light)

// Angiogenesis: a new vessel sprouting from a capillary towards a growth factor (VEGF, the dots): the sprout's lumen
// follows behind a tip cell that feels its way with filopodia. Red blood cells in the parent vessel.
// (SiliCoDraw's VEGF is red like the vessel; it is blue here. The tip cell has a nucleus and filopodia.)
{
  const g = page(4.36, [0, -6.2]), vessel = soft(VESSEL), blood = deep(VESSEL), vegf = soft(BLUE)
  const sprout = [[-12, 21], [-5, 2], [8, -9], [19, -23]], tip = [21, -26]
  const filopodia = [-68, -30, 8].map((deg) => { const a = (deg * Math.PI) / 180; return [[tip[0] + 9 * Math.cos(a), tip[1] + 9 * Math.sin(a)], [tip[0] + 17.5 * Math.cos(a), tip[1] + 17.5 * Math.sin(a)]] })
  cellType('Angiogenesis', [['vessel', vessel], ['growth factor', vegf], ['nucleus', NUC]],
    g.grad('vessel-gradient', [-50, -20, 50, 33], vessel) + g.grad('tip-gradient', [tip[0] - 10, tip[1] - 10, tip[0] + 10, tip[1] + 10], vessel) + nucGrad(g, tip[0] + 0.6, tip[1] + 0.4, 4.6),
    `<g id="vessel">${g.union([rrect(g, -50, 9, 100, 24, 12), { d: g.D(bezD(sprout)), width: f(14 * g.k) }], 'url(#vessel-gradient)', vessel.outline, 12)}${g.hl(-36, 13, 20, 4, -3, vessel.light)}</g>\n` +
      `<g id="lumen">${rect(g, -43, 16, 86, 10, 5, vessel.light)}${curve(g, bezD(firstPart(sprout, 0.7)), vessel.light, 5 * g.k)}</g>\n` +
      `<g id="red-blood-cells">${[[-36, 21], [-24, 21], [8, 21], [30, 21]].map(([x, y]) => g.circle(x, y, 3.3, blood.small)).join('')}</g>\n` +
      `<g id="tip-cell">${filopodia.map((p) => g.line(p, vessel.outline, 9)).join('')}${g.circle(tip[0], tip[1], 10, 'url(#tip-gradient)', vessel.outline, 10)}${g.hl(tip[0] - 4.8, tip[1] - 5.2, 8, 3.2, -45, vessel.light)}</g>\n` +
      nucleus(g, tip[0] + 0.6, tip[1] + 0.4, 4.6, 7) + '\n' +
      `<g id="growth-factor">${[[37, -45], [46, -37], [47, -24], [43, -12], [33, -8]].map(([x, y]) => g.circle(x, y, 3.1, vegf.small)).join('')}</g>`)
}
// Metastasis: a tumour cell squeezing between two cells of a vessel wall into the blood (intravasation), and one already
// carried along in it. The tumour cells follow the approved cancer cell (a lumpy outline, a large nucleus with a nucleolus).
// (Tumour and vessel are both pinkish red in SiliCoDraw: the tumour keeps their pink, 356°, the vessel is 33°, not 18°.)
{
  const g = page(4.48, [0, 0.4]), vessel = soft(33), blood = deep(33), tumour = soft(356)
  const body = [[-24, -36], [-17, -37.5], [-10, -41], [-4, -36.5], [3, -33], [2, -26], [5.5, -19], [0, -11], [-6, -3], [-7, 5], [-6.5, 11], [-2.5, 17], [-4.5, 23.5], [-12, 26], [-19, 23], [-20, 16], [-16.5, 10.5], [-17, 4], [-19, -4], [-25.5, -9.5], [-30.5, -16], [-27, -23], [-31, -29.5]]
  cellType('Metastasis', [['vessel', vessel], ['tumour cell', tumour], ['nucleus', NUC]],
    g.grad('vessel-gradient', [-50, 3, 50, 42], vessel) + g.grad('tumour-gradient', [-31, -40, 5, 24], tumour) + g.grad('tumour-gradient-2', [20.5, 13, 39.5, 32], tumour) + boxGrad('nucleus-gradient', NUC),
    `<g id="vessel">${rect(g, -50, 3, 100, 39, 13, 'url(#vessel-gradient)', vessel.outline, 12)}${g.hl(-36, 5.6, 18, 3.4, -3, vessel.light)}` +
      `${[[-36, 3.6, 9.6], [14, 3.6, 9.6], [38, 3.6, 9.6], [-26, 35.4, 41.4], [2, 35.4, 41.4], [28, 35.4, 41.4]].map(([x, y0, y1]) => g.line([[x, y0], [x, y1]], vessel.outline, 6)).join('')}</g>\n` +
      `<g id="lumen">${rect(g, -43, 10, 86, 25, 8, vessel.light, vessel.outline, 7)}</g>\n` +
      `<g id="red-blood-cells">${[[-35, 17.5], [-29, 28]].map(([x, y]) => g.circle(x, y, 3.3, blood.small)).join('')}</g>\n` +
      `<g id="arrow">${arrow(g, [2.5, 22.5], [17.5, 22.5], tumour.outline, 9, 7, 9)}</g>\n` +
      `<g id="tumour-cell">${g.path(g.smooth(body), 'url(#tumour-gradient)', tumour.outline, 12)}${g.hl(-23, -31, 16, 6, -45, tumour.light)}` +
      `${g.circle(-13.5, -22.5, 8, 'url(#nucleus-gradient)', NUC.outline, 9)}${g.circle(-10.6, -24, 2.4, NUC.small)}${g.hl(-17, -26, 8, 3.2, -45, NUC.light)}</g>\n` +
      `<g id="circulating-tumour-cell">${g.path(g.smooth(lumpy(30, 22.5, 9.3, 8.2, 10, 0.3)), 'url(#tumour-gradient-2)', tumour.outline, 9)}${g.hl(26, 18, 6, 2.6, -45, tumour.light)}${g.circle(30.4, 22.8, 3.6, 'url(#nucleus-gradient)', NUC.outline, 6)}</g>`)
}
// Fibrosis: tissue filled with wavy bundles of collagen, the nuclei of the fibroblasts that lay it down among them.
{
  const g = page(4.87, [0, 0]), tissue = soft(hueOf('#f6d0dc')), collagen = soft(hueOf('#d9824a')), fibreInk = toHex({ l: 0.72, c: 0.1, h: hueOf('#d9824a') })
  // SiliCoDraw's wave, every second one mirrored so that the bundles do not run in step.
  const fibre = (y, s) => `M${-38 * s},${y} C${-28 * s},${y - 6} ${-18 * s},${y + 6} ${-8 * s},${y} C${2 * s},${y - 6} ${12 * s},${y - 6} ${22 * s},${y} C${32 * s},${y + 6} ${34 * s},${y + 6} ${38 * s},${y}`
  cellType('Fibrosis', [['tissue', tissue], ['collagen', collagen], ['nucleus', NUC]],
    g.grad('tissue-gradient', [-46, -36, 46, 36], tissue) + boxGrad('nucleus-gradient', NUC),
    `<g id="tissue">${rect(g, -46, -36, 92, 72, 8, 'url(#tissue-gradient)', tissue.outline, 12)}${g.hl(-37.5, -31, 13, 4.5, -20, tissue.light)}</g>\n` +
      `<g id="collagen">${[-24, -12, 0, 12, 24].map((y, i) => curve(g, fibre(y, i % 2 ? -1 : 1), fibreInk, 12)).join('')}</g>\n` +
      `<g id="nuclei">${[[-26, -26], [20, -10], [-14, 20], [26, 24]].map(([x, y]) => ovalNucleus(g, x, y, 8, 4.2, -25, 6)).join('')}</g>`)
}
// Hypoxia: a cell short of oxygen. SiliCoDraw writes "O2" over a falling arrow; here an oxygen molecule (two red atoms
// joined, as in a space-filling model) stands over the same arrow.
{
  const g = page(6.2, [0, 4]), cyto = soft(BLUE), oxygen = deep(RED)
  cellType('Hypoxia', [['cytoplasm', cyto], ['oxygen', oxygen], ['nucleus', NUC]],
    g.grad('cell-gradient', [-36, -32, 36, 40], cyto) + nucGrad(g, -13, 7, 11),
    `<g id="cytoplasm">${g.circle(0, 4, 36, 'url(#cell-gradient)', cyto.outline, 12)}${g.hl(-21, -16, 26, 10, -45, cyto.light)}</g>\n` +
      nucleus(g, -13, 7, 11) + '\n' +
      `<g id="oxygen">${g.union([circleD(g, 10.6, -8.5, 5.6), circleD(g, 19.4, -8.5, 5.6)], oxygen.base, oxygen.outline, 6)}${[10.6, 19.4].map((x) => g.hl(x - 2, -10.9, 8, 3.4, -40, oxygen.light)).join('')}</g>\n` +
      `<g id="arrow">${arrow(g, [15, 3.5], [15, 27], oxygen.outline, 11, 8.5, 11)}</g>`)
}
// Mitotic spindle: a cell in metaphase. The chromosomes (lilac, like every nucleus of the set) lie on the equator, each
// held from both poles by spindle fibres; short astral rays round each centrosome.
// (SiliCoDraw's fibres run out past the cell; here the poles sit inside it. Fibres and centrosomes are green, the
// colour tubulin is usually shown in, where SiliCoDraw has the cell's own blue.)
{
  const g = page(4.87, [0, 0]), cyto = soft(BLUE), spindle = soft(GREEN), fibreInk = toHex({ l: 0.68, c: 0.095, h: GREEN })
  const pole = 32, ys = [-18, -9, 0, 9, 18]
  const asters = [-1, 1].flatMap((s) => [-125, 180, 125].map((deg) => { const a = (deg * Math.PI) / 180; return [[s * pole, 0], [s * (pole - 8.5 * Math.cos(a)), 8.5 * Math.sin(a)]] }))
  cellType('Mitotic spindle', [['cytoplasm', cyto], ['spindle', spindle], ['chromosomes', NUC]],
    g.grad('cell-gradient', [-46, -31, 46, 31], cyto) + boxGrad('chromosome-gradient', NUC),
    `<g id="cytoplasm">${g.ellipse(0, 0, 46, 31, 0, 'url(#cell-gradient)', cyto.outline, 12)}${g.hl(-27, -19.5, 28, 7, -24, cyto.light)}</g>\n` +
      `<g id="spindle">${ys.map((y) => curve(g, `M${-pole},0 C-20,${y * 1.04} -9,${y} 0,${y} C9,${y} 20,${y * 1.04} ${pole},0`, fibreInk, 5)).join('')}${asters.map((p) => g.line(p, fibreInk, 5)).join('')}` +
      `${[-pole, pole].map((x) => g.circle(x, 0, 4.4, spindle.small, spindle.outline, 5)).join('')}</g>\n` +
      `<g id="chromosomes">${ys.map((y) => rect(g, -4.6, y - 3.3, 9.2, 6.6, 3.3, 'url(#chromosome-gradient)', NUC.outline, 5)).join('')}</g>`)
}
// Cell cycle: a ring of four arrows that follow each other clockwise from the top: G1 (blue), S (green), G2 (yellow)
// and M (pink), in SiliCoDraw's colours. SiliCoDraw writes the letters on four equal quarters and sets one small
// arrowhead at the top; here every phase is an arrow, and its length says which phase it is (G1 the longest, then S,
// G2, and M the shortest), as in a textbook's diagram.
{
  const g = page(5.23, [-1.8, -0.75]), R = 41, r = 23, flare = 5, gap = 7, headBy = 19
  const phases = [['G1', soft(hueOf('#bfdbfe')), 0, 140, 22], ['S', soft(hueOf('#bbf7d0')), 140, 236, 160], ['G2', rich(hueOf('#fde68a')), 236, 306, 262], ['M', soft(hueOf('#f6a5c0')), 306, 360, 322]]
  // A point at `deg` clockwise from the top, `rad` from the middle.
  const at = (deg, rad) => { const a = (deg * Math.PI) / 180; return g.P([rad * Math.sin(a), -rad * Math.cos(a)]) }
  const arc = (a0, a1, rad) => { const n = Math.ceil(Math.abs(a1 - a0) / 3); return Array.from({ length: n + 1 }, (_, i) => at(a0 + ((a1 - a0) * i) / n, rad)) }
  // One arrow of the ring: a band from a flat tail to a head that is wider than the band and ends in a point.
  const ringArrow = (a0, a1) => {
    const s = a0 + gap / 2, e = a1 - gap / 2, h = e - headBy
    return `M${[...arc(s, h, R), at(h, R + flare), at(e, (R + r) / 2), at(h, r - flare), ...arc(h, s, r)].map(([x, y]) => `${f(x)},${f(y)}`).join(' L')}Z`
  }
  const shine = (deg, fill) => { const [x, y] = at(deg, R - 4.4); return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="12" ry="4.2" transform="rotate(${f(deg)} ${f(x)} ${f(y)})" fill="${fill}"/>` }
  cellType('Cell cycle', phases.map(([n, pal]) => [n, pal]),
    phases.map(([n, pal]) => boxGrad(`${n.toLowerCase()}-gradient`, pal)).join(''),
    phases.map(([n, pal, a0, a1, lit]) => `<g id="${n.toLowerCase()}-phase"><path d="${ringArrow(a0, a1)}" fill="url(#${n.toLowerCase()}-gradient)" stroke="${pal.outline}" stroke-width="10" stroke-linejoin="round"/>${shine(lit, pal.light)}</g>`).join('\n'))
}
// Reprogramming: a differentiated cell turned into an induced pluripotent stem cell (round, yellow like the approved
// stem cell, a large nucleus). SiliCoDraw writes "OSKM" over the arrow; here four dots in four colours stand for the
// four factors (Oct4, Sox2, Klf4, c-Myc).
{
  const g = page(4.6, [-0.25, -1.65]), cyto = soft(GREEN), ips = rich(hueOf('#fde68a'))
  const factors = [20, 57, 200, 260].map((h) => soft(h))
  const somatic = [[-47.9, -6.4], [-30, -19.8], [-12.1, -10.8], [-14.3, 4.8], [-30, 13.8], [-45.7, 9.3]]
  cellType('Reprogramming', [['somatic cell', cyto], ['stem cell', ips], ['nucleus', NUC], ...factors.map((p, i) => [`factor ${i + 1}`, p])],
    g.grad('cell-gradient', [-48, -20, -12, 14], cyto) + g.grad('stem-gradient', [14.5, -17, 48.5, 17], ips) + boxGrad('nucleus-gradient', NUC),
    `<g id="somatic-cell">${g.path(g.smooth(somatic), 'url(#cell-gradient)', cyto.outline, 10)}${g.hl(-36.5, -10.5, 11, 4.5, -38, cyto.light)}` +
      `${g.circle(-29, -2.5, 6, 'url(#nucleus-gradient)', NUC.outline, 7)}${g.hl(-31.4, -5, 7, 3, -45, NUC.light)}</g>\n` +
      `<g id="arrow">${arrow(g, [-7.5, 0], [10.5, 0], cyto.outline, 10, 7.5, 10)}</g>\n` +
      `<g id="factors">${factors.map((p, i) => g.circle(1.25 + (i - 1.5) * 7.2, -18, 3.4, p.small)).join('')}</g>\n` +
      `<g id="stem-cell">${g.circle(31.5, 0, 17, 'url(#stem-gradient)', ips.outline, 10)}${g.hl(21.5, -9.5, 13, 5, -45, ips.light)}` +
      `${g.circle(31.5, 0.3, 9, 'url(#nucleus-gradient)', NUC.outline, 8)}${g.hl(27.8, -3.5, 9, 3.6, -45, NUC.light)}</g>`)
}
// Tight junction: two epithelial cells sealed to each other near their apical (free) surface by strands that bridge the
// cleft between them. Solutes wait on the apical side, one of them stopped at the first strand; none is below.
// (SiliCoDraw writes "apical" over the cleft and draws a dashed line under the strands: both are left out. The strands
// are rose, where SiliCoDraw's are a brown of the cell's own hue, and the nuclei lie a little nearer the base.)
{
  const g = page(4.48, [0, -6.4]), cyto = soft(PEACH), strand = soft(14), solute = soft(hueOf('#4f6bb8'))
  cellType('Tight junction', [['cytoplasm', cyto], ['junction', strand], ['solute', solute], ['nucleus', NUC]],
    boxGrad('cell-gradient', cyto) + boxGrad('nucleus-gradient', NUC),
    `<g id="cytoplasm">${[-50, 4].map((x) => rect(g, x, -36, 46, 72, 8, 'url(#cell-gradient)', cyto.outline, 12) + g.hl(x + 11, -27, 13, 5, -35, cyto.light)).join('')}</g>\n` +
      `<g id="nuclei">${[-27, 27].map((x) => g.circle(x, 9, 9.5, 'url(#nucleus-gradient)', NUC.outline, 10) + g.hl(x - 4, 5, 10, 4, -45, NUC.light)).join('')}</g>\n` +
      `<g id="junction">${[-26.5, -18.5, -10.5].map((y) => rect(g, -7.4, y - 2.3, 14.8, 4.6, 2.3, strand.small, strand.outline, 5)).join('')}</g>\n` +
      `<g id="solutes">${[[0, -34.6, 3.3], [-7.5, -44.5, 3.6], [6.5, -46.5, 3.6]].map(([x, y, r]) => g.circle(x, y, r, solute.small)).join('')}</g>`)
}

check()
console.log('written to', OUT)
