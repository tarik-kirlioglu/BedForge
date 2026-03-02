import { toast } from "sonner";

import { useFileStore } from "../stores/useFileStore";
import { useOperationStore } from "../stores/useOperationStore";
import { runBatchOperation } from "./operation-runner";
import { liftOverRegion } from "../api/liftover";
import { fromEnsemblChrom } from "../utils/chromosome";
import type { Assembly, GenomicRow } from "../types/genomic";

/**
 * Run LiftOver on selected rows.
 * Converts coordinates from source to target assembly.
 */
export async function runLiftOver(
  selectedRows: GenomicRow[],
  sourceAssembly: Assembly,
  targetAssembly: Assembly,
  useChrPrefix: boolean,
  isBed: boolean,
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
    const results = await runBatchOperation(selectedRows, async (row) => {
      const chrom = String(row.chrom ?? row.CHROM ?? "");
      const start = Number(row.chromStart ?? row.POS ?? 0);
      const end = isBed
        ? Number(row.chromEnd ?? 0)
        : start + String(row.REF ?? "").length - 1;

      const mapped = await liftOverRegion(
        chrom,
        start,
        end,
        sourceAssembly,
        targetAssembly,
        isBed,
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

      if (isBed) {
        updates.push({
          index,
          row: {
            chrom: mappedChrom,
            chromStart: result.start - 1, // Ensembl 1-based → BED 0-based
            chromEnd: result.end,
          },
        });
      } else {
        updates.push({
          index,
          row: {
            CHROM: mappedChrom,
            POS: result.start,
          },
        });
      }
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
