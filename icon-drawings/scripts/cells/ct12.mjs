// Eight icons of SiliCoDraw's "Cells & tissues" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md with the kit in ../cellkit.mjs:
// ageing at the level of cells: clonal haematopoiesis, the epigenetic landscape, heterochromatin foci in senescence,
// yeast replicative ageing, progerin and lamin A, insulin resistance, primed microglia and synapse loss. Their shapes are
// read by hand from the source in a 100 × 100 box centred on 0,0 and scaled onto a 512 page, with fewer and bolder parts
// than SiliCoDraw's detailed schemes so that each still reads at 40 px. Nothing is lettered.
// They follow the approved icons: the haematopoietic stem cell yellow, microglia green, neurons peach with blue vesicles
// and green receptors (Synapse), membrane lipids peach (Receptor), a vesicle lilac (Vesicle), every nucleus lilac.
// Usage: node ct12.mjs <folder>
import { BLUE, GREEN, NUC, PEACH, cellTypes, nucGrad, nucleus, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex, toLch } from '../colour.mjs'
import { f } from '../shapes.mjs'

const OUT = process.argv[2]
const { cellType, check } = cellTypes(OUT)

// The hues of the set (OKLCH degrees). The nucleus lilac is about 319°.
const NUCLEUS = toLch(NUC.base).h
const YELLOW = hueOf('#fff3c4') // the approved haematopoietic stem cell
const CLONE = hueOf('#d64545') // SiliCoDraw's red for the mutated clone (25°)
const LANDSCAPE = hueOf('#cfe0c4'), BALL = hueOf('#d9824a')
const SENESCENT = hueOf('#e6e9f2') // SiliCoDraw's grey-blue cell (271°)
const YEAST = hueOf('#f0e3b8'), CHITIN = hueOf('#5b7fc4')
const LAMIN = hueOf('#c0567a') // rose (1°), 42° from the nucleus
const PROTEIN = 265, GLUT = 225, INSULIN = 90, GLUCOSE = 165, VESICLE = hueOf('#e9d5f3'), BLOCK = 10
const LIPID_DROPLET = hueOf('#fde68a'), LYSOSOME = 355, CYTOKINE = 255
const TRANSMITTER = 255, RECEPTOR = 160

