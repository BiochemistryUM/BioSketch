// The lab notebook: the list of entries at the left, the open entry at the right. Every change is
// saved by itself a moment after it is made.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { download } from '../io/download'
import { emptyDoc } from '../model/doc'
import { chartMethods } from '../model/statsReport'
import { DocNodes } from '../render/DocNodes'
import {
  PLOT_H,
  PLOT_W,
  PLOTS_MAX,
  ROWS_MAX,
  entryFile,
  kindOf,
  newEntry,
  readEntryFile,
  searchEntries,
  setValue,
  sortEntries,
  type Column,
  type Entry,
  type Field,
  type Plot,
  type Row,
  type Template,
} from './model'
import { canUseFolder, folderReady, folderStore, forgetFolder, pickFolder, recallFolder, rememberFolder } from './folder'
import { plotChoices, plotFrom } from './plots'
import type { NotebookStore } from './store'

type Saved = 'saved' | 'saving' | 'failed'

/** A plot, drawn by the renderer the figure editor uses. */
function PlotView({ plot }: { plot: Plot }) {
  const doc = useMemo(() => ({ ...emptyDoc(), width: PLOT_W, height: PLOT_H, nodes: [plot.chart] }), [plot.chart])
  return (
    <svg className="lb-plot" viewBox={`-6 -6 ${PLOT_W + 12} ${PLOT_H + 12}`} role="img" aria-label={plot.title || 'Plot'}>
      <rect x={-6} y={-6} width={PLOT_W + 12} height={PLOT_H + 12} fill="#ffffff" />
      <DocNodes doc={doc} />
    </svg>
  )
}

/** A small table of an entry: one row per clone, per oligo. */
function RowsField({ columns, rows, onChange }: { columns: Column[]; rows: Row[]; onChange: (rows: Row[]) => void }) {
  const setCell = (i: number, col: string, value: string) => {
    const next = rows.map((r, j) => {
      if (j !== i) return r
      const row = { ...r }
      if (value) row[col] = value
      else delete row[col]
      return row
    })
    onChange(next)
  }
  return (
    <div className="lb-rows">
      {rows.length > 0 && (
        <div className="lb-rows-scroll">
          <table>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.id}>{c.label}</th>
                ))}
                <th aria-label="Remove" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <td key={c.id}>
                      {c.options ? (
                        <select aria-label={c.label} value={row[c.id] ?? ''} onChange={(e) => setCell(i, c.id, e.target.value)}>
                          <option value="">–</option>
                          {[...new Set([...c.options, ...(row[c.id] ? [row[c.id]] : [])])].map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                      ) : (
                        <input className="text-line" aria-label={c.label} value={row[c.id] ?? ''} onChange={(e) => setCell(i, c.id, e.target.value)} />
                      )}
                    </td>
                  ))}
                  <td>
                    <button className="btn lb-remove" title="Remove this row" aria-label="Remove this row" onClick={() => onChange(rows.filter((_, j) => j !== i))}>
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button className="btn" disabled={rows.length >= ROWS_MAX} onClick={() => onChange([...rows, {}])}>
        + Add a row
      </button>
    </div>
  )
}

