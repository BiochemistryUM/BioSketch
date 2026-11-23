// Eight icons of SiliCoDraw's "Cells & tissues" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md with the kit in ../cellkit.mjs:
// their shapes, read by hand from the source in a 100 × 100 box centred on 0,0, scaled onto a 512 page.
// The batch: actin filament, centrosome, lipid bilayer, ion channel, receptor, cell division, apoptosis, tumour.
// The lipid bilayer, the ion channel and the receptor share one membrane (`lipids`): the same lipids, of the same size
// and in the same peach, so that the three can stand side by side in a figure.
// Usage: node ct02.mjs <folder>
import { BLUE, NUC, PEACH, cellTypes, page } from '../cellkit.mjs'
import { deep, hueOf, soft, toHex } from '../colour.mjs'
import { f } from '../shapes.mjs'

const OUT = process.argv[2]
const { cellType, check } = cellTypes(OUT)

// The hues of the set (OKLCH degrees). The nucleus lilac is about 319°.
// SiliCoDraw's protein blue (#4f6bb8, 267°) is kept for the channel, the receptor and the centrioles; what passes through
// or binds (ions, the ligand) was a paler blue of the same hue and is moved to a green, so that it recolours apart and
// can be told from the protein at a glance. The microtubules of the centrosome move from 245° to 225°, away from the centrioles.
const ACTIN = hueOf('#d64545'), PROTEIN = hueOf('#4f6bb8'), CARGO = 165, TUBULE = 225, TUMOUR = 25, DYING = hueOf('#d9dde3')

