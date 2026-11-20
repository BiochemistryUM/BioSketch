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
- Git: commit only when the owner asks, and never push without being asked. Since 20 November 2026
  the repository has a remote, `origin` (github.com/BiochemistryUM/BioSketch, set up by the owner
  with GitHub Desktop), with the branches `main` and `develop`; work happens on `develop`. Commits
  use a placeholder author set for this repository only (`git config user.name` / `user.email`).
- The owner also works in this folder with GitHub Desktop while a session runs. If the files on disk
  suddenly are not the ones just written, look at `git branch` and `git stash list` before anything
  else: once, the folder was switched to `main` mid-task and the uncommitted work sat in a stash
  named `!!GitHub_Desktop<develop>`. Ask before switching back.

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
| An exported file is written for other programs, not only for browsers (`renderSvg` in `src/io/export.ts`): links inside it use the older spelling `xlink:href` (`olderLinks`), a fading arrow's gradient and a chart's clip sit inside `<defs>`, and a PNG is made from a copy of the file sized in figure units, not millimetres | Browsers read `href` and `xlink:href` alike; Illustrator, Office, older Inkscape and the converters journals run read only the older one, and parts go missing. A file sized in millimetres is a fraction of a pixel wider than the picture a browser makes of it, which left a faintly see-through line along the edges of the PNG. The nodes are still drawn by the one renderer; only the text of the file is changed. |
| The words on an arrow are a label like any other (`connectorLabelNode` in `src/model/nodes.ts`, drawn by the label renderer with a white halo) | So raised and lowered text, italics and bold work there too, with the same marks and the same renderer. They stand where they stood before. |
| A shape grows downwards when its words need more lines than fit (`growToFitLabel` in `src/model/nodes.ts`, with the share of a shape's height its words may take from `shapeTextArea`). It happens when the words or their size change, never when the shape is resized by hand, and a shape never shrinks by itself | The owner asked for it. The top edge stays where it is, also on a turned shape, so typing does not move the shape. Resizing by hand is the scientist's own choice and is left alone. |
| A figure with icons it does not hold says so when it is opened (`missingIconsNote` in `src/icons/library.ts`), the panel explains the dashed box, and tapping a library icon while one such box is selected puts that icon in its place (`addIcon`) | A dashed box with a question mark explained nothing. Replacing keeps the box's middle, turn and group, and fits the new icon inside it. |
| An imported pathway can be added to the open figure instead of becoming a new one (`addFigure` in `src/model/doc.ts`, `addToFigure` in `src/actions.ts`): copied under ids of its own, made smaller with text and lines in step when it is larger than nine tenths of the page, put in the middle of the window and selected | The owner asked for it. One Undo takes it out. A pathway into an empty figure still becomes the figure, with a page of its own size. |
| The bars of a chart with categories and series can stand on top of each other (`stacked`, `isStacked` in `src/model/chart.ts`): each part is as tall as the mean of its series, means below zero hang under the base line, error bars and single values are left out (and a notice says so), a number is written inside its part or not at all, and on a logarithmic axis the bars stay side by side | Stacked bars show parts of a whole (cell-cycle phases, compositions). A stack has no place for an error bar that could be told from its neighbour's, so none is drawn rather than a misleading one. |
| A scatter chart can draw a dose-response curve through each series (`curve: 'dose'` beside `fit`; `fitDose` in `src/model/chartStats.ts`): the four-parameter logistic along the logarithm of the dose, fitted by least squares (Levenberg-Marquardt from several starting points), with the EC50 and its asymptotic 95 % interval. It is pinned to R's `nls` with `SSfpl` through `tests/stats-reference.json`. No curve is returned unless the search has come to rest and the points say where the middle is | The curve pharmacologists publish, under the definition they can name (R, and GraphPad's "log(agonist) vs. response, variable slope"). Where the data define no single curve (a jump between two doses, no plateau) R stops with an error, and BioSketch draws nothing and says so: a guessed EC50 is worse than none. Doses of zero or below have no logarithm and are left out, with a notice. |
| A chart with categories and series (two factors) is tested by two-way analysis of variance (`src/model/twoWay.ts`): Type II sums of squares, each factor after the other and the interaction after both. Pairs follow: the series within each category or the categories within each series (`across` in the chart's `test`), by t tests with the variance pooled over all combinations and Holm's correction over all pairs compared. Pinned to R (least-squares fits with `lm`; with equal numbers it equals `aov`). There is no test on ranks and no paired analysis for two factors | Type II does not depend on the order of the factors when the combinations hold different numbers of values, which R's `aov` does. The panel shows the three answers, the interaction first, because with an interaction the two overall answers say little. |
| Stacked bars can be scaled to 100 % (`percent` beside `stacked`): each part is its share of the category's total, and a number written in a part is that share in per cent. A mean below zero has no share, so the bars are then stacked as they are, with a notice | Compositions (cell-cycle phases, cell types) are compared as shares. |
| A pie chart is a kind of chart (`kind: 'pie'`, `pieLayout`): the mean of each group is a slice, clockwise from the top in table order; a table with categories and series gives one pie per category. Slices carry their share in per cent, their value, or nothing (`pieLabels`). No axes, no test | The owner asked for it. A group with a mean of zero or below has no slice, with a notice; a slice too thin for its number has none. |
| An arrow can carry a mark at its start as well (`startMark`: head, bar or dot), beside the mark of its `kind` at the end; `marksOf`, `fromMarks` and `reversed` in `src/model/connector.ts` | A head at both ends is still `double`, so old figures and AI answers are unchanged. "Reverse" turns the arrow round with each mark going with its end. The AI and the pathway importer do not use it. |
| A scatter chart can write the correlation of each series on the plot (`corr`: Pearson or Spearman; `correlation` in `src/model/chartStats.ts`), with the two-sided p value of R's `cor.test`. Pearson is worked out on the values as plotted (logarithms on a logarithmic axis). Spearman's p is exact for up to nine points without ties, otherwise the t approximation (R: `exact = FALSE`) | R's own default for more points without ties is a series approximation that differs in the third digit; the t approximation is the one that can be named in one sentence, and the methods text names it. |
| A dose-response curve can have a plateau held at a stated value (`doseBottom`, `doseTop`), and the EC50 of two curves is compared by the extra sum-of-squares F test (`compareEc50`: both curves fitted with one shared middle against each on its own). One search routine fits one or several curves with any parameter held or shared (`settle`) | A response known to start at 0 or to end at 100 % should not be fitted, and "do these two drugs differ in potency" is the question a dose-response figure is drawn for. Pinned to R's `nls`. The p values of several pairs are not corrected, and the panel says so. |
| Survival curves are a scatter table drawn another way (`survival: true` on a scatter chart; `src/model/survival.ts`): the first column is the time, each group's column holds 1 for the event and 0 for a subject that left without it. Kaplan-Meier estimate with a tick for every censored subject, median as R's `survfit` reports it, log-rank test (`survdiff`), pairs by log-rank tests with Holm's correction; the p value can be written on the plot (`logRank`) | It reuses the table reading, saving and instruction words of the scatter chart, so nothing about tables had to be built twice; the panel offers it as a kind of its own ("Survival"). The table is the one GraphPad Prism uses, so data can be pasted from it. Pinned to R's survival package. |
| A text for the methods is written from the chart itself (`methodsText`, `curveMethodsText` in `src/model/chart.ts`) and copied with one button: what is drawn, how many values, which test and which comparison of pairs, the result of the overall test, and the functions of R that give the same numbers | The owner asked for it. It states only what was done, never whether a difference matters, and it cannot go stale because it is worked out from the chart each time. |
| "Ask Claude which analysis fits" (`src/ai/analysis.ts`, `src/ui/AnalysisDialog.tsx`) goes through the scientist's own Claude app, like the copy-paste route for figures. The request holds the scientist's description, the names of the groups, a summary of each (number of values, mean, scatter, median, smallest, largest) and the analyses BioSketch can work out for that table; never the table. The answer is a plan made of those choices and words; `readAnalysisAnswer` rebuilds every field, runs the plan on the table before offering it, and uses no number from the answer | The second stage of the analysis tool, as agreed: the AI proposes, BioSketch does the arithmetic. What a table cannot say (are the rows the same animals? are values technical repeats?) is what decides the test, and only the scientist's description holds it. No request is made by BioSketch and nothing is paid. |
| The dialogs are separate files, fetched when first opened and, in the background, right after the editor is on screen (`src/ui/lazyDialogs.tsx`); what the main screen needs of the export code is in `src/io/download.ts` | The first file is a third smaller (837 to 551 kB). The background fetch puts the dialogs in the offline cache on the first visit, so the app is still fully available offline afterwards, which is why it used to be one file. A dialog that cannot be fetched closes with a message. |
| Shading that mixes with what is beneath it (`mix-blend-mode`, how Illustrator and the NIH icons draw shadows) is settled when an icon is read (`settleShading` in `src/icons/svg.ts`, part of `sanitizeBody` and `parseSvgFile`): a clipped group that holds such a shape is cut into layers, and each mixing layer becomes a clipped group that mixes as a whole | Chrome and Firefox paint a clipped group on its own before laying it over the rest, so shading inside it darkened nothing and showed as a flat grey patch in 73 NIH icons; Safari and Illustrator let it through. After the change all three draw the same picture, the one the illustrator made. It runs on packs and on icons stored in figures alike, so no pack had to be rebuilt, and it changes nothing when run again. |
| An icon is taken apart by splitting it into pieces (`src/icons/split.ts`), each a small icon of its own | Reuses move, resize, recolour and delete; no path editor to build or maintain. |
| Reshaping moves the points of an icon's paths (`src/icons/path.ts`, `reshape.ts`); the icon is first copied into the figure with shapes turned into paths and arcs into curves | The library icon and other copies stay as they were. Point positions are read from the drawn icon (`getScreenCTM`), so size, turn, flip and inner groups need no maths of our own. Curve handles follow their point; there is no handle editing and no adding or removing points. |
| Panel frames are "guides" (`guide: true`): drawn on the page, skipped by the renderer for exports | The only deliberate difference between page and export, besides selection handles. Hidden objects (`hidden: true`) are skipped everywhere. |
| PowerPoint export writes the .pptx by hand (`src/io/pptx.ts`: a stored ZIP and a dozen XML parts) with the figure as SVG plus PNG fallback | No library to ship; the picture stays vector in PowerPoint 2016+. Checked by opening a generated file in PowerPoint. |
| In the SVG stored in a PowerPoint file, every icon shaded with shapes that mix (`mix-blend-mode`) is a picture of itself (`iconsAsPictures`, `svgForPowerPoint` in `src/io/export.ts`): drawn alone by the one renderer, turned into a PNG by the browser at twice the pixels of the fallback picture, and put in the icon's place with its size, turn, transparency and attached arrows. The Export dialog says how many icons this concerns. The downloaded SVG, the PNG and the PDF keep the drawing | PowerPoint draws the SVG itself but does not know mixing: it paints such shapes as plain covering ones, so a tinted cell came out solid red and shadows turned grey or vanished (seen in PowerPoint for Mac, in a quarter of the NIH icons and in the signalling example). Arrows, shapes, lettering, charts and all other icons stay vector. The credit in the file is still made from the icons, not the pictures. |
| The library is made of publicly available collections only: NIH BioArt, Bioicons (CC0) and Servier Medical Art, as icon packs in `public/icon-packs/`. BioSketch has no icons of its own: the 353 drawings made for it, their "Flat cartoon" look and the per-figure icon style were deleted on 19 November 2026 at the owner's request (they are in git history, commit 10b8ebd, should they ever be wanted). Every icon in a figure is stored with the figure (`customIcons`); `getIcon` looks nowhere else | The owner judged the illustrators' drawings far better than the ones written as code, and wants only publicly available art offered. The owner confirmed that no earlier figure needs the old drawings: a figure that names one opens with a dashed placeholder in its place. Do not draw icons in code again without the owner asking. |
| Icon packs carry every icon's name in `public/icon-packs/index.json` | One search finds icons in packs that are not fetched yet; a pack is fetched when opened or when a search hits it. The library shows one pack at a time (`Collection`, grouped by source with `groupPacks`; it opens on `DEFAULT_PACK`, NIH cells) and a search looks through all of them. An icon placed from a pack is stored in the figure, so a figure never depends on a pack being reachable. |
| An arrow's end is part of its `kind` (`arrow`, `inhibit`, `dot`, `line`, `double`); a fading line (`fade: 'in' \| 'out'`) is one SVG linear gradient per arrow, set between its two end points, used by the line and its end mark alike (`fadeStops`, `connectorShape` in `src/model/connector.ts`) | One list of arrow types in the panel, the file format and AI answers. The gradient is the only one BioSketch draws (icons stay plain colours); it is plain SVG, so exports keep it. A fading line stops where its head, bar or dot begins (`flush`), because two see-through shapes on top of each other show as a darker patch. AI answers can ask for a `dot` end but not for fading. |
| Text inside a shape is part of the shape (`label` on a shape node), drawn by the label renderer through `shapeLabelNode` (`src/model/nodes.ts`) and typed in place with the same editor as a text label. Lines are broken to fit the shape when it is drawn (`wrapText`); the figure stores the text as typed | One object to move, resize and turn, and the words stay in place. It reuses label formatting, measuring and export, so there is no second text engine. Boxes built by the AI and the example figures are made this way too. Figures from before have a box grouped with a separate label: that still works, a double-tap on such a box types in its label (`labelPartner`), and both kinds are read as the box's label when a figure is shown to the AI. |
| Rectangles, rounded rectangles and ellipses are SVG's own elements; every other shape kind (triangle, diamond, hexagon, cylinder, callout, bracket) is one path from `shapePath` in `src/model/shapes.ts`, which also says where an arrow meets the outline (`outlineAlong`) and where the words inside go (`shapeTextArea`) | Old figures and exports are unchanged, and a new kind is added in one file: its path, and its corners if arrows should follow slanted sides. A bracket is an open line and is never filled. |
| A chart is an object of its own (`chart` node) that keeps its numbers; `src/model/chart.ts` reads the pasted table (plain, grouped with a second row of names, or scatter with x in the first column), builds the axes (range set by hand, logarithmic) and lays out every bar, box, violin, point, tick, legend entry, bracket and word, and the renderer only draws that list | The chart stays editable and looks the same on the page and in every export, with real text. Its words go through the label renderer, so the usual marks work. No charting library. The AI neither sees nor makes charts. |
| Chart statistics live in `src/model/chartStats.ts` and follow stated, common defaults: quartiles by linear interpolation (R `quantile` type 7), Tukey whiskers at 1.5 × IQR with outliers as rings, a Gaussian kernel density with Silverman's rule-of-thumb bandwidth (R `bw.nrd0`) for violins, ordinary least squares for fitted lines. Tests pin each to values from R | Scientists publish these plots, so a definition must be one they can name in their methods, and a wrong number is worse than a missing feature. Anything added later must be pinned to a reference in the same way. |
| Statistical tests (`src/model/chartTests.ts`, distributions in `src/model/distributions.ts`) cover one factor (for two factors see the two-way analysis below): two or several groups, separate or paired samples, means or ranks, eight tests in all (Welch t, paired t, Mann–Whitney, Wilcoxon signed-rank, one-way ANOVA, repeated-measures ANOVA, Kruskal–Wallis, Friedman). With several groups pairs follow: Tukey after a one-way ANOVA for every pair, otherwise the two-group test of the same family with Holm's correction; each group with the first after a one-way ANOVA is Dunnett's test (since 20 November 2026; before, t tests with pooled scatter and Holm). All two-sided, each the default of R's function of the same name, pinned to R 4.4 through `tests/stats-reference.json`, which `scripts/stats-reference.R` writes | One named method per design, so a scientist can copy it into the methods. No statistics library: the distributions are a few hundred lines and every one is checked against R. |
| A chart stores only the choices for its test (`test`: means or ranks, paired, each with the first group, which pairs for two factors, stars) and which brackets follow it (`auto`); p values are worked out from the numbers every time the chart is drawn (`chartAnalysis`, `bracketLabel` in `src/model/chart.ts`, remembered per table) | A stored p value goes stale the moment the table is edited. The page, the panel and every export show the same result because they share the layout. |
| The panel suggests a test for every table (`suggest` in `chartTests.ts`, `chartAdvice`): the scientist says whether rows are the same sample and which pairs to compare; the design picks the family; means are suggested unless a Shapiro–Wilk test on the residuals gives p below 0.05, then ranks. The box says what the test does, why it fits this table, and what to keep in mind (few values, a rank test that cannot reach 0.05, very unequal scatter, rows left out) | The owner asked for a suggestion with an explanation for every table. It is advice in words, worked out in the browser, with no AI request; the scientist chooses the test. |
| The look of a chart's points belongs to the group: a shape (`shape`: circle, square, triangle, diamond, each covering the area of the circle it replaces, `pointPath`), and a size and transparency that overrule the chart's (`pointSize`, `pointOpacity` on the chart for all points, on a group for its own). The legend shows the mark for charts made of points and a colour square for bars, boxes and violins; it stands at the right unless `legend` says above, below, inside or hidden | Asked for by the owner, first for all points, then per group (a volcano plot wants faint small grey points and bold coloured ones). Transparency is SVG `fill-opacity`, so every export keeps it. |
| Dashed lines at chosen values are `refLines` on the chart (along the value axis; along x too in a scatter chart; dashed, dotted or solid, with a label), and the axis reaches them. A scatter chart writes a name beside a point when the table has a column of words before the x values (`labels` on the group, at most 100 on a chart; `placeNames` puts each, in table order, where it covers the fewest points and no earlier name: right, left, above or below its point, or up to two steps further out with a thin leader line). A scatter series keeps up to 25,000 points (`MAX_POINTS`, a volcano plot of every gene); a larger one is thinned evenly over the table keeping every named point (`thinEvenly`), never cut off at its end, because tables of genes are sorted by p value | What a volcano plot needs besides points: thresholds and gene names. Names come from the table, not from clicking points, so they survive pasting new numbers. `usableRefLines` decides what is drawn and what is saved. |
| A number written at every group is `valueLabels` on the chart: the mean, the median or the count (`show`), above the group or inside its bar (`above`), its decimals and its colour. Inside a bar it stands under the top, or at the foot when an error bar or dots run through the bar; where it does not fit, and in every other kind of chart, it stands above what is drawn, and brackets go over it. Without a colour it is white on a dark bar and dark elsewhere (`readableOn`). `usableValueLabels` decides what is drawn and what is saved | The owner asked for the median written in each bar in white. It is laid out with the rest of the chart, so the page and every export agree, and it goes through the label renderer like every other word. A bar is always the mean: the panel and the instruction box say so when another number is written in it. Scatter charts have none. |
| Groups without a colour of their own take one from the chart's palette (`palette`, `src/model/palettes.ts`): BioSketch's own, four colour-blind-friendly ones (Okabe–Ito, Tol bright, Viridis, Greys) and five common ones (Tableau 10, Matplotlib, ColorBrewer Set 1, Set 2, Dark 2). Choosing a palette clears the groups' own colours | The values are copied from their sources (R's `palette.colors` and `viridisLite`, matplotlib, Paul Tol), so a palette can be named in a legend. Only the four published as colour-blind safe are called so. |
| A table can be read from a file (`src/io/tables.ts`): CSV, tab-separated or plain text in UTF-8, UTF-16 or the Windows character set, and the first sheet of an Excel workbook (.xlsx), which is unpacked by hand (the ZIP's list of files, the browser's `DecompressionStream`, three XML parts). The result is the same text that could have been pasted and goes through `readTable` | Biologists keep their numbers in Excel. No library to ship, like the PowerPoint export. A file is as untrusted as the clipboard: size limits before and after unpacking, XML parsed as data, and every value still passes `readTable` and `validateDoc`. |
| A pathway is imported from its GPML file (`src/io/gpml.ts`, the format of WikiPathways and PathVisio, version 2013a): every molecule becomes a shape with its name inside, every line an arrow, every label a text, a complex or plain group an outline grouped with its members, a phosphate mark a small shape grouped with its molecule. It opens as a new figure, in BioSketch's colours by type of molecule or in the colours of the file, and a list says what was not carried over exactly | The owner asked for pathways that are redrawn, not pasted as a picture, so that every part can be changed afterwards. The file states places, sizes and end marks, so nothing is traced or guessed. A pathway file is untrusted: parsed as data, limited in size and number of objects, and the figure goes through `validateDoc`. |
| File › Import a pathway also searches WikiPathways (`src/io/wikipathways.ts`, `src/ui/PathwayDialog.tsx`): the list of all pathways (one static JSON file, about 2.5 MB) is fetched when the dialog opens and searched in the browser by name, gene, metabolite, term and identifier; the GPML file of the chosen pathway is fetched by its identifier. Requests carry no cookies and no referrer, and addresses are built from a checked identifier only | WikiPathways is public domain (CC0) and lets any web page read its files, so no server is needed. What the scientist types never leaves the browser. Besides the AI key route and icon packs this is the only request BioSketch makes; opening a .gpml file works offline. |
| An arrow end can keep its own place on the object it is attached to (`port` on the end: across and down the object's box, −1 to 1), and a right-angled line can be told which way it runs at each end (`legs`: `hh`, `vv`, or `hv`/`vh` for a line with one corner) | Pathway files draw several arrows side by side between two molecules, and lines with one corner; aimed at the middle of the box they fell on top of each other or ran through other molecules, which changed what the figure said. An end with a port still follows its object. Arrows made by hand have neither: dragging an end drops its port, choosing a line shape in the panel drops `legs`. The importer gives an end a port only when a plain attachment would land elsewhere (8 units, 1.5 for right-angled lines), so most arrows keep adapting when a molecule is moved. |
| "Resize everything together" (`scaleFigure`, `scaleAsPicture` in `src/model/doc.ts`, `resizeAsPicture` in `src/actions.ts`) resizes as one picture: places, sizes, text and the thickness of outlines and arrows change by one factor. Under Page it takes the whole figure, hidden and locked objects and the page included; under Arrange it takes the selection, about its middle. Smaller and Larger are 80 % and 125 %, each other's inverse | The owner asked for it after importing a pathway: a figure should grow with its text and arrows in step. Dragging a corner of a selection still leaves lines as thick as they were, so that a small resize does not leave a figure with odd line weights; this control is the deliberate "same picture, another size". The view keeps its zoom when the whole figure is resized, so the change is seen on screen. |
| The instruction box of a chart (`src/model/chartCommands.ts`, `applyInstruction`) reads set phrases in the browser: no AI, no request, the same result for the same words. It cuts the text into clauses; each reader takes its phrase out and makes its change; words left over that are not small talk are reported. It only sets what the panel can set, and one Undo takes an instruction back | The owner asked for a box where the scientist describes a change ("upright dotted line at x = 2", "fit a regression line"). A phrase reader costs nothing, works offline and never invents a setting; the price is a fixed vocabulary, so it must say what it did not understand, word for word, and never guess. The copy-paste AI route stays the place for open-ended requests. |
| What needs explaining sits behind an “i” in a circle beside the setting (`src/ui/Info.tsx`; `info` on `Field` and `Section` in the properties panel). Pointing at it with a mouse shows the note, pressing it keeps the note open until it is pressed again, Escape is pressed or something else is pressed. The note is drawn outside the panel (a portal) and opens beside the panel, level with its button (`placeInfo` in `infoPlace.ts`); in a narrow window, below or above the button | The owner asked for it, for the statistical test too: the panel had grown long with paragraphs of help. Pressing works without hover, so touch and keyboard are served. A field with a note is a plain group, not a `<label>`: a button inside a label would become the control the label stands for. What the scientist must not miss stays on the panel: notices about the table, the cautions of the suggested test, and the result of a test. |
| The properties panel is 340 wide by default and its left edge can be dragged (`src/ui/PanelResizer.tsx`, limits in `panelWidth.ts`: 240 to 640, always leaving some of the page). The width is a preference kept in the browser (`localStorage`), not part of a figure; arrow keys move the edge when it has the focus, and a double-click gives the usual width | The chart panel grew long at 252 wide, and the owner asked to resize it by hand. While dragging, only a style of the page changes (`--props-width`), so the panel's contents are not redrawn at every step. The icon library keeps its fixed width. |
| The settings of a chart are sorted under four headings, one open at a time (`src/ui/chartTabs.ts`, `ChartTabBar` and `ChartProps` in the properties panel): Data (kind of chart, table, rows of names, what each group holds), Statistics (error bars, test, brackets, fitted line and curve, correlation, log-rank test), Look (palette, colour and shape of each group, points, dots, stacking, numbers at the groups, legend, text size) and Axes (titles, ranges, lines at values, names of points). The instruction box stays above the headings and the notices of the chart stand under them whichever is open. The row of headings stays at the top of the panel while its settings are scrolled; the heading opened last is kept while the page is open, so the next chart opens on it. A pie has only Data and Look, and its title stands under Look | The owner asked for it and chose tabs among four drawn designs: the panel had become one long list to scroll. What was worked out for a series stands beside the setting that asks for it (the EC50 under “Fitted line”, r under “Correlation”), not in the list of groups, which is now under Data. Only the open heading is drawn, so what a part keeps for itself while it is open is not kept when another heading is chosen; the text typed into the table is kept by `ChartProps`. |
| The name of a group, a series or a category can be typed over under “Look” (`renameSeries`, `renameCategory`, `tidyName` in `src/model/chart.ts`; `NameInput` in the properties panel). The name changes in the chart's groups, so the table under “Data”, the legend and the axis follow, and the list of series whose points are named follows too. A typed name is written the way `readTable` reads a cell (one line, 60 characters, a typographic minus as a hyphen). In a grouped chart a name another series or category has is refused, in words under the box | The owner asked for it: before, a name could only be changed in the table. A series of a grouped chart is its name, so two with one name would silently become one; and a name that the table would read back differently would change by itself the next time a number is edited. An empty box changes nothing, and what is typed stays in the box while it has the focus. |
| A heat map is a kind of chart (`kind: 'heatmap'`; arithmetic in `src/model/heatmap.ts`, drawing in `heatmapLayout`): one cell for every number of the table, coloured by its value. A first column of words names the rows (kept as `labels` beside the values of every column, like the names of points). The colours are one of five scales (`heatScale`: Viridis, Blues, Greys; blue-white-red and purple-white-orange around a middle), mixed evenly between published stops; the range of the colours is `yMin`/`yMax`, a logarithmic scale `yLog`. `heatByRow` shows every row as z-scores (R's `scale()`), `corr` the correlation of every column with every other (`correlation` of the scatter chart, over the rows both have), `heatNumbers` writes the number in each cell. A cell without a number is drawn empty | The owner asked for a matrix plot. It reuses the table, the range, the logarithm and the correlation that charts already had, so the file format grew by three fields. A row with no spread cannot be scaled and is left empty with a notice, never shown as zero. Two colours around a middle keep the middle at zero (on a logarithmic scale: at 1) unless an end is set. It draws at most 400 rows and takes the 24 columns every chart takes; rows and columns can be clustered, with a tree (see the row on clustering further down). |
| A Venn diagram is a kind of chart (`kind: 'venn'`; counting in `src/model/venn.ts`, drawing in `vennLayout`) for two or three sets, as circles of one size. The table is read in one of two ways: lists (every column holds the names of the members of one set, kept as `labels` with a 1 as the value of each; names are compared without regard to capitals) or sizes (one row of numbers: under the name of a set its whole size, under names joined by “&” the size of what those sets share; the parts follow by inclusion and exclusion). Sizes that cannot be true are refused in words and nothing is drawn. The panel lists what each part holds, with the names to copy; `vennLabels` writes counts, shares or nothing | The owner asked for it. Gene lists are what biologists have, sizes what they read in papers. A table of words is a third way of reading a table beside columns of numbers and scatter (`chartFamily`): going from one to another reads the table again, and the panel gives the chart back unchanged when nothing was touched. The circles are not sized by the counts: with three sets that cannot be done exactly, and an approximation misleads. |
| A press on a part of a selected chart opens the setting of that part (`ChartPart`, `partOf` in `src/model/chart.ts`; `partAt`, `partBox` in `src/model/chartParts.ts`; `settingFor` in `src/ui/chartTabs.ts`; `chartPart` in the store). Every layout says which part its marks belong to as it adds them (`nowPart`, or `part` on the mark); the parts are kept beside the drawing in a `WeakMap`, so the marks, the page and every export are unchanged. `partAt` is plain geometry on the layout: lettering first, then points and thin lines within reach (5 screen pixels for a mouse, 8 for a pen, 14 for a finger), then what is filled under the press, then axes and brackets. The panel opens the heading, scrolls to the setting (`data-setting`) and marks it for a moment; a dashed box on the page shows the part (`Overlay`). The first press on a chart still selects it and a drag still moves it; a tap on a resize handle counts as a press on the chart under it, because the top handle lies on the title | The owner asked that selecting a part of a plot shows how to edit it. Geometry on the layout is a pure function with tests and needs nothing added to the page: with elements to hit, thin marks would need invisible wide copies and 25,000 points an attribute each. The pressed part is let go of as soon as the chart changes or something else is selected, so its box is never that of a chart that looks different by now. |
| A figure can have several slides, shown as a presentation (`src/model/slides.ts`). The open slide is the figure as the rest of the code knows it (`doc.nodes`); the others wait in `doc.slides` (`before`, `after`), and opening a slide swaps the objects over (`showSlide`). The page (size, colour, printed width) and the icons belong to the whole figure, and no id is used twice in a figure (`uniqueIds` in `validateDoc`, ids of their own in `duplicateSlide`). Opening a slide is not a step for Undo; adding, copying, moving and deleting one is. With nothing selected the arrow keys open the next and the previous slide (they move what is selected otherwise; Page Down and Page Up always open slides), and a press on a slide in the row leaves nothing selected. The row of slides under the page (`SlideStrip`) shows whenever a figure has several, or when “Slides” in the top bar asks for it; “Present” shows them full screen on black (`Presenter`): arrow keys, Space, a press or a swipe move on, Escape leaves. A slide in the row and on screen is the export's SVG shown as a picture (`slideThumbs.ts`; the export code is fetched for the first one). Export offers “All slides”: one PDF with a page each (`printPages`), one PowerPoint file whose slides have the size of the page (`deckParts` with `fill`), or SVG or PNG files in one ZIP file, always as whole pages | The owner asked for a presentation mode like BioRender's. With the open slide as `doc.nodes`, drawing, selecting, exporting, Undo, autosave, the AI and every test stayed as they were, and a figure of one slide has no `slides` field, so files from before and after are the same. A slide shown as the picture of its export is exactly what is exported, and shares no ids with the page under it. Slides of one PDF are drawn into one document, which is why ids must differ across slides. |
| The tour of the features is a figure of twelve slides built in code (`tutorialDoc`, `TUTORIAL` in `src/tutorial.ts`): on every slide a few numbered examples that are real objects (icons, labels, shapes, arrows, membranes, charts with their tests) and beside each number a line that says where to click. It opens as a new figure from File › Start from an example, from the start card and from Help (`tourDoc` in `src/figures.ts`), like the example figures (`buildTemplate`), with its six icons from the NIH cells collection, the one the library opens on. It is a file of its own, fetched with the dialogs | The owner asked for a small tutorial of the features as several slides, like the one-page tour they liked. Built from the same parts a scientist uses, every example is checked by the types and must survive `validateDoc`, so the tour cannot show what BioSketch does not do; `tests/tutorial.test.ts` also checks that nothing leaves the page and no lettering lies on other lettering or on a chart. Icons of the collection that is fetched anyway mean the tour opens offline once the library has been seen. Its ids are counted, not random, so it is the same figure every time. |
| Every slide has the colour of its own page and its own notes for the speaker (`Slide.background`, `Slide.notes`; for the open slide `doc.background`, `doc.notes`), and an object can wait for a press of its own while its slide is presented (`appear` on every object; `slideSteps`, `nodesAtStep` in `src/model/slides.ts`). The presenter (`src/ui/Presenter.tsx`) steps through objects, then slides (`presentMove`); its view for the speaker shows the notes, the time and what comes next, and a second window can show the slides alone for a projector | Asked for by the owner. With the colour of the open slide in `doc.background`, the renderer, the export and the Page panel needed no change. An object that has not appeared yet is hidden, not removed, so an arrow attached to it keeps its place. Notes are never drawn or exported. |
| A text is a label, or a text box when it has a `width` (`TextNode.width`, `bullets`; `textLayout` in `src/model/nodes.ts`): a text box breaks its lines at its width, has handles at its sides that change the width without changing the lettering, and can set a bullet before every paragraph with the further lines set in. The text tool places a label on a press and draws a text box on a drag | The owner asked for it once slides existed: titles and bullet points need words that wrap. One function lays out every text, so the page, the export and the measuring agree; a label is laid out exactly as before. |
| A new slide can begin with a ready-made layout (`SLIDE_LAYOUTS`, `layoutNodes` in `src/model/layouts.ts`) or with a slide the scientist designed and saved as a template (`templateOf`, `slideFromTemplate`; kept in the browser by `src/io/slideTemplates.ts`, each as a figure of one slide that is read back through `parseDoc`). One template can be made the start of every new slide, and a template can be saved as a file for a colleague | The owner asked for it: colleagues always use the same picture at the right, a text box at the top and a logo in the corner. A template is fitted to a page of another size as one picture. Templates are per browser, like figures. |
| The interface has a light and a dark theme (`src/ui/theme.ts`; File › Dark theme). Every colour of the interface is a variable at the top of `src/styles.css` with a second value under `:root[data-theme='dark']`; the accent is indigo (`--accent`), no longer teal. Until the scientist chooses, the setting of the computer is followed | The owner asked for a light and a dark theme, and found the teal look "Claude-like". The figure is not themed: a page keeps its own colour, icons of the library keep a white ground, exports are the same in both themes. |
| The library has "Favourites" and "Used last" (`src/icons/favourites.ts`; ids of icons of the collections kept in the browser, a star on every icon) | Asked for by the owner. Only ids are kept, so the lists cost nothing; the icons are found again in their packs, which are fetched when the list is opened. |
| A table is an object of its own (`table` node; `src/model/table.ts`): cells pasted from a spreadsheet (tabs) or typed (a "|" between cells), laid out by `tableLayout` as grounds, lines and labels that the renderer only draws. Columns of numbers stand at the right; the first row can be the names of the columns; lines are a grid, between rows, the three lines of a journal, or none | Asked for by the owner. Like a chart it keeps its content, so it stays editable, and its words go through the label renderer, so marks work in cells. No table library. |
| A heat map can put rows, columns or both in the order of a hierarchical clustering and draw the tree (`heatCluster`; `cluster`, `treeLines` in `src/model/heatmap.ts`): Euclidean distance and complete linkage, the defaults of R's `dist` and `hclust`, with R's own order of the leaves. A fitted straight line and a survival curve can carry a shaded 95 % confidence band (`band`; `lineBand`, and `lower`/`upper` on every step of `kaplanMeier`, as `predict(lm, interval = "confidence")` and `survfit` give them). After a one-way ANOVA, each group is compared with the first by Dunnett's test (`dunnettUpper` in `src/model/distributions.ts`: the integral over the control and the pooled spread; `multcomp::glht` gives the same by simulation). Survival curves report the hazard ratio of every group against the first (`hazardRatios` in `src/model/survival.ts`: Cox's model with Efron's method for ties, as `coxph`) | Asked for by the owner. Each is the method a scientist can name, pinned to R 4.4.2 in `tests/more-stats.test.ts` and `tests/stats-reference.json`. Dunnett replaces the t tests with Holm's correction that "each with the first" used after an ANOVA: it is the test made for that comparison, so p values of such charts changed. |
| File › Start from a template opens a list with a preview (`src/ui/TemplatesDialog.tsx`; `TEMPLATES` in `src/templates.ts`): the tour, a timeline, a workflow, a graphical abstract, two posters and the two example figures. A poster is a page sized in quarter millimetres with its printed width set (A0), so the PDF comes out at the size of the paper; its section frames are guides. Page sizes for posters are also under Page | Asked for by the owner. Built like the example figures, from NIH icons fetched when opened; the abstract and the posters need none. |
| Saved figures can be filed under projects (`project` on `FigureMeta` in `src/io/storage.ts`; `byProject`; the My figures dialog) | The owner asked whether a project could hold several figures and presentations. A project is a heading in the list of figures of this browser, not part of a figure or a file. |
| A line that is not solid keeps `dashed: true`, with `dashStyle` (dotted, long, dash-and-dot; absent = plain dashes) and `dashScale` beside it (`src/model/dash.ts`) | Figures saved before the styles existed open unchanged, and AI answers keep their simple `dashed` yes/no. Dots are near-zero dashes that only show with round line ends, so the renderer rounds the ends whenever a pattern has dots. |
| AI returns a structured "scene" (icon ids, positions, arrows), never images or SVG | Output stays editable, uses attributed library icons, and avoids journal bans on AI-generated images. |
| The icons the AI may name are those of the NIH BioArt packs (`aiPacks` in `src/ai/scene.ts`), listed to it by name from the pack list (`iconCatalogue`, about 15,000 characters; the whole request is about 20,000). An answer names icons as `pack--entry`; `catalogueId` also understands an entry on its own or written with spaces. The packs an answer needs are fetched before the figure is built (`sceneIcons` in `src/ai/icons.ts`) and the drawings stored in the figure (`iconsUsed`); an icon that is not found, or whose pack cannot be fetched, becomes a box with the name | NIH BioArt is public domain (no credit line to explain) and in one hand, so an AI figure looks of a piece; Bioicons and Servier stay the scientist's own choice. Everything in `scene.ts`, `layout.ts` and `revise.ts` takes the drawings through an `IconLookup` argument, so they stay pure and testable without fetching. |
| The AI complements the request in three ways, none of which costs an extra request: "Plan first" (the request asks Claude to describe its plan and ask questions in the chat before it answers with the figure; Claude app route only), `notes` in the scene (assumptions, stand-ins for missing icons, open questions, shown after building), and a layout check done by BioSketch itself (`tidyScene` in `src/ai/layout.ts`: plain geometry that moves elements back onto the page and apart) | Looked at how other tools do it (planning agents, self-checking renderers) and kept what fits a tool with no server and no paid requests. The layout check runs for new figures only: when a figure is changed, the scientist placed those things. |
| A scene has a `frame` element (empty dashed rectangle, any size) besides `box` | A box holds a label and is capped in height; zoomed-in views and marked regions need a container. An empty rectangle on the page is described back to the AI as a frame. |
| AI works two ways: copy-paste through the user's own Claude app (default, no key, no cost), or the user's Claude API key called from the browser | No backend to run or pay for. The owner does not want to pay for API credit, so the copy-paste route (`src/ai/bridge.ts`) must keep working and stay the default. Both routes share one prompt and one scene format. |
| Every icon carries its licence, author and source (pack icons and imported files alike) | Public-domain and CC0 icons need no credit; for the others the export builds the credit text. |
| Not built on tldraw or Excalidraw | tldraw is not open-source licensed; Excalidraw is hand-drawn style and treats SVG as flat images. |

## Safety rules for this codebase

- Icon markup is injected into the page as HTML, and every icon is third-party artwork. All of it
  must go through `parseSvgFile` or `sanitizeBody` (`src/icons/svg.ts`) first: imported files,
  icons read from a pack (`readPack`) and icons stored in a figure (`validateDoc`). Never bypass this.
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
  (quartiles, density, fitted line), `heatmap` (what the cells of a heat map hold, colour scales), `venn` (what the sets of a Venn diagram share), `chartParts` (the part of a chart under a press), `chartTests` (the statistical tests, Shapiro–Wilk, the
  suggestion of a test), `distributions` (t, F, chi-squared, normal, studentized range, exact
  Wilcoxon), `membrane`.
- `src/model/slides.ts` the slides of a figure: which is open, adding, copying, moving, deleting,
  every object of the figure (`everyNode`), ids that differ across slides.
- `src/render/DocNodes.tsx` draws nodes as SVG, for both canvas and export.
- `src/canvas/` pointer input (mouse, touch, pen), selection handles, in-place text editing.
- `src/ui/lazyDialogs.tsx` shows the open dialog and fetches dialogs when needed; `copy.ts` copies text; `AnalysisDialog.tsx` asks Claude which analysis fits.
- `src/model/layouts.ts` slide layouts and templates, `src/model/table.ts` tables, `src/io/slideTemplates.ts` saved slide templates, `src/icons/favourites.ts` favourite and recent icons, `src/ui/theme.ts` the light and dark theme, `src/ui/TemplatesDialog.tsx` the list of templates.
- `src/ui/SlideStrip.tsx` the row of slides under the page, `Presenter.tsx` the slides full screen, `slideThumbs.ts` the pictures of slides both show.
- `src/ui/` panels, top bar, dialogs, the objects list (`ObjectsList.tsx`), info notes (`Info.tsx`, `infoPlace.ts`), the headings of the chart panel (`chartTabs.ts`). `src/actions.ts` commands. `src/store.ts` state and undo.
- `src/icons/` the icon packs the library is made of (`packs.ts`: the pack list, grouping by
  source, fetching, search; files in `public/icon-packs/`), SVG import/recolour/sanitise
  (`svg.ts`), splitting an icon into pieces (`split.ts`), reshaping point by point (`path.ts`
  path data, `reshape.ts`). `library.ts` holds `getIcon` (an icon of the figure, by id) and the
  search helpers; it has no drawings.
- `src/io/` export (SVG/PNG/PDF/attribution), PowerPoint files (`pptx.ts`), tables from CSV and Excel files (`tables.ts`), pathway files (`gpml.ts`) and the WikiPathways search (`wikipathways.ts`), file validation, saved figures (`storage.ts`),
  autosave, placing pictures (`images.ts`). `src/figures.ts` new/open/copy/delete a figure.
- `src/model/survival.ts` Kaplan-Meier estimate and log-rank test. `src/model/twoWay.ts` the analysis for two factors. `src/ai/analysis.ts` the request and the
  reading of Claude's plan for a chart's analysis.
- `src/ai/` scene format, icon catalogue and prompt (`scene.ts`), fetching the icons an answer
  names (`icons.ts`), the Claude API call (`client.ts`), the copy-paste route (`bridge.ts`),
  changing an existing figure (`revise.ts`), and the layout check on a new figure (`layout.ts`).
  `src/templates.ts` the two example figures, built from NIH BioArt icons once their packs are
  fetched (`buildTemplate`). `src/tutorial.ts` the tour of the features, twelve slides built the same way.
- `scripts/import-icons.mjs` builds an icon pack from a folder of SVG files. `scripts/bioicons.mjs`
  builds the Bioicons (CC0) and Servier (CC BY 3.0) packs in `public/icon-packs/` from a copy of
  the Bioicons repository. `scripts/bioart.mjs` builds the NIH BioArt packs: `fetch` downloads
  every entry's SVG and details from bioart.niaid.nih.gov, `crops` measures each drawing in
  headless Chrome and writes `scripts/bioart-crops.json` (the part of its page a drawing covers),
  `build` writes the packs. `scripts/stats-reference.R` works out the reference values of the
  statistical tests in R and writes `tests/stats-reference.json` (run it again after changing it).
- `tests/` unit tests (vitest + jsdom). `public/` web manifest, service worker, app icons.

## Conventions

- British/neutral scientific English in the interface; sentence case; plain words over jargon.
- Touch targets at least 40 px on touch devices; nothing may depend on hover, right-click or a keyboard.
- Icons come from publicly available collections, as packs built by the scripts in `scripts/`.
  Do not draw new ones in code. Tests that need pack icons use `tests/helpers.ts` (the real pack
  list, stand-in drawings).
- Prefer a small pure function plus a test over logic inside a React component.
- When using the Claude API, check current model names and request shapes before editing
  `src/ai/client.ts`; they change between model generations.

## Known gaps (good next tasks)

- Icon packs (84 MB in `public/icon-packs/`): the CC0 folder of Bioicons (438 icons) and its
  CC BY 3.0 folder, which is Servier Medical Art (1,298 icons, files over 200 kB left out), both
  from commit d29e766 (June 2026); and NIH BioArt Source (763 icons in nine packs, 28 MB, all
  public domain, drawn by NIAID's medical illustrators, taken from the site on 19 November
  2026). Not imported: Bioicons CC BY 4.0 (885 files, 313 MB) and share-alike (39), Reactome.
  Downloading more needs the owner's go-ahead and a licence check per collection.
- NIH BioArt, what was left out of its 957 entries: 93 whose SVG holds an embedded photo or
  texture, 44 larger than 300 kB after cleaning (mostly whole scenes), 28 from the Human
  Reference Atlas whose page names no licence, 28 with no SVG (brushes, swatches, templates),
  and one arrow whose SVG lacks its arrowhead. Each entry comes in up to a dozen colours; only
  the first (full colour) is taken. Glows and drop shadows are dropped with their filters, so a
  few icons look flatter than on the NIH site. Every icon was looked at once on a contact
  sheet in the browser and five were compared with NIH's own preview; the owner has not
  reviewed the set. New entries appear on the site over time: run `fetch`, `crops`, `build` again.
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
- Exported files were opened and compared once (19 November 2026): six figures built for it
  (every arrow end fading in and out, straight, curved and right-angled; every line style on
  arrows and outlines; every shape with words; eight charts with brackets, numbers in bars, point
  shapes, see-through points, lines at values, a logarithmic axis and a volcano plot of 5,000
  genes; 91 icons from 16 packs, turned, mirrored, recoloured; a picture, membranes, a pen
  stroke; the pathway WP554; both examples), then all 198 icons that are shaded by mixing. Each
  SVG was drawn by Chrome, Firefox and Safari's engine (QuickLook) and compared, pixel by pixel
  after a slight blur, with the PNG the app made; each print page was turned into a PDF by Chrome
  (one page of the right size, fonts embedded) and compared the same way. After the fixes named
  under "Decisions" and "Things that bit us once" they agree, down to fine hatching, which Chrome
  draws lighter on screen than the others at small sizes. Not done: Inkscape and Illustrator are
  not installed on this Mac, so no file was opened in a drawing program. PowerPoint for Mac was
  seen through a screenshot the owner took of the figure with arrows, line styles, shapes and
  lettering: it draws the SVG itself (not the PNG), the picture sits where `fitOnSlide` puts it,
  and it matches the app's PNG to 99.9 %, fades, dotted arrows and raised text included. Two
  small differences there: on the outline of a rectangle the dashes begin at another point, and
  the dots of a dotted outline are finer. A second screenshot, of the 91 icons, showed what
  PowerPoint cannot draw: shapes that mix (see "Decisions"); gradients, clips, masks, patterns,
  mirrored and recoloured icons and the placed picture looked right at the size of that
  screenshot (about 50 pixels an icon), which is too small to judge fine detail. The file with
  those icons as pictures matches the page in the three browser engines and, in a third
  screenshot from PowerPoint, the app's PNG: no icon differs by more than 2 % of its area. One
  thing is left open: the thin outlines of the 12-well plate (0.91 units wide) look fainter in
  PowerPoint, which may be the small size of the screenshot or PowerPoint itself. Charts have
  not been seen in PowerPoint. QuickLook reads
  the .pptx and shows the slide. The system's print window and the
  download buttons of the Export dialog were not clicked.
- Icons shaded by mixing look right only in programs that know `mix-blend-mode` (browsers,
  Inkscape 1 and later, Illustrator). A program that does not paints the shading as plain
  covering shapes; for PowerPoint such icons are stored as pictures, for the downloaded SVG
  nothing is done. A picture of an icon is made on a see-through ground, so where its shading
  lies over another object of the figure it covers that object faintly instead of darkening it. Twelve Bioicons link to something their file
  does not have: in two (agarose gel, GPU) a gradient, and those parts are left empty.
- What was added on 19 November 2026 after the export check (formatting on arrows, shapes that
  grow, missing icons, a pathway into the open figure, stacked bars, dose-response curves, the
  two-way analysis, the text for the methods, asking Claude for an analysis, the dialogs as
  separate files) was each tried once in the browser pane at a small desktop size, with data
  made for the purpose. Not done: a tablet-sized window, any exported file with these parts, a
  real reply from the Claude app for the analysis (hand-written answers only, so it is not known
  how well Claude keeps to the form or which questions it asks), and no independent review of
  the new arithmetic beyond the values pinned to R.
- PDF export and the "Copy sketch image" button were not clicked through in testing (they open
  system windows); their page content and data are unit-tested.
- Library after the change (November 2026): the library opens by fetching the NIH cells pack
  (3 MB) the first time, where it used to show icons at once. With the pack list unreachable
  (first visit offline) the library shows only the figure's own icons and the AI is told to use
  boxes. Subjects the old drawings covered and the collections may not: simple labelled
  molecules (ATP, Fe²⁺, ROS: the examples now use boxes), a phospholipid, generic "figure
  helper" marks. Icons from different collections differ in style and line weight.
- AI with the collections: tried in the browser with hand-written answers only (a new figure with
  icons from three packs, then a change that swapped one icon and added another). Not tried with
  a real reply from the Claude app or the API, so it is not known how well Claude picks from 763
  names, or keeps to the `pack--entry` form.
- Figures made with the deleted drawings: each such icon is a dashed box with a question mark,
  in the editor and in exports, and the AI is not told about it when the figure is changed. A
  message says so when the figure is opened and the panel explains it; a library icon can take
  the box's place, one box at a time. The old drawing itself is only in git history.
- Fading arrows: the fade was looked at in the exported SVG, PNG and PDF (see the export check
  above), not in Inkscape, Illustrator or PowerPoint. On a
  curved or right-angled arrow the fade follows the straight line between the two ends, not the
  path. An arrow has one end type: separate marks for the start and the end are not offered
  (only "double" has heads at both ends).
- Text inside a shape: the shape grows downwards when the words or their size change, not when
  it is made narrower by hand (then the words can run past it until they are edited), and it
  never shrinks again by itself. A single word wider than the shape is not split. Typing in place on a turned shape happens in an upright box, and the box breaks
  lines by the browser's rules, which can differ by a word from the drawn result. Line styles
  were looked at in the exported SVG, PNG and PDF, not in a drawing program or PowerPoint.
- Shapes: arrows meet a cylinder and a bracket at their box, not their curved outline; the
  callout's pointer and the bracket's direction are fixed (turn the shape to change them); the
  AI can only ask for boxes, ovals and frames. The symbol picker is in the side panel only, not
  beside a label being typed in place, and arrow labels have none.
- Charts: no two-way layouts
  beyond category × series, no bars stacked to 100 %, no curve fitting other than a straight
  line and the dose-response curve, no confidence band on a dose-response curve (a straight line has one). Stacked bars
  show means only. The dose-response curve has four free parameters: a plateau cannot be fixed
  (at 0 or 100) for one series only: what is held is held for every series of the chart; the response
  is fitted as measured even on a logarithmic value axis, and the interval of the EC50 is the
  asymptotic one, which is too narrow with few points. A plateau can be held, but the Hill slope cannot. Choices a reviewer questioned and that stand as stated
  behaviour: on a logarithmic axis the box plot's quartiles and fences, and a bar's mean and SD,
  are worked out on the plain values (the violin's density and the fitted line on logarithms);
  an error bar that would reach zero stops at the bottom of a logarithmic axis; a range set by
  the scientist cuts data off at the plot's edge without a note. A lone comma in a table is a
  decimal comma unless the table writes decimals with a point elsewhere (a notice says when that
  is a guess). An independent review (four reviewers, each finding cross-checked) ran once and
  its confirmed findings are fixed and tested in `tests/chart-review.test.ts`; the fixes
  themselves were not reviewed again.
- Chart looks, table import and the instruction box (November 2026). Tried in the browser on a
  desktop and a tablet-sized window: a volcano plot built from typed instructions, a palette, one
  group's points, and files given to the file input by script (a quoted CSV, an Excel file written
  by openpyxl, a file that is no table). Not done: the system's file picker was not clicked
  through; no workbook saved by Excel itself, Numbers or LibreOffice was opened (the test file
  keeps texts inline, Excel keeps them in a shared list, which only a hand-built workbook covers);
  nothing on an iPad.
- Chart looks, what is missing: a single point cannot be styled or named by clicking it (names
  come from the table, styles from its group); names of points can still sit on points in the thickest part of a cloud and can cross reference lines, and their leader lines can cross other points;
  the legend inside the plot can cover data; reference lines have one colour; only the first
  sheet of a workbook is read and dates arrive as Excel's day numbers; old .xls files are refused.
- Numbers at the groups (November 2026): tried in the browser on a desktop, a tablet-sized and a
  phone-sized window with the sample chart (bars with error bars and dots, boxes with a bracket).
  One setting for the whole chart: a single group cannot have its
  own number, colour or place, and only one number is written per group. Inside a bar with dots
  the number stands at the foot, which the dots of small values can still reach. A light colour
  chosen for numbers that end up above the groups is reported, not changed.
- Info notes: only the properties panel has them. The dialogs (AI, export, figures, pathways) and
  the icon library still show their help as text. Tried with a mouse (hover, press, Escape) and
  with presses in a phone-sized window with touch emulation; not on an iPad, and not with a
  screen reader. Moving the mouse from the button to a note across the panel takes longer than
  the note waits: press the button to keep it open (needed to press an example in the note of
  the instruction box).
- Instruction box: a fixed vocabulary in English. It does not know "undo", colours by shade
  ("light blue"), rotation of names, or anything the panel cannot set. A group whose name holds
  " and " or a comma is not recognised inside a longer sentence. Several values for one line are read when they follow each other ("x = -1 and x = 1", "x = ±0.58"). Asked for a test by name, it
  runs the test of that family that fits the number of groups and says which. Open-ended requests
  through the copy-paste AI route are not built.
- Heat maps and Venn diagrams (20 November 2026). The z-scores and the correlations are checked against R (`scale`, `cor`) in `tests/heatmap-venn.test.ts`; a figure with five heat maps and four Venn diagrams (row names, a gap, scaled rows on a logarithmic scale, both kinds of correlation, 60 rows, upright column names, lists, sizes, shares, a turned diagram) was exported and its SVG, PNG and PDF agree in Chrome, Firefox and Safari's engine. Tried in the browser pane at a desktop size with made-up data; `docs/heat-maps-and-venn.biosketch.json` is that tour as a figure. Not done: a tablet-sized window, PowerPoint, a real table of thousands of genes, a workbook from Excel. Missing: more than 24 columns or 400 rows, a colour for empty cells, names of rows typed over in the panel (they are changed in the table), p values of the correlations; Venn diagrams of four or more sets, circles sized by the counts, the names of the members written in the diagram. A name with a space in a list of one column is read as two names (the table is then split at spaces). The instruction box knows the two kinds by name and nothing else about them.
- Pressing a part of a chart (20 November 2026): tried with the mouse in the browser pane on grouped bars (a bar, an error bar, a bracket), a dose-response chart (the curve, an axis, the legend) and a Venn diagram (a part, a number, the title under its handle). Not tried: a finger or a pen, a turned chart on the page (the geometry is tested), a volcano plot of thousands of points. A line of a value is known by its place among the lines that are drawn, which is its row in the panel unless one of the stored lines cannot be drawn. A press does not start typing on the page: a title is typed in its box in the panel, which takes the cursor. Parts cannot be dragged, and only charts have them.
- Names typed over under “Look” (20 November 2026): tried in the browser pane on a grouped chart (a series, a refused name, a category, Undo) at a desktop size only. A typographic minus in a name becomes a hyphen, as it does in a name read from the table. There is no symbol picker beside the box.
- Headings of the chart panel (20 November 2026): tried in the browser pane with the tour figure (grouped bars, a dose-response chart, a paired chart turned into a pie, stacked bars, survival curves) at a desktop, a tablet-sized and a phone-sized window, with the mouse, the arrow keys and script presses; not on an iPad and not with a screen reader. The Statistics heading of a chart with a test is still long (the suggestion, the result and the pairs). The heading is not stored: after a reload a chart opens on Data. The other objects (shapes, arrows, text) have no headings; their panels are short.
- Resizing the properties panel was dragged with the mouse in the browser pane (desktop and
  tablet-sized window), not with a finger or pen on an iPad. The icon library cannot be resized.
- Statistical tests (November 2026). Dunnett's test is used after a one-way ANOVA only (each group with the first
  now uses it, see "Decisions"; it is not offered after the tests on ranks or the repeated-measures analysis, which still use Holm), a correction for sphericity in the repeated-measures ANOVA, Student's t
  test with equal variances, correlation for scatter charts, effect sizes and confidence
  intervals. For two factors: no test on ranks, no repeated measures, no Tukey over all
  combinations, no test of one factor at a time; a table with an empty combination is refused. On a
  logarithmic axis tests use the values the chart shows (above zero), as typed, not their
  logarithms. Holm's correction always counts every pair that is compared (all pairs, or each
  with the first), not only the pairs that have a bracket. The suggestion rests on one check
  (Shapiro–Wilk on the residuals), which is weak with few values and is a pretest; the box says
  so. Tried in the browser with the sample chart on a desktop and a tablet-sized window, results
  compared with R by hand there too; not tried on an iPad, and no
  independent review of the arithmetic beyond the pinned values.
