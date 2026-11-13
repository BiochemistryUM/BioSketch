// Export: SVG, PNG and the attribution text for the icons used.

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getIcon, isPublicDomain } from '../icons/library'
import { contentRect, usedIconIds } from '../model/doc'
import type { FigDoc, Rect } from '../model/types'
import { DocNodes } from '../render/DocNodes'
import { buildPptx } from './pptx'

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

export function attributionText(doc: FigDoc): string {
  const lines = attributionLines(doc)
  return lines.length ? `Created with BioSketch. Icons: ${lines.join('; ')}.` : ''
}

/** Millimetres per figure unit when a printed width is set, otherwise null. */
export const mmPerUnit = (doc: FigDoc): number | null => (doc.widthMm && doc.width > 0 ? doc.widthMm / doc.width : null)

const MM_PER_POINT = 25.4 / 72
/** Size of arrow labels, which is fixed. */
const ARROW_LABEL_SIZE = 14

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

export function renderSvg(doc: FigDoc, opts: ExportOptions): { svg: string; width: number; height: number } {
  const r = exportRect(doc, opts.area, opts.includeSketch)
  const body = renderToStaticMarkup(createElement(DocNodes, { doc, hideSketch: !opts.includeSketch })).replace(/ data-id="[^"]*"/g, '')
  const credit = attributionText(doc)
  // With a printed width set, the file states its real size, so it opens at the right size elsewhere.
  const k = mmPerUnit(doc)
  const size = (units: number): string => (k ? `${Math.round(units * k * 100) / 100}mm` : String(units))
  const background = opts.transparent ? '' : `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${escapeXml(doc.background)}"/>`
  const svg =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size(r.w)}" height="${size(r.h)}" viewBox="${r.x} ${r.y} ${r.w} ${r.h}">` +
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

export async function renderPng(doc: FigDoc, opts: ExportOptions, scale: number): Promise<Blob> {
  const { svg, width, height } = renderSvg(doc, opts)
  const canvas = await rasterize(svg, width, height, scale)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('The image could not be saved.'))), 'image/png'),
  )
}

/** A PNG of the page (with the sketch) as base64, no larger than `maxSide` pixels. Used for the AI. */
export async function renderPngBase64(doc: FigDoc, maxSide: number): Promise<string> {
  const { svg, width, height } = renderSvg(doc, { area: 'page', transparent: false, includeSketch: true })
  const canvas = await rasterize(svg, width, height, Math.min(1, maxSide / Math.max(width, height)))
  return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '')
}

export function download(data: Blob | string, filename: string, type = 'application/octet-stream'): void {
  const blob = typeof data === 'string' ? new Blob([data], { type }) : data
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function fileBase(doc: FigDoc): string {
  return doc.name.trim().replace(/[^\w\- ]+/g, '').replace(/\s+/g, '-').toLowerCase() || 'figure'
}

/** A PowerPoint file with the figure on one slide, as a vector picture with a PNG beside it for older programs. */
export async function renderPptx(doc: FigDoc, opts: ExportOptions): Promise<Blob> {
  const { svg, width, height } = renderSvg(doc, opts)
  // The PNG is only the fallback; about 2400 pixels on the long side is sharp on any projector.
  const png = await renderPng(doc, opts, Math.min(3, 2400 / Math.max(width, height)))
  const file = buildPptx({ title: doc.name, width, height, png: new Uint8Array(await png.arrayBuffer()), svg })
  return new Blob([file.buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' })
}

/** The page handed to the print window: the figure alone, on paper of exactly its printed size. */
export function printPage(doc: FigDoc, opts: ExportOptions): string {
  const { svg, width, height } = renderSvg(doc, opts)
  // Without a printed width, one figure unit is one CSS pixel (96 per inch).
  const k = mmPerUnit(doc) ?? 25.4 / 96
  const w = Math.round(width * k * 100) / 100
  const h = Math.round(height * k * 100) / 100
  return (
    `<!doctype html><html><head><meta charset="utf-8"><title>${escapeXml(doc.name)}</title>` +
    `<style>@page{size:${w}mm ${h}mm;margin:0}html,body{margin:0;padding:0}svg{display:block;width:${w}mm;height:${h}mm}</style>` +
    `</head><body>${svg.replace(/^<\?xml[^>]*>\s*/, '')}</body></html>`
  )
}

/**
 * Vector PDF through the browser's own print window (choose "Save as PDF" there). The browser
 * draws the figure exactly as on screen and embeds the fonts, so nothing is lost in conversion.
 */
export function printFigure(doc: FigDoc, opts: ExportOptions): void {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
  frame.srcdoc = printPage(doc, opts)
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
