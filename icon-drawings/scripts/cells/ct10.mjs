// Eight icons of SiliCoDraw's "Cells & tissues" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md with the kit in ../cellkit.mjs:
// signalling (G protein, calcium signalling, caspase, JAK-STAT, Notch signalling), IVF and two stained sections (H and E,
// TUNEL). Their shapes are read by hand from the source in a 100 × 100 box centred on 0,0 and scaled onto a 512 page.
// Nothing is lettered: SiliCoDraw names the subunits, GTP, Ca²⁺, JAK, STAT, Delta and Notch in letters; here each is a
// shape of its own colour, and a phosphate is a small mustard dot (see each icon).
// The four signalling icons with a membrane use the lipids of ct02.mjs (`lipids`, copied here and given a scale, since
// a receptor, its partners and a nucleus must fit beside it), receptors drawn like ct02's Receptor and the nucleus of
// ct01.mjs (an envelope with pores).
// Usage: node ct10.mjs <folder>
import { BLUE, NUC, PEACH, cellTypes, circleD, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex } from '../colour.mjs'
import { f } from '../shapes.mjs'

const OUT = process.argv[2]
const { cellType, check } = cellTypes(OUT)

// The hues of the set (OKLCH degrees). The nucleus lilac is about 319°, the lipids' peach 52°.
const PROTEIN = hueOf('#4f6bb8') // membrane proteins: receptors and channels (267°)
const ALPHA = hueOf('#5fae8b') // Gα, JAK and Notch keep SiliCoDraw's green (163°)
const BETA = hueOf('#b07cc6') // Gβ keeps SiliCoDraw's purple (315°): no nucleus in that icon
const GAMMA = 12 // Gγ: SiliCoDraw's orange (57°) is the peach of the lipids; moved to coral
const PHOSPHATE = 92 // GTP and phosphates: SiliCoDraw's yellow (96°), a little towards amber
const ION = 165 // ions and small ligands, as in ct02.mjs
const CYTOKINE = 225 // a secreted signal is blue; 42° from the receptor's blue
const STAT = 0 // SiliCoDraw's lilac (315°) is the nucleus; moved to rose
const DELTA = 92 // SiliCoDraw's orange (57°) is the peach of the lipids; moved to amber
const CASPASE = hueOf('#f6d0dc') // 357°
const CHAIN = 75 // a protein chain is amber, as in ct01.mjs
const OOCYTE = PEACH, ZONA = 235, SPERM = 185 // the approved Oocyte; its sperm moved from blue (245°) away from the zona
// Greys have no hue to speak of (BioSketch leaves them out of "Shades follow"); theirs is set clear of the other parts
// only so that `check()` stays quiet.
const GLASS = 120, FIELD = 215
const EOSIN = 357, HAEMATOXYLIN = 295, TUNEL = hueOf('#5fae8b'), COUNTERSTAIN = 265