/** One gradient that lights every shape that uses it from its own top left (several cells, several vesicles). */
const boxGrad = (id, pal) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`
/** A rounded rectangle given in their units. */
const rect = (g, x, y, w, h, rx, fill, s = '', sw = 0) =>
  `<rect x="${f(g.X(x))}" y="${f(g.Y(y))}" width="${f(w * g.k)}" height="${f(h * g.k)}" rx="${f(rx * g.k)}" fill="${fill}"${s ? ` stroke="${s}" stroke-width="${sw}" stroke-linejoin="round"` : ''}/>`
/** A circle given in their units, as a path on the page (for `g.union`). */
const circleP = (g, x, y, r) => { const [cx, cy] = g.P([x, y]), R = r * g.k; return `M${f(cx - R)},${f(cy)} A${f(R)},${f(R)} 0 1 0 ${f(cx + R)},${f(cy)} A${f(R)},${f(R)} 0 1 0 ${f(cx - R)},${f(cy)} Z` }
/** An open curve given in their units (M, L and C only), drawn as a line with round ends; width in pixels. */
const curve = (g, d, colour, w, extra = '') => `<path d="${g.D(d)}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`
/** A thin tube along an open path in their units: the outline colour, then the fill inside it (widths in pixels). */
const tube = (g, d, outline, fill, w, wall) => curve(g, d, outline, w) + curve(g, d, fill, w - 2 * wall)
/** Points of a cubic Bézier curve (their units). */
const bezier = ([p0, p1, p2, p3], n = 24) => Array.from({ length: n + 1 }, (_, i) => {
  const t = i / n, u = 1 - t
  return [0, 1].map((k) => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k])
})
/** A triangle arrowhead with its tip at `to`, pointing away from `from` (their units); length and width in units. */
const head = (g, from, to, len, wide, fill) => {
  const [x0, y0] = from, [x1, y1] = to, d = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / d, uy = (y1 - y0) / d
  const bx = x1 - ux * len, by = y1 - uy * len
  const pts = [[x1, y1], [bx - (uy * wide) / 2, by + (ux * wide) / 2], [bx + (uy * wide) / 2, by - (ux * wide) / 2]].map(g.P)
  return `<path d="M${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' L')}Z" fill="${fill}" stroke="${fill}" stroke-width="3" stroke-linejoin="round"/>`
}
/** A curved arrow along a cubic Bézier (their units): the line stops under the head, the head points along its end. */
const bentArrow = (g, bz, colour, w, len = 7, wide = 8.5) => {
  const pts = bezier(bz, 40), tip = pts.at(-1)
  const keep = pts.filter((p) => Math.hypot(p[0] - tip[0], p[1] - tip[1]) > len * 0.6)
  const back = pts.find((p) => Math.hypot(p[0] - tip[0], p[1] - tip[1]) <= len) ?? pts.at(-2)
  return g.line(keep, colour, w) + head(g, back, tip, len, wide, colour)
}
/** A tapered process along a cubic Bézier (their units), w0 wide at its start and w1 at its end, as a closed outline. */
const taper = (bz, w0, w1, n = 12) => {
  const pts = bezier(bz, n), left = [], right = []
  pts.forEach(([x, y], i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    const nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l, w = (w0 + ((w1 - w0) * i) / n) / 2
    left.push([x + nx * w, y + ny * w]); right.unshift([x - nx * w, y - ny * w])
  })
  return [...left, ...right]
}
/** A polygon given in their units with its corners rounded (radius in their units), as a path on the page. */
const roundPoly = (g, pts, r) => {
  const n = pts.length, P = pts.map(g.P), R = r * g.k
  const toward = (a, b, d) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), t = Math.min(d, L / 2) / L; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] }
  let d = ''
  for (let i = 0; i < n; i++) {
    const cur = P[i], a = toward(cur, P[(i - 1 + n) % n], R), b = toward(cur, P[(i + 1) % n], R)
    d += `${i ? 'L' : 'M'}${f(a[0])},${f(a[1])} Q${f(cur[0])},${f(cur[1])} ${f(b[0])},${f(b[1])} `
  }
  return d + 'Z'
}
/** A small nucleus with a gradient of its own (the shared lilac). */
const smallNucleus = (g, id, x, y, r, w) => ({
  defs: g.grad(id, [x - r, y - r, x + r, y + r], NUC),
  body: g.circle(x, y, r, `url(#${id})`, NUC.outline, w),
})
/** A palette in the steps of `soft` with no colour: what is gone (the lost synapse). */
const GHOST = toHex({ l: 0.74, c: 0.004, h: 50 })

