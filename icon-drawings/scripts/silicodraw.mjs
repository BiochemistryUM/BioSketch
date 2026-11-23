// Icons of SiliCoDraw (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md: their shapes, read by hand from the
// source in a 100 × 100 box centred on 0,0, scaled onto a 512 page, with pale fills and thick membranes.
// Usage: node silicodraw.mjs <folder>
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { deep, hueOf, rich, soft } from './colour.mjs'
import { BLUE, GREEN, NUC, PEACH, cellTypes, circleD, highlight, nucGrad, nucleus, page } from './cellkit.mjs'
import { f, gradient2, svg } from './shapes.mjs'

const OUT = process.argv[2]
const write = (name, defs, body) => writeFileSync(join(OUT, `${name}.svg`), svg(name, defs, body))

// ---------- Cell: their ellipse with a nucleus and three vesicles (icon "cell") ----------
{
  const k = 4.9, X = (x) => 256 + x * k, Y = (y) => 256 + y * k
  const cyto = soft(hueOf('#cfe3f5'))
  // Their nucleus is blue-violet; it is moved 50° round in hue so that "Shades follow" recolours it apart from the cytoplasm.
  const nuc = soft(hueOf('#6f86c8') + 50)
  const defs =
    gradient2('cell-gradient', [256 - 46 * k, 256 - 40 * k, 256 + 46 * k, 256 + 40 * k], cyto.base, cyto.shadow) +
    gradient2('nucleus-gradient', [X(-22), Y(-18), X(10), Y(14)], nuc.base, nuc.shadow)
  const body =
    `<g id="cytoplasm"><ellipse cx="256" cy="256" rx="${f(46 * k)}" ry="${f(40 * k)}" fill="url(#cell-gradient)" stroke="${cyto.outline}" stroke-width="12"/></g>\n` +
    `<g id="highlight">${highlight(X(-28), Y(-22), 34, 13, -38, cyto.light)}</g>\n` +
    `<g id="nucleus"><circle cx="${f(X(-6))}" cy="${f(Y(-2))}" r="${f(16 * k)}" fill="url(#nucleus-gradient)" stroke="${nuc.outline}" stroke-width="10"/>${highlight(X(-12), Y(-9), 18, 8, -45, nuc.light)}</g>\n` +
    `<g id="vesicles">${[[24, 14, 4], [-28, 20, 3], [20, -22, 3]].map(([x, y, r]) => `<circle cx="${f(X(x))}" cy="${f(Y(y))}" r="${f(r * k)}" fill="${cyto.small}"/>`).join('')}</g>`
  write('Cell', defs, body)
}

// ---------- cell types (drawn with the kit in cellkit.mjs) ----------
const { cellType, check } = cellTypes(OUT)

