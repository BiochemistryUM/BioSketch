// Eight icons of SiliCoDraw's "Molecules & genetics" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David
// Carlsson; see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts in
// ../parts/: binding pocket, protein folding, allostery, MD simulation, disordered region, agonist, antagonist and partial
// agonist. Their compositions are read by hand from the source in a 100 × 100 box centred on 0,0 and scaled onto a 512
// page (`page` of ../cellkit.mjs).
// Parts used: enzyme, protein, ligand (molecules.mjs), the receptor in its membrane with the cell's response
// (complexes.mjs), arrows (tissue.mjs). Drawn here, because no part draws them: a loose polypeptide chain (`chain`), a protein
// with two sites (`twoSites`, the part's enzyme has one), the box of a simulation with its atoms' paths (`simBox`,
// `bonds`, `trails`) and the block of an antagonist (`block`).
// Agonist, Antagonist and Partial agonist share one scene, the part `receptorInMembrane` (../parts/complexes.mjs), as mg16
// (inverse agonist, allosteric modulator, biased agonist) does, so that all six show the same receptor at the same scale
// and place.
// Nothing is lettered: SiliCoDraw's labels (Kd, t, ?, ON, OFF, partial) need glyphs letters.mjs has not (K, d, t, F) or are
// words; each is left out or said by a shape (see each icon).
// Usage: node mg15.mjs <folder>
import { cellTypes, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex, toLch } from '../colour.mjs'
import { catmull, f, gradient2 } from '../shapes.mjs'
import { enzyme, ligand, protein } from '../parts/molecules.mjs'
import { arrow } from '../parts/tissue.mjs'
import { receptorInMembrane } from '../parts/complexes.mjs'

const OUT = process.argv[2]
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012) are left out of the hue check, as STYLE.md says: BioSketch never recolours them with a part.
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p]) => toLch(p.base).c >= 0.012), defs, body)
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts ?? []) })

// Hues (OKLCH degrees) of this batch, beside those of the parts: free protein amber 75 (`rich`), small molecules green 165,
// membrane proteins blue 267, lipids peach 52.
const AMBER = 75
// Arrows, bonds and the simulation box in a true grey (chroma below 0.012): the arrow part's INK (chroma 0.03, 255°) lies
// within 36° of the blue of membrane proteins and would recolour with them.
const GREY = toHex({ l: 0.5, c: 0.008, h: 255 })
const BOX = { light: toHex({ l: 0.985, c: 0.003, h: 255 }), base: toHex({ l: 0.965, c: 0.004, h: 255 }), shadow: toHex({ l: 0.93, c: 0.006, h: 255 }), outline: toHex({ l: 0.62, c: 0.008, h: 255 }) }

const line = (pts, colour, w, cap = 'round', extra = '') => `<path d="M${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' L')}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"${extra}/>`
const disc = ([x, y], r, fill, stroke = '', w = 0) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${f(w)}"` : ''}/>`
const shineAt = ([x, y], rx, ry, rot, fill) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" transform="rotate(${rot} ${f(x)} ${f(y)})" fill="${fill}"/>`
const bboxOf = (pts) => [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))]

/** The receptor scene of the pharmacology icons: the part `receptorInMembrane` (../parts/complexes.mjs) on the page all six
 * icons share (page(4.6, [0, 7]), membrane 100 long at y = 0, outside up), so that they line up side by side. */
const receptorScene = (o = {}) => { const g = page(4.6, [0, 7]); return { g, ...receptorInMembrane(g, { x: 0, y: 0, size: 100, ...o }) } }

// =====================================================================================================================
// Drawings of this batch (no part draws them)
// =====================================================================================================================

/**
 * A polypeptide chain that is not folded: a tube along a smooth course through `pts` (g's units), T units wide, with an
 * outline w px in the protein's outline tone and its fill lit from the top left (one gradient over its box). Drawn as
 * one stroke over a wider one, so the chain must not cross itself. `flat` draws it in one flat tone without outline (an
 * earlier or later shape of the same chain).
 */
