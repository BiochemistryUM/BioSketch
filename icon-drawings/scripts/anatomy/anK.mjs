// Eight icons of SiliCoDraw's "Anatomy" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), the later drawings that replace the first, redrawn in the soft look of
// icon-drawings/STYLE.md from the shared parts of the category in ../parts/anatomy.mjs: Ear, Cochlea, Tinnitus,
// Vestibular system, Tooth, Dental caries, Dental implant and Braces. Compositions are read by hand from the source in its
// 100 × 100 box centred on 0,0 and scaled onto a 512 page (`page` of ../cellkit.mjs); outlines at 60 % (setStrokeScale),
// gloss on (the pinna and the cochlea are glossed by the ear part; teeth, gum and objects stay flat).
// Parts used: ear (outer, cochlea, inner), tooth (molar, caries, implant, incisor), bacterium (tissue.mjs), METAL, ACCENT,
// objW (lab.mjs).
// Drawn here because no part draws them: the ringing of tinnitus (wavy arcs spreading from the ear canal, fading in three
// tones of one blue), and for Braces the upper gum (scalloped round each neck, papillae between the teeth), the brackets,
// the archwire and the coloured ligature ties.
// Lettered: nothing.
// Usage: node anK.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss } from '../cellkit.mjs'
import { hueOf, toHex, toLch } from '../colour.mjs'
import { f, setStrokeScale, strokeScale } from '../shapes.mjs'
import { GUM, ear, organW, tooth } from '../parts/anatomy.mjs'
import { bacterium } from '../parts/tissue.mjs'
import { ACCENT, METAL, objW } from '../parts/lab.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012: enamel, metal) are left out of the hue check, as the conventions of lab.mjs say; a palette
// used by several parts is listed once.
const icon = (name, [k, cx, cy], draw) => {
  const g = page(k, [cx, cy]), { defs, body, parts } = draw(g)
  const seen = parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base) === i)
  kit.cellType(name, seen, defs, body)
}
const join = (...ps) => ({ defs: ps.map((p) => p.defs ?? '').join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts ?? []) })
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })

// ---------- small drawing helpers in g's units ----------
const P2 = (p) => p.map(f).join(',')
const strokeD = (d, colour, w, cap = 'round') => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
const fillD = (d, fill, s = '', w = 0) => `<path d="${d}" fill="${fill}"${s ? ` stroke="${s}" stroke-width="${f(w)}" stroke-linejoin="round"` : ''}/>`
const rrect = (g, x0, y0, x1, y1, r) => {
  const [a, b] = g.P([x0, y0]), W = (x1 - x0) * g.k, H = (y1 - y0) * g.k, R = Math.min(r * g.k, W / 2, H / 2)
  return `M${f(a + R)},${f(b)} H${f(a + W - R)} A${f(R)},${f(R)} 0 0 1 ${f(a + W)},${f(b + R)} V${f(b + H - R)} A${f(R)},${f(R)} 0 0 1 ${f(a + W - R)},${f(b + H)} H${f(a + R)} A${f(R)},${f(R)} 0 0 1 ${f(a)},${f(b + H - R)} V${f(b + R)} A${f(R)},${f(R)} 0 0 1 ${f(a + R)},${f(b)} Z`
}
/** An open smooth curve through points (Catmull–Rom as cubic Béziers), in g's units. */
const curve = (g, pts) => {
  const p = pts.map(g.P), n = p.length
  let d = `M${P2(p[0])}`
  for (let i = 0; i < n - 1; i++) {
    const a = p[Math.max(0, i - 1)], b = p[i], c = p[i + 1], e = p[Math.min(n - 1, i + 2)]
    d += `C${f(b[0] + (c[0] - a[0]) / 6)},${f(b[1] + (c[1] - a[1]) / 6)} ${f(c[0] - (e[0] - b[0]) / 6)},${f(c[1] - (e[1] - b[1]) / 6)} ${P2(c)}`
  }
  return d
}
/** A tube along a page path: an outline round a fill, `width` its visible width in g's units (strokes are thinned by
 *  setStrokeScale, so the width is given back). */
const tubeD = (g, d, width, fill, outline, w) => { const W = (width * g.k) / strokeScale(); return strokeD(d, outline, W + 2 * w) + strokeD(d, fill, W) }

