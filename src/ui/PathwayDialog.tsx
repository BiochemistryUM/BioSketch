// "Import a pathway": find a pathway on WikiPathways, or open a pathway file, and have it redrawn
// as ordinary boxes, labels and arrows: as a new figure, or added to the open one.

import { useEffect, useMemo, useRef, useState } from 'react'
import { addToFigure } from '../actions'
import { newFigure } from '../figures'
import { MAX_PATHWAY_FILE, PATHWAY_ACCEPT, pathwaySummary, readGpml, type PathwayLook } from '../io/gpml'
import { fetchGpml, loadPathwayList, pathwayPage, searchPathways, speciesOf, type PathwayInfo } from '../io/wikipathways'
import { useEditor } from '../store'
import { Modal } from './Dialogs'
import { Icon } from './Icon'

/** How many pathways the list shows at once; more words narrow it. */
const SHOWN = 40

interface Outcome {
  summary: string
  source: string
  notes: string[]
  /** The pathway was added to the open figure, resized by this factor (1 = as large as in the file). Absent: it is a new figure. */
  added?: number
}

/** Where the pathway goes: a new figure of its own, or into the open one. */
type Target = 'new' | 'here'


const message = (e: unknown, fallback: string): string => (e instanceof Error && e.message ? e.message : fallback)