// Clonal haematopoiesis: a haematopoietic stem cell that carries a mutation (the red burst) gives rise to one large clone
// of blood cells (red) among a few others of other kinds. (The stem cell is the yellow of the approved haematopoietic
// stem cell, where SiliCoDraw's is pale blue; the other cells are its myeloid green and lymphoid blue. Ten cells, not eleven.)
{
  const g = page(4.84, [0.5, -1]), stem = rich(YELLOW), clone = soft(CLONE), mark = deep(CLONE), myeloid = soft(GREEN), lymphoid = soft(BLUE)
  const cones = [[24, -20, 8.5], [39, -7, 8.5], [22, -1, 8.5], [37, 13, 8.5], [21, 19, 8.5], [10, -36, 7], [-6, 32, 7]]
  const others = [[[6, 34, 7], myeloid, 'myeloid'], [[40, 32, 7], lymphoid, 'lymphoid'], [[40, -30, 7], myeloid, 'myeloid']]
  const cellBody = ([x, y, r], id, pal, i) => {
    const n = smallNucleus(g, `${id}-nucleus-${i}`, x + r * 0.12, y + r * 0.1, r * 0.42, 6)
    return { defs: n.defs, body: g.circle(x, y, r, `url(#${id}-gradient)`, pal.outline, 9) + g.hl(x - r * 0.42, y - r * 0.48, f(r * g.k * 0.26), f(r * g.k * 0.1), -45, pal.light) + n.body }
  }
  const clones = cones.map((c, i) => cellBody(c, 'clone', clone, i)), rest = others.map(([c, pal, id], i) => cellBody(c, id, pal, i))
  const burst = [[-24, -30], [-20.5, -25], [-14, -27], [-17, -21], [-11.5, -17], [-18, -16.5], [-17.5, -10.5], [-22, -14.5], [-27, -12], [-25.5, -18], [-31, -21], [-25.5, -23]]
  cellType('Clonal haematopoiesis', [['stem cell', stem], ['nucleus', NUC], ['clone', clone], ['myeloid cell', myeloid], ['lymphoid cell', lymphoid]],
    g.grad('stem-gradient', [-46, -23, -16, 7], stem) + nucGrad(g, -30, -7, 7.5) + boxGrad('clone-gradient', clone) + boxGrad('myeloid-gradient', myeloid) + boxGrad('lymphoid-gradient', lymphoid) +
      clones.map((c) => c.defs).join('') + rest.map((c) => c.defs).join(''),
    `<g id="arrows">${bentArrow(g, [[-15, -13], [-6, -14], [3, -11], [10, -6]], clone.outline, 9)}${bentArrow(g, [[-18, 5], [-12, 13], [-4, 18], [6, 18]], clone.outline, 9)}</g>\n` +
      `<g id="stem-cell">${g.circle(-31, -8, 15, 'url(#stem-gradient)', stem.outline, 12)}${g.hl(-39, -15.5, 11, 4.5, -45, stem.light)}</g>\n` +
      nucleus(g, -30, -7, 7.5, 9) + '\n' +
      `<g id="mutation">${g.path(roundPoly(g, burst, 0.8), mark.base, mark.outline, 6)}</g>\n` +
      `<g id="clone">${clones.map((c) => c.body).join('')}</g>\n` +
      `<g id="other-blood-cells">${rest.map((c) => c.body).join('')}</g>`)
}

