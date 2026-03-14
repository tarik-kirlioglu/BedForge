import { create } from "zustand";

import { parseFileFromDisk } from "../parsers/parse-file";
import { exportFileContent, getBatchExportFileName, downloadBatchZip } from "../exporters/batch-export";
import { isBedFamily } from "../utils/format-helpers";
import { dispatchOperation } from "../operations/batch-dispatcher";

import type { Assembly, FileFormat, SpeciesConfig } from "../types/genomic";
import type {
  BatchFileEntry,
  BatchFileStatus,
  BatchOperationId,
  BatchPipelineStep,
  BatchProgress,
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

          const result = await dispatchOperation(
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

