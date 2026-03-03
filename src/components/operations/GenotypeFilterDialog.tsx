import { useState, useEffect } from "react";

import { useFileStore } from "../../stores/useFileStore";
import {
  getGenotypeSummary,
  runGenotypeFilter,
} from "../../operations/genotype-filter";

interface GenotypeFilterDialogProps {
  visible: boolean;
  onClose: () => void;
}

const GT_COLORS: Record<string, string> = {
  "0/0": "text-cyan-glow",
  "0/1": "text-electric",
  "1/0": "text-electric",
  "1/1": "text-nt-t",
  "./.": "text-text-muted",
};

const GT_BAR_COLORS: Record<string, string> = {
  "0/0": "bg-cyan-glow/60",
  "0/1": "bg-electric/50",
  "1/0": "bg-electric/50",
  "1/1": "bg-nt-t/50",
  "./.": "bg-text-muted/40",
};

export function GenotypeFilterDialog(props: GenotypeFilterDialogProps): React.ReactElement | null {
  const { visible, onClose } = props;
  const vcfSampleNames = useFileStore((s) => s.vcfSampleNames);

  const [activeSample, setActiveSample] = useState("");
  const [summary, setSummary] = useState<Array<{ gt: string; count: number }>>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible && vcfSampleNames.length > 0) {
      const sample = vcfSampleNames[0]!;
      setActiveSample(sample);
      const s = getGenotypeSummary(sample);
      setSummary(s);
      setSelected(new Set(s.map((v) => v.gt)));
    }
  }, [visible, vcfSampleNames]);

  function handleSampleChange(sample: string): void {
    setActiveSample(sample);
    const s = getGenotypeSummary(sample);
    setSummary(s);
    setSelected(new Set(s.map((v) => v.gt)));
  }

  if (!visible) return null;

  const totalRows = summary.reduce((sum, v) => sum + v.count, 0);
  const selectedRows = summary
    .filter((v) => selected.has(v.gt))
    .reduce((sum, v) => sum + v.count, 0);
  const removedRows = totalRows - selectedRows;

  function toggleGT(gt: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(gt)) {
        next.delete(gt);
      } else {
        next.add(gt);
      }
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    runGenotypeFilter(activeSample, selected);
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-electric/10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4361ee" strokeWidth="1.5">
              <path d="M12 2v10M8 6l8 0M6 12c0 5.5 6 10 6 10s6-4.5 6-10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary">Filter by Genotype</h2>
            <p className="text-xs text-text-muted">Filter variants by GT field</p>
          </div>
        </div>

        {/* Sample picker */}
        {vcfSampleNames.length > 1 && (
          <div className="mb-4">
            <label className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-widest text-text-muted">
              Sample
            </label>
            <select
              value={activeSample}
              onChange={(e) => handleSampleChange(e.target.value)}
              className="w-full rounded-lg border border-elevated bg-deep px-3 py-2 font-mono text-[12px] text-text-primary outline-none transition-all focus:border-electric/40"
            >
              {vcfSampleNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Quick actions */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelected(new Set(summary.map((v) => v.gt)))}
            className="rounded-lg border border-elevated bg-raised px-2.5 py-1 font-mono text-[10px] font-medium text-text-secondary transition-colors hover:bg-elevated hover:text-text-primary"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set(["0/1", "1/0"]))}
            className="rounded-lg border border-electric/20 bg-electric/5 px-2.5 py-1 font-mono text-[10px] font-medium text-electric transition-colors hover:bg-electric/10"
          >
            Het Only
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set(["1/1"]))}
            className="rounded-lg border border-nt-t/20 bg-nt-t/5 px-2.5 py-1 font-mono text-[10px] font-medium text-nt-t transition-colors hover:bg-nt-t/10"
          >
            Hom Alt Only
          </button>
          <button
            type="button"
            onClick={() => {
              const noMissing = new Set(summary.map((v) => v.gt));
              noMissing.delete("./.");
              setSelected(noMissing);
            }}
            className="rounded-lg border border-elevated bg-raised px-2.5 py-1 font-mono text-[10px] font-medium text-text-secondary transition-colors hover:bg-elevated hover:text-text-primary"
          >
            No Missing
          </button>
        </div>

        {/* GT list */}
        <div className="mb-4 rounded-xl border border-elevated bg-deep/50 p-1">
          {summary.map((item) => {
            const isChecked = selected.has(item.gt);
            return (
              <label
                key={item.gt}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface/60 ${
                  isChecked ? "" : "opacity-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleGT(item.gt)}
                  className="genomic-checkbox"
                />
                <span className={`font-mono text-[13px] font-semibold ${GT_COLORS[item.gt] ?? "text-text-secondary"}`}>
                  {item.gt}
                </span>
                <div className="ml-auto flex items-center gap-2.5">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-elevated/60">
                    <div
                      className={`h-full rounded-full ${GT_BAR_COLORS[item.gt] ?? "bg-text-secondary/40"}`}
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
            className="rounded-xl bg-electric px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-electric/90 hover:shadow-lg hover:shadow-electric/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Apply Filter
          </button>
        </div>
      </form>
    </div>
  );
}
