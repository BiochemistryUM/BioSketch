// The right-hand panel: settings for whatever is selected, or for the page and the active tool.

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import {
  addChart,
  addTable,
  addPanelLetter,
  alignSelection,
  deleteSelection,
  distributeSelection,
  duplicateSelection,
  groupSelection,
  lockSelection,
  orderSelection,
  patchDoc,
  patchSelection,
  resizeAsPicture,
  ungroupSelection,
  unlockAll,
  addPanels,
  removeGuides,
} from '../actions'
import { MISSING_ICON, nameFromId, getIcon } from '../icons/library'
import { extractColors, isHexColor, normalizeHex } from '../icons/svg'
import { finishReshape, startReshape } from '../icons/reshape'
import { splitIcon } from '../icons/split'
import { placeImageFile } from '../io/images'
import { removeNodes } from '../model/doc'
import { MAX_NOTES, MAX_STEPS, colourSlides, slideList, slideSteps } from '../model/slides'
import { TABLE_FONT, TABLE_HEAD_FILL, cellsText, fitTable, readCells, type TableLines } from '../model/table'
import { SYMBOL_GROUPS, insertText, wrapSelection } from '../model/richtext'
import { SHAPE_KINDS, shapePath } from '../model/shapes'
import {
  MAX_BRACKETS, MAX_REF_LINES, NAME_MAX, POINT_NAMES_TOP, POINT_OPACITY_MIN, POINT_SIZE_MAX, POINT_SIZE_MIN,
  VALUE_DECIMALS_MAX,
  bracketLabel, carryOver, chartAdvice, chartCategories, chartFamily, renameCategory, renameSeries, renameVenn, valueText, chartAnalysis, chartLayout, isSurvival, hazardText, logRankText, survivalOf, survivalText, compareCurves, comparisonText, corrText, curveMethodsText, doseText, heldPlateaus, methodsText, chartSamples, chartSeries, crossTable, hasPoints, headRows, isGrouped, pointNamesIn, pointStyle, readTable, scatterFits, shownValues, splitNameList, stats, tableText, usablePointNames, usableValueLabels, usualValueLabel, withTestBrackets,
  type Renamed,
  type TableReport,
} from '../model/chart'
import { INSTRUCTION_EXAMPLES, applyInstruction } from '../model/chartCommands'
import { HEAT_SCALES, heatColour, heatMatrix, heatSummary } from '../model/heatmap'
import { PALETTES, paletteColours } from '../model/palettes'
import { regionName, vennOf } from '../model/venn'
import { TABLE_ACCEPT, tableFromFile } from '../io/tables'
import { boxStats } from '../model/chartStats'
import { STARS_KEY, TEST_DOES, TEST_NAMES, TEST_SHORT, pText, stars, testFor } from '../model/chartTests'
import { reversed } from '../model/connector'
import { DASH_SCALE_MAX, DASH_SCALE_MIN, dashArray, hasDots, lineStyleOf, lineStylePatch, type Dashable, type LineStyle } from '../model/dash'
import { growToFitLabel, realignText, SHAPE_LABEL_DEFAULT, TEXT_WIDTH_MAX, TEXT_WIDTH_MIN, textBoxed, textBulleted } from '../model/nodes'
import type { ChartBracket, ChartGroup, ChartKind, ChartNode, ChartPointNames, ChartRefLine, ChartTest, ChartValueLabels, ConnectorFade, ConnectorKind, ConnectorNode, FigNode, FontFamily, HeatScale, IconNode, ImageNode, LegendPlace, MembraneNode, PointShape, ShapeKind, ShapeNode, StrokeNode, TextAlign, TextNode, TableNode } from '../model/types'
import { toast, useEditor } from '../store'
import { CHART_TABS, chartTabs, lastChartTab, openTab, rememberChartTab, settingFor, stepTab, type ChartTab } from './chartTabs'
import { copyText } from './copy'
import { PANEL_LAYOUTS, type PanelLayout } from '../model/panels'
import { ObjectsList } from './ObjectsList'
import { Icon, type IconName } from './Icon'
import { Info } from './Info'

// ---------- small form parts ----------

/** The marks that format a label, as they are typed. */
const MARKS = 'Ca^{2+}, H_{2}O, *italic* and **bold**'

/** A setting with its name above it. With `info`, an "i" beside the name opens a note that explains the setting. */
function Field({ label, info, setting, children }: { label: string; info?: ReactNode; setting?: string; children: ReactNode }) {
  // A button inside a <label> would become the control the label stands for, so a field with a note is a plain group.
  if (info) {
    return (
      <div className="field" role="group" aria-label={label} data-setting={setting}>
        <span className="field-head">
          <span className="field-label">{label}</span>
          <Info about={label}>{info}</Info>
        </span>
        {children}
      </div>
    )
  }
  return (
    <label className="field" data-setting={setting}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  )
}

function ColorInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <input
      type="color"
      className="color"
      aria-label={label}
      title={label}
      value={isHexColor(value) ? normalizeHex(value) : '#000000'}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function NumberInput(props: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; label: string }) {
  // While typing, the field shows exactly what was typed; a half-typed number ("1" on the way to "12")
  // is not forced into range until the field is left.
  const [draft, setDraft] = useState<string | null>(null)
  const min = props.min ?? -Infinity
  const max = props.max ?? Infinity
  return (
    <input
      type="number"
      inputMode="decimal"
      className="number"
      aria-label={props.label}
      value={draft ?? String(Math.round(props.value * 10) / 10)}
      min={props.min}
      max={props.max}
      step={props.step ?? 1}
      onChange={(e) => {
        setDraft(e.target.value)
        const v = Number(e.target.value)
        if (e.target.value !== '' && Number.isFinite(v) && v >= min && v <= max) props.onChange(v)
      }}
      onBlur={() => {
        if (draft === null) return
        const v = Number(draft)
        if (draft !== '' && Number.isFinite(v)) props.onChange(Math.min(max, Math.max(min, v)))
        setDraft(null)
      }}
    />
  )
}

function Range(props: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number; label: string }) {
  return (
    <input
      type="range"
      aria-label={props.label}
      value={props.value}
      min={props.min}
      max={props.max}
      step={props.step ?? 1}
      onChange={(e) => props.onChange(Number(e.target.value))}
    />
  )
}

/** A slider for the thickness of a line or outline, with the current value in its label. */
function Thickness(props: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <Field label={`${props.label} ${props.value}`}>
      <Range label={props.label} value={props.value} min={props.min ?? 0.5} max={props.max ?? 12} step={0.5} onChange={props.onChange} />
    </Field>
  )
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  )
}

const NAME_SHOW: { value: ChartPointNames['show']; label: string; title: string }[] = [
  { value: 'table', label: 'All named', title: 'Write the name of every point that has one in the table' },
  { value: 'top', label: 'Top', title: 'Write the names of the most striking points only' },
  { value: 'none', label: 'None', title: 'Write no names' },
]

/** Which names of points a scatter chart writes: all named points, the top ones, or none, from chosen series and sides. */
function PointNamesField({ node, set }: { node: ChartNode; set: (change: Partial<ChartNode>, merge?: string) => void }) {
  const setting = usablePointNames(node.pointNames) ?? { show: 'table' as const }
  const known = pointNamesIn(node.groups)
  const [draft, setDraft] = useState<string | null>(null)
  const update = (change: Partial<ChartPointNames>, merge?: string) => set({ pointNames: usablePointNames({ ...setting, ...change }) }, merge)
  const seriesNames = [...new Set(node.groups.filter((g) => g.labels?.some(Boolean)).map((g) => g.name))]
  const allSeries = node.groups.map((g) => g.name)
  const from = setting.series ?? allSeries
  return (
    <Field
      label="Names of points"
      info={
        <>
          <p>Names come from a column of names before the x values in the table: genes, proteins, samples. Keep every name in the table and choose here which ones the chart writes.</p>
          <p>
            <b>Top</b> writes the names of the most striking points. <i>Far out</i> ranks by distance from x = 0 at the bottom of the plot, so in a volcano plot a large change and a small p count together; <i>Highest</i> ranks by y alone (smallest p); <i>Furthest from x = 0</i> by x alone (largest change, up or down).
          </p>
          <p>Sides: right of x = 0 is up-regulated in a volcano plot, left is down-regulated. “Top on each side” writes the top number of names on both sides.</p>
          <p>Names typed under “Always name” are written whatever their rank or series. At most 100 names are written.</p>
        </>
      }
    >
      {!known.length ? (
        <p className="hint">No point has a name. Put a column of names (genes, samples) before the x values in the table.</p>
      ) : (
        <>
          <Segmented label="Which names to write" value={setting.show} options={NAME_SHOW} onChange={(show) => update({ show })} />
          {setting.show === 'top' && (
            <div className="row">
              <NumberInput label="How many names" value={setting.top ?? POINT_NAMES_TOP} min={1} max={100} onChange={(top) => update({ top: Math.round(top) }, 'chart-names-top')} />
              <select aria-label="Rank points by" value={setting.by ?? 'distance'} onChange={(e) => update({ by: e.target.value as ChartPointNames['by'] })}>
                <option value="distance">Far out (volcano)</option>
                <option value="y">Highest</option>
                <option value="x">Furthest from x = 0</option>
              </select>
            </div>
          )}
          {setting.show !== 'none' && (
            <>
              <select aria-label="Which side of x = 0" value={setting.side ?? 'both'} onChange={(e) => update({ side: e.target.value === 'both' ? undefined : (e.target.value as ChartPointNames['side']) })}>
                <option value="both">Both sides{setting.show === 'top' ? ' together' : ''}</option>
                {setting.show === 'top' && <option value="each">Top on each side</option>}
                <option value="up">Right of x = 0 only (up)</option>
                <option value="down">Left of x = 0 only (down)</option>
              </select>
              {allSeries.length > 1 && (
                <>
                  <span className="sub-label">From</span>
                  {allSeries.map((name) => (
                    <Check key={name} checked={from.includes(name)} onChange={(on) => update({ series: on ? [...from.filter((n) => n !== name), name].sort((a, b) => allSeries.indexOf(a) - allSeries.indexOf(b)) : from.filter((n) => n !== name) })}>
                      {name}
                      {seriesNames.includes(name) ? '' : ' (no names)'}
                    </Check>
                  ))}
                </>
              )}
              <span className="sub-label">Always name</span>
              <input
                className="text-input"
                aria-label="Names always written, separated by commas"
                placeholder="e.g. Egf, Lif, Csf1"
                value={draft ?? (setting.always ?? []).join(', ')}
                onChange={(e) => {
                  setDraft(e.target.value)
                  update({ always: splitNameList(e.target.value, known) }, 'chart-names-always')
                }}
                onBlur={() => setDraft(null)}
              />
            </>
          )}
        </>
      )}
    </Field>
  )
}

function IconButton(props: { icon: IconName; label: string; onClick: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <button
      className={`icon-only${props.active ? ' active' : ''}`}
      aria-label={props.label}
      aria-pressed={props.active}
      title={props.label}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      <Icon name={props.icon} size={18} />
    </button>
  )
}

