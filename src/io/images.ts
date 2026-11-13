// Placing the user's own pictures (micrographs, plots, photos) into a figure.
// Pictures are stored inside the figure as data URLs, so a saved figure is one self-contained file.

import { uid } from '../model/doc'
import type { ImageNode, Point } from '../model/types'
import { toast, useEditor } from '../store'
import { isImageDataUrl } from './files'

/** Larger pictures are scaled down on import to keep figure files and autosave small. */
const MAX_SIDE = 2400
const MAX_FILE_BYTES = 25_000_000

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('The picture could not be read.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('This file is not a picture the browser can show.'))
    img.src = src
  })
}

/** Size on the page for a picture of the given pixel size: at most 40% of the page, never enlarged. */
export function fitImage(width: number, height: number, page: { width: number; height: number }): { w: number; h: number } {
  const scale = Math.min(1, (page.width * 0.4) / width, (page.height * 0.4) / height)
  return { w: Math.round(width * scale), h: Math.round(height * scale) }
}

/** Read a picture file, shrink it if needed, and put it on the page (centred on `at`, or in view). */
export async function placeImageFile(file: File, at?: Point): Promise<void> {
  try {
    if (file.type === 'image/svg+xml') throw new Error('For SVG files, use “Import SVG icon” in the icon library instead.')
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) throw new Error('Only PNG, JPEG, WebP and GIF pictures can be placed.')
    if (file.size > MAX_FILE_BYTES) throw new Error('This picture is larger than 25 MB. Export a smaller version first.')
    let src = await readAsDataUrl(file)
    const img = await loadImage(src)
    let { naturalWidth: width, naturalHeight: height } = img
    if (Math.max(width, height) > MAX_SIDE) {
      const k = MAX_SIDE / Math.max(width, height)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(width * k)
      canvas.height = Math.round(height * k)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('This browser cannot resize pictures.')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      // Photos stay JPEG (small); everything else becomes PNG so transparency survives.
      src = file.type === 'image/jpeg' ? canvas.toDataURL('image/jpeg', 0.9) : canvas.toDataURL('image/png')
      width = canvas.width
      height = canvas.height
    }
    if (!isImageDataUrl(src)) throw new Error('This picture could not be stored in the figure.')
    const s = useEditor.getState()
    const { w, h } = fitImage(width, height, s.doc)
    const centre = at ?? {
      x: (s.canvasSize.w / 2 - s.view.x) / s.view.zoom,
      y: (s.canvasSize.h / 2 - s.view.y) / s.view.zoom,
    }
    const node: ImageNode = { id: uid(), type: 'image', src, x: Math.round(centre.x - w / 2), y: Math.round(centre.y - h / 2), w, h, rotation: 0 }
    s.commit((doc) => ({ ...doc, nodes: [...doc.nodes, node] }), { select: [node.id] })
    s.set({ tool: 'select' })
    toast('Picture placed. Drag a corner to resize it.')
  } catch (e) {
    toast(e instanceof Error ? e.message : 'The picture could not be placed.')
  }
}
