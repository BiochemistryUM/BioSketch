// A protein structure drawn as a smooth tube through its Cα atoms, seen from a chosen side. The
// drawing is plain SVG worked out here (no 3D library, no WebGL): every stretch between two
// residues is a short curve, drawn from the back to the front with an outline, so that nearer
// parts cover those behind them and the far side fades a little. The page, every export and
// the presenter draw the same list.

import type { StructureChain, StructureColour, StructureMark, StructureNode } from './types'

/** At most this many residues are kept in one structure (all chains together). */
export const STRUCTURE_RESIDUES_MAX = 6000
export const STRUCTURE_CHAINS_MAX = 50
export const STRUCTURE_MARKS_MAX = 40
/** Thickness of the tube in ångström when none is set: thin enough to see helices as coils. */
export const TUBE = 1.5
/** Consecutive Cα atoms further apart than this (ångström) are a gap in the chain: not joined. */
const GAP = 4.3

/** The confidence colours AlphaFold DB uses: very high, confident, low, very low. */
export const PLDDT_COLOURS = ['#0053d6', '#65cbf3', '#ffdb13', '#ff7d45'] as const
export const plddtColour = (b: number): string => (b > 90 ? PLDDT_COLOURS[0] : b > 70 ? PLDDT_COLOURS[1] : b > 50 ? PLDDT_COLOURS[2] : PLDDT_COLOURS[3])

/** Colours of chains, in order (Okabe–Ito without black, then Tableau). */
const CHAIN_COLOURS = ['#0072b2', '#e69f00', '#009e73', '#cc79a7', '#56b4e9', '#d55e00', '#f0e442', '#4e79a7', '#f28e2b', '#59a14f', '#e15759', '#b07aa1']

/** Blue at the start of a chain, through green and yellow, to red at its end. */
export function rainbow(t: number): string {
  const stops: [number, number, number][] = [
    [49, 54, 149],
    [69, 117, 180],
    [116, 173, 209],
    [171, 217, 233],
    [254, 224, 144],
    [253, 174, 97],
    [244, 109, 67],
    [215, 48, 39],
  ]
  const f = Math.min(1, Math.max(0, t)) * (stops.length - 1)
  const i = Math.min(stops.length - 2, Math.floor(f))
  const k = f - i
  const c = stops[i].map((v, j) => Math.round(v + (stops[i + 1][j] - v) * k))
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

function mix(hex: string, toward: [number, number, number], k: number): string {
  const n = parseInt(hex.slice(1), 16)
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v, i) => Math.round(v + (toward[i] - v) * k))
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

export interface StructureSegment {
  d: string
  colour: string
  outline: string
  width: number
}

export interface StructureLayout {
  /** Drawn in this order: from the back to the front. */
  segments: StructureSegment[]
  /**
   * The same segments in slabs of depth, back to front. A slab is drawn as all its outlines, then
   * all its fills: neighbours within a slab join without a seam, and a nearer slab covers a farther one with its outline.
   */
  layers: StructureSegment[][]
  marks: { x: number; y: number; r: number; label: string; lx: number; ly: number; anchor: 'start' | 'end' }[]
  fontSize: number
}

/** The centre and the radius of the atoms: the radius is the same from every side, so a turning structure keeps its size. */
export function structureExtent(chains: StructureChain[]): { cx: number; cy: number; cz: number; r: number } {
  let n = 0
  let sx = 0
  let sy = 0
  let sz = 0
  for (const c of chains)
    for (let i = 0; i + 2 < c.ca.length; i += 3) {
      sx += c.ca[i]
      sy += c.ca[i + 1]
      sz += c.ca[i + 2]
      n++
    }
  if (!n) return { cx: 0, cy: 0, cz: 0, r: 1 }
  const cx = sx / n
  const cy = sy / n
  const cz = sz / n
  let r = 0
  for (const c of chains) for (let i = 0; i + 2 < c.ca.length; i += 3) r = Math.max(r, Math.hypot(c.ca[i] - cx, c.ca[i + 1] - cy, c.ca[i + 2] - cz))
  return { cx, cy, cz, r: Math.max(r, 1) }
}

const round2 = (v: number): number => Math.round(v * 100) / 100

/**
 * Lay out a structure in its box (at 0,0, `w` by `h`): seen from `view` (turned by `yaw` about
 * the upright axis, then tilted by `pitch`), scaled so that it fits from every side.
 */
