// Eight icons of SiliCoDraw's "Cells & tissues" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts in ../parts/:
// stem cell niches and senescence: the intestinal crypt, the hair follicle bulge, the subventricular zone, the bone
// marrow niche of haematopoietic stem cells, muscle regeneration, asymmetric stem cell division, replicative senescence
// (the Hayflick limit) and oncogene-induced senescence. Their compositions are read by hand from the source in a
// 100 × 100 box centred on 0,0 and scaled onto a 512 page (`page` of ../cellkit.mjs).
// Parts used: cell, placeCellType (Senescent cell), epithelium, vessel, arrow, lightning (tissue.mjs); nucleus
// (organelles.mjs); protein (molecules.mjs); letters (letters.mjs).
// Drawn here because no part draws them: the crypt's U of cells (`cryptCells`), a hair follicle with its sebaceous gland
// and arrector pili muscle, a radial B1 stem cell, a stellate CAR cell, an empty adipocyte of the marrow, osteoblasts
// lining bone, a muscle bundle in cross-section, a crescent of fate determinants.
// Lettered (strokes, ../parts/letters.mjs): "RAS" on RAS. Nothing else is written in the originals.
// Usage: node ct16.mjs <folder>
import { mkdirSync } from 'node:fs'
import { NUC, cellTypes, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex, toLch } from '../colour.mjs'
import { f } from '../shapes.mjs'
import { CELL, EPI, LAMINA, arrow, cell, epithelium, lightning, placeCellType, vessel } from '../parts/tissue.mjs'
import { nucleus } from '../parts/organelles.mjs'
import { protein } from '../parts/molecules.mjs'
import { mergeParts } from '../parts/membranes.mjs'
import { lettering, textWidth } from '../parts/letters.mjs'
import { readIcon } from '../iconkit.mjs'

const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const { cellType, check } = cellTypes(OUT)

// Hues (OKLCH degrees). Approved cell types keep theirs; the rest are moved only to stay 36° apart.
const STEM_GREEN = hueOf('#D5EFDF') // the satellite cell of the approved Muscle satellite cell (159): stem cells in tissues
const STEM_YELLOW = hueOf('#FFEFB0') // the approved Stem cell and Haematopoietic stem cell (96)
const ASTRO = hueOf('#FFEDC7') // the approved Astrocyte (B1 cells are astrocyte-like) (88)
const MUSCLE = hueOf('#FFDFE0') // muscle rose of the approved Muscle satellite cell (16)
const PANETH = 8 // Paneth cell granules, deep red (44° from the epithelial peach)
const PILI = 8 // arrector pili muscle (smooth muscle rose, 44° from the skin's peach)
const SEBUM = hueOf('#fde68a') // sebaceous gland: the yellow of the set (96)
const OSTEO = hueOf('#D9EAFF') // the approved Osteoblast's cells (254)
const CAR = 160 // CXCL12-abundant reticular cell (SiliCoDraw: grey pink)
const NEUROBLAST = 155 // neuroblasts (SiliCoDraw: a pale yellow grey; green to stay apart from B1 yellow and vessel rose)
const RAS = 175 // RAS (SiliCoDraw red, which lies 27° from the senescent cell's peach)
const YOUNG = 150 // young, dividing cells (SiliCoDraw blue, which lies on the senescent cell's blue granules)
const STEM = rich(STEM_YELLOW), CHROMATIN = deep(hueOf(NUC.base))
// A true grey for arrows that are no part's colour (the arrow part's INK lies on the blue of cells and granules).
const INK = toHex({ l: 0.5, c: 0.006, h: 250 })

/** A palette without colour (chroma below 0.012): never recoloured with a part, so never listed for check(). */
const grey = (l, h = 250) => ({ light: toHex({ l: Math.min(0.995, l + 0.04), c: 0.003, h }), base: toHex({ l, c: 0.006, h }), shadow: toHex({ l: l - 0.05, c: 0.008, h }), small: toHex({ l: l - 0.13, c: 0.009, h }), outline: toHex({ l: 0.56, c: 0.01, h }) })

