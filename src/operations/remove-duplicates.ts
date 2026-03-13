import { toast } from "sonner";

import { useFileStore } from "../stores/useFileStore";
import { getChromColumn, getStartColumn, getEndColumn } from "../utils/format-helpers";
import type { FileFormat, GenomicRow } from "../types/genomic";

/**
 * Remove duplicate rows based on chrom:start:end coordinates.
 * Keeps the first occurrence, removes subsequent duplicates.
 */
export function runRemoveDuplicates(format: FileFormat): void {
  const store = useFileStore.getState();
  const seen = new Set<string>();
  const duplicateIndices = new Set<number>();
  const chromCol = getChromColumn(format);
  const startCol = getStartColumn(format);
  const endCol = getEndColumn(format);

  for (const row of store.rows) {
    const chrom = String(row[chromCol] ?? "");
    const start = String(row[startCol]);
    const end = String(row[endCol]);
    const key = `${chrom}:${start}:${end}`;

    if (seen.has(key)) {
      duplicateIndices.add(row._index);
    } else {
      seen.add(key);
    }
  }

  if (duplicateIndices.size === 0) {
    toast.info("No duplicates found");
    return;
  }

  store.deleteRows(duplicateIndices);

  toast.success("Duplicates removed", {
    description: `Removed ${duplicateIndices.size} duplicate row${duplicateIndices.size !== 1 ? "s" : ""}`,
  });
}

/** Pure variant: remove duplicate rows by chrom:start:end */
export function removeDuplicateRows(rows: GenomicRow[], format: FileFormat): GenomicRow[] {
  const seen = new Set<string>();
  const chromCol = getChromColumn(format);
  const startCol = getStartColumn(format);
  const endCol = getEndColumn(format);
  const result: GenomicRow[] = [];

  for (const row of rows) {
    const key = `${String(row[chromCol] ?? "")}:${String(row[startCol])}:${String(row[endCol])}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(row);
    }
  }
  return result;
}
