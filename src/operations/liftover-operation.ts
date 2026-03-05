import { toast } from "sonner";

import { useFileStore } from "../stores/useFileStore";
import { useOperationStore } from "../stores/useOperationStore";
import { runBatchOperation } from "./operation-runner";
import { liftOverRegion } from "../api/liftover";
import { fromEnsemblChrom } from "../utils/chromosome";
import { getChromColumn, getStartColumn, getEndColumn, isZeroBased } from "../utils/format-helpers";
import type { Assembly, FileFormat, GenomicRow } from "../types/genomic";

/**
 * Run LiftOver on selected rows.
 * Converts coordinates from source to target assembly.
 */
export async function runLiftOver(
  selectedRows: GenomicRow[],
  sourceAssembly: Assembly,
  targetAssembly: Assembly,
  useChrPrefix: boolean,
  format: FileFormat,
): Promise<void> {
  if (selectedRows.length === 0) return;

  const opStore = useOperationStore.getState();
  opStore.startOperation(`LiftOver to ${targetAssembly}`, selectedRows.length);

  const toastId = toast.loading(`LiftOver to ${targetAssembly}`, {
    description: `0 / ${selectedRows.length} regions`,
  });

  // Watch progress
  const unsubscribe = useOperationStore.subscribe((state) => {
    toast.loading(`LiftOver to ${targetAssembly}`, {
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

      const mapped = await liftOverRegion(
        chrom,
        start,
        end,
        sourceAssembly,
        targetAssembly,
        format,
      );
      return mapped;
    });

    // Apply results to store
    const updates: Array<{ index: number; row: Partial<GenomicRow> }> = [];
    let mappedCount = 0;

    for (const [index, result] of results) {
      if (!result) continue;
      mappedCount++;

      const mappedChrom = fromEnsemblChrom(result.chrom, useChrPrefix);

      const rowUpdate: Partial<GenomicRow> = {
        [chromCol]: mappedChrom,
      };
      if (isZeroBased(format)) {
        rowUpdate[startCol] = result.start - 1; // Ensembl 1-based → BED 0-based
        rowUpdate[endCol] = result.end;
      } else if (startCol === endCol) {
        // VCF: only POS
        rowUpdate[startCol] = result.start;
      } else {
        // GFF3: both start and end, 1-based
        rowUpdate[startCol] = result.start;
        rowUpdate[endCol] = result.end;
      }
      updates.push({ index, row: rowUpdate });
    }

    if (updates.length > 0) {
      useFileStore.getState().updateRows(updates);
      useFileStore.getState().setAssembly(targetAssembly);
    }

    const failCount = selectedRows.length - mappedCount;
    toast.success("LiftOver complete", {
      id: toastId,
      description: `${mappedCount} mapped${failCount > 0 ? `, ${failCount} failed` : ""}`,
    });
  } catch (error) {
    toast.error("LiftOver failed", {
      id: toastId,
      description: error instanceof Error ? error.message : "Unknown error",
    });
    opStore.failOperation(String(error));
  } finally {
    unsubscribe();
    opStore.completeOperation();
  }
}
