// Cells of the nervous system from SiliCoDraw (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md beside the Neuron of
// ../silicodraw.mjs: their shapes, read by hand from the source in a 100 × 100 box centred on 0,0, scaled onto a 512 page.
// Neurons are the neuron's peach, myelin its pale blue; each kind of glia has a hue of its own.
// Usage: node nervous.mjs <folder>
import { rich, soft } from '../colour.mjs'
import { BLUE, GREEN, NUC, PEACH, cellTypes, circleD, nucGrad, nucleus, page } from '../cellkit.mjs'
import { f } from '../shapes.mjs'

const OUT = process.argv[2]
const { cellType, check } = cellTypes(OUT)

/** Their path data (M, L, C, H, V and lower-case l, c, h, v) written out in absolute M, L and C, with every point passed through `map`. */
const abs = (d, map = (p) => p) => {
  const tok = d.match(/[MLCHVZmlchvz]|-?\d*\.?\d+/g)
  let i = 0, cmd = '', x = 0, y = 0, out = ''
  const num = () => +tok[i++]
  const pt = (px, py) => { const [a, b] = map([px, py]); return `${f(a)},${f(b)}` }
  while (i < tok.length) {
    if (/[A-Za-z]/.test(tok[i])) cmd = tok[i++]
    if (cmd === 'M' || cmd === 'L') { x = num(); y = num(); out += `${cmd}${pt(x, y)} ` }
    else if (cmd === 'l') { x += num(); y += num(); out += `L${pt(x, y)} ` }
    else if (cmd === 'H' || cmd === 'h') { x = cmd === 'H' ? num() : x + num(); out += `L${pt(x, y)} ` }
    else if (cmd === 'V' || cmd === 'v') { y = cmd === 'V' ? num() : y + num(); out += `L${pt(x, y)} ` }
    else if (cmd === 'C' || cmd === 'c') {
      const q = [num(), num(), num(), num(), num(), num()]
      if (cmd === 'c') for (let j = 0; j < 6; j++) q[j] += j % 2 ? y : x
      out += `C${pt(q[0], q[1])} ${pt(q[2], q[3])} ${pt(q[4], q[5])} `; x = q[4]; y = q[5]
    } else if (cmd === 'Z' || cmd === 'z') out += 'Z '
  }
  return out.trim()
}
/** A process of a cell as a tube for `g.union`, from their path data, `width` pixels wide. */
const tube = (g, d, width, map) => ({ d: g.D(abs(d, map)), width })
/** Their path data split at every move, so a branching stroke becomes one tube per branch. */
const strands = (d) => d.split(/(?=M)/).map((s) => s.trim()).filter(Boolean)
const turn = (deg) => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return ([x, y]) => [x * c - y * s, x * s + y * c] }

// Glia in hues of their own, away from the peach of neurons, the blue of myelin and the lilac of nuclei.
const NEURON = soft(PEACH), MYELIN = soft(BLUE)
const ASTRO = rich(85), MICRO = soft(GREEN), OLIGO = soft(195), SCHWANN = soft(175)

// Astrocyte: a star-shaped cell, eight branching processes all round a small body with its nucleus.
{
  const g = page(5.08, [0, 0])
  const arm = 'M0,-14C-4,-26 2,-34 0,-46M0,-30l-8,-6M0,-36l7,-5'
  const arms = Array.from({ length: 8 }, (_, i) => strands(arm).map((s, j) => tube(g, s, j ? 9 : 11, turn(i * 45 + 22)))).flat()
  cellType('Astrocyte', [['cell', ASTRO], ['nucleus', NUC]],
    g.grad('cell-gradient', [-46, -46, 46, 46], ASTRO) + nucGrad(g, 0, 0, 7),
    `<g id="cell">${g.union([...arms, g.smooth([[-16, -10], [0, -18], [16, -10], [18, 8], [4, 18], [-12, 14], [-20, 2]])], 'url(#cell-gradient)', ASTRO.outline, 6)}${g.hl(-10, -10, 13, 5, -35, ASTRO.light)}</g>\n` +
      nucleus(g, 0, 0, 7, 7))
}

