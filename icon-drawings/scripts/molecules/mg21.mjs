// Eight icons of SiliCoDraw's "Molecules & genetics" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts in ../parts/:
// PARP1 and PAR chains, protein carbonylation, lipid peroxidation, complex I (NADH dehydrogenase), the NAD⁺/NADH ratio,
// p21 (CDKN1A), the p62/SQSTM1 autophagy receptor and protein turnover. Their compositions are read by hand from the
// source in a 100 × 100 box centred on 0,0 and scaled onto a 512 page (`page` of ../cellkit.mjs).
// Parts used: protein, aggregate, ubiquitin, ligand, glucose (as the ring of NAD), DNA (molecules.mjs); lipid bilayer
// (membranes.mjs); proteasome (complexes.mjs); ribosome (organelles.mjs); arrows (tissue.mjs); letters (letters.mjs).
// Drawn here because no part draws them: the PAR chains (`beads`), a carbonyl group (`carbonyl`), an oxidised lipid
// and a radical spark (`lipid`, `spark`), complex I (`complexOne`), a balance (`balance`), the p21 chain (`chain`), p62
// (`p62`).
// Lettered (strokes, ../parts/letters.mjs): "NADH" and "NAD+" on the rings of NAD, "H+" on the protons of complex I,
// "p21" on p21's N-terminal domain, "ROS" on the reactive oxygen, "O" on the oxygens of a carbonyl and a hydroperoxide
// and "H" on its hydrogen. Left out: nothing else is written in the originals.
// Usage: node mg21.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex } from '../colour.mjs'
import { catmull, f } from '../shapes.mjs'
import { aggregate, dna, glucose, ligand, protein, ubiquitin } from '../parts/molecules.mjs'
import { LIPID, MITO_LIPID, PROTEIN as MEMBRANE_PROTEIN, bilayer, mergeParts } from '../parts/membranes.mjs'
import { ribosome } from '../parts/organelles.mjs'
import { arrow } from '../parts/tissue.mjs'
import { proteasome } from '../parts/complexes.mjs'
import { lettering } from '../parts/letters.mjs'

const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const { cellType, check } = cellTypes(OUT)

// Hues (OKLCH degrees). SiliCoDraw's own colour where it can stay; moved where two parts would lie within 36°.
const AMBER = 75 // free proteins and ubiquitin (the parts' convention); also SiliCoDraw's orange of PAR (75)
const TAGGED = hueOf('#5fae8b') // a protein that carries an amber tag is green, as in mg01 (163)
const RED = hueOf('#e86b6b') // oxygen of the set (22)
const PEROXIDE = 8 // the oxygens of a lipid hydroperoxide: the set's red lies 30° from the lipids' peach (52)
const SPARK = hueOf('#fde68a') // a radical: the yellow of the lightning (96)
const FES = 92 // iron–sulphur clusters: mustard, 58° from the mitochondrial lipids (34)
const PROTON = 165 // protons as the ions of the set
const NAD_OX = 205 // NAD⁺ cerulean, as in mg17
const NADH = 330 // NADH magenta: 63° from the membrane proteins' blue, 64° from the mitochondrial lipids
const CYCLIN = 150 // cyclin E green (SiliCoDraw: a greyish rose next to the blue CDK2)
const P21 = hueOf('#d9534f') // SiliCoDraw's red (25)
const P53 = 255 // SiliCoDraw's grey blue
const P62 = hueOf('#8a6cc4') // SiliCoDraw's purple (298)
const LC3 = 150 // LC3 green (SiliCoDraw: a pale tone of p62's purple)
const PHAGOPHORE = 200 // the vesicles' aqua (organelles.mjs): the lipids' peach lies 23° from ubiquitin's amber
const PROTEASOME = 290 // violet: mg01's purple (315) lies only 37° from the ribosome's mRNA (352); moved further
const SMALL = 165 // amino acids, as every small molecule
// Greys (chroma below 0.012) are left out of the hue check: BioSketch never recolours them with a part.
const GREY = { light: toHex({ l: 0.985, c: 0, h: 0 }), base: toHex({ l: 0.95, c: 0.004, h: 250 }), shadow: toHex({ l: 0.88, c: 0.006, h: 250 }), small: toHex({ l: 0.8, c: 0.007, h: 250 }), outline: toHex({ l: 0.55, c: 0.008, h: 250 }) }
const INK = toHex({ l: 0.5, c: 0.006, h: 250 }) // a true grey for arrows (the arrow part's INK lies within 36° of DNA's blue)

