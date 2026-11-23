// Eight icons of SiliCoDraw's "Cells & tissues" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts in ../parts/:
// ageing of barriers, vessels and germ cells: transcytosis across the blood-brain barrier, a leaky gut, the colonic
// mucus layer, endothelial dysfunction, capillary rarefaction, cardiomyocyte hypertrophy, oocyte aneuploidy and sperm
// DNA fragmentation. Their compositions are read by hand from the source in a 100 × 100 box centred on 0,0 and scaled
// onto a 512 page (`page` of ../cellkit.mjs).
// Parts used: nucleus, vesicle (organelles.mjs); protein, chromosome, DNA (molecules.mjs); epithelium, bacterium, red
// blood cell, blood vessel, arrows, and the approved Astrocyte, Monocyte, Cardiomyocyte, Oocyte and Sperm placed
// (tissue.mjs); letters (letters.mjs).
// Drawn here because no part draws them: an endothelium seen in section with caveolae (`endothelium`), microvilli
// (`microvilli`), mucus layers and a goblet cell's mucus (`mucus`, `goblet`), endothelial cells as domes on a layer of
// smooth muscle (`domes`), adhesion molecules (`adhesion`), a meiotic spindle (`spindle`), DNA breaks (`breaks`).
// Lettered (strokes, ../parts/letters.mjs): "NO" for nitric oxide in Endothelial dysfunction, the only word the
// originals write.
// Usage: node ct18.mjs <folder>
import { mkdirSync } from 'node:fs'
import { NUC, cellTypes, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex } from '../colour.mjs'
import { f } from '../shapes.mjs'
import { nucleus, vesicle } from '../parts/organelles.mjs'
import { chromosome, dna, protein } from '../parts/molecules.mjs'
import { mergeParts } from '../parts/membranes.mjs'
import { EPI, VESSEL, arrow, bacterium, epithelium, placeCellType, redBloodCell, vessel } from '../parts/tissue.mjs'
import { lettering } from '../parts/letters.mjs'
import { readIcon } from '../iconkit.mjs'

const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const { cellType, check } = cellTypes(OUT)

// Hues (OKLCH degrees). SiliCoDraw's own colour where it can stay; moved where two parts would lie within 36°.
const PLASMA_PROTEIN = hueOf('#5b7fc4') // SiliCoDraw's blue of the plasma proteins (263)
const LAMINA_PROPRIA = 0 // SiliCoDraw's pink (357) moved to 0, 41° from the nucleus and 52° from the epithelium
const MUCUS = hueOf('#7fb2e0') // SiliCoDraw's blue (246)
const ADHESION = 75 // VCAM-1 and ICAM-1, amber as free proteins (SiliCoDraw: the monocyte's blue)
const NO = 165 // nitric oxide: green, as every small molecule (SiliCoDraw: dark blue letters)
const TISSUE = 75 // the tissue round the capillaries: SiliCoDraw's peach (45) lies 20° from the arteriole's red
const ARTERIOLE = hueOf('#d64545') // 25
const VENULE = hueOf('#4a6fb5') // 262
const CAPILLARY = 330 // SiliCoDraw mixes the two into a purple red
const SPINDLE = 0 // SiliCoDraw's rose (2): 41° from the chromosomes' lilac, 52° from the oocyte's peach
const BREAK = 25 // the breaks in the DNA: a red mark
// Greys (chroma below 0.012) are left out of the hue check.
const GREY = toHex({ l: 0.55, c: 0.008, h: 250 })

