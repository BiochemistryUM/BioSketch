import { setTool } from '../actions'
import { useEditor, type Tool } from '../store'
import { Icon, type IconName } from './Icon'

export const TOOLS: { tool: Tool; icon: IconName; label: string; key: string }[] = [
  { tool: 'select', icon: 'select', label: 'Select and move', key: 'V' },
  { tool: 'pan', icon: 'pan', label: 'Move the view', key: 'H' },
  { tool: 'text', icon: 'text', label: 'Text label', key: 'T' },
  { tool: 'shape', icon: 'shape', label: 'Shape', key: 'R' },
  { tool: 'connector', icon: 'connector', label: 'Arrow', key: 'A' },
  { tool: 'membrane', icon: 'membrane', label: 'Membrane brush', key: 'M' },
  { tool: 'pen', icon: 'pen', label: 'Sketch pen', key: 'P' },
  { tool: 'eraser', icon: 'eraser', label: 'Sketch eraser', key: 'E' },
]

export function ToolRail() {
  const tool = useEditor((s) => s.tool)
  return (
    <nav className="tool-rail" aria-label="Tools">
      {TOOLS.map((t) => (
        <button
          key={t.tool}
          className={`tool-btn${tool === t.tool ? ' active' : ''}`}
          aria-label={t.label}
          aria-pressed={tool === t.tool}
          title={`${t.label} (${t.key})`}
          onClick={() => setTool(t.tool)}
        >
          <Icon name={t.icon} size={22} />
        </button>
      ))}
    </nav>
  )
}
