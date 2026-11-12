// SVG handling for icons: cleaning imported files, recolouring, and keeping ids unique.
//
// Icon markup is injected into the page as HTML, so anything that did not come from the
// built-in library must pass through `sanitizeBody` / `parseSvgFile` first.

import type { IconDef } from '../model/types'

const HEX = /#(?:[0-9a-f]{6}|[0-9a-f]{3})\b/gi

export const isHexColor = (s: unknown): s is string => typeof s === 'string' && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(s)

export function normalizeHex(c: string): string {
  const h = c.toLowerCase()
  return h.length === 4 ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}` : h
}

/** True when the `#abc` found at `offset` is a reference to an element id, not a colour. */
function isIdReference(str: string, offset: number): boolean {
  return /(?:url\(\s*['"]?|href=['"])$/.test(str.slice(Math.max(0, offset - 12), offset))
}

/** The distinct colours used in an icon, in order of first appearance. */
export function extractColors(body: string): string[] {
  const seen: string[] = []
  body.replace(HEX, (m, offset: number, str: string) => {
    if (!isIdReference(str, offset)) {
      const c = normalizeHex(m)
      if (!seen.includes(c)) seen.push(c)
    }
    return m
  })
  return seen
}

/** Swap colours in icon markup. Replacement values that are not plain hex colours are ignored. */
export function recolor(body: string, colors: Record<string, string> | undefined): string {
  if (!colors || !Object.keys(colors).length) return body
  return body.replace(HEX, (m, offset: number, str: string) => {
    if (isIdReference(str, offset)) return m
    const replacement = colors[normalizeHex(m)]
    return isHexColor(replacement) ? replacement : m
  })
}

/** Make the ids inside icon markup unique to one figure node, so gradients of two icons never clash. */
export function prefixIds(body: string, prefix: string): string {
  if (!/\sid="/.test(body)) return body
  const ids = new Set<string>()
  // `(\s)id=` so that attributes merely ending in "id" (data-id, xml:id) are left alone.
  body.replace(/\sid="([^"]+)"/g, (m, id: string) => {
    ids.add(id)
    return m
  })
  if (!ids.size) return body
  return body
    .replace(/(\s)id="([^"]+)"/g, (m, space: string, id: string) => (ids.has(id) ? `${space}id="${prefix}-${id}"` : m))
    .replace(/url\(\s*['"]?#([^)'"]+)['"]?\s*\)/g, (m, id: string) => (ids.has(id) ? `url(#${prefix}-${id})` : m))
    .replace(/href="#([^"]+)"/g, (m, id: string) => (ids.has(id) ? `href="#${prefix}-${id}"` : m))
}

// ---------- sanitising ----------

const ALLOWED_TAGS = new Set([
  'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'tspan',
  'defs', 'lineargradient', 'radialgradient', 'stop', 'clippath', 'mask', 'use', 'symbol', 'pattern',
])

const UNSAFE_VALUE = /javascript:|expression\(|@import|url\(\s*['"]?(?!#)/i

/** Copy simple class rules from <style> blocks onto the elements that use them. */
function inlineStyles(root: Element): void {
  const rules = new Map<string, string>()
  for (const style of Array.from(root.querySelectorAll('style'))) {
    const css = (style.textContent ?? '').replace(/\/\*[\s\S]*?\*\//g, '')
    for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      for (const selector of m[1].split(',')) {
        const cls = /^\s*\.([\w-]+)\s*$/.exec(selector)
        if (cls) rules.set(cls[1], `${rules.get(cls[1]) ?? ''}${m[2].trim().replace(/;?$/, ';')}`)
      }
    }
  }
  if (!rules.size) return
  for (const el of Array.from(root.querySelectorAll('[class]'))) {
    const decls = (el.getAttribute('class') ?? '')
      .split(/\s+/)
      .map((c) => rules.get(c) ?? '')
      .join('')
    if (decls) el.setAttribute('style', decls + (el.getAttribute('style') ?? ''))
  }
}

function clean(el: Element): void {
  for (const child of Array.from(el.children)) {
    const tag = child.tagName.toLowerCase()
    if (!ALLOWED_TAGS.has(tag)) {
      child.remove()
      continue
    }
    for (const attr of Array.from(child.attributes)) {
      const name = attr.name.toLowerCase()
      const value = attr.value
      if (name === 'xlink:href' || name === 'href') {
        child.removeAttribute(attr.name)
        // Only references to elements inside the same icon are kept.
        if (value.trim().startsWith('#')) child.setAttribute('href', value.trim())
      } else if (
        name.startsWith('on') ||
        name.startsWith('data-') ||
        name.includes(':') ||
        name === 'class' ||
        name === 'xmlns' ||
        UNSAFE_VALUE.test(value)
      ) {
        child.removeAttribute(attr.name)
      }
    }
    clean(child)
  }
  // Comments, processing instructions and stray text between shapes are dropped.
  for (const node of Array.from(el.childNodes)) {
    const isText = node.nodeType === 3
    const inTextElement = /^(text|tspan)$/i.test(el.tagName)
    if (node.nodeType !== 1 && !(isText && inTextElement)) node.remove()
  }
}

function parseRoot(text: string): Element | null {
  if (typeof DOMParser === 'undefined') return null
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
  const root = doc.documentElement
  if (!root || root.tagName.toLowerCase() !== 'svg' || doc.getElementsByTagName('parsererror').length) return null
  return root
}

function serializeChildren(root: Element): string {
  const s = new XMLSerializer()
  return Array.from(root.childNodes)
    .map((n) => s.serializeToString(n))
    .join('')
    .replace(/ xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, '')
}

/** Clean icon markup that came from a saved figure file. Returns '' when it cannot be parsed. */
export function sanitizeBody(body: string): string {
  const root = parseRoot(`<svg xmlns="http://www.w3.org/2000/svg">${body}</svg>`)
  if (!root) return ''
  clean(root)
  return serializeChildren(root)
}

export interface ParsedSvg {
  viewBox: [number, number]
  body: string
}

/** Read an SVG file chosen by the user and reduce it to safe, self-contained icon markup. */
export function parseSvgFile(text: string): ParsedSvg {
  const root = parseRoot(text)
  if (!root) throw new Error('This file is not a valid SVG image.')
  inlineStyles(root)
  clean(root)
  const vb = (root.getAttribute('viewBox') ?? '')
    .split(/[\s,]+/)
    .map(Number)
    .filter((n) => Number.isFinite(n))
  let minX = 0
  let minY = 0
  let w = parseFloat(root.getAttribute('width') ?? '')
  let h = parseFloat(root.getAttribute('height') ?? '')
  if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) [minX, minY, w, h] = vb
  if (!(w > 0) || !(h > 0)) {
    w = 100
    h = 100
  }
  let body = serializeChildren(root)
  if (!body.trim()) throw new Error('This SVG has no shapes that can be imported.')
  if (minX || minY) body = `<g transform="translate(${-minX} ${-minY})">${body}</g>`
  return { viewBox: [w, h], body }
}

/** Markup for one icon instance, recoloured and with ids made unique to that node. */
export function iconMarkup(def: IconDef, colors: Record<string, string> | undefined, nodeId: string): string {
  // The prefix becomes part of the markup, so it is reduced to plain characters whatever the node id is.
  return prefixIds(recolor(def.body, colors), `i${nodeId.replace(/[^\w-]/g, '')}`)
}