const P2 = ([x, y]) => `${f(x)},${f(y)}`
const boxGrad = (id, pal) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`
/** Joins the { defs, body, parts } of several parts; parts that share a palette are one (they recolour together). */
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), parts: mergeParts(ps.flatMap((p) => p.parts)) })
const icon = (name, { defs, body, parts }) => cellType(name, parts, defs, body)
/** Some drawing of this script as a part: { defs, body, parts }. */
const own = (id, body, parts, defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })
/** A drawing that belongs to a part already listed (arrows, letters, red blood cells in a vessel): no palette of its own. */
const extra = (p) => ({ ...p, parts: [] })
/** A rounded rectangle in units of g (x0, y0, x1, y1), r in units, as a path on the page. */
const rrect = (g, [x0, y0, x1, y1], r) => {
  const [a, b] = g.P([x0, y0]), [c, d] = g.P([x1, y1]), R = r * g.k
  return `M${f(a + R)},${f(b)} H${f(c - R)} A${f(R)},${f(R)} 0 0 1 ${f(c)},${f(b + R)} V${f(d - R)} A${f(R)},${f(R)} 0 0 1 ${f(c - R)},${f(d)} H${f(a + R)} A${f(R)},${f(R)} 0 0 1 ${f(a)},${f(d - R)} V${f(b + R)} A${f(R)},${f(R)} 0 0 1 ${f(a + R)},${f(b)} Z`
}
/** An open path in units of g (M, L, C, S, H, V written absolute with x,y pairs only), drawn as a line. */
const stroke = (g, d, colour, w, extra = '') => `<path d="${g.D(d)}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`
const bez = ([p0, p1, p2, p3], n = 24) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [0, 1].map((k) => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]) })

// Where a point of an approved icon (its own 512 units) lands when placeCellType puts it at x, y with `size` (no turn):
// the extent is measured as tissue.mjs measures it (circles, ellipses, rects and paths without arcs).
const roughBox = (text) => {
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
const placedAt = (name, { x, y, size, turn = 0 }) => {
  const b = roughBox(readIcon(name, 'measure').body), s = size / Math.max(b[2] - b[0], b[3] - b[1]), r = (turn * Math.PI) / 180
  return ([u, v]) => { const du = (u - (b[0] + b[2]) / 2) * s, dv = (v - (b[1] + b[3]) / 2) * s; return [x + du * Math.cos(r) - dv * Math.sin(r), y + du * Math.sin(r) + dv * Math.cos(r)] }
}

// ---------------------------------------------------------------------------------------------------------------------
// Drawn here
// ---------------------------------------------------------------------------------------------------------------------

/** Microvilli: short upright strokes on the top of a cell from x0 to x1 at y (units of g), `h` high. */
const microvilli = (g, { x0, x1, y, h = 5, gap = 4, colour, w = 6 }) => {
  let d = ''
  for (let x = x0 + gap * 0.7; x <= x1 - gap * 0.5; x += gap) d += `M${f(x)},${f(y - 1)} L${f(x)},${f(y - h)} `
  return stroke(g, d, colour, w)
}

// ---------------------------------------------------------------------------------------------------------------------
// Blood-to-brain transcytosis: plasma proteins cross the endothelium of a brain capillary in vesicles: taken up in a
// caveola on the blood side, carried across, released into the brain from a pit on the other side; the tight junction
// between two endothelial cells stays shut. An astrocyte below stands for the brain. (SiliCoDraw: the endothelium peach,
// a stellate brain cell in the same peach. Here the endothelium is the rose of the vessels of the set, the brain cell the
// approved Astrocyte, the proteins keep SiliCoDraw's blue, the vesicle is the aqua vesicle part.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.68, [0, 0.5]), wall = VESSEL, prot = deep(PLASMA_PROTEIN)
  const lumen = own('blood', `<path d="${rrect(g, [-46.5, -47, 46.5, -10], 6)}" fill="url(#blood-gradient)" stroke="${wall.outline}" stroke-width="10" stroke-linejoin="round"/>`,
    [['vessel', wall]], `<linearGradient id="blood-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${wall.light}"/><stop offset="1" stop-color="${wall.base}"/></linearGradient>`)
  // The endothelium: a band from -20 to 4 with a caveola open to the blood (above) and a pit open to the brain (below).
  const top = 'M-48,-20 L8,-20 C8,-11 20,-11 20,-20 L48,-20', bottom = 'M48,4 L34,4 C34,-5 22,-5 22,4 L-48,4'
  const band = own('endothelium',
    `<path d="${g.D(`${top} L48,4 L34,4 C34,-5 22,-5 22,4 L-48,4 Z`)}" fill="url(#endothelium-gradient)"/>` +
      stroke(g, top, wall.outline, 10) + stroke(g, bottom, wall.outline, 10) +
      `<g id="tight-junction">${stroke(g, 'M-14,-20 L-14,4', wall.outline, 6)}${[-14.5, -8, -1.5].map((y) => g.circle(-14, y, 2.1, wall.outline)).join('')}</g>` +
      g.hl(-40, -16, 16, 4, -2, wall.light),
    [], g.grad('endothelium-gradient', [-48, -20, 48, 4], wall))
  const nuc = nucleus(g, { x: -31, y: -8, size: 22, oval: 0.45 })
  const ves = vesicle(g, { x: 3, y: -6.5, size: 14, id: 'vesicle' })
  const proteins = [[-12, -37], [4, -29], [26, -38], [38, -26], [14, -16], [3, -6.5], [28, 9.5], [36, 24], [24, 36]]
    .map(([x, y], i) => protein(g, { x, y, size: 7, turn: i * 40, id: `plasma-protein-${i + 1}`, pal: prot }))
  const rbc = redBloodCell(g, { x: -31, y: -31, size: 20, turn: -8, id: 'red-blood-cell' })
  const astro = placeCellType(g, 'Astrocyte', { x: -17, y: 30, size: 36, id: 'astrocyte' })
  const route = arrow(g, { points: [[43, -14], [45, 2], [44, 18], [40, 30]], colour: prot.outline, id: 'route', w: 8 })
  const prots = { defs: proteins.map((p) => p.defs).join(''), body: `<g id="plasma-proteins">${proteins.map((p) => p.body).join('')}</g>`, parts: [['plasma proteins', prot]] }
  icon('Blood-to-brain transcytosis', join(lumen, extra(rbc), band, nuc, astro, ves, prots, extra(route)))
}

