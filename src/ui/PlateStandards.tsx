// The layout of a plate for a standard curve: where the standards are, how they are diluted, how
// many wells each sample has, and single wells made a blank or left out by pressing them. Every
// change reads the plate again and gives the chart its standards and samples (`onTable`).

import { useCallback, useEffect, useRef, useState } from 'react'
import { defaultPlan, gridSize, lanesText, plateLayoutEntries, plateTable, readLanes, type PlateOverrides, type PlatePlan, type WellOverride } from '../model/plateStandards'
import type { StandardTable } from '../model/standardTable'
import type { PlateWell } from '../model/tableRoles'
import { PlateView } from './PlateView'

type Press = WellOverride | 'back'

export function PlateStandards({ plates, onTable }: { plates: { wells: PlateWell[]; title?: string }[]; onTable: (table: StandardTable) => void }) {
  const [which, setWhich] = useState(0)
  const plate = plates[Math.min(which, plates.length - 1)]
  const size = gridSize(plate.wells)
  const [plan, setPlan] = useState<PlatePlan>(() => defaultPlan(size))
  const [lanes, setLanes] = useState(() => lanesText(plan.lanes, plan.along))
  const [overrides, setOverrides] = useState<PlateOverrides>({})
  const [press, setPress] = useState<Press>('out')
  const told = useRef(onTable)
  told.current = onTable
  useEffect(() => told.current(plateTable(plate.wells, plan, overrides)), [plate, plan, overrides])

  const change = (c: Partial<PlatePlan>) => setPlan((p) => ({ ...p, ...c }))
  const number = (text: string, set: (v: number) => void) => {
    const v = Number(text.replace(',', '.'))
    if (Number.isFinite(v) && v > 0) set(v)
  }
  const entriesFor = useCallback(() => plateLayoutEntries(plate.wells, plan, overrides), [plate, plan, overrides])
  const onPress = (well: string) =>
    setOverrides((o) => {
      const next = { ...o }
      if (press === 'back') delete next[well]
      else next[well] = press
      return next
    })
  const most = plan.along === 'columns' ? (size === 96 ? 8 : 16) : size === 96 ? 12 : 24
  const lanesOk = readLanes(lanes, plan.along, size) !== null

  return (
    <div className="plate-standards">
      <p className="hint">This is a plate. Say where the standards are; every other well with a number is a sample.</p>
      {plates.length > 1 && (
        <label className="field">
          <span>Plate</span>
          <select value={which} onChange={(e) => setWhich(Number(e.target.value))}>
            {plates.map((p, i) => (
              <option key={i} value={i}>
                {p.title ?? `Plate ${i + 1}`}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="segmented" role="group" aria-label="The standards run">
        {(['columns', 'rows'] as const).map((a) => (
          <button
            key={a}
            className={plan.along === a ? 'active' : ''}
            aria-pressed={plan.along === a}
            onClick={() => {
              setLanes(lanesText([1, 2], a))
              change({ along: a, lanes: [1, 2], count: a === 'columns' ? (size === 96 ? 8 : 16) : size === 96 ? 12 : 24 })
            }}
          >
            {a === 'columns' ? 'Standards down columns' : 'Standards along rows'}
          </button>
        ))}
      </div>
      <div className="plate-plan">
        <label>
          <span>{plan.along === 'columns' ? 'Columns' : 'Rows'}</span>
          <input
            className={`text-input${lanesOk ? '' : ' invalid'}`}
            value={lanes}
            aria-label={plan.along === 'columns' ? 'Columns that hold the standards' : 'Rows that hold the standards'}
            placeholder={plan.along === 'columns' ? '1-2' : 'A-B'}
            onChange={(e) => {
              setLanes(e.target.value)
              const read = readLanes(e.target.value, plan.along, size)
              if (read) change({ lanes: read })
            }}
          />
        </label>
        <label>
          <span>Standards in each</span>
          <select value={plan.count} aria-label="Standards in each lane" onChange={(e) => change({ count: Number(e.target.value) })}>
            {Array.from({ length: most - 1 }, (_, i) => i + 2).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>First concentration</span>
          <input className="text-input" inputMode="decimal" defaultValue={plan.top} aria-label="Concentration of the first standard" onChange={(e) => number(e.target.value, (v) => change({ top: v }))} />
        </label>
        <label>
          <span>Each next diluted by</span>
          <input className="text-input" inputMode="decimal" defaultValue={plan.factor} aria-label="Dilution factor from one standard to the next" onChange={(e) => number(e.target.value, (v) => change({ factor: v }))} />
        </label>
        <label>
          <span>Wells per sample</span>
          <select value={plan.replicates} aria-label="Wells side by side that are one sample" onChange={(e) => change({ replicates: Number(e.target.value) })}>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n === 1 ? '1 (single wells)' : `${n} side by side`}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="check">
        <input type="checkbox" checked={plan.blankLast} onChange={(e) => change({ blankLast: e.target.checked })} />
        <span>The last standard is a blank (concentration 0)</span>
      </label>
      <div className="segmented wrap" role="group" aria-label="Pressing a well">
        {(
          [
            ['out', 'Press: leave out'],
            ['blank', 'Press: make a blank'],
            ['back', 'Press: put back'],
          ] as const
        ).map(([v, label]) => (
          <button key={v} className={press === v ? 'active' : ''} aria-pressed={press === v} onClick={() => setPress(v)}>
            {label}
          </button>
        ))}
      </div>
      <PlateView
        entriesFor={entriesFor}
        choices={[{ value: 'role', label: 'What each well holds' }]}
        initial="role"
        flagWords="they are left out"
        valueWords="Write the signal in each well"
        onPress={onPress}
        pressWords={press === 'out' ? 'Press a well to leave it out (a bubble, a scratch).' : press === 'blank' ? 'Press a well to make it a blank.' : 'Press a well to give it back the role the layout gives it.'}
      />
    </div>
  )
}
