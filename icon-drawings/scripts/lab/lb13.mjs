// Seven icons of SiliCoDraw's "Lab & equipment" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared lab parts in
// ../parts/lab.mjs and their conventions of objects (glass, plastic, metal and rubber are greys; caps, lids, handles and
// instrument bands in the one accent blue): a muscle biopsy, a metabolic cage, a running wheel, a water sample, a vacuum
// filtration unit, an anaerobic jar and a chemostat. Their compositions are read by hand from the source in a 100 × 100
// box centred on 0,0 and scaled onto a 512 page (`page` of ../cellkit.mjs).
// Parts used: glassware (bottle, flask, jar), petriDish (angled, agar), instrument (with its screen), labMouse (lab.mjs);
// bacterium, arrow (tissue.mjs); lettering (letters.mjs).
// Drawn here because no part draws them: the block of thigh tissue (skin, fat, muscle with its fibres) and the Bergstrom
// needle with its window; the sealed cage with its bedding and air lines; the running wheel and its stand; the label of
// the water sample and the sediment; the filter cup, filter holder, stopper, side arm and vacuum hose; the clamp, gas
// pack and "no oxygen" mark of the anaerobic jar; the peristaltic pump, tubing, drop, overflow and stir bar of the
// chemostat.
// Lettered (strokes): "O2" (2 lowered) in the "no oxygen" mark of the anaerobic jar.
// Usage: node lb13.mjs <folder>
import { mkdirSync } from 'node:fs'
import { PEACH, cellTypes, page } from '../cellkit.mjs'
import { hueOf, rich, soft, toHex, toLch } from '../colour.mjs'
import { f } from '../shapes.mjs'
import { ACCENT, DARK, GHS, GLASS, INK, LIQUIDS, METAL, PAPER, PLASTIC, glassware, instrument, labMouse, objW, petriDish } from '../parts/lab.mjs'
import { arrow, bacterium } from '../parts/tissue.mjs'
import { lettering, textWidth } from '../parts/letters.mjs'

const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012: the materials) are left out of the hue check, as the conventions of lab.mjs say.
// A palette used twice (the accent of a cap and a lid) is one part that recolours as one, so it is listed once.
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base) === i), defs, body)
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts) })
const icon = (name, { defs, body, parts }) => cellType(name, parts, defs, body)
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })

const WATER = LIQUIDS.water, MEDIUM = LIQUIDS.medium
const SKIN = soft(PEACH) // the epidermis and dermis, the peach of the epithelia
const FAT = rich(hueOf('#fde68a')) // subcutaneous fat, the neutral lipid's yellow of the lipid droplet part (as ct14)
const MUSCLE = soft(15) // skeletal muscle, the muscle rose of the set (as Muscle satellite cell)
const BEDDING = rich(75) // wood shavings (as Mouse cage in lb09)
// silt at the bottom of a water sample: a muted brown (no palette maker gives one this dull)
const SEDIMENT = { light: toHex({ l: 0.85, c: 0.04, h: 60 }), base: toHex({ l: 0.55, c: 0.07, h: 60 }), shadow: toHex({ l: 0.5, c: 0.07, h: 60 }), small: toHex({ l: 0.62, c: 0.07, h: 60 }), outline: toHex({ l: 0.42, c: 0.06, h: 60 }) }

