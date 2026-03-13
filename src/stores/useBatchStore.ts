import { create } from "zustand";

import { parseFileFromDisk } from "../parsers/parse-file";
import { exportFileContent, getBatchExportFileName, downloadBatchZip } from "../exporters/batch-export";
import { isBedFamily } from "../utils/format-helpers";

// Pure operation imports — client-side
import { sortRows } from "../operations/sort-rows";
import { removeDuplicateRows } from "../operations/remove-duplicates";
import { mergeRegionRows } from "../operations/merge-regions";
import { extendRegionRows } from "../operations/extend-regions";
import { validateAndFixRows } from "../operations/validate-coordinates";
import { computeComplement } from "../operations/complement";
import { filterByChromValues } from "../operations/chrom-filter";
import { filterByFilterValues, filterByQual } from "../operations/filter-vcf";
import { filterByVariantTypes } from "../operations/variant-type-filter";
import { filterByGenotypes } from "../operations/genotype-filter";
import { filterByTypeValues } from "../operations/type-filter";
import { parseInfoFields } from "../operations/info-parser";
import { parseAttributeFields } from "../operations/gff3-attribute-parser";
import { intersectRows } from "../operations/intersect";
import { findAndReplace } from "../operations/find-replace";

// Pure operation imports — API-based
import { batchAnnotateGenes, batchGCContent, batchLiftOver, batchCleanIntergenic } from "../operations/batch-api-runners";

import type { Assembly, FileFormat, GenomicRow, SpeciesConfig } from "../types/genomic";
import type {
  BatchFileEntry,
  BatchFileStatus,
  BatchOperationId,
  BatchPipelineStep,
  BatchProgress,
  ParsedFile,
} from "../types/batch";

/** Map from operation ID to a human-readable suffix for export filenames */
const OPERATION_SUFFIXES: Record<BatchOperationId, string> = {
  sort: "_sorted",
  dedup: "_dedup",
  merge: "_merged",
  validate: "_validated",
  extend: "_extended",
  "filter-chrom": "_chromFiltered",
  "filter-qual": "_qualFiltered",
  "filter-filter": "_filtered",
  "filter-variant-type": "_variantFiltered",
  "filter-genotype": "_genotypeFiltered",
  "filter-type": "_typeFiltered",
  "parse-info": "_infoParsed",
  "parse-attributes": "_attrParsed",
  intersect: "_intersected",
  complement: "_complement",
  "find-replace": "_replaced",
  annotate: "_annotated",
  "gc-content": "_gc",
  liftover: "_liftover",
  "clean-intergenic": "_genic",
};

/** Map from operation ID to a human-readable label */
const OPERATION_LABELS: Record<BatchOperationId, string> = {
  sort: "Sort",
  dedup: "Remove Duplicates",
  merge: "Merge Regions",
  validate: "Validate & Fix",
  extend: "Extend/Slop",
  "filter-chrom": "Filter Chromosomes",
  "filter-qual": "Filter by QUAL",
  "filter-filter": "Filter by FILTER",
  "filter-variant-type": "Filter Variant Type",
  "filter-genotype": "Filter Genotype",
  "filter-type": "Filter by Type",
  "parse-info": "Parse INFO",
  "parse-attributes": "Parse Attributes",
  intersect: "Intersect/Subtract",
  complement: "Complement",
  "find-replace": "Find & Replace",
  annotate: "Annotate Genes",
  "gc-content": "GC Content",
  liftover: "LiftOver",
  "clean-intergenic": "Clean Intergenic",
};

interface BatchResult {
  content: string;
  fileName: string;
}

interface BatchState {
  /** Whether batch mode is active */
  isActive: boolean;

  /** Step in the wizard flow */
  step: "files" | "operation" | "processing" | "done";

  /** Loaded file entries */
  files: BatchFileEntry[];

  /** Enforced format (detected from first file) */
  fileFormat: FileFormat | null;

  /** Species and assembly (shared for all files) */
  species: SpeciesConfig | null;
  assembly: Assembly | null;
  useChrPrefix: boolean;

  /** Pipeline: ordered list of operations to apply sequentially */
  pipeline: BatchPipelineStep[];

  /** Processing state */
  isRunning: boolean;
  progress: BatchProgress | null;
  cancelRequested: boolean;

  /** Results ready for ZIP export */
  results: BatchResult[];

