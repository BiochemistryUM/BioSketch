// The four new cell families (fibroblasts, cell states, cardiomyocytes, muscle cells) with the gloss of cells
// (STYLE.md "The gloss of cells"): the face-on sheen of `cell3d` on every cell body, flat nuclei, outlines at 60 %.
// Usage: node cells/glossy-families.mjs <out> [<work folder>]
//        (writes <out>/<family>/<Name>.svg, the plain runs in <work>/<family>)
//
// How, as ./glossy.mjs does for the 59 approved cell types:
// - Each family script is run as it is, as a child process, with `setGloss(true)` of ../cellkit.mjs switched on before
//   it starts (this file is given to node as `--import`, and switches it on when BIOSKETCH_GLOSS_PRELOAD is set): the
//   shared nucleus part (../parts/organelles.mjs) then draws every nucleus flat. Nothing in the scripts changes, and run
//   on their own they write exactly what they wrote before.
// - Then every file is changed as SVG text, keeping shapes, colours, contents and layer ids:
//   - Outlines at 60 %, as ./glossy.mjs (a stroke under a later copy of the same shape keeps that copy's width).
//     Lines that are a thing of their own, not an outline (collagen fibrils, stress fibres, intercalated discs, spindle
//     fibres, actin of the lamellipodium, the grey cue of motion) keep their width. The muscle family draws at 60 %
//     already (`setStrokeScale(0.6)` in its script) and is not narrowed again.
//   - Nuclei left with a gradient in the nucleus colours (the corkscrew nucleus, the acinus): one flat fill, no highlight.
//   - Cell bodies: every shape filled with a body gradient gets the gloss, its gradient ending in the gloss's end tone,
//     its old highlight gone. The gloss here is `gloss` of ../parts/surfaces.mjs with one difference (`glossBody`
//     below): its tones are kept to the part of the cell that is wide enough for a rim to read, the cell's outline
//     "opened" by half its greatest depth, so thin processes, axons, tapering ends of spindles and arms stay flat while
//     the cushion is still that of the whole outline (no false rim where a process leaves the body). By the depth of
//     the cell on the page: under 12 px flat, under 30 px the shade band only, from 30 px the whole gloss.
//   - Left flat as they were: apoptotic fragments, nucleoli, the cut face of a muscle fibre, the myofibril and the
//     sarcomere of "Myofibril structure", granules, striations, glow halos (fluorescent cells keep their halos; the
//     cell inside takes the gloss in its fluorescent palette).
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { deep, hueGap, rich, soft, toHex, toLch } from '../colour.mjs'
import { NUC, setGloss } from '../cellkit.mjs'
import { f, pathOf, simplify } from '../shapes.mjs'
import { contours } from '../parts/cellforms.mjs'
import { glossTones, pathPoints } from '../parts/surfaces.mjs'

if (process.env.BIOSKETCH_GLOSS_PRELOAD) setGloss(true)

