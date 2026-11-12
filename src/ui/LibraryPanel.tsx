// The icon library: search, browse by category, tap or drag to place.

import { memo, useMemo, useState } from 'react'
import { addIcon, removeCustomIcon } from '../actions'
import { ICON_MIME } from '../canvas/Canvas'
import { BUILTIN_ICONS, CATEGORIES, searchIcons } from '../icons/library'
import { prefixIds } from '../icons/svg'
import type { IconDef } from '../model/types'
import { useEditor } from '../store'
import { Icon } from './Icon'

const Thumb = memo(function Thumb({ icon }: { icon: IconDef }) {
  // Imported icons may reuse gradient ids; give each thumbnail its own.
  const markup = useMemo(() => prefixIds(icon.body, `t${icon.id}`), [icon])
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

export function LibraryPanel() {
  const customIcons = useEditor((s) => s.doc.customIcons)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')

  const custom = useMemo(() => Object.values(customIcons), [customIcons])
  const categories = useMemo(() => ['All', ...(custom.length ? ['Imported'] : []), ...CATEGORIES], [custom.length])
  const icons = useMemo(() => {
    const all = [...custom, ...BUILTIN_ICONS]
    const active = categories.includes(category) ? category : 'All'
    return searchIcons(active === 'All' ? all : all.filter((i) => i.category === active), query)
  }, [custom, categories, category, query])

  return (
    <aside className="panel library" aria-label="Icon library">
      <div className="panel-head">
        <input
          className="search"
          type="search"
          placeholder="Search icons"
          aria-label="Search icons"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="chips" role="tablist" aria-label="Icon categories">
          {categories.map((c) => (
            <button key={c} role="tab" aria-selected={category === c} className={`chip${category === c ? ' active' : ''}`} onClick={() => setCategory(c)}>
              {c}
            </button>
          ))}
        </div>
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
        {!icons.length && <p className="empty">No icons match “{query}”. Try another word, or import your own SVG.</p>}
      </div>
      <div className="panel-foot">
        <button className="btn wide" onClick={() => useEditor.setState({ dialog: 'import-icon' })}>
          <Icon name="import" size={16} /> Import SVG icon
        </button>
      </div>
    </aside>
  )
}