// ---------------------------------------------------------------------------------------------------------------------
// Leaky gut: the intestinal epithelium has opened between two cells (its tight junction lost), and bacteria and their
// endotoxin (LPS, the small dots) pass from the gut lumen into the lamina propria below. The other junctions hold.
// (SiliCoDraw: pink cells; here the peach epithelium of the set with its microvilli, the bacteria green rods.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.8, [0, 0]), lp = soft(LAMINA_PROPRIA), bug = soft(137)
  const propria = own('lamina-propria', `<path d="${rrect(g, [-47, 14, 47, 46], 6)}" fill="url(#lamina-propria-gradient)" stroke="${lp.outline}" stroke-width="8"/>`,
    [['lamina propria', lp]], g.grad('lamina-propria-gradient', [-47, 14, 47, 46], lp))
  const left = epithelium(g, { x: -26.5, y: -0.5, size: 42.5, cells: 2, tall: 1.75, id: 'epithelium-left' })
  const right = epithelium(g, { x: 26.5, y: -0.5, size: 42.5, cells: 2, tall: 1.75, id: 'epithelium-right' })
  const villi = own('microvilli', [[-47, -27], [-26, -6], [6, 26], [27, 47]].map(([a, b]) => microvilli(g, { x0: a, x1: b, y: -18.5, h: 5.5, gap: 4, colour: EPI.outline, w: 6 })).join(''), [])
  const junctions = own('tight-junctions', [-26.5, 26.5].flatMap((x) => [-15, -9.5].map((y) => g.circle(x, y, 2.3, deep(hueOf(EPI.base)).outline))).join(''), [])
  const lps = own('endotoxin', [[-2, -27], [4, -22], [-1, 12], [3, 20], [-8, 27], [16, 23], [-18, 38], [24, 39], [-32, 30]].map(([x, y]) => g.circle(x, y, 1.9, bug.outline)).join(''), [])
  const bugs = [[-30, -36, -15, 20], [-4, -41, 18, 20], [30, -35, -28, 20], [0, -4, 90, 17], [8, 33, 28, 16]]
    .map(([x, y, t, s], i) => bacterium(g, { x, y, size: s, turn: t, id: `bacterium-${i + 1}`, flagellum: false, pal: bug }))
  icon('Leaky gut', join(propria, left, right, villi, junctions, ...bugs, lps))
}

