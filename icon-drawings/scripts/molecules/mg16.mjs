// Eight icons of SiliCoDraw's "Molecules & genetics" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts in ../parts/:
// inverse agonist, allosteric modulator, desensitisation, receptor internalisation, biased agonist, phosphatase, adaptor
// protein and mTORC1. Their compositions are read by hand from the source (a 100 × 100 box centred on 0,0) and set on a
// 512 page.
// The five receptor icons share one scene with Agonist, Antagonist and Partial agonist (mg15): the part
// `receptorInMembrane` of ../parts/complexes.mjs (the two-chain receptor in a horizontal membrane across the middle,
// outside at the top, the ligand in its cup and the response a burst of cerulean signal dots below, or the two pathways
// of a biased agonist). They differ in the ligand's colour and in what happens inside the cell. Parts used: the receptor
// scene and the mTOR complex (complexes.mjs); the receptor (membranes.mjs); ligand, phosphate, enzyme, protein
// (molecules.mjs); endosome, lysosome (organelles.mjs); arrows, cross (tissue.mjs).
// Drawn here, because no part draws them: arrestin (`arrestin`) and the adaptor protein's chain of domains (`domains`). Lettered: the "P" of every phosphate (the phosphate part does it). Left out: the
// words of the originals ("basal", "PAM", "↑↑", "↓ response", "endosome", "G protein", "arrestin", "SH2", "SH3", "PTB").
// Usage: node mg16.mjs <folder>
import { mkdirSync } from 'node:fs'
import { BLUE, cellTypes, page, smoothD } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex, toLch } from '../colour.mjs'
import { f, gradient2 } from '../shapes.mjs'
import { enzyme, ligand, phosphate, protein } from '../parts/molecules.mjs'
import { receptor } from '../parts/membranes.mjs'
import { lysosome, vesicle } from '../parts/organelles.mjs'
import { arrow, cross } from '../parts/tissue.mjs'
import { mtorComplex, receptorInMembrane, RESPONSE } from '../parts/complexes.mjs'

const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012) are left out of the hue check: BioSketch never recolours them with a part.
// Copies of one part (two phosphates) are one part: they share a palette and recolour together.
const icon = (name, ...ps) => { const { defs, body, hues } = ps.length > 1 ? join(...ps) : ps[0]; kit.cellType(name, hues.filter(([, p]) => toLch(p.base).c >= 0.012).filter(([n, p], i, a) => a.findIndex(([m, q]) => m === n && q.base === p.base) === i), defs, body) }
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), hues: ps.flatMap((p) => p.parts ?? p.hues) })

