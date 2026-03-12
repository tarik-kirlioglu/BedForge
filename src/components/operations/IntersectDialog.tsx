import { useState, useCallback } from "react";

import { useFileStore } from "../../stores/useFileStore";
import { parseBed } from "../../parsers/bed-parser";
import { parseVcf } from "../../parsers/vcf-parser";
import { parseGff3 } from "../../parsers/gff3-parser";
import { findOverlaps, runIntersect } from "../../operations/intersect";
import type { IntersectAction, MatchType } from "../../operations/intersect";
import type { FileFormat, GenomicRow } from "../../types/genomic";

interface IntersectDialogProps {
  visible: boolean;
  onClose: () => void;
}

function getFormatLabel(format: FileFormat): string {
  if (format === "vcf") return "VCF";
  if (format === "gff3") return "GFF3";
  return "BED";
}

function getAcceptExtensions(format: FileFormat): string {
  if (format === "vcf") return ".vcf,.txt,.tsv";
  if (format === "gff3") return ".gff3,.gff,.txt,.tsv";
  return ".bed,.bed3,.bed4,.bed6,.bed12,.txt,.tsv";
}

function detectFormatFromName(fileName: string, fallback: FileFormat): FileFormat {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".vcf") || lower.endsWith(".vcf.gz")) return "vcf";
  if (lower.endsWith(".gff3") || lower.endsWith(".gff3.gz") || lower.endsWith(".gff") || lower.endsWith(".gff.gz")) return "gff3";
  if (lower.endsWith(".bed") || lower.match(/\.bed\d+$/)) return fallback;
  return fallback;
}

function parseByFormat(text: string, format: FileFormat): { rows: GenomicRow[]; detectedFormat: FileFormat } {
  if (format === "vcf") return { rows: parseVcf(text).rows, detectedFormat: "vcf" };
  if (format === "gff3") return { rows: parseGff3(text).rows, detectedFormat: "gff3" };
  const result = parseBed(text);
  return { rows: result.rows, detectedFormat: result.format };
}

function computePreview(
  action: IntersectAction,
  matching: Set<number>,
  nonMatching: Set<number>,
): { keep: number; remove: number } {
  return action === "keep"
    ? { keep: matching.size, remove: nonMatching.size }
    : { keep: nonMatching.size, remove: matching.size };
}

export function IntersectDialog(props: IntersectDialogProps): React.ReactElement | null {
  const { visible, onClose } = props;
  const totalRows = useFileStore((s) => s.rows.length);
  const mainFormat = useFileStore((s) => s.fileFormat);

  const [action, setAction] = useState<IntersectAction>("keep");
  const [matchType, setMatchType] = useState<MatchType>("overlap");
  const [targetRows, setTargetRows] = useState<GenomicRow[]>([]);
  const [targetFormat, setTargetFormat] = useState<FileFormat | null>(null);
  const [targetName, setTargetName] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [preview, setPreview] = useState<{ keep: number; remove: number } | null>(null);

  function refreshPreview(rows: GenomicRow[], fmt: FileFormat, a: IntersectAction, m: MatchType): void {
    const { matching, nonMatching } = findOverlaps(rows, fmt, m);
    setPreview(computePreview(a, matching, nonMatching));
  }

  const handleFile = useCallback((file: File) => {
    const guessedFormat = detectFormatFromName(file.name, mainFormat!);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { rows, detectedFormat } = parseByFormat(text, guessedFormat);
      setTargetRows(rows);
      setTargetFormat(detectedFormat);
      setTargetName(file.name);
      refreshPreview(rows, detectedFormat, action, matchType);
    };
    reader.readAsText(file);
  }, [action, matchType, mainFormat]);

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

  function updateAction(newAction: IntersectAction): void {
    setAction(newAction);
    if (targetRows.length > 0 && targetFormat) {
      refreshPreview(targetRows, targetFormat, newAction, matchType);
    }
  }

  function updateMatchType(newMatchType: MatchType): void {
    setMatchType(newMatchType);
    if (targetRows.length > 0 && targetFormat) {
      refreshPreview(targetRows, targetFormat, action, newMatchType);
    }
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (targetFormat) {
      runIntersect(action, matchType, targetRows, targetFormat);
    }
    onClose();
  }

  if (!visible || !mainFormat) return null;

  const formatLabel = getFormatLabel(mainFormat);

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
            <p className="text-xs text-text-muted">Compare with another {formatLabel} file</p>
          </div>
        </div>

        {/* Action toggle: Keep / Remove */}
        <label className="mb-1.5 block text-[9px] uppercase tracking-[0.15em] text-text-muted">Action</label>
        <div className="mb-3 flex rounded-lg border border-elevated bg-deep p-0.5">
          <button
            type="button"
            onClick={() => updateAction("keep")}
            className={`flex-1 rounded-md px-3 py-1.5 text-center font-mono text-[11px] font-medium transition-all ${
              action === "keep"
                ? "bg-cyan-glow/15 text-cyan-glow"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Intersect (keep matching)
          </button>
          <button
            type="button"
            onClick={() => updateAction("remove")}
            className={`flex-1 rounded-md px-3 py-1.5 text-center font-mono text-[11px] font-medium transition-all ${
              action === "remove"
                ? "bg-nt-t/15 text-nt-t"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Subtract (remove matching)
          </button>
        </div>

        {/* Match type toggle: Overlap / Exact */}
        <label className="mb-1.5 block text-[9px] uppercase tracking-[0.15em] text-text-muted">Match type</label>
        <div className="mb-3 flex rounded-lg border border-elevated bg-deep p-0.5">
          <button
            type="button"
            onClick={() => updateMatchType("overlap")}
            className={`flex-1 rounded-md px-3 py-1.5 text-center font-mono text-[11px] font-medium transition-all ${
              matchType === "overlap"
                ? "bg-electric/15 text-electric"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Overlap (any overlap)
          </button>
          <button
            type="button"
            onClick={() => updateMatchType("exact")}
            className={`flex-1 rounded-md px-3 py-1.5 text-center font-mono text-[11px] font-medium transition-all ${
              matchType === "exact"
                ? "bg-electric/15 text-electric"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Exact (chrom + start + end)
          </button>
        </div>

        {/* Description */}
        <p className="mb-4 text-[10px] text-text-muted">
          {action === "keep" && matchType === "overlap" && "Keep rows that overlap with any target region"}
          {action === "keep" && matchType === "exact" && "Keep rows with exact coordinate match in target"}
          {action === "remove" && matchType === "overlap" && "Remove rows that overlap with any target region"}
          {action === "remove" && matchType === "exact" && "Remove rows with exact coordinate match in target"}
        </p>

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
                {targetRows.length.toLocaleString()} {mainFormat === "vcf" ? "variants" : "regions"}
              </span>
            </>
          ) : (
            <>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-2 text-text-muted">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-xs text-text-muted">Drop a {formatLabel} file or</span>
              <label className="mt-1 cursor-pointer font-mono text-[11px] text-cyan-glow hover:underline">
                browse
                <input
                  type="file"
                  accept={getAcceptExtensions(mainFormat)}
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
            {action === "keep" ? "Intersect" : "Subtract"}
          </button>
        </div>
      </form>
    </div>
  );
}
