// Everything that can be added to the page, and every command, in one list: the gallery ("Add")
// shows the first by heading, the Search box looks through both. A new feature is offered by
// adding one entry here, which keeps the top bar and the panel from growing.

import { addChart, addPanelLetter, addTable, addText, copyStyle, pasteStyle, present, setTool, viewCenter } from '../actions'
import { newFigure, tourDoc } from '../figures'
import type { ChartSample } from '../model/chartSamples'
import type { Findable } from '../model/match'
import { toast, useEditor, type Dialog } from '../store'
import type { IconName } from './Icon'
import { saveFile, toggleTheme } from './TopBar'

export type Heading = 'Basics' | 'Charts' | 'Analyses' | 'Molecules' | 'Sequences' | 'Gels and blots'
export const HEADINGS: Heading[] = ['Basics', 'Charts', 'Analyses', 'Molecules', 'Sequences', 'Gels and blots']

/** What an entry may need from the dialog that runs it: a file picked by the scientist. */
export interface RunContext {
  pickPicture: () => void
  pickTable: () => void
}

export interface Entry extends Findable {
  id: string
  icon: IconName
  /** Where the gallery shows it; commands have none and are found by searching. */
  heading?: Heading
  /** The example chart drawn on its card. */
  chart?: ChartSample
  /** A card that shows the entries of other headings of the gallery instead of adding something. */
  opens?: Heading[]
  run: (ctx: RunContext) => void
}

const open = (dialog: Dialog) => () => useEditor.setState({ dialog })
const tool = (t: Parameters<typeof setTool>[0], hint: string) => () => {
  setTool(t)
  toast(hint)
}
const chart = (id: ChartSample, name: string, description: string, keywords: string[], heading: Heading = 'Charts'): Entry => ({
  id: `chart-${id}`,
  heading,
  name,
  description,
  keywords,
  icon: 'chart',
  chart: id,
  run: () => addChart(id),
})

