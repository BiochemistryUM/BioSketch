// Reading a chart's table from a file: CSV with quotes, text in other character sets, and Excel
// workbooks, which are unpacked and read by hand.

import { describe, expect, it } from 'vitest'
import { zipStore } from '../src/io/pptx'
import { MAX_TABLE_FILE, columnIndex, csvToText, decodeText, gridToText, tableFromFile, xlsxToTable, zipParts } from '../src/io/tables'
import { parseTable, readTable } from '../src/model/chart'
import realWorkbook from './fixtures/table-xlsx.json'

const bytesOf = (text: string): Uint8Array => new TextEncoder().encode(text)
const fileOf = (name: string, bytes: Uint8Array) => ({ name, size: bytes.length, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer })
const problem = async (run: () => Promise<unknown>): Promise<string> => run().then(() => '', (e: Error) => e.message)

/** A workbook as Excel writes it (texts in a shared list), packed without compression. */
function workbook(sheetXml: string, strings: string[] = [], sheets = ['Sheet1']): Uint8Array {
  const ns = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
  return zipStore([
    { name: 'xl/workbook.xml', data: bytesOf(`<workbook ${ns}><sheets>${sheets.map((name, i) => `<sheet name="${name}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`) },
    { name: 'xl/_rels/workbook.xml.rels', data: bytesOf(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="x" Target="worksheets/data${i + 1}.xml"/>`).join('')}</Relationships>`) },
    { name: 'xl/sharedStrings.xml', data: bytesOf(`<sst ${ns}>${strings.map((s) => `<si>${s}</si>`).join('')}</sst>`) },
    { name: 'xl/worksheets/data1.xml', data: bytesOf(`<worksheet ${ns}><sheetData>${sheetXml}</sheetData></worksheet>`) },
  ])
}

describe('text files', () => {
  it('pass plain tables on as they are', async () => {
    const text = 'Control\tTreated\n4.1\t6.9\n3.8\t7.4'
    expect((await tableFromFile(fileOf('data.tsv', bytesOf(text)))).text).toBe(text)
    expect((await tableFromFile(fileOf('data.csv', bytesOf('A;B\n1,5;2,5\n3;4')))).text).toBe('A;B\n1,5;2,5\n3;4')
    expect(parseTable((await tableFromFile(fileOf('data.csv', bytesOf('A,B\n1,2\n3,4')))).text)).toEqual([{ name: 'A', values: [1, 3] }, { name: 'B', values: [2, 4] }])
  })

  it('take quoted cells apart: separators, quotes and line breaks inside them belong to the cell', async () => {
    expect(csvToText('"Name","IL-6, 10 ng/ml","say ""hi"""\n1,2,3')).toBe('Name\tIL-6, 10 ng/ml\tsay "hi"\n1\t2\t3')
    expect(csvToText('"A";"B"\r\n"1,5";"2,5"\r\n')).toBe('A\tB\n1,5\t2,5\n')
    expect(csvToText('"two\nlines"\tB\n1\t2')).toBe('two lines\tB\n1\t2')
    // A quote in the middle of a cell is just a quote.
    expect(csvToText('5" tube,B\n1,2')).toBe('5" tube\tB\n1\t2')
    const table = await tableFromFile(fileOf('export.csv', bytesOf('"Control","Treated, 10 µM"\n"4,1","6,9"\n"3,8","7,4"')))
    expect(parseTable(table.text)).toEqual([{ name: 'Control', values: [4.1, 3.8] }, { name: 'Treated, 10 µM', values: [6.9, 7.4] }])
  })

  it('read the character sets spreadsheet programs write', async () => {
    expect(decodeText(new Uint8Array([0xef, 0xbb, 0xbf, 0x41]))).toBe('A')
    // "µM" as Windows writes it, and as "Unicode text" (UTF-16 with a byte order mark).
    expect(decodeText(new Uint8Array([0xb5, 0x4d]))).toBe('µM')
    expect(decodeText(new Uint8Array([0xff, 0xfe, 0xb5, 0x00, 0x4d, 0x00]))).toBe('µM')
    expect(decodeText(new Uint8Array([0xfe, 0xff, 0x00, 0xb5, 0x00, 0x4d]))).toBe('µM')
    expect(decodeText(bytesOf('µM'))).toBe('µM')
  })

  it('refuse what is not a table, in words', async () => {
    expect(await problem(() => tableFromFile(fileOf('empty.csv', new Uint8Array())))).toMatch(/empty/)
    expect(await problem(() => tableFromFile(fileOf('photo.png', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 13]))))).toMatch(/not a table/)
    expect(await problem(() => tableFromFile(fileOf('old.xls', new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 1, 2, 3]))))).toMatch(/old Excel format/)
    expect(await problem(() => tableFromFile({ name: 'huge.csv', size: MAX_TABLE_FILE + 1, arrayBuffer: async () => new ArrayBuffer(0) }))).toMatch(/larger than 20 MB/)
    expect(await problem(() => tableFromFile(fileOf('fake.xlsx', bytesOf('PK not really a workbook'))))).toMatch(/not an Excel workbook/)
  })
})

