// What the start card offers without fetching the templates file must be what that file holds.

import { describe, expect, it } from 'vitest'
import { START_EXAMPLES } from '../src/figures'
import { TEMPLATES } from '../src/templates'

describe('the start card', () => {
  it('offers the example figures of the templates, by id and name', () => {
    expect(START_EXAMPLES).toEqual(TEMPLATES.filter((t) => !t.group).map((t) => ({ id: t.id, name: t.name })))
  })
})
