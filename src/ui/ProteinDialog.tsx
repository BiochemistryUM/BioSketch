// "Protein": find a protein by name, gene or accession and add its structure (an AlphaFold DB
// model or a PDB entry) or a diagram of its domains with mutations. What the scientist types
// is sent to UniProt or the RCSB PDB only when they press Search.

import { useRef, useState } from 'react'
import { addStructure, addToFigure } from '../actions'
import { fetchStructure, lookupAlphafold, lookupPdbEntry, pdbFileUrl, readStructure, searchPdb, cleanPdbId, type PdbEntry } from '../io/structures'
import { domainDiagram, lookupUniprot, parseMutations, searchUniprot, uniprotCredit, type ProteinHit } from '../io/uniprot'
import { emptyDoc } from '../model/doc'
import type { TextNode } from '../model/types'
import { toast, useEditor } from '../store'
import { Modal } from './Dialogs'
import { Icon } from './Icon'
import { Tabs } from './Tabs'

const close = () => useEditor.setState({ dialog: null })

type Tab = 'uniprot' | 'pdb' | 'file'

const message = (e: unknown): string => (e instanceof Error ? e.message : 'Something went wrong.')

export function ProteinDialog() {
  const [tab, setTab] = useState<Tab>('uniprot')
  return (
    <Modal title="Protein" onClose={close} wide>
      <Tabs<Tab>
        label="Where the protein comes from"
        tab={tab}
        onTab={setTab}
        tabs={[
          { id: 'uniprot', label: 'By name (UniProt)' },
          { id: 'pdb', label: 'PDB entry' },
          { id: 'file', label: 'From a file' },
        ]}
      />
      {tab === 'uniprot' ? <ByName /> : tab === 'pdb' ? <ByPdb /> : <FromFile />}
    </Modal>
  )
}