export function structureLayout(node: StructureNode, yawExtra = 0): StructureLayout {
  const { cx, cy, cz, r } = structureExtent(node.chains)
  const margin = 4
  const scale = Math.max(0.01, (Math.min(node.w, node.h) / 2 - margin) / (r + (node.tube ?? TUBE) / 2))
  const yaw = ((node.view[0] + yawExtra) * Math.PI) / 180
  const pitch = (node.view[1] * Math.PI) / 180
  const [cyw, syw, cp, sp] = [Math.cos(yaw), Math.sin(yaw), Math.cos(pitch), Math.sin(pitch)]
  const ox = node.w / 2
  const oy = node.h / 2
  /** Screen x, y (y downwards) and depth (larger is nearer). */
  const project = (x: number, y: number, z: number): [number, number, number] => {
    const a = x - cx
    const b = y - cy
    const c = z - cz
    // Turn about the upright (y) axis, then tilt about the x axis.
    const x1 = a * cyw + c * syw
    const z1 = -a * syw + c * cyw
    const y2 = b * cp - z1 * sp
    const z2 = b * sp + z1 * cp
    return [ox + x1 * scale, oy - y2 * scale, z2]
  }
  const colour = node.colour ?? 'chain'
  const width = Math.max(0.5, (node.tube ?? TUBE) * scale)
  const pieces: { z: number; seg: StructureSegment }[] = []
  const markAt = new Map<string, [number, number, number]>()
  node.chains.forEach((chain, ci) => {
    const count = Math.floor(chain.ca.length / 3)
    const pts = Array.from({ length: count }, (_, i) => project(chain.ca[3 * i], chain.ca[3 * i + 1], chain.ca[3 * i + 2]))
    const raw = (i: number): number => Math.hypot(chain.ca[3 * i] - chain.ca[3 * i + 3], chain.ca[3 * i + 1] - chain.ca[3 * i + 4], chain.ca[3 * i + 2] - chain.ca[3 * i + 5])
    const joined = (i: number): boolean => i >= 0 && i + 1 < count && raw(i) <= GAP
    const base = colour === 'single' ? (node.color ?? '#4a4fb5') : CHAIN_COLOURS[ci % CHAIN_COLOURS.length]
    for (let i = 0; i < count; i++) markAt.set(`${chain.id}:${chain.nums[i]}`, pts[i])
    for (let i = 0; i + 1 < count; i++) {
      if (!joined(i)) continue
      // A Catmull–Rom curve from residue i to i + 1, using the neighbours when they are joined.
      const p0 = joined(i - 1) ? pts[i - 1] : pts[i]
      const p1 = pts[i]
      const p2 = pts[i + 1]
      const p3 = joined(i + 1) ? pts[i + 2] : pts[i + 1]
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
      const z = (p1[2] + p2[2]) / 2
      const t = count > 1 ? i / (count - 1) : 0
      const own =
        colour === 'plddt' ? plddtColour(Math.min(chain.b[i] ?? 0, chain.b[i + 1] ?? 0)) : colour === 'rainbow' ? rainbow(t) : base
      // The far side fades towards white, a little.
      const far = Math.min(1, Math.max(0, (r - z) / (2 * r)))
      const fill = mix(own, [255, 255, 255], 0.45 * far)
      pieces.push({
        z,
        seg: {
          d: `M${round2(p1[0])} ${round2(p1[1])}C${round2(c1[0])} ${round2(c1[1])} ${round2(c2[0])} ${round2(c2[1])} ${round2(p2[0])} ${round2(p2[1])}`,
          colour: fill,
          outline: mix(own, [20, 24, 30], 0.55),
          width: round2(width),
        },
      })
    }
  })
  pieces.sort((a, b) => a.z - b.z)
  // Slabs about two tube thicknesses deep, at least one.
  const depth = Math.max(0.5, (node.tube ?? TUBE) * 2)
  const layers: StructureSegment[][] = []
  let slab = Number.NEGATIVE_INFINITY
  for (const p of pieces) {
    if (p.z >= slab + depth || !layers.length) {
      slab = p.z
      layers.push([])
    }
    layers[layers.length - 1].push(p.seg)
  }
  const fontSize = round2(Math.max(7, Math.min(16, Math.min(node.w, node.h) / 22)))
  const marks = (node.marks ?? []).flatMap((m) => {
    const p = markAt.get(`${m.chain}:${m.n}`)
    if (!p) return []
    const right = p[0] >= ox
    const gap = width + fontSize * 0.3
    return [{ x: round2(p[0]), y: round2(p[1]), r: round2(Math.max(2, width * 0.75)), label: m.label, lx: round2(p[0] + (right ? gap : -gap)), ly: round2(p[1] - gap), anchor: right ? ('start' as const) : ('end' as const) }]
  })
  return { segments: pieces.map((p) => p.seg), layers, marks, fontSize }
}

