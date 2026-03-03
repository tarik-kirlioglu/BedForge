import { useEffect } from "react";

import { useFileStore } from "../stores/useFileStore";
import { useSelectionStore } from "../stores/useSelectionStore";
import { useSearchStore } from "../stores/useSearchStore";

interface KeyboardShortcutOptions {
  onOpenFindReplace?: () => void;
}

/** Global keyboard shortcuts for the application */
export function useKeyboardShortcuts(options?: KeyboardShortcutOptions): void {
  const undo = useFileStore((s) => s.undo);
  const redo = useFileStore((s) => s.redo);
  const rows = useFileStore((s) => s.rows);
  const deleteRows = useFileStore((s) => s.deleteRows);
  const selectedRowIndices = useSelectionStore((s) => s.selectedRowIndices);
  const clearSelection = useSelectionStore((s) => s.clearSelection);
  const selectAll = useSelectionStore((s) => s.selectAll);
  const openSearch = useSearchStore((s) => s.open);
  const searchIsOpen = useSearchStore((s) => s.isOpen);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      const target = e.target as HTMLElement;
      const ctrl = e.ctrlKey || e.metaKey;

      // Ctrl+F: open search (always, even from inputs)
      if (ctrl && e.key === "f") {
        e.preventDefault();
        openSearch();
        return;
      }

      // Ctrl+H: open find & replace
      if (ctrl && e.key === "h") {
        e.preventDefault();
        options?.onOpenFindReplace?.();
        return;
      }

      // Don't intercept other shortcuts when editing an input
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

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
  }, [undo, redo, rows, deleteRows, selectedRowIndices, clearSelection, selectAll, openSearch, searchIsOpen, options]);
}