/** A palette with almost no colour (below the chroma at which BioSketch groups shades): glass, steel, a slide. */
const grey = (h) => ({
  light: toHex({ l: 0.985, c: 0.003, h }),
  base: toHex({ l: 0.95, c: 0.006, h }),
  shadow: toHex({ l: 0.89, c: 0.008, h }),
  small: toHex({ l: 0.8, c: 0.009, h }),
  outline: toHex({ l: 0.58, c: 0.011, h }),
})
/** One gradient that lights every shape that uses it from its own top left (several beads, heads, cells, nuclei). */
const boxGrad = (id, pal) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`
/** A rounded rectangle given in their units, as a path on the page. */
const rrect = (g, x, y, w, h, r) => {
  const [x0, y0] = g.P([x, y]), W = w * g.k, H = h * g.k, R = Math.min(r * g.k, W / 2, H / 2)
  return `M${f(x0 + R)},${f(y0)} H${f(x0 + W - R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + W)},${f(y0 + R)} V${f(y0 + H - R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + W - R)},${f(y0 + H)} H${f(x0 + R)} A${f(R)},${f(R)} 0 0 1 ${f(x0)},${f(y0 + H - R)} V${f(y0 + R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + R)},${f(y0)} Z`
}
/** A plain rectangle given in their units, as a path on the page. */
const rect = (g, x0, y0, x1, y1) => `M${f(g.X(x0))},${f(g.Y(y0))} H${f(g.X(x1))} V${f(g.Y(y1))} H${f(g.X(x0))} Z`
/** An open curve given in their units (M, L and C only), drawn as a line with round ends; width in pixels. */
const curve = (g, d, colour, w) => `<path d="${g.D(d)}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"/>`
/** An open line through points in their units, as an item of g.union, `width` in pixels. */
const stroke = (g, pts, width) => ({ d: `M${pts.map(g.P).map(([x, y]) => `${f(x)},${f(y)}`).join(' L')}`, width })
/** A triangle arrowhead with its tip at `to`, pointing away from `from` (their units); length and width in units. */
const head = (g, from, to, len, wide, fill) => {
  const [x0, y0] = from, [x1, y1] = to, d = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / d, uy = (y1 - y0) / d
  const bx = x1 - ux * len, by = y1 - uy * len
  const pts = [[x1, y1], [bx - (uy * wide) / 2, by + (ux * wide) / 2], [bx + (uy * wide) / 2, by - (ux * wide) / 2]].map(g.P)
  return `<path d="M${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' L')}Z" fill="${fill}" stroke="${fill}" stroke-width="3" stroke-linejoin="round"/>`
}
/** An arrow from `a` to `b` (their units): a round-capped line that stops under its head, then the head. */
const arrow = (g, a, b, colour, w, len = 7, wide = 8) => {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]), t = (d - len * 0.6) / d
  return g.line([a, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]], colour, w) + head(g, a, b, len, wide, colour)
}
/** A round body with a gradient of its own (`id`), an outline and a highlight scaled to its size. */
const ball = (g, id, x, y, r, pal, w, hl = true) =>
  g.circle(x, y, r, `url(#${id})`, pal.outline, w) + (hl ? g.hl(x - r * 0.42, y - r * 0.45, f(r * g.k * 0.26), f(r * g.k * 0.1), -45, pal.light) : '')
const ballGrad = (g, id, x, y, r, pal) => g.grad(id, [x - r, y - r, x + r, y + r], pal)

// ---------- the membrane of ct02.mjs ----------
// A lipid is a round head and two tails; behind the tails a pale band, the oily inside of the membrane. `s` scales the
// lipids of ct02 (heads 6.5 in radius, 15 apart, rows 19 from the middle); `vertical` turns the membrane upright.
const LIPID = soft(PEACH)
const lipidDefs = boxGrad('lipid-gradient', LIPID)
/** A membrane about `mid` (y, or x when vertical): lipids at each place `us` along it, the band over each stretch of `bands`. */
const lipids = (g, us, mid, bands, s = 1, vertical = false) => {
  const HEAD = 6.5 * s, ROWS = 19 * s, TAIL = 2.6 * s, w = f(Math.max(4, 6 * s))
  const at = (u, v) => (vertical ? [mid + v, u] : [u, mid + v])
  const tails = us.flatMap((u) => [-TAIL, TAIL].flatMap((du) => [-1, 1].map((sd) => g.line([at(u + du, sd * (ROWS - 5 * s)), at(u + du, sd * 2.2 * s)], LIPID.outline, w))))
  const heads = us.flatMap((u) => [-1, 1].map((sd) => g.circle(...at(u, sd * ROWS), HEAD, 'url(#lipid-gradient)', LIPID.outline, w)))
  const band = ([u0, u1]) => { const [a, b] = [at(u0, -ROWS), at(u1, ROWS)]; return g.path(rect(g, Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])), LIPID.base) }
  return `<g id="membrane"><g id="membrane-core">${bands.map(band).join('')}</g><g id="lipid-tails">${tails.join('')}</g><g id="lipid-heads">${heads.join('')}</g></g>`
}
/** Evenly spaced places from a to b, `step` apart, leaving out those within `gap` of any of `skip`. */
const places = (a, b, step, skip = [], gap = 0) => {
  const out = []
  for (let u = a; u <= b + 1e-6; u += step) if (!skip.some(([s0, s1]) => u > s0 - gap && u < s1 + gap)) out.push(f(u))
  return out
}

