// A row of tabs for dialogs (calculators, import): one open at a time, arrow keys move along.

import { useId } from 'react'

export interface TabDef<T extends string> {
  id: T
  label: string
  title?: string
}

export function Tabs<T extends string>({ tabs, tab, onTab, label }: { tabs: TabDef<T>[]; tab: T; onTab: (t: T) => void; label: string }) {
  const id = useId()
  return (
    <div className="tabs dialog-tabs" role="tablist" aria-label={label}>
      {tabs.map((t, i) => (
        <button
          key={t.id}
          role="tab"
          id={`${id}-${t.id}`}
          className={tab === t.id ? 'active' : ''}
          aria-selected={tab === t.id}
          tabIndex={tab === t.id ? 0 : -1}
          title={t.title}
          onClick={() => onTab(t.id)}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
            e.preventDefault()
            const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length].id
            onTab(next)
            document.getElementById(`${id}-${next}`)?.focus()
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