// ---------------------------------------------------------------------------------------------------------------------
// Colonic mucus layer: a loose outer layer of mucus where bacteria live, over a dense inner layer that keeps them away
// from the epithelium; a goblet cell in the middle secretes the mucin MUC2. (SiliCoDraw: pink cells and blue bacteria;
// here the peach epithelium with microvilli, green bacteria, the mucus SiliCoDraw's blue, its goblet cell a theca full of
// mucin granules.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.75, [0, -0.5]), muc = soft(MUCUS), bug = soft(137)
  const outer = 'M-47,-34 C-34,-42 -22,-30 -8,-38 C6,-46 20,-42 32,-34 C40,-29 44,-34 47,-38 L47,-8 L-47,-8 Z'
  const layers = own('mucus',
    `<path d="${g.D(outer)}" fill="url(#mucus-gradient)"/>` + stroke(g, 'M-47,-34 C-34,-42 -22,-30 -8,-38 C6,-46 20,-42 32,-34 C40,-29 44,-34 47,-38', muc.small, 6) +
      stroke(g, 'M-40,-24 C-36,-27 -30,-21 -24,-24 M-6,-29 C-2,-32 4,-26 10,-29 M20,-19 C24,-22 30,-16 36,-19 M-28,-15 C-24,-18 -18,-12 -12,-15', muc.small, 5) +
      `<path d="${g.D('M-47,-8 L47,-8 L47,12 L-47,12 Z')}" fill="${muc.shadow}"/>` +
      stroke(g, 'M-45,-8 L45,-8', muc.outline, 6, ' stroke-dasharray="14 12"') + stroke(g, 'M-42,0 L42,0 M-42,6 L42,6', muc.small, 4),
    [['mucus', muc]], `<linearGradient id="mucus-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${muc.light}"/><stop offset="1" stop-color="${muc.base}"/></linearGradient>`)
  const row = epithelium(g, { x: 0, y: 29, size: 95, cells: 5, shape: 'columnar', id: 'epithelium' })
  const c = (95 - 12 / g.k) / 5
  const villi = own('microvilli', [0, 1, 3, 4].map((i) => microvilli(g, { x0: -47.5 + i * c, x1: -47.5 + (i + 1) * c, y: 12.3, h: 4.5, gap: 3.8, colour: EPI.outline, w: 5.5 })).join(''), [])
  const goblet = own('goblet-cell',
    `<path d="${g.D('M-3.5,12.5 C-5,6 5,6 3.5,12.5 Z')}" fill="${muc.base}" stroke="${muc.outline}" stroke-width="6" stroke-linejoin="round"/>` +
      `<path d="${g.D('M-6,12.5 C-9.5,18 -9.5,27 -3.5,31.5 L3.5,31.5 C9.5,27 9.5,18 6,12.5 Z')}" fill="${muc.base}" stroke="${muc.outline}" stroke-width="6" stroke-linejoin="round"/>` +
      [[-3, 17], [2.6, 18.5], [-2.4, 23.5], [3, 25], [0, 28.5]].map(([x, y]) => g.circle(x, y, 2, muc.small)).join(''),
    [])
  const bugs = [[-34, -27, -20], [-13, -20, 15], [14, -31, -10], [36, -23, 30], [-39, -42, 0], [4, -44, 5]]
    .map(([x, y, t], i) => bacterium(g, { x, y, size: 15, turn: t, id: `bacterium-${i + 1}`, flagellum: false, pal: bug }))
  icon('Colonic mucus layer', join(layers, row, villi, goblet, ...bugs))
}

