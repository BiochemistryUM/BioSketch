// The "Molecules & genetics" icons (mg01.mjs … mg24.mjs) redrawn with the gloss of cells (STYLE.md "The gloss of
// cells"): outlines at 60 %, the face-on gloss on every round or blobby body in place of its old highlight, flat nuclei.
// Usage: node molecules/glossy-mg.mjs <out> [mg01 mg02 …] [--work <folder>]
//
// How (the mg scripts and the parts are not changed; run on its own, every mg script still writes the files it wrote):
// 1. Each mg script is run twice in a child process of this file (`--draw`), which sets the switch in the shared modules
//    before it imports the script: once as it is (A), once with `setGloss(true)` (B). The parts that know the switch (the
//    organelles of ../parts/organelles.mjs and cellkit's nucleus) draw their own gloss and flat nuclei in B; a gradient
//    whose definition differs between A and B belongs to such a part and is left alone here.
// 2. Outlines at 60 %, as `setStrokeScale(0.6)` writes them, with two differences, because `setStrokeScale` narrows
//    every stroke, which made antibodies, receptors, RNA and bonds spindly: a shape drawn as a wide line or fill over a
//    wider copy of itself in the outline colour (the union of the parts: antibody arms, receptor stalks, DNA strands)
//    keeps its own width and only the band that shows as outline is narrowed (as ../cells/glossy.mjs does); and a line
//    on its own (fill none: an RNA backbone, a bond, a lipid tail, an arrow's shaft) is the drawing itself, not an
//    outline, and keeps its width.
// 3. Every other body of B is given the gloss as SVG text, keeping shapes, colours, contents and layer ids:
//    - A body is the shapes of one group filled (or drawn as a wide line) with one two-stop linear gradient: a shape with
//      its own outline alone, the shapes without one together (a union drawn as outline copies under fills, as the
//      receptor or the antibody). Lines drawn in the gradient count as filled with their width.
//    - Glossed (`gloss` of ../parts/surfaces.mjs, the tones of `glossTones`) when it is 40 px across or more on the page
//      and at least 28 px thick (receptor stalks and the arms of small antibodies stay flat); below 90 px the shade side only, as the parts do. Its gradient ends in the gloss's end tone.
//    - Left flat (gradient kept): what `FLAT` names (DNA and RNA features, helices and sheets, chains and beads, small
//      molecules and formulas, lipid heads, chromosomes, nucleosomes, fluorescent barrels, objects, charts, organs),
//      and anything thinner or smaller than the limits above.
//    - Every old highlight (a thin pale ellipse) goes, on glossed and flat parts alike.
//    - Nuclei and nucleoli drawn with a gradient (cell parts of ../parts/tissue.mjs) become one flat fill.
//    - Icons placed whole (`placeCellType`: already glossy) are left as they are.
// Groups may be turned, moved, scaled or mirrored: each body is taken onto the page, glossed there (the light stays at
// the top left) and its tones taken back into the group's frame.
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))