// ---------- the nucleus of ct01.mjs, smaller: the envelope, its pores as gaps in the inner membrane ----------
/** A circle of `n` dashes with round ends (radius in their units, width in pixels; `share` of each step is drawn). */
const dashes = (g, x, y, r, n, share, colour, w) => {
  const step = (2 * Math.PI * r * g.k) / n
  return `<circle cx="${f(g.X(x))}" cy="${f(g.Y(y))}" r="${f(r * g.k)}" fill="none" stroke="${colour}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${f(step * share - w)} ${f(step * (1 - share) + w)}"/>`
}
const envelope = (g, x, y, r) =>
  `<g id="nucleus">${g.circle(x, y, r, NUC.light, NUC.outline, 10)}${g.circle(x, y, r * 0.86, 'url(#nucleus-gradient)')}${dashes(g, x, y, r * 0.85, 10, 0.72, NUC.outline, 6)}` +
  `${g.circle(x + r * 0.2, y + r * 0.15, r * 0.28, deep(toHexHue(NUC)).base)}${g.hl(x - r * 0.4, y - r * 0.55, f(r * g.k * 0.42), f(r * g.k * 0.13), -30, NUC.light)}</g>`
const envelopeGrad = (g, x, y, r) => g.grad('nucleus-gradient', [x - r, y - r, x + r, y + r], NUC)
function toHexHue(pal) { return hueOf(pal.base) }

// ---------- G protein ----------
// A G protein-coupled receptor (four helices for its seven, blue) in the membrane, and under it the heterotrimeric G
// protein: Gα (green) holding GTP, Gβ (purple) and the small Gγ (coral), each touching the membrane they are anchored to.
// (SiliCoDraw writes α, β, γ and "GTP"; the three subunits are three colours, and GTP is a small yellow nucleotide with
// three phosphates. SiliCoDraw's four short sticks above the membrane are taken for the receptor and set across it.)
{
  const g = page(4.72, [-2.6, -15.4]), receptor = soft(PROTEIN), alpha = soft(ALPHA), beta = soft(BETA), gamma = soft(GAMMA), gtp = deep(PHOSPHATE)
  const mid = -29, s = 0.72, rods = [-26.5, -19, -11.5, -4]
  const helices = [
    ...rods.map((x) => rrect(g, x - 3.2, -50, 6.4, 41, 3.2)),
    stroke(g, [[-26.5, -12], [-22.75, -8.2], [-19, -12]], f(5 * g.k)), stroke(g, [[-19, -47], [-15.25, -50.5], [-11.5, -47]], f(5 * g.k)), stroke(g, [[-11.5, -12], [-7.75, -8.2], [-4, -12]], f(5 * g.k)),
  ]
  cellType('G protein', [['membrane', LIPID], ['receptor', receptor], ['G alpha', alpha], ['G beta', beta], ['G gamma', gamma], ['GTP', gtp]],
    lipidDefs + g.grad('receptor-gradient', [-30, -51, 0, -8], receptor) + ballGrad(g, 'alpha-gradient', -15, 7, 16, alpha) + ballGrad(g, 'beta-gradient', 14, 1, 12.5, beta) + ballGrad(g, 'gamma-gradient', 31, 0, 7.5, gamma),
    lipids(g, [...places(-46, -35, 10.8), ...places(8.5, 47, 10.8)], mid, [[-49, 44]], s) + '\n' +
      `<g id="receptor">${g.union(helices, 'url(#receptor-gradient)', receptor.outline, 8)}${g.hl(-21, -40, 3, 14, 0, receptor.light)}</g>\n` +
      `<g id="g-gamma">${ball(g, 'gamma-gradient', 31, 0, 7.5, gamma, 8)}</g>\n` +
      `<g id="g-beta">${ball(g, 'beta-gradient', 14, 1, 12.5, beta, 10)}</g>\n` +
      `<g id="g-alpha">${ball(g, 'alpha-gradient', -15, 7, 16, alpha, 10)}</g>\n` +
      `<g id="GTP">${g.circle(-22.5, 12.5, 4.4, gtp.base)}${[[-16, 14.6], [-10.4, 16.2], [-4.8, 17.6]].map(([x, y]) => g.circle(x, y, 2.9, gtp.small)).join('')}</g>`)
}

