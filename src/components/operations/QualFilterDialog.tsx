import { useState, useRef, useEffect } from "react";

import { getQualStats } from "../../operations/filter-vcf";

interface QualFilterDialogProps {
  visible: boolean;
  onConfirm: (minQual: number) => void;
  onCancel: () => void;
}

export function QualFilterDialog(props: QualFilterDialogProps): React.ReactElement | null {
  const { visible, onConfirm, onCancel } = props;
  const [minQual, setMinQual] = useState("30");
  const [stats, setStats] = useState({ min: 0, max: 0, median: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible) {
      const s = getQualStats();
      setStats(s);
      setMinQual("30");
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [visible]);

  if (!visible) return null;

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const val = parseFloat(minQual);
    if (!isNaN(val) && val >= 0) {
      onConfirm(val);
    }
  }

  const presets = [
    { v: 10, l: "10" },
    { v: 20, l: "20" },
    { v: 30, l: "30" },
    { v: 40, l: "40" },
    { v: 60, l: "60" },
  ];

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <form
        onSubmit={handleSubmit}
        className="glass animate-slide-in w-[400px] rounded-2xl p-7 shadow-2xl shadow-black/50"
      >
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-nt-g/10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5">
              <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              Filter by QUAL Score
            </h2>
            <p className="text-xs text-text-muted">
              Remove variants below quality threshold
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-5 grid grid-cols-3 gap-2">
          {[
            { label: "Min", value: stats.min },
            { label: "Median", value: stats.median },
            { label: "Max", value: stats.max },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-elevated/60 bg-surface/30 px-3 py-2 text-center"
            >
              <div className="text-[9px] font-bold uppercase tracking-wider text-text-muted">
                {s.label}
              </div>
              <div className="mt-0.5 font-mono text-sm font-medium text-text-primary">
                {s.value.toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="mb-3">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Minimum QUAL
          </label>
          <input
            ref={inputRef}
            type="number"
            min="0"
            step="any"
            value={minQual}
            onChange={(e) => setMinQual(e.target.value)}
            className="w-full rounded-xl border border-elevated bg-deep px-4 py-2.5 font-mono text-sm text-text-primary outline-none transition-all focus:border-cyan-glow/30 focus:ring-1 focus:ring-cyan-glow/20"
            placeholder="30"
          />
        </div>

        {/* Presets */}
        <div className="mb-6 mt-4 flex gap-2">
          {presets.map((preset) => (
            <button
              key={preset.v}
              type="button"
              onClick={() => setMinQual(String(preset.v))}
              className={`flex-1 rounded-lg border py-1.5 font-mono text-[11px] transition-all ${
                parseFloat(minQual) === preset.v
                  ? "border-nt-g/30 bg-nt-g/10 text-nt-g"
                  : "border-elevated bg-raised text-text-muted hover:bg-elevated hover:text-text-secondary"
              }`}
            >
              Q{preset.l}
            </button>
          ))}
        </div>

        {/* Note */}
        <p className="mb-5 text-[11px] text-text-muted">
          Rows with QUAL = "." (missing) will be kept.
        </p>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-5 py-2 text-sm text-text-secondary transition-colors hover:bg-raised hover:text-text-primary"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-xl bg-nt-g px-5 py-2 text-sm font-semibold text-void transition-all hover:bg-nt-g/90 hover:shadow-lg hover:shadow-nt-g/20"
          >
            Apply Filter
          </button>
        </div>
      </form>
    </div>
  );
}