function FieldEditor({ field, entry, onChange }: { field: Field; entry: Entry; onChange: (entry: Entry) => void }) {
  const value = entry.values[field.id]
  const text = typeof value === 'string' ? value : ''
  const set = (v: string) => onChange(setValue(entry, field.id, v))
  const id = `lb-${field.id}`
  return (
    <div className="lb-field">
      <label className="lb-label" htmlFor={field.type === 'rows' ? undefined : id}>
        {field.label}
      </label>
      {field.type === 'long' && <textarea id={id} rows={Math.min(16, Math.max(3, text.split('\n').length + 1))} value={text} onChange={(e) => set(e.target.value)} />}
      {field.type === 'text' && <input id={id} className="text-line" value={text} onChange={(e) => set(e.target.value)} />}
      {field.type === 'link' && <input id={id} className="text-line" type="url" placeholder="https://" value={text} onChange={(e) => set(e.target.value)} />}
      {field.type === 'choice' && (
        <select id={id} value={text} onChange={(e) => set(e.target.value)}>
          <option value="">–</option>
          {[...new Set([...(field.options ?? []), ...(text ? [text] : [])])].map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      )}
      {field.type === 'rows' && <RowsField columns={field.columns ?? []} rows={Array.isArray(value) ? value : []} onChange={(rows) => onChange(setValue(entry, field.id, rows))} />}
      {field.hint && <p className="lb-hint">{field.hint}</p>}
    </div>
  )
}

/** Adding a plot: paste a table, see the charts that fit it, choose one. */
function AddPlot({ onAdd }: { onAdd: (plot: Plot) => void }) {
  const [table, setTable] = useState('')
  const choices = useMemo(() => plotChoices(table), [table])
  const plots = useMemo(() => choices.map((c) => ({ choice: c, plot: plotFrom(c) })).filter((p): p is { choice: (typeof choices)[number]; plot: Plot } => !!p.plot), [choices])
  return (
    <div className="lb-addplot">
      <label className="lb-label" htmlFor="lb-table">
        Add a plot
      </label>
      <textarea id="lb-table" rows={4} placeholder="Paste a table from a spreadsheet: names in the first row, numbers below" value={table} onChange={(e) => setTable(e.target.value)} />
      {table.trim() !== '' && plots.length === 0 && <p className="lb-hint">No chart fits this yet. A table needs a row of names and numbers under them.</p>}
      {plots.length > 0 && (
        <div className="lb-choices">
          {plots.map(({ choice, plot }) => (
            <button
              key={choice.id}
              className="lb-choice"
              onClick={() => {
                onAdd(plot)
                setTable('')
              }}
            >
              <PlotView plot={plot} />
              <strong>{choice.name}</strong>
              <span>{choice.why}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PlotCard({ plot, onChange, onRemove }: { plot: Plot; onChange: (plot: Plot) => void; onRemove: () => void }) {
  const methods = useMemo(() => chartMethods(plot.chart), [plot.chart])
  const [copied, setCopied] = useState(false)
  return (
    <figure className="lb-plotcard">
      <PlotView plot={plot} />
      <figcaption>
        <input className="text-line" aria-label="Title of the plot" value={plot.title} onChange={(e) => onChange({ ...plot, title: e.target.value })} />
        {methods && <p className="lb-methods">{methods}</p>}
        <div className="lb-actions">
          {methods && (
            <button
              className="btn"
              onClick={() => {
                void navigator.clipboard?.writeText(methods).then(() => setCopied(true))
              }}
            >
              {copied ? 'Copied' : 'Copy the methods text'}
            </button>
          )}
          <button className="btn" onClick={onRemove}>
            Remove the plot
          </button>
        </div>
      </figcaption>
    </figure>
  )
}

function EntryEditor({ entry, template, onChange, onDelete }: { entry: Entry; template: Template; onChange: (entry: Entry) => void; onDelete: () => void }) {
  const kind = kindOf(template, entry.kind)
  // Fields the entry holds that its kind no longer names (an older template) are still shown, so nothing typed is hidden.
  const extra: Field[] = Object.entries(entry.values)
    .filter(([id]) => !kind?.fields.some((f) => f.id === id))
    .map(([id, v]) => ({ id, label: id, type: typeof v === 'string' ? 'long' : 'rows', columns: typeof v === 'string' ? undefined : [...new Set(v.flatMap((r) => Object.keys(r)))].map((c) => ({ id: c, label: c })) }))
  const setPlots = (plots: Plot[]) => onChange({ ...entry, plots })
  return (
    <article className="lb-entry">
      <div className="lb-head">
        <input className="lb-title" aria-label="Title" placeholder="Title of the entry" value={entry.title} onChange={(e) => onChange({ ...entry, title: e.target.value })} />
        <div className="lb-meta">
          <input className="text-line lb-date" type="date" aria-label="Day of the experiment" value={entry.date} onChange={(e) => e.target.value && onChange({ ...entry, date: e.target.value })} />
          <span className="lb-kind">{kind?.name ?? entry.kind}</span>
        </div>
      </div>
      {[...(kind?.fields ?? []), ...extra].map((f) => (
        <FieldEditor key={f.id} field={f} entry={entry} onChange={onChange} />
      ))}
      <section className="lb-plots">
        <h2>Plots</h2>
        {entry.plots.map((p, i) => (
          <PlotCard key={i} plot={p} onChange={(next) => setPlots(entry.plots.map((q, j) => (j === i ? next : q)))} onRemove={() => setPlots(entry.plots.filter((_, j) => j !== i))} />
        ))}
        {entry.plots.length < PLOTS_MAX && <AddPlot onAdd={(plot) => setPlots([...entry.plots, plot])} />}
      </section>
      <div className="lb-foot">
        <button
          className="btn"
          onClick={() => {
            const file = entryFile(entry, template)
            download(file.text, file.path.split('/').pop()!, 'text/markdown')
          }}
        >
          Save as a file
        </button>
        <button className="btn lb-danger" onClick={onDelete}>
          Delete this entry
        </button>
      </div>
    </article>
  )
}

export function Notebook({ browserStore }: { browserStore: NotebookStore }) {
  const [store, setStore] = useState<NotebookStore>(browserStore)
  const [folder, setFolder] = useState<string | null>(null)
  const [template, setTemplate] = useState<Template | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [saved, setSaved] = useState<Saved>('saved')
  const [message, setMessage] = useState('')
  const pending = useRef(new Map<string, Entry>())
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let alive = true
    void Promise.all([store.template(), store.list()]).then(([t, list]) => {
      if (!alive) return
      const sorted = sortEntries(list)
      setTemplate(t)
      setEntries(sorted)
      setOpenId((id) => id ?? sorted[0]?.id ?? null)
    })
    return () => {
      alive = false
    }
  }, [store])

  // On start, open the folder from last time again when it is still allowed without asking.
  useEffect(() => {
    if (!canUseFolder) return
    let alive = true
    void (async () => {
      const handle = await recallFolder()
      if (alive && handle && (await folderReady(handle, false))) {
        setStore(folderStore(handle))
        setFolder(handle.name)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // A change that could not be written stays pending and is tried again with the next one.
  const flush = useCallback(async () => {
    timer.current = null
    let failed = false
    for (const [id, entry] of [...pending.current]) {
      if (await store.save(entry)) {
        if (pending.current.get(id) === entry) pending.current.delete(id)
      } else failed = true
    }
    setSaved(failed ? 'failed' : pending.current.size ? 'saving' : 'saved')
  }, [store])

  const keep = useCallback(
    (entry: Entry) => {
      pending.current.set(entry.id, entry)
      setSaved('saving')
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => void flush(), 500)
    },
    [flush],
  )

  // Leaving the page writes what is still waiting.
  useEffect(() => {
    const leave = () => {
      if (pending.current.size) void flush()
    }
    window.addEventListener('pagehide', leave)
    return () => window.removeEventListener('pagehide', leave)
  }, [flush])

  const useFolder = async () => {
    const handle = await pickFolder()
    if (!handle || !(await folderReady(handle, true))) return
    if (pending.current.size) await flush()
    await rememberFolder(handle)
    pending.current.clear()
    setFolder(handle.name)
    setStore(() => folderStore(handle))
  }

  const useBrowser = async () => {
    if (store === browserStore) return
    if (pending.current.size) await flush()
    await forgetFolder()
    pending.current.clear()
    setFolder(null)
    setStore(() => browserStore)
  }

  const change = (entry: Entry) => {
    const next = { ...entry, updated: new Date().toISOString() }
    setEntries((list) => list.map((e) => (e.id === next.id ? next : e)))
    keep(next)
  }

  const add = (kind: string) => {
    const entry = newEntry(kind)
    setEntries((list) => [entry, ...list])
    setOpenId(entry.id)
    setQuery('')
    keep(entry)
  }

  const remove = (entry: Entry) => {
    if (!window.confirm(`Delete “${entry.title || 'Untitled entry'}”? This cannot be undone.`)) return
    pending.current.delete(entry.id)
    void store.remove(entry.id)
    const rest = entries.filter((e) => e.id !== entry.id)
    setEntries(rest)
    setOpenId(sortEntries(rest)[0]?.id ?? null)
  }

  const openFiles = async (files: FileList | null) => {
    if (!files?.length) return
    let unread = 0
    const read: Entry[] = []
    for (const file of [...files]) {
      const entry = file.size <= 20_000_000 ? readEntryFile(await file.text()) : null
      if (entry) read.push(entry)
      else unread++
    }
    // An entry that is here already (the same id) is replaced by the one from the file.
    let next = entries
    for (const entry of read) next = next.some((e) => e.id === entry.id) ? next.map((e) => (e.id === entry.id ? entry : e)) : [entry, ...next]
    setEntries(next)
    read.forEach(keep)
    if (read[0]) setOpenId(read[0].id)
    setMessage(`${read.length} ${read.length === 1 ? 'entry' : 'entries'} read${unread ? `; ${unread} ${unread === 1 ? 'file is' : 'files are'} not an entry of the notebook` : ''}.`)
  }

  const shown = useMemo(() => searchEntries(sortEntries(entries), query), [entries, query])
  const open = entries.find((e) => e.id === openId) ?? null

  if (!template) return <div className="lb lb-wait">Opening the lab notebook…</div>

  return (
    <div className={`lb${open ? ' lb-has-open' : ''}`}>
      <header className="lb-top">
        <a className="lb-brand" href="../" title="Open BioSketch, the figure editor">
          BioSketch
        </a>
        <strong>Lab notebook</strong>
        <span className={`lb-saved lb-${saved}`} role="status">
          {saved === 'saved' ? 'Saved' : saved === 'saving' ? 'Saving…' : folder ? 'Could not save to the folder: check it is still there and permitted' : 'Could not save: the storage of this browser is full or closed'}
        </span>
      </header>
      <div className="lb-body">
        <nav className="lb-side" aria-label="Entries">
          <div className="lb-new">
            {template.kinds.map((k) => (
              <button key={k.id} className="btn primary" onClick={() => add(k.id)}>
                + {k.name}
              </button>
            ))}
          </div>
          <input className="text-line" type="search" placeholder="Search every entry: a gene, a guide, an oligo…" aria-label="Search the entries" value={query} onChange={(e) => setQuery(e.target.value)} />
          <ul className="lb-list">
            {shown.map((e) => (
              <li key={e.id}>
                <button className={e.id === openId ? 'lb-item on' : 'lb-item'} onClick={() => setOpenId(e.id)}>
                  <strong>{e.title || 'Untitled entry'}</strong>
                  <span>
                    {e.date} · {kindOf(template, e.kind)?.name ?? e.kind}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {entries.length > 0 && shown.length === 0 && <p className="lb-hint">No entry holds these words.</p>}
          <div className="lb-sidefoot">
            <button className="btn" onClick={() => fileInput.current?.click()}>
              Open entry files…
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".md,text/markdown,text/plain"
              multiple
              hidden
              onChange={(e) => {
                void openFiles(e.target.files)
                e.target.value = ''
              }}
            />
            {message && <p className="lb-hint">{message}</p>}
            <div className="lb-where">
              <p className="lb-hint">
                {folder ? (
                  <>
                    Kept in the folder <strong>{folder}</strong> on this computer, one file per entry.
                  </>
                ) : (
                  'Kept in this browser. Clearing the browser’s data would lose them.'
                )}
              </p>
              {canUseFolder ? (
                folder ? (
                  <button className="btn" onClick={() => void useBrowser()}>
                    Keep in this browser instead
                  </button>
                ) : (
                  <button className="btn" onClick={() => void useFolder()}>
                    Keep in a folder on this computer…
                  </button>
                )
              ) : (
                <p className="lb-hint">Save the entries that matter as files; this browser cannot open a folder (try Chrome or Edge).</p>
              )}
            </div>
          </div>
        </nav>
        <main className="lb-main">
          {open ? (
            <>
              <button className="btn lb-back" onClick={() => setOpenId(null)}>
                ‹ All entries
              </button>
              <EntryEditor key={open.id} entry={open} template={template} onChange={change} onDelete={() => remove(open)} />
            </>
          ) : (
            <div className="lb-empty">
              <h1>Lab notebook</h1>
              <p>Write down what you did and why while it is fresh: the aim, the reasoning, the protocol, the results and what comes next. Paste a table to add a plot; it is drawn by BioSketch and kept with its numbers.</p>
              <p>Start an entry with one of the buttons{entries.length ? ', or open one from the list' : ''}.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
