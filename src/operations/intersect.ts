import { toast } from "sonner";

import { useFileStore } from "../stores/useFileStore";
import type { GenomicRow } from "../types/genomic";

interface Interval {
  start: number;
  end: number;
}

/** Group and sort target intervals by chromosome for binary search */
function buildIndex(
  targets: GenomicRow[],
): Map<string, Interval[]> {
  const index = new Map<string, Interval[]>();

  for (const row of targets) {
    const chrom = String(row.chrom ?? "");
    const start = Number(row.chromStart);
    const end = Number(row.chromEnd);
    if (!chrom || isNaN(start) || isNaN(end)) continue;

    if (!index.has(chrom)) {
      index.set(chrom, []);
    }
    index.get(chrom)!.push({ start, end });
  }

  // Sort each chromosome's intervals by start position
  for (const intervals of index.values()) {
    intervals.sort((a, b) => a.start - b.start);
  }

  return index;
}

/** Check if a query interval overlaps any interval in a sorted list */
function hasOverlap(
  intervals: Interval[],
  queryStart: number,
  queryEnd: number,
): boolean {
  // Binary search for first interval that could overlap
  let lo = 0;
  let hi = intervals.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (intervals[mid]!.end <= queryStart) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  // Check from lo onwards
  for (let i = lo; i < intervals.length; i++) {
    const iv = intervals[i]!;
    if (iv.start >= queryEnd) break; // No more overlaps possible
    // Overlap: query.start < iv.end && iv.start < query.end
    if (queryStart < iv.end && iv.start < queryEnd) {
      return true;
    }
  }

  return false;
}

/** Find which rows overlap (or don't) with target intervals */
export function findOverlaps(
  targets: GenomicRow[],
): { overlapping: Set<number>; nonOverlapping: Set<number> } {
  const store = useFileStore.getState();
  const index = buildIndex(targets);

  const overlapping = new Set<number>();
  const nonOverlapping = new Set<number>();

  for (const row of store.rows) {
    const chrom = String(row.chrom ?? "");
    const start = Number(row.chromStart);
    const end = Number(row.chromEnd);

    const chromIntervals = index.get(chrom);
    if (chromIntervals && hasOverlap(chromIntervals, start, end)) {
      overlapping.add(row._index);
    } else {
      nonOverlapping.add(row._index);
    }
  }

  return { overlapping, nonOverlapping };
}

/** Run intersect (keep overlapping) or subtract (remove overlapping) */
export function runIntersect(
  mode: "intersect" | "subtract",
  targets: GenomicRow[],
): void {
  const store = useFileStore.getState();
  const { overlapping, nonOverlapping } = findOverlaps(targets);

  const toRemove = mode === "intersect" ? nonOverlapping : overlapping;

  if (toRemove.size === 0) {
    toast.info("No rows affected", {
      description: mode === "intersect"
        ? "All rows overlap with the target regions"
        : "No rows overlap with the target regions",
    });
    return;
  }

  const kept = store.rows.length - toRemove.size;
  store.deleteRows(toRemove);

  toast.success(
    mode === "intersect" ? "Intersect complete" : "Subtract complete",
    { description: `Kept ${kept} rows, removed ${toRemove.size}` },
  );
}
