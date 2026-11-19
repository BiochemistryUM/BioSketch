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
| No server, no accounts. Figures autosave in the browser (IndexedDB), several at a time (File › My figures) | Zero hosting cost, private by default, works offline. |
| Label formatting is a few typed marks (`^{}`, `_{}`, `*…*`, `**…**`) parsed in `src/model/richtext.ts` | Works in any text box, on any keyboard, and in AI answers. Lone stars stay literal because significance marks (`*`, `***`) are everywhere in biology. |
| PDF export uses the browser's print window, not a PDF library | Exact rendering and embedded fonts with no extra code to ship. |
| An icon is taken apart by splitting it into pieces (`src/icons/split.ts`), each a small icon of its own | Reuses move, resize, recolour and delete; no path editor to build or maintain. |
| Reshaping moves the points of an icon's paths (`src/icons/path.ts`, `reshape.ts`); the icon is first copied into the figure with shapes turned into paths and arcs into curves | The library icon and other copies stay as they were. Point positions are read from the drawn icon (`getScreenCTM`), so size, turn, flip and inner groups need no maths of our own. Curve handles follow their point; there is no handle editing and no adding or removing points. |
| Panel frames are "guides" (`guide: true`): drawn on the page, skipped by the renderer for exports | The only deliberate difference between page and export, besides selection handles. Hidden objects (`hidden: true`) are skipped everywhere. |
| PowerPoint export writes the .pptx by hand (`src/io/pptx.ts`: a stored ZIP and a dozen XML parts) with the figure as SVG plus PNG fallback | No library to ship; the picture stays vector in PowerPoint 2016+. Checked by opening a generated file in PowerPoint. |
| Icon packs carry every icon's name in `public/icon-packs/index.json` | One search finds icons in packs that are not fetched yet; a pack is fetched when opened or when a search hits it. |
| The "Flat cartoon" look is chosen per figure (`iconStyle`). Eight icons are composed by hand for it (`src/icons/flat.ts`: cell, nucleus, mitochondrion, bacterium, virus, receptor, antibody, DNA); every other built-in icon is redrawn by rule from its outlined drawing (`redrawFlat` in `src/icons/style.ts`): each filled shape becomes three flat tones of one vivid colour cut by two clip paths (`solid`), each thick line a shaded tube (`tubeOf`), outlines go, white and grey parts keep an edge | One set of drawings gives both looks, and the rules are the same ones the hand-composed icons use, so they match. `getIcon` returns the styled icon, so recolour, split and reshape work on it. No gradients, masks or opacity: plain hex colours only. All drawings are original: a reference video was looked at for general traits only; never copy a studio's characters or artwork. |
| An arrow's end is part of its `kind` (`arrow`, `inhibit`, `dot`, `line`, `double`); a fading line (`fade: 'in' \| 'out'`) is one SVG linear gradient per arrow, set between its two end points, used by the line and its end mark alike (`fadeStops`, `connectorShape` in `src/model/connector.ts`) | One list of arrow types in the panel, the file format and AI answers. The gradient is the only one BioSketch draws (icons stay plain colours); it is plain SVG, so exports keep it. A fading line stops where its head, bar or dot begins (`flush`), because two see-through shapes on top of each other show as a darker patch. AI answers can ask for a `dot` end but not for fading. |
| Text inside a shape is part of the shape (`label` on a shape node), drawn by the label renderer through `shapeLabelNode` (`src/model/nodes.ts`) and typed in place with the same editor as a text label. Lines are broken to fit the shape when it is drawn (`wrapText`); the figure stores the text as typed | One object to move, resize and turn, and the words stay in place. It reuses label formatting, measuring and export, so there is no second text engine. Boxes built by the AI and the example figures are made this way too. Figures from before have a box grouped with a separate label: that still works, a double-tap on such a box types in its label (`labelPartner`), and both kinds are read as the box's label when a figure is shown to the AI. |
| Rectangles, rounded rectangles and ellipses are SVG's own elements; every other shape kind (triangle, diamond, hexagon, cylinder, callout, bracket) is one path from `shapePath` in `src/model/shapes.ts`, which also says where an arrow meets the outline (`outlineAlong`) and where the words inside go (`shapeTextArea`) | Old figures and exports are unchanged, and a new kind is added in one file: its path, and its corners if arrows should follow slanted sides. A bracket is an open line and is never filled. |
| A chart is an object of its own (`chart` node) that keeps its numbers; `src/model/chart.ts` reads the pasted table (plain, grouped with a second row of names, or scatter with x in the first column), builds the axes (range set by hand, logarithmic) and lays out every bar, box, violin, point, tick, legend entry, bracket and word, and the renderer only draws that list | The chart stays editable and looks the same on the page and in every export, with real text. Its words go through the label renderer, so the usual marks work. No charting library. The AI neither sees nor makes charts. |
| Chart statistics live in `src/model/chartStats.ts` and follow stated, common defaults: quartiles by linear interpolation (R `quantile` type 7), Tukey whiskers at 1.5 × IQR with outliers as rings, a Gaussian kernel density with Silverman's rule-of-thumb bandwidth (R `bw.nrd0`) for violins, ordinary least squares for fitted lines. Tests pin each to values from R | Scientists publish these plots, so a definition must be one they can name in their methods, and a wrong number is worse than a missing feature. Anything added later must be pinned to a reference in the same way. |
| Statistical tests (`src/model/chartTests.ts`, distributions in `src/model/distributions.ts`) cover one factor: two or several groups, separate or paired samples, means or ranks, eight tests in all (Welch t, paired t, Mann–Whitney, Wilcoxon signed-rank, one-way ANOVA, repeated-measures ANOVA, Kruskal–Wallis, Friedman). With several groups pairs follow: Tukey after a one-way ANOVA for every pair, otherwise the two-group test of the same family with Holm's correction (after a one-way ANOVA: t tests with pooled scatter). All two-sided, each the default of R's function of the same name, pinned to R 4.4 through `tests/stats-reference.json`, which `scripts/stats-reference.R` writes | One named method per design, so a scientist can copy it into the methods. No statistics library: the distributions are a few hundred lines and every one is checked against R. |
| A chart stores only the choices for its test (`test`: means or ranks, paired, each with the first group, stars) and which brackets follow it (`auto`); p values are worked out from the numbers every time the chart is drawn (`chartAnalysis`, `bracketLabel` in `src/model/chart.ts`, remembered per table) | A stored p value goes stale the moment the table is edited. The page, the panel and every export show the same result because they share the layout. |
| The panel suggests a test for every table (`suggest` in `chartTests.ts`, `chartAdvice`): the scientist says whether rows are the same sample and which pairs to compare; the design picks the family; means are suggested unless a Shapiro–Wilk test on the residuals gives p below 0.05, then ranks. The box says what the test does, why it fits this table, and what to keep in mind (few values, a rank test that cannot reach 0.05, very unequal scatter, rows left out) | The owner asked for a suggestion with an explanation for every table. It is advice in words, worked out in the browser, with no AI request; the scientist chooses the test. |
| The look of a chart's points belongs to the group: a shape (`shape`: circle, square, triangle, diamond, each covering the area of the circle it replaces, `pointPath`), and a size and transparency that overrule the chart's (`pointSize`, `pointOpacity` on the chart for all points, on a group for its own). The legend shows the mark for charts made of points and a colour square for bars, boxes and violins; it stands at the right unless `legend` says above, below, inside or hidden | Asked for by the owner, first for all points, then per group (a volcano plot wants faint small grey points and bold coloured ones). Transparency is SVG `fill-opacity`, so every export keeps it. |
| Dashed lines at chosen values are `refLines` on the chart (along the value axis; along x too in a scatter chart; dashed, dotted or solid, with a label), and the axis reaches them. A scatter chart writes a name beside a point when the table has a column of words before the x values (`labels` on the group, at most 100 on a chart, each placed right, left, above or below its point where no earlier name stands) | What a volcano plot needs besides points: thresholds and gene names. Names come from the table, not from clicking points, so they survive pasting new numbers. `usableRefLines` decides what is drawn and what is saved. |
| Groups without a colour of their own take one from the chart's palette (`palette`, `src/model/palettes.ts`): BioSketch's own, four colour-blind-friendly ones (Okabe–Ito, Tol bright, Viridis, Greys) and five common ones (Tableau 10, Matplotlib, ColorBrewer Set 1, Set 2, Dark 2). Choosing a palette clears the groups' own colours | The values are copied from their sources (R's `palette.colors` and `viridisLite`, matplotlib, Paul Tol), so a palette can be named in a legend. Only the four published as colour-blind safe are called so. |
| A table can be read from a file (`src/io/tables.ts`): CSV, tab-separated or plain text in UTF-8, UTF-16 or the Windows character set, and the first sheet of an Excel workbook (.xlsx), which is unpacked by hand (the ZIP's list of files, the browser's `DecompressionStream`, three XML parts). The result is the same text that could have been pasted and goes through `readTable` | Biologists keep their numbers in Excel. No library to ship, like the PowerPoint export. A file is as untrusted as the clipboard: size limits before and after unpacking, XML parsed as data, and every value still passes `readTable` and `validateDoc`. |
| The instruction box of a chart (`src/model/chartCommands.ts`, `applyInstruction`) reads set phrases in the browser: no AI, no request, the same result for the same words. It cuts the text into clauses; each reader takes its phrase out and makes its change; words left over that are not small talk are reported. It only sets what the panel can set, and one Undo takes an instruction back | The owner asked for a box where the scientist describes a change ("upright dotted line at x = 2", "fit a regression line"). A phrase reader costs nothing, works offline and never invents a setting; the price is a fixed vocabulary, so it must say what it did not understand, word for word, and never guess. The copy-paste AI route stays the place for open-ended requests. |
| A line that is not solid keeps `dashed: true`, with `dashStyle` (dotted, long, dash-and-dot; absent = plain dashes) and `dashScale` beside it (`src/model/dash.ts`) | Figures saved before the styles existed open unchanged, and AI answers keep their simple `dashed` yes/no. Dots are near-zero dashes that only show with round line ends, so the renderer rounds the ends whenever a pattern has dots. |
| AI returns a structured "scene" (icon ids, positions, arrows), never images or SVG | Output stays editable, uses attributed library icons, and avoids journal bans on AI-generated images. |
| The AI complements the request in three ways, none of which costs an extra request: "Plan first" (the request asks Claude to describe its plan and ask questions in the chat before it answers with the figure; Claude app route only), `notes` in the scene (assumptions, stand-ins for missing icons, open questions, shown after building), and a layout check done by BioSketch itself (`tidyScene` in `src/ai/layout.ts`: plain geometry that moves elements back onto the page and apart) | Looked at how other tools do it (planning agents, self-checking renderers) and kept what fits a tool with no server and no paid requests. The layout check runs for new figures only: when a figure is changed, the scientist placed those things. |
| A scene has a `frame` element (empty dashed rectangle, any size) besides `box` | A box holds a label and is capped in height; zoomed-in views and marked regions need a container. An empty rectangle on the page is described back to the AI as a frame. |
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

