import { toast } from "sonner";

import { useFileStore } from "../stores/useFileStore";

/**
 * Scan the "type" column for unique feature types with counts.
 */
export function scanFeatureTypes(): Map<string, number> {
  const rows = useFileStore.getState().rows;
  const counts = new Map<string, number>();

  for (const row of rows) {
    const type = String(row.type ?? ".");
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }

  return counts;
}

/**
 * Filter GFF3 rows by feature type.
 * Keeps only rows whose "type" column is in the keepTypes set.
 */
export function runTypeFilter(keepTypes: Set<string>): void {
  const store = useFileStore.getState();
  const removeIndices = new Set<number>();

  for (const row of store.rows) {
    const type = String(row.type ?? ".");
    if (!keepTypes.has(type)) {
      removeIndices.add(row._index);
    }
  }

  if (removeIndices.size === 0) {
    toast.info("No rows filtered");
    return;
  }

  store.deleteRows(removeIndices);

  const kept = store.rows.length - removeIndices.size;
  toast.success("Type filter applied", {
    description: `Kept ${kept} rows, removed ${removeIndices.size}`,
  });
}
