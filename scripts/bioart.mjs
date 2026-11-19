#!/usr/bin/env node
// Build icon packs from NIH BioArt Source (https://bioart.niaid.nih.gov), the library of
// science and medical art drawn by NIAID's medical illustrators.
//
//   node scripts/bioart.mjs fetch <folder> [--to 1100]   download every entry's SVG and details
//   node scripts/bioart.mjs crops <folder>               measure the drawings (needs Chrome), write bioart-crops.json
//   node scripts/bioart.mjs build <folder>               write the packs to public/icon-packs/
//
// <folder> is a working folder outside the repository (a few hundred megabytes). "fetch" can be
// stopped and run again: it keeps what it has. The site has no list of entries, so entry pages
// are asked for by number; a number that does not exist is skipped.
//
// Licence: NIH states the art is "free for any use, including educational, research,
// informational, and commercial purposes"; each entry names its own licence, which is recorded
// per icon. Only public-domain and CC BY entries are taken. An entry comes in up to a dozen
// colours; the first one (the full-colour drawing) is taken, since BioSketch recolours icons.
// The packs in public/icon-packs/ were built from the site as it was on 19 November 2026.

import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile, cp, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'

const SITE = 'https://bioart.niaid.nih.gov'
const AGENT = 'Mozilla/5.0 (compatible; icon-pack-builder)'
const PARALLEL = 4

// ---------- reading an entry page ----------

/** The JSON value that starts at `from` in `s` (an array or object), or undefined. */
export function jsonAt(s, from) {
  const open = s[from]
  const close = open === '[' ? ']' : open === '{' ? '}' : ''
  if (!close) return undefined
  let depth = 0
  let inString = false
  for (let i = from; i < s.length; i++) {
    const c = s[i]
    if (inString) {
      if (c === '\\') i++
      else if (c === '"') inString = false
    } else if (c === '"') inString = true
    else if (c === '[' || c === '{') depth++
    else if (c === ']' || c === '}') {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(s.slice(from, i + 1))
        } catch {
          return undefined
        }
      }
    }
  }
  return undefined
}

/** The details of one entry, read from its page. Null when the page is not an entry. */
export function readEntry(html, id) {
  // The page carries its data as pieces of text pushed by scripts; joined, they hold the file lists.
  let data = ''
  for (const m of html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)) {
    try {
      data += JSON.parse(m[1])
    } catch {
      /* a piece that is not text */
    }
  }
  const at = (key) => {
    let i = -1
    while ((i = data.indexOf(`"${key}":`, i + 1)) >= 0) {
      const value = jsonAt(data, i + key.length + 3)
      if (value) return value
    }
    return undefined
  }
  const items = at('carouselItems')
  const mapping = at('filemapping')
  if (!Array.isArray(items) || !mapping || typeof mapping !== 'object') return null

  // The words on the page, in order: a heading such as "Creator" is followed by its value.
  const doc = new JSDOM(html).window.document
  for (const el of doc.querySelectorAll('script, style, noscript')) el.remove()
  const words = []
  const walker = doc.createTreeWalker(doc.body, 4)
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.textContent.replace(/\s+/g, ' ').trim()
    if (t) words.push(t)
  }
  const code = `BIOART-${String(id).padStart(6, '0')}`
  const start = words.indexOf(code)
  if (start < 0) return null
  const after = (label, from = start) => {
    const i = words.indexOf(label, from)
    return i >= 0 ? (words[i + 1] ?? '') : ''
  }
  // Between the entry's number and its dates stand the title and, for organisms, the species.
  const dates = words.indexOf('Creation Date:', start)
  const head = dates > start ? words.slice(start + 1, dates) : [words[start + 1] ?? '']
  const details = words.indexOf('Keywords', start)
  const field = (label) => {
    const value = after(label, details >= 0 ? details : start)
    // An empty field is followed straight away by the next heading.
    return FIELDS.includes(value) ? '' : value
  }
  const groups = items.map((item) => ({ group: item.bioartFileGroupId, caption: String(item.caption ?? ''), svg: mapping[item.bioartFileGroupId]?.SVG ?? null }))
  return {
    id,
    title: head[0] ?? '',
    species: head.length > 1 ? head[1] : '',
    // An entry that names no licence has the next heading here.
    licence: after('Licensing:').replace(/^Category:$/, ''),
    categories: after('Category:').split(',').map((c) => c.trim()).filter(Boolean),
    description: (() => {
      const d = after('Description')
      return d === 'Representation' ? '' : d
    })(),
    keywords: details >= 0 ? field('Keywords').split(',').map((k) => k.trim()).filter(Boolean) : [],
    collection: field('Collection'),
    style: field('Image Style'),
    creator: field('Creator'),
    credit: field('Credit'),
    type: field('Image Type'),
    submitted: after('Submission Date:'),
    groups,
  }
}

