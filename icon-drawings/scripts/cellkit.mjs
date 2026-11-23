// The kit every redrawn cell type is drawn with (see silicodraw.mjs and cells/*.mjs, STYLE.md "the soft look").
// Every cell type is drawn in SiliCoDraw's units (a 100 box around 0,0) through `page`, which scales by k about a centre.
// Line widths are in pixels of the 512 page. Membranes: 12 on a cell, 10 on a nucleus, 5–8 on thin parts; small parts
// (granules, vacuoles, knobs) are flat and have no outline. Nuclei share one lilac palette (NUC) in all of them.
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { hueGap, hueOf, soft, toLch } from './colour.mjs'
import { f, gradient2, svg } from './shapes.mjs'

export const highlight = (cx, cy, rx, ry, rot, fill) => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${f(cx)} ${f(cy)})" fill="${fill}"/>`

export const NUC = soft(hueOf('#6f86c8') + 50)
export const PEACH = hueOf('#f6d9c8'), BLUE = hueOf('#cfe3f5'), GREEN = hueOf('#cfe8d8')

/** A smooth closed outline through the points (Catmull–Rom as cubic Béziers), as SiliCoDraw's smoothClosed. */
export const smoothD = (p) => {
  const n = p.length
  let d = `M${f(p[0][0])},${f(p[0][1])}`
  for (let i = 0; i < n; i++) {
    const a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n], e = p[(i + 2) % n]
    d += `C${f(b[0] + (c[0] - a[0]) / 6)},${f(b[1] + (c[1] - a[1]) / 6)} ${f(c[0] - (e[0] - b[0]) / 6)},${f(c[1] - (e[1] - b[1]) / 6)} ${f(c[0])},${f(c[1])}`
  }
  return d + 'Z'
}

export const page = (k, [cx, cy]) => {
  const X = (x) => 256 + (x - cx) * k, Y = (y) => 256 + (y - cy) * k, P = ([x, y]) => [X(x), Y(y)]
  // A path written in absolute coordinates (M, L, C, Z only), moved onto the page.
  const D = (d) => d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, x, y) => `${f(X(+x))},${f(Y(+y))}`)
  const stroke = (s, w) => (s ? ` stroke="${s}" stroke-width="${w}" stroke-linejoin="round"` : '')
  return {
    k, X, Y, P, D,
    smooth: (pts) => smoothD(pts.map(P)),
    circle: (x, y, r, fill, s = '', w = 0) => `<circle cx="${f(X(x))}" cy="${f(Y(y))}" r="${f(r * k)}" fill="${fill}"${stroke(s, w)}/>`,
    ellipse: (x, y, rx, ry, rot, fill, s = '', w = 0) => `<ellipse cx="${f(X(x))}" cy="${f(Y(y))}" rx="${f(rx * k)}" ry="${f(ry * k)}"${rot ? ` transform="rotate(${rot} ${f(X(x))} ${f(Y(y))})"` : ''} fill="${fill}"${stroke(s, w)}/>`,
    path: (d, fill, s = '', w = 0) => `<path d="${d}" fill="${fill}"${stroke(s, w)}/>`,
    line: (pts, colour, w) => `<path d="M${pts.map(P).map(([x, y]) => `${f(x)},${f(y)}`).join(' L')}" fill="none" stroke="${colour}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`,
    // A gradient over a box given in their units, base at the top left to shadow at the bottom right.
    grad: (id, [x0, y0, x1, y1], pal) => gradient2(id, [X(x0), Y(y0), X(x1), Y(y1)], pal.base, pal.shadow),
    hl: (x, y, rx, ry, rot, fill) => highlight(X(x), Y(y), rx, ry, rot, fill),
    // Several shapes drawn as one, with one outline round them all: the outlines first (twice as wide, so that the
    // half outside shows), then every fill over them. Items: a path `d` to fill, or a line `{ d, width }` (width in px).
    union: (items, fill, outline, w) =>
      items.map((it) => (typeof it === 'string' ? `<path d="${it}" fill="${outline}" stroke="${outline}" stroke-width="${2 * w}" stroke-linejoin="round"/>` : `<path d="${it.d}" fill="none" stroke="${outline}" stroke-width="${it.width + 2 * w}" stroke-linecap="round" stroke-linejoin="round"/>`)).join('') +
      items.map((it) => (typeof it === 'string' ? `<path d="${it}" fill="${fill}"/>` : `<path d="${it.d}" fill="none" stroke="${fill}" stroke-width="${it.width}" stroke-linecap="round" stroke-linejoin="round"/>`)).join(''),
  }
}
export const circleD = (g, x, y, r) => { const [cx, cy] = g.P([x, y]), R = r * g.k; return `M${f(cx - R)},${f(cy)} A${f(R)},${f(R)} 0 1 0 ${f(cx + R)},${f(cy)} A${f(R)},${f(R)} 0 1 0 ${f(cx - R)},${f(cy)} Z` }
// The gloss of cells (STYLE.md): with `setGloss(true)` the parts that know it (the nucleus here, the organelles of
// parts/organelles.mjs) draw the face-on gloss on their bodies and flat nuclei. Off by default, so scripts written
// before draw exactly what was approved.
let GLOSS = false
export const setGloss = (on = true) => { GLOSS = !!on }
export const glossOn = () => GLOSS
export const nucleus = (g, x, y, r, w = 10) =>
  GLOSS ? `<g id="nucleus">${g.circle(x, y, r, NUC.base, NUC.outline, w)}</g>`
    : `<g id="nucleus">${g.circle(x, y, r, 'url(#nucleus-gradient)', NUC.outline, w)}${g.hl(x - r * 0.42, y - r * 0.45, f(r * g.k * 0.24), f(r * g.k * 0.1), -45, NUC.light)}</g>`
// Written with the gloss on too: scripts that draw a nucleus of their own fill it with this gradient.
export const nucGrad = (g, x, y, r) => g.grad('nucleus-gradient', [x - r, y - r, x + r, y + r], NUC)
/**
 * Writes cell types into a folder and remembers their parts: `cellType(name, [[part, palette], ...], defs, body)`.
 * `check()` reports parts of one icon whose hues lie closer than 36° (they would recolour together in BioSketch).
 */
export const cellTypes = (out) => {
  const made = []
  const cellType = (name, hues, defs, body) => { made.push([name, hues]); writeFileSync(join(out, `${name}.svg`), svg(name, defs, body)) }
  const check = () => {
    for (const [name, hues] of made)
      for (let i = 0; i < hues.length; i++)
        for (let j = i + 1; j < hues.length; j++) {
          const gap = hueGap(toLch(hues[i][1].base).h, toLch(hues[j][1].base).h)
          if (gap < 36) console.log(`${name}: ${hues[i][0]} and ${hues[j][0]} are only ${gap.toFixed(0)}° apart`)
        }
  }
  return { cellType, check }
}

