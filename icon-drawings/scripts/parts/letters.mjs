// Parts: letters for the few abbreviations a biologist reads in an icon (ATP, NAD⁺, P, Ac, ROS), drawn as round-capped
// strokes, not as text, so that they look the same in every program, need no font and are recoloured like any outline.
// The owner asked for them on 22 November 2026 ("for ROS … write ROS inside"; "Yes, letter those too").
//
//   import { lettering } from '../parts/letters.mjs'
//   const t = lettering(g, { x: 0, y: 0, h: 20, text: 'ATP', colour: pal.outline, id: 'label' })   // → { body, width }
//
// `x, y` is the middle of the capitals (in the units of `g`, a frame of `page` in ../cellkit.mjs), `h` their height in
// the same units, `colour` the stroke. The stroke is 0.17 h wide unless `w` (page pixels) says otherwise. Characters:
// A–Z, 0–9, a b c d e f g h i k l m n o p q r s t u x y, ε, and + - / and space. A raised `+` is written as NAD+ (it is
// raised by itself); any other character is raised with ^ before it ("Ca^2^+") and lowered with _ ("CO_2"), at 0.62
// of the size. Anything else throws, so a missing glyph is noticed.
// Keep to the usual abbreviation (ATP, NADH, p53, 5hmC, CpG, LPS); longer words are left out of icons.
// `fits(g, h)` says whether letters of height h are worth drawing (at least 13 px on the page): below that a part
// leaves them out, as it leaves out its highlight.
import { f } from '../shapes.mjs'

const K = 0.5523 // a quarter of an ellipse as one cubic
/** Cubic segments along an ellipse from angle a0 to a1 (degrees, y down, 0 = right), as [['C', …], …] after a move. */
function arc(cx, cy, rx, ry, a0, a1) {
  const n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 90)), step = (a1 - a0) / n, out = []
  const pt = (a) => [cx + rx * Math.cos((a * Math.PI) / 180), cy + ry * Math.sin((a * Math.PI) / 180)]
  const tan = (a) => [-rx * Math.sin((a * Math.PI) / 180), ry * Math.cos((a * Math.PI) / 180)]
  out.push(['M', ...pt(a0)])
  for (let i = 0; i < n; i++) {
    const s = a0 + i * step, e = s + step, k = (4 / 3) * Math.tan(((e - s) * Math.PI) / 720)
    const [x0, y0] = pt(s), [x1, y1] = pt(e), [tx0, ty0] = tan(s), [tx1, ty1] = tan(e)
    out.push(['C', x0 + k * tx0, y0 + k * ty0, x1 - k * tx1, y1 - k * ty1, x1, y1])
  }
  return out
}

/** An ellipse continued from the current point (no move). */
const arcOn = (...a) => arc(...a).slice(1)
const ring = (cx, cy, rx, ry) => [...arc(cx, cy, rx, ry, -90, 270), ['Z']]
/** A lowercase bowl (x-height 0.7, from 0.3 to 1), its left edge at x0. */
const bowl = (x0 = 0, w = 0.5) => ring(x0 + w / 2, 0.65, w / 2, 0.35)

