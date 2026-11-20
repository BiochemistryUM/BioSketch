// "Chart from a table": the scientist pastes a table (or picks a file, or pastes it on the page),
// and BioSketch offers the charts that fit it, each drawn from the scientist's own numbers by the
// renderer the page uses, with a line on why. Choosing one puts it on the page, filled.

import { useMemo, useRef, useState } from 'react'
import { placeChart } from '../actions'
import { tableFromFile } from '../io/tables'
import { emptyDoc } from '../model/doc'
import { suggestCharts, summarise, type ChartSuggestion } from '../model/suggest'
import type { ChartNode } from '../model/types'
import { DocNodes } from '../render/DocNodes'
import { toast, useEditor } from '../store'
import { Modal } from './Dialogs'

const close = () => useEditor.setState({ dialog: null })

/** The suggested chart, drawn small by the renderer the page uses. */
function Preview({ s }: { s: ChartSuggestion }) {
  const doc = useMemo(() => {
    const node: ChartNode = { id: `suggest-${s.id}`, type: 'chart', x: 0, y: 0, w: 360, h: 260, rotation: 0, ...s.chart }
    return { ...emptyDoc(), nodes: [node] }
  }, [s])
  return (
    <svg className="suggest-preview" viewBox="-6 -6 372 272" aria-hidden="true">
      <DocNodes doc={doc} />
    </svg>
  )
}

export function SuggestDialog() {
  // The table it was opened with (a file, or a table pasted on the page), taken once.
  const [text, setText] = useState(() => {
    const given = useEditor.getState().dialogQuery
    return given
  })
  const [note, setNote] = useState('')
  const file = useRef<HTMLInputElement>(null)
  // Reading every kind of chart takes a moment on a long table: wait until typing pauses.
  const [settled, setSettled] = useState(text)
  const timer = useRef<number | undefined>(undefined)
  const change = (next: string) => {
    setText(next)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setSettled(next), 250)
  }
  const found = useMemo(() => {
    try {
      return suggestCharts(settled)
    } catch {
      return []
    }
  }, [settled])
  const summary = useMemo(() => (settled.trim() ? summarise(settled).text : ''), [settled])
  const pick = (s: ChartSuggestion) => {
    useEditor.setState({ dialogQuery: '' })
    close()
    placeChart(s.chart, `${s.name} added from your table. Its settings are in the panel; the table is under Data.`)
  }
  const onFile = async (f: File) => {
    try {
      const table = await tableFromFile(f)
      setText(table.text)
      setSettled(table.text)
      setNote(`Read from “${f.name}”.${table.note ? ` ${table.note}` : ''}`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'This file could not be read.')
    }
  }
  return (
    <Modal
      title="Chart from a table"
      wide
      onClose={() => {
        useEditor.setState({ dialogQuery: '' })
        close()
      }}
    >
      <p className="hint">Paste a table from a spreadsheet or an instrument, or pick a file. BioSketch suggests the charts that fit it, drawn from your numbers. Nothing leaves your browser.</p>
      <textarea
        className="text-input table-input"
        aria-label="Table to make a chart from"
        rows={7}
        wrap="off"
        spellCheck={false}
        placeholder={'Control\tTreated\n4.1\t6.9\n3.8\t7.4'}
        value={text}
        onChange={(e) => change(e.target.value)}
      />
      <div className="row wrap">
        <button className="btn small" onClick={() => file.current?.click()}>
          Pick a file…
        </button>
        <input
          ref={file}
          type="file"
          hidden
          accept=".csv,.tsv,.txt,.xlsx,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) void onFile(f)
          }}
        />
        {summary && <span className="hint">{summary}</span>}
      </div>
      {note && <p className="hint">{note}</p>}
      {settled.trim() && !found.length && <p className="notice">No chart fits this table. A chart needs at least one column of numbers, or columns of names for a Venn diagram.</p>}
      {found.length > 0 && (
        <div className="suggest-grid">
          {found.map((s, k) => (
            <button key={s.id} className={`suggest-card${k === 0 ? ' best' : ''}`} onClick={() => pick(s)}>
              <Preview s={s} />
              <span className="card-name">
                {s.name}
                {k === 0 ? ' · fits best' : ''}
              </span>
              <span className="suggest-why">{s.why}</span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}
