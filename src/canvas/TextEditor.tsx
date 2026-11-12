// In-place text editing: a real text box laid over the label, so the on-screen keyboard,
// Apple Pencil handwriting (Scribble) and IME input all work.

import { useEffect, useRef, useState } from 'react'
import { removeNodes, updateNodes } from '../model/doc'
import { measureText } from '../model/nodes'
import { FONT_FAMILY, LINE_HEIGHT } from '../model/types'
import { useEditor } from '../store'

export function TextEditor({ id }: { id: string }) {
  const node = useEditor((s) => s.doc.nodes.find((n) => n.id === id))
  const view = useEditor((s) => s.view)
  const ref = useRef<HTMLTextAreaElement>(null)
  const [value, setValue] = useState(node?.type === 'text' ? node.text : '')
  const latest = useRef(value)
  latest.current = value

  // Safe to call any number of times: it only writes when the text really differs from the figure.
  const save = () => {
    const s = useEditor.getState()
    const current = s.doc.nodes.find((n) => n.id === id)
    if (!current || current.type !== 'text') return
    const text = latest.current.replace(/\s+$/, '')
    if (text === current.text) return
    if (!text.trim()) s.commit((d) => removeNodes(d, [id]), { select: s.selection.filter((x) => x !== id) })
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

  if (!node || node.type !== 'text') return null

  const close = () => {
    save()
    if (useEditor.getState().editingTextId === id) useEditor.setState({ editingTextId: null })
  }

  const m = measureText({ ...node, text: value || ' ' })
  const width = (m.w + node.fontSize * 0.7) * view.zoom
  const sx = node.x * view.zoom + view.x
  const left = node.align === 'center' ? sx - width / 2 : node.align === 'right' ? sx - width : sx
  return (
    <textarea
      ref={ref}
      className="text-editor"
      value={value}
      wrap="off"
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
        top: node.y * view.zoom + view.y,
        width,
        height: m.h * view.zoom,
        fontFamily: FONT_FAMILY,
        fontSize: node.fontSize * view.zoom,
        lineHeight: LINE_HEIGHT,
        fontWeight: node.bold ? 'bold' : 'normal',
        fontStyle: node.italic ? 'italic' : 'normal',
        textAlign: node.align,
        color: node.fill,
      }}
    />
  )
}