// ---------- what stays flat ----------
/** Gradient ids (without "-gradient") of parts that are not round bodies. */
export const FLAT = new RegExp([
  // membranes' lipid rows
  'membrane-head', 'leaflet-head', 'monolayer-head', 'cell-head',
  // small molecules, atoms, formulas, ligands, sugars
  '(^|-)ring(-|$)', 'oxygen', 'nitrogen', 'iodine', 'carbon', 'sulfur', 'sterol', 'glucose', 'glucosamine', '(^|-)ATP$', 'ADP', '(^|-)AMP$',
  '(^|-)NADH?(-\\d)?$', 'nicotinamide', 'ribose', '(^|-)NMN$', '(^|-)NR$', '(^|-)NAM$', 'cGAMP', 'cytosine', 'uracil', 'hydroxymethyl', 'steroid',
  '^head$', 'doxycycline', '(^|-)drug', 'warhead', 'proton', 'radical', '(^|-)ROS$', 'acetyl', 'AGE', 'modulator', '(^|-)substrate', 'ligand',
  'agonist', 'antagonist', '(^|-)atom', '^(Sia|Man|Gal|GlcNAc|Fuc)$', 'LPS-\\d+-(core|O-antigen)', 'spermidine', 'TMAO', 'fluorophore', 'drop$',
  // chains, beads, threads
  'chromatin$', 'amino-acid', '(^|-)PAR$', 'repeat', 'ORF1p', 'misfolded', 'aggregate', 'Lewy-body-core', 'unfolded', 'disordered', 'nascent-chain',
  'adiponectin', 'PF4', 'proteasome-(alpha|beta)', 'chaperonin-(near|far)', '(^|-)wrong$',
  // DNA and RNA features, reads and charts
  'gene', 'promoter', 'operator', 'exon', 'UAS', 'reporter', 'loxP', 'transposon', 'telomere', '(^|-)mutation', 'coverage', 'peak', 'reads', 'score',
  'unchanged', '^up-', '^down-', 'reference', 'heterozygous', 'alternative', 'father', 'mother', 'son', 'daughter', 'young-card', 'old-card',
  '^(blue|orange|purple|green|red|yellow)$',
  // chromosomes, helices, sheets, fibrils, nucleosomes, barrels (their own depth)
  'chromosome', 'chromatid', 'active-X', 'Barr-body', 'helix', 'sheet', 'fibril', 'histones', 'nucleosome', '(^|-)GFP$', 'donor', 'acceptor', 'capsid$',
  // objects, organs, symbols
  'scissors', 'star', 'lightning', '(^|-)gel$', 'chip', 'glass', '(^|-)box$', 'balance', 'capsule', 'bottleneck', 'brain', 'vessel', 'liver', 'leaf$',
  'red-blood-cell', 'membrane-receptor',
].join('|'))
/** Gradients that FLAT would name but are bodies here (file name → ids). */
const BODY_AFTER_ALL = { 'Deubiquitinase': ['substrate-gradient'], 'Lentiviral vector': ['capsid-gradient'] }
const MIN_PX = 40, LIT_PX = 90, MIN_THICK = 28, SCALE = 0.6

// ---------- SVG text helpers ----------
const attrsOf = (s) => Object.fromEntries([...s.matchAll(/([\w:-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]))
const writeEl = (tag, a) => `<${tag} ${Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(' ')}/>`
const urlOf = (v) => (v && v.startsWith('url(#') ? v.slice(5, -1) : null)
const r1 = (n) => Math.round(n * 10) / 10

// Affine matrices [a, b, c, d, e, f] (x' = a x + c y + e, y' = b x + d y + f), as SVG.
const I = [1, 0, 0, 1, 0, 0]
const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]]
const inv = (m) => { const det = m[0] * m[3] - m[1] * m[2]; return [m[3] / det, -m[1] / det, -m[2] / det, m[0] / det, (m[2] * m[5] - m[3] * m[4]) / det, (m[1] * m[4] - m[0] * m[5]) / det] }
const apply = (m, [x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
function parseTransform(t) {
  let m = I
  for (const [, op, args] of (t ?? '').matchAll(/(\w+)\(([^)]*)\)/g)) {
    const v = args.split(/[\s,]+/).filter(Boolean).map(Number)
    if (op === 'translate') m = mul(m, [1, 0, 0, 1, v[0], v[1] ?? 0])
    else if (op === 'scale') m = mul(m, [v[0], 0, 0, v[1] ?? v[0], 0, 0])
    else if (op === 'rotate') { const a = (v[0] * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), [cx, cy] = [v[1] ?? 0, v[2] ?? 0]; m = mul(m, mul([1, 0, 0, 1, cx, cy], mul([c, s, -s, c, 0, 0], [1, 0, 0, 1, -cx, -cy]))) }
    else if (op === 'matrix') m = mul(m, v)
    else throw new Error(`transform ${op}`)
  }
  return m
}
/** placeIcon's transform (../iconkit.mjs): an icon placed whole. */
const PLACED = /^translate\([^)]*\) rotate\([^)]*\) scale\([^)]*\) translate\([^)]*\)$/

