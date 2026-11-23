// Shared parts of the redrawn icons, group "clinical": what the icons of SiliCoDraw's "Aging & hallmarks" category have in
// common, designed to be reused by "Medicine & clinical". Medicines (a pill by its form, a pill organiser, blister pack or
// bottle, an injection pen, and a named drug as its formula with its pill), people in the states the clinic sees (standing,
// walking, sitting, rising from a chair, stooped, falling, lying), aids (stick, walking frame, chair, wheelchair, glasses,
// hearing aid), clinical devices (blood pressure cuff, tape measure, bathroom scale, DEXA scanner, CT or MRI ring, clipboard
// with a test sheet, pencil), dials (gauge with zones, aneroid gauge), timepieces (clock, stopwatch, 24-hour dial with sun
// and moon, hourglass), a drop of blood, the charts of ageing (survival, mortality, healthspan, trial, hormone curves,
// population pyramid …) and a few marks (male and female signs, heart, dizziness, motion). Each part is a function
// `part(g, { x, y, size, turn, id, w, flip, ...options })` that returns { defs, body, parts }, drawn in the frame `g` of
// `page()` (../cellkit.mjs) and designed in a box of local units fitted so that its longer side is `size` (in g's units,
// outline included). `turn` turns it about x, y (degrees, clockwise); `flip` mirrors it; `w` overrides the main outline in
// page pixels (`objW` of lab.mjs otherwise); every id inside starts with `id`. Shapes from SiliCoDraw
// (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see ../../LICENSE-SiliCoDraw.txt), its "Aging &
// hallmarks" icons read by hand as text, and drawn again in the soft look of icon-drawings/STYLE.md. The machinery of kinds
// (frame, ctx, draw) is imported from organisms.mjs, so a person here is drawn with the same tools as `human` there.
// Promoted: the stopwatch of ../lab/lb05.mjs (Stopwatch), the clock face of ../assays/tbO.mjs (Proteomic ageing clock) and the
// drop of ../anatomy/anE.mjs (Blood drop), keeping their looks. Reused, not redrawn: `plot` of assays.mjs (the charts are its
// axes and series with a few more kinds laid in), `skeletal` and `formula` of formula.mjs (the drugs' structures, data here),
// lab.mjs's materials, organisms.mjs's people palettes, wood, sun and sand, tissue.mjs's blood red, molecules.mjs's glucose.
//
// ---------- Conventions of the clinic ----------
// Medicines. Pills are objects: flat, with a two-stop gradient and one highlight only from 80 px on the page, never glossed.
//   Their colours are soft and distinct, never a brand's (PILLS): white (a warm grey, l 0.975, the default tablet), cream,
//   yellow, orange, pink, red, green, blue, violet, and an amber softgel. A capsule is two halves, its colour (blue by
//   default) and white. Tablets are scored as the real tablet is (score 1: in half, 2: in quarters, 0: none).
// A named drug (`drug`). Its skeletal formula from formula.mjs's data (O red, N blue, S yellow; sterols gold) with, at its
//   lower right, the pill it is taken as: a white tablet for prescription tablets (metformin scored in half, captopril in
//   quarters, acarbose), a capsule for compounds tested as supplements or in diets (NDGA, urolithin A, quercetin,
//   17α-oestradiol), an amber softgel for oils and carotenoids (astaxanthin). A drug without a structure worth drawing (a
//   peptide, an antibody, a large macrolide) is its pill or pen with its target from the biology parts. Letters on a pill
//   only for the usual abbreviations (D, Q), through letters.mjs.
// Devices are lab.mjs's objects: METAL casings and frames, GLASS lenses and windows, PLASTIC trays and caps, PAPER faces and
//   sheets, DARK rubber (tyres, grips, tubes, bulbs) and the one ACCENT blue for cuffs, buttons, seats and bands; INK for
//   ticks, hands and needles. Wood (chairs, the hourglass, a clipboard's board) is organisms.mjs's WOOD family; a tape
//   measure is yellow (TAPE, rich 95), x-rays a pale mauve fan (XRAY, 320°, flat, no opacity). Shading as lab.mjs: a
//   gradient and one highlight from 80 px, flat below; fine lines (ticks, ridges, spokes) left out below 60 px.
// Dials. Zones run green (SAFE, deep 150), amber (rich 75), red (deep 25), 50° and more apart; the needle is INK on a DARK
//   hub. Clock faces PAPER with INK ticks and hands (as the approved Proteomic ageing clock); a share of the face (a
//   biological age, an eating window) is a wedge in AGE (soft rose, the clock's) or in a zone colour. The 24-hour dial: day
//   a pale yellow (DAY) with organisms.mjs's sun, night a deep blue (NIGHT) with a pale moon and stars.
// People. Seen from the side, facing RIGHT (`flip` for left), built as `human` is: SKIN head and hands, clothes in ACCENT (or
//   any palette as `pal`), the far arm and leg in the shadow tone of the clothes, SHOE shoes, hair dark brown, grey for the
//   old (`old: true`), one INK eye. Limbs are tubes with round joins, the body a thicker tube. No faces beyond the eye.
//   Standing figures from the front are `human` of organisms.mjs ('adult', 'older', 'infant'), not redrawn here.
// Blood. The drop is the approved Blood drop: tissue.mjs's RED, glossed as a closed round body. Blood in tubes is lab.mjs's.
// Charts are pictures of data: flat, no gloss, as assays.mjs's plots (no card unless asked, axes in INK with arrows, as
//   SiliCoDraw draws them). Series in assays.mjs's SERIES order (ACCENT, red, green, amber, violet); an area under a curve in
//   the base tone of its series, a band between two curves in the base tone of the better one, a dashed curve for the old
//   or expected course, dashed thresholds in GRID, shaded spans of the x axis (night, the oldest old) in ZONE (pale grey).
// Marks are flat strokes in INK unless a colour is passed (the male and female signs, motion lines, dizziness).
// What is glossed: only closed round biological bodies (the drop of blood; cells and organs come from their own parts).
//   Pills, devices, charts, people's clothes and furniture are flat.
// Sizes. As lab.mjs: outlines `objW(px)` (3.5 up to 100 px, 5 at 200, 8.5 on a full page), fine lines about half and left
//   out below 60 px. Inside an icon a pill reads from about 14 px, a person from about 40 px, a chart from about 50 px.
import { glossOn, smoothD } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex } from '../colour.mjs'
import { f, strokeScale } from '../shapes.mjs'
import { gloss, glossTones, pathPoints } from './surfaces.mjs'
import { ACCENT, DARK, GLASS, INK, LIQUIDS, METAL, PAPER, PLASTIC, SAFE, objW } from './lab.mjs'
import { GRID, MUTED, SERIES, plot } from './assays.mjs'
import { HAIR, SHOE, SKIN, STICK, SUN, WOOD, scene, tone } from './organisms.mjs'
import { formula, go, polygon, skeletal } from './formula.mjs'
import { glucose } from './molecules.mjs'
import { RED } from './tissue.mjs'
import { fits, lettering } from './letters.mjs'

// ---------- palettes ----------
const grey = (h, l, c = 0.008) => ({
  light: toHex({ l: Math.min(0.997, l + 0.03), c: c * 0.5, h }),
  base: toHex({ l, c, h }),
  shadow: toHex({ l: l - 0.05, c: c * 1.2, h }),
  small: toHex({ l: l - 0.11, c: Math.min(0.0115, c * 1.3), h }),
  outline: toHex({ l: 0.58, c: 0.011, h }),
})
/** Pills: soft distinct colours, never a brand's. */
export const PILLS = {
  white: grey(95, 0.975, 0.007), cream: tone(85, 0.93, 0.045), yellow: rich(95), orange: tone(60, 0.84, 0.11), pink: tone(355, 0.86, 0.07),
  red: deep(25), green: tone(150, 0.84, 0.08), blue: tone(240, 0.84, 0.07), violet: tone(300, 0.82, 0.07), amber: tone(68, 0.8, 0.12),
}
export const BOTTLE = tone(62, 0.72, 0.12) // an amber pharmacy bottle
export const TAPE = rich(95)
export const XRAY = tone(320, 0.93, 0.045)
export const ZONES = { good: SAFE, mid: rich(75), bad: deep(25) }
export const AGE = soft(hueOf('#c8618a')) // the share of a clock's face, as the approved Proteomic ageing clock
export const DAY = tone(225, 0.94, 0.035), NIGHT = tone(280, 0.42, 0.07), MOON = grey(95, 0.93, 0.011), STAR = rich(95)
export const SAND_GRAIN = rich(98)
export const BOARD = tone(45, 0.72, 0.055) // a clipboard's hardboard
export const PENCIL = rich(90), PENCIL_WOOD = tone(65, 0.88, 0.05), ERASER = tone(0, 0.82, 0.08)
export const HEART_RED = deep(15)
export const ZONE = grey(250, 0.95, 0.006)
export { ACCENT, DARK, GLASS, INK, METAL, PAPER, PLASTIC, SKIN, HAIR, SHOE, STICK, WOOD, SERIES, GRID, MUTED }


import { rad, P2, lin, sw, fillD, strokeD, boxOf, group, join, uniq, mixHex, rng, bez, chain, band, smoothPts, ellPts, mirror, frame, mapD, curveD, lineD, ellD, ctx, draw } from './organisms.mjs' // the machinery of kinds (frame, ctx, draw), shared with organisms.mjs


// ---------- helpers of this module ----------
/** Points along an arc in local units (degrees clockwise from the right, as on the page). */
const arcPts = (cx, cy, r, a0, a1, n = 24) => Array.from({ length: n + 1 }, (_, i) => { const t = rad(a0 + ((a1 - a0) * i) / n); return [cx + r * Math.cos(t), cy + r * Math.sin(t)] })
/** A ring sector (or a pie wedge when r0 is 0) as a closed path in local units. */
const sectorD = (c, cx, cy, r0, r1, a0, a1, n = 24) => c.L([...arcPts(cx, cy, r1, a0, a1, n), ...(r0 ? arcPts(cx, cy, r0, a1, a0, n) : [[cx, cy]])]) + 'Z'
/** Letters centred on a local point, `h` local units high, drawn only when they are large enough to read. */
const letter = (c, u, v, h, text, colour, sub = 'letter') => {
  const [x, y] = c.F.at([u, v]), H = h * c.F.s
  return fits(c.g, H) ? lettering(c.g, { x, y, h: H, text, colour, id: `${c.id}-${sub}` }).body : ''
}
/** The highlight of an object from 80 px on: one soft ellipse in its light tone. */
const shine = (c, u, v, rx, ry, rot, pal) => (c.shaded ? c.fill(c.E(u, v, rx, ry, rot), pal.light) : '')
/** Several drawings as one. */
export const joinParts = (...ps) => ({ defs: ps.map((p) => p.defs ?? '').join(''), body: ps.map((p) => p.body ?? '').join(''), parts: uniq(ps.flatMap((p) => p.parts ?? [])) })

// =====================================================================================================================
// Pill, by its form, `size` its longer side. Kinds: 'tablet' (round, face on, scored), 'tablet side' (a round tablet seen at
// a slant, its edge showing, as SiliCoDraw draws metformin's), 'caplet' (an oblong tablet), 'capsule' (two halves),
// 'softgel' (an oval gel capsule, amber). Options: pal (PILLS.white for tablets, PILLS.blue for a capsule, PILLS.amber for a
// softgel), pal2 (the capsule's other half, PILLS.white), score (tablets: 0 none, 1 in half, 2 in quarters; 1), letter (a
// short abbreviation lettered on a tablet or capsule when it fits: 'D', 'Q').
// Used by: Rapamycin, Metformin, Acarbose, Dasatinib + quercetin, Senolytic, Senomorphic drug, Geroscience trial,
//   Polypharmacy (inside the organiser), Captopril, NDGA, Urolithin A, 17α-Estradiol, Astaxanthin, Intervention Testing
//   Program; in "Medicine & clinical" every icon of a medicine.
// Example: pill(g, { x: 0, y: 0, size: 30, kind: 'capsule', turn: -30, id: 'capsule' })
// =====================================================================================================================
const capsuleHalf = (k, L = 48, r = 21) => `M0,${-r} L${k * (L - r)},${-r} C${k * (L - r + r * 0.552)},${-r} ${k * L},${-r * 0.552} ${k * L},0 C${k * L},${r * 0.552} ${k * (L - r + r * 0.552)},${r} ${k * (L - r)},${r} L0,${r} Z`
const PILL = {
  tablet: {
    box: [-50, -50, 50, 50],
    draw: (c, { pal = PILLS.white, score = 1, letter: lt }) => {
      let s = c.body('tablet', c.C(0, 0, 48), pal) + (c.big ? c.line(c.C(0, 0, 39), pal.shadow, c.lw * 1.2) : '')
      if (score >= 1) s += c.line(c.L([[-30, 0], [30, 0]]), pal.outline, c.lw * 1.4)
      if (score >= 2) s += c.line(c.L([[0, -30], [0, 30]]), pal.outline, c.lw * 1.4)
      s += shine(c, -20, -26, 12, 5, -35, pal)
      if (lt && !score) s += letter(c, 0, 0, 34, lt, pal.outline)
      return { body: `<g id="${c.id}-tablet">${s}</g>`, parts: [['tablet', pal]] }
    },
  },
  'tablet side': {
    box: [-50, -28, 50, 28],
    draw: (c, { pal = PILLS.white, score = 1 }) => {
      const K = 0.552
      let s = c.body('edge', c.M(`M-48,-6 L-48,4 C-48,${4 + 20 * K} ${-48 * K},24 0,24 C${48 * K},24 48,${4 + 20 * K} 48,4 L48,-6 Z`), pal, { tone: 'shadow' })
      s += c.body('face', c.E(0, -6, 48, 20), pal)
      if (score >= 1) s += c.line(c.L([[-34, -6], [34, -6]]), pal.outline, c.lw * 1.4)
      if (score >= 2) s += c.line(c.L([[0, -20], [0, 8]]), pal.outline, c.lw * 1.4)
      s += shine(c, -22, -14, 12, 3.5, -8, pal)
      return { body: `<g id="${c.id}-tablet">${s}</g>`, parts: [['tablet', pal]] }
    },
  },
  caplet: {
    box: [-50, -23, 50, 23],
    draw: (c, { pal = PILLS.cream, score = 1 }) => {
      let s = c.body('caplet', c.R(-48, -21, 96, 42, 21), pal)
      if (score >= 1) s += c.line(c.L([[0, -13], [0, 13]]), pal.outline, c.lw * 1.4)
      s += c.big ? c.line(c.L([[-34, -10], [-14, -10]]), pal.light, c.lw * 1.6) : ''
      return { body: `<g id="${c.id}-caplet">${s}</g>`, parts: [['caplet', pal]] }
    },
  },
  capsule: {
    box: [-50, -23, 50, 23],
    draw: (c, { pal = PILLS.blue, pal2 = PILLS.white, letter: lt }) => {
      const all = c.R(-48, -21, 96, 42, 21)
      let s = c.fill(all, pal.outline, pal.outline, c.w * 2)
      s += `<g id="${c.id}-cap">${c.body('cap', c.M(capsuleHalf(1)), pal, { outline: false })}${c.big ? c.line(c.L([[12, -11], [32, -11]]), pal.light, c.lw * 1.8) : ''}</g>`
      s += `<g id="${c.id}-body">${c.body('body', c.M(capsuleHalf(-1)), pal2, { outline: false })}${c.big ? c.line(c.L([[-32, -11], [-12, -11]]), pal2.light, c.lw * 1.8) : ''}</g>`
      s += c.line(c.L([[0, -21], [0, 21]]), pal.outline, c.w * 0.8)
      if (lt) s += letter(c, 24, 1, 22, lt, pal.outline, 'letter')
      return { body: s, parts: [['capsule', pal], ['capsule body', pal2]] }
    },
  },
  softgel: {
    box: [-50, -31, 50, 31],
    draw: (c, { pal = PILLS.amber }) => {
      let s = c.body('softgel', c.E(0, 0, 48, 29), pal)
      if (c.big) s += c.line(c.O([[-40, 2], [0, 6], [40, 2]]), pal.shadow, c.lw)
      s += c.fill(c.E(-18, -13, c.shaded ? 14 : 11, c.shaded ? 6 : 4.5, -12), pal.light)
      return { body: `<g id="${c.id}-softgel">${s}</g>`, parts: [['softgel', pal]] }
    },
  },
}
export function pill(g, opts) { return draw(PILL, 'pill', g, { kind: 'tablet', ...opts }) }