// ---------- Ear ----------
// The outer ear from the side, in the skin of a person: wholly the part (its highlight line is left out, as the look asks).
icon('Ear', [4.6, 0, 0.3], (g) => ear(g, { x: 0, y: 0, size: 106.5, view: 'outer', id: 'ear' }))

// ---------- Cochlea ----------
// The snail of the inner ear, about two and a half turns, the cochlear duct along it, the oval and round windows at its
// base: wholly the part.
icon('Cochlea', [4.6, 6.3, 5.1], (g) => ear(g, { x: 0, y: 0, size: 114, view: 'cochlea', id: 'cochlea' }))

// ---------- Tinnitus ----------
// The outer ear at the right and, drawn here, a ringing heard where there is no sound: wavy arcs spreading from the ear
// canal and fading outward, in three tones of one blue (no transparency in the look). The blue is SiliCoDraw's #6f86c8.
const RING = { light: toHex({ l: 0.9, c: 0.04, h: hueOf('#6f86c8') }), base: toHex({ l: 0.62, c: 0.11, h: hueOf('#6f86c8') }), shadow: toHex({ l: 0.74, c: 0.08, h: hueOf('#6f86c8') }), small: toHex({ l: 0.84, c: 0.05, h: hueOf('#6f86c8') }), outline: toHex({ l: 0.48, c: 0.1, h: hueOf('#6f86c8') }) }
icon('Tinnitus', [4.6, 0, 0.3], (g) => {
  const s = 1.05, ex = 50 - 28 * s - 1.4
  const e = ear(g, { x: ex, y: 0, size: 100 * s, view: 'outer', id: 'ear' })
  const c = [ex + (-7 - 5) * s, 4 * s] // the ear canal (the part's concha, at its local -7, 4)
  const ring = (r, amp, k) => {
    const pts = []
    for (let i = 0; i <= 80; i++) { const t = ((146 + (i * 68) / 80) * Math.PI) / 180, rr = r + amp * Math.sin((i * k * Math.PI) / 80); pts.push([c[0] + Math.cos(t) * rr, c[1] + Math.sin(t) * rr]) }
    return `M${pts.map((p) => P2(g.P(p))).join(' L')}`
  }
  const wd = 13
  const arcs = strokeD(ring(26, 1.8, 12), RING.base, wd) + strokeD(ring(39, 2, 14), RING.shadow, wd) + strokeD(ring(52, 2.2, 16), RING.small, wd)
  return join(e, own('ringing', arcs, [['ringing', RING]]))
})

// ---------- Vestibular system ----------
// The labyrinth of the inner ear: three semicircular canals with their ampullae, the vestibule with its otoliths and the
// start of the cochlea: wholly the part.
icon('Vestibular system', [4.6, 4.5, 0.8], (g) => ear(g, { x: 0, y: 0, size: 108, view: 'inner', id: 'inner-ear' }))

// ---------- Tooth ----------
// A molar cut lengthwise: enamel cap, dentine, the pulp in crown and roots. Wholly the part.
icon('Tooth', [4.6, 0, 0], (g) => tooth(g, { x: 0, y: 0, size: 102, kind: 'molar', id: 'molar' }))

// ---------- Dental caries ----------
// The molar with a brown cavity eating through the enamel into the dentine (the part's 'caries'), and the bacteria of
// dental plaque beside the crown as SiliCoDraw places them (the approved green rod of tissue.mjs, without a flagellum,
// in place of SiliCoDraw's brown rods: a second brown would sit with the caries).
icon('Dental caries', [4.6, 0, 0], (g) => {
  const t = tooth(g, { x: 0, y: 0, size: 102, kind: 'molar', state: 'caries', id: 'molar' })
  const rods = [[-39.5, -37, -30], [-43.5, -26.5, 22], [-37.5, -17, -58], [40, -38, 35], [43, -26, -15]].map(([x, y, turn], i) => bacterium(g, { x, y, size: 10.5, turn, flagellum: false, id: `bacterium${i + 1}` }))
  return join(t, ...rods.map((r) => ({ ...r, parts: [['bacteria', r.parts[0][1]]] })))
})

// ---------- Dental implant ----------
// A threaded titanium screw in the jaw bone, an abutment through the gum and a crown on it: wholly the part.
icon('Dental implant', [4.6, 0, 0.4], (g) => tooth(g, { x: 0, y: 0, size: 99.5, kind: 'implant', id: 'implant' }))

