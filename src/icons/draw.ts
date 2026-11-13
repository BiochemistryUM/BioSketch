// Shared helpers for drawing built-in icons, so every pack uses the same palette and outline style.

import type { IconDef } from '../model/types'
import { BUILTIN_SOURCE } from './style'

export const r1 = (v: number): number => Math.round(v * 10) / 10

export const C = {
  cell: '#fde4d6', cellLine: '#e59a78',
  nuc: '#cdbdf0', nucLine: '#7b61c4',
  mito: '#f9c3a6', mitoLine: '#d9623a',
  green: '#bfe5c8', greenLine: '#3f9a5f',
  gold: '#f9dc8e', goldLine: '#d39a1c',
  blue: '#a9cdf3', blueLine: '#2f6fb5',
  red: '#f4a9a8', redLine: '#c9403d',
  teal: '#a6e0da', tealLine: '#1f8f84',
  grey: '#e6eaf0', greyLine: '#5b6676',
  lipid: '#fbe58a', lipidLine: '#d1a514',
  orange: '#f9b872', orangeLine: '#d07a1c',
  pink: '#f7c6e0', pinkLine: '#c2508f',
}

export const FONT = 'font-family="Helvetica, Arial, sans-serif" font-weight="bold" text-anchor="middle" stroke="none"'

/** A thick line with an outline, drawn as two strokes. */
export const ribbon = (d: string, outer: string, inner: string, width: number): string =>
  `<path d="${d}" fill="none" stroke="${outer}" stroke-width="${width + 5}"/><path d="${d}" fill="none" stroke="${inner}" stroke-width="${width}"/>`

export function def(
  id: string,
  name: string,
  category: string,
  tags: string,
  w: number,
  h: number,
  inner: string,
): IconDef {
  return {
    id,
    name,
    category,
    tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
    viewBox: [w, h],
    body: `<g stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5">${inner}</g>`,
    license: 'CC0-1.0',
    author: 'BioSketch contributors',
    source: BUILTIN_SOURCE,
  }
}

// ---------- small markup builders ----------

export const fill = (f: string, s: string, extra = ''): string => `fill="${f}" stroke="${s}"${extra ? ` ${extra}` : ''}`
export const circle = (cx: number, cy: number, r: number, attrs: string): string => `<circle cx="${cx}" cy="${cy}" r="${r}" ${attrs}/>`
export const ellipse = (cx: number, cy: number, rx: number, ry: number, attrs: string): string =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${attrs}/>`
export const rect = (x: number, y: number, w: number, h: number, rx: number, attrs: string): string =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" ${attrs}/>`
export const line = (d: string, stroke: string, width: number): string => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}"/>`
/** A free shape: one path with its own fill and outline. */
export const shape = (d: string, attrs: string): string => `<path d="${d}" ${attrs}/>`
export const label = (x: number, y: number, size: number, colour: string, text: string): string =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${colour}" ${FONT}>${text}</text>`

// ---------- membranes and tubes ----------

export const MEM_LINE = '#d39a1c'
export const MEM_FILL = '#fbe3a6'

/** A stretch of membrane seen edge-on, drawn as an outlined band. */
export const membrane = (d: string, width = 5): string => ribbon(d, MEM_LINE, MEM_FILL, width)

/** Several tubes that join: all outlines are drawn first so the joins look seamless. */
export function network(paths: string[], outer: string, inner: string, width: number): string {
  return (
    paths.map((d) => `<path d="${d}" fill="none" stroke="${outer}" stroke-width="${width + 5}"/>`).join('') +
    paths.map((d) => `<path d="${d}" fill="none" stroke="${inner}" stroke-width="${width}"/>`).join('')
  )
}
