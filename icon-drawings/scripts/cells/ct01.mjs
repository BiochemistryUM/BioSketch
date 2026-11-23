// Organelles of SiliCoDraw (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md with the kit in ../cellkit.mjs:
// their shapes, read by hand from the source in a 100 × 100 box centred on 0,0, scaled onto a 512 page.
// The batch holds the nucleus, the endoplasmic reticulum, a ribosome, a lysosome, a peroxisome, a vesicle, an exosome and
// a microtubule. The nucleus is the lilac of every nucleus of the set. What is not the organelle itself has a hue of its
// own, the same in every icon: RNA is rose, protein (a growing chain, cargo, surface proteins) is amber.
// Usage: node ct01.mjs <folder>
import { NUC, cellTypes, page } from '../cellkit.mjs'
import { deep, hueOf, soft, toLch } from '../colour.mjs'
import { f } from '../shapes.mjs'

const OUT = process.argv[2]
const { cellType, check } = cellTypes(OUT)

// The hues of the set (OKLCH degrees). The nucleus lilac is about 319°.
const NUCLEUS = toLch(NUC.base).h
const ER = hueOf('#f8d7b4'), BOUND_RIBOSOME = 30 // SiliCoDraw's orange (52°) moved 22° on, away from the peach of the sheets
const RIBOSOME = hueOf('#dbe4f7'), RNA = 15, PROTEIN = 75
const LYSOSOME = 355 // SiliCoDraw's purple (315°) is the lilac of the nucleus: moved 40° on, to rose
const PEROXISOME = hueOf('#cfe8d8')
const VESICLE = hueOf('#e9d5f3')
const EXOSOME = hueOf('#dbe4f7')
const TUBE = hueOf('#cfe3f5'), ALPHA = 283 // SiliCoDraw's darker blue (267°) moved 16° on, away from the blue of the tube