export function PathwayDialog() {
  const close = () => useEditor.setState({ dialog: null })
  const fileRef = useRef<HTMLInputElement>(null)
  const [list, setList] = useState<PathwayInfo[] | null>(null)
  const [listError, setListError] = useState('')
  const [query, setQuery] = useState('')
  const [species, setSpecies] = useState('')
  const [look, setLook] = useState<PathwayLook>('soft')
  // An empty figure has nothing to add to: the pathway becomes the figure, with a page of its size.
  const empty = useEditor((s) => s.doc.nodes.length === 0)
  const [wanted, setTarget] = useState<Target>('new')
  const target: Target = empty ? 'new' : wanted
  /** The pathway being fetched ('file' while a file is read). */
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  const loadList = () => {
    setListError('')
    loadPathwayList().then(setList, (e) => setListError(message(e, 'The list of pathways could not be fetched.')))
  }
  useEffect(loadList, [])

  const allSpecies = useMemo(() => (list ? speciesOf(list) : []), [list])
  const found = useMemo(() => (list ? searchPathways(list, query, species) : []), [list, query, species])

  /** Redraw the pathway in `text`, as a new figure or into the open one, and say what was built. */
  const build = async (text: string, source: string) => {
    const read = readGpml(text, { look })
    if (target === 'here') setOutcome({ summary: pathwaySummary(read), source, notes: read.notes, added: addToFigure(read.doc) })
    else {
      await newFigure(read.doc)
      setOutcome({ summary: pathwaySummary(read), source, notes: read.notes })
    }
  }

  const importPathway = async (p: PathwayInfo) => {
    setBusy(p.id)
    setError('')
    try {
      await build(await fetchGpml(p.id), `WikiPathways ${p.id}${p.revision ? `, version of ${p.revision}` : ''} (wikipathways.org), public domain (CC0).`)
    } catch (e) {
      setError(message(e, 'This pathway could not be imported.'))
    } finally {
      setBusy(null)
    }
  }

  const openFile = async (file: File | undefined) => {
    if (!file) return
    setBusy('file')
    setError('')
    try {
      if (file.size > MAX_PATHWAY_FILE) throw new Error('This pathway file is too large to open.')
      await build(await file.text(), `The file “${file.name}”.`)
    } catch (e) {
      setError(message(e, 'This file could not be opened.'))
    } finally {
      setBusy(null)
    }
  }

  if (outcome) {
    return (
      <Modal title="The pathway is on the page" onClose={close}>
        <p>{outcome.summary}</p>
        <p className="hint">
          Every part is an ordinary object now: move it, recolour it, retype its name, or put an icon from the library in its place. Double-tap one object of a group to
          select it alone.{' '}
          {outcome.added === undefined
            ? 'To make the whole pathway larger or smaller, text and lines included, use “Resize everything together” under Page in the right-hand panel. The pathway is a new figure; the one you had open is in File › My figures.'
            : `The pathway was added to your figure and is selected: drag it into place${outcome.added < 1 ? `. It was made smaller to fit the page (${Math.round(outcome.added * 100)} % of its size in the file), text and lines in step` : ''}. To change its size again use “Resize everything together” under Arrange while it is selected. One Undo takes it out.`}
        </p>
        {outcome.notes.length > 0 && (
          <>
            <h3 className="outcome-title">Not carried over exactly</h3>
            <ul className="outcome-list">
              {outcome.notes.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          </>
        )}
        <p className="hint">Source: {outcome.source} Name the pathway and its source in your figure legend.</p>
        <div className="modal-actions">
          <button className="btn primary" onClick={close}>
            Done
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title="Import a pathway" onClose={close} wide>
      <p className="hint">
        A pathway from WikiPathways is redrawn as ordinary boxes, labels and arrows, so you can change every part of it afterwards.
      </p>
      {!empty && (
        <div className="row wrap">
          <span className="field-label">Where it goes</span>
          <div className="segmented" role="group" aria-label="Where the imported pathway goes">
            <button className={target === 'new' ? 'active' : ''} aria-pressed={target === 'new'} onClick={() => setTarget('new')}>
              A new figure
            </button>
            <button className={target === 'here' ? 'active' : ''} aria-pressed={target === 'here'} onClick={() => setTarget('here')}>
              Into the open figure
            </button>
          </div>
        </div>
      )}
      <div className="row wrap">
        <span className="field-label">Colours</span>
        <div className="segmented" role="group" aria-label="Colours of the imported pathway">
          <button className={look === 'soft' ? 'active' : ''} aria-pressed={look === 'soft'} onClick={() => setLook('soft')}>
            BioSketch colours, by type
          </button>
          <button className={look === 'file' ? 'active' : ''} aria-pressed={look === 'file'} onClick={() => setLook('file')}>
            As in the pathway
          </button>
        </div>
        <div className="spacer" />
        <button className="btn" disabled={busy !== null} onClick={() => fileRef.current?.click()}>
          <Icon name="open" size={16} /> {busy === 'file' ? 'Opening…' : 'Open a pathway file (.gpml)…'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={PATHWAY_ACCEPT}
          hidden
          onChange={(e) => {
            void openFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>

      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}

      <h2>Search WikiPathways</h2>
      <div className="row pathway-search">
        <input
          className="search"
          type="search"
          aria-label="Search pathways by name, gene or metabolite"
          placeholder="Name, gene or metabolite, for example “apoptosis” or “TP53”"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select aria-label="Species" value={species} onChange={(e) => setSpecies(e.target.value)} disabled={!list}>
          <option value="">All species</option>
          {allSpecies.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      {listError ? (
        <p className="notice" role="alert">
          {listError}{' '}
          <button className="btn small" onClick={loadList}>
            Try again
          </button>
        </p>
      ) : list === null ? (
        <p className="hint">Fetching the list of pathways from wikipathways.org…</p>
      ) : (
        <>
          <p className="hint" aria-live="polite">
            {found.length === 0
              ? 'No pathway matches these words. Try fewer words, or the official symbol of a gene.'
              : found.length > SHOWN
                ? `${found.length} pathways; the first ${SHOWN} are shown. Type more words to narrow the list.`
                : `${found.length} ${found.length === 1 ? 'pathway' : 'pathways'}.`}{' '}
            The list comes from wikipathways.org; what you type is searched in this browser and is not sent anywhere.
          </p>
          {found.length > 0 && (
            <ul className="figure-list pathway-list">
              {found.slice(0, SHOWN).map((p) => (
                <li key={p.id}>
                  <div className="figure-info">
                    <strong>{p.name}</strong>
                    <small>
                      {p.id}
                      {p.species ? ` · ${p.species}` : ''}
                      {p.molecules.length ? ` · ${p.molecules.length} genes and metabolites` : ''}
                    </small>
                    {p.description && <small className="pathway-about">{p.description}</small>}
                  </div>
                  <a className="btn small" href={pathwayPage(p.id)} target="_blank" rel="noopener noreferrer" aria-label={`Look at ${p.name} on WikiPathways (opens a new tab)`}>
                    Look
                  </a>
                  <button className="btn small primary" disabled={busy !== null} onClick={() => void importPathway(p)} aria-label={`Import ${p.name}`}>
                    {busy === p.id ? 'Importing…' : 'Import'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Modal>
  )
}
