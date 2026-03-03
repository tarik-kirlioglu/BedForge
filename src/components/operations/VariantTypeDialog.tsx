import { useState, useEffect } from "react";

import {
  getVariantTypeSummary,
  runVariantTypeFilter,
  type VariantType,
} from "../../operations/variant-type-filter";

interface VariantTypeDialogProps {
  visible: boolean;
  onClose: () => void;
}

const TYPE_COLORS: Record<VariantType, string> = {
  SNP: "text-cyan-glow",
  INDEL: "text-nt-t",
  MNP: "text-electric",
  MIXED: "text-nt-g",
  OTHER: "text-text-muted",
};

const TYPE_BAR_COLORS: Record<VariantType, string> = {
  SNP: "bg-cyan-glow/60",
  INDEL: "bg-nt-t/50",
  MNP: "bg-electric/50",
  MIXED: "bg-nt-g/50",
  OTHER: "bg-text-muted/40",
};

export function VariantTypeDialog(props: VariantTypeDialogProps): React.ReactElement | null {
  const { visible, onClose } = props;
  const [summary, setSummary] = useState<Array<{ type: VariantType; count: number }>>([]);
  const [selected, setSelected] = useState<Set<VariantType>>(new Set());

  useEffect(() => {
    if (visible) {
      const s = getVariantTypeSummary();
      setSummary(s);
      setSelected(new Set(s.map((v) => v.type)));
    }
  }, [visible]);

  if (!visible) return null;

  const totalRows = summary.reduce((sum, v) => sum + v.count, 0);
  const selectedRows = summary
    .filter((v) => selected.has(v.type))
    .reduce((sum, v) => sum + v.count, 0);
  const removedRows = totalRows - selectedRows;

  function toggleType(type: VariantType): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    runVariantTypeFilter(selected);
    onClose();
  }

  function pct(count: number): string {
    if (totalRows === 0) return "0%";
    return `${((count / totalRows) * 100).toFixed(1)}%`;
  }

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <form
        onSubmit={handleSubmit}
        className="glass animate-slide-in w-[460px] rounded-2xl p-7 shadow-2xl shadow-black/50"
      >
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-glow/10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06d6a0" strokeWidth="1.5">
              <path d="M9.5 2A7.5 7.5 0 0117 9.5c0 1.8-.6 3.5-1.7 4.8l5.4 5.4-1.4 1.4-5.4-5.4A7.5 7.5 0 119.5 2z" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary">Filter by Variant Type</h2>
            <p className="text-xs text-text-muted">
              {summary.length} type{summary.length !== 1 ? "s" : ""} across {totalRows.toLocaleString()} variants
            </p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelected(new Set(summary.map((v) => v.type)))}
            className="rounded-lg border border-elevated bg-raised px-2.5 py-1 font-mono text-[10px] font-medium text-text-secondary transition-colors hover:bg-elevated hover:text-text-primary"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set(["SNP"]))}
            className="rounded-lg border border-cyan-glow/20 bg-cyan-glow/5 px-2.5 py-1 font-mono text-[10px] font-medium text-cyan-glow transition-colors hover:bg-cyan-glow/10"
          >
            SNP Only
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set(["INDEL"]))}
            className="rounded-lg border border-nt-t/20 bg-nt-t/5 px-2.5 py-1 font-mono text-[10px] font-medium text-nt-t transition-colors hover:bg-nt-t/10"
          >
            INDEL Only
          </button>
        </div>

        {/* Type list */}
        <div className="mb-4 rounded-xl border border-elevated bg-deep/50 p-1">
          {summary.map((item) => {
            const isChecked = selected.has(item.type);
            return (
              <label
                key={item.type}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface/60 ${
                  isChecked ? "" : "opacity-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleType(item.type)}
                  className="genomic-checkbox"
                />
                <span className={`font-mono text-[13px] font-semibold ${TYPE_COLORS[item.type]}`}>
                  {item.type}
                </span>
                <div className="ml-auto flex items-center gap-2.5">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-elevated/60">
                    <div
                      className={`h-full rounded-full ${TYPE_BAR_COLORS[item.type]}`}
                      style={{ width: pct(item.count) }}
                    />
                  </div>
                  <span className="min-w-[3.5rem] text-right font-mono text-[10px] text-text-muted">
                    {item.count.toLocaleString()}
                  </span>
                  <span className="min-w-[2.5rem] text-right font-mono text-[10px] text-text-muted">
                    {pct(item.count)}
                  </span>
                </div>
              </label>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mb-5 flex items-center justify-between rounded-lg border border-elevated/60 bg-surface/30 px-4 py-2.5 font-mono text-[11px]">
          <span className="text-text-secondary">
            Keeping{" "}
            <span className="font-semibold text-cyan-glow">{selectedRows.toLocaleString()}</span>
            {" "}of {totalRows.toLocaleString()}
          </span>
          {removedRows > 0 && (
            <span className="text-nt-t">-{removedRows.toLocaleString()} rows</span>
          )}
        </div>

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
            disabled={selected.size === 0}
            className="rounded-xl bg-cyan-glow px-5 py-2 text-sm font-semibold text-void transition-all hover:shadow-lg hover:shadow-cyan-glow/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Apply Filter
          </button>
        </div>
      </form>
    </div>
  );
}