const FIELDS = ['Keywords', 'Collection', 'Image Style', 'Creator', 'Credit', 'Image Type', 'Illustration Software/Version', 'Category', 'DOI', 'Related Entries']

// ---------- fetch ----------

async function get(url, tries = 4) {
  for (let n = 1; ; n++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': AGENT }, signal: AbortSignal.timeout(90000) })
      // The site answers 500 for a number with no entry; anything else odd is tried again.
      if (res.status === 500 || res.status === 404) return null
      if (res.ok) return Buffer.from(await res.arrayBuffer())
      throw new Error(`HTTP ${res.status}`)
    } catch (error) {
      if (n >= tries) throw new Error(`${url}: ${error.message}`)
      await new Promise((r) => setTimeout(r, 1500 * n))
    }
  }
}

const exists = (path) => stat(path).then((s) => s.size > 0, () => false)

async function fetchAll(folder, last) {
  await mkdir(join(folder, 'svg'), { recursive: true })
  const listFile = join(folder, 'entries.json')
  const entries = await readFile(listFile, 'utf8').then(JSON.parse, () => ({}))
  const failed = []
  let next = 1
  let done = 0
  const save = () => writeFile(listFile, JSON.stringify(entries, null, 1))
  const worker = async () => {
    while (next <= last) {
      const id = next++
      try {
        if (!(id in entries)) {
          const page = await get(`${SITE}/bioart/${id}`)
          const entry = page ? readEntry(page.toString('utf8'), id) : null
          // A page that could not be read is asked for again on the next run; a missing number is not.
          if (page && !entry) failed.push(`${id}: page not understood`)
          else entries[id] = entry
        }
        const entry = entries[id]
        const svg = entry?.groups[0]?.svg
        const file = join(folder, 'svg', `${id}.svg`)
        if (svg && !(await exists(file))) {
          const body = await get(`${SITE}/api/bioarts/${id}/files/${svg}`)
          if (body) await writeFile(file, body)
          else failed.push(`${id}: SVG ${svg} not found`)
        }
      } catch (error) {
        failed.push(`${id}: ${error.message}`)
      }
      if (++done % 50 === 0) {
        await save()
        console.log(`${done} of ${last} numbers asked`)
      }
    }
  }
  await Promise.all(Array.from({ length: PARALLEL }, worker))
  await save()
  const found = Object.values(entries).filter(Boolean)
  console.log(`${found.length} entries, ${found.filter((e) => e.groups[0]?.svg).length} with an SVG drawing.`)
  if (failed.length) console.log(`Problems (run again to retry):\n  ${failed.join('\n  ')}`)
}

// ---------- build ----------

