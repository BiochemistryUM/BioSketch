// Eight icons of SiliCoDraw's "Organisms" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), the later drawings that replace the first where there are any, redrawn in the soft look
// of icon-drawings/STYLE.md from the shared parts: Chick embryo, Frog, Tadpole, Axolotl, Limb regeneration (blastema),
// Olm, Lizard and Snake. Compositions are read by hand from the source in its 100 × 100 box centred on 0,0 and scaled
// onto a 512 page (`page` of ../cellkit.mjs); outlines at 60 % (setStrokeScale), gloss on (only the egg's shell, a closed
// round body, would take it; opened, it is drawn flat by the part).
// Parts used: scene 'egg' with its embryo, amphibian 'frog', 'tadpole', 'axolotl', 'olm', reptile 'lizard', 'snake' and
// the palettes AXOLOTL of parts/organisms.mjs; arrow of parts/tissue.mjs.
// Drawn here because no part draws it: the forelimb of a salamander cut off at the amputation plane, the blastema growing
// from the stump with its cells, and the hand it will become as a dashed outline (Limb regeneration).
// Lettered: nothing (SiliCoDraw writes no labels on these).
// Usage: node orE.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss, smoothD } from '../cellkit.mjs'
import { toLch } from '../colour.mjs'
import { f, setStrokeScale } from '../shapes.mjs'
import { AXOLOTL, amphibian, reptile, scene, tone } from '../parts/organisms.mjs'
import { arrow } from '../parts/tissue.mjs'
import { objW } from '../parts/lab.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012) are left out of the hue check; a palette used by several parts is listed once.
const icon = (name, [k, cx, cy], draw) => {
  const g = page(k, [cx, cy]), { defs, body, parts } = draw(g)
  const seen = parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base) === i)
  kit.cellType(name, seen, defs, body)
}
const join = (...ps) => ({ defs: ps.map((p) => p.defs ?? '').join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts ?? []) })
/** The page scale that makes an extent of `ext` units 460 px (margins of about 26 px). */
const K = (ext) => 460 / ext

// ---------- the parts as the icons ----------
// Each icon is one part, set at 96 units on the longer side, as SiliCoDraw draws it.
icon('Chick embryo', [K(96), 0, 0], (g) => scene(g, { x: 0, y: 0, size: 96, kind: 'egg', embryo: true, id: 'egg' }))
icon('Frog', [K(96), 0, 0], (g) => amphibian(g, { x: 0, y: 0, size: 96, kind: 'frog', id: 'frog' }))
icon('Tadpole', [K(96), 0, 0], (g) => amphibian(g, { x: 0, y: 0, size: 96, kind: 'tadpole', id: 'tadpole' }))
icon('Axolotl', [K(96), 0, 0], (g) => amphibian(g, { x: 0, y: 0, size: 96, kind: 'axolotl', id: 'axolotl' }))
icon('Olm', [K(96), 0, 0], (g) => amphibian(g, { x: 0, y: 0, size: 96, kind: 'olm', id: 'olm' }))
icon('Lizard', [K(96), 0, 0], (g) => reptile(g, { x: 0, y: 0, size: 96, kind: 'lizard', id: 'lizard' }))
icon('Snake', [K(96), 0, 0], (g) => reptile(g, { x: 0, y: 0, size: 96, kind: 'snake', id: 'snake' }))

