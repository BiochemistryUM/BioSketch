// Eight icons of SiliCoDraw's "Cells & tissues" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md with the kit in ../cellkit.mjs:
// the TCA cycle, a morphogen gradient, a neutrophil extracellular trap, an archaeon, a filament of cyanobacteria, and
// three kinds of cells grown in culture (a spheroid, an embryoid body, a co-culture). Their shapes are read by hand from
// the source in a 100 × 100 box centred on 0,0 and scaled onto a 512 page. Nothing is lettered: where SiliCoDraw writes
// a label, a shape says the same or the label is left out (see each icon).
// They follow the approved set: the neutrophil of ../silicodraw.mjs, bacteria green, every cell nucleus lilac, an arrow
// one stroke with a filled head in the outline tone of what moves.
// Usage: node ct08.mjs <folder>
import { NUC, PEACH, cellTypes, circleD, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex } from '../colour.mjs'
import { f } from '../shapes.mjs'

const OUT = process.argv[2]
const { cellType, check } = cellTypes(OUT)

// The hues of the set (OKLCH degrees). The nucleus lilac is about 319°.
const CYCLE = hueOf('#5fae8b'), METABOLITE = hueOf('#e3955a'), CARRIER = 255
const MORPHOGEN = hueOf('#4f6bb8'), FATE_1 = 215, FATE_2 = hueOf('#5fae8b'), FATE_3 = hueOf('#fde68a') // fate 1 moved from 267° to 215°, away from the morphogen
const BACTERIUM = hueOf('#d8ecd0'), ARCHAEON = hueOf('#f6d9c8'), CYANO = hueOf('#9bc47c'), HETEROCYST = hueOf('#fde68a')
const SPHEROID = hueOf('#f6d0dc')
const LAYER_OUT = hueOf('#fde68a'), LAYER_MID = hueOf('#cfe8d8'), LAYER_IN = hueOf('#f6d0dc'), LAYER_CORE = hueOf('#dbe4f7')
const CELL_A = hueOf('#cfe3f5'), CELL_B = hueOf('#f6d0dc'), MEDIUM = 190, DISH = hueOf('#eef2f6')

/** A palette in the steps of `soft` with almost no colour: a grey, which BioSketch leaves out of "Shades follow". */
const grey = (h) => ({
  light: toHex({ l: 0.985, c: 0.002, h }),
  base: toHex({ l: 0.95, c: 0.005, h }),
  shadow: toHex({ l: 0.9, c: 0.007, h }),
  small: toHex({ l: 0.82, c: 0.008, h }),
  outline: toHex({ l: 0.62, c: 0.01, h }),
})
/** A rounded rectangle given in their units. */
const rect = (g, x, y, w, h, rx, fill, s = '', sw = 0) =>
  `<rect x="${f(g.X(x))}" y="${f(g.Y(y))}" width="${f(w * g.k)}" height="${f(h * g.k)}" rx="${f(rx * g.k)}" fill="${fill}"${s ? ` stroke="${s}" stroke-width="${sw}" stroke-linejoin="round"` : ''}/>`
/** A polygon given in their units with its corners rounded (radius in their units), as a path on the page. */
const roundPoly = (g, pts, r) => {
  const n = pts.length, P = pts.map(g.P), R = r * g.k
  const toward = (a, b, d) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), t = Math.min(d, L / 2) / L; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] }
  let d = ''
  for (let i = 0; i < n; i++) {
    const prev = P[(i - 1 + n) % n], cur = P[i], next = P[(i + 1) % n]
    const a = toward(cur, prev, R), b = toward(cur, next, R)
    d += `${i ? 'L' : 'M'}${f(a[0])},${f(a[1])} Q${f(cur[0])},${f(cur[1])} ${f(b[0])},${f(b[1])} `
  }
  return d + 'Z'
}
/** An open curve given in their units (M, L and C only), drawn as a line with round ends; width in pixels. */
const curve = (g, d, colour, w, extra = '') => `<path d="${g.D(d)}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`
/** One gradient that lights every shape that uses it from its own top left (several cells, several nuclei). */
const boxGrad = (id, pal, from = 'base', to = 'shadow') => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal[from]}"/><stop offset="1" stop-color="${pal[to]}"/></linearGradient>`
/** A point on a cubic Bézier curve given by its four points. */
const bez = ([p0, p1, p2, p3], t) => [0, 1].map((i) => (1 - t) ** 3 * p0[i] + 3 * (1 - t) ** 2 * t * p1[i] + 3 * (1 - t) * t ** 2 * p2[i] + t ** 3 * p3[i])
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
/** The highlight of a round body of radius r (their units), at its top left. */
const shine = (g, x, y, r, pal, size = 0.26) => g.hl(x - r * 0.42, y - r * 0.45, f(r * g.k * size), f(r * g.k * size * 0.4), -45, pal.light)
/** A point at `deg` clockwise from the top, `r` from (cx, cy). */
const clock = (cx, cy, r, deg) => { const a = (deg * Math.PI) / 180; return [cx + r * Math.sin(a), cy - r * Math.cos(a)] }

