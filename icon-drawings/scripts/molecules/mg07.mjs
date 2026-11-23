// Eight icons of SiliCoDraw's "Molecules & genetics" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David
// Carlsson; see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts in
// ../parts/: fluorescent probe, antibody-drug conjugate, antigen, IgM pentamer, membrane attack complex, inflammasome,
// prion misfolding and dopamine. Their compositions are read by hand from the source (a 100 × 100 box centred on 0,0) and
// set on a 512 page (`page` of ../cellkit.mjs). Antibodies, proteins, the aggregate, the RNA strands, the small molecules,
// the membrane and its proteins, the arrow and the released signals are the parts; drawn here, because no part draws
// them: the fluorophore (a star with its glow), the epitopes of an antigen (see each icon). Dopamine is the skeletal
// formula of ../parts/formula.mjs.
// Nothing is lettered: SiliCoDraw's "HO" and "NH₂" on dopamine are atoms drawn as balls (oxygen red, nitrogen blue).
// Usage: node mg07.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex } from '../colour.mjs'
import { f, gradient2 } from '../shapes.mjs'
import { aggregate, antibody, ion, ligand, protein, rna } from '../parts/molecules.mjs'
import { bilayer, membraneProtein, mergeParts } from '../parts/membranes.mjs'
import { arrow, release } from '../parts/tissue.mjs'
import { skeletal, DOPAMINE } from '../parts/formula.mjs'

const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const { cellType, check } = cellTypes(OUT)

// Hues (OKLCH degrees). The parts' own: protein and antibody amber 75, small molecules green 165, RNA rose 15, lipids
// peach, membrane proteins blue 267, secreted signals blue. Of this batch: the probe SiliCoDraw's green (#22c55e), the
// fluorophore the yellow of the set (96), antigens green as in mg01 (#5fae8b, 163) with SiliCoDraw's red epitopes
// (#d64545), the J chain SiliCoDraw's blue (#6f86c8), the inflammasome ring SiliCoDraw's pink (#f3b6b6); dopamine's atoms
// take the element colours of ../parts/formula.mjs.
const PROBE = hueOf('#22c55e'), YELLOW = hueOf('#fde68a'), GREEN = hueOf('#5fae8b'), RED = hueOf('#d64545')
const JCHAIN = hueOf('#6f86c8'), PINK = hueOf('#f3b6b6')

const P2 = ([x, y]) => `${f(x)},${f(y)}`
const line = (pts, colour, w, cap = 'round') => `<path d="M${pts.map(P2).join(' L')}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
const hl = ([x, y], rx, ry, rot, fill) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" transform="rotate(${rot} ${f(x)} ${f(y)})" fill="${fill}"/>`
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
/** Joins the { defs, body, parts } of several parts; parts that share a palette are one (they recolour together). */
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), parts: mergeParts(ps.flatMap((p) => p.parts)) })
const icon = (name, { defs, body, parts }) => cellType(name, parts, defs, body)
/** Some drawing of this script as a part: { defs, body, parts }. */
const own = (id, body, parts, defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })

// ---------------------------------------------------------------------------------------------------------------------
// A nucleic-acid strand that runs (nearly) straight, with its bases along one side. The RNA part only waves (its swing is
// a share of its length), so a long straight strand is laid together from short pieces of it, each one whole wave long:
// a piece of 24 units swings by under 1.5 units, and the pieces meet where the strand crosses its middle line.
// `x0` is the start, `pieces` how many, `turn` 0 (bases below) or 180 (bases above). Returns the part and where its
// bases end (`tips`, the y of the bases' free ends).
// ---------------------------------------------------------------------------------------------------------------------
const PIECE = 24
const strand = (g, { x0, y, pieces, turn = 0, id, pal, width }) => {
  const ps = Array.from({ length: pieces }, (_, i) => rna(g, { x: x0 + PIECE * (i + 0.5), y, size: PIECE, waves: 1, bases: true, turn, id: `${id}-${i + 1}`, pal, width }))
  return { defs: '', body: `<g id="${id}">${ps.map((p) => p.body).join('')}</g>`, parts: ps[0].parts }
}

