import { toast } from "sonner";

import { useFileStore } from "../stores/useFileStore";
import { useOperationStore } from "../stores/useOperationStore";
import { runBatchOperation } from "./operation-runner";
import { ensemblFetch } from "../api/ensembl-client";
import { toEnsemblChrom } from "../utils/chromosome";
import { getChromColumn, getStartColumn, getEndColumn, toEnsemblStart, toEnsemblEnd } from "../utils/format-helpers";
import type { Assembly, FileFormat, GenomicRow } from "../types/genomic";

interface GeneFeature {
  external_name: string;
  biotype: string;
  gene_id: string;
}

/**
 * Annotate BED regions with gene names from Ensembl.
 * Writes gene names into the "name" column (BED4+).
 * If multiple genes overlap, joins them with comma.
 * Upgrades BED3 → BED4 if needed.
 */
export async function runAnnotateGenes(
  targetRows: GenomicRow[],
  _assembly: Assembly,
  format: FileFormat,
): Promise<void> {
  if (targetRows.length === 0) return;

  const opStore = useOperationStore.getState();
  opStore.startOperation("Annotate Genes", targetRows.length);

  const toastId = toast.loading("Fetching gene names...", {
    description: `0 / ${targetRows.length} regions`,
  });

  const unsubscribe = useOperationStore.subscribe((state) => {
    toast.loading("Fetching gene names...", {
      id: toastId,
      description: `${state.progress.completed} / ${state.progress.total} regions`,
    });
  });

  try {
    const chromCol = getChromColumn(format);
    const startCol = getStartColumn(format);
    const endCol = getEndColumn(format);

    const results = await runBatchOperation(targetRows, async (row) => {
      const chrom = String(row[chromCol] ?? "");
      const start = Number(row[startCol]) || 0;
      const end = startCol === endCol
        ? start + String(row.REF ?? "").length - 1
        : Number(row[endCol] ?? 0);

      const ensemblChrom = toEnsemblChrom(chrom);
      const ensemblStart = toEnsemblStart(start, format);
      const ensemblEnd = toEnsemblEnd(end, format);

      const path = `/overlap/region/human/${ensemblChrom}:${ensemblStart}-${ensemblEnd}?feature=gene;content-type=application/json`;

      const genes = await ensemblFetch<GeneFeature[]>(path);

      // Prefer protein_coding genes, then take all
      const proteinCoding = genes.filter((g) => g.biotype === "protein_coding");
      const relevant = proteinCoding.length > 0 ? proteinCoding : genes;

      // Deduplicate gene names
      const names = [...new Set(
        relevant
          .map((g) => g.external_name)
          .filter((n): n is string => !!n && n.length > 0),
      )];

      return names.length > 0 ? names.join(",") : ".";
    });

    // Apply gene names
    const store = useFileStore.getState();
    const columns = store.columns;
    const hasNameColumn = columns.includes("name");

    if (hasNameColumn) {
      // Update existing name column
      const updates = [...results.entries()].map(([index, geneName]) => ({
        index,
        row: { name: geneName } as Partial<GenomicRow>,
      }));
      store.updateRows(updates);
    } else {
      // Add name column (upgrade BED3 → BED4)
      const values = new Map<number, string>();
      for (const [index, geneName] of results) {
        values.set(index, geneName);
      }
      store.addColumn("name", values);

      // Update format if it was BED3
      if (store.fileFormat === "bed3") {
        useFileStore.setState({ fileFormat: "bed4" });
      }
    }

    const annotated = [...results.values()].filter((v) => v !== ".").length;
    const unannotated = results.size - annotated;

    toast.success("Gene annotation complete", {
      id: toastId,
      description: `${annotated} annotated, ${unannotated} intergenic`,
    });
  } catch (error) {
    toast.error("Gene annotation failed", {
      id: toastId,
      description: error instanceof Error ? error.message : "Unknown error",
    });
    opStore.failOperation(String(error));
  } finally {
    unsubscribe();
    opStore.completeOperation();
  }
}
