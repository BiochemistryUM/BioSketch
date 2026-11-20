// The icon library: the publicly available collections. Search them all, or browse one; tap or drag to place.

import { memo, useEffect, useMemo, useState } from 'react'
import { addIcon, removeCustomIcon, toggleFavouriteIcon } from '../actions'
import { ICON_MIME } from '../canvas/Canvas'
import { fromCollection } from '../icons/favourites'
import { isPublicDomain, nameFirst, searchIcons, searchTest } from '../icons/library'
import { DEFAULT_PACK, findPackIcon, groupPacks, loadedPack, loadPack, packList, packOf, searchPackNames, type PackInfo } from '../icons/packs'
import { iconMarkup } from '../icons/svg'
import type { IconDef } from '../model/types'
import { toast, useEditor } from '../store'
import { Icon } from './Icon'

const Thumb = memo(function Thumb({ icon }: { icon: IconDef }) {
  // Icons may reuse ids (gradients, clip paths); give each thumbnail its own.
  const markup = useMemo(() => iconMarkup(icon, undefined, `t${icon.id}`), [icon])
  return (
    <svg
      className="thumb"
      viewBox={`0 0 ${icon.viewBox[0]} ${icon.viewBox[1]}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  )
})

/** Most icons shown at once. Packs can hold thousands; searching narrows the list. */
const MAX_SHOWN = 150
/** The choice that lists the icons kept with this figure (imported, or already used from a collection). */
const OWN = 'in-this-figure'
/** The choices that list the scientist's favourite icons and the icons used last, from whichever collection. */
const FAVOURITES = 'favourites'
const RECENT = 'recently-used'

export function LibraryPanel() {
  const customIcons = useEditor((s) => s.doc.customIcons)
  const favourites = useEditor((s) => s.favouriteIcons)
  const recent = useEditor((s) => s.recentIcons)
  const [query, setQuery] = useState('')
  const [packs, setPacks] = useState<PackInfo[] | null>(null)
  const [choice, setChoice] = useState(DEFAULT_PACK)
  // Bumped when a pack has been fetched, so the list is drawn again with its icons.
  const [fetched, setFetched] = useState(0)
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set())

  useEffect(() => {
    void packList().then(setPacks)
  }, [])

  const custom = useMemo(() => Object.values(customIcons).filter((i) => i.category !== 'Part'), [customIcons])
  const groups = useMemo(() => groupPacks(packs ?? []), [packs])
  const searching = query.trim().length > 0
  const own = !searching && (choice === OWN || (packs !== null && !packs.length)) && custom.length > 0
  // The favourites and the icons used last come from any collection: a list of ids, newest first.
  const listed = searching || own ? null : choice === FAVOURITES ? favourites : choice === RECENT ? recent : null
  // One collection is shown at a time; a search looks through all of them.
  const pack = searching || own || listed ? undefined : (packs?.find((p) => p.id === choice) ?? packs?.find((p) => p.id === DEFAULT_PACK) ?? packs?.[0])

  // A search looks through every collection by the names that come with the pack list.
  const hits = useMemo(() => (searching ? searchPackNames(packs ?? [], query).slice(0, MAX_SHOWN) : []), [searching, packs, query])
  // Packs are fetched when they are opened, or when a search finds something in them.
  const wanted = useMemo(() => {
    if (pack) return [pack]
    if (listed) return (packs ?? []).filter((p) => listed.some((id) => packOf(id) === p.id))
    return [...new Set(hits.map((h) => h.pack))]
  }, [pack, hits, listed, packs])
  useEffect(() => {
    let stale = false
    for (const p of wanted) {
      if (loadedPack(p.id)) continue
      loadPack(p)
        .then(() => !stale && setFetched((n) => n + 1))
        .catch((e) => {
          toast(e instanceof Error ? e.message : 'These icons could not be loaded.')
          if (!stale) setFailed((ids) => new Set(ids).add(p.id))
        })
    }
    return () => {
      stale = true
    }
  }, [wanted])
  const loading = packs === null || wanted.some((p) => !loadedPack(p.id) && !failed.has(p.id))

  const matches = useMemo(() => {
    if (pack) return loadedPack(pack.id) ?? []
    if (listed) return listed.flatMap((id) => findPackIcon(id) ?? [])
    if (!searching) return custom
    const local = searchIcons(custom, query)
    // An icon from a collection that is already used in this figure is listed once, as the figure's own.
    const shown = new Set(local.map((i) => i.id))
    const all = [...local, ...hits.flatMap((h) => (shown.has(h.id) ? [] : (findPackIcon(h.id) ?? [])))]
    // Whatever the collection, an icon named after the search word comes before one that only has it as a keyword.
    const test = searchTest(query)
    return test ? nameFirst(all, (i) => test(i.name)) : all
    // `fetched` is listed so the list is rebuilt once a pack has arrived.
  }, [pack, custom, searching, query, hits, fetched, listed])
  const icons = matches.slice(0, MAX_SHOWN)
  const noPacks = packs !== null && !packs.length

  return (
    <aside className="panel library" aria-label="Icon library">
      <div className="panel-head">
        <input className="search" type="search" placeholder="Search all icons" aria-label="Search icons" value={query} onChange={(e) => setQuery(e.target.value)} />
        {!!packs?.length && (
          <label className="field pack-choice">
            <span>Collection</span>
            <select
              value={own ? OWN : listed ? choice : (pack?.id ?? choice)}
              onChange={(e) => {
                setChoice(e.target.value)
                // Choosing a collection shows that collection, so a search that was open is closed.
                setQuery('')
              }}
            >
              <option value={FAVOURITES}>★ Favourites ({favourites.length})</option>
              {recent.length > 0 && <option value={RECENT}>Used last ({recent.length})</option>}
              {custom.length > 0 && <option value={OWN}>In this figure ({custom.length})</option>}
              {groups.map((g) => (
                <optgroup key={g.source} label={g.source}>
                  {g.packs.map(({ pack: p, label }) => (
                    <option key={p.id} value={p.id}>
                      {label} ({p.count})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        )}
        {searching && <p className="hint">Results from all collections.</p>}
        {pack && (
          <p className="hint">
            {groups.find((g) => g.packs.some((p) => p.pack.id === pack.id))?.source}: {(pack.licence || 'licence per icon').replace(/^Public/, 'public')}.{' '}
            {isPublicDomain(pack.licence) ? 'Free to use, no credit needed.' : 'Credits are added to the export automatically.'}
          </p>
        )}
        {own && <p className="hint">Icons kept with this figure: imported ones, and those already used from a collection.</p>}
        {listed === favourites && <p className="hint">Your favourite icons, from any collection. Press the star on an icon to add it here or to take it away.</p>}
        {listed === recent && <p className="hint">The icons you placed last, in any figure.</p>}
      </div>
      <div className="icon-grid">
        {icons.map((icon) => (
          <div key={icon.id} className="icon-cell">
            <button
              className="icon-btn"
              title={`${icon.name} — tap to add, or drag onto the page`}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(ICON_MIME, icon.id)
                e.dataTransfer.effectAllowed = 'copy'
              }}
              onClick={() => addIcon(icon.id)}
            >
              <Thumb icon={icon} />
              <span className="icon-name">{icon.name}</span>
              {!isPublicDomain(icon.license) && <span className="icon-licence">{icon.license || 'Licence?'}</span>}
            </button>
            {fromCollection(icon.id) && (
              <button
                className={`icon-star${favourites.includes(icon.id) ? ' on' : ''}`}
                aria-pressed={favourites.includes(icon.id)}
                aria-label={favourites.includes(icon.id) ? `Take ${icon.name} out of your favourites` : `Add ${icon.name} to your favourites`}
                title={favourites.includes(icon.id) ? 'One of your favourites. Press to take it out.' : 'Add to your favourites'}
                onClick={() => toggleFavouriteIcon(icon.id)}
              >
                <Icon name="star" size={13} />
              </button>
            )}
            {icon.category === 'Imported' && (
              <button
                className="icon-remove"
                aria-label={`Remove ${icon.name} from this figure`}
                title="Remove this imported icon (also removes it from the page)"
                onClick={() => removeCustomIcon(icon.id)}
              >
                <Icon name="close" size={12} />
              </button>
            )}
          </div>
        ))}
        {loading && <p className="empty">Loading icons…</p>}
        {matches.length > icons.length && (
          <p className="empty">
            Showing {icons.length} of {matches.length}. Type in the search box to narrow the list.
          </p>
        )}
        {!icons.length && !loading && pack && failed.has(pack.id) && <p className="empty">This collection could not be loaded. Check the connection and open it again.</p>}
        {!icons.length && !loading && noPacks && <p className="empty">The icon collections could not be loaded. Check the connection and reload, or import your own SVG.</p>}
        {!icons.length && !loading && searching && !noPacks && <p className="empty">No icons match “{query}”. Try another word, or import your own SVG.</p>}
        {!icons.length && !loading && listed === favourites && <p className="empty">No favourites yet. Open a collection and press the star at the corner of an icon.</p>}
      </div>
      <div className="panel-foot">
        <button className="btn wide" onClick={() => useEditor.setState({ dialog: 'import-icon' })}>
          <Icon name="import" size={16} /> Import SVG icon
        </button>
      </div>
    </aside>
  )
}