// ---------------------------------------------------------------------------------------------------------------------
// The fluorophore (drawn here; no part has one): a rounded five-pointed star, lit from the top left, inside two solid
// pale discs of its own hue for the glow (SiliCoDraw's see-through discs worked out on white). x, y its middle, r the
// star's radius and `glow` the outer disc's (g units).
// ---------------------------------------------------------------------------------------------------------------------
const fluorophore = (g, { x, y, r, glow, id = 'fluorophore', pal = rich(YELLOW) }) => {
  const c = g.P([x, y]), R = r * g.k
  const pts = Array.from({ length: 10 }, (_, i) => { const a = ((i * 36 - 90) * Math.PI) / 180, q = (i % 2 ? 0.48 : 1) * R; return [c[0] + q * Math.cos(a), c[1] + q * Math.sin(a)] })
  const halo = [toHex({ l: 0.975, c: 0.035, h: YELLOW }), toHex({ l: 0.94, c: 0.07, h: YELLOW })]
  const W = f(Math.max(4, Math.min(10, R * 0.12)))
  return {
    defs: gradient2(`${id}-gradient`, [c[0] - R, c[1] - R, c[0] + R, c[1] + R], pal.base, pal.shadow),
    body: `<g id="${id}"><g id="${id}-glow">${g.circle(x, y, glow, halo[0])}${g.circle(x, y, glow * 0.8, halo[1])}</g>` +
      `<g id="${id}-star"><path d="${roundPoly(pts, R * 0.11)}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="${W}" stroke-linejoin="round"/>${hl([c[0] - R * 0.24, c[1] - R * 0.24], R * 0.22, R * 0.08, -40, pal.light)}</g></g>`,
    parts: [['fluorophore', pal]],
  }
}

// Fluorescent probe: a short labelled oligonucleotide (green) paired base by base with its target strand (rose), its
// fluorophore glowing on a linker above it.
// (SiliCoDraw draws the target as a blue line with ticks; here both strands are the RNA part with its bases, the target in
// its own rose (as in RNA FISH; the probe of DNA FISH binds a DNA strand the same way), the probe in SiliCoDraw's green so
// that the two recolour apart. The fluorophore is SiliCoDraw's yellow star in a glow of its own yellow, where SiliCoDraw
// glows in the probe's green; the linker is in the star's outline tone, so it belongs to the label.)
{
  const g = page(4.78, [0, -16.9])
  const probePal = deep(PROBE), W = 16
  const target = strand(g, { x0: -48, y: 14, pieces: 4, turn: 180, id: 'target', width: W })
  const probe = strand(g, { x0: -24, y: 5.4, pieces: 2, id: 'probe', pal: probePal, width: W })
  const star = fluorophore(g, { x: 0, y: -31, r: 15, glow: 21 })
  const link = own('linker', line([g.P([0, 0]), g.P([0, -20])], rich(YELLOW).outline, 10), [])
  icon('Fluorescent probe', join(target, probe, link, star))
}