- `src/model/` figure data and geometry (no React, no browser APIs): `types`, `geometry`, `nodes`,
  `describe` (names of objects in words), `panels` (panel layouts),
  (boxes, resize, connectors), `doc` (group, align, reorder, copy), `connector`, `dash` (line
  styles), `shapes` (outlines of the shape kinds), `richtext` (label marks, symbols), `chart`
  (charts from pasted numbers: tables, axes, layout, the groups a test compares), `chartCommands`
  (the instruction box: phrases to settings), `palettes` (colour palettes of charts), `chartStats`
  (quartiles, density, fitted line), `chartTests` (the statistical tests, Shapiro–Wilk, the
  suggestion of a test), `distributions` (t, F, chi-squared, normal, studentized range, exact
  Wilcoxon), `membrane`.
- `src/render/DocNodes.tsx` draws nodes as SVG, for both canvas and export.
- `src/canvas/` pointer input (mouse, touch, pen), selection handles, in-place text editing.
- `src/ui/` panels, top bar, dialogs, the objects list (`ObjectsList.tsx`). `src/actions.ts` commands. `src/store.ts` state and undo.
- `src/icons/` built-in library (`library.ts` core set, `pack-*.ts` themed packs, of which
  `pack-extra.ts` holds pathogens, immune and medical subjects, `pack-organs.ts` organs and
  `pack-organisms.ts` plants and animals, `draw.ts` shared palette and helpers), SVG import/recolour/sanitise (`svg.ts`), splitting an icon into pieces
  (`split.ts`), reshaping point by point (`path.ts` path data, `reshape.ts`) and lazily loaded icon
  packs (`packs.ts`, files in `public/icon-packs/`), and the flat cartoon look (`flat.ts` hand-composed
  icons and the layer helpers, `style.ts` redrawing the other icons by rule).