/** A closed polygon in g's units with rounded corners ([[x, y, r], …]), as a page path. */
const roundD = (g, corners) => {
  const n = corners.length, out = []
  for (let i = 0; i < n; i++) {
    const [x, y, r] = corners[i], a = corners[(i - 1 + n) % n], b = corners[(i + 1) % n]
    if (!r) { out.push([x, y]); continue }
    const la = Math.hypot(a[0] - x, a[1] - y), lb = Math.hypot(b[0] - x, b[1] - y), ta = Math.min(r / la, 0.5), tb = Math.min(r / lb, 0.5)
    const p0 = [x + (a[0] - x) * ta, y + (a[1] - y) * ta], p2 = [x + (b[0] - x) * tb, y + (b[1] - y) * tb]
    for (let j = 0; j <= 6; j++) { const t = j / 6; out.push([(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * x + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * y + t * t * p2[1]]) }
  }
  return 'M' + out.map((p) => g.P(p).map(f).join(',')).join(' L') + 'Z'
}
const rrect = (g, x0, y0, x1, y1, r) => roundD(g, [[x0, y0, r], [x1, y0, r], [x1, y1, r], [x0, y1, r]])
const P2 = (g, p) => g.P(p).map(f).join(',')
/** A polyline through points in g's units, as path data on the page. */
const L = (g, pts) => `M${pts.map((p) => P2(g, p)).join(' L')}`
/** A smooth open course through points (Catmull–Rom), as path data on the page. */
const curve = (g, pts) => {
  const p = pts.map(g.P), n = p.length
  let d = `M${p[0].map(f).join(',')}`
  for (let i = 0; i < n - 1; i++) {
    const a = p[Math.max(0, i - 1)], b = p[i], c = p[i + 1], e = p[Math.min(n - 1, i + 2)]
    d += ` C${f(b[0] + (c[0] - a[0]) / 6)},${f(b[1] + (c[1] - a[1]) / 6)} ${f(c[0] - (e[0] - b[0]) / 6)},${f(c[1] - (e[1] - b[1]) / 6)} ${f(c[0])},${f(c[1])}`
  }
  return d
}
/** A falling drop, point up, `size` its height in g's units: flat, in the liquid's small tone. */
const drop = (g, x, y, size, pal, w) => {
  const u = size / 100
  const d = `M${P2(g, [x, y - 50 * u])} C${P2(g, [x + 8 * u, y - 30 * u])} ${P2(g, [x + 30 * u, y - 10 * u])} ${P2(g, [x + 30 * u, y + 18 * u])} A${f(31 * u * g.k)},${f(31 * u * g.k)} 0 0 1 ${P2(g, [x - 30 * u, y + 18 * u])} C${P2(g, [x - 30 * u, y - 10 * u])} ${P2(g, [x - 8 * u, y - 30 * u])} ${P2(g, [x, y - 50 * u])}Z`
  return g.path(d, pal.small, pal.outline, w)
}
/** Tubing: a line of `width` g units with an outline round it (a union of its strokes). */
const tubing = (g, ds, width, pal, w) => g.union(ds.map((d) => ({ d, width: width * g.k })), pal.base, pal.outline, w)

// ---------------------------------------------------------------------------------------------------------------------
// Muscle biopsy: a Bergstrom needle slanting into a block of thigh tissue cut open: skin, a layer of fat, and muscle
// with its fibres running along it. The needle reaches into the muscle, where its side window holds a core of muscle;
// a T-handle in the accent and the cap of the inner cutting cannula stand above the skin.
// (SiliCoDraw draws the needle inside the tissue faint; see-through parts are not allowed, so the needle is drawn whole
// over the cut face, as in a section. Skin peach, fat the lipid yellow and muscle the set's muscle rose, rather than
// three shades of one rose; the fat is drawn as round fat cells so that it reads as fat at a glance. The needle is metal
// grey and its handle in the accent, as the conventions give handles.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.6, [0, -1.2]), w = objW(92 * g.k), cw = Math.max(2, w * 0.75), fine = Math.max(1.5, w * 0.45)
  const x0 = -46, x1 = 46, yS = -2, yF = 7, yM = 18, yB = 46
  const block = rrect(g, x0, yS, x1, yB, 5)
  const skin = g.path(roundD(g, [[x0, yS, 5], [x1, yS, 5], [x1, yF, 0], [x0, yF, 0]]), SKIN.base)
  const fat = g.path(L(g, [[x0, yF], [x1, yF], [x1, yM], [x0, yM]]) + 'Z', FAT.base)
  // fat cells: a row of rounded lobules touching each other
  let lob = ''
  for (let i = 0; i < 11; i++) { const x = x0 + 4.4 + i * 8.4; lob += g.ellipse(x, (yF + yM) / 2, 4.2, (yM - yF) / 2 - 0.9, 0, FAT.light, FAT.outline, fine) }
  const muscle = g.path(roundD(g, [[x0, yM, 0], [x1, yM, 0], [x1, yB, 5], [x0, yB, 5]]), 'url(#muscle-gradient)')
  let fibres = ''
  for (let y = yM + 5.6; y < yB - 2; y += 5.6) fibres += g.line([[x0 + 3, y], [x1 - 3, y]], MUSCLE.shadow, f(fine * 1.6)) + g.line([[x0 + 3, y], [x1 - 3, y]], MUSCLE.outline, f(fine * 0.7))
  const seams = g.line([[x0, yF], [x1, yF]], SKIN.outline, cw) + g.line([[x0, yM], [x1, yM]], MUSCLE.outline, cw)
  const tissueOutline = g.path(block, 'none', MUSCLE.outline, w)
  const hl = g.line([[x0 + 5, yS + 2.4], [x0 + 22, yS + 2.4]], SKIN.light, f(cw * 1.1))
  // the needle, drawn upright in its own frame (y down the needle, 0 at the skin) and turned 32° about the entry point
  const ex = 4, ey = yS, turn = 32, nr = 3.4
  const N = page(g.k, [256 / g.k - g.X(ex) / g.k, 256 / g.k - g.Y(ey) / g.k]) // a page whose 0,0 is the entry point
  const shaft = roundD(N, [[-nr, -40, 1.5], [nr, -40, 1.5], [nr, 31, 0], [0, 38, 0], [-nr, 31, 0]])
  const needle = N.path(shaft, METAL.base, METAL.outline, w)
  const window = N.path(rrect(N, -nr + 1.2, 19, nr - 1.2, 30, 1.2), MUSCLE.shadow, METAL.outline, fine) + N.line([[-nr + 2.2, 22.5], [nr - 2.2, 22.5]], MUSCLE.outline, fine * 0.8) + N.line([[-nr + 2.2, 26.5], [nr - 2.2, 26.5]], MUSCLE.outline, fine * 0.8)
  const shine = N.line([[-1.3, -36], [-1.3, -6]], METAL.light, f(cw))
  const handle = N.path(rrect(N, -15, -47, 15, -39, 4), 'url(#handle-gradient)', ACCENT.outline, w)
  const cap = N.path(rrect(N, -4, -53, 4, -46.5, 2), METAL.shadow, METAL.outline, cw)
  const turned = (s) => `<g transform="rotate(${turn} ${f(g.X(ex))} ${f(g.Y(ey))})">${s}</g>`
  const entry = g.ellipse(ex + 0.5, ey, 6, 1.8, 0, SKIN.outline)
  icon('Muscle biopsy', join(
    own('skin', skin + hl, [['skin', SKIN]]),
    own('fat', fat + lob, [['fat', FAT]]),
    own('muscle', muscle + fibres, [['muscle', MUSCLE]], g.grad('muscle-gradient', [x0, yM, x1, yB], MUSCLE)),
    own('tissue-outline', seams + tissueOutline),
    own('entry', entry),
    own('needle', turned(needle + window + shine + cap)),
    own('handle', turned(handle), [['handle', ACCENT]], N.grad('handle-gradient', [-15, -47, 15, -39], ACCENT))))
}

