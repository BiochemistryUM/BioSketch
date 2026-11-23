// Eight icons of SiliCoDraw's "Anatomy" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts of the category
// (../parts/anatomy.mjs): the colon and the urinary and male reproductive organs. Colon, Kidney, Nephron, Bladder,
// Urinary incontinence, Prostate, Benign prostatic hyperplasia and Testis.
// Compositions are read by hand from the source (the last definition of each icon) in its 100 × 100 box centred on 0,0
// and scaled onto a 512 page (`page` of ../cellkit.mjs); outlines at 60 % (setStrokeScale), gloss on.
// Parts used: organ ('colon', 'kidney' with its vessels, 'bladder' with urine, 'prostate' healthy and enlarged), the
// palettes and organW of anatomy.mjs (KIDNEY, URINE, ARTERY, BLADDER, organPal).
// Drawn here because no part draws them, in the look of anatomy.mjs (closed bodies glossed as `organ` does, tubes flat):
// the nephron (glomerulus in Bowman's capsule, the convoluted tubules, the loop of Henle and the collecting duct), drops
// of urine with the sphincter for incontinence, and the testis with its epididymis, vas deferens and artery.
// Usage: node anG.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, glossOn, page, setGloss } from '../cellkit.mjs'
import { toLch } from '../colour.mjs'
import { f, setStrokeScale, strokeScale } from '../shapes.mjs'
import { ARTERY, BLADDER, KIDNEY, URINE, organ, organPal, organW } from '../parts/anatomy.mjs'
import { gloss, glossTones, pathPoints } from '../parts/surfaces.mjs'
import { INK } from '../parts/lab.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012: ink) are left out of the hue check; one palette used by several parts is listed once.
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
/** Flat tubes along page paths (one outline round them all): every outline first, then every fill. `items` [d, width in units of g]. */
const tubes = (g, items, pal, w, cap = 'round') => items.map(([d, wd]) => strokeD(d, pal.outline, tubeW(g, wd) + 2 * w, cap)).join('') + items.map(([d, wd]) => strokeD(d, pal.base, tubeW(g, wd), cap)).join('')
/** A drop (point up) at x, y of radius r, as a page path. */
const dropD = (g, x, y, r) => g.D(`M${x},${y - r * 1.6}C${x + r * 0.4},${y - r * 0.7} ${x + r},${y - r * 0.2} ${x + r},${y + r * 0.4}C${x + r},${y + r * 0.95} ${x + r * 0.55},${y + r * 1.4} ${x},${y + r * 1.4}C${x - r * 0.55},${y + r * 1.4} ${x - r},${y + r * 0.95} ${x - r},${y + r * 0.4}C${x - r},${y - r * 0.2} ${x - r * 0.4},${y - r * 0.7} ${x},${y - r * 1.6}Z`)

// ---------- palettes of this batch ----------
const TESTIS = organPal(345, 1.1) // pale pink, 40° from the testicular artery (25°)
const EPIDIDYMIS = organPal(295, 1.3) // the epididymis and vas deferens: mauve, 50° from the testis

// ---------- Colon: the part ----------
icon('Colon', [5.0, 1, 3], (g) => organ(g, { kind: 'colon', x: 0, y: 0, size: 100, id: 'colon' }))

// ---------- Kidney: the part in section, with renal artery, vein and ureter ----------
icon('Kidney', [4.45, 14.6, 0.7], (g) => organ(g, { kind: 'kidney', x: 0, y: 0, size: 100, vessels: true, id: 'kidney' }))

// ---------- Nephron: glomerulus in Bowman's capsule, proximal tubule, loop of Henle, distal tubule, collecting duct ----------
icon('Nephron', [4.7, -3.5, -1], (g) => {
  const w = organW(460) * 0.7
  const cd = [[g.D('M40,-46L40,46'), 8]]
  const tub = [[g.D('M-18,-20C-10,-14 -4,-22 -6,-30C-8,-38 4,-42 8,-34C11,-28 4,-24 2,-18C0,-12 -2,-10 -2,-4'), 6.5], [g.D('M-2,-4L-2,34C-2,41 10,41 10,34'), 3.5], [g.D('M10,34L10,-4'), 5], [g.D('M10,-4C10,-12 16,-16 20,-12C24,-8 28,-12 26,-18C24,-24 30,-28 34,-24C36,-22 37,-20 40,-20'), 5.5]]
  const art = [[g.D('M-48,-47C-46,-43 -43,-40 -39,-35'), 5], [g.D('M-34,-37C-34,-41 -35,-45 -36,-48'), 3.5]]
  const duct = own('collecting-duct', tubes(g, cd, URINE, w, 'butt'), [['collecting duct', URINE]])
  const tubule = own('tubule', tubes(g, tub, KIDNEY, w), [['tubule', KIDNEY]])
  const arterioles = own('arterioles', tubes(g, art, ARTERY, w * 0.85), [['arterioles', ARTERY]])
  // Bowman's capsule round the glomerulus, a tuft of capillary loops.
  const caps = own('bowman-capsule', fillD(ellD(g, -30, -25, 14, 14), KIDNEY.light, KIDNEY.outline, w), [['tubule', KIDNEY]])
  const tuft = fillD(g.smooth([[-38, -31], [-32, -35], [-24, -33], [-20, -26], [-22, -18], [-30, -15], [-37, -19], [-40, -25]]), ARTERY.light, ARTERY.small, w * 0.5)
  const loops = strokeD(g.D('M-37,-28C-35,-33 -30,-33 -29,-28C-28,-23 -23,-23 -21,-28M-37,-21C-35,-26 -30,-26 -29,-21C-28,-16 -23,-16 -21,-21M-31,-31C-28,-27 -31,-22 -33,-19'), ARTERY.outline, w * 0.6)
  return join(tubule, duct, arterioles, caps, own('glomerulus', tuft + loops, [['arterioles', ARTERY]]))
})

