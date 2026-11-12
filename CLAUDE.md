# BioSketch: instructions for AI assistants

This file is read automatically by Claude Code at the start of every session. It is the standing
brief for anyone (human or AI) working on the project. Keep it short and current: when a decision
changes, change it here in the same piece of work.

## What this is

BioSketch is an open-source, browser-based editor for drawing biological processes (pathways,
cells, experimental schemes), in the spirit of BioRender. It runs entirely in the browser, works on
an iPad with Apple Pencil, and can turn a hand sketch or a description into an editable figure with AI.

The people using it are life scientists, not designers or programmers. Every label, message and
default should make sense to a biologist who has never seen the code.

## Working agreement

- The owner wants autonomous work: make reasonable decisions yourself and keep going until the task
  is finished. Do not stop to ask about choices that have a sensible default; note the choice in
  your final summary instead.
- Ask first only for things that cannot be undone or that reach outside this folder: deleting user
  files, publishing, pushing to a remote, adding a paid service, or needing access to another folder.
- Finish every task with a review: run the checks below, try the change in a real browser, and
  report honestly what was verified and what was not.
- Git: commit only when the owner asks, and never push without being asked. The repository has no
  remote. Commits use a placeholder author set for this repository only (`git config user.name` /
  `user.email`); the owner should set a real one before publishing.

## Definition of done

A change is done when all of these hold:

1. `npm run typecheck`, `npm test` and `npm run build` pass.
2. The feature was exercised by hand in the browser (`npm run dev`), including on a tablet-sized
   viewport when it touches input or layout.
3. New logic in `src/model`, `src/io`, `src/icons` or `src/ai` has tests.
4. What is drawn on the canvas matches what is exported (they share one renderer; keep it that way).

## Decisions already made (do not re-open without a reason)

| Decision | Why |
|---|---|
| Web app: TypeScript, React, Vite, zustand | One codebase for desktop and iPad; largest contributor pool. |
| The figure is SVG, rendered by React as real SVG elements | Icons are SVG; export is exact and stays editable in Inkscape/Illustrator. |
| One renderer (`src/render/DocNodes.tsx`) for canvas and export | Guarantees what you see is what you export. |
| The document is plain JSON (`src/model/types.ts`), all edits are pure functions | Easy to test, save, undo, and to generate with AI. |
| No server, no accounts. Figures autosave in the browser (IndexedDB) | Zero hosting cost, private by default, works offline. |
| AI returns a structured "scene" (icon ids, positions, arrows), never images or SVG | Output stays editable, uses attributed library icons, and avoids journal bans on AI-generated images. |
| AI works two ways: copy-paste through the user's own Claude app (default, no key, no cost), or the user's Claude API key called from the browser | No backend to run or pay for. The owner does not want to pay for API credit, so the copy-paste route (`src/ai/bridge.ts`) must keep working and stay the default. Both routes share one prompt and one scene format. |
| Built-in icons are original and CC0 | A figure made with them needs no attribution. Imported icons carry their licence, and export builds the credit text. |
| Not built on tldraw or Excalidraw | tldraw is not open-source licensed; Excalidraw is hand-drawn style and treats SVG as flat images. |

## Safety rules for this codebase

- Icon markup is injected into the page as HTML. Anything not from `src/icons/library.ts` must go
  through `parseSvgFile` or `sanitizeBody` (`src/icons/svg.ts`) first. Never bypass this.
- Files, pasted data and AI answers are untrusted: they pass through `validateDoc`
  (`src/io/files.ts`) or `parseScene` (`src/ai/scene.ts`), which rebuild every field.
- Never put an API key in the code, the repository, a test or a log.

## Map of the code

- `src/model/` figure data and geometry (no React, no browser APIs): `types`, `geometry`, `nodes`
  (boxes, resize, connectors), `doc` (group, align, reorder, copy), `connector`, `membrane`.
- `src/render/DocNodes.tsx` draws nodes as SVG, for both canvas and export.
- `src/canvas/` pointer input (mouse, touch, pen), selection handles, in-place text editing.
- `src/ui/` panels, top bar, dialogs. `src/actions.ts` commands. `src/store.ts` state and undo.
- `src/icons/` built-in library (`library.ts` core set, `pack-*.ts` themed packs, `draw.ts` shared
  palette and helpers) and SVG import/recolour/sanitise (`svg.ts`).
- `src/io/` export (SVG/PNG/attribution), file validation, autosave.
- `src/ai/` scene format, prompt, and the Claude API call.
- `tests/` unit tests (vitest + jsdom). `public/` web manifest, service worker, app icons.

## Conventions

- British/neutral scientific English in the interface; sentence case; plain words over jargon.
- Touch targets at least 40 px on touch devices; nothing may depend on hover, right-click or a keyboard.
- New icons follow the style notes at the top of `src/icons/library.ts`.
- Prefer a small pure function plus a test over logic inside a React component.
- When using the Claude API, check current model names and request shapes before editing
  `src/ai/client.ts`; they change between model generations.

## Known gaps (good next tasks)

- Icon library has about 280 icons. Every subject marked "Draw" in the wish list is done; what remains
  there is marked "Import" (organs, animals, complex instruments), which needs the open collections. `docs/icon-wishlist.md` lists what to draw next,
  group by group; new groups go in their own pack file like `src/icons/pack-proteins.ts`. Draw from
  the biology, never from another collection's artwork. The other lever is a script that imports
  open collections (Bioicons, NIH BioArt, Servier Medical Art, Reactome) with their licence metadata.
- No multi-select resize/rotate, no smart alignment guides, no multi-page documents.
- No PDF export (SVG converts to PDF in any vector tool).
- AI: the API-key route was tested with recorded answers only, never against the live API. The
  copy-paste route was tested end to end in the browser with hand-written answers, not yet with a
  real reply from the Claude app.
- Not yet tested on a physical iPad; touch and pen were tested with simulated pointer events.
- No real-time collaboration (Yjs is the planned route if needed).
- Objects on the canvas cannot be selected or moved with the keyboard alone (panels and dialogs can).
- Grouped objects cannot be resized together; ungroup first.

## Things that bit us once (keep them fixed)

- Offline: hosts add `Vary` headers, so the service worker must look up saved files with
  `ignoreVary` (`public/sw.js`). Test offline by stopping the server and reloading the built app.
- When shipping a new version, bump the cache name in `public/sw.js` and `src/main.tsx` together.
- Dialogs must not re-run their focus effect on every render (`Modal` in `src/ui/Dialogs.tsx`),
  or typing in a dialog loses focus after each key.
- React StrictMode runs effect clean-ups early in development: clean-up code must be safe to run twice
  (see `save` in `src/canvas/TextEditor.tsx`).
- Node ids end up inside icon markup; `validateDoc` only accepts plain identifiers. Keep it that way.
