import { useEffect } from "react";

import { useFileStore } from "../stores/useFileStore";
import { useSelectionStore } from "../stores/useSelectionStore";

/** Global keyboard shortcuts for the application */
export function useKeyboardShortcuts(): void {
  const undo = useFileStore((s) => s.undo);
  const redo = useFileStore((s) => s.redo);
  const rows = useFileStore((s) => s.rows);
  const deleteRows = useFileStore((s) => s.deleteRows);
  const selectedRowIndices = useSelectionStore((s) => s.selectedRowIndices);
  const clearSelection = useSelectionStore((s) => s.clearSelection);
  const selectAll = useSelectionStore((s) => s.selectAll);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      // Don't intercept when editing an input
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (ctrl && (e.key === "Z" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if (ctrl && e.key === "y") {
        e.preventDefault();
        redo();
      } else if (ctrl && e.key === "a") {
        e.preventDefault();
        selectAll(rows.map((r) => r._index));
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedRowIndices.size > 0) {
          e.preventDefault();
          deleteRows(selectedRowIndices);
          clearSelection();
        }
      } else if (e.key === "Escape") {
        clearSelection();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, rows, deleteRows, selectedRowIndices, clearSelection, selectAll]);
}