// Glyphs in units of the capital height: x from 0 to `w`, y from 0 (top) to 1 (baseline); lowercase from 0.3, descenders
// to 1.3. A rounded sans serif.
const GLYPHS = {
  A: { w: 0.66, d: [['M', 0, 1], ['L', 0.33, 0], ['L', 0.66, 1], ['M', 0.13, 0.64], ['L', 0.53, 0.64]] },
  C: { w: 0.66, d: arc(0.37, 0.5, 0.37, 0.5, -42, -318) },
  D: { w: 0.6, d: [['M', 0, 0], ['L', 0, 1], ['L', 0.2, 1], ['C', 0.8, 1, 0.8, 0, 0.2, 0], ['Z']] },
  N: { w: 0.62, d: [['M', 0, 1], ['L', 0, 0], ['L', 0.62, 1], ['L', 0.62, 0]] },
  O: { w: 0.74, d: [...arc(0.37, 0.5, 0.37, 0.5, -90, 270), ['Z']] },
  P: { w: 0.54, d: [['M', 0, 1], ['L', 0, 0], ['L', 0.26, 0], ['C', 0.6, 0, 0.6, 0.54, 0.26, 0.54], ['L', 0, 0.54]] },
  R: { w: 0.6, d: [['M', 0, 1], ['L', 0, 0], ['L', 0.3, 0], ['C', 0.62, 0, 0.62, 0.52, 0.3, 0.52], ['L', 0, 0.52], ['M', 0.26, 0.52], ['L', 0.6, 1]] },
  S: { w: 0.58, d: [['M', 0.55, 0.13], ['C', 0.44, -0.02, 0.05, -0.04, 0.05, 0.25], ['C', 0.05, 0.5, 0.56, 0.44, 0.56, 0.74], ['C', 0.56, 1.04, 0.1, 1.03, 0.01, 0.86]] },
  M: { w: 0.78, d: [['M', 0, 1], ['L', 0, 0], ['L', 0.39, 0.62], ['L', 0.78, 0], ['L', 0.78, 1]] },
  T: { w: 0.6, d: [['M', 0, 0], ['L', 0.6, 0], ['M', 0.3, 0], ['L', 0.3, 1]] },
  c: { w: 0.52, d: arc(0.28, 0.66, 0.28, 0.34, -40, -320) },
  e: { w: 0.56, d: [['M', 0.03, 0.66], ['L', 0.53, 0.66], ...arc(0.28, 0.66, 0.27, 0.34, 0, -320).slice(1)] },
  '+': { w: 0.4, d: [['M', 0, 0.2], ['L', 0.4, 0.2], ['M', 0.2, 0], ['L', 0.2, 0.4]], raised: true },
  B: { w: 0.56, d: [['M', 0, 0.48], ['L', 0, 0], ['L', 0.25, 0], ['C', 0.54, 0, 0.54, 0.48, 0.25, 0.48], ['L', 0, 0.48], ['L', 0, 1], ['L', 0.28, 1], ['C', 0.6, 1, 0.6, 0.48, 0.28, 0.48]] },
  E: { w: 0.5, d: [['M', 0.5, 0], ['L', 0, 0], ['L', 0, 1], ['L', 0.5, 1], ['M', 0, 0.5], ['L', 0.42, 0.5]] },
  F: { w: 0.48, d: [['M', 0.48, 0], ['L', 0, 0], ['L', 0, 1], ['M', 0, 0.5], ['L', 0.4, 0.5]] },
  G: { w: 0.74, d: [...arc(0.37, 0.5, 0.37, 0.5, -42, -360), ['L', 0.42, 0.5]] },
  H: { w: 0.6, d: [['M', 0, 0], ['L', 0, 1], ['M', 0.6, 0], ['L', 0.6, 1], ['M', 0, 0.5], ['L', 0.6, 0.5]] },
  I: { w: 0, d: [['M', 0, 0], ['L', 0, 1]] },
  J: { w: 0.46, d: [['M', 0.46, 0], ['L', 0.46, 0.7], ['C', 0.46, 1.05, 0, 1.05, 0, 0.72]] },
  K: { w: 0.56, d: [['M', 0, 0], ['L', 0, 1], ['M', 0.56, 0], ['L', 0, 0.6], ['M', 0.17, 0.43], ['L', 0.56, 1]] },
  L: { w: 0.46, d: [['M', 0, 0], ['L', 0, 1], ['L', 0.46, 1]] },
  Q: { w: 0.78, d: [...ring(0.37, 0.5, 0.37, 0.5), ['M', 0.48, 0.72], ['L', 0.78, 1.02]] },
  U: { w: 0.6, d: [['M', 0, 0], ['L', 0, 0.66], ['C', 0, 1.06, 0.6, 1.06, 0.6, 0.66], ['L', 0.6, 0]] },
  V: { w: 0.66, d: [['M', 0, 0], ['L', 0.33, 1], ['L', 0.66, 0]] },
  W: { w: 0.94, d: [['M', 0, 0], ['L', 0.22, 1], ['L', 0.47, 0.22], ['L', 0.72, 1], ['L', 0.94, 0]] },
  X: { w: 0.6, d: [['M', 0, 0], ['L', 0.6, 1], ['M', 0.6, 0], ['L', 0, 1]] },
  Y: { w: 0.62, d: [['M', 0, 0], ['L', 0.31, 0.5], ['L', 0.62, 0], ['M', 0.31, 0.5], ['L', 0.31, 1]] },
  Z: { w: 0.56, d: [['M', 0, 0], ['L', 0.56, 0], ['L', 0, 1], ['L', 0.56, 1]] },
  0: { w: 0.56, d: ring(0.28, 0.5, 0.28, 0.5) },
  1: { w: 0.24, d: [['M', 0, 0.18], ['L', 0.24, 0], ['L', 0.24, 1]] },
  2: { w: 0.54, d: [['M', 0.02, 0.22], ['C', 0.08, -0.05, 0.52, -0.05, 0.52, 0.26], ['C', 0.52, 0.5, 0.1, 0.7, 0, 1], ['L', 0.54, 1]] },
  3: { w: 0.53, d: [['M', 0.02, 0.12], ['C', 0.15, -0.05, 0.52, -0.02, 0.5, 0.24], ['C', 0.49, 0.45, 0.3, 0.48, 0.2, 0.48], ['C', 0.34, 0.48, 0.54, 0.53, 0.53, 0.75], ['C', 0.52, 1.04, 0.12, 1.06, 0, 0.86]] },
  4: { w: 0.58, d: [['M', 0.42, 1], ['L', 0.42, 0], ['L', 0, 0.7], ['L', 0.58, 0.7]] },
  5: { w: 0.52, d: [['M', 0.48, 0], ['L', 0.08, 0], ['L', 0.04, 0.45], ['C', 0.2, 0.36, 0.52, 0.36, 0.52, 0.68], ['C', 0.52, 1.04, 0.1, 1.06, 0, 0.86]] },
  6: { w: 0.54, d: [['M', 0.46, 0.04], ['C', 0.12, 0.06, 0.02, 0.4, 0.02, 0.68], ...arcOn(0.27, 0.68, 0.25, 0.31, 180, 540)] },
  7: { w: 0.52, d: [['M', 0, 0], ['L', 0.52, 0], ['L', 0.16, 1]] },
  8: { w: 0.54, d: [...ring(0.27, 0.25, 0.22, 0.25), ...ring(0.27, 0.73, 0.27, 0.27)] },
  9: { w: 0.54, d: [['M', 0.08, 0.96], ['C', 0.42, 0.94, 0.52, 0.6, 0.52, 0.32], ...arcOn(0.27, 0.32, 0.25, 0.31, 0, 360)] },
  a: { w: 0.5, d: [...bowl(), ['M', 0.5, 0.3], ['L', 0.5, 1]] },
  b: { w: 0.5, d: [...bowl(), ['M', 0, 0], ['L', 0, 1]] },
  d: { w: 0.5, d: [...bowl(), ['M', 0.5, 0], ['L', 0.5, 1]] },
  f: { w: 0.36, d: [['M', 0.36, 0.04], ['C', 0.2, -0.04, 0.1, 0.04, 0.1, 0.24], ['L', 0.1, 1], ['M', 0, 0.36], ['L', 0.32, 0.36]] },
  g: { w: 0.5, d: [...bowl(), ['M', 0.5, 0.3], ['L', 0.5, 1.08], ['C', 0.5, 1.36, 0.08, 1.36, 0.04, 1.16]] },
  h: { w: 0.48, d: [['M', 0, 0], ['L', 0, 1], ['M', 0, 0.55], ['C', 0.05, 0.28, 0.48, 0.25, 0.48, 0.6], ['L', 0.48, 1]] },
  i: { w: 0, d: [['M', 0, 0.34], ['L', 0, 1], ['M', 0, 0.06], ['L', 0, 0.07]] },
  k: { w: 0.46, d: [['M', 0, 0], ['L', 0, 1], ['M', 0.44, 0.32], ['L', 0, 0.72], ['M', 0.14, 0.6], ['L', 0.46, 1]] },
  l: { w: 0, d: [['M', 0, 0], ['L', 0, 1]] },
  m: { w: 0.8, d: [['M', 0, 1], ['L', 0, 0.32], ['M', 0, 0.55], ['C', 0.03, 0.28, 0.4, 0.26, 0.4, 0.55], ['L', 0.4, 1], ['M', 0.4, 0.55], ['C', 0.43, 0.28, 0.8, 0.26, 0.8, 0.55], ['L', 0.8, 1]] },
  n: { w: 0.46, d: [['M', 0, 1], ['L', 0, 0.32], ['M', 0, 0.56], ['C', 0.04, 0.28, 0.46, 0.26, 0.46, 0.58], ['L', 0.46, 1]] },
  o: { w: 0.54, d: ring(0.27, 0.65, 0.27, 0.35) },
  p: { w: 0.5, d: [...bowl(), ['M', 0, 0.3], ['L', 0, 1.3]] },
  q: { w: 0.5, d: [...bowl(), ['M', 0.5, 0.3], ['L', 0.5, 1.3]] },
  r: { w: 0.34, d: [['M', 0, 1], ['L', 0, 0.32], ['M', 0, 0.58], ['C', 0.04, 0.36, 0.18, 0.3, 0.34, 0.33]] },
  s: { w: 0.44, d: [['M', 0.42, 0.4], ['C', 0.34, 0.28, 0.04, 0.28, 0.04, 0.48], ['C', 0.04, 0.66, 0.42, 0.62, 0.42, 0.82], ['C', 0.42, 1.03, 0.08, 1.03, 0.01, 0.9]] },
  t: { w: 0.36, d: [['M', 0.12, 0.08], ['L', 0.12, 0.86], ['C', 0.12, 1, 0.24, 1.02, 0.36, 0.98], ['M', 0, 0.34], ['L', 0.34, 0.34]] },
  u: { w: 0.46, d: [['M', 0, 0.32], ['L', 0, 0.72], ['C', 0, 1.04, 0.46, 1.04, 0.46, 0.72], ['M', 0.46, 0.32], ['L', 0.46, 1]] },
  x: { w: 0.46, d: [['M', 0, 0.32], ['L', 0.46, 1], ['M', 0.46, 0.32], ['L', 0, 1]] },
  y: { w: 0.48, d: [['M', 0, 0.32], ['L', 0.24, 0.98], ['M', 0.48, 0.32], ['L', 0.16, 1.3]] },
  'ε': { w: 0.44, d: [['M', 0.42, 0.4], ['C', 0.3, 0.27, 0.03, 0.29, 0.04, 0.47], ['C', 0.05, 0.6, 0.18, 0.64, 0.3, 0.64], ['C', 0.15, 0.64, 0.01, 0.68, 0.01, 0.82], ['C', 0.01, 1.03, 0.3, 1.04, 0.44, 0.92]] },
  '-': { w: 0.36, d: [['M', 0, 0.6], ['L', 0.36, 0.6]] },
  '/': { w: 0.4, d: [['M', 0.4, 0], ['L', 0, 1]] },
  ' ': { w: 0.2, d: [] },
}
/** Raised and lowered characters (after ^ and _): their size, and where their top goes, in capital heights. */
const SMALL = 0.62, RAISE = -0.12, LOWER = 0.56
/** The gap between two glyphs, in capital heights (a little less before a raised or lowercase glyph). */
const GAP = 0.26

