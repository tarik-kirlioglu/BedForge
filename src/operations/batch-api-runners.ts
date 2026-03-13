import { ensemblFetch } from "../api/ensembl-client";
import { liftOverRegion } from "../api/liftover";
import { getSequence } from "../api/sequence";
import { getGeneOverlaps } from "../api/overlap";

import { calculateGCContent } from "../utils/gc-calculator";
import { fromEnsemblChrom, toEnsemblChrom } from "../utils/chromosome";
import {
  getChromColumn,
  getStartColumn,
  getEndColumn,
  isZeroBased,
  toEnsemblStart,
  toEnsemblEnd,
} from "../utils/format-helpers";

import type { Assembly, FileFormat, GenomicRow } from "../types/genomic";

// ---------------------------------------------------------------------------
// Internal: store-free batch runner
// ---------------------------------------------------------------------------

interface IndexedItem {
  _index: number;
}

/**
 * Process items in concurrent chunks without any store dependency.
 * Progress and cancellation are driven by caller-provided callbacks.
 */
async function runPureBatch<I extends IndexedItem, T>(
  items: readonly I[],
  processor: (item: I) => Promise<T>,
  onProgress: (completed: number, total: number) => void,
  isCancelled: () => boolean,
  concurrency = 5,
): Promise<Map<number, T>> {
  const results = new Map<number, T>();

  for (let i = 0; i < items.length; i += concurrency) {
    if (isCancelled()) break;

    const chunk = items.slice(i, i + concurrency);
    const chunkResults = await Promise.allSettled(
      chunk.map((item) => processor(item)),
    );

    chunkResults.forEach((result, j) => {
      const item = chunk[j];
      if (!item) return;
      if (result.status === "fulfilled") {
        results.set(item._index, result.value);
      }
    });

    onProgress(Math.min(i + concurrency, items.length), items.length);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute the effective end coordinate for a row, handling VCF single-position. */
function effectiveEnd(
  row: GenomicRow,
  startCol: string,
  endCol: string,
): number {
  if (startCol === endCol) {
    // VCF: POS only — region spans REF length
    const start = Number(row[startCol] ?? 0);
    return start + String(row["REF"] ?? "").length - 1;
  }
  return Number(row[endCol] ?? 0);
}

// ---------------------------------------------------------------------------
// 1. Annotate Genes
// ---------------------------------------------------------------------------

interface GeneFeature {
  external_name: string;
  biotype: string;
  gene_id: string;
}

/**
 * Annotate rows with gene names from Ensembl overlap API.
 * Returns new rows array, updated columns, and potentially upgraded format.
 * Pure function — no store or toast interaction.
 */
export async function batchAnnotateGenes(
  rows: GenomicRow[],
  columns: string[],
  format: FileFormat,
  speciesName: string,
  onProgress: (completed: number, total: number) => void,
  isCancelled: () => boolean,
): Promise<{ rows: GenomicRow[]; columns: string[]; format: FileFormat }> {
  const chromCol = getChromColumn(format);
  const startCol = getStartColumn(format);
  const endCol = getEndColumn(format);

  const results = await runPureBatch(
    rows,
    async (row) => {
      const chrom = String(row[chromCol] ?? "");
      const start = Number(row[startCol] ?? 0);
      const end = effectiveEnd(row, startCol, endCol);

      const ensemblChrom = toEnsemblChrom(chrom);
      const ensemblStart = toEnsemblStart(start, format);
      const ensemblEnd = toEnsemblEnd(end, format);

      const path = `/overlap/region/${speciesName}/${ensemblChrom}:${ensemblStart}-${ensemblEnd}?feature=gene;content-type=application/json`;
      const genes = await ensemblFetch<GeneFeature[]>(path);

      // Prefer protein_coding genes, then take all
      const proteinCoding = genes.filter((g) => g.biotype === "protein_coding");
      const relevant = proteinCoding.length > 0 ? proteinCoding : genes;

      // Deduplicate gene names
      const names = [
        ...new Set(
          relevant
            .map((g) => g.external_name)
            .filter((n): n is string => !!n && n.length > 0),
        ),
      ];

      return names.length > 0 ? names.join(",") : ".";
    },
    onProgress,
    isCancelled,
  );

  // Build new rows with gene names applied
  const hasNameColumn = columns.includes("name");
  const newColumns = hasNameColumn ? [...columns] : [...columns, "name"];

  let newFormat = format;
  if (!hasNameColumn && format === "bed3") {
    newFormat = "bed4";
  }

  const newRows = rows.map((row) => {
    const geneName = results.get(row._index);
    if (geneName === undefined) return row;
    return { ...row, name: geneName };
  });

  return { rows: newRows, columns: newColumns, format: newFormat };
}

// ---------------------------------------------------------------------------
// 2. GC Content
// ---------------------------------------------------------------------------

/**
 * Calculate GC content for rows via Ensembl sequence API.
 * Returns new rows with "gc_content" column and updated column list.
 * Pure function — no store or toast interaction.
 */
export async function batchGCContent(
  rows: GenomicRow[],
  columns: string[],
  assembly: Assembly,
  format: FileFormat,
  speciesName: string,
  onProgress: (completed: number, total: number) => void,
  isCancelled: () => boolean,
): Promise<{ rows: GenomicRow[]; columns: string[] }> {
  const chromCol = getChromColumn(format);
  const startCol = getStartColumn(format);
  const endCol = getEndColumn(format);

  const results = await runPureBatch(
    rows,
    async (row) => {
      const chrom = String(row[chromCol] ?? "");
      const start = Number(row[startCol] ?? 0);
      const end = effectiveEnd(row, startCol, endCol);

      const sequence = await getSequence(
        chrom,
        start,
        end,
        assembly,
        format,
        speciesName,
      );
      return calculateGCContent(sequence);
    },
    onProgress,
    isCancelled,
  );

  // Build new rows with gc_content column
  const newColumns = columns.includes("gc_content")
    ? [...columns]
    : [...columns, "gc_content"];

  const newRows = rows.map((row) => {
    const gcValue = results.get(row._index);
    if (gcValue === undefined) return row;
    return { ...row, gc_content: `${(gcValue * 100).toFixed(1)}%` };
  });

  return { rows: newRows, columns: newColumns };
}

// ---------------------------------------------------------------------------
// 3. LiftOver
// ---------------------------------------------------------------------------

/**
 * LiftOver rows from one assembly to another via Ensembl mapping API.
 * Returns new rows with updated coordinates.
 * Rows that fail mapping are kept unchanged (unlike interactive mode which skips).
 * Pure function — no store or toast interaction.
 */
export async function batchLiftOver(
  rows: GenomicRow[],
  format: FileFormat,
  sourceAssembly: Assembly,
  targetAssembly: Assembly,
  useChrPrefix: boolean,
  speciesName: string,
  onProgress: (completed: number, total: number) => void,
  isCancelled: () => boolean,
): Promise<GenomicRow[]> {
  const chromCol = getChromColumn(format);
  const startCol = getStartColumn(format);
  const endCol = getEndColumn(format);

  const results = await runPureBatch(
    rows,
    async (row) => {
      const chrom = String(row[chromCol] ?? "");
      const start = Number(row[startCol] ?? 0);
      const end = effectiveEnd(row, startCol, endCol);

      return liftOverRegion(
        chrom,
        start,
        end,
        sourceAssembly,
        targetAssembly,
        format,
        speciesName,
      );
    },
    onProgress,
    isCancelled,
  );

  return rows.map((row) => {
    const result = results.get(row._index);
    if (!result) return row; // mapping failed or missing — keep unchanged

    const mappedChrom = fromEnsemblChrom(result.chrom, useChrPrefix);
    const updated: GenomicRow = { ...row, [chromCol]: mappedChrom };

    if (isZeroBased(format)) {
      // BED: Ensembl 1-based → BED 0-based
      updated[startCol] = result.start - 1;
      updated[endCol] = result.end;
    } else if (startCol === endCol) {
      // VCF: only POS
      updated[startCol] = result.start;
    } else {
      // GFF3: both start and end, 1-based
      updated[startCol] = result.start;
      updated[endCol] = result.end;
    }

    return updated;
  });
}

// ---------------------------------------------------------------------------
// 4. Clean Intergenic
// ---------------------------------------------------------------------------

/**
 * Remove intergenic rows — keep only rows that overlap at least one gene.
 * Returns filtered rows array (intergenic rows removed).
 * Pure function — no store or toast interaction.
 */
export async function batchCleanIntergenic(
  rows: GenomicRow[],
  assembly: Assembly,
  format: FileFormat,
  speciesName: string,
  onProgress: (completed: number, total: number) => void,
  isCancelled: () => boolean,
): Promise<GenomicRow[]> {
  const chromCol = getChromColumn(format);
  const startCol = getStartColumn(format);
  const endCol = getEndColumn(format);

  const results = await runPureBatch(
    rows,
    async (row) => {
      const chrom = String(row[chromCol] ?? "");
      const start = Number(row[startCol] ?? 0);
      const end = effectiveEnd(row, startCol, endCol);

      const genes = await getGeneOverlaps(
        chrom,
        start,
        end,
        assembly,
        format,
        speciesName,
      );
      return genes.length > 0; // true = genic, false = intergenic
    },
    onProgress,
    isCancelled,
  );

  return rows.filter((row) => {
    const isGenic = results.get(row._index);
    // Keep rows that are genic or that weren't processed (e.g. cancelled)
    return isGenic !== false;
  });
}
