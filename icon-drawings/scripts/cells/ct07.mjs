// Eight icons of SiliCoDraw's "Cells & tissues" (github.com/Alex-D-C/SiliCoDraw, MIT, © 2026 Alexander David Carlsson;
// see ../../LICENSE-SiliCoDraw.txt), redrawn in the soft look of icon-drawings/STYLE.md with the kit in ../cellkit.mjs:
// gap junction, extracellular matrix, nuclear pore, lipid droplet, biomolecular condensate, ion pump, mitochondrial DNA
// and the electron transport chain. Their shapes are read by hand from the source in a 100 × 100 box centred on 0,0 and
// scaled onto a 512 page. The gap junction, the ion pump and the electron transport chain sit in the membrane of ct02.mjs
// (`lipids`: the same lipids, of the same size); the mitochondrion is the hue of BioSketch's own (Mitochondrion.svg).
// Nothing is lettered: where SiliCoDraw writes a label, a shape says the same (see each icon). ATP is drawn the same way
// in both icons that use it: a small yellow body (adenosine) with a tail of three phosphates.
// Usage: node ct07.mjs <folder>
import { NUC, PEACH, cellTypes, page } from '../cellkit.mjs'
import { deep, hueOf, rich, soft, toHex } from '../colour.mjs'
import { f } from '../shapes.mjs'

const OUT = process.argv[2]
const { cellType, check } = cellTypes(OUT)

// The hues of the set (OKLCH degrees). The nucleus lilac is about 319°.
// Membrane proteins keep SiliCoDraw's blue (267°); ions and small molecules are green (165°), as in the ion channel;
// free protein is amber (75°), RNA rose (15°); ATP is yellow (96°, SiliCoDraw's yellow).
const PROTEIN = hueOf('#4f6bb8'), ION = 165, AMBER = 75, RNA = 15, YELLOW = hueOf('#fde68a'), MITO = hueOf('#F2A08C')
const COLLAGEN = hueOf('#d9824a'), PERILIPIN = hueOf('#5fae8b'), CONDENSATE = hueOf('#e9d5f3')
const POTASSIUM = 310 // SiliCoDraw's blue for K⁺ is the protein's blue: moved to violet, 43° from it

/** One gradient that lights every shape that uses it from its own top left (several heads, blocks, droplets). */
const boxGrad = (id, pal) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.base}"/><stop offset="1" stop-color="${pal.shadow}"/></linearGradient>`
/** A rounded rectangle given in their units, as a path on the page. */
const rrect = (g, x, y, w, h, r) => {
  const [x0, y0] = g.P([x, y]), W = w * g.k, H = h * g.k, R = Math.min(r * g.k, W / 2, H / 2)
  return `M${f(x0 + R)},${f(y0)} H${f(x0 + W - R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + W)},${f(y0 + R)} V${f(y0 + H - R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + W - R)},${f(y0 + H)} H${f(x0 + R)} A${f(R)},${f(R)} 0 0 1 ${f(x0)},${f(y0 + H - R)} V${f(y0 + R)} A${f(R)},${f(R)} 0 0 1 ${f(x0 + R)},${f(y0)} Z`
}
/** A plain rectangle given in their units, as a path on the page. */
const rect = (g, x0, y0, x1, y1) => `M${f(g.X(x0))},${f(g.Y(y0))} H${f(g.X(x1))} V${f(g.Y(y1))} H${f(g.X(x0))} Z`
/** An open curve given in their units (absolute M, L and C only), drawn as a line with round ends; width in pixels. */
const curve = (g, d, colour, w) => `<path d="${g.D(d)}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"/>`
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
/** A cubic Bézier curve given by its four points (their units), as an absolute path. */
const bezD = ([p0, p1, p2, p3]) => `M${p0} C${p1} ${p2} ${p3}`
/** The point at t of a cubic Bézier curve. */
const bezAt = (b, t) => [0, 1].map((k) => (1 - t) ** 3 * b[0][k] + 3 * (1 - t) ** 2 * t * b[1][k] + 3 * (1 - t) * t * t * b[2][k] + t ** 3 * b[3][k])
/** The part from t0 to t1 of a cubic Bézier curve, as four points (de Casteljau). */
const piece = (b, t0, t1) => {
  const split = ([p0, p1, p2, p3], t) => {
    const mid = (a, c) => [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t]
    const a = mid(p0, p1), m = mid(p1, p2), c = mid(p2, p3), ab = mid(a, m), bc = mid(m, c), p = mid(ab, bc)
    return [[p0, a, ab, p], [p, bc, c, p3]]
  }
  const right = split(b, t0)[1]
  return split(right, (t1 - t0) / (1 - t0))[0].map(([x, y]) => [f(x), f(y)])
}
/** Where on the curve `a` it crosses the curve `b` (the t of `a`), found by sampling both. */
const crossing = (a, b) => {
  let best = [Infinity, 0]
  for (let i = 0; i <= 400; i++) for (let j = 0; j <= 400; j++) { const p = bezAt(a, i / 400), q = bezAt(b, j / 400), d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d < best[0]) best = [d, i / 400] }
  return best[1]
}
/** The highlight of a round body of radius r (their units), at its top left. */
const shine = (g, x, y, r, pal) => g.hl(x - r * 0.42, y - r * 0.45, f(r * g.k * 0.26), f(r * g.k * 0.1), -45, pal.light)