/** A rounded rectangle given in their units, as a path on the page. */
const rrect = (g, x, y, w, h, r) => {
  const [x0, y0] = g.P([x, y]), W = w * g.k, H = h * g.k, R = Math.min(r * g.k, W / 2, H / 2)
  return `M${f(x0 + R)},${f(y0)} H${f(x0 + W - R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + W)},${f(y0 + R)} V${f(y0 + H - R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + W - R)},${f(y0 + H)} H${f(x0 + R)} A${f(R)},${f(R)} 0 0 1 ${f(x0)},${f(y0 + H - R)} V${f(y0 + R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + R)},${f(y0)} Z`
}
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
/** An open curve given in their units (M and C only), drawn as a line with round ends. */
const curve = (g, d, colour, w) => `<path d="${g.D(d)}" fill="none" stroke="${colour}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`
/** One gradient that lights every shape that uses it from its own top left (several sheets, several vesicles). */
const boxGrad = (id, pal) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`
/** A circle of `n` dashes with round ends (radius in their units, width in pixels; `share` of each step is drawn). */
const dashes = (g, x, y, r, n, share, colour, w) => {
  const step = (2 * Math.PI * r * g.k) / n
  return `<circle cx="${f(g.X(x))}" cy="${f(g.Y(y))}" r="${f(r * g.k)}" fill="none" stroke="${colour}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${f(step * share - w)} ${f(step * (1 - share) + w)}"/>`
}
/** The highlight of a round body of radius r (their units), at its top left. */
const shine = (g, x, y, r, pal) => g.hl(x - r * 0.42, y - r * 0.45, f(r * g.k * 0.24), f(r * g.k * 0.09), -45, pal.light)

// Nucleus: the envelope (two membranes, the inner one broken by pores), chromatin threads and a nucleolus.
{
  const g = page(5.33, [0, 0]), dark = deep(NUCLEUS)
  const chromatin = ['M-28,-14 C-20,-20 -14,-12 -8,-18', 'M-28,14 C-18,18 -12,8 -4,14', 'M3,-28 C11,-26 13,-18 21,-22']
  cellType('Nucleus', [['nucleus', NUC]],
    g.grad('nucleus-gradient', [-35, -35, 35, 35], NUC) + g.grad('nucleolus-gradient', [-1, -5, 21, 17], { base: dark.base, shadow: dark.shadow }),
    `<g id="envelope">${g.circle(0, 0, 42, NUC.light, NUC.outline, 12)}${g.circle(0, 0, 36.6, 'url(#nucleus-gradient)')}${dashes(g, 0, 0, 36, 14, 0.74, NUC.outline, 7)}${g.hl(-16, -25.5, 22, 7, -28, NUC.light)}</g>\n` +
      `<g id="chromatin">${chromatin.map((d) => curve(g, d, dark.base, 10)).join('')}</g>\n` +
      `<g id="nucleolus">${g.circle(10, 6, 11, 'url(#nucleolus-gradient)', NUC.outline, 7)}${g.hl(5.6, 1.4, 12, 5, -45, NUC.light)}</g>`)
}
// Endoplasmic reticulum (rough): three flat sheets, one above the other, with ribosomes sitting on their membranes.
// (Corrected: SiliCoDraw puts ribosomes on the upper face of each sheet only; both faces of a sheet look into the cytosol
// and carry them. They are drawn before the sheets, so that each one is half hidden by the membrane it sits on.)
{
  const g = page(5.11, [0, 0]), sheet = soft(ER), ribo = deep(BOUND_RIBOSOME)
  const rows = [-26, 0, 26], at = [-35, -21, -7, 7, 21, 35], under = [-28, -14, 0, 14, 28]
  cellType('Endoplasmic reticulum', [['sheets', sheet], ['ribosomes', ribo]],
    boxGrad('sheet-gradient', sheet),
    `<g id="ribosomes">${rows.map((y) => at.map((x) => g.circle(x, y - 9.4, 3.2, ribo.small)).join('') + under.map((x) => g.circle(x, y + 9.4, 3.2, ribo.small)).join('')).join('')}</g>\n` +
      `<g id="sheets">${rows.map((y) => g.path(rrect(g, -44, y - 7, 88, 14, 7), 'url(#sheet-gradient)', sheet.outline, 9) + g.hl(-27, y - 2.6, 40, 5, 0, sheet.light)).join('')}</g>`)
}
// Ribosome: the large subunit above, the small one below (a darker tone of the same blue), the mRNA held between them and
// the growing chain leaving the large subunit at the top (SiliCoDraw's two loose beads, made a chain that starts at the subunit).
{
  const g = page(5.2, [0, -9.4]), large = soft(RIBOSOME), small = { ...large, base: large.shadow, shadow: large.small }, rna = deep(RNA), chain = deep(PROTEIN)
  cellType('Ribosome', [['ribosome', large], ['mRNA', rna], ['protein', chain]],
    g.grad('large-gradient', [-30, -37.3, 30, 6.7], large) + g.grad('small-gradient', [-22, 9.4, 22, 33.4], small),
    `<g id="protein">${[[-9, -37.8], [-5.5, -44], [1, -48.1], [8.4, -49.4]].map(([x, y]) => g.circle(x, y, 3.7, chain.small)).join('')}</g>\n` +
      `<g id="mRNA">${g.line([[-43, 8], [43, 8]], rna.small, 12)}</g>\n` +
      `<g id="large-subunit">${g.ellipse(0, -15.3, 30, 22, 0, 'url(#large-gradient)', large.outline, 10)}${g.hl(-13, -27.8, 32, 10, -22, large.light)}</g>\n` +
      `<g id="small-subunit">${g.ellipse(0, 21.4, 22, 12, 0, 'url(#small-gradient)', small.outline, 10)}${g.hl(-9, 14.6, 22, 6, -10, small.light)}</g>`)
}
// Lysosome: a round body inside one thick membrane (pale, with a soft inner edge, so that it is not read as two membranes),
// with material being broken down and enzymes around it.
{
  const g = page(6.22, [0, 0]), pal = soft(LYSOSOME)
  cellType('Lysosome', [['lysosome', pal]],
    g.grad('lumen-gradient', [-30, -30, 30, 30], pal),
    `<g id="membrane">${g.circle(0, 0, 36, pal.light, pal.outline, 12)}</g>\n` +
      `<g id="lumen">${g.circle(0, 0, 30, 'url(#lumen-gradient)', pal.small, 6)}${g.hl(-15, -17, 40, 14, -40, pal.light)}</g>\n` +
      `<g id="contents">${g.path(g.smooth([[-12, -7], [-2, -13], [10, -5], [16, 7], [8, 17], [-6, 15], [-14, 5]]), pal.small)}</g>\n` +
      `<g id="enzymes">${[[-21, 8], [13, -20], [22, 12], [-9, 23]].map(([x, y]) => g.circle(x, y, 3.1, pal.outline)).join('')}</g>`)
}
// Peroxisome: a round body inside one membrane, with its crystalline core.
{
  const g = page(7, [0, 0]), pal = soft(PEROXISOME), core = deep(PEROXISOME)
  const corners = [[0, -16], [16, -4], [10, 14], [-10, 14], [-16, -4]]
  cellType('Peroxisome', [['peroxisome', pal]],
    g.grad('matrix-gradient', [-32, -32, 32, 32], pal) + g.grad('core-gradient', [-16, -16, 16, 14], { base: core.base, shadow: core.shadow }),
    `<g id="matrix">${g.circle(0, 0, 32, 'url(#matrix-gradient)', pal.outline, 12)}${g.hl(-16, -17, 40, 14, -45, pal.light)}</g>\n` +
      `<g id="granules">${[[-21, 15], [22, -17], [18, 19]].map(([x, y]) => g.circle(x, y, 2.6, pal.small)).join('')}</g>\n` +
      `<g id="core">${g.path(roundPoly(g, corners, 2.2), 'url(#core-gradient)', pal.outline, 8)}${g.line([[0, -11], [0, 9.5]], core.small, 5)}${g.line([[-10.5, -3.2], [10.5, -3.2]], core.small, 5)}</g>`)
}
// Vesicle: a lumen inside a membrane drawn with its two faces (a bilayer), carrying cargo.
{
  const g = page(5.89, [0, 0]), pal = soft(VESICLE), cargo = deep(PROTEIN)
  cellType('Vesicle', [['vesicle', pal], ['cargo', cargo]],
    g.grad('lumen-gradient', [-31, -31, 31, 31], pal),
    `<g id="membrane">${g.circle(0, 0, 38, pal.light, pal.outline, 12)}</g>\n` +
      `<g id="lumen">${g.circle(0, 0, 31, 'url(#lumen-gradient)', pal.small, 6)}${shine(g, 0, 0, 31, pal)}</g>\n` +
      `<g id="cargo">${[[-9, -4, 7], [13, 9, 5.2], [7, -16, 4.2], [-11, 16, 4.2]].map(([x, y, r]) => g.circle(x, y, r, cargo.small)).join('')}</g>`)
}
// Exosome: a small vesicle with proteins standing out of its membrane and RNA inside, and smaller vesicles near it.
{
  const g = page(4.96, [0.5, -2.75]), pal = soft(EXOSOME), marker = deep(PROTEIN), rna = deep(RNA)
  const rays = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2).map((t) => [Math.cos(t), Math.sin(t)])
  cellType('Exosome', [['vesicle', pal], ['surface proteins', marker], ['RNA', rna]],
    g.grad('lumen-gradient', [-21, -21, 21, 21], pal) + boxGrad('small-gradient', pal),
    `<g id="surface-proteins">${rays.map(([x, y]) => g.line([[x * 26, y * 26], [x * 34, y * 34]], marker.small, 9) + g.circle(x * 36, y * 36, 3.5, marker.small)).join('')}</g>\n` +
      `<g id="membrane">${g.circle(0, 0, 26, pal.light, pal.outline, 10)}</g>\n` +
      `<g id="lumen">${g.circle(0, 0, 21, 'url(#lumen-gradient)', pal.small, 5)}${shine(g, 0, 0, 21, pal)}</g>\n` +
      `<g id="RNA">${curve(g, 'M-13,-1 C-9,-7 -3,-5 1,-1 C5,3 9,5 13,-1', rna.small, 9)}</g>\n` +
      `<g id="small-vesicles">${[[-38, -34, 7], [40, 30, 6], [34, -40, 4.5]].map(([x, y, r]) => g.circle(x, y, r, 'url(#small-gradient)', pal.outline, 6)).join('')}</g>`)
}
// Microtubule: a tube built of tubulin dimers, alpha and beta tubulin in turn along it.
// (Corrected: SiliCoDraw sets the two kinds like a chessboard in two rows of seven; in a microtubule neighbours across the
// tube are of one kind, each row a little further along than the one before, so the kinds form slanting rings. Three rows of
// eight here: whole dimers, alpha at one end and beta at the other.
// After the review of 23 November 2026 the tube is no longer a closed rounded box, which read as a tray of beads: it is a
// cylinder seen from the side, its right end open, so that the hollow shows.)
{
  const g = page(4.87, [0, 0]), tube = soft(TUBE), alpha = deep(ALPHA)
  const xs = [-36.75, -26.25, -15.75, -5.25, 5.25, 15.75, 26.25, 36.75].map((x) => x - 5), rows = [[-10.4, -1.3], [0, 0], [10.4, 1.3]]
  const beads = (odd, fill) => rows.map(([y, dx]) => xs.filter((_, i) => i % 2 === odd).map((x) => g.circle(x + dx, y, 4.7, fill)).join('')).join('')
  const wall = g.D('M-42,-18 L42,-18 C48.7,-18 48.7,18 42,18 L-42,18 C-48.7,18 -48.7,-18 -42,-18 Z')
  cellType('Microtubule', [['tube', tube], ['alpha tubulin', alpha]],
    g.grad('tube-gradient', [-46, -18, 46, 18], tube),
    `<g id="tube">${g.path(wall, 'url(#tube-gradient)', tube.outline, 12)}</g>\n<g id="lumen">${g.ellipse(42, 0, 5, 18, 0, tube.small, tube.outline, 8)}</g>\n` +
      `<g id="beta-tubulin">${beads(1, tube.small)}</g>\n` +
      `<g id="alpha-tubulin">${beads(0, alpha.outline)}</g>`)
}

check()
console.log('written to', OUT)
