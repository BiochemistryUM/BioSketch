// Eight icons of SiliCoDraw's "Immunology & infection" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David
// Carlsson; see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts:
// Antibiotic, Antimicrobial resistance, Microbiome composition, Sepsis, Granuloma, Mould, Hand hygiene and Face mask.
// Compositions read by hand from the source (the last drawing of each, ICONS.<key>.d) in its 100 × 100 box centred on
// 0,0 and scaled onto a 512 page (`page` of ../cellkit.mjs); outlines at 60 % (setStrokeScale), the gloss of cells on
// round biological bodies of 40 px and more (bacteria and lymphocytes through their parts; the ring of epithelioid
// macrophages and the vesicle of the conidiophore here). Objects (capsule, shield, pump, mask) and the chart get none.
// Parts used: microbe, lymphocyte (immune.mjs); vessel, redBloodCell, cross (tissue.mjs);
// hazardSign, PLASTIC, METAL, PAPER, AGAR, LIQUIDS, ACCENT, objW (lab.mjs); SERIES, INK-like GRID, SKIN (assays.mjs);
// gloss (surfaces.mjs).
// Drawn here because no part draws them: a drug capsule, a shield with a tick, a stacked bar chart, the epithelioid
// macrophage ring and Langhans giant cell of a granuloma with its caseous core, mould (mycelium, an Aspergillus
// conidiophore and a Penicillium brush), a hand, a soap pump with drops and foam, a surgical face mask.
// Lettered: nothing (SiliCoDraw's axis word "samples" of the chart is left out).
// Usage: node imC.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, glossOn, NUC, page, setGloss, smoothD } from '../cellkit.mjs'
import { deep, rich, soft, toHex, toLch } from '../colour.mjs'
import { f, setStrokeScale, strokeScale } from '../shapes.mjs'
import { microbe, lymphocyte } from '../parts/immune.mjs'
import { cross, vessel, redBloodCell } from '../parts/tissue.mjs'
import { AGAR, LIQUIDS, METAL, PAPER, PLASTIC, hazardSign, objW } from '../parts/lab.mjs'
import { GRID, SERIES, SKIN } from '../parts/assays.mjs'
import { gloss, glossTones, pathPoints } from '../parts/surfaces.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012: plastic, metal, ink) are left out of the hue check, as the conventions of lab.mjs say; a
// palette used by several parts is listed once.
const icon = (name, [k, cx, cy], draw) => {
  const g = page(k, [cx, cy]), { defs, body, parts } = draw(g)
  const seen = parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base) === i)
  kit.cellType(name, seen, defs, body)
}
const join = (...ps) => ({ defs: ps.map((p) => p.defs ?? '').join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts ?? []) })
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })

// ---------- small drawing helpers (points in g's units) ----------
const P2 = (p) => p.map(f).join(',')
const rad = (d) => (d * Math.PI) / 180
/** Points moved: scaled by sc, turned by rot degrees, then shifted to tx, ty (as SVG's translate rotate scale). */
const xf = (tx, ty, rot = 0, sc = 1) => { const c = Math.cos(rad(rot)), s = Math.sin(rad(rot)); return (pts) => pts.map(([x, y]) => [tx + sc * (x * c - y * s), ty + sc * (x * s + y * c)]) }
/** A rounded rectangle as points (corners sampled). */
const rrPts = (x, y, w, h, r, n = 8) => {
  r = Math.min(r, w / 2, h / 2)
  const c = [[x + w - r, y + r, -90], [x + w - r, y + h - r, 0], [x + r, y + h - r, 90], [x + r, y + r, 180]]
  return c.flatMap(([cx, cy, a0]) => Array.from({ length: n + 1 }, (_, i) => { const a = rad(a0 + (90 * i) / n); return [cx + r * Math.cos(a), cy + r * Math.sin(a)] }))
}
const circlePts = (cx, cy, r, n = 48, ry = r) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos((2 * Math.PI * i) / n), cy + ry * Math.sin((2 * Math.PI * i) / n)])
const poly = (g, pts, close = true) => `M${pts.map((p) => P2(g.P(p))).join(' L')}${close ? ' Z' : ''}`
const smooth = (g, pts) => smoothD(pts.map(g.P))
const fillD = (d, fill, s = '', w = 0) => `<path d="${d}" fill="${fill}"${s ? ` stroke="${s}" stroke-width="${f(w)}" stroke-linejoin="round"` : ''}/>`
const strokeD = (d, colour, w, cap = 'round', extra = '') => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"${extra}/>`
/** A cubic Bézier (g's units) sampled into points. */
const bez = ([a, b, c, d], n = 24) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [0, 1].map((j) => u ** 3 * a[j] + 3 * u * u * t * b[j] + 3 * u * t * t * c[j] + t ** 3 * d[j]) })
const boxOf = (pts) => [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))]
/**
 * A glossy body of our own (STYLE.md, the gloss of cells): the outline `d` (page path) filled with a gradient that ends
 * in the gloss's end tone, outlined, and the face-on tones over it (shade and shadow from 40 px, lit band and highlight
 * from 90 px). `px` is the body's size on the page.
 */