// ---------- Limb regeneration (blastema) ----------
// The forelimb of an axolotl seen from above, coming out of the flank at the left and cut off at the amputation plane (a
// dashed line); beyond it the blastema, a cap of dividing cells in amber, and the hand that grows back from it as a pale
// dashed outline (four fingers, as a salamander's forelimb has); a curved arrow from the blastema to the hand. The skin
// is the axolotl part's palette, so this icon matches Axolotl.
const BLASTEMA = tone(72, 0.86, 0.11)
icon('Limb regeneration (blastema)', [K(108), -2.5, 0], (g) => {
  const w = objW(460), skin = AXOLOTL, P2 = (p) => g.P(p).map(f).join(',')
  const M = (d) => g.D(d), E = (u, v, rx, ry, rot = 0) => { const r = (rot * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r); return smoothD(Array.from({ length: 16 }, (_, i) => { const t = (i / 16) * 2 * Math.PI, a = rx * Math.cos(t), b = ry * Math.sin(t); return g.P([u + a * c - b * s, v + a * s + b * c]) })) }
  const path = (d, fill, s = '', sw = 0, extra = '') => `<path d="${d}" fill="${fill}"${s ? ` stroke="${s}" stroke-width="${f(sw)}" stroke-linejoin="round" stroke-linecap="round"` : ''}${extra}/>`
  const lin = (id, [x0, y0, x1, y1], a, b) => `<linearGradient id="${id}" x1="${f(g.X(x0))}" y1="${f(g.Y(y0))}" x2="${f(g.X(x1))}" y2="${f(g.Y(y1))}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`
  const dash = ` stroke-dasharray="${f(w * 1.9)} ${f(w * 1.5)}"`
  // The hand to come: a palm, a wrist and four fingers in a fan. Dashed outlines twice as wide go first and the fills
  // over them, so only the outside of the outline shows round the whole hand.
  const rr = (u0, v0, l, h, rot) => { const r = (rot * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r), q = h / 2, pts = []; for (let i = 0; i <= 8; i++) { const t = -Math.PI / 2 + (i / 8) * Math.PI; pts.push([l - q + q * Math.cos(t), q * Math.sin(t)]) } for (let i = 0; i <= 8; i++) { const t = Math.PI / 2 + (i / 8) * Math.PI; pts.push([q + q * Math.cos(t), q * Math.sin(t)]) } return smoothD(pts.map(([a, b]) => g.P([u0 + (a + 5) * c - b * s, v0 + (a + 5) * s + b * c]))) }
  const hand = [[-62, 17], [-22, 20], [16, 19], [56, 15]].map(([r, l]) => rr(28, 0, l, 8.5, r)).concat([E(27, 0, 10.5, 12), M('M13,-8.5 L25,-8.5 L25,8.5 L13,8.5 Z')])
  let ghost = `<g id="regrowth-hand">${hand.map((d) => path(d, 'none', skin.small, w * 1.6, dash)).join('')}${hand.map((d) => path(d, skin.light)).join('')}</g>`
  // The stump: the arm from the flank to the amputation plane, flat with its gradient and the pale line along it.
  const stumpD = M('M-44,-11 C-30,-13 -18,-11.5 -8,-10 L-2,-10 L-2,10 L-8,10 C-18,11.5 -30,13 -44,11 Z')
  const defs = lin('stump-gradient', [-44, -13, -2, 13], skin.base, skin.shadow) + lin('blastema-gradient', [-2, -12, 19, 12], BLASTEMA.base, BLASTEMA.shadow) + lin('flank-gradient', [-57, -46, -38, 46], skin.base, skin.shadow)
  let stump = `<g id="limb-skin">${path(stumpD, 'url(#stump-gradient)', skin.outline, w)}${path(M('M-34,-4 C-24,-5 -14,-4.6 -6,-4.4'), 'none', skin.light, w * 0.9)}`
  // The blastema: a rounded cap of cells beyond the plane, its cells as darker dots.
  let blast = `<g id="blastema">${path(M('M-2,-10.5 C9,-12.5 19,-7 19,0 C19,7 9,12.5 -2,10.5 Z'), 'url(#blastema-gradient)', BLASTEMA.outline, w)}`
  blast += path([[3.5, -4.5, 1.7], [9.5, 0.5, 1.7], [3.5, 5, 1.7], [11.5, -6, 1.5], [13.5, 5.5, 1.5], [15.5, -0.5, 1.4]].map(([u, v, r]) => E(u, v, r, r)).join(' '), BLASTEMA.small) + '</g>'
  // The amputation plane.
  const plane = `<g id="plane">${path(M('M-2,-16 L-2,16'), 'none', skin.outline, w * 0.55, ` stroke-dasharray="${f(w * 0.9)} ${f(w * 0.9)}"`)}</g>`
  // The flank the limb comes out of, drawn over the stump's end; its outline only along the edge, a few skin spots.
  const flankD = smoothD([[-50, -46], [-43, -32], [-38.8, -16], [-37.8, 0], [-38.8, 16], [-43, 32], [-50, 46], [-54.5, 40], [-56.5, 20], [-57, 0], [-56.5, -20], [-54.5, -40]].map(g.P))
  const flank = `${path(flankD, 'url(#flank-gradient)', skin.outline, w)}${path([[-47, -24, 2], [-45, 20, 2.4], [-50.5, 4, 1.8], [-50, -36, 1.5], [-50.5, 31, 1.6]].map(([u, v, r]) => E(u, v, r, r)).join(' '), skin.small)}</g>`
  const back = arrow(g, { points: [[3, -19], [12, -33], [28, -37], [39, -28]], colour: BLASTEMA.outline, id: 'regrowth-arrow' })
  return { defs, body: ghost + stump + flank + blast + plane + back.body, parts: [['skin', skin], ['blastema', BLASTEMA]] }
})

check()
console.log('written', OUT)
