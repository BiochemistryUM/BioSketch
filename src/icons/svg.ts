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

/** Make every outline in icon markup thicker or thinner by `factor` (1 or absent leaves it as drawn). */
export function scaleStrokes(body: string, factor: number | undefined): string {
  if (!factor || factor === 1 || !(factor > 0) || !Number.isFinite(factor)) return body
  const scaled = body.replace(/(stroke-width\s*[=:]\s*["']?\s*)(\d*\.?\d+(?:e[-+]?\d+)?)/gi, (_, lead: string, n: string) => `${lead}${Math.round(Number(n) * factor * 1000) / 1000}`)
  // An outline that states no width is drawn 1 unit wide; the wrapper gives those the new width.
  return `<g stroke-width="${factor}">${scaled}</g>`
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
  'defs', 'lineargradient', 'radialgradient', 'stop', 'clippath', 'mask', 'use', 'symbol', 'pattern', 'marker',
])

/** Wrappers that drawing programs add around artwork: the wrapper goes, the artwork stays. */
function unwrap(root: Element): void {
  // <switch> offers alternatives; the first one that is plain SVG is the drawing.
  for (const el of Array.from(root.querySelectorAll('switch'))) {
    const keep = Array.from(el.children).find((c) => ALLOWED_TAGS.has(c.tagName.toLowerCase()))
    if (keep) el.replaceWith(keep)
  }
  for (const el of Array.from(root.querySelectorAll('a'))) el.replaceWith(...Array.from(el.childNodes))
}

const EFFECTS = ['filter', 'clip-path', 'mask', 'marker-start', 'marker-mid', 'marker-end']
const LOCAL_REF = /url\(\s*['"]?#([^)'"\s]+)['"]?\s*\)/

/**
 * Drop effects that point at something the cleaning removed (blur filters, for instance). A shape
 * whose filter or clip is missing is not drawn at all by some browsers.
 */
function dropDanglingEffects(root: Element): void {
  const ids = new Set(Array.from(root.querySelectorAll('[id]')).map((el) => el.getAttribute('id')))
  const dangling = (value: string): boolean => {
    const ref = LOCAL_REF.exec(value)
    return !!ref && !ids.has(ref[1])
  }
  for (const el of Array.from(root.querySelectorAll('*'))) {
    for (const name of EFFECTS) {
      const value = el.getAttribute(name)
      if (value && dangling(value)) el.removeAttribute(name)
    }
    const style = el.getAttribute('style')
    if (style && style.includes('url(')) {
      const kept = style.split(';').filter((decl) => {
        const [prop, ...rest] = decl.split(':')
        return !(EFFECTS.includes(prop.trim().toLowerCase()) && dangling(rest.join(':')))
      })
      el.setAttribute('style', kept.join(';'))
    }
  }
}

const UNIT_PX: Record<string, number> = { px: 1, '': 1, mm: 96 / 25.4, cm: 96 / 2.54, in: 96, pt: 96 / 72, pc: 16 }

/** A width or height such as "210mm" in the units shapes are drawn in. NaN when it cannot be read. */
function lengthPx(value: string | null): number {
  const m = /^\s*([\d.]+(?:e[-+]?\d+)?)\s*([a-z]*)\s*$/i.exec(value ?? '')
  const unit = m ? UNIT_PX[m[2].toLowerCase()] : undefined
  return m && unit ? parseFloat(m[1]) * unit : NaN
}

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

export function parseRoot(text: string): Element | null {
  if (typeof DOMParser === 'undefined') return null
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
  const root = doc.documentElement
  if (!root || root.tagName.toLowerCase() !== 'svg' || doc.getElementsByTagName('parsererror').length) return null
  return root
}

export function serializeChildren(root: Element): string {
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
  unwrap(root)
  clean(root)
  dropDanglingEffects(root)
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
  unwrap(root)
  clean(root)
  dropDanglingEffects(root)
  const vb = (root.getAttribute('viewBox') ?? '')
    .split(/[\s,]+/)
    .map(Number)
    .filter((n) => Number.isFinite(n))
  let minX = 0
  let minY = 0
  // Without a viewBox, shapes are drawn in pixels whatever unit the page size is given in.
  let w = lengthPx(root.getAttribute('width'))
  let h = lengthPx(root.getAttribute('height'))
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
export function iconMarkup(def: IconDef, colors: Record<string, string> | undefined, nodeId: string, strokeScale?: number): string {
  // The prefix becomes part of the markup, so it is reduced to plain characters whatever the node id is.
  return prefixIds(scaleStrokes(recolor(def.body, colors), strokeScale), `i${nodeId.replace(/[^\w-]/g, '')}`)
}