- `src/io/` export (SVG/PNG/PDF/attribution), PowerPoint files (`pptx.ts`), tables from CSV and Excel files (`tables.ts`), file validation, saved figures (`storage.ts`),
  autosave, placing pictures (`images.ts`). `src/figures.ts` new/open/copy/delete a figure.
- `src/ai/` scene format and prompt (`scene.ts`), the Claude API call (`client.ts`), the copy-paste
  route (`bridge.ts`), changing an existing figure (`revise.ts`), and the layout check on a new
  figure (`layout.ts`).
- `scripts/import-icons.mjs` builds an icon pack from a folder of SVG files. `scripts/bioicons.mjs`
  builds the Bioicons (CC0) and Servier (CC BY 3.0) packs in `public/icon-packs/` from a copy of
  the Bioicons repository. `scripts/stats-reference.R` works out the reference values of the
  statistical tests in R and writes `tests/stats-reference.json` (run it again after changing it).
- `tests/` unit tests (vitest + jsdom). `public/` web manifest, service worker, app icons.

## Conventions

- British/neutral scientific English in the interface; sentence case; plain words over jargon.
- Touch targets at least 40 px on touch devices; nothing may depend on hover, right-click or a keyboard.
- New icons follow the style notes at the top of `src/icons/library.ts`: plain hex colours, an outline
  on every filled shape, tubes as two lines on one path. The flat style relies on exactly that.