// ---------- Calcium signalling ----------
// The membrane of the endoplasmic reticulum, upright, its lumen (the calcium store) at the left; a channel (the IP3
// receptor, blue) lets calcium ions (green, as every ion) out into the cytosol, where they spread as a wave.
// (SiliCoDraw draws the ER as a blob and the ions as rings with "+" in them, and writes "ER" and "Ca²⁺"; here the
// membrane is the lipid membrane of the set with the store full of ions behind it, the ions are plain dots and the
// wave is two arcs.)
{
  const g = page(4.4, [2.4, 0]), channel = soft(PROTEIN), ion = deep(ION), lumen = LIPID
  const mid = -16, s = 0.7
  const arc = (r, a0, a1) => { const n = 24; return Array.from({ length: n + 1 }, (_, i) => { const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180; return [6 + r * Math.cos(a), r * Math.sin(a)] }) }
  cellType('Calcium signalling', [['ER membrane', LIPID], ['channel', channel], ['calcium', ion]],
    lipidDefs + boxGrad('channel-gradient', channel),
    `<g id="lumen">${g.path(rrect(g, -50, -45, 34, 90, 10), lumen.base)}</g>\n` +
      lipids(g, places(-42, 42, 10.5, [[-15, 15]]), mid, [[-45, 45]], s, true) + '\n' +
      `<g id="channel">${[-15.5, 4.5].map((y) => g.path(rrect(g, -37, y, 42, 11, 5.5), 'url(#channel-gradient)', channel.outline, 9) + g.hl(-24, y + 3, 22, 3.5, 0, channel.light)).join('')}</g>\n` +
      `<g id="calcium">${[[-43, -36], [-44, -16], [-42, 22], [-44, 38], [-41, 4]].map(([x, y]) => g.circle(x, y, 3.6, ion.small)).join('')}${g.circle(-16, 0, 3.6, ion.small)}` +
      `${[[13, -4], [17, 11], [24, -16], [29, 4], [27, 22], [39, -26], [41, -6], [42, 14], [36, 33]].map(([x, y]) => g.circle(x, y, 3.6, ion.small)).join('')}` +
      `${[arc(36, -60, 60), arc(48, -50, 50)].map((p) => g.line(p, ion.base, 6)).join('')}</g>`)
}

// ---------- Caspase ----------
// The enzyme (rose) with its active site, and scissors cutting a protein chain (amber) in two: caspases are proteases.
// (SiliCoDraw's substrate is a plain blue bar over open scissors; here it is a chain of amber beads in two pieces, the
// cut between them.)
{
  const g = page(4.83, [0.7, -10.9]), enzyme = soft(CASPASE), chain = rich(CHAIN), steel = grey(260)
  const bead = (pts) => pts.map(([x, y]) => g.circle(x, y, 3.6, 'url(#chain-gradient)', chain.outline, 6)).join('')
  cellType('Caspase', [['caspase', enzyme], ['substrate', chain], ['scissors', steel]],
    g.grad('enzyme-gradient', [-44, -28, 10, 22], enzyme) + boxGrad('chain-gradient', chain),
    `<g id="caspase">${g.path(g.smooth([[-44, 0], [-30, -22], [-6, -28], [10, -14], [6, 6], [-10, 22], [-32, 20], [-44, 10]]), 'url(#enzyme-gradient)', enzyme.outline, 12)}` +
      `${g.hl(-29, -14, 24, 8, -35, enzyme.light)}${g.path(g.smooth([[-24, -2], [-18, -6], [-12, -3], [-12, 4], [-18, 6], [-23, 4]]), enzyme.small)}</g>\n` +
      `<g id="scissors">${g.line([[13, -36], [34, 10]], steel.outline, 12)}${g.line([[33, -36], [12, 10]], steel.outline, 12)}` +
      `${[[10, 17], [36, 17]].map(([x, y]) => g.circle(x, y, 6.5, steel.light, steel.outline, 9)).join('')}${g.circle(23, -12.3, 2.2, steel.small)}</g>\n` +
      `<g id="substrate">${bead([[2, -36], [8, -39.5], [14, -42]])}${bead([[32, -42], [38, -39.5], [44, -36]])}</g>`)
}