const HERE = dirname(fileURLToPath(import.meta.url)), SCRIPTS = join(HERE, '..')
/** The families: script, and the share their outlines are narrowed by. */
export const FAMILIES = [
  { name: 'fibro', script: 'cells/fibroblast-family.mjs', scale: 0.6 },
  { name: 'cellstates', script: 'cells/cell-states.mjs', scale: 0.6 },
  { name: 'cardio', script: 'cells/cardiomyocyte-family.mjs', scale: 0.6 },
  { name: 'muscle', script: 'cells/muscle-family.mjs', scale: 1 }, // setStrokeScale(0.6) in the script already
]
/** Gradients that do not fill a cell body (./glossy.mjs's list and the parts of these families that stay flat). */
const NOT_BODY = /blastocoel|zona|matrix|bone|osteoid|capillary|lumen|myelin|axon|wall|vacuole|chloroplast|clock|shield|outer|cilia|nerve|^red-|normal|nucleolus|fragment|face|myofibril|sarcomere/
/** Groups whose lines are things of their own and keep their width. */
const KEEP_WIDTH = /collagen|stress-fibres|intercalated-discs|-spindle$|-motion$|lamellipodium/
/** Depth of a body on the page (px) under which it is flat, and under which it gets the shade band only. */
const FLAT_BELOW = 12, SHADE_BELOW = 30

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((c) => c / l) }
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const attrsOf = (s) => Object.fromEntries([...s.matchAll(/([\w:-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]))
const writeEl = (tag, a) => `<${tag} ${Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(' ')}/>`
const urlOf = (v) => (v && v.startsWith('url(#') ? v.slice(5, -1) : null)

/** Squared Euclidean distance transform (as in ../parts/surfaces.mjs): 0 where `on`, else the squared distance in cells. */
function edt(on, nx, ny) {
  const INF = 1e20, D = new Float64Array(nx * ny), n = Math.max(nx, ny), fb = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1)
  const pass = (len, get, set) => {
    for (let q = 0; q < len; q++) fb[q] = get(q)
    let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF
    for (let q = 1; q < len; q++) {
      let s = ((fb[q] + q * q) - (fb[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
      while (s <= z[k]) { k--; s = ((fb[q] + q * q) - (fb[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]) }
      k++; v[k] = q; z[k] = s; z[k + 1] = INF
    }
    k = 0
    for (let q = 0; q < len; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) ** 2 + fb[v[k]] }
    for (let q = 0; q < len; q++) set(q, d[q])
  }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) D[j * nx + i] = on[j * nx + i] ? 0 : INF
  for (let i = 0; i < nx; i++) pass(ny, (q) => D[q * nx + i], (q, val) => { D[q * nx + i] = val })
  for (let j = 0; j < ny; j++) pass(nx, (q) => D[j * nx + q], (q, val) => { D[j * nx + q] = val })
  return D
}

/**
 * The gloss of `gloss` (../parts/surfaces.mjs) over the union of `fills` (lists of subpaths of page points), with its
 * tones kept to the cell's outline opened by `open` × its greatest depth (thin parts flat). Returns the tone paths
 * { shade, shadow, lit, highlight } and `depth`, the greatest depth of the cell in page pixels.
 */
export function glossBody(fills, { inset = 0, open = 0.5, res = 0.5 } = {}) {
  const all = fills.flat(2)
  const none = { shade: '', shadow: '', lit: '', highlight: '', depth: 0 }
  if (!all.length) return none
  const pad = 6
  const x0 = Math.min(...all.map((p) => p[0])) - pad, y0 = Math.min(...all.map((p) => p[1])) - pad
  const x1 = Math.max(...all.map((p) => p[0])) + pad, y1 = Math.max(...all.map((p) => p[1])) + pad
  const nx = Math.ceil((x1 - x0) / res) + 1, ny = Math.ceil((y1 - y0) / res) + 1
  const X = (i) => x0 + i * res, Y = (j) => y0 + j * res
  const mask = new Uint8Array(nx * ny)
  for (const subs of fills) {
    const edges = subs.flatMap((s) => s.map((p, k) => [p, s[(k + 1) % s.length]])).filter(([a, b]) => a[1] !== b[1])
    for (let j = 0; j < ny; j++) {
      const y = Y(j), xs = []
      for (const [a, b] of edges) if ((a[1] <= y) !== (b[1] <= y)) xs.push([a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]), a[1] < b[1] ? 1 : -1])
      xs.sort((p, q) => p[0] - q[0])
      let w = 0
      for (let k = 0; k < xs.length - 1; k++) {
        w += xs[k][1]
        if (w !== 0) for (let i = Math.max(0, Math.ceil((xs[k][0] - x0) / res)); i <= Math.min(nx - 1, Math.floor((xs[k + 1][0] - x0) / res)); i++) mask[j * nx + i] = 1
      }
    }
  }
  function blur(s, sig) {
    const r3 = Math.ceil(sig * 3), ker = Array.from({ length: 2 * r3 + 1 }, (_, k) => Math.exp(-((k - r3) ** 2) / (2 * sig * sig))), ks = ker.reduce((a, b) => a + b)
    const tmp = new Float64Array(s.length)
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { let a = 0; for (let k = -r3; k <= r3; k++) a += ker[k + r3] * s[j * nx + clamp(i + k, 0, nx - 1)]; tmp[j * nx + i] = a / ks }
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { let a = 0; for (let k = -r3; k <= r3; k++) a += ker[k + r3] * tmp[clamp(j + k, 0, ny - 1) * nx + i]; s[j * nx + i] = a / ks }
    return s
  }
  // Signed distance (px, positive inside), smoothed. `raw` the unsmoothed distance inside, for the opening.
  const signed = (m, smooth = true) => {
    const out = edt(m.map((x) => 1 - x), nx, ny), inn = edt(m, nx, ny), s = new Float64Array(nx * ny)
    let top = 0
    for (let q = 0; q < s.length; q++) { s[q] = m[q] ? Math.sqrt(out[q]) * res - res / 2 : -(Math.sqrt(inn[q]) * res - res / 2); top = Math.max(top, s[q]) }
    return { s: smooth ? blur(s, Math.max(1.5, 0.02 * top) / res) : s, top }
  }
  const { s: dS, top } = signed(mask)
  if (top < FLAT_BELOW) return { ...none, depth: top }
  // The opened outline: eroded by r, grown back by r.
  const r = open * top, outD = edt(mask.map((x) => 1 - x), nx, ny), core = new Uint8Array(nx * ny)
  for (let q = 0; q < core.length; q++) core[q] = mask[q] && Math.sqrt(outD[q]) * res > r ? 1 : 0
  const toCore = edt(core, nx, ny), opened = new Uint8Array(nx * ny)
  for (let q = 0; q < opened.length; q++) opened[q] = mask[q] && Math.sqrt(toCore[q]) * res <= r ? 1 : 0
  const { s: dO } = signed(opened)
  let dmax = 0
  for (let q = 0; q < dS.length; q++) dmax = Math.max(dmax, dS[q])
  // The cushion of the generic cell3d (as `gloss`).
  const edge = 0.345 * dmax, thick = 0.23 * dmax, dome = 0.092 * dmax
  const slope = (d) => { if (d <= 0) return 1e3; const u = Math.min(d / edge, 1); return (u < 1 ? (thick / edge) * (1 - u) / Math.max(1e-3, Math.sqrt(1 - (1 - u) ** 2)) : 0) + Math.max(0, dome * 2 * (1 - d / dmax) / dmax) }
  const L = norm([-0.5, -0.6, 0.65]), light = new Float64Array(nx * ny)
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const q = j * nx + i, d = dS[q]
    if (d <= 0) { light[q] = 0.02; continue }
    const gx = dS[j * nx + Math.min(i + 1, nx - 1)] - dS[j * nx + Math.max(i - 1, 0)], gy = dS[Math.min(j + 1, ny - 1) * nx + i] - dS[Math.max(j - 1, 0) * nx + i]
    const gl = Math.hypot(gx, gy) || 1, s = slope(d), n = norm([-s * gx / gl, -s * gy / gl, 1])
    light[q] = n[2] < 0.3 ? 0.02 : dot(n, L)
  }
  const at = (A, px, py) => {
    const u = clamp((px - x0) / res, 0, nx - 1.001), v = clamp((py - y0) / res, 0, ny - 1.001), i = Math.floor(u), j = Math.floor(v), a = u - i, b = v - j, q = j * nx + i
    return (A[q] * (1 - a) + A[q + 1] * a) * (1 - b) + (A[q + nx] * (1 - a) + A[q + nx + 1] * a) * b
  }
  const S = 1.2 * dmax, box = [x0, y0, x1, y1]
  const layer = (lv, below) => contours((px, py) => Math.max(inset + 0.3 - at(dS, px, py), 0.3 - at(dO, px, py), (below ? at(light, px, py) - lv : lv - at(light, px, py)) * S), box, [0], 1)[0].map((l) => pathOf(simplify(l, 0.3))).join(' ')
  const full = top >= SHADE_BELOW
  return { shade: layer(0.26, true), shadow: layer(0.12, true), lit: full ? layer(0.86, false) : '', highlight: full ? layer(0.95, false) : '', depth: top }
}

