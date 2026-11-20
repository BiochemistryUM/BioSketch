// Drawing a chemical structure by hand: the edits a structure editor makes (a bond from an atom, a
// ring on an atom or a bond, an element, a charge, a deletion), as pure functions on the molecule
// that `molecule.ts` reads from a molfile and draws. Coordinates are those of a molfile: a bond is
// 1 long and y goes up. The editor only calls these and draws the result with `moleculeSvg`, so a
// structure drawn by hand looks like one from PubChem and is placed the same way, as an icon.

import { isElement, MAX_ATOMS, MAX_BONDS, type MolBond, type Molecule } from './molecule'

export interface P {
  x: number
  y: number
}

/** The length of a bond. */
export const BOND = 1
/** Atoms closer than this are one atom: a ring or a bond that ends on an atom joins it. */
const MERGE = 0.3
const TAU = Math.PI * 2

export const emptySketch = (): Molecule => ({ title: '', atoms: [], bonds: [] })

const dist = (a: P, b: P): number => Math.hypot(a.x - b.x, a.y - b.y)
const angle = (from: P, to: P): number => Math.atan2(to.y - from.y, to.x - from.x)
const along = (p: P, a: number, len = BOND): P => ({ x: p.x + Math.cos(a) * len, y: p.y + Math.sin(a) * len })
const copy = (m: Molecule): Molecule => ({ title: m.title, atoms: m.atoms.map((a) => ({ ...a })), bonds: m.bonds.map((b) => ({ ...b })) })
/** An angle in [0, 2π). */
const turn = (a: number): number => ((a % TAU) + TAU) % TAU

/** The atom nearest to a point within `reach`, or −1. */
export function atomAt(m: Molecule, p: P, reach: number, except = -1): number {
  let best = -1
  let bestD = reach
  m.atoms.forEach((a, i) => {
    const d = dist(a, p)
    if (i !== except && d <= bestD) {
      best = i
      bestD = d
    }
  })
  return best
}

/** The bond nearest to a point within `reach` of its line, or −1. */
export function bondAt(m: Molecule, p: P, reach: number): number {
  let best = -1
  let bestD = reach
  m.bonds.forEach((b, i) => {
    const a = m.atoms[b.from]
    const c = m.atoms[b.to]
    const len2 = (c.x - a.x) ** 2 + (c.y - a.y) ** 2 || 1
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * (c.x - a.x) + (p.y - a.y) * (c.y - a.y)) / len2))
    const d = dist(p, { x: a.x + t * (c.x - a.x), y: a.y + t * (c.y - a.y) })
    if (d <= bestD) {
      best = i
      bestD = d
    }
  })
  return best
}

export const neighbours = (m: Molecule, i: number): number[] => m.bonds.flatMap((b) => (b.from === i ? [b.to] : b.to === i ? [b.from] : []))
export const bondBetween = (m: Molecule, a: number, b: number): number => m.bonds.findIndex((x) => (x.from === a && x.to === b) || (x.from === b && x.to === a))

/** An angle snapped to the nearest multiple of 30°, the angles of a skeletal formula. */
export const snapAngle = (a: number): number => Math.round(a / (Math.PI / 6)) * (Math.PI / 6)

/**
 * The direction a new bond from an atom should take: up and to the right from a lone atom; 120°
 * from a single neighbour, continuing a zigzag; into the widest gap between two or more.
 */
export function freeDirection(m: Molecule, i: number): number {
  const at = m.atoms[i]
  const nb = neighbours(m, i)
  if (!nb.length) return Math.PI / 6
  if (nb.length === 1) {
    const j = nb[0]
    const back = angle(at, m.atoms[j])
    const options = [back + (TAU / 3), back - (TAU / 3)]
    // In a zigzag a–b–c–d the bond c→d runs parallel to a→b: follow the bond before the neighbour.
    const before = neighbours(m, j).find((k) => k !== i)
    if (before !== undefined) {
      const wanted = angle(m.atoms[before], m.atoms[j])
      return snapAngle(options.reduce((a, b) => (Math.cos(a - wanted) >= Math.cos(b - wanted) ? a : b)))
    }
    // Otherwise to the right, then upwards.
    return snapAngle(options.reduce((a, b) => (Math.cos(a) > Math.cos(b) + 1e-9 || (Math.abs(Math.cos(a) - Math.cos(b)) <= 1e-9 && Math.sin(a) > Math.sin(b)) ? a : b)))
  }
  const angles = nb.map((j) => turn(angle(at, m.atoms[j]))).sort((a, b) => a - b)
  let best = 0
  let gap = -1
  angles.forEach((a, k) => {
    const next = k === angles.length - 1 ? angles[0] + TAU : angles[k + 1]
    if (next - a > gap) {
      gap = next - a
      best = a + gap / 2
    }
  })
  return best
}