const P2 = ([x, y]) => `${f(x)},${f(y)}`
const line = (pts, colour, w, cap = 'round') => `<path d="M${pts.map(P2).join(' L')}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
const hl = ([x, y], rx, ry, rot, fill) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" transform="rotate(${rot} ${f(x)} ${f(y)})" fill="${fill}"/>`
const boxGrad = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`
/** A circle in units of g as a path (for unions). */
const circleD = (g, x, y, r) => { const [cx, cy] = g.P([x, y]), R = r * g.k; return `M${f(cx - R)},${f(cy)} A${f(R)},${f(R)} 0 1 0 ${f(cx + R)},${f(cy)} A${f(R)},${f(R)} 0 1 0 ${f(cx - R)},${f(cy)} Z` }
/** A polygon (page points) with its corners rounded by r px. */
const roundPoly = (pts, r) => {
  const n = pts.length
  const toward = (a, b, d) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]), t = Math.min(d, l / 2) / l; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] }
  let d = ''
  for (let i = 0; i < n; i++) {
    const a = toward(pts[i], pts[(i - 1 + n) % n], r), b = toward(pts[i], pts[(i + 1) % n], r)
    d += `${i ? 'L' : 'M'}${P2(a)} Q${P2(pts[i])} ${P2(b)} `
  }
  return d + 'Z'
}
/** A rounded rectangle in units of g (x0, y0, x1, y1), as a path on the page; r in units. */
const roundRect = (g, [x0, y0, x1, y1], r) => roundPoly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(g.P), r * g.k)
/** Joins the { defs, body, parts } of several parts; parts that share a palette are one (they recolour together). */
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), parts: mergeParts(ps.flatMap((p) => p.parts)) })
const icon = (name, { defs, body, parts }) => cellType(name, parts, defs, body)
/** Some drawing of this script as a part: { defs, body, parts }. */
const own = (id, body, parts, defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })
/** A drawing that belongs to a part already listed (arrows, letters, bonds): no palette of its own. */
const extra = (p) => ({ ...p, parts: [] })
/** Letters centred on a round mark, as a part with no palette of its own. */
const letters = (g, o) => ({ defs: '', body: lettering(g, o).body, parts: [] })

// ---------------------------------------------------------------------------------------------------------------------
// Drawn here
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Chains of beads joined by short links (poly(ADP-ribose)): each chain a list of points in units of g, its first point
 * where it leaves the protein (no bead there). Beads lit from their own top left, with an outline, so that they are not
 * read as ubiquitin (flat beads, no links).
 */
const beads = (g, { chains, r, id, pal }) => {
  const W = Math.max(3.5, r * g.k * 0.17)
  const links = chains.map((c) => line(c.map(g.P), pal.outline, W * 1.3)).join('')
  const balls = chains.flatMap((c) => c.slice(1)).map(([x, y]) => g.circle(x, y, r - W / 2 / g.k, `url(#${id}-gradient)`, pal.outline, f(W))).join('')
  return own(id, `<g id="${id}-links">${links}</g><g id="${id}-units">${balls}</g>`, [['PAR', pal]], boxGrad(`${id}-gradient`, pal.base, pal.shadow))
}

/**
 * A carbonyl group (C=O) on a protein: a stalk from inside the protein out along `deg`, the carbon a small grey dot, a
 * double bond, and the oxygen a red ball lettered "O". `from` the protein's middle, `r0` where the stalk starts.
 */
