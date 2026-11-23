// Eight icons of SiliCoDraw's "Molecules & genetics" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David
// Carlsson; see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts in
// ../parts/: Circos plot, genetic drift, population bottleneck, natural selection, oncogene, tumour suppressor, biomarker
// and Cre-lox. Their compositions are read by hand from the source in a 100 × 100 box centred on 0,0 and scaled onto a
// 512 page (`page` of ../cellkit.mjs).
// Parts used: DNA and protein (molecules.mjs), cell, arrows, cross and lightning (tissue.mjs).
// Drawn here because no part draws them: the ring and ribbons of a Circos plot, the lines and axes of a plot of allele
// frequency, an hourglass with balls for individuals, oval individuals, a magnifying glass and the loxP site as a small
// triangle. A gene is the arrow-shaped block of ../parts/genetics.mjs (`geneBlock`). The population icons are kept simple, bold and wordless.
// Nothing is lettered: SiliCoDraw's "p", "generations", "ONC", "TSG", "activity", "loss of function", "gene" and "Cre"
// are left out or said by a shape (an arrow down between generations, an arrow up or down beside a gene); "Cre" would need
// a lowercase r, which letters.mjs does not have.
// Usage: node mg13.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex, toLch } from '../colour.mjs'
import { f, gradient2 } from '../shapes.mjs'
import { dna, protein } from '../parts/molecules.mjs'
import { BOLT, CELL, arrow, cell, cross, lightning } from '../parts/tissue.mjs'
import { geneBlock } from '../parts/genetics.mjs'

const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const { cellType, check } = cellTypes(OUT)

// Hues (OKLCH degrees), from SiliCoDraw's colours with `hueOf` unless said otherwise. DNA is the part's blue (267°).
// SiliCoDraw's red (25°) and orange (57°) are 32° apart, and its mustard (80°) 23° from the orange: where they meet in one
// icon the red is moved to 15° and the mustard to the yellow of the set (96°).
const BLUE = hueOf('#4f6bb8'), GREEN = hueOf('#5fae8b'), ORANGE = hueOf('#e3955a'), PURPLE = hueOf('#b07cc6')
const RED = hueOf('#d64545'), RED_MOVED = 15, YELLOW = hueOf('#fde68a'), LEAF = hueOf('#9bc47c'), PINK = hueOf('#f6d0dc')
// Greys (chroma below 0.012: they never join a part's hue). Axes, arrows, glass and marks that are the colour of nothing are
// a true grey: the arrow part's own INK is a bluish slate within 36° of DNA blue.
const grey = (l, c = 0.004) => toHex({ l, c, h: 255 })
const GREY = { light: grey(0.99, 0.002), base: grey(0.95), shadow: grey(0.86, 0.006), small: grey(0.74, 0.006), outline: grey(0.5, 0.008) }
const AXIS = toHex({ l: 0.6, c: 0, h: 0 }), DARK = toHex({ l: 0.42, c: 0, h: 0 })

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const P2 = ([x, y]) => `${f(x)},${f(y)}`
const lineD = (pts) => `M${pts.map(P2).join(' L')}`
const stroke = (d, colour, w, cap = 'round') => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
const disc = ([x, y], r, fill, s = '', w = 0) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}"${s ? ` stroke="${s}" stroke-width="${f(w)}"` : ''}/>`
const hl = ([x, y], rx, ry, rot, fill) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" transform="rotate(${rot} ${f(x)} ${f(y)})" fill="${fill}"/>`
/** Joins the { defs, body } of several parts. */
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n') })
/** A gradient over each shape's own box (base at its top left, shadow at its bottom right), for many balls of one colour. */
const boxGrad = (id, pal) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`
/** The parts of an icon for `check()`: greys left out (they never join a hue). */
const icon = (name, parts, { defs, body }) => cellType(name, parts.filter(([, p]) => toLch(p.base).c >= 0.012), defs, body)
/** A polygon of page points with its corners rounded by r (px) (as mg04). */
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

/** A ball (an individual of a population): a circle or an oval of g units with a gradient over its own box, an outline and a glint. */
const ball = (g, [x, y], rx, ry, gradId, pal, w) => {
  const [cx, cy] = g.P([x, y]), RX = rx * g.k, RY = ry * g.k
  return `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(RX - w / 2)}" ry="${f(RY - w / 2)}" fill="url(#${gradId})" stroke="${pal.outline}" stroke-width="${f(w)}"/>` +
    hl([cx - RX * 0.4, cy - RY * 0.42], RX * 0.26, RY * 0.12, -25, pal.light)
}

