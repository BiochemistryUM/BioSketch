// Export: SVG, PNG and the attribution text for the icons used.

import { structureCredit } from '../model/structure'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getIcon, isPublicDomain } from '../icons/library'
import { hasMixing } from '../icons/svg'
import { contentRect, usedIconIds } from '../model/doc'
import { ARROW_LABEL_SIZE } from '../model/nodes'
import type { FigDoc, FigNode, ImageNode, Rect } from '../model/types'
import { DocNodes } from '../render/DocNodes'
import { fileBase } from './download'
import { buildDeck, buildPptx, utf8, zipStore, type PptxPicture } from './pptx'

export interface ExportOptions {
  /** 'page' exports the white page; 'content' crops to what is drawn. */
  area: 'page' | 'content'
  transparent: boolean
  includeSketch: boolean
}

const escapeXml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function exportRect(doc: FigDoc, area: ExportOptions['area'], includeSketch = true): Rect {
  if (area === 'content') {
    const visible = includeSketch ? doc : { ...doc, nodes: doc.nodes.filter((n) => n.type !== 'stroke') }
    const r = contentRect(visible)
    if (r && r.w > 0 && r.h > 0) {
      const pad = 16
      return { x: Math.floor(r.x - pad), y: Math.floor(r.y - pad), w: Math.ceil(r.w + 2 * pad), h: Math.ceil(r.h + 2 * pad) }
    }
  }
  return { x: 0, y: 0, w: doc.width, h: doc.height }
}

// Creative Commons licences ask for a link to the licence text beside its name.
const LICENCE_LINKS: [RegExp, string][] = [
  [/^cc[ -]?by[ -]?sa[ -]?(\d\.\d)/i, 'https://creativecommons.org/licenses/by-sa/$1/'],
  [/^cc[ -]?by[ -]?(\d\.\d)/i, 'https://creativecommons.org/licenses/by/$1/'],
]

function licenceWithLink(licence: string): string {
  const name = licence.trim()
  for (const [pattern, link] of LICENCE_LINKS) {
    const m = pattern.exec(name)
    if (m) return `${name} (${link.replace('$1', m[1])})`
  }
  return name || 'not specified'
}

/**
 * One line per icon that requires credit. Public-domain (CC0) icons are left out. An icon that
 * was recoloured, redrawn thicker or thinner, split or reshaped is marked "adapted", as
 * Creative Commons licences ask.
 */
export function attributionLines(doc: FigDoc): string[] {
  const adapted = new Set(doc.nodes.flatMap((n) => (n.type === 'icon' && (n.colors || n.strokeScale) ? [n.iconId] : [])))
  const lines: string[] = []
  // Hidden icons are not in the export, so they need no credit.
  for (const id of usedIconIds({ ...doc, nodes: doc.nodes.filter((n) => !n.hidden) })) {
    const icon = getIcon(doc, id)
    if (!icon || isPublicDomain(icon.license)) continue
    const by = icon.author.trim() || 'unknown author'
    const source = icon.source.trim() ? ` (${icon.source.trim()})` : ''
    const changed = adapted.has(id) || icon.category === 'Part' ? ' (adapted)' : ''
    lines.push(`"${icon.name}"${changed} by ${by}${source}, licence: ${licenceWithLink(icon.license)}`)
  }
  // The pieces of a split icon all credit the same original; say it once.
  return [...new Set(lines)]
}

/** The credit of every protein structure shown (AlphaFold DB asks for one; the PDB entry is named). */
export function structureCredits(doc: FigDoc): string[] {
  return [...new Set(doc.nodes.flatMap((n) => (n.type === 'structure' && !n.hidden ? [structureCredit(n)] : [])).filter(Boolean))]
}

export function attributionText(doc: FigDoc): string {
  const lines = attributionLines(doc)
  const structures = structureCredits(doc)
  if (!lines.length && !structures.length) return ''
  return ['Created with BioSketch.', lines.length ? `Icons: ${lines.join('; ')}.` : '', ...structures].filter(Boolean).join(' ')
}

/** Millimetres per figure unit when a printed width is set, otherwise null. */
export const mmPerUnit = (doc: FigDoc): number | null => (doc.widthMm && doc.width > 0 ? doc.widthMm / doc.width : null)

const MM_PER_POINT = 25.4 / 72

/**
 * The smallest text in the figure, in printed points, when a printed width is set.
 * Journals usually ask for at least 5 to 7 points.
 */
