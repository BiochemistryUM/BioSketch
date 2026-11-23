// Eight icons of SiliCoDraw's "Molecules & genetics" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David
// Carlsson; see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts
// in ../parts/: sequencing trace, insulin, cholesterol, phospholipid, glycan, histone modification, enhancer loop and
// tRNA. Their compositions are read by hand from the source in a 100 × 100 box centred on 0,0 and scaled onto a 512 page.
// Parts used: the nucleosome (genetics.mjs), phosphate, ligand (the amino acid), protein (transcription factor, Mediator)
// (molecules.mjs), the lipid palette (membranes.mjs) and arrows (tissue.mjs). Drawn here, because no part draws them: the
// peaks of a sequencing trace, the two chains of insulin with their disulfide bridges, the sterol rings (as mg06's steroid
// hormone) with cholesterol's side chain, a single phospholipid (head and two zigzag tails, as mg06's fatty acid), the
// SNFG symbols of a glycan, a looped DNA tube, and the cloverleaf of a
// tRNA (the RNA strand of mg06's microRNA hairpin). Nothing is lettered: where SiliCoDraw writes a label, a shape says the
// same (see each icon).
// Usage: node mg09.mjs <folder>
import { cellTypes, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex, toLch } from '../colour.mjs'
import { f } from '../shapes.mjs'
import { ligand, phosphate, protein } from '../parts/molecules.mjs'
import { LIPID } from '../parts/membranes.mjs'
import { arrow } from '../parts/tissue.mjs'
import { nucleosome } from '../parts/genetics.mjs'

const OUT = process.argv[2]
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012) are left out of the hue check, as STYLE.md says: BioSketch never recolours them with a part.
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p]) => toLch(p.base).c >= 0.012), defs, body)

// Hues of the set (OKLCH degrees): RNA rose 15, small molecules green 165, DNA blue 267, protein amber 75, phosphate
// mustard 92, lipids peach 52, nucleus lilac 319.
const RNA = 15, ION = 165, DNA = hueOf('#4f6bb8'), AMBER = 75, PHOSPHATE = 92, RED = hueOf('#e86b6b')
const STEROID = hueOf('#f3e3b8') // the pale gold of mg06's steroid hormone, 90°
// A true grey (chroma below 0.012) for lines and arrows that should not recolour with a part.
const grey = (l) => ({ light: toHex({ l: Math.min(0.99, l + 0.18), c: 0, h: 0 }), base: toHex({ l, c: 0.004, h: 255 }), shadow: toHex({ l: l - 0.08, c: 0.006, h: 255 }), small: toHex({ l: l - 0.2, c: 0.006, h: 255 }), outline: toHex({ l: l - 0.38, c: 0.008, h: 255 }) })
const GREY = toHex({ l: 0.5, c: 0.008, h: 255 })
/** A frame that fits points (units) into the page with margins of 26 px, `pad` px more for what reaches past them. */
const fit = (pts, pad = 0) => {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  return page((460 - 2 * pad) / Math.max(x1 - x0, y1 - y0), [(x0 + x1) / 2, (y0 + y1) / 2])
}

