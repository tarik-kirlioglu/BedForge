import { detectFormat } from "./detect-format";
import { parseBed } from "./bed-parser";
import { parseVcf } from "./vcf-parser";
import { parseGff3 } from "./gff3-parser";
import { detectChrPrefix } from "../utils/chromosome";
import {
  isGzipped,
  stripGzExtension,
  decompressGz,
  formatBytes,
  SOFT_SIZE_LIMIT,
  HARD_SIZE_LIMIT,
} from "../utils/decompress";
import type { ParsedFile } from "../types/batch";

const ACCEPTED_EXTENSIONS = [
  ".bed", ".bed3", ".bed4", ".bed6", ".bed12",
  ".vcf", ".gff3", ".gff", ".txt", ".tsv",
];

/**
 * Parse a genomic file from disk into a ParsedFile.
 * Handles gzip decompression, format detection, and parsing.
 * Throws on unsupported format, size limit exceeded, or read errors.
 */
export async function parseFileFromDisk(file: File): Promise<ParsedFile> {
  const baseName = stripGzExtension(file.name);
  const ext = "." + (baseName.split(".").pop()?.toLowerCase() ?? "");
  if (!ACCEPTED_EXTENSIONS.includes(ext) && ext !== ".") {
    throw new Error(`Unsupported file format: ${ext}`);
  }

  let content: string;

  if (isGzipped(file.name)) {
    content = await decompressGz(file);
  } else {
    if (file.size > HARD_SIZE_LIMIT) {
      throw new Error(
        `File size (${formatBytes(file.size)}) exceeds ${formatBytes(HARD_SIZE_LIMIT)}`,
      );
    }
    content = await file.text();
  }

  // Check decompressed size
  const decompressedBytes = new Blob([content]).size;
  if (decompressedBytes > HARD_SIZE_LIMIT) {
    throw new Error(
      `Decompressed size (${formatBytes(decompressedBytes)}) exceeds ${formatBytes(HARD_SIZE_LIMIT)}`,
    );
  }

  return parseContent(content, file.name);
}

/**
 * Parse raw text content into a ParsedFile.
 * Used by both file loading and example loading.
 */
export function parseContent(content: string, fileName: string): ParsedFile {
  const format = detectFormat(fileName, content);
  if (!format) {
    throw new Error("Could not detect file format");
  }

  if (format === "vcf") {
    const result = parseVcf(content);
    const firstChrom = String(result.rows[0]?.CHROM ?? "chr1");
    return {
      fileName,
      fileFormat: "vcf",
      rows: result.rows,
      columns: result.columns,
      vcfMeta: result.vcfFile.meta,
      vcfSampleNames: result.vcfFile.sampleNames,
      gff3Directives: [],
      useChrPrefix: detectChrPrefix(firstChrom),
    };
  }

  if (format === "gff3") {
    const result = parseGff3(content);
    const firstSeqid = String(result.rows[0]?.seqid ?? "chr1");
    return {
      fileName,
      fileFormat: "gff3",
      rows: result.rows,
      columns: result.columns,
      vcfMeta: [],
      vcfSampleNames: [],
      gff3Directives: result.directives,
      useChrPrefix: detectChrPrefix(firstSeqid),
    };
  }

  // BED family
  const result = parseBed(content);
  const firstChrom = String(result.rows[0]?.chrom ?? "chr1");
  return {
    fileName,
    fileFormat: result.format,
    rows: result.rows,
    columns: result.columns,
    vcfMeta: [],
    vcfSampleNames: [],
    gff3Directives: [],
    useChrPrefix: detectChrPrefix(firstChrom),
  };
}

/** Check if decompressed size exceeds the soft limit (for warning) */
export function exceedsSoftLimit(content: string): boolean {
  return new Blob([content]).size > SOFT_SIZE_LIMIT;
}
