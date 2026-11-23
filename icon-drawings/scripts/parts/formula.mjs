// Parts: small molecules drawn as skeletal formulas, in the soft look of icon-drawings/STYLE.md. One function draws any
// small molecule from data (`skeletal`), so dopamine, thyroxine, cholic acid, the short-chain fatty acids and TMAO look
// alike. Taken from the copies in ../molecules/mg07 (Dopamine), mg17 (Spermidine), mg18 (Resveratrol), mg19 (Ketone
// bodies, 5-Hydroxymethylcytosine), mg23 (Thyroid hormone, Bile acids, Short-chain fatty acids) and mg24 (TMAO).
//
// The conventions those batches set, kept here:
// - bonds are strokes in the outline tone of the small molecules' green (165°, `deep`), round caps;
// - a benzene ring is the glucose part's hexagon (../parts/molecules.mjs) with three inner lines for its double bonds;
//   a ring of five is a pentagon in the same look (as mg18's ribose);
// - sterol rings are filled pale gold (90°, `rich`, as mg09's cholesterol), and then every bond of that molecule is gold;
// - atoms other than carbon are the ligand part (a ball) in the element's colour, lettered with its symbol in its outline
//   tone (in its light tone when the ball is small and flat): O red, N blue (CPK), I violet, P mustard (the phosphate
//   part's palette), S yellow (mg09's sulfur); hydrogens are left out, as a skeletal formula leaves them;
// - a charge is a stroked plus or minus beside its atom, in the atom's outline tone;
// - carbons are bare corners and chain ends; where a carbon should be seen (TMAO's methyl groups) it is a small grey ball
//   without a letter (`'C'`), as in a ball-and-stick model.
//
// Coordinates of atoms are in bond lengths with y upwards, as in a molfile (PubChem's 2D coordinates can be pasted as
// they are). The molecule is scaled so that its longer extent is `size` and centred on x, y. `formula()` builds the data
// with atoms found again by their place, so fused rings share their corners; `go`, `polygon` help with the geometry.
import { deep, hueOf, rich, toHex } from '../colour.mjs'
import { f, gradient2 } from '../shapes.mjs'
import { lettering, fits } from './letters.mjs'
import { glucose, ligand } from './molecules.mjs'

// ---------- palettes (OKLCH hues) ----------
export const BONDS = deep(165) // small molecules: bonds and rings
export const STEROL = rich(hueOf('#f3e3b8')) // sterol rings, 90°: mg06's steroid hormone, mg09's cholesterol
const grey = (l, c) => toHex({ l, c, h: 255 })
/** Carbon shown as a ball: a true grey (left out of the 36° rule). */
export const CARBON = { light: grey(0.985, 0.002), base: grey(0.92, 0.005), shadow: grey(0.84, 0.007), small: grey(0.74, 0.008), outline: grey(0.52, 0.009) }
/** The element palettes: oxygen red, nitrogen CPK blue, iodine violet, phosphorus mustard, sulfur yellow, carbon grey. */
export const ELEMENTS = {
  O: deep(hueOf('#e86b6b')), // 22°
  N: deep(hueOf('#4f6bb8')), // 267°
  I: deep(315), // CPK violet, 48° from nitrogen
  P: deep(92), // the phosphate part
  S: rich(96), // mg09's sulfur
  C: CARBON,
}
const NAMES = { O: 'oxygen', N: 'nitrogen', I: 'iodine', P: 'phosphorus', S: 'sulfur', C: 'carbon' }
/** The diameter of an atom's ball in bond lengths, per element (iodine is a large atom, a shown carbon a small one). */
const BALL = { I: 1.3, C: 0.72, P: 1.05, S: 1.05 }

