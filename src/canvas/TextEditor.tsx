// In-place text editing: a real text box laid over the label, so the on-screen keyboard,
// Apple Pencil handwriting (Scribble) and IME input all work. It edits a text label, or the words
// inside a shape (which are created when the first ones are typed, and removed when all are deleted).

import { useEffect, useRef, useState } from 'react'
import { removeNodes, updateNodes } from '../model/doc'
import { growToFitLabel, SHAPE_LABEL_DEFAULT, fontStack, measureText, shapeLabelNode, shapeTextWidth } from '../model/nodes'
import { LINE_HEIGHT, type FigNode } from '../model/types'
import { useEditor } from '../store'

/** The words a node holds: a label's text, or the text inside a shape. */
const textOf = (n: FigNode | undefined): string => (n?.type === 'text' ? n.text : n?.type === 'shape' ? (n.label?.text ?? '') : '')

export function TextEditor({ id }: { id: string }) {
  const node = useEditor((s) => s.doc.nodes.find((n) => n.id === id))
  const view = useEditor((s) => s.view)
  const ref = useRef<HTMLTextAreaElement>(null)
  const [value, setValue] = useState(textOf(node))
  const latest = useRef(value)
  latest.current = value

  // Safe to call any number of times: it only writes when the text really differs from the figure.
  const save = () => {
    const s = useEditor.getState()
    const current = s.doc.nodes.find((n) => n.id === id)
    if (!current || (current.type !== 'text' && current.type !== 'shape')) return
    const text = latest.current.replace(/\s+$/, '')
    if (text === textOf(current)) return
    if (current.type === 'shape') {
      // Deleting every word leaves a plain shape again.
      s.commit((d) =>
        updateNodes(d, [id], (n) => {
          if (n.type !== 'shape') return n
          const { label, ...rest } = n
          // A shape grows downwards when the words need more lines than fit.
          return text.trim() ? growToFitLabel({ ...rest, label: { ...(label ?? SHAPE_LABEL_DEFAULT), text } }) : rest
        }),
      )
    } else if (!text.trim()) s.commit((d) => removeNodes(d, [id]), { select: s.selection.filter((x) => x !== id) })
    else s.commit((d) => updateNodes(d, [id], (n) => (n.type === 'text' ? { ...n, text } : n)))
  }

  useEffect(() => {
    const el = ref.current
    if (el) {
      el.focus()
      el.select()
    }
    // Save when the editor closes for any reason (tool change, undo, another label opened).
    return save
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The label as it would be drawn with what has been typed so far (marks counted as characters).
  const typed = (value || ' ').replace(/[\\^_{}*]/g, 'x')
  const shown =
    node?.type === 'text' ? { ...node, text: typed } : node?.type === 'shape' ? shapeLabelNode(node, { ...(node.label ?? SHAPE_LABEL_DEFAULT), text: typed }) : null
  if (!node || !shown) return null

  const close = () => {
    save()
    if (useEditor.getState().editingTextId === id) useEditor.setState({ editingTextId: null })
  }

  const m = measureText(shown)
  // Inside a shape the box is as wide as the room for the words, and breaks lines the same way
  // the shape will; a free label grows with what is typed.
  const inShape = node.type === 'shape'
  // A text box breaks its lines at its width, as a shape does at the room it has.
  const boxed = node.type === 'text' && !!node.width
  const wraps = inShape || boxed
  const width = (inShape ? shapeTextWidth(node, shown.fontSize) : boxed ? m.w : m.w + shown.fontSize * 0.7) * view.zoom
  const sx = (inShape ? node.x + node.w / 2 : shown.x) * view.zoom + view.x
  const left = inShape || shown.align === 'center' ? sx - width / 2 : shown.align === 'right' ? sx - width : sx
  return (
    <textarea
      ref={ref}
      className="text-editor"
      value={value}
      wrap={wraps ? 'soft' : 'off'}
      spellCheck={false}
      onChange={(e) => setValue(e.target.value)}
      onBlur={close}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Escape' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) {
          e.preventDefault()
          close()
        }
      }}
      style={{
        left,
        top: shown.y * view.zoom + view.y,
        width,
        height: m.h * view.zoom,
        fontFamily: fontStack(shown),
        fontSize: shown.fontSize * view.zoom,
        lineHeight: LINE_HEIGHT,
        fontWeight: shown.bold ? 'bold' : 'normal',
        fontStyle: shown.italic ? 'italic' : 'normal',
        textAlign: shown.align,
        color: shown.fill,
        ...(wraps ? { whiteSpace: 'pre-wrap' as const } : {}),
      }}
    />
  )
}
