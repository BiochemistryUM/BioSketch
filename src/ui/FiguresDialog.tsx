// "My figures": every figure saved in this browser, to open, copy or delete, filed under projects.

import { useEffect, useState } from 'react'
import { duplicateFigure, figureList, moveToProject, newFigure, openFigure, removeFigure, renameFigureProject } from '../figures'
import { byProject, tidyProject, type FigureMeta } from '../io/storage'
import { useEditor } from '../store'
import { Modal } from './Dialogs'
import { Icon } from './Icon'

const when = (ms: number): string => new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

/** The choice in a figure's "Project" list that asks for the name of a new project. */
const NEW = '\u0000new'

export function FiguresDialog() {
  const current = useEditor((s) => s.figureId)
  const [figures, setFigures] = useState<FigureMeta[] | null>(null)
  const close = () => useEditor.setState({ dialog: null })
  const refresh = () => figureList().then(setFigures)

  useEffect(() => {
    void refresh()
  }, [])

  const groups = byProject(figures ?? [])
  const projects = groups.map((g) => g.project).filter(Boolean)
  /** Ask for the name of a project; '' when none was given. */
  const ask = (question: string, start = ''): string => tidyProject(window.prompt(question, start) ?? '')

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
        <button
          className="btn"
          title="A project is a heading in this list that keeps the figures and presentations of one piece of work together"
          onClick={async () => {
            const name = ask('The name of the new project. A new, empty figure is made in it.')
            if (!name) return
            await newFigure(undefined, name)
            close()
          }}
        >
          <Icon name="open" size={16} /> New project
        </button>
      </div>
      <p className="hint">
        Figures and presentations are saved in this browser, on this computer, and nowhere else: nobody but you sees them, and they do not follow you to another computer or another browser. To give one to a colleague or to keep a copy, use
        File › Save figure file.
      </p>
      {figures === null ? (
        <p className="hint">Loading…</p>
      ) : figures.length === 0 ? (
        <p className="hint">No saved figures yet. The figure you are working on is saved as soon as you change it.</p>
      ) : (
        groups.map((group) => (
          <section key={group.project || '\u0000none'} className="figure-project">
            {(group.project || projects.length > 0) && (
              <header>
                <h2>
                  {group.project || 'Not in a project'} <small>{group.figures.length}</small>
                </h2>
                {group.project && (
                  <>
                    <button
                      className="btn small"
                      onClick={async () => {
                        await newFigure(undefined, group.project)
                        close()
                      }}
                    >
                      <Icon name="plus" size={14} /> New figure here
                    </button>
                    <button
                      className="btn small"
                      onClick={async () => {
                        const name = ask(`Another name for the project “${group.project}”:`, group.project)
                        if (!name || name === group.project) return
                        await renameFigureProject(group.project, name)
                        await refresh()
                      }}
                    >
                      Rename
                    </button>
                  </>
                )}
              </header>
            )}
            <ul className="figure-list">
              {group.figures.map((f) => (
                <li key={f.id} className={f.id === current ? 'current' : ''}>
                  <div className="figure-info">
                    <strong>{f.name || 'Untitled figure'}</strong>
                    <small>
                      {(f.slides ?? 1) > 1 ? `${f.slides} slides · ` : ''}
                      {f.objects} {f.objects === 1 ? 'object' : 'objects'} · saved {when(f.updated)}
                      {f.id === current ? ' · open now' : ''}
                    </small>
                  </div>
                  <select
                    className="figure-project-choice"
                    aria-label={`Project of ${f.name}`}
                    title="The project this figure is filed under"
                    value={f.project ?? ''}
                    onChange={async (e) => {
                      const to = e.target.value === NEW ? ask(`The name of a new project for “${f.name}”:`) : e.target.value
                      if (e.target.value === NEW && !to) return
                      await moveToProject(f.id, to)
                      await refresh()
                    }}
                  >
                    <option value="">No project</option>
                    {projects.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                    <option value={NEW}>New project…</option>
                  </select>
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
          </section>
        ))
      )}
    </Modal>
  )
}
