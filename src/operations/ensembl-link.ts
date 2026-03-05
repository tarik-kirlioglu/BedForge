import { toast } from "sonner";

import type { GenomicRow, FileFormat, SpeciesConfig } from "../types/genomic";
import { getChromColumn, getStartColumn, getEndColumn, isZeroBased } from "../utils/format-helpers";
import { toEnsemblChrom } from "../utils/chromosome";

/**
 * Open selected regions in Ensembl Genome Browser.
 * Single region: direct link. Multiple: bounding region with 10% padding.
 * Ensembl URL uses 1-based inclusive coordinates.
 */
export function openInEnsembl(
  rows: readonly GenomicRow[],
  format: FileFormat,
  species?: SpeciesConfig | null,
): void {
  if (rows.length === 0) {
    toast.error("No rows selected");
    return;
  }

  const browserBase = species?.browserBase ?? "https://www.ensembl.org";
  const browserSpecies = species?.browserSpecies ?? "Homo_sapiens";

  if (rows.length === 1) {
    const row = rows[0]!;
    const { chrom, start, end } = getEnsemblCoords(row, format);
    const url = `${browserBase}/${browserSpecies}/Location/View?r=${encodeURIComponent(`${chrom}:${start}-${end}`)}`;
    window.open(url, "_blank");
    return;
  }

  // Multiple rows: compute bounding region per chromosome
  const firstChrom = getChromValue(rows[0]!, format);
  const sameChrRows = rows.filter((r) => getChromValue(r, format) === firstChrom);

  let minStart = Infinity;
  let maxEnd = -Infinity;
  for (const row of sameChrRows) {
    const { start, end } = getEnsemblCoords(row, format);
    if (start < minStart) minStart = start;
    if (end > maxEnd) maxEnd = end;
  }

  // Add 10% padding
  const span = maxEnd - minStart;
  const padding = Math.round(span * 0.1);
  const paddedStart = Math.max(1, minStart - padding);
  const paddedEnd = maxEnd + padding;

  const ensemblChrom = toEnsemblChrom(firstChrom);
  const url = `${browserBase}/${browserSpecies}/Location/View?r=${encodeURIComponent(`${ensemblChrom}:${paddedStart}-${paddedEnd}`)}`;
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

/**
 * Get Ensembl 1-based inclusive coordinates from a row.
 */
function getEnsemblCoords(
  row: GenomicRow,
  format: FileFormat,
): { chrom: string; start: number; end: number } {
  const rawChrom = getChromValue(row, format);
  const chrom = toEnsemblChrom(rawChrom);
  const startCol = getStartColumn(format);
  const endCol = getEndColumn(format);

  if (isZeroBased(format)) {
    // BED 0-based half-open → Ensembl 1-based inclusive
    return {
      chrom,
      start: (Number(row[startCol]) || 0) + 1,
      end: Number(row[endCol]) || 0,
    };
  }
  // VCF/GFF3 already 1-based
  return {
    chrom,
    start: Number(row[startCol]) || 1,
    end: Number(row[endCol]) || 1,
  };
}
