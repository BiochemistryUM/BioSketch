// Eight icons of SiliCoDraw's "Cells & tissues" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md with the kit in ../cellkit.mjs:
// development (cleavage, gastrulation, neural tube, somites, limb bud), cancer (tumour microenvironment, clonal
// evolution) and the second messenger. Their shapes are read by hand from the source in a 100 × 100 box centred on 0,0
// and scaled onto a 512 page. Nothing is lettered: where SiliCoDraw writes a label, a shape or a colour says the same.
// Cleavage is drawn like the embryo stages of embryo.mjs (zona, peach blastomeres); the germ layers take their textbook
// colours (ectoderm blue, mesoderm rose, endoderm yellow); the tumour microenvironment is made of the approved cancer
// cell, T cell, macrophage and fibroblast of ../silicodraw.mjs; the second messenger sits in the membrane of ct02.mjs.
// Usage: node ct09.mjs <folder>
import { BLUE, GREEN, NUC, PEACH, cellTypes, circleD, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex } from '../colour.mjs'
import { f } from '../shapes.mjs'

const OUT = process.argv[2]
const { cellType, check } = cellTypes(OUT)

// The hues of the set (OKLCH degrees). The nucleus lilac is about 319°.
const ECTODERM = BLUE, MESODERM = 15, ENDODERM = hueOf('#fde68a') // blue 245°, rose 15°, yellow 96°
const TUMOUR = 10 // the approved cancer cell is 25°; moved 15° so that it stays 36° from the peach stroma (52°)
const PROTEIN = hueOf('#4f6bb8'), MESSENGER = 165, EFFECTOR = 100

