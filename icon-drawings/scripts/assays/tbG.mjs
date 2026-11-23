// Eight icons of SiliCoDraw's "Techniques & assays" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts: the rodent
// behaviour tests (Morris water maze, elevated plus maze, T-maze, open field, novel object) and the motor tests (rotarod,
// grip strength, treadmill). Compositions read by hand from the source in a 100 × 100 box centred on 0,0 and scaled onto
// a 512 page (`page` of ../cellkit.mjs); outlines at 60 %. Everything here is an object or an animal: no gloss.
// Parts used: arena (assays.mjs: the four arenas with their mouse seen from above, tracks, platform, reward, objects);
// labMouse, instrument, METAL, PLASTIC, GLASS, DARK, ACCENT, INK (lab.mjs); arrow (tissue.mjs).
// Drawn here because no part draws them: the rotarod's rod with its dividing discs, the grip strength meter's grid and
// rod, the treadmill's belt, rollers, lane wall and shock grid.
// Lettered: nothing (SiliCoDraw's "?", "novel", "familiar" and "N" are left out; the meter shows a reading).
// Usage: node tbG.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss } from '../cellkit.mjs'
import { toLch } from '../colour.mjs'
import { f, setStrokeScale } from '../shapes.mjs'
import { ACCENT, DARK, GLASS, INK, METAL, PLASTIC, instrument, labMouse } from '../parts/lab.mjs'
import { arena } from '../parts/assays.mjs'
import { arrow } from '../parts/tissue.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p]) => toLch(p.base).c >= 0.012), defs, body)
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts) })
const icon = (name, { defs, body, parts }) => cellType(name, parts.filter(([, p], i) => parts.findIndex(([, q]) => q.base === p.base) === i), defs, body)
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })
/** A rounded rectangle given in g's units, as a path on the page. */
const rrect = (g, x0, y0, x1, y1, r) => {
  const [a, b] = g.P([x0, y0]), W = (x1 - x0) * g.k, H = (y1 - y0) * g.k, R = Math.min(r * g.k, W / 2, H / 2)
  return `M${f(a + R)},${f(b)} H${f(a + W - R)} A${f(R)},${f(R)} 0 0 1 ${f(a + W)},${f(b + R)} V${f(b + H - R)} A${f(R)},${f(R)} 0 0 1 ${f(a + W - R)},${f(b + H)} H${f(a + R)} A${f(R)},${f(R)} 0 0 1 ${f(a)},${f(b + H - R)} V${f(b + R)} A${f(R)},${f(R)} 0 0 1 ${f(a + R)},${f(b)} Z`
}