// ---------- the membrane of ct02.mjs (Lipid bilayer, Ion channel, Receptor) ----------
// A lipid is a round head and two tails. Heads are 6.5 in radius and 15 apart; the two rows of heads lie 19 above and
// below the middle of the membrane; behind the tails lies a pale band. Copied from ct02.mjs, with two additions: a
// palette of its own (`pal`, for the mitochondrion's membrane), and a lipid can be one leaflet only (`[x, -1]` the upper
// one, `[x, 1]` the lower one), where a protein sits in the other leaflet.
const LIPID = soft(PEACH), HEAD = 6.5, ROWS = 19, TAIL = 2.6
/** A membrane about `mid`: lipids at each position of `xs` (x, or [x, side]), the band over each stretch of `bands`. */
const lipids = (g, xs, mid, bands, { pal = LIPID, id = 'lipid-gradient' } = {}) => {
  const list = xs.map((x) => (Array.isArray(x) ? x : [x, 0]))
  const sides = (only) => (only ? [only] : [-1, 1])
  const tails = list.flatMap(([x, only]) => [-TAIL, TAIL].flatMap((dx) => sides(only).map((s) => g.line([[x + dx, mid + s * (ROWS - 5)], [x + dx, mid + s * 2.2]], pal.outline, 6))))
  const heads = list.flatMap(([x, only]) => sides(only).map((s) => g.circle(x, mid + s * ROWS, HEAD, `url(#${id})`, pal.outline, 6)))
  const band = ([x0, x1]) => rect(g, x0, mid - ROWS, x1, mid + ROWS)
  return `<g id="membrane"><g id="membrane-core">${bands.map((b) => g.path(band(b), pal.base)).join('')}</g>` +
    `<g id="lipid-tails">${tails.join('')}</g><g id="lipid-heads">${heads.join('')}</g></g>`
}

/** ATP: a small body (adenosine) with a tail of three phosphates, from `x` along the direction `dir` (±1), at height `y`. */
const atp = (g, x, y, dir, pal) =>
  `<g id="ATP">${g.line([[x, y], [x + dir * 19, y]], pal.outline, 5)}${[7, 13, 19].map((dx) => g.circle(x + dir * dx, y, 2.9, pal.outline)).join('')}` +
  `${g.circle(x, y, 4.8, 'url(#atp-gradient)', pal.outline, 6)}</g>`

