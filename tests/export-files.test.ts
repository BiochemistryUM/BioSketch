// What an exported file must hold so that it opens the same in other programs: found by opening
// exported figures in Chrome, Firefox and Safari's engine, and from what drawing programs expect.

import { describe, expect, it } from 'vitest'
import microbes from '../public/icon-packs/nih-microbes.json?raw'
import { hasMixing, sanitizeBody } from '../src/icons/svg'
import { iconsAsPictures, needsPicture, olderLinks, printPage, renderSvg, svgForPowerPoint, type ToPng } from '../src/io/export'
import { emptyDoc } from '../src/model/doc'
import { resolveConnector } from '../src/model/nodes'
import type { ChartNode, ConnectorNode, FigDoc, IconDef, IconNode, ImageNode } from '../src/model/types'

const options = { area: 'page', transparent: false, includeSketch: true } as const
const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

const picture: ImageNode = { id: 'pic', type: 'image', src: PIXEL, x: 10, y: 10, w: 40, h: 40, rotation: 0 }
const twice: IconDef = {
  id: 'twice',
  name: 'Drawn twice',
  category: 'Imported',
  tags: [],
  viewBox: [20, 20],
  body: '<defs><linearGradient id="a"><stop offset="0" stop-color="#ff0000"/></linearGradient><linearGradient id="b" href="#a"/></defs><path id="p" d="M0 0h5v5z" fill="url(#b)"/><use x="8" href="#p"/>',
  license: 'CC0',
  author: '',
  source: '',
}
const icon: IconNode = { id: 'ic', type: 'icon', iconId: 'twice', x: 60, y: 10, w: 40, h: 40, rotation: 0 }
const arrow: ConnectorNode = { id: 'fa', type: 'connector', from: { x: 10, y: 80 }, to: { x: 200, y: 80 }, kind: 'arrow', stroke: '#2b2f36', strokeWidth: 2, fade: 'out' }
const chart: ChartNode = { id: 'ch', type: 'chart', x: 10, y: 100, w: 300, h: 200, rotation: 0, kind: 'bar', groups: [{ name: 'A', values: [1, 2, 3] }, { name: 'B', values: [4, 5, 9] }], yMax: 4 }
const figure: FigDoc = { ...emptyDoc(), nodes: [picture, icon, arrow, chart], customIcons: { twice } }

describe('links inside an exported file', () => {
  const { svg } = renderSvg(figure, options)

  it('are written in the spelling every program reads', () => {
    expect(svg).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"')
    expect(svg).toContain(`<image xlink:href="${PIXEL}"`)
    expect(svg).toMatch(/<use x="8" xlink:href="#iic-p"\/>/)
    expect(svg).toMatch(/<linearGradient id="iic-b" xlink:href="#iic-a"\/>/)
    expect(svg).not.toMatch(/\shref=/)
  })

  it('is still one well-formed file, and the page handed to the print window holds the same picture', () => {
    const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml')
    expect(parsed.getElementsByTagName('parsererror')).toHaveLength(0)
    expect(parsed.getElementsByTagName('image')[0].getAttributeNS('http://www.w3.org/1999/xlink', 'href')).toBe(PIXEL)
    expect(printPage(figure, options)).toContain(svg.replace(/^<\?xml[^>]*>\s*/, ''))
  })

  it('changes links only, never words that look like one', () => {
    expect(olderLinks('<text>a href="x" b</text><use href="#a"/>')).toBe('<text>a href="x" b</text><use xlink:href="#a"/>')
    expect(olderLinks('<path data-href="x" d="M0 0"/>')).toBe('<path data-href="x" d="M0 0"/>')
  })
})

describe('gradients and clips of an exported file', () => {
  it('sit inside <defs>, where drawing programs look for them', () => {
    const parsed = new DOMParser().parseFromString(renderSvg(figure, options).svg, 'image/svg+xml')
    const fade = Array.from(parsed.getElementsByTagName('linearGradient')).find((g) => g.getAttribute('id') === 'fade-fa')
    expect(fade?.parentElement?.tagName).toBe('defs')
    const clip = Array.from(parsed.getElementsByTagName('clipPath')).find((c) => c.getAttribute('id') === 'chart-clip-ch')
    expect(clip?.parentElement?.tagName).toBe('defs')
  })
})

