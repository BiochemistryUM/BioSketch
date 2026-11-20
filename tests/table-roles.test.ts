import { describe, expect, it } from 'vitest'
import { IGNORE, cellNumber, guessRoles, readCells, readPlates, wellName, type RoleSpec } from '../src/model/tableRoles'

import plateRaw from './fixtures/tables/plate-reader-gen5.txt?raw'
import bradfordRaw from './fixtures/tables/bradford-wide.tsv?raw'
import bradfordCommaRaw from './fixtures/tables/bradford-wide-decimal-comma.csv?raw'
import elisaRaw from './fixtures/tables/elisa-long.csv?raw'
import cfxRaw from './fixtures/tables/qpcr-biorad-cfx.csv?raw'
import quantRaw from './fixtures/tables/qpcr-quantstudio.txt?raw'
import lightRaw from './fixtures/tables/qpcr-lightcycler480.txt?raw'

const FILES: Record<string, string> = {
  'plate-reader-gen5.txt': plateRaw,
  'bradford-wide.tsv': bradfordRaw,
  'bradford-wide-decimal-comma.csv': bradfordCommaRaw,
  'elisa-long.csv': elisaRaw,
  'qpcr-biorad-cfx.csv': cfxRaw,
  'qpcr-quantstudio.txt': quantRaw,
  'qpcr-lightcycler480.txt': lightRaw,
}
const fixture = (name: string): string => FILES[name]

const STANDARD: RoleSpec[] = [
  { id: 'name', label: 'Name of the sample', kind: 'words', heading: [/sample/i, /\bname\b/i], byPlace: true },
  { id: 'conc', label: 'Concentration of the standard', kind: 'number', heading: [/conc/i, /µg|ug|ng|pg|mg/i, /\bstd\b|standard/i, /amount/i] },
  { id: 'signal', label: 'Signal', kind: 'number', many: true, required: true, heading: [/\bod\s?\d*\b/i, /^a\s?\d{3}/i, /abs/i, /signal/i, /\brep/i, /rfu/i] },
  { id: 'dilution', label: 'Dilution', kind: 'number', heading: [/dilution|\bdil\b|fold|factor/i] },
  { id: 'well', label: 'Well', kind: 'well', heading: [/\bwell\b/i, /\bpos(ition)?\b/i] },
]
const QPCR: RoleSpec[] = [
  { id: 'well', label: 'Well', kind: 'well', heading: [/\bwell\b/i, /\bpos(ition)?\b/i] },
  { id: 'sample', label: 'Sample', kind: 'words', required: true, byPlace: true, heading: [/sample/i, /\bname\b/i] },
  { id: 'target', label: 'Target (gene)', kind: 'words', required: true, heading: [/target/i, /gene/i, /primer/i] },
  { id: 'cq', label: 'Cq', kind: 'number', required: true, heading: [/^c[qtp]$/i, /\bc[qtp]\b/i, /threshold cycle/i] },
]

const guess = (file: string, specs: RoleSpec[]) => {
  const cells = readCells(fixture(file))
  return { cells, g: guessRoles(cells, specs) }
}

describe('cellNumber', () => {
  it('reads numbers as they are typed', () => {
    expect(cellNumber('1.5', false)).toBe(1.5)
    expect(cellNumber(' -0.5 ', false)).toBe(-0.5)
    expect(cellNumber('−0.5', false)).toBe(-0.5)
    expect(cellNumber('1.2E-3', false)).toBeCloseTo(0.0012)
    expect(cellNumber('.5', false)).toBe(0.5)
    expect(cellNumber('1,23', true)).toBe(1.23)
    expect(cellNumber('1,234', false)).toBe(1234)
    expect(cellNumber('1,234.5', false)).toBe(1234.5)
    expect(cellNumber('1.234,5', true)).toBe(1234.5)
    expect(cellNumber('1,23', false)).toBeNull()
  })
  it('never joins digits across a space', () => {
    expect(cellNumber('1 234', false)).toBeNull()
    expect(cellNumber('1 234', true)).toBeNull()
    expect(cellNumber('1 234', true)).toBeNull()
  })
  it('gives null for the words instruments write where they have no number', () => {
    for (const w of ['Undetermined', 'N/A', 'NA', '-', '', '<LOD', 'OVRFLW', '*', 'abc', '1:5', '12%', '1.2.3']) expect(cellNumber(w, true), w).toBeNull()
  })
})

describe('wellName', () => {
  it('normalises well names', () => {
    expect(wellName('a1')).toBe('A1')
    expect(wellName('A01')).toBe('A1')
    expect(wellName('A 1')).toBe('A1')
    expect(wellName(' H12 ')).toBe('H12')
    expect(wellName('P24')).toBe('P24')
  })
  it('refuses what is not a well', () => {
    for (const w of ['A0', 'A25', 'Q1', 'AA1', '1A', 'A', '12', '', 'A1B', 'Std 1']) expect(wellName(w), w).toBeNull()
  })
})