- Where BioSketch and R differ on purpose: R's `ptukey` is approximate for a large range with
  two or three degrees of freedom and beyond 25000 degrees of freedom (those points are checked
  against SciPy); R's signed-rank test does not see ties between changes that are equal on paper
  but not in binary (4.1 − 6.9 and 4.9 − 7.7), BioSketch rounds differences to 12 digits and the
  reference runs R with `digits.rank = 12`.
- Added on 19 November 2026, second round (bars to 100 %, pie charts, marks at both ends of an
  arrow, correlation, held plateaus and the comparison of EC50, survival curves): the arithmetic
  is pinned to R; a figure with one of each was exported and its SVG, PNG and PDF matched in
  Chrome, Firefox and Safari's engine; the panel was looked at once at a desktop size. Not done:
  a tablet-sized window, PowerPoint, and nothing was clicked through by hand beyond selecting
  each chart.
- Survival curves: no table of subjects at risk under the plot, no test other than the log-rank (no Gehan-Breslow-Wilcoxon); times are numbers, not
  dates; a status other than 1 or 0 is left out with a notice. The curves are drawn in per cent.
- Pie charts: no doughnut, no pulled-out slice, no names written beside the slices (the legend
  names them); the order is the order of the table.
- Correlation: no confidence interval of r, no Kendall's tau, and no correlation across series.
- Asking Claude for an analysis: Claude can only choose among what BioSketch works out; for
  anything else it says what would be needed and nothing is set. There is no API-key route for
  it, the description is not kept after the dialog closes, and the plan's words are not stored
  with the chart.
