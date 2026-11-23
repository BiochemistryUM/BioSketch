// Eight icons of SiliCoDraw's "Anatomy" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts of the category
// (../parts/anatomy.mjs): the liver and the gut. Liver, Liver lobule, Fatty liver (steatosis), Liver regeneration,
// Gallbladder, Stomach, Pancreas and Intestine.
// Compositions are read by hand from the source (the last definition of each icon) in its 100 × 100 box centred on 0,0
// and scaled onto a 512 page (`page` of ../cellkit.mjs); outlines at 60 % (setStrokeScale), gloss on.
// Parts used: organ ('liver', also 'fatty' and as a ghost, 'gallbladder' with stones, 'stomach', 'pancreas',
// 'intestine'), the palettes and organW of anatomy.mjs; arrow (tissue.mjs); NUC (cellkit.mjs).
// Drawn here because no part draws it, in the look of anatomy.mjs (a section of tissue is flat): the liver lobule, a
// hexagon of hepatocyte plates and sinusoids round the central vein with a portal triad at each corner.
// Usage: node anF.mjs <folder>
import { mkdirSync } from 'node:fs'
import { NUC, cellTypes, glossOn, page, setGloss } from '../cellkit.mjs'
import { deep, toLch } from '../colour.mjs'
import { f, setStrokeScale, strokeScale } from '../shapes.mjs'
import { GALL, LIVER, VEIN, organ, organW } from '../parts/anatomy.mjs'
import { gloss, glossTones, pathPoints } from '../parts/surfaces.mjs'
import { arrow } from '../parts/tissue.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012) are left out of the hue check; one palette used by several parts is listed once.
const icon = (name, [k, cx, cy], draw) => {
  const g = page(k, [cx, cy]), { defs, body, parts } = draw(g)
  const seen = parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base) === i)
  kit.cellType(name, seen, defs, body)
}
const join = (...ps) => ({ defs: ps.map((p) => p.defs ?? '').join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts ?? []) })
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })

// ---------- drawing helpers in g's units (as anatomy.mjs's, which it does not export) ----------
const P2 = (p) => p.map(f).join(',')
const strokeD = (d, colour, w, cap = 'round', extra = '') => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"${extra}/>`
const fillD = (d, fill, s = '', w = 0) => `<path d="${d}" fill="${fill}"${s ? ` stroke="${s}" stroke-width="${f(w)}" stroke-linejoin="round"` : ''}/>`
const lin = (id, [x0, y0, x1, y1], a, b) => `<linearGradient id="${id}" x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`
const boxOf = (d) => { const p = pathPoints(d).flat(), xs = p.map((q) => q[0]), ys = p.map((q) => q[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] }
/** An open smooth curve through points of g (Catmull–Rom as cubic Béziers), as a page path. */
const curveD = (g, pts) => {
  const p = pts.map(g.P), n = p.length
  let d = `M${P2(p[0])}`
  for (let i = 0; i < n - 1; i++) {
    const a = p[Math.max(0, i - 1)], b = p[i], c = p[i + 1], e = p[Math.min(n - 1, i + 2)]
    d += `C${f(b[0] + (c[0] - a[0]) / 6)},${f(b[1] + (c[1] - a[1]) / 6)} ${f(c[0] - (e[0] - b[0]) / 6)},${f(c[1] - (e[1] - b[1]) / 6)} ${P2(c)}`
  }
  return d
}
const ellD = (g, u, v, rx, ry, rot = 0) => {
  const c = Math.cos((rot * Math.PI) / 180), s = Math.sin((rot * Math.PI) / 180), K = 0.5523
  const q = [[rx, 0], [rx, K * ry], [K * rx, ry], [0, ry], [-K * rx, ry], [-rx, K * ry], [-rx, 0], [-rx, -K * ry], [-K * rx, -ry], [0, -ry], [K * rx, -ry], [rx, -K * ry], [rx, 0]].map(([a, b]) => P2(g.P([u + a * c - b * s, v + a * s + b * c])))
  return `M${q[0]} C${q[1]} ${q[2]} ${q[3]} C${q[4]} ${q[5]} ${q[6]} C${q[7]} ${q[8]} ${q[9]} C${q[10]} ${q[11]} ${q[12]} Z`
}
/**
 * A closed body in the gloss of organs (anatomy.mjs's glossBody): the page outlines `ds` filled with a gradient from the
 * base to the gloss's end tone, the face-on tones over it (shade from 40 px, lit rim from 90 px), `inner`, then one outline.
 */
function glossBody(id, ds, pal, w, { inner = '', px, outline = true } = {}) {
  const box = boxOf(ds.join(' ')), size = px ?? Math.max(box[2] - box[0], box[3] - box[1]), T = glossTones(pal)
  const defs = lin(`${id}-gradient`, box, pal.base, glossOn() ? T.end : pal.shadow)
  let s = ds.length > 1 ? ds.map((d) => fillD(d, pal.outline, pal.outline, 2 * w)).join('') : ''
  s += ds.map((d) => fillD(d, `url(#${id}-gradient)`)).join('')
  if (glossOn() && size >= 40) {
    const G = gloss({ fills: ds.map(pathPoints) }, { inset: (w * strokeScale()) / 2 })
    s += ['shade', 'shadow', ...(size >= 90 ? ['lit', 'highlight'] : [])].map((k) => (G[k] ? `<path d="${G[k]}" fill="${T[k]}"/>` : '')).join('')
  }
  s += inner
  if (outline && ds.length === 1) s += fillD(ds[0], 'none', pal.outline, w)
  return { defs, body: s }
}
/** A flat tube along page paths: an outline round a fill, `width` its visible width in units of g. Strokes are thinned
 *  by setStrokeScale, so the width is given back here (as anatomy.mjs's `tube`). */
const tubeW = (g, width) => (width * g.k) / strokeScale()

// ---------- palettes of this batch ----------
const HEPATIC_ARTERY = deep(5) // the artery of the portal triad: red, turned from 25° to 5° to stay 41° from the liver (46°)
const GROWTH = deep(150) // arrows of regrowth: SiliCoDraw's green

// ---------- Liver: the part, with the gallbladder below ----------
icon('Liver', [4.85, 1, 0], (g) => organ(g, { kind: 'liver', x: 0, y: 0, size: 100, id: 'liver' }))

// ---------- Liver lobule: a hexagon of hepatocyte plates and sinusoids round the central vein, a portal triad at each corner ----------
icon('Liver lobule', [4.55, 0, 0], (g) => {
  const pal = LIVER, w = organW(460) * 0.8, rad = (t) => (t * Math.PI) / 180
  const V = [[0, -46], [40, -23], [40, 23], [0, 46], [-40, 23], [-40, -23]]
  const hex = `M${V.map((p) => P2(g.P(p))).join(' L')} Z`
  const edge = (t) => { const u = (((t % 60) + 60) % 60) - 30; return 39.8 / Math.cos(rad(u)) }
  // Sinusoids: twelve gently bowed channels from the portal edge to the central vein; between them the plates of
  // hepatocytes, each marked by its nucleus.
  let sn = '', nu = []
  for (let k = 0; k < 12; k++) {
    const t = k * 30 + 15, e = edge(t) - 3, c = Math.cos(rad(t)), n = Math.sin(rad(t)), m = (11 + e) / 2, bw = k % 2 ? 1.6 : -1.6
    sn += `M${P2(g.P([c * 11, n * 11]))} Q${P2(g.P([c * m - n * bw, n * m + c * bw]))} ${P2(g.P([c * e, n * e]))}`
    const t2 = k * 30, c2 = Math.cos(rad(t2)), n2 = Math.sin(rad(t2))
    ;[16, 25, 34].forEach((r) => { if (r < edge(t2) - 4) nu.push([c2 * r, n2 * r]) })
  }
  const box = boxOf(hex)
  let s = fillD(hex, `url(#lobule-gradient)`) + strokeD(sn, pal.small, w * 0.9)
  const defs = lin('lobule-gradient', box, pal.base, pal.shadow)
  s += fillD(hex, 'none', pal.outline, w)
  const nuclei = own('nuclei', fillD(nu.map(([u, v]) => ellD(g, u, v, 1.9, 1.9)).join(' '), NUC.small), [['nuclei', NUC]])
  // Central vein and the triads (portal vein, hepatic artery, bile duct), in section, flat.
  let tri = fillD(ellD(g, 0, 0, 8, 8), VEIN.base, VEIN.outline, w * 0.8) + fillD(ellD(g, 0, 0, 4.2, 4.2), VEIN.light)
  let art = '', duct = ''
  V.forEach(([x, y]) => {
    const l = Math.hypot(x, y), ix = -x / l, iy = -y / l, tx = -iy, ty = ix
    tri += fillD(ellD(g, x, y, 4.8, 4.8), VEIN.base, VEIN.outline, w * 0.7)
    art += fillD(ellD(g, x + ix * 4.5 + tx * 5.2, y + iy * 4.5 + ty * 5.2, 2.6, 2.6), HEPATIC_ARTERY.base, HEPATIC_ARTERY.outline, w * 0.55)
    duct += fillD(ellD(g, x + ix * 4.5 - tx * 5.2, y + iy * 4.5 - ty * 5.2, 2.6, 2.6), GALL.light, GALL.outline, w * 0.55)
  })
  return join(own('lobule', s, [['liver', pal]], defs), nuclei, own('veins', tri, [['veins', VEIN]]), own('hepatic-arteries', art, [['hepatic artery', HEPATIC_ARTERY]]), own('bile-ducts', duct, [['bile ducts', GALL]]))
})

// ---------- Fatty liver (steatosis): the part with lipid droplets, the gallbladder below ----------
icon('Fatty liver (steatosis)', [4.85, 1, 0], (g) => organ(g, { kind: 'liver', x: 0, y: 0, size: 100, state: 'fatty', id: 'liver' }))

// ---------- Liver regeneration: the liver after partial removal, regrowing inside the dashed outline it had ----------
icon('Liver regeneration', [4.85, 1, -0.9], (g) => {
  // The remnant is the liver at 62 % about the left lobe (SiliCoDraw shrinks it about -26, 2).
  const ghost = organ(g, { kind: 'liver', x: 0, y: 0, size: 100, ghost: true, id: 'former-liver' })
  const left = organ(g, { kind: 'liver', x: -9.9, y: 0.76, size: 62, gallbladder: false, id: 'liver' })
  const a = [[[4, -10], [34, -18]], [[-8, -23], [-5, -34]], [[-12, 12], [-5, 21]]].map((p, i) => arrow(g, { points: p, corners: true, colour: GROWTH.outline, w: 10, id: `regrowth${i + 1}` }))
  return join(ghost, left, ...a)
})

// ---------- Gallbladder: the part with its ducts and two stones ----------
icon('Gallbladder', [4.81, 0, -1.2], (g) => organ(g, { kind: 'gallbladder', x: 0, y: 0, size: 100, stones: 2, id: 'gallbladder' }))

// ---------- Stomach, Pancreas, Intestine: the parts ----------
icon('Stomach', [4.55, -4.3, -0.4], (g) => organ(g, { kind: 'stomach', x: 0, y: 0, size: 100, id: 'stomach' }))
icon('Pancreas', [4.62, -1.75, 3.8], (g) => organ(g, { kind: 'pancreas', x: 0, y: 0, size: 100, id: 'pancreas' }))
icon('Intestine', [4.85, -0.9, 0], (g) => organ(g, { kind: 'intestine', x: 0, y: 0, size: 100, id: 'intestine' }))

check()
console.log('written', OUT)