function addAtom(m: Molecule, p: P, element = 'C'): number {
  if (m.atoms.length >= MAX_ATOMS) throw new Error(`A structure can have at most ${MAX_ATOMS} atoms.`)
  m.atoms.push({ element, x: p.x, y: p.y, charge: 0 })
  return m.atoms.length - 1
}

function addBond(m: Molecule, from: number, to: number, order: MolBond['order'] = 1, stereo: MolBond['stereo'] = 0): number {
  const known = bondBetween(m, from, to)
  if (known >= 0) return known
  if (m.bonds.length >= MAX_BONDS) throw new Error(`A structure can have at most ${MAX_BONDS} bonds.`)
  m.bonds.push({ from, to, order, stereo })
  return m.bonds.length - 1
}

/** The atom at a point, or a new carbon there. */
function atomOrNew(m: Molecule, p: P, element = 'C'): number {
  const known = atomAt(m, p, MERGE)
  return known >= 0 ? known : addAtom(m, p, element)
}

/** A lone atom at a point (or the atom already there), with its index. */
export function placeAtom(m: Molecule, p: P, element = 'C'): { m: Molecule; atom: number } {
  const next = copy(m)
  const known = atomAt(next, p, MERGE)
  if (known >= 0) {
    if (element !== 'C') next.atoms[known].element = element
    return { m: next, atom: known }
  }
  return { m: next, atom: addAtom(next, p, element) }
}

export interface BondChoice {
  order?: MolBond['order']
  stereo?: MolBond['stereo']
  /** The direction of the new bond; absent = the free direction of the atom. */
  angle?: number
}

/**
 * A bond from an atom, one bond long, in the direction given or the atom's free direction. When an
 * atom already lies at its end, the bond joins it (closing a ring); a bond already there takes the
 * order chosen. Returns the atom at the far end.
 */
export function bondFrom(m: Molecule, from: number, choice: BondChoice = {}): { m: Molecule; atom: number } {
  const next = copy(m)
  const end = along(next.atoms[from], choice.angle ?? freeDirection(next, from))
  const to = atomAt(next, end, MERGE, from)
  const order = choice.order ?? 1
  const stereo = choice.stereo ?? 0
  if (to >= 0) {
    const known = bondBetween(next, from, to)
    if (known >= 0) next.bonds[known] = { ...next.bonds[known], order, stereo }
    else addBond(next, from, to, order, stereo)
    return { m: next, atom: to }
  }
  const atom = addAtom(next, end)
  addBond(next, from, atom, order, stereo)
  return { m: next, atom }
}

/** A bond between two atoms that are already there (dragging from one to the other). */
export function joinAtoms(m: Molecule, a: number, b: number, order: MolBond['order'] = 1, stereo: MolBond['stereo'] = 0): Molecule {
  if (a === b) return m
  const next = copy(m)
  const known = bondBetween(next, a, b)
  if (known >= 0) next.bonds[known] = { ...next.bonds[known], order, stereo, from: a, to: b }
  else addBond(next, a, b, order, stereo)
  return next
}

/** Single, double, triple, single again: what a tap on a bond does with the plain bond tool. */
export function cycleBond(m: Molecule, b: number): Molecule {
  const next = copy(m)
  const bond = next.bonds[b]
  bond.order = bond.order === 1 && !bond.stereo ? 2 : bond.order === 2 ? 3 : 1
  bond.stereo = 0
  return next
}

/** A bond made the order chosen; a wedge or hash tapped again turns round (its narrow end moves to the other atom). */
export function setBond(m: Molecule, b: number, order: MolBond['order'], stereo: MolBond['stereo'] = 0): Molecule {
  const next = copy(m)
  const bond = next.bonds[b]
  if (stereo && bond.stereo === stereo) next.bonds[b] = { ...bond, from: bond.to, to: bond.from }
  else next.bonds[b] = { ...bond, order: stereo ? 1 : order, stereo }
  return next
}

