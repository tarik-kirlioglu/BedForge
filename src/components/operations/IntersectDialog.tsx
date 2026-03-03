import { useState, useCallback } from "react";

import { useFileStore } from "../../stores/useFileStore";
import { parseBed } from "../../parsers/bed-parser";
import { findOverlaps, runIntersect } from "../../operations/intersect";
import type { GenomicRow } from "../../types/genomic";

interface IntersectDialogProps {
  visible: boolean;
  onClose: () => void;
}

export function IntersectDialog(props: IntersectDialogProps): React.ReactElement | null {
  const { visible, onClose } = props;
  const totalRows = useFileStore((s) => s.rows.length);

  const [mode, setMode] = useState<"intersect" | "subtract">("intersect");
  const [targetRows, setTargetRows] = useState<GenomicRow[]>([]);
  const [targetName, setTargetName] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [preview, setPreview] = useState<{ keep: number; remove: number } | null>(null);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const result = parseBed(text);
      setTargetRows(result.rows);
      setTargetName(file.name);

      // Compute preview
      const { overlapping, nonOverlapping } = findOverlaps(result.rows);
      setPreview({
        keep: mode === "intersect" ? overlapping.size : nonOverlapping.size,
        remove: mode === "intersect" ? nonOverlapping.size : overlapping.size,
      });
    };
    reader.readAsText(file);
  }, [mode]);

  function handleDrop(e: React.DragEvent): void {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function updatePreview(newMode: "intersect" | "subtract"): void {
    setMode(newMode);
    if (targetRows.length > 0) {
      const { overlapping, nonOverlapping } = findOverlaps(targetRows);
      setPreview({
        keep: newMode === "intersect" ? overlapping.size : nonOverlapping.size,
        remove: newMode === "intersect" ? nonOverlapping.size : overlapping.size,
      });
    }
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    runIntersect(mode, targetRows);
    onClose();
  }

  if (!visible) return null;

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <form
        onSubmit={handleSubmit}
        className="glass animate-slide-in w-[480px] rounded-2xl p-7 shadow-2xl shadow-black/50"
      >
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-glow/10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06d6a0" strokeWidth="1.5">
              <circle cx="9" cy="12" r="6" />
              <circle cx="15" cy="12" r="6" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary">Intersect / Subtract</h2>
            <p className="text-xs text-text-muted">Compare with another BED file</p>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="mb-4 flex rounded-lg border border-elevated bg-deep p-0.5">
          <button
            type="button"
            onClick={() => updatePreview("intersect")}
            className={`flex-1 rounded-md px-3 py-2 text-center font-mono text-[11px] font-medium transition-all ${
              mode === "intersect"
                ? "bg-cyan-glow/15 text-cyan-glow"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Intersect (keep overlapping)
          </button>
          <button
            type="button"
            onClick={() => updatePreview("subtract")}
            className={`flex-1 rounded-md px-3 py-2 text-center font-mono text-[11px] font-medium transition-all ${
              mode === "subtract"
                ? "bg-nt-t/15 text-nt-t"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Subtract (remove overlapping)
          </button>
        </div>

        {/* Drop zone */}
        <div
          className={`mb-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-all ${
            isDragOver
              ? "border-cyan-glow/50 bg-cyan-glow/5"
              : targetName
                ? "border-cyan-glow/20 bg-surface/30"
                : "border-elevated hover:border-elevated/80"
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          {targetName ? (
            <>
              <span className="font-mono text-[12px] font-medium text-cyan-glow">
                {targetName}
              </span>
              <span className="font-mono text-[10px] text-text-muted">
                {targetRows.length.toLocaleString()} regions
              </span>
            </>
          ) : (
            <>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-2 text-text-muted">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-xs text-text-muted">Drop a BED file or</span>
              <label className="mt-1 cursor-pointer font-mono text-[11px] text-cyan-glow hover:underline">
                browse
                <input
                  type="file"
                  accept=".bed,.bed3,.bed4,.bed6,.bed12,.txt,.tsv"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
            </>
          )}
        </div>

        {/* Preview */}
        {preview && (
          <div className="mb-5 flex items-center justify-between rounded-lg border border-elevated/60 bg-surface/30 px-4 py-2.5 font-mono text-[11px]">
            <span className="text-text-secondary">
              Keeping{" "}
              <span className="font-semibold text-cyan-glow">{preview.keep.toLocaleString()}</span>
              {" "}of {totalRows.toLocaleString()}
            </span>
            {preview.remove > 0 && (
              <span className="text-nt-t">-{preview.remove.toLocaleString()} rows</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-5 py-2 text-sm text-text-secondary transition-colors hover:bg-raised hover:text-text-primary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={targetRows.length === 0}
            className="rounded-xl bg-cyan-glow px-5 py-2 text-sm font-semibold text-void transition-all hover:shadow-lg hover:shadow-cyan-glow/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {mode === "intersect" ? "Intersect" : "Subtract"}
          </button>
        </div>
      </form>
    </div>
  );
}
