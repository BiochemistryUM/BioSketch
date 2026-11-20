// The version of BioSketch and what changed, shown in Help and once after an update, so that
// testers know which version they are reporting on. When shipping a new version: raise VERSION
// here and in package.json together (a test checks they agree), add its entry at the top of
// WHATS_NEW, and bump the cache name in public/sw.js and src/main.tsx.

export const VERSION = '0.2.0'

export interface Release {
  version: string
  /** Day it was published, as written for people (20 November 2026). */
  date: string
  items: string[]
}

export const WHATS_NEW: Release[] = [
  {
    version: '0.2.0',
    date: '20 November 2026',
    items: [
      'Add, Import, Calculators and Search in the top bar. Add shows every kind of object and chart with a picture; Search (⌘K or Ctrl K) finds things to add, commands and icons by name.',
      'Lab calculators: molarity, dilution and molecular weight, with names looked up in PubChem.',
      'Back up all your figures as one file under File › My figures, and read such a file back on another computer or browser.',
      'Report a problem from the File menu, with the version and browser filled in.',
      'Molecules under Add: a chemical structure by name or SMILES (from PubChem), a protein structure from AlphaFold DB, the PDB or a file, a diagram of a protein’s domains with your mutations (from UniProt), and a reaction scheme.',
      'Standard curves under Add › Chart: Bradford, BCA or ELISA (straight line, quadratic, 4- or 5-parameter logistic), with samples read off the curve. Paste a table in any layout: BioSketch shows what it took each column to be, and one tap corrects it.',
      'qPCR fold change under Add › Chart: paste the results of your machine, one row per well, and get the fold change by ΔΔCt with the reference gene(s) and control you choose, primer efficiencies if you have them, error bars carried through and Welch’s t test against the control.',
      'qPCR: stars or p values over each condition and its control on the chart, a paired design (each sample against the control with the same number), and primer efficiencies worked out from a pasted dilution series.',
      'qPCR: a picture of the plate under Data, from the wells your machine names, coloured by condition, sample or target, with wells that need a look ringed in red. Press a well to see what it holds, or put the plate on the page.',
      'Saturation binding under Add › Chart: Kd and Bmax, a Hill slope, or total and nonspecific binding fitted together, with a Scatchard view.',
      'Small panels: a grouped chart can be drawn as one panel per category (or per series), and a scatter chart as one panel per series, side by side with one legend and one range for all, or each panel its own. Under Look › Small panels.',
      'Chart from a table: paste a table on the page (or under Add › Chart from a table, or Import › Table for a chart) and BioSketch shows the charts that fit it, drawn from your numbers, with a line on why. Choose one and it is on the page.',
      'Melting curves under Add › Chart: the Tm of every curve of a thermal shift, DNA or CD melt, by a Boltzmann fit or the derivative, the ΔTm of each condition, and melt peaks.',
      'Enzyme kinetics under Add › Chart: Michaelis–Menten curves with Km, Vmax and kcat, the four models of inhibition with Ki and which fits best, and a Lineweaver–Burk view.',
      'Draw a structure under Add: bonds, rings, elements and charges drawn by hand, as in a structure editor. A placed structure, or one from PubChem, can be changed in it. A turned structure keeps its letters upright.',
      'The Add gallery is smaller and fits the window: the charts are behind the Chart card.',
      'The tour of the features has a slide on analyses and molecules.',
    ],
  },
  {
    version: '0.1.0',
    date: '20 November 2026',
    items: ['The first version shared with the group: figures, icons from NIH BioArt, Bioicons and Servier, charts with statistics, pathways, slides and presenting.'],
  },
]

/** The releases newer than the one last seen in this browser; none on a first visit (`seen` null) or when nothing changed. */
export function newSince(seen: string | null, releases: Release[] = WHATS_NEW): Release[] {
  if (!seen) return []
  const at = releases.findIndex((r) => r.version === seen)
  // A version this list does not know (older than its oldest entry): show only the latest.
  return at === -1 ? releases.slice(0, 1) : releases.slice(0, at)
}
