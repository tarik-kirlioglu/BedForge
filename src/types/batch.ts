import type { FileFormat, GenomicRow } from "./genomic";
import type { VcfMetaLine } from "./vcf";
import type { Gff3Directive } from "./gff3";

/** Status of an individual file in the batch queue */
export type BatchFileStatus = "pending" | "processing" | "done" | "error" | "skipped";

/** A file entry in the batch queue */
export interface BatchFileEntry {
  id: string;
  file: File;
  fileName: string;
  status: BatchFileStatus;
  error?: string;
  rowCount?: number;
  resultRowCount?: number;
}

/** Identifiers for batch-compatible operations */
export type BatchOperationId =
  // Client-side — no params
  | "sort"
  | "dedup"
  | "merge"
  | "validate"
  // Client-side — with params
  | "extend"
  | "filter-chrom"
  | "filter-qual"
  | "filter-filter"
  | "filter-variant-type"
  | "filter-genotype"
  | "filter-type"
  | "parse-info"
  | "parse-attributes"
  | "intersect"
  | "complement"
  | "find-replace"
  // API-based
  | "annotate"
  | "gc-content"
  | "liftover"
  | "clean-intergenic";

/** Configuration for a batch operation including its parameters */
export interface BatchOperationConfig {
  operationId: BatchOperationId;
  params: Record<string, unknown>;
}

/** A single step in the batch pipeline */
export interface BatchPipelineStep {
  id: string;
  operationId: BatchOperationId;
  params: Record<string, unknown>;
}

/** Two-level progress for batch queue */
export interface BatchProgress {
  currentFileIndex: number;
  totalFiles: number;
  currentFileName: string;
  /** Per-file progress for API operations (row-level) */
  fileProgress: { completed: number; total: number };
  /** Current pipeline step index (0-based) */
  currentStepIndex: number;
  /** Total pipeline steps */
  totalSteps: number;
  /** Human-readable name of the current step */
  currentStepName: string;
}

/** Result of parsing a file from disk */
export interface ParsedFile {
  fileName: string;
  fileFormat: FileFormat;
  rows: GenomicRow[];
  columns: string[];
  vcfMeta: VcfMetaLine[];
  vcfSampleNames: string[];
  gff3Directives: Gff3Directive[];
  useChrPrefix: boolean;
}