/** Outline of a shape element in its own frame (its own transform included), as subpaths of points. */
function geometry(tag, a, pathPoints) {
  const N = 180
  let subs
  if (tag === 'path') subs = pathPoints(a.d)
  else if (tag === 'circle' || tag === 'ellipse') { const rx = +(a.rx ?? a.r), ry = +(a.ry ?? a.r); subs = [Array.from({ length: N }, (_, i) => [+a.cx + rx * Math.cos((2 * Math.PI * i) / N), +a.cy + ry * Math.sin((2 * Math.PI * i) / N)])] }
  else if (tag === 'rect') {
    const x = +(a.x ?? 0), y = +(a.y ?? 0), w = +a.width, h = +a.height, r = Math.min(+(a.rx ?? a.ry ?? 0), w / 2, h / 2), pts = []
    const corner = (cx, cy, a0) => { for (let i = 0; i <= 8; i++) { const t = a0 + (Math.PI / 2) * (i / 8); pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]) } }
    corner(x + w - r, y + r, -Math.PI / 2); corner(x + w - r, y + h - r, 0); corner(x + r, y + h - r, Math.PI / 2); corner(x + r, y + r, Math.PI)
    subs = [pts]
  } else return []
  if (a.transform) { const m = parseTransform(a.transform); subs = subs.map((sp) => sp.map((p) => apply(m, p))) }
  return subs
}
/** A line drawn `width` wide with round (or butt) ends, as closed outlines, one per segment (filled together). */
function strokeOutlines(subs, width) {
  const r = width / 2, out = []
  for (const sp of subs) for (let k = 0; k < Math.max(1, sp.length - 1); k++) {
    const a = sp[k], b = sp[Math.min(k + 1, sp.length - 1)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy)
    if (L < 1e-6) { out.push([Array.from({ length: 24 }, (_, i) => [a[0] + r * Math.cos((i * Math.PI) / 12), a[1] + r * Math.sin((i * Math.PI) / 12)])]); continue }
    const ang = Math.atan2(dy, dx), pts = []
    for (let i = 0; i <= 12; i++) { const t = ang - Math.PI / 2 - (Math.PI * i) / 12; pts.push([a[0] + r * Math.cos(t), a[1] + r * Math.sin(t)]) }
    for (let i = 0; i <= 12; i++) { const t = ang + Math.PI / 2 - (Math.PI * i) / 12; pts.push([b[0] + r * Math.cos(t), b[1] + r * Math.sin(t)]) }
    out.push([pts])
  }
  return out
}
/** Twice the largest distance from the edge inside the union of the outlines (px): how thick a body is. */
function thickness(fills) {
  const all = fills.flat(2), res = 1.5
  const x0 = Math.min(...all.map((p) => p[0])) - 2, y0 = Math.min(...all.map((p) => p[1])) - 2
  const nx = Math.ceil((Math.max(...all.map((p) => p[0])) + 2 - x0) / res), ny = Math.ceil((Math.max(...all.map((p) => p[1])) + 2 - y0) / res)
  const D = new Float64Array(nx * ny)
  for (const subs of fills) {
    const edges = subs.flatMap((s) => s.map((p, k) => [p, s[(k + 1) % s.length]])).filter(([a, b]) => a[1] !== b[1])
    for (let j = 0; j < ny; j++) {
      const y = y0 + j * res, xs = []
      for (const [a, b] of edges) if ((a[1] <= y) !== (b[1] <= y)) xs.push([a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]), a[1] < b[1] ? 1 : -1])
      xs.sort((p, q) => p[0] - q[0])
      let w = 0
      for (let k = 0; k < xs.length - 1; k++) { w += xs[k][1]; if (w !== 0) for (let i = Math.max(0, Math.ceil((xs[k][0] - x0) / res)); i <= Math.min(nx - 1, Math.floor((xs[k + 1][0] - x0) / res)); i++) D[j * nx + i] = 1e9 }
    }
  }
  // Chamfer distance (3-4), two passes.
  const at = (i, j) => (i < 0 || j < 0 || i >= nx || j >= ny ? 0 : D[j * nx + i])
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if (D[j * nx + i]) D[j * nx + i] = Math.min(D[j * nx + i], at(i - 1, j) + 3, at(i, j - 1) + 3, at(i - 1, j - 1) + 4, at(i + 1, j - 1) + 4)
  let top = 0
  for (let j = ny - 1; j >= 0; j--) for (let i = nx - 1; i >= 0; i--) if (D[j * nx + i]) { D[j * nx + i] = Math.min(D[j * nx + i], at(i + 1, j) + 3, at(i, j + 1) + 3, at(i + 1, j + 1) + 4, at(i - 1, j + 1) + 4); top = Math.max(top, D[j * nx + i]) }
  return (2 * top * res) / 3
}
/**
 * A tone path of `gloss` (subpaths "M x,y L x,y …", traced on a pixel grid, so stepped) taken back into its group's frame,
 * smoothed over five points and simplified, so that it costs a third of the bytes; written without the L of each point.
 */
