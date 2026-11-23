// Eight icons of SiliCoDraw's "Molecules & genetics" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David
// Carlsson; see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts in
// ../parts/: ketone bodies (β-hydroxybutyrate), telomere length, APOE4, the NAD⁺ salvage pathway, a CpG island, bisulfite
// conversion, Polycomb silencing (H3K27me3) and 5-hydroxymethylcytosine. Their compositions are read by hand from the
// source in a 100 × 100 box centred on 0,0 and scaled onto a 512 page (`page` of ../cellkit.mjs). DNA is the DNA part
// (blue), chromosomes the chromosome part (lilac), atoms the ligand part, rings the hexagon of the glucose part, the lipid
// shell the bilayer part, NAMPT the enzyme part, arrows the arrow part; methyl groups are mg04's pins (orange heads).
// Drawn here because no part draws them: a drop of plasma, telomere caps, a helix bundle (apoE), base tiles, a nucleosome
// seen face on, the PRC2 complex, a sugar of the DNA backbone and the capsule that marks the hydroxymethyl group.
// Lettered (../parts/letters.mjs): atoms O and N, NAD⁺, NAM, NMN, the bases C and U, OH of 5hmC, ε4 of APOE4.
// Usage: node mg19.mjs <folder>
import { cellTypes, NUC, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex, toLch } from '../colour.mjs'
import { catmull, f, gradient2, pathOf } from '../shapes.mjs'
import { bilayer, LIPID } from '../parts/membranes.mjs'
import { chromosome, dna, enzyme } from '../parts/molecules.mjs'
import { arrow } from '../parts/tissue.mjs'
import { lettering, textWidth } from '../parts/letters.mjs'
import { fibre } from '../parts/genetics.mjs'
import { HYDROXYBUTYRATE, formula, go, skeletal } from '../parts/formula.mjs'

const OUT = process.argv[2]
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012) are left out of the hue check: they never join a part's hue.
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p]) => toLch(p.base).c >= 0.012), defs, body)

// Hues (OKLCH degrees). DNA 267° (the part's), methyl groups mg04's orange (57°), atoms as mg07 (oxygen red 22°, nitrogen
// blue 267°), small molecules and their rings the green of the set (165°), RNA rose (15°), lipids the peach of the bilayer
// part, lipid cores the yellow of mg05 (96°). Each icon says where it moved one of SiliCoDraw's colours.
const DNA = hueOf('#4f6bb8'), ORANGE = hueOf('#e3955a')
const RNA = 15, CORE = hueOf('#fde68a'), APO = hueOf('#6f86c8'), ISLAND = hueOf('#3f8f7a')
const dnaPal = deep(DNA), me = deep(ORANGE)
// A true grey for arrows and the sugar (the arrow part's INK lies within 36° of DNA blue).
const GREY = toHex({ l: 0.5, c: 0.006, h: 255 })
const greyPal = { light: toHex({ l: 0.98, c: 0, h: 0 }), base: toHex({ l: 0.93, c: 0.004, h: 255 }), shadow: toHex({ l: 0.85, c: 0.006, h: 255 }), small: toHex({ l: 0.74, c: 0.006, h: 255 }), outline: toHex({ l: 0.52, c: 0.008, h: 255 }) }

const P2 = ([x, y]) => `${f(x)},${f(y)}`
const lineD = (pts) => `M${pts.map(P2).join(' L')}`
/** An open line through page points. */
const stroke = (pts, colour, w, cap = 'round') => `<path d="${lineD(pts)}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
const disc = ([x, y], r, fill, s = '', w = 0) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}"${s ? ` stroke="${s}" stroke-width="${f(w)}"` : ''}/>`
const hl = ([x, y], rx, ry, rot, fill) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" transform="rotate(${rot} ${f(x)} ${f(y)})" fill="${fill}"/>`
/** A tube along page points: an outline `w` wide on each side under a fill `T` wide, round ends. */
const tube = (pts, T, fill, outline, w) => stroke(pts, outline, T + 2 * w) + stroke(pts, fill, T)
/** One merged result of several parts. */
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n') })
const polar = ([cx, cy], r, deg) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)]
/** A polygon of page points with its corners rounded by r (px). */
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
/** Letters of height h fitted so that `text` takes at most `share` of a width `room` (units of g). */
const fitH = (text, room, share, hMax) => Math.min(hMax, (room * share) / textWidth(text))
/** A methyl group as mg04's pin: a stalk from `from` to a head at `at` (units of g), filled orange; open (white) if not. */
const pin = (g, from, at, r, methylated, id, w = 7) => {
  const [hx, hy] = g.P(at), [fx, fy] = g.P(from), l = Math.hypot(hx - fx, hy - fy), end = [hx - ((hx - fx) / l) * r * g.k, hy - ((hy - fy) / l) * r * g.k]
  return `<g id="${id}">${stroke([[fx, fy], end], dnaPal.outline, w)}${disc([hx, hy], r * g.k - w / 2, methylated ? me.small : '#FFFFFF', methylated ? me.outline : dnaPal.outline, w)}</g>`
}