// Microglia: the brain's resident macrophage, a small body with long, finely branched processes.
{
  const g = page(4.76, [0, -2.9])
  const main = ['M-8,-8C-16,-20 -22,-28 -34,-36', 'M6,-10C12,-22 18,-30 32,-40', 'M12,2C24,2 34,8 46,4', 'M6,10C12,22 20,30 36,36', 'M-6,10C-10,22 -18,30 -34,38', 'M-12,0C-24,-2 -34,6 -46,0']
  const twigs = ['M-22,-28l-10,2', 'M-28,-32l2,-10', 'M18,-30l10,0', 'M22,-34l-2,-10', 'M34,8l6,8', 'M30,6l4,-8', 'M20,30l8,-2', 'M14,24l-6,6', 'M-18,30l-8,-4', 'M-12,24l6,8', 'M-34,6l-6,-8', 'M-30,4l-2,8']
  cellType('Microglia', [['cell', MICRO], ['nucleus', NUC]],
    g.grad('cell-gradient', [-46, -40, 46, 38], MICRO) + nucGrad(g, 0, 0, 4.5),
    `<g id="cell">${g.union([...main.map((d) => tube(g, d, 10)), ...twigs.map((d) => tube(g, d, 8)), g.smooth([[-10, -9], [2, -11], [11, -3], [10, 8], [0, 12], [-10, 8], [-13, 0]])], 'url(#cell-gradient)', MICRO.outline, 5)}${g.hl(-6, -6, 9, 3.5, -35, MICRO.light)}</g>\n` +
      nucleus(g, 0, 0, 4.5, 6))
}

// Oligodendrocyte: one cell in the CNS whose processes each wrap a segment of myelin round a different axon.
{
  const g = page(4.66, [0, 3])
  const axons = [8, 24, 40].map((y) => tube(g, `M-47,${y}H47`, 12))
  const procs = strands('M-6,-26C-18,-18 -26,-8 -30,2M-6,-26C-2,-14 2,0 6,18M-6,-26C10,-16 24,0 30,34').map((d) => tube(g, d, 10))
  cellType('Oligodendrocyte', [['axons', NEURON], ['cell', OLIGO], ['myelin', MYELIN], ['nucleus', NUC]],
    g.grad('axon-gradient', [-50, 4, 50, 44], NEURON) + g.grad('cell-gradient', [-16, -40, 30, 34], OLIGO) + g.grad('myelin-gradient', [-44, 2, 44, 46], MYELIN) + nucGrad(g, -4, -29, 4.5),
    `<g id="axons">${g.union(axons, 'url(#axon-gradient)', NEURON.outline, 5)}</g>\n` +
      `<g id="cell">${g.union([...procs, g.smooth([[-16, -30], [-6, -40], [6, -36], [8, -24], [-2, -18], [-14, -22]])], 'url(#cell-gradient)', OLIGO.outline, 6)}${g.hl(-10, -33, 10, 4, -40, OLIGO.light)}</g>\n` +
      `<g id="myelin">${[[-30, 8], [6, 24], [30, 40]].map(([x, y]) => `<rect x="${f(g.X(x - 14))}" y="${f(g.Y(y - 6))}" width="${f(28 * g.k)}" height="${f(12 * g.k)}" rx="${f(6 * g.k)}" fill="url(#myelin-gradient)" stroke="${MYELIN.outline}" stroke-width="6"/>`).join('')}</g>\n` +
      nucleus(g, -3, -29, 4.5, 6))
}

// Schwann cell: in a peripheral nerve one cell makes one segment of myelin round an axon; its nucleus and cytoplasm sit on top.
{
  const g = page(5.05, [0, -5.5])
  cellType('Schwann cell', [['axon', NEURON], ['myelin', MYELIN], ['cell', SCHWANN], ['nucleus', NUC]],
    g.grad('axon-gradient', [-50, -4, 50, 4], NEURON) + g.grad('myelin-gradient', [-32, -16, 32, 16], MYELIN) + g.grad('cell-gradient', [-16, -28, 16, -12], SCHWANN) + g.grad('nucleus-gradient', [-7, -23, 7, -17], NUC),
    `<g id="axon">${g.union([tube(g, 'M-43,0H43', 16)], 'url(#axon-gradient)', NEURON.outline, 5)}</g>\n` +
      `<g id="cell">${g.path(g.D(abs('M-17,-14C-15,-29 15,-29 17,-14Z')), 'url(#cell-gradient)', SCHWANN.outline, 7)}</g>\n` +
      `<g id="myelin"><rect x="${f(g.X(-32))}" y="${f(g.Y(-16))}" width="${f(64 * g.k)}" height="${f(32 * g.k)}" rx="${f(14 * g.k)}" fill="url(#myelin-gradient)" stroke="${MYELIN.outline}" stroke-width="12"/>` +
      `<rect x="${f(g.X(-25))}" y="${f(g.Y(-9))}" width="${f(50 * g.k)}" height="${f(18 * g.k)}" rx="${f(8 * g.k)}" fill="none" stroke="${MYELIN.small}" stroke-width="5"/>${g.hl(-22, -10, 26, 7, -12, MYELIN.light)}</g>\n` +
      `<g id="nucleus">${g.ellipse(0, -20.5, 7.5, 3.4, 0, 'url(#nucleus-gradient)', NUC.outline, 5)}</g>`)
}

