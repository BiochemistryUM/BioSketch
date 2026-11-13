#!/usr/bin/env node
// Turn a folder of SVG files into a BioSketch icon pack.
//
//   node scripts/import-icons.mjs <folder> --id nih-bioart --name "NIH BioArt" \
//        --licence "Public domain" --author "NIAID" --source "https://bioart.niaid.nih.gov" \
//        [--meta meta.json] [--max-kb 300] [--out public/icon-packs]
//
// Every file goes through the same cleaning as an icon imported in the app (scripts, links to
// other sites and embedded bitmaps are removed). Sub-folder names become search keywords.
//
// --meta is an optional JSON file that overrides details per icon, keyed by the path of the SVG
// inside the folder:  { "cells/t-cell.svg": { "name": "T cell", "author": "…", "licence": "CC BY 4.0",
// "source": "https://…", "tags": ["lymphocyte"], "crop": [x, y, width, height] } }
// "crop" cuts an icon to the part of its page that holds the drawing, for files with wide margins.
//
// Only import collections whose licence allows redistribution, and record that licence here:
// BioSketch uses it to build the credit line when a figure is exported.

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { basename, extname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

// Larger drawings make figures slow to open and to draw, above all on tablets (--max-kb changes the limit).
const MAX_ICON_KB = 300

function parseArgs(argv) {
  const args = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) args[argv[i].slice(2)] = argv[++i] ?? ''
    else args._.push(argv[i])
  }
  return args
}

async function* svgFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* svgFiles(path)
    else if (entry.isFile() && extname(entry.name).toLowerCase() === '.svg') yield path
  }
}

// "Tomato_fruit" and "TomatoFruit" both read "Tomato fruit"; abbreviations such as mRNA are left alone.
const words = (s) =>
  s
    .replace(/([a-z])([A-Z])(?=[a-z]{2})/g, (_, a, b) => `${a} ${b.toLowerCase()}`)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
// Pack id, two hyphens and this slug together must stay within the 64 characters a figure allows for an icon id.
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 36)

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const folder = args._[0]
  if (!folder || !args.id || !args.name || !args.licence) {
    console.error('Usage: node scripts/import-icons.mjs <folder> --id <pack-id> --name <name> --licence <licence> [--author <a>] [--source <url>] [--meta <file>] [--out <dir>]')
    process.exit(2)
  }
  if (!/^[a-z0-9][a-z0-9-]{1,19}$/.test(args.id)) {
    console.error('--id must be 2 to 20 lower-case letters, digits and hyphens (for example "nih-bioart").')
    process.exit(2)
  }
  const root = resolve(folder)
  const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
  const outDir = resolve(args.out ?? join(projectRoot, 'public', 'icon-packs'))
  const meta = args.meta ? JSON.parse(await readFile(resolve(args.meta), 'utf8')) : {}
  const maxBytes = (Number(args['max-kb']) > 0 ? Number(args['max-kb']) : MAX_ICON_KB) * 1000

  // The cleaning code is the app's own (src/icons/svg.ts); it needs a DOM, which jsdom provides.
  const dom = new JSDOM('')
  globalThis.DOMParser = dom.window.DOMParser
  globalThis.XMLSerializer = dom.window.XMLSerializer
  // Vite is used only to load the app's TypeScript; no file watching or hot reload is wanted.
  const vite = await createServer({ root: projectRoot, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' })
  const icons = []
  const skipped = []
  const used = new Set()
  try {
    const { parseSvgFile } = await vite.ssrLoadModule('/src/icons/svg.ts')
    for await (const file of svgFiles(root)) {
      const rel = relative(root, file).split(sep).join('/')
      const info = meta[rel] ?? {}
      try {
        const text = await readFile(file, 'utf8')
        // Photographs and other bitmaps inside an SVG are removed by the cleaning, which would leave a hole.
        if (/<image[\s>]/i.test(text)) throw new Error('contains an embedded picture')
        const parsed = parseSvgFile(text)
        if (parsed.body.length > maxBytes) throw new Error(`larger than ${maxBytes / 1000} kB after cleaning`)
        const crop = Array.isArray(info.crop) && info.crop.length === 4 && info.crop.every(Number.isFinite) && info.crop[2] > 0 && info.crop[3] > 0 ? info.crop : null
        if (crop) {
          parsed.body = `<g transform="translate(${-crop[0]} ${-crop[1]})">${parsed.body}</g>`
          parsed.viewBox = [crop[2], crop[3]]
        }
        const name = info.name ?? words(basename(file, extname(file)))
        let id = slug(name) || 'icon'
        for (let n = 2; used.has(id); n++) id = `${(slug(name) || 'icon').slice(0, 30)}-${n}`
        used.add(id)
        const folders = rel.split('/').slice(0, -1).map(words)
        icons.push({
          id,
          // Sentence case, except for names that start like tRNA, ssDNA or pH.
          name: /^[a-z]+(\s|$)/.test(name) ? name.charAt(0).toUpperCase() + name.slice(1) : name,
          tags: [...new Set([...(info.tags ?? []), ...folders].map((t) => String(t).toLowerCase()))],
          viewBox: parsed.viewBox,
          body: parsed.body,
          license: info.licence ?? info.license ?? args.licence,
          author: info.author ?? args.author ?? '',
          source: info.source ?? args.source ?? '',
        })
      } catch (error) {
        skipped.push(`${rel}: ${error.message}`)
      }
    }
  } finally {
    await vite.close()
  }

  if (!icons.length) {
    console.error(`No usable SVG files found in ${root}.`)
    process.exit(1)
  }
  icons.sort((a, b) => a.name.localeCompare(b.name))
  await mkdir(outDir, { recursive: true })
  const file = `${args.id}.json`
  const text = JSON.stringify({ id: args.id, name: args.name, icons })
  await writeFile(join(outDir, file), text)

  const indexPath = join(outDir, 'index.json')
  let index = []
  try {
    index = JSON.parse(await readFile(indexPath, 'utf8'))
  } catch {
    index = []
  }
  const licences = new Set(icons.map((i) => i.license))
  const entry = { id: args.id, name: args.name, licence: licences.size === 1 ? [...licences][0] : 'Mixed, see each icon', source: args.source ?? '', count: icons.length, file, names: icons.map((i) => [i.id, i.name, i.tags.join(' ')]) }
  index = [...index.filter((p) => p.id !== args.id), entry].sort((a, b) => a.name.localeCompare(b.name))
  // One pack per line: the list carries every icon's name so the app can search packs it has not fetched.
  await writeFile(indexPath, `[\n${index.map((p) => JSON.stringify(p)).join(',\n')}\n]\n`)

  console.log(`Wrote ${icons.length} icons to ${join(outDir, file)} (${Math.round(text.length / 1024)} kB).`)
  if (skipped.length) {
    console.log(`Skipped ${skipped.length} file(s):`)
    for (const line of skipped.slice(0, 30)) console.log(`  ${line}`)
    if (skipped.length > 30) console.log(`  … and ${skipped.length - 30} more`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