/** One gradient that lights every shape that uses it from its own top left (several cells, nuclei, beads). */
const boxGrad = (id, pal) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`
/** A rounded rectangle given in their units, as a path on the page. */
const rrect = (g, x, y, w, h, r) => {
  const [x0, y0] = g.P([x, y]), W = w * g.k, H = h * g.k, R = Math.min(r * g.k, W / 2, H / 2)
  return `M${f(x0 + R)},${f(y0)} H${f(x0 + W - R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + W)},${f(y0 + R)} V${f(y0 + H - R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + W - R)},${f(y0 + H)} H${f(x0 + R)} A${f(R)},${f(R)} 0 0 1 ${f(x0)},${f(y0 + H - R)} V${f(y0 + R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + R)},${f(y0)} Z`
}
/** A rectangle given in their units, as a path on the page. */
const rect = (g, x0, y0, x1, y1) => `M${f(g.X(x0))},${f(g.Y(y0))} H${f(g.X(x1))} V${f(g.Y(y1))} H${f(g.X(x0))} Z`
/** An open curve given in their units (M, L and C only), drawn as a line with round ends; width in pixels. */
const curve = (g, d, colour, w) => `<path d="${g.D(d)}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"/>`
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
/** A ring between two radii, as one path to fill (even-odd). */
const ringD = (g, x, y, r0, r1) => `${circleD(g, x, y, r1)} ${circleD(g, x, y, r0)}`
/** A path in their units (absolute M, L, C only) scaled by s, turned by `deg` and moved to `at`, still in their units. */
const placeD = (d, s, deg, [tx, ty]) => d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, x, y) => placeP([+x, +y], s, deg, [tx, ty]).map(f).join(','))
const placeP = ([x, y], s, deg, [tx, ty]) => { const a = (deg * Math.PI) / 180; return [tx + s * (x * Math.cos(a) - y * Math.sin(a)), ty + s * (x * Math.sin(a) + y * Math.cos(a))] }
/** A point on a cubic Bézier curve given by its four points. */
const bez = ([p0, p1, p2, p3], t) => [0, 1].map((i) => (1 - t) ** 3 * p0[i] + 3 * (1 - t) ** 2 * t * p1[i] + 3 * (1 - t) * t ** 2 * p2[i] + t ** 3 * p3[i])
/** A closed path through points in their units (straight segments, drawn finely enough to look smooth). */
const polyD = (g, pts) => `M${pts.map(g.P).map(([x, y]) => `${f(x)},${f(y)}`).join(' L')}Z`

// ---------- Cleavage ----------
// The first divisions of the embryo inside its zona pellucida: two, four and eight blastomeres, the zona no larger at each
// step, so the cells get smaller. Drawn as the approved zygote and morula (embryo.mjs): a pale blue zona, the
// perivitelline space inside it, peach blastomeres, lilac nuclei.
// (Corrected: SiliCoDraw's two-cell stage is one disc cut in half and its four and eight cells reach out past the zona;
// here they are round cells that fit inside it. The zona is a ring, not a dashed line.)
{
  const g = page(5.03, [0, 1]), blasto = soft(PEACH), zona = soft(235)
  const Z = 22, ZI = 18.4
  const stages = [
    { at: [-23, -19], cells: [[-8.3, 0, 8.7], [8.3, 0, 8.7]], nuc: 3.4, w: 8 },
    { at: [23, -19], cells: [[-6.9, -6.9, 7.3], [6.9, -6.9, 7.3], [-6.9, 6.9, 7.3], [6.9, 6.9, 7.3]], nuc: 2.9, w: 7 },
    { at: [0, 21], cells: [[0, -11.2, 6.2], [11.2, 0, 6.2], [0, 11.2, 6.2], [-11.2, 0, 6.2], [-6.5, -6.5, 6.6], [6.5, -6.5, 6.6], [-6.5, 6.5, 6.6], [6.5, 6.5, 6.6]], nuc: 2.4, w: 6, front: 4 },
  ]
  const embryo = ({ at: [cx, cy], cells, nuc, w, front = 0 }, i) =>
    `<g id="${['two', 'four', 'eight'][i]}-cell-stage">` +
    `<g id="perivitelline-space-${i + 1}">${g.circle(cx, cy, ZI, zona.light)}</g>` +
    `<g id="blastomeres-${i + 1}">${cells.map(([x, y, r], j) => g.circle(cx + x, cy + y, r, 'url(#blastomere-gradient)', blasto.outline, w) + (j >= front ? g.circle(cx + x + 0.3, cy + y + 0.3, nuc, 'url(#nucleus-gradient)', NUC.outline, 5) : '')).join('')}` +
    `${g.hl(cx + cells[0][0] - cells[0][2] * 0.4, cy + cells[0][1] - cells[0][2] * 0.45, f(cells[0][2] * g.k * 0.26), f(cells[0][2] * g.k * 0.1), -45, blasto.light)}</g>` +
    `<g id="zona-pellucida-${i + 1}"><path d="${ringD(g, cx, cy, ZI, Z)}" fill="url(#zona-gradient)" fill-rule="evenodd" stroke="${zona.outline}" stroke-width="6" stroke-linejoin="round"/>${g.hl(cx - 14.6, cy - 14.6, 13, 3.4, -45, zona.light)}</g></g>`
  cellType('Cleavage', [['blastomeres', blasto], ['zona pellucida', zona], ['nuclei', NUC]],
    boxGrad('blastomere-gradient', blasto) + boxGrad('zona-gradient', zona) + boxGrad('nucleus-gradient', NUC),
    stages.map(embryo).join('\n'))
}

// ---------- Gastrulation ----------
// The embryo (ectoderm, blue) with the mesoderm (rose) and the endoderm (yellow) moving in at its lower side, the arrow
// showing the way. (SiliCoDraw writes "ectoderm", "meso" and "endo"; the textbook colours of the three layers say it
// here. Its mesoderm is yellow and its endoderm pink; they are swapped to rose and yellow. The two layers end at the
// edge of the embryo instead of running past it.)
{
  const g = page(5.09, [0, 0]), ecto = soft(ECTODERM), meso = soft(MESODERM), endo = rich(ENDODERM), R = 44
  // A dome rising from the bottom of the embryo: SiliCoDraw's curve, cut off where it meets the embryo's edge.
  const dome = (w, top) => {
    const h = (top - 0.25 * R) / 0.75, pts = Array.from({ length: 121 }, (_, i) => bez([[-w, R], [-w, h], [w, h], [w, R]], i / 120)).filter(([x, y]) => Math.hypot(x, y) <= R - 0.5)
    const [a, b] = [pts[0], pts.at(-1)].map(g.P), r = f(R * g.k)
    return `M${pts.map(g.P).map(([x, y]) => `${f(x)},${f(y)}`).join(' L')} A${r},${r} 0 0 1 ${f(a[0])},${f(a[1])} Z`
  }
  cellType('Gastrulation', [['ectoderm', ecto], ['mesoderm', meso], ['endoderm', endo]],
    g.grad('ectoderm-gradient', [-R, -R, R, R], ecto) + g.grad('mesoderm-gradient', [-28, 0, 28, 44], meso) + g.grad('endoderm-gradient', [-18, 14, 18, 44], endo),
    `<g id="ectoderm">${g.circle(0, 0, R, 'url(#ectoderm-gradient)')}${g.hl(-30.5, -30.5, 26, 7, -45, ecto.light)}</g>\n` +
      `<g id="blastocoel">${g.circle(0, 0, 33, ecto.light, ecto.outline, 6)}</g>\n` +
      `<g id="mesoderm">${g.path(dome(30, -1), 'url(#mesoderm-gradient)', meso.outline, 10)}</g>\n` +
      `<g id="endoderm">${g.path(dome(18, 15), 'url(#endoderm-gradient)', endo.outline, 10)}</g>\n` +
      `<g id="arrow">${arrow(g, [0, 39], [0, 20], endo.outline, 11, 8, 11)}</g>\n` +
      `<g id="ectoderm-outline">${g.circle(0, 0, R, 'none', ecto.outline, 12)}</g>`)
}

// ---------- Neural tube ----------
// A cross-section of the embryo after neurulation: the neural tube with its canal lies under the surface ectoderm, the
// notochord under it, a somite on each side, all in the mesoderm; the endoderm lines the floor.
// (Corrected: SiliCoDraw's neural tube breaks through the surface; here it lies under it. Textbook colours of the germ
// layers: the neural tube and surface are ectoderm (blue), notochord and somites mesoderm (rose), where SiliCoDraw has a
// pink tube, a blue notochord and green somites. The endoderm is added along the floor.)
{
  const g = page(4.66, [0, 8.75]), ecto = soft(ECTODERM), meso = soft(MESODERM), endo = rich(ENDODERM)
  cellType('Neural tube', [['ectoderm', ecto], ['mesoderm', meso], ['endoderm', endo]],
    g.grad('mesoderm-gradient', [-48, -22, 48, 40], meso) + g.grad('ectoderm-gradient', [-48, -24, 48, -6], ecto) + g.grad('tube-gradient', [-13, -14, 13, 12], ecto) + boxGrad('somite-gradient', { base: meso.shadow, shadow: meso.small }) + g.grad('endoderm-gradient', [-48, 31, 48, 40], endo),
    `<g id="mesoderm">${g.path(g.D('M-48,-9 C-30,-23 30,-23 48,-9 L48,40 L-48,40 Z'), 'url(#mesoderm-gradient)', meso.outline, 12)}</g>\n` +
      `<g id="endoderm">${g.path(g.D('M-48,31 C-20,35.5 20,35.5 48,31 L48,40 L-48,40 Z'), 'url(#endoderm-gradient)', endo.outline, 10)}</g>\n` +
      `<g id="somites">${[-1, 1].map((s) => g.ellipse(s * 30, 7, 11, 12.5, 0, 'url(#somite-gradient)', meso.outline, 9)).join('')}</g>\n` +
      `<g id="notochord">${g.circle(0, 20, 6, 'url(#somite-gradient)', meso.outline, 8)}</g>\n` +
      `<g id="surface-ectoderm">${g.path(g.D('M-48,-12 C-30,-26 30,-26 48,-12 L48,-5 C30,-19 -30,-19 -48,-5 Z'), 'url(#ectoderm-gradient)', ecto.outline, 10)}${g.hl(-30, -17.6, 22, 5, -17, ecto.light)}</g>\n` +
      `<g id="neural-tube">${g.circle(0, -0.5, 13, 'url(#tube-gradient)', ecto.outline, 10)}${g.ellipse(0, -0.5, 2.6, 6.4, 0, ecto.light, ecto.outline, 6)}${g.hl(-6.6, -7, 9, 3.4, -45, ecto.light)}</g>`)
}

// ---------- Somites ----------
// The embryo's axis seen from above, the neural tube along the middle, pairs of somites on each side, and at the tail
// the presomitic mesoderm, not yet cut into somites. (SiliCoDraw draws the unsegmented tissue as dashed lines; here it is
// a pale band of the somites' rose that tapers to the tail.)
{
  const g = page(4.79, [0, 0]), axis = soft(ECTODERM), meso = soft(MESODERM)
  const psm = (s) => g.D(`M${s * 30},30 L${s * 8},30 L${s * 8},46.5 C${s * 18},46.5 ${s * 28},41 ${s * 30},30 Z`)
  cellType('Somites', [['neural tube', axis], ['somites', meso]],
    g.grad('axis-gradient', [-5, -47, 5, 47], axis) + boxGrad('somite-gradient', meso),
    `<g id="neural-tube">${g.path(rrect(g, -5, -47, 10, 94, 5), 'url(#axis-gradient)', axis.outline, 9)}${g.line([[0, -40], [0, 40]], axis.light, 8)}</g>\n` +
      `<g id="presomitic-mesoderm">${[-1, 1].map((s) => g.path(psm(s), meso.base, meso.outline, 7)).join('')}</g>\n` +
      `<g id="somites">${[-40, -26, -12, 2, 16].map((y) => [-30, 8].map((x) => g.path(rrect(g, x, y, 22, 11, 4), 'url(#somite-gradient)', meso.outline, 9)).join('') + g.hl(-24, y + 3, 10, 3, -6, meso.light)).join('')}</g>`)
}

// ---------- Limb bud ----------
// A limb bud growing out of the flank of the embryo: the apical ectodermal ridge along its tip and the zone of
// polarising activity at its posterior side. (SiliCoDraw writes "AER" and "ZPA"; the coloured ridge and patch stay
// without the letters. The bud and the flank share one outline, so the bud grows out of the body.)
{
  const g = page(4.6, [-2.4, 0]), body = soft(PEACH), aer = deep(12), zpa = soft(PROTEIN)
  cellType('Limb bud', [['embryo', body], ['ridge (AER)', aer], ['polarising zone (ZPA)', zpa]],
    g.grad('limb-gradient', [-50, -30, 44, 30], body),
    `<g id="embryo">${g.union([rrect(g, -50, -30, 30, 60, 6), g.D('M-22,-18 C10,-24 40,-14 44,0 C40,14 10,24 -22,18 Z')], 'url(#limb-gradient)', body.outline, 12)}` +
      `${g.hl(-41, -20, 22, 7, -60, body.light)}${g.hl(4, -11, 26, 6, -10, body.light)}</g>\n` +
      `<g id="zone-of-polarising-activity">${g.ellipse(-3, 12, 9, 4.6, -8, zpa.small)}</g>\n` +
      `<g id="apical-ectodermal-ridge">${curve(g, 'M37,-9.5 C46.5,-5 46.5,5 37,9.5', aer.outline, 30)}${curve(g, 'M37,-9.5 C46.5,-5 46.5,5 37,9.5', aer.small, 16)}</g>`)
}

// ---------- Tumour microenvironment ----------
// A cluster of tumour cells in the stroma, with the cells round it: a fibroblast, a macrophage and two T cells, each the
// approved cell type made smaller. (SiliCoDraw has eight small round cells, two fibroblast lines and two vessel lines;
// here fewer, larger cells, and the vessels are left out: their rose would run into the tumour's. The tumour cells are
// the approved cancer cell, moved from 25° to 10° to stay clear of the peach stroma.)
{
  const g = page(5.05, [0, 0]), stroma = soft(PEACH), tumour = soft(TUMOUR), tcell = soft(BLUE), macro = soft(GREEN)
  const lumpy = ([cx, cy], s, turnBy = 0) => Array.from({ length: 16 }, (_, i) => { const t = (i / 16) * Math.PI * 2 + turnBy, r = i % 2 ? 31 : 40 - (i % 4 === 0 ? 2 : 0); return [cx + s * r * Math.cos(t), cy + s * r * Math.sin(t)] })
  const tumours = [[[-9, -8], 0.33, 0.2], [[10, -6], 0.32, 0.5], [[0, 10], 0.34, 0]]
  const tumourCells = tumours.map(([c, s, t], i) => `<g id="tumour-cell-${i + 1}">${g.path(g.smooth(lumpy(c, s, t)), 'url(#tumour-gradient)', tumour.outline, 9)}${g.hl(c[0] - 6, c[1] - 5.5, 9, 3.4, -45, tumour.light)}` +
    `${g.circle(c[0] - 0.6, c[1], 16 * s, 'url(#nucleus-gradient)', NUC.outline, 7)}${g.circle(c[0] + 1.4, c[1] - 1, 4.5 * s, NUC.small)}</g>`).join('')
  // T cell (silicodraw.mjs) at a quarter of its size: round, a large nucleus, microvilli ending in knobs.
  const tCell = ([cx, cy], s, i) => {
    const rays = Array.from({ length: 8 }, (_, j) => (j / 8) * Math.PI * 2 + Math.PI / 8)
    return `<g id="t-cell-${i}">${rays.map((t) => g.line([[cx + Math.cos(t) * 33 * s, cy + Math.sin(t) * 33 * s], [cx + Math.cos(t) * 42 * s, cy + Math.sin(t) * 42 * s]], tcell.outline, 6)).join('')}` +
      `${rays.map((t) => g.circle(cx + Math.cos(t) * 44 * s, cy + Math.sin(t) * 44 * s, 5.6 * s, tcell.small)).join('')}` +
      `${g.circle(cx, cy, 34 * s, 'url(#t-cell-gradient)', tcell.outline, 9)}${g.circle(cx, cy - s, 21 * s, 'url(#nucleus-gradient)', NUC.outline, 7)}</g>`
  }
  // Macrophage (silicodraw.mjs) at a quarter of its size: an irregular outline, a round nucleus, two vacuoles.
  const mAt = [24, 22], mS = 0.27, mP = (p) => placeP(p, mS, 0, mAt)
  const macrophage = `<g id="macrophage">${g.path(g.smooth([[-44, -6], [-30, -34], [-4, -26], [14, -44], [34, -24], [46, 4], [30, 30], [8, 42], [-12, 30], [-34, 36]].map(mP)), 'url(#macrophage-gradient)', macro.outline, 9)}` +
    `${[[22, 10, 6], [18, -16, 5]].map(([x, y, r]) => g.circle(...mP([x, y]), r * mS, macro.small)).join('')}${g.circle(...mP([-6, 2]), 15 * mS, 'url(#nucleus-gradient)', NUC.outline, 7)}${g.hl(...mP([-28, -20]), 8, 3, -55, macro.light)}</g>`
  // Fibroblast (silicodraw.mjs) at two fifths of its size, lying along the edge of the stroma.
  const fAt = [-18, -24], fS = 0.37, fT = -38
  const fibroblast = `<g id="fibroblast">${g.path(g.D(placeD('M-48,2C-30,-6 -16,-16 0,-14C16,-12 30,-4 48,-10C34,8 16,16 0,12C-16,8 -30,16 -48,2Z', fS, fT, fAt)), 'url(#fibroblast-gradient)', stroma.outline, 9)}` +
    `${g.ellipse(...placeP([0, -1], fS, 0, fAt), 14 * fS, 6 * fS, fT, 'url(#nucleus-gradient)', NUC.outline, 6)}</g>`
  cellType('Tumour microenvironment', [['stroma', stroma], ['tumour cells', tumour], ['T cells', tcell], ['macrophage', macro], ['nuclei', NUC]],
    g.grad('stroma-gradient', [-44, -44, 44, 44], { base: stroma.light, shadow: stroma.base }) + boxGrad('tumour-gradient', tumour) + boxGrad('t-cell-gradient', tcell) + boxGrad('macrophage-gradient', macro) +
      boxGrad('fibroblast-gradient', stroma) + boxGrad('nucleus-gradient', NUC),
    `<g id="stroma">${g.circle(0, 0, 44, 'url(#stroma-gradient)', stroma.outline, 12)}</g>\n` + fibroblast + '\n' + macrophage + '\n' +
      [[[27, -22], 0.24], [[-27, 20], 0.24]].map(([c, s], i) => tCell(c, s, i + 1)).join('\n') + '\n' + `<g id="tumour">${tumourCells}</g>`)
}

// ---------- Clonal evolution ----------
// A tree of tumour clones: the founding clone (blue) gives two subclones (yellow, green); the yellow one gives rise to a
// new red subclone and persists, the green one persists. Each clone is a cell with its nucleus.
// (SiliCoDraw marks time with a dotted line and an italic "t"; here an arrow under the tree runs the way time does.)
{
  const g = page(4.86, [-3.1, -1]), grey = toHex({ l: 0.62, c: 0.008, h: 250 })
  const clones = { founder: [soft(BLUE), [-38, -2]], yellow: [rich(ENDODERM), [-2, -26]], green: [soft(GREEN), [-2, 22]], red: [soft(25), [30, -38]] }
  const nodes = [['founder', -38, -2], ['yellow', -2, -26], ['green', -2, 22], ['red', 30, -38], ['yellow', 30, -14], ['green', 30, 22]]
  const r = 9.5
  cellType('Clonal evolution', [...Object.entries(clones).map(([n, [p]]) => [n, p]), ['nuclei', NUC]],
    Object.entries(clones).map(([n, [p]]) => boxGrad(`${n}-gradient`, p)).join('') + boxGrad('nucleus-gradient', NUC),
    `<g id="lineage">${[[[-38, -2], [-20, -2], [-2, -26]], [[-20, -2], [-2, 22]], [[-2, -26], [30, -38]], [[-2, -26], [30, -14]], [[-2, 22], [30, 22]]].map((p) => g.line(p, grey, 8)).join('')}</g>\n` +
      `<g id="time">${arrow(g, [-46, 42], [42, 42], grey, 9, 7, 8)}</g>\n` +
      nodes.map(([n, x, y], i) => { const p = clones[n][0]; return `<g id="clone-${i + 1}">${g.circle(x, y, r, `url(#${n}-gradient)`, p.outline, 9)}${g.hl(x - 4.2, y - 4.6, 8, 3, -45, p.light)}${g.circle(x + 1, y + 1, 3.7, 'url(#nucleus-gradient)', NUC.outline, 6)}</g>` }).join('\n'))
}

// ---------- Second messenger ----------
// An enzyme in the membrane (adenylyl cyclase) makes many small messenger molecules (cAMP) under it, which carry the
// signal on to three proteins in the cell. (SiliCoDraw writes "cAMP" on one orange disc; here a cluster of small
// molecules, in the green of ions and small ligands, says "many small molecules" without letters. The membrane is the
// lipid bilayer of ct02.mjs; the proteins the signal reaches are amber, where SiliCoDraw has them in the enzyme's blue.)
{
  const g = page(4.13, [0, -5.5]), protein = soft(PROTEIN), cargo = deep(MESSENGER), effector = rich(EFFECTOR)
  const LIPID = soft(PEACH), HEAD = 6.5, ROWS = 19, TAIL = 2.6, mid = -31
  const xs = [-48, -33, -18, 18, 33, 48]
  const tails = xs.flatMap((x) => [-TAIL, TAIL].flatMap((dx) => [-1, 1].map((s) => g.line([[x + dx, mid + s * (ROWS - 5)], [x + dx, mid + s * 2.2]], LIPID.outline, 6))))
  const heads = xs.flatMap((x) => [-1, 1].map((s) => g.circle(x, mid + s * ROWS, HEAD, 'url(#lipid-gradient)', LIPID.outline, 6)))
  const membrane = `<g id="membrane"><g id="membrane-core">${g.path(rect(g, -52, mid - ROWS, 52, mid + ROWS), LIPID.base)}</g><g id="lipid-tails">${tails.join('')}</g><g id="lipid-heads">${heads.join('')}</g></g>`
  const molecules = [[-6, 3], [5, 2], [-1, 11], [-10, 12], [9, 11]]
  const targets = [[-32, 37], [0, 41], [32, 37]]
  cellType('Second messenger', [['membrane', LIPID], ['enzyme', protein], ['messenger', cargo], ['effectors', effector]],
    boxGrad('lipid-gradient', LIPID) + g.grad('enzyme-gradient', [-12, -60, 12, -2], protein) + boxGrad('effector-gradient', effector),
    membrane + '\n' +
      `<g id="enzyme">${g.path(rrect(g, -12, -60, 24, 60, 9), 'url(#enzyme-gradient)', protein.outline, 10)}${g.hl(-6, -42, 3.6, 22, 0, protein.light)}</g>\n` +
      `<g id="second-messenger">${molecules.map(([x, y]) => g.circle(x, y, 4.3, cargo.small)).join('')}</g>\n` +
      `<g id="arrows">${[[[-12, 16], [-25, 26]], [[0, 19], [0, 29]], [[12, 16], [25, 26]]].map(([a, b]) => arrow(g, a, b, cargo.outline, 8, 6.5, 8)).join('')}</g>\n` +
      `<g id="effectors">${targets.map(([x, y]) => g.ellipse(x, y, 10.5, 8, 0, 'url(#effector-gradient)', effector.outline, 9) + g.hl(x - 4.5, y - 3.4, 9, 3.2, -30, effector.light)).join('')}</g>`)
}

check()
console.log('written to', OUT)