// Purkinje cell: a pear-shaped body under a wide, flat, much-branched dendritic tree, the axon leaving below.
{
  const g = page(4.5, [0, 1])
  const trunks = strands('M0,14C0,0 -4,-10 -12,-18M0,14C0,0 4,-10 12,-18').map((d) => tube(g, d, 12))
  const limbs = strands('M-12,-18C-20,-26 -30,-30 -40,-44M-12,-18C-16,-30 -14,-40 -18,-48M-12,-18C-6,-26 -6,-34 -5,-46M12,-18C20,-26 30,-30 40,-44M12,-18C16,-30 14,-40 18,-48M12,-18C6,-26 6,-34 5,-46M-26,-32C-32,-34 -38,-34 -46,-30M26,-32C32,-34 38,-34 46,-30').map((d) => tube(g, d, 9))
  const twigs = strands('M-15,-36l-8,-6M15,-36l8,-6M-8,-34l-6,-8M8,-34l6,-8M-34,-40l-6,-8M34,-40l6,-8M-16,-42l-6,-2M16,-42l6,-2M-6,-39l-4,-6M6,-39l4,-6M-30,-32l-4,-10M30,-32l4,-10').map((d) => tube(g, d, 7))
  const axon = strands('M0,28V46M0,46l-5,4M0,46l5,4').map((d) => tube(g, d, 9))
  cellType('Purkinje cell', [['cell', NEURON], ['nucleus', NUC]],
    g.grad('cell-gradient', [-46, -48, 46, 50], NEURON) + nucGrad(g, 0, 10, 5),
    `<g id="cell">${g.union([...trunks, ...limbs, ...twigs, ...axon, g.D(abs('M-12,10C-12,-2 12,-2 12,10C12,20 4,24 0,28C-4,24 -12,20 -12,10Z'))], 'url(#cell-gradient)', NEURON.outline, 5)}${g.hl(-6, 3, 9, 3.5, -40, NEURON.light)}</g>\n` +
      nucleus(g, 0, 10.5, 5, 6))
}

// Pyramidal neuron: a triangular body, one long apical dendrite rising to a tuft, basal dendrites below, the axon down.
{
  const g = page(4.4, [0, 0])
  const dendrites = strands('M0,-4V-48M0,-30l-12,-10M0,-30l12,-10M0,-44l-8,-6M0,-44l8,-6M-14,14l-24,14M-24,20l-11,-1M14,14l24,14M24,20l11,-1M-10,18l-20,24M10,18l20,24').map((d) => tube(g, d, /V-48/.test(d) ? 12 : 9))
  const axon = strands('M0,16V46M0,46l-5,4M0,46l5,4').map((d) => tube(g, d, 9))
  // Their sharp triangle, with its corners rounded as a cell's are.
  const soma = abs('M-3,-7.5C-1.5,-10 1.5,-10 3,-7.5L17,14C18.5,16.5 17,18.5 14,18.5L-14,18.5C-17,18.5 -18.5,16.5 -17,14Z')
  cellType('Pyramidal neuron', [['cell', NEURON], ['nucleus', NUC]],
    g.grad('cell-gradient', [-38, -48, 38, 50], NEURON) + nucGrad(g, 0, 7, 5),
    `<g id="cell">${g.union([...dendrites, ...axon, g.D(soma)], 'url(#cell-gradient)', NEURON.outline, 5)}${g.hl(-6, 4, 8, 3, -58, NEURON.light)}</g>\n` +
      nucleus(g, 0, 8, 5, 6))
}