function Segmented<T extends string>({ value, options, onChange, label, wrap }: { value: T; options: { value: T; label: string; title?: string }[]; onChange: (v: T) => void; label: string; wrap?: boolean }) {
  return (
    <div className={`segmented${wrap ? ' wrap' : ''}`} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} className={value === o.value ? 'active' : ''} aria-pressed={value === o.value} title={o.title ?? o.label} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Section({ title, info, children }: { title: string; info?: ReactNode; children: ReactNode }) {
  const id = useId()
  return (
    <section className="section" aria-labelledby={id}>
      <div className="section-head">
        <h2 id={id}>{title}</h2>
        {info && <Info about={title}>{info}</Info>}
      </div>
      {children}
    </section>
  )
}

const KIND_OPTIONS: { value: ConnectorKind; label: string; title: string }[] = [
  { value: 'arrow', label: '→', title: 'Activation / leads to' },
  { value: 'inhibit', label: '⊣', title: 'Inhibition' },
  { value: 'dot', label: '─●', title: 'Round end / binds or acts on' },
  { value: 'line', label: '—', title: 'Plain line / association' },
  { value: 'double', label: '↔', title: 'Reversible / binding' },
]

const LINE_OPTIONS: { value: LineStyle; title: string }[] = [
  { value: 'solid', title: 'Solid line' },
  { value: 'dashed', title: 'Dashed (on an arrow: indirect effect or transport)' },
  { value: 'dotted', title: 'Dotted' },
  { value: 'long', title: 'Long dashes' },
  { value: 'dashdot', title: 'Dash and dot' },
]

/** A short sample of a line style, drawn with the same dash pattern the figure uses. */
function LineSample({ style }: { style: LineStyle }) {
  const sample = { ...lineStylePatch(style), strokeWidth: 2, dashScale: 0.6 }
  return (
    <svg width="30" height="10" viewBox="0 0 30 10" aria-hidden="true">
      <line x1="2" y1="5" x2="28" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap={hasDots(sample) ? 'round' : 'butt'} strokeDasharray={dashArray(sample)} />
    </svg>
  )
}

/** Line style of an arrow or an outline: the pattern, and for broken lines the size of the dashes. */
function LineStyleControl({ label, value, onStyle, onScale }: { label: string; value: Dashable; onStyle: (style: LineStyle) => void; onScale?: (scale: number) => void }) {
  const style = lineStyleOf(value)
  const scale = value.dashScale ?? 1
  return (
    <>
      <Field label={label}>
        <div className="segmented line-styles" role="group" aria-label={label}>
          {LINE_OPTIONS.map((o) => (
            <button key={o.value} className={style === o.value ? 'active' : ''} aria-pressed={style === o.value} aria-label={o.title} title={o.title} onClick={() => onStyle(o.value)}>
              <LineSample style={o.value} />
            </button>
          ))}
        </div>
      </Field>
      {style !== 'solid' && onScale && (
        <Field label={`${style === 'dotted' ? 'Dot spacing' : 'Dash size'} ${Math.round(scale * 100)}%`}>
          <Range label={style === 'dotted' ? 'Dot spacing' : 'Dash size'} value={scale} min={DASH_SCALE_MIN} max={DASH_SCALE_MAX} step={0.25} onChange={onScale} />
        </Field>
      )}
    </>
  )
}

const FADE_OPTIONS: { value: 'none' | ConnectorFade; label: string; title: string }[] = [
  { value: 'none', label: 'Solid', title: 'One solid colour along the whole line' },
  { value: 'in', label: 'Fades in', title: 'Faint at the start, solid at the end' },
  { value: 'out', label: 'Fades out', title: 'Solid at the start, faint at the end' },
]


const ROUTE_OPTIONS: { value: 'straight' | 'elbow'; label: string; title: string }[] = [
  { value: 'straight', label: 'Straight', title: 'A straight line; drag the diamond to curve it' },
  { value: 'elbow', label: 'Right-angled', title: 'Horizontal and vertical segments; drag the diamond to move the middle one' },
]

const SHAPE_NAMES: Record<ShapeKind, string> = {
  roundrect: 'Rounded box',
  rect: 'Box',
  ellipse: 'Ellipse',
  triangle: 'Triangle',
  diamond: 'Diamond',
  hexagon: 'Hexagon',
  cylinder: 'Cylinder',
  callout: 'Callout',
  bracket: 'Bracket',
}

/** A small drawing of a shape kind, made from the same outline the figure uses. */
function ShapeSample({ kind }: { kind: ShapeKind }) {
  const [x, y, w, h] = kind === 'bracket' ? [10, 2, 8, 18] : [2, 2, 24, 18]
  const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
  const path = shapePath(kind, x, y, w, h)
  return (
    <svg width="28" height="22" viewBox="0 0 28 22" aria-hidden="true">
      {path ? <path d={path} {...line} /> : kind === 'ellipse' ? <ellipse cx={14} cy={11} rx={12} ry={9} {...line} /> : <rect x={x} y={y} width={w} height={h} rx={kind === 'roundrect' ? 5 : 0} {...line} />}
    </svg>
  )
}

/** Choose a kind of shape from small drawings of each. */
function ShapePicker({ value, onChange }: { value: ShapeKind; onChange: (kind: ShapeKind) => void }) {
  return (
    <div className="shape-picker" role="group" aria-label="Shape type">
      {SHAPE_KINDS.map((kind) => (
        <button key={kind} className={value === kind ? 'active' : ''} aria-pressed={value === kind} aria-label={SHAPE_NAMES[kind]} title={SHAPE_NAMES[kind]} onClick={() => onChange(kind)}>
          <ShapeSample kind={kind} />
        </button>
      ))}
    </div>
  )
}

/**
 * Symbols that are not on most keyboards (Greek letters, arrows, maths, marks), one tap each.
 * `onPick` receives the symbol; where it goes is up to the text box that owns the picker.
 */
function SymbolPicker({ onPick }: { onPick: (symbol: string) => void }) {
  return (
    <details className="symbols">
      <summary>Symbols (α, →, ±, °)</summary>
      {SYMBOL_GROUPS.map((group) => (
        <div key={group.title} className="symbol-group" role="group" aria-label={group.title}>
          {group.symbols.map((symbol) => (
            <button key={symbol} className="symbol" aria-label={`Insert ${symbol}`} title={`Insert ${symbol} (${group.title.toLowerCase()})`} onClick={() => onPick(symbol)}>
              {symbol}
            </button>
          ))}
        </div>
      ))}
    </details>
  )
}

/**
 * Put a symbol into a text box at the cursor (or at the end when the box was never used), hand
 * the new text to `apply`, and leave the cursor after the symbol so the next one follows it.
 */
function insertSymbol(el: HTMLTextAreaElement | null, current: string, symbol: string, apply: (text: string) => void): void {
  const start = el ? el.selectionStart : current.length
  const end = el ? el.selectionEnd : current.length
  const next = insertText(current, start, end, symbol)
  apply(next.text)
  requestAnimationFrame(() => {
    if (!el) return
    el.focus()
    el.setSelectionRange(next.caret, next.caret)
  })
}

/** Change every selected object of one type: by the fields given, or by what a function makes of each. */
function patch<T extends FigNode>(type: T['type'], change: Partial<T> | ((node: T) => T), merge?: string): void {
  patchSelection((n) => (n.type !== type ? n : typeof change === 'function' ? change(n as T) : ({ ...n, ...change } as FigNode)), merge)
}

// ---------- per-type sections ----------

function IconProps({ node, single }: { node: IconNode; single: boolean }) {
  const doc = useEditor((s) => s.doc)
  const def = getIcon(doc, node.iconId)
  const reshaping = useEditor((s) => s.reshape?.nodeId === node.id)
  const colors = def ? extractColors(def.body).slice(0, 10) : []
  if (!def) {
    return (
      <Section title={MISSING_ICON}>
        <p className="notice">
          The drawing of this icon{nameFromId(node.iconId) ? ` (“${nameFromId(node.iconId)}”)` : ''} is not in the figure any more, so a dashed box stands in its place, on the page and in exports. BioSketch’s own
          drawings were taken out in November 2026; the library now holds the NIH, Bioicons and Servier collections.
        </p>
        <p className="hint">{single ? 'With this box selected, tap an icon in the library: it takes this place and size.' : 'Select one box at a time, then tap an icon in the library: it takes that place and size.'}</p>
      </Section>
    )
  }
  return (
    <Section title={def.name}>
      {colors.length > 0 && (
        <Field label="Colours">
          <div className="swatches">
            {colors.map((c) => (
              <ColorInput
                key={c}
                label={`Replace colour ${c}`}
                value={node.colors?.[c] ?? c}
                onChange={(v) =>
                  patchSelection((n) => {
                    if (n.type !== 'icon' || n.iconId !== node.iconId) return n
                    const next = { ...n.colors, [c]: v }
                    if (v === c) delete next[c]
                    return { ...n, colors: Object.keys(next).length ? next : undefined }
                  }, `icon-color-${c}`)
                }
              />
            ))}
          </div>
        </Field>
      )}
      {def && /stroke/.test(def.body) && (
        <Field label={`Outline thickness ${Math.round((node.strokeScale ?? 1) * 100)}%`}>
          <Range
            label="Outline thickness of the icon"
            value={Math.round((node.strokeScale ?? 1) * 100)}
            min={25}
            max={400}
            step={25}
            onChange={(v) => patch<IconNode>('icon', { strokeScale: v === 100 ? undefined : v / 100 }, 'icon-sw')}
          />
        </Field>
      )}
      <div className="row">
        <IconButton icon="flipH" label="Flip horizontally" active={!!node.flipX} onClick={() => patch<IconNode>('icon', { flipX: !node.flipX || undefined })} />
        <IconButton icon="flipV" label="Flip vertically" active={!!node.flipY} onClick={() => patch<IconNode>('icon', { flipY: !node.flipY || undefined })} />
        {node.colors && (
          <button className="btn small" onClick={() => patch<IconNode>('icon', { colors: undefined })}>
            Reset colours
          </button>
        )}
      </div>
      {def && def.license && !/^cc0/i.test(def.license) && (
        <p className="hint">
          {def.license}
          {def.author ? ` · ${def.author}` : ''}
        </p>
      )}
      {single && reshaping && (
        <>
          <div className="row wrap">
            <button className="btn small primary" onClick={finishReshape}>
              Done reshaping
            </button>
            <Info about="Reshaping an icon">
              <p>Drag the points to change the outline. Curves next to a point follow it.</p>
            </Info>
          </div>
        </>
      )}
      {single && !reshaping && (
        <>
          <div className="row wrap">
            <button className="btn small" onClick={() => splitIcon(node.id)}>
              <Icon name="ungroup" size={14} /> Split into parts
            </button>
            <button className="btn small" onClick={() => startReshape(node.id)}>
              <Icon name="pen" size={14} /> Reshape
            </button>
            <Info about="Split into parts and Reshape">
              <p>
                <b>Split into parts</b> turns the icon into separate pieces: double-tap a piece to select it alone, then move, stretch, turn, recolour or delete it.
              </p>
              <p>
                <b>Reshape</b> shows the points of the outline so you can drag them.
              </p>
            </Info>
          </div>
        </>
      )}
    </Section>
  )
}

function ShapeProps({ node, single }: { node: ShapeNode; single: boolean }) {
  const inside = useRef<HTMLTextAreaElement>(null)
  const noFill = node.fill === 'none'
  const label = node.label
  /** Change the words inside the shape; they are created on the first letter and removed with the last. */
  const setText = (text: string) =>
    patchSelection((n) => {
      if (n.type !== 'shape') return n
      const { label: old, ...rest } = n
      // A shape grows downwards when the words need more lines than fit.
      return text ? growToFitLabel({ ...rest, label: { ...(old ?? SHAPE_LABEL_DEFAULT), text } }) : rest
    }, 'shape-text')
  /** Change how the words look, on every selected shape that has some. */
  const setLabel = (change: Partial<NonNullable<ShapeNode['label']>>, merge?: string) =>
    patchSelection((n) => (n.type === 'shape' && n.label ? growToFitLabel({ ...n, label: { ...n.label, ...change } }) : n), merge)
  return (
    <Section title="Shape">
      <ShapePicker value={node.shape} onChange={(shape) => patch<ShapeNode>('shape', { shape })} />
      <div className="row">
        <Field label="Fill">
          <ColorInput label="Fill colour" value={noFill ? '#ffffff' : node.fill} onChange={(fill) => patch<ShapeNode>('shape', { fill }, 'shape-fill')} />
        </Field>
        <Field label="Outline">
          <ColorInput label="Outline colour" value={node.stroke} onChange={(stroke) => patch<ShapeNode>('shape', { stroke }, 'shape-stroke')} />
        </Field>
      </div>
      <Thickness label="Outline thickness" value={node.strokeWidth} min={0} max={Math.max(12, node.strokeWidth)} onChange={(strokeWidth) => patch<ShapeNode>('shape', { strokeWidth }, 'shape-sw')} />
      <Check checked={noFill} onChange={(v) => patch<ShapeNode>('shape', { fill: v ? 'none' : '#eaf2fb' })}>
        No fill
      </Check>
      <LineStyleControl
        label="Outline style"
        value={node}
        onStyle={(style) => patch<ShapeNode>('shape', lineStylePatch(style))}
        onScale={(dashScale) => patch<ShapeNode>('shape', { dashScale: dashScale === 1 ? undefined : dashScale }, 'shape-dash')}
      />
      {single && (
        <Field
          label="Text inside"
          info={
            <>
              <p>Type here, or double-tap the shape and type on the page. Press Enter for a new line.</p>
              <p>Long lines break to fit the shape, and the text stays in place when the shape is moved or resized.</p>
              <p>Marks format the text: {MARKS}.</p>
            </>
          }
        >
          <textarea
            ref={inside}
            className="text-input"
            aria-label="Text inside the shape"
            rows={Math.min(5, (label?.text.split('\n').length ?? 1) + 1)}
            value={label?.text ?? ''}
            placeholder="Type here, or double-tap the shape"
            onChange={(e) => setText(e.target.value)}
          />
          <SymbolPicker onPick={(symbol) => insertSymbol(inside.current, label?.text ?? '', symbol, setText)} />
        </Field>
      )}
      {label && (
        <div className="row">
          <Field label="Text size">
            <NumberInput label="Size of the text inside" value={label.fontSize} min={4} max={400} onChange={(fontSize) => setLabel({ fontSize }, 'shape-text-size')} />
          </Field>
          <Field label="Text colour">
            <ColorInput label="Colour of the text inside" value={label.fill} onChange={(fill) => setLabel({ fill }, 'shape-text-fill')} />
          </Field>
          <div className="segmented" role="group" aria-label="Style of the text inside">
            <button className={label.bold ? 'active' : ''} aria-pressed={!!label.bold} title="Bold text inside" onClick={() => setLabel({ bold: !label.bold || undefined })}>
              <b>B</b>
            </button>
            <button className={label.italic ? 'active' : ''} aria-pressed={!!label.italic} title="Italic text inside" onClick={() => setLabel({ italic: !label.italic || undefined })}>
              <i>I</i>
            </button>
          </div>
        </div>
      )}
      {label && (
        <>
          <Field label="Text position">
            <Segmented label="Position of the text inside" value={label.align ?? 'center'} options={ALIGN_OPTIONS} onChange={(align) => setLabel({ align: align === 'center' ? undefined : align })} />
          </Field>
          <Field label="Font type">
            <Segmented
              label="Font type of the text inside"
              value={label.fontFamily ?? 'sans'}
              options={FONT_OPTIONS}
              onChange={(fontFamily) => setLabel({ fontFamily: fontFamily === 'sans' ? undefined : fontFamily })}
            />
          </Field>
        </>
      )}
    </Section>
  )
}

const ALIGN_OPTIONS: { value: TextAlign; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Centre' },
  { value: 'right', label: 'Right' },
]

const FONT_OPTIONS: { value: FontFamily; label: string }[] = [
  { value: 'sans', label: 'Sans' },
  { value: 'serif', label: 'Serif' },
  { value: 'mono', label: 'Mono' },
]

function TextProps({ node, single }: { node: TextNode; single: boolean }) {
  const box = useRef<HTMLTextAreaElement>(null)
  const aligns: { value: TextAlign; label: string }[] = [
    { value: 'left', label: 'Left' },
    { value: 'center', label: 'Centre' },
    { value: 'right', label: 'Right' },
  ]
  /** Format the characters selected in the text box as superscript, subscript, italic or bold. */
  const format = (kind: 'sup' | 'sub' | 'italic' | 'bold') => {
    const el = box.current
    if (!el) return
    if (el.selectionStart === el.selectionEnd) {
      toast('Select the characters to format in the text box first.')
      return
    }
    const next = wrapSelection(node.text, el.selectionStart, el.selectionEnd, kind)
    patch<TextNode>('text', { text: next.text })
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(next.start, next.end)
    })
  }
  return (
    <Section
      title="Text"
      info={
        single ? (
          <>
            <p>Select characters in the box, then press a button to raise, lower, slant or embolden them.</p>
            <p>Or type the marks yourself: {MARKS}. A lone star stays a star, so significance marks (*, ***) can be typed as they are.</p>
          </>
        ) : undefined
      }
    >
      {single && (
        <>
          <textarea
            ref={box}
            className="text-input"
            aria-label="Text"
            rows={Math.min(6, node.text.split('\n').length + 1)}
            value={node.text}
            onChange={(e) => patch<TextNode>('text', { text: e.target.value }, 'text-edit')}
          />
          <div className="row wrap">
            <button className="btn small" title="Superscript the selected characters" aria-label="Superscript" onClick={() => format('sup')}>
              x<sup>2</sup>
            </button>
            <button className="btn small" title="Subscript the selected characters" aria-label="Subscript" onClick={() => format('sub')}>
              x<sub>2</sub>
            </button>
            <button className="btn small" title="Make the selected characters italic" aria-label="Italic for selected characters" onClick={() => format('italic')}>
              <i>Italic</i>
            </button>
            <button className="btn small" title="Make the selected characters bold" aria-label="Bold for selected characters" onClick={() => format('bold')}>
              <b>Bold</b>
            </button>
          </div>
          <SymbolPicker onPick={(symbol) => insertSymbol(box.current, node.text, symbol, (text) => patch<TextNode>('text', { text }, 'text-edit'))} />
        </>
      )}
      <div className="row">
        <Field label="Size">
          <NumberInput label="Font size" value={node.fontSize} min={4} max={400} onChange={(fontSize) => patch<TextNode>('text', { fontSize }, 'text-size')} />
        </Field>
        <Field label="Colour">
          <ColorInput label="Text colour" value={node.fill} onChange={(fill) => patch<TextNode>('text', { fill }, 'text-fill')} />
        </Field>
        <div className="segmented" role="group" aria-label="Style of the whole label">
          <button className={node.bold ? 'active' : ''} aria-pressed={!!node.bold} title="Whole label bold" onClick={() => patch<TextNode>('text', { bold: !node.bold || undefined })}>
            <b>B</b>
          </button>
          <button className={node.italic ? 'active' : ''} aria-pressed={!!node.italic} title="Whole label italic" onClick={() => patch<TextNode>('text', { italic: !node.italic || undefined })}>
            <i>I</i>
          </button>
        </div>
      </div>
      <Field label="Font type">
        <Segmented
          label="Font type"
          value={node.fontFamily ?? 'sans'}
          options={FONT_OPTIONS}
          onChange={(fontFamily) => patch<TextNode>('text', { fontFamily: fontFamily === 'sans' ? undefined : fontFamily })}
        />
      </Field>
      <Segmented label="Text alignment" value={node.align} options={aligns} onChange={(align) => patch<TextNode>('text', (n) => realignText(n, align))} />
      <Field
        label="Text box"
        info={
          <>
            <p>A label is as wide as its words and breaks only where you press Enter. A text box breaks its lines at the width you give it: drag the handle at its left or right side, or type the width.</p>
            <p>With the text tool, a press places a label and a drag across the page draws a text box.</p>
            <p>With bullet points every paragraph begins with a bullet, and its further lines are set in under its first.</p>
          </>
        }
      >
        <label className="check">
          <input type="checkbox" checked={!!node.width} onChange={(e) => patch<TextNode>('text', (n) => textBoxed(n, e.target.checked))} />
          <span>Break the lines at a width</span>
        </label>
        {!!node.width && <NumberInput label="Width of the text box" value={Math.round(node.width)} min={TEXT_WIDTH_MIN} max={TEXT_WIDTH_MAX} step={10} onChange={(width) => patch<TextNode>('text', (n) => (n.width ? { ...n, width } : n), 'text-width')} />}
        <label className="check">
          <input type="checkbox" checked={!!node.bullets} onChange={(e) => patch<TextNode>('text', (n) => textBulleted(n, e.target.checked))} />
          <span>Bullet points</span>
        </label>
      </Field>
    </Section>
  )
}

const TABLE_LINES: { value: TableLines; label: string }[] = [
  { value: 'grid', label: 'A grid' },
  { value: 'rows', label: 'Between the rows' },
  { value: 'rules', label: 'Three lines, as in a journal' },
  { value: 'none', label: 'None' },
]

