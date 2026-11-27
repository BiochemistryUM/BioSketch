// Lab calculators: how much to weigh (molarity), how much stock to take (dilution), and the
// molecular weight of a formula or of a compound looked up in PubChem. The arithmetic is in
// src/model/calc.ts; this file only holds the boxes.

import { useState } from 'react'
import {
  DILUTION_KINDS,
  MASS_UNITS,
  MOLAR_UNITS,
  VOLUME_UNITS,
  bestUnit,
  calcText,
  formulaWeight,
  readNumber,
  solveDilution,
  solveMolarity,
  unitOf,
  type DilutionKind,
  type DilutionUnknown,
  type MolarityUnknown,
  type Unit,
} from '../model/calc'
import { lookupCompound, type Compound } from '@biosketch/chem'
import { useEditor } from '../store'
import { Modal } from './Dialogs'
import { Tabs } from './Tabs'

type Tab = 'molarity' | 'dilution' | 'weight'

const close = () => useEditor.setState({ dialog: null })

/** A number box with its unit. Shows the answer, read-only, when it is the quantity worked out. */
function Quantity(props: { label: string; units: Unit[]; unit: string; onUnit: (u: string) => void; text: string; onText: (t: string) => void; answer?: string | null; hint?: string }) {
  const bad = props.answer === undefined && Number.isNaN(readNumber(props.text) as number)
  return (
    <div className={`calc-row${props.answer !== undefined ? ' answer' : ''}`}>
      <span className="field-label">{props.label}</span>
      {props.answer !== undefined ? (
        <output className="calc-answer" aria-live="polite">
          {props.answer ?? '–'}
        </output>
      ) : (
        <input inputMode="decimal" aria-label={props.label} aria-invalid={bad} value={props.text} placeholder={props.hint} onChange={(e) => props.onText(e.target.value)} />
      )}
      {props.units.length > 1 ? (
        <select aria-label={`Unit of ${props.label.toLowerCase()}`} value={props.unit} onChange={(e) => props.onUnit(e.target.value)}>
          {props.units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.label}
            </option>
          ))}
        </select>
      ) : (
        <span className="calc-unit">{props.units[0].label}</span>
      )}
    </div>
  )
}

function Choose<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented wrap" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} className={value === o.value ? 'active' : ''} aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** A typed number in base units, or undefined when the box is empty or unreadable. */
const base = (text: string, unit: Unit): number | undefined => {
  const n = readNumber(text)
  return n === undefined || Number.isNaN(n) ? undefined : n * unit.factor
}

function Molarity({ mw, setMw }: { mw: string; setMw: (t: string) => void }) {
  const [unknown, setUnknown] = useState<MolarityUnknown>('mass')
  const [mass, setMass] = useState('')
  const [massUnit, setMassUnit] = useState('g')
  const [conc, setConc] = useState('150')
  const [concUnit, setConcUnit] = useState('mM')
  const [volume, setVolume] = useState('500')
  const [volumeUnit, setVolumeUnit] = useState('mL')
  const units = { mass: unitOf(MASS_UNITS, massUnit), conc: unitOf(MOLAR_UNITS, concUnit), volume: unitOf(VOLUME_UNITS, volumeUnit) }
  const result = solveMolarity(unknown, {
    mass: base(mass, units.mass),
    conc: base(conc, units.conc),
    volume: base(volume, units.volume),
    mw: readNumber(mw),
  })
  // The answer in the unit chosen for it; when that needs many digits, also in a handier unit.
  const answer = (list: Unit[], unit: Unit): string | null => {
    if (result === null) return null
    const shown = result / unit.factor
    if (shown >= 0.01 && shown < 100000) return calcText(shown)
    const better = bestUnit(list, result)
    return `${calcText(shown)}  (= ${calcText(result / better.factor)} ${better.label})`
  }
  return (
    <div className="calc">
      <p className="hint">Choose what to work out, then fill in the other three.</p>
      <Choose
        label="Work out"
        value={unknown}
        onChange={setUnknown}
        options={[
          { value: 'mass', label: 'Mass to weigh' },
          { value: 'conc', label: 'Concentration' },
          { value: 'volume', label: 'Volume' },
          { value: 'mw', label: 'Molecular weight' },
        ]}
      />
      <Quantity label="Mass" units={MASS_UNITS} unit={massUnit} onUnit={setMassUnit} text={mass} onText={setMass} answer={unknown === 'mass' ? answer(MASS_UNITS, units.mass) : undefined} />
      <Quantity label="Concentration" units={MOLAR_UNITS} unit={concUnit} onUnit={setConcUnit} text={conc} onText={setConc} answer={unknown === 'conc' ? answer(MOLAR_UNITS, units.conc) : undefined} />
      <Quantity label="Volume" units={VOLUME_UNITS} unit={volumeUnit} onUnit={setVolumeUnit} text={volume} onText={setVolume} answer={unknown === 'volume' ? answer(VOLUME_UNITS, units.volume) : undefined} />
      <Quantity
        label="Molecular weight"
        units={[{ id: 'g/mol', label: 'g/mol', factor: 1 }]}
        unit="g/mol"
        onUnit={() => undefined}
        text={mw}
        onText={setMw}
        hint="from the bottle, or the third tab"
        answer={unknown === 'mw' ? (result === null ? null : calcText(result)) : undefined}
      />
      <p className="hint">mass = concentration × volume × molecular weight</p>
    </div>
  )
}

