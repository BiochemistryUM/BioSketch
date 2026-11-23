// Five icons of SiliCoDraw's "Cells & tissues" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts in ../parts/:
// ageing of tissues: germline immortality (the disposable soma), follicle atresia, a taste bud, nephron loss by
// glomerulosclerosis and emphysema. Their compositions are read by hand from the source in a 100 × 100 box centred on
// 0,0 and scaled onto a 512 page (`page` of ../cellkit.mjs).
// Parts used: placeCellType (Oocyte), vessel, vesselSection, arrow, cross (tissue.mjs); ligand (molecules.mjs).
// Drawn here because no part draws them: a soma as a small body of four cells, the wall of an ovarian follicle (theca,
// granulosa with healthy and pyknotic nuclei, antrum, apoptotic bodies), a block of stratified epithelium with a taste
// bud and its nerve fibres, a glomerulus with its capsule, tuft and scar, a cluster of alveoli and an enlarged airspace
// with broken septa.
// Nothing is lettered: the originals write nothing.
// Usage: node ct19.mjs <folder>
import { mkdirSync } from 'node:fs'
import { GREEN, NUC, PEACH, cellTypes, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex, toLch } from '../colour.mjs'
import { f } from '../shapes.mjs'
import { INK, VESSEL, arrow, cross, placeCellType, vessel, vesselSection } from '../parts/tissue.mjs'
import { ligand } from '../parts/molecules.mjs'
import { mergeParts } from '../parts/membranes.mjs'

const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const { cellType, check } = cellTypes(OUT)

// Hues (OKLCH degrees). Approved cell types keep theirs; the rest are moved only to stay 36° apart.
const ROSE = hueOf('#f6d0dc') // SiliCoDraw's rose of the follicle and the taste bud (357), 38° from the nucleus lilac
const SOMA = GREEN // the soma (SiliCoDraw: grey blue, which lies 27° from the oocyte's blue zona)
const NERVE = hueOf('#fde68a') // nerve fibres: the yellow of the set (96)
const TUBULE = 62 // Bowman's capsule and the tubule: epithelial peach moved 10°, to stay 44° from the vessel rose (18)
const LUNG = 347 // the air sacs of the approved Alveoli (ct04)
const BLOOD = hueOf('#d64545') // oxygen-rich blood of Alveoli
const LOOP = deep(hueOf(VESSEL.base)) // capillary loops: the vessel rose in its deep tones, full of blood
const CHROMATIN = deep(toLch(NUC.base).h)

/** A palette without colour (chroma below 0.012): never recoloured with a part, so never listed for check(). */
const grey = (l, h = 250) => ({ light: toHex({ l: Math.min(0.995, l + 0.04), c: 0.003, h }), base: toHex({ l, c: 0.006, h }), shadow: toHex({ l: l - 0.05, c: 0.008, h }), small: toHex({ l: l - 0.13, c: 0.009, h }), outline: toHex({ l: 0.56, c: 0.01, h }) })
/** A palette washed out towards white (a generation long gone): every tone mixed with white by t. */
const washed = (pal, t) => Object.fromEntries(Object.entries(pal).map(([k, v]) => [k, mixHex(v, '#FFFFFF', t)]))
const mixHex = (a, b, t) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('').toUpperCase()

const P2 = ([x, y]) => `${f(x)},${f(y)}`
const boxGrad = (id, pal) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`
/** An open curve in units of g (absolute M, L, C only), drawn as a line with round ends; width in pixels. */
const curve = (g, d, colour, w, extra = '') => `<path d="${g.D(d)}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`
/** A circle in units of g as a path (for unions). */
const circleD = (g, x, y, r) => { const [cx, cy] = g.P([x, y]), R = r * g.k; return `M${f(cx - R)},${f(cy)} A${f(R)},${f(R)} 0 1 0 ${f(cx + R)},${f(cy)} A${f(R)},${f(R)} 0 1 0 ${f(cx - R)},${f(cy)} Z` }
/** Joins the { defs, body, parts } of several parts; parts that share a palette are one. */
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), parts: mergeParts(ps.flatMap((p) => p.parts)) })
const icon = (name, { defs, body, parts }) => cellType(name, parts, defs, body)
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })
/** A drawing that belongs to a part already listed, or is grey (arrows): no palette of its own. */
const extra = (p) => ({ ...p, parts: [] })
/** The line of an arrow part dashed (a generation that is gone). */
const dashed = (p, dash) => ({ ...p, body: p.body.replace('stroke-linecap="round"', `stroke-linecap="round" stroke-dasharray="${dash}"`) })