/** A table: its cells as text to paste or type, and how it looks. */
function TableProps({ node }: { node: TableNode }) {
  // What is in the box while it is being typed in: turned back from the cells it would lose a half-typed row.
  const [draft, setDraft] = useState<string | null>(null)
  const file = useRef<HTMLInputElement>(null)
  const set = (change: Partial<TableNode>, merge?: string) => patch<TableNode>('table', change, merge)
  /** A change to what the table holds or how large its lettering is: the table is then as high as its rows need. */
  const refit = (change: Partial<TableNode>, merge?: string) => patch<TableNode>('table', (n) => fitTable({ ...n, ...change }), merge)
  const cols = Math.max(0, ...node.cells.map((r) => r.length))
  const onFile = async (picked: File | undefined) => {
    if (!picked) return
    try {
      const cells = readCells((await tableFromFile(picked)).text)
      if (!cells.length) throw new Error('This file holds no table.')
      setDraft(null)
      refit({ cells })
      toast(`Read ${cells.length} ${cells.length === 1 ? 'row' : 'rows'} from “${picked.name}”.`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'This file could not be read.')
    }
  }
  return (
    <Section title="Table">
      <Field
        label="Cells"
        info={
          <>
            <p>Copy the cells in your spreadsheet and paste them here, or read a CSV or Excel file. Typed by hand: a new line for each row, and a | between the cells of a row.</p>
            <p>The usual marks work in a cell: {MARKS}.</p>
            <p>A column that holds only numbers stands at the right, as in a printed table.</p>
          </>
        }
      >
        <textarea
          className="text-input table-cells"
          aria-label="Cells of the table"
          rows={Math.min(10, node.cells.length + 1)}
          wrap="off"
          spellCheck={false}
          value={draft ?? cellsText(node.cells)}
          onChange={(e) => {
            setDraft(e.target.value)
            const cells = readCells(e.target.value)
            if (cells.length) refit({ cells }, 'table-cells')
          }}
          onBlur={() => setDraft(null)}
        />
        <div className="row wrap">
          <button className="btn small" onClick={() => file.current?.click()}>
            <Icon name="open" size={14} /> Read a file…
          </button>
          <span className="hint">
            {node.cells.length} {node.cells.length === 1 ? 'row' : 'rows'}, {cols} {cols === 1 ? 'column' : 'columns'}
          </span>
        </div>
        <input
          ref={file}
          type="file"
          accept={TABLE_ACCEPT}
          hidden
          onChange={(e) => {
            void onFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </Field>
      <label className="check">
        <input type="checkbox" checked={node.header !== false} onChange={(e) => refit({ header: e.target.checked ? undefined : false })} />
        <span>The first row holds the names of the columns</span>
      </label>
      <label className="check">
        <input type="checkbox" checked={!!node.striped} onChange={(e) => set({ striped: e.target.checked || undefined })} />
        <span>Tint every second row</span>
      </label>
      <Field label="Lines">
        <select aria-label="Lines of the table" value={node.lines ?? 'grid'} onChange={(e) => set({ lines: e.target.value === 'grid' ? undefined : (e.target.value as TableNode['lines']) })}>
          {TABLE_LINES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </Field>
      <div className="row">
        <Field label="Text size">
          <NumberInput label="Size of the lettering of the table" value={node.fontSize ?? TABLE_FONT} min={4} max={200} onChange={(fontSize) => refit({ fontSize }, 'table-size')} />
        </Field>
        <Field label="Text">
          <ColorInput label="Colour of the lettering" value={node.color ?? '#1f2933'} onChange={(color) => set({ color }, 'table-color')} />
        </Field>
        {node.header !== false && (
          <Field label="Names">
            <ColorInput label="Ground of the row of names" value={node.headFill ?? TABLE_HEAD_FILL} onChange={(headFill) => set({ headFill }, 'table-head')} />
          </Field>
        )}
      </div>
      <button className="btn small" title="Make the table exactly as high as its rows need" onClick={() => patch<TableNode>('table', fitTable)}>
        Fit the height to the rows
      </button>
    </Section>
  )
}

/** What the scientist picks: a kind of chart, or survival curves (which read their table like a scatter chart). */
type ChartChoice = ChartKind | 'survival'

const CHART_OPTIONS: { value: ChartChoice; label: string; title: string }[] = [
  { value: 'bar', label: 'Bars', title: 'A bar for the mean of each group' },
  { value: 'dot', label: 'Dots', title: 'Every value as a dot, with a line at the mean' },
  { value: 'box', label: 'Box', title: 'Median, quartiles and whiskers of each group' },
  { value: 'violin', label: 'Violin', title: 'The spread of the values in each group as an outline' },
  { value: 'line', label: 'Line', title: 'The means joined by a line, in the order of the columns' },
  { value: 'scatter', label: 'Scatter', title: 'Pairs of x and y values as points' },
  { value: 'pie', label: 'Pie', title: 'The share of each group in the whole' },
  { value: 'heatmap', label: 'Heat map', title: 'The table as a grid of coloured cells (a matrix plot)' },
  { value: 'venn', label: 'Venn', title: 'What two or three sets share, from lists of names or from sizes' },
  { value: 'survival', label: 'Survival', title: 'Survival curves (Kaplan–Meier) from times and events' },
]

const ERROR_OPTIONS: { value: 'none' | 'sd' | 'sem'; label: string; title: string }[] = [
  { value: 'none', label: 'None', title: 'No error bars' },
  { value: 'sd', label: 'SD', title: 'Standard deviation' },
  { value: 'sem', label: 'SEM', title: 'Standard error of the mean' },
]

/** A number in three significant figures, without trailing zeros. */
const short = (v: number): string => String(Number(v.toPrecision(3)))

/** A number box that may be left empty (meaning "choose for me"). Accepts a decimal comma. */
function OptionalNumber({ label, value, placeholder, onChange }: { label: string; value: number | undefined; placeholder: string; onChange: (v: number | undefined) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <input
      type="text"
      inputMode="decimal"
      className="number"
      aria-label={label}
      placeholder={placeholder}
      value={draft ?? (value === undefined ? '' : String(value))}
      onChange={(e) => {
        setDraft(e.target.value)
        const text = e.target.value.trim().replace(',', '.')
        if (text === '') onChange(undefined)
        else if (Number.isFinite(Number(text))) onChange(Number(text))
      }}
      onBlur={() => setDraft(null)}
    />
  )
}

/** The ends of one axis and whether it is logarithmic. */
function AxisRange(props: { title: string; setting?: string; zero?: boolean; colours?: boolean; min: number | undefined; max: number | undefined; log: boolean; onMin: (v: number | undefined) => void; onMax: (v: number | undefined) => void; onLog: (v: boolean) => void }) {
  return (
    <Field
      label={props.title}
      setting={props.setting}
      info={
        <>
          {props.colours ? (
            <>
              <p>The values the lowest and the highest colour stand for. Leave a box empty and that end is chosen to fit the numbers; a scale of two colours then keeps its white middle at zero (on a logarithmic scale: at 1).</p>
              <p>A value beyond an end you set takes the colour of that end. Set the same range on several heat maps to make their colours comparable.</p>
              <p>Logarithmic: the colours follow the logarithm of the values, so that a doubling is the same step in colour everywhere. Values of zero or below cannot be shown and are left empty.</p>
            </>
          ) : (
            <>
              <p>Leave a box empty and that end of the axis is chosen to fit the numbers.{props.zero ? ' The axis then includes zero, so that the height of a bar means what it seems to.' : ''}</p>
              <p>A range you set cuts the data off at the edge of the plot: nothing is drawn beyond it.</p>
              <p>A logarithmic axis shows only values above zero.</p>
            </>
          )}
        </>
      }
    >
      <div className="row">
        <OptionalNumber label={`${props.title}: start`} value={props.min} placeholder="auto" onChange={props.onMin} />
        <span className="between">to</span>
        <OptionalNumber label={`${props.title}: end`} value={props.max} placeholder="auto" onChange={props.onMax} />
      </div>
      <Check checked={props.log} onChange={props.onLog}>
        Logarithmic
      </Check>
    </Field>
  )
}

const SHAPE_OPTIONS: { value: PointShape; label: string }[] = [
  { value: 'circle', label: '● Circle' },
  { value: 'square', label: '■ Square' },
  { value: 'triangle', label: '▲ Triangle' },
  { value: 'diamond', label: '◆ Diamond' },
]

const LEGEND_OPTIONS: { value: LegendPlace | 'right'; label: string }[] = [
  { value: 'right', label: 'Right of the plot' },
  { value: 'top', label: 'Above the plot' },
  { value: 'bottom', label: 'Below the plot' },
  { value: 'inside', label: 'Inside, top right' },
  { value: 'insideLeft', label: 'Inside, top left' },
  { value: 'none', label: 'Hidden' },
]

/** What a group is called in a list: its category first in a grouped chart. */
const groupName = (g: ChartGroup): string => (g.category ? `${g.category} · ${g.name}` : g.name)

const HEAD_OPTIONS: { value: '0' | '1' | '2'; label: string; title: string }[] = [
  { value: '0', label: 'None', title: 'The table starts with numbers: the groups are named for you' },
  { value: '1', label: 'One', title: 'The first row holds the names of the groups' },
  { value: '2', label: 'Two (grouped)', title: 'The first row holds the categories, the second the series: a grouped chart' },
]

/** What reading the table left out or had to guess, in plain words for the scientist. */
function tableNotices(report: TableReport): string[] {
  const notices: string[] = []
  if (report.unread) notices.push(`${report.unread} ${report.unread === 1 ? 'cell was' : 'cells were'} not read as ${report.unread === 1 ? 'a number' : 'numbers'} and left out (for example “${report.example}”).`)
  if (report.droppedValues || report.droppedGroups) {
    const parts = [report.droppedValues ? `${report.droppedValues} ${report.droppedValues === 1 ? 'value' : 'values'}` : '', report.droppedGroups ? `${report.droppedGroups} ${report.droppedGroups === 1 ? 'column' : 'columns'}` : ''].filter(Boolean)
    notices.push(`The table is larger than a chart takes: ${parts.join(' and ')} were left out${report.thinned ? ', spread evenly over the table so the shape of the cloud stays (every named point is kept)' : ''}.`)
  }
  if (report.commasUnclear) notices.push('Commas were read as decimal commas (1,234 is taken as 1.234). If yours separate thousands, remove them.')
  if (report.numericNames) notices.push('The names in the first row are all numbers. If that row holds values, choose “None” under “Rows of names”.')
  return notices
}

/**
 * A name of the chart that is typed over. What is typed stays in the box for as long as the box
 * has the focus, and goes into the chart whenever it is a name the chart can take: an empty box
 * changes nothing, and a name that is refused is said to be so under the box.
 */
function NameInput({ value, label, placeholder, onName }: { value: string; label: string; placeholder?: string; onName: (typed: string) => string | undefined }) {
  const [draft, setDraft] = useState<string | null>(null)
  const [problem, setProblem] = useState('')
  return (
    <>
      <input
        type="text"
        className="text-line name-input"
        aria-label={label}
        aria-invalid={!!problem}
        maxLength={NAME_MAX}
        placeholder={placeholder}
        value={draft ?? value}
        onChange={(e) => {
          setDraft(e.target.value)
          setProblem(onName(e.target.value) ?? '')
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
        onBlur={() => {
          setDraft(null)
          setProblem('')
        }}
      />
      {problem && (
        <span className="notice name-problem" role="status">
          {problem}
        </span>
      )}
    </>
  )
}

/**
 * The headings the settings of a chart are sorted under. One is open at a time; the arrow keys
 * move from one to the next, as in any row of tabs.
 */
function ChartTabBar({ id, tabs, tab, onTab, barRef }: { id: string; tabs: ChartTab[]; tab: ChartTab; onTab: (tab: ChartTab) => void; barRef: RefObject<HTMLDivElement | null> }) {
  return (
    <div className="tabs" role="tablist" aria-label="Settings of the chart" ref={barRef}>
      {CHART_TABS.filter((t) => tabs.includes(t.id)).map((t) => (
        <button
          key={t.id}
          role="tab"
          id={`${id}-${t.id}`}
          className={tab === t.id ? 'active' : ''}
          aria-selected={tab === t.id}
          aria-controls={`${id}-panel`}
          tabIndex={tab === t.id ? 0 : -1}
          title={t.title}
          onClick={() => onTab(t.id)}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
            e.preventDefault()
            const next = stepTab(tab, tabs, e.key === 'ArrowRight' ? 1 : -1)
            onTab(next)
            document.getElementById(`${id}-${next}`)?.focus()
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

function ChartProps({ node }: { node: ChartNode }) {
  // While the numbers are being typed the box shows exactly what was typed. That text is kept for
  // as long as the chart still holds the groups read from it; when they change in any other way
  // (undo, another kind of chart, a new colour) the box shows the chart's own table again.
  const [typed, setTyped] = useState<{ text: string; groups: ChartGroup[]; head?: 0 | 1 | 2; report: TableReport } | null>(null)
  const live = typed && typed.groups === node.groups ? typed : null
  const scatter = node.kind === 'scatter'
  const heat = node.kind === 'heatmap'
  const venn = node.kind === 'venn'
  // A scatter table and the lists of a Venn diagram have one row of names at most.
  const oneHead = scatter || venn
  const grouped = isGrouped(node)
  const set = (change: Partial<ChartNode>, merge?: string) => patch<ChartNode>('chart', change, merge)
  const ownHead = headRows(node.groups, node.kind)
  const shownText = live ? live.text : tableText(node.groups, node.kind)

  /** Read the table and put it in the chart. Colours and brackets stay with their groups. */
  const read = (text: string, chosen: 0 | 1 | 2 | undefined) => {
    // Unless the scientist said how many rows of names there are, the table keeps at least as
    // many as it had: a first row made of numbers (doses, time points) stays a row of names.
    const guess = readTable(text, node.kind)
    const head = Math.min(chosen ?? Math.max(guess.head, ownHead), oneHead ? 1 : 2) as 0 | 1 | 2
    const report = head === guess.head ? guess : readTable(text, node.kind, head)
    if (!report.groups.some((g) => g.values.length)) {
      setTyped({ text, groups: node.groups, head: chosen, report })
      return false
    }
    const carried = carryOver(node.groups, report.groups, node.brackets)
    setTyped({ text, groups: carried.groups, head: chosen, report })
    set({ groups: carried.groups, brackets: carried.brackets }, 'chart-data')
    if (carried.lost) toast(`${carried.lost === 1 ? 'A bracket was' : `${carried.lost} brackets were`} removed: ${carried.lost === 1 ? 'one of its groups is' : 'their groups are'} no longer in the table.`)
    return true
  }

  /** Put the table of a file (CSV, text or Excel) in the chart, as if it had been pasted. */
  const tableFile = useRef<HTMLInputElement>(null)
  const importTable = async (file: File) => {
    try {
      const table = await tableFromFile(file)
      const found = read(table.text, undefined)
      toast(found ? `Table read from “${file.name}”.${table.note ? ` ${table.note}` : ''}` : `No numbers were found in “${file.name}”.`)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'This file could not be read.')
    }
  }

  // Going to a scatter chart and back reads the table twice, which loses things. The chart as it
  // was before the crossing is remembered, and given back if nothing was changed in between.
  const crossed = useRef<{ before: ChartNode; result: ChartGroup[] } | null>(null)
  const onKind = (kind: ChartKind) => {
    if (chartFamily(kind) === chartFamily(node.kind)) return set({ kind })
    const back = crossed.current
    crossed.current = null
    if (back && back.result === node.groups) {
      const b = back.before
      return set({ kind: chartFamily(b.kind) === chartFamily(kind) ? kind : b.kind, groups: b.groups, brackets: b.brackets, test: b.test, refLines: b.refLines, fit: b.fit, curve: b.curve, doseBottom: b.doseBottom, doseTop: b.doseTop, corr: b.corr, xMin: b.xMin, xMax: b.xMax, xLog: b.xLog, pointNames: b.pointNames })
    }
    const result = crossTable(node.groups, node.kind, kind)
    crossed.current = { before: node, result }
    const across = refLines.filter((l) => l.axis === 'y')
    set({ kind, groups: result, brackets: undefined, test: undefined, fit: undefined, curve: undefined, doseBottom: undefined, doseTop: undefined, corr: undefined, xMin: undefined, xMax: undefined, xLog: undefined, pointNames: undefined, refLines: across.length ? across : undefined })
    toast(
      kind === 'scatter'
        ? 'A scatter chart reads the first column of the table as the x values. Choose another kind again to get your chart back.'
        : kind === 'venn'
          ? 'A Venn diagram reads every column as the names of the members of one set. Paste your lists under “Sets”, or choose another kind again to get your chart back.'
          : scatter
            ? 'The x values became the first group. Choose Scatter again to get your chart back.'
            : 'Every column is now read as the numbers of one group. Choose Venn again to get your diagram back.',
    )
  }

  /** Survival curves are a way of drawing a table with times in its first column: the same table a scatter chart reads. */
  const onChoice = (choice: ChartChoice) => {
    if (choice === 'survival') {
      if (survival) return
      if (!scatter) onKind('scatter')
      return set({ kind: 'scatter', survival: true, fit: undefined, curve: undefined, doseBottom: undefined, doseTop: undefined, corr: undefined, pointNames: undefined, xLog: undefined, yLog: undefined, yMin: undefined, yMax: undefined, refLines: undefined })
    }
    if (survival) set({ survival: undefined, logRank: undefined })
    onKind(choice)
  }

  const drawing = chartLayout(node)
  const series = chartSeries(node)
  const drawn = node.groups.map((group, index) => ({ group, index })).filter((c) => c.group.values.length)
  const fits = scatter ? scatterFits(node) : []
  const curveMethods = curveMethodsText(node)
  const curvePairs = scatter ? compareCurves(node) : []
  const brackets = node.brackets ?? []
  const setBracket = (i: number, change: Partial<ChartBracket>) => set({ brackets: brackets.map((b, k) => (k === i ? { ...b, ...change } : b)) }, 'chart-bracket')
  const testing = !scatter && !!node.test?.by && !!chartAnalysis(node)?.ok
  const showsPoints = hasPoints(node)
  // Size and transparency of points: for all groups, or for the one chosen here.
  const [pointsFor, setPointsFor] = useState(-1)
  const one = pointsFor >= 0 && pointsFor < series.length && series.length > 1 ? series[pointsFor] : null
  const shownPoints = pointStyle(one?.pointSize ?? node.pointSize, one?.pointOpacity ?? node.pointOpacity)
  const setPoints = (change: { pointSize?: number; pointOpacity?: number }, merge: string) =>
    one ? set({ groups: node.groups.map((g, k) => (one.groups.includes(k) ? { ...g, ...change } : g)) }, merge) : set('pointSize' in change ? { pointSize: pointStyle(change.pointSize, 1).pointSize } : { pointOpacity: pointStyle(1, change.pointOpacity).pointOpacity }, merge)
  // The instruction box: what was typed, and what the last instruction did.
  const [asked, setAsked] = useState('')
  const [answer, setAnswer] = useState<{ done: string[]; unclear: string[] } | null>(null)
  const instruct = () => {
    const result = applyInstruction(node, asked)
    if (result.done.length) {
      // The whole instruction is one change, so one Undo takes it back.
      const { id: _id, type: _type, ...change } = result.node
      set({ ...Object.fromEntries(Object.keys(node).filter((key) => key !== 'id' && key !== 'type' && !(key in change)).map((key) => [key, undefined])), ...change })
    }
    setAnswer({ done: result.done, unclear: result.unclear })
    if (!result.unclear.length) setAsked('')
  }
  /** The mark of a series' points, beside its colour. */
  const shapeBox = (entry: (typeof series)[number]) =>
    showsPoints &&
    !isSurvival(node) && (
      <select
        className="shape-select"
        aria-label={`Shape of the points of ${entry.name}`}
        title={`Shape of the points of ${entry.name}`}
        value={entry.shape ?? 'circle'}
        onChange={(e) => {
          const shape = e.target.value as PointShape
          set({ groups: node.groups.map((g, k) => (entry.groups.includes(k) ? (shape === 'circle' ? (({ shape: _usual, ...rest }) => rest)(g) : { ...g, shape }) : g)) })
        }}
      >
        {SHAPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    )
  const refLines = node.refLines ?? []
  const setLine = (i: number, change: Partial<ChartRefLine>) => set({ refLines: refLines.map((l, k) => (k === i ? { ...l, ...change } : l)) }, 'chart-line')
  /** A new line goes through the middle of the data, where it can be seen and dragged from by typing. */
  const addLine = () => {
    const values = node.groups.flatMap((g) => g.values).sort((a, b) => a - b)
    const middle = values.length ? Number(values[Math.floor(values.length / 2)].toPrecision(2)) : 1
    set({ refLines: [...refLines, { axis: 'y', value: node.yLog && middle <= 0 ? 1 : middle }] })
  }
  const pie = node.kind === 'pie'
  const survival = isSurvival(node)
  const lives = survival ? survivalOf(node) : null
  /** A chart with axes and groups along them: neither a pie, nor a heat map, nor a Venn diagram. */
  const axes = !pie && !heat && !venn
  const matrix = heat ? heatMatrix(node) : null
  const sets = venn ? vennOf(node.groups) : null
  const hasLegend = !heat && !venn && (grouped || pie || (scatter && series.length > 1))
  // The number written at every group: what the chart holds, as it is drawn.
  const labels = usableValueLabels(node.valueLabels)
  const setLabels = (change: Partial<ChartValueLabels>, merge?: string) => set({ valueLabels: usableValueLabels({ ...(labels ?? { show: usualValueLabel(node.kind) }), ...change }) }, merge)
  const colourBox = (entry: (typeof series)[number]) => (
    <input
      type="color"
      className="color small"
      aria-label={`Colour of ${entry.name}`}
      title={`Colour of ${entry.name}`}
      value={entry.colour}
      onChange={(e) => set({ groups: node.groups.map((g, k) => (entry.groups.includes(k) ? { ...g, color: e.target.value } : g)) }, 'chart-colour')}
    />
  )
  /** One line of plain words about a group: how many values, and what the chart draws for them. */
  const about = (g: ChartGroup): string => {
    // The same values the chart draws from: on a logarithmic axis, only those above zero.
    const values = shownValues(node, g)
    const s = stats(values)
    const b = boxStats(values)
    const count = `n = ${s.n}${values.length < g.values.length ? ` of ${g.values.length} (the rest are not above zero)` : ''}`
    if (!s.n) return count
    if ((node.kind === 'box' || node.kind === 'violin') && b) return `${count}, median ${short(b.median)} (quartiles ${short(b.q1)} to ${short(b.q3)})`
    return `${count}, mean ${short(s.mean)}${s.n > 1 ? ` ± ${short(node.error === 'sem' ? s.sem : s.sd)} ${node.error === 'sem' ? 'SEM' : 'SD'}` : ''}`
  }

  // The settings are sorted under headings, one open at a time.
  const tabs = chartTabs(node.kind)
  const [wantedTab, setWantedTab] = useState<ChartTab>(lastChartTab)
  const tab = openTab(wantedTab, tabs)
  const tabsId = useId()
  const tabBar = useRef<HTMLDivElement>(null)
  const tabBody = useRef<HTMLDivElement>(null)
  const chooseTab = (next: ChartTab) => {
    rememberChartTab(next)
    setWantedTab(next)
  }
  useLayoutEffect(() => {
    // A heading chosen far down a long list would open somewhere in its middle: its start is
    // brought back under the row of headings, which stays at the top of the panel.
    const bar = tabBar.current
    const body = tabBody.current
    if (!bar || !body) return
    const covered = bar.getBoundingClientRect().bottom - body.getBoundingClientRect().top
    const scroller = bar.closest('.panel')
    if (covered > 0 && scroller) scroller.scrollTop -= covered + 8
  }, [tab])
  // A part of the chart pressed on the page: its heading is opened and its setting shown.
  const pressed = useEditor((state) => state.chartPart)
  const [shown, setShown] = useState<{ setting: string; nonce: number; type: boolean } | null>(null)
  const shownDone = useRef(0)
  useEffect(() => {
    if (!pressed || pressed.id !== node.id) return
    const to = settingFor(pressed.part, node.kind, survival)
    if (!tabs.includes(to.tab)) return
    let setting = to.setting
    if (pressed.part.what === 'group') {
      // A group is known by its place in the table: the list shows it in the row of its series, or of its set.
      const place = pressed.part.at ?? -1
      setting = `group-${sets ? sets.sets.findIndex((one) => one.group === place) : series.findIndex((entry) => entry.groups.includes(place))}`
    }
    chooseTab(to.tab)
    setShown({ setting, nonce: pressed.nonce, type: pressed.part.what === 'title' || pressed.part.what === 'yTitle' || pressed.part.what === 'xTitle' })
    // Only a new press counts: the chart and its lists are read as they are at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pressed?.nonce])
  useEffect(() => {
    if (!shown || shownDone.current === shown.nonce) return
    const body = tabBody.current
    // A row that is not there (a bracket that was not drawn as listed) leads to its list.
    const list = shown.setting.replace(/^bracket-\d+$/, 'brackets').replace(/^line-\d+$/, 'lines')
    const target = body?.querySelector<HTMLElement>(`[data-setting="${shown.setting}"]`) ?? body?.querySelector<HTMLElement>(`[data-setting="${list}"]`)
    if (!target) return
    shownDone.current = shown.nonce
    target.scrollIntoView({ block: 'center' })
    // The mark fades by itself; taking it off and putting it back starts the fading again.
    body?.querySelectorAll('[data-picked]').forEach((el) => el.removeAttribute('data-picked'))
    void target.offsetWidth
    target.setAttribute('data-picked', '')
    if (shown.type) target.querySelector<HTMLElement>('input')?.focus({ preventScroll: true })
  }, [shown, tab])
  /** Put a typed name in the chart; the words say why when it cannot be taken. Typing one name is one step to undo (`which` tells the names apart). */
  const rename = (result: Renamed, which: string): string | undefined => {
    if (result.change) set(result.change, `chart-name-${which}`)
    return result.problem
  }
  /** The colour of a group, to tell it from the others in a list. */
  const groupDot = (colour: string | undefined) => colour && <span className="group-dot" style={{ background: colour }} aria-hidden="true" />
  /** How many points of a scatter series are drawn. */
  const pointsOf = (i: number, group: ChartGroup): string => {
    const shown = fits[i]?.points ?? 0
    return `${shown} points${shown < group.values.length ? ` of ${group.values.length} (the rest are not above zero)` : ''}`
  }
  /** The line or curve fitted to a series, in words. */
  const fitOf = (i: number): string => {
    const found = fits[i]
    if (node.curve === 'dose') return found?.dose ? doseText(found.dose, heldPlateaus(node)) : 'no curve could be fitted'
    const fit = found?.fit
    return fit ? `${node.yLog ? 'log y' : 'y'} = ${short(fit.slope)} × ${node.xLog ? 'log x' : 'x'} ${fit.intercept < 0 ? '−' : '+'} ${short(Math.abs(fit.intercept))}, R² = ${short(fit.r2)}` : 'no line could be fitted'
  }
  /** The correlation of a series, in words. */
  const corrOf = (i: number): string => {
    const found = fits[i]?.corr
    if (!found || !node.corr) return 'cannot be worked out'
    return `${corrText(found, node.corr).replace(/\*/g, '').replace('_{s}', 's')}${node.corr === 'spearman' ? (found.exact ? ' (exact)' : ' (t approximation)') : ''}`
  }
  /** One line per series with what was worked out for it. */
  const perSeries = (label: string, text: (i: number) => string) => (
    <ul className="chart-summary" aria-label={label}>
      {series.map((entry, i) => (
        <li key={i}>
          {groupDot(entry.colour)}
          <span>
            <b>{entry.name}</b>: {text(i)}
          </span>
        </li>
      ))}
    </ul>
  )
  const titleField = (
    <Field label="Title" setting="title">
      <input type="text" className="text-line" maxLength={120} value={node.title ?? ''} placeholder="e.g. Cell viability" onChange={(e) => set({ title: e.target.value.trim() ? e.target.value : undefined }, 'chart-title')} />
    </Field>
  )

  return (
    <Section
      title="Chart"
      info={
        <>
          <p>Choose the kind of chart and paste your numbers under “Data”, then set what the chart shows: tests, error bars and fitted lines under “Statistics”, colours, points and the legend under “Look”, titles and ranges under “Axes”. Drag a corner of the chart on the page to resize it.</p>
          <p>
            {node.kind === 'bar'
              ? 'A bar is the mean of its group.'
              : node.kind === 'dot'
                ? 'Every value is a dot; the line across them is the mean of the group.'
                : node.kind === 'line'
                  ? 'Each point is the mean of its group; the line joins them in the order of the columns.'
                  : node.kind === 'box'
                    ? 'The box runs from the first to the third quartile with a line at the median; each whisker ends at the furthest value within 1.5 box lengths, and values beyond are drawn as rings.'
                    : node.kind === 'violin'
                      ? 'The outline is a smoothed estimate of how the values are spread, from the smallest to the largest value; the line marks the median. All violins have the same greatest width.'
                      : heat
                        ? 'Every number of the table is a cell, coloured by its value: one row of cells for every row of the table, one column for every column. The scale beside the cells says which colour stands for which value.'
                        : venn
                          ? 'Every set is a circle; the number in a part of the diagram says how many members belong to exactly the sets that overlap there. The circles all have one size: they are not drawn larger for larger sets.'
                      : 'Every pair of x and y values is a point. A fitted line is the least-squares line of y on x, drawn across the x values of its series; on a logarithmic axis it is fitted to the logarithms.'}
          </p>
          <p>Titles and names accept {MARKS}.</p>
        </>
      }
    >
      <Field
        label="Describe a change"
        info={
          <>
            <p>Write in plain words what the chart should show, then press Apply or Enter. Several things at once are fine.</p>
            <p>This box reads set phrases in your browser: no AI, nothing is sent anywhere. It tells you what it did and what it did not understand, and one Undo takes the whole instruction back.</p>
            <p>Press an example to put it in the box:</p>
            <ul className="examples">
              {INSTRUCTION_EXAMPLES.map((example) => (
                <li key={example}>
                  <button className="example" onClick={() => setAsked(example)}>
                    {example}
                  </button>
                </li>
              ))}
            </ul>
          </>
        }
      >
        <textarea
          className="text-input"
          aria-label="Describe a change to the chart"
          rows={2}
          value={asked}
          placeholder="e.g. box plot with all points; line at 5 labelled limit; legend at the top"
          onChange={(e) => setAsked(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && asked.trim()) {
              e.preventDefault()
              instruct()
            }
          }}
        />
        <button className="btn small" disabled={!asked.trim()} onClick={instruct}>
          Apply
        </button>
        {answer && (
          <div className="instruction-answer" role="status">
            {answer.done.map((line, i) => (
              <p key={`d${i}`} className="did">
                {line}
              </p>
            ))}
            {answer.unclear.map((line, i) => (
              <p key={`u${i}`} className="notice">
                {line}
              </p>
            ))}
          </div>
        )}
      </Field>
      <ChartTabBar id={tabsId} tabs={tabs} tab={tab} onTab={chooseTab} barRef={tabBar} />
      <div className="chart-tab" role="tabpanel" id={`${tabsId}-panel`} aria-labelledby={`${tabsId}-${tab}`} ref={tabBody}>
        {[...(live ? tableNotices(live.report) : []), ...drawing.notes].map((note, i) => (
          <p key={i} className="notice">
            {note}
          </p>
        ))}
        {tab === 'data' && (
          <>
            <Segmented label="Chart type" value={survival ? 'survival' : node.kind} options={CHART_OPTIONS} onChange={onChoice} wrap />
            <Field
              label={venn ? 'Sets' : 'Numbers'}
                setting="table"
              info={
                <>
                  <p>
                    {venn
                      ? 'One column for every set, with its name in the first row and the names of its members (genes, proteins, samples) under it, one in each row. BioSketch counts what the sets share; capitals make no difference (TP53 and Tp53 are one name).'
                      : heat
                        ? 'One column for every column of cells, with its name in the first row; one row for every row of cells. To name the rows (genes, samples), put a column of names before the numbers.'
                        : survival
                      ? 'First column: the time (days, weeks) at which each subject had the event or left the study. Each further column is one group, with its name in the first row: in the row of a subject write 1 if it had the event (died, relapsed) at that time, or 0 if it left the study without it. Leave the other groups empty in that row.'
                      : scatter
                        ? 'First column: the x values. Each further column: the y values of one series, with its name in the first row.'
                        : 'One column per group, with its name in the first row; one row per replicate.'}
                  </p>
                  <p>
                    {venn
                      ? 'If you know the sizes and not the members, type one row of numbers instead: under the name of a set its whole size, and under two or three names joined by “&” (A & B) the size of what those sets share. A diagram is drawn for two or three sets.'
                      : heat
                        ? 'An empty cell of the table is drawn as an empty cell. A heat map takes up to 24 columns and draws up to 400 rows.'
                        : survival
                      ? 'A subject that is still alive when the study ends is written with the time the study ended and 0.'
                      : scatter
                        ? 'To write names beside points (genes, samples), put a column of names before the x values; only rows with a name are labelled.'
                        : 'For a grouped chart, add a row above with the category of each column (for example WT, WT, KO, KO).'}
                  </p>
                  <p>Paste from a spreadsheet, type with tabs, commas or spaces between the numbers, or import a .csv, .txt or .xlsx file (the first sheet).</p>
                </>
              }
            >
              <textarea
                className="text-input table-input"
                aria-label="Numbers for the chart"
                rows={7}
                wrap="off"
                spellCheck={false}
                value={shownText}
                onChange={(e) => read(e.target.value, live?.head)}
              />
              <button className="btn small" title="Read the table from a CSV, text or Excel file" onClick={() => tableFile.current?.click()}>
                Import a table from a file…
              </button>
              <input
                ref={tableFile}
                type="file"
                accept={TABLE_ACCEPT}
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void importTable(f)
                  e.target.value = ''
                }}
              />
            </Field>
            <Field
              label="Rows of names at the top"
              info={
                <>
                  <p>How many rows at the top of the table hold names, not numbers. BioSketch guesses from the table.</p>
                  <p>Change it when a first row of numbers (doses, time points) is really a row of names, or when the table has no names at all.{scatter ? '' : ' With two rows the chart is grouped: categories above, series below.'}</p>
                </>
              }
            >
              <Segmented
                label="Rows of names at the top"
                value={String(live ? live.report.head : ownHead) as '0' | '1' | '2'}
                options={oneHead ? HEAD_OPTIONS.slice(0, 2) : HEAD_OPTIONS}
                onChange={(v) => read(shownText, Number(v) as 0 | 1 | 2)}
              />
            </Field>
            {matrix && matrix.columns.length > 0 && <p className="hint">{heatSummary(matrix)}</p>}
            {sets && sets.sets.length > 0 && !sets.problem && (
              <ul className="chart-summary" aria-label="What each part of the diagram holds">
                {sets.regions.map((region, i) => (
                  <li key={i}>
                    <span>
                      <b>{regionName(sets, region)}</b>: {valueText(region.count)}
                    </span>
                    {sets.lists && region.count > 0 && (
                      <button
                        className="btn small"
                        title="Copy the names of these members, one in each line"
                        onClick={async () => toast((await copyText(region.names.join('\n'))) ? `${region.count} ${region.count === 1 ? 'name' : 'names'} copied.` : 'Copying is blocked here.')}
                      >
                        Copy names
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {series.length > 0 && !heat && !venn && (
              <ul className="chart-summary" aria-label="What the chart holds">
                {scatter || !grouped
                  ? series.map((entry, i) => {
                      const group = node.groups[entry.groups[0]]
                      const life = lives?.groups.find((g) => g.name === entry.name)
                      return (
                        <li key={i}>
                          {groupDot(entry.colour)}
                          <span>
                            <b>{entry.name}</b>: {survival ? (life ? survivalText(life) : 'no subjects') : scatter ? pointsOf(i, group) : about(group)}
                          </span>
                        </li>
                      )
                    })
                  : drawn.map(({ group, index }) => (
                      <li key={index}>
                        {groupDot(series.find((entry) => entry.groups.includes(index))?.colour)}
                        <span>
                          <b>{groupName(group)}</b>: {about(group)}
                        </span>
                      </li>
                    ))}
              </ul>
            )}
          </>
        )}
        {tab === 'stats' && (
          <>
            {heat && (
              <Field
                label="Correlation between the columns"
                setting="corr"
                info={
                  <>
                    <p>Instead of the values, the cells show how closely every column goes together with every other, over the rows in which both have a value: from −1 (one falls as the other rises) through 0 to 1.</p>
                    <p>
                      <b>Pearson</b> for a straight-line relation between two measurements; <b>Spearman</b> works on ranks, so extreme values count for less.
                    </p>
                    <p>Tick “Write the number in every cell” under “Look” to read r off the chart. No p values are worked out here: with many pairs they would need a correction.</p>
                  </>
                }
              >
                <Segmented
                  label="Correlation shown in the cells"
                  value={node.corr ?? 'none'}
                  options={[
                    { value: 'none', label: 'None', title: 'The cells show the values of the table' },
                    { value: 'pearson', label: 'Pearson' },
                    { value: 'spearman', label: 'Spearman' },
                  ]}
                  onChange={(v) => set({ corr: v === 'none' ? undefined : v })}
                />
              </Field>
            )}
            {heat && !node.corr && (
              <div className="with-info">
                <Check checked={!!node.heatByRow} onChange={(v) => set({ heatByRow: v || undefined })}>
                  Scale every row (z-scores)
                </Check>
                <Info about="Scaled rows">
                  <p>Every row is shown by its own measure: each value less the mean of its row, divided by the standard deviation of the row. A cell then says how far its value lies above or below what is usual for that row.</p>
                  <p>Use it when rows differ a lot in size (a strongly and a weakly expressed gene): without it the large rows take all the colour.</p>
                  <p>On a logarithmic scale the logarithms are scaled, as is usual for expression data. It is what R’s scale() does to the rows.</p>
                </Info>
              </div>
            )}
            {heat && (
              <Field
                label="Put what is alike next to each other"
                setting="heat-cluster"
                info={
                  <>
                    <p>Rows (or columns) that look alike are put next to each other, and a tree beside the cells shows which were joined, and how far apart they were when they were.</p>
                    <p>Two rows are as far apart as the straight-line (Euclidean) distance between what their cells show; two clusters as far apart as their two most distant rows (complete linkage). These are the defaults of R’s dist and hclust, and of pheatmap.</p>
                    <p>What is clustered is what the colours show: scale the rows first to group genes by their pattern rather than by their size.</p>
                  </>
                }
              >
                <select aria-label="Clustering of the heat map" value={node.heatCluster ?? ''} onChange={(e) => set({ heatCluster: (e.target.value || undefined) as ChartNode['heatCluster'] })}>
                  <option value="">Keep the order of the table</option>
                  <option value="rows">Rows</option>
                  <option value="columns">Columns</option>
                  <option value="both">Rows and columns</option>
                </select>
              </Field>
            )}
            {(node.kind === 'bar' || node.kind === 'dot' || node.kind === 'line') && (
              <Field
                label="Error bars"
                setting="error"
                info={
                  <>
                    <p>
                      <b>SD</b>, the standard deviation, shows how much the values of a group scatter.
                    </p>
                    <p>
                      <b>SEM</b>, the standard error of the mean, is the SD divided by √n. It shows how precisely the mean is known and shrinks as the group grows.
                    </p>
                    <p>Say in the figure legend which of the two is drawn.</p>
                  </>
                }
              >
                <Segmented label="Error bars" value={node.error ?? 'none'} options={ERROR_OPTIONS} onChange={(error) => set({ error: error === 'none' ? undefined : error })} />
              </Field>
            )}
            {scatter && !survival && (
              <Field
                label="Fitted line"
                setting="fit"
                info={
                  <>
                    <p>
                      <b>Straight line.</b> The least-squares line through each series, on the values as they are plotted (their logarithms on a logarithmic axis).
                    </p>
                    <p>
                      <b>Dose-response curve.</b> The response moves from one plateau to the other along the logarithm of the dose (x): y = bottom + (top − bottom) / (1 + 10^((log EC50 − log x) × Hill
                      slope)), fitted by least squares. The EC50 (IC50 for a falling curve) is the dose halfway between the plateaus; its 95 % interval comes from the standard error of log EC50.
                      It is the curve R fits with nls and the model SSfpl, and GraphPad Prism calls “log(agonist) vs. response, variable slope (four parameters)”.
                    </p>
                    <p>A curve needs at least five points at four doses above zero. Where the points do not settle on one curve, none is drawn.</p>
                  </>
                }
              >
                <Segmented
                  label="Line fitted to each series"
                  value={!node.fit ? 'none' : node.curve === 'dose' ? 'dose' : 'line'}
                  options={[
                    { value: 'none', label: 'None' },
                    { value: 'line', label: 'Straight line' },
                    { value: 'dose', label: 'Dose-response curve' },
                  ]}
                  onChange={(v) => set({ fit: v === 'none' ? undefined : true, curve: v === 'dose' ? 'dose' : undefined, ...(v === 'dose' ? {} : { doseBottom: undefined, doseTop: undefined }) })}
                  wrap
                />
                {node.fit && node.curve !== 'dose' && (
                  <div className="with-info">
                    <Check checked={!!node.band} onChange={(v) => set({ band: v || undefined })}>
                      Shade the 95 % confidence band
                    </Check>
                    <Info about="The confidence band of a fitted line">
                      <p>The band is where the line itself lies with 95 % confidence, given the scatter of the points about it. It is narrowest in the middle of the x values and widens towards the ends.</p>
                      <p>It is not where single new points would fall (that would be wider). It is what R gives with predict(fit, interval = "confidence"). A line through two points has no band.</p>
                    </Info>
                  </div>
                )}
                {node.fit && perSeries(node.curve === 'dose' ? 'The curve of each series' : 'The line of each series', fitOf)}
                {node.fit && node.curve === 'dose' && (
                  <>
                    <div className="row">
                      <OptionalNumber label="Bottom of the curve held at" value={node.doseBottom} placeholder="bottom: fitted" onChange={(doseBottom) => set({ doseBottom }, 'dose-bottom')} />
                      <OptionalNumber label="Top of the curve held at" value={node.doseTop} placeholder="top: fitted" onChange={(doseTop) => set({ doseTop }, 'dose-top')} />
                    </div>
                    <p className="hint">Type a value to hold a plateau there (0 for a response that starts at nothing, 100 for one given in per cent of a control). Empty: it is fitted.</p>
                    {curvePairs.length > 0 && (
                      <div className="test-result" aria-label="Comparison of the EC50 of the curves">
                        <p>
                          <b>Same EC50?</b> (extra sum-of-squares F test)
                        </p>
                        <ul className="chart-summary">
                          {curvePairs.map((c, i) => (
                            <li key={i}>
                              <span>{comparisonText(c)}</span>
                            </li>
                          ))}
                        </ul>
                        {curvePairs.length > 1 && <p className="hint">The p values are not corrected for the number of pairs.</p>}
                      </div>
                    )}
                  </>
                )}
                {curveMethods && (
                  <div className="with-info">
                    <button
                      className="btn small"
                      onClick={async () => toast((await copyText(curveMethods)) ? 'Copied. Paste it into your methods or figure legend.' : 'Copying is blocked here. Open the “i” beside the button and copy the text from there.')}
                    >
                      Copy a text for the methods
                    </button>
                    <Info about="The text for the methods">
                      <p>{curveMethods}</p>
                    </Info>
                  </div>
                )}
              </Field>
            )}
            {scatter && !survival && (
              <Field
                label="Correlation"
                setting="corr"
                info={
                  <>
                    <p>How closely x and y go together in each series, written on the chart with its p value (two-sided, for “no correlation”).</p>
                    <p>
                      <b>Pearson.</b> For a straight-line relation between two measurements that each scatter roughly normally. It is worked out on the values as plotted: on their logarithms on a logarithmic axis.
                    </p>
                    <p>
                      <b>Spearman.</b> Works on ranks, so it asks only whether y rises (or falls) with x, whatever the shape, and extreme values count for less. Written as r with a small s.
                    </p>
                    <p>A correlation says that two things go together, not that one causes the other.</p>
                  </>
                }
              >
                <Segmented
                  label="Correlation written on the chart"
                  value={node.corr ?? 'none'}
                  options={[
                    { value: 'none', label: 'None' },
                    { value: 'pearson', label: 'Pearson' },
                    { value: 'spearman', label: 'Spearman' },
                  ]}
                  onChange={(v) => set({ corr: v === 'none' ? undefined : v })}
                />
                {node.corr && perSeries('The correlation of each series', corrOf)}
              </Field>
            )}
            {survival && lives && (
              <Field
                label="Log-rank test"
                setting="log-rank"
                info={
                  <>
                    <p>It asks whether the groups differ over the whole course of the curves: at every time with an event, the events of each group are compared with what its share of the subjects still followed would lead one to expect.</p>
                    <p>With more than two groups, pairs are compared by log-rank tests of their own, with Holm’s correction. It is the test of R’s survival package (survdiff).</p>
                    <p>The median is the time by which half of a group has had the event; “not reached” when its curve stays above one half.</p>
                  </>
                }
              >
                <div className="with-info">
                  <Check checked={!!node.band} onChange={(v) => set({ band: v || undefined })}>
                    Shade the 95 % confidence band of every curve
                  </Check>
                  <Info about="The confidence band of a survival curve">
                    <p>The band is where the true share without the event lies with 95 % confidence at each time. It widens as fewer subjects are still followed.</p>
                    <p>It is the interval R’s survfit gives by default (worked out on the logarithm of the share, with Greenwood’s variance), and it ends where the curve reaches zero.</p>
                  </Info>
                </div>
                {lives.test ? (
                  <div className="test-result" aria-label="Result of the log-rank test">
                    <p>
                      <b>Log-rank test</b>: {logRankText(lives.test)}
                    </p>
                    {lives.pairs.length > 0 && (
                      <>
                        <p className="hint">Pairs (log-rank tests, Holm’s correction):</p>
                        <ul className="chart-summary">
                          {lives.pairs.map((x, i) => (
                            <li key={i}>
                              <span>
                                {x.a} and {x.b}: {x.p === null ? 'cannot be worked out' : `${pText(x.p)} (${stars(x.p)})`}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                    <Check checked={!!node.logRank} onChange={(v) => set({ logRank: v || undefined })}>
                      Write the p value on the chart
                    </Check>
                    {lives.hazards.length > 0 && (
                      <>
                        <div className="with-info">
                          <p className="hint">Hazard ratio, against {lives.hazards[0].against}:</p>
                          <Info about="The hazard ratio">
                            <p>How fast the event comes in a group compared with the first group of the table: 0.5 means half as fast at any time, 2 twice as fast. The interval and the p value say how sure that is.</p>
                            <p>It comes from Cox’s proportional hazards model with the group as its only factor, tied times handled by Efron’s method: coxph(Surv(time, status) ~ group) in R’s survival package. It assumes that the ratio stays the same over time; curves that cross say it does not.</p>
                            <p>To compare with another group, put that group first in the table.</p>
                          </Info>
                        </div>
                        <ul className="chart-summary">
                          {lives.hazards.map((h, i) => (
                            <li key={i}>
                              <span>
                                {h.name}: {h.ratio ? hazardText(h.ratio) : 'cannot be worked out (every event of one group comes before or after all of the other’s)'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="hint">The test needs at least two groups, and an event while more than one group was still followed.</p>
                )}
                {curveMethods && (
                  <div className="with-info">
                    <button
                      className="btn small"
                      onClick={async () => toast((await copyText(curveMethods)) ? 'Copied. Paste it into your methods or figure legend.' : 'Copying is blocked here. Open the “i” beside the button and copy the text from there.')}
                    >
                      Copy a text for the methods
                    </button>
                    <Info about="The text for the methods">
                      <p>{curveMethods}</p>
                    </Info>
                  </div>
                )}
              </Field>
            )}
            {!scatter && axes && <ChartTestProps node={node} set={set} />}
            {!scatter && axes && (
              <Field
                label="Significance brackets"
                setting="brackets"
                info={
                  <>
                    <p>A bracket joins two groups and carries a label above them.</p>
                    <p>Type the label yourself (for example p = 0.03, ** or ns), or choose a test above and let the bracket show its result for these two groups: it then changes with the numbers.</p>
                    <p>Typing in the box of a bracket that follows the test replaces the result with your own label.</p>
                  </>
                }
              >
                {brackets.map((b, i) => (
                  <div key={i} className="bracket-row" data-setting={`bracket-${i}`}>
                    <select aria-label="First group" value={b.from} onChange={(e) => setBracket(i, { from: Number(e.target.value) })}>
                      {drawn.map((c) => (
                        <option key={c.index} value={c.index}>
                          {groupName(c.group)}
                        </option>
                      ))}
                    </select>
                    <select aria-label="Second group" value={b.to} onChange={(e) => setBracket(i, { to: Number(e.target.value) })}>
                      {drawn.map((c) => (
                        <option key={c.index} value={c.index}>
                          {groupName(c.group)}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      className="text-line"
                      aria-label="Label of the bracket"
                      value={bracketLabel(node, b)}
                      placeholder={b.auto ? 'not compared by the test' : 'e.g. p = 0.03'}
                      onChange={(e) => setBracket(i, { label: e.target.value.slice(0, 40), auto: undefined })}
                    />
                    <button className="icon-only" aria-label="Remove this bracket" title="Remove this bracket" onClick={() => set({ brackets: brackets.length > 1 ? brackets.filter((_, k) => k !== i) : undefined })}>
                      <Icon name="close" size={14} />
                    </button>
                    {b.auto ? (
                      <span className="bracket-source">Follows the test. Type in the box to write your own label.</span>
                    ) : (
                      testing && (
                        <button className="btn small bracket-source" onClick={() => setBracket(i, { auto: true, label: '' })}>
                          Use the result of the test
                        </button>
                      )
                    )}
                  </div>
                ))}
                <button
                  className="btn small"
                  disabled={drawn.length < 2 || brackets.length >= MAX_BRACKETS}
                  onClick={() => set({ brackets: [...brackets, { from: drawn[0].index, to: drawn[Math.min(1, drawn.length - 1)].index, ...(testing ? { label: '', auto: true } : { label: '*' }) }] })}
                >
                  Add a bracket
                </button>
              </Field>
            )}
          </>
        )}
        {tab === 'look' && (
          <>
            {matrix && (
              <Field
                label="Colour scale"
                setting="heat-scale"
                info={
                  <>
                    <p>{matrix.scale.about}</p>
                    <p>A scale from low to high suits amounts; two colours around a white middle suit values on both sides of zero.</p>
                  </>
                }
              >
                <select aria-label="Colour scale of the cells" value={matrix.scale.id} onChange={(e) => set({ heatScale: e.target.value as HeatScale })}>
                  <optgroup label="From low to high">
                    {HEAT_SCALES.filter((h) => !h.diverging).map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Two colours around a middle">
                    {HEAT_SCALES.filter((h) => h.diverging).map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <div className="palette-strip" aria-hidden="true">
                  {Array.from({ length: 24 }, (_, i) => heatColour(matrix.scale, i / 23)).map((c, i) => (
                    <span key={i} style={{ background: c }} />
                  ))}
                </div>
              </Field>
            )}
            {heat && !node.corr && (
              <AxisRange
                title="Range of the colours"
                colours
                min={node.yMin}
                max={node.yMax}
                log={!!node.yLog}
                onMin={(yMin) => set({ yMin }, 'chart-range')}
                onMax={(yMax) => set({ yMax }, 'chart-range')}
                onLog={(v) => set({ yLog: v || undefined })}
              />
            )}
            {heat && (
              <div data-setting="heat-numbers">
                <Check checked={!!node.heatNumbers} onChange={(v) => set({ heatNumbers: v || undefined })}>
                  Write the number in every cell
                </Check>
                <Check checked={node.legend !== 'none'} onChange={(v) => set({ legend: v ? undefined : 'none' })}>
                  Show the colour scale beside the cells
                </Check>
              </div>
            )}
            {!heat && (
            <Field
              label="Colours"
              info={
                <>
                  <p>{PALETTES.find((p) => p.id === (node.palette ?? 'biosketch'))?.about}</p>
                  <p>Choosing a palette recolours every group. A single group can still be given its own colour, under “{grouped ? 'Series' : 'Groups'}”.</p>
                </>
              }
            >
              <select
                aria-label="Colour palette"
                value={node.palette ?? 'biosketch'}
                onChange={(e) => set({ palette: e.target.value === 'biosketch' ? undefined : e.target.value, groups: node.groups.map(({ color: _own, ...g }) => g) })}
              >
                <optgroup label="Colour-blind friendly">
                  {PALETTES.filter((p) => p.safe).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Common">
                  {PALETTES.filter((p) => !p.safe).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              </select>
              <div className="palette-strip" aria-hidden="true">
                {paletteColours(node.palette).map((c) => (
                  <span key={c} style={{ background: c }} />
                ))}
              </div>
            </Field>
            )}
            {sets && sets.sets.length > 0 && (
              <Field label="Sets" info={<p>The colour and the name of each set. Type over a name to change it, on the diagram and in the table under “Data”. Names accept {MARKS}.</p>}>
                <ul className="chart-summary names" aria-label="Colour and name of each set">
                  {sets.sets.map((one, i) => {
                    const entry = series.find((e) => e.groups[0] === one.group)
                    return (
                      <li key={i} data-setting={`group-${i}`}>
                        {entry && colourBox(entry)}
                        <NameInput value={one.name} label={`Name of ${one.name}`} onName={(typed) => rename(renameVenn(node, i, typed), `v${i}`)} />
                      </li>
                    )
                  })}
                </ul>
              </Field>
            )}
            {venn && (
              <Field label="Numbers in the diagram" setting="numbers">
                <Segmented
                  label="What is written in each part of the diagram"
                  value={node.vennLabels ?? 'count'}
                  options={[
                    { value: 'count', label: 'Count', title: 'How many members each part holds' },
                    { value: 'percent', label: 'Per cent', title: 'The share of each part in all members of all sets together' },
                    { value: 'none', label: 'None', title: 'No numbers in the diagram' },
                  ]}
                  onChange={(v) => set({ vennLabels: v === 'count' ? undefined : v })}
                />
              </Field>
            )}
            {series.length > 0 && !venn && (
              <Field
                label={grouped ? 'Series' : heat ? 'Columns' : 'Groups'}
                info={
                  <>
                    <p>
                      {heat ? 'The' : 'The colour'}
                      {showsPoints && !survival ? ', the shape of the points' : ''}
                      {heat ? '' : ' and the'} name of each {grouped ? 'series' : heat ? 'column' : 'group'}.
                    </p>
                    <p>Type over a name to change it: on the chart{hasLegend ? ', in the legend' : ''} and in the table under “Data”. Names accept {MARKS}.</p>
                    {grouped && <p>The categories are named under the series.</p>}
                  </>
                }
              >
                <ul className="chart-summary names" aria-label={`${heat ? 'Name' : 'Colour and name'} of each ${grouped ? 'series' : heat ? 'column' : 'group'}`}>
                  {series.map((entry, i) => (
                    <li key={i} data-setting={`group-${i}`}>
                      {!heat && colourBox(entry)}
                      {shapeBox(entry)}
                      <NameInput value={entry.name} label={`Name of ${entry.name}`} onName={(typed) => rename(renameSeries(node, i, typed), `s${i}`)} />
                    </li>
                  ))}
                </ul>
                {grouped && (
                  <>
                    <span className="sub-label">Categories</span>
                    <ul className="chart-summary names" aria-label="Name of each category">
                      {chartCategories(node).map((category, i) => (
                        <li key={i} data-setting={`category-${i}`}>
                          <NameInput value={category} label={category ? `Name of the category ${category}` : 'Name of the category without a name'} placeholder="no name" onName={(typed) => rename(renameCategory(node, i, typed), `c${i}`)} />
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </Field>
            )}
            {showsPoints && !survival && (
              <Field
                label="Points"
                info={
                  <>
                    {series.length > 1 && <p>Change all points, or choose one group to give it a size and transparency of its own.</p>}
                    <p>The shape of a group’s points is chosen beside its colour, under “{grouped ? 'Series' : 'Groups'}”.</p>
                    <p>Transparent points show where many lie on top of each other.</p>
                  </>
                }
              >
                {series.length > 1 && (
                  <select aria-label="Which points to change" value={one ? pointsFor : -1} onChange={(e) => setPointsFor(Number(e.target.value))}>
                    <option value={-1}>All groups</option>
                    {series.map((entry, i) => (
                      <option key={i} value={i}>
                        Only {entry.name}
                        {entry.pointSize !== undefined || entry.pointOpacity !== undefined ? ' (has its own)' : ''}
                      </option>
                    ))}
                  </select>
                )}
                <span className="sub-label">Size {Math.round((shownPoints.pointSize ?? 1) * 100)}%</span>
                <Range label={`Size of the points${one ? ` of ${one.name}` : ''}`} value={shownPoints.pointSize ?? 1} min={POINT_SIZE_MIN} max={POINT_SIZE_MAX} step={0.25} onChange={(v) => setPoints({ pointSize: v }, 'chart-point-size')} />
                <span className="sub-label">{Math.round((1 - (shownPoints.pointOpacity ?? 1)) * 100)}% transparent</span>
                <Range
                  label={`Transparency of the points${one ? ` of ${one.name}` : ''}`}
                  value={1 - (shownPoints.pointOpacity ?? 1)}
                  min={0}
                  max={1 - POINT_OPACITY_MIN}
                  step={0.05}
                  onChange={(v) => setPoints({ pointOpacity: Math.round((1 - v) * 100) / 100 }, 'chart-point-opacity')}
                />
                {one && (one.pointSize !== undefined || one.pointOpacity !== undefined) && (
                  <button className="btn small" onClick={() => set({ groups: node.groups.map((g, k) => (one.groups.includes(k) ? (({ pointSize: _s, pointOpacity: _o, ...rest }) => rest)(g) : g)) })}>
                    Same as the other groups
                  </button>
                )}
              </Field>
            )}
            {node.kind !== 'dot' && !scatter && axes && (
              <Check checked={!!node.points} onChange={(v) => set({ points: v || undefined })}>
                Show every value as a dot
              </Check>
            )}
            {node.kind === 'bar' && isGrouped(node) && (
              <div className="with-info">
                <Check checked={!!node.stacked} onChange={(v) => set({ stacked: v || undefined, percent: v ? node.percent : undefined })}>
                  Stack the bars of each category
                </Check>
                <Info about="Stacked bars">
                  <p>The bars of one category stand on top of each other, in the order of the legend, instead of side by side. Each part is as tall as the mean of its series, so the whole bar is the sum of the means.</p>
                  <p>Error bars and single values are not drawn in stacked bars. A number at each group is written inside its part where it fits.</p>
                  <p>
                    <b>Scale every bar to 100 %.</b> Each part becomes its share of the total of its category, so the bars are equally tall and compositions can be compared. A number written in a part is then
                    its share in per cent.
                  </p>
                </Info>
              </div>
            )}
            {node.kind === 'bar' && isGrouped(node) && node.stacked && (
              <Check checked={!!node.percent} onChange={(v) => set({ percent: v || undefined })}>
                Scale every bar to 100 %
              </Check>
            )}
            {pie && (
              <Field label="Numbers on the slices" setting="numbers">
                <Segmented
                  label="What is written on the slices"
                  value={node.pieLabels ?? 'percent'}
                  options={[
                    { value: 'percent', label: 'Per cent', title: 'The share of each slice in the whole' },
                    { value: 'value', label: 'Value', title: 'The mean of the group, as in the table' },
                    { value: 'none', label: 'None', title: 'No numbers on the slices' },
                  ]}
                  onChange={(v) => set({ pieLabels: v === 'percent' ? undefined : v })}
                />
              </Field>
            )}
            {!scatter && axes && (
              <Field
                label="Number at each group"
                setting="numbers"
                info={
                  <>
                    <p>Writes one number at every group: its mean, its median, or how many values it has (n).</p>
                    <p>
                      {node.kind === 'bar'
                        ? 'Inside the bar, the number stands under its top, or at the foot of the bar when an error bar or dots run through it. A number that does not fit inside is written above the bar.'
                        : 'The number stands above everything drawn for the group. In a bar chart it can also stand inside the bar.'}
                    </p>
                    <p>Left automatic, the colour is white inside a dark bar and dark everywhere else.</p>
                    <p>{node.kind === 'box' || node.kind === 'violin' ? 'The line in the middle marks the median' : 'The chart itself draws the mean'}: if you write a different number, say in the figure legend what it is.</p>
                    <p>In words: “write the mean in each bar, in white”.</p>
                  </>
                }
              >
                <select
                  aria-label="Number written at each group"
                  value={labels?.show ?? 'none'}
                  onChange={(e) => (e.target.value === 'none' ? set({ valueLabels: undefined }) : setLabels({ show: e.target.value as ChartValueLabels['show'] }))}
                >
                  <option value="none">None</option>
                  <option value="mean">Mean</option>
                  <option value="median">Median</option>
                  <option value="n">Number of values (n)</option>
                </select>
                {labels && node.kind === 'bar' && (
                  <Segmented
                    label="Place of the numbers"
                    value={labels.above ? 'above' : 'inside'}
                    options={[
                      { value: 'inside', label: 'Inside the bar', title: 'Inside the bar where the number fits, above it otherwise' },
                      { value: 'above', label: 'Above the bar', title: 'Above the bar and its error bar' },
                    ]}
                    onChange={(v) => setLabels({ above: v === 'above' })}
                  />
                )}
                {labels && (
                  <div className="row">
                    {labels.show !== 'n' && (
                      <Field label="Decimals">
                        <select aria-label="Decimals of the numbers" value={labels.decimals ?? 'auto'} onChange={(e) => setLabels({ decimals: e.target.value === 'auto' ? undefined : Number(e.target.value) })}>
                          <option value="auto">Automatic</option>
                          {Array.from({ length: VALUE_DECIMALS_MAX + 1 }, (_, d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </Field>
                    )}
                    <Field label={labels.color ? 'Colour' : 'Colour (automatic)'}>
                      <ColorInput label="Colour of the numbers" value={labels.color ?? '#2b2f36'} onChange={(color) => setLabels({ color }, 'chart-value-colour')} />
                    </Field>
                    {labels.color && (
                      <button className="btn small" onClick={() => setLabels({ color: undefined })}>
                        Automatic colour
                      </button>
                    )}
                  </div>
                )}
              </Field>
            )}
            {hasLegend && (
              <Field label="Legend" setting="legend">
                <select aria-label="Place of the legend" value={node.legend ?? 'right'} onChange={(e) => set({ legend: e.target.value === 'right' ? undefined : (e.target.value as LegendPlace) })}>
                  {LEGEND_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {(pie || venn) && titleField}
            <Field label="Text size">
              <NumberInput label="Size of the chart's text" value={node.fontSize ?? 13} min={6} max={60} onChange={(fontSize) => set({ fontSize }, 'chart-font')} />
            </Field>
          </>
        )}
        {tab === 'axes' && (
          <>
            {titleField}
            {!pie && (
              <>
                <Field label={scatter ? 'Title of the y axis' : heat ? 'Title beside the rows' : 'Title of the value axis'} setting="y-title">
                  <input type="text" className="text-line" maxLength={120} value={node.yLabel ?? ''} placeholder="e.g. Viable cells (%)" onChange={(e) => set({ yLabel: e.target.value.trim() ? e.target.value : undefined }, 'chart-ylabel')} />
                </Field>
                <Field label={heat ? 'Title under the columns' : 'Title of the x axis'} setting="x-title">
                  <input type="text" className="text-line" maxLength={120} value={node.xLabel ?? ''} placeholder={scatter ? 'e.g. Dose (µM)' : 'e.g. Genotype'} onChange={(e) => set({ xLabel: e.target.value.trim() ? e.target.value : undefined }, 'chart-xlabel')} />
                </Field>
              </>
            )}
            {axes && !survival && (
              <AxisRange
                title={scatter ? 'Range of the y axis' : 'Range of the value axis'}
                setting="y-range"
                zero={!scatter}
                min={node.yMin}
                max={node.yMax}
                log={!!node.yLog}
                onMin={(yMin) => set({ yMin }, 'chart-range')}
                onMax={(yMax) => set({ yMax }, 'chart-range')}
                onLog={(v) => set({ yLog: v || undefined })}
              />
            )}
            {scatter && (
              <AxisRange
                title="Range of the x axis"
                setting="x-range"
                min={node.xMin}
                max={node.xMax}
                log={!!node.xLog}
                onMin={(xMin) => set({ xMin }, 'chart-range')}
                onMax={(xMax) => set({ xMax }, 'chart-range')}
                onLog={(v) => set({ xLog: v || undefined })}
              />
            )}
            {axes && !survival && (
              <Field
                label="Reference lines"
                setting="lines"
                info={
                  <>
                    <p>A dashed line across the plot at a value you choose, for example a threshold or a detection limit.{scatter ? ' In a scatter chart a line can also stand upright at an x value.' : ''}</p>
                    <p>The axis always reaches the line. A label is written on the line at its right end.</p>
                    <p>In words: “dotted line at 1.3 labelled cut-off”.</p>
                  </>
                }
              >
                {refLines.map((l, i) => (
                  <div key={i} className="bracket-row" data-setting={`line-${i}`}>
                    {scatter ? (
                      <select aria-label="Direction of the line" value={l.axis} onChange={(e) => setLine(i, { axis: e.target.value === 'x' ? 'x' : 'y' })}>
                        <option value="y">Across, at y =</option>
                        <option value="x">Upright, at x =</option>
                      </select>
                    ) : (
                      <span className="between">Across, at</span>
                    )}
                    <OptionalNumber label="Value the line is drawn at" value={l.value} placeholder="value" onChange={(value) => value !== undefined && setLine(i, { value })} />
                    <input type="text" className="text-line" aria-label="Label of the line" value={l.label ?? ''} placeholder="label, e.g. p = 0.05" onChange={(e) => setLine(i, { label: e.target.value.trim() ? e.target.value.slice(0, 40) : undefined })} />
                    <button className="icon-only" aria-label="Remove this line" title="Remove this line" onClick={() => set({ refLines: refLines.length > 1 ? refLines.filter((_, k) => k !== i) : undefined })}>
                      <Icon name="close" size={14} />
                    </button>
                  </div>
                ))}
                <button className="btn small" disabled={refLines.length >= MAX_REF_LINES} onClick={addLine}>
                  Add a line
                </button>
              </Field>
            )}
            {scatter && !survival && (
              <div data-setting="point-names">
                <PointNamesField node={node} set={set} />
              </div>
            )}
          </>
        )}
      </div>
    </Section>
  )
}

/** The most pairs listed in the panel; a chart with many groups has hundreds. */
const PAIRS_LISTED = 28

/**
 * The statistical test of a chart: how the scientist wants to compare the groups, the test
 * BioSketch suggests for this table with what it does and why it fits, and the result of the
 * test that was chosen.
 */
function ChartTestProps({ node, set }: { node: ChartNode; set: (change: Partial<ChartNode>, merge?: string) => void }) {
  const compared = chartSamples(node)
  const advice = chartAdvice(node)
  const outcome = chartAnalysis(node)
  const test: ChartTest = node.test ?? {}
  const k = compared.samples.length
  /** Keep only the choices that are not the usual ones, so the figure stores nothing for an untouched chart. */
  const setTest = (change: Partial<ChartTest>) => {
    const next = { ...test, ...change }
    const kept: ChartTest = { ...(next.by ? { by: next.by } : {}), ...(next.paired ? { paired: true } : {}), ...(next.versusFirst ? { versusFirst: true } : {}), ...(next.across ? { across: true } : {}), ...(next.stars ? { stars: true } : {}) }
    set({ test: Object.keys(kept).length ? kept : undefined })
  }
  if (compared.problem) {
    return (
      <Field label="Statistical test">
        <p className="hint">{compared.problem}</p>
      </Field>
    )
  }
  const result = outcome?.ok ? outcome.result : null
  const methods = methodsText(node)
  const pairs = result ? result.pairs.map((p) => ({ from: compared.indexes[p.a], to: compared.indexes[p.b], a: compared.names[p.a], b: compared.names[p.b], p: p.p })) : []
  /** Brackets for the pairs the test finds different (with two groups: for the one pair, whatever it finds). */
  const addBrackets = () => {
    const out = withTestBrackets(node)
    if (!out.added && !out.over) return toast(k === 2 || out.different ? `The chart already has ${k === 2 ? 'this bracket' : 'these brackets'}.` : 'No pair of groups has p below 0.05, so there is no bracket to add.')
    if (out.added) set({ brackets: out.brackets })
    if (out.over) toast(`A chart takes at most ${MAX_BRACKETS} brackets: ${out.over} could not be added.`)
  }
  // A chart with categories and series has two factors: one analysis is on offer for it.
  const two = !!compared.factors
  const options: { value: 'none' | 'means' | 'ranks'; label: string; title: string }[] = two
    ? [
        { value: 'none', label: 'No test', title: 'Do not test; type the labels of brackets yourself' },
        { value: 'means', label: TEST_SHORT.twoWay, title: TEST_NAMES.twoWay },
      ]
    : [
        { value: 'none', label: 'No test', title: 'Do not test; type the labels of brackets yourself' },
        { value: 'means', label: TEST_SHORT[testFor(k, 'means', !!test.paired)], title: `Compare means: ${TEST_NAMES[testFor(k, 'means', !!test.paired)]}` },
        { value: 'ranks', label: TEST_SHORT[testFor(k, 'ranks', !!test.paired)], title: `Compare ranks: ${TEST_NAMES[testFor(k, 'ranks', !!test.paired)]}` },
      ]
  const chosen = two ? (test.by ? ('twoWay' as const) : null) : test.by ? testFor(k, test.by, !!test.paired) : null

  return (
    <Field
      label="Statistical test"
      info={
        <>
          <p>Say how the groups were measured: tick the box when each row of the table is one sample measured in every group{k > 2 ? ', and choose which pairs of groups to compare' : ''}.</p>
          <p>BioSketch then suggests a test for this table. The suggestion is advice: choose the test yourself below, and its result appears under it.</p>
          <p>All p values are two-sided and worked out as R does by default. Results are not stored: they follow the numbers in the table.</p>
        </>
      }
    >
      {two && (
        <>
          <p className="hint">This table has two factors: the categories along the bottom and the series in the legend. Which pairs do you want to compare?</p>
          <Segmented
            label="Pairs to compare"
            value={test.across ? 'across' : 'within'}
            options={[
              { value: 'within', label: 'Series within each category', title: `For example ${compared.factors!.series.slice(0, 2).join(' against ')} within ${compared.factors!.categories[0]}` },
              { value: 'across', label: 'Categories within each series', title: `For example ${compared.factors!.categories.slice(0, 2).join(' against ')} within ${compared.factors!.series[0]}` },
            ]}
            onChange={(v) => setTest({ across: v === 'across' })}
            wrap
          />
        </>
      )}
      {!two && <p className="hint">How do you want to compare the groups?</p>}
      {!two && (
        <Check checked={!!test.paired} onChange={(paired) => setTest({ paired })}>
          Each row is one sample (animal, culture, patient) measured in every group
        </Check>
      )}
      {!two && k > 2 && (
        <Segmented
          label="Pairs of groups to compare"
          value={test.versusFirst ? 'first' : 'all'}
          options={[
            { value: 'all', label: 'Every pair', title: 'Compare every group with every other' },
            { value: 'first', label: `Each with “${compared.names[0]}”`, title: 'Compare each group with the first one only, for example a control' },
          ]}
          onChange={(v) => setTest({ versusFirst: v === 'first' })}
          wrap
        />
      )}
      <div className="with-info">
        <button className="btn small" onClick={() => useEditor.setState({ dialog: 'analysis' })}>
          Ask Claude which analysis fits…
        </button>
        <Info about="Asking Claude">
          <p>Describe your experiment in your own words, paste a request into your own Claude app, and paste its plan back. Claude chooses among the analyses BioSketch can work out and gives its reasons.</p>
          <p>Nothing is sent from here and it costs nothing. The request holds a summary of each group, not the table. BioSketch works out every number itself.</p>
        </Info>
      </div>
      <div className="advice" role="note" aria-label="Suggested test">
        {advice.test ? (
          <>
            <p className="advice-title">
              <span>
                Suggested: <b>{TEST_NAMES[advice.test]}</b>
              </span>
              <Info about={`The suggested test, ${TEST_NAMES[advice.test]}`}>
                <p>
                  <b>What it does.</b> {advice.does}
                </p>
                <p>
                  <b>Why it fits this table.</b>
                </p>
                <ul>
                  {advice.why.map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
                {advice.cautions.length > 0 && (
                  <>
                    <p>
                      <b>Keep in mind.</b>
                    </p>
                    <ul>
                      {advice.cautions.map((caution, i) => (
                        <li key={i}>{caution}</li>
                      ))}
                    </ul>
                  </>
                )}
              </Info>
            </p>
            {advice.cautions.length > 0 && (
              <>
                <p>
                  <b>Keep in mind.</b>
                </p>
                <ul>
                  {advice.cautions.map((caution, i) => (
                    <li key={i}>{caution}</li>
                  ))}
                </ul>
              </>
            )}
            {advice.by && test.by !== advice.by && (
              <button className="btn small" onClick={() => setTest({ by: advice.by ?? undefined })}>
                Use this test
              </button>
            )}
          </>
        ) : (
          <p>
            <b>No test to suggest.</b> {advice.why.join(' ')}
          </p>
        )}
      </div>
      {k >= 2 && (
        <div className="with-info">
          <Segmented label="Test" value={test.by ?? 'none'} options={options} onChange={(by) => setTest({ by: by === 'none' ? undefined : by })} wrap />
          <Info about="The tests on offer for this table">
            {(two ? (['means'] as const) : (['means', 'ranks'] as const)).map((by) => {
              const id = two ? ('twoWay' as const) : testFor(k, by, !!test.paired)
              return (
                <p key={by}>
                  <b>
                    {TEST_NAMES[id]}
                    {id === chosen ? ' (chosen)' : ''}.
                  </b>{' '}
                  {TEST_DOES[id]}
                </p>
              )
            })}
            <p>
              <b>No test.</b> Nothing is worked out; you type the labels of brackets yourself.
            </p>
          </Info>
        </div>
      )}
      {outcome && !outcome.ok && <p className="notice">{outcome.problem}</p>}
      {result && (
        <div className="test-result" aria-label="Result of the test">
          {result.effects ? (
            <>
              <p>
                <b>{TEST_NAMES[result.test]}</b>
              </p>
              <ul className="chart-summary">
                {result.effects.map((e, i) => (
                  <li key={i}>
                    <span>
                      {e.name}: {e.statistic}, {pText(e.p)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>
              <b>{TEST_NAMES[result.test]}</b>: {result.statistic}, {pText(result.p)}
            </p>
          )}
          {k > 2 && (
            <>
              <p className="hint">Pairs ({result.pairMethod}):</p>
              <ul className="chart-summary">
                {pairs.slice(0, PAIRS_LISTED).map((p, i) => (
                  <li key={i}>
                    <span>
                      {p.a} and {p.b}: {p.p === null ? 'cannot be worked out' : `${pText(p.p)} (${stars(p.p)})`}
                    </span>
                  </li>
                ))}
                {pairs.length > PAIRS_LISTED && <li>and {pairs.length - PAIRS_LISTED} more pairs: add a bracket to see any of them.</li>}
              </ul>
            </>
          )}
          {result.notes.map((note, i) => (
            <p key={i} className="notice">
              {note}
            </p>
          ))}
          <div className="with-info">
            <Check checked={!!test.stars} onChange={(v) => setTest({ stars: v })}>
              Brackets show stars instead of the p value
            </Check>
            <Info about="What the stars stand for">
              <p>{STARS_KEY}</p>
              <p>Give this key in the figure legend.</p>
            </Info>
          </div>
          <button className="btn small" onClick={addBrackets}>
            {k === 2 ? 'Add a bracket with the result' : 'Add brackets where p < 0.05'}
          </button>
          {methods && (
            <div className="with-info">
              <button
                className="btn small"
                onClick={async () => toast((await copyText(methods)) ? 'Copied. Paste it into your methods or figure legend.' : 'Copying is blocked here. Open the “i” beside the button and copy the text from there.')}
              >
                Copy a text for the methods
              </button>
              <Info about="The text for the methods">
                <p>{methods}</p>
                <p>It says what was done, in words a journal accepts. Whether a difference matters is for you to write.</p>
              </Info>
            </div>
          )}
        </div>
      )}
    </Field>
  )
}

function ImageProps({ node }: { node: ImageNode }) {
  return (
    <Section title="Picture" info={<p>Drag a corner to resize the picture; hold Shift to stretch it. Arrows can attach to pictures.</p>}>
      <p className="hint">
        {Math.round(node.w)} × {Math.round(node.h)} on the page.
      </p>
    </Section>
  )
}

function ConnectorProps({ node }: { node: ConnectorNode }) {
  return (
    <Section
      title="Arrow"
      info={
        <>
          <p>Drag an end onto an icon to attach it: the arrow then follows the icon.</p>
          <p>Drag the diamond to curve the arrow, or to move the middle part of a right-angled one. Drag the small dot to move the label.</p>
        </>
      }
    >
      <Segmented label="Arrow type" value={node.kind} options={KIND_OPTIONS} onChange={(kind) => patch<ConnectorNode>('connector', { kind, ...(kind === 'double' ? { startMark: undefined } : {}) })} />
      {node.kind !== 'double' && (
        <Field label="At its start" info={<p>A second mark, at the end the arrow starts from: a head, a bar or a dot. “Reverse” turns the arrow round, each mark going with its end.</p>}>
          <Segmented
            label="Mark at the start of the arrow"
            value={node.startMark ?? 'none'}
            options={[
              { value: 'none', label: 'Nothing', title: 'No mark at the start' },
              { value: 'arrow', label: 'Head', title: 'An arrowhead at the start' },
              { value: 'inhibit', label: 'Bar', title: 'A flat bar at the start' },
              { value: 'dot', label: 'Dot', title: 'A round dot at the start' },
            ]}
            onChange={(v) => patch<ConnectorNode>('connector', v === 'none' ? { startMark: undefined } : node.kind === 'arrow' && v === 'arrow' ? { kind: 'double', startMark: undefined } : { startMark: v })}
          />
        </Field>
      )}
      <Field label="Line shape">
        <Segmented
          label="Line shape"
          value={node.route === 'elbow' ? 'elbow' : 'straight'}
          options={ROUTE_OPTIONS}
          onChange={(route) => patch<ConnectorNode>('connector', { route: route === 'elbow' ? 'elbow' : undefined, bend: undefined, legs: undefined })}
        />
      </Field>
      <div className="row">
        <Field label="Colour">
          <ColorInput label="Arrow colour" value={node.stroke} onChange={(stroke) => patch<ConnectorNode>('connector', { stroke }, 'conn-stroke')} />
        </Field>
      </div>
      <Thickness label="Line thickness" value={node.strokeWidth} max={Math.max(12, node.strokeWidth)} onChange={(strokeWidth) => patch<ConnectorNode>('connector', { strokeWidth }, 'conn-sw')} />
      <LineStyleControl
        label="Line style"
        value={node}
        onStyle={(style) => patch<ConnectorNode>('connector', lineStylePatch(style))}
        onScale={(dashScale) => patch<ConnectorNode>('connector', { dashScale: dashScale === 1 ? undefined : dashScale }, 'conn-dash')}
      />
      <Field label="Fading">
        <Segmented label="Fading" value={node.fade ?? 'none'} options={FADE_OPTIONS} onChange={(fade) => patch<ConnectorNode>('connector', { fade: fade === 'none' ? undefined : fade })} />
      </Field>
      <Field label="Label">
        <input
          type="text"
          className="text-line"
          value={node.label ?? ''}
          placeholder="e.g. phosphorylation"
          onChange={(e) => patch<ConnectorNode>('connector', { label: e.target.value || undefined }, 'conn-label')}
        />
      </Field>
      <div className="row">
        <button
          className="btn small"
          onClick={() => patchSelection((n) => (n.type === 'connector' ? reversed(n) : n))}
        >
          <Icon name="swap" size={14} /> Reverse
        </button>
        <button className="btn small" disabled={!node.bend} onClick={() => patch<ConnectorNode>('connector', { bend: undefined })}>
          Straighten
        </button>
      </div>
    </Section>
  )
}

function MembraneProps({ node }: { node: MembraneNode }) {
  return (
    <Section title="Membrane">
      <Field label={`Thickness ${node.thickness}`}>
        <Range label="Membrane thickness" value={node.thickness} min={10} max={70} onChange={(thickness) => patch<MembraneNode>('membrane', { thickness }, 'mem-thick')} />
      </Field>
      <div className="row">
        <Field label="Heads">
          <ColorInput label="Head colour" value={node.headColor} onChange={(headColor) => patch<MembraneNode>('membrane', { headColor }, 'mem-head')} />
        </Field>
        <Field label="Tails">
          <ColorInput label="Tail colour" value={node.tailColor} onChange={(tailColor) => patch<MembraneNode>('membrane', { tailColor }, 'mem-tail')} />
        </Field>
        {node.closed && (
          <Field label="Inside">
            <ColorInput label="Interior colour" value={node.fill ?? '#ffffff'} onChange={(fill) => patch<MembraneNode>('membrane', { fill }, 'mem-fill')} />
          </Field>
        )}
      </div>
      <Check checked={node.closed} onChange={(closed) => patch<MembraneNode>('membrane', { closed })}>
        Closed (cell or organelle outline)
      </Check>
      {node.closed && (
        <Check checked={!!node.fill} onChange={(v) => patch<MembraneNode>('membrane', { fill: v ? '#fff4ea' : undefined })}>
          Fill the inside
        </Check>
      )}
    </Section>
  )
}

function StrokeProps({ node }: { node: StrokeNode }) {
  return (
    <Section title="Sketch stroke">
      <div className="row">
        <Field label="Colour">
          <ColorInput label="Stroke colour" value={node.color} onChange={(color) => patch<StrokeNode>('stroke', { color }, 'stroke-color')} />
        </Field>
        <Field label="Size">
          <NumberInput label="Stroke size" value={node.size} min={1} max={60} onChange={(size) => patch<StrokeNode>('stroke', { size }, 'stroke-size')} />
        </Field>
      </div>
    </Section>
  )
}

/**
 * Resize as one picture: the selected objects, or, with nothing selected, the whole figure with
 * its page. Unlike dragging a corner, the thickness of outlines and arrows follows.
 */
function ResizeTogether({ whole }: { whole: boolean }) {
  const [percent, setPercent] = useState(150)
  const what = whole ? 'everything' : 'the selection'
  return (
    <Field
      label={whole ? 'Resize everything together' : 'Resize the selection together'}
      info={
        whole ? (
          <p>
            Every object, its text and the thickness of its lines change by the same factor, and the page with them: the figure looks the same, only larger or smaller. Icons
            and labels you add afterwards have their usual size. To look closer without changing the figure, use the zoom buttons at the top.
          </p>
        ) : (
          <p>
            The selected objects, their text and the thickness of their lines change by the same factor, so they look the same, only larger or smaller. Dragging a corner
            resizes too, but leaves lines as thick as they were.
          </p>
        )
      }
    >
      <div className="row wrap resize-together">
        <button className="btn small" aria-label={`Make ${what} smaller, to 80 percent`} onClick={() => resizeAsPicture(0.8)}>
          − Smaller
        </button>
        <button className="btn small" aria-label={`Make ${what} larger, to 125 percent`} onClick={() => resizeAsPicture(1.25)}>
          + Larger
        </button>
        <span className="resize-by">
          <NumberInput label={`Percentage to resize ${what} to`} value={percent} min={10} max={1000} step={5} onChange={setPercent} />
          <span aria-hidden="true">%</span>
          <button className="btn small" disabled={percent === 100} onClick={() => resizeAsPicture(percent / 100)}>
            Apply
          </button>
        </span>
      </div>
    </Field>
  )
}

function Arrange({ nodes }: { nodes: FigNode[] }) {
  const first = nodes[0]
  const grouped = nodes.some((n) => n.groupId)
  const rotatable = nodes.length === 1 && (first.type === 'icon' || first.type === 'shape' || first.type === 'text' || first.type === 'image' || first.type === 'chart' || first.type === 'table')
  const units = new Set(nodes.map((n) => n.groupId ?? n.id)).size
  return (
    <Section title="Arrange">
      <div className="row wrap">
        <IconButton icon="toFront" label="Bring to front" onClick={() => orderSelection('front')} />
        <IconButton icon="toBack" label="Send to back" onClick={() => orderSelection('back')} />
        <button className="btn small" title="Bring forward one step" onClick={() => orderSelection('forward')}>
          Forward
        </button>
        <button className="btn small" title="Send backward one step" onClick={() => orderSelection('backward')}>
          Backward
        </button>
      </div>
      {units > 1 && (
        <div className="row wrap">
          <IconButton icon="alignLeft" label="Align left edges" onClick={() => alignSelection('left')} />
          <IconButton icon="alignHCenter" label="Align centres horizontally" onClick={() => alignSelection('hcenter')} />
          <IconButton icon="alignRight" label="Align right edges" onClick={() => alignSelection('right')} />
          <IconButton icon="alignTop" label="Align top edges" onClick={() => alignSelection('top')} />
          <IconButton icon="alignVCenter" label="Align centres vertically" onClick={() => alignSelection('vcenter')} />
          <IconButton icon="alignBottom" label="Align bottom edges" onClick={() => alignSelection('bottom')} />
          <IconButton icon="distributeH" label="Space evenly across" disabled={units < 3} onClick={() => distributeSelection('h')} />
          <IconButton icon="distributeV" label="Space evenly down" disabled={units < 3} onClick={() => distributeSelection('v')} />
        </div>
      )}
      <div className="row wrap">
        {nodes.length > 1 && (
          <button className="btn small" onClick={groupSelection}>
            <Icon name="group" size={14} /> Group
          </button>
        )}
        {grouped && (
          <button className="btn small" onClick={ungroupSelection}>
            <Icon name="ungroup" size={14} /> Ungroup
          </button>
        )}
        <button className="btn small" onClick={duplicateSelection}>
          <Icon name="copy" size={14} /> Duplicate
        </button>
        <button className="btn small" title="Fix in place so it cannot be moved by accident" onClick={lockSelection}>
          <Icon name="lock" size={14} /> Lock
        </button>
        <button className="btn small danger" onClick={deleteSelection}>
          <Icon name="trash" size={14} /> Delete
        </button>
      </div>
      {nodes.length > 1 && <ResizeTogether whole={false} />}
      {rotatable && (
        <Field label="Rotation (degrees)">
          <NumberInput
            label="Rotation in degrees"
            value={first.rotation}
            min={-360}
            max={360}
            onChange={(rotation) => patchSelection((n) => ('rotation' in n ? { ...n, rotation } : n), 'rotation')}
          />
        </Field>
      )}
      <Appears nodes={nodes} />
    </Section>
  )
}

/** When an object comes on screen while its slide is presented: with the slide, or on a press of its own. */
function Appears({ nodes }: { nodes: FigNode[] }) {
  const slides = useEditor((s) => s.slidesShown || !!s.doc.slides)
  const most = useEditor((s) => slideSteps(s.doc.nodes))
  const now = nodes[0].appear ?? 0
  if (!slides && !nodes.some((n) => n.appear)) return null
  const mixed = nodes.some((n) => (n.appear ?? 0) !== now)
  const last = Math.min(MAX_STEPS, Math.max(most, now) + 1)
  return (
    <Field
      label="When presenting, it appears"
      info={
        <>
          <p>An object can wait for a press of its own while its slide is presented: the slide comes up without it, and it appears on the first press, the second, and so on. Several objects can appear on the same press.</p>
          <p>On the page and in exported files everything is always drawn.</p>
        </>
      }
    >
      <select
        aria-label="When the object appears while presenting"
        value={mixed ? -1 : now}
        onChange={(e) => {
          const step = Number(e.target.value)
          if (step < 0) return
          patchSelection((n) => {
            const { appear: _drop, ...rest } = n
            return (step ? { ...rest, appear: step } : rest) as FigNode
          })
        }}
      >
        {mixed && <option value={-1}>At different times</option>}
        <option value={0}>With the slide</option>
        {Array.from({ length: last }, (_, i) => (
          <option key={i + 1} value={i + 1}>
            On press {i + 1}
          </option>
        ))}
      </select>
    </Field>
  )
}

/** Transparency applies to every kind of object, so it sits right under the object's own settings. */
function Transparency({ nodes }: { nodes: FigNode[] }) {
  const opacity = nodes[0].opacity ?? 1
  return (
    <Section title="Transparency">
      <Field label={`${Math.round((1 - opacity) * 100)}% transparent`}>
        <Range
          label="Transparency"
          value={1 - opacity}
          min={0}
          max={0.9}
          step={0.05}
          onChange={(v) => patchSelection((n) => ({ ...n, opacity: v <= 0 ? undefined : Math.round((1 - v) * 100) / 100 }), 'opacity')}
        />
      </Field>
    </Section>
  )
}

// ---------- nothing selected ----------

/** Common journal figure widths. */
const PRINT_WIDTHS: { label: string; mm: number }[] = [
  { label: 'Single column', mm: 85 },
  { label: 'One and a half columns', mm: 114 },
  { label: 'Double column', mm: 174 },
]

/** Page sizes to choose from. A poster is sized in quarter millimetres with its printed width set, so its PDF comes out at the size of the paper. */
const PAGE_SIZES: { label: string; w: number; h: number; mm?: number }[] = [
  { label: 'Landscape 3:2', w: 1200, h: 800 },
  { label: 'Wide 16:9', w: 1280, h: 720 },
  { label: 'Square', w: 900, h: 900 },
  { label: 'Portrait 2:3', w: 800, h: 1200 },
  { label: 'Poster A0 upright, 841 × 1189 mm', w: 3364, h: 4756, mm: 841 },
  { label: 'Poster A0 on its side, 1189 × 841 mm', w: 4756, h: 3364, mm: 1189 },
  { label: 'Poster A1 upright, 594 × 841 mm', w: 2376, h: 3364, mm: 594 },
  { label: 'Poster 48 × 36 inches', w: 4877, h: 3658, mm: 1219 },
]

function PageProps() {
  const doc = useEditor((s) => s.doc)
  const slidesShown = useEditor((s) => s.slidesShown)
  const several = !!doc.slides
  const current = PAGE_SIZES.findIndex((p) => p.w === doc.width && p.h === doc.height)
  return (
    <Section title="Page">
      <Field label="Size">
        <select
          value={current}
          onChange={(e) => {
            const p = PAGE_SIZES[Number(e.target.value)]
            if (p) {
              patchDoc({ width: p.w, height: p.h, ...(p.mm ? { widthMm: p.mm } : {}) })
              useEditor.setState((s) => ({ fitRequest: s.fitRequest + 1 }))
            }
          }}
        >
          {current < 0 && <option value={-1}>Custom</option>}
          {PAGE_SIZES.map((p, i) => (
            <option key={p.label} value={i}>
              {p.mm ? p.label : `${p.label} (${p.w} × ${p.h})`}
            </option>
          ))}
        </select>
      </Field>
      <div className="row">
        <Field label="Width">
          <NumberInput label="Page width" value={doc.width} min={100} max={10000} step={10} onChange={(width) => patchDoc({ width }, 'page-w')} />
        </Field>
        <Field label="Height">
          <NumberInput label="Page height" value={doc.height} min={100} max={10000} step={10} onChange={(height) => patchDoc({ height }, 'page-h')} />
        </Field>
        <Field label="Colour">
          <ColorInput label="Page colour" value={doc.background} onChange={(background) => patchDoc({ background }, 'page-bg')} />
        </Field>
      </div>
      {several && (
        <div className="row wrap">
          <p className="hint">The colour is that of this slide.</p>
          <button className="btn small" disabled={slideList(doc).every((s) => s.background === doc.background)} onClick={() => useEditor.getState().commit((d) => colourSlides(d, d.background))}>
            Use it on every slide
          </button>
        </div>
      )}
      <ResizeTogether whole />
      <Field label="Printed width (for journals)">
        <select
          value={doc.widthMm ? (PRINT_WIDTHS.some((w) => w.mm === doc.widthMm) ? String(doc.widthMm) : 'custom') : ''}
          onChange={(e) => {
            const v = e.target.value
            // "Other width" starts from 100 mm unless a non-standard width is already set.
            const other = doc.widthMm && !PRINT_WIDTHS.some((w) => w.mm === doc.widthMm) ? doc.widthMm : 100
            patchDoc({ widthMm: v === '' ? undefined : v === 'custom' ? other : Number(v) })
          }}
        >
          <option value="">Not set</option>
          {PRINT_WIDTHS.map((w) => (
            <option key={w.mm} value={w.mm}>
              {w.label} ({w.mm} mm)
            </option>
          ))}
          <option value="custom">Other width…</option>
        </select>
      </Field>
      {!!doc.widthMm && (
        <div className="row">
          <Field label="Width in mm">
            <NumberInput label="Printed width in millimetres" value={doc.widthMm} min={10} max={1000} onChange={(widthMm) => patchDoc({ widthMm }, 'page-mm')} />
          </Field>
          <p className="hint">Height {Math.round(((doc.widthMm * doc.height) / doc.width) * 10) / 10} mm</p>
        </div>
      )}
      {(several || slidesShown || !!doc.notes) && (
        <Field
          label="Notes for the speaker, for this slide"
          info={<p>What you want to say at this slide. The notes are shown beside the slide while you present (the button with the “T”, or the N key); they are never drawn on the slide or exported.</p>}
        >
          <textarea
            rows={4}
            aria-label="Notes for the speaker, for this slide"
            placeholder="What you want to say at this slide"
            value={doc.notes ?? ''}
            maxLength={MAX_NOTES}
            onChange={(e) => {
              const notes = e.target.value
              useEditor.getState().commit(
                (d) => {
                  const { notes: _drop, ...rest } = d
                  return notes ? { ...rest, notes } : rest
                },
                { merge: 'slide-notes' },
              )
            }}
          />
        </Field>
      )}
    </Section>
  )
}

/** Things to add to the page that are not icons. */
function AddToPage() {
  const locked = useEditor((s) => s.doc.nodes.reduce((n, node) => n + (node.locked && !node.guide ? 1 : 0), 0))
  const guides = useEditor((s) => s.doc.nodes.reduce((n, node) => n + (node.guide ? 1 : 0), 0))
  const file = useRef<HTMLInputElement>(null)
  return (
    <Section
      title="Add to the page"
      info={
        <>
          <p>Pictures (micrographs, plots) can also be dragged in from your computer or pasted.</p>
          <p>A chart is drawn from numbers you paste, and stays editable.</p>
          <p>A panel letter is the next of A, B, C…</p>
        </>
      }
    >
      <div className="row wrap">
        <button className="btn small" onClick={() => file.current?.click()}>
          <Icon name="image" size={14} /> Picture
        </button>
        <button className="btn small" title="Add the next panel letter: A, B, C…" onClick={addPanelLetter}>
          <Icon name="text" size={14} /> Panel letter
        </button>
        <button className="btn small" title="Add a chart drawn from your own numbers" onClick={addChart}>
          <Icon name="chart" size={14} /> Chart
        </button>
        <button className="btn small" title="Add a table of words and numbers, pasted from a spreadsheet or typed" onClick={() => addTable()}>
          <Icon name="grid" size={14} /> Table
        </button>
      </div>
      <Field label="Panels">
        <select
          aria-label="Divide the page into panels"
          value=""
          onChange={(e) => {
            if (e.target.value) addPanels(e.target.value as PanelLayout)
          }}
        >
          <option value="">Divide the page into panels…</option>
          {PANEL_LAYOUTS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </Field>
      {guides > 0 && (
        <button className="btn small" onClick={removeGuides}>
          <Icon name="trash" size={14} /> Remove panel frames ({guides})
        </button>
      )}
      <input
        ref={file}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void placeImageFile(f)
          e.target.value = ''
        }}
      />
      {locked > 0 && (
        <button className="btn small" onClick={unlockAll}>
          <Icon name="unlock" size={14} /> Unlock all ({locked})
        </button>
      )}
    </Section>
  )
}

function ToolOptions() {
  // Each value is selected separately so panning and zooming (which change the store on every
  // frame) do not re-render this panel.
  const tool = useEditor((st) => st.tool)
  const shapeKind = useEditor((st) => st.shapeKind)
  const connectorKind = useEditor((st) => st.connectorKind)
  const connectorLine = useEditor((st) => st.connectorLine)
  const shapeText = useEditor((st) => st.shapeText)
  const connectorFade = useEditor((st) => st.connectorFade)
  const connectorRoute = useEditor((st) => st.connectorRoute)
  const connectorWidth = useEditor((st) => st.connectorWidth)
  const membraneThickness = useEditor((st) => st.membraneThickness)
  const penColor = useEditor((st) => st.penColor)
  const penSize = useEditor((st) => st.penSize)
  const strokes = useEditor((st) => st.doc.nodes.reduce((count, n) => count + (n.type === 'stroke' ? 1 : 0), 0))
  const set = useEditor((st) => st.set)
  const commit = useEditor((st) => st.commit)
  switch (tool) {
    case 'shape':
      return (
        <Section title="Shape tool" info={<p>Drag on the page to draw. Hold Shift for a square or circle. Double-tap any shape to type inside it.</p>}>
          <ShapePicker value={shapeKind} onChange={(shapeKind) => set({ shapeKind })} />
          <Check checked={shapeText} onChange={(shapeText) => set({ shapeText })}>
            Type text inside after drawing
          </Check>
        </Section>
      )
    case 'connector':
      return (
        <Section title="Arrow tool" info={<p>Drag from one icon to another. Ends that start or finish on an icon stay attached when you move it. Hold Alt to keep an end free.</p>}>
          <Segmented label="Arrow type" value={connectorKind} options={KIND_OPTIONS} onChange={(connectorKind) => set({ connectorKind })} />
          <Field label="Line shape">
            <Segmented label="Line shape" value={connectorRoute} options={ROUTE_OPTIONS} onChange={(connectorRoute) => set({ connectorRoute })} />
          </Field>
          <Thickness label="Line thickness" value={connectorWidth} onChange={(connectorWidth) => set({ connectorWidth })} />
          <LineStyleControl label="Line style" value={lineStylePatch(connectorLine)} onStyle={(connectorLine) => set({ connectorLine })} />
          <Field label="Fading">
            <Segmented label="Fading" value={connectorFade ?? 'none'} options={FADE_OPTIONS} onChange={(fade) => set({ connectorFade: fade === 'none' ? null : fade })} />
          </Field>
        </Section>
      )
    case 'membrane':
      return (
        <Section title="Membrane brush" info={<p>Draw a line to lay down a lipid bilayer. Finish near where you started to close it into a cell. Hold Shift for a straight membrane.</p>}>
          <Field label={`Thickness ${membraneThickness}`}>
            <Range label="Membrane thickness" value={membraneThickness} min={10} max={70} onChange={(membraneThickness) => set({ membraneThickness })} />
          </Field>
        </Section>
      )
    case 'pen':
    case 'eraser':
      return (
        <Section
          title={tool === 'pen' ? 'Sketch pen' : 'Sketch eraser'}
          info={<p>{tool === 'pen' ? 'Sketch freely with a pen, finger or mouse. With an Apple Pencil, one finger moves the page and two fingers zoom.' : 'Drag over sketch strokes to remove them. Other objects are not affected.'}</p>}
        >
          {tool === 'pen' && (
            <div className="row">
              <Field label="Colour">
                <ColorInput label="Pen colour" value={penColor} onChange={(penColor) => set({ penColor })} />
              </Field>
              <Field label={`Size ${penSize}`}>
                <Range label="Pen size" value={penSize} min={1} max={24} onChange={(penSize) => set({ penSize })} />
              </Field>
            </div>
          )}
          <button
            className="btn small"
            disabled={!strokes}
            onClick={() => {
              commit((d) =>
                removeNodes(
                  d,
                  d.nodes.filter((n) => n.type === 'stroke').map((n) => n.id),
                ),
              )
              toast('Sketch cleared')
            }}
          >
            <Icon name="trash" size={14} /> Clear sketch ({strokes})
          </button>
        </Section>
      )
    default:
      return null
  }
}

export function PropertiesPanel() {
  const doc = useEditor((s) => s.doc)
  const selection = useEditor((s) => s.selection)
  const set = new Set(selection)
  const nodes = doc.nodes.filter((n) => set.has(n.id))
  const first = nodes[0]
  const sameType = !!first && nodes.every((n) => n.type === first.type)

  return (
    <aside className="panel properties" aria-label="Properties">
      {!first && (
        <>
          <ToolOptions />
          <AddToPage />
          <PageProps />
          <p className="hint pad">Select something on the page to change its colours, transparency, size and order.</p>
        </>
      )}
      {first && (
        <>
          {nodes.length > 1 && <p className="selection-count">{nodes.length} objects selected</p>}
          {sameType && first.type === 'icon' && <IconProps node={first} single={nodes.length === 1} />}
          {sameType && first.type === 'image' && <ImageProps node={first} />}
          {sameType && first.type === 'chart' && nodes.length === 1 && <ChartProps key={first.id} node={first} />}
          {sameType && first.type === 'table' && nodes.length === 1 && <TableProps key={first.id} node={first} />}
          {sameType && first.type === 'shape' && <ShapeProps node={first} single={nodes.length === 1} />}
          {sameType && first.type === 'text' && <TextProps node={first} single={nodes.length === 1} />}
          {sameType && first.type === 'connector' && <ConnectorProps node={first} />}
          {sameType && first.type === 'membrane' && <MembraneProps node={first} />}
          {sameType && first.type === 'stroke' && <StrokeProps node={first} />}
          <Transparency nodes={nodes} />
          <Arrange nodes={nodes} />
        </>
      )}
      <ObjectsList />
    </aside>
  )
}
