import { describe, expect, it } from 'vitest'
import { getIcon, searchIcons } from '../src/icons/library'
import { extractColors, iconMarkup, isHexColor, normalizeHex, parseSvgFile, plainSvgNames, prefixIds, recolor, sanitizeBody, scaleStrokes } from '../src/icons/svg'
import { TEMPLATES } from '../src/templates'
import { example, stubIcon } from './helpers'

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

  it('reads a file whose elements all carry a prefix (as NIH BioArt writes some)', () => {
    const parsed = parseSvgFile(
      `<?xml version='1.0' encoding='utf-8'?>\n<ns0:svg xmlns:ns0="http://www.w3.org/2000/svg" id="a" viewBox="0 0 20 40"><metadata><title>Unisex icon</title><license>Public Domain</license></metadata>` +
        '<ns0:defs><ns0:style>.cls-1{fill:#e1c48f;}</ns0:style></ns0:defs><ns0:g><ns0:path class="cls-1" d="M0 0h20v40z" /></ns0:g></ns0:svg>',
    )
    expect(parsed.viewBox).toEqual([20, 40])
    expect(parsed.body).toContain('<path')
    expect(parsed.body).toContain('fill:#e1c48f')
    expect(parsed.body).not.toContain('ns0')
    expect(parsed.body).not.toContain('Public Domain')
    // A prefix that is not the SVG one is left alone, and so is an ordinary file.
    const plain = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M0 0h1"/></svg>'
    expect(plainSvgNames(plain)).toBe(plain)
  })

  it('rejects files that are not SVG or have nothing to draw', () => {
    expect(() => parseSvgFile('<html><body>no</body></html>')).toThrow()
    expect(() => parseSvgFile('not xml at all')).toThrow()
    expect(() => parseSvgFile('<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>')).toThrow()
  })
})

