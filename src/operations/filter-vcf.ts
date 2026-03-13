import { toast } from "sonner";

import { useFileStore } from "../stores/useFileStore";
import type { GenomicRow } from "../types/genomic";

/**
 * Filter VCF rows by FILTER column values.
 * Keeps rows whose FILTER value is in the keepValues set.
 */
export function runFilterByFilter(keepValues: Set<string>): void {
  const store = useFileStore.getState();
  const before = store.rows.length;

  const toRemove = new Set<number>();
  for (const row of store.rows) {
    const filter = String(row.FILTER ?? ".");
    if (!keepValues.has(filter)) {
      toRemove.add(row._index);
    }
  }

  if (toRemove.size === 0) {
    toast.info("No rows removed", {
      description: "All rows match the selected FILTER values",
    });
    return;
  }

  store.deleteRows(toRemove);

  const kept = before - toRemove.size;
  toast.success("Filtered by FILTER column", {
    description: `Kept ${kept} rows, removed ${toRemove.size}`,
  });
}

/**
 * Filter VCF rows by minimum QUAL score.
 * Removes rows with QUAL below the threshold.
 * Rows with QUAL = "." are kept (missing quality).
 */
export function runFilterByQual(minQual: number): void {
  const store = useFileStore.getState();
  const before = store.rows.length;

  const toRemove = new Set<number>();
  for (const row of store.rows) {
    const qualStr = String(row.QUAL ?? ".");
    if (qualStr === ".") continue; // keep rows with missing QUAL
    const qual = Number(qualStr);
    if (!isNaN(qual) && qual < minQual) {
      toRemove.add(row._index);
    }
  }

  if (toRemove.size === 0) {
    toast.info("No rows removed", {
      description: `All rows have QUAL ≥ ${minQual}`,
    });
    return;
  }

  store.deleteRows(toRemove);

  const kept = before - toRemove.size;
  toast.success(`Filtered by QUAL ≥ ${minQual}`, {
    description: `Kept ${kept} rows, removed ${toRemove.size}`,
  });
}

/** Get unique FILTER values and their counts from current rows */
export function getFilterValues(): Array<{ value: string; count: number }> {
  const rows = useFileStore.getState().rows;
  const counts = new Map<string, number>();

  for (const row of rows) {
    const filter = String(row.FILTER ?? ".");
    counts.set(filter, (counts.get(filter) ?? 0) + 1);
  }

  // Sort: PASS first, then "." , then alphabetical
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => {
      if (a.value === "PASS") return -1;
      if (b.value === "PASS") return 1;
      if (a.value === ".") return -1;
      if (b.value === ".") return 1;
      return a.value.localeCompare(b.value);
    });
}

/** Get QUAL statistics from current rows */
export function getQualStats(): { min: number; max: number; median: number } {
  const rows = useFileStore.getState().rows;
  const quals: number[] = [];

  for (const row of rows) {
    const qualStr = String(row.QUAL ?? ".");
    if (qualStr === ".") continue;
    const qual = Number(qualStr);
    if (!isNaN(qual)) quals.push(qual);
  }

  if (quals.length === 0) return { min: 0, max: 0, median: 0 };

  quals.sort((a, b) => a - b);
  const min = quals[0]!;
  const max = quals[quals.length - 1]!;
  const mid = Math.floor(quals.length / 2);
  const median = quals.length % 2 === 0
    ? (quals[mid - 1]! + quals[mid]!) / 2
    : quals[mid]!;

  return { min, max, median: Math.round(median * 10) / 10 };
}

/** Pure variant: filter rows by FILTER column values */
export function filterByFilterValues(rows: GenomicRow[], keepValues: Set<string>): GenomicRow[] {
  return rows.filter((row) => keepValues.has(String(row.FILTER ?? ".")));
}

/** Pure variant: filter rows by minimum QUAL score */
export function filterByQual(rows: GenomicRow[], minQual: number): GenomicRow[] {
  return rows.filter((row) => {
    const qualStr = String(row.QUAL ?? ".");
    if (qualStr === ".") return true;
    const qual = Number(qualStr);
    return isNaN(qual) || qual >= minQual;
  });
}
