// Chemical structures: reading a molfile (the 2D structure PubChem gives) and drawing it as a
// skeletal formula in plain SVG. No chemistry library: the file format is a few fixed columns, the
// hydrogens follow from the usual valences, and the drawing is lines, triangles and text.
// A structure file comes from the network and is untrusted: every field is checked, sizes are
// limited, and the drawing is made only of element symbols and numbers this file writes itself.

export interface MolAtom {
  /** Element symbol, as in the periodic table ("C", "Cl"). */
  element: string
  x: number
  /** As in the file: y goes up. */
  y: number
  /** Formal charge. */
  charge: number
}

export interface MolBond {
  /** Indices into `atoms`, from 0. */
  from: number
  to: number
  /** 1, 2, 3, or 4 for aromatic. */
  order: 1 | 2 | 3 | 4
  /** 1 a wedge (towards the viewer), 6 a hash (away); the narrow end is at `from`. 0 none. */
  stereo: 0 | 1 | 6
}

export interface Molecule {
  /** The first line of the file (PubChem writes the compound's number there). */
  title: string
  atoms: MolAtom[]
  bonds: MolBond[]
}

export const MAX_ATOMS = 500
export const MAX_BONDS = 600
/** A molfile of 500 atoms is about 50 kB; PubChem's SDF adds a few kB of data fields. */
const MAX_TEXT = 1_000_000

// prettier-ignore
const ELEMENTS = new Set(('H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr ' +
  'Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg ' +
  'Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og').split(' '))

/** Is this the symbol of an element ("C", "Cl"), written as the periodic table writes it? */
export const isElement = (symbol: string): boolean => ELEMENTS.has(symbol)

const fail = (why: string): never => {
  throw new Error(`The structure file could not be read: ${why}`)
}

/** A whole number written in the columns [a, b) of a line; blank counts as 0. */
function intField(line: string, a: number, b: number, what: string): number {
  const s = line.slice(a, b).trim()
  if (s === '') return 0
  if (!/^[+-]?\d+$/.test(s)) fail(`${what} is not a whole number (“${s.slice(0, 20)}”).`)
  return Number(s)
}

function numField(line: string, a: number, b: number, what: string): number {
  const s = line.slice(a, b).trim()
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)) fail(`${what} is not a number (“${s.slice(0, 20)}”).`)
  const n = Number(s)
  if (!Number.isFinite(n) || Math.abs(n) > 1e4) fail(`${what} is out of range.`)
  return n
}

/** The charge codes of the atom block: 1 is +3, 2 is +2, 3 is +1, 4 a radical, 5 is −1, 6 is −2, 7 is −3. */
const CHARGE_CODES = [0, 3, 2, 1, 0, -1, -2, -3]

/**
 * Read an MDL molfile, or the first record of an SDF file (version V2000). Atoms keep their place,
 * element and formal charge; bonds their two atoms, order and wedge or hash. Throws an error with a
 * message for people when the text is not such a file, is in the V3000 form, or is too large.
 */