describe('Excel workbooks', () => {
  it('reads a real file: compressed, starting away from the corner, with a gap, a text and a second sheet', async () => {
    const bytes = Uint8Array.from(atob(realWorkbook.base64), (ch) => ch.charCodeAt(0))
    const table = await tableFromFile(fileOf('table.xlsx', bytes))
    expect(table.text).toBe('Control\tTreated\tRescue µM\n4.1\t6.9\t5\n3.8\t\t4.7\n4.6\t6.1\tn.d.\n4.3\t7.8\t')
    expect(table.note).toBe('Read the first of 2 sheets, “Viability”.')
    const report = readTable(table.text)
    expect(report.groups).toEqual([
      { name: 'Control', values: [4.1, 3.8, 4.6, 4.3] },
      { name: 'Treated', values: [6.9, 6.1, 7.8], rows: [0, 2, 3] },
      { name: 'Rescue µM', values: [5, 4.7] },
    ])
    expect(report.unread).toBe(1)
  })

  it('reads texts from the shared list, numbers as stored, and cells by their place', async () => {
    const sheet =
      '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="D1" t="inlineStr"><is><t>Own</t></is></c></row>' +
      '<row r="2"><c r="A2"><v>4.0999999999999996</v></c><c r="B2" t="n"><v>1E-3</v></c><c r="D2" t="str"><f>A2</f><v>text result</v></c></row>' +
      '<row r="4"><c r="B4"><f>SUM(B2)</f><v>7</v></c><c r="C4" t="b"><v>1</v></c><c r="D4" t="e"><v>#DIV/0!</v></c></row>'
    const table = await xlsxToTable(workbook(sheet, ['<t>Control</t>', '<r><t>Trea</t></r><r><t>ted</t></r><rPh><t>phonetic</t></rPh>']))
    expect(table.text).toBe('Control\tTreated\t\tOwn\n4.1\t0.001\t\ttext result\n\t\t\t\n\t7\tTRUE\t')
    expect(table.note).toBeUndefined()
  })

  it('reads a sheet without cell addresses, and tabs or line breaks inside a cell as spaces', async () => {
    const table = await xlsxToTable(workbook('<row><c t="inlineStr"><is><t>A\tname\nhere</t></is></c><c><v>2</v></c></row><row><c><v>1</v></c><c><v>3</v></c></row>'))
    expect(table.text).toBe('A name here\t2\n1\t3')
  })

  it('finds its way by the list of files, whatever precedes it', () => {
    const zip = workbook('<row><c><v>1</v></c></row>')
    const parts = zipParts(zip)
    expect([...parts.keys()]).toEqual(['xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/sharedStrings.xml', 'xl/worksheets/data1.xml'])
    const part = parts.get('xl/workbook.xml')!
    expect(new TextDecoder().decode(zip.subarray(part.start, part.start + part.packed))).toMatch(/^<workbook/)
    expect(columnIndex('A1')).toBe(0)
    expect(columnIndex('Z9')).toBe(25)
    expect(columnIndex('AA10')).toBe(26)
    expect(columnIndex('xfd1')).toBe(16383)
  })

  it('says in words what it cannot read', async () => {
    expect(await problem(() => xlsxToTable(bytesOf('PK\u0003\u0004 nothing here')))).toMatch(/not an Excel workbook/)
    // A ZIP that is not a workbook (a .docx, an .ods).
    expect(await problem(() => xlsxToTable(zipStore([{ name: 'word/document.xml', data: bytesOf('<w/>') }])))).toMatch(/not an Excel workbook/)
    expect(await problem(() => xlsxToTable(workbook('')))).toMatch(/is empty/)
    expect(await problem(() => xlsxToTable(workbook('', [], ['Data', 'More'])))).toMatch(/“Data”\) is empty/)
    // A compressed part that is not valid data.
    const broken = workbook('<row><c><v>1</v></c></row>')
    const view = new DataView(broken.buffer)
    for (let i = 0; i < broken.length - 4; i++) {
      if (view.getUint32(i, true) === 0x02014b50) view.setUint16(i + 10, 8, true)
    }
    expect(await problem(() => xlsxToTable(broken))).toMatch(/damaged|cannot open/)
  })

  it('does not run or fetch anything a workbook asks for', async () => {
    const evil = workbook('<row><c t="inlineStr"><is><t>&lt;script&gt;alert(1)&lt;/script&gt;</t></is></c><c><v>2</v></c></row><row><c><v>1</v></c><c><v>3</v></c></row>')
    const table = await xlsxToTable(evil)
    // The words arrive as words, and a chart name is drawn as text.
    expect(parseTable(table.text)[0].name).toBe('<script>alert(1)</script>')
  })
})

describe('rows of cells as a table', () => {
  it('drops the empty rows and columns around the table, and keeps those inside it', () => {
    expect(gridToText([['', '', ''], ['', 'A', 'B', ''], ['', '1', '2', ''], ['', '', ''], ['', '3', ''], []])).toBe('A\tB\n1\t2\n\t\n3\t')
    expect(gridToText([[], ['']])).toBe('')
  })
})
