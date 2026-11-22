// SVG handling for icons: cleaning imported files, recolouring, and keeping ids unique.
//
// Icon markup is injected into the page as HTML, and every icon is third-party artwork (a
// collection, or a file someone imported): all of it must pass through `sanitizeBody` /
// `parseSvgFile` first.

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
const PAINTED = ['fill', 'stroke']
const LOCAL_REF = /url\(\s*['"]?#([^)'"\s]+)['"]?\s*\)/

/**
 * Drop effects that point at something the cleaning removed (blur filters, for instance). A shape
 * whose filter or clip is missing is not drawn at all by some browsers. A fill or outline that
 * points at a gradient the file does not have is left empty: Chrome and Firefox leave it empty
 * anyway, while Safari paints it black, and a figure must look the same in all of them.
 */
function dropDanglingEffects(root: Element): void {
  const ids = new Set(Array.from(root.querySelectorAll('[id]')).map((el) => el.getAttribute('id')))
  const dangling = (value: string): boolean => {
    const ref = LOCAL_REF.exec(value)
    return !!ref && !ids.has(ref[1])
  }
  // A colour written after the link ("url(#a) #336699") is what the file asks for when the link fails.
  const fallback = (value: string): string => value.replace(LOCAL_REF, '').trim() || 'none'
  for (const el of Array.from(root.querySelectorAll('*'))) {
    for (const name of EFFECTS) {
      const value = el.getAttribute(name)
      if (value && dangling(value)) el.removeAttribute(name)
    }
    for (const name of PAINTED) {
      const value = el.getAttribute(name)
      if (value && dangling(value)) el.setAttribute(name, fallback(value))
    }
    const style = el.getAttribute('style')
    if (style && style.includes('url(')) {
      const kept = style.split(';').flatMap((decl) => {
        const [prop, ...rest] = decl.split(':')
        const name = prop.trim().toLowerCase()
        const value = rest.join(':')
        if (!dangling(value)) return [decl]
        if (EFFECTS.includes(name)) return []
        return PAINTED.includes(name) ? [`${name}:${fallback(value)}`] : [decl]
      })
      el.setAttribute('style', kept.join(';'))
    }
  }
}

// ---------- shading that darkens what lies beneath it ----------

/** The ways a shape can mix with what is beneath it, as CSS names them. Anything else is ignored. */
const BLENDS = new Set([
  'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light',
  'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity', 'plus-lighter', 'plus-darker',
])