// ---------------------------------------------------------------------------------------------------------------------
// Ketone bodies: β-hydroxybutyrate, the main ketone body of the blood, as its skeletal formula in a drop of plasma:
// CH₃–CH(OH)–CH₂–COO⁻, the hydroxyl on a wedge (the R form the body makes).
// (SiliCoDraw's drop and formula. The formula is the skeletal part (../parts/formula.mjs): bonds in the green of small
// molecules, each oxygen a red ball lettered "O" (hydrogens left out), the charge of the carboxylate a minus beside it.
// The drop keeps SiliCoDraw's peach, moved from 54° to 62° to stand 36° from the oxygens.)
{
  const g = page(4.82, [0, 0]), drop = soft(62)
  const D = 'M0,-46C10,-30 36,-8 36,16C36,36 20,46 0,46C-20,46 -36,36 -36,16C-36,-8 -10,-30 0,-46Z'
  const mol = skeletal(g, { x: 0.25, y: 9.85, size: 67, id: 'beta-hydroxybutyrate', ball: 0.96, ...HYDROXYBUTYRATE })
  cellType('Ketone bodies', [['plasma', drop], ...mol.parts], g.grad('drop-gradient', [-36, -46, 36, 46], drop) + mol.defs,
    `<g id="drop"><path d="${g.D(D)}" fill="url(#drop-gradient)" stroke="${drop.outline}" stroke-width="12" stroke-linejoin="round"/>${g.hl(-12.5, -22, 36, 12, -56, drop.light)}</g>\n` + mol.body)
}

