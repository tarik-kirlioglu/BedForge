import { toast } from "sonner";

import { useFileStore } from "../stores/useFileStore";
import { chromRank } from "../utils/chromosome";
import { getChromColumn, getStartColumn, getEndColumn } from "../utils/format-helpers";
import type { FileFormat, GenomicRow } from "../types/genomic";

function compareRows(a: GenomicRow, b: GenomicRow, format: FileFormat, useRomanOrder?: boolean): number {
  const chromCol = getChromColumn(format);
  const startCol = getStartColumn(format);
  const endCol = getEndColumn(format);

  const chromA = String(a[chromCol] ?? "");
  const chromB = String(b[chromCol] ?? "");

  const rankDiff = chromRank(chromA, useRomanOrder) - chromRank(chromB, useRomanOrder);
  if (rankDiff !== 0) return rankDiff;

  // Same chromosome rank — fallback to lexicographic for unknown chroms
  if (rankDiff === 0 && chromA !== chromB) {
    return chromA.localeCompare(chromB);
  }

  const startA = Number(a[startCol]) || 0;
  const startB = Number(b[startCol]) || 0;
  if (startA !== startB) return startA - startB;

  if (startCol !== endCol) {
    const endA = Number(a[endCol]) || 0;
    const endB = Number(b[endCol]) || 0;
    return endA - endB;
  }

  return 0;
}

/** Sort rows by natural chromosome order, then by start, then by end */
export function runSort(format: FileFormat, speciesId?: string): void {
  const store = useFileStore.getState();
  const useRoman = speciesId === "s_cerevisiae";
  const sorted = [...store.rows].sort((a, b) => compareRows(a, b, format, useRoman));

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

/** Pure variant: sort rows without touching the store */
export function sortRows(rows: GenomicRow[], format: FileFormat, speciesId?: string): GenomicRow[] {
  const useRoman = speciesId === "s_cerevisiae";
  const sorted = [...rows].sort((a, b) => compareRows(a, b, format, useRoman));
  return sorted.map((row, i) => ({ ...row, _index: i }));
}