describe('files from drawing programs', () => {
  const svg = (inner: string, attrs = 'viewBox="0 0 10 10"') => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ${attrs}>${inner}</svg>`

  it('works out the negative of a fade mask that Illustrator draws through an inverting filter', () => {
    const parsed = parseSvgFile(
      svg(
        '<defs><style>.a{filter:url(#luminosity-invert);}.b{mask:url(#mask);}.c{fill:url(#fade);}</style>' +
          '<filter id="luminosity-invert" x="0" y="0" width="10" height="10"><feColorMatrix result="cm" values="-1 0 0 0 1 0 -1 0 0 1 0 0 -1 0 1 0 0 0 1 0"/></filter>' +
          '<linearGradient id="fade" x1="0" x2="10"><stop offset="0" stop-color="#fff"/><stop offset="1" style="stop-color:#000"/></linearGradient>' +
          '<mask id="mask" x="0" y="0" width="10" height="10" maskUnits="userSpaceOnUse"><g class="a"><rect class="c" width="10" height="10"/><circle r="2" fill="#333"/><path d="M0 0h2v2z"/></g></mask></defs>' +
          '<g class="b"><rect width="10" height="10" fill="url(#fade)"/></g>',
      ),
    ).body
    // The mask uses a copy of the gradient with its colours inverted; the drawing keeps the original.
    const stops = (id: string) => /<linearGradient id="FADE"[^>]*>(.*?)<\/linearGradient>/.exec(parsed.replace(`id="${id}"`, 'id="FADE"'))?.[1]
    expect(stops('fade-negative')).toBe('<stop offset="0" stop-color="#000000"/><stop offset="1" style="stop-color:#ffffff"/>')
    expect(stops('fade')).toBe('<stop offset="0" stop-color="#fff"/><stop offset="1" style="stop-color:#000"/>')
    expect(parsed).toContain('fill:url(#fade-negative)')
    expect(parsed).toContain('<rect width="10" height="10" fill="url(#fade)"/>')
    expect(parsed).toContain('fill="#cccccc"')
    // The path names no fill, so it was black: its group now says white.
    expect(parsed).toMatch(/<mask[^>]*><g[^>]*fill="#ffffff"/)
    expect(parsed).not.toContain('filter')
    expect(parsed).toContain('mask:url(#mask)')
  })

  it('keeps links between parts of a drawing whatever prefix the file gives them', () => {
    const parsed = parseSvgFile(
      '<ns0:svg xmlns:ns0="http://www.w3.org/2000/svg" xmlns:ns1="http://www.w3.org/1999/xlink" viewBox="0 0 10 10"><ns0:defs><ns0:path id="shape" d="M0 0h5v5z"/></ns0:defs>' +
        '<ns0:clipPath id="clip"><ns0:use ns1:href="#shape"/></ns0:clipPath><ns0:rect width="10" height="10" clip-path="url(#clip)"/><ns0:use ns1:href="https://example.org/a.svg#x"/></ns0:svg>',
    ).body
    expect(parsed).toContain('<use href="#shape"/>')
    expect(parsed).not.toContain('example.org')
    expect(parsed).not.toContain('ns1')
  })

  it('lays white under a mask whose filter did so', () => {
    const parsed = parseSvgFile(
      svg(
        '<defs><filter id="luminosity-noclip"><feFlood flood-color="#fff" result="bg"/><feBlend in="SourceGraphic" in2="bg"/></filter>' +
          '<mask id="m" x="1" y="2" width="8" height="6" maskUnits="userSpaceOnUse"><g filter="url(#luminosity-noclip)"><rect width="3" height="3" fill="#000"/></g></mask></defs><rect width="10" height="10" mask="url(#m)"/>',
      ),
    ).body
    expect(parsed).toContain('<g><rect x="1" y="2" width="8" height="6" fill="#ffffff"/><rect width="3" height="3" fill="#000"/></g>')
  })

  it('leaves a mask alone when its filter is not the inverting one', () => {
    const parsed = parseSvgFile(
      svg(
        '<defs><filter id="f"><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"/></filter>' +
          '<mask id="m"><g filter="url(#f)"><rect width="10" height="10" fill="#fff"/></g></mask></defs><rect width="10" height="10" mask="url(#m)"/>',
      ),
    ).body
    expect(parsed).toContain('fill="#fff"')
    expect(parsed).not.toContain('filter')
  })


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
    expect(sanitizeBody('<circle r="3" filter="url(#gone)" fill="#00ff00"/>')).toBe('<circle r="3" fill="#00ff00"/>')
  })

  it('leaves a fill or outline empty when its gradient is missing, as Chrome and Firefox draw it (Safari would paint it black)', () => {
    expect(sanitizeBody('<circle r="3" fill="url(#gone)" stroke="url(#gone)"/>')).toBe('<circle r="3" fill="none" stroke="none"/>')
    // The colour a file writes after the link is what it wants when the link fails.
    expect(sanitizeBody('<circle r="3" fill="url(#gone) #336699"/>')).toBe('<circle r="3" fill="#336699"/>')
    expect(sanitizeBody('<rect width="2" height="2" style="fill:url(#gone);stroke:#000000"/>')).toBe('<rect width="2" height="2" style="fill:none;stroke:#000000"/>')
    // A gradient that is there is kept, and so is a link that is neither paint nor effect.
    const kept = '<defs><linearGradient id="g"><stop offset="0" stop-color="#ff0000"/></linearGradient></defs><rect width="2" height="2" fill="url(#g)" style="shape-inside:url(#gone)"/>'
    expect(sanitizeBody(kept)).toBe(kept)
  })

  it('reads a page size given in millimetres when there is no viewBox', () => {
    const [w, h] = parseSvgFile(svg('<path d="M0 0h1"/>', 'width="210mm" height="1in"')).viewBox
    expect(w).toBeCloseTo(793.7, 1)
    expect(h).toBe(96)
    expect(parseSvgFile(svg('<path d="M0 0h1"/>', 'width="100%" height="50"')).viewBox).toEqual([100, 100])
  })
})

// Illustrator shades with shapes that darken what is beneath them, often inside a clipped group.
// Chrome and Firefox paint a clipped group on its own first, so the shading darkens nothing there
// and shows as a grey patch; Safari lets it through. Cutting the group into layers, each mixing
// as a whole, is drawn alike by all of them.
describe('shading that darkens what lies beneath it', () => {
  const CLIP = '<defs><clipPath id="c"><circle r="5"/></clipPath></defs>'
  const shade = (extra = '') => `<path d="M0 0h4v4z" style="mix-blend-mode: multiply;fill: #dcdcdd;"${extra}/>`

  it('lets a clipped group that holds only a shading shape mix as a whole', () => {
    expect(sanitizeBody(`${CLIP}<circle r="5" fill="#c5898c"/><g style="clip-path: url(#c);">${shade()}</g>`)).toBe(
      `${CLIP}<circle r="5" fill="#c5898c"/><g style="clip-path: url(#c);mix-blend-mode: multiply"><path d="M0 0h4v4z" style="fill: #dcdcdd"/></g>`,
    )
    // The clip may be an attribute, too.
    expect(sanitizeBody(`${CLIP}<g clip-path="url(#c)">${shade()}</g>`)).toBe(`${CLIP}<g clip-path="url(#c)" style="mix-blend-mode: multiply"><path d="M0 0h4v4z" style="fill: #dcdcdd"/></g>`)
  })

  it('cuts a clipped group into layers when shading sits between shapes that cover', () => {
    const body = sanitizeBody(`${CLIP}<g id="part" clip-path="url(#c)"><rect width="9" height="9" fill="#ff0000"/>${shade()}<rect width="2" height="2" fill="#0000ff"/></g>`)
    expect(body).toBe(
      `${CLIP}<g>` +
        '<g id="part" clip-path="url(#c)"><rect width="9" height="9" fill="#ff0000"/></g>' +
        '<g clip-path="url(#c)" style="mix-blend-mode: multiply"><path d="M0 0h4v4z" style="fill: #dcdcdd"/></g>' +
        '<g clip-path="url(#c)"><rect width="2" height="2" fill="#0000ff"/></g>' +
        '</g>',
    )
  })

  it('cuts through the groups between the clip and the shading, each copy keeping its place and turn', () => {
    const body = sanitizeBody(`${CLIP}<g clip-path="url(#c)"><g transform="translate(3 4)"><rect width="9" height="9" fill="#ff0000"/>${shade()}</g></g>`)
    expect(body).toBe(
      `${CLIP}<g>` +
        '<g clip-path="url(#c)"><g transform="translate(3 4)"><rect width="9" height="9" fill="#ff0000"/></g></g>' +
        '<g clip-path="url(#c)" style="mix-blend-mode: multiply"><g transform="translate(3 4)"><path d="M0 0h4v4z" style="fill: #dcdcdd"/></g></g>' +
        '</g>',
    )
  })

  it('gives every shading shape a layer of its own, whatever way it mixes', () => {
    const body = sanitizeBody(`${CLIP}<g clip-path="url(#c)">${shade()}<path d="M1 1h2" style="mix-blend-mode:overlay"/></g>`)
    expect(body.match(/<g clip-path="url\(#c\)" style="mix-blend-mode: (multiply|overlay)">/g)).toHaveLength(2)
    expect(body).not.toMatch(/<path[^>]*mix-blend-mode/)
  })

  it('looks inside groups that are painted on their own, where the same happens one level down', () => {
    expect(sanitizeBody(`${CLIP}<g style="isolation: isolate;"><g opacity="0.5"><g clip-path="url(#c)">${shade()}</g></g></g>`)).toBe(
      `${CLIP}<g style="isolation: isolate;"><g opacity="0.5"><g clip-path="url(#c)" style="mix-blend-mode: multiply"><path d="M0 0h4v4z" style="fill: #dcdcdd"/></g></g></g>`,
    )
  })

  it('leaves alone what every browser already draws alike', () => {
    for (const same of [
      // Shading that is not inside a clipped group, or is clipped itself.
      `${CLIP}<g transform="scale(2)">${shade()}</g>`,
      `${CLIP}${shade(' clip-path="url(#c)"')}`,
      // A clipped group without shading, and one that already mixes as a whole.
      `${CLIP}<g clip-path="url(#c)"><rect width="9" height="9" fill="#ff0000"/></g>`,
      `${CLIP}<g clip-path="url(#c)" style="mix-blend-mode: multiply"><path d="M0 0h4v4z" style="fill: #dcdcdd"/></g>`,
      // A group another part of the drawing draws again has to stay in one piece.
      `${CLIP}<g id="twice" clip-path="url(#c)">${shade()}</g><use x="20" href="#twice"/>`,
      // A word that is no way of mixing is not touched.
      `${CLIP}<g clip-path="url(#c)"><path d="M0 0h4" style="mix-blend-mode: sideways"/></g>`,
    ]) expect(sanitizeBody(same)).toBe(same)
  })

  it('changes nothing when it runs again on its own result (a figure is cleaned every time it is opened)', () => {
    const once = sanitizeBody(`${CLIP}<g clip-path="url(#c)"><rect width="9" height="9" fill="#ff0000"/><g clip-path="url(#c)">${shade()}<rect width="1" height="1"/></g>${shade()}</g>`)
    expect(once).toContain('mix-blend-mode: multiply')
    expect(sanitizeBody(once)).toBe(once)
  })

  it('does the same when a file is imported', () => {
    const body = parseSvgFile(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">${CLIP}<g clip-path="url(#c)">${shade()}</g></svg>`).body
    expect(body).toContain('<g clip-path="url(#c)" style="mix-blend-mode: multiply"><path d="M0 0h4v4z" style="fill: #dcdcdd"/></g>')
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
    const def = { ...stubIcon('test-icon'), body }
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
    const icon = { ...stubIcon('test-icon'), body: '<linearGradient id="g"/><rect fill="url(#g)"/>' }
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
    const icon = (name: string, tags: string[]) => ({ ...stubIcon(name), name, tags, category: 'Test' })
    const found = searchIcons([icon('Nanoparticle', ['delivery']), icon('Healthy liver', []), icon('Liposome', ['delivery']), icon('Liver lobule', [])], 'liver')
    expect(found.map((i) => i.name)).toEqual(['Healthy liver', 'Liver lobule', 'Nanoparticle', 'Liposome'])
  })
})

