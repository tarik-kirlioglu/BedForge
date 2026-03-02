import { create } from "zustand";

interface OperationState {
  isRunning: boolean;
  operationName: string | null;
  progress: { completed: number; total: number };
  isCancelled: boolean;

  startOperation: (name: string, total: number) => void;
  incrementProgress: (count?: number) => void;
  completeOperation: () => void;
  failOperation: (error: string) => void;
  cancelOperation: () => void;
  resetOperation: () => void;
}

export const useOperationStore = create<OperationState>()((set) => ({
  isRunning: false,
  operationName: null,
  progress: { completed: 0, total: 0 },
  isCancelled: false,

  startOperation: (name, total) =>
    set({
      isRunning: true,
      operationName: name,
      progress: { completed: 0, total },
      isCancelled: false,
    }),

  incrementProgress: (count = 1) =>
    set((state) => ({
      progress: {
        completed: state.progress.completed + count,
        total: state.progress.total,
      },
    })),

  completeOperation: () =>
    set({
      isRunning: false,
      operationName: null,
      progress: { completed: 0, total: 0 },
      isCancelled: false,
    }),

  failOperation: (_error) =>
    set({
      isRunning: false,
      isCancelled: false,
    }),

  cancelOperation: () =>
    set({
      isCancelled: true,
    }),

  resetOperation: () =>
    set({
      isRunning: false,
      operationName: null,
      progress: { completed: 0, total: 0 },
      isCancelled: false,
    }),
}));
