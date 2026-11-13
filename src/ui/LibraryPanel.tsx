// The icon library: search, browse by category, tap or drag to place.

import { memo, useEffect, useMemo, useState } from 'react'
import { addIcon, removeCustomIcon } from '../actions'
import { ICON_MIME } from '../canvas/Canvas'
import { BUILTIN_ICONS, CATEGORIES, isPublicDomain, nameFirst, searchIcons, searchTest } from '../icons/library'
import { findPackIcon, listPacks, loadedPack, loadPack, searchPackNames, type PackInfo } from '../icons/packs'
import { styleIcon } from '../icons/style'
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
/** The chip that opens the extra collections (icon packs). */
const MORE = 'More icons'

export function LibraryPanel() {
  const customIcons = useEditor((s) => s.doc.customIcons)
  const iconStyle = useEditor((s) => s.doc.iconStyle)
  // The library shows the built-in icons in the look this figure uses.
  const builtin = useMemo(() => BUILTIN_ICONS.map((i) => styleIcon(i, iconStyle)), [iconStyle])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [packs, setPacks] = useState<PackInfo[]>([])
  const [packId, setPackId] = useState('')
  // Bumped when a pack has been fetched, so the list is drawn again with its icons.
  const [fetched, setFetched] = useState(0)
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set())

  useEffect(() => {
    void listPacks().then(setPacks)
  }, [])

  const custom = useMemo(() => Object.values(customIcons).filter((i) => i.category !== 'Part'), [customIcons])
  const categories = useMemo(() => ['All', ...(custom.length ? ['Imported'] : []), ...CATEGORIES, ...(packs.length ? [MORE] : [])], [custom.length, packs.length])
  const active = categories.includes(category) ? category : 'All'
  const pack = active === MORE ? (packs.find((p) => p.id === packId) ?? packs[0]) : undefined

  // Searching everything also looks through the packs, by the names that come with the pack list.
  const hits = useMemo(() => (active === 'All' ? searchPackNames(packs, query).slice(0, MAX_SHOWN) : []), [active, packs, query])
  // Packs are fetched when they are opened, or when a search finds something in them.
  const wanted = useMemo(() => (pack ? [pack] : [...new Set(hits.map((h) => h.pack))]), [pack, hits])
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
  const loading = wanted.some((p) => !loadedPack(p.id) && !failed.has(p.id))

  const matches = useMemo(() => {
    if (pack) return searchIcons(loadedPack(pack.id) ?? [], query)
    const own = [...custom, ...builtin]
    const local = searchIcons(active === 'All' ? own : own.filter((i) => i.category === active), query)
    // An icon from a collection that is already used in this figure is listed once, as the figure's own.
    const shown = new Set(local.map((i) => i.id))
    const all = [...local, ...hits.flatMap((h) => (shown.has(h.id) ? [] : (findPackIcon(h.id) ?? [])))]
    // Whatever the collection, an icon named after the search word comes before one that only has it as a keyword.
    const test = searchTest(query)
    return test ? nameFirst(all, (i) => test(i.name)) : all
    // `fetched` is listed so the list is rebuilt once a pack has arrived.
  }, [pack, custom, builtin, active, query, hits, fetched])
  const icons = matches.slice(0, MAX_SHOWN)

  return (
    <aside className="panel library" aria-label="Icon library">
      <div className="panel-head">
        <input
          className="search"
          type="search"
          placeholder={pack ? `Search ${pack.name}` : active === 'All' ? 'Search all icons' : `Search ${active.toLowerCase()}`}
          aria-label="Search icons"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="chips" role="tablist" aria-label="Icon categories">
          {categories.map((c) => (
            <button key={c} role="tab" aria-selected={active === c} className={`chip${c === MORE ? ' pack' : ''}${active === c ? ' active' : ''}`} onClick={() => setCategory(c)}>
              {c}
            </button>
          ))}
        </div>
        {pack && (
          <>
            <label className="field pack-choice">
              <span>Collection</span>
              <select value={pack.id} onChange={(e) => setPackId(e.target.value)}>
                {packs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.count})
                  </option>
                ))}
              </select>
            </label>
            <p className="hint">
              {pack.licence || 'Licence per icon'}. {isPublicDomain(pack.licence) ? 'Free to use, no credit needed.' : 'Credits are added to the export automatically.'}
            </p>
          </>
        )}
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
        {!icons.length && !loading && !(pack && failed.has(pack.id)) && <p className="empty">No icons match “{query}”. Try another word, or import your own SVG.</p>}
      </div>
      <div className="panel-foot">
        <button className="btn wide" onClick={() => useEditor.setState({ dialog: 'import-icon' })}>
          <Icon name="import" size={16} /> Import SVG icon
        </button>
      </div>
    </aside>
  )
}