// ---------------------------------------------------------------------------------------------------------------------
// Endothelial dysfunction: the endothelium of an artery seen in section: a gap between two endothelial cells lets plasma
// leak into the wall, adhesion molecules (VCAM-1, ICAM-1) stand on the cells and hold a monocyte, and less nitric oxide
// is made (NO with a falling arrow). Smooth muscle below, a red blood cell in the lumen. (SiliCoDraw: the monocyte its
// blue, the cells rose; here the approved Monocyte, the rose of the vessels, the endothelial nuclei lilac like every
// nucleus, the adhesion molecules and plasma proteins amber, NO green as small molecules are.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.85, [0, 2]), wall = VESSEL, amber = rich(ADHESION), no = deep(NO)
  const frame = [-47, -40, 47, 44]
  const lumen = own('lumen', `<path d="${rrect(g, frame, 6)}" fill="${wall.light}"/>`, [])
  const muscle = own('smooth-muscle', `<path d="${g.D('M-47,21 L47,21 L47,38 C47,42 45,44 41,44 L-41,44 C-45,44 -47,42 -47,38 Z')}" fill="url(#muscle-gradient)"/>` +
    stroke(g, 'M-47,21 L47,21', wall.outline, 6) + [[-34, 29], [-12, 36], [12, 29], [33, 36]].map(([x, y]) => g.ellipse(x, y, 8, 2.4, 0, NUC.small)).join(''),
  [], g.grad('muscle-gradient', [-47, 21, 47, 44], { base: wall.shadow, shadow: wall.small }))
  const dome = (x0, x1) => { const m = (x0 + x1) / 2; return g.D(`M${x0},21 C${x0},13 ${m - 8},8 ${m},8 C${m + 8},8 ${x1},13 ${x1},21 Z`) }
  const domes = own('endothelium', [[-47, -25], [-25, 0.5], [7.5, 28], [28, 47]].map(([a, b]) => `<path d="${dome(a, b)}" fill="url(#endothelium-gradient)" stroke="${wall.outline}" stroke-width="7" stroke-linejoin="round"/>` +
    g.ellipse((a + b) / 2, 15.5, 6, 2.8, 0, NUC.base, NUC.outline, 4)).join(''), [['vessel wall', wall], ['nucleus', NUC]], boxGrad('endothelium-gradient', wall))
  const leak = own('plasma', [[3.9, 7], [4.6, 13.5], [3.4, 20], [5.2, 27]].map(([x, y]) => g.circle(x, y, 1.9, amber.small)).join(''), [['proteins', amber]])
  const adhesion = own('adhesion-molecules', [-36, -14].map((x) => stroke(g, `M${x},9 L${x},4.5 M${x},4.5 L${x - 2.4},1.8 M${x},4.5 L${x + 2.4},1.8`, amber.outline, 6)).join(''), [])
  const mono = placeCellType(g, 'Monocyte', { x: -25, y: -8, size: 25, id: 'monocyte' })
  const rbc = redBloodCell(g, { x: 2, y: -27, size: 20, turn: 4, id: 'red-blood-cell' })
  const label = lettering(g, { x: 23, y: -18, h: 10, text: 'NO', colour: no.outline, id: 'NO', w: 8 })
  const fall = arrow(g, { points: [[38, -26], [38, -9]], colour: no.outline, id: 'less', w: 8 })
  const border = own('frame', `<path d="${rrect(g, frame, 6)}" fill="none" stroke="${wall.outline}" stroke-width="10" stroke-linejoin="round"/>`, [])
  icon('Endothelial dysfunction', join(lumen, extra(rbc), muscle, domes, leak, adhesion, mono, own('nitric-oxide', label.body + fall.body, [['nitric oxide', no]]), border))
}

