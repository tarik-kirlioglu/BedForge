import { toast } from "sonner";

import { useFileStore } from "../stores/useFileStore";
import type { FileFormat, GenomicRow } from "../types/genomic";
import { getChromColumn, getStartColumn, getEndColumn, isZeroBased } from "../utils/format-helpers";

interface Interval {
  start: number;
  end: number;
}

/**
 * Normalize an interval to half-open [start, end) for uniform overlap detection.
 * BED is already half-open. VCF (POS only) becomes [POS, POS+1). GFF3 (inclusive) becomes [start, end+1).
 */
function toHalfOpen(start: number, end: number, format: FileFormat): { start: number; end: number } {
  if (isZeroBased(format)) return { start, end };
  // 1-based inclusive → half-open: [start-1, end)
  return { start: start - 1, end };
}

/** Group and sort target intervals by chromosome for binary search */
function buildIndex(
  targets: GenomicRow[],
  format: FileFormat,
): Map<string, Interval[]> {
  const index = new Map<string, Interval[]>();
  const chromCol = getChromColumn(format);
  const startCol = getStartColumn(format);
  const endCol = getEndColumn(format);

  for (const row of targets) {
    const chrom = String(row[chromCol] ?? "");
    const rawStart = Number(row[startCol]);
    const rawEnd = Number(row[endCol]);
    if (!chrom || isNaN(rawStart) || isNaN(rawEnd)) continue;

    const iv = toHalfOpen(rawStart, rawEnd, format);

    if (!index.has(chrom)) {
      index.set(chrom, []);
    }
    index.get(chrom)!.push(iv);
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

/** Build a Set of "chrom:start:end" keys for exact match lookups */
function buildExactIndex(
  targets: GenomicRow[],
  format: FileFormat,
): Set<string> {
  const keys = new Set<string>();
  const chromCol = getChromColumn(format);
  const startCol = getStartColumn(format);
  const endCol = getEndColumn(format);

  for (const row of targets) {
    const chrom = String(row[chromCol] ?? "");
    const start = Number(row[startCol]);
    const end = Number(row[endCol]);
    if (!chrom || isNaN(start) || isNaN(end)) continue;
    keys.add(`${chrom}:${start}:${end}`);
  }

  return keys;
}

export type IntersectMode = "intersect" | "subtract" | "exact";

/** Find which rows overlap (or don't) with target intervals */
export function findOverlaps(
  targets: GenomicRow[],
  targetFormat: FileFormat,
  mode: IntersectMode = "intersect",
): { overlapping: Set<number>; nonOverlapping: Set<number> } {
  const store = useFileStore.getState();
  const mainFormat = store.fileFormat!;

  const chromCol = getChromColumn(mainFormat);
  const startCol = getStartColumn(mainFormat);
  const endCol = getEndColumn(mainFormat);

  const overlapping = new Set<number>();
  const nonOverlapping = new Set<number>();

  if (mode === "exact") {
    const exactKeys = buildExactIndex(targets, targetFormat);

    for (const row of store.rows) {
      const chrom = String(row[chromCol] ?? "");
      const start = Number(row[startCol]);
      const end = Number(row[endCol]);
      const key = `${chrom}:${start}:${end}`;

      if (exactKeys.has(key)) {
        overlapping.add(row._index);
      } else {
        nonOverlapping.add(row._index);
      }
    }
  } else {
    const index = buildIndex(targets, targetFormat);

    for (const row of store.rows) {
      const chrom = String(row[chromCol] ?? "");
      const rawStart = Number(row[startCol]);
      const rawEnd = Number(row[endCol]);
      const iv = toHalfOpen(rawStart, rawEnd, mainFormat);

      const chromIntervals = index.get(chrom);
      if (chromIntervals && hasOverlap(chromIntervals, iv.start, iv.end)) {
        overlapping.add(row._index);
      } else {
        nonOverlapping.add(row._index);
      }
    }
  }

  return { overlapping, nonOverlapping };
}

/** Run intersect, subtract, or exact match */
export function runIntersect(
  mode: IntersectMode,
  targets: GenomicRow[],
  targetFormat: FileFormat,
): void {
  const store = useFileStore.getState();
  const { overlapping, nonOverlapping } = findOverlaps(targets, targetFormat, mode);

  const toRemove = mode === "subtract" ? overlapping : nonOverlapping;

  if (toRemove.size === 0) {
    const descriptions: Record<IntersectMode, string> = {
      intersect: "All rows overlap with the target regions",
      subtract: "No rows overlap with the target regions",
      exact: "All rows have exact matches in the target file",
    };
    toast.info("No rows affected", { description: descriptions[mode] });
    return;
  }

  const labels: Record<IntersectMode, string> = {
    intersect: "Intersect complete",
    subtract: "Subtract complete",
    exact: "Exact match complete",
  };

  const kept = store.rows.length - toRemove.size;
  store.deleteRows(toRemove);

  toast.success(labels[mode], {
    description: `Kept ${kept} rows, removed ${toRemove.size}`,
  });
}
