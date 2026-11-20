// Projects: headings in the list of saved figures that keep the figures of one piece of work together.

import { beforeEach, describe, expect, it } from 'vitest'
import { PROJECT_NAME_MAX, byProject, listFigures, loadFigure, renameProject, saveFigure, setFigureProject, tidyProject, type FigureMeta } from '../src/io/storage'
import { emptyDoc } from '../src/model/doc'

beforeEach(() => localStorage.clear())

describe('projects in the list of figures', () => {
  it('file a figure under a name, and keep it there when the figure is saved again', async () => {
    await saveFigure('a', emptyDoc('Signalling'))
    await saveFigure('b', emptyDoc('Timeline'))
    expect((await listFigures()).every((m) => m.project === undefined)).toBe(true)
    expect(await setFigureProject('a', '  Grant   2027 ')).toBe(true)
    expect((await listFigures()).find((m) => m.id === 'a')!.project).toBe('Grant 2027')
    // Saving the figure again (every change does) leaves it where it is filed.
    await saveFigure('a', { ...emptyDoc('Signalling, new'), width: 900 })
    const meta = (await listFigures()).find((m) => m.id === 'a')!
    expect(meta).toMatchObject({ name: 'Signalling, new', project: 'Grant 2027' })
    // The project is a heading in the list, not part of the figure.
    expect(JSON.stringify(await loadFigure('a'))).not.toContain('Grant')
    // Taken out of its project again.
    await setFigureProject('a', '')
    expect('project' in (await listFigures()).find((m) => m.id === 'a')!).toBe(false)
  })

  it('take another name, for every figure filed under them', async () => {
    for (const id of ['a', 'b', 'c']) await saveFigure(id, emptyDoc(id))
    await setFigureProject('a', 'Thesis')
    await setFigureProject('b', 'Thesis')
    expect(await renameProject('Thesis', 'PhD thesis')).toBe(true)
    expect((await listFigures()).map((m) => [m.id, m.project]).sort()).toEqual([['a', 'PhD thesis'], ['b', 'PhD thesis'], ['c', undefined]])
    expect(await renameProject('PhD thesis', '   ')).toBe(false)
  })

  it('lay the list out under their names, in the order of the alphabet, with loose figures last', () => {
    const meta = (id: string, project?: string): FigureMeta => ({ id, name: id, updated: 1, objects: 0, ...(project ? { project } : {}) })
    const groups = byProject([meta('a', 'thesis'), meta('b'), meta('c', 'Grant'), meta('d', 'thesis')])
    expect(groups.map((g) => [g.project, g.figures.map((f) => f.id)])).toEqual([['Grant', ['c']], ['thesis', ['a', 'd']], ['', ['b']]])
    // Without any project the list is one plain list; with every figure in one there is no empty heading.
    expect(byProject([meta('a'), meta('b')])).toEqual([{ project: '', figures: [meta('a'), meta('b')] }])
    expect(byProject([meta('a', 'X')]).map((g) => g.project)).toEqual(['X'])
    expect(byProject([])).toEqual([{ project: '', figures: [] }])
  })

  it('have short names of one line, read back as untrusted data', async () => {
    expect(tidyProject('  A\n B  ')).toBe('A B')
    expect(tidyProject('x'.repeat(200))).toHaveLength(PROJECT_NAME_MAX)
    expect(tidyProject(12)).toBe('')
    expect(tidyProject(null)).toBe('')
    localStorage.setItem('biosketch.index', JSON.stringify([{ id: 'a', name: 'A', updated: 2, objects: 1, project: { evil: true } }, { id: 'b', name: 'B', updated: 1, objects: 1, project: '  Lab  ' }]))
    expect((await listFigures()).map((m) => m.project)).toEqual([undefined, 'Lab'])
  })
})
