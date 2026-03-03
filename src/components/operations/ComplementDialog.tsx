import { useState, useMemo } from "react";

import { useFileStore } from "../../stores/useFileStore";
import { getChromSizes, parseChromSizes } from "../../utils/chrom-sizes";
import { runComplement } from "../../operations/complement";
import type { Assembly } from "../../types/genomic";

interface ComplementDialogProps {
  visible: boolean;
  onClose: () => void;
}

export function ComplementDialog(props: ComplementDialogProps): React.ReactElement | null {
  const { visible, onClose } = props;
  const assembly = useFileStore((s) => s.assembly);
  const useChrPrefix = useFileStore((s) => s.useChrPrefix);
  const rowCount = useFileStore((s) => s.rows.length);

  const [selectedAssembly, setSelectedAssembly] = useState<Assembly>(assembly ?? "GRCh38");
  const [useCustom, setUseCustom] = useState(false);
  const [customText, setCustomText] = useState("");

  const chromSizes = useMemo(() => {
    if (useCustom && customText.trim()) {
      return parseChromSizes(customText);
    }
    return getChromSizes(selectedAssembly, useChrPrefix);
  }, [useCustom, customText, selectedAssembly, useChrPrefix]);

  if (!visible) return null;

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    runComplement(chromSizes);
    onClose();
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
              <rect x="3" y="8" width="18" height="8" rx="1" />
              <path d="M8 8v8M16 8v8" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary">Complement</h2>
            <p className="text-xs text-text-muted">Generate gap regions between intervals</p>
          </div>
        </div>

        {/* Warning */}
        <div className="mb-4 rounded-lg border border-nt-t/20 bg-nt-t/5 px-4 py-3">
          <p className="text-xs font-medium text-nt-t">
            This will REPLACE all {rowCount.toLocaleString()} current rows with complement regions (BED3).
          </p>
        </div>

        {/* Assembly selection */}
        <div className="mb-4">
          <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-widest text-text-muted">
            Chromosome Sizes
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setSelectedAssembly("GRCh38"); setUseCustom(false); }}
              className={`flex-1 rounded-lg border px-3 py-2 font-mono text-[11px] font-medium transition-all ${
                !useCustom && selectedAssembly === "GRCh38"
                  ? "border-cyan-glow/30 bg-cyan-glow/10 text-cyan-glow"
                  : "border-elevated text-text-secondary hover:bg-raised"
              }`}
            >
              GRCh38 / hg38
            </button>
            <button
              type="button"
              onClick={() => { setSelectedAssembly("GRCh37"); setUseCustom(false); }}
              className={`flex-1 rounded-lg border px-3 py-2 font-mono text-[11px] font-medium transition-all ${
                !useCustom && selectedAssembly === "GRCh37"
                  ? "border-cyan-glow/30 bg-cyan-glow/10 text-cyan-glow"
                  : "border-elevated text-text-secondary hover:bg-raised"
              }`}
            >
              GRCh37 / hg19
            </button>
            <button
              type="button"
              onClick={() => setUseCustom(true)}
              className={`flex-1 rounded-lg border px-3 py-2 font-mono text-[11px] font-medium transition-all ${
                useCustom
                  ? "border-cyan-glow/30 bg-cyan-glow/10 text-cyan-glow"
                  : "border-elevated text-text-secondary hover:bg-raised"
              }`}
            >
              Custom
            </button>
          </div>
        </div>

        {/* Custom textarea */}
        {useCustom && (
          <div className="mb-4">
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder={"chr1\t248956422\nchr2\t242193529\n..."}
              rows={5}
              className="w-full rounded-lg border border-elevated bg-deep px-3 py-2 font-mono text-[11px] text-text-primary outline-none transition-all focus:border-cyan-glow/40 focus:ring-1 focus:ring-cyan-glow/20"
            />
          </div>
        )}

        {/* Summary */}
        <div className="mb-5 rounded-lg border border-elevated/60 bg-surface/30 px-4 py-2.5 font-mono text-[11px] text-text-secondary">
          Using <span className="font-semibold text-electric">{chromSizes.size}</span> chromosome{chromSizes.size !== 1 ? "s" : ""}
          {!useCustom && (
            <span className="text-text-muted"> from {selectedAssembly}</span>
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
            disabled={chromSizes.size === 0}
            className="rounded-xl bg-electric px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-electric/90 hover:shadow-lg hover:shadow-electric/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Generate Complement
          </button>
        </div>
      </form>
    </div>
  );
}