- Prefer a small pure function plus a test over logic inside a React component.
- When using the Claude API, check current model names and request shapes before editing
  `src/ai/client.ts`; they change between model generations.

## Known gaps (good next tasks)

- Icon packs (53 MB in `public/icon-packs/`): the CC0 folder of Bioicons (438 icons) and its
  CC BY 3.0 folder, which is Servier Medical Art (1,298 icons, files over 200 kB left out), both
  from commit d29e766 (June 2026). Not imported: Bioicons CC BY 4.0 (885 files, 313 MB) and
  share-alike (39), NIH BioArt, Reactome. Downloading more needs the owner's go-ahead and a
  licence check per collection.
- Loading a pack offline (after it was opened once online) was not tested.
- Not yet tested on a physical iPad; touch and pen were tested with simulated pointer events.
- AI: the API-key route was tested with recorded answers only, never against the live API. The
  copy-paste route works with a real reply from the Claude app for a new figure; changing an
  existing figure was tested with hand-written answers only.
- AI, newer parts: "Plan first", notes and frames were tried with hand-written answers only, not
  with a real reply from the Claude app, so how well Claude follows the two-step wording is not
  known. The API-key route has no "Plan first" (it would take a second paid request). The layout
  check moves whole elements only: it does not resize, re-route arrows, or keep a moved element
  inside its cell or frame, and arrow labels can still sit on something.
- PDF export and the "Copy sketch image" button were not clicked through in testing (they open
  system windows); their page content and data are unit-tested.
- Flat cartoon look: all 353 built-in icons have it, but only eight are composed by hand; the
  rest follow their outlined drawing shape for shape. Thin dark detail lines and scale bars are
  hard to see on a dark page (the phylogenetic tree and pedigree most of all). The owner has not
  yet reviewed the full set, nor the 52 icons drawn from the second survey (organs, plants and
  animals, medical kit).
- A few older icons draw up to 3 units past their frame (receptor dimer, intestinal villus,
  nuclear pore, actin filament, cilium); `tests/library.test.ts` checks the frame only for
  `pack-extra`, `pack-organs` and `pack-organisms`.
- Fading arrows: seen on the page only. The exported SVG is unit-tested, but no exported file
  (SVG in Inkscape or Illustrator, PNG, PDF, PowerPoint) was opened to look at the fade. On a
  curved or right-angled arrow the fade follows the straight line between the two ends, not the
  path. An arrow has one end type: separate marks for the start and the end are not offered
  (only "double" has heads at both ends).
