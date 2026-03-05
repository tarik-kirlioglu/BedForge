import type { BedFormat } from "./bed";

/** Genome assembly identifier */
export type Assembly = string;

/** Detected file format */
export type FileFormat = BedFormat | "vcf" | "gff3";

/** Species configuration for Ensembl API and browser links */
export interface SpeciesConfig {
  id: string;
  displayName: string;
  ensemblName: string;
  /** Ensembl browser base URL (main vs plants/fungi subdomains) */
  browserBase: string;
  /** Species name in Ensembl browser URL (e.g. Homo_sapiens, Mus_musculus) */
  browserSpecies: string;
  assemblies: Array<{ name: string; label: string }>;
}

/** Supported model organisms */
export const SPECIES_LIST: SpeciesConfig[] = [
  {
    id: "human",
    displayName: "Human",
    ensemblName: "human",
    browserBase: "https://www.ensembl.org",
    browserSpecies: "Homo_sapiens",
    assemblies: [
      { name: "GRCh38", label: "GRCh38 (hg38)" },
      { name: "GRCh37", label: "GRCh37 (hg19)" },
    ],
  },
  {
    id: "mouse",
    displayName: "Mouse",
    ensemblName: "mouse",
    browserBase: "https://www.ensembl.org",
    browserSpecies: "Mus_musculus",
    assemblies: [
      { name: "GRCm39", label: "GRCm39 (mm39)" },
      { name: "GRCm38", label: "GRCm38 (mm10)" },
    ],
  },
  {
    id: "zebrafish",
    displayName: "Zebrafish",
    ensemblName: "zebrafish",
    browserBase: "https://www.ensembl.org",
    browserSpecies: "Danio_rerio",
    assemblies: [
      { name: "GRCz11", label: "GRCz11 (danRer11)" },
    ],
  },
  {
    id: "drosophila",
    displayName: "Fruit fly",
    ensemblName: "drosophila_melanogaster",
    browserBase: "https://www.ensembl.org",
    browserSpecies: "Drosophila_melanogaster",
    assemblies: [
      { name: "BDGP6.46", label: "BDGP6 (dm6)" },
    ],
  },
  {
    id: "c_elegans",
    displayName: "C. elegans",
    ensemblName: "caenorhabditis_elegans",
    browserBase: "https://www.ensembl.org",
    browserSpecies: "Caenorhabditis_elegans",
    assemblies: [
      { name: "WBcel235", label: "WBcel235 (ce11)" },
    ],
  },
  {
    id: "a_thaliana",
    displayName: "A. thaliana",
    ensemblName: "arabidopsis_thaliana",
    browserBase: "https://plants.ensembl.org",
    browserSpecies: "Arabidopsis_thaliana",
    assemblies: [
      { name: "TAIR10", label: "TAIR10" },
    ],
  },
  {
    id: "s_cerevisiae",
    displayName: "S. cerevisiae",
    ensemblName: "saccharomyces_cerevisiae",
    browserBase: "https://www.ensembl.org",
    browserSpecies: "Saccharomyces_cerevisiae",
    assemblies: [
      { name: "R64-1-1", label: "R64-1-1 (sacCer3)" },
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
