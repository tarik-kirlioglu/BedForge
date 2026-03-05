import { toast } from "sonner";

import { useFileStore } from "../stores/useFileStore";
import { isBedFamily } from "../utils/format-helpers";
import type { FileFormat, GenomicRow } from "../types/genomic";

/**
 * Extend/Slop BED regions by N bases upstream and downstream.
 * Similar to `bedtools slop`. Ensures start doesn't go below 0.
 */
export function runExtendRegions(
  targetRows: GenomicRow[],
  upstream: number,
  downstream: number,
  format: FileFormat,
): void {
  if (targetRows.length === 0) return;
  if (upstream === 0 && downstream === 0) return;

  const store = useFileStore.getState();

  if (isBedFamily(format)) {
    const updates = targetRows.map((row) => {
      const start = Number(row.chromStart ?? 0);
      const end = Number(row.chromEnd ?? 0);
      const strand = String(row.strand ?? ".");

      let newStart: number;
      let newEnd: number;

      if (strand === "-") {
        // On minus strand: upstream = towards higher coords, downstream = towards lower
        newStart = Math.max(0, start - downstream);
        newEnd = end + upstream;
      } else {
        // Plus strand or unstranded
        newStart = Math.max(0, start - upstream);
        newEnd = end + downstream;
      }

      return {
        index: row._index,
        row: {
          chromStart: newStart,
          chromEnd: newEnd,
        } as Partial<GenomicRow>,
      };
    });

    store.updateRows(updates);
  } else {
    // VCF: adjust POS only (upstream shifts POS left)
    const updates = targetRows.map((row) => {
      const pos = Number(row.POS ?? 0);
      const newPos = Math.max(1, pos - upstream);
      return {
        index: row._index,
        row: { POS: newPos } as Partial<GenomicRow>,
      };
    });

    store.updateRows(updates);
  }

  const label =
    upstream === downstream
      ? `±${upstream}bp`
      : `↑${upstream}bp / ↓${downstream}bp`;

  toast.success("Regions extended", {
    description: `${targetRows.length} region${targetRows.length !== 1 ? "s" : ""} extended ${label}`,
  });
}