function Dilution() {
  const [kind, setKind] = useState<DilutionKind>('fold')
  const [unknown, setUnknown] = useState<DilutionUnknown>('v1')
  const [text, setText] = useState({ c1: '10', v1: '', c2: '1', v2: '50' })
  const [cUnit, setCUnit] = useState<{ c1: string; c2: string }>({ c1: 'x', c2: 'x' })
  const [vUnit, setVUnit] = useState({ v1: 'mL', v2: 'mL' })
  const changeKind = (k: DilutionKind) => {
    setKind(k)
    const first = DILUTION_KINDS[k].find((u) => ['mM', 'mg/mL', 'x'].includes(u.id)) ?? DILUTION_KINDS[k][0]
    setCUnit({ c1: first.id, c2: first.id })
  }
  // The example it opens with: a 10× stock made up to 50 mL of 1×.
  const shownKind = kind
  const u = { c1: unitOf(DILUTION_KINDS[shownKind], cUnit.c1), c2: unitOf(DILUTION_KINDS[shownKind], cUnit.c2), v1: unitOf(VOLUME_UNITS, vUnit.v1), v2: unitOf(VOLUME_UNITS, vUnit.v2) }
  const values = { c1: base(text.c1, u.c1), v1: base(text.v1, u.v1), c2: base(text.c2, u.c2), v2: base(text.v2, u.v2) }
  const result = solveDilution(unknown, values)
  const shown = result === null ? null : calcText(result / u[unknown].factor)
  const field = (key: DilutionUnknown, label: string) => {
    const isConc = key === 'c1' || key === 'c2'
    return (
      <Quantity
        label={label}
        units={isConc ? DILUTION_KINDS[shownKind] : VOLUME_UNITS}
        unit={isConc ? cUnit[key] : vUnit[key]}
        onUnit={(id) => (isConc ? setCUnit({ ...cUnit, [key]: id }) : setVUnit({ ...vUnit, [key]: id }))}
        text={text[key]}
        onText={(t) => setText({ ...text, [key]: t })}
        answer={unknown === key ? shown : undefined}
      />
    )
  }
  const stockVolume = unknown === 'v1' && result !== null && values.v2 !== undefined ? values.v2 - result : null
  return (
    <div className="calc">
      <Choose
        label="Concentrations in"
        value={shownKind}
        onChange={changeKind}
        options={[
          { value: 'molar', label: 'Molar (mM, µM…)' },
          { value: 'mass', label: 'Mass per volume' },
          { value: 'fold', label: 'Fold (10×)' },
        ]}
      />
      <Choose
        label="Work out"
        value={unknown}
        onChange={setUnknown}
        options={[
          { value: 'v1', label: 'Stock to take' },
          { value: 'c1', label: 'Stock strength' },
          { value: 'c2', label: 'Final strength' },
          { value: 'v2', label: 'Final volume' },
        ]}
      />
      {field('c1', 'Stock concentration (C1)')}
      {field('v1', 'Stock volume (V1)')}
      {field('c2', 'Final concentration (C2)')}
      {field('v2', 'Final volume (V2)')}
      {result === null && Object.entries(values).filter(([k, v]) => k !== unknown && v !== undefined).length === 3 && <p className="notice">These numbers cannot be a dilution: the final solution would be stronger than the stock.</p>}
      {stockVolume !== null && stockVolume > 0 && (
        <p className="hint">
          Take {shown} {u.v1.label} of stock and add {calcText(stockVolume / u.v2.factor)} {u.v2.label} of diluent.
        </p>
      )}
      <p className="hint">C1 × V1 = C2 × V2</p>
    </div>
  )
}

