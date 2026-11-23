// Eight icons of SiliCoDraw's "Techniques & assays" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts: a
// xenograft, a biopsy, a blood draw, a wearable sensor, a luciferase reporter, a single cell in a droplet, the
// wound-healing assay and bacterial conjugation. Compositions read by hand from the source in a 100 × 100 box centred on
// 0,0 and scaled onto a 512 page (`page` of ../cellkit.mjs); outlines at 60 %; the gloss of cells on round biological
// bodies of 40 px and more (the tumour, the luciferase, the cell in the droplet, the bacteria).
// Parts used: labMouse, tube, screen, METAL, GLASS, PLASTIC, DARK, GLOW, ACCENT, INK (lab.mjs);
// cell, bacterium, vessel, arrow (tissue.mjs); protein (molecules.mjs); gloss (surfaces.mjs); lettering (letters.mjs).
// Drawn here because no part draws them: the biopsy's piece of tissue, its core needle and the core taken; the forearm;
// the watch's case and straps; rays of light; the droplet and the barcoded gel bead; the well of the wound assay; the
// pilus and the plasmids of conjugation.
// Lettered (strokes): "luc" on the luciferase.
// Usage: node tbN.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss, smoothD } from '../cellkit.mjs'
import { deep, rich, soft, toLch } from '../colour.mjs'
import { f, setStrokeScale, strokeScale } from '../shapes.mjs'
import { ACCENT, DARK, GLASS, GLOW, INK, METAL, PLASTIC, labMouse, screen, tube } from '../parts/lab.mjs'
import { arrow, bacterium, cell, vessel } from '../parts/tissue.mjs'
import { protein } from '../parts/molecules.mjs'
import { gloss, glossTones, pathPoints } from '../parts/surfaces.mjs'
import { lettering } from '../parts/letters.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012: the materials) are left out of the hue check, as the conventions of lab.mjs say.
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p]) => toLch(p.base).c >= 0.012), defs, body)
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts) })
const icon = (name, { defs, body, parts }) => cellType(name, parts.filter(([, p], i) => parts.findIndex(([, q]) => q.base === p.base) === i), defs, body)
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })
const P2 = (p) => p.map(f).join(',')
/** A rounded rectangle given in g's units, as a path on the page. */
const rrect = (g, x0, y0, x1, y1, r) => {
  const [a, b] = g.P([x0, y0]), W = (x1 - x0) * g.k, H = (y1 - y0) * g.k, R = Math.min(r * g.k, W / 2, H / 2)
  return `M${f(a + R)},${f(b)} H${f(a + W - R)} A${f(R)},${f(R)} 0 0 1 ${f(a + W)},${f(b + R)} V${f(b + H - R)} A${f(R)},${f(R)} 0 0 1 ${f(a + W - R)},${f(b + H)} H${f(a + R)} A${f(R)},${f(R)} 0 0 1 ${f(a)},${f(b + H - R)} V${f(b + R)} A${f(R)},${f(R)} 0 0 1 ${f(a + R)},${f(b)} Z`
}
/** Points turned by deg about c (g's units). */
const turnPts = (pts, [cx, cy], deg) => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]) }
const poly = (g, pts) => `M${pts.map((p) => P2(g.P(p))).join(' L')} Z`

/**
 * The gloss of cells on a part's body (STYLE.md, as tbF and tbM): the first path, rect, circle or ellipse filled with a
 * gradient gets the face-on tones of `gloss` over it (shade and shadow only under 90 px), and the part's old highlights
 * (ellipses without an outline) go. The part must be drawn with `glossPal(pal)` and not turned.
 */