export function smallestTextPt(doc: FigDoc): number | null {
  const k = mmPerUnit(doc)
  if (!k) return null
  const sizes = doc.nodes.flatMap((n) =>
    n.type === 'text' ? [n.fontSize] : n.type === 'connector' && n.label?.trim() ? [ARROW_LABEL_SIZE] : [],
  )
  if (!sizes.length) return null
  return Math.round(((Math.min(...sizes) * k) / MM_PER_POINT) * 10) / 10
}

/** PNG scale factor that gives the wanted dots per inch at the printed width, or null when no width is set. */
export function scaleForDpi(doc: FigDoc, dpi: number): number | null {
  const k = mmPerUnit(doc)
  return k ? (dpi * k) / 25.4 : null
}

/**
 * Links inside the figure (a placed picture, a shape an icon draws twice, a gradient built on
 * another) in their older spelling, `xlink:href`. Browsers read both spellings; Illustrator,
 * Office, older Inkscape and the converters journals run read only the older one, and a file
 * with the newer one opens there with those parts missing.
 */
export const olderLinks = (markup: string): string => markup.replace(/<[^<>]+>/g, (tag) => tag.replace(/(\s)href="/g, '$1xlink:href="'))

/**
 * `sized: false` states the size in figure units even when a printed width is set (see `forPixels`).
 * `credited` is the figure whose icons are named in the credit, when `doc` no longer holds them all
 * (see `iconsAsPictures`).
 */
export function renderSvg(doc: FigDoc, opts: ExportOptions, sized = true, credited: FigDoc = doc): { svg: string; width: number; height: number } {
  const r = exportRect(doc, opts.area, opts.includeSketch)
  // Drawn inside an <svg> element, so that React knows these are SVG elements (it warns about
  // <linearGradient> otherwise); only what is inside it is kept.
  const drawn = renderToStaticMarkup(createElement('svg', null, createElement(DocNodes, { doc, hideSketch: !opts.includeSketch })))
  const body = olderLinks(drawn.replace(/^<svg>/, '').replace(/<\/svg>$/, '').replace(/ data-id="[^"]*"/g, ''))
  const credit = attributionText(credited)
  // With a printed width set, the file states its real size, so it opens at the right size elsewhere.
  const k = sized ? mmPerUnit(doc) : null
  const size = (units: number): string => (k ? `${Math.round(units * k * 100) / 100}mm` : String(units))
  const background = opts.transparent ? '' : `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${escapeXml(doc.background)}"/>`
  const svg =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size(r.w)}" height="${size(r.h)}" viewBox="${r.x} ${r.y} ${r.w} ${r.h}">` +
    `<title>${escapeXml(doc.name)}</title>` +
    (credit ? `<desc>${escapeXml(credit)}</desc>` : '') +
    background +
    body +
    `</svg>\n`
  return { svg, width: r.w, height: r.h }
}

/** Browsers refuse very large canvases (iPad Safari allows about 16.7 million pixels). */
const MAX_PIXELS = 16_000_000

async function rasterize(svg: string, width: number, height: number, scale: number): Promise<HTMLCanvasElement> {
  const k = Math.min(scale, Math.sqrt(MAX_PIXELS / (width * height)))
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('The figure could not be rendered as an image.'))
      img.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width * k))
    canvas.height = Math.max(1, Math.round(height * k))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('This browser cannot create images.')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * The figure as the browser turns it into pixels: sized in whole figure units. A size in
 * millimetres is a fraction of a pixel wider than the picture the browser makes of it, which
 * leaves a faintly see-through line of pixels along the edges of the PNG.
 */
const forPixels = (doc: FigDoc, opts: ExportOptions): { svg: string; width: number; height: number } => renderSvg(doc, opts, false)

export async function renderPng(doc: FigDoc, opts: ExportOptions, scale: number): Promise<Blob> {
  const { svg, width, height } = forPixels(doc, opts)
  const canvas = await rasterize(svg, width, height, scale)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('The image could not be saved.'))), 'image/png'),
  )
}

/** A PNG of the page (with the sketch) as base64, no larger than `maxSide` pixels. Used for the AI. */
export async function renderPngBase64(doc: FigDoc, maxSide: number): Promise<string> {
  const { svg, width, height } = forPixels(doc, { area: 'page', transparent: false, includeSketch: true })
  const canvas = await rasterize(svg, width, height, Math.min(1, maxSide / Math.max(width, height)))
  return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '')
}