const chain = (g, pts, T, pal, w, id, flat) => {
  const P = catmull(pts.map(g.P), 16), Tp = T * g.k
  if (flat) return { defs: '', body: `<g id="${id}">${line(P, flat, Tp)}</g>` }
  return {
    defs: gradient2(`${id}-gradient`, bboxOf(P), pal.base, pal.shadow),
    body: `<g id="${id}">${line(P, pal.outline, Tp + 2 * w)}${line(P, `url(#${id}-gradient)`, Tp)}</g>`,
  }
}

/**
 * A free protein with two sites: the active site (a pocket open to the right, as the enzyme part's) and a smaller
 * allosteric site on the far side, open to the left. The outline is the enzyme part's rim (a circle of 46 units, slightly
 * lumpy) widened to 1.12 × its height, with both pockets cut in; the same gradient, outline and highlight as the part.
 */
const twoSites = (g, { x, y, size, pal, id, w }) => {
  const s = size / 100, P = ([u, v]) => g.P([x + u * s, y + v * s])
  const rim = [28, 62, 96, 136, 224, 266, 300, 332].map((a, i) => { const t = (a * Math.PI) / 180, r = 46 * (1 + 0.035 * Math.sin(3 * t + 1) - (i % 3 === 1 ? 0.02 : 0)); return [1.12 * r * Math.cos(t), r * Math.sin(t)] })
  const active = [[44, -19], [32, -15], [22, -8], [19, 0], [22, 8], [32, 15], [44, 19]]
  const allo = [[-45, 20], [-39, 13], [-33, 7], [-31, 0], [-33, -7], [-39, -13], [-45, -20]]
  // Clockwise from the active site's lower lip: the lower rim, the allosteric pocket, the upper rim, the active pocket.
  const pts = [...rim.slice(0, 4), ...allo, ...rim.slice(4), ...active]
  const smoothed = (q) => { const n = q.length; let d = `M${f(q[0][0])},${f(q[0][1])}`; for (let i = 0; i < n; i++) { const a = q[(i - 1 + n) % n], b = q[i], c = q[(i + 1) % n], e = q[(i + 2) % n]; d += `C${f(b[0] + (c[0] - a[0]) / 6)},${f(b[1] + (c[1] - a[1]) / 6)} ${f(c[0] - (e[0] - b[0]) / 6)},${f(c[1] - (e[1] - b[1]) / 6)} ${f(c[0])},${f(c[1])}` } return d + 'Z' }
  const [hx, hy] = P([-22, -27])
  return {
    defs: gradient2(`${id}-gradient`, [...P([-52, -46]), ...P([52, 46])], pal.base, pal.shadow),
    body: `<g id="${id}"><path d="${smoothed(pts.map(P))}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="${f(w)}" stroke-linejoin="round"/>${shineAt([hx, hy], 15 * s * g.k, 5 * s * g.k, -30, pal.light)}</g>`,
    parts: [['protein', pal]],
  }
}

/** The box of a simulation: a rounded rectangle in grey, lit from the top left, with an outline (g's units). */
const simBox = (g, [x0, y0, x1, y1], r, w) => {
  const [X0, Y0] = g.P([x0, y0]), [X1, Y1] = g.P([x1, y1])
  return {
    defs: gradient2('box-gradient', [X0, Y0, X1, Y1], BOX.light, BOX.shadow),
    body: `<g id="simulation-box"><rect x="${f(X0)}" y="${f(Y0)}" width="${f(X1 - X0)}" height="${f(Y1 - Y0)}" rx="${f(r * g.k)}" fill="url(#box-gradient)" stroke="${BOX.outline}" stroke-width="${f(w)}"/></g>`,
  }
}

/** The block of an antagonist: a rounded square too wide to sink into the receptor's cup, lit from the top left. */
const block = (g, { x, y, wide, high, pal, w, id }) => {
  const [X0, Y0] = g.P([x - wide / 2, y - high / 2]), W = wide * g.k, H = high * g.k
  return {
    defs: gradient2(`${id}-gradient`, [X0, Y0, X0 + W, Y0 + H], pal.base, pal.shadow),
    body: `<g id="${id}"><rect x="${f(X0 + w / 2)}" y="${f(Y0 + w / 2)}" width="${f(W - w)}" height="${f(H - w)}" rx="${f(H * 0.26)}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="${f(w)}"/>${shineAt([X0 + W * 0.28, Y0 + H * 0.3], W * 0.13, H * 0.07, -18, pal.light)}</g>`,
    parts: [['antagonist', pal]],
  }
}

// =====================================================================================================================

// Binding pocket: a protein with a pocket on its surface, open upwards, lined by the side chains that hold a ligand, and
// a small molecule coming down into it.
// (The enzyme part turned so its pocket opens upwards, amber as every free protein, instead of SiliCoDraw's green dome;
// the ligand is the green ligand part instead of orange, which lies within 36° of the amber. SiliCoDraw's four ticks in
// the pocket (its residues) are four dots of the protein's deeper tone along the pocket wall. The dashed arrow is a plain
// grey one. "Kd" is left out: letters.mjs has no K or d, and the binding is said by the arrow into the pocket.)
{
  const g = page(4.6, [0, 4]), pal = rich(AMBER), size = 86, cy = 14
  const e = enzyme(g, { x: 0, y: cy, size, turn: -90, id: 'protein', pal })
  // The pocket of the part (to the right before the turn): residues just inside its wall, turned with it.
  const s = size / 100, res = [[30, -22], [17, -14.5], [17, 14.5], [30, 22]].map(([u, v]) => g.P([v * s, cy - u * s]))
  const residues = `<g id="residues">${res.map((p) => disc(p, 2.8 * s * g.k, pal.outline)).join('')}</g>`
  const l = ligand(g, { x: 0, y: -37, size: 16, id: 'ligand' })
  const a = arrow(g, { points: [[0, -27], [0, -14]], corners: true, w: 10, colour: GREY, id: 'arrow' })
  const all = join(e, l, a)
  cellType('Binding pocket', [['protein', pal], ...l.parts, ...a.parts], all.defs, e.body + residues + '\n' + l.body + a.body)
}

// Protein folding: a chain of amino acids that is not folded, an arrow, and the same chain folded into a compact protein.
// (Amber, the colour of every free protein, for both: they are one chain. SiliCoDraw draws the unfolded chain as a grey
// line and the folded one blue; here the chain is a tube with the protein's outline, and the folded protein is the protein
// part with two strands of its chain showing on it. The arrow is grey.)
{
  const g = page(4.55, [-1, 0]), pal = rich(AMBER)
  const c = chain(g, [[-46, 9], [-41, -10], [-34, -5], [-31, 12], [-24, 15], [-20, -3], [-14, -12], [-9, 2]], 5.5, pal, 5, 'unfolded-chain')
  const a = arrow(g, { x: 2.5, y: 0, size: 13, w: 10, colour: GREY, id: 'arrow' })
  const p = protein(g, { x: 28, y: 0, size: 40, id: 'folded-protein', pal, turn: 10 })
  // Strands of the folded chain on the protein's face, in its shadow tone.
  const strands = `<g id="folded-chain">${[[[18, 6], [20, -7], [29, -10], [32, -1], [27, 5]], [[23, 13], [31, 12], [38, 5], [39, -5]]].map((q) => line(catmull(q.map(g.P), 12), pal.small, 7)).join('')}</g>`
  const all = join(c, a, p)
  cellType('Protein folding', [['protein', pal], ...a.parts], all.defs, c.body + '\n' + a.body + '\n' + p.body + strands)
}

// Allostery: a protein with two sites. A modulator bound at the allosteric site (left) changes the shape of the protein,
// which opens the active site (right) to its substrate; the arrow inside the protein carries the change from one site to
// the other.
// (The protein is amber instead of SiliCoDraw's pale blue, with both pockets cut into one outline. The modulator is violet
// (320°) instead of orange, which would lie within 36° of the amber; the substrate, a dashed empty circle in SiliCoDraw,
// is the green ligand part seated in the mouth of the active site. The dashed arrow is a plain one in the protein's
// outline tone.)
{
  const g = page(4.55, [2, 0]), pal = rich(AMBER), mod = deep(320)
  const p = twoSites(g, { x: 0, y: 0, size: 86, pal, id: 'protein', w: 8 })
  const m = ligand(g, { x: -36.5, y: 0, size: 15, id: 'modulator', pal: mod })
  const sub = ligand(g, { x: 40, y: 0, size: 15, id: 'substrate' })
  const a = arrow(g, { points: [[-21, 4], [-7, -11], [11, -11], [23, 2]], w: 8, colour: pal.outline, id: 'conformational-change' })
  const all = join(p, m, sub, a)
  cellType('Allostery', [['protein', pal], ['modulator', mod], ['substrate', sub.parts[0][1]]], all.defs, all.body)
}

// MD simulation: a molecule of six atoms in the box of a simulation, three atoms trailing the paths they took.
// (SiliCoDraw's box, atoms and dashed orange paths kept: the atoms are the ligand part in SiliCoDraw's blue, the bonds and
// the box grey. The paths are dashed lines of the orange's deeper tone; the dots of a path grow towards the atom, so the
// line reads as a track even at 40 px. The italic "t" for time is left out (letters.mjs has no t).)
{
  const g = page(5.15, [0, 0]), atom = deep(hueOf('#6f86c8')), path = deep(hueOf('#e3955a'))
  const box = simBox(g, [-44, -34, 44, 34], 6, 6)
  const at = [[-25, -14], [-8, -3], [11, -12], [24, 8], [3, 15], [-19, 12]]
  const bonds = `<g id="bonds">${line(at.map(g.P), GREY, 8)}</g>`
  const atoms = at.map(([x, y], i) => ligand(g, { x, y, size: 12, id: `atom-${i + 1}`, pal: atom }))
  // Each path ends at its atom, from far (small dots) to near (larger ones).
  const paths = [[[-37, -24], [-36, -14], [-31, -11]], [[17, -27], [25, -24], [26, -19], [16, -16]], [[16, 29], [9, 26], [6, 21]]]
  const trails = `<g id="paths">${paths.map((q) => {
    const P = catmull(q.map(g.P), 20), n = 6
    return Array.from({ length: n }, (_, i) => { const t = i / (n - 1) * 0.86, k = Math.round(t * (P.length - 1)); return disc(P[k], 2.6 + 2.2 * (i / (n - 1)), path.small) }).join('')
  }).join('')}</g>`
  const all = join(box, ...atoms)
  cellType('MD simulation', [['atoms', atom], ['paths', path], ['box', BOX]], all.defs, box.body + '\n' + trails + '\n' + bonds + '\n' + atoms.map((a) => a.body).join(''))
}

// Disordered region: a folded domain with a long tail that has no fixed shape: the tail as it is now, and paler, two other
// shapes it takes a moment later.
// (Amber for domain and tail, one protein, instead of SiliCoDraw's blue and grey. SiliCoDraw shows the other shapes with
// transparency; here they are flat strokes in the protein's pale shadow tone, without outline. The "?" is left out: the
// ghost tails say that the region has no single shape.)
{
  const g = page(4.95, [2, -3]), pal = rich(AMBER)
  const start = [[-18, -2], [-10, -5]]
  const ghosts = [
    chain(g, [...start, [-2, -14], [8, -12], [16, -24], [27, -22], [38, -32]], 5, pal, 0, 'other-shape-1', pal.shadow),
    chain(g, [...start, [-1, 7], [9, 15], [18, 10], [27, 22], [37, 24]], 5, pal, 0, 'other-shape-2', pal.shadow),
  ]
  const tail = chain(g, [...start, [-1, -10], [7, -1], [15, -9], [23, 0], [31, -7], [39, 1], [45, -4]], 5.5, pal, 5, 'disordered-tail')
  const d = protein(g, { x: -29, y: -2, size: 34, id: 'folded-domain', pal, turn: -20 })
  const all = join(...ghosts, tail, d)
  cellType('Disordered region', [['protein', pal]], all.defs, all.body)
}

// Agonist: a ligand that fits the receptor's cup fully, and the cell answers in full (many signal dots released inside).
// (The receptor scene; the agonist is the receptor part's own green ligand, seated deep in its cup. SiliCoDraw's
// green arrow and "ON" become the full burst of signal dots under the receptor.)
{
  const s = receptorScene({ bound: true, response: 'full' })
  cellType('Agonist', s.parts, s.defs, s.body)
}

// Antagonist: a ligand that sits on the receptor and blocks it without fitting into its cup, and the cell does not answer
// (no signal released).
// (The same scene; the antagonist is a red block, as SiliCoDraw's red rectangle, resting on the rims of the cup, too wide to
// sink in. Red is moved from SiliCoDraw's 25° to 12°, 40° from the lipids' peach. SiliCoDraw's bar, faded arrow and "OFF"
// become the empty space under the receptor where the other two release their signal.)
{
  const s = receptorScene({ response: 'none' }), red = deep(12)
  const b = block(s.g, { x: 0, y: s.cup.rim - 4.2, wide: 20, high: 12.5, pal: red, w: 6, id: 'antagonist' })
  cellType('Antagonist', [...s.parts, ...b.parts], s.defs + b.defs, s.body + '\n' + b.body)
}

// Partial agonist: a ligand that binds but sits only halfway into the cup, and the cell answers weakly (a few signal dots).
// (The same scene; the partial agonist is the ligand part in SiliCoDraw's yellow (96°, `rich`), raised half a ball out of
// the cup. SiliCoDraw's half-white ball, short arrow and "partial" become the raised ligand and the small burst of dots.)
{
  const s = receptorScene({ response: 'partial' }), yellow = rich(hueOf('#fde68a'))
  const l = ligand(s.g, { x: 0, y: s.cup.y - s.cup.r * 1.05, size: s.cup.r * 2.1, id: 'partial-agonist', pal: yellow })
  cellType('Partial agonist', [...s.parts, ['partial agonist', yellow]], s.defs + l.defs, s.body + '\n' + l.body)
}

check()
console.log('written to', OUT)
