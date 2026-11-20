// The three doors of the top bar besides the File menu: "Add" (a gallery of everything that can be
// put on the page, with a search box), "Import" (every kind of file or database BioSketch can
// read) and "Search" (things to add, commands and icons, by typing). All three read the one list
// in catalogue.ts.

import { useMemo, useRef, useState, type ReactNode } from 'react'
import { placeImageFile } from '../io/images'
import { tableFromFile } from '../io/tables'
import { chartSample, type ChartSample } from '../model/chartSamples'
import { emptyDoc } from '../model/doc'
import { findItems } from '../model/match'
import type { ChartNode } from '../model/types'
import { DocNodes } from '../render/DocNodes'
import { toast, useEditor } from '../store'
import { ADDABLE, COMMANDS, HEADINGS, type Entry, type Heading, type RunContext } from './catalogue'
import { Modal } from './Dialogs'
import { Icon } from './Icon'

const close = () => useEditor.setState({ dialog: null })

/** A picture of the example a chart starts with, drawn by the renderer the page uses. */
function ChartPreview({ sample }: { sample: ChartSample }) {
  const doc = useMemo(() => {
    const node: ChartNode = { id: `preview-${sample}`, type: 'chart', x: 0, y: 0, w: 360, h: 260, rotation: 0, ...chartSample(sample) }
    return { ...emptyDoc(), nodes: [node] }
  }, [sample])
  return (
    <svg className="card-preview" viewBox="-6 -6 372 272" aria-hidden="true">
      <DocNodes doc={doc} />
    </svg>
  )
}

/** Hidden file inputs for the entries that need a file, and the context that opens them. */
function useFilePickers(): { ctx: RunContext; inputs: ReactNode } {
  const picture = useRef<HTMLInputElement>(null)
  const table = useRef<HTMLInputElement>(null)
  const ctx: RunContext = { pickPicture: () => picture.current?.click(), pickTable: () => table.current?.click() }
  const inputs = (
    <>
      <input
        ref={picture}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) {
            close()
            void placeImageFile(f)
          }
        }}
      />
      <input
        ref={table}
        type="file"
        accept=".csv,.tsv,.txt,.xlsx,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) void chartFromFile(f)
        }}
      />
    </>
  )
  return { ctx, inputs }
}

/** A table read from a file opens "Chart from a table", which suggests the charts that fit it. */
async function chartFromFile(file: File): Promise<void> {
  try {
    const table = await tableFromFile(file)
    if (table.note) toast(table.note)
    useEditor.setState({ dialog: 'suggest', dialogQuery: table.text })
  } catch (error) {
    toast(error instanceof Error ? error.message : 'This file could not be read.')
  }
}

function Card({ entry, ctx, show }: { entry: Entry; ctx: RunContext; show: (h: Heading[]) => void }) {
  return (
    <button
      className="add-card"
      title={entry.description}
      onClick={() => {
        if (entry.opens) return show(entry.opens)
        // Entries that open the system's file picker keep the dialog until a file is chosen.
        if (entry.id !== 'picture') close()
        entry.run(ctx)
      }}
    >
      {entry.chart ? (
        <ChartPreview sample={entry.chart} />
      ) : (
        <span className="card-glyph">
          <Icon name={entry.icon} size={26} />
        </span>
      )}
      <span className="card-name">{entry.name}</span>
    </button>
  )
}

/** Headings the gallery shows only through a card of their own (Basics › Chart), so the first view stays short. */
const BEHIND_A_CARD = new Set<Heading>(ADDABLE.flatMap((e) => e.opens ?? []))

export function AddDialog() {
  const [query, setQuery] = useState('')
  const [view, setView] = useState<Heading[] | null>(null)
  const { ctx, inputs } = useFilePickers()
  const hits = query.trim() ? findItems(query, ADDABLE.filter((e) => !e.opens)) : null
  const show = (h: Heading[]) => setView(h)
  return (
    <Modal title="Add to the page" onClose={close} wide>
      <input className="search" type="search" autoFocus placeholder="Search: “standard curve”, “Venn”, “arrow”…" aria-label="Search what to add" value={query} onChange={(e) => setQuery(e.target.value)} />
      {hits ? (
        hits.length ? (
          <div className="add-grid">
            {hits.map((e) => (
              <Card key={e.id} entry={e} ctx={ctx} show={show} />
            ))}
          </div>
        ) : (
          <p className="hint">Nothing to add is called that. Icons are found in the library on the left; Search in the top bar also looks through commands.</p>
        )
      ) : view ? (
        <>
          <div className="add-back">
            <button className="btn" onClick={() => setView(null)}>
              ‹ Back
            </button>
          </div>
          {view.map((h) => (
            <section key={h} className="add-section" aria-label={h}>
              <h2>{h}</h2>
              <div className="add-grid">
                {ADDABLE.filter((e) => e.heading === h).map((e) => (
                  <Card key={e.id} entry={e} ctx={ctx} show={show} />
                ))}
              </div>
            </section>
          ))}
        </>
      ) : (
        HEADINGS.map((h) => {
          const entries = BEHIND_A_CARD.has(h) ? [] : ADDABLE.filter((e) => e.heading === h)
          if (!entries.length) return null
          return (
            <section key={h} className="add-section" aria-label={h}>
              <h2>{h}</h2>
              <div className="add-grid">
                {entries.map((e) => (
                  <Card key={e.id} entry={e} ctx={ctx} show={show} />
                ))}
              </div>
            </section>
          )
        })
      )}
      <p className="hint">Icons of cells, proteins, organisms and lab equipment are in the icon library on the left.</p>
      {inputs}
    </Modal>
  )
}

