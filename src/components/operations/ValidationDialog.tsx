import { useState, useEffect } from "react";

import {
  validateCoordinates,
  applyFixes,
  type ValidationIssue,
  type IssueType,
} from "../../operations/validate-coordinates";

interface ValidationDialogProps {
  visible: boolean;
  onClose: () => void;
}

const TYPE_LABELS: Record<IssueType, string> = {
  swapped: "Swapped",
  negative: "Negative",
  "zero-length": "Zero-length",
  "invalid-chrom": "Invalid Chrom",
  duplicate: "Duplicate",
};

const TYPE_COLORS: Record<IssueType, string> = {
  swapped: "bg-nt-t/15 text-nt-t",
  negative: "bg-nt-t/15 text-nt-t",
  "zero-length": "bg-nt-g/15 text-nt-g",
  "invalid-chrom": "bg-electric/15 text-electric",
  duplicate: "bg-text-muted/15 text-text-muted",
};

export function ValidationDialog(props: ValidationDialogProps): React.ReactElement | null {
  const { visible, onClose } = props;
  const [issues, setIssues] = useState<ValidationIssue[]>([]);

  useEffect(() => {
    if (visible) {
      setIssues(validateCoordinates());
    }
  }, [visible]);

  if (!visible) return null;

  const fixableCount = issues.filter((i) => i.fixable).length;

  function handleFixAll(): void {
    applyFixes(new Set(["swapped", "negative", "duplicate"]));
    onClose();
  }

  function handleFixSwapped(): void {
    applyFixes(new Set(["swapped"]));
    onClose();
  }

  function handleFixDuplicates(): void {
    applyFixes(new Set(["duplicate"]));
    onClose();
  }

  const isClean = issues.length === 0;

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="glass animate-slide-in w-[520px] rounded-2xl p-7 shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            isClean ? "bg-cyan-glow/10" : "bg-nt-t/10"
          }`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isClean ? "#06d6a0" : "#f43f5e"} strokeWidth="1.5">
              {isClean ? (
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
                </>
              )}
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              {isClean ? "All Coordinates Valid" : "Validate Coordinates"}
            </h2>
            <p className="text-xs text-text-muted">
              {isClean
                ? "No issues found in your BED file"
                : `${issues.length} issue${issues.length !== 1 ? "s" : ""} found (${fixableCount} fixable)`}
            </p>
          </div>
        </div>

        {isClean ? (
          <div className="mb-5 rounded-xl border border-cyan-glow/20 bg-cyan-glow/5 p-4 text-center">
            <p className="text-sm text-cyan-glow">All coordinates are valid.</p>
          </div>
        ) : (
          <>
            {/* Quick actions */}
            <div className="mb-4 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={handleFixAll}
                disabled={fixableCount === 0}
                className="rounded-lg border border-cyan-glow/20 bg-cyan-glow/5 px-2.5 py-1 font-mono text-[10px] font-medium text-cyan-glow transition-colors hover:bg-cyan-glow/10 disabled:opacity-40"
              >
                Fix All ({fixableCount})
              </button>
              <button
                type="button"
                onClick={handleFixSwapped}
                disabled={!issues.some((i) => i.type === "swapped")}
                className="rounded-lg border border-elevated bg-raised px-2.5 py-1 font-mono text-[10px] font-medium text-text-secondary transition-colors hover:bg-elevated hover:text-text-primary disabled:opacity-40"
              >
                Fix Swapped Only
              </button>
              <button
                type="button"
                onClick={handleFixDuplicates}
                disabled={!issues.some((i) => i.type === "duplicate")}
                className="rounded-lg border border-elevated bg-raised px-2.5 py-1 font-mono text-[10px] font-medium text-text-secondary transition-colors hover:bg-elevated hover:text-text-primary disabled:opacity-40"
              >
                Remove Duplicates Only
              </button>
            </div>

            {/* Issue list */}
            <div className="scrollbar-thin mb-4 max-h-[280px] overflow-y-auto rounded-xl border border-elevated bg-deep/50 p-1">
              {issues.map((issue, i) => (
                <div
                  key={`${issue.rowIndex}-${issue.type}-${i}`}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 odd:bg-surface/20"
                >
                  <span className={`rounded-md px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase ${TYPE_COLORS[issue.type]}`}>
                    {TYPE_LABELS[issue.type]}
                  </span>
                  <span className="font-mono text-[10px] text-text-muted">
                    R{issue.rowIndex}
                  </span>
                  <span className="flex-1 truncate font-mono text-[11px] text-text-secondary">
                    {issue.message}
                  </span>
                  {issue.fixable && (
                    <span className="rounded bg-cyan-glow/10 px-1.5 py-0.5 font-mono text-[8px] text-cyan-glow">
                      fixable
                    </span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Close */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl px-5 py-2 text-sm text-text-secondary transition-colors hover:bg-raised hover:text-text-primary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
