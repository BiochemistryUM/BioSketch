// PowerPoint export: the ZIP archive and the parts of the presentation.

import { describe, expect, it } from 'vitest'
import { buildPptx, crc32, fitOnSlide, pptxParts, SLIDE, utf8, zipStore } from '../src/io/pptx'

const read = (bytes: Uint8Array) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
const ascii = (bytes: Uint8Array) => new TextDecoder().decode(bytes)

/** Read a stored ZIP back through its directory, the way an unzip program does. */
function unzip(zip: Uint8Array): Record<string, Uint8Array> {
  const v = read(zip)
  const end = zip.length - 22
  expect(v.getUint32(end, true)).toBe(0x06054b50)
  const count = v.getUint16(end + 10, true)
  let at = v.getUint32(end + 16, true)
  const out: Record<string, Uint8Array> = {}
  for (let i = 0; i < count; i++) {
    expect(v.getUint32(at, true)).toBe(0x02014b50)
    const size = v.getUint32(at + 24, true)
    const nameLen = v.getUint16(at + 28, true)
    const local = v.getUint32(at + 42, true)
    const name = ascii(zip.subarray(at + 46, at + 46 + nameLen))
    expect(v.getUint32(local, true)).toBe(0x04034b50)
    const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true)
    const data = zip.subarray(start, start + size)
    expect(crc32(data)).toBe(v.getUint32(at + 16, true))
    out[name] = data
    at += 46 + nameLen
  }
  return out
}

describe('ZIP archive', () => {
  it('computes the standard checksum', () => {
    expect(crc32(utf8('123456789'))).toBe(0xcbf43926)
    expect(crc32(new Uint8Array())).toBe(0)
  })

  it('stores files so that they read back unchanged', () => {
    const files = unzip(zipStore([{ name: 'a.txt', data: utf8('hello') }, { name: 'dir/b.bin', data: new Uint8Array([0, 255, 7]) }, { name: 'empty', data: new Uint8Array() }]))
    expect(Object.keys(files)).toEqual(['a.txt', 'dir/b.bin', 'empty'])
    expect(ascii(files['a.txt'])).toBe('hello')
    expect(Array.from(files['dir/b.bin'])).toEqual([0, 255, 7])
    expect(files.empty).toHaveLength(0)
  })
})

describe('PowerPoint file', () => {
  const pic = { title: 'Fig. 1 <draft> & "notes"', width: 1200, height: 800, png: new Uint8Array([137, 80, 78, 71]), svg: '<svg xmlns="http://www.w3.org/2000/svg"/>' }

  it('fits the figure on the slide without stretching it', () => {
    const wide = fitOnSlide(2000, 500)
    expect(wide.w / wide.h).toBeCloseTo(4, 3)
    expect(wide.x).toBe(Math.round(SLIDE.w * 0.05))
    expect(wide.y + wide.h / 2).toBeCloseTo(SLIDE.h / 2, -1)
    const tall = fitOnSlide(500, 2000)
    expect(tall.h).toBe(Math.round(SLIDE.h * 0.9))
    expect(tall.x + tall.w / 2).toBeCloseTo(SLIDE.w / 2, -1)
  })

  it('holds every part a presentation needs, each well-formed and listed', () => {
    const files = unzip(buildPptx(pic))
    const names = Object.keys(files)
    expect(names[0]).toBe('[Content_Types].xml')
    const parse = (name: string) => {
      const doc = new DOMParser().parseFromString(ascii(files[name]), 'application/xml')
      expect(doc.getElementsByTagName('parsererror').length, name).toBe(0)
      return doc
    }
    for (const name of names.filter((n) => /\.(xml|rels)$/.test(n))) parse(name)
    // Every part named in the content types exists, and every relationship points at a file in the archive.
    for (const o of Array.from(parse('[Content_Types].xml').getElementsByTagName('Override'))) expect(names).toContain(o.getAttribute('PartName')!.slice(1))
    for (const relsName of names.filter((n) => n.endsWith('.rels'))) {
      const base = relsName.replace(/_rels\/[^/]+$/, '')
      for (const r of Array.from(parse(relsName).getElementsByTagName('Relationship'))) {
        const target = new URL(r.getAttribute('Target')!, `http://x/${base}`).pathname.slice(1)
        expect(names, `${relsName} -> ${target}`).toContain(target)
      }
    }
    expect(Array.from(files['ppt/media/image1.png'])).toEqual([137, 80, 78, 71])
    expect(ascii(files['ppt/media/image2.svg'])).toBe(pic.svg)
  })

  it('places the picture with both versions and a safely written description', () => {
    const slide = new TextDecoder().decode(pptxParts(pic).find((p) => p.name === 'ppt/slides/slide1.xml')!.data)
    expect(slide).toContain('descr="Fig. 1 &lt;draft&gt; &amp; &quot;notes&quot;"')
    expect(slide).toContain('<a:blip r:embed="rId2">')
    expect(slide).toContain('svgBlip')
    const at = fitOnSlide(1200, 800)
    expect(slide).toContain(`<a:off x="${at.x}" y="${at.y}"/><a:ext cx="${at.w}" cy="${at.h}"/>`)
  })
})