// ---------------------------------------------------------------------------------------------------------------------
// Metabolic cage: a sealed clear cage with bedding and a white lab mouse; air is drawn in through one line and out
// through another to a gas analyser, whose screen shows the trace of oxygen and carbon dioxide.
// (SiliCoDraw: a pale blue box, blue air lines with heads, and a grey analyser with a dark screen. Here the cage is clear
// plastic with a sealed lid in the accent, the lines plastic tubing with small dark heads for the flow, and the analyser
// the instrument part with a trace on its screen, a lamp and a dial.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.75, [-1, 0.6]), w = objW(64 * g.k), cw = Math.max(2, w * 0.75), fine = Math.max(1.5, w * 0.45)
  const cx0 = -46, cx1 = 15, cy0 = -5, cy1 = 42
  const cage = rrect(g, cx0, cy0, cx1, cy1, 3.5)
  let pts = [], yb = 33
  for (let i = 0; i <= 14; i++) pts.push([cx0 + 1 + ((cx1 - cx0 - 2) * i) / 14, yb + Math.sin(i * 1.3) * 1.2])
  const bedding = g.path(`M${pts.map((p) => P2(g, p)).join(' L')} L${P2(g, [cx1 - 1, cy1 - 3])} Q${P2(g, [cx1 - 1, cy1 - 1])} ${P2(g, [cx1 - 3, cy1 - 1])} L${P2(g, [cx0 + 3, cy1 - 1])} Q${P2(g, [cx0 + 1, cy1 - 1])} ${P2(g, [cx0 + 1, cy1 - 3])}Z`, BEDDING.small, BEDDING.outline, fine) +
    [[-38, 37, 20], [-24, 38.5, -15], [-8, 37, 25], [6, 38.5, -20]].map(([x, y, r]) => g.ellipse(x, y, 2.6, 0.9, r, BEDDING.shadow, BEDDING.outline, Math.max(1.2, fine * 0.7))).join('')
  const mouse = labMouse(g, { x: -15, y: 22.5, size: 40, id: 'mouse' })
  const front = g.path(cage, 'none', PLASTIC.outline, w) + g.line([[-41, 1], [-41, 22]], PLASTIC.light, f(w * 0.9))
  const lid = g.path(rrect(g, cx0 - 3, -13, cx1 + 3, -4, 3), 'url(#lid-gradient)', ACCENT.outline, w)
  // air lines: fresh air comes in on the left; the air of the cage goes out to the analyser on the right
  const t1 = [[-34, -12], [-34, -27], [-38, -33], [-46, -33]], t2 = [[3, -12], [3, -24], [8, -32], [21, -32]]
  const lines = tubing(g, [curve(g, t1), curve(g, t2)], 3.6, PLASTIC, cw)
  const heads = arrow(g, { points: [[-44, -33], [-38.5, -32.6]], corners: true, colour: INK, w: 2.4, head: 9, id: 'air-in' }).body +
    arrow(g, { points: [[12, -32], [18, -32]], corners: true, colour: INK, w: 2.4, head: 9, id: 'air-out' }).body
  const analyser = instrument(g, { x: 34, y: -16, size: 50, aspect: 1.9, screen: 'trace', buttons: 1, knob: true, lamp: 'on', id: 'analyser' })
  icon('Metabolic cage', join(
    own('cage', g.path(cage, 'url(#cage-gradient)'), [['cage', PLASTIC]], g.grad('cage-gradient', [cx0, cy0, cx1, cy1], PLASTIC)),
    own('bedding', bedding, [['bedding', BEDDING]]),
    mouse,
    own('cage-front', front),
    own('air-lines', lines + heads),
    own('lid', lid, [['lid', ACCENT]], g.grad('lid-gradient', [cx0 - 3, -13, cx1 + 3, -4], ACCENT)),
    analyser))
}