// Hues (OKLCH degrees). Receptor blue 267 (the parts' membrane protein), lipids peach 52, ligand green 165.
const GREEN = hueOf('#5fae8b'), YELLOW = hueOf('#fde68a'), ADAPTOR = hueOf('#8a5aa8')
const INVERSE = deep(350) // inverse agonist: rose, 83° from the receptor, 62° from the lipids, 145° from the dots
const MODULATOR = deep(320) // allosteric modulator: the violet of Allostery (mg15); SiliCoDraw's orange lies on the lipids
const ARRESTIN = soft(330) // arrestin: rose-violet, 63° from the receptor and 82° from the lipids
const ENDOSOME = soft(212) // the vesicle part's aqua (200) is 35° from the green ligand inside it
// Arrows and marks in a true grey (chroma below 0.012): the part's INK lies within 36° of the receptor's blue.
const GREY = toHex({ l: 0.5, c: 0.008, h: 255 })

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const lineFor = (px) => f(clamp(2.5 + px * 0.03, 3.5, 10))
const disc = (g, [x, y], r, fill, stroke = '', w = 0) => `<circle cx="${f(g.X(x))}" cy="${f(g.Y(y))}" r="${f(r * g.k)}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${f(w)}"` : ''}/>`
const shine = (g, [x, y], rx, ry, rot, fill) => `<ellipse cx="${f(g.X(x))}" cy="${f(g.Y(y))}" rx="${f(rx * g.k)}" ry="${f(ry * g.k)}" transform="rotate(${rot} ${f(g.X(x))} ${f(g.Y(y))})" fill="${fill}"/>`
/** An ellipse as a path (g's units). */
const ellD = (g, x, y, rx, ry) => { const [cx, cy] = g.P([x, y]), a = rx * g.k, b = ry * g.k; return `M${f(cx - a)},${f(cy)} A${f(a)},${f(b)} 0 1 0 ${f(cx + a)},${f(cy)} A${f(a)},${f(b)} 0 1 0 ${f(cx - a)},${f(cy)} Z` }

// =====================================================================================================================
// Drawings of this batch (no part draws them)
// =====================================================================================================================

/**
 * Arrestin: the elongated protein that caps a phosphorylated receptor from inside the cell, two lobes (its N and C
 * domains) side by side with a waist between them, the concave side up (towards the receptor). `size` is its width.
 * arrestin(g, { x: -8, y: 31, size: 34, turn: 0 })
 */
export function arrestin(g, { x, y, size, turn = 0, id = 'arrestin', w, pal = ARRESTIN }) {
  const s = size / 100, P = ([u, v]) => { const a = (turn * Math.PI) / 180; return g.P([x + s * (u * Math.cos(a) - v * Math.sin(a)), y + s * (u * Math.sin(a) + v * Math.cos(a))]) }
  const W = w ?? lineFor(size * g.k)
  const pts = [[-50, -5], [-44, -19], [-28, -24], [-12, -20], [0, -17], [12, -20], [28, -24], [44, -19], [50, -5], [44, 12], [26, 20], [10, 17], [0, 15], [-10, 17], [-26, 20], [-44, 12]]
  const [x0, y0] = P([-50, -25]), [x1, y1] = P([50, 21])
  const seam = `<path d="M${P([0, -10]).map(f).join(',')} L${P([0, 8]).map(f).join(',')}" fill="none" stroke="${pal.outline}" stroke-width="${f(W * 0.6)}" stroke-linecap="round"/>`
  const [hx, hy] = P([-32, -14])
  return {
    defs: gradient2(`${id}-gradient`, [Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1)], pal.base, pal.shadow),
    body: `<g id="${id}"><path d="${smoothD(pts.map(P))}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="${W}" stroke-linejoin="round"/>${seam}` +
      (size * g.k >= 140 ? `<ellipse cx="${f(hx)}" cy="${f(hy)}" rx="${f(9 * s * g.k)}" ry="${f(3.2 * s * g.k)}" transform="rotate(${f(-12 + turn)} ${f(hx)} ${f(hy)})" fill="${pal.light}"/>` : '') + '</g>',
    parts: [['arrestin', pal]],
  }
}

/**
 * An adaptor protein: a chain of round binding domains joined by short linkers, one outline round them all (a modular
 * protein such as Grb2 or Shc). `xs` the domains' middles along y, `r` their radius (g's units).
 */
