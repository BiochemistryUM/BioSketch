# BioSketch

An open-source editor for drawing biological processes: signalling pathways, cells, experimental
schemes. It runs in the browser, works on an iPad with Apple Pencil, and needs no account or server.

## What it does

- **Icon library**: about 280 original icons (cell types and cell states, microbes and viruses, tissue structures, organelles and cytoskeleton, membrane structures and
  junctions, membrane proteins, proteins and molecules, nucleic acids, lab equipment, and figure
  helpers such as regulation arrows, markers and small plot symbols). Search, tap to place, recolour any part.
- **Biology-aware tools**
  - Membrane brush: draw a line and get a lipid bilayer; close the line to make a cell.
  - Arrows for activation, inhibition, association and reversible steps. Arrows attach to icons
    and follow them when moved; they can be curved and labelled.
- **Sketch and AI**: sketch with a pen, finger or mouse, then let AI rebuild the sketch from
  library icons, boxes and arrows. Or describe a process in words. The result is a normal,
  editable figure, not an AI-generated image.
- **Editing**: move, resize, rotate, flip, group, align, distribute, reorder, copy and paste,
  undo and redo, snap to grid.
- **Export**: SVG (vector, editable in Inkscape or Illustrator) and PNG up to 4× resolution, with
  optional cropping and transparent background. The attribution text for licensed icons is built for you.
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
- The built-in icons were drawn for this project and are released as CC0 (public domain): figures
  made only with them need no attribution.
- Icons you import keep their own licence. Enter it when importing; BioSketch then lists the
  required credits in the export window and stores them inside the exported SVG.

## Limitations

- The built-in library is small. Importing open collections in bulk is the main next step.
- No PDF export yet (convert the SVG in any vector program).
- No shared editing; one figure at a time is kept in the browser (use File › Save for more).
- Imported SVGs keep only hex colours recolourable, and embedded bitmap images are removed.

## For contributors

`CLAUDE.md` describes the architecture, the decisions behind it and the rules for changes. It is
written for AI coding assistants and is just as useful for people.
