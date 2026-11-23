# Icon style sheet

The rules every BioSketch icon is drawn to: semi-flat, accurate shapes, gentle volume, no cartoon outlines.
Keep this open while drawing, and change it here when a rule changes.

## Page

- 512 × 512 px, transparent background, RGB.
- The drawing fills about 90 % of the page (about 26 px margin), centred.
- File name as a biologist would search for it: `Mitochondrion.svg`, `T cell.svg`.

## Outline

- 6 px on large shapes, 4 px on small details. Centred on the edge.
- Colour: the darkest shade of that part, never black.
- Round caps and round joins.
- Thinner from 23 November 2026 (owner's choice, after a sheet at 100, 75 and 60 %): every icon drawn from then on has
  its outlines at 60 % of what the parts give. A script calls `setStrokeScale(0.6)` (`scripts/shapes.mjs`) before it
  draws, and `svg()` writes every stroke-width at that share. Icons drawn before keep their outlines for now; their
  scripts do not call it, so running them again changes nothing.

## Colour and light

- Each part has its own codes (outline, shadow, base, light). A code shared by two parts changes in both when
  the icon is recoloured in BioSketch.
- Light comes from the top left.
- Large shapes: one linear gradient, base at the top left to shadow at the bottom right, two stops only.
- One highlight shape per large part, in its light colour, at the top left. Small parts: flat base, no highlight.
- Allowed: opacity. Not allowed: blend modes (multiply, overlay…), effects (shadow, glow, blur), textures,
  embedded pictures. PowerPoint and BioSketch cannot show them.

## Shape

- Accurate structure, simplified: keep the features a biologist recognises it by, drop the rest.
- Front view, unless the subject only reads in three-quarter view.
- Rounded corners. No faces, no expressions.
- Built from shapes (rectangle, ellipse, pen tool) and Add/Subtract, not freehand strokes.
- Still recognisable at 40 px: zoom out and check before exporting.

## Layers

Name every layer by its part (`outer membrane`, `matrix`, `highlight`). The names become the pieces when an icon
is split in BioSketch.

## Export from Affinity

File › Export › SVG, preset "SVG (for export)". Under More: rasterise nothing, export text as curves, flatten
transforms, set viewBox. Save into this folder.

## Palettes

### Mitochondrion

| Part | Outline | Shadow | Base | Light |
|---|---|---|---|---|
| Outer membrane and intermembrane space | `#A3483B` | `#E07A66` | `#F2A08C` | |
| Matrix and inner membrane | `#C95E4C` | | `#FBD9CE` | `#FFF3EE` |

Proportions, from `Mitochondrion.svg`: the space between the membranes (outline centre to outline centre) is 7.5 % of
the mitochondrion's height, a crista is about 11 % of it wide. They are shares, not pixels: a smaller mitochondrion gets
a narrower space, or it looks swollen.

`Mitochondrial fission.svg`, `Mitochondrial fusion.svg`, `Damaged mitochondrion.svg` and `Mitochondrial network.svg` are
drawn by `scripts/mito-dynamics.mjs` in these colours. `node scripts/mito-dynamics.mjs <folder>` writes them, and a draft of
fragmentation that was not kept, into that folder: write into a scratch folder and copy what is wanted, so a file touched
up in Affinity here is not overwritten.

- Damaged: swollen and round with a wavy outline, a few short cristae still attached, the rest broken off into vesicles,
  the outer membrane torn at the top right (an open outline with ends turned out) and the matrix bulging through it.
- Network: one tube that forks twice, 5 px outlines (the tube is thin), the space between the membranes 9 units so that
  some of it shows between the two outlines, cristae 13 wide and kept away from the forks and tips.

### Golgi apparatus

| Part | Outline | Shadow | Base | Light |
|---|---|---|---|---|
| Cisternae and vesicles | `#2E5E8C` | `#5E93C9` | `#84B3E0` | `#D2E6F7` |

`Golgi apparatus.svg` is drawn by `scripts/organelles.mjs` (`node scripts/organelles.mjs <folder>`): five curved cisternae,
swollen at their rims, two vesicles budding from a rim and six free ones, all in one colour family. The helpers both
scripts share (outlines, distance fields, tracing) are in `scripts/shapes.mjs`.

### Redrawn from SiliCoDraw: the soft look

Icons taken from SiliCoDraw (github.com/Alex-D-C/SiliCoDraw, MIT licence, © 2026 Alexander David Carlsson: keep
`LICENSE-SiliCoDraw.txt` with them, and give that credit when they become a pack) keep their shapes and get a softer
look, chosen by the owner on 22 November 2026 from the cell:

- Pale fills: each part's colours are made in OKLCH from one hue (`soft` in `scripts/colour.mjs`): light L 0.985,
  base 0.93, shadow 0.87 (chroma 0.01, 0.035, 0.055), small parts 0.80 / 0.07, outline 0.60 / 0.10.
- Thick membranes: 12 px on the cell, 10 px on the nucleus (wider than the 6 px of the rest of this sheet).
- Small parts inside (vesicles): flat, in the deeper "small" tone, no outline.
- Two parts of similar colour are kept at least 35° of hue apart (the nucleus is moved 50° from SiliCoDraw's
  blue-violet), so "Shades follow" recolours them separately.

`Cell.svg` and ten cell types (red blood cell, T cell, B cell, neutrophil, monocyte, macrophage, neuron, fibroblast,
adipocyte, cancer cell; saved 22 November 2026) are drawn by `scripts/silicodraw.mjs` (`node scripts/silicodraw.mjs
<folder>`); their colours come from `scripts/colour.mjs`. In the cell types:

- Every nucleus is the same lilac, so the set reads as one family. Thin parts (neuron processes, myelin, the lipid
  droplet, a nucleus of a few units) have 5–9 px outlines instead of 10–12.
- Parts that touch are kept at least 36° of hue apart, which the script checks; checked in BioSketch too, each part is
  its own group under "Shades follow". The B cell's receptors are amber, the neuron's myelin pale blue, the macrophage
  green (SiliCoDraw's purple ran into the nucleus).
- Yellows use `rich` instead of `soft` (more colour), since a pale grey yellow turns khaki; the red blood cell uses `deep`,
  since it is known by its red.
- Shapes are SiliCoDraw's, with a few corrections: the neutrophil's lobes are joined by strands into one nucleus, the
  adipocyte's nucleus lies flat in the rim, the cancer cell's outline is lumpy rather than a sharp star.

Forty-eight more cell types (saved 22 November 2026) are drawn by the six scripts in `scripts/cells/`, eight each
(`node scripts/cells/<batch>.mjs <folder>`), with the helpers both they and `silicodraw.mjs` share in `scripts/cellkit.mjs`
(`page`, `nucleus`, `highlight`, the lilac `NUC`, and `cellTypes`, whose `check()` warns when two parts are less than 36°
of hue apart):

- `immune1`: basophil, CAR-T cell, dendritic cell, eosinophil, mast cell, NK cell, plasma cell, platelet.
- `immune2`: cancer stem cell, haematopoietic stem cell, megakaryocyte, memory cell, regulatory T cell, senescent cell,
  sickle cell, stem cell.
- `nervous`: astrocyte, hair cell, microglia, oligodendrocyte, photoreceptor, Purkinje cell, pyramidal neuron, Schwann cell.
- `tissue`: cardiomyocyte, chondrocyte, hepatocyte, muscle satellite cell, osteoblast, osteoclast, osteocyte, smooth
  muscle cell.
- `epithelia`: ciliated cell, endothelial cell, enterocyte, goblet cell, keratinocyte, melanocyte, pericyte, podocyte.
- `embryo`: blastocyst, cell cluster, compacted morula, morula, oocyte, plant cell, sperm, zygote.

They were drawn by hand transcription of SiliCoDraw's shapes, then reviewed once more for biology, for the look of the
first eleven and for how they read at 40 px. All 48 were read by BioSketch's importer (`parseSvgFile`) with nothing
dropped, and each part is its own group under "Shades follow". What differs from SiliCoDraw:

- Colours moved away from the lilac nucleus where SiliCoDraw's purple or blue ran into it: the NK cell is aqua, the mast
  cell blue with rose granules, the plasma cell green with amber antibodies, the megakaryocyte rose, the osteoclast
  cerulean, the pericyte and the podocyte blue.
- Biology: the megakaryocyte's nucleus is multilobed (one outline round six lobes, like the neutrophil's); the fibre
  under the muscle satellite cell has its nuclei at the edge; the cardiomyocyte's branches are striated; the osteoclast's
  ruffled border lies near the pit; the blastocyst's trophectoderm is a ring of flat cells with a nucleus each; the
  sperm's head is small with a long nucleus; the oocyte's polar body lies in the space under the zona; every second foot
  process of the podocyte hangs from the cell.
- Left as SiliCoDraw has them, although loose: the oocyte shows a nucleus and a polar body together, the zygote has no
  polar bodies, light meets the photoreceptor from the side, the NK cell's nucleus has two sharp tips, the CAR-T cell's
  receptors are arrows, the sperm has no acrosome, the blastocyst has no zona pellucida.
- The tissue script draws some gradients across a shape's own box (`boxGrad`) and the basal lamina over the satellite
  cell as a dashed line (`stroke-dasharray`); the importer keeps both.

| Part | Outline | Shadow | Base | Light | Small parts |
|---|---|---|---|---|---|
| Cytoplasm and vesicles (cell, T cell, monocyte) | `#4986B8` | `#B7D9F7` | `#D5EBFE` | `#F6FBFF` | `#98C3E8` |
| Nucleus (all) | `#9A6CA6` | `#E4C9EC` | `#F2E1F7` | `#FDF8FF` | `#D1B0DB` |

### Proteins of mitochondrial dynamics

Small parts: 4 px outline (2.5 px on OPA1, which has little room), flat base, no highlight. Each protein has its own hue,
so "Shades follow" in BioSketch recolours it apart from the membranes.

| Protein | Outline | Base | Light |
|---|---|---|---|
| Drp1 (fission ring) | `#1F6B66` | `#3FA99F` | `#A8DDD6` |
| Mff (Drp1 receptor, outer membrane) | `#7A5A0E` | `#E2B23A` | `#F6E1A6` |
| Mitofusins MFN1/2 (outer membrane) | `#3F4296` | `#7C80D6` | `#C9CBF2` |
| OPA1 (inner membrane) | `#2F6E2A` | `#6DBA55` | `#C4E8B4` |

## Shared parts (approved 22 November 2026)

Every redrawn icon is built from one set of parts, so that a nucleus, a membrane or an ATP looks the same in every icon.
The owner approved the set as drawn on 22 November 2026. A part is a function in `scripts/parts/`:
`part(g, { x, y, size, turn, id, w, pal, ...options })` returns `{ defs, body, parts }`, drawn in a frame `g` from
`page` of `cellkit.mjs`; every id inside starts with `id`, outlines follow the size on the page, and most parts simplify
by themselves when small. `node scripts/parts/sheet.mjs <folder> [module ...]` draws every part alone (the `DEMOS` of
each module).

- `parts/organelles.mjs`: nucleus (pores, nucleolus, chromatin, oval), endoplasmic reticulum (curved sheets, ribosomes),
  ribosome (mRNA), lysosome, vesicle and endosome (aqua: lilac is the nucleus), multivesicular body, peroxisome, lipid
  droplet, centrosome; the owner's mitochondrion (`standardMito` of `scripts/mitokit.mjs`), damaged mitochondrion and
  Golgi apparatus placed as drawn (`placeIcon` of `scripts/iconkit.mjs`).
- `parts/membranes.mjs`: lipid bilayer in section (straight, curved, upright, one leaflet, gaps; flat heads below a
  100 px membrane), receptor, seven-helix receptor, ion channel (open, closed), pump and transporter, membrane protein,
  gap junction; `membraneWith` sets proteins into a membrane, all sized by one membrane thickness.
- `parts/molecules.mjs`: protein, enzyme, misfolded protein, aggregate, antibody, ubiquitin, phosphate (mustard, also
  on ATP), ATP and ADP, ions (green; a second kind blue), ligand, oxygen, growth factor, glucose, DNA (straight,
  circular), chromosome, chromatin and nucleosomes, RNA, microtubule, actin, collagen.
- `parts/tissue.mjs`: cell (round, lumpy), any approved cell type placed (`placeCellType`), epithelium, blood vessel
  (lengthwise, in section), red blood cell, bacterium, arrows (straight, bent, both ends, inhibition, cycle), release of
  signals, plus, cross, lightning.
- `parts/letters.mjs`: the usual abbreviations lettered as round-capped strokes, never as text (`lettering`; A–Z, 0–9,
  most lowercase, + - /, raised and lowered characters), asked for by the owner on 22 November 2026. ATP and ADP carry "A" and "P", a phosphate
  "P", by themselves when large enough to read (13 px letters on the page); an icon letters "Ac", "Me", "ROS", NAD⁺'s
  "N" itself. Letters are in the light tone on a dark flat dot and in the outline tone on a pale ball. Longer labels
  are still left out or replaced by a shape.

Promoted from the Molecules & genetics drawings on 23 November 2026, at the owner's choice of ten candidates:

- `parts/genetics.mjs`: nucleosome (side or face on, alone as an octamer, tails with lettered marks; the DNA wound as the
  DNA part's double helix, a plain line when small; histones lilac, the owner's choice), chromatin fibre (beads on a
  string, compact, a nucleosome missing), gene block (pointed or square, a letter, on DNA), scissors (flat when small),
  Cas9 (guide RNA, on DNA, fused activator or deaminase).
- `parts/complexes.mjs`: proteasome (with substrate), mTOR complex (mTORC1 or mTORC2), fluorescent protein barrel (glow),
  receptor in a membrane (empty, bound, full, partial, stronger or biased response), brain in section.
- `parts/formula.mjs`: small molecules as skeletal formulas from data in bond lengths, as in a molfile (`skeletal`,
  `formula`): bonds in the small-molecule green, aromatic rings the glucose hexagon, sterol rings pale gold, atoms as
  lettered balls (O red, N blue, I violet, P the phosphate's mustard), charges, wedge and hash bonds; methyl groups that
  must show as such (TMAO) are small grey carbon balls. Data for dopamine, thyroxine, cholic acid, short-chain fatty
  acids, TMAO, β-hydroxybutyrate, resveratrol and spermidine.

For "Lab & equipment", approved by the owner on 23 November 2026: `parts/lab.mjs` draws tubes and vials, glassware,
petri dishes, well plates, tips and pipettes, syringes, screens, instrument casings, microscopes, hazard signs, a lab mouse
and a light beam. Its top comment sets the conventions of objects, which every lab icon follows, also where it draws
something no part draws:

- Materials are greys (chroma under 0.012, so "Shades follow" never ties them to a coloured part): glass a cool grey
  with a white streak, plastic a neutral grey, metal the casing of instruments, a dark grey for screens and rubber, and
  a dark ink grey (never black) for symbols on signs.
- One accent blue, `soft(267)`, for caps, pipette handles and the band and buttons of an instrument.
- Liquids are flat, with a meniscus line: water `soft(222)`, culture medium `soft(8)`, blood `deep(22)`, plasma
  `rich(96)`, reagent `soft(155)`. Agar `rich(85)` with colonies `rich(40)`; cells in a dish come from the biology parts.
- Hazard signs follow the standards, not SiliCoDraw's yellow diamonds: ISO 7010 yellow warning triangles, GHS white
  diamonds with a red border, green squares for safe conditions, blue circles for what is mandatory.
- Outlines `objW(px)`: 3.5 up to 100 px, 5 at 200, 8.5 on a full page; fine lines about half that and left out below
  60 px. Shading (a two-stop gradient and one highlight) only from 80 px; smaller objects are flat.
- Letters only for short abbreviations SiliCoDraw writes on the thing (pH, PCR, UV, −80), never words.

Shaded surfaces, approved by the owner on 23 November 2026 (BioSketch's own drawings, not from SiliCoDraw):
`parts/surfaces.mjs` draws `shadedProtein` (ball, cylinder, C-shaped arc, dimer in two colours, or any outline) as a
lumpy surface of many small balls lit from the top left, each with its crevice shadow, and a shadow band at the bottom
right; below 60 px a flat version with a few large lumps. `redBloodCell3d` draws the red blood cell with depth: tilted
(seen from 40°, the dimple sunken with a dark far wall and a lit near wall), face on, or from the side; below about
50 px use the flat `redBloodCell`. No opacity or filters: flat tones and gradients only. Drawn by
`molecules/shaded.mjs` at 60 % outlines.

The gloss of cells, approved by the owner on 23 November 2026 with `cell3d` (`Cell (3D, face on)`, `Hepatocyte (3D,
face on)`, drawn by `molecules/shaded-cells.mjs`): seen from above, a cell gets a gentle sheen that hints at depth: a
narrow lit band and highlight along the rounded rim at the upper left, a thin pale shade band at the lower right, all
tones close to the body colour, so the cell still reads as nearly flat. Nuclei stay flat: one fill with their outline,
no gradient and no highlight, at most a barely visible shadow beside them. **This is the rule for every icon from now
on: the same gloss and flat nuclei go on to all other cells, organelles and molecules when they are drawn or redrawn.**
Tilted and side views (with a side wall) are made only for selected cells, when the owner asks.

The 59 cell types in this folder were replaced with glossy versions on 23 November 2026 (owner's approval). They are
written by `cells/glossy.mjs <folder>`, which runs the seven cell scripts unchanged and then gives their output the gloss
(`gloss`, `pathPoints` in `parts/surfaces.mjs`), flat nuclei and 60 % outlines. Run on their own, the seven scripts still
give the earlier icons byte for byte. Branches, axons and tails stay flat; parts that are not cell bodies (lipid droplet,
blastocoel, zona pellucida, bone, cartilage, myelin, clock, shield) keep their old highlight until organelles are redone.
The red blood cell is the face-on `redBloodCell3d`.

Twelve organelles were added the same day with the gloss, flat nucleus and 60 % outlines (owner's approval): Centrosome,
Chloroplast, Endoplasmic reticulum, Endosome, Golgi apparatus (replacing the earlier one), Lipid droplet, Lysosome,
Multivesicular body, Nucleus, Peroxisome, Ribosome and Vesicle, written by `cells/glossy-organelles.mjs <folder>`; the
Adipocyte's lipid droplet is glossed too. In the organelle parts the look is a switch, `setGloss(true)` in `cellkit.mjs`
(off by default, so earlier scripts give the same files): round bodies glossed, thin parts (ER sheets, grana, microtubules,
cargo) flat, no gloss below 40 px.

Saved the same day with the owner's approval (553 icons in this folder afterwards), each set written by its runner:
- Mitochondria (Mitochondrion and its four relatives), glossed between the two membranes, matrix and cristae flat, the
  owner's shapes and colours kept: `cells/glossy-mito.mjs`, with the switch `setMitoGloss` in `mitokit.mjs`.
- Cells & tissues, 140 processes and scenes: `cells/glossy-ct.mjs --proteins <script> <out>` per ct script. Proteins inside
  these scenes are glossed by the rules of Molecules & genetics (owner's approval, after the G protein example): 24
  scenes changed, among them JAK-STAT, Notch signalling, the electron transport chain and the ER stress scenes.
- Molecules & genetics, 187 icons: `molecules/glossy-mg.mjs <out>`. Round protein bodies glossed; DNA, RNA, chains, small
  molecules, chromosomes and nucleosomes flat; every old highlight removed. Outlines of shapes at 60 %, lines that are the
  drawing itself (antibody arms, RNA, bonds) keep their width.
- Four cell families, 39 icons (fibroblasts, cell states, cardiomyocytes without the neonatal and iPSC-derived ones, which
  the owner removed, and muscle cells): `cells/glossy-families.mjs <out>`. BioSketch's own drawings, not SiliCoDraw's.
- Lab & equipment, 103 icons, thinner outlines only (objects get no gloss): each `lab/lbNN.mjs` run with
  `setStrokeScale(0.6)`.
- Techniques & assays, 122 icons, saved later on 23 November 2026 (675 icons in this folder afterwards): each
  `assays/tbA.mjs` to `tbP.mjs` calls `setStrokeScale(0.6)` and `setGloss(true)` itself, built from `parts/assays.mjs` (plots,
  blots, plates, image fields, sections, worm, mouse from above, arenas, person, timeline, badge, micropipette) with the
  lab and biology parts. Cells, proteins and bacteria are glossed, objects and data pictures are not. Known weak ones:
  Camera trap cut at the left, Hypnogram without stage names, SPR without a prism, small mice in the arenas.
- Immunology & infection, 56 icons (the other 48 of the category were already drawn elsewhere), saved later on 23
  November 2026 (731 icons in this folder afterwards): `immune/imA.mjs` to `imG.mjs`, built from `parts/immune.mjs` (virus
  by kind, microbe, lymphocyte, surfaceProtein, targetCell, synapse, cytokines, antibodyCoat, crowd; its top comment sets
  the colours of pathogens, receptors, cytokines, vessels and epidemiological status). Organs, mould, malaria parasite,
  helminth, hand, globe and map are drawn in their own icons. "Inverted CD4-CD8 ratio" has a dash because a colon is
  not allowed in Windows file names.
- Anatomy, 112 icons, saved later on 23 November 2026 (843 icons in this folder afterwards): `anatomy/anA.mjs` to
  `anN.mjs`, built from `parts/anatomy.mjs` (organ by kind and state, brain with lit regions, eye, ear, skin in section,
  tooth, bone, vertebra, joint, bloodVessel by kind, muscle, lesion, flame; its top comment sets the organ colours and how a
  highlighted or diseased part is shown: a deeper tone of the organ). Organs are glossed, bones, teeth and tubes flat.
  Drawn in their own icons: skull, foot, hand, rib cage, hip, capillary bed, spinal cord, nerve, ovary, breast, placenta,
  adrenal gland, braces, the menstrual cycle wheel. Names changed from SiliCoDraw: Oesophagus, Haemorrhage, GH–IGF-1
  axis, Skin and hair follicle, Skin ageing, Hair greying. Known weak ones: Vertebral compression fracture close to Spine,
  the gap of Hip fracture about a pixel at 40 px, Placenta mauve and the Menstrual cycle periwinkle (kept apart in hue
  from their neighbours).
- Organisms, 122 icons, saved later on 23 November 2026 (965 icons in this folder afterwards): `organisms/orA.mjs` to
  `orP.mjs`, built from `parts/organisms.mjs` (mammal, face, bat, seaMammal, fish, bird, amphibian, reptile, insect,
  arthropod, invertebrate, plant, fungus, micro, human, scene, plantCell; its top comment sets the colours of each family,
  one eye for every animal, and which bodies are glossed: only closed round ones such as yeast, egg, pollen, Volvox).
  Animals face left as SiliCoDraw draws them; flat animals are seen from above, head up; cat, hamster and macaque are faces.
  The nematode is the `worm` of `parts/assays.mjs`, which now takes `pal` (the dark Dauer larva, drawn wavy because the
  part cannot spiral). Drawn in their own icons: the medal of Centenarian, the thermometer, the balance of Dysbiosis, the
  limb of Limb regeneration, the killifish eggs, the soil and fungal sheath of Mycorrhiza, the organs of worms. Names
  changed from SiliCoDraw: Slime mould, Ageing companion dog. Known weak ones: Ageing companion dog close to Dog, Plant
  growth stages small, Slime mould and Stoma pale, Mosquito legs thin at 40 px.
Twenty-two large scenes are over 40 kB, as they were before the gloss (Karyotype, Brown adipocyte, Heteroplasmy, …).

After the review of all 965 icons (23 November 2026, `icon-work/review/REVIEW.md`), with the owner's go-ahead:
- Names: Ageing cell atlas, Proteomic ageing clock, Heart (section) (was "Heart (anatomical)"), Smooth muscle cell
  (spindle), (long, thin) and (contracted) (were 1, 2, 3), Transmission electron microscope, Super-resolution microscopy,
  Two-photon microscopy, NF-κB, Tortoise (was "Turtle"), ICSI (was "IVF": a needle injects the sperm), Stem
  cross-section (was "Vascular bundle").
- Bone has one colour: `IVORY` of `scripts/cellkit.mjs`, a near grey as the bones of Anatomy (Osteoblast, Osteoclast,
  Osteocyte and Bone remodelling unit stood on sand before). `cells/tissue.mjs` therefore no longer gives the icons of
  22 November byte for byte.
- The lysosome part holds three small pieces of cargo, not one large lump that read as a nucleus (Lysosome and the scenes
  with a large lysosome). Microtubule is an open tube. Recombination shows two chromatids side by side, each with the
  other's colour below the point of exchange. Mitochondrial DNA and Heteroplasmy are the owner's mitochondrion (short
  cristae clear of the DNA). TUNEL assay is a dark fluorescence field. Pedigree is flat. `geneBlock` takes `letterScale`
  (Operon). Eleven icons were centred or given their margins.
- Kept on purpose, although they differ from the same thing elsewhere: the blue antibodies of Serology and Surface
  plasmon resonance (amber lies within 36° of the plasma and of the gold film), the red-brown liver of FGF21 (the tan of
  the organ part lies beside the lipids' peach), Antagonist high on its page (it lines up with Agonist and Partial
  agonist), and arrows in the colour of what moves in the early cell scenes.
- Removed as drawn twice (owner's choice; 961 icons in this folder afterwards): Cell (3D, face on) and Hepatocyte (3D,
  face on), the same as Cell and Hepatocyte since every cell has the gloss; Red blood cell (3D, face on), the same
  drawing as Red blood cell, which `molecules/shaded.mjs` now writes under that name; NAD precursor, the subject of NMN
  and NR. The four files are kept in `icon-work/review/before/deleted/`.
- Weak icons improved the same day (list and reasons in the review): no sign on Blinding; a larger mouse in the `arena`
  part; a small Inoculation loop; Coronary artery with wide, deeper arteries (`plaque: true` of the heart); the crushed
  vertebra in a deeper tone; Skin with one hair; larger amygdala and hypothalamus in the `brain` part; the old dog in a
  faded coat (`OLD_DOG`); wider mosquito legs; deeper `SLIME`, guard cells in `GUARD`; the peroxisome's core without a
  cross; the Monocyte's nucleus with blunt ends; Caspase with a longer chain; "p16" lettered.
- Not changed: `Mitochondrion.svg` (3 to 5 px from the page edges) and `Golgi apparatus.svg` (56 px low). Other icons
  place them by reading these files, and neither comes out of a script as it is saved.

`scripts/mitokit.mjs` holds the owner's mitochondrion as functions (palette and proportions of `Mitochondrion.svg`);
`mito-dynamics.mjs` draws fission, fusion, damage and the network with it. `scripts/iconkit.mjs` places any icon of this
folder inside another (ids prefixed, outlines kept legible when small). A part changed here changes every icon drawn with
it the next time its script runs.