// The drawings of one real collection, as they are once the app has read them: no shading shape
// may be left inside a clipped group that does not mix as a whole (see tests/svg.test.ts), or
// Chrome and Firefox draw the shading as a grey patch.
describe('shading in the NIH microbes collection', () => {
  const pack = JSON.parse(microbes) as { icons?: { id: string; body: string }[] } | { id: string; body: string }[]
  const icons = (Array.isArray(pack) ? pack : (pack.icons ?? [])).filter((icon) => icon.body.includes('mix-blend-mode'))
  const mixes = (el: Element): boolean => /mix-blend-mode\s*:\s*(?!normal)[a-z-]+/.test(el.getAttribute('style') ?? '')
  const clipped = (el: Element): boolean => /clip-path\s*:/.test(el.getAttribute('style') ?? '') || el.hasAttribute('clip-path')
  const apart = (el: Element): boolean => mixes(el) || /isolation\s*:\s*isolate|(?:^|;)\s*opacity\s*:\s*0?\.\d|mask\s*:/.test(el.getAttribute('style') ?? '') || el.hasAttribute('mask') || Number(el.getAttribute('opacity') ?? 1) < 1

  it('has drawings that are shaded this way', () => {
    expect(icons.length).toBeGreaterThan(20)
  })

  it('is settled in every drawing, and stays as it is when read again', () => {
    let settled = 0
    for (const icon of icons) {
      const body = sanitizeBody(icon.body)
      expect(sanitizeBody(body), icon.id).toBe(body)
      if (/<g [^>]*clip-path[^>]*mix-blend-mode: /.test(body)) settled++
      const root = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${body}</svg>`, 'image/svg+xml').documentElement
      for (const el of Array.from(root.querySelectorAll('*')).filter(mixes)) {
        // From the shading shape outwards: a clipped group must not come before a group that is painted on its own.
        for (let up = el.parentElement; up && up !== root; up = up.parentElement) {
          if (up.tagName !== 'g' || apart(up)) break
          expect(clipped(up), `${icon.id}: shading inside a clipped group`).toBe(false)
        }
      }
    }
    expect(settled).toBeGreaterThan(5)
  })
})

describe('the size an exported file states', () => {
  const printed: FigDoc = { ...emptyDoc(), width: 1684, height: 1370, widthMm: 180 }

  it('is the printed size in the SVG file', () => {
    expect(renderSvg(printed, options).svg).toContain('width="180mm" height="146.44mm" viewBox="0 0 1684 1370"')
  })

  it('is whole figure units in the file a PNG is made from (millimetres leave a see-through line at the edge)', () => {
    const { svg, width, height } = renderSvg(printed, options, false)
    expect(svg).toContain('width="1684" height="1370" viewBox="0 0 1684 1370"')
    expect([width, height]).toEqual([1684, 1370])
    // Nothing else differs between the two files.
    expect(svg.replace('width="1684" height="1370"', 'width="180mm" height="146.44mm"')).toBe(renderSvg(printed, options).svg)
  })
})

// PowerPoint draws the SVG of a slide itself but does not know shapes that mix with what is beneath
// them: seen in PowerPoint for Mac, where a tinted cell came out solid red and shadows vanished or
// turned grey. Such icons go into the PowerPoint file as pictures of themselves.
describe('icons PowerPoint cannot draw', () => {
  const shaded: IconDef = {
    ...twice,
    id: 'shaded',
    name: 'Shaded cell',
    license: 'CC BY 4.0',
    author: 'A. Artist',
    source: 'https://example.org',
    body: '<circle cx="10" cy="10" r="9" fill="#c5898c"/><path d="M0 10h20v10H0z" style="mix-blend-mode: multiply;fill: #dcdcdd"/>',
  }
  const plain: IconDef = { ...twice, id: 'plain', name: 'Plain', body: '<rect width="20" height="20" fill="#00ff00"/>' }
  const place = (id: string, iconId: string, extra: Partial<IconNode> = {}): IconNode => ({ id, type: 'icon', iconId, x: 100, y: 50, w: 80, h: 60, rotation: 0, ...extra })
  const link: ConnectorNode = { id: 'ln', type: 'connector', from: { x: 0, y: 0, nodeId: 'a' }, to: { x: 500, y: 300 }, kind: 'arrow', stroke: '#2b2f36', strokeWidth: 2 }
  const docOf = (...nodes: FigDoc['nodes']): FigDoc => ({ ...emptyDoc(), nodes, customIcons: { shaded, plain } })
  const recorder = () => {
    const calls: { svg: string; width: number; height: number; scale: number }[] = []
    const toPng: ToPng = async (svg, width, height, scale) => {
      calls.push({ svg, width, height, scale })
      return PIXEL
    }
    return { calls, toPng }
  }

  it('knows a drawing that mixes from one that does not', () => {
    expect(hasMixing(shaded.body)).toBe(true)
    expect(hasMixing(plain.body)).toBe(false)
    expect(hasMixing('<path d="M0 0" style="mix-blend-mode: normal"/>')).toBe(false)
    expect(hasMixing('<path d="M0 0" style="mix-blend-mode: sideways"/>')).toBe(false)
  })

  it('puts a picture in the place of a shaded icon and leaves everything else as it is', async () => {
    const a = place('a', 'shaded', { rotation: 30, opacity: 0.5, groupId: 'grp', name: 'My cell' })
    const b = place('b', 'plain', { x: 300 })
    const unseen = place('c', 'shaded', { hidden: true })
    const figure = docOf(a, b, unseen, link)
    expect(figure.nodes.map((n) => needsPicture(figure, n))).toEqual([true, false, false, false])
    const { calls, toPng } = recorder()
    const out = await iconsAsPictures(figure, 4, toPng)
    expect(out.nodes[0]).toEqual({ id: 'a', type: 'image', src: PIXEL, x: 100, y: 50, w: 80, h: 60, rotation: 30, opacity: 0.5, groupId: 'grp', name: 'My cell' })
    expect(out.nodes.slice(1)).toEqual([b, unseen, link])
    expect(calls).toHaveLength(1)
    // The arrow attached to the icon ends where it did.
    expect(resolveConnector(link, out)).toEqual(resolveConnector(link, figure))
    // The figure itself is not changed, and one without such icons is handed back as it is.
    expect(figure.nodes[0]).toBe(a)
    const none = docOf(b, link)
    expect(await iconsAsPictures(none, 4, toPng)).toBe(none)
  })

  it('makes the picture from the icon alone: its own size, see-through around it, mirrored but not turned', async () => {
    const { calls, toPng } = recorder()
    await iconsAsPictures(docOf(place('a', 'shaded', { rotation: 30, opacity: 0.5, flipX: true }), place('b', 'plain')), 4, toPng)
    const [{ svg, width, height, scale }] = calls
    expect([width, height, scale]).toEqual([80, 60, 4])
    expect(svg).toContain('width="80" height="60" viewBox="0 0 80 60"')
    expect(svg).toContain('mix-blend-mode: multiply')
    expect(svg).toContain('scale(-1 1)')
    expect(svg).not.toMatch(/rotate\(|opacity="0.5"|#00ff00|<rect x="0" y="0" width="80" height="60"/)
  })

  it('draws the same icon once however often it stands in the figure, and again when it looks different', async () => {
    const { calls, toPng } = recorder()
    const out = await iconsAsPictures(
      docOf(place('a', 'shaded'), place('b', 'shaded', { x: 400, rotation: 90 }), place('c', 'shaded', { w: 160, h: 120 }), place('d', 'shaded', { colors: { '#c5898c': '#1971c2' } })),
      2,
      toPng,
    )
    expect(calls).toHaveLength(3)
    expect(out.nodes.every((n) => n.type === 'image')).toBe(true)
  })

  it('leaves an icon as it is when no picture of it can be made', async () => {
    const figure = docOf(place('a', 'shaded'))
    const failing: ToPng = async () => {
      throw new Error('no canvas')
    }
    expect((await iconsAsPictures(figure, 4, failing)).nodes).toEqual(figure.nodes)
    expect((await iconsAsPictures(figure, 4, async () => 'not a picture')).nodes).toEqual(figure.nodes)
  })

  it('gives PowerPoint a file without mixing shapes that still credits the icons', async () => {
    const figure = docOf(place('a', 'shaded'), place('b', 'plain', { x: 300 }), link)
    const { svg, width, height } = await svgForPowerPoint(figure, options, 4, recorder().toPng)
    expect(svg).not.toContain('mix-blend-mode')
    expect(svg).toContain(`<image xlink:href="${PIXEL}"`)
    expect(svg).toContain('#00ff00')
    expect(svg).toContain('&quot;Shaded cell&quot; by A. Artist'.replace(/&quot;/g, '"'))
    expect([width, height]).toEqual([figure.width, figure.height])
    // The SVG file the scientist downloads keeps the icon as a drawing.
    expect(renderSvg(figure, options).svg).toContain('mix-blend-mode: multiply')
    // Without such icons PowerPoint gets exactly the file that is downloaded.
    const none = docOf(place('b', 'plain'), link)
    expect((await svgForPowerPoint(none, options, 4, recorder().toPng)).svg).toBe(renderSvg(none, options).svg)
  })
})
