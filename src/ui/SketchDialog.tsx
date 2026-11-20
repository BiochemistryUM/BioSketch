// "Draw a structure": a small structure editor in the manner of ChemDraw. Bonds, rings, elements
// and charges are drawn with a mouse, a pen or a finger; the editing is done by the pure functions
// of src/model/sketch.ts and the picture by the same drawing as a structure from PubChem
// (`moleculeSvg`), so what is seen here is what is placed. The structure goes on the page as an
// icon that keeps its molfile, so it can be opened here again (Edit the structure, in the panel).

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { addCustomIcon, addIcon, replaceCustomIcon } from '../actions'
import { parseSvgFile } from '../icons/svg'
import { uid } from '../model/doc'
import { molecularFormula, moleculeSvg, readMolfile, type MolBond, type Molecule } from '../model/molecule'
import {
  addRing,
  atomAt,
  bondAt,
  bondFrom,
  cycleBond,
  emptySketch,
  joinAtoms,
  moveAtom,
  normalise,
  placeAtom,
  removeAtom,
  removeBond,
  setBond,
  setElement,
  shiftCharge,
  snapAngle,
  withoutHydrogens,
  writeMolfile,
  type P,
} from '../model/sketch'
import { toast, useEditor } from '../store'
import { Modal } from './Dialogs'

const close = () => useEditor.setState({ dialog: null })

type Tool =
  | { kind: 'bond'; order: MolBond['order']; stereo: MolBond['stereo'] }
  | { kind: 'ring'; size: number; aromatic: boolean }
  | { kind: 'element'; element: string }
  | { kind: 'charge'; by: 1 | -1 }
  | { kind: 'erase' }
  | { kind: 'move' }

interface ToolButton {
  id: string
  label: string
  title: string
  tool: Tool
  /** A small drawing instead of the label. */
  glyph?: ReactNode
}

/** The corners of a ring of n sides inside the 20 × 20 box of a tool's drawing. */
const polygon = (n: number): string =>
  Array.from({ length: n }, (_, k) => {
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / n
    return `${(10 + 8 * Math.cos(a)).toFixed(1)},${(10.5 + 8 * Math.sin(a)).toFixed(1)}`
  }).join(' ')
const glyph = (children: ReactNode) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
    {children}
  </svg>
)
const BOND_GLYPHS: Record<string, ReactNode> = {
  single: glyph(<line x1="3" y1="15" x2="17" y2="5" />),
  double: glyph(
    <>
      <line x1="3" y1="13" x2="15" y2="4.5" />
      <line x1="5" y1="15.5" x2="17" y2="7" />
    </>,
  ),
  triple: glyph(
    <>
      <line x1="3" y1="12" x2="14" y2="4" />
      <line x1="4" y1="14.5" x2="15.5" y2="6.3" />
      <line x1="5.5" y1="17" x2="17" y2="8.6" />
    </>,
  ),
  wedge: glyph(<polygon points="3,15 17,3.5 18.5,6.5" fill="currentColor" strokeWidth="0.8" />),
  hash: glyph(
    <>
      {[0, 1, 2, 3, 4].map((k) => {
        const t = k / 4
        const x = 4 + t * 13
        const y = 14.5 - t * 9.5
        const w = 0.5 + t * 2.4
        return <line key={k} x1={x - w * 0.55} y1={y - w * 0.8} x2={x + w * 0.55} y2={y + w * 0.8} strokeWidth="1.3" />
      })}
    </>,
  ),
}
const ringGlyph = (n: number, aromatic: boolean) =>
  glyph(
    <>
      <polygon points={polygon(n)} />
      {aromatic && <circle cx="10" cy="10.5" r="4.2" strokeWidth="1.2" />}
    </>,
  )

