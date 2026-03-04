import { toast } from "sonner";

import { downloadFile } from "../exporters/download";
import type { GenomicRow } from "../types/genomic";

/**
 * Generate and download an IGV batch script for selected regions.
 * IGV uses 1-based coordinates.
 * Usage: IGV → Tools → Run Batch Script → select this file.
 */
export function downloadIGVBatch(
  rows: readonly GenomicRow[],
  isBed: boolean,
): void {
  if (rows.length === 0) {
    toast.error("No rows selected");
    return;
  }

  const lines: string[] = [];

  for (const row of rows) {
    const { chrom, start, end } = getIGVCoords(row, isBed);
    lines.push(`goto ${chrom}:${start}-${end}`);
  }

  const content = lines.join("\n") + "\n";
  downloadFile(content, "igv_regions.txt");

  toast.success(`IGV batch script downloaded`, {
    description: `${rows.length} region${rows.length !== 1 ? "s" : ""} — open via IGV → Tools → Run Batch Script`,
  });
}

function getIGVCoords(
  row: GenomicRow,
  isBed: boolean,
): { chrom: string; start: number; end: number } {
  if (isBed) {
    // BED is 0-based half-open; IGV is 1-based
    const chrom = String(row.chrom ?? "");
    const start = (Number(row.chromStart) || 0) + 1;
    const end = Number(row.chromEnd) || 0;
    return { chrom, start, end };
  }
  // VCF: POS is already 1-based
  const chrom = String(row.CHROM ?? "");
  const pos = Number(row.POS) || 1;
  return { chrom, start: pos, end: pos };
}