// ---------------------------------------------------------------------------------------------------------------------
// Telomere length: a chromosome with long telomeres (orange ends with their repeats as bands) becomes one with short
// telomeres: telomeres shorten with every division and with age.
// (SiliCoDraw's two blue banded chromosomes with orange caps and an arrow. The chromosomes are the part (lilac), its bands
// left out so the telomeres stand out; the telomeres are the orange ends of the chromatids themselves, as in mg03's
// Telomere. The arrow is a true grey.)
{
  const g = page(4.24, [0, 0]), telo = deep(ORANGE), SIZE = 86, X = 28.5, s = SIZE / 100
  const chrom = [-1, 1].map((sg) => chromosome(g, { x: sg * X, y: 0, size: SIZE, id: `chromosome-${sg < 0 ? 'long' : 'short'}-telomeres` }))
  // The chromatids as the part draws them (chromosome() in ../parts/molecules.mjs: the same centre lines, pinch and round
  // ends), so that the caps lie exactly on their tips. `share` is how much of each chromatid's length is telomere.
  const pinch = (t) => 9.5 * (1 - 0.42 * Math.exp(-(((t - 0.5) / 0.09) ** 2)))
  const sides = (cl) => {
    const n = cl.length, left = [], right = []
    for (let i = 0; i < n; i++) {
      const a = cl[Math.max(0, i - 1)], b = cl[Math.min(n - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]), [nx, ny] = [-(b[1] - a[1]) / l, (b[0] - a[0]) / l], h = pinch(i / (n - 1))
      left.push([cl[i][0] + nx * h, cl[i][1] + ny * h]); right.push([cl[i][0] - nx * h, cl[i][1] - ny * h])
    }
    return { left, right }
  }
  const halfRound = (c0, from) => { const a0 = Math.atan2(from[1] - c0[1], from[0] - c0[0]), r = Math.hypot(from[0] - c0[0], from[1] - c0[1]); return Array.from({ length: 11 }, (_, k) => { const a = a0 - (Math.PI * (k + 1)) / 12; return [c0[0] + r * Math.cos(a), c0[1] + r * Math.sin(a)] }) }
  const telomeres = (x0, share, bands) => {
    const P = ([u, v]) => g.P([x0 + u * s, v * s])
    const caps = [], marks = []
    for (const sg of [-1, 1]) {
      const cl = catmull([[-18, -40], [-9.5, -20], [-4.6, 0], [-9.5, 20], [-18, 40]].map(([u, v]) => [sg * u, v]), 32), { left, right } = sides(cl)
      const n = cl.length, k = Math.round(share * (n - 1))
      caps.push([...left.slice(0, k + 1), ...right.slice(0, k + 1).reverse(), ...halfRound(cl[0], right[0])])
      caps.push([...left.slice(n - 1 - k), ...halfRound(cl.at(-1), left.at(-1)), ...right.slice(n - 1 - k).reverse()])
      // The repeats: narrow bands across the telomere.
      for (const t of bands) for (const i of [Math.round(t * (n - 1)), Math.round((1 - t) * (n - 1))]) {
        const [a, b] = [i - 1, i + 1]
        marks.push([...left.slice(a, b + 1), ...right.slice(a, b + 1).reverse()])
      }
    }
    return caps.map((pts) => `<path d="${pathOf(pts.map(P))}" fill="url(#telomere-gradient)"/>`).join('') + marks.map((pts) => `<path d="${pathOf(pts.map(P))}" fill="${telo.small}"/>`).join('')
  }
  const centromere = (x0) => g.circle(x0, 0, 3.6, NUC.outline)
  const a = arrow(g, { x: 0, y: 0, size: 19, w: 11, colour: GREY, id: 'shortening' })
  cellType('Telomere length', [['chromosomes', NUC], ['telomeres', telo]],
    chrom.map((c) => c.defs).join('') + gradient2('telomere-gradient', [g.X(-50), g.Y(-45), g.X(50), g.Y(45)], telo.base, telo.shadow),
    `${chrom[0].body}\n<g id="long-telomeres">${telomeres(-X, 0.2, [0.075, 0.14])}</g>${centromere(-X)}\n` +
      `${chrom[1].body}\n<g id="short-telomeres">${telomeres(X, 0.055, [])}</g>${centromere(X)}\n${a.body}`)
}

