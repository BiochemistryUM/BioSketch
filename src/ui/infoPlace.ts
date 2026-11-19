// Where the note of an info button opens. The button sits in a side panel, so the note opens
// beside that panel, over the page, where it covers none of the settings it explains. In a window
// too narrow for that it opens below the button, or above it when there is more room there.

export interface Box {
  left: number
  top: number
  right: number
  bottom: number
}

export interface InfoPlace {
  left: number
  top: number
  /** The tallest the note may be here; a longer one scrolls. */
  maxHeight: number
}

/** Room kept between the note and the button, and between the note and the edge of the window. */
export const INFO_GAP = 8
export const INFO_MARGIN = 8

/**
 * The place of a note of size `w` × `h` for a button at `anchor`, in a window of `viewW` × `viewH`.
 * `beside` is the panel the button sits in; without one the note opens beside the button itself.
 */
export function placeInfo(anchor: Box, w: number, h: number, viewW: number, viewH: number, beside: Box = anchor): InfoPlace {
  const within = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))
  const room = Math.max(40, viewH - 2 * INFO_MARGIN)
  // Beside the panel, level with the button: at the left where the note fits, otherwise at the right.
  const leftSide = beside.left - INFO_GAP - w
  const rightSide = beside.right + INFO_GAP
  const side = leftSide >= INFO_MARGIN ? leftSide : rightSide + w <= viewW - INFO_MARGIN ? rightSide : null
  if (side !== null) {
    const height = Math.min(h, room)
    return { left: Math.round(side), top: Math.round(within(anchor.top - 6, INFO_MARGIN, Math.max(INFO_MARGIN, viewH - INFO_MARGIN - height))), maxHeight: Math.round(room) }
  }
  // Below or above it, as wide as the window allows.
  const left = within((anchor.left + anchor.right) / 2 - w / 2, INFO_MARGIN, Math.max(INFO_MARGIN, viewW - INFO_MARGIN - w))
  const below = viewH - INFO_MARGIN - (anchor.bottom + INFO_GAP)
  const above = anchor.top - INFO_GAP - INFO_MARGIN
  if (h <= below || below >= above) return { left: Math.round(left), top: Math.round(anchor.bottom + INFO_GAP), maxHeight: Math.round(Math.max(40, below)) }
  const height = Math.min(h, Math.max(40, above))
  return { left: Math.round(left), top: Math.round(Math.max(INFO_MARGIN, anchor.top - INFO_GAP - height)), maxHeight: Math.round(Math.max(40, above)) }
}
