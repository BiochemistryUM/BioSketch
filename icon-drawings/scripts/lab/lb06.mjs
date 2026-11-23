// Eight icons of SiliCoDraw's "Lab & equipment" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared lab parts in
// ../parts/lab.mjs and their conventions of objects (glass, plastic and metal are greys; caps and instrument bands in the
// one accent blue): an atomic force microscope, an NMR spectrometer, a microtome, a microfluidic chip, a 3D bioprinter,
// a plate reader, a sequencer and a tip box. Their compositions are read by hand from the source in a 100 × 100 box
// centred on 0,0 and scaled onto a 512 page (`page` of ../cellkit.mjs).
// Parts used: beam, tube, screen, instrument, wellPlate, syringe, tip (lab.mjs); lettering (letters.mjs).
// Drawn here because no part draws them: the AFM's scanner head, cantilever, probe tip, photodiode and sample surface;
// the NMR magnet; the microtome's blade, block holder, paraffin block with its tissue and the ribbon of sections; the
// microfluidic chip and its channels, ports and droplets; the bioprinter's gantry, build plate and printed scaffold; the
// sequencer's four-colour base calls and its flow cell; the open lid of the tip box.
// Lettered (strokes): "A C G T" under the base calls on the sequencer's screen.
// Usage: node lb06.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page } from '../cellkit.mjs'
import { deep, hueOf, soft, rich, toLch } from '../colour.mjs'
import { f } from '../shapes.mjs'
import { ACCENT, DARK, GLASS, GLOW, METAL, PAPER, PLASTIC, beam, instrument, objW, screen, syringe, tip, tube, wellPlate } from '../parts/lab.mjs'
import { lettering } from '../parts/letters.mjs'

const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012: the materials) are left out of the hue check, as the conventions of lab.mjs say.
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p]) => toLch(p.base).c >= 0.012), defs, body)
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts) })
const icon = (name, { defs, body, parts }) => cellType(name, parts, defs, body)
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })

/** A rounded rectangle given in g's units, as a path on the page. */
const rrect = (g, x0, y0, x1, y1, r) => {
  const [a, b] = g.P([x0, y0]), W = (x1 - x0) * g.k, H = (y1 - y0) * g.k, R = Math.min(r * g.k, W / 2, H / 2)
  return `M${f(a + R)},${f(b)} H${f(a + W - R)} A${f(R)},${f(R)} 0 0 1 ${f(a + W)},${f(b + R)} V${f(b + H - R)} A${f(R)},${f(R)} 0 0 1 ${f(a + W - R)},${f(b + H)} H${f(a + R)} A${f(R)},${f(R)} 0 0 1 ${f(a)},${f(b + H - R)} V${f(b + R)} A${f(R)},${f(R)} 0 0 1 ${f(a + R)},${f(b)} Z`
}
/** A closed polygon in g's units. */
const poly = (g, pts) => `M${pts.map((p) => g.P(p).map(f).join(',')).join(' L')}Z`
/** The beam part between two points (g's units). */
const ray = (g, [x0, y0], [x1, y1], opts) => beam(g, { x: (x0 + x1) / 2, y: (y0 + y1) / 2, size: Math.hypot(x1 - x0, y1 - y0), turn: (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI, ...opts })

// ---------------------------------------------------------------------------------------------------------------------
// Atomic force microscope: the scanner head holds a cantilever whose sharp tip rides over the bumps of a sample; a red
// laser is reflected off the back of the cantilever into a photodiode.
// (SiliCoDraw draws the laser ending on the cantilever; corrected modestly: the beam is reflected on to the detector
// that reads the cantilever's bending, which is how an AFM measures. The sample is grey (mica with molecules) and the
// probe tip in the accent.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.95, [0, -2.5]), w = objW(90 * g.k), cw = Math.max(2, w * 0.75), fine = Math.max(1.5, w * 0.45)
  // the sample: a surface with two bumps, the higher one under the tip
  const top = (x) => 14 - 9 * Math.exp(-((x - 14) ** 2) / 110) - 6 * Math.exp(-((x + 26) ** 2) / 90)
  const xs = Array.from({ length: 49 }, (_, i) => -46 + (92 * i) / 48)
  const surf = poly(g, [...xs.map((x) => [x, top(x)]), [46, 44], [-46, 44]])
  const sample = g.path(surf, 'url(#afm-sample-gradient)', GLASS.outline, w)
  // head, cantilever, tip
  const head = g.path(rrect(g, -46, -30, -20, -10, 3.5), 'url(#afm-head-gradient)', METAL.outline, w) + g.hl(-40, -25, 7, 2.2, 0, METAL.light)
  const lever = g.path(rrect(g, -22, -20, 18, -15.5, 1.5), METAL.shadow, METAL.outline, cw)
  const probe = g.path(poly(g, [[7, -16], [13.5, top(14) - 1.2], [18, -16]]), ACCENT.base, ACCENT.outline, cw)
  // the laser: from the top right on to the back of the cantilever, reflected up to the photodiode
  const hit = [12, -21], inc = ray(g, [44, -46], hit, { colour: 'red', width: Math.max(3, w * 0.7), id: 'laser-in' })
  const out = ray(g, hit, [-12, -40], { colour: 'red', width: Math.max(3, w * 0.7), end: 'head', id: 'laser-out' })
  const pd = g.path(rrect(g, -24, -49, -6, -40, 2), DARK.base, DARK.outline, cw) + g.line([[-15, -48], [-15, -41]], DARK.light, fine) + g.line([[-23, -44.5], [-7, -44.5]], DARK.light, fine)
  icon('Atomic force microscope', join(
    own('sample', sample, [], g.grad('afm-sample-gradient', [-46, -2, 46, 44], GLASS)),
    own('head', head + lever, [], g.grad('afm-head-gradient', [-46, -30, -20, -10], METAL)),
    own('probe', probe, [['probe', ACCENT]]),
    inc, out, own('photodiode', pd)))
}

