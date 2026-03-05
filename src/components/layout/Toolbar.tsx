import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

import { useFileStore } from "../../stores/useFileStore";
import { useSelectionStore } from "../../stores/useSelectionStore";
import { useOperationStore } from "../../stores/useOperationStore";
import { exportBed } from "../../exporters/bed-exporter";
import { exportVcf } from "../../exporters/vcf-exporter";
import { exportGff3 } from "../../exporters/gff3-exporter";
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
  const species = useFileStore((s) => s.species);
  const assembly = useFileStore((s) => s.assembly);
  const rows = useFileStore((s) => s.rows);
  const vcfMeta = useFileStore((s) => s.vcfMeta);
  const columns = useFileStore((s) => s.columns);
  const vcfSampleNames = useFileStore((s) => s.vcfSampleNames);
  const gff3Directives = useFileStore((s) => s.gff3Directives);
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
  const isGff3 = fileFormat === "gff3";

  function handleExportGff3(selectedOnly: boolean): void {
    setShowExportMenu(false);
    if (fileFormat !== "gff3") return;
    const targetRows = selectedOnly
      ? rows.filter((r) => selectedRowIndices.has(r._index))
      : rows;
    const content = exportGff3(targetRows, gff3Directives);
    const suffix = assembly ? `_${assembly}` : "_modified";
    downloadFile(content, getExportFileName(suffix, "gff3"));
    toast.success(`Exported ${targetRows.length} rows as GFF3`);
  }

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
        <a
          href="https://github.com/tarik-kirlioglu/BedForge"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-raised hover:text-text-secondary"
          title="GitHub"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
        </a>
      </div>

      {/* File info */}
      <div className="flex items-center gap-2.5">
        <span className="font-mono text-[13px] font-medium text-text-primary">{fileName}</span>

        {fileFormat && (
          <span className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase ${
            isVcf
              ? "bg-electric/10 text-electric border border-electric/15"
              : isGff3
                ? "bg-nt-g/10 text-nt-g border border-nt-g/15"
                : "bg-cyan-glow/10 text-cyan-glow border border-cyan-glow/15"
          }`}>
            {fileFormat}
          </span>
        )}

        {species && (
          <span className="rounded-md border border-electric/15 bg-electric/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-electric">
            {species.displayName}
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
                onClick={() => isVcf ? handleExportVcf(false) : isGff3 ? handleExportGff3(false) : handleExportBed(false)}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-elevated/50 hover:text-text-primary"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 2v6h6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Export all as {isVcf ? "VCF" : isGff3 ? "GFF3" : "BED"}
              </button>
              {selectedRowIndices.size > 0 && (
                <button
                  onClick={() => isVcf ? handleExportVcf(true) : isGff3 ? handleExportGff3(true) : handleExportBed(true)}
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