// ---------- JAK-STAT ----------
// A cytokine (blue) bound by a receptor of two chains across the membrane; a JAK kinase (green) on each chain inside the
// cell; below, two STAT proteins (rose), each carrying a phosphate (mustard dot), joined as a dimer and on their way to
// the nucleus. (SiliCoDraw writes "JAK" on the kinases and "STAT dimer → nucleus" under the dimer: the kinases are known
// by their place on the receptor, the words are an arrow and a nucleus.)
{
  const g = page(4.52, [-0.9, -2.1]), receptor = soft(PROTEIN), cytokine = deep(CYTOKINE), jak = soft(ALPHA), stat = soft(STAT), phos = deep(PHOSPHATE)
  const mid = -25, s = 0.62, rx = -20, nx = 36, ny = 35, nr = 12.5
  const chains = [-1, 1].map((sd) => ({ d: g.D(`M${rx + sd * 7},0 L${rx + sd * 7},-34 C${rx + sd * 7},-39 ${rx + sd * 11},-42 ${rx + sd * 15},-48`), width: f(6.4 * g.k) }))
  // One STAT, about its middle; the dimer is two of them side by side, a phosphate on each where they hold each other.
  const statShape = [[-4, -5.7], [5, -8.7], [7, -0.7], [4, 7.3], [-4, 7.3], [-8, 0.3]], stats = [[-3, 17], [10, 20]]
  cellType('JAK-STAT', [['membrane', LIPID], ['receptor', receptor], ['cytokine', cytokine], ['JAK', jak], ['STAT', stat], ['phosphate', phos], ['nucleus', NUC]],
    lipidDefs + g.grad('receptor-gradient', [rx - 16, -48, rx + 16, 1], receptor) + ballGrad(g, 'cytokine-gradient', rx, -44, 6.8, cytokine) +
      boxGrad('jak-gradient', jak) + boxGrad('stat-gradient', stat) + envelopeGrad(g, nx, ny, nr),
    lipids(g, [...places(-47, -34, 9.3), ...places(-3.5, 48, 9.3)], mid, [[-50, 46]], s) + '\n' +
      `<g id="receptor">${g.union(chains, 'url(#receptor-gradient)', receptor.outline, 8)}${[rx - 8.6, rx + 5.4].map((x) => g.hl(x, -18, 2.6, 15, 0, receptor.light)).join('')}</g>\n` +
      `<g id="cytokine">${ball(g, 'cytokine-gradient', rx, -44, 6.8, cytokine, 8)}</g>\n` +
      `<g id="JAK">${[rx - 14.5, rx + 14.5].map((x) => g.ellipse(x, -3, 6.2, 7.5, 0, 'url(#jak-gradient)', jak.outline, 8) + g.hl(x - 2.4, -6.5, 5, 2.4, -50, jak.light)).join('')}</g>\n` +
      `<g id="arrow">${arrow(g, [18, 26], [27, 29.5], stat.outline, 8, 6.5, 8)}</g>\n` +
      `<g id="STAT">${stats.map(([x, y]) => g.path(g.smooth(statShape.map(([u, v]) => [x + u, y + v])), 'url(#stat-gradient)', stat.outline, 8) + g.hl(x - 2, y - 4.2, 7, 2.6, -25, stat.light)).join('')}</g>\n` +
      `<g id="phosphates">${stats.map(([x, y]) => g.circle(x + (x < 0 ? 4.2 : -3.2), y - (x < 0 ? 8.2 : 6.6), 2.9, phos.small)).join('')}</g>\n` +
      envelope(g, nx, ny, nr))
}

