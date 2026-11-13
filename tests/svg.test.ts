import { describe, expect, it } from 'vitest'
import { BUILTIN_ICONS, getIcon, searchIcons } from '../src/icons/library'
import { extractColors, iconMarkup, isHexColor, normalizeHex, parseSvgFile, prefixIds, recolor, sanitizeBody, scaleStrokes } from '../src/icons/svg'
import { TEMPLATES } from '../src/templates'

const count = (markup: string): number => {
  const doc = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`, 'image/svg+xml')
  expect(doc.getElementsByTagName('parsererror')).toHaveLength(0)
  return doc.getElementsByTagName('*').length
}

describe('sanitising imported SVG', () => {
  it('removes scripts, event handlers, foreign content and embedded images', () => {
    const dirty =
      '<script>alert(1)</script><rect width="10" height="10" onclick="alert(1)" onload="x()"/>' +
      '<foreignObject><div>hi</div></foreignObject><image href="https://evil.example/x.png"/>' +
      '<a href="javascript:alert(1)"><circle r="5"/></a><iframe src="x"/>'
    const clean = sanitizeBody(dirty)
    expect(clean).toContain('<rect')
    expect(clean).not.toMatch(/script|onclick|onload|foreignObject|image|iframe|javascript|<a /i)
  })

  it('keeps references inside the icon and drops external ones', () => {
    const clean = sanitizeBody(
      '<defs><linearGradient id="g"><stop offset="0" stop-color="#ff0000"/></linearGradient></defs>' +
        '<rect fill="url(#g)" width="5" height="5"/><use href="#g"/><use href="https://evil.example/a.svg#x"/>' +
        '<rect style="fill:url(https://evil.example/t.svg#p)" width="1" height="1"/>',
    )
    expect(clean).toContain('url(#g)')
    expect(clean).toContain('href="#g"')
    expect(clean).not.toContain('evil.example')
  })

  it('drops data attributes and leaves attributes that merely end in "id" alone', () => {
    expect(sanitizeBody('<rect data-id="node-7" data-name="x" width="1" height="1"/>')).not.toContain('data-')
    const out = prefixIds('<rect data-id="g" width="1"/><linearGradient id="g"/><rect fill="url(#g)"/>', 'n1')
    expect(out).toContain('data-id="g"')
    expect(out).toContain(' id="n1-g"')
  })

  it('returns nothing for markup that cannot be parsed', () => {
    expect(sanitizeBody('<rect')).toBe('')
  })

  it('reads the view box and shifts content to the origin', () => {
    const parsed = parseSvgFile('<svg xmlns="http://www.w3.org/2000/svg" viewBox="10 20 200 100"><rect x="10" y="20" width="200" height="100" fill="#ABC"/></svg>')
    expect(parsed.viewBox).toEqual([200, 100])
    expect(parsed.body).toContain('translate(-10 -20)')
  })

  it('falls back to width and height, then to a default size', () => {
    expect(parseSvgFile('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32"><path d="M0 0h1"/></svg>').viewBox).toEqual([64, 32])
    expect(parseSvgFile('<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1"/></svg>').viewBox).toEqual([100, 100])
  })

  it('copies class styles onto elements (Illustrator-style files)', () => {
    const parsed = parseSvgFile(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><style>.st0{fill:#FF0000;} .st1, .st2 { stroke:#00ff00 }</style>' +
        '<rect class="st0 st1" width="5" height="5"/></svg>',
    )
    expect(parsed.body).toContain('fill:#FF0000')
    expect(parsed.body).toContain('stroke:#00ff00')
    expect(parsed.body).not.toContain('<style')
    expect(parsed.body).not.toContain('class=')
  })

  it('rejects files that are not SVG or have nothing to draw', () => {
    expect(() => parseSvgFile('<html><body>no</body></html>')).toThrow()
    expect(() => parseSvgFile('not xml at all')).toThrow()
    expect(() => parseSvgFile('<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>')).toThrow()
  })
})

describe('files from drawing programs', () => {
  const svg = (inner: string, attrs = 'viewBox="0 0 10 10"') => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ${attrs}>${inner}</svg>`

  it('keeps the drawing inside a <switch> wrapper and inside links', () => {
    const body = parseSvgFile(svg('<switch><foreignObject width="1" height="1"><p>x</p></foreignObject><g><rect width="4" height="4" fill="#ff0000"/></g></switch><a xlink:href="https://example.org"><circle r="2"/></a>')).body
    expect(body).toContain('<rect')
    expect(body).toContain('<circle')
    expect(body).not.toMatch(/switch|foreignObject|example\.org|<a[ >]/)
  })

  it('keeps arrowheads (markers) but cleans what is inside them', () => {
    const body = parseSvgFile(svg('<defs><marker id="tip" onload="alert(1)"><path d="M0 0L4 2L0 4z"/><script>alert(1)</script></marker></defs><path d="M0 5h8" marker-end="url(#tip)"/>')).body
    expect(body).toContain('<marker id="tip">')
    expect(body).toContain('marker-end="url(#tip)"')
    expect(body).not.toMatch(/script|onload/)
  })

  it('drops effects whose definition was removed, as attribute and inside style', () => {
    const body = parseSvgFile(
      svg('<defs><filter id="blur"><feGaussianBlur stdDeviation="2"/></filter><clipPath id="cut"><rect width="5" height="5"/></clipPath></defs>' +
        '<circle r="3" filter="url(#blur)" clip-path="url(#cut)" fill="#00ff00"/><rect width="2" height="2" style="fill:#0000ff;filter:url(#blur);opacity:0.5"/>'),
    ).body
    expect(body).not.toContain('blur')
    expect(body).toContain('clip-path="url(#cut)"')
    expect(body).toMatch(/style="fill:#0000ff;opacity:0.5"/)
    // The same holds for markup stored in a figure file.
    expect(sanitizeBody('<circle r="3" filter="url(#gone)" fill="url(#alsoGone)"/>')).toBe('<circle r="3" fill="url(#alsoGone)"/>')
  })

  it('reads a page size given in millimetres when there is no viewBox', () => {
    const [w, h] = parseSvgFile(svg('<path d="M0 0h1"/>', 'width="210mm" height="1in"')).viewBox
    expect(w).toBeCloseTo(793.7, 1)
    expect(h).toBe(96)
    expect(parseSvgFile(svg('<path d="M0 0h1"/>', 'width="100%" height="50"')).viewBox).toEqual([100, 100])
  })
})

