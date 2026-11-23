// Eight icons of SiliCoDraw's "Lab & equipment" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md from the lab parts in
// ../parts/lab.mjs: flask, culture flask, cell culture, reagent bottle, tube rack, well plate, pipette and multichannel
// pipette. Their compositions are read by hand from the source in a 100 × 100 box and scaled onto a 512 page (`page` of
// ../cellkit.mjs). Materials follow the conventions of lab.mjs: glass and plastic grey, caps and handles in the accent
// blue, liquids flat in their palettes (culture medium phenol red, a reagent green, water blue).
// Parts used: glassware (flask, bottle), petriDish (with cells), tube, wellPlate, pipette (single, multi).
// Drawn here because no part draws them: the culture flask (a T-flask lying down, its neck and vented cap angled up)
// and the rack the tubes stand in.
// Lettered: nothing; no original writes anything.
// Usage: node lb02.mjs <folder>
import { mkdirSync } from 'node:fs'
import { cellTypes, page } from '../cellkit.mjs'
import { toLch } from '../colour.mjs'
import { f } from '../shapes.mjs'
import { ACCENT, LIQUIDS, METAL, PLASTIC, glassware, objW, petriDish, pipette, tube, wellPlate } from '../parts/lab.mjs'

const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const kit = cellTypes(OUT), check = kit.check
// Greys (chroma below 0.012) are left out of the hue check: the materials of lab.mjs are greys on purpose.
const cellType = (name, parts, defs, body) => kit.cellType(name, parts.filter(([, p]) => toLch(p.base).c >= 0.012), defs, body)
const join = (...ps) => ({ defs: ps.map((p) => p.defs).join(''), body: ps.map((p) => p.body).join('\n'), parts: ps.flatMap((p) => p.parts) })
const icon = (name, { defs, body, parts }) => {
  const seen = new Set(), out = []
  for (const [n, p] of parts) if (!seen.has(p.base)) { seen.add(p.base); out.push([n, p]) }
  cellType(name, out, defs, body)
}

