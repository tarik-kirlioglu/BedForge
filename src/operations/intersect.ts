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

export type IntersectAction = "keep" | "remove";
export type MatchType = "overlap" | "exact";

/** Find which rows match (or don't) with target intervals */
export function findOverlaps(
  targets: GenomicRow[],
  targetFormat: FileFormat,
  matchType: MatchType = "overlap",
): { matching: Set<number>; nonMatching: Set<number> } {
  const store = useFileStore.getState();
  const mainFormat = store.fileFormat!;

  const chromCol = getChromColumn(mainFormat);
  const startCol = getStartColumn(mainFormat);
  const endCol = getEndColumn(mainFormat);

  const matching = new Set<number>();
  const nonMatching = new Set<number>();

  if (matchType === "exact") {
    const exactKeys = buildExactIndex(targets, targetFormat);

    for (const row of store.rows) {
      const chrom = String(row[chromCol] ?? "");
      const start = Number(row[startCol]);
      const end = Number(row[endCol]);
      const key = `${chrom}:${start}:${end}`;

      if (exactKeys.has(key)) {
        matching.add(row._index);
      } else {
        nonMatching.add(row._index);
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
        matching.add(row._index);
      } else {
        nonMatching.add(row._index);
      }
    }
  }

  return { matching, nonMatching };
}

/** Run intersect or subtract with overlap or exact matching */
export function runIntersect(
  action: IntersectAction,
  matchType: MatchType,
  targets: GenomicRow[],
  targetFormat: FileFormat,
): void {
  const store = useFileStore.getState();
  const { matching, nonMatching } = findOverlaps(targets, targetFormat, matchType);

  const toRemove = action === "keep" ? nonMatching : matching;

  if (toRemove.size === 0) {
    const matchLabel = matchType === "exact" ? "exact match" : "overlap";
    const desc = action === "keep"
      ? `All rows have ${matchLabel} with the target`
      : `No rows have ${matchLabel} with the target`;
    toast.info("No rows affected", { description: desc });
    return;
  }

  const kept = store.rows.length - toRemove.size;
  store.deleteRows(toRemove);

  const actionLabel = action === "keep" ? "Intersect" : "Subtract";
  const matchLabel = matchType === "exact" ? " (exact)" : "";
  toast.success(`${actionLabel}${matchLabel} complete`, {
    description: `Kept ${kept} rows, removed ${toRemove.size}`,
  });
}