  // ── Actions ──
  enterBatchMode: () => void;
  exitBatchMode: () => void;
  addFiles: (files: File[]) => Promise<void>;
  removeFile: (id: string) => void;
  setSpeciesAndAssembly: (species: SpeciesConfig, assembly: Assembly) => void;
  addPipelineStep: (operationId: BatchOperationId, params: Record<string, unknown>) => void;
  removePipelineStep: (stepId: string) => void;
  reorderPipeline: (fromIdx: number, toIdx: number) => void;
  setStep: (step: "files" | "operation" | "processing" | "done") => void;
  startProcessing: () => Promise<void>;
  cancelProcessing: () => void;
  exportZip: () => Promise<void>;
  reset: () => void;
}

const INITIAL_STATE = {
  isActive: false,
  step: "files" as const,
  files: [],
  fileFormat: null,
  species: null,
  assembly: null,
  useChrPrefix: true,
  pipeline: [],
  isRunning: false,
  progress: null,
  cancelRequested: false,
  results: [],
};

export const useBatchStore = create<BatchState>()((set, get) => ({
  ...INITIAL_STATE,

  enterBatchMode: () =>
    set({ ...INITIAL_STATE, isActive: true }),

  exitBatchMode: () =>
    set(INITIAL_STATE),

  addFiles: async (fileList: File[]) => {
    const currentFormat = get().fileFormat;
    const newEntries: BatchFileEntry[] = [];

    for (const file of fileList) {
      try {
        const parsed = await parseFileFromDisk(file);

        // Format consistency check
        const parsedBaseFormat = isBedFamily(parsed.fileFormat) ? "bed" : parsed.fileFormat;
        if (currentFormat) {
          const currentBaseFormat = isBedFamily(currentFormat) ? "bed" : currentFormat;
          if (parsedBaseFormat !== currentBaseFormat) {
            continue; // Skip mismatched format
          }
        }

        const entry: BatchFileEntry = {
          id: crypto.randomUUID(),
          file,
          fileName: file.name,
          status: "pending",
          rowCount: parsed.rows.length,
        };

        newEntries.push(entry);

        // Set format from first file
        if (!currentFormat && newEntries.length === 1) {
          set({
            fileFormat: parsed.fileFormat,
            useChrPrefix: parsed.useChrPrefix,
          });
        }
      } catch {
        // Skip files that fail to parse
      }
    }

    set((state) => ({
      files: [...state.files, ...newEntries],
    }));
  },

  removeFile: (id: string) =>
    set((state) => {
      const newFiles = state.files.filter((f) => f.id !== id);
      return {
        files: newFiles,
        // Reset format if no files left
        fileFormat: newFiles.length === 0 ? null : state.fileFormat,
      };
    }),

  setSpeciesAndAssembly: (species: SpeciesConfig, assembly: Assembly) =>
    set({ species, assembly }),

  addPipelineStep: (operationId: BatchOperationId, params: Record<string, unknown>) =>
    set((state) => ({
      pipeline: [
        ...state.pipeline,
        { id: crypto.randomUUID(), operationId, params },
      ],
    })),

  removePipelineStep: (stepId: string) =>
    set((state) => ({
      pipeline: state.pipeline.filter((s) => s.id !== stepId),
    })),

  reorderPipeline: (fromIdx: number, toIdx: number) =>
    set((state) => {
      const pipeline = [...state.pipeline];
      const [moved] = pipeline.splice(fromIdx, 1);
      if (!moved) return state;
      pipeline.splice(toIdx, 0, moved);
      return { pipeline };
    }),

  setStep: (step) => set({ step }),

  startProcessing: async () => {
    const state = get();
    if (state.pipeline.length === 0 || state.files.length === 0) return;

    set({
      isRunning: true,
      cancelRequested: false,
      step: "processing",
      results: [],
    });

    const results: BatchResult[] = [];
    const { pipeline, species, assembly, useChrPrefix } = state;
    const speciesName = species?.ensemblName ?? "human";
    const speciesId = species?.id;

    for (let i = 0; i < state.files.length; i++) {
      if (get().cancelRequested) break;

      const entry = state.files[i]!;

      // Update status
      set((s) => ({
        files: s.files.map((f) =>
          f.id === entry.id ? { ...f, status: "processing" as BatchFileStatus } : f,
        ),
        progress: {
          currentFileIndex: i,
          totalFiles: state.files.length,
          currentFileName: entry.fileName,
          fileProgress: { completed: 0, total: 0 },
          currentStepIndex: 0,
          totalSteps: pipeline.length,
          currentStepName: OPERATION_LABELS[pipeline[0]!.operationId] ?? "",
        },
      }));

      try {
        // Parse file
        const parsed = await parseFileFromDisk(entry.file);
        let rows = parsed.rows;
        let columns = parsed.columns;
        let format = parsed.fileFormat;

        // Apply each pipeline step sequentially
        for (let stepIdx = 0; stepIdx < pipeline.length; stepIdx++) {
          if (get().cancelRequested) break;

          const step = pipeline[stepIdx]!;
          const stepLabel = OPERATION_LABELS[step.operationId] ?? step.operationId;

          // Update progress with current step
          set((s) => ({
            progress: s.progress
              ? {
                  ...s.progress,
                  currentStepIndex: stepIdx,
                  totalSteps: pipeline.length,
                  currentStepName: stepLabel,
                  fileProgress: { completed: 0, total: 0 },
                }
              : null,
          }));

          const result = await applyOperation(
            { operationId: step.operationId, params: step.params },
            rows,
            columns,
            format,
            parsed,
            assembly ?? "",
            useChrPrefix,
            speciesName,
            speciesId,
            (completed, total) => {
              set((s) => ({
                progress: s.progress
                  ? { ...s.progress, fileProgress: { completed, total } }
                  : null,
              }));
            },
            () => get().cancelRequested,
          );

          rows = result.rows;
          columns = result.columns;
          format = result.format;
        }

        if (get().cancelRequested) break;

        // Export to text
        const exportParsed = { ...parsed, fileFormat: format };
        const content = exportFileContent(exportParsed, rows, columns);

        // Build composite suffix from all pipeline steps
        const suffix = pipeline
          .map((s) => OPERATION_SUFFIXES[s.operationId] ?? "")
          .join("");
        const exportName = getBatchExportFileName(entry.fileName, suffix || "_batch");

        results.push({ content, fileName: exportName });

        // Update status
        set((s) => ({
          files: s.files.map((f) =>
            f.id === entry.id
              ? { ...f, status: "done" as BatchFileStatus, resultRowCount: rows.length }
              : f,
          ),
        }));
      } catch (err) {
        set((s) => ({
          files: s.files.map((f) =>
            f.id === entry.id
              ? {
                  ...f,
                  status: "error" as BatchFileStatus,
                  error: err instanceof Error ? err.message : String(err),
                }
              : f,
          ),
        }));
      }
    }

    set({
      isRunning: false,
      results,
      step: "done",
    });
  },

  cancelProcessing: () => set({ cancelRequested: true }),

  exportZip: async () => {
    const { results, pipeline } = get();
    if (results.length === 0) return;

    const opLabel = pipeline.length === 1
      ? pipeline[0]!.operationId
      : `pipeline_${pipeline.length}steps`;
    const zipName = `bedforge_${opLabel}_${results.length}files.zip`;
    await downloadBatchZip(results, zipName);
  },

  reset: () => set(INITIAL_STATE),
}));