export const ADDABLE: Entry[] = [
  { id: 'text', heading: 'Basics', name: 'Text', description: 'A label; drag with the text tool for a box that wraps', keywords: ['label', 'title', 'words', 'text box', 'bullet'], icon: 'text', run: () => void addText(viewCenter()) },
  { id: 'shape', heading: 'Basics', name: 'Shape', description: 'Box, oval, triangle, cylinder, callout…, with words inside', keywords: ['box', 'rectangle', 'oval', 'circle', 'ellipse'], icon: 'shape', run: tool('shape', 'Drag on the page to draw a shape.') },
  { id: 'arrow', heading: 'Basics', name: 'Arrow', description: 'Arrows, inhibition bars and lines between objects', keywords: ['connector', 'line', 'inhibit', 'activation'], icon: 'connector', run: tool('connector', 'Drag from one object to another to draw an arrow.') },
  { id: 'charts', heading: 'Basics', name: 'Chart', description: 'Every kind of chart (bars, box plots, points, pie, heat map, Venn…) and the analyses (standard curve, dose-response, qPCR, enzyme kinetics, binding, melting curves, survival)', keywords: ['chart', 'plot', 'graph'], icon: 'chart', opens: ['Charts', 'Analyses'], run: () => undefined },
  { id: 'chart-from-table', heading: 'Basics', name: 'Chart from a table', description: 'Paste a table or pick a file, and choose among the charts that fit it, drawn from your numbers', keywords: ['paste', 'spreadsheet', 'csv', 'excel', 'suggest', 'which chart', 'data', 'plot my data'], icon: 'chart', run: open('suggest') },
  { id: 'picture', heading: 'Basics', name: 'Picture', description: 'A micrograph, blot or photo from your computer', keywords: ['image', 'photo', 'png', 'jpeg', 'micrograph', 'blot'], icon: 'image', run: (ctx) => ctx.pickPicture() },
  { id: 'table', heading: 'Basics', name: 'Table', description: 'Words and numbers, pasted from a spreadsheet or typed', keywords: ['spreadsheet', 'cells', 'grid'], icon: 'grid', run: () => addTable() },
  { id: 'panel-letter', heading: 'Basics', name: 'Panel letter', description: 'The next of A, B, C…', keywords: ['a b c', 'label', 'panel'], icon: 'text', run: addPanelLetter },
  chart('bar', 'Bars', 'A bar for the mean of each group, with error bars and the values', ['bar chart', 'column', 'mean']),
  chart('dot', 'Dots', 'Every value as a dot, with a line at the mean', ['dot plot', 'strip', 'scatter dot']),
  chart('box', 'Box plot', 'Median, quartiles and whiskers', ['boxplot', 'whisker', 'median', 'quartile']),
  chart('violin', 'Violin', 'The spread of the values as an outline', ['density']),
  chart('line', 'Line', 'Means joined by a line, in table order', ['time course']),
  chart('stacked', 'Stacked bars', 'Parts of a whole, as shares', ['stack', 'percent', 'composition', 'cell cycle']),
  chart('pie', 'Pie', 'The share of each group in the whole', ['share', 'proportion']),
  chart('scatter', 'Scatter', 'Pairs of x and y values, with a fitted line', ['xy', 'correlation', 'regression', 'volcano']),
  chart('heatmap', 'Heat map', 'A coloured cell for every number; clustering', ['matrix', 'expression', 'cluster', 'z-score']),
  chart('venn', 'Venn diagram', 'What two or three sets share', ['overlap', 'sets', 'intersection']),
  chart('standard', 'Standard curve', 'Bradford, BCA or ELISA: samples read off a curve of standards', ['bradford', 'bca', 'elisa', 'protein assay', 'concentration', 'calibration', '4pl', '5pl', 'absorbance', 'interpolate', 'unknown'], 'Analyses'),
  chart('dose', 'Dose-response', 'Four-parameter logistic curve with the EC50', ['ec50', 'ic50', 'hill', 'logistic', 'potency', 'agonist', 'inhibitor'], 'Analyses'),
  chart('qpcr', 'qPCR fold change', 'Relative expression by ΔΔCt from the Cq of every well, with the error carried through', ['ΔΔCt', 'ddct', 'cq', 'ct', 'real-time pcr', 'rt-qpcr', 'gene expression', 'reference gene', 'housekeeping', 'gapdh', 'livak', 'pfaffl', 'relative quantification'], 'Analyses'),
  chart('kinetics', 'Enzyme kinetics', 'Michaelis–Menten curves with Km, Vmax and kcat; inhibition models and Ki', ['michaelis menten', 'km', 'vmax', 'kcat', 'ki', 'inhibition', 'competitive', 'lineweaver burk', 'enzyme', 'rate'], 'Analyses'),
  chart('binding', 'Saturation binding', 'Bound against free ligand: Kd and Bmax, a Hill slope, total and nonspecific binding', ['kd', 'bmax', 'receptor', 'radioligand', 'ligand binding', 'affinity', 'scatchard', 'nonspecific', 'nsb', 'hill', 'saturation'], 'Analyses'),
  chart('melt', 'Melting curves', 'Thermal shift (DSF), DNA or CD melts: Tm by a Boltzmann fit or the derivative, ΔTm', ['tm', 'thermal shift', 'dsf', 'differential scanning fluorimetry', 'melt curve', 'melting temperature', 'thermofluor', 'sypro', 'stability', 'melt peak', 'dna melting', 'circular dichroism', 'boltzmann'], 'Analyses'),
  chart('survival', 'Survival curves', 'Kaplan–Meier curves with the log-rank test', ['kaplan meier', 'log rank', 'hazard', 'censored'], 'Analyses'),
  { id: 'chemical-structure', heading: 'Molecules', name: 'Chemical structure', description: 'A compound by name or SMILES, drawn as a skeletal formula', keywords: ['smiles', 'pubchem', 'compound', 'formula', 'drug', 'metabolite', 'ligand', 'atp', 'skeletal', 'chemdraw', 'small molecule'], icon: 'molecule', run: open('molecule') },
  { id: 'draw-structure', heading: 'Molecules', name: 'Draw a structure', description: 'Draw a molecule by hand: bonds, rings, elements and charges, as in ChemDraw', keywords: ['sketch', 'chemdraw', 'draw', 'molecule', 'bond', 'ring', 'benzene', 'hexagon', 'skeletal', 'chemical', 'structure editor', 'molfile'], icon: 'molecule', run: open('sketch') },
  { id: 'reaction', heading: 'Molecules', name: 'Reaction', description: 'Substrate → product, with the enzyme on the arrow and a cofactor', keywords: ['enzyme', 'scheme', 'substrate', 'product', 'cofactor', 'catalysis', 'metabolism', 'equation'], icon: 'connector', run: open('reaction') },
  { id: 'protein-structure', heading: 'Molecules', name: 'Protein structure', description: 'An AlphaFold model or a PDB entry, drawn as a tube you can turn', keywords: ['alphafold', 'pdb', 'rcsb', '3d', 'fold', 'plddt', 'cartoon', 'ribbon', 'uniprot', 'mmcif'], icon: 'molecule', run: open('protein') },
  { id: 'protein-domains', heading: 'Molecules', name: 'Domains and mutations', description: 'Domains from UniProt on a line, with mutations as lollipops', keywords: ['lollipop', 'domain', 'uniprot', 'mutation', 'variant', 'cbioportal', 'protein map'], icon: 'dna', run: open('protein') },
]

