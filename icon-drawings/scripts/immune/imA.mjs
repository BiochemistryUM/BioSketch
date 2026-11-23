// Eight icons of SiliCoDraw's "Immunology & infection" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David
// Carlsson; see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the shared parts
// of the category in ../parts/immune.mjs: three viruses (SARS-CoV-2, HIV, influenza), a pandemic (a globe with hot spots
// and viruses spreading), CMV memory inflation (a herpesvirus and a growing clone of CD8 T cells), opsonisation (a
// bacterium coated with antibodies held by a phagocyte's Fc receptors), a vaccine (vial and syringe) and the weaker
// antibody response to a vaccine in old age.
// Drawn here, as no part draws them: the globe (a flat map: ocean, continents, meridians; no gloss), the phagocyte's
// cup with its pseudopods and Fc receptors (a cell, glossed).
// Lettered (strokes, letters.mjs): "8" on the nuclei of the CD8 T cells, as the lymphocyte part does it.
// The current look: outlines at 60 % (setStrokeScale), the gloss on (setGloss): viruses, bacteria and cells glossed by
// their parts; the globe, the vial, the syringe and the bars are objects or data and stay unglossed.
// Usage: node imA.mjs <folder>
import { NUC, cellTypes, page, setGloss } from '../cellkit.mjs'
import { soft, toLch } from '../colour.mjs'
import { f, setStrokeScale, strokeScale } from '../shapes.mjs'
import { ANTIBODY, VIRUS, antibodyCoat, lymphocyte, microbe, virus } from '../parts/immune.mjs'
import { plot } from '../parts/assays.mjs'
import { INK, syringe, tube } from '../parts/lab.mjs'
import { antibody } from '../parts/molecules.mjs'
import { arrow, cellW } from '../parts/tissue.mjs'
import { gloss, glossTones, pathPoints } from '../parts/surfaces.mjs'
import { mkdirSync } from 'node:fs'

const OUT = process.argv[2]
setStrokeScale(0.6)
setGloss(true)
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT)
// Greys (materials, ink) are left out of the hue check, as the conventions of lab.mjs say; a palette used twice is one
// part that recolours as one, so it is listed once.
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p], i) => toLch(p.base).c >= 0.012 && parts.findIndex(([, q]) => q.base === p.base) === i), defs, body)
const icon = (name, ...ps) => cellType(name, ps.flatMap((p) => p.parts ?? []), ps.map((p) => p.defs ?? '').join(''), ps.map((p) => p.body).join('\n'))
const join = (...ps) => ({ defs: ps.map((p) => p.defs ?? '').join(''), body: ps.map((p) => p.body).join(''), parts: ps.flatMap((p) => p.parts ?? []) })
const grad = (id, [x0, y0, x1, y1], a, b) => `<linearGradient id="${id}" x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`
/** The gloss of a body drawn here (as the parts do it): its fill ends in the gloss's end tone, the tones over it. */
const glossed = (d, pal, w) => {
  const G = gloss({ fills: [pathPoints(d)] }, { inset: (w * strokeScale()) / 2 }), T = glossTones(pal)
  return ['shade', 'shadow', 'lit', 'highlight'].map((k) => (G[k] ? `<path d="${G[k]}" fill="${T[k]}"/>` : '')).join('')
}

const g = page(4.6, [0, 0]) // 100 units across are 460 px: margins about 26

// ---------- the three viruses: each is the virus part of its kind, alone ----------
icon('Coronavirus', virus(g, { x: 0, y: 0, size: 100, kind: 'corona', id: 'coronavirus' }))
icon('HIV', virus(g, { x: 0, y: 0, size: 100, kind: 'hiv', id: 'hiv' }))
icon('Influenza virus', virus(g, { x: 0.9, y: -2, size: 100, kind: 'influenza', id: 'influenza' }))

