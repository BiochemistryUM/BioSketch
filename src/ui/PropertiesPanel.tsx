// The right-hand panel: settings for whatever is selected, or for the page and the active tool.

import { useId, useRef, useState, type ReactNode } from 'react'
import {
  addChart,
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
  ungroupSelection,
  unlockAll,
  addPanels,
  removeGuides,
} from '../actions'
import { getIcon } from '../icons/library'
import { extractColors, isHexColor, normalizeHex } from '../icons/svg'
import { finishReshape, startReshape } from '../icons/reshape'
import { splitIcon } from '../icons/split'
import { placeImageFile } from '../io/images'
import { removeNodes } from '../model/doc'
import { SYMBOL_GROUPS, insertText, wrapSelection } from '../model/richtext'
import { SHAPE_KINDS, shapePath } from '../model/shapes'
import {
  MAX_BRACKETS, MAX_REF_LINES, POINT_OPACITY_MIN, POINT_SIZE_MAX, POINT_SIZE_MIN,
  bracketLabel, carryOver, chartAdvice, chartAnalysis, chartLayout, chartSamples, chartSeries, crossTable, hasPoints, headRows, isGrouped, pointStyle, readTable, scatterFits, shownValues, stats, tableText, withTestBrackets,
  type TableReport,
} from '../model/chart'
import { INSTRUCTION_EXAMPLES, applyInstruction } from '../model/chartCommands'
import { PALETTES, paletteColours } from '../model/palettes'
import { TABLE_ACCEPT, tableFromFile } from '../io/tables'
import { boxStats } from '../model/chartStats'
import { STARS_KEY, TEST_DOES, TEST_NAMES, TEST_SHORT, pText, stars, testFor } from '../model/chartTests'
import { DASH_SCALE_MAX, DASH_SCALE_MIN, dashArray, hasDots, lineStyleOf, lineStylePatch, type Dashable, type LineStyle } from '../model/dash'
import { SHAPE_LABEL_DEFAULT } from '../model/nodes'
import type { ChartBracket, ChartGroup, ChartKind, ChartNode, ChartRefLine, ChartTest, ConnectorFade, ConnectorKind, ConnectorNode, FigNode, FontFamily, IconNode, ImageNode, LegendPlace, MembraneNode, PointShape, ShapeKind, ShapeNode, StrokeNode, TextAlign, TextNode } from '../model/types'
import { toast, useEditor } from '../store'
import { PANEL_LAYOUTS, type PanelLayout } from '../model/panels'
import { rememberStyle } from '../figures'
import { ObjectsList } from './ObjectsList'
import { Icon, type IconName } from './Icon'

// ---------- small form parts ----------

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <section className="section" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
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

