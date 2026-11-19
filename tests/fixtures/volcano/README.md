# Volcano plot test data

`limma-voom_luminalpregnant-luminallactate.tsv` and `volcano_genes.tsv` are the "Volcano Plot
(training data)" of the Galaxy Training Network, Zenodo record 2529117
(https://zenodo.org/records/2529117), licensed CC BY 4.0. The table is a limma-voom comparison
of mouse mammary luminal cells, pregnant against lactating, from Fu et al. 2015, Nature Cell
Biology 17:365–375 (GEO GSE60450).

`volcano-full.csv` and `volcano-5000.csv` were made from it for BioSketch's scatter chart: gene name
(only for the genes in `volcano_genes.tsv` that are significant), log2 fold change, then −log10 p
in one column per class. Significant means adjusted p below 0.01 and |log2 fold change| above 0.58,
the thresholds of the Galaxy tutorial. `volcano-5000.csv` keeps a random 4,900 of the genes that
are not significant (seed 1). `tests/volcano.test.ts` reads `volcano-full.csv`.