// ---------------------------------------------------------------------------------------------------------------------
// APOE4: apolipoprotein E on a lipoprotein particle. The particle is a shell of phospholipids (one leaflet, heads out)
// round a core of neutral lipid; apoE's N-terminal domain, a bundle of four helices that binds the LDL receptor, stands
// on it, and its C-terminal helix, which binds the lipid, lies along the surface, joined to the bundle by its hinge. A dark
// badge names the allele, ε4.
// (SiliCoDraw's composition and blue protein. The shell is the bilayer part with its outer leaflet only, as mg05's lipid
// nanoparticle, round the yellow core of mg05; the helix bundle is drawn here (no part draws one). The badge is lettered
// "ε4" as SiliCoDraw writes it.)
{
  const g = page(5.12, [0.3, -0.5]), core = rich(CORE), apo = deep(APO), C = [-6, 8], t = 13, Rm = 28
  const ring = bilayer(g, { x: C[0], y: C[1] - Rm, size: 2 * Math.PI * Rm, thick: t, leaflet: 'outer', bend: 360, w: 4, id: 'monolayer' })
  const Ra = Rm + 0.37 * t, [cx, cy] = g.P(C)
  const annulus = disc([cx, cy], Ra * g.k, LIPID.base)
  const particle = `<g id="core">${annulus}${g.circle(C[0], C[1], Rm + 1, 'url(#core-gradient)')}${g.hl(C[0] - 12, C[1] - 12, 44, 15, -40, core.light)}</g>\n${ring.body}`
  // The C-terminal helix: a tube along the surface, over the heads, from the lower right up to the hinge.
  const Rs = Rm + 0.5 * t - 1, arcPts = Array.from({ length: 30 }, (_, i) => g.P(polar(C, Rs, 66 - (i / 29) * 80)))
  const helixT = 6.6 * g.k, wA = 5
  const cTerm = tube(arcPts, helixT, apo.base, apo.outline, wA) + Array.from({ length: 5 }, (_, i) => {
    const deg = 58 - i * 14, [p, q] = [polar(C, Rs - 2.6, deg + 2), polar(C, Rs + 2.6, deg - 2)]
    return stroke([g.P(p), g.P(q)], apo.shadow, 3.5)
  }).join('')
  // The N-terminal bundle: four helices side by side, turned -28° about its middle; every second one in shadow.
  const B = [22, -15], turn = -28, hw = 4.6
  const helices = [-13.8, -4.6, 4.6, 13.8].map((x, i) => {
    const y0 = i % 2 ? -15 : -18.5, y1 = i % 2 ? 15 : 17
    const a = [B[0] + x, B[1] + y0 + hw], b = [B[0] + x, B[1] + y1 - hw]
    const turns = [0.25, 0.5, 0.75].map((u) => { const y = a[1] + (b[1] - a[1]) * u; return stroke([g.P([B[0] + x - hw * 0.62, y + 1.6]), g.P([B[0] + x + hw * 0.62, y - 1.6])], apo.small, 3.5) }).join('')
    return tube([g.P(a), g.P(b)], 2 * hw * g.k, i % 2 ? apo.shadow : apo.base, apo.outline, wA) + turns
  }).join('')
  const bundle = `<g id="N-terminal-domain" transform="rotate(${turn} ${f(g.X(B[0]))} ${f(g.Y(B[1]))})">${helices}</g>`
  const badgeC = [-32, -31], badgeR = 12.5
  const label = lettering(g, { x: badgeC[0], y: badgeC[1], h: fitH('ε4', 2 * badgeR, 0.62, 11), text: 'ε4', colour: apo.light, id: 'allele-letters' })
  const badge = `<g id="allele">${g.circle(badgeC[0], badgeC[1], badgeR, apo.outline)}${label.body}</g>`
  cellType('APOE4', [['lipids', LIPID], ['lipid core', core], ['apoE', apo]], g.grad('core-gradient', [C[0] - Rm, C[1] - Rm, C[0] + Rm, C[1] + Rm], core) + ring.defs,
    `${particle}\n<g id="C-terminal-helix">${cTerm}</g>\n${bundle}\n${badge}`)
}

// ---------------------------------------------------------------------------------------------------------------------
// NAD⁺ salvage pathway: NAD⁺ is used up by sirtuins, PARPs and CD38, which release nicotinamide (NAM); NAMPT, the step
// that sets the pace, turns NAM into nicotinamide mononucleotide (NMN), and NMN is made into NAD⁺ again.
// (SiliCoDraw's cycle of three named discs with NAMPT on the lower arc and a burst where NAD⁺ is consumed. The names are
// lettered: NAD⁺ in light letters on a dark dot, NAM and NMN in the outline tone of pale balls. NAMPT is the enzyme part
// (amber), its pocket towards NAM; the arrows and the burst are a true grey.)
{
  const g = page(5.12, [-1.3, 2.8]), nad = deep(APO), pale = soft(APO), O = [0, 6], R = 31
  const nodes = [{ deg: -90, r: 16.5, text: 'NAD+', id: 'NAD' }, { deg: 150, r: 14.5, text: 'NAM', id: 'NAM' }, { deg: 30, r: 14.5, text: 'NMN', id: 'NMN' }]
  const gapDeg = (r) => ((r + 3.2) / R) * (180 / Math.PI)
  // Arrows run against the clock: NAD⁺ (top) to NAM (lower left), to NMN (lower right), back to NAD⁺.
  const arc = (from, to, id) => {
    const a0 = from.deg - gapDeg(from.r), a1 = to.deg + gapDeg(to.r) - (to.deg > from.deg ? 360 : 0)
    return arrow(g, { points: Array.from({ length: 16 }, (_, i) => polar(O, R, a0 + ((a1 - a0) * i) / 15)), w: 9, colour: GREY, id })
  }
  const arrows = [arc(nodes[0], nodes[1], 'consumption'), arc(nodes[1], nodes[2], 'NAMPT-step'), arc(nodes[2], nodes[0], 'NMNAT-step')]
  // The burst on the first arc: NAD⁺ is consumed (three short strokes outwards).
  const k0 = -150, burst = [-22, 0, 22].map((d) => { const a = k0 + d * 0.55; return stroke([g.P(polar(O, R + 5.5, a + d * 0.25)), g.P(polar(O, R + 12.5, a + d * 0.6))], GREY, 7) }).join('')
  const nampt = enzyme(g, { x: polar(O, R, 92)[0], y: polar(O, R, 92)[1], size: 21, turn: 200, id: 'NAMPT' })
  const nodeSvg = nodes.map((n, i) => {
    const [x, y] = polar(O, R, n.deg), h = fitH(n.text, 2 * n.r, 0.74, 9.5)
    const ball = i === 0 ? g.circle(x, y, n.r, nad.outline) : g.circle(x, y, n.r - 0.5, `url(#${n.id}-gradient)`, pale.outline, 6) + (n.r * g.k > 60 ? g.hl(x - n.r * 0.45, y - n.r * 0.5, f(n.r * g.k * 0.26), f(n.r * g.k * 0.09), -40, pale.light) : '')
    const lt = lettering(g, { x: x + (i === 0 ? -0.8 : 0), y: y + (i === 0 ? 0.6 : 0), h, text: n.text, colour: i === 0 ? nad.light : pale.outline, id: `${n.id}-letters` })
    return `<g id="${n.id}">${ball}${lt.body}</g>`
  }).join('\n')
  const grads = nodes.slice(1).map((n) => { const [x, y] = polar(O, R, n.deg); return g.grad(`${n.id}-gradient`, [x - n.r, y - n.r, x + n.r, y + n.r], pale) }).join('')
  cellType('NAD salvage pathway', [['NAD and its precursors', nad], ['NAMPT', nampt.parts[0][1]]], grads + nampt.defs,
    `<g id="arrows">${arrows.map((a) => a.body).join('')}${burst}</g>\n${nampt.body}\n${nodeSvg}`)
}

