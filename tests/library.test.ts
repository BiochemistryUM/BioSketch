// The built-in icons added from the second survey (docs/icon-wishlist.md): they exist, follow the
// drawing rules the flat cartoon look relies on, fit their frame and can be found in plain words.

import { describe, expect, it } from 'vitest'
import { BUILTIN_ICONS, searchIcons } from '../src/icons/library'
import { EXTRA_ICONS } from '../src/icons/pack-extra'
import { ORGANELLE_ICONS } from '../src/icons/pack-organelles'
import { ORGANISM_ICONS } from '../src/icons/pack-organisms'
import { ORGAN_ICONS } from '../src/icons/pack-organs'
import { anchorsOf, parsePath } from '../src/icons/path'
import { extractParts } from '../src/icons/split'
import { styleIcon } from '../src/icons/style'
import { extractColors } from '../src/icons/svg'
import type { IconDef } from '../src/model/types'

const SURVEY: Record<string, string[]> = {
  'Tissues & organisms': [
    'brain', 'heart', 'lungs', 'liver', 'kidney', 'stomach', 'intestine', 'pancreas', 'spleen', 'eye', 'thymus', 'adrenal-gland',
    'human-body', 'fetus', 'hair-follicle', 'taste-bud', 'ciliated-airway', 'granuloma',
    'leaf', 'seedling', 'tree', 'stomata', 'mycorrhiza', 'mushroom', 'cereal', 'fruit-fly', 'bee', 'ant', 'cow', 'bird', 'flatworm',
  ],
  'Microbes & viruses': ['bullet-virus', 'giant-virus', 'pox-virus', 'mycobacterium', 'prophage', 'bacterial-lysis'],
  'Proteins & molecules': ['insulin', 'cellulose-fibre'],
  'Nucleic acids': ['oncogene'],
  Lab: ['injection-pen', 'blood-pressure-gauge', 'patient-monitor', 'rapid-test', 'pill-bottle', 'laser-beam', 'radiation-sign', 'protective-suit'],
  'Figure helpers': ['phylogenetic-tree', 'pedigree', 'globe', 'hourglass'],
}

const LAYERS = ORGANELLE_ICONS.find((i) => i.id === 'mitochondrion-layers')!
const DRAWN: IconDef[] = [...EXTRA_ICONS, ...ORGAN_ICONS, ...ORGANISM_ICONS, LAYERS]
const attr = (attrs: string, name: string): string | undefined => new RegExp(`\\s${name}="([^"]*)"`).exec(attrs)?.[1]
const elements = (body: string): { tag: string; attrs: string }[] =>
  [...body.matchAll(/<(path|circle|ellipse|rect|polygon)\b([^>]*?)\/>/g)].map((m) => ({ tag: m[1], attrs: m[2] }))
const HEX = /^#[0-9a-f]{6}$/

