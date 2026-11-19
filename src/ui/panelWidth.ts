// The width of the properties panel, which the scientist can change by dragging its edge.
// The choice is kept in the browser, like the other preferences, and never in a figure.

/** The usual width, and the limits of what can be chosen. */
export const PANEL_DEFAULT = 340
export const PANEL_MIN = 240
export const PANEL_MAX = 640
/** What a press of an arrow key changes the width by. */
export const PANEL_STEP = 16
/** Room that always stays for the page beside the panel (on a phone the panel lies over the page). */
const PAGE_ROOM = 120
const KEY = 'biosketch.propsWidth'

/** The narrowest and widest the panel can be in a window of this width. */
export function panelLimits(windowWidth: number): { min: number; max: number } {
  const max = Math.max(200, Math.min(PANEL_MAX, Math.round(windowWidth) - PAGE_ROOM))
  return { min: Math.min(PANEL_MIN, max), max }
}

/** The width the panel takes when `wanted` was asked for in a window of this width; anything that is not a number gives the usual width. */
export function clampPanelWidth(wanted: unknown, windowWidth: number): number {
  const { min, max } = panelLimits(windowWidth)
  const width = typeof wanted === 'number' && Number.isFinite(wanted) ? wanted : PANEL_DEFAULT
  return Math.round(Math.min(max, Math.max(min, width)))
}

/** The width chosen earlier in this browser, or the usual one. */
export function loadPanelWidth(): number {
  try {
    const stored = localStorage.getItem(KEY)
    const width = stored === null ? NaN : Number(stored)
    return Number.isFinite(width) ? Math.min(PANEL_MAX, Math.max(PANEL_MIN, Math.round(width))) : PANEL_DEFAULT
  } catch {
    return PANEL_DEFAULT
  }
}

/** Remember the width for next time; the usual width is not stored. */
export function savePanelWidth(width: number): void {
  try {
    if (Math.round(width) === PANEL_DEFAULT) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, String(Math.round(width)))
  } catch {
    // Storage can be switched off; the panel then starts at its usual width.
  }
}