export function readMolfile(text: string): Molecule {
  if (typeof text !== 'string' || text.trim() === '') fail('the file is empty.')
  if (text.length > MAX_TEXT) fail('the file is too large for one structure.')
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const counts = lines[3]
  if (counts === undefined) fail('it is too short to hold a structure.')
  if (/V3000/.test(counts)) fail('it is in the newer V3000 form, which BioSketch does not read. Save it as V2000 (the usual molfile) and try again.')
  const version = counts.slice(34, 39).trim()
  if (version !== '' && version !== 'V2000') fail('the fourth line does not say how many atoms and bonds there are.')
  const nAtoms = intField(counts, 0, 3, 'the number of atoms')
  const nBonds = intField(counts, 3, 6, 'the number of bonds')
  if (nAtoms < 0 || nBonds < 0) fail('the fourth line does not say how many atoms and bonds there are.')
  if (nAtoms > MAX_ATOMS) fail(`it has ${nAtoms} atoms; BioSketch draws at most ${MAX_ATOMS}.`)
  if (nBonds > MAX_BONDS) fail(`it has ${nBonds} bonds; BioSketch draws at most ${MAX_BONDS}.`)
  if (nAtoms === 0) fail('it holds no atoms.')

  const atoms: MolAtom[] = []
  for (let i = 0; i < nAtoms; i++) {
    const line = lines[4 + i]
    const where = `atom ${i + 1}`
    if (line === undefined || line.length < 34) fail(`${where} is missing.`)
    const x = numField(line, 0, 10, `the x of ${where}`)
    const y = numField(line, 10, 20, `the y of ${where}`)
    numField(line, 20, 30, `the z of ${where}`)
    const element = line.slice(31, 34).trim()
    if (!ELEMENTS.has(element)) fail(`${where} is “${element.slice(0, 3)}”, which is not an element.`)
    const code = intField(line, 36, 39, `the charge of ${where}`)
    if (code < 0 || code > 7) fail(`the charge of ${where} is not one the format knows.`)
    atoms.push({ element, x, y, charge: CHARGE_CODES[code] })
  }

  const bonds: MolBond[] = []
  const seen = new Set<string>()
  for (let i = 0; i < nBonds; i++) {
    const line = lines[4 + nAtoms + i]
    const where = `bond ${i + 1}`
    if (line === undefined || line.length < 9) fail(`${where} is missing.`)
    const from = intField(line, 0, 3, `the first atom of ${where}`) - 1
    const to = intField(line, 3, 6, `the second atom of ${where}`) - 1
    const type = intField(line, 6, 9, `the type of ${where}`)
    const st = intField(line, 9, 12, `the stereo mark of ${where}`)
    if (from < 0 || from >= nAtoms || to < 0 || to >= nAtoms || from === to) fail(`${where} joins atoms that are not there.`)
    if (type < 1 || type > 4) fail(`${where} is of a kind BioSketch does not draw (only single, double, triple and aromatic bonds).`)
    const key = from < to ? `${from} ${to}` : `${to} ${from}`
    if (seen.has(key)) fail(`${where} joins two atoms that are already joined.`)
    seen.add(key)
    const stereo = type === 1 && (st === 1 || st === 6) ? st : 0
    bonds.push({ from, to, order: type as 1 | 2 | 3 | 4, stereo })
  }

  // The properties block. A charge line resets every charge of the atom block (the format's own rule).
  let ended = false
  let chargesReset = false
  for (let i = 4 + nAtoms + nBonds; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('M  END')) {
      ended = true
      break
    }
    if (line.startsWith('$$$$')) break
    if (!line.startsWith('M  CHG')) continue
    const parts = line.slice(6).trim().split(/\s+/)
    const n = Number(parts[0])
    if (!Number.isInteger(n) || n < 1 || n > 8 || parts.length !== 1 + 2 * n) fail('a line of charges cannot be read.')
    if (!chargesReset) {
      for (const a of atoms) a.charge = 0
      chargesReset = true
    }
    for (let k = 0; k < n; k++) {
      const atom = Number(parts[1 + 2 * k])
      const charge = Number(parts[2 + 2 * k])
      if (!Number.isInteger(atom) || atom < 1 || atom > nAtoms) fail('a line of charges names an atom that is not there.')
      if (!Number.isInteger(charge) || Math.abs(charge) > 15) fail('a line of charges holds a charge that cannot be.')
      atoms[atom - 1].charge = charge
    }
  }
  if (!ended) fail('it does not end the way a molfile ends (“M  END”).')
  const title = lines[0].replace(/[^\x20-\x7e]/g, '').trim().slice(0, 80)
  return { title, atoms, bonds }
}

// ---------------------------------------------------------------------------------------------
// Hydrogens and formula

/** The usual valences of the elements that are drawn with their hydrogens. */
const VALENCES: Record<string, number[]> = {
  B: [3], C: [4], Si: [4], N: [3], P: [3, 5], As: [3, 5], O: [2], S: [2, 4, 6], Se: [2, 4, 6],
  F: [1], Cl: [1], Br: [1], I: [1],
}

/** Valences after the formal charge: C⁻ and C⁺ have three bonds, N⁺ four, O⁻ one, B⁻ four. */
function chargedValences(element: string, charge: number): number[] {
  const base = VALENCES[element]
  if (!base) return []
  const shift = element === 'C' || element === 'Si' ? -Math.abs(charge) : element === 'B' ? -charge : charge
  return base.map((v) => v + shift).filter((v) => v >= 0)
}

const neighboursOf = (m: Molecule): number[][] => {
  const adj: number[][] = m.atoms.map(() => [])
  for (const b of m.bonds) {
    adj[b.from].push(b.to)
    adj[b.to].push(b.from)
  }
  return adj
}

