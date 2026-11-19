// "Ask Claude which analysis fits": the scientist describes the experiment, copies a request into
// their own Claude app, and pastes Claude's plan back. BioSketch checks the plan against the table
// and, when the scientist agrees, sets the chart's test. All arithmetic stays in BioSketch.

import { useMemo, useState } from 'react'
import { analysisRequest, readAnalysisAnswer, type AnalysisPlan } from '../ai/analysis'
import { chartAdvice } from '../model/chart'
import { TEST_NAMES } from '../model/chartTests'
import { updateNodes } from '../model/doc'
import type { ChartNode } from '../model/types'
import { toast, useEditor } from '../store'
import { copyText } from './copy'
import { Modal } from './Dialogs'
import { Icon } from './Icon'

const message = (e: unknown, fallback: string): string => (e instanceof Error && e.message ? e.message : fallback)

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null
  return (
    <>
      <h3 className="outcome-title">{title}</h3>
      <ul className="outcome-list">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </>
  )
}

export function AnalysisDialog() {
  const close = () => useEditor.setState({ dialog: null })
  const node = useEditor((s) => {
    const one = s.selection.length === 1 ? s.doc.nodes.find((n) => n.id === s.selection[0]) : undefined
    return one?.type === 'chart' ? one : undefined
  })
  const [description, setDescription] = useState('')
  const [answer, setAnswer] = useState('')
  const [plan, setPlan] = useState<AnalysisPlan | null>(null)
  const [error, setError] = useState('')

  /** The request, or why none can be written for this chart. */
  const request = useMemo((): { text: string; problem: string } => {
    if (!node) return { text: '', problem: 'Select one chart on the page first.' }
    try {
      return { text: analysisRequest(node, description), problem: '' }
    } catch (e) {
      return { text: '', problem: message(e, 'This chart has nothing a test could compare.') }
    }
  }, [node, description])

  if (!node || request.problem) {
    return (
      <Modal title="Ask Claude which analysis fits" onClose={close}>
        <p>{request.problem}</p>
        <div className="modal-actions">
          <button className="btn primary" onClick={close}>
            Close
          </button>
        </div>
      </Modal>
    )
  }

  const read = () => {
    setError('')
    try {
      setPlan(readAnalysisAnswer(answer, node))
    } catch (e) {
      setPlan(null)
      setError(message(e, 'The answer could not be read.'))
    }
  }
  const use = (chosen: ChartNode['test']) => {
    useEditor.getState().commit((d) => updateNodes(d, [node.id], (n) => (n.type === 'chart' ? { ...n, test: chosen } : n)))
    toast('The analysis is set. Its result is under “Statistical test” in the panel.')
    close()
  }
  const own = chartAdvice(node)

  if (plan) {
    return (
      <Modal title="Claude’s plan for this chart" onClose={close} wide>
        {plan.test ? (
          <p>
            Claude proposes: <b>{plan.name}</b>
            {plan.test.paired ? ', with every row of the table taken as one sample' : ''}.
          </p>
        ) : (
          <p>
            <b>Claude proposes none of the analyses BioSketch can work out for this table.</b>
          </p>
        )}
        {plan.adjusted.map((note, i) => (
          <p key={i} className="notice">
            {note}
          </p>
        ))}
        <List title="Claude’s reasons" items={plan.why} />
        <List title="Keep in mind" items={plan.cautions} />
        <List title="Still to check" items={plan.questions} />
        {plan.beyond && (
          <>
            <h3 className="outcome-title">What this design would need beyond BioSketch</h3>
            <p>{plan.beyond}</p>
          </>
        )}
        <p className="hint">
          {own.test ? `From the table alone, BioSketch suggests: ${TEST_NAMES[own.test]}. ` : ''}
          The plan is advice: Claude knows what you told it, not your experiment. BioSketch works out every number itself; no number from the answer is used.
        </p>
        <div className="modal-actions">
          <button className="btn" onClick={() => setPlan(null)}>
            Back
          </button>
          {plan.test && (
            <button className="btn primary" onClick={() => use(plan.test ?? undefined)}>
              Use this analysis
            </button>
          )}
          {!plan.test && (
            <button className="btn primary" onClick={close}>
              Close
            </button>
          )}
        </div>
      </Modal>
    )
  }

  return (
    <Modal title="Ask Claude which analysis fits" onClose={close} wide>
      <p className="hint">
        Describe the experiment, and Claude proposes an analysis from those BioSketch can work out, with its reasons. You use your own Claude app: nothing is sent from here, and it costs nothing. BioSketch does
        the arithmetic.
      </p>
      <ol className="steps">
        <li>
          <span className="step-title">Describe the experiment</span>
          <textarea
            rows={4}
            value={description}
            placeholder="e.g. Six mice per genotype, tumour volume on day 21. Each value is one mouse. The mice of a row are not related."
            aria-label="Description of the experiment"
            onChange={(e) => setDescription(e.target.value)}
          />
          <p className="hint">Say what one value is (an animal, a culture, a repeat of the same sample), and whether values in the same row belong together.</p>
        </li>
        <li>
          <span className="step-title">Copy the request</span>
          <div className="row wrap">
            <button className="btn small" onClick={async () => toast((await copyText(request.text)) ? 'Request copied. Paste it into Claude.' : 'Could not copy. Open “Show the request” and copy the text by hand.')}>
              <Icon name="copy" size={14} /> Copy request
            </button>
          </div>
          <p className="hint">It holds your description, the names of the groups and a summary of each: how many values, their mean, scatter, median, smallest and largest. The table itself is not included.</p>
          <details className="request-text">
            <summary>Show the request</summary>
            <textarea readOnly rows={6} value={request.text} aria-label="Request text for Claude" onFocus={(e) => e.target.select()} />
          </details>
        </li>
        <li>
          <span className="step-title">Ask Claude</span>
          <p className="hint">Open the Claude app or claude.ai, start a new chat, paste the request and send it. Claude may ask you questions first: answer them in the chat.</p>
        </li>
        <li>
          <span className="step-title">Paste Claude’s final answer here</span>
          <textarea rows={4} value={answer} spellCheck={false} placeholder="Paste the whole answer. It holds a block that starts with { and ends with }." aria-label="Claude’s answer" onChange={(e) => setAnswer(e.target.value)} />
        </li>
      </ol>
      {error && <p className="notice">{error}</p>}
      <div className="modal-actions">
        <button className="btn" onClick={close}>
          Cancel
        </button>
        <button className="btn primary" disabled={!answer.trim()} onClick={read}>
          Read the answer
        </button>
      </div>
    </Modal>
  )
}