// ---------------------------------------------------------------------------------------------------------------------
// Germline immortality (Weismann, the disposable soma): along the bottom the germ line runs on from generation to
// generation (oocytes, arrows between them); in each generation it gives rise to a soma, the body, which ages and dies.
// The soma of the oldest generation is gone (washed out, crossed), the next fading, the present one in full colour.
// (SiliCoDraw's orange germ cells are the approved Oocyte; its grey-blue soma, a small body of four lobes, is green with
// a lilac nucleus in each lobe, so that it stays apart from the oocyte's blue zona; the fading of its opacity is done by
// washing the colours towards white; the arrows of past generations are dashed and pale, as there.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.72, [0.5, -2.6]), soma = soft(SOMA), xs = [-32, 0, 32], Y = 26, S = 20.5
  const fades = [0.62, 0.32, 0]
  const pale = washed({ c: INK }, 0.55).c
  const somaOf = (x, y, i) => {
    const pal = washed(soma, fades[i]), nuc = washed(NUC, fades[i]), id = `soma-${i + 1}`
    const lobes = [[x - 7.5, y + 3, 8.4], [x + 7.5, y + 3, 8.4], [x, y - 7.5, 8.4], [x, y + 9.5, 6.8]]
    const borders = `M${x - 7.5},${y + 3}L${x},${y - 0.5}L${x + 7.5},${y + 3}M${x},${y - 0.5}L${x},${y - 7.5}`
    return own(id, g.union(lobes.map(([u, v, r]) => circleD(g, u, v, r)), `url(#${id}-gradient)`, pal.outline, 7) +
      curve(g, borders, pal.shadow, 3.5) +
      lobes.slice(0, 3).map(([u, v]) => g.circle(u, v, 2.9, nuc.base, nuc.outline, 3)).join('') +
      g.hl(x - 3, y - 11, 4, 1.6, -40, pal.light),
      i === 2 ? [['soma', soma], ['nucleus', NUC]] : [], g.grad(`${id}-gradient`, [x - 16, y - 16, x + 16, y + 16], pal))
  }
  const oocytes = xs.map((x, i) => placeCellType(g, 'Oocyte', { x, y: Y, size: S, id: `oocyte-${i + 1}` }))
  const germ = '#AF6E45' // the oocyte's outline: the germ line moves on
  icon('Germline immortality', join(
    ...xs.map((x, i) => somaOf(x, -26, i)),
    extra(cross(g, { x: xs[0] + 8, y: -40, size: 8, colour: pale, id: 'death' })),
    ...xs.map((x, i) => {
      const a = arrow(g, { points: [[x, Y - S / 2 - 1], [x, -8.5]], colour: i < 2 ? pale : INK, w: 6.5, id: `soma-arrow-${i + 1}` })
      return extra(i < 2 ? dashed(a, '10 11') : a)
    }),
    own('germ-line-past', curve(g, 'M-49.5,26L-44,26', germ, 8, ' stroke-dasharray="8 12"')),
    ...[[-21, -11], [11, 21], [43, 50]].map(([a, b], i) => extra(arrow(g, { points: [[a, Y], [b, Y]], colour: germ, w: 8, head: 22, id: `germ-line-${i + 1}` }))),
    ...oocytes,
  ))
}