interface Source {
  id: string
  name: string
  about: string
  icon: Parameters<typeof Icon>[0]['name']
  run: (ctx: RunContext) => void
}

export function ImportDialog() {
  const { ctx, inputs } = useFilePickers()
  const sources: Source[] = [
    { id: 'figure', name: 'Figure file', about: 'A .biosketch.json file saved from BioSketch, opened as a new figure', icon: 'open', run: () => (close(), useEditor.setState((s) => ({ openFileRequest: s.openFileRequest + 1 }))) },
    { id: 'pathway', name: 'Pathway', about: 'Search WikiPathways, or open a GPML file from PathVisio: redrawn so every part can be changed', icon: 'pathway', run: () => useEditor.setState({ dialog: 'pathway' }) },
    { id: 'molecule', name: 'Chemical structure', about: 'A compound from PubChem by name or SMILES, drawn as a skeletal formula', icon: 'molecule', run: () => useEditor.setState({ dialog: 'molecule' }) },
    { id: 'protein', name: 'Protein', about: 'A structure from AlphaFold DB, the PDB or a .pdb/.cif file, or a domain diagram from UniProt', icon: 'molecule', run: () => useEditor.setState({ dialog: 'protein' }) },
    { id: 'table', name: 'Table for a chart', about: 'CSV, tab-separated text or the first sheet of an Excel file; BioSketch suggests the charts that fit it', icon: 'chart', run: (c) => c.pickTable() },
    { id: 'picture', name: 'Picture', about: 'PNG, JPEG, WebP or GIF: micrographs, blots, photos', icon: 'image', run: (c) => c.pickPicture() },
    { id: 'svg', name: 'SVG icon', about: 'A drawing from Inkscape, Illustrator or another collection, added to the library', icon: 'import', run: () => useEditor.setState({ dialog: 'import-icon' }) },
  ]
  return (
    <Modal title="Import" onClose={close}>
      <div className="source-list">
        {sources.map((s) => (
          <button key={s.id} className="source" onClick={() => s.run(ctx)}>
            <Icon name={s.icon} size={22} />
            <span>
              <strong>{s.name}</strong>
              <small>{s.about}</small>
            </span>
          </button>
        ))}
      </div>
      <p className="hint">Files are read in your browser and never sent anywhere. A pathway search fetches the list of pathways from WikiPathways.</p>
      {inputs}
    </Modal>
  )
}

export function SearchDialog() {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const { ctx, inputs } = useFilePickers()
  const words = query.trim()
  const results = useMemo(() => {
    if (!words) return []
    const found: Entry[] = findItems(words, [...ADDABLE, ...COMMANDS]).slice(0, 12)
    // A word could be a compound: offer to draw its structure (PubChem says whether it is one).
    if (words.length <= 80 && !found.some((e) => e.id === 'chemical-structure'))
      found.push({
        id: 'draw-compound',
        name: `Chemical structure of “${words}”`,
        description: 'Look it up in PubChem and draw it',
        icon: 'molecule',
        run: () => useEditor.setState({ dialog: 'molecule', dialogQuery: words }),
      })
    // Icons are many thousands and live in the library: offer to search it for these words.
    found.push({
      id: 'icons',
      name: `Icons named “${words}”`,
      description: 'Search the icon library',
      icon: 'library',
      run: () => useEditor.setState((s) => ({ libraryRequest: { query: words, n: (s.libraryRequest?.n ?? 0) + 1 } })),
    })
    return found
  }, [words])
  const runEntry = (e: Entry) => {
    if (e.id !== 'picture') close()
    e.run(ctx)
  }
  return (
    <Modal title="Search" onClose={close}>
      <input
        className="search"
        type="search"
        autoFocus
        placeholder="What do you want to do? “dilution”, “export PDF”, “ATP”…"
        aria-label="Search for something to add, a command or an icon"
        aria-controls="search-results"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => Math.max(0, Math.min(results.length - 1, a + (e.key === 'ArrowDown' ? 1 : -1))))
          } else if (e.key === 'Enter' && results[active]) {
            e.preventDefault()
            runEntry(results[active])
          }
        }}
      />
      {words ? (
        <ul className="search-results" id="search-results" role="listbox" aria-label="Results">
          {results.map((e, i) => (
            <li key={e.id} role="option" aria-selected={i === active}>
              <button className={i === active ? 'active' : ''} onClick={() => runEntry(e)} onMouseEnter={() => setActive(i)}>
                <Icon name={e.icon} size={18} />
                <span>
                  {e.name}
                  {e.heading ? <small> · Add to the page</small> : null}
                  {e.description && <small>{e.description}</small>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="hint">Type a word or two. Search finds things to add (charts, analyses, shapes), commands (export, templates, calculators) and icons. With a keyboard, ⌘K or Ctrl K opens it from anywhere.</p>
      )}
      {inputs}
    </Modal>
  )
}
