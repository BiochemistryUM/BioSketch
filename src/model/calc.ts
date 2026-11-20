// The lab calculators: molarity (mass, concentration, volume and molecular weight), dilution
// (C1·V1 = C2·V2) and the molecular weight of a formula. Plain arithmetic in SI units underneath;
// the units are only how a number is typed and shown.

/** A unit: its name as shown and how many base units (g, L, mol/L, g/L) one of it is. */
export interface Unit {
  id: string
  label: string
  factor: number
}

export const MASS_UNITS: Unit[] = [
  { id: 'kg', label: 'kg', factor: 1e3 },
  { id: 'g', label: 'g', factor: 1 },
  { id: 'mg', label: 'mg', factor: 1e-3 },
  { id: 'ug', label: 'µg', factor: 1e-6 },
  { id: 'ng', label: 'ng', factor: 1e-9 },
]

export const VOLUME_UNITS: Unit[] = [
  { id: 'L', label: 'L', factor: 1 },
  { id: 'mL', label: 'mL', factor: 1e-3 },
  { id: 'uL', label: 'µL', factor: 1e-6 },
  { id: 'nL', label: 'nL', factor: 1e-9 },
]

/** Concentrations in moles per litre. */
export const MOLAR_UNITS: Unit[] = [
  { id: 'M', label: 'M', factor: 1 },
  { id: 'mM', label: 'mM', factor: 1e-3 },
  { id: 'uM', label: 'µM', factor: 1e-6 },
  { id: 'nM', label: 'nM', factor: 1e-9 },
  { id: 'pM', label: 'pM', factor: 1e-12 },
]

/** Concentrations in grams per litre (1 mg/mL = 1 g/L), and percent weight per volume (1 % = 10 g/L). */
export const MASS_CONC_UNITS: Unit[] = [
  { id: 'g/L', label: 'g/L', factor: 1 },
  { id: 'mg/mL', label: 'mg/mL', factor: 1 },
  { id: 'ug/mL', label: 'µg/mL', factor: 1e-3 },
  { id: 'ng/uL', label: 'ng/µL', factor: 1e-3 },
  { id: 'ng/mL', label: 'ng/mL', factor: 1e-6 },
  { id: '%', label: '% (w/v)', factor: 10 },
]

/** A stock written as a multiple of its working strength (10×, 50×). */
export const FOLD_UNITS: Unit[] = [{ id: 'x', label: '×', factor: 1 }]

export const unitOf = (list: Unit[], id: string): Unit => list.find((u) => u.id === id) ?? list[0]

/** The units a dilution can be worked in, all of one kind so that C1 and C2 can be compared. */
export const DILUTION_KINDS = { molar: MOLAR_UNITS, mass: MASS_CONC_UNITS, fold: FOLD_UNITS } as const
export type DilutionKind = keyof typeof DILUTION_KINDS

/** The quantity of the molarity calculator that is worked out from the other three. */
export type MolarityUnknown = 'mass' | 'conc' | 'volume' | 'mw'

/**
 * mass = concentration × volume × molecular weight, solved for the one that is unknown. All in
 * base units: grams, moles per litre, litres, grams per mole. Returns null when the numbers given
 * do not make a positive, finite answer.
 */
export function solveMolarity(unknown: MolarityUnknown, v: { mass?: number; conc?: number; volume?: number; mw?: number }): number | null {
  const ok = (x: number | undefined): x is number => typeof x === 'number' && Number.isFinite(x) && x > 0
  let r: number
  if (unknown === 'mass') {
    if (!ok(v.conc) || !ok(v.volume) || !ok(v.mw)) return null
    r = v.conc * v.volume * v.mw
  } else if (unknown === 'conc') {
    if (!ok(v.mass) || !ok(v.volume) || !ok(v.mw)) return null
    r = v.mass / (v.volume * v.mw)
  } else if (unknown === 'volume') {
    if (!ok(v.mass) || !ok(v.conc) || !ok(v.mw)) return null
    r = v.mass / (v.conc * v.mw)
  } else {
    if (!ok(v.mass) || !ok(v.conc) || !ok(v.volume)) return null
    r = v.mass / (v.conc * v.volume)
  }
  return Number.isFinite(r) && r > 0 ? r : null
}