// ---------------------------------------------------------------------------------------------------------------------
// NMR: a superconducting magnet on three legs with a sample tube in its bore, and the spectrum on a screen beside it.
// (SiliCoDraw draws the spectrum as bare axes; here it is the screen part showing peaks, as the parts list it for NMR.
// The sample tube is a thin glass tube with a cap in the accent.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.72, [-0.75, -2.5]), w = objW(80 * g.k), cw = Math.max(2, w * 0.75)
  const legs = [-38, -22, -6].map((x) => g.path(rrect(g, x - 3, 34, x + 3, 46, 1.5), METAL.shadow, METAL.outline, cw)).join('')
  const body = g.path(rrect(g, -47, -22, 3, 38, 7), 'url(#nmr-magnet-gradient)', METAL.outline, w) + g.hl(-40, -12, 3, 12, 0, METAL.light)
  const stack = g.path(rrect(g, -32, -34, -12, -20, 3), METAL.shadow, METAL.outline, w)
  const ring = g.path(rrect(g, -47, 4, 3, 10, 1), METAL.shadow, METAL.outline, cw)
  const sample = tube(g, { x: -22, y: -40, size: 22, kind: 'test', cap: 'screw', liquid: 'water', level: 0.35, id: 'nmr-tube' })
  const scr = screen(g, { x: 26, y: 2, size: 40, aspect: 0.9, show: 'peaks', id: 'spectrum' })
  const parts = scr.parts.filter(([n]) => n !== 'screen')
  icon('NMR', join(own('magnet', legs + body + ring + stack, [], g.grad('nmr-magnet-gradient', [-47, -22, 3, 38], METAL)), sample, { ...scr, parts }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Microtome: a paraffin block with its tissue held in a clamp, the knife cutting it, and a ribbon of sections, each with
// its slice of tissue, running off to the right on the base.
// (SiliCoDraw's composition; the block now sits in a metal holder, as on a rotary microtome, and the knife is a wedge.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(5.05, [0, 2]), w = objW(90 * g.k), cw = Math.max(2, w * 0.75)
  const WAX = soft(95), TISSUE = soft(hueOf('#f3b6a0'))
  const base = g.path(rrect(g, -48, 30, 48, 40, 3), 'url(#microtome-base-gradient)', METAL.outline, w)
  const holder = g.path(rrect(g, -48, -16, -40, 30, 2), METAL.shadow, METAL.outline, cw)
  const block = g.path(rrect(g, -42, -10, -10, 28, 3), 'url(#microtome-wax-gradient)', WAX.outline, w)
  const tissue = g.smooth([[-34, 4], [-30, -2], [-22, -2], [-17, 4], [-18, 13], [-25, 19], [-33, 16], [-36, 10]])
  const blk = block + g.path(tissue, TISSUE.base, TISSUE.outline, cw)
  const knife = g.path(poly(g, [[-8, -30], [0, -30], [0, 28], [-8, 22]]), 'url(#microtome-knife-gradient)', METAL.outline, w) + g.line([[-6.5, -26], [-6.5, 18]], METAL.light, cw)
  let sec = '', tis = ''
  ;[[4, 13], [13, 9], [22, 13], [31, 9], [40, 13]].forEach(([x, y]) => {
    sec += g.path(rrect(g, x - 4.5, y - 6, x + 4.5, y + 6, 1.2), WAX.base, WAX.outline, cw)
    tis += g.circle(x, y, 2.6, TISSUE.small, TISSUE.outline, Math.max(1.5, w * 0.4))
  })
  icon('Microtome', join(
    own('base', base + holder, [], g.grad('microtome-base-gradient', [-48, 30, 48, 40], METAL)),
    own('block', blk + sec + tis, [['wax', WAX], ['tissue', TISSUE]], g.grad('microtome-wax-gradient', [-42, -10, -10, 28], WAX)),
    own('knife', knife, [], g.grad('microtome-knife-gradient', [-8, -30, 0, 28], METAL))))
}

// ---------------------------------------------------------------------------------------------------------------------
// Microfluidics: a chip with a flow-focusing junction: oil enters from two side channels, the sample from the middle one,
// and droplets of sample are pinched off into the outlet channel.
// (SiliCoDraw has only the two side inlets meeting; corrected modestly with the middle inlet that carries the droplets'
// liquid, so the junction makes sense. The chip is glass, the oil the blue of water, the droplets orange.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(5.0, [0, 0]), w = objW(96 * g.k), cw = Math.max(2, w * 0.75)
  const OIL = soft(222), DROP = soft(hueOf('#e3955a'))
  const chip = g.path(rrect(g, -48, -30, 48, 30, 6), 'url(#chip-gradient)', GLASS.outline, w) + g.hl(-40, -25, 10, 2.5, 0, GLASS.light)
  const cwid = 6.5 * g.k, D = (pts) => `M${pts.map((p) => g.P(p).map(f).join(',')).join(' L')}`
  const oil = D([[-38, -17], [-16, -17], [-6, 0], [-16, 17], [-38, 17]]), outCh = D([[-6, 0], [40, 0]]), mid = D([[-38, 0], [-6, 0]])
  const ch = (d, colour, wd) => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(wd)}" stroke-linecap="round" stroke-linejoin="round"/>`
  const channels = ch(oil, OIL.outline, cwid + 2 * cw) + ch(outCh, OIL.outline, cwid + 2 * cw) + ch(mid, DROP.outline, cwid + 2 * cw) +
    ch(oil, OIL.small, cwid) + ch(outCh, OIL.small, cwid) + ch(mid, DROP.small, cwid)
  const drops = [3, 15, 27].map((x) => g.ellipse(x, 0, 4.4, 2.6, 0, DROP.base, DROP.outline, cw)).join('')
  const ports = [[-39, -17, OIL], [-39, 17, OIL], [-39, 0, DROP], [40, 0, OIL]].map(([x, y, p]) => g.circle(x, y, 5.2, PAPER.base, p.outline, cw)).join('')
  icon('Microfluidics', join(own('chip', chip, [], g.grad('chip-gradient', [-48, -30, 48, 30], GLASS)), own('oil', channels, [['oil', OIL]]), own('droplets', drops + ports, [['droplets', DROP]])))
}

