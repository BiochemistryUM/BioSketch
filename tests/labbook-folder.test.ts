// The folder store, tried against a small stand-in for the File System Access API (the browser's own
// is not in the test environment). The stand-in keeps files in a map and offers only what the store
// uses: nested folders, reading and writing a file, listing and removing.

import { describe, expect, it } from 'vitest'
import { folderStore } from '../src/labbook/folder'
import { DEFAULT_TEMPLATE, entryPath, newEntry, setValue, type Entry } from '../src/labbook/model'

class FakeDir {
  kind = 'directory' as const
  dirs = new Map<string, FakeDir>()
  files = new Map<string, string>()
  constructor(public name: string) {}
  async getDirectoryHandle(name: string, opts?: { create?: boolean }): Promise<FakeDir> {
    let d = this.dirs.get(name)
    if (!d) {
      if (!opts?.create) throw new Error('no such folder: ' + name)
      d = new FakeDir(name)
      this.dirs.set(name, d)
    }
    return d
  }
  async getFileHandle(name: string, opts?: { create?: boolean }) {
    if (!this.files.has(name) && !opts?.create) throw new Error('no such file: ' + name)
    if (!this.files.has(name)) this.files.set(name, '')
    const files = this.files
    return {
      kind: 'file' as const,
      name,
      createWritable: async () => ({ write: async (text: string) => files.set(name, text), close: async () => {} }),
      getFile: async () => ({ text: async () => files.get(name) ?? '' }),
    }
  }
  async removeEntry(name: string) {
    if (!this.files.delete(name) && !this.dirs.delete(name)) throw new Error('nothing to remove: ' + name)
  }
  async *values(): AsyncGenerator<FakeDir | { kind: 'file'; name: string; getFile: () => Promise<{ text: () => Promise<string> }> }> {
    for (const d of this.dirs.values()) yield d
    for (const [name, text] of this.files) yield { kind: 'file', name, getFile: async () => ({ text: async () => text }) }
  }
}

const at = new Date('2026-11-27T10:30:00Z')
function entry(id: string, title: string, day = '2026-11-27'): Entry {
  return { ...setValue(newEntry('editing', at, id), 'gene', 'TP53'), title, date: day }
}

describe('a notebook kept in a folder', () => {
  it('writes one readable file per entry and reads them back', async () => {
    const dir = new FakeDir('notebook') as unknown as FileSystemDirectoryHandle
    const store = folderStore(dir)
    await store.save(entry('eA', 'TP53 knock-out'))
    await store.save(entry('eB', 'Second try', '2025-12-01'))

    const root = dir as unknown as FakeDir
    const file2026 = root.dirs.get('entries')!.dirs.get('2026')!
    expect([...file2026.files.keys()]).toEqual([`${entryPath(entry('eA', 'TP53 knock-out')).split('/').pop()}`])
    expect(file2026.files.values().next().value).toContain('# TP53 knock-out')
    expect(root.dirs.get('entries')!.dirs.get('2025')).toBeDefined()

    const back = await folderStore(dir).list()
    expect(back.map((e) => e.id).sort()).toEqual(['eA', 'eB'])
    expect(back.find((e) => e.id === 'eA')?.values.gene).toBe('TP53')
  })

  it('replaces an entry whose title or year changed, never leaving a second file', async () => {
    const dir = new FakeDir('notebook') as unknown as FileSystemDirectoryHandle
    const store = folderStore(dir)
    await store.save(entry('eA', 'First name'))
    await store.save(entry('eA', 'A better name'))
    await store.save(entry('eA', 'Moved to last year', '2025-11-27'))
    const back = await store.list()
    expect(back).toHaveLength(1)
    expect(back[0].title).toBe('Moved to last year')
    const root = dir as unknown as FakeDir
    expect(root.dirs.get('entries')!.dirs.get('2026')!.files.size).toBe(0)
    expect(root.dirs.get('entries')!.dirs.get('2025')!.files.size).toBe(1)
  })

  it('removes an entry, and lists nothing for an empty folder', async () => {
    const dir = new FakeDir('notebook') as unknown as FileSystemDirectoryHandle
    const store = folderStore(dir)
    expect(await store.list()).toEqual([])
    await store.save(entry('eA', 'One'))
    await store.save(entry('eB', 'Two'))
    await store.remove('eA')
    expect((await store.list()).map((e) => e.id)).toEqual(['eB'])
  })

  it('keeps the template as its own file', async () => {
    const dir = new FakeDir('notebook') as unknown as FileSystemDirectoryHandle
    const store = folderStore(dir)
    expect(await store.template()).toEqual(DEFAULT_TEMPLATE)
    const mine = { version: 1 as const, kinds: [{ id: 'blot', name: 'Blot', fields: [{ id: 'ab', label: 'Antibody', type: 'text' as const }] }] }
    expect(await store.saveTemplate(mine)).toBe(true)
    expect(await folderStore(dir).template()).toEqual(mine)
    expect((dir as unknown as FakeDir).files.has('template.json')).toBe(true)
  })
})