// Antibody-drug conjugate: an antibody carrying four molecules of drug, each on a short linker: two on the arms, beside
// the light chains, two on the stem.
// (The antibody part, amber, where SiliCoDraw's is blue with orange tips. The drug is the ligand part, green like every
// small molecule, where SiliCoDraw draws red balls; the linkers are in the drug's outline tone.)
{
  const g = page(5.2, [0, 6.6]), S = 86, ay = 4
  const ab = antibody(g, { x: 0, y: ay, size: S })
  const drug = deep(165)
  const k = S / 100, hinge = [0, ay + 4 * k], r = 6.6
  const sites = []
  for (const s of [-1, 1]) {
    const tip = [s * 30 * k, ay - 36 * k], l = Math.hypot(tip[0] - hinge[0], tip[1] - hinge[1]), d = [(tip[0] - hinge[0]) / l, (tip[1] - hinge[1]) / l], n = [-d[1] * s, d[0] * s]
    const base = [hinge[0] + d[0] * l * 0.44, hinge[1] + d[1] * l * 0.44], from = 19 * k, to = from + 9
    sites.push([[base[0] + n[0] * from, base[1] + n[1] * from], [base[0] + n[0] * (to + r), base[1] + n[1] * (to + r)]])
    // On the stem: from its side, outwards and a little down.
    const y0 = ay + 26 * k, a = [s * 7.5 * k, y0], dir = [s * 0.94, 0.34]
    sites.push([a, [a[0] + dir[0] * (11 + r), a[1] + dir[1] * (11 + r)]])
  }
  const linkers = own('linkers', sites.map(([a, b]) => line([g.P(a), g.P(b)], drug.outline, 9)).join(''), [])
  const drugs = sites.map(([, b], i) => ligand(g, { x: b[0], y: b[1], size: 2 * r, id: `drug-${i + 1}` }))
  icon('Antibody-drug conjugate', join(linkers, ab, ...drugs))
}

// Antigen: a protein antigen (green, as the antigens of mg01) with three epitopes on its surface, the patches an antibody
// binds, in SiliCoDraw's red.
// (SiliCoDraw draws a yellow sun of nine spikes with a red square and an orange dot on it. Here the antigen is the protein
// part and the epitopes small flat red patches that sit on its outline, so they read as part of its surface; the spikes
// are left out, as they make a virus of it.)
{
  const g = page(5.02, [-3.5, 2.2])
  const pal = soft(GREEN), epi = deep(RED)
  const ag = protein(g, { x: 0, y: 0, size: 88, id: 'antigen', pal })
  // Epitopes: small flat red knobs that stand out of the surface, drawn under the protein so that only their outer half shows.
  const knob = (deg, r) => { const a = (deg * Math.PI) / 180, R = 42.5; return g.circle(R * Math.cos(a), R * Math.sin(a), r, epi.small) }
  const ep = own('epitopes', knob(-48, 8) + knob(168, 7.5) + knob(66, 7), [['epitopes', epi]])
  icon('Antigen', join(ep, ag))
}

// IgM pentamer: five antibodies joined by their stems in a ring, with the J chain in the middle where they meet.
// (Five antibody parts, amber, with their light chains, where SiliCoDraw draws blue Ys with orange tips; the J chain is
// the protein part in SiliCoDraw's blue.)
{
  const g = page(4.62, [0, 0.2]), S = 47, rc = 25
  const abs = [0, 1, 2, 3, 4].map((i) => {
    const th = -90 + 72 * i, t = (th * Math.PI) / 180
    return antibody(g, { x: rc * Math.cos(t), y: rc * Math.sin(t), size: S, turn: th + 90, id: `IgM-${i + 1}` })
  })
  const j = protein(g, { x: 0, y: 0, size: 17, id: 'J-chain', pal: soft(JCHAIN) })
  icon('IgM pentamer', join(...abs, j))
}