const P2 = ([x, y]) => `${f(x)},${f(y)}`
/** An open line through page points. */
const stroke = (pts, colour, w, cap = 'round') => `<path d="M${pts.map(P2).join(' L')}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
/** A closed polygon through page points, filled and outlined. */
const poly = (pts, fill, s = '', w = 0) => `<path d="M${pts.map(P2).join(' L')}Z" fill="${fill}"${s ? ` stroke="${s}" stroke-width="${f(w)}" stroke-linejoin="round"` : ''}/>`
/** One merged result of several parts. */
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n') })
/** One gradient that lights every shape that uses it from its own top left. */
const boxGrad = (id, pal) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`
/** A tube along page points: an outline `w` wide on each side under a fill `T` wide, round ends. */
const tube = (pts, T, pal, w) => stroke(pts, pal.outline, T + 2 * w) + stroke(pts, pal.base, T)
/** A ball (units of g) with a gradient over its own box, an outline and a small highlight when it is large. */
const ball = (g, [x, y], r, pal, gid, w) => g.circle(x, y, r - w / 2 / g.k, `url(#${gid})`, pal.outline, w) + (r * g.k > 30 ? g.hl(x - r * 0.4, y - r * 0.44, f(r * g.k * 0.36), f(r * g.k * 0.14), -40, pal.light) : '')
/** Points of a cubic Bézier, n steps. */
const bez = (a, b, c, d, n = 24) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, s = 1 - t; return [0, 1].map((k) => s * s * s * a[k] + 3 * s * s * t * b[k] + 3 * s * t * t * c[k] + t * t * t * d[k]) })
/** A zigzag of carbon bonds (120° between bonds) along a course of straight stretches, `step` long each, starting at the first point. */
const zigzag = (course, step, first = 1) => {
  const out = [course[0]], rise = (step / 2) * Math.tan(Math.PI / 6)
  let side = first
  for (let i = 1; i < course.length; i++) {
    const [a, b] = [course[i - 1], course[i]], l = Math.hypot(b[0] - a[0], b[1] - a[1]), u = [(b[0] - a[0]) / l, (b[1] - a[1]) / l], nrm = [-u[1], u[0]]
    const n = Math.round(l / (step / 2))
    for (let j = 1; j <= n; j++) { const t = (j * l) / n, o = j === n ? 0 : side * rise; out.push([a[0] + u[0] * t + nrm[0] * o, a[1] + u[1] * t + nrm[1] * o]); if (j < n) side = -side }
  }
  return out
}

