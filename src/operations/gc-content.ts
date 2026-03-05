import { toast } from "sonner";

import { useFileStore } from "../stores/useFileStore";
import { useOperationStore } from "../stores/useOperationStore";
import { runBatchOperation } from "./operation-runner";
import { getSequence } from "../api/sequence";
import { calculateGCContent } from "../utils/gc-calculator";
import { getChromColumn, getStartColumn, getEndColumn } from "../utils/format-helpers";
import type { Assembly, FileFormat, GenomicRow } from "../types/genomic";

/**
 * Calculate GC content for selected rows.
 * Adds a new "gc_content" column with percentage values.
 */
export async function runGCContent(
  selectedRows: GenomicRow[],
  assembly: Assembly,
  _useChrPrefix: boolean,
  format: FileFormat,
): Promise<void> {
  if (selectedRows.length === 0) return;

  const opStore = useOperationStore.getState();
  opStore.startOperation("Calculate GC Content", selectedRows.length);

  const toastId = toast.loading("Calculating GC content...", {
    description: `0 / ${selectedRows.length} regions`,
  });

  const unsubscribe = useOperationStore.subscribe((state) => {
    toast.loading("Calculating GC content...", {
      id: toastId,
      description: `${state.progress.completed} / ${state.progress.total} regions`,
    });
  });

  try {
    const chromCol = getChromColumn(format);
    const startCol = getStartColumn(format);
    const endCol = getEndColumn(format);

    const results = await runBatchOperation(selectedRows, async (row) => {
      const chrom = String(row[chromCol] ?? "");
      const start = Number(row[startCol] ?? 0);
      const end = startCol === endCol
        ? start + String(row.REF ?? "").length - 1
        : Number(row[endCol] ?? 0);

      const sequence = await getSequence(chrom, start, end, assembly, format);
      return calculateGCContent(sequence);
    });

    // Build values map for the new column
    const values = new Map<number, string>();
    for (const [index, gcContent] of results) {
      values.set(index, `${(gcContent * 100).toFixed(1)}%`);
    }

    if (values.size > 0) {
      useFileStore.getState().addColumn("gc_content", values);
    }

    toast.success("GC content calculated", {
      id: toastId,
      description: `${values.size} regions processed`,
    });
  } catch (error) {
    toast.error("GC content calculation failed", {
      id: toastId,
      description: error instanceof Error ? error.message : "Unknown error",
    });
    opStore.failOperation(String(error));
  } finally {
    unsubscribe();
    opStore.completeOperation();
  }
}