// ---------------------------------------------------------------------------------------------------------------------
// CpG island: a stretch of DNA rich in CpG sites at the promoter of a gene. The CpGs of the island are unmethylated (open
// pins), those outside it methylated (filled pins); the bent arrow marks where transcription of the gene starts.
// (SiliCoDraw's composition: the island a pale teal region with a dashed edge, kept; the DNA the part; the pins mg04's
// methyl pins; the gene an arrow-shaped block of DNA blue, as mg04's genes; the bent arrow a true grey.)
{
  const g = page(4.48, [0, -8]), island = soft(ISLAND), genePal = soft(DNA), Y = 20
  const strand = dna(g, { x: 0, y: Y, size: 98, width: 13, turns: 4, id: 'DNA' })
  const top = Y - 13 / 2 + 1
  const region = `<g id="island"><path d="${roundPoly([[-37, -47], [9, -47], [9, Y + 6], [-37, Y + 6]].map(g.P), 9 * g.k)}" fill="${island.base}" stroke="${island.outline}" stroke-width="6" stroke-dasharray="20 13" stroke-linejoin="round"/></g>`
  // The gene: an arrow-shaped block over the DNA (its direction is the direction it is read).
  const x0 = 12, x1 = 40, h = 22, tip = h * 0.5
  const gpts = [[x0, Y - h / 2], [x1 - tip, Y - h / 2], [x1, Y], [x1 - tip, Y + h / 2], [x0, Y + h / 2]].map(g.P)
  const gene = `<g id="gene"><path d="${roundPoly(gpts, 3 * g.k)}" fill="url(#gene-gradient)" stroke="${genePal.outline}" stroke-width="8" stroke-linejoin="round"/>${g.hl(x0 + 7, Y - 5.5, 26, 8, -6, genePal.light)}</g>`
  const tss = arrow(g, { points: [[x0 + 2, Y - h / 2 - 1], [x0 + 2, -9], [33, -9]], corners: true, w: 10, colour: GREY, id: 'transcription-start' })
  const r = 6.2
  const pins = [[-27, -22, false], [-18, -35, false], [-9, -22, false], [0, -35, false], [-45, -5, true], [45, -24, true]]
    .map(([x, y, m], i) => pin(g, [x, top], [x, y], r, m, `${m ? 'methylated' : 'unmethylated'}-CpG-${i + 1}`)).join('')
  cellType('CpG island', [['DNA', dnaPal], ['CpG island', island], ['methyl groups', me]], gradient2('gene-gradient', [g.X(x0), g.Y(Y - h / 2), g.X(x1), g.Y(Y + h / 2)], genePal.base, genePal.shadow),
    `${region}\n${strand.body}\n${gene}\n${tss.body}\n<g id="CpG-sites">${pins}</g>`)
}