// TCA cycle: six metabolites on a ring, an arrowhead between each two, all turning clockwise; acetyl-CoA comes in at the
// top left and NADH leaves at the bottom right. (SiliCoDraw writes "TCA" in the middle and "acetyl-CoA" and "NADH" at the
// two arrows: all three are left out. Acetyl-CoA is drawn as a small molecule of two joined atoms, the two carbons of its
// acetyl group, in the colour of the metabolites; NADH as a blue dot, the electron carrier, at the end of its arrow.)
{
  const g = page(4.84, [-4.4, -1.4]), ring = soft(CYCLE), met = soft(METABOLITE), carrier = soft(CARRIER), C = [0, 2], R = 30
  const heads = [30, 90, 150, 210, 270, 330].map((t) => head(g, clock(...C, R, t - 9), clock(...C, R, t + 5), 8, 10, ring.outline))
  const inTo = clock(...C, R + 5.5, 322), inFrom = [-37, -36], u = [inTo[0] - inFrom[0], inTo[1] - inFrom[1]].map((v, _, a) => v / Math.hypot(...a))
  const atoms = [11, 4.6].map((s) => [inFrom[0] - u[0] * s, inFrom[1] - u[1] * s])
  const outFrom = clock(...C, R + 5.5, 135), outTo = clock(...C, R + 18, 135), nadh = clock(...C, R + 23.5, 135)
  cellType('TCA cycle', [['cycle', ring], ['metabolites', met], ['NADH', carrier]],
    boxGrad('metabolite-gradient', met) + boxGrad('carrier-gradient', carrier),
    `<g id="cycle"><circle cx="${f(g.X(C[0]))}" cy="${f(g.Y(C[1]))}" r="${f(R * g.k)}" fill="none" stroke="${ring.outline}" stroke-width="10"/>${heads.join('')}</g>\n` +
      `<g id="metabolites">${[0, 60, 120, 180, 240, 300].map((t) => clock(...C, R, t)).map(([x, y]) => g.circle(x, y, 7, 'url(#metabolite-gradient)', met.outline, 8) + shine(g, x, y, 7, met, 0.3)).join('')}</g>\n` +
      `<g id="acetyl-coa">${arrow(g, inFrom, inTo, met.outline, 9, 8, 10)}${g.union(atoms.map(([x, y]) => circleD(g, x, y, 4.4)), 'url(#metabolite-gradient)', met.outline, 6)}</g>\n` +
      `<g id="nadh">${arrow(g, outFrom, outTo, carrier.outline, 9, 8, 10)}${g.circle(...nadh, 4.6, 'url(#carrier-gradient)', carrier.outline, 6)}</g>`)
}
// Morphogen gradient: the morphogen, high at its source on the left and falling to nothing on the right, over a row of
// cells that take one of three fates by how much of it they receive. (SiliCoDraw draws the gradient as a band that fades
// and writes "high" and "low" under the cells; here the band is a wedge, tall where the morphogen is high, so the words are
// not needed. Six cells, two of each fate, where SiliCoDraw has eight; the first fate is sky blue, not the morphogen's blue.)
{
  const g = page(4.79, [0, -11]), morph = soft(MORPHOGEN), fates = [soft(FATE_1), soft(FATE_2), rich(FATE_3)]
  const xs = [-40, -24, -8, 8, 24, 40]
  const wedge = `<linearGradient id="morphogen-gradient" x1="${f(g.X(-48))}" y1="0" x2="${f(g.X(48))}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${morph.small}"/><stop offset="1" stop-color="${morph.light}"/></linearGradient>`
  cellType('Morphogen gradient', [['morphogen', morph], ['fate 1', fates[0]], ['fate 2', fates[1]], ['fate 3', fates[2]], ['nucleus', NUC]],
    wedge + fates.map((p, i) => boxGrad(`fate-${i + 1}-gradient`, p)).join('') + boxGrad('nucleus-gradient', NUC),
    `<g id="morphogen">${g.path(roundPoly(g, [[-47, -43], [47, -21.5], [47, -18], [-47, -18]], 1.5), 'url(#morphogen-gradient)', morph.outline, 8)}</g>\n` +
      xs.map((x, i) => { const p = fates[Math.floor(i / 2)]; return `<g id="cell-${i + 1}">${rect(g, x - 7, -10, 14, 30, 4, `url(#fate-${Math.floor(i / 2) + 1}-gradient)`, p.outline, 8)}${g.hl(x - 3, -4, 3, 12, 0, p.light)}` +
        `${g.circle(x, 7, 4.2, 'url(#nucleus-gradient)', NUC.outline, 6)}</g>` }).join('\n'))
}
// Neutrophil extracellular trap: a neutrophil (as the approved one: peach, a nucleus of three lobes) whose membrane has
// opened on the right, where threads of its chromatin stream out and form a net that holds three bacteria.
// (SiliCoDraw's cell is blue with a blue nucleus and blue threads, and its threads begin at the membrane; here the threads
// are the chromatin of the nucleus, in the lilac of every nucleus, run out from it through the gap in the membrane, and
// a few cross-links make them a net. The bacteria are the green of the approved bacterium.)
{
  const g = page(4.88, [-0.2, -1]), cyto = soft(PEACH), bact = soft(BACTERIUM), C = [-22, 0], R = 24
  const s = 0.63, lobes = [[-16, -6, 11], [2, -16, 10], [14, 5, 11]].map(([x, y, r]) => [C[0] + x * s, C[1] + y * s, r * s])
  const joins = [[lobes[0], lobes[1]], [lobes[1], lobes[2]]].map(([a, b]) => ({ d: `M${g.P(a).map(f).join(',')} L${g.P(b).map(f).join(',')}`, width: f(4 * s * g.k) }))
  // Each thread: a lead-in from inside the nucleus, then SiliCoDraw's curve.
  const threads = [
    [[[-11, -2], [-6, -4], [-3, -7], [0, -10]], [[0, -10], [12, -22], [20, -16], [30, -28]]],
    [[[-10, 1], [-5, 1], [-1, 1], [2, 0]], [[2, 0], [14, -4], [24, 4], [40, -2]]],
    [[[-11, 4], [-6, 5], [-3, 7], [0, 10]], [[0, 10], [10, 20], [22, 14], [32, 26]]],
    [[[-10, -1], [-4, -1], [1, -2.3], [4, -4]], [[4, -4], [18, -12], [30, -6], [46, -14]]],
    [[[-10, 3], [-4, 3.5], [-1, 4.7], [2, 6]], [[2, 6], [16, 12], [28, 8], [44, 14]]],
  ]
  const tD = (segs) => `M${segs[0][0]} ` + segs.map(([, a, b, c]) => `C${a} ${b} ${c}`).join(' ')
  // Cross-links between neighbouring threads, from a point on one to a point on the other (thread, t on its curve).
  const links = [[[0, 0.55], [3, 0.4]], [[3, 0.75], [1, 0.75]], [[1, 0.45], [4, 0.4]], [[4, 0.7], [2, 0.75]], [[1, 0.95], [4, 0.95]]]
    .map(([[i, t], [j, u]]) => [bez(threads[i][1], t), bez(threads[j][1], u)])
  const gap = 30 // half the opening of the membrane, in degrees either side of the right
  const arc = (a0, a1) => { const p0 = clock(...C, R, a0), p1 = clock(...C, R, a1); return `M${g.P(p0).map(f).join(',')} A${f(R * g.k)},${f(R * g.k)} 0 1 1 ${g.P(p1).map(f).join(',')}` }
  cellType('Neutrophil extracellular trap', [['cytoplasm', cyto], ['nucleus', NUC], ['bacteria', bact]],
    g.grad('cell-gradient', [C[0] - R, -R, C[0] + R, R], cyto) + g.grad('nucleus-gradient', [-33, -17, -6, 10], NUC) + boxGrad('bacterium-gradient', bact),
    `<g id="cytoplasm">${g.circle(...C, R, 'url(#cell-gradient)')}<path d="${arc(90 + gap, 90 - gap)}" fill="none" stroke="${cyto.outline}" stroke-width="12" stroke-linecap="round"/>${g.hl(C[0] - 13, C[1] - 17.5, 12, 4.5, -40, cyto.light)}</g>\n` +
      `<g id="granules">${[[-36, 10], [-26, 16], [-14, 17], [-32, -12], [-11, -14]].map(([x, y]) => g.circle(x, y, 2, cyto.small)).join('')}</g>\n` +
      `<g id="chromatin">${threads.map((t) => curve(g, tD(t), NUC.outline, 7)).join('')}${links.map((p) => g.line(p, NUC.outline, 5)).join('')}</g>\n` +
      `<g id="nucleus">${g.union([...lobes.map(([x, y, r]) => circleD(g, x, y, r)), ...joins], 'url(#nucleus-gradient)', NUC.outline, 8)}${g.hl(lobes[0][0] - 2.5, lobes[0][1] - 3, 8, 3.4, -45, NUC.light)}</g>\n` +
      `<g id="bacteria">${[[22, -24], [38, 2], [28, 22]].map(([x, y]) => `<g transform="rotate(-20 ${f(g.X(x))} ${f(g.Y(y))})">${rect(g, x - 8.5, y - 4, 17, 8, 4, 'url(#bacterium-gradient)', bact.outline, 6)}</g>`).join('')}</g>`)
}
// Archaeon: a cell of irregular, angular outline (as many archaea are), a few granules, two archaella, and the S-layer
// that covers it, a crust of protein subunits round the membrane. (SiliCoDraw draws the S-layer as a dashed line on the
// membrane; here it is a ring of beads just outside it. The corners are rounded, the archaella longer and wavier.)
{
  const g = page(4.29, [5.6, 3.4]), cell = soft(ARCHAEON)
  const corners = [[-44, -10], [-10, -36], [30, -26], [44, 10], [14, 34], [-26, 30]]
  // The outline moved out by `d` units all round: each side pushed out along its normal, corners where the sides meet.
  const outset = (pts, d) => {
    const n = pts.length, sides = pts.map((p, i) => { const q = pts[(i + 1) % n], L = Math.hypot(q[0] - p[0], q[1] - p[1]), nx = (q[1] - p[1]) / L, ny = -(q[0] - p[0]) / L; return [[p[0] + nx * d, p[1] + ny * d], [q[0] + nx * d, q[1] + ny * d]] })
    const meet = ([a, b], [c, e]) => { const r = [b[0] - a[0], b[1] - a[1]], s = [e[0] - c[0], e[1] - c[1]], t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / (r[0] * s[1] - r[1] * s[0]); return [a[0] + t * r[0], a[1] + t * r[1]] }
    return sides.map((side, i) => meet(sides[(i - 1 + n) % n], side))
  }
  const layer = roundPoly(g, outset(corners, 5.5), 17)
  cellType('Archaea', [['cell', cell]],
    g.grad('cell-gradient', [-44, -36, 44, 34], cell),
    `<g id="archaella">${curve(g, 'M41,10 C46,10 47,4 51,1 C55,-2 54,-7 58,-9', cell.outline, 9)}${curve(g, 'M-24,32 C-28,38 -34,36 -37,40 C-40,44 -44,43 -47,46', cell.outline, 9)}</g>\n` +
      `<g id="s-layer"><path d="${layer}" fill="none" stroke="${cell.small}" stroke-width="10" stroke-linecap="round" stroke-dasharray="0.1 17"/></g>\n` +
      `<g id="cell">${g.path(roundPoly(g, corners, 12), 'url(#cell-gradient)', cell.outline, 12)}${g.hl(-20, -19, 20, 7, -38, cell.light)}</g>\n` +
      `<g id="granules">${[[-16, -6], [8, -4], [-4, 14], [20, 12]].map(([x, y]) => g.circle(x, y, 4.2, cell.small)).join('')}</g>`)
}
// Cyanobacteria: a filament of cells (as in Anabaena), each with a granule of its thylakoids, and in the middle a
// heterocyst, the larger, thick-walled cell that fixes nitrogen, with a polar nodule at each end where it joins its
// neighbours. (Seven cells where SiliCoDraw has nine, so that each is larger; the nodules are added.)
{
  const g = page(4.6, [0, 0]), cell = soft(CYANO), het = rich(HETEROCYST)
  const xs = [-42, -28, -14, 14, 28, 42]
  cellType('Cyanobacteria', [['cells', cell], ['heterocyst', het]],
    boxGrad('cell-gradient', cell) + g.grad('heterocyst-gradient', [-10, -10, 10, 10], het),
    `<g id="cells">${xs.map((x) => rect(g, x - 7, -9.5, 14, 19, 6, 'url(#cell-gradient)', cell.outline, 9) + g.hl(x - 3, -4.5, 2.6, 6, 15, cell.light)).join('')}</g>\n` +
      `<g id="thylakoids">${xs.map((x) => g.circle(x + 0.5, 1.5, 3, cell.small)).join('')}</g>\n` +
      `<g id="heterocyst">${g.circle(0, 0, 10.5, 'url(#heterocyst-gradient)', het.outline, 10)}${shine(g, 0, 0, 10.5, het, 0.28)}${[-5.6, 5.6].map((x) => g.circle(x, 0, 2.4, het.outline)).join('')}</g>`)
}
// Spheroid: a solid ball of tumour cells grown in culture, cut through the middle: two rows of living cells at the rim,
// a hypoxic zone under them and a dark necrotic core. (As SiliCoDraw; the cells have a lilac nucleus each. Told from the
// organoid, a ring of large cells round a hollow lumen, by its many small cells and its dark centre.)
{
  const g = page(5.33, [0, 0]), ball = soft(SPHEROID), core = deep(SPHEROID)
  const cells = Array.from({ length: 20 }, (_, i) => { const t = (i / 20) * Math.PI * 2, r = i % 2 ? 33 : 25.5; return [r * Math.cos(t), r * Math.sin(t)] })
  cellType('Spheroid', [['spheroid', ball], ['nucleus', NUC]],
    g.grad('spheroid-gradient', [-42, -42, 42, 42], ball) + boxGrad('cell-gradient', ball, 'light', 'base') + g.grad('core-gradient', [-16, -16, 16, 16], { base: ball.small, shadow: core.base }),
    `<g id="spheroid">${g.circle(0, 0, 42, 'url(#spheroid-gradient)', ball.outline, 12)}</g>\n` +
      `<g id="cells">${cells.map(([x, y]) => g.circle(x, y, 5.8, 'url(#cell-gradient)', ball.outline, 6)).join('')}</g>\n` +
      `<g id="nuclei">${cells.map(([x, y]) => g.circle(x, y, 2.1, NUC.small)).join('')}</g>\n` +
      `<g id="hypoxic-zone">${g.circle(0, 0, 16.5, 'url(#core-gradient)', ball.outline, 8)}</g>\n` +
      `<g id="necrotic-core">${g.circle(0, 0, 8, core.small)}${[[-3, -2.5], [3, 1.5], [-1.5, 4]].map(([x, y]) => g.circle(x, y, 1.6, core.outline)).join('')}</g>\n` +
      `<g id="highlight">${g.hl(-27, -28, 20, 5, -45, ball.light)}</g>`)
}
// Embryoid body: a ball of embryonic stem cells that has begun to form the three germ layers, drawn as SiliCoDraw draws
// it: three concentric layers round a pale blue core, with cells in the outer layer. (Told from the spheroid and the
// organoid by its rings of colour.)
{
  const g = page(6.03, [0, 0]), outer = rich(LAYER_OUT), midL = soft(LAYER_MID), inner = soft(LAYER_IN), core = soft(LAYER_CORE)
  cellType('Embryoid body', [['outer layer', outer], ['middle layer', midL], ['inner layer', inner], ['core', core]],
    g.grad('outer-gradient', [-38, -38, 38, 38], outer) + g.grad('middle-gradient', [-28, -28, 28, 28], midL) + g.grad('inner-gradient', [-18, -18, 18, 18], inner) + g.grad('core-gradient', [-8, -8, 8, 8], core),
    `<g id="outer-layer">${g.circle(0, 0, 37, 'url(#outer-gradient)', outer.outline, 12)}${[0, 60, 120, 180, 240, 300].map((t) => g.circle(...clock(0, 0, 32.4, t + 30), 3, outer.small)).join('')}${g.hl(-23, -24.5, 22, 5.5, -45, outer.light)}</g>\n` +
      `<g id="middle-layer">${g.circle(0, 0, 27, 'url(#middle-gradient)', midL.outline, 9)}</g>\n` +
      `<g id="inner-layer">${g.circle(0, 0, 17.5, 'url(#inner-gradient)', inner.outline, 9)}</g>\n` +
      `<g id="core">${g.circle(0, 0, 8, 'url(#core-gradient)', core.outline, 8)}${shine(g, 0, 0, 8, core, 0.3)}</g>`)
}
// Co-culture: a culture vessel seen from the side, its medium, and two kinds of cell mixed in it. (SiliCoDraw's medium is
// the blue of one kind of cell; here it is a pale aqua with its surface drawn, so that it recolours apart. Each cell has
// a lilac nucleus, where SiliCoDraw's are a darker tone of the cell.)
{
  const g = page(4.85, [0, 7]), dish = grey(DISH), medium = soft(MEDIUM), a = soft(CELL_A), b = soft(CELL_B)
  const vessel = g.D('M-46,-18 L46,-18 L46,22 C46,27.5 41.5,32 36,32 L-36,32 C-41.5,32 -46,27.5 -46,22 Z')
  const liquid = g.D('M-46,-8 L46,-8 L46,22 C46,27.5 41.5,32 36,32 L-36,32 C-41.5,32 -46,27.5 -46,22 Z')
  // The vessel is a grey (chroma below 0.012), which BioSketch leaves out of "Shades follow", so it is not in the check.
  const cells = [[-32, 9, a], [-17, 1.5, b], [-12, 18, b], [4, 5.5, a], [0, 21.5, a], [22, 14, b], [34, 1.5, a]]
  cellType('Co-culture', [['medium', medium], ['cell type 1', a], ['cell type 2', b], ['nucleus', NUC]],
    g.grad('vessel-gradient', [-46, -18, 46, 32], dish) + g.grad('medium-gradient', [-46, -8, 46, 32], medium) + boxGrad('cell-1-gradient', a) + boxGrad('cell-2-gradient', b) + boxGrad('nucleus-gradient', NUC),
    `<g id="vessel-inside">${g.path(vessel, 'url(#vessel-gradient)')}</g>\n` +
      `<g id="medium">${g.path(liquid, 'url(#medium-gradient)')}${g.line([[-46, -8], [46, -8]], medium.outline, 6)}</g>\n` +
      cells.map(([x, y, p], i) => `<g id="cell-${i + 1}">${g.circle(x, y, 6.8, `url(#cell-${p === a ? 1 : 2}-gradient)`, p.outline, 7)}${g.circle(x + 0.6, y + 0.6, 2.8, 'url(#nucleus-gradient)', NUC.outline, 4)}</g>`).join('\n') + '\n' +
      `<g id="vessel">${g.path(vessel, 'none', dish.outline, 12)}${g.hl(-37, -13, 14, 3, 0, dish.light)}</g>`)
}

check()
console.log('written to', OUT)