const glossPal = (pal) => ({ ...pal, shadow: glossTones(pal).end })
const glossed = (part, pal, px) => {
  if (px < 40) return part
  const body0 = part.body.replace(/<ellipse(?![^>]*stroke=)[^>]*\/>/g, '')
  const m = /<(path|rect|circle|ellipse) ([^>]*?)fill="url\(#[^)]+\)" stroke="[^"]+" stroke-width="([\d.]+)"[^>]*\/>/.exec(body0)
  if (!m) return part
  const a = (k) => +(new RegExp(`(?:^|\\s)${k}="([^"]+)"`).exec(m[2])?.[1] ?? 0)
  // A rect, circle or ellipse is walked round as a polygon, so that `gloss` can read it like a path.
  const round = (cx, cy, rx, ry, hw, hh) => Array.from({ length: 72 }, (_, i) => {
    const t = (i / 72) * 2 * Math.PI, c = Math.cos(t), s = Math.sin(t)
    return [cx + Math.sign(c) * hw + rx * c, cy + Math.sign(s) * hh + ry * s]
  })
  const pts = m[1] === 'circle' ? round(a('cx'), a('cy'), a('r'), a('r'), 0, 0)
    : m[1] === 'ellipse' ? round(a('cx'), a('cy'), a('rx'), a('ry'), 0, 0)
    : m[1] === 'rect' ? (() => { const r = a('rx'), x = a('x'), y = a('y'), W = a('width'), H = a('height'); return round(x + W / 2, y + H / 2, r, r, W / 2 - r, H / 2 - r) })()
    : null
  const d = pts ? `M${pts.map((q) => q.map(f).join(',')).join(' L')} Z` : /d="([^"]+)"/.exec(m[2])[1]
  const G = gloss({ fills: [pathPoints(d)] }, { inset: (+m[3] * strokeScale()) / 2 }), T = glossTones(pal)
  const tones = ['shade', 'shadow', ...(px >= 90 ? ['lit', 'highlight'] : [])].map((k) => (G[k] ? `<path d="${G[k]}" fill="${T[k]}"/>` : '')).join('')
  return { ...part, body: body0.replace(m[0], m[0] + tones) }
}
/** An own glossy body: a closed smooth outline with a gradient, outline and the gloss over it. */
const glossyBlob = (g, id, pts, pal, w) => {
  const gp = glossPal(pal), d = smoothD(pts.map(g.P))
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
  const part = own(id, `<path d="${d}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="${w}"/>`, [[id, pal]], g.grad(`${id}-gradient`, [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], gp))
  return glossed(part, pal, (Math.max(...xs) - Math.min(...xs)) * g.k)
}

// ---------------------------------------------------------------------------------------------------------------------
// Xenograft: a mouse with a tumour grown under the skin of its flank.
// (SiliCoDraw: a grey mouse with a pink tumour on its back; here the lab mouse part, the tumour a lumpy violet-rose mass
// with the gloss of cells, its cells shown as a few darker dots.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.95, [0, 4]), TUMOUR = soft(318)
  const mouse = labMouse(g, { x: 0, y: 10, size: 94, id: 'mouse' })
  const blob = [[-4, -18], [6, -27], [18, -26], [26, -17], [24, -6], [14, -2], [2, -5], [-5, -10]]
  const tumour = glossyBlob(g, 'tumour', blob, TUMOUR, 7)
  const dots = own('tumour-cells', [[6, -17], [14, -21], [16, -11], [8, -8]].map(([x, y]) => g.circle(x, y, 2.1, TUMOUR.small, TUMOUR.outline, 2.5)).join(''))
  icon('Xenograft', join(mouse, tumour, dots))
}

// ---------------------------------------------------------------------------------------------------------------------
// Biopsy: a core needle pushed into a piece of tissue, and the core of tissue it took out lying beside it.
// (SiliCoDraw: the same; here the core is the tissue's own colour, the needle metal with a blue handle.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.85, [0, -1]), w = 7, TISSUE = soft(28)
  const lump = [[-46, 14], [-24, -4], [8, -8], [40, 6], [44, 28], [16, 40], [-22, 40], [-46, 30]]
  const tissue = own('tissue', g.path(smoothD(lump.map(g.P)), 'url(#tissue-gradient)', TISSUE.outline, w) +
    [[[-32, 20], [-24, 15]], [[-18, 31], [-8, 26]], [[22, 26], [30, 21]]].map((p) => g.line(p, TISSUE.small, 4)).join(''), [['tissue', TISSUE]], g.grad('tissue-gradient', [-46, -8, 44, 40], TISSUE))
  const tipP = [8, 12], back = [30, -24], ang = (Math.atan2(back[1] - tipP[1], back[0] - tipP[0]) * 180) / Math.PI
  const along = (pts, at) => turnPts(pts.map(([u, v]) => [at[0] + u, at[1] + v]), at, ang)
  const shaft = g.line([tipP, back], METAL.outline, 18) + g.line([tipP, back], METAL.light, 9) + g.line(along([[4, 0], [30, 0]], tipP), METAL.base, 3)
  const handle = poly(g, along([[0, -7], [18, -7], [18, 7], [0, 7]], back))
  const needle = own('needle', shaft + g.path(handle, 'url(#handle-gradient)', ACCENT.outline, w), [['needle handle', ACCENT]], g.grad('handle-gradient', [30, -42, 42, -24], ACCENT))
  const core = poly(g, turnPts([[-44, -27], [-10, -27], [-10, -18], [-44, -18]], [-27, -22.5], -18))
  const corePart = own('core', g.path(core, 'url(#core-gradient)', TISSUE.outline, w) + g.line(turnPts([[-38, -22.5], [-16, -22.5]], [-27, -22.5], -18), TISSUE.small, 3.5), [], g.grad('core-gradient', [-44, -30, -10, -15], TISSUE))
  icon('Biopsy', join(tissue, needle, corePart))
}