const carbonyl = (g, { from, deg, r0, id, red }) => {
  const t = (deg * Math.PI) / 180, u = [Math.cos(t), Math.sin(t)], n = [-u[1], u[0]]
  const at = (d, s = 0) => [from[0] + u[0] * d + n[0] * s, from[1] + u[1] * d + n[1] * s]
  const C = r0 + 8.5, O = r0 + 21, R = 6.4
  const bond = [-2.3, 2.3].map((s) => line([at(C + 1, s), at(O - R + 1, s)].map(g.P), GREY.outline, 6)).join('')
  const ball = ligand(g, { x: at(O)[0], y: at(O)[1], size: 2 * R, id: `${id}-oxygen`, pal: red, w: 6 })
  const O_ = lettering(g, { x: at(O)[0], y: at(O)[1] + 0.2, h: 5.6, text: 'O', colour: red.outline, id: `${id}-letter` })
  return {
    defs: ball.defs,
    body: `<g id="${id}"><g id="${id}-bonds">${line([at(r0), at(C)].map(g.P), GREY.outline, 9)}${bond}${g.circle(...at(C), 3.3, GREY.outline)}</g>${ball.body}${O_.body}</g>`,
    parts: [['oxygen', red]],
  }
}

/** A radical: a small star of eight points round a dot (the unpaired electron), yellow, outlined in its own tone. */
const spark = (g, { x, y, r, id, pal }) => {
  const pts = Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * 2 * Math.PI - Math.PI / 2, q = i % 2 ? r * 0.5 : r; return g.P([x + q * Math.cos(a), y + q * Math.sin(a)]) })
  return own(id, `<path d="${roundPoly(pts, 2)}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="4.5" stroke-linejoin="round"/>${g.circle(x, y, r * 0.24, pal.outline)}`, [['radical', pal]],
    g.grad(`${id}-gradient`, [x - r, y - r, x + r, y + r], pal))
}

/** An arc of a circle (centre c, radius R, from a0 to a1 degrees) as points in units of g. */
const arcPts = (c, R, a0, a1, n = 32) => Array.from({ length: n + 1 }, (_, i) => { const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180; return [c[0] + R * Math.cos(a), c[1] + R * Math.sin(a)] })

/** A ring of NAD (the glucose part's hexagon, flat top) with its name lettered in its outline tone. */
const nadRing = (g, { x, y, size, text, pal, id, h }) => {
  const ring = glucose(g, { x, y, size, turn: 30, pal, id })
  const t = lettering(g, { x, y, h, text, colour: pal.outline, id: `${id}-letters`, w: Math.max(3.2, h * g.k * 0.16) })
  return { defs: ring.defs, body: `<g id="${id}-group">${ring.body}${t.body}</g>`, parts: ring.parts }
}

// ---------------------------------------------------------------------------------------------------------------------
// PARP1 and PAR chains: PARP1 bound to DNA at a break, covered with branched chains of poly(ADP-ribose) it has made
// (automodification, which later lets it go).
// (SiliCoDraw draws the DNA as a ladder with a nick in its upper strand, PARP1 as a blue blob over the nick and six
// orange chains of beads. Here the DNA is the DNA part (the nick lies under PARP1), PARP1 the protein part in green (a
// protein that carries an amber tag is green, as in mg01), and the chains are drawn here in SiliCoDraw's orange, which is
// the amber of the set: three chains with two branches, fewer and larger beads than SiliCoDraw's, so that they read at
// 40 px.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.62, [0, -2.2])
  const helix = dna(g, { x: 0, y: 32, size: 100, width: 22, turns: 3 })
  const parp = protein(g, { x: 0, y: 10, size: 46, id: 'PARP1', pal: soft(TAGGED) })
  const chains = [
    [[1, -11], [2, -20], [-1, -29.5], [-6, -38], [-13, -44]],
    [[-1, -29.5], [7.5, -34.5], [16.5, -38.5], [26, -41]],
    [[-15, -3], [-23, -9], [-29, -17], [-33, -26.5], [-35, -36.5]],
    [[-29, -17], [-39, -15]],
    [[16, -4], [24, -10], [31.5, -16.5], [38, -24]],
  ]
  const par = beads(g, { chains, r: 4.4, id: 'PAR', pal: deep(AMBER) })
  icon('PARP1 and PAR chains', join(helix, parp, par))
}