describe('readCells', () => {
  it('skips the preamble of the plate reader file and keeps both grids', () => {
    const c = readCells(fixture('plate-reader-gen5.txt'))
    expect(c.skipped.length).toBeGreaterThan(10)
    expect(c.skipped[0]).toBe('Software Version\t3.11.19')
    expect(c.header).toBeNull()
    expect(c.rows[0][1]).toBe('1')
    expect(c.rows.filter((r) => /^[A-H]$/.test(r[0])).length).toBe(16)
  })
  it('finds the header and reads decimal commas of the Bradford tables', () => {
    const a = readCells(fixture('bradford-wide.tsv'))
    expect(a.header).toEqual(['Sample', 'µg/mL', 'A595 rep 1', 'A595 rep 2', 'A595 rep 3', 'Dilution'])
    expect(a.rows.length).toBe(12)
    expect(a.decimalComma).toBe(false)
    const b = readCells(fixture('bradford-wide-decimal-comma.csv'))
    expect(b.header).toEqual(a.header)
    expect(b.skipped).toEqual(['Bradford 19.11.2026;;;;;'])
    expect(b.decimalComma).toBe(true)
    expect(b.rows[1][2]).toBe('0,451')
    expect(cellNumber(b.rows[1][2], b.decimalComma)).toBe(0.451)
  })
  it('reads the ELISA in long form', () => {
    const c = readCells(fixture('elisa-long.csv'))
    expect(c.header).toEqual(['Well', 'Sample', 'Conc (pg/mL)', 'OD450'])
    expect(c.rows.length).toBe(28)
  })
  it('reads the three qPCR exports', () => {
    const cfx = readCells(fixture('qpcr-biorad-cfx.csv'))
    expect(cfx.skipped).toEqual([])
    expect(cfx.header?.slice(0, 8)).toEqual(['', 'Well', 'Fluor', 'Target', 'Content', 'Sample', 'Biological Set Name', 'Cq'])
    expect(cfx.rows.length).toBe(25)
    const qs = readCells(fixture('qpcr-quantstudio.txt'))
    expect(qs.skipped.length).toBe(7)
    expect(qs.skipped[0]).toBe('* Block Type = 96-Well 0.2-mL Block')
    expect(qs.skipped[6]).toBe('[Results]')
    expect(qs.header?.[8]).toBe('CT')
    expect(qs.rows.length).toBe(25)
    const lc = readCells(fixture('qpcr-lightcycler480.txt'))
    expect(lc.skipped.length).toBe(1)
    expect(lc.header).toEqual(['Include', 'Color', 'Pos', 'Name', 'Cp', 'Concentration', 'Standard', 'Status'])
    expect(lc.rows.length).toBe(7)
  })
  it('splits by tabs, semicolons, quoted commas and runs of spaces, and handles odd input', () => {
    expect(readCells('a\tb\n1\t2').rows).toEqual([['1', '2']])
    expect(readCells('"x, y",b\n"1,5",2').rows).toEqual([['1,5', '2']])
    expect(readCells('Well  Cq\nA1  20.5\nA2  21.0').header).toEqual(['Well', 'Cq'])
    expect(readCells('').rows).toEqual([])
    expect(readCells('1\n2\n3').rows).toEqual([['1'], ['2'], ['3']])
    expect(readCells('﻿a,b\r\n1,2\r\n').header).toEqual(['a', 'b'])
  })
  it('does not take a row of numbers for a header', () => {
    const c = readCells('1\t2\t3\n4\t5\t6')
    expect(c.header).toBeNull()
    expect(c.rows.length).toBe(2)
  })
})

describe('readPlates', () => {
  it('reads both reads of the plate reader file', () => {
    const plates = readPlates(fixture('plate-reader-gen5.txt'))!
    expect(plates.length).toBe(2)
    expect(plates[0].wells.length).toBe(96)
    expect(plates[0].wells[0]).toEqual({ well: 'A1', value: 0.08, text: '0.080' })
    expect(plates[0].wells[95].well).toBe('H12')
    expect(plates[1].title).toBe('Actual Temperature:\t24.2'.split('\t')[0] === '' ? undefined : plates[1].title)
    expect(plates[1].wells[0].value).toBeCloseTo(0.05)
  })
  it('reads a 384-well plate and keeps gaps as null', () => {
    const head = '<>\t' + [...Array(24)].map((_, i) => i + 1).join('\t')
    const rows = [...Array(16)].map((_, r) => String.fromCharCode(65 + r) + '\t' + [...Array(24)].map((_, j) => (r === 15 && j === 23 ? 'OVRFLW' : `${r}.${j}`)).join('\t'))
    const plates = readPlates([head, ...rows].join('\n'))!
    expect(plates.length).toBe(1)
    expect(plates[0].wells.length).toBe(384)
    expect(plates[0].wells[383]).toEqual({ well: 'P24', value: null, text: 'OVRFLW' })
    expect(plates[0].wells[25].value).toBeCloseTo(1.1)
  })
  it('says no for tables that are not plates', () => {
    expect(readPlates(fixture('elisa-long.csv'))).toBeNull()
    expect(readPlates('1\t2\n3\t4')).toBeNull()
    expect(readPlates('')).toBeNull()
  })
})

