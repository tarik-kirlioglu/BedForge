import { toast } from "sonner";

import { useFileStore } from "../stores/useFileStore";
import { useOperationStore } from "../stores/useOperationStore";
import { runBatchOperation } from "./operation-runner";
import { getGeneOverlaps } from "../api/overlap";
import type { Assembly, GenomicRow } from "../types/genomic";

/**
 * Remove intergenic regions — rows that don't overlap any gene.
 */
export async function runCleanIntergenic(
  targetRows: GenomicRow[],
  assembly: Assembly,
  _useChrPrefix: boolean,
  isBed: boolean,
): Promise<void> {
  if (targetRows.length === 0) return;

  const opStore = useOperationStore.getState();
  opStore.startOperation("Clean Intergenic", targetRows.length);

  const toastId = toast.loading("Checking gene overlaps...", {
    description: `0 / ${targetRows.length} regions`,
  });

  const unsubscribe = useOperationStore.subscribe((state) => {
    toast.loading("Checking gene overlaps...", {
      id: toastId,
      description: `${state.progress.completed} / ${state.progress.total} regions`,
    });
  });

  try {
    const results = await runBatchOperation(targetRows, async (row) => {
      const chrom = String(row.chrom ?? row.CHROM ?? "");
      const start = Number(row.chromStart ?? row.POS ?? 0);
      const end = isBed
        ? Number(row.chromEnd ?? 0)
        : start + String(row.REF ?? "").length - 1;

      const genes = await getGeneOverlaps(chrom, start, end, assembly, isBed);
      return genes.length > 0; // true = genic, false = intergenic
    });

    // Collect intergenic row indices for deletion
    const intergenicIndices = new Set<number>();
    for (const [index, isGenic] of results) {
      if (!isGenic) {
        intergenicIndices.add(index);
      }
    }

    if (intergenicIndices.size > 0) {
      useFileStore.getState().deleteRows(intergenicIndices);
    }

    const genicCount = targetRows.length - intergenicIndices.size;
    toast.success("Intergenic cleanup complete", {
      id: toastId,
      description: `Kept ${genicCount} genic regions, removed ${intergenicIndices.size} intergenic`,
    });
  } catch (error) {
    toast.error("Intergenic cleanup failed", {
      id: toastId,
      description: error instanceof Error ? error.message : "Unknown error",
    });
    opStore.failOperation(String(error));
  } finally {
    unsubscribe();
    opStore.completeOperation();
  }
}