// ---------------------------------------------------------------------------------------------------------------------
// Follicle atresia: an ovarian follicle that is dying. Round the outside the theca, inside it the granulosa layer, its
// healthy nuclei mixed with shrunken, dark (pyknotic) ones; apoptotic bodies float in the antrum, and the oocyte sits in
// its cumulus at the edge of the antrum.
// (SiliCoDraw's rose follicle keeps its hue; its shrunken oocyte is the approved Oocyte, which shows the zona that an
// oocyte keeps while its follicle dies; the antrum is a pale grey; pyknotic nuclei and the fragments of apoptotic bodies
// are the deep lilac of chromatin.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.87, [0, 0]), wall = soft(ROSE), fluid = grey(0.975, 0)
  const antrum = Array.from({ length: 14 }, (_, i) => { const t = (i / 14) * Math.PI * 2, r = 23 + (i % 3 === 0 ? -3 : i % 2 ? 2 : 0); return [r * Math.cos(t) + 3, r * Math.sin(t) + 3] })
  // Nuclei of the granulosa in a ring; every third is pyknotic.
  let healthy = '', pyknotic = ''
  for (let i = 0; i < 24; i++) {
    const t = (i / 24) * Math.PI * 2 + 0.13, r = 33 + (i % 2 ? 1.2 : -0.8), x = r * Math.cos(t), y = r * Math.sin(t)
    if (x < -10 && y < -8 && Math.hypot(x + 13, y + 12) < 18) continue // under the oocyte's cumulus
    if (i % 3 === 1) pyknotic += g.circle(x, y, 1.9, CHROMATIN.shadow)
    else healthy += g.circle(x, y, 2.4, NUC.base, NUC.outline, 3)
  }
  const bodies = [[17, 12], [21, 1], [7, 20], [21, -11], [-5, 21], [10, -14]]
  const ab = bodies.map(([x, y], i) => g.circle(x, y, 3.2, wall.light, wall.outline, 3.5) + g.circle(x + (i % 2 ? 1 : -1), y - 0.6, 1.2, CHROMATIN.shadow) + g.circle(x + (i % 2 ? -3.9 : 3.9), y + 2.6, 1.4, CHROMATIN.shadow)).join('')
  const thecaLines = 'M-40,-22C-44,-8 -44,8 -40,22M40,-22C44,-8 44,8 40,22M-22,-40C-8,-44 8,-44 22,-40M-22,40C-8,44 8,44 22,40'
  icon('Follicle atresia', join(
    own('theca', g.circle(0, 0, 46.5, wall.shadow, wall.outline, 10) + curve(g, thecaLines, wall.outline, 3), [['follicle', wall]]),
    own('granulosa', g.circle(0, 0, 39.5, 'url(#granulosa-gradient)', wall.outline, 5) + g.hl(-24, -27, 9, 2.6, -42, wall.light), [], g.grad('granulosa-gradient', [-39, -39, 39, 39], { base: wall.light, shadow: wall.base })),
    own('cumulus', g.circle(-13, -12, 15.5, wall.base)),
    own('antrum', g.path(g.smooth(antrum), fluid.base, wall.outline, 4.5)),
    own('granulosa-nuclei', healthy, [['nucleus', NUC]]),
    own('pyknotic-nuclei', pyknotic),
    own('apoptotic-bodies', ab),
    placeCellType(g, 'Oocyte', { x: -13, y: -12, size: 26, id: 'oocyte' }),
  ))
}

