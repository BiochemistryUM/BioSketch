# Suite plan: splitting BioSketch into a set of tools

Status: agreed with the owner on 27 November 2026; this repository is restructured in place.
Done so far: step 1, the chemistry package (`packages/chem`, imported as `@biosketch/chem`). The app
itself still lives at the top of the repository (`src/`); it moves to `apps/sketch` when a second
app exists.
Paste this file as the first message of a new session, or keep it in `docs/` so every session reads it.

## Goal

BioSketch has grown beyond drawing. The data analysis, charts and chemistry are large enough to be
tools of their own, and a lab notebook is wanted as a third tool. The tools should link to each
other and to Claude.

## Decision: one repository, several packages, several apps

Not three repositories. One person maintains this; separate repositories would mean separate
dependency trees, separate CI and version skew whenever shared code changes. One repository with
npm workspaces gives separate websites from shared code, and keeps the rule that one renderer
serves canvas and export.

```
packages/
  core/      types, doc model, richtext, palettes, geometry
  render/    the single SVG renderer (src/render/DocNodes.tsx)
  chem/      molecule.ts, sketch.ts, structure.ts, pubchem.ts, structures.ts (done; reaction.ts
             stays with the app until `core` exists, because it builds figure objects)
  charts/    chart.ts, chartCommands, chartParts, chartSamples, heatmap, venn
  analysis/  qpcr*, kinetics*, binding*, standardCurve/standard*, melt, plate*, survival, blot,
             chartTests, chartStats, distributions, nls, twoWay, statsReport, journalCheck
  io/        export, import, SVG/PNG/PDF
apps/
  sketch/    today's BioSketch (drawing, slides)
  analyze/   data analysis and plotting
  labbook/   the notebook (built last)
```

The link between the tools is the document JSON (`src/model/types.ts`): a chart node made in
Analyze can be placed in Sketch or embedded in a Labbook entry, drawn by the same renderer.

## Order of work

1. Extract `packages/chem` first. It is the smallest and cleanest piece: about 1,070 lines in
   `src/model`, importing only `types` and `nodes`, with its own tests and fixtures. It proves the
   workspace layout. BioSketch must keep working and all checks must pass.
2. Extract `packages/charts` and `packages/analysis` the same way (larger and more tangled;
   `chart.ts` alone is 3,273 lines).
3. Create `apps/analyze` on top of those packages.
4. Build `apps/labbook` last.
5. No `apps/chem` yet: it becomes an app once there is enough to fill one.

## Chemistry: what to build later

- Embed, do not write: a structure editor (Ketcher), a 3D protein viewer (Mol*), cheminformatics
  (RDKit's JavaScript build). Licences and bundle sizes still need checking.
- Write ourselves: reaction schemes and mechanisms as editable SVG; molecules linked to their
  binding or kinetics data from `analysis`; a compound list for the notebook.

## Lab notebook: design notes

- "No server, no accounts, autosave in the browser" does not fit a notebook: entries must survive
  a lost laptop, be readable on a phone at the bench, and carry timestamps that cannot be quietly
  changed.
- Proposed storage: a git repository on GitHub. Entries are files; history gives the dates; the
  app stays a static site that reads and writes through the GitHub API with the user's own token.
- Entries carry structured fields for genome engineering work: editing experiments (target, guide,
  approach, donor, cell line, delivery), clone validation (parent experiment, genotyping method,
  outcome per clone), oligos used. Sequences, oligos and alignments stay in Benchling (free
  academic plan) and are linked by URL. Benchling's API and its Claude connector are not available
  on the academic plan.
- Check with the PI or institution whether a specific notebook is required for compliance or
  patents before treating this as the official record.

## Molecular biology tool

Its own tool, in the spirit of Benchling's molecular-biology side, linked to the notebook by URL
(a guide, an oligo or a clone in an entry points at its sequence). The pure logic is a package,
`@biosketch/seq` (`packages/seq`), begun 27 November 2026 with sequence import.

Sequence import (done, v1): a sequence is a `SeqRecord` (bases, linear or circular, features with
0-based positions), read from GenBank or FASTA text, or fetched from the public databases a browser
can reach. What is reachable was tested from a browser's origin (the CORS header):

- NCBI E-utilities (`eutils.ncbi.nlm.nih.gov`): any accession as GenBank (`fetchRecord`). CORS `*`.
- NCBI Datasets (`api.ncbi.nlm.nih.gov`): a gene by symbol (`findGene`), and its RefSeq mRNA
  transcripts by E-utilities esearch/esummary (`geneTranscripts`). CORS present.
- Ensembl (`rest.ensembl.org`): serves FASTA and gene models with CORS `*`; not called directly yet.
- Addgene (`www.addgene.org`): sends NO CORS header, so a browser cannot fetch it (this is why
  Benchling imports Addgene server-side). A plasmid from Addgene is brought in by downloading its
  GenBank or SnapGene file and dropping it; `readSequences` reads pasted or dropped GenBank/FASTA.

Still to build: the sequence viewer and editor (embed Open Vector Editor or SeqViz, both MIT),
annotation, primer design, alignment (for clone validation: Sanger traces against the reference),
and a page/app to use it.

CRISPR design (decided, not built): guide finding (scan the target for PAM sites) and simple
metrics (GC, poly-T) run in the browser on the sequence in hand. On-target scoring is Azimuth /
Rule Set 2 (Doench–Fusi 2016; BSD-3 but Python 2 and abandoned) — port the model or use a simpler
published rule. Off-target **scoring** is the CFD score (Doench 2016), a small position×mismatch
lookup table, reimplementable in TypeScript. Off-target **search** (finding the sites genome-wide)
needs a genome index and cannot run in the browser for a 3 Gb genome, nor be hosted on GitHub
(the index is tens of GB); for human/mouse it links out to CRISPOR. Small genomes (yeast, microbes,
a plasmid) can be indexed and searched in the browser. Elevation was ruled out: Python 2, abandoned,
needs pickled models plus a separate genome index, and its hosted API is retired.

## Linking to Claude, in order of effort

1. Claude Code on the monorepo: a root `CLAUDE.md` plus one per package.
2. A skill for writing notebook entries in the house format, with plots from `analysis` embedded.
3. An MCP server over the notebook, so Claude in the app can read, write and query entries.
   Build once the entry format is stable.

## Open questions for the owner

- Name of the suite.
- Separate topic, undecided: tracking iPSC lines for the facility (Benchling paid plan with
  Registry and Inventory, or eLabFTW alongside free Benchling). A draft schema for an iPSC line
  record was offered and not yet written.