/**
 * Hydrogens attached to each atom: the hydrogen atoms bonded to it in the file, plus those implied
 * by its valence. 0 for hydrogen atoms themselves and for elements outside the usual organic set.
 */
export function attachedHydrogens(m: Molecule): number[] {
  const used = m.atoms.map(() => 0)
  const explicit = m.atoms.map(() => 0)
  for (const b of m.bonds) {
    const order = b.order === 4 ? 1.5 : b.order
    used[b.from] += order
    used[b.to] += order
    if (m.atoms[b.to].element === 'H' && m.atoms[b.from].element !== 'H') explicit[b.from]++
    if (m.atoms[b.from].element === 'H' && m.atoms[b.to].element !== 'H') explicit[b.to]++
  }
  return m.atoms.map((a, i) => {
    if (a.element === 'H') return 0
    const u = Math.ceil(used[i] - 1e-9)
    const v = chargedValences(a.element, a.charge).find((x) => x >= u)
    return explicit[i] + (v === undefined ? 0 : v - u)
  })
}

/** The molecular formula in Hill order (carbon, hydrogen, then the rest alphabetically), with the net charge as PubChem writes it. */
export function molecularFormula(m: Molecule): string {
  const count = new Map<string, number>()
  const add = (el: string, n: number) => n > 0 && count.set(el, (count.get(el) ?? 0) + n)
  const hs = attachedHydrogens(m)
  const adj = neighboursOf(m)
  m.atoms.forEach((a, i) => {
    // An explicit hydrogen bonded to another atom is counted through that atom; a lone one (H⁺, H₂) by itself.
    if (a.element === 'H') add('H', adj[i].some((j) => m.atoms[j].element !== 'H') ? 0 : 1)
    else add(a.element, 1)
  })
  m.atoms.forEach((_, i) => add('H', hs[i]))
  const els = [...count.keys()].sort()
  const order = count.has('C') ? ['C', ...(count.has('H') ? ['H'] : []), ...els.filter((e) => e !== 'C' && e !== 'H')] : els
  const net = m.atoms.reduce((s, a) => s + a.charge, 0)
  const charge = net === 0 ? '' : `${net > 0 ? '+' : '-'}${Math.abs(net) === 1 ? '' : Math.abs(net)}`
  return order.map((e) => e + (count.get(e) === 1 ? '' : count.get(e))).join('') + charge
}

// ---------------------------------------------------------------------------------------------
// Rings

/**
 * The rings of a structure, each as the atoms around it in order: for every bond, the shortest
 * cycle through it (a breadth-first search between its two atoms without the bond itself). For the
 * drawing of double bonds this is enough; it is not a full smallest set of smallest rings.
 */
export function findRings(m: Molecule, keep: (atom: number) => boolean = () => true): number[][] {
  const adj = m.atoms.map(() => [] as number[])
  for (const b of m.bonds) {
    if (!keep(b.from) || !keep(b.to)) continue
    adj[b.from].push(b.to)
    adj[b.to].push(b.from)
  }
  const rings: number[][] = []
  const known = new Set<string>()
  for (const b of m.bonds) {
    if (!keep(b.from) || !keep(b.to)) continue
    const prev = new Map<number, number>([[b.from, -1]])
    const queue = [b.from]
    for (let q = 0; q < queue.length && !prev.has(b.to); q++) {
      const a = queue[q]
      for (const n of adj[a]) {
        if (prev.has(n) || (a === b.from && n === b.to)) continue
        prev.set(n, a)
        queue.push(n)
      }
    }
    if (!prev.has(b.to)) continue
    const ring: number[] = []
    for (let a = b.to; a !== -1; a = prev.get(a)!) ring.push(a)
    const key = [...ring].sort((p, q) => p - q).join(' ')
    if (known.has(key)) continue
    known.add(key)
    rings.push(ring)
  }
  return rings
}

// ---------------------------------------------------------------------------------------------
// Drawing

export interface MoleculeSvgOptions {
  /** Colour heteroatoms by element (default true). */
  colour?: boolean
  /** Length of a bond in drawing units (default 30). */
  bond?: number
}

export interface MoleculeSvg {
  /** Width and height; the view box starts at 0, 0. */
  viewBox: [number, number]
  /** Markup for the inside of an `<svg>` element. */
  body: string
  formula: string
  /** Where atom i stands in the drawing: (x · scale + dx, −y · scale + dy). */
  place: { scale: number; dx: number; dy: number }
}