describe('icons from the second survey', () => {
  it('are all drawn, each in the category a biologist would look in', () => {
    const ids = Object.values(SURVEY).flat()
    expect(ids).toHaveLength(52)
    for (const [category, wanted] of Object.entries(SURVEY)) {
      for (const id of wanted) expect(BUILTIN_ICONS.find((i) => i.id === id)?.category, id).toBe(category)
    }
  })

  it('give every shape its own plain colours, so the flat look and recolouring work', () => {
    for (const icon of DRAWN) {
      // Nothing is drawn with tags the flat look does not know.
      expect(icon.body, icon.id).not.toMatch(/<(line|polyline|use|image)\b/)
      expect(icon.body, icon.id).not.toMatch(/opacity/)
      for (const group of icon.body.matchAll(/<g\b([^>]*)>/g)) expect(group[1], icon.id).not.toMatch(/\s(fill|stroke)="/)
      for (const { tag, attrs } of elements(icon.body)) {
        const [fill, stroke] = [attr(attrs, 'fill'), attr(attrs, 'stroke')]
        expect(fill === 'none' || HEX.test(fill ?? ''), `${icon.id}: <${tag}> fill ${fill}`).toBe(true)
        expect(stroke === 'none' || HEX.test(stroke ?? ''), `${icon.id}: <${tag}> stroke ${stroke}`).toBe(true)
        expect(fill === 'none' && stroke === 'none', `${icon.id}: invisible <${tag}>`).toBe(false)
      }
    }
  })

  it('keep their points inside the frame, so nothing is cut off at the edge', () => {
    const outside: string[] = []
    for (const icon of DRAWN) {
      const [w, h] = icon.viewBox
      // Shapes inside a turned group are left out: their numbers are not page positions.
      const upright = icon.body.replace(/<g transform="[^"]*">.*?<\/g>/g, '')
      for (const { tag, attrs } of elements(upright)) {
        const n = (name: string): number => Number(attr(attrs, name) ?? 0)
        const half = attr(attrs, 'stroke') === 'none' ? 0 : Number(attr(attrs, 'stroke-width') ?? 2.5) / 2
        let xs: number[] = []
        let ys: number[] = []
        if (tag === 'circle') [xs, ys] = [[n('cx') - n('r'), n('cx') + n('r')], [n('cy') - n('r'), n('cy') + n('r')]]
        else if (tag === 'ellipse') [xs, ys] = [[n('cx') - n('rx'), n('cx') + n('rx')], [n('cy') - n('ry'), n('cy') + n('ry')]]
        else if (tag === 'rect') [xs, ys] = [[n('x'), n('x') + n('width')], [n('y'), n('y') + n('height')]]
        else if (tag === 'polygon') {
          const p = (attr(attrs, 'points') ?? '').split(/[\s,]+/).filter(Boolean).map(Number)
          xs = p.filter((_, i) => i % 2 === 0)
          ys = p.filter((_, i) => i % 2 === 1)
        } else {
          const anchors = anchorsOf(parsePath(attr(attrs, 'd') ?? ''))
          xs = anchors.map((a) => a.x)
          ys = anchors.map((a) => a.y)
        }
        const out = Math.max(-(Math.min(...xs) - half), -(Math.min(...ys) - half), Math.max(...xs) + half - w, Math.max(...ys) + half - h)
        if (out > 0.5) outside.push(`${icon.id}: <${tag}${attrs.slice(0, 40)}> by ${Math.round(out * 10) / 10}`)
      }
    }
    expect(outside).toEqual([])
  })

  it('are found by the words people use for them', () => {
    const found = (query: string): string[] => searchIcons(BUILTIN_ICONS, query).map((i) => i.id)
    expect(found('wheat')).toEqual(['cereal'])
    expect(found('tuberculosis')).toEqual(['mycobacterium', 'granuloma'])
    expect(found('drosophila')).toEqual(['fruit-fly'])
    expect(found('ecg')).toEqual(['patient-monitor'])
    expect(found('hazmat')).toEqual(['protective-suit'])
    expect(found('insulin')[0]).toBe('insulin')
    expect(found('brain')[0]).toBe('brain')
    expect(found('family tree')).toEqual(['pedigree'])
  })
})

describe('mitochondrion with both membranes', () => {
  it('draws the outer membrane, the space between, the inner membrane and the matrix as layers of their own colour', () => {
    const colours = extractColors(LAYERS.body)
    // Outer membrane and its outline, intermembrane space, matrix, inner membrane (two tones).
    for (const colour of ['#f9c3a6', '#d9623a', '#fff3ea', '#fdeab5', '#c9403d', '#f4a9a8']) expect(colours).toContain(colour)
    // The inner membrane is a tube along the edge of the matrix: the same outline, drawn three times.
    const paths = [...LAYERS.body.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1])
    expect(paths).toHaveLength(3)
    expect(new Set(paths).size).toBe(1)
    // Five cristae: folds of the inner membrane, each one closed at its tip by a curve.
    expect(paths[0].match(/V50C/g)).toHaveLength(5)
  })

  it('splits into its layers in both looks, and sits beside the simple mitochondrion in a search', () => {
    expect(extractParts(LAYERS.body)!.parts.length).toBeGreaterThanOrEqual(5)
    const flat = extractParts(styleIcon(LAYERS, 'flat').body)!
    expect(flat.parts.length).toBeGreaterThanOrEqual(5)
    const found = (query: string): string[] => searchIcons(BUILTIN_ICONS, query).map((i) => i.id)
    expect(found('inner membrane')).toEqual(['mitochondrion-layers'])
    expect(found('cristae')).toEqual(['mitochondrion', 'mitochondrion-layers'])
    expect(found('matrix')).toContain('mitochondrion-layers')
  })
})