export { download, fileBase } from './download'

/** Makes a PNG, as a data URL, of an SVG file `width` × `height` units large, with `scale` pixels to the unit. */
export type ToPng = (svg: string, width: number, height: number, scale: number) => Promise<string>

const viaCanvas: ToPng = async (svg, width, height, scale) => (await rasterize(svg, width, height, scale)).toDataURL('image/png')

/** True when PowerPoint cannot draw this object as the page shows it: an icon shaded with shapes that mix. */
export const needsPicture = (doc: FigDoc, node: FigNode): boolean =>
  node.type === 'icon' && !node.hidden && !node.guide && hasMixing(getIcon(doc, node.iconId)?.body ?? '')

/**
 * PowerPoint draws the SVG of a slide itself, but it does not know shapes that mix with what is
 * beneath them (`mix-blend-mode`): it paints them as plain covering shapes, so a shadow becomes a
 * grey patch and a tint a solid colour. For PowerPoint every icon shaded that way is therefore
 * replaced by a picture of itself, as the browser draws it; it keeps its place, size, turn and
 * the arrows attached to it. Everything else stays as it is drawn. An icon whose picture cannot be
 * made is left as it is.
 */
export async function iconsAsPictures(doc: FigDoc, pixelsPerUnit: number, toPng: ToPng = viaCanvas): Promise<FigDoc> {
  if (!doc.nodes.some((node) => needsPicture(doc, node))) return doc
  const made = new Map<string, string>()
  const nodes: FigNode[] = []
  for (const node of doc.nodes) {
    if (node.type !== 'icon' || !needsPicture(doc, node)) {
      nodes.push(node)
      continue
    }
    const { type: _type, iconId, flipX, flipY, colors, strokeScale, ...placed } = node
    // The same icon, coloured and sized the same, is drawn once however often it stands in the figure.
    const key = JSON.stringify([iconId, colors ?? null, strokeScale ?? null, !!flipX, !!flipY, node.w, node.h])
    let src = made.get(key)
    if (src === undefined) {
      // The icon alone on a see-through page of its own size, drawn by the one renderer; its turn and
      // its transparency stay with the picture that takes its place.
      const alone: FigDoc = { ...doc, width: node.w, height: node.h, widthMm: undefined, nodes: [{ ...node, x: 0, y: 0, rotation: 0, opacity: undefined, locked: undefined, groupId: undefined }] }
      const { svg } = renderSvg(alone, { area: 'page', transparent: true, includeSketch: false }, false)
      try {
        src = await toPng(svg, node.w, node.h, pixelsPerUnit)
      } catch {
        src = ''
      }
      made.set(key, src)
    }
    if (!src.startsWith('data:image/png;base64,')) {
      nodes.push(node)
      continue
    }
    const picture: ImageNode = { ...placed, type: 'image', src }
    nodes.push(picture)
  }
  return { ...doc, nodes }
}

/** The SVG stored in a PowerPoint file: the figure, with the icons PowerPoint cannot draw as pictures. */
export async function svgForPowerPoint(doc: FigDoc, opts: ExportOptions, pixelsPerUnit: number, toPng: ToPng = viaCanvas): Promise<{ svg: string; width: number; height: number }> {
  return renderSvg(await iconsAsPictures(doc, pixelsPerUnit, toPng), opts, true, doc)
}