const DARK = '#1f2933'
const ELEMENT_COLOURS: Record<string, string> = {
  O: '#e0301e', N: '#2c5fd4', S: '#c8a000', P: '#e07b00', F: '#2f9e44', Cl: '#2f9e44', Br: '#2f9e44', I: '#2f9e44',
}
const FONT = 'Helvetica, Arial, sans-serif'
const FONT_SIZE = 13
const SMALL = 9
const STROKE = 1.6
const MARGIN = 6

/** Advance widths of Helvetica, in thousandths of the font size (from its published metrics). */
// prettier-ignore
const WIDTHS: Record<string, number> = {
  A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, K: 667, L: 556, M: 833, N: 722, O: 778,
  P: 667, R: 722, S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222, l: 222, m: 833, n: 556, o: 556, r: 333, s: 500, t: 278, u: 556,
  '+': 584, '−': 584,
}
const textWidth = (s: string, size: number) => [...s].reduce((w, ch) => w + (WIDTHS[ch] ?? (/\d/.test(ch) ? 556 : 600)), 0) * size / 1000
/** Height of a capital letter, as a share of the font size. */
const CAP = 0.72

interface Piece { text: string; shift: 0 | 1 | -1 }
interface Box { x0: number; y0: number; x1: number; y1: number }
interface Label { symbol: string; left: Piece[]; right: Piece[]; above: Piece[]; below: Piece[]; colour: string; box: Box }

const piecesWidth = (ps: Piece[]) => ps.reduce((w, p) => w + textWidth(p.text, p.shift ? SMALL : FONT_SIZE), 0)
const chargeText = (c: number) => (c === 0 ? '' : `${Math.abs(c) === 1 ? '' : Math.abs(c)}${c > 0 ? '+' : '−'}`)
const hPieces = (n: number): Piece[] => (n <= 0 ? [] : n === 1 ? [{ text: 'H', shift: 0 }] : [{ text: 'H', shift: 0 }, { text: String(n), shift: -1 }])

const r2 = (n: number): string => {
  const v = Math.round(n * 100) / 100
  return String(Object.is(v, -0) ? 0 : v)
}
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

type Prim =
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; width: number }
  | { kind: 'poly'; pts: [number, number][] }
  | { kind: 'text'; x: number; y: number; anchor: 'start' | 'middle' | 'end'; pieces: Piece[]; colour: string; box: Box }

/** Where a segment from p (inside the box) to q leaves the box, as a share of the way. */
function exitShare(px: number, py: number, qx: number, qy: number, b: Box): number {
  if (px < b.x0 || px > b.x1 || py < b.y0 || py > b.y1) return 0
  const dx = qx - px
  const dy = qy - py
  let t = 1
  if (dx > 1e-9) t = Math.min(t, (b.x1 - px) / dx)
  if (dx < -1e-9) t = Math.min(t, (b.x0 - px) / dx)
  if (dy > 1e-9) t = Math.min(t, (b.y1 - py) / dy)
  if (dy < -1e-9) t = Math.min(t, (b.y0 - py) / dy)
  return Math.max(0, t)
}

/**
 * A skeletal formula of the structure as SVG markup: carbons are corners, other atoms their symbol
 * with their hydrogens and charge, double bonds drawn inside their ring, wedges and hashes where the
 * file marks them. Only plain elements (line, polygon, text, tspan, g) with numbers rounded to two
 * decimals; no ids, styles, scripts or links.
 */