const BOND_TOOLS: ToolButton[] = [
  { id: 'single', label: '—', title: 'Single bond. Press an atom to add a bond, drag from an atom to aim it, press a bond to make it double and triple', tool: { kind: 'bond', order: 1, stereo: 0 } },
  { id: 'double', label: '=', title: 'Double bond', tool: { kind: 'bond', order: 2, stereo: 0 } },
  { id: 'triple', label: '≡', title: 'Triple bond', tool: { kind: 'bond', order: 3, stereo: 0 } },
  { id: 'wedge', label: '◀', title: 'Wedge: a bond towards you. Press it again to turn it round', tool: { kind: 'bond', order: 1, stereo: 1 } },
  { id: 'hash', label: '⫶', title: 'Hashed wedge: a bond away from you. Press it again to turn it round', tool: { kind: 'bond', order: 1, stereo: 6 } },
]
const RING_TOOLS: ToolButton[] = [
  { id: 'benzene', label: 'Benzene', title: 'Benzene ring. Press empty space, an atom (spiro) or a bond (fused)', tool: { kind: 'ring', size: 6, aromatic: true }, glyph: ringGlyph(6, true) },
  ...[3, 4, 5, 6, 7].map((n) => ({ id: `ring${n}`, label: `${n}`, title: `Ring of ${n} atoms. Press empty space, an atom or a bond`, tool: { kind: 'ring' as const, size: n, aromatic: false }, glyph: ringGlyph(n, false) })),
]
const ELEMENTS = ['C', 'N', 'O', 'S', 'P', 'F', 'Cl', 'Br', 'I', 'H']
const OTHER_TOOLS: ToolButton[] = [
  { id: 'plus', label: '+', title: 'A positive charge on the atom pressed', tool: { kind: 'charge', by: 1 } },
  { id: 'minus', label: '−', title: 'A negative charge on the atom pressed', tool: { kind: 'charge', by: -1 } },
  { id: 'erase', label: 'Erase', title: 'Delete the atom or bond pressed', tool: { kind: 'erase' } },
  { id: 'move', label: 'Move', title: 'Drag an atom to move it, or the empty space to move the view', tool: { kind: 'move' } },
]

/** Pixels per bond on the screen. */
const SCALE = 48
const W = 720
const H = 400
/** How far from an atom or a bond a press still counts as on it, in bonds: a finger needs more room. */
const reachFor = (pointer: string): { atom: number; bond: number } => (pointer === 'touch' ? { atom: 0.42, bond: 0.3 } : { atom: 0.3, bond: 0.2 })

/** The drawing of a structure as a complete SVG file, checked like any imported icon before it is placed. */
const svgFile = (m: Molecule, colour: boolean): string => {
  const { viewBox, body } = moleculeSvg(m, { colour })
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBox[0]} ${viewBox[1]}">${body}</svg>`
}

interface Press {
  start: P
  atom: number
  bond: number
  moved: boolean
  now: P
  /** The structure before a drag of the Move tool began, so the whole drag is one step. */
  before: Molecule
  panFrom?: P
}