/** The characters of `text` with their size and top (in capital heights): ^ raises and _ lowers the next one. */
function layout(text) {
  const out = []
  let mode = ''
  for (const ch of text) {
    if ((ch === '^' || ch === '_') && !mode) { mode = ch; continue }
    const gl = glyph(ch)
    out.push(mode ? { gl, size: SMALL, top: mode === '^' ? RAISE : LOWER } : { gl, size: 1, top: 0 })
    mode = ''
  }
  return out
}
/** The width of `text` in capital heights. */
export const textWidth = (text) => layout(text).reduce((s, { gl, size }, i) => s + gl.w * size + (i ? GAP * (size < 1 ? 0.6 : 1) : 0), 0)
const glyph = (ch) => { const gl = GLYPHS[ch]; if (!gl) throw new Error(`letters.mjs has no glyph for "${ch}"`); return gl }

/** Whether letters of height h (units of g) are large enough on the page to draw. */
export const fits = (g, h) => h * g.k >= 13

/**
 * Stroked letters centred on x, y (the middle of the capitals). Options: h (capital height, units of g), text, colour,
 * w (stroke in page pixels, default 0.17 h), id, turn (degrees about x, y). Returns { body, width } (width in units of g).
 */
export function lettering(g, { x, y, h, text, colour, w, id = 'letters', turn = 0 }) {
  const width = textWidth(text) * h, lw = w ?? 0.17 * h * g.k
  let x0 = x - width / 2
  const top = y - h / 2, parts = []
  layout(text).forEach(({ gl, size, top: t }, i) => {
    if (i) x0 += GAP * (size < 1 ? 0.6 : 1) * h
    const P = (u, v) => g.P([x0 + u * size * h, top + (t + v * size) * h]).map(f).join(',')
    parts.push(gl.d.map(([c, ...n]) => (c === 'Z' ? 'Z' : `${c}${n.reduce((a, _, i) => (i % 2 ? a : [...a, P(n[i], n[i + 1])]), []).join(' ')}`)).join(' '))
    x0 += gl.w * size * h
  })
  const rot = turn ? ` transform="rotate(${f(turn)} ${f(g.X(x))} ${f(g.Y(y))})"` : ''
  return { body: `<g id="${id}"${rot}><path d="${parts.join(' ')}" fill="none" stroke="${colour}" stroke-width="${f(lw)}" stroke-linecap="round" stroke-linejoin="round"/></g>`, width }
}
