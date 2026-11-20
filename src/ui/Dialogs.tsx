// Dialogs: export, import an SVG icon, help.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { addCustomIcon, addIcon } from '../actions'
import { extractColors, parseSvgFile, prefixIds, type ParsedSvg } from '../icons/svg'
import {
  attributionLines,
  attributionText,
  download,
  exportRect,
  fileBase,
  printFigure,
  needsPicture,
  renderDeckPptx,
  renderPptx,
  renderPng,
  renderSlidesZip,
  renderSvg,
  scaleForDpi,
  smallestTextPt,
  type ExportOptions,
} from '../io/export'
import { newFigure, tourDoc } from '../figures'
import { serializeDoc } from '../io/files'
import { uid } from '../model/doc'
import { everyNode, slideCount, slideDocs, slideIndex } from '../model/slides'
import { toast, useEditor } from '../store'
import { Icon } from './Icon'
import { TOOLS } from './ToolRail'

export function Modal({ title, children, onClose, wide }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  // The latest onClose is kept in a ref so the effect below runs once: re-running it would
  // pull keyboard focus out of whatever field the user is typing in.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return (
    <div className="modal-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <header className="modal-head">
          <h1>{title}</h1>
          <button className="icon-only" aria-label="Close" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

const close = () => useEditor.setState({ dialog: null })

// ---------- export ----------

export function ExportDialog() {
  const doc = useEditor((s) => s.doc)
  const showSketch = useEditor((s) => s.showSketch)
  const hasSketch = doc.nodes.some((n) => n.type === 'stroke')
  const [opts, setOpts] = useState<ExportOptions>({ area: 'page', transparent: false, includeSketch: showSketch && hasSketch })
  const [scale, setScale] = useState(2)
  const [busy, setBusy] = useState(false)
  // A figure with several slides: the open one alone, or all of them together.
  const count = slideCount(doc)
  const [allSlides, setAllSlides] = useState(false)
  const all = allSlides && count > 1
  // Everything on every slide as one figure, for what is said about all slides (credits, shaded icons).
  const whole = useMemo(() => (all ? { ...doc, nodes: everyNode(doc) } : doc), [doc, all])

  const rect = exportRect(doc, all ? 'page' : opts.area, opts.includeSketch)
  // With a printed width set, offer the resolutions journals ask for.
  const dpiScales = [300, 600].flatMap((dpi) => {
    const s = scaleForDpi(doc, dpi)
    return s ? [{ value: s, label: `${dpi} dpi` }] : []
  })
  const scales = [...[1, 2, 3, 4].map((s) => ({ value: s, label: `${s}×` })), ...dpiScales]
  const smallest = smallestTextPt(whole)
  const credits = attributionLines(whole)
  const creditText = attributionText(whole)
  const shadedIcons = useMemo(() => whole.nodes.filter((n) => needsPicture(whole, n)).length, [whole])
  const preview = useMemo(() => {
    const { svg } = renderSvg(doc, all ? { ...opts, area: 'page' } : opts)
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  }, [doc, opts, all])

  const saveSvg = async () => {
    if (!all) {
      download(renderSvg(doc, opts).svg, `${fileBase(doc)}.svg`, 'image/svg+xml')
      toast('SVG downloaded')
      return
    }
    setBusy(true)
    try {
      download(await renderSlidesZip(slideDocs(doc), opts, 'svg'), `${fileBase(doc)}-svg.zip`)
      toast(`${count} SVG files downloaded, in one ZIP file`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'The files could not be created.')
    } finally {
      setBusy(false)
    }
  }
  const savePng = async () => {
    setBusy(true)
    try {
      if (all) download(await renderSlidesZip(slideDocs(doc), opts, 'png', scale), `${fileBase(doc)}-png.zip`)
      else download(await renderPng(doc, opts, scale), `${fileBase(doc)}.png`)
      toast(all ? `${count} PNG files downloaded, in one ZIP file` : 'PNG downloaded')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'The image could not be created.')
    } finally {
      setBusy(false)
    }
  }
  const savePptx = async () => {
    setBusy(true)
    try {
      download(all ? await renderDeckPptx(slideDocs(doc), opts) : await renderPptx(doc, opts), `${fileBase(doc)}.pptx`)
      toast('PowerPoint file downloaded')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'The PowerPoint file could not be created.')
    } finally {
      setBusy(false)
    }
  }
  const copyCredits = async () => {
    try {
      await navigator.clipboard.writeText(creditText)
      toast('Attribution copied')
    } catch {
      toast('Could not copy. Select the text and copy it by hand.')
    }
  }

  return (
    <Modal title="Export figure" onClose={close} wide>
      <div className="export-grid">
        <div className={`export-preview${opts.transparent ? ' checker' : ''}`}>
          <img src={preview} alt="Preview of the exported figure" />
        </div>
        <div className="export-options">
          {count > 1 && (
            <fieldset className="export-which">
              <legend>What to export</legend>
              <label className="check">
                <input type="radio" name="export-which" checked={!all} onChange={() => setAllSlides(false)} />
                <span>
                  This slide ({slideIndex(doc) + 1} of {count})
                </span>
              </label>
              <label className="check">
                <input type="radio" name="export-which" checked={all} onChange={() => setAllSlides(true)} />
                <span>All {count} slides</span>
              </label>
            </fieldset>
          )}
          <label className="check">
            <input type="checkbox" checked={!all && opts.area === 'content'} disabled={all} onChange={(e) => setOpts({ ...opts, area: e.target.checked ? 'content' : 'page' })} />
            <span>Crop to the drawing{all ? ' (slides are exported as whole pages)' : ''}</span>
          </label>
          <label className="check">
            <input type="checkbox" checked={opts.transparent} onChange={(e) => setOpts({ ...opts, transparent: e.target.checked })} />
            <span>Transparent background</span>
          </label>
          {hasSketch && (
            <label className="check">
              <input type="checkbox" checked={opts.includeSketch} onChange={(e) => setOpts({ ...opts, includeSketch: e.target.checked })} />
              <span>Include sketch strokes</span>
            </label>
          )}
          <div className="export-actions">
            <button className="btn primary" onClick={() => void saveSvg()} disabled={busy}>
              <Icon name="export" size={16} /> {all ? 'SVG (a file per slide)' : 'SVG (vector)'}
            </button>
            <p className="hint">Best for further editing in Inkscape or Illustrator.{all ? ' The files come in one ZIP file.' : ''}</p>
            <button className="btn primary" onClick={() => printFigure(all ? slideDocs(doc) : doc, opts)}>
              <Icon name="pdf" size={16} /> {all ? 'PDF (a page per slide)' : 'PDF (vector)'}
            </button>
            <p className="hint">
              Opens the print window: choose “Save as PDF” there. The page is set to the figure’s size.
              {all ? ' The PDF can be shown full screen as a presentation, on any computer.' : ''}
            </p>
            <button className="btn primary" onClick={savePptx} disabled={busy}>
              <Icon name="template" size={16} /> {all ? 'PowerPoint (all slides)' : 'PowerPoint (slide)'}
            </button>
            <p className="hint">
              {all
                ? 'Every slide becomes a slide of the PowerPoint file, the size of the page, as a sharp picture. The slides are not editable shape by shape in PowerPoint.'
                : 'One slide with the figure as a sharp picture you can resize. It is not editable shape by shape in PowerPoint.'}
              {shadedIcons > 0 &&
                (shadedIcons === 1
                  ? ' One icon has shading PowerPoint cannot draw: it goes in as a picture of itself.'
                  : ` ${shadedIcons} icons have shading PowerPoint cannot draw: they go in as pictures of themselves.`)}
            </p>
            <div className="row">
              <button className="btn primary" onClick={savePng} disabled={busy}>
                <Icon name="export" size={16} /> {busy ? 'Rendering…' : all ? 'PNG (a file per slide)' : 'PNG (image)'}
              </button>
              <select aria-label="PNG resolution" value={scale} onChange={(e) => setScale(Number(e.target.value))}>
                {scales.map((s) => (
                  <option key={s.label} value={s.value}>
                    {s.label} · {Math.round(rect.w * s.value)} × {Math.round(rect.h * s.value)} px
                  </option>
                ))}
              </select>
            </div>
            <button
              className="btn"
              onClick={() => {
                download(serializeDoc(doc), `${fileBase(doc)}.biosketch.json`, 'application/json')
                toast('Figure file downloaded')
              }}
            >
              <Icon name="save" size={16} /> {count > 1 ? `Figure file (all ${count} slides, to edit later)` : 'Figure file (to edit later)'}
            </button>
          </div>
        </div>
      </div>
      <section className="credits">
        <h2>Print size</h2>
        {doc.widthMm ? (
          <p className={smallest !== null && smallest < 5 ? 'notice' : 'hint'}>
            Printed at {doc.widthMm} mm wide ({Math.round(((doc.widthMm * doc.height) / doc.width) * 10) / 10} mm high).
            {smallest !== null &&
              ` The smallest text will be ${smallest} pt${smallest < 5 ? ', which is below the 5 pt most journals accept. Make the labels larger or the figure wider.' : '.'}`}
          </p>
        ) : (
          <p className="hint">No printed width is set. Set one under Page in the right-hand panel (with nothing selected) to check text sizes and export at 300 or 600 dpi.</p>
        )}
        <h2>Attribution</h2>
        {credits.length ? (
          <>
            <p className="hint">These icons require credit. Add this text to your figure legend or acknowledgements. It is also stored inside the SVG.</p>
            <textarea readOnly rows={Math.min(6, credits.length + 1)} value={creditText} aria-label="Attribution text" />
            <button className="btn small" onClick={copyCredits}>
              <Icon name="copy" size={14} /> Copy
            </button>
          </>
        ) : (
          <p className="hint">Nothing to credit: every icon in this figure is public domain.</p>
        )}
      </section>
    </Modal>
  )
}