// Epigenetic landscape (Waddington): a slab sloping down from the upper left, its groove splitting into three valleys
// (fates); a ball (a cell) waits at the high end, two have rolled down into valleys. Three troughs and two crests where
// SiliCoDraw draws four crest lines, so that the valleys still show at 40 px.
{
  const g = page(4.86, [0.5, -0.2]), land = soft(LANDSCAPE), ball = rich(BALL)
  const top = 'M-44,-24C-40,-32 -36,-36 -30,-38C-4,-32 26,-20 47,-8C44,6 40,20 35,34C10,30 -20,4 -46,-12C-46,-17 -45,-21 -44,-24Z'
  const near = 'M-46,-12C-20,4 10,30 35,34L35,43C10,39 -20,13 -46,-3Z', end = 'M35,34C40,20 44,6 47,-8L47,1C44,15 40,29 35,43Z'
  const valleys = ['M-33,-29C-23,-23 -14,-16 -4,-10C10,-8 26,-6 40,-5', 'M-4,-10C10,-2 22,6 36,11', 'M-4,-10C6,2 16,14 29,22']
  const crests = ['M5,-3.5C13,-1.5 21,1 29,2.5', 'M1,1.5C7,7 13,11 20,14.5']
  cellType('Epigenetic landscape', [['landscape', land], ['cells', ball]],
    g.grad('top-gradient', [-46, -38, 47, 34], land) + g.grad('ball-gradient', [-42, -42, -26, -26], ball) + boxGrad('settled-gradient', { base: ball.shadow, shadow: ball.small }),
    `<g id="landscape">${g.path(g.D(near), land.small, land.outline, 10)}${g.path(g.D(end), land.shadow, land.outline, 10)}${g.path(g.D(top), 'url(#top-gradient)', land.outline, 10)}` +
      `${valleys.map((d) => curve(g, d, land.small, 8 * g.k)).join('')}${valleys.map((d) => curve(g, d, land.outline, 8)).join('')}${crests.map((d) => curve(g, d, land.light, 9)).join('')}` +
      `${g.hl(-31, -32.5, 16, 4.5, 14, land.light)}</g>\n` +
      `<g id="cells">${g.circle(-34, -35, 8.5, 'url(#ball-gradient)', ball.outline, 10)}${g.hl(-37.2, -38.4, 11, 4.5, -45, ball.light)}` +
      `${[[36, 7.5], [29, 18.5]].map(([x, y]) => g.circle(x, y, 5.2, 'url(#settled-gradient)', ball.outline, 8)).join('')}</g>`)
}
// Heterochromatin foci in senescence (SAHF): a large, flat senescent cell whose nucleus holds bright, dot-like foci of
// condensed chromatin. (SiliCoDraw shows the nucleus as a DAPI stain, dark blue with pale dots; here it is the lilac
// of every nucleus with the foci in its deeper tone, as chromatin is drawn in the set. Fifteen larger foci, not twenty.)
{
  const g = page(4.82, [0, 0]), cyto = soft(SENESCENT), chrom = deep(NUCLEUS)
  const jitter = (i) => [Math.sin(i * 12.9898) * 1.6, Math.cos(i * 78.233) * 1.4, 3.9 + ((i * 7) % 5) * 0.22]
  const foci = []
  for (let j = -2; j <= 2; j++)
    for (let i = -3; i <= 3; i++) {
      const x = 1 + i * 11.5 + (j % 2 ? 5.75 : 0), y = 1 + j * 9.5
      if (((x - 1) / 25.5) ** 2 + ((y - 1) / 19.5) ** 2 > 1) continue
      const [dx, dy, r] = jitter(foci.length + 1)
      foci.push([x + dx, y + dy, r])
    }
  cellType('Heterochromatin foci in senescence', [['cytoplasm', cyto], ['nucleus', NUC]],
    g.grad('cell-gradient', [-47, -38, 47, 38], cyto) + g.grad('nucleus-gradient', [-32, -26, 34, 28], NUC),
    `<g id="cytoplasm">${g.path(g.smooth([[-47, 4], [-42, -18], [-24, -34], [2, -38], [26, -32], [44, -16], [47, 4], [40, 24], [20, 36], [-6, 38], [-30, 32], [-44, 20]]), 'url(#cell-gradient)', cyto.outline, 12)}${g.hl(-28, -26, 17, 5.5, -32, cyto.light)}</g>\n` +
      `<g id="nucleus">${g.ellipse(1, 1, 33, 27, 0, 'url(#nucleus-gradient)', NUC.outline, 10)}${g.hl(-17, -15.5, 15, 5, -34, NUC.light)}</g>\n` +
      `<g id="foci">${foci.map(([x, y, r]) => g.circle(x, y, r, chrom.shadow)).join('')}</g>`)
}
// Yeast replicative ageing: a budding yeast mother cell with a daughter bud at its neck; every bud it has made has left a
// ring of chitin on its wall (bud scars), so their number counts its age. The daughter has none. The vacuole inside.
{
  const g = page(4.98, [0, -0.4]), yeast = rich(YEAST), scar = soft(CHITIN)
  const mother = g.smooth([[-44, 6], [-40, -14], [-26, -30], [-6, -36], [14, -30], [26, -16], [30, 2], [25, 22], [10, 36], [-12, 40], [-32, 32], [-42, 20]])
  const scars = [[-31, -4, 3.8, 6.8, 8], [-20, 22, 6.6, 4.8, -30], [4, -22, 6.2, 4.6, 10], [12, 18, 6.4, 5, 40], [-13, -25, 5.8, 4, -8], [19, -2, 4.2, 6.4, 4], [-35, 15, 3.6, 5.8, -26]]
  cellType('Yeast replicative ageing', [['cell', yeast], ['bud scars', scar]],
    g.grad('cell-gradient', [-44, -41, 44, 40], yeast),
    `<g id="cell">${g.union([mother, circleP(g, 29, -26, 15)], 'url(#cell-gradient)', yeast.outline, 11)}${g.hl(-25, -16, 18, 7, -38, yeast.light)}${g.hl(25, -34.5, 9, 3.5, -25, yeast.light)}</g>\n` +
      `<g id="vacuole">${g.circle(-6, 8, 9.5, yeast.shadow)}</g>\n` +
      `<g id="bud-scars">${scars.map(([x, y, rx, ry, rot]) => g.ellipse(x, y, rx, ry, rot, scar.base, scar.outline, 7) + g.ellipse(x, y, rx * 0.42, ry * 0.42, rot, scar.small)).join('')}</g>`)
}
// Progerin and lamin A: the misshapen nucleus of progeria: lobed, its envelope folded inwards, its lamina (rose) thickened
// by progerin, and a bleb at the upper right where the lamina is missing and loose chromatin has spilled in. The lamina is
// in the fuller rose of `deep`: in the soft rose it ran into the lilac of the nucleus at 40 px.
{
  const cx = -4, cy = 4
  const bump = (t, c, w) => Math.exp(-((Math.atan2(Math.sin(t - c), Math.cos(t - c)) / w) ** 2))
  const r = (t) => 35 + 2 * Math.sin(3 * t + 0.7) + 1.4 * Math.cos(5 * t + 1.2) - 10 * bump(t, 2.5, 0.2) - 7 * bump(t, 1.1, 0.2) - 5 * bump(t, -2.2, 0.24)
  const at = (t, k) => [cx + 1.12 * (r(t) - k) * Math.cos(t), cy + (r(t) - k) * Math.sin(t)]
  const g = page(5.7, [-2, 1.6]), lamin = deep(LAMIN), dark = deep(NUCLEUS)
  const outline = Array.from({ length: 48 }, (_, i) => at((i / 48) * 2 * Math.PI, 0))
  const ba = -0.78, bx = cx + 1.12 * (r(ba) + 5) * Math.cos(ba), by = cy + (r(ba) + 5) * Math.sin(ba), br = 11
  const lamina = []; for (let d = -30; d <= 296; d += 3) lamina.push(at((d * Math.PI) / 180, 4.4))
  const clumps = [[-20, -8, 2.9], [-9, -16, 2.6], [4, -13, 2.4], [-23, 8, 2.6], [-12, 21, 2.8], [6, 23, 2.4], [-13, 2, 2.3], [15, -2, 2.6], [-3, -4, 2]]
  cellType('Progerin and lamin A', [['nucleus', NUC], ['lamina', lamin]],
    g.grad('nucleus-gradient', [-45, -33, 39, 41], NUC) + g.grad('nucleolus-gradient', [-5, 4, 9, 16], { base: dark.base, shadow: dark.shadow }),
    `<g id="nucleus">${g.circle(bx, by, br, 'url(#nucleus-gradient)', NUC.outline, 10)}${g.path(g.smooth(outline), 'url(#nucleus-gradient)', NUC.outline, 10)}${g.circle(bx, by, br - 5 / g.k, 'url(#nucleus-gradient)')}` +
      `${g.hl(-27, -12, 17, 5, -40, NUC.light)}</g>\n` +
      `<g id="lamina">${g.line(lamina, lamin.outline, 26)}${g.line(lamina, lamin.base, 14)}</g>\n` +
      `<g id="chromatin">${[...clumps, [bx - 2.5, by + 1.5, 2.3], [bx + 3, by - 3, 1.9], [bx + 2.5, by + 4.5, 1.7]].map(([x, y, q]) => g.circle(x, y, q, NUC.small)).join('')}</g>\n` +
      `<g id="nucleolus">${g.ellipse(2, 10, 7, 5.5, 0, 'url(#nucleolus-gradient)', NUC.outline, 7)}</g>`)
}
// Insulin resistance: insulin sits in its receptor, but the signal to the GLUT4 vesicle is blocked (the red cross), so the
// glucose transporters stay inside the cell and glucose stays outside. (Insulin is amber moved to 90°, away from the peach
// lipids; the receptor is the blue of membrane proteins, GLUT4 a bluer cerulean, glucose the green of small molecules.)
{
  const g = page(4.52, [0, 0.4]), receptor = soft(PROTEIN), insulin = rich(INSULIN), glucose = soft(GLUCOSE), glut = soft(GLUT), vesicle = soft(VESICLE), block = deep(BLOCK), lipid = soft(PEACH)
  const mid = 4, HEAD = 3.4, ROW = 7.6, TAIL = 1.35
  const xs = [-46, -38, 6, 14, 22, 30, 38, 46]
  const alpha = [[-18, -36], [-27, -38], [-34, -30], [-34, -16], [-26, -6], [-18, -2], [-16, -8], [-24, -14], [-26, -24], [-20, -29], [-18, -29]]
  const mirror = alpha.map(([x, y]) => [-36 - x, y]).reverse()
  const hex = (x, y, q) => Array.from({ length: 6 }, (_, i) => { const a = ((30 + i * 60) * Math.PI) / 180; return [x + q * Math.cos(a), y + q * Math.sin(a)] })
  const transporters = [[30, 18], [19, 34], [40.5, 37]]
  cellType('Insulin resistance', [['membrane', lipid], ['receptor', receptor], ['insulin', insulin], ['blocked signal', block], ['vesicle', vesicle], ['GLUT4', glut], ['glucose', glucose]],
    boxGrad('lipid-gradient', lipid) + g.grad('receptor-gradient', [-34, -38, -2, 29], receptor) + g.grad('insulin-gradient', [-25, -28, -9, -15], insulin) + g.grad('lumen-gradient', [21, 21, 39, 39], vesicle) + boxGrad('glucose-gradient', glucose),
    `<g id="membrane"><g id="membrane-core">${g.path(`M${f(g.X(-50))},${f(g.Y(mid - ROW))} H${f(g.X(50))} V${f(g.Y(mid + ROW))} H${f(g.X(-50))} Z`, lipid.base)}</g>` +
      `<g id="lipid-tails">${xs.flatMap((x) => [-TAIL, TAIL].flatMap((dx) => [-1, 1].map((s) => g.line([[x + dx, mid + s * (ROW - 2.6)], [x + dx, mid + s * 1]], lipid.outline, 4)))).join('')}</g>` +
      `<g id="lipid-heads">${xs.flatMap((x) => [-1, 1].map((s) => g.circle(x, mid + s * ROW, HEAD, 'url(#lipid-gradient)', lipid.outline, 5))).join('')}</g></g>\n` +
      `<g id="receptor">${rect(g, -21, -7, 6, 25, 2, 'url(#receptor-gradient)', receptor.outline, 8)}${[-34, -18].map((x) => rect(g, x, 16.5, 16, 13, 4, 'url(#receptor-gradient)', receptor.outline, 8)).join('')}` +
      `${[alpha, mirror].map((p) => g.path(g.smooth(p), 'url(#receptor-gradient)', receptor.outline, 8)).join('')}${g.hl(-29.5, -29, 7, 2.6, -62, receptor.light)}</g>\n` +
      `<g id="insulin">${g.path(g.smooth([[-25, -22], [-20, -28], [-13, -27], [-9, -21], [-13, -15], [-21, -15]]), 'url(#insulin-gradient)', insulin.outline, 7)}${g.hl(-18.5, -23.5, 9, 3, -10, insulin.light)}</g>\n` +
      `<g id="blocked-signal">${curve(g, 'M0,24C6,25 11,26.5 16,28', receptor.outline, 7, ' stroke-dasharray="0.1 14"')}${g.line([[3, 17.5], [11.5, 26]], block.small, 10)}${g.line([[11.5, 17.5], [3, 26]], block.small, 10)}</g>\n` +
      `<g id="vesicle">${g.circle(30, 30, 12, vesicle.light, vesicle.outline, 10)}${g.circle(30, 30, 8.6, 'url(#lumen-gradient)', vesicle.small, 5)}</g>\n` +
      `<g id="GLUT4">${transporters.map(([x, y]) => g.ellipse(x, y, 3.3, 4.6, (Math.atan2(y - 30, x - 30) * 180) / Math.PI + 90, glut.small, glut.outline, 5)).join('')}</g>\n` +
      `<g id="glucose">${[[18, -26], [32, -36], [36, -18]].map(([x, y]) => g.path(roundPoly(g, hex(x, y, 6), 1), 'url(#glucose-gradient)', glucose.outline, 6)).join('')}</g>`)
}
// Primed microglia: the microglia of an ageing brain: a swollen body with short, thick processes, holding lipid droplets
// (yellow) and lysosomes (rose), and giving off cytokines (blue). (The green of the approved microglia, where SiliCoDraw's
// is lilac like the nucleus; the processes are its six, each with one branch.)
{
  const g = page(5.3, [0, -1.5]), micro = soft(GREEN), lipid = rich(LIPID_DROPLET), lyso = soft(LYSOSOME), cytokine = soft(CYTOKINE)
  const arms = [[-125, 38, 7], [-62, 40, -7], [-5, 41, 8], [52, 38, -7], [112, 40, 7], [178, 41, -8]].flatMap(([deg, L, k], j) => {
    const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), nx = -s, ny = c
    const main = taper([[c * 12, s * 12], [c * 22 + nx * k * 0.5, s * 22 + ny * k * 0.5], [c * (L - 9) + nx * k, s * (L - 9) + ny * k], [c * L + nx * k * 0.6, s * L + ny * k * 0.6]], 14, 5)
    const b = a + (j % 2 ? 0.75 : -0.75), bx = c * (L * 0.62) + nx * k * 0.85, by = s * (L * 0.62) + ny * k * 0.85
    const branch = taper([[bx, by], [bx + Math.cos(b) * 4, by + Math.sin(b) * 4], [bx + Math.cos(b) * 8, by + Math.sin(b) * 8], [bx + Math.cos(b) * 12.5, by + Math.sin(b) * 12.5]], 7.5, 4.5, 8)
    return [main, branch]
  })
  const soma = [[-22, -3], [-17, -16], [-4, -22], [11, -20], [21, -9], [22, 6], [13, 19], [-3, 22], [-17, 15]]
  cellType('Primed microglia', [['cell', micro], ['nucleus', NUC], ['lipid droplets', lipid], ['lysosomes', lyso], ['cytokines', cytokine]],
    g.grad('cell-gradient', [-46, -40, 46, 42], micro) + g.grad('nucleus-gradient', [-14.5, -4.5, 6.5, 10.5], NUC),
    `<g id="cell">${g.union([...arms, soma].map((p) => g.smooth(p)), 'url(#cell-gradient)', micro.outline, 7)}${g.hl(-11, -14, 9, 3.5, -35, micro.light)}</g>\n` +
      `<g id="nucleus">${g.ellipse(-4, 3, 10.5, 7.5, -20, 'url(#nucleus-gradient)', NUC.outline, 8)}${g.hl(-8.5, -0.5, 9, 3, -30, NUC.light)}</g>\n` +
      `<g id="lipid-droplets">${[[10.5, -9.5, 4.6], [12, 9, 4], [-1, -14, 3.4]].map(([x, y, q]) => g.circle(x, y, q, lipid.shadow, lipid.outline, 5)).join('')}</g>\n` +
      `<g id="lysosomes">${[[-13, 12.5], [3, 15.5], [18.5, 0], [-12, -9]].map(([x, y]) => g.circle(x, y, 2.5, lyso.small)).join('')}</g>\n` +
      `<g id="cytokines">${[[33, -30], [40.5, -21], [-38, 30]].map(([x, y]) => g.circle(x, y, 3, cytokine.small)).join('')}</g>`)
}
// Synapse loss: a dendrite with two spines, each under an axon terminal full of vesicles (blue), with the receptors of the
// spine (green) across the cleft, and a third synapse that is gone: its terminal and spine head are dashed ghosts and its
// spine a stub. The colours of the approved Synapse.
{
  const g = page(4.62, [0, -8.6]), neuron = soft(PEACH), tx = soft(TRANSMITTER), rec = soft(RECEPTOR)
  const dendrite = 'M-48,26C-48,20 -44,18 -38,18C-14,19 14,17 38,18C44,18 48,20 48,27C48,34 44,38 38,38C14,37 -14,39 -38,38C-44,38 -48,34 -48,26Z'
  const neck = (x) => g.D(`M${x - 3},19C${x - 2},12 ${x - 3},8 ${x - 2},3L${x + 2},3C${x + 3},8 ${x + 2},12 ${x + 3},19Z`)
  const headP = (x) => { const [cx, cy] = g.P([x, -1]), rx = 9 * g.k, ry = 7 * g.k; return `M${f(cx - rx)},${f(cy)} A${f(rx)},${f(ry)} 0 1 0 ${f(cx + rx)},${f(cy)} A${f(rx)},${f(ry)} 0 1 0 ${f(cx - rx)},${f(cy)} Z` }
  const stub = g.D('M25.5,19C25.5,14 27,11.5 30,11.5C33,11.5 34.5,14 34.5,19Z')
  const boutons = [-30, -2], ring = Array.from({ length: 5 }, (_, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; return [Math.cos(a) * 5.3, Math.sin(a) * 5.3] })
  const dash = ' stroke-dasharray="10 11"'
  cellType('Synapse loss', [['neurons', neuron], ['vesicles', tx], ['receptors', rec]],
    g.grad('dendrite-gradient', [-48, -10, 48, 38], neuron) + g.grad('axon-gradient', [-42, -50, 10, -16], neuron),
    `<g id="dendrite">${g.union([g.D(dendrite), ...boutons.flatMap((x) => [neck(x), headP(x)]), stub], 'url(#dendrite-gradient)', neuron.outline, 10)}${g.hl(-34, 22.5, 20, 4, -2, neuron.light)}</g>\n` +
      `<g id="receptors">${boutons.map((x) => tube(g, `M${x - 6},-7C${x - 3},-9 ${x + 3},-9 ${x + 6},-7`, rec.outline, rec.small, 15, 4)).join('')}</g>\n` +
      `<g id="axon-terminals">${g.union(boutons.flatMap((x) => [{ d: g.D(`M${x},-52L${x},-36`), width: f(7 * g.k) }, circleP(g, x, -28, 11)]), 'url(#axon-gradient)', neuron.outline, 10)}${boutons.map((x) => g.hl(x - 5, -33.5, 7, 2.8, -45, neuron.light)).join('')}</g>\n` +
      `<g id="vesicles">${boutons.map((x) => ring.map(([dx, dy]) => g.circle(x + dx, -28 + dy, 2.5, tx.small, tx.outline, 5)).join('')).join('')}</g>\n` +
      `<g id="lost-synapse">${curve(g, 'M30,-52L30,-43', GHOST, 7, dash)}${g.circle(30, -28, 12, 'none', GHOST, 7).replace('/>', `${dash} stroke-linecap="round"/>`)}` +
      `${g.ellipse(30, -1, 9, 7, 0, 'none', GHOST, 7).replace('/>', `${dash} stroke-linecap="round"/>`)}${curve(g, 'M30,7L30,10', GHOST, 7)}</g>`)
}

check()
console.log('written to', OUT)