const glossBody = (g, id, d, box, pal, w, px) => {
  const end = glossOn() && px >= 40 ? glossTones(pal).end : pal.shadow
  const defs = g.grad(`${id}-gradient`, box, { base: pal.base, shadow: end })
  let tones = ''
  if (glossOn() && px >= 40) {
    const G = gloss({ fills: [pathPoints(d)] }, { inset: (w * strokeScale()) / 2 }), T = glossTones(pal)
    tones = ['shade', 'shadow', ...(px >= 90 ? ['lit', 'highlight'] : [])].map((k) => (G[k] ? `<path d="${G[k]}" fill="${T[k]}"/>` : '')).join('')
  }
  return { defs, body: fillD(d, `url(#${id}-gradient)`, pal.outline, w) + tones }
}
/** An object's shading (lab.mjs): a two-stop gradient from 80 px, flat below. */
const objFill = (g, id, box, pal, defs) => (Math.max(box[2] - box[0], box[3] - box[1]) * g.k >= 80 ? (defs.push(g.grad(id, box, pal)), `url(#${id})`) : pal.base)

// =====================================================================================================================
// Antibiotic: a drug capsule with some of its powder spilled, and a bacterium crossed out (killed).
// (SiliCoDraw: a blue and white capsule, three blue grains, a green rod with pili and a red cross. Here the capsule's
// coloured half amber (rich 80: blue would lie 13° from the nucleoid's DNA), the white half the plastic grey's light tone; the bacterium is the
// microbe part with its nucleoid; the cross is tissue.mjs's cross in red. Pili are left out: the part has none.)
const CAPSULE_BLUE = rich(80)
const CROSS_RED = toHex({ l: 0.6, c: 0.17, h: 25 })
icon('Antibiotic', [5.8, 1.5, 1.45], (g) => {
  const defs = [], T = xf(-16, -18, -35), w = objW(60 * g.k)
  const left = T([[0, -10], [-14, -10], ...Array.from({ length: 17 }, (_, i) => { const a = rad(-90 - (180 * i) / 16); return [-14 + 10 * Math.cos(a), 10 * Math.sin(a)] }), [-14, 10], [0, 10]])
  const right = T([[0, 10], [14, 10], ...Array.from({ length: 17 }, (_, i) => { const a = rad(90 - (180 * i) / 16); return [14 + 10 * Math.cos(a), 10 * Math.sin(a)] }), [14, -10], [0, -10]])
  let c = `<g id="capsule-white">${fillD(poly(g, right), objFill(g, 'white-half-gradient', boxOf(right), PLASTIC, defs), PLASTIC.outline, w)}${strokeD(poly(g, T([[5, -5], [17, -5]]), false), PAPER.light, w * 0.9)}</g>`
  c += `<g id="capsule-blue">${fillD(poly(g, left), objFill(g, 'blue-half-gradient', boxOf(left), CAPSULE_BLUE, defs), CAPSULE_BLUE.outline, w)}${strokeD(poly(g, T([[-17, -5], [-4, -5]]), false), CAPSULE_BLUE.light, w * 0.9)}</g>`
  const grains = `<g id="powder">${[[-7, -1], [-1, 4], [-11, 6]].map(([x, y]) => g.circle(x, y, 2.1, CAPSULE_BLUE.small)).join('')}</g>`
  const capsule = own('capsule', c + grains, [['capsule', CAPSULE_BLUE], ['white half', PLASTIC]], defs.join(''))
  const bug = microbe(g, { x: 14, y: 24, size: 56, turn: -12, aspect: 0.43, flagellum: false, nucleoid: true, id: 'bacterium' })
  const x = cross(g, { x: 14, y: 24, size: 22, colour: CROSS_RED, w: 23 / 0.6, id: 'killed' })
  return join(capsule, bug, x)
})

