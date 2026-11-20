// "Chemical structure": a compound found in PubChem by name or SMILES, drawn by BioSketch as a
// skeletal formula (src/model/molecule.ts) and placed as an icon, so it moves, resizes and
// recolours like any other. PubChem is public domain: the icon needs no credit.

import { useEffect, useState } from 'react'
import { addCustomIcon, addIcon, addToFigure } from '../actions'
import { parseSvgFile } from '../icons/svg'
import { compoundName, fetchStructureRecord, findCompound, type Compound } from '../io/pubchem'
import { emptyDoc, uid } from '../model/doc'
import { reactionNodes, splitSpecies } from '../model/reaction'
import { moleculeSvg, readMolfile } from '../model/molecule'
import { writeMolfile } from '../model/sketch'
import { toast, useEditor } from '../store'
import { Modal } from './Dialogs'

const close = () => useEditor.setState({ dialog: null })

interface Found {
  compound: Compound & { asked?: string }
  record: string
}

/** The drawing of a record as a complete SVG file, which then goes through the same checks as any imported icon. */
function drawing(record: string, colour: boolean): { svg: string; viewBox: [number, number] } {
  const { viewBox, body } = moleculeSvg(readMolfile(record), { colour })
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBox[0]} ${viewBox[1]}">${body}</svg>`, viewBox }
}

export function MoleculeDialog() {
  // Opened from Search with words already typed: look them up at once.
  const [query, setQuery] = useState(() => useEditor.getState().dialogQuery)
  const [busy, setBusy] = useState(false)
  const [found, setFound] = useState<Found | null>(null)
  const [error, setError] = useState('')
  const [colour, setColour] = useState(true)

  const search = async (words = query.trim()) => {
    if (!words) return
    setBusy(true)
    setError('')
    setFound(null)
    try {
      const compound = await findCompound(words)
      const record = await fetchStructureRecord(compound.cid)
      drawing(record, true) // refuses what it cannot draw before anything is shown
      setFound({ compound, record })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'This compound could not be drawn.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    const start = useEditor.getState().dialogQuery.trim()
    useEditor.setState({ dialogQuery: '' })
    if (start) void search(start)
    // Once, when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const add = () => {
    if (!found) return
    try {
      const parsed = parseSvgFile(drawing(found.record, colour).svg)
      const id = `mol-${uid()}`
      addCustomIcon({
        id,
        name: compoundName(found.compound),
        // As a figure keeps every icon of its own (see validateDoc), so that it comes back unchanged.
        category: 'Imported',
        tags: [],
        viewBox: parsed.viewBox,
        body: parsed.body,
        license: 'Public domain',
        author: 'PubChem',
        source: `https://pubchem.ncbi.nlm.nih.gov/compound/${found.compound.cid}`,
        // Kept so that the structure can be changed in the structure editor afterwards.
        molfile: writeMolfile({ ...readMolfile(found.record), title: compoundName(found.compound) }),
      })
      addIcon(id)
      close()
      toast(`${compoundName(found.compound)} (${found.compound.formula}) added. It is an icon: resize it, recolour it or split it into parts like any other.`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'This compound could not be drawn.')
    }
  }

  const preview = found ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(drawing(found.record, colour).svg)}` : ''
  return (
    <Modal title="Chemical structure" onClose={close}>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          void search()
        }}
      >
        <input className="search" type="search" autoFocus placeholder="Name or SMILES: “ATP”, “caffeine”, “CC(=O)Oc1ccccc1C(=O)O”" aria-label="Compound to draw" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="btn primary" disabled={busy || !query.trim()}>
          {busy ? 'Looking up…' : 'Look up'}
        </button>
      </form>
      {error && <p className="notice">{error}</p>}
      {found && (
        <div className="molecule-found">
          <img src={preview} alt={`Structure of ${found.compound.title}`} />
          <p>
            <strong>{compoundName(found.compound)}</strong>
            {compoundName(found.compound) !== found.compound.title ? ` (PubChem: ${found.compound.title})` : ''} · {found.compound.formula} · {found.compound.mw} g/mol · PubChem {found.compound.cid}
          </p>
          <label className="check">
            <input type="checkbox" checked={colour} onChange={(e) => setColour(e.target.checked)} />
            <span>Colour the atoms by element (O red, N blue, S yellow, P orange)</span>
          </label>
          <div className="row wrap">
            <button className="btn primary" onClick={add}>
              Add to the page
            </button>
            <button className="btn" onClick={() => useEditor.setState({ sketchStart: { molfile: writeMolfile({ ...readMolfile(found.record), title: compoundName(found.compound) }), name: compoundName(found.compound) }, dialog: 'sketch' })}>
              Change the drawing first
            </button>
          </div>
        </div>
      )}
      <p className="hint">
        To draw a structure yourself, use Add › Draw a structure. The structure comes from PubChem (public domain) as a flat drawing and is drawn by BioSketch as a skeletal formula. Only what you type is sent to PubChem, when you press Look up. A SMILES is
        drawn only when PubChem holds that compound.
      </p>
    </Modal>
  )
}

/** "Reaction": substrates, products, enzyme and cofactor typed in words, placed as one group of ordinary objects. */
export function ReactionDialog() {
  const [r, setR] = useState({ substrates: 'Glucose', products: 'Glucose 6-phosphate', enzyme: 'Hexokinase', cofactorIn: 'ATP', cofactorOut: 'ADP', reversible: false })
  const field = (key: 'substrates' | 'products' | 'enzyme' | 'cofactorIn' | 'cofactorOut', label: string, placeholder: string) => (
    <label className="field">
      <span className="field-label">{label}</span>
      <input className="text-input" value={r[key]} placeholder={placeholder} onChange={(e) => setR({ ...r, [key]: e.target.value })} />
    </label>
  )
  const add = () => {
    const nodes = reactionNodes({ ...r, substrates: splitSpecies(r.substrates), products: splitSpecies(r.products) })
    addToFigure({ ...emptyDoc(), nodes })
    close()
    toast('Reaction added. Every box, word and arrow can be changed; double-tap a box to type in it.')
  }
  return (
    <Modal title="Reaction" onClose={close}>
      <div className="row wrap">
        {field('substrates', 'Substrates', 'Glucose + ATP')}
        {field('products', 'Products', 'Glucose 6-phosphate')}
      </div>
      {field('enzyme', 'Enzyme, on the arrow', 'Hexokinase')}
      <div className="row wrap">
        {field('cofactorIn', 'Goes in beside it', 'ATP, NAD⁺ …')}
        {field('cofactorOut', 'Comes out', 'ADP, NADH …')}
      </div>
      <label className="check">
        <input type="checkbox" checked={r.reversible} onChange={(e) => setR({ ...r, reversible: e.target.checked })} />
        <span>Runs both ways (an arrow head at each end)</span>
      </label>
      <p className="hint">Several substrates or products: put + or a comma between them. Leave the cofactor empty for none. Raised and lowered text works as in labels: NAD^{'{+}'}, CO_{'{2}'}.</p>
      <button className="btn primary" onClick={add}>
        Add to the page
      </button>
    </Modal>
  )
}
