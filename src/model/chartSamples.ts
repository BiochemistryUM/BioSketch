// The example a new chart starts with, for every kind the gallery offers: something to look at,
// and a table that shows how to lay out one's own numbers, before the scientist pastes theirs.

import type { ChartGroup, ChartKind, ChartNode } from './types'

/** What the gallery can add: a kind of chart, or one of the ways of drawing a scatter table. */
export type ChartSample = ChartKind | 'survival' | 'dose' | 'stacked' | 'kinetics' | 'binding' | 'melt'

/** The fields of a new chart besides its place: kind, numbers and the settings that make it what it is. */
export type ChartStart = Omit<ChartNode, 'id' | 'x' | 'y' | 'w' | 'h' | 'rotation' | 'type'>

const GROUPS: ChartGroup[] = [
  { name: 'Control', values: [4.1, 3.8, 4.6, 4.3] },
  { name: 'Treated', values: [6.9, 7.4, 6.1, 7.8] },
  { name: 'Rescue', values: [5, 4.7, 5.6, 5.2] },
]

/** The Cq of the qPCR example, well by well: per sample, GAPDH, IL6 and TNF in triplicate. */
const QPCR_CQ = [18.14, 18.09, 18.15, 28.32, 28.26, 28.31, 25.96, 25.98, 25.96, 18.04, 17.86, 17.86, 28.24, 28.28, 28.34, 26.12, 26.17, 26.08, 18.37, 18.28, 18.33, 28.15, 28.14, 28.17, 25.83, 25.89, 25.85, 18.34, 18.18, 18.27, 23.39, 23.24, 23.36, 24.47, 24.21, 24.34, 18.28, 18.17, 18.35, 23.45, 23.47, 23.51, 24.65, 24.63, 24.52, 18.27, 18.3, 18.33, 23.55, 23.28, 23.33, 24.41, 24.5, 24.43, 17.81, 17.78, 17.95, 25.66, 25.58, 25.59, 25.32, 25.42, 25.34, 18.26, 18.24, 18.2, 26.18, 26.29, 26.4, 24.66, 24.79, 24.89, 17.93, 17.97, 17.99, 26.61, 26.69, 26.55, 25.3, 25.42, 25.34]

const DOSES = [0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1, 3, 10]
const GENES = ['Il6', 'Tnf', 'Myc', 'Cdkn1a', 'Actb']
const column = (name: string, values: number[]): ChartGroup => ({ name, values, labels: GENES })
const set = (name: string, members: string[]): ChartGroup => ({ name, values: members.map(() => 1), labels: members })
const copy = (groups: ChartGroup[]): ChartGroup[] => groups.map((g) => ({ ...g, values: [...g.values], ...(g.xs ? { xs: [...g.xs] } : {}), ...(g.labels ? { labels: [...g.labels] } : {}) }))

