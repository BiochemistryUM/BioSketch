// Writes "Mitochondrial fission.svg" and "Mitochondrial fusion.svg" in the style of the owner's
// Mitochondrion.svg (icon-drawings/STYLE.md): outer membrane with a two-stop gradient and a dark
// outline, matrix with cristae folded in from the inner membrane, one highlight per mitochondrion.
// Every outline is sampled as points so that the whole drawing can be bent like Affinity's warp.
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { bbox, catmull, f, pathOf, range, segDist, simplify, smax, smin, svg, trace } from './shapes.mjs'
import { GAP_SHARE, JUNCTION_SHARE, MITO, W, drawMito, gradient, mitochondrion, place, tipAt } from './mitokit.mjs'

const OUT = process.argv[2]
const DRP1 = { outline: '#1F6B66', base: '#3FA99F', light: '#A8DDD6' }
const MFF = { outline: '#7A5A0E', base: '#E2B23A', light: '#F6E1A6' }
const OPA1 = { outline: '#2F6E2A', base: '#6DBA55', light: '#C4E8B4' }
const MFN = { outline: '#3F4296', base: '#7C80D6', light: '#C9CBF2' }

// ---------- fission: one long mitochondrion pinched in the middle by a ring of Drp1 ----------
{
  const L = 224, H = 88
  const fingers = [
    { x: -160, side: -1, depth: 0.55 }, { x: -118, side: 1, depth: 0.55 }, { x: -76, side: -1, depth: 0.5 },
    { x: 76, side: -1, depth: 0.5 }, { x: 118, side: 1, depth: 0.55 }, { x: 160, side: -1, depth: 0.55 },
  ]
  const m = mitochondrion({ L, H, pinch: 0.6, sigma: 40, fingers })
  const at = { dx: 256, dy: 262, L, bend: -16 }
  const mito = drawMito(m, at, 'fission-gradient', [-188, -16, 20, 7, -62])
  // Drp1: three turns of a helix round the waist, drawn as slanted rounded bands over it.
  const waistH = m.half(0)
  const bands = [-15, 0, 15].map((x) => {
    const [cx, cy] = place([[x, 0]], at)[0]
    const h = waistH + 16
    return `<rect x="${f(cx - 6)}" y="${f(cy - h)}" width="12" height="${f(2 * h)}" rx="6" transform="rotate(14 ${f(cx)} ${f(cy)})" fill="${DRP1.base}" stroke="${DRP1.outline}" stroke-width="4"/>`
  })
  // Mff: receptors in the outer membrane on both sides of the ring, which bring Drp1 to the site.
  const mff = []
  for (const x of [-36, 36])
    for (const side of [-1, 1]) {
      const y = side * m.half(x)
      const dx = 1, dy = side * (m.half(x + 0.5) - m.half(x - 0.5)) // tangent of the outline
      let nx = dy, ny = -dx // a normal; turn it to point away from the middle
      if (nx * 0 + ny * side < 0) { nx = -nx; ny = -ny }
      const len = Math.hypot(nx, ny); nx /= len; ny /= len
      const [ax, ay] = place([[x, y]], at)[0]
      const [bx, by] = place([[x + nx * 14, y + ny * 14]], at)[0]
      mff.push(
        `<path d="M${f(ax)},${f(ay)} L${f(bx)},${f(by)}" stroke="${MFF.outline}" stroke-width="11" stroke-linecap="round"/>` +
          `<path d="M${f(ax)},${f(ay)} L${f(bx)},${f(by)}" stroke="${MFF.base}" stroke-width="4" stroke-linecap="round"/>` +
          `<circle cx="${f(bx)}" cy="${f(by)}" r="7" fill="${MFF.base}" stroke="${MFF.outline}" stroke-width="4"/>`,
      )
    }
  writeFileSync(join(OUT, 'Mitochondrial fission.svg'), svg('Mitochondrial fission', mito.defs, `${mito.body}<g id="Mff">${mff.join('')}</g><g id="Drp1">${bands.join('')}</g>`))
}

