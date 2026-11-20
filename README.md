# BioSketch

An open-source editor for drawing biological processes: signalling pathways, cells, experimental
schemes. It runs in the browser, works on an iPad with Apple Pencil, and needs no account or server.

**Try it in your browser: <https://biochemistryum.github.io/BioSketch/>** (nothing to install; your
figures stay on your own computer).

## What it does

- **Icon library**: 2,499 icons from three publicly available collections, in 26 themed sets.
  [NIH BioArt Source](https://bioart.niaid.nih.gov) (763, public domain, drawn by NIAID's
  medical illustrators: cells and organelles, molecules and proteins, viruses and microbes,
  arthropods, anatomy, animals, people, lab equipment, shapes), [Bioicons](https://bioicons.com)
  (438, public domain CC0) and [Servier Medical Art](https://smart.servier.com) (1,298, CC BY 3.0:
  organs and anatomy, blood and immunity, cell parts, receptors, microbes, animals). Choose a set
  under "Collection", or type in the search box to look through all of them; tap to place,
  recolour any part. Servier icons are marked "CC BY 3.0" and the export writes the credit they
  need. A set is fetched the first time it is opened or a search finds something in it.
  BioSketch has no icons of its own: the 353 drawings it used to offer were removed in favour of
  these collections. A figure made with them still opens, with a placeholder where each was.
- **Biology-aware tools**
  - Membrane brush: draw a line and get a lipid bilayer; close the line to make a cell.
  - Arrows for activation, inhibition, association and reversible steps, ending in a head, a flat
    bar, a round dot or nothing. Arrows attach to icons and follow them when moved; they can be
    straight, curved or right-angled, with a movable label, and a line can fade in or fade out
    along its length. Lines and outlines can be solid, dashed, dotted, long-dashed or dash-and-dot,
    with the size of the dashes adjustable.
  - Nine shapes: rounded box, box, ellipse, triangle, diamond, hexagon, cylinder, callout and
    bracket. Arrows meet each one at its real outline.
  - Shapes can hold text: double-tap a shape and type, or tick "Type text inside after drawing"
    in the shape tool. Long lines break to fit the shape, the text can
    sit left, centre or right in any of the three font types, and it stays in place when the shape
    is moved or resized.
- **Charts from your numbers**: add a chart, paste a table and get bars, dots, a box plot, a violin
  plot, a line or an XY scatter chart. Bars, dots and lines show the mean with SD or SEM error
  bars; every value can be shown as a dot. A second row of names makes a grouped chart with a
  legend; a scatter chart can draw a fitted straight line. The range of each axis can be set, or
  made logarithmic, and significance brackets take the label you type. The numbers stay in the
  figure, so the chart can be changed later, and it is exported as real shapes and text. The
  panel says what it could not read from a pasted table (cells that are not numbers, a table
  larger than a chart takes, commas that could mean two things) instead of guessing silently.
  Definitions are the common defaults and are checked against R: quartiles by linear
  interpolation, whiskers to the furthest value within 1.5 box lengths, a Gaussian density with
  the rule-of-thumb bandwidth for violins, least squares for the fitted line.
- **Labels**: superscript, subscript, italic and bold inside one label (`Ca^{2+}`, `H_{2}O`,
  `*GPX4*`), three font types, any size and colour. A symbol picker puts Greek letters, arrows,
  maths signs and marks (α, µ, →, ±, °) into a label or a shape with one tap.
- **Sketch and AI**: sketch with a pen, finger or mouse, then let AI rebuild the sketch from
  library icons, boxes and arrows; describe a process in words; or ask it to change a figure you
  already have. The result is a normal, editable figure, not an AI-generated image. The AI can
  describe its plan and ask questions before it builds ("Plan first"), it tells you which choices
  it made (for example what it used where the library has no icon), and BioSketch checks the
  layout itself, moving apart anything that would lie on top of something else.
- **Editing**: move, resize, rotate, flip, group, lock, align, distribute, reorder, copy and paste,
  undo and redo, snap to grid, and guides that line objects up with each other. Several objects
  can be resized or turned together. Sliders set the thickness of arrows and outlines.
- **Objects list**: everything on the page by name; select what sits behind something else,
  rename, hide or lock.
- **Keyboard**: with the page focused, Tab moves from object to object, the arrow keys move the
  selection, Enter edits a text.
- **Icons you can take apart**: recolour any part of an icon, change its transparency and the
  thickness of its outlines, split it into pieces, or reshape it by dragging the points of its
  outline.
- **Your own pictures**: drop in micrographs or plots (PNG, JPEG, WebP, GIF) and add panel letters.
- **Panels**: divide the page into two to six lettered panels. The frames are guides to line
  things up in and are left out of exports.
- **Slides and presenting**: a figure can have several slides, each with its own page colour and
  notes for the speaker. "Present" shows them full screen (arrow keys or a click move on), with a
  view for the speaker (notes, time, what comes next) and a second window for the projector.
  Objects can appear one by one. New slides can begin with a layout or with a slide template of
  your own. All slides are exported as one PDF, one PowerPoint file, or pictures in a ZIP file.
- **Text boxes and tables**: a text box breaks its lines at the width you give it and can have
  bullet points; a table takes cells pasted from a spreadsheet.
- **Templates**: File › Start from a template has a tour of the features, an experimental
  timeline, a workflow, a graphical abstract and A0 posters.
- **Several figures**: every figure is kept in the browser under File › My figures, and can be
  filed under a project. Figures are saved on your own computer only: nobody else sees them.
- **Light and dark theme**: File › Dark theme.
- **Export**: SVG (vector, editable in Inkscape or Illustrator), PDF (vector, through the print
  window), PowerPoint (one slide with the figure as a sharp picture) and PNG, with optional
  cropping and transparent background. Set a printed width
  (85, 114 or 174 mm, or your own) to export at 300 or 600 dpi and to be warned when text would
  print smaller than 5 pt. The attribution text for licensed icons is built for you.
- **Your own icons**: import SVG files from open collections (Bioicons, NIH BioArt, Servier Medical
  Art) with their licence; imported files are cleaned of scripts and external links.
- **Private and offline**: figures are saved automatically in your browser. Nothing is uploaded,
  except your sketch or description when you choose to use the AI.

## Run it

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173. To use it from an iPad on the same Wi-Fi, open the "Network" address
that the command prints.

Other commands: `npm test` (unit tests), `npm run typecheck`, `npm run build` (static site in `dist/`,
which can be hosted on any static host such as GitHub Pages).

## On an iPad

Open the hosted site in Safari, then Share › Add to Home Screen. It then opens full-screen and
works offline.

- Apple Pencil draws; pressure changes the stroke width.
- Two fingers move and zoom the page.
- Once the Pencil has been used, one finger moves the page while a drawing tool is active, and
  your palm is ignored while the Pencil is down.
- Double-tap a label to edit it; handwriting (Scribble) works in the text box.

## Using the AI

Open **AI** and choose "From my sketch" or "From a description". There are two ways to reach Claude:

- **Claude app (no key, no extra cost).** BioSketch writes the request for you. Copy it, paste it
  into the Claude app or claude.ai (adding the sketch image when you start from a sketch), then
  paste Claude's answer back into BioSketch. This uses the Claude plan you already have.
- **API key (one click).** Paste a Claude API key (create one at console.anthropic.com). API usage
  is billed per request by Anthropic and is separate from a Claude subscription. The key stays in
  your browser and is sent only to Anthropic. Do not store it on a shared device.

## Icons and licences

- The code is MIT licensed (see `LICENSE`).
- The "NIH BioArt" collections come from [NIH BioArt Source](https://bioart.niaid.nih.gov) and
  hold only entries it marks as public domain: figures made with them need no attribution
  (NIH appreciates a citation). Each icon keeps its illustrator's name and the address of its
  entry. The AI builds figures from these collections only.
- The "Bioicons" collections hold only icons their authors released as CC0 through
  [Bioicons](https://bioicons.com), so they need no attribution either. Each icon keeps its
  author's name in the pack file. Logos and drawings that show a maker's name were left out.
- The "Servier" collections are [Servier Medical Art](https://smart.servier.com), taken from the
  CC BY 3.0 folder of Bioicons. A figure that uses one must credit Servier: the export window
  lists the credit, with the licence link and "adapted" when the icon was changed, and the
  exported SVG carries it too.
- Icons you import keep their own licence. Enter it when importing; BioSketch then lists the
  required credits in the export window and stores them inside the exported SVG.

## Limitations

- The library is as complete as the three collections are. Not every subject has an icon, and the
  collections are in different hands, so icons from two of them can look unlike each other in
  one figure. From NIH BioArt, drawings with an embedded photo or texture and very large scenes
  were left out (about 140 of 957 entries).
- PDF export goes through the browser's print window. Chrome sets the page to the figure's size;
  Safari may put the figure on a standard sheet of paper instead.
- Reshaping moves the points an outline passes through; curve handles follow their point and
  cannot be set separately, and points cannot be added or removed. Icons with more than 400
  points have to be split first.
- A PowerPoint slide holds the figure as one picture; it cannot be edited shape by shape there.
- No shared editing. Figures live in one browser on one device (use File › Save figure file to
  move them).
- Imported SVGs keep only hex colours recolourable, and bitmap images embedded in them are removed.

## Adding icon collections

`scripts/import-icons.mjs` turns a folder of SVG files into an icon pack that appears as an extra
chip in the icon library:

```bash
node scripts/import-icons.mjs path/to/svgs --id my-pack --name "My pack" --licence "CC BY 4.0" --author "Their name" --source "https://example.org"
```

Every file is cleaned the same way as an icon imported in the app. Files with an embedded bitmap
or larger than 300 kB are skipped. Only use collections whose licence allows redistribution, and
record the licence: it becomes the credit line on export.

The NIH BioArt collections are built by `scripts/bioart.mjs`, which downloads every entry of
[NIH BioArt Source](https://bioart.niaid.nih.gov) with its licence and illustrator, measures each
drawing in headless Chrome so that it can be cut to size, and writes the packs:

```bash
node scripts/bioart.mjs fetch path/to/work-folder
node scripts/bioart.mjs crops path/to/work-folder
node scripts/bioart.mjs build path/to/work-folder
```

The Bioicons and Servier collections are built by a second script from a copy of the
[Bioicons repository](https://github.com/duerrsimon/bioicons):

```bash
node scripts/bioicons.mjs path/to/bioicons/static/icons cc0
node scripts/bioicons.mjs path/to/bioicons/static/icons servier
```

It sorts the folders into themed packs, tidies names, leaves out logos, and crops a few drawings
that sit in a corner of a large page. The CC BY 4.0 and share-alike folders of Bioicons are not
imported.

## For contributors

`CLAUDE.md` describes the architecture, the decisions behind it and the rules for changes. It is
written for AI coding assistants and is just as useful for people.