// ---------------------------------------------------------------------------------------------------------------------
// Running wheel: a wheel on an A-frame stand with a white lab mouse running inside on its rungs; an arrow over the top
// says which way it turns.
// (SiliCoDraw: a pale blue disc with spokes and a blue arrow. Here the wheel is a clear plastic disc with a steel tread
// of rungs and steel spokes, the hub in the accent, the arrow dark. The wheel turns the way the mouse pushes it: the
// mouse runs to the left, so the tread under it moves right and the top of the wheel moves left.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.85, [0, -0.6]), w = objW(76 * g.k), cw = Math.max(2, w * 0.75), fine = Math.max(1.5, w * 0.45)
  const cy = -4, R = 36, Ri = 29.5
  const legs = tubing(g, [L(g, [[0, cy], [-25, 41]]), L(g, [[0, cy], [25, 41]])], 3.2, METAL, cw)
  const base = g.path(rrect(g, -36, 39.5, 36, 45.5, 3), 'url(#base-gradient)', METAL.outline, w)
  const disc = g.circle(0, cy, R, 'url(#disc-gradient)', METAL.outline, w)
  let spokes = []
  for (let i = 0; i < 6; i++) { const t = ((i * 60 + 30) * Math.PI) / 180; spokes.push([[5 * Math.cos(t), cy + 5 * Math.sin(t)], [(Ri - 1) * Math.cos(t), cy + (Ri - 1) * Math.sin(t)]]) }
  const spokeS = spokes.map((s) => g.line(s, METAL.outline, f(cw))).join('')
  // the tread: a steel band between Ri and R, crossed by rungs
  const ring = `<path d="M${P2(g, [-R, cy])} A${f(R * g.k)},${f(R * g.k)} 0 1 0 ${P2(g, [R, cy])} A${f(R * g.k)},${f(R * g.k)} 0 1 0 ${P2(g, [-R, cy])} Z M${P2(g, [-Ri, cy])} A${f(Ri * g.k)},${f(Ri * g.k)} 0 1 1 ${P2(g, [Ri, cy])} A${f(Ri * g.k)},${f(Ri * g.k)} 0 1 1 ${P2(g, [-Ri, cy])} Z" fill="${METAL.shadow}" fill-rule="evenodd"/>`
  let rungs = ''
  for (let i = 0; i < 28; i++) { const t = (i * (360 / 28) * Math.PI) / 180; rungs += g.line([[(Ri + 0.6) * Math.cos(t), cy + (Ri + 0.6) * Math.sin(t)], [(R - 0.6) * Math.cos(t), cy + (R - 0.6) * Math.sin(t)]], METAL.outline, f(fine)) }
  const rims = g.circle(0, cy, R, 'none', METAL.outline, w) + g.circle(0, cy, Ri, 'none', METAL.outline, cw)
  const shine = `<path d="M${P2(g, [-20, cy - 15])} A${f(25 * g.k)},${f(25 * g.k)} 0 0 1 ${P2(g, [-6, cy - 24.3])}" fill="none" stroke="${PLASTIC.light}" stroke-width="${f(cw * 1.2)}" stroke-linecap="round"/>`
  const hub = g.circle(0, cy, 4.6, ACCENT.base, ACCENT.outline, cw)
  const mouse = labMouse(g, { x: 0, y: 17.6, size: 42, id: 'mouse' })
  const arc = Array.from({ length: 13 }, (_, i) => { const a = ((-58 - (64 * i) / 12) * Math.PI) / 180; return [43 * Math.cos(a), cy + 43 * Math.sin(a)] })
  const turnArrow = arrow(g, { points: arc, corners: true, colour: INK, w: 4.2, head: 13, id: 'turning' })
  icon('Running wheel', join(
    own('stand', legs + base, [['stand', METAL]], g.grad('base-gradient', [-36, 39.5, 36, 45.5], METAL)),
    own('wheel', disc + spokeS + ring + rungs + rims + shine, [['wheel', PLASTIC]], g.grad('disc-gradient', [-R, cy - R, R, cy + R], PLASTIC)),
    mouse,
    own('hub', hub, [['hub', ACCENT]]),
    turnArrow))
}