// ---------- Notch signalling ----------
// Two cells touching, seen close up at their contact: the membrane of the signalling cell (blue cytoplasm, left) holds
// Delta (amber), the membrane of the receiving cell (rose cytoplasm, right) holds Notch (green); where they meet, Notch is
// cut and its inner part travels to the nucleus. (SiliCoDraw draws two whole cells, writes "Delta" and "Notch" and
// marks the path to the nucleus with a dotted line; here the membranes are the lipid membrane of the set, so the
// contact is seen close up, the two proteins are two colours and the path is an arrow.)
{
  const g = page(4.62, [0, 0]), sender = soft(BLUE), receiver = soft(4), delta = rich(DELTA), notch = soft(ALPHA)
  const s = 0.42, m1 = -25, m2 = 7, y0 = -14, nx = 32, ny = 28, nr = 14
  const deltaD = [{ d: g.D(`M-46,${y0} L-12,${y0}`), width: f(5 * g.k) }, circleD(g, -10.5, y0, 4.2)]
  const notchD = [{ d: g.D(`M-2.5,${y0} L21,${y0}`), width: f(5.4 * g.k) }, g.D(`M-6,${y0 - 5.6} C-1.6,${y0 - 6} 0,${y0 - 4} 0,${y0} C0,${y0 + 4} -1.6,${y0 + 6} -6,${y0 + 5.6} C-3.6,${y0 + 3} -3.6,${y0 - 3} -6,${y0 - 5.6} Z`)]
  const along = places(-43.2, 43.2, 7.2, [[y0 - 3.5, y0 + 3.5]])
  cellType('Notch signalling', [['signalling cell', sender], ['receiving cell', receiver], ['membrane', LIPID], ['Delta', delta], ['Notch', notch], ['nucleus', NUC]],
    lipidDefs + g.grad('sender-gradient', [-50, -48, m1, 48], sender) + g.grad('receiver-gradient', [m2, -48, 50, 48], receiver) +
      g.grad('delta-gradient', [-46, y0 - 5, -6, y0 + 5], delta) + boxGrad('notch-gradient', notch) + envelopeGrad(g, nx, ny, nr),
    `<g id="signalling-cell">${g.path(rrect(g, -50, -48, 50 + m1, 96, 8), 'url(#sender-gradient)')}</g>\n` +
      `<g id="receiving-cell">${g.path(rrect(g, m2, -48, 50 - m2, 96, 8), 'url(#receiver-gradient)')}</g>\n` +
      lipids(g, along, m1, [[-46, 46]], s, true) + lipids(g, along, m2, [[-46, 46]], s, true) + '\n' +
      `<g id="Delta">${g.union(deltaD, 'url(#delta-gradient)', delta.outline, 7)}</g>\n` +
      `<g id="Notch">${g.union(notchD, 'url(#notch-gradient)', notch.outline, 7)}${g.path(rrect(g, 25.5, y0 + 1.5, 13, 6.4, 3.2), notch.small, notch.outline, 6)}</g>\n` +
      `<g id="arrow">${arrow(g, [nx, y0 + 13.5], [nx, ny - nr - 1.5], notch.outline, 8, 6, 8)}</g>\n` +
      envelope(g, nx, ny, nr))
}

