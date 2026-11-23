// Eight icons of SiliCoDraw's "Molecules & genetics" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David
// Carlsson; see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts in
// ../parts/: viral vector, lipid nanoparticle, GFP reporter, DNA damage, protein aggregate, ATP, NAD⁺ and glucose. Their
// compositions are read by hand from the source in a 100 × 100 box centred on 0,0 and scaled onto a 512 page (`page` of
// ../cellkit.mjs). DNA, RNA, the lipid monolayer, the aggregate, ATP, phosphates, glucose, the lightning and the plus are
// the parts, and so is the barrel of GFP with its glow (`fluorescentBarrel` of ../parts/complexes.mjs); what no part draws
// is drawn here: the capsid of the viral vector and the core of the lipid nanoparticle (see each icon). Nothing is lettered: where SiliCoDraw writes a label, a shape says the same.
// Usage: node mg05.mjs <folder>
import { cellTypes, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft } from '../colour.mjs'
import { f } from '../shapes.mjs'
import { bilayer, LIPID } from '../parts/membranes.mjs'
import { aggregate, atp, dna, glucose, ligand, rna } from '../parts/molecules.mjs'
import { lightning, plus } from '../parts/tissue.mjs'
import { lettering } from '../parts/letters.mjs'
import { fluorescentBarrel } from '../parts/complexes.mjs'

const OUT = process.argv[2]
const { cellType, check } = cellTypes(OUT)

// Hues (OKLCH degrees): the capsid keeps SiliCoDraw's lilac (315°), the lipid nanoparticle's core its yellow (96°), GFP
// its green (154°), the nicotinamide of NAD⁺ its blue (269°); DNA, RNA, lipids, ATP and glucose are the parts' own.
const PHOSPHATE = deep(92) // the phosphate part's mustard (molecules.mjs)
const CAPSID = hueOf('#e9d5f3'), CORE = hueOf('#fde68a'), NICOTINAMIDE = hueOf('#6f86c8'), OXYGEN = hueOf('#e86b6b')

/** A polygon (page points) with its corners rounded by r px, as a closed path. */
const roundPoly = (P, r) => {
  const n = P.length
  const toward = (a, b, d) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]), t = Math.min(d, l / 2) / l; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] }
  let d = ''
  for (let i = 0; i < n; i++) {
    const a = toward(P[i], P[(i - 1 + n) % n], r), b = toward(P[i], P[(i + 1) % n], r)
    d += `${i ? 'L' : 'M'}${f(a[0])},${f(a[1])} Q${f(P[i][0])},${f(P[i][1])} ${f(b[0])},${f(b[1])} `
  }
  return d + 'Z'
}
const polyD = (P) => `M${P.map(([x, y]) => `${f(x)},${f(y)}`).join(' L')}Z`
/** The corners of a hexagon of radius r about x, y (their units), the first at the top. */
const hexagon = (x, y, r, start = -90) => Array.from({ length: 6 }, (_, i) => { const a = ((start + 60 * i) * Math.PI) / 180; return [x + r * Math.cos(a), y + r * Math.sin(a)] })
/** Joins the { defs, body, parts } of several parts. */
const join = (...rs) => ({ defs: rs.map((r) => r.defs).join(''), body: rs.map((r) => r.body).join('\n'), parts: rs.flatMap((r) => r.parts) })

// Viral vector: an icosahedral capsid seen along a threefold axis (a hexagonal outline) carrying a gene.
// (SiliCoDraw draws a hexagon with faint spokes and two wavy lines. Here the capsid is a shell of facets round a pale
// cavity: six facets between the outer and the inner hexagon, every second one in shadow, so it reads as a solid shell
// at 40 px; the cargo is the DNA part, a short double helix, the gene the vector delivers. The capsid is drawn here: no
// part draws one.)
{
  const g = page(4.62, [0, 0]), shell = soft(CAPSID), R = 49, Ri = 33
  const outer = hexagon(0, 0, R).map(g.P), inner = hexagon(0, 0, Ri).map(g.P)
  // The outer corners are rounded (34 px): facets and spokes stop where the rounding passes, not at the sharp corner.
  const toward = (p, q, d) => { const l = Math.hypot(q[0] - p[0], q[1] - p[1]); return [p[0] + ((q[0] - p[0]) * d) / l, p[1] + ((q[1] - p[1]) * d) / l] }
  const mid = outer.map((p) => toward(p, g.P([0, 0]), 8.5)), next = (i) => (i + 1) % 6
  const facets = [0, 2, 4].map((i) => polyD([mid[i], toward(outer[i], outer[next(i)], 34), toward(outer[next(i)], outer[i], 34), mid[next(i)], inner[next(i)], inner[i]])).map((d) => `<path d="${d}" fill="${shell.shadow}"/>`).join('')
  const spokes = mid.map((p, i) => `<path d="M${f(p[0])},${f(p[1])} L${f(inner[i][0])},${f(inner[i][1])}" stroke="${shell.outline}" stroke-width="7" stroke-linecap="round"/>`).join('')
  const capsid = `<g id="capsid"><path d="${roundPoly(outer, 34)}" fill="url(#capsid-gradient)"/>${facets}${spokes}` +
    `<path d="${roundPoly(inner, 14)}" fill="${shell.light}" stroke="${shell.outline}" stroke-width="7" stroke-linejoin="round"/>` +
    `${g.hl(-30, -27, 15, 5, -30, shell.light)}<path d="${roundPoly(outer, 34)}" fill="none" stroke="${shell.outline}" stroke-width="12" stroke-linejoin="round"/></g>`
  const gene = dna(g, { x: 0, y: 0, size: 52, width: 19, turns: 2, turn: -30, id: 'gene' })
  cellType('Viral vector', [['capsid', shell], ...gene.parts], g.grad('capsid-gradient', [-43, -50, 43, 50], shell) + gene.defs, capsid + '\n' + gene.body)
}