/** The example chart for a kind, ready to be placed. */
export function chartSample(kind: ChartSample): ChartStart {
  switch (kind) {
    case 'scatter':
      return {
        kind: 'scatter',
        groups: [{ name: 'Cells', values: [1.2, 2.3, 2.8, 4.1, 4.6, 6.2, 6.8, 8.1], xs: [1, 2, 3, 4, 5, 6, 7, 8] }],
        fit: true,
        legend: 'none',
        xLabel: 'Time (h)',
        yLabel: 'Signal',
      }
    case 'dose':
      return {
        kind: 'scatter',
        groups: [{ name: 'Agonist', values: [2.1, 3.4, 4, 11.8, 31.5, 62, 84.9, 93.1, 96.4], xs: [...DOSES] }],
        xLog: true,
        fit: true,
        curve: 'dose',
        legend: 'none',
        xLabel: 'Dose (µM)',
        yLabel: 'Response (%)',
      }
    case 'survival':
      return {
        kind: 'scatter',
        groups: [
          { name: 'Control', values: [1, 1, 1, 0, 1, 1, 1, 1], xs: [5, 8, 12, 14, 16, 20, 23, 27] },
          { name: 'Treated', values: [1, 0, 1, 1, 0, 1, 0, 0], xs: [9, 15, 21, 26, 30, 33, 40, 40] },
        ],
        survival: true,
        logRank: true,
        legend: 'top',
        xLabel: 'Days',
      }
    case 'kinetics': {
      // Initial rates of an enzyme and a slower mutant, as read off a plate: Km and Vmax differ.
      const S = [0, 2.5, 5, 10, 20, 40, 80, 160]
      return {
        kind: 'scatter',
        groups: [
          { name: 'Wild type', values: [0.02, 1.66, 3.08, 4.71, 6.98, 8.61, 10.24, 10.88], xs: S },
          { name: 'R123A', values: [-0.01, 0.47, 0.82, 1.59, 2.58, 4.17, 5.52, 7.01], xs: S },
        ],
        kinetics: { enzyme: 0.05 },
        legend: 'top',
        xLabel: '[Substrate] (µM)',
        yLabel: 'Rate (µM/min)',
      }
    }
    case 'binding': {
      // Saturation binding of a radioligand to a receptor and a mutant that binds it more weakly,
      // in duplicate, with a few per cent of scatter (made up).
      const X = [0.1, 0.25, 0.5, 1, 2, 4, 8, 16]
      const x = X.flatMap((v) => [v, v])
      const wobble = [1.03, 0.98, 0.97, 1.02, 1.01, 0.99, 0.98, 1.03, 1.02, 0.97, 0.99, 1.01, 1.02, 0.99, 0.98, 1.01]
      const bound = (bmax: number, kd: number) => x.map((v, k) => Math.round(((bmax * v) / (kd + v)) * wobble[k]))
      return {
        kind: 'scatter',
        groups: [
          { name: 'Wild type', values: bound(1500, 1.2), xs: x },
          { name: 'D113A', values: bound(1350, 4.5), xs: x },
        ],
        binding: {},
        legend: 'top',
        xLabel: '[Ligand] free (nM)',
        yLabel: 'Bound (fmol/mg)',
      }
    }
    case 'melt': {
      // A thermal shift assay: a protein alone and with a ligand that steadies it, two wells each,
      // read every degree. The signal falls after its peak, where the protein clumps (made up).
      const T = Array.from({ length: 66 }, (_, k) => 25 + k)
      const curve = (tm: number, seed: number) =>
        T.map((t) => {
          const up = 1000 + 9000 / (1 + Math.exp((tm - t) / 1.8))
          return Math.round(up * (t > tm + 10 ? Math.exp(-(t - tm - 10) * 0.06) : 1) + 40 * Math.sin(t * 2.3 + seed))
        })
      return {
        kind: 'scatter',
        groups: [
          { name: 'Apo 1', values: curve(52, 1), xs: T },
          { name: 'Apo 2', values: curve(52.3, 2), xs: T },
          { name: '+ ligand 1', values: curve(56.4, 3), xs: T },
          { name: '+ ligand 2', values: curve(56.1, 4), xs: T },
        ],
        melt: {},
        legend: 'top',
        xLabel: 'Temperature (°C)',
        yLabel: 'Fluorescence',
      }
    }
    case 'qpcr': {
      // A qPCR plate as it comes off the machine, one Cq per well: three conditions of three
      // cultures each, technical triplicates, IL6 and TNF against GAPDH. The same wells as R's
      // reference (scripts/stats-reference.R, qpcr$bio). The wells are filled row by row from A1,
      // each sample's three targets in triplicate.
      const cq = QPCR_CQ
      const samples = ['Control', 'LPS', 'LPS + drug'].flatMap((c) => [1, 2, 3].map((r) => `${c} ${r}`))
      const wellOf = (i: number): string => `${String.fromCharCode(65 + Math.floor(i / 12))}${(i % 12) + 1}`
      const groups = ['GAPDH', 'IL6', 'TNF'].map((target, t): ChartGroup => {
        const values: number[] = []
        const labels: string[] = []
        const wells: string[] = []
        samples.forEach((sample, k) => {
          for (let w = 0; w < 3; w++) {
            values.push(cq[k * 9 + t * 3 + w])
            labels.push(sample)
            wells.push(wellOf(k * 9 + t * 3 + w))
          }
        })
        return { name: target, values, labels, wells }
      })
      return { kind: 'qpcr', groups, error: 'sd', points: true, legend: 'top' }
    }
    case 'heatmap':
      return { kind: 'heatmap', groups: [column('Ctrl 1', [2.1, 5.5, 14, 3.3, 98]), column('Ctrl 2', [2.4, 5.1, 15, 3, 101]), column('LPS 1', [48, 31, 22, 9.5, 99]), column('LPS 2', [52, 28, 25, 11, 102])], heatByRow: true }
    case 'venn':
      return { kind: 'venn', groups: [set('RNA-seq', ['TP53', 'MYC', 'JUN', 'EGFR', 'KRAS', 'BRCA1']), set('Proteomics', ['TP53', 'MYC', 'FOS', 'AKT1', 'KRAS']), set('ChIP-seq', ['TP53', 'JUN', 'FOS', 'STAT3', 'MYC', 'RELA'])] }
    case 'stacked':
      return {
        kind: 'bar',
        groups: [
          { name: 'G1', category: 'Control', values: [55] },
          { name: 'S', category: 'Control', values: [30] },
          { name: 'G2/M', category: 'Control', values: [15] },
          { name: 'G1', category: 'Treated', values: [72] },
          { name: 'S', category: 'Treated', values: [12] },
          { name: 'G2/M', category: 'Treated', values: [16] },
        ],
        stacked: true,
        percent: true,
        yLabel: 'Cells (%)',
      }
    case 'standard': {
      // A BCA assay as it comes off the plate reader: standards in duplicate, three lysates, one above the range.
      const conc = [0, 25, 125, 250, 500, 750, 1000, 1500, 2000]
      const a562 = [
        [0.095, 0.098], [0.131, 0.128], [0.241, 0.245], [0.368, 0.362], [0.592, 0.601], [0.788, 0.801], [0.969, 0.958], [1.282, 1.301], [1.548, 1.571],
      ]
      const names = ['Blank', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8']
      const samples: [string, number[]][] = [['Lysate A', [0.624, 0.641]], ['Lysate B', [0.452, 0.437]], ['Lysate C', [1.722, 1.698]]]
      return {
        kind: 'standard',
        groups: [
          { name: 'Standards', values: a562.flat(), xs: conc.flatMap((c) => [c, c]), labels: names.flatMap((n) => [n, n]) },
          { name: 'Samples', values: samples.flatMap(([, v]) => v), labels: samples.flatMap(([n, v]) => v.map(() => n)) },
        ],
        standard: { model: 'quadratic', blank: true, dilution: { 'Lysate A': 10, 'Lysate B': 10, 'Lysate C': 5 } },
        legend: 'top',
        title: 'BCA assay',
        xLabel: 'BSA (µg/mL)',
        yLabel: 'A_{562}, blank subtracted',
      }
    }
    case 'pie':
      return { kind: 'pie', groups: [{ name: 'G1', values: [55] }, { name: 'S', values: [30] }, { name: 'G2/M', values: [15] }] }
    case 'bar':
      return { kind: 'bar', groups: copy(GROUPS), error: 'sd', points: true }
    case 'line':
      return { kind: 'line', groups: copy(GROUPS), error: 'sem' }
    default:
      return { kind, groups: copy(GROUPS) }
  }
}