// =====================================================================================================================
// Antimicrobial resistance: a bacterium carrying a resistance plasmid, and a shield with a tick (it is protected).
// (SiliCoDraw: a green rod with pili, a ring for the plasmid, a green shield with a white tick. Here the microbe part with
// its plasmid (molecules.mjs's circular DNA) and nucleoid; the shield gold (rich 85, as SiliCoDraw's first drawing) with the tick
// in its outline tone, since green would lie 13° from the bacterium and blue 17° from the DNA; pili left out.)
const SHIELD = rich(85)
icon('Antimicrobial resistance', [5.13, 1.55, -4.66], (g) => {
  const bug = microbe(g, { x: -10, y: 13, size: 68, turn: -12, aspect: 0.44, flagellum: false, nucleoid: true, plasmid: true, id: 'bacterium' })
  const defs = [], w = objW(48 * g.k) * 1.2
  const outer = bez([[46, -19], [46, -6], [38, 3], [28, 7]], 12).concat(bez([[28, 7], [18, 3], [10, -6], [10, -19]], 12))
  const sh = [[28, -41], [46, -34], ...outer, [10, -34]]
  const inner = sh.map(([x, y]) => [28 + (x - 28) * 0.76, -17 + (y + 17) * 0.8])
  let s = fillD(poly(g, sh), objFill(g, 'shield-gradient', boxOf(sh), SHIELD, defs), SHIELD.outline, w)
  s += strokeD(poly(g, inner), SHIELD.light, w * 0.45)
  s += strokeD(poly(g, [[20.5, -17.5], [26, -11.7], [36, -22.7]], false), SHIELD.outline, 3.8 * g.k / 0.6)
  return join(bug, own('shield', s, [['shield', SHIELD]], defs.join('')))
})

// =====================================================================================================================
// Microbiome composition: stacked bars of the relative abundance of five taxa in four samples, on L-shaped axes.
// (SiliCoDraw: the same bars with white seams. Here the five taxa take the chart colours of assays.mjs, all 36° apart; a
// picture of data, flat; the bars outlined in the grid grey.)
icon('Microbiome composition', [5.15, 1.5, -1], (g) => {
  const D = [[0.34, 0.22, 0.18, 0.14, 0.12], [0.18, 0.4, 0.12, 0.18, 0.12], [0.46, 0.14, 0.22, 0.08, 0.1], [0.26, 0.28, 0.1, 0.24, 0.12]]
  const TAXA = [SERIES[0], SERIES[2], SERIES[3], SERIES[4], SERIES[1]]
  const H = 76, Y0 = 37, w = objW(100 * g.k)
  const groups = TAXA.map(() => '')
  let seams = '', frames = ''
  D.forEach((fr, i) => {
    const x = -32 + i * 19.5
    let y = Y0
    fr.forEach((v, k) => {
      const h = v * H
      y -= h
      groups[k] += fillD(poly(g, [[x, y], [x + 15, y], [x + 15, y + h], [x, y + h]]), TAXA[k].small)
      if (k < 4) seams += poly(g, [[x, y], [x + 15, y]], false) + ' '
    })
    frames += fillD(poly(g, rrPts(x, Y0 - H, 15, H, 0.8, 2)), 'none', GRID, w * 0.45)
  })
  let s = groups.map((b, k) => `<g id="taxon-${k + 1}">${b}</g>`).join('')
  s += `<g id="seams">${strokeD(seams, PAPER.light, Math.max(2, w * 0.5), 'butt')}${frames}</g>`
  const ink = toHex({ l: 0.42, c: 0.01, h: 250 })
  s += `<g id="axes">${strokeD(poly(g, [[-39, -42], [-39, 40], [46, 40]], false), ink, w * 0.85)}${strokeD(poly(g, [[-43, -39], [-39, -39]], false) + poly(g, [[-43, -1], [-39, -1]], false) + poly(g, [[-43, 37], [-39, 37]], false), ink, w * 0.6)}</g>`
  return { defs: '', body: s, parts: TAXA.map((p, k) => [`taxon ${k + 1}`, p]) }
})

