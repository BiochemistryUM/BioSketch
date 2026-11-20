// When the editor itself fails to draw, a message instead of a white page: what happened, a way
// to keep the figure that is open (it is still in memory even when the screen cannot show it),
// and a way to report it.

import { Component, type ReactNode } from 'react'
import { download, fileBase } from '../io/download'
import { serializeDoc } from '../io/files'
import { useEditor } from '../store'
import { VERSION } from '../version'

export class Crash extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null }

  static getDerivedStateFromError(error: unknown): { error: string } {
    return { error: error instanceof Error ? `${error.name}: ${error.message}` : String(error) }
  }

  render(): ReactNode {
    if (this.state.error === null) return this.props.children
    const save = () => {
      const doc = useEditor.getState().doc
      download(serializeDoc(doc), `${fileBase(doc)}.biosketch.json`, 'application/json')
    }
    return (
      <div className="crash" role="alert">
        <h1>Something went wrong in BioSketch</h1>
        <p>The editor stopped drawing. Your figure is still here: save it as a file before you reload, then open it again with File › Open figure file if it does not come back by itself.</p>
        <div className="row wrap">
          <button className="btn primary" onClick={save}>
            Save the figure as a file
          </button>
          <button className="btn" onClick={() => location.reload()}>
            Reload
          </button>
          <button className="btn" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
        </div>
        <p className="hint">Please tell whoever shared BioSketch with you what you did just before, with this message (version {VERSION}):</p>
        <pre>{this.state.error}</pre>
      </div>
    )
  }
}
