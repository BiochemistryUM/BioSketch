// Eight icons of SiliCoDraw's "Organisms" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), the later drawings that replace the first where there are any, redrawn in the soft look
// of icon-drawings/STYLE.md from the shared parts: Nematode, Dauer larva, Germline-less worm, Low temperature longevity,
// Reproductive span (worm), Earthworm, Planarian and Rotifer. Compositions are read by hand from the source in its
// 100 × 100 box centred on 0,0 and scaled onto a 512 page (`page` of ../cellkit.mjs); outlines at 60 % (setStrokeScale),
// gloss on (nothing here is a closed round body: worms are flat, the thermometer is an object).
// Parts used: worm, plot of parts/assays.mjs (every nematode is the worm part); invertebrate 'earthworm', 'planarian',
// 'rotifer' and insect 'fly' of parts/organisms.mjs; arrow, cross of parts/tissue.mjs; GLASS, INK, objW of parts/lab.mjs.
// Drawn here because no part draws them: the inner organs of C. elegans laid along the worm part's own centre line (the
// pharynx with its two bulbs, eggs in the uterus, the gonad arms of the germline as a dashed ghost), and a thermometer
// in lab.mjs's glass with a cold blue reading (Low temperature longevity), shaped as the thermometer of ../immune/imG.mjs.
// Recoloured parts: the worm of Low temperature longevity is cream (95°) so that it stays 40° from the fly's tan.
// Lettered: nothing (SiliCoDraw writes no labels on these).
// Usage: node orG.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss, smoothD } from '../cellkit.mjs'
import { toLch } from '../colour.mjs'
import { f, setStrokeScale } from '../shapes.mjs'
import { insect, invertebrate, tone } from '../parts/organisms.mjs'
import { WORM, plot, worm } from '../parts/assays.mjs'
import { arrow, cross } from '../parts/tissue.mjs'
import { GLASS, INK, objW } from '../parts/lab.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012) are left out of the hue check; a palette used by several parts is listed once.
const icon = (name, [k, cx, cy], draw) => {
  const g = page(k, [cx, cy]), { defs, body, parts } = draw(g)
  const seen = parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base) === i)
  kit.cellType(name, seen, defs, body)
}
const join = (...ps) => ({ defs: ps.map((p) => p.defs ?? '').join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts ?? []) })
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })
/** The page scale that makes an extent of `ext` units 460 px (margins of about 26 px). */
const K = (ext) => 460 / ext

// ---------- small drawing helpers in g's units ----------
const P2 = (g, p) => g.P(p).map(f).join(',')
const path = (d, fill, s = '', sw = 0, extra = '') => `<path d="${d}" fill="${fill}"${s ? ` stroke="${s}" stroke-width="${f(sw)}" stroke-linejoin="round" stroke-linecap="round"` : ''}${extra}/>`
const lineD = (g, pts) => `M${pts.map((p) => P2(g, p)).join(' L')}`
const ellD = (g, u, v, rx, ry, rot = 0) => { const r = (rot * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r); return smoothD(Array.from({ length: 16 }, (_, i) => { const t = (i / 16) * 2 * Math.PI, a = rx * Math.cos(t), b = ry * Math.sin(t); return g.P([u + a * c - b * s, v + a * s + b * c]) })) }
const lin = (g, id, [x0, y0, x1, y1], a, b) => `<linearGradient id="${id}" x1="${f(g.X(x0))}" y1="${f(g.Y(y0))}" x2="${f(g.X(x1))}" y2="${f(g.Y(y1))}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`

/**
 * The centre line of the worm part (assays.mjs `worm`, a wave, not `bend`), so that organs can be laid inside it:
 * at(t, k) is the point k half-widths to the left of the centre line at t (0 head, 1 tail), in g's units; ang(t) the
 * direction there in degrees; hw(t) the half-width. The same arithmetic as the part.
 */
const wormLine = ({ x, y, size, turn = 0, amp = 0.1, waves = 1, phase = 0, width = 0.09 }) => {
  const len = size, W = width * len, A = amp * len, a = (turn * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a)
  const C = (t) => [-len / 2 + len * t, A * Math.sin(2 * Math.PI * waves * t + phase)]
  const T = (t) => { const dx = len, dy = A * 2 * Math.PI * waves * Math.cos(2 * Math.PI * waves * t + phase), l = Math.hypot(dx, dy); return [dx / l, dy / l] }
  const hw = (t) => (t < 0.1 ? W * Math.sqrt(Math.max(0, 1 - (1 - t / 0.1) ** 2)) : t > 0.6 ? W * ((1 - t) / 0.4) ** 1.1 : W)
  const place = ([u, v]) => [x + u * ca - v * sa, y + u * sa + v * ca]
  const at = (t, k = 0) => { const [u, v] = C(t), [tx, ty] = T(t), h = hw(t) * k; return place([u - ty * h, v + tx * h]) }
  const ang = (t) => { const [tx, ty] = T(t); return (Math.atan2(ty, tx) * 180) / Math.PI + turn }
  return { at, ang, hw }
}
/** The pharynx of C. elegans inside a worm: a narrow tube from the mouth with the metacorpus and the terminal bulb, in
 *  the worm's own tones (from 60 px). */
