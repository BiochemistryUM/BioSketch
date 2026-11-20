// The light and the dark theme of the interface. The figure itself is not touched: a page is the
// colour the scientist gave it in both themes, and exports are the same. The choice is kept in the
// browser; until one is made, BioSketch follows the setting of the computer.

export type Theme = 'light' | 'dark'

const KEY = 'biosketch.theme'
/** The colour browsers give their own bars around the app, per theme. */
const BAR: Record<Theme, string> = { light: '#4a4fb5', dark: '#1d2127' }

/** The theme to show: the one chosen before, otherwise the one the computer is set to. */
export const pickTheme = (stored: string | null, systemDark: boolean): Theme => (stored === 'dark' || stored === 'light' ? stored : systemDark ? 'dark' : 'light')

export function startTheme(): Theme {
  let stored: string | null = null
  try {
    stored = localStorage.getItem(KEY)
  } catch {
    /* nothing is kept in this window */
  }
  const systemDark = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
  return pickTheme(stored, systemDark)
}

/** Show a theme, and with `keep` remember it as the scientist's choice. */
export function applyTheme(theme: Theme, keep = false): void {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BAR[theme])
  if (!keep) return
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    /* the theme lasts for this visit */
  }
}