/** An atom made another element; an unknown symbol changes nothing. */
export function setElement(m: Molecule, i: number, element: string): Molecule {
  if (!isElement(element)) return m
  const next = copy(m)
  next.atoms[i].element = element
  return next
}

/** A charge one more or one less, between −3 and +3. */
export function shiftCharge(m: Molecule, i: number, by: 1 | -1): Molecule {
  const next = copy(m)
  next.atoms[i].charge = Math.max(-3, Math.min(3, next.atoms[i].charge + by))
  return next
}

/** Atoms taken out by their indices, with their bonds; the others keep their order. */
function withoutAtoms(m: Molecule, gone: Set<number>): Molecule {
  const index = new Map<number, number>()
  const atoms = m.atoms.filter((_, i) => !gone.has(i)).map((a) => ({ ...a }))
  m.atoms.forEach((_, i) => {
    if (!gone.has(i)) index.set(i, index.size)
  })
  const bonds = m.bonds.filter((b) => !gone.has(b.from) && !gone.has(b.to)).map((b) => ({ ...b, from: index.get(b.from)!, to: index.get(b.to)! }))
  return { title: m.title, atoms, bonds }
}

/** An atom deleted with its bonds; carbons left with no bond go too, as they would mean nothing. */
export function removeAtom(m: Molecule, i: number): Molecule {
  const gone = new Set([i])
  for (const j of neighbours(m, i)) if (m.atoms[j].element === 'C' && neighbours(m, j).length === 1) gone.add(j)
  return withoutAtoms(m, gone)
}

/** A bond deleted; an end that is a carbon with no other bond goes too. */
export function removeBond(m: Molecule, b: number): Molecule {
  const bond = m.bonds[b]
  const rest: Molecule = { ...m, bonds: m.bonds.filter((_, k) => k !== b) }
  const gone = new Set([bond.from, bond.to].filter((i) => m.atoms[i].element === 'C' && neighbours(rest, i).length === 0))
  return withoutAtoms(rest, gone)
}

/** An atom moved to a point. */
export function moveAtom(m: Molecule, i: number, p: P): Molecule {
  const next = copy(m)
  next.atoms[i] = { ...next.atoms[i], x: p.x, y: p.y }
  return next
}

/** The corners of a ring of `size` atoms with bonds one long, the first at `start` (an angle) from the middle. */
export function ringPoints(size: number, centre: P, start: number, step = TAU / size): P[] {
  const r = BOND / (2 * Math.sin(Math.PI / size))
  return Array.from({ length: size }, (_, k) => along(centre, start + k * step, r))
}

export type RingPlace = { point: P } | { atom: number } | { bond: number }

/**
 * A ring of 3 to 8 atoms: on its own at a point (a corner at the top), sharing one atom (spiro,
 * placed where the atom has room), or sharing a bond (fused, on the side away from the atoms
 * already there). Corners that fall on atoms already there join them. A benzene ring (`aromatic`)
 * gets alternating double bonds wherever both atoms are free for one.
 */
export function addRing(m: Molecule, size: number, place: RingPlace, aromatic = false): Molecule {
  const n = Math.max(3, Math.min(8, Math.round(size)))
  const next = copy(m)
  const r = BOND / (2 * Math.sin(Math.PI / n))
  const apothem = BOND / (2 * Math.tan(Math.PI / n))
  let corners: P[]
  if ('point' in place) {
    corners = ringPoints(n, place.point, Math.PI / 2)
  } else if ('atom' in place) {
    const a = next.atoms[place.atom]
    const dir = freeDirection(next, place.atom)
    const centre = along(a, dir, r)
    corners = ringPoints(n, centre, dir + Math.PI)
  } else {
    const bond = next.bonds[place.bond]
    const a = next.atoms[bond.from]
    const c = next.atoms[bond.to]
    const mid = { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 }
    const len = dist(a, c) || 1
    const normal = { x: -(c.y - a.y) / len, y: (c.x - a.x) / len }
    // The side with fewer neighbours of the two atoms: a fused ring goes where there is room.
    const others = [...neighbours(next, bond.from), ...neighbours(next, bond.to)].filter((k) => k !== bond.from && k !== bond.to)
    const side = others.reduce((s, k) => s + Math.sign((next.atoms[k].x - mid.x) * normal.x + (next.atoms[k].y - mid.y) * normal.y), 0)
    const sign = side > 0 ? -1 : 1
    const centre = { x: mid.x + normal.x * apothem * sign, y: mid.y + normal.y * apothem * sign }
    const start = angle(centre, a)
    const step = TAU / n
    // Go round so that the corner after the last is the bond's other atom.
    const forward = dist(along(centre, start - step, r), c) < dist(along(centre, start + step, r), c)
    corners = ringPoints(n, centre, start, forward ? step : -step)
  }
  const ring = corners.map((p) => atomOrNew(next, p))
  const made: number[] = []
  ring.forEach((atom, k) => {
    const other = ring[(k + 1) % n]
    const before = bondBetween(next, atom, other)
    const b = addBond(next, atom, other)
    if (before < 0) made.push(b)
  })
  if (aromatic) {
    // Try both starting places and keep the one with more double bonds.
    const tries = [0, 1].map((offset) => {
      const trial = next.bonds.map((b) => ({ ...b }))
      let count = 0
      for (let k = 0; k < n; k++) {
        const bi = bondBetween(next, ring[(k + offset) % n], ring[(k + offset + 1) % n])
        const b = trial[bi]
        const busy = (i: number) => trial.some((x) => (x.from === i || x.to === i) && x.order >= 2)
        if (made.includes(bi) && !busy(b.from) && !busy(b.to)) {
          b.order = 2
          count++
        }
      }
      return { trial, count }
    })
    next.bonds = tries[0].count >= tries[1].count ? tries[0].trial : tries[1].trial
  }
  return next
}

