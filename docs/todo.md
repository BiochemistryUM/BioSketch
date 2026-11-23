# BioSketch to-do list

Started 20 November 2026, while the app is being tested by the group. Tick an item when it is done,
and move anything decided along the way into `CLAUDE.md`. What was tried and what was not, for
features that exist, stays under "Known gaps" in `CLAUDE.md`.

## How the new features fit in (agreed in outline, 20 November 2026)

The owner wants all of the features below without the interface filling up with options. Rules:

1. **One small group of icons in the top bar, after "Slides"**, and no more than four: *Add*
   (opens the gallery below), *Import*, *Calculators*, *Search*. Each has a tooltip and, in a
   wide window, its word beside it; in a narrow window they fold into one "More" button. Touch
   targets stay 40 px. Nothing else new goes into the top bar.
2. **"Add to the page" becomes a gallery** (also opened by *Add* in the top bar). It is a sheet with a search box and a
   picture for every kind of object, sorted under a few headings:
   - *Basics*: text, shape, picture, table, panel letter
   - *Charts*: bars, boxes, violins, points, pie, heat map, Venn, UpSet, line trace
   - *Analyses*: dose-response, standard curve, enzyme kinetics, binding, melting curve, qPCR
     (ΔΔCt), survival, purification table
   - *Molecules*: chemical structure, protein structure, domain and mutation diagram
   - *Sequences*: alignment, sequence logo, plasmid map
   - *Gels and blots*: gel or blot panel
   Each choice puts a working example on the page with "paste your numbers here" filled in, so
   the scientist sees the result before reading any setting.
3. **An analysis is a chart with a purpose.** Standard curves, kinetics, binding, melting and qPCR
   are chart kinds under "Analyses", using the four headings the chart panel has now (Data,
   Statistics, Look, Axes). The settings of an analysis show only when that object is selected;
   the rarely used ones sit under "More" inside their heading.
4. **One import dialog.** *Import* in the top bar (and File › Import…) opens one dialog with a tab per source: pathway
   (WikiPathways, Reactome, a GPML file), structure (AlphaFold DB, PDB), molecule (PubChem by name
   or SMILES), sequence (GenBank, FASTA), table (CSV, Excel), SVG icon. It replaces "Import a
   pathway…" and "Import SVG icon…".
5. **Lab calculators** (molarity, dilution, mass from molecular weight) are tools, not objects:
   *Calculators* in the top bar, a small dialog with one tab per calculator.
6. **Search finds actions too.** Typing "ATP" in the library offers the NIH icons *and* "Draw the
   structure of ATP"; typing "standard curve" offers to add one. *Search* in the top bar (and
   ⌘K on a keyboard) does the same, so a feature can be found without knowing where it lives.
7. **Any table in, one check step.** No standard format is required. Every analysis reads the
   common layouts: one row per well (what qPCR machines export: well, sample, target, Cq), one
   column per sample with replicates under it, and a 96- or 384-well plate grid from a plate
   reader. BioSketch guesses what each column is from its heading and contents ("Cq", "Ct",
   "OD", "Abs", "conc", "Target", "Sample") and shows the guess as a row of choices above the
   table ("this column is: standard concentration ▾"), which the scientist corrects with one tap.
   For a plate, the wells of the standards and blanks are marked on a little plate picture.
   Nothing is guessed silently: what was not read is listed, as charts do now. Exports of the
   common machines (Bio-Rad CFX, QuantStudio, LightCycler, plate readers) are kept as test files.
8. **Figure first, not a workbench** (agreed 21 November 2026). An analysis is added only when a
   biologist would put its result straight into a figure or a methods section, and its settings
   fit under one heading of the panel. BioSketch makes figures and the words that go with them;
   it is not a place to process instrument data, keep a workspace or write scripts. Items that
   would make it one wait under "Later" until the owner asks for them.

Done on 20 November 2026: rules 1, 2 (the headings and the charts that exist today; the other
cards come with their features), 4 (as a list of sources; structures and molecules joined it with
section 2, sequences come with their feature), 5 and 6. Rule 7 came with standard curves (the row of choices above the table; the plate picture is still to
come). Rule 3 applies to every analysis still to build. Rule 7's plate picture came on 21 November
2026. Rule 8 moved four analyses to "Later" the same day.

## 1. Before more people test it

- [x] **Back up all my figures as one file**, and read such a file back. Figures live only in the
      browser: clearing site data, another computer or another browser, and they are gone.
- [x] **Report a problem** in the Help menu: an email with the version, the browser and,
      if the tester agrees, the open figure attached as a file.
- [x] **Show the version** (in Help) and a short "What's new" after an update, so testers know
      which version they are reporting on.
- [x] **Never a white page**: draw the editor first, then open saved figures, with a time limit,
      and show a message instead of nothing when something fails at start.
- **Password in front of the site** (Cloudflare Pages with Cloudflare Access): skipped at the
  owner's request (20 November 2026). The site stays public on GitHub Pages.
- [ ] Try the AI route with real replies (needs the owner: a person has to paste the request
      into the Claude app) from the Claude app (new figure, change a figure,
      "Plan first", asking which analysis fits): so far only hand-written answers were used.
- [x] Look over the dark theme in the dialogs not yet checked (AI, pathways, chart notices).
      Done 20 November 2026: AI, pathways and the new dialogs looked at; chart notices use the
      theme's colours.

## 2. Molecules and structures (asked for by the owner)

- [x] Chemical structures: a name or SMILES looked up in PubChem and drawn as SVG, placed like
      an icon. Drawn by BioSketch itself from PubChem's flat drawing, with no chemistry library
      (20 November 2026).