// =====================================================================================================================
// Sepsis: a blood vessel lengthwise with bacteria among the red blood cells, and a warning sign (a systemic emergency).
// (SiliCoDraw: a rose tube, four red cells, three green rods, a yellow warning triangle. Here tissue.mjs's vessel
// (open ends) with its red blood cells placed along it, the microbe part for the bacteria and lab.mjs's ISO warning
// triangle with an exclamation mark. The red blood cells lie 4° from the vessel's rose, as in every vessel of the parts:
// they recolour with it.)
icon('Sepsis', [4.48, 0.3, -4.5], (g) => {
  const course = bez([[-48, 12], [-16, 4], [16, 20], [48, 12]], 8)
  const Yc = (x) => { const t = (x + 48) / 96, u = 1 - t; return u ** 3 * 12 + 3 * u * u * t * 4 + 3 * u * t * t * 20 + t ** 3 * 12 }
  const v = vessel(g, { points: course, size: 100, thick: 0.62, ends: 'open', id: 'vessel' })
  const rbc = [[-35, 4, 20], [-7, -5, -15], [18, 6, 10], [40, -2, -25]].map(([x, dy, r], i) => redBloodCell(g, { x, y: Yc(x) + dy, size: 14, turn: r, view: 'tilted', id: `red-blood-cell-${i + 1}` }))
  const bugs = [[-22, -4, -25], [4, 5, 20], [30, -4, -10]].map(([x, dy, r], i) => microbe(g, { x, y: Yc(x) + dy, size: 15, turn: r, aspect: 0.46, flagellum: false, id: `bacterium-${i + 1}` }))
  const sign = hazardSign(g, { x: 32, y: -28.5, size: 32, symbol: 'exclamation', shape: 'triangle', id: 'warning' })
  const r = join(v, ...rbc, ...bugs, sign)
  return { ...r, parts: [...v.parts, ...bugs[0].parts, ...sign.parts] }
})