const pharynx = (g, L, pal, w, { t0 = 0.012, t1 = 0.17, scale = 1 } = {}) => {
  const tube = Array.from({ length: 11 }, (_, i) => L.at(t0 + ((t1 - t0) * i) / 10))
  const s = path(lineD(g, tube), 'none', pal.small, w * 0.55) + path(ellD(g, ...L.at((t0 + t1) / 2), 3.3 * scale, 2.5 * scale, L.ang((t0 + t1) / 2)), pal.small, pal.outline, w * 0.45) + path(ellD(g, ...L.at(t1), 3.6 * scale, 3.4 * scale), pal.small, pal.outline, w * 0.45)
  return s
}
/** Eggs in the uterus: small ellipses at the given places along the worm, alternately to each side of the centre line. */
const eggs = (g, L, pal, w, ts, { rx = 2.9, ry = 2.1, off = 0.25 } = {}) => ts.map((t, i) => path(ellD(g, ...L.at(t, i % 2 ? off : -off), rx, ry, L.ang(t)), pal.light, pal.small, w * 0.45)).join('')

// ---------- Nematode ----------
// C. elegans: the worm part in a full wave, head at the left, with its gut, and inside it the pharynx with its two bulbs
// and three eggs in the uterus by the vulva (SiliCoDraw's), drawn along the part's centre line.
icon('Nematode', [K(94), 0, 1], (g) => {
  const o = { x: 0, y: 1, size: 92, amp: 0.15, phase: Math.PI, width: 0.072 }, L = wormLine(o), w = objW(460)
  const p = worm(g, { ...o, gut: true, id: 'worm' })
  const inner = pharynx(g, L, WORM, w) + eggs(g, L, WORM, w, [0.43, 0.49, 0.55])
  return join(p, own('organs', inner))
})

// ---------- Dauer larva ----------
// The dauer: thin, radially shrunk and darker than a growing worm, thin and wavy (SiliCoDraw coils it in a spiral; the worm
// part cannot spiral, so it is drawn as a thin wavy worm). Its dark gut shows from 60 px. Palette: a dark brown-grey of the
// worm, as SiliCoDraw's (#9a8464).
const DAUER = tone(70, 0.66, 0.045)
icon('Dauer larva', [K(94), 0, 0], (g) => worm(g, { x: 0, y: 0, size: 92, amp: 0.15, phase: Math.PI, width: 0.045, gut: true, pal: DAUER, turn: -12, id: 'dauer' }))

// ---------- Germline-less worm ----------
// A plump adult worm with its pharynx; where the gonad's two U-shaped arms would run from the vulva the germline is
// missing: the arms are a dashed ghost in the worm's pale tone, crossed out in crimson (the tissue part's cross; 355°,
// 45° from the worm).
const CRIMSON = '#B02E6E'
icon('Germline-less worm', [K(96), 0, 1.5], (g) => {
  const o = { x: 0, y: 2, size: 94, amp: 0.085, phase: Math.PI, width: 0.105 }, L = wormLine(o), w = objW(460)
  const p = worm(g, { ...o, id: 'worm' })
  // The gonad: from the vulva at t 0.5 an arm runs forward (and back) on one side, turns and comes back on the other.
  const arm = (t1) => { const s = [], n = 12; for (let i = 0; i <= n; i++) s.push(L.at(0.5 + ((t1 - 0.5) * i) / n, 0.42)); const tip = L.at(t1 + (t1 > 0.5 ? 0.02 : -0.02)); for (let i = n; i >= 0; i--) s.push(L.at(0.5 + ((t1 - 0.5) * i) / n, -0.42)); return [...s.slice(0, n + 1), tip, ...s.slice(n + 1)] }
  const ghost = [arm(0.31), arm(0.69)].map((pts) => lineD(g, pts)).join(' ')
  const gw = Math.max(8, 0.32 * L.hw(0.5) * g.k * 2)
  let inner = path(ghost, 'none', WORM.small, gw + w * 0.9, ` stroke-dasharray="${f(w * 1.6)} ${f(w * 1.3)}"`) + path(ghost, 'none', WORM.light, gw)
  inner += pharynx(g, L, WORM, w, { scale: 1.2 })
  const [vx, vy] = L.at(0.5, 1), [ux, uy] = L.at(0.5, 0.7)
  inner += path(lineD(g, [[vx - 2, vy - 1.2 * Math.sign(vy - uy)], [ux, uy], [vx + 2, vy - 1.2 * Math.sign(vy - uy)]]), 'none', WORM.outline, w * 0.5)
  const [cx, cy] = L.at(0.5)
  return join(p, own('germline', inner), cross(g, { x: cx, y: cy, size: 19, colour: CRIMSON, id: 'cross' }))
})