// ---------------------------------------------------------------------------------------------------------------------
// Bisulfite conversion: bisulfite turns unmethylated cytosine into uracil (read as thymine after PCR), while a methylated
// cytosine stays a cytosine: so the sequence shows which cytosines carried a methyl group.
// (SiliCoDraw's two strands with lettered tiles, a methyl pin on the left cytosine, arrows down and a drop of bisulfite
// between them. The tiles are lettered C and U; the strand and its cytosines are DNA blue, the uracil the rose of RNA (the
// base RNA carries), the methyl group mg04's orange pin. The drop, orange in SiliCoDraw, is yellow, the colour of sulfur,
// to stand apart from the methyl group; the arrows are a true grey.)
{
  const g = page(4.57, [0, -2.8]), cyt = soft(DNA), ura = soft(RNA), drop = rich(CORE)
  const rows = [-23, 29], cols = [-20, 24], S = 27
  const strand = (y) => tube([g.P([-47, y]), g.P([47, y])], 4.2 * g.k, dnaPal.base, dnaPal.outline, 5)
  const tile = (x, y, text, pal, id) => {
    const pts = [[x - S / 2, y - S / 2], [x + S / 2, y - S / 2], [x + S / 2, y + S / 2], [x - S / 2, y + S / 2]].map(g.P)
    return `<g id="${id}"><path d="${roundPoly(pts, 6 * g.k)}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="8" stroke-linejoin="round"/>${g.hl(x - 6.5, y - 7.5, 20, 7, -30, pal.light)}` +
      lettering(g, { x, y, h: 13.5, text, colour: pal.outline, id: `${id}-letter` }).body + '</g>'
  }
  const tiles = [[cols[0], rows[0], 'C', cyt, 'methylated-cytosine'], [cols[1], rows[0], 'C', cyt, 'cytosine'], [cols[0], rows[1], 'C', cyt, 'methylated-cytosine-after'], [cols[1], rows[1], 'U', ura, 'uracil']]
  const grads = tiles.map(([x, y, , pal, id]) => g.grad(`${id}-gradient`, [x - S / 2, y - S / 2, x + S / 2, y + S / 2], pal)).join('')
  const methyls = rows.map((y, i) => pin(g, [cols[0] - S / 2 + 2.5, y - S / 2 + 2.5], [cols[0] - S / 2 - 7, y - S / 2 - 7], 5.6, true, `methyl-group-${i + 1}`)).join('')
  const arrows = cols.map((x, i) => arrow(g, { points: [[x, rows[0] + S / 2 + 3.5], [x, rows[1] - S / 2 - 2.5]], w: 9, colour: GREY, id: `conversion-${i + 1}` }).body).join('')
  // The drop of bisulfite between the arrows.
  const dc = [2, 2], dD = `M${P2(g.P([dc[0], dc[1] - 13]))} C${P2(g.P([dc[0] + 4, dc[1] - 6]))} ${P2(g.P([dc[0] + 8, dc[1] - 2]))} ${P2(g.P([dc[0] + 8, dc[1] + 3]))} C${P2(g.P([dc[0] + 8, dc[1] + 8]))} ${P2(g.P([dc[0] + 4, dc[1] + 11]))} ${P2(g.P([dc[0], dc[1] + 11]))} C${P2(g.P([dc[0] - 4, dc[1] + 11]))} ${P2(g.P([dc[0] - 8, dc[1] + 8]))} ${P2(g.P([dc[0] - 8, dc[1] + 3]))} C${P2(g.P([dc[0] - 8, dc[1] - 2]))} ${P2(g.P([dc[0] - 4, dc[1] - 6]))} ${P2(g.P([dc[0], dc[1] - 13]))}Z`
  const dropSvg = `<g id="bisulfite"><path d="${dD}" fill="url(#drop-gradient)" stroke="${drop.outline}" stroke-width="7" stroke-linejoin="round"/>${g.hl(dc[0] - 3.4, dc[1] + 1.5, 15, 5.5, -70, drop.light)}</g>`
  cellType('Bisulfite conversion', [['DNA', cyt], ['uracil', ura], ['methyl groups', me], ['bisulfite', drop]],
    grads + g.grad('drop-gradient', [dc[0] - 8, dc[1] - 13, dc[0] + 8, dc[1] + 11], drop),
    `<g id="strands">${rows.map(strand).join('')}</g>\n${methyls}\n${tiles.map((t) => tile(...t)).join('\n')}\n<g id="arrows">${arrows}</g>\n${dropSvg}`)
}