/**
 * A structure without the hydrogens a skeletal formula leaves out (PubChem's records write every
 * one): a hydrogen bonded to one other atom, uncharged, not on a wedge or hash. Those are counted
 * again from the valences, so the formula does not change.
 */
export function withoutHydrogens(m: Molecule): Molecule {
  const gone = new Set<number>()
  m.atoms.forEach((a, i) => {
    if (a.element !== 'H' || a.charge) return
    const bonds = m.bonds.filter((b) => b.from === i || b.to === i)
    if (bonds.length !== 1 || bonds[0].stereo || bonds[0].order !== 1) return
    const other = bonds[0].from === i ? bonds[0].to : bonds[0].from
    if (m.atoms[other].element !== 'H') gone.add(i)
  })
  return gone.size ? withoutAtoms(m, gone) : copy(m)
}

/** A structure scaled so that its bonds are one long (PubChem's are about one; a file may differ). */
export function normalise(m: Molecule): Molecule {
  const lengths = m.bonds.map((b) => dist(m.atoms[b.from], m.atoms[b.to])).filter((d) => d > 1e-6).sort((a, b) => a - b)
  if (!lengths.length) return copy(m)
  const k = BOND / lengths[Math.floor(lengths.length / 2)]
  return { title: m.title, atoms: m.atoms.map((a) => ({ ...a, x: a.x * k, y: a.y * k })), bonds: m.bonds.map((b) => ({ ...b })) }
}

const CHARGE_LIMIT = 8
const fixed = (v: number, width: number, digits: number): string => v.toFixed(digits).padStart(width)
const int = (v: number, width: number): string => String(v).padStart(width)

/** A structure as a molfile (V2000), the form `readMolfile` reads and other chemistry programs open. */
export function writeMolfile(m: Molecule): string {
  const lines = [m.title.replace(/[^\x20-\x7e]/g, '').slice(0, 80), '  BioSketch', '']
  lines.push(`${int(m.atoms.length, 3)}${int(m.bonds.length, 3)}  0  0  0  0  0  0  0  0999 V2000`)
  for (const a of m.atoms) lines.push(`${fixed(a.x, 10, 4)}${fixed(a.y, 10, 4)}${fixed(0, 10, 4)} ${a.element.padEnd(3)} 0  0  0  0  0  0  0  0  0  0  0  0`)
  for (const b of m.bonds) lines.push(`${int(b.from + 1, 3)}${int(b.to + 1, 3)}${int(b.order, 3)}${int(b.stereo, 3)}`)
  const charged = m.atoms.map((a, i) => [i + 1, a.charge]).filter(([, c]) => c !== 0)
  for (let k = 0; k < charged.length; k += CHARGE_LIMIT) {
    const part = charged.slice(k, k + CHARGE_LIMIT)
    lines.push(`M  CHG${int(part.length, 3)}${part.map(([i, c]) => `${int(i, 4)}${int(c, 4)}`).join('')}`)
  }
  lines.push('M  END')
  return lines.join('\n') + '\n'
}