/** A property of an element, from its style or, failing that, its attribute. Lower case, '' when absent. */
function styleValue(el: Element, name: string): string {
  const m = new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`, 'i').exec(el.getAttribute('style') ?? '')
  return (m?.[1] ?? el.getAttribute(name) ?? '').trim().toLowerCase()
}

/** How the element mixes with what is beneath it ('multiply', …), or '' when it simply covers it. */
function blendOf(el: Element): string {
  const value = styleValue(el, 'mix-blend-mode')
  return BLENDS.has(value) ? value : ''
}

function setBlend(el: Element, blend: string): void {
  const kept = (el.getAttribute('style') ?? '').split(';').filter((decl) => decl.trim() && !/^\s*mix-blend-mode\s*:/i.test(decl))
  if (blend) kept.push(`mix-blend-mode: ${blend}`)
  if (kept.length) el.setAttribute('style', kept.join(';'))
  else el.removeAttribute('style')
  el.removeAttribute('mix-blend-mode')
}

const isSet = (el: Element, name: string): boolean => {
  const value = styleValue(el, name)
  return !!value && value !== 'none'
}

/** A group every browser paints on its own before laying it over what is beneath: nothing inside it mixes with the outside. */
const paintedApart = (el: Element): boolean =>
  !!blendOf(el) || parseFloat(styleValue(el, 'opacity')) < 1 || isSet(el, 'mask') || isSet(el, 'filter') || styleValue(el, 'isolation') === 'isolate'

type Layer = [blend: string, element: Element]

/**
 * What an element inside a clipped group paints, as layers from the bottom up: each one either
 * covers what is beneath it ('') or mixes with it. A group that holds a mixing layer is cut into
 * copies of itself, one per stretch of layers, so that each mixing layer ends up alone in its copy.
 */
function layersOf(el: Element, linked: Set<string>): Layer[] {
  if (el.tagName.toLowerCase() !== 'g') return [[blendOf(el), el]]
  if (paintedApart(el)) {
    settleBlends(el, linked)
    return [[blendOf(el), el]]
  }
  // Something else draws this group again by its id (<use>): it has to stay in one piece.
  if (linked.has(el.getAttribute('id') ?? '')) return [['', el]]
  const inner = Array.from(el.children).flatMap((child) => layersOf(child, linked))
  if (inner.every(([blend]) => !blend)) return [['', el]]
  const layers: Layer[] = []
  let covering: Element | null = null
  const copy = (): Element => {
    const shell = el.cloneNode(false) as Element
    // The id stays with the first copy only.
    if (layers.length) shell.removeAttribute('id')
    return shell
  }
  for (const [blend, node] of inner) {
    if (blend) {
      const shell = copy()
      setBlend(node, '')
      shell.append(node)
      layers.push([blend, shell])
      covering = null
    } else {
      if (!covering) {
        covering = copy()
        layers.push(['', covering])
      }
      covering.append(node)
    }
  }
  return layers
}

/**
 * Illustrator shades a drawing with shapes that darken what is beneath them (`mix-blend-mode`),
 * often inside a clipped group. Safari and Illustrator let such a shape darken what lies under
 * the group; Chrome and Firefox paint a clipped group on its own first, so there the shading has
 * nothing to darken and shows as a flat grey patch. Here every clipped group that holds such a
 * shape is cut into layers, and each mixing layer becomes a clipped group that mixes as a whole,
 * which all browsers, and every export made by them, draw alike.
 */
function settleBlends(parent: Element, linked: Set<string>): void {
  for (const child of Array.from(parent.children)) {
    if (child.tagName.toLowerCase() !== 'g' || linked.has(child.getAttribute('id') ?? '')) continue
    if (paintedApart(child) || !isSet(child, 'clip-path')) {
      // Painted on its own, or a plain group that changes nothing about mixing: look inside.
      settleBlends(child, linked)
      continue
    }
    const layers = layersOf(child, linked)
    if (layers.length === 1 && layers[0][1] === child) continue
    for (const [blend, shell] of layers) if (blend) setBlend(shell, blend)
    if (layers.length === 1) child.replaceWith(layers[0][1])
    else {
      // One group where there was one, so the icon still comes apart into the same pieces.
      const group = parent.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'g')
      group.append(...layers.map(([, shell]) => shell))
      child.replaceWith(group)
    }
  }
}

/** True when a drawing holds a shape that mixes with what is beneath it (a shadow that darkens, a tint). */
export const hasMixing = (body: string): boolean => {
  for (const m of body.matchAll(/mix-blend-mode\s*:\s*([a-z-]+)/gi)) if (BLENDS.has(m[1].toLowerCase())) return true
  return false
}

/** See `settleBlends`. Does nothing to a drawing without mixing shapes. */
function settleShading(root: Element): void {
  if (!root.querySelector('[style*="mix-blend-mode"], [mix-blend-mode]')) return
  const linked = new Set(Array.from(root.querySelectorAll('use')).map((use) => (use.getAttribute('href') ?? '').replace(/^#/, '')))
  settleBlends(root, linked)
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

const XLINK = 'http://www.w3.org/1999/xlink'

// The filter Illustrator calls "luminosity-invert": every colour becomes its negative.
const NEGATIVE = [-1, 0, 0, 0, 1, 0, -1, 0, 0, 1, 0, 0, -1, 0, 1, 0, 0, 0, 1, 0]
const PAINTS = ['fill', 'stroke', 'stop-color']

/** The negative of a plain colour, or null when the value is not one (a gradient, `none`, a colour name we do not know). */
function negative(value: string): string | null {
  const v = value.trim().toLowerCase()
  const hex = v === 'white' ? '#ffffff' : v === 'black' ? '#000000' : isHexColor(v) ? normalizeHex(v) : null
  const rgb = hex ? [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) : (/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/.exec(v)?.slice(1).map(Number) ?? null)
  if (!rgb || rgb.some((n) => !(n >= 0 && n <= 255))) return null
  return `#${rgb.map((n) => (255 - n).toString(16).padStart(2, '0')).join('')}`
}

