# Example tables

Every file here is made up, in the shape of the export it is named after. None holds real measurements.

- plate-reader-gen5.txt: a plate reader grid (BioTek Gen5 style), with preamble lines, two reads one under the other, a column of wavelengths at the right.
- bradford-wide.tsv: a Bradford table typed by hand in wide form (one column per replicate), tab-separated.
- bradford-wide-decimal-comma.csv: the same saved by Excel on a computer with a decimal comma (semicolons, a title row).
- elisa-long.csv: an ELISA in long form, one row per well.
- qpcr-biorad-cfx.csv: Bio-Rad CFX Maestro "Quantification Cq Results" (blank first column, NTC without a Cq).
- qpcr-quantstudio.txt: Applied Biosystems QuantStudio results export (preamble lines starting with *, then [Results]; "Undetermined").
- qpcr-lightcycler480.txt: Roche LightCycler 480 "Abs Quant" export (a title line first; no target column).
