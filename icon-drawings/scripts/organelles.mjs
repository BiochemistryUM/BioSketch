// Writes the organelles of icon-drawings/STYLE.md in the semi-flat style of the mitochondrion: so far the Golgi
// apparatus. Usage: node organelles.mjs <folder>
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { bbox, f, gradient2, pathOf, range, simplify, smin, svg, trace } from './shapes.mjs'

const OUT = process.argv[2]
const W = 6 // outline of large parts
const GOLGI = { outline: '#2E5E8C', shadow: '#5E93C9', base: '#84B3E0', light: '#D2E6F7' }

const pathsOf = (loops) => loops.map(pathOf).join(' ')
/** Distance to a tube along a polyline whose radius changes along it (radii per point). */
const tube = (x, y, pts, radii) => {
  let m = Infinity
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], dx = bx - ax, dy = by - ay
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)))
    m = Math.min(m, Math.hypot(x - ax - t * dx, y - ay - t * dy) - (radii[i] + t * (radii[i + 1] - radii[i])))
  }
  return m
}
const ellipse = (cx, cy, rx, ry, rot, fill, stroke = '', w = 0) =>
  `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}"${rot ? ` transform="rotate(${f(rot)} ${f(cx)} ${f(cy)})"` : ''} fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${w}"` : ''}/>`
const write = (name, defs, body) => writeFileSync(join(OUT, `${name}.svg`), svg(name, defs, body))

// ---------- Golgi apparatus: a stack of curved cisternae, swollen at their rims, with vesicles budding off ----------
{
  const stack = [[0, 182], [64, 206], [128, 170], [192, 198], [256, 158]] // height of the middle, half length: long and shorter in turn
  const bow = 110 / 220 ** 2
  // Round vesicles around the stack: [x, y, radius], from the middle of the stack.
  const free = [[-198, 236, 13], [208, 232, 12], [-150, 360, 14], [142, 366, 11], [0, 390, 13], [-64, 376, 10]]
  const cisternae = (sx, sy) =>
    stack.map(([y0, hl], i) => {
      const pts = range(-hl, hl, 4).map((x) => [256 + x + sx, y0 + bow * x * x + sy])
      const radii = pts.map(([x]) => 12 + 8 * ((x - 256 - sx) / hl) ** 4)
      // A vesicle pinching off the rim of the second and fourth cisternae.
      const end = bow * hl * hl
      const bud = i === 1 ? [256 + hl + 22 + sx, y0 + end + 22 + sy] : i === 3 ? [256 - hl - 22 + sx, y0 + end + 22 + sy] : null
      const field = (x, y) => { const d = tube(x, y, pts, radii); return bud ? smin(d, Math.hypot(x - bud[0], y - bud[1]) - 12, 7) : d }
      return simplify(trace(field)[0])
    })
  // Centre the drawing: measure it where it stands, then build it again moved by the difference.
  const reach = (sx, sy) => free.flatMap(([x, y, r]) => [[256 + x - r + sx, y - r + sy], [256 + x + r + sx, y + r + sy]])
  const first = bbox([...cisternae(0, 0).flat(), ...reach(0, 0)])
  const sx = Math.round(256 - (first[0] + first[2]) / 2), sy = Math.round(256 - (first[1] + first[3]) / 2)
  const shapes = cisternae(sx, sy)
  const vesicles = free.map(([x, y, r]) => `<circle cx="${256 + x + sx}" cy="${y + sy}" r="${r}" fill="url(#golgi-gradient)" stroke="${GOLGI.outline}" stroke-width="4"/>`)
  const box = bbox(shapes.flat())
  // One highlight on the top cisterna, left of its middle, along its curve.
  const [ty, thl] = stack[0], hx = -0.45 * thl
  console.log('Golgi spans', bbox([...shapes.flat(), ...reach(sx, sy)]).map(f))
  write('Golgi apparatus',
    gradient2('golgi-gradient', box, GOLGI.base, GOLGI.shadow),
    `<g id="cisternae"><path d="${pathsOf(shapes)}" fill="url(#golgi-gradient)" stroke="${GOLGI.outline}" stroke-width="${W}" stroke-linejoin="round"/></g>` +
      `<g id="vesicles">${vesicles.join('')}</g>` +
      `<g id="highlight">${ellipse(256 + hx + sx, ty + bow * hx * hx - 4 + sy, 28, 5, (Math.atan(2 * bow * hx) * 180) / Math.PI, GOLGI.light)}</g>`)
}

console.log('written to', OUT)
