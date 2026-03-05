import { toast } from "sonner";

import type { GenomicRow, FileFormat } from "../types/genomic";
import type { Assembly } from "../types/genomic";
import { getChromColumn, getStartColumn, getEndColumn, isZeroBased } from "../utils/format-helpers";

/**
 * Open selected regions in UCSC Genome Browser.
 * Single region: direct link. Multiple: bounding region with 10% padding.
 */
export function openInUCSC(
  rows: readonly GenomicRow[],
  assembly: Assembly | null,
  format: FileFormat,
): void {
  if (rows.length === 0) {
    toast.error("No rows selected");
    return;
  }

  const db = assembly === "GRCh37" ? "hg19" : "hg38";

  if (rows.length === 1) {
    const row = rows[0]!;
    const { chrom, start, end } = getUCSCCoords(row, format);
    const url = `https://genome.ucsc.edu/cgi-bin/hgTracks?db=${db}&position=${encodeURIComponent(`${chrom}:${start}-${end}`)}`;
    window.open(url, "_blank");
    return;
  }

  // Multiple rows: compute bounding region per chromosome
  // Pick the first chromosome's bounding box (if mixed chroms, use bounding of all same-chrom rows)
  const firstChrom = getChromValue(rows[0]!, format);
  const sameChrRows = rows.filter((r) => getChromValue(r, format) === firstChrom);

  let minStart = Infinity;
  let maxEnd = -Infinity;
  for (const row of sameChrRows) {
    const { start, end } = getUCSCCoords(row, format);
    if (start < minStart) minStart = start;
    if (end > maxEnd) maxEnd = end;
  }

  // Add 10% padding
  const span = maxEnd - minStart;
  const padding = Math.round(span * 0.1);
  const paddedStart = Math.max(0, minStart - padding);
  const paddedEnd = maxEnd + padding;

  const url = `https://genome.ucsc.edu/cgi-bin/hgTracks?db=${db}&position=${encodeURIComponent(`${firstChrom}:${paddedStart}-${paddedEnd}`)}`;
  window.open(url, "_blank");

  if (sameChrRows.length < rows.length) {
    toast.info("Multiple chromosomes selected", {
      description: `Showing ${sameChrRows.length} regions on ${firstChrom}`,
    });
  }
}

function getChromValue(row: GenomicRow, format: FileFormat): string {
  const col = getChromColumn(format);
  return String(row[col] ?? "");
}

function getUCSCCoords(
  row: GenomicRow,
  format: FileFormat,
): { chrom: string; start: number; end: number } {
  const chrom = getChromValue(row, format);
  const startCol = getStartColumn(format);
  const endCol = getEndColumn(format);

  if (isZeroBased(format)) {
    // BED is 0-based, UCSC URL is also 0-based
    return {
      chrom,
      start: Number(row[startCol]) || 0,
      end: Number(row[endCol]) || 0,
    };
  }
  // 1-based formats (VCF, GFF3): UCSC needs 0-based start
  const startVal = Number(row[startCol]) || 1;
  const endVal = Number(row[endCol]) || startVal;
  return {
    chrom,
    start: startVal - 1,
    end: endVal,
  };
}