const STYLE_OPTIONS: { value: 'outlined' | 'flat'; label: string; title: string }[] = [
  { value: 'outlined', label: 'Outlined', title: 'Soft colours with a darker outline' },
  { value: 'flat', label: 'Flat cartoon', title: 'Vivid colours, no dark outlines, soft light and shadow' },
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

function patch<T extends FigNode>(type: T['type'], change: Partial<T>, merge?: string): void {
  patchSelection((n) => (n.type === type ? ({ ...n, ...change } as FigNode) : n), merge)
}

// ---------- per-type sections ----------

function IconProps({ node, single }: { node: IconNode; single: boolean }) {
  const doc = useEditor((s) => s.doc)
  const def = getIcon(doc, node.iconId)
  const reshaping = useEditor((s) => s.reshape?.nodeId === node.id)
  const colors = def ? extractColors(def.body).slice(0, 10) : []
  return (
    <Section title={def?.name ?? 'Icon'}>
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
          <button className="btn small primary" onClick={finishReshape}>
            Done reshaping
          </button>
          <p className="hint">Drag the points to change the outline. Curves next to a point follow it.</p>
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
          </div>
          <p className="hint">
            Split turns the icon into separate pieces: double-tap a piece to select it alone, then move, stretch, turn, recolour or delete it. Reshape shows the points
            of the outline so you can drag them.
          </p>
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
      return text ? { ...rest, label: { ...(old ?? SHAPE_LABEL_DEFAULT), text } } : rest
    }, 'shape-text')
  /** Change how the words look, on every selected shape that has some. */
  const setLabel = (change: Partial<NonNullable<ShapeNode['label']>>, merge?: string) =>
    patchSelection((n) => (n.type === 'shape' && n.label ? { ...n, label: { ...n.label, ...change } } : n), merge)
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
        <Field label="Text inside">
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
      {single && (
        <p className="hint">
          Long lines break to fit the shape, and the text stays in place when the shape is moved or resized. Press Enter for a new line; Ca^{'{2+}'}, H_{'{2}'}O,
          *italic* and **bold** work here too.
        </p>
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
    <Section title="Text">
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
          <p className="hint">
            Select characters in the box, then press a button. Or type the marks yourself: Ca^{'{2+}'}, H_{'{2}'}O, *italic*, **bold**.
          </p>
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
      <Segmented label="Text alignment" value={node.align} options={aligns} onChange={(align) => patch<TextNode>('text', { align })} />
    </Section>
  )
}

const CHART_OPTIONS: { value: ChartKind; label: string; title: string }[] = [
  { value: 'bar', label: 'Bars', title: 'A bar for the mean of each group' },
  { value: 'dot', label: 'Dots', title: 'Every value as a dot, with a line at the mean' },
  { value: 'box', label: 'Box', title: 'Median, quartiles and whiskers of each group' },
  { value: 'violin', label: 'Violin', title: 'The spread of the values in each group as an outline' },
  { value: 'line', label: 'Line', title: 'The means joined by a line, in the order of the columns' },
  { value: 'scatter', label: 'Scatter', title: 'Pairs of x and y values as points' },
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
function AxisRange(props: { title: string; min: number | undefined; max: number | undefined; log: boolean; onMin: (v: number | undefined) => void; onMax: (v: number | undefined) => void; onLog: (v: boolean) => void }) {
  return (
    <Field label={props.title}>
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
    notices.push(`The table is larger than a chart takes: ${parts.join(' and ')} were left out.`)
  }
  if (report.commasUnclear) notices.push('Commas were read as decimal commas (1,234 is taken as 1.234). If yours separate thousands, remove them.')
  if (report.numericNames) notices.push('The names in the first row are all numbers. If that row holds values, choose “None” under “Rows of names”.')
  return notices
}

function ChartProps({ node }: { node: ChartNode }) {
  // While the numbers are being typed the box shows exactly what was typed. That text is kept for
  // as long as the chart still holds the groups read from it; when they change in any other way
  // (undo, another kind of chart, a new colour) the box shows the chart's own table again.
  const [typed, setTyped] = useState<{ text: string; groups: ChartGroup[]; head?: 0 | 1 | 2; report: TableReport } | null>(null)
  const live = typed && typed.groups === node.groups ? typed : null
  const scatter = node.kind === 'scatter'
  const grouped = isGrouped(node)
  const set = (change: Partial<ChartNode>, merge?: string) => patch<ChartNode>('chart', change, merge)
  const ownHead = headRows(node.groups, node.kind)
  const shownText = live ? live.text : tableText(node.groups, node.kind)

  /** Read the table and put it in the chart. Colours and brackets stay with their groups. */
  const read = (text: string, chosen: 0 | 1 | 2 | undefined) => {
    // Unless the scientist said how many rows of names there are, the table keeps at least as
    // many as it had: a first row made of numbers (doses, time points) stays a row of names.
    const guess = readTable(text, node.kind)
    const head = Math.min(chosen ?? Math.max(guess.head, ownHead), scatter ? 1 : 2) as 0 | 1 | 2
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
    if ((kind === 'scatter') === scatter) return set({ kind })
    const back = crossed.current
    crossed.current = null
    if (back && back.result === node.groups) {
      const b = back.before
      return set({ kind: (b.kind === 'scatter') === (kind === 'scatter') ? kind : b.kind, groups: b.groups, brackets: b.brackets, test: b.test, refLines: b.refLines, fit: b.fit, xMin: b.xMin, xMax: b.xMax, xLog: b.xLog })
    }
    const result = crossTable(node.groups, node.kind, kind)
    crossed.current = { before: node, result }
    const across = refLines.filter((l) => l.axis === 'y')
    set({ kind, groups: result, brackets: undefined, test: undefined, fit: undefined, xMin: undefined, xMax: undefined, xLog: undefined, refLines: across.length ? across : undefined })
    toast(kind === 'scatter' ? 'A scatter chart reads the first column of the table as the x values. Choose another kind again to get your chart back.' : 'The x values became the first group. Choose Scatter again to get your chart back.')
  }

  const drawing = chartLayout(node)
  const series = chartSeries(node)
  const drawn = node.groups.map((group, index) => ({ group, index })).filter((c) => c.group.values.length)
  const fits = scatter ? scatterFits(node) : []
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
    showsPoints && (
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
  const hasLegend = grouped || (scatter && series.length > 1)
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

  return (
    <Section title="Chart">
      <Segmented label="Chart type" value={node.kind} options={CHART_OPTIONS} onChange={onKind} wrap />
      <Field label="Describe a change">
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
        <details className="instruction-help">
          <summary>What you can ask for</summary>
          <p className="hint">Write in plain words; several things at once are fine. This box reads set phrases in your browser (no AI, nothing is sent anywhere) and tells you what it did or did not understand. Examples:</p>
          <ul>
            {INSTRUCTION_EXAMPLES.map((example) => (
              <li key={example}>
                <button className="example" onClick={() => setAsked(example)}>
                  {example}
                </button>
              </li>
            ))}
          </ul>
        </details>
      </Field>
      <Field label="Numbers">
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
      <Field label="Rows of names at the top">
        <Segmented
          label="Rows of names at the top"
          value={String(live ? live.report.head : ownHead) as '0' | '1' | '2'}
          options={scatter ? HEAD_OPTIONS.slice(0, 2) : HEAD_OPTIONS}
          onChange={(v) => read(shownText, Number(v) as 0 | 1 | 2)}
        />
      </Field>
      <p className="hint">
        {scatter
          ? 'First column: the x values. Each further column: the y values of one series, with its name in the first row. To write names beside points (genes, samples), put a column of names before the x values; only rows with a name are labelled.'
          : 'One column per group, with its name in the first row; one row per replicate. For a grouped chart, add a row above with the category of each column (for example WT, WT, KO, KO).'}{' '}
        Paste from a spreadsheet, type with tabs, commas or spaces between the numbers, or import a .csv, .txt or .xlsx file (the first sheet).
      </p>
      {[...(live ? tableNotices(live.report) : []), ...drawing.notes].map((note, i) => (
        <p key={i} className="notice">
          {note}
        </p>
      ))}
      {series.length > 0 && (
        <ul className="chart-summary" aria-label="What the chart shows">
          {scatter || !grouped
            ? series.map((entry, i) => {
                const fit = fits[i]?.fit
                const group = node.groups[entry.groups[0]]
                return (
                  <li key={i}>
                    {colourBox(entry)}
                    {shapeBox(entry)}
                    <span>
                      <b>{entry.name}</b>:{' '}
                      {scatter
                        ? `${fits[i]?.points ?? 0} points${(fits[i]?.points ?? 0) < group.values.length ? ` of ${group.values.length} (the rest are not above zero)` : ''}${node.fit && fit ? `; line ${node.yLog ? 'log y' : 'y'} = ${short(fit.slope)} × ${node.xLog ? 'log x' : 'x'} ${fit.intercept < 0 ? '−' : '+'} ${short(Math.abs(fit.intercept))}, R² = ${short(fit.r2)}` : ''}`
                        : about(group)}
                    </span>
                  </li>
                )
              })
            : [
                ...series.map((entry, i) => (
                  <li key={`s${i}`}>
                    {colourBox(entry)}
                    {shapeBox(entry)}
                    <span>
                      <b>{entry.name}</b>
                    </span>
                  </li>
                )),
                ...drawn.map(({ group }, i) => (
                  <li key={`g${i}`}>
                    <span>
                      <b>{groupName(group)}</b>: {about(group)}
                    </span>
                  </li>
                )),
              ]}
        </ul>
      )}
      {(node.kind === 'bar' || node.kind === 'dot' || node.kind === 'line') && (
        <Field label="Error bars">
          <Segmented label="Error bars" value={node.error ?? 'none'} options={ERROR_OPTIONS} onChange={(error) => set({ error: error === 'none' ? undefined : error })} />
        </Field>
      )}
      {node.kind !== 'dot' && !scatter && (
        <Check checked={!!node.points} onChange={(v) => set({ points: v || undefined })}>
          Show every value as a dot
        </Check>
      )}
      {scatter && (
        <Check checked={!!node.fit} onChange={(v) => set({ fit: v || undefined })}>
          Draw a fitted straight line
        </Check>
      )}
      {showsPoints && (
        <Field label="Points">
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
          <p className="hint">
            {series.length > 1 ? 'Change all points, or choose one group to give it a size and transparency of its own. ' : ''}The shape is chosen beside each group’s colour, above. Transparent points show where many lie on top of each other.
          </p>
        </Field>
      )}
      <Field label="Colours">
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
        <p className="hint">{PALETTES.find((p) => p.id === (node.palette ?? 'biosketch'))?.about} Choosing a palette recolours every group; a single group can still be given its own colour above.</p>
      </Field>
      {hasLegend && (
        <Field label="Legend">
          <select aria-label="Place of the legend" value={node.legend ?? 'right'} onChange={(e) => set({ legend: e.target.value === 'right' ? undefined : (e.target.value as LegendPlace) })}>
            {LEGEND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      )}
      <AxisRange
        title={scatter ? 'Range of the y axis' : 'Range of the value axis'}
        min={node.yMin}
        max={node.yMax}
        log={!!node.yLog}
        onMin={(yMin) => set({ yMin }, 'chart-range')}
        onMax={(yMax) => set({ yMax }, 'chart-range')}
        onLog={(v) => set({ yLog: v || undefined })}
      />
      {scatter && (
        <AxisRange
          title="Range of the x axis"
          min={node.xMin}
          max={node.xMax}
          log={!!node.xLog}
          onMin={(xMin) => set({ xMin }, 'chart-range')}
          onMax={(xMax) => set({ xMax }, 'chart-range')}
          onLog={(v) => set({ xLog: v || undefined })}
        />
      )}
      <Field label="Reference lines">
        {refLines.map((l, i) => (
          <div key={i} className="bracket-row">
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
        <p className="hint">A dashed line across the plot at a value you choose, for example a threshold or a detection limit.</p>
      </Field>
      {!scatter && <ChartTestProps node={node} set={set} />}
      {!scatter && (
        <Field label="Significance brackets">
          {brackets.map((b, i) => (
            <div key={i} className="bracket-row">
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
          <p className="hint">
            {testing
              ? 'Choose two groups. A bracket that follows the test shows its result for these two groups and changes with the numbers; or type a label of your own.'
              : 'Choose two groups and type the label yourself (for example p = 0.03, ** or ns), or choose a test above and let the brackets show its result.'}
          </p>
        </Field>
      )}
      <Field label="Title">
        <input type="text" className="text-line" maxLength={120} value={node.title ?? ''} placeholder="e.g. Cell viability" onChange={(e) => set({ title: e.target.value.trim() ? e.target.value : undefined }, 'chart-title')} />
      </Field>
      <Field label={scatter ? 'Title of the y axis' : 'Title of the value axis'}>
        <input type="text" className="text-line" maxLength={120} value={node.yLabel ?? ''} placeholder="e.g. Viable cells (%)" onChange={(e) => set({ yLabel: e.target.value.trim() ? e.target.value : undefined }, 'chart-ylabel')} />
      </Field>
      <Field label="Title of the x axis">
        <input type="text" className="text-line" maxLength={120} value={node.xLabel ?? ''} placeholder={scatter ? 'e.g. Dose (µM)' : 'e.g. Genotype'} onChange={(e) => set({ xLabel: e.target.value.trim() ? e.target.value : undefined }, 'chart-xlabel')} />
      </Field>
      <Field label="Text size">
        <NumberInput label="Size of the chart's text" value={node.fontSize ?? 13} min={6} max={60} onChange={(fontSize) => set({ fontSize }, 'chart-font')} />
      </Field>
      <p className="hint">
        Drag a corner to resize the chart. Titles and names accept Ca^{'{2+}'}, H_{'{2}'}O, *italic* and **bold**.{' '}
        {node.kind === 'box'
          ? 'The box runs from the first to the third quartile with a line at the median; each whisker ends at the furthest value within 1.5 box lengths, and values beyond are drawn as rings.'
          : node.kind === 'violin'
            ? 'The outline is a smoothed estimate of how the values are spread, from the smallest to the largest value; the line marks the median. All violins have the same greatest width.'
            : scatter
              ? 'A fitted line is the least-squares line of y on x, drawn across the x values of its series; on a logarithmic axis it is fitted to the logarithms.'
              : 'The value axis includes zero unless you set its range or make it logarithmic.'}
      </p>
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
    const kept: ChartTest = { ...(next.by ? { by: next.by } : {}), ...(next.paired ? { paired: true } : {}), ...(next.versusFirst ? { versusFirst: true } : {}), ...(next.stars ? { stars: true } : {}) }
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
  const pairs = result ? result.pairs.map((p) => ({ from: compared.indexes[p.a], to: compared.indexes[p.b], a: compared.names[p.a], b: compared.names[p.b], p: p.p })) : []
  /** Brackets for the pairs the test finds different (with two groups: for the one pair, whatever it finds). */
  const addBrackets = () => {
    const out = withTestBrackets(node)
    if (!out.added && !out.over) return toast(k === 2 || out.different ? `The chart already has ${k === 2 ? 'this bracket' : 'these brackets'}.` : 'No pair of groups has p below 0.05, so there is no bracket to add.')
    if (out.added) set({ brackets: out.brackets })
    if (out.over) toast(`A chart takes at most ${MAX_BRACKETS} brackets: ${out.over} could not be added.`)
  }
  const options: { value: 'none' | 'means' | 'ranks'; label: string; title: string }[] = [
    { value: 'none', label: 'No test', title: 'Do not test; type the labels of brackets yourself' },
    { value: 'means', label: TEST_SHORT[testFor(k, 'means', !!test.paired)], title: `Compare means: ${TEST_NAMES[testFor(k, 'means', !!test.paired)]}` },
    { value: 'ranks', label: TEST_SHORT[testFor(k, 'ranks', !!test.paired)], title: `Compare ranks: ${TEST_NAMES[testFor(k, 'ranks', !!test.paired)]}` },
  ]
  const chosen = test.by ? testFor(k, test.by, !!test.paired) : null

  return (
    <Field label="Statistical test">
      <p className="hint">How do you want to compare the groups?</p>
      <Check checked={!!test.paired} onChange={(paired) => setTest({ paired })}>
        Each row is one sample (animal, culture, patient) measured in every group
      </Check>
      {k > 2 && (
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
      <div className="advice" role="note" aria-label="Suggested test">
        {advice.test ? (
          <>
            <p className="advice-title">
              Suggested: <b>{TEST_NAMES[advice.test]}</b>
            </p>
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
      {k >= 2 && <Segmented label="Test" value={test.by ?? 'none'} options={options} onChange={(by) => setTest({ by: by === 'none' ? undefined : by })} wrap />}
      {chosen && advice.test && chosen !== advice.test && (
        <p className="hint">
          <b>{TEST_NAMES[chosen]}.</b> {TEST_DOES[chosen]}
        </p>
      )}
      {outcome && !outcome.ok && <p className="notice">{outcome.problem}</p>}
      {result && (
        <div className="test-result" aria-label="Result of the test">
          <p>
            <b>{TEST_NAMES[result.test]}</b>: {result.statistic}, {pText(result.p)}
          </p>
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
          <Check checked={!!test.stars} onChange={(v) => setTest({ stars: v })}>
            Brackets show stars instead of the p value
          </Check>
          {test.stars && <p className="hint">{STARS_KEY}</p>}
          <button className="btn small" onClick={addBrackets}>
            {k === 2 ? 'Add a bracket with the result' : 'Add brackets where p < 0.05'}
          </button>
          <p className="hint">All p values are two-sided and worked out as R does by default. Results are not stored: they follow the numbers in the table.</p>
        </div>
      )}
    </Field>
  )
}

function ImageProps({ node }: { node: ImageNode }) {
  return (
    <Section title="Picture">
      <p className="hint">
        {Math.round(node.w)} × {Math.round(node.h)} on the page. Drag a corner to resize; hold Shift to stretch. Arrows can attach to pictures.
      </p>
    </Section>
  )
}

function ConnectorProps({ node }: { node: ConnectorNode }) {
  return (
    <Section title="Arrow">
      <Segmented label="Arrow type" value={node.kind} options={KIND_OPTIONS} onChange={(kind) => patch<ConnectorNode>('connector', { kind })} />
      <Field label="Line shape">
        <Segmented
          label="Line shape"
          value={node.route === 'elbow' ? 'elbow' : 'straight'}
          options={ROUTE_OPTIONS}
          onChange={(route) => patch<ConnectorNode>('connector', { route: route === 'elbow' ? 'elbow' : undefined, bend: undefined })}
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
          onClick={() => patchSelection((n) => (n.type === 'connector' ? { ...n, from: n.to, to: n.from } : n))}
        >
          <Icon name="swap" size={14} /> Reverse
        </button>
        <button className="btn small" disabled={!node.bend} onClick={() => patch<ConnectorNode>('connector', { bend: undefined })}>
          Straighten
        </button>
      </div>
      <p className="hint">Drag an end onto an icon to attach it. Drag the diamond to curve the arrow or move its middle segment. Drag the small dot to move the label.</p>
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

function Arrange({ nodes }: { nodes: FigNode[] }) {
  const first = nodes[0]
  const grouped = nodes.some((n) => n.groupId)
  const rotatable = nodes.length === 1 && (first.type === 'icon' || first.type === 'shape' || first.type === 'text' || first.type === 'image' || first.type === 'chart')
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
    </Section>
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

const PAGE_SIZES: { label: string; w: number; h: number }[] = [
  { label: 'Landscape 3:2', w: 1200, h: 800 },
  { label: 'Wide 16:9', w: 1280, h: 720 },
  { label: 'Square', w: 900, h: 900 },
  { label: 'Portrait 2:3', w: 800, h: 1200 },
]

function PageProps() {
  const doc = useEditor((s) => s.doc)
  const current = PAGE_SIZES.findIndex((p) => p.w === doc.width && p.h === doc.height)
  return (
    <Section title="Page">
      <Field label="Size">
        <select
          value={current}
          onChange={(e) => {
            const p = PAGE_SIZES[Number(e.target.value)]
            if (p) {
              patchDoc({ width: p.w, height: p.h })
              useEditor.setState((s) => ({ fitRequest: s.fitRequest + 1 }))
            }
          }}
        >
          {current < 0 && <option value={-1}>Custom</option>}
          {PAGE_SIZES.map((p, i) => (
            <option key={p.label} value={i}>
              {p.label} ({p.w} × {p.h})
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
      <Field label="Icon style">
        <Segmented
          label="Style of the built-in icons"
          value={doc.iconStyle ?? 'outlined'}
          options={STYLE_OPTIONS}
          onChange={(v) => {
            const iconStyle = v === 'flat' ? 'flat' : undefined
            patchDoc({ iconStyle })
            rememberStyle(iconStyle)
          }}
        />
      </Field>
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
    </Section>
  )
}

/** Things to add to the page that are not icons. */
function AddToPage() {
  const locked = useEditor((s) => s.doc.nodes.reduce((n, node) => n + (node.locked && !node.guide ? 1 : 0), 0))
  const guides = useEditor((s) => s.doc.nodes.reduce((n, node) => n + (node.guide ? 1 : 0), 0))
  const file = useRef<HTMLInputElement>(null)
  return (
    <Section title="Add to the page">
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
      </div>
      <p className="hint">Pictures (micrographs, plots) can also be dragged in from your computer or pasted. A chart is drawn from numbers you paste, and stays editable.</p>
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
        <Section title="Shape tool">
          <ShapePicker value={shapeKind} onChange={(shapeKind) => set({ shapeKind })} />
          <Check checked={shapeText} onChange={(shapeText) => set({ shapeText })}>
            Type text inside after drawing
          </Check>
          <p className="hint">Drag on the page to draw. Hold Shift for a square or circle. Double-tap any shape to type inside it.</p>
        </Section>
      )
    case 'connector':
      return (
        <Section title="Arrow tool">
          <Segmented label="Arrow type" value={connectorKind} options={KIND_OPTIONS} onChange={(connectorKind) => set({ connectorKind })} />
          <Field label="Line shape">
            <Segmented label="Line shape" value={connectorRoute} options={ROUTE_OPTIONS} onChange={(connectorRoute) => set({ connectorRoute })} />
          </Field>
          <Thickness label="Line thickness" value={connectorWidth} onChange={(connectorWidth) => set({ connectorWidth })} />
          <LineStyleControl label="Line style" value={lineStylePatch(connectorLine)} onStyle={(connectorLine) => set({ connectorLine })} />
          <Field label="Fading">
            <Segmented label="Fading" value={connectorFade ?? 'none'} options={FADE_OPTIONS} onChange={(fade) => set({ connectorFade: fade === 'none' ? null : fade })} />
          </Field>
          <p className="hint">Drag from one icon to another. Ends that start or finish on an icon stay attached when you move it. Hold Alt to keep an end free.</p>
        </Section>
      )
    case 'membrane':
      return (
        <Section title="Membrane brush">
          <Field label={`Thickness ${membraneThickness}`}>
            <Range label="Membrane thickness" value={membraneThickness} min={10} max={70} onChange={(membraneThickness) => set({ membraneThickness })} />
          </Field>
          <p className="hint">Draw a line to lay down a lipid bilayer. Finish near where you started to close it into a cell. Hold Shift for a straight membrane.</p>
        </Section>
      )
    case 'pen':
    case 'eraser':
      return (
        <Section title={tool === 'pen' ? 'Sketch pen' : 'Sketch eraser'}>
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
          <p className="hint">
            {tool === 'pen'
              ? 'Sketch freely with a pen, finger or mouse. With an Apple Pencil, one finger moves the page and two fingers zoom.'
              : 'Drag over sketch strokes to remove them. Other objects are not affected.'}
          </p>
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