// Gap junction: the membranes of two neighbouring cells, one above the other across a narrow cleft, joined by two
// channels. Each channel is a pair of connexons, one in each membrane, docked end to end in the cleft; small molecules
// (green) pass through the pores from one cell into the other.
// (SiliCoDraw draws two whole cells side by side, with nuclei, and three channels as blue blocks; here the junction is
// seen close up, in the membrane the ion channel stands in, so the connexons can be seen to cross both membranes. The
// cells lie above and below, as the membranes of the set are drawn lying down. Two channels instead of three, so that
// lipids fit between and round them. SiliCoDraw's red dots are the green of every ion of the set.)
{
  const g = page(3.76, [0, 0]), protein = soft(PROTEIN), ion = deep(ION)
  const channels = [-20, 20], mids = [-29, 29], wall = 9, pore = 6
  const ends = [[-60.5, -1], [1, 60.5]]
  const walls = channels.flatMap((c) => ends.flatMap(([y0, y1]) => [c - pore / 2 - wall, c + pore / 2].map((x) => [x, y0, wall, y1 - y0])))
  cellType('Gap junction', [['membrane', LIPID], ['connexons', protein], ['small molecules', ion]],
    boxGrad('lipid-gradient', LIPID) + boxGrad('connexon-gradient', protein),
    mids.map((m) => lipids(g, [-54, -39, 0, 39, 54], m, [[-60, -32], [-8, 8], [32, 60]])).join('\n') + '\n' +
      `<g id="connexons">${walls.map(([x, y, w, h]) => g.path(rrect(g, x, y, w, h, 3.5), 'url(#connexon-gradient)', protein.outline, 7)).join('')}</g>\n` +
      `<g id="small-molecules">${[[-20, -38], [-20, 9], [20, -12], [20, 36]].map(([x, y]) => g.circle(x, y, 3.3, ion.small)).join('')}</g>`)
}

// Extracellular matrix: a meshwork of collagen fibres, with proteoglycans (a core protein bristling with sugar chains)
// and fibronectin among them.
// (SiliCoDraw's fibres are thin lines; here they are tubes in the orange of the approved collagen (Fibrosis), and every
// second crossing is woven, the upright fibre passing under. The proteoglycans are larger, with four pairs of bristles
// instead of five, and blue, so that they recolour apart from the collagen; fibronectin is green.)
{
  const g = page(4.6, [0, 0]), collagen = soft(COLLAGEN), glycan = soft(245), fn = soft(150)
  const ink = toHex({ l: 0.78, c: 0.09, h: COLLAGEN })
  const across = [[[-48, -30], [-20, -36], [10, -20], [48, -34]], [[-48, -6], [-24, 6], [8, -14], [48, 0]], [[-48, 22], [-18, 10], [14, 34], [48, 18]]]
  const down = [[[-40, -44], [-30, -14], [-36, 16], [-26, 44]], [[8, -44], [0, -16], [14, 10], [4, 44]], [[34, -44], [40, -16], [30, 14], [40, 44]]]
  const tube = (b, cap = 'round') => [[collagen.outline, 17], [ink, 9]].map(([c, w]) => `<path d="${g.D(bezD(b))}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="${cap}" stroke-linejoin="round"/>`).join('')
  // Woven: where a crossing fibre should pass over an upright one, a short piece of it is drawn again on top.
  const over = across.flatMap((h, i) => down.filter((_, j) => (i + j) % 2 === 0).map((v) => { const t = crossing(h, v); return tube(piece(h, t - 0.075, t + 0.075), 'butt') }))
  const brush = ([x, y]) => g.line([[x, y - 11], [x, y + 11]], glycan.outline, 7) + [-7, -2, 3, 8].map((d) => g.line([[x - 6.5, y + d - 3], [x, y + d], [x + 6.5, y + d - 3]], glycan.small, 6)).join('')
  cellType('Extracellular matrix', [['collagen', collagen], ['proteoglycans', glycan], ['fibronectin', fn]], '',
    `<g id="collagen">${across.map((b) => tube(b)).join('')}${down.map((b) => tube(b)).join('')}${over.join('')}</g>\n` +
      `<g id="proteoglycans">${[[-21, -18], [21, 11], [-11, 31]].map(brush).join('')}</g>\n` +
      `<g id="fibronectin">${[[25, -17], [-29, 7], [17, 35]].map(([x, y]) => g.circle(x, y, 4.2, fn.small, fn.outline, 6)).join('')}</g>`)
}