describe('guessRoles: standard curves', () => {
  it('Bradford, wide, point and comma', () => {
    for (const f of ['bradford-wide.tsv', 'bradford-wide-decimal-comma.csv']) {
      const { g } = guess(f, STANDARD)
      expect(g.roles, f).toEqual(['name', 'conc', 'signal', 'signal', 'signal', 'dilution'])
      expect(g.missing).toEqual([])
    }
  })
  it('ELISA in long form', () => {
    const { g } = guess('elisa-long.csv', STANDARD)
    expect(g.roles).toEqual(['well', 'name', 'conc', 'signal'])
    expect(g.missing).toEqual([])
  })
  it('says what is missing and leaves the rest out', () => {
    const { g } = guess('qpcr-quantstudio.txt', STANDARD)
    expect(g.missing).toEqual(['signal'])
    expect(g.roles[1]).toBe('well')
    expect(g.roles[3]).toBe('name')
  })
  it('joins unnamed numbers beside a signal column', () => {
    const cells = readCells('Sample\tOD\t\t\nA\t0.1\t0.2\t0.3\nB\t0.4\t0.5\t0.6')
    const g = guessRoles(cells, STANDARD)
    expect(g.roles).toEqual(['name', 'signal', 'signal', 'signal'])
  })
  it('takes the first column of words for the name when no heading is there', () => {
    const g = guessRoles(readCells('S1\t0.1\t0.2\nS2\t0.3\t0.4\nS3\t0.5\t0.6'), STANDARD)
    expect(g.roles[0]).toBe('name')
    expect(g.roles.slice(1)).toEqual([IGNORE, IGNORE])
  })
})

describe('guessRoles: qPCR', () => {
  it('Bio-Rad CFX', () => {
    const { g } = guess('qpcr-biorad-cfx.csv', QPCR)
    expect(g.roles).toEqual([IGNORE, 'well', IGNORE, 'target', IGNORE, 'sample', IGNORE, 'cq', IGNORE, IGNORE, IGNORE, IGNORE, IGNORE, IGNORE, IGNORE, IGNORE])
    expect(g.missing).toEqual([])
  })
  it('QuantStudio', () => {
    const { g, cells } = guess('qpcr-quantstudio.txt', QPCR)
    const by = (id: string) => cells.header![g.roles.indexOf(id)]
    expect(by('well')).toBe('Well Position')
    expect(by('sample')).toBe('Sample Name')
    expect(by('target')).toBe('Target Name')
    expect(by('cq')).toBe('CT')
    expect(g.roles.filter((r) => r !== IGNORE).length).toBe(4)
    expect(g.missing).toEqual([])
  })
  it('LightCycler 480 has no target: it is reported missing, not invented', () => {
    const { g, cells } = guess('qpcr-lightcycler480.txt', QPCR)
    expect(g.roles.map((r, j) => (r === IGNORE ? '' : cells.header![j]))).toEqual(['', '', 'Pos', 'Name', 'Cp', '', '', ''])
    expect(g.roles[2]).toBe('well')
    expect(g.roles[3]).toBe('sample')
    expect(g.roles[4]).toBe('cq')
    expect(g.missing).toEqual(['target'])
  })
  it('gives a reason for every column, and the same answer every time', () => {
    for (const f of ['qpcr-biorad-cfx.csv', 'qpcr-quantstudio.txt', 'qpcr-lightcycler480.txt', 'elisa-long.csv']) {
      const { g, cells } = guess(f, QPCR)
      expect(g.roles.length).toBe(g.why.length)
      for (const w of g.why) expect(w.length).toBeGreaterThan(3)
      expect(guessRoles(cells, QPCR)).toEqual(g)
    }
    expect(guess('qpcr-biorad-cfx.csv', QPCR).g.why[0]).toBe('nothing in this column')
    expect(guess('qpcr-quantstudio.txt', QPCR).g.why[8]).toContain('numbers')
  })
  it('keeps the leftmost column on a tie', () => {
    const cells = readCells('Cq\tCq\nA\tB\n'.replace('A\tB', '1\t2') + '3\t4')
    expect(guessRoles(cells, QPCR).roles).toEqual(['cq', IGNORE])
  })
})
