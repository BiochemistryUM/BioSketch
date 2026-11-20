// "My figures": every figure saved in this browser, to open, copy or delete, filed under projects.

import { useEffect, useRef, useState } from 'react'
import { duplicateFigure, figureList, moveToProject, newFigure, openFigure, removeFigure, renameFigureProject } from '../figures'
import { flushSave } from '../io/autosave'
import { BACKUP_MAX_BYTES, backupFileName, backupText, readBackup, type BackupEntry } from '../io/backup'
import { download } from '../io/download'
import { byProject, loadFigure, restoreFigures, tidyProject, type FigureMeta } from '../io/storage'
import { toast, useEditor } from '../store'
import { Modal } from './Dialogs'
import { Icon } from './Icon'

const when = (ms: number): string => new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

/** The choice in a figure's "Project" list that asks for the name of a new project. */
const NEW = '\u0000new'

const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`

/** Save every figure of this browser as one file. */
async function backUp(figures: FigureMeta[]): Promise<void> {
  await flushSave()
  const entries: BackupEntry[] = []
  let missing = 0
  for (const m of figures) {
    const doc = await loadFigure(m.id)
    if (doc) entries.push({ doc, updated: m.updated, ...(m.project ? { project: m.project } : {}) })
    else missing++
  }
  download(backupText(entries), backupFileName(), 'application/json')
  toast(`Backup of ${plural(entries.length, 'figure')} saved to your downloads.${missing ? ` ${plural(missing, 'figure')} could not be read and ${missing === 1 ? 'is' : 'are'} not in it.` : ''}`)
}

/** Add the figures of a backup file to this browser. */
async function restore(file: File): Promise<boolean> {
  try {
    if (file.size > BACKUP_MAX_BYTES) throw new Error('This file is too large to be a BioSketch backup.')
    const read = readBackup(await file.text())
    const done = await restoreFigures(read.figures)
    const parts = [done.added ? `${plural(done.added, 'figure')} added from the backup.` : 'No figure was added.']
    if (done.same) parts.push(`${plural(done.same, 'figure was', 'figures were')} here already and ${done.same === 1 ? 'was' : 'were'} not added again.`)
    if (read.unreadable) parts.push(`${plural(read.unreadable, 'figure')} in the file could not be read.`)
    if (read.leftOut) parts.push(`${plural(read.leftOut, 'figure')} beyond the first 2000 ${read.leftOut === 1 ? 'was' : 'were'} left out.`)
    if (done.failed) parts.push(`${plural(done.failed, 'figure')} could not be stored: the browser may be out of space.`)
    toast(parts.join(' '))
    return done.added > 0
  } catch (error) {
    toast(error instanceof Error ? error.message : 'This file could not be read.')
    return false
  }
}

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
  const backupInput = useRef<HTMLInputElement>(null)

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
        <button className="btn" disabled={!figures?.length} title="Save every figure of this browser as one file, to keep or to move to another computer or browser" onClick={() => figures && void backUp(figures)}>
          <Icon name="save" size={16} /> Back up all figures
        </button>
        <button className="btn" title="Add the figures of a backup file to this browser. Nothing here is replaced." onClick={() => backupInput.current?.click()}>
          <Icon name="import" size={16} /> Restore a backup…
        </button>
        <input
          ref={backupInput}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) void restore(f).then((added) => { if (added) void refresh() })
          }}
        />
      </div>
      <p className="hint">
        Figures and presentations are saved in this browser, on this computer, and nowhere else: nobody but you sees them, and they do not follow you to another computer or another browser. Clearing the browser's data for this site deletes them. Back up all figures now and then; to give one figure to a colleague, use
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