// ---------------------------------------------------------------------------------------------------------------------
// Circos plot: the genome as a ring of chromosomes (six coloured arcs), with ribbons across the middle joining regions that
// interact or are rearranged.
// (SiliCoDraw draws six thin arcs and three see-through lens shapes that only roughly meet the ring. Here the arcs are
// thicker and each ribbon starts and ends on a stretch of the ring, as Circos draws them: two arcs on the inner edge
// joined by curves through the middle. A ribbon takes the colour of the arc it leaves, in pale solid tones. SiliCoDraw's
// red is moved to 15° and its mustard to the yellow of the set, so the six stay 36° apart.)
{
  const g = page(4.87, [0, 0]), c = [256, 256], k = g.k
  const arcs = [[BLUE, 0, 55, deep], [GREEN, 60, 115, deep], [ORANGE, 120, 175, deep], [PURPLE, 180, 235, deep], [RED_MOVED, 240, 295, deep], [YELLOW, 300, 355, rich]]
    .map(([h, s, e, kind], i) => ({ id: ['chromosome-1', 'chromosome-2', 'chromosome-3', 'chromosome-4', 'chromosome-5', 'chromosome-6'][i], s, e, pal: kind(h) }))
  const at = (a, r) => [c[0] + r * k * Math.cos((a * Math.PI) / 180), c[1] + r * k * Math.sin((a * Math.PI) / 180)]
  const r1 = 34, r2 = 46.5, W = 6, rib = r1 - 0.4
  // A ribbon from the stretch [a0, a1] of the ring to [b0, b1] (degrees), through the middle (d3's chord).
  const ribbon = ([a0, a1], [b0, b1], pal, id) => {
    const R = rib * k, mid = (p) => [c[0] + (p[0] - c[0]) * 0.12, c[1] + (p[1] - c[1]) * 0.12]
    const A0 = at(a0, rib), A1 = at(a1, rib), B0 = at(b0, rib), B1 = at(b1, rib)
    const d = `M${P2(A0)} A${f(R)},${f(R)} 0 0 1 ${P2(A1)} Q${P2(mid([(A1[0] + B0[0]) / 2, (A1[1] + B0[1]) / 2]))} ${P2(B0)} A${f(R)},${f(R)} 0 0 1 ${P2(B1)} Q${P2(mid([(B1[0] + A0[0]) / 2, (B1[1] + A0[1]) / 2]))} ${P2(A0)} Z`
    return `<path id="${id}" d="${d}" fill="${pal.shadow}" stroke="${pal.outline}" stroke-width="5" stroke-linejoin="round"/>`
  }
  const ribbons = `<g id="links">` + ribbon([200, 222], [12, 40], arcs[0].pal, 'link-1') + ribbon([252, 278], [318, 342], arcs[4].pal, 'link-2') + ribbon([132, 160], [72, 100], arcs[1].pal, 'link-3') + '</g>'
  let defs = ''
  const ring = arcs.map(({ id, s, e, pal }) => {
    const o0 = at(s, r2), o1 = at(e, r2), i0 = at(s, r1), i1 = at(e, r1), mid = at((s + e) / 2, (r1 + r2) / 2)
    defs += gradient2(`${id}-gradient`, [mid[0] - 30, mid[1] - 30, mid[0] + 30, mid[1] + 30], pal.base, pal.shadow)
    const d = `M${P2(o0)} A${f(r2 * k)},${f(r2 * k)} 0 0 1 ${P2(o1)} L${P2(i1)} A${f(r1 * k)},${f(r1 * k)} 0 0 0 ${P2(i0)} Z`
    return `<path id="${id}" d="${d}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="${W}" stroke-linejoin="round"/>`
  }).join('')
  icon('Circos plot', arcs.map(({ id, pal }) => [id, pal]), { defs, body: ribbons + '\n' + `<g id="ideogram">${ring}</g>` })
}

