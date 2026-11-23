// Eight icons of SiliCoDraw's "Techniques & assays" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David
// Carlsson; see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts:
// imaging of living things and of structures: a PET scan, in vivo (bioluminescence) imaging, fMRI activation, an OCT
// scan, photoacoustic imaging, intravital imaging, tissue clearing and X-ray crystallography.
// Parts used: imageField, heatSpot, mouseTop (assays.mjs); brain, brainPal (complexes.mjs); labMouse, beam, glassware,
// DARK, METAL, GLASS, PAPER, ACCENT, objW (lab.mjs); vesselSection, arrow (tissue.mjs).
// Drawn here because no part draws them: the dark ground of a scan without cells (the image field's ground, empty); the
// layers of the retina in an OCT B-scan; a block of skin and an ultrasound transducer; a microscope objective and the
// glass window of an imaging chamber; a protein crystal and the diffraction pattern on a detector.
// Letters: none (SiliCoDraw's "US", "hν" and "retina, ~5 µm" are left out: ν is not among the glyphs and the rest are
// words; the transducer and the beam say it).
// The current look: outlines at 60 % (setStrokeScale), the gloss on (setGloss). Nothing here is glossed: scans, images and
// the crystal are pictures or objects, the brain is an organ drawn flat (as in Molecules & genetics). Lines that are the
// drawing itself (beams, sound waves, folds, letters) keep their width.
// Usage: node tbJ.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss } from '../cellkit.mjs'
import { deep, rich, soft, toHex, toLch } from '../colour.mjs'
import { catmull, f, setStrokeScale } from '../shapes.mjs'
import { GFP } from '../parts/cellforms.mjs'
import { FIELD, HEAT, heatSpot, imageField, mixHex, mouseTop } from '../parts/assays.mjs'
import { brain, brainPal } from '../parts/complexes.mjs'
import { ACCENT, BEAMS, DARK, GLASS, INK, METAL, PAPER, beam, glassware, labMouse, objW } from '../parts/lab.mjs'
import { arrow, vesselSection } from '../parts/tissue.mjs'
import { PEACH } from '../cellkit.mjs'

const OUT = process.argv[2]
const SCALE = 0.6
setStrokeScale(SCALE)
setGloss(true)
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT)
// Greys (chroma below 0.012: paper, ink, materials, the dark ground of scans) are left out of the hue check, as the
// conventions of lab.mjs say; a palette used twice is one part that recolours as one, so it is listed once.
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base) === i), defs, body)
/** A line on its own (fill none) is the drawing itself and keeps its width: svg() multiplies it by SCALE again. */
const keepLines = (body) => body.replace(/<path [^>]*fill="none"[^>]*>/g, (el) => el.replace(/stroke-width="([\d.]+)"/, (_, v) => `stroke-width="${f(v / SCALE)}"`))
const icon = (name, ...ps) => cellType(name, ps.flatMap((p) => p.parts ?? []), ps.map((p) => p.defs ?? '').join(''), keepLines(ps.map((p) => p.body).join('\n')))
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })
const P2 = (g, p) => g.P(p).map(f).join(',')
const L = (g, pts) => `M${pts.map((p) => P2(g, p)).join(' L')}`
const rrect = (g, x0, y0, x1, y1, r) => `M${P2(g, [x0 + r, y0])} L${P2(g, [x1 - r, y0])} Q${P2(g, [x1, y0])} ${P2(g, [x1, y0 + r])} L${P2(g, [x1, y1 - r])} Q${P2(g, [x1, y1])} ${P2(g, [x1 - r, y1])} L${P2(g, [x0 + r, y1])} Q${P2(g, [x0, y1])} ${P2(g, [x0, y1 - r])} L${P2(g, [x0, y0 + r])} Q${P2(g, [x0, y0])} ${P2(g, [x0 + r, y0])}Z`
/** The dark ground of a scan: the image field part without content (its ground only, a picture: flat). */
const ground = (g, opts) => { const r = imageField(g, { content: 'nuclei', count: 0, ...opts }); return { ...r, parts: [] } }
const K = 4.55

// ---------------------------------------------------------------------------------------------------------------------
// PET scan: a brain on the dark screen of a scan with two hot spots where the tracer (FDG) is taken up.
// (SiliCoDraw: a blue brain with see-through spots on a dark panel. The brain is the brain part in a cool grey-blue, the
// spots the flat hot spot part, red through orange to yellow.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K, [0, 0])
  const scr = ground(g, { x: 0, y: 0, size: 100, shape: 'rect', aspect: 0.84, id: 'scan' })
  const b = brain(g, { x: 0, y: 1, size: 70, pal: brainPal(255), id: 'brain' })
  const s1 = heatSpot(g, { x: -12, y: -12, size: 25, id: 'uptake1' }), s2 = heatSpot(g, { x: 15, y: -5, size: 15, steps: 2, id: 'uptake2' })
  icon('PET scan', scr, b, s1, s2)
}