/** Page outline of a shape element, as subpaths of points (as ./glossy.mjs). */
function geometry(tag, a) {
  let subs
  const N = 360
  if (tag === 'path') subs = pathPoints(a.d)
  else if (tag === 'circle') subs = [Array.from({ length: N }, (_, i) => [+a.cx + +a.r * Math.cos((2 * Math.PI * i) / N), +a.cy + +a.r * Math.sin((2 * Math.PI * i) / N)])]
  else if (tag === 'ellipse') subs = [Array.from({ length: N }, (_, i) => [+a.cx + +a.rx * Math.cos((2 * Math.PI * i) / N), +a.cy + +a.ry * Math.sin((2 * Math.PI * i) / N)])]
  else if (tag === 'rect') {
    const x = +a.x, y = +a.y, w = +a.width, h = +a.height, r = Math.min(+(a.rx ?? a.ry ?? 0), w / 2, h / 2), pts = []
    const corner = (cx, cy, a0) => { for (let i = 0; i <= 8; i++) { const t = a0 + (Math.PI / 2) * (i / 8); pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]) } }
    corner(x + w - r, y + r, -Math.PI / 2); corner(x + w - r, y + h - r, 0); corner(x + r, y + h - r, Math.PI / 2); corner(x + r, y + r, Math.PI)
    subs = [pts]
  } else return []
  const m = /rotate\(([-\d.]+) ([-\d.]+) ([-\d.]+)\)/.exec(a.transform ?? '')
  if (m) {
    const t = (+m[1] * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t), ox = +m[2], oy = +m[3]
    subs = subs.map((sp) => sp.map(([px, py]) => [ox + (px - ox) * c - (py - oy) * s, oy + (px - ox) * s + (py - oy) * c]))
  }
  return subs
}