// A pack per subject. An entry with several categories goes to the first pack that lists one of them.
const PACKS = [
  { id: 'nih-microbes', name: 'NIH BioArt: viruses and microbes', categories: ['Viruses', 'Bacteria', 'Parasites', 'Fungi', 'Other Organisms'] },
  { id: 'nih-arthropods', name: 'NIH BioArt: arthropods', categories: ['Arthropods'] },
  { id: 'nih-people', name: 'NIH BioArt: people', categories: ['People'] },
  { id: 'nih-anatomy', name: 'NIH BioArt: anatomy', categories: ['Anatomy'] },
  { id: 'nih-animals', name: 'NIH BioArt: animals and plants', categories: ['Animals', 'Plants'] },
  { id: 'nih-lab', name: 'NIH BioArt: lab equipment', categories: ['Equipment', 'Techniques'] },
  { id: 'nih-cells', name: 'NIH BioArt: cells and organelles', categories: ['Cells and Organelles', 'Cellular Processes', 'Cell Scenes'] },
  { id: 'nih-molecules', name: 'NIH BioArt: molecules and proteins', categories: ['Proteins', 'Molecules'] },
  { id: 'nih-shapes', name: 'NIH BioArt: shapes and charts', categories: ['Shapes', 'Data Visualization', 'Environments'] },
]

// Entries left out by hand, with the reason.
const LEFT_OUT = {
  24: 'the SVG file lacks the arrowhead that the entry\'s preview shows',
}

// Licences that allow passing the drawing on inside BioSketch, as BioSketch writes them.
const LICENCES = { 'public domain': 'Public domain', cc0: 'CC0', 'cc-by': 'CC BY 4.0', 'cc by': 'CC BY 4.0', 'cc by 4.0': 'CC BY 4.0', 'cc-by 4.0': 'CC BY 4.0' }

const MAX_KB = 300

async function build(folder, options = {}) {
  const entries = Object.values(JSON.parse(await readFile(join(folder, 'entries.json'), 'utf8'))).filter(Boolean)
  const crops = options.crops ?? (await readFile(new URL('./bioart-crops.json', import.meta.url), 'utf8').then(JSON.parse, () => ({})))
  const importer = fileURLToPath(new URL('./import-icons.mjs', import.meta.url))
  const left = { 'no SVG drawing': 0, 'licence not taken': [] }
  const work = await mkdtemp(join(tmpdir(), 'bioart-'))
  try {
    const metas = new Map(PACKS.map((p) => [p.id, {}]))
    // Many entries share a title (eleven neutrophils, a tick seen from above and from below): the
    // species tells them apart where there is one; the importer numbers those that still share a name.
    const titles = new Map()
    for (const e of entries) titles.set(e.title.toLowerCase(), (titles.get(e.title.toLowerCase()) ?? 0) + 1)
    entries.sort((a, b) => a.id - b.id)
    for (const e of entries) {
      const file = join(folder, 'svg', `${e.id}.svg`)
      if (!e.groups[0]?.svg || !(await exists(file))) {
        left['no SVG drawing']++
        continue
      }
      if (LEFT_OUT[e.id]) continue
      const licence = LICENCES[e.licence.trim().toLowerCase()]
      if (!licence) {
        left['licence not taken'].push(`${e.id} (${e.licence || 'none given'})`)
        continue
      }
      const pack = PACKS.find((p) => e.categories.some((c) => p.categories.includes(c))) ?? PACKS[PACKS.length - 1]
      // Named by entry number with leading zeros, so that the importer meets them in entry order.
      const rel = `${String(e.id).padStart(6, '0')}.svg`
      await mkdir(join(work, pack.id), { recursive: true })
      await cp(file, join(work, pack.id, rel))
      const name = titles.get(e.title.toLowerCase()) > 1 && e.species ? `${e.title} (${e.species})` : e.title
      metas.get(pack.id)[rel] = {
        name: name.trim() || `BioArt ${e.id}`,
        author: [e.creator, e.credit.replace(/^Courtesy of /i, '')].filter(Boolean).join(', ') || 'NIAID',
        licence,
        // The page of the entry: the credit NIH asks for names it.
        source: `${SITE}/bioart/${e.id}`,
        tags: [...new Set([...e.categories, e.species, ...e.keywords].filter(Boolean).map((t) => t.toLowerCase()))].slice(0, 12),
        ...(crops[e.id] ? { crop: crops[e.id] } : {}),
      }
    }
    for (const pack of PACKS) {
      const meta = metas.get(pack.id)
      if (!Object.keys(meta).length) continue
      const metaFile = join(work, `${pack.id}.meta.json`)
      await writeFile(metaFile, JSON.stringify(meta))
      const args = [importer, join(work, pack.id), '--id', pack.id, '--name', pack.name, '--licence', 'Public domain', '--source', SITE, '--meta', metaFile, '--max-kb', String(MAX_KB), ...(options.out ? ['--out', options.out] : [])]
      const run = spawnSync(process.execPath, args, { stdio: 'inherit' })
      if (run.status !== 0) process.exit(run.status ?? 1)
    }
  } finally {
    await rm(work, { recursive: true, force: true })
  }
  console.log(`Left out: ${left['no SVG drawing']} entries with no SVG drawing (brushes, swatches, templates).`)
  if (left['licence not taken'].length) console.log(`Left out for their licence: ${left['licence not taken'].join(', ')}`)
}

