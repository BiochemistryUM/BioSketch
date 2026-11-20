// Pictures of slides, for the row of slides under the page and for showing them full screen. A
// slide is drawn by the code that exports it (`renderSvg`), into a file of its own that the browser
// shows as a picture: what is seen is what would be exported, and nothing of it mixes with the page
// being worked on. The export code is fetched when the first picture is asked for, like the dialogs.

import type { FigDoc, FigNode } from '../model/types'

type RenderSvg = typeof import('../io/export').renderSvg

let renderer: Promise<RenderSvg> | null = null

const load = (): Promise<RenderSvg> =>
  (renderer ??= import('../io/export')
    .then((m) => m.renderSvg)
    .catch((e) => {
      // Not fetched (offline before the first visit was complete): try again the next time.
      renderer = null
      throw e
    }))

/** What the picture of a slide depends on besides its objects: the page, and the drawings of the icons it places. */
export function thumbStamp(doc: FigDoc, nodes: FigNode[], sketch: boolean): unknown[] {
  const icons = new Set<string>()
  for (const n of nodes) if (n.type === 'icon') icons.add(n.iconId)
  return [doc.width, doc.height, doc.background, sketch, ...[...icons].map((id) => doc.customIcons[id])]
}

const same = (a: unknown[], b: unknown[]): boolean => a.length === b.length && a.every((v, i) => v === b[i])

interface Thumb {
  stamp: unknown[]
  url: string
}

// One picture per list of objects. A slide that is not being worked on keeps its list, so its picture is made once.
const made = new Map<FigNode[], Thumb>()

/** The picture of a slide when it has been made already; null otherwise. */
export function thumbNow(doc: FigDoc, nodes: FigNode[], sketch: boolean): string | null {
  const have = made.get(nodes)
  return have && same(have.stamp, thumbStamp(doc, nodes, sketch)) ? have.url : null
}

/** The picture of a slide, as an address the browser can show. */
export async function slideThumb(doc: FigDoc, nodes: FigNode[], sketch: boolean): Promise<string> {
  const ready = thumbNow(doc, nodes, sketch)
  if (ready) return ready
  const renderSvg = await load()
  const again = thumbNow(doc, nodes, sketch)
  if (again) return again
  const { slides: _others, widthMm: _mm, ...page } = doc
  const { svg } = renderSvg({ ...page, nodes }, { area: 'page', transparent: false, includeSketch: sketch }, false)
  const old = made.get(nodes)
  if (old) URL.revokeObjectURL(old.url)
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  made.set(nodes, { stamp: thumbStamp(doc, nodes, sketch), url })
  return url
}

/** Let go of the pictures of everything that is no longer a slide of the figure (each step of an edit leaves one behind). */
export function keepThumbs(slides: FigNode[][]): void {
  const keep = new Set(slides)
  for (const [nodes, thumb] of made) {
    if (keep.has(nodes)) continue
    URL.revokeObjectURL(thumb.url)
    made.delete(nodes)
  }
}