// ---------------------------------------------------------------------------------------------------------------------
// Protein carbonylation: reactive oxygen species have added carbonyl groups (C=O) to the side chains of a protein.
// (SiliCoDraw draws a green blob with fold lines, three C=O groups on stalks and a red spark at the upper left. Here the
// protein is the protein part (amber, the set's free protein), each carbonyl a grey carbon, a double bond and a red
// oxygen lettered "O"; the spark is the reactive oxygen of mg06, a red ball lettered "ROS", in the oxygen's red, which
// recolours with the carbonyl oxygens: both are oxygen.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.72, [2.5, -1.8])
  const red = deep(RED), C = [5, 7]
  const prot = protein(g, { x: C[0], y: C[1], size: 66, turn: 8, id: 'protein' })
  const groups = [-36, 30, 142].map((deg, i) => carbonyl(g, { from: C, deg, r0: 26, id: `carbonyl-${i + 1}`, red }))
  const ros = ligand(g, { x: -32, y: -31, size: 30, id: 'ROS', pal: red, w: 7 })
  const rosL = letters(g, { x: -32, y: -30.5, h: 7.6, text: 'ROS', colour: red.outline, id: 'ROS-letters' })
  icon('Protein carbonylation', join(...groups, prot, ros, rosL))
}

// ---------------------------------------------------------------------------------------------------------------------
// Lipid peroxidation: in a membrane, one lipid's fatty acid chain has been oxidised: it bends away and carries a
// hydroperoxide (–OOH); its neighbour has become a lipid radical, which passes the damage on to the next lipid (arrow),
// the chain reaction of lipid peroxidation.
// (SiliCoDraw draws six lipids, the oxidised chain in red with two red oxygens and a white hydrogen, a red spark on the
// bent chain of the neighbour and a curved arrow. Here the membrane is the bilayer part (four lipids, larger than SiliCoDraw's six), drawn as two
// leaflets so that the outer one can leave out the two lipids drawn here in the same look: the oxidised chain in the
// lipids' own outline tone with the oxygens red and lettered "O" and the hydrogen grey, lettered "H"; the radical is a
// yellow spark on the neighbour's chain (red lay 30° from the lipids' peach), and the arrow grey. The radical sits on the
// chain, not at its end: a hydrogen is taken from the middle of a fatty acid.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.45, [0, 0]), t = 84, rows = 0.3725 * t, head = 0.1275 * t, tailOut = 0.275 * t, tailIn = 0.043 * t, dx = 0.051 * t
  // The part sets four lipids at ±13.1 and ±39.3; the outer leaflet leaves out the middle two, drawn here in its look.
  const inner = bilayer(g, { x: 0, y: 0, size: 100, thick: t, leaflet: 'inner', id: 'inner-leaflet' })
  const outer = bilayer(g, { x: 0, y: 0, size: 100, thick: t, leaflet: 'outer', gaps: [{ at: 0, width: 52.12, band: true }], id: 'outer-leaflet' })
  const pal = LIPID, wl = Math.max(3.5, t * g.k * 0.027), red = deep(PEROXIDE), yellow = rich(SPARK)
  const headOf = (u, id) => `<g id="${id}">${g.circle(u, -rows, head, 'url(#outer-leaflet-head-gradient)', pal.outline, f(wl))}</g>`
  const u1 = -13.1, u2 = 13.1
  // The oxidised lipid: one straight chain, the other bent over towards the neighbour, ending in the hydroperoxide.
  const end = [-3.5, -11.5]
  const bent = catmull([[u1 + dx, -tailOut], [u1 + dx, -18], [-6, -13], end], 10)
  const ox = `<g id="oxidised-lipid"><g id="oxidised-lipid-tails">${line([[u1 - dx, -tailOut], [u1 - dx, -tailIn]].map(g.P), pal.outline, wl)}${line(bent.map(g.P), pal.outline, wl)}</g>${headOf(u1, 'oxidised-lipid-head')}</g>`
  // The neighbour, a lipid radical: both chains whole, the spark on the one facing the oxidised lipid.
  const nb = `<g id="lipid-radical"><g id="lipid-radical-tails">${[-dx, dx].map((d) => line([[u2 + d, -tailOut], [u2 + d, -tailIn]].map(g.P), pal.outline, wl)).join('')}</g>${headOf(u2, 'lipid-radical-head')}</g>`
  // –OOH: two oxygens and the hydrogen, from the end of the bent chain down into the middle of the membrane.
  const O1 = [-2.5, -4], O2 = [0, 5.2], H = [5.8, 8.6], ro = 5.4
  const bonds = line([end, O1, O2].map(g.P), red.outline, 8) + line([O2, H].map(g.P), GREY.outline, 7)
  const oxy = [O1, O2].map(([x, y], i) => ligand(g, { x, y, size: 2 * ro, id: `peroxide-oxygen-${i + 1}`, pal: red, w: 5 }))
  const oL = [O1, O2].map(([x, y], i) => lettering(g, { x, y: y + 0.15, h: 5, text: 'O', colour: red.outline, id: `peroxide-oxygen-${i + 1}-letter`, w: 4.2 }).body).join('')
  const hyd = `<g id="hydrogen">${g.circle(H[0], H[1], 3.4, GREY.light, GREY.outline, 4)}${lettering(g, { x: H[0], y: H[1], h: 3.4, text: 'H', colour: GREY.outline, id: 'hydrogen-letter', w: 3.4 }).body}</g>`
  const peroxide = { defs: oxy.map((o) => o.defs).join(''), body: `<g id="hydroperoxide"><g id="hydroperoxide-bonds">${bonds}</g>${oxy.map((o) => o.body).join('')}${oL}${hyd}</g>`, parts: [['hydroperoxide', red]] }
  const rad = spark(g, { x: u2 - dx, y: -14, r: 8, id: 'radical', pal: yellow })
  const arr = arrow(g, { points: [[u2 + 6, 2], [24, 9], [30.5, 4], [32, -9]], colour: INK, w: 7.5, id: 'arrow' })
  icon('Lipid peroxidation', join(inner, outer, own('lipids', ox + nb, []), peroxide, rad, extra(arr)))
}