// =====================================================================================================================
// Medicine pack, `size` its longer side. Kinds: 'organiser' (a seven-day pill organiser, lids open, every compartment holding
// a tablet, a capsule and a caplet; `spill` adds a few pills in front), 'blister' (a foil card of 2 × 5 tablets under domes,
// `taken` of them pressed out), 'bottle' (an amber pharmacy bottle with a white child-proof cap and a paper label). Options:
// pal (the pills of a blister, PILLS.white), lid (the organiser's lids, ACCENT), days (7), taken (2), spill (false).
// Used by: Polypharmacy (organiser, spill); in "Medicine & clinical": prescriptions, adherence, deprescribing.
// Example: pillPack(g, { x: 0, y: 0, size: 80, kind: 'organiser', spill: true, id: 'pill-organiser' })
// =====================================================================================================================
/** A small pill inside a pack: a tablet, a capsule or a caplet, flat, with a fine outline; a dot when tiny. */
const smallPill = (c, kind, u, v, r, rot, pal, pal2 = PILLS.white) => {
  const ow = Math.max(0.8, c.lw * 0.7)
  if (c.tiny) return c.fill(c.C(u, v, r * 0.9), pal.base)
  if (kind === 'tablet') return c.fill(c.C(u, v, r), pal.base, pal.outline, ow)
  if (kind === 'caplet') return c.fill(c.E(u, v, r * 1.5, r * 0.85, rot), pal.base, pal.outline, ow)
  const a = rad(rot), dx = Math.cos(a) * r * 0.75, dy = Math.sin(a) * r * 0.75, R = r * 0.8
  return c.tube(c.L([[u - dx, v - dy], [u, v]]), R * 2, pal2, { w: ow, cap: 'round' }) + c.tube(c.L([[u, v], [u + dx, v + dy]]), R * 2, pal, { w: ow, cap: 'round' })
}
const PACK = {
  organiser: {
    box: [-50, -40, 50, 44],
    draw: (c, { lid = ACCENT, days = 7, spill = false }) => {
      const W = 96 / days, x0 = -48
      let lids = '', tray = '', pills = ''
      for (let i = 0; i < days; i++) {
        const x = x0 + i * W
        lids += c.body(`lid-${i + 1}`, c.R(x + 0.8, -38, W - 1.6, 26, 3), lid, { w: c.lw * 1.3, flat: true }) + (c.big ? c.fill(c.C(x + W / 2, -31, 1.6), lid.small) : '')
      }
      tray += c.body('tray', c.R(-48, -14, 96, 46, 4), PLASTIC) + c.fill(c.R(-47, 22, 94, 9, 3), PLASTIC.shadow)
      for (let i = 0; i < days; i++) {
        const x = x0 + i * W, cx = x + W / 2
        tray += c.fill(c.R(x + 1.4, -10, W - 2.8, 30, 2.5), PLASTIC.light, PLASTIC.small, c.lw)
        pills += smallPill(c, 'tablet', cx - 1, -4, 2.8, 0, PILLS.white) + smallPill(c, i % 2 ? 'caplet' : 'capsule', cx, 4.5, 2.6, i % 2 ? -30 : 55, i % 2 ? PILLS.yellow : PILLS.green)
        pills += smallPill(c, 'tablet', cx + 0.6, 13, 2.5, 0, [PILLS.pink, PILLS.white][i % 2])
      }
      if (spill) pills += smallPill(c, 'capsule', -30, 38, 3.2, 20, PILLS.green) + smallPill(c, 'tablet', -17, 39, 3, 0, PILLS.white) + smallPill(c, 'caplet', 22, 38.5, 3, -15, PILLS.yellow) + smallPill(c, 'tablet', 35, 39, 2.8, 0, PILLS.pink)
      return { body: `<g id="${c.id}-lids">${lids}</g><g id="${c.id}-tray">${tray}</g><g id="${c.id}-pills">${pills}</g>`, parts: [['lids', lid], ['tray', PLASTIC], ['white pills', PILLS.white], ['green pills', PILLS.green], ['yellow pills', PILLS.yellow], ['pink pills', PILLS.pink]] }
    },
  },
  blister: {
    box: [-50, -31, 50, 31],
    draw: (c, { pal = PILLS.white, taken = 2 }) => {
      let s = `<g id="${c.id}-foil">${c.body('foil', c.R(-48, -29, 96, 58, 5), METAL)}`
      if (c.big) s += c.line(c.L([[-48, 0], [48, 0]]), METAL.shadow, c.lw)
      s += '</g><g id="' + c.id + '-pills">'
      let k = 0
      for (const v of [-14, 14]) for (const u of [-36, -18, 0, 18, 36]) {
        const gone = k++ >= 10 - taken
        if (gone) s += c.fill(c.C(u, v, 9), METAL.shadow, METAL.outline, c.lw) + (c.big ? c.line(c.L([[u - 5, v - 2], [u - 1, v + 1], [u + 3, v - 3], [u + 6, v + 1]]), METAL.outline, c.lw) : '')
        else s += c.fill(c.C(u, v, 10), GLASS.base, GLASS.outline, c.lw) + c.fill(c.C(u, v, 7.2), pal.base, pal.outline, c.lw * 0.9) + (c.big ? c.line(c.L([[u - 4, v], [u + 4, v]]), pal.outline, c.lw * 0.8) : '')
      }
      return { body: s + '</g>', parts: [['foil', METAL], ['pills', pal]] }
    },
  },
  bottle: {
    box: [-32, -50, 32, 50],
    draw: (c, { pal = BOTTLE }) => {
      let s = `<g id="${c.id}-bottle">${c.body('bottle', c.M('M-24,-26 L24,-26 C27,-26 29,-24 29,-21 L29,42 C29,46 26,48 22,48 L-22,48 C-26,48 -29,46 -29,42 L-29,-21 C-29,-24 -27,-26 -24,-26 Z'), pal)}${shine(c, -20, 10, 3, 18, 0, pal)}</g>`
      s += `<g id="${c.id}-label">${c.body('label', c.R(-29, -8, 58, 34, 0), PAPER, { w: c.lw * 1.2 })}${c.big ? c.line(c.L([[-20, 0], [20, 0]]) + ' ' + c.L([[-20, 8], [12, 8]]) + ' ' + c.L([[-20, 16], [16, 16]]), PAPER.small, c.lw * 1.2) : ''}</g>`
      s += `<g id="${c.id}-cap">${c.body('cap', c.R(-30, -48, 60, 23, 4), PLASTIC)}${c.big ? c.line([-21, -12, -3, 6, 15, 24].map((u) => c.L([[u, -43], [u, -30]])).join(' '), PLASTIC.small, c.lw) : ''}</g>`
      return { body: s, parts: [['bottle', pal], ['label', PAPER], ['cap', PLASTIC]] }
    },
  },
}
export function pillPack(g, opts) { return draw(PACK, 'pillPack', g, { kind: 'organiser', ...opts }) }

// =====================================================================================================================
// Injection pen (a GLP-1 agonist, insulin), lying with the needle at the left, `size` its length. Options: pal (the dose
// dial and button, ACCENT), liquid (a lab liquid or palette, 'water'), level (share of the window filled, 0.7), cap (a cap
// over the needle instead of the needle, false).
// Used by: GLP-1 agonist; in "Medicine & clinical": insulin, injectable drugs.
// Example: injectionPen(g, { x: 0, y: 0, size: 70, turn: -10, id: 'pen' })
// =====================================================================================================================
const PEN = {
  pen: {
    box: [-50, -12, 50, 12],
    draw: (c, { pal = ACCENT, liquid = 'water', level = 0.7, cap = false }) => {
      const liq = typeof liquid === 'string' ? LIQUIDS[liquid] : liquid
      let s = ''
      if (!cap) s += `<g id="${c.id}-needle">${c.line(c.L([[-50, 0], [-42, 0]]), METAL.outline, Math.max(1.2, c.lw))}${c.body('hub', c.R(-43, -3.5, 6, 7, 1.5), PLASTIC, { w: c.lw })}</g>`
      s += `<g id="${c.id}-barrel">${c.body('barrel', c.M('M-36,-8 L8,-8 L8,8 L-36,8 C-38.5,8 -40,6.5 -40,4 L-40,-4 C-40,-6.5 -38.5,-8 -36,-8 Z'), PLASTIC)}`
      s += c.fill(c.R(-31, -4, 26, 8, 2), GLASS.base, GLASS.outline, c.lw) + c.fill(c.R(-31, -4, 26 * level, 8, 2), liq.small) + (c.big ? c.line(c.L([[-28, -2.2], [-10, -2.2]]), '#FFFFFF', c.lw) : '') + '</g>'
      s += `<g id="${c.id}-dial">${c.body('dial', c.R(8, -10.5, 24, 21, 3), pal)}${c.big ? c.line([13, 18, 23, 28].map((u) => c.L([[u, -9], [u, 9]])).join(' '), pal.outline, c.lw) : ''}${c.body('button', c.R(32, -7, 12, 14, 3), pal, { tone: 'shadow', w: c.w * 0.9 })}</g>`
      if (cap) s = `<g id="${c.id}-cap">${c.body('cap', c.R(-50, -9.5, 18, 19, 5), PLASTIC)}${c.fill(c.R(-46, -12, 12, 3.5, 1.5), pal.base, pal.outline, c.lw)}</g>` + s
      return { body: s, parts: [['barrel', PLASTIC], ['dial', pal], ['liquid', liq]] }
    },
  },
}
export function injectionPen(g, opts) { return draw(PEN, 'injectionPen', g, { kind: 'pen', ...opts }) }

// =====================================================================================================================
// A named drug: its skeletal formula (formula.mjs) with the pill it is taken as at its lower right (the convention at the top
// of this module), `size` the longer side of the pair. Options: molecule (data for `skeletal`: METFORMIN, CAPTOPRIL …;
// without it the pill alone), form (a kind of `pill`, 'tablet'), pal, pal2, score, letter (passed to the pill), pill (the
// pill's size as a share of `size`, 0.38), at ([u, v] the pill's middle in shares of size from the centre, [0.32, 0.3]).
// Used by: Metformin, Captopril, NDGA, Urolithin A, 17α-Estradiol, Astaxanthin, DHEA decline (the molecule alone), and any
//   drug of "Medicine & clinical" with a small structure.
// Example: drug(g, { x: 0, y: 0, size: 90, molecule: METFORMIN, form: 'tablet side', id: 'metformin' })
// =====================================================================================================================
export function drug(g, { x, y, size, turn = 0, id = 'drug', w, molecule, form = 'tablet', pal, pal2, score, letter: lt, pill: share = 0.34, at = [0.34, 0.33] }) {
  const o = { kind: form, ...(pal ? { pal } : {}), ...(pal2 ? { pal2 } : {}), ...(score !== undefined ? { score } : {}), ...(lt ? { letter: lt } : {}) }
  if (!molecule) return pill(g, { x, y, size, turn, id: `${id}-pill`, w, ...o })
  const r = rad(turn), rot = ([u, v]) => [x + (u * Math.cos(r) - v * Math.sin(r)) * size, y + (u * Math.sin(r) + v * Math.cos(r)) * size]
  const [mx, my] = rot([-0.09, -0.09]), [px, py] = rot(at)
  const m = skeletal(g, { x: mx, y: my, size: size * 0.8, turn, id: `${id}-structure`, ...molecule })
  const p = pill(g, { x: px, y: py, size: size * share, turn: turn + (form === 'capsule' || form === 'caplet' || form === 'softgel' ? -30 : 0), id: `${id}-pill`, w, ...o })
  return { defs: m.defs + p.defs, body: `<g id="${id}">${m.body}${p.body}</g>`, parts: uniq([...m.parts, ...p.parts]) }
}