// ---------- import an SVG icon ----------

const LICENCES = ['CC0-1.0', 'CC BY 4.0', 'CC BY-SA 4.0', 'CC BY-NC 4.0', 'MIT', 'Other']

export function ImportIconDialog() {
  const [parsed, setParsed] = useState<ParsedSvg | null>(null)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [author, setAuthor] = useState('')
  const [licence, setLicence] = useState('CC BY 4.0')
  const [otherLicence, setOtherLicence] = useState('')
  const [source, setSource] = useState('')

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setError('')
    setParsed(null)
    try {
      if (file.size > 2_000_000) throw new Error('This file is larger than 2 MB. Simplify the SVG before importing it.')
      const result = parseSvgFile(await file.text())
      setParsed(result)
      setName(file.name.replace(/\.svg$/i, '').replace(/[-_]+/g, ' '))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'This file could not be imported.')
    }
  }

  const add = () => {
    if (!parsed) return
    const id = `custom-${uid()}`
    addCustomIcon({
      id,
      name: name.trim() || 'Imported icon',
      category: 'Imported',
      tags: [],
      viewBox: parsed.viewBox,
      body: parsed.body,
      license: licence === 'Other' ? otherLicence.trim() : licence,
      author: author.trim(),
      source: source.trim(),
    })
    addIcon(id)
    close()
    toast('Icon imported and placed on the page')
  }

  return (
    <Modal title="Import an SVG icon" onClose={close}>
      <p className="hint">
        Use icons from open collections such as Bioicons, NIH BioArt or Servier Medical Art, or your own drawings. The licence you enter here is used to
        build the attribution text when you export.
      </p>
      <input type="file" accept=".svg,image/svg+xml" aria-label="Choose an SVG file" onChange={(e) => onFile(e.target.files?.[0])} />
      {error && <p className="error">{error}</p>}
      {parsed && (
        <div className="import-form">
          <svg className="import-preview" viewBox={`0 0 ${parsed.viewBox[0]} ${parsed.viewBox[1]}`} dangerouslySetInnerHTML={{ __html: prefixIds(parsed.body, 'preview') }} />
          <div className="import-fields">
            <label className="field">
              <span className="field-label">Name</span>
              <input type="text" className="text-line" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">Author or collection</span>
              <input type="text" className="text-line" value={author} placeholder="e.g. Servier Medical Art" onChange={(e) => setAuthor(e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">Licence</span>
              <select value={licence} onChange={(e) => setLicence(e.target.value)}>
                {LICENCES.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </label>
            {licence === 'Other' && (
              <label className="field">
                <span className="field-label">Licence name</span>
                <input type="text" className="text-line" value={otherLicence} onChange={(e) => setOtherLicence(e.target.value)} />
              </label>
            )}
            <label className="field">
              <span className="field-label">Source (web address)</span>
              <input type="url" className="text-line" value={source} placeholder="https://…" onChange={(e) => setSource(e.target.value)} />
            </label>
            <p className="hint">{extractColors(parsed.body).length} recolourable colours found. Scripts, links and embedded images were removed.</p>
            <button className="btn primary" onClick={add}>
              <Icon name="plus" size={16} /> Add to this figure
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ---------- help ----------

const SHORTCUTS: [string, string][] = [
  ['Ctrl/⌘ Z', 'Undo'],
  ['Ctrl/⌘ Shift Z', 'Redo'],
  ['Ctrl/⌘ C / V / X', 'Copy, paste, cut'],
  ['Ctrl/⌘ D', 'Duplicate'],
  ['Ctrl/⌘ G / Shift G', 'Group, ungroup'],
  ['Ctrl/⌘ A', 'Select everything'],
  ['Ctrl/⌘ S', 'Save figure file'],
  ['Delete', 'Delete selection'],
  ['Arrow keys', 'Nudge (Shift: 10 px)'],
  ['Space + drag', 'Move the view'],
  ['Ctrl/⌘ + scroll, or pinch', 'Zoom'],
  ['Ctrl/⌘ 0', 'Fit page to window'],
  ['] and [', 'Bring to front, send to back'],
  ['Arrow keys with nothing selected, or Page Down / Page Up', 'Next slide, previous slide'],
]

export function HelpDialog() {
  return (
    <Modal title="How to use BioSketch" onClose={close} wide>
      <div className="row wrap">
        <button
          className="btn primary"
          onClick={() =>
            void tourDoc().then(async (doc) => {
              if (!doc) return
              await newFigure(doc)
              close()
            })
          }
        >
          <Icon name="slides" size={16} /> Open the tour of the features
        </button>
        <p className="hint">Twelve slides with examples to try. It opens as a new figure; your own figures stay as they are.</p>
      </div>
      <div className="help-grid">
        <section>
          <h2>Basics</h2>
          <ul className="help-list">
            <li>Tap an icon in the library to place it, or drag it onto the page.</li>
            <li>Drag the corner handles to resize, the round handle to rotate. Hold Shift to change proportions or snap rotation.</li>
            <li>Double-tap a label to edit it. In labels, Ca^{'{2+}'} gives a superscript, H_{'{2}'}O a subscript, *italic* and **bold**.</li>
            <li>Select several objects to resize or turn them together. Pink lines appear when an object lines up with another.</li>
            <li>Double-tap one object in a group to select it alone. “Split into parts” does the same for the pieces of an icon.</li>
            <li>“Reshape” shows the points of an icon’s outline: drag them to change its shape. The sliders set how thick lines and outlines are.</li>
            <li>The library holds publicly available collections: NIH BioArt, Bioicons and Servier Medical Art. Choose one under “Collection”, or type in the search box to look through all of them. Icons marked CC BY need a credit, which the export writes for you.</li>
            <li>“Objects” at the bottom of the right-hand panel lists everything on the page: select, rename, hide or lock from there.</li>
            <li>“Divide the page into panels” adds lettered frames to line things up in. The frames are guides and are left out of exports.</li>
            <li>With a keyboard: click the page, then Tab moves from object to object, the arrow keys move it (Shift for bigger steps), Enter edits a text.</li>
            <li>With the arrow tool, drag from one icon to another. Attached arrows follow their icons, and can be straight, curved or right-angled.</li>
            <li>Lock a background so it stays put; “Unlock all” is in the right-hand panel when nothing is selected.</li>
            <li>File › Import a pathway finds a pathway on WikiPathways (or opens a .gpml file) and redraws it as boxes and arrows you can change.</li>
            <li>Drag in or paste your own pictures. File › My figures keeps every figure you have made in this browser.</li>
            <li>With the text tool, a press places a label and a drag draws a text box, which breaks its lines at its width and can have bullet points. “Table” under “Add to the page” adds a table you can paste from a spreadsheet.</li>
            <li>File › Start from a template has a timeline, a workflow, a graphical abstract and posters. File › My figures can file your figures under projects. The star on an icon of the library keeps it under “Favourites”.</li>
            <li>
              “Slides” in the top bar shows the slides of the figure under the page: add, copy, move and delete them there. With nothing selected, the arrow keys open the next and the previous slide. “Present” shows them full screen: the arrow keys or a
              press move on, Escape goes back. Export can save all slides as one PDF or one PowerPoint file. The button beside “+” has slide layouts and your own saved slide templates; notes for the
              speaker are typed under “Page”, and an object can be made to appear on a press of its own (under “Arrange”).
            </li>
            <li>With the membrane brush, draw a line. Finish near the start to close it into a cell.</li>
            <li>Sketch with the pen, then use “AI” to turn the sketch into a clean figure, or to change a figure you already have.</li>
          </ul>
          <h2>Touch and Apple Pencil</h2>
          <ul className="help-list">
            <li>Two fingers: move and pinch-zoom the page.</li>
            <li>After you use the Pencil, one finger moves the page while a drawing tool is active.</li>
            <li>Your palm is ignored while the Pencil is drawing.</li>
          </ul>
        </section>
        <section>
          <h2>Tools</h2>
          <table className="keys">
            <tbody>
              {TOOLS.map((t) => (
                <tr key={t.tool}>
                  <td>
                    <kbd>{t.key}</kbd>
                  </td>
                  <td>{t.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h2>Shortcuts</h2>
          <table className="keys">
            <tbody>
              {SHORTCUTS.map(([k, v]) => (
                <tr key={k}>
                  <td>
                    <kbd>{k}</kbd>
                  </td>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </Modal>
  )
}
