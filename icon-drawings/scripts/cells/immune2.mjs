// Eight more cell types of SiliCoDraw (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md with the kit of ../cellkit.mjs:
// their shapes, read by hand from the source in a 100 × 100 box centred on 0,0, scaled onto a 512 page.
// They sit beside the T cell, red blood cell, cancer cell and stem cells of ../silicodraw.mjs and share their colours.
// Usage: node immune2.mjs <folder>
import { deep, hueOf, rich, soft, toHex } from '../colour.mjs'
import { BLUE, GREEN, NUC, PEACH, cellTypes, circleD, nucGrad, nucleus, page } from '../cellkit.mjs'
import { f } from '../shapes.mjs'

const OUT = process.argv[2]
const { cellType, check } = cellTypes(OUT)

const RED = hueOf('#e86b6b'), YELLOW = hueOf('#fff3c4')
/** A darker ink of a palette's hue, for arrows and lines that belong to that part. */
const ink = (h, l = 0.5, c = 0.1) => toHex({ l, c, h })
/** A triangle arrowhead with its tip at `to`, pointing away from `from` (both in SiliCoDraw units); length and width in units. */
const head = (g, from, to, len, wide, fill) => {
  const [x0, y0] = from, [x1, y1] = to, d = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / d, uy = (y1 - y0) / d
  const bx = x1 - ux * len, by = y1 - uy * len
  const pts = [[x1, y1], [bx - uy * wide / 2, by + ux * wide / 2], [bx + uy * wide / 2, by - ux * wide / 2]].map(g.P)
  return `<path d="M${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' L')}Z" fill="${fill}" stroke="${fill}" stroke-width="3" stroke-linejoin="round"/>`
}
/** An arrow from `a` to `b` (units): a round-capped line that stops under its head, then the head. */
const arrow = (g, a, b, colour, w, len = 7, wide = 8) => {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]), t = (d - len * 0.6) / d
  return g.line([a, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]], colour, w) + head(g, a, b, len, wide, colour)
}
/** The lumpy outline of a cancer cell (as in silicodraw.mjs): n points, alternately at radius R and r. */
const lumpy = (cx, cy, R, r, n = 16, turn = 0) => Array.from({ length: n }, (_, i) => { const t = (i / n) * Math.PI * 2 + turn; const q = i % 2 ? r : R; return [cx + q * Math.cos(t), cy + q * Math.sin(t)] })
/** A small nucleus of its own gradient (the shared lilac), for daughter cells in a scheme. */
const smallNucleus = (g, id, x, y, r, w) => ({
  defs: g.grad(id, [x - r, y - r, x + r, y + r], NUC),
  body: `<g id="${id.replace('-gradient', '')}">${g.circle(x, y, r, `url(#${id})`, NUC.outline, w)}</g>`,
})
/** The microvilli of the T cell (8 short rays ending in knobs) round a cell at cx, cy; `skip` leaves out rays under a badge. */
const microvilli = (g, cx, cy, pal, skip = []) => {
  const rays = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2 + Math.PI / 8).filter((_, i) => !skip.includes(i))
  return `<g id="microvilli">${rays.map((t) => g.line([[cx + Math.cos(t) * 33, cy + Math.sin(t) * 33], [cx + Math.cos(t) * 43, cy + Math.sin(t) * 43]], pal.outline, 9)).join('')}${rays.map((t) => g.circle(cx + Math.cos(t) * 45.5, cy + Math.sin(t) * 45.5, 4.6, pal.small)).join('')}</g>`
}