/** A PowerPoint file with the figure on one slide, as a vector picture with a PNG beside it for older programs. */
export async function renderPptx(doc: FigDoc, opts: ExportOptions): Promise<Blob> {
  const r = exportRect(doc, opts.area, opts.includeSketch)
  // The PNG is only the fallback; about 2400 pixels on the long side is sharp on any projector.
  const scale = Math.min(3, 2400 / Math.max(r.w, r.h))
  const png = await renderPng(doc, opts, scale)
  // Icons that become pictures get twice as many pixels, so they stay sharp when the slide is enlarged.
  const { svg, width, height } = await svgForPowerPoint(doc, opts, scale * 2)
  const file = buildPptx({ title: doc.name, width, height, png: new Uint8Array(await png.arrayBuffer()), svg })
  return new Blob([file.buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' })
}

/**
 * The slides of a figure exported together are whole pages of one size: cropping each to its own
 * drawing would give a presentation whose pages jump in size.
 */
export const forSlides = (opts: ExportOptions): ExportOptions => ({ ...opts, area: 'page' })

/** A PowerPoint file with every slide of the figure (`slideDocs`) as a slide of its own, the size of the page. */
export async function renderDeckPptx(slides: FigDoc[], opts: ExportOptions): Promise<Blob> {
  const whole = forSlides(opts)
  const pics: PptxPicture[] = []
  for (const slide of slides) {
    const r = exportRect(slide, whole.area, whole.includeSketch)
    const scale = Math.min(3, 2400 / Math.max(r.w, r.h))
    const png = await renderPng(slide, whole, scale)
    const { svg, width, height } = await svgForPowerPoint(slide, whole, scale * 2)
    pics.push({ title: slide.name, width, height, png: new Uint8Array(await png.arrayBuffer()), svg })
  }
  const file = buildDeck(pics, true)
  return new Blob([file.buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' })
}

/** The name of the file of one slide among `count`: "figure-03.svg", with as many digits as the last slide needs. */
export const slideFileName = (base: string, index: number, count: number, ext: string): string =>
  `${base}-${String(index + 1).padStart(Math.max(2, String(count).length), '0')}.${ext}`

/**
 * Every slide as a file of its own (SVG, or PNG with `scale` pixels to the unit), in one ZIP
 * archive: a browser saves one file at a press, not twenty.
 */
export async function renderSlidesZip(slides: FigDoc[], opts: ExportOptions, kind: 'svg' | 'png', scale = 2): Promise<Blob> {
  const whole = forSlides(opts)
  const base = slides[0] ? fileBase(slides[0]) : 'figure'
  const files = []
  for (const [i, slide] of slides.entries()) {
    const data = kind === 'svg' ? utf8(renderSvg(slide, whole).svg) : new Uint8Array(await (await renderPng(slide, whole, scale)).arrayBuffer())
    files.push({ name: slideFileName(base, i, slides.length, kind), data })
  }
  return new Blob([zipStore(files).buffer as ArrayBuffer], { type: 'application/zip' })
}

/**
 * The pages handed to the print window: every figure alone on paper of exactly its printed size,
 * one page each. Several are the slides of one figure, which share a page size.
 */
export function printPages(docs: FigDoc[], opts: ExportOptions): string {
  const first = docs[0]
  if (!first) return ''
  const drawn = docs.map((doc) => renderSvg(doc, docs.length > 1 ? forSlides(opts) : opts))
  // Without a printed width, one figure unit is one CSS pixel (96 per inch).
  const k = mmPerUnit(first) ?? 25.4 / 96
  const w = Math.round(drawn[0].width * k * 100) / 100
  const h = Math.round(drawn[0].height * k * 100) / 100
  const pages = drawn.map(({ svg }) => svg.replace(/^<\?xml[^>]*>\s*/, ''))
  // Every slide after the first begins a page of its own.
  const breaks = docs.length > 1 ? 'svg+svg{break-before:page;page-break-before:always}' : ''
  return (
    `<!doctype html><html><head><meta charset="utf-8"><title>${escapeXml(first.name)}</title>` +
    `<style>@page{size:${w}mm ${h}mm;margin:0}html,body{margin:0;padding:0}svg{display:block;width:${w}mm;height:${h}mm}${breaks}</style>` +
    `</head><body>${pages.join('')}</body></html>`
  )
}

/** The page handed to the print window: the figure alone, on paper of exactly its printed size. */
export const printPage = (doc: FigDoc, opts: ExportOptions): string => printPages([doc], opts)

/**
 * Vector PDF through the browser's own print window (choose "Save as PDF" there). The browser
 * draws the figure exactly as on screen and embeds the fonts, so nothing is lost in conversion.
 * Several figures (the slides of one) become one PDF with a page each.
 */
export function printFigure(doc: FigDoc | FigDoc[], opts: ExportOptions): void {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
  frame.srcdoc = printPages(Array.isArray(doc) ? doc : [doc], opts)
  const cleanUp = () => setTimeout(() => frame.remove(), 1000)
  frame.onload = () => {
    const view = frame.contentWindow
    if (!view) return
    view.addEventListener('afterprint', cleanUp)
    view.focus()
    view.print()
  }
  document.body.appendChild(frame)
  // Safety net for browsers that never report the end of printing.
  setTimeout(() => frame.remove(), 5 * 60_000)
}