// Lipid nanoparticle: a lipid monolayer round a core of ionisable lipid that holds mRNA.
// (SiliCoDraw draws a yellow disc ringed with small heads, three wavy lines and four dots. Here the ring is the lipid
// bilayer part with its outer leaflet only, bent into a full circle, heads outwards and tails into the core; the core is
// a yellow disc drawn here with four small ionisable lipids as dots; the mRNA is three strands of the RNA part (rose).
// The bilayer part leaves a notch in its pale band where a full circle closes, so a ring of the band's colour lies under
// it.)
{
  const g = page(4.62, [0, 0]), core = rich(CORE), t = 15.5, Rm = 41.5
  const ring = bilayer(g, { x: 0, y: -Rm, size: 2 * Math.PI * Rm, thick: t, leaflet: 'outer', bend: 360, w: 4, id: 'monolayer' })
  const annulus = `<path d="M${f(g.X(-Rm - 0.37 * t))},${f(g.Y(0))} A${f((Rm + 0.37 * t) * g.k)},${f((Rm + 0.37 * t) * g.k)} 0 1 0 ${f(g.X(Rm + 0.37 * t))},${f(g.Y(0))} A${f((Rm + 0.37 * t) * g.k)},${f((Rm + 0.37 * t) * g.k)} 0 1 0 ${f(g.X(-Rm - 0.37 * t))},${f(g.Y(0))} Z" fill="${LIPID.base}"/>`
  const coreBody = `<g id="core">${annulus}${g.circle(0, 0, Rm + 1, 'url(#core-gradient)')}${g.hl(-17, -20, 18, 6, -40, core.light)}` +
    [[-23, -6], [20, 15], [-12, 24], [17, -22]].map(([x, y]) => g.circle(x, y, 3.6, core.small)).join('') + '</g>'
  const strands = [[-2, -12, 40], [1, 3, 46], [0, 18, 36]].map(([x, y, s], i) => rna(g, { x, y, size: s, waves: 2, width: 11, turn: -14, id: `mRNA-${i + 1}` }))
  const mrna = join(...strands)
  cellType('Lipid nanoparticle', [['lipids', LIPID], ['core', core], ['mRNA', strands[0].parts[0][1]]],
    g.grad('core-gradient', [-Rm, -Rm, Rm, Rm], core) + ring.defs + mrna.defs, coreBody + '\n' + ring.body + '\n' + `<g id="mRNA">${mrna.body}</g>`)
}

// GFP reporter: green fluorescent protein, a barrel of β strands, glowing.
// (SiliCoDraw draws a cylinder with faint strands and a dark chromophore dot on its side, in two see-through green discs.
// Here the barrel is the fluorescent protein part of ../parts/complexes.mjs: a cylinder with an open top and broad β strands
// down its front; the glow is two solid pale green discs worked out from SiliCoDraw's see-through ones. The chromophore lies inside the barrel and is left
// out: a dot on the side of the barrel read as a mark on it.)
{
  const g = page(4.62, [0, 0]), gfp = fluorescentBarrel(g, { x: 0, y: 0, size: 71, glow: true, name: 'GFP', id: 'GFP' })
  cellType('GFP reporter', gfp.parts, gfp.defs, gfp.body)
}