// ---------------------------------------------------------------------------------------------------------------------
// In vivo imaging (bioluminescence, IVIS): a mouse lying on its front in the dark imaging chamber, a tumour glowing on its
// flank where luciferase makes light.
// (SiliCoDraw: a grey side-view mouse. Here the mouse lies flat, seen from above as the camera sees it, with lab's white
// fur; the signal is the hot spot part over the flank, in its orange and yellow steps only.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K, [0, 0])
  const scr = ground(g, { x: 0, y: 0, size: 100, shape: 'rect', aspect: 0.84, id: 'chamber' })
  const m = mouseTop(g, { x: -3, y: 1, size: 96, turn: 90, id: 'mouse' })
  // orange to yellow only: the red outer ring would lie 18° from the pink of the mouse's ears and tail
  const s = heatSpot(g, { x: 6, y: -4, size: 28, steps: 2, pal: [HEAT[1], HEAT[2]], id: 'signal' })
  icon('In vivo imaging', scr, m, s)
}

// ---------------------------------------------------------------------------------------------------------------------
// fMRI activation: a grey brain (the anatomical scan) on the dark screen, with two areas lit where the BOLD signal rises.
// (SiliCoDraw: a grey brain outline with amber spots. The spots are the hot spot part in two steps, orange and yellow.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K, [0, 0])
  const scr = ground(g, { x: 0, y: 0, size: 100, shape: 'rect', aspect: 0.92, id: 'scan' })
  const grey = { light: toHex({ l: 0.97, c: 0.004, h: 250 }), base: toHex({ l: 0.88, c: 0.006, h: 250 }), shadow: toHex({ l: 0.82, c: 0.008, h: 250 }), small: toHex({ l: 0.66, c: 0.01, h: 250 }), outline: toHex({ l: 0.5, c: 0.011, h: 250 }) }
  const b = brain(g, { x: 0, y: 1, size: 76, pal: grey, id: 'brain' })
  const hot = [HEAT[1], HEAT[2]]
  const s1 = heatSpot(g, { x: -13, y: -12, size: 18, steps: 2, pal: hot, id: 'activation1' }), s2 = heatSpot(g, { x: 14, y: -15, size: 13, steps: 2, pal: hot, id: 'activation2' })
  icon('fMRI activation', scr, b, s1, s2)
}

// ---------------------------------------------------------------------------------------------------------------------
// OCT scan: a B-scan of the retina, its layers as bright and dark bands across the dark image, dipping at the fovea.
// (SiliCoDraw: three see-through bands in amber and orange. Here three flat bands in the colours of the hot spot (false
// colour, as OCT machines show it): the nerve fibre layer yellow at the top, the photoreceptors orange and the retinal
// pigment epithelium red at the bottom, all following the foveal pit; the caption is left out.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K, [0, 0])
  const scr = ground(g, { x: 0, y: 0, size: 100, shape: 'rect', aspect: 0.8, id: 'b-scan' })
  const X0 = -46, X1 = 46
  const course = (y0, dip, wid) => Array.from({ length: 47 }, (_, i) => { const x = X0 + ((X1 - X0) * i) / 46; return [x, 1.35 * (y0 + 2.2 * Math.sin(x / 13) - dip * Math.exp(-((x / wid) ** 2)))] })
  const band = (top, bot, pal) => { const a = top, b = [...bot].reverse(); return g.path(`M${catmull(a, 4).map((p) => P2(g, p)).join(' L')} L${catmull(b, 4).map((p) => P2(g, p)).join(' L')}Z`, pal.small) }
  // the retina dips towards the fovea; the inner layers thin out there, the outer ones keep their place
  const nfl = band(course(-14, -9, 9), course(-6, -3, 9), HEAT[2])
  const pr = band(course(4, -1.5, 12), course(10, -1.5, 12), HEAT[1])
  const rpe = band(course(13, -1, 14), course(19, -1, 14), HEAT[0])
  const inner = band(course(-6, -3, 9), course(4, -1.5, 12), { small: mixHex(FIELD.dark.base, HEAT[1].small, 0.32) })
  icon('OCT scan', scr, own('layers', inner + nfl + pr + rpe, [['nerve fibre layer', HEAT[2]], ['photoreceptors', HEAT[1]], ['pigment epithelium', HEAT[0]]]))
}