export type DilutionUnknown = 'c1' | 'v1' | 'c2' | 'v2'

/** C1 × V1 = C2 × V2 solved for the one that is unknown (concentrations in one unit, volumes in one unit). Null when it makes no sense, including a working solution stronger than its stock. */
export function solveDilution(unknown: DilutionUnknown, v: { c1?: number; v1?: number; c2?: number; v2?: number }): number | null {
  const ok = (x: number | undefined): x is number => typeof x === 'number' && Number.isFinite(x) && x > 0
  const known = (['c1', 'v1', 'c2', 'v2'] as const).filter((k) => k !== unknown)
  if (!known.every((k) => ok(v[k]))) return null
  const { c1, v1, c2, v2 } = v as Required<typeof v>
  const r = unknown === 'c1' ? (c2 * v2) / v1 : unknown === 'v1' ? (c2 * v2) / c1 : unknown === 'c2' ? (c1 * v1) / v2 : (c1 * v1) / c2
  if (!Number.isFinite(r) || r <= 0) return null
  const [C1, C2, V1, V2] = [unknown === 'c1' ? r : c1, unknown === 'c2' ? r : c2, unknown === 'v1' ? r : v1, unknown === 'v2' ? r : v2]
  // Diluting can only make a solution weaker and the volume larger.
  if (C2 > C1 * (1 + 1e-12) || V1 > V2 * (1 + 1e-12)) return null
  return r
}

/**
 * Standard atomic weights, abridged to five significant figures (IUPAC, Table of Standard Atomic
 * Weights 2021, conventional values where IUPAC gives an interval). Elements without a stable
 * isotope are left out, except thorium and uranium.
 */
export const ATOMIC_WEIGHTS: Record<string, number> = {
  H: 1.008, He: 4.0026, Li: 6.94, Be: 9.0122, B: 10.81, C: 12.011, N: 14.007, O: 15.999, F: 18.998, Ne: 20.18,
  Na: 22.99, Mg: 24.305, Al: 26.982, Si: 28.085, P: 30.974, S: 32.06, Cl: 35.45, Ar: 39.95, K: 39.098, Ca: 40.078,
  Sc: 44.956, Ti: 47.867, V: 50.942, Cr: 51.996, Mn: 54.938, Fe: 55.845, Co: 58.933, Ni: 58.693, Cu: 63.546, Zn: 65.38,
  Ga: 69.723, Ge: 72.63, As: 74.922, Se: 78.971, Br: 79.904, Kr: 83.798, Rb: 85.468, Sr: 87.62, Y: 88.906, Zr: 91.224,
  Nb: 92.906, Mo: 95.95, Ru: 101.07, Rh: 102.91, Pd: 106.42, Ag: 107.87, Cd: 112.41, In: 114.82, Sn: 118.71, Sb: 121.76,
  Te: 127.6, I: 126.9, Xe: 131.29, Cs: 132.91, Ba: 137.33, La: 138.91, Ce: 140.12, Pr: 140.91, Nd: 144.24, Sm: 150.36,
  Eu: 151.96, Gd: 157.25, Tb: 158.93, Dy: 162.5, Ho: 164.93, Er: 167.26, Tm: 168.93, Yb: 173.05, Lu: 174.97, Hf: 178.49,
  Ta: 180.95, W: 183.84, Re: 186.21, Os: 190.23, Ir: 192.22, Pt: 195.08, Au: 196.97, Hg: 200.59, Tl: 204.38, Pb: 207.2,
  Bi: 208.98, Th: 232.04, U: 238.03,
}

export interface FormulaResult {
  /** Molecular weight in g/mol. */
  mw: number
  /** How many atoms of each element, in the order first written. */
  atoms: [string, number][]
}

/**
 * The molecular weight of a formula as chemists write it: element symbols with counts, groups in
 * round or square brackets with a count after them (Ca(OH)2), and water of crystallisation or other
 * parts joined by a dot (CuSO4·5H2O, also written with "." or "*"). A charge at the end (SO4^2-,
 * Fe3+) is ignored. Throws an error that says what could not be read.
 */