export function domains(g, { xs, y, r, id = 'adaptor', pal = soft(ADAPTOR), w }) {
  const W = w ?? lineFor(2 * r * g.k * 1.6)
  const items = [{ d: `M${g.P([xs[0], y]).map(f).join(',')} L${g.P([xs.at(-1), y]).map(f).join(',')}`, width: f(r * 0.7 * g.k) }, ...xs.map((x) => ellD(g, x, y, r * 1.04, r * 0.92))]
  return {
    defs: g.grad(`${id}-gradient`, [xs[0] - r, y - r, xs.at(-1) + r, y + r], pal),
    body: `<g id="${id}">${g.union(items, `url(#${id}-gradient)`, pal.outline, W)}${xs.map((x) => shine(g, [x - r * 0.42, y - r * 0.42], r * 0.36, r * 0.13, -35, pal.light)).join('')}</g>`,
    parts: [['adaptor protein', pal]],
  }
}


/** The receptor scene of the pharmacology icons: the part `receptorInMembrane` (../parts/complexes.mjs) on the page all six
 * icons share with mg15 (page(4.6, [0, 7]), membrane 100 long at y = 0, outside up). */
const receptorScene = (o = {}) => { const g = page(4.6, [0, 7]); return { g, ...receptorInMembrane(g, { x: 0, y: 0, size: 100, ...o }) } }

// =====================================================================================================================

// Inverse agonist: a rose ligand seated deep in the receptor's cup, and under the receptor a single signal dot struck
// through: the receptor's basal (constitutive) signalling is switched off, below what the empty receptor gives (an
// antagonist leaves the space empty).
// (SiliCoDraw draws a purple triangle, a dashed "basal" line and an arrow rising from below it; here the response is the
// scene's signal dot crossed out in grey, and the words are left out. Rose (350°) instead of purple: violet is the
// allosteric modulator's colour in Allostery and here, and red the antagonist's.)
{
  const s = receptorScene({ bound: true, ligandPal: INVERSE, response: 'none' }), g = s.g
  const dot = { defs: '', body: `<g id="basal-signal">${disc(g, [0, s.below + 14], 5, RESPONSE.small)}</g>`, parts: [['signal', RESPONSE]] }
  const x = cross(g, { x: 0, y: s.below + 14, size: 17, colour: GREY, w: 12 })
  icon('Inverse agonist', { defs: s.defs, body: s.body, hues: s.parts }, dot, x)
}

// Allosteric modulator: the green agonist in the receptor's cup and a small violet modulator at a second site on the outer
// side of the cup; the response is a larger burst than an agonist's alone (a positive allosteric modulator).
// (SiliCoDraw's modulator is an orange rhombus with an arrow and the words "PAM" and "↑↑": the arrow and words are left
// out, the wider burst of five rows says it. Violet (320°), the modulator of Allostery, since orange is the lipids' hue.)
{
  const s = receptorScene({ bound: true, response: 5, spread: 90 }), g = s.g
  const mod = ligand(g, { x: 19.5, y: -23, size: 10.5, id: 'allosteric-modulator', pal: MODULATOR })
  icon('Allosteric modulator', { defs: s.defs, body: s.body, hues: s.parts }, mod)
}

// Desensitisation: the receptor, still holding its agonist, phosphorylated on both its tails inside the cell, and capped
// from inside by arrestin, which takes the place of the G protein: no signal leaves.
// (SiliCoDraw fades the receptor and writes "P" in yellow circles and "↓ response"; here the phosphates are the set's
// lettered mustard dots, the arrestin is drawn, and the missing burst of dots says that the response is gone.)
{
  const s = receptorScene({ bound: true, response: 'none' }), g = s.g
  const ar = arrestin(g, { x: 0, y: s.below + 12.5, size: 42 })
  const ps = [[-1, 'phosphate-1'], [1, 'phosphate-2']].map(([k, id]) => phosphate(g, { x: k * 14.5, y: s.below - 3, size: 10.5, id }))
  icon('Desensitisation', { defs: s.defs, body: s.body, hues: s.parts }, ar, ...ps)
}

// Receptor internalisation: the receptor with its ligand in the membrane above, an arrow down into the cell, and the
// receptor again in the membrane of an endosome, its ligand-binding side now facing the endosome's lumen.
// (SiliCoDraw draws a dashed arrow to a white circle holding a small receptor; here the endosome is the organelle part,
// and the receptor part sits in its membrane the right way round. The word "endosome" is left out.)
{
  const s = receptorScene({ bound: true, response: 'none' }), g = s.g
  // The endosome below and to the right, its tubule to the upper right; the receptor in its membrane on the left, turned
  // so that its outer side (and the ligand) faces the lumen (a point at angle th of the membrane takes the turn th - 90).
  const size = 48, x = 24, r = (37 * size) / 102 - 0.6, c = [x - (12.5 * size) / 102, 37.5], th = 200, rad = (th * Math.PI) / 180
  const at = [c[0] + r * Math.cos(rad), c[1] + r * Math.sin(rad)]
  const en = vesicle(g, { x, y: c[1], size, kind: 'endosome', pal: ENDOSOME, id: 'endosome' })
  const inner = receptor(g, { x: at[0], y: at[1], thick: 13, turn: th - 90, id: 'internalised-receptor' })
  const q = (t) => [-15 * (1 - t) ** 2 - 2 * 18 * t * (1 - t) - 2 * t * t, 24 * (1 - t) ** 2 + 2 * 42 * t * (1 - t) + 43 * t * t] // a bow to the left
  const a = arrow(g, { points: Array.from({ length: 21 }, (_, i) => q(i / 20)), corners: true, w: 10, colour: GREY, id: 'endocytosis' })
  icon('Receptor internalisation', { defs: s.defs, body: s.body, hues: s.parts }, a, en, inner)
}

// Biased agonist: the agonist in the receptor's cup and two pathways leaving the receptor inside the cell, of which only
// one carries a signal (the G protein's, a burst of dots); the other (arrestin's) is a pale arrow with nothing at its end.
// (SiliCoDraw's labels "G protein" and "arrestin" are left out; its dashed grey arrow is a pale grey one. The ligand is
// the agonist's green: a biased agonist is an agonist, told apart by the one pathway it drives.)
{
  const s = receptorScene({ bound: true, response: 'biased' })
  icon('Biased agonist', { defs: s.defs, body: s.body, hues: s.parts })
}

// Phosphatase: an enzyme taking a phosphate off: the enzyme (its pocket towards the upper right) and the phosphate leaving
// it, with an arrow.
// (SiliCoDraw draws a pale green blob with a dark active site; here it is the enzyme part, in SiliCoDraw's green, since the
// parts' amber lies 17° from the mustard phosphate. The phosphate is lettered "P" by its part.)
{
  const g = page(5.05, [1.5, -0.5])
  const en = enzyme(g, { x: -9, y: 6, size: 70, turn: -38, id: 'phosphatase', pal: soft(GREEN) })
  const a = arrow(g, { points: [[17, -14], [28, -25]], corners: true, w: 11, colour: GREY, id: 'release-arrow' })
  const ph = phosphate(g, { x: 35.5, y: -32.5, size: 18 })
  icon('Phosphatase', join(en, a, ph))
}

// Adaptor protein: a chain of three binding domains (SH2, SH3, PTB in SiliCoDraw's labels) with a partner protein bound to
// each, two above and one below, bringing them together.
// (The domains are drawn here in SiliCoDraw's purple; the partners are the protein part in its green, blue and yellow,
// touching their domain instead of hanging from it on a line. The domain names are left out.)
{
  const g = page(5.55, [0, 0.5])
  const ad = domains(g, { xs: [-26, 0, 26], y: 0, r: 11.5 })
  const partners = [[-27, -25, GREEN, 'partner-1', 10], [27, -25, BLUE, 'partner-2', -20], [0, 25, YELLOW, 'partner-3', 40]].map(([x, y, h, id, turn]) => protein(g, { x, y, size: 27, id, turn, pal: h === YELLOW ? rich(h) : soft(h) }))
  icon('Adaptor protein', join(...partners, ad))
}

// mTORC1: the mTOR complex on the surface of a lysosome, held there by Rheb, and phosphorylating its targets (an arrow to a
// phosphate).
// (SiliCoDraw draws a flat ellipse for the lysosome: here it is the lysosome part, whole. The complex is the mTOR complex
// part in SiliCoDraw's blue; Rheb is green (SiliCoDraw's pale blue would join the complex); the phosphate is the lettered part.)
{
  const g = page(4.75, [0, 1])
  const ly = lysosome(g, { x: 0, y: 30.5, size: 40, id: 'lysosome' })
  const rheb = [-1, 1].map((k) => protein(g, { x: k * 11.5, y: 9, size: 11, id: `Rheb-${k < 0 ? 1 : 2}`, turn: k * 30, pal: soft(GREEN) }))
  const mt = mtorComplex(g, { x: 0, y: -10 - (8 * 56) / 60, size: 1.5 * 56 })
  const a = arrow(g, { points: [[25, -27], [33.5, -36]], corners: true, w: 11, colour: GREY, id: 'phosphorylation-arrow' })
  const ph = phosphate(g, { x: 40, y: -42, size: 13 })
  const all = join(ly, ...rheb, mt, a, ph)
  icon('mTORC1', { ...all, hues: [...ly.parts, ['Rheb', soft(GREEN)], ...mt.parts, ...a.parts, ...ph.parts] })
}

check()
console.log('written to', OUT)