// ---------------------------------------------------------------------------------------------------------------------
// Blood draw: a needle in a vein of the forearm, the blood collection tube on it filling with blood.
// (SiliCoDraw: an arm with a red vein, a needle and a small tube; here the vein is the vessel part, blue as veins look
// through skin, and the tube is the blood tube part with its stopper.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.85, [0, -6]), w = 7, VEIN = soft(255), ARM = soft(60)
  const arm = own('forearm', g.path(rrect(g, -48, -8, 48, 28, 16), 'url(#arm-gradient)', ARM.outline, w), [['skin', ARM]], g.grad('arm-gradient', [-48, -8, 48, 28], ARM))
  const vein = vessel(g, { points: [[-38, 12], [-18, 7], [6, 7], [40, 13]], size: 80, thick: 0.13, pal: VEIN, id: 'vein' })
  const a = [4, 9], b = [22, -15]
  const needle = own('needle', g.line([a, b], METAL.outline, 14) + g.line([a, b], METAL.light, 6.5))
  const blood = tube(g, { x: 32, y: -29, size: 38, kind: 'blood', liquid: 'blood', level: 0.55, turn: 37, capPal: deep(305), id: 'blood-tube' })
  icon('Blood draw', join(arm, vein, needle, blood))
}

// ---------------------------------------------------------------------------------------------------------------------
// Wearable sensor: a smartwatch with its straps, the screen showing a heart-rate trace.
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.95, [0, 0]), w = 7
  const straps = [[-48, -27], [27, 48]].map(([y0, y1]) => g.path(rrect(g, -17, y0, 17, y1, 5), DARK.light, DARK.outline, w)).join('') +
    [-40, -34, 34, 40].map((y) => g.line([[-9, y], [9, y]], DARK.outline, 3)).join('')
  const caseD = g.path(rrect(g, -27, -31, 27, 31, 11), 'url(#case-gradient)', DARK.outline, w) + g.path(rrect(g, 27, -8, 31, 8, 1.5), METAL.base, METAL.outline, 4)
  const face = screen(g, { x: 0, y: 0, size: 42, aspect: 1.15, show: 'trace', ink: GLOW, id: 'display' })
  icon('Wearable sensor', join(own('straps', straps), own('case', caseD, [], g.grad('case-gradient', [-27, -31, 27, 31], METAL)), face))
}

// ---------------------------------------------------------------------------------------------------------------------
// Luciferase reporter: the luciferase enzyme, made from the reporter gene "luc", giving off light.
// (SiliCoDraw: a yellow disc with rays and "luc"; here the disc is the protein part with the gloss of cells.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.8, [0, 0]), LUC = rich(95), RAY = deep(135)
  const enz = glossed(protein(g, { x: 0, y: 0, size: 54, pal: glossPal(LUC), id: 'luciferase' }), LUC, 54 * g.k)
  const rays = Array.from({ length: 8 }, (_, i) => { const t = (i * 45 - 90) * Math.PI / 180; return g.line([[36 * Math.cos(t), 36 * Math.sin(t)], [47 * Math.cos(t), 47 * Math.sin(t)]], RAY.base, 13) }).join('')
  const name = lettering(g, { x: 0, y: 2, h: 11, text: 'luc', colour: LUC.outline, w: (0.2 * 11 * g.k) / strokeScale(), id: 'luc' }).body
  icon('Luciferase reporter', join(own('light', rays, [['light', RAY]]), enz, own('name', name)))
}

