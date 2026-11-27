import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TEMPLATE,
  entryFile,
  entryMarkdown,
  entryPath,
  kindOf,
  localDay,
  newEntry,
  readEntry,
  readEntryFile,
  readTemplate,
  searchEntries,
  setValue,
  sortEntries,
  type Entry,
} from '../src/labbook/model'
import { plotChoices, plotFrom } from '../src/labbook/plots'
import { keyValueStore, memoryKeyValue } from '../src/labbook/store'

const at = new Date('2026-11-27T10:30:00Z')
const TABLE = 'Control\tTreated\n1.0\t2.1\n1.2\t2.4\n0.9\t2.0\n1.1\t2.6'

function editing(): Entry {
  let e = newEntry('editing', at, 'eTest0001')
  e = { ...e, title: 'Knock-out of TP53 in HEK293 | first try' }
  e = setValue(e, 'gene', 'TP53')
  e = setValue(e, 'aim', 'Remove exon 4.\n\n## not a heading of the notebook\n```\ncode\n```')
  e = setValue(e, 'guides', [{ name: 'sgTP53-1', sequence: 'GACGGAAACCGTAGCTGCCC', link: 'https://benchling.com/s/seq-abc' }, { name: 'sgTP53-2 | b' }])
  const plot = plotFrom(plotChoices(TABLE)[0], 'Viability')
  return { ...e, plots: plot ? [plot] : [] }
}

describe('the template', () => {
  it('survives being read back, and the one a notebook starts with is usable as it is', () => {
    expect(readTemplate(JSON.parse(JSON.stringify(DEFAULT_TEMPLATE)))).toEqual(DEFAULT_TEMPLATE)
    expect(kindOf(DEFAULT_TEMPLATE, 'clones')?.fields.find((f) => f.id === 'clones')?.columns?.length).toBe(5)
  })

  it('leaves out what it cannot use', () => {
    const t = readTemplate({
      kinds: [
        { id: 'ok', name: ' Western   blot ', fields: [{ id: 'a', label: 'A', type: 'nonsense' }, { id: 'a', label: 'twice' }, { id: 'bad id', label: 'x' }, { id: 'r', type: 'rows' }, { id: 'c', type: 'choice', options: ['x', 'x', 7, ''] }] },
        { id: 'empty', name: 'No fields', fields: [] },
        { id: '<script>', fields: [{ id: 'a' }] },
      ],
    })
    expect(t?.kinds).toHaveLength(1)
    expect(t?.kinds[0].name).toBe('Western blot')
    expect(t?.kinds[0].fields).toEqual([
      { id: 'a', label: 'A', type: 'text' },
      { id: 'c', label: 'c', type: 'choice', options: ['x'] },
    ])
    expect(readTemplate(null)).toBeNull()
    expect(readTemplate({ kinds: [] })).toBeNull()
  })
})

describe('an entry', () => {
  it('starts on the day it is made, where the scientist is', () => {
    const e = newEntry('experiment', at, 'eA')
    expect(e.date).toBe(localDay(at))
    expect(e.created).toBe('2026-11-27T10:30:00.000Z')
    expect(e.values).toEqual({})
  })

  it('drops a field that is emptied', () => {
    const e = setValue(setValue(newEntry('experiment', at, 'eA'), 'aim', 'x'), 'aim', '')
    expect('aim' in e.values).toBe(false)
    expect('guides' in setValue(setValue(e, 'guides', [{ name: 'a' }]), 'guides', []).values).toBe(false)
  })

  it('comes back from storage as it was, plot included', () => {
    const e = editing()
    expect(e.plots).toHaveLength(1)
    expect(readEntry(JSON.parse(JSON.stringify(e)))).toEqual(e)
  })

  it('is rebuilt field by field when read', () => {
    const e = readEntry({
      id: 'eX',
      kind: 'experiment',
      title: '  two\nlines ',
      date: '27 November',
      created: '2026-11-27T10:30:00.000Z',
      updated: 'never',
      values: { aim: 'kept', 'bad key': 'x', n: 5, rows: [{ a: 'x', 'b c': 'y', d: 3 }, 'no row'], empty: '' },
      plots: [{ title: 'no chart', chart: { type: 'shape' } }, 'nothing'],
      extra: 'gone',
    })
    expect(e).toEqual({ version: 1, id: 'eX', kind: 'experiment', title: 'two lines', date: '2026-11-27', created: '2026-11-27T10:30:00.000Z', updated: '2026-11-27T10:30:00.000Z', values: { aim: 'kept', rows: [{ a: 'x' }] }, plots: [] })
    expect(readEntry({ id: 'no kind' })).toBeNull()
    expect(readEntry('text')).toBeNull()
  })

  it('keeps a field its kind no longer names', () => {
    const e = setValue(newEntry('experiment', at, 'eA'), 'antibody', 'anti-p53, 1:1000')
    expect(readEntry(JSON.parse(JSON.stringify(e)))?.values.antibody).toBe('anti-p53, 1:1000')
    expect(entryMarkdown(e, DEFAULT_TEMPLATE)).toContain('## antibody\n\nanti-p53, 1:1000')
  })
})

