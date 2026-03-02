import { toast } from "sonner";

import { useFileStore } from "../stores/useFileStore";

/**
 * Remove duplicate rows based on chrom:start:end coordinates.
 * Keeps the first occurrence, removes subsequent duplicates.
 */
export function runRemoveDuplicates(isBed: boolean): void {
  const store = useFileStore.getState();
  const seen = new Set<string>();
  const duplicateIndices = new Set<number>();

  for (const row of store.rows) {
    const chrom = String(row.chrom ?? row.CHROM ?? "");
    const start = String(isBed ? row.chromStart : row.POS);
    const end = isBed ? String(row.chromEnd) : start;
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