/** A protein found in UniProt: its AlphaFold model, or a diagram of its domains and mutations. */
function ByName() {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<ProteinHit[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [chosen, setChosen] = useState<ProteinHit | null>(null)
  const [mutations, setMutations] = useState('')
  const search = async () => {
    const words = query.trim()
    if (!words) return
    setBusy(true)
    setChosen(null)
    try {
      setHits(await searchUniprot(words))
    } catch (e) {
      toast(message(e))
    } finally {
      setBusy(false)
    }
  }
  const model = async (hit: ProteinHit) => {
    setBusy(true)
    try {
      const info = await lookupAlphafold(hit.accession)
      const trace = await fetchStructure(info.modelUrl)
      addStructure(trace, { kind: 'alphafold', id: info.accession }, info.gene ? `${info.name} (${info.gene})` : info.name)
      close()
    } catch (e) {
      toast(message(e))
    } finally {
      setBusy(false)
    }
  }
  const diagram = async (hit: ProteinHit) => {
    setBusy(true)
    try {
      const protein = await lookupUniprot(hit.accession)
      const read = parseMutations(mutations, protein.length)
      const { nodes } = domainDiagram(protein, read.mutations)
      // UniProt asks for a credit (CC BY 4.0): a small line under the diagram, in its group.
      const bottom = Math.max(...nodes.map((n) => ('h' in n ? n.y + n.h : 'fontSize' in n ? n.y + n.fontSize * 1.3 : 0)))
      const group = nodes.find((n) => n.groupId)?.groupId
      const credit: TextNode = { id: 'dom-credit', type: 'text', x: 0, y: Math.round(bottom + 10), text: `Domains: ${uniprotCredit(protein.accession)}`, fontSize: 10, fill: '#5f6c7b', align: 'left', rotation: 0, ...(group ? { groupId: group } : {}) }
      addToFigure({ ...emptyDoc(), nodes: [...nodes, credit] })
      close()
      toast(
        `Domains of ${protein.gene || protein.name} added from ${uniprotCredit(protein.accession)}.` +
          (read.unread.length ? ` Not read: ${read.unread.slice(0, 6).join(', ')}${read.unread.length > 6 ? '…' : ''}.` : ''),
      )
    } catch (e) {
      toast(message(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          void search()
        }}
      >
        <input className="search" type="search" autoFocus placeholder="Name, gene or UniProt accession: “p53”, “INSR”, “P69905”" aria-label="Protein to look for" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="btn primary" disabled={busy || !query.trim()}>
          {busy ? 'Searching…' : 'Search'}
        </button>
      </form>
      {hits && !hits.length && <p className="hint">Nothing in UniProt matches “{query.trim()}”.</p>}
      {hits && hits.length > 0 && (
        <ul className="protein-hits">
          {hits.map((h) => (
            <li key={h.accession} className={chosen?.accession === h.accession ? 'chosen' : ''}>
              <span>
                <strong>{h.gene || h.accession}</strong> {h.name}
                <small>
                  {h.organism} · {h.accession}
                  {h.reviewed ? ' · reviewed' : ''}
                </small>
              </span>
              <span className="row">
                <button className="btn small" disabled={busy} onClick={() => void model(h)} title="The AlphaFold DB model of this protein, drawn as a tube and coloured by confidence">
                  <Icon name="molecule" size={14} /> 3D model
                </button>
                <button className="btn small" disabled={busy} onClick={() => setChosen(h)} title="The domains of this protein from UniProt, with mutations you type">
                  Domains
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {chosen && (
        <div className="protein-diagram">
          <label className="field">
            <span className="field-label">Mutations to show on {chosen.gene || chosen.accession} (optional)</span>
            <textarea
              rows={3}
              value={mutations}
              onChange={(e) => setMutations(e.target.value)}
              placeholder={'R175H x35, R248Q (28), R273H 30, G245S\nOne-letter or three-letter (Arg175His); a count after each if you have one'}
            />
          </label>
          <button className="btn primary" disabled={busy} onClick={() => void diagram(chosen)}>
            Add the domain diagram
          </button>
        </div>
      )}
      <p className="hint">
        Models come from AlphaFold DB (CC BY 4.0), domains from UniProt (CC BY 4.0); the credit is added to your export. Only what you type is sent, when you press Search. Not every protein has an AlphaFold model.
      </p>
    </>
  )
}

/** An experimental structure from the RCSB PDB, by its four-character id or by words. */
function ByPdb() {
  const [query, setQuery] = useState('')
  const [entries, setEntries] = useState<PdbEntry[] | null>(null)
  const [busy, setBusy] = useState(false)
  const search = async () => {
    const words = query.trim()
    if (!words) return
    setBusy(true)
    try {
      const id = cleanPdbId(words)
      const ids = id ? [id] : (await searchPdb(words)).slice(0, 10)
      const found = await Promise.all(ids.map((i) => lookupPdbEntry(i).catch(() => ({ id: i, title: '', method: '', resolution: null }) as PdbEntry)))
      setEntries(found)
    } catch (e) {
      toast(message(e))
    } finally {
      setBusy(false)
    }
  }
  const add = async (entry: PdbEntry) => {
    setBusy(true)
    try {
      const trace = await fetchStructure(pdbFileUrl(entry.id))
      addStructure(trace, { kind: 'pdb', id: entry.id }, entry.title || undefined)
      close()
    } catch (e) {
      toast(message(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          void search()
        }}
      >
        <input className="search" type="search" autoFocus placeholder="PDB id or words: “1A3N”, “haemoglobin”, “insulin receptor kinase”" aria-label="PDB entry to look for" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="btn primary" disabled={busy || !query.trim()}>
          {busy ? 'Searching…' : 'Search'}
        </button>
      </form>
      {entries && !entries.length && <p className="hint">No PDB entry matches “{query.trim()}”.</p>}
      {entries && entries.length > 0 && (
        <ul className="protein-hits">
          {entries.map((e) => (
            <li key={e.id}>
              <span>
                <strong>{e.id}</strong> {e.title || 'Title not available'}
                <small>
                  {[e.method, e.resolution !== null ? `${e.resolution} Å` : ''].filter(Boolean).join(' · ')}
                </small>
              </span>
              <button className="btn small" disabled={busy} onClick={() => void add(e)}>
                Add
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="hint">Experimental structures from the RCSB PDB (public domain); the entry is named in your export’s credits. Every chain of the entry is drawn; protein chains only.</p>
    </>
  )
}

function FromFile() {
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <p>A structure file from your computer: PDB (.pdb) or mmCIF (.cif), for example from PyMOL, ChimeraX, AlphaFold or ColabFold.</p>
      <button className="btn primary" onClick={() => input.current?.click()}>
        <Icon name="open" size={16} /> Choose a file…
      </button>
      <input
        ref={input}
        type="file"
        accept=".pdb,.cif,.ent,.mmcif,chemical/x-pdb,chemical/x-cif"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          try {
            if (f.size > 60_000_000) throw new Error('This file is too large.')
            addStructure(readStructure(await f.text()), { kind: 'file', id: f.name.replace(/\.(pdb|cif|ent|mmcif)$/i, '') }, undefined)
            close()
          } catch (err) {
            toast(message(err))
          }
        }}
      />
      <p className="hint">The file is read in your browser and never sent anywhere. A file of an AlphaFold model can be coloured by its confidence, which is stored where other files keep the B-factor.</p>
    </>
  )
}