describe('finding entries', () => {
  const a = { ...setValue(newEntry('editing', at, 'eA'), 'guides', [{ name: 'sgTP53-1' }]), title: 'Editing', date: '2026-11-20' }
  const b = { ...setValue(newEntry('experiment', at, 'eB'), 'aim', 'Western blot of p53'), title: 'Blot', date: '2026-11-25' }
  const c = { ...newEntry('experiment', at, 'eC'), title: 'Later the same day', date: '2026-11-25', updated: '2026-11-27T12:00:00.000Z' }

  it('lists the newest day first, and within a day the entry changed last', () => {
    expect(sortEntries([a, b, c]).map((e) => e.id)).toEqual(['eC', 'eB', 'eA'])
  })

  it('finds words in any field, in a cell of a table too, whatever their case', () => {
    expect(searchEntries([a, b, c], 'sgtp53').map((e) => e.id)).toEqual(['eA'])
    expect(searchEntries([a, b, c], 'P53 blot').map((e) => e.id)).toEqual(['eB'])
    expect(searchEntries([a, b, c], '2026-11-25').map((e) => e.id)).toEqual(['eB', 'eC'])
    expect(searchEntries([a, b, c], '  ')).toHaveLength(3)
    expect(searchEntries([a, b, c], 'nothing-like-this')).toEqual([])
  })
})

describe('the file of an entry', () => {
  it('has a path made of the year, the day, the title and the id', () => {
    expect(entryPath(editing())).toBe(`entries/2026/${localDay(at)}-knock-out-of-tp53-in-hek293-first-try-eTest0001.md`)
    expect(entryPath(newEntry('experiment', at, 'eA'))).toBe(`entries/2026/${localDay(at)}-eA.md`)
    expect(entryPath({ ...newEntry('experiment', at, 'eA'), title: 'Über-Färbung №5' })).toBe(`entries/2026/${localDay(at)}-uber-farbung-no5-eA.md`)
  })

  it('can be read by a person: a heading per field, a table for rows', () => {
    const md = entryMarkdown(editing(), DEFAULT_TEMPLATE)
    expect(md.startsWith('# Knock-out of TP53 in HEK293 | first try\n')).toBe(true)
    expect(md).toContain('· Genome editing')
    expect(md).toContain('## Target gene\n\nTP53')
    expect(md).toContain('| Name | Sequence (5′ to 3′) | Benchling link |')
    expect(md).toContain('| sgTP53-2 \\| b |  |  |')
    expect(md).toContain('## Plots')
    // The aim stands before the gene, as in the template.
    expect(md.indexOf('## Aim')).toBeLessThan(md.indexOf('## Target gene'))
  })

  it('gives the entry back exactly, whatever was typed into it', () => {
    const e = editing()
    const file = entryFile(e, DEFAULT_TEMPLATE)
    expect(readEntryFile(file.text)).toEqual(e)
    // A text that itself looks like the block of an entry does not confuse the reading.
    const tricky = setValue(e, 'results', '```json labbook-entry\n{"id":"eFake","kind":"x"}\n```')
    expect(readEntryFile(entryFile(tricky, DEFAULT_TEMPLATE).text)).toEqual(tricky)
  })

  it('is refused when it is not an entry', () => {
    expect(readEntryFile('# Just some notes')).toBeNull()
    expect(readEntryFile('```json labbook-entry\n{not json\n```\n')).toBeNull()
    expect(readEntryFile('```json labbook-entry\n{"id":"x"}\n```\n')).toBeNull()
  })
})

describe('plots', () => {
  it('offers the charts that fit a pasted table and none for words', () => {
    const choices = plotChoices(TABLE)
    expect(choices.length).toBeGreaterThan(0)
    const plot = plotFrom(choices[0])
    expect(plot?.title).toBe(choices[0].name)
    expect(plot?.chart.groups.map((g) => g.name)).toEqual(['Control', 'Treated'])
    expect(plot?.chart.groups[1].values).toEqual([2.1, 2.4, 2.0, 2.6])
    expect(plotChoices('')).toEqual([])
    expect(plotChoices('just a sentence')).toEqual([])
  })
})

describe('the notebook kept in the browser', () => {
  it('keeps, lists, replaces and removes entries', async () => {
    const kv = memoryKeyValue()
    const store = keyValueStore(kv)
    expect(await store.list()).toEqual([])
    const e = editing()
    const other = newEntry('experiment', at, 'eOther')
    expect(await store.save(e)).toBe(true)
    expect(await store.save(other)).toBe(true)
    expect(await store.save({ ...e, title: 'Renamed' })).toBe(true)
    const list = await keyValueStore(kv).list()
    expect(list.map((x) => x.id)).toEqual(['eTest0001', 'eOther'])
    expect(list[0].title).toBe('Renamed')
    expect(list[0].plots).toEqual(e.plots)
    await store.remove('eTest0001')
    expect((await store.list()).map((x) => x.id)).toEqual(['eOther'])
    expect(kv.data.has('labbook:entry:eTest0001')).toBe(false)
  })

  it('leaves out an entry it cannot read and says when nothing could be written', async () => {
    const kv = memoryKeyValue()
    const store = keyValueStore(kv)
    await store.save(newEntry('experiment', at, 'eGood'))
    kv.data.set('labbook:index', JSON.stringify(['eGood', 'eBroken', 'eGone', 7]))
    kv.data.set('labbook:entry:eBroken', '{not json')
    expect((await store.list()).map((x) => x.id)).toEqual(['eGood'])
    const full = keyValueStore({ ...kv, set: async () => false })
    expect(await full.save(newEntry('experiment', at, 'eNew'))).toBe(false)
  })

  it('starts with the template of a new notebook and keeps a changed one', async () => {
    const store = keyValueStore(memoryKeyValue())
    expect(await store.template()).toEqual(DEFAULT_TEMPLATE)
    const mine = { version: 1 as const, kinds: [{ id: 'blot', name: 'Western blot', fields: [{ id: 'antibody', label: 'Antibody', type: 'text' as const }] }] }
    await store.saveTemplate(mine)
    expect(await store.template()).toEqual(mine)
  })
})