// ---------- helpers ----------
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const rad = (d) => (d * Math.PI) / 180
const P2 = ([x, y]) => `${f(x)},${f(y)}`
const stroke = (pts, colour, w, cap = 'round') => `<path d="M${pts.map(P2).join(' L')}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
const unit = (a, b) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l] }
const BIG = 84 // a ring or ball wider than this on the page gets a highlight (the parts' 0.6 × 140)

/** The point a bond length `l` from p at `deg` degrees (counter-clockwise from the right, y up, as a molfile). */
export const go = (p, deg, l = 1) => [p[0] + l * Math.cos(rad(deg)), p[1] + l * Math.sin(rad(deg))]
/** The corners of a regular ring of n atoms with sides of one bond length about c, the first at `start` degrees (y up). */
export const polygon = (c, n, start = 90) => { const R = 1 / (2 * Math.sin(Math.PI / n)); return Array.from({ length: n }, (_, i) => go(c, start + (360 / n) * i, R)) }

/**
 * A builder for the data of `skeletal`: `at(p, el, opts)` adds an atom at p (or finds the one already there, so fused
 * rings share corners) and returns its index; `bond(a, b, order)`, `ring(indices, kind, doubles)`, `chain([p, …])`
 * (atoms along a zigzag, bonded in turn); `data` is { atoms, bonds, rings }.
 * const m = formula(); const r = polygon([0, 0], 6).map((p) => m.at(p)); m.ring(r, 'aromatic'); m.bond(r[0], m.at(go(…), 'O'))
 */
export function formula() {
  const atoms = [], bonds = [], rings = []
  const at = (p, el, opts) => {
    let i = atoms.findIndex((a) => Math.hypot(a[0] - p[0], a[1] - p[1]) < 1e-3)
    if (i < 0) { i = atoms.length; atoms.push([p[0], p[1]]) }
    if (el) atoms[i][2] = el
    if (opts) atoms[i][3] = opts
    return i
  }
  const bond = (a, b, order = 1) => { bonds.push([a, b, order]); return b }
  const ring = (idx, kind = 'aromatic', doubles) => { rings.push(doubles ? { atoms: idx, kind, doubles } : { atoms: idx, kind }); return idx }
  const chain = (pts) => { const idx = pts.map((p) => (typeof p === 'number' ? p : at(p))); idx.slice(1).forEach((b, k) => bond(idx[k], b)); return idx }
  return { at, bond, ring, chain, data: { atoms, bonds, rings } }
}

/**
 * Skeletal formula of a small molecule, drawn from data.
 * - `atoms`: [[x, y, el, opts], …] in bond lengths, y up. `el`: none for a bare carbon (a corner or a chain end), 'O',
 *   'N', 'I', 'P', 'S', or 'C' (a grey carbon ball, unlettered), with '+' or '-' after it for a charge ('N+', 'O-').
 *   `opts`: { scale (the ball's size, 1 by default), charge (the side of the charge mark in degrees, y up; found by
 *   itself otherwise) }.
 * - `bonds`: [[a, b, order, side], …]: order 1, 2, 3, 'wedge' (narrow at a, wide at b) or 'hash'. A double bond to an
 *   atom at the end of a chain is two lines about the bond; elsewhere the second line is inside, on the side of the
 *   neighbours (or `side`: 1 left of a → b, −1 right, 0 about the bond).
 * - `rings`: [{ atoms: [indices in order round the ring], kind, doubles }, …]; their sides are drawn by the ring, not
 *   listed as bonds. `kind`: 'aromatic' (the glucose part's hexagon, or a pentagon in its look, with inner lines on the
 *   sides `doubles`, [0, 2, 4] by default: side i runs from atom i to atom i + 1), 'ring' (the same without inner
 *   lines), 'sterol' (filled pale gold, as mg09), 'lines' (strokes only).
 * Options: `pal` (bonds and rings; gold when any ring is a sterol, green otherwise), `atomPal` ({ O: palette, … }),
 * `ball` (an atom's diameter in bond lengths, 0.9), `w` (bond width in page px; by default from the bond length on the
 * page, 3.5 to 12), `letters` ('auto': when 13 px letters fit, true, false), `name` (of the skeleton in `parts`).
 * `turn` turns the molecule about x, y; letters and charges stay upright.
 * `skeletal(g, { x: 0, y: 0, size: 60, ...DOPAMINE })`
 */
export function skeletal(g, { x, y, size, turn = 0, id = 'molecule', w, pal, atomPal = {}, ball = 0.9, letters = 'auto', name, atoms, bonds = [], rings = [] }) {
  const isSterol = rings.some((r) => r.kind === 'sterol')
  pal ??= isSterol ? STEROL : BONDS
  name ??= isSterol ? 'sterol' : 'bonds'
  const parse = (el = '') => { const m = /^([A-Z][a-z]?)?([+-])?$/.exec(el); if (!m) throw new Error(`formula.mjs: unknown atom "${el}"`); return { el: m[1] ?? '', charge: m[2] ?? '' } }
  const info = atoms.map(([u, v, e, o = {}]) => { const { el, charge } = parse(e); return { u, v, el, charge, d: el ? ball * (BALL[el] ?? 1) * (o.scale ?? 1) : 0, chargeAt: o.charge } })
  // Neighbours of every atom (bonds and ring sides), for the side of double bonds and of charges.
  const nb = info.map(() => new Set())
  const link = (a, b) => { nb[a].add(b); nb[b].add(a) }
  bonds.forEach(([a, b]) => link(a, b))
  rings.forEach((r) => r.atoms.forEach((a, i) => link(a, r.atoms[(i + 1) % r.atoms.length])))
  // The side of a charge mark (degrees, y up): the given one, or the free direction furthest from the atom's bonds,
  // the upper right winning a tie.
  info.forEach((a, i) => {
    if (!a.charge || a.chargeAt !== undefined) return
    const dirs = [...nb[i]].map((q) => Math.atan2(info[q].v - a.v, info[q].u - a.u))
    let best = 45, score = -Infinity
    for (let t = -180; t < 180; t += 15) {
      const gap = dirs.length ? Math.min(...dirs.map((d0) => Math.abs(((rad(t) - d0 + 3 * Math.PI) % (2 * Math.PI)) - Math.PI))) : Math.PI
      const sc = gap - 0.0035 * Math.abs(t - 45)
      if (sc > score) { score = sc; best = t }
    }
    a.chargeAt = best
  })
  // Extent in bond lengths (balls and charge marks included), then the scale and the place of every atom on g.
  const reach = info.flatMap((a) => [[a.u, a.v, a.d / 2 + 0.1], ...(a.charge ? [[...go([a.u, a.v], a.chargeAt, a.d * 0.8), a.d * 0.25]] : [])])
  const xs = reach.flatMap(([u, , r]) => [u - r, u + r]), ys = reach.flatMap(([, v, r]) => [v - r, v + r])
  const [u0, u1, v0, v1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const s = size / Math.max(u1 - u0, v1 - v0), cu = (u0 + u1) / 2, cv = (v0 + v1) / 2, ct = Math.cos(rad(turn)), st = Math.sin(rad(turn))
  /** Bond lengths (y up) → units of g (y down), turned clockwise by `turn` on the page. */
  const Q = ([u, v]) => { const dx = (u - cu) * s, dy = -(v - cv) * s; return [x + dx * ct - dy * st, y + dx * st + dy * ct] }
  const at = info.map((a) => Q([a.u, a.v])), page = at.map(g.P)
  const L = s * g.k // a bond length on the page, px
  const W = w ?? f(clamp(2.6 + 0.13 * L, 3.5, 12))
  const col = pal.outline
  const ringOf = (a, b) => rings.some((r) => r.atoms.some((p, i) => { const q = r.atoms[(i + 1) % r.atoms.length]; return (p === a && q === b) || (p === b && q === a) }))
  const defs = []

  // ---- bonds ----
  const bondSvg = bonds.map(([a, b, order = 1, side]) => {
    if (ringOf(a, b)) return ''
    const A = page[a], B = page[b], [ux, uy] = unit(A, B), n = [-uy, ux]
    if (order === 1) return stroke([A, B], col, W)
    if (order === 'wedge' || order === 'hash') {
      // Narrow at a, wide at b; the wide end stops under b's ball, or at b on a bare carbon.
      const rB = info[b].d ? (info[b].d * L) / 2 : 0, len = Math.hypot(B[0] - A[0], B[1] - A[1]) - rB * 0.55, E = [A[0] + ux * len, A[1] + uy * len], half = Math.max(W * 0.95, L * 0.1)
      if (order === 'wedge') return `<path d="M${P2([A[0] + n[0] * W * 0.25, A[1] + n[1] * W * 0.25])} L${P2([E[0] + n[0] * half, E[1] + n[1] * half])} L${P2([E[0] - n[0] * half, E[1] - n[1] * half])} L${P2([A[0] - n[0] * W * 0.25, A[1] - n[1] * W * 0.25])}Z" fill="${col}" stroke="${col}" stroke-width="${f(W * 0.5)}" stroke-linejoin="round"/>`
      // Dashes from the edge of a's ball (or from a) to the wide end, widening.
      const t0 = info[a].d ? Math.min(0.5, (info[a].d * L) / 2 / len + 0.04) : 0.12, k = Math.max(3, Math.round((len * (1 - t0)) / (W * 1.7)))
      return Array.from({ length: k }, (_, i) => { const t = t0 + ((1 - t0) * (i + 0.5)) / k, c = [A[0] + ux * len * t, A[1] + uy * len * t], h = W * 0.3 + (half - W * 0.3) * t; return stroke([[c[0] + n[0] * h, c[1] + n[1] * h], [c[0] - n[0] * h, c[1] - n[1] * h]], col, Math.max(3, W * 0.42)) }).join('')
    }
    const dw = W * (order === 3 ? 0.7 : 0.75)
    // Which side: about the bond when an end is a lone atom, else towards the neighbours.
    let sd = side
    if (sd === undefined) {
      if (nb[a].size === 1 || nb[b].size === 1) sd = 0
      else {
        const others = [...nb[a], ...nb[b]].filter((q) => q !== a && q !== b)
        const m = others.reduce((acc, q) => [acc[0] + page[q][0] - (A[0] + B[0]) / 2, acc[1] + page[q][1] - (A[1] + B[1]) / 2], [0, 0])
        sd = m[0] * n[0] + m[1] * n[1] >= 0 ? 1 : -1
      }
    } else sd = -sd // `n` points to the right of a → b on the page
    const off = (P, d) => [P[0] + n[0] * d, P[1] + n[1] * d]
    if (order === 3) { const gap = Math.max(L * 0.28, dw * 2); return [stroke([A, B], col, dw), stroke([off(A, gap), off(B, gap)], col, dw), stroke([off(A, -gap), off(B, -gap)], col, dw)].join('') }
    if (sd === 0) { const gap = Math.max(L * 0.36, dw * 2.1) / 2; return stroke([off(A, gap), off(B, gap)], col, dw) + stroke([off(A, -gap), off(B, -gap)], col, dw) }
    const gap = Math.max(L * 0.28, dw * 1.9) * sd, cut = 0.18
    return stroke([A, B], col, W) + stroke([off(lerp(A, B, cut), gap), off(lerp(B, A, cut), gap)], col, dw)
  }).join('')

  // ---- rings ----
  const ringW = f(clamp(W * 0.62, 3.5, 8))
  const sterolFill = [], sterolLine = [], ringSvg = [], inner = []
  rings.forEach((r, k) => {
    const pts = r.atoms.map((i) => at[i]), n = pts.length, c = [pts.reduce((t, p) => t + p[0], 0) / n, pts.reduce((t, p) => t + p[1], 0) / n]
    const P = pts.map(g.P), C = g.P(c), rid = `${id}-ring-${k + 1}`
    if (r.kind === 'sterol') {
      const d = `M${P.map(P2).join(' L')}Z`
      sterolFill.push(`<path d="${d}" fill="url(#${id}-sterol-gradient)"/>`)
      sterolLine.push(`<path d="${d}" fill="none" stroke="${col}" stroke-width="${f(W)}" stroke-linejoin="round"/>`)
      return
    }
    if (r.kind === 'lines') { ringSvg.push(stroke([...P, P[0]], col, W)); return }
    const R = Math.hypot(P[0][0] - C[0], P[0][1] - C[1]) // corner radius on the page
    if (n === 6) {
      // The glucose part: corners at −90° + 60° i on the page; turned so that its corners lie on the ring's atoms.
      const a0 = (Math.atan2(P[0][1] - C[1], P[0][0] - C[0]) * 180) / Math.PI
      const p = glucose(g, { x: c[0], y: c[1], size: ((2 * R) / g.k) * 1.14, turn: f(((a0 + 90) % 60 + 60) % 60), id: rid, w: ringW, pal })
      defs.push(p.defs); ringSvg.push(p.body)
    } else {
      // Any other ring in the glucose part's look: rounded corners, a gradient, the outline inside the atoms by half.
      const flat = 2 * R < 30, Rin = R * 1.07 - (flat ? 0 : ringW / 2) - 0.01 * R
      const Pin = P.map(([px, py]) => [C[0] + ((px - C[0]) * Rin) / R, C[1] + ((py - C[1]) * Rin) / R])
      const toward = (a, b, dd) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]), t = Math.min(dd, l / 2) / l; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] }
      const d = Pin.map((q, i) => { const A = toward(q, Pin[(i - 1 + n) % n], Rin * 0.22), B = toward(q, Pin[(i + 1) % n], Rin * 0.22); return `${i ? 'L' : 'M'}${P2(A)} Q${P2(q)} ${P2(B)} ` }).join('') + 'Z'
      if (flat) ringSvg.push(`<g id="${rid}"><path d="${d}" fill="${pal.small}"/></g>`)
      else {
        defs.push(gradient2(`${rid}-gradient`, [C[0] - R, C[1] - R, C[0] + R, C[1] + R], pal.base, pal.shadow))
        ringSvg.push(`<g id="${rid}"><path d="${d}" fill="url(#${rid}-gradient)" stroke="${pal.outline}" stroke-width="${ringW}" stroke-linejoin="round"/></g>`)
      }
    }
    if (r.kind === 'aromatic') {
      const sides = r.doubles ?? (n === 6 ? [0, 2, 4] : [0, 2])
      sides.forEach((i) => {
        const a = P[i], b = P[(i + 1) % n], kk = 0.66, cut = 0.2
        const p = lerp(C, a, kk), q = lerp(C, b, kk)
        inner.push(stroke([lerp(p, q, cut), lerp(q, p, cut)], pal.outline, W * 0.72))
      })
    }
  })
  if (sterolFill.length) {
    const all = rings.filter((r) => r.kind === 'sterol').flatMap((r) => r.atoms.map((i) => page[i])), bx = all.map((p) => p[0]), by = all.map((p) => p[1])
    defs.push(gradient2(`${id}-sterol-gradient`, [Math.min(...bx), Math.min(...by), Math.max(...bx), Math.max(...by)], pal.base, pal.shadow))
    // A highlight on the first sterol ring when it is large on the page.
    const first = rings.find((r) => r.kind === 'sterol').atoms.map((i) => page[i]), fc = [first.reduce((t, p) => t + p[0], 0) / first.length, first.reduce((t, p) => t + p[1], 0) / first.length]
    if (L * 2 >= BIG) sterolFill.push(`<ellipse cx="${f(fc[0] - L * 0.25)}" cy="${f(fc[1] - L * 0.32)}" rx="${f(L * 0.42)}" ry="${f(L * 0.15)}" transform="rotate(-40 ${f(fc[0] - L * 0.25)} ${f(fc[1] - L * 0.32)})" fill="${pal.light}"/>`)
  }

  // ---- atoms and charges ----
  const used = new Map()
  const atomSvg = [], chargeSvg = []
  info.forEach((a, i) => {
    if (!a.el) return
    const apal = atomPal[a.el] ?? ELEMENTS[a.el]
    if (!apal) throw new Error(`formula.mjs: no palette for "${a.el}"`)
    used.set(a.el, apal)
    const n = [...info.slice(0, i)].filter((b) => b.el === a.el).length + 1, aid = `${id}-${NAMES[a.el] ?? a.el}-${n}`
    const D = a.d * s, Dpx = D * g.k, flat = Dpx < 30
    const b = ligand(g, { x: at[i][0], y: at[i][1], size: D, id: aid, pal: apal, flat })
    defs.push(b.defs)
    const h = D * (a.el === 'I' ? 0.5 : 0.48)
    const lettered = a.el !== 'C' && (letters === 'auto' ? fits(g, h) : letters)
    atomSvg.push(b.body + (lettered ? lettering(g, { x: at[i][0], y: at[i][1], h, text: a.el, colour: flat ? apal.light : apal.outline, id: `${aid}-letter` }).body : ''))
    if (!a.charge) return
    const deg = turn - a.chargeAt // y up in the data → y down on the page, turned with the molecule
    const m = clamp(Dpx * 0.48, 9, 60), mw = f(clamp(m * 0.2 + 1.4, 3, 7)), r0 = Dpx / 2 + m * 0.55 + mw * 0.3 // a small part: no less than 3 px
    const c = [page[i][0] + r0 * Math.cos(rad(deg)), page[i][1] + r0 * Math.sin(rad(deg))], hh = m / 2 - mw / 2
    chargeSvg.push(`<g id="${aid}-charge">${stroke([[c[0] - hh, c[1]], [c[0] + hh, c[1]]], apal.outline, mw)}${a.charge === '+' ? stroke([[c[0], c[1] - hh], [c[0], c[1] + hh]], apal.outline, mw) : ''}</g>`)
  })

  const body = `<g id="${id}"><g id="${id}-${isSterol ? 'side-chains' : 'bonds'}">${bondSvg}</g>` +
    (sterolFill.length ? `<g id="${id}-sterol-rings">${sterolFill.join('')}${sterolLine.join('')}</g>` : '') +
    (ringSvg.length ? `<g id="${id}-rings">${ringSvg.join('')}</g>` : '') + (inner.length ? `<g id="${id}-double-bonds">${inner.join('')}</g>` : '') +
    (atomSvg.length ? `<g id="${id}-atoms">${atomSvg.join('')}${chargeSvg.join('')}</g>` : '') + '</g>'
  // A grey (shown carbon) is left out of `parts`, as the batches leave greys out of the 36° check.
  const parts = [[name, pal], ...[...used].filter(([el]) => el !== 'C').map(([el, p]) => [NAMES[el] ?? el, p])]
  return { defs: defs.join(''), body, parts }
}

// =====================================================================================================================
// Molecules as data (y up, bond lengths), for the icons that show them and for the sheet
// =====================================================================================================================

/** Dopamine: a catechol ring with the hydroxyls at the left, an ethylamine chain from the upper right (as mg07). */
export const DOPAMINE = (() => {
  const m = formula(), r = polygon([0, 0], 6, 90).map((p) => m.at(p)) // corners at 90, 150, 210, 270, 330, 30°
  m.ring(r, 'aromatic', [0, 2, 4])
  m.bond(r[1], m.at(go(m.data.atoms[r[1]], 150), 'O')); m.bond(r[2], m.at(go(m.data.atoms[r[2]], 210), 'O'))
  const cb = go(m.data.atoms[r[5]], 30), ca = go(cb, -30), n = go(ca, 30)
  m.chain([r[5], cb, ca]); m.bond(m.at(ca), m.at(n, 'N'))
  return m.data
})()

/** Thyroxine (T4): two benzene rings joined by an ether oxygen, four iodines, the alanine side chain (as mg23). */
export const THYROXINE = (() => {
  const m = formula(), A = polygon([0, 0], 6, 0).map((p) => m.at(p)), B = polygon([3.732, 0], 6, 0).map((p) => m.at(p))
  const p = (i) => m.data.atoms[i]
  m.ring(A, 'aromatic', [0, 2, 4]); m.ring(B, 'aromatic', [0, 2, 4])
  m.bond(A[3], m.at(go(p(A[3]), 180), 'O')) // the hydroxyl of the outer ring
  const ether = m.at(go(p(A[0]), 30), 'O'); m.bond(A[0], ether); m.bond(ether, B[3])
  for (const R of [A, B]) for (const i of [2, 4]) m.bond(R[i], m.at(go(p(R[i]), i === 2 ? 120 : 240), 'I'))
  const cb = go(p(B[0]), 0), ca = go(cb, 60), cc = go(ca, 0)
  m.chain([B[0], cb, ca, cc]); m.bond(m.at(ca), m.at(go(ca, 120), 'N'))
  m.bond(m.at(cc), m.at(go(cc, 60), 'O'), 2); m.bond(m.at(cc), m.at(go(cc, -60), 'O'))
  return m.data
})()

/** Cholic acid: the four sterol rings, methyls at C10 and C13, hydroxyls at C3, C7, C12, the carboxyl at C24 (as mg23). */
export const CHOLIC_ACID = (() => {
  // mg23's construction (y down, bond 1), turned to y up at the end.
  const s3 = Math.sqrt(3), dir = (p, deg, l = 1) => [p[0] + l * Math.cos(rad(deg)), p[1] + l * Math.sin(rad(deg))]
  const hex = ([cx, cy]) => Array.from({ length: 6 }, (_, i) => { const t = Math.PI / 6 + (i * Math.PI) / 3; return [cx + Math.cos(t), cy + Math.sin(t)] })
  const A = [0, 0], B = [s3, 0], C = [s3 * 1.5, -1.5], apo = 1 / (2 * Math.tan(Math.PI / 5)), R5 = 1 / (2 * Math.sin(Math.PI / 5)), D = [C[0] + s3 / 2 + apo, C[1]]
  const pent = [144, 216, 288, 0, 72].map((a) => dir(D, a, R5))
  const c10 = [s3 / 2, -0.5], c13 = [C[0] + s3 / 2, C[1] - 0.5]
  const c17 = pent[2], c20 = dir(c17, -75), c21 = dir(c20, -135), c22 = dir(c20, -15), c23 = dir(c22, -75), c24 = dir(c23, -15)
  const up = (p) => [p[0], -p[1]]
  const m = formula(), at = (p, el) => m.at(up(p), el)
  for (const ring of [hex(A), hex(B), hex(C), pent]) m.ring(ring.map((p) => at(p)), 'sterol')
  m.chain([c17, c20, c22, c23, c24].map((p) => at(p))); m.bond(at(c20), at(c21))
  m.bond(at(c24), at(dir(c24, -75, 0.95), 'O'), 2); m.bond(at(c24), at(dir(c24, 45, 0.95), 'O'))
  for (const [c, a] of [[hex(A)[2], 150], [hex(B)[0], 30], [hex(C)[4], -120]]) m.bond(at(c), at(dir(c, a, 0.95), 'O'))
  for (const c of [c10, c13]) m.bond(at(c), at([c[0], c[1] - 0.85])) // the methyl groups, bare ends
  return m.data
})()

/** A short-chain fatty acid as its carboxylate: n carbons in a zigzag to the left of the carboxyl group (as mg23). */
export const carboxylate = (n) => {
  const m = formula(), c1 = [0, 0]
  const chain = Array.from({ length: n }, (_, k) => [-k * Math.cos(rad(30)), k % 2 ? -0.5 : 0])
  m.chain(chain)
  m.bond(m.at(c1), m.at(go(c1, 90), 'O'), 2); m.bond(m.at(c1), m.at(go(c1, -30), 'O-'))
  return m.data
}
export const ACETATE = carboxylate(2), PROPIONATE = carboxylate(3), BUTYRATE = carboxylate(4)

/**
 * TMAO (trimethylamine N-oxide), drawn as a tetrahedron: N⁺ in the middle, O⁻ straight up, one methyl in the plane at the
 * lower left, one towards the viewer (a wedge, its ball a little larger) and one away (hashed, a little smaller). The
 * methyls are grey carbon balls, so the three ends read as groups and the drawing as a molecule, not as a plus sign.
 */
export const TMAO = (() => {
  const m = formula(), N = m.at([0, 0], 'N+', { charge: 40 })
  m.bond(N, m.at(go([0, 0], 90), 'O-', { charge: 20 }))
  m.bond(N, m.at(go([0, 0], 210), 'C'))
  m.bond(N, m.at(go([0, 0], -10, 1.02), 'C', { scale: 1.12 }), 'wedge')
  m.bond(N, m.at(go([0, 0], -62, 0.95), 'C', { scale: 0.86 }), 'hash')
  // Longer bonds than a skeletal formula's (balls of 0.72 bond lengths, as mg24 and SiliCoDraw), so the bonds show.
  return { ...m.data, ball: 0.72 }
})()

/** β-Hydroxybutyrate, CH₃–CH(OH)–CH₂–COO⁻, the hydroxyl on a wedge (as mg19's Ketone bodies). */
export const HYDROXYBUTYRATE = (() => {
  const m = formula(), c4 = [0, 0], c3 = go(c4, 30), c2 = go(c3, -30), c1 = go(c2, 30)
  m.chain([c4, c3, c2, c1])
  m.bond(m.at(c3), m.at(go(c3, 90), 'O'), 'wedge')
  m.bond(m.at(c1), m.at(go(c1, 90), 'O'), 2); m.bond(m.at(c1), m.at(go(c1, -30), 'O-'))
  return m.data
})()

/** Resveratrol: two phenol rings joined by a trans double bond, hydroxyls at 3, 5 and 4′ (as mg18). */
export const RESVERATROL = (() => {
  const m = formula(), A = polygon([0, 0], 6, 30).map((p) => m.at(p)), p = (i) => m.data.atoms[i]
  const a1 = go(p(A[0]), 30), a2 = go(a1, -30), cB = go(go(a2, 30), 30)
  const B = polygon(cB, 6, 210).map((q) => m.at(q))
  m.ring(A, 'aromatic', [1, 3, 5]); m.ring(B, 'aromatic', [1, 3, 5])
  m.bond(A[0], m.at(a1)); m.bond(m.at(a1), m.at(a2), 2); m.bond(m.at(a2), B[0])
  m.bond(A[2], m.at(go(p(A[2]), 150), 'O')); m.bond(A[4], m.at(go(p(A[4]), 270), 'O')); m.bond(B[3], m.at(go(p(B[3]), 30), 'O'))
  return m.data
})()

/** Spermidine, H₃N⁺–(CH₂)₃–NH₂⁺–(CH₂)₄–NH₃⁺: a zigzag with three charged nitrogens (as mg17). */
export const SPERMIDINE = (() => {
  const m = formula(), pts = Array.from({ length: 10 }, (_, i) => [i * Math.cos(rad(30)), i % 2 ? 0.5 : 0])
  m.chain(pts)
  for (const i of [0, 4, 9]) m.at(pts[i], 'N+')
  return m.data
})()

// =====================================================================================================================
// DEMOS
// =====================================================================================================================

const demo = (name, data, size = 100, more = {}) => ({ name, size: 100, draw: (g) => skeletal(g, { x: 0, y: 0, size, id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), ...data, ...more }) })
export const DEMOS = [
  demo('Dopamine', DOPAMINE),
  demo('Thyroxine', THYROXINE),
  demo('Cholic acid', CHOLIC_ACID),
  demo('Acetate', ACETATE, 62),
  demo('Propionate', PROPIONATE, 78),
  demo('Butyrate', BUTYRATE, 94),
  demo('TMAO', TMAO, 80),
  demo('Beta-hydroxybutyrate', HYDROXYBUTYRATE),
  demo('Resveratrol', RESVERATROL),
  demo('Spermidine', SPERMIDINE),
  demo('Dopamine, turned', DOPAMINE, 100, { turn: 30 }),
]