// ---------------------------------------------------------------------------------------------------------------------
// Water sample: a sample bottle with a screw cap in the accent, full of water with a little silt settled at the bottom,
// and a paper label marked with a drop.
// (SiliCoDraw: a pale bottle, see-through blue water, brown specks, a white label with three lines and a red drop. Here the
// bottle is the bottle part (glass), the water the water blue of the conventions, the drop on the label water blue too,
// so that the label says "water" in the colour of what is in the bottle.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.85, [0, 0.1]), S = 94, u = S / 100
  const bottle = glassware(g, { x: 0, y: 0, size: S, kind: 'bottle', liquid: 'water', level: 0.78, label: false, id: 'sample-bottle' })
  const w = objW(S * g.k), cw = Math.max(2, w * 0.75), fine = Math.max(1.5, w * 0.45)
  const yB = 50 * u
  let silt = g.path(`M${P2(g, [-31 * u, yB - 4.5])} Q${P2(g, [-14 * u, yB - 6.8])} ${P2(g, [0, yB - 5.2])} T${P2(g, [31 * u, yB - 5])} L${P2(g, [31 * u, yB - 3])} Q${P2(g, [31 * u, yB - 0.7])} ${P2(g, [27 * u, yB - 0.7])} L${P2(g, [-27 * u, yB - 0.7])} Q${P2(g, [-31 * u, yB - 0.7])} ${P2(g, [-31 * u, yB - 3])}Z`, SEDIMENT.small, SEDIMENT.outline, fine)
  silt += [[-20, yB - 8.5, 1.1], [-6, yB - 10, 0.9], [9, yB - 8.8, 1.2], [20, yB - 11, 0.8]].map(([x, y, r]) => g.circle(x, y, r, SEDIMENT.base, SEDIMENT.outline, fine * 0.8)).join('')
  const lx0 = -21, lx1 = 21, ly0 = 3, ly1 = 26
  let label = g.path(rrect(g, lx0, ly0, lx1, ly1, 2), PAPER.base, PAPER.outline, cw)
  label += g.line([[lx0 + 5, ly0 + 7], [lx0 + 21, ly0 + 7]], PAPER.small, f(cw)) + g.line([[lx0 + 5, ly0 + 12.5], [lx0 + 25, ly0 + 12.5]], PAPER.small, f(cw)) + g.line([[lx0 + 5, ly0 + 18], [lx0 + 16, ly0 + 18]], PAPER.small, f(cw))
  label += drop(g, 13.5, 13.5, 13, WATER, cw)
  icon('Water sample', join(bottle, own('silt', silt, [['silt', SEDIMENT]]), own('label', label)))
}

