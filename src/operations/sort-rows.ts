import { toast } from "sonner";

import { useFileStore } from "../stores/useFileStore";
import { chromRank } from "../utils/chromosome";
import type { GenomicRow } from "../types/genomic";

function compareRows(a: GenomicRow, b: GenomicRow, isBed: boolean): number {
  const chromA = String(a.chrom ?? a.CHROM ?? "");
  const chromB = String(b.chrom ?? b.CHROM ?? "");

  const rankDiff = chromRank(chromA) - chromRank(chromB);
  if (rankDiff !== 0) return rankDiff;

  // Same chromosome rank — fallback to lexicographic for unknown chroms
  if (rankDiff === 0 && chromA !== chromB) {
    return chromA.localeCompare(chromB);
  }

  const startA = Number(isBed ? a.chromStart : a.POS) || 0;
  const startB = Number(isBed ? b.chromStart : b.POS) || 0;
  if (startA !== startB) return startA - startB;

  if (isBed) {
    const endA = Number(a.chromEnd) || 0;
    const endB = Number(b.chromEnd) || 0;
    return endA - endB;
  }

  return 0;
}

/** Sort rows by natural chromosome order, then by start, then by end */
export function runSort(isBed: boolean): void {
  const store = useFileStore.getState();
  const sorted = [...store.rows].sort((a, b) => compareRows(a, b, isBed));

  // Re-index after sort
  const reindexed = sorted.map((row, i) => ({
    ...row,
    _index: i,
  }));

  // Push current state to history, then replace rows
  store.updateRows(
    reindexed.map((row, i) => ({ index: store.rows[i]!._index, row })),
  );

  // Direct replacement is cleaner for sort — use the store internals
  useFileStore.setState((state) => {
    const history = [...state.history.slice(0, state.historyIndex + 1)];
    history.push(state.rows.map((r) => ({ ...r })));
    if (history.length > 20) history.shift();
    return {
      rows: reindexed,
      history,
      historyIndex: history.length - 1,
    };
  });

  toast.success("Rows sorted", {
    description: "Natural chromosome order (chr1...chr22, X, Y, M)",
  });
}
