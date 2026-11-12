// "AI": turn a hand sketch or a written description into an editable figure.
//
// Two ways to reach Claude:
//  - "Claude app": no key and no extra cost. BioSketch writes the request, the user pastes it into
//    the Claude app they already use and pastes the answer back.
//  - "API key": one click, but needs a paid Claude API key.

import { useEffect, useMemo, useRef, useState } from 'react'
import { buildChatRequest, readChatAnswer } from '../ai/bridge'
import { AI_MODELS, AiError, DEFAULT_MODEL, requestScene } from '../ai/client'
import { sceneToNodes, type Scene } from '../ai/scene'
import { download, fileBase, renderPng, renderPngBase64, renderSvg } from '../io/export'
import { removeNodes } from '../model/doc'
import type { FigDoc } from '../model/types'
import { toast, useEditor } from '../store'
import { Modal } from './Dialogs'
import { Icon } from './Icon'

const KEY_STORE = 'biosketch.apiKey'
const MODEL_STORE = 'biosketch.aiModel'
const VIA_STORE = 'biosketch.aiVia'
const SKETCH_MAX_SIDE = 1400

type Via = 'chat' | 'api'

const read = (key: string): string => {
  try {
    return localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}
const write = (key: string, value: string) => {
  try {
    if (value) localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  } catch {
    /* storage unavailable: the value simply is not remembered */
  }
}

/** The key for this browser session when the user chose not to store it. */
let sessionKey = ''

const sketchImage = (doc: FigDoc): Promise<Blob> =>
  renderPng(doc, { area: 'page', transparent: false, includeSketch: true }, Math.min(1, SKETCH_MAX_SIDE / Math.max(doc.width, doc.height)))

/** Copy text, also where the modern clipboard is unavailable (an iPad reaching the app over plain http). */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through to the older method */
  }
  const box = document.createElement('textarea')
  box.value = text
  box.setAttribute('readonly', '')
  box.style.position = 'fixed'
  box.style.opacity = '0'
  document.body.appendChild(box)
  box.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  box.remove()
  return ok
}

async function copyImage(image: Promise<Blob>): Promise<boolean> {
  try {
    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') return false
    // The promise is handed over directly: Safari only allows clipboard writes started inside the tap itself.
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': image })])
    return true
  } catch {
    return false
  }
}

