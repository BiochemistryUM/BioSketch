// The right-hand panel: settings for whatever is selected, or for the page and the active tool.

import { useId, useState, type ReactNode } from 'react'
import {
  alignSelection,
  deleteSelection,
  distributeSelection,
  duplicateSelection,
  groupSelection,
  orderSelection,
  patchDoc,
  patchSelection,
  ungroupSelection,
} from '../actions'
import { getIcon } from '../icons/library'
import { extractColors, isHexColor, normalizeHex } from '../icons/svg'
import { removeNodes } from '../model/doc'
import type { ConnectorKind, ConnectorNode, FigNode, IconNode, MembraneNode, ShapeKind, ShapeNode, StrokeNode, TextAlign, TextNode } from '../model/types'
import { toast, useEditor } from '../store'
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

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string; title?: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
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
  { value: 'line', label: '—', title: 'Plain line / association' },
  { value: 'double', label: '↔', title: 'Reversible / binding' },
]

const SHAPE_OPTIONS: { value: ShapeKind; label: string }[] = [
  { value: 'roundrect', label: 'Rounded' },
  { value: 'rect', label: 'Box' },
  { value: 'ellipse', label: 'Ellipse' },
]

/** Update every selected node of one type. */
function patch<T extends FigNode>(type: T['type'], change: Partial<T>, merge?: string): void {
  patchSelection((n) => (n.type === type ? ({ ...n, ...change } as FigNode) : n), merge)
}

// ---------- per-type sections ----------

function IconProps({ node }: { node: IconNode }) {
  const doc = useEditor((s) => s.doc)
  const def = getIcon(doc, node.iconId)
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
    </Section>
  )
}

function ShapeProps({ node }: { node: ShapeNode }) {
  const noFill = node.fill === 'none'
  return (
    <Section title="Shape">
      <Segmented label="Shape type" value={node.shape} options={SHAPE_OPTIONS} onChange={(shape) => patch<ShapeNode>('shape', { shape })} />
      <div className="row">
        <Field label="Fill">
          <ColorInput label="Fill colour" value={noFill ? '#ffffff' : node.fill} onChange={(fill) => patch<ShapeNode>('shape', { fill }, 'shape-fill')} />
        </Field>
        <Field label="Outline">
          <ColorInput label="Outline colour" value={node.stroke} onChange={(stroke) => patch<ShapeNode>('shape', { stroke }, 'shape-stroke')} />
        </Field>
        <Field label="Width">
          <NumberInput label="Outline width" value={node.strokeWidth} min={0} max={30} step={0.5} onChange={(strokeWidth) => patch<ShapeNode>('shape', { strokeWidth }, 'shape-sw')} />
        </Field>
      </div>
      <Check checked={noFill} onChange={(v) => patch<ShapeNode>('shape', { fill: v ? 'none' : '#eaf2fb' })}>
        No fill
      </Check>
      <Check checked={!!node.dashed} onChange={(v) => patch<ShapeNode>('shape', { dashed: v || undefined })}>
        Dashed outline
      </Check>
    </Section>
  )
}

function TextProps({ node }: { node: TextNode }) {
  const aligns: { value: TextAlign; label: string }[] = [
    { value: 'left', label: 'Left' },
    { value: 'center', label: 'Centre' },
    { value: 'right', label: 'Right' },
  ]
  return (
    <Section title="Text">
      <textarea
        className="text-input"
        aria-label="Text"
        rows={Math.min(6, node.text.split('\n').length + 1)}
        value={node.text}
        onChange={(e) => patch<TextNode>('text', { text: e.target.value }, 'text-edit')}
      />
      <div className="row">
        <Field label="Size">
          <NumberInput label="Font size" value={node.fontSize} min={4} max={400} onChange={(fontSize) => patch<TextNode>('text', { fontSize }, 'text-size')} />
        </Field>
        <Field label="Colour">
          <ColorInput label="Text colour" value={node.fill} onChange={(fill) => patch<TextNode>('text', { fill }, 'text-fill')} />
        </Field>
        <div className="segmented" role="group" aria-label="Text style">
          <button className={node.bold ? 'active' : ''} aria-pressed={!!node.bold} title="Bold" onClick={() => patch<TextNode>('text', { bold: !node.bold || undefined })}>
            <b>B</b>
          </button>
          <button className={node.italic ? 'active' : ''} aria-pressed={!!node.italic} title="Italic" onClick={() => patch<TextNode>('text', { italic: !node.italic || undefined })}>
            <i>I</i>
          </button>
        </div>
      </div>
      <Segmented label="Text alignment" value={node.align} options={aligns} onChange={(align) => patch<TextNode>('text', { align })} />
    </Section>
  )
}

