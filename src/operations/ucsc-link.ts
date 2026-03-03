import { toast } from "sonner";

import type { GenomicRow } from "../types/genomic";
import type { Assembly } from "../types/genomic";

/**
 * Open selected regions in UCSC Genome Browser.
 * Single region: direct link. Multiple: bounding region with 10% padding.
 */
export function openInUCSC(
  rows: readonly GenomicRow[],
  assembly: Assembly | null,
  isBed: boolean,
): void {
  if (rows.length === 0) {
    toast.error("No rows selected");
    return;
  }

  const db = assembly === "GRCh37" ? "hg19" : "hg38";

  if (rows.length === 1) {
    const row = rows[0]!;
    const { chrom, start, end } = getUCSCCoords(row, isBed);
    const url = `https://genome.ucsc.edu/cgi-bin/hgTracks?db=${db}&position=${encodeURIComponent(`${chrom}:${start}-${end}`)}`;
    window.open(url, "_blank");
    return;
  }

  // Multiple rows: compute bounding region per chromosome
  // Pick the first chromosome's bounding box (if mixed chroms, use bounding of all same-chrom rows)
  const firstChrom = getChrom(rows[0]!, isBed);
  const sameChrRows = rows.filter((r) => getChrom(r, isBed) === firstChrom);

  let minStart = Infinity;
  let maxEnd = -Infinity;
  for (const row of sameChrRows) {
    const { start, end } = getUCSCCoords(row, isBed);
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

function getChrom(row: GenomicRow, isBed: boolean): string {
  return String(isBed ? row.chrom : row.CHROM) ?? "";
}

function getUCSCCoords(
  row: GenomicRow,
  isBed: boolean,
): { chrom: string; start: number; end: number } {
  const chrom = getChrom(row, isBed);
  if (isBed) {
    // BED is 0-based, UCSC URL is also 0-based
    return {
      chrom,
      start: Number(row.chromStart) || 0,
      end: Number(row.chromEnd) || 0,
    };
  }
  // VCF: POS is 1-based, UCSC needs 0-based start
  const pos = Number(row.POS) || 1;
  return {
    chrom: String(row.CHROM ?? ""),
    start: pos - 1,
    end: pos,
  };
}