// Regulatory T cell: the T cell (microvilli, large nucleus) with a shield and a tick at its top right, for suppression.
{
  const g = page(4.425, [-0.8, 1.3]), cyto = soft(BLUE), shield = soft(hueOf('#5fae8b'))
  cellType('Regulatory T cell', [['cytoplasm', cyto], ['nucleus', NUC], ['shield', shield]],
    g.grad('cell-gradient', [-40, -32, 28, 36], cyto) + nucGrad(g, -6, 1, 21) + g.grad('shield-gradient', [17, -44, 49, -6], shield),
    microvilli(g, -6, 2, cyto, [7]) + '\n' +
      `<g id="cytoplasm">${g.circle(-6, 2, 34, 'url(#cell-gradient)', cyto.outline, 12)}${g.hl(-27, -17, 24, 9, -45, cyto.light)}</g>\n` +
      nucleus(g, -6, 1, 21) + '\n' +
      `<g id="shield">${g.path(g.D('M33,-45L50,-38.5L50,-24C50,-13 42,-7 33,-4.5C24,-7 16,-13 16,-24L16,-38.5Z'), 'url(#shield-gradient)', shield.outline, 10)}${g.hl(23, -36, 12, 5, -30, shield.light)}` +
      `${g.line([[25, -25.5], [31, -19.5], [41, -31.5]], shield.outline, 11)}</g>`)
}
// Memory cell: the same cell with a clock at its top right, for a long life and a quick recall.
{
  const g = page(4.444, [-1.0, 1.3]), cyto = soft(BLUE), clock = rich(85)
  cellType('Memory cell', [['cytoplasm', cyto], ['nucleus', NUC], ['clock', clock]],
    g.grad('cell-gradient', [-40, -32, 28, 36], cyto) + nucGrad(g, -6, 1, 21) + g.grad('clock-gradient', [17, -44, 49, -12], clock),
    microvilli(g, -6, 2, cyto, [7]) + '\n' +
      `<g id="cytoplasm">${g.circle(-6, 2, 34, 'url(#cell-gradient)', cyto.outline, 12)}${g.hl(-27, -17, 24, 9, -45, cyto.light)}</g>\n` +
      nucleus(g, -6, 1, 21) + '\n' +
      `<g id="clock">${g.circle(33, -28, 16.5, 'url(#clock-gradient)', clock.outline, 10)}${g.hl(25, -36, 11, 4.5, -45, clock.light)}` +
      `${g.line([[33, -38], [33, -28], [40.5, -22.5]], ink(85, 0.5, 0.09), 11)}${g.circle(33, -28, 2.6, ink(85, 0.5, 0.09))}</g>`)
}
// Haematopoietic stem cell: a stem cell branching into a red blood cell, a myeloid cell and a lymphoid cell.
{
  const g = page(5.12, [-0.4, 0]), stem = rich(YELLOW), red = deep(RED), myeloid = soft(GREEN), lymphoid = soft(BLUE)
  const lines = stem.outline
  const n1 = smallNucleus(g, 'myeloid-nucleus-gradient', 34, 0, 5, 6), n2 = smallNucleus(g, 'lymphoid-nucleus-gradient', 34, 28, 5.5, 6)
  cellType('Haematopoietic stem cell', [['stem cell', stem], ['nucleus', NUC], ['red blood cell', red], ['myeloid cell', myeloid], ['lymphoid cell', lymphoid]],
    g.grad('stem-gradient', [-44, -18, -8, 18], stem) + nucGrad(g, -26, 0, 11) + g.grad('red-gradient', [25, -37, 43, -19], red) +
      g.grad('myeloid-gradient', [25, -9, 43, 9], myeloid) + g.grad('lymphoid-gradient', [25, 19, 43, 37], lymphoid) + n1.defs + n2.defs,
    `<g id="lines">${g.line([[-5, 0], [8, 0]], lines, 11)}${[-26, 0, 26].map((y) => g.line([[8, 0], [22, y]], lines, 11)).join('')}</g>\n` +
      `<g id="stem-cell">${g.circle(-26, 0, 18, 'url(#stem-gradient)', stem.outline, 12)}${g.hl(-36, -9, 13, 5, -45, stem.light)}</g>\n` +
      nucleus(g, -26, 0, 10.5, 9) + '\n' +
      `<g id="red-blood-cell">${g.circle(34, -28, 9.5, 'url(#red-gradient)', red.outline, 10)}${g.ellipse(34.5, -27.5, 4.6, 2.1, 0, red.small)}${g.hl(29.5, -32, 7, 3, -45, red.light)}</g>\n` +
      `<g id="myeloid-cell">${g.circle(34, 0, 9.5, 'url(#myeloid-gradient)', myeloid.outline, 10)}${g.hl(29.5, -4.5, 7, 3, -45, myeloid.light)}${n1.body}</g>\n` +
      `<g id="lymphoid-cell">${g.circle(34, 28, 9.5, 'url(#lymphoid-gradient)', lymphoid.outline, 10)}${g.hl(29.5, 23.5, 7, 3, -45, lymphoid.light)}${n2.body}</g>`)
}
// Megakaryocyte: a large cell with a big lobed (polyploid) nucleus, platelets budding off its right side.
{
  const g = page(5.1, [7.9, 5.4]), cyto = soft(2)
  const platelets = [[36, -30], [46, -14], [48, 8], [42, 30], [30, 42]]
  // Their nucleus is one smooth blob; a megakaryocyte is known by a nucleus of many lobes, so it is drawn as lobes run together.
  const lobes = [[-11, -11, 9], [4, -13, 7.5], [11, -2, 8.5], [2, 9, 7], [-11, 4, 8], [-2, -3, 9]]
  cellType('Megakaryocyte', [['cytoplasm', cyto], ['nucleus', NUC]],
    g.grad('cell-gradient', [-36, -34, 32, 32], cyto) + g.grad('nucleus-gradient', [-20, -20, 16, 14], NUC),
    `<g id="platelets">${platelets.map(([x, y]) => g.ellipse(x, y, 5.4, 3.6, -30, cyto.small)).join('')}</g>\n` +
      `<g id="cytoplasm">${g.path(g.smooth([[-30, -26], [0, -34], [26, -24], [32, 0], [22, 26], [-6, 32], [-30, 22], [-36, 0]]), 'url(#cell-gradient)', cyto.outline, 12)}${g.hl(-22, -22, 22, 8, -30, cyto.light)}</g>\n` +
      `<g id="nucleus">${g.union(lobes.map(([x, y, r]) => circleD(g, x, y, r)), 'url(#nucleus-gradient)', NUC.outline, 9)}${g.hl(-13, -13, 11, 4.5, -40, NUC.light)}</g>`)
}
// Sickle cell: a normal red blood cell, a dashed arrow, and the sickle-shaped cell it becomes.
{
  const g = page(6.1, [-3.3, 3.3]), red = deep(RED)
  const sickle = 'M4,30C-2,14 4,-10 26,-24C30,-26 36,-22 32,-16C14,-2 8,14 14,28C16,34 8,36 4,30Z'
  cellType('Sickle cell', [['cells', red]],
    g.grad('normal-gradient', [-40, -27, -4, -5], red) + g.grad('sickle-gradient', [0, -25, 34, 33], red),
    `<g id="normal-cell">${g.ellipse(-22, -16, 18, 11, 0, 'url(#normal-gradient)', red.outline, 11)}${g.ellipse(-21.5, -15.5, 8.5, 4.2, 0, red.small)}${g.hl(-31, -21, 13, 4.5, -18, red.light)}</g>\n` +
      `<g id="arrow"><path d="M${g.P([-14, 3.5]).map(f).join(',')} L${g.P([-5.5, 13]).map(f).join(',')}" fill="none" stroke="${red.outline}" stroke-width="8" stroke-linecap="round" stroke-dasharray="0.1 14"/>${head(g, [-14, 3.5], [-1, 18], 6.5, 7.5, red.outline)}</g>\n` +
      `<g id="sickle-cell">${g.path(g.D(sickle), 'url(#sickle-gradient)', red.outline, 11)}${g.line([[11, 21], [11.5, 10], [16, 0], [25, -12]], red.small, 11)}${g.hl(18, -11, 10, 3.5, -50, red.light)}</g>`)
}
// Stem cell: a stem cell with arrows to three different daughter cells (differentiation).
{
  const g = page(4.78, [1.1, 1]), stem = rich(YELLOW), arrows = stem.outline
  const kids = [['blue', BLUE, 32, -36, 'h'], ['green', GREEN, 36, 4, 'v'], ['peach', PEACH, 18, 38, 'h']]
  const pals = kids.map(([, h]) => soft(h))
  const from = (x, y) => { const dx = x + 18, dy = y + 6, d = Math.hypot(dx, dy); return [[-18 + dx / d * 26, -6 + dy / d * 26], [x - dx / d * 15, y - dy / d * 15]] }
  cellType('Stem cell', [['stem cell', stem], ['nucleus', NUC], ...kids.map(([n], i) => [`${n} cell`, pals[i]])],
    g.grad('stem-gradient', [-40, -28, 4, 16], stem) + nucGrad(g, -18, -7, 9) + kids.map(([n, , x, y], i) => g.grad(`${n}-gradient`, [x - 10, y - 10, x + 10, y + 10], pals[i])).join(''),
    `<g id="halo">${g.circle(-18, -6, 27, toHex({ l: 0.975, c: 0.045, h: YELLOW }))}</g>\n` +
      `<g id="stem-cell">${g.circle(-18, -6, 22, 'url(#stem-gradient)', stem.outline, 12)}${g.hl(-31, -18, 13, 5, -45, stem.light)}</g>\n` +
      `<g id="nucleus">${g.circle(-18, -7, 9, 'url(#nucleus-gradient)', NUC.outline, 9)}${g.hl(-21.5, -10.5, 8, 3.5, -45, NUC.light)}</g>\n` +
      `<g id="arrows">${kids.map(([, , x, y]) => { const [a, b] = from(x, y); return arrow(g, a, b, arrows, 9, 7, 8) }).join('')}</g>\n` +
      kids.map(([n, , x, y, o], i) => `<g id="${n}-cell">${g.circle(x, y, 10, `url(#${n}-gradient)`, pals[i].outline, 10)}${g.hl(x - 4.5, y - 4.5, 7, 3, -45, pals[i].light)}` +
        g.line(o === 'h' ? [[x - 3.5, y + 1], [x + 3.5, y + 1]] : [[x + 0.5, y - 3.5], [x + 0.5, y + 3.5]], pals[i].small, 11) + '</g>').join('\n'))
}
// Cancer stem cell: a lumpy cancer cell renewing itself (the curved arrow) and giving rise to three smaller cancer cells.
{
  const g = page(5.41, [-3.1, 0]), cyto = soft(25), arrows = cyto.outline
  const kids = [[30, -22], [30, 0], [30, 22]]
  const kn = kids.map(([x, y], i) => smallNucleus(g, `nucleus-${i + 1}-gradient`, x, y, 2.8, 5))
  // The curved arrow of self-renewal over the cell: an arc about its middle, ending in a head.
  const R = 25, a0 = (205 * Math.PI) / 180, a1 = (318 * Math.PI) / 180, at = (t) => [-22 + R * Math.cos(t), 0 + R * Math.sin(t)]
  const [s, e] = [at(a0), at(a1 - 0.12)].map(g.P), tip = at(a1 + 0.1), back = at(a1 - 0.3)
  cellType('Cancer stem cell', [['cytoplasm', cyto], ['nucleus', NUC]],
    g.grad('cell-gradient', [-40, -18, -4, 18], cyto) + nucGrad(g, -22, 0, 7.5) + g.grad('daughter-gradient', [22, -30, 38, 30], cyto) + kn.map((n) => n.defs).join(''),
    `<g id="arrows"><path d="M${f(s[0])},${f(s[1])} A${f(R * g.k)},${f(R * g.k)} 0 0 1 ${f(e[0])},${f(e[1])}" fill="none" stroke="${arrows}" stroke-width="9" stroke-linecap="round"/>${head(g, back, tip, 6.5, 7.5, arrows)}` +
      `${g.line([[-1, 0], [8, 0]], arrows, 9)}${kids.map(([x, y]) => g.line([[8, 0], [21, y * 0.82]], arrows, 9)).join('')}</g>\n` +
      `<g id="cytoplasm">${g.path(g.smooth(lumpy(-22, 0, 18, 14.5)), 'url(#cell-gradient)', cyto.outline, 12)}${g.hl(-31, -9, 11, 4.5, -45, cyto.light)}</g>\n` +
      `<g id="nucleus">${g.circle(-22, 0, 7.5, 'url(#nucleus-gradient)', NUC.outline, 9)}${g.circle(-19.5, -1.5, 2.2, NUC.small)}</g>\n` +
      `<g id="daughter-cells">${kids.map(([x, y], i) => g.path(g.smooth(lumpy(x, y, 8.4, 7.3, 12)), 'url(#daughter-gradient)', cyto.outline, 9) + g.hl(x - 3.6, y - 3.8, 5.5, 2.4, -45, cyto.light) + kn[i].body).join('')}</g>`)
}
// Senescent cell: a large, flattened cell with an enlarged nucleus and blue granules (senescence-associated β-galactosidase).
{
  const g = page(4.74, [0.4, 0]), cyto = soft(PEACH), gal = deep(255)
  cellType('Senescent cell', [['cytoplasm', cyto], ['nucleus', NUC], ['granules', gal]],
    g.grad('cell-gradient', [-46, -32, 46, 32], cyto) + nucGrad(g, -2, 0, 16),
    `<g id="cytoplasm">${g.path(g.smooth([[-46, -10], [-20, -30], [14, -32], [42, -16], [46, 8], [22, 30], [-10, 32], [-38, 20]]), 'url(#cell-gradient)', cyto.outline, 12)}${g.hl(-28, -19, 24, 8, -25, cyto.light)}</g>\n` +
      nucleus(g, -2, 0, 16) + '\n' +
      `<g id="granules">${[[-30, 0], [26, -12], [30, 14], [-16, -19], [6, 20], [-24, 15], [12, -22]].map(([x, y]) => g.circle(x, y, 3.2, gal.small)).join('')}</g>`)
}

check()
console.log('written to', OUT)