function ConnectorProps({ node }: { node: ConnectorNode }) {
  return (
    <Section title="Arrow">
      <Segmented label="Arrow type" value={node.kind} options={KIND_OPTIONS} onChange={(kind) => patch<ConnectorNode>('connector', { kind })} />
      <div className="row">
        <Field label="Colour">
          <ColorInput label="Arrow colour" value={node.stroke} onChange={(stroke) => patch<ConnectorNode>('connector', { stroke }, 'conn-stroke')} />
        </Field>
        <Field label="Width">
          <NumberInput label="Line width" value={node.strokeWidth} min={0.5} max={20} step={0.5} onChange={(strokeWidth) => patch<ConnectorNode>('connector', { strokeWidth }, 'conn-sw')} />
        </Field>
      </div>
      <Check checked={!!node.dashed} onChange={(v) => patch<ConnectorNode>('connector', { dashed: v || undefined })}>
        Dashed (indirect / transport)
      </Check>
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
      <p className="hint">Drag an end onto an icon to attach it. Drag the diamond to curve the arrow.</p>
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
  const opacity = first.opacity ?? 1
  const rotatable = nodes.length === 1 && (first.type === 'icon' || first.type === 'shape' || first.type === 'text')
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
      <Field label={`Opacity ${Math.round(opacity * 100)}%`}>
        <Range
          label="Opacity"
          value={opacity}
          min={0.1}
          max={1}
          step={0.05}
          onChange={(v) => patchSelection((n) => ({ ...n, opacity: v >= 1 ? undefined : v }), 'opacity')}
        />
      </Field>
    </Section>
  )
}

// ---------- nothing selected ----------

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
    </Section>
  )
}

function ToolOptions() {
  // Each value is selected separately so panning and zooming (which change the store on every
  // frame) do not re-render this panel.
  const tool = useEditor((st) => st.tool)
  const shapeKind = useEditor((st) => st.shapeKind)
  const connectorKind = useEditor((st) => st.connectorKind)
  const connectorDashed = useEditor((st) => st.connectorDashed)
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
          <Segmented label="Shape type" value={shapeKind} options={SHAPE_OPTIONS} onChange={(shapeKind) => set({ shapeKind })} />
          <p className="hint">Drag on the page to draw. Hold Shift for a square or circle.</p>
        </Section>
      )
    case 'connector':
      return (
        <Section title="Arrow tool">
          <Segmented label="Arrow type" value={connectorKind} options={KIND_OPTIONS} onChange={(connectorKind) => set({ connectorKind })} />
          <Check checked={connectorDashed} onChange={(connectorDashed) => set({ connectorDashed })}>
            Dashed (indirect / transport)
          </Check>
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
          <PageProps />
          <p className="hint pad">Select something on the page to change its colours, size and order.</p>
        </>
      )}
      {first && (
        <>
          {nodes.length > 1 && <p className="selection-count">{nodes.length} objects selected</p>}
          {sameType && first.type === 'icon' && <IconProps node={first} />}
          {sameType && first.type === 'shape' && <ShapeProps node={first} />}
          {sameType && first.type === 'text' && <TextProps node={first} />}
          {sameType && first.type === 'connector' && <ConnectorProps node={first} />}
          {sameType && first.type === 'membrane' && <MembraneProps node={first} />}
          {sameType && first.type === 'stroke' && <StrokeProps node={first} />}
          <Arrange nodes={nodes} />
        </>
      )}
    </aside>
  )
}