- Pathway import (November 2026). Tried in the browser with the live WikiPathways list and two
  pathways (WP554, WP179), each compared by eye with the picture WikiPathways publishes, on a
  desktop and a tablet-sized window; a file was given to the file input by script. Not done: the
  system's file picker, an iPad, a file saved by PathVisio itself, and the
  other 2,200 pathways. Not read: GPML 2021 (PathVisio 4) and formats before 2010a, which are
  refused with a message; SBGN, Reactome, KEGG (its licence needs checking first).
- Pathway import, what is simplified (the dialog lists what applies): an arrow that ends on
  another arrow is a free end at that point and does not follow the other arrow; one end mark
  per line; all arrow-like marks (conversion, stimulation, binding, transcription) are plain
  arrows, catalysis is a dot; a line with several corners is one curve; a right-angled line
  takes at most two corners; organelle outlines are plain ovals and rounded boxes; a complex is
  a rounded box, not PathVisio's cut-corner outline; the direction of a brace was not checked
  against PathVisio; literature references, database identifiers, comments and the legend are
  left out. A pathway added to the open figure lands in the middle of the window, on top of what is there. There is no
  panel control for `legs` or for an end's port: they come from the import only.
- Resize everything together: the words on an arrow have one size (14) and do not follow; an
  arrow head has a smallest size, so on thin lines it grows less than the rest; the gap between
  an arrow and its object stays 6; a chart's lettering stops at 6 and 60; a printed width that
  is set stays, so the printed figure is unchanged. After Undo the page is back but the view
  stays where the resize put it. Tried in the browser on an imported pathway (whole figure and
  a selection of all objects), not on an iPad.
