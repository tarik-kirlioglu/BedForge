import { useState, useRef, useEffect } from "react";

interface SlopDialogProps {
  visible: boolean;
  onConfirm: (upstream: number, downstream: number) => void;
  onCancel: () => void;
  regionCount: number;
}

export function SlopDialog(props: SlopDialogProps): React.ReactElement | null {
  const { visible, onConfirm, onCancel, regionCount } = props;
  const [upstream, setUpstream] = useState("200");
  const [downstream, setDownstream] = useState("200");
  const [symmetric, setSymmetric] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [visible]);

  if (!visible) return null;

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const up = parseInt(upstream, 10) || 0;
    const down = symmetric ? up : parseInt(downstream, 10) || 0;
    onConfirm(up, down);
  }

  function handleUpstreamChange(val: string): void {
    setUpstream(val);
    if (symmetric) setDownstream(val);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-fade-in">
      <form
        onSubmit={handleSubmit}
        className="glass animate-slide-in w-[400px] rounded-2xl p-7 shadow-2xl shadow-black/50"
      >
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-glow/10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06d6a0" strokeWidth="1.5">
              <path d="M21 12H3m18 0l-4-4m4 4l-4 4M3 12l4-4m-4 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              Extend Regions
            </h2>
            <p className="text-xs text-text-muted">
              {regionCount} region{regionCount !== 1 ? "s" : ""} will be modified
            </p>
          </div>
        </div>

        {/* Symmetric toggle */}
        <label className="mb-5 flex cursor-pointer items-center gap-2.5 text-sm text-text-secondary">
          <div className="relative">
            <input
              type="checkbox"
              checked={symmetric}
              onChange={(e) => {
                setSymmetric(e.target.checked);
                if (e.target.checked) setDownstream(upstream);
              }}
              className="peer sr-only"
            />
            <div className="h-5 w-9 rounded-full bg-raised transition-colors peer-checked:bg-cyan-glow/30" />
            <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-text-muted transition-all peer-checked:translate-x-4 peer-checked:bg-cyan-glow" />
          </div>
          Symmetric extension
        </label>

        {/* Upstream */}
        <div className="mb-3">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            {symmetric ? "Both directions (bp)" : "Upstream (bp)"}
          </label>
          <input
            ref={inputRef}
            type="number"
            min="0"
            max="10000000"
            value={upstream}
            onChange={(e) => handleUpstreamChange(e.target.value)}
            className="w-full rounded-xl border border-elevated bg-deep px-4 py-2.5 font-mono text-sm text-text-primary outline-none transition-all focus:border-cyan-glow/30 focus:ring-1 focus:ring-cyan-glow/20"
            placeholder="200"
          />
        </div>

        {/* Downstream */}
        {!symmetric && (
          <div className="mb-3">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Downstream (bp)
            </label>
            <input
              type="number"
              min="0"
              max="10000000"
              value={downstream}
              onChange={(e) => setDownstream(e.target.value)}
              className="w-full rounded-xl border border-elevated bg-deep px-4 py-2.5 font-mono text-sm text-text-primary outline-none transition-all focus:border-cyan-glow/30 focus:ring-1 focus:ring-cyan-glow/20"
              placeholder="200"
            />
          </div>
        )}

        {/* Presets */}
        <div className="mb-6 mt-4 flex gap-2">
          {[
            { v: 100, l: "100bp" },
            { v: 500, l: "500bp" },
            { v: 1000, l: "1kb" },
            { v: 2000, l: "2kb" },
            { v: 5000, l: "5kb" },
          ].map((preset) => (
            <button
              key={preset.v}
              type="button"
              onClick={() => {
                const s = String(preset.v);
                setUpstream(s);
                if (symmetric) setDownstream(s);
              }}
              className={`flex-1 rounded-lg border py-1.5 font-mono text-[11px] transition-all ${
                parseInt(upstream, 10) === preset.v
                  ? "border-cyan-glow/30 bg-cyan-glow/10 text-cyan-glow"
                  : "border-elevated bg-raised text-text-muted hover:border-elevated hover:bg-elevated hover:text-text-secondary"
              }`}
            >
              {preset.l}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-5 py-2 text-sm text-text-muted transition-colors hover:bg-raised hover:text-text-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-xl bg-cyan-glow px-5 py-2 text-sm font-semibold text-void transition-all hover:bg-cyan-glow/90 hover:shadow-lg hover:shadow-cyan-glow/20"
          >
            Extend Regions
          </button>
        </div>
      </form>
    </div>
  );
}
