import { create } from "zustand";

interface SearchState {
  isOpen: boolean;
  query: string;
  matchIndices: number[];
  currentMatchIndex: number;

  open: () => void;
  close: () => void;
  setQuery: (query: string) => void;
  setMatches: (indices: number[]) => void;
  nextMatch: () => void;
  prevMatch: () => void;
}

export const useSearchStore = create<SearchState>()((set) => ({
  isOpen: false,
  query: "",
  matchIndices: [],
  currentMatchIndex: -1,

  open: () => set({ isOpen: true }),
  close: () =>
    set({ isOpen: false, query: "", matchIndices: [], currentMatchIndex: -1 }),
  setQuery: (query) => set({ query, matchIndices: [], currentMatchIndex: -1 }),
  setMatches: (indices) =>
    set({ matchIndices: indices, currentMatchIndex: indices.length > 0 ? 0 : -1 }),
  nextMatch: () =>
    set((state) => {
      if (state.matchIndices.length === 0) return state;
      const next = (state.currentMatchIndex + 1) % state.matchIndices.length;
      return { currentMatchIndex: next };
    }),
  prevMatch: () =>
    set((state) => {
      if (state.matchIndices.length === 0) return state;
      const prev =
        state.currentMatchIndex <= 0
          ? state.matchIndices.length - 1
          : state.currentMatchIndex - 1;
      return { currentMatchIndex: prev };
    }),
}));