- Text inside a shape: the shape does not grow when the words need more lines than fit, so they
  can run past its top and bottom until it is made taller. A single word wider than the shape is
  not split. Typing in place on a turned shape happens in an upright box, and the box breaks
  lines by the browser's rules, which can differ by a word from the drawn result. Line styles
  were seen on the page only; no exported file was opened to look at dotted or dash-and-dot lines.
- Shapes: arrows meet a cylinder and a bracket at their box, not their curved outline; the
  callout's pointer and the bracket's direction are fixed (turn the shape to change them); the
  AI can only ask for boxes, ovals and frames. The symbol picker is in the side panel only, not
  beside a label being typed in place, and arrow labels have none.
- Charts: no two-way layouts
  beyond category × series, no stacked bars, no curve fitting other than a straight line, no
  confidence band on the fitted line. Choices a reviewer questioned and that stand as stated
  behaviour: on a logarithmic axis the box plot's quartiles and fences, and a bar's mean and SD,
  are worked out on the plain values (the violin's density and the fitted line on logarithms);
  an error bar that would reach zero stops at the bottom of a logarithmic axis; a range set by
  the scientist cuts data off at the plot's edge without a note. A lone comma in a table is a
  decimal comma unless the table writes decimals with a point elsewhere (a notice says when that
  is a guess). An independent review (four reviewers, each finding cross-checked) ran once and
  its confirmed findings are fixed and tested in `tests/chart-review.test.ts`; the fixes
  themselves were not reviewed again, and no exported file with a chart was opened.
- Chart looks, table import and the instruction box (November 2026). Tried in the browser on a
  desktop and a tablet-sized window: a volcano plot built from typed instructions, a palette, one
  group's points, and files given to the file input by script (a quoted CSV, an Excel file written
  by openpyxl, a file that is no table). Not done: the system's file picker was not clicked
  through; no workbook saved by Excel itself, Numbers or LibreOffice was opened (the test file
  keeps texts inline, Excel keeps them in a shared list, which only a hand-built workbook covers);
  nothing on an iPad; no exported file opened to look at shapes, transparency or dotted lines.
- Chart looks, what is missing: a single point cannot be styled or named by clicking it (names
  come from the table, styles from its group); names of points can still overlap points and lines;
  the legend inside the plot can cover data; reference lines have one colour; only the first
  sheet of a workbook is read and dates arrive as Excel's day numbers; old .xls files are refused.
- Instruction box: a fixed vocabulary in English. It does not know "undo", colours by shade
  ("light blue"), rotation of names, or anything the panel cannot set. A group whose name holds
  " and " or a comma is not recognised inside a longer sentence. Asked for a test by name, it
  runs the test of that family that fits the number of groups and says which. Open-ended requests
  through the copy-paste AI route are not built.
- Statistical tests, first stage built (November 2026). Not offered: tests for grouped charts
  (two factors), Dunnett's test (each group with the first uses Holm instead), a correction for
  sphericity in the repeated-measures ANOVA, Student's t test with equal variances, correlation
  for scatter charts, effect sizes and confidence intervals, a methods sentence to copy. On a
  logarithmic axis tests use the values the chart shows (above zero), as typed, not their
  logarithms. Holm's correction always counts every pair that is compared (all pairs, or each
  with the first), not only the pairs that have a bracket. The suggestion rests on one check
  (Shapiro–Wilk on the residuals), which is weak with few values and is a pretest; the box says
  so. Tried in the browser with the sample chart on a desktop and a tablet-sized window, results
  compared with R by hand there too; not tried on an iPad, no exported file opened, and no
  independent review of the arithmetic beyond the pinned values.
- Where BioSketch and R differ on purpose: R's `ptukey` is approximate for a large range with
  two or three degrees of freedom and beyond 25000 degrees of freedom (those points are checked
  against SciPy); R's signed-rank test does not see ties between changes that are equal on paper
  but not in binary (4.1 − 6.9 and 4.9 − 7.7), BioSketch rounds differences to 12 digits and the
  reference runs R with `digits.rank = 12`.