// Membrane attack complex: the pore that complement builds in a target cell's membrane, a ring of C9 molecules seen in
// section as two walls of protein across the membrane and standing out above it, with water and ions passing through it.
// (SiliCoDraw draws a blue band with dots and four blue rods. Here the membrane is the lipid bilayer of the set; each
// wall is two membrane-protein parts in the blue of membrane proteins, taller than the membrane (they are given a thicker
// membrane and set higher), as the complex reaches out of the cell; the small molecules are green ions, where SiliCoDraw's
// are orange.)
{
  const g = page(4.45, [0, 0.5]), t = 23, tp = 1.32 * t, rise = 4
  const rx = 0.37 * 0.4 * tp, lumen = 6.5
  const us = [-(lumen + 3 * rx + 0.6), -(lumen + rx), lumen + rx, lumen + 3 * rx + 0.6]
  const half = us.at(-1) + rx + 0.05 * t
  const m = bilayer(g, { x: 0, y: 0, size: 100, thick: t, id: 'membrane', gaps: [[-half, half]] })
  const walls = us.map((u, i) => membraneProtein(g, { x: u, y: -rise, thick: tp, wide: 0.4, id: `C9-${i + 1}` }))
  const ions = [[0, -34], [2.5, -44], [0, 26], [-3, 36], [2, 45]].map(([x, y], i) => ion(g, { x, y, size: 6.4, id: `ion-${i + 1}` }))
  icon('Membrane attack complex', join(m, ...walls, ...ions))
}

// Inflammasome: a wheel of seven sensor proteins (NLRP3 with its adaptor ASC) round caspase-1 in the middle, and the
// cytokine it releases (IL-1β) leaving at the right.
// (Each sensor is the protein part in SiliCoDraw's pink; caspase-1 is the protein part in its amber, where SiliCoDraw's
// middle is red, 6° from the pink. The three orange dots of IL-1β are the release part, blue like every secreted signal.)
{
  const g = page(4.9, [7.1, -7.5]), R = 24, s = 21, cx = -6
  const ring = Array.from({ length: 7 }, (_, i) => {
    const a = ((-90 + (360 / 7) * i) * Math.PI) / 180
    return protein(g, { x: cx + R * Math.cos(a), y: R * Math.sin(a), size: s, turn: (360 / 7) * i, id: `sensor-${i + 1}`, pal: soft(PINK) })
  })
  const casp = protein(g, { x: cx, y: 0, size: 26, id: 'caspase-1' })
  const out = release(g, { x: cx + 39, y: -25, size: 36, turn: -38, id: 'IL-1-beta' })
  icon('Inflammasome', join(...ring, casp, out))
}

// Prion misfolding: native prion proteins (green) turned into misfolded ones that clump into an aggregate (amber).
// (SiliCoDraw draws two green waves, an arrow and a stack of red β-strand arrows. Here the native proteins are the protein
// part, two of them, in SiliCoDraw's green; the arrow is the arrow part in their outline tone; the clump is the aggregate
// part in its own amber, which stands for the misfolded protein in every icon of the set.)
{
  const g = page(4.66, [0.7, 0])
  const pal = soft(GREEN)
  const a = protein(g, { x: -35, y: -16, size: 28, id: 'native-protein-1', pal })
  const b = protein(g, { x: -31, y: 16, size: 28, turn: 140, id: 'native-protein-2', pal })
  const arr = arrow(g, { x: -4, y: 0, size: 18, colour: pal.outline, id: 'conversion' })
  const agg = aggregate(g, { x: 28, y: 0, size: 48, count: 5 })
  // The arrow is in the proteins' outline tone and recolours with them: one part.
  icon('Prion misfolding', join(a, b, { ...arr, parts: [] }, agg))
}

// Dopamine: a catechol ring (a benzene ring with two neighbouring hydroxyl groups) and a side chain of two carbons ending
// in an amino group, as the skeletal formula draws it.
// (Corrected: SiliCoDraw hangs the side chain off the middle of a side of the ring; here it leaves the ring at the corner
// opposite the first hydroxyl, as in dopamine. The molecule is the skeletal-formula part (../parts/formula.mjs,
// DOPAMINE): the glucose part's hexagon with three inner lines, bonds in its outline tone, each "HO" an oxygen ball
// lettered "O" and "NH₂" a nitrogen ball lettered "N"; their hydrogens are left out, as in a skeletal formula.)
{
  const g = page(4.75, [14.1, 0])
  icon('Dopamine', join(skeletal(g, { x: 13.9, y: 0, size: 101, id: 'dopamine', ...DOPAMINE })))
}

check()
console.log('written to', OUT)