// ---------- IVF ----------
// The approved Oocyte (inside its zona pellucida, with its nucleus and polar body) and a glass needle from the right that
// brings a sperm into it, as in ICSI. (SiliCoDraw's needle comes from the top right and its words "in vitro" are left
// out. The sperm is teal: the blue of the approved Sperm is the blue of the zona.)
{
  const g = page(4.53, [0.1, 1.1]), egg = soft(OOCYTE), zona = soft(ZONA), sperm = soft(SPERM), glass = grey(GLASS)
  const O = [-12, 1], sc = 0.86, L = ([x, y]) => [O[0] + x * sc, O[1] + y * sc], R = (r) => r * sc
  const [cx, cy] = L([-2, 2]), [px, py] = L([20, -25.2]), [nx, ny] = L([-6, 2.5])
  const ring = `${circleD(g, ...O, R(44))} ${circleD(g, ...O, R(37))}`
  const ny0 = cy + 1, tip = 10
  // The needle: a glass tube that narrows to a bevelled tip.
  const needle = g.D(`M50,${ny0 - 5.2} L${tip + 9},${ny0 - 3.4} L${tip},${ny0 - 3.6} L${tip + 4},${ny0 + 3.4} L50,${ny0 + 5.2} Z`)
  cellType('IVF', [['oocyte', egg], ['zona pellucida', zona], ['nucleus', NUC], ['sperm', sperm], ['needle', glass]],
    g.grad('zona-gradient', [O[0] - R(44), O[1] - R(44), O[0] + R(44), O[1] + R(44)], zona) + ballGrad(g, 'cell-gradient', cx, cy, R(30), egg) +
      ballGrad(g, 'polar-body-gradient', px, py, R(3.6), egg) + ballGrad(g, 'nucleus-gradient', nx, ny, R(12), NUC) + g.grad('needle-gradient', [tip, ny0 - 6, 50, ny0 + 6], glass),
    `<g id="perivitelline-space">${g.circle(...O, R(37), zona.light)}</g>\n` +
      `<g id="oocyte">${ball(g, 'cell-gradient', cx, cy, R(30), egg, 12)}</g>\n` +
      `<g id="polar-body">${ball(g, 'polar-body-gradient', px, py, R(3.6), egg, 6, false)}</g>\n` +
      `<g id="nucleus">${ball(g, 'nucleus-gradient', nx, ny, R(12), NUC, 10)}</g>\n` +
      `<g id="zona-pellucida"><path d="${ring}" fill="url(#zona-gradient)" fill-rule="evenodd" stroke="${zona.outline}" stroke-width="6" stroke-linejoin="round"/>${g.hl(O[0] - R(29.5), O[1] - R(29.5), 22, 5, -45, zona.light)}</g>\n` +
      `<g id="needle">${g.path(needle, 'url(#needle-gradient)', glass.outline, 6)}</g>\n` +
      `<g id="sperm">${curve(g, `M${tip + 8},${ny0} C${tip + 14},${ny0 - 2.4} ${tip + 19},${ny0 + 2.4} ${tip + 25},${ny0} C${tip + 30},${ny0 - 2} ${tip + 34},${ny0 + 1.6} ${tip + 38},${ny0}`, sperm.outline, 6)}` +
      `${g.ellipse(tip + 5.5, ny0, 2.2, 1.6, 0, sperm.small)}${g.ellipse(tip - 1, ny0, 5.2, 3.3, 0, sperm.base, sperm.outline, 6)}${g.ellipse(tip - 1.8, ny0, 3.6, 2.2, 0, NUC.small)}</g>`)
}