// ---------------------------------------------------------------------------------------------------------------------
// Photoacoustic imaging: a laser pulse shines into the skin and is absorbed by a blood vessel, which sends out
// ultrasound waves to a transducer on the skin.
// (SiliCoDraw: red laser lines, a red dot and blue arcs in a peach block, with "US" and "hν". Here the skin is a block of
// tissue, the absorber the blood vessel section part, the pulse the green laser beam of lab.mjs (pulsed 532 nm lasers are
// usual; the red of a blood vessel and a red beam would recolour as one), the waves accent-blue arcs running to an
// ultrasound transducer: a dark probe with an accent band, as instruments have.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.9, [0, -1.5]), w = objW(92 * g.k), fine = Math.max(1.5, w * 0.5)
  const SKIN = soft(62) // a peach a little yellower than the epithelia's (52°), 36° or more from the rose of the vessel
  const skin = own('skin', g.path(rrect(g, -46, -4, 46, 44, 4), `url(#skin-gradient)`, SKIN.outline, w) + g.line([[-46, 3], [46, 3]], SKIN.outline, f(fine)), [['skin', SKIN]], g.grad('skin-gradient', [-46, -4, 46, 44], SKIN))
  const ves = vesselSection(g, { x: -4, y: 24, size: 17, cells: 0, id: 'vessel' })
  const ray = (a, b, id) => beam(g, { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, size: Math.hypot(b[0] - a[0], b[1] - a[1]), turn: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI, colour: 'green', kind: 'line', width: 3.4 * g.k, id })
  const b1 = ray([-38, -40], [-11, 18], 'laser1'), b2 = ray([-28, -43], [-6, 15], 'laser2')
  // three arcs of sound up to the right, centred on the vessel
  const arcs = [14, 22, 30].map((r) => { const a0 = -80, a1 = -10; const pts = Array.from({ length: 13 }, (_, i) => { const t = ((a0 + ((a1 - a0) * i) / 12) * Math.PI) / 180; return [-4 + r * Math.cos(t), 24 + r * Math.sin(t)] }); return `<path d="${L(g, pts)}" fill="none" stroke="${ACCENT.outline}" stroke-width="${f(1.1 * w)}" stroke-linecap="round" stroke-linejoin="round"/>` }).join('')
  // the transducer: a dark probe standing on the skin at the upper right, its face against the skin
  const probe = g.path(rrect(g, 20, -36, 38, -4, 3), DARK.base, DARK.outline, w) + g.path(rrect(g, 20, -26, 38, -21, 0.01), ACCENT.base, ACCENT.outline, fine) + g.path(rrect(g, 18, -7.5, 40, -3, 1.5), METAL.base, METAL.outline, fine) + g.line([[29, -36], [29, -46]], DARK.base, f(3.4 * g.k))
  icon('Photoacoustic', skin, ves, own('sound', arcs, [['ultrasound', ACCENT]]), b1, b2, own('transducer', probe, [['band', ACCENT]]))
}

// ---------------------------------------------------------------------------------------------------------------------
// Intravital imaging: a mouse with a glass imaging window in its back, through which a microscope objective above looks
// at living fluorescent cells.
// (SiliCoDraw: a grey mouse, a pale blue window and a blue objective. Here the mouse is lab's white lab mouse, the window a
// glass ring with a small fluorescence image of green (GFP) cells inside (the image field part; GFP, not DAPI blue, which
// would recolour with the accent), the objective a metal barrel with an
// accent band narrowing to its front lens.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.45, [0, -3.5])
  const m = labMouse(g, { x: 0, y: 18, size: 98, id: 'mouse' })
  const wx = 3, wy = 2, R = 13.5, w = objW(2 * R * g.k)
  const ring = own('window', g.circle(wx, wy, R, GLASS.base, GLASS.outline, w))
  const view = imageField(g, { x: wx, y: wy, size: 2 * R - 4, content: 'nuclei', count: 5, seed: 3, nucPal: GFP, id: 'cells' })
  const ow = objW(30 * g.k)
  const obj = g.path(`M${P2(g, [wx - 9, -46])} L${P2(g, [wx + 9, -46])} L${P2(g, [wx + 9, -27])} L${P2(g, [wx + 4.5, -18])} L${P2(g, [wx - 4.5, -18])} L${P2(g, [wx - 9, -27])}Z`, 'url(#objective-gradient)', METAL.outline, ow) +
    g.path(rrect(g, wx - 9, -38, wx + 9, -33, 0.01), ACCENT.base, ACCENT.outline, ow * 0.6) + g.path(rrect(g, wx - 4.5, -19.5, wx + 4.5, -16.5, 1), GLASS.shadow, GLASS.outline, ow * 0.6)
  icon('Intravital imaging', m, ring, view, own('objective', obj, [['band', ACCENT]], g.grad('objective-gradient', [wx - 9, -46, wx + 9, -18], METAL)))
}