export function SketchDialog() {
  // What the dialog was opened with is read once; clearing it and any message wait until after drawing,
  // because changing the editor's state while a component draws is not allowed.
  const [opened] = useState(() => {
    const given = useEditor.getState().sketchStart
    if (!given) return { start: null, error: null }
    try {
      return { start: { m: normalise(withoutHydrogens(readMolfile(given.molfile))), name: given.name ?? '', replace: given.replace }, error: null }
    } catch (e) {
      return { start: null, error: e instanceof Error ? e.message : 'This structure could not be opened.' }
    }
  })
  const start = opened.start
  useEffect(() => {
    useEditor.setState({ sketchStart: null })
    if (opened.error) toast(opened.error)
  }, [opened])
  const [history, setHistory] = useState<Molecule[]>(() => [start?.m ?? emptySketch()])
  const [at, setAt] = useState(0)
  const m = history[at]
  const [tool, setTool] = useState<Tool>(BOND_TOOLS[0].tool)
  const [toolId, setToolId] = useState('single')
  const [name, setName] = useState(start?.name ?? '')
  const [colour, setColour] = useState(true)
  // The middle of the view, in bonds.
  const [view, setView] = useState<P>(() => {
    const atoms = (start?.m ?? emptySketch()).atoms
    if (!atoms.length) return { x: 0, y: 0 }
    const xs = atoms.map((a) => a.x)
    const ys = atoms.map((a) => a.y)
    return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
  })
  const [press, setPress] = useState<Press | null>(null)
  const [hover, setHover] = useState<P | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const commit = (next: Molecule) => {
    if (next === m) return
    setHistory((h) => [...h.slice(0, at + 1), next].slice(-200))
    setAt((k) => Math.min(k + 1, 199))
  }
  /** The open step replaced without a new step for Undo: the steps of one drag. */
  const replace = (next: Molecule) => setHistory((h) => h.map((x, k) => (k === at ? next : x)))

  const toBonds = (e: { clientX: number; clientY: number }): P => {
    const svg = svgRef.current
    const ctm = svg?.getScreenCTM()
    if (!svg || !ctm) return { x: 0, y: 0 }
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    return { x: view.x + (pt.x - W / 2) / SCALE, y: view.y - (pt.y - H / 2) / SCALE }
  }
  const toScreen = (p: P): P => ({ x: W / 2 + (p.x - view.x) * SCALE, y: H / 2 - (p.y - view.y) * SCALE })

  const act = (fn: () => Molecule) => {
    try {
      commit(fn())
    } catch (e) {
      toast(e instanceof Error ? e.message : 'This could not be drawn.')
    }
  }

  const onDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = toBonds(e)
    const reach = reachFor(e.pointerType)
    const atom = atomAt(m, p, reach.atom)
    const bond = atom >= 0 ? -1 : bondAt(m, p, reach.bond)
    setPress({ start: p, atom, bond, moved: false, now: p, before: m, ...(tool.kind === 'move' && atom < 0 ? { panFrom: view } : {}) })
  }

  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const p = toBonds(e)
    setHover(p)
    if (!press) return
    const moved = press.moved || Math.hypot(p.x - press.start.x, p.y - press.start.y) > 0.35
    if (tool.kind === 'move') {
      if (press.atom >= 0) replace(moveAtom(press.before, press.atom, p))
      else if (press.panFrom) {
        // The view moves with the finger: the point pressed stays under it.
        const dx = p.x - press.start.x
        const dy = p.y - press.start.y
        setView((v) => ({ x: v.x - dx, y: v.y - dy }))
        return
      }
    }
    setPress({ ...press, moved, now: p })
  }

  const onUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    const p = press
    setPress(null)
    if (!p) return
    const reach = reachFor(e.pointerType)
    const end = toBonds(e)
    if (tool.kind === 'move') {
      // A drag of an atom was drawn step by step on the open structure: make it one step for Undo.
      if (p.atom >= 0 && p.moved) {
        const moved = m
        setHistory((h) => [...h.slice(0, at), p.before, moved])
        setAt(at + 1)
      }
      return
    }
    if (tool.kind === 'bond') {
      const { order, stereo } = tool
      if (p.atom >= 0) {
        if (p.moved) {
          const target = atomAt(m, end, reach.atom, p.atom)
          if (target >= 0) return act(() => joinAtoms(m, p.atom, target, order, stereo))
          return act(() => bondFrom(m, p.atom, { order, stereo, angle: snapAngle(Math.atan2(end.y - m.atoms[p.atom].y, end.x - m.atoms[p.atom].x)) }).m)
        }
        return act(() => bondFrom(m, p.atom, { order, stereo }).m)
      }
      if (p.bond >= 0) return act(() => (order === 1 && !stereo ? cycleBond(m, p.bond) : setBond(m, p.bond, order, stereo)))
      // Empty space: a bond from a new atom where the press began, aimed by the drag.
      return act(() => {
        const placed = placeAtom(m, p.start)
        const aim = p.moved ? { angle: snapAngle(Math.atan2(end.y - p.start.y, end.x - p.start.x)) } : {}
        return bondFrom(placed.m, placed.atom, { order, stereo, ...aim }).m
      })
    }
    if (tool.kind === 'ring') {
      const { size, aromatic } = tool
      if (p.atom >= 0) return act(() => addRing(m, size, { atom: p.atom }, aromatic))
      if (p.bond >= 0) return act(() => addRing(m, size, { bond: p.bond }, aromatic))
      return act(() => addRing(m, size, { point: p.start }, aromatic))
    }
    if (tool.kind === 'element') {
      if (p.atom >= 0) return act(() => setElement(m, p.atom, tool.element))
      if (p.bond < 0) return act(() => placeAtom(m, p.start, tool.element).m)
      return
    }
    if (tool.kind === 'charge') {
      if (p.atom >= 0) act(() => shiftCharge(m, p.atom, tool.by))
      return
    }
    if (tool.kind === 'erase') {
      if (p.atom >= 0) act(() => removeAtom(m, p.atom))
      else if (p.bond >= 0) act(() => removeBond(m, p.bond))
    }
  }

  // Undo and redo from the keyboard while the dialog is open, without reaching the figure's own Undo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return
      if ((e.target as HTMLElement | null)?.tagName === 'INPUT') return
      e.preventDefault()
      e.stopPropagation()
      setAt((k) => (e.shiftKey ? Math.min(k + 1, history.length - 1) : Math.max(0, k - 1)))
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [history.length])

  // The drawing, placed so that atom positions match the view.
  const drawn = useMemo(() => {
    if (!m.atoms.length) return null
    try {
      const svg = moleculeSvg(m, { colour, bond: SCALE })
      return svg
    } catch {
      return null
    }
  }, [m, colour])
  const transform = drawn
    ? (() => {
        // Atom i is drawn at (x · scale + dx, −y · scale + dy); on the screen it should be at toScreen(atom).
        const k = SCALE / drawn.place.scale
        const o = toScreen({ x: 0, y: 0 })
        return `translate(${o.x - drawn.place.dx * k} ${o.y - drawn.place.dy * k}) scale(${k})`
      })()
    : ''

  // What a drag of the bond tool would draw, shown while it is drawn.
  let ghost: [P, P] | null = null
  if (press && press.moved && tool.kind === 'bond') {
    const from = press.atom >= 0 ? m.atoms[press.atom] : press.start
    const a = snapAngle(Math.atan2(press.now.y - from.y, press.now.x - from.x))
    ghost = [toScreen(from), toScreen({ x: from.x + Math.cos(a), y: from.y + Math.sin(a) })]
  }
  const near = hover && !press ? atomAt(m, hover, 0.3) : -1
  const nearBond = hover && !press && near < 0 ? bondAt(m, hover, 0.2) : -1

  const choose = (b: ToolButton) => {
    setTool(b.tool)
    setToolId(b.id)
  }
  const toolButton = (b: ToolButton) => (
    <button key={b.id} className={`sketch-tool${toolId === b.id ? ' on' : ''}`} title={b.title} aria-label={b.title} aria-pressed={toolId === b.id} onClick={() => choose(b)}>
      {b.glyph ?? BOND_GLYPHS[b.id] ?? b.label}
    </button>
  )

  const formula = m.atoms.length ? molecularFormula(m) : ''
  const place = () => {
    if (!m.atoms.length) return toast('Draw a structure first.')
    try {
      const parsed = parseSvgFile(svgFile(m, colour))
      const label = name.trim().slice(0, 80) || formula
      const molfile = writeMolfile({ ...m, title: label })
      const def = {
        id: start?.replace ?? `mol-${uid()}`,
        name: label,
        category: 'Imported',
        tags: [],
        viewBox: parsed.viewBox,
        body: parsed.body,
        license: 'Public domain',
        author: '',
        source: '',
        molfile,
      }
      if (start?.replace && useEditor.getState().doc.customIcons[start.replace]) {
        replaceCustomIcon(def)
        toast(`${label} redrawn wherever it is used.`)
      } else {
        addCustomIcon(def)
        addIcon(def.id)
        toast(`${label} (${formula}) added. Select it and press “Edit the structure” to change it again.`)
      }
      close()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'This structure could not be placed.')
    }
  }

  return (
    <Modal title="Draw a structure" onClose={close} wide>
      <div className="sketch-bar" role="toolbar" aria-label="Drawing tools">
        <div className="sketch-group" aria-label="Bonds">
          {BOND_TOOLS.map(toolButton)}
        </div>
        <div className="sketch-group" aria-label="Rings">
          {RING_TOOLS.map(toolButton)}
        </div>
        <div className="sketch-group" aria-label="Elements">
          {ELEMENTS.map((el) => toolButton({ id: `el-${el}`, label: el, title: `${el}: press an atom to make it ${el}, or empty space to place one`, tool: { kind: 'element', element: el } }))}
        </div>
        <div className="sketch-group" aria-label="Charges, erasing and moving">
          {OTHER_TOOLS.map(toolButton)}
        </div>
      </div>
      <svg
        ref={svgRef}
        className={`sketch-canvas${tool.kind === 'move' ? ' moving' : ''}`}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={m.atoms.length ? `The structure drawn so far: ${formula}` : 'An empty drawing area'}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => setPress(null)}
        onPointerLeave={() => setHover(null)}
      >
        <rect width={W} height={H} fill="#fff" />
        {!m.atoms.length && (
          <text x={W / 2} y={H / 2} textAnchor="middle" className="sketch-empty">
            Press here to start a bond, or choose a ring and press here
          </text>
        )}
        {drawn && <g transform={transform} dangerouslySetInnerHTML={{ __html: drawn.body }} />}
        {near >= 0 && <circle cx={toScreen(m.atoms[near]).x} cy={toScreen(m.atoms[near]).y} r={11} className="sketch-hot" />}
        {nearBond >= 0 && (
          <line
            x1={toScreen(m.atoms[m.bonds[nearBond].from]).x}
            y1={toScreen(m.atoms[m.bonds[nearBond].from]).y}
            x2={toScreen(m.atoms[m.bonds[nearBond].to]).x}
            y2={toScreen(m.atoms[m.bonds[nearBond].to]).y}
            className="sketch-hot-bond"
          />
        )}
        {ghost && <line x1={ghost[0].x} y1={ghost[0].y} x2={ghost[1].x} y2={ghost[1].y} className="sketch-ghost" />}
      </svg>
      <div className="sketch-foot">
        <button className="btn" onClick={() => setAt((k) => Math.max(0, k - 1))} disabled={at === 0}>
          Undo
        </button>
        <button className="btn" onClick={() => setAt((k) => Math.min(history.length - 1, k + 1))} disabled={at >= history.length - 1}>
          Redo
        </button>
        <button className="btn" onClick={() => commit(emptySketch())} disabled={!m.atoms.length}>
          Clear
        </button>
        <span className="sketch-formula">{formula}</span>
      </div>
      <div className="sketch-foot">
        <input className="text-input" placeholder={formula ? `Name (otherwise ${formula})` : 'Name'} aria-label="Name of the structure" value={name} onChange={(e) => setName(e.target.value)} />
        <label className="check">
          <input type="checkbox" checked={colour} onChange={(e) => setColour(e.target.checked)} />
          <span>Colour by element</span>
        </label>
        <button className="btn primary" onClick={place} disabled={!m.atoms.length}>
          {start?.replace ? 'Replace on the page' : 'Add to the page'}
        </button>
      </div>
      <p className="hint">
        Hydrogens on carbon are left out, as in any skeletal formula; those on other atoms are written for you. The structure becomes an icon: it moves, resizes and recolours like any other.
      </p>
    </Modal>
  )
}