// ---------- crops ----------

// Many drawings sit on a page much larger than themselves (a square sheet, say). Placed in a
// figure, such an icon would have a wide empty margin inside its frame. "crops" measures every
// drawing in a real browser and writes the part of the page it covers to bioart-crops.json,
// which "build" then cuts each icon to.

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

// Runs in the browser: the box each icon's visible shapes cover, with their line widths, inside any clip.
const MEASURE = String.raw`
const NS = 'http://www.w3.org/2000/svg'
const HIDDEN = 'defs, clipPath, mask, symbol, pattern, marker'
const out = {}
const join = (a, b) => (!a ? b : !b ? a : [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])])
const cut = (a, b) => (!a || !b ? a : [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])])
const through = (m, b, pad) => {
  const xs = []
  const ys = []
  for (const [x, y] of [[b.x - pad, b.y - pad], [b.x + b.width + pad, b.y - pad], [b.x - pad, b.y + b.height + pad], [b.x + b.width + pad, b.y + b.height + pad]]) {
    xs.push(m.a * x + m.c * y + m.e)
    ys.push(m.b * x + m.d * y + m.f)
  }
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}
for (const icon of ICONS) {
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('viewBox', '0 0 ' + icon.viewBox[0] + ' ' + icon.viewBox[1])
  svg.setAttribute('width', icon.viewBox[0])
  svg.setAttribute('height', icon.viewBox[1])
  svg.innerHTML = icon.body
  document.body.appendChild(svg)
  try {
    const base = svg.getScreenCTM().inverse()
    const toRoot = (el) => base.multiply(el.getScreenCTM())
    // The area a clip path or a mask lets through, from the shapes inside it.
    const areaOf = (el, id) => {
      const area = id && svg.querySelector('[id="' + id.replace(/"/g, '') + '"]')
      if (!area) return null
      let box = null
      for (const child of area.querySelectorAll('path, rect, circle, ellipse, line, polyline, polygon, use, text')) {
        try {
          const own = child.transform && child.transform.baseVal.consolidate()
          const m = own ? toRoot(el).multiply(own.matrix) : toRoot(el)
          box = join(box, through(m, child.getBBox(), 0))
        } catch {}
      }
      return box
    }
    const REF = /url\(\s*["']?#([^)"']+)["']?\s*\)/
    const clipOf = (el) => areaOf(el, (REF.exec(getComputedStyle(el).clipPath || '') || [])[1])
    const maskOf = (el) => areaOf(el, (REF.exec(el.getAttribute('mask') || '') || REF.exec((/(?:^|;)\s*mask\s*:([^;]*)/.exec(el.getAttribute('style') || '') || [])[1] || '') || [])[1])
    let all = null
    for (const el of svg.querySelectorAll('path, rect, circle, ellipse, line, polyline, polygon, use, text')) {
      if (el.closest(HIDDEN)) continue
      const style = getComputedStyle(el)
      const stroked = style.stroke && style.stroke !== 'none'
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) continue
      if (!stroked && style.fill === 'none' && el.tagName !== 'use') continue
      let box
      try {
        const b = el.getBBox()
        if (!(b.width > 0) && !(b.height > 0)) continue
        box = through(toRoot(el), b, stroked ? parseFloat(style.strokeWidth) / 2 || 0 : 0)
      } catch {
        continue
      }
      for (let up = el; up && up !== svg; up = up.parentElement) box = cut(cut(box, clipOf(up)), maskOf(up))
      if (box && box[2] > box[0] && box[3] > box[1]) all = join(all, box)
    }
    if (all && all.every(Number.isFinite)) out[icon.key] = all.map((v) => Math.round(v * 1000) / 1000)
  } catch {}
  svg.remove()
}
const pre = document.createElement('pre')
pre.id = 'measured'
pre.textContent = JSON.stringify(out)
document.body.appendChild(pre)
`