// Genetic drift: the frequency of an allele in two small populations that start alike and wander by chance, until it is
// fixed in one (it reaches the top) and lost in the other (it reaches the bottom).
// (SiliCoDraw draws two thin smooth waves on hairline axes with an italic "p" beside the upright one. Here the lines are
// bold and jagged (a random walk, one step a generation), start at the middle (a frequency of one half) and stop where the
// allele is fixed (the top) or lost (on the axis), each with a dot; the "p" is left out.)
{
  const g = page(4.82, [0, 0]), up = deep(BLUE), down = deep(ORANGE), W = 13
  const fixed = [[-38, 0], [-34.3, -4], [-30.6, 1], [-26.9, 4], [-23.2, 0], [-19.5, 6], [-15.8, 3], [-12.1, -2], [-8.4, 2], [-4.7, -5], [-1, -9], [2.7, -6], [6.4, -13], [10.1, -10], [13.8, -17], [17.5, -22], [21.2, -19], [24.9, -27], [28.6, -31], [32.3, -28], [36, -36], [39.7, -42]]
  const lost = [[-38, 0], [-34.3, 3], [-30.6, -2], [-26.9, -6], [-23.2, -3], [-19.5, -9], [-15.8, -5], [-12.1, -11], [-8.4, -7], [-4.7, -2], [-1, -6], [2.7, 1], [6.4, 5], [10.1, 2], [13.8, 9], [17.5, 15], [21.2, 12], [24.9, 20], [28.6, 27], [32.3, 34], [36, 42]]
  const course = (pts) => lineD(pts.map(g.P))
  const axes = `<g id="axes">${g.line([[-44, -47], [-44, 42], [44, 42]], AXIS, 8)}</g>`
  const line = (id, pts, pal) => `<g id="${id}">${stroke(course(pts), pal.small, W)}${disc(g.P(pts.at(-1)), 5.2 * g.k, pal.small, pal.outline, 5)}</g>`
  icon('Genetic drift', [['allele fixed', up], ['allele lost', down]], { defs: '', body: axes + '\n' + line('lost', lost, down) + '\n' + line('fixed', fixed, up) })
}

// Population bottleneck: a varied population (balls of six colours: six alleles) passes through a narrow neck; the few
// that get through leave a population of one colour.
// (SiliCoDraw draws two pale trapezoids meeting at a point, seven coloured dots on the left, one in the neck and five blue
// ones on the right. Here the two chambers are one hourglass lying on its side, and the dots are larger balls. SiliCoDraw's
// red is moved to 15° and its lemon to the yellow of the set (96°), so the six stay 36° apart.)
{
  const g = page(4.7, [0, 0]), R = 6.2, w = 4.5
  const pals = { blue: deep(BLUE), orange: deep(ORANGE), purple: deep(PURPLE), green: deep(GREEN), red: deep(RED_MOVED), yellow: rich(YELLOW) }
  const glass = [[-48, -32], [-15, -32], [-3.5, -8.5], [3.5, -8.5], [15, -32], [48, -32], [48, 32], [15, 32], [3.5, 8.5], [-3.5, 8.5], [-15, 32], [-48, 32]]
  const vessel = `<g id="bottleneck"><path d="${roundPoly(glass.map(g.P), 3 * g.k)}" fill="url(#bottleneck-gradient)" stroke="${GREY.outline}" stroke-width="8" stroke-linejoin="round"/>${hl(g.P([-38, -22]), 26, 7, -12, GREY.light)}</g>`
  const before = [[-38, -19, 'blue'], [-24, -21, 'orange'], [-33, -4, 'purple'], [-19, -5, 'green'], [-38, 17, 'red'], [-25, 20, 'yellow'], [-13, 13, 'blue']]
  const after = [[0, 0], [21, -18], [37, -20], [29, -3], [22, 14], [38, 16]].map(([x, y]) => [x, y, 'blue'])
  const all = [...before, ...after]
  const balls = Object.keys(pals).map((k) => `<g id="${k}">${all.filter((b) => b[2] === k).map(([x, y]) => ball(g, [x, y], x === 0 ? R - 0.6 : R, x === 0 ? R - 0.6 : R, `${k}-gradient`, pals[k], w)).join('')}</g>`).join('')
  const [x0, y0] = g.P([-48, -32]), [x1, y1] = g.P([48, 32])
  icon('Population bottleneck', [['glass', GREY], ...Object.entries(pals)], {
    defs: gradient2('bottleneck-gradient', [x0, y0, x1, y1], GREY.base, GREY.shadow) + Object.entries(pals).map(([k, p]) => boxGrad(`${k}-gradient`, p)).join(''),
    body: vessel + '\n' + balls,
  })
}