function tidy(d, back, simplify) {
  const out = []
  for (const sp of d.split(/(?=M)/)) {
    const raw = [...sp.matchAll(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g)].map((m) => [+m[1], +m[2]])
    // Specks (a pixel or two between shapes drawn together) are left out.
    if (raw.length < 4 || Math.abs(raw.reduce((s, p, i) => { const q = raw[(i + 1) % raw.length]; return s + p[0] * q[1] - q[0] * p[1] }, 0)) / 2 < 10) continue
    // Long straight runs are cut into steps of 2 px first, so that smoothing only rounds the steps of the grid.
    const pts = [raw[0]]
    for (let i = 1; i < raw.length; i++) { const a = raw[i - 1], b = raw[i], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2); for (let k = 1; k <= n; k++) pts.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]) }
    const sm = pts.map((p, i) => (i < 2 || i > pts.length - 3 ? p : [0, 1].map((j) => (pts[i - 2][j] + pts[i - 1][j] + p[j] + pts[i + 1][j] + pts[i + 2][j]) / 5)))
    const s = simplify(sm, 0.45).map((p) => apply(back, p))
    if (s.length >= 3) out.push(`M${s.map(([x, y]) => `${r1(x)},${r1(y)}`).join(' ')}`) // after M further pairs are lines
  }
  return out.join(' ')
}
/** A path with every L that follows an M or an L left out (SVG reads further pairs after M or L as lines). */
const implicitL = (d) => { let prev = ''; return d.replace(/\s*([A-Za-z])\s*/g, (m, c, at) => { const drop = c === 'L' && (prev === 'M' || prev === 'L') && at > 0; prev = c === 'L' && drop ? prev : c; return drop ? ' ' : m }) }
const extent = (fills) => { const all = fills.flat(2), xs = all.map((p) => p[0]), ys = all.map((p) => p[1]); return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) }

// ---------- one icon ----------
/**
 * One mg icon (B text, with the gradient definitions of A to tell which bodies the parts glossed themselves) turned
 * glossy. Returns { text, notes }.
 */
