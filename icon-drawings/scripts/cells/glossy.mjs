// The approved cell types (CELL_TYPES in ../parts/tissue.mjs) redrawn with the gloss of cells (STYLE.md "The gloss of
// cells"): the face-on sheen of `cell3d` on every cell body, flat nuclei, and outlines at 60 %.
// Usage: node cells/glossy.mjs <out> [<work folder>]
//
// How: each script that draws the approved icons is run as it is (so with nothing switched on it writes exactly the
// approved files, and nothing in those scripts changes), into a work folder; then every one of the 59 files is changed
// as SVG text, keeping its shapes, colours, contents and layer ids:
// - Outlines at 60 %. An outline drawn as a wider copy under its fill (cellkit's `union`: thick processes, lobed nuclei)
//   keeps the width of the fill; only the part that shows as outline is narrowed, so processes keep their thickness.
//   Every other stroke is narrowed as `setStrokeScale(0.6)` does.
// - Cell bodies: every closed shape filled with a body gradient gets the gloss (`gloss` in ../parts/surfaces.mjs) drawn
//   right after it, inside its own group, its gradient ending in the gloss's end tone; a shape with its own outline is
//   glossed alone (each blastomere), shapes drawn as one union with processes as one body whose processes stay flat.
//   The old highlight ellipse of the body goes; a layer `highlight` of its own keeps its id and holds the lit band and
//   the highlight. Lipid droplets are glossed like bodies (organelles, 23 November 2026). Gradients that are not cell
//   bodies (bone, matrix, zona, myelin, vessels, other organelles, the red blood cells beside other cells) are left as
//   they are.
// - Nuclei (every gradient in the nucleus colours): one flat fill, the outline, no highlight.
// - Red blood cell: the approved face-on red blood cell, kept as it is (`Red blood cell.svg`, written by ../molecules/shaded.mjs).
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deep, hueGap, rich, soft, toHex, toLch } from '../colour.mjs'
import { NUC } from '../cellkit.mjs'
import { f } from '../shapes.mjs'
import { CELL_TYPES } from '../parts/tissue.mjs'
import { gloss, glossTones, pathPoints } from '../parts/surfaces.mjs'

const HERE = dirname(fileURLToPath(import.meta.url)), SCRIPTS = join(HERE, '..'), ICONS = join(SCRIPTS, '..')
/** The scripts that write the approved cell types (checked on 23 November 2026: each writes its icons byte for byte). */
export const SOURCES = ['silicodraw.mjs', 'cells/nervous.mjs', 'cells/immune1.mjs', 'cells/immune2.mjs', 'cells/embryo.mjs', 'cells/tissue.mjs', 'cells/epithelia.mjs']
/** Gradients that do not fill a cell body. */
const NOT_BODY = /blastocoel|zona|matrix|bone|osteoid|capillary|lumen|myelin|axon|wall|vacuole|chloroplast|clock|shield|outer|cilia|nerve|^red-|normal/
const SCALE = 0.6

