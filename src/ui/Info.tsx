// An "i" in a circle beside a setting. Pointing at it with a mouse shows a note that explains the
// setting; pressing it (mouse, finger, pen or keyboard) keeps the note open until it is pressed
// again, Escape is pressed, or something else is pressed. Nothing depends on hovering.

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { placeInfo, type InfoPlace } from './infoPlace'

/** How long the note stays after the mouse has left, so that it can be reached to select its text or press a button in it. */
const LINGER_MS = 350

export function Info({ about, children }: { about: string; children: ReactNode }) {
  // 'hover' = shown while the mouse is on the button or the note; 'pinned' = shown until closed.
  const [open, setOpen] = useState<false | 'hover' | 'pinned'>(false)
  const [place, setPlace] = useState<InfoPlace | null>(null)
  const button = useRef<HTMLButtonElement>(null)
  const note = useRef<HTMLDivElement>(null)
  const leaving = useRef<number | undefined>(undefined)
  const byKeyboard = useRef(false)
  const id = useId()

  const stay = () => {
    window.clearTimeout(leaving.current)
    leaving.current = undefined
  }
  const leaveSoon = () => {
    stay()
    leaving.current = window.setTimeout(() => setOpen((o) => (o === 'hover' ? false : o)), LINGER_MS)
  }
  useEffect(() => stay, [])

  // The note is placed once its size is known, before it is seen.
  useLayoutEffect(() => {
    if (!open) {
      setPlace(null)
      return
    }
    const put = () => {
      if (!button.current || !note.current) return
      const a = button.current.getBoundingClientRect()
      // Beside the panel the button sits in, so that the note covers none of its settings.
      const panel = button.current.closest('.properties')?.getBoundingClientRect()
      setPlace(placeInfo(a, note.current.offsetWidth, note.current.scrollHeight, window.innerWidth, window.innerHeight, panel))
    }
    put()
    window.addEventListener('resize', put)
    return () => window.removeEventListener('resize', put)
  }, [open])

  // Opened from the keyboard, the note takes the focus, so that it is read out and its buttons can be reached.
  useEffect(() => {
    if (open === 'pinned' && place && byKeyboard.current) {
      byKeyboard.current = false
      note.current?.focus()
    }
  }, [open, place])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // Escape closes the note and nothing else.
      e.stopPropagation()
      if (note.current?.contains(document.activeElement)) button.current?.focus()
      setOpen(false)
    }
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node | null
      if (target && (button.current?.contains(target) || note.current?.contains(target))) return
      setOpen(false)
    }
    // The button scrolls away with its panel; the note would be left behind.
    const onScroll = (e: Event) => {
      if (!(e.target instanceof Node) || !note.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('pointerdown', onDown, true)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  return (
    <>
      <button
        ref={button}
        type="button"
        className={`info-btn${open === 'pinned' ? ' active' : ''}`}
        aria-label={`About: ${about}`}
        aria-expanded={!!open}
        aria-controls={open ? id : undefined}
        onPointerEnter={(e) => {
          if (e.pointerType !== 'mouse') return
          stay()
          setOpen((o) => o || 'hover')
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse') leaveSoon()
        }}
        onClick={(e) => {
          // Inside a label a press would also reach the label's own control.
          e.preventDefault()
          e.stopPropagation()
          stay()
          byKeyboard.current = e.detail === 0
          setOpen((o) => (o === 'pinned' ? false : 'pinned'))
        }}
      >
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="8" cy="4.7" r="1" fill="currentColor" />
          <path d="M8 7.2v4.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      {open &&
        createPortal(
          <div
            ref={note}
            id={id}
            className="info-note"
            role="note"
            aria-label={about}
            tabIndex={-1}
            style={place ? { left: place.left, top: place.top, maxHeight: place.maxHeight } : { left: 0, top: 0, visibility: 'hidden' }}
            onPointerEnter={stay}
            onPointerLeave={(e) => {
              if (e.pointerType === 'mouse') leaveSoon()
            }}
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  )
}