// ---------------------------------------------------------------------------------------------------------------------
// 3D bioprinter: a gantry carries a syringe of bioink over the build plate; the nozzle lays down a lattice of strands,
// layer on layer (long strands crossed by strands seen end-on).
// (SiliCoDraw's print head is a box with a nozzle; here it is the syringe part, as bioprinters print from syringes, held in
// a carriage on the cross bar. The bioink keeps SiliCoDraw's pink.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(5.05, [0, 0]), w = objW(92 * g.k), cw = Math.max(2, w * 0.75)
  const INK = soft(hueOf('#f6d0dc'))
  const frame = g.path(rrect(g, -42, -40, -36, 38, 2), METAL.shadow, METAL.outline, cw) + g.path(rrect(g, 36, -40, 42, 38, 2), METAL.shadow, METAL.outline, cw) +
    g.path(rrect(g, -47, -47, 47, -36, 3), 'url(#printer-bar-gradient)', METAL.outline, w)
  const plate = g.path(rrect(g, -47, 36, 47, 46, 3), 'url(#printer-plate-gradient)', METAL.outline, w)
  const carriage = g.path(rrect(g, -9, -39, 9, -27, 2.5), ACCENT.base, ACCENT.outline, cw)
  const syr = syringe(g, { x: 0, y: -10, size: 34, liquid: INK, level: 0.7, id: 'bioink-syringe' })
  const flow = g.line([[0, 7], [0, 14]], INK.outline, Math.max(3, w * 0.6))
  let lattice = ''
  // three layers: long strands, end-on strands, long strands (the top one being printed, shorter)
  lattice += g.path(rrect(g, -32, 30, 32, 36, 3), INK.base, INK.outline, cw)
  lattice += [-26, -13, 0, 13, 26].map((x) => g.circle(x, 26.5, 3.3, INK.small, INK.outline, cw)).join('')
  lattice += g.path(rrect(g, -32, 17, 0, 23, 3), INK.base, INK.outline, cw)
  icon('3D bioprinter', join(
    own('frame', frame + plate, [], g.grad('printer-bar-gradient', [-47, -47, 47, -36], METAL) + g.grad('printer-plate-gradient', [-47, 36, 47, 46], METAL)),
    own('scaffold', lattice + flow, [['bioink', INK]]),
    syr,
    own('carriage', carriage, [['carriage', ACCENT]])))
}

// ---------------------------------------------------------------------------------------------------------------------
// Plate reader: an instrument with a screen showing a reading, a button and a green lamp, its drawer out with a 96-well
// plate on it.
// (SiliCoDraw's composition with the parts: the plate is the well plate part seen at an angle, its wells partly filled.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(5.05, [0, 6])
  const box = instrument(g, { x: 0, y: -6, size: 92, aspect: 0.62, screen: 'trace', buttons: 1, lamp: 'on', drawer: true, id: 'reader' })
  const w = objW(92 * g.k), cw = Math.max(2, w * 0.75)
  const tray = g.path(rrect(g, -36, 26, 36, 44, 3), METAL.shadow, METAL.outline, w)
  const plate = wellPlate(g, { x: 0, y: 32, size: 62, rows: 4, cols: 8, view: 'angled', liquid: 'medium', id: 'plate' })
  icon('Plate reader', join(box, own('tray', tray), plate))
}