// ---------- Sequencing trace ----------
// A Sanger sequencing trace: peaks of four colours along a base line, one for each base read, with the base calls above
// them as a row of small blocks in the colours of their peaks.
// (SiliCoDraw writes "A C G T" above seven peaks of equal height; the letters are left out and the row of coloured blocks
// over the peaks says which base each peak is. The peaks differ a little in height, as in a real trace. The four dye
// colours are the usual ones: A green 150°, C blue 263°, G a true grey for SiliCoDraw's black, T red 25°.)
{
  const g = page(4.61, [0, -7])
  const A = deep(hueOf('#22c55e')), C = deep(hueOf('#2563eb')), G = grey(0.72), T = deep(hueOf('#d64545'))
  const peaks = [[A, -39, 54], [C, -26, 62], [G, -13, 48], [T, 0, 60], [A, 13, 52], [T, 26, 64], [C, 39, 56]]
  const base = 30, s = 3.7, bw = 8.4
  const curve = (x0, h) => Array.from({ length: 41 }, (_, i) => { const x = x0 - 2.7 * s + (5.4 * s * i) / 40; return [x, base - h * Math.exp(-((x - x0) ** 2) / (2 * s * s))] })
  const defs = [['A', A], ['C', C], ['G', G], ['T', T]].map(([n, p]) => boxGrad(`peak-${n}-gradient`, p)).join('')
  const name = (p) => (p === A ? 'A' : p === C ? 'C' : p === G ? 'G' : 'T')
  const body = peaks.map(([p, x0, h], i) => { const c = curve(x0, h).map(g.P); return `<g id="peak-${i + 1}">${poly(c, `url(#peak-${name(p)}-gradient)`)}${stroke(c, p.outline, 7)}</g>` }).join('')
  const calls = peaks.map(([p, x0], i) => { const [x, y] = g.P([x0 - bw / 2, -45]); return `<rect id="base-call-${i + 1}" x="${f(x)}" y="${f(y)}" width="${f(bw * g.k)}" height="${f(bw * g.k)}" rx="${f(2 * g.k)}" fill="${p.small}"/>` }).join('')
  cellType('Sequencing trace', [['A', A], ['C', C], ['G', G], ['T', T]], defs,
    `<g id="peaks">${body}</g>\n<g id="base-line">${stroke([g.P([-48, base]), g.P([48, base])], GREY, 9)}</g>\n<g id="base-calls">${calls}</g>`)
}

// ---------- Insulin ----------
// Insulin: its two peptide chains, the shorter A chain above the longer B chain, held together by two disulfide bridges
// (each a pair of yellow sulfur atoms).
// (SiliCoDraw writes "A" and "B" beside the chains; the letters are left out, the chains differ by colour and length. Its
// chains are of one length; here the B chain (30 amino acids) runs on past the A chain (21) at both ends, and the bridges
// stand where A7–B7 and A20–B19 join them. The A chain's own bridge (A6–A11) is left out at this size.)
{
  const g = page(4.68, [0, 1.5])
  const Apal = deep(hueOf('#6f86c8')), Bpal = deep(hueOf('#e3955a')), S = rich(96)
  const wave = (x0, x1, y0, sign) => Array.from({ length: 61 }, (_, i) => { const x = x0 + ((x1 - x0) * i) / 60; return [x, y0 + sign * 5 * Math.sin((2 * Math.PI * (x + 20)) / 40 + Math.PI / 2)] })
  const a = wave(-30, 30, -14, 1), b = wave(-45, 45, 16, -1)
  const T = 6 * g.k, W = 5.5
  const bridges = [-20, 22]
  const bonds = bridges.map((x) => stroke([g.P([x, -9]), g.P([x, 11])], S.outline, 7)).join('')
  const sulfur = bridges.flatMap((x) => [[x, -2.3], [x, 4.3]]).map((p) => ball(g, p, 3.6, S, 'sulfur-gradient', 5)).join('')
  cellType('Insulin', [['A chain', Apal], ['B chain', Bpal], ['disulfide bridges', S]], boxGrad('sulfur-gradient', S),
    `<g id="disulfide-bonds">${bonds}</g>\n<g id="B-chain">${tube(b.map(g.P), T, Bpal, W)}</g>\n<g id="A-chain">${tube(a.map(g.P), T, Apal, W)}</g>\n<g id="sulfur-atoms">${sulfur}</g>`)
}

// ---------- Cholesterol ----------
// Cholesterol: the four fused rings of every sterol (as mg06's steroid hormone), the two methyl groups at the ring
// junctions, the hydroxyl group at C3 (a small red oxygen atom) and the branched hydrocarbon side chain at C17.
// (SiliCoDraw writes "HO" at the first ring; the letters are left out and the oxygen is drawn as a red atom, the oxygen's
// red of the set. Its side chain has three bonds; here it has its eight carbons, C20 to C27, with the methyl at C20 and the
// fork at C25. The rings lie as mg06's steroid hormone has them.)
{
  const pal = rich(STEROID), ox = deep(RED), r = 13, s3 = r * Math.sqrt(3)
  const hex = ([cx, cy]) => Array.from({ length: 6 }, (_, i) => { const t = Math.PI / 6 + (i * Math.PI) / 3; return [cx + r * Math.cos(t), cy + r * Math.sin(t)] })
  const A = [0, 0], B = [s3, 0], C = [s3 * 1.5, -1.5 * r]
  const edge = r, apo = edge / (2 * Math.tan(Math.PI / 5)), R5 = edge / (2 * Math.sin(Math.PI / 5)), D = [C[0] + s3 / 2 + apo, C[1]]
  const pent = [144, 216, 288, 0, 72].map((a) => [D[0] + R5 * Math.cos((a * Math.PI) / 180), D[1] + R5 * Math.sin((a * Math.PI) / 180)])
  const rings = [hex(A), hex(B), hex(C), pent]
  const c10 = [s3 / 2, -r / 2], c13 = [C[0] + s3 / 2, C[1] - r / 2], up = 11
  // The side chain, bond by bond at 120°: C17 → C20 (methyl C21) → C22 → C23 → C24 → C25 (forks to C26 and C27).
  const dir = (p, deg, l = r) => [p[0] + l * Math.cos((deg * Math.PI) / 180), p[1] + l * Math.sin((deg * Math.PI) / 180)]
  const c17 = pent[2], c20 = dir(c17, -75), c21 = dir(c20, -135), c22 = dir(c20, -15), c23 = dir(c22, -75), c24 = dir(c23, -15), c25 = dir(c24, -75), c26 = dir(c25, -15), c27 = dir(c25, -135)
  const c3 = hex(A)[2], o = dir(c3, 150, r * 0.95)
  const g = fit([...rings.flat(), c21, c26, c27, [c10[0], c10[1] - up], [c13[0], c13[1] - up], [o[0] - 5.2, o[1] + 5.2]], 6)
  const chains = [[c17, c20, c22, c23, c24, c25, c26], [c20, c21], [c25, c27]]
  cellType('Cholesterol', [['sterol', pal], ['hydroxyl', ox]], g.grad('sterol-gradient', [-s3 / 2, C[1] - r, D[0] + R5, r], pal) + boxGrad('oxygen-gradient', ox),
    `<g id="side-chain">${chains.map((c) => stroke(c.map(g.P), pal.outline, 11)).join('')}</g>\n` +
      `<g id="rings">${rings.map((pts) => poly(pts.map(g.P), 'url(#sterol-gradient)')).join('')}` +
      `${g.hl(-3.5, -4.2, 16, 6, -40, pal.light)}${rings.map((pts) => poly(pts.map(g.P), 'none', pal.outline, 11)).join('')}</g>\n` +
      `<g id="methyl-groups">${[c10, c13].map(([x, y]) => stroke([g.P([x, y]), g.P([x, y - up])], pal.outline, 11)).join('')}</g>\n` +
      `<g id="hydroxyl">${stroke([g.P(c3), g.P(o)], pal.outline, 11)}${ball(g, o, 5.2, ox, 'oxygen-gradient', 7)}</g>`)
}

// ---------- Phospholipid ----------
// Phospholipid: a polar head group (a peach ball, as the heads of the lipids of every membrane of the set) joined by its
// phosphate (a mustard dot) to two fatty-acid tails, one of them bent at a cis double bond.
// (SiliCoDraw writes "P" in the head; the letter is left out and the phosphate is drawn as the phosphate of the set, at the
// neck between the head group and the glycerol that carries the tails. The tails are zigzags of carbon bonds, as mg06's
// fatty acid draws its chain; the kinked one keeps SiliCoDraw's bend.)
{
  const g = page(4.75, [1.6, 1]), pal = LIPID
  const head = [0, -32], r = 13.5
  const left = zigzag([[-8, -9], [-8, 47]], 13, 1)
  const right = zigzag([[8, -9], [8, 17], [17.5, 41]], 13, -1)
  const glycerol = [[-8, -9], [8, -9]]
  const p = phosphate(g, { x: 0, y: -15, size: 10.5, id: 'phosphate' })
  cellType('Phospholipid', [['phospholipid', pal], ['phosphate', p.parts[0][1]]], g.grad('head-gradient', [head[0] - r, head[1] - r, head[0] + r, head[1] + r], pal),
    `<g id="tails">${[left, right, glycerol].map((c) => stroke(c.map(g.P), pal.outline, 16)).join('')}${stroke([g.P([0, -9]), g.P([0, -15])], pal.outline, 16)}</g>\n` +
      `<g id="head-group">${g.circle(head[0], head[1], r, 'url(#head-gradient)', pal.outline, 10)}${g.hl(head[0] - 5.5, head[1] - 6, 16, 6, -45, pal.light)}</g>\n` + p.body)
}

// ---------- Glycan ----------
// Glycan: a complex N-glycan of two branches in the Symbol Nomenclature for Glycans (SNFG): two N-acetylglucosamines
// (blue squares) at the root with a fucose (red triangle) on the first, three mannoses (green circles), and on each
// branch an N-acetylglucosamine, a galactose (yellow circle) and a sialic acid (purple diamond).
// (SiliCoDraw's branches go from mannose straight to galactose; here each carries the N-acetylglucosamine that stands
// between them in every complex N-glycan. The SNFG colours are kept, in the soft look: they are what the symbols are known
// by. The links are a true grey.)
{
  const g = page(4.38, [1.5, -1.5])
  const snfg = (h, l = 0.74) => ({ light: toHex({ l: 0.96, c: 0.03, h }), base: toHex({ l: l + 0.06, c: 0.13, h }), shadow: toHex({ l: l - 0.02, c: 0.15, h }), small: toHex({ l: l - 0.06, c: 0.15, h }), outline: toHex({ l: 0.5, c: 0.13, h }) })
  const GlcNAc = snfg(hueOf('#0072BC')), Man = snfg(hueOf('#00A651')), Gal = snfg(hueOf('#FFD400'), 0.84), Sia = snfg(hueOf('#A54399')), Fuc = snfg(hueOf('#ED1C24'))
  Gal.outline = toHex({ l: 0.62, c: 0.12, h: hueOf('#FFD400') })
  const s = 7, W = 6.5, dy = 15, x1 = 19
  const y = [44, 44 - dy, 45 - 2 * dy, 45 - 3 * dy, 45 - 4 * dy, 45 - 5 * dy, 45 - 6 * dy]
  const fuc = [x1 + 2, y[0]]
  const links = [[[0, y[0]], [0, y[2]]], [[0, y[2]], [-x1, y[3]], [-x1, y[6]]], [[0, y[2]], [x1, y[3]], [x1, y[6]]], [[0, y[0]], fuc]]
  const square = ([x, yy], pal, id) => { const [X, Y] = g.P([x - s + W / 2 / g.k, yy - s + W / 2 / g.k]), side = (2 * s) * g.k - W; return `<rect id="${id}" x="${f(X)}" y="${f(Y)}" width="${f(side)}" height="${f(side)}" rx="${f(1.6 * g.k)}" fill="url(#GlcNAc-gradient)" stroke="${pal.outline}" stroke-width="${W}"/>` }
  const circ = ([x, yy], pal, gid, id) => `<g id="${id}">${ball(g, [x, yy], s * 1.08, pal, gid, W)}</g>`
  const shape = (pts, pal, gid, id) => `<path id="${id}" d="M${pts.map(g.P).map(P2).join(' L')}Z" fill="url(#${gid})" stroke="${pal.outline}" stroke-width="${W}" stroke-linejoin="round"/>`
  const diamond = ([x, yy], id) => shape([[x, yy - s * 1.3 + 1], [x + s * 1.1 - 0.6, yy], [x, yy + s * 1.3 - 1], [x - s * 1.1 + 0.6, yy]], Sia, 'Sia-gradient', id)
  const tri = ([x, yy]) => shape([[x + 1.2, yy - s + 1], [x + s + 1, yy + s - 1], [x - s + 1.4, yy + s - 1]], Fuc, 'Fuc-gradient', 'fucose')
  cellType('Glycan', [['N-acetylglucosamine', GlcNAc], ['mannose', Man], ['galactose', Gal], ['sialic acid', Sia], ['fucose', Fuc]],
    [['GlcNAc', GlcNAc], ['Man', Man], ['Gal', Gal], ['Sia', Sia], ['Fuc', Fuc]].map(([n, p]) => boxGrad(`${n}-gradient`, p)).join(''),
    `<g id="links">${links.map((c) => stroke(c.map(g.P), GREY, 7)).join('')}</g>\n` +
      `<g id="N-acetylglucosamines">${square([0, y[0]], GlcNAc, 'GlcNAc-1')}${square([0, y[1]], GlcNAc, 'GlcNAc-2')}${square([-x1, y[4]], GlcNAc, 'GlcNAc-3')}${square([x1, y[4]], GlcNAc, 'GlcNAc-4')}</g>\n` +
      `<g id="mannoses">${circ([0, y[2]], Man, 'Man-gradient', 'mannose-1')}${circ([-x1, y[3]], Man, 'Man-gradient', 'mannose-2')}${circ([x1, y[3]], Man, 'Man-gradient', 'mannose-3')}</g>\n` +
      `<g id="galactoses">${circ([-x1, y[5]], Gal, 'Gal-gradient', 'galactose-1')}${circ([x1, y[5]], Gal, 'Gal-gradient', 'galactose-2')}</g>\n` +
      `<g id="sialic-acids">${diamond([-x1, y[6]], 'sialic-acid-1')}${diamond([x1, y[6]], 'sialic-acid-2')}</g>\n` + tri(fuc))
}

// ---------- Histone modification ----------
// Histone modification: a nucleosome (the nucleosome part of ../parts/genetics.mjs: the lilac histone core with the blue
// DNA wound round it as a double helix) whose four histone tails reach out of it, each carrying a mark at its end:
// acetyl groups (green), a phosphate (mustard) and a methyl group (red), lettered as the part marks tails.
// (SiliCoDraw writes "Ac", "Me" and "P" in coloured circles; so does the part, the marks also differing by colour. The
// histone core is the lilac of chromatin, not SiliCoDraw's pale blue core with a wave beneath.)
{
  const g = page(4.6, [0, 0])
  const n = nucleosome(g, { x: 0, y: 0, size: 100, tails: ['Ac', 'P', 'Ac', 'Me'], markSize: 1.4 })
  cellType('Histone modification', n.parts, n.defs, n.body)
}

// ---------- Enhancer loop ----------
// Enhancer loop: a stretch of DNA that loops out so that a distant enhancer (orange) comes to lie by the promoter (green)
// of a gene; a transcription factor (amber) bound to the enhancer and the Mediator complex (rose) bridge the two, and the
// bent arrow at the promoter shows where transcription starts and which way it runs.
// (SiliCoDraw writes "E" and "P" in the boxes; the letters are left out, the enhancer and promoter are stretches of the
// DNA in colours of their own, as mg02's gene. Its arrow at the end of the DNA becomes the bent arrow of the promoter, in
// grey. The DNA is a tube in the blue of DNA. Hues: enhancer 45°, transcription factor 88°, promoter 160°, DNA 267°,
// Mediator 350°.)
{
  const g = page(4.45, [0, -4]), dnaPal = deep(DNA), enh = deep(45), prom = deep(160), tf = rich(88), med = soft(350)
  const TW = 22, W = 5.5
  const loop = [...bez([-10, 30], [-40, -10], [-20, -46], [6, -40]), ...bez([6, -40], [30, -34], [36, -8], [10, 30]).slice(1)]
  const pts = [[-48, 30], ...Array.from({ length: 8 }, (_, i) => [-48 + (38 * (i + 1)) / 8, 30]).slice(0, -1), ...loop, ...Array.from({ length: 10 }, (_, i) => [10 + (38 * (i + 1)) / 10, 30])]
  const P = pts.map(g.P)
  // Where along the course the enhancer and the promoter lie (by index).
  const near = (x, y, from = 0) => { let best = from, d = Infinity; for (let i = from; i < pts.length; i++) { const e = Math.hypot(pts[i][0] - x, pts[i][1] - y); if (e < d) { d = e; best = i } } return best }
  const e0 = near(-18, -36), e1 = near(10, -39, e0), p0 = near(4, 22, e1), p1 = near(28, 30, p0)
  const seg = (a, b, pal) => stroke(P.slice(a, b + 1), pal.outline, TW + 2 * W, 'butt') + stroke(P.slice(a, b + 1), pal.base, TW, 'butt')
  const factor = protein(g, { x: -2, y: -21, size: 22, turn: 15, id: 'transcription-factor', pal: tf })
  const mediator = protein(g, { x: 7, y: 8, size: 30, turn: -60, id: 'Mediator', pal: med })
  const tss = 33
  const a = arrow(g, { points: [[tss, 30 - TW / 2 / g.k - 1], [tss, 14], [48, 14]], corners: true, w: 10, id: 'transcription-start', colour: GREY })
  const all = join(factor, mediator, a)
  cellType('Enhancer loop', [['DNA', dnaPal], ['enhancer', enh], ['promoter', prom], ['transcription factor', tf], ['Mediator', med]], all.defs,
    `<g id="DNA">${tube(P, TW, dnaPal, W)}<g id="enhancer">${seg(e0, e1, enh)}</g><g id="promoter">${seg(p0, p1, prom)}</g></g>\n` + mediator.body + '\n' + factor.body + '\n' + a.body)
}

// ---------- tRNA ----------
// tRNA: the cloverleaf of a transfer RNA, one RNA strand (rose, as every RNA of the set) folded into four paired stems (the
// base pairs as rungs, as mg06's microRNA hairpin): the acceptor stem at the top whose 3′ end carries the amino acid (an
// amber ball), the D arm at the left, the TΨC arm at the right and the anticodon arm below, whose loop shows its three
// anticodon bases.
// (SiliCoDraw draws a cross of green bars with three rings and writes "aa" in the amino acid; the letters are left out,
// and the molecule is drawn as the cloverleaf it is: one strand, paired stems, loops at their ends, the 3′ end longer than
// the 5′ end. It is the rose of RNA, not green (green is the small molecules'), and the amino acid is the amber of protein.)
{
  const g = page(4.25, [0, -8.5]), pal = deep(RNA), T = 17
  const h = 6, R = 9.2, neck = Math.sqrt(R * R - h * h)
  // A loop at the end of a stem, about its centre, `dir` the way the stem points; traced so that the strand runs on
  // round it the other way (reversed below).
  const loopAt = (end, dir) => {
    const cx = end[0] + dir[0] * neck, cy = end[1] + dir[1] * neck, a0 = Math.atan2(-dir[1], -dir[0]), side = Math.acos(neck / R)
    return Array.from({ length: 37 }, (_, i) => { const t = a0 + side + ((2 * Math.PI - 2 * side) * i) / 36; return [cx + R * Math.cos(t), cy + R * Math.sin(t)] })
  }
  const J = 6 // the four-way junction: strands at ±J
  const D = loopAt([-26, -8], [-1, 0]), Tp = loopAt([26, -8], [1, 0]), Ac = loopAt([0, 20], [0, 1])
  // The strand, 5′ to 3′: down the acceptor stem, round the D arm, the anticodon arm and the TΨC arm, up again.
  const strand = [[-J, -46], [-J, -8 - J], [-26, -8 - J], ...D.slice().reverse(), [-26, -8 + J], [-J, -8 + J], [-J, 20], ...Ac.slice().reverse(), [J, 20], [J, -8 + J], [26, -8 + J], ...Tp.slice().reverse(), [26, -8 - J], [J, -8 - J], [J, -50]]
  const rung = (a, b) => stroke([g.P(a), g.P(b)], pal.base, T * 0.6, 'butt')
  const rungs = [
    ...[-40, -33, -26, -19].map((y) => rung([-J, y], [J, y])),
    ...[-12, -19].map((x) => rung([x, -8 - J], [x, -8 + J])),
    ...[12, 19].map((x) => rung([x, -8 - J], [x, -8 + J])),
    ...[3, 10, 16].map((y) => rung([-J, y], [J, y])),
  ]
  const acc = [[J, -50], [J + 3, -55], [J + 9, -56]]
  const aa = ligand(g, { x: J + 15, y: -56, size: 13, id: 'amino-acid', pal: rich(AMBER) })
  // The anticodon: three bases standing out of the bottom of the loop.
  const c = [0, 20 + neck]
  const anticodon = [-28, 0, 28].map((d) => { const t = ((90 + d) * Math.PI) / 180, u = [Math.cos(t), Math.sin(t)]; return stroke([g.P([c[0] + u[0] * (R + 1), c[1] + u[1] * (R + 1)]), g.P([c[0] + u[0] * (R + 7.5), c[1] + u[1] * (R + 7.5)])], pal.base, T * 0.6) })
  cellType('tRNA', [['RNA', pal], ['amino acid', aa.parts[0][1]]], aa.defs,
    `<g id="RNA"><g id="base-pairs">${rungs.join('')}</g><g id="anticodon">${anticodon.join('')}</g>${stroke(strand.map(g.P), pal.small, T)}${stroke(acc.map(g.P), pal.small, T)}</g>\n` + aa.body)
}

check()
console.log('written to', OUT)
