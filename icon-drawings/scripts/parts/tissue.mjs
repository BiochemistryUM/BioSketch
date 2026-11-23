// Shared parts of the redrawn icons, group "tissue": whole cells, an epithelial row, blood vessels and red blood cells,
// a bacterium, arrows of every kind and a few marks (plus, cross, lightning). Each part is a function
// `part(g, { x, y, size, turn, id, w, pal, ...options })` that returns { defs, body, parts }, drawn in the frame `g` of
// `page()` (../cellkit.mjs). `size` is the longer extent of the part on the page in g's units, outline included; `turn`
// turns it about x, y in degrees (clockwise, as SVG); `w` overrides the main outline in page pixels, which is otherwise
// picked from the size the part has on the page. Every id inside starts with `id`.
// Looks taken from the approved icons and the drafts: Cell (../silicodraw.mjs), Cancer cell's lumpy outline, Epithelium
// (ct03) and the epithelial cells (epithelia.mjs), Angiogenesis and the arrows (ct06), bentArrow (ct11), Bacterium (ct03),
// Red blood cell (approved, placed as it is).
import { BLUE, NUC, PEACH } from '../cellkit.mjs'
import { deep, hueGap, hueOf, rich, soft, toHex, toLch } from '../colour.mjs'
import { f } from '../shapes.mjs'
import { placeIcon, readIcon } from '../iconkit.mjs'

// ---------- palettes of this group ----------
export const CELL = soft(BLUE) // the generic cell (as Cell)
export const EPI = soft(PEACH) // epithelial cells (as epithelia.mjs)
export const LAMINA = soft(255) // basement membrane (as Epithelium in ct03)
export const VESSEL = soft(hueOf('#f3c6c6')) // vessel wall (18°, the rose of Angiogenesis and the endothelial cell)
export const RED = deep(hueOf('#e86b6b')) // red blood cells (22°, as the approved Red blood cell)
export const BACTERIUM = soft(hueOf('#d8ecd0')) // 137°, as the drafted Bacterium (ct03)
export const SIGNAL = soft(BLUE) // secreted signals and growth factors: blue dots
export const BOLT = rich(hueOf('#fde68a')) // lightning: the yellow of the set
// Arrows and marks that are not the colour of anything: a slate grey (chroma 0.03), so they never join a part's hue.
export const INK = toHex({ l: 0.5, c: 0.03, h: 255 })
const ink = (colour) => ({ base: colour, outline: colour })

// ---------- helpers ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
/** Outline of a cell or large body that is `px` page pixels across (12 on a full-page cell, about 5 on a 40 px one). */
export const cellW = (px) => f(clamp(1.5 + px / 11, 3.5, 12))
/** Outline of a nucleus or an organelle `px` across (10 when large). */
export const nucW = (px) => f(clamp(2 + px / 10, 3.5, 10))
/** Width of an arrow `px` long (about 6 at 40 px, 9 at 70, 11 from 90 on). */
export const arrowW = (px) => f(clamp(3.5 + px / 10, 4.5, 11))
const P2 = ([x, y]) => `${f(x)},${f(y)}`
const lineD = (pts) => `M${pts.map(P2).join(' L')}`
const rot = (cx, cy, turn) => (turn ? ` transform="rotate(${f(turn)} ${f(cx)} ${f(cy)})"` : '')
const grad = (id, [x0, y0, x1, y1], pal) =>
  `<linearGradient id="${id}" x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`