function lightOf(base, hint) {
  if (hint) return hint
  const h = toLch(base).h
  for (const p of [soft(h), rich(h), deep(h)]) if (p.base === base) return p.light
  const B = toLch(base)
  return toHex({ l: Math.min(0.985, B.l + 0.055), c: B.c * 0.3, h: B.h })
}
const isHighlight = (tag, a, base) => {
  if (tag !== 'ellipse' || !a.transform || (a.stroke && a.stroke !== 'none') || !/^#[0-9A-F]{6}$/i.test(a.fill ?? '')) return false
  const F = toLch(a.fill), B = toLch(base)
  return F.l >= 0.94 && (F.c < 0.02 || hueGap(F.h, B.h) < 30)
}

/** One icon of these families turned glossy (SVG text in, SVG text out). `scale`: the share its outlines are narrowed by. */
export function glossyFamily(text, { scale = 0.6, log = () => {} } = {}) {
  const head = text.slice(0, text.indexOf('<defs>'))
  let defs = text.slice(text.indexOf('<defs>') + 6, text.indexOf('</defs>'))
  const bodyText = text.slice(text.indexOf('</defs>') + 7, text.lastIndexOf('</svg>'))
  const grads = {}
  for (const m of defs.matchAll(/<(linear|radial)Gradient id="([^"]+)"[^>]*>(.*?)<\/\1Gradient>/g)) grads[m[2]] = { stops: [...m[3].matchAll(/stop-color="(#[0-9A-Fa-f]{6})"/g)].map((s) => s[1]) }
  const isNuc = (id) => grads[id] && grads[id].stops[0] === NUC.base && grads[id].stops[1] === NUC.shadow
  const isBody = (id) => grads[id] && !isNuc(id) && !NOT_BODY.test(id) && grads[id].stops.length === 2
  const items = [], groups = [], stack = []
  for (const m of bodyText.matchAll(/(<g\b[^>]*>)|(<\/g>)|<(path|circle|ellipse|rect)\b(.*?)\/>|([^<]+|<[^>]*>)/g)) {
    if (m[1]) { const a = attrsOf(m[1]), g = { type: 'open', text: m[1], id: a.id, transform: a.transform, els: [] }; items.push(g); groups.push(g); stack.push(g) }
    else if (m[2]) items.push({ type: 'close', group: stack.pop() })
    else if (m[3]) { const e = { type: 'el', tag: m[3], a: attrsOf(m[4]), before: [], after: [], ancestors: [...stack] }; items.push(e); stack.at(-1)?.els.push(e) }
    else items.push({ type: 'text', text: m[5] })
  }
  const all = items.filter((it) => it.type === 'el')
  // Outlines narrowed (./glossy.mjs's rule), lines of their own kept.
  if (scale !== 1) {
    const key = (e) => e.tag + JSON.stringify(Object.entries(e.a).filter(([k]) => !/^(fill|stroke|stroke-width|stroke-linecap|stroke-linejoin)$/.test(k)))
    for (let i = 0; i < all.length; i++) {
      const e = all[i]
      if (!e.a['stroke-width'] || !e.a.stroke || e.a.stroke === 'none' || e.keep || urlOf(e.a.stroke)) continue
      if (e.ancestors.some((g) => KEEP_WIDTH.test(g.id ?? ''))) continue
      const s = +e.a['stroke-width'], k = key(e), partner = all.slice(i + 1).find((o) => key(o) === k)
      const s2 = partner ? (partner.a.stroke && partner.a.stroke !== 'none' ? +partner.a['stroke-width'] : 0) : 0
      if (partner) partner.keep = true
      e.a['stroke-width'] = String(f(partner && s > s2 ? s2 + (s - s2) * scale : s * scale))
    }
  }
  // Nuclei still in a gradient: flat.
  for (const e of all) {
    for (const at of ['fill', 'stroke']) if (isNuc(urlOf(e.a[at]))) e.a[at] = NUC.base
    if (e.tag === 'ellipse' && e.a.fill === NUC.light && e.a.transform && !e.a.stroke) e.drop = true
  }
  for (const id of Object.keys(grads).filter(isNuc)) defs = defs.replace(new RegExp(`<(linear|radial)Gradient id="${id}"[^>]*>.*?</\\1Gradient>`), '')
  // Bodies: the gloss.
  const ends = {}
  for (const g of groups) {
    const bodies = [...new Set(g.els.flatMap((e) => [urlOf(e.a.fill), urlOf(e.a.stroke)]).filter(isBody))]
    for (const G of bodies) {
      if ([g, ...(g.els[0]?.ancestors ?? [])].some((h) => h.transform)) log(`  ${G}: inside a turned group, left as it is`)
      if ([g, ...(g.els[0]?.ancestors ?? [])].some((h) => h.transform)) continue
      const [base, shadow] = grads[G].stops
      const hintEl = g.els.find((e) => isHighlight(e.tag, e.a, base))
      const T = glossTones({ base, shadow, light: lightOf(base, hintEl?.a.fill) })
      ends[G] = T.end
      for (const e of g.els) if (isHighlight(e.tag, e.a, base)) e.drop = true
      const put = (el, G2) => el.after.push(['shade', 'shadow', 'lit', 'highlight'].map((k) => (G2[k] ? `<path d="${G2[k]}" fill="${T[k]}"/>` : '')).join(''))
      const describe = (G2) => (G2.lit ? 'gloss' : G2.shade || G2.shadow ? 'shade only' : 'flat')
      const own = g.els.filter((e) => urlOf(e.a.fill) === G && e.a.stroke && e.a.stroke !== 'none')
      for (const e of own) { const G2 = glossBody([geometry(e.tag, e.a)], { inset: +e.a['stroke-width'] / 2 }); put(e, G2); log(`  ${G} (${e.tag}): depth ${G2.depth.toFixed(0)} px, ${describe(G2)}`) }
      const fills = g.els.filter((e) => urlOf(e.a.fill) === G && !(e.a.stroke && e.a.stroke !== 'none'))
      if (fills.length) {
        // A body drawn without its outline (the outline drawn after it, as lines): kept clear of that outline's width.
        const later = g.els.filter((e) => e.a.fill === 'none' && e.a.stroke && !urlOf(e.a.stroke)).map((e) => +e.a['stroke-width'])
        const last = fills.at(-1), G2 = glossBody(fills.map((e) => geometry(e.tag, e.a)), { inset: later.length ? Math.max(...later) / 2 : 0 })
        put(last, G2); log(`  ${G} (fill): depth ${G2.depth.toFixed(0)} px, ${describe(G2)}`)
      }
    }
  }
  for (const [G, end] of Object.entries(ends)) defs = defs.replace(new RegExp(`(<linearGradient id="${G}"[^>]*><stop offset="0" stop-color="#[0-9A-Fa-f]{6}"/><stop offset="1" stop-color=")#[0-9A-Fa-f]{6}`), `$1${end}`)
  const body = items.map((it) => it.type === 'open' ? it.text : it.type === 'close' ? '</g>' : it.type === 'text' ? it.text : it.drop ? '' : it.before.join('') + writeEl(it.tag, it.a) + it.after.join('')).join('')
  return `${head}<defs>${defs}</defs>${body}</svg>\n`
}

/** What the rules of STYLE.md forbid, and the 40 kB limit: a list of problems ([] when the file is fine). */
export function problems(text) {
  const out = []
  if (/opacity|filter|mix-blend|<text|<image|<pattern|<mask/.test(text)) out.push('opacity, filter, blend, text, picture, pattern or mask')
  for (const [, at, v] of text.matchAll(/\b(fill|stroke|stop-color)="([^"]*)"/g)) if (!/^(#[0-9A-F]{6}|none|url\(#[\w-]+\))$/i.test(v)) out.push(`${at}="${v}"`)
  const ids = [...text.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]), dup = ids.filter((id, i) => ids.indexOf(id) !== i)
  if (dup.length) out.push(`duplicate ids: ${[...new Set(dup)].join(', ')}`)
  for (const [, id] of text.matchAll(/url\(#([\w-]+)\)/g)) if (!ids.includes(id)) out.push(`url to a missing id: ${id}`)
  const kb = Buffer.byteLength(text) / 1024
  if (kb >= 40) out.push(`${kb.toFixed(1)} kB`)
  return out
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = process.argv[2], work = process.argv[3] ?? join(out, '..', 'plain')
  if (!out) { console.log('Usage: node cells/glossy-families.mjs <out> [<work folder>]'); process.exit(1) }
  for (const fam of FAMILIES) {
    const plain = join(work, fam.name), dest = join(out, fam.name)
    mkdirSync(plain, { recursive: true }); mkdirSync(dest, { recursive: true })
    console.log(`== ${fam.script}`)
    const said = execFileSync('node', ['--import', import.meta.url, join(SCRIPTS, fam.script), plain], { env: { ...process.env, BIOSKETCH_GLOSS_PRELOAD: '1' }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })
    for (const line of said.split('\n')) if (line && !line.startsWith('written to')) console.log(`  check(): ${line}`)
    for (const file of readdirSync(plain).filter((n) => n.endsWith('.svg')).sort()) {
      console.log(file)
      const svg = glossyFamily(readFileSync(join(plain, file), 'utf8'), { scale: fam.scale, log: console.log })
      for (const p of problems(svg)) console.log(`  PROBLEM: ${p}`)
      writeFileSync(join(dest, file), svg)
    }
  }
  console.log(`written to ${out}`)
}
