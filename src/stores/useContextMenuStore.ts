import { create } from "zustand";

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  open: (x: number, y: number) => void;
  close: () => void;
}

export const useContextMenuStore = create<ContextMenuState>()((set) => ({
  visible: false,
  x: 0,
  y: 0,
  open: (x, y) => set({ visible: true, x, y }),
  close: () => set({ visible: false }),
}));