// ---------------------------------------------------------------------------------------------------------------------
// Taste bud: a block of stratified epithelium (tongue) holding an onion-shaped taste bud; its taste cells reach the
// surface at the taste pore with their microvilli, nerve fibres leave it below, and tastants arrive from above.
// (SiliCoDraw's rose epithelium is the peach of epithelial cells, the bud keeps its rose; the taste cells show their
// lilac nuclei; the nerve fibres are yellow, the tastants the green of small molecules (the ligand part), three where
// SiliCoDraw has three and two faint ones.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.72, [0, 0]), epi = soft(PEACH), bud = soft(ROSE), nerve = rich(NERVE)
  const top = 'M-44,-30L-7,-30C-4,-30 -3,-25.5 0,-25.5C3,-25.5 4,-30 7,-30L44,-30C46.2,-30 48,-28.2 48,-26L48,36C48,38.2 46.2,40 44,40L-44,40C-46.2,40 -48,38.2 -48,36L-48,-26C-48,-28.2 -46.2,-30 -44,-30Z'
  const cells = 'M-48,-12C-40,-10 -32,-14 -24,-12M24,-12C32,-14 40,-10 48,-12M-48,8C-40,10 -32,6 -24,8M24,8C32,6 40,10 48,8M-48,26C-40,28 -32,24 -22,26M22,26C32,24 40,28 48,26M-36,-30L-36,-12M36,-30L36,-12M-40,-12L-40,8M-30,-12L-30,8M40,-12L40,8M30,-12L30,8M-36,8L-36,26M36,8L36,26M-42,26L-42,40M-30,26L-30,40M42,26L42,40M30,26L30,40'
  const budPts = [[-5, -26], [-16, -21], [-23, -6], [-23, 12], [-17, 27], [0, 33], [17, 27], [23, 12], [23, -6], [16, -21], [5, -26]]
  const borders = [-12, 0, 12].map((x) => `M${f(x * 0.25)},-24C${f(x * 1.3)},-8 ${f(x * 1.3)},14 ${f(x * 0.8)},30`).join('')
  const nuclei = [[-15, 3, -6], [-5.5, 8, -2], [5.5, 2, 2], [15, 8, 6]].map(([x, y, r]) => g.ellipse(x, y, 2.5, 4.2, r, NUC.base, NUC.outline, 3)).join('')
  icon('Taste bud', join(
    own('epithelium', g.path(g.D(top), 'url(#epithelium-gradient)', epi.outline, 10) + curve(g, cells, epi.shadow, 3.5) + g.hl(-38, -25, 9, 2.4, -4, epi.light), [['epithelium', epi]], g.grad('epithelium-gradient', [-48, -30, 48, 40], epi)),
    own('nerve-fibres', curve(g, 'M-5,31C-7,37 -12,42 -16,48M4,31C6,38 10,43 14,48M0,32L0,48', nerve.outline, 8.5) + curve(g, 'M-5,31C-7,37 -12,42 -16,48M4,31C6,38 10,43 14,48M0,32L0,48', nerve.base, 4), [['nerve fibres', nerve]]),
    own('taste-bud', g.path(g.smooth(budPts), 'url(#bud-gradient)', bud.outline, 7) + curve(g, borders, bud.outline, 3.5) + g.hl(-14, -14, 5, 1.8, -60, bud.light), [['taste bud', bud]], g.grad('bud-gradient', [-23, -26, 23, 33], bud)),
    own('microvilli', curve(g, 'M-2.2,-24.5L-3.4,-32.5M0,-24.5L0,-33.5M2.2,-24.5L3.4,-32.5', bud.outline, 3.5)),
    own('taste-cell-nuclei', nuclei, [['nucleus', NUC]]),
    ...[[-17, -40.5, 7], [-3, -45, 6.2], [11, -40, 7], [24, -45.5, 5.6], [-30, -45, 5.6]].map(([x, y, s], i) => ligand(g, { x, y, size: s, id: `tastant-${i + 1}` })),
  ))
}

// ---------------------------------------------------------------------------------------------------------------------
// Nephron loss (glomerulosclerosis): a glomerulus in its Bowman's capsule, the afferent and efferent arterioles at its
// pole and the proximal tubule leaving below; part of its capillary tuft is replaced by scar (segmental sclerosis).
// Beside it a glomerulus that is wholly scarred (obsolescent): a lost nephron.
// (SiliCoDraw's rose capillary loops are vessels cut across with a red blood cell in each, as the vessel part draws
// them; the arterioles are vessels lengthwise; the capsule and tubule are the epithelium, a tan moved from the set's
// peach to stay apart from the vessels; the scar is a grey without colour, the stuff that is no longer tissue.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.72, [3.5, 2]), cap = soft(TUBULE), space = grey(0.985, 60), scar = grey(0.86, 30), tuft = VESSEL
  const loops = [[-22, -7], [-26, 6], [-21, 18], [-9, 21], [-14, -14], [-3, -14], [-14, 3], [-9, 10]]
  const tuftPts = [[-8, -20], [4, -19], [14, -10], [18, 4], [14, 18], [2, 25], [-12, 26], [-26, 19], [-31, 4], [-26, -11]]
  const scarD = 'M-1,-17C8,-17 16,-8 17,3C17,14 10,21 1,23C-3,15 -2,9 -4,2C-6,-5 -6,-12 -1,-17Z'
  const fibres = 'M2,-10C8,-7 10,-2 12,4M0,4C5,6 8,10 10,15'
  icon('Nephron loss', join(
    vessel(g, { points: [[-28, -46], [-24, -38], [-18, -32], [-14, -25]], size: 9, thick: 1, ends: 'open', id: 'afferent-arteriole', w: 5 }),
    vessel(g, { points: [[11, -46], [7, -40], [3, -33], [-1, -26]], size: 7, thick: 1, ends: 'open', id: 'efferent-arteriole', w: 4.5 }),
    own('tubule', curve(g, 'M9,32C15,38 20,41 22,46', cap.outline, 12 * g.k) + curve(g, 'M9,32C15,38 20,41 22,46', cap.base, 12 * g.k - 10) + curve(g, 'M11,34.5C16,39 19.5,42 21,46', space.base, 3.5 * g.k)),
    own('bowman-capsule', g.circle(-8, 4, 32, space.base, cap.outline, 10) + g.circle(-8, 4, 29.6, 'none', cap.shadow, 3), [['capsule and tubule', cap]]),
    own('capillary-tuft', g.path(g.smooth(tuftPts), 'url(#tuft-gradient)', tuft.outline, 5), [], g.grad('tuft-gradient', [-31, -20, 18, 26], { base: tuft.light, shadow: tuft.base })),
    ...loops.map(([x, y], i) => extra(vesselSection(g, { x, y, size: 12.8, wall: 0.36, cells: 0, w: 4.5, pal: LOOP, id: `capillary-${i + 1}` }))),
    own('scar', g.path(g.D(scarD), 'url(#scar-gradient)', scar.outline, 5.5) + curve(g, fibres, scar.outline, 3.5), [], g.grad('scar-gradient', [-6, -17, 17, 23], scar)),
    own('obsolete-glomerulus', g.circle(35, -30, 12.5, space.base, cap.outline, 8) + g.circle(35, -30, 9, 'url(#scar-gradient)', scar.outline, 5) +
      curve(g, 'M30,-31C31,-35 37,-36 40,-32M31.5,-26C34,-23.5 38,-24 40,-27.5', scar.outline, 3.5)),
  ))
}

