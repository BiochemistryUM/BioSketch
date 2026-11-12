// Export: SVG, PNG and the attribution text for the icons used.

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getIcon } from '../icons/library'
import { contentRect, usedIconIds } from '../model/doc'
import type { FigDoc, Rect } from '../model/types'
import { DocNodes } from '../render/DocNodes'

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

/** One line per icon that requires credit. Public-domain (CC0) icons are left out. */
export function attributionLines(doc: FigDoc): string[] {
  const lines: string[] = []
  for (const id of usedIconIds(doc)) {
    const icon = getIcon(doc, id)
    if (!icon || /^(cc0|public domain)/i.test(icon.license.trim())) continue
    const by = icon.author.trim() || 'unknown author'
    const source = icon.source.trim() ? ` (${icon.source.trim()})` : ''
    lines.push(`"${icon.name}" by ${by}${source}, licence: ${icon.license.trim() || 'not specified'}`)
  }
  return lines
}

export function attributionText(doc: FigDoc): string {
  const lines = attributionLines(doc)
  return lines.length ? `Created with BioSketch. Icons: ${lines.join('; ')}.` : ''
}

export function renderSvg(doc: FigDoc, opts: ExportOptions): { svg: string; width: number; height: number } {
  const r = exportRect(doc, opts.area, opts.includeSketch)
  const body = renderToStaticMarkup(createElement(DocNodes, { doc, hideSketch: !opts.includeSketch })).replace(/ data-id="[^"]*"/g, '')
  const credit = attributionText(doc)
  const background = opts.transparent ? '' : `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${escapeXml(doc.background)}"/>`
  const svg =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${r.w}" height="${r.h}" viewBox="${r.x} ${r.y} ${r.w} ${r.h}">` +
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
