// A pilot family of one cell type in several states and shapes: the fibroblast resting, activated (spindle and
// stellate), as a myofibroblast, secreting collagen, small, dividing and fluorescent. BioSketch's own drawings in the
// soft look of icon-drawings/STYLE.md, built from the approved Fibroblast (../silicodraw.mjs: a peach spindle, soft(PEACH),
// with the lilac nucleus NUC) and the shared parts in ../parts/: the cell forms (spindleField, stellateField, fieldCell,
// glow, fitted of ../parts/cellforms.mjs, promoted from this pilot after the owner approved its look on 23 November
// 2026), the nucleus, the vesicle colour and collagen. No SiliCoDraw original: the states are the owner's list.
// Usage: node fibroblast-family.mjs <folder>
import { cellTypes } from '../cellkit.mjs'
import { soft } from '../colour.mjs'
import { DAPI, FIBRO, GFP, MYO, fieldCell, fitted as fit, spindleField, stellateField } from '../parts/cellforms.mjs'
import { collagen } from '../parts/molecules.mjs'

const OUT = process.argv[2]
const { cellType, check } = cellTypes(OUT)

// Collagen: the part's orange (55°) is the peach's hue; a pale periwinkle (255°, the basement membrane's blue) instead.
const COLL = soft(255)
const CYTO = FIBRO
const rad = (d) => (d * Math.PI) / 180
const rot = ([u, v], deg) => { const c = Math.cos(rad(deg)), s = Math.sin(rad(deg)); return [u * c - v * s, u * s + v * c] }
// The pilot's fibroCell: fieldCell with the field's units as the frame's (scale 1) and the outline 10 px unless said.
const fibroCell = (g, fd, o) => fieldCell(g, fd, { scale: 1, w: 10, shine: false, ...o })
const fitted = (name, draw, o) => fit(cellType, name, draw, o)

// ---------- 1. Fibroblast (resting) ----------
// Quiescent: a long, thin spindle with a small flat nucleus, nothing else in it.
const resting = () => spindleField({ length: 98, width: 17, bend: 3.5, s: true, taper: 1.4, shift: -0.05 })
const RESTING_NUC = [{ x: 1, y: -0.6, size: 26, ratio: 0.36, turn: -4 }]
const familyScale = fitted('Fibroblast (resting)', (g) => fibroCell(g, resting(), { id: 'fibroblast', nuclei: RESTING_NUC, shine: { length: 13, near: 30 } }))

// ---------- 2. Fibroblast (activated) ----------
// Activated by injury or TGF-β: larger and fuller, its processes drawn out long at both ends, a large oval nucleus with a
// nucleolus, secretory vesicles in the cytoplasm.
const activated = (o = {}) => spindleField({ length: 100, width: 33, bend: 4, s: true, body: 0.52, process: 0.3, shift: 0.04, ...o })
fitted('Fibroblast (activated)', (g) => fibroCell(g, activated(), {
  id: 'fibroblast', w: 11,
  nuclei: [{ x: -1.5, y: 0, size: 32, ratio: 0.58, turn: -6, nucleolus: true }],
  vesicles: [[18, -4.5, 5], [21.5, 4, 4.2], [-19, 5, 4.2], [14, 7.5, 3.6]],
  shine: { length: 11, near: 22 },
}))

// ---------- 3. Fibroblast (activated, stellate) ----------
// Spread on a stiff surface: star-shaped, five processes of different lengths.
const STAR = [
  { deg: 192, length: 50, width: 17, bend: 5 },
  { deg: 8, length: 46, width: 17, bend: -6 },
  { deg: 112, length: 37, width: 14, bend: 6 },
  { deg: 300, length: 35, width: 14, bend: -5 },
  { deg: 243, length: 28, width: 12, bend: 4 },
]
fitted('Fibroblast (activated, stellate)', (g) => fibroCell(g, stellateField({ rx: 22, ry: 17, tilt: -8, processes: STAR, join: 9 }), {
  id: 'fibroblast', w: 11,
  nuclei: [{ x: 1.5, y: 1.5, size: 27, ratio: 0.66, turn: -8, nucleolus: true }],
  vesicles: [[-14, 8, 4.4], [15.5, 9.5, 4], [14.5, -8.5, 4], [-9, -10.5, 3.6]],
  shine: { length: 10, near: 20 },
}))

