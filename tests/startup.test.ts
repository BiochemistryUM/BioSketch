// The editor is drawn first and then opens the last figure, with a time limit: slow or broken
// storage must leave a working editor, never a white page.

import { beforeEach, describe, expect, it } from 'vitest'
import { emptyDoc } from '../src/model/doc'
import { openLastFigure } from '../src/startup'
import { useEditor } from '../src/store'
import { TEMPLATES } from '../src/templates'
import { example } from './helpers'

const blank = emptyDoc()

beforeEach(() => {
  localStorage.clear()
  useEditor.setState({ figureId: 'unsaved', toast: null, dialog: null })
  useEditor.getState().loadDoc(blank)
})

describe('opening the last figure at start', () => {
  it('opens it when storage answers', async () => {
    const doc = example(TEMPLATES[0])
    await openLastFigure(async () => ({ id: 'last', doc }), 1000)
    expect(useEditor.getState().figureId).toBe('last')
    expect(useEditor.getState().doc).toEqual(doc)
  })

  it('goes on with a new figure, and says so, when storage does not answer in time', async () => {
    await openLastFigure(() => new Promise(() => undefined), 20)
    const s = useEditor.getState()
    expect(s.figureId).not.toBe('unsaved')
    expect(s.doc).toBe(blank)
    expect(s.toast).toMatch(/taking long to open/)
  })

  it('goes on with a new figure when storage fails', async () => {
    await openLastFigure(() => Promise.reject(new Error('broken')), 1000)
    expect(useEditor.getState().figureId).not.toBe('unsaved')
    expect(useEditor.getState().toast).toMatch(/could not be opened/)
  })

  it('keeps what was drawn while the figures were opening', async () => {
    const drawn = { ...blank, name: 'Drawn already' }
    const later = openLastFigure(() => new Promise((resolve) => setTimeout(() => resolve({ id: 'last', doc: example(TEMPLATES[0]) }), 10)), 1000)
    useEditor.getState().loadDoc(drawn)
    await later
    expect(useEditor.getState().doc).toBe(drawn)
    expect(useEditor.getState().figureId).not.toBe('last')
  })

  it('shows what is new after an update, not on a first visit', async () => {
    await openLastFigure(async () => ({ id: 'new', doc: null }), 1000)
    expect(useEditor.getState().dialog).toBeNull()
    useEditor.getState().loadDoc(blank)
    localStorage.removeItem('biosketch.seenVersion')
    await openLastFigure(async () => ({ id: 'last', doc: example(TEMPLATES[0]) }), 1000)
    expect(useEditor.getState().dialog).toBe('whats-new')
  })
})