// Nuclear pore: the nuclear envelope (two membranes, meeting round the rim of the pore) with the pore complex set in the
// rim: its ring, the filaments it holds out into the cytoplasm and the basket it hangs into the nucleus. A protein is
// carried in from the cytoplasm (above) into the nucleus (below).
// (SiliCoDraw writes "cytoplasm" and "nucleus" beside the envelope; here the nucleus is the lilac of every nucleus of the
// set and the cytoplasm is left white. SiliCoDraw's envelope is two lines that end at the pore; here the two membranes
// join round the rim, as they do. The filaments stand out from the ring instead of arching over the pore, so that the
// cargo's way in is open. The cargo is amber, as protein is in the set.)
{
  const g = page(4.58, [0, 0.6]), npc = soft(hueOf('#6f86c8')), cargo = rich(AMBER)
  const half = 9, rim = 17 // half the thickness of the envelope, and where its rounded end reaches
  const slab = (s) => {
    // The envelope on one side (s = -1 left, 1 right): a band whose end round the pore is a half circle; open at the edge.
    const [ex, ey] = g.P([s * 50, -half]), [rx, ry] = g.P([s * (rim + half), -half]), R = half * g.k, [, by] = g.P([0, half])
    const sweep = s < 0 ? 1 : 0
    const outline = `M${f(ex)},${f(ey)} H${f(rx)} A${f(R)},${f(R)} 0 0 ${sweep} ${f(rx)},${f(by)} H${f(ex)}`
    return `<path d="${outline} Z" fill="url(#envelope-gradient)"/><path d="${outline}" fill="none" stroke="${NUC.outline}" stroke-width="10" stroke-linejoin="round"/>`
  }
  const nucleoplasm = (() => {
    const [x0, y0] = g.P([-50, 4]), [x1, y1] = g.P([50, 44]), R = 9 * g.k
    return `M${f(x0)},${f(y0)} H${f(x1)} V${f(y1 - R)} A${f(R)},${f(R)} 0 0 1 ${f(x1 - R)},${f(y1)} H${f(x0 + R)} A${f(R)},${f(R)} 0 0 1 ${f(x0)},${f(y1 - R)} Z`
  })()
  cellType('Nuclear pore', [['nucleus', NUC], ['pore complex', npc], ['cargo', cargo]],
    g.grad('nucleoplasm-gradient', [-50, 4, 50, 44], NUC) + boxGrad('envelope-gradient', { base: NUC.light, shadow: NUC.base }) + boxGrad('pore-gradient', npc) + boxGrad('cargo-gradient', cargo),
    `<g id="nucleoplasm">${g.path(nucleoplasm, 'url(#nucleoplasm-gradient)')}</g>\n` +
      `<g id="envelope">${slab(-1)}${slab(1)}</g>\n` +
      `<g id="pore-complex"><g id="filaments">${['M-15,-16 C-16,-24 -21,-28 -26,-33', 'M15,-16 C16,-24 21,-28 26,-33'].map((d) => curve(g, d, npc.outline, 8)).join('')}` +
      `${curve(g, 'M-15,16 L-6.5,31 L6.5,31 L15,16', npc.outline, 8)}</g>` +
      `<g id="ring">${[-1, 1].map((s) => g.path(rrect(g, s * 15 - 6, -17, 12, 34, 5), 'url(#pore-gradient)', npc.outline, 9) + g.hl(s * 15 - 2.4, -7, 3, 18, 0, npc.light)).join('')}</g></g>\n` +
      `<g id="arrow">${arrow(g, [0, -24.5], [0, 12], cargo.outline, 10, 7.5, 10)}</g>\n` +
      `<g id="cargo">${g.path(g.smooth([[-8, -36], [2, -42], [10, -37], [9, -28], [-1, -24.5], [-9, -28]]), 'url(#cargo-gradient)', cargo.outline, 8)}${g.hl(-2.5, -36.5, 8, 3.2, -30, cargo.light)}</g>`)
}