// DNA damage: a double helix broken through both strands by radiation.
// (SiliCoDraw draws three pieces of DNA, a red flash and a red cross mark. Here two pieces of the DNA part, bent away from
// each other at the break (a double-strand break), and the lightning part (the set's yellow) striking the gap; the
// cross is left out, the gap shows the break.)
{
  const g = page(4.48, [0, -7]), bolt = lightning(g, { x: 0, y: -24, size: 46, turn: 6 })
  const left = dna(g, { x: -26.5, y: 16, size: 52, width: 23, turns: 2, turn: 20, id: 'DNA-left' })
  const right = dna(g, { x: 26.5, y: 16, size: 52, width: 23, turns: 2, turn: -20, id: 'DNA-right' })
  const all = join(left, right, bolt)
  cellType('DNA damage', [left.parts[0], ...bolt.parts], all.defs, all.body)
}

// Protein aggregate: misfolded proteins clumped together (an amyloid or inclusion body).
// (SiliCoDraw draws five lumpy blobs and three curls. The icon is the aggregate part with five chains.)
{
  const g = page(4.8, [-3.2, 0.9]), clump = aggregate(g, { x: 0, y: 0, size: 100, count: 5 })
  cellType('Protein aggregate', clump.parts, clump.defs, clump.body)
}

// ATP: the ATP part, a yellow body (adenosine, lettered "A") with a tail of three phosphates (each lettered "P").
// (SiliCoDraw draws adenine and ribose as rings with three phosphates lettered "P". Here they are the part's adenosine and
// mustard phosphate dots, lettered as the textbook cartoon is; the letters are strokes, not text.)
{
  const g = page(4.55, [0, 0]), a = atp(g, { x: 0, y: 0, size: 100 })
  cellType('ATP', a.parts, a.defs, a.body)
}

// NAD⁺: adenosine and nicotinamide joined by two phosphates.
// (SiliCoDraw draws the rings of nicotinamide (lettered "N"), two riboses and adenine round two phosphates lettered "P".
// Here the ADP half is the ATP part with two phosphates (the yellow adenosine, as in ATP), joined on by one more stretch of
// its tail to nicotinamide, a blue ring (the hexagon of the glucose part in SiliCoDraw's blue), with a plus for its
// positive charge drawn in the ring's own outline tone, so the two recolour together. The adenosine is lettered "A", the
// phosphates "P" (by the part) and the ring "N", in strokes, as SiliCoDraw letters them.)
{
  const S = 76, s = S / 100, g = page(4.5, [s * 25.5 + 2.2, -4])
  const nic = deep(NICOTINAMIDE)
  const adp = atp(g, { x: 0, y: 0, size: S, phosphates: 2, id: 'ADP' })
  const ringX = s * 64, ringSize = s * 46, tailW = Math.max(2, 4.3 * s * g.k)
  const link = `<path d="M${f(g.X(s * 28))},${f(g.Y(0))} L${f(g.X(ringX))},${f(g.Y(0))}" fill="none" stroke="${PHOSPHATE.small}" stroke-width="${f(tailW)}" stroke-linecap="round"/>`
  const ring = glucose(g, { x: ringX, y: 0, size: ringSize, turn: 30, pal: nic, id: 'nicotinamide' })
  const charge = plus(g, { x: ringX + s * 22, y: -s * 29, size: s * 19, colour: nic.outline, id: 'charge' })
  const N = lettering(g, { x: ringX, y: 0, h: ringSize * 0.42, text: 'N', colour: nic.outline, id: 'nicotinamide-letter' })
  cellType('NAD', [...adp.parts, ['nicotinamide', nic]], adp.defs + ring.defs, `<g id="tail">${link}</g>\n` + adp.body + '\n' + ring.body + '\n' + N.body + '\n' + charge.body)
}

// Glucose: the glucose part, a green sugar ring, with its five side groups and the oxygen of the ring.
// (SiliCoDraw draws a yellow hexagon with five short side groups and the ring oxygen lettered "O" at the top. Here the
// ring is the glucose part, in the green of every small molecule; the side groups are short strokes in its outline tone;
// the ring oxygen is a small red ball (the ligand part in the red of oxygen) instead of the letter.)
{
  const g = page(5.3, [0, 4.87]), Rg = 31
  const ring = glucose(g, { x: 0, y: 0, size: 2 * Rg, id: 'glucose' })
  const green = deep(165)
  const stubs = hexagon(0, 0, Rg * 0.93).slice(1).map(([x, y]) => g.line([[x, y], [x * 1.62, y * 1.62]], green.outline, 13)).join('')
  const o = ligand(g, { x: 0, y: -Rg * 0.93, size: 19, pal: deep(OXYGEN), id: 'ring-oxygen' })
  cellType('Glucose', [...ring.parts, ['oxygen', deep(OXYGEN)]], ring.defs + o.defs, `<g id="side-groups">${stubs}</g>\n` + ring.body + '\n' + o.body)
}

check()
console.log('written to', OUT)
