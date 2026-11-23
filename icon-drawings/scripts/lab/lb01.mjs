// Eight icons of SiliCoDraw's "Lab & equipment" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts in ../parts/:
// tubes and the samples kept in them. Test tube, Microtube, Blood tube, Saliva sample, Stool sample, CSF sample, Plasma and
// serum, PBMC isolation. Compositions read by hand from the source in a 100 × 100 box centred on 0,0 and scaled onto a
// 512 page (`page` of ../cellkit.mjs); materials and colours follow the conventions of objects in ../parts/lab.mjs.
// Parts used: tube, glassware (jar), PAPER, PLASTIC, METAL, LIQUIDS, ACCENT (lab.mjs); arrow (tissue.mjs).
// Drawn here because no part draws them: a drop of liquid, a stool, lumbar vertebrae with their discs (side view), a
// spinal needle, cells on the PBMC layer.
// Lettered: nothing. Left out: SiliCoDraw's side labels ("spit", "microbiome", "clear", "plasma", "buffy", "RBC",
// "PBMC") and the tick lines of the layers; the PBMC layer is pointed at by an arrow instead.
// Usage: node lb01.mjs <folder>
import { mkdirSync } from 'node:fs'
import { NUC, cellTypes, page } from '../cellkit.mjs'
import { hueOf, soft, toHex, toLch } from '../colour.mjs'
import { f } from '../shapes.mjs'
import { LIQUIDS, METAL, PAPER, PLASTIC, glassware, objW, tube } from '../parts/lab.mjs'
import { mergeParts } from '../parts/membranes.mjs'
import { arrow } from '../parts/tissue.mjs'

const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012) are left out of the hue check, as STYLE.md says.
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p]) => toLch(p.base).c >= 0.012), defs, body)
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), parts: mergeParts(ps.flatMap((p) => p.parts)) })
const icon = (name, { defs, body, parts }) => cellType(name, parts, defs, body)
const own = (id, body, parts, defs = '') => ({ defs, body: `<g id="${id}">${body}</g>`, parts })
const extra = (p) => ({ ...p, parts: [] })
const INK = toHex({ l: 0.5, c: 0.006, h: 250 }) // a true grey for arrows
const P2 = ([x, y]) => `${f(x)},${f(y)}`

// Palettes of the things no part draws.
const BONE = soft(70) // the bone of ct13
const DISC = { light: toHex({ l: 0.98, c: 0.004, h: 230 }), base: toHex({ l: 0.93, c: 0.008, h: 230 }), shadow: toHex({ l: 0.88, c: 0.01, h: 230 }), small: toHex({ l: 0.8, c: 0.01, h: 230 }), outline: toHex({ l: 0.6, c: 0.011, h: 230 }) } // cartilage: a cool grey, so it never recolours with the CSF or the cap
// The buffy coat and the PBMC ring: white, a little darker than the plastic so that it shows.
const BUFFY = { ...PAPER, small: toHex({ l: 0.935, c: 0.006, h: 90 }), outline: PAPER.outline }
const SH = hueOf('#8b5a2b')
const STOOL = { light: toHex({ l: 0.8, c: 0.05, h: SH }), base: toHex({ l: 0.66, c: 0.085, h: SH }), shadow: toHex({ l: 0.58, c: 0.09, h: SH }), small: toHex({ l: 0.55, c: 0.08, h: SH }), outline: toHex({ l: 0.42, c: 0.07, h: SH }) }

/** A drop of liquid, point up, `size` its height: a gradient from 80 px on, one highlight. */
function drop(g, { x, y, size, id = 'drop', pal = LIQUIDS.water }) {
  const u = size / 100, px = size * g.k, w = objW(px)
  // a teardrop: a circle of radius 30 at y 20 met by two curves from the point
  const d = `M${P2(g.P([x, y - 50 * u]))} C${P2(g.P([x + 8 * u, y - 30 * u]))} ${P2(g.P([x + 30 * u, y - 10 * u]))} ${P2(g.P([x + 30 * u, y + 18 * u]))} A${f(31 * u * g.k)},${f(31 * u * g.k)} 0 0 1 ${P2(g.P([x - 30 * u, y + 18 * u]))} C${P2(g.P([x - 30 * u, y - 10 * u]))} ${P2(g.P([x - 8 * u, y - 30 * u]))} ${P2(g.P([x, y - 50 * u]))}Z`
  const big = px >= 80
  const defs = big ? g.grad(`${id}-gradient`, [x - 30 * u, y - 50 * u, x + 30 * u, y + 50 * u], pal) : ''
  const body = g.path(d, big ? `url(#${id}-gradient)` : pal.small, pal.outline, w) + (big ? g.hl(x - 14 * u, y + 10 * u, f(5 * u * g.k), f(11 * u * g.k), 20, pal.light) : '')
  return own(id, body, [['drop', pal]], defs)
}

