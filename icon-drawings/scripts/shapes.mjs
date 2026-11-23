// Shared helpers of the icon scripts: outlines as point lists, shapes as distance fields traced into
// outlines (marching squares), and the SVG page. Every icon of icon-drawings/STYLE.md is made with these.

export const f = (n) => Math.round(n * 10) / 10
/** A closed path through the points, without repeated points: Safari's engine draws a seam at a segment of length zero. */
export const pathOf = (pts) => {
  const keep = []
  for (const [x, y] of pts.map(([x, y]) => [f(x), f(y)])) {
    const last = keep[keep.length - 1]
    if (!last || Math.hypot(x - last[0], y - last[1]) > 0.15) keep.push([x, y])
  }
  while (keep.length > 2 && Math.hypot(keep[0][0] - keep.at(-1)[0], keep[0][1] - keep.at(-1)[1]) <= 0.15) keep.pop()
  // Start a quarter of the way round, on an edge, not at a tip where the outline turns.
  const q = Math.floor(keep.length / 4)
  // The outline runs a few points past its start instead of closing (Z): where a closed outline
  // meets itself Safari's engine leaves a hairline. A fill closes the shape by itself.
  const turned = [...keep.slice(q), ...keep.slice(0, q), ...keep.slice(q, q + 4)]
  return `M${turned.map(([x, y]) => `${x},${y}`).join(' L')}`
}
/** Evenly spaced numbers from a to b, at most `step` apart, both ends included. */
export const range = (a, b, step) => {
  const n = Math.max(2, Math.ceil(Math.abs(b - a) / step))
  return Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n)
}
export const bbox = (pts) => {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}
// Outline weight of the icons a script writes. The owner chose thinner outlines on 23 November 2026: every script written
// from then on calls `setStrokeScale(0.6)` before drawing, so `svg()` writes each stroke-width at 60 %. Scripts written
// before keep 1, so their icons stay as they were approved. Parts that use a stroke for something other than an outline
// (the halo of `glow` in parts/cellforms.mjs) divide by `strokeScale()` so they come out unchanged.
let STROKE_SCALE = 1
export const setStrokeScale = (k) => { STROKE_SCALE = k }
export const strokeScale = () => STROKE_SCALE
const scaleStrokes = (text) => STROKE_SCALE === 1 ? text : text
  .replace(/stroke-width="([\d.]+)"/g, (_, v) => `stroke-width="${f(v * STROKE_SCALE)}"`)
  .replace(/stroke-width:\s*([\d.]+)/g, (_, v) => `stroke-width:${f(v * STROKE_SCALE)}`)
export const svg = (title, defs, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">\n<title>${title}</title>\n<defs>${scaleStrokes(defs)}</defs>\n${scaleStrokes(body)}\n</svg>\n`

/** A two-stop linear gradient over a box, lit from its top left: base there, shadow at the bottom right. */
export const gradient2 = (id, [x0, y0, x1, y1], base, shadow) =>
  `<linearGradient id="${id}" x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${base}"/><stop offset="1" stop-color="${shadow}"/></linearGradient>`

/** A smooth curve through the points (Catmull–Rom), as a point list. */
export const catmull = (pts, per = 24) => {
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

// ---------- shapes as distance fields, traced into outlines ----------
export const segDist = (px, py, [ax, ay], [bx, by]) => {
  const dx = bx - ax, dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - ax - t * dx, py - ay - t * dy)
}

export const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - (h * h * k) / 4 }

export const smax = (a, b, k) => -smin(-a, -b, k)

// Marching squares on a grid of one unit: the zero line of a field as closed point lists.
export const trace = (field) => {
  const N = 512, v = new Float64Array((N + 1) * (N + 1))
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) v[j * (N + 1) + i] = field(i, j)
  const val = (i, j) => v[j * (N + 1) + i]
  const point = (e) => {
    // e: [i, j, 'h'|'v']: an edge from (i, j) to the right or down
    const [i, j, o] = e
    const a = val(i, j), b = o === 'h' ? val(i + 1, j) : val(i, j + 1)
    const t = a / (a - b)
    return o === 'h' ? [i + t, j] : [i, j + t]
  }
  const next = new Map()
  const key = (e) => e.join(',')
  const link = (e1, e2) => next.set(key(e1), { from: e1, to: e2 })
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const c = [val(i, j) < 0, val(i + 1, j) < 0, val(i + 1, j + 1) < 0, val(i, j + 1) < 0]
      const idx = c[0] * 8 + c[1] * 4 + c[2] * 2 + c[3]
      if (idx === 0 || idx === 15) continue
      const top = [i, j, 'h'], right = [i + 1, j, 'v'], bottom = [i, j + 1, 'h'], leftE = [i, j, 'v']
      // Inside on the right of the direction of travel: every loop runs the same way round.
      const table = {
        1: [[bottom, leftE]], 2: [[right, bottom]], 3: [[right, leftE]], 4: [[top, right]], 5: [[top, leftE], [bottom, right]], 6: [[top, bottom]], 7: [[top, leftE]],
        8: [[leftE, top]], 9: [[bottom, top]], 10: [[leftE, bottom], [right, top]], 11: [[right, top]], 12: [[leftE, right]], 13: [[bottom, right]], 14: [[leftE, bottom]],
      }
      for (const [e1, e2] of table[idx]) link(e1, e2)
    }
  const loops = []
  const seen = new Set()
  for (const [k0, seg] of next) {
    if (seen.has(k0)) continue
    const loop = []
    let k = k0, cur = seg
    while (cur && !seen.has(k)) { seen.add(k); loop.push(point(cur.from)); k = key(cur.to); cur = next.get(k) }
    if (loop.length > 20) loops.push(loop)
  }
  return loops.sort((a, b) => b.length - a.length)
}

// Fewer points: drop those within a tenth of a unit of the line through their neighbours (Ramer–Douglas–Peucker).
export const simplify = (pts, eps = 0.12) => {
  if (pts.length < 3) return pts
  const [a, b] = [pts[0], pts.at(-1)]
  let worst = 0, at = 0
  for (let i = 1; i < pts.length - 1; i++) { const d = segDist(pts[i][0], pts[i][1], a, b); if (d > worst) { worst = d; at = i } }
  return worst > eps ? [...simplify(pts.slice(0, at + 1), eps).slice(0, -1), ...simplify(pts.slice(at), eps)] : [a, b]
}