// ---------- drugs as data for `skeletal` (y up, bond lengths, as formula.mjs) ----------
/** Metformin, (CH₃)₂N–C(=NH)–NH–C(=NH)–NH₂: a zigzag of the biguanide with its two imino groups up. */
export const METFORMIN = (() => {
  const m = formula(), n1 = [0, 0], c2 = go(n1, 30), n3 = go(c2, -30), c4 = go(n3, 30), n5 = go(c4, -30)
  m.chain([m.at(n1, 'N'), m.at(c2), m.at(n3, 'N'), m.at(c4), m.at(n5, 'N')])
  m.bond(m.at(c2), m.at(go(c2, 90), 'N'), 2); m.bond(m.at(c4), m.at(go(c4, 90), 'N'), 2)
  m.bond(m.at(n1), m.at(go(n1, 150))); m.bond(m.at(n1), m.at(go(n1, 270)))
  return m.data
})()

/** Captopril: proline (the ring, N at the left, the carboxyl up) acylated by 2-methyl-3-sulfanylpropanoyl (SH). */
export const CAPTOPRIL = (() => {
  const m = formula(), ring = polygon([0, 0], 5, 162), p = (i) => m.data.atoms[i]
  const R = ring.map((q, i) => m.at(q, i === 0 ? 'N' : undefined)) // 162° N, 234° C5, 306° C4, 18° C3, 90° C2 (top)
  m.ring([R[0], R[1], R[2], R[3], R[4]], 'ring')
  const cc = go(p(R[4]), 90); m.bond(R[4], m.at(cc)); m.bond(m.at(cc), m.at(go(cc, 30), 'O'), 2); m.bond(m.at(cc), m.at(go(cc, 150), 'O'))
  const c1 = go(p(R[0]), 162), ca = go(c1, 222), cb = go(ca, 162), sh = go(cb, 102)
  m.bond(R[0], m.at(c1)); m.bond(m.at(c1), m.at(go(c1, 102), 'O'), 2)
  m.chain([m.at(c1), m.at(ca), m.at(cb)]); m.bond(m.at(cb), m.at(sh, 'S')); m.bond(m.at(ca), m.at(go(ca, 282)))
  return m.data
})()

/** The four rings of a steroid (as formula.mjs's cholic acid, y down while built), and their corners, for the two below. */
const steroid = (aKind, bDouble) => {
  const s3 = Math.sqrt(3), dir = (p, deg, l = 1) => [p[0] + l * Math.cos(rad(deg)), p[1] + l * Math.sin(rad(deg))]
  const hex = ([cx, cy]) => Array.from({ length: 6 }, (_, i) => { const t = Math.PI / 6 + (i * Math.PI) / 3; return [cx + Math.cos(t), cy + Math.sin(t)] })
  const A = [0, 0], B = [s3, 0], C = [s3 * 1.5, -1.5], apo = 1 / (2 * Math.tan(Math.PI / 5)), R5 = 1 / (2 * Math.sin(Math.PI / 5)), D = [C[0] + s3 / 2 + apo, C[1]]
  const pent = [144, 216, 288, 0, 72].map((a) => dir(D, a, R5))
  const m = formula(), up = (p) => [p[0], -p[1]], at = (p, el) => m.at(up(p), el)
  m.ring(hex(A).map((p) => at(p)), aKind, aKind === 'aromatic' ? [1, 3, 5] : undefined)
  m.ring(hex(B).map((p) => at(p)), bDouble ? 'aromatic' : 'sterol', bDouble ? [1] : undefined)
  m.ring(hex(C).map((p) => at(p)), 'sterol'); m.ring(pent.map((p) => at(p)), 'sterol')
  return { m, at, dir, hexA: hex(A), c10: [s3 / 2, -0.5], c13: [C[0] + s3 / 2, C[1] - 0.5], c17: pent[2] }
}
/** 17α-Oestradiol: aromatic A ring with the 3-hydroxyl, the 18-methyl on a wedge, the 17-hydroxyl hashed (α, below). */
export const ESTRADIOL_17A = (() => {
  const { m, at, dir, hexA, c13, c17 } = steroid('aromatic', false)
  m.bond(at(hexA[2]), at(dir(hexA[2], 150, 0.95), 'O'))
  m.bond(at(c13), at([c13[0], c13[1] - 0.85]), 'wedge')
  m.bond(at(c17), at(dir(c17, -40, 0.95), 'O'), 'hash')
  return m.data
})()
/** DHEA: 3β-hydroxyl, the 5,6 double bond, methyls at C10 and C13, the 17-ketone. */
export const DHEA = (() => {
  const { m, at, dir, hexA, c10, c13, c17 } = steroid('sterol', true)
  m.bond(at(hexA[2]), at(dir(hexA[2], 150, 0.95), 'O'))
  for (const c of [c10, c13]) m.bond(at(c), at([c[0], c[1] - 0.85]))
  m.bond(at(c17), at(dir(c17, -50, 0.95), 'O'), 2)
  return m.data
})()

/** NDGA (nordihydroguaiaretic acid): two catechols joined by –CH₂–CH(CH₃)–CH(CH₃)–CH₂–. */
export const NDGA = (() => {
  const m = formula(), A = polygon([0, 0], 6, 0).map((q) => m.at(q)), p = (i) => m.data.atoms[i]
  m.ring(A, 'aromatic', [0, 2, 4])
  const c1 = go(p(A[0]), 30), c2 = go(c1, -30), c3 = go(c2, 30), c4 = go(c3, -30), b0 = go(c4, 30)
  const B = polygon([b0[0] + 1, b0[1]], 6, 180).map((q) => m.at(q)) // B[0] is b0
  m.ring(B, 'aromatic', [1, 3, 5])
  m.chain([A[0], m.at(c1), m.at(c2), m.at(c3), m.at(c4), B[0]])
  m.bond(m.at(c2), m.at(go(c2, 270))); m.bond(m.at(c3), m.at(go(c3, 90)))
  m.bond(A[2], m.at(go(p(A[2]), 120), 'O')); m.bond(A[3], m.at(go(p(A[3]), 180), 'O'))
  m.bond(B[3], m.at(go(p(B[3]), 0), 'O')); m.bond(B[4], m.at(go(p(B[4]), 300), 'O'))
  return m.data
})()

/** Urolithin A (3,8-dihydroxy-6H-benzo[c]chromen-6-one): a benzene, the lactone ring (O and C=O) and a second benzene. */
export const UROLITHIN_A = (() => {
  const m = formula(), s3 = Math.sqrt(3)
  const C = polygon([0, 0], 6, 90).map((q, i) => m.at(q, i === 3 ? 'O' : undefined)) // 90 C10a, 150 C10b, 210 C4a, 270 O5, 330 C6, 30 C6a
  const L = polygon([-s3, 0], 6, 30).map((q) => m.at(q)), R = polygon(go([0, 0], 60, s3), 6, 30).map((q) => m.at(q))
  const p = (i) => m.data.atoms[i]
  m.ring(L, 'aromatic', [0, 2, 4]); m.ring(R, 'aromatic', [1, 3, 5]); m.ring(C, 'ring')
  m.bond(C[4], m.at(go(p(C[4]), 330), 'O'), 2)
  m.bond(L[3], m.at(go(p(L[3]), 210), 'O')); m.bond(R[0], m.at(go(p(R[0]), 30), 'O'))
  return m.data
})()

/** Quercetin: the flavonol (A and C rings, the 4-ketone, the 3-hydroxyl), the catechol B ring, hydroxyls at 5 and 7. */
export const QUERCETIN = (() => {
  const m = formula(), s3 = Math.sqrt(3)
  const A = polygon([0, 0], 6, 90).map((q) => m.at(q)) // 90 C8, 150 C7, 210 C6, 270 C5, 330 C4a, 30 C8a
  const C = polygon([s3, 0], 6, 90).map((q, i) => m.at(q, i === 0 ? 'O' : undefined)) // 90 O1, 150 C8a, 210 C4a, 270 C4, 330 C3, 30 C2
  const p = (i) => m.data.atoms[i]
  m.ring(A, 'aromatic', [0, 2, 4]); m.ring(C, 'aromatic', [4])
  const b0 = go(p(C[5]), 30), B = polygon(go(b0, 30), 6, 210).map((q) => m.at(q)) // B[0] at 210 is b0
  m.ring(B, 'aromatic', [0, 2, 4]); m.bond(C[5], B[0])
  m.bond(C[3], m.at(go(p(C[3]), 270), 'O'), 2); m.bond(C[4], m.at(go(p(C[4]), 330), 'O'))
  m.bond(A[1], m.at(go(p(A[1]), 150), 'O')); m.bond(A[3], m.at(go(p(A[3]), 270), 'O'))
  m.bond(B[3], m.at(go(p(B[3]), 30), 'O')); m.bond(B[4], m.at(go(p(B[4]), 90), 'O'))
  return m.data
})()

/** Astaxanthin: two 3-hydroxy-4-oxo-β-ionone rings joined by the polyene chain (nine conjugated double bonds, four methyls). */
export const ASTAXANTHIN = (() => {
  const m = formula(), n = 18, chain = Array.from({ length: n }, (_, k) => [k * Math.cos(rad(30)), k % 2 ? 0.5 : 0])
  const mid = [(chain[0][0] + chain[n - 1][0]) / 2, 0.25], flipP = ([u, v]) => [2 * mid[0] - u, 2 * mid[1] - v]
  const idx = chain.map((q) => m.at(q))
  // bonds of the chain: C7=C8, C8–C9, C9=C10 … alternating, double first
  for (let k = 0; k < n - 1; k++) m.bond(idx[k], idx[k + 1], k % 2 ? 1 : 2)
  for (const k of [2, 6]) { m.bond(idx[k], m.at(go(chain[k], 270))); m.bond(idx[n - 1 - k], m.at(flipP(go(chain[k], 270)))) }
  const ring = (T) => {
    const c6 = T(go(chain[0], 150)), cen = go(go(chain[0], 150), 150, 1)
    const corners = polygon(cen, 6, 330) // 330 C6, 30 C1, 90 C2, 150 C3, 210 C4, 270 C5
    const R = corners.map((q) => m.at(T(q)))
    m.ring(R, 'aromatic', [5])
    m.bond(idx[T === flipP ? n - 1 : 0], m.at(c6))
    const c1 = corners[1]; m.bond(R[1], m.at(T(go(c1, 0)))); m.bond(R[1], m.at(T(go(c1, 60))))
    m.bond(R[3], m.at(T(go(corners[3], 150)), 'O')); m.bond(R[4], m.at(T(go(corners[4], 210)), 'O'), 2); m.bond(R[5], m.at(T(go(corners[5], 270))))
  }
  ring((q) => q); ring(flipP)
  return m.data
})()