// ---------------------------------------------------------------------------------------------------------------------
// Capillary rarefaction: in a piece of tissue between an arteriole (red, above) and a venule (blue, below), only three
// of seven capillaries are left; the lost ones are dashed ghosts. (SiliCoDraw: the tissue peach; here a pale tan, as the
// peach lay 20° from the arteriole's red.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.95, [0, 0]), tis = soft(TISSUE), art = deep(ARTERIOLE), ven = deep(VENULE), cap = deep(CAPILLARY)
  const box = [-46, -42, 46, 42]
  const tissue = own('tissue', `<path d="${rrect(g, box, 8)}" fill="url(#tissue-gradient)"/>`, [['tissue', tis]], g.grad('tissue-gradient', box, tis))
  const course = (x) => bez([[x, -28], [x + 7, -14], [x - 7, 14], [x, 28]], 20)
  const xs = [-36, -24, -12, 0, 12, 24, 36], kept = [0, 2, 5]
  const ghosts = own('lost-capillaries', xs.filter((_, i) => !kept.includes(i)).map((x) => g.line(course(x), tis.outline, 6).replace('/>', ' stroke-dasharray="12 11"/>')).join(''), [])
  const caps = kept.map((i) => vessel(g, { points: course(xs[i]), size: 20, thick: 0.3, ends: 'open', pal: cap, id: `capillary-${i + 1}` }))
  const capsAll = { defs: caps.map((p) => p.defs).join(''), body: `<g id="capillaries">${caps.map((p) => p.body).join('')}</g>`, parts: [['capillaries', cap]] }
  const arteriole = vessel(g, { points: [[-46, -30], [46, -30]], size: 38, thick: 0.3, ends: 'open', pal: art, id: 'arteriole' })
  const venule = vessel(g, { points: [[-46, 30], [46, 30]], size: 38, thick: 0.3, ends: 'open', pal: ven, id: 'venule' })
  const border = own('frame', `<path d="${rrect(g, box, 8)}" fill="none" stroke="${tis.outline}" stroke-width="10"/>`, [])
  icon('Capillary rarefaction', join(tissue, ghosts, capsAll, { ...arteriole, parts: [['arteriole', art]] }, { ...venule, parts: [['venule', ven]] }, border))
}

// ---------------------------------------------------------------------------------------------------------------------
// Cardiomyocyte hypertrophy: a cardiomyocyte grows into a larger one (the approved Cardiomyocyte, small and large).
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.62, [-1, 1.8])
  const small = placeCellType(g, 'Cardiomyocyte', { x: -27, y: -24, size: 40, id: 'cardiomyocyte-small' })
  const large = placeCellType(g, 'Cardiomyocyte', { x: 7, y: 17, size: 80, id: 'cardiomyocyte-large' })
  const grow = arrow(g, { points: [[-10, -14], [-2, -4]], colour: '#B4666D', id: 'growth', w: 10 })
  icon('Cardiomyocyte hypertrophy', join(small, extra(large), extra(grow)))
}

