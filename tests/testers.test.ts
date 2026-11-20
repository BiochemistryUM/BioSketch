// What testers need: a backup of every figure, a report of a problem, and the version.

import packageJson from '../package.json?raw'
import { beforeEach, describe, expect, it } from 'vitest'
import { backupFileName, backupText, readBackup } from '../src/io/backup'
import { serializeDoc } from '../src/io/files'
import { browserName, reportBody, reportLink } from '../src/io/report'
import { listFigures, loadFigure, restoreFigures, saveFigure, setFigureProject } from '../src/io/storage'
import { emptyDoc } from '../src/model/doc'
import { TEMPLATES } from '../src/templates'
import { VERSION, WHATS_NEW, newSince } from '../src/version'
import { example } from './helpers'

beforeEach(() => localStorage.clear())

describe('a backup of every figure', () => {
  it('gives back the figures, their projects and times, after a trip through the file', () => {
    const a = example(TEMPLATES[0])
    const b = { ...emptyDoc(), name: 'Empty one' }
    const text = backupText([
      { doc: a, project: 'Thesis', updated: 1000 },
      { doc: b, updated: 2000 },
    ])
    const back = readBackup(text)
    expect(back.unreadable).toBe(0)
    expect(back.figures).toEqual([
      { doc: a, project: 'Thesis', updated: 1000 },
      { doc: b, updated: 2000 },
    ])
  })

  it('counts a broken figure instead of reading half of it, and keeps the others', () => {
    const good = example(TEMPLATES[0])
    const data = JSON.parse(backupText([{ doc: good, updated: 5 }]))
    data.figures.push({ figure: '{"nodes": "not a list"', updated: 6 }, { nothing: true }, null)
    const back = readBackup(JSON.stringify(data))
    expect(back.figures).toHaveLength(1)
    expect(back.unreadable).toBe(3)
  })

  it('says what a file is when it is not a backup', () => {
    expect(() => readBackup('hello')).toThrow('not a BioSketch backup')
    expect(() => readBackup('[1, 2]')).toThrow('not a BioSketch backup')
    expect(() => readBackup(serializeDoc(emptyDoc()))).toThrow('Open it with File › Open figure file')
    expect(() => readBackup(JSON.stringify({ format: 'biosketch-backup', version: 2, figures: [] }))).toThrow('newer version')
  })

  it('tidies a project name and replaces a time that is no time', () => {
    const data = JSON.parse(backupText([{ doc: emptyDoc(), updated: 1 }]))
    data.figures[0].project = '  Lab\n  meeting  '
    data.figures[0].updated = 'yesterday'
    const [entry] = readBackup(JSON.stringify(data)).figures
    expect(entry.project).toBe('Lab meeting')
    expect(entry.updated).toBeGreaterThan(1)
  })

  it('is named after the day it was made', () => {
    expect(backupFileName(new Date(2026, 10, 5))).toBe('biosketch-backup-2026-11-05.json')
  })

  it('adds the figures of a backup to the browser, and adds nothing the second time', async () => {
    const a = example(TEMPLATES[0])
    await saveFigure('here', a)
    await setFigureProject('here', 'Old project')
    const b = { ...example(TEMPLATES[1]), name: 'From the other computer' }
    const { figures } = readBackup(backupText([{ doc: a, updated: 10 }, { doc: b, project: 'Grant', updated: 20 }]))

    expect(await restoreFigures(figures)).toEqual({ added: 1, same: 1, failed: 0 })
    const list = await listFigures()
    expect(list).toHaveLength(2)
    const restored = list.find((m) => m.id !== 'here')!
    expect(restored).toMatchObject({ name: 'From the other computer', project: 'Grant', updated: 20 })
    expect(await loadFigure(restored.id)).toEqual(b)
    // The figure that was here keeps its project.
    expect(list.find((m) => m.id === 'here')?.project).toBe('Old project')

    expect(await restoreFigures(figures)).toEqual({ added: 0, same: 2, failed: 0 })
    expect(await listFigures()).toHaveLength(2)
  })
})

describe('a report of a problem', () => {
  const facts = { version: '0.2.0', browser: 'Firefox 140.0 on macOS', screen: '1440 × 900' }

  it('fills in the version, the browser and the window', () => {
    const body = reportBody('The chart vanished', facts)
    expect(body).toContain('The chart vanished')
    expect(body).toContain('Version: 0.2.0')
    expect(body).toContain('Browser: Firefox 140.0 on macOS')
    expect(body).toContain('Window: 1440 × 900')
    expect(body).toContain('Figure: not attached.')
    expect(reportBody('', { ...facts, attached: 'Cells.biosketch.json' })).toContain('attach the file “Cells.biosketch.json”')
  })

  it('is a mail link that keeps every character and stays short', () => {
    const link = reportLink('Ca²⁺ & 50% "quoted"\nnext line', facts, 'lab@example.org')
    expect(link.startsWith('mailto:lab@example.org?subject=')).toBe(true)
    const params = new URLSearchParams(link.slice(link.indexOf('?') + 1).replace(/\+/g, '%2B'))
    expect(params.get('subject')).toBe('BioSketch 0.2.0: problem report')
    expect(params.get('body')).toContain('Ca²⁺ & 50% "quoted"\nnext line')
    expect(reportLink('x'.repeat(10000), facts).length).toBeLessThan(5000)
    expect(reportLink('', facts).startsWith('mailto:?subject=')).toBe(true)
  })

  it('names the common browsers', () => {
    expect(browserName('Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:140.0) Gecko/20100101 Firefox/140.0')).toBe('Firefox 140.0 on macOS')
    expect(browserName('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.1 Safari/605.1.15')).toBe('Safari 19.1 on macOS')
    expect(browserName('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36')).toBe('Chrome 141.0.0.0 on Windows')
    expect(browserName('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0')).toBe('Edge 141.0.0.0 on Windows')
    expect(browserName('Mozilla/5.0 (iPad; CPU OS 19_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.1 Mobile/15E148 Safari/604.1')).toBe('Safari 19.1 on iPadOS/iOS')
    expect(browserName('curl/8')).toBe('another browser on unknown system')
  })
})

describe('the version', () => {
  it('is the one in package.json and the newest in the list of changes', () => {
    const pkg = JSON.parse(packageJson)
    expect(VERSION).toBe(pkg.version)
    expect(WHATS_NEW[0].version).toBe(VERSION)
    expect(new Set(WHATS_NEW.map((r) => r.version)).size).toBe(WHATS_NEW.length)
  })

  it('tells what is new only after an update', () => {
    const list = [
      { version: '3', date: '', items: ['c'] },
      { version: '2', date: '', items: ['b'] },
      { version: '1', date: '', items: ['a'] },
    ]
    expect(newSince(null, list)).toEqual([])
    expect(newSince('3', list)).toEqual([])
    expect(newSince('1', list).map((r) => r.version)).toEqual(['3', '2'])
    expect(newSince('0.0.1', list).map((r) => r.version)).toEqual(['3'])
  })
})