// ---------------------------------------------------------------------------------------------------------------------
// Emphysema (enlarged airspaces): a bronchiole branches; on the left it ends in a healthy cluster of small alveoli with
// capillaries running over them, on the right in one large airspace whose walls (septa) are broken, only their stumps
// left, and almost no capillaries.
// (SiliCoDraw's pink and red are the air sacs and the oxygen-rich blood of the approved Alveoli (ct04); the inner circle
// of each alveolus is its air, a paler tone; the stumps end in a round knob, as SiliCoDraw draws two of them.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.92, [-1.5, -6.8]), sac = soft(LUNG), blood = deep(BLOOD)
  const al = [[-24, -6], [-35, 4], [-13, 4], [-30, 16], [-18, 17], [-24, 28], [-38, 24]]
  const E = [[18, -10], [30, -6], [40, 4], [43, 16], [38, 28], [28, 36], [14, 38], [2, 32], [-3, 20], [-1, 6], [6, -4]]
  const tube = (d) => ({ d: g.D(d), width: 6.4 * g.k })
  const stumps = [[[2, 32], [9, 26.5]], [[41.5, 22], [33.5, 20]], [[24, -7.5], [23, 0.5]], [[-2, 12], [5, 13]], [[33, 35], [30, 29]]]
  icon('Emphysema', join(
    own('airways', g.union([tube('M0,-48.5L0,-32'), tube('M0,-32C-6,-26 -16,-22 -22,-12'), tube('M0,-32C6,-26 12,-20 15,-8'), ...al.map(([x, y]) => circleD(g, x, y, 8.6)), g.smooth(E)], 'url(#sac-gradient)', sac.outline, 9) +
      curve(g, 'M-3,-45.5L3,-45.5M-3,-39.5L3,-39.5', sac.shadow, 3.5) +
      al.map(([x, y]) => g.circle(x, y, 5.9, sac.light, sac.shadow, 3.5)).join('') +
      g.hl(16, 1, 8, 2.6, -35, sac.light),
      [['air sacs', sac]], g.grad('sac-gradient', [-46, -50, 43, 38], sac)),
    own('broken-septa', stumps.map(([a, b]) => g.line([a, b], sac.outline, 6) + g.circle(...b, 1.7, sac.outline)).join('')),
    own('capillaries', curve(g, 'M-43,10C-34,6 -28,12 -20,8C-14,5 -10,10 -6,8M-42,26C-36,21 -30,28 -24,22C-18,17 -14,24 -10,20M38,6C34,8 32,6 30,9', blood.small, 6), [['blood', blood]]),
  ))
}

check()
