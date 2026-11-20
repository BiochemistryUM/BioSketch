// Keyboard shortcuts.

import {
  copySelection,
  deleteSelection,
  duplicateSelection,
  editSelectedText,
  fitView,
  groupSelection,
  nudge,
  orderSelection,
  pasteClipboard,
  selectAll,
  selectStep,
  setTool,
  stepSlide,
  ungroupSelection,
  zoomBy,
} from './actions'
import { input } from './canvas/input'
import { finishReshape } from './icons/reshape'
import { placeImageFile } from './io/images'
import { isTableText } from './model/tableRoles'
import { slideCount } from './model/slides'
import { useEditor, type Tool } from './store'
import { saveFile } from './ui/TopBar'

/**
 * What BioSketch puts on the computer's clipboard when objects are copied, so that a table copied
 * from a spreadsheet earlier is not taken for what is to be pasted. Where the browser does not let
 * the page write it, objects copied in BioSketch are pasted before any table.
 */
const COPIED = 'BioSketch objects'
let markerUnwritten = false

function copyObjects(): void {
  copySelection()
  if (!useEditor.getState().selection.length) return
  markerUnwritten = true
  navigator.clipboard
    ?.writeText(COPIED)
    .then(() => {
      markerUnwritten = false
    })
    .catch(() => undefined)
}

const TOOL_KEYS: Record<string, Tool> = { v: 'select', h: 'pan', t: 'text', r: 'shape', a: 'connector', m: 'membrane', p: 'pen', e: 'eraser' }

/** Buttons, links and similar controls that Space or Enter should activate. */
function isControl(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return !!el?.closest?.('button, a[href], summary, [role="button"], [role="tab"], [role="menuitem"]')
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
}

export function installKeyboard(): () => void {
  const onKeyDown = (e: KeyboardEvent) => {
    // ⌘K / Ctrl K opens Search from anywhere, also while typing in a box, but not over another dialog.
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k' && !useEditor.getState().presenting) {
      const d = useEditor.getState().dialog
      if (!d || d === 'search') {
        e.preventDefault()
        useEditor.setState({ dialog: 'search' })
        return
      }
    }
    if (isTyping(e.target)) return
    const s = useEditor.getState()
    // While the slides are shown full screen the keys belong to the presentation (see Presenter).
    if (s.dialog || s.presenting) return
    const mod = e.metaKey || e.ctrlKey
    const key = e.key.toLowerCase()

    if (e.code === 'Space') {
      // On a focused button, Space must press the button (keyboard users); elsewhere it pans.
      if (isControl(e.target)) return
      input.space = true
      e.preventDefault()
      return
    }

    // With the page itself focused, Tab walks through the objects. Past the last one (or before the
    // first, with Shift) it moves on to the panels, so the keyboard is never trapped on the page.
    if (e.key === 'Tab' && !mod && !e.altKey) {
      const onPage = !!(e.target as Element | null)?.closest?.('.canvas')
      if (onPage && selectStep(e.shiftKey ? -1 : 1)) e.preventDefault()
      return
    }

    if (mod) {
      const handled = (() => {
        switch (key) {
          case 'z':
            if (e.shiftKey) s.redo()
            else s.undo()
            return true
          case 'y':
            s.redo()
            return true
          case 'c':
            copyObjects()
            return true
          case 'x':
            copyObjects()
            deleteSelection()
            return true
          case 'v':
            // Handled by the paste event below, which can also see pictures on the clipboard.
            return false
          case 'd':
            duplicateSelection()
            return true
          case 'a':
            selectAll()
            return true
          case 'g':
            if (e.shiftKey) ungroupSelection()
            else groupSelection()
            return true
          case 's':
            saveFile()
            return true
          case '0':
            fitView()
            return true
          case '=':
          case '+':
            zoomBy(1.25)
            return true
          case '-':
            zoomBy(1 / 1.25)
            return true
          default:
            return false
        }
      })()
      if (handled) e.preventDefault()
      return
    }

    if (e.altKey) return
    const step = e.shiftKey ? 10 : 1
    // The arrow keys move what is selected. With nothing selected they have nothing to move, and in
    // a figure of several slides they open the next and the previous slide instead, as in every
    // presentation program (a laptop has no Page Down key).
    const arrow = (dir: 1 | -1, dx: number, dy: number): void => {
      if (!s.selection.length && slideCount(s.doc) > 1) stepSlide(dir)
      else nudge(dx, dy)
    }
    switch (e.key) {
      case 'Delete':
      case 'Backspace':
        deleteSelection()
        e.preventDefault()
        return
      case 'Enter':
        // On a focused button Enter presses the button; otherwise it opens the selected text for typing.
        if (isControl(e.target) || !editSelectedText()) return
        break
      case 'Escape':
        if (s.reshape) finishReshape()
        else if (s.selection.length) s.set({ selection: [] })
        else setTool('select')
        return
      case 'ArrowLeft':
        arrow(-1, -step, 0)
        break
      case 'ArrowRight':
        arrow(1, step, 0)
        break
      case 'ArrowUp':
        arrow(-1, 0, -step)
        break
      case 'ArrowDown':
        arrow(1, 0, step)
        break
      case 'PageDown':
        // The next and the previous slide, as in every presentation program.
        if (!stepSlide(1)) return
        break
      case 'PageUp':
        if (!stepSlide(-1)) return
        break
      case ']':
        orderSelection('front')
        return
      case '[':
        orderSelection('back')
        return
      default:
        if (TOOL_KEYS[key]) setTool(TOOL_KEYS[key])
        return
    }
    e.preventDefault()
  }
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space') input.space = false
  }
  const onBlur = () => {
    input.space = false
  }
  // Paste: a picture copied from elsewhere is placed on the page; a table copied from a spreadsheet
  // opens "Chart from a table"; otherwise objects copied in BioSketch.
  const onPaste = (e: ClipboardEvent) => {
    if (isTyping(e.target) || useEditor.getState().dialog || useEditor.getState().presenting) return
    const picture = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith('image/'))
    const text = e.clipboardData?.getData('text/plain') ?? ''
    e.preventDefault()
    if (picture) void placeImageFile(picture)
    else if (text !== COPIED && !(markerUnwritten && useEditor.getState().clipboard.length) && isTableText(text)) useEditor.setState({ dialog: 'suggest', dialogQuery: text })
    else pasteClipboard()
  }
  window.addEventListener('paste', onPaste)
  // After a mouse or touch click, a toolbar button would keep keyboard focus and swallow the next
  // Space (pan) or shortcut. Release it. Clicks made from the keyboard (detail 0) keep their focus.
  const onClick = (e: MouseEvent) => {
    const el = document.activeElement
    if (e.detail > 0 && el instanceof HTMLButtonElement && !el.closest('.modal')) el.blur()
  }
  window.addEventListener('click', onClick)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onBlur)
  return () => {
    window.removeEventListener('paste', onPaste)
    window.removeEventListener('click', onClick)
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('blur', onBlur)
  }
}