// ---------- Braces ----------
// The six upper front teeth from the front (the incisor of the tooth part, turned so that the crowns point down; the
// outer teeth tucked a little behind their neighbours, as the arch curves away), and, drawn here, the gum over them,
// a metal bracket on each crown, the archwire through the brackets and a coloured elastic tie round each bracket. Metal
// and the ties follow the conventions of lab.mjs (METAL, ACCENT).
icon('Braces', [4.6, 0, -4.8], (g) => {
  // [x, size, incisal edge]: canines, laterals, centrals (drawn in that order, the front teeth last)
  const T = [[-42, 46, 23.5], [42, 46, 23.5], [-30, 52, 22.5], [30, 52, 22.5], [-11.3, 64, 25.5], [11.3, 64, 25.5]]
  const teeth = T.map(([x, s, edge], i) => tooth(g, { x, y: edge - (43 * s) / 92, size: s, kind: 'incisor', turn: 180, id: `tooth${i + 1}` }))
  const neck = ([x, s, edge]) => [x, edge - (43 * s) / 92 - (6 * s) / 92] // where the gum meets the crown, over its middle
  const w = organW(100 * g.k) * 0.8
  // the margin: an arch over each neck, a pointed papilla between neighbours
  const order = [T[0], T[2], T[4], T[5], T[3], T[1]]
  const pap = [[-50, 1.5], [-36.4, 4.5], [-21.8, 3.4], [0, 2.8], [21.8, 3.4], [36.4, 4.5], [50, 1.5]]
  const margin = (dy) => {
    const Q = ([x, y]) => P2(g.P([x, y + dy]))
    let d = `M${Q(pap[0])}`
    order.forEach((t, i) => {
      const A = pap[i], B = pap[i + 1], Z = neck(t)
      d += ` C${Q([A[0] + 0.6, Z[1] + (A[1] - Z[1]) * 0.35])} ${Q([Z[0] - (Z[0] - A[0]) * 0.55, Z[1]])} ${Q(Z)}`
      d += ` C${Q([Z[0] + (B[0] - Z[0]) * 0.55, Z[1]])} ${Q([B[0] - 0.6, Z[1] + (B[1] - Z[1]) * 0.35])} ${Q(B)}`
    })
    return d + ` L${P2(g.P([50, -31]))} Q${P2(g.P([50, -35]))} ${P2(g.P([46, -35]))} L${P2(g.P([-46, -35]))} Q${P2(g.P([-50, -35]))} ${P2(g.P([-50, -31]))} Z`
  }
  // the gum in its base tone over a deeper band along the margin (the free gingiva), one outline round it
  const gum = own('gum', fillD(margin(0), GUM.shadow) + fillD(margin(-4.2), GUM.base) + fillD(margin(0), 'none', GUM.outline, w), [['gum', GUM]])
  // brackets on the middle of each crown, the wire through them, a tie round each
  const at = ([x, s, edge]) => [x, edge - (43 * s) / 92 + (21 * s) / 92]
  const ow = objW(9 * g.k)
  const brackets = T.map((t) => { const [x, y] = at(t), h = (t[1] / 58) * 3.6; return fillD(rrect(g, x - h * 1.1, y - h, x + h * 1.1, y + h, h * 0.35), METAL.base, METAL.outline, ow) + strokeD(`M${P2(g.P([x - h * 1.1, y]))} L${P2(g.P([x + h * 1.1, y]))}`, METAL.small, ow * 0.6, 'butt') }).join('')
  const pts = [[-50, at(T[0])[1] - 1.2], ...order.map(at), [50, at(T[1])[1] - 1.2]]
  const wire = tubeD(g, curve(g, pts), 1.5, METAL.small, METAL.outline, ow * 0.55)
  const ties = T.map((t) => { const [x, y] = at(t), h = (t[1] / 58) * 4.7, r = rrect(g, x - h * 1.08, y - h, x + h * 1.08, y + h, h * 0.55); return tubeD(g, r, 1.25 * (t[1] / 58), ACCENT.small, ACCENT.outline, ow * 0.5) }).join('')
  return join(...teeth, gum, own('brackets', brackets, [['brackets', METAL]]), own('archwire', wire), own('ligature-ties', ties, [['ties', ACCENT]]))
})

check()
console.log('written')
