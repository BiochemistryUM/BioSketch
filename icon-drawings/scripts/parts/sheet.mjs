// Draws every part of the given part modules alone, one 512 icon each, for the parts sheet the owner approves.
// Usage: node parts/sheet.mjs <folder> [module ...]   (modules: organelles membranes molecules tissue; all by default)
// Each module exports DEMOS = [{ name, size, draw: (g) => ({ defs, body, parts }) }]: the part is drawn at 0,0 in a
// frame where `size` units fill the page less margins of 26 px.
import { mkdirSync } from 'node:fs'
import { cellTypes, page } from '../cellkit.mjs'

const [out, ...wanted] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const mods = wanted.length ? wanted : ['organelles', 'membranes', 'molecules', 'tissue']
const { cellType, check } = cellTypes(out)
for (const m of mods) {
  const { DEMOS } = await import(`./${m}.mjs`)
  for (const d of DEMOS) {
    const g = page(460 / d.size, [0, 0])
    const p = d.draw(g)
    cellType(d.name, p.parts, p.defs, p.body)
  }
}
check()
console.log('written to', out)