// ---------------------------------------------------------------------------------------------------------------------
// Complex I (NADH dehydrogenase): the L-shaped respiratory complex in the inner mitochondrial membrane. NADH docks at
// the top of the arm that reaches into the matrix (above), its electrons run down a chain of iron–sulphur clusters, and
// the arm in the membrane pumps protons from the matrix to the intermembrane space (below).
// (SiliCoDraw draws a membrane of grey dots, the complex as two blue rounded boxes, five orange clusters on a dotted
// line, an orange hexagon for NADH with a small arrow, and three protons, circles with a plus, each with a long arrow
// down. Here the membrane is the bilayer part in the mitochondrion's lipids, the complex drawn here in the blue of
// membrane proteins as one body with one outline, the clusters small mustard cubes on a thin line, NADH the ring of NAD
// in magenta lettered "NADH", and each proton an ion of the set (green) lettered "H+", its arrow in the protons' outline
// tone.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.5, [0, 1.05])
  const pal = MEMBRANE_PROTEIN, fes = deep(FES), h = deep(PROTON), nadh = deep(NADH), t = 34, my = 22
  const arm = [-40, my - 19, 20, my + 19], up = [-1, -44, 21, my]
  const W = 8
  const mem = bilayer(g, { x: 0, y: my, size: 100, thick: t, pal: MITO_LIPID, gaps: [[arm[0] - 1.6, arm[2] + 1.6]], id: 'inner-membrane' })
  const D = [roundRect(g, arm, 10), roundRect(g, up, 10)]
  const complex = own('complex-I', `<g id="complex-I-body">${g.union(D, 'url(#complex-I-gradient)', pal.outline, W / 2)}${g.hl(4, -35, 13, 4.2, -80, pal.light)}</g>`, [['complex I', pal]], g.grad('complex-I-gradient', [-47, -43, 16, my + 18], pal))
  // Iron–sulphur clusters down the matrix arm, on the path the electrons take.
  const ys = [-34, -24, -14, -4, 6], cx = 10
  const path = line([[cx, -36], [cx, 11]].map(g.P), fes.outline, 4)
  const cubes = ys.map((y) => `<path d="${roundRect(g, [cx - 3.6, y - 3.6, cx + 3.6, y + 3.6], 1.4)}" fill="${fes.small}" stroke="${fes.outline}" stroke-width="3.5" stroke-linejoin="round"/>`).join('')
  const clusters = own('iron-sulphur-clusters', path + cubes, [['iron-sulphur clusters', fes]])
  const nad = nadRing(g, { x: 37, y: -34, size: 27, text: 'NADH', pal: nadh, id: 'NADH', h: 5.3 })
  const dock = arrow(g, { x: 0, y: 0, points: [[32, -21], [23.5, -21]], colour: nadh.outline, w: 7, head: 24, id: 'NADH-arrow' })
  // Protons: three ions above the membrane arm, each with its arrow down through it.
  const xs = [-32, -20, -8]
  const protons = xs.map((x, i) => {
    const ball = ligand(g, { x, y: -20, size: 11.4, id: `proton-${i + 1}`, pal: h, w: 4.5 })
    const L = lettering(g, { x: x - 0.3, y: -19.7, h: 4.2, text: 'H+', colour: h.outline, id: `proton-${i + 1}-letters`, w: 3.6 })
    return { defs: ball.defs, body: ball.body + L.body, parts: ball.parts }
  })
  const arrows = xs.map((x, i) => arrow(g, { points: [[x, -12.5], [x, 48]], colour: h.outline, w: 6.5, id: `proton-${i + 1}-arrow` }))
  icon('Complex I', join(mem, complex, clusters, extra(dock), nad, ...arrows.map(extra), ...protons))
}

