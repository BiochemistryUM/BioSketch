// Eight icons of SiliCoDraw's "Molecules & genetics" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts in ../parts/:
// cytokine, peptide chain, collagen, haemoglobin, G protein-coupled receptor, transporter, RNA strand and gene. Their
// compositions are read by hand from the source in a 100 × 100 box centred on 0,0 and scaled onto a 512 page.
// Parts used: protein, ligand, RNA and DNA (molecules.mjs), the bilayer with a seven-helix receptor or a transporter in it
// (membranes.mjs), arrows (tissue.mjs). Drawn here, because no part draws them: the beads of a peptide chain (`aminoAcids`),
// the collagen triple helix (`tripleHelix`), the haem groups of haemoglobin (`haem`) and the signal waves of a cytokine
// (`waves`). Nothing is lettered (none of the eight originals writes a label).
// Usage: node mg02.mjs <folder>
import { BLUE, cellTypes, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex, toLch } from '../colour.mjs'
import { f } from '../shapes.mjs'
import { dna, ligand, protein, rna } from '../parts/molecules.mjs'
import { LIPID, gpcr, membraneWith, pump } from '../parts/membranes.mjs'
import { arrow } from '../parts/tissue.mjs'

const OUT = process.argv[2]
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012) are left out of the hue check, as STYLE.md says: BioSketch never recolours them with a part.
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p]) => toLch(p.base).c >= 0.012), defs, body)

// Hues (OKLCH degrees) of this batch, beside those of the parts: protein amber 75, small molecules green 165, DNA blue 267,
// lipids peach 52, RNA rose 15.
const COLLAGEN = hueOf('#d9824a'), GLOBIN = hueOf('#f3b6b6'), HAEM = hueOf('#d64545'), YELLOW = hueOf('#fde68a')
// Arrows and the backbone in a true grey (chroma below 0.012): the part's INK (chroma 0.03, 255°) lies within 36° of the
// blue of membrane proteins and DNA, and would recolour with them.
const GREY = toHex({ l: 0.5, c: 0.008, h: 255 })
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n') })
/** One gradient that lights every shape that uses it from its own top left (beads). */
const boxGrad = (id, pal) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`
const line = (pts, colour, w, cap = 'round') => `<path d="M${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' L')}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
const disc = ([x, y], r, fill, stroke = '', w = 0) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${f(w)}"` : ''}/>`
const shineAt = ([x, y], rx, ry, rot, fill) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" transform="rotate(${rot} ${f(x)} ${f(y)})" fill="${fill}"/>`

// ---------- drawings of this batch (no part draws them) ----------

/**
 * Signal waves: arcs that spread out from a molecule to each side (a released signal), as SiliCoDraw's cytokine. `arcs` are
 * [x, y, dx, dy, r] in g's units: an arc of radius r from x, y to x + dx, y + dy, bowing outwards.
 */
const waves = (g, arcs, colour, w) =>
  `<g id="signal">${arcs.map(([x, y, dx, dy, r]) => `<path d="M${f(g.X(x))},${f(g.Y(y))} A${f(r * g.k)},${f(r * g.k)} 0 0 1 ${f(g.X(x + dx))},${f(g.Y(y + dy))}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="round"/>`).join('')}</g>`

/**
 * A peptide chain: amino acids as round beads on a backbone, each its own colour (`hues`), lit from the top left, with
 * an outline in its own tone. `xs` the places of the beads along y = 0, `r` their radius (g's units).
 */
