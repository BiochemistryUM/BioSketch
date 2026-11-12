// Keyboard shortcuts.

import {
  copySelection,
  deleteSelection,
  duplicateSelection,
  fitView,
  groupSelection,
  nudge,
  orderSelection,
  pasteClipboard,
  selectAll,
  setTool,
  ungroupSelection,
  zoomBy,
} from './actions'
import { input } from './canvas/input'
import { useEditor, type Tool } from './store'
import { saveFile } from './ui/TopBar'

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
    if (isTyping(e.target)) return
    const s = useEditor.getState()
    if (s.dialog) return
    const mod = e.metaKey || e.ctrlKey
    const key = e.key.toLowerCase()

    if (e.code === 'Space') {
      // On a focused button, Space must press the button (keyboard users); elsewhere it pans.
      if (isControl(e.target)) return
      input.space = true
      e.preventDefault()
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
            copySelection()
            return true
          case 'x':
            copySelection()
            deleteSelection()
            return true
          case 'v':
            pasteClipboard()
            return true
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
    switch (e.key) {
      case 'Delete':
      case 'Backspace':
        deleteSelection()
        e.preventDefault()
        return
      case 'Escape':
        if (s.selection.length) s.set({ selection: [] })
        else setTool('select')
        return
      case 'ArrowLeft':
        nudge(-step, 0)
        break
      case 'ArrowRight':
        nudge(step, 0)
        break
      case 'ArrowUp':
        nudge(0, -step)
        break
      case 'ArrowDown':
        nudge(0, step)
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
    window.removeEventListener('click', onClick)
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('blur', onBlur)
  }
}