// ---------------------------------------------------------------------------------------------------------------------
// Sequencer: a sequencing instrument whose screen shows base calls as bars in the four colours of A, C, G and T, with a
// flow cell of four lanes in its loading bay and a slot below.
// (SiliCoDraw writes the bases as a line of text "ACGTTGCA"; here each bar has its letter under it in its colour, A green,
// C blue, G yellow, T red, as sequencers colour them. The panel with lines is drawn as the glass flow cell.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(5.05, [0, 0]), w = objW(92 * g.k), cw = Math.max(2, w * 0.75), fine = Math.max(1.5, w * 0.45)
  const box = instrument(g, { x: 0, y: 0, size: 92, aspect: 0.8, screen: false, buttons: 0, lamp: false, id: 'sequencer' })
  const scr = screen(g, { x: -13, y: -4, size: 50, aspect: 0.72, show: 'blank', id: 'base-calls' })
  const BASES = [['A', deep(150)], ['C', deep(225)], ['G', rich(95)], ['T', deep(25)]]
  const bw = 6 * g.k, h = 6.2
  let bars = '', letters = ''
  BASES.forEach(([b, p], i) => {
    const x = -30 + i * 11.5, top = [-16, -10, -20, -13][i]
    bars += `<path d="M${g.P([x, 4]).map(f).join(',')} L${g.P([x, top]).map(f).join(',')}" stroke="${p.base}" stroke-width="${f(bw)}" stroke-linecap="round" fill="none"/>`
    letters += lettering(g, { x, y: 11.5, h, text: b, colour: p.base, id: `base-${b}` }).body
  })
  const cell = g.path(rrect(g, 18, -21, 38, 13, 3), GLASS.small, METAL.outline, cw) +
    [22.5, 26.5, 30.5, 34.5].map((x) => g.line([[x, -16], [x, 8]], ACCENT.small, Math.max(2, w * 0.55))).join('')
  const slot = g.path(rrect(g, -38, 22, 38, 30, 2.5), METAL.shadow, METAL.outline, cw) + g.line([[-10, 26], [10, 26]], METAL.outline, cw)
  icon('Sequencer', join(box, { ...scr, parts: [] }, own('bases', bars + letters, BASES.map(([b, p]) => [b, p])), own('flow-cell', cell, [['flow cell', ACCENT]]), own('slot', slot)))
}

// ---------------------------------------------------------------------------------------------------------------------
// Tip box: an open box of pipette tips seen at an angle, its lid swung up behind, every hole holding a tip and two tips
// standing up out of the rack.
// (SiliCoDraw draws the lid as a band on top; here it stands open behind the rack. The box is the tip box of the well
// plate part, in the accent.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(5.05, [0, 2]), w = objW(92 * g.k)
  const lid = g.path(poly(g, [[-44, -14], [-38, -44], [38, -44], [44, -14]]), ACCENT.shadow, ACCENT.outline, w) +
    g.path(poly(g, [[-36, -18], [-32, -38], [32, -38], [36, -18]]), ACCENT.light, ACCENT.outline, Math.max(1.5, w * 0.45))
  const box = wellPlate(g, { x: 0, y: 12, size: 92, kind: 'tips', rows: 4, cols: 8, view: 'angled', id: 'tip-box' })
  // a hole of the rack in the part's own units (pitch 11, rows squeezed to 0.55), scaled by the size 92 / 100
  const hole = (j, r) => [-44 + 11 * (j + 0.5), (-(4 * 11 + 12) * 0.55 - 10) / 2 + (6 + 11 * (r + 0.5)) * 0.55].map((v) => v * 0.92)
  const tips = [[1, 0], [4, 1]].map(([j, r], i) => { const [hx, hy] = hole(j, r); return tip(g, { x: hx, y: 12 + hy - 12, size: 26, id: `tip${i}` }) })
  icon('Tip box', join(own('lid', lid, [['lid', ACCENT]]), box, ...tips))
}

check()
console.log('written to', OUT)
