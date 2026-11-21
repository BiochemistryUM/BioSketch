// The picture of a plate in the properties panel: drawn by the renderer from the objects that "Put
// the plate on the page" adds (`plateNodes`), so the panel shows what lands on the page. Pressing a
// well says what it holds and rings its replicates. Shared by every analysis that reads wells.

import { useMemo, useRef, useState } from 'react'
import { addToFigure } from '../actions'
import { emptyDoc } from '../model/doc'
import { platePicture, plateNodes, wellAt, type PlateEntry } from '../model/plate'
import { DocNodes } from '../render/DocNodes'
import { toast } from '../store'

export function PlateView<T extends string>({
  entriesFor,
  choices,
  initial,
  palette,
  flagWords,
  valueWords,
  onPress,
  pressWords,
}: {
  /** The wells, coloured by the choice made. */
  entriesFor: (by: T) => PlateEntry[]
  /** What can colour the wells. */
  choices: { value: T; label: string }[]
  initial: T
  palette?: string
  /** What a red ring means, for the line under the plate. */
  flagWords: string
  /** The words of the box that writes the numbers in the wells: "Write the Cq in each well". */
  valueWords: string
  /** Called with the well pressed, when pressing a well changes it. */
  onPress?: (well: string) => void
  /** What a press does, for the line under the plate when `onPress` is given. */
  pressWords?: string
}) {
  const [by, setBy] = useState<T>(initial)
  const [values, setValues] = useState(true)
  const [chosen, setChosen] = useState<string | null>(null)
  const entries = useMemo(() => entriesFor(by), [entriesFor, by])
  const picture = useMemo(() => platePicture(entries, { palette, values }), [entries, palette, values])
  const doc = useMemo(() => ({ ...emptyDoc(), nodes: plateNodes(picture) }), [picture])
  const svg = useRef<SVGSVGElement>(null)
  const well = chosen ? picture.wells.find((w) => w.well === chosen && w.entries.length) : undefined
  const sets = new Set(well?.entries.map((e) => e.set).filter(Boolean))
  const partners = well ? picture.wells.filter((w) => w !== well && w.entries.some((e) => e.set && sets.has(e.set))) : []
  const flagged = picture.wells.filter((w) => w.flagged).length

  const press = (e: React.PointerEvent<SVGSVGElement>) => {
    const el = svg.current
    const m = el?.getScreenCTM()
    if (!el || !m) return
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    const hit = wellAt(picture, p.x, p.y)
    if (hit && onPress) onPress(hit.well)
    setChosen(hit && hit.entries.length && hit.well !== chosen ? hit.well : null)
  }
  const place = () => {
    addToFigure({ ...emptyDoc(), nodes: plateNodes(picture) })
    toast('Plate added. Every well is a circle and every name a label, in one group: recolour or retype any of them.')
  }

  return (
    <div className="plate-view">
      {choices.length > 1 && (
      <div className="segmented" role="group" aria-label="Colour the wells by">
        {choices.map((o) => (
          <button key={o.value} className={by === o.value ? 'active' : ''} aria-pressed={by === o.value} onClick={() => setBy(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
      )}
      <svg ref={svg} className="plate-picture" viewBox={`-4 -4 ${picture.w + 8} ${picture.h + 8}`} onPointerDown={press} role="img" aria-label={`Picture of the ${picture.size}-well plate`}>
        <DocNodes doc={doc} />
        {[...(well ? [well] : []), ...partners].map((w, i) => (
          <circle key={w.well} cx={w.cx} cy={w.cy} r={w.r + 2.5} fill="none" stroke="var(--accent)" strokeWidth={i === 0 ? 3 : 2} strokeDasharray={i === 0 ? undefined : '3 2'} pointerEvents="none" />
        ))}
      </svg>
      {well ? (
        <div className="plate-detail" aria-live="polite">
          <strong>{well.well}</strong>
          {well.entries.map((e, i) => (
            <span key={i}>
              {e.detail}
              {e.flag ? <span className="plate-flag"> · {e.flag}</span> : null}
            </span>
          ))}
          {partners.length > 0 && <span className="hint">Its replicates are ringed: {partners.map((w) => w.well).join(', ')}.</span>}
        </div>
      ) : (
        <p className="hint">
          {pressWords ?? 'Press a well to see what it holds and where its replicates are.'}
          {flagged ? ` ${flagged} ${flagged === 1 ? 'well is' : 'wells are'} ringed in red: ${flagWords}.` : ''}
        </p>
      )}
      <div className="row wrap">
        {picture.size === 96 && (
          <label className="check">
            <input type="checkbox" checked={values} onChange={(e) => setValues(e.target.checked)} />
            <span>{valueWords}</span>
          </label>
        )}
        <button className="btn small" onClick={place}>
          Put the plate on the page
        </button>
      </div>
    </div>
  )
}