// ---------- Bladder: the part, part full of urine, with ureters and urethra ----------
icon('Bladder', [4.48, 0, 0], (g) => organ(g, { kind: 'bladder', x: 0, y: 0, size: 100, urine: 0.6, id: 'bladder' }))

// ---------- Urinary incontinence: the full bladder with a weak sphincter, urine dripping, the urge as zigzags ----------
icon('Urinary incontinence', [4.78, 0, -2], (g) => {
  const w = organW(460) * 0.7
  const bl = organ(g, { kind: 'bladder', x: 0, y: -9, size: 80, urine: 0.75, id: 'bladder' })
  const sph = own('sphincter', [[-8.2, 22], [2.6, 22]].map(([x, y]) => { const [a, b] = g.P([x, y]), W = 5.6 * g.k, H = 4.6 * g.k, R = 1.8 * g.k; return fillD(`M${f(a + R)},${f(b)} H${f(a + W - R)} Q${f(a + W)},${f(b)} ${f(a + W)},${f(b + R)} V${f(b + H - R)} Q${f(a + W)},${f(b + H)} ${f(a + W - R)},${f(b + H)} H${f(a + R)} Q${f(a)},${f(b + H)} ${f(a)},${f(b + H - R)} V${f(b + R)} Q${f(a)},${f(b)} ${f(a + R)},${f(b)} Z`, BLADDER.shadow, BLADDER.outline, w * 0.6) }).join(''), [['bladder', BLADDER]])
  const ds = [[0, 37, 3.4], [-8.5, 41.5, 2.4], [8.5, 43, 2]].map(([x, y, r], i) => { const b = glossBody(`drop${i + 1}`, [dropD(g, x, y, r)], URINE, w * 0.55); return { defs: b.defs, body: b.body } })
  const drops = own('drops', ds.map((d) => d.body).join(''), [['urine', URINE]], ds.map((d) => d.defs).join(''))
  const zig = own('urge', strokeD(g.D('M-44,-17L-40,-13.5L-44,-10L-40,-6.5M44,-17L40,-13.5L44,-10L40,-6.5'), INK, 7), [['urge', { base: INK }]])
  return join(bl, sph, drops, zig)
})

// ---------- Prostate and Benign prostatic hyperplasia: the part, healthy and enlarged ----------
icon('Prostate', [4.85, 0, 0], (g) => organ(g, { kind: 'prostate', x: 0, y: 0, size: 100, id: 'prostate' }))
icon('Benign prostatic hyperplasia', [4.85, 0, 0], (g) => organ(g, { kind: 'prostate', x: 0, y: 0, size: 100, state: 'enlarged', id: 'prostate' }))

// ---------- Testis: the testis with septa and tubules, the epididymis on it, the vas deferens and artery going up ----------
icon('Testis', [4.84, -1, -2.5], (g) => {
  const w = organW(460) * 0.8
  const vas = own('vas-deferens', tubes(g, [[g.D('M10,38C18,46 32,42 32,28L32,-30C32,-38 30,-43 28,-49'), 4]], EPIDIDYMIS, w * 0.8, 'butt'), [['epididymis', EPIDIDYMIS]])
  const art = own('testicular-artery', tubes(g, [[g.D('M20,-30C22,-38 22,-44 21,-49'), 2.8]], ARTERY, w * 0.7, 'butt'), [['artery', ARTERY]])
  const T = g.smooth([[-8, -28], [4, -25], [13, -15], [17, 0], [16, 14], [10, 28], [-2, 37], [-14, 38], [-26, 31], [-33, 15], [-34, -2], [-30, -16], [-21, -25]])
  let inner = strokeD(g.D('M13,2L-22,-19M13,2L-29,-2M13,2L-25,18M13,2L-11,32M13,2L-4,-23M13,2L5,31'), TESTIS.small, w * 0.5)
  inner += strokeD([[-17, -11], [-22, 8], [-6, 22], [-20, 26], [-8, -16]].map(([x, y]) => g.D(`M${x - 4.5},${y}C${x - 3},${y - 3} ${x - 1.5},${y + 3} ${x},${y}C${x + 1.5},${y - 3} ${x + 3},${y + 3} ${x + 4.5},${y}`)).join(' '), TESTIS.outline, w * 0.45)
  inner += fillD(ellD(g, 13, 2, 3, 8), TESTIS.small)
  const t = glossBody('testis-body', [T], TESTIS, w, { inner })
  const E = g.smooth([[-6, -28], [-1, -35], [9, -38], [19, -34], [25, -24], [26, -10], [25, 6], [26, 20], [23, 32], [15, 40], [6, 39], [6, 34], [12, 27], [15, 13], [16, -2], [14, -14], [8, -22], [0, -26]])
  const coils = strokeD(g.D('M4,-33C7,-31 10,-34 13,-32C16,-30 18,-32 20,-29M21,-18C18,-17 18,-14 21,-12M20,-3C17,-2 17,1 20,3M20,12C17,13 17,16 20,18M17,27C14,28 15,31 18,32'), EPIDIDYMIS.outline, w * 0.45)
  const e = glossBody('epididymis-body', [E], EPIDIDYMIS, w * 0.85, { inner: coils })
  return join(vas, art, own('testis', t.body, [['testis', TESTIS]], t.defs), own('epididymis', e.body, [['epididymis', EPIDIDYMIS]], e.defs))
})

check()
console.log('written', OUT)
