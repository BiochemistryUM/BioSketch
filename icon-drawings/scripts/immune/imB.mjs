// Eight icons of SiliCoDraw's "Immunology & infection" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David
// Carlsson; see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts
// of the category in ../parts/immune.mjs: bacteria and what tells them apart. Mycobacteria in a cord, a Gram stain, an
// endospore, a capsule, a plasmid map, quorum sensing, a type III secretion system and Akkermansia muciniphila in mucus.
// Drawn here, as no part draws them: the gene arrows, origin and cloning-site marks of the plasmid map (as mg03.mjs's
// Plasmid), the needle complex of the secretion system, and mucin chains with their sugar branches in a mucus layer.
// Lettered (strokes, letters.mjs): G+ and G- over the halves of the Gram stain, pUC19 inside the plasmid map, the only
// words SiliCoDraw writes on them (its "2.7 kb" is left out).
// The current look: outlines at 60 % (setStrokeScale), the gloss on (setGloss): bacteria are glossed by their part;
// the microscope field, the membranes in section, the needle complex and the mucins are flat.
// Usage: node imB.mjs <folder>
import { NUC, cellTypes, page, setGloss } from '../cellkit.mjs'
import { deep, hueOf, soft, toLch } from '../colour.mjs'
import { f, pathOf, setStrokeScale } from '../shapes.mjs'
import { GRAM, microbe } from '../parts/immune.mjs'
import { imageField } from '../parts/assays.mjs'
import { INK } from '../parts/lab.mjs'
import { circularDna, glucose, protein } from '../parts/molecules.mjs'
import { LIPID, bilayer } from '../parts/membranes.mjs'
import { BACTERIUM } from '../parts/tissue.mjs'
import { lettering, textWidth } from '../parts/letters.mjs'
import { mkdirSync } from 'node:fs'

const OUT = process.argv[2]
setStrokeScale(0.6)
setGloss(true)
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT)
// Greys (the microscope field, ink) are left out of the hue check, as the conventions of lab.mjs say; a palette used
// twice is one part that recolours as one, so it is listed once.
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base) === i), defs, body)
const icon = (name, ...ps) => cellType(name, ps.flatMap((p) => p.parts ?? []), ps.map((p) => p.defs ?? '').join(''), ps.map((p) => p.body).join('\n'))
const grad = (id, [x0, y0, x1, y1], a, b) => `<linearGradient id="${id}" x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`
const rad = (d) => (d * Math.PI) / 180

const g = page(4.6, [0, 0]) // 100 units across are 460 px: margins about 26