// ---------------------------------------------------------------------------------------------------------------------
// Polycomb silencing (H3K27me3): the PRC2 complex sits on a row of compacted nucleosomes, binds the trimethyl mark on one
// histone tail (H3K27me3) and writes the same mark on the tails of the neighbouring nucleosomes (the arrows): the mark
// spreads and the genes there are silenced.
// (SiliCoDraw's composition. The nucleosomes are the fibre part of ../parts/genetics.mjs seen face on, as in
// SiliCoDraw: lilac histone cores with the DNA wound over them and running on as linker DNA, each with a tail carrying
// the part's trimethyl mark, in the orange of this batch's methyl groups. PRC2 is drawn here, three lobes under one outline, in green (SiliCoDraw's purple lay 20° from the
// lilac histones); its dotted arrows are the arrow part, solid, in a true grey.)
{
  const g = page(4.5, [0, -1]), prc = soft(150)
  const chrom = fibre(g, { view: 'face', count: 3, from: [-47.5, 28.5], to: [47.5, 28.5], R: 12.5, via: [[], [[-15, 27]], [[15, 27]]], tails: [['Me3'], ['Me3'], ['Me3']], markPals: { methyl: me }, id: 'nucleosomes' })
  // PRC2: three lobes under one outline (EZH2 with SUZ12 and EED; EED below, on the mark it reads).
  const lobes = [[-12, -29, 13.5], [11.5, -32, 14.5], [0.5, -13, 11]]
  const lobeD = ([x, y, r]) => { const [cx, cy] = g.P([x, y]), R = r * g.k; return `M${f(cx - R)},${f(cy)} A${f(R)},${f(R)} 0 1 0 ${f(cx + R)},${f(cy)} A${f(R)},${f(R)} 0 1 0 ${f(cx - R)},${f(cy)} Z` }
  const prcSvg = `<g id="PRC2">${g.union(lobes.map(lobeD), 'url(#PRC2-gradient)', prc.outline, 7)}${g.circle(11.5, -32, 7, prc.light)}${g.circle(-12, -29, 6.2, prc.shadow)}</g>`
  // The arrows end at the outer marks, which lean a little to the right with the part's tails.
  const spread = [-1, 1].map((sg) => arrow(g, { points: sg < 0 ? [[-22, -19], [-31, -12], [-26.5, -1]] : [[22, -19], [34, -12], [35, -1]], w: 7, colour: GREY, id: `spreading-${sg < 0 ? 'left' : 'right'}` }).body).join('')
  cellType('Polycomb silencing', [...chrom.parts, ['PRC2', prc]], chrom.defs + g.grad('PRC2-gradient', [-26, -47, 26, -2], prc),
    `${chrom.body}\n${prcSvg}\n<g id="spreading">${spread}</g>`)
}