// ---------------------------------------------------------------------------------------------------------------------
// Filtration unit: vacuum filtration. A filter cup of sample water stands on a filter holder with a white membrane,
// clamped and set through a rubber stopper into a receiving flask; the filtrate drips into the flask, and a vacuum hose
// leaves its side arm.
// (SiliCoDraw: a glass cup and flask, a brown stopper, grey clamps and an amber hose. Here cup and flask are glass, the
// stopper and hose dark rubber as the conventions draw rubber, the clamp steel and the membrane white; the flask is the
// flask part with a side arm added.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.75, [9.4, -1.9]), w = objW(60 * g.k), cw = Math.max(2, w * 0.75), fine = Math.max(1.5, w * 0.45)
  const fx = -6, fy = 24, FS = 46, u = FS / 100 // receiving flask: neck ±4.6 from y 4.2 to 16.6, base at 45.6
  const flask = glassware(g, { x: fx, y: fy, size: FS, kind: 'flask', liquid: 'water', level: 0.24, id: 'receiving-flask' })
  // side arm from the neck to the right, the hose on it
  const arm = tubing(g, [L(g, [[fx + 3, 9], [fx + 15, 9]])], 3.4, GLASS, cw)
  const hose = tubing(g, [curve(g, [[fx + 13, 9], [fx + 26, 9], [fx + 34, 2], [fx + 48, 0.5]])], 4, DARK, cw)
  // stopper in the neck, the stem of the holder through it, the drop below it
  const stopper = g.path(roundD(g, [[fx - 7.6, 0, 1.6], [fx + 7.6, 0, 1.6], [fx + 5.6, 6.5, 1], [fx - 5.6, 6.5, 1]]), DARK.base, DARK.outline, cw)
  const stem = g.path(rrect(g, fx - 2.4, -12, fx + 2.4, 10.5, 1), GLASS.shadow, GLASS.outline, cw)
  const dropS = drop(g, fx, 15.5, 6, WATER, fine)
  // filter holder: the base the cup stands on, with the white membrane between; a steel clamp round the joint
  const holder = g.path(roundD(g, [[fx - 15, -16, 2], [fx + 15, -16, 2], [fx + 9, -10, 2], [fx - 9, -10, 2]]), GLASS.shadow, GLASS.outline, cw)
  const membrane = g.path(rrect(g, fx - 13.5, -18.8, fx + 13.5, -15.6, 1.2), PAPER.base, PAPER.outline, fine)
  const clamp = g.path(rrect(g, fx - 19, -21.5, fx - 12.5, -13, 1.6), METAL.shadow, METAL.outline, cw) + g.path(rrect(g, fx + 12.5, -21.5, fx + 19, -13, 1.6), METAL.shadow, METAL.outline, cw)
  // the filter cup: straight sides narrowing to the holder, sample water inside
  const cupPts = [[fx - 16, -47, 0], [fx + 16, -47, 0], [fx + 16, -25, 2.5], [fx + 13.5, -19, 1.5], [fx - 13.5, -19, 1.5], [fx - 16, -25, 2.5]]
  const ys = -36
  const water = g.path(roundD(g, [[fx - 16, ys, 0], [fx + 16, ys, 0], [fx + 16, -25, 2.5], [fx + 13.5, -19, 1.5], [fx - 13.5, -19, 1.5], [fx - 16, -25, 2.5]]), WATER.small) +
    `<path d="M${P2(g, [fx - 15.6, ys])} Q${P2(g, [fx, ys + 3])} ${P2(g, [fx + 15.6, ys])}" fill="none" stroke="${WATER.outline}" stroke-width="${f(Math.max(1.6, w * 0.5))}"/>`
  const cupFill = g.path(roundD(g, cupPts), 'url(#cup-gradient)')
  const cupLine = g.path(L(g, [[fx - 16, -47], [fx - 16, -25], [fx - 13.5, -19], [fx + 13.5, -19], [fx + 16, -25], [fx + 16, -47]]), 'none', GLASS.outline, w)
  const cupShine = g.line([[fx - 12, -43], [fx - 12, -27]], GLASS.light, f(cw * 1.1))
  const rim = g.path(rrect(g, fx - 18, -49.5, fx + 18, -45.5, 1.5), GLASS.shadow, GLASS.outline, cw)
  icon('Filtration unit', join(
    own('vacuum-hose', hose, [['hose', DARK]]),
    own('side-arm', arm),
    flask,
    own('drop', dropS),
    own('stem', stem),
    own('stopper', stopper),
    own('holder', holder),
    own('cup', cupFill + water + cupShine + cupLine + rim, [], g.grad('cup-gradient', [fx - 16, -47, fx + 16, -19], GLASS)),
    own('membrane', membrane),
    own('clamp', clamp)))
}

