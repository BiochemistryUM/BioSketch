// Parts: molecules and filaments, drawn once in the soft look of icon-drawings/STYLE.md and reused by every icon that shows
// them (free proteins, ubiquitin, phosphate, ATP, ions and small molecules, oxygen, growth factors, glucose, DNA, chromosomes,
// chromatin, RNA, microtubules, actin and collagen). Shapes and colours follow the drafts in ../cells/ct01, ct02, ct06, ct07,
// ct10 and ct11 (SiliCoDraw's icons redrawn, github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson).
//
// Every part is `part(g, { x, y, size, turn, id, w, pal, ...options })` and returns `{ defs, body, parts }`:
// `g` is a frame of `page` (../cellkit.mjs), `x, y, size` are in its units (`size`: the longer extent), `turn` in degrees
// about x, y, `w` the main outline in page pixels (by default from the size on the page), `pal` the palette. Every id
// inside starts with `id`. Internally each part is drawn in a box of 100 units about its middle (`frame`).
// Colours (the conventions of the set): protein amber (75°, `rich`), ubiquitin the deeper amber of ct11, phosphate
// mustard (92°), ATP yellow (96°), ions and small molecules green (165°), oxygen deep red, growth factors blue (the cell's
// 245°), DNA blue (267°, as ct07), chromosomes and chromatin the lilac NUC, RNA rose (15°), microtubules pale blue with
// violet alpha tubulin (283°), actin red (25°), collagen orange (52°).
// Small parts (ions, phosphates, ubiquitin beads, dots) are flat, with no outline. Parts with an outline become flat below
// a size where an outline of 3.5 px would fill them (ATP, oxygen, glucose, ligand, DNA, actin): see `flat` on each.
import { BLUE, NUC, highlight, smoothD } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex } from '../colour.mjs'
import { catmull, f, gradient2, pathOf } from '../shapes.mjs'
import { fits, lettering } from './letters.mjs'

// ---------- hues (OKLCH degrees) ----------
const PROTEIN = 75, PHOSPHATE = 92, YELLOW = hueOf('#fde68a'), ION = 165, SECOND_ION = 205, RED = hueOf('#e86b6b')
const DNA = hueOf('#4f6bb8'), NUC_HUE = hueOf(NUC.base), RNA = 15, TUBE = hueOf('#cfe3f5'), ALPHA = 283
const ACTIN = hueOf('#d64545'), COLLAGEN = hueOf('#d9824a')

// ---------- helpers ----------
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
/** The main outline (px) of a part whose longer extent on the page is `px`: 10 on a large one, never under 3.5. */
const lineFor = (px) => f(clamp(2.5 + px * 0.03, 3.5, 10))
/** Below this extent on the page (px) a part has no highlight. */
const BIG = 140
/** The local frame of a part: 100 units about x, y are `size` units of g. `ext` is the size on the page in px. */
const frame = (g, x, y, size) => {
  const s = size / 100, px = s * g.k
  return { px, ext: size * g.k, P: ([u, v]) => g.P([x + u * s, y + v * s]) }
}
/** The group of a part, turned about its middle. */
const wrap = (g, id, x, y, turn, inner) => `<g id="${id}"${turn ? ` transform="rotate(${f(turn)} ${f(g.X(x))} ${f(g.Y(y))})"` : ''}>${inner}</g>`
const ptsD = (pts) => `M${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' L')}`
const circle = (L, [u, v], r, fill, stroke = '', w = 0) => { const [cx, cy] = L.P([u, v]); return `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * L.px)}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${w}"` : ''}/>` }
const fillPath = (d, fill, stroke = '', w = 0) => `<path d="${d}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round"` : ''}/>`
const strokePath = (d, colour, w, cap = 'round') => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
/** A gradient over a box of the local frame, base at its top left, shadow at its bottom right. */
const grad = (id, L, [u0, v0, u1, v1], pal) => gradient2(id, [...L.P([u0, v0]), ...L.P([u1, v1])], pal.base, pal.shadow)
/** One gradient that lights every shape that uses it from its own top left (beads). */
const boxGrad = (id, pal) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`
const shine = (L, [u, v], rx, ry, rot, fill) => { const [cx, cy] = L.P([u, v]); return highlight(cx, cy, f(rx * L.px), f(ry * L.px), rot, fill) }
/** Lines of width `width` (px) with one outline round them all: the outlines first, then the fills over them. */
const union = (ds, width, fill, outline, w) => ds.map((d) => strokePath(d, outline, width + 2 * w)).join('') + ds.map((d) => strokePath(d, fill, width)).join('')
/** A polygon (local units) with its corners rounded by `r`, as a path on the page. */
const roundPoly = (L, pts, r) => {
  const n = pts.length, P = pts.map(L.P), R = r * L.px
  const toward = (a, b, d) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]), t = Math.min(d, l / 2) / l; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] }
  let d = ''
  for (let i = 0; i < n; i++) {
    const a = toward(P[i], P[(i - 1 + n) % n], R), b = toward(P[i], P[(i + 1) % n], R)
    d += `${i ? 'L' : 'M'}${f(a[0])},${f(a[1])} Q${f(P[i][0])},${f(P[i][1])} ${f(b[0])},${f(b[1])} `
  }
  return d + 'Z'
}
/** Cuts a point list into `n` runs that share their end points, as [first, last] indices. */
const runs = (pts, n) => Array.from({ length: n }, (_, i) => [Math.floor((i * (pts.length - 1)) / n), Math.floor(((i + 1) * (pts.length - 1)) / n)])
/**
 * One piece [a, b] of a tube along page points: its outline, then its fill. The outline reaches one point past each end
 * and the fill two, so that where pieces meet on a bend no wedge opens and no edge of an outline shows across the tube.
 */
const piece = (pts, [a, b], T, fill, outline, w) => {
  const cut = (k) => pts.slice(Math.max(0, a - k), Math.min(pts.length, b + 1 + k))
  return strokePath(ptsD(cut(1)), outline, T + 2 * w, 'butt') + strokePath(ptsD(cut(2)), fill, T, 'butt')
}
/**
 * A tube along page points: an outline twice as wide as `w` under a fill of width T. Drawn in pieces, each over the ones
 * before, so a tube that crosses itself shows where it passes over. Ends round, joins between pieces butt (no seam).
 */
const tube = (pts, T, fill, outline, w, pieces = 1) => {
  const rs = runs(pts, pieces)
  return rs.map((r, i) => {
    const ends = [i === 0 && pts[0], i === rs.length - 1 && pts.at(-1)].filter(Boolean)
    return ends.map((p) => capUnder(p, T, outline, w)).join('') + piece(pts, r, T, fill, outline, w) + ends.map((p) => capOver(p, T, fill)).join('')
  }).join('')
}
/** A round end of a tube: its outline goes under the piece it ends, a disc of its fill over it (hiding the seam). */
const capUnder = ([x, y], T, outline, w) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(T / 2 + w / 2)}" fill="${outline}" stroke="${outline}" stroke-width="${f(w)}"/>`
const capOver = ([x, y], T, fill) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(T / 2)}" fill="${fill}"/>`
/** Evenly spaced points along a point list, `step` apart (in the list's own units), from `start`. */
const along = (pts, step, start = step / 2) => {
  const out = []
  let d = 0, next = start
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]], l = Math.hypot(b[0] - a[0], b[1] - a[1])
    while (next <= d + l) { const t = (next - d) / l; out.push({ p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], dir: [(b[0] - a[0]) / l, (b[1] - a[1]) / l] }); next += step }
    d += l
  }
  return out
}
const lengthOf = (pts) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0)

