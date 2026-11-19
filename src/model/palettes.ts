// Colour palettes for charts: the sets of colours given to groups that have no colour of their
// own. The published ones are copied value for value from their sources (R's `palette.colors`
// and `viridisLite`, matplotlib, Paul Tol's notes), so a scientist can name the palette in a
// figure legend and a reader can check it.

export interface Palette {
  id: string
  name: string
  colours: string[]
  /** Chosen so that people with the common forms of colour blindness can tell the colours apart. */
  safe: boolean
  /** One line for the scientist: where it comes from and what it is good for. */
  about: string
}

export const PALETTES: Palette[] = [
  { id: 'biosketch', name: 'BioSketch', safe: false, about: 'Soft colours that match the icons.', colours: ['#6fa8dc', '#e58a87', '#7cc48f', '#f3c95e', '#8fd3cc', '#b7a3e6', '#f0a04b', '#aab4c3'] },
  { id: 'okabe-ito', name: 'Okabe–Ito', safe: true, about: 'The standard colour-blind-friendly set (Okabe and Ito 2008), recommended by many journals.', colours: ['#E69F00', '#56B4E9', '#009E73', '#F0E442', '#0072B2', '#D55E00', '#CC79A7', '#000000'] },
  { id: 'tol-bright', name: 'Tol bright', safe: true, about: 'Paul Tol’s bright set: colour-blind friendly and clear on screen and in print.', colours: ['#4477AA', '#EE6677', '#228833', '#CCBB44', '#66CCEE', '#AA3377', '#BBBBBB'] },
  { id: 'viridis', name: 'Viridis', safe: true, about: 'From dark purple to yellow in even steps: for groups that have an order (doses, time points). Readable in grey print.', colours: ['#440154', '#46337E', '#365C8D', '#277F8E', '#1FA187', '#4AC16D', '#9FDA3A', '#FDE725'] },
  { id: 'greys', name: 'Greys', safe: true, about: 'Black to light grey, for figures printed without colour.', colours: ['#252525', '#636363', '#969696', '#BDBDBD', '#D9D9D9'] },
  { id: 'tableau', name: 'Tableau 10', safe: false, about: 'The ten colours of Tableau, common in data graphics.', colours: ['#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F', '#EDC948', '#B07AA1', '#FF9DA7', '#9C755F', '#BAB0AC'] },
  { id: 'matplotlib', name: 'Matplotlib', safe: false, about: 'The default colours of Python’s matplotlib (“tab10”).', colours: ['#1F77B4', '#FF7F0E', '#2CA02C', '#D62728', '#9467BD', '#8C564B', '#E377C2', '#7F7F7F', '#BCBD22', '#17BECF'] },
  { id: 'set1', name: 'Set 1', safe: false, about: 'ColorBrewer’s strong colours, as used by many R figures.', colours: ['#E41A1C', '#377EB8', '#4DAF4A', '#984EA3', '#FF7F00', '#FFFF33', '#A65628', '#F781BF', '#999999'] },
  { id: 'set2', name: 'Set 2', safe: false, about: 'ColorBrewer’s soft colours.', colours: ['#66C2A5', '#FC8D62', '#8DA0CB', '#E78AC3', '#A6D854', '#FFD92F', '#E5C494', '#B3B3B3'] },
  { id: 'dark2', name: 'Dark 2', safe: false, about: 'ColorBrewer’s dark colours: good for points and lines on white.', colours: ['#1B9E77', '#D95F02', '#7570B3', '#E7298A', '#66A61E', '#E6AB02', '#A6761D', '#666666'] },
]

/** The colours of a palette by its id; the usual ones for an id that is not known. */
export const paletteColours = (id: unknown): string[] => (PALETTES.find((p) => p.id === id) ?? PALETTES[0]).colours

/** The id as it is stored: nothing for the usual palette or one that is not known. */
export const paletteId = (id: unknown): string | undefined => {
  const found = PALETTES.find((p) => p.id === id)
  return found && found !== PALETTES[0] ? found.id : undefined
}