/**
 * Illustrator writes a fade as a mask whose drawing passes through a filter that turns it into
 * its negative. Filters are not kept (they are slow and blurry on tablets), and without the
 * filter such a mask hides exactly what it should show. So the negative is worked out here once:
 * the colours inside the mask are inverted, gradients included, and the filter is no longer needed.
 */
function bakeNegativeMasks(root: Element): void {
  const negatives = new Set<string>()
  // The "noclip" kind lays white under the mask's drawing, so that whatever the drawing does not cover is shown.
  const whiteUnder = new Set<string>()
  for (const filter of Array.from(root.querySelectorAll('filter'))) {
    const steps = Array.from(filter.children)
    const id = filter.getAttribute('id')
    if (!id) continue
    const kinds = steps.map((s) => s.tagName.toLowerCase())
    const inverts = kinds[0] === 'fecolormatrix'
    if (inverts) {
      const values = (steps[0].getAttribute('values') ?? '').trim().split(/[\s,]+/).map(Number)
      if (values.length !== 20 || !values.every((n, i) => n === NEGATIVE[i])) continue
    }
    const rest = kinds.slice(inverts ? 1 : 0)
    const flood = rest.length === 2 && rest[0] === 'feflood' && rest[1] === 'feblend' ? steps[steps.length - 2] : null
    const white = !!flood && negative(flood.getAttribute('flood-color') ?? '') === '#000000'
    if (rest.length && !white) continue
    if (inverts) negatives.add(id)
    if (white) whiteUnder.add(id)
  }
  if (!negatives.size && !whiteUnder.size) return
  const byId = (id: string): Element | undefined => Array.from(root.querySelectorAll('[id]')).find((el) => el.getAttribute('id') === id)
  const made = new Map<string, string>()
  // A gradient may also colour something outside the mask, so the mask gets a negative copy of its own.
  const negativeGradient = (id: string): string => {
    const known = made.get(id)
    if (known) return known
    const source = byId(id)
    if (!source || !/gradient$/i.test(source.tagName)) return id
    const copy = source.cloneNode(true) as Element
    const copyId = `${id}-negative`
    made.set(id, copyId)
    copy.setAttribute('id', copyId)
    for (const stop of Array.from(copy.querySelectorAll('stop'))) invert(stop)
    // A gradient without stops of its own takes them from the one it points to.
    const link = Array.from(copy.attributes).find((a) => a.localName === 'href')
    if (link?.value.startsWith('#') && !copy.querySelector('stop')) {
      copy.removeAttribute(link.name)
      copy.setAttribute('href', `#${negativeGradient(link.value.slice(1))}`)
    }
    source.after(copy)
    return copyId
  }
  const swap = (value: string): string => {
    const ref = LOCAL_REF.exec(value)
    return ref ? `url(#${negativeGradient(ref[1])})` : (negative(value) ?? value)
  }
  function invert(el: Element): void {
    for (const name of PAINTS) {
      const value = el.getAttribute(name)
      if (value) el.setAttribute(name, swap(value))
    }
    const style = el.getAttribute('style')
    if (style) {
      el.setAttribute(
        'style',
        style
          .split(';')
          .map((decl) => {
            const at = decl.indexOf(':')
            const name = decl.slice(0, at).trim().toLowerCase()
            return at > 0 && PAINTS.includes(name) ? `${name}:${swap(decl.slice(at + 1))}` : decl
          })
          .join(';'),
      )
    }
  }
  for (const mask of Array.from(root.querySelectorAll('mask'))) {
    for (const el of Array.from(mask.querySelectorAll('*'))) {
      const style = el.getAttribute('style') ?? ''
      const ref = LOCAL_REF.exec(el.getAttribute('filter') ?? '') ?? LOCAL_REF.exec(/(?:^|;)\s*filter\s*:([^;]*)/i.exec(style)?.[1] ?? '')
      if (!ref) continue
      if (negatives.has(ref[1])) {
        invert(el)
        for (const inner of Array.from(el.querySelectorAll('*'))) invert(inner)
        // A shape that names no fill is black, and the negative of black is white.
        if (!el.getAttribute('fill') && !/(?:^|;)\s*fill\s*:/i.test(style)) el.setAttribute('fill', '#ffffff')
      }
      if (whiteUnder.has(ref[1])) {
        const under = root.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'rect')
        for (const name of ['x', 'y', 'width', 'height']) under.setAttribute(name, mask.getAttribute(name) ?? (name === 'x' || name === 'y' ? '-10%' : '120%'))
        under.setAttribute('fill', '#ffffff')
        el.prepend(under)
      }
    }
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
      // A link is `href`, or `href` in the XLink namespace under whatever prefix the file gives it (xlink:, ns1:).
      if (name === 'href' || (attr.localName === 'href' && attr.namespaceURI === XLINK) || name === 'xlink:href') {
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
  settleShading(root)
  return serializeChildren(root)
}

export interface ParsedSvg {
  viewBox: [number, number]
  body: string
}

/**
 * Some programs write every SVG element with a prefix (`<ns0:svg xmlns:ns0="…">`, `<ns0:path>`).
 * It is the same drawing, but the prefixed names cannot be placed in a page, so the prefix is taken off.
 */
export function plainSvgNames(text: string): string {
  const m = /<([A-Za-z_][\w-]*):svg\b[^>]*?\sxmlns:\1\s*=\s*(["'])http:\/\/www\.w3\.org\/2000\/svg\2/.exec(text)
  if (!m) return text
  const prefix = m[1]
  return text.replace(new RegExp(`<(/?)${prefix}:`, 'g'), '<$1').replace(new RegExp(`\\sxmlns:${prefix}\\s*=`), ' xmlns=')
}

/**
 * Colours written as `rgb(201,94,76)` (Affinity writes them so) as hex codes (`#c95e4c`), the only
 * spelling recolouring knows. Percentages and the newer `rgb(201 94 76)` are read too, and an `rgba`
 * that is fully opaque. A colour that is partly see-through, or out of range, is left as written:
 * it keeps its look, it just cannot be recoloured.
 */
export function hexColours(value: string): string {
  return value.replace(/rgba?\(([^()]*)\)/gi, (m, inner: string) => {
    const parts = inner.trim().split(/\s*[,/]\s*|\s+/)
    if (parts.length === 4) {
      const alpha = parts.pop() as string
      if (!/^(?:1(?:\.0*)?|100(?:\.0*)?%)$/.test(alpha)) return m
    }
    if (parts.length !== 3) return m
    const channels = parts.map((p) => (/^\d*\.?\d+%$/.test(p) ? (Number(p.slice(0, -1)) * 255) / 100 : /^\d*\.?\d+$/.test(p) ? Number(p) : NaN))
    if (channels.some((n) => !(n >= 0 && n <= 255))) return m
    return `#${channels.map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')}`
  })
}

/** Read an SVG file chosen by the user and reduce it to safe, self-contained icon markup. */
export function parseSvgFile(text: string): ParsedSvg {
  const root = parseRoot(plainSvgNames(text))
  if (!root) throw new Error('This file is not a valid SVG image.')
  inlineStyles(root)
  bakeNegativeMasks(root)
  unwrap(root)
  clean(root)
  for (const el of Array.from(root.querySelectorAll('*')))
    for (const attr of Array.from(el.attributes)) if (/rgba?\(/i.test(attr.value)) el.setAttribute(attr.name, hexColours(attr.value))
  dropDanglingEffects(root)
  settleShading(root)
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