// Lipid droplet: a store of fat (neutral lipid, yellow) wrapped in a single layer of lipids, heads out and tails in,
// with perilipin (green) on its surface.
// (SiliCoDraw's monolayer is a ring of white beads; here they are the lipids of the membranes of the set, each with its
// two tails, so the single layer can be told from a bilayer. Its two faint spots inside are left out.)
{
  const g = page(5.34, [0, -0.13]), fat = rich(YELLOW), coat = soft(PERILIPIN)
  const R = 38, N = 26, skip = [-90, 40]
  const angles = Array.from({ length: N }, (_, i) => -90 + (i * 360) / N).filter((a) => skip.every((s) => Math.abs(((a - s + 540) % 360) - 180) > 9))
  const polar = (a, r, side = 0) => { const t = (a * Math.PI) / 180; return [r * Math.cos(t) - side * Math.sin(t), r * Math.sin(t) + side * Math.cos(t)] }
  cellType('Lipid droplet', [['neutral lipid', fat], ['lipids', LIPID], ['perilipin', coat]],
    g.grad('fat-gradient', [-R, -R, R, R], fat) + boxGrad('lipid-gradient', LIPID) + boxGrad('coat-gradient', coat),
    `<g id="neutral-lipid">${g.circle(0, 0, R, 'url(#fat-gradient)')}${g.hl(-14, -15, 30, 11, -45, fat.light)}</g>\n` +
      `<g id="monolayer"><g id="lipid-tails">${angles.flatMap((a) => [-1.5, 1.5].map((s) => g.line([polar(a, R - 4, s), polar(a, R - 11.5, s)], LIPID.outline, 5))).join('')}</g>` +
      `<g id="lipid-heads">${angles.map((a) => { const [x, y] = polar(a, R); return g.circle(x, y, 4.3, 'url(#lipid-gradient)', LIPID.outline, 5) }).join('')}</g></g>\n` +
      `<g id="perilipin">${skip.map((a) => { const [x, y] = polar(a, R); return g.ellipse(x, y, 7.5, 4.6, a + 90, 'url(#coat-gradient)', coat.outline, 6) }).join('')}</g>`)
}

// Biomolecular condensate: three droplets that have separated out of the cytoplasm without a membrane, dense with
// proteins (amber dots) and RNA (rose strands); a few proteins stay outside, in the dilute phase.
// (SiliCoDraw's droplets are lilac with lilac strands and dots inside. The droplet keeps its lilac; the strands are the
// rose of RNA and the dots the amber of protein, so that each recolours on its own. The edge is a thin line in the
// droplet's own tone, not a 12 px membrane, because a condensate has none. Three proteins outside are added.)
{
  const g = page(5.33, [-0.1, 3.2]), drop = soft(CONDENSATE), rna = deep(RNA), prot = rich(AMBER)
  const strand = ([x, y]) => curve(g, `M${x - 5},${y + 1} C${x - 3},${y - 4} ${x - 0.5},${y - 4} ${x},${y} C${x + 0.5},${y + 4} ${x + 3},${y + 4} ${x + 5},${y - 1}`, rna.small, 6)
  cellType('Biomolecular condensate', [['condensate', drop], ['RNA', rna], ['proteins', prot]],
    boxGrad('drop-gradient', drop),
    `<g id="droplets">${[g.smooth([[-14, -30], [6, -34], [22, -22], [24, -4], [12, 10], [-8, 12], [-24, 0], [-28, -18]]), g.smooth([[-40, 14], [-28, 8], [-16, 16], [-18, 30], [-30, 36], [-42, 28]])].map((d) => g.path(d, 'url(#drop-gradient)', drop.outline, 6)).join('')}` +
      `${g.circle(32, 30, 10.5, 'url(#drop-gradient)', drop.outline, 6)}${g.hl(-12, -24, 30, 9, -20, drop.light)}${g.hl(-34.5, 15.5, 12, 4.5, -35, drop.light)}${g.hl(28, 25.5, 10, 4, -45, drop.light)}</g>\n` +
      `<g id="RNA">${[[-9, -21], [9, -24], [13, -7], [-3, -1], [-16, -9], [-30, 22], [-26, 30], [34, 31]].map(strand).join('')}</g>\n` +
      `<g id="proteins">${[[-3, -27], [18, -15], [-20, 1], [4, -13], [-35, 21], [-22, 25], [29, 26], [4, 5]].map(([x, y]) => g.circle(x, y, 2.7, prot.small)).join('')}` +
      `${[[38, -20], [-40, -6], [10, 30]].map(([x, y]) => g.circle(x, y, 2.7, prot.small)).join('')}</g>`)
}