// =====================================================================================================================
// A person seen from the side in a pose, facing right (`flip` for left), `size` the longer side of the pose's box. Poses:
// 'stand', 'walk' (mid-stride, arms swinging), 'sit' (on a chair seat at the height of `aid` 'chair'), 'rise' (half-way up
// from a chair, arms folded across the chest: the chair stand test), 'stoop' (frail, bent forward, both hands forward and
// low as on a walking frame), 'fall' (tipping backwards, one foot slipping up, arms flung out), 'lie' (on the back, head at
// the left, as on a scanner table). Options: pal (clothes, ACCENT), skin (SKIN), hair (a palette, false for none; dark brown,
// grey when `old`), old (grey hair, false; 'stoop' is drawn old by default). Built as organisms.mjs's `human`: clothes in one
// palette with the far limbs in its shadow tone, SKIN head and hands, SHOE shoes, one INK eye.
// Used by: Gait speed (walk), Chair stand test (rise), Frailty (stoop, with the walking frame), Fall (fall), Orthostatic
//   hypotension (sit and stand), DEXA scan (lie), Life course and Social isolation (with organisms.mjs's human), Mouse
//   frailty index (no), Comprehensive geriatric assessment (stand); in "Medicine & clinical": patients, exercise, rehabilitation.
// Example: figure(g, { x: 0, y: 0, size: 60, pose: 'walk', old: true, id: 'walker' })
// =====================================================================================================================
// Joints in local units of a person about 96 tall: head [u, v, tilt], torso (neck to hip, a smooth curve), arms and legs
// [shoulder or hip, elbow or knee, hand or ankle] (straight segments), foot (the shoe's turn, degrees clockwise).
const POSES = {
  stand: { box: [-14, -50, 16, 48], head: [2, -40, 0], torso: [[1, -30], [0.5, -13], [0, 3]], near: { arm: [[1, -26], [2.5, -11], [3, 2]], leg: [[0.5, 3], [1.5, 22], [1, 41]], foot: 0 }, far: { arm: [[0, -26], [-2.5, -11], [-2.5, 2]], leg: [[-0.5, 3], [-1.5, 22], [-2.5, 41]], foot: 0 } },
  walk: { box: [-22, -50, 24, 48], head: [3, -40, 0], torso: [[2, -30], [1.5, -13], [0, 3]], near: { arm: [[2, -26], [8, -13], [14, -5]], leg: [[0, 3], [-5, 21], [-12, 39]], foot: 24 }, far: { arm: [[1, -26], [-5, -13], [-9, -3]], leg: [[0, 3], [6, 21], [11, 40]], foot: -10 } },
  sit: { box: [-20, -50, 26, 48], head: [-3, -39, 0], torso: [[-4, -29], [-5.5, -12], [-8, 5]], near: { arm: [[-4, -25], [-1, -10], [9, -2]], leg: [[-7, 5], [13, 6], [14, 41]], foot: 0 }, far: { arm: [[-5, -25], [-3, -10], [7, -3]], leg: [[-8, 4], [11, 5], [11.5, 41]], foot: 0 } },
  rise: { box: [-22, -48, 24, 48], head: [13, -35, 15], torso: [[7, -27], [-1, -15], [-9, -2]], near: { arm: [[6, -25], [13, -15], [3, -16]], leg: [[-8, -1], [8, 5], [6, 41]], foot: 0 }, far: { arm: [[5, -25], [10, -13], [1, -18]], leg: [[-9, -2], [6, 3], [3, 41]], foot: 0 } },
  stoop: { box: [-20, -44, 28, 48], head: [15, -29, 25], torso: [[9, -22], [-2, -16], [-4, 4]], near: { arm: [[6, -20], [14, -11], [23, -6]], leg: [[-3, 3], [1, 22], [-1, 41]], foot: 0 }, far: { arm: [[5, -20], [12, -12], [20, -8]], leg: [[-5, 3], [-6, 22], [-8, 41]], foot: 0 }, old: true },
  fall: { box: [-48, -46, 44, 42], head: [-27, -21, -50], torso: [[-18, -12], [-7, 0], [4, 11]], near: { arm: [[-15, -8], [-8, -25], [1, -35]], leg: [[4, 11], [18, 1], [31, -9]], foot: -55 }, far: { arm: [[-16, -9], [-30, 1], [-40, 11]], leg: [[3, 12], [15, 25], [27, 35]], foot: 10 } },
  lie: { box: [-48, -14, 48, 10], head: [-38.5, -3, -90], torso: [[-28, -1], [-10, -1], [9, -1]], near: { arm: [[-24, 0], [-11, 2], [1, 3]], leg: [[8, -1], [26, -1], [41, -1]], foot: -90 }, far: { arm: [[-24, -2], [-11, -3], [0, -4]], leg: [[8, -2], [26, -2], [41, -2]], foot: -90 } },
}
/** The hair of a head seen from the side (facing right): a cap over the back and the top, in units of the head's radius. */
const HAIR_CAP = [[-0.97, -0.29], [-0.95, -0.95], [-0.48, -1.1], [0, -1.1], [0.48, -1.1], [0.81, -0.86], [0.9, -0.57], [0.48, -0.76], [0, -0.71], [-0.38, -0.29], [-0.52, -0.1], [-0.67, 0.1], [-0.81, 0.24], [-0.95, 0.1], [-0.99, -0.1]]
const rotAbout = ([u, v], [cu, cv], deg) => { const c = Math.cos(rad(deg)), s = Math.sin(rad(deg)); return [cu + (u - cu) * c - (v - cv) * s, cv + (u - cu) * s + (v - cv) * c] }
const FIGURE = Object.fromEntries(Object.entries(POSES).map(([name, P]) => [name, {
  box: P.box,
  draw: (c, { pal = ACCENT, skin = SKIN, old = P.old ?? false, hair = old ? HAIR.grey : HAIR.dark }) => {
    const limb = (pts, width, tone, sub) => c.tube(pts, width, pal, { straight: true, tone, w: c.w * 0.8 })
    const shoe = ([u, v], deg, tone) => c.fill(c.E(...rotAbout([u + 4, v + 2.6], [u, v], deg), 6.4, 3.1, deg), tone === 'shadow' ? SHOE.shadow : SHOE.base, SHOE.outline, c.lw * 1.2)
    const hand = ([u, v], tone) => c.fill(c.C(u, v, 3.3), skin[tone], skin.outline, c.lw * 1.2)
    const tLimb = 9.5, tArm = 6.8, tBody = 21
    let s = `<g id="${c.id}-far">${limb(P.far.leg, tLimb, 'shadow')}${shoe(P.far.leg[2], P.far.foot, 'shadow')}${limb(P.far.arm, tArm, 'shadow')}${hand(P.far.arm[2], 'shadow')}</g>`
    s += `<g id="${c.id}-body">${c.tube(P.torso, tBody, pal, { w: c.w * 0.85 })}${limb(P.near.leg, tLimb + 0.5, 'base')}${c.big ? c.line(P.torso.map(([u, v]) => [u + 5, v]).slice(0, 2), pal.light, c.lw * 1.3) : ''}</g>`
    s += `<g id="${c.id}-shoes">${shoe(P.near.leg[2], P.near.foot, 'base')}</g>`
    s += `<g id="${c.id}-arm">${limb(P.near.arm, tArm, 'base')}${hand(P.near.arm[2], 'base')}</g>`
    const [hu, hv, tilt] = P.head, r = 8.6
    let h = c.fill(c.C(...rotAbout([hu - 1.5, hv + 8.5], [hu, hv], tilt), 3.6), skin.base, skin.outline, c.w * 0.8) // the neck
    h += c.body('head', c.C(hu, hv, r), skin, { w: c.w * 0.9 })
    if (hair) h += c.body('hair', c.S(HAIR_CAP.map(([a, b]) => rotAbout([hu + a * r, hv + b * r], [hu, hv], tilt))), hair, { w: c.lw, flat: true })
    h += c.eye(...rotAbout([hu + 0.5 * r, hv - 0.05 * r], [hu, hv], tilt), 1.4)
    s += `<g id="${c.id}-head">${h}</g>`
    return { body: s, parts: [['clothes', pal], ['skin', skin], ...(hair ? [['hair', hair]] : []), ['shoes', SHOE]] }
  },
}]))
export function figure(g, { pose, ...opts }) { return draw(FIGURE, 'figure', g, { id: 'person', ...opts, kind: pose ?? opts.kind ?? 'stand' }) }

// =====================================================================================================================
// Aids and furniture, seen from the side (facing right, as the people), `size` the longer side. Kinds: 'stick' (a walking
// stick with a crook and a rubber tip), 'walking frame' (a Zimmer frame with front wheels, the far side in the shadow
// tone, grips at the back), 'chair' (a wooden chair, back at the left; its seat is where `figure` 'sit' sits when both have
// the same size and place), 'wheelchair', 'glasses' (spectacles from the front, the arms going back), 'hearing aid'
// (behind-the-ear: the case, its tube over the top of the ear and the dome; place it on anatomy.mjs's outer ear). Options:
// pal (the stick STICK, chair WOOD, wheelchair seat ACCENT, glasses' frame DARK, hearing aid METAL).
// Used by: Walking frame, Frailty, Life course (stick), Chair stand test, Orthostatic hypotension (chair), Glasses, Hearing
//   aid, Comprehensive geriatric assessment; in "Medicine & clinical": disability, rehabilitation, vision and hearing.
// Example: aid(g, { x: 20, y: 10, size: 50, kind: 'walking frame', id: 'frame' })
// =====================================================================================================================
const AID = {
  stick: {
    box: [-11, -50, 11, 50],
    draw: (c, { pal = STICK }) => ({
      body: `<g id="${c.id}-stick">${c.tube(c.M('M-8,-41 C-8,-50 4,-50 4,-41 L4,44'), 4.2, pal, { w: c.lw * 1.2 })}${c.body('tip', c.R(0.6, 43, 6.8, 6.5, 2), DARK, { w: c.lw })}</g>`,
      parts: [['stick', pal], ['rubber', DARK]],
    }),
  },
  'walking frame': {
    box: [-27, -30, 27, 33],
    draw: (c, { pal = METAL }) => {
      const T = 3.6, frame = (dx, dy) => c.L([[-20 + dx, 28 + dy], [-20 + dx, -21 + dy]]) + ' ' + c.M(`M${-20 + dx},${-21 + dy} C${-20 + dx},${-24 + dy} ${-18 + dx},${-25 + dy} ${-15 + dx},${-25 + dy} L${13 + dx},${-25 + dy} C${16 + dx},${-25 + dy} ${18 + dx},${-24 + dy} ${18 + dx},${-21 + dy} L${18 + dx},${27 + dy}`) + ' ' + c.L([[-20 + dx, 2 + dy], [18 + dx, 2 + dy]])
      let s = `<g id="${c.id}-far-frame">${c.tube(frame(-6, -4), T, pal, { tone: 'shadow', w: c.lw })}${c.tube(c.L([[-25, -29], [-15, -29]]), 5.4, DARK, { tone: 'shadow', w: c.lw })}</g>`
      s += `<g id="${c.id}-frame">${c.tube(frame(0, 0), T, pal, { w: c.lw })}</g>`
      s += `<g id="${c.id}-rubber">${c.tube(c.L([[-19, -25], [-7, -25]]), 5.4, DARK, { w: c.lw })}${c.body('tip', c.R(-23, 27, 6.4, 5, 2), DARK, { w: c.lw })}${c.body('wheel', c.C(18, 28.5, 4.6), DARK, { w: c.lw })}${c.fill(c.C(18, 28.5, 1.6), pal.base)}</g>`
      return { body: s, parts: [['frame', pal], ['rubber', DARK]] }
    },
  },
  chair: {
    box: [-24, -46, 24, 46],
    draw: (c, { pal = WOOD }) => {
      let s = `<g id="${c.id}-legs">${c.tube(c.L([[17, 8], [18, 44]]), 4.2, pal, { tone: 'shadow', w: c.lw })}${c.tube(c.L([[-17, -44], [-18, 44]]), 4.6, pal, { w: c.lw })}${c.tube(c.L([[-14, 8], [-12, 44]]), 4.2, pal, { tone: 'shadow', w: c.lw })}</g>`
      s += `<g id="${c.id}-seat">${c.body('back', c.R(-22, -42, 8, 36, 3.5), pal)}${c.body('seat', c.R(-22, 4, 44, 7, 2.5), pal)}${c.big ? c.line(c.L([[-18, 6.5], [16, 6.5]]), pal.light, c.lw) : ''}</g>`
      return { body: s, parts: [['chair', pal]] }
    },
  },
  wheelchair: {
    box: [-44, -46, 42, 46],
    draw: (c, { pal = ACCENT, frame = METAL }) => {
      let s = `<g id="${c.id}-wheel">${c.body('tyre', c.C(-10, 18, 27), DARK)}${c.fill(c.C(-10, 18, 21.5), frame.light, frame.outline, c.lw * 1.3)}`
      if (c.big) s += c.line(Array.from({ length: 8 }, (_, i) => { const t = (i * Math.PI) / 4; return c.L([[-10 + 4 * Math.cos(t), 18 + 4 * Math.sin(t)], [-10 + 21 * Math.cos(t), 18 + 21 * Math.sin(t)]]) }).join(' '), frame.outline, c.lw * 0.8)
      s += c.fill(c.C(-10, 18, 4), frame.base, frame.outline, c.lw) + '</g>'
      s += `<g id="${c.id}-frame">${c.tube(c.L([[-24, -44], [-16, -44]]), 5, DARK, { w: c.lw })}${c.tube(c.L([[-17, -44], [-17, 0], [24, 0], [30, 34], [38, 34]]), 3.8, frame, { w: c.lw })}${c.tube(c.L([[-17, -18], [16, -18], [16, 0]]), 3.2, frame, { w: c.lw })}</g>`
      s += `<g id="${c.id}-seat">${c.body('back', c.R(-22, -40, 8, 38, 3), pal)}${c.body('seat', c.R(-20, -6, 42, 8, 3), pal)}</g>`
      s += `<g id="${c.id}-castor">${c.body('castor', c.C(27, 39, 6), DARK, { w: c.lw })}${c.fill(c.C(27, 39, 2), frame.base)}</g>`
      return { body: s, parts: [['seat', pal], ['frame', frame], ['tyres', DARK]] }
    },
  },
  glasses: {
    box: [-50, -21, 50, 17],
    draw: (c, { pal = DARK }) => {
      const half = [[-44, -9], [-31, -12], [-12, -11], [-6, -6], [-7, 4], [-14, 11], [-30, 12], [-41, 7], [-45, -1]]
      const lens = (k) => c.S(half.map(([u, v]) => [k * u, v]))
      let s = `<g id="${c.id}-lenses">${[-1, 1].map((k) => c.body(`lens-${k < 0 ? 'right' : 'left'}`, lens(k), GLASS, { outline: false })).join('')}`
      if (c.big) s += c.line(c.L([[-34, -3], [-27, -8]]) + ' ' + c.L([[-30, 4], [-19, -6]]) + ' ' + c.L([[20, -3], [27, -8]]), '#FFFFFF', c.w * 0.9)
      s += `</g><g id="${c.id}-frame">${[-1, 1].map((k) => c.tube(lens(k), 3.2, pal, { w: c.lw })).join('')}${c.tube(c.O([[-6, -6], [0, -9], [6, -6]]), 3, pal, { w: c.lw })}`
      s += c.tube(c.L([[-45.5, -6], [-48.5, -18]]) + ' ' + c.L([[45.5, -6], [48.5, -18]]), 2.8, pal, { tone: 'shadow', w: c.lw }) + '</g>'
      return { body: s, parts: [['frame', pal], ['lenses', GLASS]] }
    },
  },
  'hearing aid': {
    box: [-26, -50, 28, 44],
    draw: (c, { pal = METAL }) => {
      let s = `<g id="${c.id}-tube">${c.tube(c.O([[3, -42], [-8, -47], [-19, -39], [-21, -24], [-17, -12]]), 3.2, GLASS, { w: c.lw })}${c.body('dome', c.E(-14, -7, 6.5, 5, 35), PLASTIC, { w: c.lw })}</g>`
      s += `<g id="${c.id}-case">${c.body('case', c.S([[1, -40], [10, -47], [20, -43], [26, -31], [27, -14], [24, 1], [19, 11], [13, 13], [12, 5], [16, -10], [16, -27], [10, -37]]), pal)}`
      s += c.fill(c.C(20, -31, 2.6), ACCENT.base, ACCENT.outline, c.lw) + shine(c, 19, -20, 2, 9, -10, pal) + '</g>'
      return { body: s, parts: [['case', pal], ['button', ACCENT]] }
    },
  },
}
export function aid(g, opts) { return draw(AID, 'aid', g, { kind: 'stick', ...opts }) }