// ---------------------------------------------------------------------------------------------------------------------
// NAD⁺/NADH ratio: a balance with two NAD⁺ on the side that has sunk and one NADH on the side that has risen: much more
// NAD⁺ than NADH, a high ratio.
// (SiliCoDraw draws a grey balance, two orange hexagons with a plus badge and one grey hexagon with an "H". Here the
// balance is drawn here in a true grey, NAD⁺ is the ring of NAD in cerulean lettered "NAD+" (as mg17's NAD⁺), NADH the
// same ring in magenta lettered "NADH" (as in Complex I).)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.45, [0, 3.5])
  const ox = deep(NAD_OX), red = deep(NADH), S = 22, hL = 4.9
  const pivot = [0, -31], Lend = [-28, -23], Rend = [28, -39], drop = 24, pw = 23
  const pan = (end, id) => {
    const [x, y] = end, rim = y + drop
    const strings = line([[x - pw + 3, rim], end, [x + pw - 3, rim]].map(g.P), GREY.outline, 4.5)
    const dish = g.path(`M${P2(g.P([x - pw, rim]))} L${P2(g.P([x + pw, rim]))} C${P2(g.P([x + pw - 4, rim + 9]))} ${P2(g.P([x - pw + 4, rim + 9]))} ${P2(g.P([x - pw, rim]))} Z`, 'url(#balance-gradient)', GREY.outline, 7)
    return { strings: `<g id="${id}-strings">${strings}</g>`, dish: `<g id="${id}">${dish}</g>` }
  }
  const left = pan(Lend, 'left-pan'), right = pan(Rend, 'right-pan')
  const stand = g.path(`M${[[-15, 45], [-9, 37], [9, 37], [15, 45]].map((p) => P2(g.P(p))).join(' L')} Z`, 'url(#balance-gradient)', GREY.outline, 7) + line([[0, 37], pivot].map(g.P), GREY.outline, 15)
  const beam = line([Lend, Rend].map(g.P), GREY.outline, 15) + g.circle(pivot[0], pivot[1], 4.2, GREY.base, GREY.outline, 6)
  const ringH = S * 0.866 / 2 + 1.5
  const nads = [-11.5, 11.5].map((dx, i) => nadRing(g, { x: Lend[0] + dx, y: Lend[1] + drop - ringH, size: S, text: 'NAD+', pal: ox, id: `NAD-${i + 1}`, h: hL }))
  const nh = nadRing(g, { x: Rend[0], y: Rend[1] + drop - ringH, size: S, text: 'NADH', pal: red, id: 'NADH', h: hL * 0.92 })
  const balance = own('balance', `<g id="stand">${stand}</g>${left.strings}${right.strings}<g id="beam">${beam}</g>${left.dish}${right.dish}`, [], g.grad('balance-gradient', [-50, -40, 50, 46], GREY))
  icon('NAD ratio', join(balance, ...nads, nh))
}

