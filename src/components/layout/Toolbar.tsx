import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

import { useFileStore } from "../../stores/useFileStore";
import { useSelectionStore } from "../../stores/useSelectionStore";
import { exportBed } from "../../exporters/bed-exporter";
import { exportVcf } from "../../exporters/vcf-exporter";
import { downloadFile } from "../../exporters/download";
import type { BedFormat } from "../../types/bed";

export function Toolbar(): React.ReactElement {
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

    // Rebuild headerColumns from columns
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
    <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-4 py-2">
      {/* File info */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-zinc-100">{fileName}</span>
        {fileFormat && (
          <span className="rounded bg-genome-blue/20 px-1.5 py-0.5 text-xs font-mono text-genome-blue">
            {fileFormat.toUpperCase()}
          </span>
        )}
        {assembly && (
          <span className="rounded bg-genome-green/20 px-1.5 py-0.5 text-xs font-mono text-genome-green">
            {assembly}
          </span>
        )}
        <span className="text-xs text-zinc-500">
          {rows.length.toLocaleString()} rows
        </span>
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={undo}
          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          title="Undo (Ctrl+Z)"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 10h10a5 5 0 0 1 0 10H9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7 14L3 10l4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          onClick={redo}
          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          title="Redo (Ctrl+Shift+Z)"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10H11a5 5 0 0 0 0 10h4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M17 14l4-4-4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Export dropdown */}
        <div ref={exportRef} className="relative ml-2">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-1 rounded bg-genome-blue/20 px-2.5 py-1 text-xs font-medium text-genome-blue hover:bg-genome-blue/30"
          >
            Export
            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>

          {showExportMenu && (
            <div className="absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
              <button
                onClick={() => isVcf ? handleExportVcf(false) : handleExportBed(false)}
                className="w-full px-3 py-1.5 text-left text-sm text-zinc-300 hover:bg-zinc-800"
              >
                Export all as {isVcf ? "VCF" : "BED"}
              </button>
              {selectedRowIndices.size > 0 && (
                <button
                  onClick={() => isVcf ? handleExportVcf(true) : handleExportBed(true)}
                  className="w-full px-3 py-1.5 text-left text-sm text-zinc-300 hover:bg-zinc-800"
                >
                  Export selected ({selectedRowIndices.size})
                </button>
              )}
            </div>
          )}
        </div>

        <button
          onClick={reset}
          className="ml-1 rounded px-2.5 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          title="Close file"
        >
          Close
        </button>
      </div>
    </div>
  );
}