const aminoAcids = (g, { xs, r, hues, w, backbone }) => {
  const pals = hues.map((h) => deep(h))
  const beads = xs.map((x, i) => {
    const c = g.P([x, 0]), R = r * g.k - w / 2
    return `<g id="amino-acid-${i + 1}">${disc(c, R, `url(#amino-acid-${i + 1}-gradient)`, pals[i].outline, w)}${shineAt([c[0] - R * 0.4, c[1] - R * 0.44], R * 0.36, R * 0.14, -40, pals[i].light)}</g>`
  })
  return {
    defs: pals.map((p, i) => boxGrad(`amino-acid-${i + 1}-gradient`, p)).join(''),
    body: `<g id="backbone">${line([g.P([xs[0], 0]), g.P([xs.at(-1), 0])], GREY, backbone)}</g>\n<g id="amino-acids">${beads.join('')}</g>`,
    parts: pals.map((p, i) => [`amino acid ${i + 1}`, p]),
  }
}

/**
 * The collagen triple helix: three chains wound round one axis (y = 0, from x0 to x1), each a tube with an outline,
 * in three tones of the collagen orange. Every chain passes in front of and behind the others in turn: where two cross,
 * one is in front (z > 0) and the other behind, so the parts behind are drawn first, then those in front, each run
 * as a tube whose fill covers the outline where runs meet.
 */
const tripleHelix = (g, { x0, x1, amp, period, T, w, fills, outline }) => {
  const n = 160, step = (x1 - x0) / n
  const chains = [0, 2.1, 4.2].map((ph) => Array.from({ length: n + 1 }, (_, i) => {
    const x = x0 + i * step, a = (2 * Math.PI * (x - x0)) / period + ph
    return { p: g.P([x, amp * Math.sin(a)]), front: Math.cos(a) >= 0 }
  }))
  const Tp = T * g.k
  const runs = chains.map((pts) => {
    const out = []
    let a = 0
    for (let i = 1; i <= n; i++) if (i === n || pts[i].front !== pts[i - 1].front) { out.push({ front: pts[a].front, a, b: i }); a = i }
    return out
  })
  const tube = (pts, { a, b }, fill) => {
    const cut = (k) => pts.slice(Math.max(0, a - k), Math.min(pts.length, b + 1 + k)).map((q) => q.p)
    const ends = [a === 0 && pts[0].p, b === n && pts[n].p].filter(Boolean)
    return ends.map((p) => disc(p, Tp / 2 + w / 2, outline, outline, w)).join('') +
      line(cut(1), outline, Tp + 2 * w, 'butt') + line(cut(3), fill, Tp, 'butt') + ends.map((p) => disc(p, Tp / 2, fill)).join('')
  }
  const draw = (front) => chains.map((pts, k) => runs[k].filter((r) => r.front === front).map((r) => tube(pts, r, fills[k])).join('')).join('')
  return draw(false) + draw(true)
}

/**
 * A haem group: the flat square porphyrin ring (with its iron in the middle) seen in perspective, a small red rhombus with
 * rounded corners, tilted by `rot` degrees.
 */
const haem = (g, [x, y], r, rot, pal) => {
  const [cx, cy] = g.P([x, y]), R = r * g.k, a = (rot * Math.PI) / 180, w = R * 0.32
  const pts = [[R, 0], [0, R * 0.55], [-R, 0], [0, -R * 0.55]].map(([u, v]) => [cx + u * Math.cos(a) - v * Math.sin(a), cy + u * Math.sin(a) + v * Math.cos(a)])
  return `<path d="M${pts.map(([u, v]) => `${f(u)},${f(v)}`).join(' L')}Z" fill="${pal.small}" stroke="${pal.small}" stroke-width="${f(w)}" stroke-linejoin="round"/>`
}

// =====================================================================================================================

// Cytokine: a small signalling protein, a lumpy blob, with waves spreading from it to each side.
// (The protein part, in the blue of every secreted signal and growth factor of the set (as the ligand of a cytokine
// receptor in membranes.mjs) instead of SiliCoDraw's yellow; the waves are the protein's outline tone.)
{
  const g = page(5.15, [0, 0]), pal = soft(BLUE)
  const p = protein(g, { x: -1, y: 0, size: 40, id: 'cytokine', pal })
  cellType('Cytokine', [['cytokine', pal]], p.defs,
    p.body + '\n' + waves(g, [[22, -14, 8, 26, 26], [30, -24, 12, 38, 38], [-22, 14, -8, -26, 26], [-30, 24, -12, -38, 38]], pal.outline, 13))
}

// Peptide chain: five amino acids joined into a chain, each a bead of its own colour on the backbone.
// (SiliCoDraw's five colours kept, the orange moved from 57° to 72° so that it stays 36° from the red; the backbone is
// a true grey, so it recolours with none of them. The beads take the fuller `deep` tones: their colour is what tells
// the amino acids apart.)
{
  const g = page(4.6, [0, 0])
  const c = aminoAcids(g, { xs: [-40, -20, 0, 20, 40], r: 9.4, hues: [hueOf('#4f6bb8'), hueOf('#5fae8b'), 72, hueOf('#b07cc6'), hueOf('#d64545')], w: 7, backbone: 14 })
  cellType('Peptide chain', c.parts, c.defs, c.body)
}

// Collagen: the triple helix of three chains wound round each other.
// (SiliCoDraw draws three sine waves on top of one another; here each chain passes in front of and behind the others in
// turn, so the helix reads as one rope. The three tones are those of the collagen part (orange, 52°), the deepest its ink.)
{
  const g = page(4.62, [0, 0]), pal = soft(COLLAGEN), ink = toHex({ l: 0.72, c: 0.1, h: COLLAGEN })
  cellType('Collagen', [['collagen', pal]], '',
    `<g id="collagen">${tripleHelix(g, { x0: -46, x1: 46, amp: 9, period: 56, T: 5.2, w: 6, fills: [ink, pal.small, pal.shadow], outline: pal.outline })}</g>`)
}

// Haemoglobin: the tetramer of two alpha and two beta globins, each holding a haem group.
// (The globins are the protein part in SiliCoDraw's pink (19°), alpha in the fuller `deep` tones and beta in pale `rich`
// ones, packed closely so that the four read as one molecule and not as four cells; each haem is a small dark red plate
// near the surface of its globin, not a round dot in the middle (which read as a nucleus). Globins and haem share one
// hue, so they recolour together.)
{
  const g = page(8.15, [0, 0.4]), alpha = deep(GLOBIN), beta = rich(GLOBIN), heme = { small: deep(HAEM).outline }
  const at = [[-11.5, -11, alpha, 'alpha-1', 0, -35], [11.5, -11.5, beta, 'beta-1', 14, 30], [-11.5, 12, beta, 'beta-2', -14, 30], [11.5, 12, alpha, 'alpha-2', 0, -35]]
  const subunits = at.map(([x, y, pal, id, turn]) => protein(g, { x, y, size: 34, id, pal, turn }))
  cellType('Haemoglobin', [['haemoglobin', alpha]], subunits.map((s) => s.defs).join(''),
    subunits.map((s) => s.body).join('\n') + `\n<g id="haem">${at.map(([x, y, , , , rot]) => haem(g, [x * 1.3, y * 1.3], 5.2, rot, heme)).join('')}</g>`)
}

// G protein-coupled receptor: the seven-helix receptor in the membrane, its ligand bound from outside, and the G protein
// (three subunits) under it inside the cell.
// (SiliCoDraw's light blue ligand is the green of every small molecule (the receptor is blue); the G protein keeps
// SiliCoDraw's yellow (96°), drawn as three protein parts, 44° from the lipids' peach. The membrane is the bilayer of the set.)
{
  const g = page(4.5, [0, 4]), gp = rich(YELLOW)
  const m = membraneWith(g, { x: 0, y: 0, size: 100, thick: 28, proteins: [{ part: gpcr, at: 0 }] })
  const l = ligand(g, { x: -1, y: -24.5, size: 12 })
  const sub = [[-14, 27.5, 22, 'G-alpha'], [3.5, 29, 16, 'G-beta'], [14.5, 25.5, 11, 'G-gamma']].map(([x, y, size, id]) => protein(g, { x, y, size, id, pal: gp }))
  const all = join(m, l, ...sub)
  cellType('G protein-coupled receptor', [...m.parts, ...l.parts, ['G protein', gp]], all.defs, all.body)
}

// Transporter: a carrier protein in the membrane, open to the outside, taking a molecule in from outside (above) and
// letting it go inside (below).
// (The transporter of the set, open outwards, in the membrane of the set; SiliCoDraw's orange cargo is the green of every
// small molecule, as it would otherwise share the lipids' hue. The faded copy below is a full one, without transparency;
// the dashed arrow is a plain one in the grey of arrows.)
{
  const g = page(4.5, [0, 1.5])
  const m = membraneWith(g, { x: 0, y: 0, size: 100, thick: 28, proteins: [{ part: pump, at: 0, open: 'out' }] })
  const a = arrow(g, { points: [[0, -20], [0, 25.5]], corners: true, w: 11, colour: GREY })
  const ins = [[-33.5, 'substrate-outside'], [35, 'substrate-inside']].map(([y, id]) => ligand(g, { x: 0, y, size: 12, id }))
  const all = join(m, a, ...ins)
  cellType('Transporter', [...m.parts, ...ins[0].parts, ...a.parts], all.defs, all.body)
}

// RNA strand: one strand of RNA, its bases along one side.
// (The RNA part with bases, rose; SiliCoDraw's single broad wave and beaded bases become the part's waves and ticks.)
{
  const g = page(4.6, [0, 0])
  const r = rna(g, { x: 0, y: 0, size: 100, bases: true, waves: 2, id: 'RNA' })
  cellType('RNA strand', r.parts, r.defs, r.body)
}

// Gene: a stretch of DNA in which the gene stands out in a colour of its own, with the bent arrow of its promoter (the
// start of transcription and its direction).
// (SiliCoDraw draws a line with a box arrow on it; here the DNA is the double helix of the set and the gene a stretch of
// it in orange (55°), 148° from the DNA's blue. The promoter arrow is grey.)
{
  const g = page(5.2, [0, -6.5]), gene = deep(55)
  const width = 11.5, flank = 17, len = 51, pitch = 17
  // Every stretch ends where the strands cross, so the helix runs on unbroken; the part leaves a little at each end.
  const inset = 0.075 * width + 7 / g.k
  const x0 = -(flank + len + flank) / 2
  const stretch = (x, size, pal, id) => dna(g, { x: x + size / 2, y: 0, size: size + 2 * inset, width, turns: size / pitch, flat: false, pal, id, w: 7 })
  const left = stretch(x0, flank, undefined, 'DNA-left'), body = stretch(x0 + flank, len, gene, 'gene'), right = stretch(x0 + flank + len, flank, undefined, 'DNA-right')
  const tss = x0 + flank + 1.5
  const a = arrow(g, { points: [[tss, -width / 2 - 1], [tss, -width / 2 - 13], [tss + 20, -width / 2 - 13]], corners: true, w: 11, id: 'promoter', colour: GREY })
  const all = join(left, right, body, a)
  cellType('Gene', [...left.parts, ['gene', gene], ...a.parts], all.defs, all.body)
}

check()
console.log('written to', OUT)