// ---------------------------------------------------------------------------------------------------------------------
// p21 (CDKN1A): the CDK inhibitor p21, made when p53 switches its gene on, lies across the cyclin E–CDK2 complex and
// blocks it, which halts the cell cycle in G1.
// (SiliCoDraw draws cyclin E and CDK2 as two blobs, p21 as a red chain draped over both from a red oval lettered "p21",
// and p53 as four grey balls with an arrow to p21. Here cyclin E and CDK2 are the protein part, CDK2 in the set's amber
// and cyclin E green; p21 is drawn here, a red chain (an unstructured protein) ending in its N-terminal domain lettered
// "p21"; p53 is a tetramer of four blue balls with one outline round them, the arrow grey.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.9, [0.5, -2.2])
  const red = deep(P21), cyc = protein(g, { x: -24, y: 21, size: 44, turn: -20, id: 'cyclin-E', pal: soft(CYCLIN) })
  const cdk = protein(g, { x: 18, y: 19, size: 56, turn: 30, id: 'CDK2' })
  // The chain: a tube from the N-terminal domain over cyclin E and into CDK2.
  const pts = catmull([[-27, -12], [-33, -2], [-30, 9], [-19, 9], [-7, 12], [6, 17], [17, 11], [27, 3], [38, 8]], 12).map(g.P)
  const T = 26, Wc = 5
  const tube = line(pts, red.outline, T + 2 * Wc) + line(pts, red.small, T)
  const N = [-22, -26], rx = 16, ry = 11.5
  const domain = g.ellipse(N[0], N[1], rx, ry, 0, red.outline, red.outline, 0) + g.ellipse(N[0], N[1], rx - 1.1, ry - 1.1, 0, red.small)
  const p21L = lettering(g, { x: N[0] - 0.2, y: N[1] - 1.2, h: 9.5, text: 'p21', colour: red.light, id: 'p21-letters' })
  const p21 = own('p21', `<g id="p21-chain">${tube}</g><g id="p21-domain">${domain}${p21L.body}</g>`, [['p21', red]])
  const blue = soft(P53), r = 6
  const tet = [[26, -42], [38, -42], [26, -30], [38, -30]].map(([x, y]) => circleD(g, x, y, r))
  const p53 = own('p53', g.union(tet, 'url(#p53-gradient)', blue.outline, 4) + g.hl(23.5, -45, 5, 2, -40, blue.light), [['p53', blue]], g.grad('p53-gradient', [20, -48, 44, -24], blue))
  const arr = arrow(g, { points: [[18, -37], [10, -33], [0, -29]], colour: INK, w: 7.5, id: 'arrow' })
  icon('p21', join(cyc, cdk, p21, p53, extra(arr)))
}