export function moleculeSvg(m: Molecule, opts: MoleculeSvgOptions = {}): MoleculeSvg {
  const colourOn = opts.colour ?? true
  const bondLen = opts.bond !== undefined && Number.isFinite(opts.bond) && opts.bond > 0 ? Math.min(opts.bond, 500) : 30
  const atoms = m.atoms
  const hs = attachedHydrogens(m)
  const adjAll = neighboursOf(m)

  // Hydrogens drawn as atoms of their own: on a wedge or hash, bonded to another hydrogen, or alone.
  const stereoAtoms = new Set<number>()
  for (const b of m.bonds) if (b.stereo) stereoAtoms.add(b.from).add(b.to)
  const drawn = atoms.map((a, i) => a.element !== 'H' || adjAll[i].length !== 1 || stereoAtoms.has(i) || atoms[adjAll[i][0]].element === 'H' || a.charge !== 0)
  const bonds = m.bonds.filter((b) => drawn[b.from] && drawn[b.to])
  const adj = atoms.map(() => [] as number[])
  for (const b of bonds) {
    adj[b.from].push(b.to)
    adj[b.to].push(b.from)
  }
  // Hydrogens written in a label: those not drawn as atoms of their own.
  const labelHs = hs.map((n, i) => n - adj[i].filter((j) => atoms[j].element === 'H').length)

  // Scale: the median bond between heavy atoms becomes `bondLen`; ions without bonds stand apart.
  const lengths = (heavy: boolean) => bonds
    .filter((b) => !heavy || (atoms[b.from].element !== 'H' && atoms[b.to].element !== 'H'))
    .map((b) => Math.hypot(atoms[b.from].x - atoms[b.to].x, atoms[b.from].y - atoms[b.to].y))
    .filter((l) => l > 1e-6)
    .sort((p, q) => p - q)
  let ls = lengths(true)
  if (!ls.length) ls = lengths(false)
  let scale: number
  if (ls.length) scale = bondLen / ls[Math.floor(ls.length / 2)]
  else {
    const near = atoms.map((a, i) => Math.min(...atoms.map((b, j) => (i === j ? Infinity : Math.hypot(a.x - b.x, a.y - b.y)))))
      .filter((d) => Number.isFinite(d) && d > 1e-6).sort((p, q) => p - q)
    scale = near.length ? (1.6 * bondLen) / near[Math.floor(near.length / 2)] : 1
  }
  const P = atoms.map((a) => ({ x: a.x * scale, y: -a.y * scale }))

  // Labels.
  const labels: (Label | null)[] = atoms.map((a, i) => {
    if (!drawn[i]) return null
    if (a.element === 'C' && adj[i].length > 0 && a.charge === 0) return null
    const nH = a.element === 'H' ? 0 : labelHs[i]
    const colour = colourOn ? ELEMENT_COLOURS[a.element] ?? DARK : DARK
    const charge = chargeText(a.charge)
    const sym = a.element
    const symW = textWidth(sym, FONT_SIZE)
    // Where the hydrogens go: the first free side of right, left, below, above.
    let side: 'right' | 'left' | 'below' | 'above' = 'right'
    if (nH > 0) {
      const dirs = adj[i].map((j) => {
        const dx = P[j].x - P[i].x
        const dy = P[j].y - P[i].y
        const l = Math.hypot(dx, dy) || 1
        return [dx / l, dy / l]
      })
      if (!dirs.length) side = ['O', 'S', 'Se', 'F', 'Cl', 'Br', 'I'].includes(sym) ? 'left' : 'right'
      else {
        const sides = [['right', 1, 0], ['left', -1, 0], ['below', 0, 1], ['above', 0, -1]] as const
        const score = sides.map(([, sx, sy]) => Math.max(...dirs.map(([dx, dy]) => dx * sx + dy * sy)))
        const free = score.findIndex((s) => s < 0.4)
        side = sides[free >= 0 ? free : score.indexOf(Math.min(...score))][0]
      }
    }
    const H = hPieces(nH)
    const chargeP: Piece[] = charge ? [{ text: charge, shift: 1 }] : []
    const left = side === 'left' ? H : []
    const right = side === 'right' ? [...H, ...chargeP] : chargeP
    const above = side === 'above' ? H : []
    const below = side === 'below' ? H : []
    const cx = P[i].x
    const cy = P[i].y
    const half = (CAP * FONT_SIZE) / 2
    const pad = 2.2
    const box: Box = {
      x0: cx - symW / 2 - piecesWidth(left) - pad,
      x1: cx + symW / 2 + piecesWidth(right) + pad,
      y0: cy - half - (chargeP.length ? 3 : 0) - (above.length ? FONT_SIZE : 0) - pad,
      y1: cy + half + (H.length > 1 && side !== 'above' && side !== 'below' ? 3 : 0) + (below.length ? FONT_SIZE + 3 : 0) + pad,
    }
    return { symbol: sym, left, right, above, below, colour, box }
  })

  const prims: Prim[] = []
  const line = (x1: number, y1: number, x2: number, y2: number, width = STROKE) => {
    if (Math.hypot(x2 - x1, y2 - y1) > 0.3) prims.push({ kind: 'line', x1, y1, x2, y2, width })
  }
  /** The segment between two points, cut back where it runs into the label at either end. */
  const clipped = (a: number, b: number, ax: number, ay: number, bx: number, by: number, shrinkA = 0, shrinkB = 0) => {
    const la = labels[a]
    const lb = labels[b]
    const ta = Math.max(shrinkA, la ? exitShare(ax, ay, bx, by, la.box) : 0)
    const tb = Math.max(shrinkB, lb ? exitShare(bx, by, ax, ay, lb.box) : 0)
    if (ta + tb >= 1) return null
    return [ax + (bx - ax) * ta, ay + (by - ay) * ta, bx + (ax - bx) * tb, by + (ay - by) * tb] as const
  }

  const rings = findRings(m, (i) => drawn[i] && atoms[i].element !== 'H')
  const ringOf = (b: MolBond): number[] | null => {
    let best: number[] | null = null
    let bestDoubles = -1
    for (const ring of rings) {
      const k = ring.indexOf(b.from)
      if (k < 0) continue
      const n = ring.length
      if (ring[(k + 1) % n] !== b.to && ring[(k + n - 1) % n] !== b.to) continue
      const doubles = ring.filter((a, j) => m.bonds.some((x) => x.order === 2 && ((x.from === a && x.to === ring[(j + 1) % n]) || (x.to === a && x.from === ring[(j + 1) % n])))).length
      if (doubles > bestDoubles || (doubles === bestDoubles && best && ring.length < best.length)) {
        best = ring
        bestDoubles = doubles
      }
    }
    return best
  }

  const gap = 0.17 * bondLen
  for (const b of bonds) {
    const a = P[b.from]
    const c = P[b.to]
    const len = Math.hypot(c.x - a.x, c.y - a.y)
    if (len < 1e-6) continue
    const nx = -(c.y - a.y) / len
    const ny = (c.x - a.x) / len
    const main = clipped(b.from, b.to, a.x, a.y, c.x, c.y)
    if (!main) continue
    const [x1, y1, x2, y2] = main
    const off = (d: number, shrink: number) => clipped(b.from, b.to, a.x + nx * d, a.y + ny * d, c.x + nx * d, c.y + ny * d, labels[b.from] ? 0 : shrink, labels[b.to] ? 0 : shrink)

    if (b.order === 1 && b.stereo) {
      const w = 0.2 * bondLen
      // The narrow end stays at the stereo centre, even when that atom is labelled.
      const [sx, sy] = [x1, y1]
      if (b.stereo === 1) {
        prims.push({ kind: 'poly', pts: [[sx, sy], [x2 + (nx * w) / 2, y2 + (ny * w) / 2], [x2 - (nx * w) / 2, y2 - (ny * w) / 2]] })
      } else {
        const l = Math.hypot(x2 - sx, y2 - sy)
        const n = Math.max(3, Math.round(l / 3.4))
        for (let k = 1; k <= n; k++) {
          const t = k / n
          const px = sx + (x2 - sx) * t
          const py = sy + (y2 - sy) * t
          const hw = Math.max(0.6, (w / 2) * t)
          line(px + nx * hw, py + ny * hw, px - nx * hw, py - ny * hw, 1.2)
        }
      }
      continue
    }
    if (b.order === 1) {
      line(x1, y1, x2, y2)
      continue
    }
    if (b.order === 3) {
      line(x1, y1, x2, y2)
      for (const d of [gap, -gap]) {
        const s = off(d, 0)
        if (s) line(...s)
      }
      continue
    }
    // Double (or aromatic, drawn as a line with a dashed one inside): which side the second line goes.
    let sideSign = 0
    const ring = ringOf(b)
    if (ring) {
      const cx = ring.reduce((s, i) => s + P[i].x, 0) / ring.length
      const cy = ring.reduce((s, i) => s + P[i].y, 0) / ring.length
      sideSign = Math.sign((cx - a.x) * nx + (cy - a.y) * ny) || 1
    } else if (adj[b.from].length > 1 && adj[b.to].length > 1) {
      let s = 0
      for (const [end, other] of [[b.from, b.to], [b.to, b.from]]) {
        for (const j of adj[end]) {
          if (j === other) continue
          s += Math.sign((P[j].x - a.x) * nx + (P[j].y - a.y) * ny)
        }
      }
      sideSign = Math.sign(s)
    }
    if (sideSign === 0) {
      // Centred pair, as for C=O.
      for (const d of [gap / 2, -gap / 2]) {
        const s = off(d, 0)
        if (s) line(...s)
      }
      continue
    }
    line(x1, y1, x2, y2)
    const s = off(sideSign * gap, 0.14)
    if (!s) continue
    if (b.order === 2) line(...s)
    else {
      const [p1, q1, p2, q2] = s
      const l = Math.hypot(p2 - p1, q2 - q1)
      const n = Math.max(2, Math.floor(l / 5))
      for (let k = 0; k < n; k++) {
        const t0 = k / n
        const t1 = (k + 0.55) / n
        line(p1 + (p2 - p1) * t0, q1 + (q2 - q1) * t0, p1 + (p2 - p1) * t1, q1 + (q2 - q1) * t1, 1.2)
      }
    }
  }

  // Lettering: the symbol centred on its atom, hydrogens and charge beside it.
  const base = (CAP * FONT_SIZE) / 2
  labels.forEach((l, i) => {
    if (!l) return
    const { x, y } = P[i]
    const symW = textWidth(l.symbol, FONT_SIZE)
    const box = (x0: number, x1: number, y0: number, y1: number): Box => ({ x0, x1, y0, y1 })
    prims.push({ kind: 'text', x, y: y + base, anchor: 'middle', pieces: [{ text: l.symbol, shift: 0 }], colour: l.colour, box: box(x - symW / 2, x + symW / 2, y - base, y + base) })
    if (l.right.length) {
      const w = piecesWidth(l.right)
      prims.push({ kind: 'text', x: x + symW / 2, y: y + base, anchor: 'start', pieces: l.right, colour: l.colour, box: box(x + symW / 2, x + symW / 2 + w, y - base - 4, y + base + 3) })
    }
    if (l.left.length) {
      const w = piecesWidth(l.left)
      prims.push({ kind: 'text', x: x - symW / 2, y: y + base, anchor: 'end', pieces: l.left, colour: l.colour, box: box(x - symW / 2 - w, x - symW / 2, y - base, y + base + 3) })
    }
    for (const [ps, dy] of [[l.above, -FONT_SIZE - 1], [l.below, FONT_SIZE + 1]] as const) {
      if (!ps.length) continue
      const w = piecesWidth(ps)
      prims.push({ kind: 'text', x, y: y + base + dy, anchor: 'middle', pieces: ps, colour: l.colour, box: box(x - w / 2, x + w / 2, y + dy - base, y + dy + base + 3) })
    }
  })

  // Bounds of everything drawn, then a margin; the view box starts at 0, 0.
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  const grow = (x: number, y: number, r = 0) => {
    x0 = Math.min(x0, x - r); y0 = Math.min(y0, y - r); x1 = Math.max(x1, x + r); y1 = Math.max(y1, y + r)
  }
  for (const p of prims) {
    if (p.kind === 'line') { grow(p.x1, p.y1, p.width / 2); grow(p.x2, p.y2, p.width / 2) }
    else if (p.kind === 'poly') p.pts.forEach(([x, y]) => grow(x, y))
    else { grow(p.box.x0, p.box.y0); grow(p.box.x1, p.box.y1) }
  }
  if (!Number.isFinite(x0)) { x0 = 0; y0 = 0; x1 = 0; y1 = 0 }
  const dx = MARGIN - x0
  const dy = MARGIN - y0
  const width = x1 - x0 + 2 * MARGIN
  const height = y1 - y0 + 2 * MARGIN

  const lines: string[] = []
  const thin: string[] = []
  const polys: string[] = []
  const texts: string[] = []
  for (const p of prims) {
    if (p.kind === 'line') {
      const el = `<line x1="${r2(p.x1 + dx)}" y1="${r2(p.y1 + dy)}" x2="${r2(p.x2 + dx)}" y2="${r2(p.y2 + dy)}"/>`
      ;(p.width === STROKE ? lines : thin).push(el)
    } else if (p.kind === 'poly') {
      polys.push(`<polygon points="${p.pts.map(([x, y]) => `${r2(x + dx)},${r2(y + dy)}`).join(' ')}"/>`)
    } else {
      let shift = 0
      const spans = p.pieces.map((pc) => {
        const target = pc.shift === -1 ? 3.5 : pc.shift === 1 ? -5 : 0
        const move = target - shift
        shift = target
        const attrs = (move ? ` dy="${r2(move)}"` : '') + (pc.shift ? ` font-size="${SMALL}"` : '')
        return attrs ? `<tspan${attrs}>${esc(pc.text)}</tspan>` : esc(pc.text)
      })
      const anchor = p.anchor === 'start' ? '' : ` text-anchor="${p.anchor}"`
      texts.push(`<text x="${r2(p.x + dx)}" y="${r2(p.y + dy)}"${anchor}${p.colour === DARK ? '' : ` fill="${p.colour}"`}>${spans.join('')}</text>`)
    }
  }
  const body = [
    lines.length ? `<g stroke="${DARK}" stroke-width="${STROKE}" stroke-linecap="round" fill="none">${lines.join('')}</g>` : '',
    thin.length ? `<g stroke="${DARK}" stroke-width="1.2" stroke-linecap="round" fill="none">${thin.join('')}</g>` : '',
    polys.length ? `<g fill="${DARK}" stroke="${DARK}" stroke-width="0.6" stroke-linejoin="round">${polys.join('')}</g>` : '',
    texts.length ? `<g font-family="${FONT}" font-size="${FONT_SIZE}" fill="${DARK}">${texts.join('')}</g>` : '',
  ].join('')
  return { viewBox: [Math.round(width * 100) / 100, Math.round(height * 100) / 100], body, formula: molecularFormula(m), place: { scale, dx, dy } }
}