// =====================================================================================================================
// Dial: a gauge, `size` its width. Kinds: 'zones' (a half dial with green, amber and red zones and a needle: eGFR, frailty
// index, pace of ageing), 'aneroid' (a round pressure gauge with ticks over three quarters of a turn, as on a blood pressure
// cuff). Options: value (0 to 1 along the scale, 0.7), order (the zones from the left, ['good', 'mid', 'bad']; reverse it
// where low is bad), needle (INK).
// Used by: Kidney function (eGFR), Frailty index, Pace of ageing, Captopril, Blood pressure cuff (inside `device`);
//   in "Medicine & clinical": vital signs, risk scores.
// Example: gauge(g, { x: 0, y: 0, size: 40, kind: 'zones', value: 0.2, order: ['bad', 'mid', 'good'], id: 'egfr' })
// =====================================================================================================================
/** The round pressure gauge in local units, centre u, v, radius R (shared with the cuff). */
const aneroid = (c, u, v, R, value = 0.7, needle = INK) => {
  let s = c.body('rim', c.C(u, v, R), METAL) + c.fill(c.C(u, v, R * 0.8), PAPER.base, METAL.outline, c.lw * 1.2)
  if (c.F.ext * (R / 50) >= 18) s += c.line(Array.from({ length: 13 }, (_, i) => { const t = rad(135 + i * 22.5), r1 = R * (i % 2 ? 0.66 : 0.6); return c.L([[u + r1 * Math.cos(t), v + r1 * Math.sin(t)], [u + R * 0.73 * Math.cos(t), v + R * 0.73 * Math.sin(t)]]) }).join(' '), INK, c.lw)
  const t = rad(135 + 270 * value)
  s += c.line(c.L([[u, v], [u + R * 0.62 * Math.cos(t), v + R * 0.62 * Math.sin(t)]]), needle, Math.max(1.6, c.w * 0.8)) + c.fill(c.C(u, v, R * 0.12), DARK.base)
  return s
}
const GAUGE = {
  zones: {
    box: [-50, -34, 50, 30],
    draw: (c, { value = 0.7, order = ['good', 'mid', 'bad'], needle = INK }) => {
      const cy = 24
      let s = `<g id="${c.id}-dial">${c.body('rim', c.L([...arcPts(0, cy, 48, 180, 360, 40), [48, cy + 5], [-48, cy + 5]]) + 'Z', METAL)}${c.fill(c.L(arcPts(0, cy, 42, 180, 360, 40)) + 'Z', PAPER.base, METAL.outline, c.lw)}</g>`
      s += `<g id="${c.id}-zones">${order.map((z, i) => c.fill(sectorD(c, 0, cy, 27, 38, 180 + i * 60 + (i ? 1 : 0), 180 + (i + 1) * 60 - (i < 2 ? 1 : 0), 12), ZONES[z].small, ZONES[z].outline, c.lw)).join('')}</g>`
      if (c.big) s += c.line(Array.from({ length: 7 }, (_, i) => { const t = rad(180 + i * 30); return c.L([[23 * Math.cos(t), cy + 23 * Math.sin(t)], [19 * Math.cos(t), cy + 19 * Math.sin(t)]]) }).join(' '), INK, c.lw)
      const t = rad(180 + 180 * value)
      s += `<g id="${c.id}-needle">${c.line(c.L([[0, cy], [34 * Math.cos(t), cy + 34 * Math.sin(t)]]), needle, Math.max(1.8, c.w * 0.9))}${c.fill(c.C(0, cy, 4.6), DARK.base, DARK.outline, c.lw)}</g>`
      return { body: s, parts: [['dial', METAL], ...order.map((z) => [`${z} zone`, ZONES[z]])] }
    },
  },
  aneroid: {
    box: [-50, -50, 50, 50],
    draw: (c, { value = 0.7, needle = INK }) => ({ body: `<g id="${c.id}-gauge">${aneroid(c, 0, 0, 48, value, needle)}</g>`, parts: [['gauge', METAL]] }),
  },
}
export function gauge(g, opts) { return draw(GAUGE, 'gauge', g, { kind: 'zones', ...opts }) }

