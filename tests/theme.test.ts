import { afterEach, describe, expect, it } from 'vitest'
import { applyTheme, pickTheme, startTheme } from '../src/ui/theme'

afterEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
})

describe('the light and the dark theme', () => {
  it('is the one chosen before, otherwise the one the computer is set to', () => {
    expect(pickTheme('dark', false)).toBe('dark')
    expect(pickTheme('light', true)).toBe('light')
    expect(pickTheme(null, true)).toBe('dark')
    expect(pickTheme(null, false)).toBe('light')
    expect(pickTheme('purple', false)).toBe('light')
  })

  it('is remembered only when the scientist chose it', () => {
    applyTheme('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('biosketch.theme')).toBeNull()
    applyTheme('dark', true)
    expect(startTheme()).toBe('dark')
    applyTheme('light', true)
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(startTheme()).toBe('light')
  })
})