// ---------------------------------------------------------------------------------------------------------------------
// Oocyte aneuploidy: an oocyte in meiosis (the approved Oocyte, its nucleus taken out: at metaphase the envelope has
// broken down) with its spindle: four chromosomes line up on the equator, a fifth has slipped off it (ringed), so the
// egg will end up with one too many or too few.
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.6, [0, 0]), spin = soft(SPINDLE)
  const size = 82
  const egg = placeCellType(g, 'Oocyte', { x: 0, y: 0, size, id: 'oocyte' })
  egg.body = egg.body.replace(/<g id="oocyte-nucleus">[\s\S]*?<\/g>/, '')
  egg.parts = egg.parts.filter(([n]) => n !== 'nucleus')
  const [cx, cy] = placedAt('Oocyte', { x: 0, y: 0, size })([245.8, 266.2])
  const S = (u, v) => `${f(cx + u)},${f(cy + v)}`
  const barrel = `M${S(-21, -6)} C${S(-9, -16)} ${S(9, -16)} ${S(21, -6)} L${S(21, 6)} C${S(9, 16)} ${S(-9, 16)} ${S(-21, 6)} Z`
  const fibres = `M${S(-21, -2.5)} C${S(-8, -10)} ${S(8, -10)} ${S(21, -2.5)} M${S(-21, 2.5)} C${S(-8, 10)} ${S(8, 10)} ${S(21, 2.5)} M${S(-21, 0)} L${S(21, 0)}`
  const spindle = own('spindle', `<path d="${g.D(barrel)}" fill="url(#spindle-gradient)" stroke="${spin.outline}" stroke-width="7" stroke-linejoin="round"/>` + stroke(g, fibres, spin.small, 4.5),
    [['spindle', spin]], g.grad('spindle-gradient', [cx - 21, cy - 14, cx + 21, cy + 14], spin))
  const chroms = [-10.2, -3.4, 3.4, 10.2].map((v, i) => chromosome(g, { x: cx, y: cy + v, size: 8.2, turn: 90, id: `chromosome-${i + 1}` }))
  const stray = chromosome(g, { x: cx + 12, y: cy - 5, size: 8.2, turn: 40, id: 'chromosome-misaligned' })
  const ring = own('misalignment', g.circle(cx + 12, cy - 5, 6.6, 'none', GREY, 4.5).replace('/>', ' stroke-dasharray="7 6" stroke-linecap="round"/>'), [])
  icon('Oocyte aneuploidy', join(egg, spindle, ...chroms, stray, ring))
}

// ---------------------------------------------------------------------------------------------------------------------
// Sperm DNA fragmentation: a sperm (the approved Sperm) whose DNA, packed in the head, is broken into pieces (strand
// breaks marked red). (SiliCoDraw shows the head alone, enlarged; here the whole sperm, so the head is smaller, and the DNA
// is in the deeper lilac of the nucleus it lies in, and recolours with it: the DNA part's blue lies 22° from the sperm's
// blue.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.75, [1.3, 0.5]), chrom = deep(hueOf(NUC.base)), cut = deep(BREAK)
  const size = 106, turn = -12
  const sperm = placeCellType(g, 'Sperm', { x: 0, y: 0, size, turn, id: 'sperm' })
  const at = placedAt('Sperm', { x: 0, y: 0, size, turn })
  const [nx, ny] = at([390.5, 188.1]) // the middle of the nucleus in the head
  const axis = -30 + turn, rad = (axis * Math.PI) / 180, ux = Math.cos(rad), uy = Math.sin(rad)
  const pieces = [[-10.5, -1.2, -12], [0, 1.4, 10], [10.5, -1, -10]].map(([t, n, tw], i) => dna(g, { x: nx + ux * t - uy * n, y: ny + uy * t + ux * n, size: 9.5, width: 5, turn: axis + tw, id: `DNA-${i + 1}`, pal: chrom }))
  const breaks = own('breaks', [[-5.2, 0], [5.4, 0]].map(([t]) => {
    const px = nx + ux * t, py = ny + uy * t
    return [-1, 1].map((s) => g.line([[px - uy * s * 5.5 + ux * s * 0.6, py + ux * s * 5.5 + uy * s * 0.6], [px - uy * s * 8 + ux * s * 1.2, py + ux * s * 8 + uy * s * 1.2]], cut.small, 5)).join('')
  }).join(''), [['breaks', cut]])
  icon('Sperm DNA fragmentation', join(sperm, ...pieces.map(extra), breaks))
}

check()
console.log('written to', OUT)