const THREE: Record<string, string> = {
  ALA: 'A', ARG: 'R', ASN: 'N', ASP: 'D', CYS: 'C', GLN: 'Q', GLU: 'E', GLY: 'G', HIS: 'H', ILE: 'I',
  LEU: 'L', LYS: 'K', MET: 'M', PHE: 'F', PRO: 'P', SER: 'S', THR: 'T', TRP: 'W', TYR: 'Y', VAL: 'V',
  SEC: 'U', PYL: 'O',
  // Modified amino acids, which files write as HETATM: each stands for the one it was made from.
  MSE: 'M', FME: 'M', PTR: 'Y', TYS: 'Y', SEP: 'S', SAC: 'S', TPO: 'T', MLY: 'K', MLZ: 'K', M3L: 'K', ALY: 'K',
  KCX: 'K', LLP: 'K', HYP: 'P', CSO: 'C', CME: 'C', CSD: 'C', CSX: 'C', OCS: 'C', NEP: 'H', HIC: 'H', PCA: 'E', CGU: 'E',
}
export const oneLetter = (name: string): string => THREE[name.toUpperCase()] ?? 'X'

/**
 * Whether a HETATM residue belongs in the chain: a modified amino acid (a phosphotyrosine, a
 * selenomethionine) is part of the backbone, while a calcium ion, whose atom is also called CA, is not.
 */
export const isModifiedAminoAcid = (name: string): boolean => name.toUpperCase() in THREE

/** The chains of a structure as a figure keeps them, from residues read from a file. Coordinates to 0.1 Å. */
export function chainsFrom(trace: { chains: { id: string; residues: { n: number; name: string; x: number; y: number; z: number; b: number }[] }[] }): StructureChain[] {
  let left = STRUCTURE_RESIDUES_MAX
  const out: StructureChain[] = []
  for (const c of trace.chains.slice(0, STRUCTURE_CHAINS_MAX)) {
    const rs = c.residues.slice(0, left)
    if (!rs.length) continue
    left -= rs.length
    const r1 = (v: number) => Math.round(v * 10) / 10 || 0
    out.push({
      id: c.id.slice(0, 8) || 'A',
      nums: rs.map((r) => Math.round(r.n)),
      ca: rs.flatMap((r) => [r1(r.x), r1(r.y), r1(r.z)]),
      b: rs.map((r) => r1(r.b)),
      seq: rs.map((r) => oneLetter(r.name)).join(''),
    })
  }
  return out
}

/** How many residues were left out by `chainsFrom`. */
export const residuesLeftOut = (trace: { chains: { residues: unknown[] }[] }): number =>
  Math.max(0, trace.chains.slice(0, STRUCTURE_CHAINS_MAX).reduce((s, c) => s + c.residues.length, 0) - STRUCTURE_RESIDUES_MAX) +
  trace.chains.slice(STRUCTURE_CHAINS_MAX).reduce((s, c) => s + c.residues.length, 0)

/**
 * Residues to mark, as typed: "R175, H179 zinc, A:248". A residue is its number, with the
 * one-letter code before it and the chain before a colon if wanted; words after it are its label.
 * Returns the marks found in the structure and the parts that were not.
 */
export function readMarks(text: string, chains: StructureChain[]): { marks: StructureMark[]; unread: string[] } {
  const marks: StructureMark[] = []
  const unread: string[] = []
  for (const part of text.split(/[,;\n]+/).map((p) => p.trim()).filter(Boolean)) {
    const m = /^(?:([A-Za-z0-9]{1,4}):)?([A-Za-z]?)(-?\d+)\s*(.*)$/.exec(part)
    if (!m) {
      unread.push(part)
      continue
    }
    const [, chainId, letter, num, words] = m
    const n = Number(num)
    const chain = chains.find((c) => (chainId ? c.id === chainId : c.nums.includes(n)))
    const at = chain ? chain.nums.indexOf(n) : -1
    if (!chain || at < 0 || (letter && chain.seq[at] !== letter.toUpperCase())) {
      unread.push(part)
      continue
    }
    const name = `${chain.seq[at]}${n}`
    marks.push({ chain: chain.id, n, label: (words.trim() ? `${name} ${words.trim()}` : name).slice(0, 40) })
    if (marks.length >= STRUCTURE_MARKS_MAX) break
  }
  return { marks, unread }
}

/** The marks written back as text, for the box they are typed in. */
export const marksText = (marks: StructureMark[] | undefined, chains: StructureChain[]): string =>
  (marks ?? []).map((m) => `${chains.length > 1 ? `${m.chain}:` : ''}${m.label}`).join(', ')

export const STRUCTURE_COLOURS: { value: StructureColour; label: string }[] = [
  { value: 'chain', label: 'By chain' },
  { value: 'rainbow', label: 'Rainbow, start to end' },
  { value: 'plddt', label: 'AlphaFold confidence (pLDDT)' },
  { value: 'single', label: 'One colour' },
]

/** The credit line a structure needs in a figure's credits. */
export function structureCredit(node: StructureNode): string {
  const s = node.source
  if (s.kind === 'alphafold') return `Structure: AlphaFold DB model of UniProt ${s.id} (CC BY 4.0). Jumper et al., Nature 2021; Varadi et al., Nucleic Acids Res. 2024.`
  if (s.kind === 'pdb') return `Structure: PDB ${s.id}, from the RCSB PDB (rcsb.org).`
  return s.id ? `Structure: ${s.id}.` : ''
}