// ---------------------------------------------------------------------------------------------------------------------
// Tissue clearing: an opaque brain, and after clearing (an arrow) the same brain made transparent in a beaker of
// clearing solution, its outline and folds faint.
// (SiliCoDraw: a pink brain and a see-through blue one in a dashed box. See-through is drawn here without opacity: the
// cleared brain is the brain part in pale glass greys, set in the beaker part with clear liquid.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.9, [-2.5, 0])
  const b1 = brain(g, { x: -28, y: 0, size: 42, id: 'brain' })
  const go = arrow(g, { x: -1, y: 0, size: 12, colour: INK, id: 'clearing' })
  const cup = glassware(g, { x: 26, y: 1, size: 50, kind: 'beaker', liquid: { ...GLASS, small: toHex({ l: 0.95, c: 0.01, h: 225 }), outline: toHex({ l: 0.75, c: 0.011, h: 225 }) }, level: 0.75, id: 'beaker' })
  const clear = { light: '#FFFFFF', base: toHex({ l: 0.985, c: 0.006, h: 225 }), shadow: toHex({ l: 0.95, c: 0.008, h: 225 }), small: toHex({ l: 0.85, c: 0.01, h: 225 }), outline: toHex({ l: 0.74, c: 0.011, h: 225 }) }
  const b2 = brain(g, { x: 26, y: 7, size: 30, pal: clear, id: 'cleared-brain' })
  icon('Tissue clearing', b1, go, cup, b2)
}

// ---------------------------------------------------------------------------------------------------------------------
// X-ray crystallography: an X-ray beam passes through a protein crystal and is diffracted onto a detector, where the
// pattern of spots is recorded.
// (SiliCoDraw: a pale hexagonal crystal, an arrow and a dark detector with white spots spiralling out. Here the crystal is
// a faceted prism in a soft blue with its lit, mid and shaded faces; the beam is an ink arrow (X-rays have no colour); the
// spots lie on rings about the centre, stronger near it, with a beam stop at the centre, as on a real detector image.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K, [0, 0]), w = objW(40 * g.k), fine = Math.max(1.5, w * 0.5)
  const XT = soft(215)
  // the crystal: a hexagonal prism lying on its side, three faces seen
  const cx = -28, cy = -1, q = 1.4, Q = (pts) => pts.map(([a, b]) => [cx + a * q, cy + b * q])
  const top = Q([[-13, -9], [-4, -16], [11, -13], [2, -6]])
  const front = Q([[-13, -9], [2, -6], [2, 12], [-13, 9]])
  const side = Q([[2, -6], [11, -13], [11, 5], [2, 12]])
  const crystal = g.path(L(g, top) + 'Z', XT.light, XT.outline, fine) + g.path(L(g, front) + 'Z', XT.base, XT.outline, fine) + g.path(L(g, side) + 'Z', XT.small, XT.outline, fine) +
    g.path(L(g, Q([[-13, -9], [-4, -16], [11, -13], [11, 5], [2, 12], [-13, 9]])) + 'Z', 'none', XT.outline, w)
  const incoming = arrow(g, { points: [[-49, cy - 1], [cx - 13 * q - 1, cy - 1]], colour: INK, w: 4.4, end: 'none', id: 'x-ray-beam' })
  const out = arrow(g, { points: [[cx + 11 * q + 1, cy - 1], [8, cy - 1]], colour: INK, w: 4.4, head: 15, id: 'diffracted-beam' })
  // the detector: a dark panel with the pattern
  const dx = 29, dy = -1, DW = 19, DH = 40
  const det = own('detector', g.path(rrect(g, dx - DW, dy - DH, dx + DW, dy + DH, 3), DARK.base, DARK.outline, objW(80 * g.k)))
  let spots = ''
  const rings = [[7, 6, 2.1], [13, 10, 1.7], [19, 14, 1.4], [26, 18, 1.15], [33, 22, 1]]
  rings.forEach(([r, n, s], k) => { for (let i = 0; i < n; i++) { const t = ((i + (k % 2) * 0.5) / n) * Math.PI * 2 + k * 0.3, x = dx + r * 0.62 * Math.cos(t), y = dy + r * Math.sin(t); if (Math.abs(x - dx) < DW - 2.5 && Math.abs(y - dy) < DH - 2.5) spots += g.circle(x, y, s, k < 2 ? PAPER.light : mixHex(DARK.base, PAPER.light, 0.75 - k * 0.08)) } })
  spots += g.circle(dx, dy, 2.6, DARK.shadow, DARK.light, fine)
  icon('X-ray crystallography', incoming, own('crystal', crystal, [['crystal', XT]]), out, det, own('pattern', spots))
}

kit.check()
console.log('written', OUT)