// =====================================================================================================================
// Granuloma (tuberculous): a caseous necrotic core with acid-fast bacilli, a ring of epithelioid macrophages with their
// long nuclei and a Langhans giant cell (nuclei in a horseshoe at its rim), and a cuff of lymphocytes round it all.
// (SiliCoDraw: a pale blue cuff dotted with dark nuclei, a peach ring split into cells, a pale core with red marks.
// Here the cuff is a ring of T lymphocytes (immune.mjs), the macrophages the approved Macrophage's green, nuclei the lilac
// NUC, the core a pale cheesy cream (rich 90) with debris, the bacilli the microbe part as small red rods (the red of the
// Ziehl–Neelsen stain).)
const MACRO = soft(toLch('#CFE8D8').h) // as Macrophage.svg (soft(GREEN))
const CASEUM = rich(92)
const BACILLUS = deep(12)
icon('Granuloma', [4.98, 0, 0], (g) => {
  // the cuff: 20 lymphocytes in a ring
  const n = 20, cuff = Array.from({ length: n }, (_, i) => { const a = (i / n) * 2 * Math.PI + 0.1; return lymphocyte(g, { x: 39.5 * Math.cos(a), y: 39.5 * Math.sin(a), size: 13.6, kind: 'T', receptors: false, id: `lymphocyte-${i + 1}` }) })
  // the macrophage ring: one body (an annulus, the inner edge drawn the other way round) with walls between its cells
  const R0 = 15.5, R1 = 32
  const ring = `M${P2(g.P([R1, 0]))} A${f(R1 * g.k)},${f(R1 * g.k)} 0 1 1 ${P2(g.P([-R1, 0]))} A${f(R1 * g.k)},${f(R1 * g.k)} 0 1 1 ${P2(g.P([R1, 0]))} Z M${P2(g.P([R0, 0]))} A${f(R0 * g.k)},${f(R0 * g.k)} 0 1 0 ${P2(g.P([-R0, 0]))} A${f(R0 * g.k)},${f(R0 * g.k)} 0 1 0 ${P2(g.P([R0, 0]))} Z`
  const w = 8
  const mb = glossBody(g, 'macrophages', ring, [-R1, -R1, R1, R1], MACRO, w, 2 * R1 * g.k)
  const Pp = (r, d) => [r * Math.cos(rad(d)), r * Math.sin(rad(d))]
  const walls = [-90, -60, -30, 0, 30, 60, 90, 120, 150, 186, 256].map((d) => poly(g, [Pp(R0, d), Pp(R1, d)], false)).join(' ')
  let m = mb.body + strokeD(walls, MACRO.outline, w * 0.55)
  // nuclei: long ones in the epithelioid cells, a horseshoe of small round ones in the giant cell (186°–256°)
  const nuc = [-75, -45, -15, 15, 45, 75, 105, 135, 168].map((d) => { const [x, y] = Pp(23.8, d); return g.ellipse(x, y, 5, 2.3, d, NUC.base, NUC.outline, 3.2) }).join('')
  const giant = [194, 204, 214, 224, 234, 244].map((d, i) => { const [x, y] = Pp(27.3, d); return g.circle(x, y, 2.3, NUC.base, NUC.outline, 3) }).join('') + (() => { const [x, y] = Pp(22.5, 221); return g.circle(x, y, 1.7, MACRO.small) })()
  m += `<g id="nuclei">${nuc}${giant}</g>`
  const macro = own('macrophage-ring', m, [['macrophages', MACRO], ['nuclei', NUC]], mb.defs)
  // the caseous core: a lumpy pale disc with debris, flat (dead tissue, not a cell)
  const nc = Array.from({ length: 14 }, (_, i) => { const t = (i / 14) * 2 * Math.PI, r = 15.6 + 1.3 * Math.sin(5 * t) + 0.6 * Math.cos(3 * t); return [r * Math.cos(t), r * Math.sin(t)] })
  let core = fillD(smooth(g, nc), CASEUM.base, CASEUM.outline, 5)
  core += [[-7, -7, 1.3], [5, -9, 1], [9, 5, 1.2], [-3, 9, 1], [-9, 2, 0.9], [1, 0, 1.1], [-2, -2.5, 0.7]].map(([x, y, r]) => g.circle(x, y, r, CASEUM.small)).join('')
  const bac = [[-4.5, 1.5, -22], [4.5, 5, 12], [1.5, -5.5, 38], [-7.5, -3, 70]].map(([x, y, t], i) => microbe(g, { x, y, size: 6.6, turn: t, aspect: 0.3, flagellum: false, granules: false, pal: BACILLUS, id: `bacillus-${i + 1}` }))
  const coreP = own('caseous-core', core, [['caseous core', CASEUM]])
  const r = join(...cuff, macro, coreP, ...bac)
  return { ...r, parts: [...cuff[0].parts, ...macro.parts, ...coreP.parts, ['bacilli', BACILLUS]] }
})