// Natural selection: in one generation the individuals that fit the place best (green) outnumber one that fits it badly
// (red), which does not survive (crossed out); the next generation (below) is all green.
// (SiliCoDraw draws beetles as ovals with an eye, a red chevron under the red one, a dashed line between the generations
// and the words "generations ↓". Here the individuals are ovals without eyes (no faces in the set), the red one is crossed
// out with the cross part in grey, and an arrow down from one generation to the next stands for the words and the dashed line.)
{
  const g = page(4.64, [0, 1.9]), fit = soft(LEAF), unfit = soft(RED), w = 6, rx = 11, ry = 8
  const top = [[-38.5, -22, 'fit'], [-13, -22, 'fit'], [13, -22, 'unfit'], [38.5, -22, 'fit']], below = [[-25.5, 26, 'fit'], [0, 26, 'fit'], [25.5, 26, 'fit']]
  const pals = { fit, unfit }
  const people = Object.keys(pals).map((k) => `<g id="${k === 'fit' ? 'fitter' : 'less-fit'}">${[...top, ...below].filter((b) => b[2] === k).map(([x, y]) => ball(g, [x, y], rx, ry, `${k}-gradient`, pals[k], w)).join('')}</g>`).join('')
  const out = cross(g, { x: 13, y: -22, size: 17, colour: DARK, w: 10, id: 'removed' })
  const next = arrow(g, { x: 0, y: 2, size: 22, turn: 90, colour: GREY.outline, w: 9, id: 'next-generation' })
  icon('Natural selection', [['fitter', fit], ['less fit', unfit]], { defs: boxGrad('fit-gradient', fit) + boxGrad('unfit-gradient', unfit), body: people + '\n' + out.body + '\n' + next.body })
}

// Oncogene: a gene (red) in the DNA, struck by a mutation (the bolt) that raises its activity (the arrow up).
// (SiliCoDraw draws a red gene block on a blue line with "ONC" in it, a yellow bolt above and "↑ activity" below. Here the
// line is the DNA part, the gene the gene part (an arrow-shaped block), the bolt the lightning part; "↑ activity" becomes an arrow up
// beside the bolt, in a deeper tone of the gene's red; "ONC" is left out.)
{
  const g = page(4.62, [0, -4]), pal = soft(RED)
  const strand = dna(g, { x: 0, y: 16, size: 98, width: 14, turns: 4, id: 'DNA' })
  const gn = geneBlock(g, { x: 1, y: 16, size: 60, height: 34, pal, w: 9, id: 'oncogene' })
  const bolt = lightning(g, { x: -12, y: -24, size: 34, turn: 12, id: 'mutation' })
  const more = arrow(g, { x: 18, y: -24, size: 30, turn: -90, colour: deep(RED).outline, w: 10, id: 'more-activity' })
  icon('Oncogene', [['DNA', deep(BLUE)], ['oncogene', pal], ['mutation', BOLT]], join(strand, gn, bolt, more))
}

// Tumour suppressor: a gene (green) in the DNA that is lost or switched off (the red cross), so its activity falls (the
// arrow down).
// (SiliCoDraw draws a green gene block on a blue line with "TSG" in it, a red cross above and "↓ loss of function" below.
// Here as in Oncogene: the DNA part, the gene block, the cross part in red and an arrow down in the same red for the words;
// "TSG" is left out.)
{
  const g = page(4.62, [0, -4]), pal = soft(GREEN), red = deep(RED)
  const strand = dna(g, { x: 0, y: 16, size: 98, width: 14, turns: 4, id: 'DNA' })
  const gn = geneBlock(g, { x: 1, y: 16, size: 60, height: 34, pal, w: 9, id: 'tumour-suppressor' })
  const off = cross(g, { x: -12, y: -24, size: 24, colour: red.outline, w: 13, id: 'inactivated' })
  const less = arrow(g, { x: 18, y: -24, size: 30, turn: 90, colour: red.outline, w: 10, id: 'less-activity' })
  icon('Tumour suppressor', [['DNA', deep(BLUE)], ['tumour suppressor', pal], ['loss', red]], join(strand, gn, off, less))
}

