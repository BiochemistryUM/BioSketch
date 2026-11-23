// Eight icons of SiliCoDraw's "Anatomy" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts of the
// category (../parts/anatomy.mjs): Cerebellum, Brainstem, Hippocampus and Hippocampal atrophy (the `brain` part with its
// region, the atrophied hippocampus shrunk inside the dashed outline it had, on a pale brain), Cerebral blood flow decline
// (the brain with its middle cerebral artery thinned and fading, and a falling arrow), Spinal cord and Nerve (each cut
// across), and the Gut–brain axis (brain, vagus nerve, small intestine with its bacteria and a two-way arrow).
// Parts used: brain, organ ('intestine'), BRAIN, GUT-like organPal, NERVE, ARTERY, VEIN, organW (anatomy.mjs); arrow,
// vesselSection (tissue.mjs); microbe (immune.mjs); gloss, glossTones, pathPoints (surfaces.mjs).
// Drawn here because no part draws them: the spinal cord in section (white matter, grey-matter butterfly, central canal,
// roots and dorsal root ganglia) and the peripheral nerve in section (epineurium, fascicles, myelinated axons), both from
// the palettes of anatomy.mjs, the cord and the nerve glossed as closed bodies (glossBody, copied from anatomy.mjs).
// The current look: outlines at 60 % (setStrokeScale), the gloss on (setGloss).
// Lettered: nothing (SiliCoDraw writes no labels on these).
// Usage: node anB.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, glossOn, page, setGloss, smoothD } from '../cellkit.mjs'
import { deep, hueGap, hueOf, toLch } from '../colour.mjs'
import { f, setStrokeScale, strokeScale } from '../shapes.mjs'
import { ARTERY, BRAIN, NERVE, VEIN, brain, organ, organPal, organW } from '../parts/anatomy.mjs'
import { arrow, vesselSection } from '../parts/tissue.mjs'
import { microbe } from '../parts/immune.mjs'
import { INK } from '../parts/lab.mjs'
import { gloss, glossTones, pathPoints } from '../parts/surfaces.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT)
// Greys (chroma below 0.012) are left out of the hue check; the same palette used by several parts is listed once.
const icon = (name, [k, cx, cy], draw) => {
  const g = page(k, [cx, cy]), { defs, body, parts } = draw(g)
  const seen = parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base || hueGap(toLch(q.base).h, toLch(p.base).h) < 3) === i)
  kit.cellType(name, seen, defs, body)
}
const join = (...ps) => ({ defs: ps.map((p) => p.defs ?? '').join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts ?? []) })
const own = (id, body, parts = [], defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })

// ---------- drawing helpers (as anatomy.mjs's) ----------
const sw = (s, w) => (s ? ` stroke="${s}" stroke-width="${f(w)}" stroke-linejoin="round"` : '')
const fillD = (d, fill, s = '', w = 0) => `<path d="${d}" fill="${fill}"${sw(s, w)}/>`
const strokeD = (d, colour, w, cap = 'round') => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
const lin = (id, [x0, y0, x1, y1], a, b) => `<linearGradient id="${id}" x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`
const boxOf = (d) => { const p = pathPoints(d).flat(), xs = p.map((q) => q[0]), ys = p.map((q) => q[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] }
/** A closed body in the gloss of cells (anatomy.mjs's glossBody): gradient to the gloss's end tone, its face-on tones, `inner`, one outline. */
function glossBody(id, d, pal, w, inner = '') {
  const box = boxOf(d), size = Math.max(box[2] - box[0], box[3] - box[1]), T = glossTones(pal)
  let s = fillD(d, `url(#${id}-gradient)`)
  if (glossOn() && size >= 40) {
    const G = gloss({ fills: [pathPoints(d)] }, { inset: (w * strokeScale()) / 2 })
    s += ['shade', 'shadow', ...(size >= 90 ? ['lit', 'highlight'] : [])].map((k) => (G[k] ? `<path d="${G[k]}" fill="${T[k]}"/>` : '')).join('')
  }
  return { defs: lin(`${id}-gradient`, box, pal.base, glossOn() ? T.end : pal.shadow), body: s + inner + fillD(d, 'none', pal.outline, w) }
}
const circleD = (g, x, y, r) => { const [cx, cy] = g.P([x, y]), R = r * g.k; return `M${f(cx - R)},${f(cy)} A${f(R)},${f(R)} 0 1 0 ${f(cx + R)},${f(cy)} A${f(R)},${f(R)} 0 1 0 ${f(cx - R)},${f(cy)} Z` }
const ellD = (g, x, y, rx, ry, rot = 0) => { const c = Math.cos((rot * Math.PI) / 180), s = Math.sin((rot * Math.PI) / 180), q = []; for (let i = 0; i < 16; i++) { const t = (i / 16) * 2 * Math.PI; q.push([x + rx * Math.cos(t) * c - ry * Math.sin(t) * s, y + rx * Math.cos(t) * s + ry * Math.sin(t) * c]) } return smoothD(q.map(g.P)) }
/** An open smooth curve through points of g (Catmull–Rom). */
const curveD = (g, pts) => {
  const p = pts.map(g.P), n = p.length
  let d = `M${f(p[0][0])},${f(p[0][1])}`
  for (let i = 0; i < n - 1; i++) {
    const a = p[Math.max(0, i - 1)], b = p[i], c = p[i + 1], e = p[Math.min(n - 1, i + 2)]
    d += `C${f(b[0] + (c[0] - a[0]) / 6)},${f(b[1] + (c[1] - a[1]) / 6)} ${f(c[0] - (e[0] - b[0]) / 6)},${f(c[1] - (e[1] - b[1]) / 6)} ${f(c[0])},${f(c[1])}`
  }
  return d
}
/** A flat tube (a nerve root, the vagus) along points of g, `width` its visible width in g's units, outline `w` px. */
const tube = (g, pts, width, pal, w) => { const d = curveD(g, pts), W = (width * g.k) / strokeScale(); return strokeD(d, pal.outline, W + 2 * w) + strokeD(d, pal.base, W) }

const K = 4.6 // 100 units of SiliCoDraw's box are 460 px of the page: margins about 26
const B = (o = {}) => (g) => brain(g, { x: 0, y: 0, size: 100, ...o })

// Cerebellum, Brainstem, Hippocampus: the brain with that part lit in a deeper tone of the brain.
icon('Cerebellum', [K, 0, 0], B({ region: 'cerebellum' }))
icon('Brainstem', [K, 0, 0], B({ region: 'brainstem' }))
icon('Hippocampus', [K, 0, 0], B({ region: 'hippocampus' }))
// Hippocampal atrophy: on a pale brain, the shrunken hippocampus inside the dashed outline of a young one.
icon('Hippocampal atrophy', [K, 0, 0], B({ region: 'hippocampus', atrophy: true, pale: true }))

// Cerebral blood flow decline: the middle cerebral artery fanning out of the lateral sulcus, thinned, its far branches
// fading (dashed), and a thick arrow falling at the lower right (SiliCoDraw's blue).
{
  const FALL = deep(hueOf('#4f6bb8'))
  icon('Cerebral blood flow decline', [K, 0, 0], (g) => join(
    brain(g, { x: -6, y: -5, size: 88, arteries: 'reduced' }),
    arrow(g, { points: [[39, 8], [39, 47]], w: 36, head: 80, colour: FALL.outline, id: 'decline' }),
  ))
}

// Spinal cord in section: white matter round the grey-matter butterfly (dorsal horns up), the central canal, the
// fissure below and the sulcus above; dorsal roots with their ganglia and ventral roots joining into the spinal nerves.
icon('Spinal cord', [K, 0, 0], (g) => {
  const P = BRAIN, N = NERVE, w = organW(65 * K), lw = w * 0.5
  const half = [[0, -4], [4, -6], [9, -10], [13, -15], [16, -19.5], [19, -17], [15.5, -10], [12.5, -4], [15.5, -2], [18.5, 3], [20.5, 9], [18.5, 15], [11, 16], [6, 10], [0, 7]]
  const butterfly = half.concat(half.slice(1, -1).reverse().map(([x, y]) => [-x, y])).map(([x, y]) => [x * 1.06, y * 1.06 - 1])
  let roots = ''
  for (const k of [1, -1]) {
    roots += tube(g, [[17 * k, -21], [24 * k, -22.5], [29 * k, -19], [33 * k, -15]], 3.4, N, lw)
    roots += tube(g, [[16 * k, 19], [25 * k, 21], [33 * k, 13], [41 * k, -3]], 3.4, N, lw)
    roots += tube(g, [[39 * k, -9], [42 * k, -5], [45 * k, 0], [47 * k, 6]], 4.2, N, lw)
    roots += fillD(ellD(g, 36 * k, -12, 7, 5, 38 * k), N.shadow, N.outline, lw)
  }
  const cord = ellD(g, 0, -1, 32, 24.5)
  let inner = fillD(smoothD(butterfly.map(g.P)), P.small, P.outline, lw)
  inner += strokeD(curveD(g, [[0, -25], [0, -15], [0, -8]]), P.outline, lw) + strokeD(curveD(g, [[0, 23.5], [0, 15.5]]), P.outline, w * 0.8)
  inner += fillD(circleD(g, 0, 0.8, 2.2), P.light, P.small, lw * 0.8)
  const b = glossBody('spinal-cord', cord, P, w, inner)
  return { defs: b.defs, body: `<g id="roots">${roots}</g><g id="spinal-cord">${b.body}</g>`, parts: [['spinal cord', P], ['roots', N]] }
})

// Nerve in section: the epineurium (the nerve's yellow) round four fascicles, each a ring of perineurium holding
// myelinated axons (rings of myelin round pale axons, in the nerve's own deeper tones: the pale blue and peach of the
// nervous cells would lie within 36° of the vein and the artery); a small artery and vein run in the epineurium.
const KN = 5 // the nerve is 92 across: 460 px
icon('Nerve', [KN, 0, 0], (g) => {
  const N = NERVE, w = organW(92 * KN), lw = w * 0.5
  const outer = smoothD([[0, -45], [19, -41], [35, -31], [44, -14], [46, 4], [41, 22], [29, 36], [11, 45], [-9, 45], [-28, 38], [-41, 24], [-46, 5], [-44, -14], [-34, -31], [-17, -42]].map(g.P))
  let inner = ''
  for (const [x, y, r] of [[-17, -15, 16], [16, -18, 14], [18, 14, 15], [-14, 19, 14]]) {
    inner += fillD(circleD(g, x, y, r), N.light, N.outline, w * 0.7)
    const sp = 8.6, ar = 3.3
    let my = '', ax = ''
    for (let j = -3; j <= 3; j++)
      for (let i = -3; i <= 3; i++) {
        const px = x + (i + (j & 1) * 0.5) * sp, py = y + j * sp * 0.866
        if (Math.hypot(px - x, py - y) <= r - 4.6) { my += circleD(g, px, py, ar) + ' '; ax += circleD(g, px, py, ar * 0.45) + ' ' }
      }
    inner += fillD(my, N.shadow, N.small, lw * 0.7) + fillD(ax, N.light)
  }
  const b = glossBody('epineurium', outer, N, w, inner)
  const ar = vesselSection(g, { x: 36, y: -2, size: 10, pal: ARTERY, id: 'artery' }), vn = vesselSection(g, { x: -35, y: 3, size: 11, pal: VEIN, wall: 0.22, id: 'vein' })
  return { defs: b.defs + ar.defs + vn.defs, body: `<g id="nerve">${b.body}</g>${ar.body}${vn.body}`, parts: [['nerve', N], ['artery', ARTERY], ['vein', VEIN]] }
})

// Gut–brain axis: the brain at the upper left, the vagus nerve running down from the brainstem to the small intestine at
// the lower right, bacteria of the gut beside its loops, and a two-way arrow at the left. The gut takes a peach (45°)
// instead of its pink, which is the brain's hue, as SiliCoDraw draws it peach.
{
  const GUT2 = organPal(45, 1.15)
  icon('Gut–brain axis', [K, 0, 0], (g) => {
    const [gx, gy] = [17, 25] // the middle of the gut
    const br = brain(g, { x: -17, y: -22, size: 56 })
    const gut = organ(g, { kind: 'intestine', x: gx, y: gy, size: 60, pal: GUT2, id: 'small-intestine' })
    const vagus = own('vagus-nerve', tube(g, [[-11, 2], [-11, 6], [-9, 9], [-5, 10.5], [gx - 19, gy - 13.5]], 2.6, NERVE, 3.5), [['vagus nerve', NERVE]])
    const bugs = [[-7, -17.5, 0], [15, -18.5, 0], [-9, 6.5, 6], [9, 20, 0], [18, -6, 0]].map(([x, y, t], i) => microbe(g, { x: gx + x, y: gy + y, size: 8.5, turn: t, flagellum: false, granules: false, id: `bacterium${i + 1}` }))
    const two = arrow(g, { points: [[-37, 12], [-37, 45]], start: 'head', colour: INK, w: 8, id: 'two-way-arrow' })
    return join(vagus, br, gut, ...bugs, two)
  })
}

kit.check()
console.log('written', OUT)
