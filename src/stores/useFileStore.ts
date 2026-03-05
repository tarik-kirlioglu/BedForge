import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import type { Assembly, FileFormat, GenomicRow, SpeciesConfig } from "../types/genomic";
import type { Gff3Directive } from "../types/gff3";
import type { VcfMetaLine } from "../types/vcf";

const MAX_HISTORY = 20;

interface FileState {
  fileName: string | null;
  fileFormat: FileFormat | null;
  species: SpeciesConfig | null;
  assembly: Assembly | null;
  useChrPrefix: boolean;

  rows: GenomicRow[];
  columns: string[];
  vcfMeta: VcfMetaLine[];
  vcfSampleNames: string[];
  gff3Directives: Gff3Directive[];

  history: GenomicRow[][];
  historyIndex: number;

  loadFile: (params: {
    fileName: string;
    fileFormat: FileFormat;
    rows: GenomicRow[];
    columns: string[];
    vcfMeta?: VcfMetaLine[];
    vcfSampleNames?: string[];
    gff3Directives?: Gff3Directive[];
    useChrPrefix: boolean;
  }) => void;
  setSpeciesAndAssembly: (species: SpeciesConfig, assembly: Assembly) => void;
  updateCell: (rowIndex: number, colKey: string, value: string | number) => void;
  deleteRows: (indices: Set<number>) => void;
  updateRows: (updates: Array<{ index: number; row: Partial<GenomicRow> }>) => void;
  addColumn: (name: string, values: Map<number, string>) => void;
  addRow: (afterIndex?: number) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
}

function pushHistory(state: FileState): void {
  const snapshot = state.rows.map((r) => ({ ...r }));
  state.history = state.history.slice(0, state.historyIndex + 1);
  state.history.push(snapshot);
  if (state.history.length > MAX_HISTORY) {
    state.history.shift();
  }
  state.historyIndex = state.history.length - 1;
}

export const useFileStore = create<FileState>()(
  immer((set) => ({
    fileName: null,
    fileFormat: null,
    species: null,
    assembly: null,
    useChrPrefix: true,

    rows: [],
    columns: [],
    vcfMeta: [],
    vcfSampleNames: [],
    gff3Directives: [],

    history: [],
    historyIndex: -1,

    loadFile: (params) =>
      set((state) => {
        state.fileName = params.fileName;
        state.fileFormat = params.fileFormat;
        state.rows = params.rows;
        state.columns = params.columns;
        state.vcfMeta = params.vcfMeta ?? [];
        state.vcfSampleNames = params.vcfSampleNames ?? [];
        state.gff3Directives = params.gff3Directives ?? [];
        state.useChrPrefix = params.useChrPrefix;
        state.history = [params.rows.map((r) => ({ ...r }))];
        state.historyIndex = 0;
        state.species = null;
        state.assembly = null;
      }),

    setSpeciesAndAssembly: (species, assembly) =>
      set((state) => {
        state.species = species;
        state.assembly = assembly;
      }),

    updateCell: (rowIndex, colKey, value) =>
      set((state) => {
        const row = state.rows.find((r) => r._index === rowIndex);
        if (!row) return;
        pushHistory(state);
        row[colKey] = value;
      }),

    deleteRows: (indices) =>
      set((state) => {
        pushHistory(state);
        state.rows = state.rows.filter((r) => !indices.has(r._index));
      }),

    updateRows: (updates) =>
      set((state) => {
        pushHistory(state);
        for (const { index, row } of updates) {
          const target = state.rows.find((r) => r._index === index);
          if (target) {
            Object.assign(target, row);
          }
        }
      }),

    addRow: (afterIndex) =>
      set((state) => {
        pushHistory(state);
        const maxIndex = state.rows.reduce((max, r) => Math.max(max, r._index), -1);
        const newIndex = maxIndex + 1;
        const newRow: GenomicRow = {
          _index: newIndex,
          _rowId: `new-row-${Date.now()}`,
        };

        const isVcf = state.fileFormat === "vcf";
        const isGff3 = state.fileFormat === "gff3";
        for (const col of state.columns) {
          if (isVcf) {
            newRow[col] = col === "POS" ? 0 : ".";
          } else if (isGff3) {
            newRow[col] = (col === "start" || col === "end") ? 0 : ".";
          } else {
            if (col === "chromStart" || col === "chromEnd" || col === "score" ||
                col === "thickStart" || col === "thickEnd" || col === "blockCount") {
              newRow[col] = 0;
            } else {
              newRow[col] = ".";
            }
          }
        }

        if (afterIndex !== undefined) {
          const pos = state.rows.findIndex((r) => r._index === afterIndex);
          if (pos !== -1) {
            state.rows.splice(pos + 1, 0, newRow);
          } else {
            state.rows.push(newRow);
          }
        } else {
          state.rows.push(newRow);
        }
      }),

    addColumn: (name, values) =>
      set((state) => {
        pushHistory(state);
        if (!state.columns.includes(name)) {
          state.columns.push(name);
        }
        for (const row of state.rows) {
          const val = values.get(row._index);
          if (val !== undefined) {
            row[name] = val;
          }
        }
      }),

    undo: () =>
      set((state) => {
        if (state.historyIndex <= 0) return;
        state.historyIndex--;
        const snapshot = state.history[state.historyIndex];
        if (snapshot) {
          state.rows = snapshot.map((r) => ({ ...r }));
        }
      }),

    redo: () =>
      set((state) => {
        if (state.historyIndex >= state.history.length - 1) return;
        state.historyIndex++;
        const snapshot = state.history[state.historyIndex];
        if (snapshot) {
          state.rows = snapshot.map((r) => ({ ...r }));
        }
      }),

    reset: () =>
      set((state) => {
        state.fileName = null;
        state.fileFormat = null;
        state.species = null;
        state.assembly = null;
        state.rows = [];
        state.columns = [];
        state.vcfMeta = [];
        state.vcfSampleNames = [];
        state.gff3Directives = [];
        state.history = [];
        state.historyIndex = -1;
      }),
  })),
);