const P2 = ([x, y]) => `${f(x)},${f(y)}`
const boxGrad = (id, pal) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`
/** A polygon in units of g as a path on the page. */
const poly = (g, pts) => `M${pts.map(g.P).map(P2).join(' L')}Z`
/** A rounded rectangle in units of g. */
const rect = (g, x0, y0, x1, y1, r, fill, s = '', w = 0) => `<rect x="${f(g.X(x0))}" y="${f(g.Y(y0))}" width="${f((x1 - x0) * g.k)}" height="${f((y1 - y0) * g.k)}" rx="${f(r * g.k)}" fill="${fill}"${s ? ` stroke="${s}" stroke-width="${w}" stroke-linejoin="round"` : ''}/>`
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
/** A small lilac nucleus, flat or lit, with its outline (units of g). */
const nuc = (g, x, y, rx, ry = rx, rot = 0, w = 4) => g.ellipse(x, y, rx, ry, rot, 'url(#nucleus-gradient)', NUC.outline, w)
const nucDefs = boxGrad('nucleus-gradient', NUC)

// ---------------------------------------------------------------------------------------------------------------------
// Intestinal crypt: a U of epithelial cells dipping into the lamina propria. At its base, Lgr5⁺ stem cells (green)
// alternate with Paneth cells (pale, with red granules at their apex); above them the cells of the wall, and at the
// top the surface. A basement membrane runs along the outside of the U.
// (SiliCoDraw's rose epithelium is the peach of the set's epithelial cells, its rose lamina propria a pale grey, its
// granules red-brown deep red; seventeen cells along the U where it has twenty, so they stay bold at 40 px; a
// basement membrane added, blue as in Epithelium.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.88, [0, 0.75]), epi = EPI, stem = soft(STEM_GREEN), paneth = deep(PANETH)
  const Rr = 20, H = 10.5, y0 = -44.5, yb = 12, L1 = yb - y0, La = Math.PI * Rr, Tt = 2 * L1 + La, n = 17
  const Pt = (s, r) => { if (s <= L1) return [-Rr - r, y0 + s]; s -= L1; if (s <= La) { const t = Math.PI - s / Rr; return [(Rr + r) * Math.cos(t), yb + (Rr + r) * Math.sin(t)] } s -= La; return [Rr + r, yb - s] }
  const kind = (i) => (i >= 5 && i <= 11 ? (i % 2 ? 'stem' : 'paneth') : 'wall')
  let wall = '', stems = '', panes = '', nuclei = '', granules = ''
  for (let i = 0; i < n; i++) {
    const s0 = (i * Tt) / n, s1 = ((i + 1) * Tt) / n, sm = (s0 + s1) / 2
    const d = poly(g, [Pt(s0, H), Pt(sm, H), Pt(s1, H), Pt(s1, -H), Pt(sm, -H), Pt(s0, -H)])
    const k = kind(i)
    const fill = { wall: 'url(#crypt-gradient)', stem: 'url(#stem-gradient)', paneth: 'url(#paneth-gradient)' }[k]
    const out = g.path(d, fill, { wall: epi.outline, stem: stem.outline, paneth: epi.outline }[k], 4.5)
    if (k === 'wall') wall += out
    else if (k === 'stem') stems += out
    else panes += out
    // Nuclei at the base of every cell (outside of the U); a stem cell's fills more of it.
    const [nx, ny] = Pt(sm, k === 'stem' ? 3 : 5)
    const t = Math.atan2(Pt(s1, 0)[1] - Pt(s0, 0)[1], Pt(s1, 0)[0] - Pt(s0, 0)[0]) * 180 / Math.PI
    nuclei += nuc(g, nx, ny, k === 'stem' ? 3 : 2.6, k === 'stem' ? 3 : 2.2, t, 4)
    if (k === 'paneth') [[-1.7, -3.6], [1.7, -3.6], [0, -6.8], [-2.2, -7], [2.2, -7]].forEach(([u, r]) => { const [gx, gy] = Pt(sm + u, r); granules += g.circle(gx, gy, 1.35, paneth.shadow) })
  }
  // The surface on either side: two cells each.
  ;[[-47, -38.75], [-38.75, -30.5], [30.5, 38.75], [38.75, 47]].forEach(([x1, x2]) => {
    wall += g.path(poly(g, [[x1, -44.5], [x2, -44.5], [x2, -23.5], [x1, -23.5]]), 'url(#crypt-gradient)', epi.outline, 4.5)
    nuclei += nuc(g, (x1 + x2) / 2, -28.5, 2.2, 2.6, 0, 4)
  })
  const lp = grey(0.955, 20), lumen = grey(0.99, 250)
  const bm = `M-47,-22.5H${-Rr - H - 1.2}V${yb}` // basement membrane, then the arc round the base
  const arc = Array.from({ length: 33 }, (_, i) => { const t = Math.PI - (i / 32) * Math.PI; return [(Rr + H + 1.2) * Math.cos(t), yb + (Rr + H + 1.2) * Math.sin(t)] })
  const bmPts = [[-47, -22.3], [-Rr - H - 1.2, -22.3], ...arc, [Rr + H + 1.2, -22.3], [47, -22.3]]
  icon('Intestinal crypt', join(
    own('lamina-propria', g.path(`M${P2(g.P([-47, -24]))} L${P2(g.P([47, -24]))} L${P2(g.P([47, 40]))} Q${P2(g.P([47, 46]))} ${P2(g.P([41, 46]))} L${P2(g.P([-41, 46]))} Q${P2(g.P([-47, 46]))} ${P2(g.P([-47, 40]))} Z`, lp.base)),
    own('lumen', g.path(g.D(`M${-Rr + H},${y0}L${-Rr + H},${yb}C${-Rr + H},${yb + 12.5} ${Rr - H},${yb + 12.5} ${Rr - H},${yb}L${Rr - H},${y0}Z`), lumen.base)),
    own('basement-membrane', g.line(bmPts, LAMINA.outline, 6), [['basement membrane', LAMINA]]),
    own('epithelial-cells', wall, [['epithelial cells', epi]], boxGrad('crypt-gradient', epi)),
    own('paneth-cells', panes, [], boxGrad('paneth-gradient', { base: epi.light, shadow: epi.base })),
    own('stem-cells', stems, [['stem cells', stem]], boxGrad('stem-gradient', stem)),
    own('nuclei', nuclei, [['nucleus', NUC]], nucDefs),
    own('granules', granules, [['Paneth granules', paneth]]),
  ))
}

// ---------------------------------------------------------------------------------------------------------------------
// Hair follicle stem cells (bulge): a block of skin with the epidermis on top; a hair follicle runs down into the dermis,
// the hair shaft in it, the dermal papilla in its bulb. At the bulge, under the sebaceous gland (yellow) and where the
// arrector pili muscle (rose) inserts, sit the stem cells (green).
// (SiliCoDraw's peach dermis is a warm grey so that the epidermis and the follicle, one continuous epithelium, keep the
// keratinocyte peach; the hair is a dark grey; the wavy fibres of the dermis are left out; the stem cells have a
// lilac nucleus.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.85, [0, -1]), epi = EPI, stem = soft(STEM_GREEN), gland = rich(SEBUM), pili = soft(PILI)
  const dermis = grey(0.955, 70), papilla = grey(0.86, 40), hair = grey(0.36, 50)
  const follicle = 'M-14,-20.5L-14,19C-24,25 -22,42 -13,42C-10,42 -10,37 -6,37C-2,37 -2,42 1,42C10,42 12,25 2,19L2,-20.5Z'
  const stems = [[-16.5, -1], [-17.5, 6.5], [-16.5, 14], [4.5, 4], [4.5, 11.5]]
  const mus = 'M-15,6C-24,0 -32,-8 -39,-20'
  icon('Hair follicle stem cells', join(
    own('dermis', rect(g, -46, -30, 46, 46, 5, 'url(#dermis-gradient)', dermis.outline, 9), [], g.grad('dermis-gradient', [-46, -30, 46, 46], dermis)),
    own('epidermis', g.path(g.D('M-41,-30L41,-30C44,-30 46,-28 46,-25L46,-18C38,-15 30,-16 22,-18C14,-20 6,-17 -2,-18C-12,-19 -20,-15 -30,-17C-36,-18 -41,-17 -46,-18L-46,-25C-46,-28 -44,-30 -41,-30Z'), 'url(#epidermis-gradient)', epi.outline, 7) + g.hl(-36, -26.5, 22, 5, -6, epi.light),
      [['epidermis', epi]], g.grad('epidermis-gradient', [-46, -30, 46, -15], epi)),
    own('arrector-pili-muscle', curve(g, mus, pili.outline, 7.5 * g.k) + curve(g, mus, pili.base, 7.5 * g.k - 11), [['arrector pili muscle', pili]]),
    own('sebaceous-gland', g.path(g.smooth([[1, -15], [8, -18.5], [17, -15.5], [21, -8], [18, -0.5], [9, 1.5], [1, -2]]), 'url(#gland-gradient)', gland.outline, 7) +
      [[9.5, -10.5, 2.2], [15, -5.5, 1.8], [12.5, -13, 1.5]].map(([x, y, r]) => g.circle(x, y, r, gland.small)).join(''), [['sebaceous gland', gland]], g.grad('gland-gradient', [1, -18, 21, 2], gland)),
    // The follicle is the epidermis turned inwards: its fill runs up into the epidermis, its outline stops at it.
    own('follicle', g.path(g.D(follicle), 'url(#follicle-gradient)') + curve(g, follicle.replace('M-14,-20.5', 'M-14,-19.5').replace('L2,-20.5Z', 'L2,-19'), epi.outline, 8), [], g.grad('follicle-gradient', [-22, -24, 10, 42], epi)),
    own('dermal-papilla', g.path(g.D('M-11,40.5C-11,35 -9,33 -6,33C-3,33 -1,35 -1,40.5Z'), papilla.base, papilla.outline, 5)),
    own('hair-shaft', curve(g, 'M-6,31L-6,-30C-6,-38 -1,-44 8,-48', hair.base, 4 * g.k)),
    own('stem-cells', stems.map(([x, y]) => g.circle(x, y, 4.4, 'url(#stem-gradient)', stem.outline, 6.5)).join('') + stems.map(([x, y]) => g.circle(x + 0.3, y + 0.3, 1.9, NUC.shadow)).join(''),
      [['stem cells', stem], ['nucleus', NUC]], boxGrad('stem-gradient', stem)),
  ))
}

// ---------------------------------------------------------------------------------------------------------------------
// Neural stem cell niche (subventricular zone): the lateral ventricle on top, lined by ciliated ependymal cells; a B1
// stem cell (astrocyte-like, yellow) reaches the ventricle with a primary cilium between them and touches a blood vessel
// below with its end foot. Beside it two transit-amplifying C cells (its yellow) and a chain of neuroblasts (green)
// migrating away.
// (SiliCoDraw's grey-blue ependymal cells are the pale blue of a generic cell, six in a row; its pale yellow neuroblasts
// are green, so that they recolour apart from the B1 lineage and from the vessel.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.85, [0, 0]), b1 = rich(ASTRO), nb = soft(NEUROBLAST), ep = CELL
  const tissue = grey(0.955, 250), csf = grey(0.99, 220)
  const cilia = Array.from({ length: 6 }, (_, i) => -47 + 94 * (i + 0.5) / 6).flatMap((m) => [-4, 0, 4].map((u) => curve(g, `M${f(m + u)},-30L${f(m + u - 1)},-33C${f(m + u - 1.5)},-35 ${f(m + u + 1.5)},-36 ${f(m + u + 1)},-38.5`, ep.outline, 3.8))).join('')
  const b1Body = 'M-2.6,-30L2.6,-30L2.6,-14C7,-12 10,-8 9,-3C8,2 5,5 2,7L2,25L8,29.5L-8,29.5L-2,25L-2,7C-6,5 -9,1 -9,-4C-9,-9 -6,-12 -2.6,-14Z'
  icon('Neural stem cell niche', join(
    own('tissue', rect(g, -47, -47, 47, 47, 6, tissue.base, tissue.outline, 9)),
    own('ventricle', g.path(g.D('M-41,-47L41,-47C44.5,-47 47,-44.5 47,-41L47,-30L-47,-30L-47,-41C-47,-44.5 -44.5,-47 -41,-47Z'), csf.base)),
    vessel(g, { x: 0, y: 35.5, size: 94, thick: 0.15, ends: 'open', cells: 3, id: 'vessel' }),
    epithelium(g, { x: 0, y: -22.3, size: 94, cells: 6, tall: 0.96, pal: ep, id: 'ependymal-cells' }),
    own('cilia', cilia),
    ...[[-38, 2], [-27, 9], [-16, 16]].map(([x, y], i) => cell(g, { x, y, size: 17, aspect: 0.5, turn: 22, pal: nb, id: `neuroblast-${i + 1}` })),
    ...[[22, -2, 15], [30, 14, 13]].map(([x, y, s], i) => cell(g, { x, y, size: s, aspect: 1, pal: b1, id: `c-cell-${i + 1}` })),
    own('b1-cell', curve(g, 'M0,-30C1,-34 -1,-37 0.5,-42', b1.outline, 5) + g.circle(0.5, -42.5, 1.6, b1.outline) +
      g.path(g.D(b1Body), 'url(#b1-gradient)', b1.outline, 7), [['B1 cell', b1]], g.grad('b1-gradient', [-9, -30, 9, 30], b1)),
    nucleus(g, { x: 0, y: -4, size: 11, oval: 0.85, id: 'b1-nucleus' }),
  ))
}

// ---------------------------------------------------------------------------------------------------------------------
// Haematopoietic stem cell niche (bone marrow): a sinusoid with red blood cells above, bone lined by osteoblasts below;
// between them the haematopoietic stem cell (yellow, as the approved one), held by a CXCL12-abundant reticular (CAR)
// cell whose processes reach the sinusoid, and an adipocyte.
// (SiliCoDraw's grey CAR cell is green and its pale yellow bone a warm grey, both to stay 36° from the stem cell's
// yellow; the osteoblasts take the blue of the approved Osteoblast, five in a row where SiliCoDraw has five lilac ones.
// The approved Osteoblast and Adipocyte are not placed: their bone, osteoid and fat lie within 36° of the stem cell's
// yellow and the adipocyte's peach within 36° of the vessel; the adipocyte here is the empty, white fat cell of marrow
// sections, in greys.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.85, [0, 0]), car = soft(CAR), ob = soft(OSTEO)
  const marrow = grey(0.965, 10), bone = grey(0.92, 80), fat = grey(0.985, 250)
  const surf = 'M-47,30C-30,25 -14,31 0,28C16,25 32,30 47,27'
  const obs = [[-38, 24.6, -12], [-27, 24.5, 4], [-16, 26.2, 6], [10, 24.4, -10], [36, 24.6, 8]]
  const proc = [[25, 4, 28, -26], [25, 4, 11, -2], [25, 4, 33, 21], [25, 4, 44, -5], [25, 4, 17, 20]]
  const carItems = [g.smooth([[17, 2], [22, -4], [30, -3], [33, 4], [29, 10], [21, 10]]), ...proc.map(([a, b, c, d]) => ({ d: `M${P2(g.P([a, b]))} L${P2(g.P([c, d]))}`, width: 3.2 * g.k }))]
  icon('Haematopoietic stem cell niche', join(
    own('marrow', rect(g, -47, -30, 47, 31, 0, marrow.base)),
    own('bone', g.path(g.D(`${surf}L47,41C47,44.5 44.5,47 41,47L-41,47C-44.5,47 -47,44.5 -47,41Z`), 'url(#bone-gradient)', bone.outline, 7) +
      [[-27, 38], [-1, 40], [27, 37]].map(([x, y]) => g.ellipse(x, y, 3.2, 1.6, 0, bone.small)).join(''), [], g.grad('bone-gradient', [-47, 25, 47, 47], bone)),
    own('osteoblasts', obs.map(([x, y, r]) => `<g transform="rotate(${r} ${f(g.X(x))} ${f(g.Y(y))})">${rect(g, x - 5.4, y - 3.8, x + 5.4, y + 3.8, 2.8, 'url(#osteoblast-gradient)', ob.outline, 5)}${nuc(g, x, y, 2.1, 2.1, 0, 3.5)}</g>`).join(''),
      [['osteoblasts', ob], ['nucleus', NUC]], boxGrad('osteoblast-gradient', ob) + nucDefs),
    vessel(g, { x: 0, y: -36.5, size: 94, thick: 0.23, ends: 'open', cells: 4, id: 'sinusoid' }),
    own('adipocyte', g.circle(-33, 1, 11.5, 'url(#fat-gradient)', fat.outline, 6) + g.path(g.D('M-42.5,5C-41.5,9.5 -38.5,12 -35,12.4C-37.5,10.5 -39.2,8 -40,4.6Z'), NUC.base, NUC.outline, 3.5) + g.hl(-37, -4.5, 9, 3.5, -40, fat.light), [], g.grad('fat-gradient', [-43, -10, -21, 12], fat)),
    own('car-cell', g.union(carItems, 'url(#car-gradient)', car.outline, 3.5) + g.ellipse(25, 3.5, 4, 3, 0, NUC.base, NUC.outline, 3.5), [['CAR cell', car]], g.grad('car-gradient', [9, -27, 44, 21], car)),
    cell(g, { x: -4, y: 3, size: 29, aspect: 1, pal: STEM, id: 'haematopoietic-stem-cell', nucleolus: false }),
  ))
}

// ---------------------------------------------------------------------------------------------------------------------
// Muscle regeneration: a bundle of muscle fibres in cross-section, each with its nuclei at the edge; among them small
// regenerating fibres with a nucleus in the middle (the mark of a fibre rebuilt after injury), and beside them activated
// satellite cells (green, as in the approved Muscle satellite cell).
// (SiliCoDraw colours the regenerating fibres green with a dark dot beside each; here the fibres stay muscle rose,
// recognised by their size and central nucleus, and the dot is the green satellite cell, larger so it reads at 40 px.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.85, [0, 0]), mus = soft(MUSCLE), sat = soft(STEM_GREEN)
  const wob = (i, s) => Math.sin(i * 12.9898 + s * 78.233) * 0.5 + Math.sin(i * 4.1 + s * 1.7) * 0.5
  const REGEN = [1, 7, 11, 16]
  let fibres = '', nuclei = '', regen = '', sats = '', idx = 0
  for (let j = -2; j <= 2; j++)
    for (let i = -3; i <= 3; i++) {
      const x = i * 17.5 + (j % 2 ? 8.75 : 0), y = j * 15.16
      if (Math.hypot(x, y) > 35.5) continue
      if (REGEN.includes(idx)) {
        regen += g.circle(x, y, 5.8, 'url(#fibre-gradient)', mus.outline, 5) + nuc(g, x, y, 2.4, 2.4, 0, 3.5)
        const t = 0.8 + idx * 1.9, sx = x + Math.cos(t) * 9, sy = y + Math.sin(t) * 9
        sats += g.circle(sx, sy, 3.4, 'url(#satellite-gradient)', sat.outline, 5) + g.circle(sx, sy, 1.4, NUC.shadow)
      } else {
        const pts = Array.from({ length: 6 }, (_, k) => { const t = ((30 + 60 * k + wob(idx * 6 + k, 1) * 6) * Math.PI) / 180, r = 8.6 + wob(idx * 6 + k, 2) * 0.5; return [x + Math.cos(t) * r, y + Math.sin(t) * r] })
        fibres += g.path(poly(g, pts), 'url(#fibre-gradient)', mus.outline, 5)
        const a = ((60 * Math.floor((wob(idx, 3) + 1) * 2.99) + 30) * Math.PI) / 180
        nuclei += nuc(g, x + Math.cos(a) * 5.6, y + Math.sin(a) * 5.6, 2.2, 1.6, (a * 180) / Math.PI + 90, 3.5)
      }
      idx++
    }
  icon('Muscle regeneration', join(
    own('perimysium', g.circle(0, 0, 46, 'url(#bundle-gradient)', mus.outline, 12) + g.hl(-28, -33, 16, 5, -38, mus.light), [['muscle fibres', mus]], g.grad('bundle-gradient', [-46, -46, 46, 46], { base: mus.light, shadow: mus.base })),
    own('muscle-fibres', fibres, [], boxGrad('fibre-gradient', mus)),
    own('regenerating-fibres', regen),
    own('myonuclei', nuclei, [['nucleus', NUC]], nucDefs),
    own('satellite-cells', sats, [['satellite cells', sat]], boxGrad('satellite-gradient', sat)),
  ))
}

// ---------------------------------------------------------------------------------------------------------------------
// Asymmetric stem cell division: a stem cell anchored to its niche divides; the daughter that stays in the niche remains
// a stem cell (the arrow back into it: self-renewal), the other inherits the fate determinants (the crescent) and goes
// on to differentiate (arrow to a differentiated cell).
// (SiliCoDraw's stem cell is blue and its daughter yellow; here the stem cell is the yellow of the approved Stem cell and
// the daughter and its progeny the pale blue of a generic cell. The niche is a row of three peach cells.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.85, [0, 0]), day = CELL
  // The crescent: between the top of the daughter's inside (r 12.6) and the same circle moved 4.5 down.
  const arcAt = (cy, a0, a1) => Array.from({ length: 25 }, (_, i) => { const t = ((a0 + ((a1 - a0) * i) / 24) * Math.PI) / 180; return [12.4 * Math.cos(t), cy + 12.4 * Math.sin(t)] })
  const fate = arcAt(-19, 205, 335), inner = arcAt(-14.5, 318, 222)
  icon('Asymmetric stem cell division', join(
    epithelium(g, { x: 0, y: 39.5, size: 94, cells: 3, tall: 0.48, id: 'niche' }),
    cell(g, { x: 0, y: 12, size: 39, aspect: 1, pal: STEM, id: 'stem-cell' }),
    cell(g, { x: 0, y: -19, size: 34, aspect: 1, pal: day, id: 'daughter-cell', vesicles: false }),
    own('fate-determinants', g.path(`M${[...fate, ...inner].map(g.P).map(P2).join(' L')}Z`, day.outline)),
    extra(arrow(g, { points: [[-17, 26.5], [-29.5, 23], [-32.5, 11], [-21, 4.5]], colour: STEM.outline, id: 'self-renewal' })),
    extra(arrow(g, { points: [[16, -26], [29, -33]], colour: day.outline, id: 'differentiation', w: 8 })),
    cell(g, { x: 37.5, y: -39, size: 19, aspect: 0.62, turn: -25, pal: day, id: 'differentiated-cell' }),
  ))
}

// ---------------------------------------------------------------------------------------------------------------------
// Replicative senescence (Hayflick limit): the growth of a culture over time (or population doublings); young cells
// divide, the curve flattens at the dashed limit, and the cells there are senescent (the approved Senescent cell).
// (SiliCoDraw's blue dividing cells and curve are green, the blue of the senescent cell's granules being too near;
// the dashed limit is in the senescent cell's peach; axes as arrows of the set.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.95, [1, -1.2]), young = soft(YOUNG)
  const sen = placeCellType(g, 'Senescent cell', { x: 23.5, y: -29.5, size: 44, id: 'senescent-cell' })
  const peach = soft(hueOf('#FCE2D3'))
  const dashes = `<path d="M${P2(g.P([-37, -8]))} L${P2(g.P([46, -8]))}" fill="none" stroke="${peach.outline}" stroke-width="6" stroke-linecap="round" stroke-dasharray="14 13"/>`
  icon('Replicative senescence', join(
    extra(arrow(g, { points: [[-42, 41], [-42, -45]], corners: true, w: 7, colour: INK, id: 'y-axis' })),
    extra(arrow(g, { points: [[-42, 41], [47, 41]], corners: true, w: 7, colour: INK, id: 'x-axis' })),
    own('hayflick-limit', dashes),
    own('growth-curve', curve(g, 'M-36,34C-26,30 -14,20 -4,6C6,-8 12,-4 22,-5.5C32,-7 38,-6 44,-6', young.outline, 10)),
    ...[[-27, 10], [-12, 10]].map(([x, y], i) => cell(g, { x, y, size: 17.5, aspect: 1, pal: young, id: `young-cell-${i + 1}` })),
    sen,
  ))
}

// ---------------------------------------------------------------------------------------------------------------------
// Oncogene-induced senescence: an activated oncogene (RAS, with the lightning of its activating mutation) drives a cell
// into senescence: a large, flat cell whose nucleus holds senescence-associated heterochromatin foci (SAHF).
// (SiliCoDraw's red RAS box is a teal protein lettered "RAS", red lying 27° from the senescent cell's peach; the cell is
// the approved Senescent cell, with foci added in the deeper lilac of chromatin; the two lines of the membrane are left
// out.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(5.05, [3, -3.4]), ras = soft(RAS)
  const X = 3, Y = 11, S = 88
  const sen = placeCellType(g, 'Senescent cell', { x: X, y: Y, size: S, id: 'senescent-cell' })
  // Where its nucleus lands: the icon's own box (as placeCellType measures it) scaled onto ours.
  const raw = readIcon('Senescent cell', 'tmp').body, box = roughBox(raw), ext = Math.max(box[2] - box[0], box[3] - box[1])
  const at = ([u, v]) => [X + ((u - (box[0] + box[2]) / 2) * S) / ext, Y + ((v - (box[1] + box[3]) / 2) * S) / ext]
  const [nx, ny] = at([244.6, 256]), nr = (75.8 * S) / ext
  const foci = [[-0.42, -0.3], [0.08, -0.48], [0.5, -0.18], [-0.5, 0.25], [-0.02, 0.05], [0.45, 0.38], [0.02, 0.55]].map(([u, v], i) => g.circle(nx + u * nr, ny + v * nr, nr * (0.14 + (i % 3) * 0.02), CHROMATIN.shadow)).join('')
  const h = 5.2, rasP = protein(g, { x: -27, y: -32, size: 25, pal: ras, id: 'RAS' })
  icon('Oncogene-induced senescence', join(
    sen,
    own('heterochromatin-foci', foci),
    rasP,
    own('RAS-letters', lettering(g, { x: -27, y: -31.5, h, text: 'RAS', colour: ras.outline, id: 'RAS-label' }).body),
    lightning(g, { x: -9, y: -40, size: 17, turn: 12, id: 'mutation' }),
    extra(arrow(g, { points: [[-14, -21], [-9, -14], [-2, -10]], colour: INK, w: 8, id: 'arrow' })),
  ))
  if (textWidth('RAS') * h > 19) console.log('RAS is wide:', textWidth('RAS') * h)
}

/** Extent of an icon's drawing from its numbers (as placeCellType measures it, after iconkit's roughBox). */
function roughBox(text) {
  const xs = [], ys = []
  for (const m of text.matchAll(/\bd="([^"]+)"/g)) {
    if (/[aA]/.test(m[1])) continue
    const nums = m[1].match(/-?\d*\.?\d+(?:e-?\d+)?/g)?.map(Number) || []
    for (let i = 0; i + 1 < nums.length; i += 2) { xs.push(nums[i]); ys.push(nums[i + 1]) }
  }
  for (const m of text.matchAll(/<(circle|ellipse)\b[^>]*>/g)) {
    const a = (k) => +((m[0].match(new RegExp(`\\b${k}="(-?[\\d.]+)"`)) || [])[1] ?? NaN)
    const rx = a('r') || a('rx'), ry = a('r') || a('ry')
    if (!isNaN(a('cx'))) { xs.push(a('cx') - rx, a('cx') + rx); ys.push(a('cy') - ry, a('cy') + ry) }
  }
  for (const m of text.matchAll(/<rect\b[^>]*>/g)) {
    const a = (k) => +((m[0].match(new RegExp(`\\b${k}="(-?[\\d.]+)"`)) || [])[1] ?? NaN)
    if (!isNaN(a('x'))) { xs.push(a('x'), a('x') + a('width')); ys.push(a('y'), a('y') + a('height')) }
  }
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}

check()