/** Where a structure stands on the page: its box, its turn and its mirroring. */
export interface StructureBox {
  w: number
  h: number
  rotation: number
  flipX?: boolean
  flipY?: boolean
}

const COLOURED = new RegExp(Object.values(ELEMENT_COLOURS).join('|'), 'i')

/**
 * A structure turned or mirrored on the page, drawn again with every letter upright: the atoms
 * go where turning the picture would put them, and each label is written level, with its
 * hydrogens on whichever side is free now (as ChemDraw does). `transform` places the new drawing
 * inside the icon's box, under the box's own turn, so the atoms land exactly where they stood.
 * Null when there is nothing to do, or when the molfile no longer gives the stored drawing (the
 * picture was changed by hand); the picture is then turned as a whole, as any icon is.
 */
export function uprightStructure(molfile: string, viewBox: [number, number], body: string, box: StructureBox): { body: string; transform: string; points: [number, number][] } | null {
  const turn = ((box.rotation % 360) + 360) % 360
  if (!turn && !box.flipX && !box.flipY) return null
  const [vw, vh] = viewBox
  if (!(vw > 0 && vh > 0 && box.w > 0 && box.h > 0)) return null
  let m: Molecule
  try {
    m = readMolfile(molfile)
  } catch {
    return null
  }
  const colour = COLOURED.test(body)
  const first = moleculeSvg(m, { colour })
  if (Math.abs(first.viewBox[0] - vw) > 0.5 || Math.abs(first.viewBox[1] - vh) > 0.5) return null
  const kx = box.w / vw
  const ky = box.h / vh
  const k = Math.sqrt(kx * ky)
  const cx = box.w / 2
  const cy = box.h / 2
  const a = (turn * Math.PI) / 180
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  const { scale, dx, dy } = first.place
  // Each atom as the page shows it, measured from the middle of the box, in drawing units.
  const atoms = m.atoms.map((atom) => {
    let x = atom.x * scale + dx
    let y = -atom.y * scale + dy
    if (box.flipX) x = vw - x
    if (box.flipY) y = vh - y
    const bx = kx * x - cx
    const by = ky * y - cy
    return { ...atom, x: (bx * cos - by * sin) / k, y: -(bx * sin + by * cos) / k }
  })
  const second = moleculeSvg({ ...m, atoms }, { colour })
  const p = second.place
  // Drawing units of the new drawing → the icon's box before its turn: undo the turn the box
  // applies, so that after it every atom is where the turned picture had it.
  const f = k / p.scale
  const la = f * cos
  const lb = -f * sin
  const lc = f * sin
  const ld = f * cos
  const e = cx - (la * p.dx + lc * p.dy)
  const g = cy - (lb * p.dx + ld * p.dy)
  const n = (v: number) => Math.round(v * 10000) / 10000
  // Where each atom ends up in the box, for the tests.
  const points = atoms.map((atom): [number, number] => {
    const x = atom.x * p.scale + p.dx
    const y = -atom.y * p.scale + p.dy
    return [la * x + lc * y + e, lb * x + ld * y + g]
  })
  return { body: second.body, transform: `matrix(${n(la)} ${n(lb)} ${n(lc)} ${n(ld)} ${n(e)} ${n(g)})`, points }
}
