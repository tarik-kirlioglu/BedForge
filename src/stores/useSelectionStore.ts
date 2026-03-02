import { create } from "zustand";

import type { CellPosition } from "../types/table";

interface SelectionState {
  selectedRowIndices: Set<number>;
  activeCell: CellPosition | null;

  toggleRow: (index: number) => void;
  selectRange: (start: number, end: number) => void;
  selectAll: (allIndices: number[]) => void;
  clearSelection: () => void;
  setActiveCell: (position: CellPosition | null) => void;
  setSelectedRows: (indices: Set<number>) => void;
}

export const useSelectionStore = create<SelectionState>()((set) => ({
  selectedRowIndices: new Set<number>(),
  activeCell: null,

  toggleRow: (index) =>
    set((state) => {
      const next = new Set(state.selectedRowIndices);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return { selectedRowIndices: next };
    }),

  selectRange: (start, end) =>
    set(() => {
      const next = new Set<number>();
      const lo = Math.min(start, end);
      const hi = Math.max(start, end);
      for (let i = lo; i <= hi; i++) {
        next.add(i);
      }
      return { selectedRowIndices: next };
    }),

  selectAll: (allIndices) =>
    set(() => ({
      selectedRowIndices: new Set(allIndices),
    })),

  clearSelection: () =>
    set(() => ({
      selectedRowIndices: new Set<number>(),
      activeCell: null,
    })),

  setActiveCell: (position) =>
    set(() => ({
      activeCell: position,
    })),

  setSelectedRows: (indices) =>
    set(() => ({
      selectedRowIndices: indices,
    })),
}));