// ---------------------------------------------------------------------------------------------------------------------
// Test tube: a glass tube with a rim, half full of a blue liquid (SiliCoDraw's #6f86c8, here the water of lab.mjs).
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.6, [0, 0])
  icon('Test tube', tube(g, { x: 0, y: 0, size: 100, kind: 'test', liquid: 'water', level: 0.45, id: 'test-tube' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Microtube: a 1.5 ml microcentrifuge tube with its snap cap closed, a third full.
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.6, [5.1, 0])
  icon('Microtube', tube(g, { x: 0, y: 0, size: 100, kind: 'micro', liquid: 'water', level: 0.4, id: 'microtube' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Blood tube: a vacuum blood tube with a lavender (EDTA) stopper and a paper label, half full of blood. SiliCoDraw's
// pink #f3b6b6 blood is the deep red of the red blood cell, as lab.mjs gives blood.
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.6, [0, 0])
  icon('Blood tube', tube(g, { x: 0, y: 0, size: 100, kind: 'blood', liquid: 'blood', level: 0.55, label: true, capPal: soft(hueOf('#7c3aed')), id: 'blood-tube' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Saliva sample: a screw-capped collection tube with saliva in it and a drop of saliva beside it (SiliCoDraw's pale blue,
// the water of lab.mjs; the drop is the same liquid, so it recolours with it). "spit" left out.
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.6, [-7.5, 0])
  const t = tube(g, { x: 8, y: 0, size: 100, kind: 'vial', liquid: 'water', level: 0.32, label: true, id: 'saliva-tube' })
  const d = drop(g, { x: -30, y: 10, size: 34, id: 'saliva-drop' })
  icon('Saliva sample', join(t, d))
}

// ---------------------------------------------------------------------------------------------------------------------
// Stool sample: a lidded plastic sample pot with a stool in it. "microbiome" left out.
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.6, [0, 0])
  const pot = glassware(g, { x: 0, y: 0, size: 100, kind: 'jar', material: 'plastic', level: 0, id: 'stool-pot' })
  // A curled log lying on the floor of the pot (inside: x −36…36, floor at 50) and a small piece on it.
  const logs = [[[-25, 39], [-12, 43], [6, 42], [20, 35], [22, 24], [12, 19]], [[-18, 26], [-6, 27]]]
  const th = 14, W = objW(th * 3 * g.k)
  const open = (pts) => { const P = pts.map(g.P); let d = `M${P2(P[0])}`; for (let i = 0; i < P.length - 1; i++) { const a = P[Math.max(0, i - 1)], b = P[i], c = P[i + 1], e = P[Math.min(P.length - 1, i + 2)]; d += ` C${P2([b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6])} ${P2([c[0] - (e[0] - b[0]) / 6, c[1] - (e[1] - b[1]) / 6])} ${P2(c)}` } return d }
  const stroke = (d, colour, width) => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(width)}" stroke-linecap="round" stroke-linejoin="round"/>`
  let s = ''
  logs.forEach((pts, i) => { const d = open(pts), t = (i ? th * 0.85 : th) * g.k; s += stroke(d, STOOL.outline, t + 2 * W) + stroke(d, 'url(#stool-gradient)', t) })
  s += stroke(open([[-21, 38.5], [-11, 41], [2, 40.5]]), STOOL.light, 2.2 * g.k)
  const stool = own('stool', s, [['stool', STOOL]], g.grad('stool-gradient', [-27, 18, 27, 50], STOOL))
  icon('Stool sample', join(pot, stool))
}

// ---------------------------------------------------------------------------------------------------------------------
// CSF sample: lumbar puncture. Four lumbar vertebrae seen from the front as SiliCoDraw draws them (bodies with short
// transverse processes, grey discs between them), a spinal needle entering from the side between two bodies, clear CSF dripping from its hub into an
// open sample tube. (Changed: SiliCoDraw's needle is aimed at a vertebra; here it enters between two of them, where a
// lumbar puncture goes. "clear" left out.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.95, [-1, 4])
  const W = objW(28 * g.k)
  let v = '', defs = ''
  const tops = [-42, -22, -2, 18]
  tops.forEach((y0, i) => {
    // transverse processes: a short blunt wedge on each side of the body, drawn first so the body covers their roots
    for (const side of [-1, 1]) {
      const x0 = -18 + side * 12, x1 = -18 + side * 22
      v += g.path(g.smooth([[x0, y0 + 3], [x1, y0 + 5], [x1, y0 + 9], [x0, y0 + 11]]), BONE.base, BONE.outline, W)
    }
    defs += g.grad(`vertebra${i}-gradient`, [-32, y0, -4, y0 + 14], BONE)
    v += `<rect x="${f(g.X(-32))}" y="${f(g.Y(y0))}" width="${f(28 * g.k)}" height="${f(14 * g.k)}" rx="${f(4 * g.k)}" fill="url(#vertebra${i}-gradient)" stroke="${BONE.outline}" stroke-width="${W}" stroke-linejoin="round"/>`
    v += g.hl(-25, y0 + 4, f(4.5 * g.k), f(1.5 * g.k), 0, BONE.light)
  })
  const verts = own('vertebrae', v, [['vertebrae', BONE]], defs)
  let dsc = ''
  ;[-27.5, -7.5, 12.5].forEach((y) => { dsc += `<rect x="${f(g.X(-29))}" y="${f(g.Y(y))}" width="${f(22 * g.k)}" height="${f(5 * g.k)}" rx="${f(2.5 * g.k)}" fill="${DISC.base}" stroke="${DISC.outline}" stroke-width="${f(W * 0.7)}"/>` })
  const discs = own('discs', dsc, [['discs', DISC]])
  // spinal needle: from the hub at the upper right down-left into the gap between the second and third process
  const a = [30, -17], b = [-2, -5], len = Math.hypot(a[0] - b[0], a[1] - b[1]), ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len
  const needle = g.line([[a[0] + ux * 5, a[1] + uy * 5], b], METAL.outline, f(2.6 * g.k * 0.55))
  const ang = (Math.atan2(uy, ux) * 180) / Math.PI
  const [hx, hy] = g.P(a)
  const hub = `<rect x="${f(hx - 6 * g.k)}" y="${f(hy - 3.6 * g.k)}" width="${f(12 * g.k)}" height="${f(7.2 * g.k)}" rx="${f(2 * g.k)}" transform="rotate(${f(ang)} ${f(hx)} ${f(hy)})" fill="${PLASTIC.shadow}" stroke="${PLASTIC.outline}" stroke-width="${f(W * 0.8)}"/>`
  const ndl = own('spinal-needle', needle + hub, [['needle', METAL]])
  const t = tube(g, { x: 30, y: 25, size: 50, kind: 'vial', cap: 'none', liquid: 'water', level: 0.4, id: 'csf-tube' })
  const d = drop(g, { x: 30, y: -5, size: 11, id: 'csf-drop' })
  icon('CSF sample', join(verts, discs, ndl, t, d))
}

// ---------------------------------------------------------------------------------------------------------------------
// Plasma and serum: a blood tube after centrifuging: plasma (yellow) on top, the thin white buffy coat, red cells below.
// The cap is in the accent blue of lab.mjs (SiliCoDraw grey). The labels and tick lines are left out.
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.6, [0, 0])
  icon('Plasma and serum', tube(g, { x: 0, y: 0, size: 100, kind: 'blood', layers: [[0.42, 'blood'], [0.05, BUFFY], [0.36, 'plasma']], id: 'plasma-tube' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// PBMC isolation: a conical tube after density-gradient centrifugation: plasma on top, the white ring of peripheral blood
// mononuclear cells (round cells with lilac nuclei), the clear separation medium, red cells and granulocytes at the
// bottom; an arrow points at the ring. (Changed: SiliCoDraw puts the cells on a grey band straight on the red cells; the
// clear density medium lies between them. Its labels "plasma", "PBMC", "RBC" are left out.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(4.6, [12, 0])
  const S = 100
  const t = tube(g, { x: 0, y: 0, size: S, kind: 'conical', layers: [[0.3, 'blood'], [0.17, 'water'], [0.05, BUFFY], [0.3, 'plasma']], id: 'pbmc-tube' })
  // the ring lies between the shares 0.47 and 0.52 of the fill (from y 50 up to −31)
  const yRing = 50 - 0.495 * 81
  let c = ''
  ;[[-8.5, 0.6], [-2.8, -0.8], [3, 0.7], [8.6, -0.6]].forEach(([x, dy]) => { c += g.circle(x, yRing + dy, 3, PAPER.light, PAPER.outline, 2.2) + g.circle(x + 0.4, yRing + dy + 0.3, 1.5, NUC.small) })
  const cells = own('PBMC', c, [['PBMC nuclei', NUC]])
  const arr = arrow(g, { points: [[40, yRing], [22, yRing]], colour: INK, w: 9, id: 'arrow' })
  icon('PBMC isolation', join(t, cells, extra(arr)))
}

check()
console.log('written')
