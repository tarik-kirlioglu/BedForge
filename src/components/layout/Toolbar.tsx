import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

import { useFileStore } from "../../stores/useFileStore";
import { useSelectionStore } from "../../stores/useSelectionStore";
import { useOperationStore } from "../../stores/useOperationStore";
import { exportBed } from "../../exporters/bed-exporter";
import { exportVcf } from "../../exporters/vcf-exporter";
import { downloadFile } from "../../exporters/download";
import type { BedFormat } from "../../types/bed";

interface ToolbarProps {
  showStats: boolean;
  onToggleStats: () => void;
}

export function Toolbar(props: ToolbarProps): React.ReactElement {
  const { showStats, onToggleStats } = props;
  const fileName = useFileStore((s) => s.fileName);
  const fileFormat = useFileStore((s) => s.fileFormat);
  const assembly = useFileStore((s) => s.assembly);
  const rows = useFileStore((s) => s.rows);
  const vcfMeta = useFileStore((s) => s.vcfMeta);
  const columns = useFileStore((s) => s.columns);
  const vcfSampleNames = useFileStore((s) => s.vcfSampleNames);
  const undo = useFileStore((s) => s.undo);
  const redo = useFileStore((s) => s.redo);
  const reset = useFileStore((s) => s.reset);
  const selectedRowIndices = useSelectionStore((s) => s.selectedRowIndices);
  const isRunning = useOperationStore((s) => s.isRunning);
  const operationName = useOperationStore((s) => s.operationName);
  const progress = useOperationStore((s) => s.progress);

  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showExportMenu) return;
    function handleClickOutside(e: MouseEvent): void {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showExportMenu]);

  function getExportFileName(suffix: string, ext: string): string {
    const base = fileName?.replace(/\.[^.]+$/, "") ?? "export";
    return `${base}${suffix}.${ext}`;
  }

  function handleExportBed(selectedOnly: boolean): void {
    setShowExportMenu(false);
    if (fileFormat === "vcf") return;
    const targetRows = selectedOnly
      ? rows.filter((r) => selectedRowIndices.has(r._index))
      : rows;
    const content = exportBed(targetRows, fileFormat as BedFormat);
    const suffix = assembly ? `_${assembly}` : "_modified";
    downloadFile(content, getExportFileName(suffix, "bed"));
    toast.success(`Exported ${targetRows.length} rows as BED`);
  }

  function handleExportVcf(selectedOnly: boolean): void {
    setShowExportMenu(false);
    if (fileFormat !== "vcf") return;
    const targetRows = selectedOnly
      ? rows.filter((r) => selectedRowIndices.has(r._index))
      : rows;
    const headerColumns = columns.includes("FORMAT")
      ? [...columns.filter((c) => c !== "FORMAT").slice(0, 8), "FORMAT", ...vcfSampleNames]
      : columns;
    const content = exportVcf(targetRows, vcfMeta, headerColumns, vcfSampleNames);
    const suffix = assembly ? `_${assembly}` : "_modified";
    downloadFile(content, getExportFileName(suffix, "vcf"));
    toast.success(`Exported ${targetRows.length} rows as VCF`);
  }

  const isVcf = fileFormat === "vcf";

  return (
    <div className="glass-strong relative z-20 flex items-center gap-4 px-4 py-2.5">
      {/* Brand mark */}
      <div className="flex items-center gap-2 border-r border-elevated pr-4">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-cyan-glow/20 to-electric/20">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M4 6h16M4 12h16M4 18h10" stroke="#06d6a0" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
        <span className="text-sm font-semibold tracking-tight text-text-primary">
          Bed<span className="text-cyan-glow">Forge</span>
        </span>
      </div>

      {/* File info */}
      <div className="flex items-center gap-2.5">
        <span className="font-mono text-[13px] font-medium text-text-primary">{fileName}</span>

        {fileFormat && (
          <span className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase ${
            isVcf
              ? "bg-electric/10 text-electric border border-electric/15"
              : "bg-cyan-glow/10 text-cyan-glow border border-cyan-glow/15"
          }`}>
            {fileFormat}
          </span>
        )}

        {assembly && (
          <span className="rounded-md border border-nt-a/15 bg-nt-a/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-nt-a">
            {assembly}
          </span>
        )}

        <span className="font-mono text-xs text-text-secondary">
          {rows.length.toLocaleString()} rows
        </span>
      </div>

      {/* Operation progress */}
      {isRunning && operationName && (
        <div className="flex items-center gap-2 rounded-lg border border-cyan-glow/15 bg-cyan-glow/5 px-3 py-1">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-glow" />
          <span className="font-mono text-[11px] text-cyan-glow">
            {operationName}: {progress.completed}/{progress.total}
          </span>
        </div>
      )}

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Stats toggle */}
        <button
          onClick={onToggleStats}
          className={`rounded-lg p-2 transition-colors ${
            showStats
              ? "bg-cyan-glow/10 text-cyan-glow"
              : "text-text-secondary hover:bg-raised hover:text-text-primary"
          }`}
          title="Toggle statistics panel"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="mx-1.5 h-4 w-px bg-elevated" />

        {/* Undo */}
        <button
          onClick={undo}
          className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-raised hover:text-text-primary"
          title="Undo (Ctrl+Z)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 10h10a5 5 0 0 1 0 10H9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7 14L3 10l4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Redo */}
        <button
          onClick={redo}
          className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-raised hover:text-text-primary"
          title="Redo (Ctrl+Shift+Z)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10H11a5 5 0 0 0 0 10h4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M17 14l4-4-4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="mx-1.5 h-4 w-px bg-elevated" />

        {/* Export */}
        <div ref={exportRef} className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-1.5 rounded-lg border border-cyan-glow/20 bg-cyan-glow/5 px-3 py-1.5 font-mono text-xs font-medium text-cyan-glow transition-all hover:border-cyan-glow/30 hover:bg-cyan-glow/10"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14m0 0l-4-4m4 4l4-4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 18h16" strokeLinecap="round" />
            </svg>
            Export
          </button>

          {showExportMenu && (
            <div className="glass animate-slide-in absolute right-0 top-full z-30 mt-2 min-w-[200px] rounded-xl py-1.5 shadow-2xl shadow-black/40">
              <button
                onClick={() => isVcf ? handleExportVcf(false) : handleExportBed(false)}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-elevated/50 hover:text-text-primary"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 2v6h6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Export all as {isVcf ? "VCF" : "BED"}
              </button>
              {selectedRowIndices.size > 0 && (
                <button
                  onClick={() => isVcf ? handleExportVcf(true) : handleExportBed(true)}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-elevated/50 hover:text-text-primary"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Export selected ({selectedRowIndices.size})
                </button>
              )}
            </div>
          )}
        </div>

        {/* Close */}
        <button
          onClick={reset}
          className="ml-1 rounded-lg p-2 text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
          title="Close file"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