// =====================================================================================================================
// Free proteins (amber, 75°, `rich`)
// =====================================================================================================================

const BLOB = [[2, -46], [30, -37], [46, -10], [41, 20], [18, 40], [-12, 45], [-37, 30], [-46, 2], [-31, -31]]

/**
 * Protein: a free (soluble) protein, a rounded lumpy blob with a gradient and one outline. Options: none.
 * `protein(g, { x: 10, y: -5, size: 20 })`
 */
export function protein(g, { x, y, size, turn = 0, id = 'protein', w, pal = rich(PROTEIN) }) {
  const L = frame(g, x, y, size), W = w ?? lineFor(L.ext)
  return {
    defs: grad(`${id}-gradient`, L, [-46, -46, 46, 46], pal),
    body: wrap(g, id, x, y, turn, fillPath(smoothD(BLOB.map(L.P)), `url(#${id}-gradient)`, pal.outline, W) + (L.ext >= BIG ? shine(L, [-21, -25], 13, 4.5, -38, pal.light) : '')),
    parts: [['protein', pal]],
  }
}

/**
 * Enzyme: a protein with an active-site pocket open to the right (aim it with `turn`). Options: `substrate` (a small
 * green molecule in the pocket), `substratePal`.
 * `enzyme(g, { x: 0, y: 0, size: 24, substrate: true, turn: 180 })`
 */