- Reshaping an icon: curve handles cannot be set separately, points cannot be added or removed,
  and the handles were dragged with simulated pointer events only.
- PowerPoint export was opened in PowerPoint for Mac only; Keynote and Google Slides (which use
  the PNG fallback) were not tried.
- Slides and presenting (20 November 2026). Tried in the browser pane with the mouse and the
  keyboard at a desktop size: adding, copying, dragging a slide to another place, deleting, Undo
  and Redo across slides, Page Up and Page Down, typing in a label and then opening another slide,
  presenting with the keys, presses and the cross, a reload. The row and the top bar were looked at
  in a tablet-sized and a phone-sized window too, and the built app offline (the row, presenting,
  the Export, AI and My figures dialogs). A figure of three slides was exported: Chrome makes a PDF
  of three pages of the page's size with the fonts embedded, the ZIP files and the PowerPoint file
  are well-formed, and QuickLook shows the first slide of the PowerPoint file. Not done: full
  screen itself (the pane refuses it, so the slides filled the window), a finger or a pen (what a
  press and a swipe mean is unit-tested only), an iPad, the PDF of several pages in Firefox and
  Safari, Keynote and Google Slides. **The PowerPoint file with several slides was not opened in
  PowerPoint**: PowerPoint did not answer and its window could not be looked at. Missing: speaker
  notes and a presenter view, a pointer, transitions and objects that appear one by one, a colour
  of its own for one slide (the page is the figure's), names for slides, hiding a slide, selecting
  several slides, copying a slide into another figure, cropping when all slides are exported. On a
  touch screen a slide is moved with the buttons, not by dragging. The AI and the pathway importer
  work on the open slide and know nothing of the others. After Redo the editor can show another
  slide than the one the change was made on. The first press where the hidden buttons of a
  presentation are only shows them. `docs/slides-example.biosketch.json` is a figure of four
  slides to try it with.
- The tour of the features (20 November 2026). Every slide was looked at once in the presenter in
  the browser pane (about 1000 wide), three of them again after changes; it was opened from the
  File menu, the start card and Help, and from the File menu in the built app without a connection
  (after the cells collection had been fetched once). Its twelve slides were exported together:
  Chrome makes a PDF of twelve pages of the right size, and two of them were looked at. Not done:
  nothing on a tablet-sized or phone-sized window, and no reader other than me has followed it. Its words name buttons and headings of the panel as they are
  called today: when a label in the interface changes, the tour must be changed by hand, no test
  ties the two together. It is in English only, is not shown by itself on a first visit, and a
  first visit without a connection cannot open it (its icons are fetched). Shown by words alone,
  without an example to try: splitting and reshaping an icon, placed pictures, the instruction
  box, the text for the methods, asking Claude for an analysis, the AI dialog, importing a
  pathway. Not in it at all: volcano plots and names of points, the comparison of EC50, pie
  charts as an example, missing icons, the page's printed width as an example. Every tour that is
  opened is a figure of its own (about 320 kB) under My figures until it is deleted.
- Added on 20 November 2026 in one long batch, each tried once in the browser pane at a desktop
  size with the mouse: text boxes (a layout slide, its side handle), slide layouts and a saved
  template made the start of new slides, the colour and notes of a slide, an object appearing on
  a press, the speaker's view, both themes (the editor, the Export and Help dialogs, the File
  menu), favourites, a table, a clustered heat map, bands on a fitted line and on survival curves,
  the hazard ratio in the panel, the template list with the previews of the timeline, the
  workflow, the graphical abstract and a poster, and projects in My figures. The built app was run
  once without a connection: the editor, the row of slides and the list of templates open, and a
  template whose icons were never fetched says so. Not done for any of them: a tablet-sized or
  phone-sized window, touch, an exported file looked at in another program, PowerPoint. The second window for the projector could
  not be opened by a test (the pane blocks windows opened by scripts), so it has never been seen.
  The dark theme was looked at on those few screens only: a spot with dark text on a dark ground
  may be left somewhere (the chart panel's notices, the AI and pathway dialogs were not checked).
- What those parts do not do. Text boxes: no vertical alignment, no numbered lists, bullets of
  one level; typing in place shows the words without their bullets. Tables: cells are edited as
  text in the panel, not on the page; no merged cells, no colour per cell, no column widths set by
  hand, rows share a height that was set by hand. Slide templates: kept per browser; an icon that
  needs a credit keeps it. Presenting: one press per step, no animation, the PDF and PowerPoint
  export show every slide complete. Clustering: one distance and one linkage, at most 400 rows
  (the search is the plain one, cubic in the rows). Bands: none on a dose-response curve.
  Dunnett's test: after a one-way ANOVA only. Hazard ratio: against the first group only, with a
  Wald interval; it assumes proportional hazards and does not test that. Projects: headings in
  the list only; a project cannot be saved or sent as one file. The tour of the features does not
  show any of this yet.
- The first load grew to 675 kB (`src/templates.ts`, the table and the layouts are in it); the
  templates could be fetched with the dialog that shows them.
- No real-time collaboration (Yjs is the planned route if needed).
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
- A chart is laid out and drawn again only when something other than its place changes (`layoutKey`, `ChartMarks` in `src/render/DocNodes.tsx`). With a volcano plot of 16,000 points every move of the chart otherwise laid it out and redrew every point; now a move is a few milliseconds, a resize about 100.
- What belongs to a group of a chart (its colour, its brackets) follows the group by name when
  the table is edited (`carryOver`), never its place in the table: a bracket once moved to a
  different pair of groups when a column was inserted.
- Anything the chart panel can store must survive `validateDoc` unchanged, and be drawn by the
  same rule (`usableEnds`), or the chart changes when the figure is reopened.
- A column of a chart's table with an empty or unreadable cell keeps the row of each value
  (`rows` on the group). Without it the values below a gap slide up, and a paired test compares
  the wrong rows without any sign of it. Whatever builds or filters a group's values must treat
  `rows` with them (`readTable`, `tableText`, `validateDoc`).
- In the instruction box a colour word with no group named colours every group. A clause about
  lettering ("text white") must be taken by the reader of the numbers at the groups before the
  reader of points sees the colour: once, asking for white text turned every bar white. Words
  for what stands on the chart ("in each box", "the bars") must be taken there too, or the
  reader of chart kinds changes the chart.
- Titles typed into the instruction box keep the scientist's characters (a typographic minus in
  "−log_{10} p"); only the copy that is searched for phrases is lower-cased and normalised.
