// Shared by the tests that need icons from the collections. The real pack list is read from
// public/icon-packs/index.json; the drawings themselves are megabytes of artwork, so plain
// stand-ins with the same ids are used wherever a test needs a size and an id, not a picture.

import indexRaw from '../public/icon-packs/index.json?raw'
import { iconsUsed, type IconLookup } from '../src/ai/scene'
import type { PackInfo } from '../src/icons/packs'
import { everyNode } from '../src/model/slides'
import type { FigDoc, IconDef } from '../src/model/types'
import type { Template } from '../src/templates'

/** The icon packs as the app lists them. */
export const PACKS = JSON.parse(indexRaw) as PackInfo[]

const KNOWN = new Set(PACKS.flatMap((p) => p.names.map((n) => `${p.id}--${n[0]}`)))

/** A plain drawing standing in for an icon of a collection. */
export const stubIcon = (id: string): IconDef => ({
  id,
  name: id.replace(/^.*--/, '').replace(/-/g, ' '),
  category: 'Test collection',
  tags: [],
  viewBox: [120, 80],
  body: '<rect x="2" y="2" width="116" height="76" rx="8" fill="#a9cdf3" stroke="#2f6fb5"/>',
  license: 'Public domain',
  author: 'Test',
  source: 'https://example.org',
})

/** Finds a stand-in for every icon the collections really have, and nothing for any other id. */
export const packIcons: IconLookup = (id) => (KNOWN.has(id) ? stubIcon(id) : undefined)

/** Stands in for fetching a pack: every icon it lists, as stand-ins. */
export const loadStub = async (pack: PackInfo): Promise<IconDef[]> => pack.names.map((n) => stubIcon(`${pack.id}--${n[0]}`))

/** An example figure, complete with (stand-in) drawings, as the app builds it once its packs are fetched. */
export function example(template: Template): FigDoc {
  const doc = template.build(packIcons)
  return { ...doc, customIcons: iconsUsed(everyNode(doc), packIcons) }
}