/** Commands found by searching; each does what the menu item of the same name does. */
export const COMMANDS: Entry[] = [
  { id: 'cmd-membrane', name: 'Membrane', description: 'A lipid bilayer drawn along a line; close it for a cell', keywords: ['bilayer', 'lipid', 'cell'], icon: 'membrane', run: tool('membrane', 'Draw a line for the membrane. Finish near the start to close it into a cell.') },
  { id: 'cmd-new', name: 'New figure', keywords: ['blank', 'empty'], icon: 'newFile', run: () => void newFigure() },
  { id: 'cmd-figures', name: 'My figures', description: 'Figures saved in this browser, by project', keywords: ['open', 'saved', 'projects'], icon: 'figures', run: open('figures') },
  { id: 'cmd-open', name: 'Open a figure file', keywords: ['load', 'json'], icon: 'open', run: () => useEditor.setState((s) => ({ openFileRequest: s.openFileRequest + 1 })) },
  { id: 'cmd-save', name: 'Save the figure as a file', keywords: ['download', 'backup', 'json'], icon: 'save', run: saveFile },
  { id: 'cmd-export', name: 'Export', description: 'PNG, SVG, PDF or PowerPoint', keywords: ['png', 'svg', 'pdf', 'powerpoint', 'pptx', 'download', 'print'], icon: 'export', run: open('export') },
  { id: 'cmd-vision', name: 'Colour-blind preview', description: 'See the whole figure as readers with deuteranopia, protanopia or tritanopia see it, or in greys', keywords: ['colour blind', 'color blind', 'colorblind', 'deuteranopia', 'protanopia', 'tritanopia', 'grey', 'gray', 'black and white', 'accessibility', 'vision'], icon: 'eye', run: () => useEditor.setState((s) => ({ vision: s.vision ? null : 'deuteranopia' })) },
  { id: 'cmd-stats-report', name: 'Statistics report', description: 'Every test of the figure in one table or text, under Export', keywords: ['statistics', 'report', 'p values', 'effect size', 'confidence interval', 'csv', 'methods', 'reviewer'], icon: 'export', run: open('export') },
  { id: 'cmd-templates', name: 'Start from a template', description: 'Posters, a graphical abstract, a timeline, examples', keywords: ['poster', 'abstract', 'timeline', 'workflow', 'example'], icon: 'template', run: open('templates') },
  { id: 'cmd-copy-style', name: 'Copy style', description: 'Take the colours, lines and lettering of the selected object (⌥⌘C)', keywords: ['format', 'painter', 'same style', 'look', 'match'], icon: 'copy', run: copyStyle },
  { id: 'cmd-paste-style', name: 'Paste style', description: 'Give the copied look to the selected objects (⌥⌘V)', keywords: ['format', 'painter', 'same style', 'look', 'match'], icon: 'copy', run: pasteStyle },
  { id: 'cmd-tour', name: 'Tour of the features', description: 'Thirteen slides with examples to try', keywords: ['tutorial', 'help', 'learn'], icon: 'slides', run: () => void tourDoc().then((doc) => doc && newFigure(doc)) },
  { id: 'cmd-pathway', name: 'Import a pathway', description: 'From WikiPathways or a GPML file', keywords: ['wikipathways', 'gpml', 'pathvisio', 'signalling'], icon: 'pathway', run: open('pathway') },
  { id: 'cmd-svg', name: 'Import an SVG icon', keywords: ['svg', 'drawing', 'illustration'], icon: 'import', run: open('import-icon') },
  { id: 'cmd-calculators', name: 'Lab calculators', description: 'Molarity, dilution, molecular weight', keywords: ['molarity', 'dilution', 'c1v1', 'weigh', 'molecular weight', 'mw', 'formula', 'pubchem', 'buffer'], icon: 'calculator', run: open('calculators') },
  { id: 'cmd-ai', name: 'Create a figure with AI', keywords: ['claude', 'sketch', 'describe'], icon: 'sparkles', run: open('ai') },
  { id: 'cmd-present', name: 'Present the slides', keywords: ['presentation', 'full screen', 'slideshow'], icon: 'play', run: present },
  { id: 'cmd-animations', name: 'Animations', description: 'How objects come in and go while the slides are presented: fade, fly in, wipe, zoom', keywords: ['animation', 'animate', 'entrance', 'exit', 'fade', 'fly in', 'wipe', 'zoom', 'build', 'appear', 'transition', 'presentation'], icon: 'animate', run: () => useEditor.setState({ animations: true, slidesShown: true }) },
  { id: 'cmd-slides', name: 'Show the slides', keywords: ['presentation', 'pages'], icon: 'slides', run: () => useEditor.setState({ slidesShown: true }) },
  { id: 'cmd-theme', name: 'Dark or light theme', keywords: ['dark mode', 'night', 'colours'], icon: 'moon', run: toggleTheme },
  { id: 'cmd-news', name: "What's new", description: 'The version and what changed', keywords: ['version', 'update', 'changes'], icon: 'sparkles', run: open('whats-new') },
  { id: 'cmd-report', name: 'Report a problem', description: 'An email with the version and browser filled in', keywords: ['bug', 'error', 'feedback', 'broken', 'email'], icon: 'mail', run: open('report') },
  { id: 'cmd-backup', name: 'Back up all figures', description: 'Under My figures: every figure as one file, and reading it back', keywords: ['backup', 'restore', 'export all', 'move', 'computer'], icon: 'save', run: open('figures') },
  { id: 'cmd-help', name: 'Help and shortcuts', keywords: ['keyboard', 'how'], icon: 'help', run: open('help') },
]