export function enzyme(g, { x, y, size, turn = 0, id = 'enzyme', w, pal = rich(PROTEIN), substrate = false, substratePal = deep(ION) }) {
  const L = frame(g, x, y, size), W = w ?? lineFor(L.ext)
  const rim = [28, 62, 96, 130, 164, 198, 232, 266, 300, 332].map((a, i) => { const t = (a * Math.PI) / 180, r = 46 * (1 + 0.035 * Math.sin(3 * t + 1) - (i % 3 === 1 ? 0.02 : 0)); return [r * Math.cos(t), r * Math.sin(t)] })
  const pocket = [[37, -19], [26, -15], [16, -8], [13, 0], [16, 8], [26, 15], [37, 19]]
  const sub = substrate ? smallBody(L, `${id}-substrate`, [29, 0], 10.5, substratePal, W * 0.8) : { defs: '', body: '' }
  return {
    defs: grad(`${id}-gradient`, L, [-46, -46, 46, 46], pal) + sub.defs,
    body: wrap(g, id, x, y, turn, `<g id="${id}-protein">${fillPath(smoothD([...rim, ...pocket].map(L.P)), `url(#${id}-gradient)`, pal.outline, W)}${L.ext >= BIG ? shine(L, [-20, -26], 13, 4.5, -38, pal.light) : ''}</g>` + sub.body),
    parts: substrate ? [['enzyme', pal], ['substrate', substratePal]] : [['enzyme', pal]],
  }
}

// A misfolded chain: a tube that winds about and crosses itself (local units, about ±44).
const TANGLE = [[-44, 22], [-38, -4], [-22, -26], [2, -34], [22, -24], [24, -2], [6, 10], [-14, 4], [-16, -14], [0, -20], [18, -8], [30, 12], [26, 32], [4, 40], [-18, 32], [-24, 14], [-6, 22], [16, 26], [40, 24], [44, 4]]
const tangle = (L, at = [0, 0], scale = 1, rot = 0) => {
  const c = Math.cos((rot * Math.PI) / 180), s = Math.sin((rot * Math.PI) / 180)
  return catmull(TANGLE.map(([u, v]) => [at[0] + scale * (u * c - v * s), at[1] + scale * (u * s + v * c)]), 10).map(L.P)
}

/**
 * Misfolded protein: one chain that has lost its fold, a tube tangled on itself (amber). Options: none.
 * `misfolded(g, { x: 0, y: 0, size: 30 })`
 */
export function misfolded(g, { x, y, size, turn = 0, id = 'misfolded-protein', w, pal = rich(PROTEIN) }) {
  const L = frame(g, x, y, size), W = w ?? lineFor(L.ext) * 0.8
  return {
    defs: grad(`${id}-gradient`, L, [-44, -40, 44, 44], pal),
    body: wrap(g, id, x, y, turn, tube(tangle(L), 9 * L.px, `url(#${id}-gradient)`, pal.outline, W, 9)),
    parts: [['protein', pal]],
  }
}

/**
 * Protein aggregate: several misfolded chains tangled into one clump (amyloid, inclusion). Options: `count` (2–5).
 * `aggregate(g, { x: 0, y: 0, size: 40, count: 4 })`
 */
export function aggregate(g, { x, y, size, turn = 0, id = 'protein-aggregate', w, pal = rich(PROTEIN), count = 4 }) {
  const L = frame(g, x, y, size), W = w ?? lineFor(L.ext) * 0.7
  const at = [[-15, -13, 0.6, 0], [15, -12, 0.58, 110], [-3, 15, 0.62, 220], [20, 18, 0.5, 300], [-24, 14, 0.48, 40]].slice(0, clamp(count, 2, 5))
  return {
    defs: grad(`${id}-gradient`, L, [-46, -42, 46, 46], pal),
    body: wrap(g, id, x, y, turn, at.map(([u, v, k, r]) => tube(tangle(L, [u, v], k, r), 9 * k * L.px * 1.15, `url(#${id}-gradient)`, pal.outline, W, 7)).join('')),
    parts: [['protein', pal]],
  }
}

/**
 * Antibody: a Y of three arms (two Fab arms, the Fc stem), one outline round them; when large enough the light chains
 * lie along the outer side of the Fab arms in a deeper tone. Options: `lightChains` (default: when 90 px or larger).
 * `antibody(g, { x: 30, y: -20, size: 18, turn: 30 })`
 */
export function antibody(g, { x, y, size, turn = 0, id = 'antibody', w, pal = rich(PROTEIN), lightChains }) {
  const L = frame(g, x, y, size), W = w ?? lineFor(L.ext) * 0.85
  const light = lightChains ?? L.ext >= 90
  const hinge = [0, 4], arms = [[-30, -36], [30, -36]], stem = [0, 42], A = 15
  const heavy = [ptsD([stem, hinge].map(L.P)), ...arms.map((a) => ptsD([hinge, a].map(L.P)))]
  // A light chain: a shorter arm beside the outer half of each Fab arm.
  const lights = arms.map(([ax, ay]) => {
    const l = Math.hypot(ax - hinge[0], ay - hinge[1]), [dx, dy] = [(ax - hinge[0]) / l, (ay - hinge[1]) / l], side = Math.sign(ax), [nx, ny] = [-dy * side, dx * side]
    const off = A * 0.5 + 4.5
    return ptsD([0.42, 0.98].map((t) => L.P([hinge[0] + dx * l * t + nx * off, hinge[1] + dy * l * t + ny * off])))
  })
  return {
    defs: grad(`${id}-gradient`, L, [-36, -42, 36, 48], pal),
    body: wrap(g, id, x, y, turn,
      (light ? `<g id="${id}-light-chains">${union(lights, 9 * L.px, pal.small, pal.outline, W)}</g>` : '') +
        `<g id="${id}-heavy-chains">${union(heavy, A * L.px, `url(#${id}-gradient)`, pal.outline, W)}${L.ext >= BIG ? shine(L, [-17, -18], 9, 3, 50, pal.light) : ''}</g>`),
    parts: [['antibody', pal]],
  }
}

// =====================================================================================================================
// Tags and energy: ubiquitin, phosphate, ATP
// =====================================================================================================================

/**
 * Ubiquitin chain: a short chain of touching beads (the deeper amber of ct11), flat. `size` is the chain's length.
 * Options: `count` (beads, default 4), `zigzag` (0 straight … 1).
 * `ubiquitin(g, { x: 20, y: 0, size: 14, count: 4, turn: -90 })`
 */
export function ubiquitin(g, { x, y, size, turn = 0, id = 'ubiquitin', pal = deep(PROTEIN), count = 4, zigzag = 0.5 }) {
  const L = frame(g, x, y, size), r = 100 / (1.8 * (count - 1) + 2), step = 1.8 * r
  const beads = Array.from({ length: count }, (_, i) => [-50 + r + i * step, (i % 2 ? 1 : -1) * zigzag * r * 0.35])
  return { defs: '', body: wrap(g, id, x, y, turn, beads.map((p) => circle(L, p, r, pal.small)).join('')), parts: [['ubiquitin', pal]] }
}

/**
 * Phosphate: a small flat mustard dot (as ct10). `size` is its diameter.
 * `phosphate(g, { x: 4, y: -6, size: 3 })`
 */
export function phosphate(g, { x, y, size, id = 'phosphate', pal = deep(PHOSPHATE), letter = 'auto' }) {
  const L = frame(g, x, y, size), h = 0.52 * size
  const P = (letter === 'auto' ? fits(g, h) : letter) ? lettering(g, { x, y, h, text: 'P', colour: pal.light, id: `${id}-letter` }).body : ''
  return { defs: '', body: `<g id="${id}">${circle(L, [0, 0], 50, pal.small)}${P}</g>`, parts: [['phosphate', pal]] }
}

/**
 * ATP: a yellow body (adenosine) with a tail of phosphates (as ct07). `size` is the length of an ATP; with fewer
 * `phosphates` (ADP 2, AMP 1) the drawing is drawn at the same scale and centred, so ATP and ADP match side by side.
 * The body is flat (no outline) below about 55 px. Options: `phosphates` (1–3), `flat`, `letters` ('auto': "A" on the
 * adenosine and "P" on each phosphate when they are large enough to read, true, false). Letters stay upright when turned.
 * `atp(g, { x: 0, y: 30, size: 10, turn: 180 })`
 */
export function atp(g, { x, y, size, turn = 0, id = 'ATP', w, pal = rich(YELLOW), phosphatePal = deep(PHOSPHATE), phosphates = 3, flat, letters = 'auto' }) {
  const L = frame(g, x, y, size), n = clamp(phosphates, 1, 3)
  const body = 18, pr = 10.9, at = [-5.8, 16.7, 39.2].slice(0, n)
  const dx = (22.5 * (3 - n)) / 2, cx = -32 + dx // centre the shorter molecule
  const isFlat = flat ?? L.ext < 55, W = w ?? clamp(body * 2 * L.px * 0.15, 3.5, 8)
  const tail = strokePath(ptsD([[cx, 0], [at.at(-1) + dx, 0]].map(L.P)), phosphatePal.small, Math.max(2, 4.3 * L.px))
  const dots = at.map((u) => circle(L, [u + dx, 0], pr, phosphatePal.small)).join('')
  // Letters, upright whatever the turn: "A" for adenosine, "P" for each phosphate (the textbook cartoon of ATP).
  const s = size / 100, ha = 1.02 * body * s, hp = 1.04 * pr * s
  const lettered = letters === 'auto' ? fits(g, hp) : letters
  const marks = lettered
    ? `<g id="${id}-letters">${lettering(g, { x: x + cx * s, y, h: ha, text: 'A', colour: pal.outline, id: `${id}-letter-A`, turn: -turn }).body}` +
      at.map((u, i) => lettering(g, { x: x + (u + dx) * s, y, h: hp, text: 'P', colour: phosphatePal.light, id: `${id}-letter-P${i + 1}`, turn: -turn }).body).join('') + '</g>'
    : ''
  const head = isFlat ? circle(L, [cx, 0], body, pal.small) : circle(L, [cx, 0], body - W / 2 / L.px, `url(#${id}-gradient)`, pal.outline, W) + (L.ext >= BIG * 1.5 ? shine(L, lettered ? [cx - 10.5, -10.5] : [cx - 7, -8], lettered ? 4.5 : 6, 2.1, -40, pal.light) : '')
  return {
    defs: isFlat ? '' : grad(`${id}-gradient`, L, [cx - body, -body, cx + body, body], pal),
    body: wrap(g, id, x, y, turn, `<g id="${id}-phosphates">${tail}${dots}</g><g id="${id}-adenosine">${head}</g>${marks}`),
    parts: [[id, pal]],
  }
}
/** ADP: ATP with two phosphates, at the scale of an ATP of the same `size`. `adp(g, { x: 0, y: 30, size: 10 })` */
export const adp = (g, o) => atp(g, { id: 'ADP', ...o, phosphates: 2 })

// =====================================================================================================================
// Ions and small molecules (green, 165°), oxygen, growth factors, glucose
// =====================================================================================================================

/** Places of up to nine dots in a scatter, in a unit circle. */
const SPOTS = [[-0.06, -0.08], [0.62, -0.46], [-0.58, -0.56], [0.56, 0.42], [-0.62, 0.44], [0.04, 0.8], [0.08, -0.86], [-0.9, -0.02], [0.9, 0.02]]
const dots = (L, count, r, fills) => SPOTS.slice(0, clamp(count, 1, 9)).map(([u, v], i) => circle(L, [u * (50 - r), v * (50 - r)], r, fills[i % fills.length])).join('')

/**
 * Ion: one flat green dot. `size` is its diameter (8–16 px on the page reads well). Options: `second` (a second kind of
 * ion, cerulean 205°, for a pump or exchanger that moves two kinds).
 * `ion(g, { x: 0, y: 0, size: 3 })`
 */
export function ion(g, { x, y, size, id = 'ion', second = false, pal = deep(second ? SECOND_ION : ION) }) {
  const L = frame(g, x, y, size)
  return { defs: '', body: `<g id="${id}">${circle(L, [0, 0], 50, pal.small)}</g>`, parts: [[second ? 'second ion' : 'ion', pal]] }
}

/**
 * Ions: a scatter of flat dots in a round patch of diameter `size`. Options: `count` (1–9), `dot` (diameter of a dot,
 * in g units; default a sixth of `size`), `mix` (every second dot the second kind), `second` (all the second kind).
 * `ions(g, { x: 20, y: 30, size: 16, count: 6, mix: true })`
 */
export function ions(g, { x, y, size, turn = 0, id = 'ions', count = 5, dot, mix = false, second = false, pal = deep(second ? SECOND_ION : ION), secondPal = deep(SECOND_ION) }) {
  const L = frame(g, x, y, size), r = ((dot ?? size / 6) / size) * 50
  return {
    defs: '',
    body: wrap(g, id, x, y, turn, dots(L, count, r, mix ? [pal.small, secondPal.small] : [pal.small])),
    parts: mix ? [['ion', pal], ['second ion', secondPal]] : [['ion', pal]],
  }
}

/** A round body with a gradient and an outline, flat in the small tone when it is small on the page. */
const smallBody = (L, id, at, r, pal, W, flat = r * 2 * L.px < 30) =>
  flat
    ? { defs: '', body: `<g id="${id}">${circle(L, at, r, pal.small)}</g>` }
    : { defs: grad(`${id}-gradient`, L, [at[0] - r, at[1] - r, at[0] + r, at[1] + r], pal), body: `<g id="${id}">${circle(L, at, r - W / 2 / L.px, `url(#${id}-gradient)`, pal.outline, f(W))}${r * 2 * L.px >= BIG * 0.6 ? shine(L, [at[0] - r * 0.4, at[1] - r * 0.44], r * 0.38, r * 0.15, -40, pal.light) : ''}</g>` }

/**
 * Ligand (small molecule): a green ball with an outline, as the ligand of ct02's receptor; flat under 30 px. `size` is
 * its diameter. Options: `flat`.
 * `ligand(g, { x: 0, y: -20, size: 6 })`
 */
export function ligand(g, { x, y, size, id = 'ligand', w, pal = deep(ION), flat }) {
  const L = frame(g, x, y, size), W = w ?? clamp(lineFor(L.ext) * 0.8, 3.5, 8)
  const b = smallBody(L, id, [0, 0], 50, pal, W, flat ?? L.ext < 30)
  return { defs: b.defs, body: b.body, parts: [['ligand', pal]] }
}

/**
 * Oxygen (O₂): two deep-red atoms joined, one outline round both (as ct06's Hypoxia); flat under 40 px. `size` is its
 * length. Options: `flat`.
 * `oxygen(g, { x: 15, y: -8, size: 8, turn: 20 })`
 */
export function oxygen(g, { x, y, size, turn = 0, id = 'oxygen', w, pal = deep(RED), flat }) {
  const L = frame(g, x, y, size), isFlat = flat ?? L.ext < 40, W = w ?? clamp(lineFor(L.ext) * 0.75, 3.5, 8)
  const atoms = [[-22, 0], [22, 0]], r = 28
  if (isFlat) return { defs: '', body: wrap(g, id, x, y, turn, atoms.map((a) => circle(L, a, r, pal.small)).join('') + strokePath(ptsD([[0, -r * 0.62], [0, r * 0.62]].map(L.P)), pal.outline, Math.max(1.2, L.px * 3))), parts: [['oxygen', pal]] }
  const R = r - W / 2 / L.px
  const disc = (a) => { const [cx, cy] = L.P(a), q = R * L.px; return `M${f(cx - q)},${f(cy)} A${f(q)},${f(q)} 0 1 0 ${f(cx + q)},${f(cy)} A${f(q)},${f(q)} 0 1 0 ${f(cx - q)},${f(cy)} Z` }
  const outlines = atoms.map((a) => fillPath(disc(a), pal.outline, pal.outline, 2 * W)).join('')
  const fills = atoms.map((a) => fillPath(disc(a), pal.base)).join('')
  const lights = L.ext >= BIG * 0.6 ? atoms.map(([u, v]) => shine(L, [u - 9, v - 11], 9, 3.6, -40, pal.light)).join('') : ''
  return { defs: '', body: wrap(g, id, x, y, turn, outlines + fills + lights), parts: [['oxygen', pal]] }
}

/**
 * Growth factor / secreted signal: a flat blue dot (as ct06's VEGF), or a scatter of them. `size` is the dot's diameter,
 * or with `count` above 1 the diameter of the patch. Options: `count` (1–9), `dot` (diameter of a dot in a scatter).
 * `growthFactor(g, { x: 40, y: -30, size: 20, count: 5 })`
 */
export function growthFactor(g, { x, y, size, turn = 0, id = 'growth-factor', pal = soft(BLUE), count = 1, dot }) {
  const L = frame(g, x, y, size), r = count > 1 ? ((dot ?? size / 5.5) / size) * 50 : 50
  return { defs: '', body: wrap(g, id, x, y, turn, dots(L, count, r, [pal.small])), parts: [['growth factor', pal]] }
}

/**
 * Glucose: a small hexagon (the sugar ring), green like every small molecule, with an outline; flat under 30 px.
 * `size` is its width. Options: `flat`.
 * `glucose(g, { x: -30, y: 10, size: 6 })`
 */
export function glucose(g, { x, y, size, turn = 0, id = 'glucose', w, pal = deep(ION), flat }) {
  const L = frame(g, x, y, size), isFlat = flat ?? L.ext < 30, W = w ?? clamp(lineFor(L.ext) * 0.8, 3.5, 8)
  const R = 50 - (isFlat ? 0 : W / 2 / L.px) - 1
  const corners = Array.from({ length: 6 }, (_, i) => { const a = ((i * 60 - 90) * Math.PI) / 180; return [R * Math.cos(a) * 1.0, R * Math.sin(a)] })
  const d = roundPoly(L, corners, R * 0.22)
  const inner = isFlat ? fillPath(d, pal.small) : fillPath(d, `url(#${id}-gradient)`, pal.outline, W) + (L.ext >= BIG * 0.6 ? shine(L, [-17, -20], 12, 4.5, -32, pal.light) : '')
  return { defs: isFlat ? '' : grad(`${id}-gradient`, L, [-45, -45, 45, 45], pal), body: wrap(g, id, x, y, turn, inner), parts: [['glucose', pal]] }
}

// =====================================================================================================================
// DNA, chromosomes, chromatin, RNA
// =====================================================================================================================

/**
 * The two strands of a double helix along a centre line (`centre(t)`, `normal(t)`, t from 0 to 1, local units), with
 * base pairs between them. Each strand passes in front and behind in turn: the parts behind are drawn first, then the
 * base pairs, then the parts in front. Large: tubes with an outline, strand 1 in the base tone, strand 2 in the shadow
 * tone, base pairs in the small tone. Flat: lines in the outline and small tones, base pairs in the base tone.
 */
const helix = (L, { centre, normal, twists, A, T, pal, W, isFlat, closed = false, n = Math.max(60, Math.round(twists * 40)) }) => {
  const strands = [1, -1].map((sign) => Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, [cx, cy] = centre(t), [nx, ny] = normal(t), ph = 2 * Math.PI * twists * t
    return { p: L.P([cx + nx * A * sign * Math.sin(ph), cy + ny * A * sign * Math.sin(ph)]), front: sign * Math.cos(ph) >= 0 }
  }))
  // Runs of each strand that lie wholly in front or behind.
  const split = (pts) => {
    const out = []
    let cur = [pts[0]]
    for (let i = 1; i < pts.length; i++) {
      cur.push(pts[i])
      if (pts[i].front !== pts[i - 1].front) { out.push({ front: pts[i - 1].front, pts: cur.map((q) => q.p) }); cur = [pts[i]] }
    }
    out.push({ front: cur.at(-1).front, pts: cur.map((q) => q.p) })
    return out
  }
  // The runs as [first, last] indices into the strand's points.
  const reach = (pts) => {
    let i = 0
    return split(pts).map((r) => { const a = i, b = i + r.pts.length - 1; i = b; return { front: r.front, ab: [a, b], all: pts.map((q) => q.p) } })
  }
  const Tp = T * L.px
  const style = isFlat ? [{ fill: pal.outline }, { fill: pal.small }] : [{ fill: pal.base }, { fill: pal.shadow }]
  const draw = (r, k) => {
    if (isFlat) return strokePath(ptsD(r.all.slice(r.ab[0], r.ab[1] + 1)), style[k].fill, Tp)
    const ends = closed ? [] : [r.ab[0] === 0 && r.all[0], r.ab[1] === r.all.length - 1 && r.all.at(-1)].filter(Boolean)
    return ends.map((p) => capUnder(p, Tp, pal.outline, W)).join('') + piece(r.all, r.ab, Tp, style[k].fill, pal.outline, W) + ends.map((p) => capOver(p, Tp, style[k].fill)).join('')
  }
  const parts = strands.map(reach)
  const back = parts.flatMap((rs, k) => rs.filter((r) => !r.front).map((r) => draw(r, k))).join('')
  const front = parts.flatMap((rs, k) => rs.filter((r) => r.front).map((r) => draw(r, k))).join('')
  // Base pairs: at set phases of each half turn, where the strands stand well apart.
  const perHalf = isFlat ? [0.5] : [0.25, 0.5, 0.75]
  const pairs = []
  for (let h = 0; h < twists * 2; h++)
    for (const q of perHalf) {
      const t = (h + q) / (twists * 2), [cx, cy] = centre(t), [nx, ny] = normal(t), ph = 2 * Math.PI * twists * t, s = Math.sin(ph) * A
      const inset = (T / 2 + (isFlat ? 0 : W / L.px)) * Math.sign(s)
      if (Math.abs(s) * 2 < T * 2.2) continue
      pairs.push(ptsD([L.P([cx + nx * (s - inset), cy + ny * (s - inset)]), L.P([cx - nx * (s - inset), cy - ny * (s - inset)])]))
    }
  const rungs = pairs.map((d) => strokePath(d, isFlat ? pal.base : pal.small, Math.max(1.5, Tp * 0.42), 'butt')).join('')
  return back + rungs + front
}

/**
 * DNA: a straight double helix, two strands wound round each other with base pairs between them (blue, as ct07's
 * mitochondrial DNA). `size` is its length. Options: `width` (diameter, g units; default 0.26 × size), `turns` (default
 * from the length: one turn per 1.9 widths), `flat` (default under 160 px long: plain lines, fewer base pairs).
 * `dna(g, { x: 0, y: 0, size: 60, width: 12, turn: -20 })`
 */
export function dna(g, { x, y, size, turn = 0, id = 'DNA', w, pal = deep(DNA), width, turns, flat }) {
  const L = frame(g, x, y, size), D = ((width ?? size * 0.26) / size) * 100
  const isFlat = flat ?? L.ext < 160, W = w ?? clamp(D * L.px * 0.06, 3.5, 7)
  const T = D * (isFlat ? 0.2 : 0.15), A = (D - T) / 2 - (isFlat ? 0 : W / L.px), tw = turns ?? Math.max(1, Math.round(100 / (D * 1.9)))
  const half = 50 - T / 2 - (isFlat ? 0 : W / L.px)
  return {
    defs: '',
    body: wrap(g, id, x, y, turn, helix(L, { centre: (t) => [-half + 2 * half * t, 0], normal: () => [0, 1], twists: tw, A, T, pal, W, isFlat })),
    parts: [['DNA', pal]],
  }
}

/**
 * Circular DNA: a ring of two strands wound round each other (a plasmid, mitochondrial DNA; as ct07). `size` is its
 * diameter. Options: `twists` (whole turns round the ring, default 8), `flat` (default under 160 px).
 * `circularDna(g, { x: 0, y: 0, size: 26 })`
 */
export function circularDna(g, { x, y, size, turn = 0, id = 'circular-DNA', w, pal = deep(DNA), twists = 8, flat }) {
  const L = frame(g, x, y, size), isFlat = flat ?? L.ext < 160, W = w ?? clamp(L.ext * 0.012, 3.5, 6)
  const T = isFlat ? 5.2 : 5, A = isFlat ? 7.5 : 7, R = 50 - A - T / 2 - (isFlat ? 0 : W / L.px)
  const centre = (t) => [R * Math.cos(2 * Math.PI * t), R * Math.sin(2 * Math.PI * t)], normal = (t) => [Math.cos(2 * Math.PI * t), Math.sin(2 * Math.PI * t)]
  return { defs: '', body: wrap(g, id, x, y, turn, helix(L, { centre, normal, twists, A, T, pal, W, isFlat, closed: true, n: twists * 48 })), parts: [['DNA', pal]] }
}

/** The outline of a band of half width hw(t) round a centre line (local points), with round ends; also its two sides. */
const ribbon = (cl, hw) => {
  const n = cl.length, left = [], right = []
  for (let i = 0; i < n; i++) {
    const a = cl[Math.max(0, i - 1)], b = cl[Math.min(n - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]), [nx, ny] = [-(b[1] - a[1]) / l, (b[0] - a[0]) / l], h = hw(i / (n - 1))
    left.push([cl[i][0] + nx * h, cl[i][1] + ny * h]); right.push([cl[i][0] - nx * h, cl[i][1] - ny * h])
  }
  const cap = (c, from, to) => { const a0 = Math.atan2(from[1] - c[1], from[0] - c[0]), r = Math.hypot(from[0] - c[0], from[1] - c[1]); return Array.from({ length: 11 }, (_, k) => { const a = a0 - (Math.PI * (k + 1)) / 12; return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)] }).filter(() => to) }
  return { outline: [...left, ...cap(cl.at(-1), left.at(-1), true), ...right.slice().reverse(), ...cap(cl[0], right[0], true)], left, right }
}

/**
 * Chromosome: a mitotic chromosome in the lilac of every nucleus, two sister chromatids joined at the centromere (an X),
 * one outline round both. Options: `chromatids` (2, or 1 for a single rod), `bands` (dark bands across the arms).
 * `chromosome(g, { x: 0, y: 0, size: 20, turn: 15 })`
 */
export function chromosome(g, { x, y, size, turn = 0, id = 'chromosome', w, pal = NUC, chromatids = 2, bands = false }) {
  const L = frame(g, x, y, size), W = w ?? lineFor(L.ext) * 0.9
  const pinch = (h) => (t) => h * (1 - 0.42 * Math.exp(-(((t - 0.5) / 0.09) ** 2)))
  const shapes = chromatids === 1
    ? [ribbon(catmull([[0, -40], [0, 40]], 60), pinch(12))]
    : [-1, 1].map((s) => ribbon(catmull([[-18, -40], [-9.5, -20], [-4.6, 0], [-9.5, 20], [-18, 40]].map(([u, v]) => [s * u, v]), 16), pinch(9.5)))
  const D = shapes.map((r) => pathOf(r.outline.map(L.P)))
  const band = (r, [t0, t1]) => { const n = r.left.length, [i0, i1] = [Math.round(t0 * (n - 1)), Math.round(t1 * (n - 1))]; return fillPath(pathOf([...r.left.slice(i0, i1 + 1), ...r.right.slice(i0, i1 + 1).reverse()].map(L.P)), pal.small) }
  const BANDS = [[0.13, 0.19], [0.28, 0.34], [0.66, 0.72], [0.8, 0.88]]
  return {
    defs: grad(`${id}-gradient`, L, [-28, -50, 28, 50], pal),
    body: wrap(g, id, x, y, turn,
      D.map((d) => fillPath(d, pal.outline, pal.outline, 2 * W)).join('') + D.map((d) => fillPath(d, `url(#${id}-gradient)`)).join('') +
        (bands ? `<g id="${id}-bands">${shapes.flatMap((r) => BANDS.map((b) => band(r, b))).join('')}</g>` : '') +
        (L.ext >= BIG ? (chromatids === 1 ? shine(L, [-5, -24], 7, 2.2, 90, pal.light) : shine(L, [-15, -25], 7, 2.2, 67, pal.light)) : '')),
    parts: [['chromosome', pal]],
  }
}

/**
 * Chromatin: a loose thread of chromatin in the deeper lilac of the nucleus (as ct01's chromatin). Options:
 * `nucleosomes` (beads on a string: nucleosomes on a thinner DNA thread), `width` (of the thread, px).
 * `chromatin(g, { x: 0, y: 0, size: 40, nucleosomes: true })`
 */
export function chromatin(g, { x, y, size, turn = 0, id = 'chromatin', w, pal = NUC, nucleosomes = false, width }) {
  const L = frame(g, x, y, size), dark = deep(NUC_HUE)
  const pts = catmull([[-46, 8], [-33, -10], [-18, 4], [-6, -12], [8, 6], [22, -8], [34, 8], [46, -4]].map(([u, v]) => [u, nucleosomes ? v * 0.55 : v]), 14)
  if (!nucleosomes) {
    const T = width ?? clamp(L.ext * 0.045, 3.5, 20)
    return { defs: '', body: wrap(g, id, x, y, turn, strokePath(ptsD(pts.map(L.P)), dark.base, T)), parts: [['chromatin', pal]] }
  }
  const W = w ?? clamp(lineFor(L.ext) * 0.6, 3.5, 6), r = 7, beads = along(pts, lengthOf(pts) / 6, lengthOf(pts) / 12)
  return {
    defs: boxGrad(`${id}-gradient`, pal),
    body: wrap(g, id, x, y, turn, strokePath(ptsD(pts.map(L.P)), pal.outline, width ?? clamp(L.ext * 0.018, 2, 8)) + beads.map(({ p }) => circle(L, p, r, `url(#${id}-gradient)`, pal.outline, f(W))).join('')),
    parts: [['chromatin', pal]],
  }
}

/**
 * RNA: one wavy strand (rose, as ct01 and ct07), flat. `size` is its length. Options: `waves` (default 2.5), `bases`
 * (short ticks along one side, the bases, which make it read as a nucleic acid), `width` (of the strand, px).
 * `rna(g, { x: 0, y: 10, size: 40, bases: true })`
 */
export function rna(g, { x, y, size, turn = 0, id = 'RNA', pal = deep(RNA), waves = 2.5, bases = false, width }) {
  const L = frame(g, x, y, size), T = width ?? clamp(L.ext * 0.045, 3.5, 20), Tu = T / L.px
  const A = bases ? 6 : 10, half = 50 - Tu / 2
  const pts = Array.from({ length: 121 }, (_, i) => { const t = i / 120; return [-half + 2 * half * t, -A * Math.sin(2 * Math.PI * waves * t) - (bases ? 4 : 0)] })
  const ticks = bases ? along(pts, lengthOf(pts) / Math.round(waves * 5), lengthOf(pts) / Math.round(waves * 10)).map(({ p: [u, v] }) => ptsD([L.P([u, v]), L.P([u, v + Tu * 0.5 + 9])])) : []
  return {
    defs: '',
    body: wrap(g, id, x, y, turn, ticks.map((d) => strokePath(d, pal.base, T * 0.6)).join('') + strokePath(ptsD(pts.map(L.P)), pal.small, T)),
    parts: [['RNA', pal]],
  }
}

// =====================================================================================================================
// Filaments: microtubule, actin, collagen
// =====================================================================================================================

/**
 * Microtubule: a tube built of tubulin dimers, alpha (violet) and beta (pale blue) in turn, in slanting rings (as ct01).
 * `size` is its length. Options: `width` (diameter, g units; default 0.39 × size: the draft's proportions; under 30 px
 * across, two rows of dimers instead of three).
 * `microtubule(g, { x: 0, y: 0, size: 60, width: 12, turn: 90 })`
 */
export function microtubule(g, { x, y, size, turn = 0, id = 'microtubule', w, pal = soft(TUBE), alphaPal = deep(ALPHA), width }) {
  const L = frame(g, x, y, size), H = ((width ?? size * 0.39) / size) * 100, W = w ?? clamp(2.5 + H * L.px * 0.045, 3.5, 10)
  const Wu = W / L.px, len = 100 - Wu, hgt = H - Wu
  // Three rows of dimers; on a thin tube (under 30 px across) two rows of larger ones, which still read as beads.
  const thin = H * L.px < 30
  const r = (thin ? 0.19 : 0.13) * H, sp = (thin ? 0.42 : 0.29) * H, rows = thin ? [[-0.2 * H, -0.05 * H], [0.2 * H, 0.05 * H]] : [[-0.289 * H, -0.036 * H], [0, 0], [0.289 * H, 0.036 * H]]
  let n = Math.floor((len - 0.24 * H - 2 * r) / sp) + 1
  n -= n % 2
  const xs = Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * sp)
  const [x0, y0] = L.P([-len / 2, -hgt / 2]), RW = len * L.px, RH = hgt * L.px, R = Math.min(0.22 * H * L.px, RH / 2)
  const rect = `<rect x="${f(x0)}" y="${f(y0)}" width="${f(RW)}" height="${f(RH)}" rx="${f(R)}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="${f(W)}"/>`
  const beads = (odd, fill) => rows.map(([v, dx]) => xs.filter((_, i) => i % 2 === odd).map((u) => circle(L, [u + dx, v], r, fill)).join('')).join('')
  return {
    defs: grad(`${id}-gradient`, L, [-len / 2, -hgt / 2, len / 2, hgt / 2], pal),
    body: wrap(g, id, x, y, turn, `<g id="${id}-tube">${rect}</g><g id="${id}-beta-tubulin">${beads(1, pal.small)}</g><g id="${id}-alpha-tubulin">${beads(0, alphaPal.outline)}</g>`),
    parts: [['microtubule', pal], ['alpha tubulin', alphaPal]],
  }
}

/**
 * Actin filament: two strands of round subunits wound round each other, staggered by half a subunit, each passing in
 * front and behind in turn (as ct02); a pale and a full red strand. `size` is its length. Options: `width` (g units;
 * default 0.29 × size), `flat` (default when a subunit is under 11 px across: no outlines, a pale rim between subunits).
 * `actin(g, { x: 0, y: 0, size: 60, width: 10 })`
 */
export function actin(g, { x, y, size, turn = 0, id = 'actin', w, pal = soft(ACTIN), fullPal = deep(ACTIN), width, flat }) {
  const L = frame(g, x, y, size), Wd = ((width ?? size * 0.29) / size) * 100
  const R = 0.217 * Wd, AMP = 0.283 * Wd, STEP = 0.316 * Wd, HALF = 1.48 * Wd
  const isFlat = flat ?? R * 2 * L.px < 22, W = w ?? clamp(R * L.px * 0.21, 3.5, 6)
  const N = Math.max(2, Math.floor((100 - 2 * R - STEP / 2) / STEP) + 1), span = (N - 1) * STEP + STEP / 2
  const beads = []
  for (let i = 0; i < N; i++)
    for (const strand of [0, 1]) {
      const u = -span / 2 + i * STEP + strand * (STEP / 2), at = (Math.PI * (u + HALF / 2)) / HALF, side = strand ? -1 : 1
      beads.push({ u, v: -side * AMP * Math.sin(at), depth: side * Math.cos(at), strand })
    }
  beads.sort((a, b) => a.depth - b.depth || a.u - b.u)
  const Rd = R - (isFlat ? 0 : W / 2 / L.px)
  const bead = (b) => isFlat
    ? circle(L, [b.u, b.v], Rd, b.strand ? fullPal.small : pal.small, pal.light, f(clamp(R * L.px * 0.16, 1, 2)))
    : circle(L, [b.u, b.v], Rd, `url(#${id}-strand-${b.strand + 1}-gradient)`, b.strand ? fullPal.outline : pal.outline, f(W))
  return {
    defs: isFlat ? '' : boxGrad(`${id}-strand-1-gradient`, pal) + boxGrad(`${id}-strand-2-gradient`, fullPal),
    body: wrap(g, id, x, y, turn, beads.map(bead).join('')),
    parts: [['actin', pal]],
  }
}

/**
 * Collagen fibre: a wavy orange fibre (as ct06's Fibrosis), flat. `size` is its length. Options: `strands` (a bundle of
 * parallel fibres, default 1), `waves` (default 2.5), `width` (of a fibre, px).
 * `collagen(g, { x: 0, y: 0, size: 60, strands: 3 })`
 */
export function collagen(g, { x, y, size, turn = 0, id = 'collagen', pal = soft(COLLAGEN), strands = 1, waves = 2.5, width }) {
  const L = frame(g, x, y, size), T = width ?? clamp(L.ext * 0.034, 3.5, 16), Tu = T / L.px
  const ink = toHex({ l: 0.72, c: 0.1, h: hueOf(pal.base) })
  const A = 5.5, gap = Math.max(Tu * 2.4, 12), half = 50 - Tu / 2
  const fibre = (k) => {
    const v0 = (k - (strands - 1) / 2) * gap, s = 1, ph = k * 0.45
    return Array.from({ length: 121 }, (_, i) => { const t = i / 120; return [-half + 2 * half * t, v0 + s * A * Math.sin(2 * Math.PI * waves * t + ph) * (1 + 0.25 * Math.sin(2 * Math.PI * 1.3 * t + k))] })
  }
  return {
    defs: '',
    body: wrap(g, id, x, y, turn, Array.from({ length: strands }, (_, k) => strokePath(ptsD(fibre(k).map(L.P)), ink, T)).join('')),
    parts: [['collagen', pal]],
  }
}

// =====================================================================================================================
// Every part alone, for the sheet the owner approves (parts/sheet.mjs)
// =====================================================================================================================
export const DEMOS = [
  { name: 'Protein', size: 100, draw: (g) => protein(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Enzyme', size: 100, draw: (g) => enzyme(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Enzyme with substrate', size: 100, draw: (g) => enzyme(g, { x: 0, y: 0, size: 100, substrate: true }) },
  { name: 'Misfolded protein', size: 100, draw: (g) => misfolded(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Protein aggregate', size: 100, draw: (g) => aggregate(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Antibody', size: 100, draw: (g) => antibody(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Ubiquitin chain', size: 100, draw: (g) => ubiquitin(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Phosphate', size: 100, draw: (g) => phosphate(g, { x: 0, y: 0, size: 40 }) },
  { name: 'ATP', size: 100, draw: (g) => atp(g, { x: 0, y: 0, size: 100 }) },
  { name: 'ADP', size: 100, draw: (g) => adp(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Ion', size: 100, draw: (g) => ion(g, { x: 0, y: 0, size: 40 }) },
  { name: 'Ions of two kinds', size: 100, draw: (g) => ions(g, { x: 0, y: 0, size: 100, count: 7, mix: true }) },
  { name: 'Ligand', size: 100, draw: (g) => ligand(g, { x: 0, y: 0, size: 60 }) },
  { name: 'Oxygen', size: 100, draw: (g) => oxygen(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Growth factor', size: 100, draw: (g) => growthFactor(g, { x: 0, y: 0, size: 100, count: 6 }) },
  { name: 'Glucose', size: 100, draw: (g) => glucose(g, { x: 0, y: 0, size: 70 }) },
  { name: 'DNA', size: 100, draw: (g) => dna(g, { x: 0, y: 0, size: 100 }) },
  { name: 'DNA, flat', size: 100, draw: (g) => dna(g, { x: 0, y: 0, size: 100, flat: true }) },
  { name: 'Circular DNA', size: 100, draw: (g) => circularDna(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Chromosome', size: 100, draw: (g) => chromosome(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Chromosome with bands', size: 100, draw: (g) => chromosome(g, { x: 0, y: 0, size: 100, bands: true }) },
  { name: 'Chromosome, one chromatid', size: 100, draw: (g) => chromosome(g, { x: 0, y: 0, size: 100, chromatids: 1 }) },
  { name: 'Chromatin', size: 100, draw: (g) => chromatin(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Nucleosomes', size: 100, draw: (g) => chromatin(g, { x: 0, y: 0, size: 100, nucleosomes: true }) },
  { name: 'RNA', size: 100, draw: (g) => rna(g, { x: 0, y: 0, size: 100 }) },
  { name: 'RNA with bases', size: 100, draw: (g) => rna(g, { x: 0, y: 0, size: 100, bases: true }) },
  { name: 'Microtubule', size: 100, draw: (g) => microtubule(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Actin filament', size: 100, draw: (g) => actin(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Collagen fibre', size: 100, draw: (g) => collagen(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Collagen bundle', size: 100, draw: (g) => collagen(g, { x: 0, y: 0, size: 100, strands: 3 }) },
]
