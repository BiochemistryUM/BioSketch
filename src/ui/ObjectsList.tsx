// The objects list: everything on the page by name, front-most first. Tap a name to select the
// object (also when it sits behind another one), and hide, lock or rename it from here.

import { useState } from 'react'
import { renameNode, selectAndReveal, setNodeFlag, showAll } from '../actions'
import { MISSING_ICON, getIcon } from '../icons/library'
import { nodeLabel } from '../model/describe'
import { expandGroups } from '../model/doc'
import { isPickable, type FigNode } from '../model/types'
import { useEditor } from '../store'
import { Icon } from './Icon'

// Whether the list is open is remembered while the app is open, also when the panel is closed and reopened.
let wasOpen = false

function Row({ node, label, selected, alone }: { node: FigNode; label: string; selected: boolean; alone: boolean }) {
  const [naming, setNaming] = useState(false)
  const pick = (add: boolean) => {
    const s = useEditor.getState()
    const ids = expandGroups(s.doc, [node.id])
    selectAndReveal(add ? [...new Set([...s.selection, ...ids])] : ids)
  }
  return (
    <li className={`object-row${selected ? ' selected' : ''}${isPickable(node) ? '' : ' dim'}`}>
      {naming ? (
        <input
          className="object-rename"
          aria-label={`Name of ${label}`}
          defaultValue={node.name ?? ''}
          placeholder={label}
          maxLength={60}
          autoFocus
          onBlur={(e) => {
            if (e.target.value.trim() !== (node.name ?? '')) renameNode(node.id, e.target.value)
            setNaming(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') setNaming(false)
          }}
        />
      ) : (
        <button
          className="object-name"
          disabled={!isPickable(node)}
          title={isPickable(node) ? `Select ${label}` : `${label} is ${node.hidden ? 'hidden' : 'locked'}`}
          onClick={(e) => pick(e.shiftKey || e.metaKey || e.ctrlKey)}
        >
          {label}
        </button>
      )}
      {alone && !naming && (
        <button className="object-tool" aria-label={`Rename ${label}`} title="Rename" onClick={() => setNaming(true)}>
          <Icon name="pen" size={15} />
        </button>
      )}
      <button
        className={`object-tool${node.hidden ? ' on' : ''}`}
        aria-label={node.hidden ? `Show ${label}` : `Hide ${label}`}
        aria-pressed={!!node.hidden}
        title={node.hidden ? 'Show' : 'Hide (also leaves it out of exports)'}
        onClick={() => setNodeFlag([node.id], 'hidden', !node.hidden)}
      >
        <Icon name={node.hidden ? 'eyeOff' : 'eye'} size={15} />
      </button>
      <button
        className={`object-tool${node.locked ? ' on' : ''}`}
        aria-label={node.locked ? `Unlock ${label}` : `Lock ${label}`}
        aria-pressed={!!node.locked}
        title={node.locked ? 'Unlock' : 'Lock in place'}
        onClick={() => setNodeFlag([node.id], 'locked', !node.locked)}
      >
        <Icon name={node.locked ? 'lock' : 'unlock'} size={15} />
      </button>
    </li>
  )
}

export function ObjectsList() {
  const doc = useEditor((s) => s.doc)
  const selection = useEditor((s) => s.selection)
  const [open, setOpen] = useState(wasOpen)
  const chosen = new Set(selection)
  const hidden = doc.nodes.reduce((n, node) => n + (node.hidden ? 1 : 0), 0)
  if (!doc.nodes.length) return null
  return (
    <details
      className="section objects"
      open={open}
      onToggle={(e) => {
        wasOpen = e.currentTarget.open
        setOpen(wasOpen)
      }}
    >
      <summary>Objects ({doc.nodes.length})</summary>
      {open && (
        <>
          {hidden > 0 && (
            <button className="btn small" onClick={showAll}>
              <Icon name="eye" size={14} /> Show all ({hidden})
            </button>
          )}
          <ul className="object-list" aria-label="Objects on the page, front-most first">
            {[...doc.nodes].reverse().map((node) => (
              <Row
                key={node.id}
                node={node}
                label={nodeLabel(node, node.type === 'icon' ? (getIcon(doc, node.iconId)?.name ?? MISSING_ICON) : undefined)}
                selected={chosen.has(node.id)}
                alone={selection.length === 1 && chosen.has(node.id)}
              />
            ))}
          </ul>
        </>
      )}
    </details>
  )
}