// ---------- Mycobacterium: slender, waxy, beaded rods lying side by side in a serpentine cord, a few on their own ----------
{
  // SiliCoDraw's cord: three strands along an S curve, each of three rods end to end.
  const Pt = (t) => [-38 + 76 * t, 24 - 48 * t + 7 * Math.sin(2 * Math.PI * t)]
  const Nt = (t) => { const dx = 76, dy = -48 + 14 * Math.PI * Math.cos(2 * Math.PI * t), l = Math.hypot(dx, dy); return [-dy / l, dx / l] }
  const rods = []
  ;[[-8, [[0.02, 0.3], [0.35, 0.63], [0.68, 0.97]]], [0, [[0.1, 0.39], [0.44, 0.73], [0.78, 1.02]]], [8, [[-0.02, 0.24], [0.29, 0.57], [0.62, 0.92]]]].forEach(([k, segs]) => segs.forEach(([t0, t1]) => {
    const a = Pt(t0), b = Pt(t1), [nx, ny] = Nt((t0 + t1) / 2)
    rods.push([(a[0] + b[0]) / 2 + nx * k, (a[1] + b[1]) / 2 + ny * k, Math.hypot(b[0] - a[0], b[1] - a[1]) + 3, (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI])
  }))
  rods.push([-27, -31, 27, 18], [31, 33, 25, -28], [27, -35, 23, 8])
  const ps = rods.map(([x, y, L, t], i) => microbe(g, { x: x * 1.12, y: y * 1.12, size: L * 1.12, turn: t, aspect: 0.27, capsule: 'waxy', beads: true, flagellum: false, id: `mycobacterium-${i + 1}` }))
  icon('Mycobacterium', ...ps)
}

// ---------- Gram stain: a field under the microscope, Gram-positive bacteria violet (left), Gram-negative pink (right) ----------
{
  const field = imageField(g, { x: 0, y: 0, size: 96, mode: 'bright', content: 'none', id: 'field' })
  const pos = [[-29, -10], [-19.5, -10], [-24.2, -1.8], [-33.8, -1.8], [-14.8, -1.8], [-29, 6.4]].map(([x, y], i) => microbe(g, { x, y, size: 10, shape: 'coccus', stain: 'positive', id: `coccus-${i + 1}` }))
  const rodsP = [[-24, 20, -10], [-17, 33, 8]].map(([x, y, t], i) => microbe(g, { x, y, size: 23, turn: t, stain: 'positive', flagellum: false, id: `rod-positive-${i + 1}` }))
  const rodsN = [[19, -13, 25], [31, 6, -35], [12, 21, 10], [25, 33, -15]].map(([x, y, t], i) => microbe(g, { x, y, size: 23, turn: t, stain: 'negative', flagellum: false, id: `rod-negative-${i + 1}` }))
  const divider = `<g id="field-divider"><path d="M${f(g.X(0))},${f(g.Y(-46))} L${f(g.X(0))},${f(g.Y(46))}" fill="none" stroke="${INK}" stroke-width="4" stroke-dasharray="10 9" stroke-linecap="butt"/></g>`
  const h = 9
  const l1 = lettering(g, { x: -22, y: -28, h, text: 'G+', colour: GRAM.positive.outline, id: 'gram-positive-letters' })
  const l2 = lettering(g, { x: 22, y: -28, h, text: 'G-', colour: GRAM.negative.outline, id: 'gram-negative-letters' })
  icon('Gram stain', field, { body: divider }, ...pos, ...rodsP, ...rodsN, { body: `<g id="letters">${l1.body}${l2.body}</g>` })
}

// ---------- Endospore: a rod with a spore forming near one end, its chromosome in the rest of the cell ----------
icon('Endospore', microbe(g, { x: 0, y: 0, size: 100, turn: -10, aspect: 0.38, spore: true, nucleoid: true, flagellum: false, id: 'bacterium' }))

// ---------- Capsule: a rod inside its thick polysaccharide capsule ----------
icon('Capsule', microbe(g, { x: 0, y: 0, size: 100, turn: -10, capsule: true, nucleoid: true, id: 'bacterium' }))

// ---------- Plasmid map: a ring of DNA with two genes as arrows, the origin of replication and the cloning site ----------
// (SiliCoDraw: a thin ring with the features on it. Here the ring is the circular DNA part and the features lie on a band
// just outside it, as in mg03's Plasmid: an antibiotic resistance gene turning anticlockwise, lacZα clockwise, the origin
// a block, three ticks for the multiple cloning site at the top.)
{
  const GENE1 = soft(hueOf('#e3955a')), GENE2 = soft(150), ORI = deep(0)
  const ring = circularDna(g, { x: 0, y: 0, size: 64, id: 'DNA', twists: 9 })
  const Rr = 40.5, band = 8
  const at = (a, r) => g.P([r * Math.sin(rad(a)), -r * Math.cos(rad(a))]) // a: degrees clockwise from the top
  const arc = (r, from, to) => Array.from({ length: 33 }, (_, i) => at(from + ((to - from) * i) / 32, r))
  const geneArrow = (id, a0, a1, pal) => {
    const dir = Math.sign(a1 - a0), neck = a1 - 13 * dir
    const pts = [...arc(Rr + band / 2, a0, neck), at(neck, Rr + band / 2 + 4.5), at(a1, Rr), at(neck, Rr - band / 2 - 4.5), ...arc(Rr - band / 2, neck, a0)]
    return `<g id="${id}"><path d="${pathOf(pts)}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="7" stroke-linejoin="round"/></g>`
  }
  const block = (id, a0, a1, pal) => `<g id="${id}"><path d="${pathOf([...arc(Rr + band / 2, a0, a1), ...arc(Rr - band / 2, a1, a0)])}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="7" stroke-linejoin="round"/></g>`
  const mcs = [-8, 0, 8].map((a) => { const [p, q] = [at(a, 27), at(a, Rr + band / 2 + 3)]; return `M${f(p[0])},${f(p[1])} L${f(q[0])},${f(q[1])}` }).join(' ')
  const tw = textWidth('pUC19'), h = Math.min(9, 30 / tw)
  const word = lettering(g, { x: 0, y: 0, h, text: 'pUC19', colour: INK, id: 'plasmid-name' })
  const B = [g.X(-46), g.Y(-46), g.X(46), g.Y(46)]
  const features = {
    defs: grad('gene-1-gradient', B, GENE1.base, GENE1.shadow) + grad('gene-2-gradient', B, GENE2.base, GENE2.shadow) + grad('origin-gradient', B, ORI.base, ORI.shadow),
    body: geneArrow('gene-1', 212, 112, GENE1) + geneArrow('gene-2', 282, 330, GENE2) + block('origin', 40, 78, ORI) +
      `<g id="cloning-site"><path d="${mcs}" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/></g><g id="letters">${word.body}</g>`,
    parts: [['resistance gene', GENE1], ['lacZ', GENE2], ['origin', ORI]],
  }
  icon('Plasmid map', ring, features)
}

// ---------- Quorum sensing: bacteria crowded together, the autoinducer they release all round them ----------
// (The autoinducer is the sugar-ring part, as SiliCoDraw draws it a hexagon; orange as SiliCoDraw's, since the green of
// small molecules lies 28° from the bacteria.)
{
  const AI = deep(hueOf('#e3955a'))
  const bugs = [[-24, -16, -20, 27], [6, -26, 10, 27], [28, -8, 60, 27], [-28, 14, 25, 27], [0, 24, -10, 27], [34, 24, 40, 27], [0, -1, 0, 25]]
    .map(([x, y, t, L], i) => microbe(g, { x, y, size: L, turn: t, flagellum: false, id: `bacterium-${i + 1}` }))
  const ais = [[-42, -1], [-6, -40], [24, -40], [44, -24], [-44, 32], [-14, 38], [16, 40], [44, 6], [-38, -33], [-11, 10], [16, 8], [-19, -2]]
    .map(([x, y], i) => glucose(g, { x, y, size: 7, turn: i * 17, pal: AI, id: `autoinducer-${i + 1}` }))
  icon('Quorum sensing', ...bugs, ...ais)
}

// ---------- Secretion system: a type III needle complex across both membranes of a Gram-negative bacterium (top),
// its needle through the membrane of a host cell (bottom), effector proteins going in ----------
{
  const NEEDLE = soft(hueOf('#4f6bb8')), EFF = deep(350), BUG = BACTERIUM, HOST = LIPID
  const L = 94, th = 8
  const im = bilayer(g, { x: 0, y: -22, size: L, thick: th, turn: 180, bend: 34, gaps: [[-9, 9]], pal: BUG, id: 'inner-membrane' })
  const om = bilayer(g, { x: 0, y: -5, size: L, thick: th, turn: 180, bend: 34, gaps: [[-5.5, 5.5]], pal: BUG, id: 'outer-membrane' })
  const hm = bilayer(g, { x: 0, y: 27, size: L, thick: th, bend: 30, gaps: [[-6, 6]], pal: HOST, id: 'host-membrane' })
  const line = (m) => Array.from({ length: 25 }, (_, i) => { const p = m.along(-L / 2 + (L * i) / 24); return g.P([+p.x, +p.y]) })
  const lIm = line(im), lOm = line(om), lHm = line(hm)
  const byX = (pts) => [...pts].sort((a, b) => a[0] - b[0])
  const top = [[g.X(-47), g.Y(-46)], [g.X(47), g.Y(-46)], ...byX(lIm).reverse()]
  const peri = [...byX(lIm), ...byX(lOm).reverse()]
  const bottom = [...byX(lHm), [g.X(47), g.Y(46)], [g.X(-47), g.Y(46)]]
  const D = (pts) => `M${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' L')} Z`
  const grounds = {
    defs: grad('cytoplasm-gradient', [0, g.Y(-46), 0, g.Y(-20)], BUG.light, BUG.base) + grad('host-gradient', [0, g.Y(24), 0, g.Y(46)], HOST.light, HOST.base),
    body: `<g id="bacterium-cytoplasm"><path d="${D(top)}" fill="url(#cytoplasm-gradient)"/></g><g id="periplasm"><path d="${D(peri)}" fill="${BUG.light}"/></g><g id="host-cytoplasm"><path d="${D(bottom)}" fill="url(#host-gradient)"/></g>`,
    parts: [['bacterium', BUG], ['host cell', HOST]],
  }
  // The needle complex, flat: sorting platform under the inner membrane, the rings in each membrane joined by the rod,
  // the hollow needle, and the translocon pore in the host membrane.
  const ow = 6, rr = (x0, y0, x1, y1, r) => {
    const [X0, Y0] = g.P([x0, y0]), [X1, Y1] = g.P([x1, y1]), R = Math.min(r * g.k, (X1 - X0) / 2, (Y1 - Y0) / 2)
    const d = `M${f(X0 + R)},${f(Y0)} H${f(X1 - R)} A${f(R)},${f(R)} 0 0 1 ${f(X1)},${f(Y0 + R)} V${f(Y1 - R)} A${f(R)},${f(R)} 0 0 1 ${f(X1 - R)},${f(Y1)} H${f(X0 + R)} A${f(R)},${f(R)} 0 0 1 ${f(X0)},${f(Y1 - R)} V${f(Y0 + R)} A${f(R)},${f(R)} 0 0 1 ${f(X0 + R)},${f(Y0)} Z`
    return `<path d="${d}" fill="${NEEDLE.base}" stroke="${NEEDLE.outline}" stroke-width="${ow}" stroke-linejoin="round"/>`
  }
  const yIm = -22, yOm = -5 // the membranes' middles, where the complex crosses them
  const complex = {
    defs: '',
    body: `<g id="needle-complex"><g id="needle">${rr(-2.6, yOm, 2.6, 27, 1.3)}${g.line([[0, yOm + 2], [0, 25]], NEEDLE.light, 4)}</g>` +
      `<g id="rod">${rr(-3.5, yIm, 3.5, yOm, 1)}</g>` +
      `<g id="outer-ring">${rr(-9, yOm - 4.5, 9, yOm + 4.5, 3.5)}</g>` +
      `<g id="inner-ring">${rr(-12, yIm - 5, 12, yIm + 5, 4)}</g>` +
      `<g id="sorting-platform">${rr(-3.5, -36, 3.5, yIm - 4, 1)}${rr(-15, -45, 15, -35.5, 4.5)}</g>` +
      `<g id="translocon">${rr(-9.5, 22.5, -3, 32, 3)}${rr(3, 22.5, 9.5, 32, 3)}</g></g>`,
    parts: [['needle complex', NEEDLE]],
  }
  const effs = [[-30, -38, 10], [28, -37, 70], [-22, 41, 30], [9, 40, -20], [30, 40, 50]].map(([x, y, t], i) => protein(g, { x, y, size: 8, turn: t, pal: EFF, id: `effector-${i + 1}` }))
  icon('Secretion system', grounds, im, om, hm, complex, ...effs)
}

// ---------- Akkermansia muciniphila: oval bacteria, single and dividing, in the mucus layer, among mucin chains ----------
{
  const MUC = soft(hueOf('#7fb2e0')), AKK = soft(hueOf('#e0708a'))
  const blob = g.smooth([[-46, -20], [-30, -40], [0, -44], [28, -40], [46, -24], [47, 6], [40, 30], [14, 44], [-20, 44], [-42, 32], [-47, 8]])
  const cub = (p, t) => { const u = 1 - t; return [0, 1].map((k) => u * u * u * p[0][k] + 3 * u * u * t * p[1][k] + 3 * u * t * t * p[2][k] + t * t * t * p[3][k]) }
  // A mucin: a protein backbone (a curve) with short sugar branches on both sides, each ending in a sugar.
  const mucin = (id, p, n) => {
    let br = '', dots = ''
    for (let i = 1; i < n; i++) {
      const t = i / n, q = cub(p, t), q2 = cub(p, t + 0.01), l = Math.hypot(q2[0] - q[0], q2[1] - q[1]), nx = -(q2[1] - q[1]) / l, ny = (q2[0] - q[0]) / l
      ;[1, -1].forEach((sg) => { const e = [q[0] + nx * sg * 7.5, q[1] + ny * sg * 7.5]; br += g.line([q, e], MUC.outline, 4); dots += g.circle(e[0], e[1], 2.3, MUC.small, MUC.outline, 3) })
    }
    const back = Array.from({ length: 41 }, (_, i) => cub(p, i / 40))
    return `<g id="${id}">${br}${g.line(back, MUC.outline, 8)}${dots}</g>`
  }
  const mucus = {
    defs: grad('mucus-gradient', [g.X(-47), g.Y(-44), g.X(47), g.Y(44)], MUC.light, MUC.base),
    body: `<g id="mucus"><path d="${blob}" fill="url(#mucus-gradient)"/>${mucin('mucin-1', [[-44, 30], [-24, 16], [4, 44], [44, 22]], 10)}${mucin('mucin-2', [[-6, -42], [14, -38], [24, -26], [44, -29]], 6)}</g>`,
    parts: [['mucus', MUC]],
  }
  const bugs = [[-14, -10, -24, 2], [26, -2, 32, 1], [-30, -28, 8, 1], [14, 29, -12, 1], [-30, 12, 70, 1]]
    .map(([x, y, t, k], i) => microbe(g, { x, y, size: k === 2 ? 44 : 24, turn: t, shape: 'oval', pair: k === 2, pal: AKK, id: `akkermansia-${i + 1}` }))
  icon('Akkermansia muciniphila', mucus, ...bugs)
}

kit.check()
console.log('written', OUT)