// ---------------------------------------------------------------------------------------------------------------------
// p62/SQSTM1 autophagy receptor: p62 links ubiquitinated cargo (a protein aggregate) to LC3 on the growing
// autophagosome membrane (the phagophore). Each p62 binds ubiquitin by its UBA domain (top) and LC3 by its LIR motif
// (bottom); its PB1 domains join the p62 molecules side by side into a filament.
// (SiliCoDraw draws a grey aggregate with three pairs of ubiquitin balls, three p62 molecules (a ball, a PB1 oval, a
// stalk and a small ball) and a curved double membrane with three lilac LC3 ovals. Here the cargo is the aggregate part in
// a true grey (as SiliCoDraw's), ubiquitin the ubiquitin part (amber beads), p62 drawn here in SiliCoDraw's purple, LC3
// the protein part in green, and the phagophore the bilayer part bent into a cup, in the aqua of the set's vesicles (the
// lipids' peach lay 23° from ubiquitin's amber).)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.42, [0, 2])
  const p = deep(P62), xs = [-18, 0, 18]
  const cargo = aggregate(g, { x: 0, y: -28.5, size: 44, count: 5, pal: GREY })
  const ub = xs.map((x, i) => ubiquitin(g, { x: x * 0.92, y: x ? -6.5 : -3.5, size: 14, count: 2, turn: -90, zigzag: 0.25, id: `ubiquitin-${i + 1}` }))
  const mem = bilayer(g, { x: 0, y: 44, size: 96, thick: 18, bend: -40, pal: soft(PHAGOPHORE), id: 'phagophore' })
  const lc3 = xs.map((x, i) => { const a = mem.along(x), n = ((+a.turn - 90) * Math.PI) / 180; return protein(g, { x: +a.x + Math.cos(n) * 12.3, y: +a.y + Math.sin(n) * 12.3, size: 11, turn: +a.turn, id: `LC3-${i + 1}`, pal: soft(LC3) }) })
  // p62: the stalk from the UBA domain (top) to the LIR motif (bottom), the PB1 domain across it.
  const top = (x) => (x ? 2 : 5), bottom = (x) => 26.5 + Math.abs(x) * -0.05
  const stalks = xs.map((x) => line([[x, top(x)], [x, bottom(x)]].map(g.P), p.outline, 10)).join('')
  const pb1 = xs.map((x) => g.ellipse(x, 14.5, 9.8, 6.6, 0, `url(#p62-gradient)`, p.outline, 6)).join('') + xs.map((x) => g.hl(x - 4.5, 11.6, 5, 1.7, -10, p.light)).join('')
  const dots = xs.flatMap((x) => [g.circle(x, top(x), 4.2, p.small), g.circle(x, bottom(x), 3.4, p.small)]).join('')
  const p62 = own('p62', `<g id="p62-stalks">${stalks}</g><g id="p62-UBA-and-LIR">${dots}</g><g id="p62-PB1">${pb1}</g>`, [['p62', p]], boxGrad('p62-gradient', p.base, p.shadow))
  icon('p62 autophagy receptor', join({ ...cargo, parts: [] }, ...ub, mem, ...lc3, p62))
}

// ---------------------------------------------------------------------------------------------------------------------
// Protein turnover: the cycle of a protein's life: made on the ribosome (left), folded (top), broken down by the
// proteasome (right) into amino acids (bottom), which are used again.
// (SiliCoDraw draws four grey arrows round a circle between a pale ribosome on its mRNA, an orange folded protein, a
// barrel for the proteasome and four orange amino acids. Here the ribosome is the ribosome part with its mRNA, the protein
// the protein part, the proteasome the part (violet: its purple lay 37° from the mRNA's rose), the amino acids four small
// green molecules (as every small molecule of the set), and the arrows grey.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.62, [-3.5, -1]), C = [0, 1.5], R = 35
  const ribo = ribosome(g, { x: -36, y: 2, size: 34, mRNA: true })
  const prot = protein(g, { x: 0, y: -34, size: 29, id: 'protein' })
  const pro = proteasome(g, { x: 35, y: 1.5, size: 33, pal: soft(PROTEASOME) })
  const aminoPal = deep(SMALL)
  const amino = own('amino-acids', [[-10, 36], [-3.3, 42], [3.3, 35], [10, 41]].map(([x, y]) => g.circle(x, y, 3.8, aminoPal.small)).join(''), [['amino acids', aminoPal]])
  const arcs = [[207, 245], [295, 333], [25, 63], [117, 153]].map(([a0, a1], i) => arrow(g, { points: arcPts(C, R, a0, a1), corners: true, colour: INK, w: 8.5, id: `arrow-${i + 1}` }))
  icon('Protein turnover', join(...arcs.map(extra), ribo, prot, pro, amino))
}

check()
console.log('written to', OUT)