// ---------------------------------------------------------------------------------------------------------------------
// The five arenas: the arena part as it is, with its mouse seen from above.
// (SiliCoDraw: Morris water maze with its swim path to the hidden platform; the elevated plus maze, its closed arms
// walled; the T-maze with a reward in the left arm and the path to it; the open field with its centre zone and a track;
// the novel object test with a familiar and a novel object, the mouse turned to the novel one. Words left out.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.9, [0, 0])
  icon('Morris water maze', arena(g, { x: 0, y: 0, size: 95, kind: 'pool', path: true, id: 'water-maze' }))
  icon('Elevated plus maze', arena(g, { x: 0, y: 0, size: 95, kind: 'plus', id: 'plus-maze' }))
  icon('T-maze', arena(g, { x: 0, y: 0, size: 95, kind: 't', path: true, id: 't-maze' }))
  icon('Open field test', arena(g, { x: 0, y: 0, size: 95, path: true, id: 'open-field' }))
  icon('Novel object test', arena(g, { x: 0, y: 0, size: 95, objects: true, id: 'novel-object' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Rotarod: a mouse walking on a turning rod between two dividing discs, a curved arrow over it for the turning.
// (SiliCoDraw draws a ridged rod and a mouse body; here the rod is metal with ridges, the discs in the accent of an
// instrument, the mouse the lab mouse part.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.95, [0, 5.5]), w = 7
  const rod = g.path(rrect(g, -42, 9, 42, 21, 6), 'url(#rod-gradient)', METAL.outline, w) +
    [-30, -18, -6, 6, 18, 30].map((x) => g.line([[x, 10.5], [x + 3, 19.5]], METAL.outline, 3)).join('')
  const disc = (x) => g.path(rrect(g, x - 4.5, -8, x + 4.5, 38, 4.5), 'url(#disc-gradient)', ACCENT.outline, w) + g.circle(x, 15, 2.2, ACCENT.outline)
  const mouse = labMouse(g, { x: 0, y: -2.5, size: 58, id: 'mouse' })
  const turning = arrow(g, { points: Array.from({ length: 13 }, (_, i) => { const a = Math.PI * (1.12 + 0.76 * (i / 12)); return [33 * Math.cos(a), 6 + 33 * Math.sin(a) * 1.05] }), colour: INK, w: 10, id: 'turning' })
  icon('Rotarod', join(
    own('rod', rod, [], g.grad('rod-gradient', [-42, 9, 42, 21], METAL)),
    own('discs', disc(-42) + disc(42), [['discs', ACCENT]], g.grad('disc-gradient', [-47, -8, 47, 38], ACCENT)),
    mouse, turning))
}

// ---------------------------------------------------------------------------------------------------------------------
// Grip strength: a mouse grasping the grid of a force meter with its forepaws, pulled back by the tail (the arrow);
// the meter shows the peak force.
// (SiliCoDraw puts the meter behind the mouse; here it is at the head, where the grid is gripped. Its "N" is left out:
// the screen shows a reading.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.6, [0.5, 3]), w = 7
  const meter = instrument(g, { x: -35, y: -1, size: 44, aspect: 1.45, screen: 'number', text: '42', buttons: 1, lamp: false, id: 'meter' })
  const grid = g.line([[-21, 10], [-15, 10]], METAL.outline, 11) + g.line([[-21, 10], [-15, 10]], METAL.base, 6) +
    g.path(rrect(g, -16, -6, -10, 24, 2.5), METAL.light, METAL.outline, 6) + [0, 8, 16].map((y) => g.line([[-16, y], [-10, y]], METAL.outline, 4)).join('')
  const mouse = labMouse(g, { x: 18, y: 6, size: 68, id: 'mouse' })
  const pull = arrow(g, { points: [[24, 30], [46, 30]], colour: INK, w: 10, id: 'pull' })
  icon('Grip strength', join(meter, own('grid', grid), mouse, pull))
}

// ---------------------------------------------------------------------------------------------------------------------
// Treadmill: a mouse running on a moving belt in a clear lane, the shock grid at the back end, the belt's direction
// under it.
// (SiliCoDraw: a belt, a frame and a block at the back; here the frame is the lane's glass wall, the block the shock grid.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.95, [0, 4]), w = 7
  const lane = g.path(rrect(g, -46, -32, 46, 16, 4), 'url(#lane-gradient)', GLASS.outline, w) + g.line([[-40, -26], [-24, -26]], '#FFFFFF', 5)
  const belt = g.path(rrect(g, -46, 14, 46, 28, 7), DARK.base, DARK.outline, w) +
    [-42, 42].map((x) => g.circle(x, 21, 4.2, METAL.base, METAL.outline, 4)).join('') +
    g.line([[-32, 21], [-24, 21]], DARK.light, 3.5) + g.line([[-12, 21], [-4, 21]], DARK.light, 3.5) + g.line([[8, 21], [16, 21]], DARK.light, 3.5) + g.line([[28, 21], [34, 21]], DARK.light, 3.5)
  const shock = g.path(rrect(g, 36, -4, 46, 14, 1.5), METAL.light, METAL.outline, 5) + [39.5, 43].map((x) => g.line([[x, -1], [x, 11]], ACCENT.outline, 3)).join('')
  const mouse = labMouse(g, { x: -4, y: 1.5, size: 58, id: 'mouse' })
  const run = arrow(g, { points: [[-18, 38], [18, 38]], colour: INK, w: 10, id: 'belt-direction' })
  icon('Treadmill', join(own('lane', lane, [], g.grad('lane-gradient', [-46, -32, 46, 16], GLASS)), own('belt', belt), own('shock-grid', shock, [['grid', ACCENT]]), mouse, run))
}

check()
console.log('written to', OUT)
