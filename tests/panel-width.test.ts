// The width of the properties panel: what can be chosen in a window, and what is remembered.

import { beforeEach, describe, expect, it } from 'vitest'
import { PANEL_DEFAULT, PANEL_MAX, PANEL_MIN, clampPanelWidth, loadPanelWidth, panelLimits, savePanelWidth } from '../src/ui/panelWidth'

describe('the width of the properties panel', () => {
  beforeEach(() => localStorage.clear())

  it('stays between its limits on a wide screen', () => {
    expect(clampPanelWidth(400, 1400)).toBe(400)
    expect(clampPanelWidth(100, 1400)).toBe(PANEL_MIN)
    expect(clampPanelWidth(5000, 1400)).toBe(PANEL_MAX)
    expect(clampPanelWidth(333.6, 1400)).toBe(334)
    expect(panelLimits(1400)).toEqual({ min: PANEL_MIN, max: PANEL_MAX })
  })

  it('always leaves some of the page to be seen, also in a narrow window', () => {
    expect(clampPanelWidth(640, 700)).toBe(580)
    // On a phone the panel lies over the page and takes about what it always did.
    expect(clampPanelWidth(PANEL_DEFAULT, 375)).toBe(255)
    expect(panelLimits(375)).toEqual({ min: 240, max: 255 })
    expect(panelLimits(300)).toEqual({ min: 200, max: 200 })
    expect(clampPanelWidth(PANEL_DEFAULT, 0)).toBe(200)
  })

  it('is the usual width when nothing sensible was asked for', () => {
    for (const odd of [undefined, null, 'wide', NaN, Infinity, {}]) expect(clampPanelWidth(odd, 1400)).toBe(PANEL_DEFAULT)
  })

  it('is remembered in this browser, and the usual width is not stored', () => {
    expect(loadPanelWidth()).toBe(PANEL_DEFAULT)
    savePanelWidth(480)
    expect(loadPanelWidth()).toBe(480)
    savePanelWidth(PANEL_DEFAULT)
    expect(localStorage.length).toBe(0)
    expect(loadPanelWidth()).toBe(PANEL_DEFAULT)
  })

  it('reads whatever the browser kept without trusting it', () => {
    localStorage.setItem('biosketch.propsWidth', 'very wide')
    expect(loadPanelWidth()).toBe(PANEL_DEFAULT)
    localStorage.setItem('biosketch.propsWidth', '99999')
    expect(loadPanelWidth()).toBe(PANEL_MAX)
    localStorage.setItem('biosketch.propsWidth', '-5')
    expect(loadPanelWidth()).toBe(PANEL_MIN)
  })
})