// Red blood cell: a disc seen from above, the pale centre of its dimple shown as a darker spot of the same red.
{
  const g = page(5.09, [0, 0]), red = deep(hueOf('#e86b6b'))
  cellType('Red blood cell', [['cell', red]],
    g.grad('cell-gradient', [-44, -26, 44, 26], red),
    `<g id="cell">${g.ellipse(0, 0, 44, 26, 0, 'url(#cell-gradient)', red.outline, 12)}</g>\n` +
      `<g id="dimple">${g.ellipse(2, 2, 21, 10.5, 0, red.small)}</g>\n` +
      `<g id="highlight">${g.hl(-24, -13, 32, 10, -18, red.light)}</g>`)
}
// T cell: round, a large nucleus, short microvilli all round, each ending in a knob.
{
  const g = page(4.91, [0, 0]), cyto = soft(BLUE)
  const rays = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2 + Math.PI / 8)
  cellType('T cell', [['cytoplasm', cyto], ['nucleus', NUC]],
    g.grad('cell-gradient', [-34, -34, 34, 34], cyto) + nucGrad(g, 0, -1, 22),
    `<g id="microvilli">${rays.map((t) => g.line([[Math.cos(t) * 33, Math.sin(t) * 33], [Math.cos(t) * 43, Math.sin(t) * 43]], cyto.outline, 9)).join('')}${rays.map((t) => g.circle(Math.cos(t) * 45.5, Math.sin(t) * 45.5, 4.6, cyto.small)).join('')}</g>\n` +
      `<g id="cytoplasm">${g.circle(0, 0, 34, 'url(#cell-gradient)', cyto.outline, 12)}${g.hl(-21, -19, 24, 9, -45, cyto.light)}</g>\n` +
      nucleus(g, 0, -1, 22))
}
// B cell: round, a large nucleus, Y-shaped receptors (membrane antibodies) standing out all round.
{
  const g = page(4.75, [0, 0]), cyto = soft(GREEN), bcr = deep(75)
  const rot = (a, [x, y]) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]
  const ys = Array.from({ length: 6 }, (_, i) => (i * Math.PI) / 3).map((a) => [
    [rot(a, [0, -33]), rot(a, [0, -40])], [rot(a, [-5.5, -47]), rot(a, [0, -40]), rot(a, [5.5, -47])]])
  cellType('B cell', [['cytoplasm', cyto], ['nucleus', NUC], ['receptors', bcr]],
    g.grad('cell-gradient', [-34, -34, 34, 34], cyto) + nucGrad(g, 0, 0, 20),
    `<g id="receptors">${ys.map(([stem, arms]) => g.line(stem, bcr.small, 12) + g.line(arms, bcr.small, 12)).join('')}</g>\n` +
      `<g id="cytoplasm">${g.circle(0, 0, 34, 'url(#cell-gradient)', cyto.outline, 12)}${g.hl(-21, -19, 24, 9, -45, cyto.light)}</g>\n` +
      nucleus(g, 0, 0, 20))
}
// Neutrophil: round, a nucleus of three lobes joined by thin strands, fine granules.
{
  const g = page(5.9, [0, 0]), cyto = soft(PEACH)
  const lobes = [[-16, -6, 11], [2, -16, 10], [14, 5, 11]]
  const strands = [[lobes[0], lobes[1]], [lobes[1], lobes[2]]].map(([a, b]) => ({ d: `M${g.P(a).map(f).join(',')} L${g.P(b).map(f).join(',')}`, width: f(4 * g.k) }))
  cellType('Neutrophil', [['cytoplasm', cyto], ['nucleus', NUC]],
    g.grad('cell-gradient', [-38, -38, 38, 38], cyto) + g.grad('nucleus-gradient', [-27, -26, 25, 16], NUC),
    `<g id="cytoplasm">${g.circle(0, 0, 38, 'url(#cell-gradient)', cyto.outline, 12)}${g.hl(-24, -22, 26, 9, -45, cyto.light)}</g>\n` +
      `<g id="granules">${[[-24, 18], [20, -24], [24, 22], [-6, 26], [-26, -20], [28, -4], [8, 18], [-30, 2]].map(([x, y]) => g.circle(x, y, 2.6, cyto.small)).join('')}</g>\n` +
      `<g id="nucleus">${g.union([...lobes.map(([x, y, r]) => circleD(g, x, y, r)), ...strands], 'url(#nucleus-gradient)', NUC.outline, 9)}${g.hl(-20, -10, 12, 5, -45, NUC.light)}</g>`)
}
// Monocyte: round, a kidney-shaped nucleus, a few granules.
{
  const g = page(6.2, [0, 0]), cyto = soft(BLUE)
  cellType('Monocyte', [['cytoplasm', cyto], ['nucleus', NUC]],
    g.grad('cell-gradient', [-36, -36, 36, 36], cyto) + g.grad('nucleus-gradient', [-18, -24, 22, 26], NUC),
    `<g id="cytoplasm">${g.circle(0, 0, 36, 'url(#cell-gradient)', cyto.outline, 12)}${g.hl(-22, -21, 24, 9, -45, cyto.light)}</g>\n` +
      `<g id="granules">${[[-24, 8], [-21, -8], [-24, 21], [-8, 28]].map(([x, y]) => g.circle(x, y, 2.4, cyto.small)).join('')}</g>\n` +
      `<g id="nucleus">${g.path(g.D('M-17,-12C-22,-20 -14,-25 -4,-25C12,-25 22,-14 22,2C22,17 9,28 -4,27C-12,27 -17,22 -13,17C-3,10 -3,-4 -17,-12Z') /* blunt ends since the review of 23 November 2026 (a crescent with sharp tips before) */, 'url(#nucleus-gradient)', NUC.outline, 10)}${g.hl(2, -15, 14, 5, -20, NUC.light)}</g>`)
}
// Macrophage: a large cell of irregular outline, a round nucleus, vacuoles of what it has taken in.
{
  const g = page(4.96, [1, -1]), cyto = soft(GREEN)
  cellType('Macrophage', [['cytoplasm', cyto], ['nucleus', NUC]],
    g.grad('cell-gradient', [-44, -44, 46, 42], cyto) + nucGrad(g, -6, 2, 14),
    `<g id="cytoplasm">${g.path(g.smooth([[-44, -6], [-30, -34], [-4, -26], [14, -44], [34, -24], [46, 4], [30, 30], [8, 42], [-12, 30], [-34, 36]]), 'url(#cell-gradient)', cyto.outline, 12)}${g.hl(-30, -20, 18, 7, -55, cyto.light)}</g>\n` +
      `<g id="vacuoles">${[[22, 10, 5.5], [18, -16, 4.5], [-26, -12, 4.5], [-22, 22, 3.5]].map(([x, y, r]) => g.circle(x, y, r, cyto.small)).join('')}</g>\n` +
      nucleus(g, -6, 2, 14))
}
// Neuron: a cell body with branching dendrites, an axon wrapped in myelin, and terminals ending in boutons.
{
  const g = page(4.3, [0.7, -2]), cyto = soft(PEACH), myelin = soft(BLUE)
  const L = (pts) => ({ d: `M${pts.map(g.P).map(([x, y]) => `${f(x)},${f(y)}`).join(' L')}`, width: 12 })
  const C = (d, width = 12) => ({ d: g.D(d), width })
  const parts = [
    C('M-30,-12C-36,-22 -40,-30 -48,-36'), L([[-40, -30], [-48, -28]]),
    C('M-20,-14C-20,-26 -22,-36 -16,-48'), L([[-21, -34], [-29, -40]]),
    C('M-36,4C-42,8 -46,16 -50,26'), L([[-43, 14], [-50, 12]]),
    C('M-22,12C-26,22 -30,32 -38,44'), L([[-28, 28], [-21, 31]]),
    C('M-12,14C-10,24 -8,34 -10,44'),
    C('M-12,-1C4,-2 14,0 40,0', 13),
    L([[40, 0], [47, -10]]), L([[40, 0], [48, 3]]), L([[40, 0], [45, 11]]),
    g.smooth([[-24, -15], [-12, -8], [-9, 2], [-16, 13], [-30, 12], [-38, 2], [-35, -11]]),
    circleD(g, 48, -11, 3.6), circleD(g, 49, 4, 3.6), circleD(g, 46, 12, 3.6),
  ]
  cellType('Neuron', [['cell', cyto], ['myelin', myelin], ['nucleus', NUC]],
    g.grad('cell-gradient', [-50, -48, 52, 44], cyto) + g.grad('myelin-gradient', [-4, -5, 36, 5], myelin) + nucGrad(g, -25, -1, 5.5),
    `<g id="cell">${g.union(parts, 'url(#cell-gradient)', cyto.outline, 6)}${g.hl(-30, -8, 9, 4, -35, cyto.light)}</g>\n` +
      `<g id="myelin">${[-4, 10, 24].map((x) => `<rect x="${f(g.X(x))}" y="${f(g.Y(-5))}" width="${f(12 * g.k)}" height="${f(10 * g.k)}" rx="${f(5 * g.k)}" fill="url(#myelin-gradient)" stroke="${myelin.outline}" stroke-width="6"/>`).join('')}</g>\n` +
      nucleus(g, -24, 0, 5.5, 6))
}
// Fibroblast: a long spindle with tapering ends and an elongated nucleus.
{
  const g = page(4.67, [0, -1]), cyto = soft(PEACH)
  cellType('Fibroblast', [['cytoplasm', cyto], ['nucleus', NUC]],
    g.grad('cell-gradient', [-48, -16, 48, 16], cyto) + g.grad('nucleus-gradient', [-14, -6, 14, 6], NUC),
    `<g id="cytoplasm">${g.path(g.D('M-48,2C-30,-6 -16,-16 0,-14C16,-12 30,-4 48,-10C34,8 16,16 0,12C-16,8 -30,16 -48,2Z'), 'url(#cell-gradient)', cyto.outline, 10)}${g.hl(-20, -8, 22, 5, -16, cyto.light)}</g>\n` +
      `<g id="nucleus">${g.ellipse(0, -1, 14, 6, 0, 'url(#nucleus-gradient)', NUC.outline, 8)}${g.hl(-6, -3.5, 12, 3.5, -6, NUC.light)}</g>`)
}
// Adipocyte: one large lipid droplet filling the cell, a thin rim of cytoplasm, the nucleus pressed flat at the edge.
{
  const g = page(5.25, [-0.6, 0.6]), cyto = soft(PEACH), lipid = rich(hueOf('#fde68a'))
  cellType('Adipocyte', [['cytoplasm', cyto], ['lipid droplet', lipid], ['nucleus', NUC]],
    g.grad('cell-gradient', [-42, -40, 40, 40], cyto) + g.grad('lipid-gradient', [-32, -30, 30, 30], lipid) + g.grad('nucleus-gradient', [11, -32, 27, -24], NUC),
    `<g id="cytoplasm">${g.path(g.smooth([[-36, -28], [6, -40], [36, -22], [40, 14], [14, 40], [-24, 34], [-42, 6]]), 'url(#cell-gradient)', cyto.outline, 12)}</g>\n` +
      `<g id="lipid-droplet">${g.path(g.smooth([[-26, -18], [6, -30], [26, -16], [30, 12], [10, 30], [-16, 26], [-32, 6]]), 'url(#lipid-gradient)', lipid.outline, 6)}${g.hl(-16, -14, 24, 9, -40, lipid.light)}</g>\n` +
      `<g id="nucleus">${g.ellipse(19, -28, 8.5, 3.6, 31, 'url(#nucleus-gradient)', NUC.outline, 6)}</g>`)
}
// Cancer cell: an irregular, lumpy outline, a large nucleus with a prominent nucleolus.
{
  const g = page(5.88, [0, 0]), cyto = soft(25)
  const pts = Array.from({ length: 16 }, (_, i) => { const t = (i / 16) * Math.PI * 2, r = i % 2 ? 31 : 40 - (i % 4 === 0 ? 2 : 0); return [r * Math.cos(t), r * Math.sin(t)] })
  cellType('Cancer cell', [['cytoplasm', cyto], ['nucleus', NUC]],
    g.grad('cell-gradient', [-40, -40, 40, 40], cyto) + nucGrad(g, -2, 0, 16),
    `<g id="cytoplasm">${g.path(g.smooth(pts), 'url(#cell-gradient)', cyto.outline, 12)}${g.hl(-20, -18, 20, 8, -45, cyto.light)}</g>\n` +
      `<g id="nucleus">${g.circle(-2, 0, 16, 'url(#nucleus-gradient)', NUC.outline, 10)}${g.circle(4, -3, 4.5, NUC.small)}${g.hl(-9, -8, 13, 5, -45, NUC.light)}</g>`)
}

check()
console.log('written to', OUT)