// ---------------------------------------------------------------------------------------------------------------------
// Anaerobic jar: a lidded glass jar with a stack of agar plates and a gas pack inside, its lid held down by a steel clamp
// with a screw in the accent, and a "no oxygen" mark: O2 in a circle struck through in red.
// (SiliCoDraw: a pale jar with four cream plates, a white indicator strip, a grey lid and clamp. Here the plates are the
// petri dish part with agar, the strip a gas-generating sachet of paper, the lid in the accent. The plates carry no
// colonies: the colony orange would lie too near the red of the mark.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.6, [0, 0]), S = 84, u = S / 100, jy = 6
  const w = objW(S * g.k), cw = Math.max(2, w * 0.75), fine = Math.max(1.5, w * 0.45)
  const jar = glassware(g, { x: -1, y: jy, size: S, kind: 'jar', liquid: null, level: 0, id: 'jar' })
  const top = jy - 50 * u // top of the lid
  // the clamp: two uprights from the lid's ends to a bar above, a screw pressing on the lid's middle
  const clamp = tubing(g, [L(g, [[-1 - 32, top + 6], [-1 - 32, top - 6], [-1 + 32, top - 6], [-1 + 32, top + 6]])], 2.6, METAL, cw)
  const screw = g.path(rrect(g, -1 - 2, top - 6, -1 + 2, top + 1, 0.8), METAL.shadow, METAL.outline, fine) + g.path(rrect(g, -1 - 7, top - 12, -1 + 7, top - 6.5, 2.5), ACCENT.base, ACCENT.outline, cw)
  const plates = [36, 26, 16, 6].map((y, i) => petriDish(g, { x: -9, y: jy + y - 6, size: 40, view: 'angled', fill: 'agar', id: `plate${i + 1}` }))
  const sachet = g.path(rrect(g, 15, jy - 4, 27, jy + 36, 1.5), PAPER.base, PAPER.outline, cw) +
    [8, 14, 20].map((dy) => g.line([[18, jy + dy], [24, jy + dy]], PAPER.small, f(fine))).join('') + g.line([[15, jy + 1], [27, jy + 1]], PAPER.outline, f(fine))
  const mx = -9, my = jy - 20, mr = 9
  const h = 6.2, text = 'O_2', tw = textWidth(text) * h
  if (tw > mr * 1.6) console.log('O2 is too wide for its mark')
  const o2 = lettering(g, { x: mx, y: my, h, text, colour: INK, id: 'O2' })
  const mark = g.circle(mx, my, mr, PAPER.base, GHS.outline, cw * 1.15) + o2.body + g.line([[mx - mr * 0.7, my + mr * 0.7], [mx + mr * 0.7, my - mr * 0.7]], GHS.outline, f(cw * 1.15))
  icon('Anaerobic jar', join(
    jar,
    ...plates,
    own('gas-pack', sachet),
    own('no-oxygen', mark, [['no-oxygen', GHS]]),
    own('clamp', clamp + screw)))
}