// Photoreceptor (a rod): the outer segment stacked with discs, the inner segment and cell body with its nucleus, the
// axon ending in a synaptic terminal; light falls on the outer segment from the right.
{
  const g = page(4.26, [15.3, -4]), outer = soft(278), light = rich(95)
  cellType('Photoreceptor', [['cell', NEURON], ['outer segment', outer], ['nucleus', NUC], ['light', light]],
    g.grad('cell-gradient', [-10, -8, 10, 48], NEURON) + g.grad('outer-gradient', [-9, -48, 9, -8], outer) + g.grad('nucleus-gradient', [-6, 1, 6, 15], NUC),
    `<g id="cell">${g.union([tube(g, 'M0,20V41', 9), circleD(g, 0, 44, 4.5), g.D(abs('M-4,-8L4,-8C7.5,-8 10,-5.5 10,-2L10,16C10,19.5 7.5,22 4,22L-4,22C-7.5,22 -10,19.5 -10,16L-10,-2C-10,-5.5 -7.5,-8 -4,-8Z'))], 'url(#cell-gradient)', NEURON.outline, 6)}${g.hl(-5.5, -3, 8, 3, -60, NEURON.light)}</g>\n` +
      `<g id="outer-segment"><rect x="${f(g.X(-9))}" y="${f(g.Y(-49))}" width="${f(18 * g.k)}" height="${f(40 * g.k)}" rx="${f(4 * g.k)}" fill="url(#outer-gradient)" stroke="${outer.outline}" stroke-width="8"/>` +
      `${[-41, -34.5, -28, -21.5, -15].map((y) => g.line([[-5, y], [5, y]], outer.small, 6)).join('')}</g>\n` +
      `<g id="nucleus">${g.ellipse(0, 8, 6, 7, 0, 'url(#nucleus-gradient)', NUC.outline, 6)}${g.hl(-2.8, 4.5, 7, 3, -50, NUC.light)}</g>\n` +
      `<g id="light">${[[[39, -57], [22, -49]], [[41, -38], [22, -38]], [[39, -19], [22, -27]]].map(([a, b]) => {
        const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy), ux = dx / n, uy = dy / n
        const tip = [b[0] - ux, b[1] - uy], back = [tip[0] - ux * 8, tip[1] - uy * 8]
        const wing = (s) => [back[0] - uy * 5 * s, back[1] + ux * 5 * s]
        return g.line([a, [back[0] + ux * 1.5, back[1] + uy * 1.5]], light.small, 9) + g.path(g.D(`M${tip.join(',')} L${wing(1).join(',')} L${wing(-1).join(',')} Z`), light.small, light.small, 4)
      }).join('')}</g>`)
}

// Hair cell: a cell of the inner ear with a staircase of stereocilia on top, contacted at its base by nerve endings.
// (Their tops are set a little higher than SiliCoDraw's, so that the shortest still show above the rounded top of the cell.)
{
  const g = page(4.6, [0, -0.6]), body = rich(95), cilia = soft(250)
  const ends = [-1, 1].map((s) => [tube(g, `M${s * 36},47C${s * 36},40 ${s * 31},35 ${s * 24},33.5`, 8), circleD(g, s * 22.5, 33, 4.6)]).flat()
  cellType('Hair cell', [['cell', body], ['stereocilia', cilia], ['nucleus', NUC], ['nerve endings', NEURON]],
    g.grad('cell-gradient', [-18, -28, 18, 46], body) + g.grad('cilia-gradient', [-14, -50, 14, -26], cilia) + g.grad('nerve-gradient', [-38, 22, 38, 48], NEURON) + g.grad('nucleus-gradient', [-9, 15, 9, 29], NUC),
    `<g id="base">${g.line([[-45, 47], [45, 47]], '#A3A3A3', 7)}</g>\n` +
      `<g id="stereocilia">${g.union([[-12, -29], [-6, -33.5], [0, -38], [6, -43], [12, -48]].map(([x, top]) => tube(g, `M${x},-22V${top}`, 13)), 'url(#cilia-gradient)', cilia.outline, 4)}</g>\n` +
      `<g id="cell">${g.path(g.D(abs('M-18,46V-10C-18,-22 -10,-28 0,-28C10,-28 18,-22 18,-10V46Z')), 'url(#cell-gradient)', body.outline, 10)}${g.hl(-10, -16, 14, 5, -50, body.light)}</g>\n` +
      `<g id="nerve-endings">${g.union(ends, 'url(#nerve-gradient)', NEURON.outline, 5)}</g>\n` +
      `<g id="nucleus">${g.ellipse(0, 22, 9, 7, 0, 'url(#nucleus-gradient)', NUC.outline, 8)}${g.hl(-4, 18.5, 10, 4, -30, NUC.light)}</g>`)
}

check()
console.log('written to', OUT)
