import { useState, useEffect } from "react";

import { useFileStore } from "../../stores/useFileStore";
import { useSelectionStore } from "../../stores/useSelectionStore";
import {
  previewFindReplace,
  runFindReplace,
  type FindReplacePreview,
} from "../../operations/find-replace";

interface FindReplaceDialogProps {
  visible: boolean;
  onClose: () => void;
}

export function FindReplaceDialog(props: FindReplaceDialogProps): React.ReactElement | null {
  const { visible, onClose } = props;
  const columns = useFileStore((s) => s.columns);
  const selectedCount = useSelectionStore((s) => s.selectedRowIndices.size);

  const [search, setSearch] = useState("");
  const [replace, setReplace] = useState("");
  const [scope, setScope] = useState<string>("all");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [preview, setPreview] = useState<FindReplacePreview[]>([]);

  useEffect(() => {
    if (!visible) {
      setSearch("");
      setReplace("");
      setScope("all");
      setCaseSensitive(false);
      setPreview([]);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || !search.trim()) {
      setPreview([]);
      return;
    }
    const timer = setTimeout(() => {
      setPreview(previewFindReplace({ search, replace, scope, caseSensitive }));
    }, 300);
    return () => clearTimeout(timer);
  }, [visible, search, replace, scope, caseSensitive]);

  if (!visible) return null;

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    runFindReplace({ search, replace, scope, caseSensitive });
    onClose();
  }

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <form
        onSubmit={handleSubmit}
        className="glass animate-slide-in w-[520px] rounded-2xl p-7 shadow-2xl shadow-black/50"
      >
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-glow/10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06d6a0" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
              <path d="M8 11h6M11 8v6" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary">Find & Replace</h2>
            <p className="text-xs text-text-muted">Search and replace values across your data</p>
          </div>
        </div>

        {/* Inputs */}
        <div className="mb-4 space-y-3">
          <div>
            <label className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-widest text-text-muted">
              Find
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search text..."
              className="w-full rounded-lg border border-elevated bg-deep px-3 py-2 font-mono text-[12px] text-text-primary outline-none transition-all focus:border-cyan-glow/40 focus:ring-1 focus:ring-cyan-glow/20"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-widest text-text-muted">
              Replace with
            </label>
            <input
              value={replace}
              onChange={(e) => setReplace(e.target.value)}
              placeholder="Replacement text..."
              className="w-full rounded-lg border border-elevated bg-deep px-3 py-2 font-mono text-[12px] text-text-primary outline-none transition-all focus:border-cyan-glow/40 focus:ring-1 focus:ring-cyan-glow/20"
            />
          </div>
        </div>

        {/* Options */}
        <div className="mb-4 flex items-center gap-4">
          <div className="flex-1">
            <label className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-widest text-text-muted">
              Scope
            </label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="w-full rounded-lg border border-elevated bg-deep px-3 py-2 font-mono text-[12px] text-text-primary outline-none transition-all focus:border-cyan-glow/40"
            >
              <option value="all">All rows</option>
              {selectedCount > 0 && (
                <option value="selected">Selected only ({selectedCount})</option>
              )}
              {columns.map((col) => (
                <option key={col} value={col}>
                  Column: {col}
                </option>
              ))}
            </select>
          </div>

          <label className="flex cursor-pointer items-center gap-2 pt-4">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
              className="genomic-checkbox"
            />
            <span className="font-mono text-[11px] text-text-secondary">Case sensitive</span>
          </label>
        </div>

        {/* Preview */}
        {preview.length > 0 && (
          <div className="mb-4">
            <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-text-muted">
              Preview ({preview.length}{preview.length >= 50 ? "+" : ""} matches)
            </div>
            <div className="scrollbar-thin max-h-[160px] overflow-y-auto rounded-xl border border-elevated bg-deep/50 p-1">
              {preview.map((p, i) => (
                <div
                  key={`${p.rowIndex}-${p.colKey}-${i}`}
                  className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] odd:bg-surface/20"
                >
                  <span className="font-mono text-text-muted">R{p.rowIndex}</span>
                  <span className="font-mono text-electric">{p.colKey}</span>
                  <span className="line-through text-nt-t/70">{truncate(p.before, 30)}</span>
                  <span className="text-text-muted">&rarr;</span>
                  <span className="text-cyan-glow">{truncate(p.after, 30)}</span>
                </div>
              ))}
            </div>
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
            disabled={!search.trim() || preview.length === 0}
            className="rounded-xl bg-cyan-glow px-5 py-2 text-sm font-semibold text-void transition-all hover:shadow-lg hover:shadow-cyan-glow/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Replace All
          </button>
        </div>
      </form>
    </div>
  );
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "..." : text;
}
