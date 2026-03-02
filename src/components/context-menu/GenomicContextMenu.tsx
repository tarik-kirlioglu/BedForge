import { useEffect, useRef } from "react";
import { create } from "zustand";

import { useFileStore } from "../../stores/useFileStore";
import { useSelectionStore } from "../../stores/useSelectionStore";
import { useOperationStore } from "../../stores/useOperationStore";
import { runLiftOver } from "../../operations/liftover-operation";
import { runCleanIntergenic } from "../../operations/clean-intergenic";
import { runGCContent } from "../../operations/gc-content";

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

export function GenomicContextMenu(): React.ReactElement | null {
  const { visible, x, y, close } = useContextMenuStore();
  const assembly = useFileStore((s) => s.assembly);
  const fileFormat = useFileStore((s) => s.fileFormat);
  const rows = useFileStore((s) => s.rows);
  const useChrPrefix = useFileStore((s) => s.useChrPrefix);
  const deleteRows = useFileStore((s) => s.deleteRows);
  const selectedRowIndices = useSelectionStore((s) => s.selectedRowIndices);
  const clearSelection = useSelectionStore((s) => s.clearSelection);
  const isRunning = useOperationStore((s) => s.isRunning);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;
    function handleClickOutside(e: MouseEvent): void {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    }
    function handleScroll(): void {
      close();
    }
    function handleEscape(e: KeyboardEvent): void {
      if (e.key === "Escape") close();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("scroll", handleScroll, true);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("scroll", handleScroll, true);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [visible, close]);

  if (!visible) return null;

  const selectedRows = rows.filter((r) => selectedRowIndices.has(r._index));
  const isBed = fileFormat !== "vcf";
  const targetAssembly = assembly === "GRCh37" ? "GRCh38" : "GRCh37";

  // Viewport-aware positioning
  const menuWidth = 260;
  const menuHeight = 240;
  const adjustedX = x + menuWidth > window.innerWidth ? x - menuWidth : x;
  const adjustedY = y + menuHeight > window.innerHeight ? y - menuHeight : y;

  function handleLiftOver(): void {
    close();
    if (!assembly) return;
    runLiftOver(selectedRows, assembly, targetAssembly, useChrPrefix, isBed);
  }

  function handleCleanIntergenic(): void {
    close();
    if (!assembly) return;
    runCleanIntergenic(
      isBed ? rows : selectedRows,
      assembly,
      useChrPrefix,
      isBed,
    );
  }

  function handleGCContent(): void {
    close();
    if (!assembly) return;
    runGCContent(selectedRows, assembly, useChrPrefix, isBed);
  }

  function handleDeleteRows(): void {
    close();
    deleteRows(selectedRowIndices);
    clearSelection();
  }

  function handleCopyRows(): void {
    close();
    const text = selectedRows
      .map((r) => {
        const cols = useFileStore.getState().columns;
        return cols.map((c) => String(r[c] ?? "")).join("\t");
      })
      .join("\n");
    navigator.clipboard.writeText(text);
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[240px] rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl shadow-black/40"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {/* LiftOver */}
      <MenuItem
        label={`LiftOver to ${targetAssembly}`}
        sublabel={`${selectedRows.length} region${selectedRows.length !== 1 ? "s" : ""}`}
        icon="🔄"
        onClick={handleLiftOver}
        disabled={isRunning || selectedRows.length === 0}
      />

      <div className="my-1 border-t border-zinc-800" />

      {/* Clean Intergenic */}
      <MenuItem
        label="Clean Intergenic Regions"
        sublabel={isBed ? "All rows" : "Selected rows"}
        icon="🧹"
        onClick={handleCleanIntergenic}
        disabled={isRunning}
      />

      <div className="my-1 border-t border-zinc-800" />

      {/* GC Content */}
      <MenuItem
        label="Calculate GC Content"
        sublabel={`${selectedRows.length} region${selectedRows.length !== 1 ? "s" : ""}`}
        icon="📊"
        onClick={handleGCContent}
        disabled={isRunning || selectedRows.length === 0}
      />

      <div className="my-1 border-t border-zinc-800" />

      {/* Delete */}
      <MenuItem
        label="Delete Selected Rows"
        sublabel={`${selectedRows.length} row${selectedRows.length !== 1 ? "s" : ""}`}
        icon="🗑️"
        onClick={handleDeleteRows}
        disabled={selectedRows.length === 0}
        danger
      />

      {/* Copy */}
      <MenuItem
        label="Copy to Clipboard"
        icon="📋"
        onClick={handleCopyRows}
        disabled={selectedRows.length === 0}
      />
    </div>
  );
}

interface MenuItemProps {
  label: string;
  sublabel?: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

function MenuItem(props: MenuItemProps): React.ReactElement {
  const { label, sublabel, icon, onClick, disabled, danger } = props;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition-colors ${
        disabled
          ? "cursor-not-allowed text-zinc-600"
          : danger
            ? "text-red-400 hover:bg-red-500/10"
            : "text-zinc-300 hover:bg-zinc-800"
      }`}
    >
      <span className="w-5 text-center text-sm">{icon}</span>
      <div className="flex-1">
        <div>{label}</div>
        {sublabel && (
          <div className="text-xs text-zinc-500">{sublabel}</div>
        )}
      </div>
    </button>
  );
}