// =====================================================================================================================
// Timepieces, `size` the longer side. Kinds: 'clock' (a PAPER face with twelve marks and two hands, as the approved
// Proteomic ageing clock), 'stopwatch' (the approved Stopwatch: a METAL case, crown and side button in ACCENT, a white dial),
// 'day' (a 24-hour dial: day above with the sun, night below with the moon and two stars, one hand), 'hourglass' (wooden
// ends, glass bulbs, sand running down). Options: time ([hours, minutes], [10, 10]; 'day': hours of 24, [14, 0]); share (a
// wedge from twelve o'clock round to this share of the face, in `wedge`, AGE: a biological age; the stopwatch's elapsed
// time in ACCENT); window ([from, to] hours: a wedge of the face between them, in `wedge`: an eating window); wedge (a
// palette); level (hourglass: the share of sand still above, 0.4).
// Used by: Epigenetic clock, Calorie restriction (window), Delayed wound healing, Cognitive test (drawn on the sheet: no),
//   Gait speed and Chair stand test (stopwatch), Circadian rhythm (day), Biological vs chronological age, Maximum lifespan;
//   in "Medicine & clinical": waiting time, dosing schedules, time since onset (stroke).
// Example: clock(g, { x: 0, y: 0, size: 40, kind: 'clock', share: 0.62, id: 'age-clock' })
// =====================================================================================================================
const hands = (c, u, v, [h, mi], R, colour = INK, w = c.w) => {
  const th = rad(((h % 12) + mi / 60) * 30 - 90), tm = rad(mi * 6 - 90)
  return c.line(c.L([[u, v], [u + R * 0.48 * Math.cos(th), v + R * 0.48 * Math.sin(th)]]), colour, w * 1.15) + c.line(c.L([[u, v], [u + R * 0.72 * Math.cos(tm), v + R * 0.72 * Math.sin(tm)]]), colour, w * 0.95) + c.fill(c.C(u, v, R * 0.07 + 0.8), colour)
}
const wedgeOf = (c, u, v, r, a0, a1, pal) => c.fill(sectorD(c, u, v, 0, r, a0, a1, Math.max(6, Math.round((a1 - a0) / 8))), pal.base, pal.outline, c.lw)
const TIME = {
  clock: {
    box: [-50, -50, 50, 50],
    draw: (c, { time = [10, 10], share, window: win, wedge = AGE }) => {
      let s = `<g id="${c.id}-face">${c.body('face', c.C(0, 0, 47), PAPER)}</g>`
      let wd = ''
      if (share) wd += wedgeOf(c, 0, 0, 38, -90, -90 + 360 * share, wedge)
      if (win) wd += wedgeOf(c, 0, 0, 38, win[0] * 30 - 90, (win[1] < win[0] ? win[1] + 12 : win[1]) * 30 - 90, wedge)
      if (wd) s += `<g id="${c.id}-share">${wd}</g>`
      s += `<g id="${c.id}-marks">${c.line(Array.from({ length: 12 }, (_, i) => { const t = rad(i * 30), r0 = i % 3 ? 37 : 33; return c.L([[r0 * Math.cos(t), r0 * Math.sin(t)], [42 * Math.cos(t), 42 * Math.sin(t)]]) }).join(' '), INK, Math.max(1.6, c.w * 0.6))}</g>`
      s += `<g id="${c.id}-hands">${hands(c, 0, 0, time, 46)}</g>`
      return { body: s, parts: [['face', PAPER], ...(share || win ? [['share', wedge]] : [])] }
    },
  },
  stopwatch: {
    box: [-40, -46, 40, 46],
    draw: (c, { share, time = [0, 10] }) => {
      const cy = 7, R = 38
      let b = `<g transform="rotate(42 ${f(c.F.P([0, cy])[0])} ${f(c.F.P([0, cy])[1])})">${c.body('side-stem', c.R(-3.5, cy - R - 7, 7, 9, 1.5), METAL, { tone: 'shadow', w: c.lw * 1.3 })}${c.body('side-button', c.R(-6, cy - R - 11, 12, 6, 2), ACCENT, { w: c.lw * 1.3 })}</g>`
      b += c.body('stem', c.R(-4, cy - R - 8, 8, 10, 1.5), METAL, { tone: 'shadow', w: c.lw * 1.3 }) + c.body('crown', c.R(-9, cy - R - 15, 18, 9, 3), ACCENT, { w: c.lw * 1.3 })
      let s = `<g id="${c.id}-buttons">${b}</g><g id="${c.id}-case">${c.body('case', c.C(0, cy, R), METAL)}${c.fill(c.C(0, cy, R - 6.5), PAPER.base, METAL.outline, c.lw * 1.3)}${shine(c, -14, cy - 18, 13, 5, -35, PAPER)}`
      if (share) s += c.fill(sectorD(c, 0, cy, 0, R - 9, -90, -90 + 360 * share, 16), ACCENT.light, ACCENT.small, c.lw)
      s += c.line(Array.from({ length: 12 }, (_, i) => { const a = rad(i * 30), r0 = i % 3 ? 26.5 : 23.5; return c.L([[Math.sin(a) * r0, cy - Math.cos(a) * r0], [Math.sin(a) * 29, cy - Math.cos(a) * 29]]) }).join(' '), INK, Math.max(1.4, c.lw * 1.4))
      const tm = rad(time[1] * 6 - 90)
      s += `</g><g id="${c.id}-hands">${c.line(c.L([[0, cy], [0, cy - 21]]), ACCENT.outline, c.w * 1.05)}${c.line(c.L([[0, cy], [24 * Math.cos(tm), cy + 24 * Math.sin(tm)]]), ACCENT.outline, c.w * 1.05)}${c.fill(c.C(0, cy, 4), ACCENT.base, ACCENT.outline, c.lw * 1.3)}</g>`
      return { body: s, parts: [['buttons', ACCENT], ['case', METAL]] }
    },
  },
  day: {
    box: [-50, -50, 50, 50],
    draw: (c, { time = [14, 0] }) => {
      const R = 47, r = 38
      let s = `<g id="${c.id}-face">${c.body('face', c.C(0, 0, R), PAPER)}</g>`
      s += `<g id="${c.id}-day">${c.fill(c.L(arcPts(0, 0, r, 180, 360, 30)) + 'Z', DAY.base, DAY.outline, c.lw)}</g><g id="${c.id}-night">${c.fill(c.L(arcPts(0, 0, r, 0, 180, 30)) + 'Z', NIGHT.base, NIGHT.outline, c.lw)}`
      s += c.fill(c.L(crescent(-8, 19, 10, 5, -4, 9)) + 'Z', MOON.base) + c.fill(star(c, 12, 12, 3.6), MOON.base) + c.fill(star(c, 18, 25, 2.6), MOON.base) + '</g>'
      const sun = scene(c.g, { x: c.F.at([0, -19])[0], y: c.F.at([0, -19])[1], size: 30 * c.F.s, kind: 'sun', id: `${c.id}-sun` })
      s += sun.body
      s += `<g id="${c.id}-marks">${c.line(Array.from({ length: 24 }, (_, i) => { const t = rad(i * 15), r0 = i % 6 ? 41.5 : 39.5; return c.L([[r0 * Math.cos(t), r0 * Math.sin(t)], [44 * Math.cos(t), 44 * Math.sin(t)]]) }).join(' '), INK, Math.max(1.3, c.w * 0.5))}</g>`
      const t = rad(((time[0] + time[1] / 60) / 24) * 360 + 90)
      s += `<g id="${c.id}-hand">${c.line(c.L([[0, 0], [41 * Math.cos(t), 41 * Math.sin(t)]]), INK, c.w * 1.05)}${c.fill(c.C(0, 0, 3.6), INK)}</g>`
      return { defs: sun.defs, body: s, parts: [['face', PAPER], ['day', DAY], ['night', NIGHT], ['moon', MOON], ...sun.parts] }
    },
  },
  hourglass: {
    box: [-30, -50, 30, 50],
    draw: (c, { level = 0.4, pal = WOOD }) => {
      const hw = (v) => 3.2 + 15 * Math.pow(Math.min(1, Math.abs(v) / 41), 0.75) // half-width of a bulb at height v
      const side = (k, v0, v1) => Array.from({ length: 13 }, (_, i) => { const v = v0 + ((v1 - v0) * i) / 12; return [k * hw(v), v] })
      const glass = c.S([...side(1, -41, 41), ...side(-1, 41, -41)])
      const top = -41 * level ** 0.6, pile = 41 - 30 * (1 - level) ** 0.8
      let s = `<g id="${c.id}-posts">${c.tube(c.L([[-23, -42], [-23, 42]]) + ' ' + c.L([[23, -42], [23, 42]]), 3.4, pal, { tone: 'shadow', w: c.lw })}</g>`
      s += `<g id="${c.id}-glass">${c.body('glass', glass, GLASS, { w: c.lw * 1.3 })}</g>`
      s += `<g id="${c.id}-sand">${c.fill(c.L([...side(1, top, -1.5), [0, -0.5], ...side(-1, -1.5, top)]) + 'Z', SAND_GRAIN.small)}${c.fill(c.M(`M${-hw(40)},40.5 C${-hw(40) * 0.6},${pile + 4} -3,${pile} 0,${pile} C3,${pile} ${hw(40) * 0.6},${pile + 4} ${hw(40)},40.5 Z`), SAND_GRAIN.small)}${c.line(c.L([[0, -1], [0, pile]]), SAND_GRAIN.small, Math.max(1, c.lw * 0.8))}</g>`
      s += `<g id="${c.id}-ends">${c.body('top', c.R(-29, -50, 58, 8, 3), pal)}${c.body('bottom', c.R(-29, 42, 58, 8, 3), pal)}</g>`
      return { body: s, parts: [['wood', pal], ['glass', GLASS], ['sand', SAND_GRAIN]] }
    },
  },
}
/** A crescent: the circle (u, v, r) less the circle (u + du, v + dv, r2), as local points. */
const crescent = (u, v, r, du, dv, r2, n = 16) => {
  const d = Math.hypot(du, dv), a = (r * r - r2 * r2 + d * d) / (2 * d), al = Math.acos(Math.max(-1, Math.min(1, a / r))), phi = Math.atan2(dv, du)
  const outer = Array.from({ length: n + 1 }, (_, i) => { const t = phi + al + ((2 * Math.PI - 2 * al) * i) / n; return [u + r * Math.cos(t), v + r * Math.sin(t)] })
  const [p2, p1] = [outer[n], outer[0]], c2 = [u + du, v + dv], g2 = Math.atan2(p2[1] - c2[1], p2[0] - c2[0]), g1 = Math.atan2(p1[1] - c2[1], p1[0] - c2[0])
  let dl = (((g1 - g2) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
  if (Math.cos(g2 + dl / 2 - (phi + Math.PI)) < 0) dl -= 2 * Math.PI
  const inner = Array.from({ length: n - 1 }, (_, i) => { const t = g2 + (dl * (i + 1)) / n; return [c2[0] + r2 * Math.cos(t), c2[1] + r2 * Math.sin(t)] })
  return [...outer, ...inner]
}
/** A five-pointed star (local units) as a path. */
const star = (c, u, v, r) => c.L(Array.from({ length: 10 }, (_, i) => { const t = rad(-90 + i * 36), q = i % 2 ? r * 0.45 : r; return [u + q * Math.cos(t), v + q * Math.sin(t)] })) + 'Z'
export function clock(g, opts) { return draw(TIME, 'clock', g, { kind: 'clock', ...opts }) }

// =====================================================================================================================
// Clinical devices, `size` the longer side. Kinds: 'bp cuff' (a blood pressure cuff with its aneroid gauge, rubber tubes
// and inflation bulb), 'tape' (a tape measure: its case with the tape pulled out), 'tape band' (a strip of tape measure
// bowed as it runs round a waist or an arm, `bend` its sag in local units, 14), 'scale' (a bathroom scale from above, a
// window with the reading), 'dexa' (a DEXA scanner: column, arm and detector, the x-ray fan, the table; `patient` lays
// a person on it), 'ring' (the gantry of a CT or MRI scanner with its table), 'clipboard' (a test sheet on a clipboard: content
// 'checklist' with `ticks`, 'scores' with `scores` (0, 1 or 2 of three dots), 'clock' (a drawn clock at ten past eleven, the
// clock-drawing test), 'lines'; `pencil` adds a pencil), 'pencil'. Options: pal (the cuff and buttons ACCENT), value (the
// cuff's gauge, 0.6), reading (the scale's digits, '70'), beam (dexa, true), patient (dexa and ring: a person lying on the
// table, `figure` 'lie'; true or its options, e.g. { old: true }).
// Used by: Blood pressure cuff, Captopril (gauge only), Waist circumference (tape band), DEXA scan, White matter
//   hyperintensities (ring: no, an MRI slice), Cognitive test (clipboard, clock, pencil), Frailty index (checklist), Mouse
//   frailty index (scores), Comprehensive geriatric assessment; in "Medicine & clinical": scanners, examinations, records.
// Example: device(g, { x: 0, y: 0, size: 60, kind: 'clipboard', content: 'clock', pencil: true, id: 'clock-test' })
// =====================================================================================================================
/** A patient lying on a scanner's table: `figure` 'lie', its back on the local point `top`, `len` local units long, head to
 *  the left (or into the scanner, `toRight`); `who` true or the options of `figure` (old, pal …). */
const onTable = (c, [u, v], len, toRight, who) => {
  const s = len / 96, [x, y] = c.F.at([u, v - 12 * s])
  return figure(c.g, { x, y, size: len * c.F.s, pose: 'lie', flip: toRight !== c.F.flip, id: `${c.id}-patient`, ...(typeof who === 'object' ? who : {}) })
}
const DEVICE = {
  'bp cuff': {
    box: [-48, -46, 48, 48],
    draw: (c, { pal = ACCENT, value = 0.6 }) => {
      let s = `<g id="${c.id}-tubes">${c.tube(c.O([[-10, 2], [2, 1], [9, 7], [18, 4]]), 3, DARK, { w: c.lw })}${c.tube(c.O([[-10, 16], [6, 16], [14, 11], [30, 19]]), 3, DARK, { w: c.lw })}</g>`
      s += `<g id="${c.id}-cuff">${c.body('cuff', c.R(-46, -24, 38, 58, 7), pal)}${c.fill(c.R(-40, -16, 26, 34, 3), pal.shadow, pal.small, c.lw)}`
      if (c.big) s += c.line([-35, -29, -23].map((u) => c.L([[u, -12], [u, 14]])).join(' '), pal.small, c.lw * 0.8)
      s += c.fill(c.R(-14, -6, 10, 12, 3), 'none', METAL.outline, c.w * 0.8) + '</g>'
      s += `<g id="${c.id}-gauge">${aneroid(c, 18, -20, 25, value)}</g>`
      s += `<g id="${c.id}-bulb">${c.body('valve', c.R(26, 13, 8, 7, 1.5), METAL, { w: c.lw })}${c.body('bulb', c.E(30, 33, 12, 14), DARK)}${c.big ? c.line(c.O([[24, 26], [22.5, 33], [24, 40]]), DARK.light, c.lw * 1.4) : ''}</g>`
      return { body: s, parts: [['cuff', pal], ['gauge', METAL], ['rubber', DARK]] }
    },
  },
  tape: {
    box: [-50, -28, 50, 24],
    draw: (c, { pal = ACCENT }) => {
      let s = `<g id="${c.id}-tape">${c.body('strip', c.R(-10, 8, 56, 11, 1), TAPE)}`
      if (c.big) s += c.line(Array.from({ length: 15 }, (_, i) => { const u = -6 + i * 3.5; return c.L([[u, 8], [u, i % 2 ? 11 : 13.5]]) }).join(' '), INK, c.lw * 0.8)
      s += c.body('hook', c.R(44, 4, 4.5, 19, 1), METAL, { w: c.lw }) + '</g>'
      s += `<g id="${c.id}-case">${c.body('case', c.R(-48, -22, 44, 44, 11), METAL)}${c.fill(c.C(-26, 0, 9), METAL.shadow, METAL.outline, c.lw)}${c.body('button', c.R(-23, -28, 11, 7, 2), pal, { w: c.lw })}${shine(c, -38, -12, 3, 6, 20, METAL)}</g>`
      return { body: s, parts: [['tape', TAPE], ['case', METAL], ['button', pal]] }
    },
  },
  'tape band': {
    box: [-50, -2, 50, 26],
    draw: (c, { bend = 14 }) => {
      const q = (t) => [-48 + 96 * t, bend * 4 * t * (1 - t)], top = Array.from({ length: 25 }, (_, i) => q(i / 24))
      let s = `<g id="${c.id}-tape">${c.body('strip', c.L([...top, ...top.slice().reverse().map(([u, v]) => [u, v + 9])]) + 'Z', TAPE, { flat: true })}`
      if (c.big) s += c.line(top.slice(1, -1).map(([u, v], i) => c.L([[u, v], [u, v + (i % 2 ? 2.4 : 4)]])).join(' '), INK, c.lw * 0.8)
      return { body: s + '</g>', parts: [['tape', TAPE]] }
    },
  },
  scale: {
    box: [-46, -36, 46, 34],
    draw: (c, { reading = '70' }) => {
      let s = `<g id="${c.id}-scale">${c.body('base', c.R(-44, -28, 88, 62, 14), PLASTIC, { tone: 'shadow' })}${c.body('top', c.R(-44, -34, 88, 62, 14), PLASTIC)}`
      s += [-21, 21].map((u) => c.fill(c.R(u - 13, -10, 26, 32, 11), PLASTIC.shadow, PLASTIC.small, c.lw)).join('') + '</g>'
      s += `<g id="${c.id}-display">${c.body('window', c.R(-15, -29, 30, 13, 3), DARK, { w: c.lw })}${reading ? letter(c, 0, -22.5, 7, reading, DARK.light ? '#FFFFFF' : '#FFFFFF', 'reading') : ''}</g>`
      return { body: s, parts: [['scale', PLASTIC], ['display', DARK]] }
    },
  },
  dexa: {
    box: [-50, -46, 48, 46],
    draw: (c, { pal = ACCENT, beam = true, patient = false }) => {
      let s = `<g id="${c.id}-column">${c.body('column', c.R(32, -42, 12, 62, 3), METAL, { tone: 'shadow' })}${c.body('arm', c.R(-8, -44, 52, 11, 4), METAL)}${c.body('detector', c.R(-14, -36, 28, 11, 3), METAL)}${c.line(c.L([[-9, -28], [9, -28]]), pal.outline, c.lw * 1.6)}</g>`
      if (beam) s += `<g id="${c.id}-x-rays">${c.fill(c.L([[-10, -25], [10, -25], [20, 17], [-20, 17]]) + 'Z', XRAY.base)}${c.line(c.L([[-10, -25], [-20, 17]]) + ' ' + c.L([[10, -25], [20, 17]]), XRAY.outline, c.lw, ` stroke-dasharray="${f(c.lw * 2.4)} ${f(c.lw * 2)}"`)}</g>`
      s += `<g id="${c.id}-table">${c.body('pedestal', c.R(-30, 29, 58, 11, 2), METAL, { tone: 'shadow' })}${c.body('table', c.R(-48, 17, 92, 13, 3), METAL)}${c.fill(c.R(-45, 17, 86, 3.5, 1.5), pal.base, pal.outline, c.lw)}</g>`
      const P = patient ? onTable(c, [-4, 17], 82, false, patient) : null
      return { defs: P?.defs ?? '', body: s + (P?.body ?? ''), parts: [['scanner', METAL], ['band', pal], ...(beam ? [['x-rays', XRAY]] : []), ...(P?.parts ?? [])] }
    },
  },
  ring: {
    box: [-50, -46, 50, 40],
    draw: (c, { pal = ACCENT, patient = false }) => {
      let s = `<g id="${c.id}-gantry">${c.body('gantry', c.C(12, -8, 37), METAL)}${c.tube(c.C(12, -8, 28.5), 2.6, pal, { w: c.lw })}${c.fill(c.C(12, -8, 19), DARK.base, DARK.outline, c.lw)}${shine(c, -4, -28, 9, 4, -40, METAL)}</g>`
      s += `<g id="${c.id}-table">${c.body('pedestal', c.R(-34, 13, 26, 25, 2), METAL, { tone: 'shadow' })}${c.body('table', c.R(-50, 2, 76, 10, 3), METAL)}${c.fill(c.R(-48, 0, 70, 3.5, 1.5), pal.base, pal.outline, c.lw)}</g>`
      const P = patient ? onTable(c, [-14, 0], 64, true, patient) : null
      return { defs: P?.defs ?? '', body: s + (P?.body ?? ''), parts: [['scanner', METAL], ['band', pal], ['bore', DARK], ...(P?.parts ?? [])] }
    },
  },
  clipboard: {
    box: [-38, -50, 38, 48],
    draw: (c, { content = 'checklist', ticks = [1, 1, 0, 1, 0], scores = [0, 2, 1, 0, 2], pencil = false, pal = ACCENT }) => {
      let s = `<g id="${c.id}-board">${c.body('board', c.R(-36, -44, 72, 92, 6), BOARD)}</g><g id="${c.id}-sheet">${c.body('sheet', c.R(-30, -34, 60, 77, 2), PAPER, { w: c.lw * 1.4 })}`
      const ink = Math.max(1.4, c.lw * 1.3), grey = PAPER.small
      if (content === 'checklist' || content === 'scores') {
        for (let i = 0; i < 5; i++) {
          const v = -22 + i * 14
          if (content === 'checklist') {
            s += c.fill(c.R(-24, v - 4.5, 9, 9, 1.5), PAPER.light, INK, Math.max(1.2, c.lw))
            if (ticks[i]) s += c.line(c.L([[-22.5, v], [-20, v + 2.6], [-15, v - 3.5]]), pal.outline, ink * 1.2)
            s += c.line(c.L([[-9, v], [c.big ? 22 : 18, v]]), grey, ink * (c.big ? 1 : 1.6))
          } else {
            s += c.line(c.L([[-24, v], [-4, v]]), grey, ink * (c.big ? 1 : 1.6))
            s += [4, 13, 22].map((u, k) => c.fill(c.C(u, v, 3.4), k === scores[i] ? pal.base : PAPER.light, k === scores[i] ? pal.outline : INK, Math.max(1, c.lw * 0.9))).join('')
          }
        }
      } else if (content === 'clock') {
        s += c.fill(c.C(0, 2, 20), 'none', INK, ink) + c.line(Array.from({ length: 12 }, (_, i) => { const t = rad(i * 30); return c.L([[16 * Math.cos(t), 2 + 16 * Math.sin(t)], [18 * Math.cos(t), 2 + 18 * Math.sin(t)]]) }).join(' '), INK, ink) + hands(c, 0, 2, [11, 10], 21, INK, ink * 1.3)
      } else s += c.line(Array.from({ length: 6 }, (_, i) => c.L([[-22, -22 + i * 11], [i === 5 ? 6 : 22, -22 + i * 11]])).join(' '), grey, ink * (c.big ? 1 : 1.6))
      s += `</g><g id="${c.id}-clip">${c.body('clip', c.R(-14, -48, 28, 13, 4), METAL, { w: c.lw * 1.3 })}${c.fill(c.C(0, -44, 2.4), BOARD.shadow, METAL.outline, c.lw)}</g>`
      let defs = '', parts = [['board', BOARD], ['sheet', PAPER], ['marks', pal]]
      if (pencil) { const [px, py] = c.F.at([22, 34]), p = device(c.g, { x: px, y: py, size: 54 * c.F.s, kind: 'pencil', turn: -58, id: `${c.id}-pencil` }); s += p.body; defs = p.defs; parts = [...parts, ...p.parts] }
      return { defs, body: s, parts }
    },
  },
  pencil: {
    box: [-50, -7, 50, 7],
    draw: (c) => {
      let s = `<g id="${c.id}-wood">${c.body('tip', c.L([[-30, -6], [-45, 0], [-30, 6]]) + 'Z', PENCIL_WOOD, { w: c.lw })}${c.fill(c.L([[-45.5, 0], [-40, -2.2], [-40, 2.2]]) + 'Z', DARK.base)}</g>`
      s += `<g id="${c.id}-body">${c.body('body', c.R(-30, -6, 62, 12, 1), PENCIL)}${c.big ? c.line(c.L([[-28, -1.8], [30, -1.8]]), PENCIL.shadow, c.lw) : ''}</g>`
      s += `<g id="${c.id}-end">${c.body('ferrule', c.R(32, -6.5, 8, 13, 1), METAL, { w: c.lw })}${c.body('eraser', c.R(40, -6, 9, 12, 3), ERASER, { w: c.lw })}</g>`
      return { body: s, parts: [['pencil', PENCIL], ['eraser', ERASER]] }
    },
  },
}
export function device(g, opts) { return draw(DEVICE, 'device', g, { kind: 'bp cuff', ...opts }) }

// =====================================================================================================================
// A drop of blood: the approved Blood drop (../anatomy/anE.mjs), tissue.mjs's RED, glossed as a closed body; `size` its
// height. Options: glucose (a glucose ring of molecules.mjs on it, false), pal (RED).
// Used by: Diabetes (with glucose), HbA1c, CRP blood test; in "Medicine & clinical": blood tests, anaemia, bleeding.
// Example: bloodDrop(g, { x: 0, y: 0, size: 40, glucose: true, id: 'drop' })
// =====================================================================================================================
const DROP = {
  drop: {
    box: [-34, -47, 34, 46],
    draw: (c, { pal = RED, glucose: sugar = false }) => {
      let s = `<g id="${c.id}-drop">${c.body('drop', c.M('M0,-46 C6,-34 33,-12 33,12 C33,30.2 18.2,45 0,45 C-18.2,45 -33,30.2 -33,12 C-33,-12 -6,-34 0,-46 Z'), pal, { gloss: true })}</g>`
      let defs = '', parts = [['blood', pal]]
      if (sugar) { const [gx, gy] = c.F.at([0, 15]), q = glucose(c.g, { x: gx, y: gy, size: 30 * c.F.s, id: `${c.id}-glucose` }); s += q.body; defs = q.defs; parts = [...parts, ...q.parts] }
      return { defs, body: s, parts }
    },
  },
}
export function bloodDrop(g, opts) { return draw(DROP, 'bloodDrop', g, { kind: 'drop', id: 'blood-drop', ...opts }) }

// =====================================================================================================================
// Marks, flat, `size` the longer side. Kinds: 'male' and 'female' (the signs, strokes), 'heart' (filled, HEART_RED: health),
// 'dizzy' (a spiral with two stars over a head), 'motion' (three speed lines behind a moving body). Options: colour (the
// strokes, INK; motion GRID), pal (the heart's or the stars' palette).
// Used by: 17α-Estradiol and Andropause (male), Ovarian ageing and menopause (female), Healthspan (heart), Orthostatic
//   hypotension (dizzy), Gait speed (motion); in "Medicine & clinical": sex differences, symptoms.
// Example: mark(g, { x: 30, y: -30, size: 16, kind: 'male', colour: ACCENT.outline, id: 'male' })
// =====================================================================================================================
const MARK = {
  male: { box: [-30, -50, 50, 30], draw: (c, { colour = INK }) => ({ body: `<g id="${c.id}-sign">${c.stroke(c.C(-6, 6, 22) + ' ' + c.L([[10, -10], [41, -41]]) + ' ' + c.L([[22, -43], [43, -43], [43, -22]]), colour, Math.max(2, 7 * c.F.px))}</g>`, parts: [] }) },
  female: { box: [-30, -42, 30, 48], draw: (c, { colour = INK }) => ({ body: `<g id="${c.id}-sign">${c.stroke(c.C(0, -13, 22) + ' ' + c.L([[0, 10], [0, 45]]) + ' ' + c.L([[-14, 30], [14, 30]]), colour, Math.max(2, 7 * c.F.px))}</g>`, parts: [] }) },
  heart: {
    box: [-50, -40, 50, 58],
    draw: (c, { pal = HEART_RED }) => ({ body: `<g id="${c.id}-heart">${c.body('heart', c.M('M0,56 C-36,28 -48,8 -48,-12 C-48,-28 -36,-38 -26,-38 C-16,-38 -6,-32 0,-22 C6,-32 16,-38 26,-38 C36,-38 48,-28 48,-12 C48,8 36,28 0,56 Z'), pal)}${shine(c, -26, -20, 10, 6, -40, pal)}</g>`, parts: [['heart', pal]] }),
  },
  dizzy: {
    box: [-42, -26, 42, 24],
    draw: (c, { colour = INK, pal = STAR }) => {
      const sp = Array.from({ length: 40 }, (_, i) => { const t = (i / 39) * Math.PI * 3.4, r = 2 + (i / 39) * 15; return [r * Math.cos(t), 3 + r * Math.sin(t) * 0.62] })
      return { body: `<g id="${c.id}-spiral">${c.stroke(c.O(sp), colour, Math.max(1.6, 3.6 * c.F.px))}</g><g id="${c.id}-stars">${c.fill(star(c, -31, -12, 10), pal.base, pal.outline, c.lw)}${c.fill(star(c, 31, -14, 8), pal.base, pal.outline, c.lw)}</g>`, parts: [['stars', pal]] }
    },
  },
  motion: {
    box: [-30, -18, 30, 18],
    draw: (c, { colour = GRID }) => ({ body: `<g id="${c.id}-lines">${c.stroke(c.L([[-22, -14], [18, -14]]) + ' ' + c.L([[-28, 0], [28, 0]]) + ' ' + c.L([[-18, 14], [16, 14]]), colour, Math.max(1.8, 5 * c.F.px))}</g>`, parts: [] }),
  },
}
export function mark(g, opts) { return draw(MARK, 'mark', g, { kind: 'heart', ...opts }) }

// =====================================================================================================================
// Charts of ageing: assays.mjs's `plot` (axes with arrows, its series, dashed thresholds) with ready-made data for the
// curves of ageing and four more kinds of layer laid in at the same places: 'area' (filled under a curve, or between two:
// `to`), 'zone' (a shaded span of the x axis), 'dashed' (a dashed curve: the old or the expected course), 'bars' of a life
// course ('hbars': rows [v, healthy until, life until], green then red) and a population 'pyramid'. `size` the longer side.
// show: 'gompertz' (hazard rising exponentially with age), 'plateau' (log mortality: infant dip, Gompertz rise, late-life
// plateau, the oldest old shaded), 'survival' (a Gompertz survival curve), 'rectangular' (the old gradual curve dashed, the
// square new one filled), 'max lifespan' (survival in steps, the 10 % level dashed, the longest-lived tail in red),
// 'healthspan' (healthy years green under the health curve, the gap to the survival curve red), 'trial' (drug against
// placebo in steps, the benefit between), 'bio age' (biological against chronological age, the identity dashed, one
// accelerated person red), 'decline' (a hormone falling with age: testosterone), 'peak' (rising to a peak in youth, then
// falling: DHEA-S), 'j curve' (a risk flat, then rising steeply: maternal age), 'hormesis' (benefit above the control at low
// doses, harm below it at high), 'rhythm' (cortisol over 24 h: young steep morning peak, old flattened and dashed, night
// shaded), 'fev1' (Fletcher–Peto: never-smoker, smoker crossing the disability line, the slower course after quitting),
// 'trend' (life expectancy rising steadily: dots and a line), 'falling bars' (follicles or oestrogen with age), 'compression'
// (two life courses, the sick years shorter in the second), 'pyramid' (an ageing population as a column over the dashed
// young triangle). Options: card (false), axes, arrows (true), aspect, series (more series of `plot`), under and over (more
// layers of the kinds above, in shares of the plot area: u 0 left to 1 right, v 0 bottom to 1 top).
// Used by: Healthspan, Biological vs chronological age, Mortality curve (Gompertz), Hormesis, Rectangularisation of survival,
//   Compression of morbidity, Ageing population pyramid, Life expectancy increase, Geroscience trial, Flattened cortisol
//   rhythm, DHEA decline (with its formula), Age-specific mortality, Maximum lifespan, Maternal age effect, Andropause, Lung
//   function decline (FEV1), Ovarian ageing and menopause (falling bars), Intervention Testing Program (survival); in
//   "Medicine & clinical": incidence, risk and dose–response curves.
// Example: ageChart(g, { x: 0, y: 0, size: 80, show: 'healthspan', id: 'healthspan' })
// =====================================================================================================================
const gomp = (b, k, top = 0.92) => (u) => top * Math.exp(-k * (Math.exp(b * u) - 1))
const SURV = gomp(6, 0.00968), OLD = gomp(2.5, 0.348), NEW = gomp(12, 2.4e-5)
const stepData = (fn, du = 0.05, stop = 0.004) => { const d = []; for (let u = 0; u <= 1.0001; u += du) { d.push([Math.min(u, 1), fn(u)]); if (fn(u) < stop) break } return d }
const UT = (() => { let t = 0; for (let u = 0; u <= 1; u += 0.005) if (SURV(u) >= 0.092) t = u; return t })()
const HEALTH = (u) => 0.88 / (1 + Math.exp((u - 0.62) * 14)), ALIVE = (u) => 0.88 / (1 + Math.exp((u - 0.86) * 18))
const HORM = (u) => 0.45 + 4 * u * Math.exp(-u * 7) - 0.38 * Math.pow(u, 2.6)
const YOUNG = (u) => 0.1 + 0.8 * Math.exp(-(((u - 0.3) / (u < 0.3 ? 0.06 : 0.24)) ** 2)), AGED = (u) => 0.3 + 0.3 * Math.exp(-(((u - 0.32) / (u < 0.32 ? 0.12 : 0.34)) ** 2))
const NEVER = (u) => 0.82 - 0.22 * Math.pow(u, 1.6), SMOKER = (u) => NEVER(u) - (u > 0.25 ? 0.85 * Math.pow(u - 0.25, 1.5) : 0)
const QUIT = (u) => SMOKER(0.55) - (NEVER(0.55) - NEVER(u))
const sample = (fn, u0 = 0, u1 = 1, n = 40) => Array.from({ length: n + 1 }, (_, i) => { const u = u0 + ((u1 - u0) * i) / n; return [u, fn(u)] })
export const CHARTS = {
  gompertz: (() => { const fn = (u) => 0.05 + (0.88 * (Math.exp(3.4 * u) - 1)) / (Math.exp(3.4) - 1); return { series: [{ kind: 'line', fn }, { kind: 'points', data: [0.25, 0.5, 0.7, 0.88].map((u) => [u, fn(u)]) }] } })(),
  plateau: {
    under: [{ kind: 'zone', u: [0.72, 1] }],
    over: [{ kind: 'dashed', data: [[0.56, 0.62], [0.88, 1.02]], pal: MUTED }],
    series: [{ kind: 'line', data: [[0.01, 0.64], [0.07, 0.3], [0.16, 0.18], [0.27, 0.2], [0.42, 0.41], [0.56, 0.62], [0.68, 0.76], [0.8, 0.82], [0.9, 0.84], [1, 0.845]] }, { kind: 'points', data: [[0.27, 0.2], [0.42, 0.41], [0.56, 0.62]] }, { kind: 'points', data: [[0.8, 0.82], [0.9, 0.84], [0.99, 0.845]], pal: SERIES[1], r: 3.8 }],
  },
  survival: { series: [{ kind: 'line', fn: SURV }] },
  rectangular: { under: [{ kind: 'area', fn: NEW }], over: [{ kind: 'dashed', fn: OLD, pal: MUTED }], series: [{ kind: 'line', fn: NEW }], hlines: [0.92] },
  'max lifespan': (() => {
    const all = stepData(SURV), tail = [[UT, SURV(UT)], ...all.filter(([u]) => u > UT)], end = all[all.length - 1]
    return { under: [{ kind: 'area', data: all, step: true, pal: SERIES[0] }], series: [{ kind: 'step', data: all.filter(([u]) => u <= UT + 1e-9) }, { kind: 'step', data: tail, pal: SERIES[1] }, { kind: 'points', data: [[end[0], 0.01]], pal: SERIES[1], r: 4.2 }], hlines: [[0.092, UT]], vlines: [[UT, 0.092]] }
  })(),
  healthspan: { under: [{ kind: 'area', fn: ALIVE, to: HEALTH, pal: SERIES[1] }, { kind: 'area', fn: HEALTH, pal: SERIES[2] }], over: [{ kind: 'dashed', fn: ALIVE, pal: MUTED }], series: [{ kind: 'line', fn: HEALTH, pal: SERIES[2] }] },
  trial: (() => {
    const placebo = [[0, 0.92], [0.12, 0.8], [0.28, 0.67], [0.44, 0.54], [0.6, 0.43], [0.76, 0.34], [0.94, 0.27], [1, 0.27]], drug = [[0, 0.92], [0.28, 0.85], [0.44, 0.79], [0.6, 0.73], [0.76, 0.68], [0.94, 0.64], [1, 0.64]]
    return { under: [{ kind: 'area', data: drug, to: placebo, step: true, pal: SERIES[1] }], series: [{ kind: 'step', data: placebo }, { kind: 'step', data: drug, pal: SERIES[1] }, { kind: 'points', data: [[1, 0.27]], r: 3.6 }, { kind: 'points', data: [[1, 0.64]], pal: SERIES[1], r: 3.6 }] }
  })(),
  'bio age': { over: [{ kind: 'dashed', data: [[0, 0], [1, 1]], pal: MUTED, straight: true }, { kind: 'dashed', data: [[0.42, 0.45], [0.42, 0.7]], pal: SERIES[1], straight: true }], series: [{ kind: 'points', data: [[0.08, 0.16], [0.16, 0.08], [0.22, 0.3], [0.3, 0.2], [0.5, 0.56], [0.56, 0.46], [0.64, 0.7], [0.72, 0.6], [0.8, 0.86], [0.88, 0.76], [0.94, 0.95]] }, { kind: 'points', data: [[0.42, 0.78]], pal: SERIES[1], r: 4.6 }] },
  decline: (() => { const fn = (u) => 0.84 - 0.6 * Math.pow(u, 1.25); return { under: [{ kind: 'area', fn }], series: [{ kind: 'line', fn }, { kind: 'points', data: [0.12, 0.38, 0.64, 0.9].map((u) => [u, fn(u)]) }] } })(),
  peak: (() => { const fn = (u) => 0.06 + 0.84 * (u / 0.22) * Math.exp(1 - u / 0.22); return { under: [{ kind: 'area', fn, pal: SERIES[3] }], series: [{ kind: 'line', fn, pal: SERIES[3] }] } })(),
  'j curve': (() => { const fn = (u) => 0.08 + 0.82 * Math.pow(u, 3.2); return { under: [{ kind: 'area', fn, pal: SERIES[1] }], series: [{ kind: 'line', fn, pal: SERIES[1] }, { kind: 'points', data: [0.4, 0.72, 0.9].map((u) => [u, fn(u)]), pal: SERIES[1] }] } })(),
  hormesis: { under: [{ kind: 'area', fn: (u) => Math.max(0.45, HORM(u)), to: 0.45, pal: SERIES[2] }, { kind: 'area', fn: 0.45, to: (u) => Math.min(0.45, HORM(u)), pal: SERIES[1] }], series: [{ kind: 'line', fn: HORM }], hlines: [0.45] },
  rhythm: { under: [{ kind: 'zone', u: [0, 0.22] }, { kind: 'zone', u: [0.84, 1] }], over: [{ kind: 'dashed', fn: AGED, pal: SERIES[0] }], series: [{ kind: 'line', fn: YOUNG, pal: SERIES[3] }] },
  fev1: { over: [{ kind: 'dashed', data: sample(QUIT, 0.55, 1, 12), pal: SERIES[2] }], series: [{ kind: 'line', fn: NEVER }, { kind: 'line', fn: SMOKER, pal: SERIES[1] }], hlines: [0.25] },
  trend: { series: [{ kind: 'line', data: [[0.04, 0.14], [0.96, 0.8]], pal: SERIES[1] }, { kind: 'points', data: [[0.08, 0.2], [0.2, 0.24], [0.32, 0.36], [0.44, 0.42], [0.56, 0.5], [0.68, 0.6], [0.8, 0.64], [0.92, 0.78]] }] },
  'falling bars': { over: [{ kind: 'dashed', data: [[0.06, 0.92], [0.94, 0.14]], pal: MUTED, straight: true }], series: [{ kind: 'bars', data: [[0.12, 0.84], [0.31, 0.66], [0.5, 0.46]] }, { kind: 'bars', data: [[0.69, 0.26], [0.88, 0.1]], pal: { ...SERIES[0], small: SERIES[0].base } }] },
  compression: { axes: 'none', arrows: false, aspect: 0.7, over: [{ kind: 'hbars', rows: [[0.74, 0.58, 0.8], [0.28, 0.8, 0.9]] }, { kind: 'baseline' }] },
  pyramid: { axes: 'none', arrows: false, aspect: 1, over: [{ kind: 'pyramid', rows: [15, 16, 18, 20, 21, 22, 22, 20, 16, 10].map((v) => v / 24) }] },
}
export function ageChart(g, { x, y, size, turn = 0, id = 'chart', w, show = 'survival', card = false, axes, arrows, aspect, series = [], under = [], over = [] }) {
  const pre = CHARTS[show]
  if (!pre) throw new Error(`ageChart: no chart '${show}'`)
  const A = { aspect: aspect ?? pre.aspect ?? 0.85, card, axes: axes ?? pre.axes ?? 'L', arrows: arrows ?? pre.arrows ?? true }
  const P = plot(g, { x, y, size, turn, id, w, ...A, series: [...(pre.series ?? []), ...series], hlines: pre.hlines ?? [], vlines: pre.vlines ?? [] })
  // The plot area exactly as plot() lays it out.
  const px = size * g.k, U = px / 100, cx = g.X(x), cy = g.Y(y), ww = w ?? objW(px), lw = Math.max(2, ww * 1.05), fine = Math.max(1.5, ww * 0.45)
  const W = A.aspect <= 1 ? 100 : 100 / A.aspect, H = A.aspect <= 1 ? 100 * A.aspect : 100, m = A.card ? 11 : A.axes === 'none' ? 2 : 5
  const x0 = -W / 2 + m, x1 = W / 2 - m * 0.75, y0 = H / 2 - m, y1 = -H / 2 + m * 0.75
  const X = (s) => x0 + 3 + (x1 - x0 - 3) * s, Y = (v) => y0 - 3 - (y0 - y1 - 3) * v
  const Q = ([s, v]) => `${f(cx + X(s) * U)},${f(cy + Y(v) * U)}`, D = (pts) => `M${pts.map(Q).join(' L')}`
  const val = (fn, u) => (typeof fn === 'number' ? fn : fn(u))
  const pts = (L) => (L.data ? (L.step ? L.data.flatMap((p, k) => (k ? [[p[0], L.data[k - 1][1]], p] : [p])) : L.data) : sample((u) => val(L.fn, u), L.u0 ?? 0, L.u1 ?? 1, 60))
  const parts = [...P.parts]
  const layer = (L, i, where) => {
    const pal = L.pal ?? SERIES[0], gid = `${id}-${where}${i + 1}`
    if (L.kind === 'zone') { const p = L.pal ?? ZONE; return `<g id="${gid}"><path d="${D([[L.u[0], -0.02], [L.u[1], -0.02], [L.u[1], 1.04], [L.u[0], 1.04]])}Z" fill="${p.base}"/></g>` }
    if (L.kind === 'area') {
      const top = pts(L), bot = L.to === undefined ? [[top[top.length - 1][0], 0], [top[0][0], 0]] : typeof L.to === 'number' || typeof L.to === 'function' ? sample((u) => val(L.to, u), top[0][0], top[top.length - 1][0], 60).reverse() : pts({ data: L.to, step: L.step }).reverse()
      parts.push([`area ${i + 1}`, pal])
      return `<g id="${gid}"><path d="${D([...top, ...bot])}Z" fill="${pal[L.tone ?? 'base']}"/></g>`
    }
    if (L.kind === 'dashed') {
      const p = pts(L), d = L.data && !L.straight && !L.step ? `M${catmullPts(p.map(([s, v]) => [X(s), Y(v)])).map(([a, b]) => `${f(cx + a * U)},${f(cy + b * U)}`).join(' L')}` : D(p), dw = L.width ?? lw * 0.85
      if (pal !== MUTED) parts.push([`dashed ${i + 1}`, pal])
      return `<g id="${gid}"><path d="${d}" fill="none" stroke="${pal.outline}" stroke-width="${f(dw)}" stroke-linecap="butt" stroke-linejoin="round" stroke-dasharray="${f(dw * 2)} ${f(dw * 1.5)}"/></g>`
    }
    if (L.kind === 'hbars') {
      const ok = L.healthy ?? SERIES[2], ill = L.ill ?? SERIES[1], hh = (L.thick ?? 0.17) / 2
      parts.push(['healthy years', ok], ['years of illness', ill])
      return `<g id="${gid}">${L.rows.map(([v, h, e]) => {
        const r = Math.min(hh * (y0 - y1 - 3), 6), a = [X(0) * U + cx, Y(v + hh) * U + cy], bH = 2 * hh * (y0 - y1 - 3) * U, wH = (X(h) - X(0)) * U, wE = (X(e) - X(0)) * U, R = r * U
        const round = (x, y, wd, ht, rr) => `M${f(x + rr)},${f(y)} H${f(x + wd - rr)} Q${f(x + wd)},${f(y)} ${f(x + wd)},${f(y + rr)} V${f(y + ht - rr)} Q${f(x + wd)},${f(y + ht)} ${f(x + wd - rr)},${f(y + ht)} H${f(x + rr)} Q${f(x)},${f(y + ht)} ${f(x)},${f(y + ht - rr)} V${f(y + rr)} Q${f(x)},${f(y)} ${f(x + rr)},${f(y)} Z`
        const left = `M${f(a[0] + wH)},${f(a[1])} H${f(a[0] + R)} Q${f(a[0])},${f(a[1])} ${f(a[0])},${f(a[1] + R)} V${f(a[1] + bH - R)} Q${f(a[0])},${f(a[1] + bH)} ${f(a[0] + R)},${f(a[1] + bH)} H${f(a[0] + wH)} Z`
        return `<path d="${round(a[0], a[1], wE, bH, R)}" fill="${ill.small}"/><path d="${left}" fill="${ok.small}"/><path d="M${f(a[0] + wH)},${f(a[1])} V${f(a[1] + bH)}" stroke="${INK}" stroke-width="${f(fine)}"/><path d="${round(a[0], a[1], wE, bH, R)}" fill="none" stroke="${INK}" stroke-width="${f(ww * 0.8)}" stroke-linejoin="round"/>`
      }).join('')}</g>`
    }
    if (L.kind === 'baseline') {
      const hw = ww * 1.6, hl = ww * 2.4, [ex, ey] = [cx + X(1.02) * U, cy + Y(0) * U]
      return `<g id="${gid}"><path d="${D([[0, 0], [1, 0]])}" fill="none" stroke="${INK}" stroke-width="${f(ww * 0.8)}" stroke-linecap="round"/><path d="M${f(ex + hl * 0.4)},${f(ey)} L${f(ex - hl * 0.6)},${f(ey - hw)} L${f(ex - hl * 0.6)},${f(ey + hw)} Z" fill="${INK}" stroke="${INK}" stroke-width="${f(fine * 0.6)}" stroke-linejoin="round"/></g>`
    }
    if (L.kind === 'pyramid') {
      const left = L.left ?? SERIES[0], right = L.right ?? SERIES[3], n = L.rows.length, rowH = 1 / n, gap = 0.012
      parts.push(['left bars', left], ['right bars', right])
      const bars = L.rows.map((wv, k) => {
        const v0 = k * rowH + rowH * 0.1, v1 = (k + 1) * rowH - rowH * 0.1, hw = wv * 0.5
        const box = (s0, s1, p) => `<path d="${D([[s0, v0], [s1, v0], [s1, v1], [s0, v1]])}Z" fill="${p.small}" stroke="${p.outline}" stroke-width="${f(Math.max(1, fine * 0.9))}" stroke-linejoin="round"/>`
        return box(0.5 - gap - hw, 0.5 - gap, left) + box(0.5 + gap, 0.5 + gap + hw, right)
      }).join('')
      const tri = `<path d="${D([[0.5, 1.02], [0.02, 0], [0.98, 0]])}Z" fill="none" stroke="${GRID}" stroke-width="${f(fine)}" stroke-dasharray="${f(fine * 2.4)} ${f(fine * 1.8)}" stroke-linejoin="round"/>`
      return `<g id="${gid}">${bars}${tri}<path d="${D([[0.5, -0.02], [0.5, 1.03]])}" stroke="${INK}" stroke-width="${f(fine)}"/></g>`
    }
    throw new Error(`ageChart: no layer '${L.kind}'`)
  }
  const below = [...(pre.under ?? []), ...under].map((L, i) => layer(L, i, 'under')).join(''), above = [...(pre.over ?? []), ...over].map((L, i) => layer(L, i, 'over')).join('')
  let body = P.body.replace(`<g id="${id}-axes">`, `${below}<g id="${id}-axes">`)
  body = body.slice(0, -4) + above + '</g>'
  return { defs: P.defs, body, parts: uniq(parts) }
}
/** A smooth curve through points (Catmull–Rom), as `catmull` of shapes.mjs samples it. */
const catmullPts = (p, per = 10) => {
  const out = [p[0]]
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[Math.max(0, i - 1)], b = p[i], c = p[i + 1], d = p[Math.min(p.length - 1, i + 2)]
    for (let k = 1; k <= per; k++) { const t = k / per, t2 = t * t, t3 = t2 * t; out.push([0, 1].map((j) => 0.5 * (2 * b[j] + (-a[j] + c[j]) * t + (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * t2 + (-a[j] + 3 * b[j] - 3 * c[j] + d[j]) * t3))) }
  }
  return out
}

// ---------- the sheet ----------
const capital = (s) => s[0].toUpperCase() + s.slice(1)
const demosOf = (fn, plan, table, size = 96, extra = {}, key = 'kind') => Object.keys(table).map((kind) => ({ name: `${capital(plan)}, ${kind}`, size: 100, draw: (g) => fn(g, { x: 0, y: 0, size, [key]: kind, ...(extra[kind] ?? {}) }) }))
const V = (name, fn, o, size = 96) => ({ name, size: 100, draw: (g) => fn(g, { x: 0, y: 0, size, ...o }) })
const DRUGS = { metformin: [METFORMIN, { form: 'tablet side' }], captopril: [CAPTOPRIL, { score: 2 }], '17α-oestradiol': [ESTRADIOL_17A, { form: 'capsule', pal: PILLS.violet }], DHEA: [DHEA, { form: 'capsule' }], NDGA: [NDGA, { form: 'capsule', pal: PILLS.violet }], 'urolithin A': [UROLITHIN_A, { form: 'capsule', pal: PILLS.orange }], quercetin: [QUERCETIN, { form: 'capsule', pal: PILLS.yellow, letter: 'Q' }], astaxanthin: [ASTAXANTHIN, { form: 'softgel' }] }
export const DEMOS = [
  ...demosOf(pill, 'pill', PILL, 80), V('Pill, tablet scored in quarters', pill, { kind: 'tablet', score: 2 }, 80), V('Pill, capsule red with letter D', pill, { kind: 'capsule', pal: PILLS.red, letter: 'D', turn: -30 }, 80),
  ...demosOf(pillPack, 'pill pack', PACK), V('Pill pack, organiser with spilled pills', pillPack, { kind: 'organiser', spill: true }),
  V('Injection pen', injectionPen, { turn: -10 }),
  ...Object.entries(DRUGS).map(([n, [molecule, o]]) => V(`Drug, ${n}`, drug, { molecule, ...o, id: 'drug' })),
  ...demosOf(figure, 'figure', POSES, 96, { stand: { old: true } }, 'pose'), V('Figure, walking, young, violet clothes', figure, { pose: 'walk', pal: SERIES[4] }),
  ...demosOf(aid, 'aid', AID),
  ...demosOf(gauge, 'gauge', GAUGE), V('Gauge, zones reversed, low', gauge, { kind: 'zones', value: 0.15, order: ['bad', 'mid', 'good'] }),
  ...demosOf(clock, 'clock', TIME), V('Clock with a share (biological age)', clock, { kind: 'clock', share: 0.62 }), V('Clock, eating window', clock, { kind: 'clock', window: [8, 16] }),
  ...demosOf(device, 'device', DEVICE), V('Device, clipboard with scores', device, { kind: 'clipboard', content: 'scores' }), V('Device, clipboard, clock test with pencil', device, { kind: 'clipboard', content: 'clock', pencil: true }), V('Device, clipboard with lines', device, { kind: 'clipboard', content: 'lines' }), V('Device, dexa with a patient', device, { kind: 'dexa', patient: { old: true } }), V('Device, ring with a patient', device, { kind: 'ring', patient: true }),
  V('Blood drop', bloodDrop, {}), V('Blood drop with glucose', bloodDrop, { glucose: true }),
  ...demosOf(mark, 'mark', MARK, 80), V('Mark, male in accent', mark, { kind: 'male', colour: ACCENT.outline }, 80),
  ...Object.keys(CHARTS).map((show) => V(`Chart, ${show}`, ageChart, { show, id: 'chart' })), V('Chart, healthspan on a card', ageChart, { show: 'healthspan', card: true, id: 'chart' }),
]