describe('outline thickness of an icon', () => {
  const body = '<path d="M0 0h9" stroke="#000000" stroke-width="2"/><circle r="3" style="stroke:#000000;stroke-width:0.5px"/><path d="M0 5h9" stroke="#000000"/>'

  it('multiplies every stated width and sets the width of outlines that state none', () => {
    expect(scaleStrokes(body, 1.5)).toBe('<g stroke-width="1.5"><path d="M0 0h9" stroke="#000000" stroke-width="3"/><circle r="3" style="stroke:#000000;stroke-width:0.75px"/><path d="M0 5h9" stroke="#000000"/></g>')
  })

  it('leaves the icon as drawn for 1, nothing, or a value that makes no sense', () => {
    for (const factor of [1, undefined, 0, -2, Number.NaN, Infinity]) expect(scaleStrokes(body, factor)).toBe(body)
  })

  it('is applied when an icon is drawn, together with recolouring', () => {
    const def = { ...BUILTIN_ICONS[0], body }
    const markup = iconMarkup(def, { '#000000': '#ff0000' }, 'n1', 2)
    expect(markup).toContain('stroke-width="4"')
    expect(markup).toContain('stroke="#ff0000"')
  })
})

describe('recolouring', () => {
  const body = '<rect fill="#FF0000" stroke="#0f0"/><rect fill="url(#abc)"/><use href="#fff"/>'

  it('lists colours once, normalised, without mistaking ids for colours', () => {
    expect(extractColors(body)).toEqual(['#ff0000', '#00ff00'])
  })

  it('replaces colours whatever their case or length', () => {
    const out = recolor(body, { '#ff0000': '#123456', '#00ff00': '#654321' })
    expect(out).toContain('fill="#123456"')
    expect(out).toContain('stroke="#654321"')
    expect(out).toContain('url(#abc)')
    expect(out).toContain('href="#fff"')
  })

  it('ignores replacement values that are not plain colours', () => {
    const out = recolor(body, { '#ff0000': '"/><script>alert(1)</script>' })
    expect(out).toBe(body)
    expect(isHexColor('#12345')).toBe(false)
    expect(normalizeHex('#ABC')).toBe('#aabbcc')
  })

  it('never lets a node id inject markup through the id prefix', () => {
    const icon = { ...BUILTIN_ICONS[0], body: '<linearGradient id="g"/><rect fill="url(#g)"/>' }
    const out = iconMarkup(icon, undefined, 'a"><script>alert(1)</script>')
    expect(out).not.toContain('<script')
    expect(out).toContain('id="iascriptalert1script-g"')
  })

  it('makes ids unique per node', () => {
    const out = prefixIds('<linearGradient id="g"/><rect fill="url(#g)"/><use href="#g"/><rect fill="url(#other)"/>', 'n1')
    expect(out).toContain('id="n1-g"')
    expect(out).toContain('url(#n1-g)')
    expect(out).toContain('href="#n1-g"')
    expect(out).toContain('url(#other)')
  })
})