export async function glossyMg(text, aText, name) {
  const { gloss, glossTones, pathPoints } = await import('../parts/surfaces.mjs')
  const { deep, rich, soft, toHex, toLch } = await import('../colour.mjs')
  const { NUC } = await import('../cellkit.mjs')
  const { simplify } = await import('../shapes.mjs')
  const notes = []
  const head = text.slice(0, text.indexOf('<defs>'))
  let defs = text.slice(text.indexOf('<defs>') + 6, text.indexOf('</defs>'))
  const bodyText = text.slice(text.indexOf('</defs>') + 7, text.lastIndexOf('</svg>'))
  const gradDefs = (t) => Object.fromEntries([...t.matchAll(/<(linear|radial)Gradient id="([^"]+)"[^>]*>.*?<\/\1Gradient>/g)].map((m) => [m[2], m[0]]))
  const defsB = gradDefs(defs), defsA = gradDefs(aText.slice(aText.indexOf('<defs>'), aText.indexOf('</defs>')))
  const grads = {}
  for (const [id, d] of Object.entries(defsB)) grads[id] = { kind: d.startsWith('<linear') ? 'linear' : 'radial', stops: [...d.matchAll(/stop-color="(#[0-9A-Fa-f]{6})"/g)].map((s) => s[1]), byParts: defsA[id] !== d }
  // Gradients of A that B no longer has (the parts' nuclei, made flat) count as the parts' own too.
  const isNuc = (id) => grads[id] && ((grads[id].stops[0] === NUC.base && grads[id].stops[1] === NUC.shadow) || /nucleol/.test(id))
  const bare = (id) => id.replace(/-gradient$/, '')
  const forced = (BODY_AFTER_ALL[name] ?? []).includes.bind(BODY_AFTER_ALL[name] ?? [])
  const isBody = (id) => grads[id] && grads[id].kind === 'linear' && grads[id].stops.length === 2 && !grads[id].byParts && !isNuc(id) && (forced(id) || !FLAT.test(bare(id)))
  // Groups and their elements, with the transform of every group (from the page into the group).
  const items = [], groups = [], stack = []
  for (const m of bodyText.matchAll(/(<g\b[^>]*>)|(<\/g>)|<(path|circle|ellipse|rect)\b(.*?)\/>|([^<]+|<[^>]*>)/g)) {
    if (m[1]) {
      const a = attrsOf(m[1]), up = stack.at(-1)
      const g = { type: 'open', text: m[1], id: a.id, els: [], M: mul(up ? up.M : I, parseTransform(a.transform)), placed: (up && up.placed) || PLACED.test(a.transform ?? '') }
      items.push(g); groups.push(g); stack.push(g)
    } else if (m[2]) items.push({ type: 'close', group: stack.pop() })
    else if (m[3]) { const e = { type: 'el', tag: m[3], a: attrsOf(m[4]), after: [], group: stack.at(-1) }; items.push(e); stack.at(-1)?.els.push(e) }
    else items.push({ type: 'text', text: m[5] })
  }
  const all = items.filter((it) => it.type === 'el')
  const live = (e) => !e.group?.placed
  // Outlines at 60 %: a stroke under a later copy of the same shape keeps that copy's width. (Placed icons too: placeIcon
  // wrote their outlines for a page at full width.)
  const key = (e) => e.tag + JSON.stringify(Object.entries(e.a).filter(([k]) => !/^(fill|stroke|stroke-width|stroke-linecap|stroke-linejoin)$/.test(k)))
  for (let i = 0; i < all.length; i++) {
    const e = all[i]
    if (!e.a['stroke-width'] || !e.a.stroke || e.a.stroke === 'none' || e.keep || urlOf(e.a.stroke)) continue
    const s = +e.a['stroke-width'], k = key(e), partner = all.slice(i + 1, i + 400).find((o) => key(o) === k && o.group === e.group)
    const s2 = partner ? (partner.a.stroke && partner.a.stroke !== 'none' ? +partner.a['stroke-width'] : 0) : 0
    if (partner && s > s2) partner.keep = true
    // A line on its own (no fill, not drawn round a shape) is the drawing itself, not an outline: it keeps its width.
    const line = e.a.fill === 'none' && !partner && !all.slice(Math.max(0, i - 400), i).some((o) => key(o) === k && o.group === e.group && o.a.fill && o.a.fill !== 'none')
    if (line) continue
    e.a['stroke-width'] = String(r1(partner && s > s2 ? s2 + (s - s2) * SCALE : s * SCALE))
  }
  for (const e of all) if (e.a.style && /stroke-width/.test(e.a.style)) e.a.style = e.a.style.replace(/stroke-width:\s*([\d.]+)/g, (_, v) => `stroke-width:${r1(v * SCALE)}`)
  // Old highlights: thin pale ellipses drawn by `highlight` (always with a rotate), no outline.
  const isHighlight = (e) => e.tag === 'ellipse' && /rotate\(/.test(e.a.transform ?? '') && !(e.a.stroke && e.a.stroke !== 'none') && /^#[0-9A-F]{6}$/i.test(e.a.fill ?? '') &&
    toLch(e.a.fill).l >= 0.9 && Math.max(+e.a.rx, +e.a.ry) >= 1.8 * Math.min(+e.a.rx, +e.a.ry)
  let dropped = 0
  for (const e of all) if (live(e) && isHighlight(e)) { e.drop = true; dropped++ }
  // Nuclei: flat.
  for (const e of all) if (live(e)) for (const at of ['fill', 'stroke']) { const G = urlOf(e.a[at]); if (G && isNuc(G) && !grads[G].byParts) e.a[at] = grads[G].stops[0] }
  for (const id of Object.keys(grads)) if (isNuc(id) && !grads[id].byParts && !all.some((e) => urlOf(e.a.fill) === id || urlOf(e.a.stroke) === id)) defs = defs.replace(defsB[id], '')
  // Bodies.
  const lightOf = (base, hint) => {
    if (hint) return hint
    const h = toLch(base).h
    for (const p of [soft(h), rich(h), deep(h)]) if (p.base.toUpperCase() === base.toUpperCase()) return p.light
    const B = toLch(base)
    return toHex({ l: Math.min(0.985, B.l + 0.055), c: B.c * 0.3, h: B.h })
  }
  const ends = {}, glossed = [], flatBig = []
  for (const g of groups) {
    if (g.placed) continue
    const used = [...new Set(g.els.flatMap((e) => [urlOf(e.a.fill), urlOf(e.a.stroke)]).filter(Boolean))]
    for (const G of used) {
      const wide = (e) => urlOf(e.a.stroke) === G && (!e.a.fill || e.a.fill === 'none')
      if (!isBody(G)) {
        if (grads[G] && !grads[G].byParts && !isNuc(G)) { const els = g.els.filter((e) => urlOf(e.a.fill) === G || wide(e)); const fl = els.flatMap((e) => (wide(e) ? strokeOutlines(geometry(e.tag, e.a, pathPoints), +e.a['stroke-width']) : [geometry(e.tag, e.a, pathPoints)])).map((s) => s.map((sp) => sp.map((p) => apply(g.M, p)))); if (fl.length && extent(fl) >= LIT_PX) flatBig.push(bare(G)) }
        continue
      }
      const [base, shadow] = grads[G].stops
      const hint = g.els.find((e) => e.drop && isHighlight(e))?.a.fill
      const T = glossTones({ base, shadow, light: lightOf(base, hint) })
      const scale = Math.sqrt(Math.abs(g.M[0] * g.M[3] - g.M[1] * g.M[2]))
      const toPage = (subs) => subs.map((sp) => sp.map((p) => apply(g.M, p)))
      const back = inv(g.M)
      // Bodies: each shape with its own outline alone; the shapes and wide lines without one together.
      const own = g.els.filter((e) => urlOf(e.a.fill) === G && e.a.stroke && e.a.stroke !== 'none' && !urlOf(e.a.stroke))
      const rest = g.els.filter((e) => (urlOf(e.a.fill) === G && !(e.a.stroke && e.a.stroke !== 'none')) || wide(e))
      const bodies = own.map((e) => ({ els: [e], fills: [toPage(geometry(e.tag, e.a, pathPoints))], inset: (+e.a['stroke-width'] * scale) / 2 }))
      if (rest.length) bodies.push({ els: rest, fills: rest.flatMap((e) => (wide(e) ? strokeOutlines(geometry(e.tag, e.a, pathPoints), +e.a['stroke-width']) : [geometry(e.tag, e.a, pathPoints)]).map(toPage)), inset: 0 })
      for (const b of bodies) {
        const px = extent(b.fills), th = thickness(b.fills)
        if (px < MIN_PX || th < MIN_THICK) continue
        const Gl = gloss({ fills: b.fills }, { inset: b.inset })
        const keys = ['shade', 'shadow', ...(px >= LIT_PX ? ['lit', 'highlight'] : [])]
        const tones = keys.map((k) => { const d = Gl[k] && tidy(Gl[k], back, simplify); return d ? `<path d="${d}" fill="${T[k]}"/>` : '' }).join('')
        if (!tones) continue
        const last = b.els.reduce((p, q) => (g.els.indexOf(q) > g.els.indexOf(p) ? q : p))
        last.after.push(tones)
        ends[G] = T.end
        glossed.push(`${bare(G)} ${Math.round(px)}${px < LIT_PX ? ' (shade)' : ''}`)
      }
    }
  }
  for (const [G, end] of Object.entries(ends)) defs = defs.replace(new RegExp(`(<linearGradient id="${G}"[^>]*><stop offset="0" stop-color="#[0-9A-Fa-f]{6}"/><stop offset="1" stop-color=")#[0-9A-Fa-f]{6}`), `$1${end}`)
  const byParts = Object.keys(grads).filter((id) => grads[id].byParts).map(bare)
  const body = items.map((it) => (it.type === 'open' ? it.text : it.type === 'close' ? '</g>' : it.type === 'text' ? it.text : it.drop ? '' : writeEl(it.tag, it.a) + it.after.join(''))).join('')
  notes.push(`glossed: ${glossed.join(', ') || '-'}`)
  if (byParts.length) notes.push(`by the parts: ${[...new Set(byParts)].join(', ')}`)
  if (flatBig.length) notes.push(`flat (90 px or more): ${[...new Set(flatBig)].join(', ')}`)
  notes.push(`highlights removed: ${dropped}`)
  if (groups.some((g) => g.placed)) notes.push(`placed whole: ${groups.filter((g) => PLACED.test(attrsOf(g.text).transform ?? "")).map((g) => g.id).filter((id, i, a) => a.indexOf(id) === i).join(', ')}`)
  let out = `${head}<defs>${defs}</defs>${body}</svg>\n`
  // Over 40 kB: every L that follows an M or an L is left out (the same path, fewer bytes).
  if (out.length > 40000) { out = out.replace(/ d="([^"]*)"/g, (_, d) => ` d="${implicitL(d)}"`); notes.push('L left out where implicit') }
  return { text: out, notes }
}

// ---------- main ----------
async function main() {
  const args = process.argv.slice(2), wi = args.indexOf('--work')
  const out = args[0], work = wi >= 0 ? args[wi + 1] : join(out, '..', 'work')
  const want = args.slice(1).filter((a, i) => !a.startsWith('--') && args[i] !== '--work')
  const scripts = readdirSync(HERE).filter((n) => /^mg\d+\.mjs$/.test(n)).sort().filter((n) => !want.length || want.includes(n.slice(0, -4)))
  mkdirSync(out, { recursive: true })
  const log = []
  for (const s of scripts) {
    const b = s.slice(0, -4), dirs = { plain: join(work, b, 'a'), gloss: join(work, b, 'b') }
    for (const [mode, dir] of Object.entries(dirs)) {
      const said = execFileSync('node', [fileURLToPath(import.meta.url), '--draw', join(HERE, s), dir, mode], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })
      if (mode === 'gloss') for (const l of said.split('\n')) if (l && !l.startsWith('written')) log.push(`${b}: check: ${l}`)
    }
    for (const fn of readdirSync(dirs.gloss).filter((n) => n.endsWith('.svg')).sort()) {
      const name = fn.slice(0, -4)
      const { text, notes } = await glossyMg(readFileSync(join(dirs.gloss, fn), 'utf8'), readFileSync(join(dirs.plain, fn), 'utf8'), name)
      writeFileSync(join(out, fn), text)
      log.push(`${b}/${name} (${text.length} B): ${notes.join('; ')}`)
    }
    console.log(`${b} done`)
  }
  writeFileSync(join(out, '..', 'glossy-mg.log'), log.join('\n') + '\n')
  console.log(`written to ${out}`)
}

// ---------- child: draw one script with the switches on ----------
if (process.argv[2] === '--draw') {
  const [, , , script, out, mode] = process.argv
  const { setGloss } = await import('../cellkit.mjs')
  setGloss(mode === 'gloss')
  mkdirSync(out, { recursive: true })
  process.argv = [process.argv[0], script, out]
  await import(pathToFileURL(script).href)
} else if (import.meta.url === pathToFileURL(process.argv[1]).href) await main()