- Next stage of the analysis tool, agreed in outline but not started: a guided choice of analysis
  from the scientist's description through the copy-paste AI route, where the AI proposes a plan
  and BioSketch does the arithmetic.
- Reshaping an icon: curve handles cannot be set separately, points cannot be added or removed,
  and the handles were dragged with simulated pointer events only.
- PowerPoint export was opened in PowerPoint for Mac only; Keynote and Google Slides (which use
  the PNG fallback) were not tried.
- No multi-page documents, no real-time collaboration (Yjs is the planned route if needed).
- Keyboard: objects can be selected (Tab), moved, edited and deleted, but not resized, rotated or
  connected with arrows from the keyboard.

## Things that bit us once (keep them fixed)

- Offline: hosts add `Vary` headers, so the service worker must look up saved files with
  `ignoreVary` (`public/sw.js`). Test offline by stopping the server and reloading the built app.
- When shipping a new version, bump the cache name in `public/sw.js` and `src/main.tsx` together.
- Dialogs must not re-run their focus effect on every render (`Modal` in `src/ui/Dialogs.tsx`),
  or typing in a dialog loses focus after each key.
- React StrictMode runs effect clean-ups early in development: clean-up code must be safe to run twice
  (see `save` in `src/canvas/TextEditor.tsx`).
- Node ids end up inside icon markup; `validateDoc` only accepts plain identifiers. Keep it that way.
- Ids stored in a figure are at most 64 characters. Anything that creates icon ids (packs, split
  pieces) must stay under that, or the icon vanishes when the figure is reopened.
- Autosave must drop its pending write when the figure returns to the stored state (Undo),
  otherwise the browser keeps a newer version than the one on screen.
- Autosave keeps a change that could not be written and retries it; never clear the pending change
  before the write has succeeded (`src/io/autosave.ts`).
- Leaving a figure deletes it only when it is still exactly a new, empty one. A named or sized page
  with nothing on it yet is the user's work.
- A locked object must not be picked up through its group (`expandGroups` in `src/model/doc.ts`).
- In the dev server, a module imported by hand in the browser console can be a second copy of
  the one the app uses (Vite adds `?t=` after a hot update). Test through `window.__editor` and
  the page, or import the exact URL the app loaded.
- A chart must draw whatever numbers a figure can hold. `niceScale` and `axisFor` always return at
  least two finite ticks, numbers beyond 1e±100 are refused where they enter (`usable`), and the
  renderer catches a failing layout: once, one tiny value blanked the editor and the figure could
  not be reopened.
- Reading a pasted table: digits are never joined across a space, a row of numbers at the top is
  a row of names when the panel says so (`header`), and what was not read or was cut off is
  reported (`readTable`). Guessing silently gave wrong means.
- What belongs to a group of a chart (its colour, its brackets) follows the group by name when
  the table is edited (`carryOver`), never its place in the table: a bracket once moved to a
  different pair of groups when a column was inserted.
- Anything the chart panel can store must survive `validateDoc` unchanged, and be drawn by the
  same rule (`usableEnds`), or the chart changes when the figure is reopened.
- A column of a chart's table with an empty or unreadable cell keeps the row of each value
  (`rows` on the group). Without it the values below a gap slide up, and a paired test compares
  the wrong rows without any sign of it. Whatever builds or filters a group's values must treat
  `rows` with them (`readTable`, `tableText`, `validateDoc`).
- Titles typed into the instruction box keep the scientist's characters (a typographic minus in
  "−log_{10} p"); only the copy that is searched for phrases is lower-cased and normalised.
- An arc in a path cannot follow a dragged end point (its radius stops fitting); reshaping turns
  arcs into curves first (`curvesOnly`).
- A pack icon used in a figure is stored in the figure too; lists that show both must not show
  it twice (`LibraryPanel`).
- A flat icon draws each shape several times (three tones and two clip paths). Anything that
  edits shapes must treat those copies as one: Reshape shows one set of points per shape and moves
  every copy (`reshapablePaths`, `movePoint`), and each shape sits in one group so that Split gives
  one piece per shape.
- Pieces split or reshaped while a figure is in the flat style keep the flat colours when the
  figure is switched back to outlined (they are copies stored with the figure).