const K = 4.6 // 100 units = 460 px: margins of about 26 px on the longer side
const P2 = (g) => ([x, y]) => `${f(g.X(x))},${f(g.Y(y))}`
/** A closed polygon with rounded corners ([[x, y, r], …], their units), as a path on the page. */
const roundD = (g, corners) => {
  const n = corners.length, out = []
  for (let i = 0; i < n; i++) {
    const [x, y, r] = corners[i], a = corners[(i - 1 + n) % n], b = corners[(i + 1) % n]
    if (!r) { out.push([x, y]); continue }
    const la = Math.hypot(a[0] - x, a[1] - y), lb = Math.hypot(b[0] - x, b[1] - y), ta = Math.min(r / la, 0.5), tb = Math.min(r / lb, 0.5)
    const p0 = [x + (a[0] - x) * ta, y + (a[1] - y) * ta], p2 = [x + (b[0] - x) * tb, y + (b[1] - y) * tb]
    for (let j = 0; j <= 6; j++) { const t = j / 6; out.push([(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * x + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * y + t * t * p2[1]]) }
  }
  return `M${out.map(P2(g)).join(' L')}Z`
}
const line = (g, pts, colour, w) => `<path d="M${pts.map(P2(g)).join(' L')}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"/>`

// ---------------------------------------------------------------------------------------------------------------------
// Flask: an Erlenmeyer flask, a third full of a green reagent (SiliCoDraw's green). The part `glassware`, kind 'flask'.
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K, [0, 0])
  icon('Flask', glassware(g, { x: 0, y: 0, size: 100, kind: 'flask', liquid: 'reagent', level: 0.36, id: 'flask' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Culture flask: a T-flask lying flat with culture medium over its floor, its neck angled up at the left with a vented
// screw cap. (SiliCoDraw's slanted shoulder becomes a neck, so the cap sits on the flask's opening, not above its roof;
// the medium is phenol red, as every culture medium of the set, where SiliCoDraw's is green.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K * 0.95, [-1.5, -5])
  const W = objW(100 * g.k), fine = Math.max(1.5, W * 0.45), cw = W * 0.75, med = LIQUIDS.medium
  const a = (40 * Math.PI) / 180, ax = -Math.cos(a), ay = -Math.sin(a), nx = -ay, ny = ax // neck axis (up-left) and across it
  const B = [-24, -12], E = [B[0] + 16 * ax, B[1] + 16 * ay], hw = 9
  const at = (p, s, t) => [p[0] + s * ax + t * nx, p[1] + s * ay + t * ny]
  const body = [[50, -22, 7], [50, 30, 7], [-30, 30, 6], [-30, 0, 3], [...at(B, 0, -hw), 3], [...at(E, 0, -hw), 0], [...at(E, 0, hw), 0], [...at(B, 0, hw), 3], [-8, -22, 5]]
  // the medium: the body below y = 12
  const medium = [[50, 12, 0], [50, 30, 7], [-30, 30, 6], [-30, 12, 0]]
  const grad = g.grad('culture-flask-gradient', [-44, -30, 50, 30], PLASTIC)
  // the cap: a short ridged cylinder on the neck's end, its top a vent filter
  const capC = at(E, 7, 0), ang = 40
  const [cx, cy] = [g.X(capC[0]), g.Y(capC[1])], cl = 15 * g.k, cwid = 25 * g.k
  const cap = `<g id="cap" transform="rotate(${ang} ${f(cx)} ${f(cy)})"><rect x="${f(cx - cl / 2)}" y="${f(cy - cwid / 2)}" width="${f(cl)}" height="${f(cwid)}" rx="${f(3 * g.k)}" fill="url(#cap-gradient)" stroke="${ACCENT.outline}" stroke-width="${f(cw)}" stroke-linejoin="round"/>` +
    [-0.5, 0, 0.5].map((t) => `<path d="M${f(cx - cl / 2 + 3.5 * g.k)},${f(cy + t * cwid * 0.8)} H${f(cx + cl / 2 - 3.5 * g.k)}" stroke="${ACCENT.outline}" stroke-width="${f(fine)}" stroke-linecap="round"/>`).join('') + '</g>'
  const capGrad = `<linearGradient id="cap-gradient" x1="${f(cx - cl / 2)}" y1="${f(cy - cwid / 2)}" x2="${f(cx + cl / 2)}" y2="${f(cy + cwid / 2)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${ACCENT.base}"/><stop offset="1" stop-color="${ACCENT.shadow}"/></linearGradient>`
  const s = `<g id="flask"><path d="${roundD(g, body)}" fill="url(#culture-flask-gradient)"/>` +
    `<g id="medium"><path d="${roundD(g, medium)}" fill="${med.small}"/>${line(g, [[-29.5, 12], [49.5, 12]], med.outline, W * 0.5)}</g>` +
    `<path d="${roundD(g, [[0, -17, 2], [42, -17, 2], [42, -13.5, 2], [0, -13.5, 2]])}" fill="${PLASTIC.light}"/>` +
    `<path d="${roundD(g, body)}" fill="none" stroke="${PLASTIC.outline}" stroke-width="${f(W)}" stroke-linejoin="round"/>` +
    line(g, [at(E, 0, -hw - 1.5), at(E, 0, hw + 1.5)], PLASTIC.outline, cw) + '</g>'
  icon('Culture flask', { defs: grad + capGrad, body: s + '\n' + cap, parts: [['flask', PLASTIC], ['medium', med], ['cap', ACCENT]] })
}

// ---------------------------------------------------------------------------------------------------------------------
// Cell culture: a dish from above with adherent cells (the generic cell, with lilac nuclei) in phenol-red medium.
// (SiliCoDraw's dish is empty around its cells; here it holds medium, as a living culture does.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K, [0, 0])
  icon('Cell culture', petriDish(g, { x: 0, y: 0, size: 100, fill: 'medium', cells: 8, id: 'dish' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Reagent bottle: a media bottle with a blue screw cap, a paper label and a green reagent. The part `glassware`, 'bottle'.
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K, [0, 0])
  icon('Reagent bottle', glassware(g, { x: 0, y: 0, size: 100, kind: 'bottle', liquid: 'reagent', level: 0.62, id: 'bottle' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Tube rack: four test tubes of a blue sample standing in a grey rack (the rack's front panel covers their lower part,
// with the edge of its top plate as a line). Tubes are the part `tube`; the rack is drawn here, in METAL's grey.
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K, [0, -3.5])
  const tubes = [-33, -11, 11, 33].map((x, i) => tube(g, { x, y: -13, size: 54, kind: 'test', liquid: 'water', level: 0.68, id: `tube${i + 1}` }))
  const W = objW(96 * g.k)
  const rack = `<g id="rack"><path d="${roundD(g, [[-48, -6, 4], [48, -6, 4], [48, 34, 5], [-48, 34, 5]])}" fill="url(#rack-gradient)" stroke="${METAL.outline}" stroke-width="${f(W)}" stroke-linejoin="round"/>` +
    line(g, [[-48, 5], [48, 5]], METAL.outline, W * 0.6) +
    `<path d="${roundD(g, [[-42, -2.2, 1.2], [42, -2.2, 1.2], [42, 0.4, 1.2], [-42, 0.4, 1.2]])}" fill="${METAL.light}"/></g>`
  icon('Tube rack', join(...tubes, { defs: g.grad('rack-gradient', [-48, -6, 48, 34], METAL), body: rack, parts: [['rack', METAL]] }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Well plate: a 24-well plate from above, most wells filled with a blue sample, as SiliCoDraw's. The part `wellPlate`.
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K, [0, 0])
  icon('Well plate', wellPlate(g, { x: 0, y: 0, size: 100, rows: 4, cols: 6, filled: 'some', liquid: 'water', id: 'plate' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Pipette: an air-displacement pipette with its blue handle, plunger and tip. The part `pipette`, kind 'single'.
// (A little sample in the tip, which SiliCoDraw leaves empty.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K, [2, 0])
  icon('Pipette', pipette(g, { x: 0, y: 0, size: 100, liquid: 'water', level: 0.3, id: 'pipette' }))
}

// ---------------------------------------------------------------------------------------------------------------------
// Multichannel pipette: the blue handle over a manifold carrying eight tips. The part `pipette`, kind 'multi'.
// (Eight channels, as SiliCoDraw's search words say; its drawing shows seven.)
// ---------------------------------------------------------------------------------------------------------------------
{
  const g = page(K, [0, -7.6])
  icon('Multichannel pipette', pipette(g, { x: 0, y: 0, size: 100, kind: 'multi', channels: 8, liquid: 'water', level: 0.25, id: 'pipette' }))
}

check()
console.log('written to', OUT)