// ---------- Pandemic: a globe with hot spots of infection, viruses spreading from it ----------
{
  const OCEAN = soft(228), LAND = soft(140), HOT = VIRUS.spike
  const cx = -5, cy = 6, R = 37, w = 6
  const G = (x, y) => g.P([x, y])
  const ocean = `M${f(g.X(cx - R))},${f(g.Y(cy))} A${f(R * g.k)},${f(R * g.k)} 0 1 0 ${f(g.X(cx + R))},${f(g.Y(cy))} A${f(R * g.k)},${f(R * g.k)} 0 1 0 ${f(g.X(cx - R))},${f(g.Y(cy))} Z`
  // Meridians and parallels (SiliCoDraw's: one meridian ellipse, the equator and two parallels), clipped by drawing
  // them inside the globe only.
  const k = g.k, ex = 15 * k * (R / 36)
  const grid = `M${f(g.X(cx))},${f(g.Y(cy - R))} A${f(ex)},${f(R * k)} 0 0 0 ${f(g.X(cx))},${f(g.Y(cy + R))} A${f(ex)},${f(R * k)} 0 0 0 ${f(g.X(cx))},${f(g.Y(cy - R))}` +
    [0, -18, 18].map((v) => { const h = Math.sqrt(R * R - (v * R / 36) ** 2) - 1; return `M${f(g.X(cx - h))},${f(g.Y(cy + v * R / 36))} L${f(g.X(cx + h))},${f(g.Y(cy + v * R / 36))}` }).join(' ')
  const sc = R / 36, T = (p) => g.smooth(p.map(([x, y]) => [cx + x * sc, cy + y * sc]))
  const land = [
    T([[-26, -22], [-14, -28], [-4, -24], [-6, -14], [-14, -8], [-18, -2], [-24, -8], [-30, -12]]),
    T([[-14, 2], [-4, 4], [-2, 12], [-8, 24], [-12, 30], [-14, 18], [-18, 8]]),
    T([[8, -26], [18, -24], [22, -16], [16, -10], [24, -4], [26, 8], [18, 20], [12, 24], [10, 12], [4, 2], [6, -10], [4, -18]]),
  ]
  // Hot spots: a pale ring round a dot, in the colour of the virus's spikes (where the virus is).
  const hot = [[-22, -12, 1], [14, 0, 1.15], [-10, 18, 0.9]].map(([x, y, s]) => g.circle(cx + x * sc, cy + y * sc, 6.2 * s, HOT.light, HOT.small, 2.5) + g.circle(cx + x * sc, cy + y * sc, 2.8 * s, HOT.outline)).join('')
  const globe = {
    defs: grad('globe-gradient', [g.X(cx - R), g.Y(cy - R), g.X(cx + R), g.Y(cy + R)], OCEAN.base, OCEAN.shadow) + grad('land-gradient', [g.X(cx - R), g.Y(cy - R), g.X(cx + R), g.Y(cy + R)], LAND.base, LAND.shadow),
    body: `<g id="globe"><g id="globe-ocean"><path d="${ocean}" fill="url(#globe-gradient)"/><path d="${grid}" fill="none" stroke="${OCEAN.small}" stroke-width="3" stroke-linecap="round"/></g>` +
      `<g id="globe-land"><path d="${land.join(' ')}" fill="url(#land-gradient)" stroke="${LAND.outline}" stroke-width="4" stroke-linejoin="round"/></g>` +
      `<g id="globe-hot-spots">${hot}</g><g id="globe-rim"><path d="${ocean}" fill="none" stroke="${OCEAN.outline}" stroke-width="${w * 1.6}"/></g></g>`,
    parts: [['ocean', OCEAN], ['land', LAND], ['hot spots', HOT]],
  }
  const v1 = virus(g, { x: 30, y: -31, size: 30, id: 'virus-1' })
  const v2 = virus(g, { x: -38, y: -35, size: 17, id: 'virus-2' })
  const v3 = virus(g, { x: 38, y: 31, size: 15, id: 'virus-3' })
  icon('Pandemic', globe, v1, v2, v3)
}

// ---------- CMV memory inflation: a herpesvirus (CMV) and a clone of CD8 T cells that keeps growing ----------
{
  const cmv = virus(g, { x: -23, y: -21, size: 50, kind: 'herpes', id: 'cmv' })
  const cells = [[-3, 1], [18, 2], [39, 4]].flatMap(([x, n], j) => Array.from({ length: n }, (_, k) => lymphocyte(g, { x, y: 36 - k * 21.5, size: 21, kind: 'T', letter: '8', id: `cd8-${j + 1}-${k + 1}` })))
  const up = arrow(g, { points: [[-41, 46], [-41, 4]], colour: INK, id: 'expansion-arrow' })
  icon('CMV memory inflation', cmv, ...cells, up)
}