async function measure(folder) {
  const work = await mkdtemp(join(tmpdir(), 'bioart-measure-'))
  const crops = {}
  let measured = 0
  try {
    // The drawings are measured as the import leaves them, before any cut.
    await build(folder, { out: join(work, 'packs'), crops: {} })
    const index = JSON.parse(await readFile(join(work, 'packs', 'index.json'), 'utf8'))
    for (const pack of index) {
      const { icons } = JSON.parse(await readFile(join(work, 'packs', pack.file), 'utf8'))
      const list = icons.map((i) => ({ key: i.source.split('/').pop(), viewBox: i.viewBox, body: i.body }))
      const page = join(work, `${pack.id}.html`)
      await writeFile(page, `<!doctype html><meta charset="utf-8"><body><script>const ICONS = ${JSON.stringify(list).replace(/</g, '\\u003c')}\n${MEASURE}</script>`)
      const run = spawnSync(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', `--user-data-dir=${join(work, 'profile')}`, '--virtual-time-budget=120000', '--dump-dom', `file://${page}`], { encoding: 'utf8', maxBuffer: 1 << 30 })
      const found = /<pre id="measured">([^<]*)<\/pre>/.exec(run.stdout ?? '')
      if (!found) throw new Error(`The browser gave no measurements for ${pack.name}. Set CHROME to the path of Chrome or Chromium.\n${(run.stderr ?? '').slice(0, 500)}`)
      const boxes = JSON.parse(found[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'))
      for (const icon of list) {
        const box = boxes[icon.key]
        if (!box) continue
        measured++
        const [w, h] = icon.viewBox
        // A little air around the drawing, so that a line on its edge is not shaved.
        const air = Math.max(box[2] - box[0], box[3] - box[1]) * 0.01
        const x0 = box[0] - air
        const y0 = box[1] - air
        const x1 = box[2] + air
        const y1 = box[3] + air
        // Cut only when it matters: the drawing leaves a tenth of the page empty, or runs over its edge.
        const loose = box[2] - box[0] < 0.9 * w || box[3] - box[1] < 0.9 * h
        const over = box[0] < -0.02 * w || box[1] < -0.02 * h || box[2] > 1.02 * w || box[3] > 1.02 * h
        if (loose || over) crops[icon.key] = [x0, y0, x1 - x0, y1 - y0].map((v) => Math.round(v * 100) / 100)
      }
    }
  } finally {
    await rm(work, { recursive: true, force: true })
  }
  const file = fileURLToPath(new URL('./bioart-crops.json', import.meta.url))
  const keys = Object.keys(crops).sort((a, b) => a - b)
  await writeFile(file, `{\n${keys.map((k) => `"${k}": ${JSON.stringify(crops[k])}`).join(',\n')}\n}\n`)
  console.log(`Measured ${measured} drawings; ${keys.length} are cut to their drawing (${file}).`)
}

async function main() {
  const [command, folder, ...rest] = process.argv.slice(2)
  if (!folder || !['fetch', 'crops', 'build'].includes(command)) {
    console.error('Usage: node scripts/bioart.mjs fetch <folder> [--to 1100]\n       node scripts/bioart.mjs crops <folder>\n       node scripts/bioart.mjs build <folder>')
    process.exit(2)
  }
  const to = rest[0] === '--to' && Number(rest[1]) > 0 ? Number(rest[1]) : 1100
  if (command === 'fetch') await fetchAll(resolve(folder), to)
  else if (command === 'crops') await measure(resolve(folder))
  else await build(resolve(folder))
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
