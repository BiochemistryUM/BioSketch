// "Start from a template": the example figures, the tour, and ready-made starts for a timeline, a
// workflow, a graphical abstract and a poster. The one that is chosen is shown before it is opened.

import { useEffect, useMemo, useRef, useState } from 'react'
import { exampleDoc, newFigure, tourDoc } from '../figures'
import { renderSvg } from '../io/export'
import { slideCount, slideDoc } from '../model/slides'
import type { FigDoc } from '../model/types'
import { useEditor } from '../store'
import { TEMPLATES, type Template } from '../templates'
import { Modal } from './Dialogs'
import { Icon } from './Icon'

interface Start {
  id: string
  name: string
  description: string
  group: string
  build: () => Promise<FigDoc | null>
}

const TOUR: Start = { id: 'tour', name: 'Tour of the features', description: 'Twelve slides with examples to try, from icons to statistics', group: 'Learn', build: tourDoc }
const start = (t: Template): Start => ({ id: t.id, name: t.name, description: t.description, group: t.group ?? 'Example figures', build: () => exampleDoc(t) })

/** The starts in the order they are listed, under the heading of their group. */
export const STARTS: Start[] = [TOUR, ...['Templates', 'Posters', undefined].flatMap((group) => TEMPLATES.filter((t) => t.group === group).map(start))]

export function TemplatesDialog() {
  const [chosen, setChosen] = useState(STARTS[1]?.id ?? STARTS[0].id)
  // Every start is built once: the figure that is shown is the figure that is opened.
  const built = useRef(new Map<string, FigDoc | null>())
  const [, setReady] = useState(0)
  const [busy, setBusy] = useState(false)
  const close = () => useEditor.setState({ dialog: null })
  const pick = STARTS.find((s) => s.id === chosen) ?? STARTS[0]

  useEffect(() => {
    if (built.current.has(pick.id)) return
    let gone = false
    void pick.build().then((doc) => {
      built.current.set(pick.id, doc)
      if (!gone) setReady((n) => n + 1)
    })
    return () => {
      gone = true
    }
  }, [pick])

  const doc = built.current.get(pick.id)
  const preview = useMemo(() => {
    if (!doc) return null
    const { svg } = renderSvg({ ...slideDoc(doc, 0), widthMm: undefined }, { area: 'page', transparent: false, includeSketch: true }, false)
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  }, [doc])
  const groups = [...new Set(STARTS.map((s) => s.group))]

  return (
    <Modal title="Start from a template" onClose={close} wide>
      <div className="templates-grid">
        <div className="templates-list" role="listbox" aria-label="Templates">
          {groups.map((group) => (
            <div key={group}>
              <h2>{group}</h2>
              {STARTS.filter((s) => s.group === group).map((s) => (
                <button key={s.id} role="option" aria-selected={s.id === pick.id} className={`menu-item two-line${s.id === pick.id ? ' active' : ''}`} onClick={() => setChosen(s.id)}>
                  <span>
                    {s.name}
                    <small>{s.description}</small>
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="templates-preview">
          <div className="templates-picture">{preview ? <img src={preview} alt={`Preview of ${pick.name}`} /> : <p className="hint">{doc === null ? 'This template could not be loaded. Check the connection and choose it again.' : 'Loading…'}</p>}</div>
          <p className="hint">
            {pick.description}.
            {doc && slideCount(doc) > 1 ? ` ${slideCount(doc)} slides; the first is shown.` : ''}
            {doc?.widthMm ? ` Printed size ${doc.widthMm} × ${Math.round((doc.widthMm * doc.height) / doc.width)} mm: export it as PDF to print it.` : ''}
          </p>
          <button
            className="btn primary"
            disabled={!doc || busy}
            onClick={async () => {
              if (!doc) return
              setBusy(true)
              await newFigure(doc)
              close()
            }}
          >
            <Icon name="newFile" size={16} /> Open as a new figure
          </button>
          <p className="hint">It opens as a figure of its own; your other figures stay as they are.</p>
        </div>
      </div>
    </Modal>
  )
}
