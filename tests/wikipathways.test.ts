import { beforeEach, describe, expect, it } from 'vitest'
import { fetchGpml, forgetPathwayList, gpmlUrl, loadPathwayList, pathwayPage, readPathwayList, searchPathways, speciesOf, WIKIPATHWAYS_LIST } from '../src/io/wikipathways'

const row = (id: string, name: string, species: string, datanodes = '', extra: Record<string, unknown> = {}) => ({
  id,
  url: `https://www.wikipathways.org/instance/${id}`,
  name,
  species,
  revision: '2025-07-09',
  authors: 'Someone',
  description: '',
  datanodes,
  annotations: '',
  citedIn: '',
  ...extra,
})

const ANSWER = {
  pathwayInfo: [
    row('WP554', 'ACE inhibitor pathway', 'Homo sapiens', 'ACE, ACE2, AGT, REN, Angiotensin II', { description: 'Conversion of angiotensinogen by renin.', annotations: 'hypertension, renin-angiotensin system' }),
    row('WP179', 'Cell cycle', 'Homo sapiens', 'TP53, CDK1, CDK2, AKT1S1'),
    row('WP413', 'G1 to S cell cycle control', 'Mus musculus', 'Trp53, Cdk2'),
    row('WP4172', 'PI3K-Akt signaling', 'Homo sapiens', 'AKT1, PIK3CA, TP53', { description: 'Regulates the cell cycle and survival.' }),
    row('WP1', 'Statin pathway', 'Mus musculus', 'Hmgcr, Ldlr, Cholesterol'),
  ],
}

describe('the list of pathways', () => {
  it('is rebuilt field by field', () => {
    const list = readPathwayList(ANSWER)
    expect(list).toHaveLength(5)
    expect(list[0]).toEqual({
      id: 'WP554',
      name: 'ACE inhibitor pathway',
      species: 'Homo sapiens',
      description: 'Conversion of angiotensinogen by renin.',
      molecules: ['ACE', 'ACE2', 'AGT', 'REN', 'Angiotensin II'],
      terms: 'hypertension, renin-angiotensin system',
      revision: '2025-07-09',
    })
  })

  it('drops rows without a proper identifier or name, and doubles', () => {
    const list = readPathwayList({
      pathwayInfo: [row('WP7', 'Good', 'Homo sapiens'), row('WP7', 'Again', 'Homo sapiens'), row('../../evil', 'Bad', 'x'), row('WP8', '', 'x'), null, 'text', { id: 7 }],
    })
    expect(list.map((p) => p.id)).toEqual(['WP7'])
  })

  it('refuses an answer that is not the list', () => {
    expect(() => readPathwayList(null)).toThrow(/could not be read/)
    expect(() => readPathwayList({ pathwayInfo: 'no' })).toThrow(/could not be read/)
    expect(() => readPathwayList({ pathwayInfo: [] })).toThrow(/could not be read/)
  })

  it('lists the species, the one with most pathways first', () => {
    expect(speciesOf(readPathwayList(ANSWER))).toEqual(['Homo sapiens', 'Mus musculus'])
  })

  it('builds web addresses from the identifier only', () => {
    expect(gpmlUrl('WP554')).toBe('https://www.wikipathways.org/wikipathways-assets/pathways/WP554/WP554.gpml')
    expect(pathwayPage('WP554')).toBe('https://www.wikipathways.org/instance/WP554')
  })
})

describe('searching the list', () => {
  const list = readPathwayList(ANSWER)
  const ids = (query: string, species = ''): string[] => searchPathways(list, query, species).map((p) => p.id)

  it('finds a pathway by words of its name, the name counting most', () => {
    // "Cell cycle" is in two names and one description.
    expect(ids('cell cycle')).toEqual(['WP179', 'WP413', 'WP4172'])
    expect(ids('statin')).toEqual(['WP1'])
  })

  it('finds pathways by a gene on them, by its whole name', () => {
    expect(ids('tp53')).toEqual(['WP179', 'WP4172'])
    // AKT1S1 is another gene.
    expect(ids('AKT1')).toEqual(['WP4172'])
  })

  it('finds a pathway by its identifier, a term or its description', () => {
    expect(ids('wp554')).toEqual(['WP554'])
    expect(ids('hypertension')).toEqual(['WP554'])
    expect(ids('angiotensinogen')).toEqual(['WP554'])
  })

  it('wants every word to match', () => {
    expect(ids('cell cycle tp53')).toEqual(['WP179', 'WP4172'])
    expect(ids('cell cycle banana')).toEqual([])
  })

  it('keeps to one species when asked', () => {
    expect(ids('cell cycle', 'Mus musculus')).toEqual(['WP413'])
    expect(ids('', 'Mus musculus')).toEqual(['WP413', 'WP1'])
  })

  it('lists everything by name without words, human pathways first', () => {
    expect(ids('')).toEqual(['WP554', 'WP179', 'WP4172', 'WP413', 'WP1'])
  })
})

describe('asking WikiPathways', () => {
  beforeEach(forgetPathwayList)

  const answer = (body: string, status = 200, headers: Record<string, string> = {}) => new Response(body, { status, headers })

  it('fetches the list once and sends nothing about the scientist', async () => {
    const calls: { url: string; init?: RequestInit }[] = []
    const fetcher = async (url: string, init?: RequestInit) => {
      calls.push({ url, init })
      return answer(JSON.stringify(ANSWER))
    }
    const first = await loadPathwayList(fetcher)
    const second = await loadPathwayList(fetcher)
    expect(first).toHaveLength(5)
    expect(second).toBe(first)
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe(WIKIPATHWAYS_LIST)
    expect(calls[0].init).toEqual({ credentials: 'omit', referrerPolicy: 'no-referrer' })
  })

  it('can be asked again after a failure', async () => {
    await expect(loadPathwayList(async () => Promise.reject(new TypeError('offline')))).rejects.toThrow(/could not be reached/)
    await expect(loadPathwayList(async () => answer('<html>', 200))).rejects.toThrow(/could not be read/)
    await expect(loadPathwayList(async () => answer(JSON.stringify(ANSWER)))).resolves.toHaveLength(5)
  })

  it('fetches the file of a pathway', async () => {
    let asked = ''
    const body = await fetchGpml('WP554', async (url) => {
      asked = url
      return answer('<Pathway/>')
    })
    expect(asked).toBe('https://www.wikipathways.org/wikipathways-assets/pathways/WP554/WP554.gpml')
    expect(body).toBe('<Pathway/>')
  })

  it('never asks for anything but a pathway identifier', async () => {
    let asked = false
    const fetcher = async () => {
      asked = true
      return answer('')
    }
    await expect(fetchGpml('WP554/../../x', fetcher)).rejects.toThrow(/not a WikiPathways identifier/)
    await expect(fetchGpml('https://example.org/x.gpml', fetcher)).rejects.toThrow(/not a WikiPathways identifier/)
    expect(asked).toBe(false)
  })

  it('says what went wrong', async () => {
    await expect(fetchGpml('WP1', async () => answer('gone', 404))).rejects.toThrow(/has no file for this pathway/)
    await expect(fetchGpml('WP1', async () => answer('busy', 503))).rejects.toThrow(/could not be reached/)
    await expect(fetchGpml('WP1', async () => answer('x', 200, { 'content-length': String(50 * 1024 * 1024) }))).rejects.toThrow(/too large/)
  })
})