// ---------- Low temperature longevity ----------
// A thermometer at the left reading low (blue), a downward arrow beside the reading, and the two ectotherms that live
// longer in the cold: a fruit fly (the fly part, turned) and a worm (the worm part, cream).
const COLD = tone(245, 0.7, 0.11), CREAM_WORM = tone(95, 0.93, 0.05)
icon('Low temperature longevity', [K(96), 1, 0], (g) => {
  const w = objW(330), tx = -31, defs = lin(g, 'thermometer-gradient', [tx - 14, -46, tx + 14, 46], GLASS.base, GLASS.shadow)
  const glass = g.D(`M${tx - 7},18.5 L${tx - 7},-38 C${tx - 7},-42.5 ${tx - 4},-46 ${tx},-46 C${tx + 4},-46 ${tx + 7},-42.5 ${tx + 7},-38 L${tx + 7},18.5 C${tx + 12.5},21.5 ${tx + 15},26.5 ${tx + 14.5},32 C${tx + 14},39.5 ${tx + 7},45 ${tx},45 C${tx - 7},45 ${tx - 14},39.5 ${tx - 14.5},32 C${tx - 15},26.5 ${tx - 12.5},21.5 ${tx - 7},18.5 Z`)
  let s = `<g id="thermometer-glass">${path(glass, 'url(#thermometer-gradient)', GLASS.outline, w)}</g>`
  const col = g.D(`M${tx - 3.2},26 L${tx - 3.2},12 C${tx - 3.2},10.2 ${tx - 1.8},9 ${tx},9 C${tx + 1.8},9 ${tx + 3.2},10.2 ${tx + 3.2},12 L${tx + 3.2},26 Z`)
  s += `<g id="thermometer-liquid">${path(col, COLD.base)}${path(ellD(g, tx, 32, 9.4, 9.4), COLD.base, COLD.outline, w * 0.6)}</g>`
  s += `<g id="thermometer-streak">${path(lineD(g, [[tx - 4, -38], [tx - 4, 4]]), 'none', GLASS.light, Math.max(2, 2.2 * g.k))}</g>`
  s += `<g id="thermometer-scale">${path(Array.from({ length: 9 }, (_, i) => lineD(g, [[tx + 10.5, -36 + i * 6], [tx + 10.5 + (i % 2 ? 3.5 : 6.5), -36 + i * 6]])).join(' '), 'none', INK, w * 0.5)}</g>`
  const down = arrow(g, { x: tx + 15, y: 9, size: 18, turn: 90, colour: COLD.outline, id: 'down-arrow' })
  const fly = insect(g, { x: 19, y: -15, size: 48, kind: 'fly', turn: -20, id: 'fly' })
  const wm = worm(g, { x: 20, y: 31, size: 54, amp: 0.1, width: 0.085, gut: true, pal: CREAM_WORM, id: 'worm' })
  return join({ defs, body: s, parts: [['liquid', COLD]] }, { ...down, parts: [] }, fly, wm)
})

// ---------- Reproductive span (worm) ----------
// A hermaphrodite worm across the top with its eggs, and under it the progeny per day: bars that rise to a peak on the
// second day and fall away as the self-sperm runs out. Eggs and bars share the progeny's pink.
const PROGENY = tone(350, 0.8, 0.09)
icon('Reproductive span (worm)', [K(92), -0.2, -8.5], (g) => {
  const o = { x: 0, y: -36, size: 90, amp: 0.085, phase: Math.PI, width: 0.08 }, L = wormLine(o), w = objW(460)
  const wm = worm(g, { ...o, id: 'worm' })
  const inner = pharynx(g, L, WORM, w, { t0: 0.012, t1: 0.13 }) + eggs(g, L, PROGENY, w, [0.42, 0.5, 0.58, 0.66], { rx: 3.2, ry: 2.3, off: 0.2 })
  const bars = plot(g, { x: 2, y: 13, size: 92, aspect: 0.55, card: false, axes: 'L', series: [{ kind: 'bars', data: [[0.1, 0.62], [0.28, 1], [0.46, 0.74], [0.64, 0.36], [0.82, 0.12]], pal: PROGENY, barWidth: 11 }], id: 'progeny' })
  return join(wm, own('organs', inner, [['eggs', PROGENY]]), bars)
})

// ---------- the parts as the icons ----------
icon('Earthworm', [K(96), 0, 0], (g) => invertebrate(g, { x: 0, y: 0, size: 96, kind: 'earthworm', id: 'earthworm' }))
icon('Planarian', [K(96), 0, 0], (g) => invertebrate(g, { x: 0, y: 0, size: 96, kind: 'planarian', id: 'planarian' }))
icon('Rotifer', [K(96), 0, 0], (g) => invertebrate(g, { x: 0, y: 0, size: 96, kind: 'rotifer', id: 'rotifer' }))

check()
console.log('written', OUT)
