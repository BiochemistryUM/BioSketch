// Eight icons of SiliCoDraw's "Organisms" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson; see
// ../../LICENSE-SiliCoDraw.txt), the later drawings that replace the first where there are any, redrawn in the soft look
// of icon-drawings/STYLE.md from the shared parts: Pollen grain, Algae, Diatom, Volvox, Dinoflagellate, Coccolithophore,
// Microalga and Slime mould, the small life of water (and pollen) seen under the microscope. Each icon is one kind of the
// `micro` part of ../parts/organisms.mjs, which was drawn from these very SiliCoDraw icons, set alone on the page as
// SiliCoDraw sets it. Outlines at 60 % (setStrokeScale), gloss on: the closed round bodies (pollen grain, Volvox colony
// and its daughters, the Chlamydomonas cell, the coccolithophore's cell) carry the face-on gloss through the part.
// Parts used: micro (pollen, algae, diatom, volvox, dinoflagellate, coccolithophore, microalga, slime mould) and its
// palettes. Drawn here: nothing. Lettered: nothing (SiliCoDraw writes no labels on these).
// Usage: node orM.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page, setGloss } from '../cellkit.mjs'
import { toLch } from '../colour.mjs'
import { setStrokeScale } from '../shapes.mjs'
import { micro } from '../parts/organisms.mjs'

setStrokeScale(0.6)
setGloss(true)
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012: the coccoliths' calcite) are left out of the hue check; a palette used twice is listed once.
const icon = (name, [k, cx, cy], draw) => {
  const g = page(k, [cx, cy]), { defs, body, parts } = draw(g)
  const seen = parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base) === i)
  kit.cellType(name, seen, defs, body)
}
// Every icon: the kind at 460 px on the page, then fitted by what it really covers (measured on the rendered page): `fit`
// is [scale, x, y], the scale that brings the longer side to 460 px (margins 26 px) and the page point that was the
// middle of the drawing at 4.6, which is moved to the middle of the page.
const one = (name, kind, opts = {}, [s, mx, my] = [1, 256, 256]) =>
  icon(name, [4.6 * s, (mx - 256) / 4.6, (my - 256) / 4.6], (g) => micro(g, { x: 0, y: 0, size: 100, kind, id: kind.replace(/ /g, '-'), ...opts }))

// ---------- Pollen grain ----------
// A spiny grain seen face on: 22 spines round a glossy yellow wall with its sculpture of small dots, three furrows
// (colpi) and the pore in the middle (SiliCoDraw's own composition).
one('Pollen grain', 'pollen', {}, [1.013, 256, 256])

// ---------- Algae ----------
// Spirogyra: two unbranched filaments of cylindrical cells, each cell with its spiral chloroplast ribbon and pyrenoids,
// cross walls between the cells. SiliCoDraw's pale highlight line along each filament is left out (the set has none).
one('Algae', 'algae', {}, [1.031, 256, 256])

// ---------- Diatom ----------
// A pennate diatom in valve view: the frustule with its striae, the raphe along the middle and the central nodule, in
// the golden brown diatoms have (SiliCoDraw's default is a pale blue; fucoxanthin makes them brown).
one('Diatom', 'diatom', {}, [0.987, 256, 256])

// ---------- Volvox ----------
// A glossy colony sphere of tiny cells, four daughter colonies inside.
one('Volvox', 'volvox', {}, [1.009, 256, 256])

// ---------- Dinoflagellate ----------
// An armoured cell (theca) with its plates, the girdle groove round its middle with the transverse flagellum, and the
// trailing longitudinal flagellum; the dark spots are SiliCoDraw's.
one('Dinoflagellate', 'dinoflagellate', {}, [0.991, 256, 255])

// ---------- Coccolithophore ----------
// Emiliania-like: a green cell covered with oval calcite plates (coccoliths), one seen face on in front.
one('Coccolithophore', 'coccolithophore', {}, [1.127, 254, 258])

// ---------- Microalga ----------
// Chlamydomonas: an oval glossy cell with two flagella, the cup-shaped chloroplast with its pyrenoid, the nucleus (the
// lilac of every nucleus of the set) and the red eyespot, two contractile vacuoles at the front.
one('Microalga', 'microalga', {}, [1.024, 256, 260])

// ---------- Slime mould ----------
// The plasmodium of Physarum: a network of veins behind a fan-shaped advancing front.
one('Slime mould', 'slime mould', {}, [0.991, 255, 256])

check()
console.log('written')