// ---------------------------------------------------------------------------------------------------------------------
// 5-Hydroxymethylcytosine (5hmC): cytosine as it sits in DNA (its N1 bound to the sugar of the backbone), with the
// hydroxymethyl group at C5 that TET enzymes make by oxidising 5-methylcytosine, marked by an orange capsule.
// (SiliCoDraw's skeletal formula, drawn by the skeletal part (../parts/formula.mjs): the ring the hexagon of the
// glucose part, green like every small molecule, with lines for its double bonds; the nitrogens blue balls lettered "N"
// (the amino group's hydrogens left out), the oxygen of C2 a red ball lettered "O"; the capsule, the colour of mg04's methyl groups moved from
// 57° to 60° to stand 36° from the oxygen, carries its "OH" lettered in its outline tone. The sugar is a grey pentagon on
// the backbone.)
{
  const g = page(4.67, [-4.5, -0.4]), mark = soft(60)
  const cx = -9, cy = 4, R = 19.5, V = [0, 1, 2, 3, 4, 5].map((k) => polar([cx, cy], R, -90 + 60 * k)) // C4, C5, C6, N1, C2, N3
  const ch2 = [V[1][0] + 16, V[1][1] - 9.5], ohC = [ch2[0], ch2[1] - 19], nh = [V[0][0], V[0][1] - 17], ox = polar(V[4], 16.5, 150), sug = [V[3][0], V[3][1] + 16.5]
  // The formula: the skeletal part, built in bond lengths (y up) with the ring's middle at 0,0, then placed so that a
  // bond is R long and the ring's middle lies at cx, cy, as before.
  const m = formula(), A = [90, 30, -30, -90, -150, 150].map((a, k) => m.at(go([0, 0], a, 1), k === 3 || k === 5 ? 'N' : undefined))
  const pt = (k) => m.data.atoms[k]
  m.ring(A, 'aromatic', [1, 5])
  m.bond(A[0], m.at(go(pt(A[0]), 90), 'N')) // the amino group on C4
  m.bond(A[4], m.at(go(pt(A[4]), -150, 16.5 / R), 'O'), 2) // C2=O
  const c5 = pt(A[1]), cH2 = go(c5, 30, 18.6 / R)
  m.bond(A[1], m.at(cH2)); m.bond(m.at(cH2), m.at(go(cH2, 90, 12.5 / R))) // CH2, and its bond into the capsule's OH
  m.bond(A[3], m.at(go(pt(A[3]), -90, 9.5 / R))) // to the sugar
  const BALL = 0.77, reach = m.data.atoms.map(([u, v, el]) => [u, v, el ? BALL / 2 + 0.1 : 0.1])
  const box = [Math.min(...reach.map(([u, , r]) => u - r)), Math.max(...reach.map(([u, , r]) => u + r)), Math.min(...reach.map(([, v, r]) => v - r)), Math.max(...reach.map(([, v, r]) => v + r))]
  const cu = (box[0] + box[1]) / 2, cv = (box[2] + box[3]) / 2
  const mol = skeletal(g, { x: cx + cu * R, y: cy - cv * R, size: R * Math.max(box[1] - box[0], box[3] - box[2]), id: 'cytosine', ball: BALL, ...m.data })
  // The capsule round CH₂OH: a thick rounded band from the CH₂ corner up past the OH.
  const capA = [ch2[0], ch2[1] + 2.5], capB = [ohC[0], ohC[1] - 1.5], capT = 25 * g.k
  const capsule = `<g id="hydroxymethyl">${stroke([capA, capB].map(g.P), mark.outline, capT + 14)}${stroke([capA, capB].map(g.P), 'url(#hydroxymethyl-gradient)', capT)}${g.hl(capB[0] - 6, capB[1] + 4, 18, 6, -80, mark.light)}</g>`
  const oh = lettering(g, { x: ohC[0], y: ohC[1], h: fitH('OH', 25, 0.74, 9.5), text: 'OH', colour: mark.outline, id: 'OH-letters' })
  // The sugar (deoxyribose) and the backbone it is part of.
  const sp = [0, 1, 2, 3, 4].map((k) => g.P(polar([sug[0], sug[1] + 1.5], 8, -90 + 72 * k)))
  const sugar = `<g id="deoxyribose">${stroke([[sug[0] - 22, sug[1] + 4], [sug[0] + 22, sug[1] + 4]].map(g.P), greyPal.outline, 8)}<path d="${roundPoly(sp, 1.6 * g.k)}" fill="${greyPal.base}" stroke="${greyPal.outline}" stroke-width="7" stroke-linejoin="round"/></g>`
  cellType('5-Hydroxymethylcytosine', [...mol.parts, ['hydroxymethyl group', mark]],
    mol.defs + g.grad('hydroxymethyl-gradient', [capB[0] - 12.5, capB[1] - 12.5, capA[0] + 12.5, capA[1] + 12.5], mark),
    `${capsule}\n${sugar}\n${mol.body}\n${oh.body}`)
}

check()
console.log('written to', OUT)
