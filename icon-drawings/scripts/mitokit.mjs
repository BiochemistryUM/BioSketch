// The mitochondrion of icon-drawings/STYLE.md, as functions: the owner's palette and proportions (from
// Mitochondrion.svg), a mitochondrion of any length and height with cristae where they are asked for, bent and turned
// on the page. scripts/mito-dynamics.mjs draws fission, fusion, damage and the network with these, and every other
// icon that shows a mitochondrion draws it with these too (or places one of those files with ../iconkit.mjs), so that a
// mitochondrion looks the same everywhere.
//
//   import { mitochondrion, drawMito, standardMito } from '../mitokit.mjs'
//   const m = standardMito({ x: 256, y: 256, length: 300, turn: -15, id: 'mito1' })   // { defs, body }
import { bbox, f, pathOf, range, strokeScale } from './shapes.mjs'
import { gloss, glossTones } from './parts/surfaces.mjs'

export const MITO = { outline: '#A3483B', shadow: '#E07A66', base: '#F2A08C', inner: '#C95E4C', matrix: '#FBD9CE', light: '#FFF3EE' }
export const W = 6 // outline of large parts
// Proportions of the owner's Mitochondrion.svg, as shares of the half height H of a mitochondrion:
// space between the membranes (outline centre to outline centre) 17 of 113.5, crista 26 wide, junctions rounded at 10.
export const GAP_SHARE = 0.15
export const CRISTA_SHARE = 0.23
export const JUNCTION_SHARE = 0.088

/** Points from a to b along an outline that ends at ±end: closer together where the outline turns at the tips. */
export const along = (a, b, end) => {
  const ua = Math.asin(Math.max(-1, Math.min(1, a / end))), ub = Math.asin(Math.max(-1, Math.min(1, b / end)))
  const n = Math.max(2, Math.ceil(Math.abs(ub - ua) / 0.012))
  return Array.from({ length: n + 1 }, (_, i) => end * Math.sin(ua + ((ub - ua) * i) / n))
}
/** Half height of a rounded capsule (superellipse) of half length L and half height H at x. */
export const capsule = (L, H, n = 3) => (x) => (Math.abs(x) >= L ? 0 : H * (1 - Math.abs(x / L) ** n) ** (1 / n))

/**
 * A mitochondrion centred on 0,0: `outer` and `matrix` as closed point lists.
 * pinch: depth of a waist in the middle (0..1); fingers: cristae as { x, side: -1 top | 1 bottom, depth: share of the matrix height }.
 */
