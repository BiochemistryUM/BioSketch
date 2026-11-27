// Sequences, as a package of its own: a DNA, RNA or protein sequence with its features, read from
// GenBank or FASTA text, and fetched from the public databases a browser can reach (NCBI and
// Ensembl). Nothing here knows about figures, React or the editor: plain data and plain functions,
// so the molecular-biology tool and the notebook can share it.

export * from './model'
export * from './genbank'
export * from './fasta'
export * from './detect'
export * from './sources'