describe('searching icons', () => {
  const icon = (name: string, category: string, tags: string[]) => ({ ...stubIcon(name), name, category, tags })
  const icons = [icon('Mitochondrion', 'Organelles', ['powerhouse']), icon('Smooth muscle cell', 'Cells', ['vsmc', 'vessel']), icon('Macrophage', 'Cells', ['immune'])]

  it('looks in the name, the category and the keywords, and for every word', () => {
    expect(searchIcons(icons, 'mito').map((i) => i.name)).toEqual(['Mitochondrion'])
    expect(searchIcons(icons, 'vsmc').map((i) => i.name)).toEqual(['Smooth muscle cell'])
    expect(searchIcons(icons, 'cells immune').map((i) => i.name)).toEqual(['Macrophage'])
    expect(searchIcons(icons, 'zzzz')).toEqual([])
    expect(searchIcons(icons, '  ')).toHaveLength(icons.length)
  })
})

describe('example figures', () => {
  it('is used correctly by the example figures', () => {
    for (const t of TEMPLATES) {
      const doc = example(t)
      const nodeIds = new Set(doc.nodes.map((n) => n.id))
      expect(nodeIds.size, t.id).toBe(doc.nodes.length)
      for (const n of doc.nodes) {
        if (n.type === 'icon') expect(getIcon(doc, n.iconId), `${t.id}: ${n.iconId}`).toBeDefined()
        if (n.type === 'connector') {
          // The example figures attach every arrow; in a template a line can stand free (the axis of a timeline).
          for (const end of [n.from, n.to]) if (!t.group || end.nodeId) expect(nodeIds.has(end.nodeId!), t.id).toBe(true)
        }
      }
    }
  })
})
