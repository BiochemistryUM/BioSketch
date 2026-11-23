// The gloss of cells (STYLE.md) on mitochondria that were not drawn by ../mitokit.mjs with `setMitoGloss(true)`: the
// owner's Mitochondrion.svg (exported from Affinity), the damaged mitochondrion and the network of ../mito-dynamics.mjs,
// and copies of these placed in other icons. Works on SVG text: every shape filled with a gradient that runs from the
// mitochondrion's base to its shadow (MITO of ../mitokit.mjs) is an outer membrane; it gets the gloss of `mitoGloss`
// (shade and shadow over it, the lit band and highlight in its layer `highlight`, which keeps its id), kept clear of
// the matrix drawn after it, and the old highlight goes. The matrix, cristae and inner membrane stay flat.
// Group transforms (Affinity's matrices, iconkit's placements) are followed, so the light stays at the top left of
// the page. `rgb()` colours become #RRGGBB and `stop-opacity:1` goes, so the file keeps to STYLE.md.
//
// Usage: node cells/glossy-mito.mjs <out>     writes the mitochondrial family glossy, outlines at 60 %
//   import { glossyMito } from './glossy-mito.mjs'; glossyMito(text, { scale: 0.6 })
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { f, pathOf } from '../shapes.mjs'
import { pathPoints } from '../parts/surfaces.mjs'
import { MITO, mitoGloss, mitoTones } from '../mitokit.mjs'

const HERE = dirname(fileURLToPath(import.meta.url)), SCRIPTS = join(HERE, '..'), ICONS = join(SCRIPTS, '..')
const hex2 = (n) => Math.round(+n).toString(16).padStart(2, '0').toUpperCase()
const rgbHex = (text) => text.replace(/rgb\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/g, (_, r, g, b) => `#${hex2(r)}${hex2(g)}${hex2(b)}`)
const attrsOf = (s) => Object.fromEntries([...s.matchAll(/([\w:-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]))
/** A property of an element, from its attribute or its style. */
const prop = (a, k) => a[k] ?? (new RegExp(`(?:^|;)\\s*${k}:\\s*([^;]+)`).exec(a.style ?? '') ?? [])[1]?.trim()
const urlOf = (v) => (v && v.startsWith('url(#') ? v.slice(5, -1) : null)
const same = (a, b) => a && b && a.toUpperCase() === b.toUpperCase()

// Affine matrices [a, b, c, d, e, f] as SVG writes them.
const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]]
const inv = ([a, b, c, d, e, g]) => { const k = a * d - b * c; return [d / k, -b / k, -c / k, a / k, (c * g - d * e) / k, (b * e - a * g) / k] }
const apply = (m, [x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
function matrixOf(t) {
  let m = [1, 0, 0, 1, 0, 0]
  for (const [, op, args] of (t ?? '').matchAll(/(\w+)\(([^)]*)\)/g)) {
    const v = args.split(/[\s,]+/).filter(Boolean).map(Number)
    let n
    if (op === 'matrix') n = v
    else if (op === 'translate') n = [1, 0, 0, 1, v[0], v[1] ?? 0]
    else if (op === 'scale') n = [v[0], 0, 0, v[1] ?? v[0], 0, 0]
    else if (op === 'rotate') {
      const r = (v[0] * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r)
      n = [c, s, -s, c, 0, 0]
      if (v.length > 2) n = mul(mul([1, 0, 0, 1, v[1], v[2]], n), [1, 0, 0, 1, -v[1], -v[2]])
    } else continue
    m = mul(m, n)
  }
  return m
}
const stretch = (m) => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]))
/** Outline of a shape in its own frame, as subpaths. */
function outline(tag, a) {
  if (tag === 'path') return pathPoints(a.d)
  const N = 360
  if (tag === 'circle' || tag === 'ellipse') { const rx = +(a.rx ?? a.r), ry = +(a.ry ?? a.r); return [Array.from({ length: N }, (_, i) => [+a.cx + rx * Math.cos((2 * Math.PI * i) / N), +a.cy + ry * Math.sin((2 * Math.PI * i) / N)])] }
  return []
}
const moved = (d, m) => pathPoints(d).map((sp) => pathOf(sp.map((p) => apply(m, p))) ).join(' ')