// Ion pump (the sodium-potassium pump): a protein across the membrane that carries three sodium ions out (green, up)
// and two potassium ions in (violet, down) for every ATP it uses, on the side of the cytoplasm.
// (SiliCoDraw writes "3 Na⁺", "2 K⁺", "ATP" and "ADP"; here the number of dots says three and two, and an ATP (a yellow
// body with three phosphates) stands at the pump's lower face, where it binds, not at the top. The pump is the blue of
// the ion channel and the receptor, where SiliCoDraw has it green; sodium takes the green of every ion, potassium a violet.
// The two arrows run side by side on the pump, out and in.)
{
  const g = page(4.32, [0, 0]), pump = soft(PROTEIN), na = deep(ION), k = deep(POTASSIUM), atpPal = rich(YELLOW)
  cellType('Ion pump', [['membrane', LIPID], ['pump', pump], ['sodium', na], ['potassium', k], ['ATP', atpPal]],
    boxGrad('lipid-gradient', LIPID) + g.grad('pump-gradient', [-21, -33, 21, 33], pump) + boxGrad('atp-gradient', atpPal),
    lipids(g, [-46, -31, 31, 46], 0, [[-50, -20], [20, 50]]) + '\n' +
      `<g id="pump">${g.path(rrect(g, -21, -33, 42, 66, 11), 'url(#pump-gradient)', pump.outline, 10)}${g.hl(-13, -15, 4, 22, 0, pump.light)}</g>\n` +
      `<g id="sodium">${arrow(g, [-7, 22], [-7, -24], na.outline, 9, 8, 10)}${[-17, -7, 3].map((x) => g.circle(x, -44, 4.3, na.small)).join('')}</g>\n` +
      `<g id="potassium">${arrow(g, [8, -22], [8, 24], k.outline, 9, 8, 10)}${[3, 13].map((x) => g.circle(x, 44, 4.3, k.small)).join('')}</g>\n` +
      atp(g, -45, 41, 1, atpPal))
}

// Mitochondrial DNA: a mitochondrion (outer membrane, inner membrane folded into cristae) with its small circular genome
// in the matrix, drawn as a ring of two strands wound round each other.
// (The mitochondrion is drawn as BioSketch's own: the space between the membranes and inside the cristae in a deeper
// tone, the matrix pale. SiliCoDraw's DNA is a blue ring with a white dashed line; the blue is kept.)
{
  const g = page(4.47, [0, 0]), mito = soft(MITO), dna = deep(PROTEIN)
  const out = [50, 27, 22], inn = [43, 20, 15] // half width, half height and corner radius of each membrane
  const box = ([hx, hy, r]) => rrect(g, -hx, -hy, 2 * hx, 2 * hy, r)
  // Where the inner membrane runs at x, above (s = -1) or below (s = 1).
  const edge = (x, s) => { const [hx, hy, r] = inn, dx = Math.abs(x) - (hx - r); return s * (dx <= 0 ? hy : hy - r + Math.sqrt(r * r - dx * dx)) }
  const cristae = [[-31, -1, -7], [29, -1, -7], [-23, 1, 7], [23, 1, 7]] // x, side, where the tip ends
  const W = 5, lip = 4.5 / g.k
  const tongue = ([x, s, tip]) => {
    const [x0, x1] = [x - W, x + W], r = W * g.k, [ax, ay] = g.P([x0, edge(x0, s)]), [bx, by] = g.P([x1, edge(x1, s)]), [, ty] = g.P([0, tip + s * W])
    const fill = `M${f(ax)},${f(g.Y(edge(x0, s) + s * lip * 1.4))} L${f(bx)},${f(g.Y(edge(x1, s) + s * lip * 1.4))} L${f(bx)},${f(ty)} A${f(r)},${f(r)} 0 0 ${s < 0 ? 1 : 0} ${f(ax)},${f(ty)} Z`
    const line = `M${f(ax)},${f(ay)} L${f(ax)},${f(ty)} A${f(r)},${f(r)} 0 0 ${s < 0 ? 0 : 1} ${f(bx)},${f(ty)} L${f(bx)},${f(by)}`
    return { fill: `<path d="${fill}" fill="${mito.small}"/>`, line: `<path d="${line}" fill="none" stroke="${mito.outline}" stroke-width="9" stroke-linejoin="round"/>` }
  }
  const strand = (phase) => {
    const pts = Array.from({ length: 96 }, (_, i) => { const t = (i / 96) * Math.PI * 2, r = 12.5 + 2.6 * Math.sin(8 * t + phase); return [r * Math.cos(t), r * Math.sin(t)] })
    return `<path d="${g.smooth(pts)}" fill="none" stroke="${phase ? dna.small : dna.outline}" stroke-width="6.5"/>`
  }
  cellType('Mitochondrial DNA', [['mitochondrion', mito], ['DNA', dna]],
    g.grad('matrix-gradient', [-43, -20, 43, 20], mito),
    `<g id="outer-membrane">${g.path(box(out), mito.small, mito.outline, 12)}</g>\n` +
      `<g id="inner-membrane">${g.path(box(inn), 'url(#matrix-gradient)', mito.outline, 9)}${g.hl(-35.5, -8, 16, 5, -60, mito.light)}` +
      `${cristae.map(tongue).map((t) => t.fill).join('')}${cristae.map(tongue).map((t) => t.line).join('')}</g>\n` +
      `<g id="DNA">${strand(Math.PI)}${strand(0)}</g>`)
}

