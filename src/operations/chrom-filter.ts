import { toast } from "sonner";

import { useFileStore } from "../stores/useFileStore";
import { getChromColumn } from "../utils/format-helpers";

import type { FileFormat, GenomicRow } from "../types/genomic";

/**
 * Scan the chromosome column for unique values with counts.
 */
export function scanChromosomes(format: FileFormat): Map<string, number> {
  const rows = useFileStore.getState().rows;
  const chromCol = getChromColumn(format);
  const counts = new Map<string, number>();

  for (const row of rows) {
    const chrom = String(row[chromCol] ?? ".");
    counts.set(chrom, (counts.get(chrom) ?? 0) + 1);
  }

  return counts;
}

/**
 * Filter rows by chromosome.
 * Keeps only rows whose chromosome column value is in the keepChroms set.
 */
export function runChromFilter(keepChroms: Set<string>, format: FileFormat): void {
  const store = useFileStore.getState();
  const chromCol = getChromColumn(format);
  const removeIndices = new Set<number>();

  for (const row of store.rows) {
    const chrom = String(row[chromCol] ?? ".");
    if (!keepChroms.has(chrom)) {
      removeIndices.add(row._index);
    }
  }

  if (removeIndices.size === 0) {
    toast.info("No rows filtered");
    return;
  }

  store.deleteRows(removeIndices);

  const kept = store.rows.length - removeIndices.size;
  toast.success("Chromosome filter applied", {
    description: `Kept ${kept} rows, removed ${removeIndices.size}`,
  });
}

/** Pure variant: filter rows by chromosome values */
export function filterByChromValues(rows: GenomicRow[], keepChroms: Set<string>, format: FileFormat): GenomicRow[] {
  const chromCol = getChromColumn(format);
  return rows.filter((row) => keepChroms.has(String(row[chromCol] ?? ".")));
}
