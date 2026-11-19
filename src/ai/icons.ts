// Fetching the drawings an AI answer names. The answer only holds icon ids; the collections they
// come from are fetched here (once each), before the figure is built.

import { loadPack, packOf, type PackInfo } from '../icons/packs'
import type { IconDef } from '../model/types'
import { catalogueId, type IconLookup, type Scene } from './scene'

export interface SceneIcons {
  /** The scene with every icon id written in full; an id the library does not have is left as it came. */
  scene: Scene
  icons: IconLookup
  /** Collections that were needed and could not be fetched: their icons become boxes. */
  missing: string[]
}

/** Work out which icons a scene names and fetch their collections. Never throws. */
export async function sceneIcons(scene: Scene, packs: PackInfo[], load: (pack: PackInfo) => Promise<IconDef[]> = loadPack): Promise<SceneIcons> {
  const elements = scene.elements.map((e) => {
    const id = e.kind === 'icon' ? catalogueId(e.icon, packs) : ''
    return id ? { ...e, icon: id } : e
  })
  const needed = new Set(elements.flatMap((e) => (e.kind === 'icon' && packOf(e.icon) ? [packOf(e.icon)] : [])))
  const found = new Map<string, IconDef>()
  const missing: string[] = []
  await Promise.all(
    packs
      .filter((p) => needed.has(p.id))
      .map(async (pack) => {
        try {
          for (const icon of await load(pack)) found.set(icon.id, icon)
        } catch {
          missing.push(pack.name)
        }
      }),
  )
  return { scene: { ...scene, elements }, icons: (id) => found.get(id), missing }
}