function Weight({ onUse }: { onUse: (mw: number) => void }) {
  const [formula, setFormula] = useState('C4H11NO3')
  const [name, setName] = useState('')
  const [found, setFound] = useState<Compound | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  let weight: number | null = null
  let problem = ''
  try {
    weight = formula.trim() ? formulaWeight(formula).mw : null
  } catch (e) {
    problem = e instanceof Error ? e.message : String(e)
  }
  const look = async () => {
    setBusy(true)
    setError('')
    setFound(null)
    try {
      setFound(await lookupCompound(name))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
    setBusy(false)
  }
  return (
    <div className="calc">
      <label className="field">
        <span className="field-label">From a formula</span>
        <input value={formula} spellCheck={false} placeholder="C6H12O6, CuSO4·5H2O, Ca(OH)2" onChange={(e) => setFormula(e.target.value)} />
      </label>
      {problem ? (
        <p className="notice">{problem}</p>
      ) : (
        weight !== null && (
          <div className="calc-result">
            <strong>{calcText(weight)} g/mol</strong>
            <button className="btn small" onClick={() => onUse(weight!)}>
              Use for molarity
            </button>
          </div>
        )
      )}
      <p className="hint">Worked out in your browser from IUPAC's standard atomic weights. Counts after brackets and water of crystallisation (·5H2O) are understood.</p>
      <div className="field">
        <span className="field-label">Or look up a name in PubChem</span>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault()
            void look()
          }}
        >
          <input value={name} aria-label="Name of a compound" placeholder="Tris, glucose, HEPES" onChange={(e) => setName(e.target.value)} />
          <button className="btn small" type="submit" disabled={busy || !name.trim()}>
            {busy ? 'Looking up…' : 'Look up'}
          </button>
        </form>
      </div>
      {error && <p className="notice">{error}</p>}
      {found && (
        <div className="calc-result">
          <span>
            <strong>{found.title}</strong>, {found.formula}: <strong>{calcText(found.mw)} g/mol</strong>
          </span>
          <button className="btn small" onClick={() => onUse(found.mw)}>
            Use for molarity
          </button>
        </div>
      )}
      <p className="hint">Only the name you type is sent to PubChem (NCBI), and only when you press Look up. A salt or hydrate on your bottle can weigh more than the compound PubChem finds: check the label.</p>
    </div>
  )
}

export function CalculatorsDialog() {
  const [tab, setTab] = useState<Tab>('molarity')
  const [mw, setMw] = useState('58.44')
  return (
    <Modal title="Lab calculators" onClose={close}>
      <Tabs
        label="Calculators"
        tab={tab}
        onTab={setTab}
        tabs={[
          { id: 'molarity', label: 'Molarity', title: 'How much to weigh for a solution' },
          { id: 'dilution', label: 'Dilution', title: 'How much stock to take (C1V1 = C2V2)' },
          { id: 'weight', label: 'Molecular weight', title: 'From a formula, or a name looked up in PubChem' },
        ]}
      />
      {tab === 'molarity' && <Molarity mw={mw} setMw={setMw} />}
      {tab === 'dilution' && <Dilution />}
      {tab === 'weight' && (
        <Weight
          onUse={(w) => {
            setMw(calcText(w))
            setTab('molarity')
          }}
        />
      )}
    </Modal>
  )
}