// =====================================================================================================================
// Mould: a mycelium on a medium, an Aspergillus conidiophore (stalk, swollen vesicle, phialides, radiating chains of
// conidia) and a Penicillium brush (branched metulae with upright chains of conidia).
// (SiliCoDraw: green hyphae and pale green spores on a line. Here the hyphae are tubes in an off-white grey (mycelium is
// white; a grey also recolours apart from everything), the spores green (deep 150), the medium lab.mjs's agar.)
const HYPHA = { light: toHex({ l: 0.99, c: 0.004, h: 100 }), base: toHex({ l: 0.95, c: 0.008, h: 100 }), shadow: toHex({ l: 0.9, c: 0.01, h: 100 }), small: toHex({ l: 0.82, c: 0.011, h: 100 }), outline: toHex({ l: 0.56, c: 0.011, h: 100 }) }
const CONIDIA = deep(150)
icon('Mould', [4.75, 0, 3.6], (g) => {
  const defs = []
  // the medium
  const slab = rrPts(-48, 41, 96, 8, 2.5)
  let s = `<g id="medium">${fillD(poly(g, slab), objFill(g, 'medium-gradient', boxOf(slab), AGAR, defs), AGAR.outline, 5)}</g>`
  // hyphae as tubes: an outline stroke and a fill stroke on the same courses
  const tubes = (ds, wd) => strokeD(ds, HYPHA.outline, (wd + 2 * 3.6) / 1) + strokeD(ds, HYPHA.base, wd)
  const P = (pts) => poly(g, pts, false)
  const myc = [bez([[-47, 40], [-37, 36], [-26, 41], [-14, 38]], 10), bez([[-14, 38], [-4, 35], [6, 35], [16, 39]], 10), bez([[16, 39], [26, 43], [36, 35], [47, 38]], 10), bez([[-36, 38], [-34, 33], [-31, 32], [-27, 31]], 6), bez([[28, 37], [31, 33], [35, 33], [39, 31]], 6), bez([[-4, 37], [-2, 33], [1, 33], [3, 30]], 6)]
  const ax = 16, ay = -12
  const stalkA = bez([[ax, 38], [ax + 1, 22], [ax - 1, 6], [ax, ay + 6]], 12), stalkP = bez([[-28, 38], [-28, 24], [-29, 10], [-28, -2]], 12)
  const br = [[-37, -9], [-31, -12], [-25, -12], [-19, -9]]
  const metulae = br.map(([x, y], i) => [[-28, -2], [x, y], [x + (i - 1.5) * 0.8, y - 4]])
  const phial = []
  for (let d = -195; d <= 15.1; d += 26.25) phial.push([[ax + Math.cos(rad(d)) * 7, ay + Math.sin(rad(d)) * 7], [ax + Math.cos(rad(d)) * 11, ay + Math.sin(rad(d)) * 11]])
  const k = g.k
  s += `<g id="hyphae">${tubes(myc.map(P).join(' '), 2.6 * k) + tubes(P(stalkA) + ' ' + P(stalkP), 3.4 * k) + tubes(metulae.map(P).join(' ') + ' ' + phial.map(P).join(' '), 2.1 * k)}</g>`
  // the vesicle of the conidiophore: a small round body, glossed
  const vd = smooth(g, circlePts(ax, ay, 7.5, 16))
  const ves = glossBody(g, 'vesicle', vd, [ax - 7.5, ay - 7.5, ax + 7.5, ay + 7.5], HYPHA, 5, 15 * k)
  defs.push(ves.defs)
  s += `<g id="vesicle">${ves.body}</g>`
  // conidia: chains of round spores, flat with an outline
  const cn = []
  for (let d = -195; d <= 15.1; d += 26.25) [[14.3, 3], [20.2, 2.9], [26, 2.7]].forEach(([r, q]) => cn.push([ax + Math.cos(rad(d)) * r, ay + Math.sin(rad(d)) * r, q]))
  br.forEach(([x, y], i) => { const kk = i - 1.5; for (let j = 0; j < 4; j++) cn.push([x + kk * (1.2 + j * 1.3), y - 7.5 - j * 6, 2.7 - j * 0.1]) })
  s += `<g id="conidia">${cn.map(([x, y, r]) => g.circle(x, y, r, CONIDIA.base, CONIDIA.outline, 3.6)).join('')}</g>`
  return { defs: defs.join(''), body: s, parts: [['conidia', CONIDIA], ['medium', AGAR]] }
})

