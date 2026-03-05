import type { BedFormat } from "./bed";

/** Genome assembly versions */
export type Assembly = "GRCh37" | "GRCh38";

/** Detected file format */
export type FileFormat = BedFormat | "vcf" | "gff3";

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