export function mitochondrion({ L, H, pinch = 0, sigma = 34, fingers, n = 3, minGap = 0 }) {
  // A small mitochondrion keeps the share, but never less than its two half outlines and a sliver of space.
  const GAP = Math.max(GAP_SHARE * H, minGap)
  const outerHalf = capsule(L, H, n)
  const waist = (x) => 1 - pinch * Math.exp(-((x / sigma) ** 2))
  const outer = (x) => outerHalf(x) * waist(x)
  const innerHalf = capsule(L - GAP, H - GAP, n)
  // The waist takes as much off the matrix as off the outer membrane, but leaves a thread of matrix.
  // At the waist a thread of matrix stays (7 units); nowhere else is the matrix held open.
  const inner = (x) => Math.max(pinch ? 7 * Math.exp(-((x / (1.5 * sigma)) ** 2)) : 0, innerHalf(x) - (outerHalf(x) - outer(x)))

  const outerPts = []
  // Round the tips: sample by angle near the ends so the outline does not get coarse there.
  for (const x of along(-L, L, L)) outerPts.push([x, -outer(x)])
  for (const x of along(L, -L, L)) outerPts.push([x, outer(x)])

  const end = L - GAP
  const r = JUNCTION_SHARE * H // rounding where a crista meets the inner membrane
  const fw = CRISTA_SHARE * H // width of a crista
  const edge = (side) => (x) => side * inner(x)
  const matrixPts = []
  const walk = (side, from, to) => {
    const dir = Math.sign(to - from)
    const own = fingers.filter((c) => c.side === side).sort((a, b) => dir * (a.x - b.x))
    let x = from
    const y = edge(side)
    for (const c of own) {
      const near = c.x - (dir * fw) / 2 // the side of the crista met first
      const far = c.x + (dir * fw) / 2
      for (const t of along(x, near - dir * r, end)) matrixPts.push([t, y(t)])
      // Rounded junction into the crista: a quarter turn from along the edge to straight in.
      const inward = -side // a top crista goes down (+y), a bottom one up
      const tipY = y(c.x) + inward * (2 * inner(c.x) * c.depth - fw / 2)
      const jy0 = y(near)
      for (const t of range(0, 1, 0.1)) {
        // quadratic from (near - dir r, y) through corner (near, y) to (near, y + inward r)
        const a = [near - dir * r, y(near - dir * r)]
        const b = [near, jy0]
        const d = [near, jy0 + inward * r]
        matrixPts.push([(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * b[0] + t * t * d[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * b[1] + t * t * d[1]])
      }
      // Down the near side, round the tip, back up the far side.
      for (const t of range(jy0 + inward * r, tipY, 3)) matrixPts.push([near, t])
      for (const a of range(Math.PI, 0, Math.PI / 16)) matrixPts.push([c.x + (dir * Math.cos(a) * fw) / 2, tipY + inward * Math.sin(a) * (fw / 2)])
      const jy1 = y(far)
      for (const t of range(tipY, jy1 + inward * r, 3)) matrixPts.push([far, t])
      for (const t of range(0, 1, 0.1)) {
        const a = [far, jy1 + inward * r]
        const b = [far, jy1]
        const d = [far + dir * r, y(far + dir * r)]
        matrixPts.push([(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * b[0] + t * t * d[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * b[1] + t * t * d[1]])
      }
      x = far + dir * r
    }
    for (const t of along(x, to, end)) matrixPts.push([t, y(t)])
  }
  walk(-1, -end, end)
  walk(1, end, -end)
  return { outer: outerPts, matrix: matrixPts, half: outer, inner, gap: GAP }
}

/** Bend points like a warp: the middle sinks by `bend`, the ends stay; then move to the page. */
export const place = (pts, { dx, dy, L, bend = 0, flip = 1, turn = 0 }) =>
  pts.map(([x, y]) => {
    const yy = y + bend * (1 - (x / L) ** 2)
    const c = Math.cos(turn), s = Math.sin(turn)
    const X = flip * x
    return [dx + X * c - yy * s, dy + X * s + yy * c]
  })

export const gradient = (id, x0, y0, x1, y1, end = MITO.shadow) =>
  `<linearGradient id="${id}" x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${MITO.base}"/><stop offset="1" stop-color="${end}"/></linearGradient>`

// The gloss of cells (STYLE.md) on the mitochondrion: with `setMitoGloss(true)` drawMito (and so standardMito and
// mitochondrion() of parts/organelles.mjs) gives the outer membrane the face-on gloss of `gloss` in
// parts/surfaces.mjs in place of the highlight ellipse; the matrix, the cristae and the inner membrane stay flat, and
// the tones are kept clear of the matrix, so they show only between the two membranes. Off by default, so every
// script draws exactly what was approved. `cells/glossy-mito.mjs` does the same to drawings that were not made here.
let MITO_GLOSS = false
export const setMitoGloss = (on = true) => { MITO_GLOSS = !!on }
export const mitoGlossOn = () => MITO_GLOSS
/** The tones of the mitochondrion's gloss (glossTones of its palette); `end` is where the outer gradient ends. */
export const mitoTones = () => glossTones({ base: MITO.base, shadow: MITO.shadow, light: MITO.light })
/**
 * The gloss of one mitochondrion in page points: `outer` and `matrix` as lists of subpaths, `inset` and `grow` (px) how
 * far the tones stay inside the outer outline and away from the matrix (half their outlines), `px` its length on the
 * page (none below 50, only the shaded side below 90). Returns { lower, upper }: the shade and shadow, to draw over the
 * outer fill, and the lit band and highlight, for the layer `highlight`.
 */
export function mitoGloss(outer, matrix, { inset, grow, px }) {
  if (px < 50) return { lower: '', upper: '' }
  const G = gloss({ fills: [outer] }, { inset, exclude: { fills: [matrix], grow } }), T = mitoTones()
  const paint = (ks) => ks.map((k) => (G[k] ? `<path d="${G[k]}" fill="${T[k]}"/>` : '')).join('')
  return { lower: paint(['shade', 'shadow']), upper: px >= 90 ? paint(['lit', 'highlight']) : '' }
}

export function drawMito(m, at, gid, highlight, w = W) {
  const outer = place(m.outer, at)
  const matrix = place(m.matrix, at)
  const [x0, y0, x1, y1] = bbox(outer)
  // The highlight is given in the mitochondrion's own coordinates, so it bends with it.
  const [lx, ly, rx, ry, rot] = highlight
  const [hx, hy] = place([[lx, ly]], at)[0]
  const deg = rot + ((at.turn ?? 0) * 180) / Math.PI
  if (MITO_GLOSS) {
    const half = (w * strokeScale()) / 2
    const G = mitoGloss([outer], [matrix], { inset: half, grow: half, px: Math.max(x1 - x0, y1 - y0) })
    return {
      defs: gradient(gid, x0, y0, x1, y1, G.lower ? mitoTones().end : MITO.shadow),
      body:
        `<g id="outer membrane"><path d="${pathOf(outer)}" fill="url(#${gid})" stroke="${MITO.outline}" stroke-width="${w}" stroke-linejoin="round"/>${G.lower}</g>` +
        `<g id="matrix"><path d="${pathOf(matrix)}" fill="${MITO.matrix}" stroke="${MITO.inner}" stroke-width="${w}" stroke-linejoin="round"/></g>` +
        (G.upper ? `<g id="highlight">${G.upper}</g>` : ''),
    }
  }
  return {
    defs: gradient(gid, x0, y0, x1, y1),
    body:
      `<g id="outer membrane"><path d="${pathOf(outer)}" fill="url(#${gid})" stroke="${MITO.outline}" stroke-width="${w}" stroke-linejoin="round"/></g>` +
      `<g id="matrix"><path d="${pathOf(matrix)}" fill="${MITO.matrix}" stroke="${MITO.inner}" stroke-width="${w}" stroke-linejoin="round"/></g>` +
      (rx ? `<g id="highlight"><ellipse cx="${f(hx)}" cy="${f(hy)}" rx="${rx}" ry="${ry}" transform="rotate(${f(deg)} ${f(hx)} ${f(hy)})" fill="${MITO.light}"/></g>` : ''),
  }
}

/** Where the outline of a mitochondrion's right tip is at height y (local coordinates). */
export const tipAt = (m, L, y) => {
  let lo = 0, hi = L
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (m.half(mid) > Math.abs(y)) lo = mid
    else hi = mid
  }
  return lo
}

/**
 * A mitochondrion as in Mitochondrion.svg, ready to place: `length` long on the page, about half as high (`height`
 * to change it), cristae alternating top and bottom along it (`cristae` to set how many), bent like the owner's
 * (`bend`, a share of the height), turned by `turn` degrees. `w` is the outline (6 in the large drawings; it shrinks
 * with the mitochondrion but never below 3.5). Returns { defs, body } with ids that start with `id`.
 */
export function standardMito({ x, y, length, height = length * 0.42, turn = 0, bend = 0.1, cristae, w, id = 'mito', highlight = true }) {
  const L = length / 2, H = height / 2
  const lw = w ?? Math.max(3.5, Math.min(W, (W * L) / 224))
  const n = cristae ?? Math.max(1, Math.round((2 * L) / (H * 1.15)))
  const fingers = []
  const span = 2 * (L - H * 0.75)
  for (let i = 0; i < n; i++) fingers.push({ x: n === 1 ? 0 : -span / 2 + (span * i) / (n - 1), side: i % 2 ? 1 : -1, depth: 0.55 })
  const m = mitochondrion({ L, H, fingers, n: 2.6, minGap: lw + 3 })
  const at = { dx: x, dy: y, L, bend: -bend * H, turn: (turn * Math.PI) / 180 }
  const hl = highlight ? [-0.8 * L, -0.25 * H, 0.09 * L, 0.035 * L + 1, -62] : [0, 0, 0, 0, 0]
  const d = drawMito(m, at, `${id}-gradient`, hl, lw)
  const body = d.body.replace(/id="([^"]+)"/g, (_, k) => `id="${id}-${k.replace(/ /g, '-')}"`)
  return { defs: d.defs, body: `<g id="${id}">${body}</g>` }
}