// =====================================================================================================================
// Hand hygiene: a hand under the spout of a soap pump, drops of soap falling onto it, foam bubbles round it.
// (SiliCoDraw: a peach hand, a grey spout, blue drops and bubbles. Here the hand in the skin of assays.mjs's person
// (one outline round palm, thumb and fingers), the pump in lab.mjs's plastic grey, the soap the lab's water blue
// (soft 222): drops in its small tone, bubbles in its light tone with a highlight.)
const SOAP = LIQUIDS.water
icon('Hand hygiene', [4.75, 5.9, -3], (g) => {
  const defs = [], w = objW(90 * g.k)
  // the hand, as SiliCoDraw places it (translate(-6 14) rotate(-28) scale(.8)); palm, thumb and fingers in one outline
  const H = xf(-6, 14, -28, 0.8)
  const palmPts = [[-18, -6], [-17.5, 10], [-13, 24], [-11, 38], [11, 38], [13, 24], [17.5, 10], [18, -6], [0, -8]]
  const pieces = [smooth(g, H(palmPts)), poly(g, H(xf(-16, 14, -38)(rrPts(-4.8, -25, 9.6, 30, 4.8)))), ...[[-13.8, -33], [-4.6, -37], [4.6, -34], [13.8, -26]].map(([x, t]) => poly(g, H(rrPts(x - 4, t, 8, 8 - t, 4))))]
  const all = H([...palmPts, [-30, -6], [17.8, -37], [-17.8, -26]])
  const hb = boxOf(all)
  defs.push(g.grad('hand-gradient', hb, SKIN))
  let hand = pieces.map((d) => `<path d="${d}" fill="${SKIN.outline}" stroke="${SKIN.outline}" stroke-width="${f(2 * w)}" stroke-linejoin="round"/>`).join('') + pieces.map((d) => fillD(d, 'url(#hand-gradient)')).join('')
  hand += strokeD(poly(g, H(bez([[-9, 26], [-11, 18], [-10, 10], [-6, 4]], 10)), false), SKIN.small, w * 0.55)
  // the pump: a spout bending down, its collar, the stem and the press head
  const spout = [[47, -44], [20, -44], ...bez([[20, -44], [11, -44], [6, -39], [6, -31]], 8).slice(1), [6, -27], [15, -27], [15, -31], ...bez([[15, -31], [15, -34], [17, -35], [20, -35]], 6).slice(1), [47, -35]]
  let pump = fillD(poly(g, spout), objFill(g, 'spout-gradient', boxOf(spout), PLASTIC, defs), PLASTIC.outline, w)
  pump += fillD(poly(g, rrPts(4, -28, 13, 4, 1.5)), PLASTIC.shadow, PLASTIC.outline, w * 0.75)
  pump += fillD(poly(g, rrPts(28, -49, 5, 6, 1)), PLASTIC.shadow, PLASTIC.outline, w * 0.75) + fillD(poly(g, rrPts(22, -51, 17, 4, 2)), PLASTIC.base, PLASTIC.outline, w * 0.75)
  pump += strokeD(poly(g, [[22, -41], [44, -41]], false), PLASTIC.light, w * 0.6)
  // drops of soap and foam
  const drop = (x, y, r) => { const pts = [[x, y - r * 1.7], ...bez([[x, y - r * 1.7], [x + r * 0.5, y - r * 0.8], [x + r, y - r * 0.2], [x + r, y]], 6).slice(1), ...Array.from({ length: 12 }, (_, i) => { const a = rad((180 * (i + 1)) / 12); return [x + r * Math.cos(a), y + r * Math.sin(a)] }), ...bez([[x - r, y], [x - r, y - r * 0.2], [x - r * 0.5, y - r * 0.8], [x, y - r * 1.7]], 6).slice(1)]; return fillD(poly(g, pts), SOAP.small, SOAP.outline, w * 0.55) }
  const drops = drop(10.5, -17, 2.9) + drop(10, -7, 2.9) + drop(11.5, 3, 2.7)
  const bub = [[30, 24, 7], [40, 9, 4.5], [33, 39, 4], [-31, 36, 4.5], [24, 34, 2.6]]
  const foam = bub.map(([x, y, r]) => g.circle(x, y, r, SOAP.light, SOAP.outline, w * 0.6)).join('') + strokeD(bub.map(([x, y, r]) => `M${P2(g.P([x - r * 0.6, y - r * 0.05]))} A${f(r * 0.6 * g.k)},${f(r * 0.6 * g.k)} 0 0 1 ${P2(g.P([x, y - r * 0.6]))}`).join(' '), SOAP.shadow, w * 0.5)
  return { defs: defs.join(''), body: `<g id="hand">${hand}</g><g id="soap-pump">${pump}</g><g id="soap">${drops}</g><g id="foam">${foam}</g>`, parts: [['skin', SKIN], ['soap', SOAP]] }
})