// ── Operation dispatcher ──

interface OperationResult {
  rows: GenomicRow[];
  columns: string[];
  format: FileFormat;
}

async function applyOperation(
  config: { operationId: BatchOperationId; params: Record<string, unknown> },
  rows: GenomicRow[],
  columns: string[],
  format: FileFormat,
  _parsed: ParsedFile,
  assembly: string,
  useChrPrefix: boolean,
  speciesName: string,
  speciesId: string | undefined,
  onProgress: (completed: number, total: number) => void,
  isCancelled: () => boolean,
): Promise<OperationResult> {
  const { operationId, params } = config;

  switch (operationId) {
    case "sort":
      return { rows: sortRows(rows, format, speciesId), columns, format };

    case "dedup":
      return { rows: removeDuplicateRows(rows, format), columns, format };

    case "merge":
      return {
        rows: mergeRegionRows(rows),
        columns: ["chrom", "chromStart", "chromEnd"],
        format: "bed3",
      };

    case "validate":
      return { rows: validateAndFixRows(rows), columns, format };

    case "extend": {
      const upstream = (params.upstream as number) ?? 0;
      const downstream = (params.downstream as number) ?? 0;
      return { rows: extendRegionRows(rows, upstream, downstream, format), columns, format };
    }

    case "filter-chrom": {
      const keepChroms = params.keepChroms as Set<string>;
      return { rows: filterByChromValues(rows, keepChroms, format), columns, format };
    }

    case "filter-qual": {
      const minQual = (params.minQual as number) ?? 0;
      return { rows: filterByQual(rows, minQual), columns, format };
    }

    case "filter-filter": {
      const keepValues = params.keepValues as Set<string>;
      return { rows: filterByFilterValues(rows, keepValues), columns, format };
    }

    case "filter-variant-type": {
      const keepTypes = params.keepTypes as Set<string>;
      return { rows: filterByVariantTypes(rows, keepTypes as never), columns, format };
    }

    case "filter-genotype": {
      const sampleName = params.sampleName as string;
      const keepGTs = params.keepGTs as Set<string>;
      return { rows: filterByGenotypes(rows, sampleName, keepGTs), columns, format };
    }

    case "filter-type": {
      const keepTypes = params.keepTypes as Set<string>;
      return { rows: filterByTypeValues(rows, keepTypes), columns, format };
    }

    case "parse-info": {
      const keys = params.keys as string[] | undefined;
      // If no keys specified, auto-scan all keys
      const allKeys = keys ?? extractAllInfoKeys(rows);
      const result = parseInfoFields(rows, allKeys);
      return {
        rows: result.rows,
        columns: [...columns, ...result.newColumns],
        format,
      };
    }

    case "parse-attributes": {
      const keys = params.keys as string[] | undefined;
      const allKeys = keys ?? extractAllAttributeKeys(rows);
      const result = parseAttributeFields(rows, allKeys);
      return {
        rows: result.rows,
        columns: [...columns, ...result.newColumns],
        format,
      };
    }

    case "intersect": {
      const targetRows = params.targetRows as GenomicRow[];
      const targetFormat = params.targetFormat as FileFormat;
      const action = params.action as "keep" | "remove";
      const matchType = params.matchType as "overlap" | "exact";
      return {
        rows: intersectRows(rows, format, targetRows, targetFormat, action, matchType),
        columns,
        format,
      };
    }

    case "complement": {
      const chromSizes = params.chromSizes as Map<string, number>;
      return {
        rows: computeComplement(rows, chromSizes),
        columns: ["chrom", "chromStart", "chromEnd"],
        format: "bed3",
      };
    }

    case "find-replace": {
      const search = params.search as string;
      const replace = params.replace as string;
      const caseSensitive = (params.caseSensitive as boolean) ?? false;
      return {
        rows: findAndReplace(rows, columns, { search, replace, caseSensitive }),
        columns,
        format,
      };
    }

    // API operations
    case "annotate": {
      const result = await batchAnnotateGenes(
        rows, columns, format, speciesName, onProgress, isCancelled,
      );
      return { rows: result.rows, columns: result.columns, format: result.format };
    }

    case "gc-content": {
      const result = await batchGCContent(
        rows, columns, assembly, format, speciesName, onProgress, isCancelled,
      );
      return { rows: result.rows, columns: result.columns, format };
    }

    case "liftover": {
      const targetAssembly = params.targetAssembly as string;
      const result = await batchLiftOver(
        rows, format, assembly, targetAssembly, useChrPrefix, speciesName, onProgress, isCancelled,
      );
      return { rows: result, columns, format };
    }

    case "clean-intergenic": {
      const result = await batchCleanIntergenic(
        rows, assembly, format, speciesName, onProgress, isCancelled,
      );
      return { rows: result, columns, format };
    }

    default:
      return { rows, columns, format };
  }
}

/** Extract all INFO field keys from rows for auto-scan */
function extractAllInfoKeys(rows: GenomicRow[]): string[] {
  const keys = new Set<string>();
  for (const row of rows) {
    const info = String(row.INFO ?? ".");
    if (info === "." || info === "") continue;
    for (const pair of info.split(";")) {
      const eqIdx = pair.indexOf("=");
      const key = eqIdx === -1 ? pair.trim() : pair.slice(0, eqIdx).trim();
      if (key) keys.add(key);
    }
  }
  return [...keys];
}

/** Extract all attribute keys from GFF3 rows for auto-scan */
function extractAllAttributeKeys(rows: GenomicRow[]): string[] {
  const keys = new Set<string>();
  for (const row of rows) {
    const attrs = String(row.attributes ?? "");
    if (!attrs || attrs === ".") continue;
    for (const pair of attrs.split(";")) {
      const eqIdx = pair.indexOf("=");
      if (eqIdx === -1) continue;
      const key = pair.slice(0, eqIdx).trim();
      if (key) keys.add(key);
    }
  }
  return [...keys];
}
