import { toast } from "sonner";

import { useFileStore } from "../stores/useFileStore";
import type { GenomicRow } from "../types/genomic";

/**
 * Merge overlapping and adjacent BED regions on the same chromosome.
 * Similar to `bedtools merge`. Requires BED format.
 *
 * Algorithm:
 * 1. Group rows by chromosome
 * 2. Sort each group by start position
 * 3. Walk through and merge overlapping/adjacent intervals
 */
export function runMergeRegions(): void {
  const store = useFileStore.getState();
  const rows = store.rows;

  if (rows.length === 0) return;

  // Group by chromosome
  const groups = new Map<string, GenomicRow[]>();
  for (const row of rows) {
    const chrom = String(row.chrom ?? "");
    if (!groups.has(chrom)) {
      groups.set(chrom, []);
    }
    groups.get(chrom)!.push(row);
  }

  const merged: GenomicRow[] = [];
  let idx = 0;

  // Natural chromosome order for output
  const sortedChroms = [...groups.keys()].sort((a, b) => {
    const numA = parseInt(a.replace(/^chr/i, ""), 10);
    const numB = parseInt(b.replace(/^chr/i, ""), 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    if (!isNaN(numA)) return -1;
    if (!isNaN(numB)) return 1;
    return a.localeCompare(b);
  });

  for (const chrom of sortedChroms) {
    const group = groups.get(chrom)!;

    // Sort by start position
    group.sort((a, b) => Number(a.chromStart) - Number(b.chromStart));

    let currentStart = Number(group[0]!.chromStart);
    let currentEnd = Number(group[0]!.chromEnd);

    for (let i = 1; i < group.length; i++) {
      const rowStart = Number(group[i]!.chromStart);
      const rowEnd = Number(group[i]!.chromEnd);

      if (rowStart <= currentEnd) {
        // Overlapping or adjacent — extend
        currentEnd = Math.max(currentEnd, rowEnd);
      } else {
        // No overlap — emit current region and start new one
        merged.push({
          _index: idx,
          _rowId: `${chrom}:${currentStart}-${currentEnd}:${idx}`,
          chrom,
          chromStart: currentStart,
          chromEnd: currentEnd,
        });
        idx++;
        currentStart = rowStart;
        currentEnd = rowEnd;
      }
    }

    // Emit last region
    merged.push({
      _index: idx,
      _rowId: `${chrom}:${currentStart}-${currentEnd}:${idx}`,
      chrom,
      chromStart: currentStart,
      chromEnd: currentEnd,
    });
    idx++;
  }

  const removedCount = rows.length - merged.length;

  // Replace all rows
  useFileStore.setState((state) => {
    const history = [...state.history.slice(0, state.historyIndex + 1)];
    history.push(state.rows.map((r) => ({ ...r })));
    if (history.length > 20) history.shift();
    return {
      rows: merged,
      columns: ["chrom", "chromStart", "chromEnd"],
      fileFormat: "bed3",
      history,
      historyIndex: history.length - 1,
    };
  });

  toast.success("Regions merged", {
    description: `${rows.length} regions → ${merged.length} (${removedCount} merged)`,
  });
}

/** Pure variant: merge overlapping BED regions */
export function mergeRegionRows(rows: GenomicRow[]): GenomicRow[] {
  if (rows.length === 0) return [];

  const groups = new Map<string, GenomicRow[]>();
  for (const row of rows) {
    const chrom = String(row.chrom ?? "");
    if (!groups.has(chrom)) groups.set(chrom, []);
    groups.get(chrom)!.push(row);
  }

  const merged: GenomicRow[] = [];
  let idx = 0;

  const sortedChroms = [...groups.keys()].sort((a, b) => {
    const numA = parseInt(a.replace(/^chr/i, ""), 10);
    const numB = parseInt(b.replace(/^chr/i, ""), 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    if (!isNaN(numA)) return -1;
    if (!isNaN(numB)) return 1;
    return a.localeCompare(b);
  });

  for (const chrom of sortedChroms) {
    const group = groups.get(chrom)!;
    group.sort((a, b) => Number(a.chromStart) - Number(b.chromStart));

    let currentStart = Number(group[0]!.chromStart);
    let currentEnd = Number(group[0]!.chromEnd);

    for (let i = 1; i < group.length; i++) {
      const rowStart = Number(group[i]!.chromStart);
      const rowEnd = Number(group[i]!.chromEnd);

      if (rowStart <= currentEnd) {
        currentEnd = Math.max(currentEnd, rowEnd);
      } else {
        merged.push({
          _index: idx,
          _rowId: `${chrom}:${currentStart}-${currentEnd}:${idx}`,
          chrom,
          chromStart: currentStart,
          chromEnd: currentEnd,
        });
        idx++;
        currentStart = rowStart;
        currentEnd = rowEnd;
      }
    }

    merged.push({
      _index: idx,
      _rowId: `${chrom}:${currentStart}-${currentEnd}:${idx}`,
      chrom,
      chromStart: currentStart,
      chromEnd: currentEnd,
    });
    idx++;
  }

  return merged;
}
