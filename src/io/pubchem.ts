// Looking up a compound in PubChem by its name: molecular weight, formula and structure (SMILES).
// PubChem (NCBI) lets any web page read its REST service, and the properties it computes are
// public domain. Only the name the scientist typed is sent, and only when they press "Look up":
// no cookies, no address of this page.

export interface Compound {
  /** PubChem's compound identifier. */
  cid: number
  /** PubChem's usual name for it. */
  title: string
  formula: string
  /** Molecular weight in g/mol. */
  mw: number
  /** The structure, with stereochemistry where PubChem has it. */
  smiles: string
}

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>

const BASE = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/'
const PROPS = 'MolecularWeight,MolecularFormula,Title,SMILES'
/** An answer for one compound is about 1 kB; anything near this is not what was asked for. */
const MAX_ANSWER = 200_000
const MAX_NAME = 200

/** The address of the lookup for a name: the name is the only thing in it, encoded as part of the path. */
export function pubchemUrl(name: string): string {
  return `${BASE}${encodeURIComponent(name.trim())}/property/${PROPS}/JSON`
}

/** The text of an answer, refused before it is read when it says it is larger than `max`, and after when it is. */
async function limitedText(response: Response, max: number, tooLarge: string): Promise<string> {
  const declared = Number(response.headers?.get?.('content-length'))
  if (Number.isFinite(declared) && declared > max) throw new Error(tooLarge)
  const body = await response.text()
  if (body.length > max) throw new Error(tooLarge)
  return body
}

/** Read PubChem's answer, keeping the first compound, every field checked. Throws when it holds none. */
export function readCompound(data: unknown): Compound {
  const props = (data as { PropertyTable?: { Properties?: unknown } } | null)?.PropertyTable?.Properties
  const first = Array.isArray(props) ? (props[0] as Record<string, unknown> | undefined) : undefined
  const cid = Number(first?.CID)
  const mw = Number(first?.MolecularWeight)
  const text = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')
  const formula = text(first?.MolecularFormula, 200)
  const smiles = text(first?.SMILES, 5000)
  if (!Number.isInteger(cid) || cid <= 0 || !Number.isFinite(mw) || mw <= 0 || !/^[A-Za-z0-9+\-.()[\]]+$/.test(formula)) throw new Error('PubChem’s answer could not be read.')
  return { cid, title: text(first?.Title, 200) || formula, formula, mw, smiles: /^[\x21-\x7e]+$/.test(smiles) ? smiles : '' }
}

/** Look a compound up by name (glucose, Tris, ATP, a CAS number also works). */
export async function lookupCompound(name: string, fetcher: Fetcher = fetch): Promise<Compound> {
  const clean = name.trim()
  if (!clean) throw new Error('Type the name of a compound.')
  if (clean.length > MAX_NAME) throw new Error('This name is too long to look up.')
  // A name of dots only would be read by the browser as a step up the address, not as a name.
  if (/^\.+$/.test(clean)) throw new Error(`PubChem has no compound called “${clean}”. Try another name, or type the formula.`)
  let response: Response
  try {
    response = await fetcher(pubchemUrl(clean), { credentials: 'omit', referrerPolicy: 'no-referrer' })
  } catch {
    throw new Error('PubChem could not be reached. Check the connection, or type the formula instead.')
  }
  if (response.status === 404) throw new Error(`PubChem has no compound called “${clean}”. Try another name, or type the formula.`)
  if (!response.ok) throw new Error('PubChem could not be reached. Try again in a moment, or type the formula instead.')
  const body = await limitedText(response, MAX_ANSWER, 'PubChem’s answer is too large to read.')
  let data: unknown
  try {
    data = JSON.parse(body)
  } catch {
    throw new Error('PubChem’s answer could not be read.')
  }
  return readCompound(data)
}

const ROOT = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/'
/** A 2D record is a few kilobytes; the drawing refuses more than 500 atoms anyway. */
const MAX_RECORD = 1_000_000

/** The address of a compound's 2D structure (an SDF record with flat coordinates), by its PubChem number. */
export function structureUrl(cid: number): string {
  if (!Number.isInteger(cid) || cid <= 0) throw new Error('This is not a PubChem compound number.')
  return `${ROOT}cid/${cid}/SDF?record_type=2d`
}

/** Fetch the 2D structure record of a compound, as text (read it with `readMolfile`). */
export async function fetchStructureRecord(cid: number, fetcher: Fetcher = fetch): Promise<string> {
  let response: Response
  try {
    response = await fetcher(structureUrl(cid), { credentials: 'omit', referrerPolicy: 'no-referrer' })
  } catch {
    throw new Error('PubChem could not be reached. Check the connection, or try again in a moment.')
  }
  if (response.status === 404) throw new Error('PubChem has no flat drawing of this compound.')
  if (!response.ok) throw new Error('PubChem could not be reached. Try again in a moment.')
  const body = await limitedText(response, MAX_RECORD, 'This compound is too large to draw.')
  return body
}

/** Could this be a SMILES string rather than a name? One word of the characters SMILES uses. */
export const maybeSmiles = (text: string): boolean => /^[A-Za-z0-9@+\-[\]()=#$%/\\.:*]{1,2000}$/.test(text.trim())

/**
 * Look a compound up by its SMILES. The SMILES is sent in the body of the request (it can hold
 * slashes, which a path cannot). PubChem answers only for compounds it holds.
 */
export async function lookupSmiles(smiles: string, fetcher: Fetcher = fetch): Promise<Compound> {
  const clean = smiles.trim()
  if (!maybeSmiles(clean)) throw new Error('This is not a SMILES string.')
  let response: Response
  try {
    response = await fetcher(`${ROOT}smiles/property/${PROPS}/JSON`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `smiles=${encodeURIComponent(clean)}`,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    })
  } catch {
    throw new Error('PubChem could not be reached. Check the connection, or try again in a moment.')
  }
  if (!response.ok) throw new Error('PubChem does not know this compound, or the SMILES could not be read.')
  const body = await limitedText(response, MAX_ANSWER, 'PubChem’s answer is too large to read.')
  try {
    return readCompound(JSON.parse(body))
  } catch {
    throw new Error('PubChem does not hold this compound, so it cannot be drawn from its SMILES.')
  }
}

/** A name, or failing that a SMILES string: the compound PubChem finds for it. */
export async function findCompound(text: string, fetcher: Fetcher = fetch): Promise<Compound & { asked?: string }> {
  try {
    return { ...(await lookupCompound(text, fetcher)), asked: text.replace(/\s+/g, ' ').trim().slice(0, 60) }
  } catch (error) {
    if (maybeSmiles(text) && /has no compound called/.test(error instanceof Error ? error.message : '')) return lookupSmiles(text, fetcher)
    throw error
  }
}

/**
 * The name a drawn compound is given: the name the scientist typed when PubChem found it by that
 * name ("ATP", where PubChem's own title is "5'-Atp"), PubChem's title when it was found by its
 * SMILES or when the two differ only in capitals.
 */
export function compoundName(c: Compound & { asked?: string }): string {
  const asked = c.asked?.trim()
  return asked && asked.toLowerCase() !== c.title.toLowerCase() ? asked : c.title
}
