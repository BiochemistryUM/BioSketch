// Puts an approved icon of this folder inside another icon, so that a part the owner has already drawn (the
// mitochondrion, the damaged mitochondrion, the Golgi apparatus, a cell type) looks the same everywhere it appears.
//
//   import { placeIcon } from '../iconkit.mjs'
//   const m = placeIcon('Mitochondrion', { x: 300, y: 200, width: 160, turn: -20, stroke: 6, prefix: 'mito1' })
//   svg(title, m.defs + myDefs, myBody + m.body)
//
// The icon is read from icon-drawings/<name>.svg, its own <defs> are kept and every id in it gets the prefix (so two
// copies in one drawing do not clash), and its drawing is moved so that the middle of what it draws lands on x, y,
// `width` wide (its height follows), turned by `turn` degrees and mirrored with `flip: true`.
// Scaling an icon thins its outlines with it: `stroke` sets the width the thickest outline has on the page, and every
// other outline keeps its share of it. Without `stroke` outlines scale with the drawing.
// The drawing's extent is measured from the coordinates of its paths and shapes (good enough for centring; pass
// `box: [x0, y0, x1, y1]` in the icon's own 512 units to override it).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = join(dirname(fileURLToPath(import.meta.url)), '..')
const f = (n) => Math.round(n * 1000) / 1000

/** The approved icon's text, its defs and drawing apart, with ids prefixed. */
export function readIcon(name, prefix) {
  let text = readFileSync(join(HERE, `${name}.svg`), 'utf8')
  // Attributes of other programs (affinity:id) would need their namespace on the page; links lose their old spelling.
  text = text.replace(/xlink:href=/g, 'href=').replace(/\s[A-Za-z]+:[A-Za-z-]+="[^"]*"/g, (a) => (/^\s(xmlns|xml):/.test(a) ? a : ''))
  const ids = [...text.matchAll(/(?<![\w:-])id="([^"]+)"/g)].map((m) => m[1])
  for (const id of ids) {
    const safe = id.replace(/[^A-Za-z0-9_-]/g, '-')
    const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    text = text
      .replace(new RegExp(`(?<![\\w:-])id="${esc}"`, 'g'), `id="${prefix}-${safe}"`)
      .replace(new RegExp(`url\\(#${esc}\\)`, 'g'), `url(#${prefix}-${safe})`)
      .replace(new RegExp(`href="#${esc}"`, 'g'), `href="#${prefix}-${safe}"`)
  }
  const root = text.match(/<svg\b[^>]*>/)[0]
  const rootStyle = (root.match(/\bstyle="([^"]*)"/) || [])[1] || ''
  let inner = text.slice(text.indexOf(root) + root.length, text.lastIndexOf('</svg>'))
  inner = inner.replace(/<title>[\s\S]*?<\/title>/g, '')
  let defs = ''
  inner = inner.replace(/<defs>([\s\S]*?)<\/defs>/g, (_, d) => { defs += d; return '' })
  return { defs: defs.trim(), body: inner.trim(), rootStyle }
}

/** Extent of a drawing from the numbers in its path data and shape attributes, after the transforms on its groups are ignored (rough). */
function roughBox(text) {
  // Prefer a real measurement where the icon is one of ours (no transforms): coordinates in path data and shapes.
  const xs = [], ys = []
  for (const m of text.matchAll(/\bd="([^"]+)"/g)) {
    const nums = m[1].match(/-?\d*\.?\d+(?:e-?\d+)?/g)?.map(Number) || []
    if (/[aA]/.test(m[1])) continue // arcs mix radii and flags with points
    for (let i = 0; i + 1 < nums.length; i += 2) { xs.push(nums[i]); ys.push(nums[i + 1]) }
  }
  for (const m of text.matchAll(/<(circle|ellipse)\b[^>]*>/g)) {
    const a = (k) => +((m[0].match(new RegExp(`\\b${k}="(-?[\\d.]+)"`)) || [])[1] ?? NaN)
    const rx = a('r') || a('rx'), ry = a('r') || a('ry')
    if (!isNaN(a('cx'))) { xs.push(a('cx') - rx, a('cx') + rx); ys.push(a('cy') - ry, a('cy') + ry) }
  }
  for (const m of text.matchAll(/<rect\b[^>]*>/g)) {
    const a = (k) => +((m[0].match(new RegExp(`\\b${k}="(-?[\\d.]+)"`)) || [])[1] ?? NaN)
    if (!isNaN(a('x'))) { xs.push(a('x'), a('x') + a('width')); ys.push(a('y'), a('y') + a('height')) }
  }
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}

/** Every stroke width in the drawing multiplied by k (attributes and style declarations). */
const scaleStrokes = (text, k) =>
  text
    .replace(/stroke-width="([\d.]+)(px)?"/g, (_, w) => `stroke-width="${f(w * k)}"`)
    .replace(/stroke-width:([\d.]+)(px)?/g, (_, w) => `stroke-width:${f(w * k)}px`)

// Extents measured once from a rendering (qlmanage, outlines included), for icons exported from Affinity with
// transformed groups. Measure again if the owner changes the file.
const KNOWN_BOX = { Mitochondrion: [5, 131, 509, 372] }

const widest =(text) => Math.max(0, ...[...text.matchAll(/stroke-width(?:="|:)([\d.]+)/g)].map((m) => +m[1]))

/**
 * An approved icon placed in another drawing: { defs, body }.
 * opts: x, y (where the middle of its drawing goes), width (on the page), turn (degrees), flip, stroke, prefix, box.
 */
export function placeIcon(name, { x, y, width, turn = 0, flip = false, stroke, prefix = name.replace(/\W+/g, '-').toLowerCase(), box } = {}) {
  const icon = readIcon(name, prefix)
  // A drawing whose paths sit inside transformed groups (an Affinity export) cannot be measured from its numbers:
  // its viewBox (512) is used then, unless `box` is given.
  const transformed = /<g\b[^>]*transform=/.test(icon.body)
  const [x0, y0, x1, y1] = box || KNOWN_BOX[name] || (transformed ? [0, 0, 512, 512] : roughBox(icon.body))
  const s = width / (x1 - x0)
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
  let body = icon.body
  if (stroke) {
    // The thickest outline as it will show on the page; groups scaled inside the icon are not counted (rough).
    const w = widest(body)
    if (w > 0) body = scaleStrokes(body, stroke / (w * s))
  }
  const style = icon.rootStyle ? ` style="${icon.rootStyle}"` : ''
  const t = `translate(${f(x)} ${f(y)}) rotate(${f(turn)}) scale(${f(flip ? -s : s)} ${f(s)}) translate(${f(-cx)} ${f(-cy)})`
  return { defs: icon.defs, body: `<g id="${prefix}" transform="${t}"${style}>${body}</g>`, scale: s }
}