// =====================================================================================================================
// Face mask: a surgical mask with three pleats, bound side edges, a nose wire and ear loops.
// (SiliCoDraw: a light blue mask with darker pleat lines and binding, a dark nose wire. Here the fabric a pale blue
// (soft 235, the colour of surgical masks), the ear loops plastic white, the nose wire metal grey, seams dashed.)
const FABRIC = soft(235)
icon('Face mask', [4.75, 0, -1.7], (g) => {
  const defs = [], w = objW(100 * g.k)
  const top = bez([[-34, -20], [-12, -25], [12, -25], [34, -20]], 16), bot = bez([[36, 12], [14, 23], [-14, 23], [-36, 12]], 16)
  const body = [...top, ...bot]
  const bd = poly(g, body)
  const loop = (sx) => [[34 * sx, -17], [45 * sx, -21], [48 * sx, -8], [47 * sx, -1], [46 * sx, 8], [42 * sx, 11], [36 * sx, 9]]
  const loopD = (sx) => { const p = loop(sx); return `M${P2(g.P(p[0]))} C${[p[1], p[2], p[3]].map((q) => P2(g.P(q))).join(' ')} C${[p[4], p[5], p[6]].map((q) => P2(g.P(q))).join(' ')}` }
  let s = `<g id="ear-loops">${strokeD(loopD(1) + ' ' + loopD(-1), PLASTIC.outline, 4.2 * g.k)}${strokeD(loopD(1) + ' ' + loopD(-1), PLASTIC.light, 1.9 * g.k)}</g>`
  let m = fillD(bd, objFill(g, 'fabric-gradient', boxOf(body), FABRIC, defs))
  for (const y of [-9, 1, 11]) {
    const fold = bez([[-35, y], [-14, y - 4], [14, y - 4], [35, y]], 12)
    m += fillD(poly(g, [...fold, ...fold.slice().reverse().map(([x, yy]) => [x, yy + 3])]), FABRIC.shadow) + strokeD(poly(g, fold, false), FABRIC.small, w * 0.55)
  }
  m += fillD(poly(g, [[-34, -20], [-36, 12], [-30.5, 14.2], [-29, -21.2]]), FABRIC.shadow) + fillD(poly(g, [[34, -20], [36, 12], [30.5, 14.2], [29, -21.2]]), FABRIC.shadow)
  m += strokeD(poly(g, [[-31.5, -18], [-33, 9]], false) + ' ' + poly(g, [[31.5, -18], [33, 9]], false), FABRIC.small, w * 0.35, 'butt', ` stroke-dasharray="${f(2 * g.k * 0.6)} ${f(2 * g.k * 0.6)}"`)
  m += strokeD(poly(g, [[-20, -23.5], [-12, -21.2]], false), FABRIC.light, w * 0.6)
  m += fillD(bd, 'none', FABRIC.outline, w)
  s += `<g id="mask">${m}</g>`
  s += `<g id="nose-wire">${strokeD(poly(g, bez([[-12, -21], [-4, -22.6], [4, -22.6], [12, -21]], 8), false), METAL.outline, 2.4 * g.k / 0.6 * 0.6)}</g>`
  return { defs: defs.join(''), body: s, parts: [['mask', FABRIC]] }
})

check()
console.log('written')