// ---------- H and E section ----------
// A section of tissue on a glass slide (its frosted end at the left), stained with haematoxylin and eosin: the tissue
// in the pinks of eosin, denser below, the nuclei in the blue-purple of haematoxylin. (Stains are known by their
// colours, so both use the fuller `deep` palette and the nuclei are not the lilac of the set. "H&E" is not written.)
{
  const g = page(4.71, [0, 0]), slide = grey(250), eosin = deep(EOSIN), haem = deep(HAEMATOXYLIN)
  const upper = { base: toHex({ l: 0.91, c: 0.06, h: EOSIN }), shadow: toHex({ l: 0.86, c: 0.08, h: EOSIN }) }
  const nuclei = [[-22, -6], [-11, -13], [1, -2], [13, -9], [27, -1], [35, -13], [-17, 9], [5, 12], [21, 13], [33, 12], [-8, 3]]
  cellType('H and E section', [['slide', slide], ['eosin', eosin], ['haematoxylin', haem]],
    g.grad('slide-gradient', [-48, -32, 48, 32], slide) + g.grad('upper-gradient', [-30, -24, 44, 6], upper) + g.grad('lower-gradient', [-30, 0, 44, 25], eosin),
    `<g id="slide">${g.path(rrect(g, -48, -32, 96, 64, 4), 'url(#slide-gradient)', slide.outline, 8)}${g.path(rrect(g, -44.2, -28.2, 11, 56.4, 2), slide.small)}${g.hl(-12, -27.5, 26, 3.2, 0, slide.light)}</g>\n` +
      `<g id="eosin">${g.path(g.D('M-29,-6 C-24,-18 -8,-24 4,-14 C14,-6 30,-10 37,-16 C41,-19.5 43.8,-15 43.8,-9 C43.8,3 43.6,13 43,21 C30,25 -16,25 -27,21 C-30,12 -31,2 -29,-6 Z'), 'url(#upper-gradient)', eosin.outline, 8)}` +
      `${g.path(g.D('M-28.4,6 C-18,0 -6,10 6,3 C16,-3 30,2 43.5,-3 C44,6 43.8,15 43,21 C30,25 -16,25 -27,21 C-28.6,16 -29,11 -28.4,6 Z'), 'url(#lower-gradient)')}</g>\n` +
      `<g id="haematoxylin">${nuclei.map(([x, y], i) => g.ellipse(x, y, 4.2, 3, ((i * 47) % 120) - 60, haem.outline)).join('')}</g>`)
}

// ---------- TUNEL assay ----------
// A field of a stained section: most nuclei are unstained (pale blue-grey), the nuclei of apoptotic cells, whose broken DNA
// TUNEL labels, are green, smaller and denser, one of them in pieces. (SiliCoDraw shows a dark fluorescence field with
// a glow round each green nucleus and writes "TUNEL⁺"; here the field is pale like the other icons of the set, the
// green is the label's, and the glow is a pale green rim.)
{
  const g = page(4.69, [0, 0]), field = grey(FIELD), plain = soft(COUNTERSTAIN), label = deep(TUNEL), halo = soft(TUNEL)
  const unstained = [[-30, -18, 7.5, 20], [-6, -2, 8, -15], [26, -18, 7, 35], [-34, 12, 7, -30], [4, 22, 7.5, 10], [34, 8, 7, -10]]
  const positive = [[22, 18, 5.5], [-15, 22, 5], [8, -23, 5]], pieces = [[11.5, -3, 2.6], [16.5, -0.5, 3.2], [13, 4.4, 2.4]]
  cellType('TUNEL assay', [['field', field], ['unstained nuclei', plain], ['TUNEL-positive nuclei', label]],
    g.grad('field-gradient', [-48, -36, 48, 36], field) + boxGrad('plain-gradient', plain) + boxGrad('label-gradient', label),
    `<g id="field">${g.path(rrect(g, -48, -36, 96, 72, 7), 'url(#field-gradient)', field.outline, 10)}${g.hl(-31, -30, 26, 4.5, -8, field.light)}</g>\n` +
      `<g id="unstained-nuclei">${unstained.map(([x, y, r, rot]) => g.ellipse(x, y, r, r * 0.8, rot, 'url(#plain-gradient)', plain.outline, 7)).join('')}</g>\n` +
      `<g id="TUNEL-positive-nuclei">${positive.map(([x, y, r]) => g.circle(x, y, r + 3.4, halo.base) + g.circle(x, y, r, 'url(#label-gradient)', label.outline, 7)).join('')}` +
      `${pieces.map(([x, y, r]) => g.circle(x, y, r + 2.2, halo.base)).join('')}` +
      `${pieces.map(([x, y, r]) => g.circle(x, y, r, label.small, label.outline, 5)).join('')}</g>`)
}

check()
console.log('written to', OUT)
