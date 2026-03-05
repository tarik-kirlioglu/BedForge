import type { FileFormat } from "../types/genomic";

/** Get the chromosome/seqid column name for a given format */
export function getChromColumn(format: FileFormat): string {
  if (format === "vcf") return "CHROM";
  if (format === "gff3") return "seqid";
  return "chrom";
}

/** Get the start coordinate column name for a given format */
export function getStartColumn(format: FileFormat): string {
  if (format === "vcf") return "POS";
  if (format === "gff3") return "start";
  return "chromStart";
}

/** Get the end coordinate column name for a given format */
export function getEndColumn(format: FileFormat): string {
  if (format === "vcf") return "POS";
  if (format === "gff3") return "end";
  return "chromEnd";
}

/** Is this format 0-based? Only BED family */
export function isZeroBased(format: FileFormat): boolean {
  return format !== "vcf" && format !== "gff3";
}

/** Convert a native start coordinate to Ensembl 1-based start */
export function toEnsemblStart(val: number, format: FileFormat): number {
  return isZeroBased(format) ? val + 1 : val;
}

/** Convert a native end coordinate to Ensembl 1-based end */
export function toEnsemblEnd(val: number, _format: FileFormat): number {
  return val;
}

/** Is this a BED-family format? (has chrom/chromStart/chromEnd columns) */
export function isBedFamily(format: FileFormat): boolean {
  return format !== "vcf" && format !== "gff3";
}