- [x] Protein structures: search and import from AlphaFold DB and RCSB PDB, with the credit
      AlphaFold asks for; also a .pdb or .cif file from the computer.
- [ ] A molecule that turns while the slides are presented; a still picture on the page and in
      exports (see the design note in `CLAUDE.md`). Kept for last at the owner's request; the
      structure is already drawn as SVG and has its "turn slowly" setting (`spin`).
- [x] Colour a structure by AlphaFold confidence (pLDDT), and mark residues or sites with labels.
- [x] Protein domain and mutation diagrams: domains from UniProt, mutations as lollipops.
- [x] Reaction schemes: substrate → product with the enzyme and cofactors over the arrow.
- [x] Draw a chemical structure by hand (bonds, rings, elements, charges), and change a structure
      from PubChem or one already placed (asked for by the owner, 20 November 2026).
- [x] The letters of a turned or mirrored structure stay upright (reported by the owner,
      20 November 2026).
- [x] The tour of the features: a thirteenth slide, "Analyses and molecules" (standard curve,
      enzyme kinetics, a drawn structure, the four buttons of the top bar).
- [x] The Add gallery as small cards (a symbol and a name), the charts and analyses behind one
      "Chart" card, no membrane card (asked for by the owner, 20 November 2026).

## 3. Biochemistry analyses (each checked against R, like the tests already in BioSketch)

- [x] Standard curves (Bradford, BCA, ELISA with a 4- or 5-parameter fit), and unknown samples
      read off the curve (20 November 2026), also from a plate reader's grid (21 November 2026).
- [x] Enzyme kinetics: Michaelis–Menten (Km, Vmax, kcat), inhibition models and Ki;
      Lineweaver–Burk for display only (20 November 2026).
- [x] qPCR: fold change by ΔΔCt from a table of Ct values, with the error carried through
      (20 November 2026).
- [x] Saturation binding (Kd, Bmax) and melting curves (Tm) (20 November 2026).
- [ ] Reactome import beside WikiPathways (CC BY 4.0; KEGG's licence does not allow it).
- [x] Lab calculators: molarity, dilution (C1V1 = C2V2), mass from molecular weight (PubChem).

## 4. Figures for papers

- [x] Placed pictures (blots, gels, micrographs): crop, lane labels and a kDa marker ladder (21 November 2026).
- [x] Scale bars for micrographs, set from the size of a pixel (21 November 2026).
- [x] Panel letters (A, B, C …) placed and kept in order automatically (21 November 2026).
- [x] A colour-blind preview of the whole figure, not only the chart palettes (21 November 2026).
- [x] A journal check before export: smallest text size, line widths, resolution of pictures (21 November 2026).

## 5. Charts and statistics

- [x] Survival curves: the table of subjects at risk under the plot (21 November 2026).
- [x] Effect sizes and confidence intervals beside every test (21 November 2026; none yet for
      the two-way analysis, and the pairs after tests on ranks have no interval).
- [ ] Sphericity correction for the repeated-measures ANOVA.
- [ ] UpSet plot, for more than three sets (Venn diagrams stop at three).
- [ ] p values of the correlations in a heat map.
- [x] Facets: one chart split by a column of the table into small panels with a shared axis
      range (or one per panel), one legend, the axis titles once (asked by the owner,
      20 November 2026).
- [x] Paste a table and BioSketch suggests the charts that fit it, drawn small from the
      scientist's own numbers, with a line on why (rules, no AI; asked by the owner, 20 November 2026).
- [x] qPCR: p values or stars on the chart, efficiencies worked out from a dilution series, a
      paired design (each treated sample with its own control) (20 November 2026).
- [x] qPCR: a picture of the plate (96 or 384 wells) from the wells the table names, coloured by
      condition, sample or target, with remarks ringed, and put on the page (20 November 2026).
- [x] Standard curves: a plate grid from a plate reader pasted as it is, with standards, blanks and
      samples marked on the picture of the plate (21 November 2026).
- [x] A statistics report of the whole figure: every test with n, statistic, p, effect size and
      interval as CSV, or every chart with its methods as text (21 November 2026).

## 6. Editing

- [ ] The symbol picker beside a label typed on the page, and for arrow labels.
- [ ] Text boxes: numbered lists, vertical alignment.
- [ ] Tables: cell colours, merged cells, column widths.
- [ ] Resize, turn and connect objects from the keyboard.
- [x] Copy style and paste style (⌥⌘C, ⌥⌘V) between objects (21 November 2026).

## 7. Presenting

- [x] A panel for animations (asked for by the owner, 23 November 2026; built the same day):
      "Animate" beside "Slides". Fade, fly, wipe and zoom, coming in and going, a side and a
      duration, the order of play with "together with the row above", a preview that plays the
      slide, and the presenter plays them.
- [ ] Animations in the PowerPoint export (its timing XML, `p:timing`).
- [ ] Slide transitions and motion paths: not built; decide whether they fit rule 8 first.

## Later

Parked by rule 8 on 21 November 2026: they turn BioSketch towards processing instrument data.
Taken up again only when the owner asks.

- [ ] Purification table: yield, specific activity, fold purification worked out.
- [ ] Line traces from instrument files: chromatograms with fractions, UV-Vis, CD and
      fluorescence spectra.
- [ ] Band quantification on a placed blot, normalised to a loading control, into a chart.
- [ ] Sequence alignments with conservation colours, sequence logos, plasmid maps from GenBank.

Other:

- [ ] Working on one figure together (real time); Yjs is the planned route.
- [ ] Sharing a figure or a project as one file to send to a colleague.
- [x] Fetch the templates and the properties panel only when needed (first load from about 855
      to about 570 kB, 21 November 2026).
