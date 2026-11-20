// "My figures": every figure saved in this browser, to open, copy or delete.

import { useEffect, useState } from 'react'
import { duplicateFigure, figureList, newFigure, openFigure, removeFigure } from '../figures'
import type { FigureMeta } from '../io/storage'
import { useEditor } from '../store'
import { Modal } from './Dialogs'
import { Icon } from './Icon'

const when = (ms: number): string => new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function FiguresDialog() {
  const current = useEditor((s) => s.figureId)
  const [figures, setFigures] = useState<FigureMeta[] | null>(null)
  const close = () => useEditor.setState({ dialog: null })
  const refresh = () => figureList().then(setFigures)

  useEffect(() => {
    void refresh()
  }, [])

  return (
    <Modal title="My figures" onClose={close} wide>
      <div className="row wrap">
        <button
          className="btn primary"
          onClick={async () => {
            await newFigure()
            close()
          }}
        >
          <Icon name="newFile" size={16} /> New figure
        </button>
        <p className="hint">Figures are saved in this browser on this device. Use File › Save figure file to keep a copy elsewhere.</p>
      </div>
      {figures === null ? (
        <p className="hint">Loading…</p>
      ) : figures.length === 0 ? (
        <p className="hint">No saved figures yet. The figure you are working on is saved as soon as you change it.</p>
      ) : (
        <ul className="figure-list">
          {figures.map((f) => (
            <li key={f.id} className={f.id === current ? 'current' : ''}>
              <div className="figure-info">
                <strong>{f.name || 'Untitled figure'}</strong>
                <small>
                  {(f.slides ?? 1) > 1 ? `${f.slides} slides · ` : ''}
                  {f.objects} {f.objects === 1 ? 'object' : 'objects'} · saved {when(f.updated)}
                  {f.id === current ? ' · open now' : ''}
                </small>
              </div>
              <button
                className="btn small"
                disabled={f.id === current}
                onClick={async () => {
                  await openFigure(f.id)
                  close()
                }}
              >
                Open
              </button>
              <button
                className="btn small"
                onClick={async () => {
                  await duplicateFigure(f.id)
                  await refresh()
                }}
              >
                <Icon name="copy" size={14} /> Copy
              </button>
              <button
                className="btn small danger"
                aria-label={`Delete ${f.name}`}
                onClick={async () => {
                  if (!window.confirm(`Delete “${f.name}”? This cannot be undone.`)) return
                  await removeFigure(f.id)
                  await refresh()
                }}
              >
                <Icon name="trash" size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