// ---------------------------------------------------------------------------------------------------------------------
// Chemostat: fresh medium is pumped from a reservoir bottle by a peristaltic pump into a stirred culture vessel of
// bacteria, where it drips in; an overflow tube at the level of the culture carries the same volume out to a waste flask.
// (SiliCoDraw: a yellow medium, a green culture with pale dots, a pump drawn as a circle with a play sign. Here the medium
// is the culture medium of the conventions (phenol red) in reservoir, vessel and waste alike, the cells the bacterium part,
// the pump a steel housing with its rotor of three rollers on a hub in the accent; the lid and caps in the accent.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.95, [0, -1.5]), w = objW(50 * g.k), cw = Math.max(2, w * 0.75), fine = Math.max(1.5, w * 0.45)
  const vx = -4, vy = 18, VS = 50, vu = VS / 100 // vessel: body ±18 from y vy-19 to vy+25; lid from vy-25 to vy-18.5
  const vessel = glassware(g, { x: vx, y: vy, size: VS, kind: 'jar', liquid: MEDIUM, level: 0.62, id: 'culture-vessel' })
  const reservoir = glassware(g, { x: -35, y: -20, size: 34, kind: 'bottle', liquid: MEDIUM, level: 0.65, label: false, id: 'reservoir' })
  const waste = glassware(g, { x: 35, y: 33, size: 26, kind: 'flask', liquid: MEDIUM, level: 0.3, id: 'waste' })
  // feed line: out of the reservoir's cap, over the top through the pump, down through the lid into the vessel
  const feed = [[-35, -37], [-35, -39.2], [-31.5, -40], [-8, -40], [-5, -38.5], [-4, -35], [-4, vy - 23]]
  const surface = vy + 50 * vu - 0.62 * (50 * vu - -34 * vu) // the culture's level
  const over = [[vx + 17, surface - 1], [30, surface - 1], [35, surface + 3], [35, 21.5]]
  const tubes = tubing(g, [curve(g, feed), curve(g, over)], 2.4, PLASTIC, fine)
  const pump = g.path(rrect(g, -21, -47, -7, -33, 3), 'url(#pump-gradient)', METAL.outline, cw) + g.circle(-14, -40, 4.6, METAL.base, METAL.outline, fine) +
    [0, 120, 240].map((t) => g.circle(-14 + 2.6 * Math.cos(((t - 90) * Math.PI) / 180), -40 + 2.6 * Math.sin(((t - 90) * Math.PI) / 180), 1.2, METAL.shadow, METAL.outline, fine * 0.7)).join('') +
    g.circle(-14, -40, 1.3, ACCENT.base, ACCENT.outline, fine * 0.7)
  const dropS = drop(g, -4, vy - 13.5, 5.5, MEDIUM, fine)
  const cells = [[-14, surface + 6, 20], [2, surface + 4.5, -25], [-8, surface + 12, -10], [7, surface + 12.5, 30], [-16, surface + 17, 70]]
    .map(([x, y, t], i) => bacterium(g, { x, y, size: 8, turn: t, flagellum: false, granules: false, id: `bacterium${i + 1}` }))
  const stir = g.path(rrect(g, vx - 6, vy + 20.5, vx + 6, vy + 23.4, 1.45), PAPER.base, PAPER.outline, fine)
  icon('Chemostat', join(
    reservoir,
    vessel,
    ...cells,
    own('stir-bar', stir),
    own('drop', dropS),
    waste,
    own('tubing', tubes),
    own('pump', pump, [['pump-hub', ACCENT]], g.grad('pump-gradient', [-21, -47, -7, -33], METAL))))
}

check()
console.log('written to', OUT)