export function AiDialog() {
  const doc = useEditor((s) => s.doc)
  const strokes = useMemo(() => doc.nodes.filter((n) => n.type === 'stroke'), [doc])
  const [mode, setMode] = useState<'sketch' | 'text'>(strokes.length ? 'sketch' : 'text')
  const [via, setVia] = useState<Via>(() => (read(VIA_STORE) === 'api' || read(KEY_STORE) || sessionKey ? 'api' : 'chat'))
  const [description, setDescription] = useState('')
  const [answer, setAnswer] = useState('')
  const [apiKey, setApiKey] = useState(() => read(KEY_STORE) || sessionKey)
  const [remember, setRemember] = useState(() => !!read(KEY_STORE))
  const [model, setModel] = useState(() => {
    const saved = read(MODEL_STORE)
    return AI_MODELS.some((m) => m.id === saved) ? saved : DEFAULT_MODEL
  })
  const [replaceSketch, setReplaceSketch] = useState(true)
  const [replacePage, setReplacePage] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const abort = useRef<AbortController | null>(null)

  useEffect(() => () => abort.current?.abort(), [])

  const close = () => {
    abort.current?.abort()
    useEditor.setState({ dialog: null })
  }

  const fromSketch = mode === 'sketch'
  const hasInput = fromSketch ? strokes.length > 0 : description.trim().length > 3

  const sketchPreview = useMemo(() => {
    if (!fromSketch || !strokes.length) return ''
    const { svg } = renderSvg(doc, { area: 'page', transparent: false, includeSketch: true })
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  }, [doc, fromSketch, strokes.length])

  const request = useMemo(() => (hasInput ? buildChatRequest(fromSketch, description) : ''), [hasInput, fromSketch, description])

  const chooseVia = (next: Via) => {
    setVia(next)
    setError('')
    write(VIA_STORE, next)
  }

  /** Put the figure on the page as one undo step. */
  const applyScene = (scene: Scene) => {
    const s = useEditor.getState()
    const nodes = sceneToNodes(scene, s.doc)
    // From a sketch: the strokes make way for the figure. From a description: optionally start from a clean page.
    const removeIds = fromSketch
      ? replaceSketch
        ? s.doc.nodes.filter((n) => n.type === 'stroke').map((n) => n.id)
        : []
      : replacePage
        ? s.doc.nodes.map((n) => n.id)
        : []
    s.commit((d) => {
      const base = removeNodes(d, removeIds)
      return { ...base, nodes: [...base.nodes, ...nodes] }
    })
    s.set({ dialog: null, tool: 'select', selection: [] })
    const undoNote = removeIds.length ? (fromSketch ? ' Undo brings your sketch back.' : ' Undo brings the previous page back.') : ''
    const count = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
    toast(`Figure created: ${count(scene.elements.length, 'element')}, ${count(scene.connectors.length, 'arrow')}.${undoNote}`)
  }

  const runApi = async () => {
    setError('')
    setBusy(true)
    const key = apiKey.trim()
    sessionKey = key
    write(KEY_STORE, remember ? key : '')
    write(MODEL_STORE, model)
    const controller = new AbortController()
    abort.current = controller
    try {
      const imageBase64 = fromSketch ? await renderPngBase64(useEditor.getState().doc, SKETCH_MAX_SIDE) : undefined
      applyScene(await requestScene({ apiKey: key, model, description, imageBase64, signal: controller.signal }))
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof AiError || e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const runChat = () => {
    setError('')
    try {
      applyScene(readChatAnswer(answer))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The answer could not be read.')
    }
  }

  const onCopyRequest = async () => {
    toast((await copyText(request)) ? 'Request copied. Paste it into Claude.' : 'Could not copy. Open “Show the request” and copy the text by hand.')
  }
  const onCopyImage = async () => {
    toast((await copyImage(sketchImage(doc))) ? 'Sketch image copied. Paste it into the same Claude message.' : 'Could not copy the image here. Use “Save image” and attach the file instead.')
  }
  const onSaveImage = async () => {
    try {
      download(await sketchImage(doc), `${fileBase(doc)}-sketch.png`)
      toast('Sketch image saved. Attach it to your Claude message.')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'The image could not be created.')
    }
  }

  return (
    <Modal title="Create a figure with AI" onClose={close} wide>
      <div className="segmented big" role="group" aria-label="Start from">
        <button className={fromSketch ? 'active' : ''} aria-pressed={fromSketch} onClick={() => setMode('sketch')}>
          From my sketch
        </button>
        <button className={!fromSketch ? 'active' : ''} aria-pressed={!fromSketch} onClick={() => setMode('text')}>
          From a description
        </button>
      </div>

      {fromSketch ? (
        strokes.length ? (
          <div className="ai-sketch">
            <img src={sketchPreview} alt="Your sketch" />
            <div>
              <p className="hint">
                The AI reads your sketch, including handwritten labels, and rebuilds it from library icons, boxes and arrows. Everything stays editable.
              </p>
              <label className="field">
                <span className="field-label">Notes for the AI (optional)</span>
                <textarea rows={3} value={description} placeholder="e.g. The round shapes are mitochondria; the X means inhibition." onChange={(e) => setDescription(e.target.value)} />
              </label>
              <label className="check">
                <input type="checkbox" checked={replaceSketch} onChange={(e) => setReplaceSketch(e.target.checked)} />
                <span>Remove my sketch strokes afterwards</span>
              </label>
            </div>
          </div>
        ) : (
          <p className="notice">There is no sketch yet. Close this window, pick the sketch pen, and draw your process on the page first.</p>
        )
      ) : (
        <>
          <label className="field">
            <span className="field-label">Describe the process</span>
            <textarea
              rows={4}
              value={description}
              placeholder="e.g. A growth factor binds a receptor on the cell membrane, which activates RAS, then RAF, MEK and ERK. ERK moves into the nucleus and switches on proliferation genes. A drug inhibits RAF."
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          {doc.nodes.length > 0 && (
            <label className="check">
              <input type="checkbox" checked={replacePage} onChange={(e) => setReplacePage(e.target.checked)} />
              <span>Clear the page first (otherwise the new figure is added on top of what is there)</span>
            </label>
          )}
        </>
      )}

      <fieldset className="ai-settings">
        <legend>How to reach Claude</legend>
        <div className="segmented" role="group" aria-label="How to reach Claude">
          <button className={via === 'chat' ? 'active' : ''} aria-pressed={via === 'chat'} onClick={() => chooseVia('chat')}>
            Claude app (no key, no extra cost)
          </button>
          <button className={via === 'api' ? 'active' : ''} aria-pressed={via === 'api'} onClick={() => chooseVia('api')}>
            API key (one click)
          </button>
        </div>

        {via === 'chat' ? (
          <ol className="steps">
            <li>
              <span className="step-title">Copy the request{fromSketch ? ' and your sketch' : ''}</span>
              <div className="row wrap">
                <button className="btn small" disabled={!hasInput} onClick={onCopyRequest}>
                  <Icon name="copy" size={14} /> Copy request
                </button>
                {fromSketch && (
                  <>
                    <button className="btn small" disabled={!hasInput} onClick={onCopyImage}>
                      <Icon name="copy" size={14} /> Copy sketch image
                    </button>
                    <button className="btn small" disabled={!hasInput} onClick={onSaveImage}>
                      <Icon name="export" size={14} /> Save image
                    </button>
                  </>
                )}
              </div>
              {hasInput ? (
                <details className="request-text">
                  <summary>Show the request</summary>
                  <textarea readOnly rows={5} value={request} aria-label="Request text for Claude" onFocus={(e) => e.target.select()} />
                </details>
              ) : (
                <p className="hint">{fromSketch ? 'Draw a sketch first.' : 'Describe the process above first.'}</p>
              )}
            </li>
            <li>
              <span className="step-title">Ask Claude</span>
              <p className="hint">
                Open the Claude app or claude.ai, start a new chat, paste the request{fromSketch ? ', add the sketch image to the same message' : ''} and send it.
              </p>
            </li>
            <li>
              <span className="step-title">Paste Claude’s answer here</span>
              <textarea
                rows={4}
                value={answer}
                spellCheck={false}
                placeholder="Paste the whole answer. It starts with { and ends with }."
                aria-label="Claude’s answer"
                onChange={(e) => setAnswer(e.target.value)}
              />
            </li>
          </ol>
        ) : (
          <>
            <label className="field">
              <span className="field-label">Claude API key</span>
              <input
                type="password"
                className="text-line"
                autoComplete="off"
                spellCheck={false}
                value={apiKey}
                placeholder="sk-ant-…"
                onChange={(e) => setApiKey(e.target.value)}
              />
            </label>
            <div className="row wrap">
              <label className="check">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                <span>Remember the key in this browser</span>
              </label>
              <label className="field inline">
                <span className="field-label">Model</span>
                <select value={model} onChange={(e) => setModel(e.target.value)}>
                  {AI_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </>
        )}

        <p className="hint">
          {via === 'chat'
            ? 'This uses the Claude plan you already have. BioSketch sends nothing itself: you carry the request to Claude and the answer back.'
            : 'An API key is paid per request and is separate from a Claude subscription (create one at console.anthropic.com). The key stays in this browser and is sent only to Anthropic, with your sketch or description. Do not store it on a shared device.'}
        </p>
      </fieldset>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <button className="btn" onClick={close}>
          {busy ? 'Cancel' : 'Close'}
        </button>
        {via === 'chat' ? (
          <button className="btn primary" disabled={!answer.trim()} onClick={runChat}>
            <Icon name="sparkles" size={16} /> Create figure
          </button>
        ) : (
          <button className="btn primary" disabled={!hasInput || !apiKey.trim() || busy} onClick={runApi}>
            <Icon name="sparkles" size={16} /> {busy ? 'Working… this can take a minute' : 'Create figure'}
          </button>
        )}
      </div>
    </Modal>
  )
}