// ---------------------------------------------------------------------------------------------------------------------
// Single-cell droplet: one cell and one barcoded gel bead together in a droplet, as droplet single-cell sequencing
// captures them.
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.85, [0, 0]), w = 7, BEAD = soft(58)
  const drop = own('droplet', g.circle(0, 0, 45, 'url(#drop-gradient)', GLASS.outline, w) + g.ellipse(-24, -28, 9, 4, -40, '#FFFFFF'), [], g.grad('drop-gradient', [-45, -45, 45, 45], GLASS))
  const c = cell(g, { x: -13, y: -8, size: 36, pal: glossPal(soft(240)), id: 'cell' })
  const theCell = glossed(c, soft(240), 36 * g.k)
  const bc = [17, 15], R = 11
  const strands = Array.from({ length: 10 }, (_, i) => { const t = (i * 36 * Math.PI) / 180; return g.line([[bc[0] + (R + 1) * Math.cos(t), bc[1] + (R + 1) * Math.sin(t)], [bc[0] + (R + 7) * Math.cos(t), bc[1] + (R + 7) * Math.sin(t)]], BEAD.outline, 8) }).join('')
  const bead = own('barcoded-bead', strands + g.circle(bc[0], bc[1], R, 'url(#bead-gradient)', BEAD.outline, w), [['bead', BEAD]], g.grad('bead-gradient', [bc[0] - R, bc[1] - R, bc[0] + R, bc[1] + R], BEAD))
  icon('Single-cell droplet', join(drop, theCell, bead))
}

// ---------------------------------------------------------------------------------------------------------------------
// Wound-healing assay: a layer of cells in a well with a scratch through the middle, the cells moving in from both sides
// to close it (the arrows).
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.85, [0, 0]), w = 7, CELLS = soft(240)
  const well = own('well', g.path(rrect(g, -47, -35, 47, 35, 4), 'url(#well-gradient)', METAL.outline, w), [], g.grad('well-gradient', [-47, -35, 47, 35], PLASTIC))
  const at = [[-38, -24], [-26, -18], [-38, -6], [-24, -3], [-37, 11], [-25, 13], [-36, 26], [-22, 26], [-16, -26], [-16, 10]]
  const both = [...at, ...at.map(([x, y]) => [-x, -y])]
  const cells = both.map(([x, y], i) => cell(g, { x, y, size: 13, shape: 'lumpy', lumps: 6, seed: i, pal: CELLS, id: `cell-${i + 1}` }))
  const edge = (x) => Array.from({ length: 6 }, (_, i) => g.line([[x, -31 + i * 11.2], [x, -26 + i * 11.2]], INK, 3.5)).join('')
  const arrows = [arrow(g, { points: [[-8, 0], [-1, 0]], colour: INK, w: 12, id: 'closing-left' }), arrow(g, { points: [[8, 0], [1, 0]], colour: INK, w: 12, id: 'closing-right' })]
  icon('Wound-healing assay', join(well, ...cells, own('scratch-edges', edge(-9) + edge(9)), ...arrows))
}

// ---------------------------------------------------------------------------------------------------------------------
// Bacterial conjugation: a donor bacterium joined to a recipient by its pilus, passing a copy of its plasmid across.
// (SiliCoDraw: two green rods, a curved pilus and two orange rings, the second dashed; here the copy is drawn whole, a
// single strand of it on its way through the pilus.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.85, [0, 0]), BAC = soft(137), PLASMID = deep(55)
  const donor = glossed(bacterium(g, { x: -24, y: -15, size: 48, flagellum: false, granules: false, aspect: 0.5, pal: glossPal(BAC), id: 'donor' }), BAC, 48 * g.k)
  const recip = glossed(bacterium(g, { x: 24, y: 17, size: 48, flagellum: false, granules: false, aspect: 0.5, pal: glossPal(BAC), id: 'recipient' }), BAC, 48 * g.k)
  const pilusPts = Array.from({ length: 13 }, (_, i) => { const t = i / 12; return [-4 + 8 * t + 10 * Math.sin(Math.PI * t) * (0.5 - t) * 2, -15 + 32 * t] })
  const pilus = own('pilus', g.line(pilusPts, BAC.outline, 18) + g.line(pilusPts, BAC.light, 9))
  const ring = (x, y, r) => g.circle(x, y, r, 'none', PLASMID.outline, 11) + g.circle(x, y, r, 'none', PLASMID.base, 5)
  const strand = g.line(pilusPts.slice(2, 10), PLASMID.base, 5)
  const plasmids = own('plasmids', ring(-30, -15, 7) + ring(28, 17, 7) + strand, [['plasmid', PLASMID]])
  icon('Bacterial conjugation', join(pilus, donor, recip, plasmids))
}

check()
console.log('written to', OUT)
