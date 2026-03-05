import type { BedFormat } from "./bed";

/** Genome assembly identifier */
export type Assembly = string;

/** Detected file format */
export type FileFormat = BedFormat | "vcf" | "gff3";

/** Species configuration for Ensembl API and UCSC links */
export interface SpeciesConfig {
  id: string;
  displayName: string;
  ensemblName: string;
  assemblies: Array<{ name: string; ucscDb: string; label: string }>;
}

/** Supported model organisms */
export const SPECIES_LIST: SpeciesConfig[] = [
  {
    id: "human",
    displayName: "Human",
    ensemblName: "human",
    assemblies: [
      { name: "GRCh38", ucscDb: "hg38", label: "GRCh38 (hg38)" },
      { name: "GRCh37", ucscDb: "hg19", label: "GRCh37 (hg19)" },
    ],
  },
  {
    id: "mouse",
    displayName: "Mouse",
    ensemblName: "mouse",
    assemblies: [
      { name: "GRCm39", ucscDb: "mm39", label: "GRCm39 (mm39)" },
      { name: "GRCm38", ucscDb: "mm10", label: "GRCm38 (mm10)" },
    ],
  },
  {
    id: "rat",
    displayName: "Rat",
    ensemblName: "rattus_norvegicus",
    assemblies: [
      { name: "mRatBN7.2", ucscDb: "rn7", label: "mRatBN7.2 (rn7)" },
    ],
  },
  {
    id: "zebrafish",
    displayName: "Zebrafish",
    ensemblName: "zebrafish",
    assemblies: [
      { name: "GRCz11", ucscDb: "danRer11", label: "GRCz11 (danRer11)" },
    ],
  },
  {
    id: "drosophila",
    displayName: "Fruit fly",
    ensemblName: "drosophila_melanogaster",
    assemblies: [
      { name: "BDGP6.46", ucscDb: "dm6", label: "BDGP6 (dm6)" },
    ],
  },
  {
    id: "c_elegans",
    displayName: "C. elegans",
    ensemblName: "caenorhabditis_elegans",
    assemblies: [
      { name: "WBcel235", ucscDb: "ce11", label: "WBcel235 (ce11)" },
    ],
  },
  {
    id: "a_thaliana",
    displayName: "A. thaliana",
    ensemblName: "arabidopsis_thaliana",
    assemblies: [
      { name: "TAIR10", ucscDb: "araTha1", label: "TAIR10 (araTha1)" },
    ],
  },
  {
    id: "s_cerevisiae",
    displayName: "S. cerevisiae",
    ensemblName: "saccharomyces_cerevisiae",
    assemblies: [
      { name: "R64-1-1", ucscDb: "sacCer3", label: "R64-1-1 (sacCer3)" },
    ],
  },
];

/** A genomic region (0-based half-open, BED-style) */
export interface GenomicRegion {
  chrom: string;
  start: number;
  end: number;
}

/**
 * Universal row type for the data table.
 * All column values are stored as strings for uniform table display.
 * Numeric columns are parsed on-demand for computations.
 */
export interface GenomicRow {
  _index: number;
  _rowId: string;
  [key: string]: string | number;
}