// ---------- 4. Myofibroblast ----------
// Contractile: spread like the stellate fibroblast, longer along one axis, its stress fibres of α-smooth muscle actin
// running end to end and anchored at the cell edge (a dot at each end, a focal adhesion), the cytoplasm warmer and deeper.
const MYO_STAR = [
  { deg: 186, length: 53, width: 19, bend: 4 },
  { deg: 4, length: 53, width: 19, bend: -4 },
  { deg: 128, length: 32, width: 13, bend: 5 },
  { deg: 302, length: 32, width: 13, bend: -5 },
  { deg: 58, length: 27, width: 11, bend: -4 },
]
fitted('Myofibroblast', (g) => fibroCell(g, stellateField({ rx: 28, ry: 16, tilt: -4, processes: MYO_STAR, join: 10 }), {
  id: 'myofibroblast', pal: MYO, w: 11,
  nuclei: [{ x: 1, y: 0, size: 23, ratio: 0.55, turn: -5, nucleolus: true }],
  fibres: { count: 5, spread: 11, turn: -2, width: 5, inset: 2.8 },
  shine: { length: 10, near: 24 },
}))

// ---------- 5. Fibroblast (secreting collagen) ----------
// The activated spindle making matrix: vesicles carry procollagen, and wavy collagen fibrils leave its right end.
fitted('Fibroblast (secreting collagen)', (g) => {
  const fd = activated({ length: 80, width: 30 })
  const tip = fd.at(1).p
  const fibrils = [[-22, 32], [-3, 38], [17, 31]].map(([deg, len], i) => {
    const d = rot([1, 0], deg), start = [tip[0] - d[0] * 7, tip[1] - d[1] * 7], mid = [start[0] + (d[0] * len) / 2, start[1] + (d[1] * len) / 2]
    return { ...collagen(g, { x: mid[0], y: mid[1], size: len, turn: deg, id: `collagen-${i + 1}`, pal: COLL, waves: 1.8, width: 11 }), end: [start[0] + d[0] * len, start[1] + d[1] * len] }
  })
  const r = fibroCell(g, fd, {
    id: 'fibroblast', w: 11,
    nuclei: [{ x: -6, y: 0.5, size: 27, ratio: 0.58, turn: -6, nucleolus: true }],
    vesicles: [[9, -5, 4.6], [13, 4.5, 4.4], [19.5, -1, 3.8], [-21, 5, 3.8]],
    shine: { length: 10, near: 20 },
    under: `<g id="collagen">${fibrils.map((c) => c.body).join('')}</g>\n`,
  })
  r.pts.push(...fibrils.map((c) => [g.X(c.end[0]), g.Y(c.end[1]), 8]))
  r.parts.push(['collagen', COLL])
  return r
})

// ---------- 6. Fibroblast (small) ----------
// A short spindle, about half the length of the resting one, its nucleus filling more of it. Drawn at the scale of the
// resting fibroblast, not filling the page, so that it reads as small beside the others.
fitted('Fibroblast (small)', (g) => fibroCell(g, spindleField({ length: 54, width: 15, bend: 2, taper: 1.2, shift: 0.04 }), {
  id: 'fibroblast', w: 10, nuclei: [{ x: 0.5, y: -1, size: 19, ratio: 0.44, turn: -3 }], shine: { length: 7, near: 20 },
}), { scale: familyScale })

// ---------- 7. Fibroblast (dividing) ----------
// Cytokinesis: two daughter spindles still joined at a narrow waist (the midbody), each with its new nucleus.
fitted('Fibroblast (dividing)', (g) => {
  const fd = spindleField({ length: 100, width: 23, bend: 3, taper: 1.2, waist: 0.2 })
  const r = fibroCell(g, fd, {
    id: 'fibroblast',
    nuclei: [fd.at(0.26), fd.at(0.74)].map(({ p: [x, y], deg }) => ({ x, y: y - 0.3, size: 18, ratio: 0.58, turn: deg })),
    shine: { length: 8, near: 40, lean: 1.2 },
  })
  const [mx, my] = fd.at(0.5).p
  r.body += `<g id="fibroblast-midbody">${g.circle(mx, my, 1.5, CYTO.outline)}</g>\n`
  return r
})

// ---------- 8. Fibroblast (fluorescent) ----------
// The resting spindle as it looks labelled with GFP: bright green, glowing (flat halos), the nucleus stained with DAPI.
fitted('Fibroblast (fluorescent)', (g) => fibroCell(g, resting(), {
  id: 'fibroblast', pal: GFP, nucPal: DAPI, nuclei: RESTING_NUC,
  glow: { steps: 3, gap: 3.4 }, shine: { length: 13, near: 30 },
}))

check()
console.log('written to', OUT)