// ---------- fusion: two mitochondria end to end, tethered by mitofusins ----------
{
  const L = 108, H = 64
  const fingers = [{ x: -42, side: -1, depth: 0.58 }, { x: 2, side: 1, depth: 0.58 }, { x: 46, side: -1, depth: 0.58 }]
  const m = mitochondrion({ L, H, fingers, n: 2.4 })
  const gap = 36
  const cx = L + gap / 2
  const left = drawMito(m, { dx: 256 - cx, dy: 256, L, bend: -8 }, 'fusion-gradient-left', [-72, -8, 14, 5, -62])
  const right = drawMito(m, { dx: 256 + cx, dy: 256, L, bend: -8 }, 'fusion-gradient-right', [-72, -8, 14, 5, -62])
  // Mitofusins: pairs that reach across the gap from each outer membrane and hold on in the middle.
  const tethers = [-20, 0, 20].map((dy) => {
    const y = 256 + dy + -8 * (1 - 1) // the tips sit where the bend is zero
    const xl = 256 - cx + tipAt(m, L, dy) - 3
    const xr = 512 - xl
    const line = (a, b, w, c) => `<path d="M${f(a)},${f(y)} L${f(b)},${f(y)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`
    return line(xl, 251, 13, MFN.outline) + line(xl, 251, 6, MFN.base) + line(261, xr, 13, MFN.outline) + line(261, xr, 6, MFN.base)
  })
  // OPA1: in the inner membrane where the two mitochondria face each other, reaching into the space between the membranes.
  const innerTip = (y) => {
    let lo = 0, hi = L
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (m.inner(mid) > Math.abs(y)) lo = mid; else hi = mid }
    return lo
  }
  const opa1 = []
  for (const y of [-10, 10]) { // between the mitofusin tethers, which stand at -20, 0 and 20
    const x = innerTip(y)
    for (const [dx0, dir] of [[256 - cx, 1], [256 + cx, -1]]) {
      // left mitochondrion: its right tip faces the gap; right one: its left tip (local -x)
      const lx = dir === 1 ? x : -x
      const [px, py] = place([[lx, y]], { dx: dx0, dy: 256, L, bend: -8 })[0]
      // Half sunk in the inner membrane line, half in the space between the membranes.
      const x0 = dir === 1 ? px - 1.5 : px - 7.5
      opa1.push(`<rect x="${f(x0)}" y="${f(py - 3.5)}" width="9" height="7" rx="3.5" fill="${OPA1.base}" stroke="${OPA1.outline}" stroke-width="2.5"/>`)
    }
  }
  writeFileSync(join(OUT, 'Mitochondrial fusion.svg'), svg('Mitochondrial fusion', left.defs + right.defs, `${left.body}${right.body}<g id="OPA1">${opa1.join('')}</g><g id="mitofusins">${tethers.join('')}</g>`))
}
// ---------- fragmentation: the network broken into small, rounded pieces, as after damage ----------
{
  // Each piece: centre, half length, half height, turn (degrees), roundness, cristae, highlight (local x, y, rx, ry, turn).
  // A broken tubule: pieces in a loose line with a branch, of uneven size, the smallest swollen round and without cristae.
  const pieces = [
    { x: 100, y: 104, L: 64, H: 42, turn: 36, n: 2.3, fingers: [{ x: 4, side: 1, depth: 0.42 }] },
    { x: 232, y: 196, L: 76, H: 46, turn: 24, n: 2.4, fingers: [{ x: -24, side: -1, depth: 0.45 }, { x: 22, side: 1, depth: 0.42 }] },
    { x: 372, y: 240, L: 58, H: 42, turn: 12, n: 2.2, fingers: [{ x: -4, side: -1, depth: 0.4 }] },
    { x: 456, y: 330, L: 34, H: 32, turn: 50, n: 2, fingers: [] },
    { x: 196, y: 344, L: 60, H: 44, turn: -48, n: 2.2, fingers: [{ x: 2, side: 1, depth: 0.38 }] },
    { x: 334, y: 404, L: 50, H: 46, turn: -14, n: 2, fingers: [{ x: -8, side: 1, depth: 0.3 }] },
    { x: 130, y: 458, L: 40, H: 34, turn: -26, n: 2, fingers: [] },
  ]
  const w = 4
  const shape = (p) => mitochondrion({ L: p.L, H: p.H, n: p.n, fingers: p.fingers, minGap: w + 4 })
  const where = (p, dx = 0, dy = 0) => ({ dx: p.x + dx, dy: p.y + dy, L: p.L, bend: -p.H * 0.12, turn: (p.turn * Math.PI) / 180 })
  // Centre the drawing on the page: measure the outer membranes as placed, then move every piece by the same amount.
  const [x0, y0, x1, y1] = bbox(pieces.flatMap((p) => place(shape(p).outer, where(p))))
  const sx = 256 - (x0 + x1) / 2, sy = 256 - (y0 + y1) / 2
  let defs = '', body = ''
  pieces.forEach((p, i) => {
    // The highlight sits on the matrix near the left end, high up; the smallest pieces have none.
    // Light comes from the top left of the page whatever the turn: the highlight goes where the matrix faces it, along the outline.
    const t = (p.turn * Math.PI) / 180
    const ux = -Math.cos(t) - Math.sin(t), uy = Math.sin(t) - Math.cos(t) // the page's top left, in the piece's own coordinates
    const a = 0.7 * (p.L - p.H * GAP_SHARE), b = 0.7 * (p.H - p.H * GAP_SHARE)
    const k = Math.hypot(a * ux, b * uy)
    const hl = p.L >= 48 ? [(a * a * ux) / k, (b * b * uy) / k, 0.15 * p.L, 0.1 * p.H, -45 - p.turn] : [0, 0, 0, 0, 0]
    const d = drawMito(shape(p), where(p, sx, sy), `fragment-gradient-${i + 1}`, hl, w)
    defs += d.defs
    body += `<g id="fragment ${i + 1}">${d.body}</g>`
  })
  const all = [...body.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map((m) => [+m[1], +m[2]])
  console.log('fragmentation drawing spans', bbox(all).map(f))
  writeFileSync(join(OUT, 'Mitochondrial fragmentation.svg'), svg('Mitochondrial fragmentation', defs, body))
}
// ---------- damage: one swollen mitochondrion, its outer membrane torn and the matrix bulging out ----------
{
  // Around a centre, as a radius for every angle (0 = right, angles grow clockwise on the page).
  const A = 206, B = 160 // half width and half height of the swollen body
  const H = B, GAP = GAP_SHARE * H
  const wobble = (t) => 1 + 0.035 * Math.sin(3 * t + 0.8) + 0.025 * Math.sin(5 * t + 2.1) + 0.015 * Math.sin(7 * t + 0.3)
  const R = (t) => wobble(t) / Math.hypot(Math.cos(t) / A, Math.sin(t) / B)
  const Rin = (t) => R(t) - GAP
  const tear = -0.62 // the tear, up and to the right
  const halfTear = 0.15
  const gapOf = (t) => Math.abs(Math.atan2(Math.sin(t - tear), Math.cos(t - tear)))
  // The matrix pushes out through the tear as a round bulb: the union of the body and a circle, the crease rounded.
  const bulbR = 44, bulbD = R(tear) + 10
  const bc = [bulbD * Math.cos(tear), bulbD * Math.sin(tear)]
  const build = (C) => {
    const at = (t, r) => [C[0] + r * Math.cos(t), C[1] + r * Math.sin(t)]
    const angles = (a, b) => range(a, b, 0.004)
    // The matrix as a distance field: the swollen body joined smoothly to the bulb, less the stubs of cristae
    // still attached to the inner membrane (the rest have broken off into vesicles).
    const fw = 20
    const stubs = [{ t: 1.35, depth: 34 }, { t: 2.6, depth: 26 }, { t: 0.55, depth: 24 }, { t: -1.75, depth: 30 }]
      .map(({ t, depth }) => [at(t, Rin(t) + 8), at(t, Rin(t) - depth + fw / 2)])
    const bulbC = [C[0] + bc[0], C[1] + bc[1]]
    const matrixAt = (x, y) => {
      const t = Math.atan2(y - C[1], x - C[0])
      let d = smin(Math.hypot(x - C[0], y - C[1]) - Rin(t), Math.hypot(x - bulbC[0], y - bulbC[1]) - bulbR, 22)
      for (const [a, b] of stubs) d = smax(d, -(segDist(x, y, a, b) - fw / 2), 10)
      return d
    }
    const matrix = simplify(trace(matrixAt)[0])
    // The outer membrane: filled all round (the fill pulls in under the bulb), outlined only where it is whole.
    const fillR = (t) => { const g = gapOf(t); const s = Math.min(1, Math.max(0, (halfTear + 0.04 - g) / 0.08)); return R(t) - s * (GAP + 4) }
    const outerFill = simplify(angles(-Math.PI, Math.PI).map((t) => at(t, fillR(t))))
    // The torn ends curl outwards a little.
    const t0 = tear + halfTear, t1 = tear - halfTear + 2 * Math.PI
    const line = []
    for (const t of range(t0 - 0.05, t0, 0.01).slice(0, -1)) line.push(at(t0 - (t - (t0 - 0.05)), R(t0) + 10 * ((t - (t0 - 0.05) - 0.05) / 0.05) ** 2))
    line.push(...angles(t0, t1).map((t) => at(t, R(t))))
    for (const t of range(t1, t1 + 0.05, 0.01).slice(1)) line.push(at(t, R(t1) + 10 * ((t - t1) / 0.05) ** 2))
    const open = (pts) => `M${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' L')}`
    // Vesicles: broken-off cristae floating in the matrix, one carried out into the bulb.
    const vesicles = [[-84, -30, 15, 10, 30], [-24, 40, 17, 11, -20], [50, -18, 12, 12, 0], [-110, 62, 11, 9, 60], [76, 72, 14, 9, 40], [bc[0] + 4, bc[1] - 4, 10, 10, 0]]
      .map(([x, y, rx, ry, r]) => `<ellipse cx="${f(C[0] + x)}" cy="${f(C[1] + y)}" rx="${rx}" ry="${ry}" transform="rotate(${r} ${f(C[0] + x)} ${f(C[1] + y)})" fill="${MITO.base}" stroke="${MITO.inner}" stroke-width="4"/>`)
    const [x0, y0, x1, y1] = bbox(outerFill)
    const ht = -2.4, [hx, hy] = at(ht, Rin(ht) * 0.8)
    const body =
      `<g id="outer membrane"><path d="${pathOf(outerFill)}" fill="url(#damage-gradient)"/><path d="${open(simplify(line))}" fill="none" stroke="${MITO.outline}" stroke-width="${W}" stroke-linecap="round" stroke-linejoin="round"/></g>` +
      `<g id="matrix"><path d="${pathOf(matrix)}" fill="${MITO.matrix}" stroke="${MITO.inner}" stroke-width="${W}" stroke-linejoin="round"/></g>` +
      `<g id="cristae">${vesicles.join('')}</g>` +
      `<g id="highlight"><ellipse cx="${f(hx)}" cy="${f(hy)}" rx="34" ry="12" transform="rotate(-42 ${f(hx)} ${f(hy)})" fill="${MITO.light}"/></g>`
    const span = bbox([...outerFill, ...matrix, ...line])
    return { body, defs: gradient('damage-gradient', x0, y0, x1, y1), span }
  }
  // Built once in the middle of the page (the matrix is traced on the page), then moved so the drawing is centred.
  const first = build([256, 256]).span
  const d = build([Math.round(512 - (first[0] + first[2]) / 2), Math.round(512 - (first[1] + first[3]) / 2)])
  console.log('damage drawing spans', d.span.map(f))
  writeFileSync(join(OUT, 'Damaged mitochondrion.svg'), svg('Damaged mitochondrion', d.defs, d.body))
}

// ---------- network: one long mitochondrion that branches into its neighbours ----------
{
  // The shape is worked out as a distance field around a branched centre line and traced with marching squares,
  // so the branches join the main tube in smooth, rounded forks.
  const Hn = 38 // half height of the tube
  const w = 5
  const sc = 0.86, fit = (pts) => pts.map(([x, y]) => [256 + (x - 256) * sc, 262 + (y - 262) * sc])
  const gap = Math.max(GAP_SHARE * Hn, w + 4)
  const branches = [
    { pts: catmull(fit([[40, 318], [140, 262], [262, 258], [356, 292], [470, 238]])), r: Hn },
    { pts: catmull(fit([[214, 262], [236, 180], [296, 116], [384, 84]])), r: Hn * 0.88 },
    { pts: catmull(fit([[318, 280], [302, 360], [246, 418], [150, 442]])), r: Hn * 0.88 },
  ]
  const lineDist = (px, py, pts) => { let m = Infinity; for (let i = 0; i < pts.length - 1; i++) m = Math.min(m, segDist(px, py, pts[i], pts[i + 1])); return m }
  // Cristae: fingers from the inner membrane across the tube, alternating sides, kept away from forks and tips.
  const fw = w + 8 // wide enough that the space inside a crista shows, as in the large drawings
  const forks = fit([[214, 262], [318, 280]])
  const cristae = []
  for (const [bi, br] of branches.entries()) {
    const pts = br.pts
    let s = 0, next = bi === 0 ? 58 : 44, side = bi === 2 ? 1 : -1
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i]
      const len = Math.hypot(bx - ax, by - ay)
      s += len
      const left = pts.slice(i).reduce((acc, p, j, arr) => (j ? acc + Math.hypot(p[0] - arr[j - 1][0], p[1] - arr[j - 1][1]) : acc), 0)
      if (s < next) continue
      next = s + 31
      if (left < 34) break
      if (forks.some(([fx, fy]) => Math.hypot(bx - fx, by - fy) < 50)) continue
      const tx = (bx - ax) / len, ty = (by - ay) / len
      const nx = -ty * side, ny = tx * side // towards the wall this crista grows from
      const rin = br.r - gap
      const depth = 2 * rin * 0.55
      const wall = [bx + nx * (rin + 6), by + ny * (rin + 6)]
      const tip = [bx + nx * (rin - depth + fw / 2), by + ny * (rin - depth + fw / 2)]
      cristae.push([wall, tip])
      side = -side
    }
  }
  const outerAt = (x, y) => branches.reduce((m, b) => smin(m, lineDist(x, y, b.pts) - b.r, 14), Infinity)
  const matrixAt = (x, y) => {
    let d = branches.reduce((m, b) => smin(m, lineDist(x, y, b.pts) - (b.r - gap), 14), Infinity)
    for (const [a, b] of cristae) d = smax(d, -(segDist(x, y, a, b) - fw / 2), JUNCTION_SHARE * Hn * 1.6)
    return d
  }
  // Centre the drawing: trace once, then trace again moved by the difference.
  const first = bbox(trace(outerAt)[0])
  const sx = Math.round(256 - (first[0] + first[2]) / 2), sy = Math.round(256 - (first[1] + first[3]) / 2)
  const outer = simplify(trace((x, y) => outerAt(x - sx, y - sy))[0])
  const matrix = simplify(trace((x, y) => matrixAt(x - sx, y - sy))[0])
  const [x0, y0, x1, y1] = bbox(outer)
  console.log('network drawing spans', [x0, y0, x1, y1].map(f), outer.length, matrix.length)
  // One highlight on the main tube near its left end, along its upper wall.
  // One highlight on the main tube near its left end, along its upper wall, before the first crista.
  const main = branches[0].pts
  let run = 0, hi = 1
  while (hi < main.length - 1 && run < 30) { run += Math.hypot(main[hi][0] - main[hi - 1][0], main[hi][1] - main[hi - 1][1]); hi++ }
  const [ax, ay] = main[hi - 1], [bx, by] = main[hi]
  const tl = Math.hypot(bx - ax, by - ay), tx = (bx - ax) / tl, ty = (by - ay) / tl
  const up = ty > 0 ? [ty, -tx] : [-ty, tx]
  const off = 0.42 * (Hn - gap)
  const [hx, hy] = [f(ax + up[0] * off + sx), f(ay + up[1] * off + sy)]
  const rot = f((Math.atan2(ty, tx) * 180) / Math.PI)
  const body =
    `<g id="outer membrane"><path d="${pathOf(outer)}" fill="url(#network-gradient)" stroke="${MITO.outline}" stroke-width="${w}" stroke-linejoin="round"/></g>` +
    `<g id="matrix"><path d="${pathOf(matrix)}" fill="${MITO.matrix}" stroke="${MITO.inner}" stroke-width="${w}" stroke-linejoin="round"/></g>` +
    `<g id="highlight"><ellipse cx="${hx}" cy="${hy}" rx="20" ry="6" transform="rotate(${rot} ${hx} ${hy})" fill="${MITO.light}"/></g>`
  writeFileSync(join(OUT, 'Mitochondrial network.svg'), svg('Mitochondrial network', gradient('network-gradient', x0, y0, x1, y1), body))
}

console.log('written to', OUT)