// ---------- Opsonisation: antibodies coat a bacterium; a phagocyte's Fc receptors hold their stems ----------
{
  const bug = microbe(g, { x: 0, y: -18, size: 52, flagellum: false, id: 'bacterium' })
  const coat = antibodyCoat(g, { x: 0, y: -18, size: 52, aspect: 0.42, facing: 'in', length: 26, angles: [-24, 24, -64, 64, 156, 204], id: 'opsonins' })
  // The phagocyte: a broad cup whose two pseudopods reach up beside the bacterium (SiliCoDraw's outline), its nucleus
  // low in the middle. Pale blue, as in SiliCoDraw (a macrophage's green would be 20° from the bacterium).
  const PH = soft(250), w = cellW(420), up = (pts) => pts.map(([x, y]) => [x, y - 7])
  const cup = g.smooth(up([[-44, 46], [-47.5, 34], [-47.5, 18], [-46, 2], [-43, -14], [-38.5, -15], [-36, -2], [-29, 12], [-15, 19.5], [0, 20.5], [15, 19.5], [29, 12], [36, -2], [38.5, -15], [43, -14], [46, 2], [47.5, 18], [47.5, 34], [44, 46], [22, 48.5], [0, 49], [-22, 48.5]]))
  const nuc = g.smooth(up([[-20, 36], [-8, 32.5], [4, 34], [16, 32.5], [22, 37.5], [14, 43], [0, 41], [-14, 43.5]]))
  const T = glossTones(PH)
  // Fc receptors: small cups on the surface under the two lower antibodies.
  const fc = [-10.5, 10.5].map((x) => g.line(up([[x, 20], [x, 16]]), PH.outline, 7) + g.line(up([[x - 4.2, 10.5], [x - 4.2, 16], [x + 4.2, 16], [x + 4.2, 10.5]]), PH.outline, 7)).join('')
  const phago = {
    defs: grad('phagocyte-gradient', [g.X(-48), g.Y(-22), g.X(48), g.Y(42)], PH.base, T.end),
    body: `<g id="phagocyte"><g id="phagocyte-cytoplasm"><path d="${cup}" fill="url(#phagocyte-gradient)" stroke="${PH.outline}" stroke-width="${w}" stroke-linejoin="round"/>${glossed(cup, PH, w)}</g>` +
      `<g id="phagocyte-nucleus"><path d="${nuc}" fill="${NUC.base}" stroke="${NUC.outline}" stroke-width="${f(w * 0.8)}" stroke-linejoin="round"/></g><g id="phagocyte-Fc-receptors">${fc}</g></g>`,
    parts: [['phagocyte', PH], ['nucleus', NUC]],
  }
  icon('Opsonisation', phago, bug, coat)
}

// ---------- Vaccine: a vial with a rubber stopper and a syringe drawing up a dose ----------
{
  const vial = tube(g, { x: -30.5, y: 0.5, size: 84, kind: 'vial', cap: 'stopper', material: 'glass', liquid: 'reagent', level: 0.5, label: true, id: 'vial' })
  const syr = syringe(g, { x: 17.5, y: -3.5, size: 94, turn: -36, liquid: 'reagent', level: 0.45, id: 'syringe' })
  icon('Vaccine', vial, syr)
}

// ---------- Vaccine response in old age: a dose, then antibodies; the older person's titre falls short ----------
{
  const PL = { x: 15, y: 11, size: 72 }
  const bars = plot(g, { ...PL, card: false, aspect: 0.9, id: 'titre', series: [
    { kind: 'bars', data: [[0.27, 0.88]], pal: ANTIBODY, barWidth: 26 },
    { kind: 'gate', data: [[0.73 - 0.13, 0.03], [0.73 + 0.13, 0.03], [0.73 + 0.13, 0.88], [0.73 - 0.13, 0.88]], pal: ANTIBODY },
    { kind: 'bars', data: [[0.73, 0.36]], pal: ANTIBODY, barWidth: 26 },
  ] })
  const y1 = antibody(g, { x: 3.5, y: -32, size: 19, pal: ANTIBODY, id: 'antibody-young' })
  const y2 = antibody(g, { x: 30, y: -2, size: 15, pal: ANTIBODY, id: 'antibody-old' })
  const syr = syringe(g, { x: -33, y: -2, size: 68, turn: -18, liquid: 'reagent', level: 0.55, id: 'syringe' })
  icon('Vaccine response in old age', bars, y1, y2, syr)
}

kit.check()
console.log('written', OUT)