/** A palette in the steps of `soft` with little colour: the grey of a dying cell, tinted with its hue. */
const ashen = (h) => ({
  light: toHex({ l: 0.985, c: 0.004, h }),
  base: toHex({ l: 0.93, c: 0.014, h }),
  shadow: toHex({ l: 0.87, c: 0.022, h }),
  small: toHex({ l: 0.8, c: 0.03, h }),
  outline: toHex({ l: 0.6, c: 0.042, h }),
})
/** One gradient that lights every shape that uses it from its own top left (several beads, heads, cells, nuclei). */
const boxGrad = (id, pal) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`
/** A rounded rectangle given in their units, as a path on the page. */
const rrect = (g, x, y, w, h, r) => {
  const [x0, y0] = g.P([x, y]), W = w * g.k, H = h * g.k, R = Math.min(r * g.k, W / 2, H / 2)
  return `M${f(x0 + R)},${f(y0)} H${f(x0 + W - R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + W)},${f(y0 + R)} V${f(y0 + H - R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + W - R)},${f(y0 + H)} H${f(x0 + R)} A${f(R)},${f(R)} 0 0 1 ${f(x0)},${f(y0 + H - R)} V${f(y0 + R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + R)},${f(y0)} Z`
}
/** A plain rectangle given in their units, as a path on the page. */
const rect = (g, x0, y0, x1, y1) => `M${f(g.X(x0))},${f(g.Y(y0))} H${f(g.X(x1))} V${f(g.Y(y1))} H${f(g.X(x0))} Z`
// A point turned by `deg` degrees about 0,0, as SVG's rotate() turns it.
const turn = (deg, [x, y]) => { const a = (deg * Math.PI) / 180; return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)] }

// ---------- the membrane the bilayer, the channel and the receptor share ----------
// A lipid is a round head and two tails. Heads are 6.5 in radius and 15 apart (SiliCoDraw's bilayer); the two rows of
// heads lie 19 above and below the middle of the membrane, so the tails nearly meet there (SiliCoDraw leaves a wide gap).
// Behind the tails lies a pale band, the oily inside of the membrane: at 40 px it holds the two rows together.
const LIPID = soft(PEACH), HEAD = 6.5, ROWS = 19, TAIL = 2.6
const lipidDefs = boxGrad('lipid-gradient', LIPID)
/** A membrane about the height `mid`: lipids at each x of `xs`, the band over each stretch `[x0, x1]` of `bands`. */
const lipids = (g, xs, mid, bands) => {
  const tails = xs.flatMap((x) => [-TAIL, TAIL].flatMap((dx) => [-1, 1].map((s) => g.line([[x + dx, mid + s * (ROWS - 5)], [x + dx, mid + s * 2.2]], LIPID.outline, 6))))
  const heads = xs.flatMap((x) => [-1, 1].map((s) => g.circle(x, mid + s * ROWS, HEAD, 'url(#lipid-gradient)', LIPID.outline, 6)))
  return `<g id="membrane"><g id="membrane-core">${bands.map(([x0, x1]) => g.path(rect(g, x0, mid - ROWS, x1, mid + ROWS), LIPID.base)).join('')}</g>` +
    `<g id="lipid-tails">${tails.join('')}</g><g id="lipid-heads">${heads.join('')}</g></g>`
}

// Actin filament: two strands of round subunits wound round each other.
// (Corrected: SiliCoDraw draws one strand over the other all along; here each strand passes in front and behind in
// turn, and the subunits of the two strands are staggered by half a subunit, as in F-actin. Ten larger subunits per
// strand instead of thirteen and one full turn instead of one and a half, so that the beads and the twist still show at 40 px.)
{
  const g = page(4.34, [1.6, 0]), pale = soft(ACTIN), full = deep(ACTIN)
  const N = 10, STEP = 9.6, R = 6.6, AMP = 8.6, HALF_TURN = 45
  const beads = []
  for (let i = 0; i < N; i++)
    for (const strand of [0, 1]) {
      const x = -44 + i * STEP + strand * (STEP / 2), turnAt = (Math.PI * (x - 1.6 + HALF_TURN / 2)) / HALF_TURN, side = strand ? -1 : 1
      beads.push({ x, y: -side * AMP * Math.sin(turnAt), depth: side * Math.cos(turnAt), strand })
    }
  beads.sort((a, b) => a.depth - b.depth || a.x - b.x)
  cellType('Actin filament', [['actin', pale]],
    boxGrad('strand-1-gradient', pale) + boxGrad('strand-2-gradient', full),
    `<g id="filament">${beads.map((b) => g.circle(b.x, b.y, R, `url(#strand-${b.strand + 1}-gradient)`, b.strand ? full.outline : pale.outline, 6)).join('')}</g>`)
}
// Centrosome: two centrioles at a right angle, the cloud of material round them and the microtubules that grow from it.
// (Added: the pericentriolar material, a pale disc: SiliCoDraw's microtubules start in empty space. The lines along
// each centriole stand for its triplets of microtubules.)
{
  const g = page(4.91, [0, 0]), centriole = soft(PROTEIN), tubule = soft(TUBULE)
  const rays = Array.from({ length: 12 }, (_, i) => [turn(i * 30, [0, -24]), turn(i * 30, [0, -46])])
  cellType('Centrosome', [['centrioles', centriole], ['microtubules', tubule]],
    boxGrad('centriole-gradient', centriole),
    `<g id="microtubules">${rays.map((r) => g.line(r, tubule.small, 10)).join('')}</g>\n` +
      `<g id="pericentriolar-material">${g.circle(0, 0, 27, tubule.base)}</g>\n` +
      `<g id="centrioles">${g.path(rrect(g, -23, -1, 26, 14, 4), 'url(#centriole-gradient)', centriole.outline, 9)}${[3.7, 8.3].map((y) => g.line([[-18.5, y], [-1.5, y]], centriole.small, 5)).join('')}` +
      `${g.path(rrect(g, 9, -13, 14, 26, 4), 'url(#centriole-gradient)', centriole.outline, 9)}${[13.7, 18.3].map((x) => g.line([[x, -8.5], [x, 8.5]], centriole.small, 5)).join('')}</g>`)
}
// Lipid bilayer: two rows of seven lipids, heads outside and tails inside.
{
  const g = page(4.41, [0, 0])
  const xs = [-45, -30, -15, 0, 15, 30, 45]
  cellType('Lipid bilayer', [['lipids', LIPID]], lipidDefs, lipids(g, xs, 0, [[-49, 49]]))
}
// Ion channel: two subunits across the membrane with a pore between them, and ions passing through it.
{
  const g = page(4.33, [0, -0.5]), protein = soft(PROTEIN), ion = deep(CARGO)
  cellType('Ion channel', [['membrane', LIPID], ['channel', protein], ['ions', ion]],
    lipidDefs + boxGrad('channel-gradient', protein),
    lipids(g, [-46, -31, 31, 46], 0, [[-50, -20], [20, 50]]) + '\n' +
      `<g id="channel">${[-24, 6].map((x) => g.path(rrect(g, x, -34, 18, 68, 7), 'url(#channel-gradient)', protein.outline, 10) + g.hl(x + 5.5, -19, 4, 26, 0, protein.light)).join('')}</g>\n` +
      `<g id="ions">${[[-4, -47], [0.6, -3], [-2, 46]].map(([x, y]) => g.circle(x, y, 4.3, ion.small)).join('')}</g>`)
}
// Receptor: two chains across the membrane whose outer ends open like a cup and hold a ligand.
// (The membrane is drawn as in the lipid bilayer, so it is thicker than SiliCoDraw's band and the chains are longer to cross it.)
{
  const g = page(4.9, [0, 15]), protein = soft(PROTEIN), ligand = deep(CARGO)
  const chains = ['M-11,56 L-11,-2 C-11,-12 -18,-16 -23,-26', 'M11,56 L11,-2 C11,-12 18,-16 23,-26'].map((d) => ({ d: g.D(d), width: f(8 * g.k) }))
  cellType('Receptor', [['membrane', LIPID], ['receptor', protein], ['ligand', ligand]],
    lipidDefs + g.grad('receptor-gradient', [-27, -30, 15, 60], protein) + g.grad('ligand-gradient', [-9.5, -27.5, 9.5, -8.5], ligand),
    lipids(g, [-39.5, -24.5, 24.5, 39.5], 24, [[-43.5, 43.5]]) + '\n' +
      `<g id="receptor">${g.union(chains, 'url(#receptor-gradient)', protein.outline, 8)}${[-13.2, 8.8].map((x) => g.hl(x, 20, 3.5, 24, 0, protein.light)).join('')}</g>\n` +
      `<g id="ligand">${g.circle(0, -18, 9.5, 'url(#ligand-gradient)', ligand.outline, 8)}${g.hl(-3.5, -22, 12, 5, -40, ligand.light)}</g>`)
}
// Cell division: a cell pinching into two (cytokinesis), a nucleus in each half.
// (SiliCoDraw's outline, with the two sharp tips of the furrow rounded a little: under a 12 px membrane they looked like thorns.)
{
  const g = page(4.86, [0, 0]), cyto = soft(BLUE)
  cellType('Cell division', [['cytoplasm', cyto], ['nucleus', NUC]],
    g.grad('cell-gradient', [-46, -37, 46, 37], cyto) + boxGrad('nucleus-gradient', NUC),
    `<g id="cytoplasm">${g.path(g.D('M-3,-22 C-8,-34 -22,-40 -34,-30 C-50,-16 -50,16 -34,30 C-22,40 -8,34 -3,22 Q0,14.8 3,22 C8,34 22,40 34,30 C50,16 50,-16 34,-30 C22,-40 8,-34 3,-22 Q0,-14.8 -3,-22 Z'), 'url(#cell-gradient)', cyto.outline, 12)}${g.hl(-32, -21, 20, 7, -45, cyto.light)}${g.hl(16, -27, 18, 6, -20, cyto.light)}</g>\n` +
      `<g id="nuclei">${[-24, 24].map((x) => g.circle(x, 0, 11, 'url(#nucleus-gradient)', NUC.outline, 10) + g.hl(x - 4.6, -5, 13, 5, -45, NUC.light)).join('')}</g>`)
}
// Apoptosis: a shrunken cell whose nucleus has broken into dense pieces, with the bodies it sheds round it.
// (The grey of SiliCoDraw's dying cell is kept, tinted with its own bluish hue; the pieces of the nucleus are the lilac
// of every nucleus, in its deeper tone because their chromatin is condensed.)
{
  const g = page(5.31, [4.6, 5.6]), cyto = ashen(DYING)
  const bodies = [[36, -28, 8], [40, 20, 7], [-30, 38, 8], [12, 42, 6]]
  cellType('Apoptosis', [['cell', cyto], ['nucleus', NUC]],
    g.grad('cell-gradient', [-36, -36, 28, 28], cyto) + boxGrad('body-gradient', cyto),
    `<g id="cell">${g.path(g.smooth([[-30, -20], [-10, -36], [14, -30], [28, -10], [20, 16], [0, 28], [-24, 18], [-36, 0]]), 'url(#cell-gradient)', cyto.outline, 12)}${g.hl(-19, -21, 20, 7, -40, cyto.light)}</g>\n` +
      `<g id="apoptotic-bodies">${bodies.map(([x, y, r]) => g.circle(x, y, r, 'url(#body-gradient)', cyto.outline, 8)).join('')}</g>\n` +
      `<g id="nuclear-fragments">${[[-6, -4, 8, 8], [14, 8, 5, 7], [-18, 8, 4, 6]].map(([x, y, r, w]) => g.circle(x, y, r, NUC.small, NUC.outline, w)).join('')}${g.circle(36, -28, 3.4, NUC.outline)}</g>`)
}
// Tumour: a clump of five cells lying over one another, each with a large nucleus.
// (Corrected: SiliCoDraw's middle cell has no nucleus and covers part of the others'; here every cell has one, and the
// nuclei of the outer cells sit a little off centre so that none is cut. The rose of the approved cancer cell.)
{
  const g = page(5.33, [0, 0]), cyto = soft(TUMOUR)
  const cells = [[-20, -14, 22, -23.6, -16.1, 8], [14, -18, 20, 18.1, -22.7, 8], [22, 14, 20, 23, 15, 8], [-12, 16, 22, -15.3, 20.9, 8], [0, -2, 18, 0, -2, 7]]
  const lights = [[-34, -27, 18, 6, -45], [4, -31, 14, 5, -30], [27, -1.5, 12, 4, -8], [-25, 4.5, 12, 4, -50], null]
  cellType('Tumour', [['cytoplasm', cyto], ['nucleus', NUC]],
    boxGrad('cell-gradient', cyto) + boxGrad('nucleus-gradient', NUC),
    cells.map(([x, y, r, nx, ny, nr], i) =>
      `<g id="cell-${i + 1}">${g.circle(x, y, r, 'url(#cell-gradient)', cyto.outline, 12)}${lights[i] ? g.hl(...lights[i], cyto.light) : ''}` +
      `${g.circle(nx, ny, nr, 'url(#nucleus-gradient)', NUC.outline, 9)}${g.hl(nx - nr * 0.4, ny - nr * 0.42, f(nr * g.k * 0.26), f(nr * g.k * 0.11), -45, NUC.light)}</g>`).join('\n'))
}

check()
console.log('written to', OUT)
