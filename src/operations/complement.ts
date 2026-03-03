import { toast } from "sonner";

import { useFileStore } from "../stores/useFileStore";
import type { GenomicRow } from "../types/genomic";

/**
 * Compute complement (gap) regions for the current BED data.
 * Returns new rows representing gaps between existing intervals.
 */
export function runComplement(chromSizes: Map<string, number>): void {
  const store = useFileStore.getState();
  const rows = store.rows;

  // Group intervals by chromosome
  const chromIntervals = new Map<string, Array<{ start: number; end: number }>>();
  for (const row of rows) {
    const chrom = String(row.chrom ?? "");
    const start = Number(row.chromStart);
    const end = Number(row.chromEnd);
    if (!chrom || chrom === "." || isNaN(start) || isNaN(end)) continue;

    if (!chromIntervals.has(chrom)) {
      chromIntervals.set(chrom, []);
    }
    chromIntervals.get(chrom)!.push({ start, end });
  }

  // Sort intervals within each chromosome
  for (const intervals of chromIntervals.values()) {
    intervals.sort((a, b) => a.start - b.start);
  }

  // Compute complement for each chromosome
  const complementRows: GenomicRow[] = [];
  let idx = 0;

  for (const [chrom, size] of chromSizes.entries()) {
    const intervals = chromIntervals.get(chrom) ?? [];

    let pos = 0;
    for (const iv of intervals) {
      // Merge overlapping intervals on the fly
      if (iv.start > pos) {
        complementRows.push({
          _index: idx,
          _rowId: `complement-${idx}`,
          chrom,
          chromStart: pos,
          chromEnd: Math.min(iv.start, size),
        });
        idx++;
      }
      pos = Math.max(pos, iv.end);
    }

    // Gap after last interval to end of chromosome
    if (pos < size) {
      complementRows.push({
        _index: idx,
        _rowId: `complement-${idx}`,
        chrom,
        chromStart: pos,
        chromEnd: size,
      });
      idx++;
    }
  }

  if (complementRows.length === 0) {
    toast.info("No complement regions found", {
      description: "The intervals cover the entire genome",
    });
    return;
  }

  // Replace all rows with complement — push history first
  useFileStore.setState((state) => {
    const snapshot = state.rows.map((r) => ({ ...r }));
    const history = [...state.history.slice(0, state.historyIndex + 1)];
    history.push(snapshot);
    if (history.length > 20) history.shift();

    return {
      rows: complementRows,
      columns: ["chrom", "chromStart", "chromEnd"],
      fileFormat: "bed3",
      history,
      historyIndex: history.length - 1,
    };
  });

  toast.success(`Generated ${complementRows.length} complement regions`, {
    description: "All existing rows replaced with gap regions (BED3)",
  });
}