// Biomarker: a marker (a protein, amber) found in a cell, seen through a magnifying glass.
// (SiliCoDraw draws a pale blue blob with a darker spot, three faint orange dots and an orange magnifying glass with an
// orange dot in it. Here the blob and its spot are the cell part with its nucleus, the dots are the protein part (a marker is
// most often a protein), and the glass, drawn here, is grey (an instrument, the colour of nothing), with one marker large
// inside it.)
{
  const g = page(5.04, [4.6, -3.9]), lens = [24, -20], R = 15.5
  const body = cell(g, { x: -8, y: 2, size: 66, id: 'cell' })
  const markers = [[-31, 2, 11, 20], [9, 13, 11, -30], [-17, 21, 10, 70]].map(([x, y, s, t], i) => protein(g, { x, y, size: s, turn: t, id: `marker-${i + 1}` }))
  const big = protein(g, { x: lens[0], y: lens[1], size: 17, turn: 15, id: 'marker-seen' })
  const [lx, ly] = g.P(lens), RR = R * g.k, ring = 4.2 * g.k, ow = 5
  const u = [Math.SQRT1_2, Math.SQRT1_2], h0 = [lx + u[0] * (RR + ring / 2), ly + u[1] * (RR + ring / 2)], h1 = g.P([46, 2])
  const glassDefs = gradient2('glass-gradient', [lx - RR, ly - RR, lx + RR, ly + RR], GREY.light, GREY.base)
  const handle = `<g id="handle">${stroke(lineD([h0, h1]), GREY.outline, 6.2 * g.k + 2 * ow)}${stroke(lineD([h0, h1]), DARK, 6.2 * g.k)}</g>`
  const glass = `<g id="glass">${disc([lx, ly], RR, 'url(#glass-gradient)')}</g>`
  const rim = `<g id="rim">${disc([lx, ly], RR, 'none', GREY.outline, ring + 2 * ow)}${disc([lx, ly], RR, 'none', GREY.small, ring)}${hl([lx - RR * 0.5, ly - RR * 0.55], RR * 0.22, RR * 0.07, -45, '#FFFFFF')}</g>`
  const all = join(body, ...markers, { defs: glassDefs, body: handle + glass }, big, { defs: '', body: rim })
  icon('Biomarker', [['cell', CELL], ['marker', rich(75)]], all)
}

// Cre-lox: a gene flanked by two loxP sites (a floxed gene, above); Cre recombinase cuts it out, leaving one loxP site in the
// DNA (below).
// (SiliCoDraw draws two blue lines, orange triangles for loxP, a green box written "gene", a pink blob written "Cre" and a
// small arrow down. Here the lines are the DNA part, the gene the gene part (an arrow-shaped block) in green, the loxP sites orange
// triangles pointing the same way (drawn here), Cre the protein part in SiliCoDraw's pink (the part's amber would lie 18°
// from the loxP orange), and the arrow the arrow part in grey. "gene" and "Cre" are left out.)
{
  const g = page(4.7, [0, 2.5]), genePal = soft(GREEN), lox = deep(ORANGE), cre = soft(PINK)
  const loxP = (id, x, y) => {
    const s = 9.5, pts = [[x - s * 0.62, y - s], [x + s * 0.78, y], [x - s * 0.62, y + s]].map(g.P), [a, b] = [g.P([x - s, y - s]), g.P([x + s, y + s])]
    return { defs: gradient2(`${id}-gradient`, [a[0], a[1], b[0], b[1]], lox.base, lox.shadow), body: `<g id="${id}"><path d="${roundPoly(pts, 2.2 * g.k)}" fill="url(#${id}-gradient)" stroke="${lox.outline}" stroke-width="6" stroke-linejoin="round"/></g>` }
  }
  const yTop = -26, yLow = 34
  const top = dna(g, { x: 0, y: yTop, size: 98, width: 13, turns: 4, id: 'DNA-floxed' })
  const gn = geneBlock(g, { x: 1, y: yTop, size: 34, height: 24, pal: genePal, w: 8, id: 'gene' })
  const recombinase = protein(g, { x: -14, y: 4, size: 30, turn: -10, id: 'Cre', pal: cre })
  const go = arrow(g, { x: 14, y: 4, size: 26, turn: 90, colour: GREY.outline, w: 9, id: 'excision' })
  const low = dna(g, { x: 0, y: yLow, size: 98, width: 13, turns: 4, id: 'DNA-excised' })
  icon('Cre-lox', [['DNA', deep(BLUE)], ['gene', genePal], ['loxP', lox], ['Cre', cre]],
    join(top, gn, loxP('loxP-1', -28, yTop), loxP('loxP-2', 30, yTop), recombinase, go, low, loxP('loxP-left', 1, yLow)))
}

check()
console.log('written to', OUT)