- An arc in a path cannot follow a dragged end point (its radius stops fitting); reshaping turns
  arcs into curves first (`curvesOnly`).
- A pack icon used in a figure is stored in the figure too; lists that show both must not show
  it twice (`LibraryPanel`).
- SVG files from other programs (`parseSvgFile`): some write every element with a prefix
  (`<ns0:path>`) and links between their own parts under another (`ns1:href`). The prefix is
  taken off the elements (`plainSvgNames`) and a link is recognised by its namespace, not its
  spelling; once, such links were dropped and every clipped part of a drawing vanished. Any
  check on the raw text must allow for the prefix too (the importer's test for embedded pictures).
- Illustrator writes a fade as a mask drawn through a filter that inverts it. Filters are not
  kept, so the inversion is worked out when the file is read (`bakeNegativeMasks`); without it
  the drawing is hidden exactly where it should show.
- An imported drawing often sits on a page far larger than itself. Pack scripts cut each icon to
  its drawing with boxes measured in a browser, inside clip paths and masks (`crop` in
  `import-icons.mjs`, `bioart-crops.json`); never guess the box from the file's view box.
- A drawing can hold the same outline several times (filled, and again inside clip paths for
  shading). Anything that edits shapes must treat those copies as one: Reshape shows one set of
  points per shape and moves every copy (`reshapablePaths`, `movePoint`).
- In the instruction box the reader of tests takes the word "rank" for a test on ranks: anything
  with a name that holds it ("log-rank") must be read before `readTest`.
- A test file used `pie` as its example of a kind of chart that does not exist, until it did.
  A made-up value in a test should be one that cannot become real.
- `quantile` in `src/model/chartStats.ts` wants its values sorted: the median in the request for
  Claude was once taken from the table's order. Sort first, as `boxStats` does.
- Whatever the main screen imports from a dialog's file pulls that whole file, and the export
  code behind it, into the first load: saving a figure file needs `download` only, which is why
  it has a file of its own. After a change to imports, look at the sizes `npm run build` prints.
- With the dialogs in files of their own the offline test has a second half: stop the server,
  reload the built app, and open every dialog.
- Browsers do not agree on what a clipped group is. Chrome and Firefox paint it on its own
  first, so a shape inside it that should darken what lies beneath the group (`mix-blend-mode`)
  darkens nothing; Safari lets it through. Icons are settled when they are read so that this
  no longer matters (`settleShading`); anything new that clips or mixes must be looked at in
  Safari's engine too (`qlmanage -t` draws an SVG with it), not only in Chrome.
- A fill or outline that points at a gradient the file does not have is left empty by Chrome
  and Firefox and painted black by Safari. `dropDanglingEffects` sets it to `none` (or to the
  colour the file writes after the link).
- Exported files are read by programs that are not browsers: keep links as `xlink:href`, and
  gradients and clips inside `<defs>` (`tests/export-files.test.ts`).
- Whatever looks at the whole figure (which icons are in use, how many objects it has, resizing
  the page) must take every slide (`everyNode`, `mapSlides` in `src/model/slides.ts`): `doc.nodes`
  is the open slide only, and the piece of a reshaped icon that only another slide uses would be
  thrown away. Replacing the whole figure from inside the editor (`loadDoc`, the examples on the
  start card) is right only for a figure of one empty slide.
- Slides are stepped through with the arrow keys: the owner pressed them after a press on a slide
  in the row and nothing happened, because the arrows only moved selected objects and the slides
  wanted Page Down, a key a laptop does not have. A key that has nothing to do (arrows with
  nothing selected) should do what the scientist expects of it.
- What is optional in a figure must be absent, not `false`, to come back from a file as it was:
  a template that wrote `bullets: false` failed the round trip. Write a flag only when it is on.
- A test must not expect something of every template that only the example figures have (arrows
  that are all attached, a name in every box): filter by `group` when templates are added.
- A button must not carry the class of a layer that covers the window: the Present button of the
  top bar once had the class of the presentation layer and lay over everything (found in the
  offline test of the built app). The layer is `.presenting`, the button `.present-btn`.
- Words on the page are read for the marks of labels wherever they stand: a line of the tour that
  explained the marks by showing them (a star on each side, `^` with curly brackets) was itself
  set in italics and raised. Say marks in words, and show the result in a label beside them.
- In a pathway file a group of the style "Group" is a stack of molecules with nothing drawn
  around it, and a group without a style is the one with the dashed outline: the names suggest
  the opposite. An arrow to an undrawn group is attached to the member it reaches. Whatever is
  changed in the importer, compare the result with the picture WikiPathways publishes
  (`…/pathways/WP554/WP554.png`): two wrong routes and one merged triple arrow were only found
  that way.