/** Mitochondria in an SVG text made glossy; `scale` narrows every outline as setStrokeScale does (1: left as they are). */
export function glossyMito(text, { scale = 1 } = {}) {
  text = rgbHex(text).replace(/;?\s*stop-opacity:\s*1\b/g, '')
  if (scale !== 1) text = text.replace(/stroke-width="([\d.]+)"/g, (_, v) => `stroke-width="${f(v * scale)}"`).replace(/stroke-width:\s*([\d.]+)/g, (_, v) => `stroke-width:${f(v * scale)}`)
  // Gradients of an outer membrane: base to shadow of the mitochondrion.
  const outerGrads = new Set()
  for (const m of text.matchAll(/<linearGradient\b([^>]*)>(.*?)<\/linearGradient>/gs)) {
    const id = attrsOf(m[1]).id, stops = [...m[2].matchAll(/stop-color[:=]"?\s*(#[0-9A-Fa-f]{6})/g)].map((s) => s[1])
    if (stops.length === 2 && same(stops[0], MITO.base) && same(stops[1], MITO.shadow)) outerGrads.add(id)
  }
  if (!outerGrads.size) return text
  // Elements and groups, with the transform each is drawn under.
  const items = [], stack = [{ m: [1, 0, 0, 1, 0, 0], els: [] }]
  let inDefs = 0
  for (const mm of text.matchAll(/(<defs\b[^>]*>)|(<\/defs>)|(<g\b[^>]*>)|(<\/g>)|<(path|circle|ellipse|rect)\b([^>]*?)\/>|([^<]+|<[^>]*>)/gs)) {
    if (mm[1]) { inDefs++; items.push({ text: mm[1] }) }
    else if (mm[2]) { inDefs--; items.push({ text: mm[2] }) }
    else if (mm[3] && !inDefs) { const a = attrsOf(mm[3]), g = { type: 'open', text: mm[3], id: a.id, m: mul(stack.at(-1).m, matrixOf(a.transform)), els: [], extra: '' }; items.push(g); stack.push(g) }
    else if (mm[4] && !inDefs) { const g = stack.pop(); items.push({ type: 'close', group: g }) }
    else if (mm[5] && !inDefs) { const a = attrsOf(mm[6]), e = { type: 'el', tag: mm[5], src: mm[0], a, m: mul(stack.at(-1).m, matrixOf(a.transform)), group: stack.at(-1), after: '' }; items.push(e); stack.at(-1).els.push(e) }
    else items.push({ text: mm[0] })
  }
  const els = items.filter((it) => it.type === 'el'), groups = items.filter((it) => it.type === 'open')
  let glossed = 0
  for (const [i, e] of els.entries()) {
    if (!outerGrads.has(urlOf(prop(e.a, 'fill')))) continue
    // Its matrix: the next shape filled in the matrix colour. Its outline: its own stroke, or the widest in its group.
    const mx = els.slice(i + 1).find((o) => same(prop(o.a, 'fill'), MITO.matrix))
    if (!mx) continue
    const widthOf = (o) => (prop(o.a, 'stroke') && prop(o.a, 'stroke') !== 'none' ? parseFloat(prop(o.a, 'stroke-width') ?? 1) * stretch(o.m) : 0)
    const inset = Math.max(widthOf(e), ...e.group.els.map(widthOf)) / 2, grow = widthOf(mx) / 2
    const outer = outline(e.tag, e.a).map((sp) => sp.map((p) => apply(e.m, p))), matrix = outline(mx.tag, mx.a).map((sp) => sp.map((p) => apply(mx.m, p)))
    const xs = outer.flat().map((p) => p[0]), ys = outer.flat().map((p) => p[1])
    const G = mitoGloss(outer, matrix, { inset, grow, px: Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) })
    if (!G.lower) continue
    glossed++
    const back = inv(e.m)
    e.after = G.lower.replace(/d="([^"]+)"/g, (_, d) => `d="${moved(d, back)}"`)
    // The old highlight: in a layer `highlight` after the matrix (not yet taken by another mitochondrion), in the light colour.
    const HL = groups.find((g) => items.indexOf(g) > items.indexOf(mx) && /(^|-)highlight$/.test(g.id ?? '') && !g.claimed && g.els.every((o) => same(prop(o.a, 'fill'), MITO.light)))
    if (HL) {
      HL.claimed = true
      for (const o of HL.els) o.drop = true
      const hb = inv(HL.m)
      HL.extra = G.upper.replace(/d="([^"]+)"/g, (_, d) => `d="${moved(d, hb)}"`)
    }
    e.glossGrad = urlOf(prop(e.a, 'fill'))
  }
  // Their gradients end in the gloss's end tone.
  const end = mitoTones().end
  for (const id of new Set(els.filter((e) => e.glossGrad).map((e) => e.glossGrad)))
    text = text.replace(new RegExp(`(<linearGradient\\b[^>]*id="${id}"[^>]*>.*?<stop\\b[^>]*offset="1"[^>]*stop-color[:=]"?\\s*)${MITO.shadow}`, 'is'), `$1${end}`)
  if (!glossed) return text
  // Write back. The gradients may have changed in `text`, so its defs are taken from there.
  const out = items.map((it) => (it.type === 'open' ? it.text : it.type === 'close' ? `${it.group.extra ?? ''}</g>` : it.type === 'el' ? (it.drop ? '' : it.src + it.after) : it.text)).join('')
  const defsNew = [...text.matchAll(/<defs\b[^>]*>.*?<\/defs>/gs)].map((m) => m[0])
  let k = 0
  return out.replace(/<defs\b[^>]*>.*?<\/defs>/gs, () => defsNew[k++])
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.argv[2], work = join(out, '..', 'work')
  mkdirSync(out, { recursive: true })
  mkdirSync(work, { recursive: true })
  // The family as mito-dynamics.mjs draws it, with the switch on (drawMito glossy) and outlines at 60 %.
  execFileSync('node', ['--input-type=module', '-e', `
    import { setStrokeScale } from ${JSON.stringify(join(SCRIPTS, 'shapes.mjs'))}
    import { setMitoGloss } from ${JSON.stringify(join(SCRIPTS, 'mitokit.mjs'))}
    setStrokeScale(0.6); setMitoGloss(true)
    process.argv[2] = ${JSON.stringify(work)}
    await import(${JSON.stringify(join(SCRIPTS, 'mito-dynamics.mjs'))})`], { stdio: ['ignore', 'ignore', 'inherit'] })
  for (const name of ['Mitochondrial fission', 'Mitochondrial fusion', 'Damaged mitochondrion', 'Mitochondrial network']) writeFileSync(join(out, `${name}.svg`), glossyMito(readFileSync(join(work, `${name}.svg`), 'utf8')))
  // The owner's own drawing, from Affinity.
  writeFileSync(join(out, 'Mitochondrion.svg'), glossyMito(readFileSync(join(ICONS, 'Mitochondrion.svg'), 'utf8'), { scale: 0.6 }))
  console.log('written to', out)
}