/** One gradient that lights every shape using it from its own top left (several cells). */
const boxGrad = (id, pal) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`
const hl = (cx, cy, rx, ry, r, fill) => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" transform="rotate(${r} ${f(cx)} ${f(cy)})" fill="${fill}"/>`
const stroked = (s, w) => (s ? ` stroke="${s}" stroke-width="${f(w)}" stroke-linejoin="round"` : '')
const ell = (cx, cy, rx, ry, fill, s = '', w = 0, r = 0) => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}"${r ? ` transform="rotate(${f(r)} ${f(cx)} ${f(cy)})"` : ''} fill="${fill}"${stroked(s, w)}/>`
const circ = (cx, cy, r, fill, s = '', w = 0) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${stroked(s, w)}/>`
const rrect = (x, y, w, h, r, fill, s = '', sw = 0) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(r)}" fill="${fill}"${stroked(s, sw)}/>`
const pline = (pts, colour, w, cap = 'round') => `<path d="${lineD(pts)}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
/** A smooth closed outline through page points (Catmull–Rom as cubic Béziers), as cellkit's smoothD. */
const smoothD = (p) => {
  const n = p.length
  let d = `M${P2(p[0])}`
  for (let i = 0; i < n; i++) {
    const a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n], e = p[(i + 2) % n]
    d += `C${f(b[0] + (c[0] - a[0]) / 6)},${f(b[1] + (c[1] - a[1]) / 6)} ${f(c[0] - (e[0] - b[0]) / 6)},${f(c[1] - (e[1] - b[1]) / 6)} ${P2(c)}`
  }
  return d + 'Z'
}
const bez = ([p0, p1, p2, p3], t) => [0, 1].map((i) => (1 - t) ** 3 * p0[i] + 3 * (1 - t) ** 2 * t * p1[i] + 3 * (1 - t) * t * t * p2[i] + t ** 3 * p3[i])
/** A curve through page points (Catmull–Rom), as a point list. */
const through = (pts, per = 16) => {
  if (pts.length < 3) return pts
  const out = []
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)]
    for (let j = 0; j < per; j++) {
      const t = j / per, t2 = t * t, t3 = t2 * t
      out.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)))
    }
  }
  out.push(pts.at(-1))
  return out
}
const lengthOf = (pts) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0)
/** The point `d` along a polyline and the direction there. */
const along = (pts, d) => {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], s = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (d <= s || i === pts.length - 1) { const t = s ? Math.min(1, d / s) : 0; return { p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], u: s ? [(b[0] - a[0]) / s, (b[1] - a[1]) / s] : [1, 0] } }
    d -= s
  }
}
/** A polyline cut back by `a` at its start and `b` at its end. */
const trim = (pts, a, b) => {
  const L = lengthOf(pts), out = [along(pts, a).p]
  let run = 0
  for (let i = 1; i < pts.length - 1; i++) { run += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (run > a && run < L - b) out.push(pts[i]) }
  out.push(along(pts, L - b).p)
  return out
}
/** Where a part goes on the page: its middle in pixels and its size in pixels. */
const at = (g, x, y, size) => ({ cx: g.X(x), cy: g.Y(y), px: size * g.k })
const group = (id, cx, cy, turn, inner) => `<g id="${id}"${rot(cx, cy, turn)}>${inner}</g>`
// A deterministic wobble (no randomness: the same call draws the same part).
const wob = (i, seed) => Math.sin(i * 12.9898 + seed * 78.233) * 0.5 + Math.sin(i * 4.1 + seed * 1.7) * 0.5

// =====================================================================================================================
// Cell: the generic cell, pale blue with the lilac nucleus (as the approved Cell), or any palette for a coloured cell type.
// Options: shape 'round' (an ellipse, `aspect` = height / width, default 0.87 as Cell) or 'lumpy' (the irregular outline
// of the approved Cancer cell, `lumps` bulges); nucleus (true), nucleolus (false), vesicles (true from 80 px on),
// pal (the cytoplasm), seed (varies a lumpy outline).
// Example: cell(g, { x: -20, y: 10, size: 40, shape: 'lumpy', pal: soft(25), nucleolus: true, id: 'tumour' })
export function cell(g, { x, y, size, turn = 0, id = 'cell', w, pal = CELL, shape = 'round', aspect, lumps = 8, nucleus = true, nucleolus = false, vesicles, seed = 0 }) {
  const { cx, cy, px } = at(g, x, y, size)
  w ??= cellW(px)
  aspect ??= shape === 'lumpy' ? 0.95 : 0.87
  const rx = px / 2 - w / 2, ry = rx * aspect
  let outline
  if (shape === 'lumpy') {
    // The approved Cancer cell: 16 points alternately at 40 and 31 (every fourth bulge a little smaller); scaled so the
    // smooth curve's outer edge lands at rx.
    const n = 2 * lumps
    const pts = Array.from({ length: n }, (_, i) => {
      const t = (i / n) * Math.PI * 2 + seed * 0.7, r = (i % 2 ? 0.775 : 1 - (i % 4 === 0 ? 0.05 : 0)) * (1 + 0.04 * wob(i, seed))
      return [cx + rx * 0.985 * r * Math.cos(t), cy + ry * 0.985 * r * Math.sin(t)]
    })
    outline = `<path d="${smoothD(pts)}" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="${f(w)}" stroke-linejoin="round"/>`
  } else outline = ell(cx, cy, rx, ry, `url(#${id}-gradient)`, pal.outline, w)
  // Nucleus as in Cell: radius 16 of 46, a little left of and above the middle; larger in a lumpy (tumour) cell.
  const nr = rx * (shape === 'lumpy' ? 0.4 : 0.348), nx = cx - rx * (shape === 'lumpy' ? 0.05 : 0.13), ny = cy - ry * 0.05, nw = nucW(2 * nr)
  const big = px >= 100
  vesicles ??= px >= 80
  const defs = grad(`${id}-gradient`, [cx - rx, cy - ry, cx + rx, cy + ry], pal) + (nucleus ? grad(`${id}-nucleus-gradient`, [nx - nr, ny - nr, nx + nr, ny + nr], NUC) : '')
  const ves = vesicles ? `<g id="${id}-vesicles">${[[24, 14, 4], [-28, 20, 3], [20, -22, 3]].map(([u, v, r]) => circ(cx + (u / 46) * rx, cy + (v / 40) * ry, (r / 46) * rx, pal.small)).join('')}</g>` : ''
  const nuc = nucleus
    ? `<g id="${id}-nucleus">${circ(nx, ny, nr - nw / 2, `url(#${id}-nucleus-gradient)`, NUC.outline, nw)}` +
      (nucleolus ? circ(nx + nr * 0.3, ny - nr * 0.2, nr * 0.28, NUC.small) : '') +
      (big ? hl(nx - nr * 0.38, ny - nr * 0.44, nr * 0.23, nr * 0.1, -45, NUC.light) : '') + '</g>'
    : ''
  const body = group(id, cx, cy, turn,
    `<g id="${id}-cytoplasm">${outline}${big ? hl(cx - rx * 0.6, cy - ry * 0.55, rx * 0.15, rx * 0.058, -38, pal.light) : ''}</g>` + ves + nuc)
  return { defs, body, parts: nucleus ? [['cytoplasm', pal], ['nucleus', NUC]] : [['cytoplasm', pal]] }
}

// =====================================================================================================================
// A cell type the owner has approved, placed as it is (placeIcon of ../iconkit.mjs): `name` is the file name in
// icon-drawings/ without .svg (CELL_TYPES lists those of 22 November 2026). `size` is its longer extent; outlines are set
// to what a cell of that size gets here (`w` overrides the thickest). Options: flip (mirror).
// Example: placeCellType(g, 'Macrophage', { x: 20, y: 0, size: 45, id: 'macrophage' })
export const CELL_TYPES = ['Adipocyte', 'Astrocyte', 'B cell', 'Basophil', 'Blastocyst', 'CAR-T cell', 'Cancer cell', 'Cancer stem cell', 'Cardiomyocyte', 'Cell', 'Cell cluster', 'Chondrocyte', 'Ciliated cell', 'Compacted morula', 'Dendritic cell', 'Endothelial cell', 'Enterocyte', 'Eosinophil', 'Fibroblast', 'Goblet cell', 'Haematopoietic stem cell', 'Hair cell', 'Hepatocyte', 'Keratinocyte', 'Macrophage', 'Mast cell', 'Megakaryocyte', 'Melanocyte', 'Memory cell', 'Microglia', 'Monocyte', 'Morula', 'Muscle satellite cell', 'NK cell', 'Neuron', 'Neutrophil', 'Oligodendrocyte', 'Oocyte', 'Osteoblast', 'Osteoclast', 'Osteocyte', 'Pericyte', 'Photoreceptor', 'Plant cell', 'Plasma cell', 'Platelet', 'Podocyte', 'Purkinje cell', 'Pyramidal neuron', 'Red blood cell', 'Regulatory T cell', 'Schwann cell', 'Senescent cell', 'Sickle cell', 'Smooth muscle cell', 'Sperm', 'Stem cell', 'T cell', 'Zygote']
/** Extent of a drawing from the numbers of its paths and shapes (copied from iconkit's roughBox). */
function roughBox(text) {
  const xs = [], ys = []
  for (const m of text.matchAll(/\bd="([^"]+)"/g)) {
    if (/[aA]/.test(m[1])) continue
    const nums = m[1].match(/-?\d*\.?\d+(?:e-?\d+)?/g)?.map(Number) || []
    for (let i = 0; i + 1 < nums.length; i += 2) { xs.push(nums[i]); ys.push(nums[i + 1]) }
  }
  for (const m of text.matchAll(/<(circle|ellipse)\b[^>]*>/g)) {
    const a = (k) => +((m[0].match(new RegExp(`\\b${k}="(-?[\\d.]+)"`)) || [])[1] ?? NaN)
    const rx = a('r') || a('rx'), ry = a('r') || a('ry')
    if (!isNaN(a('cx'))) { xs.push(a('cx') - rx, a('cx') + rx); ys.push(a('cy') - ry, a('cy') + ry) }
  }
  for (const m of text.matchAll(/<rect\b[^>]*>/g)) {
    const a = (k) => +((m[0].match(new RegExp(`\\b${k}="(-?[\\d.]+)"`)) || [])[1] ?? NaN)
    if (!isNaN(a('x'))) { xs.push(a('x'), a('x') + a('width')); ys.push(a('y'), a('y') + a('height')) }
  }
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}
export function placeCellType(g, name, { x, y, size, turn = 0, id, w, flip = false }) {
  const { cx, cy, px } = at(g, x, y, size)
  id ??= name.replace(/\W+/g, '-').toLowerCase()
  const { body: raw, defs: rawDefs } = readIcon(name, id)
  const box = roughBox(raw)
  const ext = Math.max(box[2] - box[0], box[3] - box[1])
  const placed = placeIcon(name, { x: cx, y: cy, width: (px * (box[2] - box[0])) / ext, turn, flip, stroke: w ?? cellW(px), prefix: id, box })
  // Its parts, read from its groups: the first colour of each (a gradient's first stop, else a fill); a group whose hue
  // lies within 36° of one already listed is a shade of that part (a highlight, granules) and is not listed again.
  const parts = []
  for (const m of raw.matchAll(new RegExp(`<g id="${id}-([\\w-]+)"[^>]*>([\\s\\S]*?)(?=<g id="${id}-|$)`, 'g'))) {
    const [, part, inner] = m
    const gid = (inner.match(/url\(#([\w-]+)\)/) || [])[1]
    const colour = gid ? (rawDefs.match(new RegExp(`id="${gid}"[\\s\\S]*?stop-color="(#[0-9A-Fa-f]{6})"`)) || [])[1] : (inner.match(/fill="(#[0-9A-Fa-f]{6})"/) || [])[1]
    if (!colour) continue
    const c = toLch(colour)
    if (c.c < 0.012 || parts.some(([, p]) => hueGap(toLch(p.base).h, c.h) < 36)) continue
    parts.push([part.replace(/-/g, ' '), { base: colour }])
  }
  return { defs: placed.defs, body: placed.body, parts }
}

// =====================================================================================================================
// Epithelial cells in a row: peach cells side by side (as the epithelial cells of epithelia.mjs and Epithelium of ct03),
// each with its lilac nucleus. Options: cells (4), shape 'cuboidal' (as tall as wide), 'columnar' (1.8 times) or
// 'squamous' (flat, 0.4), or tall (height / width of one cell); basement (a basement membrane under the row, blue as in
// Epithelium), pal. The row is centred on x, y, its longer side `size`.
// Example: epithelium(g, { x: 0, y: 30, size: 90, cells: 5, basement: true })
export function epithelium(g, { x, y, size, turn = 0, id = 'epithelium', w, pal = EPI, cells = 4, shape = 'cuboidal', tall, basement = false }) {
  const { cx, cy, px } = at(g, x, y, size)
  tall ??= { cuboidal: 1, columnar: 1.8, squamous: 0.4 }[shape] ?? 1
  // Cell width c from the longer side: the row is n·c wide and c·tall high, plus one outline, plus the basement
  // membrane (0.15 c thick) under it.
  const bm = basement ? 0.15 : 0, span = Math.max(cells, tall + bm)
  w ??= cellW(Math.min(1, tall) * (px / span) * 1.6)
  const c = (px - w) / span
  const lw = Math.max(3.5, c * bm), h = c * tall, W = cells * c, x0 = cx - W / 2, y0 = cy - (h + (basement ? lw : 0)) / 2
  const nr = Math.min(c, h) * (shape === 'squamous' ? 0.34 : 0.3), ny = y0 + h * (shape === 'columnar' ? 0.62 : 0.52), nw = nucW(2 * nr)
  const cellsD = Array.from({ length: cells }, (_, i) => {
    const X0 = x0 + i * c
    return rrect(X0, y0, c, h, Math.min(c, h) * 0.16, `url(#${id}-gradient)`, pal.outline, w) + (shape !== 'squamous' && c >= 50 ? hl(X0 + c * 0.3, y0 + Math.min(h * 0.17, c * 0.2), c * 0.14, c * 0.055, -40, pal.light) : '')
  }).join('')
  const nucs = Array.from({ length: cells }, (_, i) => {
    const nx = x0 + (i + 0.5) * c
    return (shape === 'squamous' ? ell(nx, ny, nr * 1.5 - nw / 2, nr - nw / 2, `url(#${id}-nucleus-gradient)`, NUC.outline, nw) : circ(nx, ny, nr - nw / 2, `url(#${id}-nucleus-gradient)`, NUC.outline, nw)) +
      (nr >= 18 ? hl(nx - nr * 0.38, ny - nr * 0.42, nr * 0.25, nr * 0.1, -45, NUC.light) : '')
  }).join('')
  const ly = y0 + h + w / 2 + lw / 2
  const run = [[x0 + lw / 2, ly], [x0 + W - lw / 2, ly]]
  const lamina = basement ? `<g id="${id}-basement-membrane">${pline(run, LAMINA.outline, lw)}${pline(run, LAMINA.shadow, Math.max(1, lw - 2 * Math.max(2, lw * 0.25)))}</g>` : ''
  const defs = boxGrad(`${id}-gradient`, pal) + boxGrad(`${id}-nucleus-gradient`, NUC)
  return {
    defs,
    body: group(id, cx, cy, turn, lamina + `<g id="${id}-cytoplasm">${cellsD}</g><g id="${id}-nuclei">${nucs}</g>`),
    parts: [['cytoplasm', pal], ['nucleus', NUC], ...(basement ? [['basement membrane', LAMINA]] : [])],
  }
}

// =====================================================================================================================
// Red blood cell, flat and small or full. view 'tilted' is the approved Red blood cell placed as it is; 'top' a disc seen
// face on, its darker dimple in the middle; 'side' the biconcave profile (Evans–Fung shape, thickened a little
// in the middle so it still reads small). Options: view, flat (no outline, one tone: for cells under about 30 px).
// Example: redBloodCell(g, { x: 10, y: 0, size: 20, view: 'side', turn: 30 })
export function redBloodCell(g, { x, y, size, turn = 0, id = 'red-blood-cell', w, view = 'tilted', flat }) {
  const { cx, cy, px } = at(g, x, y, size)
  flat ??= px < (view === 'side' ? 50 : 30)
  if (view === 'tilted' && !flat) {
    const p = placeIcon('Red blood cell', { x: cx, y: cy, width: px, turn, stroke: w ?? cellW(px), prefix: id, box: [32, 123.7, 480, 388.3] })
    return { defs: p.defs, body: p.body, parts: [['cell', RED]] }
  }
  w ??= flat ? 0 : cellW(px)
  const R = px / 2 - w / 2
  let inner
  if (view === 'side') {
    // Half thickness along the diameter (Evans and Fung 1972): R·√(1−ρ²)(C0 + C2ρ² + C4ρ⁴)/2, C0 raised from 0.207 to
    // 0.3 so that the dimple does not pinch shut when the cell is small.
    const T = (r) => R * Math.sqrt(Math.max(0, 1 - r * r)) * (0.3 + 2.0026 * r * r - 1.1228 * r ** 4) * 0.5
    const n = 48, top = [], bot = []
    for (let i = 0; i <= n; i++) { const r = -1 + (2 * i) / n, t = Math.max(T(r), 0) + (Math.abs(r) > 0.995 ? 0 : 0); top.push([cx + r * R, cy - t]); bot.unshift([cx + r * R, cy + t]) }
    const outlineD = `M${[...top, ...bot.slice(1, -1)].map(P2).join(' L')}Z`
    inner = `<path d="${outlineD}" fill="${flat ? RED.small : `url(#${id}-gradient)`}"${flat ? '' : ` stroke="${RED.outline}" stroke-width="${f(w)}" stroke-linejoin="round"`}/>` +
      (px >= 100 ? hl(cx - R * 0.55, cy - R * 0.2, R * 0.16, R * 0.05, -8, RED.light) : '')
  } else {
    // Face on (also 'tilted' when flat): a disc with the dimple in the middle, as the approved cell's dimple.
    const ry = view === 'tilted' ? R * 0.59 : R
    inner = flat
      ? ell(cx, cy, R, ry, RED.base) + ell(cx + R * 0.04, cy + ry * 0.05, R * 0.48, ry * 0.42, RED.small)
      : ell(cx, cy, R, ry, `url(#${id}-gradient)`, RED.outline, w) + ell(cx + R * 0.04, cy + ry * 0.05, R * 0.46, ry * 0.42, RED.small) + (px >= 100 ? hl(cx - R * 0.5, cy - ry * 0.55, R * 0.14, R * 0.05, -30, RED.light) : '')
  }
  return { defs: flat ? '' : grad(`${id}-gradient`, [cx - R, cy - R, cx + R, cy + R], RED), body: group(id, cx, cy, turn, inner), parts: [['cell', RED]] }
}

// =====================================================================================================================
// Blood vessel cut across: a rose wall round a pale lumen (the vessel of Angiogenesis seen end on). Options: wall (its
// share of the radius, 0.32), cells (red blood cells in the lumen, 0 to 7), nuclei (flat endothelial nuclei on the wall),
// pal (the wall). Example: vesselSection(g, { x: 0, y: 0, size: 60, cells: 3 })
export function vesselSection(g, { x, y, size, turn = 0, id = 'vessel', w, pal = VESSEL, wall = 0.32, cells = 0, nuclei = false }) {
  const { cx, cy, px } = at(g, x, y, size)
  w ??= cellW(px)
  const R = px / 2 - w / 2, r = R * (1 - wall), lw = f(Math.max(3.5, w * 0.55))
  const nucs = nuclei ? [200, 320, 80].map((deg, i) => {
    const a = (deg * Math.PI) / 180, rr = r + lw / 2 + R * 0.06, nx = cx + rr * Math.cos(a), ny = cy + rr * Math.sin(a)
    return ell(nx, ny, R * 0.17, R * 0.065, NUC.small, '', 0, deg + 90)
  }).join('') : ''
  // Red blood cells, packed in the lumen at fixed places.
  const spots = [[-0.36, -0.28, 20], [0.34, -0.3, -30], [-0.02, 0.44, 10], [0.4, 0.26, 60], [-0.42, 0.24, -50], [0.0, -0.02, 35], [0.02, -0.5, 0]].slice(0, cells)
  const rbc = spots.map(([u, v, t], i) => redBloodCell(fake(g), { x: cx + u * r, y: cy + v * r, size: r * (cells > 4 ? 0.44 : 0.52), turn: t, id: `${id}-rbc-${i + 1}`, view: i % 2 ? 'tilted' : 'top', flat: r * 0.5 < 40 }))
  const sep = hueGap(hueOf(pal.base), hueOf(RED.base)) >= 36
  return {
    defs: grad(`${id}-gradient`, [cx - R, cy - R, cx + R, cy + R], pal) + rbc.map((p) => p.defs).join(''),
    body: group(id, cx, cy, turn,
      `<g id="${id}-wall">${circ(cx, cy, R, `url(#${id}-gradient)`, pal.outline, w)}${px >= 100 ? hl(cx - R * 0.55, cy - R * 0.6, R * 0.17, R * 0.06, -42, pal.light) : ''}${nucs}</g>` +
      `<g id="${id}-lumen">${circ(cx, cy, r, pal.light, pal.outline, lw)}</g>` + (cells ? `<g id="${id}-red-blood-cells">${rbc.map((p) => p.body).join('')}</g>` : '')),
    parts: [['vessel', pal], ...(cells && sep ? [['red blood cells', RED]] : [])],
  }
}
/** A frame in page pixels (k = 1, centred on the page), for drawing a part inside another at page coordinates. */
const fake = (g) => ({ k: 1, X: (v) => v, Y: (v) => v, P: (p) => p })

// =====================================================================================================================
// Blood vessel lengthwise: a rose tube with a pale lumen down its middle (as Angiogenesis). Runs along x, `size` long;
// options: thick (outer width / length, 0.3), bend (the middle pushed sideways by this share of the length; or give
// `points`, [x, y] in g's units, for any course, and size is then the stroke's scale only), ends 'round' (closed) or
// 'open' (cut, as a vessel running off the edge), cells (red blood cells in the lumen), pal.
// Example: vessel(g, { x: 0, y: 30, size: 100, ends: 'open', cells: 4 })
export function vessel(g, { x, y, size, turn = 0, id = 'vessel', w, pal = VESSEL, thick = 0.3, bend = 0, points, ends = 'round', cells = 0 }) {
  const { cx, cy, px } = at(g, x, y, size)
  const T = px * thick
  w ??= cellW(T * 2.2)
  let pts
  if (points) pts = through(points.map(g.P))
  else {
    // A bent tube cut open leans at its ends, so the corners of the cut stand out: the course is shortened to fit.
    const lean = Math.atan(Math.abs(bend) * 4 * 1.333 * 0.75), Lb = ends === 'round' ? px - T : (px - T * Math.sin(lean)) / 1
    const L = Lb, a = [cx - L / 2, cy], b = [cx + L / 2, cy], s = bend * L * 1.333
    pts = Array.from({ length: 41 }, (_, i) => bez([a, [cx - L / 6, cy + s], [cx + L / 6, cy + s], b], i / 40))
  }
  const cap = ends === 'round' ? 'round' : 'butt', Lw = (T - 2 * w) * 0.42
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
  const box = [Math.min(...xs) - T / 2, Math.min(...ys) - T / 2, Math.max(...xs) + T / 2, Math.max(...ys) + T / 2]
  const lumen = ends === 'round' ? trim(pts, T * 0.22, T * 0.22) : pts
  const L = lengthOf(pts)
  const rbc = Array.from({ length: cells }, (_, i) => {
    const d = L * (0.12 + (0.76 * (i + 0.5)) / cells), { p, u } = along(pts, d)
    const t = (Math.atan2(u[1], u[0]) * 180) / Math.PI + [0, 70, -40, 20][i % 4]
    return redBloodCell(fake(g), { x: p[0], y: p[1], size: Lw * 0.95, turn: t, id: `${id}-rbc-${i + 1}`, view: i % 2 ? 'tilted' : 'top', flat: Lw * 0.95 < 60 })
  })
  const sep = hueGap(hueOf(pal.base), hueOf(RED.base)) >= 36
  return {
    defs: grad(`${id}-gradient`, box, pal) + rbc.map((p) => p.defs).join(''),
    body: group(id, cx, cy, turn,
      `<g id="${id}-wall">${pline(pts, pal.outline, T, cap)}${pline(pts, `url(#${id}-gradient)`, T - 2 * w, cap)}` +
        '</g>' +
      `<g id="${id}-lumen">${pline(lumen, pal.light, Lw, cap)}</g>` + (cells ? `<g id="${id}-red-blood-cells">${rbc.map((p) => p.body).join('')}</g>` : '')),
    parts: [['vessel', pal], ...(cells && sep ? [['red blood cells', RED]] : [])],
  }
}

// =====================================================================================================================
// Bacterium: a green rod (as the drafted Bacterium, hue 137) with a few granules and a flagellum at one end, or a round
// coccus. Options: shape 'rod' | 'coccus', aspect (width / length of the rod, 0.41), flagellum (true for a rod), granules
// (true), pal. size includes the flagellum. Example: bacterium(g, { x: 30, y: -10, size: 30, turn: -20 })
export function bacterium(g, { x, y, size, turn = 0, id = 'bacterium', w, pal = BACTERIUM, shape = 'rod', aspect = 0.41, flagellum, granules = true }) {
  const { cx, cy, px } = at(g, x, y, size)
  flagellum ??= shape === 'rod'
  const coccus = shape === 'coccus'
  // The rod is 92 long and the flagellum adds 37 (ct03); a coccus is round.
  const bodyLen = coccus ? px : flagellum ? px * (92 / 129) : px
  w ??= cellW(coccus ? bodyLen : bodyLen * aspect * 2.2)
  const Lr = bodyLen - w, H = coccus ? Lr : Lr * aspect
  const x0 = cx - px / 2 + w / 2, y0 = cy - H / 2, k = Lr / 92
  const fl = flagellum && !coccus
    ? `<g id="${id}-flagellum"><path d="M${['44,0', '47,5 51,8.5 55,7.5', '60,6 62,-5 67,-6.5', '72,-8 75,-2 80.5,3'].map((s, i) => (i ? 'C' : '') + s.split(' ').map((q) => { const [u, v] = q.split(',').map(Number); return P2([x0 + (u + 46) * k, cy + v * k]) }).join(' ')).join(' ')}" fill="none" stroke="${pal.outline}" stroke-width="${f(Math.max(3.5, w * 0.75))}" stroke-linecap="round"/></g>`
    : ''
  const shapeD = coccus ? circ(x0 + Lr / 2, cy, Lr / 2, `url(#${id}-gradient)`, pal.outline, w) : rrect(x0, y0, Lr, H, H / 2, `url(#${id}-gradient)`, pal.outline, w)
  const bx = x0 + Lr / 2
  const gr = granules ? `<g id="${id}-granules">${(coccus ? [[0.14, 0.12, 0.075]] : [[-22, -3, 4], [-2, 6, 5], [18, -5, 4]].map(([u, v, r]) => [u / 92, v / 92, r / 92])).map(([u, v, r]) => circ(bx + u * Lr, cy + v * Lr, Math.max(r * Lr, 1.6), pal.small)).join('')}</g>` : ''
  const big = H >= 60
  return {
    defs: grad(`${id}-gradient`, [x0, y0, x0 + Lr, y0 + H], pal),
    body: group(id, cx, cy, turn, fl + `<g id="${id}-cell">${shapeD}${big ? hl(coccus ? bx - Lr * 0.2 : x0 + Lr * 0.28, coccus ? cy - Lr * 0.22 : y0 + H * 0.2, Lr * (coccus ? 0.16 : 0.14), Lr * (coccus ? 0.06 : 0.035), coccus ? -45 : -8, pal.light) : ''}</g>` + gr),
    parts: [['cell', pal]],
  }
}

// =====================================================================================================================
// Arrows: one stroke with a filled head (ct06 `arrow`, ct11 `bentArrow`). arrow() points along +x before `turn`, centred on
// x, y and `size` long. Options: bend (the middle pushed sideways by this share of the length: -0.2 bows up, 0.2 down),
// points (a course through [x, y] points in g's units, drawn smooth, or with corners when `corners`; x, y, size, turn are
// then ignored), end 'head' | 'bar' | 'none', start (the same, at the tail), colour (the outline tone of what moves;
// INK by default), w (the line; from the length otherwise), head (length of the head in page pixels; 3.2 w).
// Example: arrow(g, { x: 0, y: 0, size: 40, turn: 90, colour: CELL.outline })
export function arrow(g, { x = 0, y = 0, size = 0, turn = 0, id = 'arrow', w, colour = INK, bend = 0, points, corners = false, end = 'head', start = 'none', head }) {
  let pts
  if (points) {
    const P = points.map(g.P)
    pts = corners ? P : through(P)
  } else {
    const { cx, cy, px } = at(g, x, y, size)
    const r = (turn * Math.PI) / 180, R = ([u, v]) => [cx + u * Math.cos(r) - v * Math.sin(r), cy + u * Math.sin(r) + v * Math.cos(r)]
    const L = px, s = bend * L * 1.333
    const n = bend ? 40 : 1
    pts = Array.from({ length: n + 1 }, (_, i) => R(bez([[-L / 2, 0], [-L / 6, s], [L / 6, s], [L / 2, 0]], i / n)))
  }
  const L = lengthOf(pts)
  w ??= arrowW(L)
  const hl_ = head ?? Math.min(w * 3.2, L * 0.42), hw = hl_ * 1.25, bar = w * 3.2
  const mark = (tipPts, kind) => {
    // tipPts: the line from its far end to the tip. A head is a triangle along the line's last stretch.
    const tip = tipPts.at(-1), back = along(tipPts, lengthOf(tipPts) - hl_).p, d = Math.hypot(tip[0] - back[0], tip[1] - back[1])
    const ux = (tip[0] - back[0]) / d, uy = (tip[1] - back[1]) / d
    if (kind === 'head') {
      const sw = Math.min(3, w * 0.3)
      // Pulled back by the round join, so the tip lands where it is asked.
      const t = [tip[0] - ux * sw * 0.9, tip[1] - uy * sw * 0.9], b = [t[0] - ux * hl_, t[1] - uy * hl_]
      return `<path d="M${[t, [b[0] - (uy * hw) / 2, b[1] + (ux * hw) / 2], [b[0] + (uy * hw) / 2, b[1] - (ux * hw) / 2]].map(P2).join(' L')}Z" fill="${colour}" stroke="${colour}" stroke-width="${f(sw)}" stroke-linejoin="round"/>`
    }
    if (kind === 'bar') { const t = [tip[0] - (ux * w) / 2, tip[1] - (uy * w) / 2]; return pline([[t[0] - (uy * bar) / 2, t[1] + (ux * bar) / 2], [t[0] + (uy * bar) / 2, t[1] - (ux * bar) / 2]], colour, w) }
    return ''
  }
  const cut = (kind) => (kind === 'head' ? hl_ * 0.75 : kind === 'bar' ? w * 0.5 : 0)
  const line = pline(trim(pts, cut(start), cut(end)), colour, w)
  const body = `<g id="${id}">${line}${mark(pts, end)}${mark([...pts].reverse(), start)}</g>`
  return { defs: '', body, parts: [['arrow', ink(colour)]] }
}

// Inhibition: an arrow whose end is a flat bar (⊣). Same options as arrow(). Example: inhibition(g, { x: 0, y: 0, size: 40 })
export const inhibition = (g, opts) => arrow(g, { id: 'inhibition', ...opts, end: 'bar' })

// Cycle arrow: part of a circle with a head, going round clockwise (or not, `clockwise: false`). size is the diameter.
// Options: sweep (degrees the arc covers, 290), arcs (1, or 2: two arcs each with a head, as a turnover sign), colour, w.
// Example: cycleArrow(g, { x: 0, y: 0, size: 50, arcs: 2 })
export function cycleArrow(g, { x, y, size, turn = 0, id = 'cycle-arrow', w, colour = INK, sweep, arcs = 1, clockwise = true }) {
  const { cx, cy, px } = at(g, x, y, size)
  w ??= arrowW(px)
  const head = Math.min(w * 3.2, px * 0.24), R = px / 2 - Math.max(w / 2, head * 0.625)
  sweep ??= arcs === 2 ? 140 : 290
  const out = []
  for (let k = 0; k < arcs; k++) {
    // Arc k starts after the gap that ends the one before; the gap of a single arc is at the top right.
    const a0 = -90 + (360 - sweep * arcs) / arcs / 2 + (k * 360) / arcs + 15
    const pts = Array.from({ length: 49 }, (_, i) => { const a = ((a0 + (sweep * i) / 48) * Math.PI) / 180; return [cx + R * Math.cos(a), cy + R * Math.sin(a)] })
    out.push(arrow(fake(g), { points: pts, corners: true, colour, w, head, id: `${id}-${k + 1}` }).body)
  }
  // Counter-clockwise: the clockwise drawing mirrored left to right.
  const inner = clockwise ? out.join('') : `<g transform="translate(${f(2 * cx)} 0) scale(-1 1)">${out.join('')}</g>`
  return { defs: '', body: group(id, cx, cy, turn, inner), parts: [['arrow', ink(colour)]] }
}

// Release: a burst of small dots fanning out from x, y towards +x (secretion, a released signal). size is the fan's
// length. Options: pal (the dots take its small tone; blue for growth factors and secreted signals), spread (degrees, 60),
// rows (3). Example: release(g, { x: 20, y: 0, size: 24, turn: -30 })
export function release(g, { x, y, size, turn = 0, id = 'release', pal = SIGNAL, spread = 60, rows = 3 }) {
  const { cx, cy, px } = at(g, x, y, size)
  // Five rays of dots from the source at the left end: the middle and outer rays with `rows` dots, the two between
  // them with one fewer, set between those, so the burst thins out as it spreads.
  const dots = [], r = px * 0.07, unit = px - 2 * r
  for (let k = 0; k < 5; k++) {
    const a = ((k / 4 - 0.5) * spread * Math.PI) / 180, odd = k % 2
    for (let j = 0; j < rows - odd; j++) { const d = r + unit * (j + 1 + odd * 0.5) / rows; dots.push(circ(cx - px / 2 + d * Math.cos(a), cy + d * Math.sin(a), r * (1.1 - 0.12 * (j + odd * 0.5)), pal.small)) }
  }
  return { defs: '', body: group(id, cx, cy, turn, dots.join('')), parts: [['signal', pal]] }
}

// =====================================================================================================================
// Plus and cross drawn as two strokes, for a "+" or "×" label (added, combined with; without, blocked). Options: colour, w.
// Example: plus(g, { x: 0, y: 0, size: 14 }); cross(g, { x: 0, y: 0, size: 14, colour: '#B0413E' })
export function plus(g, { x, y, size, turn = 0, id = 'plus', w, colour = INK }) {
  const { cx, cy, px } = at(g, x, y, size)
  w ??= f(clamp(px / 4.5, 3.5, 22))
  const h = px / 2 - w / 2
  return { defs: '', body: group(id, cx, cy, turn, pline([[cx - h, cy], [cx + h, cy]], colour, w) + pline([[cx, cy - h], [cx, cy + h]], colour, w)), parts: [['mark', ink(colour)]] }
}
export const cross = (g, opts) => plus(g, { id: 'cross', ...opts, turn: (opts.turn ?? 0) + 45, size: opts.size * Math.SQRT2 * 0.92 })

// Lightning: a yellow bolt for irradiation or stress, outlined in its own tone. Options: pal, w.
// Example: lightning(g, { x: 30, y: -30, size: 30, turn: 10 })
export function lightning(g, { x, y, size, turn = 0, id = 'lightning', w, pal = BOLT }) {
  const { cx, cy, px } = at(g, x, y, size)
  w ??= nucW(px * 0.55)
  const H = px - w
  const pts = [[-0.02, -0.5], [0.24, -0.5], [0.07, -0.1], [0.25, -0.1], [-0.15, 0.5], [-0.04, 0.07], [-0.23, 0.07]].map(([u, v]) => [cx + u * H, cy + v * H])
  return {
    defs: grad(`${id}-gradient`, [cx - 0.25 * H, cy - H / 2, cx + 0.25 * H, cy + H / 2], pal),
    body: group(id, cx, cy, turn, `<path d="M${pts.map(P2).join(' L')}Z" fill="url(#${id}-gradient)" stroke="${pal.outline}" stroke-width="${f(w)}" stroke-linejoin="round"/>`),
    parts: [['lightning', pal]],
  }
}

// ---------- the parts sheet ----------
export const DEMOS = [
  { name: 'Cell', size: 100, draw: (g) => cell(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Cell without nucleus', size: 100, draw: (g) => cell(g, { x: 0, y: 0, size: 100, nucleus: false }) },
  { name: 'Cell, lumpy', size: 100, draw: (g) => cell(g, { x: 0, y: 0, size: 100, shape: 'lumpy', pal: soft(25), nucleolus: true, vesicles: false }) },
  { name: 'Cell, small', size: 100, draw: (g) => cell(g, { x: 0, y: 0, size: 20 }) },
  { name: 'Cell type placed', size: 100, draw: (g) => placeCellType(g, 'Macrophage', { x: 0, y: 0, size: 100 }) },
  { name: 'Cell type placed small', size: 100, draw: (g) => placeCellType(g, 'Neutrophil', { x: 0, y: 0, size: 25, turn: 20 }) },
  { name: 'Epithelium, cuboidal', size: 100, draw: (g) => epithelium(g, { x: 0, y: 0, size: 100, cells: 4 }) },
  { name: 'Epithelium, columnar', size: 100, draw: (g) => epithelium(g, { x: 0, y: 0, size: 100, cells: 5, shape: 'columnar', basement: true }) },
  { name: 'Epithelium, squamous', size: 100, draw: (g) => epithelium(g, { x: 0, y: 0, size: 100, cells: 4, shape: 'squamous', basement: true }) },
  { name: 'Blood vessel, section', size: 100, draw: (g) => vesselSection(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Blood vessel, section with blood', size: 100, draw: (g) => vesselSection(g, { x: 0, y: 0, size: 100, cells: 5, nuclei: true }) },
  { name: 'Blood vessel', size: 100, draw: (g) => vessel(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Blood vessel, bent with blood', size: 100, draw: (g) => vessel(g, { x: 0, y: 0, size: 100, bend: -0.2, ends: 'open', cells: 4 }) },
  { name: 'Red blood cell', size: 100, draw: (g) => redBloodCell(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Red blood cell, face on', size: 100, draw: (g) => redBloodCell(g, { x: 0, y: 0, size: 100, view: 'top' }) },
  { name: 'Red blood cell, side', size: 100, draw: (g) => redBloodCell(g, { x: 0, y: 0, size: 100, view: 'side' }) },
  { name: 'Bacterium', size: 100, draw: (g) => bacterium(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Bacterium, coccus', size: 100, draw: (g) => bacterium(g, { x: 0, y: 0, size: 100, shape: 'coccus' }) },
  { name: 'Arrow', size: 100, draw: (g) => arrow(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Arrow, short', size: 100, draw: (g) => arrow(g, { x: 0, y: 0, size: 20, colour: CELL.outline }) },
  { name: 'Arrow, bent', size: 100, draw: (g) => arrow(g, { x: 0, y: 0, size: 90, bend: -0.25 }) },
  { name: 'Arrow, both ends', size: 100, draw: (g) => arrow(g, { x: 0, y: 0, size: 100, start: 'head' }) },
  { name: 'Inhibition', size: 100, draw: (g) => inhibition(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Cycle arrow', size: 100, draw: (g) => cycleArrow(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Cycle arrow, two', size: 100, draw: (g) => cycleArrow(g, { x: 0, y: 0, size: 100, arcs: 2 }) },
  { name: 'Release', size: 100, draw: (g) => release(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Plus', size: 100, draw: (g) => plus(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Cross', size: 100, draw: (g) => cross(g, { x: 0, y: 0, size: 100 }) },
  { name: 'Lightning', size: 100, draw: (g) => lightning(g, { x: 0, y: 0, size: 100 }) },
]