describe('search order', () => {
  it('lists icons named after the search word before those that only have it as a keyword', () => {
    const icon = (name: string, tags: string[]) => ({ ...BUILTIN_ICONS[0], id: name, name, tags, category: 'Test' })
    const found = searchIcons([icon('Nanoparticle', ['delivery']), icon('Healthy liver', []), icon('Liposome', ['delivery']), icon('Liver lobule', [])], 'liver')
    expect(found.map((i) => i.name)).toEqual(['Healthy liver', 'Liver lobule', 'Nanoparticle', 'Liposome'])
  })
})

describe('built-in library', () => {
  it('has unique ids and complete metadata', () => {
    expect(new Set(BUILTIN_ICONS.map((i) => i.id)).size).toBe(BUILTIN_ICONS.length)
    expect(BUILTIN_ICONS.length).toBeGreaterThanOrEqual(50)
    for (const icon of BUILTIN_ICONS) {
      expect(icon.name, icon.id).toBeTruthy()
      expect(icon.tags.length, icon.id).toBeGreaterThan(0)
      expect(icon.viewBox[0], icon.id).toBeGreaterThan(0)
      expect(icon.license).toBe('CC0-1.0')
    }
  })

  it('contains only well-formed, safe, recolourable markup', () => {
    for (const icon of BUILTIN_ICONS) {
      const elements = count(icon.body)
      expect(elements, icon.id).toBeGreaterThan(1)
      // Sanitising a built-in icon must not remove anything: it has nothing unsafe in it.
      expect(count(sanitizeBody(icon.body)), icon.id).toBe(elements)
      expect(extractColors(icon.body).length, icon.id).toBeGreaterThan(0)
      expect(icon.body, icon.id).not.toMatch(/NaN|undefined/)
      expect(iconMarkup(icon, undefined, 'x')).toBe(icon.body)
    }
  })

  it('searches by name, category and keyword', () => {
    expect(searchIcons(BUILTIN_ICONS, 'mito').map((i) => i.id)).toContain('mitochondrion')
    expect(searchIcons(BUILTIN_ICONS, 'vsmc').map((i) => i.id)).toEqual(['smooth-muscle-cell'])
    expect(searchIcons(BUILTIN_ICONS, 'zzzz')).toEqual([])
    expect(searchIcons(BUILTIN_ICONS, '  ')).toHaveLength(BUILTIN_ICONS.length)
  })

  it('is used correctly by the example figures', () => {
    for (const t of TEMPLATES) {
      const doc = t.build()
      const nodeIds = new Set(doc.nodes.map((n) => n.id))
      expect(nodeIds.size, t.id).toBe(doc.nodes.length)
      for (const n of doc.nodes) {
        if (n.type === 'icon') expect(getIcon(doc, n.iconId), `${t.id}: ${n.iconId}`).toBeDefined()
        if (n.type === 'connector') {
          expect(nodeIds.has(n.from.nodeId!), t.id).toBe(true)
          expect(nodeIds.has(n.to.nodeId!), t.id).toBe(true)
        }
      }
    }
  })
})