const attrsOf = (s) => Object.fromEntries([...s.matchAll(/([\w:-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]))
const writeEl = (tag, a) => `<${tag} ${Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(' ')}/>`
const urlOf = (v) => (v && v.startsWith('url(#') ? v.slice(5, -1) : null)

/** Page outline of a shape element, as subpaths of points. */
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

/** The light tone of a body's palette: the old highlight's colour when there is one, else that of the palette it was made from. */
function lightOf(base, shadow, hint) {
  if (hint) return hint
  const h = toLch(base).h
  for (const p of [soft(h), rich(h), deep(h)]) if (p.base === base) return p.light
  const B = toLch(base)
  return toHex({ l: Math.min(0.985, B.l + 0.055), c: B.c * 0.3, h: B.h })
}

const isHighlight = (tag, a, base, lmin = 0.94) => {
  if (tag !== 'ellipse' || !a.transform || (a.stroke && a.stroke !== 'none') || !/^#[0-9A-F]{6}$/i.test(a.fill ?? '')) return false
  const F = toLch(a.fill), B = toLch(base)
  return F.l >= lmin && (F.c < 0.02 || hueGap(F.h, B.h) < 30)
}

/** One approved icon turned glossy (SVG text in, SVG text out). */
// Options: hlMin (lightness from which a light ellipse counts as a body's highlight), prescaled (outlines already narrowed
// by setStrokeScale(k): only the outlines drawn under a copy of their shape are put right), skip(id) (gradients left as
// they are: bodies a part has already made glossy, molecules), minSize (px: smaller bodies stay as they are), also(id) (bodies
// in spite of their name), eps (how closely the tones are traced, px; 0.3 when not given), minAcross (px: bodies
// narrower across stay as they are), litMin (px across: smaller bodies get the shade side only); the
// three sizes may be functions of the gradient's id.
export function glossy(text, { hlMin = 0.94, prescaled, skip = () => false, minSize = 0, also = () => false, eps, minAcross = 0, litMin = 0 } = {}) {
  const head = text.slice(0, text.indexOf('<defs>'))
  let defs = text.slice(text.indexOf('<defs>') + 6, text.indexOf('</defs>'))
  const bodyText = text.slice(text.indexOf('</defs>') + 7, text.lastIndexOf('</svg>'))
  // Gradients and what they are.
  const grads = {}
  for (const m of defs.matchAll(/<(linear|radial)Gradient id="([^"]+)"[^>]*>(.*?)<\/\1Gradient>/g)) grads[m[2]] = { stops: [...m[3].matchAll(/stop-color="(#[0-9A-Fa-f]{6})"/g)].map((s) => s[1]) }
  const isNuc = (id) => grads[id] && grads[id].stops[0] === NUC.base && grads[id].stops[1] === NUC.shadow
  const isBody = (id) => grads[id] && !isNuc(id) && (!NOT_BODY.test(id) || also(id)) && grads[id].stops.length === 2 && !skip(id, grads[id].stops)
  // Groups and their elements.
  // Groups may hold groups (a nucleus inside its cell): each element belongs to the group right round it.
  const items = [], groups = [], stack = []
  for (const m of bodyText.matchAll(/(<g\b[^>]*>)|(<\/g>)|<(path|circle|ellipse|rect)\b(.*?)\/>|([^<]+|<[^>]*>)/g)) {
    if (m[1]) { const g = { type: 'open', text: m[1], id: attrsOf(m[1]).id, els: [] }; items.push(g); groups.push(g); stack.push(g) }
    else if (m[2]) items.push({ type: 'close', group: stack.pop() })
    else if (m[3]) { const e = { type: 'el', tag: m[3], a: attrsOf(m[4]), before: [], after: [] }; items.push(e); stack.at(-1)?.els.push(e) }
    else items.push({ type: 'text', text: m[5] })
  }
  const all = items.filter((it) => it.type === 'el')
  const key = (e) => e.tag + JSON.stringify(Object.entries(e.a).filter(([k]) => !/^(fill|stroke|stroke-width|stroke-linecap|stroke-linejoin)$/.test(k)))
  // Outlines at 60 %: a stroke under a later copy of the same shape keeps that copy's width.
  for (let i = 0; i < all.length; i++) {
    const e = all[i]
    // A shape drawn as a wide stroke in a gradient (a process, a link between lobes) is a fill, not an outline.
    if (!e.a['stroke-width'] || !e.a.stroke || e.a.stroke === 'none' || e.keep || urlOf(e.a.stroke)) continue
    const s = +e.a['stroke-width'], k = key(e), partner = all.slice(i + 1).find((o) => key(o) === k)
    const s2 = partner ? (partner.a.stroke && partner.a.stroke !== 'none' ? +partner.a['stroke-width'] : 0) : 0
    if (partner) partner.keep = true
    if (prescaled) {
      // Both were narrowed: the copy on top gets its width back, the outline under it shows as much as the others.
      if (partner && s > s2) { if (s2) partner.a['stroke-width'] = String(f(s2 / prescaled)); e.a['stroke-width'] = String(f(s2 / prescaled + (s - s2))) }
      continue
    }
    e.a['stroke-width'] = String(f(partner && s > s2 ? s2 + (s - s2) * SCALE : s * SCALE))
  }
  // Nuclei: flat.
  const nucIds = Object.keys(grads).filter(isNuc)
  for (const e of all) {
    for (const at of ['fill', 'stroke']) if (isNuc(urlOf(e.a[at]))) e.a[at] = NUC.base
    if (e.tag === 'ellipse' && e.a.fill === NUC.light && e.a.transform && !e.a.stroke) e.drop = true
  }
  for (const id of nucIds) defs = defs.replace(new RegExp(`<(linear|radial)Gradient id="${id}"[^>]*>.*?</\\1Gradient>`), '')
  // Bodies: the gloss.
  const ends = {}
  groups.forEach((g, gi) => {
    const bodies = [...new Set(g.els.flatMap((e) => [urlOf(e.a.fill), urlOf(e.a.stroke)]).filter(isBody))]
    for (const G of bodies) {
      const [base, shadow] = grads[G].stops
      const per = (v) => (typeof v === 'function' ? v(G) : v), minSize_ = per(minSize), minAcross_ = per(minAcross), litMin_ = per(litMin)
      if (minSize_) {
        const pts = g.els.filter((e) => urlOf(e.a.fill) === G || urlOf(e.a.stroke) === G).flatMap((e) => geometry(e.tag, e.a).flat())
        const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
        if (!pts.length || Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) < minSize_) continue
      }
      let across = Infinity
      if (minAcross_ || litMin_) {
        const pts = g.els.filter((e) => urlOf(e.a.fill) === G || urlOf(e.a.stroke) === G).flatMap((e) => geometry(e.tag, e.a).flat())
        const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
        across = pts.length ? Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) : 0
        if (across < minAcross_) continue
      }
      // A layer `highlight` of its own, after this group and not yet given to another body, holds its old highlight.
      const HL = groups.find((h, hi) => hi > gi && h.id === 'highlight' && !h.claimed)
      const hintEl = [...g.els, ...(HL ? HL.els : [])].find((e) => isHighlight(e.tag, e.a, base, hlMin))
      const pal = { base, shadow, light: lightOf(base, shadow, hintEl?.a.fill) }
      const T = glossTones(pal)
      ends[G] = T.end
      for (const e of [...g.els, ...(HL ? HL.els : [])]) if (isHighlight(e.tag, e.a, base, hlMin)) e.drop = true
      const hlGroup = HL && HL.els.every((e) => e.drop) ? HL : null
      const put = (el, G2, own) => {
        const lower = ['shade', 'shadow'].map((k) => (G2[k] ? `<path d="${G2[k]}" fill="${T[k]}"/>` : '')).join('')
        const upper = across < litMin_ ? '' : ['lit', 'highlight'].map((k) => (G2[k] ? `<path d="${G2[k]}" fill="${T[k]}"/>` : '')).join('')
        if (hlGroup && !own && !hlGroup.claimed) { el.after.push(lower); hlGroup.extra = (hlGroup.extra ?? '') + upper; hlGroup.claimed = true } else el.after.push(lower + upper)
      }
      const own = g.els.filter((e) => urlOf(e.a.fill) === G && e.a.stroke && e.a.stroke !== 'none')
      for (const e of own) put(e, gloss({ fills: [geometry(e.tag, e.a)] }, { inset: +e.a['stroke-width'] / 2, eps }), own.length > 1)
      const fills = g.els.filter((e) => urlOf(e.a.fill) === G && !(e.a.stroke && e.a.stroke !== 'none'))
      const lines = g.els.filter((e) => urlOf(e.a.stroke) === G && (e.a.fill === 'none'))
      if (fills.length) {
        const last = [...fills, ...lines].sort((p, q) => g.els.indexOf(q) - g.els.indexOf(p))[0]
        put(last, gloss({ fills: fills.map((e) => geometry(e.tag, e.a)), lines: lines.flatMap((e) => geometry(e.tag, e.a).map((pts) => ({ pts, width: +e.a['stroke-width'] }))) }, { inset: 0, eps }), false)
      }
    }
  })
  for (const [G, end] of Object.entries(ends)) defs = defs.replace(new RegExp(`(<linearGradient id="${G}"[^>]*><stop offset="0" stop-color="#[0-9A-Fa-f]{6}"/><stop offset="1" stop-color=")#[0-9A-Fa-f]{6}`), `$1${end}`)
  // Write back, group by group, in the order and with the ids they had.
  const body = items.map((it) => it.type === 'open' ? it.text : it.type === 'close' ? `${it.group?.extra ?? ''}</g>` : it.type === 'text' ? it.text : it.drop ? '' : it.before.join('') + writeEl(it.tag, it.a) + it.after.join('')).join('')
  return `${head}<defs>${defs}</defs>${body}</svg>\n`
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.argv[2], work = process.argv[3] ?? join(out, '..', 'plain')
  mkdirSync(out, { recursive: true })
  for (const s of SOURCES) {
    const dir = join(work, s.replace(/\W+/g, '-'))
    mkdirSync(dir, { recursive: true })
    execFileSync('node', [join(SCRIPTS, s), dir], { stdio: ['ignore', 'ignore', 'inherit'] })
  }
  const found = {}
  for (const s of SOURCES) for (const name of CELL_TYPES) { const p = join(work, s.replace(/\W+/g, '-'), `${name}.svg`); try { found[name] = readFileSync(p, 'utf8') } catch {} }
  for (const name of CELL_TYPES) {
    if (name === 'Red blood cell') { writeFileSync(join(out, `${name}.svg`), readFileSync(join(ICONS, 'Red blood cell.svg'), 'utf8').replace(/<title>[^<]*<\/title>/, `<title>${name}</title>`)); continue }
    if (!found[name]) { console.log(`not drawn by any script: ${name}`); continue }
    writeFileSync(join(out, `${name}.svg`), glossy(found[name]))
  }
  console.log(`written to ${out}`)
}