// Electron transport chain: the four complexes of the inner mitochondrial membrane and ATP synthase. Complexes I, III
// and IV pump protons (green) out of the matrix (below) into the space between the membranes (above); ATP synthase lets
// them back and makes ATP in the matrix.
// (SiliCoDraw numbers the complexes I to V and writes "H⁺" and "ATP". Here the complexes are told apart by their shapes,
// as in textbooks: I is L-shaped with its arm in the matrix, II small and in the inner leaflet only, III and IV span the
// membrane, ATP synthase is a knob on a stalk. Protons are green dots with arrows; ATP is the yellow body with three
// phosphates. Corrected: ATP synthase's knob (F1) and the ATP it makes are in the matrix, below, where SiliCoDraw puts the
// knob above with the pumped protons. The membrane is the lipids of the set in the mitochondrion's hue; the complexes are
// the blue of membrane proteins, ATP synthase violet.)
{
  const g = page(3.43, [-1.5, 3.6]), lipid = soft(MITO), complex = soft(PROTEIN), synthase = soft(POTASSIUM), proton = deep(ION), atpPal = rich(YELLOW)
  const block = (x, y, w, h, r) => g.path(rrect(g, x, y, w, h, r), 'url(#complex-gradient)', complex.outline, 8)
  cellType('Electron transport chain', [['membrane', lipid], ['complexes', complex], ['ATP synthase', synthase], ['protons', proton], ['ATP', atpPal]],
    boxGrad('lipid-gradient', lipid) + boxGrad('complex-gradient', complex) + g.grad('complex-1-gradient', [-53, -25, -24, 48], complex) + boxGrad('synthase-gradient', synthase) + boxGrad('atp-gradient', atpPal),
    lipids(g, [-61, [-18, -1], 58], 0, [[-66, 64]], { pal: lipid }) + '\n' +
      `<g id="complexes">${g.union([rrect(g, -53, -25, 24, 47, 7), rrect(g, -44, 8, 14, 40, 7)], 'url(#complex-1-gradient)', complex.outline, 8)}` +
      `${block(-24.5, 3, 13, 31, 6)}${block(-6, -29, 19, 60, 8)}${block(13, -27, 17, 55, 8)}</g>\n` +
      `<g id="ATP-synthase">${g.line([[42.5, 18], [42.5, 33]], synthase.outline, 10)}${g.path(rrect(g, 36, -21, 13, 41, 6), 'url(#synthase-gradient)', synthase.outline, 8)}` +
      `${g.circle(42.5, 40, 10, 'url(#synthase-gradient)', synthase.outline, 8)}${g.hl(38.5, 36, 14, 5, -45, synthase.light)}</g>\n` +
      `<g id="protons">${[[-41, 16, -21], [3.5, 18, -23], [21.5, 17, -21]].map(([x, y0, y1]) => arrow(g, [x, y0], [x, y1], proton.outline, 8, 7, 9)).join('')}` +
      `${arrow(g, [42.5, -14], [42.5, 13], proton.outline, 8, 7, 9)}${[[-41, -36], [3.5, -39], [21.5, -37], [42.5, -31]].map(([x, y]) => g.circle(x, y, 3.8, proton.small)).join('')}</g>\n` +
      atp(g, 11, 44, 1, atpPal))
}

check()
console.log('written to', OUT)