export function formulaWeight(formula: string): FormulaResult {
  const text = formula
    .replace(/[₀-₉]/g, (d) => String(d.charCodeAt(0) - 0x2080))
    .replace(/\s+/g, '')
    .replace(/\^?\{?\d*[+\-−]\}?$/, '')
  if (!text) throw new Error('Type a formula, for example C6H12O6 or CuSO4·5H2O.')
  const counts = new Map<string, number>()
  // A "." joins two parts (CuSO4.5H2O), except as the decimal point of a leading number (CaSO4·0.5H2O).
  const parts: string[] = ['']
  for (const ch of text) {
    const last = parts[parts.length - 1]
    if ('·•*'.includes(ch) || (ch === '.' && !/^\d+$/.test(last))) parts.push('')
    else parts[parts.length - 1] = last + ch
  }
  for (const part of parts) {
    if (!part) throw new Error('A dot in the formula has nothing on one side of it.')
    const lead = /^(\d+(?:\.\d+)?)/.exec(part)
    const times = lead ? Number(lead[1]) : 1
    const body = lead ? part.slice(lead[1].length) : part
    let i = 0
    const group = (close: string | null): Map<string, number> => {
      const here = new Map<string, number>()
      const add = (el: string, n: number) => here.set(el, (here.get(el) ?? 0) + n)
      while (i < body.length) {
        const ch = body[i]
        if (ch === '(' || ch === '[') {
          i++
          const inner = group(ch === '(' ? ')' : ']')
          const n = count()
          for (const [el, k] of inner) add(el, k * n)
        } else if (ch === ')' || ch === ']') {
          if (ch !== close) throw new Error(`A “${ch}” in the formula has no opening bracket to go with it.`)
          i++
          return here
        } else {
          const m = /^[A-Z][a-z]?/.exec(body.slice(i))
          if (!m) throw new Error(`“${body.slice(i, i + 3)}” is not an element symbol. Symbols start with a capital letter: Na, Cl, Fe.`)
          const el = m[0]
          if (!(el in ATOMIC_WEIGHTS)) throw new Error(`“${el}” is not an element BioSketch knows.`)
          i += el.length
          add(el, count())
        }
      }
      if (close) throw new Error(`A bracket in the formula is opened but not closed.`)
      return here
    }
    const count = (): number => {
      const m = /^\d+/.exec(body.slice(i))
      if (!m) return 1
      i += m[0].length
      return Number(m[0])
    }
    if (!body) throw new Error('A number in the formula is not followed by anything.')
    for (const [el, n] of group(null)) counts.set(el, (counts.get(el) ?? 0) + n * times)
  }
  const atoms = [...counts.entries()]
  const mw = atoms.reduce((sum, [el, n]) => sum + ATOMIC_WEIGHTS[el] * n, 0)
  return { mw, atoms }
}

/** A number for reading off a calculator: four significant figures, without a long tail of zeros, in plain notation unless very large or small. */
export function calcText(x: number): string {
  if (!Number.isFinite(x)) return ''
  const a = Math.abs(x)
  if (a !== 0 && (a < 1e-4 || a >= 1e7)) return x.toExponential(3).replace(/\.?0+e/, 'e')
  return String(Number(x.toPrecision(4)))
}

/** The unit of a list that writes a quantity (given in base units) with the fewest digits: 0.0025 L is 2.5 mL. */
export function bestUnit(list: Unit[], base: number): Unit {
  const fits = list.filter((u) => base / u.factor >= 1 && base / u.factor < 1000)
  return fits[0] ?? (base / list[0].factor >= 1000 ? list[0] : list[list.length - 1])
}

/**
 * Parse a number typed in a calculator box: a decimal point or comma, an exponent (1e-3, 1E6,
 * 2.5×10^3 or 2.5x10^-3). Returns undefined for an empty box, NaN for anything unreadable.
 */
export function readNumber(text: string): number | undefined {
  const t = text.trim().replace(/\s+/g, '').replace(/−/g, '-')
  if (!t) return undefined
  const sci = /^([+-]?\d*[.,]?\d+)[x×*]10\^?([+-]?\d+)$/i.exec(t)
  if (sci) return Number(sci[1].replace(',', '.')) * 10 ** Number(sci[2])
  if (!/^[+-]?(\d+[.,]?\d*|[.,]\d+)(e[+-]?\d+)?$/i.test(t)) return NaN
  return Number(t.replace(',', '.'))
}
