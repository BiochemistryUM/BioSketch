// "What's new" (shown once after an update, and from the File menu) and "Report a problem".

import { useState } from 'react'
import { download, fileBase } from '../io/download'
import { serializeDoc } from '../io/files'
import { browserName, reportBody, reportLink, type ReportFacts } from '../io/report'
import { toast, useEditor } from '../store'
import { VERSION, WHATS_NEW } from '../version'
import { copyText } from './copy'
import { Modal } from './Dialogs'
import { Icon } from './Icon'

const close = () => useEditor.setState({ dialog: null })

export function WhatsNewDialog() {
  return (
    <Modal title={`What's new in BioSketch ${VERSION}`} onClose={close}>
      {WHATS_NEW.map((r) => (
        <section key={r.version} className="whats-new">
          <h2>
            {r.version} <small>{r.date}</small>
          </h2>
          <ul>
            {r.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
      <div className="row">
        <button className="btn primary" onClick={close}>
          Close
        </button>
        <button className="btn" onClick={() => useEditor.setState({ dialog: 'report' })}>
          Report a problem…
        </button>
      </div>
    </Modal>
  )
}

export function ReportDialog() {
  const [text, setText] = useState('')
  const [attach, setAttach] = useState(true)
  const doc = useEditor((s) => s.doc)
  const facts = (attached?: string): ReportFacts => ({
    version: VERSION,
    browser: browserName(navigator.userAgent),
    screen: `${window.innerWidth} × ${window.innerHeight}`,
    ...(attached ? { attached } : {}),
  })
  const attachFile = (): string | undefined => {
    if (!attach) return undefined
    const name = `${fileBase(doc)}.biosketch.json`
    download(serializeDoc(doc), name, 'application/json')
    return name
  }
  return (
    <Modal title="Report a problem" onClose={close}>
      <p className="hint">This writes an email in your own mail program. BioSketch sends nothing by itself.</p>
      <label className="field">
        <span className="field-label">What happened, and what did you expect?</span>
        <textarea rows={6} autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="For example: I pressed Export › PDF and the window stayed empty." />
      </label>
      <label className="check">
        <input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} />
        Save the open figure (“{doc.name || 'Untitled'}”) as a file, to attach to the email
      </label>
      <p className="hint">
        Filled in for you: version {VERSION}, {browserName(navigator.userAgent)}. A mail link cannot carry a file: when the figure is saved, attach it from your downloads.
      </p>
      <div className="row wrap">
        <button
          className="btn primary"
          onClick={() => {
            const link = reportLink(text, facts(attachFile()))
            window.location.href = link
          }}
        >
          <Icon name="export" size={16} /> Write the email
        </button>
        <button
          className="btn"
          title="For a message in a chat or a web mail that a mail link does not open"
          onClick={() => {
            const body = reportBody(text, facts(attachFile()))
            void copyText(body).then((ok) => toast(ok ? 'Report copied: paste it into a message.' : 'The report could not be copied.'))
          }}
        >
          Copy the report
        </button>
      </div>
    </Modal>
  )
}
