import { describe, expect, it } from 'vitest'
import { renderSvg } from '../src/io/export'
import { emptyDoc } from '../src/model/doc'
import { measureText } from '../src/model/nodes'
import { parseRich, wrapSelection } from '../src/model/richtext'
import type { FigDoc, TextNode } from '../src/model/types'

const label = (text: string, extra: Partial<TextNode> = {}): TextNode => ({ id: 't', type: 'text', x: 100, y: 100, text, fontSize: 20, fill: '#000000', align: 'left', rotation: 0, ...extra })
const runs = (line: string) => parseRich(line).map((r) => `${r.text}|${r.script}|${r.bold ? 'b' : ''}${r.italic ? 'i' : ''}`)

describe('formatting marks in labels', () => {
  it('reads superscripts and subscripts', () => {
    expect(runs('Ca^{2+}')).toEqual(['Ca|0|', '2+|1|'])
    expect(runs('H_{2}O_{2}')).toEqual(['H|0|', '2|-1|', 'O|0|', '2|-1|'])
  })

  it('reads italic and bold, also combined and inside a script', () => {
    expect(runs('*GPX4* expression')).toEqual(['GPX4|0|i', ' expression|0|'])
    expect(runs('**bold** and ***both***')).toEqual(['bold|0|b', ' and |0|', 'both|0|bi'])
    expect(runs('*x^{2}*')).toEqual(['x|0|i', '2|1|i'])
  })

  it('leaves plain text, lone marks and escaped marks alone', () => {
    expect(runs('IL-1β (10 ng/ml)')).toEqual(['IL-1β (10 ng/ml)|0|'])
    expect(runs('a_b and 2^3')).toEqual(['a_b and 2^3|0|'])
    expect(runs('5 \\* 3 = 15')).toEqual(['5 * 3 = 15|0|'])
    expect(runs('x^{unclosed')).toEqual(['x^{unclosed|0|'])
    expect(runs('')).toEqual([])
  })

  it('shows significance stars and other lone stars as they are', () => {
    expect(runs('*')).toEqual(['*|0|'])
    expect(runs('**')).toEqual(['**|0|'])
    expect(runs('***')).toEqual(['***|0|'])
    expect(runs('p < 0.05 *')).toEqual(['p < 0.05 *|0|'])
    expect(runs('* p < 0.05, ** p < 0.01, *** p < 0.001')).toEqual(['* p < 0.05, ** p < 0.01, *** p < 0.001|0|'])
    expect(runs('2 * 3 * 4')).toEqual(['2 * 3 * 4|0|'])
    expect(runs('n.s. vs. **')).toEqual(['n.s. vs. **|0|'])
    // A real pair still formats, even next to a lone star.
    expect(runs('*GPX4* ***')).toEqual(['GPX4|0|i', ' ***|0|'])
  })

  it('wraps a selection in marks and reports where the selection now is', () => {
    expect(wrapSelection('Ca2+', 2, 4, 'sup')).toEqual({ text: 'Ca^{2+}', start: 4, end: 6 })
    expect(wrapSelection('H2O', 1, 2, 'sub').text).toBe('H_{2}O')
    expect(wrapSelection('GPX4 up', 0, 4, 'italic').text).toBe('*GPX4* up')
    expect(wrapSelection('GPX4 up', 4, 0, 'bold').text).toBe('**GPX4** up')
  })

  it('measures formatted text narrower than the same characters typed plainly', () => {
    expect(measureText(label('Ca^{2+}')).w).toBeLessThan(measureText(label('Ca2+')).w)
    expect(measureText(label('Ca^{2+}')).w).toBeLessThan(measureText(label('Ca^{2+}xx')).w)
  })

  it('exports scripts as smaller, shifted text and keeps spaces between runs', () => {
    const doc: FigDoc = { ...emptyDoc(), nodes: [label('Ca^{2+} and *GPX4*', { fontFamily: 'serif' })] }
    const xml = new DOMParser().parseFromString(renderSvg(doc, { area: 'page', transparent: false, includeSketch: true }).svg, 'image/svg+xml')
    expect(xml.getElementsByTagName('parsererror')).toHaveLength(0)
    const spans = Array.from(xml.getElementsByTagName('tspan'))
    expect(spans.map((s) => s.textContent)).toEqual(['Ca', '2+', ' and ', 'GPX4'])
    expect(spans[1].getAttribute('font-size')).toBe('13')
    expect(Number(spans[1].getAttribute('dy'))).toBeLessThan(0)
    expect(Number(spans[2].getAttribute('dy'))).toBeGreaterThan(0)
    expect(spans[3].getAttribute('font-style')).toBe('italic')
    const text = xml.getElementsByTagName('text')[0]
    expect(text.getAttribute('font-family')).toContain('Georgia')
    expect(text.getAttribute('xml:space')).toBe('preserve')
  })
})
